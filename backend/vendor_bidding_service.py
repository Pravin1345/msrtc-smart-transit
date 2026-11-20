"""
MSRTC Smart Transit - Restaurant Registration & Stall Bidding Service (Module 6)
Title: Rest-Stop Vendor Onboarding & Highway Food Plaza Tender Bidding Engine

Features:
1. Restaurant & Vendor Registration:
   - Onboards food plazas, pure veg thali restaurants, tea stalls along Maharashtra corridors.
   - Captures FSSAI license, amenities (EV charging, clean restrooms), capacity, agreed commission (10-15%).
2. Tender & Stall Bidding System:
   - Auctions prime highway rest-stop stalls (e.g., Katraj Ghat Plaza NH48, Karad Bypass, Satara Midway).
   - Real-time competitive bidding with base reserve price, minimum bid increments, and bid logging.
"""

import json
import sqlite3
import os
import random
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
DB_PATH = os.path.join(os.path.dirname(__file__), "msrtc.db")


class VendorBiddingService:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._init_db()
        self._seed_sample_stalls()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self.get_connection() as conn:
            conn.executescript("""
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stall_id TEXT NOT NULL,
                vendor_name TEXT NOT NULL,
                vendor_phone TEXT NOT NULL,
                bid_amount INTEGER NOT NULL,
                bid_timestamp TEXT NOT NULL,
                FOREIGN KEY (stall_id) REFERENCES rest_stop_stalls(id)
            );
            """)

    def _seed_sample_stalls(self):
        sample_stalls = [
            {
                "id": "STALL-KATRAJ-01",
                "stall_number": "Stall #1A (Prime Front)",
                "rest_stop_name": "Katraj Ghat Highway Food Plaza",
                "corridor": "Pune - Kolhapur NH48 Corridor",
                "location_area": "Katraj Ghat Bypass (Km 18.4)",
                "stall_category": "Maharashtrian Pure Veg Thali & Dining",
                "sqft_area": 850,
                "base_bid_monthly": 35000,
                "current_highest_bid": 42000,
                "highest_bidder_name": "Sahyadri Pure Veg",
                "highest_bidder_phone": "+91 98220 54321",
                "min_increment": 1500,
                "total_bids": 6,
                "deadline_date": "2026-12-15",
                "status": "OPEN"
            },
            {
                "id": "STALL-KATRAJ-02",
                "stall_number": "Stall #2B (Express Corner)",
                "rest_stop_name": "Katraj Ghat Highway Food Plaza",
                "corridor": "Pune - Kolhapur NH48 Corridor",
                "location_area": "Katraj Ghat Bypass (Near Bus Bay 3)",
                "stall_category": "24x7 Tea, Misal Pav & Fast Refreshments",
                "sqft_area": 420,
                "base_bid_monthly": 22000,
                "current_highest_bid": 28500,
                "highest_bidder_name": "Amrutdhara Refreshments",
                "highest_bidder_phone": "+91 94230 11982",
                "min_increment": 1000,
                "total_bids": 8,
                "deadline_date": "2026-12-15",
                "status": "OPEN"
            },
            {
                "id": "STALL-KARAD-01",
                "stall_number": "Stall #1 (Main Concourse)",
                "rest_stop_name": "Karad Highway Rest Plaza",
                "corridor": "Pune - Kolhapur NH48 Corridor",
                "location_area": "Karad Bypass Flyover Junction",
                "stall_category": "Multi-Cuisine Family Food Court",
                "sqft_area": 1200,
                "base_bid_monthly": 45000,
                "current_highest_bid": 52000,
                "highest_bidder_name": "Krishna Valley Food Plaza",
                "highest_bidder_phone": "+91 97654 32109",
                "min_increment": 2000,
                "total_bids": 5,
                "deadline_date": "2026-12-20",
                "status": "OPEN"
            },
            {
                "id": "STALL-SATARA-03",
                "stall_number": "Stall #3 (Snacks & Bakery)",
                "rest_stop_name": "Satara Midway Comfort Hub",
                "corridor": "Pune - Kolhapur NH48 Corridor",
                "location_area": "Satara Highway Service Road",
                "stall_category": "Satara Kandi Pedha & Bakery Counter",
                "sqft_area": 350,
                "base_bid_monthly": 18000,
                "current_highest_bid": 24000,
                "highest_bidder_name": "Modi Kandi Pedha Mart",
                "highest_bidder_phone": "+91 98221 77889",
                "min_increment": 1000,
                "total_bids": 4,
                "deadline_date": "2026-12-22",
                "status": "OPEN"
            }
        ]

        with self.get_connection() as conn:
            for s in sample_stalls:
                row = conn.execute("SELECT id FROM rest_stop_stalls WHERE id=?", (s["id"],)).fetchone()
                if not row:
                    conn.execute("""
                    INSERT INTO rest_stop_stalls (
                        id, stall_number, rest_stop_name, corridor, location_area, stall_category,
                        sqft_area, base_bid_monthly, current_highest_bid, highest_bidder_name,
                        highest_bidder_phone, min_increment, total_bids, deadline_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        s["id"], s["stall_number"], s["rest_stop_name"], s["corridor"], s["location_area"],
                        s["stall_category"], s["sqft_area"], s["base_bid_monthly"], s["current_highest_bid"],
                        s["highest_bidder_name"], s["highest_bidder_phone"], s["min_increment"],
                        s["total_bids"], s["deadline_date"], s["status"]
                    ))

    def register_vendor(self, data):
        """Register a new restaurant / highway vendor partner with MSRTC."""
        r_name = data.get("restaurantName", "").strip()
        o_name = data.get("ownerName", "").strip()
        phone = data.get("phone", "").strip()
        fssai = data.get("fssaiLicense", "").strip()

        if not r_name or not o_name or not phone or not fssai:
            raise ValueError("Restaurant Name, Owner Name, Phone, and FSSAI License are required.")

        vid = f"VEND-{random.randint(1000, 9999)}"
        corridor = data.get("corridor", "Pune - Kolhapur NH48")
        stand = data.get("locationStand", "Katraj Ghat / Swargate")
        cuisine = data.get("cuisineType", "Maharashtrian Pure Veg & Refreshments")
        cap = int(data.get("seatingCapacity", 60))
        restroom = 1 if data.get("hasRestrooms", True) else 0
        ev = 1 if data.get("hasEvCharging", False) else 0
        comm = float(data.get("commissionPct", 12.0))
        email = data.get("email", "")
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        with self.get_connection() as conn:
            conn.execute("""
            INSERT INTO vendor_registrations (
                id, restaurant_name, owner_name, phone, email, fssai_license, corridor,
                location_stand, cuisine_type, seating_capacity, has_restrooms, has_ev_charging,
                commission_pct, status, registered_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
            """, (
                vid, r_name, o_name, phone, email, fssai, corridor,
                stand, cuisine, cap, restroom, ev, comm, now_str
            ))

        return {
            "success": True,
            "vendorId": vid,
            "restaurantName": r_name,
            "status": "VERIFIED",
            "message": f"Successfully registered {r_name} as an Official MSRTC Highway Rest-Stop Partner!",
            "certificateNumber": f"MSRTC-FSSAI-{vid}-{datetime.now(IST).year}",
            "registeredAt": now_str
        }

    def list_registered_vendors(self):
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM vendor_registrations ORDER BY registered_at DESC").fetchall()
            return [dict(r) for r in rows]

    def list_stalls_for_bidding(self):
        with self.get_connection() as conn:
            rows = conn.execute("SELECT * FROM rest_stop_stalls ORDER BY deadline_date ASC").fetchall()
            result = []
            for r in rows:
                item = dict(r)
                # fetch recent 3 bids for this stall
                bids = conn.execute(
                    "SELECT vendor_name, bid_amount, bid_timestamp FROM stall_bids_history WHERE stall_id=? ORDER BY bid_timestamp DESC LIMIT 3",
                    (item["id"],)
                ).fetchall()
                item["recentBids"] = [dict(b) for b in bids]
                result.append(item)
            return result

    def place_bid(self, stall_id, vendor_name, vendor_phone, bid_amount):
        """Submit a competitive tender bid for a rest-stop stall."""
        if not vendor_name or not vendor_phone:
            raise ValueError("Vendor Name and Contact Phone are required to place a bid.")

        try:
            bid_amount = int(bid_amount)
        except (TypeError, ValueError):
            raise ValueError("Bid amount must be a valid numeric currency amount.")

        with self.get_connection() as conn:
            stall = conn.execute("SELECT * FROM rest_stop_stalls WHERE id=?", (stall_id,)).fetchone()
            if not stall:
                raise ValueError("Rest-stop stall not found.")

            if stall["status"] != "OPEN":
                raise ValueError("Bidding for this stall has been closed.")

            min_valid = stall["current_highest_bid"] + stall["min_increment"]
            if bid_amount < min_valid:
                raise ValueError(
                    f"Bid must be at least ₹{min_valid:,} (Current Highest: ₹{stall['current_highest_bid']:,} + Minimum Increment: ₹{stall['min_increment']:,})."
                )

            now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

            # Update stall record
            conn.execute("""
            UPDATE rest_stop_stalls
            SET current_highest_bid = ?,
                highest_bidder_name = ?,
                highest_bidder_phone = ?,
                total_bids = total_bids + 1
            WHERE id = ?
            """, (bid_amount, vendor_name, vendor_phone, stall_id))

            # Record history
            conn.execute("""
            INSERT INTO stall_bids_history (stall_id, vendor_name, vendor_phone, bid_amount, bid_timestamp)
            VALUES (?, ?, ?, ?, ?)
            """, (stall_id, vendor_name, vendor_phone, bid_amount, now_str))

            updated_stall = conn.execute("SELECT * FROM rest_stop_stalls WHERE id=?", (stall_id,)).fetchone()

            return {
                "success": True,
                "message": f"Congratulations {vendor_name}! Your bid of ₹{bid_amount:,} is currently the HIGHEST BID for {stall['stall_number']} at {stall['rest_stop_name']}.",
                "stallId": stall_id,
                "newHighestBid": bid_amount,
                "bidder": vendor_name,
                "timestamp": now_str,
                "stall": dict(updated_stall)
            }


VENDOR_BIDDING_SERVICE = VendorBiddingService()
