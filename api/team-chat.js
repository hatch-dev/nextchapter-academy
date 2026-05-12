/**
 * Team Chat Module
 * Handles dynamic team chat functionality for the Next Chapter platform
 */

const TeamChat = (function() {
  let state = {
    teams: [],
    activeTeam: null,
    activeTab: 'messages',
    messages: {},
    members: {},
    loading: false,
    currentUser: null
  };
  let pollingTimer = null;

  // Initialize team chat module
  async function init(user) {
    state.currentUser = user;
    const teams = await loadTeams();
    await setActiveTeam(teams.length > 0 ? teams[0].id : null);
    startPolling();
  }

  // Load all teams for the account
  async function loadTeams() {
    try {
      state.loading = true;
      const response = await fetch('/nextchapter/api/teams', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load teams');
      const result = await response.json();
      state.teams = result.data || [];
      return state.teams;
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      state.loading = false;
    }
  }

  // Create a new team
  async function createTeam(name, description) {
    try {
      const response = await fetch('/nextchapter/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) throw new Error('Failed to create team');
      const result = await response.json();
      
      if (result.data) {
        state.teams.push(result.data);
        setActiveTeam(result.data.id);
        await loadTeamMembers(result.data.id);
      }
      render();
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team. Please try again.');
    }
  }

  // Set active team
  async function setActiveTeam(teamId) {
    state.activeTeam = teamId;
    if (teamId) {
      await loadTeamMembers(teamId);
      await loadMessages(teamId);
      startPolling();
    } else {
      stopPolling();
    }
    render();
  }

  async function refreshMessages() {
    if (!state.activeTeam) return;
    await loadMessages(state.activeTeam);

    if (state.activeTab === 'messages' && document.querySelector('.team-chat-messages')) {
      updateMessagesView();
      if (typeof renderGChatPanel === 'function' && typeof gchatOpen !== 'undefined' && gchatOpen) {
        renderGChatPanel();
      }
      return;
    }

    render();
    if (typeof renderGChatPanel === 'function' && typeof gchatOpen !== 'undefined' && gchatOpen) {
      renderGChatPanel();
    }
  }

  function startPolling() {
    stopPolling();
    pollingTimer = setInterval(function() {
      refreshMessages().catch(function(err) {
        console.error('TeamChat polling error:', err);
      });
    }, 3000);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  // Load team members
  async function loadTeamMembers(teamId) {
    try {
      const response = await fetch(`/nextchapter/api/teams/members?team_id=${teamId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load team members');
      const result = await response.json();
      state.members[teamId] = result.data || [];
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  // Add member to team
  async function addMember(teamId, userId) {
    try {
      const response = await fetch('/nextchapter/api/teams/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ team_id: teamId, user_id: userId })
      });
      
      if (!response.ok) throw new Error('Failed to add member');
      await loadTeamMembers(teamId);
      render();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member. They may already be in the team.');
    }
  }

  // Remove member from team
  async function removeMember(teamId, userId) {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      const response = await fetch('/nextchapter/api/teams/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ team_id: teamId, user_id: userId })
      });
      
      if (!response.ok) throw new Error('Failed to remove member');
      await loadTeamMembers(teamId);
      render();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member.');
    }
  }

  // Load messages for team
  async function loadMessages(teamId) {
    try {
      const channel = `team-${teamId}`;
      const response = await fetch(`/nextchapter/api/messages?channel=${channel}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load messages');
      const result = await response.json();
      state.messages[teamId] = result.data || [];
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  // Send message to team chat
  async function sendMessage(teamId, message) {
    if (!message.trim()) return false;
    
    try {
      const channel = `team-${teamId}`;
      const response = await fetch('/nextchapter/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel, message })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      const result = await response.json();
      
      if (result.data) {
        if (!state.messages[teamId]) state.messages[teamId] = [];
        state.messages[teamId].push(result.data);
        if (state.activeTab === 'messages') {
          updateMessagesView();
        } else {
          render();
        }
      }
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      return false;
    }
  }

  // Delete team
  async function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    
    try {
      const response = await fetch('/nextchapter/api/teams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ team_id: teamId })
      });
      
      if (!response.ok) throw new Error('Failed to delete team');
      state.teams = state.teams.filter(t => t.id !== teamId);
      if (state.activeTeam === teamId) {
        state.activeTeam = state.teams.length > 0 ? state.teams[0].id : null;
      }
      render();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team.');
    }
  }

  // Render team chat panel
  function render() {
    const panel = document.getElementById('teamChatPanel');
    if (!panel) return;

    const draft = document.querySelector('#teamChatInput') ? document.querySelector('#teamChatInput').value : '';

    if (!state.activeTeam) {
      panel.innerHTML = `
        <div class="team-chat-empty">
          <div class="team-chat-empty-content">
            <h3>Team Chat</h3>
            <p>No teams yet. Create one to get started with team collaboration.</p>
            <button onclick="TeamChat.showCreateForm()" class="btn-gold" style="margin-top:16px">
              + Create Team
            </button>
          </div>
        </div>
      `;
      return;
    }

    const team = state.teams.find(t => t.id === state.activeTeam);
    const members = state.members[state.activeTeam] || [];
    const messages = state.messages[state.activeTeam] || [];
    const activeTab = state.activeTab || 'messages';

    let html = `
      <div class="team-chat-container">
        <div class="team-chat-header">
          <div class="team-chat-header-title">
            <span class="team-chat-icon">👥</span>
            ${team ? team.name : 'Team Chat'}
          </div>
          <button class="team-chat-close" onclick="TeamChat.closePanel()" title="Close">×</button>
        </div>

        <div class="team-chat-tabs">
          <button class="team-chat-tab ${activeTab === 'messages' ? 'active' : ''}" onclick="TeamChat.showMessagesTab()">
            Messages
          </button>
          <button class="team-chat-tab ${activeTab === 'members' ? 'active' : ''}" onclick="TeamChat.showMembersTab()">
            Members (${members.length})
          </button>
        </div>

        <div class="team-chat-content" id="teamChatContent">
          ${activeTab === 'members' ? renderMembersTab(team, members) : renderMessagesTab(team, members, messages)}
        </div>
      </div>
    `;

    panel.innerHTML = html;

    if (activeTab === 'messages') {
      const input = document.getElementById('teamChatInput');
      if (input) {
        input.value = draft;
      }
      requestAnimationFrame(() => {
        const msgContainer = document.querySelector('.team-chat-messages');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
      });
    }
  }

  function renderMessagesTab(team, members, messages) {
    return `
      <div class="team-chat-messages-container">
        <div class="team-chat-messages">
          ${messages.length === 0 ? 
            '<div class="team-chat-empty-messages">No messages yet. Start the conversation!</div>' :
            messages.map(msg => `
              <div class="team-chat-message ${msg.user_id === state.currentUser?.id ? 'me' : ''}">
                <div class="team-chat-message-avatar" style="background-color: ${msg.color}">
                  ${msg.initials}
                </div>
                <div class="team-chat-message-content">
                  <div class="team-chat-message-header">
                    <span class="team-chat-message-name">${msg.user_name}</span>
                    <span class="team-chat-message-time">${formatTime(msg.created_at)}</span>
                  </div>
                  <div class="team-chat-message-text">${escapeHtml(msg.message)}</div>
                </div>
              </div>
            `).join('')
          }
        </div>

        <div class="team-chat-input-container">
          <textarea 
            id="teamChatInput" 
            class="team-chat-input" 
            placeholder="Type a message..."
            onkeypress="if(event.key==='Enter' && !event.shiftKey) { TeamChat.sendMessageFromInput(); event.preventDefault(); }"
          ></textarea>
          <button class="team-chat-send-btn" onclick="TeamChat.sendMessageFromInput()">Send</button>
        </div>
      </div>
    `;
  }

  function showMessagesTab() {
    state.activeTab = 'messages';
    const team = state.teams.find(t => t.id === state.activeTeam);
    const members = state.members[state.activeTeam] || [];
    const messages = state.messages[state.activeTeam] || [];
    
    const content = document.getElementById('teamChatContent');
    if (content) {
      content.innerHTML = renderMessagesTab(team, members, messages);
      requestAnimationFrame(() => {
        const msgContainer = document.querySelector('.team-chat-messages');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
      });
    }
  }

  function updateMessagesView() {
    const team = state.teams.find(t => t.id === state.activeTeam);
    const messages = state.messages[state.activeTeam] || [];
    const messageContainer = document.querySelector('.team-chat-messages');
    const input = document.getElementById('teamChatInput');
    const draft = input ? input.value : null;
    const selectionStart = input ? input.selectionStart : null;
    const selectionEnd = input ? input.selectionEnd : null;

    if (!messageContainer) {
      return;
    }

    messageContainer.innerHTML = messages.length === 0 ?
      '<div class="team-chat-empty-messages">No messages yet. Start the conversation!</div>' :
      messages.map(msg => `
        <div class="team-chat-message ${msg.user_id === state.currentUser?.id ? 'me' : ''}">
          <div class="team-chat-message-avatar" style="background-color: ${msg.color}">
            ${msg.initials}
          </div>
          <div class="team-chat-message-content">
            <div class="team-chat-message-header">
              <span class="team-chat-message-name">${msg.user_name}</span>
              <span class="team-chat-message-time">${formatTime(msg.created_at)}</span>
            </div>
            <div class="team-chat-message-text">${escapeHtml(msg.message)}</div>
          </div>
        </div>
      `).join('');

    if (input && draft !== null) {
      input.value = draft;
      if (selectionStart !== null && selectionEnd !== null) {
        input.setSelectionRange(selectionStart, selectionEnd);
      }
    }

    requestAnimationFrame(() => {
      if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
    });
  }

  function showMembersTab() {
    state.activeTab = 'members';
    const team = state.teams.find(t => t.id === state.activeTeam);
    const members = state.members[state.activeTeam] || [];

    const content = document.getElementById('teamChatContent');
    if (content) {
      content.innerHTML = renderMembersTab(team, members);
      // Populate member select with account users
      loadAccountUsers();
    }
  }

  function renderMembersTab(team, members) {
    return `
      <div class="team-chat-members-container">
        <div class="team-chat-members-list">
          <h4 style="margin: 0 0 16px; font-size: 14px; color: var(--gold); text-transform: uppercase; font-weight: 700;">Team Members (${members.length})</h4>
          ${members.map(member => `
            <div class="team-chat-member-item">
              <div class="team-chat-member-avatar" style="background-color: ${member.color}">
                ${member.initials}
              </div>
              <div class="team-chat-member-info">
                <div class="team-chat-member-name">${member.name}</div>
                <div class="team-chat-member-role">${member.team_role}</div>
              </div>
              ${team?.created_by === state.currentUser?.id && member.id !== state.currentUser?.id ? `
                <button 
                  class="team-chat-member-remove" 
                  onclick="TeamChat.removeMember('${state.activeTeam}', '${member.id}')"
                  title="Remove member"
                >×</button>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="team-chat-add-member">
          <h4 style="margin: 0 0 12px; font-size: 14px; color: var(--gold); text-transform: uppercase; font-weight: 700;">Add Team Member</h4>
          <select id="teamChatMemberSelect" class="team-chat-select">
            <option value="">Select a user...</option>
          </select>
          <button class="btn-gold" onclick="TeamChat.addSelectedMember()" style="width: 100%; margin-top: 8px;">Add Member</button>
        </div>

        ${team?.created_by === state.currentUser?.id ? `
          <div class="team-chat-danger-zone">
            <h4 style="margin: 0 0 12px; font-size: 14px; color: #9B2D3F; text-transform: uppercase; font-weight: 700;">Danger Zone</h4>
            <button class="action-btn danger" onclick="TeamChat.deleteTeam('${state.activeTeam}')" style="width: 100%;">Delete Team</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  async function loadAccountUsers() {
    try {
      const response = await fetch('/nextchapter/api/users', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) return;
      const result = await response.json();
      const users = result.data || [];
      const members = state.members[state.activeTeam] || [];
      const memberIds = members.map(m => m.id);

      const select = document.getElementById('teamChatMemberSelect');
      if (select) {
        users.forEach(user => {
          if (!memberIds.includes(user.id) && user.id !== state.currentUser?.id) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            select.appendChild(option);
          }
        });
      }
    } catch (error) {
      console.error('Error loading account users:', error);
    }
  }

  function addSelectedMember() {
    const select = document.getElementById('teamChatMemberSelect');
    if (!select || !select.value) {
      alert('Please select a user');
      return;
    }
    addMember(state.activeTeam, select.value);
  }

  async function sendMessageFromInput() {
    const input = document.getElementById('teamChatInput');
    if (!input) return;
    
    const message = input.value;
    if (!message.trim()) return;

    const sent = await sendMessage(state.activeTeam, message);
    if (sent !== false) {
      input.value = '';
    }
  }

  function showCreateForm() {
    const name = prompt('Enter team name:');
    if (!name) return;
    
    const description = prompt('Enter team description (optional):') || '';
    createTeam(name, description);
  }

  function closePanel() {
    const panel = document.getElementById('teamChatPanel');
    if (panel) panel.style.display = 'none';
  }

  // Utility functions
  function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function getGchatMembers() {
    return state.members[state.activeTeam] || [];
    }
  

  // Public API
  return {
    init,
    loadTeams,
    loadTeamMembers,
    createTeam,
    setActiveTeam,
    addMember,
    removeMember,
    sendMessage,
    deleteTeam,
    showCreateForm,
    closePanel,
    showMessagesTab,
    showMembersTab,
    addSelectedMember,
    sendMessageFromInput,
    getGchatMembers,
    getState: () => state
  };
})();
