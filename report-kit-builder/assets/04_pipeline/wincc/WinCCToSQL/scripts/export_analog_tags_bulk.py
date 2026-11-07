#!/usr/bin/env python3
"""
Bulk-export analog '#Value' tags from TagCompressed into CSVs.

- Uses a robust heuristic decoder per block (float32, float64, int16*scale, varint-delta*scale)
- Or you can force a codec with --codec
- One CSV per tag, filename based on ValueName (sanitized)
- Supports SQL auth or Windows Integrated Auth

Examples:
  python export_analog_tags_bulk.py \
    --server 127.0.0.1,1433 --database YourDB \
    --username analytics_user --password "YourStrong!Passw0rd" \
    --outdir ./out_analog --max_tags 20

  # Force codec if you already know it (e.g., varint)
  python export_analog_tags_bulk.py ... --codec varint
"""
from pathlib import Path
import argparse, csv, datetime as dt, math, re, struct
from typing import List, Tuple, Optional

import pyodbc

# -------------------- utils --------------------
def safe_name(s: str) -> str:
    return re.sub(r"[^\w.\-]+","_", s).strip("_")[:180]

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

def find_excel_serial_double(b: bytes, search_limit=256):
    for i in range(0, min(len(b)-8, search_limit)):
        d = struct.unpack_from("<d", b, i)[0]
        if 35000.0 <= d <= 55000.0:
            return i, d
    return None, None

# Stable stats to avoid overflow
def safe_stats(values: List[float]) -> Tuple[float, float, int]:
    n = 0; mean = 0.0; M2 = 0.0
    for v in values:
        if not isinstance(v, (int, float)) or not math.isfinite(v):
            continue
        if v > 1e12: v = 1e12
        if v < -1e12: v = -1e12
        n += 1
        delta = v - mean
        mean += delta / n
        M2 += delta * (v - mean)
    if n <= 1:
        return (mean, 0.0, n)
    var = M2 / (n - 1)
    if not math.isfinite(var) or var < 0:
        var = 0.0
    sd = math.sqrt(var) if var > 0 else 0.0
    return (mean, sd, n)

def plausibility_score(values: List[float], target_n: int) -> float:
    if not values:
        return -2.0
    finite = [v for v in values if isinstance(v, (int,float)) and math.isfinite(v)]
    n_total = len(values); n_finite = len(finite)
    frac_finite = n_finite / max(1, n_total)
    if frac_finite < 0.90:
        return frac_finite - 2.0
    mean, sd, _ = safe_stats(finite)
    var_term = math.log10(sd + 1e-6)
    length_ratio = n_total / max(1, target_n)
    length_penalty = -abs(math.log(length_ratio + 1e-9))
    mag_penalty = -0.1 if abs(mean) > 1e9 else 0.0
    return frac_finite + var_term + length_penalty + mag_penalty

# -------------------- decoders --------------------
def take_exact(vals: List[float], n: int) -> List[float]:
    return vals[:n] if len(vals) >= n else vals

def decode_float32(payload: bytes, n: int) -> List[float]:
    m = min(n*4, len(payload) - (len(payload) % 4))
    if m <= 0: return []
    vals = list(struct.unpack("<" + "f"*(m//4), payload[:m]))
    return take_exact(vals, n)

def decode_float64(payload: bytes, n: int) -> List[float]:
    m = min(n*8, len(payload) - (len(payload) % 8))
    if m <= 0: return []
    vals = list(struct.unpack("<" + "d"*(m//8), payload[:m]))
    return take_exact(vals, n)

def decode_int16_scaled(payload: bytes, n: int, scale: float) -> List[float]:
    m = min(n*2, len(payload) - (len(payload) % 2))
    if m <= 0: return []
    ints = struct.unpack("<" + "h"*(m//2), payload[:m])
    return take_exact([x*scale for x in ints], n)

def read_varint_leb128(buf: bytes, i: int) -> Tuple[int, int, bool]:
    shift = 0; result = 0
    while i < len(buf):
        b = buf[i]
        result |= (b & 0x7F) << shift
        i += 1
        if (b & 0x80) == 0:
            return result, i, True
        shift += 7
        if shift > 63:
            break
    return result, i, False

def zigzag_decode(u: int) -> int:
    return (u >> 1) ^ -(u & 1)

def decode_varint_delta(payload: bytes, n: int, scale: float) -> List[float]:
    out = []; i = 0; base = 0; steps = 0
    max_steps = min(len(payload)*2, n*4 + 1024)
    while len(out) < n and i < len(payload) and steps < max_steps:
        u, i, ok = read_varint_leb128(payload, i)
        if not ok: break
        d = zigzag_decode(u)
        if abs(d) > 1e9: break
        base += d
        if abs(base) > 1e12: break
        out.append(base * scale)
        steps += 1
    return out

# -------------------- main bulk logic --------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", required=True)
    ap.add_argument("--database", required=True)
    ap.add_argument("--driver", default="ODBC Driver 18 for SQL Server")
    auth = ap.add_mutually_exclusive_group(required=True)
    auth.add_argument("--trusted", action="store_true")
    auth.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--outdir", default="./out_analog")
    ap.add_argument("--max_tags", type=int, default=0, help="limit number of tags (0 = all)")
    ap.add_argument("--max_blocks", type=int, default=0, help="limit blocks per tag (0 = all)")
    ap.add_argument("--codec", choices=["auto","f32","f64","i16","varint"], default="auto", help="force a codec or auto-detect per block")
    ap.add_argument("--scale", type=float, default=float("nan"), help="override scale; default=CompPrecision")
    args = ap.parse_args()

    if not args.trusted and not args.password:
        ap.error("--password is required when using --username")

    cn = pyodbc.connect(build_conn_str(args), timeout=5)
    cur = cn.cursor()

    # list analog tags
    cur.execute("""
        SELECT ValueID, ValueName, ISNULL(CompPrecision,0) AS CompPrecision,
               ISNULL(CompressionMode,0) AS CompressionMode, ISNULL(VarType,0) AS VarType
        FROM dbo.Archive WITH (NOLOCK)
        WHERE ValueName LIKE N'%#Value' AND ISNULL(VarType,0) = 11
        ORDER BY ValueID
    """)
    tags = cur.fetchall()
    if args.max_tags > 0:
        tags = tags[:args.max_tags]

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)

    for valueid, valuename, comp_prec, comp_mode, var_type in tags:
        scale = (comp_prec if comp_prec not in (None, 0) else 1.0) if math.isnan(args.scale) else args.scale
        print(f"\nDecoding {valuename} (ValueID={valueid}) | CompPrecision={comp_prec} scale={scale} mode={comp_mode} vt={var_type}")
        fout = outdir / f"{safe_name(valuename)}.csv"
        w = csv.writer(open(fout, "w", newline="", encoding="utf-8")); w.writerow(["timestamp","value"])

        # get blocks
        if args.max_blocks > 0:
            cur.execute("""
                SELECT TOP (?) Timebegin, Timeend, BinValues
                FROM dbo.TagCompressed WITH (NOLOCK)
                WHERE ValueID = ?
                ORDER BY Timebegin
            """, args.max_blocks, valueid)
        else:
            cur.execute("""
                SELECT Timebegin, Timeend, BinValues
                FROM dbo.TagCompressed WITH (NOLOCK)
                WHERE ValueID = ?
                ORDER BY Timebegin
            """, valueid)
        blocks = cur.fetchall()
        total_written = 0

        for tb, te, blob in blocks:
            b = bytes(blob)
            off, serial = find_excel_serial_double(b)
            if off is None:
                # Fallback: infer period from payload length with multiple codecs
                total_ms = int((te - tb).total_seconds() * 1000)
                best = None  # (score, name, values, inferred_period, skip)
                HEADER_GUESS_LIMIT = 12
                for skip in range(0, HEADER_GUESS_LIMIT):
                    payload = b[skip:]
                    cands = [
                        ("float32", decode_float32(payload, len(payload)//4)),
                        ("float64", decode_float64(payload, len(payload)//8)),
                        ("int16*scale", decode_int16_scaled(payload, len(payload)//2, scale)),
                        ("varint_delta*scale", decode_varint_delta(payload, 10**7, scale)),
                    ]
                    for name, vals in cands:
                        n = len(vals)
                        if n <= 0:
                            continue
                        inferred = max(1, round(total_ms / max(1, n)))
                        if 50 <= inferred <= 60000:
                            score = plausibility_score(vals[:min(n, 10000)], n)
                            if best is None or score > best[0]:
                                best = (score, name, vals, inferred, skip)
                if not best:
                    print(f"  [skip] no header + no plausible fallback for block {tb}..{te}")
                    continue
                score, picked_name, picked_vals, period_ms, skip = best
                # write rows with inferred period
                t = tb; wrote = 0
                for v in picked_vals:
                    if t >= te: break
                    try:
                        vv = float(v)
                    except Exception:
                        vv = float('nan')
                    w.writerow([t.isoformat(sep=" ", timespec="milliseconds"), f"{vv:.6f}"])
                    t = t + dt.timedelta(milliseconds=period_ms)
                    wrote += 1
                total_written += wrote
                print(f"  [fallback] {tb}..{te} decoder={picked_name} skip={skip} inferred_period_ms={period_ms} -> wrote {wrote}")
                continue
            period_off = off + 8
            if period_off + 4 > len(b):
                print(f"  [skip] truncated header for block starting {tb}")
                continue
            period_ms = struct.unpack_from("<I", b, period_off)[0]
            header_end = period_off + 4

            total_ms = int((te - tb).total_seconds() * 1000)
            exp_n = max(total_ms // max(1, period_ms), 0)

            picked_name = None; picked_vals = None
            if args.codec != "auto":
                payload = b[header_end:]
                if args.codec == "f32":
                    picked_name, picked_vals = "float32", decode_float32(payload, exp_n)
                elif args.codec == "f64":
                    picked_name, picked_vals = "float64", decode_float64(payload, exp_n)
                elif args.codec == "i16":
                    picked_name, picked_vals = "int16*scale", decode_int16_scaled(payload, exp_n, scale)
                elif args.codec == "varint":
                    picked_name, picked_vals = "varint_delta*scale", decode_varint_delta(payload, exp_n, scale)
            else:
                # auto: try decoders with small header-extra skips (0..8)
                best = None
                for skip in range(0, 9):
                    payload = b[header_end+skip:]
                    cands = [
                        ("float32", decode_float32(payload, exp_n)),
                        ("float64", decode_float64(payload, exp_n)),
                        ("int16*scale", decode_int16_scaled(payload, exp_n, scale)),
                        ("varint_delta*scale", decode_varint_delta(payload, exp_n, scale)),
                    ]
                    for name, vals in cands:
                        score = plausibility_score(vals, exp_n)
                        if best is None or score > best[0]:
                            best = (score, name, vals, skip)
                if best and best[2]:
                    _, picked_name, picked_vals, skip = best
                else:
                    print(f"  [skip] no decoder matched for block {tb}..{te}")
                    continue

            # write rows
            t = tb; wrote = 0
            for v in picked_vals:
                if t >= te: break
                try:
                    vv = float(v)
                except Exception:
                    vv = float('nan')
                w.writerow([t.isoformat(sep=" ", timespec="milliseconds"), f"{vv:.6f}"])
                t = t + dt.timedelta(milliseconds=period_ms)
                wrote += 1
            total_written += wrote
            print(f"  [{tb}..{te}] period_ms={period_ms} exp={exp_n} decoder={picked_name} -> wrote {wrote}")

        print(f"  → total rows written: {total_written} to {fout}")

    print("\nDone.")
if __name__ == "__main__":
    main()
