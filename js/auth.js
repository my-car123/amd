/* ==========================================================================
   نظام إدارة الأسطول - محرك الأمان والصلاحيات (Auth Engine)
   ========================================================================== */

const { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = window.firebaseAuth;
const { ref, set, get, child } = window.dbTools;

// الثوابت الأمنية
const ADMIN_EMAIL = "saad323m@gmail.com";
const ADMIN_SECONDARY_KEY = "Saad@2026#Secure"; // مفتاح تعديل بيانات المدير

// قاموس الرسائل
const msgDict = {
    ar: {
        loginTitle: "تسجيل الدخول",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        loginBtn: "دخول",
        errEmpty: "يرجى ملء جميع الحقول",
        errCreds: "بيانات الدخول غير صحيحة",
        errNetwork: "خطأ في الاتصال بالشبكة",
        errSuspended: "تم تعليق حسابك. تواصل مع المدير.",
        success: "تم تسجيل الدخول بنجاح",
        adminSetup: "جاري إعداد حساب المدير الرئيسي..."
    },
    en: {
        loginTitle: "Login",
        email: "Email Address",
        password: "Password",
        loginBtn: "Login",
        errEmpty: "Please fill all fields",
        errCreds: "Invalid credentials",
        errNetwork: "Network connection error",
        errSuspended: "Your account has been suspended.",
        success: "Login Successful",
        adminSetup: "Initializing Admin Account..."
    }
};

// --- 1. معالجة تسجيل الدخول ---
async function handleLogin(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('emailInput').value.trim();
    const passInput = document.getElementById('passInput').value;
    const errorMsg = document.getElementById('errorMsg');
    const loginBtn = document.getElementById('loginBtn');
    
    const lang = localStorage.getItem('sys_lang') || 'ar';
    
    // التحقق من الحقول
    if (!emailInput || !passInput) {
        errorMsg.textContent = msgDict[lang].errEmpty;
        errorMsg.style.display = 'block';
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = "...";
    errorMsg.style.display = 'none';
    
    try {
        let userCredential;
        
        // محاولة تسجيل الدخول
        try {
            userCredential = await signInWithEmailAndPassword(window.firebaseAuth, emailInput, passInput);
        } catch (authError) {
            // إذا الحساب غير موجود والمحاولة للمدير الرئيسي -> إنشاء تلقائي (Auto-Seed)
            if (emailInput === ADMIN_EMAIL && (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential')) {
                console.log(msgDict[lang].adminSetup);
                userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, emailInput, passInput);
                
                // إنشاء سجل المدير في قاعدة البيانات
                const adminData = {
                    email: ADMIN_EMAIL,
                    role: "admin",
                    status: "active",
                    name: "SAAD",
                    title: "مدير النظام",
                    uid: userCredential.user.uid
                };
                await set(ref(window.firebaseDB, `system_users/${userCredential.user.uid}`), adminData);
            } else {
                throw authError; // رمي الخطأ إذا لم يكن المدير
            }
        }
        
        // التحقق من حالة الحساب في قاعدة البيانات (Active/Suspended)
        const uid = userCredential.user.uid;
        const dbRef = ref(window.firebaseDB);
        const userSnap = await get(child(dbRef, `system_users/${uid}`));
        
        if (userSnap.exists()) {
            const userData = userSnap.val();
            
            // التحقق من التعليق
            if (userData.status === "suspended") {
                await signOut(window.firebaseAuth);
                errorMsg.textContent = msgDict[lang].errSuspended;
                errorMsg.style.display = 'block';
                loginBtn.disabled = false;
                loginBtn.textContent = msgDict[lang].loginBtn;
                return;
            }
            
            // حفظ البيانات محلياً للواجهة
            localStorage.setItem('user_role', userData.role);
            localStorage.setItem('user_name', userData.name);
            localStorage.setItem('user_email', userData.email);
            
            // توجيه للوحة التحكم
            window.location.href = "dashboard.html";
            
        } else {
            // حالة نادرة: المستخدم موجود في Auth وليس له سجل في DB
            await signOut(window.firebaseAuth);
            errorMsg.textContent = msgDict[lang].errCreds;
            errorMsg.style.display = 'block';
        }
        
    } catch (error) {
        console.error("Auth Error:", error);
        let errMsg = msgDict[lang].errCreds;
        if (error.code === 'auth/network-request-failed') errMsg = msgDict[lang].errNetwork;
        errorMsg.textContent = errMsg;
        errorMsg.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = msgDict[lang].loginBtn;
    }
}

// --- 2. حماية الصفحات (Route Guard) ---
function enforceSystemRouteGuard() {
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        const currentPage = window.location.pathname;
        
        // إذا غير مسجل الدخول
        if (!user) {
            if (!currentPage.includes('index.html')) {
                window.location.href = "index.html";
            }
            return;
        }
        
        // إذا مسجل الدخول ووجوده في صفحة الدخول -> توجيه للوحة التحكم
        if (currentPage.includes('index.html')) {
            window.location.href = "dashboard.html";
            return;
        }
        
        // التحقق من الصلاحيات للمسارات الحساسة (Logs, Users)
        // يتم استدعاء هذه الدالة في dashboard.html للتحقق الإضافي
    });
}

// --- 3. التحقق من كلمة مرور المدير (Secondary Key) ---
function verifyAdminKey(callback) {
    const lang = localStorage.getItem('sys_lang') || 'ar';
    const promptMsg = lang === 'ar' 
        ? "تنبيه أمني: أدخل كلمة المرور الإضافية لتعديل بيانات المدير:" 
        : "Security Alert: Enter the secondary password to modify admin data:";
        
    const input = prompt(promptMsg);
    
    if (input === ADMIN_SECONDARY_KEY) {
        callback(); // تنفيذ الدالة المطلوبة
    } else {
        alert(lang === 'ar' ? "كلمة المرور غير صحيحة! تم رفض العملية." : "Incorrect password! Action denied.");
    }
}

// --- 4. تسجيل الخروج ---
function handleLogout() {
    signOut(window.firebaseAuth).then(() => {
        localStorage.clear();
        window.location.href = "index.html";
    });
}

// تصدير الدوال للاستخدام في HTML
window.authEngine = {
    handleLogin,
    enforceSystemRouteGuard,
    handleLogout,
    verifyAdminKey
};
