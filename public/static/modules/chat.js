/* ═══ Module: Chat (원내 메신저) ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, navigate, esc, toast, state, showModal, closeModal, debounce, timeAgo } = PFM;

/* ──── 채팅 상태 ──── */
let chatState = {
  rooms: [],
  currentRoom: null,
  messages: [],
  reads: {},
  users: [],
  quickMessages: [],
  pollTimer: null,
  lastMsgTime: null,
  unreadTotal: 0,
  chatPanelOpen: false,
  view: 'rooms', // 'rooms' | 'chat' | 'new_dm' | 'new_group'
};

/* ──── 유틸 ──── */
function roleLabel(role, pos, isDoc) {
  if (isDoc) return '원장';
  if (role === 'admin') return '관리자';
  if (role === 'manager') return '실장';
  if (pos) return pos;
  return '스태프';
}
function roleColor(role, isDoc) {
  if (isDoc) return '#0f766e';
  if (role === 'admin') return '#7c3aed';
  if (role === 'manager') return '#2563eb';
  return '#64748b';
}
function teamLabel(team) {
  const map = { clinical: '진료팀', front: '프론트', support: '지원팀' };
  return map[team] || team || '';
}
function formatTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '방금';
  if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 86400000 * 2) return '어제';
  return (d.getMonth() + 1) + '/' + d.getDate();
}
function msgTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/* ──── API 호출 ──── */
async function fetchRooms() {
  chatState.rooms = await api('/api/protected/chat/rooms');
}
async function fetchMessages(roomId, append) {
  const params = append && chatState.messages.length > 0 ? '?before=' + chatState.messages[0].created_at : '';
  const data = await api('/api/protected/chat/rooms/' + roomId + '/messages' + params);
  if (append) {
    chatState.messages = [...data.messages, ...chatState.messages];
  } else {
    chatState.messages = data.messages;
  }
  chatState.reads = {};
  for (const r of data.reads) chatState.reads[r.user_id] = r;
  chatState.lastMsgTime = chatState.messages.length > 0 ? chatState.messages[chatState.messages.length - 1].created_at : null;
  return data;
}
async function pollNewMessages() {
  if (!chatState.currentRoom || !chatState.lastMsgTime) return;
  try {
    const data = await api('/api/protected/chat/rooms/' + chatState.currentRoom + '/messages/new?after=' + chatState.lastMsgTime);
    if (data.messages && data.messages.length > 0) {
      chatState.messages.push(...data.messages);
      chatState.lastMsgTime = data.messages[data.messages.length - 1].created_at;
      for (const r of data.reads) chatState.reads[r.user_id] = r;
      renderChatMessages();
      scrollToBottom();
    } else if (data.reads) {
      let changed = false;
      for (const r of data.reads) {
        if (!chatState.reads[r.user_id] || chatState.reads[r.user_id].last_read_at !== r.last_read_at) changed = true;
        chatState.reads[r.user_id] = r;
      }
      if (changed) renderChatMessages();
    }
  } catch(e) { /* silent */ }
}
async function fetchUnreadCount() {
  try {
    const data = await api('/api/protected/chat/unread-count');
    chatState.unreadTotal = data.unread || 0;
    updateBadge();
  } catch(e) { /* silent */ }
}

/* ──── 읽지않은 배지 업데이트 ──── */
function updateBadge() {
  const badge = document.getElementById('chatUnreadBadge');
  if (badge) {
    badge.textContent = chatState.unreadTotal > 99 ? '99+' : chatState.unreadTotal;
    badge.style.display = chatState.unreadTotal > 0 ? 'flex' : 'none';
  }
  // 사이드바 배지도
  const navBadge = document.getElementById('chatNavBadge');
  if (navBadge) {
    navBadge.textContent = chatState.unreadTotal > 99 ? '99+' : chatState.unreadTotal;
    navBadge.style.display = chatState.unreadTotal > 0 ? 'inline-flex' : 'none';
  }
}

/* ──── 채팅 사이드 패널 ──── */
function openChatPanel() {
  chatState.chatPanelOpen = true;
  chatState.view = 'rooms';
  let panel = document.getElementById('chatPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'chatPanel';
    panel.className = 'chat-panel';
    document.body.appendChild(panel);
    
    // 백드롭 (모바일)
    const backdrop = document.createElement('div');
    backdrop.id = 'chatPanelBackdrop';
    backdrop.className = 'chat-panel-backdrop';
    backdrop.onclick = closeChatPanel;
    document.body.appendChild(backdrop);
  }
  panel.classList.add('open');
  document.getElementById('chatPanelBackdrop')?.classList.add('open');
  renderChatPanel();
  fetchRooms().then(() => renderChatPanel());
  fetchUnreadCount();
  startGlobalPoll();
}

function closeChatPanel() {
  chatState.chatPanelOpen = false;
  chatState.currentRoom = null;
  stopPoll();
  const panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
  document.getElementById('chatPanelBackdrop')?.classList.remove('open');
}

/* ──── 폴링 시작/중지 ──── */
function startPoll() {
  stopPoll();
  chatState.pollTimer = setInterval(() => {
    pollNewMessages();
  }, 2000);
}
function stopPoll() {
  if (chatState.pollTimer) { clearInterval(chatState.pollTimer); chatState.pollTimer = null; }
}
let _globalPollTimer = null;
function startGlobalPoll() {
  if (_globalPollTimer) return;
  _globalPollTimer = setInterval(fetchUnreadCount, 15000);
}

/* ──── 패널 렌더링 ──── */
function renderChatPanel() {
  const panel = document.getElementById('chatPanel');
  if (!panel) return;
  
  switch(chatState.view) {
    case 'rooms': renderRoomList(panel); break;
    case 'chat': renderChatView(panel); break;
    case 'new_dm': renderNewDM(panel); break;
    case 'new_group': renderNewGroup(panel); break;
  }
}

/* ──── 채팅방 목록 ──── */
function renderRoomList(panel) {
  const rooms = chatState.rooms || [];
  panel.innerHTML = `
    <div class="chat-panel-header">
      <div class="chat-panel-header-title">
        <span class="chat-panel-icon">💬</span>
        <h3>원내 메신저</h3>
      </div>
      <div class="chat-panel-header-actions">
        <button class="chat-btn-icon" id="chatNewBtn" title="새 대화">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="chat-btn-icon" id="chatCloseBtn" title="닫기">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="chat-room-list" id="chatRoomList">
      ${rooms.length === 0 ? `
        <div class="chat-empty">
          <div style="font-size:48px;margin-bottom:12px">💬</div>
          <p style="font-weight:600;color:#1e293b">대화가 없습니다</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:4px">+ 버튼을 눌러 대화를 시작하세요</p>
        </div>
      ` : rooms.map(r => {
        const unread = r.unread_count || 0;
        const lastMsg = r.last_message || '';
        const truncMsg = lastMsg.length > 30 ? lastMsg.slice(0, 30) + '...' : lastMsg;
        const isGroup = r.type === 'group';
        const memberCount = (r.members || []).length;
        return `
          <div class="chat-room-item ${unread > 0 ? 'unread' : ''}" data-room="${r.id}">
            <div class="chat-room-avatar ${isGroup ? 'group' : ''}">
              ${isGroup ? '👥' : (r.display_name || '?')[0]}
            </div>
            <div class="chat-room-info">
              <div class="chat-room-name">
                ${esc(r.display_name || '채팅방')}
                ${isGroup ? '<span class="chat-room-count">' + memberCount + '</span>' : ''}
              </div>
              <div class="chat-room-last-msg">${esc(truncMsg)}</div>
            </div>
            <div class="chat-room-meta">
              <div class="chat-room-time">${formatTime(r.last_message_at)}</div>
              ${unread > 0 ? '<div class="chat-room-badge">' + (unread > 99 ? '99+' : unread) + '</div>' : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
    
  // 이벤트 바인딩
  panel.querySelector('#chatCloseBtn')?.addEventListener('click', closeChatPanel);
  panel.querySelector('#chatNewBtn')?.addEventListener('click', () => {
    chatState.view = 'new_dm';
    renderChatPanel();
    fetchUsers();
  });
  panel.querySelectorAll('.chat-room-item').forEach(el => {
    el.addEventListener('click', () => openRoom(el.dataset.room));
  });
}

/* ──── 채팅 뷰 (메시지) ──── */
async function openRoom(roomId) {
  chatState.currentRoom = roomId;
  chatState.view = 'chat';
  chatState.messages = [];
  renderChatPanel(); // 로딩 UI 먼저
  await fetchMessages(roomId);
  renderChatPanel();
  scrollToBottom();
  startPoll();
  // 읽음 처리
  api('/api/protected/chat/rooms/' + roomId + '/read', { method: 'POST' }).catch(() => {});
  fetchUnreadCount();
}

function renderChatView(panel) {
  const room = chatState.rooms.find(r => r.id === chatState.currentRoom);
  const roomName = room?.display_name || '채팅방';
  const isGroup = room?.type === 'group';
  const members = room?.members || [];
  
  panel.innerHTML = `
    <div class="chat-panel-header">
      <button class="chat-btn-icon" id="chatBackBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="chat-panel-header-title" style="flex:1;margin-left:8px">
        <h3 style="font-size:14px">${esc(roomName)}</h3>
        ${isGroup ? '<span style="font-size:11px;color:#94a3b8">' + members.length + '명</span>' : ''}
      </div>
      <button class="chat-btn-icon" id="chatQuickBtn" title="퀵 메시지">⚡</button>
      <button class="chat-btn-icon" id="chatCloseBtn2" title="닫기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-quick-bar hidden" id="chatQuickBar"></div>
    <div class="chat-input-area">
      <input type="text" class="chat-input" id="chatInput" placeholder="메시지를 입력하세요..." autocomplete="off" maxlength="2000">
      <button class="chat-send-btn" id="chatSendBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;
    
  renderChatMessages();
  
  // 이벤트
  panel.querySelector('#chatBackBtn')?.addEventListener('click', () => {
    stopPoll();
    chatState.currentRoom = null;
    chatState.view = 'rooms';
    fetchRooms().then(() => renderChatPanel());
    fetchUnreadCount();
  });
  panel.querySelector('#chatCloseBtn2')?.addEventListener('click', closeChatPanel);
  
  const input = panel.querySelector('#chatInput');
  const sendBtn = panel.querySelector('#chatSendBtn');
  
  async function sendMessage(msg, type, meta) {
    if (!msg || !msg.trim()) return;
    try {
      await api('/api/protected/chat/rooms/' + chatState.currentRoom + '/messages', {
        method: 'POST',
        body: JSON.stringify({ message: msg.trim(), message_type: type || 'text', metadata: meta || {} })
      });
      input.value = '';
      pollNewMessages();
    } catch(e) { toast(e.message || '전송 실패'); }
  }
  
  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
  });
  input.focus();
  
  // 퀵 메시지 토글
  let quickOpen = false;
  panel.querySelector('#chatQuickBtn')?.addEventListener('click', async () => {
    quickOpen = !quickOpen;
    const bar = panel.querySelector('#chatQuickBar');
    if (quickOpen) {
      bar.classList.remove('hidden');
      if (chatState.quickMessages.length === 0) {
        chatState.quickMessages = await api('/api/protected/chat/quick-messages');
      }
      renderQuickBar(bar, (msg) => {
        sendMessage(msg, 'quick');
        quickOpen = false;
        bar.classList.add('hidden');
      });
    } else {
      bar.classList.add('hidden');
    }
  });
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  
  const msgs = chatState.messages;
  const myId = state.user?.id;
  
  if (msgs.length === 0) {
    container.innerHTML = '<div class="chat-empty" style="padding-top:60px"><div style="font-size:40px;margin-bottom:8px">👋</div><p style="color:#94a3b8;font-size:13px">대화를 시작하세요!</p></div>';
    return;
  }
  
  let html = '';
  let lastDate = '';
  
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const isMine = m.sender_id === myId;
    const dateStr = new Date(m.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    
    // 날짜 구분선
    if (dateStr !== lastDate) {
      html += '<div class="chat-date-divider"><span>' + dateStr + '</span></div>';
      lastDate = dateStr;
    }
    
    // 같은 발신자 연속 여부
    const prevMsg = i > 0 ? msgs[i - 1] : null;
    const showAvatar = !prevMsg || prevMsg.sender_id !== m.sender_id || (new Date(m.created_at) - new Date(prevMsg.created_at)) > 300000;
    
    // 읽음 확인 계산
    const readBy = [];
    for (const [uid, rd] of Object.entries(chatState.reads)) {
      if (uid !== myId && rd.last_read_at >= m.created_at) {
        readBy.push(rd.name);
      }
    }
    const readLabel = readBy.length > 0 ? '읽음 ' + readBy.length : '';
    
    // 메시지 내용
    let content = esc(m.message);
    if (m.message_type === 'quick') {
      content = '<span class="chat-msg-quick">⚡</span> ' + content;
    } else if (m.message_type === 'board_link') {
      try {
        const meta = JSON.parse(m.metadata || '{}');
        content += meta.patient_name ? '<div class="chat-msg-board-link" data-board="' + esc(meta.board_id || '') + '">📋 ' + esc(meta.patient_name) + ' - ' + esc(meta.treatment_desc || '') + '</div>' : '';
      } catch(e) {}
    }
    
    if (isMine) {
      html += `
        <div class="chat-msg mine ${showAvatar ? '' : 'consecutive'}">
          <div class="chat-msg-content">
            <div class="chat-bubble mine">${content}</div>
            <div class="chat-msg-meta">
              ${readLabel ? '<span class="chat-read-label">' + readLabel + '</span>' : ''}
              <span class="chat-msg-time">${msgTime(m.created_at)}</span>
            </div>
          </div>
        </div>`;
    } else {
      html += `
        <div class="chat-msg other ${showAvatar ? '' : 'consecutive'}">
          ${showAvatar ? `
            <div class="chat-msg-avatar" style="background:${roleColor(m.sender_role, m.sender_is_doctor)}">${(m.sender_name || '?')[0]}</div>
          ` : '<div class="chat-msg-avatar-spacer"></div>'}
          <div class="chat-msg-content">
            ${showAvatar ? '<div class="chat-msg-sender"><span class="chat-msg-sender-name">' + esc(m.sender_name) + '</span><span class="chat-msg-sender-role">' + roleLabel(m.sender_role, m.sender_position, m.sender_is_doctor) + '</span></div>' : ''}
            <div class="chat-bubble other">${content}</div>
            <div class="chat-msg-meta"><span class="chat-msg-time">${msgTime(m.created_at)}</span></div>
          </div>
        </div>`;
    }
  }
  
  container.innerHTML = html;
  
  // Board link 클릭 시 진료보드로 이동
  container.querySelectorAll('.chat-msg-board-link').forEach(el => {
    el.addEventListener('click', () => {
      closeChatPanel();
      navigate('clinical_board');
    });
  });
}

function scrollToBottom() {
  setTimeout(() => {
    const c = document.getElementById('chatMessages');
    if (c) c.scrollTop = c.scrollHeight;
  }, 50);
}

/* ──── 퀵 메시지 바 ──── */
function renderQuickBar(bar, onSelect) {
  const categories = { chair: '🪥 체어', patient: '🏥 환자', general: '💬 일반', emergency: '🚨 긴급' };
  const grouped = {};
  for (const qm of chatState.quickMessages) {
    if (!grouped[qm.category]) grouped[qm.category] = [];
    grouped[qm.category].push(qm);
  }
  
  let html = '<div class="chat-quick-list">';
  for (const [cat, label] of Object.entries(categories)) {
    if (!grouped[cat] || grouped[cat].length === 0) continue;
    html += '<div class="chat-quick-category">' + label + '</div>';
    for (const qm of grouped[cat]) {
      html += '<button class="chat-quick-item ${cat === \'emergency\' ? \'emergency\' : \'\'}" data-msg="' + esc(qm.message) + '">' + qm.icon + ' ' + esc(qm.label) + '</button>';
    }
  }
  html += '</div>';
  bar.innerHTML = html;
  
  bar.querySelectorAll('.chat-quick-item').forEach(btn => {
    btn.addEventListener('click', () => onSelect(btn.dataset.msg));
  });
}

/* ──── 새 DM 시작 ──── */
async function fetchUsers() {
  if (chatState.users.length === 0) {
    chatState.users = await api('/api/protected/chat/users');
  }
  renderChatPanel();
}

function renderNewDM(panel) {
  const users = chatState.users || [];
  panel.innerHTML = `
    <div class="chat-panel-header">
      <button class="chat-btn-icon" id="chatBackNew">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="chat-panel-header-title" style="flex:1;margin-left:8px">
        <h3 style="font-size:14px">새 대화</h3>
      </div>
      <button class="chat-btn-icon" id="chatGroupBtn" title="그룹 채팅" style="font-size:12px;padding:4px 8px;background:#f0fdf4;border-radius:6px;color:#0f766e;font-weight:600">👥 그룹</button>
    </div>
    <div class="chat-search-bar">
      <input type="text" id="chatUserSearch" class="chat-search-input" placeholder="이름으로 검색..." autocomplete="off">
    </div>
    <div class="chat-user-list" id="chatUserList">
      ${users.map(u => `
        <div class="chat-user-item" data-uid="${u.id}">
          <div class="chat-user-avatar" style="background:${roleColor(u.role, u.is_doctor)}">${(u.name||'?')[0]}</div>
          <div class="chat-user-info">
            <div class="chat-user-name">${esc(u.name)}</div>
            <div class="chat-user-role">${roleLabel(u.role, u.position, u.is_doctor)} ${teamLabel(u.team) ? '· ' + teamLabel(u.team) : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
    
  panel.querySelector('#chatBackNew')?.addEventListener('click', () => {
    chatState.view = 'rooms';
    renderChatPanel();
  });
  panel.querySelector('#chatGroupBtn')?.addEventListener('click', () => {
    chatState.view = 'new_group';
    renderChatPanel();
  });
  
  // 검색
  panel.querySelector('#chatUserSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    panel.querySelectorAll('.chat-user-item').forEach(el => {
      const name = el.querySelector('.chat-user-name')?.textContent?.toLowerCase() || '';
      el.style.display = name.includes(q) ? '' : 'none';
    });
  });
  
  // 유저 클릭 → DM 생성
  panel.querySelectorAll('.chat-user-item').forEach(el => {
    el.addEventListener('click', async () => {
      try {
        const data = await api('/api/protected/chat/rooms/dm', {
          method: 'POST', body: JSON.stringify({ target_user_id: el.dataset.uid })
        });
        await fetchRooms();
        openRoom(data.room_id);
      } catch(e) { toast(e.message || 'DM 생성 실패'); }
    });
  });
}

/* ──── 그룹 채팅 생성 ──── */
function renderNewGroup(panel) {
  const users = chatState.users || [];
  const selected = new Set();
  
  panel.innerHTML = `
    <div class="chat-panel-header">
      <button class="chat-btn-icon" id="chatBackGroup">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="chat-panel-header-title" style="flex:1;margin-left:8px">
        <h3 style="font-size:14px">그룹 채팅 만들기</h3>
      </div>
    </div>
    <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9">
      <input type="text" id="groupName" class="chat-search-input" placeholder="그룹명 입력" style="margin-bottom:8px">
      <div id="selectedMembers" class="chat-selected-members"></div>
    </div>
    <div class="chat-user-list" id="groupUserList">
      ${users.map(u => `
        <label class="chat-user-item" data-uid="${u.id}" style="cursor:pointer">
          <input type="checkbox" class="chat-user-check" value="${u.id}" style="margin-right:10px">
          <div class="chat-user-avatar" style="background:${roleColor(u.role, u.is_doctor)}">${(u.name||'?')[0]}</div>
          <div class="chat-user-info">
            <div class="chat-user-name">${esc(u.name)}</div>
            <div class="chat-user-role">${roleLabel(u.role, u.position, u.is_doctor)}</div>
          </div>
        </label>
      `).join('')}
    </div>
    <div class="chat-panel-footer">
      <button class="chat-create-group-btn" id="createGroupBtn" disabled>그룹 만들기</button>
    </div>`;
    
  panel.querySelector('#chatBackGroup')?.addEventListener('click', () => {
    chatState.view = 'new_dm';
    renderChatPanel();
  });
  
  function updateCreateBtn() {
    const btn = panel.querySelector('#createGroupBtn');
    btn.disabled = selected.size < 1 || !panel.querySelector('#groupName').value.trim();
  }
  
  panel.querySelector('#groupName')?.addEventListener('input', updateCreateBtn);
  panel.querySelectorAll('.chat-user-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(cb.value); else selected.delete(cb.value);
      updateCreateBtn();
    });
  });
  
  panel.querySelector('#createGroupBtn')?.addEventListener('click', async () => {
    const name = panel.querySelector('#groupName').value.trim();
    if (!name || selected.size < 1) return;
    try {
      const data = await api('/api/protected/chat/rooms/group', {
        method: 'POST', body: JSON.stringify({ name, member_ids: Array.from(selected) })
      });
      await fetchRooms();
      openRoom(data.room_id);
    } catch(e) { toast(e.message || '그룹 생성 실패'); }
  });
}

/* ──── 진료보드 퀵메시지 연동 ──── */
async function sendBoardMessage(targetUserId, boardItem) {
  try {
    // DM 방 생성/가져오기
    const roomData = await api('/api/protected/chat/rooms/dm', {
      method: 'POST', body: JSON.stringify({ target_user_id: targetUserId })
    });
    // 보드 연동 메시지 전송
    const msg = '📋 [진료보드] ' + (boardItem.patient_name || '') + ' - ' + (boardItem.treatment_desc || boardItem.status || '');
    await api('/api/protected/chat/rooms/' + roomData.room_id + '/messages', {
      method: 'POST', body: JSON.stringify({
        message: msg,
        message_type: 'board_link',
        metadata: { board_id: boardItem.id, patient_name: boardItem.patient_name, treatment_desc: boardItem.treatment_desc }
      })
    });
    toast('메시지를 전송했습니다 ✓');
  } catch(e) { toast(e.message || '메시지 전송 실패'); }
}

/* ──── 전용 페이지 렌더 (네비게이션 메뉴용) ──── */
async function renderMessenger(body, actions) {
  await PFM.withErrorBoundary(body, async () => {
    // 전용 페이지에서는 사이드 패널 대신 메인 영역에 채팅 UI를 표시
    openChatPanel();
    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:300px;text-align:center">
        <div>
          <div style="font-size:64px;margin-bottom:16px">💬</div>
          <h3 style="font-weight:700;color:#1e293b;margin-bottom:8px">원내 메신저</h3>
          <p style="color:#64748b;font-size:13px">우측 채팅 패널에서 대화할 수 있습니다</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:4px">데스크 ↔ 원장 ↔ 위생사 빠른 소통</p>
        </div>
      </div>`;
  });
}

/* ──── 초기 부팅 시 unread 폴링 시작 ──── */
function initChat() {
  if (state.user) {
    fetchUnreadCount();
    startGlobalPoll();
  }
}

/* ──── Module Registration ──── */
PFM.modules.chat = {
  renderMessenger,
  openChatPanel,
  closeChatPanel,
  sendBoardMessage,
  initChat,
  fetchUnreadCount,
  getUnreadCount: () => chatState.unreadTotal,
};

})(window.PFM);
