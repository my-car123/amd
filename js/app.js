// app.js - الإصدار المعدل بالكامل
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
let currentUserData = { uid: null, email: null, role: null, name: null }; // أضفنا name
let isAdmin = false, isModerator = false, isDriver = false;
let currentDriverId = null;

// --- UAE Time ---
function getUaeTime(dateObj = new Date()) { return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Dubai' })); }
function toLatinNumerals(str) { return String(str).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }
function fmtDate(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return toLatinNumerals(new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-AE' : 'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', numberingSystem:'latn' }).format(date)); }
function fmtDateTime(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return toLatinNumerals(new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-AE' : 'en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:true, numberingSystem:'latn' }).format(date)); }

// --- i18n ---
const translations = {
  ar: { loginTitle:"تسجيل الدخول", loginBtn:"دخول", navStats:"الإحصائيات", navCars:"السيارات", navDrivers:"السائقون", navMods:"المشرفون", navLogs:"السجل", navPending:"الطلبات", statActive:"سيارات سارية", statWarn:"قاربت على الانتهاء", statExp:"منتهية", statDrivers:"سائقين", statMods:"مشرفين", addCar:"إضافة سيارة", addDriver:"إضافة سائق", addMod:"إضافة مشرف", modManagement:"إدارة المشرفين", systemLogs:"سجل النظام الدقيق", pinTitle:"التحقق من الرمز السري", pinDesc:"أدخل رمز PIN للمتابعة", confirm:"تأكيد", loadMore:"عرض المزيد", searchCar:"بحث (لوحة، قاعدة، مالك)...", searchDriver:"بحث (اسم، هاتف)...", owner:"المالك", plateNumber:"رقم اللوحة", plateCode:"الرمز", emirate:"الإمارة", carType:"النوع", carYear:"سنة الصنع", vin:"رقم القاعدة (VIN)", licenseExpiry:"انتهاء الترخيص", insuranceExpiry:"انتهاء التأمين", notes:"ملاحظات", violations:"مخالفات", save:"حفظ", driverName:"اسم السائق", driverContact:"رقم الموبايل", assignCustody:"ربط عهدة", selectDriver:"اختر السائق", selectCar:"اختر السيارة (بدون عهدة)", confirmAssign:"تأكيد الربط", car:"السيارة", modName:"اسم المستخدم", email:"البريد الإلكتروني", password:"كلمة المرور", custodyHistory:"سجل العهدات", startTime:"البداية", endTime:"النهاية", logTime:"التوقيت", logUser:"المستخدم", logAction:"الإجراء", logDetails:"التفاصيل", active:"فعال", suspended:"معلق", assign:"ربط", unassign:"فك", edit:"تعديل", delete:"حذف", print:"طباعة", share:"مشاركة", history:"سجل", resetPass:"إعادة كلمة المرور", noDriver:"بدون سائق", noCar:"بدون سيارة", activeStatus:"سارية", warnStatus:"قاربت على الانتهاء", expiredStatus:"منتهية", currentlyWith:"مع", untilNow:"حتى الآن", loginError:"خطأ في الدخول", pinError:"رمز PIN خاطئ!", dupVin:"VIN مكرر!", dupPlate:"اللوحة مكررة!", dupDriver:"اسم السائق أو رقم الهاتف مسجل مسبقاً!", confirmDeleteCar:"حذف السيارة؟", confirmDeleteDriver:"حذف السائق؟", confirmUnassign:"فك الربط؟", unassignFirst:"افك العهدة أولاً", resetPassSent:"تم إرسال رابط إعادة التعيين للبريد", none:"لا توجد بيانات", copied:"تم النسخ!", footerRights:"جميع الحقوق محفوظة", moreCars:"سيارات أخرى", pendingRequests:"طلبات إضافة سيارات", submittedAt:"تاريخ الطلب", actions:"إجراءات", approve:"قبول", reject:"رفض", currentCars:"سياراتي الحالية", pastCars:"السيارات السابقة", addNewCar:"إضافة سيارة جديدة", changePass:"تغيير كلمة المرور", currentPass:"كلمة المرور الحالية", newPass:"كلمة المرور الجديدة", confirmNewPass:"تأكيد كلمة المرور", assignedBy:"تمت بواسطة", unassignedBy:"فك بواسطة", carAlreadyAssigned:"السيارة مرتبطة بسائق آخر", requestSent:"تم إرسال طلبك للإدارة", carAddedAndAssigned:"تمت إضافة السيارة وربطها بنجاح", loginErrorDetail:"فشل الدخول: تأكد من البريد وكلمة المرور", driverLoadError:"حدث خطأ في تحميل بيانات السائق" },
  en: { loginTitle:"Login", loginBtn:"Login", navStats:"Stats", navCars:"Cars", navDrivers:"Drivers", navMods:"Mods", navLogs:"Logs", navPending:"Requests", statActive:"Active Cars", statWarn:"Warning", statExp:"Expired", statDrivers:"Drivers", statMods:"Mods", addCar:"Add Car", addDriver:"Add Driver", addMod:"Add Mod", modManagement:"Moderators", systemLogs:"System Logs", pinTitle:"PIN Verification", pinDesc:"Enter PIN to continue", confirm:"Confirm", loadMore:"Load More", searchCar:"Search (Plate, VIN, Owner)...", searchDriver:"Search (Name, Phone)...", owner:"Owner", plateNumber:"Plate Number", plateCode:"Code", emirate:"Emirate", carType:"Type", carYear:"Year", vin:"VIN", licenseExpiry:"License Expiry", insuranceExpiry:"Insurance Expiry", notes:"Notes", violations:"Violations", save:"Save", driverName:"Driver Name", driverContact:"Phone", assignCustody:"Assign Custody", selectDriver:"Select Driver", selectCar:"Select Car (No Custody)", confirmAssign:"Confirm Assign", car:"Car", modName:"Display Name", email:"Email", password:"Password", custodyHistory:"Custody History", startTime:"Start", endTime:"End", logTime:"Time", logUser:"User", logAction:"Action", logDetails:"Details", active:"Active", suspended:"Suspended", assign:"Assign", unassign:"Unassign", edit:"Edit", delete:"Delete", print:"Print", share:"Share", history:"History", resetPass:"Reset Pass", noDriver:"No Driver", noCar:"No Car", activeStatus:"Active", warnStatus:"Warning", expiredStatus:"Expired", currentlyWith:"With", untilNow:"Until Now", loginError:"Login Error", pinError:"Wrong PIN!", dupVin:"Duplicate VIN!", dupPlate:"Duplicate Plate!", dupDriver:"Driver Name or Phone already exists!", confirmDeleteCar:"Delete Car?", confirmDeleteDriver:"Delete Driver?", confirmUnassign:"Unassign?", unassignFirst:"Unassign first", resetPassSent:"Reset link sent to email", none:"No data", copied:"Copied!", footerRights:"All Rights Reserved", moreCars:"more cars", pendingRequests:"Pending Car Requests", submittedAt:"Submitted", actions:"Actions", approve:"Approve", reject:"Reject", currentCars:"My Current Cars", pastCars:"Past Cars", addNewCar:"Add New Car", changePass:"Change Password", currentPass:"Current Password", newPass:"New Password", confirmNewPass:"Confirm Password", assignedBy:"Assigned by", unassignedBy:"Unassigned by", carAlreadyAssigned:"Car is already assigned", requestSent:"Request sent to admin", carAddedAndAssigned:"Car added and assigned", loginErrorDetail:"Login failed. Check email/password", driverLoadError:"Error loading driver data" }
};
let currentLang = localStorage.getItem('fleetSysLang') || 'ar';
function t(key) { return translations[currentLang][key] || key; }
function updateDateTimeDisplay() { const el = document.getElementById('live-datetime'); if(el) el.textContent = fmtDateTime(new Date()); }
function setLanguage(lang) { currentLang = lang; localStorage.setItem('fleetSysLang', lang); document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR'; document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if(translations[lang][key]) el.textContent = translations[lang][key]; }); document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if(translations[lang][key]) el.placeholder = translations[lang][key]; }); updateDateTimeDisplay(); }
setLanguage(currentLang);
document.getElementById('lang-toggle').addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));

// --- Helper: جلب اسم المستخدم من Firebase (للتوافق مع البيانات القديمة) ---
async function getUserNameFromUid(uid) {
  if (!uid) return null;
  const snap = await get(ref(db, `users/${uid}`));
  if (snap.exists()) {
    const user = snap.val();
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
  }
  return uid;
}

// --- تسجيل الأحداث مع تخزين الاسم ---
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

// --- ربط العهدة مع تخزين اسم المستخدم ---
async function assignCustody(carId, driverId, assignedByEmail, assignedByName) {
  const carData = allCars.find(c => c.id === carId);
  const driverData = allDrivers.find(d => d.id === driverId);
  if(!carData || !driverData) throw new Error('Invalid');
  if(carData.currentDriverId) throw new Error('Car already assigned');
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

// --- فك العهدة مع تخزين اسم المستخدم ---
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

// --- تحديث currentUserData.name عند تسجيل الدخول ---
async function updateCurrentUserName(uid, email, role, driverId = null) {
  if (role === 'admin') {
    currentUserData.name = 'SAAD';
  } else if (role === 'moderator') {
    const snap = await get(ref(db, `users/${uid}`));
    currentUserData.name = snap.exists() ? (snap.val().name || email.split('@')[0]) : email.split('@')[0];
  } else if (role === 'driver' && driverId) {
    const snap = await get(ref(db, `drivers/${driverId}`));
    currentUserData.name = snap.exists() ? snap.val().name : email.split('@')[0];
  } else {
    currentUserData.name = email.split('@')[0];
  }
}

// --- Auth State ---
onAuthStateChanged(auth, async user => {
  if(user) {
    try {
      if(user.email === 'saad323m@gmail.com') {
        isAdmin = true; isModerator = false; isDriver = false; currentUserRole = 'admin';
        currentUserData = { uid: user.uid, email: user.email, role: 'admin' };
        await updateCurrentUserName(user.uid, user.email, 'admin');
        showAdminModeratorInterface();
        initApp();
      } else {
        const userSnap = await get(ref(db, `users/${user.uid}`));
        if(userSnap.exists()) {
          const uData = userSnap.val();
          if(uData.role === 'moderator') {
            isModerator = true; isAdmin = false; isDriver = false; currentUserRole = 'moderator';
            currentUserData = { uid: user.uid, email: user.email, role: 'moderator', name: uData.name };
            await updateCurrentUserName(user.uid, user.email, 'moderator');
            showAdminModeratorInterface();
            initApp();
          } else if(uData.role === 'driver') {
            isDriver = true; isAdmin = false; isModerator = false; currentUserRole = 'driver';
            currentDriverId = uData.driverId;
            currentUserData = { uid: user.uid, email: user.email, role: 'driver', driverId: uData.driverId };
            await updateCurrentUserName(user.uid, user.email, 'driver', currentDriverId);
            showDriverInterface();
            await initDriverDashboard(); // انتظار الانتهاء لمعرفة الأخطاء
          } else {
            await signOut(auth);
            alert('حساب غير مصرح به');
            return;
          }
        } else {
          await signOut(auth);
          alert('حساب غير موجود في النظام');
          return;
        }
      }
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('app-section').style.display = 'flex';
      document.getElementById('user-display-name').textContent = currentUserData.name || (isAdmin ? 'SAAD' : (isModerator ? currentUserData.name : (isDriver ? 'سائق' : '')));
    } catch(error) {
      console.error("Error in onAuthStateChanged:", error);
      alert(t('driverLoadError') + ': ' + error.message);
      await signOut(auth);
    }
  } else {
    if(datetimeInterval) clearInterval(datetimeInterval);
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
    isAdmin = false; isModerator = false; isDriver = false;
    currentUserData = { uid: null, email: null, role: null, name: null };
  }
});

function showAdminModeratorInterface() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
  if(isModerator) { document.getElementById('nav-mods').style.display = 'none'; document.getElementById('nav-logs').style.display = 'none'; }
  document.getElementById('driver-dashboard').style.display = 'none';
  document.getElementById('stats-section').style.display = 'block';
  document.getElementById('cars-section').style.display = 'none';
  document.getElementById('drivers-section').style.display = 'none';
  document.getElementById('mods-section').style.display = 'none';
  document.getElementById('logs-section').style.display = 'none';
  document.getElementById('pending-section').style.display = 'none';
  ['stats','cars','drivers','mods','logs','pending'].forEach(id => { const el = document.getElementById(`nav-${id}`); if(el) { if((id==='mods'||id==='logs') && !isAdmin) el.style.display='none'; else if(id==='pending' && !isAdmin && !isModerator) el.style.display='none'; else el.style.display='flex'; } });
}

function showDriverInterface() {
  document.getElementById('stats-section').style.display = 'none';
  document.getElementById('cars-section').style.display = 'none';
  document.getElementById('drivers-section').style.display = 'none';
  document.getElementById('mods-section').style.display = 'none';
  document.getElementById('logs-section').style.display = 'none';
  document.getElementById('pending-section').style.display = 'none';
  document.getElementById('driver-dashboard').style.display = 'block';
  ['stats','cars','drivers','mods','logs','pending'].forEach(id => { const el = document.getElementById(`nav-${id}`); if(el) el.style.display = 'none'; });
}

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

// Change Password (بدون تغيير)
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

// PIN (بدون تغيير)
let pinCallback = null;
function requestPin(callback) { if(!isAdmin && !isModerator) { callback(); return; } pinCallback = callback; document.getElementById('pin-input').value = ''; document.getElementById('pin-modal').style.display = 'block'; }
document.getElementById('pin-form').addEventListener('submit', async e => { e.preventDefault(); const enteredPin = String(document.getElementById('pin-input').value); try { const snap = await get(ref(db, 'settings/adminPin')); const realPin = String(snap.val() || '1234'); if(enteredPin === realPin) { document.getElementById('pin-modal').style.display = 'none'; if(pinCallback) pinCallback(); } else { alert(t('pinError')); } } catch(err) { alert(t('pinError')); } });

// Navigation
const sections = ['stats','cars','drivers','mods','logs','pending'];
sections.forEach(sec => { const el = document.getElementById(`nav-${sec}`); if(el) el.addEventListener('click', e => { e.preventDefault(); showSection(sec); }); });
function showSection(sec) { sections.forEach(s => { const secEl = document.getElementById(`${s}-section`); if(secEl) secEl.style.display = (s === sec) ? 'block' : 'none'; const navEl = document.getElementById(`nav-${s}`); if(navEl) navEl.classList.toggle('active', s === sec); }); }

// Helpers (مثل قبل)
document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).style.display = 'none'));
window.onclick = e => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; };
function getStatusClass(dateStr, hasDriver = false) { if(!dateStr) return ''; const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d = Math.ceil((exp-now)/(1000*60*60*24)); if(d < 0) return hasDriver ? 'status-danger' : 'status-red'; if(d <= 15) return hasDriver ? 'status-danger' : 'status-yellow'; return 'status-green'; }
function getStatusText(dateStr) { if(!dateStr) return ''; const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d = Math.ceil((exp-now)/(1000*60*60*24)); if(d < 0) return t('expiredStatus'); if(d <= 15) return t('warnStatus'); return t('activeStatus'); }
function getCarOverallStatus(car) { const lSt = getStatusClass(car.licenseExpiry, !!car.currentDriverId); const iSt = getStatusClass(car.insuranceExpiry, !!car.currentDriverId); if(lSt==='status-danger' || iSt==='status-danger' || lSt==='status-red' || iSt==='status-red') return 'exp'; if(lSt==='status-yellow' || iSt==='status-yellow') return 'warn'; return 'active'; }

// Pagination
const LIMIT = 10;
let allCars=[], displayedCars=[], carsShown=0;
let allDrivers=[], displayedDrivers=[], driversShown=0;
let allMods=[], modsShown=0;
let allLogs=[], logsShown=0;
let allPendingRequests=[], pendingShown=0;
let currentCarStatusFilter = 'all';

function initApp() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  updateDateTimeDisplay();
  if(datetimeInterval) clearInterval(datetimeInterval);
  datetimeInterval = setInterval(updateDateTimeDisplay, 60000);
  fetchCars(); fetchDrivers(); if(isAdmin) { fetchMods(); fetchLogs(); } if(isAdmin || isModerator) fetchPendingRequests();
  calculateStats(); setupStatClicks();
}

// CARS (مع تعديل عرض اسم المعين)
document.getElementById('add-car-btn')?.addEventListener('click', () => openCarModal());
document.getElementById('load-more-cars')?.addEventListener('click', () => renderCars(true));
document.getElementById('search-car')?.addEventListener('input', () => { currentCarStatusFilter = 'all'; applyCarSearch(); });
async function generateCarId() { const c = await runTransaction(ref(db,'counters/carsCount'), v => (v||0)+1); return `UAE_${String(c.snapshot.val()).padStart(3,'0')}`; }
function openCarModal(data=null) { /* كما هو */ }
document.getElementById('car-form').addEventListener('submit', async e => { /* كما هو مع الاحتفاظ بالتعديلات السابقة */ });
async function deleteCar(id) { if(confirm(t('confirmDeleteCar'))){ await remove(ref(db,`cars/${id}`)); await logAction(t('delete'), id); } }
function fetchCars() { onValue(ref(db,'cars'), snap => { allCars = snap.exists() ? Object.values(snap.val()) : []; if (!isDriver) applyCarSearch(); }); }
function applyCarSearch() { /* كما هو */ }
function renderCars(append) { /* كما هو مع تعديل createCarCard */ }
function navigateToCar(carId) { /* كما هو */ }
function navigateToDriver(driverId) { /* كما هو */ }
function createCarCard(car) {
  const hasDriver = !!car.currentDriverId;
  const lSt = getStatusClass(car.licenseExpiry, hasDriver), iSt = getStatusClass(car.insuranceExpiry, hasDriver);
  let cSt = (lSt==='status-danger'||iSt==='status-danger')?'status-danger-top':(lSt==='status-red'||iSt==='status-red')?'status-red-top':(lSt==='status-yellow'||iSt==='status-yellow')?'status-yellow-top':'status-green-top';
  const el=document.createElement('div');
  el.className=`card ${cSt}`;
  el.setAttribute('data-car-id',car.id);
  // عرض اسم المعين (الحقل الجديد currentAssignedByName أو القديم currentAssignedByEmail)
  const assignedByName = car.currentAssignedByName || car.currentAssignedByEmail || '?';
  let driverHtml = hasDriver ? `<div class="current-driver-box"><i class="fas fa-user-check"></i> ${t('currentlyWith')}: <span>${car.currentDriverName}</span><div class="custody-meta"><i class="fas fa-user-cog"></i> ${t('assignedBy')}: ${assignedByName} ${car.currentAssignedAt ? ` - ${fmtDate(car.currentAssignedAt)}` : ''}</div></div>` : `<div class="current-driver-box"><i class="fas fa-user-slash"></i> ${t('noDriver')}</div>`;
  el.innerHTML = `<div class="card-header"><div class="card-title">${car.id}</div><div class="owner-name-box"><i class="fas fa-user-tie"></i> ${t('owner')}: ${car.owner}</div><div class="plate-design"><span class="plate-number">${car.plateNumber}</span> <span class="plate-sep">|</span> <span class="plate-code">${car.plateCode}</span> <span class="plate-sep">|</span> <span class="plate-emirate">${car.emirate}</span></div>${driverHtml}</div><div class="card-body"><div class="info-grid"><div class="info-chip"><span class="chip-label">${t('carType')}/${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div><div class="info-chip"><span class="chip-label">${t('vin')}</span><span class="chip-value">${car.vin}</span></div><div class="info-chip ${lSt}"><span class="chip-label">${t('licenseExpiry')} (${getStatusText(car.licenseExpiry)})</span><span class="chip-value">${fmtDate(car.licenseExpiry)}</span></div><div class="info-chip ${iSt}"><span class="chip-label">${t('insuranceExpiry')} (${getStatusText(car.insuranceExpiry)})</span><span class="chip-value">${fmtDate(car.insuranceExpiry)}</span></div>${car.notes?`<div class="info-chip full-width"><span class="chip-label">${t('notes')}</span><span class="chip-value">${car.notes}</span></div>`:''}${car.violations?`<div class="info-chip full-width violations-chip"><span class="chip-label">${t('violations')}</span><span class="chip-value">${car.violations}</span></div>`:''}</div><div class="card-actions">${!hasDriver?`<button class="btn-action assign" style="background:var(--primary-dark)"><i class="fas fa-link"></i> ${t('assign')}</button>`:`<button class="btn-action unassign" style="background:var(--yellow);color:#333"><i class="fas fa-unlink"></i> ${t('unassign')}</button>`}<button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button><button class="btn-action print" style="background:#17a2b8"><i class="fas fa-print"></i> ${t('print')}</button><button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button><button class="btn-action share" style="background:#6c757d"><i class="fas fa-share"></i></button></div></div>`;
  el.querySelector('.card-header').addEventListener('click', e=>{ if(!e.target.closest('.btn-action') && !e.target.closest('.driver-car-item')) el.classList.toggle('expanded'); });
  el.querySelector('.edit').addEventListener('click', e=>{ e.stopPropagation(); openCarModal(car); });
  el.querySelector('.delete').addEventListener('click', e=>{ e.stopPropagation(); deleteCar(car.id); });
  el.querySelector('.print').addEventListener('click', e=>{ e.stopPropagation(); printCard(car); });
  el.querySelector('.share').addEventListener('click', e=>{ e.stopPropagation(); shareCard(car); });
  el.querySelector('.history').addEventListener('click', e=>{ e.stopPropagation(); showCustodyHistory('car',car.id); });
  if(hasDriver) {
    el.querySelector('.unassign').addEventListener('click', e=>{ e.stopPropagation(); unassignCar(car); });
    const driverBox = el.querySelector('.current-driver-box');
    if(driverBox) { driverBox.style.cursor='pointer'; driverBox.addEventListener('click', e=>{ e.stopPropagation(); navigateToDriver(car.currentDriverId); }); }
  } else {
    el.querySelector('.assign').addEventListener('click', e=>{ e.stopPropagation(); openCustodyModal('car',car.id); });
  }
  return el;
}
function printCard(car) { /* كما هو */ }
function shareCard(car) { /* كما هو */ }

// DRIVERS (لا تغيير في عرض الاسم)
document.getElementById('add-driver-btn')?.addEventListener('click', () => openDriverModal());
document.getElementById('load-more-drivers')?.addEventListener('click', () => renderDrivers(true));
document.getElementById('search-driver')?.addEventListener('input', applyDriverSearch);
function openDriverModal(data=null) { /* كما هو */ }
document.getElementById('driver-form').addEventListener('submit', async e => { /* كما هو مع الاحتفاظ */ });
async function deleteDriver(id) { /* كما هو */ }
function fetchDrivers() { onValue(ref(db,'drivers'), snap => { allDrivers = snap.exists() ? Object.values(snap.val()) : []; applyDriverSearch(); }); }
function applyDriverSearch() { /* كما هو */ }
function renderDrivers(append) { /* كما هو */ }
function createDriverCard(d) { /* كما هو مع عرض car.currentAssignedByName في المستقبل لكن لا حاجة */ }

// CUSTODY (تعديل openCustodyModal و submit)
function openCustodyModal(sourceType, sourceId) {
  document.getElementById('custody-mode').value = sourceType;
  document.getElementById('custody-source-id').value = sourceId;
  document.getElementById('custody-car-display-group').style.display = 'none';
  document.getElementById('custody-driver-select-group').style.display = 'none';
  document.getElementById('custody-driver-display-group').style.display = 'none';
  document.getElementById('custody-car-select-group').style.display = 'none';
  if(sourceType === 'car') {
    document.getElementById('custody-car-display-group').style.display = 'flex';
    document.getElementById('custody-driver-select-group').style.display = 'flex';
    const carData = allCars.find(c => c.id === sourceId);
    document.getElementById('custody-car-display').value = `${carData.plateNumber}|${carData.plateCode}`;
    const sel = document.getElementById('custody-driver-select');
    sel.innerHTML='<option value="">--</option>';
    allDrivers.forEach(d=>{ const o=document.createElement('option'); o.value=d.id; o.textContent=`${d.name} (${d.contact})`; sel.appendChild(o); });
  } else {
    document.getElementById('custody-driver-display-group').style.display = 'flex';
    document.getElementById('custody-car-select-group').style.display = 'flex';
    const driverData = allDrivers.find(d=>d.id===sourceId);
    document.getElementById('custody-driver-display').value = driverData.name;
    const sel = document.getElementById('custody-car-select');
    sel.innerHTML='<option value="">--</option>';
    allCars.filter(c=>!c.currentDriverId).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=`${c.id} - ${c.plateNumber}|${c.plateCode}`; sel.appendChild(o); });
  }
  document.getElementById('custody-modal').style.display='block';
}
document.getElementById('custody-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const mode=document.getElementById('custody-mode').value;
  const sourceId=document.getElementById('custody-source-id').value;
  let carId, driverId;
  if(mode==='car'){ carId=sourceId; driverId=document.getElementById('custody-driver-select').value; if(!driverId){alert(t('selectDriver'));return;} }
  else { driverId=sourceId; carId=document.getElementById('custody-car-select').value; if(!carId){alert(t('selectCar'));return;} }
  try {
    const carData = allCars.find(c=>c.id===carId);
    if(carData.currentDriverId){alert('السيارة مرتبطة بالفعل');return;}
    await assignCustody(carId, driverId, auth.currentUser.email, currentUserData.name);
    document.getElementById('custody-modal').style.display='none';
  } catch(err){alert(err.message)}
});
async function showCustodyHistory(type,id) {
  document.getElementById('history-tbody').innerHTML = '';
  try {
    const snap = await get(ref(db,'custodyHistory'));
    let records=[];
    if(snap.exists()){
      const data=snap.val();
      for(let k in data){
        if((type==='car' && data[k].carId===id) || (type==='driver' && data[k].driverId===id)) records.push(data[k]);
      }
    }
    records.sort((a,b)=>new Date(b.startTime)-new Date(a.startTime));
    const tbody=document.getElementById('history-tbody');
    if(records.length===0){
      tbody.innerHTML=`<tr><td colspan="5" style="text-align:center">${t('none')}<\/td></tr>`;
    } else {
      records.forEach(r=>{
        const tr=document.createElement('tr');
        const assignedDisplay = r.assignedByName || r.assignedByEmail || '?';
        const unassignedDisplay = r.unassignedByName || r.unassignedByEmail || '-';
        tr.innerHTML=`<td>${type==='car'?r.driverName:r.carPlate}<\/td><td>${fmtDateTime(r.startTime)}<\/td><td>${r.endTime?fmtDateTime(r.endTime):`<b style="color:var(--green)">${t('untilNow')}</b>`}<\/td><td>${assignedDisplay}<\/td><td>${unassignedDisplay}<\/td>`;
        tbody.appendChild(tr);
      });
    }
    document.getElementById('history-modal').style.display='block';
  } catch(err){alert(err);}
}

// MODS (لا تغيير باستثناء logAction يستخدم الاسم تلقائياً)
document.getElementById('add-mod-btn')?.addEventListener('click',()=>{requestPin(()=>{document.getElementById('mod-form').reset();document.getElementById('mod-uid-hidden').value='';document.getElementById('mod-pass-group').style.display='flex';document.getElementById('mod-modal').style.display='block';});});
document.getElementById('load-more-mods')?.addEventListener('click',()=>renderMods(true));
document.getElementById('mod-form').addEventListener('submit',async e=>{e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; const uid=document.getElementById('mod-uid-hidden').value; const name=document.getElementById('mod-name').value, email=document.getElementById('mod-email').value; try { if(uid){ await update(ref(db,`users/${uid}`),{name,email}); await logAction(t('edit'),name); } else { const pass=document.getElementById('mod-pass').value; const cred=await createUserWithEmailAndPassword(secondaryAuth,email,pass); await set(ref(db,`users/${cred.user.uid}`),{email,name,role:'moderator',status:'active'}); await logAction(t('addMod'),name); } document.getElementById('mod-modal').style.display='none'; } catch(err){alert(err.message)} finally{btn.disabled=false;btn.textContent=t('save');} });
function fetchMods(){ onValue(ref(db,'users'), snap=>{ allMods=snap.exists()?Object.keys(snap.val()).map(k=>({...snap.val()[k],id:k})).filter(u=>u.role==='moderator'):[]; modsShown=0; renderMods(false); }); }
function renderMods(append){ const c=document.getElementById('mods-container'); if(!c) return; if(!append) c.innerHTML=''; const items=allMods.slice(modsShown,modsShown+LIMIT); items.forEach(u=>c.appendChild(createModCard(u))); modsShown+=items.length; document.getElementById('load-more-mods').style.display=modsShown<allMods.length?'inline-block':'none'; }
function createModCard(u){ /* كما هو */ }

// LOGS (تعديل العرض لاستخدام userName)
document.getElementById('load-more-logs')?.addEventListener('click',()=>renderLogs(true));
function fetchLogs(){ onValue(ref(db,'logs'), snap=>{ allLogs=snap.exists()?Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)):[]; logsShown=0; renderLogs(false); }); }
function renderLogs(append){
  const tb=document.getElementById('logs-tbody');
  if(!tb) return;
  if(!append) tb.innerHTML='';
  const items=allLogs.slice(logsShown,logsShown+LIMIT);
  items.forEach(l=>{
    const tr=document.createElement('tr');
    const userDisplay = l.userName || l.userId || '?';
    tr.innerHTML=`<td>${fmtDateTime(l.timestamp)}<\/td><td>${userDisplay}<\/td><td>${l.action}<\/td><td>${l.details}<\/td>`;
    tb.appendChild(tr);
  });
  logsShown+=items.length;
  document.getElementById('load-more-logs').style.display=logsShown<allLogs.length?'inline-block':'none';
}

// PENDING REQUESTS (تعديل approveRequest لاستخدام اسم المستخدم)
async function fetchPendingRequests(){ onValue(ref(db,'pendingCarRequests'), snap=>{ allPendingRequests=snap.exists()?Object.keys(snap.val()).map(k=>({id:k,...snap.val()[k]})).filter(r=>r.status==='pending'):[]; pendingShown=0; renderPendingRequests(); }); }
function renderPendingRequests(){ /* كما هو */ }
async function approveRequest(requestId){
  const req=allPendingRequests.find(r=>r.id===requestId);
  if(!req) return;
  const carData={ plateNumber:req.plateNumber, plateCode:req.plateCode, emirate:req.emirate, type:req.carType, owner:'', year:'', vin:'', licenseExpiry:'', insuranceExpiry:'', notes:'', violations:'' };
  openCarModal(carData);
  const originalSubmit=document.getElementById('car-form').onsubmit;
  document.getElementById('car-form').onsubmit=async (e)=>{
    e.preventDefault();
    const btn=e.target.querySelector('button');
    btn.disabled=true;
    const hid=document.getElementById('car-id-hidden').value;
    const vin=document.getElementById('vin').value.trim();
    const pNum=document.getElementById('plate-number').value.trim();
    const pCode=document.getElementById('plate-code').value.trim();
    const emi=document.getElementById('emirate').value.trim();
    try {
      const snap=await get(ref(db,'cars'));
      if(snap.exists()){
        const cars=snap.val();
        for(let k in cars){
          if(cars[k].vin===vin && (!hid||k!==hid)){alert(t('dupVin'));btn.disabled=false;return;}
          if(cars[k].plateNumber===pNum&&cars[k].plateCode===pCode&&cars[k].emirate===emi && (!hid||k!==hid)){alert(t('dupPlate'));btn.disabled=false;return;}
        }
      }
      const data={ plateNumber:pNum, plateCode:pCode, emirate:emi, owner:document.getElementById('owner').value.trim(), type:document.getElementById('car-type').value.trim(), year:document.getElementById('car-year').value.trim(), vin:vin, licenseExpiry:document.getElementById('license-expiry').value, insuranceExpiry:document.getElementById('insurance-expiry').value, notes:document.getElementById('car-notes').value.trim(), violations:document.getElementById('violations').value.trim(), currentDriverId:null, currentDriverName:null, currentAssignedByEmail:null, currentAssignedByName:null, currentAssignedAt:null };
      let carId;
      if(hid){ carId=hid; await update(ref(db,`cars/${carId}`),data); }
      else { carId=await generateCarId(); data.id=carId; await set(ref(db,`cars/${carId}`),data); }
      await assignCustody(carId, req.driverId, auth.currentUser.email, currentUserData.name);
      await update(ref(db,`pendingCarRequests/${requestId}`),{ status:'approved', approvedBy:auth.currentUser.email, approvedByName:currentUserData.name, finalCarId:carId });
      await logAction(t('approve'),`Car request ${requestId} approved, car ${carId} assigned`);
      document.getElementById('car-modal').style.display='none';
      document.getElementById('car-form').onsubmit=originalSubmit;
    } catch(err){alert(err.message)}
    finally{btn.disabled=false;btn.textContent=t('save');}
  };
  document.getElementById('car-modal').style.display='block';
}
async function rejectRequest(requestId){ /* كما هو */ }

// DRIVER DASHBOARD (مع تحسين معالجة الأخطاء)
async function initDriverDashboard(){
  if(!isDriver || !currentDriverId){
    console.warn("initDriverDashboard called but not driver or no driverId");
    return;
  }
  try {
    const driverSnap=await get(ref(db,`drivers/${currentDriverId}`));
    if(!driverSnap.exists()){
      console.error("Driver not found in drivers:", currentDriverId);
      alert(t('driverLoadError') + ": لم يتم العثور على بيانات السائق");
      return;
    }
    const driver=driverSnap.val();
    document.getElementById('driver-name-display').textContent=driver.name;
    document.getElementById('driver-contact-display').textContent=driver.contact;
    document.getElementById('driver-email-display').textContent=currentUserData.email;
    const custodySnap=await get(ref(db,'custodyHistory'));
    let activeCustodies=[], pastCustodies=[];
    if(custodySnap.exists()){
      const histories=Object.values(custodySnap.val());
      activeCustodies=histories.filter(h=>h.driverId===currentDriverId && !h.endTime);
      pastCustodies=histories.filter(h=>h.driverId===currentDriverId && h.endTime);
    }
    const currentCarsContainer=document.getElementById('driver-current-cars');
    const pastCarsContainer=document.getElementById('driver-past-cars');
    currentCarsContainer.innerHTML='';
    pastCarsContainer.innerHTML='';
    for(let custody of activeCustodies){
      const carSnap=await get(ref(db,`cars/${custody.carId}`));
      if(carSnap.exists()) currentCarsContainer.appendChild(createSimpleCarCard(carSnap.val(),custody));
    }
    for(let custody of pastCustodies){
      const carSnap=await get(ref(db,`cars/${custody.carId}`));
      if(carSnap.exists()) pastCarsContainer.appendChild(createPastCarCard(carSnap.val(),custody));
    }
  } catch(err){
    console.error("Error in initDriverDashboard:", err);
    alert(t('driverLoadError') + ": " + err.message);
  }
}
function createSimpleCarCard(car,custody){ /* كما هو مع عرض اسم المعين إذا أردت ولكن ليس ضرورياً */ }
function createPastCarCard(car,custody){ /* كما هو */ }
document.getElementById('driver-add-car-form')?.addEventListener('submit', async e=>{ /* كما هو مع استخدام currentUserData.name في logs */ });

// STATS
function setupStatClicks(){ /* كما هو */ }
function calculateStats(){ /* كما هو */ }

// Service Worker
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js'));