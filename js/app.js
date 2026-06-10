/* ==========================================================================
   نظام إدارة الأسطول والسائقين - المحرك التشغيلي الرئيسي وإدارة الواجهات والعمليات
   حقوق المطور: mohamed saad
   ========================================================================== */

const { ref: rRef, set: rSet, get: rGet, child: rChild, push: rPush, query: rQuery, orderByChild: rOrderByChild, equalTo: rEqualTo, limitToFirst: rLimitToFirst } = window.dbTools;

// محرك التنبيهات اللوني الفوري لحساب الأيام المتبقية وتحديد خطورة الحالة
function calculateCustodyAlertStatus(expiryDateStr) {
    if (!expiryDateStr) return { colorClass: '', daysLeft: 999 };
    const { rawDate } = window.systemLoggerEngine.getOfficialUAETimestamp();
    const expiryDate = new Date(expiryDateStr);
    const timeDiff = expiryDate.getTime() - rawDate.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    let colorClass = 'border-success';
    if (daysLeft <= 15 && daysLeft >= 0) colorClass = 'border-warning';
    else if (daysLeft < 0) colorClass = 'border-danger';
    
    return { colorClass, daysLeft };
}

// تحديث الإحصائيات الشاملة في الواجهة العلوية
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
        
        const elements = { statValTotalVehicles: total, statValValid: valid, statValExpiring: warning, statValExpired: expired };
        for (let id in elements) {
            const el = document.getElementById(id);
            if (el) el.textContent = String(elements[id]);
        }
    } catch (e) { console.error("Stats compilation error:", e); }
}

function buildAbuDhabiPlateHTML(category, number) {
    return `<div class="v-plate-fixed-container"><div class="v-plate-category-box">${category}</div><div class="v-plate-number-box">${number}</div></div>`;
}

// تحميل وعرض سيارات الطوارئ منتهية الصلاحية أو القريبة من الانتهاء
async function loadCriticalVehicles() {
    const container = document.getElementById('criticalVehiclesList');
    if (!container) return;
    container.innerHTML = '';
    
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
        if(snapshot.exists()) {
            snapshot.forEach(childSnap => {
                const data = childSnap.val();
                const statusReg = calculateCustodyAlertStatus(data.regExpiry);
                const statusIns = calculateCustodyAlertStatus(data.insExpiry);
                
                if (statusReg.colorClass === 'border-danger' || statusReg.colorClass === 'border-warning' || 
                    statusIns.colorClass === 'border-danger' || statusIns.colorClass === 'border-warning') {
                    renderVehicleAccordionCard(container, data, statusReg, statusIns);
                }
            });
        }
    } catch (e) { console.error(e); }
}

// جلب وعرض أسطول المركبات العام (محدد بـ 10 سجلات أولية لحفظ الأداء وكفاءة السيرفر)
async function loadGeneralVehicles() {
    const container = document.getElementById('generalVehiclesList');
    if (!container) return;
    container.innerHTML = '';
    
    try {
        const vRef = rQuery(rChild(rRef(window.firebaseDB), "vehicles"), rLimitToFirst(10));
        const snapshot = await rGet(vRef);
        
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد مركبات مسجلة حالياً بالمنظومة</p>';
            return;
        }
        
        snapshot.forEach(childSnap => {
            const data = childSnap.val();
            const statusReg = calculateCustodyAlertStatus(data.regExpiry);
            const statusIns = calculateCustodyAlertStatus(data.insExpiry);
            renderVehicleAccordionCard(container, data, statusReg, statusIns);
        });
    } catch (e) { console.error(e); }
}

function renderVehicleAccordionCard(targetContainer, v, statusReg, statusIns) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    let finalColorClass = (statusReg.colorClass === 'border-danger' || statusIns.colorClass === 'border-danger') ? 'border-danger' : 
                          (statusReg.colorClass === 'border-warning' || statusIns.colorClass === 'border-warning') ? 'border-warning' : 'border-success';
    
    const randomCardId = `vCard_${v.vehicleId.replace(/\s+/g, '_')}`;
    const driverDisplay = v.currentDriverName && v.currentDriverName !== 'NONE' ? `${lang==='ar'?'بعهدة:':'Custody:'} ${v.currentDriverName}` : (lang==='ar'?'بدون مستخدم':'No Active User');
        
    const cardHTML = `
        <div class="system-card ${finalColorClass}" id="${randomCardId}_wrapper">
            <div class="card-header-clickable" onclick="toggleAccordionElement('${randomCardId}_details')">
                <div style="display:flex; align-items:center; gap:15px;">
                    <span style="font-weight:bold; color:var(--navy-primary);">${v.vehicleId}</span>
                    ${buildAbuDhabiPlateHTML(v.plateCategory, v.plateNumber)}
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span style="font-size:0.9rem; font-weight:600;">● ${driverDisplay}</span>
                    <svg class="icon-svg icon-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
            <div id="${randomCardId}_details" class="tab-panel" style="padding:20px; border-top:1px solid var(--bg-light); background-color:var(--pure-white);">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:15px; font-size:0.9rem;">
                    <p><strong>${lang==='ar'?'المالك:':'Owner:'}</strong> ${v.owner}</p>
                    <p><strong>${lang==='ar'?'رقم القاعدة VIN:':'VIN Number:'}</strong> ${v.vin}</p>
                    <p><strong>${lang==='ar'?'النوع والموديل:':'Type & Model:'}</strong> ${v.type}</p>
                    <p><strong>${lang==='ar'?'سنة الصنع:':'Year:'}</strong> ${v.year}</p>
                    <p class="${statusReg.colorClass}"><strong>${lang==='ar'?'انتهاء الترخيص:':'Reg Expiry:'}</strong> ${v.regExpiry} (${statusReg.daysLeft} ${lang==='ar'?'يوم':'days'})</p>
                    <p class="${statusIns.colorClass}"><strong>${lang==='ar'?'انتهاء التأمين:':'Ins Expiry:'}</strong> ${v.insExpiry} (${statusIns.daysLeft} ${lang==='ar'?'يوم':'days'})</p>
                </div>
            </div>
        </div>
    `;
    targetContainer.insertAdjacentHTML('beforeend', cardHTML);
}

function toggleAccordionElement(id) { const el = document.getElementById(id); if(el) el.classList.toggle('active'); }

// جلب وعرض قائمة كافة السائقين المسجلين بالمنظومة
async function loadGeneralDrivers() {
    const container = document.getElementById('generalDriversList');
    if (!container) return;
    container.innerHTML = '';
    
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "system_drivers"));
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">لا يوجد سائقين مسجلين حالياً بالملفات</p>';
            return;
        }
        snapshot.forEach(childSnap => { renderDriverAccordionCard(container, childSnap.val()); });
    } catch (e) { console.error(e); }
}

function renderDriverAccordionCard(targetContainer, d) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const randomCardId = `dCard_${d.driverId}`;
    const cardHTML = `
        <div class="system-card" id="${randomCardId}_wrapper">
            <div class="card-header-clickable" onclick="toggleAccordionElement('${randomCardId}_details')">
                <span style="font-weight:bold; color:var(--navy-primary);">${d.driverName}</span>
                <span style="font-size:0.9rem; color:var(--text-muted);">${d.mobile}</span>
            </div>
            <div id="${randomCardId}_details" class="tab-panel" style="padding:20px; border-top:1px solid var(--bg-light); background-color:var(--pure-white);">
                <p><strong>${lang==='ar'?'رقم المعرف الموحد:':'Driver ID:'}</strong> ${d.driverId}</p>
                <p><strong>${lang==='ar'?'رقم الرخصة الداخلي:':'License Number:'}</strong> ${d.licenseNumber}</p>
                <p><strong>${lang==='ar'?'تاريخ الإسناد والتفعيل:':'Created Date:'}</strong> ${d.createdTimestamp || 'N/A'}</p>
            </div>
        </div>
    `;
    targetContainer.insertAdjacentHTML('beforeend', cardHTML);
}

function createDynamicModalWrapper(modalId, titleAr, titleEn, formBodyHTML) {
    const old = document.getElementById(modalId); if(old) old.remove();
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const modalHTML = `<div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(10,25,47,0.5); z-index:2000; display:flex; justify-content:center; align-items:center; padding:20px;"><div class="auth-card" style="max-width:600px; width:100%; max-height:90vh; overflow-y:auto; position:relative;"><button onclick="document.getElementById('${modalId}').remove()" style="position:absolute; top:15px; left:15px; background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--alert-danger);">✕</button><h2 style="color:var(--navy-primary); margin-bottom:20px; text-align:center;">${lang==='ar'?titleAr:titleEn}</h2><div id="${modalId}_error" class="error-container hidden"><p id="${modalId}_error_txt"></p></div>${formBodyHTML}</div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// فتح نافذة إضافة مركبة جديدة مع توليد تسلسلي تلقائي ومقفل للمعرف UAE
async function openAddVehicleModal() {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    let nextSeq = 1;
    const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
    if(snapshot.exists()) nextSeq = snapshot.numChildren() + 1;
    const generatedUid = `UAE ${String(nextSeq).padStart(4, '0')}`;

    const formBody = `
        <form onsubmit="processNewVehicleSaving(event, '${generatedUid}', ${nextSeq})" novalidate>
            <div class="form-group"><label>${lang==='ar'?'المعرف الثابت المولد (للقراءة فقط)':'System ID'}</label><input type="text" value="${generatedUid}" disabled style="background-color:var(--bg-light);"></div>
            <div class="form-group"><label>${lang==='ar'?'رقم السيارة (اللوحة) *':'Plate Number *'}</label><input type="number" id="mv_num" required></div>
            <div class="form-group"><label>${lang==='ar'?'رمز أو فئة اللوحة *':'Plate Category *'}</label><input type="text" id="mv_cat" required></div>
            <div class="form-group"><label>${lang==='ar'?'المالك المعتمد *':'Owner *'}</label><input type="text" id="mv_owner" required></div>
            <div class="form-group"><label>${lang==='ar'?'رقم القاعدة VIN الكامل *':'VIN Number *'}</label><input type="text" id="mv_vin" required></div>
            <div class="form-group"><label>${lang==='ar'?'النوع والموديل *':'Vehicle Type/Model *'}</label><input type="text" id="mv_type" required></div>
            <div class="form-group"><label>${lang==='ar'?'سنة الصنع *':'Mfg Year *'}</label><input type="number" id="mv_year" required value="2026"></div>
            <div class="form-group"><label>${lang==='ar'?'تاريخ انتهاء الترخيص *':'Registration Expiry *'}</label><input type="date" id="mv_reg" required></div>
            <div class="form-group"><label>${lang==='ar'?'تاريخ انتهاء التأمين *':'Insurance Expiry *'}</label><input type="date" id="mv_ins" required></div>
            <button type="submit" class="btn-submit-navy">${lang==='ar'?'حفظ وتثبيت المركبة بالأسطول':'Save Vehicle Permanent'}</button>
        </form>
    `;
    createDynamicModalWrapper('addVehicleModal', 'إضافة مركبة جديدة للأسطول', 'Add New Fleet Vehicle', formBody);
}

async function processNewVehicleSaving(e, uid, seqNum) {
    e.preventDefault();
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const errBox = document.getElementById('addVehicleModal_error');
    const errTxt = document.getElementById('addVehicleModal_error_txt');
    
    const num = document.getElementById('mv_num').value.trim();
    const cat = document.getElementById('mv_cat').value.trim();
    const owner = document.getElementById('mv_owner').value.trim();
    const vin = document.getElementById('mv_vin').value.trim();
    const type = document.getElementById('mv_type').value.trim();
    const year = document.getElementById('mv_year').value.trim();
    const reg = document.getElementById('mv_reg').value;
    const ins = document.getElementById('mv_ins').value;
    
    if(!num || !cat || !owner || !vin || !type || !year || !reg || !ins) {
        if(errBox && errTxt) { errTxt.textContent = lang==='ar'?'جميع الحقول المميزة بنجمة إجبارية!':'All fields are required!'; errBox.classList.remove('hidden'); }
        return;
    }
    
    try {
        const snapshot = await rGet(rChild(rRef(window.firebaseDB), "vehicles"));
        if(snapshot.exists()) {
            let isDup = false;
            snapshot.forEach(cSnap => {
                const v = cSnap.val();
                if(v.plateNumber === num && v.plateCategory === cat) { isDup = true; errTxt.textContent = lang==='ar'?'رقم اللوحة والفئة مسجل مسبقاً!':'Plate details already exist!'; }
                if(v.vin === vin) { isDup = true; errTxt.textContent = lang==='ar'?'رقم القاعدة VIN متواجد لسيارة أخرى!':'VIN Number already exists!'; }
            });
            if(isDup) { errBox.classList.remove('hidden'); return; }
        }

        const newVehicleDoc = { vehicleId: uid, idSequence: seqNum, plateNumber: num, plateCategory: cat, owner, vin, type, year: Number(year), regExpiry: reg, insExpiry: ins, currentDriverId: "NONE", currentDriverName: "NONE" };
        await rSet(rChild(rRef(window.firebaseDB), `vehicles/${uid}`), newVehicleDoc);
        
        document.getElementById('addVehicleModal').remove();
        refreshDashboardStats(); loadGeneralVehicles(); loadCriticalVehicles();
        alert(lang === 'ar' ? 'تم إضافة السيارة بنجاح' : 'Vehicle added successfully');
    } catch(err) { console.error("Database save exception:", err); alert("Error: " + err.message); }
}

function openAddDriverModal() {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const formBody = `<form onsubmit="processNewDriverSaving(event)" novalidate><div class="form-group"><label>${lang==='ar'?'اسم السائق بالكامل *':'Full Name *'}</label><input type="text" id="md_name" required></div><div class="form-group"><label>${lang==='ar'?'رقم الهاتف (10 أرقام تبدأ بـ 0) *':'Mobile (10 digits) *'}</label><input type="text" id="md_phone" required placeholder="0501234567"></div><div class="form-group"><label>${lang==='ar'?'رقم رخصة القيادة *':'License Number *'}</label><input type="text" id="md_lic" required></div><button type="submit" class="btn-submit-navy">${lang==='ar'?'حفظ وتثبيت السائق':'Save Driver Profile'}</button></form>`;
    createDynamicModalWrapper('addDriverModal', 'تسجيل سائق جديد بالمنظومة', 'Register Fleet Driver', formBody);
}

async function processNewDriverSaving(e) {
    e.preventDefault();
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const errBox = document.getElementById('addDriverModal_error');
    const errTxt = document.getElementById('addDriverModal_error_txt');
    const name = document.getElementById('md_name').value.trim();
    const phone = document.getElementById('md_phone').value.trim();
    const lic = document.getElementById('md_lic').value.trim();
    
    if(!name || !phone || !lic) { errTxt.textContent = lang==='ar'?'يرجى ملء كافة الحقول!':'Please fill all fields!'; errBox.classList.remove('hidden'); return; }
    if(!/^0[0-9]{9}$/.test(phone)) { errTxt.textContent = lang==='ar'?'رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 0!':'Invalid Phone! Must be 10 digits starting with 0.'; errBox.classList.remove('hidden'); return; }
    
    try {
        const dId = `DRV_${Date.now()}`;
        const uaeClockObj = window.systemLoggerEngine.getOfficialUAETimestamp();
        await rSet(rChild(rRef(window.firebaseDB), `system_drivers/${dId}`), { driverId: dId, driverName: name, mobile: phone, licenseNumber: lic, createdTimestamp: uaeClockObj.displayString });
        document.getElementById('addDriverModal').remove();
        loadGeneralDrivers();
        alert(lang === 'ar' ? 'تم إضافة السائق بنجاح' : 'Driver added successfully');
    } catch(err) { console.error(err); alert("Error: " + err.message); }
}

function onDashboardTabChanged(tabId) {
    if (tabId === 'overview') { refreshDashboardStats(); loadCriticalVehicles(); }
    else if (tabId === 'vehicles') { loadGeneralVehicles(); }
    else if (tabId === 'drivers') { loadGeneralDrivers(); }
}

// ============================================================
// ربط جميع الدوال إلى window لاستخدامها من HTML
// ============================================================
window.openAddVehicleModal = openAddVehicleModal;
window.openAddDriverModal = openAddDriverModal;
window.processNewVehicleSaving = processNewVehicleSaving;
window.processNewDriverSaving = processNewDriverSaving;
window.toggleAccordionElement = toggleAccordionElement;
window.onDashboardTabChanged = onDashboardTabChanged;
window.renderCurrentDashboardTab = function() { onDashboardTabChanged(localStorage.getItem('active_dash_tab') || 'overview'); };

window.addEventListener('DOMContentLoaded', () => { 
    refreshDashboardStats(); 
    onDashboardTabChanged(localStorage.getItem('active_dash_tab') || 'overview'); 
});
