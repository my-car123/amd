// app.js - نسخة مبسطة تعمل على جميع المتصفحات
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, push, runTransaction } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBHHGY_gVpm3NlXThqsC6ojTL9Je4xQ9w",
  authDomain: "car-moving-8b59e.firebaseapp.com",
  databaseURL: "https://car-moving-8b59e-default-rtdb.firebaseio.com",
  projectId: "car-moving-8b59e",
  storageBucket: "car-moving-8b59e.firebasestorage.app",
  messagingSenderId: "332747318494",
  appId: "1:332747318494:web:d5d61cd53f322a182f0e4f"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- تسجيل الدخول ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // سيتم التعامل مع التوجيه في onAuthStateChanged
  } catch (error) {
    document.getElementById('login-error').textContent = "خطأ في الدخول: " + error.message;
  }
});

// --- مراقبة حالة المستخدم ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // مستخدم مسجل دخول
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'flex';
    document.getElementById('user-display-name').textContent = user.email.split('@')[0];
    // هنا يمكنك إضافة باقي الكود الخاص بعرض البيانات (سيارات، سائقين...)
  } else {
    // لا يوجد مستخدم
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
  }
});

// --- تسجيل الخروج ---
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// --- (باقي دوالك مثل fetchCars, etc يمكن إضافتها لاحقاً) ---
console.log("app.js loaded successfully");