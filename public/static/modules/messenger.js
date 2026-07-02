/* ═══════════════════════════════════════════════════════════
 * Patient Funnel OS — Messenger Module v5.5.0 Phase B
 * Patient Chat 통합 — PFM 안에서 동작하는 슬랙 스타일 메신저
 *
 * 백엔드 라우트 매핑:
 *   GET    /api/protected/messenger/init                       — 초기화 + 부트스트랩
 *   GET    /api/protected/messenger/poll[?since=&channelId=]   — 1-2s 폴링
 *   GET    /api/protected/messenger/poll/badge                 — 배지용 카운트
 *   POST   /api/protected/messenger/poll/presence              — presence 변경
 *   GET    /api/protected/messenger/channels                   — 채널 목록
 *   POST   /api/protected/messenger/channels                   — 채널 생성
 *   GET    /api/protected/messenger/channels/:id               — 채널 상세
 *   POST   /api/protected/messenger/channels/dm                — DM 시작
 *   GET    /api/protected/messenger/channels/users/directory   — 사용자 검색
 *   GET    /api/protected/messenger/channels/:id/messages      — 메시지 목록
 *   POST   /api/protected/messenger/channels/:id/messages      — 메시지 발송
 *   POST   /api/protected/messenger/channels/:id/typing        — 타이핑 신호
 *   POST   /api/protected/messenger/channels/:id/read          — 모두 읽음
 *   POST   /api/protected/messenger/messages/:id/reaction      — 리액션 토글
 *   POST   /api/protected/messenger/messages/:id/confirm       — 확인 표시
 *   DELETE /api/protected/messenger/messages/:id               — 메시지 삭제
 *   GET    /api/protected/messenger/search?q=                  — 검색
 * ═══════════════════════════════════════════════════════════ */

(function(PFM) {
'use strict';
const { api, ICONS, esc, toast, state, navigate } = PFM;

/* ─── 모듈 상태 ─── */
let mState = {
  initialized: false,
  channels: [],
  currentChannel: null,
  messages: [],
  users: [],
  myProfile: null,
  settings: null,
  pollTimer: null,
  lastPollAt: null,
  pollCount: 0,          // v5.5.1: fast-path 보정용 카운터 (~10회마다 full sync)
  unreadByChannel: {},
  typing: [],
  pendingConfirms: [],
  searchOpen: false,
};

/* ─── 카테고리 정렬 ─── */
const CATEGORY_ORDER = ['경영', '진료', '상담/데스크', 'DM', '기타'];

/* ─── 시각 포맷 ─── */
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d)) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays < 7) {
    return ['일','월','화','수','목','금','토'][d.getDay()] + ' ' +
           d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function roleLabel(role, mrole, pos) {
  if (mrole === 'owner') return '원장';
  if (mrole === 'admin') return '관리자';
  if (mrole === 'manager' || role === 'manager') return '실장';
  if (mrole === 'team_lead') return '팀장';
  if (pos) return pos;
  return '직원';
}

function roleBadgeColor(mrole, role) {
  if (mrole === 'owner' || role === 'admin') return '#0f766e';
  if (mrole === 'manager' || role === 'manager') return '#7c3aed';
  if (mrole === 'team_lead') return '#0369a1';
  return '#64748b';
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function presenceDot(status) {
  const map = { online: '#10b981', away: '#f59e0b', dnd: '#ef4444', offline: '#94a3b8' };
  const color = map[status] || '#94a3b8';
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle"></span>`;
}

/* ─── 안전 textContent 렌더 (XSS 방어) ─── */
function safeContent(text) {
  // 백엔드가 이미 HTML-escape 한 문자열을 보냄 — 그대로 출력
  // 줄바꿈만 <br> 로 변환
  return String(text || '').replace(/\n/g, '<br>');
}

/* ═══════════════════════════════════════════════
 * 메인 렌더링
 * ═══════════════════════════════════════════════ */
async function renderMessenger(body, actions) {
  if (actions) actions.innerHTML = '';

  body.innerHTML = `
    <style>
      .msg-app {
        display: grid;
        grid-template-columns: 280px 1fr;
        height: calc(100vh - 80px);
        max-height: calc(100vh - 80px);
        background: #f8fafc;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
      .msg-sidebar {
        background: #1f2937;
        color: #e5e7eb;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .msg-side-header {
        padding: 16px;
        border-bottom: 1px solid #374151;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .msg-side-title { font-weight: 700; font-size: 15px; }
      .msg-side-actions { display: flex; gap: 8px; }
      .msg-side-btn {
        background: rgba(255,255,255,0.08);
        border: none; color: #fff; cursor: pointer;
        width: 28px; height: 28px; border-radius: 6px;
        display: inline-flex; align-items: center; justify-content: center;
        transition: background .15s;
      }
      .msg-side-btn:hover { background: rgba(255,255,255,0.18); }
      .msg-side-btn svg { width: 14px; height: 14px; stroke: #fff; }
      .msg-cat-group { margin: 12px 0 4px; padding: 0 12px; }
      .msg-cat-label {
        font-size: 11px; text-transform: uppercase; color: #9ca3af;
        font-weight: 700; letter-spacing: .04em; padding: 4px 4px; margin-bottom: 2px;
      }
      .msg-ch-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 7px 10px; border-radius: 6px; cursor: pointer;
        font-size: 13.5px; color: #d1d5db;
        transition: background .15s;
      }
      .msg-ch-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
      .msg-ch-item.active { background: #2563eb; color: #fff; font-weight: 600; }
      .msg-ch-name { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .msg-ch-unread {
        background: #ef4444; color: #fff; border-radius: 10px;
        padding: 1px 7px; font-size: 11px; font-weight: 700; min-width: 18px; text-align: center;
      }
      .msg-ch-urgent { color: #fca5a5; }
      .msg-presence {
        margin-top: auto; padding: 12px 16px; border-top: 1px solid #374151;
        font-size: 12px; color: #9ca3af;
      }
      .msg-presence-select {
        margin-top: 6px; width: 100%;
        background: rgba(255,255,255,0.08); border: 1px solid #374151;
        color: #fff; padding: 6px 8px; border-radius: 6px; font-size: 12px;
      }

      .msg-main {
        display: flex; flex-direction: column;
        background: #fff;
        min-width: 0;
      }
      .msg-main-header {
        padding: 14px 20px; border-bottom: 1px solid #e5e7eb;
        display: flex; align-items: center; justify-content: space-between;
        background: #fff;
      }
      .msg-main-title { font-weight: 700; font-size: 17px; color: #1f2937; }
      .msg-main-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .msg-main-actions { display: flex; gap: 8px; align-items: center; }
      .msg-main-btn {
        background: #f3f4f6; border: none; padding: 6px 12px; font-size: 12px;
        border-radius: 6px; cursor: pointer; font-weight: 600; color: #374151;
        transition: background .15s;
      }
      .msg-main-btn:hover { background: #e5e7eb; }

      .msg-list {
        flex: 1; overflow-y: auto; padding: 16px 20px;
        background: #fafbfc;
        display: flex; flex-direction: column; gap: 8px;
      }
      .msg-empty {
        text-align: center; color: #9ca3af; padding: 60px 20px;
        font-size: 14px;
      }
      .msg-item {
        display: flex; gap: 12px; padding: 8px 0;
      }
      .msg-avatar {
        width: 36px; height: 36px; border-radius: 8px;
        background: #e0e7ff; color: #4338ca;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 14px; flex-shrink: 0;
      }
      .msg-body { flex: 1; min-width: 0; }
      .msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
      .msg-author { font-weight: 700; font-size: 13.5px; color: #111827; }
      .msg-role-badge {
        font-size: 10px; padding: 1px 6px; border-radius: 4px;
        color: #fff; font-weight: 600;
      }
      .msg-time { font-size: 11px; color: #9ca3af; }
      .msg-content {
        font-size: 13.5px; color: #1f2937; line-height: 1.5;
        word-break: break-word;
      }
      .msg-tags { display: flex; gap: 6px; margin-top: 4px; }
      .msg-tag {
        font-size: 10.5px; padding: 1px 7px; border-radius: 10px;
        font-weight: 600;
      }
      .msg-tag.urgent { background: #fee2e2; color: #b91c1c; }
      .msg-tag.confirm { background: #fef3c7; color: #92400e; }
      .msg-tag.pinned { background: #dbeafe; color: #1e40af; }
      .msg-reactions { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
      .msg-reaction {
        background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px;
        padding: 1px 8px; font-size: 12px; cursor: pointer;
        transition: background .15s;
      }
      .msg-reaction:hover { background: #e5e7eb; }
      .msg-reaction.mine { background: #dbeafe; border-color: #93c5fd; }
      .msg-readinfo {
        font-size: 10.5px; color: #9ca3af; margin-top: 2px;
      }
      .msg-confirm-btn {
        background: #f59e0b; color: #fff; border: none;
        padding: 3px 10px; border-radius: 4px; font-size: 11px;
        font-weight: 600; cursor: pointer; margin-left: 6px;
      }
      .msg-confirm-btn:hover { background: #d97706; }
      .msg-confirm-btn:disabled { background: #d1d5db; cursor: default; }
      .msg-actions-row {
        opacity: 0; transition: opacity .15s;
        display: flex; gap: 6px; margin-top: 4px;
      }
      .msg-item:hover .msg-actions-row { opacity: 1; }
      .msg-action-btn {
        background: transparent; border: none; color: #6b7280;
        font-size: 12px; cursor: pointer; padding: 2px 6px;
      }
      .msg-action-btn:hover { color: #1f2937; }

      .msg-typing { font-size: 11.5px; color: #9ca3af; padding: 4px 20px 0; height: 18px; font-style: italic; }

      .msg-composer {
        border-top: 1px solid #e5e7eb; padding: 12px 20px;
        background: #fff;
      }
      .msg-composer-row {
        display: flex; gap: 8px; align-items: flex-end;
      }
      .msg-input {
        flex: 1; min-height: 38px; max-height: 160px;
        padding: 9px 12px; font-size: 14px; line-height: 1.4;
        border: 1px solid #d1d5db; border-radius: 8px;
        resize: none; outline: none;
        font-family: inherit;
      }
      .msg-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
      .msg-send {
        padding: 9px 16px; background: #2563eb; color: #fff;
        border: none; border-radius: 8px; font-weight: 700; font-size: 13px;
        cursor: pointer; transition: background .15s;
      }
      .msg-send:hover { background: #1d4ed8; }
      .msg-send:disabled { background: #d1d5db; cursor: default; }
      .msg-composer-tools {
        display: flex; gap: 12px; padding: 6px 0 0;
        font-size: 12px; color: #6b7280;
      }
      .msg-composer-tools label {
        display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
      }

      .msg-pending-panel {
        background: #fef3c7; border-bottom: 1px solid #fcd34d;
        padding: 10px 20px; font-size: 13px;
      }
      .msg-pending-item {
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 0;
      }
      .msg-pending-link {
        color: #b91c1c; text-decoration: underline; cursor: pointer; font-weight: 600;
      }

      @media (max-width: 900px) {
        .msg-app { grid-template-columns: 1fr; }
        .msg-sidebar.has-current { display: none; }
      }
    </style>

    <div class="msg-app" id="msgApp">
      <aside class="msg-sidebar" id="msgSidebar">
        <div class="msg-side-header">
          <div class="msg-side-title">💬 메신저</div>
          <div class="msg-side-actions">
            <button class="msg-side-btn" id="msgBtnSearch" title="검색">${ICONS.search}</button>
            <button class="msg-side-btn" id="msgBtnNewChannel" title="채널 만들기">${ICONS.plus}</button>
            <button class="msg-side-btn" id="msgBtnNewDm" title="DM 시작">${ICONS.users}</button>
            <button class="msg-side-btn" id="msgBtnNotifSettings" title="알림 설정">🔔</button>
            <button class="msg-side-btn" id="msgBtnOpsDashboard" title="운영 대시보드 (관리자)">🛡️</button>
          </div>
        </div>
        <div id="msgChannelList" style="flex:1 1 50%; overflow-y:auto; padding:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="padding:40px 16px; text-align:center; color:#9ca3af; font-size:12px;">로딩 중...</div>
        </div>

        <!-- 동료 (Directory) — Phase F.1 -->
        <div class="msg-directory" style="flex:1 1 50%; display:flex; flex-direction:column; min-height:0;">
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px 6px; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
            <span id="msgDirHeader">동료 · <span id="msgDirOnlineCount">0</span></span>
            <div style="display:flex; gap:4px;">
              <button id="msgDirToggleOnline" title="온라인만" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:11px; padding:2px 4px; border-radius:3px;">🟢</button>
              <button id="msgDirRefresh" title="새로고침" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:11px; padding:2px 4px;">↻</button>
            </div>
          </div>
          <input id="msgDirSearch" type="text" placeholder="이름/부서 검색" style="margin:0 12px 8px; padding:6px 10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); border-radius:6px; color:#e5e7eb; font-size:12px; outline:none;" />
          <div id="msgDirList" style="flex:1; overflow-y:auto; padding:0 6px 8px;">
            <div style="padding:20px 12px; text-align:center; color:#9ca3af; font-size:11px;">로딩...</div>
          </div>
        </div>

        <div class="msg-presence">
          <div>내 상태</div>
          <select class="msg-presence-select" id="msgPresenceSelect">
            <option value="online">🟢 온라인</option>
            <option value="away">🟡 자리 비움</option>
            <option value="dnd">🔴 방해 금지</option>
            <option value="offline">⚪ 오프라인</option>
          </select>
        </div>
      </aside>

      <section class="msg-main">
        <div class="msg-main-header" id="msgHeader">
          <div>
            <div class="msg-main-title">채널을 선택하세요</div>
            <div class="msg-main-sub">왼쪽에서 채널을 선택하면 대화를 시작할 수 있습니다.</div>
          </div>
        </div>
        <div id="msgPendingPanel"></div>
        <div class="msg-list" id="msgList">
          <div class="msg-empty">💬 좌측에서 채널을 선택해주세요</div>
        </div>
        <div class="msg-typing" id="msgTypingArea"></div>
        <div class="msg-composer" id="msgComposer" style="display:none">
          <!-- 단축어 자동완성 팝업 (Phase F.3) -->
          <div id="msgQrPopup" style="display:none; position:absolute; bottom:100%; left:12px; right:80px; max-height:240px; overflow-y:auto; background:#1f2937; border:1px solid #374151; border-radius:8px; box-shadow:0 -4px 16px rgba(0,0,0,.4); z-index:50; margin-bottom:6px;"></div>
          <div class="msg-composer-row" style="position:relative;">
            <textarea class="msg-input" id="msgInput" placeholder="메시지를 입력하세요 (Enter 전송, / 입력 시 단축어, Shift+Enter 줄바꿈)" rows="1"></textarea>
            <button class="msg-send" id="msgSendBtn">전송</button>
          </div>
          <div class="msg-composer-tools">
            <label><input type="checkbox" id="msgChkUrgent"> 🚨 긴급</label>
            <label><input type="checkbox" id="msgChkConfirm"> ✅ 확인 필수</label>
            <button id="msgBtnSchedule" title="예약 발송" style="margin-left:auto; background:transparent; border:1px solid #d1d5db; border-radius:6px; padding:3px 10px; font-size:11px; cursor:pointer; color:#6b7280;">📅 예약</button>
            <button id="msgBtnQrManage" title="단축어 관리" style="background:transparent; border:1px solid #d1d5db; border-radius:6px; padding:3px 10px; font-size:11px; cursor:pointer; color:#6b7280;">⚡ 단축어</button>
          </div>
        </div>
      </section>
    </div>
  `;

  // 초기화 호출
  try {
    const init = await api('/api/protected/messenger/init');
    mState.myProfile = init.profile;
    mState.settings = init.settings;
    mState.initialized = true;
    if (init.bootstrap && init.bootstrap.ranBootstrap) {
      toast(`✨ 기본 채널 ${init.bootstrap.createdChannels}개 생성됨`, 'success');
    }
    // presence select 동기화
    const pSel = document.getElementById('msgPresenceSelect');
    if (pSel && init.profile?.presence_status) pSel.value = init.profile.presence_status;
  } catch (e) {
    toast('메신저 초기화 실패: ' + e.message, 'error');
    return;
  }

  await loadChannels();
  await loadQuickReplies(); // Phase F.3 — 단축어 캐시
  bindMessengerEvents();
  startPolling();

  // 페이지 떠날 때 폴링 정리
  window._pfmStopPolling = stopPolling;
}

/* ═══════════════════════════════════════════════
 * 채널 목록
 * ═══════════════════════════════════════════════ */
async function loadChannels() {
  try {
    const res = await api('/api/protected/messenger/channels');
    mState.channels = res.channels || [];
    renderChannelList();
  } catch (e) {
    toast('채널 로드 실패: ' + e.message, 'error');
  }
}

function renderChannelList() {
  const el = document.getElementById('msgChannelList');
  if (!el) return;
  if (mState.channels.length === 0) {
    el.innerHTML = '<div style="padding:30px 16px; text-align:center; color:#9ca3af; font-size:12px;">채널이 없습니다.</div>';
    return;
  }

  // 카테고리별 그룹핑
  const groups = {};
  for (const c of mState.channels) {
    const cat = c.category || '기타';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  }
  const sortedCats = Object.keys(groups).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  let html = '';
  for (const cat of sortedCats) {
    html += `<div class="msg-cat-group">
      <div class="msg-cat-label">${esc(cat)}</div>`;
    for (const ch of groups[cat]) {
      const active = mState.currentChannel?.id === ch.id;
      const unread = ch.unread_count || 0;
      html += `
        <div class="msg-ch-item ${active ? 'active' : ''}" data-ch="${esc(ch.id)}">
          <span class="msg-ch-name">${esc(ch.name)}</span>
          ${unread > 0 ? `<span class="msg-ch-unread">${unread > 99 ? '99+' : unread}</span>` : ''}
        </div>`;
    }
    html += '</div>';
  }
  el.innerHTML = html;

  el.querySelectorAll('.msg-ch-item').forEach(node => {
    node.addEventListener('click', () => {
      const chId = node.getAttribute('data-ch');
      const ch = mState.channels.find(c => c.id === chId);
      if (ch) openChannel(ch);
    });
  });
}

/* ═══════════════════════════════════════════════
 * 채널 열기
 * ═══════════════════════════════════════════════ */
async function openChannel(channel) {
  mState.currentChannel = channel;

  // 헤더 갱신
  const header = document.getElementById('msgHeader');
  if (header) {
    header.innerHTML = `
      <div>
        <div class="msg-main-title">${esc(channel.name)}</div>
        <div class="msg-main-sub">
          ${esc(channel.description || channel.category || '')} · 멤버 ${channel.member_count || 0}명
        </div>
      </div>
      <div class="msg-main-actions">
        <button class="msg-main-btn" id="msgBtnMembers">멤버</button>
        <button class="msg-main-btn" id="msgBtnReload">새로고침</button>
      </div>`;
    header.querySelector('#msgBtnReload')?.addEventListener('click', () => loadMessages(true));
    header.querySelector('#msgBtnMembers')?.addEventListener('click', () => showMembersModal(channel));
  }

  // composer 표시
  const composer = document.getElementById('msgComposer');
  if (composer) {
    composer.style.display = '';
    // 공지 채널 + write_restricted + 본인 admin/manager 아니면 비활성화
    const restricted = channel.write_restricted && channel.channel_role !== 'admin' &&
                       state.user?.role !== 'admin' && state.user?.role !== 'manager';
    const inp = document.getElementById('msgInput');
    const sbtn = document.getElementById('msgSendBtn');
    if (inp && sbtn) {
      inp.disabled = !!restricted;
      sbtn.disabled = !!restricted;
      inp.placeholder = restricted ? '관리자만 작성할 수 있는 채널입니다' : '메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)';
    }
  }

  renderChannelList();  // active 표시 갱신
  await loadMessages();

  // 모두 읽음
  api(`/api/protected/messenger/channels/${channel.id}/read`, { method: 'POST' }).catch(() => {});
}

/* ═══════════════════════════════════════════════
 * 메시지 목록
 * ═══════════════════════════════════════════════ */
async function loadMessages(scroll = true) {
  if (!mState.currentChannel) return;
  const list = document.getElementById('msgList');
  if (!list) return;

  try {
    const res = await api(`/api/protected/messenger/channels/${mState.currentChannel.id}/messages?limit=100`);
    mState.messages = res.messages || [];
    renderMessages();
    if (scroll) scrollToBottom();
  } catch (e) {
    list.innerHTML = `<div class="msg-empty">메시지 로드 실패: ${esc(e.message)}</div>`;
  }
}

function renderMessages() {
  const list = document.getElementById('msgList');
  if (!list) return;
  if (mState.messages.length === 0) {
    list.innerHTML = '<div class="msg-empty">아직 메시지가 없어요. 첫 메시지를 보내보세요! 💬</div>';
    return;
  }
  list.innerHTML = mState.messages.map(m => renderMessageItem(m)).join('');

  // 리액션 클릭
  list.querySelectorAll('[data-react-msg]').forEach(node => {
    node.addEventListener('click', () => {
      const msgId = node.getAttribute('data-react-msg');
      const emoji = node.getAttribute('data-react-emoji');
      toggleReaction(msgId, emoji);
    });
  });

  // 확인 버튼
  list.querySelectorAll('[data-confirm-msg]').forEach(node => {
    node.addEventListener('click', () => confirmMessage(node.getAttribute('data-confirm-msg')));
  });

  // + 리액션 추가 버튼
  list.querySelectorAll('[data-react-add]').forEach(node => {
    node.addEventListener('click', () => {
      const msgId = node.getAttribute('data-react-add');
      const e = prompt('이모지 입력 (예: 👍 ❤️ 🎉)');
      if (e) toggleReaction(msgId, e.trim());
    });
  });

  // 삭제 버튼
  list.querySelectorAll('[data-delete-msg]').forEach(node => {
    node.addEventListener('click', () => {
      const msgId = node.getAttribute('data-delete-msg');
      if (confirm('이 메시지를 삭제할까요?')) deleteMessage(msgId);
    });
  });
}

function renderMessageItem(m) {
  const me = state.user?.id;
  const isMe = m.user_id === me;
  const initial = (m.user_name || '?')[0];
  const badgeColor = roleBadgeColor(m.user_messenger_role, m.user_role);
  const roleTxt = roleLabel(m.user_role, m.user_messenger_role);
  const reactions = m.reactions || {};
  const reactionHtml = Object.keys(reactions).map(emoji => {
    const users = reactions[emoji] || [];
    const mine = users.includes(me);
    return `<span class="msg-reaction ${mine?'mine':''}" data-react-msg="${esc(m.id)}" data-react-emoji="${esc(emoji)}">${esc(emoji)} ${users.length}</span>`;
  }).join('');

  const tags = [];
  if (m.is_urgent) tags.push('<span class="msg-tag urgent">🚨 긴급</span>');
  if (m.confirm_required) tags.push('<span class="msg-tag confirm">✅ 확인 필수</span>');
  if (m.is_pinned) tags.push('<span class="msg-tag pinned">📌 고정</span>');

  // 확인 버튼: confirm_required + 본인 아닌 메시지
  const showConfirmBtn = m.confirm_required && !isMe;

  // 읽음 정보
  const readInfo = (m.read_count != null && m.total_members != null && m.read_count > 0)
    ? `<div class="msg-readinfo">읽음 ${m.read_count}/${m.total_members}${m.confirm_required && m.confirm_count != null ? ` · 확인 ${m.confirm_count}/${m.total_members - (isMe ? 0 : 1)}` : ''}</div>`
    : '';

  return `
    <div class="msg-item" data-msg-id="${esc(m.id)}">
      <div class="msg-avatar" style="background:${badgeColor}22;color:${badgeColor}">${esc(initial)}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-author">${esc(m.user_name || '?')}</span>
          <span class="msg-role-badge" style="background:${badgeColor}">${esc(roleTxt)}</span>
          <span class="msg-time">${fmtTime(m.created_at)}</span>
          ${m.updated_at && m.updated_at !== m.created_at ? '<span class="msg-time">(수정됨)</span>' : ''}
        </div>
        <div class="msg-content">${safeContent(m.content)}</div>
        ${tags.length ? `<div class="msg-tags">${tags.join('')}${showConfirmBtn ? `<button class="msg-confirm-btn" data-confirm-msg="${esc(m.id)}">확인</button>` : ''}</div>` : ''}
        ${reactionHtml ? `<div class="msg-reactions">${reactionHtml}<span class="msg-reaction" data-react-add="${esc(m.id)}" title="리액션 추가">+</span></div>` : ''}
        ${readInfo}
        <div class="msg-actions-row">
          <button class="msg-action-btn" data-react-add="${esc(m.id)}">😀 리액션</button>
          ${isMe ? `<button class="msg-action-btn" data-delete-msg="${esc(m.id)}">🗑 삭제</button>` : ''}
        </div>
      </div>
    </div>`;
}

function scrollToBottom() {
  const list = document.getElementById('msgList');
  if (list) list.scrollTop = list.scrollHeight;
}

/* ═══════════════════════════════════════════════
 * 메시지 발송
 * ═══════════════════════════════════════════════ */
async function sendMessage() {
  if (!mState.currentChannel) return;
  const inp = document.getElementById('msgInput');
  const sbtn = document.getElementById('msgSendBtn');
  const urgent = document.getElementById('msgChkUrgent')?.checked;
  const confirm = document.getElementById('msgChkConfirm')?.checked;
  const content = (inp?.value || '').trim();
  if (!content) return;

  sbtn.disabled = true;
  try {
    await api(`/api/protected/messenger/channels/${mState.currentChannel.id}/messages`, {
      method: 'POST', json: {
        content, is_urgent: !!urgent, confirm_required: !!confirm,
      }
    });
    inp.value = '';
    if (urgent) document.getElementById('msgChkUrgent').checked = false;
    if (confirm) document.getElementById('msgChkConfirm').checked = false;
    autoResize(inp);
    await loadMessages(true);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    sbtn.disabled = false;
    inp?.focus();
  }
}

async function toggleReaction(msgId, emoji) {
  try {
    const res = await api(`/api/protected/messenger/messages/${msgId}/reaction`, {
      method: 'POST', json: { emoji }
    });
    const m = mState.messages.find(x => x.id === msgId);
    if (m) m.reactions = res.reactions;
    renderMessages();
  } catch (e) { toast(e.message, 'error'); }
}

async function confirmMessage(msgId) {
  try {
    await api(`/api/protected/messenger/messages/${msgId}/confirm`, { method: 'POST' });
    toast('확인 완료 ✓', 'success');
    // 해당 메시지에서 confirm 표시 제거
    const m = mState.messages.find(x => x.id === msgId);
    if (m) m.confirm_count = (m.confirm_count || 0) + 1;
    // pendingConfirms 에서 제거
    mState.pendingConfirms = mState.pendingConfirms.filter(p => p.id !== msgId);
    renderPendingPanel();
    renderMessages();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteMessage(msgId) {
  try {
    await api(`/api/protected/messenger/messages/${msgId}`, { method: 'DELETE' });
    await loadMessages(false);
    toast('삭제됨', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

/* ═══════════════════════════════════════════════
 * 폴링
 * ═══════════════════════════════════════════════ */
/* v5.5.1: 백그라운드 탭은 3초 → 15초로 완화 (D1 부하 절감) */
const POLL_INTERVAL_ACTIVE = 3000;
const POLL_INTERVAL_HIDDEN = 15000;

function startPolling() {
  stopPolling();
  mState.lastPollAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const interval = document.hidden ? POLL_INTERVAL_HIDDEN : POLL_INTERVAL_ACTIVE;
  mState.pollTimer = setInterval(pollOnce, interval);
  if (!mState._visListener) {
    mState._visListener = () => {
      if (!mState.pollTimer) return;
      clearInterval(mState.pollTimer);
      mState.pollTimer = setInterval(pollOnce, document.hidden ? POLL_INTERVAL_HIDDEN : POLL_INTERVAL_ACTIVE);
      if (!document.hidden) { mState.pollCount = 0; pollOnce(); } // 탭 복귀 즉시 full 동기화
    };
    document.addEventListener('visibilitychange', mState._visListener);
  }
}
function stopPolling() {
  if (mState.pollTimer) clearInterval(mState.pollTimer);
  mState.pollTimer = null;
  // 페이지 이탈 시 디렉토리 폴링 + heartbeat 도 함께 정리 (타이머 누수 방지)
  if (mState.dirInterval) { clearInterval(mState.dirInterval); mState.dirInterval = null; }
  if (mState.heartbeatInterval) { clearInterval(mState.heartbeatInterval); mState.heartbeatInterval = null; }
}
async function pollOnce() {
  if (!mState.initialized) return;
  try {
    const q = new URLSearchParams();
    if (mState.lastPollAt) q.set('since', mState.lastPollAt);
    if (mState.currentChannel) q.set('channelId', mState.currentChannel.id);
    // ~10회마다 1번 full 동기화 (읽음수/presence/배지 드리프트 보정)
    mState.pollCount = (mState.pollCount || 0) + 1;
    if (mState.pollCount % 10 === 1) q.set('full', '1');
    const res = await api(`/api/protected/messenger/poll?${q.toString()}`);
    mState.lastPollAt = res.serverTime || mState.lastPollAt;

    // fast-path: 변화 없음 — 타이핑만 갱신하고 종료
    if (res.unchanged) {
      mState.typing = res.typing || [];
      renderTyping();
      return;
    }

    // 새 메시지가 있으면 현재 채널 갱신
    if (res.newMessages && res.newMessages.length > 0 && mState.currentChannel) {
      // 중복 제거하면서 append
      const existing = new Set(mState.messages.map(m => m.id));
      const fresh = res.newMessages.filter(m => !existing.has(m.id));
      if (fresh.length > 0) {
        mState.messages.push(...fresh);
        const list = document.getElementById('msgList');
        const atBottom = list && (list.scrollHeight - list.scrollTop - list.clientHeight < 80);
        renderMessages();
        if (atBottom) scrollToBottom();
      }
    }

    // unread 갱신 (사이드바)
    if (res.unreadCounts) {
      const map = {};
      for (const u of res.unreadCounts) map[u.channel_id] = u.unread_count;
      for (const ch of mState.channels) {
        ch.unread_count = map[ch.id] || 0;
      }
      renderChannelList();
    }

    // pendingConfirms 갱신
    mState.pendingConfirms = res.pendingConfirms || [];
    renderPendingPanel();

    // 긴급 호출
    if (res.urgentCalls && res.urgentCalls.length > 0) {
      for (const uc of res.urgentCalls) {
        toast(`🚨 긴급: ${uc.caller_name} — ${uc.message?.substring(0, 60)}`, 'error');
      }
    }

    // 타이핑
    mState.typing = res.typing || [];
    renderTyping();
  } catch (e) {
    // 폴링 에러는 조용히 무시 (다음 사이클에 재시도)
  }
}

function renderPendingPanel() {
  const panel = document.getElementById('msgPendingPanel');
  if (!panel) return;
  if (!mState.pendingConfirms || mState.pendingConfirms.length === 0) {
    panel.innerHTML = '';
    return;
  }
  panel.innerHTML = `
    <div class="msg-pending-panel">
      <div style="font-weight:700; margin-bottom:6px;">⚠️ 확인이 필요한 메시지 ${mState.pendingConfirms.length}건</div>
      ${mState.pendingConfirms.slice(0, 5).map(p => `
        <div class="msg-pending-item">
          <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <span class="msg-pending-link" data-go-ch="${esc(p.channel_id)}">[${esc(p.channel_name)}]</span>
            ${esc(p.sender_name)}: ${esc((p.content || '').substring(0, 80))}
          </div>
          <button class="msg-confirm-btn" data-pending-confirm="${esc(p.id)}">확인</button>
        </div>
      `).join('')}
    </div>`;
  panel.querySelectorAll('[data-go-ch]').forEach(n => {
    n.addEventListener('click', () => {
      const chId = n.getAttribute('data-go-ch');
      const ch = mState.channels.find(c => c.id === chId);
      if (ch) openChannel(ch);
    });
  });
  panel.querySelectorAll('[data-pending-confirm]').forEach(n => {
    n.addEventListener('click', () => confirmMessage(n.getAttribute('data-pending-confirm')));
  });
}

function renderTyping() {
  const area = document.getElementById('msgTypingArea');
  if (!area) return;
  if (!mState.typing || mState.typing.length === 0) {
    area.textContent = '';
    return;
  }
  const names = mState.typing.map(t => t.userName).join(', ');
  area.textContent = `✏️ ${names}님이 입력 중...`;
}

/* ═══════════════════════════════════════════════
 * 이벤트 바인딩
 * ═══════════════════════════════════════════════ */
function bindMessengerEvents() {
  // 메시지 입력
  const inp = document.getElementById('msgInput');
  if (inp) {
    inp.addEventListener('input', () => {
      autoResize(inp);
      // 단축어 자동완성 (Phase F.3)
      handleQrAutocomplete(inp);
      // 타이핑 신호 (debounce 1초)
      if (mState.currentChannel) {
        clearTimeout(inp._typingTimer);
        inp._typingTimer = setTimeout(() => {
          api(`/api/protected/messenger/channels/${mState.currentChannel.id}/typing`,
            { method: 'POST' }).catch(() => {});
        }, 800);
      }
    });
    inp.addEventListener('keydown', (e) => {
      // 단축어 팝업 열려있으면 ↑↓ Enter Esc 처리
      const popup = document.getElementById('msgQrPopup');
      if (popup && popup.style.display !== 'none') {
        if (e.key === 'Escape') { e.preventDefault(); popup.style.display = 'none'; return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); moveQrSelection(e.key === 'ArrowDown' ? 1 : -1); return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          const sel = popup.querySelector('.qr-popup-item.selected');
          if (sel) { e.preventDefault(); applyQrItem(sel.dataset.qrId); return; }
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  document.getElementById('msgSendBtn')?.addEventListener('click', sendMessage);

  // Phase F.3 — 예약 발송 + 단축어 관리
  document.getElementById('msgBtnSchedule')?.addEventListener('click', showScheduleModal);
  document.getElementById('msgBtnQrManage')?.addEventListener('click', showQrManageModal);

  // presence 변경 (기존 poll 라우트 + 새 directory 라우트 둘 다)
  document.getElementById('msgPresenceSelect')?.addEventListener('change', async (e) => {
    try {
      await api('/api/protected/messenger/directory/presence', {
        method: 'POST', json: { status: e.target.value }
      });
      toast('상태 변경됨', 'success');
      loadDirectory(); // 본인 상태 변경 후 디렉토리 갱신
    } catch (err) { toast(err.message, 'error'); }
  });

  // ─── F.1 동료 디렉토리 ───
  let dirOnlineOnly = false;
  const dirSearchEl = document.getElementById('msgDirSearch');
  const dirListEl = document.getElementById('msgDirList');
  const dirOnlineCountEl = document.getElementById('msgDirOnlineCount');
  const dirToggleBtn = document.getElementById('msgDirToggleOnline');
  const dirRefreshBtn = document.getElementById('msgDirRefresh');

  let dirSearchTimer = null;
  async function loadDirectory() {
    if (!dirListEl) return;
    const q = (dirSearchEl?.value || '').trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (dirOnlineOnly) params.set('online', '1');
    params.set('limit', '100');
    try {
      const res = await api('/api/protected/messenger/directory?' + params.toString());
      dirOnlineCountEl.textContent = res.online_count || 0;
      if (!res.users || res.users.length === 0) {
        dirListEl.innerHTML = '<div style="padding:16px 12px; text-align:center; color:#9ca3af; font-size:11px;">' + (q ? '검색 결과 없음' : '동료가 없습니다') + '</div>';
        return;
      }
      const html = res.users.map(u => {
        const eff = u.presence?.effective || 'offline';
        const loc = u.presence?.location ? ' · ' + escapeHtml(u.presence.location) : '';
        const dept = u.department ? ' · ' + escapeHtml(u.department) : '';
        return `
          <div class="msg-dir-user" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name)}"
               style="display:flex; align-items:center; padding:6px 10px; border-radius:6px; cursor:pointer; color:#e5e7eb; font-size:12px;"
               onmouseover="this.style.background='rgba(255,255,255,0.06)'"
               onmouseout="this.style.background='transparent'">
            ${presenceDot(eff)}
            <div style="flex:1; min-width:0;">
              <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(u.name)}${u.is_doctor ? ' <span style="color:#fbbf24">·원장</span>' : ''}
              </div>
              <div style="font-size:10px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(u.position || u.messenger_role || '')}${dept}${loc}
              </div>
            </div>
          </div>`;
      }).join('');
      dirListEl.innerHTML = html;
      // DM 시작 핸들러
      dirListEl.querySelectorAll('.msg-dir-user').forEach(el => {
        el.addEventListener('click', async () => {
          const uid = el.dataset.userId;
          const uname = el.dataset.userName;
          try {
            const r = await api('/api/protected/messenger/channels/dm', {
              method: 'POST', json: { target_user_id: uid }
            });
            toast('DM ' + (r.existing ? '열기' : '시작'), 'success');
            // 채널 리스트 갱신 + 해당 채널 열기
            await loadChannels?.();
            if (r.channel && typeof openChannel === 'function') openChannel(r.channel);
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    } catch (err) {
      dirListEl.innerHTML = '<div style="padding:16px 12px; text-align:center; color:#ef4444; font-size:11px;">오류: ' + escapeHtml(err.message) + '</div>';
    }
  }

  dirSearchEl?.addEventListener('input', () => {
    clearTimeout(dirSearchTimer);
    dirSearchTimer = setTimeout(loadDirectory, 250);
  });
  dirToggleBtn?.addEventListener('click', () => {
    dirOnlineOnly = !dirOnlineOnly;
    dirToggleBtn.style.background = dirOnlineOnly ? 'rgba(16,185,129,0.2)' : 'transparent';
    loadDirectory();
  });
  dirRefreshBtn?.addEventListener('click', loadDirectory);

  // 최초 로드
  loadDirectory();

  // 30초마다 디렉토리 갱신 (presence 반영)
  if (mState.dirInterval) clearInterval(mState.dirInterval);
  mState.dirInterval = setInterval(loadDirectory, 30000);

  // 30초마다 heartbeat — 본인 활성 유지
  if (mState.heartbeatInterval) clearInterval(mState.heartbeatInterval);
  mState.heartbeatInterval = setInterval(async () => {
    try {
      await api('/api/protected/messenger/directory/heartbeat', { method: 'POST', json: {} });
    } catch (_) { /* 조용히 무시 */ }
  }, 30000);

  // 새 채널
  document.getElementById('msgBtnNewChannel')?.addEventListener('click', showNewChannelModal);

  // 새 DM
  document.getElementById('msgBtnNewDm')?.addEventListener('click', showNewDmModal);

  // 검색
  document.getElementById('msgBtnSearch')?.addEventListener('click', showSearchModal);

  // 알림 설정 (F.2)
  document.getElementById('msgBtnNotifSettings')?.addEventListener('click', showNotifSettingsModal);
  document.getElementById('msgBtnOpsDashboard')?.addEventListener('click', showOpsDashboardModal);
}

/* ═══════════════════════════════════════════════
 * 알림 설정 모달 — Phase F.2
 * ═══════════════════════════════════════════════ */
async function showNotifSettingsModal() {
  // 현재 설정 불러오기
  let prefs;
  try {
    prefs = await api('/api/protected/messenger/notifications/preferences');
  } catch (e) {
    toast('알림 설정 로드 실패: ' + e.message, 'error');
    return;
  }
  const g = prefs.global || {};
  const perCh = prefs.per_channel || [];

  // 채널 목록 (오버라이드용)
  const channels = (mState.channels || []).filter(c => c.type !== 'dm');

  // 채널별 설정 row HTML
  const channelRowsHtml = channels.map(c => {
    const override = perCh.find(p => p.channel_id === c.id);
    const muted = override?.muted ? 'checked' : '';
    const mentionsOnly = override?.notify_mentions_only ? 'checked' : '';
    const hasOverride = !!override;
    return `
      <div class="msg-notif-channel-row" data-channel-id="${c.id}" style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.name)}</div>
        <label style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;">
          <input type="checkbox" class="notif-ch-muted" ${muted}> 음소거
        </label>
        <label style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;">
          <input type="checkbox" class="notif-ch-mentions" ${mentionsOnly}> 멘션만
        </label>
        <button class="notif-ch-reset" style="background:transparent;border:1px solid #e5e7eb;border-radius:4px;padding:2px 6px;font-size:10px;color:${hasOverride ? '#dc2626' : '#d1d5db'};cursor:${hasOverride ? 'pointer' : 'default'};" ${hasOverride ? '' : 'disabled'}>초기화</button>
      </div>
    `;
  }).join('');

  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgNotifModal">
      <div style="background:#fff;border-radius:12px;padding:0;max-width:560px;width:92%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
          <h3 style="margin:0;font-size:17px;font-weight:700;">🔔 알림 설정</h3>
          <button id="notifModalClose" style="background:transparent;border:none;font-size:22px;color:#9ca3af;cursor:pointer;line-height:1;">×</button>
        </div>

        <div style="padding:18px 24px;overflow-y:auto;flex:1;">
          <!-- 전역 설정 -->
          <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">전역</div>

          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f9fafb;border-radius:8px;margin-bottom:8px;cursor:pointer;">
            <input type="checkbox" id="notifGlobalMuted" ${g.muted ? 'checked' : ''}>
            <div style="flex:1;">
              <div style="font-weight:500;font-size:13px;">전체 음소거</div>
              <div style="font-size:11px;color:#6b7280;">긴급콜/L3 에스컬레이션은 우회됩니다</div>
            </div>
          </label>

          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f9fafb;border-radius:8px;margin-bottom:8px;cursor:pointer;">
            <input type="checkbox" id="notifGlobalMentionsOnly" ${g.notify_mentions_only ? 'checked' : ''}>
            <div style="flex:1;">
              <div style="font-weight:500;font-size:13px;">@멘션만 알림</div>
              <div style="font-size:11px;color:#6b7280;">나를 직접 멘션한 메시지만 받습니다</div>
            </div>
          </label>

          <!-- Quiet Hours -->
          <div style="padding:12px;background:#f9fafb;border-radius:8px;margin-bottom:8px;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" id="notifGlobalDnd" ${g.dnd_enabled ? 'checked' : ''}>
              <div style="flex:1;">
                <div style="font-weight:500;font-size:13px;">🌙 방해 금지 시간대</div>
                <div style="font-size:11px;color:#6b7280;">지정된 시간 동안 알림 무음 (긴급/L3 우회)</div>
              </div>
            </label>
            <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-left:28px;">
              <input type="time" id="notifDndStart" value="${g.dnd_start_time || '22:00'}" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;">
              <span style="font-size:12px;color:#6b7280;">~</span>
              <input type="time" id="notifDndEnd" value="${g.dnd_end_time || '07:00'}" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;">
              <span style="font-size:11px;color:#9ca3af;">(자정 넘김 OK)</span>
            </div>
          </div>

          <!-- 사운드/데스크탑 -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;">
            <label style="display:flex;align-items:center;gap:8px;padding:10px;background:#f9fafb;border-radius:8px;cursor:pointer;font-size:13px;">
              <input type="checkbox" id="notifGlobalSound" ${g.sound_enabled !== false ? 'checked' : ''}>
              🔊 사운드
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:10px;background:#f9fafb;border-radius:8px;cursor:pointer;font-size:13px;">
              <input type="checkbox" id="notifGlobalDesktop" ${g.desktop_enabled !== false ? 'checked' : ''}>
              🖥️ 데스크탑 알림
            </label>
          </div>

          <!-- 채널별 -->
          <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
            <span>채널별 오버라이드</span>
            <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#9ca3af;">${perCh.length}개 설정됨</span>
          </div>
          <div id="notifChannelList" style="border:1px solid #e5e7eb;border-radius:8px;max-height:240px;overflow-y:auto;">
            ${channelRowsHtml || '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;">채널이 없습니다</div>'}
          </div>
        </div>

        <div style="padding:14px 24px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;background:#fafafa;border-radius:0 0 12px 12px;">
          <button id="notifModalCancel" style="padding:8px 16px;background:#f3f4f6;border:none;border-radius:6px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;">취소</button>
          <button id="notifModalSave" style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">저장</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('msgNotifModal');
  const close = () => modal?.remove();

  modal.querySelector('#notifModalClose').addEventListener('click', close);
  modal.querySelector('#notifModalCancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // 채널별 toggle/reset 즉시 반영
  modal.querySelectorAll('.msg-notif-channel-row').forEach(row => {
    const chId = row.dataset.channelId;
    const muted = row.querySelector('.notif-ch-muted');
    const mentions = row.querySelector('.notif-ch-mentions');
    const reset = row.querySelector('.notif-ch-reset');

    const apply = async () => {
      try {
        await api(`/api/protected/messenger/notifications/preferences/${chId}`, {
          method: 'PUT',
          json: { muted: muted.checked, notify_mentions_only: mentions.checked }
        });
        reset.disabled = false;
        reset.style.cursor = 'pointer';
        reset.style.color = '#dc2626';
      } catch (e) { toast('채널 알림 저장 실패', 'error'); }
    };
    muted.addEventListener('change', apply);
    mentions.addEventListener('change', apply);

    reset.addEventListener('click', async () => {
      if (reset.disabled) return;
      try {
        await api(`/api/protected/messenger/notifications/preferences/${chId}`, { method: 'DELETE' });
        muted.checked = false;
        mentions.checked = false;
        reset.disabled = true;
        reset.style.cursor = 'default';
        reset.style.color = '#d1d5db';
        toast('채널 알림 초기화', 'success');
      } catch (e) { toast('초기화 실패', 'error'); }
    });
  });

  // 전역 저장
  modal.querySelector('#notifModalSave').addEventListener('click', async () => {
    const body = {
      muted: modal.querySelector('#notifGlobalMuted').checked,
      notify_mentions_only: modal.querySelector('#notifGlobalMentionsOnly').checked,
      dnd_enabled: modal.querySelector('#notifGlobalDnd').checked,
      dnd_start_time: modal.querySelector('#notifDndStart').value || null,
      dnd_end_time: modal.querySelector('#notifDndEnd').value || null,
      sound_enabled: modal.querySelector('#notifGlobalSound').checked,
      desktop_enabled: modal.querySelector('#notifGlobalDesktop').checked
    };
    try {
      await api('/api/protected/messenger/notifications/preferences', { method: 'PUT', json: body });
      toast('🔔 알림 설정 저장', 'success');
      close();
    } catch (e) {
      toast('저장 실패: ' + e.message, 'error');
    }
  });
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
}

/* ═══════════════════════════════════════════════
 * Phase F.3 — Quick Reply 자동완성 + Scheduled Messages
 * ═══════════════════════════════════════════════ */

// 단축어 캐시 (mState.quickReplies)
async function loadQuickReplies() {
  try {
    const res = await api('/api/protected/messenger/quick-replies');
    mState.quickReplies = res.replies || [];
  } catch (_) { mState.quickReplies = []; }
}

// input 이벤트 → / 로 시작하면 매칭되는 단축어 팝업 표시
function handleQrAutocomplete(inp) {
  const popup = document.getElementById('msgQrPopup');
  if (!popup) return;
  const val = inp.value;
  // 첫 토큰이 / 로 시작할 때만 (입력 시작 부근)
  const m = val.match(/^(\/[a-zA-Z0-9_\-가-힣]*)$/);
  if (!m) { popup.style.display = 'none'; return; }
  const query = m[1].toLowerCase();
  const list = (mState.quickReplies || [])
    .filter(q => q.shortcut.toLowerCase().startsWith(query))
    .slice(0, 8);
  if (!list.length) { popup.style.display = 'none'; return; }
  popup.innerHTML = list.map((q, i) => `
    <div class="qr-popup-item ${i === 0 ? 'selected' : ''}" data-qr-id="${q.id}"
         style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #374151; ${i === 0 ? 'background:#374151;' : ''}">
      <div style="display:flex; align-items:center; gap:8px;">
        <code style="background:#111827; color:#60a5fa; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">${escapeHtml(q.shortcut)}</code>
        <span style="font-size:12px; color:#e5e7eb; font-weight:500;">${escapeHtml(q.title)}</span>
        ${q.is_shared ? '<span style="font-size:9px; color:#fbbf24; background:#451a03; padding:1px 5px; border-radius:3px;">공유</span>' : ''}
      </div>
      <div style="font-size:11px; color:#9ca3af; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(q.body.slice(0, 80))}</div>
    </div>
  `).join('');
  popup.style.display = 'block';
  // 클릭 이벤트
  popup.querySelectorAll('.qr-popup-item').forEach(el => {
    el.addEventListener('click', () => applyQrItem(el.dataset.qrId));
    el.addEventListener('mouseenter', () => {
      popup.querySelectorAll('.qr-popup-item').forEach(x => {
        x.classList.remove('selected');
        x.style.background = 'transparent';
      });
      el.classList.add('selected');
      el.style.background = '#374151';
    });
  });
}

function moveQrSelection(delta) {
  const popup = document.getElementById('msgQrPopup');
  const items = [...popup.querySelectorAll('.qr-popup-item')];
  const idx = items.findIndex(x => x.classList.contains('selected'));
  if (idx < 0) return;
  const next = (idx + delta + items.length) % items.length;
  items.forEach((x, i) => {
    x.classList.toggle('selected', i === next);
    x.style.background = i === next ? '#374151' : 'transparent';
  });
  items[next]?.scrollIntoView({ block: 'nearest' });
}

async function applyQrItem(qrId) {
  const popup = document.getElementById('msgQrPopup');
  const inp = document.getElementById('msgInput');
  if (!inp) return;
  try {
    // 현재 채널/스레드 컨텍스트 전달
    const ctx = {
      patient_name: mState.currentPatientThread?.patient_name || '',
      channel_name: mState.currentChannel?.name || '',
      user_name: mState.myProfile?.name || ''
    };
    const res = await api(`/api/protected/messenger/quick-replies/${qrId}/use`, {
      method: 'POST', json: { context: ctx }
    });
    inp.value = res.body;
    autoResize(inp);
    inp.focus();
    if (popup) popup.style.display = 'none';
  } catch (e) {
    toast('단축어 적용 실패: ' + e.message, 'error');
  }
}

// 예약 발송 모달
function showScheduleModal() {
  if (!mState.currentChannel) {
    toast('먼저 채널을 선택하세요', 'warning');
    return;
  }
  const inp = document.getElementById('msgInput');
  const draftContent = inp?.value?.trim() || '';
  const ch = mState.currentChannel;

  // 기본값: 1시간 후
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const localStr = `${future.getFullYear()}-${pad(future.getMonth()+1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;

  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgSchedModal">
      <div style="background:#fff;border-radius:12px;max-width:520px;width:92%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="padding:18px 22px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
          <h3 style="margin:0;font-size:16px;font-weight:700;">📅 예약 발송 — <span style="color:#6b7280;">${escapeHtml(ch.name)}</span></h3>
          <button id="schedClose" style="background:transparent;border:none;font-size:22px;color:#9ca3af;cursor:pointer;line-height:1;">×</button>
        </div>
        <div style="padding:18px 22px;overflow-y:auto;flex:1;">
          <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;">메시지</label>
          <textarea id="schedContent" rows="4" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;resize:vertical;" placeholder="발송할 메시지 내용">${escapeHtml(draftContent)}</textarea>

          <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin:14px 0 6px;">발송 시각</label>
          <input id="schedAt" type="datetime-local" value="${localStr}" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">최대 90일 이내 · 1분 후부터 예약 가능</div>

          <div style="display:flex;gap:14px;margin-top:14px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;cursor:pointer;">
              <input type="checkbox" id="schedUrgent"> 🚨 긴급
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;cursor:pointer;">
              <input type="checkbox" id="schedConfirm"> ✅ 확인 필수
            </label>
          </div>

          <!-- 내 예약 목록 -->
          <div style="margin-top:18px;border-top:1px solid #e5e7eb;padding-top:14px;">
            <div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:8px;">⏳ 대기 중인 내 예약</div>
            <div id="schedPendingList" style="max-height:160px;overflow-y:auto;font-size:12px;">
              <div style="color:#9ca3af;text-align:center;padding:10px;">로딩...</div>
            </div>
          </div>
        </div>
        <div style="padding:12px 22px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;background:#fafafa;border-radius:0 0 12px 12px;">
          <button id="schedCancel" style="padding:8px 16px;background:#f3f4f6;border:none;border-radius:6px;font-size:13px;color:#374151;cursor:pointer;">취소</button>
          <button id="schedSave" style="padding:8px 16px;background:#3b82f6;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">📅 예약 발송</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('msgSchedModal');
  const close = () => modal?.remove();
  modal.querySelector('#schedClose').addEventListener('click', close);
  modal.querySelector('#schedCancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // 대기 중인 예약 로딩
  const loadPending = async () => {
    try {
      const res = await api('/api/protected/messenger/scheduled?status=pending');
      const list = res.scheduled || [];
      const el = modal.querySelector('#schedPendingList');
      if (!list.length) {
        el.innerHTML = '<div style="color:#9ca3af;text-align:center;padding:10px;">예약된 메시지 없음</div>';
        return;
      }
      el.innerHTML = list.map(s => `
        <div data-sm-id="${s.id}" style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #f3f4f6;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;color:#6b7280;">📅 ${escapeHtml(s.scheduled_at)} · ${escapeHtml(s.channel_name || s.channel_id)}</div>
            <div style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.content)}</div>
          </div>
          <button class="sched-cancel-btn" data-sm-id="${s.id}" style="background:transparent;border:1px solid #fca5a5;color:#dc2626;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;">취소</button>
        </div>
      `).join('');
      el.querySelectorAll('.sched-cancel-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('이 예약을 취소하시겠습니까?')) return;
          try {
            await api(`/api/protected/messenger/scheduled/${btn.dataset.smId}`, { method: 'DELETE' });
            toast('예약 취소됨', 'success');
            loadPending();
          } catch (e) { toast('취소 실패: ' + e.message, 'error'); }
        });
      });
    } catch (e) {
      modal.querySelector('#schedPendingList').innerHTML = `<div style="color:#dc2626;padding:10px;">오류: ${escapeHtml(e.message)}</div>`;
    }
  };
  loadPending();

  // 저장
  modal.querySelector('#schedSave').addEventListener('click', async () => {
    const content = modal.querySelector('#schedContent').value.trim();
    const at = modal.querySelector('#schedAt').value;
    const urgent = modal.querySelector('#schedUrgent').checked;
    const confirmReq = modal.querySelector('#schedConfirm').checked;
    if (!content) { toast('메시지 내용을 입력하세요', 'warning'); return; }
    if (!at) { toast('발송 시각을 선택하세요', 'warning'); return; }
    try {
      const res = await api('/api/protected/messenger/scheduled', {
        method: 'POST',
        json: {
          channel_id: ch.id,
          content,
          scheduled_at: at.replace('T', ' ') + ':00',
          is_urgent: urgent,
          confirm_required: confirmReq
        }
      });
      toast(`📅 예약 완료 (${Math.floor(res.seconds_until/60)}분 후 발송)`, 'success');
      // 본문 비우기
      const inp = document.getElementById('msgInput');
      if (inp && inp.value === draftContent) { inp.value = ''; autoResize(inp); }
      loadPending();
    } catch (e) {
      toast('예약 실패: ' + e.message, 'error');
    }
  });
}

// 단축어 관리 모달
async function showQrManageModal() {
  let replies = [];
  try {
    const res = await api('/api/protected/messenger/quick-replies');
    replies = res.replies || [];
  } catch (e) {
    toast('단축어 로드 실패: ' + e.message, 'error');
    return;
  }

  const rowsHtml = replies.length ? replies.map(q => `
    <div data-qr-id="${q.id}" style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #f3f4f6;">
      <code style="background:#eff6ff;color:#1e40af;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">${escapeHtml(q.shortcut)}</code>
      <div style="min-width:0;">
        <div style="font-size:13px;font-weight:500;">${escapeHtml(q.title)} ${q.is_shared ? '<span style="font-size:9px;color:#92400e;background:#fef3c7;padding:1px 5px;border-radius:3px;margin-left:4px;">공유</span>' : ''}</div>
        <div style="font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(q.body)}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${q.use_count}회 사용</div>
      </div>
      <button class="qr-del-btn" data-qr-id="${q.id}" style="background:transparent;border:1px solid #fca5a5;color:#dc2626;padding:3px 10px;border-radius:4px;font-size:10px;cursor:pointer;">삭제</button>
    </div>
  `).join('') : '<div style="padding:30px;text-align:center;color:#9ca3af;font-size:13px;">아직 단축어가 없습니다</div>';

  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgQrModal">
      <div style="background:#fff;border-radius:12px;max-width:600px;width:92%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);">
        <div style="padding:18px 22px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
          <h3 style="margin:0;font-size:16px;font-weight:700;">⚡ 단축어 관리</h3>
          <button id="qrClose" style="background:transparent;border:none;font-size:22px;color:#9ca3af;cursor:pointer;line-height:1;">×</button>
        </div>
        <div style="padding:16px 22px;border-bottom:1px solid #e5e7eb;background:#f9fafb;">
          <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px;">➕ 새 단축어 추가</div>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;margin-bottom:8px;">
            <input id="qrShortcut" type="text" placeholder="/call" maxlength="32" style="padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:monospace;">
            <input id="qrTitle" type="text" placeholder="제목 (예: 전화 부탁)" maxlength="100" style="padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">
          </div>
          <textarea id="qrBody" rows="3" placeholder="본문 — {patient_name} {date} {time} {my_name} 사용 가능" maxlength="2000" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;font-family:inherit;resize:vertical;"></textarea>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;cursor:pointer;">
              <input type="checkbox" id="qrShared"> 🏥 병원 전체 공유 (관리자)
            </label>
            <button id="qrAdd" style="padding:7px 14px;background:#10b981;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">추가</button>
          </div>
        </div>
        <div id="qrList" style="overflow-y:auto;flex:1;">
          ${rowsHtml}
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('msgQrModal');
  const close = () => modal?.remove();
  modal.querySelector('#qrClose').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  // 삭제
  modal.querySelectorAll('.qr-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      try {
        await api(`/api/protected/messenger/quick-replies/${btn.dataset.qrId}`, { method: 'DELETE' });
        toast('삭제됨', 'success');
        close();
        await loadQuickReplies();
        showQrManageModal();
      } catch (e) { toast('삭제 실패: ' + e.message, 'error'); }
    });
  });

  // 추가
  modal.querySelector('#qrAdd').addEventListener('click', async () => {
    const shortcut = modal.querySelector('#qrShortcut').value.trim();
    const title = modal.querySelector('#qrTitle').value.trim();
    const body = modal.querySelector('#qrBody').value.trim();
    const shared = modal.querySelector('#qrShared').checked;
    if (!shortcut || !title || !body) { toast('shortcut/title/body 모두 입력하세요', 'warning'); return; }
    try {
      await api('/api/protected/messenger/quick-replies', {
        method: 'POST',
        json: { shortcut, title, body, shared }
      });
      toast('⚡ 단축어 추가됨', 'success');
      close();
      await loadQuickReplies();
      showQrManageModal();
    } catch (e) { toast('추가 실패: ' + e.message, 'error'); }
  });
}

/* ═══════════════════════════════════════════════
 * 모달들
 * ═══════════════════════════════════════════════ */
function showNewChannelModal() {
  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgModal">
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:420px;width:90%;">
        <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;">📢 새 채널 만들기</h3>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;">채널 이름 *</label>
          <input id="newChName" class="form-input" placeholder="예: 진료실A" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;">카테고리</label>
          <select id="newChCat" class="form-input" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;">
            <option value="경영">경영</option>
            <option value="진료">진료</option>
            <option value="상담/데스크">상담/데스크</option>
            <option value="기타">기타</option>
          </select>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;">설명 (선택)</label>
          <textarea id="newChDesc" class="form-input" rows="2" style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;resize:vertical;"></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="msg-main-btn" onclick="document.getElementById('msgModal').remove()">취소</button>
          <button class="msg-send" id="newChSubmit">만들기</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('newChSubmit').addEventListener('click', async () => {
    const name = document.getElementById('newChName').value.trim();
    const category = document.getElementById('newChCat').value;
    const description = document.getElementById('newChDesc').value.trim();
    if (!name) { toast('채널 이름을 입력하세요', 'error'); return; }
    try {
      const res = await api('/api/protected/messenger/channels', {
        method: 'POST', json: { name, category, description }
      });
      document.getElementById('msgModal').remove();
      toast('채널 생성됨', 'success');
      await loadChannels();
      if (res.channel) openChannel({
        ...res.channel,
        channel_role: 'admin', member_count: 1, unread_count: 0,
      });
    } catch (e) { toast(e.message, 'error'); }
  });
}

async function showNewDmModal() {
  let users = [];
  try {
    const res = await api('/api/protected/messenger/channels/users/directory');
    users = res.users || [];
  } catch (e) { toast(e.message, 'error'); return; }

  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgModal">
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;display:flex;flex-direction:column;">
        <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;">💬 DM 시작</h3>
        <input id="dmSearch" placeholder="이름/부서로 검색..." style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;margin-bottom:12px;">
        <div id="dmUserList" style="overflow-y:auto;flex:1;max-height:360px;border-top:1px solid #e5e7eb;padding-top:8px;">
          ${users.map(u => `
            <div class="dm-user" data-uid="${esc(u.id)}" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;cursor:pointer;">
              ${presenceDot(u.presence_status)}
              <div style="flex:1">
                <div style="font-weight:600;font-size:13.5px;">${esc(u.name)}</div>
                <div style="font-size:11.5px;color:#6b7280;">${esc(u.department || '')} · ${esc(roleLabel(u.pfm_role, u.messenger_role))}</div>
              </div>
            </div>`).join('') || '<div style="padding:30px;text-align:center;color:#9ca3af;">사용자가 없습니다</div>'}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;">
          <button class="msg-main-btn" onclick="document.getElementById('msgModal').remove()">닫기</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('dmSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.dm-user').forEach(n => {
      const txt = n.textContent.toLowerCase();
      n.style.display = txt.includes(q) ? '' : 'none';
    });
  });
  document.querySelectorAll('.dm-user').forEach(n => {
    n.addEventListener('click', async () => {
      const uid = n.getAttribute('data-uid');
      try {
        const res = await api('/api/protected/messenger/channels/dm', {
          method: 'POST', json: { targetUserId: uid }
        });
        document.getElementById('msgModal').remove();
        toast(res.existing ? 'DM 채널 열기' : 'DM 채널 생성', 'success');
        await loadChannels();
        if (res.channel) openChannel({
          ...res.channel,
          channel_role: 'admin', member_count: 2, unread_count: 0,
        });
      } catch (e) { toast(e.message, 'error'); }
    });
  });
}

function showSearchModal() {
  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgModal">
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:560px;width:90%;max-height:80vh;display:flex;flex-direction:column;">
        <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;">🔍 메시지 검색</h3>
        <input id="msgSrcQ" placeholder="검색어 (2자 이상)..." style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;margin-bottom:12px;" autofocus>
        <div id="msgSrcResults" style="overflow-y:auto;flex:1;max-height:400px;font-size:13px;">
          <div style="padding:20px;text-align:center;color:#9ca3af;">검색어를 입력하세요</div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;">
          <button class="msg-main-btn" onclick="document.getElementById('msgModal').remove()">닫기</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  let searchTimer;
  document.getElementById('msgSrcQ').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      document.getElementById('msgSrcResults').innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af;">2자 이상 입력해주세요</div>';
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const res = await api(`/api/protected/messenger/search?q=${encodeURIComponent(q)}&limit=50`);
        const results = res.messages || [];
        const html = results.length === 0
          ? '<div style="padding:20px;text-align:center;color:#9ca3af;">검색 결과가 없습니다</div>'
          : results.map(m => `
              <div style="padding:8px 10px;border-bottom:1px solid #f3f4f6;cursor:pointer;" data-go-ch="${esc(m.channel_id)}">
                <div style="font-size:11px;color:#6b7280;">[${esc(m.channel_name)}] ${esc(m.user_name)} · ${fmtTime(m.created_at)}</div>
                <div style="margin-top:2px;">${esc(m.content || '').substring(0, 120)}${m.content && m.content.length > 120 ? '...' : ''}</div>
              </div>`).join('');
        document.getElementById('msgSrcResults').innerHTML = html;
        document.querySelectorAll('[data-go-ch]').forEach(n => {
          n.addEventListener('click', () => {
            const chId = n.getAttribute('data-go-ch');
            const ch = mState.channels.find(c => c.id === chId);
            if (ch) {
              document.getElementById('msgModal').remove();
              openChannel(ch);
            }
          });
        });
      } catch (err) { toast(err.message, 'error'); }
    }, 300);
  });
}

async function showMembersModal(channel) {
  let detail;
  try {
    detail = await api(`/api/protected/messenger/channels/${channel.id}`);
  } catch (e) { toast(e.message, 'error'); return; }
  const members = detail.members || [];

  const html = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="msgModal">
      <div style="background:#fff;border-radius:12px;padding:24px;max-width:420px;width:90%;max-height:75vh;display:flex;flex-direction:column;">
        <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;">👥 ${esc(channel.name)} 멤버 (${members.length})</h3>
        <div style="overflow-y:auto;flex:1;max-height:400px;">
          ${members.map(u => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid #f3f4f6;">
              ${presenceDot(u.presence_status)}
              <div style="flex:1">
                <div style="font-weight:600;font-size:13.5px;">${esc(u.name)}${u.channel_role === 'admin' ? ' <span style="color:#7c3aed;font-size:11px;">★ admin</span>' : ''}</div>
                <div style="font-size:11.5px;color:#6b7280;">${esc(u.department || '')} · ${esc(roleLabel(u.pfm_role, u.messenger_role))}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;">
          <button class="msg-main-btn" onclick="document.getElementById('msgModal').remove()">닫기</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

/* ═══════════════════════════════════════════════════════════
 *  Phase F.4 — 운영 대시보드 모달
 * ═══════════════════════════════════════════════════════════*/
async function showOpsDashboardModal() {
  // 백드롭 + 모달 (스타일은 알림 모달과 동일 톤)
  const existing = document.getElementById('opsDashModal');
  if (existing) existing.remove();

  const html = `
    <div id="opsDashModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:#fff;border-radius:12px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:1;">
          <h3 style="margin:0;font-size:17px;font-weight:700;">🛡️ 운영 대시보드</h3>
          <button id="opsDashClose" style="background:none;border:none;font-size:24px;cursor:pointer;color:#6b7280;">×</button>
        </div>
        <div id="opsDashBody" style="padding:24px;">
          <div style="text-align:center;color:#9ca3af;padding:40px;">불러오는 중...</div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('opsDashClose')?.addEventListener('click', () => document.getElementById('opsDashModal')?.remove());

  try {
    const r = await fetch('/api/protected/messenger/ops/dashboard', { credentials: 'same-origin' });
    if (r.status === 403) {
      document.getElementById('opsDashBody').innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;font-size:14px;">관리자 전용 페이지입니다.<br/><span style="color:#9ca3af;font-size:12px;">admin / manager / owner 권한이 필요합니다.</span></div>`;
      return;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();

    const card = (title, value, sub) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">${title}</div>
        <div style="font-size:22px;font-weight:700;color:#111;margin-top:4px;">${value}</div>
        ${sub ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">${sub}</div>` : ''}
      </div>
    `;

    const presence = d.presence_distribution || {};
    const ai = d.ai_usage_30d || {};
    const pt = d.patient_threads || {};

    const topChannelsHtml = (d.top_channels || []).map(c => `
      <tr><td style="padding:6px 8px;font-size:13px;">${escHtml(c.name)}</td>
        <td style="padding:6px 8px;font-size:12px;color:#6b7280;">${escHtml(c.category||'')}</td>
        <td style="padding:6px 8px;font-size:13px;text-align:right;font-weight:600;">${c.msg_count}</td>
        <td style="padding:6px 8px;font-size:12px;color:#6b7280;text-align:right;">${c.user_count}명</td></tr>
    `).join('') || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;">데이터 없음</td></tr>';

    const unconfirmedHtml = (d.unconfirmed_top || []).map(u => `
      <div style="padding:8px 10px;border-left:3px solid ${u.is_urgent?'#dc2626':'#f59e0b'};background:#fef3c7;border-radius:4px;margin-bottom:6px;">
        <div style="font-size:12px;font-weight:600;">${u.is_urgent?'🚨 ':''}${escHtml(u.channel_name||'')} · ${escHtml(u.sender_name||'')}</div>
        <div style="font-size:12px;color:#374151;margin-top:2px;">${escHtml(u.content_preview||'')}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${u.minutes_ago}분 전 · 확인 ${u.confirmed_count||0}/${u.total_members||0}</div>
      </div>
    `).join('') || '<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;">미확인 confirm 메시지 없음 ✨</div>';

    const escHtml2 = (d.recent_escalations || []).map(e => {
      const levelLabel = e.level===3?'🔴 L3 (원장)':e.level===2?'🟠 L2 (매니저)':'🟡 L1 (리마인더)';
      return `<div style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;">
        <div><span style="font-weight:600;">${levelLabel}</span> · <span style="color:#6b7280;">${escHtml(e.channel_name||'')}</span></div>
        <div style="color:#374151;margin-top:2px;">${escHtml(e.message_preview||'')}</div>
      </div>`;
    }).join('') || '<div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px;">최근 에스컬레이션 없음</div>';

    const schedBreakdown = (d.scheduled_breakdown || []).reduce((acc,s)=>{ acc[s.status]=s.n; return acc; }, {});

    document.getElementById('opsDashBody').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        ${card('오늘 메시지', d.activity?.today||0, `어제 ${d.activity?.yesterday||0}건`)}
        ${card('지난 7일', d.activity?.last_7d||0, `활성 ${d.activity?.active_users_7d||0}명`)}
        ${card('미확인 confirm', (d.unconfirmed_top||[]).length, '필독 응답 대기')}
        ${card('에스컬레이션 7d', (d.recent_escalations||[]).length, 'L1+L2+L3')}
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;">
        ${card('🟢 온라인', presence.online_ish||0, `/ 총 ${presence.total||0}명`)}
        ${card('🌙 자리비움/DND', (presence.away||0)+(presence.dnd||0), '')}
        ${card('🧠 AI 호출 30d', ai.calls||0, `토큰 ${ai.total_tokens||0}`)}
        ${card('🧬 환자 스레드', pt.open_count||0, `진행중 / 종료 ${pt.closed_count||0}`)}
      </div>

      <h4 style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">📊 채널 활성 TOP 5 (7일)</h4>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        <thead style="background:#f9fafb;"><tr>
          <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;">채널</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;">카테고리</th>
          <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;">메시지</th>
          <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;">사용자</th>
        </tr></thead>
        <tbody>${topChannelsHtml}</tbody>
      </table>

      <h4 style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">⚠️ 미확인 Confirm TOP 10</h4>
      <div style="margin-bottom:18px;">${unconfirmedHtml}</div>

      <h4 style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">🚨 최근 에스컬레이션 (7일)</h4>
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:18px;">${escHtml2}</div>

      <h4 style="font-size:13px;font-weight:700;color:#374151;margin:0 0 8px;">📅 예약 메시지 (30일)</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;">
        ${['pending','sent','cancelled','failed'].map(s => `<span style="background:#f3f4f6;padding:4px 10px;border-radius:12px;">${s}: <b>${schedBreakdown[s]||0}</b></span>`).join('')}
      </div>

      <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:right;">
        생성: ${new Date(d.generated_at).toLocaleString('ko-KR')}
      </div>
    `;
  } catch (e) {
    document.getElementById('opsDashBody').innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">❌ 불러오기 실패: ${escHtml(String(e))}</div>`;
  }
}

function escHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ─── 모듈 export ─── */
PFM.modules = PFM.modules || {};
PFM.modules.messenger = {
  renderMessenger,
};

})(window.PFM = window.PFM || {});
