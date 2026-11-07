# -*- coding: utf-8 -*-
import csv, os, sys
from collections import defaultdict

EXP = r'C:\SQLData\export'
NAMES = {
    891: '实时SCOP', 918: '总平均SCOP', 892: '冷冻瞬时冷量', 893: '冷冻累计冷量',
    890: '冷冻瞬时流量', 919: '总累计用电量', 920: '冷却塔累计用电量',
    921: '3#主机累计用电量', 922: '2#主机累计用电量', 923: '1#主机累计用电量',
    924: '2#热水泵累计用电量', 925: '1#热水泵累计用电量',
    926: '4#冷冻泵累计用电量', 927: '3#冷冻泵累计用电量', 928: '2#冷冻泵累计用电量', 929: '1#冷冻泵累计用电量',
    930: '4#冷却泵累计用电量', 931: '3#冷却泵累计用电量', 932: '2#冷却泵累计用电量', 933: '1#冷却泵累计用电量',
    934: '今日用电量', 935: '实时总功率', 936: '主机瞬时cop', 983: '室外温度',
    1028: '年累计冷量', 1029: '月累计冷量', 1030: '日累计冷量',
    1031: '年累计电量', 1032: '月累计电量', 1033: '日累计电量',
    1034: '月平均SCOP', 1035: '日平均SCOP', 1036: '年平均SCOP', 1037: '主机功率占比',
}

def read_var(vid):
    path = os.path.join(EXP, 'v%d.csv' % vid)
    if not os.path.exists(path):
        return []
    rows = []
    with open(path, encoding='utf-8-sig') as f:
        r = csv.reader(f)
        next(r, None)
        for line in r:
            if len(line) >= 2:
                try:
                    rows.append((line[0], float(line[1])))
                except ValueError:
                    pass
    rows.sort()
    return rows

# 1) 读取累计冷量(893)和总累计用电量(919)，按月算 COP
cool = read_var(893)
elec = read_var(919)
print('累计冷量 rows:', len(cool), cool[0][0] if cool else '-', '~', cool[-1][0] if cool else '-')
print('总累计用电量 rows:', len(elec), elec[0][0] if elec else '-', '~', elec[-1][0] if elec else '-')

# 按月取首末值
def monthly_firstlast(rows):
    m = {}
    for ts, v in rows:
        key = ts[:7]
        if key not in m:
            m[key] = [v, v]
        else:
            m[key][1] = v
    return m

mc = monthly_firstlast(cool)
me = monthly_firstlast(elec)
out = []
for k in sorted(set(mc) | set(me)):
    c = mc.get(k, [None, None])
    e = me.get(k, [None, None])
    dc = (c[1] - c[0]) if (c[0] is not None and c[1] is not None) else None
    de = (e[1] - e[0]) if (e[0] is not None and e[1] is not None) else None
    cop = (dc / de) if (dc and de) else None
    out.append((k, c[0], c[1], dc, e[0], e[1], de, cop))

res = os.path.join(EXP, '月度COP汇总.csv')
with open(res, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['月份', '冷量_月初', '冷量_月末', '冷量增量kWh', '用电_月初', '用电_月末', '用电增量kWh', '月COP'])
    for row in out:
        w.writerow([x if x is not None else '' for x in row])
print('月度COP汇总 written:', res)
for row in out:
    print(row)
