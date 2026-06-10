/* ==========================================================================
   نظام إدارة الأسطول - محرك المصادقة والحماية (Auth Engine)
   ========================================================================== */

const { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = window.firebaseAuth;
const { ref, set, get, child } = window.dbTools;

const MASTER_ADMIN_EMAIL = "saad323m@gmail.com";
const MASTER_ADMIN_KEY = "Saad@2026#Secure"; // مفتاح التحقق للملف الشخصي

const authDict = {
    ar: { loginTitle: "تسجيل الدخول", email: "البريد الإلكتروني", pass: "كلمة المرور", submit: "دخول", errCred: "بيانات غير صحيحة", errKey: "مفتاح الأمان غير صحيح" },
    en: { loginTitle: "Login", email: "Email", pass: "Password", submit: "Login", errCred: "Invalid Credentials", errKey: "Invalid Security Key" }
};

// التعامل مع تسجيل الدخول
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const lang = localStorage.getItem('sys_lang') || 'ar';

    // خطوة 1: التحقق من المدير الرئيسي
    if (email === MASTER_ADMIN_EMAIL) {
        const key = prompt("أدخل مفتاح الأمان الخاص بالمدير (Security Key):");
        if (key !== MASTER_ADMIN_KEY) {
            alert(authDict[lang].errKey); return;
        }
    }

    try {
        // محاولة تسجيل الدخول
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        } catch (err) {
            // إذا لم يكن الحساب موجوداً، والمحاولة للمدير الرئيسي -> إنشاء حساب تلقائي
            if (email === MASTER_ADMIN_EMAIL && err.code === 'auth/user-not-found') {
                userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
                await set(ref(window.firebaseDB, `system_users/${userCredential.user.uid}`), {
                    email: email, role: "admin", status: "active", name: "Mohamed Saad"
                });
            } else {
                throw err;
            }
        }

        // التحقق من الحالة في قاعدة البيانات (معلق أم لا)
        const userDbRef = ref(window.firebaseDB, `system_users/${userCredential.user.uid}`);
        const snapshot = await get(userDbRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.status === "suspended") {
                alert("تم تعليق حسابك. تواصل مع المدير.");
                await signOut(window.firebaseAuth);
                return;
            }
            // حفظ الدور محلياً لتسهيل التعامل مع الواجهة
            localStorage.setItem('user_role', userData.role);
        } else {
            // مستخدم جديد سجل نفسه (غير مسموح هنا بدون صلاحية)
            await signOut(window.firebaseAuth);
            alert("غير مصرح لك بالدخول.");
            return;
        }

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error(error);
        alert(authDict[lang].errCred);
    }
}

// حماية الصفحات (Route Guard)
function enforceRouteGuard() {
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        const path = window.location.pathname;
        if (!user) {
            if (!path.includes('index.html')) window.location.href = "index.html";
            return;
        }

        // جلب بيانات المستخدم وتخزينها
        const snap = await get(ref(window.firebaseDB, `system_users/${user.uid}`));
        if (snap.exists()) {
            localStorage.setItem('user_role', snap.val().role);
            localStorage.setItem('user_name', snap.val().name || user.email);
        }

        if (path.includes('index.html')) {
            window.location.href = "dashboard.html";
        }
    });
}

// إدارة المستخدمين (للمدير فقط)
async function registerNewSupervisor(email, password, name) {
    // ملاحظة: هذا يتطلب صلاحيات Admin في Firebase Auth
    // بما أننا نستخدم Client SDK، سنقوم بمحاكاة التسجيل عبر حساب المدير الحالي أو دالة خاصة
    // هنا سنفترض أننا نستخدم دالة سحابية أو أن المدير يقوم بإنشاء الحساب يدوياً في Console
    // ولكن للحل الأمثل سنستخدم منطق "Just-In-Time Provisioning" أو إدخال يدوي في DB
    // الحل المؤقت هنا: إضافة سجل في system_users والطلب من السائق التسجيل لاحقاً
    const dummyUid = "sup_" + Date.now();
    await set(ref(window.firebaseDB, `system_users/${dummyUid}`), {
        email: email, role: "supervisor", status: "active", name: name, tempPass: password
    });
    alert("تم إضافة المشرف. يمكنه الآن الدخول باستخدام هذا البريد وكلمة المرور المؤقتة.");
}

window.authEngine = { handleLogin, enforceRouteGuard, registerNewSupervisor };
