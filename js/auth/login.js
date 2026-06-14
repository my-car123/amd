// js/auth/login.js
import { auth, db } from '../config/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function loginUser(email, password) {
  try {
    // 1. محاولة تسجيل الدخول
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. التحقق من وجود المستخدم في قاعدة البيانات
    let userDoc = await getDoc(doc(db, "users", user.uid));
    
    // 3. منطق التهيئة الذاتية للمدير (إذا لم يكن موجوداً)
    if (!userDoc.exists() && email === "saad323m@gmail.com") {
      await setDoc(doc(db, "users", user.uid), {
        fullName: "MOHAMED SAAD",
        role: "admin",
        status: "active",
        createdAt: new Date()
      });
      // إعادة جلب البيانات بعد الإنشاء
      userDoc = await getDoc(doc(db, "users", user.uid));
    }

    if (userDoc.exists()) {
      const userData = userDoc.data();
      sessionStorage.setItem("userName", userData.fullName);
      sessionStorage.setItem("userRole", userData.role);
      return { success: true, role: userData.role };
    } else {
      return { success: false, message: "غير مصرح لك بالدخول، يرجى مراجعة الإدارة." };
    }
  } catch (error) {
    return { success: false, message: "خطأ في تسجيل الدخول: " + error.message };
  }
}
