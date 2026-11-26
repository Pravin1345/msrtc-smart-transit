"""
MSRTC dynamic fare engine.

fare/seat = distance-based base fare x demand multiplier (clamped 0.75 - 1.10/1.20/1.30 by bus type)

The multiplier adds up four signals:
  1. Booking pace   - how full the bus is compared with how full it should be
                      this many days before departure (the main signal).
  2. Time of day    - peak hours cost a little more, late night a little less.
  3. Day type       - weekends and festival dates cost more.
  4. Guardrails     - the multiplier is clamped, and concessions are applied
                      after it, so no ticket falls below ~37% of the base fare.
Revenue is compared against the same distance-based fare with no dynamic
adjustment, which isolates the effect of dynamic pricing.

Everything tunable sits in the constants below.
"""
import hashlib
import math
import random
from datetime import date

CAPACITY = 28
SEATS = [f"{r}{c}" for r in range(1, 8) for c in "ABCD"]  # matches the 7x4 seat map

MIN_MULT = 0.75
PACE_WEIGHT, PACE_CAP = 0.8, 0.25
PEAK_HOURS = set(range(6, 10)) | set(range(17, 21))
LATE_HOURS = set(range(21, 24)) | set(range(0, 5))
# Sample festival dates; replace with MSRTC's own festival calendar.
FESTIVAL_DATES = {"2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-12-25"}
GST_RATE = 0.05

# rate = Rs per km, speed = average km/h, min = minimum fare,
# max_mult = surge ceiling (kept low on ordinary buses so basic travel stays affordable).
FLEET = {
    "Shivneri (AC Volvo)":          {"rate": 2.3,  "speed": 55, "min": 60, "max_mult": 1.30},
    "Shivshahi (AC Seater)":        {"rate": 1.55, "speed": 50, "min": 45, "max_mult": 1.30},
    "Nim-Aramdayi (Asiad Express)": {"rate": 1.05, "speed": 45, "min": 30, "max_mult": 1.20},
    "Ordinary Lal Dabba":           {"rate": 0.65, "speed": 38, "min": 20, "max_mult": 1.10},
}

# demand = typical load for the slot (drives the simulated baseline occupancy)
SCHEDULES = [
    ("SCH_SHV_06", "Shivneri (AC Volvo)", "MH-09-BT-4521", "06:00", "LOW", ["AC", "WiFi", "USB Charging", "Water Bottle"]),
    ("SCH_SHV_09", "Shivneri (AC Volvo)", "MH-09-BT-7832", "09:00", "HIGH", ["AC", "WiFi", "USB Charging", "Water Bottle"]),
    ("SCH_SHV_21", "Shivneri (AC Volvo)", "MH-09-BT-2214", "21:30", "LOW", ["AC", "WiFi", "USB Charging", "Night Ride"]),
    ("SCH_SSH_07", "Shivshahi (AC Seater)", "MH-09-EM-8834", "07:15", "MEDIUM", ["AC", "Push-back Seats", "GPS Tracking"]),
    ("SCH_SSH_12", "Shivshahi (AC Seater)", "MH-09-EM-5510", "12:00", "LOW", ["AC", "Push-back Seats", "GPS Tracking"]),
    ("SCH_SSH_18", "Shivshahi (AC Seater)", "MH-09-EM-9201", "18:00", "HIGH", ["AC", "Push-back Seats", "GPS Tracking"]),
    ("SCH_ASI_08", "Nim-Aramdayi (Asiad Express)", "MH-09-EM-9921", "08:30", "MEDIUM", ["Cushioned Seats", "Express Route"]),
    ("SCH_ASI_14", "Nim-Aramdayi (Asiad Express)", "MH-09-EM-3341", "14:00", "LOW", ["Cushioned Seats", "Express Route"]),
    ("SCH_ASI_20", "Nim-Aramdayi (Asiad Express)", "MH-09-EM-6670", "20:00", "LOW", ["Cushioned Seats", "Night Express"]),
    ("SCH_ORD_07", "Ordinary Lal Dabba", "MH-09-CL-1104", "07:00", "HIGH", ["Village Halts", "State Concessions"]),
    ("SCH_ORD_10", "Ordinary Lal Dabba", "MH-09-CL-4492", "10:30", "MEDIUM", ["Village Halts", "State Concessions"]),
    ("SCH_ORD_15", "Ordinary Lal Dabba", "MH-09-CL-7783", "15:00", "LOW", ["Village Halts", "Affordable Fare"]),
]
SCHEDULE_BY_ID = {
    s[0]: {"id": s[0], "busType": s[1], "busNumber": s[2], "departure": s[3],
           "demand": s[4], "amenities": s[5]}
    for s in SCHEDULES
}
DEMAND_LOAD = {"LOW": 0.20, "MEDIUM": 0.50, "HIGH": 0.85}

# Approximate coordinates (lat, lon). Distances are estimated from these;
# replace with MSRTC's official stage-wise km table for production use.
COORDS = {
    "Kolhapur CBS (Central Bus Stand)": (16.705, 74.243), "Kolhapur Rankala Stand": (16.699, 74.220),
    "Kolhapur Sambhajinagar Stand": (16.723, 74.257), "Ichalkaranji Central Stand": (16.691, 74.460),
    "Jaisingpur Bus Stand": (16.780, 74.556), "Gadhinglaj Central Stand": (16.226, 74.349),
    "Kagal Bus Stand": (16.576, 74.312), "Kagal 5-Star MIDC": (16.590, 74.300),
    "Panhala Fort Stand": (16.811, 74.110), "Radhanagari Bus Stand": (16.412, 73.998),
    "Gargoti (Bhudargad) Stand": (16.230, 74.120), "Malkapur (Shahuwadi) Stand": (16.880, 73.930),
    "Ajara Central Stand": (16.120, 74.210), "Chandgad Bus Stand": (15.960, 74.230),
    "Hatkanangle Stand": (16.733, 74.401), "Kurundwad Bus Stand": (16.683, 74.588),
    "Shirol Bus Stand": (16.733, 74.602), "Hupari (Silver City) Stand": (16.695, 74.405),
    "Peth Vadgaon Stand": (16.777, 74.391), "Gandhinagar Stand": (16.675, 74.295),
    "Gaganbawda Stand": (16.550, 73.830), "Kodoli (Panhala) Stand": (16.768, 74.203),
    "Bambavade (Shahuwadi) Stand": (16.880, 73.970), "Nesari (Gadhinglaj) Stand": (16.190, 74.330),
    "Kowad (Chandgad) Stand": (15.980, 74.370), "Uttur (Ajara) Stand": (16.080, 74.300),
    "Yalgud Stand": (16.760, 74.330), "Rajarampuri (Kolhapur City)": (16.700, 74.240),
    "Shiroli MIDC": (16.725, 74.310),
    "Pune (Swargate)": (18.502, 73.864), "Pune (Shivajinagar)": (18.531, 73.848),
    "Mumbai (Dadar)": (19.018, 72.848), "Mumbai (Borivali)": (19.231, 72.857),
    "Nashik (CBS)": (19.998, 73.790), "Chhatrapati Sambhajinagar": (19.876, 75.343),
    "Satara Central": (17.681, 74.018), "Sangli Central Stand": (16.852, 74.582),
    "Miraj Stand": (16.823, 74.645), "Solapur Central": (17.660, 75.906),
    "Nagpur Central": (21.146, 79.088), "Mahabaleshwar": (17.924, 73.659),
    "Shirdi Temple": (19.767, 74.477), "Ratnagiri Stand": (16.990, 73.312),
    "Goa (Panaji - Inter-State)": (15.491, 73.828),
}
ROAD_FACTOR = 1.25


def distance_km(a, b):
    """Estimated road distance between two stands (straight line x road factor)."""
    if a not in COORDS or b not in COORDS:
        return 25
    (la1, lo1), (la2, lo2) = COORDS[a], COORDS[b]
    p1, p2 = math.radians(la1), math.radians(la2)
    h = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2)
    return max(5, round(12742 * math.asin(math.sqrt(h)) * ROAD_FACTOR))


def trip_key(schedule_id, frm, to, travel_date):
    return f"{schedule_id}|{frm}|{to}|{travel_date}"


def _round_fare(x):
    return round(x) if x < 100 else int(5 * round(x / 5))


def base_fare(bus_type, km):
    f = FLEET[bus_type]
    return max(f["min"], round(km * f["rate"]))


def duration_minutes(bus_type, km):
    return int(5 * math.ceil((km / FLEET[bus_type]["speed"] * 60 + 10) / 5))


def baseline_booked(schedule, frm, to, travel_date):
    """Seats already taken by passengers outside this portal (simulated, stable per trip)."""
    key = trip_key(schedule["id"], frm, to, travel_date)
    rng = random.Random(int(hashlib.sha256(key.encode()).hexdigest()[:12], 16))
    weekend = date.fromisoformat(travel_date).weekday() >= 5
    load = DEMAND_LOAD[schedule["demand"]] + (0.08 if weekend else 0) + rng.uniform(-0.08, 0.08)
    n = round(CAPACITY * min(0.95, max(0.05, load)))
    return set(rng.sample(SEATS, n))


def multiplier(schedule, travel_date, booked_count, today):
    """Return (multiplier, [human-readable reasons])."""
    d = date.fromisoformat(travel_date)
    days_out = max(0, (d - today).days)
    occupancy = booked_count / CAPACITY
    expected = min(0.80, max(0.20, 0.80 - 0.06 * days_out))  # target fill curve
    pace = max(-PACE_CAP, min(PACE_CAP, (occupancy - expected) * PACE_WEIGHT))
    reasons = []
    if pace <= -0.05:
        reasons.append(f"Filling slower than expected ({round(occupancy * 100)}% full)")
    elif pace >= 0.05:
        reasons.append(f"Filling fast ({round(occupancy * 100)}% full)")
    adj = pace
    hour = int(schedule["departure"][:2])
    if hour in PEAK_HOURS:
        adj += 0.05
        reasons.append("Peak-hour departure")
    elif hour in LATE_HOURS:
        adj -= 0.05
        reasons.append("Late-night departure")
    if travel_date in FESTIVAL_DATES:
        adj += 0.10
        reasons.append("Festival travel date")
    elif d.weekday() >= 5:
        adj += 0.05
        reasons.append("Weekend travel")
    m = max(MIN_MULT, min(FLEET[schedule["busType"]]["max_mult"], 1 + adj))
    return round(m, 3), reasons


def quote(schedule, frm, to, travel_date, booked_count, today):
    km = distance_km(frm, to)
    base = base_fare(schedule["busType"], km)
    m, reasons = multiplier(schedule, travel_date, booked_count, today)
    return {"distanceKm": km, "baseFare": base, "fare": _round_fare(base * m),
            "multiplier": m, "reasons": reasons}


def concession(gender, age, fare):
    """Same rules as the portal: child < 5, senior >= 60, female -> 50% off."""
    if age < 5:
        why = "50% Off (Child < 5 yrs)"
    elif age >= 60:
        why = "50% Off (Senior Citizen ≥ 60 yrs)"
    elif gender == "Female":
        why = "50% Off (Female Passenger Concession)"
    else:
        return fare, "Full Fare (Adult)"
    return round(fare * 0.5), why


CORRIDORS = [
    [
        "Kolhapur CBS (Central Bus Stand)", "Shiroli MIDC", "Peth Vadgaon Stand",
        "Satara Central", "Pune (Swargate)", "Pune (Shivajinagar)",
        "Mumbai (Dadar)", "Mumbai (Borivali)"
    ],
    [
        "Kolhapur CBS (Central Bus Stand)", "Gandhinagar Stand", "Hatkanangle Stand",
        "Jaisingpur Bus Stand", "Sangli Central Stand", "Miraj Stand"
    ],
    [
        "Kolhapur CBS (Central Bus Stand)", "Gandhinagar Stand", "Hatkanangle Stand",
        "Hupari (Silver City) Stand", "Ichalkaranji Central Stand"
    ],
    [
        "Kolhapur CBS (Central Bus Stand)", "Kagal Bus Stand", "Kagal 5-Star MIDC",
        "Gadhinglaj Central Stand", "Ajara Central Stand", "Chandgad Bus Stand",
        "Goa (Panaji - Inter-State)"
    ],
    [
        "Ratnagiri Stand", "Gaganbawda Stand", "Kolhapur Rankala Stand",
        "Kolhapur CBS (Central Bus Stand)"
    ],
    [
        "Pune (Swargate)", "Pune (Shivajinagar)", "Nashik (CBS)", "Shirdi Temple"
    ],
    [
        "Pune (Swargate)", "Solapur Central"
    ],
    [
        "Pune (Swargate)", "Chhatrapati Sambhajinagar", "Nagpur Central"
    ]
]


def get_route_stops(frm, to, schedule_id=None):
    """Return ordered list of stops along the selected bus route with cumulative km."""
    # 1. Check if both frm and to lie on one of the defined transit corridors
    for c in CORRIDORS:
        if frm in c and to in c:
            i1, i2 = c.index(frm), c.index(to)
            if i1 < i2:
                sub = c[i1:i2+1]
            else:
                sub = list(reversed(c[i2:i1+1]))
            res = [{"name": sub[0], "km": 0}]
            cum = 0
            for i in range(1, len(sub)):
                seg = distance_km(sub[i-1], sub[i])
                cum += seg
                res.append({"name": sub[i], "km": cum})
            return res

    # 2. Linear projection for any other arbitrary origin & destination
    total = distance_km(frm, to)
    candidates = []
    for name in COORDS:
        if name in (frm, to):
            continue
        d_from = distance_km(frm, name)
        d_to = distance_km(name, to)
        # Point lies on or very close to corridor without backtracking
        if (d_from + d_to) <= total * 1.08 and d_from < total and d_to < total:
            candidates.append((d_from, name))
    candidates.sort(key=lambda x: x[0])

    stops = [{"name": frm, "km": 0}]
    for d_from, name in candidates:
        stops.append({"name": name, "km": d_from})
    stops.append({"name": to, "km": total})
    return stops


def price_passengers(per_seat_fare, passengers):
    rows, subtotal = [], 0
    for p in passengers:
        f, why = concession(p["gender"], p["age"], per_seat_fare)
        rows.append({**p, "fare": f, "concession": why})
        subtotal += f
    gst = round(subtotal * GST_RATE)
    return rows, subtotal, gst, subtotal + gst
