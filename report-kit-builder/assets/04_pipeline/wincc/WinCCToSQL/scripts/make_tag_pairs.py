#!/usr/bin/env python3
"""
Builds a pairing table mapping analog '#Value' tags to their sibling digital '_DC' tags.

How it works
------------
- Scans two folders of exported CSVs:
    --dc_dir    : CSVs from export_dc_tags_bulk.py   (e.g., SystemArchive_As1_PakA_FCOM.Out_DC.csv)
    --analog_dir: CSVs from export_analog_tags_bulk.py (e.g., SystemArchive_As1_PakA_FCOM.Out_Value.csv)
- Filenames were sanitized (slashes -> underscore, '#' -> underscore), so we match by stripping suffixes:
    base = tag.replace('_Value','').replace('_DC','')
- Writes pairs.csv with columns: base_tag, analog_tag, digital_tag
- Also writes orphans.csv with analog-only and digital-only tags for review

Usage
-----
python make_tag_pairs.py --dc_dir ./out_dc --analog_dir ./out_analog --out ./pairs
"""

import argparse, csv, os, re
from pathlib import Path

def stem_without_suffix(stem: str) -> str:
    s = stem
    if s.endswith("_Value"):
        s = s[:-6]
    if s.endswith("_DC"):
        s = s[:-3]
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dc_dir", required=True)
    ap.add_argument("--analog_dir", required=True)
    ap.add_argument("--out", default="./pairs")
    args = ap.parse_args()

    dc_dir = Path(args.dc_dir); analog_dir = Path(args.analog_dir)
    out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)

    dc_stems = {p.stem for p in dc_dir.glob("*.csv")}
    an_stems = {p.stem for p in analog_dir.glob("*.csv")}

    base_to_dc = {}
    for s in dc_stems:
        base = stem_without_suffix(s)
        base_to_dc.setdefault(base, set()).add(s)

    base_to_an = {}
    for s in an_stems:
        base = stem_without_suffix(s)
        base_to_an.setdefault(base, set()).add(s)

    bases = sorted(set(base_to_dc) | set(base_to_an))

    pairs_path = out_dir / "pairs.csv"
    with pairs_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["base_tag","analog_tag","digital_tag"])
        for b in bases:
            analogs = sorted(base_to_an.get(b, []))
            digitals = sorted(base_to_dc.get(b, []))
            if not analogs and not digitals:
                continue
            if not analogs:
                # still emit with empty analog to keep visibility
                for d in digitals:
                    w.writerow([b, "", d])
            elif not digitals:
                for a in analogs:
                    w.writerow([b, a, ""])
            else:
                # cartesian to show all present variants (usually 1:1)
                for a in analogs:
                    for d in digitals:
                        w.writerow([b, a, d])

    # Orphans for sanity-check
    orphans_path = out_dir / "orphans.csv"
    with orphans_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["tag","kind","reason"])
        for a in sorted(an_stems - set().union(*[v for v in base_to_an.values()])):
            w.writerow([a, "analog","unmatched"])  # (kept for completeness; set difference insufficient here)
        # Simpler explicit loops
        for a in sorted(an_stems):
            b = stem_without_suffix(a)
            if b not in base_to_dc:
                w.writerow([a, "analog","no matching digital base"])
        for d in sorted(dc_stems):
            b = stem_without_suffix(d)
            if b not in base_to_an:
                w.writerow([d, "digital","no matching analog base"])

    print("Wrote:")
    print(" -", pairs_path)
    print(" -", orphans_path)

if __name__ == "__main__":
    main()
