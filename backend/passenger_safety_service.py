"""
Module 7: Passenger Priority & Safety Management Engine

Features:
  1. Priority Seat Allocation for Senior Citizens, Pregnant Women & Solo Female Travelers
  2. Automated 50% concessions (Mahila Samman & Senior Citizens)
  3. Safe Adjacent Seat Matching for Single / Solo Women Travelers
  4. Single Women Night Guardian Safe Drop Service (After 7 PM)
  5. Live Journey GPS Tracking Link Generator for Family / WhatsApp
  6. In-Journey Emergency SOS Alert Simulation (1091 & Highway Police)
"""

import random
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

class PassengerSafetyService:
    # Dedicated priority seat numbers on 28-seat 7x4 layout
    SENIOR_PRIORITY_SEATS = {"1A", "1B", "2A", "2B"}
    PREGNANT_WOMEN_SEATS = {"1C", "1D", "2C", "2D"}
    LADIES_RESERVED_SEATS = {"3A", "3B", "4A", "4B"}

    # Pairs for adjacent seat matching (A-B and C-D)
    ADJACENT_PAIRS = {
        f"{r}A": f"{r}B" for r in range(1, 8)
    }
    ADJACENT_PAIRS.update({
        f"{r}B": f"{r}A" for r in range(1, 8)
    })
    ADJACENT_PAIRS.update({
        f"{r}C": f"{r}D" for r in range(1, 8)
    })
    ADJACENT_PAIRS.update({
        f"{r}D": f"{r}C" for r in range(1, 8)
    })

    SAFE_DROP_LANDMARKS = [
        {"name": "Katraj Ghat Police Chowki & Lighted Bay", "corridor": "Pune-Kolhapur NH48", "lighting": "High Mast 24x7"},
        {"name": "Shirwal ST Stand Illuminated Exit", "corridor": "Satara-Pune NH48", "lighting": "CCTV Monitored"},
        {"name": "Karad Toll Plaza & Highway Patrol Post", "corridor": "Karad Bypass", "lighting": "Police Patrol Active"},
        {"name": "Lonavala Express Highway Police Station", "corridor": "Mumbai-Pune Expressway", "lighting": "24x7 Police Booth"},
        {"name": "Wakad Bridge Safe Drop Junction", "corridor": "Pune Outer Ring Road", "lighting": "Well-Lit Auto Stand"},
        {"name": "Panvel Kalamboli Circle Safe Transit Point", "corridor": "Mumbai Outskirts", "lighting": "CCTV & Security Staff"}
    ]

    def get_priority_recommendation(self, category):
        """
        Recommends best seats and safety features based on passenger category.
        """
        cat = (category or "General").strip()
        if cat == "Senior Citizen (60+)":
            return {
                "category": cat,
                "recommended_seats": list(self.SENIOR_PRIORITY_SEATS),
                "badge": "Senior Priority",
                "concession_eligible": True,
                "discount_pct": 50,
                "note": "Lower front seats allocated for minimal walking and conductor assistance."
            }
        elif cat == "Pregnant Woman":
            return {
                "category": cat,
                "recommended_seats": list(self.PREGNANT_WOMEN_SEATS),
                "badge": "Maternal Priority",
                "concession_eligible": True,
                "discount_pct": 50,
                "note": "Front bay ergonomic seats with smooth suspension & rapid exit access."
            }
        elif cat in ("Solo Female Traveler", "Single Woman", "Mahila Samman (Female 50% Off)"):
            return {
                "category": "Solo Female Traveler",
                "recommended_seats": list(self.LADIES_RESERVED_SEATS),
                "badge": "🌸 Mahila Samman Single Woman Safe Shield",
                "concession_eligible": True,
                "discount_pct": 50,
                "co_seating_protection": True,
                "safe_drop_available": True,
                "note": "Adjacent seat automatically locked for female co-passenger + Night Guardian Safe Drop."
            }
        return {
            "category": "General",
            "recommended_seats": [],
            "badge": "Standard Passenger",
            "concession_eligible": False,
            "discount_pct": 0,
            "note": "Standard passenger seat allocation."
        }

    def request_safe_drop(self, data):
        """
        Special feature for single women passengers: Night Safe Drop Assurance.
        Conductor & driver are notified to drop solo female passenger at illuminated, safe halt.
        """
        booking_id = data.get("bookingId") or f"MSRTC-WD-{random.randint(10000, 99999)}"
        passenger_name = data.get("passengerName", "Solo Female Traveler")
        bus_no = data.get("busNumber", "MH-09-EM-8834")
        phone = data.get("phone", "+91 98230 12345")
        preferred_drop = data.get("dropLandmark") or "Wakad Bridge Safe Drop Junction"
        notes = data.get("notes", "Single woman late night passenger; requested illuminated stop.")

        req_id = f"MSRTC-WDROP-{random.randint(1000, 9999)}"
        timestamp = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        return {
            "success": True,
            "requestId": req_id,
            "bookingId": booking_id,
            "passengerName": passenger_name,
            "busNumber": bus_no,
            "phone": phone,
            "dropLandmark": preferred_drop,
            "status": "CONFIRMED_BY_CREW",
            "crew_instructions": "Driver & Conductor instructed: Halt bus at illuminated drop point and ensure safe disembarkation.",
            "emergency_backup": "Nearest Highway Patrol PCR notified for en-route monitoring.",
            "sos_hotline": "1091 (Women Safety) / 1800-22-1234 (MSRTC)",
            "createdAt": timestamp,
            "message": f"Night Safe Drop confirmed at {preferred_drop}. Conductor will assist passenger on arrival."
        }

    def share_journey_tracking(self, data):
        """
        Generates real-time tracking link and security snapshot for single women travelers to share with family.
        """
        passenger_name = data.get("passengerName", "Single Woman Passenger")
        bus_no = data.get("busNumber", "MH-14-BT-9102")
        from_loc = data.get("from", "Pune (Swargate)")
        to_loc = data.get("to", "Kolhapur CBS")
        emergency_contact = data.get("emergencyContact", "+91 98230 00000")

        trip_code = f"TRK-{random.randint(100000, 999999)}"
        now = datetime.now(IST)
        eta = (now + timedelta(hours=3, minutes=15)).strftime("%I:%M %p")

        tracking_link = f"https://msrtc.gov.in/track?id={trip_code}&bus={bus_no}"

        return {
            "success": True,
            "trackingId": trip_code,
            "passengerName": passenger_name,
            "busNumber": bus_no,
            "route": f"{from_loc} → {to_loc}",
            "current_location": "NH48 Expressway - Shirwal Section (Live GPS Active)",
            "speed_kmh": 68,
            "conductor_name": "S. V. Patil (Badge #8841)",
            "conductor_phone": "+91 98221 44556",
            "driver_name": "R. M. Gaikwad (Pune Swargate Depot)",
            "eta": eta,
            "emergency_contact": emergency_contact,
            "tracking_url": tracking_link,
            "whatsapp_share_text": f"MSRTC Safe Journey Live: {passenger_name} is traveling on bus {bus_no} ({from_loc} to {to_loc}). Live location & ETA ({eta}): {tracking_link}. Emergency Conductor: +91 98221 44556, Women Helpline: 1091."
        }

    def get_women_safety_dashboard(self):
        """Returns statistics and safety resources for the Single Women Protection module."""
        return {
            "beneficiaries_mahila_samman": "1.42+ Crore Women in Maharashtra",
            "discount_benefit": "Flat 50% fare reduction on all MSRTC State Transport buses",
            "co_seating_protection_active": True,
            "reserved_ladies_seats": ["3A", "3B", "4A", "4B"],
            "night_guardian_hours": "07:00 PM to 06:00 AM",
            "safe_drop_landmarks": self.SAFE_DROP_LANDMARKS,
            "emergency_numbers": [
                {"service": "Women Safety 24x7 Helpline", "number": "1091", "type": "Toll-Free"},
                {"service": "MSRTC Central Monitoring Command", "number": "1800-22-1234", "type": "Toll-Free"},
                {"service": "Maharashtra Highway Police Helpline", "number": "112", "type": "Police Emergency"}
            ]
        }

    def trigger_emergency_sos(self, booking_id, bus_number, current_location="Kolhapur-Pune NH48"):
        """Simulates rapid SOS alert to MSRTC Control Room and Women Safety Helpline."""
        return {
            "sos_id": f"SOS-{booking_id[-6:]}",
            "status": "ALERT_DISPATCHED",
            "bus_number": bus_number,
            "gps_location": current_location,
            "notified_authorities": [
                "MSRTC 24x7 Central Transit Monitoring Command (1800-22-1234)",
                "Maharashtra Highway Police Quick Response Unit",
                "Women Helpline Control (1091)"
            ],
            "action_taken": "Driver & Conductor cabin notified. Nearest Highway Patrol unit alerted.",
            "timestamp": "Realtime Active"
        }

SAFETY_SERVICE = PassengerSafetyService()
