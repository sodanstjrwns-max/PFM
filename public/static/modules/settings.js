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
  body.innerHTML = `
    <div style="max-width:720px">
      <div class="section-title">${ICONS.settings}<span>병원 정보</span></div>
      <div id="hospitalInfoSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
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

      <div class="section-title">${ICONS.users}<span>계정</span></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">로그아웃하면 다시 로그인해야 합니다.</p>
        <button class="btn btn-danger" id="settingsLogout">${ICONS.logout} 로그아웃</button>
      </div>
    </div>`;
  document.getElementById('settingsLogout').addEventListener('click', logout);

  // 데이터 로드
  try {
    const [hospitalInfo, hospitalSettings] = await Promise.all([
      api('/api/protected/hospital/info'),
      api('/api/protected/hospital/settings')
    ]);
    renderHospitalInfo(hospitalInfo);
    renderLocationTerms(hospitalSettings);
    renderLocationPresets(hospitalSettings);
  } catch(e) {
    document.getElementById('hospitalInfoSection').innerHTML = `<div style="color:#ef4444;font-size:13px">로딩 실패: ${e.message}</div>`;
  }
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
