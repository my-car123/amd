import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, push, runTransaction } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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

// Secondary app to create users without logging out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

// --- i18n (Translation) ---
const translations = {
    ar: { loginTitle: "تسجيل الدخول", loginBtn: "دخول", navStats: "الإحصائيات", navCars: "السيارات", navDrivers: "السائقون", navMods: "المشرفون", navLogs: "السجل", statActive: "سيارات سارية", statWarn: "قاربت على الانتهاء", statExp: "منتهية", statDrivers: "سائقين", statMods: "مشرفين", addCar: "إضافة سيارة", addDriver: "إضافة سائق", addMod: "إضافة مشرف", modManagement: "إدارة المشرفين", systemLogs: "سجل النظام الدقيق", pinTitle: "التحقق من الرمز السري", pinDesc: "أدخل رمز PIN للمتابعة" },
    en: { loginTitle: "Login", loginBtn: "Login", navStats: "Stats", navCars: "Cars", navDrivers: "Drivers", navMods: "Mods", navLogs: "Logs", statActive: "Active Cars", statWarn: "Warning", statExp: "Expired", statDrivers: "Drivers", statMods: "Mods", addCar: "Add Car", addDriver: "Add Driver", addMod: "Add Mod", modManagement: "Moderators", systemLogs: "System Logs", pinTitle: "PIN Verification", pinDesc: "Enter 4-digit PIN to continue" }
};
let currentLang = 'ar';
function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.getElementById('lang-toggle').textContent = lang === 'ar' ? 'EN' : 'AR';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.textContent = translations[lang][key];
    });
}
document.getElementById('lang-toggle').addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));

// --- Auth & Session (30 Days) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const lastLogin = localStorage.getItem('fleet_last_login');
        const now = Date.now();
        if (!lastLogin) {
            localStorage.setItem('fleet_last_login', now);
        } else if (now - parseInt(lastLogin) > 30 * 24 * 60 * 60 * 1000) {
            await signOut(auth);
            localStorage.removeItem('fleet_last_login');
            return;
        }
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app-section').style.display = 'flex';
        document.getElementById('user-display-name').textContent = user.email === 'saad323m@gmail.com' ? 'SAAD (مدير)' : 'مشرف';
        initApp();
    } else {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('app-section').style.display = 'none';
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
        localStorage.setItem('fleet_last_login', Date.now());
    } catch (error) { document.getElementById('login-error').textContent = "خطأ في الدخول"; }
});
document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth); localStorage.removeItem('fleet_last_login'); });

// --- PIN Verification Logic ---
let pinCallback = null;
function requestPin(callback) {
    if(auth.currentUser.email !== 'saad323m@gmail.com') { callback(); return; } // Only admin needs PIN
    pinCallback = callback;
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-modal').style.display = 'block';
}
document.getElementById('pin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredPin = document.getElementById('pin-input').value;
    const snap = await get(ref(db, 'settings/adminPin'));
    const realPin = snap.val() || '1234'; // Default PIN
    if(enteredPin === realPin) {
        document.getElementById('pin-modal').style.display = 'none';
        if(pinCallback) pinCallback();
    } else { alert('رمز PIN خاطئ!'); }
});

// --- Navigation ---
const sections = ['stats', 'cars', 'drivers', 'mods', 'logs'];
sections.forEach(sec => {
    document.getElementById(`nav-${sec}`).addEventListener('click', (e) => { e.preventDefault(); showSection(sec); });
});
function showSection(sec) {
    sections.forEach(s => { document.getElementById(`${s}-section`).style.display = s === sec ? 'block' : 'none'; document.getElementById(`nav-${s}`).classList.toggle('active', s === sec); });
}

// --- Generic Helpers ---
document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.modal).style.display = 'none'));
window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
function getStatusClass(dateStr) { if(!dateStr) return ''; const now=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Dubai'})); const exp=new Date(dateStr); now.setHours(0,0,0,0); exp.setHours(0,0,0,0); const d=Math.ceil((exp-now)/(1000*60*60*24)); return d<0?'status-red':d<=15?'status-yellow':'status-green'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('ar-EG') : '-'; }

// --- Audit Logging ---
async function logAction(action, details) {
    const user = auth.currentUser;
    if(!user) return;
    const logRef = push(ref(db, 'logs'));
    await set(logRef, { timestamp: new Date().toISOString(), userId: user.email, action, details });
}

// --- Initialize App Data ---
function initApp() {
    fetchCars(); fetchDrivers(); fetchMods(); fetchLogs(); calculateStats();
}

// =================== CARS ===================
document.getElementById('add-car-btn').addEventListener('click', () => openCarModal());
async function generateCarId() { const c = await runTransaction(ref(db, 'counters/carsCount'), v => (v||0)+1); return `UAE_${String(c.snapshot.val()).padStart(3,'0')}`; }

function openCarModal(data=null) {
    document.getElementById('car-form').reset(); document.getElementById('car-id-hidden').value = '';
    document.getElementById('car-modal-title').textContent = data ? "تعديل سيارة" : "إضافة سيارة";
    if(data) { document.getElementById('car-id-hidden').value=data.id; document.getElementById('plate-number').value=data.plateNumber; document.getElementById('plate-code').value=data.plateCode; document.getElementById('emirate').value=data.emirate; document.getElementById('owner').value=data.owner; document.getElementById('car-type').value=data.type; document.getElementById('car-year').value=data.year; document.getElementById('vin').value=data.vin; document.getElementById('license-expiry').value=data.licenseExpiry; document.getElementById('insurance-expiry').value=data.insuranceExpiry; document.getElementById('car-notes').value=data.notes||''; document.getElementById('violations').value=data.violations||''; }
    document.getElementById('car-modal').style.display = 'block';
}

document.getElementById('car-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true; btn.textContent="Saving...";
    const hid=document.getElementById('car-id-hidden').value, vin=document.getElementById('vin').value.trim(), pNum=document.getElementById('plate-number').value.trim(), pCode=document.getElementById('plate-code').value.trim(), emi=document.getElementById('emirate').value.trim();
    try {
        const snap=await get(ref(db,'cars')); if(snap.exists()){ const cars=snap.val(); for(let k in cars){ if(k===hid)continue; if(cars[k].vin===vin){alert('VIN مكرر!');btn.disabled=false;btn.textContent="حفظ";return;} if(cars[k].plateNumber===pNum&&cars[k].plateCode===pCode&&cars[k].emirate===emi){alert('اللوحة مكررة!');btn.disabled=false;btn.textContent="حفظ";return;} } }
        const data = { plateNumber:pNum, plateCode:pCode, emirate:emi, owner:document.getElementById('owner').value.trim(), type:document.getElementById('car-type').value.trim(), year:document.getElementById('car-year').value.trim(), vin:vin, licenseExpiry:document.getElementById('license-expiry').value, insuranceExpiry:document.getElementById('insurance-expiry').value, notes:document.getElementById('car-notes').value.trim(), violations:document.getElementById('violations').value.trim(), currentDriverId:null, currentDriverName:null };
        if(hid) { const ex=(await get(ref(db,`cars/${hid}`))).val(); data.currentDriverId=ex.currentDriverId||null; data.currentDriverName=ex.currentDriverName||null; await update(ref(db,`cars/${hid}`),data); await logAction('تعديل سيارة', hid); } else { const id=await generateCarId(); data.id=id; await set(ref(db,`cars/${id}`),data); await logAction('إضافة سيارة', id); }
        document.getElementById('car-modal').style.display='none';
    } catch(err){alert(err.message)} finally {btn.disabled=false;btn.textContent="حفظ";}
});

async function deleteCar(id) { if(confirm('حذف السيارة؟')){ await remove(ref(db,`cars/${id}`)); await logAction('حذف سيارة', id); } }

function fetchCars() { onValue(ref(db,'cars'), snap => { const c=document.getElementById('cars-container'); c.innerHTML=''; if(snap.exists()) Object.values(snap.val()).forEach(car=>c.appendChild(createCarCard(car))); else c.innerHTML='<p>لا توجد سيارات</p>'; }); }

function createCarCard(car) {
    const lSt=getStatusClass(car.licenseExpiry), iSt=getStatusClass(car.insuranceExpiry); let cSt='status-green'; if(lSt==='status-red'||iSt==='status-red')cSt='status-red'; else if(lSt==='status-yellow'||iSt==='status-yellow')cSt='status-yellow';
    const el=document.createElement('div'); el.className=`card ${cSt}`; el.dataset.search=`${car.plateNumber} ${car.vin} ${car.owner}`;
    el.innerHTML=`<div class="card-header"><div><div class="card-title">${car.id}</div><div class="plate-design"><span class="plate-number">${car.plateNumber}</span><span class="plate-code">| ${car.plateCode}</span><span class="plate-emirate">${car.emirate}</span></div></div><div style="text-align:left"><b>${car.owner}</b><br>${car.currentDriverName?`<span class="custody-badge"><i class="fas fa-user"></i> ${car.currentDriverName}</span>`:'<small style="color:#888">بدون سائق</small>'}</div></div>
    <div class="card-body"><p><b>النوع:</b> ${car.type} | ${car.year}</p><p><b>القاعدة:</b> ${car.vin}</p><p><b>ترخيص:</b> ${fmtDate(car.licenseExpiry)} <span style="color:var(--${cSt==='status-green'?'green':cSt==='status-yellow'?'yellow':'red'})">●</span></p><p><b>تأمين:</b> ${fmtDate(car.insuranceExpiry)} <span style="color:var(--${cSt==='status-green'?'green':cSt==='status-yellow'?'yellow':'red'})">●</span></p>${car.notes?`<p><b>ملاحظات:</b> ${car.notes}</p>`:''}${car.violations?`<p style="color:red"><b>مخالفات:</b> ${car.violations}</p>`:''}<div class="card-actions">${!car.currentDriverId?`<button class="btn-action assign" style="background:var(--primary-dark)"><i class="fas fa-link"></i> ربط</button>`:`<button class="btn-action unassign" style="background:var(--yellow);color:#333"><i class="fas fa-unlink"></i> فك</button>`}<button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i></button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i></button><button class="btn-action print" style="background:#17a2b8"><i class="fas fa-print"></i></button><button class="btn-action share" style="background:#6c757d"><i class="fas fa-share"></i></button></div></div>`;
    el.querySelector('.card-header').click(()=>el.classList.toggle('expanded'));
    el.querySelector('.edit').click=e=>{e.stopPropagation();openCarModal(car)};
    el.querySelector('.delete').click=e=>{e.stopPropagation();deleteCar(car.id)};
    el.querySelector('.print').click=e=>{e.stopPropagation();printCard(car)};
    el.querySelector('.share').click=e=>{e.stopPropagation();shareCard(car)};
    if(car.currentDriverId) el.querySelector('.unassign').click=e=>{e.stopPropagation();unassignDriver(car)};
    else el.querySelector('.assign').click=e=>{e.stopPropagation();openCustodyModal(car)};
    return el;
}

function printCard(car) { const w=window.open('','_blank'); w.document.write(`<html dir="rtl"><head><title>${car.id}</title><style>body{font-family:Tahoma;padding:20px;} .border{border:1px solid #000;padding:15px;border-radius:8px;} table{width:100%;} td{padding:5px;}</style></head><body><div class="border"><h2>${car.id} - ${car.plateNumber} | ${car.plateCode}</h2><hr><table><tr><td><b>المالك:</b> ${car.owner}</td><td><b>النوع:</b> ${car.type}</td></tr><tr><td><b>القاعدة:</b> ${car.vin}</td><td><b>السنة:</b> ${car.year}</td></tr><tr><td><b>انتهاء الترخيص:</b> ${fmtDate(car.licenseExpiry)}</td><td><b>انتهاء التأمين:</b> ${fmtDate(car.insuranceExpiry)}</td></tr><tr><td colspan="2"><b>السائق:</b> ${car.currentDriverName||'غير معين'}</td></tr></table></div></body></html>`); w.print(); w.close(); }
function shareCard(car) { const text=`بيانات السيارة:\nالرقم: ${car.id}\nاللوحة: ${car.plateNumber}|${car.plateCode}\nالمالك: ${car.owner}\nالسائق: ${car.currentDriverName||'لا يوجد'}`; if(navigator.share) navigator.share({title:car.id, text:text}); else { navigator.clipboard.writeText(text); alert('تم نسخ البيانات!'); } }

// =================== DRIVERS ===================
document.getElementById('add-driver-btn').addEventListener('click', () => openDriverModal());
function openDriverModal(data=null) { document.getElementById('driver-form').reset(); document.getElementById('driver-id-hidden').value=''; document.getElementById('driver-modal-title').textContent=data?'تعديل سائق':'إضافة سائق'; if(data){document.getElementById('driver-id-hidden').value=data.id;document.getElementById('driver-name').value=data.name;document.getElementById('driver-contact').value=data.contact;document.getElementById('driver-notes').value=data.notes||'';} document.getElementById('driver-modal').style.display='block'; }

document.getElementById('driver-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
    const hid=document.getElementById('driver-id-hidden').value, data={name:document.getElementById('driver-name').value.trim(), contact:document.getElementById('driver-contact').value.trim(), notes:document.getElementById('driver-notes').value.trim(), currentCarId:null, currentCarPlate:null};
    try { if(hid){ const ex=(await get(ref(db,`drivers/${hid}`))).val(); data.currentCarId=ex.currentCarId||null; data.currentCarPlate=ex.currentCarPlate||null; await update(ref(db,`drivers/${hid}`),data); await logAction('تعديل سائق', data.name); } else { const dRef=push(ref(db,'drivers')); data.id=dRef.key; await set(dRef,data); await logAction('إضافة سائق', data.name); } document.getElementById('driver-modal').style.display='none'; } catch(err){alert(err)} finally{btn.disabled=false;}
});

async function deleteDriver(id, carId) { if(carId){alert('افك العهدة أولاً');return;} if(confirm('حذف السائق؟')){ await remove(ref(db,`drivers/${id}`)); await logAction('حذف سائق', id); } }

function fetchDrivers() { onValue(ref(db,'drivers'), snap => { const c=document.getElementById('drivers-container'); c.innerHTML=''; if(snap.exists()) Object.values(snap.val()).forEach(d=>c.appendChild(createDriverCard(d))); else c.innerHTML='<p>لا يوجد سائقون</p>'; }); }

function createDriverCard(d) {
    const el=document.createElement('div'); el.className='card status-green'; el.dataset.search=`${d.name} ${d.contact}`;
    el.innerHTML=`<div class="card-header"><div><div class="card-title"><i class="fas fa-user"></i> ${d.name}</div><div style="color:#666"><i class="fas fa-phone"></i> ${d.contact}</div></div><div style="text-align:left">${d.currentCarPlate?`<span class="custody-badge"><i class="fas fa-car"></i> ${d.currentCarPlate}</span>`:'<small style="color:#888">بدون عهدة</small>'}</div></div><div class="card-body">${d.notes?`<p>${d.notes}</p>`:''}<div class="card-actions"><button class="btn-action edit" style="background:#6c757d"><i class="fas fa-edit"></i></button><button class="btn-action delete" style="background:var(--red)"><i class="fas fa-trash"></i></button></div></div>`;
    el.querySelector('.card-header').click(()=>el.classList.toggle('expanded'));
    el.querySelector('.edit').click=e=>{e.stopPropagation();openDriverModal(d)};
    el.querySelector('.delete').click=e=>{e.stopPropagation();deleteDriver(d.id, d.currentCarId)};
    return el;
}

// =================== CUSTODY ===================
async function openCustodyModal(car) { document.getElementById('custody-car-id').value=car.id; document.getElementById('custody-car-display').value=`${car.plateNumber}|${car.plateCode}`; const sel=document.getElementById('custody-driver-select'); sel.innerHTML='<option value="">-- اختر --</option>'; const snap=await get(ref(db,'drivers')); if(snap.exists()) Object.values(snap.val()).forEach(d=>{if(!d.currentCarId){const o=document.createElement('option');o.value=d.id;o.textContent=`${d.name} (${d.contact})`;sel.appendChild(o);}}); document.getElementById('custody-modal').style.display='block'; }

document.getElementById('custody-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const cId=document.getElementById('custody-car-id').value, dId=document.getElementById('custody-driver-select').value; if(!dId){alert('اختر سائق');return;}
    try { const cSnap=await get(ref(db,`cars/${cId}`)), dSnap=await get(ref(db,`drivers/${dId}`)), cData=cSnap.val(), dData=dSnap.val(), now=new Date().toISOString();
        await update(ref(db,`cars/${cId}`),{currentDriverId:dId,currentDriverName:dData.name}); const pStr=`${cData.plateNumber}|${cData.plateCode}`; await update(ref(db,`drivers/${dId}`),{currentCarId:cId,currentCarPlate:pStr}); const hRef=push(ref(db,'custodyHistory')); await set(hRef,{carId:cId,driverId:dId,startTime:now,endTime:null}); await logAction('ربط عهدة', `سيارة ${cId} للسائق ${dData.name}`); document.getElementById('custody-modal').style.display='none';
    } catch(err){alert(err)}
});

async function unassignDriver(car) { if(!confirm('فك الربط؟'))return; try { const hSnap=await get(ref(db,'custodyHistory')); let key=null; if(hSnap.exists()) hSnap.forEach(c=>{if(c.val().carId===car.id&&!c.val().endTime)key=c.key;}); const now=new Date().toISOString(); if(key) await update(ref(db,`custodyHistory/${key}`),{endTime:now}); await update(ref(db,`cars/${car.id}`),{currentDriverId:null,currentDriverName:null}); await update(ref(db,`drivers/${car.currentDriverId}`),{currentCarId:null,currentCarPlate:null}); await logAction('فك عهدة', `سيارة ${car.id}`); } catch(err){alert(err)} }

// =================== MODERATORS ===================
document.getElementById('add-mod-btn').addEventListener('click', () => { requestPin(() => { document.getElementById('mod-form').reset(); document.getElementById('mod-modal').style.display='block'; }); });

document.getElementById('mod-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn=e.target.querySelector('button'); btn.disabled=true;
    const email=document.getElementById('mod-email').value, pass=document.getElementById('mod-pass').value, name=document.getElementById('mod-name').value;
    try { const cred=await createUserWithEmailAndPassword(secondaryAuth,email,pass); await set(ref(db,`users/${cred.user.uid}`),{email,name,role:'moderator',status:'active'}); await logAction('إضافة مشرف', name); document.getElementById('mod-modal').style.display='none'; } catch(err){alert(err.message)} finally{btn.disabled=false;}
});

function fetchMods() { onValue(ref(db,'users'), snap => { const c=document.getElementById('mods-container'); c.innerHTML=''; if(snap.exists()) Object.values(snap.val()).forEach(u=>{if(u.role==='moderator')c.appendChild(createModCard(u))}); }); }

function createModCard(u) {
    const el=document.createElement('div'); el.className=`card ${u.status==='active'?'status-green':'status-red'}`;
    el.innerHTML=`<div class="card-header"><div class="card-title">${u.name}</div><small>${u.email}</small></div><div class="card-body"><p>الحالة: ${u.status==='active'?'فعال':'معلق'}</p><div class="card-actions">${u.status==='active'?`<button class="btn-action suspend" style="background:var(--yellow);color:#333">تعليق</button>`:`<button class="btn-action activate" style="background:var(--green)">تفعيل</button>`}<button class="btn-action delete" style="background:var(--red)">حذف</button></div></div>`;
    el.querySelector('.card-header').click(()=>el.classList.toggle('expanded'));
    if(u.status==='active') el.querySelector('.suspend').click=e=>{e.stopPropagation();requestPin(async()=>{await update(ref(db,`users/${u.id||u.uid}`),{status:'suspended'});await logAction('تعليق مشرف',u.name);})};
    else el.querySelector('.activate').click=e=>{e.stopPropagation();requestPin(async()=>{await update(ref(db,`users/${u.id||u.uid}`),{status:'active'});await logAction('تفعيل مشرف',u.name);})};
    el.querySelector('.delete').click=e=>{e.stopPropagation();requestPin(async()=>{if(confirm('حذف المشرف نهائياً؟')){await remove(ref(db,`users/${u.id||u.uid}`));await logAction('حذف مشرف',u.name);}})};
    return el;
}

// =================== LOGS ===================
function fetchLogs() { onValue(ref(db,'logs'), snap => { const tb=document.getElementById('logs-tbody'); tb.innerHTML=''; if(snap.exists()) { const arr=Object.values(snap.val()).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)); arr.forEach(l=>{const tr=document.createElement('tr'); tr.innerHTML=`<td>${new Date(l.timestamp).toLocaleString('ar-EG',{timeZone:'Asia/Dubai'})}</td><td>${l.userId}</td><td>${l.action}</td><td>${l.details}</td>`; tb.appendChild(tr);}); } }); }

// =================== STATS & SEARCH ===================
function calculateStats() { onValue(ref(db,'cars'), snap => { let g=0,y=0,r=0; if(snap.exists()) Object.values(snap.val()).forEach(c=>{const s=getStatusClass(c.licenseExpiry); if(s==='status-green')g++; else if(s==='status-yellow')y++; else r++;}); document.getElementById('stat-cars-active').textContent=g; document.getElementById('stat-cars-warn').textContent=y; document.getElementById('stat-cars-exp').textContent=r; }); onValue(ref(db,'drivers'), snap => document.getElementById('stat-drivers').textContent=snap.exists()?Object.keys(snap.val()).length:0); onValue(ref(db,'users'), snap => { let m=0; if(snap.exists()) Object.values(snap.val()).forEach(u=>{if(u.role==='moderator')m++}); document.getElementById('stat-mods').textContent=m; }); }

document.getElementById('search-car').addEventListener('input', e => { const q=e.target.value.toLowerCase(); document.querySelectorAll('#cars-container .card').forEach(c=>c.style.display=c.dataset.search.toLowerCase().includes(q)?'block':'none'); });
document.getElementById('search-driver').addEventListener('input', e => { const q=e.target.value.toLowerCase(); document.querySelectorAll('#drivers-container .card').forEach(c=>c.style.display=c.dataset.search.toLowerCase().includes(q)?'block':'none'); });

// PWA
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));