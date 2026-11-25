/**
 * =========================================================
 * MSRTC SMART TRANSIT - UNIFIED REVENUE & ML API CLIENT
 * Supports all 7 Project Modules:
 *   1. ML Demand Forecasting
 *   2. Seat Occupancy Optimization
 *   3. Dynamic Fare & Happy Hours Engine
 *   4. Advertisement Dataset & Revenue Predictor
 *   5. Group & Multi-Day Bulk Discounts
 *   6. Highway Rest-Stops & Vendor Catalog (Katraj Ghat)
 *   7. Passenger Priority, Women Safety & Emergency SOS
 * =========================================================
 */

const API_BASE = location.protocol.startsWith('http') ? '' : 'http://localhost:8000';

async function apiRequest(path, options = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, options);
  } catch (e) {
    throw new Error('Cannot reach backend. Run "python backend/server.py" and visit http://localhost:8000');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'Request failed. Try again.');
    err.status = res.status;
    err.data = body;
    throw err;
  }
  return body;
}

function apiGet(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(query ? `${path}?${query}` : path);
}

function apiPost(path, data) {
  return apiRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const inr = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const inrPrecise = n => '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MSRTCApi = {
  getLocations: () => apiGet('/api/locations'),
  searchBuses: (from, to, date) => apiGet('/api/search', { from, to, date }),
  getSeats: (scheduleId, from, to, date) => apiGet('/api/seats', { scheduleId, from, to, date }),
  bookTicket: data => apiPost('/api/book', data),
  cancelTicket: bookingId => apiPost('/api/cancel', { bookingId }),
  getUnifiedRevenue: () => apiGet('/api/revenue/unified'),
  getMLModels: () => apiGet('/api/ml/models'),
  getAdAnalytics: () => apiGet('/api/ads/analytics'),
  getAdList: () => apiGet('/api/ads/list'),
  predictAdRevenue: (position, campaignType, durationDays) => apiPost('/api/ads/predict', { position, campaignType, durationDays }),
  scanAdQR: advertisementId => apiPost('/api/ads/scan', { advertisementId }),
  bookAdCampaign: payload => apiPost('/api/ads/book', payload),
  getAdBookings: () => apiGet('/api/ads/bookings'),
  cancelAdBooking: bookingId => apiPost('/api/ads/cancel', { bookingId }),
  getVendorCatalog: () => apiGet('/api/vendors/catalog'),
  getGroupQuote: (passengers, fare, days) => apiGet('/api/group/quote', { passengers, fare, days }),
  simulateHappyHours: (baseFare, demand) => apiGet('/api/happyhours/scenarios', { baseFare, demand }),
  triggerEmergencySOS: (bookingId, busNumber) => apiPost('/api/safety/sos', { bookingId, busNumber }),
  checkPriorityCategory: category => apiPost('/api/priority/check', { category }),
  getDatasetsSummary: () => apiGet('/api/datasets/summary'),
  viewDataset: (file, limit = 25, search = '') => apiGet('/api/datasets/view', { file, limit, search }),
  getBiddingStalls: () => apiGet('/api/vendors/bids'),
  placeStallBid: (stallId, vendorName, vendorPhone, bidAmount) => apiPost('/api/vendors/bid', { stallId, vendorName, vendorPhone, bidAmount }),
  registerVendor: data => apiPost('/api/vendors/register', data),
  getRegisteredVendors: () => apiGet('/api/vendors/registered'),
  getCargoQuote: data => apiPost('/api/cargo/quote', data),
  bookCargo: data => apiPost('/api/cargo/book', data),
  trackCargo: query => apiGet('/api/cargo/track', { query }),
  getAllCargo: () => apiGet('/api/cargo/all'),
  register: data => apiPost('/api/auth/register', data),
  login: data => apiPost('/api/auth/login', data),
  logout: token => apiPost('/api/auth/logout', { token }),
  verifySession: token => apiGet('/api/auth/verify', { token }),
  updateProfile: (token, data) => apiPost('/api/auth/profile', { token, ...data }),
  getWomenSafetyDashboard: () => apiGet('/api/safety/women-dashboard'),
  requestSafeDrop: data => apiPost('/api/safety/safe-drop', data),
  shareJourneyTracking: data => apiPost('/api/safety/share-trip', data)
};
