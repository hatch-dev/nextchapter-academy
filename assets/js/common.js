function refreshTeamChatVisibility() {
  var fab = document.getElementById('teamChatFab');
  if (!fab) return;
  fab.style.display = window.currentUser ? 'flex' : 'none';
}

function initializeTeamChatOnce() {
  if (!window.teamChatInitialized && window.currentUser && typeof TeamChat !== 'undefined') {
    TeamChat.init(window.currentUser);

    window.teamChatInitialized = true;
    if (typeof teamChatInitInterval !== 'undefined') {
      clearInterval(teamChatInitInterval);
    }
  }
}

var teamChatInitInterval = setInterval(function() {
  refreshTeamChatVisibility();
  initializeTeamChatOnce();
}, 200);

function commonNotesEscape(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function commonNotesDate(value) {
  var date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function commonNotesId() {
  return 'note-' + Math.random().toString(36).slice(2, 10);
}

function commonNotesNormalize(note) {
  note = note && typeof note === 'object' ? note : {};
  return {
    id: note.id || commonNotesId(),
    text: note.text || '',
    step: note.step || null,
    createdAt: note.createdAt || Date.now()
  };
}

function commonNotesKey(note) {
  return note.id || [note.text || '', note.step || '', note.createdAt || ''].join('|');
}

function commonNotesDeletedMap() {
  var deleted = window.sharedData && Array.isArray(window.sharedData.deletedNoteIds) ? window.sharedData.deletedNoteIds : [];
  var map = {};
  for (var i = 0; i < deleted.length; i++) {
    map[deleted[i]] = true;
  }
  return map;
}

function commonNotesSignature(notes) {
  return commonNotesMerge(notes).map(function(note) {
    return [note.id, note.text, note.step, note.createdAt].join('|');
  }).join('||');
}

function commonNotesMerge() {
  var merged = [];
  var seen = {};
  var deleted = commonNotesDeletedMap();

  for (var a = 0; a < arguments.length; a++) {
    var notes = Array.isArray(arguments[a]) ? arguments[a] : [];
    for (var i = 0; i < notes.length; i++) {
      var note = commonNotesNormalize(notes[i]);
      if (note.id && deleted[note.id]) continue;
      var key = commonNotesKey(note);
      if (!seen[key]) {
        seen[key] = true;
        merged.push(note);
      }
    }
  }

  merged.sort(function(a, b) {
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  return merged;
}

function commonNotesStore(notes) {
  if (!window.data || typeof window.data !== 'object') {
    window.data = {};
  }
  if (!window.sharedData || typeof window.sharedData !== 'object') {
    window.sharedData = {};
  }
  if (!Array.isArray(window.sharedData.deletedNoteIds)) {
    window.sharedData.deletedNoteIds = [];
  }

  var normalized = commonNotesMerge(notes);
  window.sharedData.notes = normalized;
  window.data.notes = normalized;

  return normalized;
}

function commonNotesData() {
  var moduleNotes = window.data && Array.isArray(window.data.notes) ? window.data.notes : [];
  var sharedNotes = window.sharedData && Array.isArray(window.sharedData.notes) ? window.sharedData.notes : [];
  var moduleBefore = commonNotesSignature(moduleNotes);
  var sharedBefore = commonNotesSignature(sharedNotes);
  var merged = commonNotesStore(commonNotesMerge(sharedNotes, moduleNotes));
  var mergedAfter = commonNotesSignature(merged);

  if ((moduleBefore !== mergedAfter || sharedBefore !== mergedAfter) && window.currentUser) {
    commonNotesSave();
  }

  return merged;
}

function commonNotesSave() {
  if (typeof window.saveData === 'function') {
    window.saveData();
  } else if (typeof window.saveSharedData === 'function') {
    window.saveSharedData();
  }
}

function commonNotesContextLabel(note) {
  var step = note && note.step ? String(note.step) : '';
  if (!step) return '';
  return 'Step ' + commonNotesEscape(step) + ' &middot; ';
}

function toggleNotes() {
  window.notesOpen = !window.notesOpen;
  var fab = document.getElementById('notesFab');
  var panel = document.getElementById('notesPanel');
  if (fab) fab.className = 'notes-fab' + (window.notesOpen ? ' open' : '');
  if (panel) panel.className = 'notes-panel' + (window.notesOpen ? ' open' : '');
  if (window.notesOpen) renderNotesPanel();
}

function updateNotesCount() {
  var count = document.getElementById('notesCount');
  if (count) count.textContent = commonNotesData().length;
}

function renderNotesPanel() {
  var panel = document.getElementById('notesPanel');
  if (!panel) return;

  var notes = commonNotesData();
  var html = '<div class="notes-header"><div class="notes-header-title">&#9998; Notes</div><button class="notes-close" onclick="toggleNotes()">&times;</button></div>';
  html += '<div class="notes-list">';

  if (!notes.length) {
    html += '<div class="notes-empty">No notes yet.</div>';
  } else {
    for (var i = notes.length - 1; i >= 0; i--) {
      var note = notes[i] || {};
      var noteId = commonNotesEscape(note.id || '');
      html += '<div class="note-card">';
      html += '<div class="note-text">' + commonNotesEscape(note.text || '') + '</div>';
      html += '<div class="note-meta"><span class="note-date">' + commonNotesContextLabel(note) + commonNotesDate(note.createdAt) + '</span><button class="note-del" onclick="deleteNote(\'' + noteId + '\')">&times;</button></div>';
      html += '</div>';
    }
  }

  html += '</div>';
  html += '<div class="notes-input-row"><textarea id="notesInput" placeholder="Write a note..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();addNote()}"></textarea><button class="notes-send" onclick="addNote()">&#9998;</button></div>';
  panel.innerHTML = html;
}

function addNote() {
  var input = document.getElementById('notesInput');
  if (!input || !input.value.trim()) return;

  var notes = commonNotesData();
  notes.push({
    id: commonNotesId(),
    text: input.value.trim(),
    step: window.currentStep || null,
    createdAt: Date.now()
  });
  commonNotesStore(notes);

  commonNotesSave();
  renderNotesPanel();
  updateNotesCount();
}

function deleteNote(id) {
  var notes = commonNotesData().filter(function(note) {
    return note.id !== id;
  });
  if (window.sharedData && Array.isArray(window.sharedData.deletedNoteIds) && id && window.sharedData.deletedNoteIds.indexOf(id) === -1) {
    window.sharedData.deletedNoteIds.push(id);
  }
  commonNotesStore(notes);

  commonNotesSave();
  renderNotesPanel();
  updateNotesCount();
}
