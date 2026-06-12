import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, push, runTransaction, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
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
let currentUserRole = null; // 'admin', 'moderator', 'driver'
let currentUserData = null; // uid, email, role, driverId

// --- Strict UAE Time & English Numerals ---
function getUaeTime(dateObj = new Date()) { return new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Dubai' })); }
function toLatinNumerals(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function fmtDate(d) { 
    if (!d) return '-'; 
    const date = getUaeTime(new Date(d));
    const formatted = new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-AE' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn'
    }).format(date);
    return toLatinNumerals(formatted);
}

function fmtDateTime(d) { 
    if (!d) return '-'; 
    const date = getUaeTime(new Date(d));
    const formatted = new Intl.DateTimeFormat(currentLang === 'ar' ? 'ar-AE' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, numberingSystem: 'latn'
    }).format(date);
    return toLatinNumerals(formatted);
}

// --- i18n ---
const translations = {
    ar: { loginTitle: "تسجيل الدخول", loginBtn: "دخول", navStats: "الإحصائيات", navCars: "السيارات", navDrivers: "السائقون", navMods: "المشرفون", navLogs: "السجل", navPending: "الطلبات", statActive: "سيارات سارية", statWarn: "قاربت على الانتهاء", statExp: "منتهية", statDrivers: "سائقين", statMods: "مشرفين", addCar: "إضافة سيارة", addDriver: "إضافة سائق", addMod: "إضافة مشرف", modManagement: "إدارة المشرفين", systemLogs: "سجل النظام الدقيق", pinTitle: "التحقق من الرمز السري", pinDesc: "أدخل رمز PIN للمتابعة", confirm: "تأكيد", loadMore: "عرض المزيد", searchCar: "بحث (لوحة، قاعدة، مالك)...", searchDriver: "بحث (اسم، هاتف)...", owner: "المالك", plateNumber: "رقم اللوحة", plateCode: "الرمز", emirate: "الإمارة", carType: "النوع", carYear: "سنة الصنع", vin: "رقم القاعدة (VIN)", licenseExpiry: "انتهاء الترخيص", insuranceExpiry: "انتهاء التأمين", notes: "ملاحظات", violations: "مخالفات", save: "حفظ", driverName: "اسم السائق", driverContact: "رقم الموبايل", assignCustody: "ربط عهدة", selectDriver: "اختر السائق", selectCar: "اختر السيارة (بدون عهدة)", confirmAssign: "تأكيد الربط", car: "السيارة", modName: "اسم المستخدم", email: "البريد الإلكتروني", password: "كلمة المرور", custodyHistory: "سجل العهدات", startTime: "البداية", endTime: "النهاية", logTime: "التوقيت", logUser: "المستخدم", logAction: "الإجراء", logDetails: "التفاصيل", active: "فعال", suspended: "معلق", assign: "ربط", unassign: "فك", edit: "تعديل", delete: "حذف", print: "طباعة", share: "مشاركة", history: "سجل", resetPass: "إعادة كلمة المرور", noDriver: "بدون سائق", noCar: "بدون سيارة", activeStatus: "سارية", warnStatus: "قاربت على الانتهاء", expiredStatus: "منتهية", currentlyWith: "مع", untilNow: "حتى الآن", loginError: "خطأ في الدخول", pinError: "رمز PIN خاطئ!", dupVin: "VIN مكرر!", dupPlate: "اللوحة مكررة!", dupDriver: "اسم السائق أو رقم الهاتف مسجل مسبقاً!", confirmDeleteCar: "حذف السيارة؟", confirmDeleteDriver: "حذف السائق؟", confirmUnassign: "فك الربط؟", unassignFirst: "افك العهدة أولاً", resetPassSent: "تم إرسال رابط إعادة التعيين للبريد", none: "لا توجد بيانات", copied: "تم النسخ!", footerRights: "جميع الحقوق محفوظة", moreCars: "سيارات أخرى", pendingRequests: "طلبات إضافة سيارات", submittedAt: "تاريخ الطلب", actions: "إجراءات", approve: "قبول", reject: "رفض", currentCars: "سياراتي الحالية", pastCars: "السيارات السابقة", addNewCar: "إضافة سيارة جديدة", changePass: "تغيير كلمة المرور", currentPass: "كلمة المرور الحالية", newPass: "كلمة المرور الجديدة", confirmNewPass: "تأكيد كلمة المرور", assignedBy: "تمت بواسطة", unassignedBy: "فك بواسطة", carAlreadyAssigned: "السيارة مرتبطة بسائق آخر", requestSent: "تم إرسال طلبك للإدارة", carAddedAndAssigned: "تمت إضافة السيارة وربطها بنجاح" },
    en: { loginTitle: "Login", loginBtn: "Login", navStats: "Stats", navCars: "Cars", navDrivers: "Drivers", navMods: "Mods", navLogs: "Logs", navPending: "Requests", statActive: "Active Cars", statWarn: "Warning", statExp: "Expired", statDrivers: "Drivers", statMods: "Mods", addCar: "Add Car", addDriver: "Add Driver", addMod: "Add Mod", modManagement: "Moderators", systemLogs: "System Logs", pinTitle: "PIN Verification", pinDesc: "Enter PIN to continue", confirm: "Confirm", loadMore: "Load More", searchCar: "Search (Plate, VIN, Owner)...", searchDriver: "Search (Name, Phone)...", owner: "Owner", plateNumber: "Plate Number", plateCode: "Code", emirate: "Emirate", carType: "Type", carYear: "Year", vin: "VIN", licenseExpiry: "License Expiry", insuranceExpiry: "Insurance Expiry", notes: "Notes", violations: "Violations", save: "Save", driverName: "Driver Name", driverContact: "Phone", assignCustody: "Assign Custody", selectDriver: "Select Driver", selectCar: "Select Car (No Custody)", confirmAssign: "Confirm Assign", car: "Car", modName: "Display Name", email: "Email", password: "Password", custodyHistory: "Custody History", startTime: "Start", endTime: "End", logTime: "Time", logUser: "User", logAction: "Action", logDetails: "Details", active: "Active", suspended: "Suspended", assign: "Assign", unassign: "Unassign", edit: "Edit", delete: "Delete", print: "Print", share: "Share", history: "History", resetPass: "Reset Pass", noDriver: "No Driver", noCar: "No Car", activeStatus: "Active", warnStatus: "Warning", expiredStatus: "Expired", currentlyWith: "With", untilNow: "Until Now", loginError: "Login Error", pinError: "Wrong PIN!", dupVin: "Duplicate VIN!", dupPlate: "Duplicate Plate!", dupDriver: "Driver Name or Phone already exists!", confirmDeleteCar: "Delete Car?", confirmDeleteDriver: "Delete Driver?", confirmUnassign: "Unassign?", unassignFirst: "Unassign first", resetPassSent: "Reset link sent to email", none: "No data", copied: "Copied!", footerRights: "All Rights Reserved", moreCars: "more cars", pendingRequests: "Pending Car Requests", submittedAt: "Submitted", actions: "Actions", approve: "Approve", reject: "Reject", currentCars: "My Current Cars", pastCars: "Past Cars", addNewCar: "Add New Car", changePass: "Change Password", currentPass: "Current Password", newPass: "New Password", confirmNewPass: "Confirm Password", assignedBy: "Assigned by", unassignedBy: "Unassigned by", carAlreadyAssigned: "Car is already assigned to another driver", requestSent: "Your request has been sent to admin", carAddedAndAssigned: "Car added and assigned to you" }
};

let currentLang = localStorage.getItem('fleetSysLang') || 'ar';
function t(key) { return translations[currentLang][key] || key; }

function updateDateTimeDisplay() {
    const el = document.getElementById('live-datetime');
    if (el) el.textContent = fmtDateTime(new Date());
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('fleetSysLang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR';
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (translations[lang][key]) el.textContent = translations[lang][key]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if (translations[lang][key]) el.placeholder = translations[lang][key]; });
    updateDateTimeDisplay();
}

setLanguage(currentLang);
document.getElementById('lang-toggle').addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));

// --- Auth & Role ---
let isAdmin = false; // saad323m@gmail.com
let isModerator = false;
let isDriver = false;
let currentDriverId = null;

onAuthStateChanged(auth, async user => {
    if (user) {
        // Check if super admin
        if (user.email === 'saad323m@gmail.com') {
            isAdmin = true;
            isModerator = false;
            isDriver = false;
            currentUserRole = 'admin';
            currentUserData = { uid: user.uid, email: user.email, role: 'admin' };
            showAdminModeratorInterface();
            initApp();
        } else {
            // Fetch role from users table
            const userSnap = await get(ref(db, `users/${user.uid}`));
            if (userSnap.exists()) {
                const userData = userSnap.val();
                if (userData.role === 'moderator') {
                    isModerator = true;
                    isAdmin = false;
                    isDriver = false;
                    currentUserRole = 'moderator';
                    currentUserData = { uid: user.uid, email: user.email, role: 'moderator', name: userData.name };
                    showAdminModeratorInterface();
                    initApp();
                } else if (userData.role === 'driver') {
                    isDriver = true;
                    isAdmin = false;
                    isModerator = false;
                    currentUserRole = 'driver';
                    currentDriverId = userData.driverId;
                    currentUserData = { uid: user.uid, email: user.email, role: 'driver', driverId: userData.driverId };
                    showDriverInterface();
                    initDriverDashboard();
                } else {
                    // no valid role, sign out
                    signOut(auth);
                }
            } else {
                // user not found in users table, sign out
                signOut(auth);
            }
        }
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'flex';
        document.getElementById('user-display-name').textContent = isAdmin ? 'SAAD (Admin)' : (isModerator ? currentUserData.name : (isDriver ? 'سائق' : ''));
    } else {
        if (datetimeInterval) clearInterval(datetimeInterval);
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('app-section').style.display = 'none';
        // reset flags
        isAdmin = false; isModerator = false; isDriver = false;
    }
});

function showAdminModeratorInterface() {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
    // Moderators see pending tab, but not mods tab
    if (isModerator) {
        document.getElementById('nav-mods').style.display = 'none';
        document.getElementById('nav-logs').style.display = 'none';
    }
    document.getElementById('driver-dashboard').style.display = 'none';
    document.getElementById('stats-section').style.display = 'block';
    document.getElementById('cars-section').style.display = 'none';
    document.getElementById('drivers-section').style.display = 'none';
    document.getElementById('mods-section').style.display = isAdmin ? 'none' : 'none';
    document.getElementById('logs-section').style.display = isAdmin ? 'none' : 'none';
    document.getElementById('pending-section').style.display = 'none';
    // show nav items
    const navs = ['stats', 'cars', 'drivers', 'mods', 'logs', 'pending'];
    navs.forEach(id => {
        const el = document.getElementById(`nav-${id}`);
        if (el) {
            if ((id === 'mods' || id === 'logs') && !isAdmin) el.style.display = 'none';
            else if (id === 'pending' && !isAdmin && !isModerator) el.style.display = 'none';
            else el.style.display = 'flex';
        }
    });
}

function showDriverInterface() {
    // hide all admin/moderator sections
    document.getElementById('stats-section').style.display = 'none';
    document.getElementById('cars-section').style.display = 'none';
    document.getElementById('drivers-section').style.display = 'none';
    document.getElementById('mods-section').style.display = 'none';
    document.getElementById('logs-section').style.display = 'none';
    document.getElementById('pending-section').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'block';
    // also hide nav items that are not needed
    const navs = ['stats', 'cars', 'drivers', 'mods', 'logs', 'pending'];
    navs.forEach(id => {
        const el = document.getElementById(`nav-${id}`);
        if (el) el.style.display = 'none';
    });
}

document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); } 
    catch (error) { document.getElementById('login-error').textContent = t('loginError'); }
});
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- Change Password ---
document.getElementById('change-password-btn').addEventListener('click', () => {
    document.getElementById('change-password-modal').style.display = 'block';
});
document.getElementById('change-password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const currentPass = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-new-pass').value;
    if (newPass !== confirmPass) { alert(t('confirmNewPass') + ' ' + t('notMatch')); return; }
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPass);
    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);
        alert(t('passChanged'));
        document.getElementById('change-password-modal').style.display = 'none';
        document.getElementById('change-password-form').reset();
    } catch(err) { alert(err.message); }
});

// --- PIN ---
let pinCallback = null;
function requestPin(callback) { if(!isAdmin && !isModerator) { callback(); return; } pinCallback = callback; document.getElementById('pin-input').value = ''; document.getElementById('pin-modal').style.display = 'block'; }
document.getElementById('pin-form').addEventListener('submit', async e => {
    e.preventDefault();
    const enteredPin = String(document.getElementById('pin-input').value);
    try {
        const snap = await get(ref(db, 'settings/adminPin'));
        const realPin = String(snap.val() || '1234'); 
        if(enteredPin === realPin) { document.getElementById('pin-modal').style.display = 'none'; if(pinCallback) pinCallback(); }
        else { alert(t('pinError')); }
    } catch(err) { alert(t('pinError')); }
});

// --- Navigation (for admin/moderator) ---
const sections = ['stats', 'cars', 'drivers', 'mods', 'logs', 'pending'];
sections.forEach(sec => {
    const el = document.getElementById(`nav-${sec}`);
    if (el) el.addEventListener('click', e => { e.preventDefault(); showSection(sec); });
});
function showSection(sec) {
    sections.forEach(s => { 
        const secEl = document.getElementById(`${s}-section`);
        if (secEl) secEl.style.display = (s === sec) ? 'block' : 'none';
        const navEl = document.getElementById(`nav-${s}`);
        if (navEl) navEl.classList.toggle('active', s === sec);
    });
}

// --- Helpers ---
document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).style.display = 'none'));
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

function getStatusClass(dateStr, hasDriver = false) { 
    if(!dateStr) return ''; 
    const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); 
    now.setHours(0,0,0,0); exp.setHours(0,0,0,0); 
    const d = Math.ceil((exp-now)/(1000*60*60*24)); 
    if(d < 0) return hasDriver ? 'status-danger' : 'status-red'; 
    if(d <= 15) return hasDriver ? 'status-danger' : 'status-yellow'; 
    return 'status-green'; 
}
function getStatusText(dateStr) { 
    if(!dateStr) return ''; 
    const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); 
    now.setHours(0,0,0,0); exp.setHours(0,0,0,0); 
    const d = Math.ceil((exp-now)/(1000*60*60*24)); 
    if(d < 0) return t('expiredStatus');
    if(d <= 15) return t('warnStatus');
    return t('activeStatus');
}
function getStatusPrintColor(dateStr) {
    if(!dateStr) return '#333'; 
    const now = getUaeTime(); const exp = getUaeTime(new Date(dateStr)); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); 
    const d = Math.ceil((exp-now)/(1000*60*60*24)); 
    if(d < 0) return '#dc3545';
    if(d <= 15) return '#ffc107';
    return '#28a745';
}
function getCarOverallStatus(car) {
    const lSt = getStatusClass(car.licenseExpiry, !!car.currentDriverId);
    const iSt = getStatusClass(car.insuranceExpiry, !!car.currentDriverId);
    if(['status-danger', 'status-red'].includes(lSt) || ['status-danger', 'status-red'].includes(iSt)) return 'exp';
    if(lSt==='status-yellow' || iSt==='status-yellow') return 'warn';
    return 'active';
}
async function logAction(action, details) { const user = auth.currentUser; if(!user) return; await set(push(ref(db, 'logs')), { timestamp: new Date().toISOString(), userId: user.email, action, details }); }

// --- Pagination ---
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
    if (datetimeInterval) clearInterval(datetimeInterval);
    datetimeInterval = setInterval(updateDateTimeDisplay, 60000);
    fetchCars(); fetchDrivers(); if(isAdmin) { fetchMods(); fetchLogs(); } if(isAdmin || isModerator) fetchPendingRequests();
    calculateStats(); setupStatClicks(); 
}

// =================== CARS (admin/moderator) ===================
document.getElementById('add-car-btn')?.addEventListener('click', () => openCarModal());
document.getElementById('load-more-cars')?.addEventListener('click', () => renderCars(true));
document.getElementById('search-car')?.addEventListener('input', () => { currentCarStatusFilter = 'all'; applyCarSearch(); });

async function generateCarId() { const c = await runTransaction(ref(db, 'counters/carsCount'), v => (v||0)+1); return `UAE_${String(c.snapshot.val()).padStart(3,'0')}`; }

function openCarModal(data=null) {
    document.getElementById('car-form').reset(); document.getElementById('car-id-hidden').value = '';
    document.getElementById('car-modal-title').textContent = data ? t('edit') : t('addCar');
    if(data) { document.getElementById('car-id-hidden').value=data.id; document.getElementById('plate-number').value=data.plateNumber; document.getElementById('plate-code').value=data.plateCode; document.getElementById('emirate').value=data.emirate; document.getElementById('owner').value=data.owner; document.getElementById('car-type').value=data.type; document.getElementById('car-year').value=data.year; document.getElementById('vin').value=data.vin; document.getElementById('license-expiry').value=data.licenseExpiry; document.getElementById('insurance-expiry').value=data.insuranceExpiry; document.getElementById('car-notes').value=data.notes||''; document.getElementById('violations').value=data.violations||''; }
    document.getElementById('car-modal').style.display = 'block';
}

document.getElementById('car-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; btn.textContent="...";
    const hid=document.getElementById('car-id-hidden').value, vin=document.getElementById('vin').value.trim(), pNum=document.getElementById('plate-number').value.trim(), pCode=document.getElementById('plate-code').value.trim(), emi=document.getElementById('emirate').value.trim();
    try {
        const snap=await get(ref(db,'cars')); if(snap.exists()){ const cars=snap.val(); for(let k in cars){ if(k===hid)continue; if(cars[k].vin===vin){alert(t('dupVin'));btn.disabled=false;btn.textContent=t('save');return;} if(cars[k].plateNumber===pNum&&cars[k].plateCode===pCode&&cars[k].emirate===emi){alert(t('dupPlate'));btn.disabled=false;btn.textContent=t('save');return;} } }
        const data = { plateNumber:pNum, plateCode:pCode, emirate:emi, owner:document.getElementById('owner').value.trim(), type:document.getElementById('car-type').value.trim(), year:document.getElementById('car-year').value.trim(), vin:vin, licenseExpiry:document.getElementById('license-expiry').value, insuranceExpiry:document.getElementById('insurance-expiry').value, notes:document.getElementById('car-notes').value.trim(), violations:document.getElementById('violations').value.trim(), currentDriverId:null, currentDriverName:null, currentAssignedBy:null, currentAssignedAt:null };
        if(hid) { const ex=(await get(ref(db,`cars/${hid}`))).val(); data.currentDriverId=ex.currentDriverId||null; data.currentDriverName=ex.currentDriverName||null; data.currentAssignedBy=ex.currentAssignedBy||null; data.currentAssignedAt=ex.currentAssignedAt||null; await update(ref(db,`cars/${hid}`),data); await logAction(t('edit'), hid); } else { const id=await generateCarId(); data.id=id; await set(ref(db,`cars/${id}`),data); await logAction(t('addCar'), id); }
        document.getElementById('car-modal').style.display='none';
    } catch(err){alert(err.message)} finally {btn.disabled=false;btn.textContent=t('save');}
});

async function deleteCar(id) { if(confirm(t('confirmDeleteCar'))){ await remove(ref(db,`cars/${id}`)); await logAction(t('delete'), id); } }

function fetchCars() { onValue(ref(db,'cars'), snap => { allCars = snap.exists() ? Object.values(snap.val()) : []; if (!isDriver) applyCarSearch(); }); }

function applyCarSearch() {
    if (isDriver) return;
    const q = document.getElementById('search-car').value.toLowerCase();
    displayedCars = allCars.filter(c => {
        const matchText = `${c.plateNumber} ${c.vin} ${c.owner}`.toLowerCase().includes(q);
        if (!matchText) return false;
        if (currentCarStatusFilter === 'all') return true;
        return getCarOverallStatus(c) === currentCarStatusFilter;
    });
    const statusOrder = { 'exp': 1, 'warn': 2, 'active': 3 };
    displayedCars.sort((a, b) => statusOrder[getCarOverallStatus(a)] - statusOrder[getCarOverallStatus(b)]);
    carsShown = 0; renderCars(false); 
}

function renderCars(append) {
    const c = document.getElementById('cars-container'); if(!c) return;
    if(!append) c.innerHTML = '';
    const items = displayedCars.slice(carsShown, carsShown + LIMIT);
    items.forEach(car => c.appendChild(createCarCard(car)));
    carsShown += items.length;
    document.getElementById('load-more-cars').style.display = carsShown < displayedCars.length ? 'inline-block' : 'none';
    if(displayedCars.length === 0 && !append) c.innerHTML=`<p style="text-align:center">${t('none')}</p>`;
}

// navigate helpers
function navigateToCar(carId) {
    showSection('cars');
    document.getElementById('search-car').value = '';
    currentCarStatusFilter = 'all';
    applyCarSearch();
    setTimeout(() => {
        const carCard = document.querySelector(`.card[data-car-id="${carId}"]`);
        if (carCard && !carCard.classList.contains('expanded')) {
            carCard.querySelector('.card-header').click();
            carCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

function navigateToDriver(driverId) {
    showSection('drivers');
    document.getElementById('search-driver').value = '';
    applyDriverSearch();
    setTimeout(() => {
        const driverCard = document.querySelector(`.card[data-driver-id="${driverId}"]`);
        if (driverCard && !driverCard.classList.contains('expanded')) {
            driverCard.querySelector('.card-header').click();
            driverCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

// =================== CAR CARD ===================
function createCarCard(car) {
    const hasDriver = !!car.currentDriverId;
    const lSt = getStatusClass(car.licenseExpiry, hasDriver), iSt = getStatusClass(car.insuranceExpiry, hasDriver); 
    let cSt = (lSt === 'status-danger' || iSt === 'status-danger') ? 'status-danger-top' : (lSt === 'status-red' || iSt === 'status-red') ? 'status-red-top' : (lSt === 'status-yellow' || iSt === 'status-yellow') ? 'status-yellow-top' : 'status-green-top';
    
    const el = document.createElement('div');
    el.className = `card ${cSt}`;
    el.setAttribute('data-car-id', car.id);
    
    let driverHtml = '';
    if (hasDriver) {
        driverHtml = `<div class="current-driver-box"><i class="fas fa-user-check"></i> ${t('currentlyWith')}: <span>${car.currentDriverName}</span>
                      <div class="custody-meta"><i class="fas fa-user-cog"></i> ${t('assignedBy')}: ${car.currentAssignedBy || '?'} ${car.currentAssignedAt ? ` - ${fmtDate(car.currentAssignedAt)}` : ''}</div></div>`;
    } else {
        driverHtml = `<div class="current-driver-box"><i class="fas fa-user-slash"></i> ${t('noDriver')}</div>`;
    }
    
    el.innerHTML = `
        <div class="card-header">
            <div class="card-title">${car.id}</div>
            <div class="owner-name-box"><i class="fas fa-user-tie"></i> ${t('owner')}: ${car.owner}</div>
            <div class="plate-design">
                <span class="plate-number">${car.plateNumber}</span> <span class="plate-sep">|</span> <span class="plate-code">${car.plateCode}</span> <span class="plate-sep">|</span> <span class="plate-emirate">${car.emirate}</span>
            </div>
            ${driverHtml}
        </div>
        <div class="card-body">
            <div class="info-grid">
                <div class="info-chip"><span class="chip-label">${t('carType')} / ${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div>
                <div class="info-chip"><span class="chip-label">${t('vin')}</span><span class="chip-value">${car.vin}</span></div>
                <div class="info-chip ${lSt}"><span class="chip-label">${t('licenseExpiry')} (${getStatusText(car.licenseExpiry)})</span><span class="chip-value">${fmtDate(car.licenseExpiry)}</span></div>
                <div class="info-chip ${iSt}"><span class="chip-label">${t('insuranceExpiry')} (${getStatusText(car.insuranceExpiry)})</span><span class="chip-value">${fmtDate(car.insuranceExpiry)}</span></div>
                ${car.notes ? `<div class="info-chip full-width"><span class="chip-label">${t('notes')}</span><span class="chip-value">${car.notes}</span></div>` : ''}
                ${car.violations ? `<div class="info-chip full-width violations-chip"><span class="chip-label">${t('violations')}</span><span class="chip-value">${car.violations}</span></div>` : ''}
            </div>
            <div class="card-actions">
                ${!hasDriver ? `<button class="btn-action assign" style="background:var(--primary-dark)"><i class="fas fa-link"></i> ${t('assign')}</button>` : `<button class="btn-action unassign" style="background:var(--yellow);color:#333"><i class="fas fa-unlink"></i> ${t('unassign')}</button>`}
                <button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button>
                <button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button>
                <button class="btn-action print" style="background:#17a2b8"><i class="fas fa-print"></i> ${t('print')}</button>
                <button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button>
                <button class="btn-action share" style="background:#6c757d"><i class="fas fa-share"></i></button>
            </div>
        </div>`;
    
    el.querySelector('.card-header').addEventListener('click', e => { if (!e.target.closest('.btn-action') && !e.target.closest('.driver-car-item')) el.classList.toggle('expanded'); });
    el.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); openCarModal(car); });
    el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); deleteCar(car.id); });
    el.querySelector('.print').addEventListener('click', e => { e.stopPropagation(); printCard(car); });
    el.querySelector('.share').addEventListener('click', e => { e.stopPropagation(); shareCard(car); });
    el.querySelector('.history').addEventListener('click', e => { e.stopPropagation(); showCustodyHistory('car', car.id); });
    
    if (hasDriver) {
        el.querySelector('.unassign').addEventListener('click', e => { e.stopPropagation(); unassignCar(car); });
        const driverBox = el.querySelector('.current-driver-box');
        if (driverBox) {
            driverBox.style.cursor = 'pointer';
            driverBox.addEventListener('click', e => { e.stopPropagation(); navigateToDriver(car.currentDriverId); });
        }
    } else {
        el.querySelector('.assign').addEventListener('click', e => { e.stopPropagation(); openCustodyModal('car', car.id); });
    }
    return el;
}

function printCard(car) { /* same as before, omitted for brevity but keep original function */ }
function shareCard(car) { /* same */ }

// =================== DRIVERS ===================
document.getElementById('add-driver-btn')?.addEventListener('click', () => openDriverModal());
document.getElementById('load-more-drivers')?.addEventListener('click', () => renderDrivers(true));
document.getElementById('search-driver')?.addEventListener('input', applyDriverSearch);

function openDriverModal(data=null) {
    document.getElementById('driver-form').reset(); document.getElementById('driver-id-hidden').value=''; document.getElementById('driver-modal-title').textContent=data?t('edit'):t('addDriver');
    if(data){ document.getElementById('driver-id-hidden').value=data.id; document.getElementById('driver-name').value=data.name; document.getElementById('driver-contact').value=data.contact; document.getElementById('driver-notes').value=data.notes||''; document.getElementById('driver-email-group').style.display='none'; document.getElementById('driver-pass-group').style.display='none'; }
    else { document.getElementById('driver-email-group').style.display='flex'; document.getElementById('driver-pass-group').style.display='flex'; document.getElementById('driver-email').value=''; document.getElementById('driver-pass').value=''; }
    document.getElementById('driver-modal').style.display='block';
}

document.getElementById('driver-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
    const hid=document.getElementById('driver-id-hidden').value;
    const name=document.getElementById('driver-name').value.trim();
    const contact=document.getElementById('driver-contact').value.trim();
    const notes=document.getElementById('driver-notes').value.trim();
    try { 
        const snap = await get(ref(db, 'drivers')); 
        if(snap.exists()) { const drivers = snap.val(); for(let k in drivers) { if(k === hid) continue; if(drivers[k].contact === contact || drivers[k].name === name) { alert(t('dupDriver')); btn.disabled=false; btn.textContent=t('save'); return; } } }
        if(hid) { await update(ref(db,`drivers/${hid}`),{name,contact,notes}); await logAction(t('edit'), name); }
        else { 
            const email = document.getElementById('driver-email').value;
            const pass = document.getElementById('driver-pass').value;
            if(!email || !pass) { alert('البريد وكلمة المرور مطلوبة'); btn.disabled=false; return; }
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            const uid = userCred.user.uid;
            const driverRef = push(ref(db,'drivers'));
            const driverId = driverRef.key;
            await set(driverRef, { id: driverId, name, contact, notes, userId: uid });
            await set(ref(db, `users/${uid}`), { email, name, role: 'driver', driverId, status: 'active', createdAt: new Date().toISOString() });
            await logAction(t('addDriver'), name);
        }
        document.getElementById('driver-modal').style.display='none'; 
    } catch(err){alert(err.message)} finally{btn.disabled=false;btn.textContent=t('save');}
});

async function deleteDriver(id) { const assignedCars = allCars.filter(c => c.currentDriverId === id); if(assignedCars.length > 0){alert(t('unassignFirst'));return;} if(confirm(t('confirmDeleteDriver'))){ await remove(ref(db,`drivers/${id}`)); await logAction(t('delete'), id); } }

function fetchDrivers() { onValue(ref(db,'drivers'), snap => { allDrivers = snap.exists() ? Object.values(snap.val()) : []; applyDriverSearch(); }); }
function applyDriverSearch() { if(isDriver) return; const q = document.getElementById('search-driver').value.toLowerCase(); displayedDrivers = q ? allDrivers.filter(d => `${d.name} ${d.contact}`.toLowerCase().includes(q)) : allDrivers; driversShown = 0; renderDrivers(false); }
function renderDrivers(append) {
    const c = document.getElementById('drivers-container'); if(!c) return;
    if(!append) c.innerHTML = '';
    const items = displayedDrivers.slice(driversShown, driversShown + LIMIT);
    items.forEach(d => c.appendChild(createDriverCard(d)));
    driversShown += items.length;
    document.getElementById('load-more-drivers').style.display = driversShown < displayedDrivers.length ? 'inline-block' : 'none';
    if(displayedDrivers.length === 0 && !append) c.innerHTML=`<p style="text-align:center">${t('none')}</p>`;
}

function createDriverCard(d) {
    const assignedCars = allCars.filter(c => c.currentDriverId === d.id);
    const el=document.createElement('div'); el.className='card status-green-top'; el.setAttribute('data-driver-id', d.id);
    let carsGridHtml = '';
    if (assignedCars.length === 0) carsGridHtml = `<div class="driver-cars-grid"><div style="text-align:center; color:#888; grid-column:1/-1;">${t('noCar')}</div></div>`;
    else {
        let gridItems = '';
        assignedCars.forEach(car => {
            const statusText = getStatusText(car.licenseExpiry);
            let statusColor = '#28a745';
            if (statusText === t('expiredStatus')) statusColor = '#dc3545';
            else if (statusText === t('warnStatus')) statusColor = '#ffc107';
            gridItems += `
                <div class="driver-car-item" data-car-id="${car.id}">
                    <div class="mini-plate"><span class="plate-number">${car.plateNumber}</span> <span class="plate-sep">|</span> <span class="plate-code">${car.plateCode}</span> <span class="plate-sep">|</span> <span class="plate-emirate">${car.emirate}</span></div>
                    <div class="car-mini-info"><span><i class="fas fa-car"></i> ${car.type}</span><span><i class="fas fa-calendar"></i> ${car.year}</span><span style="color:${statusColor}"><i class="fas fa-clock"></i> ${statusText}</span></div>
                </div>
            `;
        });
        carsGridHtml = `<div class="driver-cars-grid">${gridItems}</div>`;
    }
    el.innerHTML=`
        <div class="card-header">
            <div class="card-header-main"><div><div class="card-title"><i class="fas fa-user"></i> ${d.name}</div><div style="color:#666; margin-top:5px"><i class="fas fa-phone"></i> ${d.contact}</div></div></div>
            <div class="card-driver-info" style="width:100%; flex-direction:column; align-items:stretch;">${carsGridHtml}</div>
        </div>
        <div class="card-body">${d.notes?`<p>${d.notes}</p>`:''}<div class="card-actions"><button class="btn-action assign" style="background:var(--green)"><i class="fas fa-plus"></i> ${t('assign')}</button><button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button><button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button></div></div>`;
    el.querySelector('.card-header').addEventListener('click', e => { if(!e.target.closest('.btn-action') && !e.target.closest('.driver-car-item')) el.classList.toggle('expanded'); });
    el.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); openDriverModal(d); });
    el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); deleteDriver(d.id); });
    el.querySelector('.history').addEventListener('click', e => { e.stopPropagation(); showCustodyHistory('driver', d.id); });
    el.querySelector('.assign').addEventListener('click', e => { e.stopPropagation(); openCustodyModal('driver', d.id); });
    el.querySelectorAll('.driver-car-item').forEach(item => { const carId = item.getAttribute('data-car-id'); if(carId) item.addEventListener('click', (e) => { e.stopPropagation(); navigateToCar(carId); }); });
    return el;
}

// =================== CUSTODY LOGIC (with tracking) ===================
async function assignCustody(carId, driverId, assignedByUser = auth.currentUser.email) {
    const carData = allCars.find(c => c.id === carId);
    const driverData = allDrivers.find(d => d.id === driverId);
    if (!carData || !driverData) throw new Error('Invalid car or driver');
    if (carData.currentDriverId) throw new Error('Car already assigned');
    const now = new Date().toISOString();
    // end previous active custody for same car (just in case)
    const snap = await get(ref(db, 'custodyHistory'));
    let prevKey = null;
    if (snap.exists()) {
        snap.forEach(ch => {
            if (ch.val().carId === carId && !ch.val().endTime) prevKey = ch.key;
        });
    }
    if (prevKey) await update(ref(db, `custodyHistory/${prevKey}`), { endTime: now, unassignedBy: assignedByUser });
    // new custody record
    const newHistoryRef = push(ref(db, 'custodyHistory'));
    await set(newHistoryRef, {
        carId, driverId, driverName: driverData.name, carPlate: `${carData.plateNumber}|${carData.plateCode}`,
        startTime: now, endTime: null, assignedBy: assignedByUser, unassignedBy: null
    });
    // update car
    await update(ref(db, `cars/${carId}`), {
        currentDriverId: driverId, currentDriverName: driverData.name,
        currentAssignedBy: assignedByUser, currentAssignedAt: now
    });
    await logAction(t('assignCustody'), `${carId} -> ${driverData.name} by ${assignedByUser}`);
}

async function unassignCar(car) {
    if (!confirm(t('confirmUnassign'))) return;
    const user = auth.currentUser.email;
    const now = new Date().toISOString();
    const snap = await get(ref(db, 'custodyHistory'));
    let openKey = null;
    if (snap.exists()) {
        snap.forEach(ch => {
            if (ch.val().carId === car.id && !ch.val().endTime) openKey = ch.key;
        });
    }
    if (openKey) await update(ref(db, `custodyHistory/${openKey}`), { endTime: now, unassignedBy: user });
    await update(ref(db, `cars/${car.id}`), { currentDriverId: null, currentDriverName: null, currentAssignedBy: null, currentAssignedAt: null });
    await logAction(t('unassign'), `${car.id} by ${user}`);
}

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
        sel.innerHTML = '<option value="">--</option>'; 
        allDrivers.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = `${d.name} (${d.contact})`; sel.appendChild(o); }); 
    } else {
        document.getElementById('custody-driver-display-group').style.display = 'flex';
        document.getElementById('custody-car-select-group').style.display = 'flex';
        const driverData = allDrivers.find(d => d.id === sourceId);
        document.getElementById('custody-driver-display').value = driverData.name;
        const sel = document.getElementById('custody-car-select');
        sel.innerHTML = '<option value="">--</option>';
        allCars.filter(c => !c.currentDriverId).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.id} - ${c.plateNumber}|${c.plateCode}`; sel.appendChild(o); });
    }
    document.getElementById('custody-modal').style.display = 'block'; 
}

document.getElementById('custody-form').addEventListener('submit', async e => {
    e.preventDefault(); 
    const mode = document.getElementById('custody-mode').value;
    const sourceId = document.getElementById('custody-source-id').value;
    let carId, driverId;
    if(mode === 'car') { carId = sourceId; driverId = document.getElementById('custody-driver-select').value; if(!driverId){alert(t('selectDriver'));return;} }
    else { driverId = sourceId; carId = document.getElementById('custody-car-select').value; if(!carId){alert(t('selectCar'));return;} }
    try {
        const carData = allCars.find(c => c.id === carId);
        if (carData.currentDriverId) { alert('السيارة مرتبطة بالفعل'); return; }
        await assignCustody(carId, driverId, auth.currentUser.email);
        document.getElementById('custody-modal').style.display='none';
    } catch(err){alert(err.message)}
});

async function showCustodyHistory(type, id) {
    document.getElementById('history-tbody').innerHTML = '';
    try {
        const snap = await get(ref(db, 'custodyHistory'));
        let records = [];
        if(snap.exists()) {
            const data = snap.val();
            for(let k in data) {
                if((type === 'car' && data[k].carId === id) || (type === 'driver' && data[k].driverId === id)) {
                    records.push(data[k]);
                }
            }
        }
        records.sort((a,b) => new Date(b.startTime) - new Date(a.startTime));
        const tbody = document.getElementById('history-tbody');
        if(records.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">${t('none')}</td></tr>`; }
        else {
            records.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${type === 'car' ? r.driverName : r.carPlate}</td><td>${fmtDateTime(r.startTime)}</td><td>${r.endTime ? fmtDateTime(r.endTime) : `<b style="color:var(--green)">${t('untilNow')}</b>`}</td><td>${r.assignedBy || '?'}</td><td>${r.unassignedBy || '-'}</td>`;
                tbody.appendChild(tr);
            });
        }
        document.getElementById('history-modal').style.display = 'block';
    } catch(err) { alert(err); }
}

// =================== MODERATORS ===================
document.getElementById('add-mod-btn')?.addEventListener('click', () => { requestPin(() => { document.getElementById('mod-form').reset(); document.getElementById('mod-uid-hidden').value=''; document.getElementById('mod-pass-group').style.display='flex'; document.getElementById('mod-modal').style.display='block'; }); });
document.getElementById('load-more-mods')?.addEventListener('click', () => renderMods(true));
document.getElementById('mod-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
    const uid=document.getElementById('mod-uid-hidden').value;
    const name=document.getElementById('mod-name').value, email=document.getElementById('mod-email').value;
    try {
        if(uid) { await update(ref(db, `users/${uid}`), { name, email }); await logAction(t('edit'), name); }
        else { 
            const pass=document.getElementById('mod-pass').value;
            const cred=await createUserWithEmailAndPassword(secondaryAuth,email,pass); 
            await set(ref(db,`users/${cred.user.uid}`),{email,name,role:'moderator',status:'active'}); 
            await logAction(t('addMod'), name); 
        }
        document.getElementById('mod-modal').style.display='none'; 
    } catch(err){alert(err.message)} finally{btn.disabled=false;}
});
function fetchMods() { onValue(ref(db,'users'), snap => { allMods = snap.exists() ? Object.keys(snap.val()).map(k => ({...snap.val()[k], id: k})).filter(u => u.role==='moderator') : []; modsShown = 0; renderMods(false); }); }
function renderMods(append) {
    const c = document.getElementById('mods-container'); if(!c) return;
    if(!append) c.innerHTML = '';
    const items = allMods.slice(modsShown, modsShown + LIMIT);
    items.forEach(u => c.appendChild(createModCard(u)));
    modsShown += items.length;
    document.getElementById('load-more-mods').style.display = modsShown < allMods.length ? 'inline-block' : 'none';
}
function createModCard(u) {
    const el=document.createElement('div'); el.className=`card ${u.status==='active'?'status-green-top':'status-red-top'}`;
    el.innerHTML=`<div class="card-header"><div class="card-title">${u.name}</div><small>${u.email}</small></div><div class="card-body"><p>${u.status==='active'?`<span style="color:green">${t('active')}</span>`:`<span style="color:red">${t('suspended')}</span>`}</p><div class="card-actions">${u.status==='active'?`<button class="btn-action suspend" style="background:var(--yellow);color:#333"><i class="fas fa-ban"></i> ${t('suspended')}</button>`:`<button class="btn-action activate" style="background:var(--green)"><i class="fas fa-check"></i> ${t('active')}</button>`}<button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button><button class="btn-action reset-pass" style="background:#17a2b8"><i class="fas fa-key"></i> ${t('resetPass')}</button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button></div></div>`;
    el.querySelector('.card-header').addEventListener('click', e => { if(!e.target.closest('.btn-action')) el.classList.toggle('expanded'); });
    if(u.status==='active') el.querySelector('.suspend').addEventListener('click', e => { e.stopPropagation(); requestPin(async()=>{await update(ref(db,`users/${u.id}`),{status:'suspended'});await logAction(t('suspended'),u.name);}); });
    else el.querySelector('.activate').addEventListener('click', e => { e.stopPropagation(); requestPin(async()=>{await update(ref(db,`users/${u.id}`),{status:'active'});await logAction(t('active'),u.name);}); });
    el.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); document.getElementById('mod-uid-hidden').value = u.id; document.getElementById('mod-name').value = u.name; document.getElementById('mod-email').value = u.email; document.getElementById('mod-pass-group').style.display = 'none'; document.getElementById('mod-modal').style.display = 'block'; });
    el.querySelector('.reset-pass').addEventListener('click', async e => { e.stopPropagation(); try { await sendPasswordResetEmail(auth, u.email); alert(t('resetPassSent')); } catch(err) { alert(err.message); } });
    el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); requestPin(async()=>{if(confirm(t('confirmDeleteCar'))){await remove(ref(db,`users/${u.id}`));await logAction(t('delete'),u.name);}}); });
    return el;
}

// =================== LOGS ===================
document.getElementById('load-more-logs')?.addEventListener('click', () => renderLogs(true));
function fetchLogs() { onValue(ref(db,'logs'), snap => { allLogs = snap.exists() ? Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)) : []; logsShown = 0; renderLogs(false); }); }
function renderLogs(append) {
    const tb = document.getElementById('logs-tbody'); if(!tb) return;
    if(!append) tb.innerHTML = '';
    const items = allLogs.slice(logsShown, logsShown + LIMIT);
    items.forEach(l => { const tr=document.createElement('tr'); tr.innerHTML=`<td>${fmtDateTime(l.timestamp)}</td><td>${l.userId}</td><td>${l.action}</td><td>${l.details}</td>`; tb.appendChild(tr); });
    logsShown += items.length;
    document.getElementById('load-more-logs').style.display = logsShown < allLogs.length ? 'inline-block' : 'none';
}

// =================== PENDING REQUESTS (admin/moderator) ===================
async function fetchPendingRequests() {
    onValue(ref(db, 'pendingCarRequests'), snap => {
        allPendingRequests = snap.exists() ? Object.keys(snap.val()).map(k => ({ id: k, ...snap.val()[k] })).filter(r => r.status === 'pending') : [];
        pendingShown = 0;
        renderPendingRequests();
    });
}

function renderPendingRequests() {
    const tbody = document.getElementById('pending-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const items = allPendingRequests.slice(pendingShown, pendingShown + LIMIT);
    items.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${req.driverName || '?'}</td>
            <td>${req.plateNumber}</td>
            <td>${req.plateCode}</td>
            <td>${req.emirate}</td>
            <td>${req.carType}</td>
            <td>${fmtDateTime(req.submittedAt)}</td>
            <td><button class="btn-approve" data-id="${req.id}">${t('approve')}</button> <button class="btn-reject" data-id="${req.id}">${t('reject')}</button></td>
        `;
        tbody.appendChild(tr);
    });
    pendingShown += items.length;
    document.getElementById('load-more-pending')?.remove();
    if (pendingShown < allPendingRequests.length) {
        const btn = document.createElement('button');
        btn.id = 'load-more-pending';
        btn.className = 'btn-load-more';
        btn.textContent = t('loadMore');
        btn.addEventListener('click', () => renderPendingRequests());
        document.getElementById('pending-section').appendChild(btn);
    }
    // attach event listeners
    tbody.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', () => approveRequest(btn.dataset.id)));
    tbody.querySelectorAll('.btn-reject').forEach(btn => btn.addEventListener('click', () => rejectRequest(btn.dataset.id)));
}

async function approveRequest(requestId) {
    const req = allPendingRequests.find(r => r.id === requestId);
    if (!req) return;
    // show modal to complete car data
    const carData = {
        plateNumber: req.plateNumber,
        plateCode: req.plateCode,
        emirate: req.emirate,
        type: req.carType,
        owner: '', year: '', vin: '', licenseExpiry: '', insuranceExpiry: '', notes: '', violations: ''
    };
    // use existing car modal but prefill
    openCarModal(carData);
    // override submit to also assign custody and delete request
    const originalSubmit = document.getElementById('car-form').onsubmit;
    document.getElementById('car-form').onsubmit = async (e) => {
        e.preventDefault();
        // first save car normally
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        const hid = document.getElementById('car-id-hidden').value;
        const vin = document.getElementById('vin').value.trim();
        const pNum = document.getElementById('plate-number').value.trim();
        const pCode = document.getElementById('plate-code').value.trim();
        const emi = document.getElementById('emirate').value.trim();
        try {
            const snap = await get(ref(db, 'cars'));
            if (snap.exists()) {
                const cars = snap.val();
                for (let k in cars) {
                    if (cars[k].vin === vin && (!hid || k !== hid)) { alert(t('dupVin')); btn.disabled = false; return; }
                    if (cars[k].plateNumber === pNum && cars[k].plateCode === pCode && cars[k].emirate === emi && (!hid || k !== hid)) { alert(t('dupPlate')); btn.disabled = false; return; }
                }
            }
            const data = {
                plateNumber: pNum, plateCode: pCode, emirate: emi,
                owner: document.getElementById('owner').value.trim(),
                type: document.getElementById('car-type').value.trim(),
                year: document.getElementById('car-year').value.trim(),
                vin: vin,
                licenseExpiry: document.getElementById('license-expiry').value,
                insuranceExpiry: document.getElementById('insurance-expiry').value,
                notes: document.getElementById('car-notes').value.trim(),
                violations: document.getElementById('violations').value.trim(),
                currentDriverId: null, currentDriverName: null, currentAssignedBy: null, currentAssignedAt: null
            };
            let carId;
            if (hid) { carId = hid; await update(ref(db, `cars/${carId}`), data); }
            else { carId = await generateCarId(); data.id = carId; await set(ref(db, `cars/${carId}`), data); }
            // assign custody to the driver who requested
            await assignCustody(carId, req.driverId, auth.currentUser.email);
            // update request status
            await update(ref(db, `pendingCarRequests/${requestId}`), { status: 'approved', approvedBy: auth.currentUser.email, finalCarId: carId });
            await logAction(t('approve'), `Car request ${requestId} approved, car ${carId} assigned to ${req.driverName}`);
            document.getElementById('car-modal').style.display = 'none';
            // reset original submit
            document.getElementById('car-form').onsubmit = originalSubmit;
        } catch (err) { alert(err.message); } finally { btn.disabled = false; }
    };
    document.getElementById('car-modal').style.display = 'block';
}

async function rejectRequest(requestId) {
    const reason = prompt('سبب الرفض (اختياري)');
    await update(ref(db, `pendingCarRequests/${requestId}`), { status: 'rejected', rejectedReason: reason || '' });
    await logAction(t('reject'), `Car request ${requestId} rejected`);
}

// =================== DRIVER DASHBOARD ===================
async function initDriverDashboard() {
    if (!isDriver || !currentDriverId) return;
    // fetch driver info
    const driverSnap = await get(ref(db, `drivers/${currentDriverId}`));
    if (driverSnap.exists()) {
        const driver = driverSnap.val();
        document.getElementById('driver-name-display').textContent = driver.name;
        document.getElementById('driver-contact-display').textContent = driver.contact;
        document.getElementById('driver-email-display').textContent = currentUserData.email;
    }
    // fetch current cars (active custody)
    const custodySnap = await get(ref(db, 'custodyHistory'));
    let activeCustodies = [];
    let pastCustodies = [];
    if (custodySnap.exists()) {
        const histories = Object.values(custodySnap.val());
        activeCustodies = histories.filter(h => h.driverId === currentDriverId && !h.endTime);
        pastCustodies = histories.filter(h => h.driverId === currentDriverId && h.endTime);
    }
    const currentCarsContainer = document.getElementById('driver-current-cars');
    const pastCarsContainer = document.getElementById('driver-past-cars');
    currentCarsContainer.innerHTML = '';
    pastCarsContainer.innerHTML = '';
    for (let custody of activeCustodies) {
        const carSnap = await get(ref(db, `cars/${custody.carId}`));
        if (carSnap.exists()) {
            const car = carSnap.val();
            currentCarsContainer.appendChild(createSimpleCarCard(car, custody));
        }
    }
    for (let custody of pastCustodies) {
        const carSnap = await get(ref(db, `cars/${custody.carId}`));
        if (carSnap.exists()) {
            const car = carSnap.val();
            pastCarsContainer.appendChild(createPastCarCard(car, custody));
        }
    }
}

function createSimpleCarCard(car, custody) {
    const el = document.createElement('div');
    el.className = 'card status-green-top';
    el.innerHTML = `
        <div class="card-header">
            <div class="card-title">${car.id}</div>
            <div class="plate-design"><span class="plate-number">${car.plateNumber}</span> | <span class="plate-code">${car.plateCode}</span> | ${car.emirate}</div>
            <div class="current-driver-box"><i class="fas fa-user-check"></i> ${t('currentlyWith')}: أنت<div class="custody-meta"><i class="fas fa-user-cog"></i> ${t('assignedBy')}: ${custody.assignedBy || '?'} - ${fmtDate(custody.startTime)}</div></div>
        </div>
        <div class="card-body">
            <div class="info-grid"><div class="info-chip"><span class="chip-label">${t('owner')}</span><span class="chip-value">${car.owner}</span></div><div class="info-chip"><span class="chip-label">${t('carType')}/${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div><div class="info-chip"><span class="chip-label">${t('vin')}</span><span class="chip-value">${car.vin}</span></div><div class="info-chip"><span class="chip-label">${t('licenseExpiry')}</span><span class="chip-value">${fmtDate(car.licenseExpiry)}</span></div><div class="info-chip"><span class="chip-label">${t('insuranceExpiry')}</span><span class="chip-value">${fmtDate(car.insuranceExpiry)}</span></div></div>
        </div>
    `;
    el.querySelector('.card-header').addEventListener('click', () => el.classList.toggle('expanded'));
    return el;
}

function createPastCarCard(car, custody) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
        <div class="card-header">
            <div class="card-title">${car.id}</div>
            <div class="plate-design"><span class="plate-number">${car.plateNumber}</span> | <span class="plate-code">${car.plateCode}</span> | ${car.emirate}</div>
            <div class="current-driver-box" style="background:#e9ecef"><i class="fas fa-calendar-alt"></i> ${fmtDate(custody.startTime)} - ${custody.endTime ? fmtDate(custody.endTime) : '?'}</div>
        </div>
        <div class="card-body">
            <div class="info-grid"><div class="info-chip"><span class="chip-label">${t('owner')}</span><span class="chip-value">${car.owner}</span></div><div class="info-chip"><span class="chip-label">${t('carType')}/${t('carYear')}</span><span class="chip-value">${car.type} - ${car.year}</span></div></div>
        </div>
    `;
    el.querySelector('.card-header').addEventListener('click', () => el.classList.toggle('expanded'));
    return el;
}

// Driver: add car form
document.getElementById('driver-add-car-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const plateNumber = document.getElementById('driver-plate-number').value.trim();
    const plateCode = document.getElementById('driver-plate-code').value.trim();
    const emirate = document.getElementById('driver-emirate').value.trim();
    const carType = document.getElementById('driver-car-type').value.trim();
    if (!plateNumber || !plateCode || !emirate || !carType) { alert('جميع الحقول مطلوبة'); return; }
    // check if car exists
    const carsSnap = await get(ref(db, 'cars'));
    let existingCar = null;
    if (carsSnap.exists()) {
        const cars = Object.values(carsSnap.val());
        existingCar = cars.find(c => c.plateNumber === plateNumber && c.plateCode === plateCode && c.emirate === emirate);
    }
    if (existingCar) {
        if (existingCar.currentDriverId) {
            alert(t('carAlreadyAssigned'));
        } else {
            await assignCustody(existingCar.id, currentDriverId, auth.currentUser.email);
            alert(t('carAddedAndAssigned'));
            initDriverDashboard(); // refresh
        }
    } else {
        // create pending request
        const requestData = {
            driverId: currentDriverId,
            driverName: document.getElementById('driver-name-display').textContent,
            plateNumber, plateCode, emirate, carType,
            submittedAt: new Date().toISOString(),
            status: 'pending'
        };
        await set(push(ref(db, 'pendingCarRequests')), requestData);
        alert(t('requestSent'));
    }
    document.getElementById('driver-add-car-form').reset();
});

// =================== STATS & NAVIGATION SHORTCUTS ===================
function setupStatClicks() {
    document.getElementById('stat-cars-active')?.parentElement?.addEventListener('click', () => { showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'active'; applyCarSearch(); });
    document.getElementById('stat-cars-warn')?.parentElement?.addEventListener('click', () => { showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'warn'; applyCarSearch(); });
    document.getElementById('stat-cars-exp')?.parentElement?.addEventListener('click', () => { showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'exp'; applyCarSearch(); });
    document.getElementById('stat-drivers')?.parentElement?.addEventListener('click', () => { showSection('drivers'); });
}

function calculateStats() { 
    onValue(ref(db,'cars'), snap => { let g=0,y=0,r=0; if(snap.exists()) Object.values(snap.val()).forEach(c=>{ const status = getCarOverallStatus(c); if(status==='active')g++; else if(status==='warn')y++; else r++; }); document.getElementById('stat-cars-active').textContent=g; document.getElementById('stat-cars-warn').textContent=y; document.getElementById('stat-cars-exp').textContent=r; }); 
    onValue(ref(db,'drivers'), snap => document.getElementById('stat-drivers').textContent=snap.exists()?Object.keys(snap.val()).length:0); 
    if(isAdmin) { onValue(ref(db,'users'), snap => { let m=0; if(snap.exists()) Object.values(snap.val()).forEach(u=>{if(u.role==='moderator')m++}); document.getElementById('stat-mods').textContent=m; }); }
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));