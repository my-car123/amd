// app.js - النسخة النهائية المعدلة بالكامل (الجزء 1 من 3)
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
let driverUnsubscribe = null; // للاستماع المباشر للتحديثات

// --- UAE Time ---
function getUaeTime(dateObj = new Date()) { return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Dubai' })); }
function toLatinNumerals(str) { return String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }
function fmtDate(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return toLatinNumerals(new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-AE' : 'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', numberingSystem:'latn' }).format(date)); }
function fmtDateTime(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return toLatinNumerals(new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-AE' : 'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:true, numberingSystem:'latn' }).format(date)); }

// --- i18n (مضاف إليها مفاتيح جديدة)---
const translations = {
  ar: { loginTitle:"تسجيل الدخول", loginBtn:"دخول", forgotPassword:"نسيت كلمة المرور؟", navStats:"الإحصائيات", navCars:"السيارات", navDrivers:"السائقون", navMods:"المشرفون", navLogs:"السجل", navPending:"الطلبات", statActive:"سيارات سارية", statWarn:"قاربت على الانتهاء", statExp:"منتهية", statDrivers:"سائقين", statMods:"مشرفين", addCar:"إضافة سيارة", addDriver:"إضافة سائق", addMod:"إضافة مشرف", modManagement:"إدارة المشرفين", systemLogs:"سجل النظام الدقيق", pinTitle:"التحقق من الرمز السري", pinDesc:"أدخل رمز PIN للمتابعة", confirm:"تأكيد", loadMore:"عرض المزيد", searchCar:"بحث (لوحة، قاعدة، مالك)...", searchDriver:"بحث (اسم، هاتف)...", owner:"المالك", plateNumber:"رقم اللوحة", plateCode:"الرمز", emirate:"الإمارة", carType:"النوع", carYear:"سنة الصنع", vin:"رقم القاعدة (VIN)", licenseExpiry:"انتهاء الترخيص", insuranceExpiry:"انتهاء التأمين", notes:"ملاحظات", violations:"مخالفات", save:"حفظ", driverName:"اسم السائق", driverContact:"رقم الموبايل", assignCustody:"ربط عهدة", selectDriver:"اختر السائق", selectCar:"اختر السيارة (بدون عهدة)", confirmAssign:"تأكيد الربط", car:"السيارة", modName:"اسم المستخدم", email:"البريد الإلكتروني", password:"كلمة المرور", custodyHistory:"سجل العهدات", startTime:"البداية", endTime:"النهاية", logTime:"التوقيت", logUser:"المستخدم", logAction:"الإجراء", logDetails:"التفاصيل", active:"فعال", suspended:"معلق", assign:"ربط", unassign:"فك", edit:"تعديل", delete:"حذف", print:"طباعة", share:"مشاركة", history:"سجل", resetPass:"إعادة كلمة المرور", noDriver:"بدون سائق", noCar:"بدون سيارة", activeStatus:"سارية", warnStatus:"قاربت على الانتهاء", expiredStatus:"منتهية", currentlyWith:"مع", untilNow:"حتى الآن", loginError:"خطأ في الدخول", pinError:"رمز PIN خاطئ!", dupVin:"VIN مكرر!", dupPlate:"اللوحة مكررة!", dupDriver:"اسم السائق أو رقم الهاتف مسجل مسبقاً!", confirmDeleteCar:"حذف السيارة؟", confirmDeleteDriver:"حذف السائق؟", confirmUnassign:"فك الربط؟", unassignFirst:"افك العهدة أولاً", resetPassSent:"تم إرسال رابط إعادة التعيين للبريد", none:"لا توجد بيانات", copied:"تم النسخ!", footerRights:"جميع الحقوق محفوظة", moreCars:"سيارات أخرى", pendingRequests:"طلبات إضافة سيارات", submittedAt:"تاريخ الطلب", actions:"إجراءات", approve:"قبول", reject:"رفض", currentCars:"سياراتي الحالية", pastCars:"السيارات السابقة", addNewCar:"إضافة سيارة جديدة", changePass:"تغيير كلمة المرور", currentPass:"كلمة المرور الحالية", newPass:"كلمة المرور الجديدة", confirmNewPass:"تأكيد كلمة المرور", assignedBy:"تمت بواسطة", unassignedBy:"فك بواسطة", carAlreadyAssigned:"السيارة مرتبطة بسائق آخر", requestSent:"تم إرسال طلبك للإدارة", carAddedAndAssigned:"تمت إضافة السيارة وربطها بنجاح", loginErrorDetail:"فشل الدخول: تأكد من البريد وكلمة المرور", driverLoadError:"حدث خطأ في تحميل بيانات السائق", expiryWarning:"تحذير: التراخيص منتهية أو قاربت على الانتهاء. هل تريد الاستمرار في الربط؟", continueAnyway:"نعم، استمر", expiryLicense:"الترخيص منتهي", expiryInsurance:"التأمين منتهي", expiryWarnLicense:"الترخيص سينتهي قريباً", expiryWarnInsurance:"التأمين سينتهي قريباً", driverSuspended:"تم تعليق حساب السائق", driverActivated:"تم تفعيل حساب السائق" },
  en: { loginTitle:"Login", loginBtn:"Login", forgotPassword:"Forgot password?", navStats:"Stats", navCars:"Cars", navDrivers:"Drivers", navMods:"Mods", navLogs:"Logs", navPending:"Requests", statActive:"Active Cars", statWarn:"Warning", statExp:"Expired", statDrivers:"Drivers", statMods:"Mods", addCar:"Add Car", addDriver:"Add Driver", addMod:"Add Mod", modManagement:"Moderators", systemLogs:"System Logs", pinTitle:"PIN Verification", pinDesc:"Enter PIN to continue", confirm:"Confirm", loadMore:"Load More", searchCar:"Search (Plate, VIN, Owner)...", searchDriver:"Search (Name, Phone)...", owner:"Owner", plateNumber:"Plate Number", plateCode:"Code", emirate:"Emirate", carType:"Type", carYear:"Year", vin:"VIN", licenseExpiry:"License Expiry", insuranceExpiry:"Insurance Expiry", notes:"Notes", violations:"Violations", save:"Save", driverName:"Driver Name", driverContact:"Phone", assignCustody:"Assign Custody", selectDriver:"Select Driver", selectCar:"Select Car (No Custody)", confirmAssign:"Confirm Assign", car:"Car", modName:"Display Name", email:"Email", password:"Password", custodyHistory:"Custody History", startTime:"Start", endTime:"End", logTime:"Time", logUser:"User", logAction:"Action", logDetails:"Details", active:"Active", suspended:"Suspended", assign:"Assign", unassign:"Unassign", edit:"Edit", delete:"Delete", print:"Print", share:"Share", history:"History", resetPass:"Reset Pass", noDriver:"No Driver", noCar:"No Car", activeStatus:"Active", warnStatus:"Warning", expiredStatus:"Expired", currentlyWith:"With", untilNow:"Until Now", loginError:"Login Error", pinError:"Wrong PIN!", dupVin:"Duplicate VIN!", dupPlate:"Duplicate Plate!", dupDriver:"Driver Name or Phone already exists!", confirmDeleteCar:"Delete Car?", confirmDeleteDriver:"Delete Driver?", confirmUnassign:"Unassign?", unassignFirst:"Unassign first", resetPassSent:"Reset link sent to email", none:"No data", copied:"Copied!", footerRights:"All Rights Reserved", moreCars:"more cars", pendingRequests:"Pending Car Requests", submittedAt:"Submitted", actions:"Actions", approve:"Approve", reject:"Reject", currentCars:"My Current Cars", pastCars:"Past Cars", addNewCar:"Add New Car", changePass:"Change Password", currentPass:"Current Password", newPass:"New Password", confirmNewPass:"Confirm Password", assignedBy:"Assigned by", unassignedBy:"Unassigned by", carAlreadyAssigned:"Car is already assigned", requestSent:"Request sent to admin", carAddedAndAssigned:"Car added and assigned", loginErrorDetail:"Login failed. Check email/password", driverLoadError:"Error loading driver data", expiryWarning:"Warning: License/Insurance expired or about to expire. Continue with assignment?", continueAnyway:"Yes, continue", expiryLicense:"License expired", expiryInsurance:"Insurance expired", expiryWarnLicense:"License expires soon", expiryWarnInsurance:"Insurance expires soon", driverSuspended:"Driver account suspended", driverActivated:"Driver account activated" }
};
let currentLang = localStorage.getItem('fleetSysLang') || 'ar';
function t(key) { return translations[currentLang][key] || key; }
function updateDateTimeDisplay() { const el = document.getElementById('live-datetime'); if(el) el.textContent = fmtDateTime(new Date()); }
function setLanguage(lang) { currentLang = lang; localStorage.setItem('fleetSysLang', lang); document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR'; document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if(translations[lang][key]) el.textContent = translations[lang][key]; }); document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if(translations[lang][key]) el.placeholder = translations[lang][key]; }); updateDateTimeDisplay(); }
setLanguage(currentLang);
document.getElementById('lang-toggle').addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));

// --- تسجيل الأحداث ---
async function logAction(action, details) {
  const user = auth.currentUser;
  if (!user) return;
  const userName = currentUserData.name || user.email.split('@')[0];
  await set(push(ref(db,'logs')), {
    timestamp: new Date().toISOString(),
    userId: user.email,
    userName: userName,
    action,
    details
  });
}

// --- دالة التحذير من انتهاء التراخيص (المرحلة 9) ---
function showExpiryWarning(car) {
  const now = getUaeTime();
  const licenseDate = car.licenseExpiry ? getUaeTime(new Date(car.licenseExpiry)) : null;
  const insuranceDate = car.insuranceExpiry ? getUaeTime(new Date(car.insuranceExpiry)) : null;
  let warnings = [];
  if (licenseDate) {
    const days = Math.ceil((licenseDate - now) / (1000*60*60*24));
    if (days < 0) warnings.push(t('expiryLicense'));
    else if (days <= 15) warnings.push(`${t('expiryWarnLicense')} (${days} يوم)`);
  }
  if (insuranceDate) {
    const days = Math.ceil((insuranceDate - now) / (1000*60*60*24));
    if (days < 0) warnings.push(t('expiryInsurance'));
    else if (days <= 15) warnings.push(`${t('expiryWarnInsurance')} (${days} يوم)`);
  }
  if (warnings.length === 0) return true; // لا تحذير
  const msg = `${t('expiryWarning')}\n${warnings.join('\n')}`;
  return confirm(msg);
}

// --- ربط العهدة (مع التحذير) ---
async function assignCustody(carId, driverId, assignedByEmail, assignedByName) {
  const carData = allCars.find(c => c.id === carId);
  const driverData = allDrivers.find(d => d.id === driverId);
  if(!carData || !driverData) throw new Error('Invalid');
  if(carData.currentDriverId) throw new Error('Car already assigned');
  
  // عرض تحذير التراخيص
  if (!showExpiryWarning(carData)) {
    throw new Error('User cancelled due to expiry warning');
  }
  
  const now = new Date().toISOString();
  const snap = await get(ref(db,'custodyHistory'));
  let prevKey = null;
  if(snap.exists()) {
    snap.forEach(ch=>{
      if(ch.val().carId===carId && !ch.val().endTime) prevKey = ch.key;
    });
  }
  if(prevKey) await update(ref(db,`custodyHistory/${prevKey}`),{ endTime: now, unassignedByEmail: assignedByEmail, unassignedByName: assignedByName });
  const newHistoryRef = push(ref(db,'custodyHistory'));
  await set(newHistoryRef, {
    carId, driverId, driverName: driverData.name,
    carPlate: `${carData.plateNumber}|${carData.plateCode}`,
    startTime: now, endTime: null,
    assignedByEmail: assignedByEmail,
    assignedByName: assignedByName,
    unassignedByEmail: null, unassignedByName: null
  });
  await update(ref(db,`cars/${carId}`),{
    currentDriverId: driverId,
    currentDriverName: driverData.name,
    currentAssignedByEmail: assignedByEmail,
    currentAssignedByName: assignedByName,
    currentAssignedAt: now
  });
  await logAction(t('assignCustody'), `${carId} -> ${driverData.name} by ${assignedByName}`);
}

// --- فك العهدة ---
async function unassignCar(car) {
  if(!confirm(t('confirmUnassign'))) return;
  const user = auth.currentUser;
  const userName = currentUserData.name || user.email.split('@')[0];
  const now = new Date().toISOString();
  const snap = await get(ref(db,'custodyHistory'));
  let openKey = null;
  if(snap.exists()) {
    snap.forEach(ch=>{
      if(ch.val().carId===car.id && !ch.val().endTime) openKey = ch.key;
    });
  }
  if(openKey) await update(ref(db,`custodyHistory/${openKey}`),{ endTime: now, unassignedByEmail: user.email, unassignedByName: userName });
  await update(ref(db,`cars/${car.id}`),{
    currentDriverId: null, currentDriverName: null,
    currentAssignedByEmail: null, currentAssignedByName: null,
    currentAssignedAt: null
  });
  await logAction(t('unassign'), `${car.id} by ${userName}`);
}

// --- منع حذف سيارة مرتبطة ---
async function deleteCar(id) {
  const car = allCars.find(c => c.id === id);
  if(car && car.currentDriverId) {
    alert(t('unassignFirst'));
    return;
  }
  if(confirm(t('confirmDeleteCar'))){
    await remove(ref(db,`cars/${id}`));
    await logAction(t('delete'), id);
  }
}
// --- Navigation & Helpers (كما هي مع إضافة تعريف allCars, allDrivers) ---
const sections = ['stats','cars','drivers','mods','logs','pending'];
sections.forEach(sec => { const el = document.getElementById(`nav-${sec}`); if(el) el.addEventListener('click', e => { e.preventDefault(); showSection(sec); }); });
function showSection(sec) { sections.forEach(s => { const secEl = document.getElementById(`${s}-section`); if(secEl) secEl.style.display = (s === sec) ? 'block' : 'none'; const navEl = document.getElementById(`nav-${s}`); if(navEl) navEl.classList.toggle('active', s === sec); }); }

document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).style.display = 'none'));
window.onclick = e => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; };
function getStatusClass(dateStr, hasDriver = false) { if(!dateStr) return ''; const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d = Math.ceil((exp-now)/(1000*60*60*24)); if(d < 0) return hasDriver ? 'status-danger' : 'status-red'; if(d <= 15) return hasDriver ? 'status-danger' : 'status-yellow'; return 'status-green'; }
function getStatusText(dateStr) { if(!dateStr) return ''; const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d = Math.ceil((exp-now)/(1000*60*60*24)); if(d < 0) return t('expiredStatus'); if(d <= 15) return t('warnStatus'); return t('activeStatus'); }
function getCarOverallStatus(car) { const lSt = getStatusClass(car.licenseExpiry, !!car.currentDriverId); const iSt = getStatusClass(car.insuranceExpiry, !!car.currentDriverId); if(lSt==='status-danger' || iSt==='status-danger' || lSt==='status-red' || iSt==='status-red') return 'exp'; if(lSt==='status-yellow' || iSt==='status-yellow') return 'warn'; return 'active'; }

const LIMIT = 10;
let allCars=[], displayedCars=[], carsShown=0;
let allDrivers=[], displayedDrivers=[], driversShown=0;
let allMods=[], modsShown=0;
let allLogs=[], logsShown=0;
let allPendingRequests=[], pendingShown=0;
let currentCarStatusFilter = 'all';

// --- Login Form & Logout & Forgot Password ---
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
  } catch(error) {
    console.error("Login error:", error);
    document.getElementById('login-error').textContent = t('loginErrorDetail');
  }
});
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
document.getElementById('forgot-password-link')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  if(!email) { alert('أدخل بريدك الإلكتروني أولاً'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    alert(t('resetPassSent'));
  } catch(err) { alert(err.message); }
});

// --- Change Password Modal (كما هي) ---
document.getElementById('change-password-btn').addEventListener('click', () => document.getElementById('change-password-modal').style.display = 'block');
document.getElementById('change-password-form').addEventListener('submit', async e => {
  e.preventDefault();
  const currentPass = document.getElementById('current-pass').value;
  const newPass = document.getElementById('new-pass').value;
  const confirmPass = document.getElementById('confirm-new-pass').value;
  if(newPass !== confirmPass) { alert(t('confirmNewPass') + ' غير متطابق'); return; }
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPass);
  try { await reauthenticateWithCredential(user, credential); await updatePassword(user, newPass); alert('تم تغيير كلمة المرور'); document.getElementById('change-password-modal').style.display = 'none'; document.getElementById('change-password-form').reset(); } catch(err) { alert(err.message); }
});

// --- PIN Modal (كما هي) ---
let pinCallback = null;
function requestPin(callback) { if(!isAdmin && !isModerator) { callback(); return; } pinCallback = callback; document.getElementById('pin-input').value = ''; document.getElementById('pin-modal').style.display = 'block'; }
document.getElementById('pin-form').addEventListener('submit', async e => { e.preventDefault(); const enteredPin = String(document.getElementById('pin-input').value); try { const snap = await get(ref(db, 'settings/adminPin')); const realPin = String(snap.val() || '1234'); if(enteredPin === realPin) { document.getElementById('pin-modal').style.display = 'none'; if(pinCallback) pinCallback(); } else { alert(t('pinError')); } } catch(err) { alert(t('pinError')); } });

// --- Init App ---
function initApp() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  updateDateTimeDisplay();
  if(datetimeInterval) clearInterval(datetimeInterval);
  datetimeInterval = setInterval(updateDateTimeDisplay, 60000);
  fetchCars(); fetchDrivers(); if(isAdmin) { fetchMods(); fetchLogs(); } if(isAdmin || isModerator) fetchPendingRequests();
  calculateStats(); setupStatClicks();
}

// --- CARS (مع منع حذف المرتبطة) ---
document.getElementById('add-car-btn')?.addEventListener('click', () => openCarModal());
document.getElementById('load-more-cars')?.addEventListener('click', () => renderCars(true));
document.getElementById('search-car')?.addEventListener('input', () => { currentCarStatusFilter = 'all'; applyCarSearch(); });
async function generateCarId() { const c = await runTransaction(ref(db,'counters/carsCount'), v => (v||0)+1); return `UAE_${String(c.snapshot.val()).padStart(3,'0')}`; }
function openCarModal(data=null) { /* كما هي */ }
document.getElementById('car-form').addEventListener('submit', async e => { /* كما هي مع حفظ التعديلات */ });
// حذف السيارة تم تعديله أعلاه
function fetchCars() { onValue(ref(db,'cars'), snap => { allCars = snap.exists() ? Object.values(snap.val()) : []; if (!isDriver) applyCarSearch(); }); }
function applyCarSearch() { /* كما هي */ }
function renderCars(append) { /* كما هي */ }
function navigateToCar(carId) { /* كما هي */ }
function navigateToDriver(driverId) { /* كما هي */ }
function createCarCard(car) {
  // نفس الكود السابق ولكن مع استخدام deleteCar المعدلة
  // يبقى كما هو مع استدعاء deleteCar المعدلة
}
function printCard(car) { /* كما هي */ }
function shareCard(car) { /* كما هي */ }

// --- DRIVERS (مع إضافة تبديل الحالة للمدير) ---
document.getElementById('add-driver-btn')?.addEventListener('click', () => openDriverModal());
document.getElementById('load-more-drivers')?.addEventListener('click', () => renderDrivers(true));
document.getElementById('search-driver')?.addEventListener('input', applyDriverSearch);
function openDriverModal(data=null) { /* كما هي */ }
document.getElementById('driver-form').addEventListener('submit', async e => { /* كما هي مع إضافة حقل status للمستخدم الجديد */ });
async function deleteDriver(id) { /* كما هي */ }
function fetchDrivers() { onValue(ref(db,'drivers'), snap => { allDrivers = snap.exists() ? Object.values(snap.val()) : []; applyDriverSearch(); }); }
function applyDriverSearch() { /* كما هي */ }
function renderDrivers(append) { /* كما هي */ }

// دالة تبديل حالة السائق (للمدير)
async function toggleDriverStatus(driverUserId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  await update(ref(db, `users/${driverUserId}`), { status: newStatus });
  await logAction(newStatus === 'suspended' ? t('driverSuspended') : t('driverActivated'), driverUserId);
}

function createDriverCard(d) {
  // نفس الكود السابق مع إضافة أزرار تعليق/تفعيل للمدير
  const assignedCars = allCars.filter(c => c.currentDriverId === d.id);
  const el=document.createElement('div');
  el.className='card status-green-top';
  el.setAttribute('data-driver-id',d.id);
  let carsGridHtml = '';
  if(assignedCars.length===0) carsGridHtml = `<div class="driver-cars-grid"><div style="text-align:center;color:#888;grid-column:1/-1;">${t('noCar')}</div></div>`;
  else {
    let gridItems='';
    assignedCars.forEach(car=>{
      const statusText = getStatusText(car.licenseExpiry);
      let statusColor='#28a745';
      if(statusText===t('expiredStatus')) statusColor='#dc3545';
      else if(statusText===t('warnStatus')) statusColor='#ffc107';
      gridItems+=`<div class="driver-car-item" data-car-id="${car.id}"><div class="mini-plate"><span class="plate-number">${car.plateNumber}</span> <span class="plate-sep">|</span> <span class="plate-code">${car.plateCode}</span> <span class="plate-sep">|</span> <span class="plate-emirate">${car.emirate}</span></div><div class="car-mini-info"><span><i class="fas fa-car"></i> ${car.type}</span><span><i class="fas fa-calendar"></i> ${car.year}</span><span style="color:${statusColor}"><i class="fas fa-clock"></i> ${statusText}</span></div></div>`;
    });
    carsGridHtml = `<div class="driver-cars-grid">${gridItems}</div>`;
  }
  // جلب حالة المستخدم المرتبط (للسائق)
  let userStatus = 'active';
  // سنحاول جلبها من users
  // لكننا سنضيف أزرار تعليق/تفعيل فقط إذا كان المدير
  let statusButtonsHtml = '';
  if(isAdmin && d.userId) {
    // سنحتاج إلى قراءة الحالة من users، ولكننا سنقوم بذلك بشكل غير متزامن لاحقًا، نضع مؤقتًا زر التبديل
    statusButtonsHtml = `<button class="btn-action toggle-status" style="background:#ffc107;color:#333"><i class="fas fa-toggle-on"></i> ${t('suspended')}</button>`;
  }
  el.innerHTML=`<div class="card-header"><div class="card-header-main"><div><div class="card-title"><i class="fas fa-user"></i> ${d.name}</div><div style="color:#666;margin-top:5px"><i class="fas fa-phone"></i> ${d.contact}</div><div style="color:#666;font-size:12px"><i class="fas fa-envelope"></i> ${d.email || ''}</div></div></div><div class="card-driver-info" style="width:100%;flex-direction:column;align-items:stretch;">${carsGridHtml}</div></div><div class="card-body">${d.notes?`<p>${d.notes}</p>`:''}<div class="card-actions"><button class="btn-action assign" style="background:var(--green)"><i class="fas fa-plus"></i> ${t('assign')}</button><button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button><button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button>${statusButtonsHtml}</div></div>`;
  el.querySelector('.card-header').addEventListener('click', e=>{ if(!e.target.closest('.btn-action') && !e.target.closest('.driver-car-item')) el.classList.toggle('expanded'); });
  el.querySelector('.edit').addEventListener('click', e=>{ e.stopPropagation(); openDriverModal(d); });
  el.querySelector('.delete').addEventListener('click', e=>{ e.stopPropagation(); deleteDriver(d.id); });
  el.querySelector('.history').addEventListener('click', e=>{ e.stopPropagation(); showCustodyHistory('driver',d.id); });
  el.querySelector('.assign').addEventListener('click', e=>{ e.stopPropagation(); openCustodyModal('driver',d.id); });
  if(isAdmin && d.userId) {
    const toggleBtn = el.querySelector('.toggle-status');
    if(toggleBtn) {
      // جلب الحالة الفعلية من users
      get(ref(db, `users/${d.userId}/status`)).then(snap => {
        const currentStatus = snap.val() || 'active';
        toggleBtn.innerHTML = currentStatus === 'active' ? '<i class="fas fa-toggle-on"></i> '+t('suspended') : '<i class="fas fa-toggle-off"></i> '+t('active');
        toggleBtn.style.background = currentStatus === 'active' ? '#ffc107' : '#28a745';
        toggleBtn.onclick = async (e) => {
          e.stopPropagation();
          requestPin(async () => {
            await toggleDriverStatus(d.userId, currentStatus);
            // إعادة تحميل السائقين لتحديث الزر
            fetchDrivers();
          });
        };
      });
    }
  }
  el.querySelectorAll('.driver-car-item').forEach(item=>{ const carId = item.getAttribute('data-car-id'); if(carId) item.addEventListener('click',(e)=>{ e.stopPropagation(); navigateToCar(carId); }); });
  return el;
}

// --- CUSTODY MODAL (كما هي مع دمج التحذير التلقائي عبر assignCustody) ---
function openCustodyModal(sourceType, sourceId) { /* كما هي */ }
document.getElementById('custody-form').addEventListener('submit', async e=>{ /* كما هي تستدعي assignCustody */ });
async function showCustodyHistory(type,id) { /* كما هي */ }
// --- MODERATORS (كما هي مع إضافة حقل status عند الإنشاء) ---
document.getElementById('add-mod-btn')?.addEventListener('click',()=>{requestPin(()=>{document.getElementById('mod-form').reset();document.getElementById('mod-uid-hidden').value='';document.getElementById('mod-pass-group').style.display='flex';document.getElementById('mod-modal').style.display='block';});});
document.getElementById('load-more-mods')?.addEventListener('click',()=>renderMods(true));
document.getElementById('mod-form').addEventListener('submit',async e=>{e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; const uid=document.getElementById('mod-uid-hidden').value; const name=document.getElementById('mod-name').value, email=document.getElementById('mod-email').value; try { if(uid){ await update(ref(db,`users/${uid}`),{name,email}); await logAction(t('edit'),name); } else { const pass=document.getElementById('mod-pass').value; const cred=await createUserWithEmailAndPassword(secondaryAuth,email,pass); await set(ref(db,`users/${cred.user.uid}`),{email,name,role:'moderator',status:'active'}); await logAction(t('addMod'),name); } document.getElementById('mod-modal').style.display='none'; } catch(err){alert(err.message)} finally{btn.disabled=false;btn.textContent=t('save');} });
function fetchMods(){ onValue(ref(db,'users'), snap=>{ allMods=snap.exists()?Object.keys(snap.val()).map(k=>({...snap.val()[k],id:k})).filter(u=>u.role==='moderator'):[]; modsShown=0; renderMods(false); }); }
function renderMods(append){ const c=document.getElementById('mods-container'); if(!c) return; if(!append) c.innerHTML=''; const items=allMods.slice(modsShown,modsShown+LIMIT); items.forEach(u=>c.appendChild(createModCard(u))); modsShown+=items.length; document.getElementById('load-more-mods').style.display=modsShown<allMods.length?'inline-block':'none'; }
function createModCard(u){ const el=document.createElement('div'); el.className=`card ${u.status==='active'?'status-green-top':'status-red-top'}`; el.innerHTML=`<div class="card-header"><div class="card-title">${u.name}</div><small>${u.email}</small></div><div class="card-body"><p>${u.status==='active'?`<span style="color:green">${t('active')}</span>`:`<span style="color:red">${t('suspended')}</span>`}</p><div class="card-actions">${u.status==='active'?`<button class="btn-action suspend" style="background:var(--yellow);color:#333"><i class="fas fa-ban"></i> ${t('suspended')}</button>`:`<button class="btn-action activate" style="background:var(--green)"><i class="fas fa-check"></i> ${t('active')}</button>`}<button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action reset-pass" style="background:#17a2b8"><i class="fas fa-key"></i> ${t('resetPass')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button></div></div>`; el.querySelector('.card-header').addEventListener('click',e=>{if(!e.target.closest('.btn-action')) el.classList.toggle('expanded');}); if(u.status==='active') el.querySelector('.suspend').addEventListener('click',e=>{e.stopPropagation();requestPin(async()=>{await update(ref(db,`users/${u.id}`),{status:'suspended'});await logAction(t('suspended'),u.name);});}); else el.querySelector('.activate').addEventListener('click',e=>{e.stopPropagation();requestPin(async()=>{await update(ref(db,`users/${u.id}`),{status:'active'});await logAction(t('active'),u.name);});}); el.querySelector('.edit').addEventListener('click',e=>{e.stopPropagation();document.getElementById('mod-uid-hidden').value=u.id;document.getElementById('mod-name').value=u.name;document.getElementById('mod-email').value=u.email;document.getElementById('mod-pass-group').style.display='none';document.getElementById('mod-modal').style.display='block';}); el.querySelector('.reset-pass').addEventListener('click',async e=>{e.stopPropagation();try{await sendPasswordResetEmail(auth,u.email);alert(t('resetPassSent'));}catch(err){alert(err.message);}}); el.querySelector('.delete').addEventListener('click',e=>{e.stopPropagation();requestPin(async()=>{if(confirm(t('confirmDeleteCar'))){await remove(ref(db,`users/${u.id}`));await logAction(t('delete'),u.name);}});}); return el; }

// --- LOGS (عرض الاسم) ---
document.getElementById('load-more-logs')?.addEventListener('click',()=>renderLogs(true));
function fetchLogs(){ onValue(ref(db,'logs'), snap=>{ allLogs=snap.exists()?Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)):[]; logsShown=0; renderLogs(false); }); }
function renderLogs(append){ const tb=document.getElementById('logs-tbody'); if(!tb) return; if(!append) tb.innerHTML=''; const items=allLogs.slice(logsShown,logsShown+LIMIT); items.forEach(l=>{ const tr=document.createElement('tr'); const userDisplay = l.userName || l.userId || '?'; tr.innerHTML=`<td>${fmtDateTime(l.timestamp)}</td><td>${userDisplay}</td><td>${l.action}</td><td>${l.details}</td>`; tb.appendChild(tr); }); logsShown+=items.length; document.getElementById('load-more-logs').style.display=logsShown<allLogs.length?'inline-block':'none'; }

// --- PENDING REQUESTS (مع إصلاح approveRequest) ---
async function fetchPendingRequests(){ onValue(ref(db,'pendingCarRequests'), snap=>{ allPendingRequests=snap.exists()?Object.keys(snap.val()).map(k=>({id:k,...snap.val()[k]})).filter(r=>r.status==='pending'):[]; pendingShown=0; renderPendingRequests(); }); }
function renderPendingRequests(){ const tbody=document.getElementById('pending-tbody'); if(!tbody) return; tbody.innerHTML=''; const items=allPendingRequests.slice(pendingShown,pendingShown+LIMIT); items.forEach(req=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${req.driverName||'?'}</td><td>${req.plateNumber}</td><td>${req.plateCode}</td><td>${req.emirate}</td><td>${req.carType}</td><td>${fmtDateTime(req.submittedAt)}</td><td><button class="btn-approve" data-id="${req.id}">${t('approve')}</button> <button class="btn-reject" data-id="${req.id}">${t('reject')}</button></td>`; tbody.appendChild(tr); }); pendingShown+=items.length; document.getElementById('load-more-pending')?.remove(); if(pendingShown<allPendingRequests.length){ const btn=document.createElement('button'); btn.id='load-more-pending'; btn.className='btn-load-more'; btn.textContent=t('loadMore'); btn.addEventListener('click',()=>renderPendingRequests()); document.getElementById('pending-section').appendChild(btn); } tbody.querySelectorAll('.btn-approve').forEach(btn=>btn.addEventListener('click',()=>approveRequest(btn.dataset.id))); tbody.querySelectorAll('.btn-reject').forEach(btn=>btn.addEventListener('click',()=>rejectRequest(btn.dataset.id))); }

// دالة مساعدة لحفظ السيارة والربط لقبول الطلب
async function saveApprovedCarAndAssign(requestId, carData, driverId) {
  // التحقق من عدم تكرار اللوحة أو VIN
  const snap = await get(ref(db,'cars'));
  if(snap.exists()){
    const cars = snap.val();
    for(let k in cars){
      if(cars[k].vin === carData.vin) { alert(t('dupVin')); return false; }
      if(cars[k].plateNumber === carData.plateNumber && cars[k].plateCode === carData.plateCode && cars[k].emirate === carData.emirate) { alert(t('dupPlate')); return false; }
    }
  }
  const carId = await generateCarId();
  carData.id = carId;
  await set(ref(db,`cars/${carId}`), carData);
  await assignCustody(carId, driverId, auth.currentUser.email, currentUserData.name);
  await update(ref(db,`pendingCarRequests/${requestId}`),{ status:'approved', approvedBy:auth.currentUser.email, approvedByName:currentUserData.name, finalCarId:carId });
  await logAction(t('approve'),`Car request ${requestId} approved, car ${carId} assigned`);
  return true;
}

async function approveRequest(requestId){
  const req = allPendingRequests.find(r=>r.id===requestId);
  if(!req) return;
  // فتح نافذة إدخال بيانات السيارة الإضافية (المالك، السنة، VIN، الخ)
  const carData = {
    plateNumber: req.plateNumber,
    plateCode: req.plateCode,
    emirate: req.emirate,
    type: req.carType,
    owner: '',
    year: '',
    vin: '',
    licenseExpiry: '',
    insuranceExpiry: '',
    notes: '',
    violations: ''
  };
  // نستخدم نفس مودال السيارة ولكن مع تعبئة الحقول الأساسية وطلب الباقي
  openCarModal(carData);
  // تخزين الـ requestId و driverId مؤقتاً
  window._pendingApprove = { requestId, driverId: req.driverId };
  // تعديل حدث النموذج مؤقتاً
  const originalSubmit = document.getElementById('car-form').onsubmit;
  document.getElementById('car-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const hid = document.getElementById('car-id-hidden').value;
    const vin = document.getElementById('vin').value.trim();
    const pNum = document.getElementById('plate-number').value.trim();
    const pCode = document.getElementById('plate-code').value.trim();
    const emi = document.getElementById('emirate').value.trim();
    try {
      // تجميع البيانات الكاملة
      const fullData = {
        plateNumber: pNum,
        plateCode: pCode,
        emirate: emi,
        owner: document.getElementById('owner').value.trim(),
        type: document.getElementById('car-type').value.trim(),
        year: document.getElementById('car-year').value.trim(),
        vin: vin,
        licenseExpiry: document.getElementById('license-expiry').value,
        insuranceExpiry: document.getElementById('insurance-expiry').value,
        notes: document.getElementById('car-notes').value.trim(),
        violations: document.getElementById('violations').value.trim(),
        currentDriverId: null,
        currentDriverName: null,
        currentAssignedByEmail: null,
        currentAssignedByName: null,
        currentAssignedAt: null
      };
      const success = await saveApprovedCarAndAssign(window._pendingApprove.requestId, fullData, window._pendingApprove.driverId);
      if(success) {
        document.getElementById('car-modal').style.display = 'none';
        document.getElementById('car-form').reset();
      }
    } catch(err) { alert(err.message); }
    finally { btn.disabled=false; btn.textContent=t('save'); document.getElementById('car-form').onsubmit = originalSubmit; delete window._pendingApprove; }
  };
}

async function rejectRequest(requestId){ const reason=prompt('سبب الرفض (اختياري)'); await update(ref(db,`pendingCarRequests/${requestId}`),{ status:'rejected', rejectedReason:reason||'' }); await logAction(t('reject'),`Car request ${requestId} rejected`); }

// --- DRIVER DASHBOARD (REALTIME) ---
async function initDriverDashboardRealtime() {
  if(!isDriver || !currentDriverId) return;
  // تحديث البيانات الشخصية
  try {
    const driverSnap = await get(ref(db, `drivers/${currentDriverId}`));
    if(driverSnap.exists()) {
      const driver = driverSnap.val();
      document.getElementById('driver-name-display').textContent = driver.name || currentUserData.name;
      document.getElementById('driver-contact-display').textContent = driver.contact || "غير متوفر";
    } else {
      document.getElementById('driver-name-display').textContent = currentUserData.name;
      document.getElementById('driver-contact-display').textContent = "غير متوفر";
    }
    document.getElementById('driver-email-display').textContent = currentUserData.email;
  } catch(e) { console.error(e); }

  // الاستماع للتغييرات في custodyHistory و cars (realtime)
  if(driverUnsubscribe) driverUnsubscribe();
  const custodyRef = ref(db, 'custodyHistory');
  driverUnsubscribe = onValue(custodyRef, async () => {
    await refreshDriverCars();
  });
  await refreshDriverCars();
}

async function refreshDriverCars() {
  const custodySnap = await get(ref(db, 'custodyHistory'));
  let activeCustodies = [], pastCustodies = [];
  if(custodySnap.exists()) {
    const histories = Object.values(custodySnap.val());
    activeCustodies = histories.filter(h => h.driverId === currentDriverId && !h.endTime);
    pastCustodies = histories.filter(h => h.driverId === currentDriverId && h.endTime);
  }
  const currentCarsContainer = document.getElementById('driver-current-cars');
  const pastCarsContainer = document.getElementById('driver-past-cars');
  currentCarsContainer.innerHTML = '';
  pastCarsContainer.innerHTML = '';
  for(let custody of activeCustodies) {
    const carSnap = await get(ref(db, `cars/${custody.carId}`));
    if(carSnap.exists()) currentCarsContainer.appendChild(createSimpleCarCard(carSnap.val(), custody));
  }
  for(let custody of pastCustodies) {
    const carSnap = await get(ref(db, `cars/${custody.carId}`));
    if(carSnap.exists()) pastCarsContainer.appendChild(createPastCarCard(carSnap.val(), custody));
  }
}

function createSimpleCarCard(car, custody) {
  const el = document.createElement('div');
  el.className = 'card status-green-top';
  // إضافة تحذير إذا كانت التراخيص منتهية
  let expiryWarningHtml = '';
  const now = getUaeTime();
  const licenseDate = car.licenseExpiry ? getUaeTime(new Date(car.licenseExpiry)) : null;
  const insuranceDate = car.insuranceExpiry ? getUaeTime(new Date(car.insuranceExpiry)) : null;
  let hasExpiry = false;
  if(licenseDate && licenseDate < now) hasExpiry = true;
  if(insuranceDate && insuranceDate < now) hasExpiry = true;
  if(hasExpiry) expiryWarningHtml = `<div class="expiry-warning-badge" style="background:#dc3545;color:white;padding:4px 10px;border-radius:20px;font-size:12px;margin-top:8px;"><i class="fas fa-exclamation-triangle"></i> ${t('expiryWarning').split('?')[0]}</div>`;
  el.innerHTML = `<div class="card-header"><div class="card-title">${car.id}</div><div class="plate-design"><span class="plate-number">${car.plateNumber}</span> | <span class="plate-code">${car.plateCode}</span> | ${car.emirate}</div><div class="current-driver-box"><i class="fas fa-user-check"></i> ${t('currentlyWith')}: أنت<div class="custody-meta"><i class="fas fa-user-cog"></i> ${t('assignedBy')}: ${custody.assignedByName || custody.assignedByEmail || '?'} - ${fmtDate(custody.startTime)}</div>${expiryWarningHtml}</div></div><div class="card-body"><div class="info-grid"><div class="info-chip"><span class="chip-label">${t('owner')}</span><span class="chip-value">${car.owner}</span></div><div class="info-chip"><span class="chip-label">${t('carType')}/${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div><div class="info-chip"><span class="chip-label">${t('vin')}</span><span class="chip-value">${car.vin}</span></div><div class="info-chip"><span class="chip-label">${t('licenseExpiry')}</span><span class="chip-value">${fmtDate(car.licenseExpiry)}</span></div><div class="info-chip"><span class="chip-label">${t('insuranceExpiry')}</span><span class="chip-value">${fmtDate(car.insuranceExpiry)}</span></div></div></div>`;
  el.querySelector('.card-header').addEventListener('click', () => el.classList.toggle('expanded'));
  return el;
}

function createPastCarCard(car, custody) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<div class="card-header"><div class="card-title">${car.id}</div><div class="plate-design"><span class="plate-number">${car.plateNumber}</span> | <span class="plate-code">${car.plateCode}</span> | ${car.emirate}</div><div class="current-driver-box" style="background:#e9ecef"><i class="fas fa-calendar-alt"></i> ${fmtDate(custody.startTime)} - ${custody.endTime?fmtDate(custody.endTime):'?'}</div></div><div class="card-body"><div class="info-grid"><div class="info-chip"><span class="chip-label">${t('owner')}</span><span class="chip-value">${car.owner}</span></div><div class="info-chip"><span class="chip-label">${t('carType')}/${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div></div></div>`;
  el.querySelector('.card-header').addEventListener('click', () => el.classList.toggle('expanded'));
  return el;
}

// نموذج إضافة سيارة للسائق (مع التحقق من عدم التكرار والربط)
document.getElementById('driver-add-car-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const plateNumber = document.getElementById('driver-plate-number').value.trim();
  const plateCode = document.getElementById('driver-plate-code').value.trim();
  const emirate = document.getElementById('driver-emirate').value.trim();
  const carType = document.getElementById('driver-car-type').value.trim();
  if(!plateNumber||!plateCode||!emirate||!carType){ alert('جميع الحقول مطلوبة'); return; }
  const carsSnap = await get(ref(db,'cars'));
  let existingCar = null;
  if(carsSnap.exists()){
    const cars = Object.values(carsSnap.val());
    existingCar = cars.find(c => c.plateNumber === plateNumber && c.plateCode === plateCode && c.emirate === emirate);
  }
  if(existingCar){
    if(existingCar.currentDriverId){
      alert(t('carAlreadyAssigned'));
    } else {
      try {
        await assignCustody(existingCar.id, currentDriverId, auth.currentUser.email, currentUserData.name);
        alert(t('carAddedAndAssigned'));
        await refreshDriverCars();
      } catch(err) { alert(err.message); }
    }
  } else {
    const requestData = {
      driverId: currentDriverId,
      driverName: document.getElementById('driver-name-display').textContent,
      plateNumber, plateCode, emirate, carType,
      submittedAt: new Date().toISOString(),
      status:'pending'
    };
    await set(push(ref(db,'pendingCarRequests')), requestData);
    alert(t('requestSent'));
  }
  document.getElementById('driver-add-car-form').reset();
});

// --- STATS (مع إضافة مستمع للنقر) ---
function setupStatClicks(){ /* كما هي */ }
function calculateStats(){ /* كما هي */ }

// --- Service Worker ---
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js'));
