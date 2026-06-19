import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, query, limit, getDocs, startAfter, orderBy } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

let lastVisible = null;
const loginSec = document.getElementById('loginSection');
const dashSec = document.getElementById('dashboardSection');

onAuthStateChanged(auth, user => {
    if (user) {
        loginSec.classList.add('hidden');
        dashSec.classList.remove('hidden');
        loadUsers();
    } else {
        loginSec.classList.remove('hidden');
        dashSec.classList.add('hidden');
    }
});

async function loadUsers() {
    const q = query(collection(db, "users"), orderBy("name"), limit(10));
    const snap = await getDocs(q);
    lastVisible = snap.docs[snap.docs.length - 1];
    displayUsers(snap);
}

function displayUsers(snap) {
    const list = document.getElementById('usersList');
    snap.forEach(doc => {
        const d = doc.data();
        list.innerHTML += `<div class="card"><h3>${d.name}</h3><p>${d.email}</p></div>`;
    });
}

document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    await signInWithEmailAndPassword(auth, email, pass);
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
