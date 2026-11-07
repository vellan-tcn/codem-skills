#!/usr/bin/env python3
"""
Heuristic decoder for WinCC-like TagCompressed digital (_DC) blocks.

- Works from Linux/WSL/macOS/Windows using ODBC Driver 18.
- Supports SQL auth (username/password) or Windows Integrated Auth (--trusted).
- Finds Excel-serial start time (float64 LE) in the first ~64 bytes,
  reads period_ms (uint32 LE) right after it, then treats the rest as
  a bit-packed boolean stream (LSB-first by default).

Usage example:
  python decode_tagcompressed_dc.py \
    --server 127.0.0.1,1433 \
    --database YourDB \
    --username analytics_user --password "YourStrong!Passw0rd" \
    --valueid 1 \
    --output tag_1.csv \
    --max_blocks 2
"""
import argparse
import datetime as dt
import struct
import csv
import pyodbc

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

def find_excel_serial_double(b: bytes, search_limit=64):
    # Look for Excel serial double (1900 date system), rough range for 2000-2100
    for i in range(0, min(len(b)-8, search_limit)):
        d = struct.unpack_from("<d", b, i)[0]
        if 35000.0 <= d <= 55000.0:
            return i, d
    return None, None

def excel_to_dt(x: float) -> dt.datetime:
    # Excel 1900 system with leap-bug convention (Windows default)
    origin = dt.datetime(1899, 12, 30)
    days = int(x)
    frac = x - days
    return origin + dt.timedelta(days=days, seconds=frac*86400.0)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", required=True, help="host,port (e.g., 127.0.0.1,1433)")
    ap.add_argument("--database", required=True)
    ap.add_argument("--driver", default="ODBC Driver 18 for SQL Server")
    auth = ap.add_mutually_exclusive_group(required=True)
    auth.add_argument("--trusted", action="store_true", help="use Windows Integrated Auth")
    auth.add_argument("--username", help="SQL login")
    ap.add_argument("--password", help="SQL password (required if --username is set)")
    ap.add_argument("--valueid", type=int, required=True, help="ValueID of the _DC tag to expand")
    ap.add_argument("--output", default="tag_dc_export.csv")
    ap.add_argument("--max_blocks", type=int, default=5, help="limit number of blocks (0=all)")
    ap.add_argument("--msb_first", action="store_true", help="interpret bits MSB->LSB instead of default LSB->MSB")
    args = ap.parse_args()

    if not args.trusted and not args.password:
        ap.error("--password is required when using --username")

    cn = pyodbc.connect(build_conn_str(args), timeout=5)
    cur = cn.cursor()

    sql = """
        SELECT {top} ValueID, Timebegin, Timeend, BinValues
        FROM dbo.TagCompressed WITH (NOLOCK)
        WHERE ValueID = ?
        ORDER BY Timebegin
    """.format(top=("TOP (?)" if args.max_blocks else ""))

    params = ([args.max_blocks] if args.max_blocks else []) + [args.valueid]
    cur.execute(sql, *params)
    rows = cur.fetchall()

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["timestamp","value"])

        for (valueid, tb, te, blob) in rows:
            b = bytes(blob)
            off, serial = find_excel_serial_double(b)
            if off is None:
                print("Skip: Excel serial not found in header (block starting {})".format(tb))
                continue
            period_off = off + 8
            if period_off + 4 > len(b):
                print("Skip: truncated header (block starting {})".format(tb))
                continue
            period_ms = struct.unpack_from("<I", b, period_off)[0]
            header_end = period_off + 4

            total_ms = int((te - tb).total_seconds() * 1000)
            exp_samples = max(total_ms // max(1, period_ms), 0)

            # Try skipping 0..4 extra control bytes to sync to payload
            chosen = 0
            for extra in range(0, 5):
                payload_len_bits = max(0, (len(b) - (header_end + extra)) * 8)
                if payload_len_bits >= exp_samples:
                    chosen = extra
                    break

            payload = b[header_end + chosen:]
            t = tb
            emitted = 0

            for byte in payload:
                # Choose bit order
                if args.msb_first:
                    bit_iter = [(byte >> (7-k)) & 1 for k in range(8)]
                else:
                    bit_iter = [(byte >> k) & 1 for k in range(8)]
                for bit in bit_iter:
                    if t >= te:
                        break
                    w.writerow([t.isoformat(sep=" ", timespec="milliseconds"), bit])
                    emitted += 1
                    t = t + dt.timedelta(milliseconds=period_ms)
                if t >= te:
                    break

            print(f"Block {tb}..{te} period_ms={period_ms} -> {emitted} samples")

    print("Done. CSV:", args.output)

if __name__ == "__main__":
    main()
