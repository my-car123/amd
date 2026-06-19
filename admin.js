import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
const db = getFirestore();

// إضافة مستخدم
document.getElementById('addUserBtn').addEventListener('click', async () => {
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    await addDoc(collection(db, "users"), { name, phone, role: document.getElementById('role').value, status: "Active" });
    alert("Member Added!");
});

// عرض المستخدمين في بطاقات مطوية
onSnapshot(collection(db, "users"), (snapshot) => {
    const container = document.getElementById('membersList');
    container.innerHTML = "";
    snapshot.forEach((doc) => {
        const u = doc.data();
        container.innerHTML += `
            <div class="accordion">
                <div class="accordion-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
                    <span>${u.name}</span> <span>${u.role}</span>
                </div>
                <div class="accordion-content">
                    <p>Phone: ${u.phone}</p>
                    <p>Status: ${u.status}</p>
                    <button class="delete">Remove</button>
                </div>
            </div>`;
    });
});
