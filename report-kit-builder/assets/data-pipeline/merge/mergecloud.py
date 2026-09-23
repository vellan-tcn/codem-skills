# -*- coding: utf-8 -*-
# 配料车间云平台历史数据 → 合并时间序列 → 月度冷量/电量/COP（差值法）
# 同时与WinCC导出的月度COP交叉验证（2026-06~09重叠期）
import os, sys, zipfile, warnings
warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

SP = os.path.dirname(os.path.abspath(__file__))
CD = os.path.join(SP, 'cloud配料')
OUT = os.path.join(SP, 'merged_series.csv')

rows = []  # (dt_str, cum_cool, cum_elec)
files = sorted(f for f in os.listdir(CD) if f.endswith('.zip'))
print('files:', len(files))
for fn in files:
    p = os.path.join(CD, fn)
    z = zipfile.ZipFile(p)
    inner = z.namelist()[0]
    tmp = os.path.join(SP, 'tmp_' + fn + '.xlsx')
    open(tmp, 'wb').write(z.read(inner))
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    try:
        ws.reset_dimensions()  # xlsx维度元数据损坏(记录为1x1)，重扫真实范围
    except Exception:
        pass
    it = ws.iter_rows(values_only=True)
    hdr = next(it)
    # 列: 时间,总平均SCOP,冷冻累计冷量,总累计用电量,...
    idx_t, idx_c, idx_e = 0, 2, 3
    n = 0
    for r in it:
        if r is None or len(r) < 4 or r[0] is None:
            continue
        rows.append((str(r[0])[:19], r[idx_c], r[idx_e]))
        n += 1
    wb.close()
    os.remove(tmp)
    print(f'{fn}: {n} rows, total {len(rows)}')

# 排序去重
rows.sort(key=lambda x: x[0])
print('range:', rows[0][0], '->', rows[-1][0])

import csv
with open(OUT, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['时间', '冷冻累计冷量', '总累计用电量'])
    w.writerows(rows)
print('merged ->', OUT, len(rows), 'rows')

# 月度差值计算
from collections import OrderedDict
months = OrderedDict()
for t, c, e in rows:
    m = t[:7]
    if m not in months:
        months[m] = {'first': (t, c, e), 'last': (t, c, e)}
    months[m]['last'] = (t, c, e)

print('\n=== 月度汇总（云平台数据）===')
print(f"{'月份':8} {'冷量kWh':>12} {'电量kWh':>12} {'COP':>7}  首末时间")
result = []
for m, d in months.items():
    (t1, c1, e1), (t2, c2, e2) = d['first'], d['last']
    try:
        cool = float(c2) - float(c1)
        elec = float(e2) - float(e1)
        cop = cool / elec if elec else None
    except (TypeError, ValueError):
        cool = elec = cop = None
    result.append((m, cool, elec, cop, t1, t2))
    print(f"{m:8} {cool and round(cool,1) or '-':>12} {elec and round(elec,1) or '-':>12} {cop and round(cop,3) or '-':>7}  {t1} ~ {t2}")

# 保存结果
with open(os.path.join(SP, 'monthly_cop_cloud.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['month', 'cool_kwh', 'elec_kwh', 'cop', 'first_ts', 'last_ts'])
    for m, cool, elec, cop, t1, t2 in result:
        w.writerow([m, round(cool,1) if cool is not None else '', round(elec,1) if elec is not None else '',
                   round(cop,3) if cop is not None else '', t1, t2])
print('\nsaved -> monthly_cop_cloud.csv')
