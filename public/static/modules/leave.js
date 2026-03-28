/* ═══ Module: Leave Management ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, timeAgo } = PFM;

async function renderLeaveManagement(body, actions) {
  const isAdmin = state.user.role === 'admin' || state.user.role === 'manager';
  const today = new Date();
  let currentMonth = today.toISOString().slice(0,7);
  const currentYear = today.getFullYear();

  const leaveTypeMap = {
    annual: { label: '연차', color: '#3b82f6', emoji: '🏖️' },
    sick: { label: '병가', color: '#ef4444', emoji: '🤒' },
    half_am: { label: '오전반차', color: '#8b5cf6', emoji: '🌅' },
    half_pm: { label: '오후반차', color: '#a855f7', emoji: '🌇' },
    special: { label: '특별휴가', color: '#f59e0b', emoji: '🎉' },
    compensation: { label: '대체휴무', color: '#22c55e', emoji: '🔄' },
  };
  const statusMap = {
    pending: { label: '대기', color: '#f59e0b', bg: '#fef3c7' },
    approved: { label: '승인', color: '#22c55e', bg: '#dcfce7' },
    rejected: { label: '반려', color: '#ef4444', bg: '#fee2e2' },
    cancelled: { label: '취소', color: '#94a3b8', bg: '#f1f5f9' },
  };

  actions.innerHTML = `<button class="btn btn-primary" id="leaveRequestBtn">🏖️ 연차 신청</button>`;

  body.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-sm" id="prevMonth">◀</button>
        <span id="monthLabel" style="font-weight:700;font-size:16px;min-width:100px;text-align:center">${currentMonth}</span>
        <button class="btn btn-sm" id="nextMonth">▶</button>
      </div>
      ${isAdmin ? '<button class="btn btn-sm" id="pendingFilter" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d">⏳ 승인 대기</button>' : ''}
      ${isAdmin ? '<button class="btn btn-sm" id="balanceSettingBtn" style="background:var(--primary-light);color:white">⚙️ 연차 설정</button>' : ''}
    </div>
    <div id="leaveBalanceCards" style="margin-bottom:24px"></div>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start" id="leaveLayout">
      <div id="leaveCalendar" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;min-height:400px"></div>
      <div id="leaveList" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-height:600px;overflow-y:auto"></div>
    </div>
  `;

  async function loadBalances() {
    const bals = await api('/api/protected/leave/balances?year=' + currentYear);
    const container = document.getElementById('leaveBalanceCards');
    if (!bals || bals.length === 0) {
      container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px">연차 잔여 정보가 없습니다. 관리자에게 설정을 요청하세요.</div>';
      return;
    }
    // Group by user
    const byUser = {};
    bals.forEach(b => {
      if (!byUser[b.user_id]) byUser[b.user_id] = { name: b.user_name, role: b.user_role, items: [] };
      byUser[b.user_id].items.push(b);
    });
    
    container.innerHTML = Object.entries(byUser).map(([uid, u]) => {
      const annualBal = u.items.find(i => i.leave_type === 'annual');
      const sickBal = u.items.find(i => i.leave_type === 'sick');
      const annualRemain = annualBal ? (annualBal.total_days - annualBal.used_days) : 0;
      const sickRemain = sickBal ? (sickBal.total_days - sickBal.used_days) : 0;
      const annualTotal = annualBal ? annualBal.total_days : 0;
      const sickTotal = sickBal ? sickBal.total_days : 0;
      const pct = annualTotal > 0 ? Math.round((annualBal.used_days / annualTotal) * 100) : 0;
      const roleLabel = u.role === 'admin' ? '원장' : u.role === 'manager' ? '관리자' : '스태프';
      return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:inline-flex;flex-direction:column;gap:8px;min-width:200px;margin-right:12px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:14px">${esc(u.name)}</span>
          <span style="font-size:11px;color:var(--text-secondary);background:var(--bg-main);padding:2px 8px;border-radius:10px">${roleLabel}</span>
        </div>
        <div style="display:flex;gap:16px;font-size:13px">
          <div>🏖️ 연차 <strong style="color:#3b82f6">${annualRemain}</strong>/<span style="color:var(--text-secondary)">${annualTotal}일</span></div>
          <div>🤒 병가 <strong style="color:#ef4444">${sickRemain}</strong>/<span style="color:var(--text-secondary)">${sickTotal}일</span></div>
        </div>
        <div style="background:#e2e8f0;border-radius:4px;height:6px;overflow:hidden">
          <div style="background:${pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6'};height:100%;width:${pct}%;transition:width 0.3s"></div>
        </div>
        <div style="font-size:11px;color:var(--text-secondary)">연차 사용률 ${pct}%</div>
      </div>`;
    }).join('');
  }

  async function loadCalendar() {
    const requests = await api('/api/protected/leave/requests?month=' + currentMonth);
    const cal = document.getElementById('leaveCalendar');
    document.getElementById('monthLabel').textContent = currentMonth;
    
    const [yr, mo] = currentMonth.split('-').map(Number);
    const firstDay = new Date(yr, mo - 1, 1).getDay();
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const todayStr = today.toISOString().slice(0, 10);
    
    // Build request map
    const dayMap = {};
    (requests || []).forEach(r => {
      if (r.status === 'cancelled') return;
      const s = new Date(r.start_date);
      const e = new Date(r.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().slice(0, 10);
        if (ds.startsWith(currentMonth)) {
          const day = d.getDate();
          if (!dayMap[day]) dayMap[day] = [];
          dayMap[day].push(r);
        }
      }
    });

    const days = ['일','월','화','수','목','금','토'];
    let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">`;
    html += days.map((d,i) => `<div style="font-size:12px;font-weight:700;color:${i===0?'#ef4444':i===6?'#3b82f6':'var(--text-secondary)'};padding:8px 0">${d}</div>`).join('');
    
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth}-${String(day).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const dow = (firstDay + day - 1) % 7;
      const events = dayMap[day] || [];
      const hasEvents = events.length > 0;
      
      html += `<div class="leave-cal-day" data-day="${day}" style="min-height:60px;border:1px solid ${isToday ? 'var(--primary)' : 'var(--border)'};border-radius:6px;padding:4px;cursor:${hasEvents?'pointer':'default'};background:${isToday?'rgba(20,184,166,0.08)':'transparent'};transition:all 0.15s;position:relative">
        <div style="font-size:12px;font-weight:${isToday?'800':'500'};color:${dow===0?'#ef4444':dow===6?'#3b82f6':'var(--text-primary)'};margin-bottom:2px">${day}</div>
        ${events.slice(0,3).map(e => `<div style="font-size:9px;padding:1px 3px;margin-bottom:1px;border-radius:3px;background:${statusMap[e.status]?.bg || '#f1f5f9'};color:${statusMap[e.status]?.color || '#666'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(e.user_name)} ${leaveTypeMap[e.leave_type]?.label||''}">${leaveTypeMap[e.leave_type]?.emoji||''} ${esc(e.user_name)}</div>`).join('')}
        ${events.length > 3 ? `<div style="font-size:9px;color:var(--text-secondary)">+${events.length-3}</div>` : ''}
      </div>`;
    }
    html += '</div>';
    cal.innerHTML = html;
    
    // Add click handlers for days with events
    cal.querySelectorAll('.leave-cal-day').forEach(el => {
      const day = parseInt(el.dataset.day);
      const events = dayMap[day];
      if (!events || events.length === 0) return;
      el.addEventListener('click', function(e) {
        document.querySelectorAll('.leave-day-detail').forEach(d => d.remove());
        const detail = document.createElement('div');
        detail.className = 'leave-day-detail';
        detail.style.cssText = 'position:absolute;top:100%;left:0;z-index:100;background:white;border:1px solid var(--border);border-radius:8px;padding:12px;box-shadow:var(--shadow-md);min-width:220px;font-size:12px';
        detail.innerHTML = events.map(ev => {
          const lt = leaveTypeMap[ev.leave_type] || { label: ev.leave_type, color: '#666' };
          const st = statusMap[ev.status] || { label: ev.status, color: '#666', bg: '#f1f5f9' };
          return '<div style="margin-bottom:6px"><strong>' + esc(ev.user_name) + '</strong> · <span style="color:' + lt.color + '">' + lt.label + '</span> · <span style="background:' + st.bg + ';color:' + st.color + ';padding:1px 6px;border-radius:4px;font-size:10px">' + st.label + '</span></div>';
        }).join('');
        el.appendChild(detail);
        e.stopPropagation();
      });
    });
    
    // Close day detail on outside click (with cleanup)
    const leaveClickAc = new AbortController();
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.leave-day-detail')) {
        document.querySelectorAll('.leave-day-detail').forEach(el => el.remove());
      }
    }, { signal: leaveClickAc.signal });
    const leaveObs = new MutationObserver(() => { if (!document.getElementById('leaveCalendar')) { leaveClickAc.abort(); leaveObs.disconnect(); } });
    leaveObs.observe(document.body, { childList: true, subtree: true });
  }

  async function loadList(filterStatus) {
    let url = '/api/protected/leave/requests?month=' + currentMonth;
    if (filterStatus) url += '&status=' + filterStatus;
    const requests = await api(url);
    const list = document.getElementById('leaveList');
    
    if (!requests || requests.length === 0) {
      list.innerHTML = `<div style="text-align:center;color:var(--text-secondary);padding:40px 0"><div style="font-size:32px;margin-bottom:8px">📋</div><div>이번 달 ${filterStatus === 'pending' ? '승인 대기 중인 ' : ''}신청 내역이 없습니다</div></div>`;
      return;
    }
    
    list.innerHTML = `<div style="font-weight:700;font-size:14px;margin-bottom:12px">${filterStatus === 'pending' ? '⏳ 승인 대기' : '📋 신청 내역'} (${requests.length}건)</div>` +
    requests.map(r => {
      const lt = leaveTypeMap[r.leave_type] || { label: r.leave_type, color: '#666', emoji: '📅' };
      const st = statusMap[r.status] || { label: r.status, color: '#666', bg: '#f1f5f9' };
      const dateRange = r.start_date === r.end_date ? r.start_date : `${r.start_date} ~ ${r.end_date}`;
      return `<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px;border-left:3px solid ${lt.color}" class="leave-item" data-id="${r.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:700;font-size:13px">${lt.emoji} ${esc(r.user_name)}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${st.bg};color:${st.color};font-weight:600">${st.label}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">${lt.label} · ${r.days}일 · ${dateRange}</div>
        ${r.reason ? `<div style="font-size:12px;color:var(--text-secondary)">💬 ${esc(r.reason)}</div>` : ''}
        ${r.reject_reason ? `<div style="font-size:12px;color:#ef4444;margin-top:4px">❌ 반려 사유: ${esc(r.reject_reason)}</div>` : ''}
        ${r.status === 'pending' && isAdmin ? `<div style="display:flex;gap:6px;margin-top:8px">
          <button class="btn btn-sm" style="background:#22c55e;color:white;font-size:11px" onclick="approveLeave('${r.id}')">✅ 승인</button>
          <button class="btn btn-sm" style="background:#ef4444;color:white;font-size:11px" onclick="rejectLeave('${r.id}')">❌ 반려</button>
        </div>` : ''}
        ${r.status === 'pending' && r.user_id === state.user.id ? `<div style="margin-top:8px"><button class="btn btn-sm" style="font-size:11px" onclick="cancelLeave('${r.id}')">취소</button></div>` : ''}
        ${r.status === 'approved' && (r.user_id === state.user.id || state.user.role === 'admin') ? `<div style="margin-top:8px"><button class="btn btn-sm" style="font-size:11px;color:#ef4444" onclick="cancelLeave('${r.id}')">연차 취소 (잔여 복구)</button></div>` : ''}
      </div>`;
    }).join('');
  }

  // Approve
  window.approveLeave = async function(id) {
    if (!confirm('승인하시겠습니까?')) return;
    const res = await api('/api/protected/leave/requests/' + id, { method: 'PUT', json: { status: 'approved' } });
    if (res.success) { toast('승인 완료! ✅', 'success'); loadAll(); }
    else toast(res.error || '오류 발생', 'error');
  };
  window.rejectLeave = async function(id) {
    const reason = prompt('반려 사유를 입력하세요:');
    if (reason === null) return;
    const res = await api('/api/protected/leave/requests/' + id, { method: 'PUT', json: { status: 'rejected', reject_reason: reason } });
    if (res.success) { toast('반려 처리되었습니다', 'info'); loadAll(); }
    else toast(res.error || '오류 발생', 'error');
  };
  window.cancelLeave = async function(id) {
    if (!confirm('연차 신청을 취소하시겠습니까?')) return;
    const res = await api('/api/protected/leave/requests/' + id, { method: 'DELETE' });
    if (res.success) { toast('취소 완료! 잔여일수가 복구됩니다', 'info'); loadAll(); }
    else toast(res.error || '오류 발생', 'error');
  };

  async function loadAll(filterStatus) {
    await Promise.all([loadBalances(), loadCalendar(), loadList(filterStatus)]);
  }

  loadAll();

  // Month nav
  document.getElementById('prevMonth').onclick = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    currentMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    loadAll();
  };
  document.getElementById('nextMonth').onclick = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    currentMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
    loadAll();
  };

  if (isAdmin) {
    document.getElementById('pendingFilter').onclick = function() {
      this.classList.toggle('active');
      loadAll(this.classList.contains('active') ? 'pending' : null);
    };
  }

  // 연차 신청 모달
  document.getElementById('leaveRequestBtn').onclick = async () => {
    // 잔여일수 조회
    const myBals = await api('/api/protected/leave/balances?year=' + currentYear + '&user_id=' + state.user.id);
    const annualBal = (myBals||[]).find(b => b.leave_type === 'annual');
    const sickBal = (myBals||[]).find(b => b.leave_type === 'sick');
    const annualRemain = annualBal ? (annualBal.total_days - annualBal.used_days) : 0;
    const sickRemain = sickBal ? (sickBal.total_days - sickBal.used_days) : 0;

    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '520px';
    modal.style.padding = '0';
    modal.innerHTML = `
      <div style="padding:36px 40px 32px">
        <div style="text-align:center;margin-bottom:28px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#06b6d4);margin-bottom:14px">
            <span style="font-size:30px">🏖️</span>
          </div>
          <h2 style="margin:0;font-size:21px;font-weight:800;letter-spacing:-0.3px">연차 신청</h2>
          <p style="margin:8px 0 0;font-size:13px;color:var(--text-secondary);line-height:1.5">휴가 유형을 선택하고 날짜를 지정하세요</p>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:28px">
          <div style="flex:1;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:14px;padding:18px 16px;text-align:center">
            <div style="font-size:12px;color:#3b82f6;font-weight:600;margin-bottom:6px">🏖️ 연차 잔여</div>
            <div style="font-size:24px;font-weight:800;color:#1d4ed8">${annualRemain}<span style="font-size:12px;font-weight:500;color:#64748b"> / ${annualBal ? annualBal.total_days : 0}일</span></div>
          </div>
          <div style="flex:1;background:linear-gradient(135deg,#fef2f2,#fee2e2);border-radius:14px;padding:18px 16px;text-align:center">
            <div style="font-size:12px;color:#ef4444;font-weight:600;margin-bottom:6px">🤒 병가 잔여</div>
            <div style="font-size:24px;font-weight:800;color:#dc2626">${sickRemain}<span style="font-size:12px;font-weight:500;color:#64748b"> / ${sickBal ? sickBal.total_days : 0}일</span></div>
          </div>
        </div>

        <form id="leaveForm">
          <div style="margin-bottom:24px">
            <label style="display:block;font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">휴가 유형</label>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px" id="leaveTypeGrid">
              <label class="leave-type-option selected" data-value="annual" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:2px solid var(--primary);border-radius:12px;cursor:pointer;transition:all 0.15s;background:rgba(20,184,166,0.06)">
                <span style="font-size:22px">🏖️</span><span style="font-size:12px;font-weight:600">연차</span>
              </label>
              <label class="leave-type-option" data-value="half_am" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.15s">
                <span style="font-size:22px">🌅</span><span style="font-size:12px;font-weight:600">오전반차</span>
              </label>
              <label class="leave-type-option" data-value="half_pm" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.15s">
                <span style="font-size:22px">🌇</span><span style="font-size:12px;font-weight:600">오후반차</span>
              </label>
              <label class="leave-type-option" data-value="sick" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.15s">
                <span style="font-size:22px">🤒</span><span style="font-size:12px;font-weight:600">병가</span>
              </label>
              <label class="leave-type-option" data-value="special" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.15s">
                <span style="font-size:22px">🎉</span><span style="font-size:12px;font-weight:600">특별휴가</span>
              </label>
              <label class="leave-type-option" data-value="compensation" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border:2px solid var(--border);border-radius:12px;cursor:pointer;transition:all 0.15s">
                <span style="font-size:22px">🔄</span><span style="font-size:12px;font-weight:600">대체휴무</span>
              </label>
            </div>
            <input type="hidden" name="leave_type" value="annual">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px">
            <div>
              <label style="display:block;font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px">시작일</label>
              <input type="date" name="start_date" required value="${today.toISOString().slice(0,10)}" style="width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font-size:14px;box-sizing:border-box">
            </div>
            <div id="endDateField">
              <label style="display:block;font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px">종료일</label>
              <input type="date" name="end_date" required value="${today.toISOString().slice(0,10)}" style="width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font-size:14px;box-sizing:border-box">
            </div>
          </div>

          <div style="margin-bottom:24px">
            <label style="display:block;font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px">사유</label>
            <textarea name="reason" rows="2" placeholder="사유를 입력하세요 (선택사항)" style="width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font-size:13px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>
          </div>

          <div id="daysPreview" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:18px;border-radius:12px;text-align:center;margin-bottom:28px;border:1px solid #bbf7d0">
            <span style="font-size:26px">📅</span>
            <div style="font-size:20px;font-weight:800;color:#15803d;margin-top:6px">1일 신청</div>
          </div>

          <div style="display:flex;gap:12px">
            <button type="button" class="btn" onclick="closeModal()" style="flex:1;padding:14px;font-size:14px;font-weight:600;border-radius:12px">취소</button>
            <button type="submit" class="btn btn-primary" style="flex:2;padding:14px;font-size:14px;font-weight:700;border-radius:12px">🏖️ 신청하기</button>
          </div>
        </form>
      </div>
    `;
    showModal();

    const form = document.getElementById('leaveForm');
    const endField = document.getElementById('endDateField');
    const preview = document.getElementById('daysPreview');
    let selectedType = 'annual';

    // Type selection grid
    document.querySelectorAll('.leave-type-option').forEach(opt => {
      opt.addEventListener('click', function() {
        document.querySelectorAll('.leave-type-option').forEach(o => { o.style.border = '2px solid var(--border)'; o.style.background = 'transparent'; o.classList.remove('selected'); });
        this.style.border = '2px solid var(--primary)';
        this.style.background = 'rgba(20,184,166,0.06)';
        this.classList.add('selected');
        selectedType = this.dataset.value;
        form.leave_type.value = selectedType;
        updatePreview();
      });
    });

    function updatePreview() {
      if (selectedType === 'half_am' || selectedType === 'half_pm') {
        endField.style.display = 'none';
        form.end_date.value = form.start_date.value;
        preview.innerHTML = '<span style="font-size:24px">🌤️</span><div style="font-size:18px;font-weight:800;color:#15803d;margin-top:4px">0.5일 (반차) 신청</div>';
      } else {
        endField.style.display = '';
        const s = new Date(form.start_date.value);
        const e = new Date(form.end_date.value);
        const d = Math.max(1, Math.round((e - s) / 86400000) + 1);
        preview.innerHTML = '<span style="font-size:24px">📅</span><div style="font-size:18px;font-weight:800;color:#15803d;margin-top:4px">' + d + '일 신청</div>';
      }
    }
    form.start_date.onchange = () => { if (form.end_date.value < form.start_date.value) form.end_date.value = form.start_date.value; updatePreview(); };
    form.end_date.onchange = updatePreview;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        leave_type: form.leave_type.value,
        start_date: form.start_date.value,
        end_date: form.end_date.value || form.start_date.value,
        reason: form.reason.value,
      };
      const res = await api('/api/protected/leave/requests', { method: 'POST', json: data }) ;
      if (res.error) { toast(res.error, 'error'); return; }
      toast(`연차 신청 완료! (${res.days}일)`, 'success');
      closeModal();
      loadAll();
    };
  };

  // 연차 설정 모달 (admin only)
  if (isAdmin && document.getElementById('balanceSettingBtn')) {
    document.getElementById('balanceSettingBtn').onclick = async () => {
      const users = await api('/api/protected/leave/users');
      const balances = await api('/api/protected/leave/balances?year=' + currentYear);
      
      const modal = document.getElementById('modalContent');
      modal.style.padding = '0';
      modal.innerHTML = `
      <div style="padding:36px 40px 32px">
        <h2 style="margin-bottom:24px;font-size:20px;font-weight:800">⚙️ ${currentYear}년 연차 설정</h2>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;line-height:1.5">직원별 연차/병가 총 일수를 설정합니다. 변경 시 자동 저장됩니다.</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg-main)">
              <th style="padding:10px;text-align:left;border-bottom:2px solid var(--border)">직원</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border)">🏖️ 연차 (일)</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border)">🤒 병가 (일)</th>
            </tr>
          </thead>
          <tbody>
            ${(users||[]).map(u => {
              const ab = (balances||[]).find(b => b.user_id === u.id && b.leave_type === 'annual');
              const sb = (balances||[]).find(b => b.user_id === u.id && b.leave_type === 'sick');
              return `<tr>
                <td style="padding:10px;border-bottom:1px solid var(--border)"><strong>${esc(u.name)}</strong> <span style="font-size:11px;color:var(--text-secondary)">${u.role}</span></td>
                <td style="padding:10px;text-align:center;border-bottom:1px solid var(--border)">
                  <input type="number" min="0" max="30" step="0.5" value="${ab ? ab.total_days : 0}" 
                    style="width:60px;text-align:center;padding:4px;border:1px solid var(--border);border-radius:4px"
                    onchange="saveBalance('${u.id}','annual',this.value)">
                  ${ab ? `<span style="font-size:11px;color:var(--text-secondary)">(사용 ${ab.used_days})</span>` : ''}
                </td>
                <td style="padding:10px;text-align:center;border-bottom:1px solid var(--border)">
                  <input type="number" min="0" max="30" step="0.5" value="${sb ? sb.total_days : 0}" 
                    style="width:60px;text-align:center;padding:4px;border:1px solid var(--border);border-radius:4px"
                    onchange="saveBalance('${u.id}','sick',this.value)">
                  ${sb ? `<span style="font-size:11px;color:var(--text-secondary)">(사용 ${sb.used_days})</span>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div style="text-align:right;margin-top:24px"><button class="btn" onclick="closeModal()" style="padding:10px 24px;border-radius:10px">닫기</button></div>
      </div>
      `;
      showModal();

      window.saveBalance = async function(userId, leaveType, totalDays) {
        await api('/api/protected/leave/balances', { method: 'POST', json: { user_id: userId, year: currentYear, leave_type: leaveType, total_days: parseFloat(totalDays) } });
        toast('저장 완료!', 'success');
      };
    };
  }
}


PFM.modules.leave = { renderLeaveManagement };
})(window.PFM);
