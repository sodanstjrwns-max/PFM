/* ═══ Module: Recall Automation (v3.2) — 환자 리콜 자동화 ═══ */
(function(PFM) {
'use strict';
const { api, state, esc, toast, showModal, closeModal, canManage } = PFM;

const PRIORITY_COLORS = {
  1: { bg: '#fef2f2', fg: '#dc2626', label: '최우선' },
  2: { bg: '#fff7ed', fg: '#ea580c', label: '높음' },
  3: { bg: '#fefce8', fg: '#ca8a04', label: '보통' },
  4: { bg: '#f0f9ff', fg: '#0284c7', label: '낮음' },
  5: { bg: '#f5f5f5', fg: '#6b7280', label: '참고' },
};

const CHANNEL_ICONS = {
  call: '📞',
  sms: '💬',
  kakao: '💛',
  all: '📢',
};

const STATUS_LABEL = {
  pending: '대기', done: '완료', reserved: '예약', skipped: '보류', failed: '실패',
};

async function renderRecall(body, actions) {
  body.innerHTML = `
    <div class="recall-page">
      <div class="recall-header">
        <div>
          <h2 style="margin:0 0 4px 0">📞 환자 리콜 자동화</h2>
          <p style="color:#64748b;font-size:13px;margin:0">매일 자동으로 리콜 대상자 목록을 만들고, 한 번에 실행하세요</p>
        </div>
      </div>
      <div id="recallSummary" class="recall-summary-grid"></div>
      <div class="recall-tabs" role="tablist">
        <button class="recall-tab active" data-status="pending">할 일</button>
        <button class="recall-tab" data-status="reserved">예약 확정</button>
        <button class="recall-tab" data-status="done">완료</button>
        <button class="recall-tab" data-status="skipped">보류</button>
        <button class="recall-tab" data-status="all">전체</button>
      </div>
      <div id="recallTaskList" class="recall-task-list"></div>
    </div>
  `;

  if (actions) {
    actions.innerHTML = `
      ${canManage() ? `
        <button class="btn btn-outline btn-sm" id="recallRulesBtn">⚙️ 룰북</button>
        <button class="btn btn-primary btn-sm" id="recallGenBtn">✨ 오늘의 리콜 생성</button>
      ` : ''}
    `;
    document.getElementById('recallRulesBtn')?.addEventListener('click', openRules);
    document.getElementById('recallGenBtn')?.addEventListener('click', (e) => generate(e.currentTarget));
  }

  // Tab switching
  body.querySelectorAll('.recall-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      body.querySelectorAll('.recall-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      await loadTasks(btn.dataset.status);
    });
  });

  await loadSummary();
  await loadTasks('pending');
}

async function loadSummary() {
  const el = document.getElementById('recallSummary');
  if (!el) return;
  try {
    const sum = await api('/api/protected/recall/summary');
    const tasks = await api('/api/protected/recall/tasks?status=pending');
    const stats = tasks.stats || {};
    el.innerHTML = `
      <div class="recall-kpi-card" style="border-left:4px solid #0f766e">
        <div class="recall-kpi-label">오늘 할 일</div>
        <div class="recall-kpi-value">${stats.pending || 0}<span style="font-size:14px;color:#64748b">건</span></div>
        <div class="recall-kpi-sub">오늘 생성 ${stats.total || 0}</div>
      </div>
      <div class="recall-kpi-card" style="border-left:4px solid #0891b2">
        <div class="recall-kpi-label">이번 달 리콜</div>
        <div class="recall-kpi-value">${sum.total || 0}<span style="font-size:14px;color:#64748b">건</span></div>
        <div class="recall-kpi-sub">접촉 ${sum.contacted || 0} · 예약 ${sum.reserved || 0}</div>
      </div>
      <div class="recall-kpi-card" style="border-left:4px solid #dc2626">
        <div class="recall-kpi-label">예약 전환율</div>
        <div class="recall-kpi-value">${sum.conversion_rate || 0}<span style="font-size:14px;color:#64748b">%</span></div>
        <div class="recall-kpi-sub">${sum.reserved || 0} / ${sum.total || 0}</div>
      </div>
      <div class="recall-kpi-card" style="border-left:4px solid #059669">
        <div class="recall-kpi-label">대기 중</div>
        <div class="recall-kpi-value">${sum.pending || 0}<span style="font-size:14px;color:#64748b">건</span></div>
        <div class="recall-kpi-sub">아직 접촉 안됨</div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="recall-empty">요약 불러오기 실패: ${esc(e.message || '')}</div>`;
  }
}

async function loadTasks(status) {
  const list = document.getElementById('recallTaskList');
  if (!list) return;
  list.innerHTML = '<div class="skeleton skeleton-card" style="height:90px;margin-bottom:8px"></div>'.repeat(3);
  try {
    const data = await api(`/api/protected/recall/tasks?status=${status}`);
    const tasks = data.tasks || [];
    if (!tasks.length) {
      const msg = status === 'pending'
        ? '✅ 오늘 할 리콜이 없습니다.<br><br><small>상단 <b>"오늘의 리콜 생성"</b> 버튼을 눌러 대상자를 추출하세요.<br>룰북에 정의된 규칙대로 자동 생성됩니다.</small>'
        : `${STATUS_LABEL[status] || status} 건이 없습니다`;
      list.innerHTML = `<div class="recall-empty">${msg}</div>`;
      return;
    }
    list.innerHTML = tasks.map(renderTaskCard).join('');
    // Attach handlers
    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const act = btn.dataset.action;
        if (act === 'done') markDone(id);
        else if (act === 'reserved') markReserved(id);
        else if (act === 'skip') markSkipped(id);
        else if (act === 'reopen') reopen(id);
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="recall-empty" style="color:#dc2626">불러오기 실패: ${esc(e.message || '')}</div>`;
  }
}

function renderTaskCard(t) {
  const p = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS[3];
  const icon = CHANNEL_ICONS[t.channel] || '📞';
  const isDone = t.status === 'done' || t.status === 'reserved';
  return `
    <div class="recall-task-card" data-id="${t.id}">
      <div class="recall-task-head">
        <span class="recall-priority-badge" style="background:${p.bg};color:${p.fg}">${p.label}</span>
        <span class="recall-patient-name">${esc(t.patient_name || '')}</span>
        <span class="recall-phone">${t.phone ? `<a href="tel:${esc(t.phone)}">${esc(t.phone)}</a>` : '전화번호 없음'}</span>
        <span class="recall-status-badge status-${t.status}">${STATUS_LABEL[t.status] || t.status}</span>
      </div>
      <div class="recall-task-body">
        <div class="recall-reason">${icon} ${esc(t.reason || '')}</div>
        ${t.script ? `<div class="recall-script">"${esc(t.script)}"</div>` : ''}
        ${t.result_note ? `<div class="recall-result">📝 ${esc(t.result_note)}</div>` : ''}
        ${t.reservation_date ? `<div class="recall-reservation">📅 예약일: ${esc(t.reservation_date)}</div>` : ''}
      </div>
      <div class="recall-task-actions">
        ${!isDone ? `
          ${t.phone ? `<a href="tel:${esc(t.phone)}" class="btn btn-sm btn-primary">📞 전화</a>` : ''}
          <button class="btn btn-sm btn-success" data-action="done" data-id="${t.id}">✅ 접촉완료</button>
          <button class="btn btn-sm btn-outline" data-action="reserved" data-id="${t.id}">📅 예약확정</button>
          <button class="btn btn-sm btn-ghost" data-action="skip" data-id="${t.id}">⏭️ 보류</button>
        ` : `
          <button class="btn btn-sm btn-ghost" data-action="reopen" data-id="${t.id}">🔄 다시 열기</button>
        `}
      </div>
    </div>
  `;
}

async function generate(btn) {
  if (!btn) return;
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '생성 중...';
  try {
    const res = await api('/api/protected/recall/generate', { method: 'POST' });
    const msg = `✨ 리콜 대상자 ${res.created || 0}건 생성 완료${res.skipped ? ` (중복 ${res.skipped}건 제외)` : ''}`;
    toast(msg, 'success');
    await loadSummary();
    await loadTasks('pending');
  } catch (e) {
    toast('생성 실패: ' + (e.message || ''), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function getCurrentTab() {
  return document.querySelector('.recall-tab.active')?.dataset.status || 'pending';
}

async function markDone(id) {
  const note = prompt('결과 메모 (예: 연결안됨, 다음 주 재통화 등):', '');
  if (note === null) return;
  try {
    await api(`/api/protected/recall/tasks/${id}`, { method: 'PATCH', json: { status: 'done', result_note: note } });
    toast('✅ 접촉 완료로 기록됨', 'success');
    await loadSummary();
    await loadTasks(getCurrentTab());
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

async function markReserved(id) {
  const today = new Date().toISOString().slice(0, 10);
  const date = prompt('예약 날짜 (YYYY-MM-DD):', today);
  if (!date) return;
  try {
    await api(`/api/protected/recall/tasks/${id}`, {
      method: 'PATCH',
      json: { status: 'reserved', reservation_made: true, reservation_date: date }
    });
    toast('📅 예약 확정 처리됨', 'success');
    await loadSummary();
    await loadTasks(getCurrentTab());
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

async function markSkipped(id) {
  try {
    await api(`/api/protected/recall/tasks/${id}`, { method: 'PATCH', json: { status: 'skipped' } });
    toast('보류 처리됨', 'info');
    await loadTasks(getCurrentTab());
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

async function reopen(id) {
  try {
    await api(`/api/protected/recall/tasks/${id}`, { method: 'PATCH', json: { status: 'pending' } });
    toast('다시 열렸습니다', 'info');
    await loadTasks(getCurrentTab());
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

async function openRules() {
  try {
    const data = await api('/api/protected/recall/rules');
    const rules = data.rules || [];
    const body = `
      <div class="recall-rules-list">
        ${rules.length === 0 ? '<div class="recall-empty">등록된 룰이 없습니다</div>' : rules.map(r => `
          <div class="recall-rule-item" data-id="${r.id}">
            <div class="recall-rule-head">
              <strong>${esc(r.name)}</strong>
              <label class="switch-mini">
                <input type="checkbox" ${r.is_active ? 'checked' : ''} data-toggle-rule="${r.id}">
                <span>${r.is_active ? 'ON' : 'OFF'}</span>
              </label>
            </div>
            <div class="recall-rule-meta">
              ${CHANNEL_ICONS[r.channel] || '📞'} ${r.channel} · ${r.days_after}일 경과 ·
              ${r.treatment_keyword ? `"${esc(r.treatment_keyword)}"` : '전체'} ·
              우선순위 ${r.priority}
            </div>
            ${r.script_template ? `<div class="recall-rule-script">"${esc(r.script_template)}"</div>` : ''}
            <div class="recall-rule-actions">
              <button class="btn btn-xs btn-outline" data-edit-rule="${r.id}">수정</button>
              <button class="btn btn-xs btn-ghost" data-del-rule="${r.id}">삭제</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;text-align:center">
        <button class="btn btn-primary" id="recallAddRuleBtn">+ 새 룰 추가</button>
      </div>
    `;
    showModal('📚 리콜 룰북 관리', body);
    // Event bindings
    setTimeout(() => {
      document.querySelectorAll('[data-toggle-rule]').forEach(el => {
        el.addEventListener('change', async () => {
          const id = el.dataset.toggleRule;
          try {
            await api(`/api/protected/recall/rules/${id}`, { method: 'PATCH', json: { is_active: el.checked } });
            toast(el.checked ? '활성화됨' : '비활성화됨', 'info');
          } catch (e) { toast('실패: ' + e.message, 'error'); }
        });
      });
      document.querySelectorAll('[data-del-rule]').forEach(el => {
        el.addEventListener('click', async () => {
          if (!confirm('이 룰을 삭제할까요? 기존에 생성된 태스크는 유지됩니다.')) return;
          try {
            await api(`/api/protected/recall/rules/${el.dataset.delRule}`, { method: 'DELETE' });
            toast('삭제됨', 'info');
            openRules();
          } catch (e) { toast('실패: ' + e.message, 'error'); }
        });
      });
      document.querySelectorAll('[data-edit-rule]').forEach(el => {
        el.addEventListener('click', () => editRulePrompt(el.dataset.editRule, rules));
      });
      document.getElementById('recallAddRuleBtn')?.addEventListener('click', addRule);
    }, 50);
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

function addRule() {
  const body = `
    <form id="recallRuleForm" style="display:flex;flex-direction:column;gap:10px">
      <label>룰 이름</label>
      <input class="form-input" name="name" placeholder="예: 스케일링 6개월 리콜" required>
      <label>경과일 (며칠 지난 환자?)</label>
      <input class="form-input" type="number" name="days_after" value="180" min="1" required>
      <label>치료 키워드 (선택, 빈 칸이면 전체)</label>
      <input class="form-input" name="treatment_keyword" placeholder="예: 스케일링, 임플란트">
      <label>채널</label>
      <select class="form-input" name="channel">
        <option value="call">📞 전화</option>
        <option value="sms">💬 문자</option>
        <option value="kakao">💛 카카오</option>
      </select>
      <label>우선순위 (1=최우선, 5=참고)</label>
      <input class="form-input" type="number" name="priority" value="3" min="1" max="5">
      <label>스크립트 템플릿 <small>({patient_name}, {hospital_name} 치환 가능)</small></label>
      <textarea class="form-input" name="script_template" rows="3" placeholder="{patient_name}님 안녕하세요, {hospital_name}입니다..."></textarea>
      <div style="margin-top:12px;text-align:right">
        <button type="submit" class="btn btn-primary">저장</button>
      </div>
    </form>
  `;
  showModal('새 리콜 룰 추가', body);
  setTimeout(() => {
    const f = document.getElementById('recallRuleForm');
    if (!f) return;
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(f);
      const obj = Object.fromEntries(fd.entries());
      try {
        await api('/api/protected/recall/rules', { method: 'POST', json: obj });
        toast('✨ 룰 추가됨', 'success');
        closeModal && closeModal();
        openRules();
      } catch (e) { toast('실패: ' + e.message, 'error'); }
    });
  }, 50);
}

async function editRulePrompt(id, rules) {
  const rule = rules.find(r => r.id === id);
  if (!rule) return;
  const newName = prompt('룰 이름 수정:', rule.name);
  if (newName === null) return;
  const newDays = prompt('경과일:', rule.days_after);
  if (newDays === null) return;
  try {
    await api(`/api/protected/recall/rules/${id}`, {
      method: 'PATCH',
      json: { name: newName, days_after: parseInt(newDays) || 180 },
    });
    toast('수정됨', 'success');
    openRules();
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

PFM.modules.recall = { renderRecall };
})(window.PFM = window.PFM || { modules: {} });
