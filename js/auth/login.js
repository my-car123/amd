// js/auth/login.js
import { auth, db } from '../config/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function loginUser(email, password) {
  try {
    // 1. تسجيل الدخول عبر Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. جلب بيانات المستخدم من Firestore لتعيين الاسم والصلاحية
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // تخزين الاسم والدور في الجلسة لاستخدامه في النظام
      sessionStorage.setItem("userName", userData.fullName);
      sessionStorage.setItem("userRole", userData.role);
      return { success: true, role: userData.role };
    } else {
      return { success: false, message: "بيانات المستخدم غير موجودة" };
    }
  } catch (error) {
    return { success: false, message: "خطأ في تسجيل الدخول: " + error.message };
  }
}
