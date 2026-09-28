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
let currentSelectedSeats = ["14A"]; // Default selected seat

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
    populateLocationDatalists();
    goToStep(1);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// 3. POPULATE LOCATION DATALISTS & MANUAL LOCATION LOGIC
function populateLocationDatalists() {
  const datalist = document.getElementById('transit-locations-list');
  if (!datalist) return;

  let html = `<optgroup label="Kolhapur District Locations (सर्व कोल्हापूर जिल्हा)">`;
  KOLHAPUR_DISTRICT_LOCATIONS.forEach(loc => {
    html += `<option value="${loc}">${loc}</option>`;
  });
  html += `</optgroup><optgroup label="Other Major Maharashtra Cities">`;
  OTHER_MAHARASHTRA_LOCATIONS.forEach(loc => {
    html += `<option value="${loc}">${loc}</option>`;
  });
  html += `</optgroup>`;

  datalist.innerHTML = html;
}

// 4. INTERACTIVE MULTIPLE SEAT SELECTION
function renderInteractiveSeatCabin() {
  const cabinContainer = document.getElementById('bus-cabin-grid');
  if (!cabinContainer) return;

  cabinContainer.innerHTML = '';
  const rows = 7; // 7 rows = 28 seats (2+2 layout)

  for (let r = 1; r <= rows; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = "flex items-center justify-between gap-3 py-1";

    // Left Pair (A & B)
    const leftPair = document.createElement('div');
    leftPair.className = "flex gap-2";
    leftPair.appendChild(createSeatButton(`${r}A`, r <= 2));
    leftPair.appendChild(createSeatButton(`${r}B`, r <= 2));

    // Aisle Indicator
    const aisle = document.createElement('div');
    aisle.className = "text-[10px] font-bold text-slate-400 font-mono tracking-widest px-1";
    aisle.innerText = `R${r}`;

    // Right Pair (C & D)
    const rightPair = document.createElement('div');
    rightPair.className = "flex gap-2";
    rightPair.appendChild(createSeatButton(`${r}C`, false));
    rightPair.appendChild(createSeatButton(`${r}D`, false));

    rowDiv.appendChild(leftPair);
    rowDiv.appendChild(aisle);
    rowDiv.appendChild(rightPair);
    cabinContainer.appendChild(rowDiv);
  }

  updateSeatSelectionDisplay();
}

function createSeatButton(seatId, isLadiesReserved) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('data-seat-id', seatId);

  const isBooked = ['02A', '04B', '06C'].includes(seatId);
  const isSelected = currentSelectedSeats.includes(seatId);

  if (isBooked) {
    btn.className = "seat-btn w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200 text-slate-400 text-xs font-bold border border-slate-300 cursor-not-allowed flex items-center justify-center";
    btn.disabled = true;
    btn.title = `Seat ${seatId} - Booked`;
    btn.innerText = seatId;
  } else if (isSelected) {
    btn.className = "seat-btn selected w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-msrtc-red text-white text-xs font-bold border border-msrtc-darkred shadow-md flex items-center justify-center";
    btn.title = `Seat ${seatId} - Selected by you`;
    btn.innerText = seatId;
    btn.onclick = () => toggleSeatSelection(seatId);
  } else if (isLadiesReserved) {
    btn.className = "seat-btn w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold border border-pink-200 flex flex-col items-center justify-center";
    btn.title = `Seat ${seatId} - Ladies Reserved (50% Concession)`;
    btn.innerHTML = `<span class="text-[10px] leading-none">${seatId}</span><i class="fa-solid fa-venus text-[8px] text-pink-500 mt-0.5"></i>`;
    btn.onclick = () => toggleSeatSelection(seatId);
  } else {
    btn.className = "seat-btn w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm flex items-center justify-center";
    btn.title = `Seat ${seatId} - Available`;
    btn.innerText = seatId;
    btn.onclick = () => toggleSeatSelection(seatId);
  }

  return btn;
}

function toggleSeatSelection(seatId) {
  if (currentSelectedSeats.includes(seatId)) {
    if (currentSelectedSeats.length === 1) {
      showToast("At least 1 seat must be selected!", "info");
      return;
    }
    currentSelectedSeats = currentSelectedSeats.filter(s => s !== seatId);
  } else {
    if (currentSelectedSeats.length >= 6) {
      showToast("Maximum 6 seats can be selected at a time.", "error");
      return;
    }
    currentSelectedSeats.push(seatId);
  }

  wizardState.selectedSeats = [...currentSelectedSeats];
  renderInteractiveSeatCabin();
  if (wizardState.step === 4) {
    renderWizardPassengerInputs();
  }
}

function updateSeatSelectionDisplay() {
  const badge = document.getElementById('seat-badge-display');
  if (badge) {
    badge.innerText = `Selected (${currentSelectedSeats.length}): ${currentSelectedSeats.join(', ')}`;
  }
}

// 5. AUTHENTICATION & HEADER
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

// 6. USER PROFILE & DIGITAL SMART ID
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

// 7. HISTORICAL BOOKINGS RENDER & FILTER
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
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${b.route.duration} Express</span>
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

// 8. TICKET MODAL & PRINT
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
              <h3 class="font-extrabold text-slate-900 text-base">Happy Hours • MSRTC Smart Mobility</h3>
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
                <td class="p-2">
                  <span class="font-bold text-slate-800">${p.name}</span>
                  ${p.concession ? `<span class="block text-[9px] text-emerald-600 font-semibold">${p.concession}</span>` : ''}
                </td>
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

// ============================================================
// 9. BOOKING WIZARD CONTROLLER & CONCESSION PRICING ENGINE
// ============================================================

let wizardState = {
  step: 1,
  from: "Kolhapur CBS (Central Bus Stand)",
  to: "Ichalkaranji Central Stand",
  date: "",
  selectedBus: null,
  selectedSeats: ["14A"],
  passengers: [],
  totalBaseFare: 0,
  totalConcessionSavings: 0,
  gst: 0,
  finalTotal: 0
};

function setDefaultBookingDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const str = tomorrow.toISOString().split('T')[0];
  const dateInput = document.getElementById('book-date');
  if (dateInput) {
    dateInput.value = str;
    dateInput.min = new Date().toISOString().split('T')[0];
  }
  wizardState.date = str;
}

// Popular route chip click helper
function setRoute(from, to) {
  const fromEl = document.getElementById('book-from');
  const toEl = document.getElementById('book-to');
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
  wizardState.from = from;
  wizardState.to = to;
  showToast(`Route selected: ${from.split(' ')[0]} ➔ ${to.split(' ')[0]}`, 'info');
}

// Wizard step switcher with top progress indicators
function goToStep(stepNum) {
  wizardState.step = stepNum;

  for (let i = 1; i <= 5; i++) {
    const stepEl = document.getElementById(`wizard-step-${i}`);
    if (stepEl) {
      if (i === stepNum) {
        stepEl.classList.remove('hidden');
      } else {
        stepEl.classList.add('hidden');
      }
    }

    const dot = document.getElementById(`dot-${i}`);
    if (dot) {
      if (i < stepNum) {
        dot.className = "w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm border-4 border-white shadow-md";
        dot.innerHTML = `<i class="fa-solid fa-check text-xs"></i>`;
      } else if (i === stepNum) {
        dot.className = "w-10 h-10 rounded-full bg-msrtc-red text-white flex items-center justify-center font-bold text-sm border-4 border-white shadow-md ring-4 ring-red-100";
        dot.innerHTML = `${i}`;
      } else {
        dot.className = "w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm border-4 border-white shadow-md";
        dot.innerHTML = `${i}`;
      }
    }
  }

  const progressLine = document.getElementById('step-progress-line');
  if (progressLine) {
    const pct = ((stepNum - 1) / 4) * 100;
    progressLine.style.width = `${pct}%`;
  }

  window.scrollTo({ top: 100, behavior: 'smooth' });
}

// STEP 1 ➔ STEP 2: Search Bus Availability
function wizardSearchBuses() {
  const fromEl = document.getElementById('book-from');
  const toEl = document.getElementById('book-to');
  const dateEl = document.getElementById('book-date');

  const from = fromEl ? fromEl.value.trim() : '';
  const to = toEl ? toEl.value.trim() : '';
  const date = dateEl ? dateEl.value : '';

  if (!from || !to) {
    showToast('Please enter both Departure and Destination locations!', 'error');
    return;
  }
  if (from.toLowerCase() === to.toLowerCase()) {
    showToast('Departure and Destination cannot be the same!', 'error');
    return;
  }
  if (!date) {
    showToast('Please select your Travel Date!', 'error');
    return;
  }

  wizardState.from = from;
  wizardState.to = to;
  wizardState.date = date;

  const spinner = document.getElementById('search-spinner');
  if (spinner) spinner.classList.remove('hidden');

  setTimeout(() => {
    if (spinner) spinner.classList.add('hidden');
    renderWizardBusList();
    goToStep(2);
    showToast(`Found ${BUS_SCHEDULE_TEMPLATES.length} available buses!`, 'success');
  }, 400);
}

// STEP 2: Render buses with demand discounts
function renderWizardBusList() {
  const label = document.getElementById('step2-route-label');
  if (label) {
    const d = new Date(wizardState.date);
    const dateFormatted = isNaN(d) ? wizardState.date : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    label.innerHTML = `Available services for <b>${wizardState.from}</b> ➔ <b>${wizardState.to}</b> on <b>${dateFormatted}</b>`;
  }

  const container = document.getElementById('bus-results-list');
  if (!container) return;

  container.innerHTML = BUS_SCHEDULE_TEMPLATES.map(bus => {
    const fleet = MSRTC_FLEET[bus.busType] || { baseFarePerSeat: 150 };
    const basePrice = fleet.baseFarePerSeat;
    const discount = bus.discountPercent;
    const finalPrice = Math.round(basePrice * (1 - discount / 100));
    const savings = basePrice - finalPrice;

    const demandCfg = {
      LOW: {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
        label: "🔥 Low Demand (Save 20-30%)",
        bar: "bg-emerald-500",
        width: "25%",
        cardBorder: "border-emerald-300 hover:border-emerald-500 bg-emerald-50/20"
      },
      MEDIUM: {
        badge: "bg-blue-100 text-blue-800 border-blue-300",
        label: "⚡ Medium Demand",
        bar: "bg-blue-500",
        width: "60%",
        cardBorder: "border-blue-200 hover:border-blue-400 bg-white"
      },
      HIGH: {
        badge: "bg-rose-100 text-rose-800 border-rose-300",
        label: "🔴 High Demand (Fast Filling)",
        bar: "bg-rose-500",
        width: "90%",
        cardBorder: "border-slate-200 hover:border-msrtc-red bg-white"
      }
    };
    const cfg = demandCfg[bus.demand] || demandCfg.MEDIUM;

    const amenityChips = (bus.amenities || []).map(a =>
      `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">${a}</span>`
    ).join('');

    const discountPill = discount > 0 ? `
      <span class="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
        ${discount}% OFF
      </span>
    ` : '';

    return `
      <div class="border-2 ${cfg.cardBorder} rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer" onclick="chooseWizardBus('${bus.id}')">
        <div class="flex items-start gap-3.5 flex-1">
          <div class="w-11 h-11 rounded-xl bg-msrtc-red/10 text-msrtc-red flex items-center justify-center text-xl flex-shrink-0 mt-1">
            <i class="fa-solid fa-bus-simple"></i>
          </div>
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <h4 class="font-extrabold text-slate-900 text-base">${bus.busType}</h4>
              <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">${bus.busNumber}</span>
              <span class="text-[10px] font-bold border px-2 py-0.5 rounded-full ${cfg.badge}">${cfg.label}</span>
              ${discountPill}
            </div>

            <div class="flex items-center gap-4 text-xs text-slate-700 mb-2">
              <span class="font-extrabold text-sm text-slate-900">${bus.departure}</span>
              <span class="text-slate-400">➔ ${bus.duration} Express ➔</span>
              <span class="font-extrabold text-sm text-slate-900">${bus.arrival}</span>
            </div>

            <div class="flex flex-wrap gap-1.5 mb-2">${amenityChips}</div>

            <div class="max-w-xs">
              <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                <span>Occupancy</span>
                <span class="text-emerald-700 font-bold">${bus.availableSeats} seats left</span>
              </div>
              <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div class="${cfg.bar} h-full rounded-full" style="width: ${cfg.width}"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex-shrink-0">
          <div class="text-left sm:text-right">
            ${discount > 0 ? `
              <p class="text-xs line-through text-slate-400 font-medium">₹${basePrice}</p>
              <p class="text-2xl font-black text-emerald-700">₹${finalPrice}<span class="text-xs font-normal text-slate-500">/seat</span></p>
              <p class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">Save ₹${savings}/seat</p>
            ` : `
              <p class="text-[10px] text-slate-400 font-semibold uppercase">Regular Fare</p>
              <p class="text-2xl font-black text-slate-900">₹${basePrice}<span class="text-xs font-normal text-slate-500">/seat</span></p>
            `}
          </div>
          <button type="button" onclick="event.stopPropagation(); chooseWizardBus('${bus.id}')" class="mt-2 bg-msrtc-red hover:bg-msrtc-darkred text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-red-200">
            Select & Pick Seats <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// STEP 2 ➔ STEP 3: Choose bus & move to seat selection
function chooseWizardBus(busId) {
  const bus = BUS_SCHEDULE_TEMPLATES.find(b => b.id === busId);
  if (!bus) return;

  const fleet = MSRTC_FLEET[bus.busType] || { baseFarePerSeat: 150 };
  const basePrice = fleet.baseFarePerSeat;
  const discount = bus.discountPercent;
  const discountedPrice = Math.round(basePrice * (1 - discount / 100));

  wizardState.selectedBus = {
    ...bus,
    basePrice,
    discountedPrice
  };

  const strip = document.getElementById('step3-bus-strip');
  if (strip) {
    strip.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-msrtc-red text-white flex items-center justify-center font-bold text-xs"><i class="fa-solid fa-bus"></i></span>
        <div>
          <span class="font-bold text-slate-900">${bus.busType}</span>
          <span class="text-[10px] font-mono text-slate-500 ml-1">(${bus.busNumber})</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span>⏰ ${bus.departure} ➔ ${bus.arrival} (${bus.duration})</span>
        <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">₹${discountedPrice} / seat</span>
      </div>
    `;
  }

  if (!wizardState.selectedSeats || wizardState.selectedSeats.length === 0) {
    wizardState.selectedSeats = ["14A"];
  }
  currentSelectedSeats = [...wizardState.selectedSeats];

  renderInteractiveSeatCabin();
  goToStep(3);
  showToast(`Selected ${bus.busType}! Pick your seats.`, 'info');
}

// STEP 3 ➔ STEP 4: Confirm seats & open passenger details
function confirmSeatsGoStep4() {
  if (!currentSelectedSeats || currentSelectedSeats.length === 0) {
    showToast("Please select at least one seat to proceed!", "error");
    return;
  }
  wizardState.selectedSeats = [...currentSelectedSeats];
  renderWizardPassengerInputs();
  goToStep(4);
}

// ============================================================
// CONCESSION PRICING RULE:
// "if male ticket should be full else if female and age>60, age<5 half fare pricing"
// ============================================================
function calculatePassengerFare(gender, age, baseSeatPrice) {
  let isHalfFare = false;
  let reason = "Full Fare (Adult Male)";

  const numAge = parseInt(age, 10);

  if (!isNaN(numAge) && numAge < 5) {
    isHalfFare = true;
    reason = "50% Off (Child < 5 yrs)";
  } else if (!isNaN(numAge) && numAge >= 60) {
    isHalfFare = true;
    reason = "50% Off (Senior Citizen ≥ 60 yrs)";
  } else if (gender === 'Female') {
    isHalfFare = true;
    reason = "50% Off (Female Passenger Concession)";
  }

  const finalFare = isHalfFare ? Math.round(baseSeatPrice * 0.5) : baseSeatPrice;
  const savings = baseSeatPrice - finalFare;

  return { isHalfFare, finalFare, savings, reason };
}

// STEP 4: Render passenger input rows and calculate live breakdown
function renderWizardPassengerInputs() {
  const container = document.getElementById('passenger-inputs-container');
  if (!container) return;

  const count = wizardState.selectedSeats.length;
  const baseRate = wizardState.selectedBus ? wizardState.selectedBus.discountedPrice : 240;

  let html = '';
  for (let i = 1; i <= count; i++) {
    const seat = wizardState.selectedSeats[i - 1] || `${i}A`;
    const isSelf = (i === 1 && currentUser);
    const defaultName = isSelf ? currentUser.fullName : `Passenger ${i}`;
    const defaultAge = isSelf ? (currentUser.age || 29) : (i === 2 ? 54 : (25 + i * 4));
    const defaultGender = isSelf ? (currentUser.gender || 'Male') : (i === 2 ? 'Female' : 'Male');

    html += `
      <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl" id="passenger-card-${i}">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">${i}</span>
            Passenger ${i} ${isSelf ? '(Primary / Self)' : ''}
          </span>
          <span class="text-xs font-mono font-bold bg-msrtc-red text-white px-2.5 py-0.5 rounded-lg">
            Seat ${seat}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
          <div class="sm:col-span-2">
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input type="text" id="wiz-pass-name-${i}" value="${defaultName}" placeholder="Enter name"
              oninput="updateWizardFareBreakdown()"
              class="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:border-msrtc-red focus:outline-none">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age</label>
            <input type="number" id="wiz-pass-age-${i}" value="${defaultAge}" min="1" max="110"
              oninput="updateWizardFareBreakdown()"
              class="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:border-msrtc-red focus:outline-none">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
            <select id="wiz-pass-gender-${i}" onchange="updateWizardFareBreakdown()"
              class="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:border-msrtc-red focus:outline-none">
              <option value="Male" ${defaultGender === 'Male' ? 'selected' : ''}>Male (Full Fare)</option>
              <option value="Female" ${defaultGender === 'Female' ? 'selected' : ''}>Female (50% Off)</option>
              <option value="Other" ${defaultGender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <!-- Concession indicator badge for this passenger -->
        <div id="wiz-pass-concession-${i}" class="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  updateWizardFareBreakdown();
}

function updateWizardFareBreakdown() {
  const count = wizardState.selectedSeats.length;
  const baseRate = wizardState.selectedBus ? wizardState.selectedBus.discountedPrice : 240;

  let passengers = [];
  let totalBase = 0;
  let totalPayableNoGst = 0;
  let totalSavings = 0;

  for (let i = 1; i <= count; i++) {
    const seat = wizardState.selectedSeats[i - 1] || `${i}A`;
    const nameInput = document.getElementById(`wiz-pass-name-${i}`);
    const ageInput = document.getElementById(`wiz-pass-age-${i}`);
    const genderSelect = document.getElementById(`wiz-pass-gender-${i}`);

    const name = nameInput ? nameInput.value.trim() : `Passenger ${i}`;
    const age = ageInput ? parseInt(ageInput.value, 10) || 28 : 28;
    const gender = genderSelect ? genderSelect.value : 'Male';

    const { isHalfFare, finalFare, savings, reason } = calculatePassengerFare(gender, age, baseRate);

    passengers.push({
      seat,
      name,
      age,
      gender,
      baseFare: baseRate,
      isHalfFare,
      finalFare,
      savings,
      reason
    });

    totalBase += baseRate;
    totalPayableNoGst += finalFare;
    totalSavings += savings;

    const badgeEl = document.getElementById(`wiz-pass-concession-${i}`);
    if (badgeEl) {
      if (isHalfFare) {
        badgeEl.innerHTML = `
          <span class="text-emerald-700 font-bold flex items-center gap-1">
            <i class="fa-solid fa-circle-check text-emerald-500"></i> ${reason}
          </span>
          <span class="font-extrabold text-slate-800">
            <span class="line-through text-slate-400 font-normal mr-1.5">₹${baseRate}</span>
            <span class="text-emerald-700">₹${finalFare}</span>
          </span>
        `;
      } else {
        badgeEl.innerHTML = `
          <span class="text-slate-500 font-semibold flex items-center gap-1">
            <i class="fa-solid fa-mars text-blue-500"></i> Adult Male — Full Fare
          </span>
          <span class="font-extrabold text-slate-800">₹${finalFare}</span>
        `;
      }
    }
  }

  const gst = Math.round(totalPayableNoGst * 0.05);
  const finalTotal = totalPayableNoGst + gst;

  wizardState.passengers = passengers;
  wizardState.totalBaseFare = totalBase;
  wizardState.totalConcessionSavings = totalSavings;
  wizardState.gst = gst;
  wizardState.finalTotal = finalTotal;

  const box = document.getElementById('fare-breakdown-box');
  if (box) {
    box.innerHTML = `
      <div class="flex justify-between text-slate-600">
        <span>Standard Base Total (${count} Seat${count > 1 ? 's' : ''} @ ₹${baseRate})</span>
        <span class="font-semibold">₹${totalBase}</span>
      </div>
      ${totalSavings > 0 ? `
        <div class="flex justify-between text-emerald-700 font-semibold">
          <span><i class="fa-solid fa-tag mr-1"></i> Concession Savings (Female / Senior / Child)</span>
          <span>- ₹${totalSavings}</span>
        </div>
      ` : ''}
      <div class="flex justify-between text-slate-600">
        <span>GST & Surcharge (5%)</span>
        <span class="font-semibold">+ ₹${gst}</span>
      </div>
      <div class="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200 mt-1">
        <span>Total Fare Payable</span>
        <span class="text-lg text-msrtc-red">₹${finalTotal}</span>
      </div>
    `;
  }
}

// STEP 4 ➔ STEP 5: Validate and go to payment
function confirmPassengersGoStep5() {
  const count = wizardState.selectedSeats.length;
  for (let i = 1; i <= count; i++) {
    const nameInput = document.getElementById(`wiz-pass-name-${i}`);
    if (!nameInput || !nameInput.value.trim()) {
      showToast(`Please enter name for Passenger ${i}!`, "error");
      if (nameInput) nameInput.focus();
      return;
    }
  }

  updateWizardFareBreakdown();
  renderWizardPaymentSummary();
  goToStep(5);
}

// Quick add saved co-passenger
function addSavedCoPassenger(name, age, gender) {
  if (currentSelectedSeats.length < 6) {
    const availableSeatNames = ["01C", "02C", "03C", "04C", "05C", "06C", "07C", "01D", "02D", "03D"];
    const nextSeat = availableSeatNames.find(s => !currentSelectedSeats.includes(s)) || `0${currentSelectedSeats.length + 1}B`;
    currentSelectedSeats.push(nextSeat);
    wizardState.selectedSeats = [...currentSelectedSeats];
  }

  renderWizardPassengerInputs();

  const targetIndex = wizardState.selectedSeats.length;
  const nameInput = document.getElementById(`wiz-pass-name-${targetIndex}`);
  const ageInput = document.getElementById(`wiz-pass-age-${targetIndex}`);
  const genderInput = document.getElementById(`wiz-pass-gender-${targetIndex}`);
  if (nameInput) nameInput.value = name;
  if (ageInput) ageInput.value = age;
  if (genderInput) genderInput.value = gender;

  updateWizardFareBreakdown();
  showToast(`Added ${name} to Seat ${wizardState.selectedSeats[targetIndex - 1]}!`, "info");
}

// STEP 5: Payment summary & handling
function renderWizardPaymentSummary() {
  const container = document.getElementById('payment-summary');
  const bus = wizardState.selectedBus || {
    busType: "Shivshahi (AC Seater)",
    busNumber: "MH-09-EM-8834",
    departure: "07:15",
    arrival: "11:45",
    duration: "4h 30m"
  };

  const d = new Date(wizardState.date);
  const dateFormatted = isNaN(d) ? wizardState.date : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  if (container) {
    container.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
        <div>
          <span class="text-[10px] font-bold uppercase text-slate-400">Journey</span>
          <p class="font-extrabold text-slate-900 text-sm">${wizardState.from} ➔ ${wizardState.to}</p>
          <p class="text-xs text-slate-500 font-medium">📅 ${dateFormatted} • ⏰ ${bus.departure} to ${bus.arrival} (${bus.duration})</p>
        </div>
        <div class="sm:text-right">
          <span class="text-[10px] font-bold uppercase text-slate-400">Bus & Seats</span>
          <p class="font-extrabold text-slate-900 text-sm">${bus.busType}</p>
          <p class="text-xs text-msrtc-red font-bold font-mono">Seats: ${wizardState.selectedSeats.join(', ')}</p>
        </div>
      </div>

      <div class="mb-3">
        <span class="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Passengers (${wizardState.passengers.length})</span>
        <div class="space-y-1">
          ${wizardState.passengers.map(p => `
            <div class="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-100">
              <div>
                <b class="text-slate-800">${p.name}</b>
                <span class="text-[11px] text-slate-500">(${p.gender}, ${p.age}y) — Seat ${p.seat}</span>
              </div>
              <div class="text-right">
                <span class="font-bold text-slate-800">₹${p.finalFare}</span>
                ${p.isHalfFare ? `<span class="block text-[10px] text-emerald-600 font-semibold">${p.reason}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-600">
        <div class="flex justify-between">
          <span>Base Bus Tickets</span>
          <span>₹${wizardState.totalBaseFare}</span>
        </div>
        ${wizardState.totalConcessionSavings > 0 ? `
          <div class="flex justify-between text-emerald-700 font-semibold">
            <span>Concession Discount</span>
            <span>- ₹${wizardState.totalConcessionSavings}</span>
          </div>
        ` : ''}
        <div class="flex justify-between">
          <span>GST & Toll Fee (5%)</span>
          <span>+ ₹${wizardState.gst}</span>
        </div>
      </div>
    `;
  }

  const finalTotalEl = document.getElementById('final-total-display');
  if (finalTotalEl) {
    finalTotalEl.innerText = `₹${wizardState.finalTotal}`;
  }
}

// Payment method click & confirm
function handleWizardPayment(method) {
  const bus = wizardState.selectedBus || {
    busType: "Shivshahi (AC Seater)",
    busNumber: "MH-09-EM-8834",
    departure: "07:15",
    arrival: "11:45",
    duration: "4h 30m"
  };

  const newBooking = {
    bookingId: "MSRTC-2026-" + Math.floor(10000 + Math.random() * 90000),
    pnr: "PNR" + Math.floor(1000000 + Math.random() * 9000000),
    userId: currentUser ? currentUser.userId : "usr_guest",
    busDetails: {
      busNumber: bus.busNumber,
      busType: bus.busType,
      operator: "MSRTC State Express Division"
    },
    route: {
      from: wizardState.from,
      to: wizardState.to,
      departureTime: `${wizardState.date}T${bus.departure}:00+05:30`,
      arrivalTime: `${wizardState.date}T${bus.arrival}:00+05:30`,
      boardingPoint: `${wizardState.from} Express Bay`,
      duration: bus.duration
    },
    seats: [...wizardState.selectedSeats],
    passengers: wizardState.passengers.map(p => ({
      name: p.name,
      age: p.age,
      gender: p.gender,
      fare: p.finalFare,
      concession: p.reason
    })),
    fare: {
      baseFare: wizardState.totalBaseFare - wizardState.totalConcessionSavings,
      gst: wizardState.gst,
      totalAmount: wizardState.finalTotal,
      paymentMethod: method === 'UPI' ? 'UPI Instant Pay' : (method === 'Card' ? 'Debit/Credit Card' : 'Cash at Counter'),
      paymentStatus: 'PAID'
    },
    tripStatus: "UPCOMING",
    bookedAt: new Date().toISOString()
  };

  const bookings = getStoredBookings();
  bookings.unshift(newBooking);
  saveStoredBookings(bookings);

  showToast(`🎉 Booking Successful! PNR: ${newBooking.pnr}`, "success");

  goToStep(1);
  navigateTo('history');
  setTimeout(() => {
    openTicketModal(newBooking.bookingId);
  }, 400);
}

function quickBook(from, to, busType) {
  navigateTo('book');
  const fromEl = document.getElementById('book-from');
  const toEl = document.getElementById('book-to');
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
  goToStep(1);
  wizardSearchBuses();
}

// 10. TOAST SYSTEM
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

// 11. INITIALIZE ON DOM READY
document.addEventListener('DOMContentLoaded', () => {
  populateLocationDatalists();
  renderAuthSection();
  setDefaultBookingDate();
  renderInteractiveSeatCabin();
});
