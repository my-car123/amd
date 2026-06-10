/* ==========================================================================
   نظام إدارة الأسطول - المحرك التشغيلي الرئيسي (app.js)
   ========================================================================== */

const { ref, set, get, child, push, query, orderByChild, equalTo, limitToFirst, startAfter, remove } = window.dbTools;

// متغيرات النظام العامة
let currentUserRole = 'guest';
let currentLang = localStorage.getItem('sys_lang') || 'ar';
const ITEMS_PER_PAGE = 10;

// قاموس الترجمة
const sysDict = {
    ar: {
        dashTitle: "لوحة التحكم",
        tabStats: "الإحصائيات",
        tabVehicles: "المركبات",
        tabDrivers: "السائقين",
        tabUsers: "المستخدمين",
        tabLogs: "السجلات",
        addNew: "إضافة جديد",
        searchPlaceholder: "ابحث هنا (رقم اللوحة، الاسم، VIN...)",
        loadMore: "تحميل المزيد",
        print: "طباعة",
        share: "مشاركة",
        edit: "تعديل",
        delete: "حذف",
        noData: "لا توجد بيانات",
        confirmDelete: "هل أنت متأكد من الحذف؟",
        successSave: "تم الحفظ بنجاح",
        errorGeneric: "حدث خطأ، حاول مرة أخرى",
        statusActive: "فعال",
        statusSuspended: "معلق",
        actions: "إجراءات"
    },
    en: {
        dashTitle: "Dashboard",
        tabStats: "Statistics",
        tabVehicles: "Vehicles",
        tabDrivers: "Drivers",
        tabUsers: "Users",
        tabLogs: "Logs",
        addNew: "Add New",
        searchPlaceholder: "Search (Plate, Name, VIN...)",
        loadMore: "Load More",
        print: "Print",
        share: "Share",
        edit: "Edit",
        delete: "Delete",
        noData: "No Data Available",
        confirmDelete: "Are you sure you want to delete?",
        successSave: "Saved Successfully",
        errorGeneric: "An error occurred",
        statusActive: "Active",
        statusSuspended: "Suspended",
        actions: "Actions"
    }
};

// ================== دوال التهيئة والواجهة ==================

function initApp() {
    currentUserRole = localStorage.getItem('user_role') || 'guest';
    initLanguage();
    updateClock();
    setInterval(updateClock, 1000);
    checkAdminUI();
    switchTab('stats'); // البدء بالإحصائيات
}

function checkAdminUI() {
    // إخفاء عناصر المدير عن المشرف
    if (currentUserRole !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    }
}

function initLanguage() {
    const html = document.documentElement;
    html.setAttribute('lang', currentLang);
    html.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    document.querySelectorAll('[data-trans]').forEach(el => {
        const key = el.getAttribute('data-trans');
        if (sysDict[currentLang][key]) el.textContent = sysDict[currentLang][key];
    });
}

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('sys_lang', currentLang);
    initLanguage();
    // إعادة تحميل المحتوى الحالي لتحديث النصوص الديناميكية
    switchTab(localStorage.getItem('active_tab') || 'stats');
}

function updateClock() {
    // (نفس كود الساعة السابق لتحسين الأداء)
    const clockElement = document.getElementById('uaeClock');
    if (!clockElement) return;
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const uaeTime = new Date(utc + (3600000 * 4));
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    clockElement.textContent = uaeTime.toLocaleString(currentLang === 'ar' ? 'ar-AE' : 'en-US', options);
}

// ================== نظام التبويبات والبحث ==================

function switchTab(tabName) {
    localStorage.setItem('active_tab', tabName);
    // تحديث الواجهة
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    const activePanel = document.getElementById(`panel-${tabName}`);
    
    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    // تحميل البيانات
    if (tabName === 'stats') loadStats();
    else if (tabName === 'vehicles') loadVehicles();
    else if (tabName === 'drivers') loadDrivers();
    else if (tabName === 'users' && currentUserRole === 'admin') loadUsers();
    else if (tabName === 'logs' && currentUserRole === 'admin') loadLogs();
}

// ================== محرك المركبات (CRUD + Pagination + Search) ==================

let lastVehicleKey = null; // للتقسيم

async function loadVehicles(searchQuery = null, loadMore = false) {
    const container = document.getElementById('vehiclesList');
    const loadMoreBtn = document.getElementById('loadMoreVehicles');
    
    if (!loadMore) container.innerHTML = `<div class="loading-spinner"></div>`; // مؤشر تحميل
    
    try {
        let vRef = ref(window.firebaseDB, "vehicles");
        let qRef;

        // البحث أو الترتيب
        if (searchQuery) {
            // بحث برقم اللوحة (يفترض وجود فهرس)
            qRef = query(vRef, orderByChild('plateNumber'), equalTo(searchQuery), limitToFirst(ITEMS_PER_PAGE));
        } else {
            // العرض العادي مع التقسيم
            if (loadMore && lastVehicleKey) {
                qRef = query(vRef, orderByKey(), startAfter(lastVehicleKey), limitToFirst(ITEMS_PER_PAGE));
            } else {
                qRef = query(vRef, orderByKey(), limitToFirst(ITEMS_PER_PAGE));
            }
        }

        const snapshot = await get(qRef);
        if (!loadMore) container.innerHTML = '';

        if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
                lastVehicleKey = childSnap.key; // تحديث آخر مفتاح
                renderVehicleCard(container, childSnap.key, childSnap.val());
            });
            // إظهار زر تحميل المزيد إذا كان العدد مكتملاً
            if (loadMoreBtn) loadMoreBtn.style.display = snapshot.size === ITEMS_PER_PAGE ? 'inline-block' : 'none';
        } else {
            if (!loadMore) container.innerHTML = `<p class="no-data-msg">${sysDict[currentLang].noData}</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
    } catch (e) {
        console.error("Load Vehicles Error:", e);
        container.innerHTML = `<p class="error-msg">${sysDict[currentLang].errorGeneric}</p>`;
    }
}

function renderVehicleCard(container, id, data) {
    const status = calculateStatus(data.regExpiry);
    const statusClass = status.class;
    
    // التحقق من الصلاحيات للتعديل والحذف
    const canModify = currentUserRole === 'admin';
    const editBtn = canModify ? `<button class="btn-sm btn-outline" onclick="editVehicle('${id}')">${sysDict[currentLang].edit}</button>` : '';
    const deleteBtn = canModify ? `<button class="btn-sm btn-danger" onclick="deleteVehicle('${id}')">${sysDict[currentLang].delete}</button>` : '';

    const card = `
        <div class="record-card ${statusClass}" id="v-${id}">
            <div class="record-header" onclick="toggleAccordion('body-${id}')">
                <div class="plate-display">
                    <span class="plate-num">${data.plateNumber}</span>
                    <span class="plate-code">${data.plateCategory}</span>
                </div>
                <div class="record-actions">
                    <span class="status-dot"></span>
                    <span>${data.type} - ${data.year}</span>
                </div>
            </div>
            <div class="record-body" id="body-${id}">
                <div class="details-grid">
                    <div><strong>VIN:</strong> ${data.vin}</div>
                    <div><strong>Owner:</strong> ${data.owner}</div>
                    <div><strong>Reg Expiry:</strong> ${data.regExpiry}</div>
                    <div><strong>Ins Expiry:</strong> ${data.insExpiry}</div>
                </div>
                <div class="action-toolbar">
                    <button class="btn-sm btn-primary" onclick="printRecord('v-${id}')">${sysDict[currentLang].print}</button>
                    <button class="btn-sm btn-outline" onclick="shareRecord('${data.vehicleId}', '${data.plateNumber}')">${sysDict[currentLang].share}</button>
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', card);
}

async function openAddVehicleModal() {
    // توليد ID تسلسلي
    const snapshot = await get(ref(window.firebaseDB, "vehicles"));
    let nextSeq = 1;
    if (snapshot.exists()) nextSeq = snapshot.numChildren() + 1;
    const generatedId = `UAE-${String(nextSeq).padStart(5, '0')}`;

    const html = `
        <form onsubmit="saveVehicle(event, '${generatedId}')" class="modal-form">
            <h3>Add New Vehicle</h3>
            <input type="hidden" id="v_id" value="${generatedId}">
            <div class="form-group"><label>Plate Number</label><input type="number" id="v_plate" required></div>
            <div class="form-group"><label>Category</label><input type="text" id="v_cat" required></div>
            <div class="form-group"><label>VIN</label><input type="text" id="v_vin" required></div>
            <div class="form-group"><label>Type</label><input type="text" id="v_type" required></div>
            <div class="form-group"><label>Year</label><input type="number" id="v_year" value="2024" required></div>
            <div class="form-group"><label>Reg Expiry</label><input type="date" id="v_reg" required></div>
            <div class="form-group"><label>Ins Expiry</label><input type="date" id="v_ins" required></div>
            <button type="submit" class="btn-primary">Save</button>
        </form>
    `;
    showModal(html);
}

async function saveVehicle(e, id) {
    e.preventDefault();
    const data = {
        vehicleId: id,
        plateNumber: document.getElementById('v_plate').value,
        plateCategory: document.getElementById('v_cat').value,
        vin: document.getElementById('v_vin').value,
        type: document.getElementById('v_type').value,
        year: document.getElementById('v_year').value,
        regExpiry: document.getElementById('v_reg').value,
        insExpiry: document.getElementById('v_ins').value,
        owner: "Company",
        currentDriverId: "NONE"
    };

    try {
        await set(ref(window.firebaseDB, `vehicles/${id}`), data);
        // تسجيل الحدث (Triple Log)
        await window.systemLoggerEngine.writeTripleSystemLog({
            vehicleId: id,
            plateNumber: data.plateNumber,
            actionType: "VEHICLE_ADDED"
        });
        closeModal();
        loadVehicles(); // تحديث القائمة
        alert(sysDict[currentLang].successSave);
    } catch (err) {
        alert(sysDict[currentLang].errorGeneric);
    }
}

async function deleteVehicle(id) {
    if (!confirm(sysDict[currentLang].confirmDelete)) return;
    try {
        await remove(ref(window.firebaseDB, `vehicles/${id}`));
        await window.systemLoggerEngine.writeTripleSystemLog({ vehicleId: id, actionType: "VEHICLE_DELETED" });
        document.getElementById(`v-${id}`).remove();
    } catch (err) {
        alert(sysDict[currentLang].errorGeneric);
    }
}

// ================== أدوات مساعدة (طباعة، مشاركة، حساب التواريخ) ==================

function calculateStatus(dateStr) {
    if (!dateStr) return { class: 'status-unknown', days: 999 };
    const today = new Date();
    const exp = new Date(dateStr);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { class: 'status-danger', days: diff };
    if (diff <= 15) return { class: 'status-warning', days: diff };
    return { class: 'status-success', days: diff };
}

function toggleAccordion(id) {
    document.getElementById(id).classList.toggle('active');
}

function printRecord(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    // استخدام CSS للطباعة
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print</title>');
    printWindow.document.write('<style>body{font-family:sans-serif;} .record-body{display:block !important; border:1px solid #ccc; padding:20px;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(el.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

async function shareRecord(id, plate) {
    const shareData = {
        title: `Vehicle ${plate}`,
        text: `Details for vehicle plate: ${plate}, ID: ${id}`,
        url: window.location.href
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // نسخ الرابط كحل بديل
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        }
    } catch (err) {
        console.log("Share cancelled");
    }
}

// ================== دوال المدير (المستخدمين والإحصائيات) ==================

async function loadStats() {
    // جلب البيانات لحساب الإحصائيات
    const vSnap = await get(ref(window.firebaseDB, "vehicles"));
    const dSnap = await get(ref(window.firebaseDB, "system_drivers"));

    let totalV = 0, totalD = 0, expired = 0;
    
    if (vSnap.exists()) {
        totalV = vSnap.numChildren();
        vSnap.forEach(v => {
            if (calculateStatus(v.val().regExpiry).class === 'status-danger') expired++;
        });
    }
    if (dSnap.exists()) totalD = dSnap.numChildren();

    document.getElementById('statVehicles').textContent = totalV;
    document.getElementById('statDrivers').textContent = totalD;
    document.getElementById('statExpired').textContent = expired;
}

async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = 'Loading...';
    const snapshot = await get(ref(window.firebaseDB, "system_users"));
    container.innerHTML = '';
    if (snapshot.exists()) {
        snapshot.forEach(u => {
            const data = u.val();
            const row = `
                <div class="user-row">
                    <span>${data.email} (${data.role})</span>
                    <span class="status-${data.status}">${data.status}</span>
                    <button onclick="toggleUserStatus('${u.key}', '${data.status}')">${data.status === 'active' ? 'Suspend' : 'Activate'}</button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', row);
        });
    }
}

async function toggleUserStatus(uid, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await set(ref(window.firebaseDB, `system_users/${uid}/status`), newStatus);
    loadUsers(); // Refresh
}

// ================== تحميل الملف ==================

window.addEventListener('DOMContentLoaded', initApp);
