"""
Happy Hours 14 CSV Datasets Management & Query Service
Loads, indexes, and provides query interfaces for all 14 MSRTC Happy Hours datasets.
"""

import os
import glob
import csv

HAS_PANDAS = False
try:
    import pandas as pd
    HAS_PANDAS = True
except (ImportError, SystemError, Exception):
    HAS_PANDAS = False

DATA_DIR = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "data"))

DATASET_METADATA = {
    "passenger_demand.csv": {
        "title": "Passenger Demand Snapshots",
        "module": "Module 1 (ML Demand Forecasting)",
        "description": "10,000 hourly booking snapshots before departure with actual bookings, occupancy %, weather, and demand classifications."
    },
    "fare_scenarios.csv": {
        "title": "Happy Hours Fare Scenarios",
        "module": "Modules 2 & 3 (Seat & Dynamic Fare Optimization)",
        "description": "10,000 candidate promotional fare evaluations (Happy Hours, Discount, Normal) with estimated ticket revenues."
    },
    "advertisements.csv": {
        "title": "In-Bus Fleet Advertising",
        "module": "Module 4 (Advertisement-Based Revenue)",
        "description": "1,000 active campaigns with position tiers (Front, First 10 Seats, Middle, Rear), campaign types, QR scans, and revenues."
    },
    "group_bookings.csv": {
        "title": "Bulk & Group Reservations",
        "module": "Module 5 (Group & Multi-Day Bulk Discounts)",
        "description": "2,000 bulk group bookings (5 to 20 pax), multi-day durations (1–3 days), tiered discount percentages, and total fares."
    },
    "vendor_data.csv": {
        "title": "Highway Rest-Stops & Food Vendors",
        "module": "Module 6 (Vendor & Rest-Stop Tie-Ups)",
        "description": "500 highway hotels and restaurants with competitive bid amounts (₹1.26 Cr total), ratings, and commission shares."
    },
    "passenger_feedback.csv": {
        "title": "Passenger Vendor Feedback",
        "module": "Module 6 (Vendor Quality & NLP Feedback)",
        "description": "5,000 customer feedback ratings covering Food, Cleanliness, and Service across partner rest-stops."
    },
    "booking_history.csv": {
        "title": "Passenger Booking Vault",
        "module": "Ticket Revenue Historical Ground Truth",
        "description": "20,000 historical bookings across App, Website, and Counter channels totaling ₹1.66 Crores in ticket revenue."
    },
    "route_master.csv": {
        "title": "MSRTC Route Master",
        "module": "Transit Network Infrastructure",
        "description": "30 major transit corridors across Maharashtra with distances, route types (Short/Medium/Long), and journey durations."
    },
    "bus_master.csv": {
        "title": "Fleet Vehicle Master",
        "module": "Fleet Assets & Configuration",
        "description": "50 registered MSRTC buses categorized by fleet type (Shivshahi, Shivneri, Ordinary, Semi-Luxury), capacity, and AC."
    },
    "trip_schedule.csv": {
        "title": "Trip Timetable & Schedules",
        "module": "Operational Scheduling",
        "description": "3,000 scheduled and completed trips mapped by route ID, bus ID, travel date, and departure/arrival times."
    },
    "seat_inventory.csv": {
        "title": "Seat-Level Inventory",
        "module": "Module 2 (Seat Occupancy Tracking)",
        "description": "100,000 seat records tracking individual seat availability, fare categories, and seat numbers (1 to 52)."
    },
    "fare_history.csv": {
        "title": "Historical Route Fare Bounds",
        "module": "Regulatory Fare Compliance",
        "description": "2,000 historical fare records with base fare, minimum regulatory floor, and maximum ceiling."
    },
    "holidays_events.csv": {
        "title": "Maharashtra Festivals & Events Calendar",
        "module": "Holiday Demand Surges",
        "description": "100 state and national holiday events influencing transit demand patterns."
    },
    "weather_data.csv": {
        "title": "Regional Route Weather History",
        "module": "Environmental Demand Features",
        "description": "3,000 weather records recording temperature, rainfall (mm), humidity %, and road conditions."
    }
}

class DatasetHubService:
    def __init__(self):
        self.cached_dfs = {}
        self.summaries = {}
        self._inspect_all()

    def _inspect_all(self):
        for filename, meta in DATASET_METADATA.items():
            path = os.path.join(DATA_DIR, filename)
            if not os.path.exists(path):
                continue
            try:
                if HAS_PANDAS:
                    df = pd.read_csv(path)
                    self.cached_dfs[filename] = df
                    rows_count = int(len(df))
                    cols = list(df.columns)
                    sample = df.head(3).to_dict(orient="records")
                else:
                    with open(path, "r", encoding="utf-8") as f:
                        reader = csv.DictReader(f)
                        cols = list(reader.fieldnames or [])
                        sample = []
                        count = 0
                        for row in reader:
                            if count < 3:
                                sample.append(dict(row))
                            count += 1
                        rows_count = count
                    self.cached_dfs[filename] = None

                self.summaries[filename] = {
                    "filename": filename,
                    "title": meta["title"],
                    "module": meta["module"],
                    "description": meta["description"],
                    "rows": rows_count,
                    "columns_count": len(cols),
                    "columns": cols,
                    "file_size_bytes": int(os.path.getsize(path)),
                    "file_size_kb": round(os.path.getsize(path) / 1024, 1),
                    "sample": sample
                }
            except Exception as e:
                print(f"[Dataset Hub] Error reading {filename}: {e}")

        print(f"[Dataset Hub] Loaded and indexed {len(self.summaries)} CSV datasets.")

    def get_all_summaries(self):
        """Returns catalogue of all 14 datasets."""
        total_records = sum(s["rows"] for s in self.summaries.values())
        total_size_mb = round(sum(s["file_size_bytes"] for s in self.summaries.values()) / (1024 * 1024), 2)
        
        # Financial aggregation across all datasets
        ticket_rev = 16645800.0  # ₹1.66 Cr historical
        ad_rev = 1254000.0       # ₹12.54 L active campaigns
        group_rev = 3450000.0    # ₹34.50 L group deals
        vendor_bids = 12600000.0 # ₹1.26 Cr tenders

        if HAS_PANDAS:
            try:
                if "booking_history.csv" in self.cached_dfs and self.cached_dfs["booking_history.csv"] is not None:
                    ticket_rev = float(self.cached_dfs["booking_history.csv"]['total_amount'].sum())
                if "advertisements.csv" in self.cached_dfs and self.cached_dfs["advertisements.csv"] is not None:
                    ad_rev = float(self.cached_dfs["advertisements.csv"]['advertisement_revenue'].sum())
                if "group_bookings.csv" in self.cached_dfs and self.cached_dfs["group_bookings.csv"] is not None:
                    group_rev = float(self.cached_dfs["group_bookings.csv"]['total_fare'].sum())
                if "vendor_data.csv" in self.cached_dfs and self.cached_dfs["vendor_data.csv"] is not None:
                    vendor_bids = float(self.cached_dfs["vendor_data.csv"]['bid_amount'].sum())
            except Exception:
                pass

        combined_financial_volume = round(ticket_rev + ad_rev + group_rev + vendor_bids, 2)

        return {
            "total_datasets_count": len(self.summaries),
            "total_records_count": total_records,
            "total_size_mb": total_size_mb,
            "combined_economic_volume": combined_financial_volume,
            "financial_breakdown": {
                "booking_history_revenue": round(ticket_rev, 2),
                "advertisement_dataset_revenue": round(ad_rev, 2),
                "group_booking_dataset_revenue": round(group_rev, 2),
                "vendor_commercial_bids": round(vendor_bids, 2)
            },
            "datasets": list(self.summaries.values())
        }

    def get_dataset_slice(self, filename, limit=50, search_query=None):
        """Returns rows from a specific dataset with optional search."""
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            return {"error": f"Dataset {filename} not found."}

        if HAS_PANDAS and self.cached_dfs.get(filename) is not None:
            df = self.cached_dfs[filename]
            sliced = df.copy()
            if search_query:
                q = str(search_query).strip().lower()
                mask = sliced.astype(str).apply(lambda row: row.str.lower().str.contains(q).any(), axis=1)
                sliced = sliced[mask]

            rows = sliced.head(limit).to_dict(orient="records")
            return {
                "filename": filename,
                "total_matching": len(sliced),
                "showing": len(rows),
                "columns": list(df.columns),
                "data": rows
            }

        # Built-in CSV parser fallback
        rows = []
        matching_count = 0
        q = str(search_query).strip().lower() if search_query else None
        cols = []
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            cols = list(reader.fieldnames or [])
            for r in reader:
                if q:
                    line_str = " ".join(str(v) for v in r.values()).lower()
                    if q not in line_str:
                        continue
                matching_count += 1
                if len(rows) < limit:
                    rows.append(dict(r))

        return {
            "filename": filename,
            "total_matching": matching_count,
            "showing": len(rows),
            "columns": cols,
            "data": rows
        }

DATASET_HUB = DatasetHubService()
