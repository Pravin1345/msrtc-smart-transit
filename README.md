# MSRTC Smart Bus Transit - User Auth & Historical Booking System

This project contains the complete implementation for adding **User Identification, Authentication, Profile Management, and Historical Booking System** with realistic demo data.

---

## 🚀 Key Features Implemented

### 1. 👤 User Authentication & Profile
- **Full Name, Email (Username), Gender, Phone Number, Password**.
- **Sign In & Registration Modals** with tab switching and demo autofill.
- **Login / Logout State Persistence** via `localStorage`.
- **User Profile Dashboard (`/profile`)** to view/edit personal details and change passwords.
- **Avatar & Identification Badges** showing verified citizen status and unique MSRTC Smart IDs (`MH-USR-94821`).

### 2. 🎟️ Past Historical Booking System
- **Pre-populated realistic historical data** for Shivneri (AC Volvo), Shivshahi (AC Seater), and Nim-Aramdayi (Asiad Express) across Maharashtra routes (Pune, Mumbai, Nashik, Kolhapur, Chhatrapati Sambhajinagar).
- **Multi-Filter Tabs**:
  - `All Trips`
  - `Upcoming Trips` (with pulsing live indicator & Cancel trip option)
  - `Completed Trips` (verified journey history)
  - `Cancelled Trips` (refund status)
- **Electronic Reservation Slip (ERS) / Ticket Modal**:
  - View full PNR, seat numbers, bus numbers, route details, passenger manifest, fare breakdown, and payment status.
  - **Print / Save as PDF** support.

### 3. 🚌 Interactive Booking Simulator
- Book new tickets across major Maharashtra destinations.
- Dynamically generates PNR numbers, assigns seats, calculates fares + GST, and **instantly appends the new booking to the user's booking history**.

---

## 📂 File Locations

- **Full Standalone Web App**: [index.html](file:///C:/Users/DELL/.gemini/antigravity/scratch/msrtc-smart-transit/index.html)
