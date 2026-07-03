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

      <div class="section-title">🏥 <span>진료 유닛 관리</span></div>
      <div id="chairsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
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

      <div class="section-title">🗄️ <span>데이터 백업 / 복구</span></div>
      <div id="backupSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">🧪 <span>실사용 시뮬레이션 체크리스트</span></div>
      <div id="simulationSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>
      ` : ''}

      ${isAdmin ? `
      <div class="section-title">💳 <span>구독 관리</span></div>
      <div id="subscriptionSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">🔎 <span>감사 로그 (Audit Trail)</span></div>
      <div id="auditLogSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>
      ` : ''}

      <div class="section-title">🔒 <span>보안 & 데이터 보호</span></div>
      <div style="background:linear-gradient(135deg,#f0fdfa 0%,#ecfdf5 100%);border:1px solid #a7f3d0;border-radius:var(--radius);padding:20px 24px;margin-bottom:24px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:22px">🛡️</span>
            <div>
              <strong style="font-size:13px;color:#0f766e">엔드투엔드 암호화</strong>
              <p style="font-size:11px;color:#475569;margin-top:2px;line-height:1.5">HTTPS + JWT + PBKDF2(10만회 해싱) + Web Crypto API</p>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:22px">🌏</span>
            <div>
              <strong style="font-size:13px;color:#0f766e">글로벌 엣지 서버</strong>
              <p style="font-size:11px;color:#475569;margin-top:2px;line-height:1.5">Cloudflare 엔터프라이즈 인프라 / 국내 POP 우선 라우팅</p>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:22px">🔐</span>
            <div>
              <strong style="font-size:13px;color:#0f766e">다중 보안 계층</strong>
              <p style="font-size:11px;color:#475569;margin-top:2px;line-height:1.5">Rate Limiting · XSS · CSRF · IDOR · CSP · HSTS</p>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:22px">🏥</span>
            <div>
              <strong style="font-size:13px;color:#0f766e">병원별 데이터 격리</strong>
              <p style="font-size:11px;color:#475569;margin-top:2px;line-height:1.5">Multi-tenant 아키텍처로 병원 간 데이터 완전 분리</p>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:22px">📦</span>
            <div>
              <strong style="font-size:13px;color:#0f766e">언제든 데이터 내보내기</strong>
              <p style="font-size:11px;color:#475569;margin-top:2px;line-height:1.5">해지 시 전체 데이터 CSV 다운로드 / 벤더 종속 제로</p>
            </div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:22px">📝</span>
            <div>
              <strong style="font-size:13px;color:#0f766e">자동 감사 로그</strong>
              <p style="font-size:11px;color:#475569;margin-top:2px;line-height:1.5">모든 서버 오류 자동 기록 / 의료법 접근 추적 지원</p>
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">${ICONS.users}<span>계정</span></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
        ${isAdmin ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-light);gap:12px;flex-wrap:wrap">
          <div>
            <strong style="font-size:14px">🎓 온보딩 다시 실행</strong>
            <p style="color:var(--text-secondary);font-size:12px;margin:4px 0 0">병원 기본 설정을 처음부터 다시 진행합니다</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="rerunOnboarding">온보딩 재실행</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-light);gap:12px;flex-wrap:wrap">
          <div>
            <strong style="font-size:14px;color:#d97706">✨ 샘플 데이터 주입</strong>
            <p style="color:var(--text-secondary);font-size:12px;margin:4px 0 0">3개월치 데모 데이터를 추가합니다 (환자 40명·상담 28건·콜 60건 등)</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="injectSampleBtn" style="background:#fef3c7;border-color:#fbbf24;color:#92400e">샘플 주입</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-light);gap:12px;flex-wrap:wrap">
          <div>
            <strong style="font-size:14px;color:#dc2626">🗑️ 샘플 데이터 삭제</strong>
            <p style="color:var(--text-secondary);font-size:12px;margin:4px 0 0">주입된 샘플 데이터만 전부 제거합니다 (원래 상태로 복구)</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="clearSampleBtn" style="background:#fee2e2;border-color:#fca5a5;color:#991b1b">샘플 삭제</button>
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
      renderChairs();
      renderCoreTreatments(hospitalSettings);
      renderCoreRegions(hospitalSettings);
      renderBackup();
      renderSimulation();
    }
    if (isAdmin) { renderAuditLogs(); renderSubscription(); }
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

/* ═══ 진료 유닛 관리 (체어/베드/진료실/수술실 등 범용) ═══ */
const UNIT_TYPES = [
  { value: 'chair',   label: '체어',   icon: '💺', color: '#0ea5e9', desc: '치과 등 의자형' },
  { value: 'bed',     label: '베드',   icon: '🛏️', color: '#8b5cf6', desc: '피부과·내과 등 침대형' },
  { value: 'room',    label: '진료실', icon: '🚪', color: '#22c55e', desc: '일반 진료실/처치실' },
  { value: 'surgery', label: '수술실', icon: '🔬', color: '#ef4444', desc: '수술실/시술실' },
  { value: 'consult', label: '상담실', icon: '💬', color: '#f59e0b', desc: '상담 전용 공간' },
  { value: 'other',   label: '기타',   icon: '🏷️', color: '#94a3b8', desc: '기타 공간' },
];

function getUnitTypeMeta(t) {
  return UNIT_TYPES.find(u => u.value === t) || UNIT_TYPES[0];
}

async function renderChairs() {
  const section = document.getElementById('chairsSection');
  if (!section) return;
  const isEditable = ['admin','manager'].includes(state.user.role);

  let chairs = [];
  try {
    chairs = await api('/api/protected/chairs') || [];
  } catch(e) {
    section.innerHTML = `<div style="color:#ef4444;font-size:13px">로딩 실패: ${esc(e.message)}</div>`;
    return;
  }

  function renderList() {
    // 유형별 그룹핑
    const grouped = {};
    chairs.forEach(c => {
      const t = c.unit_type || 'chair';
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(c);
    });
    Object.values(grouped).forEach(arr => arr.sort((a,b) => a.chair_number - b.chair_number));

    section.innerHTML = `
      <div style="margin-bottom:14px">
        <p style="font-size:12px;color:var(--text-muted);line-height:1.6">
          진료 유닛(체어·베드·진료실·수술실 등)을 등록해두면 <strong>진료보드, 환자등록</strong>에서 드롭다운으로 선택할 수 있습니다.<br>
          진료과(치과·피부과·내과·외과 등)에 맞춰 유형을 선택하세요.
        </p>
      </div>

      ${Object.keys(grouped).length ? UNIT_TYPES.filter(t => grouped[t.value]?.length).map(t => `
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:700;color:${t.color};margin-bottom:6px;display:flex;align-items:center;gap:6px">
            <span>${t.icon}</span><span>${t.label}</span>
            <span style="color:var(--text-muted);font-weight:500">· ${grouped[t.value].length}개</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${grouped[t.value].map(ch => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:${t.color}11;border:1px solid ${t.color}55;border-radius:24px;font-size:13px">
                <span style="font-size:16px">${t.icon}</span>
                <span style="font-weight:700;color:${t.color}">${esc(String(ch.chair_number))}번</span>
                ${ch.room_name ? `<span style="font-size:11px;color:#64748b">(${esc(ch.room_name)})</span>` : ''}
                ${isEditable ? `<button class="ch-del-btn" data-id="${esc(ch.id)}" data-label="${t.label} ${esc(String(ch.chair_number))}번" title="삭제" style="width:20px;height:20px;border:none;background:transparent;cursor:pointer;color:#ef4444;font-size:14px;padding:0;display:flex;align-items:center;justify-content:center">×</button>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('') : '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;background:var(--bg);border-radius:8px;margin-bottom:16px">등록된 진료 유닛이 없습니다. 아래에서 추가해주세요.</div>'}

      ${isEditable ? `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius);padding:14px;margin-top:12px">
          <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:10px">➕ 진료 유닛 추가</div>
          <div style="display:grid;grid-template-columns:1fr 100px 1.5fr auto;gap:8px;align-items:end">
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px">유형 *</label>
              <select class="form-input" id="chType" style="font-size:13px">
                ${UNIT_TYPES.map(t => `<option value="${t.value}">${t.icon} ${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px">번호 *</label>
              <input class="form-input" type="number" id="chNumber" min="1" max="999" placeholder="1" style="font-size:13px">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label style="font-size:11px">이름/설명 (선택)</label>
              <input class="form-input" id="chRoom" placeholder="예: VIP룸, 임플란트 전용, 처치실A" style="font-size:13px">
            </div>
            <button class="btn btn-primary btn-sm" id="chAddBtn" style="height:36px">추가</button>
          </div>
          <div style="font-size:11px;color:#166534;margin-top:10px;line-height:1.6">
            💡 <strong>Tip:</strong> 유형 + 번호만 적어도 됩니다. 같은 유형 내에서만 번호 중복이 차단됩니다 (예: 체어 1번 / 수술실 1번 동시 가능).<br>
            예시: 치과 → "체어 1번"·"수술실 1번"·"상담실 1번" / 피부과 → "베드 1번"·"진료실 1번"·"수술실 1번"
          </div>
        </div>
      ` : ''}
    `;

    if (isEditable) {
      document.getElementById('chAddBtn')?.addEventListener('click', async () => {
        const typeEl = document.getElementById('chType');
        const numEl = document.getElementById('chNumber');
        const roomEl = document.getElementById('chRoom');
        const unitType = typeEl?.value || 'chair';
        const num = parseInt(numEl?.value);
        if (!num || num < 1) { toast('번호를 입력해주세요', 'error'); return; }
        // 같은 유형 내 중복 차단
        if (chairs.some(c => (c.unit_type||'chair') === unitType && c.chair_number === num)) {
          const meta = getUnitTypeMeta(unitType);
          toast(`${meta.label} ${num}번이 이미 있습니다`, 'error');
          return;
        }
        const btn = document.getElementById('chAddBtn'); btn.disabled = true;
        try {
          await api('/api/protected/chairs', {
            method: 'POST',
            json: { chair_number: num, room_name: roomEl?.value?.trim() || '', unit_type: unitType }
          });
          chairs = await api('/api/protected/chairs') || [];
          renderList();
          const meta = getUnitTypeMeta(unitType);
          toast(`✅ ${meta.label} ${num}번 추가됨`, 'success');
        } catch(e) { toast(e.message, 'error'); }
        const b2 = document.getElementById('chAddBtn'); if (b2) b2.disabled = false;
      });

      section.querySelectorAll('.ch-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const label = btn.dataset.label;
          if (!confirm(`${label}을 삭제하시겠습니까?`)) return;
          try {
            await api(`/api/protected/chairs/${id}`, { method: 'DELETE' });
            chairs = chairs.filter(c => c.id !== id);
            renderList();
            toast(`${label} 삭제됨`, 'info');
          } catch(e) { toast(e.message, 'error'); }
        });
      });
    }
  }

  renderList();
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

/* ═══ 데이터 백업 / 복구 ═══ */

// JSZip 동적 로더 (초기 번들 사이즈 영향 0)
/* ═══ 감사 로그 (Audit Trail) — v5.8 ═══ */
const AUDIT_ACTION_META = {
  'auth.login': { icon: '🔑', label: '로그인' },
  'auth.join': { icon: '🤝', label: '직원 합류' },
  'hr.role_change': { icon: '⚠️', label: '권한 변경' },
  'hr.status_change': { icon: '👥', label: '재직상태 변경' },
  'hr.invite_create': { icon: '✉️', label: '초대코드 생성' },
  'hr.invite_revoke': { icon: '🚫', label: '초대코드 취소' },
  'patient.delete': { icon: '🗑️', label: '환자 비활성화' },
  'funnel.delete': { icon: '🗑️', label: '퍼널 환자 삭제' },
  'referral.delete': { icon: '🗑️', label: '소개관계 삭제' },
  'review.delete': { icon: '🗑️', label: '리뷰 삭제' },
  'leave.approve': { icon: '✅', label: '연차 승인' },
  'leave.reject': { icon: '❌', label: '연차 반려' },
  'leave.cancel': { icon: '↩️', label: '연차 취소(타인)' },
  'admin.export': { icon: '📦', label: '데이터 내보내기' },
  'billing.card_registered': { icon: '💳', label: '결제 카드 등록' },
  'billing.subscribe': { icon: '🛒', label: '구독 시작' },
  'billing.cancel': { icon: '🚫', label: '구독 해지' },
};

let _auditState = { action: '', offset: 0, limit: 30 };

async function renderAuditLogs() {
  const section = document.getElementById('auditLogSection');
  if (!section) return;
  let data;
  try {
    const q = new URLSearchParams({ limit: _auditState.limit, offset: _auditState.offset });
    if (_auditState.action) q.set('action', _auditState.action);
    data = await api('/api/protected/admin/audit-logs?' + q.toString());
  } catch(e) {
    section.innerHTML = `<div style="color:#ef4444;font-size:13px">감사 로그 로딩 실패: ${esc(e.message)}</div>`;
    return;
  }
  const logs = data.logs || [];
  const total = data.total || 0;
  const page = Math.floor(_auditState.offset / _auditState.limit) + 1;
  const pages = Math.max(1, Math.ceil(total / _auditState.limit));

  const filterOptions = ['', ...Object.keys(AUDIT_ACTION_META)].map(a => {
    const label = a === '' ? '전체 액션' : `${AUDIT_ACTION_META[a].icon} ${AUDIT_ACTION_META[a].label}`;
    return `<option value="${a}" ${_auditState.action === a ? 'selected' : ''}>${label}</option>`;
  }).join('');

  section.innerHTML = `
    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
      권한 변경 · 계정 상태 · 데이터 삭제 · 내보내기 등 민감 작업이 자동 기록됩니다. (원장 전용, 총 ${total.toLocaleString()}건)
    </p>
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap">
      <select id="auditActionFilter" class="input" style="width:auto;font-size:12px;padding:6px 10px">${filterOptions}</select>
      <button class="btn btn-outline btn-sm" id="auditRefreshBtn">🔄 새로고침</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-secondary)">${page} / ${pages} 페이지</span>
      <button class="btn btn-outline btn-sm" id="auditPrevBtn" ${page <= 1 ? 'disabled' : ''}>◀</button>
      <button class="btn btn-outline btn-sm" id="auditNextBtn" ${page >= pages ? 'disabled' : ''}>▶</button>
    </div>
    <div style="max-height:420px;overflow-y:auto;border:1px solid var(--border-light);border-radius:8px">
      ${logs.length === 0 ? '<div style="padding:24px;text-align:center;font-size:13px;color:var(--text-secondary)">기록이 없습니다</div>' :
        logs.map(l => {
          const meta = AUDIT_ACTION_META[l.action] || { icon: '📋', label: l.action };
          const time = (l.created_at || '').replace('T', ' ').slice(0, 16);
          return `<div style="display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border-light);align-items:flex-start">
            <span style="font-size:16px;flex-shrink:0">${meta.icon}</span>
            <div style="min-width:0;flex:1">
              <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
                <strong style="font-size:12px">${esc(meta.label)}</strong>
                <span style="font-size:11px;color:var(--text-secondary)">${esc(l.actor_name || l.actor_id || '?')} (${esc(l.actor_role || '-')})</span>
                <span style="font-size:11px;color:var(--text-secondary);margin-left:auto">${esc(time)} · ${esc(l.ip_address || '')}</span>
              </div>
              ${l.summary ? `<div style="font-size:12px;color:var(--text-primary);margin-top:2px">${esc(l.summary)}</div>` : ''}
            </div>
          </div>`;
        }).join('')}
    </div>`;

  document.getElementById('auditActionFilter')?.addEventListener('change', (e) => {
    _auditState.action = e.target.value; _auditState.offset = 0; renderAuditLogs();
  });
  document.getElementById('auditRefreshBtn')?.addEventListener('click', () => renderAuditLogs());
  document.getElementById('auditPrevBtn')?.addEventListener('click', () => {
    _auditState.offset = Math.max(0, _auditState.offset - _auditState.limit); renderAuditLogs();
  });
  document.getElementById('auditNextBtn')?.addEventListener('click', () => {
    _auditState.offset += _auditState.limit; renderAuditLogs();
  });
}

/* ═══ v5.9 구독 관리 (원장 전용) ═══ */
const PLAN_LABELS = {
  starter: { name: 'Starter', color: '#64748b' },
  growth: { name: 'Growth', color: '#0f766e' },
  enterprise: { name: 'Enterprise', color: '#7c3aed' },
  founding: { name: 'Founding Member 🎉', color: '#d97706' },
};
const SUB_STATUS_LABELS = {
  trial: { label: '무료 체험 중', bg: '#dbeafe', fg: '#1d4ed8' },
  active: { label: '구독 중', bg: '#d1fae5', fg: '#047857' },
  past_due: { label: '결제 실패', bg: '#fee2e2', fg: '#b91c1c' },
  canceled: { label: '해지됨', bg: '#f1f5f9', fg: '#64748b' },
};

async function renderSubscription() {
  const section = document.getElementById('subscriptionSection');
  if (!section) return;
  let s;
  try { s = await api('/api/protected/billing/status'); }
  catch(e) { section.innerHTML = `<div style="color:#ef4444;font-size:13px">구독 정보 로딩 실패: ${esc(e.message)}</div>`; return; }

  if (!s.configured) {
    section.innerHTML = `<div style="font-size:13px;color:var(--text-secondary)">구독 시스템 준비 중입니다. (마이그레이션 미적용)</div>`;
    return;
  }
  const plan = PLAN_LABELS[s.plan] || { name: s.plan, color: '#64748b' };
  const st = SUB_STATUS_LABELS[s.status] || { label: s.status, bg: '#f1f5f9', fg: '#475569' };
  const isFounding = s.plan === 'founding';
  const trialLine = s.status === 'trial'
    ? `<div style="font-size:13px;margin-top:6px;color:${s.trialDaysLeft <= 3 ? '#b91c1c' : 'var(--text-secondary)'}">체험 종료까지 <b>${s.trialDaysLeft}일</b> 남았습니다${s.trialExpired ? ' — 체험이 만료되었습니다. 플랜을 선택해주세요.' : ''}</div>` : '';
  const periodLine = s.currentPeriodEnd && !isFounding
    ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">현재 주기 종료: ${esc((s.currentPeriodEnd || '').slice(0, 10))}</div>` : '';
  const cardLine = s.cardSummary
    ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">등록 카드: ${esc(s.cardSummary)}</div>` : '';

  section.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-size:18px;font-weight:800;color:${plan.color}">${esc(plan.name)}</span>
      <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;background:${st.bg};color:${st.fg}">${st.label}</span>
      ${s.monthlyPrice > 0 ? `<span style="font-size:13px;color:var(--text-secondary)">월 ${Number(s.monthlyPrice).toLocaleString()}원</span>` : ''}
    </div>
    ${trialLine}${periodLine}${cardLine}
    ${isFounding ? `<div style="margin-top:10px;font-size:12px;background:#fef3c7;color:#92400e;padding:8px 12px;border-radius:8px">초기 도입 병원 파운딩 멤버 혜택으로 전 기능을 무기한 이용 중입니다. 감사합니다! 🙇</div>` : `
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <a class="btn btn-outline btn-sm" href="/pricing" target="_blank">📋 요금제 보기</a>
      ${s.paymentsReady
        ? `<button class="btn btn-primary btn-sm" id="subUpgradeBtn">💳 ${s.status === 'active' ? '플랜 변경' : '구독 시작'}</button>`
        : `<button class="btn btn-secondary btn-sm" id="subContactBtn">📬 도입 문의 (결제 준비중)</button>`}
      ${s.status === 'active' ? `<button class="btn btn-outline btn-sm" id="subCancelBtn" style="color:#b91c1c;border-color:#fca5a5">구독 해지</button>` : ''}
    </div>`}
  `;

  document.getElementById('subContactBtn')?.addEventListener('click', () => {
    location.href = 'mailto:contact@patientfunnel.kr?subject=Patient%20Funnel%20OS%20도입%20문의';
  });
  document.getElementById('subUpgradeBtn')?.addEventListener('click', () => {
    toast('요금제 페이지에서 플랜을 선택한 뒤 도입 문의를 남겨주세요. 카드 자동결제는 공식 오픈 시 활성화됩니다.', 'info');
    window.open('/pricing', '_blank');
  });
  document.getElementById('subCancelBtn')?.addEventListener('click', async () => {
    if (!confirm('구독을 해지하시겠습니까? 현재 결제 주기 종료일까지 이용 가능합니다.')) return;
    try {
      const r = await api('/api/protected/billing/cancel', { method: 'POST', json: {} });
      toast(r.message || '해지되었습니다', 'info');
      renderSubscription();
    } catch(e) { toast('오류: ' + e.message, 'error'); }
  });
}

let _jszipPromise = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (_jszipPromise) return _jszipPromise;
  _jszipPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error('JSZip 로드 실패 (네트워크 확인)'));
    document.head.appendChild(s);
  });
  return _jszipPromise;
}

async function renderBackup() {
  const section = document.getElementById('backupSection');
  if (!section) return;

  // 매니페스트 로드
  let manifest;
  try {
    manifest = await api('/api/protected/admin/backup/manifest');
  } catch(e) {
    section.innerHTML = `<div style="color:#ef4444;font-size:13px">백업 정보 로딩 실패: ${esc(e.message)}</div>`;
    return;
  }
  const tables = manifest.tables || [];
  const totalRows = tables.reduce((s, t) => s + (t.count || 0), 0);

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <div>
        <strong style="font-size:14px">📦 전체 데이터 ZIP 백업</strong>
        <p style="color:var(--text-secondary);font-size:12px;margin:4px 0 0;line-height:1.5">
          체크된 테이블을 CSV로 묶어 한 번에 다운로드합니다.<br>
          총 <strong style="color:#0f766e">${totalRows.toLocaleString()}</strong>건의 레코드 백업 가능 · Excel 호환 (UTF-8 BOM)
        </p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="bkSelectAll">전체 선택</button>
        <button class="btn btn-secondary btn-sm" id="bkSelectNone">전체 해제</button>
      </div>
    </div>

    <div id="bkTableList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:16px">
      ${tables.map(t => `
        <label class="bk-row" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border-light);border-radius:8px;cursor:pointer;background:#fafafa">
          <input type="checkbox" class="bk-check" data-table="${esc(t.key)}" checked style="width:16px;height:16px;cursor:pointer">
          <span style="font-size:18px">${t.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${esc(t.label)}</div>
            <div style="font-size:11px;color:var(--text-secondary)">${(t.count || 0).toLocaleString()}건 · ${esc(t.desc)}</div>
          </div>
        </label>
      `).join('')}
    </div>

    <div id="bkProgress" style="display:none;margin-bottom:12px;padding:12px;background:#f0fdfa;border:1px solid #a7f3d0;border-radius:8px;font-size:12px">
      <div id="bkProgressText" style="margin-bottom:6px">준비 중...</div>
      <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
        <div id="bkProgressBar" style="height:100%;background:linear-gradient(90deg,#10b981,#0f766e);width:0%;transition:width .3s"></div>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
      <button class="btn btn-primary" id="bkRunBtn">📦 ZIP 백업 다운로드</button>
      <button class="btn btn-secondary" id="bkHistoryBtn">📋 백업 이력 보기</button>
    </div>

    <details style="border-top:1px solid var(--border-light);padding-top:16px">
      <summary style="cursor:pointer;font-size:13px;font-weight:600;color:#475569">ℹ️ 복구 / 데이터 이전 안내</summary>
      <div style="margin-top:12px;font-size:12px;color:#64748b;line-height:1.7;background:#f8fafc;padding:12px;border-radius:8px">
        <strong>📥 복구 방법</strong><br>
        다운받은 ZIP을 풀면 테이블별 CSV가 들어 있습니다. 각 CSV는 Excel에서 바로 열리며,
        다른 시스템으로 이전하거나 백업 보관용으로 사용할 수 있습니다.<br><br>
        <strong>⚠️ 운영 권장</strong><br>
        • 월 1회 이상 백업을 권장합니다<br>
        • 백업 파일은 별도 클라우드(Google Drive, Dropbox 등)에 보관하세요<br>
        • 환자 정보가 포함되므로 <strong>암호화된 저장소</strong>에 보관하세요<br>
        • 모든 백업 작업은 자동으로 감사 로그에 기록됩니다
      </div>
    </details>
  `;

  // 전체 선택/해제
  const checks = () => section.querySelectorAll('.bk-check');
  document.getElementById('bkSelectAll').addEventListener('click', () => {
    checks().forEach(c => c.checked = true);
  });
  document.getElementById('bkSelectNone').addEventListener('click', () => {
    checks().forEach(c => c.checked = false);
  });

  // 백업 실행
  document.getElementById('bkRunBtn').addEventListener('click', () => runBackup(tables));

  // 이력 보기
  document.getElementById('bkHistoryBtn').addEventListener('click', openBackupHistory);
}

async function runBackup(allTables) {
  const section = document.getElementById('backupSection');
  const selected = Array.from(section.querySelectorAll('.bk-check'))
    .filter(c => c.checked)
    .map(c => c.dataset.table);

  if (selected.length === 0) {
    toast('백업할 테이블을 1개 이상 선택하세요', 'warning');
    return;
  }

  const runBtn = document.getElementById('bkRunBtn');
  const progress = document.getElementById('bkProgress');
  const progressText = document.getElementById('bkProgressText');
  const progressBar = document.getElementById('bkProgressBar');

  runBtn.disabled = true;
  runBtn.textContent = '⏳ 진행 중...';
  progress.style.display = 'block';

  try {
    progressText.textContent = '📥 JSZip 라이브러리 로딩 중...';
    progressBar.style.width = '5%';
    const JSZip = await loadJSZip();
    const zip = new JSZip();

    // 메타데이터 파일
    const tableMap = Object.fromEntries(allTables.map(t => [t.key, t]));
    const meta = {
      pfm_version: '5.2.3',
      backup_type: 'full_csv_bundle',
      generated_at: new Date().toISOString(),
      generated_by: state.user?.name || state.user?.email || 'unknown',
      hospital_id: state.user?.hospitalId,
      tables: selected.map(k => ({
        key: k,
        label: tableMap[k]?.label,
        row_count: tableMap[k]?.count || 0,
      })),
    };
    zip.file('_BACKUP_INFO.json', JSON.stringify(meta, null, 2));
    zip.file('README.txt',
      'PFM 데이터 백업 패키지\n' +
      '=========================\n\n' +
      `생성 일시: ${new Date().toLocaleString('ko-KR')}\n` +
      `생성자: ${meta.generated_by}\n` +
      `포함 테이블: ${selected.length}개\n\n` +
      '각 CSV 파일은 UTF-8 BOM이 포함되어 있어\n' +
      'Excel에서 한글이 깨지지 않습니다.\n\n' +
      '복구가 필요한 경우 PFM 관리자에게 문의하세요.\n'
    );

    // 테이블별 CSV 다운로드 (v5.7: httpOnly 쿠키 인증)
    let completed = 0;
    for (const tableKey of selected) {
      const tableInfo = tableMap[tableKey];
      progressText.textContent = `📊 ${tableInfo?.icon || ''} ${tableInfo?.label || tableKey} CSV 가져오는 중... (${completed + 1}/${selected.length})`;
      progressBar.style.width = (5 + (90 * completed / selected.length)) + '%';

      const res = await fetch(`/api/protected/admin/export/${tableKey}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        throw new Error(`${tableInfo?.label || tableKey}: ${res.status} ${res.statusText}`);
      }
      const csvText = await res.text();
      zip.file(`${tableKey}_${new Date().toISOString().slice(0, 10)}.csv`, csvText);
      completed++;
    }

    progressText.textContent = '🗜️ ZIP 파일 생성 중...';
    progressBar.style.width = '95%';

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    progressBar.style.width = '100%';
    progressText.textContent = `✅ 완료! (${(blob.size / 1024).toFixed(1)} KB)`;

    // 다운로드 트리거
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pfm-backup_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast(`✅ ${selected.length}개 테이블 백업 완료`, 'success');

    setTimeout(() => {
      progress.style.display = 'none';
      progressBar.style.width = '0%';
    }, 3000);
  } catch (e) {
    progressText.textContent = `❌ 실패: ${e.message}`;
    toast('백업 실패: ' + e.message, 'error');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '📦 ZIP 백업 다운로드';
  }
}

async function openBackupHistory() {
  let logs;
  try {
    logs = await api('/api/protected/admin/export-logs');
  } catch(e) {
    toast('이력 로딩 실패: ' + e.message, 'error');
    return;
  }

  const labelMap = {
    patients: '👥 환자',
    daily_records: '📅 일일기록',
    consult_records: '💬 상담',
    call_records: '📞 콜',
    complaints: '⚠️ 컴플레인',
    kpi_targets: '🎯 KPI',
  };

  const html = `
    <div class="modal-overlay" id="bkHistModal">
      <div class="modal-content" style="max-width:720px">
        <div class="modal-header">
          <h2>📋 백업 / 내보내기 이력</h2>
          <button class="modal-close" data-close>×</button>
        </div>
        <div class="modal-body">
          ${logs.length === 0 ? `
            <div style="text-align:center;padding:40px;color:var(--text-secondary)">
              아직 백업 이력이 없습니다.
            </div>
          ` : `
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">최근 50건</div>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
                  <th style="padding:8px;text-align:left">일시</th>
                  <th style="padding:8px;text-align:left">테이블</th>
                  <th style="padding:8px;text-align:right">건수</th>
                  <th style="padding:8px;text-align:left">작업자</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr style="border-bottom:1px solid var(--border-light)">
                    <td style="padding:8px;color:#475569">${esc(l.created_at?.slice(0,16).replace('T',' ') || '-')}</td>
                    <td style="padding:8px">${esc(labelMap[l.table_name] || l.table_name || '-')}</td>
                    <td style="padding:8px;text-align:right;font-variant-numeric:tabular-nums">${(l.row_count || 0).toLocaleString()}</td>
                    <td style="padding:8px;color:#475569">${esc(l.user_name || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('bkHistModal');
  modal.querySelector('[data-close]').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

/* ═══ 실사용 시뮬레이션 체크리스트 ═══ */

const SIM_STORAGE_KEY = 'pfm_simulation_v1';

// 가상 환자 1명이 통과해야 할 9단계 시나리오
const SIM_SCENARIO = {
  patient: {
    name: '김민지 (가상 환자)',
    age: 35,
    gender: '여',
    source: '인스타그램 광고',
    chief: '왼쪽 어금니 신경치료 문의',
  },
  steps: [
    {
      id: 's1_call_in',
      icon: '📞',
      title: '1단계: 콜 인입 등록',
      menu: '콜 → 인바운드',
      actions: [
        '인바운드 콜 등록 화면 진입',
        '환자명 "김민지", 전화번호, 유입경로 "인스타광고", 문의내용 입력',
        '담당 직원 본인으로 지정 후 저장',
      ],
      verify: [
        '저장 후 콜 목록 최상단에 표시되는가',
        '오늘 날짜·시간이 자동 입력되었는가',
        '대시보드 위젯의 "오늘 인바운드 콜" 카운트가 +1 되는가',
      ],
    },
    {
      id: 's2_patient_register',
      icon: '👤',
      title: '2단계: 환자 등록',
      menu: '환자 → 신규 등록',
      actions: [
        '환자 신규 등록 폼 작성 (이름, 생년월일, 연락처, 주소)',
        '환자 유형: "신환", 유입경로: "인스타광고"',
        '차트번호 자동 생성 또는 수동 입력 후 저장',
      ],
      verify: [
        '환자 목록에서 검색되는가',
        '환자 상세 페이지에서 모든 정보가 정확히 표시되는가',
        '시도/시군구가 핵심지역 KPI에 반영될 위치인가',
      ],
    },
    {
      id: 's3_reservation',
      icon: '📅',
      title: '3단계: 예약 생성',
      menu: '예약',
      actions: [
        '예약 등록 모달 열기',
        '환자 "김민지" 검색해서 선택',
        '예약 날짜·시간·진료유닛(체어/베드/진료실 등) 배정',
        '진료내용 "신경치료 1차" 입력 후 저장',
      ],
      verify: [
        '예약 캘린더에 표시되는가',
        '선택한 진료 유닛에 시간 충돌이 없는가',
        '환자 상세 페이지 "예약" 탭에 노출되는가',
      ],
    },
    {
      id: 's4_arrival',
      icon: '🏥',
      title: '4단계: 내원 / 진료보드',
      menu: '진료보드',
      actions: [
        '예약 시간에 환자 도착 → 진료보드에 "도착" 상태 변경',
        '진료 유닛에 환자 카드 표시 확인',
        '대기시간 시작 기록',
        '진료 시작 → "진료 중" 상태 전환',
      ],
      verify: [
        '진료 유닛 dropdown이 unit_type별로 그룹화되어 보이는가 (체어/베드/진료실)',
        '대기시간이 분 단위로 카운팅되는가',
        '진료 보드 색상/상태가 즉시 업데이트되는가',
      ],
    },
    {
      id: 's5_consult',
      icon: '💬',
      title: '5단계: 상담 기록 + 견적',
      menu: '상담 기록',
      actions: [
        '상담 기록 신규 등록',
        '환자 "김민지" 선택, 진료유형 "신경치료+보철"',
        '주소(Chief complaint) 입력',
        '견적금액 입력 (예: 850,000원)',
        '동의금액 입력 (예: 850,000원) → 동의율 100% 시뮬',
        '결제방식 "카드 일시불" 선택',
        '다음 예약 일자 지정 후 저장',
      ],
      verify: [
        '상담 동의율이 자동 계산되는가 (동의금액/견적금액)',
        '상담 대시보드에 카운트 +1 반영',
        '환자 상세에 상담 이력이 누적되는가',
      ],
    },
    {
      id: 's6_payment',
      icon: '💰',
      title: '6단계: 결제 / 일일기록',
      menu: '일일기록',
      actions: [
        '오늘 일일기록 열기',
        '비급여 매출에 850,000원 추가 입력',
        '신환수 +1 증가 확인',
        '상담 건수 +1 증가 확인',
        '저장',
      ],
      verify: [
        'KPI 대시보드에 오늘 매출이 즉시 반영되는가',
        '월 누적 매출이 KPI 목표 대비 % 업데이트되는가',
        '전일 대비/전주 대비 인사이트 위젯이 정확한가',
      ],
    },
    {
      id: 's7_recall',
      icon: '🔔',
      title: '7단계: 리콜 / 차회 예약',
      menu: '리콜',
      actions: [
        '리콜 메뉴 진입',
        '"김민지" 환자에게 차주 신경치료 2차 예약 안내 발송 시뮬',
        '리콜 대상 목록에 표시되는지 확인',
        '카카오톡 알림 발송 시뮬레이션 (있다면)',
      ],
      verify: [
        '리콜 발송 이력이 환자 상세에 기록되는가',
        '다음 예약 알림이 캘린더에 표시되는가',
      ],
    },
    {
      id: 's8_review',
      icon: '⭐',
      title: '8단계: 리뷰 / NPS',
      menu: '리뷰 관리 / 설문',
      actions: [
        '리뷰 관리 또는 설문 메뉴 진입',
        '김민지 환자에게 리뷰 요청 발송 시뮬',
        '네이버 리뷰 카운트 +1 (일일기록에서 입력 시뮬)',
        'NPS 설문 응답 시뮬 (있다면)',
      ],
      verify: [
        '네이버 리뷰 누적 수가 일일기록과 일치하는가',
        '환자별 리뷰 작성 이력이 추적되는가',
      ],
    },
    {
      id: 's9_analysis',
      icon: '📊',
      title: '9단계: 분석 / 데이터 정합성',
      menu: '대시보드 / KPI / 통계',
      actions: [
        '메인 대시보드에서 오늘 KPI 카드 확인',
        'KPI 통계 → 환자수/매출/상담 모든 지표 검증',
        '환자 통계에서 김민지가 신환에 카운트되었는지',
        '콜 통계에서 인바운드 +1 반영',
        '백업 다운로드 → CSV에 김민지 데이터가 모두 포함되는지',
      ],
      verify: [
        '대시보드 ↔ 환자통계 ↔ KPI ↔ 일일기록 숫자가 모두 일치하는가',
        'CSV 백업의 patients/consult_records/call_records에 김민지 행이 존재하는가',
        '백업 이력 (export_logs)에 자동 기록되었는가',
      ],
    },
  ],
};

function loadSimState() {
  try { return JSON.parse(localStorage.getItem(SIM_STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveSimState(s) {
  localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(s));
}

function renderSimulation() {
  const section = document.getElementById('simulationSection');
  if (!section) return;

  const simState = loadSimState();
  const totalChecks = SIM_SCENARIO.steps.reduce(
    (sum, s) => sum + s.actions.length + s.verify.length, 0
  );
  const doneChecks = Object.values(simState).filter(v => v === true).length;
  const pct = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;

  const p = SIM_SCENARIO.patient;

  section.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <div style="flex:1;min-width:240px">
        <strong style="font-size:14px">🧪 실사용 검증 시나리오</strong>
        <p style="color:var(--text-secondary);font-size:12px;margin:4px 0 0;line-height:1.6">
          가상 환자 <strong style="color:#0f766e">${esc(p.name)} (${p.age}세, ${p.gender})</strong> 1명이<br>
          <span style="color:#475569">콜 인입 → 예약 → 진료 → 상담 → 결제 → 리콜 → 리뷰</span> 전 과정을 통과시켜<br>
          PFM 9단계 데이터 흐름이 막힘없이 작동하는지 검증합니다.
        </p>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--text-secondary)">진행률</div>
        <div style="font-size:28px;font-weight:700;color:${pct === 100 ? '#10b981' : pct > 0 ? '#0f766e' : '#94a3b8'}">${pct}%</div>
        <div style="font-size:11px;color:var(--text-secondary)">${doneChecks} / ${totalChecks}</div>
      </div>
    </div>

    <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-bottom:20px">
      <div style="height:100%;background:linear-gradient(90deg,#10b981,#0f766e);width:${pct}%;transition:width .3s"></div>
    </div>

    <details style="background:#f0fdfa;border:1px solid #a7f3d0;border-radius:8px;padding:12px 14px;margin-bottom:16px">
      <summary style="cursor:pointer;font-size:13px;font-weight:600;color:#0f766e">📋 가상 환자 프로필 (이대로 입력하세요)</summary>
      <div style="margin-top:10px;font-size:12px;color:#475569;line-height:1.8">
        • <strong>이름</strong>: ${esc(p.name)}<br>
        • <strong>나이/성별</strong>: ${p.age}세 / ${p.gender}<br>
        • <strong>유입경로</strong>: ${esc(p.source)}<br>
        • <strong>주소(C.C.)</strong>: ${esc(p.chief)}<br>
        • <strong>가상 견적</strong>: 850,000원 (신경치료 + 보철)
      </div>
    </details>

    <div id="simSteps">
      ${SIM_SCENARIO.steps.map((step, idx) => renderSimStep(step, idx, simState)).join('')}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-light)">
      <button class="btn btn-secondary btn-sm" id="simResetBtn">🔄 체크 초기화</button>
      <button class="btn btn-secondary btn-sm" id="simExportBtn">📄 결과 리포트 내보내기</button>
      ${pct === 100 ? '<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#dcfce7;color:#15803d;border-radius:6px;font-size:13px;font-weight:600">🎉 모든 단계 통과 — 실사용 준비 완료!</span>' : ''}
    </div>
  `;

  // 체크박스 이벤트 (위임)
  section.querySelectorAll('.sim-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const key = e.target.dataset.key;
      const s = loadSimState();
      s[key] = e.target.checked;
      saveSimState(s);
      // 진행률만 다시 그리기
      renderSimulation();
    });
  });

  // 메모 이벤트 (디바운스)
  section.querySelectorAll('.sim-memo').forEach(ta => {
    let timer;
    ta.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const key = e.target.dataset.key;
        const s = loadSimState();
        s[key] = e.target.value;
        saveSimState(s);
      }, 400);
    });
  });

  // 초기화
  document.getElementById('simResetBtn').addEventListener('click', () => {
    if (!confirm('체크 및 메모를 모두 초기화하시겠습니까?')) return;
    localStorage.removeItem(SIM_STORAGE_KEY);
    renderSimulation();
    toast('초기화되었습니다', 'info');
  });

  // 리포트 내보내기
  document.getElementById('simExportBtn').addEventListener('click', () => {
    exportSimReport(simState, pct, doneChecks, totalChecks);
  });
}

function renderSimStep(step, idx, simState) {
  const allKeys = [
    ...step.actions.map((_, i) => `${step.id}_a${i}`),
    ...step.verify.map((_, i) => `${step.id}_v${i}`),
  ];
  const stepDone = allKeys.every(k => simState[k] === true);
  const stepTotal = allKeys.length;
  const stepDoneCount = allKeys.filter(k => simState[k] === true).length;
  const memoKey = `${step.id}_memo`;

  return `
    <details style="border:1px solid ${stepDone ? '#a7f3d0' : 'var(--border-light)'};border-radius:8px;margin-bottom:8px;background:${stepDone ? '#f0fdfa' : '#fff'};overflow:hidden">
      <summary style="cursor:pointer;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;list-style:none">
        <span style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <span style="font-size:20px">${step.icon}</span>
          <span>
            <span style="font-size:13px;font-weight:600;color:${stepDone ? '#15803d' : '#1e293b'}">${stepDone ? '✅ ' : ''}${esc(step.title)}</span>
            <span style="font-size:11px;color:var(--text-secondary);margin-left:6px">📍 ${esc(step.menu)}</span>
          </span>
        </span>
        <span style="font-size:11px;color:#475569;background:${stepDone ? '#dcfce7' : '#f1f5f9'};padding:3px 8px;border-radius:10px">${stepDoneCount} / ${stepTotal}</span>
      </summary>
      <div style="padding:8px 14px 14px;border-top:1px solid var(--border-light)">
        <div style="font-size:11px;font-weight:700;color:#0f766e;margin:8px 0 4px;letter-spacing:.5px">🎯 ACTIONS</div>
        ${step.actions.map((a, i) => {
          const k = `${step.id}_a${i}`;
          const checked = simState[k] === true;
          return `
            <label style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;cursor:pointer;font-size:13px;color:${checked ? '#94a3b8' : '#1e293b'};text-decoration:${checked ? 'line-through' : 'none'}">
              <input type="checkbox" class="sim-check" data-key="${k}" ${checked ? 'checked' : ''} style="margin-top:3px;cursor:pointer">
              <span>${esc(a)}</span>
            </label>
          `;
        }).join('')}

        <div style="font-size:11px;font-weight:700;color:#a16207;margin:12px 0 4px;letter-spacing:.5px">🔍 VERIFY</div>
        ${step.verify.map((v, i) => {
          const k = `${step.id}_v${i}`;
          const checked = simState[k] === true;
          return `
            <label style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;cursor:pointer;font-size:13px;color:${checked ? '#94a3b8' : '#1e293b'};text-decoration:${checked ? 'line-through' : 'none'}">
              <input type="checkbox" class="sim-check" data-key="${k}" ${checked ? 'checked' : ''} style="margin-top:3px;cursor:pointer">
              <span>${esc(v)}</span>
            </label>
          `;
        }).join('')}

        <div style="margin-top:10px">
          <div style="font-size:11px;color:#475569;margin-bottom:4px">📝 발견된 이슈 / 메모</div>
          <textarea class="sim-memo" data-key="${memoKey}" placeholder="이 단계에서 발견된 버그·개선점·특이사항을 기록하세요" style="width:100%;min-height:50px;padding:8px;border:1px solid var(--border-light);border-radius:6px;font-size:12px;resize:vertical;font-family:inherit">${esc(simState[memoKey] || '')}</textarea>
        </div>
      </div>
    </details>
  `;
}

function exportSimReport(simState, pct, doneChecks, totalChecks) {
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push('  PFM 실사용 시뮬레이션 검증 리포트');
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push(`생성 일시: ${new Date().toLocaleString('ko-KR')}`);
  lines.push(`작성자: ${state.user?.name || state.user?.email || '-'}`);
  lines.push(`병원 ID: ${state.user?.hospitalId || '-'}`);
  lines.push('');
  lines.push(`📊 전체 진행률: ${pct}% (${doneChecks}/${totalChecks})`);
  lines.push('');

  const p = SIM_SCENARIO.patient;
  lines.push('━━━ 가상 환자 ━━━');
  lines.push(`이름: ${p.name}`);
  lines.push(`나이/성별: ${p.age}세 / ${p.gender}`);
  lines.push(`유입경로: ${p.source}`);
  lines.push(`주소(C.C.): ${p.chief}`);
  lines.push('');

  SIM_SCENARIO.steps.forEach((step, idx) => {
    const allKeys = [
      ...step.actions.map((_, i) => `${step.id}_a${i}`),
      ...step.verify.map((_, i) => `${step.id}_v${i}`),
    ];
    const stepDoneCount = allKeys.filter(k => simState[k] === true).length;
    const status = stepDoneCount === allKeys.length ? '✅ 통과' : stepDoneCount > 0 ? '⏳ 진행중' : '⬜ 미시작';

    lines.push('');
    lines.push(`━━━ ${step.title} [${status}] ━━━`);
    lines.push(`📍 메뉴: ${step.menu}`);
    lines.push(`진행: ${stepDoneCount}/${allKeys.length}`);
    lines.push('');
    lines.push('  [ACTIONS]');
    step.actions.forEach((a, i) => {
      const checked = simState[`${step.id}_a${i}`] === true;
      lines.push(`  ${checked ? '[x]' : '[ ]'} ${a}`);
    });
    lines.push('');
    lines.push('  [VERIFY]');
    step.verify.forEach((v, i) => {
      const checked = simState[`${step.id}_v${i}`] === true;
      lines.push(`  ${checked ? '[x]' : '[ ]'} ${v}`);
    });

    const memo = simState[`${step.id}_memo`];
    if (memo && memo.trim()) {
      lines.push('');
      lines.push('  [메모]');
      memo.split('\n').forEach(l => lines.push(`  > ${l}`));
    }
  });

  lines.push('');
  lines.push('═══════════════════════════════════════════');
  lines.push('  End of Report');
  lines.push('═══════════════════════════════════════════');

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pfm-simulation-report_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast('✅ 리포트가 다운로드되었습니다', 'success');
}

PFM.modules.settings = { renderSettings };
})(window.PFM);
