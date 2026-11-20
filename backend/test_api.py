import urllib.request
import urllib.parse
import json

def test_get(url):
    req = urllib.request.urlopen(url)
    data = json.loads(req.read().decode('utf-8'))
    print(f"GET {url}: Success (status {req.status})")
    return data

def test_post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"POST {url}: Success (status {res.status})")
    return data

# 1. Health
h = test_get("http://localhost:8000/api/health")
print("Health status:", h.get("status"))

# 2. Locations
locs = test_get("http://localhost:8000/api/locations")
print(f"Locations count: {len(locs)}")

# 3. Search with ML & Happy Hours
search_url = "http://localhost:8000/api/search?from=" + urllib.parse.quote("Kolhapur CBS (Central Bus Stand)") + "&to=" + urllib.parse.quote("Pune (Swargate)") + "&date=2026-11-21"
s = test_get(search_url)
print(f"Buses found: {len(s['buses'])}")
hh_buses = [b for b in s['buses'] if b.get('isHappyHours')]
print(f"Happy Hours eligible buses: {len(hh_buses)}")
if hh_buses:
    b0 = hh_buses[0]
    print(f"Sample Happy Hours: {b0['busNumber']} ({b0['busType']}) -> Base: Rs.{b0['originalFare']} | Promo: Rs.{b0['fare']} ({b0['happyHoursDiscountPct']}% off)")

# 4. Unified Revenue (R_total)
r = test_get("http://localhost:8000/api/revenue/unified")
print("Unified Total Revenue (R_total):", r["unified_total_revenue"])
print("Breakdown:", r["breakdown"])

# 5. ML Models comparison (4 models)
m = test_get("http://localhost:8000/api/ml/models")
print(f"Best ML Model: {m['best_model']}")
for name, met in m["models"].items():
    print(f"  {name}: R2={met['r2']}, MAE={met['mae']}, RMSE={met['rmse']}, Accuracy={met['accuracy_pct']}%")

# 6. Ads Analytics (1000 dataset records)
ads = test_get("http://localhost:8000/api/ads/analytics")
print(f"Dataset Total Ad Revenue: Rs.{ads['total_revenue']} | Total Campaigns: {ads['total_campaigns']} | QR Scans: {ads['total_scans']}")

# 7. QR Scan simulation
scan = test_post("http://localhost:8000/api/ads/scan", {"advertisementId": "AD00001"})
print(f"QR Scan Verified: {scan['brand']} -> Code: {scan['coupon_code']} ({scan['deal']})")

# 8. SOS Alert
sos = test_post("http://localhost:8000/api/safety/sos", {"bookingId": "MSRTC-2026-9999", "busNumber": "MH-09-EM-8834"})
print(f"Emergency SOS Status: {sos['status']} ({sos['sos_id']})")

# 9. Static File check
req_html = urllib.request.urlopen("http://localhost:8000/index.html")
print(f"Static index.html served: status {req_html.status}, bytes: {len(req_html.read())}")

print("\nALL 9 ENDPOINT & MODULE SUITES FUNCTIONING PERFECTLY!")
