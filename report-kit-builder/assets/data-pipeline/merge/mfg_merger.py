# -*- coding: utf-8 -*-
"""mfg_merger.py — 制造车间三数据源自动整合工具（对齐配料 cop_best_month 做法）

三源（红线：原始数据绝对正确；选源按月 COP 最高优先，客户可按全月数据验算一致）：
  wincc : WinCC 归档日常导出「累计冷量*.csv」「累计用电量*.csv」（制造车间数据1-9月/）
  eff   : 日常导出「能效报表*.csv」（c[2]=累计冷量 c[3]=累计用电量）
  usr   : 有人云平台（zip_*/ 制造N月.xlsx：col0=时间 col2=冷量 col3=电量，30s~1min级）
  wincc_tag : 预留——将来制造 MDF/TAG:R 导出 v*.csv（timestamp,value,quality），挂入即可参与合并

用法：
  python mfg_merger.py                    # 全量合并 → 输出 merged_daily.csv + mfg_increment.sql + 审计报告
  python mfg_merger.py --since 2026-09-18  # 增量：只生成 date > since 的行
  python mfg_merger.py --audit-only        # 只做互证审计，不产 SQL

规则（原始数据红线）：
  1. 坏值剔除：val<=0 剔除；相邻有效值骤降 >50% 视为归零/换表跳变，断链分段
  2. 缺天跨度合并：相邻有效读数间隔 >36h 则分段，段=跨度行（start~end，days=跨度天数），绝不显示 0
  3. monthly_rank：按月对各源算 COP，最高者为主源；主源覆盖的日不重复补；缺日按月内排名降级补全
  4. 断链月兜底：EXCEL_TRUTH 权威值（客户 Excel 月报），参数化可更新
  5. 上数前互证：合并月度 vs EXCEL_TRUTH 偏差 >5% 报警拒绝上数（exit 2）
"""
import argparse, csv, glob, io, os, sys, warnings
from collections import defaultdict
warnings.filterwarnings('ignore')
import openpyxl

# ---------------- 配置（★★项目特定参数，新项目必改：以下路径/月报权威值均为麻辣王子本机路径与数据）----------------
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 工作空间根，换机/改目录自动适应
BASE = os.path.join(ROOT, '03_processed', '制造', '.cache_rar')
OUT_DIR = os.path.join(ROOT, '03_processed', '制造')
TAG_DIR = r"C:/SQLData/export"          # wincc_tag 预留：v*.csv 目录（目前仅配料 v893/v919，未启用）
TAG_COOL, TAG_ELEC = None, None          # 制造 MDF 导出就绪后填 v 号，如 'v1028','v1029'

EXCEL_TRUTH = {  # 断链月权威值（制造车间汇总 sheet，客户 Excel 月报）: mon -> (cool, elec)
    '2026-05': (975160.0, 225770.0),
    '2026-06': (1051863.0, 234049.0),
    '2026-07': (1338801.0, 307939.0),
}
AUDIT_TOL = 0.05        # 与 EXCEL_TRUTH 偏差容忍 5%
GAP_HOURS = 36          # 相邻有效读数间隔超过此值 → 分段
DROP_RATIO = 0.5        # 相邻有效值下降超过此比例 → 视为跳变断链

# ---------------- 解析 ----------------
def _num(v):
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None

def _ts(t):
    """归一化多格式时间戳 → 'YYYY-MM-DD HH:MM:SS'；不认识的返回 None
    支持：DD.MM.YY（WinCC 德式）、YYYY/M/D、不补零 ISO、datetime 对象
    """
    import datetime as dt
    if not isinstance(t, str):
        t = str(t)
    t = t.strip()[:19].replace('/', '-').replace('T', ' ')
    if len(t) < 16:
        return None
    for fmt in ('%Y-%m-%d %H:%M:%S', '%d.%m.%y %H:%M:%S', '%d.%m.%Y %H:%M:%S',
                '%Y-%m-%d %H:%M'):
        try:
            return dt.datetime.strptime(t, fmt).strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
    return None

def load_sources():
    """返回 {src: {tag: {ts: val}}}；tag ∈ cool/elec"""
    s = defaultdict(lambda: defaultdict(dict))

    # usr：有人云 zip_xlsx（宽表）+ 制造N月.xlsx（多 sheet 5 列长表）
    # 此批 xlsx 缺 dimension 元信息：必须 read_only + reset_dimensions()，否则读不全或内存爆炸
    cloud = os.path.join(BASE, '制造车间云平台历史数据')
    for fp in glob.glob(os.path.join(cloud, 'zip_*', '*.xlsx')):
        print('  usr_zip 读取:', os.path.basename(fp), flush=True)
        try:
            wb = openpyxl.load_workbook(fp, data_only=True, read_only=True)
        except Exception:
            continue
        ws = wb[wb.sheetnames[0]]
        ws.reset_dimensions()
        # 宽表：col1=时间 col3=冷冻累计冷量 col4=冷冻累计用电量（col2=日平均SCOP）
        for i, r in enumerate(ws.iter_rows(values_only=True)):
            if i == 0 or not r or r[0] is None:
                continue
            ts = _ts(r[0])
            if not ts or len(r) < 5:
                continue
            c = _num(r[3])
            e = _num(r[4])
            if c is not None: s['usr']['cool'][ts] = c
            if e is not None: s['usr']['elec'][ts] = e
        wb.close()

    for fp in glob.glob(os.path.join(cloud, '制造*月.xlsx')):
        print('  usr_xlsx 读取:', os.path.basename(fp), flush=True)
        try:
            wb = openpyxl.load_workbook(fp, data_only=True, read_only=True)
        except Exception:
            continue
        for sn in wb.sheetnames:
            # 长表 sheet：设备名称/设备编号/变量名称/时间/值；冷量→cool 用电→elec
            if '冷量' not in sn and '用电' not in sn:
                continue
            tag = 'cool' if '冷量' in sn else 'elec'
            ws = wb[sn]
            ws.reset_dimensions()
            for i, r in enumerate(ws.iter_rows(values_only=True)):
                if i == 0 or not r or len(r) < 5:
                    continue
                ts = _ts(r[3])
                v = _num(r[4])
                if ts and v is not None:
                    s['usr'][tag][ts] = v
        wb.close()

    # wincc / eff：制造车间数据1-9月
    def read_any(fp):
        for enc in ('utf-16', 'utf-8-sig', 'gbk'):
            try:
                return open(fp, encoding=enc, newline='').read()
            except Exception:
                continue
        return None

    for fp in glob.glob(os.path.join(BASE, '制造车间数据1-9月', '**', '*.csv'), recursive=True):
        if '配料' in fp:
            continue
        print('  csv 读取:', os.path.basename(fp), flush=True)
        name = os.path.basename(fp)
        txt = read_any(fp)
        if not txt:
            continue
        lines = txt.splitlines()
        if len(lines) < 2:
            continue
        sep = '\t' if '\t' in lines[1] else ','
        for l in lines[1:]:
            c = l.split(sep)
            if len(c) < 2 or not c[0].strip():
                continue
            ts = _ts(c[0].strip())
            if not ts:
                continue
            if '累计冷量' in name:
                v = _num(c[1])
                if v is not None: s['wincc']['cool'][ts] = v
            elif '累计用电量' in name:
                v = _num(c[1])
                if v is not None: s['wincc']['elec'][ts] = v
            elif '能效报表' in name and len(c) >= 4:
                cool, elec = _num(c[2]), _num(c[3])
                if cool is not None: s['eff']['cool'][ts] = cool
                if elec is not None: s['eff']['elec'][ts] = elec

    # wincc_tag：预留 MDF/TAG:R 导出
    if TAG_COOL and TAG_ELEC:
        for tag, fn in (('cool', TAG_COOL), ('elec', TAG_ELEC)):
            fp = os.path.join(TAG_DIR, fn + '.csv')
            if not os.path.isfile(fp):
                continue
            with io.open(fp, encoding='utf-8-sig') as f:
                for r in csv.DictReader(f):
                    ts, v = _ts(r.get('timestamp')), _num(r.get('value'))
                    if ts and v is not None:
                        s['wincc_tag'][tag][ts] = v
    # online_ref：线上定稿基准（mfg_merged_daily 导出，最高优先，本地源只补缺口）
    online_rows = []
    ref_fp = os.path.join(OUT_DIR, 'mfg_online_daily.csv')
    if os.path.isfile(ref_fp):
        with io.open(ref_fp, encoding='utf-8-sig') as f:
            for r in csv.DictReader(f):
                try:
                    online_rows.append(dict(start=r['date'], end=r['date_end'],
                                             cool=float(r['cool']), elec=float(r['elec']),
                                             days=int(r['days']), src='online/' + r['src']))
                except (ValueError, TypeError, KeyError):
                    continue
    return {k: dict(v) for k, v in s.items()}, online_rows

# ---------------- 跨度构建 ----------------
STAG_DAYS = 10        # 读数超过 N 天不动 → 停滞断链（如 26 年 5~7 月电量冻结段）
STAG_EPS = 10.0       # 累计量变化小于此值（kWh）视为没动

def build_spans(readings):
    """readings {ts: val} → 坏值/停滞剔除后按间隔分段，返回 [(d0, d1, v0, v1, days)]"""
    items = sorted(readings.items())
    segs, seg = [], []
    prev = None
    import datetime as dt
    def parse(t):
        return dt.datetime.strptime(t[:19], '%Y-%m-%d %H:%M:%S')
    prev_t = None
    last_move_t = None   # 最近一次读数变化时间（停滞检测基准）
    for ts, v in items:
        if v <= 0:
            continue
        t = parse(ts)
        if prev is not None:
            broke = False
            if v < prev * (1 - DROP_RATIO):
                broke = True            # 归零/换表跳变
            elif (t - prev_t).total_seconds() > GAP_HOURS * 3600:
                broke = True            # 时间缺口
            elif last_move_t is not None and abs(v - prev) < STAG_EPS \
                    and (t - last_move_t).total_seconds() > STAG_DAYS * 86400:
                broke = True            # 停滞段：读数长期不动
            if broke:
                segs.append(seg); seg = []; last_move_t = None
        seg.append((ts, v))
        if prev is None or abs(v - prev) >= STAG_EPS:
            last_move_t = t
        prev, prev_t = v, t
    if seg:
        segs.append(seg)
    spans = []
    for g in segs:
        if len(g) < 2:
            continue
        # 跨月段按月切分：每月用月内首末读数（保证客户可按全月数据验算）
        bym = {}
        for ts, v in g:
            bym.setdefault(ts[:7], []).append((ts, v))
        for m in sorted(bym):
            mm = bym[m]
            if len(mm) < 2:
                continue
            (t0, v0), (t1, v1) = mm[0], mm[-1]
            d0, d1 = t0[:10], t1[:10]
            days = (dt.date.fromisoformat(d1) - dt.date.fromisoformat(d0)).days + 1
            spans.append((d0, d1, v0, v1, days))
    return spans

def span_usage(spans_cool, spans_elec):
    """按日聚合冷量/电量为 {(day_end, days): {'cool':x,'elec':y,'start':d0}}；冷电量跨度独立但尽量对齐"""
    # 以电量为骨架，冷量按相同跨度匹配；若冷量跨度不同则独立成行（COP 行要求 cool/elec 同跨度才可信）
    rows = []
    elec_map = {(e[0], e[1]): e for e in spans_elec}
    used = set()
    for c in spans_cool:
        k = (c[0], c[1])
        e = elec_map.get(k)
        if e is not None:
            used.add(k)
            rows.append(dict(start=c[0], end=c[1], days=c[4],
                             cool=c[3] - c[2], elec=e[3] - e[2]))
    for k, e in elec_map.items():
        if k not in used:
            # 电量跨度无匹配冷量 → 尝试与冷量跨度求交（部分月冷量链更长）
            rows.append(dict(start=e[0], end=e[1], days=e[4],
                             cool=None, elec=e[3] - e[2]))
    return rows

def month_of(row):
    return row['end'][:7]

def cop_of(rows):
    c = sum(r['cool'] for r in rows if r['cool'])
    e = sum(r['elec'] for r in rows if r['elec'])
    return (c / e) if c and e else 0.0

# ---------------- 合并 ----------------
def merge(sources, online_rows=None):
    src_rows = {}
    for src, tags in sources.items():
        if not tags.get('cool') and not tags.get('elec'):
            continue
        sc = build_spans(tags.get('cool', {}))
        se = build_spans(tags.get('elec', {}))
        src_rows[src] = span_usage(sc, se)

    merged = []          # 最终行
    used_days = set()    # 已被覆盖的日
    # 线上定稿基准：全收（当年人工定稿口径，含 3/21~31 人工整理段），本地源只补缺口
    if online_rows:
        for r in sorted(online_rows, key=lambda r: r['start']):
            merged.append(dict(r))
            for d in _days(r['start'], r['end']):
                used_days.add(d)

    # monthly_rank：每月各源 COP 排名；先剔除物理不合理的坏跨度（COP 超界/负值）
    by_month = defaultdict(lambda: defaultdict(list))  # mon -> src -> rows
    dropped = []
    for src, rows in src_rows.items():
        for r in rows:
            if not (r['cool'] and r['elec']):
                continue
            cop = r['cool'] / r['elec']
            if r['cool'] <= 0 or r['elec'] <= 0 or not (0.5 <= cop <= 20):
                dropped.append((src, r['start'], r['end'], round(cop, 2)))
                continue
            by_month[month_of(r)][src].append(r)

    for mon in sorted(by_month):
        rank = sorted(by_month[mon].items(),
                      key=lambda kv: cop_of(kv[1]), reverse=True)
        month_days = set()
        for src, rows in rank:
            for r in rows:
                for d in _days(r['start'], r['end']):
                    month_days.add(d)
        # 主源全收，次源只补主源未覆盖日
        for src, rows in rank:
            for r in rows:
                ds = _days(r['start'], r['end'])
                covered = [d for d in ds if d not in used_days]
                if not covered:
                    continue
                if covered != ds:
                    # 跨度与已覆盖部分相交 → 缩边，差值按覆盖天数比例折算（防重叠段双算）
                    ratio = len(covered) / len(ds)
                    r = dict(r, start=covered[0], end=covered[-1],
                             cool=r['cool'] * ratio, elec=r['elec'] * ratio)
                for d in covered:
                    used_days.add(d)
                merged.append(dict(start=r['start'], end=r['end'], days=len(covered),
                                   cool=r['cool'], elec=r['elec'], src=src))
        # 兜底：该月日历日中仍无任何覆盖的（全源断链）→ Excel 权威值
        _mfill_excel(mon, used_days, merged)

    # 电量有/冷量无的孤儿跨度（低可信）标 src+'_elec_only'，不计 COP、供审计
    return merged, src_rows, dropped

def _days(d0, d1):
    import datetime as dt
    a, b = dt.date.fromisoformat(d0), dt.date.fromisoformat(d1)
    return [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]

def _mfill_excel(mon, used_days, merged):
    """断链月兜底：该月日历日中无任何数据覆盖的 → 按客户 Excel 权威值折算"""
    import calendar
    if mon not in EXCEL_TRUTH:
        return
    y, m = int(mon[:4]), int(mon[5:])
    total = calendar.monthrange(y, m)[1]
    missing = ['%04d-%02d-%02d' % (y, m, d) for d in range(1, total + 1)
               if '%04d-%02d-%02d' % (y, m, d) not in used_days]
    if not missing:
        return
    c, e = EXCEL_TRUTH[mon]
    n = len(missing)
    merged.append(dict(start=missing[0], end=missing[-1], days=n,
                       cool=c * n / total, elec=e * n / total,
                       src='ExcelAuthority'))

# ---------------- 审计 & 输出 ----------------
def audit(merged, report_lines):
    ok = True
    by_mon = defaultdict(lambda: [0.0, 0.0])
    for r in merged:
        m = month_of(r)
        if r['cool'] and r['elec']:
            by_mon[m][0] += r['cool']; by_mon[m][1] += r['elec']
    for mon in sorted(set(list(by_mon) + list(EXCEL_TRUTH))):
        if mon not in EXCEL_TRUTH:
            continue
        c, e = EXCEL_TRUTH[mon]
        mc, me = by_mon.get(mon, (0, 0))
        ec = (mc / me) if me else 0
        tc = c / e
        dev = (ec / tc - 1) if tc else None
        flag = ''
        if dev is not None and abs(dev) > AUDIT_TOL:
            flag = '❌ 拒绝上数'; ok = False
        elif dev is None:
            flag = '⚠️ 无合并数据'
        else:
            flag = '✅'
        report_lines.append('审计 %s: 合并 cool=%.0f elec=%.0f COP=%.3f | Excel COP=%.3f | 偏差 %s %s'
                            % (mon, mc, me, ec, tc,
                               ('%+.1f%%' % (dev * 100)) if dev is not None else '-', flag))
    return ok

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--since', default=None, help='增量：只输出 date(行首日) > since 的行')
    ap.add_argument('--audit-only', action='store_true')
    args = ap.parse_args()

    print('解析三源...')
    sources, online_rows = load_sources()
    if online_rows:
        print('  online 基准: %d 行  %s ~ %s' % (len(online_rows), online_rows[0]['start'], online_rows[-1]['end']))
    for src, tags in sources.items():
        for tag in ('cool', 'elec'):
            if tags.get(tag):
                ks = sorted(tags[tag])
                print('  %s/%s: %d 条  %s ~ %s' % (src, tag, len(ks), ks[0], ks[-1]))
    merged, src_rows, dropped = merge(sources, online_rows)

    report = ['', '===== mfg_merger 审计报告 =====']
    if dropped:
        report.append('剔除坏跨度（COP 超物理范围 0.5~20 或负值）：%d 条' % len(dropped))
        for d in dropped[:20]:
            report.append('  %s %s ~ %s COP=%s' % d)
        if len(dropped) > 20:
            report.append('  ... 共 %d 条' % len(dropped))
        report.append('')
    # 各源月度 COP 概览
    for src in sorted(src_rows):
        by_mon = defaultdict(list)
        for r in src_rows[src]:
            if r['cool'] and r['elec']:
                by_mon[month_of(r)].append(r)
        for mon in sorted(by_mon):
            report.append('源 %s %s: COP=%.3f (%d 跨度)' % (src, mon, cop_of(by_mon[mon]), len(by_mon[mon])))
    report.append('')
    ok = audit(merged, report)

    # 输出 merged csv
    out_csv = os.path.join(OUT_DIR, 'mfg_merged_daily_new.csv')
    with io.open(out_csv, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['date', 'date_end', 'cool_usage', 'elec_usage', 'days', 'src'])
        for r in sorted(merged, key=lambda r: r['start']):
            if r['cool'] is None:
                continue  # 电量孤儿跨度不进表（冷量缺失无 COP 意义），仅审计
            w.writerow([r['start'], r['end'], round(r['cool'], 2),
                         round(r['elec'], 2), r['days'], r['src']])

    # 增量 SQL
    n_sql = 0
    if not args.audit_only:
        since = args.since
        rows = [r for r in merged if r['cool'] is not None and (since is None or r['start'] > since)]
        out_sql = os.path.join(OUT_DIR, 'mfg_increment.sql')
        with io.open(out_sql, 'w', encoding='utf-8') as f:
            f.write('-- mfg_merger 增量 %s 生成\n' % __import__('datetime').datetime.now())
            f.write('-- 先删后插，保证该日期段幂等\n')
            for r in sorted(rows, key=lambda r: r['start']):
                f.write("DELETE FROM workspace_aadkvj7vniyyw.mfg_merged_daily WHERE date='%s';\n"
                        % r['start'])
                f.write("INSERT INTO workspace_aadkvj7vniyyw.mfg_merged_daily "
                        "(date, date_end, cool_usage, elec_usage, days, src) VALUES "
                        "('%s', '%s', %s, %s, %d, '%s');\n"
                        % (r['start'], r['end'], round(r['cool'], 2), round(r['elec'], 2),
                           r['days'], r['src']))
                n_sql += 1
        report.append('')
        report.append('SQL: %s（%d 行，since=%s）' % (out_sql, n_sql, since or '全量'))
    report.append('CSV: %s（%d 行）' % (out_csv, len([r for r in merged if r['cool'] is not None])))
    report.append('审计结论: %s' % ('✅ 全部通过' if ok else '❌ 存在偏差>5%，拒绝上数'))

    txt = '\n'.join(report)
    rep_path = os.path.join(OUT_DIR, 'mfg_merger_report.txt')
    io.open(rep_path, 'w', encoding='utf-8').write(txt)
    print(txt)
    sys.exit(0 if ok else 2)

if __name__ == '__main__':
    main()
