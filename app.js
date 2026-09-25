/**
 * =========================================================
 * MSRTC MOBILITY SMART TRANSIT - APPLICATION CONTROLLER
 * =========================================================
 */

// 1. STATE & STORAGE HELPERS
function getStoredUser() {
  const u = localStorage.getItem('msrtc_active_user');
  if (u) {
    try { return JSON.parse(u); } catch(e) {}
  }
  return DEFAULT_USER;
}

function saveStoredUser(user) {
  if (!user) {
    localStorage.removeItem('msrtc_active_user');
  } else {
    localStorage.setItem('msrtc_active_user', JSON.stringify(user));
  }
}

function getStoredBookings() {
  const b = localStorage.getItem('msrtc_user_bookings');
  if (b) {
    try { return JSON.parse(b); } catch(e) {}
  }
  localStorage.setItem('msrtc_user_bookings', JSON.stringify(INITIAL_BOOKINGS));
  return INITIAL_BOOKINGS;
}

function saveStoredBookings(bookings) {
  localStorage.setItem('msrtc_user_bookings', JSON.stringify(bookings));
}

let currentUser = getStoredUser();
let currentFilter = 'ALL';
let includeSelfInBooking = true;

// 2. NAVIGATION CONTROLLER
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
    loadUserProfileData();
  } else if (pageId === 'smartid') {
    renderSmartIDPass();
  } else if (pageId === 'book') {
    setDefaultBookingDate();
    renderBookingUserSummary();
    renderPassengerInputs();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. AUTHENTICATION & HEADER
function renderAuthSection() {
  const container = document.getElementById('auth-section');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <button onclick="openAuthModal('login')" class="bg-msrtc-red hover:bg-msrtc-darkred text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5">
        <i class="fa-solid fa-right-to-bracket"></i> Login / Sign Up
      </button>
    `;
  } else {
    const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    container.innerHTML = `
      <div class="flex items-center gap-3">
        <button onclick="navigateTo('smartid')" title="View Smart ID Pass" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition">
          <i class="fa-solid fa-id-card text-amber-600"></i> Smart Pass
        </button>
        <button onclick="navigateTo('profile')" class="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-slate-100 hover:bg-red-50 border border-slate-200 transition">
          <div class="w-8 h-8 rounded-full bg-msrtc-red text-white flex items-center justify-center font-bold text-xs">
            ${initials}
          </div>
          <div class="text-left hidden sm:block">
            <p class="text-xs font-bold text-slate-800 leading-tight">${currentUser.fullName}</p>
            <p class="text-[10px] text-slate-500 font-medium">${currentUser.gender} • ${currentUser.phoneNumber}</p>
          </div>
        </button>
        <button onclick="handleLogout()" title="Sign Out" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-msrtc-red flex items-center justify-center text-sm transition">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    `;
  }
}

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const loginBtn = document.getElementById('tab-login-btn');
  const registerBtn = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginBtn.className = "flex-1 py-3 text-center text-xs font-bold text-msrtc-red border-b-2 border-msrtc-red";
    registerBtn.className = "flex-1 py-3 text-center text-xs font-bold text-slate-500 hover:text-slate-800";
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    registerBtn.className = "flex-1 py-3 text-center text-xs font-bold text-msrtc-red border-b-2 border-msrtc-red";
    loginBtn.className = "flex-1 py-3 text-center text-xs font-bold text-slate-500 hover:text-slate-800";
  }
}

function fillDemoCredentials() {
  document.getElementById('login-email').value = "pravindongare35@example.com";
  document.getElementById('login-password').value = "msrtc123";
  showToast("Demo credentials filled!", "info");
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  
  currentUser = {
    userId: "usr_msrtc_" + Math.floor(10000 + Math.random() * 90000),
    smartId: "MH-USR-" + Math.floor(10000 + Math.random() * 90000),
    fullName: email.includes("pravin") ? "Pravin Dongare" : email.split('@')[0].toUpperCase(),
    email: email,
    phoneNumber: "+91 98765 43210",
    gender: "Male",
    age: 29,
    createdAt: new Date().toISOString()
  };

  saveStoredUser(currentUser);
  renderAuthSection();
  closeAuthModal();
  showToast(`Welcome back, ${currentUser.fullName}!`, "success");
  navigateTo('history');
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const gender = document.getElementById('reg-gender').value;

  currentUser = {
    userId: "usr_msrtc_" + Math.floor(10000 + Math.random() * 90000),
    smartId: "MH-USR-" + Math.floor(10000 + Math.random() * 90000),
    fullName: fullName,
    email: email,
    phoneNumber: phone.startsWith('+91') ? phone : '+91 ' + phone,
    gender: gender,
    age: 28,
    createdAt: new Date().toISOString()
  };

  saveStoredUser(currentUser);
  renderAuthSection();
  closeAuthModal();
  showToast("Account created successfully!", "success");
  navigateTo('profile');
}

function handleLogout() {
  currentUser = null;
  saveStoredUser(null);
  renderAuthSection();
  showToast("You have been signed out.", "info");
  navigateTo('home');
}

// 4. USER PROFILE & DIGITAL SMART ID
function loadUserProfileData() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('profile-avatar-circle').innerText = initials;
  document.getElementById('profile-display-name').innerText = currentUser.fullName;
  document.getElementById('profile-display-email').innerText = currentUser.email;
  document.getElementById('profile-smart-id').innerText = currentUser.smartId || "MH-USR-94821";

  const bookings = getStoredBookings();
  document.getElementById('profile-total-trips').innerText = `${bookings.length} Trips`;

  document.getElementById('prof-name').value = currentUser.fullName;
  document.getElementById('prof-email').value = currentUser.email;
  document.getElementById('prof-phone').value = currentUser.phoneNumber;
  document.getElementById('prof-gender').value = currentUser.gender || "Male";
}

function handleProfileUpdate(e) {
  e.preventDefault();
  if (!currentUser) return;

  currentUser.fullName = document.getElementById('prof-name').value.trim();
  currentUser.email = document.getElementById('prof-email').value.trim();
  currentUser.phoneNumber = document.getElementById('prof-phone').value.trim();
  currentUser.gender = document.getElementById('prof-gender').value;

  saveStoredUser(currentUser);
  renderAuthSection();
  loadUserProfileData();
  showToast("Profile details updated successfully!", "success");
}

function renderSmartIDPass() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('smartid-avatar').innerText = initials;
  document.getElementById('smartid-name').innerText = currentUser.fullName;
  document.getElementById('smartid-phone').innerText = currentUser.phoneNumber;
  document.getElementById('smartid-gender').innerText = `Gender: ${currentUser.gender} • Age: ${currentUser.age || 29}`;
  document.getElementById('smartid-code').innerText = currentUser.smartId || "MH-USR-94821";
}

// 5. HISTORICAL BOOKINGS RENDER & FILTER
function filterBookings(status) {
  currentFilter = status;
  document.querySelectorAll('.history-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === status) {
      btn.className = "history-filter-btn active-tab bg-white text-slate-900 px-4 py-2 rounded-lg shadow-sm transition";
    } else {
      btn.className = "history-filter-btn text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition";
    }
  });
  renderBookingsList();
}

function renderBookingsList() {
  const container = document.getElementById('bookings-container');
  const allBookings = getStoredBookings();
  
  const filtered = currentFilter === 'ALL' 
    ? allBookings 
    : allBookings.filter(b => b.tripStatus === currentFilter);

  document.getElementById('history-count-badge').innerText = `${filtered.length} Records`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-2xl mx-auto mb-4">
          <i class="fa-solid fa-receipt"></i>
        </div>
        <h3 class="text-base font-bold text-slate-800 mb-1">No ${currentFilter.toLowerCase()} bookings found</h3>
        <p class="text-xs text-slate-500 mb-5">You haven't booked any bus trips matching this filter criteria yet.</p>
        <button onclick="navigateTo('book')" class="bg-msrtc-red hover:bg-msrtc-darkred text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">
          <i class="fa-solid fa-ticket mr-1"></i> Book a New Journey
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const depDate = new Date(b.route.departureTime);
    const formattedDate = depDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const formattedTime = depDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let statusBadge = '';
    if (b.tripStatus === 'UPCOMING') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800"><span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Upcoming</span>`;
    } else if (b.tripStatus === 'COMPLETED') {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-circle-check text-xs"></i> Completed</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800"><i class="fa-solid fa-ban text-xs"></i> Cancelled</span>`;
    }

    return `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-50 text-msrtc-red flex items-center justify-center text-lg font-bold">
              <i class="fa-solid fa-bus"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-extrabold text-slate-900 text-base">${b.busDetails.busType}</h4>
                <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${b.busDetails.busNumber}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium">PNR: <b class="font-mono text-slate-700">${b.pnr}</b> • Booked on ${new Date(b.bookedAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-center">
            ${statusBadge}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 my-1 items-center">
          <div class="flex items-start gap-3">
            <div class="text-msrtc-red text-lg mt-0.5"><i class="fa-solid fa-circle-dot"></i></div>
            <div>
              <p class="text-[11px] text-slate-400 font-semibold uppercase">From Departure</p>
              <p class="text-sm font-bold text-slate-900">${b.route.from}</p>
              <p class="text-xs text-slate-500 font-medium">${formattedDate} at ${formattedTime}</p>
            </div>
          </div>

          <div class="text-center hidden md:block">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${b.route.duration} Non-stop</span>
            <div class="flex items-center justify-center gap-2 my-1">
              <div class="h-0.5 bg-slate-200 flex-grow max-w-[60px]"></div>
              <i class="fa-solid fa-arrow-right text-slate-400 text-xs"></i>
              <div class="h-0.5 bg-slate-200 flex-grow max-w-[60px]"></div>
            </div>
            <span class="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Seats: ${b.seats.join(', ')}</span>
          </div>

          <div class="flex items-start gap-3">
            <div class="text-emerald-600 text-lg mt-0.5"><i class="fa-solid fa-location-pin"></i></div>
            <div>
              <p class="text-[11px] text-slate-400 font-semibold uppercase">To Destination</p>
              <p class="text-sm font-bold text-slate-900">${b.route.to}</p>
              <p class="text-xs text-slate-500 font-medium">${b.route.boardingPoint}</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div class="flex items-center gap-4 text-xs text-slate-600">
            <span>Travelers: <b>${b.passengers.map(p => p.name).join(', ')}</b></span>
            <span>Total Paid: <b class="text-slate-900 text-sm">₹${b.fare.totalAmount}</b></span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openTicketModal('${b.bookingId}')" class="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
              <i class="fa-solid fa-receipt text-slate-500"></i> View E-Ticket Slip
            </button>
            ${b.tripStatus === 'UPCOMING' ? `
              <button onclick="cancelBookingPrompt('${b.bookingId}')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3.5 py-2 rounded-xl transition">
                Cancel Trip
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 6. TICKET MODAL & PRINT
function openTicketModal(bookingId) {
  const allBookings = getStoredBookings();
  const b = allBookings.find(x => x.bookingId === bookingId);
  if (!b) return;

  const content = document.getElementById('ticket-modal-content');
  content.innerHTML = `
    <div class="border-2 border-dashed border-slate-300 p-5 rounded-2xl bg-white">
      <div class="flex justify-between items-start pb-4 border-b border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-msrtc-red text-white flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-bus"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-slate-900 text-base">MSRTC Smart Mobility</h3>
              <p class="text-[10px] text-slate-500 font-medium">Govt. of Maharashtra Undertaking</p>
            </div>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">PNR NUMBER</span>
          <p class="font-mono font-extrabold text-slate-900 text-sm text-msrtc-red">${b.pnr}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 my-4 pb-4 border-b border-slate-100 text-xs">
        <div>
          <span class="text-slate-400 uppercase text-[10px] font-bold">Service Type</span>
          <p class="font-bold text-slate-900">${b.busDetails.busType}</p>
          <p class="text-slate-500 text-[11px] font-mono">${b.busDetails.busNumber}</p>
        </div>
        <div>
          <span class="text-slate-400 uppercase text-[10px] font-bold">Trip Status</span>
          <p class="font-bold ${b.tripStatus === 'COMPLETED' ? 'text-emerald-600' : (b.tripStatus === 'UPCOMING' ? 'text-blue-600' : 'text-rose-600')}">${b.tripStatus}</p>
        </div>
        <div>
          <span class="text-slate-400 uppercase text-[10px] font-bold">From (Origin)</span>
          <p class="font-bold text-slate-900">${b.route.from}</p>
          <p class="text-slate-500 text-[11px]">${new Date(b.route.departureTime).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <span class="text-slate-400 uppercase text-[10px] font-bold">To (Destination)</span>
          <p class="font-bold text-slate-900">${b.route.to}</p>
          <p class="text-slate-500 text-[11px]">${b.route.boardingPoint}</p>
        </div>
      </div>

      <div class="mb-4 pb-4 border-b border-slate-100">
        <span class="text-slate-400 uppercase text-[10px] font-bold block mb-2">Passenger & Seat Manifest</span>
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
            <tr>
              <th class="p-2">Passenger Name</th>
              <th class="p-2">Gender/Age</th>
              <th class="p-2 text-right">Seat No.</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${b.passengers.map((p, idx) => `
              <tr>
                <td class="p-2 font-bold text-slate-800">${p.name}</td>
                <td class="p-2 text-slate-600">${p.gender}, ${p.age}y</td>
                <td class="p-2 text-right font-bold text-msrtc-red">${b.seats[idx] || b.seats[0]}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs mb-4">
        <div class="flex justify-between text-slate-500">
          <span>Base Fare (${b.passengers.length} Seats)</span>
          <span>₹${b.fare.baseFare}</span>
        </div>
        <div class="flex justify-between text-slate-500">
          <span>GST & Surcharge (5%)</span>
          <span>₹${b.fare.gst}</span>
        </div>
        <div class="flex justify-between font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
          <span>Total Amount Paid</span>
          <span class="text-msrtc-red text-sm">₹${b.fare.totalAmount}</span>
        </div>
        <div class="flex justify-between text-[11px] text-emerald-600 font-semibold pt-1">
          <span>Payment Mode: ${b.fare.paymentMethod}</span>
          <span>Status: ${b.fare.paymentStatus}</span>
        </div>
      </div>

      <div class="text-[10px] text-slate-400 text-center">
        * Please carry a valid Govt. Photo ID or Digital Smart Pass during journey.
      </div>
    </div>
  `;

  document.getElementById('ticket-modal').classList.remove('hidden');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').classList.add('hidden');
}

function cancelBookingPrompt(bookingId) {
  if (confirm("Are you sure you want to cancel this booking? Refund will be processed back to your original payment method.")) {
    const bookings = getStoredBookings();
    const item = bookings.find(b => b.bookingId === bookingId);
    if (item) {
      item.tripStatus = "CANCELLED";
      item.fare.paymentStatus = "REFUND_INITIATED";
      saveStoredBookings(bookings);
      renderBookingsList();
      showToast("Booking cancelled successfully. Refund initiated.", "info");
    }
  }
}

// 7. BOOKING SIMULATOR & PASSENGER ALLOCATION
function setDefaultBookingDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const str = tomorrow.toISOString().split('T')[0];
  const dateInput = document.getElementById('book-date');
  if (dateInput) dateInput.value = str;
}

function toggleSelfBooking() {
  includeSelfInBooking = !includeSelfInBooking;
  const btn = document.getElementById('btn-self-toggle');
  const ind = document.getElementById('self-booking-indicator');
  if (includeSelfInBooking && currentUser) {
    btn.innerHTML = '<i class="fa-solid fa-check mr-1 text-emerald-400"></i> Myself Included';
    btn.className = "bg-slate-900 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg transition self-start sm:self-auto";
    ind.innerHTML = `Autofilled as <b>${currentUser.fullName}</b> (${currentUser.gender}, ${currentUser.phoneNumber})`;
  } else {
    btn.innerHTML = '<i class="fa-solid fa-user-plus mr-1"></i> Book For Others Only';
    btn.className = "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition self-start sm:self-auto";
    ind.innerHTML = `Booking for others (Self not traveling)`;
  }
  renderPassengerInputs();
}

function renderPassengerInputs() {
  const select = document.getElementById('book-passengers');
  if (!select) return;
  const count = parseInt(select.value || '1');
  const container = document.getElementById('passenger-inputs-container');
  if (!container) return;

  let html = '';
  for (let i = 1; i <= count; i++) {
    let isSelf = (i === 1 && includeSelfInBooking && currentUser);
    let defaultName = isSelf ? currentUser.fullName : (i === 1 ? '' : `Family Member ${i}`);
    let defaultAge = isSelf ? (currentUser.age || 29) : (25 + i * 5);
    let defaultGender = isSelf ? currentUser.gender : 'Male';

    html += `
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        <div class="sm:col-span-1">
          <label class="block text-[10px] font-bold text-slate-500 uppercase">Passenger ${i} Name ${isSelf ? '(Self)' : ''}</label>
          <input type="text" id="pass-name-${i}" value="${defaultName}" required class="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-lg">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase">Age</label>
          <input type="number" id="pass-age-${i}" value="${defaultAge}" min="1" max="100" required class="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-lg">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase">Gender</label>
          <select id="pass-gender-${i}" class="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-lg">
            <option value="Male" ${defaultGender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${defaultGender === 'Female' ? 'selected' : ''}>Female (50% Concession)</option>
            <option value="Other" ${defaultGender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  calculateFarePreview();
}

function addSavedCoPassenger(name, age, gender) {
  const select = document.getElementById('book-passengers');
  const currentCount = parseInt(select.value);
  if (currentCount < 4) {
    select.value = (currentCount + 1).toString();
  }
  renderPassengerInputs();
  const targetIndex = parseInt(select.value);
  const nameInput = document.getElementById(`pass-name-${targetIndex}`);
  const ageInput = document.getElementById(`pass-age-${targetIndex}`);
  const genderInput = document.getElementById(`pass-gender-${targetIndex}`);
  if (nameInput) nameInput.value = name;
  if (ageInput) ageInput.value = age;
  if (genderInput) genderInput.value = gender;
  showToast(`Added ${name} as Passenger ${targetIndex}!`, "info");
  calculateFarePreview();
}

function calculateFarePreview() {
  const typeSelect = document.getElementById('book-type');
  const countSelect = document.getElementById('book-passengers');
  if (!typeSelect || !countSelect) return;

  const type = typeSelect.value;
  const count = parseInt(countSelect.value || '1');
  const fleetInfo = MSRTC_FLEET[type] || { baseFarePerSeat: 535 };
  const total = fleetInfo.baseFarePerSeat * count;

  const fareDisplay = document.getElementById('fare-preview-amount');
  if (fareDisplay) fareDisplay.innerText = `₹${total}`;

  let seats = [];
  for (let i = 1; i <= count; i++) {
    seats.push(`${12 + i}${i % 2 === 0 ? 'B' : 'A'}`);
  }
  const seatBadge = document.getElementById('seat-badge-display');
  if (seatBadge) seatBadge.innerText = `Seat(s): ${seats.join(', ')}`;
}

function quickBook(from, to, busType) {
  navigateTo('book');
  document.getElementById('book-from').value = from;
  document.getElementById('book-to').value = to;
  document.getElementById('book-type').value = busType;
  calculateFarePreview();
}

function renderBookingUserSummary() {
  const container = document.getElementById('booking-user-summary');
  if (!container) return;
  if (currentUser) {
    container.innerHTML = `
      <p><span class="text-slate-400">Name:</span> <b class="text-white">${currentUser.fullName}</b></p>
      <p><span class="text-slate-400">Email:</span> <b class="text-white">${currentUser.email}</b></p>
      <p><span class="text-slate-400">Phone:</span> <b class="text-white">${currentUser.phoneNumber}</b></p>
      <p><span class="text-slate-400">Smart ID:</span> <b class="text-amber-400 font-mono">${currentUser.smartId}</b></p>
    `;
  } else {
    container.innerHTML = `
      <p class="text-amber-300">Guest Checkout</p>
      <p class="text-[11px] text-slate-400">Sign in to save this booking to your permanent history.</p>
    `;
  }
}

function handleBookTicketSubmit(e) {
  e.preventDefault();

  const from = document.getElementById('book-from').value;
  const to = document.getElementById('book-to').value;
  const date = document.getElementById('book-date').value;
  const busType = document.getElementById('book-type').value;
  const count = parseInt(document.getElementById('book-passengers').value);

  if (from === to) {
    showToast("Departure and Destination cannot be the same!", "error");
    return;
  }

  const fleetInfo = MSRTC_FLEET[busType] || { baseFarePerSeat: 535 };
  const baseFare = fleetInfo.baseFarePerSeat * count;
  const gst = Math.round(baseFare * 0.05);
  const totalAmount = baseFare + gst;

  let seats = [];
  let passengers = [];
  for (let i = 1; i <= count; i++) {
    seats.push(`${10 + i}${i % 2 === 0 ? 'B' : 'A'}`);
    const pName = document.getElementById(`pass-name-${i}`)?.value || `Passenger ${i}`;
    const pAge = parseInt(document.getElementById(`pass-age-${i}`)?.value || '28');
    const pGender = document.getElementById(`pass-gender-${i}`)?.value || 'Male';
    passengers.push({ name: pName, age: pAge, gender: pGender });
  }

  const newBooking = {
    bookingId: "MSRTC-2026-" + Math.floor(10000 + Math.random() * 90000),
    pnr: "PNR" + Math.floor(1000000 + Math.random() * 9000000),
    userId: currentUser ? currentUser.userId : "usr_guest",
    busDetails: {
      busNumber: "MH-" + Math.floor(10 + Math.random() * 40) + "-BT-" + Math.floor(1000 + Math.random() * 9000),
      busType: busType,
      operator: "MSRTC Smart Transit Division"
    },
    route: {
      from: from,
      to: to,
      departureTime: `${date}T07:30:00+05:30`,
      arrivalTime: `${date}T12:00:00+05:30`,
      boardingPoint: `${from} Central Bay Platform`,
      duration: "4h 30m"
    },
    seats: seats,
    passengers: passengers,
    fare: {
      baseFare: baseFare,
      gst: gst,
      totalAmount: totalAmount,
      paymentMethod: "UPI Instant Pay",
      paymentStatus: "PAID"
    },
    tripStatus: "UPCOMING",
    bookedAt: new Date().toISOString()
  };

  const bookings = getStoredBookings();
  bookings.unshift(newBooking);
  saveStoredBookings(bookings);

  showToast(`Booking Successful! PNR: ${newBooking.pnr}`, "success");
  navigateTo('history');
  setTimeout(() => {
    openTicketModal(newBooking.bookingId);
  }, 500);
}

// 8. TOAST SYSTEM
function showToast(message, type = "info") {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  
  let bg = "bg-slate-900 text-white";
  let icon = "fa-circle-info text-blue-400";
  if (type === "success") {
    bg = "bg-emerald-900 text-white border border-emerald-700";
    icon = "fa-circle-check text-emerald-400";
  } else if (type === "error") {
    bg = "bg-rose-900 text-white border border-rose-700";
    icon = "fa-triangle-exclamation text-rose-400";
  }

  toast.className = `${bg} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 20);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 9. INITIALIZE ON DOM READY
document.addEventListener('DOMContentLoaded', () => {
  renderAuthSection();
  setDefaultBookingDate();
});
