# -*- coding: utf-8 -*-
# 将 C:\SQLData\export\v*.csv 聚合为小时级长表 sensor_data.csv + 月度COP表 monthly_cop.csv
import csv, os
from collections import defaultdict
from datetime import datetime

EXP = r'C:\SQLData\export'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # 工作空间根
OUT = os.path.join(ROOT, 'miaoda_data')
os.makedirs(OUT, exist_ok=True)

NAMES = {
    891: '实时SCOP', 918: '总平均SCOP', 892: '冷冻瞬时冷量', 893: '冷冻累计冷量',
    890: '冷冻瞬时流量', 919: '总累计用电量', 920: '冷却塔累计用电量',
    921: '3#主机累计用电量', 922: '2#主机累计用电量', 923: '1#主机累计用电量',
    924: '2#热水泵累计用电量', 925: '1#热水泵累计用电量',
    926: '4#冷冻泵累计用电量', 927: '3#冷冻泵累计用电量', 928: '2#冷冻泵累计用电量', 929: '1#冷冻泵累计用电量',
    930: '4#冷却泵累计用电量', 931: '3#冷却泵累计用电量', 932: '2#冷却泵累计用电量', 933: '1#冷却泵累计用电量',
    935: '实时总功率', 936: '主机瞬时cop', 983: '室外温度',
    1028: '年累计冷量', 1029: '月累计冷量', 1030: '日累计冷量',
    1031: '年累计电量', 1032: '月累计电量', 1033: '日累计电量',
    1034: '月平均SCOP', 1035: '日平均SCOP', 1036: '年平均SCOP',
}
# 瞬时量取小时均值, 累计量取小时末值
INSTANT = {891, 892, 890, 918, 935, 936, 983, 1034, 1035, 1036, 1029, 1032, 1033, 1030}

total_rows = 0
with open(os.path.join(OUT, 'sensor_data.csv'), 'w', encoding='utf-8', newline='') as fo:
    w = csv.writer(fo)
    w.writerow(['ts', 'varname', 'value'])
    for vid, name in NAMES.items():
        path = os.path.join(EXP, 'v%d.csv' % vid)
        if not os.path.exists(path):
            continue
        agg = {}  # hour -> [sum, cnt, last]
        with open(path, encoding='utf-8-sig') as f:
            r = csv.reader(f)
            next(r, None)
            for line in r:
                if len(line) >= 2 and line[1]:
                    try:
                        t = datetime.strptime(line[0], '%Y-%m-%d %H:%M:%S')
                        v = float(line[1])
                    except (ValueError, IndexError):
                        continue
                    h = t.strftime('%Y-%m-%d %H:00:00')
                    a = agg.setdefault(h, [0.0, 0, None])
                    a[0] += v; a[1] += 1; a[2] = v
        rows = []
        for h in sorted(agg):
            a = agg[h]
            val = (a[0] / a[1]) if vid in INSTANT else a[2]
            rows.append((h, name, round(val, 4)))
        w.writerows(rows)
        total_rows += len(rows)
        print('vid %d %s: %d hourly rows' % (vid, name, len(rows)))
print('total:', total_rows)

# 月度COP表
def read_monthly(vid):
    path = os.path.join(EXP, 'v%d.csv' % vid)
    m = {}
    if not os.path.exists(path):
        return m
    with open(path, encoding='utf-8-sig') as f:
        r = csv.reader(f)
        next(r, None)
        for line in r:
            if len(line) >= 2 and line[1]:
                k = line[0][:7]
                try:
                    m[k] = float(line[1])  # 最后一条覆盖
                except ValueError:
                    pass
    return m

first = {}
def read_first(vid):
    path = os.path.join(EXP, 'v%d.csv' % vid)
    m = {}
    if not os.path.exists(path):
        return m
    with open(path, encoding='utf-8-sig') as f:
        r = csv.reader(f)
        next(r, None)
        for line in r:
            if len(line) >= 2 and line[1]:
                k = line[0][:7]
                if k not in m:
                    try:
                        m[k] = float(line[1])
                    except ValueError:
                        pass
    return m

coolL, coolF = read_monthly(893), read_first(893)
elecL, elecF = read_monthly(919), read_first(919)
devs = [920] + list(range(921, 934))
devL = {v: read_monthly(v) for v in devs}
devF = {v: read_first(v) for v in devs}

with open(os.path.join(OUT, 'monthly_cop.csv'), 'w', encoding='utf-8', newline='') as fo:
    w = csv.writer(fo)
    w.writerow(['month', 'cool_kwh', 'elec_kwh', 'cop'])
    for k in sorted(set(coolL) | set(elecL)):
        dc = de = None
        if k in coolL and k in coolF:
            dc = coolL[k] - coolF[k]
        if k in elecL and k in elecF and elecL[k] > elecF[k]:
            de = elecL[k] - elecF[k]
        else:
            parts = []
            for v in devs:
                if k in devL[v] and k in devF[v] and devL[v][k] > devF[v][k]:
                    parts.append(devL[v][k] - devF[v][k])
            if parts:
                de = sum(parts)
        cop = dc / de if (dc and de and de > 0) else None
        w.writerow([k, '' if dc is None else round(dc, 1), '' if de is None else round(de, 1), '' if cop is None else round(cop, 3)])
print('monthly_cop done')
