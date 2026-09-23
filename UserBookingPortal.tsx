import React, { useState } from 'react';

export interface UserProfile {
  userId: string;
  smartId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  createdAt: string;
}

export interface Booking {
  bookingId: string;
  pnr: string;
  userId: string;
  busDetails: {
    busNumber: string;
    busType: string;
    operator: string;
  };
  route: {
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    boardingPoint: string;
    duration: string;
  };
  seats: string[];
  passengers: Array<{
    name: string;
    age: number;
    gender: string;
  }>;
  fare: {
    baseFare: number;
    gst: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
  };
  tripStatus: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  bookedAt: string;
}

export const DEMO_USER: UserProfile = {
  userId: "usr_msrtc_78491",
  smartId: "MH-USR-94821",
  fullName: "Pravin Dongare",
  email: "pravindongare35@example.com",
  phoneNumber: "+91 98765 43210",
  gender: "Male",
  age: 29,
  createdAt: "2025-11-14T10:30:00Z"
};

export const DEMO_BOOKINGS: Booking[] = [
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
  }
];

export const UserBookingPortal: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(DEMO_USER);
  const [bookings, setBookings] = useState<Booking[]>(DEMO_BOOKINGS);
  const [includeSelf, setIncludeSelf] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'history' | 'smartid' | 'profile'>('history');

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 font-sans">
      {/* Self Profile Banner */}
      {user && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xl">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{user.fullName}</h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Self (Primary)</span>
              </div>
              <p className="text-sm text-slate-500">{user.email} • {user.phoneNumber} • {user.gender}, {user.age} yrs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('smartid')} 
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2 rounded-xl text-xs font-bold"
            >
              Digital Smart Pass
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 pb-3">
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'history' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          My Past & Upcoming Bookings
        </button>
        <button 
          onClick={() => setActiveTab('smartid')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'smartid' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Digital Smart ID
        </button>
      </div>

      {/* Digital Smart ID View */}
      {activeTab === 'smartid' && user && (
        <div className="max-w-md mx-auto bg-gradient-to-br from-red-800 to-red-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <span className="font-extrabold text-sm tracking-wider">MSRTC MOBILITY SMART PASS</span>
            <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full">VERIFIED CITIZEN</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg">{user.fullName}</h3>
              <p className="text-xs text-red-100">{user.phoneNumber}</p>
              <p className="text-xs text-amber-200">Smart ID: {user.smartId}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bookings View */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.bookingId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900">{b.busDetails.busType} ({b.route.from} ➔ {b.route.to})</h4>
                <p className="text-xs text-slate-500">Travelers: {b.passengers.map(p => p.name).join(', ')} • PNR: {b.pnr}</p>
              </div>
              <span className="text-sm font-bold text-slate-900">₹{b.fare.totalAmount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
