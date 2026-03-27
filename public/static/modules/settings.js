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

      <div class="section-title">${ICONS.settings}<span>병원 정보</span></div>
      <div id="hospitalInfoSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      ${isManager ? `
      <div class="section-title">📍 <span>위치 용어 설정</span></div>
      <div id="locationTermsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>

      <div class="section-title">📋 <span>위치 프리셋 관리</span></div>
      <div id="locationPresetsSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>
      </div>
      ` : ''}

      <div class="section-title">${ICONS.users}<span>계정</span></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">로그아웃하면 다시 로그인해야 합니다.</p>
        <button class="btn btn-danger" id="settingsLogout">${ICONS.logout} 로그아웃</button>
      </div>
    </div>`;
  document.getElementById('settingsLogout').addEventListener('click', logout);

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
      renderLocationTerms(hospitalSettings);
      renderLocationPresets(hospitalSettings);
    }
  } catch(e) {
    document.getElementById('myProfileSection').innerHTML = `<div style="color:#ef4444;font-size:13px">로딩 실패: ${e.message}</div>`;
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

    <div style="margin-top:8px">
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
      <span id="myProfileSaveStatus" style="font-size:11px;color:var(--text-muted)"></span>
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
    ${isAdmin ? `<button class="btn btn-primary btn-sm" id="hiSaveBtn" style="margin-top:12px">💾 병원 정보 저장</button>` : ''}`;

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
        <span id="ltSaveStatus" style="font-size:11px;color:var(--text-muted)"></span>
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
              <div style="flex:1">
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

PFM.modules.settings = { renderSettings };
})(window.PFM);
