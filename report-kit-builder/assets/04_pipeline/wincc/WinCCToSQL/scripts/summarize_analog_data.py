#!/usr/bin/env python3
"""
Summarize exported analog '#Value' CSVs (from out_analog/) into tidy analytics.

Inputs
------
- A directory of CSVs produced by export_analog_tags_bulk.py (one file per tag):
  Each CSV has columns: timestamp,value
- Optional tag map CSV/JSON: columns/keys ValueID, ValueName (not required if filenames already carry names)

Outputs (written to --outdir, default ./analog_summary)
-------
- analog_combined.csv (+ .parquet if pyarrow installed): long table [timestamp, tag, value]
- analog_mean_<freq>.csv: pivot of mean by time (rows) × tag (cols)
- analog_min_<freq>.csv, analog_max_<freq>.csv, analog_std_<freq>.csv
- analog_daily_stats.csv: per-tag per-day min/max/mean/std & sample counts
- analog_gap_report.csv: data gaps per tag
- analog_coverage_report.csv: first/last timestamp & row counts per tag

Usage
-----
python summarize_analog_data.py \
  --input ./out_analog \
  --freq 1min \
  --tz Africa/Casablanca \
  --outdir ./analog_summary
"""
import argparse, json, re
from pathlib import Path
import pandas as pd

def safe_name(s: str) -> str:
    return re.sub(r"[^\w.\-]+","_", s).strip("_")

def load_tag_map(path: str):
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        print(f"[warn] tag_map not found at {p}; continuing without it")
        return None
    if p.suffix.lower() == ".json":
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return pd.DataFrame([{"ValueID": int(k), "ValueName": v} for k, v in data.items()])
        return pd.DataFrame(data)
    return pd.read_csv(p)

def read_analog_csv(path: Path, tz: str|None) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "timestamp" not in df.columns or "value" not in df.columns:
        raise ValueError(f"{path} missing columns 'timestamp' and 'value'")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"])
    if tz:
        df["timestamp"] = df["timestamp"].dt.tz_localize(tz, nonexistent="shift_forward", ambiguous="NaT")
    df["tag"] = path.stem
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df[["timestamp","tag","value"]]

def detect_gaps(df_tag: pd.DataFrame, factor: float = 3.0) -> pd.DataFrame:
    s = df_tag.sort_values("timestamp").reset_index(drop=True)
    if len(s) < 2:
        return pd.DataFrame(columns=["tag","gap_start","gap_end","gap_seconds"])
    deltas = s["timestamp"].diff().dropna()
    med = deltas.median()
    if pd.isna(med) or med == pd.Timedelta(0):
        threshold = pd.Timedelta(seconds=2)
    else:
        threshold = med * factor
    big = deltas[deltas > threshold]
    rows = []
    for idx, _ in big.items():
        gap_start = s["timestamp"].iloc[idx-1]
        gap_end   = s["timestamp"].iloc[idx]
        rows.append((s["tag"].iat[0], gap_start, gap_end, float((gap_end-gap_start).total_seconds())))
    return pd.DataFrame(rows, columns=["tag","gap_start","gap_end","gap_seconds"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="./out_analog")
    ap.add_argument("--tag_map", default="")
    ap.add_argument("--outdir", default="./analog_summary")
    ap.add_argument("--freq", default="1min")
    ap.add_argument("--tz", default="")
    args = ap.parse_args()

    in_dir = Path(args.input)
    out_dir = Path(args.outdir); out_dir.mkdir(parents=True, exist_ok=True)

    tag_map = load_tag_map(args.tag_map)

    files = sorted(in_dir.glob("*.csv"))
    if not files:
        raise SystemExit(f"No CSVs found in {in_dir}")

    frames = []
    for f in files:
        try:
            frames.append(read_analog_csv(f, tz=args.tz or None))
        except Exception as e:
            print(f"[warn] skipping {f}: {e}")
    if not frames:
        raise SystemExit("No valid CSVs read.")
    df = pd.concat(frames, ignore_index=True).sort_values(["tag","timestamp"]).reset_index(drop=True)

    # Save combined
    combined_csv = out_dir / "analog_combined.csv"
    df.to_csv(combined_csv, index=False)
    try:
        import pyarrow as pa, pyarrow.parquet as pq
        pq.write_table(pa.Table.from_pandas(df), out_dir / "analog_combined.parquet")
    except Exception:
        pass

    # Resampled stats by freq
    g = df.set_index("timestamp").groupby("tag")["value"]
    mean = g.resample(args.freq).mean().unstack("tag").sort_index()
    vmin = g.resample(args.freq).min().unstack("tag").sort_index()
    vmax = g.resample(args.freq).max().unstack("tag").sort_index()
    vstd = g.resample(args.freq).std().unstack("tag").sort_index()

    mean.to_csv(out_dir / f"analog_mean_{args.freq}.csv")
    vmin.to_csv(out_dir / f"analog_min_{args.freq}.csv")
    vmax.to_csv(out_dir / f"analog_max_{args.freq}.csv")
    vstd.to_csv(out_dir / f"analog_std_{args.freq}.csv")
    try:
        import pyarrow as pa, pyarrow.parquet as pq
        pq.write_table(pa.Table.from_pandas(mean.reset_index()), out_dir / f"analog_mean_{args.freq}.parquet")
    except Exception:
        pass

    # Daily stats
    daily = (df.assign(date=df["timestamp"].dt.floor("D"))
               .groupby(["tag","date"])["value"]
               .agg(min="min", max="max", mean="mean", std="std", samples="size")
               .reset_index()
               .sort_values(["tag","date"]))
    daily.to_csv(out_dir / "analog_daily_stats.csv", index=False)

    # Gaps and coverage
    gaps = []
    for tag, dft in df.groupby("tag"):
        gr = detect_gaps(dft)
        if not gr.empty:
            gaps.append(gr)
    if gaps:
        pd.concat(gaps, ignore_index=True).to_csv(out_dir / "analog_gap_report.csv", index=False)

    coverage = (df.groupby("tag")
                  .agg(start=("timestamp","min"), end=("timestamp","max"), rows=("timestamp","size"))
                  .sort_values("rows", ascending=False))
    coverage.to_csv(out_dir / "analog_coverage_report.csv")

    print("Wrote:")
    print(" -", combined_csv)
    print(" -", out_dir / f"analog_mean_{args.freq}.csv")
    print(" -", out_dir / f"analog_min_{args.freq}.csv")
    print(" -", out_dir / f"analog_max_{args.freq}.csv")
    print(" -", out_dir / f"analog_std_{args.freq}.csv")
    print(" -", out_dir / "analog_daily_stats.csv")
    if gaps: print(" -", out_dir / "analog_gap_report.csv")
    print(" -", out_dir / "analog_coverage_report.csv")

if __name__ == "__main__":
    main()
