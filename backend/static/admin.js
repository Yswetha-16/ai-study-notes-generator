const API = "";

// fixed: this page never sent the Authorization header before, so every
// /admin/* call was rejected as 401/403. It reuses the same token your
// main app already stores in localStorage after login.
const token = localStorage.getItem("token");

function authHeaders(extra = {}) {
    return token ? { ...extra, Authorization: "Bearer " + token } : extra;
}

function showAdminError(msg) {
    const el = document.getElementById("admin-error");
    if (el) el.textContent = msg;
}

// Guard: if there's no token at all, don't even try — send them to login.
if (!token) {
    showAdminError("❌ Not logged in. Redirecting to the app to log in...");
    setTimeout(() => { window.location.href = "/"; }, 1500);
}

// =====================
// LOAD STATS
// =====================
async function loadStats() {
    try {
        const response = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
        const data = await response.json();

        if (!response.ok) {
            showAdminError(`❌ /admin/stats failed (${response.status}): ${JSON.stringify(data)}`);
            return;
        }

        document.getElementById("totalUsers").textContent = data.total_users;
        document.getElementById("blockedUsers").textContent = data.blocked_users;
        document.getElementById("activeUsers").textContent = data.active_users;
        document.getElementById("totalNotes").textContent = data.total_notes;

    } catch (error) {
        showAdminError("❌ /admin/stats crashed: " + error.message);
    }
}


// =====================
// LOAD USERS
// =====================
async function loadUsers() {
    try {
        const response = await fetch(`${API}/admin/users`, { headers: authHeaders() });
        const users = await response.json();

        if (!response.ok) {
            showAdminError(`❌ /admin/users failed (${response.status}): ${JSON.stringify(users)}`);
            return;
        }

        const table = document.getElementById("usersTable");
        table.innerHTML = "";

        if (!Array.isArray(users) || !users.length) {
            table.innerHTML = `<tr><td colspan="6">No users found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            table.innerHTML += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.is_admin}</td>
                <td>${user.is_blocked}</td>
                <td>
                    <button class="block" onclick="blockUser(${user.id})">Block</button>
                    <button class="unblock" onclick="unblockUser(${user.id})">Unblock</button>
                    <button class="delete" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
            `;
        });

    } catch (error) {
        showAdminError("❌ /admin/users crashed: " + error.message);
    }
}


// =====================
// BLOCK / UNBLOCK / DELETE USER
// =====================
async function blockUser(id) {
    await fetch(`${API}/admin/users/${id}/block`, { method: "PUT", headers: authHeaders() });
    loadUsers();
    loadStats();
}

async function unblockUser(id) {
    await fetch(`${API}/admin/users/${id}/unblock`, { method: "PUT", headers: authHeaders() });
    loadUsers();
    loadStats();
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
    loadUsers();
    loadStats();
}


// =====================
// LOAD NOTES
// =====================
async function loadNotes() {
    try {
        const response = await fetch(`${API}/admin/notes`, { headers: authHeaders() });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            showAdminError(`❌ /admin/notes failed (${response.status}): ${JSON.stringify(data)}`);
            return;
        }

        const notes = await response.json();
        const table = document.getElementById("notesTable");
        if (!table) return;

        table.innerHTML = "";

        if (!Array.isArray(notes) || !notes.length) {
            table.innerHTML = `<tr><td colspan="5">No notes found.</td></tr>`;
            return;
        }

        notes.forEach(note => {
            table.innerHTML += `
            <tr>
                <td>${note.id}</td>
                <td>${note.topic}</td>
                <td>${note.level}</td>
                <td>${note.created_at}</td>
                <td>
                    <button class="delete" onclick="deleteNote(${note.id})">Delete</button>
                </td>
            </tr>
            `;
        });

    } catch (error) {
        showAdminError("❌ /admin/notes crashed: " + error.message);
    }
}


// =====================
// DELETE NOTE (fixed: old code had a broken nested function that never ran)
// =====================
async function deleteNote(id) {
    await fetch(`${API}/admin/notes/${id}`, { method: "DELETE", headers: authHeaders() });
    loadNotes();
    loadStats();
}


// =====================
// LOGOUT
// =====================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "/";
}


// =====================
// SEARCH USER
// =====================
function searchUsers() {
    const input = document.getElementById("searchUser").value.toLowerCase();
    const rows = document.querySelectorAll("#usersTable tr");
    rows.forEach(row => {
        if (!row.cells || !row.cells[1]) return;
        const username = row.cells[1].textContent.toLowerCase();
        row.style.display = username.includes(input) ? "" : "none";
    });
}


// =====================
// START
// =====================
if (token) {
    loadStats();
    loadUsers();
    loadNotes();
}