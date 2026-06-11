import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBHHGY_gVpm3NlXThqsC6ojTL9Je4xQ9w",
  authDomain: "car-moving-8b59e.firebaseapp.com",
  databaseURL: "https://car-moving-8b59e-default-rtdb.firebaseio.com",
  projectId: "car-moving-8b59e",
  storageBucket: "car-moving-8b59e.firebasestorage.app",
  messagingSenderId: "332747318494",
  appId: "1:332747318494:web:d5d61cd53f322a182f0e4f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Navigation
const navCars = document.getElementById('nav-cars');
const navDrivers = document.getElementById('nav-drivers');
const carsSection = document.getElementById('cars-section');
const driversSection = document.getElementById('drivers-section');

// Modals & Forms
const carModal = document.getElementById('car-modal');
const carForm = document.getElementById('car-form');
const driverModal = document.getElementById('driver-modal');
const driverForm = document.getElementById('driver-form');
const custodyModal = document.getElementById('custody-modal');
const custodyForm = document.getElementById('custody-form');

// --- Auth Logic ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.style.display = 'none';
        appSection.style.display = 'flex';
        fetchCars();
        fetchDrivers();
    } else {
        loginSection.style.display = 'flex';
        appSection.style.display = 'none';
    }
});
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
    } catch (error) { loginError.textContent = "خطأ في البريد أو كلمة المرور"; }
});
logoutBtn.addEventListener('click', () => signOut(auth));

// --- Navigation Logic ---
navCars.addEventListener('click', (e) => { e.preventDefault(); showSection('cars'); });
navDrivers.addEventListener('click', (e) => { e.preventDefault(); showSection('drivers'); });

function showSection(section) {
    carsSection.style.display = section === 'cars' ? 'block' : 'none';
    driversSection.style.display = section === 'drivers' ? 'block' : 'none';
    navCars.classList.toggle('active', section === 'cars');
    navDrivers.classList.toggle('active', section === 'drivers');
}

// --- Generic Modal Logic ---
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).style.display = 'none');
});
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) event.target.style.display = 'none';
}

// --- Timezone & Status Logic ---
function getStatusClass(expiryDateStr) {
    if (!expiryDateStr) return '';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const expiry = new Date(expiryDateStr);
    now.setHours(0,0,0,0); expiry.setHours(0,0,0,0);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'status-red';
    if (diffDays <= 15) return 'status-yellow';
    return 'status-green';
}

function formatDate(dateStr) {
    if(!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG');
}

// ==========================================
// ========= CARS LOGIC (PHASE 5) ==========
// ==========================================
document.getElementById('add-car-btn').addEventListener('click', () => openCarModal());

async function generateCarId() {
    const counterRef = ref(db, 'counters/carsCount');
    const newCount = await runTransaction(counterRef, (currentCount) => (currentCount || 0) + 1);
    return `UAE_${String(newCount.snapshot.val()).padStart(3, '0')}`;
}

function openCarModal(carData = null) {
    carForm.reset();
    document.getElementById('car-id-hidden').value = '';
    document.getElementById('car-modal-title').textContent = carData ? "تعديل بيانات السيارة" : "إضافة سيارة جديدة";
    if (carData) {
        document.getElementById('car-id-hidden').value = carData.id;
        document.getElementById('plate-number').value = carData.plateNumber;
        document.getElementById('plate-code').value = carData.plateCode;
        document.getElementById('emirate').value = carData.emirate;
        document.getElementById('owner').value = carData.owner;
        document.getElementById('car-type').value = carData.type;
        document.getElementById('car-year').value = carData.year;
        document.getElementById('vin').value = carData.vin;
        document.getElementById('license-expiry').value = carData.licenseExpiry;
        document.getElementById('insurance-expiry').value = carData.insuranceExpiry;
        document.getElementById('car-notes').value = carData.notes || '';
        document.getElementById('violations').value = carData.violations || '';
    }
    carModal.style.display = 'block';
}

carForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "جاري الحفظ...";

    const hiddenId = document.getElementById('car-id-hidden').value;
    const vinInput = document.getElementById('vin').value.trim();
    const plateNumInput = document.getElementById('plate-number').value.trim();
    const plateCodeInput = document.getElementById('plate-code').value.trim();
    const emirateInput = document.getElementById('emirate').value.trim();

    try {
        const snapshot = await get(ref(db, 'cars'));
        if (snapshot.exists()) {
            const cars = snapshot.val();
            for (let key in cars) {
                if (key === hiddenId) continue;
                if (cars[key].vin === vinInput) { alert("خطأ: رقم القاعدة (VIN) مسجل مسبقاً!"); submitBtn.disabled = false; submitBtn.textContent = "حفظ البيانات"; return; }
                if (cars[key].plateNumber === plateNumInput && cars[key].plateCode === plateCodeInput && cars[key].emirate === emirateInput) { alert("خطأ: هذه اللوحة مسجلة مسبقاً!"); submitBtn.disabled = false; submitBtn.textContent = "حفظ البيانات"; return; }
            }
        }

        const carData = {
            plateNumber: plateNumInput, plateCode: plateCodeInput, emirate: emirateInput,
            owner: document.getElementById('owner').value.trim(),
            type: document.getElementById('car-type').value.trim(),
            year: document.getElementById('car-year').value.trim(),
            vin: vinInput,
            licenseExpiry: document.getElementById('license-expiry').value,
            insuranceExpiry: document.getElementById('insurance-expiry').value,
            notes: document.getElementById('car-notes').value.trim(),
            violations: document.getElementById('violations').value.trim(),
            currentDriverId: null, currentDriverName: null
        };

        if (hiddenId) {
            const existingCar = (await get(ref(db, `cars/${hiddenId}`))).val();
            carData.currentDriverId = existingCar.currentDriverId || null;
            carData.currentDriverName = existingCar.currentDriverName || null;
            await update(ref(db, `cars/${hiddenId}`), carData);
        } else {
            const newId = await generateCarId();
            carData.id = newId;
            await set(ref(db, `cars/${newId}`), carData);
        }
        carModal.style.display = 'none';
    } catch (error) { alert("خطأ: " + error.message); }
    finally { submitBtn.disabled = false; submitBtn.textContent = "حفظ البيانات"; }
});

async function deleteCar(carId) {
    if(confirm(`هل أنت متأكد من حذف السيارة ${carId}؟`)) {
        await remove(ref(db, `cars/${carId}`));
    }
}

function fetchCars() {
    onValue(ref(db, 'cars'), (snapshot) => {
        const container = document.getElementById('cars-container');
        container.innerHTML = '';
        if (snapshot.exists()) {
            Object.values(snapshot.val()).forEach(car => container.appendChild(createCarCard(car)));
        } else { container.innerHTML = '<p>لا توجد سيارات مسجلة.</p>'; }
    });
}

function createCarCard(car) {
    const licenseStatus = getStatusClass(car.licenseExpiry);
    const insuranceStatus = getStatusClass(car.insuranceExpiry);
    let cardStatus = 'status-green';
    if (licenseStatus === 'status-red' || insuranceStatus === 'status-red') cardStatus = 'status-red';
    else if (licenseStatus === 'status-yellow' || insuranceStatus === 'status-yellow') cardStatus = 'status-yellow';

    const card = document.createElement('div');
    card.className = `card ${cardStatus}`;
    card.innerHTML = `
        <div class="card-header">
            <div>
                <div class="card-title">${car.id}</div>
                <div class="plate-design">
                    <span class="plate-number">${car.plateNumber}</span>
                    <span class="plate-code">| ${car.plateCode}</span>
                    <span class="plate-emirate">${car.emirate}</span>
                </div>
            </div>
            <div style="text-align:left;">
                <div style="font-weight:bold;">${car.owner}</div>
                ${car.currentDriverName ? `<div class="custody-badge"><i class="fas fa-user"></i> ${car.currentDriverName}</div>` : '<small style="color:#888;">بدون سائق</small>'}
            </div>
        </div>
        <div class="card-body">
            <p><strong>النوع:</strong> ${car.type} | <strong>السنة:</strong> ${car.year}</p>
            <p><strong>القاعدة:</strong> ${car.vin}</p>
            <p><strong>ترخيص:</strong> ${formatDate(car.licenseExpiry)} <span style="color:var(--${cardStatus === 'status-green' ? 'green' : cardStatus === 'status-yellow' ? 'yellow' : 'red'})">●</span></p>
            <p><strong>تأمين:</strong> ${formatDate(car.insuranceExpiry)} <span style="color:var(--${cardStatus === 'status-green' ? 'green' : cardStatus === 'status-yellow' ? 'yellow' : 'red'})">●</span></p>
            ${car.notes ? `<p><strong>ملاحظات:</strong> ${car.notes}</p>` : ''}
            ${car.violations ? `<p style="color:var(--red);"><strong>مخالفات:</strong> ${car.violations}</p>` : ''}
            <div class="card-actions">
                ${!car.currentDriverId ? `<button class="btn-action assign-btn" style="background:var(--primary-dark);"><i class="fas fa-link"></i> ربط بسائق</button>` : `<button class="btn-action unassign-btn" style="background:var(--yellow); color:#333;"><i class="fas fa-unlink"></i> فك الربط</button>`}
                <button class="btn-action edit-btn" style="background:#5a6268;"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn-action delete-btn" style="background:var(--red);"><i class="fas fa-trash"></i> حذف</button>
            </div>
        </div>
    `;

    card.querySelector('.card-header').addEventListener('click', () => card.classList.toggle('expanded'));
    card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openCarModal(car); });
    card.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteCar(car.id); });
    
    if (car.currentDriverId) {
        card.querySelector('.unassign-btn').addEventListener('click', (e) => { e.stopPropagation(); unassignDriver(car); });
    } else {
        card.querySelector('.assign-btn').addEventListener('click', (e) => { e.stopPropagation(); openCustodyModal(car); });
    }

    return card;
}

// ==========================================
// ======= DRIVERS LOGIC (PHASE 6) =========
// ==========================================
document.getElementById('add-driver-btn').addEventListener('click', () => openDriverModal());

function openDriverModal(driverData = null) {
    driverForm.reset();
    document.getElementById('driver-id-hidden').value = '';
    document.getElementById('driver-modal-title').textContent = driverData ? "تعديل بيانات السائق" : "إضافة سائق جديد";
    if (driverData) {
        document.getElementById('driver-id-hidden').value = driverData.id;
        document.getElementById('driver-name').value = driverData.name;
        document.getElementById('driver-contact').value = driverData.contact;
        document.getElementById('driver-notes').value = driverData.notes || '';
    }
    driverModal.style.display = 'block';
}

driverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "جاري الحفظ...";

    const hiddenId = document.getElementById('driver-id-hidden').value;
    const driverData = {
        name: document.getElementById('driver-name').value.trim(),
        contact: document.getElementById('driver-contact').value.trim(),
        notes: document.getElementById('driver-notes').value.trim(),
        currentCarId: null, currentCarPlate: null
    };

    try {
        if (hiddenId) {
            const existing = (await get(ref(db, `drivers/${hiddenId}`))).val();
            driverData.currentCarId = existing.currentCarId || null;
            driverData.currentCarPlate = existing.currentCarPlate || null;
            await update(ref(db, `drivers/${hiddenId}`), driverData);
        } else {
            const newDriverRef = push(ref(db, 'drivers'));
            driverData.id = newDriverRef.key;
            await set(newDriverRef, driverData);
        }
        driverModal.style.display = 'none';
    } catch(error) { alert("خطأ: " + error.message); }
    finally { submitBtn.disabled = false; submitBtn.textContent = "حفظ البيانات"; }
});

async function deleteDriver(driverId, currentCarId) {
    if(currentCarId) { alert("لا يمكن حذف السائق وهو مرتبط بسيارة. قم بفك الربط أولاً."); return; }
    if(confirm("هل أنت متأكد من حذف هذا السائق؟")) { await remove(ref(db, `drivers/${driverId}`)); }
}

function fetchDrivers() {
    onValue(ref(db, 'drivers'), (snapshot) => {
        const container = document.getElementById('drivers-container');
        container.innerHTML = '';
        if (snapshot.exists()) {
            Object.values(snapshot.val()).forEach(driver => container.appendChild(createDriverCard(driver)));
        } else { container.innerHTML = '<p>لا يوجد سائقون مسجلون.</p>'; }
    });
}

function createDriverCard(driver) {
    const card = document.createElement('div');
    card.className = 'card status-green'; // Drivers always green border for now
    card.innerHTML = `
        <div class="card-header">
            <div>
                <div class="card-title"><i class="fas fa-user"></i> ${driver.name}</div>
                <div style="font-size:14px; color:#666;"><i class="fas fa-phone"></i> ${driver.contact}</div>
            </div>
            <div style="text-align:left;">
                ${driver.currentCarPlate ? `<div class="custody-badge"><i class="fas fa-car"></i> ${driver.currentCarPlate}</div>` : '<small style="color:#888;">بدون عهدة</small>'}
            </div>
        </div>
        <div class="card-body">
            ${driver.notes ? `<p><strong>ملاحظات:</strong> ${driver.notes}</p>` : ''}
            <div class="card-actions">
                <button class="btn-action edit-btn" style="background:#5a6268;"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn-action delete-btn" style="background:var(--red);"><i class="fas fa-trash"></i> حذف</button>
            </div>
        </div>
    `;

    card.querySelector('.card-header').addEventListener('click', () => card.classList.toggle('expanded'));
    card.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openDriverModal(driver); });
    card.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteDriver(driver.id, driver.currentCarId); });

    return card;
}

// ==========================================
// ====== CUSTODY LOGIC (PHASE 6 CONT) =====
// ==========================================
async function openCustodyModal(car) {
    document.getElementById('custody-car-id').value = car.id;
    document.getElementById('custody-car-display').value = `${car.plateNumber} | ${car.plateCode} - ${car.emirate}`;
    
    const select = document.getElementById('custody-driver-select');
    select.innerHTML = '<option value="">-- اختر سائق متاح --</option>';
    
    const snapshot = await get(ref(db, 'drivers'));
    if(snapshot.exists()) {
        Object.values(snapshot.val()).forEach(driver => {
            if(!driver.currentCarId) { // Only show available drivers
                const opt = document.createElement('option');
                opt.value = driver.id;
                opt.textContent = `${driver.name} (${driver.contact})`;
                select.appendChild(opt);
            }
        });
    }
    custodyModal.style.display = 'block';
}

custodyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const carId = document.getElementById('custody-car-id').value;
    const driverId = document.getElementById('custody-driver-select').value;
    if(!driverId) { alert("الرجاء اختيار سائق"); return; }

    try {
        const carSnap = await get(ref(db, `cars/${carId}`));
        const driverSnap = await get(ref(db, `drivers/${driverId}`));
        const carData = carSnap.val();
        const driverData = driverSnap.val();

        const now = new Date().toISOString();

        // 1. Update Car
        await update(ref(db, `cars/${carId}`), { currentDriverId: driverId, currentDriverName: driverData.name });

        // 2. Update Driver
        const plateStr = `${carData.plateNumber}|${carData.plateCode}`;
        await update(ref(db, `drivers/${driverId}`), { currentCarId: carId, currentCarPlate: plateStr });

        // 3. Log to Custody History
        const historyRef = push(ref(db, 'custodyHistory'));
        await set(historyRef, {
            carId: carId, driverId: driverId, startTime: now, endTime: null
        });

        custodyModal.style.display = 'none';
    } catch(error) { alert("خطأ في ربط العهدة: " + error.message); }
});

async function unassignDriver(car) {
    if(!confirm(`هل تريد فك ربط السيارة ${car.id} من السائق ${car.currentDriverName}؟`)) return;

    try {
        // 1. Find active history record
        const histSnap = await get(ref(db, 'custodyHistory'));
        let activeHistKey = null;
        if(histSnap.exists()) {
            histSnap.forEach(child => {
                if(child.val().carId === car.id && !child.val().endTime) activeHistKey = child.key;
            });
        }

        const now = new Date().toISOString();

        // 2. End history record
        if(activeHistKey) await update(ref(db, `custodyHistory/${activeHistKey}`), { endTime: now });

        // 3. Clear car
        await update(ref(db, `cars/${car.id}`), { currentDriverId: null, currentDriverName: null });

        // 4. Clear driver
        await update(ref(db, `drivers/${car.currentDriverId}`), { currentCarId: null, currentCarPlate: null });

    } catch(error) { alert("خطأ في فك الربط: " + error.message); }
}

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(err => console.log(err)));
}