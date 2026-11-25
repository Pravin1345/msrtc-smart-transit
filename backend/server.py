"""
MSRTC Smart Transit - Integrated Revenue Optimization Backend
Title: ML-Based Revenue Optimization System for MSRTC ("HAPPY HOURS")

Implements All 7 Project Modules:
  Module 1: ML-Based Passenger Demand Forecasting (Linear Regression, Decision Tree, Random Forest, XGBoost)
  Module 2: Seat Occupancy Optimization (Vacant Seat Prediction & Low Occupancy Identification)
  Module 3: Dynamic Fare and Happy Hours Optimization (Constrained Scenario Revenue Engine)
  Module 4: Advertisement-Based Revenue Generation (1000-Row Dataset Analytics & ML Predictor)
  Module 5: Group and Long-Duration Reservation Discounts (Tiered Bulk Discounts & Flexible Seating)
  Module 6: Vendor and Highway Hotel Tie-Ups (Katraj Ghat Food Plaza, Onboard Refreshments & Meal Vouchers)
  Module 7: Passenger Priority and Safety Management (Senior Citizens, Pregnant Women, Solo Female Safety & SOS)

Unified Revenue Formula:
  R_total = R_ticket + R_advertisement + R_vendor + R_partnership
"""

import json
import os
import random
import re
import sqlite3
import sys
import threading
import uuid
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# Module imports
import pricing as P
from ml_demand_forecasting import FORECAST_ENGINE, BUS_CAPACITY
from happy_hours_optimizer import HAPPY_HOURS_OPTIMIZER
from advertisement_service import AD_SERVICE
from group_booking_service import GROUP_SERVICE
from vendor_tieup_service import VENDOR_SERVICE
from passenger_safety_service import SAFETY_SERVICE
from dataset_service import DATASET_HUB
from vendor_bidding_service import VENDOR_BIDDING_SERVICE
from cargo_service import CARGO_SERVICE
from auth_service import AUTH_SERVICE

ROOT = os.path.realpath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(os.path.dirname(__file__), "msrtc.db")
IST = timezone(timedelta(hours=5, minutes=30))
LOCK = threading.Lock()
STATIC_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".csv": "text/csv; charset=utf-8"
}
MAX_SEATS = 28


class ApiError(Exception):
    def __init__(self, status, message, **extra):
        self.status, self.message, self.extra = status, message, extra


def connect():
    db = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.executescript("""
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
    """)
    return db


DB = connect()


def today_ist():
    return datetime.now(IST).date()


def taken_seats(trip):
    """Seats unavailable on a trip: simulated baseline + seats booked through this portal."""
    sched, frm, to, d = trip
    key = P.trip_key(sched["id"], frm, to, d)
    mine = {r["seat"] for r in DB.execute("SELECT seat FROM seat_taken WHERE trip_key=?", (key,))}
    return P.baseline_booked(sched, frm, to, d), mine


ADJACENT_COL = {"A": "B", "B": "A", "C": "D", "D": "C"}


def adjacent_seat(seat):
    """Return the paired adjacent seat in the 2+2 cabin layout (A<->B, C<->D)."""
    if not seat or len(seat) < 2 or seat[-1] not in ADJACENT_COL:
        return None
    return f"{seat[:-1]}{ADJACENT_COL[seat[-1]]}"


def ladies_seat_restrictions(trip_key):
    """Return (female_booked_set, ladies_only_adjacent_set) for a given trip_key."""
    female_seats = set()
    rows = DB.execute(
        "SELECT payload FROM bookings WHERE trip_key=? AND status!='CANCELLED'",
        (trip_key,)
    ).fetchall()
    for r in rows:
        try:
            b = json.loads(r["payload"])
            seats = b.get("seats") or []
            pax = b.get("passengers") or []
            for s, p in zip(seats, pax):
                if p.get("gender") == "Female":
                    female_seats.add(s)
        except Exception:
            continue
    adjacent_restricted = set()
    for s in female_seats:
        adj = adjacent_seat(s)
        if adj and adj not in female_seats:
            adjacent_restricted.add(adj)
    return female_seats, adjacent_restricted


def clock(d, hhmm, minutes=0):
    t = datetime.fromisoformat(f"{d}T{hhmm}:00").replace(tzinfo=IST)
    return t + timedelta(minutes=minutes)


def check_date(d):
    try:
        parsed = date.fromisoformat(d)
    except (TypeError, ValueError):
        raise ApiError(400, "Date must be YYYY-MM-DD.")
    if parsed < today_ist():
        raise ApiError(400, "Travel date cannot be in the past.")
    if parsed > today_ist() + timedelta(days=60):
        raise ApiError(400, "Bookings open up to 60 days ahead.")
    return d


def check_route(frm, to):
    if not frm or not to:
        raise ApiError(400, "Departure and destination are required.")
    if frm.strip().lower() == to.strip().lower():
        raise ApiError(400, "Departure and destination cannot be the same.")
    for stand in (frm, to):
        if stand not in P.COORDS:
            raise ApiError(400, f'"{stand}" is not a known stand. Pick one from the list.')


def search(frm, to, d, today=None):
    check_route(frm, to)
    today = today or today_ist()
    now = datetime.now(IST)
    buses = []
    
    for sched in P.SCHEDULE_BY_ID.values():
        if clock(d, sched["departure"]) <= now:
            continue  # already departed
            
        base_set, mine = taken_seats((sched, frm, to, d))
        booked = len(base_set | mine)
        q = P.quote(sched, frm, to, d, booked, today)
        mins = P.duration_minutes(sched["busType"], q["distanceKm"])
        arr = clock(d, sched["departure"], mins)
        occ = booked / P.CAPACITY
        
        # Module 1: ML Demand Forecasting
        ml_forecast = FORECAST_ENGINE.predict_demand(
            distance_km=q["distanceKm"],
            departure_time_str=sched["departure"],
            travel_date_str=d,
            bus_type=sched["busType"]
        )
        
        # Modules 2 & 3: Happy Hours Seat & Fare Optimization
        opt_res = HAPPY_HOURS_OPTIMIZER.optimize_trip_fare(
            base_fare=q["baseFare"],
            baseline_demand=ml_forecast["expected_demand"],
            bus_type=sched["busType"]
        )
        
        # If ML identifies this trip as eligible for Happy Hours discount
        # HIGH demand buses must NEVER show Happy Hours — show regular/surge fare instead
        is_high_demand = ml_forecast["demand_class"] == "HIGH" or occ >= 0.65
        is_happy_hours = (
            ml_forecast["is_happy_hours_eligible"]
            and opt_res["is_happy_hours_recommended"]
            and not is_high_demand
        )
        effective_fare = opt_res["optimal_fare"] if is_happy_hours else q["fare"]
        effective_multiplier = round(effective_fare / max(1, q["baseFare"]), 3)
        
        reasons = list(q["reasons"])
        if is_happy_hours:
            reasons.insert(0, f"⚡ Happy Hours Active: {opt_res['optimal_discount_pct']}% Off (Off-Peak Revenue Boost)")
            
        buses.append({
            **sched,
            **q,
            "from": frm,
            "to": to,
            "date": d,
            "fare": effective_fare,
            "originalFare": q["fare"],
            "multiplier": effective_multiplier,
            "reasons": reasons,
            "duration": f"{mins // 60}h {mins % 60:02d}m",
            "arrival": arr.strftime("%H:%M"),
            "arrivalNextDay": arr.date() > date.fromisoformat(d),
            "availableSeats": P.CAPACITY - booked,
            "occupancy": round(occ, 2),
            "demand": ml_forecast["demand_class"],
            "mlForecast": ml_forecast,
            "isHappyHours": is_happy_hours,
            "happyHoursDiscountPct": opt_res["optimal_discount_pct"] if is_happy_hours else 0,
            "happyHoursDetails": opt_res if is_happy_hours else None
        })
        
    buses.sort(key=lambda b: b["departure"])
    return {"from": frm, "to": to, "date": d, "buses": buses}


def validate_passengers(data):
    seats = data.get("seats") or []
    pax = data.get("passengers") or []
    if not 1 <= len(seats) <= MAX_SEATS or len(set(seats)) != len(seats):
        raise ApiError(400, f"Select 1 to {MAX_SEATS} different seats.")
    if any(s not in P.SEATS for s in seats):
        raise ApiError(400, "Unknown seat number.")
    if len(pax) != len(seats):
        raise ApiError(400, "Add one passenger for each seat.")
        
    clean = []
    for p in pax:
        name = re.sub(r"[<>&\"'`]", "", str(p.get("name", ""))).strip()[:60]
        try:
            age = int(p.get("age"))
        except (TypeError, ValueError):
            age = -1
        if not name or not 0 <= age <= 120 or p.get("gender") not in ("Male", "Female", "Other"):
            raise ApiError(400, "Each passenger needs a name, an age (0-120) and a gender.")
        clean.append({
            "name": name,
            "age": age,
            "gender": p["gender"],
            "priorityCategory": p.get("priorityCategory", "General")
        })
    return seats, clean


def new_booking_id():
    while True:
        bid = f"MSRTC-{today_ist().year}-{random.randint(10000, 99999)}"
        if not DB.execute("SELECT 1 FROM bookings WHERE id=?", (bid,)).fetchone():
            return bid


def create_booking(data, today, created_at=None):
    sched = P.SCHEDULE_BY_ID.get(data.get("scheduleId"))
    if not sched:
        raise ApiError(400, "Unknown bus.")
    frm = (data.get("from") or data.get("fromStand") or sched.get("origin") or sched.get("fromStop") or "").strip()
    to = (data.get("to") or data.get("toStand") or sched.get("destination") or sched.get("toStop") or "").strip()
    d = data.get("date") or today_ist().isoformat()
    check_route(frm, to)
    seats, pax = validate_passengers(data)
    method = data.get("paymentMethod")
    if method not in ("UPI", "Card", "Cash"):
        raise ApiError(400, "Choose a payment method.")
        
    user = data.get("user") or {}
    key = P.trip_key(sched["id"], frm, to, d)
    
    # Vendor Pre-orders (Module 6)
    vendor_items = data.get("vendorItemIds") or []
    vendor_order = VENDOR_SERVICE.calculate_order(vendor_items)
    
    # Priority & Welfare Category (Module 7)
    primary_category = pax[0].get("priorityCategory", "General") if pax else "General"
    
    # Group discount (Module 5)
    is_group = len(seats) >= 5
    group_quote = GROUP_SERVICE.calculate_group_quote(100, len(seats)) if is_group else None
    group_disc_pct = group_quote["total_discount_pct"] if group_quote else 0
    
    with LOCK:
        DB.execute("BEGIN IMMEDIATE")
        try:
            base_set, mine = taken_seats((sched, frm, to, d))
            clash = sorted(set(seats) & (base_set | mine))
            if clash:
                raise ApiError(409, "Some seats were just taken. Pick different seats.", seats=clash)

            _, ladies_restricted = ladies_seat_restrictions(key)
            for s, p in zip(seats, pax):
                if s in ladies_restricted and p.get("gender") != "Female":
                    raise ApiError(
                        400,
                        f"Seat {s} is adjacent to an already-booked Ladies seat and can only be booked by a Female passenger."
                    )
                
            q = P.quote(sched, frm, to, d, len(base_set | mine), today)
            
            # Check if Happy Hours is active on this trip
            ml_forecast = FORECAST_ENGINE.predict_demand(q["distanceKm"], sched["departure"], d, sched["busType"])
            opt_res = HAPPY_HOURS_OPTIMIZER.optimize_trip_fare(q["baseFare"], ml_forecast["expected_demand"], sched["busType"])
            is_happy_hours = ml_forecast["is_happy_hours_eligible"] and opt_res["is_happy_hours_recommended"]
            
            per_seat_fare = opt_res["optimal_fare"] if is_happy_hours else q["fare"]
            
            # Apply group discount if bulk booking
            if group_disc_pct > 0:
                per_seat_fare = round(per_seat_fare * (1.0 - (group_disc_pct / 100)))
                
            rows, subtotal, gst, ticket_total = P.price_passengers(per_seat_fare, pax)
            static_sub = P.price_passengers(q["baseFare"], pax)[1]
            
            vendor_total = vendor_order["total_amount"]
            grand_total = ticket_total + vendor_total
            
            bid = new_booking_id()
            mins = P.duration_minutes(sched["busType"], q["distanceKm"])
            dep, arr = clock(d, sched["departure"]), clock(d, sched["departure"], mins)
            pay_status = "PAY_AT_COUNTER" if method == "Cash" else "PAID"
            
            booking = {
                "bookingId": bid,
                "pnr": f"PNR{random.randint(1000000, 9999999)}",
                "userId": user.get("userId", "usr_guest"),
                "serverBacked": True,
                "busDetails": {
                    "busNumber": sched["busNumber"],
                    "busType": sched["busType"],
                    "operator": "MSRTC State Express Division"
                },
                "route": {
                    "from": frm,
                    "to": to,
                    "departureTime": dep.isoformat(),
                    "arrivalTime": arr.isoformat(),
                    "boardingPoint": f"{frm} Express Bay",
                    "droppingPoint": f"{to} Stand",
                    "distanceKm": q["distanceKm"],
                    "duration": f"{mins // 60}h {mins % 60:02d}m"
                },
                "seats": seats,
                "passengers": rows,
                "priorityCategory": primary_category,
                "isHappyHours": is_happy_hours,
                "happyHoursDiscount": opt_res["optimal_discount_pct"] if is_happy_hours else 0,
                "groupDiscountPct": group_disc_pct,
                "vendorOrder": vendor_order,
                "fare": {
                    "baseFare": subtotal,
                    "gst": gst,
                    "vendorTotal": vendor_total,
                    "totalAmount": grand_total,
                    "perSeatFare": per_seat_fare,
                    "multiplier": q["multiplier"],
                    "paymentMethod": {"UPI": "UPI Instant Pay", "Card": "Debit/Credit Card", "Cash": "Cash at Counter"}[method],
                    "paymentStatus": pay_status
                },
                "tripStatus": "UPCOMING",
                "bookedAt": created_at or datetime.now(IST).isoformat()
            }
            
            DB.execute("""
                INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                bid, key, sched["id"], sched["busType"], frm, to, d, len(seats),
                q["multiplier"], subtotal, static_sub, gst, vendor_total, grand_total,
                "CONFIRMED", 1 if is_happy_hours else 0,
                opt_res["optimal_discount_pct"] if is_happy_hours else 0,
                group_disc_pct, primary_category,
                booking["bookedAt"], json.dumps(booking)
            ))
            
            DB.executemany("INSERT INTO seat_taken VALUES (?,?,?)", [(key, s, bid) for s in seats])
            
            if vendor_items:
                v_id = f"VORD-{random.randint(10000, 99999)}"
                DB.execute("INSERT INTO vendor_orders VALUES (?,?,?,?,?,?,?)",
                           (v_id, bid, json.dumps(vendor_order["items"]), vendor_total,
                            vendor_order["msrtc_commission"], "CONFIRMED", booking["bookedAt"]))
                            
            DB.execute("COMMIT")
        except Exception:
            DB.execute("ROLLBACK")
            raise
    return booking


def cancel_booking(booking_id):
    with LOCK:
        row = DB.execute("SELECT * FROM bookings WHERE id=?", (booking_id,)).fetchone()
        if not row:
            raise ApiError(404, "Booking not found.")
        if row["status"] == "CANCELLED":
            raise ApiError(400, "This booking is already cancelled.")
        dep = datetime.fromisoformat(json.loads(row["payload"])["route"]["departureTime"])
        if dep <= datetime.now(IST):
            raise ApiError(400, "This trip has already departed.")
        paid = json.loads(row["payload"])["fare"]["paymentStatus"] == "PAID"
        DB.execute("UPDATE bookings SET status='CANCELLED' WHERE id=?", (booking_id,))
        DB.execute("DELETE FROM seat_taken WHERE booking_id=?", (booking_id,))
    return {"bookingId": booking_id, "paymentStatus": "REFUND_INITIATED" if paid else "CANCELLED"}


def get_unified_revenue():
    """
    Implements: R_total = R_ticket + R_advertisement + R_vendor + R_partnership
    """
    rows = DB.execute("SELECT * FROM bookings WHERE status!='CANCELLED'").fetchall()
    cancelled = DB.execute("SELECT COUNT(*) FROM bookings WHERE status='CANCELLED'").fetchone()[0]
    
    r_ticket_dyn = sum(r["dynamic_subtotal"] for r in rows)
    r_ticket_sta = sum(r["static_subtotal"] for r in rows)
    seats = sum(r["seat_count"] for r in rows)
    
    happy_hours_bookings = sum(1 for r in rows if r["is_happy_hours"] == 1)
    happy_hours_revenue = sum(r["dynamic_subtotal"] for r in rows if r["is_happy_hours"] == 1)
    
    # 2. Advertisement Revenue (from dataset + live DB ad bookings)
    ad_analytics = AD_SERVICE.get_analytics()
    live_ad_rev = DB.execute("SELECT COALESCE(SUM(total_fee), 0) FROM ad_bookings WHERE status='CONFIRMED'").fetchone()[0]
    r_advertisement = round(ad_analytics.get("total_revenue", 0.0) + float(live_ad_rev or 0.0), 2)
    
    # 3. Vendor Commission Revenue
    v_rows = DB.execute("SELECT * FROM vendor_orders WHERE status='CONFIRMED'").fetchall()
    r_vendor_commission = sum(r["commission"] for r in v_rows)
    r_vendor_gross = sum(r["total_amount"] for r in v_rows)
    
    # 4. Highway Partnership Contract Fees
    # 3 rest-stops: Katraj Ghat (35k), Karad (28k), Lonavala (45k) monthly contract fee
    r_partnership = 35000 + 28000 + 45000 # 1,08,000 INR
    
    # Unified Total Revenue
    r_total = round(r_ticket_dyn + r_advertisement + r_vendor_commission + r_partnership, 2)
    
    # Groupings for charts
    def group(keyf):
        out = {}
        for r in rows:
            g = out.setdefault(keyf(r), {"revenue": 0, "static": 0, "seats": 0, "multSum": 0, "n": 0})
            g["revenue"] += r["dynamic_subtotal"]
            g["static"] += r["static_subtotal"]
            g["seats"] += r["seat_count"]
            g["multSum"] += r["multiplier"]
            g["n"] += 1
        return [{"name": k, "revenue": v["revenue"], "static": v["static"], "seats": v["seats"],
                 "avgMultiplier": round(v["multSum"] / max(1, v["n"]), 3)} for k, v in out.items()]

    by_type = sorted(group(lambda r: r["bus_type"]), key=lambda x: -x["revenue"])
    routes = sorted(group(lambda r: f'{r["from_loc"].split(" (")[0]} → {r["to_loc"].split(" (")[0]}'),
                    key=lambda x: -x["revenue"])[:6]
    days = sorted(group(lambda r: r["travel_date"]), key=lambda x: x["name"])[-14:]
    
    datasets_summary = DATASET_HUB.get_all_summaries()
    
    return {
        "unified_total_revenue": r_total,
        "combined_dataset_economic_volume": datasets_summary["combined_economic_volume"],
        "datasets_summary": datasets_summary,
        "revenue_formula": "R_total = R_ticket + R_advertisement + R_vendor + R_partnership",
        "breakdown": {
            "ticket_revenue": r_ticket_dyn,
            "advertisement_revenue": r_advertisement,
            "vendor_commission": round(r_vendor_commission, 2),
            "vendor_gross_sales": round(r_vendor_gross, 2),
            "partnership_contract_fees": r_partnership
        },
        "ticket_kpis": {
            "total_bookings": len(rows),
            "cancelled_bookings": cancelled,
            "seats_sold": seats,
            "baseline_static_revenue": r_ticket_sta,
            "net_ticket_uplift": r_ticket_dyn - r_ticket_sta,
            "uplift_pct": round((r_ticket_dyn - r_ticket_sta) / max(1, r_ticket_sta) * 100, 1),
            "happy_hours_bookings": happy_hours_bookings,
            "happy_hours_revenue": happy_hours_revenue,
            "byBusType": by_type,
            "topRoutes": routes,
            "byDay": days
        },
        "ad_summary": {
            "total_campaigns": ad_analytics.get("total_campaigns", 1000),
            "total_qr_scans": ad_analytics.get("total_scans", 0),
            "total_ad_fees": ad_analytics.get("total_fees", 0.0),
            "top_routes": ad_analytics.get("top_routes", [])[:4]
        },
        "vendor_summary": {
            "pre_orders_count": len(v_rows),
            "rest_stops_count": len(VENDOR_SERVICE.HIGHWAY_PARTNERS),
            "commission_earned": round(r_vendor_commission, 2)
        }
    }


def seed_database(n=120):
    """Fills database with realistic bookings, vendor orders, and historical trips."""
    existing = DB.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
    if existing >= 30:
        return
        
    print(f"[Seed] Seeding database with {n} demo bookings and vendor orders...")
    rng = random.Random(42)
    sample_routes = [
        ("Kolhapur CBS (Central Bus Stand)", "Pune (Swargate)"),
        ("Kolhapur CBS (Central Bus Stand)", "Ichalkaranji Central Stand"),
        ("Kolhapur CBS (Central Bus Stand)", "Mumbai (Dadar)"),
        ("Pune (Swargate)", "Mumbai (Dadar)"),
        ("Kolhapur CBS (Central Bus Stand)", "Sangli Central Stand"),
        ("Pune (Swargate)", "Nashik (CBS)"),
        ("Kolhapur CBS (Central Bus Stand)", "Satara Central")
    ]
    pax_names = [
        ("Sunil Patil", "Male", 45), ("Anjali Deshmukh", "Female", 29),
        ("Ramesh Kulkarni", "Male", 64), ("Pooja Shinde", "Female", 24),
        ("Vikram Chavan", "Male", 35), ("Mangal Gaikwad", "Female", 62),
        ("Suresh More", "Male", 52), ("Deepika Pawar", "Female", 31)
    ]
    sched_list = list(P.SCHEDULES)
    today = today_ist()
    
    for i in range(n):
        frm, to = rng.choice(sample_routes)
        sched_tuple = rng.choice(sched_list)
        sched = P.SCHEDULE_BY_ID[sched_tuple[0]]
        
        offset = rng.randint(-10, 25)
        trip_d = (today + timedelta(days=offset)).isoformat()
        
        # Pick 1 to 4 seats
        k = rng.choice([1, 1, 2, 2, 3, 4])
        selected_seats = rng.sample(P.SEATS, k)
        
        passengers = []
        for s in selected_seats:
            name, gen, age = rng.choice(pax_names)
            p_cat = "General"
            if age >= 60:
                p_cat = "Senior Citizen (60+)"
            elif gen == "Female" and rng.random() < 0.4:
                p_cat = "Solo Female Traveler"
            passengers.append({"name": name, "gender": gen, "age": age, "priorityCategory": p_cat})
            
        # Vendor items
        vendor_items = []
        if rng.random() < 0.6:
            vendor_items.append("ITEM_WATER")
        if rng.random() < 0.35:
            vendor_items.append("ITEM_KATRAJ_THALI")
        if rng.random() < 0.3:
            vendor_items.append("ITEM_SNACK_BOX")
            
        try:
            created_at = (datetime.now(IST) - timedelta(days=max(0, -offset), hours=rng.randint(1, 12))).isoformat()
            create_booking({
                "scheduleId": sched["id"],
                "from": frm,
                "to": to,
                "date": trip_d,
                "seats": selected_seats,
                "passengers": passengers,
                "paymentMethod": rng.choice(["UPI", "UPI", "Card", "Cash"]),
                "vendorItemIds": vendor_items
            }, today=today, created_at=created_at)
        except Exception:
            pass
            
    print(f"[Seed] Completed! Database now has {DB.execute('SELECT COUNT(*) FROM bookings').fetchone()[0]} bookings.")


class Handler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            raise ApiError(400, "Malformed JSON body.")

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path.rstrip("/")
        qs = parse_qs(u.query)

        try:
            if path == "/api/health":
                self.send_json(200, {"status": "UP", "time": datetime.now(IST).isoformat()})
            elif path == "/api/locations":
                self.send_json(200, sorted(P.COORDS.keys()))
            elif path == "/api/search":
                frm = (qs.get("from") or [""])[0]
                to = (qs.get("to") or [""])[0]
                d = check_date((qs.get("date") or [""])[0])
                self.send_json(200, search(frm, to, d))
            elif path == "/api/seats":
                sched_id = (qs.get("scheduleId") or [""])[0]
                sched = P.SCHEDULE_BY_ID.get(sched_id)
                if not sched:
                    raise ApiError(400, "Unknown bus schedule.")
                frm = (qs.get("from") or [""])[0]
                to = (qs.get("to") or [""])[0]
                d = check_date((qs.get("date") or [""])[0])
                base, mine = taken_seats((sched, frm, to, d))
                key = P.trip_key(sched["id"], frm, to, d)
                female_booked, ladies_adj = ladies_seat_restrictions(key)
                taken_all = base | mine
                self.send_json(200, {
                    "taken": sorted(taken_all),
                    "femaleBooked": sorted(female_booked),
                    "ladiesOnlyAdjacent": sorted(ladies_adj - taken_all),
                    "total": P.CAPACITY
                })
            elif path == "/api/quote":
                sched_id = (qs.get("scheduleId") or [""])[0]
                sched = P.SCHEDULE_BY_ID.get(sched_id)
                if not sched:
                    raise ApiError(400, "Unknown bus schedule.")
                frm = (qs.get("from") or [""])[0].strip()
                to = (qs.get("to") or [""])[0].strip()
                check_route(frm, to)
                d = check_date((qs.get("date") or [today_ist().isoformat()])[0])
                today = today_ist()
                base, mine = taken_seats((sched, frm, to, d))
                taken_all = base | mine
                booked = len(taken_all)
                occ = booked / P.CAPACITY
                q = P.quote(sched, frm, to, d, booked, today)
                mins = P.duration_minutes(sched["busType"], q["distanceKm"])
                arr = clock(d, sched["departure"], mins)
                ml_forecast = FORECAST_ENGINE.predict_demand(q["distanceKm"], sched["departure"], d, sched["busType"])
                opt_res = HAPPY_HOURS_OPTIMIZER.optimize_trip_fare(q["baseFare"], ml_forecast["expected_demand"], sched["busType"])
                is_high_demand = ml_forecast["demand_class"] == "HIGH" or occ >= 0.65
                is_happy_hours = (
                    ml_forecast["is_happy_hours_eligible"]
                    and opt_res["is_happy_hours_recommended"]
                    and not is_high_demand
                )
                effective_fare = opt_res["optimal_fare"] if is_happy_hours else q["fare"]
                key = P.trip_key(sched["id"], frm, to, d)
                female_booked, ladies_adj = ladies_seat_restrictions(key)
                self.send_json(200, {
                    "from": frm,
                    "to": to,
                    "distanceKm": q["distanceKm"],
                    "baseFare": q["baseFare"],
                    "fare": effective_fare,
                    "originalFare": q["fare"],
                    "isHappyHours": is_happy_hours,
                    "happyHoursDiscountPct": opt_res["optimal_discount_pct"] if is_happy_hours else 0,
                    "duration": f"{mins // 60}h {mins % 60:02d}m",
                    "arrival": arr.strftime("%H:%M"),
                    "taken": sorted(taken_all),
                    "ladiesOnlyAdjacent": sorted(ladies_adj - taken_all)
                })
            elif path == "/api/revenue/unified" or path == "/api/revenue":
                self.send_json(200, get_unified_revenue())
            elif path == "/api/ml/models":
                self.send_json(200, FORECAST_ENGINE.get_model_comparison())
            elif path == "/api/ads/analytics":
                self.send_json(200, AD_SERVICE.get_analytics())
            elif path == "/api/ads/list":
                self.send_json(200, AD_SERVICE.get_sample_ads())
            elif path == "/api/ads/bookings":
                rows = DB.execute("SELECT * FROM ad_bookings ORDER BY created_at DESC").fetchall()
                self.send_json(200, [dict(r) for r in rows])
            elif path == "/api/vendors/catalog":
                self.send_json(200, VENDOR_SERVICE.get_catalog())
            elif path == "/api/group/quote":
                pax = int((qs.get("passengers") or [5])[0])
                fare = int((qs.get("fare") or [350])[0])
                days = int((qs.get("days") or [1])[0])
                self.send_json(200, GROUP_SERVICE.calculate_group_quote(fare, pax, days))
            elif path == "/api/happyhours/scenarios":
                base_fare = int((qs.get("baseFare") or [300])[0])
                baseline_demand = int((qs.get("demand") or [10])[0])
                self.send_json(200, HAPPY_HOURS_OPTIMIZER.optimize_trip_fare(base_fare, baseline_demand))
            elif path == "/api/datasets/summary":
                self.send_json(200, DATASET_HUB.get_all_summaries())
            elif path == "/api/datasets/view":
                fname = (qs.get("file") or ["passenger_demand.csv"])[0]
                lim = int((qs.get("limit") or [25])[0])
                q = (qs.get("search") or [None])[0]
                self.send_json(200, DATASET_HUB.get_dataset_slice(fname, limit=lim, search_query=q))
            elif path == "/api/vendors/bids":
                self.send_json(200, VENDOR_BIDDING_SERVICE.list_stalls_for_bidding())
            elif path == "/api/vendors/registered":
                self.send_json(200, VENDOR_BIDDING_SERVICE.list_registered_vendors())
            elif path == "/api/cargo/track":
                q = (qs.get("id") or qs.get("query") or [""])[0]
                self.send_json(200, CARGO_SERVICE.track_cargo(q))
            elif path == "/api/cargo/all":
                self.send_json(200, CARGO_SERVICE.list_all_cargo())
            elif path == "/api/safety/women-dashboard":
                self.send_json(200, SAFETY_SERVICE.get_women_safety_dashboard())
            elif path == "/api/auth/verify":
                token = (qs.get("token") or [""])[0]
                user = AUTH_SERVICE.verify(token)
                if user:
                    self.send_json(200, {"valid": True, "user": user})
                else:
                    self.send_json(401, {"valid": False, "error": "Invalid or expired session."})
            else:
                self.serve_static(u.path)
        except ApiError as e:
            self.send_json(e.status, {"error": e.message, **e.extra})
        except ValueError as e:
            self.send_json(400, {"error": str(e)})
        except Exception as e:
            self.send_json(500, {"error": f"Internal server error: {str(e)}"})

    def do_POST(self):
        u = urlparse(self.path)
        path = u.path.rstrip("/")
        try:
            body = self.read_json_body()
            if path == "/api/book":
                self.send_json(201, create_booking(body, today=today_ist()))
            elif path == "/api/cancel":
                bid = body.get("bookingId")
                if not bid:
                    raise ApiError(400, "bookingId is required.")
                self.send_json(200, cancel_booking(bid))
            elif path == "/api/ml/forecast":
                dist = body.get("distanceKm", 150)
                time_str = body.get("departureTime", "14:00")
                d_str = body.get("travelDate", today_ist().isoformat())
                b_type = body.get("busType", "Shivshahi (AC Seater)")
                self.send_json(200, FORECAST_ENGINE.predict_demand(dist, time_str, d_str, b_type))
            elif path == "/api/ads/predict":
                pos = body.get("position", "Front")
                ctype = body.get("campaignType", "Banner")
                dur = int(body.get("durationDays", 30))
                self.send_json(200, AD_SERVICE.predict_revenue(pos, ctype, dur))
            elif path == "/api/ads/scan":
                ad_id = body.get("advertisementId", "AD00001")
                self.send_json(200, AD_SERVICE.simulate_qr_scan(ad_id))
            elif path == "/api/ads/book":
                brand = (body.get("brandName") or "").strip()
                contact = (body.get("contactName") or "").strip()
                phone = (body.get("contactPhone") or "").strip()
                boarding = (body.get("boardingPoint") or "").strip()
                dropping = (body.get("droppingPoint") or "").strip()
                num_buses = int(body.get("numBuses") or 1)
                pos = body.get("position", "Front")
                ctype = body.get("campaignType", "Banner")
                dur = int(body.get("durationDays") or 30)

                if not brand or not boarding or not dropping:
                    raise ApiError(400, "Brand name, boarding point, and dropping point are required.")
                if boarding == dropping:
                    raise ApiError(400, "Boarding point and dropping point must be different.")
                if not 1 <= num_buses <= 200:
                    raise ApiError(400, "Number of buses must be between 1 and 200.")
                if not 1 <= dur <= 365:
                    raise ApiError(400, "Duration must be between 1 and 365 days.")

                pos_cfg = AD_SERVICE.POSITION_RATES.get(pos, AD_SERVICE.POSITION_RATES["Middle"])
                type_factor = AD_SERVICE.CAMPAIGN_FACTORS.get(ctype, 1.0)
                rate_per_bus_day = round(pos_cfg["base_daily_fee"] * type_factor, 2)
                total_fee = round(rate_per_bus_day * num_buses * dur, 2)
                ad_bid = f"ADB-{uuid.uuid4().hex[:8].upper()}"
                created_at = datetime.now(IST).isoformat(timespec="seconds")

                with DB:
                    DB.execute(
                        "INSERT INTO ad_bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (ad_bid, brand, contact, phone, boarding, dropping, num_buses,
                         pos, ctype, dur, rate_per_bus_day, total_fee, "CONFIRMED", created_at)
                    )
                self.send_json(201, {
                    "id": ad_bid,
                    "brand_name": brand,
                    "contact_name": contact,
                    "contact_phone": phone,
                    "boarding_point": boarding,
                    "dropping_point": dropping,
                    "num_buses": num_buses,
                    "position": pos,
                    "campaign_type": ctype,
                    "duration_days": dur,
                    "rate_per_bus_day": rate_per_bus_day,
                    "total_fee": total_fee,
                    "status": "CONFIRMED",
                    "created_at": created_at
                })
            elif path == "/api/ads/cancel":
                ad_bid = body.get("bookingId")
                if not ad_bid:
                    raise ApiError(400, "bookingId is required.")
                with DB:
                    row = DB.execute("SELECT * FROM ad_bookings WHERE id=?", (ad_bid,)).fetchone()
                    if not row:
                        raise ApiError(404, "Advertisement booking not found.")
                    DB.execute("UPDATE ad_bookings SET status='CANCELLED' WHERE id=?", (ad_bid,))
                self.send_json(200, {"id": ad_bid, "status": "CANCELLED"})
            elif path == "/api/safety/sos":
                bid = body.get("bookingId", "MSRTC-SOS-001")
                bus_no = body.get("busNumber", "MH-09-EM-8834")
                self.send_json(200, SAFETY_SERVICE.trigger_emergency_sos(bid, bus_no))
            elif path == "/api/priority/check":
                cat = body.get("category", "General")
                self.send_json(200, SAFETY_SERVICE.get_priority_recommendation(cat))
            elif path == "/api/safety/safe-drop":
                self.send_json(200, SAFETY_SERVICE.request_safe_drop(body))
            elif path == "/api/safety/share-trip":
                self.send_json(200, SAFETY_SERVICE.share_journey_tracking(body))
            elif path == "/api/vendors/bid":
                stall_id = body.get("stallId")
                v_name = body.get("vendorName")
                v_phone = body.get("vendorPhone")
                amt = body.get("bidAmount")
                self.send_json(200, VENDOR_BIDDING_SERVICE.place_bid(stall_id, v_name, v_phone, amt))
            elif path == "/api/vendors/register":
                self.send_json(201, VENDOR_BIDDING_SERVICE.register_vendor(body))
            elif path == "/api/cargo/quote":
                f_std = body.get("fromStand", "Kolhapur CBS (Central Bus Stand)")
                t_std = body.get("toStand", "Pune (Swargate)")
                w_kg = float(body.get("weightKg", 5))
                cat = body.get("category", "General Commercial")
                spd = body.get("speedTier", "STANDARD")
                pk = int(body.get("packagesCount", 1))
                is_lug = bool(body.get("isExcessLuggage", False))
                self.send_json(200, CARGO_SERVICE.calculate_tariff(f_std, t_std, w_kg, cat, spd, pk, is_lug))
            elif path == "/api/cargo/book":
                self.send_json(201, CARGO_SERVICE.book_cargo(body))
            elif path == "/api/auth/register":
                self.send_json(201, AUTH_SERVICE.register(body))
            elif path == "/api/auth/login":
                self.send_json(200, AUTH_SERVICE.login(body))
            elif path == "/api/auth/logout":
                token = body.get("token")
                self.send_json(200, AUTH_SERVICE.logout(token))
            elif path == "/api/auth/profile":
                token = body.get("token")
                self.send_json(200, AUTH_SERVICE.update_profile(token, body))
            else:
                raise ApiError(404, "Endpoint not found.")
        except ApiError as e:
            self.send_json(e.status, {"error": e.message, **e.extra})
        except ValueError as e:
            self.send_json(400, {"error": str(e)})
        except Exception as e:
            self.send_json(500, {"error": f"Internal server error: {str(e)}"})

    def serve_static(self, rel_path):
        if rel_path in ("", "/"):
            rel_path = "/index.html"
            
        clean_rel = rel_path.lstrip("/").split("?")[0]
        # Check root directory first, then static directory
        file_path = os.path.realpath(os.path.join(ROOT, clean_rel))
        
        if not file_path.startswith(ROOT) or not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return
            
        ext = os.path.splitext(file_path)[1].lower()
        mime = STATIC_TYPES.get(ext, "application/octet-stream")
        
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(content)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())


def run(port=8000):
    seed_database(100)
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"============================================================")
    print(f"MSRTC SMART TRANSIT • REVENUE OPTIMIZATION SYSTEM ('HAPPY HOURS')")
    print(f"Backend listening on http://localhost:{port}")
    print(f"Ready with ML Demand Forecasting, Ads, Vendors, & Happy Hours!")
    print(f"============================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()


if __name__ == "__main__":
    p = 8000
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        p = int(sys.argv[1])
    run(p)
