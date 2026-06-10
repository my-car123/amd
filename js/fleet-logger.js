/* ==========================================================================
   نظام إدارة الأسطول والسائقين - نظام التسجيل والتوقيت (الإصدار النهائي)
   ========================================================================== */

function getUAETime() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const uae = new Date(now.getTime() + offset + (4 * 3600000));
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    const day = days[uae.getDay()];
    const date = uae.getDate().toString().padStart(2, '0');
    const month = months[uae.getMonth()];
    const year = uae.getFullYear();
    let hours = uae.getHours();
    const minutes = uae.getMinutes().toString().padStart(2, '0');
    const seconds = uae.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    const displayEn = `${day}, ${month} ${date}, ${year} - ${hours}:${minutes}:${seconds} ${ampm}`;
    const displayAr = `${daysAr[uae.getDay()]} ${date} ${monthsAr[uae.getMonth()]} ${year} الساعة ${hours}:${minutes} ${ampm === 'AM' ? 'صباحاً' : 'مساءً'}`;
    
    return {
        displayEn,
        displayAr,
        raw: uae.getTime(),
        iso: uae.toISOString()
    };
}

async function writeLog(data) {
    try {
        const time = getUAETime();
        const logEntry = {
            ...data,
            timestampEn: time.displayEn,
            timestampAr: time.displayAr,
            unixTime: time.raw,
            operator: localStorage.getItem('userEmail') || 'system'
        };
        
        // سجل عام
        const logRef = window.FirebasePush(window.FirebaseRef(window.FirebaseDB, "system_logs"));
        await window.FirebaseSet(logRef, logEntry);
        
        // سجل المركبة إذا وجدت
        if (data.vehicleId) {
            const vehicleLogRef = window.FirebasePush(
                window.FirebaseRef(window.FirebaseDB, `vehicles/${data.vehicleId}/history`)
            );
            await window.FirebaseSet(vehicleLogRef, {
                action: data.action,
                driverName: data.driverName,
                timestamp: time.displayEn
            });
        }
        
        return true;
    } catch (err) {
        console.error("Log error:", err);
        return false;
    }
}

window.Logger = { getUAETime, writeLog };
