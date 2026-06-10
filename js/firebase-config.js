/* ==========================================================================
   نظام إدارة الأسطول - تهيئة Firebase
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, get, child, push, query, orderByChild, equalTo, limitToFirst, startAfter } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
const auth = getAuth(app);
const db = getDatabase(app);

setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("System Persistence Active."))
    .catch((err) => console.error("Persistence Error:", err));

window.firebaseAuth = auth;
window.firebaseDB = db;
// إضافة startAfter لدعم التقسيم (Pagination)
window.dbTools = { ref, set, get, child, push, query, orderByChild, equalTo, limitToFirst, startAfter };
