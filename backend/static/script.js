async function loadHistory() {
  const grid = document.getElementById('hist-grid');
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading...</p></div>';
  try {
    const res = await fetch(`${API}/notes/history`);
    const data = await res.json();
    if (!data.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No saved notes yet!</p></div>';
      return;
    }
    grid.innerHTML = data.map((n, i) => `
      <div class="hist-item" onclick="viewNote(${n.id})">
        <div class="hist-info">
          <h4>${n.topic.toUpperCase()}</h4>
          <span>${n.created_at}</span>
        </div>
        <span class="hist-badge">View Notes</span>
      </div>
    `).join('');
  } catch(e) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><p>Error loading history.</p></div>';
  }
}

async function viewNote(id) {
  try {
    const res = await fetch(`${API}/notes/history/${id}`);
    const n = await res.json();
    currentNotes = n.content;
    currentTopic = n.topic;
    document.getElementById('topic-input').value = n.topic;
    document.getElementById('result-title').textContent = 'Notes: ' + n.topic;
    document.getElementById('notes-body').textContent = n.content;
    document.getElementById('result-card').classList.add('visible');
    showPage('generate');
  } catch(e) {
    showToast('Error loading note.', 'error');
  }
}