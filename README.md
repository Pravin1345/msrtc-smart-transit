# 🚌 MSRTC Mobility Portal • Smart Bus Transit

An official-style Smart Bus Transit web portal for **Maharashtra State Road Transport Corporation (MSRTC)** featuring **User Self-Management, Authentication, Profile Settings, and Historical Past & Upcoming Booking System**.

---

## 🌟 Key Features

### 1. 👤 User Self-Service & Authentication
- **User Attributes**: Full Name, Email (Username), Gender, Phone Number, Password, MSRTC Smart ID.
- **Login & Registration Modal**: Tab switching with instant demo credential autofill.
- **Self-Profile Management (`/profile`)**: Update personal information, phone number, gender (with 50% Mahila Samman concession tag), and password.
- **Digital MSRTC Smart Pass (`/smartid`)**: Verified citizen ID pass with simulated conductor QR verification.

### 2. 🎟️ Past & Upcoming Booking System
- **Comprehensive Journey Vault (`/history`)**: Filter by **All Trips**, **Upcoming**, **Completed**, and **Cancelled**.
- **Electronic Reservation Slip (ERS)**: Detailed printable ticket modal with PNR, vehicle number, seat numbers, passenger manifest, fare breakdown, and **"Print / Save PDF"** support.
- **Trip Cancellation**: Self-service cancellation with automated refund tracking.

### 3. 🚌 Real-time Booking Simulator (`/book`)
- **Book for Myself (Self-Toggle)**: Automatically autofills the primary passenger with the logged-in user's details.
- **Saved Family & Co-Passengers**: 1-click addition of saved family members.
- **Dynamic Seat & Fare Allocation**: Auto-calculates base fares + 5% GST across Shivneri, Shivshahi, Asiad, and Ordinary buses.

---

## 🚀 Live Demo & Usage

1. Clone this repository:
   ```bash
   git clone https://github.com/Pravin1345/msrtc-smart-transit.git
   cd msrtc-smart-transit
   ```
2. Open `index.html` directly in your browser:
   - Double click `index.html`, or
   - Run a local server: `python -m http.server 8080` and visit `http://localhost:8080`

---

## 🏛️ Technology Stack
- **HTML5 & CSS3**
- **Tailwind CSS** (via CDN)
- **Vanilla JavaScript** (LocalStorage persistence, reactive rendering)
- **FontAwesome 6** (Icons)
