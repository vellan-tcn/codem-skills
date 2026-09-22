# -*- coding: utf-8 -*-
"""cop_by_source.py — 评估：各月若主用不同数据源，月度 COP 会有多大差异（为'优先选COP最高源'准则做实测）"""
from pathlib import Path
import json
from collections import defaultdict

# ★★项目特定参数：下行为示例食品厂本机 merge_report.json 路径，新项目必改
R = json.load(open(Path(__file__).resolve().parents[2] / '03_processed' / '配料' / 'merge_report.json', encoding='utf-8'))

# 每天各源示数：day -> {src: (cool, elec)}
day_src = {}
for d in R['days_detail']:
    m = {}
    for a in d['alts']:
        if a['cool'] is not None and a['elec'] is not None and a['cool'] > 0 and a['elec'] > 0:
            m[a['src']] = (a['cool'], a['elec'])
    if m:
        day_src[d['day']] = m

def month_cop_for_source(month, src):
    """用单一源构成示数链（该源缺的天自动跨度合并），返回(月cool, 月elec, 覆盖边界数)"""
    days = sorted(d for d in day_src if d.startswith(month) and src in day_src[d])
    if len(days) < 2:
        return None
    cool = elec = 0
    for i in range(len(days) - 1):
        c1, e1 = day_src[days[i]][src]
        c2, e2 = day_src[days[i + 1]][src]
        if c2 >= c1 and e2 >= e1:
            cool += c2 - c1
            elec += e2 - e1
    return cool, elec, len(days)

months = sorted(set(d[:7] for d in day_src))
print('%-9s %-28s %-28s %s' % ('月份', '现状(优先级链)', '各源单独算COP(最优加*)', 'COP提升'))
for m in months:
    cur = next((x for x in R['months'] if x['month'] == m), None)
    if not cur or not cur['cop']:
        continue
    cands = []
    for src in ['能耗xlsx', '有人云rar', '能效报表', 'WinCC']:
        r = month_cop_for_source(m, src)
        if r and r[1] > 0:
            cands.append((src, r[0] / r[1], r[2]))
    cands.sort(key=lambda x: -x[1])
    best = cands[0] if cands else None
    txt = ' | '.join('%s=%.3f(%d天)' % (s, c, n) for s, c, n in cands)
    gain = (best[1] / cur['cop'] - 1) * 100 if best else 0
    print('%-9s COP=%.3f (%d边界)  %-50s %+.2f%%' % (m, cur['cop'], 0, txt, gain))
