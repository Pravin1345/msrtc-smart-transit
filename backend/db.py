"""
MSRTC Smart Transit - Unified Database Abstraction Layer
Supports PostgreSQL (Production) with automatic SQLite (Development/Fallback) support.
"""

import os
import re
import sys
import threading
import json
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
DB_FILE = os.path.join(os.path.dirname(__file__), "msrtc.db")

# PostgreSQL connection parameters (configurable via env vars)
PG_HOST = os.environ.get("PGHOST", "localhost")
PG_PORT = int(os.environ.get("PGPORT", "5432"))
PG_USER = os.environ.get("PGUSER", "postgres")
PG_PASSWORD = os.environ.get("PGPASSWORD", "postgres")
PG_DB = os.environ.get("PGDATABASE", "msrtc_db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"postgresql://{PG_USER}:{PG_PASSWORD}@{PG_HOST}:{PG_PORT}/{PG_DB}")

_GLOBAL_DB = None
_LOCK = threading.Lock()


class DictRow:
    """Wrapper that supports both dict-like and index-based access."""
    def __init__(self, col_names, values):
        self._col_names = [c.lower() for c in col_names]
        self._values = list(values)
        self._dict = {k: v for k, v in zip(self._col_names, self._values)}

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return self._dict.get(str(key).lower())

    def get(self, key, default=None):
        return self._dict.get(str(key).lower(), default)

    def keys(self):
        return self._dict.keys()

    def values(self):
        return self._dict.values()

    def items(self):
        return self._dict.items()

    def __iter__(self):
        return iter(self._dict)

    def __repr__(self):
        return repr(self._dict)


class PostgresCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor

    def _convert_query(self, query):
        """Convert SQLite '?' placeholders to PostgreSQL '%s' placeholders."""
        trimmed = query.strip().upper()
        if trimmed == "BEGIN IMMEDIATE" or trimmed.startswith("BEGIN IMMEDIATE"):
            return "BEGIN"
        parts = re.split(r"(\?[^']*|\'[^\']*\')", query)
        new_parts = []
        for p in parts:
            if p.startswith("'") and p.endswith("'"):
                new_parts.append(p)
            else:
                new_parts.append(p.replace("?", "%s"))
        return "".join(new_parts)

    def execute(self, query, params=None):
        pg_query = self._convert_query(query)
        if params is not None:
            if isinstance(params, (list, tuple)):
                self.cursor.execute(pg_query, params)
            else:
                self.cursor.execute(pg_query, (params,))
        else:
            self.cursor.execute(pg_query)
        return self

    def executemany(self, query, param_seq):
        pg_query = self._convert_query(query)
        self.cursor.executemany(pg_query, param_seq)
        return self

    def fetchone(self):
        row = self.cursor.fetchone()
        if row is None:
            return None
        col_names = [desc[0] for desc in self.cursor.description]
        return DictRow(col_names, row)

    def fetchall(self):
        rows = self.cursor.fetchall()
        if not rows:
            return []
        col_names = [desc[0] for desc in self.cursor.description]
        return [DictRow(col_names, r) for r in rows]

    def __iter__(self):
        return iter(self.fetchall())

    @property
    def rowcount(self):
        return self.cursor.rowcount


class PostgresConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
        self.engine = "PostgreSQL"

    def cursor(self):
        return PostgresCursorWrapper(self.conn.cursor())

    def execute(self, query, params=None):
        cur = self.cursor()
        cur.execute(query, params)
        return cur

    def executemany(self, query, param_seq):
        cur = self.cursor()
        cur.executemany(query, param_seq)
        return cur

    def executescript(self, script):
        converted = re.sub(
            r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
            "SERIAL PRIMARY KEY",
            script,
            flags=re.IGNORECASE
        )
        with self.conn.cursor() as cur:
            cur.execute(converted)
        self.conn.commit()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()


class SQLiteConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn
        self.engine = "SQLite"

    def cursor(self):
        return self.conn.cursor()

    def execute(self, query, params=None):
        if params is not None:
            return self.conn.execute(query, params)
        return self.conn.execute(query)

    def executescript(self, script):
        return self.conn.executescript(script)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()


def _get_table_schemas(is_postgres=True):
    auto_id = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
    return f"""
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    trip_key TEXT,
    schedule_id TEXT,
    bus_type TEXT,
    from_loc TEXT,
    to_loc TEXT,
    travel_date TEXT,
    seat_count INTEGER,
    multiplier REAL,
    dynamic_subtotal INTEGER,
    static_subtotal INTEGER,
    gst INTEGER,
    vendor_subtotal INTEGER,
    total INTEGER,
    status TEXT,
    is_happy_hours INTEGER,
    happy_hours_discount INTEGER,
    group_discount INTEGER,
    priority_category TEXT,
    created_at TEXT,
    payload TEXT
);

CREATE TABLE IF NOT EXISTS seat_taken (
    trip_key TEXT,
    seat TEXT,
    booking_id TEXT,
    PRIMARY KEY (trip_key, seat)
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
    id TEXT PRIMARY KEY,
    route_id TEXT,
    bus_id TEXT,
    position TEXT,
    campaign_type TEXT,
    duration_days INTEGER,
    qr_scans INTEGER,
    fee REAL,
    revenue REAL,
    brand_name TEXT,
    status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS ad_bookings (
    id TEXT PRIMARY KEY,
    brand_name TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    boarding_point TEXT,
    dropping_point TEXT,
    num_buses INTEGER,
    position TEXT,
    campaign_type TEXT,
    duration_days INTEGER,
    rate_per_bus_day REAL,
    total_fee REAL,
    status TEXT,
    created_at TEXT,
    user_id TEXT DEFAULT 'usr_guest'
);

CREATE TABLE IF NOT EXISTS group_bookings_live (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'usr_guest',
    group_name TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    from_stand TEXT,
    to_stand TEXT,
    travel_date TEXT,
    passengers INTEGER,
    days INTEGER,
    base_fare REAL,
    discount_pct REAL,
    total_amount REAL,
    tier_name TEXT,
    status TEXT DEFAULT 'CONFIRMED',
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS vendor_orders (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    items_json TEXT,
    total_amount REAL,
    commission REAL,
    status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS sos_alerts (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    bus_number TEXT,
    location TEXT,
    status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    smart_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'Other',
    age INTEGER NOT NULL DEFAULT 25,
    category TEXT NOT NULL DEFAULT 'General',
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cargo_bookings (
    id TEXT PRIMARY KEY,
    booking_type TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_phone TEXT NOT NULL,
    sender_address TEXT,
    receiver_name TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    from_stand TEXT NOT NULL,
    to_stand TEXT NOT NULL,
    distance_km REAL NOT NULL,
    weight_kg REAL NOT NULL,
    packages_count INTEGER DEFAULT 1,
    cargo_category TEXT NOT NULL,
    speed_tier TEXT DEFAULT 'STANDARD',
    declared_value INTEGER DEFAULT 500,
    base_freight INTEGER NOT NULL,
    distance_charge INTEGER NOT NULL,
    surcharge INTEGER NOT NULL,
    gst INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    bus_schedule_id TEXT,
    status TEXT DEFAULT 'BOOKED',
    current_location TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cargo_milestones (
    id {auto_id},
    cargo_id TEXT NOT NULL,
    milestone_title TEXT NOT NULL,
    location_name TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status_key TEXT NOT NULL,
    is_completed INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS excess_luggage_records (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    passenger_name TEXT NOT NULL,
    ticket_pnr TEXT NOT NULL,
    bus_number TEXT,
    free_allowance_kg REAL DEFAULT 15.0,
    actual_weight_kg REAL NOT NULL,
    excess_weight_kg REAL NOT NULL,
    charge_per_kg REAL DEFAULT 10.0,
    bulky_items_count INTEGER DEFAULT 0,
    bulky_items_charge REAL DEFAULT 0.0,
    total_luggage_fee REAL NOT NULL,
    status TEXT DEFAULT 'PAID',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_registrations (
    id TEXT PRIMARY KEY,
    restaurant_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    fssai_license TEXT NOT NULL,
    corridor TEXT NOT NULL,
    location_stand TEXT NOT NULL,
    cuisine_type TEXT NOT NULL,
    seating_capacity INTEGER DEFAULT 50,
    has_restrooms INTEGER DEFAULT 1,
    has_ev_charging INTEGER DEFAULT 0,
    commission_pct REAL DEFAULT 12.0,
    status TEXT DEFAULT 'VERIFIED',
    registered_at TEXT
);

CREATE TABLE IF NOT EXISTS rest_stop_stalls (
    id TEXT PRIMARY KEY,
    stall_number TEXT NOT NULL,
    rest_stop_name TEXT NOT NULL,
    corridor TEXT NOT NULL,
    location_area TEXT NOT NULL,
    stall_category TEXT NOT NULL,
    sqft_area INTEGER NOT NULL,
    base_bid_monthly INTEGER NOT NULL,
    current_highest_bid INTEGER NOT NULL,
    highest_bidder_name TEXT,
    highest_bidder_phone TEXT,
    min_increment INTEGER DEFAULT 1000,
    total_bids INTEGER DEFAULT 0,
    deadline_date TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS stall_bids_history (
    id {auto_id},
    stall_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_phone TEXT NOT NULL,
    bid_amount INTEGER NOT NULL,
    bid_timestamp TEXT NOT NULL
);
"""


def _try_connect_postgres():
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            dbname=PG_DB,
            connect_timeout=3
        )
        conn.autocommit = True
        return PostgresConnectionWrapper(conn)
    except Exception as e:
        print(f"[DB] PostgreSQL connection attempt to {PG_DB}@{PG_HOST}:{PG_PORT} failed: {e}")
        return None


def _try_connect_sqlite():
    import sqlite3
    conn = sqlite3.connect(DB_FILE, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    return SQLiteConnectionWrapper(conn)


def _migrate_sqlite_to_postgres(pg_wrapper):
    """Optional migration: copy records from SQLite if SQLite exists and PG is empty."""
    import sqlite3
    if not os.path.exists(DB_FILE):
        return
    try:
        s_conn = sqlite3.connect(DB_FILE)
        s_conn.row_factory = sqlite3.Row
        tables = [
            "bookings", "seat_taken", "ad_campaigns", "ad_bookings", "vendor_orders",
            "sos_alerts", "users", "user_sessions", "cargo_bookings", "cargo_milestones",
            "excess_luggage_records", "vendor_registrations", "rest_stop_stalls", "stall_bids_history"
        ]
        for t in tables:
            chk = s_conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (t,)).fetchone()
            if not chk:
                continue
            rows = s_conn.execute(f"SELECT * FROM {t}").fetchall()
            if not rows:
                continue
            try:
                pg_cur = pg_wrapper.execute(f"SELECT COUNT(*) FROM {t}")
                cnt = pg_cur.fetchone()[0]
                if cnt == 0:
                    cols = list(rows[0].keys())
                    # For tables with autoincrement id, omit 'id' if generated or insert if provided
                    col_str = ", ".join(cols)
                    placeholders = ", ".join(["%s"] * len(cols))
                    insert_sql = f"INSERT INTO {t} ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                    data = [tuple(r[c] for c in cols) for r in rows]
                    pg_wrapper.cursor().executemany(insert_sql, data)
                    print(f"[DB Migration] Migrated {len(data)} rows for table '{t}' from SQLite to PostgreSQL.")
            except Exception as ex:
                print(f"[DB Migration] Skipped migration for {t}: {ex}")
        s_conn.close()
    except Exception as e:
        print(f"[DB Migration] Notice during data migration: {e}")


def _sync_postgres_sequences(pg_wrapper):
    """Ensure PostgreSQL SERIAL sequences match MAX(id) after migrations or manual inserts."""
    for t in ("cargo_milestones", "stall_bids_history", "excess_luggage_records"):
        try:
            pg_wrapper.execute(
                f"SELECT setval(pg_get_serial_sequence('public.{t}', 'id'), COALESCE((SELECT MAX(id) FROM public.{t}), 1), true)"
            )
        except Exception:
            pass


def _ensure_user_id_columns(conn, is_postgres=True):
    """Ensure every feature booking table has a user_id column for strict per-user isolation."""
    tables = (
        "ad_bookings", "cargo_bookings", "vendor_orders", "sos_alerts",
        "excess_luggage_records", "stall_bids_history", "vendor_registrations"
    )
    for t in tables:
        try:
            if is_postgres:
                conn.execute(f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'usr_guest'")
            else:
                cols = [r[1] for r in conn.execute(f"PRAGMA table_info({t})").fetchall()]
                if "user_id" not in cols:
                    conn.execute(f"ALTER TABLE {t} ADD COLUMN user_id TEXT DEFAULT 'usr_guest'")
        except Exception:
            pass


def init_db():
    global _GLOBAL_DB
    with _LOCK:
        pg_conn = _try_connect_postgres()
        if pg_conn:
            print(f"[DB] Successfully connected to PostgreSQL (DB: {PG_DB} on {PG_HOST}:{PG_PORT})")
            schemas = _get_table_schemas(is_postgres=True)
            pg_conn.executescript(schemas)
            _ensure_user_id_columns(pg_conn, is_postgres=True)
            _migrate_sqlite_to_postgres(pg_conn)
            _sync_postgres_sequences(pg_conn)
            _GLOBAL_DB = pg_conn
            return _GLOBAL_DB

        print(f"[DB] Falling back to local SQLite ({DB_FILE})")
        sq_conn = _try_connect_sqlite()
        schemas = _get_table_schemas(is_postgres=False)
        sq_conn.executescript(schemas)
        _ensure_user_id_columns(sq_conn, is_postgres=False)
        _GLOBAL_DB = sq_conn
        return _GLOBAL_DB


def get_db():
    global _GLOBAL_DB
    if _GLOBAL_DB is None:
        init_db()
    return _GLOBAL_DB


def get_connection():
    """Return active database connection wrapper (for services)."""
    return get_db()


def get_db_info():
    db = get_db()
    if db.engine == "PostgreSQL":
        ver_row = db.execute("SELECT version();").fetchone()
        ver = ver_row[0] if ver_row else "PostgreSQL"
        return {
            "engine": "PostgreSQL",
            "host": f"{PG_HOST}:{PG_PORT}",
            "database": PG_DB,
            "user": PG_USER,
            "version": ver.split(",")[0] if "," in ver else ver,
            "status": "Connected (Active)"
        }
    return {
        "engine": "SQLite",
        "file": DB_FILE,
        "database": "msrtc.db",
        "status": "Connected (Fallback)"
    }
