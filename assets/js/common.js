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