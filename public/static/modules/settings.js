/* ═══ Module: Settings ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, esc, toast, showModal, closeModal, logout } = PFM;

const defaultTerms = {
  chair: '체어', room: '진료실', floor: '층',
  surgery_room: '수술실', waiting_room: '대기실', consult_room: '상담실',
  xray_room: '촬영실', sterilization: '소독실'
};

const termDescriptions = {
  chair: { label: '체어/유닛', hint: '예: 체어, 유닛, 진료대, Unit', icon: '💺' },
  room: { label: '진료실/방', hint: '예: 진료실, 룸, Room, 방', icon: '🚪' },
  floor: { label: '층', hint: '예: 층, F, Floor, 플로어', icon: '🏢' },
  surgery_room: { label: '수술실', hint: '예: 수술실, OP실, OR', icon: '🔬' },
  waiting_room: { label: '대기실', hint: '예: 대기실, 로비, Waiting', icon: '🪑' },
  consult_room: { label: '상담실', hint: '예: 상담실, CC룸, 상담공간', icon: '💬' },
  xray_room: { label: '촬영실', hint: '예: 촬영실, X-ray실, 방사선실', icon: '📷' },
  sterilization: { label: '소독실', hint: '예: 소독실, 멸균실, CS실', icon: '🧹' },
};

async function renderSettings(body) {
  const isAdmin = state.user.role === 'admin';
  const isManager = ['admin','manager'].includes(state.user.role);

  body.innerHTML = `
    <div style="max-width:720px">
      <div class="section-title">👤 <span>내 정보</span></div>
      <div id="myProfileSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">🏥 <span>병원 기본정보</span></div>
      <div id="hospitalInfoSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      ${isManager ? `
      <div class="section-title">⏰ <span>진료시간 / 휴무 설정</span></div>
      <div id="operatingHoursSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">🏢 <span>층별 / 공간 구성</span></div>
      <div id="floorMapSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">📍 <span>위치 용어 설정</span></div>
      <div id="locationTermsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">📋 <span>위치 프리셋 관리</span></div>
      <div id="locationPresetsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">🦷 <span>핵심 진료 설정 (KPI용)</span></div>
      <div id="coreTreatmentsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">📍 <span>핵심 지역 설정 (KPI용)</span></div>
      <div id="coreRegionsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>
      ` : ''}

      <div class="section-title">${ICONS.users}<span>계정</span></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
        ${isAdmin ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-light)">
          <div>
            <strong style="font-size:14px">🎓 온보딩 다시 실행</strong>
            <p style="color:var(--text-secondary);font-size:12px;margin:4px 0 0">병원 기본 설정을 처음부터 다시 진행합니다</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="rerunOnboarding">온보딩 재실행</button>
        </div>
        ` : ''}
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">로그아웃하면 다시 로그인해야 합니다.</p>
        <button class="btn btn-danger" id="settingsLogout">${ICONS.logout} 로그아웃</button>
      </div>
    </div>`;
  document.getElementById('settingsLogout').addEventListener('click', logout);
  document.getElementById('rerunOnboarding')?.addEventListener('click', async () => {
    if (!confirm('온보딩을 다시 실행하시겠습니까?')) return;
    try {
      await api('/api/protected/onboarding/reset', { method: 'POST', json: {} });
      state.user.onboardingCompleted = false;
      localStorage.setItem('pfm_user', JSON.stringify(state.user));
      toast('온보딩을 재실행합니다', 'info');
      PFM.renderApp();
    } catch(e) { toast('오류: ' + e.message, 'error'); }
  });

  // 데이터 로드
  try {
    const requests = [
      api('/api/protected/me'),
      api('/api/protected/hospital/info'),
    ];
    if (isManager) requests.push(api('/api/protected/hospital/settings'));
    const [myProfile, hospitalInfo, hospitalSettings] = await Promise.all(requests);
    renderMyProfile(myProfile);
    renderHospitalInfo(hospitalInfo);
    if (isManager && hospitalSettings) {
      renderOperatingHours(hospitalSettings);
      renderFloorMap(hospitalSettings);
      renderLocationTerms(hospitalSettings);
      renderLocationPresets(hospitalSettings);
      renderCoreTreatments(hospitalSettings);
      renderCoreRegions(hospitalSettings);
    }
  } catch(e) {
    document.getElementById('myProfileSection').innerHTML = `<div style="color:#ef4444;font-size:13px">로딩 실패: ${esc(e.message)}</div>`;
  }
}

function renderMyProfile(profile) {
  const section = document.getElementById('myProfileSection');
  const schedule = profile.work_schedule || {};
  const dayLabels = ['월','화','수','목','금','토','일'];
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
  const workDays = dayKeys.filter(d => schedule[d]).length;
  const posLabels = {doctor:'원장/의사', director:'실장단', hygienist:'치과위생사', desk:'데스크', sterilization:'소독팀', management:'경영지원실'};
  const posEmoji = {doctor:'🩺', director:'👑', hygienist:'🦷', desk:'💻', sterilization:'🧹', management:'📊'};
  const teamLabels = {clinical:'진료팀', front:'프론트', support:'지원팀', management:'경영지원'};
  const teamColors = {clinical:'#3b82f6', front:'#8b5cf6', support:'#f59e0b', management:'#22c55e'};
  const roleLabels = {admin:'관리자(원장)', manager:'매니저(실장)', staff:'스태프'};
  const tc = teamColors[profile.team] || '#6b7280';

  section.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-light)">
      <div style="width:56px;height:56px;border-radius:50%;background:${tc}15;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;border:3px solid ${tc}33">
        ${posEmoji[profile.position] || '👤'}
      </div>
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--text)">${esc(profile.name)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:${tc}15;color:${tc};font-weight:600">${posLabels[profile.position]||profile.position||'미지정'}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:#fef3c7;color:#92400e;font-weight:600">${roleLabels[profile.role]||profile.role}</span>
          ${profile.is_doctor ? '<span style="font-size:10px;padding:2px 8px;border-radius:8px;background:#dbeafe;color:#1d4ed8;font-weight:600">Dr.</span>' : ''}
          <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:#f3f4f6;color:#6b7280;font-weight:600">${teamLabels[profile.team]||profile.team||'미지정'}</span>
        </div>
      </div>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label>이름</label>
        <input class="form-input" type="text" id="myName" value="${esc(profile.name || '')}">
      </div>
      <div class="form-group">
        <label>이메일</label>
        <input class="form-input" type="email" value="${esc(profile.email || '')}" disabled>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">* 이메일은 변경할 수 없습니다</div>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>연락처</label>
        <input class="form-input" type="tel" id="myPhone" value="${esc(profile.phone || '')}" placeholder="010-0000-0000">
      </div>
      <div class="form-group">
        <label>입사일</label>
        <input class="form-input" type="date" value="${profile.hire_date || ''}" disabled>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">* 입사일은 관리자만 변경 가능</div>
      </div>
    </div>

    <div class="mt-8">
      <label style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;display:block">근무 스케줄</label>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px" id="mySchedGrid">
        ${dayKeys.map((d, i) => {
          const on = !!schedule[d];
          const s = schedule[d] || {start:'09:00',end:'18:00'};
          return `<div style="text-align:center;background:${on?tc+'08':'var(--bg)'};border:1px solid ${on?tc+'33':'var(--border-light)'};border-radius:var(--radius-sm);padding:10px 4px">
            <label style="display:flex;align-items:center;gap:3px;margin-bottom:6px;justify-content:center;cursor:pointer">
              <input type="checkbox" class="my-sched-day" data-day="${d}" ${on?'checked':''}>
              <span style="font-weight:700;font-size:13px;color:${on?tc:'var(--text-muted)'}">${dayLabels[i]}</span>
            </label>
            <div class="my-sched-times" data-day-times="${d}" style="${on?'':'display:none'}">
              <input type="time" class="my-sched-start" value="${s.start||'09:00'}" style="width:100%;font-size:11px;padding:3px;border:1px solid var(--border);border-radius:4px;margin-bottom:3px;text-align:center">
              <div style="font-size:9px;color:var(--text-muted)">~</div>
              <input type="time" class="my-sched-end" value="${s.end||'18:00'}" style="width:100%;font-size:11px;padding:3px;border:1px solid var(--border);border-radius:4px;text-align:center">
            </div>
            ${!on ? '<div style="font-size:10px;color:var(--text-muted);margin-top:6px">휴무</div>' : ''}
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">주 ${workDays}일 근무</div>
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-light)">
      <button class="btn btn-primary" id="myProfileSaveBtn">💾 내 정보 저장</button>
      <button class="btn btn-outline" id="changePasswordBtn" data-action="change-password">🔑 비밀번호 변경</button>
      <span id="myProfileSaveStatus" class="mod-muted-sm"></span>
    </div>`;

  // 스케줄 체크박스 토글
  const grid = document.getElementById('mySchedGrid');
  grid.querySelectorAll('.my-sched-day').forEach(cb => {
    cb.addEventListener('change', () => {
      const times = grid.querySelector(`[data-day-times="${cb.dataset.day}"]`);
      if (times) times.style.display = cb.checked ? '' : 'none';
      // 비활성 텍스트도 토글
      const parent = cb.closest('div[style]');
      const offLabel = parent?.querySelector('div:last-child');
    });
  });

  // 저장
  document.getElementById('myProfileSaveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('myProfileSaveBtn'); btn.disabled = true;
    const ws = {};
    grid.querySelectorAll('.my-sched-day').forEach(cb => {
      const d = cb.dataset.day;
      if (cb.checked) {
        const times = grid.querySelector(`[data-day-times="${d}"]`);
        ws[d] = { start: times.querySelector('.my-sched-start').value, end: times.querySelector('.my-sched-end').value };
      } else { ws[d] = null; }
    });
    try {
      await api('/api/protected/me', { method: 'PUT', json: {
        name: document.getElementById('myName').value.trim(),
        phone: document.getElementById('myPhone').value.trim(),
        work_schedule: ws,
      }});
      toast('내 정보가 저장되었습니다!', 'success');
      // 로컬 상태도 업데이트
      state.user.name = document.getElementById('myName').value.trim();
      localStorage.setItem('pfm_user', JSON.stringify(state.user));
      document.getElementById('myProfileSaveStatus').textContent = '✅ 저장됨';
      setTimeout(() => { const s = document.getElementById('myProfileSaveStatus'); if(s) s.textContent=''; }, 3000);
    } catch(e) { toast(e.message, 'error'); }
    btn.disabled = false;
  });

  // 비밀번호 변경
  document.getElementById('changePasswordBtn').addEventListener('click', () => {
    showModal(`
      <h3 style="margin-bottom:20px;font-size:18px;font-weight:700">🔑 비밀번호 변경</h3>
      <div class="form-group">
        <label>현재 비밀번호</label>
        <input class="form-input" type="password" id="pwCurrent" placeholder="현재 비밀번호 입력" autocomplete="current-password">
      </div>
      <div class="form-group">
        <label>새 비밀번호</label>
        <input class="form-input" type="password" id="pwNew" placeholder="6자 이상" autocomplete="new-password">
      </div>
      <div class="form-group">
        <label>새 비밀번호 확인</label>
        <input class="form-input" type="password" id="pwConfirm" placeholder="새 비밀번호 다시 입력" autocomplete="new-password">
      </div>
      <div id="pwError" style="font-size:12px;color:var(--danger);margin-bottom:12px;display:none"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-outline" id="pwCancelBtn">취소</button>
        <button class="btn btn-primary" id="pwSubmitBtn">변경하기</button>
      </div>
    `);
    document.getElementById('pwCancelBtn').addEventListener('click', closeModal);
    document.getElementById('pwSubmitBtn').addEventListener('click', async () => {
      const cur = document.getElementById('pwCurrent').value;
      const nw = document.getElementById('pwNew').value;
      const cf = document.getElementById('pwConfirm').value;
      const errEl = document.getElementById('pwError');
      errEl.style.display = 'none';
      if (!cur || !nw || !cf) { errEl.textContent = '모든 항목을 입력해주세요'; errEl.style.display = ''; return; }
      if (nw.length < 6) { errEl.textContent = '새 비밀번호는 6자 이상이어야 합니다'; errEl.style.display = ''; return; }
      if (nw !== cf) { errEl.textContent = '새 비밀번호가 일치하지 않습니다'; errEl.style.display = ''; return; }
      const submitBtn = document.getElementById('pwSubmitBtn');
      submitBtn.disabled = true; submitBtn.textContent = '변경 중...';
      try {
        await api('/api/protected/me/password', { method: 'PUT', json: { currentPassword: cur, newPassword: nw }});
        closeModal();
        toast('비밀번호가 변경되었습니다! 🎉', 'success');
      } catch(e) {
        errEl.textContent = e.message; errEl.style.display = '';
        submitBtn.disabled = false; submitBtn.textContent = '변경하기';
      }
    });
    ['pwCurrent','pwNew','pwConfirm'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') document.getElementById('pwSubmitBtn').click();
      });
    });
  });
}

function renderHospitalInfo(info) {
  const isAdmin = state.user.role === 'admin';
  const section = document.getElementById('hospitalInfoSection');
  section.innerHTML = `
    <div class="form-grid">
      <div class="form-group full">
        <label>병원명</label>
        <input class="form-input" type="text" id="hiName" value="${esc(info.name || '')}" ${!isAdmin?'disabled':''}>
      </div>
      <div class="form-group">
        <label>전화번호</label>
        <input class="form-input" type="tel" id="hiPhone" value="${esc(info.phone || '')}" ${!isAdmin?'disabled':''} placeholder="02-1234-5678">
      </div>
      <div class="form-group">
        <label>주소</label>
        <input class="form-input" type="text" id="hiAddress" value="${esc(info.address || '')}" ${!isAdmin?'disabled':''} placeholder="서울특별시 강남구...">
      </div>
    </div>
    ${isAdmin ? `<button class="btn btn-primary btn-sm" id="hiSaveBtn" class="mt-12">💾 병원 정보 저장</button>` : ''}`;

  if (isAdmin) {
    document.getElementById('hiSaveBtn').addEventListener('click', async () => {
      const btn = document.getElementById('hiSaveBtn'); btn.disabled = true;
      try {
        await api('/api/protected/hospital/info', { method: 'PUT', json: {
          name: document.getElementById('hiName').value.trim(),
          phone: document.getElementById('hiPhone').value.trim(),
          address: document.getElementById('hiAddress').value.trim(),
        }});
        toast('병원 정보가 저장되었습니다', 'success');
      } catch(e) { toast(e.message, 'error'); }
      btn.disabled = false;
    });
  }
}

/* ═══ 진료시간 / 휴무 설정 ═══ */
function renderOperatingHours(settings) {
  const oh = settings.operating_hours || {};
  const section = document.getElementById('operatingHoursSection');
  if (!section) return;

  const dayLabels = ['월','화','수','목','금'];
  const weekday = oh.weekday || { start:'09:00', end:'18:00', enabled:true };
  const saturday = oh.saturday || { start:'09:00', end:'14:00', enabled:true };
  const sunday = oh.sunday || { start:'', end:'', enabled:false };
  const lunch = oh.lunch || { start:'13:00', end:'14:00', enabled:true };
  const evening = oh.evening || { start:'', end:'', enabled:false, label:'야간진료' };
  const holidays = oh.regular_holidays || [];
  const notice = oh.holiday_notice || '';

  const holidayOptions = [
    { value: 'sun', label: '매주 일요일' },
    { value: 'sat', label: '매주 토요일' },
    { value: 'sat_alt', label: '격주 토요일' },
    { value: 'national', label: '공휴일' },
    { value: 'wed_pm', label: '매주 수요일 오후' },
    { value: 'thu_pm', label: '매주 목요일 오후' },
    { value: 'first_mon', label: '매월 첫째 월요일' },
    { value: 'last_fri', label: '매월 마지막 금요일' },
  ];

  section.innerHTML = `
    <div class="mb-16">
      <p style="font-size:12px;color:var(--text-muted);line-height:1.6">
        병원의 진료시간과 정기 휴무일을 설정합니다.<br>
        이 정보는 <strong>HR 대시보드, 직원 출퇴근, 대기 안내</strong> 등에 활용됩니다.
      </p>
    </div>

    <!-- 진료 시간 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      ${[{key:'weekday',label:'평일 (월~금)',data:weekday,icon:'📅'},
        {key:'saturday',label:'토요일',data:saturday,icon:'📆'},
        {key:'sunday',label:'일요일',data:sunday,icon:'🔴'}
      ].map(t => `
        <div style="background:var(--bg);border:1px solid ${t.data.enabled?'var(--primary)33':'var(--border-light)'};border-radius:var(--radius);padding:14px;position:relative">
          <label style="display:flex;align-items:center;gap:6px;margin-bottom:10px;cursor:pointer">
            <input type="checkbox" class="oh-day-toggle" data-key="${t.key}" ${t.data.enabled?'checked':''}>
            <span style="font-weight:700;font-size:13px">${t.icon} ${t.label}</span>
          </label>
          <div class="oh-time-group" data-for="${t.key}" style="${t.data.enabled?'':'opacity:0.4;pointer-events:none'}">
            <div style="display:flex;align-items:center;gap:6px">
              <input type="time" class="form-input oh-start" data-key="${t.key}" value="${t.data.start||'09:00'}" style="flex:1;font-size:13px;padding:6px 8px">
              <span style="font-size:12px;color:var(--text-muted)">~</span>
              <input type="time" class="form-input oh-end" data-key="${t.key}" value="${t.data.end||'18:00'}" style="flex:1;font-size:13px;padding:6px 8px">
            </div>
            ${!t.data.enabled ? '<div style="text-align:center;font-size:11px;color:#ef4444;margin-top:6px;font-weight:600">휴진</div>' : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- 점심시간 / 야간진료 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--bg);border:1px solid ${lunch.enabled?'#f59e0b33':'var(--border-light)'};border-radius:var(--radius);padding:14px">
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:10px;cursor:pointer">
          <input type="checkbox" class="oh-day-toggle" data-key="lunch" ${lunch.enabled?'checked':''}>
          <span style="font-weight:700;font-size:13px">🍽️ 점심시간</span>
        </label>
        <div class="oh-time-group" data-for="lunch" style="${lunch.enabled?'':'opacity:0.4;pointer-events:none'}">
          <div style="display:flex;align-items:center;gap:6px">
            <input type="time" class="form-input oh-start" data-key="lunch" value="${lunch.start||'13:00'}" style="flex:1;font-size:13px;padding:6px 8px">
            <span style="font-size:12px;color:var(--text-muted)">~</span>
            <input type="time" class="form-input oh-end" data-key="lunch" value="${lunch.end||'14:00'}" style="flex:1;font-size:13px;padding:6px 8px">
          </div>
        </div>
      </div>
      <div style="background:var(--bg);border:1px solid ${evening.enabled?'#6366f133':'var(--border-light)'};border-radius:var(--radius);padding:14px">
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:10px;cursor:pointer">
          <input type="checkbox" class="oh-day-toggle" data-key="evening" ${evening.enabled?'checked':''}>
          <span style="font-weight:700;font-size:13px">🌙 야간진료</span>
        </label>
        <div class="oh-time-group" data-for="evening" style="${evening.enabled?'':'opacity:0.4;pointer-events:none'}">
          <div style="display:flex;align-items:center;gap:6px">
            <input type="time" class="form-input oh-start" data-key="evening" value="${evening.start||'18:00'}" style="flex:1;font-size:13px;padding:6px 8px">
            <span style="font-size:12px;color:var(--text-muted)">~</span>
            <input type="time" class="form-input oh-end" data-key="evening" value="${evening.end||'21:00'}" style="flex:1;font-size:13px;padding:6px 8px">
          </div>
          <div style="margin-top:6px">
            <input class="form-input" id="ohEveningLabel" value="${esc(evening.label||'야간진료')}" placeholder="표시 이름 (예: 야간진료, 심야진료)" style="font-size:11px;padding:4px 8px">
          </div>
        </div>
      </div>
    </div>

    <!-- 정기 휴무 -->
    <div style="background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:14px;margin-bottom:20px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">🚫 정기 휴무일</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        ${holidayOptions.map(opt => {
          const checked = holidays.includes(opt.value);
          return `<label style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:${checked?'#fef2f233':'var(--bg-card)'};border:1px solid ${checked?'#ef4444':'var(--border-light)'};border-radius:20px;cursor:pointer;font-size:12px;transition:all .2s">
            <input type="checkbox" class="oh-holiday" value="${opt.value}" ${checked?'checked':''}>
            <span>${opt.label}</span>
          </label>`;
        }).join('')}
      </div>
      <div class="mt-8">
        <label style="font-size:11px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">휴무 안내 문구 (선택)</label>
        <input class="form-input" id="ohHolidayNotice" value="${esc(notice)}" placeholder="예: 공휴일, 일요일 휴진 / 토요일 오후 휴진" style="font-size:12px;padding:6px 10px">
      </div>
    </div>

    <!-- 저장 -->
    <div style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-primary btn-sm" id="ohSaveBtn">💾 진료시간 저장</button>
      <span id="ohSaveStatus" class="mod-muted-sm"></span>
    </div>
  `;

  // 토글 이벤트
  section.querySelectorAll('.oh-day-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const group = section.querySelector(`[data-for="${cb.dataset.key}"]`);
      if (group) {
        group.style.opacity = cb.checked ? '1' : '0.4';
        group.style.pointerEvents = cb.checked ? '' : 'none';
      }
    });
  });

  // 저장
  document.getElementById('ohSaveBtn').addEventListener('click', async () => {
    const btn = document.getElementById('ohSaveBtn'); btn.disabled = true;
    const data = {};
    ['weekday','saturday','sunday','lunch','evening'].forEach(key => {
      const enabled = section.querySelector(`.oh-day-toggle[data-key="${key}"]`)?.checked || false;
      const startEl = section.querySelector(`.oh-start[data-key="${key}"]`);
      const endEl = section.querySelector(`.oh-end[data-key="${key}"]`);
      data[key] = { start: startEl?.value||'', end: endEl?.value||'', enabled };
    });
    data.evening.label = document.getElementById('ohEveningLabel')?.value?.trim() || '야간진료';
    data.regular_holidays = Array.from(section.querySelectorAll('.oh-holiday:checked')).map(c => c.value);
    data.holiday_notice = document.getElementById('ohHolidayNotice')?.value?.trim() || '';
    try {
      await api('/api/protected/hospital/settings', { method: 'PUT', json: { operating_hours: data }});
      toast('진료시간이 저장되었습니다!', 'success');
      document.getElementById('ohSaveStatus').textContent = '✅ 저장됨';
      setTimeout(() => { const s = document.getElementById('ohSaveStatus'); if(s) s.textContent=''; }, 3000);
    } catch(e) { toast(e.message, 'error'); }
    btn.disabled = false;
  });
}

/* ═══ 층별 / 공간 구성 ═══ */
function renderFloorMap(settings) {
  const floors = settings.floor_map || [];
  const terms = settings.location_terms || defaultTerms;
  const section = document.getElementById('floorMapSection');
  if (!section) return;

  const spaceTypes = [
    { value: 'treatment', label: '진료실', icon: '🦷', color: '#3b82f6' },
    { value: 'surgery', label: '수술실', icon: '🔬', color: '#ef4444' },
    { value: 'orthodontics', label: '교정실', icon: '🔧', color: '#8b5cf6' },
    { value: 'xray', label: '촬영실', icon: '📷', color: '#f59e0b' },
    { value: 'consult', label: '상담실', icon: '💬', color: '#22c55e' },
    { value: 'waiting', label: '대기실', icon: '🪑', color: '#6b7280' },
    { value: 'sterilization', label: '소독실', icon: '🧹', color: '#ec4899' },
    { value: 'office', label: '사무실', icon: '💼', color: '#0ea5e9' },
    { value: 'storage', label: '창고', icon: '📦', color: '#78716c' },
    { value: 'other', label: '기타', icon: '🏷️', color: '#a1a1aa' },
  ];

  function renderFloorList() {
    section.innerHTML = `
      <div class="mb-16">
        <p style="font-size:12px;color:var(--text-muted);line-height:1.6">
          병원의 층별/공간 구성을 설정합니다. 각 층에 어떤 공간이 있는지 등록하면<br>
          <strong>진료보드, 체어 배정, 환자 동선</strong> 관리에 활용됩니다.
        </p>
      </div>

      ${floors.length ? floors.map((f, fi) => {
        const spaces = f.spaces || [];
        return `
          <div style="background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:16px;margin-bottom:12px;position:relative" data-floor-idx="${fi}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:22px;font-weight:800;color:var(--primary)">${esc(f.name)}</span>
                <span class="mod-muted-sm">${spaces.length}개 공간</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn-icon fm-add-space-btn" data-fi="${fi}" title="공간 추가">➕</button>
                <button class="btn-icon fm-del-floor-btn" data-fi="${fi}" title="층 삭제">${ICONS.trash}</button>
              </div>
            </div>
            ${spaces.length ? `
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${spaces.map((sp, si) => {
                  const st = spaceTypes.find(t => t.value === sp.type) || spaceTypes[spaceTypes.length-1];
                  return `
                    <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:${st.color}0a;border:1px solid ${st.color}33;border-radius:20px;font-size:12px">
                      <span>${st.icon}</span>
                      <span style="font-weight:600">${esc(sp.name)}</span>
                      ${sp.chairs ? `<span class="mod-muted-xs">(${terms.chair||'체어'} ${sp.chairs}개)</span>` : ''}
                      <button class="btn-icon fm-del-space-btn" data-fi="${fi}" data-si="${si}" title="삭제" style="width:18px;height:18px;font-size:10px">&times;</button>
                    </div>`;
                }).join('')}
              </div>
            ` : '<div style="text-align:center;padding:10px;color:var(--text-muted);font-size:11px">등록된 공간이 없습니다. ➕ 버튼을 눌러 추가하세요.</div>'}
          </div>`;
      }).join('') : '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px">등록된 층이 없습니다. 아래에서 층을 추가해주세요.</div>'}

      <!-- 층 추가 -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius);padding:14px;margin-top:8px">
        <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:10px">🏢 새 층 추가</div>
        <div style="display:flex;gap:8px;align-items:end">
          <div class="form-group" style="flex:1;margin-bottom:0">
            <label style="font-size:11px">층 이름</label>
            <input class="form-input" id="fmNewFloor" placeholder="예: 1F, 2F, B1, 본관 3층" style="font-size:13px">
          </div>
          <div class="form-group" style="flex:1;margin-bottom:0">
            <label style="font-size:11px">설명 (선택)</label>
            <input class="form-input" id="fmNewFloorDesc" placeholder="예: 접수·대기·상담" style="font-size:13px">
          </div>
          <button class="btn btn-primary btn-sm" id="fmAddFloorBtn">추가</button>
        </div>
      </div>

      <!-- 저장 -->
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
        <button class="btn btn-primary btn-sm" id="fmSaveBtn">💾 층별 구성 저장</button>
        <span id="fmSaveStatus" class="mod-muted-sm"></span>
      </div>
    `;

    // 층 추가
    document.getElementById('fmAddFloorBtn')?.addEventListener('click', () => {
      const name = document.getElementById('fmNewFloor')?.value?.trim();
      if (!name) { toast('층 이름을 입력해주세요', 'error'); return; }
      const desc = document.getElementById('fmNewFloorDesc')?.value?.trim() || '';
      floors.push({ name, description: desc, spaces: [] });
      renderFloorList();
      toast(`${name} 추가됨 (저장 버튼을 눌러주세요)`, 'info');
    });

    // 층 삭제
    section.querySelectorAll('.fm-del-floor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fi = parseInt(btn.dataset.fi);
        if (!confirm(`"${floors[fi]?.name}" 층과 모든 공간을 삭제하시겠습니까?`)) return;
        floors.splice(fi, 1);
        renderFloorList();
        toast('삭제됨 (저장 버튼을 눌러주세요)', 'info');
      });
    });

    // 공간 추가 (모달)
    section.querySelectorAll('.fm-add-space-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fi = parseInt(btn.dataset.fi);
        showModal(`➕ ${esc(floors[fi]?.name)} - 공간 추가`, `
          <div class="form-group">
            <label>공간 이름</label>
            <input class="form-input" id="fmSpaceName" placeholder="예: 진료실 A, 수술실 1, VIP 상담실">
          </div>
          <div class="form-group">
            <label>공간 유형</label>
            <select class="form-input" id="fmSpaceType">
              ${spaceTypes.map(st => `<option value="${st.value}">${st.icon} ${st.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>${esc(terms.chair||'체어')} 수 (선택, 진료 공간인 경우)</label>
            <input class="form-input" type="number" id="fmSpaceChairs" min="0" max="50" placeholder="0">
          </div>
          <div class="form-group">
            <label>메모 (선택)</label>
            <input class="form-input" id="fmSpaceNote" placeholder="예: 임플란트 전용, VIP">
          </div>
          <button class="btn btn-primary" id="fmSpaceAddConfirm" style="width:100%;margin-top:8px">추가</button>
        `);
        document.getElementById('fmSpaceAddConfirm')?.addEventListener('click', () => {
          const name = document.getElementById('fmSpaceName')?.value?.trim();
          if (!name) { toast('공간 이름을 입력해주세요', 'error'); return; }
          const sp = {
            name,
            type: document.getElementById('fmSpaceType')?.value || 'other',
            chairs: parseInt(document.getElementById('fmSpaceChairs')?.value) || 0,
            note: document.getElementById('fmSpaceNote')?.value?.trim() || '',
          };
          floors[fi].spaces.push(sp);
          closeModal();
          renderFloorList();
          toast(`${name} 추가됨 (저장 버튼을 눌러주세요)`, 'info');
        });
      });
    });

    // 공간 삭제
    section.querySelectorAll('.fm-del-space-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fi = parseInt(btn.dataset.fi);
        const si = parseInt(btn.dataset.si);
        const sp = floors[fi]?.spaces?.[si];
        if (!sp) return;
        floors[fi].spaces.splice(si, 1);
        renderFloorList();
        toast(`${h(sp.name)} 삭제됨 (저장 버튼을 눌러주세요)`, 'info');
      });
    });

    // 전체 저장
    document.getElementById('fmSaveBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('fmSaveBtn'); btn.disabled = true;
      try {
        await api('/api/protected/hospital/settings', { method: 'PUT', json: { floor_map: floors }});
        toast('층별 구성이 저장되었습니다!', 'success');
        document.getElementById('fmSaveStatus').textContent = '✅ 저장됨';
        setTimeout(() => { const s = document.getElementById('fmSaveStatus'); if(s) s.textContent=''; }, 3000);
      } catch(e) { toast(e.message, 'error'); }
      btn.disabled = false;
    });
  }

  renderFloorList();
}

/* ═══ 위치 용어 설정 ═══ */
function renderLocationTerms(settings) {
  const terms = settings.location_terms || defaultTerms;
  const isEditable = ['admin','manager'].includes(state.user.role);
  const section = document.getElementById('locationTermsSection');

  section.innerHTML = `
    <div style="margin-bottom:14px">
      <p style="font-size:12px;color:var(--text-muted);line-height:1.6">
        병원에서 사용하는 위치 관련 용어를 설정합니다.<br>
        여기서 설정한 용어가 <strong>진료보드, 환자등록, 체어 관리</strong> 등 모든 화면에 자동 적용됩니다.
      </p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
      ${Object.entries(termDescriptions).map(([key, desc]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
          <span style="font-size:18px;width:28px;text-align:center">${desc.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:3px">${desc.label}</div>
            <input class="form-input lt-input" data-key="${key}" value="${esc(terms[key] || defaultTerms[key])}" placeholder="${desc.hint}" style="font-size:13px;padding:5px 10px" ${!isEditable?'disabled':''}>
          </div>
        </div>
      `).join('')}
    </div>
    ${isEditable ? `
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
        <button class="btn btn-primary btn-sm" id="ltSaveBtn">💾 용어 저장</button>
        <button class="btn btn-secondary btn-sm" id="ltResetBtn">↩️ 기본값으로</button>
        <span id="ltSaveStatus" class="mod-muted-sm"></span>
      </div>
    ` : '<div style="font-size:11px;color:var(--text-muted);margin-top:12px">* 용어 변경은 원장/실장만 가능합니다</div>'}`;

  if (isEditable) {
    document.getElementById('ltSaveBtn').addEventListener('click', async () => {
      const btn = document.getElementById('ltSaveBtn'); btn.disabled = true;
      const newTerms = {};
      section.querySelectorAll('.lt-input').forEach(el => {
        const key = el.dataset.key;
        const val = el.value.trim();
        if (val) newTerms[key] = val;
      });
      try {
        await api('/api/protected/hospital/settings', { method: 'PUT', json: { location_terms: newTerms }});
        toast('위치 용어가 저장되었습니다! 진료보드에 즉시 반영됩니다.', 'success');
        document.getElementById('ltSaveStatus').textContent = '✅ 저장됨';
        setTimeout(() => { const s = document.getElementById('ltSaveStatus'); if(s) s.textContent=''; }, 3000);
      } catch(e) { toast(e.message, 'error'); }
      btn.disabled = false;
    });

    document.getElementById('ltResetBtn').addEventListener('click', () => {
      section.querySelectorAll('.lt-input').forEach(el => {
        el.value = defaultTerms[el.dataset.key] || '';
      });
      toast('기본값으로 복원되었습니다. 저장 버튼을 눌러주세요.', 'info');
    });
  }
}

function renderLocationPresets(settings) {
  const presets = settings.location_presets || [];
  const terms = settings.location_terms || defaultTerms;
  const isEditable = ['admin','manager'].includes(state.user.role);
  const section = document.getElementById('locationPresetsSection');

  function renderPresetList() {
    section.innerHTML = `
      <div style="margin-bottom:14px">
        <p style="font-size:12px;color:var(--text-muted);line-height:1.6">
          자주 사용하는 위치 조합을 프리셋으로 등록하면, 환자 등록 시 빠르게 선택할 수 있습니다.
        </p>
      </div>
      ${presets.length ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${presets.map((p, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border-light)">
              <span style="font-size:14px">📍</span>
              <div class="flex-1">
                <span style="font-weight:700;font-size:13px">${esc(p.label)}</span>
                <span style="font-size:11px;color:var(--text-muted);margin-left:8px">
                  ${p.floor ? (terms.floor||'층')+': '+esc(p.floor)+' ' : ''}${p.room ? (terms.room||'진료실')+': '+esc(p.room) : ''}
                </span>
              </div>
              ${isEditable ? `<button class="btn-icon lp-del-btn" data-idx="${i}" title="삭제">${ICONS.trash}</button>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">등록된 프리셋이 없습니다</div>'}
      ${isEditable ? `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:var(--radius);padding:14px">
          <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:10px">➕ 새 프리셋 추가</div>
          <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr">
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px">표시 이름</label>
              <input class="form-input" id="lpLabel" placeholder="예: 2F 진료실A" style="font-size:13px">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px">${esc(terms.floor||'층')}</label>
              <input class="form-input" id="lpFloor" placeholder="예: 2F, 3층" style="font-size:13px">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px">${esc(terms.room||'진료실')}</label>
              <input class="form-input" id="lpRoom" placeholder="예: 진료실 A" style="font-size:13px">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="lpAddBtn" style="margin-top:10px">추가</button>
        </div>
      ` : ''}`;

    if (isEditable) {
      document.getElementById('lpAddBtn')?.addEventListener('click', async () => {
        const label = document.getElementById('lpLabel').value.trim();
        if (!label) { toast('표시 이름을 입력해주세요', 'error'); return; }
        const newPreset = {
          label,
          floor: document.getElementById('lpFloor').value.trim(),
          room: document.getElementById('lpRoom').value.trim(),
        };
        presets.push(newPreset);
        try {
          await api('/api/protected/hospital/settings', { method: 'PUT', json: { location_presets: presets }});
          toast('프리셋이 추가되었습니다', 'success');
          renderPresetList();
        } catch(e) { presets.pop(); toast(e.message, 'error'); }
      });

      section.querySelectorAll('.lp-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const idx = parseInt(btn.dataset.idx);
          if (!confirm(`"${presets[idx]?.label}" 프리셋을 삭제하시겠습니까?`)) return;
          const removed = presets.splice(idx, 1);
          try {
            await api('/api/protected/hospital/settings', { method: 'PUT', json: { location_presets: presets }});
            toast('프리셋이 삭제되었습니다', 'success');
            renderPresetList();
          } catch(e) { presets.splice(idx, 0, ...removed); toast(e.message, 'error'); }
        });
      });
    }
  }

  renderPresetList();
}

/* ─── 핵심 진료 설정 ─── */
function renderCoreTreatments(settings) {
  const section = document.getElementById('coreTreatmentsSection');
  if (!section) return;
  const treatments = settings.core_treatments || [
    { key: 'core1', label: '핵심진료 1', name: '' },
    { key: 'core2', label: '핵심진료 2', name: '' },
    { key: 'core3', label: '핵심진료 3', name: '' },
  ];

  const examples = ['임플란트', '교정', '보철', '충치치료', '라미네이트', '미백', '사랑니 발치', '잇몸치료', '크라운', '소아치과'];

  section.innerHTML = `
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
      KPI 일간 기록에서 <strong>신환 진료별 · 상담별 · 진행수</strong>를 분류하는 기준이 됩니다.<br>
      우리 병원의 대표 진료 3가지를 설정하세요.
    </p>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${treatments.map((t, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:14px;background:var(--bg-hover);border-radius:10px;border:1px solid var(--border-light)">
          <div style="min-width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px">${i+1}</div>
          <div class="flex-1">
            <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:4px">${esc(t.label)}</div>
            <input type="text" class="form-input ct-input" data-idx="${i}" value="${esc(t.name || '')}" placeholder="예: ${examples[i] || '진료명 입력'}" style="width:100%;padding:8px 12px;font-size:14px;font-weight:600">
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-muted);line-height:24px">빠른선택:</span>
      ${examples.map(ex => `<button class="ct-quick" data-name="${ex}" style="font-size:11px;padding:3px 10px;border:1px solid var(--border);border-radius:16px;background:var(--bg-card);cursor:pointer;color:var(--text)">${ex}</button>`).join('')}
    </div>
    <button class="btn btn-primary" id="ctSaveBtn" style="margin-top:16px;width:100%">💾 핵심진료 저장</button>
  `;

  // 빠른선택 버튼 클릭 → 비어있는 첫 번째 인풋에 채우기
  section.querySelectorAll('.ct-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputs = section.querySelectorAll('.ct-input');
      for (const inp of inputs) {
        if (!inp.value.trim()) { inp.value = btn.dataset.name; inp.focus(); return; }
      }
      // 모두 차있으면 마지막에 넣기
      inputs[inputs.length - 1].value = btn.dataset.name;
    });
  });

  // 저장
  document.getElementById('ctSaveBtn').addEventListener('click', async () => {
    const inputs = section.querySelectorAll('.ct-input');
    const updated = treatments.map((t, i) => ({
      ...t,
      name: inputs[i]?.value.trim() || '',
    }));
    try {
      await api('/api/protected/hospital/settings', { method: 'PUT', json: { core_treatments: updated }});
      toast('✅ 핵심진료가 저장되었습니다');
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
}

/* ─── 핵심 지역 설정 ─── */
function renderCoreRegions(settings) {
  const section = document.getElementById('coreRegionsSection');
  if (!section) return;
  const regions = settings.core_regions || [
    { key: 'region_core', label: '핵심 지역', name: '' },
    { key: 'region_expand', label: '확장 지역', name: '' },
    { key: 'region_adjacent', label: '인접 지역', name: '' },
    { key: 'region_other', label: '그 외 지역', name: '그외' },
  ];

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'];
  const descriptions = [
    '우리 병원의 핵심 진료권 (예: 불당동)',
    '1차 확장 가능 지역 (예: 천안시)',
    '인접 도시/지역 (예: 아산시)',
    '그 외 먼 지역',
  ];

  section.innerHTML = `
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
      KPI 일간 기록에서 <strong>신환의 지역별 유입 현황</strong>을 분석하는 기준이 됩니다.<br>
      병원 소재지 중심으로 4단계 지역을 설정하세요.
    </p>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${regions.map((r, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:14px;background:var(--bg-hover);border-radius:10px;border-left:4px solid ${colors[i]}">
          <div class="flex-1">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:11px;font-weight:700;color:${colors[i]}">${esc(r.label)}</span>
              <span class="mod-muted-xs">${descriptions[i]}</span>
            </div>
            <input type="text" class="form-input cr-input" data-idx="${i}" value="${esc(r.name || '')}" placeholder="지역명 입력" style="width:100%;padding:8px 12px;font-size:14px;font-weight:600">
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary" id="crSaveBtn" style="margin-top:16px;width:100%">💾 핵심지역 저장</button>
  `;

  // 저장
  document.getElementById('crSaveBtn').addEventListener('click', async () => {
    const inputs = section.querySelectorAll('.cr-input');
    const updated = regions.map((r, i) => ({
      ...r,
      name: inputs[i]?.value.trim() || '',
    }));
    try {
      await api('/api/protected/hospital/settings', { method: 'PUT', json: { core_regions: updated }});
      toast('✅ 핵심지역이 저장되었습니다');
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
}

PFM.modules.settings = { renderSettings };
})(window.PFM);
