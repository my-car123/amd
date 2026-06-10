/* ==========================================================================
   نظام إدارة الأسطول والسائقين - موديول السجلات وحقن العهد التاريخية (Triple Logger)
   حقوق المطور: mohamed saad
   ========================================================================== */

const { ref, push, set } = window.dbTools;

function getOfficialUAETimestamp() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const uaeTime = new Date(utc + (3600000 * 4)); // تطبيق توقيت دولة الإمارات الفعلي GMT+4

    const dayNum = uaeTime.getDate().toString().padStart(2, '0');
    const monthNum = (uaeTime.getMonth() + 1).toString().padStart(2, '0');
    const yearNum = uaeTime.getFullYear();
    
    let hours = uaeTime.getHours();
    const minutes = uaeTime.getMinutes().toString().padStart(2, '0');
    const seconds = uaeTime.getSeconds().toString().padStart(2, '0');
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');

    const finalString = `${yearNum}-${monthNum}-${dayNum} ${hoursStr}:${minutes}:${seconds} ${hours >= 12 ? 'PM' : 'AM'}`;
    
    return {
        displayString: finalString.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)),
        rawDate: uaeTime
    };
}

// محرك الضخ والتدوين الفوري الموزع على ثلاث مسارات تشغيلية متزامنة في نفس الأجزاء من الثانية
async function writeTripleSystemLog(logPayload) {
    const uaeTimeObject = getOfficialUAETimestamp();
    
    const finalLogData = {
        vehicleId: logPayload.vehicleId,
        plateNumber: logPayload.plateNumber,
        driverId: logPayload.driverId || "NONE",
        driverName: logPayload.driverName || "بدون مستخدم / No User",
        actionType: logPayload.actionType,
        timestamp: uaeTimeObject.displayString,
        unixTime: uaeTimeObject.rawDate.getTime(),
        operator: logPayload.operatorEmail || "System Engine"
    };

    try {
        // 1. المسار الأول: الضخ الفوري في السجل العام الشامل للأنظمة (Audit Log)
        const systemLogPost = push(ref(window.firebaseDB, "system_logs"));
        await set(systemLogPost, finalLogData);

        // 2. المسار الثاني: الحقن المباشر في سجل حركات بطاقة السيارة المحددة لقراءتها كأكورديون
        const vehicleLogPost = push(ref(window.firebaseDB, `vehicles/${logPayload.vehicleId}/custody_history`));
        await set(vehicleLogPost, {
            driverId: finalLogData.driverId,
            driverName: finalLogData.driverName,
            actionType: finalLogData.actionType,
            timestamp: finalLogData.timestamp,
            unixTime: finalLogData.unixTime
        });

        // 3. المسار الثالث: الحقن المباشر في سجل ملف السائق المستلم لحفظ تسلسله التاريخي للعهدة
        if (logPayload.driverId && logPayload.driverId !== "NONE") {
            const driverLogPost = push(ref(window.firebaseDB, `system_drivers/${logPayload.driverId}/custody_history`));
            await set(driverLogPost, {
                vehicleId: finalLogData.vehicleId,
                plateNumber: finalLogData.plateNumber,
                actionType: finalLogData.actionType,
                timestamp: finalLogData.timestamp,
                unixTime: finalLogData.unixTime
            });
        }
        return true;
    } catch (error) {
        console.error("Critical Failure in Triple Logging Engine:", error);
        throw error;
    }
}

window.systemLoggerEngine = { getOfficialUAETimestamp, writeTripleSystemLog };
