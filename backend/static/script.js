const API = 'http://127.0.0.1:8000';
let token = localStorage.getItem('token') || null;
let currentNotes = '', currentTopic = '';
let flashcards = [], fcIndex = 0, fcFlipped = false;

// ── THEME ──
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}

// ── NAVIGATION ──
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const navBtn = document.getElementById('nav-' + id);
  if (navBtn) navBtn.classList.add('active');
  if (id === 'history') loadHistory();
}

// ── TOAST ──
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + type + ' show';
  setTimeout(() => t.className = 'toast', 3000);
}

// ── AUTH ──
async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  if (!email || !pass) return showToast('Fill in all fields.', 'error');
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    token = data.access_token;
    localStorage.setItem('token', token);
    showToast('Signed in successfully!');
    updateAuthUI();
    showPage('generate');
  } catch(e) { showToast(e.message, 'error'); }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-password').value;
  if (!name || !email || !pass) return showToast('Fill in all fields.', 'error');
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    showToast('Account created! Please sign in.');
    showPage('login');
  } catch(e) { showToast(e.message, 'error'); }
}

function updateAuthUI() {
  const loginBtn = document.getElementById('nav-login');
  const regBtn = document.getElementById('nav-register');
  if (token) {
    loginBtn.textContent = 'Logout';
    loginBtn.onclick = () => {
      token = null; localStorage.removeItem('token');
      updateAuthUI(); showPage('home');
      showToast('Logged out!');
    };
    regBtn.style.display = 'none';
  } else {
    loginBtn.textContent = 'Login';
    loginBtn.onclick = () => showPage('login');
    regBtn.style.display = '';
  }
}
updateAuthUI();

// ── GENERATE NOTES ──
async function generateNotes() {
  const topic = document.getElementById('topic-input').value.trim();
  const level = document.getElementById('level-select').value;
  const style = document.getElementById('style-select').value;
  if (!topic) return showToast('Enter a topic first.', 'error');
  currentTopic = topic;
  document.getElementById('gen-loader').classList.add('visible');
  document.getElementById('result-card').classList.remove('visible');
  try {
    const res = await fetch(`${API}/notes/generate?topic=${encodeURIComponent(topic)}&level=${level}&style=${style}`, {
      method: 'POST', headers: token ? {'Authorization': 'Bearer ' + token} : {}
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Generation failed');
    currentNotes = data.notes || data.content || '';
    document.getElementById('result-title').textContent = 'Notes: ' + topic.toUpperCase();
    document.getElementById('notes-body').textContent = currentNotes;
    document.getElementById('result-card').classList.add('visible');
    if (data.cached) showToast('Loaded from cache! ⚡');
    else showToast('Notes generated and saved! ✅');
  } catch(e) { showToast(e.message, 'error'); }
  finally { document.getElementById('gen-loader').classList.remove('visible'); }
}

function copyNotes() {
  navigator.clipboard.writeText(currentNotes);
  showToast('Notes copied to clipboard!');
}

function exportPDF() {
  if (!currentNotes) return showToast('No notes to export!', 'error');
  const w = window.open('', '_blank');
  w.document.write(`
    <html>
    <head>
      <title>${currentTopic} - Study Notes</title>
      <style>
        body { font-family: Georgia, serif; max-width: 750px; margin: 40px auto; line-height: 1.9; color: #111; padding: 0 20px; }
        h1 { font-size: 1.6rem; margin-bottom: 0.5rem; color: #1a1a2e; }
        p.meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 1rem; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 0.95rem; }
      </style>
    </head>
    <body>
      <h1>${currentTopic.toUpperCase()} — Study Notes</h1>
      <p class="meta">Generated by NoteForge AI | ${new Date().toLocaleDateString()}</p>
      <pre>${currentNotes}</pre>
    </body>
    </html>
  `);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ── HISTORY ──
async function loadHistory() {
  const grid = document.getElementById('hist-grid');
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading history...</p></div>';
  try {
    const res = await fetch(`${API}/notes/history`);
    const data = await res.json();
    if (!data.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No saved notes yet. Generate some notes first!</p></div>';
      return;
    }
    grid.innerHTML = data.map(n => `
      <div class="hist-item" onclick="viewNote(${n.id})">
        <div class="hist-info">
          <h4>${n.topic.toUpperCase()}</h4>
          <span>${new Date(n.created_at).toLocaleDateString()} • ${n.level}</span>
        </div>
        <span class="hist-badge">View Notes</span>
      </div>
    `).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Error loading history. Make sure backend is running.</p></div>';
  }
}

async function viewNote(id) {
  try {
    const res = await fetch(`${API}/notes/history/${id}`);
    const n = await res.json();
    currentNotes = n.content; currentTopic = n.topic;
    document.getElementById('topic-input').value = n.topic;
    document.getElementById('result-title').textContent = 'Notes: ' + n.topic.toUpperCase();
    document.getElementById('notes-body').textContent = n.content;
    document.getElementById('result-card').classList.add('visible');
    showPage('generate');
  } catch(e) { showToast('Error loading note.', 'error'); }
}

// ── FLASHCARDS ──
async function generateFlashcards() {
  const topic = document.getElementById('flash-topic').value.trim();
  if (!topic) return showToast('Enter a topic first.', 'error');
  document.getElementById('flash-loader').classList.add('visible');
  document.getElementById('flashcard-area').classList.remove('visible');
  try {
    const res = await fetch(`${API}/notes/flashcards?topic=${encodeURIComponent(topic)}`, {
      method: 'POST', headers: token ? {'Authorization': 'Bearer ' + token} : {}
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    flashcards = data.flashcards || data;
    showToast('Flashcards ready!');
  } catch(e) {
    flashcards = [
      { question: `What is ${topic}?`, answer: `${topic} is a fundamental concept in computer science.` },
      { question: `What are the key components of ${topic}?`, answer: `Key components include structure, organization, and efficient data management.` },
      { question: `Give a real-world example of ${topic}.`, answer: `${topic} is used in banking systems and e-commerce platforms.` },
      { question: `Why is ${topic} important?`, answer: `${topic} improves performance, efficiency, and helps solve complex problems.` },
      { question: `What are the advantages of ${topic}?`, answer: `Better organization, faster access, reduced redundancy, and improved reliability.` },
    ];
    showToast('Showing demo flashcards!');
  } finally { document.getElementById('flash-loader').classList.remove('visible'); }
  fcIndex = 0; fcFlipped = false; renderCard();
  document.getElementById('flashcard-area').classList.add('visible');
}

function renderCard() {
  fcFlipped = false;
  document.getElementById('fc-label').textContent = 'Question';
  document.getElementById('fc-text').textContent = flashcards[fcIndex].question;
  document.getElementById('fc-counter').textContent = (fcIndex + 1) + ' / ' + flashcards.length;
}
function flipCard() {
  fcFlipped = !fcFlipped;
  document.getElementById('fc-label').textContent = fcFlipped ? 'Answer' : 'Question';
  document.getElementById('fc-text').textContent = fcFlipped ? flashcards[fcIndex].answer : flashcards[fcIndex].question;
}
function nextCard() { if (fcIndex < flashcards.length - 1) { fcIndex++; renderCard(); } }
function prevCard() { if (fcIndex > 0) { fcIndex--; renderCard(); } }