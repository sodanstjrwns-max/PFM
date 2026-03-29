/* ═══ Module: 아웃바운드 콜 기록 (Outbound Call Records) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc, showModal, closeModal } = PFM;

// 인바운드 모듈에서 공유 데이터 참조
function getShared() { return PFM._callShared || {}; }

// ═══ 메인 렌더링 ═══
async function renderCallsOutbound(body, actions) {
  const shared = getShared();
  const { STAFF_OUTBOUND, CALL_PURPOSES, RESERVATION_STATUS, getTreatment, getResStatus, openCallForm, openCallStats, fmtDate } = shared;
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = `
    <button class="btn btn-primary btn-sm" id="addCallOutBtn">📱 아웃바운드 기록</button>
    <button class="btn btn-sm" id="callOutStatsBtn" style="margin-left:6px">📊 통계</button>
  `;
  
  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
  
  let filters = { search: '', staff: '', reservation: '', purpose: '' };
  
  async function loadRecords(month) {
    currentMonth = month;
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    
    const params = new URLSearchParams({ type: 'outbound', month });
    if (filters.search) params.set('search', filters.search);
    if (filters.staff) params.set('staff', filters.staff);
    if (filters.reservation) params.set('reservation', filters.reservation);
    if (filters.purpose) params.set('purpose', filters.purpose);
    
    try {
      const data = await api(`/api/protected/calls?${params}`);
      renderList(data.records || [], month);
    } catch(e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444">데이터를 불러올 수 없습니다</div>';
    }
  }
  
  function renderList(records, month) {
    const [y,m] = month.split('-').map(Number);
    const prevMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    const nextMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
    
    const totalReserved = records.filter(r => r.reservation_status === 'reserved').length;
    const totalNotReserved = records.filter(r => r.reservation_status === 'not_reserved').length;
    const totalNoAnswer = records.filter(r => r.reservation_status === 'no_answer').length;
    const resRate = records.length > 0 ? Math.round(totalReserved / records.length * 100) : 0;
    
    // 통화 목적별 집계
    const purposeCounts = {};
    records.forEach(r => {
      if (r.call_purpose) {
        purposeCounts[r.call_purpose] = (purposeCounts[r.call_purpose] || 0) + 1;
      }
    });
    
    body.innerHTML = `
      <!-- 월 네비게이션 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <button class="btn btn-sm" id="coPrevMonth">◀ ${prevMonth.split('-')[1]}월</button>
        <h3 style="margin:0;font-size:18px;font-weight:900">${y}년 ${m}월 아웃바운드 콜</h3>
        <button class="btn btn-sm" id="coNextMonth">${nextMonth.split('-')[1]}월 ▶</button>
      </div>
      
      <!-- 요약 카드 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">총 콜</div>
          <div style="font-size:24px;font-weight:900;color:#8b5cf6">${records.length}</div>
        </div>
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">✅ 예약</div>
          <div style="font-size:24px;font-weight:900;color:#22c55e">${totalReserved}</div>
        </div>
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">❌ 미예약</div>
          <div style="font-size:24px;font-weight:900;color:#ef4444">${totalNotReserved}</div>
        </div>
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">📵 부재중</div>
          <div style="font-size:24px;font-weight:900;color:#f59e0b">${totalNoAnswer}</div>
        </div>
        <div class="card-sm">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">예약률</div>
          <div style="font-size:24px;font-weight:900;color:${resRate>=30?'#22c55e':'#ef4444'}">${resRate}%</div>
        </div>
      </div>
      
      <!-- 통화 목적 요약 칩 -->
      ${Object.keys(purposeCounts).length > 0 ? `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${Object.entries(purposeCounts).sort((a,b) => b[1]-a[1]).map(([key, cnt]) => {
          const p = CALL_PURPOSES.find(p => p.key === key) || { icon: '📝', label: key };
          return `<span style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:11px;display:inline-flex;align-items:center;gap:4px">
            ${p.icon} ${esc(p.label)} <strong style="color:var(--primary)">${cnt}</strong>
          </span>`;
        }).join('')}
      </div>` : ''}
      
      <!-- 검색/필터 -->
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:180px">
          <input type="text" id="coSearch" placeholder="🔍 환자명, 연락처, 코멘트 검색..." value="${esc(filters.search)}"
            style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg-card)">
        </div>
        <select id="coFilterStaff" class="input-sm">
          <option value="">응대자 전체</option>
          ${STAFF_OUTBOUND.map(s => `<option value="${esc(s)}" ${filters.staff===s?'selected':''}>${esc(s)}</option>`).join('')}
        </select>
        <select id="coFilterPurpose" class="input-sm">
          <option value="">목적 전체</option>
          ${CALL_PURPOSES.map(p => `<option value="${p.key}" ${filters.purpose===p.key?'selected':''}>${p.icon} ${p.label}</option>`).join('')}
        </select>
        <select id="coFilterRes" class="input-sm">
          <option value="">예약여부 전체</option>
          ${RESERVATION_STATUS.map(r => `<option value="${r.key}" ${filters.reservation===r.key?'selected':''}>${r.icon} ${r.label}</option>`).join('')}
        </select>
      </div>
      
      <!-- 테이블 -->
      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1000px">
          <thead>
            <tr style="background:var(--bg);border-bottom:2px solid var(--border)">
              <th class="tbl-header">날짜</th>
              <th class="tbl-header">환자명</th>
              <th class="tbl-header">연락처</th>
              <th style="padding:10px 8px;text-align:center;font-weight:700;font-size:11px;color:var(--text-muted)">신/구환</th>
              <th class="tbl-header">응대자</th>
              <th class="tbl-header">관심진료</th>
              <th class="tbl-header">통화목적</th>
              <th style="padding:10px 8px;text-align:center;font-weight:700;font-size:11px;color:var(--text-muted)">예약여부</th>
              <th class="tbl-header">예약일</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted);max-width:220px">코멘트</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? `<tr><td colspan="10" style="padding:40px;text-align:center;color:var(--text-muted)">등록된 아웃바운드 콜이 없습니다</td></tr>` : ''}
            ${records.map(r => {
              const treat = getTreatment(r.treatment_interest);
              const res = getResStatus(r.reservation_status);
              const purpose = CALL_PURPOSES.find(p => p.key === r.call_purpose) || { icon: '', label: r.call_purpose || '-' };
              const ptColor = r.patient_type === 'new' ? '#3b82f6' : '#22c55e';
              const ptLabel = r.patient_type === 'new' ? '신환' : r.patient_type === 'existing' ? '구환' : '-';
              return `<tr class="co-row" data-id="${r.id}" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <td style="padding:8px;font-size:11px;white-space:nowrap">${fmtDate(r.call_date)}</td>
                <td style="padding:8px;font-weight:700">${esc(r.patient_name||'-')}</td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted)">${esc(r.phone||'-')}</td>
                <td class="tbl-cell-center"><span style="background:${ptColor}15;color:${ptColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${ptLabel}</span></td>
                <td style="padding:8px;font-size:11px">${esc(r.staff_name||'-')}</td>
                <td style="padding:8px"><span style="background:${treat.color}20;color:${treat.color};padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600">${esc(treat.label)}</span></td>
                <td style="padding:8px;font-size:11px">${purpose.icon} ${esc(purpose.label)}</td>
                <td class="tbl-cell-center"><span style="color:${res.color};font-weight:700;font-size:12px">${res.icon}</span> <span style="font-size:10px;color:${res.color}">${res.label}</span></td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted)">${fmtDate(r.reservation_date)}</td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.comment||'-')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:right">총 ${records.length}건</div>
    `;
    
    // 이벤트
    document.getElementById('coPrevMonth')?.addEventListener('click', () => loadRecords(prevMonth));
    document.getElementById('coNextMonth')?.addEventListener('click', () => loadRecords(nextMonth));
    
    let searchT = null;
    document.getElementById('coSearch')?.addEventListener('input', (e) => {
      clearTimeout(searchT);
      searchT = setTimeout(() => { filters.search = e.target.value.trim(); loadRecords(currentMonth); }, 300);
    });
    document.getElementById('coFilterStaff')?.addEventListener('change', (e) => { filters.staff = e.target.value; loadRecords(currentMonth); });
    document.getElementById('coFilterPurpose')?.addEventListener('change', (e) => { filters.purpose = e.target.value; loadRecords(currentMonth); });
    document.getElementById('coFilterRes')?.addEventListener('change', (e) => { filters.reservation = e.target.value; loadRecords(currentMonth); });
    
    document.querySelectorAll('.co-row').forEach(row => {
      row.addEventListener('click', () => openCallForm('outbound', records.find(r => r.id === row.dataset.id), () => loadRecords(currentMonth)));
    });
  }
  
  await loadRecords(currentMonth);
  
  document.getElementById('addCallOutBtn')?.addEventListener('click', () => {
    openCallForm('outbound', null, () => loadRecords(currentMonth));
  });
  
  document.getElementById('callOutStatsBtn')?.addEventListener('click', () => {
    openCallStats('outbound', currentMonth);
  });
}

// ═══ 모듈 등록 ═══
PFM.modules.callsOutbound = { renderCallsOutbound };

})(window.PFM);
