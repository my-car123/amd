// js/auth/initAdmin.js
import { db } from '../config/firebase.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

/**
 * هذا السكربت يتم استدعاؤه لمرة واحدة فقط لتهيئة المدير الأساسي
 * @param {string} uid - الـ UID الخاص بالمستخدم من Firebase Auth
 */
export async function initializeAdmin(uid) {
  try {
    await setDoc(doc(db, "users", uid), {
      fullName: "MOHAMED SAAD",
      role: "admin",
      status: "active",
      createdAt: new Date()
    });
    console.log("تم تهيئة المدير بنجاح!");
  } catch (error) {
    console.error("خطأ في تهيئة المدير: ", error);
  }
}
