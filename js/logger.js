/* ==========================================================================
   نظام إدارة الأسطول - محرك السجلات (Triple Logger)
   ========================================================================== */

const { ref, push, set } = window.dbTools;

function getOfficialUAETimestamp() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const uaeTime = new Date(utc + (3600000 * 4)); // GMT+4

    const dayNum = uaeTime.getDate().toString().padStart(2, '0');
    const monthNum = (uaeTime.getMonth() + 1).toString().padStart(2, '0');
    const yearNum = uaeTime.getFullYear();
    
    let hours = uaeTime.getHours();
    const minutes = uaeTime.getMinutes().toString().padStart(2, '0');
    const seconds = uaeTime.getSeconds().toString().padStart(2, '0');
    
    hours = hours % 12; hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');

    const finalString = `${yearNum}-${monthNum}-${dayNum} ${hoursStr}:${minutes}:${seconds} ${hours >= 12 ? 'PM' : 'AM'}`;
    
    return { displayString: finalString, rawDate: uaeTime };
}

async function writeTripleSystemLog(logPayload) {
    const uaeTimeObject = getOfficialUAETimestamp();
    const currentUser = window.firebaseAuth.currentUser;
    
    const finalLogData = {
        vehicleId: logPayload.vehicleId || "SYSTEM",
        plateNumber: logPayload.plateNumber || "N/A",
        driverId: logPayload.driverId || "NONE",
        driverName: logPayload.driverName || "System",
        actionType: logPayload.actionType,
        timestamp: uaeTimeObject.displayString,
        unixTime: uaeTimeObject.rawDate.getTime(),
        operator: currentUser ? currentUser.email : "Unknown"
    };

    try {
        // 1. السجل العام (للمدير فقط)
        await set(push(ref(window.firebaseDB, "system_logs")), finalLogData);

        // 2. سجل السيارة (إذا كان متعلق بسيارة)
        if (logPayload.vehicleId) {
            await set(push(ref(window.firebaseDB, `vehicles/${logPayload.vehicleId}/history`)), finalLogData);
        }

        // 3. سجل السائق (إذا كان متعلق بسائق)
        if (logPayload.driverId && logPayload.driverId !== "NONE") {
            await set(push(ref(window.firebaseDB, `system_drivers/${logPayload.driverId}/history`)), finalLogData);
        }
        return true;
    } catch (error) {
        console.error("Logging Engine Failed:", error);
        return false;
    }
}

window.systemLoggerEngine = { getOfficialUAETimestamp, writeTripleSystemLog };
