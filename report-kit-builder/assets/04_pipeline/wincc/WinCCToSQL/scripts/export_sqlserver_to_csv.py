#!/usr/bin/env python3
"""
Export all tables (or filtered schemas/tables) from a SQL Server database to CSVs.
- Streams large tables in chunks
- SQL auth or Windows Integrated Auth

Examples:
  python export_sqlserver_to_csv.py \
    --server 127.0.0.1,1433 --database YourDB \
    --username analytics_user --password "YourStrong!Passw0rd" \
    --output ./exports

  python export_sqlserver_to_csv.py \
    --server localhost,1433 --database YourDB --trusted \
    --schema dbo --table Archive --output ./exports
"""
import argparse, os, re, sys
from pathlib import Path
from typing import List, Tuple
import pandas as pd
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

def get_tables(cursor, include_views: bool, schemas: List[str], tables: List[str]) -> List[Tuple[str, str]]:
    base_sql = """
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE IN ({types})
    """
    types = "'BASE TABLE'"
    if include_views: types += ", 'VIEW'"
    sql = base_sql.format(types=types)

    filters, params = [], []
    if schemas:
        ph = ", ".join(["?"]*len(schemas))
        filters.append(f"TABLE_SCHEMA IN ({ph})")
        params += schemas
    if tables:
        ph = ", ".join(["?"]*len(tables))
        filters.append(f"TABLE_NAME IN ({ph})")
        params += tables
    if filters:
        sql += " AND " + " AND ".join(filters)
    sql += " ORDER BY TABLE_SCHEMA, TABLE_NAME"

    cursor.execute(sql, params)
    return [(r[0], r[1]) for r in cursor.fetchall()]

def safe_filename(schema: str, table: str) -> str:
    name = f"{schema}.{table}"
    return re.sub(r"[^A-Za-z0-9._-]", "_", name) + ".csv"

def export_table(cnxn, schema, table, out_dir: Path, chunksize: int, encoding: str):
    fq = f"[{schema}].[{table}]"
    out_path = out_dir / safe_filename(schema, table)
    q = f"SELECT * FROM {fq}"
    first = True
    total = 0
    for chunk in pd.read_sql_query(q, cnxn, chunksize=chunksize):
        mode = "w" if first else "a"
        header = first
        chunk.to_csv(out_path, index=False, mode=mode, header=header, encoding=encoding)
        total += len(chunk)
        first = False
        print(f"   wrote {len(chunk)} rows (running total: {total})")
    if first:
        # empty table → write header
        empty = pd.read_sql_query(q + " WHERE 1=0", cnxn)
        empty.to_csv(out_path, index=False, encoding=encoding)
        print("   table is empty (header only).")
    print(f"✓ Done {fq}: {total} rows → {out_path}")

def main():
    ap = argparse.ArgumentParser(description="Export SQL Server tables to CSV")
    ap.add_argument("--server", required=True, help="host,port (e.g., 127.0.0.1,1433)")
    ap.add_argument("--database", required=True)
    ap.add_argument("--driver", default="ODBC Driver 18 for SQL Server")
    auth = ap.add_mutually_exclusive_group(required=True)
    auth.add_argument("--trusted", action="store_true")
    auth.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--output", default="./exports")
    ap.add_argument("--include-views", action="store_true")
    ap.add_argument("--schema", action="append", dest="schemas", default=[])
    ap.add_argument("--table", action="append", dest="tables", default=[])
    ap.add_argument("--chunksize", type=int, default=100000)
    ap.add_argument("--encoding", default="utf-8")
    args = ap.parse_args()

    if not args.trusted and not args.password:
        ap.error("--password is required when using --username")

    out_dir = Path(args.output); out_dir.mkdir(parents=True, exist_ok=True)
    conn_str = build_conn_str(args)
    print("Connecting...")
    cnxn = pyodbc.connect(conn_str, timeout=5)
    cur = cnxn.cursor()
    objs = get_tables(cur, args.include_views, args.schemas, args.tables)
    if not objs:
        print("No objects matched filters."); return
    print(f"Found {len(objs)} object(s) to export.")
    for schema, table in objs:
        export_table(cnxn, schema, table, out_dir, args.chunksize, args.encoding)
    print("All done:", out_dir)

if __name__ == "__main__":
    main()
