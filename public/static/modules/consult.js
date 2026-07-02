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
    <button class="btn btn-sm" data-act="PFM.navigate('consult_dashboard')" style="margin-left:6px">📊 분석</button>
    ${isManager ? '<button class="btn btn-sm" id="seedConsultBtn" style="margin-left:6px;background:#fef3c7;border-color:#fcd34d;color:#92400e">✨ 샘플 데이터</button>' : ''}
  `;
  
  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
  
  let staffData = null;
  try { staffData = await api('/api/protected/consult-records/staff'); } catch(e) {}
  
  async function loadRecords(month) {
    currentMonth = month;
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    const records = await api(`/api/protected/consult-records?month=${month}`);
    renderRecordsList(body, records, month, loadRecords, staffData, isManager);
  }
  
  await loadRecords(currentMonth);
  
  document.getElementById('addConsultBtn')?.addEventListener('click', () => {
    openRecordForm(null, staffData, async () => { await loadRecords(currentMonth); });
  });
  
  // ✨ 상담기록 샘플 데이터 주입
  document.getElementById('seedConsultBtn')?.addEventListener('click', async () => {
    if (!confirm('최근 90일치 상담기록 샘플 30건을 주입합니다.\n(이미 5건 이상 있으면 차단됩니다)\n\n진행할까요?')) return;
    const btn = document.getElementById('seedConsultBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ 주입 중...';
    try {
      const res = await api('/api/protected/onboarding/seed-consult-sample', { method: 'POST' });
      toast(res.message || `상담기록 ${res.inserted}건 주입 완료!`, 'success');
      await loadRecords(currentMonth);
    } catch (e) {
      toast(e.message || '샘플 주입 실패', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ 샘플 데이터';
    }
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
          <div class="mod-muted-sm-bold">총 상담${hasAnyFilter ? ' (필터)' : ''}</div>
          <div style="font-size:24px;font-weight:900;color:#3b82f6">${total}건</div>
          <div class="mod-muted-xs">신환 ${newP} / 구환 ${total - newP}${hasAnyFilter ? ' <span style="color:#f59e0b">/ 전체 ' + records.length + '</span>' : ''}</div>
        </div>
        <div class="card-sm">
          <div class="mod-muted-sm-bold">확정률</div>
          <div style="font-size:24px;font-weight:900;color:${rate >= 80 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444'}">${rate}%</div>
          <div class="mod-muted-xs">✅${confirmed} ❌${rejected} ⏳${pending}</div>
        </div>
        ${isManager ? `
        <div class="card-sm">
          <div class="mod-muted-sm-bold">비용계획</div>
          <div style="font-size:20px;font-weight:900;color:#8b5cf6">${fmtMan(totalPlanned)}</div>
        </div>
        <div class="card-sm">
          <div class="mod-muted-sm-bold">동의금액</div>
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
              return `<tr style="border-bottom:1px solid var(--border-light);cursor:pointer;transition:background 0.12s;${zebra}" data-id="${r.id}" class="cr-row" data-act-over="this.style.background='var(--bg-hover)'" data-act-out="this.style.background='${idx%2===1?'rgba(0,0,0,0.015)':''}'" >
                <td style="padding:8px;font-weight:600;white-space:nowrap">${dateStr}</td>
                <td style="padding:8px;font-weight:700">${esc(r.patient_name)}${r.chart_number ? '<span style="color:var(--text-muted);font-size:10px;margin-left:4px">#'+esc(String(r.chart_number))+'</span>' : ''}</td>
                <td style="padding:7px 8px">${esc(r.doctor_name)}</td>
                <td style="padding:8px">${esc(r.counselor_name)}</td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted)">${esc(r.desk_name||'')}</td>
                <td style="padding:8px;text-align:right;color:var(--text-muted)">${r.planned_amount ? fmtWon(r.planned_amount) : '-'}</td>
                <td style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${r.agreed_amount ? fmtWon(r.agreed_amount) : '-'}</td>
                <td class="tbl-cell-center">${ptBadge}</td>
                <td class="tbl-cell-center"><span style="background:${catColor}18;color:${catColor};padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">${catLabel}</span></td>
                <td class="tbl-cell-center">${confBadge}</td>
                <td class="tbl-cell-center">${srcLabel ? `<span style="color:${srcColor};font-size:10px;font-weight:600">${srcLabel.replace(/^.\\s/,'')}</span>` : '<span style="color:#cbd5e1">-</span>'}</td>
                <td class="tbl-cell-center">${apptBadge}</td>
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
        <div class="mod-muted-sm">${hasAnyFilter ? `🔍 필터 결과 <strong>${filtered.length}</strong>건 / 전체 ${records.length}건` : `📋 총 <strong>${records.length}</strong>건`}</div>
        <div class="mod-muted-xs">💡 헤더를 클릭하면 정렬됩니다</div>
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
          <div class="grid-2 mb-12">
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
            <label style="${labelStyle}">👤 환자 성함 <span class="text-danger">*</span> <span style="font-size:9px;color:var(--primary);font-weight:500">(환자DB 자동검색)</span></label>
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
          <div class="grid-2 mb-12">
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
            <label style="${labelStyle}">🛤️ 내원 경로 <span class="text-danger">*</span></label>
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
          <button type="button" data-act="PFM.closeModal()" class="btn" style="padding:14px;border-radius:12px">취소</button>
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
            return `<div class="cr-ac-item" data-idx="${i}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;display:flex;align-items:center;gap:8px" data-act-over="this.style.background='var(--bg-hover)'" data-act-out="this.style.background=''">
              <div class="flex-1">
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
    
    // 바깥 클릭 시 닫기 (AbortController로 클린업)
    const ac = new AbortController();
    document.addEventListener('click', (e) => {
      if (!suggestBox.contains(e.target) && e.target !== patientInput) suggestBox.style.display = 'none';
    }, { signal: ac.signal });
    // 모듈 언로드 시 정리 (페이지 전환 시 container 교체로 자동 호출)
    const obs = new MutationObserver(() => { if (!document.contains(suggestBox)) { ac.abort(); obs.disconnect(); } });
    obs.observe(document.body, { childList: true, subtree: true });
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
  
  actions.innerHTML = `<button class="btn btn-sm" data-act="PFM.navigate('consult_records')">📋 기록</button>`;
  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
  
  async function loadDashboard(month) {
    currentMonth = month;
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
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
        <div class="mod-muted-sm-bold">총 상담</div>
        <div style="font-size:28px;font-weight:900;color:#3b82f6">${s.total}</div>
        <div class="mod-muted-xs">신환 ${s.newPatients} / 구환 ${s.existingPatients}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div class="mod-muted-sm-bold">확정률</div>
        <div style="font-size:28px;font-weight:900;color:${rateColor}">${s.confirmRate}%</div>
        <div class="mod-muted-xs">✅${s.confirmed} ❌${s.rejected} ⏳${s.pending}</div>
      </div>
      ${isManager && s.totalPlanned !== null ? `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div class="mod-muted-sm-bold">비용계획</div>
        <div style="font-size:22px;font-weight:900;color:#8b5cf6">${fmtMan(s.totalPlanned)}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div class="mod-muted-sm-bold">동의금액</div>
        <div style="font-size:22px;font-weight:900;color:#3b82f6">${fmtMan(s.totalAgreed)}</div>
        <div class="mod-muted-xs">할인율 ${s.discountRate}%</div>
      </div>` : ''}
    </div>

    <!-- 📚 노하우 카드 추천 (확정률 낮을 때 자동 노출) -->
    <div id="consultKbRecommend" style="margin-bottom:20px"></div>

    <!-- 🤖 AI 상담 인사이트 (GPT 분석) -->
    <div id="consultAiInsight" style="margin-bottom:20px"></div>

    <!-- 상담사별 분석 -->
    <div class="section-title">👩‍⚕️ <span>상담사별 분석</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">상담사</th>
            <th class="tbl-cell">상담</th>
            <th class="tbl-cell">확정</th>
            <th class="tbl-cell">미확정</th>
            <th class="tbl-cell">확정률</th>
            ${isManager ? '<th class="tbl-cell">비용계획</th><th class="tbl-cell">동의금액</th>' : ''}
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
            <th class="tbl-cell">상담</th>
            <th class="tbl-cell">확정</th>
            <th class="tbl-cell">미확정</th>
            <th class="tbl-cell">확정률</th>
            ${isManager ? '<th class="tbl-cell">비용계획</th><th class="tbl-cell">동의금액</th>' : ''}
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
          '<div style="font-size:20px;font-weight:900">' + v.total + '건 <span class="mod-muted-sm">(' + pct + '%)</span></div>' +
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

/* ════════════════════════════════════════════════
   📚 노하우 카드 추천 (상담분석 페이지 컨텍스트 기반)
   ════════════════════════════════════════════════ */
async function loadConsultKnowledgeRecommend(summary) {
  const slot = document.getElementById('consultKbRecommend');
  if (!slot) return;

  // 컨텍스트 결정: 확정률 < 70% → low_conversion 추천
  const rate = Number(summary?.confirmRate ?? 100);
  const total = Number(summary?.total ?? 0);

  // 표본 너무 작으면(<5건) 추천 안 함
  if (total < 5) { slot.innerHTML = ''; return; }

  // 확정률 70% 이상이면 노출하지 않음 (잘하고 있으니까)
  if (rate >= 70) {
    slot.innerHTML = `
      <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px">
        <span style="font-size:24px">🎉</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px;color:#065f46">확정률 ${rate}% — 잘하고 있어요!</div>
          <div style="font-size:12px;color:#047857;margin-top:2px">상담 시스템이 안정적으로 돌아가는 중. 이번 달도 페이스 유지하세요.</div>
        </div>
        <button data-act="PFM.navigate('knowledge')" class="btn btn-sm" style="background:#fff;color:#065f46;border:1px solid #6ee7b7">📚 노하우 더보기</button>
      </div>
    `;
    return;
  }

  // 확정률 낮음 → 카드 추천
  try {
    const data = await api('/api/protected/knowledge/_recommend/by-context?context=low_conversion&limit=3');
    const cards = data?.cards || [];
    if (!cards.length) { slot.innerHTML = ''; return; }

    const severityColor = rate < 50 ? '#ef4444' : rate < 60 ? '#f59e0b' : '#0e7490';
    const severityBg = rate < 50 ? '#fef2f2' : rate < 60 ? '#fffbeb' : '#ecfeff';
    const severityBorder = rate < 50 ? '#fecaca' : rate < 60 ? '#fde68a' : '#a5f3fc';
    const severityIcon = rate < 50 ? '🚨' : rate < 60 ? '⚠️' : '💡';
    const severityMsg = rate < 50
      ? '확정률이 50% 미만입니다. 상담 프로세스 점검이 시급합니다.'
      : rate < 60
        ? '확정률이 60% 미만입니다. 상담 흐름을 다시 살펴보세요.'
        : '확정률을 더 끌어올릴 수 있는 노하우 카드를 추천드려요.';

    slot.innerHTML = `
      <div style="background:${severityBg};border:1px solid ${severityBorder};border-radius:12px;padding:16px 18px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="font-size:22px">${severityIcon}</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px;color:${severityColor}">전환율 개선 노하우 (확정률 ${rate}%)</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${severityMsg}</div>
          </div>
          <button data-act="PFM.navigate('knowledge')" class="btn btn-sm" style="background:#fff;border:1px solid ${severityBorder}">📚 전체 보기</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
          ${cards.map(c => `
            <div data-act="window.PFMKnowledge?.openCard('${c.id}')"
              style="background:#fff;border:1px solid ${severityBorder};border-radius:10px;padding:12px 14px;cursor:pointer;transition:all 0.15s"
              data-act-over="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
              data-act-out="this.style.transform='';this.style.boxShadow=''">
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                <span style="background:#ecfdf5;color:#065f46;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600">
                  ${c.categoryMeta?.icon || '📁'} ${esc(c.categoryMeta?.label || c.category)}
                </span>
                ${c.book_source ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:8px;font-size:10px">📖 ${esc(c.book_source)}</span>` : ''}
              </div>
              <div style="font-weight:700;font-size:13px;color:#1e293b;line-height:1.4;margin-bottom:6px">
                ${esc(c.title)}
              </div>
              <div style="font-size:11px;color:#64748b;line-height:1.5;
                          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
                ${esc(String(c.preview || '').replace(/^['"]/, ''))}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    slot.innerHTML = ''; // 추천 실패는 조용히 무시
  }
}

/* ════════════════════════════════════════════════
   🤖 AI 상담 인사이트 (C-2: GPT-4o-mini 분석)
   ════════════════════════════════════════════════ */
async function loadConsultAiInsight(month, summary) {
  const slot = document.getElementById('consultAiInsight');
  if (!slot) return;

  const total = Number(summary?.total ?? 0);
  // 표본 너무 작으면(<5건) AI 호출 안 함 — 비용/품질 모두 안 좋음
  if (total < 5) { slot.innerHTML = ''; return; }

  // 초기 상태: 분석 버튼만 (자동 호출 X — 비용 통제)
  slot.innerHTML = `
    <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #c7d2fe;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px">
      <span style="font-size:24px">🤖</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13px;color:#3730a3">AI 상담 인사이트</div>
        <div style="font-size:12px;color:#4338ca;margin-top:2px">${month.replace('-','년 ')}월 상담 ${total}건을 GPT가 분석해드려요 (강점/약점/액션 + 상담사별 코칭)</div>
      </div>
      <button id="consultAiRunBtn" class="btn btn-sm" style="background:#4f46e5;color:#fff;border:none;font-weight:700">✨ 분석 시작</button>
    </div>
  `;

  document.getElementById('consultAiRunBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('consultAiRunBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 분석 중...'; }
    slot.innerHTML = `
      <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #c7d2fe;border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">🤖</div>
        <div style="font-weight:700;color:#3730a3;margin-bottom:4px">GPT-4o-mini가 분석 중입니다...</div>
        <div style="font-size:12px;color:#6366f1">상담 데이터를 읽고 인사이트를 정리하고 있어요 (5~15초)</div>
        <div style="margin-top:12px"><span class="loading-spinner"></span></div>
      </div>
    `;

    try {
      const data = await api(`/api/protected/ai/consult-insight?month=${month}`);
      renderConsultAiInsight(slot, data, month);
    } catch (e) {
      slot.innerHTML = `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px">
          <div style="font-weight:700;color:#991b1b;margin-bottom:4px">⚠️ AI 분석 실패</div>
          <div style="font-size:12px;color:#7f1d1d">${esc(e.message || '알 수 없는 오류')}</div>
          <div style="font-size:11px;color:#991b1b;margin-top:6px">설정 → AI에서 OpenAI 키가 등록되어 있는지 확인해주세요.</div>
        </div>
      `;
    }
  });
}

function renderConsultAiInsight(slot, data, month) {
  const ai = data?.ai || {};
  const stats = data?.stats || {};
  const cached = data?.cached ? '<span style="background:#ecfdf5;color:#065f46;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;margin-left:6px">💾 캐시</span>' : '';
  const trendIcon = ai.trend === 'up' ? '📈' : ai.trend === 'down' ? '📉' : '➡️';
  const trendColor = ai.trend === 'up' ? '#16a34a' : ai.trend === 'down' ? '#dc2626' : '#64748b';

  const strengths = Array.isArray(ai.strengths) ? ai.strengths : [];
  const weaknesses = Array.isArray(ai.weaknesses) ? ai.weaknesses : [];
  const actions = Array.isArray(ai.actions) ? ai.actions : [];
  const counselorAdvice = Array.isArray(ai.counselorAdvice) ? ai.counselorAdvice : [];

  slot.innerHTML = `
    <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #c7d2fe;border-radius:14px;padding:18px 20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="font-size:24px">🤖</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:15px;color:#3730a3">AI 상담 인사이트 ${cached}</div>
          <div style="font-size:11px;color:#6366f1;margin-top:2px">${month.replace('-','년 ')}월 · GPT-4o-mini 분석</div>
        </div>
        <button id="consultAiRefreshBtn" class="btn btn-sm" style="background:#fff;color:#4f46e5;border:1px solid #c7d2fe">🔄 새로고침</button>
      </div>

      <!-- 요약 -->
      <div style="background:#fff;border:1px solid #e0e7ff;border-radius:10px;padding:14px 16px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">${trendIcon}</span>
          <span style="font-weight:700;font-size:13px;color:${trendColor}">한 줄 요약</span>
        </div>
        <div style="font-size:13px;color:#1e293b;line-height:1.6">${esc(ai.summary || '요약 없음')}</div>
      </div>

      <!-- 강점/약점 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:12px">
        <div style="background:#fff;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px">
          <div style="font-weight:700;font-size:12px;color:#15803d;margin-bottom:8px">✅ 강점</div>
          ${strengths.length ? `<ul style="margin:0;padding-left:18px;font-size:12px;color:#166534;line-height:1.7">${strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<div style="font-size:11px;color:#6b7280">데이터 부족</div>'}
        </div>
        <div style="background:#fff;border:1px solid #fecaca;border-radius:10px;padding:12px 14px">
          <div style="font-weight:700;font-size:12px;color:#b91c1c;margin-bottom:8px">⚠️ 약점</div>
          ${weaknesses.length ? `<ul style="margin:0;padding-left:18px;font-size:12px;color:#991b1b;line-height:1.7">${weaknesses.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<div style="font-size:11px;color:#6b7280">없음</div>'}
        </div>
      </div>

      <!-- 액션 아이템 -->
      ${actions.length ? `
        <div style="background:#fff;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12px;color:#a16207;margin-bottom:8px">🎯 이번 주 액션 (우선순위순)</div>
          <ol style="margin:0;padding-left:20px;font-size:12px;color:#854d0e;line-height:1.7">
            ${actions.map(a => `<li style="margin-bottom:4px"><strong>${esc(a)}</strong></li>`).join('')}
          </ol>
        </div>
      ` : ''}

      <!-- 상담사별 코칭 -->
      ${counselorAdvice.length ? `
        <div style="background:#fff;border:1px solid #c7d2fe;border-radius:10px;padding:12px 14px">
          <div style="font-weight:700;font-size:12px;color:#4338ca;margin-bottom:10px">👩‍⚕️ 상담사별 코칭</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px">
            ${counselorAdvice.map(ca => `
              <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px 12px">
                <div style="font-weight:700;font-size:12px;color:#5b21b6;margin-bottom:4px">${esc(ca.name || '상담사')}</div>
                <div style="font-size:11px;color:#6d28d9;line-height:1.6">${esc(ca.advice || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('consultAiRefreshBtn')?.addEventListener('click', async () => {
    // 강제 새로고침 — 캐시 무시 파라미터
    slot.innerHTML = '<div class="mod-empty" style="padding:20px"><span class="loading-spinner"></span> AI 재분석 중...</div>';
    try {
      const fresh = await api(`/api/protected/ai/consult-insight?month=${month}&nocache=1`);
      renderConsultAiInsight(slot, fresh, month);
    } catch (e) {
      // 실패 시 원본 다시 표시
      renderConsultAiInsight(slot, data, month);
    }
  });
}

// renderDashboardContent 호출 후 위젯 자동 로드
const _origRenderDashboardContent = renderDashboardContent;
renderDashboardContent = function(body, data, month, isManager, reload) {
  _origRenderDashboardContent(body, data, month, isManager, reload);
  if (data?.summary) {
    loadConsultKnowledgeRecommend(data.summary);
    loadConsultAiInsight(month, data.summary);
  }
};

PFM.modules.consult = { renderConsultRecords, renderConsultDashboard };
PFM.consultData = { CATEGORIES, CAT_COLORS, VISIT_SOURCES, SOURCE_COLORS };
})(window.PFM);
