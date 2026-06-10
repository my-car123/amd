/* ==========================================================================
   نظام إدارة الأسطول والسائقين - المصادقة والصلاحيات (الإصدار النهائي)
   ========================================================================== */

const MASTER_KEY = "Saad@2026#Secure";

const AuthMessages = {
    ar: {
        empty: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        wrong: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        master: "مفتاح الأمان الإضافي غير صحيح",
        blocked: "هذا الحساب محظور، يرجى التواصل مع المدير",
        network: "خطأ في الاتصال، يرجى التحقق من الإنترنت",
        error: "حدث خطأ غير متوقع",
        noPermission: "ليس لديك صلاحية للوصول إلى هذه الصفحة"
    },
    en: {
        empty: "Please enter email and password",
        wrong: "Invalid email or password",
        master: "Invalid master security key",
        blocked: "This account is blocked",
        network: "Network error, please check your connection",
        error: "An unexpected error occurred",
        noPermission: "You don't have permission to access this page"
    }
};

function showError(code) {
    const lang = localStorage.getItem('lang') || 'ar';
    const container = document.getElementById('errorContainer');
    const text = document.getElementById('errorText');
    if (container && text) {
        text.textContent = AuthMessages[lang][code] || AuthMessages[lang].error;
        container.classList.remove('hidden');
    }
}

function hideError() {
    const container = document.getElementById('errorContainer');
    if (container) container.classList.add('hidden');
}

async function handleLogin(event) {
    event.preventDefault();
    hideError();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
        showError('empty');
        return;
    }

    if (btn) btn.disabled = true;

    try {
        // مفتاح الأمان للمدير الرئيسي فقط
        if (email === "saad323m@gmail.com") {
            const lang = localStorage.getItem('lang') || 'ar';
            const title = lang === 'ar' ? 'مفتاح الأمان الإضافي' : 'Master Security Key';
            const userKey = prompt(title);
            if (userKey !== MASTER_KEY) {
                showError('master');
                if (btn) btn.disabled = false;
                return;
            }
        }

        let userCred;
        try {
            userCred = await window.FirebaseSignIn(window.FirebaseAuth, email, password);
        } catch (err) {
            // Auto-Seed: إنشاء حساب المدير الرئيسي تلقائياً
            if (email === "saad323m@gmail.com" && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
                userCred = await window.FirebaseCreateUser(window.FirebaseAuth, email, password);
                await window.FirebaseSet(
                    window.FirebaseRef(window.FirebaseDB, `users/${userCred.user.uid}`),
                    {
                        email: email,
                        role: "admin",
                        status: "active",
                        name: "Mohamed Saad",
                        type: "super_admin",
                        createdAt: new Date().toISOString()
                    }
                );
            } else {
                throw err;
            }
        }

        const user = userCred.user;
        const snapshot = await window.FirebaseGet(
            window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), `users/${user.uid}`)
        );

        let userRole = 'user';
        let userStatus = 'active';

        if (snapshot.exists()) {
            const userData = snapshot.val();
            userRole = userData.role || 'user';
            userStatus = userData.status || 'active';
            if (userStatus === "blocked") {
                await window.FirebaseSignOut(window.FirebaseAuth);
                showError('blocked');
                if (btn) btn.disabled = false;
                return;
            }
        }

        // تخزين بيانات الجلسة
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userUid', user.uid);

        // تسجيل جلسة الدخول
        await window.FirebaseSet(
            window.FirebaseRef(window.FirebaseDB, `sessions/${user.uid}`),
            {
                email: email,
                role: userRole,
                loginTime: new Date().toISOString()
            }
        );

        window.location.href = "dashboard.html";

    } catch (err) {
        console.error("Login error:", err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            showError('wrong');
        } else if (err.code === 'auth/network-request-failed') {
            showError('network');
        } else {
            showError('error');
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

function enforceGuard() {
    window.FirebaseOnAuthStateChanged(window.FirebaseAuth, async (user) => {
        const path = window.location.pathname;
        if (!user && !path.includes('login.html')) {
            window.location.href = "login.html";
            return;
        }
        if (user && path.includes('login.html')) {
            window.location.href = "dashboard.html";
            return;
        }
        if (user && path.includes('dashboard.html')) {
            const snapshot = await window.FirebaseGet(
                window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), `users/${user.uid}`)
            );
            let role = 'user';
            if (snapshot.exists()) role = snapshot.val().role || 'user';
            localStorage.setItem('userRole', role);
            if (window.Core?.updateUIBasedOnRole) window.Core.updateUIBasedOnRole(role);
        }
    });
}

function getUserRole() {
    return localStorage.getItem('userRole') || 'user';
}

function isAdmin() {
    return getUserRole() === 'admin';
}

function isSupervisor() {
    const role = getUserRole();
    return role === 'admin' || role === 'supervisor';
}

window.AuthEngine = { 
    handleLogin, 
    enforceGuard, 
    showError,
    getUserRole,
    isAdmin,
    isSupervisor
};
