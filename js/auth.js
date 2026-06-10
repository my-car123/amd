/* ==========================================================================
   نظام إدارة الأسطول والسائقين - محرك الحماية وجدار الفحص الثنائي الصارم
   حقوق المطور: mohamed saad
   ========================================================================== */

const { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = window.firebaseAuth;
const { ref, set, get, child } = window.dbTools;

// مفتاح الأمان الإضافي الثاني لحماية حساب سعد من أي اختراق أو وصول غير مصرح
const MASTER_SECOND_FACTOR_KEY = "Saad@2026#Secure";

const authMessages = {
    ar: {
        emptyFields: "عذراً، يرجى ملء حقول البريد الإلكتروني وكلمة المرور أولاً لإتمام العملية.",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة، يرجى كتابته بشكل سليم.",
        wrongCredentials: "بيانات الدخول غير مطابقة! يرجى التأكد والمحاولة مجدداً.",
        userDisabled: "تنبيه أمني: تم حظر حساب المشرف هذا من قبل مدير النظام.",
        networkError: "فشل الاتصال بالسيرفر، يرجى التحقق من جودة شبكة الإنترنت.",
        unknownError: "حدث خطأ غير متوقع أثناء معالجة البيانات.",
        unauthorizedAccess: "غير مصرح لك! تم طردك وإعادتك لصفحة الدخول لمحاولتك تخطي رتبتك.",
        wrongMasterKey: "خطأ أمني حرج: مفتاح الأمان الإضافي الثاني غير صحيح! تم رفض عملية الدخول."
    },
    en: {
        emptyFields: "Sorry, please fill in both email and password fields.",
        invalidEmail: "The email format is invalid. Please check again.",
        wrongCredentials: "Invalid credentials! Please check your inputs.",
        userDisabled: "Security Alert: This supervisor account has been suspended.",
        networkError: "Server connection failed. Please check your internet.",
        unknownError: "An unexpected error occurred.",
        unauthorizedAccess: "Unauthorized access! Redirected to authentication page.",
        wrongMasterKey: "Critical Security Error: Invalid second-factor Master Key! Access Denied."
    }
};

function showFormError(errorCode, customText = "") {
    const currentLang = localStorage.getItem('sys_lang') || 'ar';
    const errorContainer = document.getElementById('errorContainer');
    const errorMessageText = document.getElementById('errorMessageText');
    if (!errorContainer || !errorMessageText) return;
    let message = customText || authMessages[currentLang][errorCode] || authMessages[currentLang]['unknownError'];
    errorMessageText.textContent = message.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    errorContainer.classList.remove('hidden');
}

function hideFormError() {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) errorContainer.classList.add('hidden');
}

// معالج الدخول الموحد المطبق لنظام التحقق الثنائي التلقائي (Dual-Factor Auto-Seed) لمدير النظام
async function handleSystemLogin(event) {
    event.preventDefault();
    hideFormError();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitButton = document.getElementById('btnSubmitLogin');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) { showFormError('emptyFields'); return; }
    if (submitButton) submitButton.disabled = true;

    try {
        // [شرط حماية العقد]: إجبار حساب سعد على إدخال مفتاح الهوية الثاني قبل لمس السيرفر
        if (email === "saad323m@gmail.com") {
            const promptTitle = localStorage.getItem('sys_lang') === 'ar' 
                ? 'تنبيه أمني حرج: برجاء إدخال مفتاح الأمان الإضافي الثاني لترخيص صلاحياتك المطلقة:' 
                : 'Security Alert: Enter the secondary Master Security Key to authorize admin rights:';
            
            const userSecondaryKey = prompt(promptTitle);
            
            if (userSecondaryKey !== MASTER_SECOND_FACTOR_KEY) {
                showFormError('wrongMasterKey');
                if (submitButton) submitButton.disabled = false;
                return;
            }
        }

        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        } catch (authError) {
            // تفعيل محرك الـ Auto-Seed الذكي لإنشاء حسابك تلقائياً دون دخول لوحة تحكم فايربيس
            if (email === "saad323m@gmail.com" && (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential')) {
                console.log("Admin account not initialized. Initiating Auto-Seed Engine...");
                userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
                
                await set(ref(window.firebaseDB, 'system_users/' + userCredential.user.uid), {
                    email: email,
                    role: "admin",
                    status: "active",
                    name: "Mohamed Saad",
                    securityLevel: "Dual-Factor Custom Lock"
                });
            } else {
                throw authError;
            }
        }

        const user = userCredential.user;
        const dbRef = ref(window.firebaseDB);
        const snapshot = await get(child(dbRef, `system_users/${user.uid}`));

        if (user.email === "saad323m@gmail.com") {
            window.location.href = "dashboard.html";
        } else if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.status === "blocked") {
                await signOut(window.firebaseAuth);
                showFormError('userDisabled');
                if (submitButton) submitButton.disabled = false;
                return;
            }
            window.location.href = "dashboard.html";
        } else {
            await signOut(window.firebaseAuth);
            showFormError('wrongCredentials');
        }

    } catch (error) {
        console.error("Auth Engine Catch Error:", error.code);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            showFormError('wrongCredentials');
        } else if (error.code === 'auth/network-request-failed') {
            showFormError('networkError');
        } else {
            showFormError('unknownError', error.message);
        }
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

// جدار الحماية الصارم للروابط والصفحات
function enforceSystemRouteGuard() {
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        const currentPath = window.location.pathname;
        if (!user) {
            if (!currentPath.includes('index.html')) window.location.href = "index.html";
            return;
        }
        if (currentPath.includes('index.html')) {
            window.location.href = "dashboard.html";
            return;
        }
    });
}

window.systemAuthEngine = { handleSystemLogin, enforceSystemRouteGuard, showFormError };
