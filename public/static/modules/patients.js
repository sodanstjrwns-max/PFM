/* ═══ Module: 환자 데이터베이스 (Patient Registry) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc, showModal, closeModal, navigate } = PFM;

// ═══ 한국 행정구역 데이터 (도/시 → 시/군/구) ═══
const ADDR_DATA = {
  '서울특별시': ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'],
  '부산광역시': ['강서구','금정구','기장군','남구','동구','동래구','부산진구','북구','사상구','사하구','서구','수영구','연제구','영도구','중구','해운대구'],
  '대구광역시': ['남구','달서구','달성군','동구','북구','서구','수성구','중구'],
  '인천광역시': ['강화군','계양구','남동구','동구','미추홀구','부평구','서구','연수구','옹진군','중구'],
  '광주광역시': ['광산구','남구','동구','북구','서구'],
  '대전광역시': ['대덕구','동구','서구','유성구','중구'],
  '울산광역시': ['남구','동구','북구','울주군','중구'],
  '세종특별자치시': ['세종시'],
  '경기도': ['가평군','고양시','과천시','광명시','광주시','구리시','군포시','김포시','남양주시','동두천시','부천시','성남시','수원시','시흥시','안산시','안성시','안양시','양주시','양평군','여주시','연천군','오산시','용인시','의왕시','의정부시','이천시','파주시','평택시','포천시','하남시','화성시'],
  '강원특별자치도': ['강릉시','고성군','동해시','삼척시','속초시','양구군','양양군','영월군','원주시','인제군','정선군','철원군','춘천시','태백시','평창군','홍천군','화천군','횡성군'],
  '충청북도': ['괴산군','단양군','보은군','영동군','옥천군','음성군','제천시','증평군','진천군','청주시','충주시'],
  '충청남도': ['계룡시','공주시','금산군','논산시','당진시','보령시','부여군','서산시','서천군','아산시','예산군','천안시','청양군','태안군','홍성군'],
  '전북특별자치도': ['고창군','군산시','김제시','남원시','무주군','부안군','순창군','완주군','익산시','임실군','장수군','전주시','정읍시','진안군'],
  '전라남도': ['강진군','고흥군','곡성군','광양시','구례군','나주시','담양군','목포시','무안군','보성군','순천시','신안군','여수시','영광군','영암군','완도군','장성군','장흥군','진도군','함평군','해남군','화순군'],
  '경상북도': ['경산시','경주시','고령군','구미시','군위군','김천시','문경시','봉화군','상주시','성주군','안동시','영덕군','영양군','영주시','영천시','예천군','울릉군','울진군','의성군','청도군','청송군','칠곡군','포항시'],
  '경상남도': ['거제시','거창군','고성군','김해시','남해군','밀양시','사천시','산청군','양산시','의령군','진주시','창녕군','창원시','통영시','하동군','함안군','함양군','합천군'],
  '제주특별자치도': ['서귀포시','제주시']
};
const SIDO_LIST = Object.keys(ADDR_DATA);

// 시/도 약칭 변환
function shortSido(s) {
  if (!s) return '';
  return s.replace('특별시','').replace('광역시','').replace('특별자치시','').replace('특별자치도','');
}

// 주소 캐스케이드 드롭다운 렌더링
function renderAddressSelector(prefix, sido, sigungu, detail, styles) {
  const { ls, ss, is } = styles;
  const sigunguList = sido ? (ADDR_DATA[sido] || []) : [];
  return `
    <div style="margin-bottom:12px">
      <label style="${ls}">📍 주소지</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <select id="${prefix}_sido" name="addr_sido" style="${ss}">
          <option value="">시/도 선택</option>
          ${SIDO_LIST.map(s => `<option value="${esc(s)}" ${s===sido?'selected':''}>${esc(shortSido(s))}</option>`).join('')}
        </select>
        <select id="${prefix}_sigungu" name="addr_sigungu" style="${ss}">
          <option value="">시/군/구 선택</option>
          ${sigunguList.map(g => `<option value="${esc(g)}" ${g===sigungu?'selected':''}>${esc(g)}</option>`).join('')}
        </select>
      </div>
      <input type="text" id="${prefix}_detail" name="addr_detail" value="${esc(detail||'')}" placeholder="상세주소 (동/읍/면, 아파트명 등)" style="${is}">
    </div>
  `;
}

// 주소 캐스케이드 이벤트 바인딩
function bindAddressCascade(prefix) {
  const sidoEl = document.getElementById(prefix + '_sido');
  const sigunguEl = document.getElementById(prefix + '_sigungu');
  if (!sidoEl || !sigunguEl) return;
  sidoEl.addEventListener('change', () => {
    const selected = sidoEl.value;
    const list = selected ? (ADDR_DATA[selected] || []) : [];
    sigunguEl.innerHTML = '<option value="">시/군/구 선택</option>' + list.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  });
}

// 주소 표시 헬퍼
function fmtAddr(p) {
  if (!p) return '-';
  const parts = [];
  if (p.addr_sido) parts.push(shortSido(p.addr_sido));
  if (p.addr_sigungu) parts.push(p.addr_sigungu);
  if (p.addr_detail) parts.push(p.addr_detail);
  if (parts.length === 0 && p.address) return p.address; // 레거시 호환
  return parts.join(' ') || '-';
}

// 주소 짧은 표시 (리스트용)
function fmtAddrShort(p) {
  if (!p) return '-';
  const parts = [];
  if (p.addr_sido) parts.push(shortSido(p.addr_sido));
  if (p.addr_sigungu) parts.push(p.addr_sigungu);
  if (parts.length === 0 && p.address) return p.address;
  return parts.join(' ') || '-';
}

// ═══ 진료 영역 ═══
const TREATMENT_AREAS = {
  implant: '임플란트',
  orthodontics: '치아교정',
  cosmetic: '심미치료',
  general: '일반진료',
  pediatric: '소아치료',
  scaling: '스케일링',
  denture: '틀니',
  etc: '기타'
};
const AREA_COLORS = {
  implant: '#3b82f6', orthodontics: '#8b5cf6', cosmetic: '#ec4899',
  general: '#6b7280', pediatric: '#f59e0b', scaling: '#22c55e',
  denture: '#0ea5e9', etc: '#94a3b8'
};

// ═══ 내원 경로 (consult.js 와 동일 체계) ═══
const VISIT_SOURCES = {
  ref_patient: '👥 환자 소개', ref_acquaintance: '🤝 지인 소개',
  ref_staff: '👩‍⚕️ 직원 소개', ref_doctor: '👨‍⚕️ 원장 소개',
  online_search: '🔍 검색', online_naver: '🟢 네이버',
  online_blog: '📝 블로그', online_insta: '📸 인스타그램',
  online_youtube: '🔴 유튜브', online_homepage: '🌐 홈페이지',
  online_homepage_db: '📊 홈페이지(DB)', online_cafe: '☕ 네이버카페',
  online_daangn: '🥕 당근마켓', online_ad: '📢 광고', online_etc: '💻 기타 온라인',
  walk_sign: '🚶 간판보고', walk_near: '📍 가까워서'
};
const SOURCE_GROUPS = {
  ref_patient:'소개', ref_acquaintance:'소개', ref_staff:'소개', ref_doctor:'소개',
  online_search:'온라인', online_naver:'온라인', online_blog:'온라인', online_insta:'온라인',
  online_youtube:'온라인', online_homepage:'온라인', online_homepage_db:'온라인',
  online_cafe:'온라인', online_daangn:'온라인', online_ad:'온라인', online_etc:'온라인',
  walk_sign:'그냥', walk_near:'그냥'
};
const SOURCE_GROUP_COLORS = { '소개':'#22c55e', '온라인':'#3b82f6', '그냥':'#f59e0b', '미입력':'#cbd5e1' };

function fmtDate(d) { return d ? d.replace(/-/g,'.') : '-'; }

// ═══ 환자 목록 메인 렌더링 ═══
async function renderPatients(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  
  actions.innerHTML = `
    ${isManager ? '<button class="btn btn-primary btn-sm" id="addPatientBtn">➕ 환자 등록</button>' : ''}
    <button class="btn btn-sm" id="patientStatsBtn" style="margin-left:6px">📊 통계</button>
  `;
  
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  // 스태프 프리셋 로드
  let staffData = null;
  try { staffData = await api('/api/protected/consult-records/staff'); } catch(e) {}
  
  // 필터 상태
  let filters = { search: '', type: '', source: '', doctor: '', counselor: '', area: '', sido: '', status: 'active' };
  let sortKey = 'created_at', sortDir = -1;
  let page = 0, pageSize = 50, total = 0;
  
  async function loadPatients() {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.source) params.set('source', filters.source);
    if (filters.doctor) params.set('doctor', filters.doctor);
    if (filters.counselor) params.set('counselor', filters.counselor);
    if (filters.area) params.set('area', filters.area);
    if (filters.sido) params.set('sido', filters.sido);
    if (filters.status) params.set('status', filters.status);
    params.set('limit', String(pageSize));
    params.set('offset', String(page * pageSize));
    
    const data = await api(`/api/protected/patients?${params}`);
    total = data.total || 0;
    renderPatientList(data.patients || [], total);
  }
  
  function renderPatientList(patients, totalCount) {
    const doctors = staffData?.doctors || [];
    const counselors = staffData?.counselors || [];
    const desk = staffData?.desk || [];
    
    // 클라이언트 정렬
    const sorted = [...patients].sort((a,b) => {
      let va = a[sortKey] || '', vb = b[sortKey] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    
    const totalPages = Math.ceil(totalCount / pageSize);
    const activeFilters = Object.entries(filters).filter(([k,v]) => v && k !== 'status');
    
    body.innerHTML = `
      <div style="margin-bottom:16px">
        <!-- 검색 + 필터 바 -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <div style="flex:1;min-width:200px;position:relative">
            <input type="text" id="ptSearch" placeholder="🔍 이름, 차트번호, 연락처 검색..." 
              value="${esc(filters.search)}"
              style="width:100%;padding:10px 12px 10px 36px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg-card)">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:0.4;font-size:14px">🔍</span>
          </div>
          <button class="btn btn-sm" id="ptFilterToggle" style="white-space:nowrap">
            🎛️ 필터 ${activeFilters.length > 0 ? `<span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">${activeFilters.length}</span>` : ''}
          </button>
          <select id="ptStatusFilter" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">
            <option value="active" ${filters.status==='active'?'selected':''}>활성 환자</option>
            <option value="" ${!filters.status?'selected':''}>전체</option>
            <option value="inactive" ${filters.status==='inactive'?'selected':''}>비활성</option>
            <option value="lost" ${filters.status==='lost'?'selected':''}>이탈</option>
          </select>
        </div>
        
        <!-- 필터 패널 (접이식) -->
        <div id="ptFilterPanel" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">환자 구분</label>
              <select id="ptFilterType" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px">
                <option value="">전체</option>
                <option value="new" ${filters.type==='new'?'selected':''}>신환</option>
                <option value="existing" ${filters.type==='existing'?'selected':''}>구환</option>
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">진료 영역</label>
              <select id="ptFilterArea" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px">
                <option value="">전체</option>
                ${Object.entries(TREATMENT_AREAS).map(([k,v]) => `<option value="${k}" ${filters.area===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">내원 경로</label>
              <select id="ptFilterSource" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px">
                <option value="">전체</option>
                ${Object.entries(VISIT_SOURCES).map(([k,v]) => `<option value="${k}" ${filters.source===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">담당 상담의</label>
              <select id="ptFilterDoctor" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px">
                <option value="">전체</option>
                ${doctors.map(d => `<option value="${esc(d)}" ${filters.doctor===d?'selected':''}>${esc(d)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">담당 상담사</label>
              <select id="ptFilterCounselor" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px">
                <option value="">전체</option>
                ${counselors.map(c => `<option value="${esc(c)}" ${filters.counselor===c?'selected':''}>${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">📍 지역 (시/도)</label>
              <select id="ptFilterSido" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px">
                <option value="">전체</option>
                ${SIDO_LIST.map(s => `<option value="${esc(s)}" ${filters.sido===s?'selected':''}>${esc(shortSido(s))}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
            <button class="btn btn-sm" id="ptFilterClear">초기화</button>
            <button class="btn btn-primary btn-sm" id="ptFilterApply">적용</button>
          </div>
        </div>
        
        <!-- 활성 필터 칩 -->
        ${activeFilters.length > 0 ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${activeFilters.map(([k,v]) => {
            let label = '';
            if (k === 'search') label = `검색: "${esc(v)}"`;
            else if (k === 'type') label = v === 'new' ? '신환' : '구환';
            else if (k === 'source') label = VISIT_SOURCES[v] || v;
            else if (k === 'doctor') label = `상담의: ${esc(v)}`;
            else if (k === 'counselor') label = `상담사: ${esc(v)}`;
            else if (k === 'area') label = TREATMENT_AREAS[v] || v;
            else if (k === 'sido') label = `지역: ${shortSido(v)}`;
            return `<span class="badge" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;background:var(--primary-light);color:var(--primary);cursor:pointer" data-clear="${k}">
              ${label} <span style="font-weight:700">&times;</span>
            </span>`;
          }).join('')}
        </div>` : ''}
        
        <!-- 요약 바 -->
        <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px">
          <span>총 <strong style="color:var(--text)">${totalCount.toLocaleString()}</strong>명</span>
          <span>페이지 ${page+1}/${Math.max(totalPages,1)}</span>
        </div>
      </div>
      
      <!-- 환자 테이블 -->
      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1000px">
          <thead>
            <tr style="background:var(--bg);border-bottom:2px solid var(--border)">
              ${renderSortHeader('patient_name', '환자명')}
              ${renderSortHeader('chart_number', '차트번호')}
              ${renderSortHeader('patient_type', '구분')}
              ${renderSortHeader('phone', '연락처')}
              ${renderSortHeader('treatment_area', '진료영역')}
              ${renderSortHeader('visit_source', '내원경로')}
              ${renderSortHeader('addr_sido', '지역')}
              ${renderSortHeader('primary_doctor', '상담의')}
              ${renderSortHeader('assigned_counselor', '상담사')}
              ${renderSortHeader('desk_staff', '데스크')}
              ${renderSortHeader('first_visit_date', '최초내원')}
              ${renderSortHeader('visit_count', '내원횟수')}
              ${renderSortHeader('visit_reason', '방문이유')}
            </tr>
          </thead>
          <tbody>
            ${sorted.length === 0 ? `<tr><td colspan="13" style="padding:40px;text-align:center;color:var(--text-muted)">등록된 환자가 없습니다</td></tr>` : ''}
            ${sorted.map(p => {
              const typeColor = p.patient_type === 'new' ? '#3b82f6' : '#22c55e';
              const typeLabel = p.patient_type === 'new' ? '신환' : '구환';
              const areaLabel = TREATMENT_AREAS[p.treatment_area] || p.treatment_area || '-';
              const areaColor = AREA_COLORS[p.treatment_area] || '#94a3b8';
              const sourceLabel = VISIT_SOURCES[p.visit_source] || p.visit_source || '-';
              const sourceGroup = SOURCE_GROUPS[p.visit_source] || '미입력';
              const sgColor = SOURCE_GROUP_COLORS[sourceGroup] || '#cbd5e1';
              const addrShort = fmtAddrShort(p);
              return `<tr class="pt-row" data-id="${p.id}" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
                <td style="padding:10px 12px;font-weight:700">${esc(p.patient_name)}</td>
                <td style="padding:10px 8px;color:var(--text-muted);font-size:11px">${esc(p.chart_number||'-')}</td>
                <td style="padding:10px 8px"><span style="background:${typeColor}15;color:${typeColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${typeLabel}</span></td>
                <td style="padding:10px 8px;font-size:11px;color:var(--text-muted)">${esc(p.phone||'-')}</td>
                <td style="padding:10px 8px"><span style="background:${areaColor}20;color:${areaColor};padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600">${esc(areaLabel)}</span></td>
                <td style="padding:10px 8px;font-size:11px"><span style="border-left:3px solid ${sgColor};padding-left:6px">${esc(sourceLabel)}</span></td>
                <td style="padding:10px 8px;font-size:11px;color:var(--text-muted)">${esc(addrShort)}</td>
                <td style="padding:10px 8px;font-size:11px">${esc(p.primary_doctor||'-')}</td>
                <td style="padding:10px 8px;font-size:11px">${esc(p.assigned_counselor||'-')}</td>
                <td style="padding:10px 8px;font-size:11px">${esc(p.desk_staff||'-')}</td>
                <td style="padding:10px 8px;font-size:11px;color:var(--text-muted)">${fmtDate(p.first_visit_date)}</td>
                <td style="padding:10px 8px;text-align:center;font-size:11px">${p.visit_count||1}</td>
                <td style="padding:10px 8px;font-size:11px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.visit_reason||'-')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- 페이지네이션 -->
      ${totalPages > 1 ? `
      <div style="display:flex;justify-content:center;gap:4px;margin-top:16px;flex-wrap:wrap">
        <button class="btn btn-sm" id="ptPagePrev" ${page===0?'disabled':''} style="font-size:12px">◀ 이전</button>
        ${Array.from({length: Math.min(totalPages, 10)}, (_, i) => {
          const pg = totalPages <= 10 ? i : Math.max(0, Math.min(page - 4, totalPages - 10)) + i;
          return `<button class="btn btn-sm pt-page-btn" data-page="${pg}" style="font-size:12px;${pg===page?'background:var(--primary);color:#fff':''}">${pg+1}</button>`;
        }).join('')}
        <button class="btn btn-sm" id="ptPageNext" ${page>=totalPages-1?'disabled':''} style="font-size:12px">다음 ▶</button>
      </div>` : ''}
    `;
    
    // 이벤트 바인딩
    bindEvents();
  }
  
  function renderSortHeader(key, label) {
    const arrow = sortKey === key ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
    return `<th class="pt-sort" data-sort="${key}" style="padding:10px 8px;text-align:left;cursor:pointer;user-select:none;white-space:nowrap;font-weight:700;font-size:11px;color:var(--text-muted)">${label}${arrow}</th>`;
  }
  
  let searchTimeout = null;
  function bindEvents() {
    // 검색
    const searchEl = document.getElementById('ptSearch');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          filters.search = e.target.value.trim();
          page = 0;
          loadPatients();
        }, 300);
      });
    }
    
    // 필터 토글
    document.getElementById('ptFilterToggle')?.addEventListener('click', () => {
      const panel = document.getElementById('ptFilterPanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    
    // 상태 필터
    document.getElementById('ptStatusFilter')?.addEventListener('change', (e) => {
      filters.status = e.target.value;
      page = 0;
      loadPatients();
    });
    
    // 필터 적용
    document.getElementById('ptFilterApply')?.addEventListener('click', () => {
      filters.type = document.getElementById('ptFilterType')?.value || '';
      filters.area = document.getElementById('ptFilterArea')?.value || '';
      filters.source = document.getElementById('ptFilterSource')?.value || '';
      filters.doctor = document.getElementById('ptFilterDoctor')?.value || '';
      filters.counselor = document.getElementById('ptFilterCounselor')?.value || '';
      filters.sido = document.getElementById('ptFilterSido')?.value || '';
      page = 0;
      loadPatients();
    });
    
    // 필터 초기화
    document.getElementById('ptFilterClear')?.addEventListener('click', () => {
      filters = { search: '', type: '', source: '', doctor: '', counselor: '', area: '', sido: '', status: filters.status };
      page = 0;
      loadPatients();
    });
    
    // 필터 칩 삭제
    document.querySelectorAll('[data-clear]').forEach(chip => {
      chip.addEventListener('click', () => {
        filters[chip.dataset.clear] = '';
        page = 0;
        loadPatients();
      });
    });
    
    // 정렬
    document.querySelectorAll('.pt-sort').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = -1; }
        loadPatients();
      });
    });
    
    // 행 클릭 -> 상세
    document.querySelectorAll('.pt-row').forEach(row => {
      row.addEventListener('click', () => openPatientDetail(row.dataset.id, staffData, loadPatients));
    });
    
    // 페이지네이션
    document.getElementById('ptPagePrev')?.addEventListener('click', () => { if (page > 0) { page--; loadPatients(); } });
    document.getElementById('ptPageNext')?.addEventListener('click', () => { page++; loadPatients(); });
    document.querySelectorAll('.pt-page-btn').forEach(btn => {
      btn.addEventListener('click', () => { page = parseInt(btn.dataset.page); loadPatients(); });
    });
    
    // 검색 포커스
    if (filters.search && searchEl) {
      searchEl.focus();
      searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length);
    }
  }
  
  await loadPatients();
  
  // 환자 등록 버튼
  document.getElementById('addPatientBtn')?.addEventListener('click', () => {
    openPatientForm(null, staffData, loadPatients);
  });
  
  // 통계 버튼
  document.getElementById('patientStatsBtn')?.addEventListener('click', () => {
    openPatientStats();
  });
}

// ═══ 환자 등록/수정 폼 ═══
function openPatientForm(patient, staffData, onSave) {
  const p = patient || {};
  const isEdit = !!patient;
  const doctors = staffData?.doctors || [];
  const counselors = staffData?.counselors || [];
  const desk = staffData?.desk || [];
  
  function opt(list, selected) {
    return list.map(name => `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('');
  }
  
  const cs = `background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 16px;margin-bottom:12px`;
  const ls = `font-size:11px;font-weight:700;display:block;margin-bottom:5px;color:var(--text-muted);letter-spacing:0.3px`;
  const is = `width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);transition:border-color 0.2s;outline:none;box-sizing:border-box`;
  const ss = is + `;appearance:auto`;
  
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '600px';
  mc.innerHTML = `
    <div style="padding:4px 2px;max-height:85vh;overflow-y:auto">
      <h3 style="margin:0 0 20px;font-size:20px;font-weight:900;display:flex;align-items:center;gap:8px">
        ${isEdit ? '✏️ 환자 정보 수정' : '👤 새 환자 등록'}
      </h3>
      <form id="ptForm" style="display:flex;flex-direction:column;gap:0">
        
        <!-- 기본 정보 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#3b82f6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">기본</span> 환자 기본 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">👤 환자 성함 <span style="color:#ef4444">*</span></label>
              <input type="text" name="patient_name" value="${esc(p.patient_name||'')}" required placeholder="환자명" style="${is};font-weight:700">
            </div>
            <div>
              <label style="${ls}">📋 차트번호</label>
              <input type="text" name="chart_number" value="${esc(p.chart_number||'')}" placeholder="예: 741003" style="${is}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">📞 연락처</label>
              <input type="tel" name="phone" value="${esc(p.phone||'')}" placeholder="010-0000-0000" style="${is}">
            </div>
            <div>
              <label style="${ls}">🎂 생년월일</label>
              <input type="date" name="birth_date" value="${p.birth_date||''}" style="${is}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="${ls}">⚧ 성별</label>
              <select name="gender" style="${ss}">
                <option value="" ${!p.gender?'selected':''}>선택안함</option>
                <option value="male" ${p.gender==='male'?'selected':''}>남성</option>
                <option value="female" ${p.gender==='female'?'selected':''}>여성</option>
              </select>
            </div>
            <div>
              <label style="${ls}">🏷️ 환자 구분 <span style="color:#ef4444">*</span></label>
              <select name="patient_type" style="${ss};font-weight:700;${!isEdit?'border-color:#3b82f6':''}">
                <option value="new" ${(p.patient_type||'new')==='new'?'selected':''}>🔵 신환</option>
                <option value="existing" ${p.patient_type==='existing'?'selected':''}>🟢 구환</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 내원 정보 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#22c55e;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">내원</span> 내원 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">📅 최초 내원일</label>
              <input type="date" name="first_visit_date" value="${p.first_visit_date || new Date().toISOString().slice(0,10)}" style="${is}">
            </div>
            <div>
              <label style="${ls}">📅 최근 내원일</label>
              <input type="date" name="last_visit_date" value="${p.last_visit_date || ''}" style="${is}">
            </div>
          </div>
          <div style="margin-bottom:12px">
            <label style="${ls}">🛤️ 내원 경로 <span style="color:#ef4444">*</span></label>
            <select name="visit_source" style="${ss};border-color:${p.visit_source ? 'var(--border)' : '#f59e0b'};font-weight:600">
              <option value="">-- 내원 경로 선택 --</option>
              <optgroup label="👥 소개">
                ${['ref_patient','ref_acquaintance','ref_staff','ref_doctor'].map(k => `<option value="${k}" ${p.visit_source===k?'selected':''}>${VISIT_SOURCES[k]}</option>`).join('')}
              </optgroup>
              <optgroup label="💻 온라인">
                ${['online_search','online_naver','online_blog','online_insta','online_youtube','online_homepage','online_homepage_db','online_cafe','online_daangn','online_ad','online_etc'].map(k => `<option value="${k}" ${p.visit_source===k?'selected':''}>${VISIT_SOURCES[k]}</option>`).join('')}
              </optgroup>
              <optgroup label="🚶 기타">
                ${['walk_sign','walk_near'].map(k => `<option value="${k}" ${p.visit_source===k?'selected':''}>${VISIT_SOURCES[k]}</option>`).join('')}
              </optgroup>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">📝 경로 상세</label>
              <input type="text" name="visit_source_detail" value="${esc(p.visit_source_detail||'')}" placeholder="예: 네이버 '강남 임플란트'" style="${is}">
            </div>
            <div>
              <label style="${ls}">👥 소개자명</label>
              <input type="text" name="referrer_name" value="${esc(p.referrer_name||'')}" placeholder="소개해준 분 성함" style="${is}">
            </div>
          </div>
          <div>
            <label style="${ls}">💬 방문 이유 (Chief Complaint)</label>
            <input type="text" name="visit_reason" value="${esc(p.visit_reason||'')}" placeholder="예: 앞니 깨짐, 임플란트 상담, 정기검진..." style="${is}">
          </div>
        </div>
        
        <!-- 주소지 정보 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#f59e0b;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">지역</span> 주소지 정보
          </div>
          ${renderAddressSelector('ptAddr', p.addr_sido||'', p.addr_sigungu||'', p.addr_detail||'', {ls, ss, is})}
        </div>
        
        <!-- 진료 배정 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#8b5cf6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">진료</span> 진료 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">🏥 진료 영역</label>
              <select name="treatment_area" style="${ss}">
                <option value="">선택</option>
                ${Object.entries(TREATMENT_AREAS).map(([k,v]) => `<option value="${k}" ${p.treatment_area===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="${ls}">🩺 담당 상담의</label>
              <select name="primary_doctor" style="${ss}">
                <option value="">선택</option>${opt(doctors, p.primary_doctor)}
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">👩‍⚕️ 담당 상담사</label>
              <select name="assigned_counselor" style="${ss}">
                <option value="">선택</option>${opt(counselors, p.assigned_counselor)}
              </select>
            </div>
            <div>
              <label style="${ls}">🖥️ 데스크</label>
              <select name="desk_staff" style="${ss}">
                <option value="">선택</option>${opt(desk, p.desk_staff)}
              </select>
            </div>
          </div>
        </div>
        
        <!-- 추가 정보 -->
        <div style="${cs}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#06b6d4;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">기타</span> 추가 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${ls}">💛 카카오 등록</label>
              <select name="kakao_registered" style="${ss}">
                <option value="" ${!p.kakao_registered?'selected':''}>-</option>
                <option value="O" ${p.kakao_registered==='O'?'selected':''}>O 등록</option>
                <option value="X" ${p.kakao_registered==='X'?'selected':''}>X 미등록</option>
              </select>
            </div>
          </div>
          <div>
            <label style="${ls}">📝 메모</label>
            <textarea name="memo" rows="2" placeholder="특이사항 메모" style="${is};resize:vertical">${esc(p.memo||'')}</textarea>
          </div>
        </div>
        
        <!-- 버튼 -->
        <div style="display:flex;gap:8px;margin-top:4px;padding:0 2px">
          <button type="submit" class="btn btn-primary" style="flex:1;padding:14px;font-weight:800;font-size:15px;border-radius:12px">
            ${isEdit ? '✅ 수정 저장' : '👤 환자 등록'}
          </button>
          ${isEdit ? '<button type="button" id="ptDelete" class="btn" style="padding:14px;color:#ef4444;font-weight:700;border-radius:12px;border:1px solid #fecaca">삭제</button>' : ''}
          <button type="button" onclick="PFM.closeModal()" class="btn" style="padding:14px;border-radius:12px">취소</button>
        </div>
      </form>
    </div>
  `;
  
  // 주소 캐스케이드 바인딩
  bindAddressCascade('ptAddr');
  
  // 폼 제출
  const form = document.getElementById('ptForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k,v] of fd.entries()) data[k] = v;
    // 레거시 address 필드도 합성해서 저장
    const addrParts = [];
    if (data.addr_sido) addrParts.push(data.addr_sido);
    if (data.addr_sigungu) addrParts.push(data.addr_sigungu);
    if (data.addr_detail) addrParts.push(data.addr_detail);
    data.address = addrParts.join(' ');
    
    try {
      if (isEdit) {
        await api(`/api/protected/patients/${p.id}`, { method: 'PUT', body: JSON.stringify(data) });
        toast('✅ 환자 정보 수정 완료');
      } else {
        await api('/api/protected/patients', { method: 'POST', body: JSON.stringify(data) });
        toast('✅ 환자 등록 완료');
      }
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
  
  // 삭제
  document.getElementById('ptDelete')?.addEventListener('click', async () => {
    if (!confirm('이 환자를 비활성화 하시겠습니까?\n(데이터는 삭제되지 않고 비활성 처리됩니다)')) return;
    try {
      await api(`/api/protected/patients/${p.id}`, { method: 'DELETE' });
      toast('🗑️ 환자 비활성화 완료');
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 실패', 'error'); }
  });
}

// ═══ 환자 상세 보기 ═══
async function openPatientDetail(patientId, staffData, onUpdate) {
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '640px';
  mc.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  try {
    const p = await api(`/api/protected/patients/${patientId}`);
    const isManager = ['admin','manager'].includes(state.user.role);
    const typeLabel = p.patient_type === 'new' ? '🔵 신환' : '🟢 구환';
    const areaLabel = TREATMENT_AREAS[p.treatment_area] || p.treatment_area || '-';
    const sourceLabel = VISIT_SOURCES[p.visit_source] || p.visit_source || '-';
    const addrFull = fmtAddr(p);
    const consults = p.consult_history || [];
    
    mc.innerHTML = `
      <div style="padding:4px 2px;max-height:85vh;overflow-y:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0;font-size:20px;font-weight:900">
            👤 ${esc(p.patient_name)}
            <span style="font-size:13px;font-weight:600;margin-left:8px;opacity:0.7">${typeLabel}</span>
          </h3>
          ${isManager ? `<button class="btn btn-sm btn-primary" id="ptEditBtn">✏️ 수정</button>` : ''}
        </div>
        
        <!-- 기본 정보 -->
        <div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:12px">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;font-size:12px">
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">차트번호</span><strong>${esc(p.chart_number||'-')}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">연락처</span><strong>${esc(p.phone||'-')}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">생년월일</span><strong>${fmtDate(p.birth_date)||'-'}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">성별</span><strong>${p.gender==='male'?'남성':p.gender==='female'?'여성':'-'}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">진료 영역</span><strong>${esc(areaLabel)}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">내원 경로</span><strong>${esc(sourceLabel)}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">📍 주소지</span><strong>${esc(addrFull)}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">상담의</span><strong>${esc(p.primary_doctor||'-')}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">상담사</span><strong>${esc(p.assigned_counselor||'-')}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">데스크</span><strong>${esc(p.desk_staff||'-')}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">최초내원</span><strong>${fmtDate(p.first_visit_date)}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">최근내원</span><strong>${fmtDate(p.last_visit_date)}</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">내원횟수</span><strong>${p.visit_count||1}회</strong></div>
            <div><span style="color:var(--text-muted);display:block;font-size:10px;margin-bottom:2px">카카오</span><strong>${p.kakao_registered||'-'}</strong></div>
          </div>
          ${p.visit_reason ? `<div style="margin-top:12px;font-size:12px"><span style="color:var(--text-muted);font-size:10px">방문 이유</span><br><strong>${esc(p.visit_reason)}</strong></div>` : ''}
          ${p.referrer_name ? `<div style="margin-top:8px;font-size:12px"><span style="color:var(--text-muted);font-size:10px">소개자</span><br><strong>${esc(p.referrer_name)}</strong></div>` : ''}
          ${p.memo ? `<div style="margin-top:8px;font-size:12px"><span style="color:var(--text-muted);font-size:10px">메모</span><br>${esc(p.memo)}</div>` : ''}
        </div>
        
        <!-- 상담 이력 -->
        <div style="margin-bottom:12px">
          <h4 style="font-size:14px;font-weight:800;margin:0 0 10px;display:flex;align-items:center;gap:6px">
            📋 상담 이력 <span style="font-size:11px;font-weight:500;color:var(--text-muted)">${consults.length}건</span>
          </h4>
          ${consults.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">상담 이력 없음</div>' : `
          <div style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead><tr style="background:var(--bg);border-bottom:1px solid var(--border)">
                <th style="padding:8px;text-align:left">날짜</th>
                <th style="padding:8px;text-align:left">상담의</th>
                <th style="padding:8px;text-align:left">상담사</th>
                <th style="padding:8px;text-align:right">비용계획</th>
                <th style="padding:8px;text-align:center">확정</th>
              </tr></thead>
              <tbody>
                ${consults.map(c => `<tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:6px 8px">${fmtDate(c.record_date)}</td>
                  <td style="padding:6px 8px">${esc(c.doctor_name||'-')}</td>
                  <td style="padding:6px 8px">${esc(c.counselor_name||'-')}</td>
                  <td style="padding:6px 8px;text-align:right">${c.planned_amount ? (c.planned_amount/10000).toLocaleString()+'만' : '-'}</td>
                  <td style="padding:6px 8px;text-align:center">${c.treatment_confirmed==='O'?'<span style="color:#22c55e;font-weight:700">O</span>':c.treatment_confirmed==='X'?'<span style="color:#ef4444">X</span>':'-'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
        
        <div style="display:flex;gap:8px;margin-top:8px">
          <button onclick="PFM.closeModal()" class="btn" style="flex:1;padding:12px;border-radius:12px">닫기</button>
        </div>
      </div>
    `;
    
    document.getElementById('ptEditBtn')?.addEventListener('click', () => {
      closeModal();
      setTimeout(() => openPatientForm(p, staffData, onUpdate), 150);
    });
    
  } catch(e) {
    mc.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">환자 정보를 불러올 수 없습니다</div>`;
  }
}

// ═══ 환자 통계 팝업 ═══
async function openPatientStats() {
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '500px';
  mc.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  try {
    const stats = await api('/api/protected/patients/stats/summary');
    
    mc.innerHTML = `
      <div style="padding:4px 2px">
        <h3 style="margin:0 0 20px;font-size:18px;font-weight:900">📊 환자 통계</h3>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">전체 활성 환자</div>
            <div style="font-size:28px;font-weight:900;color:var(--primary)">${stats.totalActive.toLocaleString()}</div>
          </div>
          <div style="background:var(--bg);border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">이번달 신환</div>
            <div style="font-size:28px;font-weight:900;color:#3b82f6">${stats.newThisMonth.toLocaleString()}</div>
          </div>
        </div>
        
        ${stats.bySource.length > 0 ? `
        <div style="margin-bottom:16px">
          <h4 style="font-size:13px;font-weight:700;margin:0 0 8px">내원 경로별</h4>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${stats.bySource.slice(0,8).map(s => {
              const label = VISIT_SOURCES[s.visit_source] || s.visit_source || '미입력';
              const pct = stats.totalActive > 0 ? Math.round(s.c / stats.totalActive * 100) : 0;
              const group = SOURCE_GROUPS[s.visit_source] || '미입력';
              const color = SOURCE_GROUP_COLORS[group] || '#cbd5e1';
              return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
                <span style="width:4px;height:20px;border-radius:2px;background:${color}"></span>
                <span style="flex:1">${esc(label)}</span>
                <strong>${s.c}명</strong>
                <span style="color:var(--text-muted);width:40px;text-align:right">${pct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        
        ${stats.byArea.length > 0 ? `
        <div>
          <h4 style="font-size:13px;font-weight:700;margin:0 0 8px">진료 영역별</h4>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${stats.byArea.slice(0,8).map(a => {
              const label = TREATMENT_AREAS[a.treatment_area] || a.treatment_area || '미입력';
              const color = AREA_COLORS[a.treatment_area] || '#94a3b8';
              return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
                <span style="width:4px;height:20px;border-radius:2px;background:${color}"></span>
                <span style="flex:1">${esc(label)}</span>
                <strong>${a.c}명</strong>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        
        <button onclick="PFM.closeModal()" class="btn" style="width:100%;padding:12px;border-radius:12px;margin-top:16px">닫기</button>
      </div>
    `;
  } catch(e) {
    mc.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">통계를 불러올 수 없습니다</div>';
  }
}

// ═══ 모듈 등록 ═══
PFM.modules.patients = { renderPatients, openPatientForm, openPatientDetail };

})(window.PFM);
