/* ═══ Module: Patient Funnel (환자 퍼널 10단계) ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, esc, toast, showModal, closeModal, formatPrice, initKanbanDnD } = PFM;

const STAGES = [
  { key: 'awareness',    label: '인지',  icon: '👁️', color: '#94a3b8', desc: '병원 존재를 알게 됨' },
  { key: 'interest',     label: '관심',  icon: '💡', color: '#f59e0b', desc: '검색, SNS 탐색' },
  { key: 'appointment',  label: '예약',  icon: '📅', color: '#3b82f6', desc: '전화/온라인 예약' },
  { key: 'visit',        label: '방문',  icon: '🏥', color: '#8b5cf6', desc: '실제 내원' },
  { key: 'waiting',      label: '대기',  icon: '⏳', color: '#06b6d4', desc: '대기실 경험' },
  { key: 'diagnosis',    label: '진단',  icon: '🔍', color: '#10b981', desc: '검사, 진단' },
  { key: 'consultation', label: '상담',  icon: '💬', color: '#f97316', desc: '치료계획 상담' },
  { key: 'treatment',    label: '진료',  icon: '🦷', color: '#ef4444', desc: '실제 치료' },
  { key: 'management',   label: '관리',  icon: '📋', color: '#22c55e', desc: '사후관리, 정기검진' },
  { key: 'referral',     label: '소개',  icon: '🤝', color: '#ec4899', desc: '지인 소개' },
];

const SOURCES = ['네이버','인스타그램','구글','지인소개','블로그','유튜브','오프라인','기타'];

async function renderFunnel(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addFunnelBtn">➕ 환자 등록</button>`;

  body.innerHTML = `<div id="funnelPage"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  const [statsData, patients] = await Promise.all([
    api('/api/protected/funnel/stats'),
    api('/api/protected/funnel'),
  ]);

  renderFunnelPage(body, statsData, patients);

  document.getElementById('addFunnelBtn')?.addEventListener('click', () => openAddPatient(body, actions));
}

function renderFunnelPage(body, stats, patients) {
  const page = document.getElementById('funnelPage');
  const stageMap = stats.stages || {};
  const total = Object.values(stageMap).reduce((a, b) => a + b, 0);
  const maxVal = Math.max(1, ...Object.values(stageMap));

  // 단계별 환자 그룹
  const byStage = {};
  STAGES.forEach(s => { byStage[s.key] = []; });
  patients.forEach(p => { if (byStage[p.current_stage]) byStage[p.current_stage].push(p); });

  page.innerHTML = `
    <!-- 퍼널 시각화 -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:800">🔄 Patient Funnel</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">환자 여정 10단계 — 인지부터 소개까지</div>
        </div>
        <div style="display:flex;gap:12px;font-size:13px">
          <span style="color:var(--text-muted)">총 <strong style="color:var(--text)">${total}</strong>명</span>
        </div>
      </div>

      <!-- 퍼널 차트 (깔때기형) -->
      <div style="max-width:700px;margin:0 auto">
        ${STAGES.map((st, i) => {
          const count = stageMap[st.key] || 0;
          const pct = total > 0 ? Math.round(count / total * 100) : 0;
          const width = total > 0 ? Math.max(20, 100 - i * 7) : 60;
          const convRate = i > 0 && (stageMap[STAGES[i-1].key]||0) > 0
            ? Math.round(count / stageMap[STAGES[i-1].key] * 100) : null;
          return `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;cursor:pointer" class="funnel-row" data-stage="${st.key}">
              <div style="width:70px;text-align:right;font-size:12px;display:flex;align-items:center;justify-content:end;gap:4px">
                <span>${st.icon}</span>
                <span style="font-weight:600;color:${st.color}">${st.label}</span>
              </div>
              <div style="flex:1;position:relative">
                <div style="width:${width}%;height:32px;background:${st.color}20;border-radius:6px;margin:0 auto;position:relative;overflow:hidden;border:1px solid ${st.color}33;transition:all .2s">
                  <div style="height:100%;width:${count > 0 ? Math.max(5, count/maxVal*100) : 0}%;background:${st.color};border-radius:5px;transition:width .5s"></div>
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${count>0?'white':st.color};text-shadow:${count>0?'0 1px 2px rgba(0,0,0,0.3)':'none'};mix-blend-mode:${count>0?'normal':'normal'}">${count}</div>
                </div>
              </div>
              <div style="width:50px;text-align:right;font-size:11px;color:var(--text-muted)">
                ${convRate !== null ? `<span style="color:${convRate>=70?'#22c55e':convRate>=40?'#f59e0b':'#ef4444'}">${convRate}%</span>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>

      <!-- 요약 금액 -->
      <div style="display:flex;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-light)">
        ${[
          { label: '예상 매출', value: stats.estimated, color: '#3b82f6' },
          { label: '동의 금액', value: stats.agreed, color: '#22c55e' },
          { label: '수납 완료', value: stats.paid, color: '#f59e0b' },
        ].map(s => `
          <div style="flex:1;text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">${s.label}</div>
            <div style="font-size:16px;font-weight:800;color:${s.color};margin-top:2px">${formatPrice(s.value)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 단계별 환자 목록 (탭) -->
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px" id="funnelTabs">
      <button class="btn btn-sm funnel-tab active" data-stage="all" style="font-size:11px">전체 (${total})</button>
      ${STAGES.map(st => `
        <button class="btn btn-sm funnel-tab" data-stage="${st.key}" style="font-size:11px;${(stageMap[st.key]||0)>0?`border-color:${st.color}33`:''}">${st.icon} ${st.label} (${stageMap[st.key]||0})</button>
      `).join('')}
    </div>
    <div id="funnelList"></div>
  `;

  let currentTab = 'all';

  function renderPatientList(stage) {
    const listEl = document.getElementById('funnelList');
    const filtered = stage === 'all' ? patients : byStage[stage] || [];

    if (!filtered.length) {
      listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">등록된 환자가 없습니다</div>`;
      return;
    }

    listEl.innerHTML = `
      <div style="display:grid;gap:8px">
        ${filtered.map(p => {
          const st = STAGES.find(s => s.key === p.current_stage) || STAGES[0];
          return `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .15s;border-left:4px solid ${st.color}" class="funnel-patient" data-id="${p.id}" onmouseenter="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseleave="this.style.boxShadow=''">
              <div style="width:36px;height:36px;border-radius:50%;background:${st.color}15;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${st.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-weight:700;font-size:14px">${esc(p.patient_name)}</span>
                  <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:${st.color}15;color:${st.color};font-weight:600">${st.label}</span>
                  ${p.source ? `<span style="font-size:10px;color:var(--text-muted)">via ${esc(p.source)}</span>` : ''}
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px">
                  ${p.treatment_type ? `🦷 ${esc(p.treatment_type)}` : ''}
                  ${p.doctor_name ? ` · 🩺 ${esc(p.doctor_name)}` : ''}
                  ${p.estimated_amount ? ` · 💰 ${formatPrice(p.estimated_amount)}` : ''}
                </div>
              </div>
              <div style="display:flex;gap:4px">
                ${STAGES.map((s, si) => {
                  const ci = STAGES.findIndex(x => x.key === p.current_stage);
                  const done = si <= ci;
                  return `<div style="width:8px;height:8px;border-radius:50%;background:${done ? s.color : '#e5e7eb'}" title="${s.label}"></div>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    listEl.querySelectorAll('.funnel-patient').forEach(el => {
      el.addEventListener('click', () => openPatientDetail(el.dataset.id, patients, body, document.getElementById('headerActions')));
    });
  }

  renderPatientList('all');

  // 탭 이벤트
  document.querySelectorAll('.funnel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.funnel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.stage;
      renderPatientList(currentTab);
    });
  });

  // 퍼널 행 클릭 시 해당 탭으로
  page.querySelectorAll('.funnel-row').forEach(row => {
    row.addEventListener('click', () => {
      const stage = row.dataset.stage;
      document.querySelectorAll('.funnel-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.stage === stage);
      });
      renderPatientList(stage);
    });
  });
}

async function openAddPatient(body, actions) {
  let doctors = [];
  try { doctors = await api('/api/protected/doctors'); } catch(e) {}

  showModal('➕ 환자 퍼널 등록', `
    <div class="form-group"><label>환자명 <span style="color:var(--danger)">*</span></label><input class="form-input" id="fpName" placeholder="홍길동"></div>
    <div class="form-grid">
      <div class="form-group"><label>연락처</label><input class="form-input" id="fpPhone" placeholder="010-0000-0000"></div>
      <div class="form-group"><label>유입 경로</label>
        <select class="form-input" id="fpSource"><option value="">선택</option>${SOURCES.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>현재 단계</label>
        <select class="form-input" id="fpStage">${STAGES.map(s => `<option value="${s.key}">${s.icon} ${s.label}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>진료 유형</label>
        <input class="form-input" id="fpType" placeholder="예: 임플란트, 교정, 보존">
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>담당 원장</label>
        <select class="form-input" id="fpDoctor"><option value="">미지정</option>${doctors.map(d => `<option value="${d.id}">${h(d.name)}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>예상 금액</label>
        <input class="form-input" type="number" id="fpAmount" placeholder="0">
      </div>
    </div>
    <div class="form-group"><label>메모</label><textarea class="form-input" id="fpNotes" rows="2" placeholder="특이사항"></textarea></div>
    <button class="btn btn-primary" id="fpSubmit" style="width:100%;margin-top:12px">등록</button>
  `);

  document.getElementById('fpSubmit').addEventListener('click', async () => {
    const name = document.getElementById('fpName')?.value?.trim();
    if (!name) { toast('환자명을 입력해주세요', 'error'); return; }
    try {
      await api('/api/protected/funnel', { method: 'POST', json: {
        patient_name: name,
        phone: document.getElementById('fpPhone')?.value?.trim() || '',
        source: document.getElementById('fpSource')?.value || '',
        current_stage: document.getElementById('fpStage')?.value || 'awareness',
        treatment_type: document.getElementById('fpType')?.value?.trim() || '',
        assigned_doctor: document.getElementById('fpDoctor')?.value || '',
        estimated_amount: parseInt(document.getElementById('fpAmount')?.value) || 0,
        notes: document.getElementById('fpNotes')?.value?.trim() || '',
      }});
      toast('환자가 퍼널에 등록되었습니다', 'success');
      closeModal();
      renderFunnel(body, actions);
    } catch(e) { toast(e.message, 'error'); }
  });
}

async function openPatientDetail(patientId, patients, body, actions) {
  const p = patients.find(x => x.id === patientId);
  if (!p) return;
  const st = STAGES.find(s => s.key === p.current_stage) || STAGES[0];

  showModal(`${st.icon} ${esc(p.patient_name)}`, `
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:4px;margin-bottom:12px">
        ${STAGES.map(s => {
          const ci = STAGES.findIndex(x => x.key === p.current_stage);
          const si = STAGES.findIndex(x => x.key === s.key);
          const done = si <= ci;
          return `<div style="flex:1;height:6px;border-radius:3px;background:${done ? s.color : '#e5e7eb'}" title="${s.label}"></div>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin-bottom:8px">
        <span style="font-size:12px;padding:4px 12px;border-radius:12px;background:${st.color}15;color:${st.color};font-weight:700">${st.icon} ${st.label} 단계</span>
      </div>
    </div>
    <div class="form-group"><label>단계 변경</label>
      <select class="form-input" id="pdStage">${STAGES.map(s => `<option value="${s.key}" ${s.key===p.current_stage?'selected':''}>${s.icon} ${s.label} — ${s.desc}</option>`).join('')}</select>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>예상 금액</label><input class="form-input" type="number" id="pdEstimated" value="${p.estimated_amount||0}"></div>
      <div class="form-group"><label>동의 금액</label><input class="form-input" type="number" id="pdAgreed" value="${p.agreed_amount||0}"></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>수납 금액</label><input class="form-input" type="number" id="pdPaid" value="${p.paid_amount||0}"></div>
      <div class="form-group"><label>진료 유형</label><input class="form-input" id="pdType" value="${esc(p.treatment_type||'')}"></div>
    </div>
    <div class="form-group"><label>메모</label><textarea class="form-input" id="pdNotes" rows="2">${esc(p.notes||'')}</textarea></div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="pdSave" style="flex:1">💾 저장</button>
      <button class="btn btn-danger" id="pdDelete">🗑 삭제</button>
    </div>
  `);

  document.getElementById('pdSave').addEventListener('click', async () => {
    try {
      await api('/api/protected/funnel/' + patientId, { method: 'PUT', json: {
        current_stage: document.getElementById('pdStage')?.value,
        estimated_amount: parseInt(document.getElementById('pdEstimated')?.value)||0,
        agreed_amount: parseInt(document.getElementById('pdAgreed')?.value)||0,
        paid_amount: parseInt(document.getElementById('pdPaid')?.value)||0,
        treatment_type: document.getElementById('pdType')?.value?.trim()||'',
        notes: document.getElementById('pdNotes')?.value?.trim()||'',
      }});
      toast('업데이트 되었습니다', 'success');
      closeModal();
      renderFunnel(body, actions);
    } catch(e) { toast(e.message, 'error'); }
  });

  document.getElementById('pdDelete').addEventListener('click', async () => {
    if (!confirm(`"${h(p.patient_name)}" 환자를 퍼널에서 삭제하시겠습니까?`)) return;
    try {
      await api('/api/protected/funnel/' + patientId, { method: 'DELETE' });
      toast('삭제되었습니다', 'success');
      closeModal();
      renderFunnel(body, actions);
    } catch(e) { toast(e.message, 'error'); }
  });
}

PFM.modules.funnel = { renderFunnel };
})(window.PFM);
