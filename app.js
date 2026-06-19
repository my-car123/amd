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
let unsubUsers = null;

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

// Navigation
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
  navMenu.classList.remove('open');
});

function setActiveNav(view) {
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-link[data-view="${view}"]`);
  if (activeBtn) activeBtn.classList.add('active');
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
        <input type="password" id="adminPasswordConfirm" placeholder="Your (admin) password to confirm" required>
        <button id="addUserBtn">Add</button>
      </div>
    </div>
    <div class="card">
      <h3>Existing Users</h3>
      <div class="users-table-wrap">
        <table class="users-table" id="usersTable">
          <thead><tr><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addUserBtn').addEventListener('click', addNewUser);
  loadUsersList();
}

async function addNewUser() {
  const newEmail = document.getElementById('newEmail').value.trim();
  const newPassword = document.getElementById('newPassword').value;
  const newUsername = document.getElementById('newUsername').value.trim();
  const newPhone = document.getElementById('newPhone').value.trim();
  const newRole = document.getElementById('newRole').value;
  const adminPass = document.getElementById('adminPasswordConfirm').value;

  if (!newEmail || !newPassword || !newUsername || !newPhone || !adminPass) {
    alert('All fields are required, including your admin password.');
    return;
  }
  if (!/^0[0-9]{9}$/.test(newPhone)) {
    alert('Phone must be 10 digits starting with 0');
    return;
  }

  try {
    // إنشاء حساب المستخدم الجديد (سيتم تسجيل دخوله تلقائياً)
    const userCred = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
    const newUid = userCred.user.uid;

    // حفظ بياناته في Firestore
    await setDoc(doc(db, 'users', newUid), {
      email: newEmail,
      username: newUsername,
      phone: newPhone,
      role: newRole,
      status: 'active',
      createdBy: currentUser.uid,
      createdAt: new Date()
    });

    // الآن الخروج من حساب المستخدم الجديد والعودة إلى حساب المدير
    await signOut(auth);
    await signInWithEmailAndPassword(auth, currentUser.email, adminPass);
    alert('User added successfully. You are logged back in as admin.');

    // إعادة عرض صفحة إدارة المستخدمين (لأن محتوى الصفحة قد اختفى بعد الخروج/الدخول)
    showUserManagement();
  } catch (e) {
    alert('Error: ' + e.message.replace('Firebase: ', ''));
    // محاولة العودة إلى المدير إذا حدث خطأ بعد إنشاء المستخدم
    try {
      if (auth.currentUser && auth.currentUser.uid !== currentUser.uid) {
        await signOut(auth);
        await signInWithEmailAndPassword(auth, currentUser.email, adminPass);
        showUserManagement();
      }
    } catch (innerE) {
      // فشل العودة، سيبقى في حالة تسجيل الدخول الحالية
      console.error('Failed to restore admin session:', innerE);
    }
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
        <td class="cell-username">${user.username}</td>
        <td>${user.email}</td>
        <td class="cell-phone">${user.phone}</td>
        <td class="cell-role">${user.role}</td>
        <td><span class="badge badge-${user.status}">${user.status}</span></td>
        <td class="action-buttons">
          ${canEdit ? `<button class="editBtn" data-uid="${uid}">Edit</button>` : ''}
          ${canSuspend ? `<button class="suspendBtn" data-uid="${uid}" data-status="${user.status}">${user.status === 'active' ? 'Suspend' : 'Activate'}</button>` : ''}
          ${canDelete ? `<button class="deleteBtn" data-uid="${uid}">Delete</button>` : ''}
        </td>
      `;
      usersTableBody.appendChild(row);
    });

    attachRowEvents();
  });
}

function attachRowEvents() {
  document.querySelectorAll('.editBtn').forEach(btn => {
    btn.onclick = function(e) {
      const uid = this.dataset.uid;
      const row = this.closest('tr');
      enableRowEditing(row, uid);
    };
  });

  document.querySelectorAll('.suspendBtn').forEach(btn => {
    btn.onclick = function(e) {
      toggleSuspend(this.dataset.uid, this.dataset.status);
    };
  });

  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.onclick = function(e) {
      deleteUser(this.dataset.uid);
    };
  });
}

function enableRowEditing(row, uid) {
  const cells = row.querySelectorAll('td');
  const usernameCell = row.querySelector('.cell-username');
  const phoneCell = row.querySelector('.cell-phone');
  const roleCell = row.querySelector('.cell-role');
  const actionsCell = row.querySelector('.action-buttons');

  const oldUsername = usernameCell.innerText;
  const oldPhone = phoneCell.innerText;
  const oldRole = roleCell.innerText;

  usernameCell.innerHTML = `<input type="text" value="${oldUsername}" class="edit-username" style="width:100%">`;
  phoneCell.innerHTML = `<input type="text" value="${oldPhone}" class="edit-phone" style="width:100%" pattern="0[0-9]{9}">`;

  // Role dropdown
  let roleOptions = '';
  if (currentUserDoc.role === 'admin') {
    roleOptions = `<select class="edit-role">
      <option value="supervisor" ${oldRole === 'supervisor' ? 'selected' : ''}>Supervisor</option>
      <option value="user" ${oldRole === 'user' ? 'selected' : ''}>User</option>
    </select>`;
  } else if (currentUserDoc.role === 'supervisor') {
    // can only have user role
    roleOptions = `<select class="edit-role">
      <option value="user" selected>User</option>
    </select>`;
  }
  roleCell.innerHTML = roleOptions;

  actionsCell.innerHTML = `
    <button class="saveEditBtn" data-uid="${uid}">Save</button>
    <button class="cancelEditBtn">Cancel</button>
  `;

  // إخفاء الأزرار الأخرى مؤقتاً (suspend, delete) عن طريق عدم إدراجها

  document.querySelector('.saveEditBtn').addEventListener('click', async () => {
    const newUsername = document.querySelector('.edit-username').value.trim();
    const newPhone = document.querySelector('.edit-phone').value.trim();
    const newRole = document.querySelector('.edit-role').value;

    if (!newUsername || !newPhone) {
      alert('Username and phone are required.');
      return;
    }
    if (!/^0[0-9]{9}$/.test(newPhone)) {
      alert('Phone must be 10 digits starting with 0');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), {
        username: newUsername,
        phone: newPhone,
        role: newRole
      });
      // No need to reload manually, onSnapshot will update
    } catch (e) {
      alert('Error updating: ' + e.message);
    }
  });

  document.querySelector('.cancelEditBtn').addEventListener('click', () => {
    // just revert back by letting onSnapshot update; we can force a refresh
    // But easier: just re-enable editing by recalling loadUsersList? Actually onSnapshot will automatically replace the row.
    // So we just need to let the snapshot run again; it will overwrite.
    // We can force by temporarily unsub/sub, but snapshot will update if data unchanged? If cancelled without save, we want old data.
    // We'll manually restore the row with old data.
    usernameCell.innerText = oldUsername;
    phoneCell.innerText = oldPhone;
    roleCell.innerText = oldRole;
    actionsCell.innerHTML = `
      <button class="editBtn" data-uid="${uid}">Edit</button>
      <button class="suspendBtn" data-uid="${uid}" data-status="${row.querySelector('.badge')?.innerText}">${row.querySelector('.badge')?.innerText === 'active' ? 'Suspend' : 'Activate'}</button>
      <button class="deleteBtn" data-uid="${uid}">Delete</button>
    `;
    attachRowEvents(); // re-attach
  });
}

async function editUser(uid) {
  // This function is no longer used directly; kept for compatibility if needed.
  // We'll implement inline editing instead.
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