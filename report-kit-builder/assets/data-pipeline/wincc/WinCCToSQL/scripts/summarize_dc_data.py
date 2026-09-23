#!/usr/bin/env python3
"""
Summarize exported digital (_DC) tag CSVs (from out_dc/) into tidy analytics outputs.

Inputs
------
- A directory of CSVs produced by export_dc_tags_bulk.py (one file per tag):
  Each CSV has columns: timestamp,value
- A tag map file (CSV or JSON) with columns/keys: ValueID, ValueName (optional)

Outputs
-------
- dc_combined.parquet (and/or CSV): long-format table: [timestamp, tag, value]
- dc_percent_on_<freq>.csv: pivot table by time (rows) x tag (cols) with %ON
- dc_daily_uptime.csv: per-tag daily uptime (hours), transitions, sample counts
- dc_on_events.csv: per-tag ON intervals (start_ts, end_ts, duration_s)
- dc_gap_report.csv: detected data gaps by tag (start, end, gap_seconds)

Usage
-----
python summarize_dc_data.py \
  --input ./out_dc \
  --tag_map tag_map.csv \
  --freq 1min \
  --tz Africa/Casablanca \
  --outdir ./dc_summary

Notes
-----
- If you don't have a tag_map, the script derives tag names from file names.
- Timestamps are parsed as naive local time by default; use --tz to localize.
- For daily uptime, we compute durations using the delta to next timestamp
  (more robust than assuming 1-second cadence).
"""
import argparse
import json
import os
import re
from pathlib import Path
from typing import Optional, Dict, List

import pandas as pd

def safe_name(s: str) -> str:
    return re.sub(r"[^\w.\-]+", "_", s).strip("_")

def load_tag_map(path: Optional[str]) -> pd.DataFrame:
    if not path:
        return pd.DataFrame(columns=["ValueID","ValueName"])
    p = Path(path)
    if not p.exists():
        print(f"[warn] tag_map not found at {p}; continuing without it")
        return pd.DataFrame(columns=["ValueID","ValueName"])
    if p.suffix.lower() == ".json":
        data = json.loads(Path(p).read_text(encoding="utf-8"))
        # handle dict or list-of-dicts
        if isinstance(data, dict):
            # expect {ValueID: ValueName}
            items = [{"ValueID": int(k), "ValueName": v} for k, v in data.items()]
            return pd.DataFrame(items)
        else:
            return pd.DataFrame(data)
    else:
        return pd.read_csv(p)

def read_one_csv(path: Path, tz: Optional[str]) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "timestamp" not in df.columns or "value" not in df.columns:
        raise ValueError(f"{path} missing required columns 'timestamp' and 'value'")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"])
    if tz:
        # Treat as naive local then localize to tz (no conversion)
        df["timestamp"] = df["timestamp"].dt.tz_localize(tz, nonexistent="shift_forward", ambiguous="NaT")
    tag = path.stem  # filename without .csv
    df["tag"] = tag
    # value to int (0/1) if possible
    if df["value"].dtype != "int64":
        df["value"] = pd.to_numeric(df["value"], errors="coerce").fillna(0).astype(int)
    return df[["timestamp","tag","value"]]

def compute_on_intervals(df_tag: pd.DataFrame) -> pd.DataFrame:
    """Return ON intervals for a single tag using run-length on value changes."""
    s = df_tag.sort_values("timestamp").reset_index(drop=True)
    if s.empty:
        return pd.DataFrame(columns=["tag","start_ts","end_ts","duration_s"])
    # Identify changes
    change = s["value"].ne(s["value"].shift(1)).cumsum()
    groups = s.groupby(change, as_index=False)
    rows = []
    for _, g in groups:
        v = int(g["value"].iloc[0])
        start = g["timestamp"].iloc[0]
        # duration until next group's first timestamp (or estimate from median delta for the last run)
        end = g["timestamp"].shift(-1).iloc[-1]  # last row has NaT here
        if pd.isna(end):
            # Estimate using median delta
            deltas = s["timestamp"].diff().dropna()
            if len(deltas) == 0:
                end = start
            else:
                end = g["timestamp"].iloc[-1] + deltas.median()
        duration = (end - start).total_seconds()
        if v == 1 and duration > 0:
            rows.append((s["tag"].iat[0], start, end, float(duration)))
    return pd.DataFrame(rows, columns=["tag","start_ts","end_ts","duration_s"])

def detect_gaps(df_tag: pd.DataFrame, factor: float = 2.5) -> pd.DataFrame:
    """Detect gaps where delta > factor * median_delta."""
    s = df_tag.sort_values("timestamp").reset_index(drop=True)
    if len(s) < 2:
        return pd.DataFrame(columns=["tag","gap_start","gap_end","gap_seconds"])
    deltas = s["timestamp"].diff().dropna()
    med = deltas.median()
    if pd.isna(med) or med.value == 0:
        threshold = pd.Timedelta(seconds=2)  # default
    else:
        threshold = med * factor
    gaps = deltas[deltas > threshold]
    out = []
    for idx, delta in gaps.items():
        gap_start = s["timestamp"].iloc[idx-1]
        gap_end   = s["timestamp"].iloc[idx]
        out.append((s["tag"].iat[0], gap_start, gap_end, float((gap_end-gap_start).total_seconds())))
    return pd.DataFrame(out, columns=["tag","gap_start","gap_end","gap_seconds"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="./out_dc", help="directory of per-tag CSV files")
    ap.add_argument("--tag_map", default="", help="tag_map.csv or .json (optional)")
    ap.add_argument("--outdir", default="./dc_summary")
    ap.add_argument("--freq", default="1min", help="resample freq for %ON (e.g., 1min, 5min, 15min)")
    ap.add_argument("--tz", default="", help="IANA tz, e.g., Africa/Casablanca (optional)")
    args = ap.parse_args()

    in_dir = Path(args.input)
    out_dir = Path(args.outdir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load mapping (optional, for reference/reporting)
    tag_map = load_tag_map(args.tag_map)
    if not tag_map.empty:
        tag_map["SafeName"] = tag_map["ValueName"].map(safe_name)

    # Read and combine all CSVs
    csv_files = sorted([p for p in in_dir.glob("*.csv")])
    if not csv_files:
        raise SystemExit(f"No CSVs found in {in_dir}")

    frames = []
    for p in csv_files:
        try:
            frames.append(read_one_csv(p, tz=args.tz if args.tz else None))
        except Exception as e:
            print(f"[warn] skipping {p}: {e}")
    if not frames:
        raise SystemExit("No valid CSVs were loaded.")
    df = pd.concat(frames, ignore_index=True)
    df = df.sort_values(["tag","timestamp"]).reset_index(drop=True)

    # Save combined
    combined_csv = out_dir / "dc_combined.csv"
    df.to_csv(combined_csv, index=False)
    try:
        import pyarrow as pa, pyarrow.parquet as pq
        pq.write_table(pa.Table.from_pandas(df), out_dir / "dc_combined.parquet")
    except Exception:
        pass

    # %ON by freq (pivot wide)
    # For tz-aware, resample requires index
    g = df.set_index("timestamp").groupby("tag")["value"]
    pct = g.resample(args.freq).mean().mul(100.0).unstack("tag").sort_index()
    pct.to_csv(out_dir / f"dc_percent_on_{args.freq}.csv")
    try:
        import pyarrow as pa, pyarrow.parquet as pq
        pq.write_table(pa.Table.from_pandas(pct.reset_index()), out_dir / f"dc_percent_on_{args.freq}.parquet")
    except Exception:
        pass

    # Daily uptime (hours) + transitions + samples
    daily_rows = []
    events_all = []
    gaps_all = []
    for tag, dft in df.groupby("tag"):
        # Durations by diff-to-next
        s = dft.sort_values("timestamp").reset_index(drop=True)
        s["next_ts"] = s["timestamp"].shift(-1)
        # Estimate last duration per tag using median delta
        med = s["timestamp"].diff().median() or pd.Timedelta(seconds=1)
        s.loc[s["next_ts"].isna(), "next_ts"] = s["timestamp"] + med
        s["dur_s"] = (s["next_ts"] - s["timestamp"]).dt.total_seconds().clip(lower=0)

        daily = (s.assign(date=s["timestamp"].dt.floor("D"))
                   .groupby("date")
                   .agg(uptime_s=("dur_s", lambda x: float(x[s.loc[x.index, 'value'] == 1].sum())),
                        transitions=("value", lambda x: int((x != x.shift(1)).sum())),
                        samples=("value", "size")))
        daily["tag"] = tag
        daily["uptime_h"] = daily["uptime_s"] / 3600.0
        daily_rows.append(daily.reset_index())

        ev = compute_on_intervals(dft)
        if not ev.empty:
            events_all.append(ev)

        gaps = detect_gaps(dft)
        if not gaps.empty:
            gaps_all.append(gaps)

    daily_df = pd.concat(daily_rows, ignore_index=True) if daily_rows else pd.DataFrame()
    if not daily_df.empty:
        daily_df = daily_df[["tag","date","uptime_h","transitions","samples"]].sort_values(["tag","date"])
        daily_df.to_csv(out_dir / "dc_daily_uptime.csv", index=False)

    if events_all:
        events_df = pd.concat(events_all, ignore_index=True)
        events_df.to_csv(out_dir / "dc_on_events.csv", index=False)

    if gaps_all:
        gaps_df = pd.concat(gaps_all, ignore_index=True)
        gaps_df.to_csv(out_dir / "dc_gap_report.csv", index=False)

    # Simple coverage report
    coverage = (df.groupby("tag")
                  .agg(start=("timestamp","min"),
                       end=("timestamp","max"),
                       rows=("timestamp","size"))
                  .sort_values("rows", ascending=False))
    coverage.to_csv(out_dir / "dc_coverage_report.csv")

    print("Wrote:")
    print(" -", combined_csv)
    print(" -", out_dir / f"dc_percent_on_{args.freq}.csv")
    if not daily_df.empty: print(" -", out_dir / "dc_daily_uptime.csv")
    if events_all: print(" -", out_dir / "dc_on_events.csv")
    if gaps_all: print(" -", out_dir / "dc_gap_report.csv")
    print(" -", out_dir / "dc_coverage_report.csv")

if __name__ == "__main__":
    main()
