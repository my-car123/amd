import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, push, runTransaction } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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

// --- Comprehensive i18n ---
const translations = {
    ar: { loginTitle: "تسجيل الدخول", loginBtn: "دخول", navStats: "الإحصائيات", navCars: "السيارات", navDrivers: "السائقون", navMods: "المشرفون", navLogs: "السجل", statActive: "سيارات سارية", statWarn: "قاربت على الانتهاء", statExp: "منتهية", statDrivers: "سائقين", statMods: "مشرفين", addCar: "إضافة سيارة", addDriver: "إضافة سائق", addMod: "إضافة مشرف", modManagement: "إدارة المشرفين", systemLogs: "سجل النظام الدقيق", pinTitle: "التحقق من الرمز السري", pinDesc: "أدخل رمز PIN للمتابعة", confirm: "تأكيد", loadMore: "عرض المزيد", searchCar: "بحث (لوحة، قاعدة، مالك)...", searchDriver: "بحث (اسم، هاتف)...", owner: "المالك", plateNumber: "رقم اللوحة", plateCode: "الرمز", emirate: "الإمارة", carType: "النوع", carYear: "سنة الصنع", vin: "رقم القاعدة (VIN)", licenseExpiry: "انتهاء الترخيص", insuranceExpiry: "انتهاء التأمين", notes: "ملاحظات", violations: "مخالفات", save: "حفظ", driverName: "اسم السائق", driverContact: "رقم الموبايل", assignCustody: "ربط عهدة", selectDriver: "اختر السائق", selectCar: "اختر السيارة (بدون عهدة)", confirmAssign: "تأكيد الربط", car: "السيارة", modName: "اسم المستخدم", email: "البريد الإلكتروني", password: "كلمة المرور", custodyHistory: "سجل العهدات", startTime: "البداية", endTime: "النهاية", logTime: "التوقيت", logUser: "المستخدم", logAction: "الإجراء", logDetails: "التفاصيل", active: "فعال", suspended: "معلق", assign: "ربط", unassign: "فك", edit: "تعديل", delete: "حذف", print: "طباعة", share: "مشاركة", history: "سجل", resetPass: "إعادة كلمة المرور", noDriver: "بدون سائق", noCar: "بدون سيارة", activeStatus: "سارية", warnStatus: "قاربت على الانتهاء", expiredStatus: "منتهية", currentlyWith: "مع", untilNow: "حتى الآن", loginError: "خطأ في الدخول", pinError: "رمز PIN خاطئ!", dupVin: "VIN مكرر!", dupPlate: "اللوحة مكررة!", dupDriver: "اسم السائق أو رقم الهاتف مسجل مسبقاً!", confirmDeleteCar: "حذف السيارة؟", confirmDeleteDriver: "حذف السائق؟", confirmUnassign: "فك الربط؟", unassignFirst: "افك العهدة أولاً", resetPassSent: "تم إرسال رابط إعادة التعيين للبريد", none: "لا توجد بيانات", copied: "تم النسخ!", footerRights: "جميع الحقوق محفوظة", moreCars: "سيارات أخرى" },
    en: { loginTitle: "Login", loginBtn: "Login", navStats: "Stats", navCars: "Cars", navDrivers: "Drivers", navMods: "Mods", navLogs: "Logs", statActive: "Active Cars", statWarn: "Warning", statExp: "Expired", statDrivers: "Drivers", statMods: "Mods", addCar: "Add Car", addDriver: "Add Driver", addMod: "Add Mod", modManagement: "Moderators", systemLogs: "System Logs", pinTitle: "PIN Verification", pinDesc: "Enter PIN to continue", confirm: "Confirm", loadMore: "Load More", searchCar: "Search (Plate, VIN, Owner)...", searchDriver: "Search (Name, Phone)...", owner: "Owner", plateNumber: "Plate Number", plateCode: "Code", emirate: "Emirate", carType: "Type", carYear: "Year", vin: "VIN", licenseExpiry: "License Expiry", insuranceExpiry: "Insurance Expiry", notes: "Notes", violations: "Violations", save: "Save", driverName: "Driver Name", driverContact: "Phone", assignCustody: "Assign Custody", selectDriver: "Select Driver", selectCar: "Select Car (No Custody)", confirmAssign: "Confirm Assign", car: "Car", modName: "Display Name", email: "Email", password: "Password", custodyHistory: "Custody History", startTime: "Start", endTime: "End", logTime: "Time", logUser: "User", logAction: "Action", logDetails: "Details", active: "Active", suspended: "Suspended", assign: "Assign", unassign: "Unassign", edit: "Edit", delete: "Delete", print: "Print", share: "Share", history: "History", resetPass: "Reset Pass", noDriver: "No Driver", noCar: "No Car", activeStatus: "Active", warnStatus: "Warning", expiredStatus: "Expired", currentlyWith: "With", untilNow: "Until Now", loginError: "Login Error", pinError: "Wrong PIN!", dupVin: "Duplicate VIN!", dupPlate: "Duplicate Plate!", dupDriver: "Driver Name or Phone already exists!", confirmDeleteCar: "Delete Car?", confirmDeleteDriver: "Delete Driver?", confirmUnassign: "Unassign?", unassignFirst: "Unassign first", resetPassSent: "Reset link sent to email", none: "No data", copied: "Copied!", footerRights: "All Rights Reserved", moreCars: "more cars" }
};
let currentLang = 'ar';
function t(key) { return translations[currentLang][key] || key; }
function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR';
    document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if (translations[lang][key]) el.textContent = translations[lang][key]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const key = el.getAttribute('data-i18n-placeholder'); if (translations[lang][key]) el.placeholder = translations[lang][key]; });
}
document.getElementById('lang-toggle').addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));

// --- Auth & Role ---
let isAdmin = false;
onAuthStateChanged(auth, user => {
    if (user) {
        isAdmin = user.email === 'saad323m@gmail.com';
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'flex';
        document.getElementById('user-display-name').textContent = isAdmin ? 'SAAD (Admin)' : t('active');
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
        initApp();
    } else {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('app-section').style.display = 'none';
    }
});
document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); } 
    catch (error) { document.getElementById('login-error').textContent = t('loginError'); }
});
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- PIN ---
let pinCallback = null;
function requestPin(callback) { if(!isAdmin) { callback(); return; } pinCallback = callback; document.getElementById('pin-input').value = ''; document.getElementById('pin-modal').style.display = 'block'; }
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

// --- Navigation ---
const sections = ['stats', 'cars', 'drivers', 'mods', 'logs'];
sections.forEach(sec => document.getElementById(`nav-${sec}`).addEventListener('click', e => { e.preventDefault(); showSection(sec); }));
function showSection(sec) {
    sections.forEach(s => { 
        const secEl = document.getElementById(`${s}-section`);
        secEl.style.display = (s === sec && (isAdmin || (s !== 'mods' && s !== 'logs'))) ? 'block' : 'none';
        document.getElementById(`nav-${s}`).classList.toggle('active', s === sec); 
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
let currentCarStatusFilter = 'all';

function initApp() { 
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    fetchCars(); fetchDrivers(); if(isAdmin) { fetchMods(); fetchLogs(); } calculateStats(); setupStatClicks(); 
}

// =================== CARS ===================
document.getElementById('add-car-btn').addEventListener('click', () => openCarModal());
document.getElementById('load-more-cars').addEventListener('click', () => renderCars(true));
document.getElementById('search-car').addEventListener('input', () => { currentCarStatusFilter = 'all'; applyCarSearch(); });

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
        const data = { plateNumber:pNum, plateCode:pCode, emirate:emi, owner:document.getElementById('owner').value.trim(), type:document.getElementById('car-type').value.trim(), year:document.getElementById('car-year').value.trim(), vin:vin, licenseExpiry:document.getElementById('license-expiry').value, insuranceExpiry:document.getElementById('insurance-expiry').value, notes:document.getElementById('car-notes').value.trim(), violations:document.getElementById('violations').value.trim(), currentDriverId:null, currentDriverName:null };
        if(hid) { const ex=(await get(ref(db,`cars/${hid}`))).val(); data.currentDriverId=ex.currentDriverId||null; data.currentDriverName=ex.currentDriverName||null; await update(ref(db,`cars/${hid}`),data); await logAction(t('edit'), hid); } else { const id=await generateCarId(); data.id=id; await set(ref(db,`cars/${id}`),data); await logAction(t('addCar'), id); }
        document.getElementById('car-modal').style.display='none';
    } catch(err){alert(err.message)} finally {btn.disabled=false;btn.textContent=t('save');}
});

async function deleteCar(id) { if(confirm(t('confirmDeleteCar'))){ await remove(ref(db,`cars/${id}`)); await logAction(t('delete'), id); } }

function fetchCars() { onValue(ref(db,'cars'), snap => { allCars = snap.exists() ? Object.values(snap.val()) : []; applyCarSearch(); }); }

function applyCarSearch() {
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
    const c = document.getElementById('cars-container'); if(!append) c.innerHTML = '';
    const items = displayedCars.slice(carsShown, carsShown + LIMIT);
    items.forEach(car => c.appendChild(createCarCard(car)));
    carsShown += items.length;
    document.getElementById('load-more-cars').style.display = carsShown < displayedCars.length ? 'inline-block' : 'none';
    if(displayedCars.length === 0 && !append) c.innerHTML=`<p style="text-align:center">${t('none')}</p>`;
}

function createCarCard(car) {
    const hasDriver = !!car.currentDriverId;
    const lSt=getStatusClass(car.licenseExpiry, hasDriver), iSt=getStatusClass(car.insuranceExpiry, hasDriver); 
    let cSt = (lSt==='status-danger' || iSt==='status-danger') ? 'status-danger' : (lSt==='status-red' || iSt==='status-red') ? 'status-red' : (lSt==='status-yellow' || iSt==='status-yellow') ? 'status-yellow' : 'status-green';
    
    const el=document.createElement('div'); el.className=`card ${cSt}`; 
    el.innerHTML=`
        <div class="card-header">
            <div style="flex-shrink: 0;">
                <div class="card-title">${car.id}</div>
                <div class="plate-design">
                    <span class="plate-number">${car.plateNumber}</span> <span class="plate-sep">|</span> <span class="plate-code">${car.plateCode}</span> <span class="plate-sep">|</span> <span class="plate-emirate">${car.emirate}</span>
                </div>
                <div style="margin-top:5px"><b>${t('owner')}:</b> ${car.owner}</div>
            </div>
            <div class="card-driver-info">
                ${hasDriver?`<span class="custody-badge" title="${car.currentDriverName}"><i class="fas fa-user"></i> ${car.currentDriverName}</span>`:`<small style="color:#888">${t('noDriver')}</small>`}
            </div>
        </div>
        <div class="card-body">
            <p><b>${t('carType')}:</b> ${car.type} | ${car.year}</p><p><b>${t('vin')}:</b> ${car.vin}</p>
            <p><b>${t('licenseExpiry')}:</b> ${fmtDate(car.licenseExpiry)} (${getStatusText(car.licenseExpiry)})</p>
            <p><b>${t('insuranceExpiry')}:</b> ${fmtDate(car.insuranceExpiry)} (${getStatusText(car.insuranceExpiry)})</p>
            ${car.notes?`<p><b>${t('notes')}:</b> ${car.notes}</p>`:''}${car.violations?`<p style="color:red"><b>${t('violations')}:</b> ${car.violations}</p>`:''}
            <div class="card-actions">
                ${!hasDriver?`<button class="btn-action assign" style="background:var(--primary-dark)"><i class="fas fa-link"></i> ${t('assign')}</button>`:`<button class="btn-action unassign" style="background:var(--yellow);color:#333"><i class="fas fa-unlink"></i> ${t('unassign')}</button>`}
                <button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button>
                <button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button>
                <button class="btn-action print" style="background:#17a2b8"><i class="fas fa-print"></i> ${t('print')}</button>
                <button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button>
                <button class="btn-action share" style="background:#6c757d"><i class="fas fa-share"></i></button>
            </div>
        </div>`;
    
    el.querySelector('.card-header').addEventListener('click', e => { if(!e.target.closest('.btn-action') && !e.target.closest('.custody-badge') && !e.target.closest('.toggle-cars-btn')) el.classList.toggle('expanded'); });
    el.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); openCarModal(car); });
    el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); deleteCar(car.id); });
    el.querySelector('.print').addEventListener('click', e => { e.stopPropagation(); printCard(car); });
    el.querySelector('.share').addEventListener('click', e => { e.stopPropagation(); shareCard(car); });
    el.querySelector('.history').addEventListener('click', e => { e.stopPropagation(); showCustodyHistory('car', car.id); });
    if(hasDriver) {
        el.querySelector('.unassign').addEventListener('click', e => { e.stopPropagation(); unassignCar(car); });
        el.querySelector('.custody-badge').addEventListener('click', e => { e.stopPropagation(); unassignCar(car); });
    }
    else el.querySelector('.assign').addEventListener('click', e => { e.stopPropagation(); openCustodyModal('car', car.id); });
    return el;
}

function printCard(car) {
    const lColor = getStatusPrintColor(car.licenseExpiry);
    const iColor = getStatusPrintColor(car.insuranceExpiry);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
    <html dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}">
    <head><title>${car.id}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; background: #fff; color: #333; }
            .print-card { border: 2px solid #000; border-radius: 15px; padding: 25px; max-width: 600px; margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #ccc; padding-bottom: 15px; margin-bottom: 15px; }
            .print-title { font-size: 24px; font-weight: bold; color: #4a8fb0; }
            .print-plate { font-size: 32px; font-weight: bold; border: 3px solid #000; padding: 10px 20px; border-radius: 8px; text-align: center; display: inline-block; letter-spacing: 2px; }
            .print-plate .code { color: #c0392b; }
            .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .print-item { background: #f8f9fa; padding: 10px; border-radius: 8px; border-left: 4px solid #4a8fb0; }
            .print-label { font-size: 12px; color: #666; margin-bottom: 5px; font-weight: bold; }
            .print-value { font-size: 16px; font-weight: bold; }
            .status-badge { font-weight: bold; font-size: 14px; }
            .print-footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="print-card">
            <div class="print-header">
                <div><div class="print-title">${t('car')}: ${car.id}</div><div style="margin-top:10px;"><span class="print-plate">${car.plateNumber} | <span class="code">${car.plateCode}</span> | ${car.emirate}</span></div></div>
                <div style="text-align: ${currentLang === 'ar' ? 'left' : 'right'};"><div class="print-label">${t('driverName')}</div><div class="print-value" style="font-size: 20px;">${car.currentDriverName || t('noDriver')}</div></div>
            </div>
            <div class="print-grid">
                <div class="print-item"><div class="print-label">${t('owner')}</div><div class="print-value">${car.owner}</div></div>
                <div class="print-item"><div class="print-label">${t('carType')} & ${t('carYear')}</div><div class="print-value">${car.type} - ${car.year}</div></div>
                <div class="print-item" style="grid-column: span 2;"><div class="print-label">${t('vin')}</div><div class="print-value">${car.vin}</div></div>
                <div class="print-item"><div class="print-label">${t('licenseExpiry')}</div><div class="print-value">${fmtDate(car.licenseExpiry)} <span class="status-badge" style="color:${lColor}">(${getStatusText(car.licenseExpiry)})</span></div></div>
                <div class="print-item"><div class="print-label">${t('insuranceExpiry')}</div><div class="print-value">${fmtDate(car.insuranceExpiry)} <span class="status-badge" style="color:${iColor}">(${getStatusText(car.insuranceExpiry)})</span></div></div>
            </div>
            ${car.notes ? `<div class="print-item" style="margin-bottom:10px;"><div class="print-label">${t('notes')}</div><div class="print-value">${car.notes}</div></div>` : ''}
            ${car.violations ? `<div class="print-item" style="border-left-color: #dc3545; margin-bottom:10px;"><div class="print-label" style="color: #dc3545;">${t('violations')}</div><div class="print-value" style="color: #dc3545;">${car.violations}</div></div>` : ''}
            <div class="print-footer">FleetSys &copy; ${new Date().getFullYear()} | ${t('logTime')}: ${fmtDateTime(new Date().toISOString())}</div>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
    </body></html>`);
    printWindow.document.close();
}

function shareCard(car) { const text=`${t('car')}: ${car.id}\n${t('plateNumber')}: ${car.plateNumber}|${car.plateCode}\n${t('owner')}: ${car.owner}\n${t('driverName')}: ${car.currentDriverName||t('noDriver')}`; if(navigator.share) navigator.share({title:car.id, text:text}); else { navigator.clipboard.writeText(text); alert(t('copied')); } }

// =================== DRIVERS ===================
document.getElementById('add-driver-btn').addEventListener('click', () => openDriverModal());
document.getElementById('load-more-drivers').addEventListener('click', () => renderDrivers(true));
document.getElementById('search-driver').addEventListener('input', applyDriverSearch);

function openDriverModal(data=null) { document.getElementById('driver-form').reset(); document.getElementById('driver-id-hidden').value=''; document.getElementById('driver-modal-title').textContent=data?t('edit'):t('addDriver'); if(data){document.getElementById('driver-id-hidden').value=data.id;document.getElementById('driver-name').value=data.name;document.getElementById('driver-contact').value=data.contact;document.getElementById('driver-notes').value=data.notes||'';} document.getElementById('driver-modal').style.display='block'; }

document.getElementById('driver-form').addEventListener('submit', async e => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
    const hid=document.getElementById('driver-id-hidden').value, data={name:document.getElementById('driver-name').value.trim(), contact:document.getElementById('driver-contact').value.trim(), notes:document.getElementById('driver-notes').value.trim()};
    try { 
        const snap = await get(ref(db, 'drivers')); 
        if(snap.exists()) { const drivers = snap.val(); for(let k in drivers) { if(k === hid) continue; if(drivers[k].contact === data.contact || drivers[k].name === data.name) { alert(t('dupDriver')); btn.disabled=false; btn.textContent=t('save'); return; } } }
        if(hid){ await update(ref(db,`drivers/${hid}`),data); await logAction(t('edit'), data.name); } else { const dRef=push(ref(db,'drivers')); data.id=dRef.key; await set(dRef,data); await logAction(t('addDriver'), data.name); } document.getElementById('driver-modal').style.display='none'; 
    } catch(err){alert(err)} finally{btn.disabled=false;btn.textContent=t('save');}
});

async function deleteDriver(id) { const assignedCars = allCars.filter(c => c.currentDriverId === id); if(assignedCars.length > 0){alert(t('unassignFirst'));return;} if(confirm(t('confirmDeleteDriver'))){ await remove(ref(db,`drivers/${id}`)); await logAction(t('delete'), id); } }

function fetchDrivers() { onValue(ref(db,'drivers'), snap => { allDrivers = snap.exists() ? Object.values(snap.val()) : []; applyDriverSearch(); }); }
function applyDriverSearch() { const q = document.getElementById('search-driver').value.toLowerCase(); displayedDrivers = q ? allDrivers.filter(d => `${d.name} ${d.contact}`.toLowerCase().includes(q)) : allDrivers; driversShown = 0; renderDrivers(false); }
function renderDrivers(append) {
    const c = document.getElementById('drivers-container'); if(!append) c.innerHTML = '';
    const items = displayedDrivers.slice(driversShown, driversShown + LIMIT);
    items.forEach(d => c.appendChild(createDriverCard(d)));
    driversShown += items.length;
    document.getElementById('load-more-drivers').style.display = driversShown < displayedDrivers.length ? 'inline-block' : 'none';
    if(displayedDrivers.length === 0 && !append) c.innerHTML=`<p style="text-align:center">${t('none')}</p>`;
}

function createDriverCard(d) {
    const assignedCars = allCars.filter(c => c.currentDriverId === d.id);
    const el=document.createElement('div'); el.className='card status-green'; 
    
    // منطق عرض السيارات المتعددة بشكل احترافي
    let carsHtml = `<small style="color:#888">${t('noCar')}</small>`;
    if (assignedCars.length > 0) {
        const firstCar = assignedCars[0];
        const firstBadge = `<span class="custody-badge unassign-car-btn" data-car-id="${firstCar.id}"><i class="fas fa-car"></i> ${firstCar.plateNumber}|${firstCar.plateCode}</span>`;
        
        if (assignedCars.length === 1) {
            carsHtml = firstBadge;
        } else {
            let moreBadges = assignedCars.slice(1).map(c => 
                `<span class="custody-badge unassign-car-btn" data-car-id="${c.id}"><i class="fas fa-car"></i> ${c.plateNumber}|${c.plateCode}</span>`
            ).join('');
            
            carsHtml = `
                <div class="driver-cars-wrapper">
                    ${firstBadge}
                    <button class="toggle-cars-btn"><i class="fas fa-chevron-down"></i> +${assignedCars.length - 1} ${t('moreCars')}</button>
                    <div class="more-cars-list">${moreBadges}</div>
                </div>
            `;
        }
    }

    el.innerHTML=`
        <div class="card-header">
            <div><div class="card-title"><i class="fas fa-user"></i> ${d.name}</div><div style="color:#666; margin-top:5px"><i class="fas fa-phone"></i> ${d.contact}</div></div>
            <div class="card-driver-info">${carsHtml}</div>
        </div>
        <div class="card-body">${d.notes?`<p>${d.notes}</p>`:''}
            <div class="card-actions">
                <button class="btn-action assign" style="background:var(--green)"><i class="fas fa-plus"></i> ${t('assign')}</button>
                <button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button>
                <button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button>
                <button class="btn-action history" style="background:#6c757d"><i class="fas fa-history"></i> ${t('history')}</button>
            </div>
        </div>`;
    
    el.querySelector('.card-header').addEventListener('click', e => { if(!e.target.closest('.btn-action') && !e.target.closest('.custody-badge') && !e.target.closest('.toggle-cars-btn')) el.classList.toggle('expanded'); });
    el.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); openDriverModal(d); });
    el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); deleteDriver(d.id); });
    el.querySelector('.history').addEventListener('click', e => { e.stopPropagation(); showCustodyHistory('driver', d.id); });
    el.querySelector('.assign').addEventListener('click', e => { e.stopPropagation(); openCustodyModal('driver', d.id); });
    
    // تشغيل زر عرض المزيد للسيارات
    const toggleBtn = el.querySelector('.toggle-cars-btn');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', e => { 
            e.stopPropagation(); 
            el.classList.toggle('show-more-cars'); 
            const icon = toggleBtn.querySelector('i');
            if(el.classList.contains('show-more-cars')) icon.className = 'fas fa-chevron-up';
            else icon.className = 'fas fa-chevron-down';
        });
    }

    el.querySelectorAll('.unassign-car-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); const carObj = allCars.find(c => c.id === btn.getAttribute('data-car-id')); if(carObj) unassignCar(carObj); });
    });
    return el;
}

// =================== CUSTODY LOGIC ===================
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

    if(mode === 'car') {
        carId = sourceId;
        driverId = document.getElementById('custody-driver-select').value;
        if(!driverId){alert(t('selectDriver'));return;}
    } else {
        driverId = sourceId;
        carId = document.getElementById('custody-car-select').value;
        if(!carId){alert(t('selectCar'));return;}
    }

    try { 
        const carData = allCars.find(c => c.id === carId); 
        const dData = allDrivers.find(d => d.id === driverId); 
        if(!carData || !dData) { alert(t('none')); return; }
        const now = new Date().toISOString();
        await update(ref(db,`cars/${carId}`),{currentDriverId:driverId,currentDriverName:dData.name}); 
        const hRef = push(ref(db, 'custodyHistory'));
        await set(hRef, { carId: carId, driverId: driverId, driverName: dData.name, carPlate: `${carData.plateNumber}|${carData.plateCode}`, startTime: now, endTime: null });
        await logAction(t('assignCustody'), `${t('car')} ${carId} -> ${t('driverName')} ${dData.name}`); 
        document.getElementById('custody-modal').style.display='none'; 
    } catch(err){alert(err)}
});

async function unassignCar(car) { 
    if(!confirm(t('confirmUnassign')))return; 
    try { 
        const hSnap = await get(ref(db, 'custodyHistory')); let key = null;
        if(hSnap.exists()) hSnap.forEach(c => { if(c.val().carId === car.id && !c.val().endTime) key = c.key; });
        const now = new Date().toISOString();
        if(key) await update(ref(db, `custodyHistory/${key}`), { endTime: now });
        await update(ref(db, `cars/${car.id}`), { currentDriverId: null, currentDriverName: null }); 
        await logAction(t('unassign'), `${t('car')} ${car.id}`); 
    } catch(err){alert(err)} 
}

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
        if(records.length === 0) { tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">${t('none')}</td></tr>`; }
        else {
            records.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${type === 'car' ? r.driverName : r.carPlate}</td><td>${fmtDateTime(r.startTime)}</td><td>${r.endTime ? fmtDateTime(r.endTime) : `<b style="color:var(--green)">${t('untilNow')}</b>`}</td>`;
                tbody.appendChild(tr);
            });
        }
        document.getElementById('history-modal').style.display = 'block';
    } catch(err) { alert(err); }
}

// =================== MODERATORS ===================
document.getElementById('add-mod-btn').addEventListener('click', () => { requestPin(() => { document.getElementById('mod-form').reset(); document.getElementById('mod-uid-hidden').value=''; document.getElementById('mod-pass-group').style.display='flex'; document.getElementById('mod-modal').style.display='block'; }); });
document.getElementById('load-more-mods').addEventListener('click', () => renderMods(true));

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
    const c = document.getElementById('mods-container'); if(!append) c.innerHTML = '';
    const items = allMods.slice(modsShown, modsShown + LIMIT);
    items.forEach(u => c.appendChild(createModCard(u)));
    modsShown += items.length;
    document.getElementById('load-more-mods').style.display = modsShown < allMods.length ? 'inline-block' : 'none';
}

function createModCard(u) {
    const el=document.createElement('div'); el.className=`card ${u.status==='active'?'status-green':'status-red'}`;
    el.innerHTML=`
        <div class="card-header"><div class="card-title">${u.name}</div><small>${u.email}</small></div>
        <div class="card-body"><p>${u.status==='active'?`<span style="color:green">${t('active')}</span>`:`<span style="color:red">${t('suspended')}</span>`}</p>
            <div class="card-actions">
                ${u.status==='active'?`<button class="btn-action suspend" style="background:var(--yellow);color:#333"><i class="fas fa-ban"></i> ${t('suspended')}</button>`:`<button class="btn-action activate" style="background:var(--green)"><i class="fas fa-check"></i> ${t('active')}</button>`}
                <button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i> ${t('edit')}</button>
                <button class="btn-action reset-pass" style="background:#17a2b8"><i class="fas fa-key"></i> ${t('resetPass')}</button>
                <button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i> ${t('delete')}</button>
            </div>
        </div>`;
    
    el.querySelector('.card-header').addEventListener('click', e => { if(!e.target.closest('.btn-action')) el.classList.toggle('expanded'); });
    if(u.status==='active') el.querySelector('.suspend').addEventListener('click', e => { e.stopPropagation(); requestPin(async()=>{await update(ref(db,`users/${u.id}`),{status:'suspended'});await logAction(t('suspended'),u.name);}); });
    else el.querySelector('.activate').addEventListener('click', e => { e.stopPropagation(); requestPin(async()=>{await update(ref(db,`users/${u.id}`),{status:'active'});await logAction(t('active'),u.name);}); });
    el.querySelector('.edit').addEventListener('click', e => { e.stopPropagation(); document.getElementById('mod-uid-hidden').value = u.id; document.getElementById('mod-name').value = u.name; document.getElementById('mod-email').value = u.email; document.getElementById('mod-pass-group').style.display = 'none'; document.getElementById('mod-modal').style.display = 'block'; });
    el.querySelector('.reset-pass').addEventListener('click', async e => { e.stopPropagation(); try { await sendPasswordResetEmail(auth, u.email); alert(t('resetPassSent')); } catch(err) { alert(err.message); } });
    el.querySelector('.delete').addEventListener('click', e => { e.stopPropagation(); requestPin(async()=>{if(confirm(t('confirmDeleteCar'))){await remove(ref(db,`users/${u.id}`));await logAction(t('delete'),u.name);}}); });
    return el;
}

// =================== LOGS ===================
document.getElementById('load-more-logs').addEventListener('click', () => renderLogs(true));
function fetchLogs() { onValue(ref(db,'logs'), snap => { allLogs = snap.exists() ? Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)) : []; logsShown = 0; renderLogs(false); }); }
function renderLogs(append) {
    const tb = document.getElementById('logs-tbody'); if(!append) tb.innerHTML = '';
    const items = allLogs.slice(logsShown, logsShown + LIMIT);
    items.forEach(l => { const tr=document.createElement('tr'); tr.innerHTML=`<td>${fmtDateTime(l.timestamp)}</td><td>${l.userId}</td><td>${l.action}</td><td>${l.details}</td>`; tb.appendChild(tr); });
    logsShown += items.length;
    document.getElementById('load-more-logs').style.display = logsShown < allLogs.length ? 'inline-block' : 'none';
}

// =================== STATS & NAVIGATION SHORTCUTS ===================
function setupStatClicks() {
    document.getElementById('stat-cars-active').parentElement.addEventListener('click', () => {
        showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'active'; applyCarSearch();
    });
    document.getElementById('stat-cars-warn').parentElement.addEventListener('click', () => {
        showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'warn'; applyCarSearch();
    });
    document.getElementById('stat-cars-exp').parentElement.addEventListener('click', () => {
        showSection('cars'); document.getElementById('search-car').value = ''; currentCarStatusFilter = 'exp'; applyCarSearch();
    });
    document.getElementById('stat-drivers').parentElement.addEventListener('click', () => {
        showSection('drivers');
    });
}

function calculateStats() { 
    onValue(ref(db,'cars'), snap => { let g=0,y=0,r=0; if(snap.exists()) Object.values(snap.val()).forEach(c=>{
        const status = getCarOverallStatus(c);
        if(status==='active')g++; else if(status==='warn')y++; else r++;
    }); document.getElementById('stat-cars-active').textContent=g; document.getElementById('stat-cars-warn').textContent=y; document.getElementById('stat-cars-exp').textContent=r; }); 
    onValue(ref(db,'drivers'), snap => document.getElementById('stat-drivers').textContent=snap.exists()?Object.keys(snap.val()).length:0); 
    if(isAdmin) { onValue(ref(db,'users'), snap => { let m=0; if(snap.exists()) Object.values(snap.val()).forEach(u=>{if(u.role==='moderator')m++}); document.getElementById('stat-mods').textContent=m; }); }
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));