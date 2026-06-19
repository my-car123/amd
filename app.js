// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBHHGY_gVpm3NlXThqsC6ojTL9Je4xQ9w",
  authDomain: "car-moving-8b59e.firebaseapp.com",
  databaseURL: "https://car-moving-8b59e-default-rtdb.firebaseio.com",
  projectId: "car-moving-8b59e",
  storageBucket: "car-moving-8b59e.firebasestorage.app",
  messagingSenderId: "332747318494",
  appId: "1:332747318494:web:d5d61cd53f322a182f0e4f"
};

// Initialize Firebase
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
const sidebarNav = document.getElementById('sidebarNav');
const mainPanel = document.getElementById('mainPanel');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;
let currentUserDoc = null;

// Auth state observer
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
      // No profile found, log out
      await signOut(auth);
      showLoginError('Account not configured properly.');
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
  renderSidebar();
  showMyProfile();
}

function showLoginError(msg) {
  loginError.textContent = msg;
}

// Login handler
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

// Sidebar rendering based on role
function renderSidebar() {
  const role = currentUserDoc.role;
  let html = '';
  html += `<button class="nav-btn active" data-view="profile">👤 My Membership</button>`;
  if (role === 'admin' || role === 'supervisor') {
    html += `<button class="nav-btn" data-view="users">👥 User Management</button>`;
  }
  sidebarNav.innerHTML = html;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const view = this.dataset.view;
      if (view === 'profile') showMyProfile();
      else if (view === 'users') showUserManagement();
    });
  });
}

// My Profile view (folded card)
function showMyProfile() {
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

// User Management view (for admin/supervisor)
function showUserManagement() {
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
    <div class="card" id="usersListContainer">
      <h3>Existing Users</h3>
      <table class="users-table" id="usersTable">
        <thead><tr><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  document.getElementById('addUserBtn').addEventListener('click', addNewUser);
  loadUsersList();
}

async function addNewUser() {
  const email = document.getElementById('newEmail').value.trim();
  const password = document.getElementById('newPassword').value;
  const username = document.getElementById('newUsername').value.trim();
  const phone = document.getElementById('newPhone').value.trim();
  const newRole = document.getElementById('newRole').value;

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
    document.getElementById('newEmail').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newUsername').value = '';
    document.getElementById('newPhone').value = '';
  } catch (e) {
    alert('Error: ' + e.message.replace('Firebase: ', ''));
  }
}

function loadUsersList() {
  const usersTableBody = document.querySelector('#usersTable tbody');
  const role = currentUserDoc.role;
  let q;
  if (role === 'admin') {
    q = collection(db, 'users');
  } else {
    q = query(collection(db, 'users'), where('createdBy', '==', currentUser.uid));
  }

  onSnapshot(q, (snapshot) => {
    usersTableBody.innerHTML = '';
    snapshot.forEach(docSnap => {
      const user = docSnap.data();
      const uid = docSnap.id;
      if (uid === currentUser.uid) return;

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

    document.querySelectorAll('.editBtn').forEach(btn => {
      btn.addEventListener('click', (e) => editUser(e.target.dataset.uid));
    });
    document.querySelectorAll('.suspendBtn').forEach(btn => {
      btn.addEventListener('click', (e) => toggleSuspend(e.target.dataset.uid, e.target.dataset.status));
    });
    document.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteUser(e.target.dataset.uid));
    });
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
    alert('User updated');
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
    alert('User deleted');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}