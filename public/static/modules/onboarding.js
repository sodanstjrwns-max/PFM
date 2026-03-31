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

/* ─── 전국 시/군/구 지역 데이터 (약 250개) ─── */
const REGION_DATA = {
  '서울': ['강남구','서초구','송파구','강동구','마포구','용산구','성동구','광진구','종로구','중구','영등포구','강서구','구로구','관악구','동작구','양천구','서대문구','은평구','노원구','도봉구','강북구','성북구','중랑구','동대문구','금천구'],
  '경기': ['수원시 장안구','수원시 권선구','수원시 팔달구','수원시 영통구','성남시 수정구','성남시 중원구','성남시 분당구','고양시 덕양구','고양시 일산동구','고양시 일산서구','용인시 처인구','용인시 기흥구','용인시 수지구','부천시','안산시 상록구','안산시 단원구','안양시 만안구','안양시 동안구','남양주시','화성시','평택시','의정부시','시흥시','파주시','광명시','김포시','군포시','광주시','이천시','양주시','오산시','구리시','안성시','포천시','의왕시','하남시','여주시','동두천시','과천시','양평군','가평군','연천군'],
  '인천': ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'],
  '부산': ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'],
  '대구': ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'],
  '광주': ['동구','서구','남구','북구','광산구'],
  '대전': ['동구','중구','서구','유성구','대덕구'],
  '울산': ['중구','남구','동구','북구','울주군'],
  '세종': ['세종시'],
  '강원': ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'],
  '충북': ['청주시 상당구','청주시 서원구','청주시 흥덕구','청주시 청원구','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'],
  '충남': ['천안시 동남구','천안시 서북구','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'],
  '전북': ['전주시 완산구','전주시 덕진구','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'],
  '전남': ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],
  '경북': ['포항시 남구','포항시 북구','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'],
  '경남': ['창원시 의창구','창원시 성산구','창원시 마산합포구','창원시 마산회원구','창원시 진해구','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'],
  '제주': ['제주시','서귀포시'],
};

/* 플랫 리스트 생성: "시/도 > 구/군" 형태 */
const REGIONS_FLAT = [];
Object.entries(REGION_DATA).forEach(([sido, list]) => {
  list.forEach(gu => REGIONS_FLAT.push({ label: `${sido} ${gu}`, sido, gu }));
});

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
let isSaving = false; // Prevent double-click
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

function setButtonsDisabled(disabled) {
  const ids = ['obPrev', 'obNext', 'obComplete', 'obSkip'];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
      if (disabled) btn.style.opacity = '0.6';
      else btn.style.opacity = '';
    }
  });
}

function renderWizard(container) {
  const step = STEPS[currentStep];
  const progress = Math.round((currentStep / (STEPS.length - 1)) * 100);
  isSaving = false;
  
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
            <div class="ob-step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}" 
                 title="${s.title}" 
                 data-step="${i}" 
                 style="cursor:${i < currentStep ? 'pointer' : 'default'}">
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
      
      <!-- Content (scrollable) -->
      <div class="ob-content" id="obContent"></div>
      
      <!-- Actions (sticky at bottom) -->
      <div class="ob-actions">
        ${currentStep > 0 ? `<button class="btn btn-secondary ob-btn" id="obPrev" type="button">← 이전</button>` : '<div></div>'}
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ob-skip-btn" id="obSkip" type="button" title="나중에 설정에서 수정 가능합니다">건너뛰기</button>
          ${currentStep < STEPS.length - 1 
            ? `<button class="btn btn-primary ob-btn" id="obNext" type="button">다음 →</button>` 
            : `<button class="btn btn-primary ob-btn" id="obComplete" type="button">🚀 시작하기!</button>`
          }
        </div>
      </div>
      
      <div class="ob-hint">
        💡 모든 항목은 나중에 <strong>설정</strong> 메뉴에서 언제든 수정할 수 있습니다
      </div>
    </div>
  </div>`;
  
  renderStepContent(document.getElementById('obContent'));
  
  // Step dot click - jump to completed steps
  container.querySelectorAll('.ob-step-dot[data-step]').forEach(dot => {
    dot.addEventListener('click', async () => {
      const targetStep = parseInt(dot.dataset.step);
      if (targetStep < currentStep) {
        await saveCurrentStep();
        currentStep = targetStep;
        renderWizard(container);
      }
    });
  });
  
  // Previous button
  const prevBtn = document.getElementById('obPrev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (isSaving) return;
      if (currentStep > 0) { currentStep--; renderWizard(container); }
    });
  }
  
  // Next button
  const nextBtn = document.getElementById('obNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (isSaving) return;
      isSaving = true;
      setButtonsDisabled(true);
      nextBtn.textContent = '저장 중...';
      try {
        await saveCurrentStep();
        currentStep++;
        renderWizard(container);
      } catch (e) {
        toast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
        isSaving = false;
        setButtonsDisabled(false);
        nextBtn.textContent = '다음 →';
      }
    });
  }
  
  // Complete button
  const completeBtn = document.getElementById('obComplete');
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      if (isSaving) return;
      isSaving = true;
      setButtonsDisabled(true);
      completeBtn.textContent = '완료 처리 중...';
      try {
        await saveCurrentStep();
        await api('/api/protected/onboarding/complete', { method: 'POST', json: {} });
        state.user.onboardingCompleted = true;
        localStorage.setItem('pfm_user', JSON.stringify(state.user));
        toast('온보딩 완료! 환영합니다 🎉', 'success');
        PFM.renderApp();
      } catch (e) {
        toast('오류: ' + e.message, 'error');
        isSaving = false;
        setButtonsDisabled(false);
        completeBtn.textContent = '🚀 시작하기!';
      }
    });
  }
  
  // Skip button
  const skipBtn = document.getElementById('obSkip');
  if (skipBtn) {
    skipBtn.addEventListener('click', async () => {
      if (isSaving) return;
      if (confirm('온보딩을 건너뛰시겠습니까?\n\n나중에 설정 메뉴에서 모든 항목을 설정할 수 있습니다.')) {
        isSaving = true;
        setButtonsDisabled(true);
        skipBtn.textContent = '처리 중...';
        try {
          await api('/api/protected/onboarding/skip', { method: 'POST', json: {} });
          state.user.onboardingCompleted = true;
          localStorage.setItem('pfm_user', JSON.stringify(state.user));
          toast('온보딩을 건너뛰었습니다. 설정에서 언제든 수정하세요!', 'info');
          PFM.renderApp();
        } catch (e) {
          toast('오류: ' + e.message, 'error');
          isSaving = false;
          setButtonsDisabled(false);
          skipBtn.textContent = '건너뛰기';
        }
      }
    });
  }
  
  // Scroll content area to top
  const obContent = document.getElementById('obContent');
  if (obContent) obContent.scrollTop = 0;
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
        <button type="button" class="ob-chip ${wizardData.specialties.includes(s.id) ? 'selected' : ''}" data-id="${s.id}">
          <span class="ob-chip-icon">${s.icon}</span>
          <span>${s.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="ob-tip">💡 3~5개 선택을 추천합니다. 상담 스크립트, 비용 안내, 마케팅 분석에 활용됩니다.</div>`;
  
  el.querySelectorAll('.ob-chip[data-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      const idx = wizardData.specialties.indexOf(id);
      if (idx >= 0) { wizardData.specialties.splice(idx, 1); chip.classList.remove('selected'); }
      else { wizardData.specialties.push(id); chip.classList.add('selected'); }
    });
  });
}

/* ─── Step 2: Region (검색형 태그 입력) ─── */
function renderRegion(el) {
  el.innerHTML = `
    <div class="ob-section">
      <label class="ob-label">주요 환자 유입 지역</label>
      <p style="color:var(--text-secondary);font-size:13px;margin:-4px 0 8px">지역명을 입력하면 자동완성됩니다. 목록에 없는 지역은 직접 입력 후 Enter로 추가하세요.</p>
      <div class="ob-tag-input-wrap" id="regionTagWrap">
        <div class="ob-tags" id="regionTags"></div>
        <input type="text" class="ob-tag-search" id="regionSearch" placeholder="🔍 지역 검색 (예: 천안, 분당, 강남...)" autocomplete="off">
        <div class="ob-tag-dropdown" id="regionDropdown"></div>
      </div>
    </div>
    <div class="ob-divider"></div>
    <div class="ob-section">
      <label class="ob-label">타겟 환자층 (복수 선택)</label>
      <div class="ob-chip-grid">
        ${PATIENT_TARGETS.map(t => `
          <button type="button" class="ob-chip ${wizardData.targetPatients.includes(t.id) ? 'selected' : ''}" data-target="${t.id}">
            <span class="ob-chip-icon">${t.icon}</span>
            <span>${t.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="ob-tip">💡 마케팅 유입 분석, 히트맵, 환자 퍼널 분석에 활용됩니다.</div>`;
  
  initRegionTagInput();
  
  el.querySelectorAll('.ob-chip[data-target]').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.dataset.target;
      const idx = wizardData.targetPatients.indexOf(t);
      if (idx >= 0) { wizardData.targetPatients.splice(idx, 1); chip.classList.remove('selected'); }
      else { wizardData.targetPatients.push(t); chip.classList.add('selected'); }
    });
  });
}

function initRegionTagInput() {
  const tagsEl = document.getElementById('regionTags');
  const searchEl = document.getElementById('regionSearch');
  const dropdownEl = document.getElementById('regionDropdown');
  if (!tagsEl || !searchEl || !dropdownEl) return;

  function renderTags() {
    tagsEl.innerHTML = wizardData.subRegions.map(r => `
      <span class="ob-tag">
        <span class="ob-tag-label">${esc(r)}</span>
        <button type="button" class="ob-tag-remove" data-val="${esc(r)}">&times;</button>
      </span>
    `).join('');
    tagsEl.querySelectorAll('.ob-tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRegion(btn.dataset.val);
      });
    });
  }

  function addRegion(val) {
    val = val.trim();
    if (!val || wizardData.subRegions.includes(val)) return;
    wizardData.subRegions.push(val);
    searchEl.value = '';
    hideDropdown();
    renderTags();
    searchEl.focus();
  }

  function removeRegion(val) {
    const idx = wizardData.subRegions.indexOf(val);
    if (idx >= 0) wizardData.subRegions.splice(idx, 1);
    renderTags();
    searchEl.focus();
  }

  function showDropdown(items) {
    if (!items.length) { hideDropdown(); return; }
    const maxShow = 12;
    const showing = items.slice(0, maxShow);
    dropdownEl.innerHTML = showing.map((item, i) => {
      const already = wizardData.subRegions.includes(item.label);
      return `<div class="ob-tag-option ${already ? 'disabled' : ''}" data-idx="${i}" data-val="${esc(item.label)}">
        <span class="ob-tag-opt-sido">${esc(item.sido)}</span>
        <span class="ob-tag-opt-gu">${esc(item.gu)}</span>
        ${already ? '<span class="ob-tag-opt-check">✓</span>' : ''}
      </div>`;
    }).join('') + (items.length > maxShow ? `<div class="ob-tag-option-more">${items.length - maxShow}개 더 있음 — 검색어를 더 입력하세요</div>` : '');
    dropdownEl.style.display = 'block';
    dropdownEl.querySelectorAll('.ob-tag-option:not(.disabled)').forEach(opt => {
      opt.addEventListener('click', () => addRegion(opt.dataset.val));
    });
  }

  function hideDropdown() {
    dropdownEl.style.display = 'none';
    dropdownEl.innerHTML = '';
  }

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) { hideDropdown(); return; }
    const filtered = REGIONS_FLAT.filter(r => 
      r.label.toLowerCase().includes(q) || r.sido.toLowerCase().includes(q) || r.gu.toLowerCase().includes(q)
    );
    showDropdown(filtered);
  });

  searchEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchEl.value.trim();
      // 드롭다운에 정확히 1개 매치되면 그걸 추가, 아니면 직접 입력 추가
      const exactMatch = REGIONS_FLAT.find(r => r.label === q || r.gu === q);
      if (exactMatch) {
        addRegion(exactMatch.label);
      } else if (q) {
        // 직접 입력 (목록에 없는 지역)
        addRegion(q);
      }
    }
    if (e.key === 'Backspace' && !searchEl.value && wizardData.subRegions.length) {
      removeRegion(wizardData.subRegions[wizardData.subRegions.length - 1]);
    }
    if (e.key === 'Escape') hideDropdown();
  });

  searchEl.addEventListener('focus', () => {
    const q = searchEl.value.trim().toLowerCase();
    if (q) {
      const filtered = REGIONS_FLAT.filter(r => r.label.toLowerCase().includes(q));
      showDropdown(filtered);
    }
  });

  // Click outside to close dropdown
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#regionTagWrap')) hideDropdown();
  });

  // Clicking the wrap focuses the input
  document.getElementById('regionTagWrap').addEventListener('click', (e) => {
    if (!e.target.closest('.ob-tag-remove')) searchEl.focus();
  });

  renderTags();
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
    <button type="button" class="btn btn-secondary ob-add-btn" id="addFloor">+ 층 추가</button>
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
        ${wizardData.floor_map.length > 1 ? `<button type="button" class="btn btn-sm ob-floor-del" data-fi="${fi}" title="삭제">✕</button>` : ''}
      </div>
      <div class="ob-space-list" id="spaceList_${fi}">
        ${(floor.spaces || []).map((space, si) => renderSpaceRow(fi, si, space)).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-secondary ob-add-space" data-fi="${fi}">+ 공간 추가</button>
    </div>
  `).join('');
  
  // Event delegation approach for better reliability
  container.querySelectorAll('.ob-floor-name').forEach(inp => {
    inp.addEventListener('input', () => { wizardData.floor_map[inp.dataset.fi].name = inp.value; });
  });
  container.querySelectorAll('.ob-floor-desc').forEach(inp => {
    inp.addEventListener('input', () => { wizardData.floor_map[inp.dataset.fi].description = inp.value; });
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
    inp.addEventListener('input', () => {
      wizardData.floor_map[inp.dataset.fi].spaces[inp.dataset.si].name = inp.value;
    });
  });
  container.querySelectorAll('.ob-space-chairs').forEach(inp => {
    inp.addEventListener('input', () => {
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
      <button type="button" class="btn btn-sm ob-space-del" data-fi="${fi}" data-si="${si}" style="color:var(--danger);padding:4px 8px">✕</button>
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
            <button type="button" class="ob-counter-btn" data-role="${r.id}" data-dir="-1">−</button>
            <span class="ob-counter-val" id="staffCount_${r.id}">${count}</span>
            <button type="button" class="ob-counter-btn" data-role="${r.id}" data-dir="1">+</button>
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
  
  await api('/api/protected/onboarding/step/' + stepNum, { method: 'POST', json: body });
}

// Export
PFM.onboarding = { renderOnboarding };

})(window.PFM);
