# -*- coding: utf-8 -*-
"""audit_daily.py — 2026年逐日审计：覆盖完整性 + 停机判定逐日核对 + 剔除后COP复算 + 全链一致性互证"""
from pathlib import Path
import json
from collections import defaultdict
from datetime import date, timedelta

# ★★项目特定参数：下行为麻辣王子本机 merge_report.json 路径与 2026 年审计窗口，新项目必改
R = json.load(open(Path(__file__).resolve().parents[2] / '03_processed' / '配料' / 'merge_report.json', encoding='utf-8'))
ps = [p for p in R['periods'] if p['start'] >= '2026-01-01']
d1 = lambda s: date(*map(int, s.split('-')))

# ① 覆盖完整性：链首到链尾每个自然日必须有归属（自身为边界或落在某跨度内）
first, last = d1(ps[0]['start']), d1(ps[-1]['end'])
cover = {}  # day -> (period_idx, is_boundary)
for i, p in enumerate(ps):
    s, e = d1(p['start']), d1(p['end'])
    d = s
    while d <= e:
        cover[str(d)] = (i, d == e)
        d += timedelta(days=1)
all_days = []
d = first
while d <= last:
    all_days.append(str(d)); d += timedelta(days=1)
missing = [x for x in all_days if x not in cover]
gaps = [(p['start'], p['end'], p['days']) for p in ps if p['days'] > 1]
print('① 覆盖: %s ~ %s 共 %d 个自然日, 归属 %d 天, 未覆盖 %d 天' % (all_days[0], all_days[-1], len(all_days), len(cover), len(missing)))
print('   跨度合并段(%d 个, 缺天不显0):' % len(gaps))
for s, e, n in gaps:
    span = (d1(e) - d1(s)).days
    print('     %s~%s 覆盖%d天(周期%d天,差%d天为缺数日)' % (s, e, span, n, span - n + 1))
print()

# ② 逐日停机判定（周期日均冷量<100 = 冷机未开）
stop_days, run_days = [], []
for i, p in enumerate(ps):
    is_stop = p['cool'] / p['days'] < 100
    s, e = d1(p['start']), d1(p['end'])
    d = s
    while d <= e:
        rec = {'day': str(d), 'cool': p['cool'] if d == e else 0, 'cool_share': p['cool'] / max((d1(p['end']) - d1(p['start'])).days, 1),
               'elec_share': p['elec'] / max((d1(p['end']) - d1(p['start'])).days, 1), 'stop': is_stop}
        (stop_days if is_stop else run_days).append(rec)
        d += timedelta(days=1)
print('② 停机判定: 冷机未开 %d 天 / 运行 %d 天 / 合计 %d 天' % (len(stop_days), len(run_days), len(stop_days) + len(run_days)))
ms = defaultdict(int)
for r in stop_days: ms[r['day'][:7]] += 1
for r in run_days: ms[r['day'][:7]] += 0
mr = defaultdict(int)
for r in run_days: mr[r['day'][:7]] += 1
print('   各月 停机天/运行天: ' + ', '.join('%s: %d停/%d开' % (m, ms[m], mr[m]) for m in sorted(set(ms) | set(mr))))
se = sum(r['elec_share'] for r in stop_days)
print('   停机段电耗(按天分摊): %.1f kWh, 停机段冷量: %.0f kWh' % (se, sum(r['cool_share'] for r in stop_days)))
print()

# ③ 剔除后复算（周期级精确: 整周期保留/剔除）
keep = [p for p in ps if p['cool'] / p['days'] >= 100]
drop = [p for p in ps if p['cool'] / p['days'] < 100]
tc, te = sum(p['cool'] for p in keep), sum(p['elec'] for p in keep)
print('③ 剔除后复算: 保留周期 %d / 剔除周期 %d (全部为冷机未开段)' % (len(keep), len(drop)))
print('   保留: 冷量 %.0f / 电量 %.1f → 运行COP = %.4f' % (tc, te, tc / te))
print('   剔除: 冷量 %.0f / 电量 %.1f' % (sum(p['cool'] for p in drop), sum(p['elec'] for p in drop)))
print('   原全年(含停机): 冷量 %.0f / 电量 %.1f → %.4f' % (tc + sum(p['cool'] for p in drop), te + sum(p['elec'] for p in drop), (tc + sum(p['cool'] for p in drop)) / (te + sum(p['elec'] for p in drop))))
print()

# ④ 全链一致性: 周期加总 = 首末差值; 剔除后 = 保留加总
fc, fe = R['days_detail'][0], None
ch = sorted((d['day'], d) for d in R['days_detail'] if d['status'] == 'chosen')
gfirst = min(d for d, _ in ch if d >= '2026-01-01')
glast = max(d for d, _ in ch)
a, b = dict(ch)[gfirst], dict(ch)[glast]
print('④ 一致性: 首末差值法(冷 %.0f/电 %.1f) vs 周期加总(冷 %.0f/电 %.1f) → %s' % (
    b['cool'] - a['cool'], b['elec'] - a['elec'],
    sum(p['cool'] for p in ps), sum(p['elec'] for p in ps),
    '一致✓' if abs((b['cool'] - a['cool']) - sum(p['cool'] for p in ps)) < 5 else '不一致!'))
print()

# ⑤ 月度明细表（逐月：运行天/停机天/冷量/电量/剔除后COP）
old = {m['month']: m for m in R['months']}
print('⑤ 月度明细（剔除停机后）:')
print('%-9s %5s %5s %12s %11s %7s %7s' % ('月份', '运行', '停机', '冷量kWh', '电量kWh', '新COP', '原COP'))
mm = defaultdict(lambda: [0.0, 0.0, 0, 0])
for p in keep:
    m = p['start'][:7]
    mm[m][0] += p['cool']; mm[m][1] += p['elec']; mm[m][2] += 1
for p in drop:
    mm[p['start'][:7]][3] += p['days']
for m in sorted(mm):
    c, e, nk, nd = mm[m]
    o = old.get(m)
    print('%-9s %5d %5d %12.0f %11.1f %7.3f %7.3f' % (m, nk, nd, c, e, c / e if e else 0, (o['cop'] or 0) if o else 0))
print('%-9s %5d %5d %12.0f %11.1f %7.3f %7.3f' % ('全年', sum(v[2] for v in mm.values()), sum(v[3] for v in mm.values()), tc, te, tc / te, 5.108))
