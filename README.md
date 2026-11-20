# 🚌 MSRTC Smart Transit • ML-Based Revenue Optimization ("HAPPY HOURS")

> **Official Final-Year Project Implementation**  
> **Title**: ML-Based Revenue Optimization System for MSRTC  
> **Product Name**: HAPPY HOURS  
> **Domain**: Machine Learning, Data Analytics and Intelligent Transportation Systems  
> **Target Transit Body**: Maharashtra State Road Transport Corporation (MSRTC)  

---

## 🌟 Executive Summary

Traditional state transport corporations like MSRTC face severe revenue leakage due to un-utilized vacant seats during off-peak hours (e.g. midday slumps, weekday afternoons, college vacations), rigid non-dynamic ticket pricing, and untapped commercial revenue streams.

This project delivers an integrated **Machine Learning & Revenue Optimization Platform** designed to maximize MSRTC's revenue through intelligent demand forecasting, rule-constrained dynamic "Happy Hours" promotional pricing, position-based in-bus advertising analytics, highway food plaza partnerships, bulk booking incentives, and dedicated passenger safety protocols.

---

## 📐 Mathematical Formulation & Financial Framework

### 1. Consolidated Revenue Model
$$\mathbf{R_{\text{total}} = R_{\text{ticket}} + R_{\text{advertisement}} + R_{\text{vendor}} + R_{\text{partnership}}}$$

Where:
- $\mathbf{R_{\text{ticket}}}$: Total passenger ticket revenue incorporating dynamic surge pricing and incremental revenue from Happy Hours off-peak bookings.
- $\mathbf{R_{\text{advertisement}}}$: Commercial advertising fees and engagement revenue from bus banners, QR stickers, and digital displays across the fleet (powered by the 1,000-record dataset).
- $\mathbf{R_{\text{vendor}}}$: Revenue share and commission (10%–15%) on pre-ordered onboard refreshments (MSRTC Rail Neer mineral water, snack boxes) and highway food plaza vouchers.
- $\mathbf{R_{\text{partnership}}}$: Fixed monthly licensing fees and contract bidding revenue from highway rest-stops (e.g., Katraj Ghat Food Plaza, Karad Highway Midway, Lonavala Expressway Haven).

---

### 2. Happy Hours Constrained Revenue Optimization Logic
$$\mathbf{\text{Expected Revenue}(d) = \text{Fare}(d) \times \text{Expected Bookings}(d)}$$

$$\text{Maximize } \text{Expected Revenue}(d) \quad \text{subject to:}$$
1. **Bus Capacity Constraint**: $\text{Expected Bookings}(d) \le \text{Total Capacity (28 Seats)}$
2. **Maximum Discount Constraint**: $\text{Discount } d \le 50\%$
3. **Minimum Trip Revenue Floor**: $\text{Expected Revenue}(d) \ge \text{Baseline Operating Cost Floor}$
4. **Regulatory Boundaries**: Fare cannot drop below MSRTC floor rates for the vehicle class.

---

## 🚀 The 7 Core System Modules

### Module 1: ML-Based Passenger Demand Forecasting
- **Inputs**: Route distance (km), departure time (hour), day of week, weekend indicator, peak/off-peak flag, festival/holiday indicator, and bus fleet category.
- **Machine Learning Algorithms Evaluated**:
  1. **Linear Regression** (Baseline Regressor)
  2. **Decision Tree Regressor**
  3. **Random Forest Regressor** (Ensemble Bagging)
  4. **XGBoost Regressor** (Gradient Boosting)
- **Model Evaluation Benchmarks**:

| Model | MAE (Seats) | RMSE (Seats) | $R^2$ Score | Model Accuracy |
|---|:---:|:---:|:---:|:---:|
| **Random Forest Regressor** | **1.75** | **2.18** | **0.8787** | **87.9%** (Best Deployed) |
| **XGBoost Regressor** | 1.76 | 2.20 | 0.8768 | 87.7% |
| **Decision Tree Regressor** | 1.75 | 2.19 | 0.8776 | 87.8% |
| **Linear Regression** | 1.76 | 2.20 | 0.8766 | 87.7% |

- **Outputs**: Expected Passenger Demand, Occupancy %, Expected Empty Seats, and Demand Classification (`LOW`, `MEDIUM`, `HIGH`).

---

### Module 2: Seat Occupancy Optimization
- Automated vacant seat prediction for every scheduled trip in the timetable.
- Intelligent identification of off-peak low-occupancy trips (expected occupancy $< 60\%$) eligible for promotional Happy Hours discounts.
- Live 28-seat interactive cabin map (7 rows $\times$ 4 columns) displaying seat availability in real time.

---

### Module 3: Dynamic Fare & "Happy Hours" Revenue Engine
- Evaluates promotional discount scenarios ($10\%, 20\%, 25\%, 30\%, 35\%, 40\%, 50\%$) utilizing passenger price elasticity of demand.
- Selects the optimal promotional fare that produces the highest expected revenue while strictly satisfying capacity and revenue floor constraints.
- Shows live promotional savings badges on passenger search results (e.g. *⚡ Happy Hours: 25% Off - Save ₹85*).

---

### Module 4: Advertisement-Based Revenue Generation
- Built directly on the **1,000-Row MSRTC Advertisement Dataset** (`data/advertisements.csv`):
  - **Total Dataset Revenue**: ₹1,11,62,221.87 (~₹1.11 Crores)
  - **Total QR Scans**: 2,570,524 scans
  - **Campaign Types**: Printed Vinyl Banners (355), QR Code Stickers (323), Digital Displays (322)
  - **Position Tiers & Proposed Pricing**:
    - **Front of Bus (Premium Tier)**: ₹180 - ₹240 / day (High eye-level road & windscreen visibility)
    - **First 10 Seats Area (High Tier)**: ₹150 - ₹180 / day (Boarding passenger eye-contact zone)
    - **Middle Section (Medium Tier)**: ₹100 - ₹135 / day (Overhead racks & back-of-seat panels)
    - **Rear Section (Standard Tier)**: ₹70 - ₹95 / day (Exit door & rear window exterior)
- **ML Revenue Predictor**: Random Forest & Linear Regression models trained on the dataset ($R^2 = 0.8580$) predicting ad revenue and QR engagement for new advertisers.
- **In-Bus QR Code Scan Simulator**: Passengers can scan bus QR codes (or present ticket slips) to redeem verified 10%–20% discounts at partner merchants (Kolhapuri Chappals, Chitale Bandhu, Katraj Dairy).

---

### Module 5: Group and Long-Duration Reservation Discounts
- Automated bulk booking discounts:
  - **5 to 10 Passengers**: 10% Discount (Family & Small Group Tier)
  - **11 to 20 Passengers**: 15% Discount (Tour & Pilgrim Tier)
  - **21 to 28 Passengers**: 20% Discount (Bulk Wedding & Full Charter Tier)
  - **Multi-Day Reservations ($> 3$ Days)**: Extra 5% Loyalty Discount
- **Flexible Seat Allocation**: Allows single passengers (e.g., senior citizens requiring medical legroom) to reserve adjacent multi-person seats with comfort rate concessions.

---

### Module 6: Vendor and Highway Hotel Tie-Ups
- Commercial partnerships with high-density highway food plazas along Maharashtra corridors:
  - **Katraj Ghat Food Plaza (NH48 Kolhapur - Pune Corridor)**: Pure Veg Maharashtrian Thali, EV charging, 24x7 tea stalls.
  - **Karad Highway Midway Oasis**: Family dining & express refreshments.
  - **Lonavala Expressway Haven**: Mumbai-Pune Expressway food court.
- **Revenue Model**:
  - Fixed Monthly Contract Licensing Fee (₹35,000/mo at Katraj Ghat)
  - 10%–15% commission on pre-ordered meals and packaged refreshments.
- **Passenger Pre-Order System**:
  - MSRTC Rail Neer Packaged Mineral Water (₹15)
  - Katraj Ghat Highway Special Meal Thali Voucher (₹120)
  - Kolhapuri Bhakarwadi & Farsan Snack Box (₹55)
  - Travel Hygiene Kit (₹40)
  - Printable meal voucher barcodes generated directly on the Electronic Reservation Slip (ERS).

---

### Module 7: Passenger Priority and Safety Management
- **Senior Citizens (60+ yrs)**:
  - 50% State Concession
  - Automated allocation of lower front priority seats (Seats 1A, 1B, 2A, 2B) for easy boarding and conductor proximity.
- **Pregnant Women**:
  - Designated front ergonomic seats with smooth suspension (Seats 1C, 1D, 2C, 2D) and rapid exit access.
- **Solo Female Travelers**:
  - 50% Mahila Samman Concession
  - Safe adjacent seat matching (system matches adjacent seat in pair with female travelers only).
  - In-Journey **Emergency SOS Button**: Simulates instant dispatch of bus GPS coordinates to MSRTC 24x7 Transit Command (`1800-22-1234`) and Maharashtra Women Police Helpline (`1091`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, Tailwind CSS, Vanilla JavaScript (ES6+), FontAwesome 6 |
| **Backend & API** | Python 3 (Threading HTTPServer / Flask compatible REST API) |
| **Machine Learning** | Scikit-learn, XGBoost, NumPy, Pandas |
| **Database** | SQLite3 / PostgreSQL compatible schema (`backend/msrtc.db`) |
| **Visualization** | Interactive HTML5/CSS3 charts, live sliders, printable ERS slips |

---

## ⚡ Quick Start & Running the Project

### 1. Prerequisites
Ensure Python 3.9+ is installed:
```bash
python --version
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Server
```bash
python backend/server.py
```

Open your browser and visit:
👉 **`http://localhost:8000`**

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status & IST timestamp |
| `GET` | `/api/locations` | All 44 recognized MSRTC bus stands |
| `GET` | `/api/search?from=&to=&date=` | Bus schedules with ML demand & Happy Hours deals |
| `GET` | `/api/seats?scheduleId=&from=&to=&date=` | Real-time seat occupancy & booked seats |
| `POST` | `/api/book` | Complete reservation (priority, vendor add-ons, fare calculation) |
| `POST` | `/api/cancel` | Cancel booking and release seats |
| `GET` | `/api/revenue/unified` | Consolidated $R_{\text{total}}$ breakdown across all 4 streams |
| `GET` | `/api/ml/models` | Performance benchmark table (LR, DT, RF, XGBoost) |
| `GET` | `/api/happyhours/scenarios` | Discount scenario simulation & constraint satisfaction |
| `GET` | `/api/ads/analytics` | Statistical analytics on the 1,000 dataset records |
| `GET` | `/api/ads/list` | Sample active bus advertisements |
| `POST` | `/api/ads/predict` | Predict ad revenue & scans using ML model |
| `POST` | `/api/ads/scan` | Simulate passenger QR scan & generate merchant coupon |
| `GET` | `/api/vendors/catalog` | Highway rest-stops (Katraj Ghat) & refreshment menu |
| `GET` | `/api/group/quote` | Tiered group discount calculation |
| `POST` | `/api/safety/sos` | Trigger emergency alert to Control Room & Police |

---

## 📂 Project Structure

```
msrtc-smart-transit/
├── backend/
│   ├── server.py                   # Main HTTP API & Static Web Server
│   ├── ml_demand_forecasting.py    # Module 1: XGBoost, RF, DT, LR Benchmark Engine
│   ├── happy_hours_optimizer.py    # Modules 2 & 3: Constrained Fare Optimizer
│   ├── advertisement_service.py    # Module 4: Ad Dataset Analytics & ML Predictor
│   ├── group_booking_service.py    # Module 5: Tiered Bulk Discount Engine
│   ├── vendor_tieup_service.py     # Module 6: Katraj Ghat Rest-Stop & Catalog
│   ├── vendor_bidding_service.py   # Module 6 Enhancement: Rest-Stop Stall Bidding & Partner Registration
│   ├── cargo_service.py            # Courier, Cargo & Luggage Booking (MSRTC Vahatuk)
│   ├── passenger_safety_service.py # Module 7: Priority Allocation & Emergency SOS
│   ├── dataset_service.py          # 14 CSV Dataset Hub & In-Memory Indexer
│   ├── pricing.py                  # Fleet rates, road distances & baseline load
│   ├── test_api.py                 # Automated API test suite
│   └── msrtc.db                    # SQLite Database
├── data/                           # 14 Comprehensive MSRTC CSV Datasets
│   ├── advertisements.csv          # 1,000-row Advertisement Dataset
│   ├── booking_history.csv         # Historical ticket reservations
│   ├── bus_master.csv              # Fleet vehicle inventory
│   ├── fare_history.csv            # Historical pricing benchmarks
│   ├── fare_scenarios.csv          # Evaluated dynamic pricing scenarios
│   ├── group_bookings.csv          # Bulk reservations log
│   ├── holidays_events.csv         # Maharashtra festival calendar
│   ├── passenger_demand.csv        # 10,000 records demand forecasting dataset
│   ├── passenger_feedback.csv      # Transit customer ratings
│   ├── route_master.csv            # Bus route corridor matrix
│   ├── seat_inventory.csv          # Seat allocation & layouts
│   ├── trip_schedule.csv           # State transit timetable
│   ├── vendor_data.csv             # Highway partner directory
│   └── weather_data.csv            # Meteorological transit observations
├── index.html                      # Single Page Application UI with all modules & portals
├── app.js                          # Client Controller & interactive wizards
├── api.js                          # REST API Client
├── styles.css                      # Custom styling, priority indicators & print CSS
├── bus-on-road.jpg                 # Hero banner media
├── requirements.txt                # Python dependencies
└── README.md                       # Complete Project Documentation
```

---

## 🏆 Project Achievements & Extensions
- **Resolved Departure & Destination Booking Validation**: Guaranteed origin/destination stand binding across search results, seat modal, and ticket generation.
- **Highway Rest-Stop Stall Tender Bidding**: Real-time competitive bidding system for highway concessions (e.g., Katraj Ghat Plaza NH48, Karad Bypass, Satara Midway) with base reserve pricing and transparent audit logs.
- **Restaurant & Food Partner Onboarding**: Comprehensive registration wizard capturing FSSAI food license, seating capacity, restroom hygiene, EV fast charging, and agreed commission.
- **MSRTC Vahatuk (Courier & Cargo Logistics)**: Stand-to-stand parcel booking with dynamic freight calculation based on distance, weight, and speed tier (Standard vs. Express), plus excess baggage passes (>15 kg free allowance).
- **Consignment Tracking Engine**: 5-stage progress milestone tracker with real-time waypoint visibility and SMS/OTP verification.
- Integrated the user's **14 CSV Datasets (including 1,000-row advertisement dataset)** with statistical breakdowns and ML predictive models.
- Deployed and benchmarked **4 Machine Learning algorithms** (Linear Regression, Decision Tree, Random Forest, XGBoost) with MAE, RMSE, and $R^2$ metrics.
- Designed mathematical **Happy Hours Dynamic Pricing** with hard constraint enforcement.
- Showcased practical commercial partnerships featuring the **Katraj Ghat Highway Food Plaza** along the Kolhapur-Pune corridor.
- Provided a unified revenue dashboard combining **Ticket, Advertising, Vendor, and Partnership** financial streams.
