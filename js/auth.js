/* ==========================================================================
   نظام إدارة الأسطول والسائقين - محرك الحماية وجدار الفحص الثنائي الصارم
   حقوق المطور: mohamed saad
   ========================================================================== */

const MASTER_SECOND_FACTOR_KEY = "Saad@2026#Secure";

const authMessages = {
    ar: {
        emptyFields: "عذراً، يرجى ملء حقول البريد الإلكتروني وكلمة المرور أولاً.",
        invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
        wrongCredentials: "بيانات الدخول غير صحيحة! يرجى المحاولة مجدداً.",
        userDisabled: "تنبيه أمني: تم حظر حساب المشرف هذا.",
        networkError: "فشل الاتصال بالسيرفر، يرجى التحقق من الشبكة.",
        unknownError: "حدث خطأ غير متوقع.",
        wrongMasterKey: "خطأ أمني: مفتاح الأمان الإضافي غير صحيح!"
    },
    en: {
        emptyFields: "Please fill in both email and password fields.",
        invalidEmail: "The email format is invalid.",
        wrongCredentials: "Invalid credentials! Please try again.",
        userDisabled: "Security Alert: This supervisor account has been suspended.",
        networkError: "Server connection failed. Please check your internet.",
        unknownError: "An unexpected error occurred.",
        wrongMasterKey: "Security Error: Invalid second-factor Master Key!"
    }
};

function showFormError(errorCode, customText = "") {
    const currentLang = localStorage.getItem('sys_lang') || 'ar';
    const errorContainer = document.getElementById('errorContainer');
    const errorMessageText = document.getElementById('errorMessageText');
    if (!errorContainer || !errorMessageText) return;
    let message = customText || authMessages[currentLang][errorCode] || authMessages[currentLang]['unknownError'];
    errorMessageText.textContent = message;
    errorContainer.classList.remove('hidden');
}

function hideFormError() {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) errorContainer.classList.add('hidden');
}

async function handleSystemLogin(event) {
    event.preventDefault();
    hideFormError();

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitButton = document.getElementById('btnSubmitLogin');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showFormError('emptyFields');
        return;
    }

    if (submitButton) submitButton.disabled = true;

    try {
        // مفتاح الأمان الثنائي لحساب المدير
        if (email === "saad323m@gmail.com") {
            const currentLang = localStorage.getItem('sys_lang') || 'ar';
            const promptTitle = currentLang === 'ar' 
                ? 'تنبيه أمني: أدخل مفتاح الأمان الإضافي الثاني:' 
                : 'Security Alert: Enter the secondary Master Security Key:';
            
            const userSecondaryKey = prompt(promptTitle);
            
            if (userSecondaryKey !== MASTER_SECOND_FACTOR_KEY) {
                showFormError('wrongMasterKey');
                if (submitButton) submitButton.disabled = false;
                return;
            }
        }

        let userCredential;
        try {
            userCredential = await window.signInWithEmailAndPassword(window.firebaseAuth, email, password);
        } catch (authError) {
            // Auto-Seed: إنشاء حساب المدير تلقائياً
            if (email === "saad323m@gmail.com" && (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential')) {
                console.log("Admin account not found. Creating automatically...");
                userCredential = await window.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
                
                await window.dbTools.set(window.dbTools.ref(window.firebaseDB, 'system_users/' + userCredential.user.uid), {
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
        const dbRef = window.dbTools.ref(window.firebaseDB);
        const snapshot = await window.dbTools.get(window.dbTools.child(dbRef, `system_users/${user.uid}`));

        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.status === "blocked") {
                await window.signOut(window.firebaseAuth);
                showFormError('userDisabled');
                if (submitButton) submitButton.disabled = false;
                return;
            }
        }

        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Login Error:", error.code);
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

function enforceSystemRouteGuard() {
    window.onAuthStateChanged(window.firebaseAuth, async (user) => {
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

// تصدير الوظائف للنطاق العام
window.systemAuthEngine = { 
    handleSystemLogin, 
    enforceSystemRouteGuard, 
    showFormError 
};