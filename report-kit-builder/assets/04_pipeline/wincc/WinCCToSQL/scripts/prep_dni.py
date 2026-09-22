#!/usr/bin/env python3
"""
Prepare DNIdata.csv for integration with plant analytics (Power BI or Python).

What it does
------------
1) Reads a DNI CSV with columns like:
   timestamp, DNI South WS.1, DNI North WS.1, DNI - Complete WS.1, DNI - PB MASEN.1
2) Normalizes station names and converts to both LONG and WIDE formats.
3) Localizes timestamps to a timezone (no conversion, just sets tz).
4) Resamples to a target frequency (default 1 minute).
5) Computes per-minute station baseline (median of OTHER stations) and relative drop %.
6) Detects drop events (drop_pct >= threshold for >= sustain minutes).

Outputs (to --outdir)
---------------------
- dni_long.csv    : [timestamp, station, dni]
- dni_wide.csv    : [timestamp, South, North, Complete, PB_MASEN, dni_avg_all]
- dni_events.csv  : [station, start_ts, end_ts, min_dni, base_dni, max_drop_pct]

Usage
-----
python prep_dni.py --input ./DNIdata.csv --tz Africa/Casablanca --freq 1min --outdir ./dni_summary

Notes
-----
- Drop detection defaults: threshold=20 (%), sustain=3 (minutes); tweak via CLI.
- Timestamps are parsed with pandas; set --tz to your local plant IANA tz.
- If your headers differ, use --rename to map them (see --help).
"""
import argparse, json
from pathlib import Path

import pandas as pd
import numpy as np

DEFAULT_MAP = {
  "DNI South WS.1": "South",
  "DNI North WS.1": "North",
  "DNI - Complete WS.1": "Complete",
  "DNI - PB MASEN.1": "PB_MASEN",
}

def parse_rename(s: str):
    if not s: return {}
    return json.loads(s)

def normalize(df: pd.DataFrame, rename_map: dict):
    use = {}
    for k,v in (rename_map or {}).items():
        if k in df.columns:
            use[k] = v
    for k,v in DEFAULT_MAP.items():
        if k in df.columns and k not in use:
            use[k] = v
    df = df.rename(columns=use)
    stations = list(use.values())
    return df, stations

def resample_long(df_long: pd.DataFrame, freq: str, tz: str|None):
    df_long = df_long.dropna(subset=["timestamp"])
    if tz:
        df_long["timestamp"] = df_long["timestamp"].dt.tz_localize(tz, nonexistent="shift_forward", ambiguous="NaT")
    rs = (df_long.set_index("timestamp")
                  .groupby("station")["dni"]
                  .resample(freq).mean()
                  .reset_index())
    return rs

def compute_baseline_and_drops(wide: pd.DataFrame, stations: list[str]):
    out = wide.copy()
    for s in stations:
        others = [x for x in stations if x != s]
        if others:
            out[f"{s}_baseline"] = out[others].median(axis=1, skipna=True)
            out[f"{s}_drop_pct"] = 100.0 * (out[f"{s}_baseline"] - out[s]) / out[f"{s}_baseline"]
        else:
            out[f"{s}_baseline"] = np.nan
            out[f"{s}_drop_pct"] = np.nan
    return out

def detect_events(wide_with_drops: pd.DataFrame, stations: list[str], threshold: float, sustain: int):
    rows = []
    for s in stations:
        col = f"{s}_drop_pct"
        if col not in wide_with_drops.columns: continue
        sig = wide_with_drops[["timestamp", s, f"{s}_baseline", col]].copy()
        cond = sig[col] >= threshold
        grp = (cond.ne(cond.shift()).cumsum())
        for g, frame in sig.groupby(grp):
            active = cond.loc[frame.index[0]]
            if not active: continue
            if len(frame) < sustain: continue
            start_ts = frame["timestamp"].iloc[0]
            end_ts   = frame["timestamp"].iloc[-1]
            min_dni = float(frame[s].min())
            base_dni = float(frame[f"{s}_baseline"].median())
            max_drop = float(frame[col].max())
            rows.append({"station": s, "start_ts": start_ts, "end_ts": end_ts,
                         "min_dni": min_dni, "base_dni": base_dni, "max_drop_pct": max_drop})
    return pd.DataFrame(rows)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="DNIdata.csv path")
    ap.add_argument("--outdir", default="./dni_summary")
    ap.add_argument("--freq", default="1min")
    ap.add_argument("--tz", default="")
    ap.add_argument("--threshold", type=float, default=20.0, help="drop threshold in % vs baseline")
    ap.add_argument("--sustain", type=int, default=3, help="min consecutive minutes to count as an event")
    ap.add_argument("--rename", default="", help='JSON mapping of original headers to station names')
    args = ap.parse_args()

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.input)
    if "timestamp" not in df.columns:
        raise SystemExit("Input must have a 'timestamp' column")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    df, stations = normalize(df, parse_rename(args.rename))
    if not stations:
        raise SystemExit("No recognizable DNI station columns found. Use --rename to map headers.")

    long = df.melt(id_vars=["timestamp"], value_vars=stations, var_name="station", value_name="dni")
    long = long.dropna(subset=["timestamp"])
    long["dni"] = pd.to_numeric(long["dni"], errors="coerce")

    rs_long = resample_long(long, args.freq, args.tz or None)

    wide = rs_long.pivot(index="timestamp", columns="station", values="dni").reset_index()
    wide["dni_avg_all"] = wide[stations].mean(axis=1, skipna=True)

    drops = compute_baseline_and_drops(wide, stations)
    events = detect_events(drops, stations, args.threshold, args.sustain)

    long_path  = outdir / "dni_long.csv"
    wide_path  = outdir / "dni_wide.csv"
    events_path = outdir / "dni_events.csv"
    rs_long.to_csv(long_path, index=False)
    wide.to_csv(wide_path, index=False)
    events.to_csv(events_path, index=False)

    print("Wrote:")
    print(" -", long_path)
    print(" -", wide_path)
    print(" -", events_path)

if __name__ == "__main__":
    main()
