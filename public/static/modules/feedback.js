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
  scope: 'received',  // received | sent | all
  status: '',
  unread: false,
  notes: [],
  unreadCount: 0,
};

function canAuthor() {
  const u = state.user;
  return ['admin', 'manager'].includes(u.role) || ['doctor', 'director'].includes(u.position);
}

/* ═══════════════ 메인 렌더 ═══════════════ */
async function renderFeedback(body, actions) {
  const author = canAuthor();

  // 상단 액션
  if (actions) {
    actions.innerHTML = author
      ? `<button class="btn btn-primary btn-sm" id="fbNewBtn">+ 피드백 작성</button>`
      : '';
    document.getElementById('fbNewBtn')?.addEventListener('click', openFeedbackForm);
  }

  // 레이아웃
  body.innerHTML = `
    <div class="fb-container" style="max-width:1100px;margin:0 auto">
      <!-- 탭 -->
      <div class="fb-tabs" style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #e5e7eb;flex-wrap:wrap">
        <button class="fb-tab" data-scope="received" style="padding:10px 16px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px">
          📥 받은 피드백 <span id="fbUnreadBadge" class="fb-unread-badge" style="display:none;background:#ef4444;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px"></span>
        </button>
        ${author ? `<button class="fb-tab" data-scope="sent" style="padding:10px 16px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px">📤 보낸 피드백</button>` : ''}
        ${canManage() ? `<button class="fb-tab" data-scope="all" style="padding:10px 16px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px">📋 전체 (관리자)</button>` : ''}
      </div>

      <!-- 필터 -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <select id="fbStatusFilter" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
          <option value="">전체 상태</option>
          <option value="open">미확인</option>
          <option value="acknowledged">확인 완료</option>
          <option value="resolved">해결</option>
          <option value="archived">보관</option>
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="fbUnreadFilter"> 미확인만
        </label>
        <span style="flex:1"></span>
        <span id="fbCountLabel" style="font-size:12px;color:#94a3b8"></span>
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
  document.getElementById('fbStatusFilter')?.addEventListener('change', (e) => {
    fbState.status = e.target.value;
    loadList();
  });
  document.getElementById('fbUnreadFilter')?.addEventListener('change', (e) => {
    fbState.unread = e.target.checked;
    loadList();
  });

  updateTabs(body);
  await loadList();
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
    const params = new URLSearchParams({ scope: fbState.scope, limit: '50' });
    if (fbState.status) params.set('status', fbState.status);
    if (fbState.unread) params.set('unread', '1');

    const res = await api('/api/protected/feedback?' + params.toString());
    fbState.notes = res.notes || [];
    fbState.unreadCount = res.unread_count || 0;

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
    if (cntLabel) cntLabel.textContent = `${fbState.notes.length}건`;

    renderList(list, fbState.notes);
  } catch (e) {
    list.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">불러오기 실패: ${esc(e.message)}</div>`;
  }
}

function renderList(container, notes) {
  if (!notes || notes.length === 0) {
    const emptyMsg = fbState.scope === 'received'
      ? '받은 피드백이 없습니다. 🎉'
      : fbState.scope === 'sent'
        ? '아직 작성한 피드백이 없습니다.'
        : '피드백 기록이 없습니다.';
    const cta = fbState.scope === 'sent' && canAuthor()
      ? `<button class="btn btn-primary btn-sm" onclick="document.getElementById('fbNewBtn')?.click()" style="margin-top:12px">+ 첫 피드백 작성하기</button>`
      : '';
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1">
        <div style="font-size:48px;margin-bottom:8px">📭</div>
        <div style="color:#64748b;font-size:14px">${emptyMsg}</div>
        ${cta}
      </div>`;
    return;
  }

  container.innerHTML = notes.map(n => renderNoteCard(n)).join('');
  container.querySelectorAll('[data-note-id]').forEach(card => {
    card.addEventListener('click', () => openDetailModal(card.dataset.noteId));
  });
}

function renderNoteCard(n) {
  const cat = CATEGORY_META[n.category] || CATEGORY_META.other;
  const sev = SEVERITY_META[n.severity] || SEVERITY_META.moderate;
  const st = STATUS_META[n.status] || STATUS_META.open;
  const uid = state.user.userId || state.user.id;
  const isTarget = n.target_user_id === uid;
  const isAuthor = n.author_id === uid;
  const unreadTag = isTarget && !n.acknowledged
    ? `<span style="background:#ef4444;color:#fff;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700;animation:pulseHint 1.2s ease infinite">NEW</span>`
    : '';
  const roleLabel = isAuthor ? '내가 작성' : (isTarget ? '내게 온 피드백' : '');

  return `
    <div class="fb-card" data-note-id="${esc(n.id)}" style="background:#fff;border:1.5px solid ${isTarget && !n.acknowledged ? '#fca5a5' : '#e5e7eb'};border-radius:12px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:transform .15s, box-shadow .15s" onmouseenter="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap">
        <span style="font-size:18px">${cat.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:3px">
            ${unreadTag}
            <span style="background:${sev.bg};color:${sev.color};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${sev.label}</span>
            <span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">${st.label}</span>
            <span style="color:${cat.color};font-size:11px;font-weight:600">${cat.label}</span>
            ${roleLabel ? `<span style="font-size:10px;color:#94a3b8;background:#f1f5f9;padding:2px 6px;border-radius:4px">${roleLabel}</span>` : ''}
          </div>
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;line-height:1.4">${esc(n.title)}</div>
          <div style="font-size:12px;color:#64748b;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(n.description || '')}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;gap:8px;flex-wrap:wrap">
        <span>
          <b>${esc(n.author_name)}</b> → <b>${esc(n.target_user_name)}</b>
          ${n.incident_date ? ` · 📅 ${esc(n.incident_date)}` : ''}
        </span>
        <span>${timeAgo ? timeAgo(n.created_at) : new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
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
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">실수/이슈 내용 *</label>
          <textarea name="description" required maxlength="2000" rows="4" placeholder="어떤 상황에서 어떤 일이 있었는지 구체적으로 적어주세요. 감정보다는 사실 중심으로." style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical"></textarea>
        </div>

        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">피드백 / 조언 <span style="color:#94a3b8;font-weight:400">(권장)</span></label>
          <textarea name="feedback" maxlength="2000" rows="3" placeholder="개선을 위해 어떻게 하면 좋을지, 어떤 방향으로 가이드하고 싶은지 적어주세요." style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:vertical"></textarea>
        </div>

        <div>
          <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;color:#475569">공개 범위</label>
          <select name="visibility" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px">${visibilityOptsHtml}</select>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5">
            🔒 <b>본인만</b>: 대상 직원과 작성자만 열람 &nbsp;|&nbsp;
            👥 <b>관리자 공유</b>: 원장/실장 포함 &nbsp;|&nbsp;
            🌐 <b>전체 공개</b>: 모든 직원 열람 가능
          </div>
        </div>

        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;line-height:1.5">
          💡 대상자가 <b>확인</b>하기 전까지 24시간 이내에만 수정/삭제할 수 있어요.
          작성 시 신중하게 검토해주세요.
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
          <button type="button" class="btn btn-outline btn-sm" id="fbCancel">취소</button>
          <button type="submit" class="btn btn-primary btn-sm">📝 피드백 작성</button>
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

  const repliesHtml = replies.map(r => {
    const isR_target = r.author_role === 'target';
    return `
      <div style="background:${isR_target ? '#f0fdf4' : '#f8fafc'};border:1px solid ${isR_target ? '#bbf7d0' : '#e5e7eb'};border-radius:10px;padding:10px 12px;margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:4px">
          <span style="font-size:12px;font-weight:700;color:#0f172a">${esc(r.author_name)}
            ${r.author_role === 'author' ? '<span style="font-size:10px;color:#3b82f6;background:#dbeafe;padding:1px 6px;border-radius:4px;margin-left:4px">상급자</span>' : ''}
            ${r.author_role === 'target' ? '<span style="font-size:10px;color:#22c55e;background:#dcfce7;padding:1px 6px;border-radius:4px;margin-left:4px">당사자</span>' : ''}
            ${r.is_internal ? '<span style="font-size:10px;color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:4px;margin-left:4px">🔒 내부용</span>' : ''}
          </span>
          <span style="font-size:10px;color:#94a3b8">${timeAgo ? timeAgo(r.created_at) : r.created_at}</span>
        </div>
        <div style="font-size:13px;color:#334155;line-height:1.55;white-space:pre-wrap">${esc(r.body)}</div>
      </div>
    `;
  }).join('') || '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px">아직 댓글이 없습니다</div>';

  showModal({
    title: `📝 피드백 노트 상세`,
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
          <span>✍️ <b>${esc(n.author_name)}</b> (작성)</span>
          <span>→</span>
          <span>👤 <b>${esc(n.target_user_name)}</b> (대상)</span>
          ${n.incident_date ? `<span>📅 ${esc(n.incident_date)}</span>` : ''}
          <span style="margin-left:auto">${timeAgo ? timeAgo(n.created_at) : n.created_at}</span>
        </div>

        <!-- 실수/이슈 내용 -->
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">📋 실수 / 이슈 내용</label>
          <div style="margin-top:4px;padding:12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap">${esc(n.description)}</div>
        </div>

        <!-- 상급자 피드백 -->
        ${n.feedback ? `
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">💬 상급자 피드백 / 조언</label>
          <div style="margin-top:4px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:13px;line-height:1.6;color:#1e40af;white-space:pre-wrap">${esc(n.feedback)}</div>
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
