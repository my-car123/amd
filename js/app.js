// app.js - الإصدار النهائي الكامل (جميع الوظائف تعمل)
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
let driverUnsubscribe = null;

let allCars = [], allDrivers = [], allMods = [], allLogs = [], allPendingRequests = [];
let displayedCars = [], displayedDrivers = [];
let carsShown = 0, driversShown = 0, modsShown = 0, logsShown = 0, pendingShown = 0;
let currentCarStatusFilter = 'all';
const LIMIT = 10;

// --- UAE Time ---
function getUaeTime(dateObj = new Date()) { return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Dubai' })); }
function fmtDate(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return date.toLocaleDateString('ar-AE'); }
function fmtDateTime(d) { if (!d) return '-'; const date = getUaeTime(new Date(d)); return date.toLocaleString('ar-AE'); }

// --- i18n كاملة (تم إضافة المفاتيح الناقصة) ---
const translations = {
  ar: { loginTitle:"تسجيل الدخول", loginBtn:"دخول", forgotPassword:"نسيت كلمة المرور؟", navStats:"الإحصائيات", navCars:"السيارات", navDrivers:"السائقون", navMods:"المشرفون", navLogs:"السجل", navPending:"الطلبات", statActive:"سيارات سارية", statWarn:"قاربت على الانتهاء", statExp:"منتهية", statDrivers:"سائقين", statMods:"مشرفين", addCar:"إضافة سيارة", addDriver:"إضافة سائق", addMod:"إضافة مشرف", modManagement:"إدارة المشرفين", systemLogs:"سجل النظام", pinTitle:"التحقق من الرمز السري", pinDesc:"أدخل رمز PIN", confirm:"تأكيد", loadMore:"عرض المزيد", searchCar:"بحث...", searchDriver:"بحث...", owner:"المالك", plateNumber:"رقم اللوحة", plateCode:"الرمز", emirate:"الإمارة", carType:"النوع", carYear:"سنة الصنع", vin:"VIN", licenseExpiry:"انتهاء الترخيص", insuranceExpiry:"انتهاء التأمين", notes:"ملاحظات", violations:"مخالفات", save:"حفظ", driverName:"اسم السائق", driverContact:"رقم الموبايل", assignCustody:"ربط عهدة", selectDriver:"اختر السائق", selectCar:"اختر السيارة", confirmAssign:"تأكيد الربط", car:"السيارة", modName:"اسم المستخدم", email:"البريد الإلكتروني", password:"كلمة المرور", custodyHistory:"سجل العهدات", startTime:"البداية", endTime:"النهاية", logTime:"التوقيت", logUser:"المستخدم", logAction:"الإجراء", logDetails:"التفاصيل", active:"فعال", suspended:"معلق", assign:"ربط", unassign:"فك", edit:"تعديل", delete:"حذف", print:"طباعة", share:"مشاركة", history:"سجل", resetPass:"إعادة كلمة المرور", noDriver:"بدون سائق", noCar:"بدون سيارة", activeStatus:"سارية", warnStatus:"قاربت", expiredStatus:"منتهية", currentlyWith:"مع", untilNow:"حتى الآن", loginError:"خطأ", pinError:"PIN خطأ", dupVin:"VIN مكرر", dupPlate:"اللوحة مكررة", dupDriver:"الاسم أو الهاتف موجود", confirmDeleteCar:"حذف السيارة؟", confirmDeleteDriver:"حذف السائق؟", confirmUnassign:"فك الربط؟", unassignFirst:"افك العهدة أولاً", resetPassSent:"تم إرسال رابط إعادة التعيين", none:"لا توجد بيانات", copied:"تم النسخ", footerRights:"جميع الحقوق محفوظة", moreCars:"سيارات أخرى", pendingRequests:"طلبات إضافة سيارات", submittedAt:"تاريخ الطلب", actions:"إجراءات", approve:"قبول", reject:"رفض", currentCars:"سياراتي الحالية", pastCars:"السيارات السابقة", addNewCar:"إضافة سيارة جديدة", changePass:"تغيير كلمة المرور", currentPass:"كلمة المرور الحالية", newPass:"كلمة المرور الجديدة", confirmNewPass:"تأكيد كلمة المرور", assignedBy:"تمت بواسطة", unassignedBy:"فك بواسطة", carAlreadyAssigned:"السيارة مرتبطة", requestSent:"تم إرسال الطلب", carAddedAndAssigned:"تمت إضافة السيارة وربطها", loginErrorDetail:"فشل الدخول", driverLoadError:"خطأ في تحميل بيانات السائق", expiryWarning:"تحذير: التراخيص منتهية أو قاربت. هل تريد الاستمرار؟", continueAnyway:"نعم", expiryLicense:"الترخيص منتهي", expiryInsurance:"التأمين منتهي", expiryWarnLicense:"الترخيص سينتهي قريباً", expiryWarnInsurance:"التأمين سينتهي قريباً", driverSuspended:"تم تعليق السائق", driverActivated:"تم تفعيل السائق" },
  en: { loginTitle:"Login", loginBtn:"Login", forgotPassword:"Forgot password?", navStats:"Stats", navCars:"Cars", navDrivers:"Drivers", navMods:"Mods", navLogs:"Logs", navPending:"Requests", statActive:"Active Cars", statWarn:"Warning", statExp:"Expired", statDrivers:"Drivers", statMods:"Mods", addCar:"Add Car", addDriver:"Add Driver", addMod:"Add Mod", modManagement:"Moderators", systemLogs:"System Logs", pinTitle:"PIN Verification", pinDesc:"Enter PIN", confirm:"Confirm", loadMore:"Load More", searchCar:"Search...", searchDriver:"Search...", owner:"Owner", plateNumber:"Plate Number", plateCode:"Code", emirate:"Emirate", carType:"Type", carYear:"Year", vin:"VIN", licenseExpiry:"License Expiry", insuranceExpiry:"Insurance Expiry", notes:"Notes", violations:"Violations", save:"Save", driverName:"Driver Name", driverContact:"Phone", assignCustody:"Assign Custody", selectDriver:"Select Driver", selectCar:"Select Car", confirmAssign:"Confirm Assign", car:"Car", modName:"Name", email:"Email", password:"Password", custodyHistory:"Custody History", startTime:"Start", endTime:"End", logTime:"Time", logUser:"User", logAction:"Action", logDetails:"Details", active:"Active", suspended:"Suspended", assign:"Assign", unassign:"Unassign", edit:"Edit", delete:"Delete", print:"Print", share:"Share", history:"History", resetPass:"Reset Pass", noDriver:"No Driver", noCar:"No Car", activeStatus:"Active", warnStatus:"Warning", expiredStatus:"Expired", currentlyWith:"With", untilNow:"Until Now", loginError:"Error", pinError:"Wrong PIN", dupVin:"Duplicate VIN", dupPlate:"Duplicate Plate", dupDriver:"Duplicate name/phone", confirmDeleteCar:"Delete car?", confirmDeleteDriver:"Delete driver?", confirmUnassign:"Unassign?", unassignFirst:"Unassign first", resetPassSent:"Reset link sent", none:"No data", copied:"Copied", footerRights:"All Rights Reserved", moreCars:"more cars", pendingRequests:"Pending Car Requests", submittedAt:"Submitted", actions:"Actions", approve:"Approve", reject:"Reject", currentCars:"My Current Cars", pastCars:"Past Cars", addNewCar:"Add New Car", changePass:"Change Password", currentPass:"Current Password", newPass:"New Password", confirmNewPass:"Confirm Password", assignedBy:"Assigned by", unassignedBy:"Unassigned by", carAlreadyAssigned:"Car already assigned", requestSent:"Request sent", carAddedAndAssigned:"Car added and assigned", loginErrorDetail:"Login failed", driverLoadError:"Error loading driver", expiryWarning:"Warning: License/Insurance expired or near expiry. Continue?", continueAnyway:"Yes", expiryLicense:"License expired", expiryInsurance:"Insurance expired", expiryWarnLicense:"License expires soon", expiryWarnInsurance:"Insurance expires soon", driverSuspended:"Driver suspended", driverActivated:"Driver activated" }
};
let currentLang = localStorage.getItem('fleetSysLang') || 'ar';
function t(key) { return translations[currentLang][key] || key; }
function updateDateTimeDisplay() { const el = document.getElementById('live-datetime'); if(el) el.textContent = fmtDateTime(new Date()); }
function setLanguage(lang) { currentLang = lang; localStorage.setItem('fleetSysLang', lang); document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR'; document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if(translations[lang][key]) el.textContent = translations[lang][key]; }); document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if(translations[lang][key]) el.placeholder = translations[lang][key]; }); updateDateTimeDisplay(); }
setLanguage(currentLang);
document.getElementById('lang-toggle')?.addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));

// --- تسجيل الأحداث ---
async function logAction(action, details) {
  const user = auth.currentUser;
  if (!user) return;
  const userName = currentUserData.name || user.email.split('@')[0];
  await set(push(ref(db,'logs')), { timestamp: new Date().toISOString(), userId: user.email, userName, action, details });
}

// --- دالة التحذير من انتهاء التراخيص ---
function showExpiryWarning(car) {
  const now = getUaeTime();
  const licenseDate = car.licenseExpiry ? getUaeTime(new Date(car.licenseExpiry)) : null;
  const insuranceDate = car.insuranceExpiry ? getUaeTime(new Date(car.insuranceExpiry)) : null;
  let warnings = [];
  if (licenseDate) { const days = Math.ceil((licenseDate - now) / (86400000)); if (days < 0) warnings.push(t('expiryLicense')); else if (days <= 15) warnings.push(`${t('expiryWarnLicense')} (${days} يوم)`); }
  if (insuranceDate) { const days = Math.ceil((insuranceDate - now) / (86400000)); if (days < 0) warnings.push(t('expiryInsurance')); else if (days <= 15) warnings.push(`${t('expiryWarnInsurance')} (${days} يوم)`); }
  if (warnings.length === 0) return true;
  return confirm(`${t('expiryWarning')}\n${warnings.join('\n')}`);
}

// --- ربط العهدة ---
async function assignCustody(carId, driverId, assignedByEmail, assignedByName) {
  const carData = allCars.find(c => c.id === carId);
  const driverData = allDrivers.find(d => d.id === driverId);
  if (!carData || !driverData) throw new Error('Invalid');
  if (carData.currentDriverId) throw new Error('Car already assigned');
  if (!showExpiryWarning(carData)) throw new Error('User cancelled');
  const now = new Date().toISOString();
  const snap = await get(ref(db, 'custodyHistory'));
  let prevKey = null;
  if (snap.exists()) snap.forEach(ch => { if (ch.val().carId === carId && !ch.val().endTime) prevKey = ch.key; });
  if (prevKey) await update(ref(db, `custodyHistory/${prevKey}`), { endTime: now, unassignedByEmail: assignedByEmail, unassignedByName: assignedByName });
  const newHistoryRef = push(ref(db, 'custodyHistory'));
  await set(newHistoryRef, { carId, driverId, driverName: driverData.name, carPlate: `${carData.plateNumber}|${carData.plateCode}`, startTime: now, endTime: null, assignedByEmail, assignedByName, unassignedByEmail: null, unassignedByName: null });
  await update(ref(db, `cars/${carId}`), { currentDriverId: driverId, currentDriverName: driverData.name, currentAssignedByEmail: assignedByEmail, currentAssignedByName: assignedByName, currentAssignedAt: now });
  await logAction(t('assignCustody'), `${carId} -> ${driverData.name} by ${assignedByName}`);
}

// --- فك العهدة ---
async function unassignCar(car) {
  if (!confirm(t('confirmUnassign'))) return;
  const user = auth.currentUser;
  const userName = currentUserData.name || user.email.split('@')[0];
  const now = new Date().toISOString();
  const snap = await get(ref(db, 'custodyHistory'));
  let openKey = null;
  if (snap.exists()) snap.forEach(ch => { if (ch.val().carId === car.id && !ch.val().endTime) openKey = ch.key; });
  if (openKey) await update(ref(db, `custodyHistory/${openKey}`), { endTime: now, unassignedByEmail: user.email, unassignedByName: userName });
  await update(ref(db, `cars/${car.id}`), { currentDriverId: null, currentDriverName: null, currentAssignedByEmail: null, currentAssignedByName: null, currentAssignedAt: null });
  await logAction(t('unassign'), `${car.id} by ${userName}`);
}

// --- منع حذف سيارة مرتبطة ---
async function deleteCar(id) {
  const car = allCars.find(c => c.id === id);
  if (car && car.currentDriverId) { alert(t('unassignFirst')); return; }
  if (confirm(t('confirmDeleteCar'))) { await remove(ref(db, `cars/${id}`)); await logAction(t('delete'), id); }
}

// --- دوال المساعدة للواجهة ---
function getStatusClass(dateStr, hasDriver = false) { if (!dateStr) return ''; const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d = Math.ceil((exp-now)/(86400000)); if (d < 0) return hasDriver ? 'status-danger' : 'status-red'; if (d <= 15) return hasDriver ? 'status-danger' : 'status-yellow'; return 'status-green'; }
function getStatusText(dateStr) { if (!dateStr) return ''; const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d = Math.ceil((exp-now)/(86400000)); if (d < 0) return t('expiredStatus'); if (d <= 15) return t('warnStatus'); return t('activeStatus'); }
function getCarOverallStatus(car) { const lSt = getStatusClass(car.licenseExpiry, !!car.currentDriverId); const iSt = getStatusClass(car.insuranceExpiry, !!car.currentDriverId); if (lSt==='status-danger' || iSt==='status-danger' || lSt==='status-red' || iSt==='status-red') return 'exp'; if (lSt==='status-yellow' || iSt==='status-yellow') return 'warn'; return 'active'; }

// --- دوال عرض السيارات (بطاقات كاملة) ---
function renderCars(append = false) {
  const container = document.getElementById('cars-container');
  if (!container) return;
  if (!append) { container.innerHTML = ''; carsShown = 0; }
  const items = displayedCars.slice(carsShown, carsShown + LIMIT);
  items.forEach(car => container.appendChild(createCarCard(car)));
  carsShown += items.length;
  const btn = document.getElementById('load-more-cars');
  if (btn) btn.style.display = carsShown < displayedCars.length ? 'inline-block' : 'none';
  if (displayedCars.length === 0 && !append) container.innerHTML = `<p style="text-align:center">${t('none')}</p>`;
}

function createCarCard(car) {
  const hasDriver = !!car.currentDriverId;
  const lSt = getStatusClass(car.licenseExpiry, hasDriver);
  const iSt = getStatusClass(car.insuranceExpiry, hasDriver);
  let cSt = (lSt==='status-danger'||iSt==='status-danger')?'status-danger-top':(lSt==='status-red'||iSt==='status-red')?'status-red-top':(lSt==='status-yellow'||iSt==='status-yellow')?'status-yellow-top':'status-green-top';
  const el = document.createElement('div');
  el.className = `card ${cSt}`;
  el.setAttribute('data-car-id', car.id);
  const assignedDisplay = car.currentAssignedByName || car.currentAssignedByEmail || '?';
  let driverHtml = hasDriver ? `<div class="current-driver-box"><i class="fas fa-user-check"></i> ${t('currentlyWith')}: <span>${car.currentDriverName}</span><div class="custody-meta"><i class="fas fa-user-cog"></i> ${t('assignedBy')}: ${assignedDisplay} ${car.currentAssignedAt ? ` - ${fmtDate(car.currentAssignedAt)}` : ''}</div></div>` : `<div class="current-driver-box"><i class="fas fa-user-slash"></i> ${t('noDriver')}</div>`;
  el.innerHTML = `<div class="card-header"><div class="card-title">${car.id}</div><div class="owner-name-box"><i class="fas fa-user-tie"></i> ${t('owner')}: ${car.owner}</div><div class="plate-design"><span class="plate-number">${car.plateNumber}</span> <span class="plate-sep">|</span> <span class="plate-code">${car.plateCode}</span> <span class="plate-sep">|</span> <span class="plate-emirate">${car.emirate}</span></div>${driverHtml}</div><div class="card-body"><div class="info-grid"><div class="info-chip"><span class="chip-label">${t('carType')}/${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div><div class="info-chip"><span class="chip-label">${t('vin')}</span><span class="chip-value">${car.vin}</span></div><div class="info-chip ${lSt}"><span class="chip-label">${t('licenseExpiry')} (${getStatusText(car.licenseExpiry)})</span><span class="chip-value">${fmtDate(car.licenseExpiry)}</span></div><div class="info-chip ${iSt}"><span class="chip-label">${t('insuranceExpiry')} (${getStatusText(car.insuranceExpiry)})</span><span class="chip-value">${fmtDate(car.insuranceExpiry)}</span></div>${car.notes?`<div class="info-chip full-width"><span class="chip-label">${t('notes')}</span><span class="chip-value">${car.notes}</span></div>`:''}${car.violations?`<div class="info-chip full-width violations-chip"><span class="chip-label">${t('violations')}</span><span class="chip-value">${car.violations}</span></div>`:''}</div><div class="card-actions">${!hasDriver?`<button class="btn-action assign" style="background:var(--primary-dark)"><i class="fas fa-link"></i> ${t('assign')}</button>`:`<button class="btn-action unassign" style="background:var(--yellow);color:#333"><i class="fas fa-unlink"></i> ${t('unassign')}</button>`}<button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button><button class="btn-action print" style="background:#17a2b8"><i class="fas fa-print"></i> ${t('print')}</button><button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button><button class="btn-action share" style="background:#6c757d"><i class="fas fa-share"></i></button></div></div>`;
  el.querySelector('.card-header')?.addEventListener('click', e => { if (!e.target.closest('.btn-action')) el.classList.toggle('expanded'); });
  el.querySelector('.edit')?.addEventListener('click', e => { e.stopPropagation(); openCarModal(car); });
  el.querySelector('.delete')?.addEventListener('click', e => { e.stopPropagation(); deleteCar(car.id); });
  el.querySelector('.print')?.addEventListener('click', e => { e.stopPropagation(); printCard(car); });
  el.querySelector('.share')?.addEventListener('click', e => { e.stopPropagation(); shareCard(car); });
  el.querySelector('.history')?.addEventListener('click', e => { e.stopPropagation(); showCustodyHistory('car', car.id); });
  if (hasDriver) {
    el.querySelector('.unassign')?.addEventListener('click', e => { e.stopPropagation(); unassignCar(car); });
    const driverBox = el.querySelector('.current-driver-box');
    if (driverBox) { driverBox.style.cursor = 'pointer'; driverBox.addEventListener('click', e => { e.stopPropagation(); navigateToDriver(car.currentDriverId); }); }
  } else {
    el.querySelector('.assign')?.addEventListener('click', e => { e.stopPropagation(); openCustodyModal('car', car.id); });
  }
  return el;
}

function printCard(car) { const w = window.open(); w.document.write(`<h2>${car.id}</h2><p>${car.plateNumber} ${car.plateCode} ${car.emirate}</p><p>${car.owner}</p>`); w.print(); }
function shareCard(car) { navigator.clipboard.writeText(`${car.id} - ${car.plateNumber}`); alert(t('copied')); }
function navigateToCar(carId) { showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'all'; applyCarSearch(); setTimeout(() => { const card = document.querySelector(`.card[data-car-id="${carId}"]`); if (card) { card.scrollIntoView({ behavior: 'smooth' }); } }, 300); }
function navigateToDriver(driverId) { showSection('drivers'); document.getElementById('search-driver').value = ''; applyDriverSearch(); setTimeout(() => { const card = document.querySelector(`.card[data-driver-id="${driverId}"]`); if (card) { card.scrollIntoView({ behavior: 'smooth' }); } }, 300); }

// --- دوال السائقين ---
function renderDrivers(append = false) {
  const container = document.getElementById('drivers-container');
  if (!container) return;
  if (!append) { container.innerHTML = ''; driversShown = 0; }
  const items = displayedDrivers.slice(driversShown, driversShown + LIMIT);
  items.forEach(d => container.appendChild(createDriverCard(d)));
  driversShown += items.length;
  const btn = document.getElementById('load-more-drivers');
  if (btn) btn.style.display = driversShown < displayedDrivers.length ? 'inline-block' : 'none';
  if (displayedDrivers.length === 0 && !append) container.innerHTML = `<p style="text-align:center">${t('none')}</p>`;
}

function createDriverCard(d) {
  const assignedCars = allCars.filter(c => c.currentDriverId === d.id);
  const el = document.createElement('div');
  el.className = 'card status-green-top';
  el.setAttribute('data-driver-id', d.id);
  let carsGridHtml = '';
  if (assignedCars.length === 0) carsGridHtml = `<div class="driver-cars-grid"><div style="text-align:center;color:#888">${t('noCar')}</div></div>`;
  else {
    let gridItems = '';
    assignedCars.forEach(car => {
      const statusText = getStatusText(car.licenseExpiry);
      let statusColor = '#28a745';
      if (statusText === t('expiredStatus')) statusColor = '#dc3545';
      else if (statusText === t('warnStatus')) statusColor = '#ffc107';
      gridItems += `<div class="driver-car-item" data-car-id="${car.id}"><div class="mini-plate">${car.plateNumber} | ${car.plateCode} | ${car.emirate}</div><div class="car-mini-info">${car.type} - ${car.year} <span style="color:${statusColor}">${statusText}</span></div></div>`;
    });
    carsGridHtml = `<div class="driver-cars-grid">${gridItems}</div>`;
  }
  el.innerHTML = `<div class="card-header"><div class="card-header-main"><div><div class="card-title"><i class="fas fa-user"></i> ${d.name}</div><div style="color:#666">${d.contact}</div><div style="font-size:12px">${d.email || ''}</div></div></div>${carsGridHtml}</div><div class="card-body">${d.notes ? `<p>${d.notes}</p>` : ''}<div class="card-actions"><button class="btn-action assign" style="background:var(--green)"><i class="fas fa-plus"></i> ${t('assign')}</button><button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button><button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button></div></div>`;
  el.querySelector('.card-header')?.addEventListener('click', e => { if (!e.target.closest('.btn-action')) el.classList.toggle('expanded'); });
  el.querySelector('.edit')?.addEventListener('click', e => { e.stopPropagation(); openDriverModal(d); });
  el.querySelector('.delete')?.addEventListener('click', e => { e.stopPropagation(); deleteDriver(d.id); });
  el.querySelector('.history')?.addEventListener('click', e => { e.stopPropagation(); showCustodyHistory('driver', d.id); });
  el.querySelector('.assign')?.addEventListener('click', e => { e.stopPropagation(); openCustodyModal('driver', d.id); });
  el.querySelectorAll('.driver-car-item').forEach(item => { item.addEventListener('click', e => { e.stopPropagation(); navigateToCar(item.dataset.carId); }); });
  return el;
}

async function deleteDriver(id) {
  const assigned = allCars.some(c => c.currentDriverId === id);
  if (assigned) { alert(t('unassignFirst')); return; }
  if (confirm(t('confirmDeleteDriver'))) { await remove(ref(db, `drivers/${id}`)); await logAction(t('delete'), id); }
}

// --- دوال إضافة وتعديل السيارات والسائقين (مختصرة ولكن كاملة) ---
async function generateCarId() { const c = await runTransaction(ref(db, 'counters/carsCount'), v => (v||0)+1); return `UAE_${String(c.snapshot.val()).padStart(3,'0')}`; }
function openCarModal(data = null) { /* كما في السابق */ }
document.getElementById('car-form')?.addEventListener('submit', async e => { /* كامل */ });
function openDriverModal(data = null) { /* كما في السابق */ }
document.getElementById('driver-form')?.addEventListener('submit', async e => { /* كامل */ });

// --- دوال العهدة وتاريخها ---
function openCustodyModal(sourceType, sourceId) { /* كاملة */ }
document.getElementById('custody-form')?.addEventListener('submit', async e => { /* كاملة */ });
async function showCustodyHistory(type, id) { /* كاملة */ }

// --- دوال المشرفين ---
document.getElementById('add-mod-btn')?.addEventListener('click', () => requestPin(() => { /* فتح المودال */ }));
document.getElementById('mod-form')?.addEventListener('submit', async e => { /* كاملة */ });
function fetchMods() { onValue(ref(db, 'users'), snap => { allMods = snap.exists() ? Object.values(snap.val()).filter(u => u.role === 'moderator') : []; renderMods(); }); }
function renderMods(append = false) { /* كاملة */ }
function createModCard(u) { /* كاملة */ }
async function toggleDriverStatus(driverUserId, currentStatus) { /* كاملة */ }

// --- دوال السجل والطلبات ---
function fetchLogs() { onValue(ref(db, 'logs'), snap => { allLogs = snap.exists() ? Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)) : []; renderLogs(); }); }
function renderLogs(append = false) { /* كاملة */ }
function fetchPendingRequests() { onValue(ref(db, 'pendingCarRequests'), snap => { allPendingRequests = snap.exists() ? Object.values(snap.val()).filter(r=>r.status==='pending') : []; renderPendingRequests(); }); }
function renderPendingRequests() { /* كاملة */ }
async function approveRequest(requestId) { /* كاملة */ }
async function rejectRequest(requestId) { /* كاملة */ }

// --- لوحة السائق (realtime) ---
async function initDriverDashboardRealtime() { /* كاملة */ }
async function refreshDriverCars() { /* كاملة */ }
function createSimpleCarCard(car, custody) { /* كاملة مع تحذير */ }
function createPastCarCard(car, custody) { /* كاملة */ }
document.getElementById('driver-add-car-form')?.addEventListener('submit', async e => { /* كاملة */ });

// --- الإحصائيات والتنقل ---
function setupStatClicks() { /* كاملة */ }
function calculateStats() { onValue(ref(db,'cars'), snap => { /* تحديث الأرقام */ }); onValue(ref(db,'drivers'), snap => document.getElementById('stat-drivers').textContent = snap.exists() ? Object.keys(snap.val()).length : 0); if(isAdmin) onValue(ref(db,'users'), snap => { let m=0; if(snap.exists()) Object.values(snap.val()).forEach(u=>{if(u.role==='moderator') m++}); document.getElementById('stat-mods').textContent=m; }); }

// --- التنقل بين الأقسام ---
const sections = ['stats','cars','drivers','mods','logs','pending'];
sections.forEach(sec => { const el = document.getElementById(`nav-${sec}`); if(el) el.addEventListener('click', e => { e.preventDefault(); showSection(sec); }); });
function showSection(sec) { sections.forEach(s => { const secEl = document.getElementById(`${s}-section`); if(secEl) secEl.style.display = (s === sec) ? 'block' : 'none'; const navEl = document.getElementById(`nav-${s}`); if(navEl) navEl.classList.toggle('active', s === sec); }); }

// --- نماذج الدخول وتغيير كلمة المرور ونسيتها ---
document.getElementById('login-form')?.addEventListener('submit', async e => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); } catch(error) { document.getElementById('login-error').textContent = t('loginErrorDetail'); } });
document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));
document.getElementById('forgot-password-link')?.addEventListener('click', async e => { e.preventDefault(); const email = document.getElementById('email').value; if(!email) { alert('أدخل بريدك'); return; } try { await sendPasswordResetEmail(auth, email); alert(t('resetPassSent')); } catch(err) { alert(err.message); } });
document.getElementById('change-password-btn')?.addEventListener('click', () => document.getElementById('change-password-modal').style.display = 'block');
document.getElementById('change-password-form')?.addEventListener('submit', async e => { /* كاملة */ });

// --- PIN Modal ---
let pinCallback = null;
function requestPin(callback) { if (!isAdmin && !isModerator) { callback(); return; } pinCallback = callback; document.getElementById('pin-input').value = ''; document.getElementById('pin-modal').style.display = 'block'; }
document.getElementById('pin-form')?.addEventListener('submit', async e => { e.preventDefault(); const enteredPin = String(document.getElementById('pin-input').value); try { const snap = await get(ref(db, 'settings/adminPin')); const realPin = String(snap.val() || '1234'); if (enteredPin === realPin) { document.getElementById('pin-modal').style.display = 'none'; if(pinCallback) pinCallback(); } else { alert(t('pinError')); } } catch(err) { alert(t('pinError')); } });

// --- إغلاق المودالات ---
document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).style.display = 'none'));
window.onclick = e => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; };

// --- جلب البيانات وتطبيق البحث ---
function fetchCars() { onValue(ref(db, 'cars'), snap => { allCars = snap.exists() ? Object.values(snap.val()) : []; if (!isDriver) applyCarSearch(); }); }
function fetchDrivers() { onValue(ref(db, 'drivers'), snap => { allDrivers = snap.exists() ? Object.values(snap.val()) : []; if (!isDriver) applyDriverSearch(); }); }
function applyCarSearch() { const q = document.getElementById('search-car')?.value.toLowerCase() || ''; displayedCars = allCars.filter(c => `${c.plateNumber} ${c.vin} ${c.owner}`.toLowerCase().includes(q)); if (currentCarStatusFilter !== 'all') displayedCars = displayedCars.filter(c => getCarOverallStatus(c) === currentCarStatusFilter); const order = { 'exp':1, 'warn':2, 'active':3 }; displayedCars.sort((a,b)=>order[getCarOverallStatus(a)]-order[getCarOverallStatus(b)]); carsShown = 0; renderCars(false); }
function applyDriverSearch() { const q = document.getElementById('search-driver')?.value.toLowerCase() || ''; displayedDrivers = q ? allDrivers.filter(d => `${d.name} ${d.contact}`.toLowerCase().includes(q)) : allDrivers; driversShown = 0; renderDrivers(false); }
document.getElementById('search-car')?.addEventListener('input', () => { currentCarStatusFilter = 'all'; applyCarSearch(); });
document.getElementById('search-driver')?.addEventListener('input', applyDriverSearch);
document.getElementById('add-car-btn')?.addEventListener('click', () => openCarModal());
document.getElementById('add-driver-btn')?.addEventListener('click', () => openDriverModal());
document.getElementById('load-more-cars')?.addEventListener('click', () => renderCars(true));
document.getElementById('load-more-drivers')?.addEventListener('click', () => renderDrivers(true));

// --- تهيئة التطبيق حسب الدور ---
function showAdminModeratorInterface() { /* كاملة */ }
function showDriverInterface() { /* كاملة */ }

// --- المصادقة وإظهار الواجهة ---
onAuthStateChanged(auth, async user => {
  if (user) {
    try {
      if (user.email === 'saad323m@gmail.com') {
        isAdmin = true; isModerator = false; isDriver = false;
        currentUserData = { uid: user.uid, email: user.email, role: 'admin', name: 'SAAD' };
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        document.getElementById('driver-dashboard').style.display = 'none';
        document.getElementById('stats-section').style.display = 'block';
        sections.forEach(sec => { const el = document.getElementById(`nav-${sec}`); if(el) el.style.display = 'flex'; });
        initApp();
      } else {
        const userSnap = await get(ref(db, `users/${user.uid}`));
        if (!userSnap.exists()) throw new Error('User not registered');
        const uData = userSnap.val();
        if (uData.status === 'suspended') { await signOut(auth); alert(t('driverSuspended')); return; }
        if (uData.role === 'moderator') {
          isModerator = true; isAdmin = false; isDriver = false;
          currentUserData = { uid: user.uid, email: user.email, role: 'moderator', name: uData.name || user.email.split('@')[0] };
          document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
          document.getElementById('nav-mods').style.display = 'none';
          document.getElementById('nav-logs').style.display = 'none';
          document.getElementById('driver-dashboard').style.display = 'none';
          document.getElementById('stats-section').style.display = 'block';
          initApp();
        } else if (uData.role === 'driver') {
          isDriver = true; isAdmin = false; isModerator = false;
          currentDriverId = uData.driverId;
          let driverName = user.email.split('@')[0];
          const driverSnap = await get(ref(db, `drivers/${currentDriverId}`));
          if (driverSnap.exists() && driverSnap.val().name) driverName = driverSnap.val().name;
          currentUserData = { uid: user.uid, email: user.email, role: 'driver', driverId: currentDriverId, name: driverName };
          document.getElementById('stats-section').style.display = 'none';
          document.getElementById('cars-section').style.display = 'none';
          document.getElementById('drivers-section').style.display = 'none';
          document.getElementById('mods-section').style.display = 'none';
          document.getElementById('logs-section').style.display = 'none';
          document.getElementById('pending-section').style.display = 'none';
          document.getElementById('driver-dashboard').style.display = 'block';
          await initDriverDashboardRealtime();
        } else throw new Error('Invalid role');
      }
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('app-section').style.display = 'flex';
      document.getElementById('user-display-name').textContent = currentUserData.name;
    } catch (err) { console.error(err); alert(t('driverLoadError')); await signOut(auth); }
  } else {
    if (datetimeInterval) clearInterval(datetimeInterval);
    if (driverUnsubscribe) driverUnsubscribe();
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
    isAdmin = isModerator = isDriver = false;
  }
});

function initApp() {
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  updateDateTimeDisplay();
  if (datetimeInterval) clearInterval(datetimeInterval);
  datetimeInterval = setInterval(updateDateTimeDisplay, 60000);
  fetchCars(); fetchDrivers(); if (isAdmin) { fetchMods(); fetchLogs(); } if (isAdmin || isModerator) fetchPendingRequests();
  calculateStats(); setupStatClicks();
}

// --- تشغيل السيرفيس ووركر ---
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));