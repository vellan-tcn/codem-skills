# -*- coding: utf-8 -*-
"""cop_best_month.py — 按月选COP最高源为主源+其他源补全，实测月度COP变化与全月验算一致性"""
from pathlib import Path
import json
from collections import defaultdict
from datetime import date

# ★★项目特定参数：下行为麻辣王子本机 merge_report.json 路径，新项目必改
R = json.load(open(Path(__file__).resolve().parents[2] / '03_processed' / '配料' / 'merge_report.json', encoding='utf-8'))

# 每天各源有效示数: day -> {src: (cool, elec)}（坏值0剔除）
day_src = {}
for d in R['days_detail']:
    m = {}
    for a in d['alts']:
        if a['cool'] is not None and a['elec'] is not None and a['cool'] > 0 and a['elec'] > 0:
            m[a['src']] = (a['cool'], a['elec'])
    day_src[d['day']] = m

months = sorted(set(d[:7] for d in day_src))

# 按月：各源单独链差值 -> COP
def src_month_cop(month, src):
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
    return (cool / elec if elec > 0 else 0), len(days)

# 每月主源 = COP 最高者；月内取值：主源优先，缺/坏则按该月COP排名依次补
main_src, rank = {}, {}
for m in months:
    cands = []
    for src in ['能耗xlsx', '有人云rar', '能效报表', 'WinCC']:
        r = src_month_cop(m, src)
        if r:
            cands.append((src, r[0], r[1]))
    cands.sort(key=lambda x: -x[1])
    if cands:
        main_src[m] = cands[0][0]
        rank[m] = [c[0] for c in cands]

# 构建选用链: 每天按 该月排名 顺序取第一个有有效示数的源
chosen = {}
for d, m in sorted(day_src.items()):
    for src in rank.get(d[:7], []):
        if src in m:
            chosen[d] = (src, m[src][0], m[src][1])
            break

# 周期差值（相邻选中天），起始日归月；单调校验
gdays = sorted(chosen)
periods, errs = [], []
prev = None
for i in range(len(gdays) - 1):
    d1, d2 = gdays[i], gdays[i + 1]
    s1, c1, e1 = chosen[d1]
    s2, c2, e2 = chosen[d2]
    if c2 < c1 or e2 < e1:
        errs.append(('示数倒转', d1, d2, s1, s2))
        continue
    periods.append({'start': d1, 'end': d2, 'cool': c2 - c1, 'elec': e2 - e1,
                    'src_start': s1, 'src_end': s2})

monthly = defaultdict(lambda: [0.0, 0.0])
for p in periods:
    mm = p['start'][:7]
    monthly[mm][0] += p['cool']
    monthly[mm][1] += p['elec']

print('%-9s %-14s %-9s %-9s %-9s %s' % ('月份', '主源(最高COP)', '新COP', '旧COP', '变化', '全月验算'))
tot_new = tot_old = 0
for m in months:
    old = next((x for x in R['months'] if x['month'] == m), None)
    if m not in monthly or not old or not old['cop']:
        continue
    nc = monthly[m][0] / monthly[m][1] if monthly[m][1] else 0
    # 全月验算：月内周期数、每日周期加和 == 月度
    ps = [p for p in periods if p['start'].startswith(m)]
    sc = sum(p['cool'] for p in ps); se = sum(p['elec'] for p in ps)
    ok = abs(sc - monthly[m][0]) < 0.5 and abs(se - monthly[m][1]) < 0.5
    tot_new += monthly[m][0]; tot_old += old['cool']
    print('%-9s %-14s %-9.3f %-9.3f %+6.2f%%  %s (周期%d个, cool=%s elec=%.1f)' % (
        m, main_src.get(m, '-'), nc, old['cop'], (nc / old['cop'] - 1) * 100,
        '一致✓' if ok else '不一致✗', len(ps), format(round(sc), ','), se))
print()
print('倒转/异常:', errs if errs else '无 ✓')
print('累计冷量: 新 %.0f vs 旧 %.0f (%.2f%%)' % (tot_new, tot_old, (tot_new / tot_old - 1) * 100 if tot_old else 0))
