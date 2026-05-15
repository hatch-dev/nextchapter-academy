var vpAudioState = {
  src: 'https://samplelib.com/mp3/sample-9s.mp3',
  audio: null,
  currentId: null,
  currentEl: null
};

function resetVpAudioUi() {
  document.querySelectorAll('.vp.is-playing').forEach(function(el) {
    el.classList.remove('is-playing');
    var icon = el.querySelector('.js-vp-icon');
    if (icon) icon.textContent = '\u25b6';
  });
}

function setVpAudioPlaying(el, id) {
  resetVpAudioUi();
  if (el) {
    el.classList.add('is-playing');
    var icon = el.querySelector('.js-vp-icon');
    if (icon) icon.textContent = '\u275a\u275a';
  }
  vpAudioState.currentEl = el || null;
  vpAudioState.currentId = id;
}

function getVpAudio() {
  if (!vpAudioState.audio) {
    vpAudioState.audio = new Audio(vpAudioState.src);
    vpAudioState.audio.preload = 'auto';
    vpAudioState.audio.volume = 1;
    vpAudioState.audio.addEventListener('ended', function() {
      resetVpAudioUi();
      vpAudioState.currentId = null;
      vpAudioState.currentEl = null;
    });
  }
  return vpAudioState.audio;
}

function stopVpAudio() {
  var audio = getVpAudio();
  audio.pause();
  resetVpAudioUi();
  vpAudioState.currentId = null;
  vpAudioState.currentEl = null;
}

function toggleVpAudio(el, id) {
  id = String(id || '');
  var audio = getVpAudio();

  if (vpAudioState.currentId === id && !audio.paused) {
    audio.pause();
    resetVpAudioUi();
    return;
  }

  if (vpAudioState.currentId !== id) {
    stopVpAudio();
    audio.currentTime = 0;
  }

  setVpAudioPlaying(el, id);
  audio.play().catch(function() {
    resetVpAudioUi();
    vpAudioState.currentId = null;
    vpAudioState.currentEl = null;
  });
}

var profileEditorForm = {};
var profileEditorError = '';
var profileEditorNotice = '';
var profileEditorSaving = false;

function profileEditorEscape(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function profileEditorField(label, key, value, placeholder, type) {
  return '<div class="field"><label class="field-label">' + profileEditorEscape(label) + '</label><input class="field-input" type="' + (type || 'text') + '" value="' + profileEditorEscape(value || '') + '" placeholder="' + profileEditorEscape(placeholder || '') + '" oninput="setProfileEditorField(\'' + key + '\',this.value)"></div>';
}

function profileEditorReadOnlyField(label, value) {
  return '<div class="field"><label class="field-label">' + profileEditorEscape(label) + '</label><input class="field-input" type="email" value="' + profileEditorEscape(value || '') + '" readonly disabled style="opacity:.7;cursor:not-allowed"></div>';
}

function profileEditorArea(label, key, value, placeholder) {
  return '<div class="field"><label class="field-label">' + profileEditorEscape(label) + '</label><textarea class="field-ta" rows="3" placeholder="' + profileEditorEscape(placeholder || '') + '" oninput="setProfileEditorField(\'' + key + '\',this.value)">' + profileEditorEscape(value || '') + '</textarea></div>';
}

function setProfileEditorField(key, value) {
  profileEditorForm[key] = value;
}

function openProfileEditor() {
  var user = window.currentUser || {};
  var account = window.currentAccount || {};
  profileEditorForm = {
    name: user.name || '',
    email: user.email || '',
    role: user.role || account.contact_role || '',
    scope: user.scope || '',
    company_name: account.company_name || '',
    contact_phone: account.contact_phone || ''
  };
  profileEditorError = '';
  profileEditorNotice = '';
  profileEditorSaving = false;
  renderProfileEditor();
}

function closeProfileEditor() {
  var root = document.getElementById('modalRoot');
  if (root) root.innerHTML = '';
}

function renderProfileEditor() {
  var root = document.getElementById('modalRoot');
  if (!root) return;
  var isOwner = !!(window.currentUser && window.currentUser.is_account_owner);
  var h = '<div class="modal-bg" onclick="if(event.target===this)closeProfileEditor()"><div class="modal">';
  h += '<h3>Edit Profile</h3>';
  h += '<p class="sub">Update your account identity and workspace profile details.</p>';
  if (profileEditorError) h += '<div style="color:#FCA5A5;margin-bottom:14px;font-size:14px">' + profileEditorEscape(profileEditorError) + '</div>';
  if (profileEditorNotice) h += '<div style="color:#86EFAC;margin-bottom:14px;font-size:14px">' + profileEditorEscape(profileEditorNotice) + '</div>';
  h += profileEditorField('Full name', 'name', profileEditorForm.name, 'Jane Doe');
  h += profileEditorReadOnlyField('Email', profileEditorForm.email);
  h += profileEditorField('Role / title', 'role', profileEditorForm.role, 'Owner, COO, Innovation Lead');
  h += profileEditorArea('Scope', 'scope', profileEditorForm.scope, 'Assigned work, modules, responsibilities...');
  if (isOwner) {
    h += '<div class="section-label" style="margin-top:20px;margin-bottom:12px">Workspace</div>';
    h += profileEditorField('Company', 'company_name', profileEditorForm.company_name, 'Company name');
    h += profileEditorField('Phone', 'contact_phone', profileEditorForm.contact_phone, '+1 555 010 1000');
  }
  h += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">';
  h += '<button class="btn-ghost" onclick="closeProfileEditor()">Cancel</button>';
  h += '<button class="btn-gold" onclick="saveProfileEditor()" ' + (profileEditorSaving ? 'disabled' : '') + '>' + (profileEditorSaving ? 'Saving...' : 'Save Profile') + '</button>';
  h += '</div></div></div>';
  root.innerHTML = h;
}

function saveProfileEditor() {
  if (profileEditorSaving) return;
  profileEditorSaving = true;
  profileEditorError = '';
  profileEditorNotice = '';
  renderProfileEditor();

  var payload = {
    name: (profileEditorForm.name || '').trim(),
    email: ((window.currentUser && window.currentUser.email) || profileEditorForm.email || '').trim(),
    role: (profileEditorForm.role || '').trim(),
    scope: (profileEditorForm.scope || '').trim(),
    company_name: (profileEditorForm.company_name || '').trim(),
    contact_phone: (profileEditorForm.contact_phone || '').trim()
  };

  commonCoachApiPut('/profile', payload).then(function(res) {
    var user = res && res.user ? res.user : res;
    if (user && user.id) {
      window.currentUser = user;
      window.currentAccount = user.account || window.currentAccount;
      if (typeof currentUser !== 'undefined') currentUser = window.currentUser;
      if (typeof currentAccount !== 'undefined') currentAccount = window.currentAccount;
      if (typeof workspaceUsers !== 'undefined' && Array.isArray(workspaceUsers)) {
        for (var i = 0; i < workspaceUsers.length; i++) {
          if (workspaceUsers[i].id === user.id) workspaceUsers[i] = user;
        }
      }
      if (typeof syncBillingForm === 'function') syncBillingForm();
      if (window.TeamChat && typeof TeamChat.refreshTeams === 'function') {
        TeamChat.refreshTeams();
      } else if (window.TeamChat && typeof TeamChat.init === 'function') {
        TeamChat.init(user);
      }
    }
    profileEditorSaving = false;
    profileEditorNotice = 'Profile updated.';
    renderProfileEditor();
    if (typeof render === 'function') render();
    setTimeout(closeProfileEditor, 650);
  }).catch(function(e) {
    profileEditorSaving = false;
    profileEditorError = e.message || 'Unable to update profile';
    renderProfileEditor();
  });
}

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

var commonCoachLoaded = false;
var commonCoachLoading = false;
var commonCoachLocalKey = 'nextchapter-ai-coach-history';
var commonCoachWelcome = {
  role: 'assistant',
  text: 'Welcome. I can help across your NextChapter modules, including the AI Innovation Pipeline and Responsible AI Governance. Ask about the current step, your decisions, or what to do next.'
};

function commonCoachEscape(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function commonCoachNormalize(messages) {
  var list = Array.isArray(messages) ? messages : [];
  var normalized = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i] || {};
    var role = item.role === 'ai' ? 'assistant' : item.role;
    if (role !== 'user' && role !== 'assistant') continue;
    var text = item.text || item.message || '';
    if (!String(text).trim()) continue;
    normalized.push({
      role: role,
      text: String(text),
      created_at: item.created_at || item.createdAt || null
    });
  }
  return normalized;
}

function commonCoachSetMessages(messages) {
  window.coachMsgs = commonCoachNormalize(messages);
  try {
    localStorage.setItem(commonCoachLocalKey, JSON.stringify(window.coachMsgs));
  } catch (e) {}
  return window.coachMsgs;
}

function commonCoachLoadFallback() {
  try {
    return commonCoachNormalize(JSON.parse(localStorage.getItem(commonCoachLocalKey) || '[]'));
  } catch (e) {
    return [];
  }
}

function commonCoachApiGet(path) {
  if (typeof window.apiGet === 'function') return window.apiGet(path);
  return fetch((window.API_BASE || '/nextchapter/api') + path, {
    credentials: 'include'
  }).then(function(r) {
    return r.json().then(function(j) {
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Request failed');
      return j.data !== undefined ? j.data : j;
    });
  });
}

function commonCoachApiPost(path, body) {
  if (typeof window.apiPost === 'function') return window.apiPost(path, body);
  return fetch((window.API_BASE || '/nextchapter/api') + path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  }).then(function(r) {
    return r.json().then(function(j) {
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Request failed');
      return j.data !== undefined ? j.data : j;
    });
  });
}

function commonCoachApiPut(path, body) {
  if (typeof window.apiPut === 'function') return window.apiPut(path, body);
  return fetch((window.API_BASE || '/nextchapter/api') + path, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  }).then(function(r) {
    return r.json().then(function(j) {
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Request failed');
      return j.data !== undefined ? j.data : j;
    });
  });
}

function commonCoachApiDelete(path) {
  if (typeof window.apiDel === 'function') return window.apiDel(path);
  return fetch((window.API_BASE || '/nextchapter/api') + path, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function(r) {
    return r.json().then(function(j) {
      if (!r.ok || j.ok === false) throw new Error(j.error || 'Request failed');
      return j.data !== undefined ? j.data : j;
    });
  });
}

function commonCoachModuleLabel() {
  var title = (document.title || '').replace(/\s+\u2014.*$/, '').trim();
  return title || 'NextChapter module';
}

function commonCoachContext() {
  var phaseName = window.currentPhase && window.currentPhase.name ? window.currentPhase.name : '';
  var step = window.currentStep ? ' Step ' + window.currentStep + (phaseName ? ' (' + phaseName + ')' : '') : ' overview';
  return 'Module: ' + commonCoachModuleLabel() + '.' + ' User is working on:' + step + '.';
}

function commonCoachEnsureLoaded() {
  if (commonCoachLoaded || commonCoachLoading || !window.currentUser) return;
  commonCoachLoading = true;
  var fallback = commonCoachLoadFallback();
  if (fallback.length) {
    commonCoachSetMessages(fallback);
  }
  commonCoachApiGet('/ai/coach-history').then(function(res) {
    commonCoachSetMessages((res && res.messages) || []);
    commonCoachLoaded = true;
    if (window.coachOpen && typeof window.renderCoachPanel === 'function') window.renderCoachPanel();
  }).catch(function() {
    commonCoachLoaded = true;
  }).finally(function() {
    commonCoachLoading = false;
  });
}

function toggleCoach() {
  window.coachOpen = !window.coachOpen;
  var fab = document.getElementById('coachFab');
  var pulse = document.getElementById('fabPulse');
  var panel = document.getElementById('coachPanel');
  if (fab) fab.className = 'coach-fab' + (window.coachOpen ? ' open' : '');
  if (pulse) pulse.style.display = window.coachOpen ? 'none' : 'block';
  if (panel) panel.className = 'coach-panel' + (window.coachOpen ? ' open' : '');
  if (window.coachOpen) {
    commonCoachEnsureLoaded();
    renderCoachPanel();
  }
}

function renderCoachPanel() {
  var panel = document.getElementById('coachPanel');
  if (!panel) return;
  commonCoachEnsureLoaded();

  var messages = commonCoachNormalize(window.coachMsgs);
  var html = '<div class="coach-header"><div class="coach-header-title"><span>&#10022;</span> AI Coach</div><button class="coach-close" onclick="toggleCoach()">&times;</button></div>';
  html += '<div class="coach-msgs" id="coachMsgsEl">';

  if (!messages.length) {
    messages = [commonCoachWelcome];
  }

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    var cls = msg.role === 'user' ? 'user' : 'ai';
    html += '<div class="coach-msg ' + cls + '"><div class="coach-sender">' + (cls === 'ai' ? 'AI Coach' : 'You') + '</div>' + commonCoachEscape(msg.text) + '</div>';
  }

  html += '</div>';
  html += '<div class="coach-presets">';
  var presets = ['What should I focus on next?', 'Challenge my current thinking', 'Summarize this step', 'What risks am I missing?'];
  for (var p = 0; p < presets.length; p++) {
    html += '<button class="coach-preset" onclick="sendCoachPreset(\'' + commonCoachEscape(presets[p]) + '\')">' + commonCoachEscape(presets[p]) + '</button>';
  }
  html += '</div>';
  html += '<div class="coach-input-row"><textarea id="coachInput" placeholder="Ask across any module..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendCoach()}"></textarea><button class="coach-send" onclick="sendCoach()">Send</button></div>';
  panel.innerHTML = html;

  var scroller = document.getElementById('coachMsgsEl');
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
}

function sendCoachPreset(text) {
  var input = document.getElementById('coachInput');
  if (input) input.value = text;
  sendCoach();
}

function sendCoach() {
  var input = document.getElementById('coachInput');
  if (!input || !input.value.trim()) return;
  var userText = input.value.trim();
  input.value = '';

  var messages = commonCoachNormalize(window.coachMsgs);
  messages.push({
    role: 'user',
    text: userText
  });
  commonCoachSetMessages(messages);
  renderCoachPanel();

  commonCoachApiPost('/ai/coach', {
    message: userText,
    context: commonCoachContext()
  }).then(function(res) {
    if (res && Array.isArray(res.messages)) {
      commonCoachSetMessages(res.messages);
    } else {
      messages = commonCoachNormalize(window.coachMsgs);
      messages.push({
        role: 'assistant',
        text: (res && res.text) ? res.text : 'Could not generate response. Try again.'
      });
      commonCoachSetMessages(messages);
    }
    renderCoachPanel();
  }).catch(function() {
    messages = commonCoachNormalize(window.coachMsgs);
    messages.push({
      role: 'assistant',
      text: 'Connection error. Please try again.'
    });
    commonCoachSetMessages(messages);
    renderCoachPanel();
  });
}

function clearCoachHistory() {
  if (!confirm('Clear AI Coach chat history?')) return;
  commonCoachApiDelete('/ai/coach-history').then(function() {
    commonCoachSetMessages([]);
    renderCoachPanel();
  }).catch(function(e) {
    alert(e.message || 'Unable to clear chat history');
  });
}

var teamChatInitInterval = setInterval(function() {
  refreshTeamChatVisibility();
  initializeTeamChatOnce();
  commonCoachEnsureLoaded();
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
