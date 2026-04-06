/* ═══ Module: 환자 만족도 설문 + 정기 발송 시스템 ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, navigate, canManage, formatPrice } = PFM;
const DOW = ['일','월','화','수','목','금','토'];

/* ════════════════════════════════════════
   설문 메인 (탭 구조)
   ════════════════════════════════════════ */
async function renderSurveys(body, actions) {
  if (!canManage()) {
    body.innerHTML = '<div class="empty-state"><h3>관리자만 접근 가능합니다</h3></div>';
    return;
  }

  const activeTab = state._surveyTab || 'overview';
  actions.innerHTML = '';

  body.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap" id="surveyTabs">
      <button class="btn btn-sm ${activeTab==='overview'?'btn-primary':'btn-secondary'}" data-tab="overview">📊 현황</button>
      <button class="btn btn-sm ${activeTab==='list'?'btn-primary':'btn-secondary'}" data-tab="list">📋 설문 목록</button>
      <button class="btn btn-sm ${activeTab==='schedule'?'btn-primary':'btn-secondary'}" data-tab="schedule">📅 발송 스케줄</button>
      <button class="btn btn-sm ${activeTab==='batches'?'btn-primary':'btn-secondary'}" data-tab="batches">📨 발송 내역</button>
      <button class="btn btn-sm ${activeTab==='templates'?'btn-primary':'btn-secondary'}" data-tab="templates">📝 템플릿</button>
    </div>
    <div id="surveyContent"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  body.querySelectorAll('#surveyTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      state._surveyTab = btn.dataset.tab;
      renderSurveys(body, actions);
    });
  });

  const content = body.querySelector('#surveyContent');
  try {
    if (activeTab === 'overview') await renderOverview(content);
    else if (activeTab === 'list') await renderSurveyList(content);
    else if (activeTab === 'schedule') await renderScheduleTab(content);
    else if (activeTab === 'batches') await renderBatchesTab(content);
    else if (activeTab === 'templates') await renderTemplatesTab(content);
  } catch(e) {
    content.innerHTML = `<div style="color:#ef4444;text-align:center;padding:40px">${esc(e.message)}</div>`;
  }
}

/* ──── 현황 탭 ──── */
async function renderOverview(el) {
  const [overview, todayInfo] = await Promise.all([
    api('/api/protected/surveys/stats/overview'),
    api('/api/protected/surveys/schedules/today'),
  ]);

  const nps = overview.nps || {};
  const npsColor = nps.score >= 50 ? '#22c55e' : nps.score >= 0 ? '#f59e0b' : '#ef4444';

  el.innerHTML = `
    ${todayInfo.isSendDay ? `
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:14px;padding:20px;margin-bottom:20px;border:2px solid #f59e0b">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:28px">🔔</span>
        <div>
          <div style="font-weight:800;font-size:16px;color:#92400e">오늘은 설문 발송일입니다!</div>
          <div style="font-size:12px;color:#a16207">${todayInfo.schedules.map(s => s.survey_title).join(', ')}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-sm" style="background:#f59e0b;color:white;border:none" id="goToBatchBtn">📨 명단 업로드 & 발송하기</button>
        ${todayInfo.todayBatches.length ? `<span style="font-size:11px;color:#92400e;align-self:center">이미 ${todayInfo.todayBatches.length}건 배치 생성됨</span>` : ''}
      </div>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">활성 설문</div>
        <div style="font-size:28px;font-weight:900;color:var(--primary)">${overview.activeSurveys}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">총 발송</div>
        <div style="font-size:28px;font-weight:900;color:#3b82f6">${overview.totalSent}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">응답률</div>
        <div style="font-size:28px;font-weight:900;color:#8b5cf6">${overview.responseRate}%</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">NPS</div>
        <div style="font-size:28px;font-weight:900;color:${npsColor}">${nps.score !== null ? nps.score : '-'}</div>
      </div>
    </div>

    ${nps.total > 0 ? `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-weight:700;font-size:14px;margin-bottom:14px">😊 NPS 분포</div>
      <div style="display:flex;height:28px;border-radius:8px;overflow:hidden;margin-bottom:10px">
        ${nps.promoters ? `<div style="background:#22c55e;flex:${nps.promoters}" title="추천 ${nps.promoters}명"></div>` : ''}
        ${nps.passives ? `<div style="background:#f59e0b;flex:${nps.passives}" title="중립 ${nps.passives}명"></div>` : ''}
        ${nps.detractors ? `<div style="background:#ef4444;flex:${nps.detractors}" title="비추천 ${nps.detractors}명"></div>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)">
        <span>🟢 추천 ${nps.promoters}명 (${Math.round(nps.promoters/nps.total*100)}%)</span>
        <span>🟡 중립 ${nps.passives}명 (${Math.round(nps.passives/nps.total*100)}%)</span>
        <span>🔴 비추천 ${nps.detractors}명 (${Math.round(nps.detractors/nps.total*100)}%)</span>
      </div>
    </div>` : ''}

    ${(overview.monthlyTrend || []).length > 0 ? `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-weight:700;font-size:14px;margin-bottom:14px">📈 월별 추이</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${(overview.monthlyTrend || []).reverse().map(m => `
          <div style="display:flex;align-items:center;gap:10px;font-size:12px">
            <span style="min-width:60px;color:var(--text-muted);font-weight:600">${m.month}</span>
            <div style="flex:1;background:var(--bg);border-radius:4px;height:20px;position:relative;overflow:hidden">
              <div style="background:linear-gradient(90deg,#14b8a6,#0f766e);height:100%;width:${Math.min(100, (m.avg_nps||0)*10)}%;border-radius:4px;transition:width .3s"></div>
            </div>
            <span style="min-width:45px;text-align:right;font-weight:700">${m.avg_nps || 0}</span>
            <span style="min-width:40px;text-align:right;color:var(--text-muted)">${m.responses}건</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    ${(overview.recentBatches || []).length ? `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px">
      <div style="font-weight:700;font-size:14px;margin-bottom:14px">📨 최근 발송</div>
      ${overview.recentBatches.map(b => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:12px">
          <div>
            <span style="font-weight:600">${esc(b.survey_title)}</span>
            <span style="color:var(--text-muted);margin-left:8px">${b.batch_date}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span>${b.total_recipients}명</span>
            ${batchStatusBadge(b.status)}
          </div>
        </div>
      `).join('')}
    </div>` : ''}`;

  if (todayInfo.isSendDay) {
    const btn = el.querySelector('#goToBatchBtn');
    if (btn) btn.addEventListener('click', () => { state._surveyTab = 'batches'; navigate('surveys'); });
  }
}

/* ──── 설문 목록 탭 ──── */
async function renderSurveyList(el) {
  const surveys = await api('/api/protected/surveys');
  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="createSurveyBtn">${ICONS.plus} 설문 만들기</button>
    </div>
    ${!surveys.length ? `
    <div class="empty-state">
      <div style="font-size:48px;margin-bottom:16px">📋</div>
      <h3>등록된 설문이 없습니다</h3>
      <p style="color:var(--text-muted);margin-top:8px">설문을 만들어 환자 만족도를 측정하세요</p>
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:12px">${surveys.map(s => `
      <div class="survey-item" data-id="${esc(s.id)}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseleave="this.style.boxShadow=''">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">${s.is_active ? '🟢' : '⚪'}</span>
            <span style="font-weight:700;font-size:15px">${esc(s.title)}</span>
          </div>
        </div>
        ${s.description ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${esc(s.description)}</div>` : ''}
        <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
          <span>📊 응답 ${s.response_count || 0}건</span>
          <span>⭐ NPS ${s.avg_nps ? s.avg_nps.toFixed(1) : '-'}</span>
          <span>📅 ${s.expire_days}일 유효</span>
        </div>
      </div>`).join('')}
    </div>`}`;

  el.querySelector('#createSurveyBtn')?.addEventListener('click', openCreateSurvey);
  el.querySelectorAll('.survey-item').forEach(item => {
    item.addEventListener('click', () => openSurveyDetail(item.dataset.id));
  });
}

/* ──── 발송 스케줄 탭 ──── */
async function renderScheduleTab(el) {
  const [schedules, nextDates, surveys] = await Promise.all([
    api('/api/protected/surveys/schedules'),
    api('/api/protected/surveys/schedules/next'),
    api('/api/protected/surveys'),
  ]);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted)">매월 N째주 X요일에 자동으로 발송 알림을 받습니다</div>
      <button class="btn btn-primary btn-sm" id="addScheduleBtn">${ICONS.plus} 스케줄 추가</button>
    </div>

    ${nextDates.length ? `
    <div style="background:linear-gradient(135deg,#f0f9ff,#dbeafe);border-radius:14px;padding:16px;margin-bottom:20px;border:1px solid #93c5fd">
      <div style="font-weight:700;font-size:13px;color:#1e40af;margin-bottom:8px">📅 다음 발송 예정</div>
      ${nextDates.slice(0, 3).map(n => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:12px">
          <span><strong>${esc(n.surveyTitle)}</strong> · ${n.label}</span>
          <span style="color:#2563eb;font-weight:700">${n.nextDate} (${n.daysUntil === 0 ? '오늘!' : n.daysUntil + '일 후'})</span>
        </div>
      `).join('')}
    </div>` : ''}

    ${!schedules.length ? `
    <div class="empty-state" style="padding:40px">
      <div style="font-size:48px;margin-bottom:16px">📅</div>
      <h3>등록된 스케줄이 없습니다</h3>
      <p style="color:var(--text-muted);margin-top:8px">정기 발송 스케줄을 설정하세요</p>
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${schedules.map(s => `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px" data-sch-id="${esc(s.id)}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:20px">${s.is_active ? '🟢' : '⚪'}</span>
              <span style="font-weight:700;font-size:14px">${s.week_of_month}째주 ${DOW[s.day_of_week]}요일 ${esc(s.send_time)}</span>
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn-icon schToggle" data-id="${esc(s.id)}" data-active="${s.is_active}" title="${s.is_active ? '비활성화' : '활성화'}">${s.is_active ? '⏸️' : '▶️'}</button>
              <button class="btn-icon schDelete" data-id="${esc(s.id)}" title="삭제" style="color:var(--danger)">🗑️</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">
            설문: <strong>${esc(s.survey_title || '?')}</strong>
            ${s.total_sent ? ` · 누적 ${s.total_sent}건 발송` : ''}
            ${s.last_sent_at ? ` · 마지막: ${s.last_sent_at.slice(0,10)}` : ''}
          </div>
        </div>
      `).join('')}
    </div>`}`;

  el.querySelector('#addScheduleBtn')?.addEventListener('click', () => openScheduleForm(surveys));
  el.querySelectorAll('.schToggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api('/api/protected/surveys/schedules/' + btn.dataset.id, { method: 'PUT', json: { is_active: btn.dataset.active === '1' ? 0 : 1 } });
        toast('스케줄 상태 변경', 'success');
        state._surveyTab = 'schedule'; navigate('surveys');
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  });
  el.querySelectorAll('.schDelete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('스케줄을 삭제하시겠습니까?')) return;
      try {
        await api('/api/protected/surveys/schedules/' + btn.dataset.id, { method: 'DELETE' });
        toast('삭제 완료', 'success');
        state._surveyTab = 'schedule'; navigate('surveys');
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  });
}

/* ──── 스케줄 생성 폼 ──── */
function openScheduleForm(surveys) {
  const activeSurveys = surveys.filter(s => s.is_active);
  if (!activeSurveys.length) { toast('먼저 활성화된 설문을 만들어주세요', 'warning'); return; }

  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>📅 발송 스케줄 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      <div class="form-group"><label>연결할 설문</label>
        <select class="form-input" id="schSurvey">
          ${activeSurveys.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>발송 주차</label>
          <select class="form-input" id="schWeek">
            <option value="1">1째주</option><option value="2">2째주</option>
            <option value="3">3째주</option><option value="4">4째주</option>
          </select>
        </div>
        <div class="form-group"><label>발송 요일</label>
          <select class="form-input" id="schDow">
            ${DOW.map((d,i) => `<option value="${i}" ${i===1?'selected':''}>${d}요일</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>발송 시간</label>
        <input class="form-input" type="time" id="schTime" value="10:00">
      </div>
      <div class="form-group"><label>SMS 메시지 템플릿 <span style="font-size:11px;color:var(--text-muted)">(선택)</span></label>
        <textarea class="form-input" id="schTemplate" rows="3" placeholder="[{병원명}] {환자명}님, 진료 만족도 설문에 참여해주세요.&#10;{링크}&#10;(7일내 응답)"
          style="font-size:12px;resize:vertical"></textarea>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">사용 가능 변수: {병원명}, {환자명}, {링크}</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="schSave">저장</button>
    </div>`;
  showModal();

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('schSave').addEventListener('click', async () => {
    try {
      const r = await api('/api/protected/surveys/schedules', { method: 'POST', json: {
        survey_id: document.getElementById('schSurvey').value,
        week_of_month: parseInt(document.getElementById('schWeek').value),
        day_of_week: parseInt(document.getElementById('schDow').value),
        send_time: document.getElementById('schTime').value,
        sms_template: document.getElementById('schTemplate').value,
      }});
      toast(`스케줄 추가: ${r.label}`, 'success');
      closeModal();
      state._surveyTab = 'schedule'; navigate('surveys');
    } catch(e) { toast(esc(e.message), 'error'); }
  });
}

/* ──── 발송 내역 탭 ──── */
async function renderBatchesTab(el) {
  const [data, surveys, todayInfo] = await Promise.all([
    api('/api/protected/surveys/batches?limit=20'),
    api('/api/protected/surveys'),
    api('/api/protected/surveys/schedules/today'),
  ]);

  const activeSurveys = surveys.filter(s => s.is_active);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--text-muted)">총 ${data.total}건</div>
      <button class="btn btn-primary btn-sm" id="newBatchBtn">📨 새 발송 만들기</button>
    </div>

    ${!data.batches.length ? `
    <div class="empty-state" style="padding:40px">
      <div style="font-size:48px;margin-bottom:16px">📨</div>
      <h3>발송 내역이 없습니다</h3>
      <p style="color:var(--text-muted);margin-top:8px">환자 명단을 업로드하고 설문을 발송해보세요</p>
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${data.batches.map(b => `
        <div class="batch-item" data-id="${esc(b.id)}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseleave="this.style.boxShadow=''">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:700;font-size:14px">${esc(b.survey_title)}</span>
              ${batchStatusBadge(b.status)}
            </div>
            <span style="font-size:12px;color:var(--text-muted)">${b.batch_date}</span>
          </div>
          <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
            <span>👥 ${b.total_recipients}명</span>
            <span>✅ ${b.sent_count}건 발송</span>
            ${b.failed_count ? `<span style="color:var(--danger)">❌ ${b.failed_count}건 실패</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`}`;

  el.querySelector('#newBatchBtn')?.addEventListener('click', () => openNewBatch(activeSurveys, todayInfo));
  el.querySelectorAll('.batch-item').forEach(item => {
    item.addEventListener('click', () => openBatchDetail(item.dataset.id));
  });
}

/* ──── 새 발송 (명단 업로드) ──── */
function openNewBatch(activeSurveys, todayInfo) {
  if (!activeSurveys.length) { toast('활성화된 설문이 없습니다. 먼저 설문을 만들어주세요.', 'warning'); return; }

  const defaultSurvey = todayInfo?.schedules?.[0]?.survey_id || activeSurveys[0].id;
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>📨 설문 발송 만들기</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" style="max-height:75vh;overflow-y:auto">
      <div class="form-group"><label>설문 선택</label>
        <select class="form-input" id="batchSurvey">
          ${activeSurveys.map(s => `<option value="${esc(s.id)}" ${s.id===defaultSurvey?'selected':''}>${esc(s.title)}</option>`).join('')}
        </select>
      </div>

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="font-weight:700;font-size:13px;color:#166534;margin-bottom:10px">📋 환자 명단 입력</div>
        <div style="font-size:11px;color:#166534;margin-bottom:12px">방법 1: 직접 입력 / 방법 2: 엑셀 붙여넣기 (이름 탭 전화번호 탭 담당의 탭 진료항목)</div>
        <textarea class="form-input" id="batchPaste" rows="6" placeholder="홍길동&#9;01012345678&#9;김원장&#9;임플란트&#10;이영희&#9;01087654321&#9;박원장&#9;교정&#10;&#10;또는 CSV: 홍길동,01012345678,김원장,임플란트" style="font-size:12px;font-family:monospace;resize:vertical"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-sm btn-secondary" id="parsePasteBtn">📋 명단 파싱</button>
          <span style="font-size:11px;color:var(--text-muted);align-self:center" id="parseCount"></span>
        </div>
      </div>

      <div id="recipientPreview" style="display:none">
        <div style="font-weight:700;font-size:13px;margin-bottom:10px">👥 발송 명단 확인</div>
        <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px" id="previewTable"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="batchCreateBtn" disabled>📨 명단 확인 후 발송</button>
    </div>`;
  showModal();

  let parsedRecipients = [];

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  document.getElementById('parsePasteBtn').addEventListener('click', () => {
    const raw = document.getElementById('batchPaste').value.trim();
    if (!raw) { toast('명단을 입력해주세요', 'error'); return; }

    parsedRecipients = raw.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      return {
        patient_name: (parts[0] || '').trim(),
        patient_phone: (parts[1] || '').trim().replace(/[^0-9]/g, ''),
        doctor_name: (parts[2] || '').trim(),
        treatment_type: (parts[3] || '').trim(),
      };
    }).filter(r => r.patient_name && r.patient_phone.length >= 10);

    if (!parsedRecipients.length) { toast('유효한 명단이 없습니다. 이름과 전화번호를 확인해주세요', 'error'); return; }

    document.getElementById('parseCount').textContent = `${parsedRecipients.length}명 파싱됨`;
    document.getElementById('recipientPreview').style.display = '';
    document.getElementById('previewTable').innerHTML = `
      <table style="width:100%;font-size:11px;border-collapse:collapse">
        <thead><tr style="background:var(--bg);font-weight:700">
          <th style="padding:6px 8px;text-align:left">이름</th>
          <th style="padding:6px 8px;text-align:left">전화번호</th>
          <th style="padding:6px 8px;text-align:left">담당의</th>
          <th style="padding:6px 8px;text-align:left">진료</th>
        </tr></thead>
        <tbody>${parsedRecipients.map(r => `
          <tr style="border-top:1px solid var(--border-light)">
            <td style="padding:5px 8px">${esc(r.patient_name)}</td>
            <td style="padding:5px 8px">${formatPhone(r.patient_phone)}</td>
            <td style="padding:5px 8px">${esc(r.doctor_name)}</td>
            <td style="padding:5px 8px">${esc(r.treatment_type)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    document.getElementById('batchCreateBtn').disabled = false;
  });

  document.getElementById('batchCreateBtn').addEventListener('click', async () => {
    if (!parsedRecipients.length) { toast('명단을 먼저 파싱해주세요', 'error'); return; }
    const btn = document.getElementById('batchCreateBtn');
    btn.disabled = true; btn.textContent = '처리 중...';
    try {
      // 1. 배치 생성
      const batch = await api('/api/protected/surveys/batches', { method: 'POST', json: {
        survey_id: document.getElementById('batchSurvey').value,
        recipients: parsedRecipients,
      }});
      // 2. 바로 발송
      const result = await api('/api/protected/surveys/batches/' + batch.batchId + '/send', { method: 'POST' });
      let msg = `${result.sent}건 발송 완료!`;
      if (!result.smsConfigured) msg += '\n⚠️ SMS 미설정 — 설정 > SMS에서 Aligo API를 등록하세요';
      if (result.failed) msg += `\n❌ ${result.failed}건 실패`;
      toast(msg, result.failed ? 'warning' : 'success');
      closeModal();
      state._surveyTab = 'batches'; navigate('surveys');
    } catch(e) {
      toast(esc(e.message), 'error');
      btn.disabled = false; btn.textContent = '📨 명단 확인 후 발송';
    }
  });
}

/* ──── 배치 상세 ──── */
async function openBatchDetail(batchId) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>📨 발송 상세</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" style="max-height:75vh;overflow-y:auto" id="batchDetailBody">
      <div style="text-align:center;padding:30px"><span class="loading-spinner"></span></div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);

  try {
    const data = await api('/api/protected/surveys/batches/' + batchId);
    const b = data.batch;
    const items = data.items || [];
    const stats = {
      pending: items.filter(i => i.status === 'pending').length,
      sent: items.filter(i => i.status === 'sent').length,
      opened: items.filter(i => i.status === 'opened').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length,
    };

    document.getElementById('batchDetailBody').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-weight:700;font-size:16px">${esc(b.survey_title)}</div>
          <div style="font-size:12px;color:var(--text-muted)">${b.batch_date} · ${b.total_recipients}명</div>
        </div>
        ${batchStatusBadge(b.status)}
      </div>

      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:16px;text-align:center;font-size:11px">
        <div style="background:#e2e8f0;border-radius:8px;padding:8px"><div style="font-weight:600;color:#475569">대기</div><div style="font-size:16px;font-weight:900">${stats.pending}</div></div>
        <div style="background:#dbeafe;border-radius:8px;padding:8px"><div style="font-weight:600;color:#1e40af">발송</div><div style="font-size:16px;font-weight:900">${stats.sent}</div></div>
        <div style="background:#e0e7ff;border-radius:8px;padding:8px"><div style="font-weight:600;color:#4338ca">열람</div><div style="font-size:16px;font-weight:900">${stats.opened}</div></div>
        <div style="background:#dcfce7;border-radius:8px;padding:8px"><div style="font-weight:600;color:#166534">완료</div><div style="font-size:16px;font-weight:900">${stats.completed}</div></div>
        <div style="background:#fee2e2;border-radius:8px;padding:8px"><div style="font-weight:600;color:#991b1b">실패</div><div style="font-size:16px;font-weight:900">${stats.failed}</div></div>
      </div>

      <div style="max-height:300px;overflow-y:auto">
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <thead><tr style="background:var(--bg);font-weight:700;position:sticky;top:0">
            <th style="padding:6px 8px;text-align:left">환자</th>
            <th style="padding:6px 8px;text-align:left">전화번호</th>
            <th style="padding:6px 8px;text-align:left">담당의</th>
            <th style="padding:6px 8px;text-align:center">상태</th>
          </tr></thead>
          <tbody>${items.map(i => `
            <tr style="border-top:1px solid var(--border-light)">
              <td style="padding:5px 8px">${esc(i.patient_name)}</td>
              <td style="padding:5px 8px">${formatPhone(i.patient_phone)}</td>
              <td style="padding:5px 8px">${esc(i.doctor_name || '')}</td>
              <td style="padding:5px 8px;text-align:center">${sendStatusIcon(i.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      ${b.status === 'draft' ? `
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-primary btn-sm" id="sendBatchBtn" style="flex:1">📨 발송하기</button>
        <button class="btn btn-secondary btn-sm" id="cancelBatchBtn">취소</button>
      </div>` : ''}`;

    if (b.status === 'draft') {
      document.getElementById('sendBatchBtn')?.addEventListener('click', async () => {
        try {
          const r = await api('/api/protected/surveys/batches/' + batchId + '/send', { method: 'POST' });
          toast(`${r.sent}건 발송 완료!`, 'success');
          closeModal(); state._surveyTab = 'batches'; navigate('surveys');
        } catch(e) { toast(esc(e.message), 'error'); }
      });
      document.getElementById('cancelBatchBtn')?.addEventListener('click', async () => {
        if (!confirm('배치를 취소하시겠습니까?')) return;
        try {
          await api('/api/protected/surveys/batches/' + batchId, { method: 'DELETE' });
          toast('배치 취소됨', 'success'); closeModal(); state._surveyTab = 'batches'; navigate('surveys');
        } catch(e) { toast(esc(e.message), 'error'); }
      });
    }
  } catch(e) {
    document.getElementById('batchDetailBody').innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px">${esc(e.message)}</div>`;
  }
}

/* ──── 템플릿 탭 ──── */
async function renderTemplatesTab(el) {
  const templates = await api('/api/protected/surveys/templates');

  el.innerHTML = `
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">기본 제공 템플릿으로 빠르게 설문을 만들거나, 나만의 템플릿을 저장할 수 있습니다</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
      ${templates.map(t => {
        const qs = t.questions || [];
        const catIcon = {nps:'🎯',treatment:'🦷',service:'💁',general:'📋'}[t.category] || '📋';
        return `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px;position:relative;${t.isSystem?'border-left:4px solid var(--primary)':''}">
          ${t.isSystem ? '<div style="position:absolute;top:10px;right:10px;font-size:9px;background:var(--primary);color:white;padding:1px 6px;border-radius:4px;font-weight:600">기본</div>' : ''}
          <div style="font-size:24px;margin-bottom:8px">${catIcon}</div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${esc(t.name)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.4">${esc(t.description || '')}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">${qs.length}개 질문 · ${qs.filter(q => q.type==='nps').length ? 'NPS 포함' : ''}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary btn-sm tplUse" data-id="${esc(t.id)}" style="flex:1">이 템플릿으로 설문 만들기</button>
            ${!t.isSystem ? `<button class="btn-icon tplDelete" data-id="${esc(t.id)}" style="color:var(--danger)" title="삭제">🗑️</button>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  el.querySelectorAll('.tplUse').forEach(btn => {
    btn.addEventListener('click', async () => {
      const title = prompt('설문 제목을 입력하세요:', '');
      if (!title) return;
      try {
        const r = await api('/api/protected/surveys/templates/' + btn.dataset.id + '/create-survey', { method: 'POST', json: { title } });
        toast('설문 생성 완료!', 'success');
        state._surveyTab = 'list'; navigate('surveys');
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  });
  el.querySelectorAll('.tplDelete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('템플릿을 삭제하시겠습니까?')) return;
      try {
        await api('/api/protected/surveys/templates/' + btn.dataset.id, { method: 'DELETE' });
        toast('삭제 완료', 'success'); state._surveyTab = 'templates'; navigate('surveys');
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  });
}

/* ──── 설문 생성 ──── */
function openCreateSurvey() {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>📋 설문 만들기</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      <div style="margin-bottom:16px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:12px;color:#166534">
        💡 <strong>팁:</strong> 템플릿 탭에서 기본 제공 설문으로 빠르게 시작할 수도 있습니다!
      </div>
      <form class="auth-form" id="surveyForm">
        <div class="form-group"><label>설문 제목</label><input class="form-input" id="svTitle" value="진료 후 만족도 설문" required></div>
        <div class="form-group"><label>설명</label><input class="form-input" id="svDesc" placeholder="선택사항"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label>진료 후 발송 시간</label>
            <select class="form-input" id="svDelay">
              <option value="1">1시간 후</option><option value="2" selected>2시간 후</option>
              <option value="4">4시간 후</option><option value="24">24시간 후</option>
            </select>
          </div>
          <div class="form-group"><label>설문 유효기간</label>
            <select class="form-input" id="svExpire">
              <option value="3">3일</option><option value="7" selected>7일</option><option value="14">14일</option>
            </select>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px">📝 질문 구성</div>
          <div id="questionList"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="addQuestionBtn">${ICONS.plus} 질문 추가</button>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="svSubmit">생성</button>
    </div>`;
  showModal();

  const defaultQs = [
    { id: 'nps', type: 'nps', label: '주변 지인에게 저희 병원을 추천하시겠습니까?' },
    { id: 'overall', type: 'rating', label: '전반적인 진료 만족도는 어떠셨나요?' },
    { id: 'kindness', type: 'rating', label: '직원들의 친절도는 어떠셨나요?' },
    { id: 'waiting', type: 'choice', label: '대기시간은 적절했나요?', options: ['매우 짧음', '적당함', '약간 길었음', '너무 길었음'] },
    { id: 'feedback', type: 'text', label: '개선사항이나 건의사항이 있으시면 자유롭게 작성해주세요' },
  ];
  let questions = [...defaultQs];
  renderQuestions();

  function renderQuestions() {
    const list = document.getElementById('questionList');
    list.innerHTML = questions.map((q, i) => `
      <div style="background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;font-weight:600;color:var(--primary)">${typeLabel(q.type)} #${i+1}</span>
          <button type="button" class="btn-icon qRemove" data-idx="${i}" style="font-size:11px;color:var(--danger)">${ICONS.trash}</button>
        </div>
        <input class="form-input qLabel" data-idx="${i}" value="${esc(q.label)}" placeholder="질문 내용" style="font-size:13px;margin-bottom:6px">
        ${q.type === 'choice' ? `<input class="form-input qOptions" data-idx="${i}" value="${(q.options||[]).join(', ')}" placeholder="선택지 (쉼표 구분)">` : ''}
      </div>`).join('');

    list.querySelectorAll('.qLabel').forEach(el => { el.addEventListener('input', () => { questions[el.dataset.idx].label = el.value; }); });
    list.querySelectorAll('.qOptions').forEach(el => { el.addEventListener('input', () => { questions[el.dataset.idx].options = el.value.split(',').map(s => s.trim()).filter(Boolean); }); });
    list.querySelectorAll('.qRemove').forEach(el => { el.addEventListener('click', () => { questions.splice(el.dataset.idx, 1); renderQuestions(); }); });
  }

  function typeLabel(t) { return { nps: '🎯 NPS', rating: '⭐ 별점', choice: '🔘 객관식', text: '✏️ 주관식' }[t] || t; }

  document.getElementById('addQuestionBtn').addEventListener('click', () => {
    const t = prompt('질문 유형:\n1. NPS (추천도)\n2. 별점 (5점)\n3. 객관식\n4. 주관식', '2');
    if (!t) return;
    const types = { '1': 'nps', '2': 'rating', '3': 'choice', '4': 'text' };
    questions.push({ id: 'q' + Date.now(), type: types[t] || 'rating', label: '', options: types[t] === 'choice' ? ['옵션1', '옵션2', '옵션3'] : undefined });
    renderQuestions();
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('svSubmit').addEventListener('click', async () => {
    const title = document.getElementById('svTitle').value.trim();
    if (!title) { toast('제목을 입력해주세요', 'error'); return; }
    const validQs = questions.filter(q => q.label.trim());
    if (!validQs.length) { toast('최소 1개 질문이 필요합니다', 'error'); return; }
    try {
      await api('/api/protected/surveys', { method: 'POST', json: {
        title, description: document.getElementById('svDesc').value,
        send_delay_hours: parseInt(document.getElementById('svDelay').value),
        expire_days: parseInt(document.getElementById('svExpire').value),
        questions: validQs,
      }});
      toast('설문 생성 완료!', 'success'); closeModal(); state._surveyTab = 'list'; navigate('surveys');
    } catch(e) { toast(esc(e.message), 'error'); }
  });
}

/* ──── 설문 상세 ──── */
async function openSurveyDetail(surveyId) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>📊 설문 분석</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" style="max-height:75vh;overflow-y:auto" id="surveyDetailBody">
      <div style="text-align:center;padding:30px"><span class="loading-spinner"></span></div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);

  try {
    const [survey, analytics] = await Promise.all([
      api('/api/protected/surveys/' + surveyId),
      api('/api/protected/surveys/' + surveyId + '/analytics'),
    ]);
    const el = document.getElementById('surveyDetailBody');
    const nps = analytics.nps || {};
    const sends = analytics.sends || {};
    const npsColor = nps.score >= 50 ? '#22c55e' : nps.score >= 0 ? '#f59e0b' : '#ef4444';

    el.innerHTML = `
      <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border-radius:12px;margin-bottom:16px">
        <div style="font-size:11px;color:#065f46;font-weight:600">NPS Score</div>
        <div style="font-size:48px;font-weight:900;color:${npsColor}">${nps.total > 0 ? nps.score : '-'}</div>
        <div style="font-size:12px;color:#64748b">${nps.total > 0 ? `평균 ${nps.avgScore}점 · 응답 ${nps.total}건` : '아직 응답이 없습니다'}</div>
      </div>

      ${nps.total > 0 ? `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
        <div style="background:#f0fdf4;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#166534;font-weight:600">추천 (9-10)</div>
          <div style="font-size:22px;font-weight:900;color:#22c55e">${nps.promoters}</div>
        </div>
        <div style="background:#fef3c7;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#92400e;font-weight:600">중립 (7-8)</div>
          <div style="font-size:22px;font-weight:900;color:#f59e0b">${nps.passives}</div>
        </div>
        <div style="background:#fef2f2;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#991b1b;font-weight:600">비추천 (0-6)</div>
          <div style="font-size:22px;font-weight:900;color:#ef4444">${nps.detractors}</div>
        </div>
      </div>` : ''}

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px">📨 발송 현황</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;text-align:center">
          <div><div style="font-weight:600;color:var(--text-muted)">발송</div><div style="font-size:18px;font-weight:900;color:#3b82f6">${sends.total}</div></div>
          <div><div style="font-weight:600;color:var(--text-muted)">열람</div><div style="font-size:18px;font-weight:900;color:#8b5cf6">${sends.opened + sends.completed}</div></div>
          <div><div style="font-weight:600;color:var(--text-muted)">완료</div><div style="font-size:18px;font-weight:900;color:#22c55e">${sends.completed}</div></div>
          <div><div style="font-weight:600;color:var(--text-muted)">만료</div><div style="font-size:18px;font-weight:900;color:#94a3b8">${sends.expired}</div></div>
        </div>
        ${sends.total > 0 ? `<div style="margin-top:10px;font-size:11px;color:var(--text-muted)">완료율 <strong>${sends.completionRate}%</strong></div>` : ''}
      </div>

      ${(analytics.recentResponses || []).length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;margin-bottom:10px">💬 최근 응답</div>
        ${analytics.recentResponses.slice(0, 5).map(r => `
          <div style="background:var(--bg);border-radius:8px;padding:10px 12px;margin-bottom:6px;font-size:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <strong>${esc(r.patient_name || '환자')}</strong>
              <span style="color:var(--text-muted)">${r.nps_score != null ? 'NPS ' + r.nps_score : ''}</span>
            </div>
            ${r.answers && (r.answers.feedback || r.answers.q_comment) ? `<div style="color:#64748b;font-size:11px">"${esc(r.answers.feedback || r.answers.q_comment)}"</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" id="goSendBtn" style="flex:1">📨 발송하기</button>
        <button class="btn btn-secondary btn-sm" id="toggleBtn">${survey.is_active ? '⏸️ 비활성화' : '▶️ 활성화'}</button>
        <button class="btn btn-secondary btn-sm" id="deleteSurveyBtn" style="color:var(--danger)">🗑️</button>
      </div>`;

    el.querySelector('#goSendBtn').addEventListener('click', () => { closeModal(); state._surveyTab = 'batches'; navigate('surveys'); });
    el.querySelector('#toggleBtn').addEventListener('click', async () => {
      try {
        await api('/api/protected/surveys/' + surveyId, { method: 'PUT', json: { is_active: !survey.is_active } });
        toast(survey.is_active ? '비활성화됨' : '활성화됨', 'success'); closeModal(); navigate('surveys');
      } catch(e) { toast(esc(e.message), 'error'); }
    });
    el.querySelector('#deleteSurveyBtn').addEventListener('click', async () => {
      if (!confirm('설문을 삭제하시겠습니까? 발송 기록도 함께 삭제됩니다.')) return;
      try {
        await api('/api/protected/surveys/' + surveyId, { method: 'DELETE' });
        toast('삭제 완료', 'success'); closeModal(); navigate('surveys');
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  } catch(e) {
    document.getElementById('surveyDetailBody').innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px">${esc(e.message)}</div>`;
  }
}

/* ════════════════════════════════════════
   SMS 설정 (설정 페이지에서 호출)
   ════════════════════════════════════════ */
async function renderSmsConfig(container) {
  container.innerHTML = '<div style="text-align:center;padding:20px"><span class="loading-spinner"></span></div>';
  try {
    const cfg = await api('/api/protected/surveys/sms-config');
    container.innerHTML = `
      <div class="p-16">
        <div style="margin-bottom:16px;padding:12px;background:${cfg.configured ? '#f0fdf4' : '#fef3c7'};border-radius:8px;font-size:12px;color:${cfg.configured ? '#166534' : '#92400e'}">
          ${cfg.configured ? '✅ Aligo SMS 연동 완료' : '⚠️ SMS 자동 발송을 위해 Aligo API 설정이 필요합니다'}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
          <a href="https://smartsms.aligo.in" target="_blank" style="color:var(--primary)">Aligo 스마트문자</a> 가입 후 API 키를 입력하세요
        </div>
        <div class="form-group"><label>Aligo User ID</label><input class="form-input" id="smsUserId" value="${esc(cfg.user_id)}" placeholder="Aligo 아이디"></div>
        <div class="form-group"><label>API Key</label><input class="form-input" id="smsApiKey" type="password" placeholder="${cfg.has_api_key ? '●●●● (설정됨)' : 'API Key 입력'}"></div>
        <div class="form-group"><label>발신번호</label><input class="form-input" id="smsSender" value="${esc(cfg.sender)}" placeholder="02-000-0000"></div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary btn-sm" id="saveSmsBtn">저장</button>
          ${cfg.configured ? '<button class="btn btn-secondary btn-sm" id="testSmsBtn">📱 테스트 발송</button>' : ''}
        </div>
        ${cfg.configured ? `
        <div id="smsTestArea" style="display:none;margin-top:16px;padding:12px;background:var(--bg);border-radius:8px">
          <div class="form-group"><label>테스트 수신번호</label><input class="form-input" id="testPhone" placeholder="01012345678"></div>
          <button class="btn btn-sm" style="background:#f59e0b;color:white;border:none" id="sendTestBtn">테스트 SMS 보내기</button>
        </div>` : ''}
      </div>`;
    document.getElementById('saveSmsBtn').addEventListener('click', async () => {
      const apiKey = document.getElementById('smsApiKey').value.trim();
      if (!apiKey && !cfg.has_api_key) { toast('API Key를 입력해주세요', 'error'); return; }
      try {
        await api('/api/protected/surveys/sms-config', { method: 'PUT', json: {
          api_key: apiKey || undefined,
          user_id: document.getElementById('smsUserId').value.trim(),
          sender: document.getElementById('smsSender').value.trim(),
        }});
        toast('SMS 설정 저장 완료!', 'success');
        renderSmsConfig(container);
      } catch(e) { toast(esc(e.message), 'error'); }
    });
    if (cfg.configured) {
      document.getElementById('testSmsBtn')?.addEventListener('click', () => {
        const area = document.getElementById('smsTestArea');
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('sendTestBtn')?.addEventListener('click', async () => {
        const phone = document.getElementById('testPhone').value.trim();
        if (!phone) { toast('수신번호를 입력해주세요', 'error'); return; }
        const btn = document.getElementById('sendTestBtn');
        btn.disabled = true; btn.textContent = '발송 중...';
        try {
          const r = await api('/api/protected/surveys/sms-config/test', { method: 'POST', json: { phone } });
          toast(r.success ? '✅ 테스트 SMS 발송 성공!' : '❌ ' + (r.error || '실패'), r.success ? 'success' : 'error');
        } catch(e) { toast('❌ ' + esc(e.message), 'error'); }
        btn.disabled = false; btn.textContent = '테스트 SMS 보내기';
      });
    }
  } catch(e) { container.innerHTML = `<div style="color:#ef4444;padding:16px">${esc(e.message)}</div>`; }
}

/* ════════════════════════════════════════
   헬퍼 함수
   ════════════════════════════════════════ */
function batchStatusBadge(status) {
  const m = {
    draft: ['#e2e8f0','#475569','작성중'],
    confirmed: ['#dbeafe','#1e40af','확인됨'],
    sending: ['#fef3c7','#92400e','발송중'],
    completed: ['#dcfce7','#166534','완료'],
    cancelled: ['#fee2e2','#991b1b','취소'],
  };
  const [bg,color,label] = m[status] || ['#e2e8f0','#475569',status];
  return `<span style="background:${bg};color:${color};font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600">${label}</span>`;
}

function sendStatusIcon(status) {
  return { pending:'⏳', sent:'📤', opened:'👁️', completed:'✅', failed:'❌', expired:'⏰' }[status] || status;
}

function formatPhone(p) {
  if (!p) return '';
  p = p.replace(/[^0-9]/g, '');
  if (p.length === 11) return p.slice(0,3)+'-'+p.slice(3,7)+'-'+p.slice(7);
  if (p.length === 10) return p.slice(0,3)+'-'+p.slice(3,6)+'-'+p.slice(6);
  return p;
}

PFM.modules.surveys = { renderSurveys, renderSmsConfig };
})(window.PFM);
