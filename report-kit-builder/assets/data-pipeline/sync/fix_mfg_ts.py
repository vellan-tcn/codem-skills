# -*- coding: utf-8 -*-
"""归一 mfg_raw_reading 分片 ts 为 ISO 格式（dot DD.MM.YY → 20YY-MM-DD；dash 补零），重写分片。"""
import glob
import re
import os

CHUNK_DIR = '03_processed/制造/raw_chunks'

def norm_date(d):
    if '.' in d:
        dd, mm, yy = d.split('.')
        return f'20{yy}-{int(mm):02d}-{int(dd):02d}'
    y, m, dd = d.split('-')
    return f'{int(y):04d}-{int(m):02d}-{int(dd):02d}'

def norm_time(t):
    parts = t.split(':')
    if len(parts) == 2:
        h, mi = parts
        s = '00'
    else:
        h, mi, s = parts
    return f'{int(h):02d}:{int(mi):02d}:{int(s):02d}'

row_re = re.compile(r"\('(\w+)', '([\d.:-]+ [\d:]+)', ([^)]+)\)")

total = dot_n = dash_n = 0
for fn in sorted(glob.glob(os.path.join(CHUNK_DIR, 'c*.sql'))):
    t = open(fn, encoding='utf-8').read()
    m = row_re.search(t)
    if not m:
        print('NO ROWS', fn)
        continue

    def repl(mo):
        global dot_n, dash_n
        tag, ts, val = mo.group(1), mo.group(2), mo.group(3)
        d, tm = ts.split(' ')
        iso = f'{norm_date(d)} {norm_time(tm)}'
        if '.' in d:
            dot_n += 1
        else:
            dash_n += 1
        return f"('{tag}', '{iso}', {val})"

    t2 = row_re.sub(repl, t)
    open(fn, 'w', encoding='utf-8', newline='\n').write(t2)
    total += 1

print(f'chunks={total} dot_rows={dot_n} dash_rows={dash_n}')
