# -*- coding: utf-8 -*-
"""制造车间 merged_daily 上传准备：
- 读 merge_report.json periods（真实示数链周期）
- 剔除 2026-05-09 ~ 2026-07-10 电量停滞坏跨度（该段 elec 几乎不走，COP 失真）
- 5/6/7月断链：插入 Excel 月报行（整月一行，src='Excel月报'）
- 输出 mfg_merged_daily DDL+INSERT SQL
"""
import json, calendar, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 工作空间根，换机/改目录自动适应
BASE = os.path.join(ROOT, '03_processed', '制造')
BAD_SPAN = ('2026-05-09', '2026-07-10')  # 电量链停滞段（含）
EXCEL_ROWS = {  # 断链月 Excel 权威值（制造车间汇总 sheet）
    '2026-05': (975160, 225770),
    '2026-06': (1051863, 234049),
    '2026-07': (1338801, 307939),
}

d = json.load(open(f"{BASE}/merge_report.json", encoding='utf-8'))
periods = d['periods']

kept, dropped = [], []
for p in periods:
    s, e = p['start'], p['end']
    # 与坏段相交即剔（坏段起点 5/9 的周期 = 04-29~05-09 保留：其 end==5/9 是坏段首日示数，仍有效）
    if s > BAD_SPAN[0] and s < BAD_SPAN[1]:
        dropped.append(p)
    else:
        kept.append(p)
# 额外保险：end 落在坏段内且 start 在 5/9 前的周期（如 05-09~07-10 整段）已由上面 start 规则捕获；
# 04-29~05-09 保留（end=5/9 为坏段首日示数，链有效）

# 删除 5/6/7 月内的链周期（避免与 Excel 行双算；5/1~5/9 好数据在 04-29~05-09 跨度里归 4 月）
kept2 = [p for p in kept if p['start'][:7] not in EXCEL_ROWS]

rows = []
for p in kept2:
    rows.append((p['start'], p['end'], p['days'], p['cool'], p['elec'], p.get('src_start') or '链'))
for m, (c, e) in EXCEL_ROWS.items():
    y, mo = m.split('-')
    last = calendar.monthrange(int(y), int(mo))[1]
    cop = round(c / e, 4) if e else None
    rows.append((f"{m}-01", f"{m}-{last:02d}", last, c, e, 'Excel月报'))
    rows.sort(key=lambda r: r[0])

print(f"链周期保留 {len(kept2)}（剔除断链月/坏跨度 {len(periods)-len(kept2)} 条）+ Excel 月报行 {len(EXCEL_ROWS)}")
tot_c = sum(r[3] for r in rows); tot_e = sum(r[4] for r in rows)
print(f"全年链+月报 冷量 {tot_c:.1f} 电量 {tot_e:.1f} COP {tot_c/tot_e:.3f}")
print(f"Excel 年累计参考: 7882605 / 1538001.6 (COP 5.125)")

def esc(v):
    return 'NULL' if v is None else str(v)

sql = ["-- 制造车间 merged_daily（示数链周期 + Excel 月报补行）",
       "CREATE TABLE IF NOT EXISTS workspace_aadkvj7vniyyw.mfg_merged_daily (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, "
       "date date UNIQUE, date_end date, cool_start double precision, elec_start double precision, "
       "cool_end double precision, elec_end double precision, cool_usage double precision, "
       "elec_usage double precision, cop double precision, days int, src varchar(20), "
       "_created_at timestamp DEFAULT CURRENT_TIMESTAMP, _updated_at timestamp DEFAULT CURRENT_TIMESTAMP);"]
sql.append("DELETE FROM workspace_aadkvj7vniyyw.mfg_merged_daily;")
for r in rows:
    # 周期行：示数信息在 periods 里
    p = next((x for x in kept2 if x['start'] == r[0] and x['end'] == r[1]), None)
    cs = p['cool_start'] if p else 'NULL'; ce = p['cool_end'] if p else 'NULL'
    es = p['elec_start'] if p else 'NULL'; ee = p['elec_end'] if p else 'NULL'
    cop = p['cop'] if p and p.get('cop') is not None else (round(r[3]/r[4], 4) if r[4] else 'NULL')
    sql.append(f"INSERT INTO workspace_aadkvj7vniyyw.mfg_merged_daily (date, date_end, cool_start, elec_start, cool_end, elec_end, cool_usage, elec_usage, cop, days, src) "
               f"VALUES ('{r[0]}', '{r[1]}', {esc(cs)}, {esc(es)}, {esc(ce)}, {esc(ee)}, {r[3]}, {r[4]}, {esc(cop) if not isinstance(cop, float) else cop}, {r[2]}, '{r[5]}');")

out = f"{BASE}/mfg_merged_daily.sql"
open(out, 'w', encoding='utf-8').write('\n'.join(sql) + '\n')
print(f"SQL 写出: {out}（{len(rows)} 行）")
# 打印最终月度汇总（验证）
from collections import defaultdict
mc = defaultdict(lambda: [0.0, 0.0])
for r in rows:
    mc[r[0][:7]][0] += r[3]; mc[r[0][:7]][1] += r[4]
for m in sorted(mc):
    print(m, round(mc[m][0]), round(mc[m][1]), round(mc[m][0]/mc[m][1], 3) if mc[m][1] else '-')
