"""
MSRTC Smart Transit - Courier, Cargo & Luggage Booking Service
Title: MSRTC Vahatuk (महाराष्ट्र राज्य मार्ग परिवहन महामंडळ पार्सल व मालवाहतूक सेवा)

Features:
1. Parcel & Courier Booking:
   - Door-to-Stand or Stand-to-Stand parcel delivery across all MSRTC bus routes.
   - Dynamic cargo tariff based on distance, weight brackets, category & express tier.
   - Unique Consignment Tracking Note (AWB): MSRTC-CRG-2026-XXXXX.
   - Real-time consignment tracking with transit milestones.
2. Extra Passenger Luggage Booking:
   - Automated allowance calculator (15 kg complimentary per ticket).
   - Excess baggage fee calculation (₹10/kg) and bulky cargo tags (bicycles, agricultural crates).
"""

import json
import sqlite3
import os
import random
from datetime import datetime, timezone, timedelta
import pricing as P

IST = timezone(timedelta(hours=5, minutes=30))
DB_PATH = os.path.join(os.path.dirname(__file__), "msrtc.db")


def _haversine_km(lat1, lon1, lat2, lon2):
    """Straight-line great-circle distance in km."""
    import math
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 12742 * math.asin(math.sqrt(h))


class CargoService:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS cargo_bookings (
                id TEXT PRIMARY KEY,
                booking_type TEXT NOT NULL, -- 'PARCEL' or 'EXCESS_LUGGAGE'
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
                status TEXT DEFAULT 'BOOKED', -- 'BOOKED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'
                current_location TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cargo_milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cargo_id TEXT NOT NULL,
                milestone_title TEXT NOT NULL,
                location_name TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status_key TEXT NOT NULL,
                is_completed INTEGER DEFAULT 1,
                FOREIGN KEY (cargo_id) REFERENCES cargo_bookings(id)
            );
            """)
            self._seed_sample_cargo(conn)

    def _seed_sample_cargo(self, conn):
        row = conn.execute("SELECT id FROM cargo_bookings LIMIT 1").fetchone()
        if not row:
            cid = "MSRTC-CRG-2026-10492"
            now = datetime.now(IST)
            t_booked = (now - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S")
            t_loaded = (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
            t_transit = (now - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S")

            conn.execute("""
            INSERT INTO cargo_bookings (
                id, booking_type, sender_name, sender_phone, sender_address,
                receiver_name, receiver_phone, from_stand, to_stand, distance_km,
                weight_kg, packages_count, cargo_category, speed_tier, declared_value,
                base_freight, distance_charge, surcharge, gst, total_amount,
                bus_schedule_id, status, current_location, created_at
            ) VALUES (?, 'PARCEL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cid, "Ramesh Kulkarni", "+91 98221 11223", "Laxmipuri, Kolhapur",
                "Amit Deshmukh", "+91 94220 99887", "Kolhapur CBS (Central Bus Stand)",
                "Pune (Swargate)", 233.0, 12.5, 2, "Textile & Garments", "EXPRESS", 5000,
                140, 35, 25, 10, 210, "SCHED-MSRTC-001", "IN_TRANSIT", "Katraj Ghat Highway Rest-Stop", t_booked
            ))

            milestones = [
                (cid, "Consignment Booked & Parcel Receipt Issued", "Kolhapur CBS Booking Office", t_booked, "BOOKED", 1),
                (cid, "Parcel Inspected & Loaded into Bus Luggage Boot", "Kolhapur Bus Bay #4", t_loaded, "LOADED", 1),
                (cid, "In Transit via Highway Rest-Stop", "Katraj Ghat Plaza (Pune-Kolhapur NH48)", t_transit, "IN_TRANSIT", 1),
                (cid, "Arrived at Destination Stand (Expected)", "Pune (Swargate) Cargo Depot", "Upcoming", "ARRIVED", 0),
                (cid, "Final Handover & OTP Delivery Verification", "Receiver Collection Counter", "Pending", "DELIVERED", 0)
            ]
            conn.executemany("""
            INSERT INTO cargo_milestones (cargo_id, milestone_title, location_name, timestamp, status_key, is_completed)
            VALUES (?, ?, ?, ?, ?, ?)
            """, milestones)

    def calculate_tariff(self, from_stand, to_stand, weight_kg, category="General Commercial", speed_tier="STANDARD", packages=1, is_excess_luggage=False):
        """Calculate cargo / courier / excess luggage price."""
        from_coord = P.COORDS.get(from_stand)
        to_coord = P.COORDS.get(to_stand)
        if from_coord and to_coord:
            dist = round(_haversine_km(from_coord[0], from_coord[1], to_coord[0], to_coord[1]) * 1.25, 1)
        else:
            dist = 150.0

        weight_kg = max(0.5, float(weight_kg))
        packages = max(1, int(packages))

        if is_excess_luggage:
            # Free allowance is 15 kg. Excess charged at ₹10 per kg + distance scale
            excess_weight = max(0.0, weight_kg - 15.0)
            base_freight = int(excess_weight * 10)
            dist_charge = int((dist / 100.0) * 15) if excess_weight > 0 else 0
            surcharge = 0
            subtotal = base_freight + dist_charge
            gst = max(5, int(subtotal * 0.05)) if subtotal > 0 else 0
            total = subtotal + gst
            return {
                "distanceKm": dist,
                "weightKg": weight_kg,
                "freeAllowanceKg": 15.0,
                "excessWeightKg": excess_weight,
                "baseFreight": base_freight,
                "distanceCharge": dist_charge,
                "surcharge": surcharge,
                "gst": gst,
                "total": total,
                "isExcessLuggage": True
            }

        # Standalone Parcel & Courier Tariff
        # Weight tiers:
        if weight_kg <= 2.0:
            base = 50
        elif weight_kg <= 5.0:
            base = 80
        elif weight_kg <= 15.0:
            base = 140
        elif weight_kg <= 30.0:
            base = 240
        elif weight_kg <= 50.0:
            base = 360
        else:
            base = 360 + int((weight_kg - 50.0) * 7)

        # Distance surcharge
        dist_charge = int((dist / 100.0) * 20)

        # Category surcharge
        cat_surcharges = {
            "Documents & Letters": 0,
            "Textile & Garments": 15,
            "Electronics & Gadgets (Fragile)": 40,
            "Agricultural & Kolhapuri Jaggery": 20,
            "Medicines & Healthcare": 25,
            "Auto Spare Parts": 35,
            "General Commercial": 20
        }
        surcharge = cat_surcharges.get(category, 20)

        # Speed Tier
        if speed_tier == "EXPRESS":
            surcharge += 45

        subtotal = base + dist_charge + surcharge + (packages - 1) * 15
        gst = max(5, int(subtotal * 0.05))
        total = subtotal + gst

        return {
            "distanceKm": dist,
            "weightKg": weight_kg,
            "packages": packages,
            "category": category,
            "speedTier": speed_tier,
            "baseFreight": base,
            "distanceCharge": dist_charge,
            "surcharge": surcharge,
            "gst": gst,
            "total": total,
            "isExcessLuggage": False
        }

    def book_cargo(self, data):
        """Register a new parcel/cargo or excess luggage shipment."""
        b_type = data.get("bookingType", "PARCEL")
        s_name = data.get("senderName", "").strip()
        s_phone = data.get("senderPhone", "").strip()
        r_name = data.get("receiverName", "").strip()
        r_phone = data.get("receiverPhone", "").strip()
        from_stand = data.get("fromStand", "").strip()
        to_stand = data.get("toStand", "").strip()

        if not s_name or not s_phone or not r_name or not r_phone:
            raise ValueError("Sender Name, Sender Phone, Receiver Name, and Receiver Phone are required.")

        if not from_stand or not to_stand:
            raise ValueError("Origin and destination bus stands are required.")

        if from_stand.strip().lower() == to_stand.strip().lower():
            raise ValueError("Origin and destination stands cannot be the same.")

        weight = float(data.get("weightKg", 5.0))
        packages = int(data.get("packagesCount", 1))
        category = data.get("category", "General Commercial")
        speed = data.get("speedTier", "STANDARD")
        is_excess = (b_type == "EXCESS_LUGGAGE")

        tariff = self.calculate_tariff(
            from_stand=from_stand,
            to_stand=to_stand,
            weight_kg=weight,
            category=category,
            speed_tier=speed,
            packages=packages,
            is_excess_luggage=is_excess
        )

        year = datetime.now(IST).year
        rnd = random.randint(10000, 99999)
        prefix = "MSRTC-LUG" if is_excess else "MSRTC-CRG"
        cid = f"{prefix}-{year}-{rnd}"
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO cargo_bookings (
                id, booking_type, sender_name, sender_phone, sender_address,
                receiver_name, receiver_phone, from_stand, to_stand, distance_km,
                weight_kg, packages_count, cargo_category, speed_tier, declared_value,
                base_freight, distance_charge, surcharge, gst, total_amount,
                bus_schedule_id, status, current_location, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cid, b_type, s_name, s_phone, data.get("senderAddress", ""),
                r_name, r_phone, from_stand, to_stand, tariff["distanceKm"],
                weight, packages, category, speed, int(data.get("declaredValue", 1000)),
                tariff["baseFreight"], tariff["distanceCharge"], tariff["surcharge"],
                tariff["gst"], tariff["total"], data.get("scheduleId", "SCHED-MSRTC-001"),
                "BOOKED", f"{from_stand} Booking Office", now_str
            ))

            # Initial milestone
            conn.execute("""
            INSERT INTO cargo_milestones (cargo_id, milestone_title, location_name, timestamp, status_key, is_completed)
            VALUES (?, 'Consignment Registered & Waybill Issued', ?, ?, 'BOOKED', 1)
            """, (cid, f"{from_stand} MSRTC Parcel Desk", now_str))

            conn.execute("""
            INSERT INTO cargo_milestones (cargo_id, milestone_title, location_name, timestamp, status_key, is_completed)
            VALUES (?, 'Assigned to Scheduled Transit Bus', ?, 'In Queue', 'LOADED', 0)
            """, (cid, f"{from_stand} Loading Platform",))

            conn.execute("""
            INSERT INTO cargo_milestones (cargo_id, milestone_title, location_name, timestamp, status_key, is_completed)
            VALUES (?, 'En-Route via Highway Corridor & Katraj Ghat', 'Transit Corridor NH48', 'Scheduled', 'IN_TRANSIT', 0)
            """, (cid,))

            conn.execute("""
            INSERT INTO cargo_milestones (cargo_id, milestone_title, location_name, timestamp, status_key, is_completed)
            VALUES (?, 'Arrival & Delivery at Destination Bus Stand', ?, 'Estimated in 4-6 Hours', 'ARRIVED', 0)
            """, (cid, to_stand))

        return {
            "success": True,
            "consignmentId": cid,
            "trackingNumber": cid,
            "message": f"Parcel successfully booked! Consignment tracking number: {cid}",
            "from": from_stand,
            "to": to_stand,
            "tariff": tariff,
            "sender": {"name": s_name, "phone": s_phone},
            "receiver": {"name": r_name, "phone": r_phone},
            "createdAt": now_str
        }

    def track_cargo(self, query):
        """Track cargo by Consignment ID or Sender/Receiver Phone number."""
        query = (query or "").strip()
        if not query:
            raise ValueError("Tracking ID or Phone number is required.")

        with self.get_connection() as conn:
            cargo = conn.execute("""
            SELECT * FROM cargo_bookings
            WHERE id = ? OR sender_phone = ? OR receiver_phone = ?
            ORDER BY created_at DESC LIMIT 1
            """, (query, query, query)).fetchone()

            if not cargo:
                # Return sample default tracking if not found
                cargo = conn.execute("SELECT * FROM cargo_bookings ORDER BY created_at DESC LIMIT 1").fetchone()

            if not cargo:
                raise ValueError(f"No consignment found matching '{query}'.")

            cargo_dict = dict(cargo)
            milestones = conn.execute(
                "SELECT * FROM cargo_milestones WHERE cargo_id = ? ORDER BY id ASC",
                (cargo_dict["id"],)
            ).fetchall()

            cargo_dict["milestones"] = [dict(m) for m in milestones]
            return cargo_dict

    def list_all_cargo(self, limit=15):
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM cargo_bookings ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            return [dict(r) for r in rows]


CARGO_SERVICE = CargoService()
