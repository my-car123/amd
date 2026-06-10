/* ==========================================================================
   نظام إدارة الأسطول والسائقين - المحرك التشغيلي الرئيسي (النسخة النهائية المستقرة)
   حقوق المطور: mohamed saad
   ========================================================================== */

const { ref: rRef, set: rSet, get: rGet, child: rChild, push: rPush, query: rQuery, orderByChild: rOrderByChild, equalTo: rEqualTo, limitToFirst: rLimitToFirst } = window.dbTools;

// دالة آمنة للحصول على التوقيت (بدون الاعتماد على logger)
function getSafeTimestamp() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const uaeTime = new Date(utc + (3600000 * 4));
    const year = uaeTime.getFullYear();
    const month = String(uaeTime.getMonth() + 1).padStart(2, '0');
    const day = String(uaeTime.getDate()).padStart(2, '0');
    const hours = String(uaeTime.getHours()).padStart(2, '0');
    const minutes = String(uaeTime.getMinutes()).padStart(2, '0');
    const seconds = String(uaeTime.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function calculateCustodyAlertStatus(expiryDateStr) {
    if (!expiryDateStr) return { colorClass: '', daysLeft: 999 };
    const now = new Date();
    const expiryDate = new Date(expiryDateStr);
    const timeDiff = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    let colorClass = 'border-success';
    if (daysLeft <= 15 && daysLeft >= 0) colorClass = 'border-warning';
    else if (daysLeft < 0) colorClass = 'border-danger';
    return { colorClass, daysLeft };
}

async function refreshDashboardStats() {
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
        let total = 0, valid = 0, warning = 0, expired = 0;
        if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
                total++;
                const data = childSnap.val();
                const statusReg = calculateCustodyAlertStatus(data.regExpiry);
                const statusIns = calculateCustodyAlertStatus(data.insExpiry);
                if (statusReg.colorClass === 'border-danger' || statusIns.colorClass === 'border-danger') expired++;
                else if (statusReg.colorClass === 'border-warning' || statusIns.colorClass === 'border-warning') warning++;
                else valid++;
            });
        }
        const totalEl = document.getElementById('statValTotalVehicles');
        const validEl = document.getElementById('statValValid');
        const warningEl = document.getElementById('statValExpiring');
        const expiredEl = document.getElementById('statValExpired');
        if (totalEl) totalEl.textContent = total;
        if (validEl) validEl.textContent = valid;
        if (warningEl) warningEl.textContent = warning;
        if (expiredEl) expiredEl.textContent = expired;
    } catch (e) { console.error(e); }
}

function buildAbuDhabiPlateHTML(category, number) {
    return `<div class="v-plate-fixed-container"><div class="v-plate-category-box">${category}</div><div class="v-plate-number-box">${number}</div></div>`;
}

async function loadCriticalVehicles() {
    const container = document.getElementById('criticalVehiclesList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">لا توجد مركبات</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(childSnap => {
            const data = childSnap.val();
            const statusReg = calculateCustodyAlertStatus(data.regExpiry);
            const statusIns = calculateCustodyAlertStatus(data.insExpiry);
            if (statusReg.colorClass !== 'border-success' || statusIns.colorClass !== 'border-success') {
                renderVehicleCard(container, data, statusReg, statusIns);
            }
        });
        if (container.innerHTML === '') container.innerHTML = '<p style="text-align:center; padding:20px;">جميع المركبات بحالة جيدة</p>';
    } catch (e) { console.error(e); container.innerHTML = '<p style="text-align:center; padding:20px; color:red;">خطأ في التحميل</p>'; }
}

async function loadGeneralVehicles() {
    const container = document.getElementById('generalVehiclesList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">لا توجد مركبات مسجلة</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(childSnap => {
            const data = childSnap.val();
            const statusReg = calculateCustodyAlertStatus(data.regExpiry);
            const statusIns = calculateCustodyAlertStatus(data.insExpiry);
            renderVehicleCard(container, data, statusReg, statusIns);
        });
    } catch (e) { console.error(e); }
}

function renderVehicleCard(container, v, statusReg, statusIns) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    let finalClass = (statusReg.colorClass === 'border-danger' || statusIns.colorClass === 'border-danger') ? 'border-danger' : 
                     (statusReg.colorClass === 'border-warning' || statusIns.colorClass === 'border-warning') ? 'border-warning' : 'border-success';
    const cardId = `v_${Date.now()}_${Math.random()}`;
    const driverText = (v.currentDriverName && v.currentDriverName !== 'NONE') ? `${lang === 'ar' ? 'بعهدة:' : 'Custody:'} ${v.currentDriverName}` : (lang === 'ar' ? 'بدون سائق' : 'No Driver');
    const html = `
        <div class="system-card ${finalClass}">
            <div class="card-header-clickable" onclick="window.toggleCardDetails('${cardId}')">
                <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                    <span style="font-weight:bold;">${v.vehicleId || 'N/A'}</span>
                    ${buildAbuDhabiPlateHTML(v.plateCategory || '?', v.plateNumber || '?')}
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:0.8rem;">● ${driverText}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            <div id="${cardId}" style="display:none; padding:20px; border-top:1px solid #eee;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; font-size:0.85rem;">
                    <p><strong>${lang === 'ar' ? 'المالك:' : 'Owner:'}</strong> ${v.owner || '-'}</p>
                    <p><strong>VIN:</strong> ${v.vin || '-'}</p>
                    <p><strong>${lang === 'ar' ? 'النوع:' : 'Type:'}</strong> ${v.type || '-'}</p>
                    <p><strong>${lang === 'ar' ? 'السنة:' : 'Year:'}</strong> ${v.year || '-'}</p>
                    <p class="${statusReg.colorClass}"><strong>${lang === 'ar' ? 'انتهاء الترخيص:' : 'Reg Expiry:'}</strong> ${v.regExpiry || '-'} (${statusReg.daysLeft} ${lang === 'ar' ? 'يوم' : 'days'})</p>
                    <p class="${statusIns.colorClass}"><strong>${lang === 'ar' ? 'انتهاء التأمين:' : 'Ins Expiry:'}</strong> ${v.insExpiry || '-'} (${statusIns.daysLeft} ${lang === 'ar' ? 'يوم' : 'days'})</p>
                </div>
                ${window.currentUserRole === 'admin' ? `<button onclick="window.deleteVehicle('${v.vehicleId}')" style="margin-top:15px; background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">🗑 ${lang === 'ar' ? 'حذف السيارة' : 'Delete Vehicle'}</button>` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

async function loadGeneralDrivers() {
    const container = document.getElementById('generalDriversList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px;">جاري التحميل...</div>';
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "system_drivers"));
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">لا يوجد سائقين مسجلين</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(childSnap => {
            const d = childSnap.val();
            renderDriverCard(container, d);
        });
    } catch (e) { console.error(e); }
}

function renderDriverCard(container, d) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const cardId = `d_${Date.now()}_${Math.random()}`;
    const html = `
        <div class="system-card">
            <div class="card-header-clickable" onclick="window.toggleCardDetails('${cardId}')">
                <span style="font-weight:bold;">${d.driverName || 'N/A'}</span>
                <span style="font-size:0.8rem; color:#666;">${d.mobile || ''}</span>
            </div>
            <div id="${cardId}" style="display:none; padding:20px; border-top:1px solid #eee;">
                <p><strong>${lang === 'ar' ? 'رقم المعرف:' : 'Driver ID:'}</strong> ${d.driverId || '-'}</p>
                <p><strong>${lang === 'ar' ? 'رقم الرخصة:' : 'License:'}</strong> ${d.licenseNumber || '-'}</p>
                <p><strong>${lang === 'ar' ? 'تاريخ التسجيل:' : 'Created:'}</strong> ${d.createdTimestamp || '-'}</p>
                ${window.currentUserRole === 'admin' ? `<button onclick="window.deleteDriver('${d.driverId}')" style="margin-top:15px; background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">🗑 ${lang === 'ar' ? 'حذف السائق' : 'Delete Driver'}</button>` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function createModal(modalId, title, formHtml) {
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const html = `
        <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:8px; width:90%; max-width:550px; max-height:90vh; overflow:auto; padding:25px; position:relative;">
                <button onclick="document.getElementById('${modalId}').remove()" style="position:absolute; top:10px; right:15px; font-size:24px; background:none; border:none; cursor:pointer;">&times;</button>
                <h2 style="color:#0a192f; margin-bottom:20px;">${title}</h2>
                <div id="${modalId}_error" style="display:none; background:#fef2f2; border:1px solid #ef4444; padding:10px; border-radius:4px; margin-bottom:15px; color:#ef4444;"></div>
                ${formHtml}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

window.openAddVehicleModal = async function() {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    let nextSeq = 1;
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
        if (snapshot.exists()) nextSeq = snapshot.size + 1;
    } catch(e) {}
    const generatedId = `UAE ${String(nextSeq).padStart(4, '0')}`;
    const formHtml = `
        <form onsubmit="window.saveNewVehicle(event, '${generatedId}', ${nextSeq})">
            <div class="form-group"><label>${lang === 'ar' ? 'معرف النظام' : 'System ID'}</label><input type="text" value="${generatedId}" disabled style="width:100%; padding:10px; background:#f4f6f9; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'رقم اللوحة *' : 'Plate Number *'}</label><input type="text" id="plateNum" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'فئة اللوحة *' : 'Plate Category *'}</label><input type="text" id="plateCat" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'المالك *' : 'Owner *'}</label><input type="text" id="owner" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>VIN *</label><input type="text" id="vin" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'النوع والموديل *' : 'Type/Model *'}</label><input type="text" id="type" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'سنة الصنع *' : 'Year *'}</label><input type="number" id="year" value="2026" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'انتهاء الترخيص *' : 'Reg Expiry *'}</label><input type="date" id="regExp" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'انتهاء التأمين *' : 'Insurance Expiry *'}</label><input type="date" id="insExp" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <button type="submit" style="width:100%; background:#0a192f; color:white; padding:12px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">${lang === 'ar' ? 'حفظ السيارة' : 'Save Vehicle'}</button>
        </form>
    `;
    createModal('addVehicleModal', lang === 'ar' ? 'إضافة سيارة جديدة' : 'Add New Vehicle', formHtml);
};

window.saveNewVehicle = async function(event, uid, seq) {
    event.preventDefault();
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const num = document.getElementById('plateNum').value.trim();
    const cat = document.getElementById('plateCat').value.trim();
    const owner = document.getElementById('owner').value.trim();
    const vin = document.getElementById('vin').value.trim();
    const type = document.getElementById('type').value.trim();
    const year = document.getElementById('year').value.trim();
    const reg = document.getElementById('regExp').value;
    const ins = document.getElementById('insExp').value;
    const errorDiv = document.getElementById('addVehicleModal_error');
    if (!num || !cat || !owner || !vin || !type || !year || !reg || !ins) {
        if (errorDiv) { errorDiv.textContent = lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required'; errorDiv.style.display = 'block'; }
        return;
    }
    try {
        const vehicleData = {
            vehicleId: uid,
            idSequence: seq,
            plateNumber: num,
            plateCategory: cat,
            owner: owner,
            vin: vin,
            type: type,
            year: parseInt(year),
            regExpiry: reg,
            insExpiry: ins,
            currentDriverId: "NONE",
            currentDriverName: "NONE"
        };
        await rSet(rChild(rRef(window.firebaseDB), `vehicles/${uid}`), vehicleData);
        document.getElementById('addVehicleModal').remove();
        await refreshDashboardStats();
        await loadGeneralVehicles();
        await loadCriticalVehicles();
        alert(lang === 'ar' ? 'تم إضافة السيارة بنجاح' : 'Vehicle added successfully');
    } catch(e) {
        console.error(e);
        if (errorDiv) { errorDiv.textContent = e.message; errorDiv.style.display = 'block'; }
    }
};

window.openAddDriverModal = function() {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const formHtml = `
        <form onsubmit="window.saveNewDriver(event)">
            <div class="form-group"><label>${lang === 'ar' ? 'اسم السائق *' : 'Driver Name *'}</label><input type="text" id="driverName" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'رقم الجوال *' : 'Mobile *'}</label><input type="tel" id="driverPhone" required placeholder="0501234567" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <div class="form-group"><label>${lang === 'ar' ? 'رقم الرخصة *' : 'License Number *'}</label><input type="text" id="driverLicense" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;"></div>
            <button type="submit" style="width:100%; background:#0a192f; color:white; padding:12px; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">${lang === 'ar' ? 'حفظ السائق' : 'Save Driver'}</button>
        </form>
    `;
    createModal('addDriverModal', lang === 'ar' ? 'إضافة سائق جديد' : 'Add New Driver', formHtml);
};

window.saveNewDriver = async function(event) {
    event.preventDefault();
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const name = document.getElementById('driverName').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();
    const license = document.getElementById('driverLicense').value.trim();
    const errorDiv = document.getElementById('addDriverModal_error');
    if (!name || !phone || !license) {
        if (errorDiv) { errorDiv.textContent = lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required'; errorDiv.style.display = 'block'; }
        return;
    }
    if (!/^0[0-9]{9}$/.test(phone)) {
        if (errorDiv) { errorDiv.textContent = lang === 'ar' ? 'رقم الجوال يجب أن يكون 10 أرقام ويبدأ ب0' : 'Phone must be 10 digits starting with 0'; errorDiv.style.display = 'block'; }
        return;
    }
    try {
        const driverId = `DRV_${Date.now()}`;
        const timestamp = getSafeTimestamp();
        const driverData = {
            driverId: driverId,
            driverName: name,
            mobile: phone,
            licenseNumber: license,
            createdTimestamp: timestamp
        };
        await rSet(rChild(rRef(window.firebaseDB), `system_drivers/${driverId}`), driverData);
        document.getElementById('addDriverModal').remove();
        await loadGeneralDrivers();
        alert(lang === 'ar' ? 'تم إضافة السائق بنجاح' : 'Driver added successfully');
    } catch(e) {
        console.error(e);
        if (errorDiv) { errorDiv.textContent = e.message; errorDiv.style.display = 'block'; }
    }
};

window.deleteVehicle = async function(vehicleId) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    if (confirm(lang === 'ar' ? `هل أنت متأكد من حذف السيارة ${vehicleId}؟` : `Are you sure you want to delete vehicle ${vehicleId}?`)) {
        try {
            await rSet(rChild(rRef(window.firebaseDB), `vehicles/${vehicleId}`), null);
            await refreshDashboardStats();
            await loadGeneralVehicles();
            await loadCriticalVehicles();
            alert(lang === 'ar' ? 'تم حذف السيارة' : 'Vehicle deleted');
        } catch(e) { alert('Error: ' + e.message); }
    }
};

window.deleteDriver = async function(driverId) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    if (confirm(lang === 'ar' ? `هل أنت متأكد من حذف السائق؟` : `Are you sure you want to delete this driver?`)) {
        try {
            await rSet(rChild(rRef(window.firebaseDB), `system_drivers/${driverId}`), null);
            await loadGeneralDrivers();
            alert(lang === 'ar' ? 'تم حذف السائق' : 'Driver deleted');
        } catch(e) { alert('Error: ' + e.message); }
    }
};

window.toggleCardDetails = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
};

function onDashboardTabChanged(tabId) {
    if (tabId === 'overview') { refreshDashboardStats(); loadCriticalVehicles(); }
    else if (tabId === 'vehicles') { loadGeneralVehicles(); }
    else if (tabId === 'drivers') { loadGeneralDrivers(); }
}

window.onDashboardTabChanged = onDashboardTabChanged;

// تهيئة الصفحة
window.addEventListener('DOMContentLoaded', async () => {
    // محاولة معرفة دور المستخدم الحالي من Firebase
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
        const user = window.firebaseAuth.currentUser;
        if (user.email === 'saad323m@gmail.com') {
            window.currentUserRole = 'admin';
        } else {
            try {
                const snapshot = await rGet(rChild(rRef(window.firebaseDB), `system_users/${user.uid}`));
                if (snapshot.exists()) window.currentUserRole = snapshot.val().role || 'user';
                else window.currentUserRole = 'user';
            } catch(e) { window.currentUserRole = 'user'; }
        }
    } else {
        window.currentUserRole = 'user';
    }
    
    refreshDashboardStats();
    const activeTab = localStorage.getItem('active_dash_tab') || 'overview';
    onDashboardTabChanged(activeTab);
});
