/**
 * =========================================================
 * MSRTC MOBILITY SMART TRANSIT - DATA LAYER & DEMO MODELS
 * =========================================================
 */

// 1. Default Primary User Profile (Self)
const DEFAULT_USER = {
  userId: "usr_msrtc_78491",
  smartId: "MH-USR-94821",
  fullName: "Pravin Dongare",
  email: "pravindongare35@example.com",
  phoneNumber: "+91 98765 43210",
  gender: "Male",
  age: 29,
  createdAt: "2025-11-14T10:30:00Z"
};

// 2. Saved Co-Passengers (Family & Friends for Quick Autofill)
const SAVED_CO_PASSENGERS = [
  { name: "Suresh Dongare", age: 58, gender: "Male", relation: "Father" },
  { name: "Sunita Dongare", age: 54, gender: "Female", relation: "Mother" }
];

// 3. Realistic Demo Travel & Historical Booking Records
const INITIAL_BOOKINGS = [
  {
    bookingId: "MSRTC-2026-89472",
    pnr: "PNR7842918",
    userId: "usr_msrtc_78491",
    busDetails: {
      busNumber: "MH-14-BT-4521",
      busType: "Shivneri (AC Volvo)",
      operator: "Pune Division - Swargate Depot"
    },
    route: {
      from: "Pune (Swargate)",
      to: "Mumbai (Dadar)",
      departureTime: "2026-09-28T07:00:00+05:30",
      arrivalTime: "2026-09-28T11:00:00+05:30",
      boardingPoint: "Swargate Platform 3 (Shivneri AC Bay)",
      duration: "4h 00m"
    },
    seats: ["14A", "14B"],
    passengers: [
      { name: "Pravin Dongare (Self)", age: 29, gender: "Male" },
      { name: "Suresh Dongare", age: 58, gender: "Male" }
    ],
    fare: {
      baseFare: 1020,
      gst: 51,
      totalAmount: 1071,
      paymentMethod: "UPI (Google Pay)",
      paymentStatus: "PAID"
    },
    tripStatus: "UPCOMING",
    bookedAt: "2026-09-21T14:15:00+05:30"
  },
  {
    bookingId: "MSRTC-2026-72319",
    pnr: "PNR5541902",
    userId: "usr_msrtc_78491",
    busDetails: {
      busNumber: "MH-15-EG-8834",
      busType: "Shivshahi (AC Seater)",
      operator: "Nashik Division - CBS Depot"
    },
    route: {
      from: "Pune (Shivajinagar)",
      to: "Nashik (CBS)",
      departureTime: "2026-08-15T06:30:00+05:30",
      arrivalTime: "2026-08-15T11:45:00+05:30",
      boardingPoint: "Shivajinagar Stand Bay 4",
      duration: "5h 15m"
    },
    seats: ["08A"],
    passengers: [
      { name: "Pravin Dongare (Self)", age: 29, gender: "Male" }
    ],
    fare: {
      baseFare: 360,
      gst: 18,
      totalAmount: 378,
      paymentMethod: "PhonePe UPI",
      paymentStatus: "PAID"
    },
    tripStatus: "COMPLETED",
    bookedAt: "2026-08-10T09:40:00+05:30"
  },
  {
    bookingId: "MSRTC-2026-61904",
    pnr: "PNR4219803",
    userId: "usr_msrtc_78491",
    busDetails: {
      busNumber: "MH-09-EM-9921",
      busType: "Nim-Aramdayi (Asiad Express)",
      operator: "Kolhapur Division"
    },
    route: {
      from: "Pune (Swargate)",
      to: "Kolhapur Central",
      departureTime: "2026-07-02T13:00:00+05:30",
      arrivalTime: "2026-07-02T18:30:00+05:30",
      boardingPoint: "Swargate Inter-District Platform 8",
      duration: "5h 30m"
    },
    seats: ["21B", "21C"],
    passengers: [
      { name: "Pravin Dongare (Self)", age: 29, gender: "Male" },
      { name: "Anil Kadam", age: 31, gender: "Male" }
    ],
    fare: {
      baseFare: 480,
      gst: 24,
      totalAmount: 504,
      paymentMethod: "Debit Card",
      paymentStatus: "PAID"
    },
    tripStatus: "COMPLETED",
    bookedAt: "2026-06-29T18:22:00+05:30"
  },
  {
    bookingId: "MSRTC-2026-44102",
    pnr: "PNR3109481",
    userId: "usr_msrtc_78491",
    busDetails: {
      busNumber: "MH-20-CL-1104",
      busType: "Shivneri (AC Volvo)",
      operator: "Chhatrapati Sambhajinagar"
    },
    route: {
      from: "Pune (Shivajinagar)",
      to: "Chhatrapati Sambhajinagar",
      departureTime: "2026-05-18T08:00:00+05:30",
      arrivalTime: "2026-05-18T13:30:00+05:30",
      boardingPoint: "Shivajinagar AC Platform",
      duration: "5h 30m"
    },
    seats: ["04A"],
    passengers: [
      { name: "Pravin Dongare (Self)", age: 29, gender: "Male" }
    ],
    fare: {
      baseFare: 550,
      gst: 27,
      totalAmount: 577,
      paymentMethod: "NetBanking",
      paymentStatus: "REFUNDED"
    },
    tripStatus: "CANCELLED",
    bookedAt: "2026-05-12T11:05:00+05:30"
  }
];

// 4. MSRTC Fleet Services & Base Pricing
const MSRTC_FLEET = {
  "Shivneri (AC Volvo)": {
    baseFarePerSeat: 535,
    tag: "Luxury Multi-Axle",
    features: ["Climate Controlled AC", "USB Charging Ports", "Transit WiFi & Water Bottle"]
  },
  "Shivshahi (AC Seater)": {
    baseFarePerSeat: 360,
    tag: "AC Express",
    features: ["Central Air Conditioning", "Push-back Luxury Seats", "Live GPS Vehicle Tracking"]
  },
  "Nim-Aramdayi (Asiad Express)": {
    baseFarePerSeat: 240,
    tag: "Semi-Luxury",
    features: ["2+2 Cushioned Seating", "Point-to-Point Express", "Pocket-Friendly Fares"]
  },
  "Ordinary Lal Dabba": {
    baseFarePerSeat: 150,
    tag: "State Standard",
    features: ["High Frequency", "All Village Halts", "State Concessions Valid"]
  }
};
