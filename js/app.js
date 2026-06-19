import { listenToAuthChanges, logoutUser } from "./auth.js";
import { fetchUsers, updateDashboardUI } from "./ui.js";

const appContainer = document.getElementById('app');

listenToAuthChanges(async (state) => {
  if (state.user) {
    renderDashboard();
  } else {
    renderLogin();
  }
});

async function renderDashboard() {
  appContainer.innerHTML = `
    <div class="navbar">...</div>
    <main class="main-panel">
      <div id="usersList"></div>
      <button id="loadMoreBtn">تحميل المزيد</button>
    </main>
  `;

  const users = await fetchUsers(false);
  updateDashboardUI('usersList', users);

  document.getElementById('loadMoreBtn').addEventListener('click', async () => {
    const nextUsers = await fetchUsers(true);
    updateDashboardUI('usersList', nextUsers, true);
  });
}

function renderLogin() {
  appContainer.innerHTML = `
    <div class="login-container">
      <input type="email" id="email" placeholder="Email">
      <input type="password" id="pass" placeholder="Password">
      <button id="loginBtn">دخول</button>
    </div>
  `;
}
