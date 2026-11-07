#!/usr/bin/env python3
"""
Unified summarizer for digital (_DC) and analog (#Value) exports.

Inputs
------
- --dc_dir: directory of per-tag CSVs from export_dc_tags_bulk.py (timestamp,value; 0/1)
- --analog_dir: directory of per-tag CSVs from export_analog_tags_bulk.py (timestamp,value; float)
- --tag_map (optional): CSV or JSON with ValueID,ValueName (used for reference; filenames already carry names)
- --freq: resample frequency (e.g., 1min, 5min, 15min)
- --tz: IANA timezone to localize naive timestamps (e.g., Africa/Casablanca)

Outputs (to --outdir)
-------
- unified_combined.csv (+ .parquet if pyarrow available): long table [timestamp, tag, kind, value]
  * kind ∈ {"digital","analog"}, value is numeric (0/1 for digital, float for analog)
- digital_percent_on_<freq>.csv: wide pivot (time rows × tag cols) of %ON
- digital_transitions_<freq>.csv: wide pivot of transition counts per window
- analog_mean_<freq>.csv / analog_min_<freq>.csv / analog_max_<freq>.csv / analog_std_<freq>.csv
- unified_daily_summary.csv: per-tag daily stats (uptime for digital; min/max/mean/std for analog)
- unified_gap_report.csv: gaps detected for both kinds
- unified_coverage_report.csv: first/last timestamps & row counts

Usage
-----
python summarize_unified.py \
  --dc_dir ./out_dc --analog_dir ./out_analog \
  --freq 1min --tz Africa/Casablanca \
  --outdir ./unified_summary
"""
import argparse, json, re
from pathlib import Path
import pandas as pd

def safe_name(s: str) -> str:
    return re.sub(r"[^\w.\-]+","_", s).strip("_")

def load_tag_map(path: str|None):
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

def read_dc_csv(path: Path, tz: str|None) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "timestamp" not in df or "value" not in df:
        raise ValueError(f"{path} missing timestamp/value")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).copy()
    if tz:
        df["timestamp"] = df["timestamp"].dt.tz_localize(tz, nonexistent="shift_forward", ambiguous="NaT")
    df["tag"] = path.stem
    df["value"] = pd.to_numeric(df["value"], errors="coerce").fillna(0).astype(int)
    df["kind"] = "digital"
    return df[["timestamp","tag","kind","value"]]

def read_analog_csv(path: Path, tz: str|None) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "timestamp" not in df or "value" not in df:
        raise ValueError(f"{path} missing timestamp/value")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp"]).copy()
    if tz:
        df["timestamp"] = df["timestamp"].dt.tz_localize(tz, nonexistent="shift_forward", ambiguous="NaT")
    df["tag"] = path.stem
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df["kind"] = "analog"
    return df[["timestamp","tag","kind","value"]]

def detect_gaps(df_tag: pd.DataFrame, factor: float = 3.0) -> pd.DataFrame:
    s = df_tag.sort_values("timestamp").reset_index(drop=True)
    if len(s) < 2:
        return pd.DataFrame(columns=["tag","kind","gap_start","gap_end","gap_seconds"])
    deltas = s["timestamp"].diff().dropna()
    med = deltas.median()
    threshold = pd.Timedelta(seconds=2) if pd.isna(med) or med == pd.Timedelta(0) else med * factor
    big = deltas[deltas > threshold]
    rows = []
    for idx, _ in big.items():
        gap_start = s["timestamp"].iloc[idx-1]
        gap_end   = s["timestamp"].iloc[idx]
        rows.append((s["tag"].iat[0], s["kind"].iat[0], gap_start, gap_end, float((gap_end-gap_start).total_seconds())))
    return pd.DataFrame(rows, columns=["tag","kind","gap_start","gap_end","gap_seconds"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dc_dir", default="./out_dc")
    ap.add_argument("--analog_dir", default="./out_analog")
    ap.add_argument("--tag_map", default="")
    ap.add_argument("--outdir", default="./unified_summary")
    ap.add_argument("--freq", default="1min")
    ap.add_argument("--tz", default="")
    args = ap.parse_args()

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    tag_map = load_tag_map(args.tag_map)

    frames = []
    if args.dc_dir and Path(args.dc_dir).exists():
        for p in sorted(Path(args.dc_dir).glob("*.csv")):
            try:
                frames.append(read_dc_csv(p, tz=args.tz or None))
            except Exception as e:
                print(f"[warn] skipping digital {p}: {e}")
    if args.analog_dir and Path(args.analog_dir).exists():
        for p in sorted(Path(args.analog_dir).glob("*.csv")):
            try:
                frames.append(read_analog_csv(p, tz=args.tz or None))
            except Exception as e:
                print(f"[warn] skipping analog {p}: {e}")

    if not frames:
        raise SystemExit("No CSVs found in provided directories.")

    df = pd.concat(frames, ignore_index=True).sort_values(["tag","timestamp"]).reset_index(drop=True)

    # Save combined
    combined_csv = outdir / "unified_combined.csv"
    df.to_csv(combined_csv, index=False)
    try:
        import pyarrow as pa, pyarrow.parquet as pq
        pq.write_table(pa.Table.from_pandas(df), outdir / "unified_combined.parquet")
    except Exception:
        pass

    # DIGITAL summaries
    dfd = df[df["kind"]=="digital"].copy()
    if not dfd.empty:
        g = dfd.set_index("timestamp").groupby("tag")["value"]
        pct = g.resample(args.freq).mean().mul(100.0).unstack("tag").sort_index()
        pct.to_csv(outdir / f"digital_percent_on_{args.freq}.csv")
        try:
            import pyarrow as pa, pyarrow.parquet as pq
            pq.write_table(pa.Table.from_pandas(pct.reset_index()), outdir / f"digital_percent_on_{args.freq}.parquet")
        except Exception:
            pass

        # Transitions per window: count changes then bucket by freq
        trans_rows = []
        for tag, dft in dfd.groupby("tag"):
            s = dft.sort_values("timestamp").reset_index(drop=True)
            s["trans"] = (s["value"] != s["value"].shift(1)).astype(int)
            s["bucket"] = s["timestamp"].dt.floor(args.freq)
            agg = s.groupby("bucket")["trans"].sum().rename(tag)
            trans_rows.append(agg)
        if trans_rows:
            trans = pd.concat(trans_rows, axis=1).sort_index()
            trans.to_csv(outdir / f"digital_transitions_{args.freq}.csv")

    # ANALOG summaries
    dfa = df[df["kind"]=="analog"].copy()
    if not dfa.empty:
        g = dfa.set_index("timestamp").groupby("tag")["value"]
        mean = g.resample(args.freq).mean().unstack("tag").sort_index()
        vmin = g.resample(args.freq).min().unstack("tag").sort_index()
        vmax = g.resample(args.freq).max().unstack("tag").sort_index()
        vstd = g.resample(args.freq).std().unstack("tag").sort_index()
        mean.to_csv(outdir / f"analog_mean_{args.freq}.csv")
        vmin.to_csv(outdir / f"analog_min_{args.freq}.csv")
        vmax.to_csv(outdir / f"analog_max_{args.freq}.csv")
        vstd.to_csv(outdir / f"analog_std_{args.freq}.csv")

    # Daily summary (kind-specific metrics)
    rows = []
    for (tag, kind), dft in df.groupby(["tag","kind"]):
        s = dft.sort_values("timestamp").reset_index(drop=True)
        s["next_ts"] = s["timestamp"].shift(-1)
        med = s["timestamp"].diff().median() or pd.Timedelta(seconds=1)
        s.loc[s["next_ts"].isna(), "next_ts"] = s["timestamp"] + med
        s["dur_s"] = (s["next_ts"] - s["timestamp"]).dt.total_seconds().clip(lower=0)
        s["date"] = s["timestamp"].dt.floor("D")
        if kind == "digital":
            daily = (s.groupby("date")
                       .agg(uptime_s=("dur_s", lambda x: float(x[s.loc[x.index,'value']==1].sum())),
                            transitions=("value", lambda x: int((x != x.shift(1)).sum())),
                            samples=("value","size")))
            daily["uptime_h"] = daily["uptime_s"]/3600.0
            daily["min"]=None; daily["max"]=None; daily["mean"]=None; daily["std"]=None
        else:
            daily = daily = (
                        s.groupby("date")["value"]
                        .agg(["min","max","mean","std","count"])
                        .rename(columns={"count":"samples"})
                    )
            daily["uptime_h"]=None; daily["transitions"]=None
        daily["tag"]=tag; daily["kind"]=kind
        rows.append(daily.reset_index())

    daily_all = pd.concat(rows, ignore_index=True) if rows else pd.DataFrame()
    if not daily_all.empty:
        cols = ["tag","kind","date","uptime_h","transitions","samples","min","max","mean","std"]
        daily_all = daily_all[cols]
        daily_all.to_csv(outdir / "unified_daily_summary.csv", index=False)

    # Gaps & coverage
    gaps = []
    for (tag, kind), dft in df.groupby(["tag","kind"]):
        gr = detect_gaps(dft)
        if not gr.empty:
            gaps.append(gr)
    if gaps:
        pd.concat(gaps, ignore_index=True).to_csv(outdir / "unified_gap_report.csv", index=False)

    coverage = (df.groupby(["tag","kind"])
                  .agg(start=("timestamp","min"), end=("timestamp","max"), rows=("timestamp","size"))
                  .sort_values(["kind","rows"], ascending=[True, False]))
    coverage.to_csv(outdir / "unified_coverage_report.csv")

    print("Wrote:")
    print(" -", combined_csv)
    if not dfd.empty:
        print(" -", outdir / f"digital_percent_on_{args.freq}.csv")
        print(" -", outdir / f"digital_transitions_{args.freq}.csv")
    if not dfa.empty:
        print(" -", outdir / f"analog_mean_{args.freq}.csv")
        print(" -", outdir / f"analog_min_{args.freq}.csv")
        print(" -", outdir / f"analog_max_{args.freq}.csv")
        print(" -", outdir / f"analog_std_{args.freq}.csv")
    print(" -", outdir / "unified_daily_summary.csv")
    print(" -", outdir / "unified_gap_report.csv")
    print(" -", outdir / "unified_coverage_report.csv")

if __name__ == "__main__":
    main()
