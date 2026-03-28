/* ═══ Module: 상담 기록 + 상담 분석 대시보드 (실장노트 기반) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc, showModal, closeModal, navigate } = PFM;

const CATEGORIES = {
  implant: '임플란트', orthodontics: '교정', complex: '복합', general: '일반진료'
};
const CAT_COLORS = {
  implant: '#3b82f6', orthodontics: '#8b5cf6', complex: '#f59e0b', general: '#6b7280'
};
// ═══ 내원경로 분류체계 (4대분류 + 세부) ═══
// 대분류: 1.소개 2.온라인 3.그냥 4.미입력
const VISIT_SOURCES = {
  // 1. 소개
  ref_patient: '👥 환자 소개',
  ref_acquaintance: '🤝 지인 소개',
  ref_staff: '👩‍⚕️ 직원 소개',
  ref_doctor: '👨‍⚕️ 원장 소개',
  // 2. 온라인
  online_search: '🔍 검색',
  online_naver: '🟢 네이버',
  online_blog: '📝 블로그',
  online_insta: '📸 인스타그램',
  online_youtube: '🔴 유튜브',
  online_homepage: '🌐 홈페이지',
  online_homepage_db: '📊 홈페이지(DB)',
  online_cafe: '☕ 네이버카페',
  online_daangn: '🥕 당근마켓',
  online_ad: '📢 광고',
  online_etc: '💻 기타 온라인',
  // 3. 그냥
  walk_sign: '🚶 간판보고',
  walk_near: '📍 가까워서',
  // 4. 미입력은 빈값('')으로 처리
};
const SOURCE_GROUPS = {
  ref_patient: '소개', ref_acquaintance: '소개', ref_staff: '소개', ref_doctor: '소개',
  online_search: '온라인', online_naver: '온라인', online_blog: '온라인', online_insta: '온라인',
  online_youtube: '온라인', online_homepage: '온라인', online_homepage_db: '온라인',
  online_cafe: '온라인', online_daangn: '온라인', online_ad: '온라인', online_etc: '온라인',
  walk_sign: '그냥', walk_near: '그냥'
};
const SOURCE_GROUP_LABELS = { '소개': '👥 소개', '온라인': '💻 온라인', '그냥': '🚶 그냥', '미입력': '⬜ 미입력' };
const SOURCE_GROUP_COLORS = { '소개': '#22c55e', '온라인': '#3b82f6', '그냥': '#f59e0b', '미입력': '#cbd5e1' };
const SOURCE_COLORS = {
  ref_patient: '#22c55e', ref_acquaintance: '#16a34a', ref_staff: '#15803d', ref_doctor: '#166534',
  online_search: '#3b82f6', online_naver: '#2db400', online_blog: '#0ea5e9', online_insta: '#e1306c',
  online_youtube: '#ff0000', online_homepage: '#6366f1', online_homepage_db: '#8b5cf6',
  online_cafe: '#059669', online_daangn: '#f97316', online_ad: '#ec4899', online_etc: '#64748b',
  walk_sign: '#f59e0b', walk_near: '#d97706'
};

function fmtWon(n) {
  if (!n && n !== 0) return '-';
  if (n >= 10000) return Math.round(n/10000).toLocaleString() + '만';
  return n.toLocaleString() + '원';
}
function fmtMan(n) {
  if (!n && n !== 0) return '-';
  return Math.round(n / 10000).toLocaleString() + '만';
}

// ═══ 상담 기록 목록/입력 화면 ═══
async function renderConsultRecords(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = `
    ${isManager ? '<button class="btn btn-primary btn-sm" id="addConsultBtn">➕ 상담 기록</button>' : ''}
    <button class="btn btn-sm" onclick="PFM.navigate('consult_dashboard')" style="margin-left:6px">📊 분석</button>
  `;
  
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  let staffData = null;
  try { staffData = await api('/api/protected/consult-records/staff'); } catch(e) {}
  
  async function loadRecords(month) {
    currentMonth = month;
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    const records = await api(`/api/protected/consult-records?month=${month}`);
    renderRecordsList(body, records, month, loadRecords, staffData, isManager);
  }
  
  await loadRecords(currentMonth);
  
  document.getElementById('addConsultBtn')?.addEventListener('click', () => {
    openRecordForm(null, staffData, async () => { await loadRecords(currentMonth); });
  });
}

function renderRecordsList(body, records, month, reload, staffData, isManager) {
  const prevMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const nextMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7); })();
  const displayMonth = month.replace('-', '년 ') + '월';
  
  // 필터/정렬 상태
  let sortKey = 'record_date', sortDir = -1;
  let filters = { search: '', doctor: '', counselor: '', desk: '', category: '', confirmed: '', patient_type: '', visit_source: '' };
  let filterPanelOpen = false;
  
  // 유니크 값 추출
  const uniqueDoctors = [...new Set(records.map(r => r.doctor_name).filter(Boolean))].sort();
  const uniqueCounselors = [...new Set(records.map(r => r.counselor_name).filter(Boolean))].sort();
  const uniqueDesk = [...new Set(records.map(r => r.desk_name).filter(Boolean))].sort();
  const uniqueSources = [...new Set(records.map(r => r.visit_source).filter(Boolean))];
  
  // 필터 라벨 매핑
  const filterLabels = {
    doctor: '상담의', counselor: '상담사', desk: '데스크', category: '카테고리',
    confirmed: '확정여부', patient_type: '구/신환', visit_source: '내원경로'
  };
  function getFilterDisplayValue(key, val) {
    if (key === 'category') return CATEGORIES[val] || val;
    if (key === 'confirmed') return val === 'O' ? '확정' : val === 'X' ? '미확정' : '미정';
    if (key === 'patient_type') return val === 'new' ? '신환' : '구환';
    if (key === 'visit_source') return (VISIT_SOURCES[val] || val).replace(/^.\s/, '');
    return val;
  }
  
  function getFiltered() {
    let list = records;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(r => (r.patient_name||'').toLowerCase().includes(q) || (r.chart_number||'').toLowerCase().includes(q) || (r.doctor_name||'').toLowerCase().includes(q) || (r.counselor_name||'').toLowerCase().includes(q) || (r.desk_name||'').toLowerCase().includes(q) || (r.discount_note||'').toLowerCase().includes(q) || (r.notes||'').toLowerCase().includes(q));
    }
    if (filters.doctor) list = list.filter(r => r.doctor_name === filters.doctor);
    if (filters.counselor) list = list.filter(r => r.counselor_name === filters.counselor);
    if (filters.desk) list = list.filter(r => r.desk_name === filters.desk);
    if (filters.category) list = list.filter(r => r.treatment_category === filters.category);
    if (filters.confirmed) list = list.filter(r => r.treatment_confirmed === filters.confirmed);
    if (filters.patient_type) list = list.filter(r => r.patient_type === filters.patient_type);
    if (filters.visit_source) list = list.filter(r => r.visit_source === filters.visit_source);
    
    // 정렬
    list = [...list].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'planned_amount' || sortKey === 'agreed_amount') { va = va || 0; vb = vb || 0; }
      else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase(); }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return list;
  }
  
  function render() {
    const filtered = getFiltered();
    const activeFilters = Object.entries(filters).filter(([k,v]) => v && k !== 'search');
    const activeFilterCount = activeFilters.length;
    const hasSearch = !!filters.search;
    const hasAnyFilter = activeFilterCount > 0 || hasSearch;
    
    const total = filtered.length;
    const confirmed = filtered.filter(r => r.treatment_confirmed === 'O').length;
    const rejected = filtered.filter(r => r.treatment_confirmed === 'X').length;
    const pending = total - confirmed - rejected;
    const rate = (confirmed + rejected) > 0 ? Math.round(confirmed / (confirmed + rejected) * 1000) / 10 : 0;
    const totalPlanned = filtered.reduce((s,r) => s + (r.planned_amount||0), 0);
    const totalAgreed = filtered.reduce((s,r) => s + (r.agreed_amount||0), 0);
    const newP = filtered.filter(r => r.patient_type === 'new').length;
    
    const sStyle = `padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg);outline:none;min-width:0;transition:border-color 0.2s`;
    
    function thCls(key, align) {
      const isActive = sortKey === key;
      const bg = isActive ? 'background:rgba(59,130,246,0.08);' : '';
      const border = isActive ? 'border-bottom:3px solid #3b82f6;' : 'border-bottom:2px solid var(--border);';
      return `padding:10px 8px;${border}${bg}cursor:pointer;user-select:none;white-space:nowrap;font-weight:700;font-size:11px;text-align:${align};transition:all 0.15s`;
    }
    
    function sortIcon(key) {
      if (sortKey !== key) return '<span style="color:#cbd5e1;font-size:10px;margin-left:3px;opacity:0.5">⇅</span>';
      return sortDir === 1
        ? '<span style="color:#3b82f6;font-size:10px;margin-left:3px;font-weight:900">▲</span>'
        : '<span style="color:#3b82f6;font-size:10px;margin-left:3px;font-weight:900">▼</span>';
    }
    
    // 활성 필터 칩 생성
    let chipHtml = '';
    if (hasAnyFilter) {
      const chips = [];
      if (hasSearch) chips.push('<span class="cr-chip" data-chip="search" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px 3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;cursor:pointer;transition:all 0.15s" title="검색 필터 제거">🔍 "' + esc(filters.search) + '" <span style="font-size:13px;color:#93c5fd;margin-left:2px">&times;</span></span>');
      activeFilters.forEach(function(pair) {
        var k = pair[0], v = pair[1];
        var label = filterLabels[k] || k;
        var dispVal = getFilterDisplayValue(k, v);
        chips.push('<span class="cr-chip" data-chip="' + k + '" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px 3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;cursor:pointer;transition:all 0.15s" title="' + label + ' 필터 제거">' + label + ': ' + dispVal + ' <span style="font-size:13px;color:#86efac;margin-left:2px">&times;</span></span>');
      });
      chips.push('<span class="cr-chip" data-chip="__all" style="display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;cursor:pointer;transition:all 0.15s" title="모든 필터 초기화">✕ 전체 초기화</span>');
      chipHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-light)">' + chips.join('') + '</div>';
    }
    
    // 정렬 상태 표시
    const sortNames = { record_date:'날짜', patient_name:'성함', doctor_name:'상담의', counselor_name:'상담사', desk_name:'데스크', planned_amount:'비용계획', agreed_amount:'동의금액', patient_type:'구분', treatment_category:'카테고리', treatment_confirmed:'확정', visit_source:'경로', appointment_made:'예약' };
    const sortLabel = sortNames[sortKey] || sortKey;
    
    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:14px">
        <button class="btn btn-sm" id="crPrev">◀</button>
        <h2 style="margin:0;font-size:20px;font-weight:800">📋 ${displayMonth} 상담 기록</h2>
        <button class="btn btn-sm" id="crNext">▶</button>
      </div>
      
      <!-- 검색 + 필터 바 -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:220px;position:relative">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none">🔍</span>
            <input type="text" id="crSearch" placeholder="환자명, 챠트번호, 상담의, 상담사, 메모 검색..." value="${esc(filters.search)}" style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid ${hasSearch ? '#3b82f6' : 'var(--border)'};border-radius:10px;font-size:13px;background:var(--bg);outline:none;transition:border-color 0.2s,box-shadow 0.2s">
            ${hasSearch ? '<button id="crClearSearch" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#94a3b8;padding:2px 4px" title="검색 초기화">&times;</button>' : ''}
          </div>
          <button class="btn btn-sm" id="crToggleFilters" style="white-space:nowrap;font-size:12px;padding:8px 14px;border-radius:10px;font-weight:700;transition:all 0.15s;${activeFilterCount > 0 ? 'background:#3b82f6;color:#fff;box-shadow:0 2px 8px rgba(59,130,246,0.3)' : ''}">
            🎛️ 필터${activeFilterCount > 0 ? ' <span style="background:rgba(255,255,255,0.25);padding:1px 7px;border-radius:10px;font-size:11px;margin-left:4px">' + activeFilterCount + '</span>' : ''}
          </button>
          <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:var(--bg);border:1px solid var(--border-light)" title="현재 정렬 기준 (헤더 클릭으로 변경)">
            <span style="color:#3b82f6;font-weight:800">정렬:</span> ${sortLabel} <span style="color:#3b82f6;font-weight:700">${sortDir === 1 ? '▲' : '▼'}</span>
          </div>
        </div>
        
        <div id="crFilterPanel" style="display:${filterPanelOpen ? 'block' : 'none'};padding-top:12px;margin-top:12px;border-top:1px solid var(--border-light)">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">🩺 상담의</label>
              <select id="crF_doctor" style="${sStyle};width:100%;${filters.doctor ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                ${uniqueDoctors.map(d => `<option value="${esc(d)}" ${filters.doctor===d?'selected':''}>${esc(d)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">👩‍⚕️ 상담사</label>
              <select id="crF_counselor" style="${sStyle};width:100%;${filters.counselor ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                ${uniqueCounselors.map(c => `<option value="${esc(c)}" ${filters.counselor===c?'selected':''}>${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">🖥️ 데스크</label>
              <select id="crF_desk" style="${sStyle};width:100%;${filters.desk ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                ${uniqueDesk.map(d => `<option value="${esc(d)}" ${filters.desk===d?'selected':''}>${esc(d)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">🦷 카테고리</label>
              <select id="crF_category" style="${sStyle};width:100%;${filters.category ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}" ${filters.category===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">✅ 치료확정</label>
              <select id="crF_confirmed" style="${sStyle};width:100%;${filters.confirmed ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                <option value="O" ${filters.confirmed==='O'?'selected':''}>✅ 확정</option>
                <option value="X" ${filters.confirmed==='X'?'selected':''}>❌ 미확정</option>
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">👥 구/신환</label>
              <select id="crF_patient_type" style="${sStyle};width:100%;${filters.patient_type ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                <option value="new" ${filters.patient_type==='new'?'selected':''}>신환</option>
                <option value="existing" ${filters.patient_type==='existing'?'selected':''}>구환</option>
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px;letter-spacing:0.3px">🛤️ 내원경로</label>
              <select id="crF_visit_source" style="${sStyle};width:100%;${filters.visit_source ? 'border-color:#3b82f6;background:#eff6ff' : ''}">
                <option value="">전체</option>
                ${Object.entries(VISIT_SOURCES).map(([k,v]) => `<option value="${k}" ${filters.visit_source===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        
        ${chipHtml}
      </div>
      
      <!-- 요약 카드 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:12px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center${hasAnyFilter ? ';border-left:3px solid #f59e0b' : ''}">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">총 상담${hasAnyFilter ? ' (필터)' : ''}</div>
          <div style="font-size:24px;font-weight:900;color:#3b82f6">${total}건</div>
          <div style="font-size:10px;color:var(--text-muted)">신환 ${newP} / 구환 ${total - newP}${hasAnyFilter ? ' <span style="color:#f59e0b">/ 전체 ' + records.length + '</span>' : ''}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">확정률</div>
          <div style="font-size:24px;font-weight:900;color:${rate >= 80 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444'}">${rate}%</div>
          <div style="font-size:10px;color:var(--text-muted)">✅${confirmed} ❌${rejected} ⏳${pending}</div>
        </div>
        ${isManager ? `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">비용계획</div>
          <div style="font-size:20px;font-weight:900;color:#8b5cf6">${fmtMan(totalPlanned)}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">동의금액</div>
          <div style="font-size:20px;font-weight:900;color:#3b82f6">${fmtMan(totalAgreed)}</div>
        </div>` : ''}
      </div>
      
      <!-- 테이블 -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1160px">
          <thead>
            <tr style="background:var(--bg-hover)">
              <th style="${thCls("record_date","left")}" data-sort="record_date">날짜 ${sortIcon('record_date')}</th>
              <th style="${thCls("patient_name","left")}" data-sort="patient_name">성함 ${sortIcon('patient_name')}</th>
              <th style="${thCls("doctor_name","left")}" data-sort="doctor_name">상담의 ${sortIcon('doctor_name')}</th>
              <th style="${thCls("counselor_name","left")}" data-sort="counselor_name">상담사 ${sortIcon('counselor_name')}</th>
              <th style="${thCls("desk_name","left")}" data-sort="desk_name">데스크 ${sortIcon('desk_name')}</th>
              <th style="${thCls("planned_amount","right")}" data-sort="planned_amount">비용계획 ${sortIcon('planned_amount')}</th>
              <th style="${thCls("agreed_amount","right")}" data-sort="agreed_amount">동의금액 ${sortIcon('agreed_amount')}</th>
              <th style="${thCls("patient_type","center")}" data-sort="patient_type">구분 ${sortIcon('patient_type')}</th>
              <th style="${thCls("treatment_category","center")}" data-sort="treatment_category">카테고리 ${sortIcon('treatment_category')}</th>
              <th style="${thCls("treatment_confirmed","center")}" data-sort="treatment_confirmed">확정 ${sortIcon('treatment_confirmed')}</th>
              <th style="${thCls("visit_source","center")}" data-sort="visit_source">경로 ${sortIcon('visit_source')}</th>
              <th style="${thCls("appointment_made","center")}" data-sort="appointment_made">예약 ${sortIcon('appointment_made')}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="12" style="padding:50px;text-align:center;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:10px">${hasAnyFilter ? '🔍' : '📋'}</div><div style="font-size:14px;font-weight:600">${hasAnyFilter ? '필터 조건에 맞는 기록이 없습니다' : '이달 기록이 없습니다'}</div>${hasAnyFilter ? '<div style="font-size:12px;margin-top:6px">필터 조건을 변경해 보세요</div>' : ''}</td></tr>` : ''}
            ${filtered.map((r, idx) => {
              const dateStr = r.record_date?.slice(5) || '';
              const catLabel = CATEGORIES[r.treatment_category] || r.treatment_category;
              const catColor = CAT_COLORS[r.treatment_category] || '#6b7280';
              const srcLabel = VISIT_SOURCES[r.visit_source] || (r.visit_source ? r.visit_source : '');
              const srcColor = SOURCE_COLORS[r.visit_source] || '#94a3b8';
              const ptBadge = r.patient_type === 'new'
                ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">신</span>'
                : '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">구</span>';
              const confBadge = r.treatment_confirmed === 'O'
                ? '<span style="color:#22c55e;font-weight:800">✅</span>'
                : r.treatment_confirmed === 'X'
                ? '<span style="color:#ef4444;font-weight:800">❌</span>'
                : '<span style="color:#94a3b8">⏳</span>';
              const apptBadge = r.appointment_made === 'O' ? '✅' : r.appointment_made === 'X' ? '❌' : '-';
              const zebra = idx % 2 === 1 ? 'background:rgba(0,0,0,0.015);' : '';
              return `<tr style="border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.12s;${zebra}" data-id="${r.id}" class="cr-row" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='${idx%2===1?'rgba(0,0,0,0.015)':''}'" >
                <td style="padding:8px;font-weight:600;white-space:nowrap">${dateStr}</td>
                <td style="padding:8px;font-weight:700">${esc(r.patient_name)}${r.chart_number ? '<span style="color:var(--text-muted);font-size:10px;margin-left:4px">#'+esc(String(r.chart_number))+'</span>' : ''}</td>
                <td style="padding:7px 8px">${esc(r.doctor_name)}</td>
                <td style="padding:8px">${esc(r.counselor_name)}</td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted)">${esc(r.desk_name||'')}</td>
                <td style="padding:8px;text-align:right;color:var(--text-muted)">${r.planned_amount ? fmtWon(r.planned_amount) : '-'}</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${r.agreed_amount ? fmtWon(r.agreed_amount) : '-'}</td>
                <td style="padding:8px;text-align:center">${ptBadge}</td>
                <td style="padding:8px;text-align:center"><span style="background:${catColor}18;color:${catColor};padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">${catLabel}</span></td>
                <td style="padding:8px;text-align:center">${confBadge}</td>
                <td style="padding:8px;text-align:center">${srcLabel ? `<span style="color:${srcColor};font-size:10px;font-weight:600">${srcLabel.replace(/^.\\s/,'')}</span>` : '<span style="color:#cbd5e1">-</span>'}</td>
                <td style="padding:8px;text-align:center">${apptBadge}</td>
              </tr>`;
            }).join('')}
          </tbody>
          ${filtered.length > 0 && isManager ? `<tfoot>
            <tr style="background:var(--bg-hover);border-top:2px solid var(--border)">
              <td colspan="5" style="padding:10px 8px;font-weight:800;font-size:12px;color:var(--text-muted)">합계 (${total}건)</td>
              <td style="padding:10px 8px;text-align:right;font-weight:800;font-size:12px;color:#8b5cf6">${fmtMan(totalPlanned)}</td>
              <td style="padding:10px 8px;text-align:right;font-weight:800;font-size:12px;color:#3b82f6">${fmtMan(totalAgreed)}</td>
              <td style="padding:10px 8px;text-align:center;font-size:11px;font-weight:700;color:#1d4ed8">${newP}신</td>
              <td colspan="5" style="padding:10px 8px;text-align:right;font-size:11px;color:var(--text-muted)">확정률 <strong style="color:${rate >= 80 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444'}">${rate}%</strong></td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:0 4px">
        <div style="font-size:11px;color:var(--text-muted)">${hasAnyFilter ? `🔍 필터 결과 <strong>${filtered.length}</strong>건 / 전체 ${records.length}건` : `📋 총 <strong>${records.length}</strong>건`}</div>
        <div style="font-size:10px;color:var(--text-muted)">💡 헤더를 클릭하면 정렬됩니다</div>
      </div>
    `;
    
    // ── 이벤트 바인딩 ──
    document.getElementById('crPrev')?.addEventListener('click', () => reload(prevMonth));
    document.getElementById('crNext')?.addEventListener('click', () => reload(nextMonth));
    
    // 검색
    const searchEl = document.getElementById('crSearch');
    let searchTimer = null;
    searchEl?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { filters.search = searchEl.value.trim(); render(); }, 250);
    });
    searchEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { filters.search = ''; render(); }
    });
    
    // 검색 X 버튼
    document.getElementById('crClearSearch')?.addEventListener('click', () => {
      filters.search = ''; render();
    });
    
    // 필터 토글
    document.getElementById('crToggleFilters')?.addEventListener('click', () => {
      filterPanelOpen = !filterPanelOpen;
      const panel = document.getElementById('crFilterPanel');
      if (panel) panel.style.display = filterPanelOpen ? 'block' : 'none';
    });
    
    // 필터 칩 클릭 → 개별 필터 해제
    body.querySelectorAll('.cr-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.getAttribute('data-chip');
        if (key === '__all') {
          filters = { search: '', doctor: '', counselor: '', category: '', confirmed: '', patient_type: '', visit_source: '' };
          filterPanelOpen = false;
        } else if (key === 'search') {
          filters.search = '';
        } else {
          filters[key] = '';
        }
        render();
      });
      chip.addEventListener('mouseover', () => { chip.style.opacity = '0.7'; chip.style.transform = 'scale(0.97)'; });
      chip.addEventListener('mouseout', () => { chip.style.opacity = '1'; chip.style.transform = 'scale(1)'; });
    });
    
    // 필터 드롭다운
    ['doctor','counselor','desk','category','confirmed','patient_type','visit_source'].forEach(key => {
      document.getElementById('crF_' + key)?.addEventListener('change', (e) => {
        filters[key] = e.target.value;
        render();
      });
    });
    
    // 헤더 클릭 정렬
    body.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (sortKey === key) { sortDir *= -1; }
        else { sortKey = key; sortDir = (key === 'planned_amount' || key === 'agreed_amount') ? -1 : 1; }
        render();
      });
      th.addEventListener('mouseover', () => { if (sortKey !== th.getAttribute('data-sort')) th.style.background = 'rgba(59,130,246,0.04)'; });
      th.addEventListener('mouseout', () => { if (sortKey !== th.getAttribute('data-sort')) th.style.background = ''; });
    });
    
    // 행 클릭 → 수정 모달
    if (isManager) {
      body.querySelectorAll('.cr-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-id');
          const rec = records.find(r => r.id === id);
          if (rec) openRecordForm(rec, staffData, async () => { await reload(month); });
        });
      });
    }
    
    // 검색창에 포커스 유지
    if (filters.search) {
      const el = document.getElementById('crSearch');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }
  
  render();
}

// ═══ 상담 기록 입력/수정 모달 ═══
function openRecordForm(record, staffData, onSave) {
  const r = record || {};
  const isEdit = !!record;
  const counselors = staffData?.counselors || [];
  const doctors = staffData?.doctors || [];
  const desk = staffData?.desk || [];
  
  function opt(list, selected) {
    return list.map(name => `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('');
  }
  
  const cardStyle = `background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 16px;margin-bottom:12px`;
  const labelStyle = `font-size:11px;font-weight:700;display:block;margin-bottom:5px;color:var(--text-muted);letter-spacing:0.3px`;
  const inputStyle = `width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);transition:border-color 0.2s;outline:none`;
  const selectStyle = inputStyle + `;appearance:auto`;
  
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '560px';
  mc.innerHTML = `
    <div style="padding:4px 2px">
      <h3 style="margin:0 0 20px;font-size:20px;font-weight:900;display:flex;align-items:center;gap:8px">
        ${isEdit ? '<span style="font-size:24px">✏️</span> 상담 기록 수정' : '<span style="font-size:24px">➕</span> 새 상담 기록'}
      </h3>
      <form id="crForm" style="display:flex;flex-direction:column;gap:0">
        
        <!-- 기본 정보 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#3b82f6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">기본</span> 환자 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${labelStyle}">📅 날짜</label>
              <input type="date" name="record_date" value="${r.record_date || new Date().toISOString().slice(0,10)}" required style="${inputStyle}">
            </div>
            <div>
              <label style="${labelStyle}">📋 챠트번호</label>
              <input type="text" name="chart_number" value="${esc(r.chart_number||'')}" placeholder="예: 741003" style="${inputStyle}" id="crChartNumber">
            </div>
          </div>
          <div style="position:relative">
            <label style="${labelStyle}">👤 환자 성함 <span style="color:#ef4444">*</span> <span style="font-size:9px;color:var(--primary);font-weight:500">(환자DB 자동검색)</span></label>
            <input type="text" name="patient_name" value="${esc(r.patient_name||'')}" required placeholder="환자명 또는 차트번호 입력" style="${inputStyle};font-weight:700" id="crPatientName" autocomplete="off">
            <div id="crAutoSuggest" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.15);max-height:200px;overflow-y:auto;margin-top:2px"></div>
            <input type="hidden" name="patient_id" id="crPatientId" value="${r.patient_id||''}">
          </div>
          <div id="crLinkedPatient" style="display:none;margin-top:8px;padding:8px 12px;background:var(--primary-light);border-radius:8px;font-size:11px;display:flex;align-items:center;gap:6px"></div>
        </div>
        
        <!-- 상담 담당 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#8b5cf6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">담당</span> 상담 배정
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div>
              <label style="${labelStyle}">🩺 상담의</label>
              <select name="doctor_name" style="${selectStyle}">
                <option value="">선택</option>${opt(doctors, r.doctor_name)}
              </select>
            </div>
            <div>
              <label style="${labelStyle}">👩‍⚕️ 상담사</label>
              <select name="counselor_name" style="${selectStyle}">
                <option value="">선택</option>${opt(counselors, r.counselor_name)}
              </select>
            </div>
            <div>
              <label style="${labelStyle}">🖥️ 데스크</label>
              <select name="desk_name" style="${selectStyle}">
                <option value="">선택</option>${opt(desk, r.desk_name)}
              </select>
            </div>
          </div>
        </div>
        
        <!-- 금액 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#f59e0b;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">금액</span> 비용 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${labelStyle}">💰 비용계획 (원)</label>
              <input type="number" name="planned_amount" value="${r.planned_amount||''}" placeholder="0" style="${inputStyle}">
            </div>
            <div>
              <label style="${labelStyle}">✅ 동의금액 (원)</label>
              <input type="number" name="agreed_amount" value="${r.agreed_amount||''}" placeholder="0" style="${inputStyle}">
            </div>
          </div>
          <div>
            <label style="${labelStyle}">🏷️ 할인 내역</label>
            <input type="text" name="discount_note" value="${esc(r.discount_note||'')}" placeholder="예: 소개10%+당일완납5%" style="${inputStyle}">
          </div>
        </div>
        
        <!-- 진료 분류 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#22c55e;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">분류</span> 진료 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <label style="${labelStyle}">구/신환</label>
              <select name="patient_type" style="${selectStyle}">
                <option value="new" ${r.patient_type==='new'?'selected':''}>신환</option>
                <option value="existing" ${r.patient_type==='existing'?'selected':''}>구환</option>
              </select>
            </div>
            <div>
              <label style="${labelStyle}">진료 카테고리</label>
              <select name="treatment_category" style="${selectStyle}">
                ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}" ${r.treatment_category===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="${labelStyle}">치료확정</label>
              <select name="treatment_confirmed" style="${selectStyle}">
                <option value="" ${!r.treatment_confirmed?'selected':''}>미정</option>
                <option value="O" ${r.treatment_confirmed==='O'?'selected':''}>O 확정</option>
                <option value="X" ${r.treatment_confirmed==='X'?'selected':''}>X 미확정</option>
              </select>
            </div>
          </div>
          
          <!-- 내원 경로 (필수!) -->
          <div>
            <label style="${labelStyle}">🛤️ 내원 경로 <span style="color:#ef4444">*</span></label>
            <select name="visit_source" required style="${selectStyle};border-color:${r.visit_source ? 'var(--border)' : '#f59e0b'};font-weight:600">
              <option value="" ${!r.visit_source?'selected':''} disabled>-- 내원 경로를 선택하세요 --</option>
              ${Object.entries(VISIT_SOURCES).map(([k,v]) => `<option value="${k}" ${r.visit_source===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <!-- 후속 관리 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#06b6d4;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">관리</span> 후속 조치
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <label style="${labelStyle}">📅 예약</label>
              <select name="appointment_made" style="${selectStyle}">
                <option value="" ${!r.appointment_made?'selected':''}>-</option>
                <option value="O" ${r.appointment_made==='O'?'selected':''}>O</option>
                <option value="X" ${r.appointment_made==='X'?'selected':''}>X</option>
              </select>
            </div>
            <div>
              <label style="${labelStyle}">📞 리콜</label>
              <select name="recall_done" style="${selectStyle}">
                <option value="" ${!r.recall_done?'selected':''}>-</option>
                <option value="O" ${r.recall_done==='O'?'selected':''}>O</option>
                <option value="X" ${r.recall_done==='X'?'selected':''}>X</option>
              </select>
            </div>
            <div>
              <label style="${labelStyle}">💛 카카오 등록</label>
              <select name="kakao_registered" style="${selectStyle}">
                <option value="" ${!r.kakao_registered?'selected':''}>-</option>
                <option value="O" ${r.kakao_registered==='O'?'selected':''}>O</option>
                <option value="X" ${r.kakao_registered==='X'?'selected':''}>X</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 메모 카드 -->
        <div style="${cardStyle}">
          <label style="${labelStyle}">📝 메모</label>
          <textarea name="notes" rows="2" placeholder="비고 사항" style="${inputStyle};resize:vertical">${esc(r.notes||'')}</textarea>
        </div>
        
        <!-- 버튼 -->
        <div style="display:flex;gap:8px;margin-top:4px;padding:0 2px">
          <button type="submit" class="btn btn-primary" style="flex:1;padding:14px;font-weight:800;font-size:15px;border-radius:12px">${isEdit ? '수정 저장' : '기록 저장'}</button>
          ${isEdit ? '<button type="button" id="crDelete" class="btn" style="padding:14px;color:#ef4444;font-weight:700;border-radius:12px;border:1px solid #fecaca">삭제</button>' : ''}
          <button type="button" onclick="PFM.closeModal()" class="btn" style="padding:14px;border-radius:12px">취소</button>
        </div>
      </form>
    </div>
  `;
  
  const form = document.getElementById('crForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k,v] of fd.entries()) {
      if (k === 'planned_amount' || k === 'agreed_amount') {
        data[k] = v ? parseInt(v) : 0;
      } else {
        data[k] = v;
      }
    }
    try {
      if (isEdit) {
        await api(`/api/protected/consult-records/${r.id}`, { method: 'PUT', json: data }) ;
        toast('✅ 수정 완료');
      } else {
        await api('/api/protected/consult-records', { method: 'POST', json: data }) ;
        toast('✅ 기록 저장 완료');
      }
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
  
  document.getElementById('crDelete')?.addEventListener('click', async () => {
    if (!confirm('이 상담 기록을 삭제하시겠습니까?')) return;
    try {
      await api(`/api/protected/consult-records/${r.id}`, { method: 'DELETE' });
      toast('🗑️ 삭제 완료');
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 삭제 실패', 'error'); }
  });
  
  // ═══ 환자 자동완성 ═══
  const patientInput = document.getElementById('crPatientName');
  const suggestBox = document.getElementById('crAutoSuggest');
  const patientIdField = document.getElementById('crPatientId');
  const chartField = document.getElementById('crChartNumber');
  const linkedDiv = document.getElementById('crLinkedPatient');
  let acTimeout = null;
  let acResults = [];
  let acIdx = -1;
  
  function showLinkedBadge(pt) {
    if (linkedDiv) {
      linkedDiv.style.display = 'flex';
      linkedDiv.innerHTML = `<span style="font-weight:700;color:var(--primary)">✓ DB 연결:</span> ${esc(pt.patient_name)} (${pt.patient_type==='new'?'신환':'구환'}) ${pt.chart_number ? '/ #'+esc(pt.chart_number) : ''} <button type="button" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px" id="crUnlink">&times;</button>`;
      document.getElementById('crUnlink')?.addEventListener('click', () => {
        patientIdField.value = '';
        linkedDiv.style.display = 'none';
      });
    }
  }
  
  // 이미 연결된 환자가 있으면 표시
  if (r.patient_id) showLinkedBadge(r);
  
  if (patientInput) {
    patientInput.addEventListener('input', () => {
      clearTimeout(acTimeout);
      const q = patientInput.value.trim();
      if (q.length < 1) { suggestBox.style.display = 'none'; return; }
      acTimeout = setTimeout(async () => {
        try {
          acResults = await api(`/api/protected/patients/search/autocomplete?q=${encodeURIComponent(q)}`);
          acIdx = -1;
          if (acResults.length === 0) {
            suggestBox.style.display = 'none';
            return;
          }
          suggestBox.style.display = 'block';
          suggestBox.innerHTML = acResults.map((pt, i) => {
            const typeTag = pt.patient_type === 'new' ? '<span style="color:#3b82f6;font-weight:700;font-size:10px">신환</span>' : '<span style="color:#22c55e;font-weight:700;font-size:10px">구환</span>';
            return `<div class="cr-ac-item" data-idx="${i}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
              <div style="flex:1">
                <strong style="font-size:13px">${esc(pt.patient_name)}</strong>
                ${pt.chart_number ? `<span style="color:var(--text-muted);font-size:11px;margin-left:6px">#${esc(pt.chart_number)}</span>` : ''}
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${pt.phone||''} ${pt.treatment_area||''}</div>
              </div>
              ${typeTag}
            </div>`;
          }).join('');
          
          suggestBox.querySelectorAll('.cr-ac-item').forEach(item => {
            item.addEventListener('click', () => selectPatient(parseInt(item.dataset.idx)));
          });
        } catch(e) { suggestBox.style.display = 'none'; }
      }, 200);
    });
    
    patientInput.addEventListener('keydown', (e) => {
      if (suggestBox.style.display === 'none' || acResults.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); acIdx = Math.min(acIdx+1, acResults.length-1); highlightAc(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); acIdx = Math.max(acIdx-1, 0); highlightAc(); }
      else if (e.key === 'Enter' && acIdx >= 0) { e.preventDefault(); selectPatient(acIdx); }
      else if (e.key === 'Escape') { suggestBox.style.display = 'none'; }
    });
    
    // 바깥 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!suggestBox.contains(e.target) && e.target !== patientInput) suggestBox.style.display = 'none';
    }, { once: false });
  }
  
  function highlightAc() {
    suggestBox.querySelectorAll('.cr-ac-item').forEach((el, i) => {
      el.style.background = i === acIdx ? 'var(--bg-hover)' : '';
    });
  }
  
  function selectPatient(idx) {
    const pt = acResults[idx];
    if (!pt) return;
    patientInput.value = pt.patient_name;
    if (chartField) chartField.value = pt.chart_number || '';
    if (patientIdField) patientIdField.value = pt.id;
    // 상담의/상담사도 자동 채움 (비어있는 경우만)
    const docSel = form.querySelector('[name="doctor_name"]');
    const counSel = form.querySelector('[name="counselor_name"]');
    if (docSel && !docSel.value && pt.primary_doctor) {
      for (const opt of docSel.options) { if (opt.value === pt.primary_doctor) { docSel.value = pt.primary_doctor; break; } }
    }
    if (counSel && !counSel.value && pt.assigned_counselor) {
      for (const opt of counSel.options) { if (opt.value === pt.assigned_counselor) { counSel.value = pt.assigned_counselor; break; } }
    }
    // 데스크 자동채움
    const deskSel = form.querySelector('[name="desk_name"]');
    if (deskSel && !deskSel.value && pt.desk_staff) {
      for (const opt of deskSel.options) { if (opt.value === pt.desk_staff) { deskSel.value = pt.desk_staff; break; } }
    }
    // 환자구분
    const typeSel = form.querySelector('[name="patient_type"]');
    if (typeSel && pt.patient_type) typeSel.value = pt.patient_type;
    // 내원경로
    const srcSel = form.querySelector('[name="visit_source"]');
    if (srcSel && pt.visit_source) {
      for (const opt of srcSel.options) { if (opt.value === pt.visit_source) { srcSel.value = pt.visit_source; break; } }
    }
    suggestBox.style.display = 'none';
    showLinkedBadge(pt);
  }
}

// ═══ 상담 분석 대시보드 ═══
async function renderConsultDashboard(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = `<button class="btn btn-sm" onclick="PFM.navigate('consult_records')">📋 기록</button>`;
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  async function loadDashboard(month) {
    currentMonth = month;
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    const data = await api(`/api/protected/consult-records/dashboard?month=${month}`);
    renderDashboardContent(body, data, month, isManager, loadDashboard);
  }
  
  await loadDashboard(currentMonth);
}

function renderDashboardContent(body, data, month, isManager, reload) {
  const { summary: s, byCounselor, byDoctor, byCategory, byDate, byVisitSource } = data;
  const prevMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const nextMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7); })();
  const displayMonth = month.replace('-', '년 ') + '월';
  
  const rateColor = s.confirmRate >= 80 ? '#22c55e' : s.confirmRate >= 70 ? '#f59e0b' : '#ef4444';
  
  // 상담사 데이터 정렬 (건수 순)
  const counselorArr = Object.entries(byCounselor).sort((a,b) => b[1].total - a[1].total);
  const doctorArr = Object.entries(byDoctor).sort((a,b) => b[1].total - a[1].total);
  const categoryArr = Object.entries(byCategory).sort((a,b) => b[1].total - a[1].total);
  
  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
      <button class="btn btn-sm" id="cdPrev">◀</button>
      <h2 style="margin:0;font-size:20px;font-weight:800">📊 ${displayMonth} 상담 분석</h2>
      <button class="btn btn-sm" id="cdNext">▶</button>
    </div>
    
    ${s.total === 0 ? '<div style="text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:16px">📊</div><h3>이달 상담 기록이 없습니다</h3></div>' : `
    
    <!-- 핵심 지표 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">총 상담</div>
        <div style="font-size:28px;font-weight:900;color:#3b82f6">${s.total}</div>
        <div style="font-size:10px;color:var(--text-muted)">신환 ${s.newPatients} / 구환 ${s.existingPatients}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">확정률</div>
        <div style="font-size:28px;font-weight:900;color:${rateColor}">${s.confirmRate}%</div>
        <div style="font-size:10px;color:var(--text-muted)">✅${s.confirmed} ❌${s.rejected} ⏳${s.pending}</div>
      </div>
      ${isManager && s.totalPlanned !== null ? `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">비용계획</div>
        <div style="font-size:22px;font-weight:900;color:#8b5cf6">${fmtMan(s.totalPlanned)}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">동의금액</div>
        <div style="font-size:22px;font-weight:900;color:#3b82f6">${fmtMan(s.totalAgreed)}</div>
        <div style="font-size:10px;color:var(--text-muted)">할인율 ${s.discountRate}%</div>
      </div>` : ''}
    </div>
    
    <!-- 상담사별 분석 -->
    <div class="section-title">👩‍⚕️ <span>상담사별 분석</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">상담사</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">상담</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">미확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정률</th>
            ${isManager ? '<th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">비용계획</th><th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">동의금액</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${counselorArr.map(([name, v]) => {
            const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
            const rc = r >= 80 ? '#22c55e' : r >= 70 ? '#f59e0b' : '#ef4444';
            const barW = s.total > 0 ? Math.round(v.total / counselorArr[0][1].total * 100) : 0;
            return `<tr style="border-bottom:1px solid var(--border-light)">
              <td style="padding:8px 12px;font-weight:700">${esc(name)}
                <div style="background:var(--border-light);border-radius:4px;height:4px;margin-top:4px;overflow:hidden"><div style="background:#3b82f6;height:100%;width:${barW}%;border-radius:4px"></div></div>
              </td>
              <td style="padding:8px;text-align:right;font-weight:800">${v.total}</td>
              <td style="padding:8px;text-align:right;color:#22c55e;font-weight:700">${v.confirmed}</td>
              <td style="padding:8px;text-align:right;color:#ef4444">${v.rejected}</td>
              <td style="padding:8px;text-align:right;font-weight:800;color:${rc}">${r}%</td>
              ${isManager && v.planned !== null ? `<td style="padding:8px;text-align:right;color:var(--text-muted)">${fmtMan(v.planned)}</td><td style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${fmtMan(v.agreed)}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 상담의별 분석 -->
    <div class="section-title">🩺 <span>상담의별 분석</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">상담의</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">상담</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">미확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정률</th>
            ${isManager ? '<th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">비용계획</th><th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">동의금액</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${doctorArr.map(([name, v]) => {
            const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
            const rc = r >= 80 ? '#22c55e' : r >= 70 ? '#f59e0b' : '#ef4444';
            return `<tr style="border-bottom:1px solid var(--border-light)">
              <td style="padding:8px 12px;font-weight:700">${esc(name)}</td>
              <td style="padding:8px;text-align:right;font-weight:800">${v.total}</td>
              <td style="padding:8px;text-align:right;color:#22c55e;font-weight:700">${v.confirmed}</td>
              <td style="padding:8px;text-align:right;color:#ef4444">${v.rejected}</td>
              <td style="padding:8px;text-align:right;font-weight:800;color:${rc}">${r}%</td>
              ${isManager && v.planned !== null ? `<td style="padding:8px;text-align:right;color:var(--text-muted)">${fmtMan(v.planned)}</td><td style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${fmtMan(v.agreed)}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 카테고리별 분석 -->
    <div class="section-title">🦷 <span>진료 카테고리별</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:20px">
      ${categoryArr.map(([cat, v]) => {
        const label = CATEGORIES[cat] || cat;
        const color = CAT_COLORS[cat] || '#6b7280';
        const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
        const pct = s.total > 0 ? Math.round(v.total / s.total * 100) : 0;
        return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;border-left:4px solid ${color}">
          <div style="font-size:14px;font-weight:800;color:${color};margin-bottom:8px">${label}</div>
          <div style="font-size:22px;font-weight:900">${v.total}건 <span style="font-size:12px;color:var(--text-muted)">(${pct}%)</span></div>
          <div style="font-size:12px;margin-top:6px;color:var(--text-muted)">확정 ${v.confirmed} / 미확 ${v.rejected} = <strong style="color:${r >= 80 ? '#22c55e' : '#f59e0b'}">${r}%</strong></div>
          ${isManager && v.planned ? `<div style="font-size:11px;margin-top:4px;color:var(--text-muted)">계획 ${fmtMan(v.planned)} → 동의 ${fmtMan(v.agreed)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    
    <!-- 내원 경로별 분석 -->
    ${byVisitSource && Object.keys(byVisitSource).filter(k => k !== '미기록').length > 0 ? `
    <div class="section-title">🛤️ <span>내원 경로별 분석</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px">
      ${Object.entries(byVisitSource).sort((a,b) => b[1].total - a[1].total).map(([src, v]) => {
        const label = VISIT_SOURCES[src] || src;
        const color = SOURCE_COLORS[src] || '#94a3b8';
        const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
        const pct = s.total > 0 ? Math.round(v.total / s.total * 100) : 0;
        return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;border-top:3px solid ' + color + '">' +
          '<div style="font-size:12px;font-weight:800;color:' + color + ';margin-bottom:6px">' + label + '</div>' +
          '<div style="font-size:20px;font-weight:900">' + v.total + '건 <span style="font-size:11px;color:var(--text-muted)">(' + pct + '%)</span></div>' +
          '<div style="font-size:11px;margin-top:4px;color:var(--text-muted)">확정률 <strong style="color:' + (r >= 80 ? '#22c55e' : '#f59e0b') + '">' + r + '%</strong></div>' +
        '</div>';
      }).join('')}
    </div>` : ''}
    
    <!-- 일별 상담 건수 차트 -->
    <div class="section-title">📈 <span>일별 상담 건수</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px;overflow-x:auto">
      <div id="consultChart" style="position:relative"></div>
    </div>
    `}
  `;
  
  // 일별 차트 렌더
  if (s.total > 0) {
    renderDailyChart(byDate, month);
  }
  
  document.getElementById('cdPrev')?.addEventListener('click', () => reload(prevMonth));
  document.getElementById('cdNext')?.addEventListener('click', () => reload(nextMonth));
}

function renderDailyChart(byDate, month) {
  const chartEl = document.getElementById('consultChart');
  if (!chartEl) return;
  
  const [yr, mn] = month.split('-').map(Number);
  const daysInMonth = new Date(yr, mn, 0).getDate();
  const jsKeys = ['일','월','화','수','목','금','토'];
  
  const allDays = [];
  let maxVal = 1;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yr}-${String(mn).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = jsKeys[new Date(yr, mn-1, d).getDay()];
    const info = byDate[dateStr] || null;
    const total = info ? info.total : 0;
    const confirmed = info ? info.confirmed : 0;
    if (total > maxVal) maxVal = total;
    allDays.push({ day: d, dateStr, dow, total, confirmed });
  }
  
  const colW = Math.max(20, Math.min(32, Math.floor((chartEl.parentElement.clientWidth - 20) / daysInMonth) - 2));
  const gap = 2;
  const chartH = 100;
  const topH = 16;
  const bottomH = 26;
  const totalH = chartH + topH + bottomH;
  const totalW = daysInMonth * (colW + gap) + gap;
  
  let svg = `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="display:block;min-width:${totalW}px">`;
  
  allDays.forEach((d, i) => {
    const x = i * (colW + gap) + gap;
    const isSun = d.dow === '일';
    const isSat = d.dow === '토';
    
    if (d.total > 0) {
      const barH = Math.max(3, (d.total / maxVal) * chartH);
      const confH = d.confirmed > 0 ? Math.max(1, (d.confirmed / maxVal) * chartH) : 0;
      const rejH = barH - confH;
      
      // 확정 부분 (아래)
      if (confH > 0) {
        svg += `<rect x="${x}" y="${topH + chartH - confH}" width="${colW}" height="${confH}" fill="#3b82f6" rx="2" opacity="0.8"><title>${d.dateStr} 확정 ${d.confirmed}건</title></rect>`;
      }
      // 미확정 부분 (위)
      if (rejH > 0) {
        svg += `<rect x="${x}" y="${topH + chartH - barH}" width="${colW}" height="${rejH}" fill="#fbbf24" rx="2" opacity="0.6"><title>${d.dateStr} 전체 ${d.total}건</title></rect>`;
      }
      
      // 숫자
      if (colW >= 22) {
        svg += `<text x="${x + colW/2}" y="${topH + chartH - barH - 2}" text-anchor="middle" fill="#334155" font-size="9" font-weight="700">${d.total}</text>`;
      }
    }
    
    // 날짜
    const dowColor = isSun ? '#dc2626' : isSat ? '#1d4ed8' : '#64748b';
    svg += `<text x="${x + colW/2}" y="${topH + chartH + 12}" text-anchor="middle" fill="${d.total > 0 ? '#334155' : '#cbd5e1'}" font-size="9" font-weight="600">${d.day}</text>`;
    svg += `<text x="${x + colW/2}" y="${topH + chartH + 22}" text-anchor="middle" fill="${dowColor}" font-size="7">${d.dow}</text>`;
  });
  
  svg += '</svg>';
  chartEl.innerHTML = svg;
}

PFM.modules.consult = { renderConsultRecords, renderConsultDashboard };
PFM.consultData = { CATEGORIES, CAT_COLORS, VISIT_SOURCES, SOURCE_COLORS };
})(window.PFM);
