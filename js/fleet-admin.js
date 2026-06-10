/* ==========================================================================
   نظام إدارة الأسطول والسائقين - إدارة المستخدمين والمشرفين (الإصدار النهائي)
   ========================================================================== */

async function loadAllUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    if (!window.AuthEngine?.isAdmin()) {
        container.innerHTML = '<div class="error">❌ غير مصرح لك، هذه الصفحة للمدير فقط</div>';
        return;
    }
    container.innerHTML = '<div class="loading">جاري تحميل المستخدمين...</div>';
    try {
        const snapshot = await window.FirebaseGet(window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), "users"));
        if (!snapshot.exists()) {
            container.innerHTML = '<div class="empty">لا يوجد مستخدمين مسجلين</div>';
            return;
        }
        container.innerHTML = '';
        snapshot.forEach(child => renderUserCard(container, child.key, child.val()));
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="error">خطأ في التحميل</div>';
    }
}

function renderUserCard(container, uid, user) {
    const lang = window.Core?.getLang() || 'ar';
    const currentUserEmail = localStorage.getItem('userEmail');
    const isCurrentUser = user.email === currentUserEmail;
    const isSuperAdmin = user.email === 'saad323m@gmail.com';
    
    const roleSelect = `
        <select class="role-select" data-uid="${uid}" onchange="window.Admin.changeUserRole('${uid}', this.value)">
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>${lang === 'ar' ? '👤 مستخدم' : '👤 User'}</option>
            <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>${lang === 'ar' ? '⭐ مشرف' : '⭐ Supervisor'}</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''} ${isSuperAdmin ? 'disabled' : ''}>${lang === 'ar' ? '👑 مدير' : '👑 Admin'}</option>
        </select>
    `;
    const statusSelect = `
        <select class="status-select" data-uid="${uid}" onchange="window.Admin.changeUserStatus('${uid}', this.value)">
            <option value="active" ${user.status !== 'blocked' ? 'selected' : ''}>${lang === 'ar' ? '🟢 نشط' : '🟢 Active'}</option>
            <option value="blocked" ${user.status === 'blocked' ? 'selected' : ''}>${lang === 'ar' ? '🔴 محظور' : '🔴 Blocked'}</option>
        </select>
    `;
    const html = `
        <div class="user-card" data-uid="${uid}">
            <div class="user-info">
                <div class="user-email"><strong>${user.email}</strong> ${isCurrentUser ? '<span class="badge-current">(أنت)</span>' : ''}</div>
                <div class="user-details"><span>${user.name || user.email.split('@')[0]}</span><span>${lang === 'ar' ? 'تاريخ التسجيل' : 'Joined'}: ${user.createdAt?.split('T')[0] || 'N/A'}</span></div>
            </div>
            <div class="user-actions">
                <div class="role-field"><label>${lang === 'ar' ? 'الصلاحية' : 'Role'}:</label> ${roleSelect}</div>
                <div class="status-field"><label>${lang === 'ar' ? 'الحالة' : 'Status'}:</label> ${statusSelect}</div>
                ${!isCurrentUser && !isSuperAdmin ? `<button class="btn-delete-user" onclick="window.Admin.deleteUser('${uid}')">🗑</button>` : ''}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

async function changeUserRole(uid, newRole) {
    const lang = window.Core?.getLang() || 'ar';
    if (!confirm(lang === 'ar' ? `تغيير صلاحية المستخدم إلى ${newRole === 'admin' ? 'مدير' : newRole === 'supervisor' ? 'مشرف' : 'مستخدم'}؟` : `Change user role to ${newRole}?`)) {
        const snapshot = await window.FirebaseGet(window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), `users/${uid}/role`));
        if (snapshot.exists()) {
            const select = document.querySelector(`.role-select[data-uid="${uid}"]`);
            if (select) select.value = snapshot.val();
        }
        return;
    }
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `users/${uid}/role`), newRole);
        if (window.Logger) window.Logger.writeLog({ action: `role_changed to ${newRole}`, targetUid: uid });
        window.Core?.showNotification?.(lang === 'ar' ? '✓ تم تغيير الصلاحية' : '✓ Role changed');
        if (uid === localStorage.getItem('userUid')) {
            localStorage.setItem('userRole', newRole);
            window.Core?.updateUIBasedOnRole?.(newRole);
        }
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في تغيير الصلاحية' : 'Error changing role'); }
}

async function changeUserStatus(uid, newStatus) {
    const lang = window.Core?.getLang() || 'ar';
    if (!confirm(lang === 'ar' ? `${newStatus === 'blocked' ? 'حظر' : 'تنشيط'} هذا المستخدم؟` : `${newStatus === 'blocked' ? 'Block' : 'Activate'} this user?`)) {
        const snapshot = await window.FirebaseGet(window.FirebaseChild(window.FirebaseRef(window.FirebaseDB), `users/${uid}/status`));
        if (snapshot.exists()) {
            const select = document.querySelector(`.status-select[data-uid="${uid}"]`);
            if (select) select.value = snapshot.val();
        }
        return;
    }
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `users/${uid}/status`), newStatus);
        window.Logger?.writeLog({ action: `status_changed to ${newStatus}`, targetUid: uid });
        window.Core?.showNotification?.(lang === 'ar' ? `✓ تم ${newStatus === 'blocked' ? 'حظر' : 'تنشيط'} المستخدم` : `✓ User ${newStatus === 'blocked' ? 'blocked' : 'activated'}`);
        if (newStatus === 'blocked' && uid === localStorage.getItem('userUid')) {
            await window.FirebaseSignOut(window.FirebaseAuth);
            window.location.href = "login.html";
        }
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في تغيير الحالة' : 'Error changing status'); }
}

async function deleteUser(uid) {
    const lang = window.Core?.getLang() || 'ar';
    if (!confirm(lang === 'ar' ? '⚠️ حذف المستخدم نهائياً؟ لا يمكن التراجع.' : '⚠️ Delete user permanently?')) return;
    try {
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `users/${uid}`), null);
        window.Logger?.writeLog({ action: 'user_deleted', targetUid: uid });
        window.Core?.showNotification?.(lang === 'ar' ? '✓ تم حذف المستخدم' : '✓ User deleted');
        await loadAllUsers();
    } catch (err) { console.error(err); alert(lang === 'ar' ? 'خطأ في الحذف' : 'Delete error'); }
}

async function showAddUserModal() {
    const lang = window.Core?.getLang() || 'ar';
    if (!window.AuthEngine?.isAdmin()) {
        alert(lang === 'ar' ? 'غير مصرح لك' : 'Not authorized');
        return;
    }
    const modal = document.createElement('div');
    modal.id = 'userModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2>${lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</h2>
            <form id="addUserForm">
                <div class="form-group"><label>${lang === 'ar' ? 'البريد الإلكتروني *' : 'Email *'}</label><input type="email" id="newUserEmail" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'كلمة المرور *' : 'Password *'}</label><input type="password" id="newUserPassword" required></div>
                <div class="form-group"><label>${lang === 'ar' ? 'الاسم (اختياري)' : 'Name (optional)'}</label><input type="text" id="newUserName"></div>
                <div class="form-group"><label>${lang === 'ar' ? 'الصلاحية *' : 'Role *'}</label>
                    <select id="newUserRole">
                        <option value="user">${lang === 'ar' ? '👤 مستخدم (عرض فقط)' : '👤 User (view only)'}</option>
                        <option value="supervisor">${lang === 'ar' ? '⭐ مشرف (إضافة فقط)' : '⭐ Supervisor (add only)'}</option>
                    </select>
                </div>
                <button type="submit" class="btn-submit">${lang === 'ar' ? 'إنشاء حساب' : 'Create Account'}</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('addUserForm').onsubmit = async (e) => {
        e.preventDefault();
        await createNewUser();
    };
}

async function createNewUser() {
    const lang = window.Core?.getLang() || 'ar';
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;
    if (!email || !password) {
        alert(lang === 'ar' ? 'البريد وكلمة المرور مطلوبان' : 'Email and password required');
        return;
    }
    try {
        const userCred = await window.FirebaseCreateUser(window.FirebaseAuth, email, password);
        await window.FirebaseSet(window.FirebaseRef(window.FirebaseDB, `users/${userCred.user.uid}`), {
            email, role, status: "active", name: name || email.split('@')[0],
            createdBy: localStorage.getItem('userEmail'), createdAt: new Date().toISOString()
        });
        document.getElementById('userModal')?.remove();
        await loadAllUsers();
        window.Core?.showNotification?.(lang === 'ar' ? '✓ تم إنشاء الحساب' : '✓ Account created');
    } catch (err) {
        console.error(err);
        let msg = lang === 'ar' ? 'خطأ في الإنشاء' : 'Creation error';
        if (err.code === 'auth/email-already-in-use') msg = lang === 'ar' ? 'البريد مستخدم' : 'Email in use';
        alert(msg);
    }
}

window.Admin = { loadAllUsers, changeUserRole, changeUserStatus, deleteUser, showAddUserModal };
window.loadAllUsers = loadAllUsers;
window.changeUserRole = changeUserRole;
window.changeUserStatus = changeUserStatus;
window.deleteUser = deleteUser;
window.showAddUserModal = showAddUserModal;
