import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

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
const db = getFirestore(app);

// DOM elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const mainPanel = document.getElementById('mainPanel');
const logoutBtn = document.getElementById('logoutBtn');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
const userMgmtBtn = document.getElementById('userMgmtBtn');

let currentUser = null;
let currentUserDoc = null;
let currentView = 'profile'; // default
let unsubUsers = null; // to unsubscribe from users snapshot

// Auth observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      currentUserDoc = userSnap.data();
      if (currentUserDoc.status === 'suspended') {
        await signOut(auth);
        showLoginError('Your account is suspended.');
        return;
      }
      showDashboard();
    } else {
      await signOut(auth);
      showLoginError('Account not configured.');
    }
  } else {
    currentUser = null;
    currentUserDoc = null;
    showLogin();
  }
});

function showLogin() {
  loginSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  updateNavVisibility();
  // Default view
  showMyProfile();
}

function showLoginError(msg) {
  loginError.textContent = msg;
}

// Login
loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) {
    showLoginError('Enter email and password');
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    showLoginError(e.message.replace('Firebase: ', ''));
  }
});

// Logout
logoutBtn.addEventListener('click', () => signOut(auth));

// Hamburger toggle
hamburgerBtn.addEventListener('click', () => {
  navMenu.classList.toggle('open');
});

// Navigation clicks (delegation)
navMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-link');
  if (!btn) return;
  const view = btn.dataset.view;
  if (view === 'profile') {
    setActiveNav('profile');
    showMyProfile();
  } else if (view === 'users') {
    setActiveNav('users');
    showUserManagement();
  }
  // Close mobile menu
  navMenu.classList.remove('open');
});

function setActiveNav(view) {
  currentView = view;
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  if (view === 'profile') {
    document.querySelector('.nav-link[data-view="profile"]').classList.add('active');
  } else if (view === 'users') {
    document.querySelector('.nav-link[data-view="users"]').classList.add('active');
  }
}

function updateNavVisibility() {
  if (currentUserDoc && (currentUserDoc.role === 'admin' || currentUserDoc.role === 'supervisor')) {
    userMgmtBtn.classList.remove('hidden');
  } else {
    userMgmtBtn.classList.add('hidden');
  }
}

// Profile view
function showMyProfile() {
  // Clear any users listener
  if (unsubUsers) {
    unsubUsers();
    unsubUsers = null;
  }

  const data = currentUserDoc;
  mainPanel.innerHTML = `
    <h2 style="color:#1e3c72; margin-bottom:20px;">My Membership Card</h2>
    <div class="flip-card" id="flipCard">
      <div class="flip-card-inner" id="flipInner">
        <div class="flip-card-front">
          <p style="font-size:20px; font-weight:600;">${data.username}</p>
          <p>📧 ${data.email}</p>
          <p>📞 ${data.phone}</p>
          <p>🔰 ${data.role.toUpperCase()}</p>
          <p style="margin-top:10px;"><span class="badge badge-${data.status === 'active' ? 'active' : 'suspended'}">${data.status}</span></p>
          <small style="color:#666;">Click to flip</small>
        </div>
        <div class="flip-card-back">
          <p><strong>${data.username}</strong></p>
          <p>Member since: ${new Date().toLocaleDateString('en-AE', { timeZone: 'Asia/Dubai' })}</p>
          <p>UAE Time: ${new Date().toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai' })}</p>
        </div>
      </div>
    </div>
  `;
  document.getElementById('flipCard').addEventListener('click', function() {
    document.getElementById('flipInner').classList.toggle('flipped');
  });
}

// User management view
function showUserManagement() {
  // Clear previous listener
  if (unsubUsers) {
    unsubUsers();
    unsubUsers = null;
  }

  const role = currentUserDoc.role;
  mainPanel.innerHTML = `
    <h2 style="color:#1e3c72;">User Management</h2>
    <div class="card">
      <h3>Add New ${role === 'admin' ? 'Supervisor / User' : 'User'}</h3>
      <div class="add-user-form" id="addUserForm">
        <input type="email" id="newEmail" placeholder="Email" required>
        <input type="password" id="newPassword" placeholder="Password" required>
        <input type="text" id="newUsername" placeholder="Username" required>
        <input type="tel" id="newPhone" placeholder="Phone (10 digits, starts with 0)" pattern="0[0-9]{9}" required>
        ${role === 'admin' ? '<select id="newRole"><option value="supervisor">Supervisor</option><option value="user">User</option></select>' : '<input type="hidden" id="newRole" value="user">'}
        <button id="addUserBtn">Add</button>
      </div>
    </div>
    <div class="card">
      <h3>Existing Users</h3>
      <table class="users-table" id="usersTable">
        <thead><tr><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  // Add event listener for Add button
  document.getElementById('addUserBtn').addEventListener('click', addNewUser);

  // Load users
  loadUsersList();
}

async function addNewUser() {
  const newEmailEl = document.getElementById('newEmail');
  const newPasswordEl = document.getElementById('newPassword');
  const newUsernameEl = document.getElementById('newUsername');
  const newPhoneEl = document.getElementById('newPhone');
  const newRoleEl = document.getElementById('newRole');

  // Ensure elements exist
  if (!newEmailEl || !newPasswordEl || !newUsernameEl || !newPhoneEl || !newRoleEl) {
    alert('Form not available. Please refresh the management view.');
    return;
  }

  const email = newEmailEl.value.trim();
  const password = newPasswordEl.value;
  const username = newUsernameEl.value.trim();
  const phone = newPhoneEl.value.trim();
  const newRole = newRoleEl.value;

  if (!email || !password || !username || !phone) {
    alert('All fields are required');
    return;
  }
  if (!/^0[0-9]{9}$/.test(phone)) {
    alert('Phone must be 10 digits starting with 0');
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      email,
      username,
      phone,
      role: newRole,
      status: 'active',
      createdBy: currentUser.uid,
      createdAt: new Date()
    });
    alert('User added successfully');
    // Clear form safely
    newEmailEl.value = '';
    newPasswordEl.value = '';
    newUsernameEl.value = '';
    newPhoneEl.value = '';
  } catch (e) {
    alert('Error: ' + e.message.replace('Firebase: ', ''));
  }
}

function loadUsersList() {
  const usersTableBody = document.querySelector('#usersTable tbody');
  if (!usersTableBody) return;

  const role = currentUserDoc.role;
  let q;
  if (role === 'admin') {
    q = collection(db, 'users');
  } else {
    q = query(collection(db, 'users'), where('createdBy', '==', currentUser.uid));
  }

  // Unsubscribe previous if any
  if (unsubUsers) unsubUsers();
  unsubUsers = onSnapshot(q, (snapshot) => {
    usersTableBody.innerHTML = '';
    snapshot.forEach(docSnap => {
      const user = docSnap.data();
      const uid = docSnap.id;
      if (uid === currentUser.uid) return; // skip self

      const canEdit = (role === 'admin' && user.role !== 'admin') || (role === 'supervisor' && user.role === 'user');
      const canDelete = canEdit;
      const canSuspend = canEdit;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td><span class="badge badge-${user.role}">${user.role}</span></td>
        <td><span class="badge badge-${user.status}">${user.status}</span></td>
        <td class="action-buttons">
          ${canEdit ? `<button class="editBtn" data-uid="${uid}">Edit</button>` : ''}
          ${canSuspend ? `<button class="suspendBtn" data-uid="${uid}" data-status="${user.status}">${user.status === 'active' ? 'Suspend' : 'Activate'}</button>` : ''}
          ${canDelete ? `<button class="deleteBtn" data-uid="${uid}">Delete</button>` : ''}
        </td>
      `;
      usersTableBody.appendChild(row);
    });

    // Attach events
    document.querySelectorAll('.editBtn').forEach(btn => {
      btn.onclick = () => editUser(btn.dataset.uid);
    });
    document.querySelectorAll('.suspendBtn').forEach(btn => {
      btn.onclick = () => toggleSuspend(btn.dataset.uid, btn.dataset.status);
    });
    document.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.onclick = () => deleteUser(btn.dataset.uid);
    });
  }, (error) => {
    console.error('Users listener error:', error);
  });
}

async function editUser(uid) {
  const newUsername = prompt('New username:');
  if (!newUsername) return;
  const newPhone = prompt('New phone (10 digits, 0...):');
  if (!newPhone || !/^0[0-9]{9}$/.test(newPhone)) {
    alert('Invalid phone');
    return;
  }
  try {
    await updateDoc(doc(db, 'users', uid), { username: newUsername, phone: newPhone });
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function toggleSuspend(uid, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  try {
    await updateDoc(doc(db, 'users', uid), { status: newStatus });
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function deleteUser(uid) {
  if (!confirm('Delete this user?')) return;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (e) {
    alert('Error: ' + e.message);
  }
}