/* ═══ Module: Patient Funnel 10단계 — 이탈률 분석 + 구체적 액션 ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, esc, toast, showModal, closeModal, formatPrice, initKanbanDnD, navigate, canManage } = PFM;

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

let funnelState = {
  period: 'month',
  tab: 'analytics', // analytics | patients
};

async function renderFunnel(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addFunnelBtn">➕ 환자 등록</button>`;

  body.innerHTML = `
    <div class="funnel-controls">
      <div class="funnel-tabs">
        <button class="funnel-tab-btn ${funnelState.tab === 'analytics' ? 'active' : ''}" data-tab="analytics">📊 퍼널 분석</button>
        <button class="funnel-tab-btn ${funnelState.tab === 'patients' ? 'active' : ''}" data-tab="patients">👥 환자 목록</button>
      </div>
      <div class="funnel-period-btns">
        ${['month','quarter','all'].map(p => `
          <button class="btn btn-sm ${funnelState.period === p ? 'btn-primary' : 'btn-secondary'}" data-period="${p}">
            ${p === 'month' ? '이번 달' : p === 'quarter' ? '분기' : '전체'}
          </button>
        `).join('')}
      </div>
    </div>
    <div id="funnelContent"><div class="funnel-loading"><span class="loading-spinner"></span></div></div>
  `;

  // Tab events
  body.querySelectorAll('.funnel-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      funnelState.tab = btn.dataset.tab;
      renderFunnel(body, actions);
    });
  });

  // Period events
  body.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      funnelState.period = btn.dataset.period;
      renderFunnel(body, actions);
    });
  });

  document.getElementById('addFunnelBtn')?.addEventListener('click', () => openAddPatient(body, actions));

  if (funnelState.tab === 'analytics') {
    await renderAnalytics(body, actions);
  } else {
    await renderPatientsList(body, actions);
  }
}

/* ══════════════════════════════════════
   📊 퍼널 분석 대시보드
   ══════════════════════════════════════ */
async function renderAnalytics(body, actions) {
  const content = document.getElementById('funnelContent');
  try {
    const data = await api(`/api/protected/funnel/analytics?period=${funnelState.period}`);
    content.innerHTML = buildAnalyticsDashboard(data);
    bindAnalyticsEvents(content, body, actions);
  } catch(e) {
    content.innerHTML = `<div class="funnel-empty">데이터를 불러올 수 없습니다: ${esc(e.message)}</div>`;
  }
}

function buildAnalyticsDashboard(data) {
  const { stages, summary, bottleneck, sources, treatments, actions: recActions } = data;
  const maxCount = Math.max(1, ...stages.map(s => s.count));

  return `
    <!-- 핵심 지표 카드 -->
    <div class="funnel-summary-grid">
      ${buildSummaryCard('🔄', '전체 전환율', `${summary.overallConversion}%`, '인지 → 진료', summary.overallConversion >= 30 ? 'good' : summary.overallConversion >= 15 ? 'warn' : 'bad')}
      ${buildSummaryCard('💬', '상담 전환율', `${summary.consultConversion}%`, '상담 → 진료', summary.consultConversion >= 60 ? 'good' : summary.consultConversion >= 40 ? 'warn' : 'bad')}
      ${buildSummaryCard('🤝', '소개 비율', `${summary.referralRate}%`, '진료 → 소개', summary.referralRate >= 20 ? 'good' : summary.referralRate >= 10 ? 'warn' : 'bad')}
      ${buildSummaryCard('💰', '수금율', `${summary.collectionRate}%`, `수납 ${fmtAmount(summary.paid)} / 예상 ${fmtAmount(summary.estimated)}`, summary.collectionRate >= 70 ? 'good' : summary.collectionRate >= 50 ? 'warn' : 'bad')}
    </div>

    <!-- 퍼널 시각화 -->
    <div class="funnel-viz-card">
      <div class="funnel-viz-header">
        <div>
          <div class="funnel-viz-title">🔄 Patient Funnel 10단계</div>
          <div class="funnel-viz-subtitle">환자 여정 — 인지부터 소개까지 · 총 ${summary.totalPatients}명</div>
        </div>
      </div>
      
      <div class="funnel-viz-container">
        ${stages.map((st, i) => {
          const widthPct = Math.max(25, 100 - i * 7.5);
          const fillPct = st.count > 0 ? Math.max(8, st.count / maxCount * 100) : 0;
          const stageInfo = STAGES[i];
          const convColor = st.conversionRate >= 70 ? '#22c55e' : st.conversionRate >= 40 ? '#f59e0b' : '#ef4444';
          const dropColor = st.dropoffRate >= 50 ? '#ef4444' : st.dropoffRate >= 30 ? '#f59e0b' : '#22c55e';
          
          return `
          <div class="funnel-stage-row" data-stage="${st.key}">
            <div class="funnel-stage-info">
              <span class="funnel-stage-icon">${stageInfo.icon}</span>
              <div class="funnel-stage-label-wrap">
                <span class="funnel-stage-label" style="color:${stageInfo.color}">${stageInfo.label}</span>
                <span class="funnel-stage-desc">${stageInfo.desc}</span>
              </div>
            </div>
            <div class="funnel-stage-bar-area">
              <div class="funnel-stage-bar-track" style="width:${widthPct}%">
                <div class="funnel-stage-bar-fill" style="width:${fillPct}%;background:${stageInfo.color}" data-count="${st.count}"></div>
                <span class="funnel-stage-count">${st.count}</span>
              </div>
              ${i > 0 ? `<div class="funnel-stage-arrow" style="color:${convColor}">↓ ${st.conversionRate}%</div>` : ''}
            </div>
            <div class="funnel-stage-metrics">
              ${i > 0 ? `
                <div class="funnel-metric-badge" style="background:${dropColor}15;color:${dropColor}">
                  이탈 ${st.dropoffRate}%
                </div>
              ` : '<div class="funnel-metric-badge" style="background:#22c55e15;color:#22c55e">시작</div>'}
              ${st.avgDurationHours !== null ? `
                <div class="funnel-metric-time">${st.avgDurationHours < 24 ? st.avgDurationHours + '시간' : Math.round(st.avgDurationHours/24) + '일'}</div>
              ` : ''}
              ${st.trend !== 0 ? `
                <span class="funnel-trend ${st.trend > 0 ? 'up' : 'down'}">${st.trend > 0 ? '↑' : '↓'}${Math.abs(st.trend)}%</span>
              ` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- 금액 요약 -->
      <div class="funnel-amounts-row">
        <div class="funnel-amount-item">
          <span class="funnel-amount-label">예상 매출</span>
          <span class="funnel-amount-value" style="color:#3b82f6">${fmtAmount(summary.estimated)}</span>
        </div>
        <div class="funnel-amount-item">
          <span class="funnel-amount-label">동의 금액</span>
          <span class="funnel-amount-value" style="color:#22c55e">${fmtAmount(summary.agreed)}</span>
        </div>
        <div class="funnel-amount-item">
          <span class="funnel-amount-label">수납 완료</span>
          <span class="funnel-amount-value" style="color:#f59e0b">${fmtAmount(summary.paid)}</span>
        </div>
      </div>
    </div>

    <!-- 병목 + 액션 -->
    ${bottleneck && bottleneck.dropoffRate > 0 ? `
    <div class="funnel-bottleneck-card">
      <div class="funnel-bottleneck-header">
        <span class="funnel-bottleneck-icon">⚠️</span>
        <div>
          <div class="funnel-bottleneck-title">병목 구간: ${esc(bottleneck.label)} 단계</div>
          <div class="funnel-bottleneck-desc">이탈률 ${bottleneck.dropoffRate}% — 이 단계를 개선하면 가장 큰 효과를 볼 수 있습니다</div>
        </div>
      </div>
    </div>` : ''}

    ${recActions.length > 0 ? `
    <div class="funnel-actions-card">
      <div class="funnel-actions-title">🎯 구체적 개선 액션</div>
      <div class="funnel-actions-list">
        ${recActions.map(a => `
          <div class="funnel-action-item priority-${a.priority}">
            <div class="funnel-action-priority">${a.priority === 'critical' ? '🔴 긴급' : a.priority === 'high' ? '🟡 높음' : '🟢 보통'}</div>
            <div class="funnel-action-body">
              <div class="funnel-action-title-text">${esc(a.title)}</div>
              <div class="funnel-action-desc">${esc(a.description)}</div>
              <div class="funnel-action-impact">💡 ${esc(a.impact)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- 유입 경로 + 진료유형 -->
    <div class="funnel-insight-grid">
      <div class="funnel-insight-card">
        <div class="funnel-insight-title">📡 유입 경로 분석</div>
        ${sources.length > 0 ? `
          <div class="funnel-source-list">
            ${sources.map((s, i) => {
              const maxSrc = sources[0]?.count || 1;
              const pct = Math.round(s.count / maxSrc * 100);
              return `
              <div class="funnel-source-row">
                <span class="funnel-source-rank">${i + 1}</span>
                <span class="funnel-source-name">${esc(s.source)}</span>
                <div class="funnel-source-bar-wrap">
                  <div class="funnel-source-bar" style="width:${pct}%"></div>
                </div>
                <span class="funnel-source-count">${s.count}명</span>
              </div>`;
            }).join('')}
          </div>
        ` : '<div class="funnel-empty-small">유입 경로 데이터 없음</div>'}
      </div>
      
      <div class="funnel-insight-card">
        <div class="funnel-insight-title">🦷 진료 유형별 분석</div>
        ${treatments.length > 0 ? `
          <div class="funnel-source-list">
            ${treatments.map((t, i) => {
              const maxTrt = treatments[0]?.count || 1;
              const pct = Math.round(t.count / maxTrt * 100);
              return `
              <div class="funnel-source-row">
                <span class="funnel-source-rank">${i + 1}</span>
                <span class="funnel-source-name">${esc(t.treatment_type)}</span>
                <div class="funnel-source-bar-wrap">
                  <div class="funnel-source-bar" style="width:${pct}%;background:var(--primary)"></div>
                </div>
                <span class="funnel-source-count">${t.count}명 · ${fmtAmount(t.revenue)}</span>
              </div>`;
            }).join('')}
          </div>
        ` : '<div class="funnel-empty-small">진료 유형 데이터 없음</div>'}
      </div>
    </div>
  `;
}

function buildSummaryCard(icon, label, value, sub, status) {
  const colors = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444' };
  const bgColors = { good: '#f0fdf4', warn: '#fffbeb', bad: '#fef2f2' };
  return `
    <div class="funnel-summary-card" style="border-left:4px solid ${colors[status]}">
      <div class="funnel-summary-icon" style="background:${bgColors[status]}">${icon}</div>
      <div class="funnel-summary-body">
        <div class="funnel-summary-label">${label}</div>
        <div class="funnel-summary-value" style="color:${colors[status]}">${value}</div>
        <div class="funnel-summary-sub">${sub}</div>
      </div>
    </div>
  `;
}

function fmtAmount(n) {
  if (!n || n === 0) return '0원';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return Math.round(n / 10000).toLocaleString() + '만원';
  return n.toLocaleString() + '원';
}

function bindAnalyticsEvents(content, body, actions) {
  // 퍼널 행 클릭 시 해당 단계 환자 필터
  content.querySelectorAll('.funnel-stage-row').forEach(row => {
    row.addEventListener('click', () => {
      funnelState.tab = 'patients';
      funnelState.filterStage = row.dataset.stage;
      renderFunnel(body, actions);
    });
  });
}

/* ══════════════════════════════════════
   👥 환자 목록 (기존 + 개선)
   ══════════════════════════════════════ */
async function renderPatientsList(body, actions) {
  const content = document.getElementById('funnelContent');
  content.innerHTML = `<div class="funnel-loading"><span class="loading-spinner"></span></div>`;
  
  try {
    const [statsData, patients] = await Promise.all([
      api('/api/protected/funnel/stats'),
      api('/api/protected/funnel'),
    ]);
    
    const stageMap = statsData.stages || {};
    const total = Object.values(stageMap).reduce((a, b) => a + b, 0);
    
    // 단계별 그룹
    const byStage = {};
    STAGES.forEach(s => { byStage[s.key] = []; });
    patients.forEach(p => { if (byStage[p.current_stage]) byStage[p.current_stage].push(p); });
    
    let currentFilter = funnelState.filterStage || 'all';
    
    content.innerHTML = `
      <div class="funnel-filter-tabs" id="funnelTabs">
        <button class="btn btn-sm funnel-filter-tab ${currentFilter === 'all' ? 'active' : ''}" data-stage="all">전체 (${total})</button>
        ${STAGES.map(st => `
          <button class="btn btn-sm funnel-filter-tab ${currentFilter === st.key ? 'active' : ''}" data-stage="${st.key}" style="${(stageMap[st.key]||0)>0?`border-color:${st.color}33`:''}">${st.icon} ${st.label} (${stageMap[st.key]||0})</button>
        `).join('')}
      </div>
      <div id="funnelList"></div>
    `;
    
    function renderList(stage) {
      const listEl = document.getElementById('funnelList');
      const filtered = stage === 'all' ? patients : byStage[stage] || [];
      
      if (!filtered.length) {
        listEl.innerHTML = `<div class="funnel-empty">등록된 환자가 없습니다</div>`;
        return;
      }
      
      listEl.innerHTML = `
        <div class="funnel-patients-grid">
          ${filtered.map(p => {
            const st = STAGES.find(s => s.key === p.current_stage) || STAGES[0];
            return `
              <div class="funnel-patient-card" data-id="${p.id}" style="border-left:4px solid ${st.color}">
                <div class="funnel-patient-icon" style="background:${st.color}15">${st.icon}</div>
                <div class="funnel-patient-info">
                  <div class="funnel-patient-name">
                    ${esc(p.patient_name)}
                    <span class="funnel-patient-stage" style="background:${st.color}15;color:${st.color}">${st.label}</span>
                    ${p.source ? `<span class="funnel-patient-source">via ${esc(p.source)}</span>` : ''}
                  </div>
                  <div class="funnel-patient-meta">
                    ${p.treatment_type ? `🦷 ${esc(p.treatment_type)}` : ''}
                    ${p.doctor_name ? ` · 🩺 ${esc(p.doctor_name)}` : ''}
                    ${p.estimated_amount ? ` · 💰 ${fmtAmount(p.estimated_amount)}` : ''}
                  </div>
                </div>
                <div class="funnel-patient-progress">
                  ${STAGES.map((s, si) => {
                    const ci = STAGES.findIndex(x => x.key === p.current_stage);
                    return `<div class="funnel-progress-dot ${si <= ci ? 'active' : ''}" style="${si <= ci ? `background:${s.color}` : ''}" title="${s.label}"></div>`;
                  }).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>`;
      
      listEl.querySelectorAll('.funnel-patient-card').forEach(el => {
        el.addEventListener('click', () => openPatientDetail(el.dataset.id, patients, body, actions));
      });
    }
    
    renderList(currentFilter);
    
    content.querySelectorAll('.funnel-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        content.querySelectorAll('.funnel-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.stage;
        funnelState.filterStage = currentFilter;
        renderList(currentFilter);
      });
    });
  } catch(e) {
    content.innerHTML = `<div class="funnel-empty">데이터 로딩 실패: ${esc(e.message)}</div>`;
  }
}

/* ── 환자 등록 모달 ── */
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
        <select class="form-input" id="fpDoctor"><option value="">미지정</option>${doctors.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select>
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

/* ── 환자 상세 / 편집 모달 ── */
async function openPatientDetail(patientId, patients, body, actions) {
  const p = patients.find(x => x.id === patientId);
  if (!p) return;
  const st = STAGES.find(s => s.key === p.current_stage) || STAGES[0];

  showModal(`${st.icon} ${esc(p.patient_name)}`, `
    <div class="mb-16">
      <div class="funnel-detail-progress">
        ${STAGES.map(s => {
          const ci = STAGES.findIndex(x => x.key === p.current_stage);
          const si = STAGES.findIndex(x => x.key === s.key);
          const done = si <= ci;
          return `<div class="funnel-detail-step ${done ? 'done' : ''}" style="${done ? `background:${s.color}` : ''}" title="${s.label}"></div>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin:8px 0">
        <span class="funnel-patient-stage" style="background:${st.color}15;color:${st.color};padding:4px 14px;font-size:13px">${st.icon} ${st.label} 단계</span>
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
      <button class="btn btn-primary" id="pdSave" class="flex-1">💾 저장</button>
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
    if (!confirm(`"${esc(p.patient_name)}" 환자를 퍼널에서 삭제하시겠습니까?`)) return;
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
