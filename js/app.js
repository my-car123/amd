import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, update, onValue, push, runTransaction } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";
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

// Modal Elements
const carModal = document.getElementById('car-modal');
const addCarBtn = document.getElementById('add-car-btn');
const closeBtn = document.querySelector('.close-btn');
const carForm = document.getElementById('car-form');
const modalTitle = document.getElementById('modal-title');

// --- Auth Logic ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.style.display = 'none';
        appSection.style.display = 'flex';
        fetchCars(); // Fetch real data from DB
    } else {
        loginSection.style.display = 'flex';
        appSection.style.display = 'none';
    }
});
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
    } catch (error) { loginError.textContent = "خطأ في تسجيل الدخول"; }
});
logoutBtn.addEventListener('click', () => signOut(auth));

// --- Timezone & Status Logic ---
function getStatusClass(expiryDateStr) {
    if (!expiryDateStr) return '';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    const expiry = new Date(expiryDateStr);
    now.setHours(0,0,0,0); expiry.setHours(0,0,0,0);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'status-red';
    if (diffDays <= 15) return 'status-yellow';
    return 'status-green';
}

// --- Modal Logic ---
addCarBtn.addEventListener('click', () => { openModal(); });
closeBtn.addEventListener('click', () => { carModal.style.display = 'none'; });
window.onclick = (event) => { if (event.target == carModal) carModal.style.display = 'none'; }

function openModal(carData = null) {
    carForm.reset();
    document.getElementById('car-id-hidden').value = '';
    if (carData) {
        modalTitle.textContent = "تعديل بيانات السيارة";
        document.getElementById('car-id-hidden').value = carData.id;
        document.getElementById('plate-number').value = carData.plateNumber;
        document.getElementById('plate-code').value = carData.plateCode;
        document.getElementById('owner').value = carData.owner;
        document.getElementById('car-type').value = carData.type;
        document.getElementById('car-year').value = carData.year;
        document.getElementById('vin').value = carData.vin;
        document.getElementById('license-expiry').value = carData.licenseExpiry;
        document.getElementById('insurance-expiry').value = carData.insuranceExpiry;
        document.getElementById('notes').value = carData.notes || '';
        document.getElementById('violations').value = carData.violations || '';
    } else {
        modalTitle.textContent = "إضافة سيارة جديدة";
    }
    carModal.style.display = 'block';
}

// --- CRUD Operations ---
// 1. Generate Custom ID (UAE_001)
async function generateCarId() {
    const counterRef = ref(db, 'counters/carsCount');
    const newCount = await runTransaction(counterRef, (currentCount) => {
        return (currentCount || 0) + 1;
    });
    const num = newCount.snapshot.val();
    return `UAE_${String(num).padStart(3, '0')}`;
}

// 2. Save / Update Car
carForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hiddenId = document.getElementById('car-id-hidden').value;
    
    const carData = {
        plateNumber: document.getElementById('plate-number').value,
        plateCode: document.getElementById('plate-code').value,
        owner: document.getElementById('owner').value,
        type: document.getElementById('car-type').value,
        year: document.getElementById('car-year').value,
        vin: document.getElementById('vin').value,
        licenseExpiry: document.getElementById('license-expiry').value,
        insuranceExpiry: document.getElementById('insurance-expiry').value,
        notes: document.getElementById('notes').value,
        violations: document.getElementById('violations').value,
        currentDriverId: null
    };

    try {
        if (hiddenId) {
            // Update existing
            await update(ref(db, `cars/${hiddenId}`), carData);
        } else {
            // Add new
            const newId = await generateCarId();
            carData.id = newId;
            await set(ref(db, `cars/${newId}`), carData);
        }
        carModal.style.display = 'none';
    } catch (error) {
        alert("حدث خطأ أثناء الحفظ: " + error.message);
    }
});

// 3. Delete Car
async function deleteCar(carId) {
    if(confirm(`هل أنت متأكد من حذف السيارة ${carId}؟`)) {
        try {
            await remove(ref(db, `cars/${carId}`));
        } catch (error) {
            alert("خطأ في الحذف: " + error.message);
        }
    }
}

// 4. Fetch Cars (Realtime)
function fetchCars() {
    const carsRef = ref(db, 'cars');
    onValue(carsRef, (snapshot) => {
        cardsContainer.innerHTML = '';
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                renderCard(data[key]);
            });
        } else {
            cardsContainer.innerHTML = '<p>لا توجد سيارات مسجلة حالياً.</p>';
        }
    });
}

// 5. Render Card UI
function renderCard(car) {
    const licenseStatus = getStatusClass(car.licenseExpiry);
    const insuranceStatus = getStatusClass(car.insuranceExpiry);
    let cardStatus = 'status-green';
    if (licenseStatus === 'status-red' || insuranceStatus === 'status-red') cardStatus = 'status-red';
    else if (licenseStatus === 'status-yellow' || insuranceStatus === 'status-yellow') cardStatus = 'status-yellow';

    const cardEl = document.createElement('div');
    cardEl.className = `card ${cardStatus}`;
    
    cardEl.innerHTML = `
        <div class="card-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div>
                <div class="card-title">${car.id}</div>
                <div class="plate-design">
                    <span class="plate-number">${car.plateNumber}</span>
                    <span class="plate-code">| ${car.plateCode}</span>
                </div>
            </div>
            <div>
                <span style="font-weight:bold;">${car.owner}</span><br>
                <small>السائق: ${car.currentDriverId || 'غير معين'}</small>
            </div>
        </div>
        <div class="card-body">
            <p><strong>النوع:</strong> ${car.type} | <strong>السنة:</strong> ${car.year}</p>
            <p><strong>رقم القاعدة:</strong> ${car.vin}</p>
            <p><strong>انتهاء الترخيص:</strong> ${car.licenseExpiry} <span style="color:var(--${cardStatus === 'status-red' ? 'red' : cardStatus === 'status-yellow' ? 'yellow' : 'green'})">●</span></p>
            <p><strong>انتهاء التأمين:</strong> ${car.insuranceExpiry} <span style="color:var(--${cardStatus === 'status-red' ? 'red' : cardStatus === 'status-yellow' ? 'yellow' : 'green'})">●</span></p>
            ${car.notes ? `<p><strong>ملاحظات:</strong> ${car.notes}</p>` : ''}
            ${car.violations ? `<p style="color:red;"><strong>مخالفات:</strong> ${car.violations}</p>` : ''}
            <div class="card-actions">
                <button class="btn-action edit-btn" style="background:var(--primary-dark);">تعديل</button>
                <button class="btn-action delete-btn" style="background:var(--red);">حذف</button>
            </div>
        </div>
    `;
    
    // Attach event listeners for buttons inside the card
    cardEl.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card collapse/expand
        openModal(car);
    });
    cardEl.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCar(car.id);
    });

    cardsContainer.appendChild(cardEl);
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => console.log('SW failed', err));
  });
}