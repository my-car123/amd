/* ==========================================================================
   نظام إدارة الأسطول - محرك السجلات الزمنية (Logger Engine)
   ========================================================================== */

const { ref, push, set } = window.dbTools;

// توليد التوقيت الإماراتي بدقة
function getOfficialUAETimestamp() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const uaeTime = new Date(utc + (3600000 * 4)); // GMT+4

    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const dayName = days[uaeTime.getDay()];
    const dayNum = uaeTime.getDate();
    const monthName = months[uaeTime.getMonth()];
    const yearNum = uaeTime.getFullYear();
    
    let hours = uaeTime.getHours();
    const minutes = uaeTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    
    // صيغة العرض: الاثنين 10 مايو 2025 الساعة 10:23 مساءً
    const dateString = `${dayName} ${dayNum} ${monthName} ${yearNum}`;
    const timeString = `الساعة ${hours}:${minutes} ${ampm}`;
    
    return {
        displayString: `${dateString} ${timeString}`,
        unixTime: uaeTime.getTime(),
        rawDate: uaeTime
    };
}

// محرك الضخ الثلاثي (Triple Logger)
async function writeSystemLog(logPayload) {
    if (!window.firebaseAuth.currentUser) return; // لا يوجد مستخدم
    
    const timestamp = getOfficialUAETimestamp();
    const operator = window.firebaseAuth.currentUser.email;
    
    const logData = {
        ...logPayload,
        timestamp: timestamp.displayString,
        unixTime: timestamp.unixTime,
        operator: operator
    };

    try {
        // 1. السجل العام (للمدير)
        await set(push(ref(window.firebaseDB, "system_logs")), logData);

        // 2. سجل السيارة (إذا كان متعلق بسيارة)
        if (logPayload.vehicleId) {
            await set(push(ref(window.firebaseDB, `vehicles/${logPayload.vehicleId}/history`)), logData);
        }

        // 3. سجل السائق (إذا كان متعلق بسائق)
        if (logPayload.driverId) {
            await set(push(ref(window.firebaseDB, `system_drivers/${logPayload.driverId}/history`)), logData);
        }
        
        return true;
    } catch (e) {
        console.error("Logger Engine Error:", e);
        return false;
    }
}

window.systemLogger = { getOfficialUAETimestamp, writeSystemLog };
