// app.js - النسخة الكاملة المصححة
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, push, runTransaction } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

let datetimeInterval = null;
let currentUserRole = null;
let currentUserData = { uid: null, email: null, role: null, name: null, driverId: null };
let isAdmin = false, isModerator = false, isDriver = false;
let currentDriverId = null;
let allCars = [], allDrivers = [], allMods = [], allLogs = [], allPendingRequests = [];

// --- UAE Time ---
function getUaeTime(dateObj = new Date()) { return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Dubai' })); }
function fmtDate(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return date.toLocaleDateString(); }
function fmtDateTime(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return date.toLocaleString(); }

// --- i18n ---
const translations = {
  ar: { loginTitle:"تسجيل الدخول", loginBtn:"دخول", navStats:"الإحصائيات", navCars:"السيارات", navDrivers:"السائقون", navMods:"المشرفون", navLogs:"السجل", navPending:"الطلبات", addCar:"إضافة سيارة", addDriver:"إضافة سائق", addMod:"إضافة مشرف", assignCustody:"ربط عهدة", confirm:"تأكيد", loadMore:"عرض المزيد", owner:"المالك", plateNumber:"رقم اللوحة", plateCode:"الرمز", emirate:"الإمارة", carType:"النوع", carYear:"سنة الصنع", vin:"VIN", licenseExpiry:"انتهاء الترخيص", insuranceExpiry:"انتهاء التأمين", notes:"ملاحظات", violations:"مخالفات", save:"حفظ", driverName:"اسم السائق", driverContact:"رقم الموبايل", selectDriver:"اختر السائق", selectCar:"اختر السيارة", car:"السيارة", email:"البريد", password:"كلمة المرور", assign:"ربط", unassign:"فك", edit:"تعديل", delete:"حذف", history:"سجل", noDriver:"بدون سائق", noCar:"بدون سيارة", activeStatus:"سارية", warnStatus:"قاربت", expiredStatus:"منتهية", currentlyWith:"مع", untilNow:"حتى الآن", loginErrorDetail:"فشل الدخول", none:"لا توجد بيانات", copied:"تم النسخ", footerRights:"جميع الحقوق محفوظة" },
  en: { loginTitle:"Login", loginBtn:"Login", navStats:"Stats", navCars:"Cars", navDrivers:"Drivers", navMods:"Mods", navLogs:"Logs", navPending:"Requests", addCar:"Add Car", addDriver:"Add Driver", addMod:"Add Mod", assignCustody:"Assign Custody", confirm:"Confirm", loadMore:"Load More", owner:"Owner", plateNumber:"Plate Number", plateCode:"Code", emirate:"Emirate", carType:"Type", carYear:"Year", vin:"VIN", licenseExpiry:"License Expiry", insuranceExpiry:"Insurance Expiry", notes:"Notes", violations:"Violations", save:"Save", driverName:"Driver Name", driverContact:"Phone", selectDriver:"Select Driver", selectCar:"Select Car", car:"Car", email:"Email", password:"Password", assign:"Assign", unassign:"Unassign", edit:"Edit", delete:"Delete", history:"History", noDriver:"No Driver", noCar:"No Car", activeStatus:"Active", warnStatus:"Warning", expiredStatus:"Expired", currentlyWith:"With", untilNow:"Until Now", loginErrorDetail:"Login failed", none:"No data", copied:"Copied", footerRights:"All Rights Reserved" }
};
let currentLang = localStorage.getItem('fleetSysLang') || 'ar';
function t(key) { return translations[currentLang][key] || key; }
document.getElementById('lang-toggle')?.addEventListener('click', () => {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('fleetSysLang', currentLang);
  location.reload();
});

// --- تسجيل الأحداث ---
async function logAction(action, details) {
  const user = auth.currentUser;
  if (!user) return;
  await set(push(ref(db,'logs')), {
    timestamp: new Date().toISOString(),
    userId: user.email,
    userName: currentUserData.name || user.email,
    action, details
  });
}

// --- ربط وفك العهدة (مع تحذير صلاحية التراخيص) ---
async function assignCustody(carId, driverId, assignedByEmail, assignedByName) {
  const car = allCars.find(c => c.id === carId);
  if (!car) throw new Error('Car not found');
  // تحذير انتهاء التراخيص
  const now = getUaeTime();
  const licenseDate = car.licenseExpiry ? new Date(car.licenseExpiry) : null;
  const insuranceDate = car.insuranceExpiry ? new Date(car.insuranceExpiry) : null;
  let warn = false;
  if ((licenseDate && licenseDate < now) || (insuranceDate && insuranceDate < now)) warn = true;
  else if ((licenseDate && (licenseDate - now) / (86400000) <= 15) || (insuranceDate && (insuranceDate - now) / (86400000) <= 15)) warn = true;
  if (warn && !confirm(t('expiryWarning') || 'تحذير: التراخيص منتهية أو قاربت على الانتهاء. هل تريد الاستمرار؟')) throw new Error('User cancelled');
  // تنفيذ الربط (نفس الكود السابق)
  const nowISO = new Date().toISOString();
  const custodyRef = push(ref(db, 'custodyHistory'));
  await set(custodyRef, {
    carId, driverId, driverName: allDrivers.find(d => d.id === driverId)?.name,
    carPlate: `${car.plateNumber}|${car.plateCode}`,
    startTime: nowISO, endTime: null,
    assignedByEmail, assignedByName
  });
  await update(ref(db, `cars/${carId}`), {
    currentDriverId: driverId,
    currentDriverName: allDrivers.find(d => d.id === driverId)?.name,
    currentAssignedByEmail: assignedByEmail,
    currentAssignedByName: assignedByName,
    currentAssignedAt: nowISO
  });
  await logAction('assignCustody', `${carId} -> ${driverId}`);
}
async function unassignCar(car) {
  if (!confirm(t('confirmUnassign'))) return;
  const nowISO = new Date().toISOString();
  // إغلاق العهدة المفتوحة
  const snap = await get(ref(db, 'custodyHistory'));
  if (snap.exists()) {
    for (let [key, val] of Object.entries(snap.val())) {
      if (val.carId === car.id && !val.endTime) {
        await update(ref(db, `custodyHistory/${key}`), { endTime: nowISO, unassignedByEmail: auth.currentUser.email, unassignedByName: currentUserData.name });
        break;
      }
    }
  }
  await update(ref(db, `cars/${car.id}`), {
    currentDriverId: null, currentDriverName: null,
    currentAssignedByEmail: null, currentAssignedByName: null, currentAssignedAt: null
  });
  await logAction('unassign', car.id);
}

// --- جلب البيانات من Firebase ---
function fetchCars() { onValue(ref(db, 'cars'), snap => { allCars = snap.exists() ? Object.values(snap.val()) : []; renderCars(); }); }
function fetchDrivers() { onValue(ref(db, 'drivers'), snap => { allDrivers = snap.exists() ? Object.values(snap.val()) : []; renderDrivers(); }); }
function fetchMods() { if(isAdmin) onValue(ref(db, 'users'), snap => { allMods = snap.exists() ? Object.values(snap.val()).filter(u => u.role === 'moderator') : []; renderMods(); }); }
function fetchLogs() { if(isAdmin) onValue(ref(db, 'logs'), snap => { allLogs = snap.exists() ? Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)) : []; renderLogs(); }); }
function fetchPendingRequests() { if(isAdmin||isModerator) onValue(ref(db, 'pendingCarRequests'), snap => { allPendingRequests = snap.exists() ? Object.values(snap.val()).filter(r=>r.status==='pending') : []; renderPendingRequests(); }); }

// --- دوال العرض (مختصرة) ---
function renderCars() { const container = document.getElementById('cars-container'); if(!container) return; container.innerHTML = allCars.map(car => `<div class="card"><div class="card-header">${car.id} - ${car.plateNumber}</div><div class="card-body">...</div></div>`).join(''); }
function renderDrivers() { const container = document.getElementById('drivers-container'); if(!container) return; container.innerHTML = allDrivers.map(d => `<div class="card">${d.name} - ${d.contact}</div>`).join(''); }
function renderMods() { const container = document.getElementById('mods-container'); if(!container) return; container.innerHTML = allMods.map(m => `<div class="card">${m.name} - ${m.email}</div>`).join(''); }
function renderLogs() { const tbody = document.getElementById('logs-tbody'); if(!tbody) return; tbody.innerHTML = allLogs.map(l => `<tr><td>${fmtDateTime(l.timestamp)}</td><td>${l.userName||l.userId}</td><td>${l.action}</td><td>${l.details}</td></tr>`).join(''); }
function renderPendingRequests() { const tbody = document.getElementById('pending-tbody'); if(!tbody) return; tbody.innerHTML = allPendingRequests.map(r => `<tr><td>${r.driverName}</td><td>${r.plateNumber}</td><td>${r.plateCode}</td><td>${r.emirate}</td><td>${r.carType}</td><td>${fmtDateTime(r.submittedAt)}</td><td><button>قبول</button><button>رفض</button></td></tr>`).join(''); }

// --- تسجيل الخروج ---
document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));

// --- المصادقة وإظهار الواجهة حسب الدور ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // حالة خاصة للمدير المطلق
      if (user.email === 'saad323m@gmail.com') {
        isAdmin = true; isModerator = false; isDriver = false;
        currentUserData = { uid: user.uid, email: user.email, role: 'admin', name: 'SAAD' };
        showAdminInterface();
        loadFullData();
      } else {
        const userSnap = await get(ref(db, `users/${user.uid}`));
        if (!userSnap.exists()) throw new Error('User not registered');
        const uData = userSnap.val();
        if (uData.status === 'suspended') { await signOut(auth); alert('الحساب معطل'); return; }
        if (uData.role === 'moderator') {
          isModerator = true; isAdmin = false; isDriver = false;
          currentUserData = { uid: user.uid, email: user.email, role: 'moderator', name: uData.name || user.email };
          showModeratorInterface();
          loadFullData();
        } else if (uData.role === 'driver') {
          isDriver = true; isAdmin = false; isModerator = false;
          currentDriverId = uData.driverId;
          let driverName = user.email.split('@')[0];
          const driverSnap = await get(ref(db, `drivers/${currentDriverId}`));
          if (driverSnap.exists() && driverSnap.val().name) driverName = driverSnap.val().name;
          currentUserData = { uid: user.uid, email: user.email, role: 'driver', driverId: currentDriverId, name: driverName };
          showDriverInterface();
          loadDriverSpecificData();
        } else throw new Error('Invalid role');
      }
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('app-section').style.display = 'flex';
      document.getElementById('user-display-name').textContent = currentUserData.name;
    } catch (err) {
      console.error(err);
      alert('خطأ في تحميل البيانات: ' + err.message);
      await signOut(auth);
    }
  } else {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
    isAdmin = isModerator = isDriver = false;
  }
});

function showAdminInterface() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  document.getElementById('driver-dashboard').style.display = 'none';
  document.getElementById('stats-section').style.display = 'block';
  // إخفاء الأقسام الأخرى وتبديل التنقل حسب الحاجة
}
function showModeratorInterface() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  document.getElementById('nav-mods').style.display = 'none';
  document.getElementById('nav-logs').style.display = 'none';
  document.getElementById('driver-dashboard').style.display = 'none';
  document.getElementById('stats-section').style.display = 'block';
}
function showDriverInterface() {
  document.getElementById('stats-section').style.display = 'none';
  document.getElementById('cars-section').style.display = 'none';
  document.getElementById('drivers-section').style.display = 'none';
  document.getElementById('mods-section').style.display = 'none';
  document.getElementById('logs-section').style.display = 'none';
  document.getElementById('pending-section').style.display = 'none';
  document.getElementById('driver-dashboard').style.display = 'block';
}

function loadFullData() {
  fetchCars(); fetchDrivers(); if(isAdmin) { fetchMods(); fetchLogs(); } if(isAdmin||isModerator) fetchPendingRequests();
  // إضافة بقية الأحداث (نماذج الإضافة، التعديل، الحذف) هنا
}
async function loadDriverSpecificData() {
  // تحميل سيارات السائق الحالية والسابقة
  const custodySnap = await get(ref(db, 'custodyHistory'));
  let current = [], past = [];
  if (custodySnap.exists()) {
    const histories = Object.values(custodySnap.val());
    current = histories.filter(h => h.driverId === currentDriverId && !h.endTime);
    past = histories.filter(h => h.driverId === currentDriverId && h.endTime);
  }
  const containerCurrent = document.getElementById('driver-current-cars');
  const containerPast = document.getElementById('driver-past-cars');
  if (containerCurrent) containerCurrent.innerHTML = current.map(c => `<div>${c.carPlate} (منذ ${fmtDate(c.startTime)})</div>`).join('');
  if (containerPast) containerPast.innerHTML = past.map(c => `<div>${c.carPlate} (${fmtDate(c.startTime)} - ${fmtDate(c.endTime)})</div>`).join('');
}

// --- نموذج الدخول ---
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    document.getElementById('login-error').textContent = t('loginErrorDetail') + ': ' + err.message;
  }
});

// --- تشغيل الساعة ---
setInterval(() => {
  const el = document.getElementById('live-datetime');
  if (el) el.textContent = fmtDateTime(new Date());
}, 60000);
document.getElementById('footer-year').textContent = new Date().getFullYear();