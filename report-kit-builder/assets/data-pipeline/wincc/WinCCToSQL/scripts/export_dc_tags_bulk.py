#!/usr/bin/env python3
"""
Bulk-export all digital (_DC) tags from TagCompressed into CSVs.
- SQL auth or Trusted_Connection supported
- One CSV per tag: "<ValueName>.csv" with timestamp,value

Example:
  python export_dc_tags_bulk.py \
    --server 127.0.0.1,1433 \
    --database YourDB \
    --username analytics_user --password "YourStrong!Passw0rd" \
    --outdir ./out_dc
"""
import argparse, csv, datetime as dt, re, struct, pyodbc
from pathlib import Path

def build_conn_str(args):
    parts = [
        f"DRIVER={{{args.driver}}}",
        f"SERVER={args.server}",
        f"DATABASE={args.database}",
        "Encrypt=no",
        "TrustServerCertificate=yes",
    ]
    if args.trusted:
        parts.append("Trusted_Connection=yes")
    else:
        parts.append(f"UID={args.username}")
        parts.append(f"PWD={args.password}")
    return ";".join(parts) + ";"

def safe_name(s: str) -> str:
    return re.sub(r"[^\w.\-]+","_", s).strip("_")[:180]

def find_excel_serial_double(b: bytes, search_limit=64):
    for i in range(0, min(len(b)-8, search_limit)):
        d = struct.unpack_from("<d", b, i)[0]
        if 35000.0 <= d <= 55000.0:
            return i, d
    return None, None

def decode_block(tb, te, blob: bytes, msb_first=False):
    b = bytes(blob)
    off, _ = find_excel_serial_double(b)
    if off is None:
        return [], None
    period_off = off + 8
    if period_off + 4 > len(b):
        return [], None
    period_ms = struct.unpack_from("<I", b, period_off)[0]
    header_end = period_off + 4

    total_ms = int((te - tb).total_seconds() * 1000)
    exp_samples = max(total_ms // max(1, period_ms), 0)

    chosen = 0
    for extra in range(0, 5):
        if (len(b) - (header_end+extra)) * 8 >= exp_samples:
            chosen = extra
            break

    payload = b[header_end + chosen:]
    rows = []
    t = tb
    for byte in payload:
        bits = [(byte >> (7-k)) & 1 for k in range(8)] if msb_first else [(byte >> k) & 1 for k in range(8)]
        for bit in bits:
            if t >= te:
                break
            rows.append((t, bit))
            t = t + dt.timedelta(milliseconds=period_ms)
        if t >= te:
            break
    return rows, period_ms

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", required=True)
    ap.add_argument("--database", required=True)
    ap.add_argument("--driver", default="ODBC Driver 18 for SQL Server")
    auth = ap.add_mutually_exclusive_group(required=True)
    auth.add_argument("--trusted", action="store_true")
    auth.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--outdir", default="./out_dc")
    ap.add_argument("--msb_first", action="store_true", help="interpret bits MSB->LSB")
    ap.add_argument("--max_tags", type=int, default=0, help="limit tags (0 = all)")
    ap.add_argument("--max_blocks", type=int, default=0, help="limit blocks per tag (0 = all)")
    args = ap.parse_args()

    if not args.trusted and not args.password:
        ap.error("--password is required when using --username")

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)

    cn = pyodbc.connect(build_conn_str(args), timeout=5)
    cur = cn.cursor()

    cur.execute("""
        SELECT ValueID, ValueName FROM dbo.Archive WITH (NOLOCK)
        WHERE ValueName LIKE '%[_]DC' ESCAPE '\\'
        ORDER BY ValueID
    """)
    tags = cur.fetchall()
    if args.max_tags > 0:
        tags = tags[:args.max_tags]

    for valueid, valuename in tags:
        print(f"Decoding {valuename} (ValueID={valueid})")
        cur2 = cn.cursor()

        if args.max_blocks > 0:
            cur2.execute("""
                SELECT TOP (?) Timebegin, Timeend, BinValues
                FROM dbo.TagCompressed WITH (NOLOCK)
                WHERE ValueID = ?
                ORDER BY Timebegin
            """, args.max_blocks, valueid)
        else:
            cur2.execute("""
                SELECT Timebegin, Timeend, BinValues
                FROM dbo.TagCompressed WITH (NOLOCK)
                WHERE ValueID = ?
                ORDER BY Timebegin
            """, valueid)

        rows = cur2.fetchall()
        if not rows:
            print("  (no blocks)")
            continue

        out_path = outdir / f"{safe_name(valuename)}.csv"
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["timestamp","value"])
            total = 0
            for tb, te, blob in rows:
                decoded, period_ms = decode_block(tb, te, blob, msb_first=args.msb_first)
                for t, bit in decoded:
                    w.writerow([t.isoformat(sep=" ", timespec="milliseconds"), bit])
                total += len(decoded)
            print(f"  → wrote {total} rows to {out_path}")

    print("Done.")

if __name__ == "__main__":
    main()
