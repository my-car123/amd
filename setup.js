// setup.js
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const auth = getAuth(); // تأكد من استدعاء الكود الخاص بـ app أولاً
createUserWithEmailAndPassword(auth, "admin@example.com", "Password123")
    .then(() => console.log("تم إنشاء المستخدم بنجاح!"))
    .catch((e) => console.error(e.message));
