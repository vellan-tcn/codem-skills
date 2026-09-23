# WinCC TagCompressed → Analytics Toolkit

Reverse‑engineer and export **Siemens WinCC/PCS 7** historian data from a SQL Server backup (LDF/MDF → attached DB) into tidy CSV/Parquet for analytics and dashboards (Power BI or Python). Works on Windows and WSL/Linux/macOS via **ODBC Driver 18**.

> ⚠️ Use this toolkit only with data you are authorized to access. This is an independent, best‑effort decoder; it is **not** affiliated with or endorsed by Siemens.

---

## What’s inside

```
/ (repo root)
├─ decode_tagcompressed_dc.py          # Decode a single digital (_DC) tag
├─ export_dc_tags_bulk.py              # Export all digital (_DC) tags → CSVs
├─ decode_tagcompressed_analog.py      # Decode a single analog (#Value) tag (heuristic codecs)
├─ export_analog_tags_bulk.py          # Export all analog (#Value) tags → CSVs
├─ summarize_dc_data.py                # Summaries for digital CSVs (uptime, %ON, gaps)
├─ summarize_analog_data.py            # Summaries for analog CSVs (mean/min/max/std, gaps)
├─ summarize_unified.py                # Merge digital+analog and roll up both kinds
├─ make_tag_pairs.py                   # Build analog/digital pairing map from filenames
├─ clean_unified_for_bi.py             # (Optional) Sanitize unified CSV for Power BI
├─ export_sqlserver_to_csv.py          # Generic SQL Server table exporter
├─ requirements.txt                    # pyodbc, pandas (pyarrow optional)
└─ README.md                           # this file
```

---

## Prerequisites

* **SQL Server** with your WinCC DB attached (from `.mdf/.ldf`).
* **ODBC Driver 18 for SQL Server**

  * Windows: install *Microsoft ODBC Driver 18 for SQL Server*.
  * WSL/Linux/macOS: install **msodbcsql18** + **unixODBC**.
* **Python 3.9+** (tested with 3.10/3.11)
* Python deps:

  ```bash
  pip install -r requirements.txt
  # Optional but recommended for Parquet outputs:
  pip install pyarrow
  ```

### SQL connectivity tips (esp. from WSL)

* Ensure SQL Server **TCP/IP** is enabled and **port 1433** is open.
* Use **SQL authentication** (UID/PWD) from WSL. Example connection fields in all scripts:

  * `--server <WINDOWS_HOST_IP>,1433`
  * `--database <YourDbName>`
  * `--username <login>` `--password '<pass>'`
* Grant **db\_datareader** on your DB:

  ```sql
  USE [YourDbName];
  CREATE USER [analytics_user] FOR LOGIN [analytics_user];
  ALTER ROLE db_datareader ADD MEMBER [analytics_user];
  ```

---

## Quick start (full pipeline)

### 1) Export **digital** tags (`*_DC`)

```bash
python3 export_dc_tags_bulk.py \
  --server <HOST_IP>,1433 \
  --database <YourDb> \
  --username <user> --password '<pass>' \
  --outdir ./out_dc
```

Output: one CSV per digital tag in `out_dc/` with columns `timestamp,value` (0/1).

### 2) Export **analog** tags (`*#Value`)

```bash
python3 export_analog_tags_bulk.py \
  --server <HOST_IP>,1433 \
  --database <YourDb> \
  --username <user> --password '<pass>' \
  --outdir ./out_analog
```

* Heuristics try codecs per block: `float32`, `float64`, `int16*scale`, `varint-delta*scale`.
* If you already know the codec, speed things up:

  ```bash
  # force varint codec, override scale if CompPrecision is 0
  python3 export_analog_tags_bulk.py ... --codec varint --scale 0.2
  ```
* Robust fallback: if a block header isn’t recognized, the script infers period from payload length.

### 3) Build **pairing** between analog/digital tags (for visuals)

```bash
python3 make_tag_pairs.py --dc_dir ./out_dc --analog_dir ./out_analog --out ./pairs
```

Outputs:

* `pairs/pairs.csv` → `base_tag, analog_tag, digital_tag`
* `pairs/orphans.csv` → unmatched tags for review

### 4) Summaries (optional but handy)

**Digital summaries:**

```bash
python3 summarize_dc_data.py \
  --input ./out_dc \
  --tz Africa/Casablanca \
  --freq 1min \
  --outdir ./dc_summary
```

**Analog summaries:**

```bash
python3 summarize_analog_data.py \
  --input ./out_analog \
  --tz Africa/Casablanca \
  --freq 1min \
  --outdir ./analog_summary
```

**Unified (digital+analog):**

```bash
python3 summarize_unified.py \
  --dc_dir ./out_dc \
  --analog_dir ./out_analog \
  --tz Africa/Casablanca \
  --freq 1min \
  --outdir ./unified_summary
```

Key outputs:

* `unified_summary/unified_combined.csv` — long table: `timestamp,tag,kind,value`
* `digital_percent_on_1min.csv`, `digital_transitions_1min.csv`
* `analog_mean_1min.csv`/`min`/`max`/`std`
* `unified_daily_summary.csv`, `unified_gap_report.csv`, `unified_coverage_report.csv`

> Power BI likes clean floats. If it guesses `value` as Int64, pre-clean:
>
> ```bash
> python3 clean_unified_for_bi.py \
>   --input  ./unified_summary/unified_combined.csv \
>   --output ./unified_summary/unified_combined_bi.csv
> ```

---

## Power BI setup (Desktop is free)

1. **Get Data → Text/CSV**: import `unified_summary/unified_combined*.csv` and `pairs/pairs.csv`.
2. In **Power Query**: remove auto “Changed Type” if it set `value` to Whole Number; set types:

   * `timestamp` → Date/Time, `tag`/`kind` → Text, `value` → Decimal Number.
3. **Modeling → New column** on **Unified** (normalize names for pairing):

   ```DAX
   BaseTag =
   VAR t = 'Unified'[tag]
   RETURN
     IF ( RIGHT(t,6)="_Value", LEFT(t, LEN(t)-6),
          IF ( RIGHT(t,3)="_DC",  LEFT(t, LEN(t)-3), t ) )
   ```
4. **Model**: relate `Pairs[base_tag] (1)` → `Unified[BaseTag] (*)` (cross-filter: Single).
5. **Measures** on Unified:

   ```DAX
   Analog Value := AVERAGEX(FILTER('Unified','Unified'[kind]="analog"),'Unified'[value])
   Digital On % := 100 * AVERAGEX(FILTER('Unified','Unified'[kind]="digital"),'Unified'[value])
   ```
6. **Slicers**: add a slicer bound to `Pairs[base_tag]`, and a date/time slicer on `Unified[timestamp]` (type: Between).
7. **Visuals** (starter set):

   * **Pair Explorer** (Line & clustered column): Axis=`timestamp`; Columns=**Digital On %**; Lines=**Analog Value**.
   * **%ON Heatmap** (Matrix): Rows=`BaseTag`, Columns=time, Values=**Digital On %** (cond. formatting).
   * **Daily summary table**: from `unified_daily_summary.csv`.

---

## Helpful SQL snippets

List databases and find the one containing `TagCompressed`:

```sql
SELECT name FROM sys.databases;
EXEC sp_MSforeachdb
  'IF EXISTS (SELECT 1 FROM [?].sys.tables WHERE name = ''TagCompressed'')
     PRINT ''Found in: ?'' ';
```

Map IDs → names (for labeling or joins):

```sql
SELECT ValueID, ValueName, CompPrecision, CompressionMode, VarType
FROM dbo.Archive ORDER BY ValueID;
```

Check data presence for a tag:

```sql
SELECT TOP (5) Timebegin, Timeend, DATALENGTH(BinValues) AS len
FROM dbo.TagCompressed WHERE ValueID = 123 ORDER BY Timebegin;
```

---

## Troubleshooting

* **ImportError: libodbc.so.2** (WSL/Linux)

  * Install `unixODBC` and `msodbcsql18`; ensure `odbcinst -q -d` lists the driver.
* **Login timeout / HYT00**

  * Verify `SERVER=<HOST_IP>,1433`, TCP enabled, firewall open.
* **Error 4060: Cannot open database "TagCompressed"**

  * `TagCompressed` is a **table**, not the DB name. Use your actual DB name in `--database` and map the login to that DB (`db_datareader`).
* **Zero rows exported (analogs)**

  * Updated decoders search deeper for headers and fall back to inferred period. Try `--codec varint` or set `--scale` if values look quantized.
* **Power BI: “Number out of range of 64-bit integer”**

  * Set `value` to **Decimal Number** (remove auto type step), or pre‑clean with `clean_unified_for_bi.py`.

---

## FAQ

**Q: What are `_DC` and `#Value`?**
`_DC` are digital/boolean states; `#Value` are analog/continuous signals.

**Q: What cadence do exports use?**
From block header `period_ms` (commonly 1000 ms). When the header is missing, the analog exporter infers a plausible period from payload length.

**Q: What does `--scale` do?**
Overrides analog scaling when `CompPrecision` is missing/incorrect (e.g., `--scale 0.2`).

**Q: Can I export only certain tags?**
Yes: `--max_tags N` and `--max_blocks N` on the bulk exporters for quick tests.

---

## License

MIT (or choose a license). Contributions welcome.

## Acknowledgements

Thanks to the OSS community around SQL Server, ODBC, and Python/pandas. This project provides a practical bridge from WinCC archives to modern analytics.
