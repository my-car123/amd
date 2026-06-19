import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
const db = getFirestore();

// إضافة عضو جديد
if(document.getElementById('addMemberBtn')) {
    document.getElementById('addMemberBtn').addEventListener('click', async () => {
        const name = document.getElementById('mName').value;
        const phone = document.getElementById('mPhone').value;
        if(phone.startsWith('0') && phone.length === 10) {
            await addDoc(collection(db, "users"), { name, phone, role: document.getElementById('mRole').value, status: "Active", custody: "None" });
            alert("Added Successfully");
        } else { alert("Invalid Phone Format"); }
    });
}

// عرض القائمة
onSnapshot(collection(db, "users"), (snapshot) => {
    const list = document.getElementById('membersList');
    list.innerHTML = "";
    snapshot.forEach(doc => {
        const u = doc.data();
        list.innerHTML += `
            <div class="accordion">
                <div class="accordion-header" onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'block' ? 'none' : 'block')">
                    <span>${u.name}</span><span>${u.role}</span>
                </div>
                <div class="accordion-content">
                    <p>Phone: ${u.phone}</p>
                    <p>Status: ${u.status}</p>
                    <p>Custody: ${u.custody}</p>
                </div>
            </div>`;
    });
});
