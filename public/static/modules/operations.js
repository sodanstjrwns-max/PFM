/* ═══ Module: Operations (Checklists, Calendar, Staff Supplies) ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, timeAgo } = PFM;

async function renderChecklists(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addChecklistBtn">${ICONS.plus} 체크리스트 추가</button>`;
  body.innerHTML = `<div id="checkContent" style="max-width:800px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  async function loadChecks() {
    const container = document.getElementById('checkContent');
    try {
      const lists = await api('/api/protected/checklists');
      if (!lists.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.checklist}<h3>체크리스트가 없습니다</h3></div>`;
        return;
      }
      container.innerHTML = lists.map(cl => {
        const items = JSON.parse(cl.items || '[]');
        const typeLabels = { daily_open:'🌅 개원 전', daily_close:'🌙 마감', weekly:'📅 주간', infection:'🛡️ 감염관리', onboarding:'👋 온보딩', custom:'📋 커스텀' };
        return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-weight:700;font-size:15px">${esc(cl.title)}</span>
            <span class="content-card-badge">${typeLabels[cl.checklist_type]||cl.checklist_type}</span>
            <button class="btn btn-primary btn-sm" style="margin-left:auto" data-check-id="${cl.id}">✅ 오늘 체크하기</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${items.map((item,i) => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);padding:4px 0;cursor:pointer">
              <input type="checkbox" class="check-item" data-cl="${cl.id}" data-idx="${i}"> ${esc(item)}
            </label>
          `).join('')}</div>
        </div>`;
      }).join('');

      container.querySelectorAll('[data-check-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const clId = btn.dataset.checkId;
          const checked = [...container.querySelectorAll(`.check-item[data-cl="${clId}"]:checked`)].map(el => parseInt(el.dataset.idx));
          await api('/api/protected/checklists/' + clId + '/complete', { method:'POST', json:{ completed_items: checked, log_date: new Date().toISOString().split('T')[0] }});
          toast(`${checked.length}개 항목 체크 완료!`, 'success');
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadChecks();

  document.getElementById('addChecklistBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>✅ 체크리스트 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>제목</label><input class="form-input" id="clTitle" required placeholder="예: 주간 장비 점검"></div>
        <div class="form-group"><label>유형</label><select class="form-input" id="clType"><option value="custom">커스텀</option><option value="daily_open">개원 전</option><option value="daily_close">마감</option><option value="weekly">주간</option><option value="infection">감염관리</option><option value="onboarding">온보딩</option></select></div>
        <div class="form-group"><label>항목 (한 줄에 하나씩)</label><textarea class="form-input" id="clItems" rows="8" placeholder="항목1\n항목2\n항목3"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="clSubmitBtn">추가</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('clSubmitBtn').addEventListener('click', async () => {
      const items = document.getElementById('clItems').value.split('\n').filter(s=>s.trim());
      try {
        await api('/api/protected/checklists', { method:'POST', json:{ title: document.getElementById('clTitle').value, checklist_type: document.getElementById('clType').value, items }});
        toast('체크리스트 추가!', 'success'); closeModal(); loadChecks();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

/* ─── Calendar ─── */
async function renderCalendar(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addEventBtn">${ICONS.plus} 일정 추가</button>`;
  const now = new Date();
  let curYear = now.getFullYear(), curMonth = now.getMonth();

  body.innerHTML = `<div id="calendarContainer" style="max-width:900px"></div>`;

  async function loadCal() {
    const container = document.getElementById('calendarContainer');
    const monthStr = `${curYear}-${String(curMonth+1).padStart(2,'0')}`;
    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    let events = [];
    try { events = await api('/api/protected/events?month=' + monthStr); } catch(e) {}

    const firstDay = new Date(curYear, curMonth, 1).getDay();
    const daysInMonth = new Date(curYear, curMonth+1, 0).getDate();
    const today = new Date();

    let calHtml = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" id="calPrev">${ICONS.chevronLeft}</button>
      <span style="font-weight:700;font-size:18px">${curYear}년 ${monthNames[curMonth]}</span>
      <button class="btn btn-secondary btn-sm" id="calNext">${ICONS.chevronRight}</button>
    </div>`;
    calHtml += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border-radius:var(--radius);overflow:hidden">`;
    ['일','월','화','수','목','금','토'].forEach((d,i) => {
      calHtml += `<div style="background:var(--bg);padding:8px;text-align:center;font-size:12px;font-weight:600;color:${i===0?'var(--danger)':i===6?'var(--info)':'var(--text-secondary)'}">${d}</div>`;
    });
    for (let i = 0; i < firstDay; i++) calHtml += `<div style="background:var(--bg-card);padding:8px;min-height:80px"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.start_date && e.start_date.startsWith(dateStr));
      const isToday = today.getFullYear()===curYear && today.getMonth()===curMonth && today.getDate()===d;
      const dow = (firstDay + d - 1) % 7;
      calHtml += `<div style="background:var(--bg-card);padding:6px;min-height:80px;${isToday?'outline:2px solid var(--primary);outline-offset:-2px;border-radius:2px':''}">
        <div style="font-size:12px;font-weight:${isToday?'700':'500'};color:${dow===0?'var(--danger)':dow===6?'var(--info)':'var(--text)'};margin-bottom:4px">${d}</div>
        ${dayEvents.slice(0,3).map(e => `<div class="cal-event-chip" style="--chip-color:${e.color||'#0f766e'};font-size:10px;padding:1px 4px;border-radius:3px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" title="${esc(e.title)}">${esc(e.title)}</div>`).join('')}
        ${dayEvents.length>3?`<div style="font-size:9px;color:var(--text-muted)">+${dayEvents.length-3}개</div>`:''}
      </div>`;
    }
    calHtml += '</div>';
    container.innerHTML = calHtml;
    document.getElementById('calPrev').addEventListener('click', () => { curMonth--; if(curMonth<0){curMonth=11;curYear--;} loadCal(); });
    document.getElementById('calNext').addEventListener('click', () => { curMonth++; if(curMonth>11){curMonth=0;curYear++;} loadCal(); });
  }
  loadCal();

  document.getElementById('addEventBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    const typeColors = { meeting:'#0f766e', vacation:'#6366f1', maintenance:'#f59e0b', education:'#3b82f6', other:'#64748b' };
    modal.innerHTML = `
      <div class="modal-header"><h3>📅 일정 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>제목</label><input class="form-input" id="evTitle" required placeholder="일정 제목"></div>
        <div class="form-grid">
          <div class="form-group"><label>유형</label><select class="form-input" id="evType"><option value="meeting">회의</option><option value="vacation">휴가</option><option value="maintenance">장비점검</option><option value="education">교육</option><option value="other">기타</option></select></div>
          <div class="form-group"><label>날짜</label><input class="form-input" type="date" id="evDate"></div>
        </div>
        <div class="form-group"><label>메모</label><input class="form-input" id="evDesc" placeholder="추가 설명"></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="evSubmitBtn">추가</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('evSubmitBtn').addEventListener('click', async () => {
      const evType = document.getElementById('evType').value;
      try {
        await api('/api/protected/events', { method:'POST', json:{
          title: document.getElementById('evTitle').value,
          description: document.getElementById('evDesc').value,
          event_type: evType,
          start_date: document.getElementById('evDate').value,
          color: typeColors[evType] || '#0f766e',
        }});
        toast('일정 추가!', 'success'); closeModal(); loadCal();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}


/* ─── Staff Supplies Kanban Board (직원용품 칸반보드) ─── */
async function renderStaffSupplies(body, actions) {
  const isAdmin = PFM.canManage();
  const itemTypes = {
    uniform:  { label: '유니폼', emoji: '👔', color: '#3b82f6' },
    cardigan: { label: '가디건', emoji: '🧥', color: '#8b5cf6' },
    nametag:  { label: '명찰',   emoji: '📛', color: '#f59e0b' },
    crocs:    { label: '크록스', emoji: '👟', color: '#22c55e' },
    shoes:    { label: '신발',   emoji: '👞', color: '#6366f1' },
    other:    { label: '기타',   emoji: '📦', color: '#64748b' },
  };
  const statusCols = [
    { id: 'requested', label: '요청됨', color: '#6366f1', emoji: '📋' },
    { id: 'approved',  label: '승인됨', color: '#3b82f6', emoji: '✅' },
    { id: 'ordered',   label: '주문완료', color: '#f59e0b', emoji: '📦' },
    { id: 'delivered', label: '수령완료', color: '#22c55e', emoji: '🎉' },
  ];
  const statusMap = {
    requested: { label: '요청됨', color: '#6366f1', bg: '#eef2ff', emoji: '📋' },
    approved:  { label: '승인됨', color: '#3b82f6', bg: '#dbeafe', emoji: '✅' },
    ordered:   { label: '주문완료', color: '#f59e0b', bg: '#fef3c7', emoji: '📦' },
    delivered: { label: '수령완료', color: '#22c55e', bg: '#dcfce7', emoji: '🎉' },
    cancelled: { label: '취소', color: '#ef4444', bg: '#fef2f2', emoji: '❌' },
  };

  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addSupplyBtn">${ICONS.plus} 주문 요청</button>`;

  let filterType = '';

  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap" id="typeFilter">
      <button class="btn btn-sm supply-type-tab active" data-type="" style="border-radius:20px">전체</button>
      ${Object.entries(itemTypes).map(([k,v]) => `<button class="btn btn-sm supply-type-tab" data-type="${k}" style="border-radius:20px">${v.emoji} ${v.label}</button>`).join('')}
    </div>
    <div class="kb-hint">💡 카드를 드래그하여 상태를 변경할 수 있습니다 (요청 → 승인 → 주문 → 수령)</div>
    <div class="kb-board" id="supplyKanban"></div>
  `;

  let allItems = [];

  async function loadBoard() {
    const container = document.getElementById('supplyKanban');
    try {
      let url = '/api/protected/staff-supplies?';
      if (filterType) url += 'item_type=' + filterType;
      allItems = await api(url);

      container.innerHTML = statusCols.map(col => {
        const colItems = allItems.filter(i => i.status === col.id);
        return `<div class="kb-col" data-status="${col.id}">
          <div class="kb-col-header" style="--col-color:${col.color}">
            <span>${col.emoji} ${col.label}</span>
            <span class="kb-col-count" style="background:${col.color}">${colItems.length}</span>
          </div>
          <div class="kb-col-body">
            ${colItems.length ? colItems.map(item => {
              const tp = itemTypes[item.item_type] || itemTypes.other;
              return `<div class="kb-card" draggable="true" data-id="${item.id}" style="--accent:${tp.color}">
                <div class="kb-card-title">${tp.emoji} ${esc(item.item_name)}</div>
                <div class="kb-card-desc" style="display:flex;flex-direction:column;gap:3px">
                  <span>👤 ${esc(item.user_name)}</span>
                  <span style="display:flex;gap:8px;flex-wrap:wrap">
                    ${item.size ? `<span>📏 ${esc(item.size)}</span>` : ''}
                    ${item.color ? `<span>🎨 ${esc(item.color)}</span>` : ''}
                    <span>×${item.quantity}</span>
                  </span>
                </div>
                ${item.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">💬 ${esc(item.notes)}</div>` : ''}
                <div class="kb-card-meta">
                  <span class="kb-card-badge" style="--badge-color:${tp.color}">${tp.label}</span>
                  ${item.order_date ? `<span class="kb-card-info">📦 ${item.order_date}</span>` : ''}
                  ${item.delivery_date ? `<span class="kb-card-info" style="color:var(--success)">✅ ${item.delivery_date}</span>` : ''}
                  <span class="kb-card-info" style="margin-left:auto">${esc(item.requested_by_name)}</span>
                </div>
              </div>`;
            }).join('') : '<div class="kb-col-empty">카드 없음</div>'}
          </div>
        </div>`;
      }).join('');

      // Drag & Drop → status change
      initKanbanDnD(container, async (itemId, newStatus) => {
        try {
          await api('/api/protected/staff-supplies/' + itemId, { method:'PUT', json:{ status: newStatus }});
          toast('상태 변경됨!', 'success');
          loadBoard();
        } catch(e) { toast(e.message, 'error'); }
      });

      // Click → detail modal
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openSupplyDetail(el.dataset.id);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
  }
  loadBoard();

  // Type filter events
  document.querySelectorAll('.supply-type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.supply-type-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterType = tab.dataset.type;
      loadBoard();
    });
  });

  // Detail modal
  function openSupplyDetail(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    const tp = itemTypes[item.item_type] || itemTypes.other;
    const st = statusMap[item.status] || statusMap.requested;
    const statuses = ['requested','approved','ordered','delivered','cancelled'];

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${tp.emoji} ${esc(item.item_name)}</h3>
        <div style="display:flex;gap:8px">
          ${isAdmin ? `<button class="btn-icon" id="delSupplyBtn" title="삭제">${ICONS.trash}</button>` : ''}
          <button class="btn-icon" id="modalClose">${ICONS.close}</button>
        </div>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <span class="meta-pill" style="background:${st.bg};color:${st.color}">${st.emoji} ${st.label}</span>
          <span class="meta-pill">👤 ${esc(item.user_name)}</span>
          <span class="meta-pill">${tp.emoji} ${tp.label}</span>
          ${item.size ? `<span class="meta-pill">📏 ${esc(item.size)}</span>` : ''}
          ${item.color ? `<span class="meta-pill">🎨 ${esc(item.color)}</span>` : ''}
          <span class="meta-pill">×${item.quantity}개</span>
          <span class="meta-pill">📝 요청: ${esc(item.requested_by_name)}</span>
        </div>
        ${item.notes ? `<p style="color:var(--text-secondary);margin-bottom:16px;white-space:pre-line">💬 ${esc(item.notes)}</p>` : ''}
        ${item.order_date ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">📦 주문일: ${item.order_date}</div>` : ''}
        ${item.delivery_date ? `<div style="font-size:12px;color:var(--success);margin-bottom:4px">✅ 수령일: ${item.delivery_date}</div>` : ''}
        ${item.approved_by_name ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">승인: ${esc(item.approved_by_name)}</div>` : ''}
        ${isAdmin ? `
          <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">상태 변경</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap" id="supplyStatusBtns">
              ${statuses.map(s => {
                const ss = statusMap[s];
                return `<button class="btn ${item.status===s?'btn-primary':'btn-secondary'} btn-sm status-btn" data-status="${s}" style="font-size:11px">${ss.emoji} ${ss.label}</button>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);

    if (isAdmin) {
      document.getElementById('delSupplyBtn')?.addEventListener('click', async () => {
        if (!confirm('이 주문을 삭제하시겠습니까?')) return;
        await api('/api/protected/staff-supplies/' + id, { method:'DELETE' });
        toast('삭제됨', 'success'); closeModal(); loadBoard();
      });
      modal.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await api('/api/protected/staff-supplies/' + id, { method:'PUT', json:{ status: btn.dataset.status }});
          toast('상태가 변경되었습니다', 'success'); closeModal(); loadBoard();
        });
      });
    }
  }

  // Add supply modal
  document.getElementById('addSupplyBtn').addEventListener('click', async () => {
    let users = [];
    try { users = await api('/api/protected/leave/users'); } catch(e) {}

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>👔 직원용품 주문 요청</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body">
        <form id="supplyForm" class="auth-form">
          <div class="form-group">
            <label>대상 직원 *</label>
            <select name="user_id" class="form-input">
              ${users.map(u => `<option value="${u.id}" ${u.id===state.user.id?'selected':''}>${h(u.name)} (${u.role==='admin'?'원장':u.role==='manager'?'실장':'스태프'})</option>`).join('')}
            </select>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>품목 *</label>
              <select name="item_type" id="supplyItemType" class="form-input">
                ${Object.entries(itemTypes).map(([k,v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>품명 *</label>
              <input type="text" name="item_name" id="supplyItemName" class="form-input" required placeholder="예: 수술복 상의">
            </div>
          </div>
          <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr">
            <div class="form-group">
              <label>사이즈</label>
              <input type="text" name="size" class="form-input" placeholder="예: M, 230">
            </div>
            <div class="form-group">
              <label>색상</label>
              <input type="text" name="color" class="form-input" placeholder="예: 네이비">
            </div>
            <div class="form-group">
              <label>수량</label>
              <input type="number" name="quantity" class="form-input" value="1" min="1">
            </div>
          </div>
          <div class="form-group">
            <label>메모</label>
            <textarea name="notes" class="form-input" rows="2" placeholder="추가 요청사항 (사이즈 교환, 신규입사 등)"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="supplySubmitBtn">📝 주문 요청</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

    // Auto-fill item_name based on item_type
    const typeNameMap = { uniform:'수술복', cardigan:'가디건', nametag:'명찰', crocs:'크록스 슬리퍼', shoes:'실내화', other:'' };
    document.getElementById('supplyItemType').addEventListener('change', function() {
      const nameInput = document.getElementById('supplyItemName');
      if (!nameInput.value || Object.values(typeNameMap).includes(nameInput.value)) {
        nameInput.value = typeNameMap[this.value] || '';
      }
    });

    document.getElementById('supplySubmitBtn').addEventListener('click', async () => {
      const form = document.getElementById('supplyForm');
      const itemName = form.item_name.value.trim();
      if (!itemName) { toast('품명을 입력해주세요', 'error'); return; }
      try {
        await api('/api/protected/staff-supplies', { method:'POST', json:{
          user_id: form.user_id.value,
          item_type: form.item_type.value,
          item_name: itemName,
          size: form.size.value,
          color: form.color.value,
          quantity: parseInt(form.quantity.value) || 1,
          notes: form.notes.value,
        }});
        toast('주문 요청 완료!', 'success');
        closeModal(); loadBoard();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}


PFM.modules.operations = { renderChecklists, renderCalendar, renderStaffSupplies };
})(window.PFM);
