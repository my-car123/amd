/* ==========================================================================
   نظام إدارة الأسطول والسائقين - العمليات الأساسية (الإصدار النهائي)
   ========================================================================== */

// ==================== مساعدات ====================
function getLang() {
    return localStorage.getItem('lang') || 'ar';
}

function showNotification(msg, isError = false) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        alert(msg);
        return;
    }
    const div = document.createElement('div');
    div.className = `notification ${isError ? 'error' : 'success'}`;
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function getDaysLeft(expiryDate) {
    if (!expiryDate) return { days: 999, class: '' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry - today) / (1000 * 3600 * 24));
    let cssClass = 'status-valid';
    if (diff <= 0) cssClass = 'status-expired';
    else if (diff <= 15) cssClass = 'status-warning';
    return { days: diff, class: cssClass };
}

function buildPlate(category, number) {
    return `<div class="plate-box"><span class="plate-cat">${category}</span><span class="plate-num">${number}</span></div>`;
}

// ==================== الإحصائيات ====================
async function loadStats() {
    try {
        const snapshot = await window.FirebaseGet(
            window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), "vehicles")
        );
        let total = 0, valid = 0, warning = 0, expired = 0;
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                total++;
                const v = child.val();
                const reg = getDaysLeft(v.regExpiry);
                const ins = getDaysLeft(v.insExpiry);
                if (reg.class === 'status-expired' || ins.class === 'status-expired') expired++;
                else if (reg.class === 'status-warning' || ins.class === 'status-warning') warning++;
                else valid++;
            });
        }
        const elements = { statTotal: total, statValid: valid, statWarning: warning, statExpired: expired };
        for (const [id, val] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }
    } catch (err) { console.error(err); }
}

// ==================== المركبات ====================
async function loadCriticalVehicles() {
    const container = document.getElementById('criticalList');
    if (!container) return;
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    try {
        const snapshot = await window.FirebaseGet(
            window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), "vehicles")
        );
        if (!snapshot.exists()) {
            container.innerHTML = '<div class="empty">لا توجد مركبات</div>';
            return;
        }
        container.innerHTML = '';
        let hasCritical = false;
        snapshot.forEach(child => {
            const v = child.val();
            const reg = getDaysLeft(v.regExpiry);
            const ins = getDaysLeft(v.insExpiry);
            if (reg.class !== 'status-valid' || ins.class !== 'status-valid') {
                hasCritical = true;
                renderVehicleCard(container, v, reg, ins);
            }
        });
        if (!hasCritical) container.innerHTML = '<div class="empty">جميع المركبات بحالة جيدة</div>';
    } catch (err) { console.error(err); container.innerHTML = '<div class="error">خطأ في التحميل</div>'; }
}

async function loadAllVehicles() {
    const container = document.getElementById('vehiclesList');
    if (!container) return;
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    try {
        const snapshot = await window.FirebaseGet(
            window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), "vehicles")
        );
        if (!snapshot.exists()) {
            container.innerHTML = '<div class="empty">لا توجد مركبات مسجلة</div>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(child => {
            const v = child.val();
            const reg = getDaysLeft(v.regExpiry);
            const ins = getDaysLeft(v.insExpiry);
            renderVehicleCard(container, v, reg, ins);
        });
    } catch (err) { console.error(err); container.innerHTML = '<div class="error">خطأ في التحميل</div>'; }
}

function renderVehicleCard(container, v, reg, ins) {
    const lang = getLang();
    const role = localStorage.getItem('userRole') || 'user';
    const cardId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    let borderClass = 'border-valid';
    if (reg.class === 'status-expired' || ins.class === 'status-expired') borderClass = 'border-expired';
    else if (reg.class === 'status-warning' || ins.class === 'status-warning') borderClass = 'border-warning';
    
    const driverText = (v.currentDriverName && v.currentDriverName !== 'NONE') 
        ? `${lang === 'ar' ? 'بعهدة' : 'With'}: ${v.currentDriverName}`
        : (lang === 'ar' ? 'بدون سائق' : 'No driver');
    
    const html = `
        <div class="vehicle-card ${borderClass}" data-id="${v.vehicleId}">
            <div class="card-header" onclick="window.Core.toggleCard('${cardId}')">
                <div class="card-title">
                    <strong>${v.vehicleId || 'N/A'}</strong>
                    ${buildPlate(v.plateCategory || '?', v.plateNumber || '?')}
                </div>
                <div class="card-status">
                    <span>${driverText}</span>
                    <span class="arrow">▼</span>
                </div>
            </div>
            <div id="${cardId}" class="card-details" style="display:none;">
                <div class="details-grid">
                    <div><label>${lang === 'ar' ? 'المالك' : 'Owner'}:</label> ${v.owner || '-'}</div>
                    <div><label>VIN:</label> ${v.vin || '-'}</div>
                    <div><label>${lang === 'ar' ? 'النوع' : 'Type'}:</label> ${v.type || '-'}</div>
                    <div><label>${lang === 'ar' ? 'السنة' : 'Year'}:</label> ${v.year || '-'}</div>
                    <div class="${reg.class}"><label>${lang === 'ar' ? 'انتهاء الترخيص' : 'Reg Expiry'}:</label> ${v.regExpiry || '-'} (${reg.days} ${lang === 'ar' ? 'يوم' : 'days'})</div>
                    <div class="${ins.class}"><label>${lang === 'ar' ? 'انتهاء التأمين' : 'Insurance Expiry'}:</label> ${v.insExpiry || '-'} (${ins.days} ${lang === 'ar' ? 'يوم' : 'days'})</div>
                </div>
                ${role === 'admin' ? `
                <div class="card-actions">
                    <button class="btn-delete" onclick="window.Core.deleteVehicle('${v.vehicleId}')">${lang === 'ar' ? '🗑 حذف' : '🗑 Delete'}</button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

async function deleteVehicle(vehicleId) {
    const lang = getLang();
    if (!confirm(lang === 'ar' ? `حذف السيارة ${vehicleId}؟` : `Delete vehicle ${vehicleId}?`)) return;
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `vehicles/${vehicleId}`), null);
        await loadStats();
        await loadAllVehicles();
        await loadCriticalVehicles();
        showNotification(lang === 'ar' ? '✓ تم حذف السيارة' : '✓ Vehicle deleted');
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في الحذف' : 'Delete error'); }
}

// ==================== السائقين ====================
async function loadAllDrivers() {
    const container = document.getElementById('driversList');
    if (!container) return;
    container.innerHTML = '<div class="loading">جاري التحميل...</div>';
    try {
        const snapshot = await window.FirebaseGet(
            window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), "drivers")
        );
        if (!snapshot.exists()) {
            container.innerHTML = '<div class="empty">لا يوجد سائقين مسجلين</div>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(child => renderDriverCard(container, child.val()));
    } catch (err) { console.error(err); container.innerHTML = '<div class="error">خطأ في التحميل</div>'; }
}

function renderDriverCard(container, d) {
    const lang = getLang();
    const role = localStorage.getItem('userRole') || 'user';
    const cardId = `d_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const html = `
        <div class="driver-card" data-id="${d.driverId}">
            <div class="card-header" onclick="window.Core.toggleCard('${cardId}')">
                <div class="card-title"><strong>${d.driverName || 'N/A'}</strong></div>
                <div class="card-status"><span>${d.mobile || ''}</span><span class="arrow">▼</span></div>
            </div>
            <div id="${cardId}" class="card-details" style="display:none;">
                <div class="details-grid">
                    <div><label>${lang === 'ar' ? 'رقم المعرف' : 'Driver ID'}:</label> ${d.driverId || '-'}</div>
                    <div><label>${lang === 'ar' ? 'رقم الرخصة' : 'License'}:</label> ${d.licenseNumber || '-'}</div>
                    <div><label>${lang === 'ar' ? 'تاريخ التسجيل' : 'Created'}:</label> ${d.createdAt || '-'}</div>
                </div>
                ${role === 'admin' ? `
                <div class="card-actions">
                    <button class="btn-delete" onclick="window.Core.deleteDriver('${d.driverId}')">${lang === 'ar' ? '🗑 حذف' : '🗑 Delete'}</button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

async function deleteDriver(driverId) {
    const lang = getLang();
    if (!confirm(lang === 'ar' ? 'حذف السائق؟' : 'Delete driver?')) return;
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `drivers/${driverId}`), null);
        await loadAllDrivers();
        showNotification(lang === 'ar' ? '✓ تم حذف السائق' : '✓ Driver deleted');
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في الحذف' : 'Delete error'); }
}

// ==================== إضافة مركبة وسائق ====================
async function showAddVehicleModal() {
    const lang = getLang();
    let nextNum = 1;
    try {
        const snapshot = await window.FirebaseGet(window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), "vehicles"));
        if (snapshot.exists()) nextNum = snapshot.size + 1;
    } catch (err) {}
    const vehicleId = `UAE${String(nextNum).padStart(4, '0')}`;
    const modal = document.createElement('div');
    modal.id = 'vehicleModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2>${lang === 'ar' ? 'إضافة مركبة جديدة' : 'Add New Vehicle'}</h2>
            <form id="addVehicleForm">
                <div class="form-group"><label>${lang === 'ar' ? 'معرف النظام' : 'System ID'}</label><input type="text" value="${vehicleId}" disabled></div>
                <div class="form-group"><label>${lang === 'ar' ? 'رقم اللوحة *' : 'Plate Number *'}</label><input type="text" id="plateNum" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'فئة اللوحة *' : 'Plate Category *'}</label><input type="text" id="plateCat" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'المالك *' : 'Owner *'}</label><input type="text" id="owner" required></div>
                <div class="form-group"><label>VIN *</label><input type="text" id="vin" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'النوع والموديل *' : 'Type/Model *'}</label><input type="text" id="type" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'سنة الصنع *' : 'Year *'}</label><input type="number" id="year" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'انتهاء الترخيص *' : 'Registration Expiry *'}</label><input type="date" id="regExpiry" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'انتهاء التأمين *' : 'Insurance Expiry *'}</label><input type="date" id="insExpiry" required></div>
                <button type="submit" class="btn-submit">${lang === 'ar' ? 'حفظ' : 'Save'}</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('addVehicleForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveNewVehicle(vehicleId, nextNum);
    };
}

async function saveNewVehicle(vehicleId, seqNum) {
    const lang = getLang();
    const data = {
        vehicleId, idSequence: seqNum,
        plateNumber: document.getElementById('plateNum').value.trim(),
        plateCategory: document.getElementById('plateCat').value.trim(),
        owner: document.getElementById('owner').value.trim(),
        vin: document.getElementById('vin').value.trim(),
        type: document.getElementById('type').value.trim(),
        year: parseInt(document.getElementById('year').value),
        regExpiry: document.getElementById('regExpiry').value,
        insExpiry: document.getElementById('insExpiry').value,
        currentDriverId: "NONE", currentDriverName: "NONE",
        createdAt: new Date().toISOString()
    };
    for (const [k, v] of Object.entries(data)) {
        if (k !== 'idSequence' && k !== 'year' && k !== 'currentDriverId' && k !== 'currentDriverName' && k !== 'createdAt' && !v) {
            alert(lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required');
            return;
        }
    }
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `vehicles/${vehicleId}`), data);
        document.getElementById('vehicleModal')?.remove();
        await loadStats(); await loadAllVehicles(); await loadCriticalVehicles();
        showNotification(lang === 'ar' ? '✓ تم إضافة السيارة' : '✓ Vehicle added');
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في الحفظ' : 'Save error'); }
}

async function showAddDriverModal() {
    const lang = getLang();
    const modal = document.createElement('div');
    modal.id = 'driverModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2>${lang === 'ar' ? 'إضافة سائق جديد' : 'Add New Driver'}</h2>
            <form id="addDriverForm">
                <div class="form-group"><label>${lang === 'ar' ? 'اسم السائق *' : 'Driver Name *'}</label><input type="text" id="driverName" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'رقم الجوال *' : 'Mobile *'}</label><input type="tel" id="driverMobile" required placeholder="0501234567"></div>
                <div class="form-group"><label>${lang === 'ar' ? 'رقم الرخصة *' : 'License Number *'}</label><input type="text" id="driverLicense" required></div>
                <button type="submit" class="btn-submit">${lang === 'ar' ? 'حفظ' : 'Save'}</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('addDriverForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveNewDriver();
    };
}

async function saveNewDriver() {
    const lang = getLang();
    const name = document.getElementById('driverName').value.trim();
    const mobile = document.getElementById('driverMobile').value.trim();
    const license = document.getElementById('driverLicense').value.trim();
    if (!name || !mobile || !license) { alert(lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required'); return; }
    if (!/^0[0-9]{9}$/.test(mobile)) { alert(lang === 'ar' ? 'رقم الجوال 10 أرقام ويبدأ بـ0' : 'Mobile must be 10 digits starting with 0'); return; }
    const driverId = `DRV_${Date.now()}`;
    const timestamp = window.Logger?.getUAETime()?.displayEn || new Date().toLocaleString();
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `drivers/${driverId}`), {
            driverId, driverName: name, mobile, licenseNumber: license, createdAt: timestamp
        });
        document.getElementById('driverModal')?.remove();
        await loadAllDrivers();
        showNotification(lang === 'ar' ? '✓ تم إضافة السائق' : '✓ Driver added');
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في الحفظ' : 'Save error'); }
}

// ==================== دوال عامة ====================
function toggleCard(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === 'none' ? 'grid' : 'none';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const panelMap = { overview: 'panelOverview', vehicles: 'panelVehicles', drivers: 'panelDrivers', users: 'panelUsers' };
    const panel = document.getElementById(panelMap[tabId]);
    if (panel) panel.classList.add('active');
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
    localStorage.setItem('activeTab', tabId);
    if (tabId === 'overview') { loadStats(); loadCriticalVehicles(); }
    else if (tabId === 'vehicles') loadAllVehicles();
    else if (tabId === 'drivers') loadAllDrivers();
    else if (tabId === 'users' && window.Admin?.loadAllUsers) window.Admin.loadAllUsers();
}

function updateClock() {
    const clock = document.getElementById('liveClock');
    if (!clock) return;
    const lang = getLang();
    const time = window.Logger?.getUAETime();
    if (time) clock.textContent = lang === 'ar' ? time.displayAr : time.displayEn;
    else clock.textContent = new Date().toLocaleString();
}

function updateUIBasedOnRole(role) {
    const lang = getLang();
    const isAdmin = role === 'admin';
    const canWrite = role === 'admin' || role === 'supervisor';
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    const addDriverBtn = document.getElementById('addDriverBtn');
    const addUserBtn = document.getElementById('addUserBtn');
    const usersTab = document.getElementById('tabUsers');
    if (addVehicleBtn) addVehicleBtn.style.display = canWrite ? 'flex' : 'none';
    if (addDriverBtn) addDriverBtn.style.display = canWrite ? 'flex' : 'none';
    if (addUserBtn) addUserBtn.style.display = isAdmin ? 'flex' : 'none';
    if (usersTab) usersTab.style.display = isAdmin ? 'inline-flex' : 'none';
    const badge = document.getElementById('roleBadge');
    if (badge) {
        const texts = { admin: lang === 'ar' ? '👑 مدير' : '👑 Admin', supervisor: lang === 'ar' ? '⭐ مشرف' : '⭐ Supervisor', user: lang === 'ar' ? '👤 مستخدم' : '👤 User' };
        badge.textContent = texts[role] || texts.user;
    }
}

// تصدير الوظائف
window.Core = {
    loadStats, loadCriticalVehicles, loadAllVehicles, loadAllDrivers,
    showAddVehicleModal, showAddDriverModal,
    deleteVehicle, deleteDriver,
    toggleCard, switchTab, updateClock, updateUIBasedOnRole, getLang, showNotification
};

// ربط دوال رئيسية كاختصارات
window.showAddVehicleModal = showAddVehicleModal;
window.showAddDriverModal = showAddDriverModal;
window.toggleCard = toggleCard;
window.switchTab = switchTab;
window.updateUIBasedOnRole = updateUIBasedOnRole;

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    const role = localStorage.getItem('userRole') || 'user';
    updateUIBasedOnRole(role);
    const activeTab = localStorage.getItem('activeTab') || 'overview';
    switchTab(activeTab);
});
