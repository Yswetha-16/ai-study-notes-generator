const API = "https://ai-study-notes-generator-z86q.onrender.com";   

/* ── STATE ── */
let token = localStorage.getItem("token") || null;
let currentNotes = '', currentTopic = '';
let flashcards = [], fcIndex = 0, fcFlipped = false;
let mcqQuestions = [], mcqIndex = 0, mcqScore = 0, mcqAnswered = false;
let examNotes = '', examTopic = '';
let examPrepNotes = '', examPrepTopic = '';
let mindMapText = '', mindMapTopic = '';
let plannerText = '';

/* ── UTIL ── */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function authHeaders(extra = {}) {
  return token ? { ...extra, Authorization: "Bearer " + token } : extra;
}

/* ── THEME ── */
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
function toggleTheme() {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
}

/* ── TOAST ── */
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => (t.className = "toast"), 3000);
}

/* ── NAVIGATION ── */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const pageEl = document.getElementById('page-' + pageId);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
  const navEl = document.getElementById('nav-' + pageId);
  if (navEl) navEl.classList.add('active');

  // fixed: nav buttons only toggled visibility before — data never loaded
  if (pageId === 'admin') loadAdminDashboard();
  if (pageId === 'history') loadHistory();
}

/* ── AUTH UI ── */
function updateAuthUI() {
  const loginBtn = document.getElementById("nav-login");
  const regBtn = document.getElementById("nav-register");
  if (!loginBtn) return;
  if (token) {
    loginBtn.textContent = "Logout";
    loginBtn.onclick = () => {
      token = null;
      localStorage.removeItem("token");
      updateAuthUI();
      showPage("home");
      showToast("Logged out!");
    };
    if (regBtn) regBtn.style.display = "none";
  } else {
    loginBtn.textContent = "Login";
    loginBtn.onclick = () => showPage("login");
    if (regBtn) regBtn.style.display = "";
  }
}
function logout() {
  token = null;
  localStorage.removeItem("token");
  updateAuthUI();
  showPage("home");
  showToast("Logged out!");
}
updateAuthUI();

/* ── REGISTER / LOGIN ── */
async function handleRegister() {
  const username = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  if (!username || !email || !password) return showToast("Fill all fields", "error");
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.detail || "Register failed", "error");
    showToast("Account created! Please sign in.");
    showPage("login");
  } catch (e) { showToast("Server error", "error"); }
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) return showToast("Fill all fields", "error");
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.detail || "Login failed", "error");
    token = data.access_token;
    localStorage.setItem("token", token);
    updateAuthUI();
    // fixed: backend returns is_admin at top level, not nested in data.user
    if (data.is_admin) {
      showToast("Welcome Admin! 👑");
      showPage("admin");
    } else {
      showToast("Login successful!");
      showPage("generate");
    }
  } catch (e) { showToast("Server error", "error"); }
}

/* ── GENERATE NOTES ── */
async function generateNotes() {
  const topic = document.getElementById("topic-input").value.trim();
  const level = document.getElementById("level-select").value;
  const style = document.getElementById("style-select").value;
  if (!topic) return showToast("Enter a topic first", "error");
  currentTopic = topic;
  document.getElementById("gen-loader").classList.add("visible");
  document.getElementById("result-card").classList.remove("visible");
  try {
    const res = await fetch(`${API}/notes/generate?topic=${encodeURIComponent(topic)}&level=${level}&style=${style}`, {
      method: "POST",
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.detail || "Failed", "error");
    currentNotes = data.notes || data.content || "";
    document.getElementById("result-title").textContent = "Notes: " + topic.toUpperCase();
    document.getElementById("notes-body").textContent = currentNotes;
    document.getElementById("result-card").classList.add("visible");
    showToast(data.cached ? "Loaded from cache! ⚡" : "Notes generated! ✅");
  } catch (e) { showToast("Server error", "error"); }
  finally { document.getElementById("gen-loader").classList.remove("visible"); }
}
function copyNotes() {
  if (!currentNotes) return showToast("Nothing to copy", "error");
  navigator.clipboard.writeText(currentNotes);
  showToast("Copied!");
}
function exportPDF() {
  if (!currentNotes) return showToast("Generate notes first", "error");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>${escapeHtml(currentTopic)}</title>
  <style>body{font-family:Georgia,serif;max-width:750px;margin:40px auto;line-height:1.9;color:#111}
  h1{font-size:1.6rem}pre{white-space:pre-wrap;font-family:inherit}</style></head>
  <body><h1>${escapeHtml(currentTopic.toUpperCase())} — Study Notes</h1>
  <p style="color:#666">${new Date().toLocaleDateString()}</p>
  <pre>${escapeHtml(currentNotes)}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

/* ── HISTORY ── */
async function loadHistory() {
  const grid = document.getElementById("hist-grid");
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading...</p></div>';
  try {
    const res = await fetch(`${API}/notes/history`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No saved notes yet!</p></div>';
      return;
    }
    grid.innerHTML = data.map(n => `
      <div class="hist-item" onclick="viewNote(${n.id})">
        <div class="hist-info">
          <h4>${escapeHtml(n.topic.toUpperCase())}</h4>
          <span>${new Date(n.created_at).toLocaleDateString()} • ${escapeHtml(n.level)}</span>
        </div>
        <span class="hist-badge">View Notes</span>
      </div>
    `).join("");
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Error loading history.</p></div>';
  }
}
async function viewNote(id) {
  try {
    const res = await fetch(`${API}/notes/history/${id}`, { headers: authHeaders() });
    const n = await res.json();
    if (!res.ok) return showToast(n.detail || "Error loading note", "error");
    currentNotes = n.content; currentTopic = n.topic;
    document.getElementById("topic-input").value = n.topic;
    document.getElementById("result-title").textContent = "Notes: " + n.topic.toUpperCase();
    document.getElementById("notes-body").textContent = n.content;
    document.getElementById("result-card").classList.add("visible");
    showPage("generate");
  } catch (e) { showToast("Error loading note", "error"); }
}

/* ── FLASHCARDS ── */
async function generateFlashcards() {
  const topic = document.getElementById("flash-topic").value.trim();
  if (!topic) return showToast("Enter a topic first", "error");
  document.getElementById("flash-loader").classList.add("visible");
  document.getElementById("flashcard-area").classList.remove("visible");
  try {
    const res = await fetch(`${API}/notes/flashcards?topic=${encodeURIComponent(topic)}`, {
      method: "POST", headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);
    flashcards = data.flashcards || data;
  } catch (e) {
    flashcards = [
      { question: `What is ${topic}?`, answer: `${topic} is a fundamental concept in computer science.` },
      { question: `What are the key components of ${topic}?`, answer: "Key components include structure, organization, and efficient data management." },
      { question: `Give a real-world example of ${topic}.`, answer: `${topic} is used in banking systems and e-commerce platforms.` },
      { question: `Why is ${topic} important?`, answer: `${topic} improves performance and efficiency.` },
      { question: `What are the advantages of ${topic}?`, answer: "Better organization, faster access, and improved reliability." },
    ];
    showToast("Showing demo flashcards!");
  } finally { document.getElementById("flash-loader").classList.remove("visible"); }
  fcIndex = 0; fcFlipped = false;
  renderCard();
  document.getElementById("flashcard-area").classList.add("visible");
}
function renderCard() {
  fcFlipped = false;
  document.getElementById("fc-label").textContent = "Question";
  document.getElementById("fc-text").textContent = flashcards[fcIndex].question;
  document.getElementById("fc-counter").textContent = `${fcIndex + 1} / ${flashcards.length}`;
}
function flipCard() {
  fcFlipped = !fcFlipped;
  document.getElementById("fc-label").textContent = fcFlipped ? "Answer" : "Question";
  document.getElementById("fc-text").textContent = fcFlipped ? flashcards[fcIndex].answer : flashcards[fcIndex].question;
}
function nextCard() { if (fcIndex < flashcards.length - 1) { fcIndex++; renderCard(); } }
function prevCard() { if (fcIndex > 0) { fcIndex--; renderCard(); } }

/* ── ADMIN ── */
async function loadAdminDashboard() {
  const grid = document.getElementById("admin-users-grid");
  const notesGrid = document.getElementById("admin-notes-grid");
  if (grid) grid.innerHTML = "<p style='color:orange'>Loading users...</p>";
  if (notesGrid) notesGrid.innerHTML = "<p style='color:orange'>Loading notes...</p>";

  if (!token) {
    if (grid) grid.innerHTML = "<p style='color:red'>❌ Not logged in — no token found. Please log in again.</p>";
    return;
  }

  try {
    const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    const stats = await res.json();
    if (!res.ok) {
      if (grid) grid.innerHTML = `<p style='color:red'>❌ /admin/stats failed — status ${res.status}: ${JSON.stringify(stats)}</p>`;
      return;
    }
    document.getElementById("total-users").textContent = stats.total_users;
    document.getElementById("blocked-users").textContent = stats.blocked_users;
    document.getElementById("active-users").textContent = stats.active_users;
    document.getElementById("total-notes").textContent = stats.total_notes;
  } catch (e) {
    if (grid) grid.innerHTML = `<p style='color:red'>❌ /admin/stats crashed: ${e.message}</p>`;
    return;
  }

  try {
    const res = await fetch(`${API}/admin/users`, { headers: authHeaders() });
    const users = await res.json();
    if (!res.ok) {
      grid.innerHTML = `<p style='color:red'>❌ /admin/users failed — status ${res.status}: ${JSON.stringify(users)}</p>`;
      return;
    }
    if (!Array.isArray(users) || !users.length) {
      grid.innerHTML = "<p style='color:var(--muted)'>No users found (empty list returned — this is a real DB result, not an error).</p>";
    } else {
      grid.innerHTML = users.map(u => `
        <div class="admin-user-card">
          <div class="admin-user-info">
            <h4>${escapeHtml(u.username)}</h4>
            <span>${escapeHtml(u.email)}</span>
            <span class="admin-badge ${u.is_blocked ? 'blocked' : 'active'}">
              ${u.is_blocked ? '🚫 Blocked' : '✅ Active'}
            </span>
            ${u.is_admin ? '<span class="admin-badge admin">👑 Admin</span>' : ''}
          </div>
          <div class="admin-user-actions">
            ${!u.is_blocked
              ? `<button class="btn btn-danger" onclick="blockUser(${u.id})">Block</button>`
              : `<button class="btn btn-outline" onclick="unblockUser(${u.id})">Unblock</button>`}
            <button class="btn btn-outline" onclick="deleteUser(${u.id})">Delete</button>
            ${!u.is_admin ? `<button class="btn btn-primary" onclick="makeAdmin(${u.id})">Make Admin</button>` : ''}
          </div>
        </div>
      `).join("");
    }
  } catch (e) {
    grid.innerHTML = `<p style='color:red'>❌ /admin/users crashed: ${e.message}</p>`;
    return;
  }

  if (!notesGrid) return;
  try {
    const res = await fetch(`${API}/admin/notes`, { headers: authHeaders() });
    const notes = await res.json();
    if (!res.ok) {
      notesGrid.innerHTML = `<p style='color:red'>❌ /admin/notes failed — status ${res.status}: ${JSON.stringify(notes)}</p>`;
      return;
    }
    if (!Array.isArray(notes) || !notes.length) {
      notesGrid.innerHTML = "<p style='color:var(--muted)'>No notes found.</p>";
      return;
    }
    notesGrid.innerHTML = notes.map(n => `
      <div class="hist-item">
        <div class="hist-info">
          <h4>${escapeHtml((n.topic || "").toUpperCase())}</h4>
          <span>${escapeHtml(n.level || "")} • ${escapeHtml(n.created_at || "")}</span>
        </div>
        <button class="btn btn-outline" onclick="deleteNote(${n.id})">Delete</button>
      </div>
    `).join("");
  } catch (e) {
    notesGrid.innerHTML = `<p style='color:red'>❌ /admin/notes crashed: ${e.message}</p>`;
  }
}
async function blockUser(id) {
  const res = await fetch(`${API}/admin/users/${id}/block`, { method: "PUT", headers: authHeaders() });
  const data = await res.json(); showToast(data.message); loadAdminDashboard();
}
async function unblockUser(id) {
  const res = await fetch(`${API}/admin/users/${id}/unblock`, { method: "PUT", headers: authHeaders() });
  const data = await res.json(); showToast(data.message); loadAdminDashboard();
}
async function deleteUser(id) {
  if (!confirm("Delete this user?")) return;
  const res = await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json(); showToast(data.message); loadAdminDashboard();
}
async function makeAdmin(id) {
  const res = await fetch(`${API}/admin/users/${id}/make-admin`, { method: "PUT", headers: authHeaders() });
  const data = await res.json(); showToast(data.message); loadAdminDashboard();
}
async function deleteNote(id) {
  if (!confirm("Delete this note?")) return;
  const res = await fetch(`${API}/admin/notes/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await res.json(); showToast(data.message); loadAdminDashboard();
}

/* ── MCQ ── */
async function generateMCQ() {
  const topic = document.getElementById("mcq-topic").value.trim();
  const difficulty = document.getElementById("mcq-difficulty").value;
  const count = document.getElementById("mcq-count").value;
  if (!topic) return showToast("Enter a topic first", "error");
  document.getElementById("mcq-loader").classList.add("visible");
  document.getElementById("mcq-quiz-area").style.display = "none";
  document.getElementById("mcq-result").style.display = "none";
  try {
    const res = await fetch(`${API}/notes/mcq?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}&count=${count}`, {
      method: "POST", headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);
    mcqQuestions = data.questions || data;
  } catch (e) {
    mcqQuestions = [
      { question: `What is ${topic}?`, options: [`A system for managing ${topic}`, "Random data structure", "A programming language", "None of the above"], correct: 0, explanation: `${topic} is used for managing and organizing data.` },
      { question: `Which is a key feature of ${topic}?`, options: ["No storage", "Sequential only", "Structured organization", "Random only"], correct: 2, explanation: `Structured organization is key in ${topic}.` },
      { question: `Where is ${topic} used?`, options: ["Banking", "E-commerce", "Social media", "All of the above"], correct: 3, explanation: `${topic} is used across many industries.` },
      { question: `What is the advantage of ${topic}?`, options: ["Slow performance", "Efficient management", "No security", "High cost"], correct: 1, explanation: `${topic} provides efficient data management.` },
      { question: `Who uses ${topic}?`, options: ["Developers only", "Students only", "Businesses only", "Everyone"], correct: 3, explanation: `${topic} is used by everyone.` },
    ];
    showToast("Showing demo questions!");
  } finally { document.getElementById("mcq-loader").classList.remove("visible"); }
  mcqIndex = 0; mcqScore = 0; mcqAnswered = false;
  document.getElementById("mcq-quiz-area").style.display = "block";
  renderMCQ();
}
function renderMCQ() {
  const q = mcqQuestions[mcqIndex];
  const total = mcqQuestions.length;
  mcqAnswered = false;
  document.getElementById("mcq-q-label").textContent = `Question ${mcqIndex + 1}`;
  document.getElementById("mcq-question").textContent = q.question;
  document.getElementById("mcq-progress-text").textContent = `Question ${mcqIndex + 1} of ${total}`;
  document.getElementById("mcq-score-text").textContent = `Score: ${mcqScore}`;
  document.getElementById("mcq-progress-bar").style.width = `${(mcqIndex / total) * 100}%`;
  document.getElementById("mcq-explanation").style.display = "none";
  document.getElementById("mcq-next-btn").style.display = "none";
  const optionsDiv = document.getElementById("mcq-options");
  optionsDiv.innerHTML = q.options.map((opt, i) => `
    <button class="btn btn-outline" onclick="selectMCQ(${i})" id="mcq-opt-${i}"
      style="text-align:left;padding:0.85rem 1.2rem;font-size:0.9rem;border-radius:10px;width:100%;">
      <span style="font-weight:700;color:var(--accent);margin-right:0.75rem;">${["A", "B", "C", "D"][i]}.</span> ${escapeHtml(opt)}
    </button>
  `).join("");
}
function selectMCQ(selected) {
  if (mcqAnswered) return;
  mcqAnswered = true;
  const q = mcqQuestions[mcqIndex];
  q.options.forEach((_, i) => {
    const btn = document.getElementById(`mcq-opt-${i}`);
    if (i === q.correct) { btn.style.borderColor = "var(--success)"; btn.style.color = "var(--success)"; btn.style.background = "rgba(45,212,160,0.1)"; }
    else if (i === selected && selected !== q.correct) { btn.style.borderColor = "var(--danger)"; btn.style.color = "var(--danger)"; btn.style.background = "rgba(255,95,109,0.1)"; }
    btn.disabled = true;
  });
  const total = mcqQuestions.length;
  document.getElementById("mcq-progress-bar").style.width = `${((mcqIndex + 1) / total) * 100}%`;
  if (selected === q.correct) { mcqScore++; showToast("Correct! ✅"); }
  else showToast("Wrong! ❌");
  document.getElementById("mcq-explanation-text").textContent = q.explanation;
  document.getElementById("mcq-explanation").style.display = "block";
  if (mcqIndex < mcqQuestions.length - 1) document.getElementById("mcq-next-btn").style.display = "inline-block";
  else setTimeout(showMCQResult, 1500);
}
function nextMCQ() { mcqIndex++; renderMCQ(); }
function showMCQResult() {
  document.getElementById("mcq-quiz-area").style.display = "none";
  document.getElementById("mcq-result").style.display = "block";
  const total = mcqQuestions.length;
  const pct = Math.round((mcqScore / total) * 100);
  document.getElementById("mcq-result-score").textContent = `You scored ${mcqScore}/${total} (${pct}%)`;
  let emoji = "😔", title = "Keep Practicing!";
  if (pct >= 80) { emoji = "🎉"; title = "Excellent Work!"; }
  else if (pct >= 60) { emoji = "😊"; title = "Good Job!"; }
  else if (pct >= 40) { emoji = "🙂"; title = "Not Bad!"; }
  document.getElementById("mcq-result-emoji").textContent = emoji;
  document.getElementById("mcq-result-title").textContent = title;
}
function restartMCQ() {
  mcqIndex = 0; mcqScore = 0; mcqAnswered = false;
  document.getElementById("mcq-result").style.display = "none";
  document.getElementById("mcq-quiz-area").style.display = "block";
  renderMCQ();
}

/* ── ONE DAY BEFORE EXAM ── */
async function generateExamNotes() {
  const topic = document.getElementById('exam-topic').value.trim();
  const type = document.getElementById('exam-type').value;
  if (!topic) return showToast('Enter a topic first!', 'error');
  examTopic = topic;
  document.getElementById('exam-loader').classList.add('visible');
  document.getElementById('exam-result-card').classList.remove('visible');
  try {
    const res = await fetch(`${API}/notes/exam?topic=${encodeURIComponent(topic)}&type=${type}`, {
      method: 'POST', headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    examNotes = data.notes;
  } catch (e) {
    examNotes = `⚡ LAST MINUTE REVISION: ${topic.toUpperCase()}\n\nDemo fallback — backend /notes/exam not reachable.`;
    showToast('Showing demo revision notes!');
  } finally {
    document.getElementById('exam-loader').classList.remove('visible');
  }
  document.getElementById('exam-result-title').textContent = `Revision: ${topic.toUpperCase()}`;
  document.getElementById('exam-notes-body').textContent = examNotes;
  document.getElementById('exam-result-card').classList.add('visible');
  showToast('Revision notes ready! ⚡');
}
function copyExamNotes() {
  if (!examNotes) return showToast("Nothing to copy", "error");
  navigator.clipboard.writeText(examNotes);
  showToast("Copied!");
}
function exportExamPDF() {
  if (!examNotes) return showToast("Generate revision notes first", "error");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>${escapeHtml(examTopic)}</title></head>
  <body style="font-family:Georgia,serif;max-width:750px;margin:40px auto;line-height:1.9;">
  <h1>${escapeHtml(examTopic.toUpperCase())} — Revision</h1>
  <pre style="white-space:pre-wrap;">${escapeHtml(examNotes)}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

/* ── AI EXAM PREPARATION ── */
async function generateExamPreparation() {
  const topic = document.getElementById("exam-prep-topic").value.trim();
  const type = document.getElementById("exam-prep-type").value;
  const level = document.getElementById("exam-prep-level").value;
  if (!topic) return showToast("Enter a topic first!", "error");
  examPrepTopic = topic;
  document.getElementById("exam-prep-loader").classList.add("visible");
  document.getElementById("exam-prep-result-card").classList.remove("visible");
  try {
    const res = await fetch(
      `${API}/notes/exam-preparation?topic=${encodeURIComponent(topic)}&type=${type}&level=${level}`,
      { method: "POST", headers: authHeaders() }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    examPrepNotes = data.notes || data.content;
  } catch (e) {
    examPrepNotes = `🎓 AI EXAM PREPARATION: ${topic.toUpperCase()}\n\nDemo fallback — backend /notes/exam-preparation not reachable.`;
    showToast("Showing demo exam prep!");
  } finally {
    document.getElementById("exam-prep-loader").classList.remove("visible");
  }
  document.getElementById("exam-prep-title").textContent = "Exam Prep: " + topic.toUpperCase();
  document.getElementById("exam-prep-body").textContent = examPrepNotes;
  document.getElementById("exam-prep-result-card").classList.add("visible");
  showToast("Exam preparation ready! 🎓");
}
function copyExamPrep() {
  if (!examPrepNotes) return showToast("Nothing to copy", "error");
  navigator.clipboard.writeText(examPrepNotes);
  showToast("Copied!");
}
function exportExamPrepPDF() {
  if (!examPrepNotes) return showToast("Generate exam prep first!", "error");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>${escapeHtml(examPrepTopic)} - Exam Preparation</title></head>
  <body style="font-family:Georgia,serif;max-width:750px;margin:40px auto;line-height:1.9;">
  <h1>🎓 ${escapeHtml(examPrepTopic.toUpperCase())} — AI Exam Preparation</h1>
  <p style="color:#666">${new Date().toLocaleDateString()}</p>
  <pre style="white-space:pre-wrap;">${escapeHtml(examPrepNotes)}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

/* ── AI CONCEPT MAP ── */
async function generateMindMap() {
  const topic = document.getElementById("mindmap-topic").value.trim();
  if (!topic) return showToast("Enter a topic first!", "error");
  mindMapTopic = topic;
  document.getElementById("mindmap-loader").classList.add("visible");
  document.getElementById("mindmap-result-card").classList.remove("visible");
  try {
    const res = await fetch(`${API}/notes/mindmap?topic=${encodeURIComponent(topic)}`, {
      method: "POST", headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);
    mindMapText = data.map;
  } catch (e) {
    mindMapText = `🗺️ CONCEPT MAP : ${topic.toUpperCase()}\n\nDemo fallback — backend /notes/mindmap not reachable.`;
    showToast("Showing demo concept map!");
  } finally {
    document.getElementById("mindmap-loader").classList.remove("visible");
  }
  document.getElementById("mindmap-title").textContent = "Concept Map : " + topic;
  document.getElementById("mindmap-body").textContent = mindMapText;
  document.getElementById("mindmap-result-card").classList.add("visible");
}
function copyMindMap() {
  if (!mindMapText) return showToast("Generate a concept map first!", "error");
  navigator.clipboard.writeText(mindMapText);
  showToast("Concept Map copied!");
}
function exportMindMapPDF() {
  if (!mindMapText) return showToast("Generate a concept map first!", "error");
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>${escapeHtml(mindMapTopic)} - Concept Map</title></head>
  <body style="font-family:Arial;padding:30px;">
    <h2>🗺️ ${escapeHtml(mindMapTopic)} - Concept Map</h2>
    <pre>${escapeHtml(mindMapText)}</pre>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

/* ── AI DOUBT SOLVER ── */
async function openDoubtSolver() {
  const topic = document.getElementById("doubt-topic").value.trim();
  const question = document.getElementById("doubt-question").value.trim();
  if (!topic || !question) {
    document.getElementById("doubt-result").textContent = "Please enter both a topic and a question.";
    return;
  }
  document.getElementById("doubt-result").textContent = "Thinking...";
  try {
    const res = await fetch(
      `${API}/notes/doubt-solver?topic=${encodeURIComponent(topic)}&question=${encodeURIComponent(question)}`,
      { method: "POST", headers: authHeaders() }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    document.getElementById("doubt-result").textContent = data.answer;
  } catch (e) {
    document.getElementById("doubt-result").textContent = "Error solving doubt: " + e.message;
  }
}

/* ── STUDY PLANNER (matches #study-topic/#study-days/#study-result) ── */
function renderPlanTable(rows) {
  let html = `<table class="plan-table">
    <thead><tr><th>Day</th><th>Phase</th><th>Task</th></tr></thead>
    <tbody>`;
  rows.forEach(r => {
    html += `<tr><td>${r.day}</td><td>${escapeHtml(r.phase)}</td><td>${escapeHtml(r.task)}</td></tr>`;
  });
  html += `</tbody></table>
    <p class="plan-tip">✅ Tip: Revisit Day 1 notes briefly every few days to reinforce memory.</p>`;
  return html;
}

async function generateStudyPlan() {
  const topic = document.getElementById("study-topic").value.trim();
  const daysInput = document.getElementById("study-days").value.trim();
  const days = daysInput ? parseInt(daysInput, 10) : 7;
  if (!topic) return showToast("Enter a topic first!", "error");
  const resultEl = document.getElementById("study-result");
  resultEl.innerHTML = "<p>Generating plan...</p>";
  try {
    const res = await fetch(`${API}/notes/study-planner?topic=${encodeURIComponent(topic)}&days=${days}`, {
      method: "POST", headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    resultEl.innerHTML = `<h4 class="plan-title">📅 STUDY PLAN: ${escapeHtml(topic.toUpperCase())} (${days} days)</h4>` + renderPlanTable(data.plan_rows);
  } catch (e) {
    const taskPool = [
      ["Introduction", `Read a broad overview of ${topic} — what it is and why it matters`],
      ["Introduction", `Note down key terminology used in ${topic}`],
      ["Introduction", `Watch or read a beginner-friendly explanation of ${topic}`],
      ["Core Concepts", `Study the main components/structure of ${topic}`],
      ["Core Concepts", `Work through 2-3 fully solved examples of ${topic}`],
      ["Core Concepts", `Summarize the core concepts of ${topic} in your own words`],
      ["Deeper Understanding", `Compare ${topic} with a related concept`],
      ["Deeper Understanding", `Research one real-world case study involving ${topic}`],
      ["Practice", `Solve practice problems / exercises on ${topic}`],
      ["Practice", `Apply ${topic} to a small real-world example or mini project`],
      ["Application", `Explain ${topic} out loud as if teaching a beginner`],
      ["Application", `Write a one-page summary sheet covering all of ${topic}`],
      ["Revision", `Revise all your notes on ${topic} from earlier days`],
      ["Revision", `Take a self-test or quiz covering all of ${topic}`],
    ];
    const rows = [];
    for (let i = 0; i < days; i++) {
      let phase, task;
      if (i < taskPool.length) {
        [phase, task] = taskPool[i];
      } else {
        const extraNum = i - taskPool.length + 1;
        phase = "Extended Practice";
        task = `Deep-dive session #${extraNum}: explore a new angle of ${topic}`;
      }
      rows.push({ day: i + 1, phase, task });
    }
    resultEl.innerHTML = `<h4 class="plan-title">📅 STUDY PLAN: ${escapeHtml(topic.toUpperCase())} (${days} days)</h4>` + renderPlanTable(rows);
  }
}
function clearStudyPlan() {
  document.getElementById("study-topic").value = "";
  document.getElementById("study-days").value = "";
  document.getElementById("study-result").innerHTML = "";
}

/* ── POMODORO TIMER (matches #timer-display) ── */
let pomodoroTime = 25 * 60;
let pomodoroInterval;
let pomodoroRunning = false;
function updateTimerDisplay() {
  const el = document.getElementById("timer-display");
  if (!el) return;
  const m = Math.floor(pomodoroTime / 60);
  const s = pomodoroTime % 60;
  el.innerText = m.toString().padStart(2, "0") + ":" + s.toString().padStart(2, "0");
}
function startTimer() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  pomodoroInterval = setInterval(() => {
    if (pomodoroTime <= 0) {
      clearInterval(pomodoroInterval);
      showToast("Time up! ⏰");
      pomodoroTime = 25 * 60;
      pomodoroRunning = false;
      updateTimerDisplay();
      return;
    }
    pomodoroTime--;
    updateTimerDisplay();
  }, 1000);
}
function pauseTimer() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
}
function resetTimer() {
  clearInterval(pomodoroInterval);
  pomodoroTime = 25 * 60;
  pomodoroRunning = false;
  updateTimerDisplay();
}
updateTimerDisplay();
