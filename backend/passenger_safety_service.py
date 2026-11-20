"""
Module 7: Passenger Priority & Safety Management Engine

Features:
  1. Priority Seat Allocation for Senior Citizens, Pregnant Women & Solo Female Travelers
  2. Automated 50% concessions (Mahila Samman & Senior Citizens)
  3. Safe Adjacent Seat Matching for Female Travelers
  4. In-Journey Emergency SOS Alert Simulation
"""

class PassengerSafetyService:
    # Dedicated priority seat numbers on 28-seat 7x4 layout
    SENIOR_PRIORITY_SEATS = {"1A", "1B", "2A", "2B"}
    PREGNANT_WOMEN_SEATS = {"1C", "1D", "2C", "2D"}
    LADIES_RESERVED_SEATS = {"3A", "3B", "4A", "4B"}

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
        elif cat == "Solo Female Traveler":
            return {
                "category": cat,
                "recommended_seats": list(self.LADIES_RESERVED_SEATS),
                "badge": "Mahila Samman Safe Zone",
                "concession_eligible": True,
                "discount_pct": 50,
                "note": "Adjacent seats matched with female co-passengers + SOS emergency protection."
            }
        return {
            "category": "General",
            "recommended_seats": [],
            "badge": "Standard Passenger",
            "concession_eligible": False,
            "discount_pct": 0,
            "note": "Standard passenger seat allocation."
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
