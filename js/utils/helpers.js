// js/utils/helpers.js

/**
 * دالة للحصول على التاريخ والوقت الحالي بتوقيت الإمارات (GST)
 * نستخدمها لضمان توحيد الوقت في كافة سجلات النظام
 */
export function getUAEFormattedDate() {
  const options = { 
    timeZone: 'Asia/Dubai',
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  };
  return new Intl.DateTimeFormat('en-GB', options).format(new Date());
}

/**
 * دالة للتحقق من تطابق البيانات الثلاثية (رقم اللوحة، الرمز، الإمارة)
 * تستخدم في منطق الربط الذاتي للسيارات
 */
export function formatCarUniqueKey(plateNumber, plateCode, emirate) {
  return `${emirate.toLowerCase()}_${plateCode.toLowerCase()}_${plateNumber}`;
}
