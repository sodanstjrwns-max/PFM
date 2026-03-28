/* ═══ Module: 인바운드 콜 기록 (Inbound Call Records) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc, showModal, closeModal } = PFM;

// ═══ CRM 기준 드롭다운 데이터 ═══
const STAFF_INBOUND = [
  '강용구','강혜란','김리윤','김정연','김효정','나은희','노지은',
  '문수하','안나연','윤다인','윤선희','윤현주',
  '이수연','이유정','이지윤','이혜승','지하늘','최지현'
];

const TREATMENT_INTEREST = [
  { key: 'implant', label: '임플란트', color: '#3b82f6' },
  { key: 'orthodontics', label: '치아교정', color: '#8b5cf6' },
  { key: 'cosmetic', label: '심미치료', color: '#ec4899' },
  { key: 'general', label: '일반진료', color: '#6b7280' },
  { key: 'pediatric', label: '소아치료', color: '#f59e0b' },
  { key: 'scaling', label: '스케일링', color: '#22c55e' },
  { key: 'denture', label: '틀니', color: '#0ea5e9' },
  { key: 'booking_change', label: '예약변경', color: '#a855f7' },
  { key: 'booking_cancel', label: '예약취소', color: '#ef4444' },
  { key: 'etc', label: '기타', color: '#94a3b8' },
];

const RECOGNITION_PATHS = [
  { key: 'patient_referral', label: '환자분소개' },
  { key: 'patient_family', label: '환자분가족' },
  { key: 'acquaintance', label: '지인소개' },
  { key: 'staff_referral', label: '직원소개' },
  { key: 'search', label: '검색' },
  { key: 'blog', label: '블로그' },
  { key: 'instagram', label: '인스타그램' },
  { key: 'youtube', label: '유튜브' },
  { key: 'naver_cafe', label: '네이버카페' },
  { key: 'danggeun', label: '당근마켓' },
  { key: 'kakao_navi', label: '카카오네비' },
  { key: 'homepage', label: '홈페이지' },
  { key: 'homepage_db', label: '홈페이지(DB)' },
  { key: 'sign', label: '간판' },
  { key: 'dujeong', label: '두정점환자' },
  { key: 'etc', label: '기타' },
];

const CALL_PURPOSES_INBOUND = [
  { key: 'reservation', label: '예약', icon: '📅', color: '#3b82f6' },
  { key: 'reservation_change', label: '예약변경', icon: '🔄', color: '#8b5cf6' },
  { key: 'complaint', label: '컴플레인', icon: '⚠️', color: '#ef4444' },
  { key: 'general_inquiry', label: '기타 문의', icon: '💬', color: '#6b7280' },
];

const RESERVATION_STATUS = [
  { key: 'reserved', label: '예약', icon: '✅', color: '#22c55e' },
  { key: 'not_reserved', label: '미예약', icon: '❌', color: '#ef4444' },
  { key: 'no_answer', label: '부재중', icon: '📵', color: '#f59e0b' },
];

function fmtDate(d) { return d ? d.replace(/-/g,'.') : '-'; }

function getTreatment(key) {
  return TREATMENT_INTEREST.find(t => t.key === key) || { key, label: key || '-', color: '#94a3b8' };
}

function getResStatus(key) {
  return RESERVATION_STATUS.find(r => r.key === key) || { key, label: key || '-', icon: '—', color: '#94a3b8' };
}

function getRecPath(key) {
  return RECOGNITION_PATHS.find(r => r.key === key) || { key, label: key || '-' };
}

function getCallPurposeIn(key) {
  return CALL_PURPOSES_INBOUND.find(p => p.key === key) || { key, label: key || '-', icon: '📝', color: '#94a3b8' };
}

// ═══ 메인 렌더링 ═══
async function renderCallsInbound(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = `
    <button class="btn btn-primary btn-sm" id="addCallInBtn">📞 인바운드 기록</button>
    <button class="btn btn-sm" id="callInStatsBtn" style="margin-left:6px">📊 통계</button>
  `;
  
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  let filters = { search: '', staff: '', reservation: '', purpose: '' };
  
  async function loadRecords(month) {
    currentMonth = month;
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    
    const params = new URLSearchParams({ type: 'inbound', month });
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
    const totalNew = records.filter(r => r.patient_type === 'new').length;
    const totalExisting = records.filter(r => r.patient_type === 'existing').length;
    const resRate = records.length > 0 ? Math.round(totalReserved / records.length * 100) : 0;
    
    // 콜 목적별 집계
    const purposeCounts = {};
    records.forEach(r => {
      if (r.call_purpose) {
        purposeCounts[r.call_purpose] = (purposeCounts[r.call_purpose] || 0) + 1;
      }
    });
    
    body.innerHTML = `
      <!-- 월 네비게이션 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <button class="btn btn-sm" id="ciPrevMonth">◀ ${prevMonth.split('-')[1]}월</button>
        <h3 style="margin:0;font-size:18px;font-weight:900">${y}년 ${m}월 인바운드 콜</h3>
        <button class="btn btn-sm" id="ciNextMonth">${nextMonth.split('-')[1]}월 ▶</button>
      </div>
      
      <!-- 요약 카드 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">총 콜</div>
          <div style="font-size:24px;font-weight:900;color:var(--primary)">${records.length}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">✅ 예약</div>
          <div style="font-size:24px;font-weight:900;color:#22c55e">${totalReserved}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">❌ 미예약</div>
          <div style="font-size:24px;font-weight:900;color:#ef4444">${totalNotReserved}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">📵 부재중</div>
          <div style="font-size:24px;font-weight:900;color:#f59e0b">${totalNoAnswer}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">예약률</div>
          <div style="font-size:24px;font-weight:900;color:${resRate>=50?'#22c55e':'#ef4444'}">${resRate}%</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px">🔵 신환</div>
          <div style="font-size:24px;font-weight:900;color:#3b82f6">${totalNew}</div>
        </div>
      </div>
      
      <!-- 콜 목적 요약 칩 -->
      ${Object.keys(purposeCounts).length > 0 ? `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${Object.entries(purposeCounts).sort((a,b) => b[1]-a[1]).map(([key, cnt]) => {
          const p = getCallPurposeIn(key);
          return '<span style="background:' + p.color + '10;border:1px solid ' + p.color + '30;border-radius:20px;padding:4px 10px;font-size:11px;display:inline-flex;align-items:center;gap:4px">' +
            p.icon + ' ' + esc(p.label) + ' <strong style="color:' + p.color + '">' + cnt + '</strong>' +
          '</span>';
        }).join('')}
      </div>` : ''}
      
      <!-- 검색/필터 -->
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <div style="flex:1;min-width:180px;position:relative">
          <input type="text" id="ciSearch" placeholder="🔍 환자명, 연락처, 메모 검색..." value="${esc(filters.search)}"
            style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg-card)">
        </div>
        <select id="ciFilterStaff" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">
          <option value="">상담원 전체</option>
          ${STAFF_INBOUND.map(s => `<option value="${esc(s)}" ${filters.staff===s?'selected':''}>${esc(s)}</option>`).join('')}
        </select>
        <select id="ciFilterPurpose" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">
          <option value="">콜 목적 전체</option>
          ${CALL_PURPOSES_INBOUND.map(p => `<option value="${p.key}" ${filters.purpose===p.key?'selected':''}>${p.icon} ${p.label}</option>`).join('')}
        </select>
        <select id="ciFilterRes" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">
          <option value="">예약여부 전체</option>
          ${RESERVATION_STATUS.map(r => `<option value="${r.key}" ${filters.reservation===r.key?'selected':''}>${r.icon} ${r.label}</option>`).join('')}
        </select>
      </div>
      
      <!-- 테이블 -->
      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px">
          <thead>
            <tr style="background:var(--bg);border-bottom:2px solid var(--border)">
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">날짜</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">환자명</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">연락처</th>
              <th style="padding:10px 8px;text-align:center;font-weight:700;font-size:11px;color:var(--text-muted)">신/구환</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">상담원</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">관심진료</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">인지경로</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">콜 목적</th>
              <th style="padding:10px 8px;text-align:center;font-weight:700;font-size:11px;color:var(--text-muted)">예약여부</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted)">예약일</th>
              <th style="padding:10px 8px;text-align:left;font-weight:700;font-size:11px;color:var(--text-muted);max-width:200px">메모</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? `<tr><td colspan="11" style="padding:40px;text-align:center;color:var(--text-muted)">등록된 인바운드 콜이 없습니다</td></tr>` : ''}
            ${records.map(r => {
              const treat = getTreatment(r.treatment_interest);
              const res = getResStatus(r.reservation_status);
              const path = getRecPath(r.recognition_path);
              const purp = getCallPurposeIn(r.call_purpose);
              const ptColor = r.patient_type === 'new' ? '#3b82f6' : '#22c55e';
              const ptLabel = r.patient_type === 'new' ? '신환' : r.patient_type === 'existing' ? '구환' : '-';
              return `<tr class="ci-row" data-id="${r.id}" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <td style="padding:8px;font-size:11px;white-space:nowrap">${fmtDate(r.call_date)}</td>
                <td style="padding:8px;font-weight:700">${esc(r.patient_name||'-')}</td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted)">${esc(r.phone||'-')}</td>
                <td style="padding:8px;text-align:center"><span style="background:${ptColor}15;color:${ptColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${ptLabel}</span></td>
                <td style="padding:8px;font-size:11px">${esc(r.staff_name||'-')}</td>
                <td style="padding:8px"><span style="background:${treat.color}20;color:${treat.color};padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600">${esc(treat.label)}</span></td>
                <td style="padding:8px;font-size:11px">${esc(path.label)}</td>
                <td style="padding:8px"><span style="background:${purp.color}15;color:${purp.color};padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600">${purp.icon} ${esc(purp.label)}</span></td>
                <td style="padding:8px;text-align:center"><span style="color:${res.color};font-weight:700;font-size:12px">${res.icon}</span> <span style="font-size:10px;color:${res.color}">${res.label}</span></td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted)">${fmtDate(r.reservation_date)}</td>
                <td style="padding:8px;font-size:11px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.comment||'-')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;text-align:right">총 ${records.length}건</div>
    `;
    
    // 이벤트
    document.getElementById('ciPrevMonth')?.addEventListener('click', () => loadRecords(prevMonth));
    document.getElementById('ciNextMonth')?.addEventListener('click', () => loadRecords(nextMonth));
    
    let searchT = null;
    document.getElementById('ciSearch')?.addEventListener('input', (e) => {
      clearTimeout(searchT);
      searchT = setTimeout(() => { filters.search = e.target.value.trim(); loadRecords(currentMonth); }, 300);
    });
    document.getElementById('ciFilterStaff')?.addEventListener('change', (e) => { filters.staff = e.target.value; loadRecords(currentMonth); });
    document.getElementById('ciFilterPurpose')?.addEventListener('change', (e) => { filters.purpose = e.target.value; loadRecords(currentMonth); });
    document.getElementById('ciFilterRes')?.addEventListener('change', (e) => { filters.reservation = e.target.value; loadRecords(currentMonth); });
    
    document.querySelectorAll('.ci-row').forEach(row => {
      row.addEventListener('click', () => openCallForm('inbound', records.find(r => r.id === row.dataset.id), () => loadRecords(currentMonth)));
    });
  }
  
  await loadRecords(currentMonth);
  
  document.getElementById('addCallInBtn')?.addEventListener('click', () => {
    openCallForm('inbound', null, () => loadRecords(currentMonth));
  });
  
  document.getElementById('callInStatsBtn')?.addEventListener('click', () => {
    openCallStats('inbound', currentMonth);
  });
}

// ═══ 콜 기록 폼 (인바운드/아웃바운드 공용) ═══
function openCallForm(callType, record, onSave) {
  const r = record || {};
  const isEdit = !!record;
  const isInbound = callType === 'inbound';
  const staffList = isInbound ? STAFF_INBOUND : STAFF_OUTBOUND;
  
  const cs = `background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 16px;margin-bottom:12px`;
  const ls = `font-size:11px;font-weight:700;display:block;margin-bottom:5px;color:var(--text-muted);letter-spacing:0.3px`;
  const is = `width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);outline:none;box-sizing:border-box`;
  const ss = is + `;appearance:auto`;
  
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '560px';
  mc.innerHTML = `
    <div style="padding:4px 2px;max-height:85vh;overflow-y:auto">
      <h3 style="margin:0 0 20px;font-size:20px;font-weight:900">
        ${isInbound ? '📞' : '📱'} ${isEdit ? (isInbound ? '인바운드 수정' : '아웃바운드 수정') : (isInbound ? '인바운드 콜 기록' : '아웃바운드 콜 기록')}
      </h3>
      <form id="callForm">
        
        <!-- 기본 정보 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="background:${isInbound?'#3b82f6':'#8b5cf6'};color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">${isInbound?'인바운드':'아웃바운드'}</span> 기본 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">📅 날짜 <span style="color:#ef4444">*</span></label>
              <input type="date" name="call_date" value="${r.call_date || new Date().toISOString().slice(0,10)}" required style="${is}">
            </div>
            <div>
              <label style="${ls}">👤 상담원/응대자</label>
              <select name="staff_name" style="${ss}">
                <option value="">선택</option>
                ${staffList.map(s => `<option value="${esc(s)}" ${r.staff_name===s?'selected':''}>${esc(s)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">👤 환자 성함</label>
              <input type="text" name="patient_name" value="${esc(r.patient_name||'')}" placeholder="환자명" style="${is}">
            </div>
            <div>
              <label style="${ls}">📞 연락처</label>
              <input type="tel" name="phone" value="${esc(r.phone||'')}" placeholder="010-0000-0000" style="${is}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="${ls}">🏷️ 신/구환</label>
              <select name="patient_type" style="${ss}">
                <option value="" ${!r.patient_type?'selected':''}>선택</option>
                <option value="new" ${r.patient_type==='new'?'selected':''}>🔵 신환</option>
                <option value="existing" ${r.patient_type==='existing'?'selected':''}>🟢 구환</option>
              </select>
            </div>
            <div>
              <label style="${ls}">🏥 관심 진료</label>
              <select name="treatment_interest" style="${ss}">
                <option value="">선택</option>
                ${TREATMENT_INTEREST.map(t => `<option value="${t.key}" ${r.treatment_interest===t.key?'selected':''}>${t.label}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        
        <!-- 통화 목적 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="background:${isInbound?'#3b82f6':'#f59e0b'};color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">목적</span> 콜의 목적
          </div>
          <select name="call_purpose" style="${ss}">
            <option value="">-- 콜의 목적 선택 --</option>
            ${(isInbound ? CALL_PURPOSES_INBOUND : CALL_PURPOSES).map(p => `<option value="${p.key}" ${r.call_purpose===p.key?'selected':''}>${p.icon} ${p.label}</option>`).join('')}
          </select>
        </div>
        
        <!-- 인지경로 (인바운드만) -->
        ${isInbound ? `
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="background:#22c55e;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">경로</span> 인지 경로
          </div>
          <select name="recognition_path" style="${ss}">
            <option value="">-- 어떻게 알고 오셨는지 --</option>
            <optgroup label="👥 소개">
              ${['patient_referral','patient_family','acquaintance','staff_referral'].map(k => {
                const p = RECOGNITION_PATHS.find(r => r.key === k);
                return `<option value="${k}" ${r.recognition_path===k?'selected':''}>${p.label}</option>`;
              }).join('')}
            </optgroup>
            <optgroup label="💻 온라인">
              ${['search','blog','instagram','youtube','naver_cafe','danggeun','kakao_navi','homepage','homepage_db'].map(k => {
                const p = RECOGNITION_PATHS.find(r => r.key === k);
                return `<option value="${k}" ${r.recognition_path===k?'selected':''}>${p.label}</option>`;
              }).join('')}
            </optgroup>
            <optgroup label="🚶 기타">
              ${['sign','dujeong','etc'].map(k => {
                const p = RECOGNITION_PATHS.find(r => r.key === k);
                return `<option value="${k}" ${r.recognition_path===k?'selected':''}>${p.label}</option>`;
              }).join('')}
            </optgroup>
          </select>
        </div>` : ''}
        
        <!-- 예약 정보 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <span style="background:#06b6d4;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">예약</span> 내원 예약 정보
          </div>
          <div style="margin-bottom:12px">
            <label style="${ls}">📋 예약 여부</label>
            <div style="display:flex;gap:8px" id="callResGroup">
              ${RESERVATION_STATUS.map(rs => `
                <label style="flex:1;display:flex;align-items:center;gap:6px;padding:12px;border:2px solid ${r.reservation_status===rs.key?rs.color:'var(--border)'};border-radius:10px;cursor:pointer;transition:all 0.2s;background:${r.reservation_status===rs.key?rs.color+'15':'var(--bg)'}">
                  <input type="radio" name="reservation_status" value="${rs.key}" ${r.reservation_status===rs.key?'checked':''} style="accent-color:${rs.color}">
                  <span style="font-size:16px">${rs.icon}</span>
                  <span style="font-size:12px;font-weight:700;color:${rs.color}">${rs.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">📅 예약일</label>
              <input type="date" name="reservation_date" value="${r.reservation_date||''}" style="${is}">
            </div>
            <div>
              <label style="${ls}">✅ 예약이행여부</label>
              <select name="reservation_fulfilled" style="${ss}">
                <option value="" ${!r.reservation_fulfilled?'selected':''}>-</option>
                <option value="fulfilled" ${r.reservation_fulfilled==='fulfilled'?'selected':''}>✅ 이행</option>
                <option value="not_fulfilled" ${r.reservation_fulfilled==='not_fulfilled'?'selected':''}>❌ 미이행</option>
              </select>
            </div>
          </div>
          <div>
            <label style="${ls}">📝 예약미이행 F/U</label>
            <input type="text" name="follow_up" value="${esc(r.follow_up||'')}" placeholder="미이행 시 후속 조치 기록" style="${is}">
          </div>
        </div>
        
        <!-- 코멘트 -->
        <div style="${cs}">
          <label style="${ls}">💬 코멘트/메모</label>
          <textarea name="comment" rows="3" placeholder="통화 내용, 특이사항 메모..." style="${is};resize:vertical">${esc(r.comment||'')}</textarea>
        </div>
        
        <!-- 버튼 -->
        <div style="display:flex;gap:8px;margin-top:4px">
          <button type="submit" class="btn btn-primary" style="flex:1;padding:14px;font-weight:800;font-size:15px;border-radius:12px">
            ${isEdit ? '✅ 수정 저장' : (isInbound ? '📞 기록 저장' : '📱 기록 저장')}
          </button>
          ${isEdit ? '<button type="button" id="callDeleteBtn" class="btn" style="padding:14px;color:#ef4444;font-weight:700;border-radius:12px;border:1px solid #fecaca">삭제</button>' : ''}
          <button type="button" onclick="PFM.closeModal()" class="btn" style="padding:14px;border-radius:12px">취소</button>
        </div>
      </form>
    </div>
  `;
  
  // 예약 라디오 스타일 동적 변경
  document.querySelectorAll('#callResGroup input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('#callResGroup label').forEach(lbl => {
        const inp = lbl.querySelector('input');
        const rs = RESERVATION_STATUS.find(r => r.key === inp.value);
        if (inp.checked) {
          lbl.style.borderColor = rs.color;
          lbl.style.background = rs.color + '15';
        } else {
          lbl.style.borderColor = 'var(--border)';
          lbl.style.background = 'var(--bg)';
        }
      });
    });
  });
  
  // 폼 제출
  document.getElementById('callForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { call_type: callType };
    for (const [k,v] of fd.entries()) data[k] = v;
    
    try {
      if (isEdit) {
        await api(`/api/protected/calls/${r.id}`, { method: 'PUT', json: data }) ;
        toast('✅ 콜 기록 수정 완료');
      } else {
        await api('/api/protected/calls', { method: 'POST', json: data }) ;
        toast('✅ 콜 기록 저장 완료');
      }
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
  
  // 삭제
  document.getElementById('callDeleteBtn')?.addEventListener('click', async () => {
    if (!confirm('이 콜 기록을 삭제하시겠습니까?')) return;
    try {
      await api(`/api/protected/calls/${r.id}`, { method: 'DELETE' });
      toast('🗑️ 콜 기록 삭제 완료');
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 실패', 'error'); }
  });
}

// ═══ 콜 통계 팝업 ═══
async function openCallStats(callType, month) {
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '500px';
  mc.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  try {
    const stats = await api(`/api/protected/calls/stats?type=${callType}&month=${month}`);
    const isInbound = callType === 'inbound';
    const [y,m] = month.split('-').map(Number);
    
    mc.innerHTML = `
      <div style="padding:4px 2px">
        <h3 style="margin:0 0 20px;font-size:18px;font-weight:900">📊 ${isInbound?'인바운드':'아웃바운드'} 콜 통계 (${y}.${m})</h3>
        
        <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px">
          <div style="font-size:10px;color:var(--text-muted)">총 콜 수</div>
          <div style="font-size:36px;font-weight:900;color:var(--primary)">${stats.total}</div>
        </div>
        
        ${stats.byReservation.length > 0 ? `
        <div style="margin-bottom:16px">
          <h4 style="font-size:13px;font-weight:700;margin:0 0 8px">예약 현황</h4>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${stats.byReservation.map(r => {
              const rs = getResStatus(r.reservation_status);
              const pct = stats.total > 0 ? Math.round(r.c / stats.total * 100) : 0;
              return `<div style="flex:1;min-width:80px;background:${rs.color}10;border:1px solid ${rs.color}30;border-radius:10px;padding:10px;text-align:center">
                <div style="font-size:16px">${rs.icon}</div>
                <div style="font-size:18px;font-weight:900;color:${rs.color}">${r.c}</div>
                <div style="font-size:10px;color:var(--text-muted)">${rs.label} (${pct}%)</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        
        ${stats.byStaff.length > 0 ? `
        <div style="margin-bottom:16px">
          <h4 style="font-size:13px;font-weight:700;margin:0 0 8px">상담원별</h4>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${stats.byStaff.slice(0,10).map(s => {
              const pct = stats.total > 0 ? Math.round(s.c / stats.total * 100) : 0;
              return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
                <span style="width:60px;font-weight:700">${esc(s.staff_name)}</span>
                <div style="flex:1;background:var(--bg);border-radius:4px;height:16px;overflow:hidden">
                  <div style="height:100%;background:var(--primary);border-radius:4px;width:${Math.max(pct,3)}%;transition:width 0.3s"></div>
                </div>
                <span style="width:50px;text-align:right;font-weight:600">${s.c}건</span>
                <span style="width:35px;text-align:right;color:var(--text-muted)">${pct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        
        ${stats.byPurpose && stats.byPurpose.length > 0 ? `
        <div style="margin-bottom:16px">
          <h4 style="font-size:13px;font-weight:700;margin:0 0 8px">콜 목적별</h4>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${stats.byPurpose.map(p => {
              const purp = isInbound ? (CALL_PURPOSES_INBOUND.find(cp => cp.key === p.call_purpose) || { icon: '📝', label: p.call_purpose || '-', color: '#94a3b8' }) : ((PFM._callShared?.CALL_PURPOSES || []).find(cp => cp.key === p.call_purpose) || { icon: '📝', label: p.call_purpose || '-', color: '#94a3b8' });
              return '<div style="display:flex;align-items:center;gap:8px;font-size:12px">' +
                '<span style="width:4px;height:18px;border-radius:2px;background:' + purp.color + '"></span>' +
                '<span style="flex:1">' + purp.icon + ' ' + esc(purp.label) + '</span>' +
                '<strong>' + p.c + '건</strong>' +
              '</div>';
            }).join('')}
          </div>
        </div>` : ''}
        
        ${stats.byTreatment.length > 0 ? `
        <div style="margin-bottom:16px">
          <h4 style="font-size:13px;font-weight:700;margin:0 0 8px">관심 진료별</h4>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${stats.byTreatment.map(t => {
              const treat = getTreatment(t.treatment_interest);
              return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
                <span style="width:4px;height:18px;border-radius:2px;background:${treat.color}"></span>
                <span style="flex:1">${esc(treat.label)}</span>
                <strong>${t.c}건</strong>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        
        <button onclick="PFM.closeModal()" class="btn" style="width:100%;padding:12px;border-radius:12px;margin-top:8px">닫기</button>
      </div>
    `;
  } catch(e) {
    mc.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">통계를 불러올 수 없습니다</div>';
  }
}

// 아웃바운드용 데이터 (export for outbound module)
const STAFF_OUTBOUND = [
  '강혜란','김정연','김효정','나은희','노지은','문수하','박설희','박채연',
  '안나연','윤다인','윤선희','윤현주',
  '이수연','이유정','이지윤','이혜승','지하늘','최지현',
  '한혜림','홍서영','황혜인'
];

const CALL_PURPOSES = [
  { key: 'rebooking', label: '재예약', icon: '🔄' },
  { key: 'recall', label: '리콜', icon: '📞' },
  { key: 'checkup', label: '정기검진 안내', icon: '🩺' },
  { key: 'post_surgery', label: '수술후 F/U', icon: '💊' },
  { key: 'post_consult', label: '상담후 F/U', icon: '💬' },
  { key: 'new_patient_fu', label: '신환 F/U', icon: '🔵' },
  { key: 'no_show', label: '부도/노쇼 확인', icon: '⚠️' },
  { key: 'outstanding', label: '미수금 안내', icon: '💰' },
  { key: 'booking_confirm', label: '예약확인', icon: '✅' },
  { key: 'treatment_hold', label: '치료중단 확인', icon: '⏸️' },
  { key: 'etc', label: '기타', icon: '📝' },
];

// ═══ 모듈 등록 ═══
PFM.modules.callsInbound = { renderCallsInbound };
// 공유 데이터 (아웃바운드 모듈에서 참조)
PFM._callShared = {
  STAFF_OUTBOUND, CALL_PURPOSES, CALL_PURPOSES_INBOUND, TREATMENT_INTEREST, RESERVATION_STATUS,
  RECOGNITION_PATHS, openCallForm, openCallStats, getTreatment, getResStatus, getRecPath, getCallPurposeIn, fmtDate
};

})(window.PFM);
