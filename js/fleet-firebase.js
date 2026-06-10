/* ==========================================================================
   نظام إدارة الأسطول والسائقين - تهيئة Firebase (الإصدار النهائي)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    child, 
    push, 
    query, 
    orderByChild, 
    equalTo, 
    limitToFirst,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
    .then(() => console.log("✓ Firebase persistence active"))
    .catch(err => console.error("✗ Persistence error:", err));

// تصدير جميع الكائنات إلى window
window.FirebaseAuth = auth;
window.FirebaseDB = db;
window.FirebaseRef = ref;
window.FirebaseSet = set;
window.FirebaseGet = get;
window.FirebaseChild = child;
window.FirebasePush = push;
window.FirebaseQuery = query;
window.FirebaseOrderByChild = orderByChild;
window.FirebaseEqualTo = equalTo;
window.FirebaseLimitToFirst = limitToFirst;
window.FirebaseRemove = remove;
window.FirebaseUpdate = update;
window.FirebaseSignIn = signInWithEmailAndPassword;
window.FirebaseCreateUser = createUserWithEmailAndPassword;
window.FirebaseSignOut = signOut;
window.FirebaseOnAuthStateChanged = onAuthStateChanged;

console.log("✓ Firebase module loaded");
