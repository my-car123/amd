import { db } from "./firebase-config.js";
import { collection, query, orderBy, limit, startAfter, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

let lastVisible = null;

export async function fetchUsers(isLoadMore = false) {
  const usersRef = collection(db, "users");
  let q = query(usersRef, orderBy("username"), limit(10));

  if (isLoadMore && lastVisible) {
    q = query(usersRef, orderBy("username"), startAfter(lastVisible), limit(10));
  }

  const snapshot = await getDocs(q);
  if (snapshot.docs.length > 0) {
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
  }

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function updateDashboardUI(containerId, users, append = false) {
  const container = document.getElementById(containerId);
  if (!append) container.innerHTML = '';
  
  users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'card user-card';
    card.innerHTML = `<h3>${user.username}</h3><p>Role: ${user.role}</p>`;
    container.appendChild(card);
  });
}
