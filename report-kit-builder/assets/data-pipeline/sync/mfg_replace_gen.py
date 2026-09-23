# -*- coding: utf-8 -*-
"""生成 mfg_merged_daily 替换 SQL：删 >= 2026-04-29 旧行（含 3 行 Excel 月报行 + 04-29~05-09 跨度行），插 89 行重建日行"""
import json

SP = r'C:/Users/vella/.codem/sessions/4dd5d9fbbad88481/sess_7686678375015943113/scratchpad'
rows = json.load(open(f'{SP}/mfg_new_rows.json', encoding='utf-8'))

sql = ["DELETE FROM workspace_aadkvj7vniyyw.mfg_merged_daily WHERE date >= '2026-04-29';"]
for r in rows:
    cop = 'NULL' if r['cop'] is None else r['cop']
    sql.append(
        "INSERT INTO workspace_aadkvj7vniyyw.mfg_merged_daily "
        "(date, date_end, cool_start, elec_start, cool_end, elec_end, cool_usage, elec_usage, cop, days, src) "
        f"VALUES ('{r['start']}', '{r['end']}', {r['cs']}, {r['es']}, {r['ce']}, {r['ee']}, "
        f"{r['cool']}, {r['elec']}, {cop}, {r['days']}, '云平台原始链');"
    )
open(f'{SP}/mfg_replace_567.sql', 'w', encoding='utf-8').write('\n'.join(sql) + '\n')
print(f'sql ok: {len(rows)} inserts')
