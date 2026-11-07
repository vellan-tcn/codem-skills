#!/usr/bin/env python3
"""
Heuristic analog decoder for WinCC-like TagCompressed '#Value' blocks.
- Robust scoring to avoid OverflowError from extreme decoded values.
- Guards in varint delta decoder to avoid runaway growth on wrong codec.

Usage:
  python decode_tagcompressed_analog.py \
    --server 127.0.0.1,1433 --database YourDB \
    --username analytics_user --password "YourStrong!Passw0rd" \
    --valueid 2 --output tag_2_analog.csv --max_blocks 2 --debug
"""
import argparse, csv, datetime as dt, math, struct
from typing import List, Tuple, Optional

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

def find_excel_serial_double(b: bytes, search_limit=256):
    for i in range(0, min(len(b)-8, search_limit)):
        d = struct.unpack_from("<d", b, i)[0]
        if 35000.0 <= d <= 55000.0:
            return i, d
    return None, None

# ---- Robust plausibility scoring ----
def safe_stats(values: List[float]) -> Tuple[float, float, int]:
    """Welford's online algorithm with clipping; returns (mean, sd, n_finite)."""
    n = 0
    mean = 0.0
    M2 = 0.0
    for v in values:
        if not isinstance(v, (int, float)) or not math.isfinite(v):
            continue
        # clip extremes to prevent overflow
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
    """Higher is better. Penalize NaNs/inf, zero variance, gross length mismatch."""
    if not values:
        return -2.0
    finite = [v for v in values if isinstance(v, (int,float)) and math.isfinite(v)]
    n_total = len(values)
    n_finite = len(finite)
    frac_finite = n_finite / max(1, n_total)
    if frac_finite < 0.90:
        return frac_finite - 2.0
    mean, sd, n_used = safe_stats(finite)
    # variance term
    var_term = math.log10(sd + 1e-6)  # bounded
    # length term
    length_ratio = n_total / max(1, target_n)
    length_penalty = -abs(math.log(length_ratio + 1e-9))  # 0 if equal, negative otherwise
    # sanity: penalize absurd average magnitude
    mag_penalty = -0.1 if abs(mean) > 1e9 else 0.0
    return frac_finite + var_term + length_penalty + mag_penalty

# ---- Candidate decoders ----
def take_exact(vals: List[float], n: int) -> List[float]:
    if len(vals) >= n:
        return vals[:n]
    return vals

def decode_float32(payload: bytes, n: int) -> List[float]:
    m = min(n*4, len(payload) - (len(payload) % 4))
    if m <= 0:
        return []
    vals = list(struct.unpack("<" + "f"*(m//4), payload[:m]))
    return take_exact(vals, n)

def decode_float64(payload: bytes, n: int) -> List[float]:
    m = min(n*8, len(payload) - (len(payload) % 8))
    if m <= 0:
        return []
    vals = list(struct.unpack("<" + "d"*(m//8), payload[:m]))
    return take_exact(vals, n)

def decode_int16_scaled(payload: bytes, n: int, scale: float) -> List[float]:
    m = min(n*2, len(payload) - (len(payload) % 2))
    if m <= 0:
        return []
    ints = struct.unpack("<" + "h"*(m//2), payload[:m])
    return take_exact([x*scale for x in ints], n)

def read_varint_leb128(buf: bytes, i: int) -> Tuple[int, int, bool]:
    shift = 0
    result = 0
    while i < len(buf):
        b = buf[i]
        result |= (b & 0x7F) << shift
        i += 1
        if (b & 0x80) == 0:
            return result, i, True
        shift += 7
        if shift > 63:
            break
    return result, i, False  # failed

def zigzag_decode(u: int) -> int:
    return (u >> 1) ^ -(u & 1)

def decode_varint_delta(payload: bytes, n: int, scale: float) -> List[float]:
    out = []
    i = 0
    base = 0
    steps = 0
    max_steps = min(len(payload)*2, n*4 + 1024)  # guard against runaway
    while len(out) < n and i < len(payload) and steps < max_steps:
        u, i, ok = read_varint_leb128(payload, i)
        if not ok:
            break
        d = zigzag_decode(u)
        # guard against absurd deltas
        if abs(d) > 1e9:
            break
        base += d
        # guard against absurd base
        if abs(base) > 1e12:
            break
        out.append(base * scale)
        steps += 1
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", required=True, help="host,port (e.g., 127.0.0.1,1433)")
    ap.add_argument("--database", required=True)
    ap.add_argument("--driver", default="ODBC Driver 18 for SQL Server")
    auth = ap.add_mutually_exclusive_group(required=True)
    auth.add_argument("--trusted", action="store_true", help="use Windows Integrated Auth")
    auth.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--valueid", type=int, required=True, help="ValueID of the analog tag (#Value)")
    ap.add_argument("--output", default="analog_export.csv")
    ap.add_argument("--max_blocks", type=int, default=2, help="limit number of blocks to decode (0=all)")
    ap.add_argument("--scale", type=float, default=float("nan"), help="override scale; default = CompPrecision from Archive")
    ap.add_argument("--debug", action="store_true", help="print candidate diagnostics")
    args = ap.parse_args()

    if not args.trusted and not args.password:
        ap.error("--password is required when using --username")

    cn = pyodbc.connect(build_conn_str(args), timeout=5)
    cur = cn.cursor()

    cur.execute("SELECT ValueName, ISNULL(CompPrecision, 0), ISNULL(CompressionMode, 0), ISNULL(VarType, 0) FROM dbo.Archive WHERE ValueID = ?", args.valueid)
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"ValueID {args.valueid} not found in dbo.Archive")
    value_name, comp_prec, comp_mode, var_type = row
    scale = (comp_prec if comp_prec not in (None, 0) else 1.0) if math.isnan(args.scale) else args.scale
    print(f"Tag: {value_name} | CompPrecision={comp_prec} | CompressionMode={comp_mode} | VarType={var_type} | scale={scale}")

    if args.max_blocks > 0:
        cur.execute("""
            SELECT TOP (?) Timebegin, Timeend, BinValues
            FROM dbo.TagCompressed WITH (NOLOCK)
            WHERE ValueID = ?
            ORDER BY Timebegin
        """, args.max_blocks, args.valueid)
    else:
        cur.execute("""
            SELECT Timebegin, Timeend, BinValues
            FROM dbo.TagCompressed WITH (NOLOCK)
            WHERE ValueID = ?
            ORDER BY Timebegin
        """, args.valueid)
    blocks = cur.fetchall()
    if not blocks:
        print("No TagCompressed rows for this ValueID."); return

    w = csv.writer(open(args.output, "w", newline="", encoding="utf-8"))
    w.writerow(["timestamp","value"])

    for tb, te, blob in blocks:
        b = bytes(blob)
        off, serial = find_excel_serial_double(b)
        if off is None:
            # Fallback: try to infer from payload length using multiple codecs
            total_ms = int((te - tb).total_seconds() * 1000)
            best = None  # (score, name, values, inferred_period, skip)
            HEADER_GUESS_LIMIT = 12  # try skipping a few bytes of control
            for skip in range(0, HEADER_GUESS_LIMIT):
                payload = b[skip:]
                # candidate decodings without knowing period
                cands = [
                    ("float32", decode_float32(payload, len(payload)//4)),
                    ("float64", decode_float64(payload, len(payload)//8)),
                    ("int16*scale", decode_int16_scaled(payload, len(payload)//2, scale if scale else 1.0)),
                    ("varint_delta*scale", decode_varint_delta(payload, 10**7, scale if scale else 1.0)),  # large cap
                ]
                for name, vals in cands:
                    n = len(vals)
                    if n <= 0:
                        continue
                    inferred = max(1, round(total_ms / max(1, n)))
                    # Accept plausible periods (50 ms .. 60 s)
                    if 50 <= inferred <= 60000:
                        try:
                            sc = plausibility_score(vals[:min(n, 10000)], n)  # score on subset if huge
                        except Exception:
                            sc = -3.0
                        if best is None or sc > best[0]:
                            best = (sc, name, vals, inferred, skip)
            if not best:
                print(f"[skip] no header + no plausible fallback for block starting {tb}")
                continue
            score, name, values, period_ms, skip = best
            print(f"[fallback] {tb}..{te} decoder={name} skip={skip} inferred_period_ms={period_ms} len(values)={len(values)} score={round(score,3)}")
            # write rows using inferred period
            t = tb
            wrote = 0
            for v in values:
                if t >= te: break
                try:
                    vv = float(v)
                except Exception:
                    vv = float('nan')
                w.writerow([t.isoformat(sep=" ", timespec="milliseconds"), f"{vv:.6f}"])
                t = t + dt.timedelta(milliseconds=period_ms)
                wrote += 1
            continue
        period_off = off + 8
        if period_off + 4 > len(b):
            print(f"[skip] truncated header for block starting {tb}")
            continue
        period_ms = struct.unpack_from("<I", b, period_off)[0]
        header_end = period_off + 4

        total_ms = int((te - tb).total_seconds() * 1000)
        exp_n = max(total_ms // max(1, period_ms), 0)

        best = None  # (score, name, values, skip)
        for skip in range(0, 9):
            payload = b[header_end+skip:]
            candidates = [
                ("float32", decode_float32(payload, exp_n)),
                ("float64", decode_float64(payload, exp_n)),
                ("int16*scale", decode_int16_scaled(payload, exp_n, scale if scale else 1.0)),
                ("varint_delta*scale", decode_varint_delta(payload, exp_n, scale if scale else 1.0)),
            ]
            for name, vals in candidates:
                try:
                    score = plausibility_score(vals, exp_n)
                except Exception as e:
                    score = -3.0  # if anything blew up, treat as very bad
                if args.debug:
                    sample = vals[:3]
                    print(f"  skip={skip:<2} cand={name:<18} n={len(vals):<6} score={round(score,3)} sample={sample}")
                if best is None or score > best[0]:
                    best = (score, name, vals, skip)

        if not best or not best[2]:
            print(f"[skip] no decoder matched for block {tb}..{te}")
            continue

        score, name, values, skip = best
        print(f"[{tb}..{te}] period_ms={period_ms} exp={exp_n} decoder={name} skip={skip} score={round(score,3)} len(values)={len(values)}")

        t = tb
        for v in values:
            if t >= te: break
            # write bounded float with 6 decimals
            try:
                vv = float(v)
            except Exception:
                vv = float('nan')
            w.writerow([t.isoformat(sep=" ", timespec="milliseconds"), f"{vv:.6f}"])
            t = t + dt.timedelta(milliseconds=period_ms)

    print("Done. CSV:", args.output)

if __name__ == "__main__":
    main()
