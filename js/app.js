import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

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

// DOM Elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const cardsContainer = document.getElementById('cards-container');

// --- 1. Authentication Logic ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in.
        loginSection.style.display = 'none';
        appSection.style.display = 'flex';
        // Here we would fetch user role from DB, for now we assume Admin
        loadMockData(); // Load UI demo
    } else {
        // User is signed out
        loginSection.style.display = 'flex';
        appSection.style.display = 'none';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        loginError.textContent = "خطأ في تسجيل الدخول: تحقق من البيانات";
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// --- 2. Timezone & Status Color Logic ---
function getStatusClass(expiryDateStr) {
    if (!expiryDateStr) return '';
    
    // Always use UAE Time
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const expiry = new Date(expiryDateStr);
    
    // Set both times to midnight to compare days accurately
    now.setHours(0,0,0,0);
    expiry.setHours(0,0,0,0);
    
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'status-red';      // Expired
    if (diffDays <= 15) return 'status-yellow';  // About to expire
    return 'status-green';                       // Valid
}

// --- 3. UI Rendering (Mock Data for Phase 4 Demo) ---
function loadMockData() {
    const mockCars = [
        { id: 'UAE_001', plateNum: '12345', plateCode: '22', owner: 'سعيد محمد', type: 'تويوتا لاندكروزر', licenseExpiry: '2025-12-15', insuranceExpiry: '2025-06-10', driver: 'أحمد' },
        { id: 'UAE_002', plateNum: '67890', plateCode: 'أ', owner: 'خالد عبدالله', type: 'نيسان باترول', licenseExpiry: '2024-11-05', insuranceExpiry: '2024-11-05', driver: null },
        { id: 'UAE_003', plateNum: '11223', plateCode: 'ب 1', owner: 'شركة النور', type: 'هيونداي H1', licenseExpiry: '2024-10-20', insuranceExpiry: '2024-09-01', driver: 'عمر حسن' }
    ];

    cardsContainer.innerHTML = '';
    
    mockCars.forEach(car => {
        // Determine the worst status between license and insurance
        const licenseStatus = getStatusClass(car.licenseExpiry);
        const insuranceStatus = getStatusClass(car.insuranceExpiry);
        // Simple priority: Red > Yellow > Green
        let cardStatus = 'status-green';
        if (licenseStatus === 'status-red' || insuranceStatus === 'status-red') cardStatus = 'status-red';
        else if (licenseStatus === 'status-yellow' || insuranceStatus === 'status-yellow') cardStatus = 'status-yellow';

        const cardEl = document.createElement('div');
        cardEl.className = `card ${cardStatus}`;
        cardEl.onclick = () => cardEl.classList.toggle('expanded'); // Collapse/Expand

        cardEl.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${car.id}</div>
                    <div class="plate-design">
                        <span class="plate-number">${car.plateNum}</span>
                        <span class="plate-code">| ${car.plateCode}</span>
                    </div>
                </div>
                <div>
                    <span style="font-weight:bold;">${car.owner}</span><br>
                    <small>السائق: ${car.driver || 'غير معين'}</small>
                </div>
            </div>
            <div class="card-body">
                <p><strong>النوع:</strong> ${car.type}</p>
                <p><strong>انتهاء الترخيص:</strong> ${car.licenseExpiry} <span class="dot ${licenseStatus}"></span></p>
                <p><strong>انتهاء التأمين:</strong> ${car.insuranceExpiry} <span class="dot ${insuranceStatus}"></span></p>
                <div class="card-actions">
                    <button class="btn-action" style="background:#87CEFA; color:white;">تعديل</button>
                    <button class="btn-action" style="background:#dc3545; color:white;">حذف</button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(cardEl);
    });
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => console.log('SW failed', err));
  });
}