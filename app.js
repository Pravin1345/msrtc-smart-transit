/**
 * =========================================================
 * MSRTC SMART TRANSIT - UNIFIED APPLICATION CONTROLLER
 * 
 * Supports:
 *   Module 1: ML Demand Forecasting (XGBoost, RF, DT, LR)
 *   Module 2 & 3: Happy Hours Dynamic Pricing & Seat Optimization
 *   Module 4: In-Bus Advertising (1,000 Record Dataset Analytics & ML Predictor)
 *   Module 5: Group & Multi-Day Bulk Discounts Calculator
 *   Module 6: Katraj Ghat Rest-Stop & Onboard Refreshment Tie-Ups
 *   Module 7: Passenger Priority, Women Safety & Emergency SOS
 * =========================================================
 */

// 1. STATE & STORAGE
const DEFAULT_USER = {
  userId: "usr_guest",
  name: "Guest Passenger",
  fullName: "Guest Passenger",
  email: "",
  phone: "",
  gender: "Male",
  age: 28,
  category: "General",
  smartId: "MH-MSRTC-GUEST",
  isVerified: false
};

let authToken = localStorage.getItem('msrtc_auth_token') || null;
let currentUser = getStoredUser();
let currentFilter = 'ALL';
let currentSearchResults = [];
let activeBus = null;
let selectedSeats = [];
let passengerDetails = [];
let selectedVendorItems = [];
let vendorCatalog = [];
let activeLiveScans = 2570524;

function isAuthenticated() {
  return Boolean(authToken && currentUser && currentUser.email);
}

function getStoredUser() {
  const u = localStorage.getItem('msrtc_active_user');
  if (u) {
    try { return JSON.parse(u); } catch(e) {}
  }
  return DEFAULT_USER;
}

function saveStoredUser(user) {
  localStorage.setItem('msrtc_active_user', JSON.stringify(user));
}

function getStoredBookings() {
  const b = localStorage.getItem('msrtc_user_bookings');
  if (b) {
    try { return JSON.parse(b); } catch(e) {}
  }
  return [];
}

function saveStoredBookings(bookings) {
  localStorage.setItem('msrtc_user_bookings', JSON.stringify(bookings));
}

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    try {
      const res = await MSRTCApi.verifySession(authToken);
      if (res && res.valid && res.user) {
        currentUser = res.user;
        saveStoredUser(currentUser);
      } else {
        authToken = null;
        currentUser = DEFAULT_USER;
        localStorage.removeItem('msrtc_auth_token');
        localStorage.removeItem('msrtc_active_user');
      }
    } catch (e) {
      // Keep cached user if network glitch
    }
  }
  renderAuthCorner();
  populateLocationsList();
  setDefaultBookingDate();
  loadVendorCatalog();
  applyTranslations();
  navigateTo('home');
});

// 2B. BILINGUAL SUPPORT (ENGLISH / MARATHI)
let currentLang = localStorage.getItem('msrtc_lang') || 'en';

const TRANSLATIONS = {
  en: {
    top_banner_text: "MSRTC • ML-Based Revenue Optimization System • Passenger Safety • Highway Vendor Tie-Ups",
    helpline: "Helpline: 1800-22-1234",
    women_sos: "Women SOS 1091",
    nav_home: "Explore",
    nav_features: "All Features",
    nav_book: "Book Bus",
    nav_ads: "In-Bus Ads",
    nav_vendors: "Rest-Stops",
    nav_bidding: "Bidding",
    nav_cargo: "Courier",
    nav_history: "My Trips",
    nav_smartid: "Smart ID",
    nav_safety: "Women Safety",
    hero_title: "Book Bus Tickets Online",
    btn_all_features: "All Services & Features",
    btn_rev_dash: "Revenue & ML Dashboard",
    btn_bus_qr: "Bus Ad QR",
    lbl_from: "Travelling From",
    lbl_to: "Going To",
    lbl_date: "Journey Date",
    btn_today: "Today",
    btn_tom: "Tom",
    btn_search_buses: "Search Buses",
    qs_book: "Book Tickets",
    qs_book_sub: "Live Schedules & Fares",
    qs_pnr: "PNR / My Trips",
    qs_pnr_sub: "Booking & Ticket Status",
    qs_cargo: "Courier & Luggage",
    qs_cargo_sub: "Parcel & Waybill Booking",
    qs_safety: "Women Safety (1091)",
    qs_safety_sub: "Safe Drop & SOS Portal",
    modules_heading: "MSRTC Integrated Transit & Revenue Modules",
    modules_sub: "Click any module below to open its portal directly.",
    view_all_features: "View All Services & Features",
    mod1_title: "1. ML Demand Forecasting",
    mod1_desc: "Compares Linear Regression, Decision Tree, Random Forest & XGBoost to forecast passenger loads, expected occupancy, and off-peak vacancies.",
    mod2_title: "2 & 3. Dynamic Fare Optimizer",
    mod2_desc: "Constrained Revenue Optimizer: Expected Revenue = Fare × Expected Bookings. Applies off-peak discounts only on low-occupancy buses.",
    mod4_title: "4. In-Bus Advertising (Dataset)",
    mod4_desc: "Position-based pricing (Front/First 10/Middle/Rear). Trained on 1,000 advertisement records predicting revenue and tracking QR scans.",
    mod5_title: "5. Group & Multi-Day Bulk",
    mod5_desc: "Tiered discounts for wedding parties, college tours (10%–20%), multi-day reservations (>3 days), and flexible multi-seat allocation.",
    mod6_title: "6. Vendor & Rest-Stop Tie-Ups",
    mod6_desc: "Katraj Ghat Highway Food Plaza (Pune-Kolhapur NH48) & Onboard MSRTC Rail Neer pre-orders, earning 10%–15% commission + rest-stop bidding fees.",
    mod7_title: "7. Passenger Priority & Safety",
    mod7_desc: "Priority seating for Senior Citizens (Row 1-2), Pregnant Women, and Solo Female Safe Matching with instant Control Room SOS dispatch.",
    rev_framework: "Consolidated Financial Framework",
    rev_formula_title: "Total Revenue Formula",
    btn_view_rev: "View Live Revenue Breakdown",
    feat_portal_label: "Happy Hours • Citizen & Operator Services",
    feat_portal_title: "All Services & Features Directory",
    feat_portal_sub: "Select any service below to open it directly.",
    btn_back_home: "Back to Home",
    open_service: "Open Service",
    tag_passenger: "Passenger",
    tag_safety: "Safety 1091",
    tag_logistics: "Logistics",
    tag_concession: "Concession",
    tag_bulk: "Bulk / Charter",
    tag_commercial: "Commercial",
    tag_tender: "E-Tender",
    tag_analytics: "ML + QR",
    tag_ml: "ML Engine",
    tag_account: "Account",
    f_book_title: "Bus Ticket Booking & Dynamic Fares",
    f_book_desc: "Search Shivneri, Shivshahi, Asiad & Ordinary buses. Off-peak discounts on low-occupancy buses and regular fare on high-demand buses.",
    f_safety_title: "Women Safety, Night Safe Drop & SOS",
    f_safety_desc: "Automated female co-seating rule, Night Guardian Safe Drop requests (7 PM–6 AM), Family GPS tracker link, and 1-click SOS 1091.",
    f_cargo_title: "Courier & Luggage Waybill Booking",
    f_cargo_desc: "Send parcels and extra passenger luggage via MSRTC bus cargo compartments with instant digital waybill and tracking.",
    f_history_title: "My Trips & PNR Ticket Status",
    f_history_desc: "View confirmed reservations, download Electronic Reservation Slips (ERS), check PNR status, or cancel bookings.",
    f_smartid_title: "Digital Smart Transit ID",
    f_smartid_desc: "QR-verified passenger pass for Senior Citizens, Mahila Samman, Students, and Divyangjan state travel concessions.",
    f_group_title: "Group & Multi-Day Bulk Calculator",
    f_group_desc: "Calculate tiered 10%–20% group discounts for college tours, wedding parties, and multi-day bus reservations.",
    f_vendors_title: "Highway Rest-Stop Food & Rail Neer",
    f_vendors_desc: "Pre-order verified highway meals and onboard drinking water from partner rest-stops like Katraj Ghat Food Plaza.",
    f_bidding_title: "Restaurant Registration & Bidding",
    f_bidding_desc: "Highway restaurant registration portal and live e-tender bidding for official MSRTC bus halt partnerships.",
    f_ads_title: "In-Bus Advertising & QR Scanner",
    f_ads_desc: "Seat-position ad revenue predictor trained on 1,000 records, live campaign booking, and passenger QR coupon scanner.",
    f_rev_title: "Unified Revenue & ML Dashboard",
    f_rev_desc: "Live ticket, ad, vendor, and partnership KPIs, ML model benchmarks (XGBoost/RF/DT/LR), and fare elasticity simulator.",
    f_profile_title: "Passenger Registration & Profile",
    f_profile_desc: "Register or sign in to save passenger details, concession eligibility, emergency contacts, and travel preferences."
  },
  mr: {
    top_banner_text: "एस.टी. महामंडळ • एआय महसूल प्रणाली • प्रवासी सुरक्षा • महामार्ग थांबा भागीदारी",
    helpline: "हेल्पलाईन: १८००-२२-१२३४",
    women_sos: "महिला हेल्पलाईन १०९१",
    nav_home: "मुख्यपृष्ठ",
    nav_features: "सर्व सुविधा",
    nav_book: "तिकीट बुकिंग",
    nav_ads: "बस जाहिराती",
    nav_vendors: "अल्पोपहार थांबे",
    nav_bidding: "निविदा (Bidding)",
    nav_cargo: "पार्सल व सामान",
    nav_history: "माझा प्रवास",
    nav_smartid: "स्मार्ट आयडी",
    nav_safety: "महिला सुरक्षा",
    hero_title: "बस तिकिटे ऑनलाइन बुक करा",
    btn_all_features: "सर्व सेवा आणि सुविधा",
    btn_rev_dash: "महसूल व एमएल डॅशबोर्ड",
    btn_bus_qr: "बस जाहिरात QR",
    lbl_from: "कोठून प्रवास (From)",
    lbl_to: "कोठे जाणार (To)",
    lbl_date: "प्रवासाची तारीख",
    btn_today: "आज",
    btn_tom: "उद्या",
    btn_search_buses: "बस शोधा",
    qs_book: "तिकीट बुक करा",
    qs_book_sub: "वेळापत्रक आणि भाडे दर",
    qs_pnr: "PNR / माझा प्रवास",
    qs_pnr_sub: "तिकीट स्थिती तपासा",
    qs_cargo: "पार्सल व सामान",
    qs_cargo_sub: "वे-बिल बुकिंग सेवा",
    qs_safety: "महिला सुरक्षा (१०९१)",
    qs_safety_sub: "रात्री सुरक्षित थांबा व SOS",
    modules_heading: "एस.टी. स्मार्ट ट्रान्झिट आणि महसूल मॉड्यूल्स",
    modules_sub: "थेट उघडण्यासाठी खालील कोणत्याही सेवेवर क्लिक करा.",
    view_all_features: "सर्व सेवा व सुविधा पहा",
    mod1_title: "१. प्रवासी मागणी अंदाज (ML)",
    mod1_desc: "प्रवाशांची संख्या, बसची क्षमता आणि रिकाम्या जागांचा अंदाज घेण्यासाठी लिनियर रिग्रेशन, डिसिजन ट्री, रँडम फॉरेस्ट व XGBoost ची तुलना.",
    mod2_title: "२ व ३. डायनॅमिक भाडे प्रणाली",
    mod2_desc: "गर्दी नसलेल्या ऑफ-पीक बसवर सवलतीचे दर आणि जास्त मागणी असलेल्या बसवर नियमित भाडे लागू करण्याची प्रणाली.",
    mod4_title: "४. बस अंतर्गत जाहिराती",
    mod4_desc: "आसनांच्या स्थितीनुसार जाहिरात दर आणि १,००० नोंदींवर आधारित महसूल अंदाज व QR स्कॅन ट्रॅकिंग.",
    mod5_title: "५. ग्रुप व बहु-दिवसीय बुकिंग",
    mod5_desc: "लग्न समारंभ, शैक्षणिक सहली (१०%–२०% सवलत) आणि ३ दिवसांपेक्षा जास्त प्रवासासाठी विशेष ग्रुप सवलत.",
    mod6_title: "६. महामार्ग हॉटेल व थांबा भागीदारी",
    mod6_desc: "कात्रज घाट फूड प्लाझा व बसमधील रेल नीर पाण्याची पूर्व-नोंदणी तसेच हॉटेल निविदा महसूल प्रणाली.",
    mod7_title: "७. प्रवासी प्राधान्य व सुरक्षा",
    mod7_desc: "ज्येष्ठ नागरिक, गर्भवती महिला आणि एकट्या महिला प्रवाशांसाठी सुरक्षित आसन व्यवस्था व १०९१ SOS अलर्ट.",
    rev_framework: "एकत्रित आर्थिक आराखडा",
    rev_formula_title: "एकूण महसूल सूत्र",
    btn_view_rev: "थेट महसूल तपशील पहा",
    feat_portal_label: "Happy Hours • प्रवासी आणि व्यावसायिक सेवा",
    feat_portal_title: "सर्व सेवा आणि सुविधा निर्देशिका",
    feat_portal_sub: "ती सेवा उघडण्यासाठी खालील कोणत्याही कार्डवर क्लिक करा.",
    btn_back_home: "मुख्यपृष्ठावर जा",
    open_service: "सेवा उघडा",
    tag_passenger: "प्रवासी सेवा",
    tag_safety: "सुरक्षा १०९१",
    tag_logistics: "मालवाहतूक",
    tag_concession: "सवलत पास",
    tag_bulk: "ग्रुप बुकिंग",
    tag_commercial: "व्यावसायिक",
    tag_tender: "ई-निविदा",
    tag_analytics: "एमएल + QR",
    tag_ml: "एमएल प्रणाली",
    tag_account: "खाते",
    f_book_title: "बस तिकीट बुकिंग व डायनॅमिक दर",
    f_book_desc: "शिवनेरी, शिवशाही, निम-आराम आणि साध्या बस शोधा. कमी गर्दीच्या बसवर ऑफ-पीक सवलत व जास्त गर्दीवर नियमित भाडे.",
    f_safety_title: "महिला सुरक्षा, रात्रीचा सुरक्षित थांबा व SOS",
    f_safety_desc: "शेजारील महिला आसन संरक्षण, रात्री ७ ते सकाळी ६ सुरक्षित थांबा विनंती, कुटुंब GPS ट्रॅकर आणि १-क्लिक SOS १०९१.",
    f_cargo_title: "पार्सल व सामान वे-बिल बुकिंग",
    f_cargo_desc: "एस.टी. बसच्या मालवाहू डब्यातून पार्सल आणि जादा सामान पाठवण्यासाठी डिजिटल वे-बिल व ट्रॅकिंग सेवा.",
    f_history_title: "माझा प्रवास आणि PNR तिकीट स्थिती",
    f_history_desc: "बुक केलेली तिकिटे पहा, इलेक्ट्रॉनिक आरक्षण स्लिप (ERS) डाउनलोड करा, PNR तपासा किंवा तिकीट रद्द करा.",
    f_smartid_title: "डिजिटल स्मार्ट ट्रान्झिट आयडी",
    f_smartid_desc: "ज्येष्ठ नागरिक, महिला सन्मान, विद्यार्थी आणि दिव्यांग प्रवाशांसाठी QR-सत्यापित सवलत ओळखपत्र.",
    f_group_title: "ग्रुप आणि बहु-दिवसीय बुकिंग कॅल्क्युलेटर",
    f_group_desc: "शैक्षणिक सहली, लग्न कार्य आणि सामूहिक प्रवासासाठी १०% ते २०% ग्रुप सवलतीची गणना करा.",
    f_vendors_title: "महामार्ग अल्पोपहार आणि रेल नीर नोंदणी",
    f_vendors_desc: "कात्रज घाट फूड प्लाझा सारख्या अधिकृत महामार्ग थांब्यांवर जेवण व पिण्याचे पाणी आगाऊ बुक करा.",
    f_bidding_title: "हॉटेल नोंदणी आणि ई-निविदा (Bidding)",
    f_bidding_desc: "अधिकृत एस.टी. बस थांब्यासाठी महामार्ग हॉटेल नोंदणी आणि थेट निविदा प्रक्रिया.",
    f_ads_title: "बस जाहिराती व QR कूपन स्कॅनर",
    f_ads_desc: "१,००० नोंदींवर आधारित जाहिरात महसूल अंदाज, मोहीम नोंदणी आणि प्रवासी QR कूपन स्कॅनर.",
    f_rev_title: "एकत्रित महसूल व एमएल डॅशबोर्ड",
    f_rev_desc: "तिकीट, जाहिरात, हॉटेल आणि भागीदारी महसूल तसेच ML मॉडेल तुलना व भाडे सिम्युलेटर.",
    f_profile_title: "प्रवासी नोंदणी आणि प्रोफाइल",
    f_profile_desc: "प्रवासी माहिती, सवलत पात्रता आणि आपत्कालीन संपर्क जतन करण्यासाठी लॉगिन किंवा नोंदणी करा."
  }
};

function setLanguage(lang) {
  currentLang = (lang === 'mr') ? 'mr' : 'en';
  localStorage.setItem('msrtc_lang', currentLang);
  applyTranslations();
}

function applyTranslations() {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  const enBtn = document.getElementById('lang-btn-en');
  const mrBtn = document.getElementById('lang-btn-mr');
  if (enBtn && mrBtn) {
    if (currentLang === 'mr') {
      mrBtn.className = "px-1.5 py-0.5 rounded text-[11px] font-bold bg-white text-[#1e3a5f] transition";
      enBtn.className = "px-1.5 py-0.5 rounded text-[11px] font-semibold text-white hover:bg-white/20 transition";
    } else {
      enBtn.className = "px-1.5 py-0.5 rounded text-[11px] font-bold bg-white text-[#1e3a5f] transition";
      mrBtn.className = "px-1.5 py-0.5 rounded text-[11px] font-semibold text-white hover:bg-white/20 transition";
    }
  }
}

function renderAuthCorner() {
  const box = document.getElementById('auth-section');
  if (!box) return;

  if (isAuthenticated()) {
    box.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 cursor-pointer bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-xl border border-red-200 transition" onclick="navigateTo('profile')">
          <div class="w-8 h-8 rounded-full bg-slate-900 text-amber-300 font-bold flex items-center justify-center text-xs shadow-sm">
            <i class="fa-solid fa-user"></i>
          </div>
          <div class="hidden sm:block text-left text-xs">
            <p class="font-extrabold text-slate-900 leading-tight">${esc(currentUser.fullName || currentUser.name)}</p>
            <p class="text-[10px] text-slate-500 font-mono">${esc(currentUser.smartId)}</p>
          </div>
        </div>
        <button onclick="handleLogout()" title="Sign Out" class="text-xs text-slate-500 hover:text-msrtc-red p-2 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    `;
  } else {
    box.innerHTML = `
      <button onclick="openAuthModal('login')" class="bg-msrtc-red hover:bg-msrtc-darkred text-white font-bold py-2 px-3 sm:px-4 rounded-xl text-xs shadow-sm transition flex items-center gap-1.5">
        <i class="fa-solid fa-right-to-bracket"></i>
        <span>Sign In / Register</span>
      </button>
    `;
  }
}

// 3. NAVIGATION CONTROLLER
function navigateTo(pageId) {
  document.querySelectorAll('.page-view').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('block');
  });

  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('block');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-page') === pageId) {
      btn.classList.add('text-msrtc-red', 'bg-red-50');
      btn.classList.remove('text-slate-700');
    } else {
      btn.classList.remove('text-msrtc-red', 'bg-red-50');
      btn.classList.add('text-slate-700');
    }
  });

  if (pageId === 'history') {
    renderBookingsList();
  } else if (pageId === 'profile') {
    loadProfileForm();
  } else if (pageId === 'smartid') {
    renderSmartIDPass();
  } else if (pageId === 'ads') {
    loadAdsPage();
  } else if (pageId === 'vendors') {
    loadVendorsPage();
  } else if (pageId === 'revenue') {
    loadUnifiedDashboard();
  } else if (pageId === 'bidding') {
    loadBiddingStalls();
  } else if (pageId === 'cargo') {
    calculateLiveCargoTariff();
  } else if (pageId === 'women-safety') {
    loadWomenSafetyPage();
  } else if (pageId === 'book') {
    setDefaultBookingDate();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. LOCATIONS AUTOCOMPLETE
async function populateLocationsList() {
  const list = document.getElementById('transit-locations-list');
  let locations = [];
  try {
    locations = await MSRTCApi.getLocations();
  } catch (e) {
    locations = [
      "Kolhapur CBS (Central Bus Stand)", "Pune (Swargate)", "Mumbai (Dadar)",
      "Sangli Central Stand", "Satara Central", "Nashik (CBS)", "Ichalkaranji Central Stand"
    ];
  }

  window.msrtcLocations = locations;
  const optionsHtml = locations.map(loc => `<option value="${esc(loc)}">${esc(loc)}</option>`).join('');
  if (list) list.innerHTML = optionsHtml;

  const fromDefaults = {
    'home-from-location': 'Kolhapur CBS (Central Bus Stand)',
    'from-location': 'Kolhapur CBS (Central Bus Stand)',
    'modal-boarding-select': 'Kolhapur CBS (Central Bus Stand)'
  };
  const toDefaults = {
    'home-to-location': 'Pune (Swargate)',
    'to-location': 'Pune (Swargate)',
    'modal-dropping-select': 'Pune (Swargate)'
  };

  Object.entries({ ...fromDefaults, ...toDefaults }).forEach(([id, defVal]) => {
    const sel = document.getElementById(id);
    if (sel) {
      const prev = sel.value || defVal;
      sel.innerHTML = optionsHtml;
      if (locations.includes(prev)) sel.value = prev;
      else if (locations.includes(defVal)) sel.value = defVal;
    }
  });
}

function setDefaultBookingDate() {
  const today = new Date().toISOString().split('T')[0];
  ['travel-date', 'home-travel-date'].forEach(id => {
    const dateInput = document.getElementById(id);
    if (dateInput) {
      if (!dateInput.value) dateInput.value = today;
      dateInput.min = today;
    }
  });
}

function setHomeQuickDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const val = d.toISOString().split('T')[0];
  const homeDate = document.getElementById('home-travel-date');
  if (homeDate) homeDate.value = val;
}

function handleHomeSearchSubmit(e) {
  e.preventDefault();
  const fromVal = document.getElementById('home-from-location')?.value.trim() || '';
  const toVal = document.getElementById('home-to-location')?.value.trim() || '';
  const dateVal = document.getElementById('home-travel-date')?.value || new Date().toISOString().split('T')[0];

  const bookFrom = document.getElementById('from-location');
  const bookTo = document.getElementById('to-location');
  const bookDate = document.getElementById('travel-date');
  if (bookFrom) bookFrom.value = fromVal;
  if (bookTo) bookTo.value = toVal;
  if (bookDate) bookDate.value = dateVal;

  navigateTo('book');
  handleSearchSubmit(e);
}

// 5. SEARCH & BUS LIST WITH HAPPY HOURS BADGES
async function handleSearchSubmit(e) {
  e.preventDefault();
  const from = document.getElementById('from-location').value.trim();
  const to = document.getElementById('to-location').value.trim();
  const dateVal = document.getElementById('travel-date').value;

  const box = document.getElementById('search-results-box');
  box.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
    <i class="fa-solid fa-spinner fa-spin text-2xl text-msrtc-red mb-2"></i>
    <p>Running ML Demand Forecasting and checking Happy Hours pricing...</p>
  </div>`;

  try {
    const res = await MSRTCApi.searchBuses(from, to, dateVal);
    currentSearchResults = (res.buses || []).map(b => ({
      ...b,
      from: b.from || res.from || from,
      to: b.to || res.to || to,
      date: b.date || res.date || dateVal
    }));
    renderSearchResults(currentSearchResults, from, to, dateVal);
  } catch (err) {
    box.innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm">
      <i class="fa-solid fa-circle-exclamation mr-1"></i> ${esc(err.message)}
    </div>`;
  }
}

function renderSearchResults(buses, from, to, dateVal) {
  const box = document.getElementById('search-results-box');
  if (!buses.length) {
    box.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-600 text-sm">
      No buses found for this route and date. Try another date or popular corridors like Kolhapur CBS → Pune (Swargate).
    </div>`;
    return;
  }

  box.innerHTML = `
    <div class="flex items-center justify-between mb-2 text-xs text-slate-500 font-semibold px-1">
      <span>Available Schedules (${buses.length} trips on ${esc(dateVal)})</span>
      <span class="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
        <i class="fa-solid fa-chart-line mr-1"></i> ML Demand Forecasting Active
      </span>
    </div>
    <div class="space-y-4">
      ${buses.map((bus, idx) => {
        const isHH = bus.isHappyHours;
        const occPct = Math.round((bus.occupancy || 0) * 100);
        const demandBadge = {
          "HIGH": "bg-rose-100 text-rose-800 border-rose-300",
          "MEDIUM": "bg-blue-100 text-blue-800 border-blue-300",
          "LOW": "bg-emerald-100 text-emerald-800 border-emerald-300"
        }[bus.demand || "MEDIUM"];

        return `
          <div class="bg-white rounded border ${isHH ? 'border-green-600 shadow-sm' : (bus.demand === 'HIGH' ? 'border-red-300 shadow-sm' : 'border-slate-200 shadow-sm')} p-5 transition hover:shadow-md">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <!-- Left: Bus Details -->
              <div class="space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-extrabold text-base text-slate-900">${esc(bus.busType)}</span>
                  <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${esc(bus.busNumber)}</span>
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${demandBadge}">
                    ML Demand: ${esc(bus.demand)}
                  </span>
                  ${isHH ? `
                    <span class="text-[10px] font-bold uppercase tracking-wider bg-green-700 text-white px-2 py-0.5 rounded">
                      ⚡ Off-Peak Discount: ${bus.happyHoursDiscountPct}% OFF
                    </span>
                  ` : (bus.demand === 'HIGH' ? `
                    <span class="text-[10px] font-bold uppercase tracking-wider bg-red-800 text-white px-2 py-0.5 rounded">
                      🔥 High Demand – Regular Fare
                    </span>
                  ` : `
                    <span class="text-[10px] font-bold uppercase tracking-wider bg-gray-500 text-white px-2 py-0.5 rounded">
                      Regular Fare
                    </span>
                  `)}
                </div>

                <div class="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <div>
                    <span class="font-black text-slate-900 text-lg">${esc(bus.departure)}</span>
                    <span class="block text-[11px] text-slate-400 font-medium">${esc(from.split(' (')[0])}</span>
                  </div>
                  <div class="text-center font-mono text-[10px] text-slate-400">
                    <span class="block text-slate-600 font-bold">${esc(bus.duration)}</span>
                    <span class="block">──── <i class="fa-solid fa-bus text-msrtc-red"></i> ────</span>
                    <span class="block">${bus.distanceKm} km</span>
                  </div>
                  <div>
                    <span class="font-black text-slate-900 text-lg">${esc(bus.arrival)}</span>
                    <span class="block text-[11px] text-slate-400 font-medium">${esc(to.split(' (')[0])}</span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-1.5 pt-1">
                  ${(bus.amenities || []).map(a => `<span class="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded-md font-medium">${esc(a)}</span>`).join('')}
                </div>
              </div>

              <!-- Right: Pricing & CTA -->
              <div class="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                <div class="text-left lg:text-right">
                  <div class="flex items-baseline gap-1.5">
                    ${isHH ? `
                      <span class="text-xs text-slate-400 line-through">₹${bus.originalFare}</span>
                      <span class="text-2xl font-black text-green-800">₹${bus.fare}</span>
                    ` : `
                      <span class="text-2xl font-black text-slate-900">₹${bus.fare}</span>
                    `}
                    <span class="text-[10px] text-slate-500 font-medium">/ seat</span>
                  </div>
                  <div class="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                    <i class="fa-solid fa-chair"></i> ${bus.availableSeats} of 28 seats vacant (${occPct}% full)
                  </div>
                </div>

                <button onclick="openSeatModal(${idx})" class="mt-2 ${isHH ? 'bg-green-700 hover:bg-green-800 text-white font-bold' : (bus.demand === 'HIGH' ? 'bg-red-800 hover:bg-red-900 text-white font-bold' : 'bg-msrtc-red hover:bg-msrtc-darkred text-white font-bold')} text-xs px-5 py-2.5 rounded shadow transition flex items-center gap-1.5">
                  <i class="fa-solid fa-chair"></i> Select Seats & Book
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 6. SEAT MODAL, PASSENGER DETAILS & VENDOR ADD-ONS
async function openSeatModal(busIndex) {
  activeBus = currentSearchResults[busIndex];
  if (!activeBus) return;

  const depStand = activeBus.from || document.getElementById('from-location')?.value.trim() || activeBus.origin;
  const arrStand = activeBus.to || document.getElementById('to-location')?.value.trim() || activeBus.destination;
  const trvDate = activeBus.date || document.getElementById('travel-date')?.value || new Date().toISOString().split('T')[0];
  activeBus.from = depStand;
  activeBus.to = arrStand;
  activeBus.date = trvDate;

  selectedSeats = [];
  passengerDetails = [];
  selectedVendorItems = [];

  document.getElementById('modal-bus-title').innerText = `${activeBus.busType} (${activeBus.busNumber})`;
  document.getElementById('modal-bus-sub').innerText = `${depStand} → ${arrStand} • ${activeBus.departure} Departure`;

  const mBoard = document.getElementById('modal-boarding-select');
  const mDrop = document.getElementById('modal-dropping-select');
  if (mBoard) mBoard.value = depStand;
  if (mDrop) mDrop.value = arrStand;
  const distInfo = document.getElementById('modal-distance-fare-info');
  if (distInfo) {
    distInfo.innerText = `${activeBus.distanceKm || '--'} km • ₹${activeBus.fare || 0}/seat`;
  }

  // Fetch taken seats and ladies-adjacent restrictions from server
  let takenSeats = [];
  window.activeLadiesOnlyAdjacent = new Set();
  try {
    const sRes = await MSRTCApi.getSeats(activeBus.id, depStand, arrStand, trvDate);
    takenSeats = sRes.taken || [];
    window.activeLadiesOnlyAdjacent = new Set(sRes.ladiesOnlyAdjacent || []);
  } catch (e) {
    takenSeats = ["1A", "2C", "4D"];
  }

  renderSeatCabinGrid(takenSeats);
  renderPassengerInputs();
  renderVendorAddons();
  updateSummaryTotals();

  document.getElementById('seat-selection-modal').classList.remove('hidden');
}

function closeSeatModal() {
  document.getElementById('seat-selection-modal').classList.add('hidden');
}

async function handleModalRouteChange() {
  if (!activeBus) return;
  const mBoard = document.getElementById('modal-boarding-select')?.value;
  const mDrop = document.getElementById('modal-dropping-select')?.value;
  const trvDate = activeBus.date || document.getElementById('travel-date')?.value || new Date().toISOString().split('T')[0];
  const distInfo = document.getElementById('modal-distance-fare-info');

  if (!mBoard || !mDrop) return;
  if (mBoard === mDrop) {
    if (distInfo) distInfo.innerText = "Boarding & Dropping must differ";
    return;
  }

  if (distInfo) distInfo.innerText = "Calculating...";
  try {
    const q = await MSRTCApi.getTripQuote(activeBus.id, mBoard, mDrop, trvDate);
    activeBus.from = q.from;
    activeBus.to = q.to;
    activeBus.distanceKm = q.distanceKm;
    activeBus.fare = q.fare;
    activeBus.originalFare = q.originalFare;
    activeBus.isHappyHours = q.isHappyHours;
    activeBus.happyHoursDiscountPct = q.happyHoursDiscountPct;

    document.getElementById('modal-bus-sub').innerText = `${q.from} → ${q.to} • ${activeBus.departure} Departure`;
    if (distInfo) {
      distInfo.innerText = `${q.distanceKm} km • ₹${q.fare}/seat${q.isHappyHours ? ` (${q.happyHoursDiscountPct}% OFF)` : ''}`;
    }

    selectedSeats = [];
    document.getElementById('selected-seats-badge').innerText = 'None';
    window.activeLadiesOnlyAdjacent = new Set(q.ladiesOnlyAdjacent || []);
    renderSeatCabinGrid(q.taken || []);
    renderPassengerInputs();
    updateSummaryTotals();
  } catch (e) {
    if (distInfo) distInfo.innerText = e.message || "Route error";
  }
}

function renderSeatCabinGrid(takenList) {
  const grid = document.getElementById('bus-cabin-grid');
  grid.innerHTML = '';
  const takenSet = new Set(takenList);

  // Priority seat sets
  const seniorPriority = new Set(["1A", "1B", "2A", "2B"]);
  const pregnantPriority = new Set(["1C", "1D", "2C", "2D"]);
  const ladiesSafe = new Set(["3A", "3B", "4A", "4B"]);

  for (let r = 1; r <= 7; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = "flex items-center justify-between gap-2 py-0.5";

    const leftPair = document.createElement('div');
    leftPair.className = "flex gap-1.5";
    leftPair.appendChild(createSeatBtn(`${r}A`, takenSet, seniorPriority, pregnantPriority, ladiesSafe));
    leftPair.appendChild(createSeatBtn(`${r}B`, takenSet, seniorPriority, pregnantPriority, ladiesSafe));

    const aisle = document.createElement('div');
    aisle.className = "text-[9px] font-mono text-slate-400 font-bold px-1";
    aisle.innerText = `R${r}`;

    const rightPair = document.createElement('div');
    rightPair.className = "flex gap-1.5";
    rightPair.appendChild(createSeatBtn(`${r}C`, takenSet, seniorPriority, pregnantPriority, ladiesSafe));
    rightPair.appendChild(createSeatBtn(`${r}D`, takenSet, seniorPriority, pregnantPriority, ladiesSafe));

    rowDiv.appendChild(leftPair);
    rowDiv.appendChild(aisle);
    rowDiv.appendChild(rightPair);
    grid.appendChild(rowDiv);
  }
}

function createSeatBtn(seatNo, takenSet, seniorSet, pregnantSet, ladiesSet) {
  const btn = document.createElement('button');
  const isTaken = takenSet.has(seatNo);

  let extraClasses = "bg-white border-slate-300 text-slate-800 hover:border-msrtc-red";
  let title = `Seat ${seatNo} (Available)`;

  if (isTaken) {
    extraClasses = "bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed";
    title = `Seat ${seatNo} (Taken)`;
  } else if (window.activeLadiesOnlyAdjacent && window.activeLadiesOnlyAdjacent.has(seatNo)) {
    extraClasses += " seat-priority-ladies bg-purple-100 text-purple-900 border-purple-500";
    title = `Seat ${seatNo} (Ladies Only — Adjacent to Booked Ladies Seat)`;
  } else if (seniorSet.has(seatNo)) {
    extraClasses += " seat-priority-senior bg-blue-50/60 text-blue-900";
    title = `Seat ${seatNo} (Senior Citizen Priority)`;
  } else if (pregnantSet.has(seatNo)) {
    extraClasses += " seat-priority-pregnant bg-pink-50/60 text-pink-900";
    title = `Seat ${seatNo} (Pregnant Woman Ergonomic Priority)`;
  } else if (ladiesSet.has(seatNo)) {
    extraClasses += " seat-priority-ladies bg-purple-50/60 text-purple-900";
    title = `Seat ${seatNo} (Ladies Safe Matching Zone)`;
  }

  btn.type = "button";
  btn.className = `seat-btn w-9 h-8 text-[11px] font-bold rounded-lg border flex items-center justify-center ${extraClasses}`;
  btn.innerText = seatNo;
  btn.title = title;
  btn.disabled = isTaken;

  btn.onclick = () => toggleSeatSelect(seatNo, btn);
  return btn;
}

function toggleSeatSelect(seatNo, btnElement) {
  const idx = selectedSeats.indexOf(seatNo);
  if (idx > -1) {
    selectedSeats.splice(idx, 1);
    btnElement.classList.remove('selected');
  } else {
    if (selectedSeats.length >= 6) {
      alert("You can select up to 6 seats per transaction.");
      return;
    }
    selectedSeats.push(seatNo);
    btnElement.classList.add('selected');
  }

  document.getElementById('selected-seats-badge').innerText = selectedSeats.length ? selectedSeats.join(', ') : 'None';
  renderPassengerInputs();
  updateSummaryTotals();
}

function renderPassengerInputs() {
  const container = document.getElementById('passenger-inputs-container');
  container.innerHTML = '';

  if (!selectedSeats.length) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">Select one or more seats on the bus map to enter passenger details.</p>`;
    return;
  }

  selectedSeats.forEach((seat, i) => {
    const isLadiesRestricted = window.activeLadiesOnlyAdjacent && window.activeLadiesOnlyAdjacent.has(seat);
    // Default passenger info for the first seat is the logged-in user
    let defName = (i === 0 && currentUser.name) ? currentUser.name : '';
    let defAge = (i === 0 && currentUser.age) ? currentUser.age : 28;
    let defGen = isLadiesRestricted ? 'Female' : ((i === 0 && currentUser.gender) ? currentUser.gender : 'Male');
    let defCat = isLadiesRestricted ? 'Solo Female Traveler' : ((defAge >= 60) ? "Senior Citizen (60+)" : (defGen === "Female" ? "Solo Female Traveler" : "General"));

    container.innerHTML += `
      <div class="bg-white p-3 rounded-xl border ${isLadiesRestricted ? 'border-purple-300 bg-purple-50/30' : 'border-slate-200'} text-xs space-y-2">
        <div class="flex items-center justify-between font-bold text-slate-800">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-user text-slate-400"></i> Passenger for Seat <span class="text-msrtc-red font-mono">${seat}</span> ${isLadiesRestricted ? '<span class="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Ladies Only</span>' : ''}</span>
          <span class="text-[10px] text-slate-500 font-semibold" id="concession-badge-${i}">Checking concession...</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div class="sm:col-span-4">
            <input type="text" id="pax-name-${i}" value="${esc(defName)}" placeholder="Full Name" class="w-full p-2 border border-slate-300 rounded-lg" required />
          </div>
          <div class="sm:col-span-2">
            <input type="number" id="pax-age-${i}" value="${defAge}" min="1" max="110" placeholder="Age" oninput="handlePaxChange(${i})" class="w-full p-2 border border-slate-300 rounded-lg" required />
          </div>
          <div class="sm:col-span-3">
            <select id="pax-gender-${i}" onchange="handlePaxChange(${i})" class="w-full p-2 border border-slate-300 rounded-lg" ${isLadiesRestricted ? 'title="Adjacent to Ladies seat — Female passengers only"' : ''}>
              ${isLadiesRestricted ? `
                <option value="Female" selected>Female (Ladies Only)</option>
              ` : `
                <option value="Male" ${defGen === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${defGen === 'Female' ? 'selected' : ''}>Female (50% Concession)</option>
                <option value="Other">Other</option>
              `}
            </select>
          </div>
          <div class="sm:col-span-3">
            <select id="pax-category-${i}" onchange="handlePaxChange(${i})" class="w-full p-2 border border-slate-300 rounded-lg text-[11px] font-semibold">
              <option value="General">General</option>
              <option value="Senior Citizen (60+)" ${defCat === 'Senior Citizen (60+)' ? 'selected' : ''}>Senior Citizen (60+)</option>
              <option value="Pregnant Woman">Pregnant Woman</option>
              <option value="Solo Female Traveler" ${defCat === 'Solo Female Traveler' ? 'selected' : ''}>Solo Female Traveler</option>
            </select>
          </div>
        </div>
      </div>
    `;
  });

  selectedSeats.forEach((_, i) => handlePaxChange(i));
}

function handlePaxChange(i) {
  const age = parseInt(document.getElementById(`pax-age-${i}`)?.value || 25);
  const gen = document.getElementById(`pax-gender-${i}`)?.value || 'Male';
  const cat = document.getElementById(`pax-category-${i}`)?.value || 'General';
  const badge = document.getElementById(`concession-badge-${i}`);

  if (badge) {
    if (age < 5) {
      badge.innerText = "50% Child Concession";
      badge.className = "text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold";
    } else if (age >= 60 || cat === "Senior Citizen (60+)") {
      badge.innerText = "50% Senior Concession";
      badge.className = "text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold";
    } else if (gen === "Female" || cat === "Solo Female Traveler") {
      badge.innerText = "50% Mahila Samman";
      badge.className = "text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold";
    } else {
      badge.innerText = "Full Adult Fare";
      badge.className = "text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-semibold";
    }
  }

  updateSummaryTotals();
}

async function loadVendorCatalog() {
  try {
    const res = await MSRTCApi.getVendorCatalog();
    vendorCatalog = res.items || [];
  } catch (e) {
    vendorCatalog = [
      { id: "ITEM_WATER", name: "MSRTC Rail Neer (1L)", price: 15, icon: "fa-bottle-water" },
      { id: "ITEM_KATRAJ_THALI", name: "Katraj Ghat Meal Thali Voucher", price: 120, icon: "fa-utensils" },
      { id: "ITEM_SNACK_BOX", name: "Kolhapuri Bhakarwadi Box (250g)", price: 55, icon: "fa-cookie-bite" }
    ];
  }
}

function renderVendorAddons() {
  const box = document.getElementById('vendor-addons-list');
  if (!box) return;
  box.innerHTML = vendorCatalog.map(it => `
    <label class="flex items-center justify-between p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
      <div class="flex items-center gap-2">
        <input type="checkbox" value="${esc(it.id)}" onchange="toggleVendorItem('${esc(it.id)}')" class="rounded text-msrtc-red" />
        <span><i class="fa-solid ${esc(it.icon || 'fa-box')} text-slate-400 mr-1"></i> ${esc(it.name)}</span>
      </div>
      <span class="font-extrabold text-slate-800">₹${it.price}</span>
    </label>
  `).join('');
}

function toggleVendorItem(itemId) {
  const idx = selectedVendorItems.indexOf(itemId);
  if (idx > -1) {
    selectedVendorItems.splice(idx, 1);
  } else {
    selectedVendorItems.push(itemId);
  }
  updateSummaryTotals();
}

function updateSummaryTotals() {
  if (!activeBus) return;

  const farePerSeat = activeBus.fare || 100;
  let subtotal = 0;

  selectedSeats.forEach((_, i) => {
    const age = parseInt(document.getElementById(`pax-age-${i}`)?.value || 25);
    const gen = document.getElementById(`pax-gender-${i}`)?.value || 'Male';
    const cat = document.getElementById(`pax-category-${i}`)?.value || 'General';

    let seatRate = farePerSeat;
    if (age < 5 || age >= 60 || gen === "Female" || cat.includes("Senior") || cat.includes("Female")) {
      seatRate = Math.round(seatRate * 0.5);
    }
    subtotal += seatRate;
  });

  // Vendor items sum
  let vendorTotal = 0;
  selectedVendorItems.forEach(id => {
    const it = vendorCatalog.find(x => x.id === id);
    if (it) vendorTotal += it.price;
  });

  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst + vendorTotal;

  document.getElementById('summary-base-fare').innerText = `₹${subtotal}`;
  document.getElementById('summary-gst').innerText = `₹${gst}`;
  document.getElementById('summary-grand-total').innerText = `₹${grandTotal}`;

  const vRow = document.getElementById('summary-vendor-row');
  if (vRow) {
    if (vendorTotal > 0) {
      vRow.classList.remove('hidden');
      document.getElementById('summary-vendor-fare').innerText = `+₹${vendorTotal}`;
    } else {
      vRow.classList.add('hidden');
    }
  }

  const hhRow = document.getElementById('summary-hh-row');
  if (hhRow && activeBus.isHappyHours) {
    hhRow.classList.remove('hidden');
    const saved = Math.round((activeBus.originalFare - activeBus.fare) * selectedSeats.length);
    document.getElementById('summary-hh-discount').innerText = `-₹${saved}`;
  }
}

// 7. CONFIRM BOOKING & GENERATE ERS SLIP
async function confirmBooking() {
  if (!selectedSeats.length) {
    alert("Please select at least one seat.");
    return;
  }

  const passengers = [];
  for (let i = 0; i < selectedSeats.length; i++) {
    const name = document.getElementById(`pax-name-${i}`)?.value.trim();
    const age = parseInt(document.getElementById(`pax-age-${i}`)?.value || 28);
    const gender = document.getElementById(`pax-gender-${i}`)?.value || 'Male';
    const category = document.getElementById(`pax-category-${i}`)?.value || 'General';

    if (!name) {
      alert(`Please enter the name for seat ${selectedSeats[i]}`);
      return;
    }
    passengers.push({ name, age, gender, priorityCategory: category });
  }

  const payMode = document.querySelector('input[name="payMethod"]:checked')?.value || 'UPI';

  const btn = document.getElementById('confirm-booking-btn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Reserving Seats...`;

  try {
    const depStand = document.getElementById('modal-boarding-select')?.value || activeBus.from || document.getElementById('from-location')?.value.trim() || activeBus.origin;
    const arrStand = document.getElementById('modal-dropping-select')?.value || activeBus.to || document.getElementById('to-location')?.value.trim() || activeBus.destination;
    const trvDate = activeBus.date || document.getElementById('travel-date')?.value || new Date().toISOString().split('T')[0];

    const payload = {
      scheduleId: activeBus.id,
      from: depStand,
      to: arrStand,
      date: trvDate,
      seats: selectedSeats,
      passengers: passengers,
      paymentMethod: payMode,
      vendorItemIds: selectedVendorItems,
      user: currentUser
    };

    const res = await MSRTCApi.bookTicket(payload);
    closeSeatModal();

    // Store in local storage
    const all = getStoredBookings();
    all.unshift(res);
    saveStoredBookings(all);

    openTicketModal(res);
  } catch (err) {
    alert(`Booking Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> Confirm & Book Reservation`;
  }
}

function openTicketModal(b) {
  const modal = document.getElementById('ticket-modal');
  const content = document.getElementById('ticket-modal-content');

  const fare = b.fare || {};
  const isHH = b.isHappyHours;
  const vOrder = b.vendorOrder || {};

  content.innerHTML = `
    <div class="border-b-2 border-msrtc-red pb-4 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-black text-msrtc-red tracking-tight">MSRTC ELECTRONIC RESERVATION SLIP</h2>
          <p class="text-[10px] text-slate-500 font-bold uppercase">MSRTC Passenger Transport Service</p>
        </div>
        <div class="text-right">
          <span class="text-xs font-mono font-extrabold bg-slate-900 text-white px-2.5 py-1 rounded">PNR: ${esc(b.pnr)}</span>
          <span class="block text-[10px] text-slate-500 mt-0.5">Booking ID: ${esc(b.bookingId)}</span>
        </div>
      </div>
    </div>

    <!-- Bus & Route Summary -->
    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <span class="text-slate-400 block text-[10px] uppercase font-bold">Bus Type & No.</span>
        <span class="font-extrabold text-slate-900">${esc(b.busDetails?.busType)}</span>
        <span class="block text-[10px] text-slate-500 font-mono">${esc(b.busDetails?.busNumber)}</span>
      </div>
      <div>
        <span class="text-slate-400 block text-[10px] uppercase font-bold">Boarding Point</span>
        <span class="font-extrabold text-slate-900">${esc(b.route?.from)}</span>
        <span class="block text-[10px] text-slate-500">${esc(b.route?.departureTime?.split('T')[1]?.substring(0, 5) || '')} Hrs</span>
      </div>
      <div>
        <span class="text-slate-400 block text-[10px] uppercase font-bold">Destination</span>
        <span class="font-extrabold text-slate-900">${esc(b.route?.to)}</span>
      </div>
      <div>
        <span class="text-slate-400 block text-[10px] uppercase font-bold">Reserved Seats</span>
        <span class="font-black text-base text-msrtc-red font-mono">${esc((b.seats || []).join(', '))}</span>
      </div>
    </div>

    <!-- Passenger Manifest -->
    <div class="mb-4">
      <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Passenger Manifest</h4>
      <table class="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
        <thead class="bg-slate-100 text-[10px] text-slate-600 uppercase font-semibold">
          <tr>
            <th class="p-2">Seat</th>
            <th class="p-2">Passenger Name</th>
            <th class="p-2">Age/Gender</th>
            <th class="p-2 text-right">Fare</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${(b.passengers || []).map(p => `
            <tr>
              <td class="p-2 font-mono font-bold text-msrtc-red">${esc(p.seat || '')}</td>
              <td class="p-2 font-semibold text-slate-800">${esc(p.name)}</td>
              <td class="p-2 text-slate-500">${p.age} Yrs / ${esc(p.gender)}</td>
              <td class="p-2 text-right font-extrabold text-slate-900">₹${p.fare}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Vendor Refreshments Voucher Section (Module 6) -->
    ${vOrder.items && vOrder.items.length ? `
      <div class="bg-orange-50 border border-orange-200 p-3 rounded-xl mb-4 text-xs">
        <div class="flex items-center justify-between font-bold text-orange-950 mb-1.5">
          <span><i class="fa-solid fa-utensils mr-1"></i> Highway Rest-Stop & Refreshment Voucher</span>
          <span class="font-mono text-[11px] bg-orange-200 px-2 py-0.5 rounded">${esc(vOrder.voucher_code || 'MSRTC-MEAL')}</span>
        </div>
        <p class="text-[11px] text-orange-800 mb-2">Show this coupon at Katraj Ghat Highway Food Plaza counter or to the bus conductor:</p>
        <div class="flex flex-wrap gap-2">
          ${vOrder.items.map(it => `
            <span class="bg-white border border-orange-300 text-orange-900 px-2 py-1 rounded text-[10px] font-bold">
              ✓ ${esc(it.name)} (₹${it.price})
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Financial Breakdown -->
    <div class="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-1.5">
      <div class="flex justify-between text-slate-400">
        <span>Base Ticket Subtotal:</span>
        <span class="font-semibold text-white">₹${fare.baseFare || 0}</span>
      </div>
      ${isHH ? `
        <div class="flex justify-between text-amber-300">
          <span>⚡ Happy Hours Promotional Saving:</span>
          <span>Applied (${b.happyHoursDiscount}% off)</span>
        </div>
      ` : ''}
      ${vOrder.total_amount ? `
        <div class="flex justify-between text-orange-300">
          <span>Refreshment & Meal Vouchers:</span>
          <span>+₹${vOrder.total_amount}</span>
        </div>
      ` : ''}
      <div class="flex justify-between text-slate-400">
        <span>GST (5%):</span>
        <span class="font-semibold text-white">₹${fare.gst || 0}</span>
      </div>
      <div class="border-t border-slate-700 pt-2 flex justify-between text-base font-black text-amber-400">
        <span>Total Paid (${esc(fare.paymentMethod || 'UPI')}):</span>
        <span>₹${fare.totalAmount || 0}</span>
      </div>
    </div>

    <!-- Safety SOS Button in Ticket -->
    <div class="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
      <span class="text-[10px] text-slate-400 font-mono">Scan QR for validation</span>
      <button onclick="triggerSOS('${esc(b.bookingId)}', '${esc(b.busDetails?.busNumber)}')" class="bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5">
        <i class="fa-solid fa-triangle-exclamation"></i> Emergency SOS
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').classList.add('hidden');
}

// 8. IN-BUS ADVERTISING & DEALS (Module 4)
async function loadAdsPage() {
  const grid = document.getElementById('active-ads-grid');
  grid.innerHTML = `<div class="col-span-3 text-center text-slate-400 py-8"><i class="fa-solid fa-spinner fa-spin text-xl"></i> Loading live ad campaigns from dataset...</div>`;

  updateAdBookingQuote();
  loadAdBookingsHistory();

  try {
    const ads = await MSRTCApi.getAdList();
    renderAdsGrid(ads);
  } catch (e) {
    grid.innerHTML = `<p class="col-span-3 text-rose-600 text-xs">Failed to load advertisement data.</p>`;
  }
}

const AD_POS_BASE_RATES = {
  "Front": 180,
  "First 10 Seats Area": 150,
  "Middle": 100,
  "Rear": 70
};
const AD_TYPE_FACTORS = { "Banner": 1.0, "QR": 1.15, "Digital": 1.35 };

function updateAdBookingQuote() {
  const pos = document.getElementById('ad-book-pos')?.value || 'Front';
  const ctype = document.getElementById('ad-book-type')?.value || 'Banner';
  const buses = Math.max(1, parseInt(document.getElementById('ad-book-buses')?.value || 1));
  const days = Math.max(1, parseInt(document.getElementById('ad-book-days')?.value || 1));
  const ratePerBusDay = (AD_POS_BASE_RATES[pos] || 100) * (AD_TYPE_FACTORS[ctype] || 1.0);
  const total = Math.round(ratePerBusDay * buses * days);

  const box = document.getElementById('ad-book-quote-summary');
  if (box) {
    box.innerHTML = `
      <span class="text-slate-600 font-semibold">${buses} Bus${buses > 1 ? 'es' : ''} × ${days} Days @ ₹${Math.round(ratePerBusDay)}/bus/day:</span>
      <span class="text-base font-extrabold text-[#9B1C1C] font-mono">₹${total.toLocaleString()}</span>
    `;
  }
}

async function handleAdBookingSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('ad-book-submit-btn');
  const resBox = document.getElementById('ad-booking-result');
  const payload = {
    brandName: document.getElementById('ad-book-brand').value.trim(),
    contactName: document.getElementById('ad-book-contact').value.trim(),
    contactPhone: document.getElementById('ad-book-phone').value.trim(),
    boardingPoint: document.getElementById('ad-book-boarding').value.trim(),
    droppingPoint: document.getElementById('ad-book-dropping').value.trim(),
    numBuses: parseInt(document.getElementById('ad-book-buses').value || 1),
    durationDays: parseInt(document.getElementById('ad-book-days').value || 30),
    campaignType: document.getElementById('ad-book-type').value,
    position: document.getElementById('ad-book-pos').value
  };

  if (btn) btn.disabled = true;
  try {
    const res = await MSRTCApi.bookAdCampaign(payload);
    if (resBox) {
      resBox.className = "mt-4 p-3 rounded border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs";
      resBox.innerHTML = `
        <strong>Booking Confirmed (${esc(res.id)})</strong><br/>
        ${esc(res.brand_name)} • ${res.num_buses} Buses (${esc(res.boarding_point)} → ${esc(res.dropping_point)})<br/>
        Total Paid: <strong>₹${Number(res.total_fee).toLocaleString()}</strong> (Saved in Database)
      `;
      resBox.classList.remove('hidden');
    }
    document.getElementById('ad-book-brand').value = '';
    updateAdBookingQuote();
    await loadAdBookingsHistory();
  } catch (err) {
    if (resBox) {
      resBox.className = "mt-4 p-3 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs";
      resBox.innerText = err.message || "Failed to book advertisement.";
      resBox.classList.remove('hidden');
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadAdBookingsHistory() {
  const box = document.getElementById('ad-bookings-history-box');
  if (!box) return;
  try {
    const rows = await MSRTCApi.getAdBookings();
    if (!rows || !rows.length) {
      box.innerHTML = `<div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded border border-slate-200">No advertisement bookings recorded yet. Use the form on the left to book buses.</div>`;
      return;
    }
    box.innerHTML = rows.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      return `
        <div class="p-3.5 rounded border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono font-bold text-[#1e3a5f] bg-white px-2 py-0.5 rounded border border-slate-200">${esc(b.id)}</span>
              <span class="font-bold text-slate-900 text-sm">${esc(b.brand_name)}</span>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isCancelled ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}">${esc(b.status)}</span>
            </div>
            <div class="text-slate-700 font-medium">
              <i class="fa-solid fa-route text-[#9B1C1C] mr-1"></i> ${esc(b.boarding_point)} → ${esc(b.dropping_point)}
            </div>
            <div class="text-[11px] text-slate-500 flex flex-wrap gap-3">
              <span><strong>${b.num_buses}</strong> Buses</span>
              <span>• ${esc(b.position)} (${esc(b.campaign_type)})</span>
              <span>• ${b.duration_days} Days</span>
              <span>• ${esc((b.created_at || '').slice(0, 10))}</span>
            </div>
          </div>
          <div class="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
            <span class="text-sm font-extrabold text-[#9B1C1C] font-mono">₹${Number(b.total_fee).toLocaleString()}</span>
            ${!isCancelled ? `<button onclick="cancelAdBookingItem('${esc(b.id)}')" class="text-[11px] text-rose-700 hover:underline font-semibold">Cancel</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    box.innerHTML = `<p class="text-xs text-rose-600">Failed to load advertisement booking history.</p>`;
  }
}

async function cancelAdBookingItem(bookingId) {
  if (!confirm(`Cancel advertisement booking ${bookingId}?`)) return;
  try {
    await MSRTCApi.cancelAdBooking(bookingId);
    await loadAdBookingsHistory();
  } catch (e) {
    alert(e.message || "Failed to cancel ad booking.");
  }
}

function renderAdsGrid(ads) {
  const grid = document.getElementById('active-ads-grid');
  if (!ads.length) {
    grid.innerHTML = `<p class="text-xs text-slate-500">No active ads.</p>`;
    return;
  }

  grid.innerHTML = ads.map(a => `
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded">${esc(a.advertisement_id)}</span>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${esc(a.position)} Section</span>
      </div>

      <h4 class="font-extrabold text-slate-900 text-sm">${esc(a.brand_name)}</h4>
      <p class="text-[11px] text-purple-700 font-bold mt-0.5">${esc(a.category)} • Special Offer: ${esc(a.offer)}</p>

      <div class="my-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
        <div class="flex justify-between">
          <span>Route & Bus:</span>
          <span class="font-mono text-slate-800 font-semibold">${esc(a.route_id)} / ${esc(a.bus_id)}</span>
        </div>
        <div class="flex justify-between">
          <span>Campaign Type:</span>
          <span class="font-semibold text-slate-800">${esc(a.campaign_type)}</span>
        </div>
        <div class="flex justify-between">
          <span>Duration:</span>
          <span class="font-semibold text-slate-800">${a.duration_days} Days</span>
        </div>
        <div class="flex justify-between">
          <span>Verified QR Scans:</span>
          <span class="font-extrabold text-slate-900 font-mono">${a.qr_scans.toLocaleString()}</span>
        </div>
      </div>

      <button onclick="scanAdQR('${esc(a.advertisement_id)}')" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm">
        <i class="fa-solid fa-qrcode"></i> Simulate Passenger QR Scan
      </button>
    </div>
  `).join('');
}

async function scanAdQR(adId) {
  try {
    const res = await MSRTCApi.scanAdQR(adId);
    activeLiveScans += 1;
    document.getElementById('ad-live-scans-val').innerText = activeLiveScans.toLocaleString();

    document.getElementById('coupon-brand-name').innerText = res.brand;
    document.getElementById('coupon-code-text').innerText = res.coupon_code;
    document.getElementById('coupon-deal-text').innerText = res.deal;
    document.getElementById('coupon-message').innerText = res.message;

    document.getElementById('qr-coupon-modal').classList.remove('hidden');
  } catch (e) {
    alert("Scan simulation failed.");
  }
}

function closeCouponModal() {
  document.getElementById('qr-coupon-modal').classList.add('hidden');
}

function showAdPredictorModal() {
  document.getElementById('ad-predict-modal').classList.remove('hidden');
}

function closeAdPredictorModal() {
  document.getElementById('ad-predict-modal').classList.add('hidden');
}

async function calculateAdPrediction() {
  const pos = document.getElementById('ad-pred-pos').value;
  const ctype = document.getElementById('ad-pred-type').value;
  const days = parseInt(document.getElementById('ad-pred-days').value || 30);

  const out = document.getElementById('ad-prediction-output');
  out.classList.remove('hidden');
  out.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Running ML Predictor...`;

  try {
    const res = await MSRTCApi.predictAdRevenue(pos, ctype, days);
    out.innerHTML = `
      <div class="flex justify-between font-bold text-slate-900 border-b border-purple-200 pb-1.5 mb-1.5">
        <span>Position Tier:</span>
        <span>${esc(res.tier)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600">Calculated Ad Fee:</span>
        <span class="font-extrabold text-slate-900">₹${res.advertisement_fee.toLocaleString()}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600">Expected QR Scans:</span>
        <span class="font-mono font-bold text-purple-800">${res.estimated_qr_scans.toLocaleString()}</span>
      </div>
      <div class="flex justify-between font-black text-purple-950 text-sm pt-1">
        <span>Predicted Ad Revenue:</span>
        <span class="text-msrtc-red">₹${res.predicted_revenue.toLocaleString()}</span>
      </div>
      <p class="text-[10px] text-purple-700 pt-1 italic">Generated by Random Forest / Linear Regression model trained on 1,000 MSRTC advertisement records.</p>
    `;
  } catch (e) {
    out.innerHTML = `<span class="text-rose-600">Prediction error: ${esc(e.message)}</span>`;
  }
}

// 9. HIGHWAY VENDORS & REST-STOPS (Module 6)
async function loadVendorsPage() {
  const stopsBox = document.getElementById('rest-stops-list');
  const menuBox = document.getElementById('vendor-menu-grid');

  try {
    const res = await MSRTCApi.getVendorCatalog();
    const stops = res.highway_rest_stops || [];
    const items = res.items || [];

    stopsBox.innerHTML = stops.map(s => `
      <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-extrabold text-slate-900 text-sm">${esc(s.name)}</h4>
          <span class="text-xs font-bold text-amber-500"><i class="fa-solid fa-star"></i> ${s.rating}</span>
        </div>
        <p class="text-xs text-slate-500 font-mono mb-2">${esc(s.location)}</p>
        <div class="flex flex-wrap gap-1.5 mb-3">
          ${(s.amenities || []).map(a => `<span class="bg-white border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium">${esc(a)}</span>`).join('')}
        </div>
        <div class="flex justify-between items-center text-[11px] pt-2 border-t border-slate-200 text-slate-500">
          <span>License: ₹${s.monthly_contract_fee.toLocaleString()} / mo</span>
          <span class="text-emerald-700 font-bold">${Math.round(s.commission_rate * 100)}% Revenue Share</span>
        </div>
      </div>
    `).join('');

    menuBox.innerHTML = items.map(it => `
      <div class="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg">
            <i class="fa-solid ${esc(it.icon || 'fa-box')}"></i>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-xs">${esc(it.name)}</h4>
            <p class="text-[10px] text-slate-500">${esc(it.description)}</p>
            <span class="text-[10px] text-orange-700 font-semibold font-mono">Supplier: ${esc(it.vendor)}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="block text-base font-black text-slate-900">₹${it.price}</span>
          <span class="text-[10px] text-emerald-700 font-semibold">Comm: ₹${it.commission}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    stopsBox.innerHTML = `<p class="text-xs text-rose-600">Failed to load rest-stops.</p>`;
  }
}

// 10. UNIFIED REVENUE & ML DASHBOARD
async function loadUnifiedDashboard() {
  const kpiBox = document.getElementById('revenue-kpis-container');
  kpiBox.innerHTML = `<div class="col-span-4 text-center text-slate-400 py-6"><i class="fa-solid fa-spinner fa-spin text-xl"></i> Calculating Unified Total Revenue...</div>`;

  try {
    const rev = await MSRTCApi.getUnifiedRevenue();
    const mlModels = await MSRTCApi.getMLModels();
    const adAnalytics = await MSRTCApi.getAdAnalytics();

    renderRevenueKPIs(rev);
    renderMLModelsTable(mlModels);
    renderHappyHoursSimulatorInit();
    renderAdAnalyticsBreakdown(adAnalytics);
    renderRevenueTables(rev);
  } catch (e) {
    kpiBox.innerHTML = `<div class="col-span-4 bg-rose-50 text-rose-800 p-4 rounded-xl text-xs">Failed to calculate revenue: ${esc(e.message)}</div>`;
  }
}

function renderRevenueKPIs(r) {
  const box = document.getElementById('revenue-kpis-container');
  const b = r.breakdown || {};
  const t = r.ticket_kpis || {};

  box.innerHTML = `
    <!-- Total Unified Revenue -->
    <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-md">
      <p class="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Total Unified Revenue (R_total)</p>
      <p class="text-2xl font-black mt-1">${inrPrecise(r.unified_total_revenue)}</p>
      <p class="text-[11px] text-slate-400 mt-1">Ticket + Ads + Vendors + Rest-Stops</p>
    </div>

    <!-- Ticket Revenue -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Ticket Revenue (R_ticket)</p>
      <p class="text-2xl font-extrabold text-slate-900 mt-1">${inr(b.ticket_revenue)}</p>
      <p class="text-[11px] text-emerald-700 mt-1 font-semibold">+${t.uplift_pct || 0}% gain over plain fare</p>
    </div>

    <!-- Advertisement Revenue (Dataset) -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p class="text-[10px] uppercase tracking-wider font-bold text-purple-700">Ad Revenue (1,000 Records)</p>
      <p class="text-2xl font-extrabold text-purple-950 mt-1">${inrPrecise(b.advertisement_revenue)}</p>
      <p class="text-[11px] text-purple-600 mt-1 font-semibold">${r.ad_summary?.total_qr_scans?.toLocaleString() || 0} QR scans</p>
    </div>

    <!-- Commercial Tie-ups (Vendors + Rest-Stops) -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p class="text-[10px] uppercase tracking-wider font-bold text-orange-700">Vendors & Rest-Stops</p>
      <p class="text-2xl font-extrabold text-orange-950 mt-1">${inr(b.vendor_commission + b.partnership_contract_fees)}</p>
      <p class="text-[11px] text-slate-500 mt-1">Katraj Ghat & Food Commissions</p>
    </div>
  `;
}

function renderMLModelsTable(res) {
  const tbody = document.getElementById('ml-models-table-body');
  const badge = document.getElementById('best-model-badge');
  badge.innerHTML = `<i class="fa-solid fa-crown text-amber-500 mr-1"></i> Best Model: ${esc(res.best_model)}`;

  const models = res.models || {};
  tbody.innerHTML = Object.entries(models).map(([name, m]) => {
    const isBest = name === res.best_model;
    return `
      <tr class="border-t border-slate-100 ${isBest ? 'bg-emerald-50/60 font-semibold' : ''}">
        <td class="py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
          ${isBest ? '<i class="fa-solid fa-check-circle text-emerald-600"></i>' : ''} ${esc(name)}
        </td>
        <td class="py-2.5 text-right font-mono">${m.mae}</td>
        <td class="py-2.5 text-right font-mono">${m.rmse}</td>
        <td class="py-2.5 text-right font-mono font-bold ${isBest ? 'text-emerald-700' : 'text-slate-800'}">${m.r2}</td>
        <td class="py-2.5 text-right font-bold">${m.accuracy_pct}%</td>
        <td class="py-2.5 text-center">
          <span class="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${isBest ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
            ${isBest ? 'Deployed' : 'Benchmarked'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderHappyHoursSimulatorInit() {
  updateHappyHoursSimulator();
}

async function updateHappyHoursSimulator() {
  const fare = parseInt(document.getElementById('sim-fare-slider')?.value || 350);
  const demand = parseInt(document.getElementById('sim-demand-slider')?.value || 9);

  document.getElementById('sim-fare-val').innerText = `₹${fare}`;
  document.getElementById('sim-demand-val').innerText = `${demand} Seats (${Math.round(demand / 28 * 100)}%)`;

  try {
    const res = await MSRTCApi.simulateHappyHours(fare, demand);
    const card = document.getElementById('sim-optimizer-result-card');
    card.innerHTML = `
      <div class="flex items-center justify-between font-bold text-amber-950 mb-1">
        <span>Recommended Optimal Fare:</span>
        <span class="text-base text-msrtc-red font-black">₹${res.optimal_fare} (${res.optimal_discount_pct}% Off)</span>
      </div>
      <div class="flex justify-between text-[11px] text-amber-900">
        <span>Expected Bookings:</span>
        <span class="font-bold">${res.expected_bookings} Seats (${res.expected_occupancy_pct}%)</span>
      </div>
      <div class="flex justify-between text-[11px] text-amber-900">
        <span>Expected Revenue:</span>
        <span class="font-extrabold text-emerald-800">₹${res.expected_revenue} (vs ₹${res.base_revenue_without_promo})</span>
      </div>
      <div class="text-[10px] text-emerald-700 font-bold mt-1">
        +₹${res.revenue_gain} net revenue gain achieved via off-peak elasticity!
      </div>
    `;

    const tbody = document.getElementById('sim-scenarios-body');
    tbody.innerHTML = (res.scenarios || []).map(sc => {
      const isOptimal = sc.discount_pct === res.optimal_discount_pct;
      return `
        <tr class="border-t border-slate-100 ${isOptimal ? 'bg-amber-100/60 font-bold' : ''}">
          <td class="py-2 text-slate-800">${sc.discount_pct}%</td>
          <td class="py-2 text-right font-mono">₹${sc.promotional_fare}</td>
          <td class="py-2 text-right font-mono">${sc.expected_bookings}</td>
          <td class="py-2 text-right font-mono">${sc.occupancy_pct}%</td>
          <td class="py-2 text-right font-mono font-bold text-slate-900">₹${sc.expected_revenue}</td>
          <td class="py-2 text-center">
            ${isOptimal ? `
              <span class="text-[9px] uppercase font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Optimal</span>
            ` : (sc.is_feasible ? `
              <span class="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Feasible</span>
            ` : `
              <span class="text-[9px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Infeasible</span>
            `)}
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {}
}

function renderAdAnalyticsBreakdown(a) {
  document.getElementById('ad-dataset-total-rev-badge').innerText = `Dataset Revenue: ${inrPrecise(a.total_revenue)}`;

  const posBox = document.getElementById('ad-pos-breakdown-list');
  posBox.innerHTML = (a.position_breakdown || []).map(p => `
    <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
      <div>
        <span class="font-bold text-slate-800">${esc(p.position)}</span>
        <span class="block text-[10px] text-slate-500">${p.campaign_count} ads • ${p.tier}</span>
      </div>
      <div class="text-right">
        <span class="font-extrabold text-slate-900">${inr(p.total_revenue)}</span>
        <span class="block text-[10px] text-slate-400 font-mono">${p.total_scans.toLocaleString()} scans</span>
      </div>
    </div>
  `).join('');

  const typeBox = document.getElementById('ad-type-breakdown-list');
  typeBox.innerHTML = (a.campaign_type_breakdown || []).map(t => `
    <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
      <span class="font-bold text-slate-800">${esc(t.campaign_type)}</span>
      <span class="font-extrabold text-slate-900">${inr(t.total_revenue)}</span>
    </div>
  `).join('');

  const routesBox = document.getElementById('ad-routes-breakdown-list');
  routesBox.innerHTML = (a.top_routes || []).map(r => `
    <div class="flex justify-between items-center py-1 border-b border-slate-200/60">
      <span class="font-mono font-bold text-slate-800">${esc(r.route_id)}</span>
      <span class="font-extrabold text-slate-900">${inr(r.revenue)}</span>
    </div>
  `).join('');
}

function renderRevenueTables(r) {
  const box = document.getElementById('revenue-tables-grid');
  const t = r.ticket_kpis || {};

  box.innerHTML = `
    <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
      <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Revenue by Fleet Type</h4>
      <div class="space-y-2 text-xs">
        ${(t.byBusType || []).map(x => `
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="font-semibold text-slate-800">${esc(x.name)}</span>
            <span class="font-extrabold text-slate-900">${inr(x.revenue)} (${x.seats} seats)</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
      <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Top Passenger Corridors</h4>
      <div class="space-y-2 text-xs">
        ${(t.topRoutes || []).map(x => `
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="font-semibold text-slate-800">${esc(x.name)}</span>
            <span class="font-extrabold text-slate-900">${inr(x.revenue)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 11. GROUP BOOKING CALCULATOR MODAL (Module 5)
function toggleGroupBookingModal() {
  const m = document.getElementById('group-modal');
  m.classList.toggle('hidden');
  if (!m.classList.contains('hidden')) {
    calcGroupQuoteLive();
  }
}

async function calcGroupQuoteLive() {
  const pax = parseInt(document.getElementById('grp-pax')?.value || 12);
  const days = parseInt(document.getElementById('grp-days')?.value || 1);
  const fare = parseInt(document.getElementById('grp-fare')?.value || 350);

  const out = document.getElementById('grp-quote-output');
  try {
    const q = await MSRTCApi.getGroupQuote(pax, fare, days);
    out.innerHTML = `
      <div class="flex justify-between font-bold text-slate-900 border-b border-emerald-200 pb-1">
        <span>Eligible Group Tier:</span>
        <span class="text-emerald-800">${esc(q.tier_name)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600">Total Group Discount:</span>
        <span class="font-black text-msrtc-red">${q.total_discount_pct}% OFF</span>
      </div>
      <div class="flex justify-between">
        <span class="text-slate-600">Gross Amount:</span>
        <span class="text-slate-500 line-through">₹${q.gross_fare.toLocaleString()}</span>
      </div>
      <div class="flex justify-between text-base font-black text-emerald-900 pt-1">
        <span>Net Total (inc. GST):</span>
        <span>₹${q.final_total.toLocaleString()}</span>
      </div>
      <div class="text-[11px] text-emerald-700 font-bold mt-1">
        ✓ ${esc(q.savings_message)}
      </div>
    `;
  } catch (e) {}
}

// 12. PASSENGER SAFETY SOS TRIGGER (Module 7)
async function triggerSOS(bookingId, busNumber) {
  try {
    const res = await MSRTCApi.triggerEmergencySOS(bookingId, busNumber);
    const box = document.getElementById('sos-details-box');
    box.innerHTML = `
      <div><strong>Alert ID:</strong> ${esc(res.sos_id)}</div>
      <div><strong>Bus Unit:</strong> ${esc(res.bus_number)}</div>
      <div><strong>GPS Location:</strong> ${esc(res.gps_location)}</div>
      <div class="mt-2 text-rose-800 font-bold">Action Taken: ${esc(res.action_taken)}</div>
    `;
    document.getElementById('sos-modal').classList.remove('hidden');
  } catch (e) {
    alert("SOS Dispatch simulation triggered locally.");
  }
}

function closeSOSModal() {
  document.getElementById('sos-modal').classList.add('hidden');
}

// 13. BOOKINGS LIST
function filterTrips(f) {
  currentFilter = f;
  document.querySelectorAll('.trip-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === f) {
      btn.className = "trip-filter-btn px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold";
    } else {
      btn.className = "trip-filter-btn px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold";
    }
  });
  renderBookingsList();
}

function renderBookingsList() {
  const box = document.getElementById('bookings-list-container');
  const all = getStoredBookings();
  const filtered = currentFilter === 'ALL' ? all : all.filter(b => b.tripStatus === currentFilter);

  if (!filtered.length) {
    box.innerHTML = `<div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
      No trips found under "${currentFilter}". Book a bus to view reservation slips.
    </div>`;
    return;
  }

  box.innerHTML = filtered.map(b => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-slate-900 text-sm">${esc(b.route?.from?.split(' (')[0])} → ${esc(b.route?.to?.split(' (')[0])}</span>
          <span class="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${esc(b.pnr)}</span>
          ${b.isHappyHours ? `<span class="text-[9px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-extrabold uppercase">⚡ Happy Hours</span>` : ''}
        </div>
        <p class="text-xs text-slate-500 mt-1">${esc(b.busDetails?.busType)} • Seats: ${(b.seats || []).join(', ')}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-base font-black text-slate-900 mr-2">₹${b.fare?.totalAmount || 0}</span>
        <button onclick='openTicketModal(${JSON.stringify(b).replace(/'/g, "&#39;")})' class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
          View ERS Slip
        </button>
      </div>
    </div>
  `).join('');
}

// 14. PROFILE & SMART ID (AUTHENTICATION GATED)
function loadProfileForm() {
  const unauthCard = document.getElementById('profile-unauth-card');
  const authCard = document.getElementById('profile-auth-card');
  const msgBox = document.getElementById('profile-msg');
  if (msgBox) msgBox.classList.add('hidden');

  if (!isAuthenticated()) {
    unauthCard?.classList.remove('hidden');
    authCard?.classList.add('hidden');
    return;
  }

  unauthCard?.classList.add('hidden');
  authCard?.classList.remove('hidden');

  const nameInput = document.getElementById('prof-name');
  const emailInput = document.getElementById('prof-email');
  const phoneInput = document.getElementById('prof-phone');
  const genderInput = document.getElementById('prof-gender');
  const ageInput = document.getElementById('prof-age');
  const catInput = document.getElementById('prof-category');
  const smartIdBadge = document.getElementById('prof-smart-id-badge');
  const catBadge = document.getElementById('prof-category-badge');

  if (nameInput) nameInput.value = currentUser.fullName || currentUser.name || '';
  if (emailInput) emailInput.value = currentUser.email || '';
  if (phoneInput) phoneInput.value = currentUser.phone || '';
  if (genderInput) genderInput.value = currentUser.gender || 'Male';
  if (ageInput) ageInput.value = currentUser.age || 28;
  if (catInput) catInput.value = currentUser.category || 'General';
  if (smartIdBadge) smartIdBadge.textContent = currentUser.smartId || 'MH-MSRTC-PENDING';
  if (catBadge) catBadge.textContent = currentUser.category || 'General';
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const msgBox = document.getElementById('profile-msg');
  const btn = document.getElementById('prof-submit-btn');

  if (!isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const fullName = document.getElementById('prof-name').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const gender = document.getElementById('prof-gender').value;
  const age = parseInt(document.getElementById('prof-age').value || 28);
  const category = document.getElementById('prof-category').value;

  if (btn) btn.disabled = true;
  try {
    const res = await MSRTCApi.updateProfile(authToken, {
      fullName, phone, gender, age, category
    });
    if (res && res.user) {
      currentUser = res.user;
      saveStoredUser(currentUser);
      renderAuthCorner();
      loadProfileForm();
      if (msgBox) {
        msgBox.textContent = res.message || "Profile updated successfully!";
        msgBox.className = "mb-4 p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 block";
      }
    }
  } catch (err) {
    if (msgBox) {
      msgBox.textContent = err.message || "Failed to update profile.";
      msgBox.className = "mb-4 p-3 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200 block";
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderSmartIDPass() {
  const box = document.getElementById('smartid-card-container');
  if (!box) return;

  if (!isAuthenticated()) {
    box.innerHTML = `
      <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
        <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-4 border border-amber-200">
          <i class="fa-solid fa-id-card"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-900 mb-1">Smart ID Pass Not Loaded</h3>
        <p class="text-xs text-slate-500 mb-5">Please register or log in to view your verified conductor QR digital pass and concessional fare quota.</p>
        <button onclick="openAuthModal('login')" class="bg-msrtc-red hover:bg-msrtc-darkred text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md transition inline-flex items-center gap-2">
          <i class="fa-solid fa-right-to-bracket"></i> Sign In to View Smart ID
        </button>
      </div>
    `;
    return;
  }

  const isFemale = currentUser.gender === 'Female';
  const isSenior = (Number(currentUser.age) || 0) >= 60;
  let quotaTag = "Verified Citizen Pass";
  if (isFemale) quotaTag = "⚡ 50% Mahila Samman Concession";
  else if (isSenior) quotaTag = "👴 Senior Citizen Free/50% Pass";
  else if (currentUser.category && currentUser.category !== 'General') quotaTag = currentUser.category;

  box.innerHTML = `
    <div class="bg-gradient-to-br from-msrtc-red to-msrtc-darkred text-white p-6 rounded-3xl shadow-xl border-4 border-amber-300 relative overflow-hidden">
      <div class="flex justify-between items-center pb-3 border-b border-red-300/40">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-300">MSRTC</span>
          <h3 class="text-base font-extrabold tracking-tight">MSRTC Digital Smart Transit Pass</h3>
        </div>
        <i class="fa-solid fa-id-card text-2xl text-amber-300"></i>
      </div>

      <div class="my-4 flex items-center justify-between">
        <div>
          <span class="text-[10px] text-red-200 uppercase font-semibold">Pass Holder</span>
          <p class="text-lg font-black">${esc(currentUser.fullName || currentUser.name)}</p>
          <p class="text-xs text-red-100 font-mono font-bold tracking-wider">${esc(currentUser.smartId)}</p>
          <span class="inline-block mt-2 text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded shadow-sm">
            ${esc(quotaTag)}
          </span>
        </div>
        <div class="bg-white p-2.5 rounded-2xl text-slate-900 text-center shadow-lg">
          <i class="fa-solid fa-qrcode text-4xl"></i>
          <span class="block text-[8px] font-mono font-bold mt-1 tracking-tight">VERIFIED PASS</span>
        </div>
      </div>

      <div class="pt-3 border-t border-red-300/30 flex justify-between text-[11px] text-red-100">
        <div>Gender: <span class="font-bold text-white">${esc(currentUser.gender)}</span></div>
        <div>Age: <span class="font-bold text-white">${esc(currentUser.age)}</span></div>
        <div>Status: <span class="font-bold text-amber-300">ACTIVE</span></div>
      </div>
    </div>
  `;
}

// =========================================================
// 15. AUTHENTICATION CONTROLLER (REGISTER, LOGIN, LOGOUT)
// =========================================================
function openAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  switchAuthTab(tab);
  hideAuthMsg();
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function switchAuthTab(tab) {
  const loginPane = document.getElementById('auth-pane-login');
  const regPane = document.getElementById('auth-pane-register');
  const loginBtn = document.getElementById('auth-tab-btn-login');
  const regBtn = document.getElementById('auth-tab-btn-register');
  const title = document.getElementById('auth-modal-title');
  hideAuthMsg();

  if (tab === 'register') {
    loginPane?.classList.add('hidden');
    regPane?.classList.remove('hidden');
    regBtn?.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
    regBtn?.classList.remove('text-slate-500');
    loginBtn?.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
    loginBtn?.classList.add('text-slate-500');
    if (title) title.textContent = "Register New Transit Account";
  } else {
    regPane?.classList.add('hidden');
    loginPane?.classList.remove('hidden');
    loginBtn?.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
    loginBtn?.classList.remove('text-slate-500');
    regBtn?.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
    regBtn?.classList.add('text-slate-500');
    if (title) title.textContent = "Sign In to Transit Account";
  }
}

function showAuthMsg(text, isError = true) {
  const box = document.getElementById('auth-msg');
  if (!box) return;
  box.textContent = text;
  box.className = `mb-4 p-3 rounded-xl text-xs font-semibold ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`;
  box.classList.remove('hidden');
}

function hideAuthMsg() {
  const box = document.getElementById('auth-msg');
  if (box) box.classList.add('hidden');
}

function quickFillDemoAuth() {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = 'pravin.msrtc@transit.gov.in';
  if (passInput) passInput.value = 'Pravin@1234';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');

  if (btn) btn.disabled = true;
  try {
    const res = await MSRTCApi.login({ email, password });
    if (res && res.token && res.user) {
      authToken = res.token;
      currentUser = res.user;
      localStorage.setItem('msrtc_auth_token', authToken);
      saveStoredUser(currentUser);
      showAuthMsg(res.message || "Login successful! Redirecting...", false);
      renderAuthCorner();
      setTimeout(() => {
        closeAuthModal();
        loadProfileForm();
        renderSmartIDPass();
        if (btn) btn.disabled = false;
      }, 500);
    } else {
      showAuthMsg(res.error || "Login failed. Please check credentials.", true);
      if (btn) btn.disabled = false;
    }
  } catch (err) {
    showAuthMsg(err.message || "Failed to log in. Please verify credentials.", true);
    if (btn) btn.disabled = false;
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('auth-reg-email').value.trim();
  const phone = document.getElementById('auth-reg-phone').value.trim();
  const gender = document.getElementById('reg-gender').value;
  const age = parseInt(document.getElementById('reg-age').value);
  const category = document.getElementById('reg-category').value;
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const btn = document.getElementById('reg-submit-btn');

  if (!email) {
    showAuthMsg("Email or username is required.", true);
    return;
  }
  if (email.includes('@')) {
    const emailPattern = /^[^\s@]+@[^\s@]+(?:\.[^\s@]+)?$/;
    if (!emailPattern.test(email)) {
      showAuthMsg("Please enter a valid email address, such as sarkarpavn997@gmail.com.", true);
      document.getElementById('auth-reg-email').focus();
      return;
    }
  } else if (email.replace(/[\s\-]/g, '').length < 3) {
    showAuthMsg("Username must be at least 3 characters.", true);
    document.getElementById('auth-reg-email').focus();
    return;
  }

  if (password !== confirm) {
    showAuthMsg("Passwords do not match. Please re-enter.", true);
    return;
  }
  if (password.length < 6) {
    showAuthMsg("Password must be at least 6 characters.", true);
    return;
  }

  if (btn) btn.disabled = true;
  try {
    const res = await MSRTCApi.register({
      fullName, email, phone, gender, age, category, password
    });
    if (res && res.token && res.user) {
      authToken = res.token;
      currentUser = res.user;
      localStorage.setItem('msrtc_auth_token', authToken);
      saveStoredUser(currentUser);
      showAuthMsg(res.message || "Account registered successfully!", false);
      renderAuthCorner();
      setTimeout(() => {
        closeAuthModal();
        loadProfileForm();
        renderSmartIDPass();
        if (btn) btn.disabled = false;
      }, 600);
    } else {
      showAuthMsg(res.error || "Registration failed.", true);
      if (btn) btn.disabled = false;
    }
  } catch (err) {
    showAuthMsg(err.message || "Registration failed.", true);
    if (btn) btn.disabled = false;
  }
}

async function handleLogout() {
  if (authToken) {
    try {
      await MSRTCApi.logout(authToken);
    } catch(e) {}
  }
  authToken = null;
  currentUser = DEFAULT_USER;
  localStorage.removeItem('msrtc_auth_token');
  localStorage.removeItem('msrtc_active_user');
  renderAuthCorner();
  loadProfileForm();
  renderSmartIDPass();
}

// =========================================================
// 14. REST-STOP TENDER BIDDING & RESTAURANT REGISTRATION (MODULE 6)
// =========================================================
function switchBiddingSubTab(sub) {
  ['bids', 'register', 'directory'].forEach(tab => {
    const view = document.getElementById('bidding-view-' + tab);
    const btn = document.getElementById('tab-btn-' + (tab === 'directory' ? 'dir' : (tab === 'register' ? 'reg' : 'bids')));
    if (tab === sub) {
      view?.classList.remove('hidden');
      btn?.classList.add('bg-slate-900', 'text-white');
      btn?.classList.remove('bg-white', 'text-slate-700');
    } else {
      view?.classList.add('hidden');
      btn?.classList.remove('bg-slate-900', 'text-white');
      btn?.classList.add('bg-white', 'text-slate-700');
    }
  });

  if (sub === 'bids') loadBiddingStalls();
  if (sub === 'directory') loadRegisteredVendorsList();
}

let cachedStalls = [];

async function loadBiddingStalls() {
  const grid = document.getElementById('stalls-bidding-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="col-span-2 text-center py-8 text-slate-500"><i class="fa-solid fa-spinner fa-spin text-2xl text-amber-500 mb-2"></i><p>Loading live rest-stop auction tenders...</p></div>`;

  try {
    const stalls = await MSRTCApi.getBiddingStalls();
    cachedStalls = stalls || [];
    renderBiddingStalls(cachedStalls);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-2 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs">${esc(err.message)}</div>`;
  }
}

function renderBiddingStalls(stalls) {
  const grid = document.getElementById('stalls-bidding-grid');
  if (!grid) return;

  if (!stalls.length) {
    grid.innerHTML = `<div class="col-span-2 text-center text-slate-500 py-6">No active stall tenders right now.</div>`;
    return;
  }

  grid.innerHTML = stalls.map(s => {
    const minBid = s.current_highest_bid + s.min_increment;
    const recentBidsHtml = (s.recentBids || []).map(b => `
      <div class="flex justify-between text-[11px] text-slate-600 border-b border-slate-100 py-1">
        <span>${esc(b.vendor_name)}</span>
        <span class="font-mono font-bold text-slate-900">₹${Number(b.bid_amount).toLocaleString('en-IN')}</span>
      </div>
    `).join('') || '<div class="text-[11px] text-slate-400">No competitive bids yet. Be the first!</div>';

    return `
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4">
        <div class="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              ${esc(s.corridor)}
            </span>
            <h3 class="text-base font-black text-slate-900 mt-1">${esc(s.stall_number)}</h3>
            <p class="text-xs text-slate-500 font-medium">${esc(s.rest_stop_name)} • ${esc(s.location_area)}</p>
          </div>
          <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            ${s.status}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <span class="text-slate-400 block text-[10px] uppercase font-bold">Stall Category</span>
            <span class="font-semibold text-slate-800 text-[11px]">${esc(s.stall_category)} (${s.sqft_area} sq.ft)</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px] uppercase font-bold">Base Reserve Bid</span>
            <span class="font-bold text-slate-700">₹${Number(s.base_bid_monthly).toLocaleString('en-IN')}/mo</span>
          </div>
          <div class="col-span-2 border-t border-slate-200 pt-2 flex justify-between items-center">
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase">Current Winning Bid:</span>
              <span class="text-lg font-black text-msrtc-red font-mono ml-1">₹${Number(s.current_highest_bid).toLocaleString('en-IN')}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block">Leading Bidder</span>
              <span class="text-[11px] font-bold text-slate-900">${esc(s.highest_bidder_name || 'None')}</span>
            </div>
          </div>
        </div>

        <!-- Recent Bid Log -->
        <div class="bg-white border border-slate-100 rounded-xl p-3">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Recent Bidding Activity (${s.total_bids} bids)</span>
          <div class="space-y-0.5">
            ${recentBidsHtml}
          </div>
        </div>

        <!-- Place Bid Action -->
        <div class="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-2.5 text-xs">
          <div class="flex justify-between items-center">
            <span class="font-bold text-amber-950">Place Competitive Tender Bid:</span>
            <span class="text-[10px] text-slate-500">Min Bid: ₹${Number(minBid).toLocaleString('en-IN')}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="bid-name-${s.id}" placeholder="Your Restaurant / Vendor Name" value="${esc(currentUser.name)}" class="p-2.5 border border-slate-300 rounded-xl bg-white text-xs">
            <input type="tel" id="bid-phone-${s.id}" placeholder="Phone Number" value="${esc(currentUser.phone)}" class="p-2.5 border border-slate-300 rounded-xl bg-white text-xs">
          </div>
          <div class="flex gap-2 items-center">
            <div class="relative flex-grow">
              <span class="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input type="number" id="bid-amt-${s.id}" min="${minBid}" step="${s.min_increment}" value="${minBid}" class="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-sm">
            </div>
            <button onclick="handlePlaceBid('${s.id}')" class="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5">
              <i class="fa-solid fa-gavel text-amber-400"></i> Submit Bid
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handlePlaceBid(stallId) {
  const name = document.getElementById(`bid-name-${stallId}`)?.value.trim();
  const phone = document.getElementById(`bid-phone-${stallId}`)?.value.trim();
  const amt = document.getElementById(`bid-amt-${stallId}`)?.value;

  if (!name || !phone || !amt) {
    alert("Please enter your vendor name, phone number, and bid amount.");
    return;
  }

  try {
    const res = await MSRTCApi.placeStallBid(stallId, name, phone, parseInt(amt));
    alert(res.message);
    loadBiddingStalls();
  } catch (err) {
    alert(`Bidding Error: ${err.message}`);
  }
}

async function handleVendorRegistrationSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-vendor-btn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Registering Partner...`;

  const payload = {
    restaurantName: document.getElementById('reg-rest-name').value.trim(),
    ownerName: document.getElementById('reg-owner-name').value.trim(),
    phone: document.getElementById('reg-phone').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    fssaiLicense: document.getElementById('reg-fssai').value.trim(),
    corridor: document.getElementById('reg-corridor').value,
    locationStand: document.getElementById('reg-location').value.trim(),
    cuisineType: document.getElementById('reg-cuisine').value,
    seatingCapacity: parseInt(document.getElementById('reg-capacity').value || 75),
    hasRestrooms: document.getElementById('reg-restrooms').checked,
    hasEvCharging: document.getElementById('reg-ev').checked,
    commissionPct: 12.0
  };

  try {
    const res = await MSRTCApi.registerVendor(payload);
    openVendorCertModal(res);
    e.target.reset();
  } catch (err) {
    alert(`Registration Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-stamp"></i> Submit Official Partner Registration`;
  }
}

function openVendorCertModal(res) {
  document.getElementById('cert-restaurant-name').innerText = res.restaurantName;
  document.getElementById('cert-partner-id').innerText = res.vendorId;
  document.getElementById('cert-no').innerText = res.certificateNumber;
  document.getElementById('vendor-cert-modal').classList.remove('hidden');
}

function closeVendorCertModal() {
  document.getElementById('vendor-cert-modal').classList.add('hidden');
  switchBiddingSubTab('directory');
}

async function loadRegisteredVendorsList() {
  const container = document.getElementById('registered-vendors-container');
  if (!container) return;
  container.innerHTML = `<div class="col-span-3 text-center py-8 text-slate-500"><i class="fa-solid fa-spinner fa-spin text-2xl text-amber-500 mb-2"></i><p>Loading verified vendor network...</p></div>`;

  try {
    const list = await MSRTCApi.getRegisteredVendors();
    renderRegisteredVendors(list || []);
  } catch (err) {
    container.innerHTML = `<div class="col-span-3 text-xs text-rose-700 bg-rose-50 p-4 rounded-xl">${esc(err.message)}</div>`;
  }
}

function renderRegisteredVendors(list) {
  const container = document.getElementById('registered-vendors-container');
  if (!container) return;

  const samplePartners = list.length ? list : [
    {
      restaurant_name: "Katraj Ghat Highway Food Plaza",
      owner_name: "Patil & Sons Hospitality",
      phone: "+91 98220 54321",
      location_stand: "NH48 Katraj Bypass",
      corridor: "Pune - Kolhapur NH48 Corridor",
      cuisine_type: "Maharashtrian Pure Veg & Thali",
      fssai_license: "11524021000492",
      status: "VERIFIED"
    },
    {
      restaurant_name: "Krishna Valley Highway Plaza",
      owner_name: "Sanjay Deshmukh",
      phone: "+91 97654 32109",
      location_stand: "Karad Bypass Junction",
      corridor: "Pune - Kolhapur NH48 Corridor",
      cuisine_type: "Family Food Court & Snacks",
      fssai_license: "11524021000881",
      status: "VERIFIED"
    },
    {
      restaurant_name: "Amrutdhara Refreshment Center",
      owner_name: "Ramesh Pawar",
      phone: "+91 94230 11982",
      location_stand: "Swargate Bus Depot Food Bay",
      corridor: "Pune City Transit Hub",
      cuisine_type: "24x7 Tea, Misal Pav & Rail Neer",
      fssai_license: "11524021000109",
      status: "VERIFIED"
    }
  ];

  container.innerHTML = samplePartners.map(p => `
    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
      <div class="flex justify-between items-start">
        <h4 class="font-extrabold text-slate-900">${esc(p.restaurant_name)}</h4>
        <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <i class="fa-solid fa-check"></i> ${p.status || 'VERIFIED'}
        </span>
      </div>
      <p class="text-slate-500 text-[11px]">${esc(p.location_stand)} • ${esc(p.corridor)}</p>
      <div class="pt-2 border-t border-slate-200/80 flex justify-between text-[11px]">
        <span class="text-slate-500">FSSAI: <span class="font-mono text-slate-700 font-semibold">${esc(p.fssai_license)}</span></span>
        <span class="text-slate-700 font-semibold">${esc(p.phone)}</span>
      </div>
    </div>
  `).join('');
}


// =========================================================
// 15. COURIER, CARGO & LUGGAGE BOOKING (MSRTC VAHATUK)
// =========================================================
function switchCargoSubTab(sub) {
  ['book', 'luggage', 'track'].forEach(tab => {
    const view = document.getElementById('cargo-view-' + tab);
    const btn = document.getElementById('tab-btn-cargo' + tab);
    if (tab === sub) {
      view?.classList.remove('hidden');
      btn?.classList.add('bg-slate-900', 'text-white');
      btn?.classList.remove('bg-white', 'text-slate-700');
    } else {
      view?.classList.add('hidden');
      btn?.classList.remove('bg-slate-900', 'text-white');
      btn?.classList.add('bg-white', 'text-slate-700');
    }
  });

  if (sub === 'book') calculateLiveCargoTariff();
  if (sub === 'luggage') calculatePassengerLuggageLive();
  if (sub === 'track') trackConsignmentLive();
}

async function calculateLiveCargoTariff() {
  const from = document.getElementById('cargo-from')?.value.trim() || "Kolhapur CBS (Central Bus Stand)";
  const to = document.getElementById('cargo-to')?.value.trim() || "Pune (Swargate)";
  const weight = parseFloat(document.getElementById('cargo-weight')?.value || 8);
  const category = document.getElementById('cargo-category')?.value || "General Commercial";
  const speed = document.querySelector('input[name="cargoSpeed"]:checked')?.value || "STANDARD";
  const packages = parseInt(document.getElementById('cargo-packages')?.value || 1);

  try {
    const quote = await MSRTCApi.getCargoQuote({
      fromStand: from,
      toStand: to,
      weightKg: weight,
      category: category,
      speedTier: speed,
      packagesCount: packages,
      isExcessLuggage: false
    });

    document.getElementById('cargo-calc-dist').innerText = `${quote.distanceKm} km`;
    document.getElementById('cargo-calc-weight').innerText = `${quote.weightKg} kg`;
    document.getElementById('cargo-calc-base').innerText = `₹${quote.baseFreight}`;
    document.getElementById('cargo-calc-distcharge').innerText = `₹${quote.distanceCharge}`;
    document.getElementById('cargo-calc-surcharge').innerText = `₹${quote.surcharge}`;
    document.getElementById('cargo-calc-gst').innerText = `₹${quote.gst}`;
    document.getElementById('cargo-calc-total').innerText = `₹${quote.total}`;
  } catch (err) {
    document.getElementById('cargo-calc-total').innerText = `₹205`;
  }
}

async function handleCargoBookingSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('book-cargo-btn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing Waybill...`;

  const payload = {
    bookingType: 'PARCEL',
    fromStand: document.getElementById('cargo-from').value.trim(),
    toStand: document.getElementById('cargo-to').value.trim(),
    senderName: document.getElementById('cargo-s-name').value.trim(),
    senderPhone: document.getElementById('cargo-s-phone').value.trim(),
    receiverName: document.getElementById('cargo-r-name').value.trim(),
    receiverPhone: document.getElementById('cargo-r-phone').value.trim(),
    category: document.getElementById('cargo-category').value,
    weightKg: parseFloat(document.getElementById('cargo-weight').value || 5),
    packagesCount: parseInt(document.getElementById('cargo-packages').value || 1),
    speedTier: document.querySelector('input[name="cargoSpeed"]:checked')?.value || 'STANDARD',
    declaredValue: 2500
  };

  try {
    const res = await MSRTCApi.bookCargo(payload);
    openCargoModal(res);
  } catch (err) {
    alert(`Cargo Booking Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-file-invoice"></i> Confirm & Generate MSRTC Waybill`;
  }
}

function calculatePassengerLuggageLive() {
  const totalWeight = parseFloat(document.getElementById('luggage-weight-input')?.value || 25);
  const freeAllowance = 15.0;
  const excess = Math.max(0, totalWeight - freeAllowance);
  const fee = Math.round(excess * 10 * 1.05);

  document.getElementById('luggage-excess-kg').innerText = `${excess.toFixed(1)} kg`;
  document.getElementById('luggage-excess-total').innerText = `₹${fee} (incl. 5% GST)`;
}

function bookExcessLuggagePass() {
  const totalWeight = parseFloat(document.getElementById('luggage-weight-input')?.value || 25);
  const excess = Math.max(0, totalWeight - 15.0);
  const fee = Math.round(excess * 10 * 1.05);

  const mockPass = {
    consignmentId: `MSRTC-LUG-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    from: "Kolhapur CBS (Central Bus Stand)",
    to: "Pune (Swargate)",
    tariff: {
      isExcessLuggage: true,
      weightKg: totalWeight,
      excessWeightKg: excess,
      total: fee
    },
    sender: { name: currentUser.name, phone: currentUser.phone },
    receiver: { name: currentUser.name, phone: currentUser.phone },
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };

  openCargoModal(mockPass);
}

function openCargoModal(cargo) {
  const content = document.getElementById('cargo-modal-content');
  const t = cargo.tariff || {};

  content.innerHTML = `
    <div class="border-4 border-slate-900 rounded-2xl p-6 bg-white space-y-4 font-sans">
      <div class="flex justify-between items-start border-b-2 border-slate-900 pb-3">
        <div>
          <h2 class="text-xl font-black text-slate-900 uppercase">MSRTC Official Cargo Waybill (AWB)</h2>
          <p class="text-xs text-slate-500">State Transport Express Goods & Parcel Consignment Note</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 block uppercase font-bold">Consignment Number</span>
          <span class="text-sm font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 block">
            ${esc(cargo.consignmentId || cargo.trackingNumber)}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold">Origin Bus Stand</span>
          <p class="font-extrabold text-slate-900">${esc(cargo.from || 'Kolhapur CBS')}</p>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold">Destination Bus Stand</span>
          <p class="font-extrabold text-slate-900">${esc(cargo.to || 'Pune (Swargate)')}</p>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold">Consignor (Sender)</span>
          <p class="font-bold text-slate-800">${esc(cargo.sender?.name || 'Pravin Dongare')} • ${esc(cargo.sender?.phone || '+91 98220 12345')}</p>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold">Consignee (Receiver)</span>
          <p class="font-bold text-slate-800">${esc(cargo.receiver?.name || 'Amit Deshmukh')} • ${esc(cargo.receiver?.phone || '+91 94220 99887')}</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-xs text-center border border-slate-200 rounded-xl p-3 bg-white">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Weight</span>
          <span class="font-mono font-bold text-slate-800">${t.weightKg || 8.0} kg</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Service</span>
          <span class="font-bold text-indigo-700">${t.isExcessLuggage ? 'Excess Luggage Pass' : 'Bus Freight (Express)'}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold block">Total Paid</span>
          <span class="font-mono font-black text-msrtc-red text-sm">₹${t.total || 205}</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-qrcode text-3xl text-slate-900"></i>
          <div>
            <span class="font-bold text-slate-800 block">Depot Scan Verification</span>
            <span>OTP Required at Collection Counter</span>
          </div>
        </div>
        <span class="font-mono">${cargo.createdAt || 'Just now'}</span>
      </div>
    </div>
  `;

  document.getElementById('cargo-modal').classList.remove('hidden');
}

function closeCargoModal() {
  document.getElementById('cargo-modal').classList.add('hidden');
}

async function trackConsignmentLive() {
  const query = document.getElementById('cargo-track-input')?.value.trim() || 'MSRTC-CRG-2026-10492';
  const box = document.getElementById('cargo-tracking-result-box');
  if (!box) return;

  box.innerHTML = `<div class="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-500 text-xs"><i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-600 mb-2"></i><p>Locating parcel across transit network...</p></div>`;

  try {
    const data = await MSRTCApi.trackCargo(query);
    renderCargoTrackingTimeline(data);
  } catch (err) {
    box.innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs">${esc(err.message)}</div>`;
  }
}

function renderCargoTrackingTimeline(cargo) {
  const box = document.getElementById('cargo-tracking-result-box');
  if (!box) return;

  const milestones = cargo.milestones || [];

  box.innerHTML = `
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
            Active Consignment
          </span>
          <h3 class="text-xl font-black text-slate-900 mt-1 font-mono">${esc(cargo.id)}</h3>
          <p class="text-xs text-slate-500">${esc(cargo.from_stand)} → ${esc(cargo.to_stand)} • ${cargo.weight_kg} kg (${esc(cargo.cargo_category || 'General')})</p>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            ${esc(cargo.status)}: ${esc(cargo.current_location || 'In Transit')}
          </span>
        </div>
      </div>

      <!-- 5-Stage Timeline -->
      <div class="relative pl-6 space-y-6 border-l-2 border-slate-200 ml-2">
        ${milestones.map((m, idx) => {
          const isDone = m.is_completed === 1;
          return `
            <div class="relative">
              <span class="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 ${isDone ? 'bg-indigo-600 border-indigo-600 ring-4 ring-indigo-100' : 'bg-white border-slate-300'}"></span>
              <div class="${isDone ? 'text-slate-900' : 'text-slate-400'}">
                <h4 class="text-xs font-extrabold">${esc(m.milestone_title)}</h4>
                <p class="text-[11px] text-slate-500 mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i> ${esc(m.location_name)}</p>
                <span class="text-[10px] font-mono font-medium ${isDone ? 'text-indigo-600' : 'text-slate-400'}">${esc(m.timestamp)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// =========================================================
// 16. SINGLE WOMEN TRANSIT PROTECTION (MODULE 7)
// =========================================================
function loadWomenSafetyPage() {
  if (currentUser && (currentUser.fullName || currentUser.name)) {
    const nameEl = document.getElementById('ws-passenger-name');
    const phoneEl = document.getElementById('ws-passenger-phone');
    if (nameEl && !nameEl.value) nameEl.value = currentUser.fullName || currentUser.name;
    if (phoneEl && !phoneEl.value) phoneEl.value = currentUser.phone || '';
  }
}

async function handleSafeDropSubmit(e) {
  e.preventDefault();
  const passengerName = document.getElementById('ws-passenger-name').value.trim();
  const phone = document.getElementById('ws-passenger-phone').value.trim();
  const busNumber = document.getElementById('ws-bus-number').value.trim();
  const dropLandmark = document.getElementById('ws-drop-landmark').value;
  const notes = document.getElementById('ws-notes').value.trim();
  const btn = document.getElementById('ws-safe-drop-btn');
  const box = document.getElementById('ws-safe-drop-result');

  if (btn) btn.disabled = true;
  try {
    const res = await MSRTCApi.requestSafeDrop({
      passengerName, phone, busNumber, dropLandmark, notes
    });
    if (res && res.success) {
      box.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-emerald-200">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
              <i class="fa-solid fa-check"></i>
            </span>
            <span class="font-extrabold text-emerald-900">Night Safe Drop Confirmed</span>
          </div>
          <span class="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">${esc(res.requestId)}</span>
        </div>
        <p class="text-[11px] text-emerald-950 mt-1 leading-relaxed">
          <strong>Authorized Halt:</strong> ${esc(res.dropLandmark)}<br>
          <strong>Bus Number:</strong> ${esc(res.busNumber)} | <strong>Passenger:</strong> ${esc(res.passengerName)}<br>
          <strong>Crew Instruction:</strong> ${esc(res.crew_instructions)}
        </p>
        <div class="text-[10px] text-emerald-700 bg-white/70 p-2 rounded-lg border border-emerald-200 mt-1">
          <i class="fa-solid fa-shield-halved mr-1"></i> ${esc(res.emergency_backup)} | Women SOS: <strong>1091</strong>
        </div>
      `;
      box.classList.remove('hidden');
    }
  } catch (err) {
    alert(err.message || "Failed to submit Safe Drop request.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleShareTripSubmit(e) {
  e.preventDefault();
  const contactName = document.getElementById('ws-contact-name').value.trim();
  const contactPhone = document.getElementById('ws-contact-phone').value.trim();
  const passengerName = (currentUser && (currentUser.fullName || currentUser.name)) || "Solo Female Traveler";
  const busNumber = "MH-09-EM-8834";
  const btn = document.getElementById('ws-share-btn');
  const box = document.getElementById('ws-share-result');

  if (btn) btn.disabled = true;
  try {
    const res = await MSRTCApi.shareJourneyTracking({
      passengerName,
      busNumber,
      from: "Pune (Swargate)",
      to: "Kolhapur CBS",
      emergencyContact: `${contactName} (${contactPhone})`
    });
    if (res && res.success) {
      const waUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(contactPhone.replace(/[^0-9]/g, ''))}&text=${encodeURIComponent(res.whatsapp_share_text)}`;
      box.innerHTML = `
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <span class="font-bold text-slate-800">Live Journey Tracking Link Generated</span>
          <span class="font-mono text-[10px] text-slate-500 font-bold">${esc(res.trackingId)}</span>
        </div>
        <div class="space-y-1 text-[11px] text-slate-600 my-2">
          <div><i class="fa-solid fa-location-dot text-rose-600 mr-1"></i> Current Checkpoint: <strong class="text-slate-800">${esc(res.current_location)}</strong></div>
          <div><i class="fa-solid fa-id-badge text-indigo-600 mr-1"></i> Conductor: <strong>${esc(res.conductor_name)}</strong> (${esc(res.conductor_phone)})</div>
          <div><i class="fa-solid fa-clock text-amber-600 mr-1"></i> Destination ETA: <strong>${esc(res.eta)}</strong></div>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 pt-2">
          <a href="${waUrl}" target="_blank" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-center text-xs flex items-center justify-center gap-1.5 shadow-sm transition">
            <i class="fa-brands fa-whatsapp text-sm"></i> Share via WhatsApp
          </a>
          <button type="button" onclick="navigator.clipboard.writeText('${res.whatsapp_share_text}'); alert('Safety tracker link copied to clipboard!');" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3 rounded-xl text-center text-xs transition">
            <i class="fa-solid fa-copy mr-1"></i> Copy Link Text
          </button>
        </div>
      `;
      box.classList.remove('hidden');
    }
  } catch (err) {
    alert(err.message || "Failed to generate tracking link.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function triggerWomenEmergencySOS() {
  const activeBid = "MSRTC-SOS-WOMEN";
  const busNo = "MH-09-EM-8834";
  try {
    const res = await MSRTCApi.triggerEmergencySOS(activeBid, busNo);
    alert(`🚨 WOMEN EMERGENCY SOS DISPATCHED!\n\nAlert ID: ${res.sos_id}\nBus: ${res.bus_number}\n\nAuthorities Notified:\n• ${res.notified_authorities.join('\n• ')}\n\nAction: ${res.action_taken}`);
  } catch (err) {
    alert(`🚨 Emergency Call: Dial 1091 (Women Safety) or 112 (Highway Police) immediately.`);
  }
}
