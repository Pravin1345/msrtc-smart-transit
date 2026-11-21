"""
MSRTC Smart Transit - User Authentication Service
Register, Login, Session Token Management (SQLite-backed)

Features:
- User Registration with MSRTC Smart ID assignment (MH-MSRTC-XXXXX)
- Secure password hashing (SHA-256 + salt)
- JWT-lite session tokens stored in SQLite (token + expiry)
- Mahila Samman 50% discount flag for Female passengers
- Maharashtra concessional category: Senior, Student, Divyangjan, Defence
"""

import hashlib
import os
import random
import re
import sqlite3
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
DB_PATH = os.path.join(os.path.dirname(__file__), "msrtc.db")
TOKEN_EXPIRY_HOURS = 72  # sessions last 3 days


def _get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _init_auth_tables():
    with _get_conn() as conn:
        conn.executescript("""
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
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        """)
        # Seed a demo account
        existing = conn.execute("SELECT id FROM users WHERE email='pravin.msrtc@transit.gov.in'").fetchone()
        if not existing:
            uid = "usr_pravin_demo_001"
            salt = _generate_salt()
            ph = _hash_password("Pravin@1234", salt)
            now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
            conn.execute("""
            INSERT INTO users (id, smart_id, full_name, email, phone, gender, age, category, password_hash, salt, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (uid, "MH-MSRTC-78942-A", "Pravin Dongare", "pravin.msrtc@transit.gov.in",
                  "+91 98230 12345", "Male", 29, "General", ph, salt, now_str))


def _generate_salt():
    return hashlib.sha256(os.urandom(32)).hexdigest()[:16]


def _hash_password(password, salt):
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def _generate_token():
    return hashlib.sha256(os.urandom(64)).hexdigest()


def _generate_smart_id():
    return f"MH-MSRTC-{random.randint(10000, 99999)}-{chr(random.randint(65, 90))}"


def _validate_email(email):
    return bool(re.match(r'^[^@]+@[^@]+\.[^@]+$', email))


def _validate_phone(phone):
    digits = re.sub(r'[\s\-\+]', '', phone)
    return len(digits) >= 10


def _user_public(row):
    """Return the public-safe user dict."""
    return {
        "userId": row["id"],
        "smartId": row["smart_id"],
        "fullName": row["full_name"],
        "name": row["full_name"],
        "email": row["email"],
        "phone": row["phone"],
        "gender": row["gender"],
        "age": row["age"],
        "category": row["category"],
        "isVerified": True,
        "createdAt": row["created_at"]
    }


def register_user(data):
    """Register a new MSRTC transit passenger account."""
    full_name = (data.get("fullName") or data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    gender = data.get("gender", "Male")
    age_raw = data.get("age", 25)
    category = data.get("category", "General")

    # Validations
    if not full_name or len(full_name) < 2:
        raise ValueError("Full name is required (minimum 2 characters).")
    if not _validate_email(email):
        raise ValueError("Please enter a valid email address.")
    if not _validate_phone(phone):
        raise ValueError("Please enter a valid 10-digit phone number.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    if gender not in ("Male", "Female", "Other"):
        raise ValueError("Invalid gender selection.")

    try:
        age = int(age_raw)
        if not 5 <= age <= 110:
            raise ValueError()
    except (TypeError, ValueError):
        raise ValueError("Please enter a valid age between 5 and 110.")

    with _get_conn() as conn:
        # Check duplicate email
        if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
            raise ValueError("This email is already registered. Please log in instead.")

        uid = f"usr_{random.randint(100000, 999999)}"
        smart_id = _generate_smart_id()
        salt = _generate_salt()
        pw_hash = _hash_password(password, salt)
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        conn.execute("""
        INSERT INTO users (id, smart_id, full_name, email, phone, gender, age, category, password_hash, salt, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (uid, smart_id, full_name, email, phone, gender, age, category, pw_hash, salt, now_str))

        # Auto-login after registration
        token = _generate_token()
        expires = (datetime.now(IST) + timedelta(hours=TOKEN_EXPIRY_HOURS)).strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, uid, now_str, expires)
        )

        user_row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        return {
            "success": True,
            "token": token,
            "user": _user_public(user_row),
            "message": f"Welcome to MSRTC Smart Transit, {full_name}! Your Smart ID is {smart_id}."
        }


def login_user(data):
    """Authenticate a registered user and issue a session token."""
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        raise ValueError("Email and password are required.")

    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if not row:
            raise ValueError("No account found with this email. Please register first.")

        expected_hash = _hash_password(password, row["salt"])
        if expected_hash != row["password_hash"]:
            raise ValueError("Incorrect password. Please try again.")

        if not row["is_active"]:
            raise ValueError("This account has been deactivated. Please contact MSRTC support.")

        # Issue new token
        token = _generate_token()
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        expires = (datetime.now(IST) + timedelta(hours=TOKEN_EXPIRY_HOURS)).strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, row["id"], now_str, expires)
        )

        return {
            "success": True,
            "token": token,
            "user": _user_public(row),
            "message": f"Welcome back, {row['full_name']}!"
        }


def verify_session(token):
    """Verify a session token and return the user if valid."""
    if not token:
        return None
    now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
    with _get_conn() as conn:
        row = conn.execute("""
        SELECT u.* FROM users u
        JOIN user_sessions s ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?
        """, (token, now_str)).fetchone()
        return _user_public(row) if row else None


def logout_user(token):
    """Invalidate a session token."""
    if token:
        with _get_conn() as conn:
            conn.execute("DELETE FROM user_sessions WHERE token=?", (token,))
    return {"success": True, "message": "You have been logged out."}


def update_profile(token, data):
    """Update logged-in user's profile details."""
    user = verify_session(token)
    if not user:
        raise ValueError("Session expired. Please log in again.")

    uid = user["userId"]
    full_name = (data.get("fullName") or data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    gender = data.get("gender", "Male")
    age = int(data.get("age", 25))
    category = data.get("category", "General")

    if not full_name:
        raise ValueError("Full name is required.")
    if not _validate_phone(phone):
        raise ValueError("Please enter a valid phone number.")

    with _get_conn() as conn:
        conn.execute("""
        UPDATE users SET full_name=?, phone=?, gender=?, age=?, category=?
        WHERE id=?
        """, (full_name, phone, gender, age, category, uid))
        updated_row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        return {
            "success": True,
            "user": _user_public(updated_row),
            "message": "Profile updated successfully!"
        }


# Initialize auth tables on import
_init_auth_tables()
AUTH_SERVICE = type("AuthService", (), {
    "register": staticmethod(register_user),
    "login": staticmethod(login_user),
    "verify": staticmethod(verify_session),
    "logout": staticmethod(logout_user),
    "update_profile": staticmethod(update_profile),
})()
