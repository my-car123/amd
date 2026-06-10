/* ==========================================================================
   نظام إدارة الأسطول - المحرك التشغيلي الرئيسي (app.js)
   ========================================================================== */

const { ref, set, get, child, push, query, orderByChild, equalTo, limitToFirst, startAfter } = window.dbTools;

// ================== الإعدادات العامة ==================
let currentUserRole = 'guest';
let currentLang = localStorage.getItem('sys_lang') || 'ar';
const ITEMS_PER_PAGE = 10;

// ================== التهيئة (Initialization) ==================
window.addEventListener('DOMContentLoaded', () => {
    // تهيئة اللغة
    initLanguage();
    
    // تهيئة الساعة
    updateClock();
    setInterval(updateClock, 1000);

    // التحقق من المستخدم والصلاحيات
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const snapshot = await get(ref(firebaseDB, `system_users/${user.uid}`));
            if (snapshot.exists()) {
                currentUserRole = snapshot.val().role;
                localStorage.setItem('user_role', currentUserRole);
                enforceAdminUI();
                initDashboard();
            }
        }
    });
});

function initLanguage() {
    const html = document.documentElement;
    html.setAttribute('lang', currentLang);
    html.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    // تحديث النصوص الثابتة (يمكن توسيعها لاحقاً)
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        // منطق الترجمة (مبسط للآن)
    });
}

function updateClock() {
    const clockEl = document.getElementById('clockWidget');
    if (!clockEl) return;
    const now = new Date();
    const uaeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dubai"}));
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const locale = currentLang === 'ar' ? 'ar-AE' : 'en-US';
    
    // تنسيق مخصص: الاثنين 10 مايو 2025 الساعة 10:23 مساءً
    let timeStr = uaeTime.toLocaleDateString(locale, options);
    if(currentLang === 'ar') {
        timeStr = timeStr.replace('،', ' الساعة ') + (uaeTime.getHours() >= 12 ? ' مساءً' : ' صباحاً');
    }
    
    clockEl.textContent = timeStr;
}

function enforceAdminUI() {
    if (currentUserRole !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    }
}

function initDashboard() {
    switchTab('vehicles'); // تحميل السيارات افتراضياً
    loadStats();
}

// ================== التنقل (Navigation) ==================
function switchTab(tabName) {
    // تحديث القائمة الجانبية
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabName}')"]`)?.classList.add('active');

    // تحديث المحتوى
    document.querySelectorAll('.page-panel').forEach(panel => panel.style.display = 'none');
    document.getElementById(`panel-${tabName}`).style.display = 'block';

    // تحميل البيانات الخاصة بالتبويب
    if (tabName === 'vehicles') loadVehicles();
    if (tabName === 'drivers') loadDrivers();
    if (tabName === 'users') loadUsers();
    if (tabName === 'logs') loadSystemLogs();
}

// ================== المركبات (Vehicles Logic) ==================
let lastVehicleKey = null;

async function loadVehicles(searchQuery = null, loadMore = false) {
    const container = document.getElementById('vehiclesList');
    const loadMoreBtn = document.getElementById('loadMoreVehicles');
    
    if (!loadMore) {
        container.innerHTML = '<div class="loading-placeholder">جاري التحميل...</div>';
        lastVehicleKey = null;
    }

    try {
        let queryRef;
        const baseRef = ref(firebaseDB, "vehicles");

        if (searchQuery) {
            // بحث برقم اللوحة (يجب وجود فهرس في القواعد)
            queryRef = query(baseRef, orderByChild('plateNumber'), equalTo(searchQuery), limitToFirst(ITEMS_PER_PAGE));
        } else {
            if (loadMore && lastVehicleKey) {
                queryRef = query(baseRef, orderByKey(), startAfter(lastVehicleKey), limitToFirst(ITEMS_PER_PAGE));
            } else {
                queryRef = query(baseRef, orderByKey(), limitToFirst(ITEMS_PER_PAGE));
            }
        }

        const snapshot = await get(queryRef);
        
        if (!loadMore) container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد بيانات</p>';
            loadMoreBtn.style.display = 'none';
            return;
        }

        snapshot.forEach(childSnap => {
            lastVehicleKey = childSnap.key; // تحديث آخر مفتاح للتقسيم
            renderVehicleCard(childSnap.key, childSnap.val());
        });

        // إظهار/إخفاء زر التحميل
        loadMoreBtn.style.display = snapshot.size === ITEMS_PER_PAGE ? 'block' : 'none';
        
    } catch (e) {
        console.error("Load Vehicles Error:", e);
        container.innerHTML = '<p class="text-danger">خطأ في تحميل البيانات</p>';
    }
}

function renderVehicleCard(id, data) {
    const container = document.getElementById('vehiclesList');
    const statusReg = checkExpiry(data.regExpiry);
    const statusIns = checkExpiry(data.insExpiry);
    const worstStatus = getWorstStatus(statusReg, statusIns); // تحديد الأسوأ للون الحافة
    
    // ملاحظة: لا يوجد زر تعديل أو حذف وفقاً للقواعد
    const html = `
    <div class="card ${worstStatus}" id="v-${id}">
        <div class="card-head" onclick="toggleCard(this)">
            <div>
                <div class="plate-abudhabi">
                    <div class="plate-code">${data.plateCategory || '-'}</div>
                    <div class="plate-number">${data.plateNumber || '0000'}</div>
                </div>
                <div style="margin-top:5px; font-size:0.9rem; color:var(--text-muted);">
                    <span>${data.vehicleId}</span> - <span>${data.type}</span>
                </div>
            </div>
            <div class="status-indicator">
                <span class="status-dot ${statusReg}"></span>
                <span class="status-dot ${statusIns}" style="margin-right:5px;"></span>
            </div>
        </div>
        <div class="card-body">
            <div class="details-grid">
                <div class="detail-item"><strong>المالك:</strong> <span>${data.owner}</span></div>
                <div class="detail-item"><strong>النوع:</strong> <span>${data.type} ${data.year}</span></div>
                <div class="detail-item"><strong>VIN:</strong> <span>${data.vin}</span></div>
                <div class="detail-item"><strong>الترخيص:</strong> <span>${data.regExpiry} (${getDaysLeft(data.regExpiry)})</span></div>
                <div class="detail-item"><strong>التأمين:</strong> <span>${data.insExpiry} (${getDaysLeft(data.insExpiry)})</span></div>
                <div class="detail-item"><strong>المستخدم الحالي:</strong> <span id="currentDriver-${id}">${data.currentDriverName || 'بدون'}</span></div>
            </div>
            
            <div class="actions-bar">
                <button class="btn btn-outline btn-sm" onclick="printCard('v-${id}')">طباعة</button>
                <button class="btn btn-primary btn-sm" onclick="openCustodyModal('${id}', '${data.currentDriverId || 'NONE'}')">إدارة العهدة</button>
            </div>
            
            <div class="history-section">
                <h4>سجل الحركة</h4>
                <div id="history-${id}">جاري التحميل...</div>
                <button class="btn btn-sm" style="margin-top:5px; font-size:0.8rem;" onclick="loadHistory('vehicles', '${id}', this)">عرض المزيد</button>
            </div>
        </div>
    </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    
    // تحميل آخر 10 سجلات تاريخ للسيارة
    loadHistory('vehicles', id, null, true);
}

// ================== السائقين (Drivers Logic) ==================
async function loadDrivers(loadMore = false) {
    const container = document.getElementById('driversList');
    if (!loadMore) container.innerHTML = '<div class="loading-placeholder">جاري التحميل...</div>';
    
    // منطق مشابه للمركبات مع التقسيم
    const snapshot = await get(query(ref(firebaseDB, "system_drivers"), limitToFirst(ITEMS_PER_PAGE)));
    container.innerHTML = '';
    if(!snapshot.exists()) { container.innerHTML = '<p style="text-align:center">لا يوجد سائقين</p>'; return; }
    
    snapshot.forEach(d => {
        const data = d.val();
        const html = `
        <div class="card success">
            <div class="card-head" onclick="toggleCard(this)">
                <div>
                    <h3>${data.driverName}</h3>
                    <small style="color:var(--text-muted)">${data.mobile}</small>
                </div>
                <span class="status-dot active"></span>
            </div>
            <div class="card-body">
                <div class="details-grid">
                    <p><strong>المعرف:</strong> ${data.driverId}</p>
                    <p><strong>الرخصة:</strong> ${data.licenseNumber}</p>
                </div>
                <div class="actions-bar">
                    <button class="btn btn-outline btn-sm" onclick="printCard(this.closest('.card'))">طباعة</button>
                </div>
            </div>
        </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ================== المستخدمين (Users - Admin Only) ==================
async function loadUsers() {
    if (currentUserRole !== 'admin') return;
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    
    const snapshot = await get(ref(firebaseDB, "system_users"));
    if(snapshot.exists()) {
        snapshot.forEach(u => {
            const d = u.val();
            const isMe = (d.email === "saad323m@gmail.com");
            const html = `
            <div class="card" style="padding:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3>${d.name} <small>(${d.role})</small></h3>
                        <p>${d.email}</p>
                    </div>
                    <div>
                        ${!isMe ? `
                            <button class="btn btn-sm ${d.status === 'active' ? 'btn-danger' : 'btn-primary'}" onclick="toggleUserStatus('${u.key}', '${d.status}')">
                                ${d.status === 'active' ? 'تعليق' : 'تفعيل'}
                            </button>
                        ` : '<span style="color:var(--primary)">المدير الرئيسي</span>'}
                    </div>
                </div>
            </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    }
}

async function toggleUserStatus(uid, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await set(ref(firebaseDB, `system_users/${uid}/status`), newStatus);
    loadUsers(); // تحديث
}

// ================== العمليات المشتركة (Utils) ==================
function toggleCard(el) { el.nextElementSibling.classList.toggle('active'); }

function checkExpiry(dateStr) {
    if (!dateStr) return '';
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'danger';
    if (diff <= 15) return 'warn';
    return 'success';
}

function getDaysLeft(dateStr) {
    if (!dateStr) return '-';
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `منتهي منذ ${Math.abs(diff)} يوم`;
    return `متبقي ${diff} يوم`;
}

function getWorstStatus(s1, s2) {
    if (s1 === 'danger' || s2 === 'danger') return 'danger';
    if (s1 === 'warn' || s2 === 'warn') return 'warn';
    return 'success';
}

// ================== النوافذ المنبثقة (Modals) ==================
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function openAddVehicleModal() {
    // توليد المعرف التسلسلي (Logic to fetch next counter)
    // للتبسيط: نستخدم الطابع الزمني أو نجلب آخر رقم
    // الحل الأمثل: node منفصل للعداد
    document.getElementById('addVehicleForm').reset();
    openModal('modalAddVehicle');
}

async function saveVehicle() {
    // جمع البيانات
    const plateNum = document.getElementById('v_plate').value;
    const plateCat = document.getElementById('v_cat').value;
    // ... باقي الحقول
    
    // توليد UAE ID (توضيح: يجب استخدام Transaction للعداد في بيئة حقيقية)
    const counterSnap = await get(ref(firebaseDB, 'system_counters/vehicles'));
    let nextNum = 1;
    if(counterSnap.exists()) nextNum = counterSnap.val() + 1;
    const uaeId = `UAE ${String(nextNum).padStart(4, '0')}`;
    
    const data = {
        vehicleId: uaeId,
        plateNumber: plateNum,
        plateCategory: plateCat,
        vin: document.getElementById('v_vin').value,
        type: document.getElementById('v_type').value,
        year: document.getElementById('v_year').value,
        owner: document.getElementById('v_owner').value,
        regExpiry: document.getElementById('v_reg').value,
        insExpiry: document.getElementById('v_ins').value,
        notes: document.getElementById('v_notes').value,
        currentDriverId: "NONE",
        currentDriverName: "NONE"
    };
    
    try {
        // حفظ السيارة
        await set(ref(firebaseDB, `vehicles/${uaeId}`), data);
        // تحديث العداد
        await set(ref(firebaseDB, 'system_counters/vehicles'), nextNum);
        // تسجيل الحدث
        await systemLogger.writeSystemLog({ vehicleId: uaeId, actionType: "VEHICLE_ADDED", details: `Added ${plateNum}` });
        
        closeModal('modalAddVehicle');
        loadVehicles();
    } catch(e) { alert("Error: " + e.message); }
}

// ================== إدارة العهدة (Custody) ==================
async function openCustodyModal(vehicleId, currentDriverId) {
    // جلب قائمة السائقين
    const snap = await get(ref(firebaseDB, 'system_drivers'));
    let options = '<option value="NONE">بدون سائق</option>';
    snap.forEach(d => {
        const driver = d.val();
        options += `<option value="${driver.driverId}" ${driver.driverId === currentDriverId ? 'selected' : ''}>${driver.driverName}</option>`;
    });
    
    document.getElementById('custodyDriverSelect').innerHTML = options;
    document.getElementById('custodyVehicleId').value = vehicleId;
    openModal('modalCustody');
}

async function updateCustody() {
    const vehicleId = document.getElementById('custodyVehicleId').value;
    const newDriverId = document.getElementById('custodyDriverSelect').value;
    const newDriverName = document.getElementById('custodyDriverSelect').selectedOptions[0].text;
    
    // 1. تحديث ملف السيارة
    await set(ref(firebaseDB, `vehicles/${vehicleId}/currentDriverId`), newDriverId);
    await set(ref(firebaseDB, `vehicles/${vehicleId}/currentDriverName`), newDriverName);
    
    // 2. التسجيل الثلاثي (Logger) - سيقوم هو بالإضافة للسجلات
    await systemLogger.writeSystemLog({
        vehicleId: vehicleId,
        driverId: newDriverId,
        driverName: newDriverName,
        actionType: "CUSTODY_CHANGE"
    });
    
    closeModal('modalCustody');
    loadVehicles(); // تحديث القائمة
}

// ================== السجلات (Logs) ==================
async function loadSystemLogs(loadMore = false) {
    if (currentUserRole !== 'admin') return;
    const container = document.getElementById('logsList');
    if(!loadMore) container.innerHTML = '';
    
    // منطق التقسيم (10 سجلات)
    const queryRef = query(ref(firebaseDB, 'system_logs'), limitToFirst(ITEMS_PER_PAGE));
    const snap = await get(queryRef);
    
    snap.forEach(log => {
        const d = log.val();
        const html = `<div class="log-item" style="padding:10px; border-bottom:1px solid #eee;">
            <span>${d.timestamp}</span> - <strong>${d.actionType}</strong> - <span>${d.vehicleId || 'N/A'}</span> by <em>${d.operator}</em>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ================== الطباعة والمشاركة ==================
function printCard(elementId) {
    const el = document.getElementById(elementId) || elementId; // support passing element
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print</title>');
    // نسخ الأنماط المهمة
    printWindow.document.write('<style>body{font-family:sans-serif; padding:20px;} .details-grid{display:grid; gap:10px;} .plate-abudhabi{border:2px solid #000; display:inline-flex;} .plate-code{background:red; color:white; padding:5px;} .plate-number{padding:5px; background:white;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(el.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// ================== الإحصائيات ==================
async function loadStats() {
    const vSnap = await get(ref(firebaseDB, 'vehicles'));
    const dSnap = await get(ref(firebaseDB, 'system_drivers'));
    
    let vCount = vSnap.exists() ? vSnap.numChildren() : 0;
    let dCount = dSnap.exists() ? dSnap.numChildren() : 0;
    let dangerCount = 0;
    
    if(vSnap.exists()) {
        vSnap.forEach(v => {
            if (checkExpiry(v.val().regExpiry) === 'danger' || checkExpiry(v.val().insExpiry) === 'danger') dangerCount++;
        });
    }
    
    document.getElementById('statVehicles').textContent = vCount;
    document.getElementById('statDrivers').textContent = dCount;
    document.getElementById('statExpired').textContent = dangerCount;
}

// ربط الأحداث (Global Scope)
window.switchTab = switchTab;
window.loadVehicles = loadVehicles;
window.openAddVehicleModal = openAddVehicleModal;
window.saveVehicle = saveVehicle;
window.openCustodyModal = openCustodyModal;
window.updateCustody = updateCustody;
window.printCard = printCard;
window.toggleCard = toggleCard;
window.loadMore = (type) => loadVehicles(null, true); // مبسط
