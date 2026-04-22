/* ═══ Module: Feedback Notes (v3.5) — 상급자↔하급자 피드백 게시판 ═══ */
(function(PFM) {
'use strict';
const { api, state, esc, toast, showModal, closeModal, navigate, timeAgo, canManage } = PFM;

const CATEGORY_META = {
  care:    { label: '진료',   icon: '🩺', color: '#3b82f6' },
  service: { label: '환자응대', icon: '🤝', color: '#8b5cf6' },
  admin:   { label: '행정',   icon: '📋', color: '#14b8a6' },
  hygiene: { label: '위생',   icon: '🧼', color: '#06b6d4' },
  safety:  { label: '안전',   icon: '🚨', color: '#ef4444' },
  other:   { label: '기타',   icon: '📌', color: '#6b7280' },
};

const SEVERITY_META = {
  mild:     { label: '경미',   color: '#22c55e', bg: '#dcfce7' },
  moderate: { label: '주의',   color: '#f59e0b', bg: '#fef3c7' },
  severe:   { label: '중대',   color: '#ef4444', bg: '#fee2e2' },
};

const STATUS_META = {
  open:         { label: '미확인',   color: '#ef4444', bg: '#fee2e2' },
  acknowledged: { label: '확인 완료', color: '#3b82f6', bg: '#dbeafe' },
  resolved:     { label: '해결',     color: '#22c55e', bg: '#dcfce7' },
  archived:     { label: '보관',     color: '#94a3b8', bg: '#f1f5f9' },
};

const VISIBILITY_META = {
  target:   { label: '본인만',     icon: '🔒' },
  managers: { label: '관리자 공유', icon: '👥' },
  public:   { label: '전체 공개',   icon: '🌐' },
};

let fbState = {
  scope: 'all',  // all(학습 라이브러리-기본) | received(내 기록) | sent(내가 작성)
  status: '',
  unread: false,
  severity: '',   // '' | mild | moderate | severe
  category: '',   // '' | care | service | admin | hygiene | safety | other
  search: '',
  notes: [],
  unreadCount: 0,
};

// 초기 진입 시 scope 결정 — 관리자 아니면 받은 것만 보이도록 fallback
function initScope() {
  const u = state.user;
  const isManager = ['admin','manager'].includes(u.role) || ['doctor','director'].includes(u.position);
  fbState.scope = isManager ? 'all' : 'all';  // 모든 직원이 공용 라이브러리 우선 (public 공개 기록은 전체가 봄)
}

function canAuthor() {
  const u = state.user;
  return ['admin', 'manager'].includes(u.role) || ['doctor', 'director'].includes(u.position);
}

/* ═══════════════ 메인 렌더 ═══════════════ */
async function renderFeedback(body, actions) {
  const author = canAuthor();
  initScope();

  // 상단 액션
  if (actions) {
    actions.innerHTML = author
      ? `<button class="btn btn-primary btn-sm" id="fbNewBtn">+ 사례 기록</button>`
      : '';
    document.getElementById('fbNewBtn')?.addEventListener('click', openFeedbackForm);
  }

  // 레이아웃
  body.innerHTML = `
    <div class="fb-container" style="max-width:1200px;margin:0 auto">

      <!-- 🎓 학습 자산 컨셉 배너 -->
      <div class="fb-hero" style="background:linear-gradient(135deg,#0f766e 0%,#0891b2 50%,#6366f1 100%);color:#fff;padding:20px 24px;border-radius:16px;margin-bottom:20px;position:relative;overflow:hidden;box-shadow:0 8px 24px rgba(15,118,110,0.25)">
        <div style="position:absolute;top:-20px;right:-20px;font-size:120px;opacity:0.12;user-select:none">🏛️</div>
        <div style="display:flex;align-items:flex-start;gap:14px;position:relative">
          <div style="font-size:32px;flex-shrink:0">📚</div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:800;margin-bottom:4px;letter-spacing:-0.02em">우리 병원 학습 라이브러리</div>
            <div style="font-size:13px;opacity:0.95;line-height:1.5;margin-bottom:10px">
              <b>망신주는 곳이 아닙니다.</b> 누군가의 실수는 우리 모두의 <b style="background:rgba(255,255,255,0.25);padding:1px 6px;border-radius:4px">자산</b>입니다.<br>
              한 번의 실수가 반복되지 않도록, 모든 직원이 같은 교훈을 공유하는 공간이에요.
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;margin-bottom:10px">
              <span><b id="fbTotalCnt" style="font-size:17px">-</b> 건의 학습 사례</span>
              <span style="opacity:0.6">·</span>
              <span><b id="fbResolvedCnt" style="font-size:17px">-</b> 건 개선 완료</span>
              <span style="opacity:0.6">·</span>
              <span><b id="fbThisWeekCnt" style="font-size:17px">-</b> 건 이번주 신규</span>
            </div>
            <div style="font-size:11px;opacity:0.85;background:rgba(0,0,0,0.15);padding:6px 10px;border-radius:8px;display:inline-block">
              💡 <b>실수노트</b>와 헷갈리지 마세요 — <b>실수노트</b>는 본인이 자진신고 🙋‍♀️, <b>피드백노트</b>는 관리자가 관찰 기록 👁️
            </div>
          </div>
        </div>
      </div>

      <!-- 탭 -->
      <div class="fb-tabs" style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #e5e7eb;flex-wrap:wrap">
        <button class="fb-tab" data-scope="all" style="padding:10px 16px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px">
          📚 전체 학습 사례 <span id="fbAllCntBadge" style="background:#f1f5f9;color:#475569;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:4px;font-weight:700"></span>
        </button>
        <button class="fb-tab" data-scope="received" style="padding:10px 16px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px">
          🪞 내 기록 <span id="fbUnreadBadge" class="fb-unread-badge" style="display:none;background:#ef4444;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px"></span>
        </button>
        ${author ? `<button class="fb-tab" data-scope="sent" style="padding:10px 16px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px">✍️ 내가 작성</button>` : ''}
      </div>

      <!-- 필터 -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <select id="fbCategoryFilter" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:#fff">
          <option value="">🗂️ 전체 카테고리</option>
          <option value="safety">🚨 안전</option>
          <option value="care">🩺 진료</option>
          <option value="hygiene">🧼 위생</option>
          <option value="service">🤝 환자응대</option>
          <option value="admin">📋 행정</option>
          <option value="other">📌 기타</option>
        </select>
        <select id="fbSeverityFilter" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:#fff">
          <option value="">⚖️ 전체 심각도</option>
          <option value="severe">🔴 중대</option>
          <option value="moderate">🟠 주의</option>
          <option value="mild">🟡 경미</option>
        </select>
        <select id="fbStatusFilter" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:#fff">
          <option value="">전체 상태</option>
          <option value="open">미확인</option>
          <option value="acknowledged">확인 완료</option>
          <option value="resolved">해결</option>
          <option value="archived">보관</option>
        </select>
        <input id="fbSearchInput" type="search" placeholder="🔍 제목/내용 검색" style="flex:1;min-width:180px;padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
        <span id="fbCountLabel" style="font-size:12px;color:#94a3b8;white-space:nowrap"></span>
      </div>

      <!-- 리스트 -->
      <div id="fbList">
        <div style="text-align:center;padding:40px;color:#94a3b8">로딩 중...</div>
      </div>
    </div>
  `;

  // 이벤트
  body.querySelectorAll('.fb-tab').forEach(t => {
    t.addEventListener('click', () => {
      fbState.scope = t.dataset.scope;
      updateTabs(body);
      loadList();
    });
  });
  document.getElementById('fbCategoryFilter')?.addEventListener('change', (e) => {
    fbState.category = e.target.value;
    loadList();
  });
  document.getElementById('fbSeverityFilter')?.addEventListener('change', (e) => {
    fbState.severity = e.target.value;
    loadList();
  });
  document.getElementById('fbStatusFilter')?.addEventListener('change', (e) => {
    fbState.status = e.target.value;
    loadList();
  });
  let searchTimer;
  document.getElementById('fbSearchInput')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fbState.search = e.target.value.trim().toLowerCase();
      loadList();
    }, 220);
  });

  updateTabs(body);
  await loadList();
  // 히어로 스탯 계산 (all scope에서만 정확)
  updateHeroStats();
}

// 히어로 상단 집계 숫자 업데이트
async function updateHeroStats() {
  try {
    const res = await api('/api/protected/feedback?scope=all&limit=200');
    const notes = res.notes || [];
    const total = notes.length;
    const resolved = notes.filter(n => n.status === 'resolved').length;
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const thisWeek = notes.filter(n => new Date(n.created_at).getTime() >= oneWeekAgo).length;
    const t = document.getElementById('fbTotalCnt');
    const r = document.getElementById('fbResolvedCnt');
    const w = document.getElementById('fbThisWeekCnt');
    const b = document.getElementById('fbAllCntBadge');
    if (t) t.textContent = total;
    if (r) r.textContent = resolved;
    if (w) w.textContent = thisWeek;
    if (b) b.textContent = total;
  } catch (_) {}
}

function updateTabs(body) {
  body.querySelectorAll('.fb-tab').forEach(t => {
    const active = t.dataset.scope === fbState.scope;
    t.style.color = active ? '#0f766e' : '#64748b';
    t.style.borderBottomColor = active ? '#0f766e' : 'transparent';
  });
}

async function loadList() {
  const list = document.getElementById('fbList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">로딩 중...</div>';

  try {
    const params = new URLSearchParams({ scope: fbState.scope, limit: '100' });
    if (fbState.status) params.set('status', fbState.status);
    if (fbState.unread) params.set('unread', '1');

    const res = await api('/api/protected/feedback?' + params.toString());
    let notes = res.notes || [];
    fbState.unreadCount = res.unread_count || 0;

    // 클라이언트 필터 (카테고리/심각도/검색)
    if (fbState.category) {
      notes = notes.filter(n => n.category === fbState.category);
    }
    if (fbState.severity) {
      notes = notes.filter(n => n.severity === fbState.severity);
    }
    if (fbState.search) {
      const q = fbState.search;
      notes = notes.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.feedback || '').toLowerCase().includes(q) ||
        (n.target_user_name || '').toLowerCase().includes(q)
      );
    }
    fbState.notes = notes;

    // 미확인 뱃지
    const badge = document.getElementById('fbUnreadBadge');
    if (badge) {
      if (fbState.unreadCount > 0) {
        badge.textContent = fbState.unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    const cntLabel = document.getElementById('fbCountLabel');
    if (cntLabel) cntLabel.textContent = `${notes.length}건`;

    renderList(list, notes);
  } catch (e) {
    list.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">불러오기 실패: ${esc(e.message)}</div>`;
  }
}

function renderList(container, notes) {
  if (!notes || notes.length === 0) {
    let emptyMsg, emptyIcon, emptySub;
    if (fbState.scope === 'received') {
      emptyMsg = '내 이름으로 기록된 사례가 없어요';
      emptyIcon = '🪞';
      emptySub = '다른 동료들의 학습 사례를 보고 싶다면 "전체 학습 사례" 탭을 눌러보세요.';
    } else if (fbState.scope === 'sent') {
      emptyMsg = '아직 작성한 기록이 없습니다';
      emptyIcon = '✍️';
      emptySub = '직원의 잘못은 개인의 실수가 아니라 팀의 빈틈입니다. 기록해서 시스템으로 만드세요.';
    } else {
      emptyMsg = '아직 등록된 학습 사례가 없습니다';
      emptyIcon = '📚';
      emptySub = '첫 사례부터 시작해 팀의 학습 라이브러리를 함께 만들어봐요.';
    }
    const cta = canAuthor()
      ? `<button class="btn btn-primary btn-md" onclick="document.getElementById('fbNewBtn')?.click()">+ 사례 기록하기</button>`
      : '';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${emptyIcon}</div>
        <div class="empty-state-title">${emptyMsg}</div>
        <div class="empty-state-text">${emptySub}</div>
        ${cta}
      </div>`;
    return;
  }

  // 테이블 래퍼 + 헤더 + 바디
  container.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-card)">
      <!-- 컬럼 헤더 -->
      <div style="display:grid;grid-template-columns:36px 70px 60px minmax(0,1fr) 140px 80px 80px;gap:10px;align-items:center;padding:10px 14px;background:#f8fafc;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase">
        <div style="text-align:center">구분</div>
        <div style="text-align:center">심각도</div>
        <div style="text-align:center">상태</div>
        <div>제목</div>
        <div>작성자 → 대상자</div>
        <div style="text-align:center">발생일</div>
        <div style="text-align:right">기록일</div>
      </div>
      <div id="fbRows">${notes.map(n => renderNoteRow(n)).join('')}</div>
    </div>
  `;
  container.querySelectorAll('[data-note-id]').forEach(row => {
    row.addEventListener('click', () => openDetailModal(row.dataset.noteId));
  });
}

// 날짜 포맷 (오늘 HH:MM / 어제 / 올해 MM-DD / 과거 YY-MM-DD)
function formatFbDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today - target) / (86400 * 1000));
  const pad = (n) => String(n).padStart(2, '0');
  if (diffDays === 0) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffDays === 1) return '어제';
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  return `${String(d.getFullYear()).slice(2)}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function renderNoteRow(n) {
  const cat = CATEGORY_META[n.category] || CATEGORY_META.other;
  const sev = SEVERITY_META[n.severity] || SEVERITY_META.moderate;
  const st = STATUS_META[n.status] || STATUS_META.open;
  const uid = state.user.userId || state.user.id;
  const isTarget = n.target_user_id === uid;
  const isAuthor = n.author_id === uid;
  const isUnread = isTarget && !n.acknowledged;

  // 로우 배경: 미확인이면 살짝 강조
  const rowBg = isUnread ? 'background:#fef2f2' : '';
  const hoverBg = isUnread ? '#fee2e2' : '#f8fafc';

  // 심각도 색 바 (왼쪽 세로선)
  const sevBarColor = n.severity === 'severe' ? '#ef4444'
    : n.severity === 'moderate' ? '#f59e0b'
    : '#22c55e';

  // NEW 뱃지
  const newBadge = isUnread
    ? '<span style="background:#ef4444;color:#fff;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;margin-left:6px;vertical-align:middle">NEW</span>'
    : '';

  // 역할 태그 (내가 작성/내게 온)
  const roleTag = isAuthor
    ? '<span style="background:#e0e7ff;color:#4338ca;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-right:6px">내가 작성</span>'
    : (isTarget ? '<span style="background:#fee2e2;color:#b91c1c;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-right:6px">내 기록</span>' : '');

  const incidentDate = n.incident_date ? esc(n.incident_date).slice(5) : '-';
  const titleWeight = isUnread ? '700' : '500';

  return `
    <div data-note-id="${esc(n.id)}" style="display:grid;grid-template-columns:36px 70px 60px minmax(0,1fr) 140px 80px 80px;gap:10px;align-items:center;padding:11px 14px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 0.1s;border-left:3px solid ${sevBarColor};${rowBg}" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='${isUnread ? '#fef2f2' : ''}'">
      <div style="text-align:center;font-size:18px" title="${cat.label}">${cat.icon}</div>
      <div style="text-align:center">
        <span style="background:${sev.bg};color:${sev.color};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap">${sev.label}</span>
      </div>
      <div style="text-align:center">
        <span style="background:${st.bg};color:${st.color};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;white-space:nowrap">${st.label}</span>
      </div>
      <div style="min-width:0;overflow:hidden">
        ${roleTag}<span style="color:#334155;font-weight:${titleWeight};font-size:13.5px">${esc(n.title)}</span>${newBadge}
        ${n.description ? `<div style="font-size:11.5px;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(n.description)}</div>` : ''}
      </div>
      <div style="font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        <b style="color:#475569">${esc(n.author_name||'')}</b><span style="opacity:0.5;margin:0 3px">→</span><b style="color:#475569">${esc(n.target_user_name||'')}</b>
      </div>
      <div style="text-align:center;font-size:11.5px;color:#94a3b8;white-space:nowrap">${incidentDate}</div>
      <div style="text-align:right;font-size:11.5px;color:#94a3b8;white-space:nowrap">${formatFbDate(n.created_at)}</div>
    </div>
  `;
}

/* ═══════════════ 작성 모달 ═══════════════ */
async function openFeedbackForm(prefilled) {
  let users = [];
  try {
    const res = await api('/api/protected/feedback/users/list');
    users = res.users || [];
  } catch (e) {
    toast('직원 목록을 불러오지 못했습니다: ' + e.message, 'error');
    return;
  }

  if (users.length === 0) {
    toast('병원에 다른 직원이 등록되어 있지 않습니다', 'warning');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const userOptionsHtml = users.map(u =>
    `<option value="${esc(u.id)}">${esc(u.name)}${u.position ? ' (' + esc(u.position) + ')' : ''}${u.team ? ' · ' + esc(u.team) : ''}</option>`
  ).join('');

  const categoryOptsHtml = Object.entries(CATEGORY_META).map(([k, v]) =>
    `<option value="${k}">${v.icon} ${v.label}</option>`
  ).join('');

  const severityOptsHtml = Object.entries(SEVERITY_META).map(([k, v]) =>
    `<option value="${k}"${k === 'moderate' ? ' selected' : ''}>${v.label}</option>`
  ).join('');

  const visibilityOptsHtml = Object.entries(VISIBILITY_META).map(([k, v]) =>
    `<option value="${k}"${k === 'target' ? ' selected' : ''}>${v.icon} ${v.label}</option>`
  ).join('');

  showModal({
    title: '📝 피드백 노트 작성',
    size: 'md',
    body: `
      <form id="fbForm" style="display:flex;flex-direction:column;gap:12px">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">대상 직원 *</label>
          <select name="target_user_id" required style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">
            <option value="">— 선택 —</option>
            ${userOptionsHtml}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">발생일</label>
            <input type="date" name="incident_date" value="${today}" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">카테고리</label>
            <select name="category" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">${categoryOptsHtml}</select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">심각도</label>
            <select name="severity" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">${severityOptsHtml}</select>
          </div>
        </div>

        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">제목 *</label>
          <input type="text" name="title" required maxlength="200" placeholder="예: 환자 차트 확인 누락" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">
        </div>

        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">무슨 일이 있었나요? *</label>
          <textarea name="description" required maxlength="2000" rows="4" placeholder="언제, 어디서, 어떤 상황에서, 환자/팀에 어떤 영향이 있었는지 구체적으로. 감정보다 사실 중심으로." style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical"></textarea>
        </div>

        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">💡 팀이 배울 것 / 개선 방향 <span style="color:#94a3b8;font-weight:400">(이게 핵심!)</span></label>
          <textarea name="feedback" maxlength="2000" rows="3" placeholder="다음엔 어떻게 해야 할까요? 재발 방지를 위해 팀이 기억해야 할 원칙 — 이 부분이 '자산'이 됩니다." style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical"></textarea>
        </div>

        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">공개 범위 <span style="color:#0f766e;font-weight:400">(기본: 전체 공개 권장)</span></label>
          <select name="visibility" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">
            <option value="public" selected>🌐 전체 공개 — 모든 직원이 학습 (권장)</option>
            <option value="managers">👥 관리자만</option>
            <option value="target">🔒 당사자만</option>
          </select>
          <div style="font-size:11px;color:#0f766e;margin-top:4px;line-height:1.5;background:#f0fdfa;padding:8px 10px;border-radius:6px">
            📚 <b>자산화 원칙</b>: 개인의 실수를 팀의 자산으로 바꾸려면 공개가 기본. 민감한 인사 이슈만 제한하세요.
          </div>
        </div>

        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;line-height:1.5">
          💡 대상자가 <b>확인</b>하기 전 24시간 이내에만 수정/삭제 가능. 사람을 비난하는 게 아니라 <b>시스템을 고치는 기록</b>이라는 걸 기억해주세요.
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
          <button type="button" class="btn btn-outline btn-sm" id="fbCancel">취소</button>
          <button type="submit" class="btn btn-primary btn-sm">📚 학습 사례로 기록</button>
        </div>
      </form>
    `
  });

  document.getElementById('fbCancel')?.addEventListener('click', closeModal);
  document.getElementById('fbForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    try {
      await api('/api/protected/feedback', { method: 'POST', json: payload });
      toast('✅ 피드백이 작성되었습니다', 'success');
      closeModal();
      // 목록 갱신
      fbState.scope = 'sent';
      const body = document.querySelector('.fb-container');
      if (body) {
        updateTabs(body.parentElement);
        await loadList();
      } else {
        navigate('feedback_notes');
      }
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
  });
}

/* ═══════════════ 상세 모달 ═══════════════ */
async function openDetailModal(noteId) {
  let data;
  try {
    data = await api('/api/protected/feedback/' + encodeURIComponent(noteId));
  } catch (e) {
    toast('피드백을 불러오지 못했습니다: ' + e.message, 'error');
    return;
  }

  const n = data.note;
  const replies = data.replies || [];
  const uid = state.user.userId || state.user.id;
  const isTarget = n.target_user_id === uid;
  const isAuthor = n.author_id === uid;
  const isAdmin = state.user.role === 'admin';

  const cat = CATEGORY_META[n.category] || CATEGORY_META.other;
  const sev = SEVERITY_META[n.severity] || SEVERITY_META.moderate;
  const st = STATUS_META[n.status] || STATUS_META.open;
  const vis = VISIBILITY_META[n.visibility] || VISIBILITY_META.target;

  const repliesHtml = replies.length ? `<div class="fb-thread">${replies.map(r => {
    const bubbleClass = r.author_role === 'target' ? 'target' : 'author';
    const roleLabel = r.author_role === 'author' ? '상급자'
                    : r.author_role === 'target' ? '당사자' : '관리자';
    const internalTag = r.is_internal ? ' · 🔒 내부용' : '';
    return `
      <div class="fb-reply-bubble ${bubbleClass}">
        <div class="fb-reply-meta">
          <b>${esc(r.author_name)}</b> · ${roleLabel}${internalTag} · ${timeAgo ? timeAgo(r.created_at) : r.created_at}
        </div>
        <div style="white-space:pre-wrap;word-break:break-word">${esc(r.body)}</div>
      </div>
    `;
  }).join('')}</div>` : '<div class="empty-state" style="padding:20px"><div style="font-size:24px;opacity:0.4">💬</div><div class="empty-state-text" style="margin-top:6px">아직 대화가 없어요. 한마디 남겨보세요.</div></div>';

  showModal({
    title: `📚 학습 사례`,
    size: 'md',
    body: `
      <div style="display:flex;flex-direction:column;gap:14px;max-height:72vh;overflow-y:auto;padding-right:4px">
        <!-- 헤더 -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="background:${sev.bg};color:${sev.color};padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700">${sev.label}</span>
          <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700">${st.label}</span>
          <span style="color:${cat.color};font-size:12px;font-weight:700">${cat.icon} ${cat.label}</span>
          <span style="color:#94a3b8;font-size:11px">${vis.icon} ${vis.label}</span>
        </div>

        <!-- 제목 -->
        <h3 style="margin:0;font-size:18px;color:#0f172a;line-height:1.4">${esc(n.title)}</h3>

        <!-- 메타 -->
        <div style="display:flex;gap:12px;font-size:12px;color:#64748b;flex-wrap:wrap;background:#f8fafc;padding:8px 12px;border-radius:8px">
          <span>✍️ <b>${esc(n.author_name)}</b> (기록자)</span>
          <span>→</span>
          <span>👤 <b>${esc(n.target_user_name)}</b> (당사자)</span>
          ${n.incident_date ? `<span>📅 ${esc(n.incident_date)}</span>` : ''}
          <span style="margin-left:auto">${timeAgo ? timeAgo(n.created_at) : n.created_at}</span>
        </div>

        <!-- 상황 -->
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">📋 무슨 일이 있었나요</label>
          <div style="margin-top:4px;padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap">${esc(n.description)}</div>
        </div>

        <!-- 팀이 배울 것 (자산 핵심) -->
        ${n.feedback ? `
        <div>
          <label style="font-size:11px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0.5px">💡 팀이 배운 것 / 재발 방지 원칙</label>
          <div style="margin-top:4px;padding:14px;background:linear-gradient(135deg,#f0fdfa 0%,#eff6ff 100%);border:2px solid #99f6e4;border-radius:10px;font-size:13px;line-height:1.65;color:#0f766e;white-space:pre-wrap;font-weight:500;position:relative">
            <div style="position:absolute;top:8px;right:10px;font-size:10px;color:#14b8a6;background:#ccfbf1;padding:2px 8px;border-radius:6px;font-weight:700">🏛️ 학습 자산</div>
            ${esc(n.feedback)}
          </div>
        </div>` : ''}

        <!-- 확인 체크박스 + 본인 피드백 (대상자만) -->
        ${isTarget ? `
        <div style="background:${n.acknowledged ? '#f0fdf4' : '#fefce8'};border:2px solid ${n.acknowledged ? '#86efac' : '#fcd34d'};border-radius:12px;padding:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <input type="checkbox" id="fbAckCheck" ${n.acknowledged ? 'checked disabled' : ''} style="width:18px;height:18px;cursor:${n.acknowledged ? 'default' : 'pointer'}">
            <label for="fbAckCheck" style="font-size:14px;font-weight:700;color:${n.acknowledged ? '#166534' : '#854d0e'};cursor:${n.acknowledged ? 'default' : 'pointer'}">
              ${n.acknowledged ? '✅ 확인했습니다' : '👀 내용을 확인하고 이 체크박스를 눌러주세요'}
            </label>
          </div>
          ${n.acknowledged && n.acknowledged_at ? `<div style="font-size:11px;color:#64748b;margin-bottom:8px">확인일: ${new Date(n.acknowledged_at).toLocaleString('ko-KR')}</div>` : ''}

          <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;margin-top:8px">
            💭 본인 피드백 <span style="color:#94a3b8;font-weight:400">(개선 다짐·상황 설명 등)</span>
          </label>
          <textarea id="fbTargetResponse" rows="3" maxlength="2000" placeholder="앞으로 어떻게 개선할지, 당시 상황에 대한 설명 등을 자유롭게 적어주세요." style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;resize:vertical">${esc(n.target_response || '')}</textarea>

          <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px">
            <button class="btn btn-primary btn-sm" id="fbAckSubmit" ${n.acknowledged && !n.target_response ? '' : n.acknowledged ? '' : ''}>
              ${n.acknowledged ? '💾 본인 피드백 업데이트' : '✅ 확인하고 피드백 제출'}
            </button>
          </div>
        </div>` : (n.target_response ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px">
          <label style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">💭 대상자 본인 피드백</label>
          <div style="margin-top:6px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap">${esc(n.target_response)}</div>
          ${n.target_responded_at ? `<div style="font-size:11px;color:#94a3b8;margin-top:6px">${new Date(n.target_responded_at).toLocaleString('ko-KR')}</div>` : ''}
        </div>` : '')}

        <!-- 댓글 쓰레드 -->
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">💬 추가 대화</label>
          <div id="fbReplies" style="margin-top:6px">${repliesHtml}</div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <input type="text" id="fbReplyInput" placeholder="댓글 입력..." maxlength="1500" style="flex:1;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
            ${(isAuthor || canManage()) ? `<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b"><input type="checkbox" id="fbReplyInternal"> 내부용</label>` : ''}
            <button class="btn btn-primary btn-sm" id="fbReplySubmit">등록</button>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #e5e7eb;padding-top:12px">
          ${(isAuthor || isAdmin) && n.status !== 'resolved' ? `<button class="btn btn-outline btn-sm" id="fbResolve">✅ 해결로 표시</button>` : ''}
          ${(isAuthor || isAdmin) && n.status !== 'archived' ? `<button class="btn btn-outline btn-sm" id="fbArchive">📦 보관</button>` : ''}
          ${(isAuthor || isAdmin) ? `<button class="btn btn-danger btn-sm" id="fbDelete">🗑️ 삭제</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="PFM.closeModal()">닫기</button>
        </div>
      </div>
    `
  });

  // 이벤트 바인딩
  document.getElementById('fbAckSubmit')?.addEventListener('click', async () => {
    const checkbox = document.getElementById('fbAckCheck');
    const response = document.getElementById('fbTargetResponse')?.value?.trim() || '';
    if (!n.acknowledged && !checkbox?.checked) {
      toast('체크박스를 눌러 확인을 표시해주세요', 'warning');
      return;
    }
    try {
      await api('/api/protected/feedback/' + encodeURIComponent(noteId) + '/acknowledge', {
        method: 'POST', json: { response }
      });
      toast('✅ 확인 처리되었습니다', 'success');
      closeModal();
      await loadList();
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
  });

  document.getElementById('fbReplySubmit')?.addEventListener('click', async () => {
    const input = document.getElementById('fbReplyInput');
    const text = input?.value?.trim();
    if (!text) { toast('내용을 입력해주세요', 'warning'); return; }
    const isInternal = document.getElementById('fbReplyInternal')?.checked || false;
    try {
      await api('/api/protected/feedback/' + encodeURIComponent(noteId) + '/replies', {
        method: 'POST', json: { body: text, is_internal: isInternal }
      });
      toast('✅ 댓글이 등록되었습니다', 'success');
      closeModal();
      await openDetailModal(noteId);  // 재로드
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
  });

  document.getElementById('fbResolve')?.addEventListener('click', async () => {
    if (!confirm('해결로 표시하시겠습니까?')) return;
    try {
      await api('/api/protected/feedback/' + encodeURIComponent(noteId) + '/status', {
        method: 'POST', json: { status: 'resolved' }
      });
      toast('✅ 해결로 표시됨', 'success');
      closeModal();
      await loadList();
    } catch (err) { toast('❌ ' + err.message, 'error'); }
  });

  document.getElementById('fbArchive')?.addEventListener('click', async () => {
    if (!confirm('보관 처리하시겠습니까?')) return;
    try {
      await api('/api/protected/feedback/' + encodeURIComponent(noteId) + '/status', {
        method: 'POST', json: { status: 'archived' }
      });
      toast('📦 보관됨', 'success');
      closeModal();
      await loadList();
    } catch (err) { toast('❌ ' + err.message, 'error'); }
  });

  document.getElementById('fbDelete')?.addEventListener('click', async () => {
    if (!confirm('정말 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    try {
      await api('/api/protected/feedback/' + encodeURIComponent(noteId), { method: 'DELETE' });
      toast('🗑️ 삭제됨', 'success');
      closeModal();
      await loadList();
    } catch (err) { toast('❌ ' + err.message, 'error'); }
  });
}

PFM.modules.feedbackNotes = { renderFeedback, openFeedbackForm, openDetailModal };
})(window.PFM);
