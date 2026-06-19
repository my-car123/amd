// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBHHGY_gVpm3NlXThqsC6ojTL9Je4xQ9w",
    authDomain: "car-moving-8b59e.firebaseapp.com",
    projectId: "car-moving-8b59e",
    storageBucket: "car-moving-8b59e.firebasestorage.app",
    messagingSenderId: "332747318494",
    appId: "1:332747318494:web:d5d61cd53f322a182f0e4f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, password)
        .then(() => alert("تم تسجيل الدخول بنجاح!"))
        .catch((e) => alert("خطأ: " + e.message));
});
