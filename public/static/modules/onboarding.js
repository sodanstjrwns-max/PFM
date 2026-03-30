/* ═══ Module: Onboarding Wizard ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, esc, toast } = PFM;

const STEPS = [
  { id: 'welcome',     title: '환영합니다!',     icon: '🎉', desc: '병원 초기 설정을 안내해 드립니다' },
  { id: 'specialties', title: '핵심 진료과목',    icon: '🦷', desc: '우리 병원의 주력 진료를 선택하세요' },
  { id: 'region',      title: '핵심 지역 / 타겟', icon: '📍', desc: '환자가 주로 유입되는 지역을 설정하세요' },
  { id: 'hours',       title: '운영시간 설정',    icon: '⏰', desc: '진료시간과 휴무일을 설정하세요' },
  { id: 'floors',      title: '공간 구성',        icon: '🏢', desc: '층별 진료실과 체어를 등록하세요' },
  { id: 'staff',       title: '직원 구성',        icon: '👥', desc: '직원 규모와 구성을 입력하세요' },
];

const SPECIALTIES = [
  { id: 'implant',     label: '임플란트',       icon: '🔩' },
  { id: 'ortho',       label: '교정',           icon: '😁' },
  { id: 'prosth',      label: '보철',           icon: '👑' },
  { id: 'endo',        label: '신경치료',       icon: '🔬' },
  { id: 'perio',       label: '잇몸치료',       icon: '🩺' },
  { id: 'esthetic',    label: '심미/미백',      icon: '✨' },
  { id: 'pedo',        label: '소아치과',       icon: '👶' },
  { id: 'oral_surgery',label: '구강외과/발치',  icon: '⚡' },
  { id: 'general',     label: '일반진료/검진',  icon: '🦷' },
  { id: 'tmj',         label: 'TMJ/턱관절',     icon: '🫠' },
  { id: 'preventive',  label: '예방치료',       icon: '🪥' },
  { id: 'geriatric',   label: '노인치과',       icon: '👴' },
];

const REGIONS = [
  '강남구','서초구','송파구','강동구','마포구','용산구','성동구','광진구',
  '종로구','중구','영등포구','강서구','구로구','관악구','동작구','양천구',
  '서대문구','은평구','노원구','도봉구','강북구','성북구','중랑구','동대문구','금천구',
  '경기 남부','경기 북부','인천','부산','대구','대전','광주','울산','세종','제주','기타지역'
];

const PATIENT_TARGETS = [
  { id: 'family',    label: '가족 단위',    icon: '👨‍👩‍👧‍👦' },
  { id: 'office',    label: '직장인',       icon: '💼' },
  { id: 'senior',    label: '시니어(60+)',  icon: '👴' },
  { id: 'youth',     label: '20~30대',     icon: '🧑' },
  { id: 'children',  label: '어린이',       icon: '👶' },
  { id: 'premium',   label: '프리미엄',     icon: '💎' },
  { id: 'implant_focused', label: '임플란트 집중', icon: '🔩' },
  { id: 'ortho_focused',   label: '교정 집중',     icon: '😁' },
];

const SPACE_TYPES = [
  { id: 'treatment',     label: '진료실',   icon: '🦷', hasChairs: true },
  { id: 'surgery',       label: '수술실',   icon: '🔬', hasChairs: true },
  { id: 'orthodontics',  label: '교정실',   icon: '😁', hasChairs: true },
  { id: 'consult',       label: '상담실',   icon: '💬', hasChairs: false },
  { id: 'xray',          label: '촬영실',   icon: '📷', hasChairs: false },
  { id: 'waiting',       label: '대기실',   icon: '🪑', hasChairs: false },
  { id: 'sterilization', label: '소독실',   icon: '🧹', hasChairs: false },
  { id: 'office',        label: '사무실',   icon: '🖥️', hasChairs: false },
  { id: 'storage',       label: '창고',     icon: '📦', hasChairs: false },
];

const STAFF_ROLES = [
  { id: 'doctor',         label: '원장/의사',   icon: '👨‍⚕️' },
  { id: 'hygienist',      label: '치과위생사',  icon: '🦷' },
  { id: 'assistant',      label: '치과조무사',  icon: '🤲' },
  { id: 'coordinator',    label: '상담실장',    icon: '💬' },
  { id: 'desk',           label: '데스크/접수',  icon: '🖥️' },
  { id: 'sterilization',  label: '소독팀',      icon: '🧹' },
  { id: 'management',     label: '사무/경영',   icon: '📊' },
];

const DAYS = [
  { key: 'weekday', label: '평일(월~금)', days: '월화수목금' },
  { key: 'saturday', label: '토요일', days: '토' },
  { key: 'sunday', label: '일요일', days: '일' },
];

let currentStep = 0;
let wizardData = {
  specialties: [],
  region: '',
  subRegions: [],
  targetPatients: [],
  operating_hours: {
    weekday: { start: '09:00', end: '19:00', enabled: true },
    saturday: { start: '09:00', end: '14:00', enabled: true },
    sunday: { start: '', end: '', enabled: false },
    lunch: { start: '13:00', end: '14:00', enabled: true },
  },
  floor_map: [
    { name: '1F', description: '', spaces: [] },
  ],
  staffStructure: {},
  totalStaff: 0,
};

async function renderOnboarding(container) {
  container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh"><span class="loading-spinner"></span></div>';
  
  try {
    const status = await api('/api/protected/onboarding/status');
    if (status.data) {
      if (status.data.specialties) wizardData.specialties = status.data.specialties;
      if (status.data.region) wizardData.region = status.data.region;
      if (status.data.subRegions) wizardData.subRegions = status.data.subRegions;
      if (status.data.targetPatients) wizardData.targetPatients = status.data.targetPatients;
      if (status.data.staffStructure) wizardData.staffStructure = status.data.staffStructure;
      if (status.data.totalStaff) wizardData.totalStaff = status.data.totalStaff;
    }
    if (status.settings?.operating_hours) wizardData.operating_hours = status.settings.operating_hours;
    if (status.settings?.floor_map?.length) wizardData.floor_map = status.settings.floor_map;
    currentStep = status.currentStep || 0;
  } catch (e) {
    // Fresh start
  }
  
  renderWizard(container);
}

function renderWizard(container) {
  const step = STEPS[currentStep];
  const progress = Math.round((currentStep / (STEPS.length - 1)) * 100);
  
  container.innerHTML = `
  <div class="ob-wrapper">
    <div class="ob-container">
      <!-- Progress -->
      <div class="ob-progress">
        <div class="ob-progress-bar">
          <div class="ob-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="ob-steps">
          ${STEPS.map((s, i) => `
            <div class="ob-step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}" title="${s.title}">
              ${i < currentStep ? '✓' : i + 1}
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Header -->
      <div class="ob-header">
        <div class="ob-icon">${step.icon}</div>
        <h2 class="ob-title">${step.title}</h2>
        <p class="ob-desc">${step.desc}</p>
      </div>
      
      <!-- Content -->
      <div class="ob-content" id="obContent"></div>
      
      <!-- Actions -->
      <div class="ob-actions">
        ${currentStep > 0 ? `<button class="btn btn-secondary ob-btn" id="obPrev">← 이전</button>` : '<div></div>'}
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ob-skip-btn" id="obSkip" title="나중에 설정에서 수정 가능합니다">건너뛰기</button>
          ${currentStep < STEPS.length - 1 
            ? `<button class="btn btn-primary ob-btn" id="obNext">다음 →</button>` 
            : `<button class="btn btn-primary ob-btn" id="obComplete">🚀 시작하기!</button>`
          }
        </div>
      </div>
      
      <div class="ob-hint">
        💡 모든 항목은 나중에 <strong>설정</strong> 메뉴에서 언제든 수정할 수 있습니다
      </div>
    </div>
  </div>`;
  
  renderStepContent(document.getElementById('obContent'));
  
  document.getElementById('obPrev')?.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; renderWizard(container); }
  });
  
  document.getElementById('obNext')?.addEventListener('click', async () => {
    await saveCurrentStep();
    currentStep++;
    renderWizard(container);
  });
  
  document.getElementById('obComplete')?.addEventListener('click', async () => {
    await saveCurrentStep();
    try {
      await api('/api/protected/onboarding/complete', { method: 'POST', json: {} });
      state.user.onboardingCompleted = true;
      localStorage.setItem('pfm_user', JSON.stringify(state.user));
      toast('온보딩 완료! 환영합니다 🎉', 'success');
      PFM.renderApp();
    } catch (e) {
      toast('오류: ' + e.message, 'error');
    }
  });
  
  document.getElementById('obSkip')?.addEventListener('click', async () => {
    if (confirm('온보딩을 건너뛰시겠습니까?\n\n나중에 설정 메뉴에서 모든 항목을 설정할 수 있습니다.')) {
      try {
        await api('/api/protected/onboarding/skip', { method: 'POST', json: {} });
        state.user.onboardingCompleted = true;
        localStorage.setItem('pfm_user', JSON.stringify(state.user));
        toast('온보딩을 건너뛰었습니다. 설정에서 언제든 수정하세요!', 'info');
        PFM.renderApp();
      } catch (e) {
        toast('오류: ' + e.message, 'error');
      }
    }
  });
}

function renderStepContent(el) {
  if (!el) return;
  switch (currentStep) {
    case 0: renderWelcome(el); break;
    case 1: renderSpecialties(el); break;
    case 2: renderRegion(el); break;
    case 3: renderHours(el); break;
    case 4: renderFloors(el); break;
    case 5: renderStaff(el); break;
  }
}

/* ─── Step 0: Welcome ─── */
function renderWelcome(el) {
  el.innerHTML = `
    <div class="ob-welcome">
      <div class="ob-welcome-hero">
        <div style="font-size:48px;margin-bottom:16px">🏥</div>
        <h3>Patient Funnel Manager에 오신 것을 환영합니다!</h3>
        <p style="color:var(--text-secondary);line-height:1.8;max-width:480px;margin:0 auto">
          지금부터 <strong>${esc(state.user?.hospitalName || '병원')}</strong>에 맞게<br>
          시스템을 설정하겠습니다. <strong>약 3~5분</strong> 정도 소요됩니다.
        </p>
      </div>
      <div class="ob-feature-grid">
        <div class="ob-feature-card">
          <span class="ob-feature-icon">🦷</span>
          <strong>핵심 진료과목</strong>
          <small>주력 진료를 설정합니다</small>
        </div>
        <div class="ob-feature-card">
          <span class="ob-feature-icon">📍</span>
          <strong>핵심 지역</strong>
          <small>환자 유입 지역을 설정합니다</small>
        </div>
        <div class="ob-feature-card">
          <span class="ob-feature-icon">⏰</span>
          <strong>운영시간</strong>
          <small>진료시간을 설정합니다</small>
        </div>
        <div class="ob-feature-card">
          <span class="ob-feature-icon">🏢</span>
          <strong>공간 구성</strong>
          <small>층/진료실/체어를 등록합니다</small>
        </div>
        <div class="ob-feature-card">
          <span class="ob-feature-icon">👥</span>
          <strong>직원 구성</strong>
          <small>직원 규모를 입력합니다</small>
        </div>
        <div class="ob-feature-card">
          <span class="ob-feature-icon">🚀</span>
          <strong>바로 시작!</strong>
          <small>설정 후 바로 사용합니다</small>
        </div>
      </div>
    </div>`;
}

/* ─── Step 1: Specialties ─── */
function renderSpecialties(el) {
  el.innerHTML = `
    <div class="ob-chip-grid">
      ${SPECIALTIES.map(s => `
        <div class="ob-chip ${wizardData.specialties.includes(s.id) ? 'selected' : ''}" data-id="${s.id}">
          <span class="ob-chip-icon">${s.icon}</span>
          <span>${s.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="ob-tip">💡 3~5개 선택을 추천합니다. 상담 스크립트, 비용 안내, 마케팅 분석에 활용됩니다.</div>`;
  
  el.querySelectorAll('.ob-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = chip.dataset.id;
      const idx = wizardData.specialties.indexOf(id);
      if (idx >= 0) { wizardData.specialties.splice(idx, 1); chip.classList.remove('selected'); }
      else { wizardData.specialties.push(id); chip.classList.add('selected'); }
    });
  });
}

/* ─── Step 2: Region ─── */
function renderRegion(el) {
  el.innerHTML = `
    <div class="ob-section">
      <label class="ob-label">주요 환자 유입 지역 (복수 선택)</label>
      <div class="ob-chip-grid ob-chip-sm">
        ${REGIONS.map(r => `
          <div class="ob-chip ob-chip-small ${wizardData.subRegions.includes(r) ? 'selected' : ''}" data-region="${r}">
            <span>${r}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="ob-divider"></div>
    <div class="ob-section">
      <label class="ob-label">타겟 환자층 (복수 선택)</label>
      <div class="ob-chip-grid">
        ${PATIENT_TARGETS.map(t => `
          <div class="ob-chip ${wizardData.targetPatients.includes(t.id) ? 'selected' : ''}" data-target="${t.id}">
            <span class="ob-chip-icon">${t.icon}</span>
            <span>${t.label}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="ob-tip">💡 마케팅 유입 분석, 히트맵, 환자 퍼널 분석에 활용됩니다.</div>`;
  
  el.querySelectorAll('.ob-chip[data-region]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = chip.dataset.region;
      const idx = wizardData.subRegions.indexOf(r);
      if (idx >= 0) { wizardData.subRegions.splice(idx, 1); chip.classList.remove('selected'); }
      else { wizardData.subRegions.push(r); chip.classList.add('selected'); }
    });
  });
  
  el.querySelectorAll('.ob-chip[data-target]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = chip.dataset.target;
      const idx = wizardData.targetPatients.indexOf(t);
      if (idx >= 0) { wizardData.targetPatients.splice(idx, 1); chip.classList.remove('selected'); }
      else { wizardData.targetPatients.push(t); chip.classList.add('selected'); }
    });
  });
}

/* ─── Step 3: Operating Hours ─── */
function renderHours(el) {
  const h = wizardData.operating_hours;
  el.innerHTML = `
    <div class="ob-hours-grid">
      ${DAYS.map(d => {
        const val = h[d.key] || { start: '', end: '', enabled: false };
        return `
        <div class="ob-hours-row">
          <label class="ob-hours-label">
            <input type="checkbox" class="ob-hours-check" data-key="${d.key}" ${val.enabled ? 'checked' : ''}>
            <span><strong>${d.label}</strong> <small style="color:var(--text-muted)">${d.days}</small></span>
          </label>
          <div class="ob-hours-times" data-key="${d.key}" style="${val.enabled ? '' : 'opacity:0.4;pointer-events:none'}">
            <input type="time" class="form-input ob-time-input" data-key="${d.key}" data-type="start" value="${val.start || ''}">
            <span>~</span>
            <input type="time" class="form-input ob-time-input" data-key="${d.key}" data-type="end" value="${val.end || ''}">
          </div>
        </div>`;
      }).join('')}
      <div class="ob-hours-row" style="border-top:2px dashed var(--border);padding-top:12px;margin-top:4px">
        <label class="ob-hours-label">
          <input type="checkbox" class="ob-hours-check" data-key="lunch" ${h.lunch?.enabled ? 'checked' : ''}>
          <span><strong>점심시간</strong></span>
        </label>
        <div class="ob-hours-times" data-key="lunch" style="${h.lunch?.enabled ? '' : 'opacity:0.4;pointer-events:none'}">
          <input type="time" class="form-input ob-time-input" data-key="lunch" data-type="start" value="${h.lunch?.start || '13:00'}">
          <span>~</span>
          <input type="time" class="form-input ob-time-input" data-key="lunch" data-type="end" value="${h.lunch?.end || '14:00'}">
        </div>
      </div>
    </div>
    <div class="ob-tip">💡 진료보드, 예약 관리, 직원 근무 스케줄에 기본값으로 사용됩니다.</div>`;
  
  el.querySelectorAll('.ob-hours-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.key;
      const times = el.querySelector(`.ob-hours-times[data-key="${key}"]`);
      if (times) {
        times.style.opacity = cb.checked ? '1' : '0.4';
        times.style.pointerEvents = cb.checked ? 'auto' : 'none';
      }
      if (!wizardData.operating_hours[key]) wizardData.operating_hours[key] = {};
      wizardData.operating_hours[key].enabled = cb.checked;
    });
  });
  
  el.querySelectorAll('.ob-time-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.key;
      const type = inp.dataset.type;
      if (!wizardData.operating_hours[key]) wizardData.operating_hours[key] = {};
      wizardData.operating_hours[key][type] = inp.value;
    });
  });
}

/* ─── Step 4: Floor/Space Map ─── */
function renderFloors(el) {
  el.innerHTML = `
    <div id="floorList"></div>
    <button class="btn btn-secondary ob-add-btn" id="addFloor">+ 층 추가</button>
    <div class="ob-tip">💡 진료실에 등록된 체어는 진료보드에 자동 연동됩니다.</div>`;
  
  renderFloorList(el.querySelector('#floorList'));
  
  document.getElementById('addFloor').addEventListener('click', () => {
    const nextFloor = wizardData.floor_map.length + 1;
    wizardData.floor_map.push({ name: `${nextFloor}F`, description: '', spaces: [] });
    renderFloorList(el.querySelector('#floorList'));
  });
}

function renderFloorList(container) {
  container.innerHTML = wizardData.floor_map.map((floor, fi) => `
    <div class="ob-floor-card">
      <div class="ob-floor-header">
        <div style="display:flex;gap:8px;align-items:center;flex:1">
          <input type="text" class="form-input ob-floor-name" data-fi="${fi}" value="${esc(floor.name)}" placeholder="층 이름 (예: 2F)" style="width:80px;font-weight:700">
          <input type="text" class="form-input ob-floor-desc" data-fi="${fi}" value="${esc(floor.description || '')}" placeholder="설명 (예: 일반 진료)" style="flex:1">
        </div>
        ${wizardData.floor_map.length > 1 ? `<button class="btn btn-sm ob-floor-del" data-fi="${fi}" title="삭제">✕</button>` : ''}
      </div>
      <div class="ob-space-list" id="spaceList_${fi}">
        ${(floor.spaces || []).map((space, si) => renderSpaceRow(fi, si, space)).join('')}
      </div>
      <button class="btn btn-sm btn-secondary ob-add-space" data-fi="${fi}">+ 공간 추가</button>
    </div>
  `).join('');
  
  // Event listeners
  container.querySelectorAll('.ob-floor-name').forEach(inp => {
    inp.addEventListener('change', () => { wizardData.floor_map[inp.dataset.fi].name = inp.value; });
  });
  container.querySelectorAll('.ob-floor-desc').forEach(inp => {
    inp.addEventListener('change', () => { wizardData.floor_map[inp.dataset.fi].description = inp.value; });
  });
  container.querySelectorAll('.ob-floor-del').forEach(btn => {
    btn.addEventListener('click', () => {
      wizardData.floor_map.splice(parseInt(btn.dataset.fi), 1);
      renderFloorList(container);
    });
  });
  container.querySelectorAll('.ob-add-space').forEach(btn => {
    btn.addEventListener('click', () => {
      const fi = parseInt(btn.dataset.fi);
      if (!wizardData.floor_map[fi].spaces) wizardData.floor_map[fi].spaces = [];
      wizardData.floor_map[fi].spaces.push({ name: '', type: 'treatment', chairs: 0, note: '' });
      renderFloorList(container);
    });
  });
  container.querySelectorAll('.ob-space-type').forEach(sel => {
    sel.addEventListener('change', () => {
      const fi = parseInt(sel.dataset.fi), si = parseInt(sel.dataset.si);
      wizardData.floor_map[fi].spaces[si].type = sel.value;
      const chairInput = container.querySelector(`.ob-space-chairs[data-fi="${fi}"][data-si="${si}"]`);
      const typeInfo = SPACE_TYPES.find(t => t.id === sel.value);
      if (chairInput) {
        chairInput.disabled = !typeInfo?.hasChairs;
        if (!typeInfo?.hasChairs) { chairInput.value = 0; wizardData.floor_map[fi].spaces[si].chairs = 0; }
      }
    });
  });
  container.querySelectorAll('.ob-space-name').forEach(inp => {
    inp.addEventListener('change', () => {
      wizardData.floor_map[inp.dataset.fi].spaces[inp.dataset.si].name = inp.value;
    });
  });
  container.querySelectorAll('.ob-space-chairs').forEach(inp => {
    inp.addEventListener('change', () => {
      wizardData.floor_map[inp.dataset.fi].spaces[inp.dataset.si].chairs = parseInt(inp.value) || 0;
    });
  });
  container.querySelectorAll('.ob-space-del').forEach(btn => {
    btn.addEventListener('click', () => {
      wizardData.floor_map[btn.dataset.fi].spaces.splice(parseInt(btn.dataset.si), 1);
      renderFloorList(container);
    });
  });
}

function renderSpaceRow(fi, si, space) {
  const typeInfo = SPACE_TYPES.find(t => t.id === space.type);
  return `
    <div class="ob-space-row">
      <select class="form-input ob-space-type" data-fi="${fi}" data-si="${si}" style="width:120px">
        ${SPACE_TYPES.map(t => `<option value="${t.id}" ${space.type === t.id ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
      </select>
      <input type="text" class="form-input ob-space-name" data-fi="${fi}" data-si="${si}" value="${esc(space.name || '')}" placeholder="이름 (예: 진료실 A)" style="flex:1">
      <div style="display:flex;align-items:center;gap:4px;width:90px">
        <span style="font-size:11px;white-space:nowrap">체어</span>
        <input type="number" class="form-input ob-space-chairs" data-fi="${fi}" data-si="${si}" value="${space.chairs || 0}" min="0" max="20" style="width:50px;text-align:center" ${typeInfo?.hasChairs ? '' : 'disabled'}>
      </div>
      <button class="btn btn-sm ob-space-del" data-fi="${fi}" data-si="${si}" style="color:var(--danger);padding:4px 8px">✕</button>
    </div>`;
}

/* ─── Step 5: Staff Structure ─── */
function renderStaff(el) {
  el.innerHTML = `
    <div class="ob-staff-grid">
      ${STAFF_ROLES.map(r => {
        const count = wizardData.staffStructure[r.id] || 0;
        return `
        <div class="ob-staff-row">
          <div class="ob-staff-info">
            <span class="ob-staff-icon">${r.icon}</span>
            <span>${r.label}</span>
          </div>
          <div class="ob-counter">
            <button class="ob-counter-btn" data-role="${r.id}" data-dir="-1">−</button>
            <span class="ob-counter-val" id="staffCount_${r.id}">${count}</span>
            <button class="ob-counter-btn" data-role="${r.id}" data-dir="1">+</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="ob-staff-total" id="staffTotal">
      총 직원 수: <strong>${Object.values(wizardData.staffStructure).reduce((a, b) => a + b, 0)}명</strong>
    </div>
    <div class="ob-tip">
      💡 직원 등록은 온보딩 후 <strong>HR → 직원 관리</strong>에서 초대 코드를 발급하여 진행합니다.<br>
      여기서는 전체 규모만 파악합니다.
    </div>`;
  
  el.querySelectorAll('.ob-counter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      const dir = parseInt(btn.dataset.dir);
      const current = wizardData.staffStructure[role] || 0;
      const next = Math.max(0, current + dir);
      wizardData.staffStructure[role] = next;
      document.getElementById('staffCount_' + role).textContent = next;
      const total = Object.values(wizardData.staffStructure).reduce((a, b) => a + b, 0);
      wizardData.totalStaff = total;
      document.getElementById('staffTotal').innerHTML = `총 직원 수: <strong>${total}명</strong>`;
    });
  });
}

/* ─── Save Current Step ─── */
async function saveCurrentStep() {
  const stepNum = currentStep + 1; // API uses 1-based
  if (currentStep === 0) return; // Welcome step has no data
  
  let body = {};
  switch (currentStep) {
    case 1: body = { specialties: wizardData.specialties }; break;
    case 2: body = { region: wizardData.region, subRegions: wizardData.subRegions, targetPatients: wizardData.targetPatients }; break;
    case 3: body = { operating_hours: wizardData.operating_hours }; break;
    case 4: body = { floor_map: wizardData.floor_map }; break;
    case 5: body = { staffStructure: wizardData.staffStructure, totalStaff: wizardData.totalStaff }; break;
  }
  
  try {
    await api('/api/protected/onboarding/step/' + stepNum, { method: 'POST', json: body });
  } catch (e) {
    console.warn('Onboarding save error:', e);
  }
}

// Export
PFM.onboarding = { renderOnboarding };

})(window.PFM);
