import { auth, db } from '../config/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 1. التحقق من وجود مستخدمين في النظام
    const usersCollection = collection(db, "users");
    const snapshot = await getCountFromServer(usersCollection);
    const isFirstUser = snapshot.data().count === 0;

    let userDoc = await getDoc(doc(db, "users", user.uid));

    // 2. إذا كان أول مستخدم، ننشئ له ملف كمدير
    if (!userDoc.exists() && isFirstUser) {
      await setDoc(doc(db, "users", user.uid), {
        fullName: "Admin", // يمكنك تغييره لاحقاً
        role: "admin",
        createdAt: new Date()
      });
      userDoc = await getDoc(doc(db, "users", user.uid));
    }

    // 3. التحقق النهائي من الصلاحيات
    if (userDoc.exists()) {
      const userData = userDoc.data();
      sessionStorage.setItem("userName", userData.fullName);
      return { success: true, role: userData.role };
    } else {
      return { success: false, message: "حسابك غير مصرح له بالدخول (لا تملك رتبة)." };
    }
  } catch (error) {
    return { success: false, message: "خطأ: " + error.message };
  }
}
