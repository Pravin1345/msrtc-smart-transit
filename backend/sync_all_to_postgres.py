"""
MSRTC Smart Transit - Sync All Databases & Datasets to PostgreSQL (pgAdmin)
Loads all CSV datasets into organized PostgreSQL schemas inside `msrtc_db`
and creates easy-to-query SQL views in `public` for pgAdmin inspection.
"""

import os
import io
import pandas as pd
import psycopg2

PG_HOST = os.environ.get("PGHOST", "localhost")
PG_PORT = int(os.environ.get("PGPORT", "5432"))
PG_USER = os.environ.get("PGUSER", "postgres")
PG_PASSWORD = os.environ.get("PGPASSWORD", "postgres")
PG_DB = os.environ.get("PGDATABASE", "msrtc_db")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
HH_DIR = os.path.join(DATA_DIR, "happy_hours_dataset")


def pg_type_from_dtype(dtype):
    s = str(dtype).lower()
    if "int" in s:
        return "BIGINT"
    if "float" in s:
        return "DOUBLE PRECISION"
    if "bool" in s:
        return "BOOLEAN"
    return "TEXT"


def sanitize_col(name):
    return (
        str(name)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace(".", "_")
    )


def load_csv_to_pg(cur, csv_path, schema_name, table_name):
    df_sample = pd.read_csv(csv_path, nrows=1000)
    cols = [sanitize_col(c) for c in df_sample.columns]
    col_defs = [f'"{c}" {pg_type_from_dtype(dt)}' for c, dt in zip(cols, df_sample.dtypes)]

    cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}";')
    cur.execute(f'DROP TABLE IF EXISTS "{schema_name}"."{table_name}" CASCADE;')
    cur.execute(f'CREATE TABLE "{schema_name}"."{table_name}" ({", ".join(col_defs)});')

    # Read full CSV and stream via COPY FROM STDIN (super fast)
    df_full = pd.read_csv(csv_path, low_memory=False)
    df_full.columns = cols

    # Ensure integer columns don't have '.0' strings if NaN existed
    for c, dt in zip(cols, df_sample.dtypes):
        if "int" in str(dt).lower():
            df_full[c] = pd.to_numeric(df_full[c], errors="coerce").astype("Int64")

    buf = io.StringIO()
    df_full.to_csv(buf, index=False, header=True)
    buf.seek(0)
    copy_sql = f'COPY "{schema_name}"."{table_name}" ({", ".join(f"""\"{c}\"""" for c in cols)}) FROM STDIN WITH CSV HEADER NULL \'\''
    cur.copy_expert(copy_sql, buf)

    return len(df_full)


def create_pgadmin_views(cur):
    # 1. Readable Bookings View
    cur.execute("""
        CREATE OR REPLACE VIEW public.v_bookings_readable AS
        SELECT
            id AS booking_id,
            travel_date,
            from_loc,
            to_loc,
            bus_type,
            seat_count,
            total AS total_inr,
            status,
            CASE WHEN is_happy_hours = 1 THEN 'Yes (' || happy_hours_discount || '%)' ELSE 'No' END AS happy_hours,
            priority_category,
            created_at
        FROM public.bookings
        ORDER BY created_at DESC;
    """)

    # 2. Cancelled Bookings View
    cur.execute("""
        CREATE OR REPLACE VIEW public.v_cancelled_bookings AS
        SELECT
            id AS booking_id,
            travel_date,
            from_loc,
            to_loc,
            bus_type,
            seat_count,
            total AS original_total_inr,
            status,
            created_at
        FROM public.bookings
        WHERE status = 'CANCELLED'
        ORDER BY created_at DESC;
    """)

    # 3. Revenue Summary View
    cur.execute("""
        CREATE OR REPLACE VIEW public.v_revenue_summary AS
        SELECT
            bus_type,
            status,
            COUNT(*) AS total_bookings,
            SUM(seat_count) AS total_seats,
            ROUND(SUM(total)::numeric, 2) AS total_revenue_inr
        FROM public.bookings
        GROUP BY bus_type, status
        ORDER BY total_revenue_inr DESC;
    """)


def sync_all():
    conn = psycopg2.connect(
        host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PASSWORD, dbname=PG_DB
    )
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print(f"Connected to PostgreSQL: {PG_DB} on {PG_HOST}:{PG_PORT}")

        # 1. Load data/*.csv into schema `transit_datasets`
        print("\n--- Loading data/*.csv into schema [transit_datasets] ---")
        for fname in sorted(os.listdir(DATA_DIR)):
            if fname.endswith(".csv"):
                tname = os.path.splitext(fname)[0].lower()
                fpath = os.path.join(DATA_DIR, fname)
                cnt = load_csv_to_pg(cur, fpath, "transit_datasets", tname)
                print(f"  [transit_datasets.{tname}] -> {cnt:,} rows loaded")

        # 2. Load data/happy_hours_dataset/*.csv into schema `happy_hours`
        if os.path.isdir(HH_DIR):
            print("\n--- Loading data/happy_hours_dataset/*.csv into schema [happy_hours] ---")
            for fname in sorted(os.listdir(HH_DIR)):
                if fname.endswith(".csv"):
                    tname = os.path.splitext(fname)[0].lower()
                    fpath = os.path.join(HH_DIR, fname)
                    cnt = load_csv_to_pg(cur, fpath, "happy_hours", tname)
                    print(f"  [happy_hours.{tname}] -> {cnt:,} rows loaded")

        # 3. Create easy-access Views in `public`
        print("\n--- Creating easy-access SQL Views in [public] ---")
        create_pgadmin_views(cur)
        print("  Created views: v_bookings_readable, v_cancelled_bookings, v_revenue_summary")

        conn.commit()
        print("\nALL DATABASES & DATASETS SUCCESSFULLY SYNCED TO POSTGRESQL (msrtc_db)!")
    except Exception as e:
        conn.rollback()
        print("Sync failed:", e)
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    sync_all()
