/* ==========================================================================
   نظام إدارة الأسطول - المحرك التشغيلي الكامل (app.js)
   ========================================================================== */

const { ref, set, get, child, push, query, orderByChild, equalTo, limitToFirst, startAfter, remove } = window.dbTools;

// الإعدادات العامة
let currentUserRole = 'guest';
let currentLang = localStorage.getItem('sys_lang') || 'ar';
const ITEMS_PER_PAGE = 10;

// القواميس
const DICT = {
    ar: { addV: "إضافة مركبة", addD: "إضافة سائق", addU: "إضافة مشرف", save: "حفظ", cancel: "إلغاء", search: "بحث...", plate: "رقم اللوحة", name: "الاسم", success: "تم بنجاح", error: "حدث خطأ", confirm: "هل أنت متأكد؟" },
    en: { addV: "Add Vehicle", addD: "Add Driver", addU: "Add Supervisor", save: "Save", cancel: "Cancel", search: "Search...", plate: "Plate Number", name: "Name", success: "Success", error: "Error", confirm: "Are you sure?" }
};

// ================== التهيئة ==================
window.addEventListener('DOMContentLoaded', () => {
    currentUserRole = localStorage.getItem('user_role') || 'supervisor';
    initUI();
    startClock();
});

function initUI() {
    // تطبيق الصلاحيات
    if (currentUserRole !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    // تنشيط التبويب الأول
    switchTab('vehicles'); 
}

function startClock() {
    const clockEl = document.getElementById('liveClock');
    if(!clockEl) return;
    
    setInterval(() => {
        const now = new Date();
        // توقيت الإمارات
        const uaeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dubai"}));
        
        // تنسيق القراءة
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const langLocale = currentLang === 'ar' ? 'ar-AE' : 'en-US';
        clockEl.textContent = uaeTime.toLocaleDateString(langLocale, options);
    }, 1000);
}

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('sys_lang', currentLang);
    location.reload();
}

// ================== التنقل ==================
function switchTab(tabName) {
    // تحديث الأزرار
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabName}')"]`)?.classList.add('active');
    
    // تحديث المحتوى
    document.querySelectorAll('.content-panel').forEach(panel => panel.style.display = 'none');
    document.getElementById(`panel-${tabName}`).style.display = 'block';

    // تحميل البيانات
    if (tabName === 'vehicles') loadVehicles();
    if (tabName === 'drivers') loadDrivers();
    if (tabName === 'users') loadUsers();
    if (tabName === 'stats') loadStats();
}

// ================== المركبات (CRUD) ==================
async function loadVehicles() {
    const container = document.getElementById('vehiclesList');
    container.innerHTML = '<p style="text-align:center">جاري التحميل...</p>';
    
    try {
        const snapshot = await get(ref(window.firebaseDB, "vehicles"));
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center">لا توجد مركبات</p>';
            return;
        }
        
        let count = 0;
        snapshot.forEach(childSnap => {
            if(count < ITEMS_PER_PAGE) {
                renderVehicleCard(childSnap.key, childSnap.val());
                count++;
            }
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red">خطأ في تحميل البيانات</p>';
    }
}

function renderVehicleCard(id, v) {
    const container = document.getElementById('vehiclesList');
    const statusClass = checkExpiry(v.regExpiry);
    const canModify = currentUserRole === 'admin';
    
    const html = `
    <div class="data-card">
        <div class="card-header" onclick="toggleAccordion(this)">
            <div style="display:flex; align-items:center; gap:15px;">
                <span class="plate-box">${v.plateNumber} - ${v.plateCategory}</span>
                <strong>${v.type} - ${v.year}</strong>
            </div>
            <span class="status-dot ${statusClass}"></span>
        </div>
        <div class="card-body">
            <div class="grid-details">
                <p><strong>VIN</strong>${v.vin}</p>
                <p><strong>Owner</strong>${v.owner}</p>
                <p><strong>Reg Expiry</strong>${v.regExpiry}</p>
                <p><strong>Ins Expiry</strong>${v.insExpiry}</p>
            </div>
            <div class="card-actions" style="margin-top:10px; display:flex; gap:10px;">
                <button class="btn-action btn-outline" onclick="printSection(this.closest('.data-card'))">طباعة</button>
                ${canModify ? `<button class="btn-action btn-danger" onclick="deleteVehicle('${id}')">حذف</button>` : ''}
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

// ================== السائقين (CRUD) ==================
async function loadDrivers() {
    const container = document.getElementById('driversList');
    container.innerHTML = '<p style="text-align:center">جاري التحميل...</p>';
    try {
        const snapshot = await get(ref(window.firebaseDB, "system_drivers"));
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center">لا يوجد سائقين</p>';
            return;
        }
        snapshot.forEach(childSnap => {
            renderDriverCard(childSnap.key, childSnap.val());
        });
    } catch (e) {
        console.error(e);
    }
}

function renderDriverCard(id, d) {
    const container = document.getElementById('driversList');
    const html = `
    <div class="data-card">
        <div class="card-header" onclick="toggleAccordion(this)">
            <strong>${d.driverName}</strong>
            <span style="color:var(--text-muted)">${d.mobile}</span>
        </div>
        <div class="card-body">
            <div class="grid-details">
                <p><strong>ID</strong>${d.driverId}</p>
                <p><strong>License</strong>${d.licenseNumber}</p>
            </div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
}

// ================== المستخدمين (Admin Only) ==================
async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    const snapshot = await get(ref(window.firebaseDB, "system_users"));
    if(snapshot.exists()){
        snapshot.forEach(u => {
            const d = u.val();
            const html = `<div class="data-card" style="padding:15px;"><strong>${d.email}</strong> - Role: ${d.role}</div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    }
}

async function loadStats() {
    const vSnap = await get(ref(window.firebaseDB, "vehicles"));
    const dSnap = await get(ref(window.firebaseDB, "system_drivers"));
    document.getElementById('statV').innerText = vSnap.exists() ? vSnap.numChildren() : 0;
    document.getElementById('statD').innerText = dSnap.exists() ? dSnap.numChildren() : 0;
}

// ================== أدوات مساعدة ==================
function checkExpiry(dateStr) {
    if(!dateStr) return '';
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'status-danger';
    if (diff <= 15) return 'status-warning';
    return 'status-success';
}

function toggleAccordion(header) {
    const body = header.nextElementSibling;
    body.classList.toggle('active');
}

function printSection(element) {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print</title></head><body>');
    printWindow.document.write(element.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// ================== النوافذ المنبثقة (Modals) ==================
function showModal(htmlContent) {
    const modal = document.getElementById('dynamicModal');
    const content = document.getElementById('modalBody');
    content.innerHTML = htmlContent;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('dynamicModal').style.display = 'none';
}

function openAddVehicleModal() {
    const html = `
        <h3 style="margin-bottom:15px; color:var(--primary)">إضافة مركبة جديدة</h3>
        <form onsubmit="saveNewVehicle(event)">
            <div class="form-group"><label>رقم اللوحة</label><input type="number" id="vPlate" class="form-control" required></div>
            <div class="form-group"><label>فئة اللوحة</label><input type="text" id="vCat" class="form-control" required placeholder="مثال: B"></div>
            <div class="form-group"><label>النوع</label><input type="text" id="vType" class="form-control" required></div>
            <div class="form-group"><label>الموديل</label><input type="number" id="vYear" class="form-control" required></div>
            <div class="form-group"><label>VIN</label><input type="text" id="vVin" class="form-control" required></div>
            <div class="form-group"><label>انتهاء الترخيص</label><input type="date" id="vReg" class="form-control" required></div>
            <div class="form-group"><label>انتهاء التأمين</label><input type="date" id="vIns" class="form-control" required></div>
            <button type="submit" class="btn-action btn-primary" style="width:100%">حفظ المركبة</button>
        </form>
    `;
    showModal(html);
}

async function saveNewVehicle(e) {
    e.preventDefault();
    const plate = document.getElementById('vPlate').value;
    const id = `VH_${Date.now()}`;
    
    const data = {
        vehicleId: id,
        plateNumber: plate,
        plateCategory: document.getElementById('vCat').value,
        type: document.getElementById('vType').value,
        year: document.getElementById('vYear').value,
        vin: document.getElementById('vVin').value,
        regExpiry: document.getElementById('vReg').value,
        insExpiry: document.getElementById('vIns').value,
        owner: "System"
    };

    try {
        await set(ref(window.firebaseDB, `vehicles/${id}`), data);
        // تفعيل السجل
        if(window.systemLoggerEngine) {
            window.systemLoggerEngine.writeTripleSystemLog({ vehicleId: id, plateNumber: plate, actionType: "VEHICLE_ADDED" });
        }
        closeModal();
        loadVehicles();
        alert("تمت الإضافة بنجاح");
    } catch(err) {
        alert("Error: " + err.message);
    }
}

function openAddDriverModal() {
    const html = `
        <h3 style="margin-bottom:15px; color:var(--primary)">إضافة سائق جديد</h3>
        <form onsubmit="saveNewDriver(event)">
            <div class="form-group"><label>اسم السائق</label><input type="text" id="dName" class="form-control" required></div>
            <div class="form-group"><label>رقم الهاتف</label><input type="text" id="dMobile" class="form-control" required></div>
            <div class="form-group"><label>رقم الرخصة</label><input type="text" id="dLic" class="form-control" required></div>
            <button type="submit" class="btn-action btn-primary" style="width:100%">حفظ السائق</button>
        </form>
    `;
    showModal(html);
}

async function saveNewDriver(e) {
    e.preventDefault();
    const name = document.getElementById('dName').value;
    const id = `DRV_${Date.now()}`;
    const data = {
        driverId: id,
        driverName: name,
        mobile: document.getElementById('dMobile').value,
        licenseNumber: document.getElementById('dLic').value
    };
    try {
        await set(ref(window.firebaseDB, `system_drivers/${id}`), data);
        closeModal();
        loadDrivers();
        alert("تمت الإضافة بنجاح");
    } catch(err) {
        alert("Error: " + err.message);
    }
}

async function deleteVehicle(id) {
    if(!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
        await remove(ref(window.firebaseDB, `vehicles/${id}`));
        loadVehicles();
    } catch(e) { alert("Error deleting"); }
}
