/* ═══ Module: 환자 만족도 설문 ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, navigate, canManage, formatPrice } = PFM;

/* ════════════════════════════════════════
   설문 관리 메인 (관리자)
   ════════════════════════════════════════ */
async function renderSurveys(body, actions) {
  if (!canManage()) {
    body.innerHTML = '<div class="empty-state"><h3>관리자만 접근 가능합니다</h3></div>';
    return;
  }
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="createSurveyBtn">${ICONS.plus} 설문 만들기</button>`;
  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

  try {
    const surveys = await api('/api/protected/surveys');
    if (!surveys.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:16px">📋</div>
          <h3>등록된 설문이 없습니다</h3>
          <p style="color:var(--text-muted);margin-top:8px">설문을 만들어 환자 만족도를 측정하세요</p>
        </div>`;
    } else {
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;max-width:800px">${surveys.map(s => `
        <div class="survey-item" data-id="${esc(s.id)}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseleave="this.style.boxShadow=''">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:20px">${s.is_active ? '🟢' : '⚪'}</span>
              <span style="font-weight:700;font-size:15px">${esc(s.title)}</span>
            </div>
            <div style="display:flex;gap:4px">
              ${s.auto_send ? '<span style="background:#dbeafe;color:#1e40af;font-size:10px;padding:2px 8px;border-radius:4px;font-weight:600">자동발송</span>' : ''}
            </div>
          </div>
          ${s.description ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${esc(s.description)}</div>` : ''}
          <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
            <span>📊 응답 ${s.response_count || 0}건</span>
            <span>⭐ NPS ${s.avg_nps ? s.avg_nps.toFixed(1) : '-'}</span>
            <span>⏰ ${s.send_delay_hours}시간 후 발송</span>
            <span>📅 ${s.expire_days}일 유효</span>
          </div>
        </div>
      `).join('')}</div>`;

      body.querySelectorAll('.survey-item').forEach(el => {
        el.addEventListener('click', () => openSurveyDetail(el.dataset.id));
      });
    }
  } catch(e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:40px">로딩 실패: ${esc(e.message)}</div>`;
  }

  document.getElementById('createSurveyBtn').addEventListener('click', openCreateSurvey);
}

/* ──── 설문 생성 ──── */
function openCreateSurvey() {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>📋 설문 만들기</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      <form class="auth-form" id="surveyForm">
        <div class="form-group"><label>설문 제목</label><input class="form-input" id="svTitle" value="진료 후 만족도 설문" required></div>
        <div class="form-group"><label>설명</label><input class="form-input" id="svDesc" placeholder="선택사항"></div>
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
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px">📝 질문 구성</div>
          <div id="questionList"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="addQuestionBtn" class="mt-8">${ICONS.plus} 질문 추가</button>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="svSubmit">생성</button>
    </div>`;
  showModal();

  // 기본 질문 추가
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
      <div style="background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:12px;margin-bottom:8px" data-idx="${i}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;font-weight:600;color:var(--primary)">${typeLabel(q.type)} #${i+1}</span>
          <button type="button" class="btn-icon qRemove" data-idx="${i}" style="font-size:11px;color:var(--danger)">${ICONS.trash}</button>
        </div>
        <input class="form-input qLabel" data-idx="${i}" value="${esc(q.label)}" placeholder="질문 내용" style="font-size:13px;margin-bottom:6px">
        ${q.type === 'choice' ? `<input class="form-input qOptions" data-idx="${i}" value="${(q.options||[]).join(', ')}" placeholder="선택지 (쉼표 구분)" class="text-base">` : ''}
      </div>
    `).join('');

    list.querySelectorAll('.qLabel').forEach(el => {
      el.addEventListener('input', () => { questions[el.dataset.idx].label = el.value; });
    });
    list.querySelectorAll('.qOptions').forEach(el => {
      el.addEventListener('input', () => { questions[el.dataset.idx].options = el.value.split(',').map(s => s.trim()).filter(Boolean); });
    });
    list.querySelectorAll('.qRemove').forEach(el => {
      el.addEventListener('click', () => { questions.splice(el.dataset.idx, 1); renderQuestions(); });
    });
  }

  function typeLabel(t) {
    return { nps: '🎯 NPS', rating: '⭐ 별점', choice: '🔘 객관식', text: '✏️ 주관식' }[t] || t;
  }

  document.getElementById('addQuestionBtn').addEventListener('click', () => {
    const modal2 = prompt('질문 유형을 선택하세요:\n1. NPS (추천도)\n2. 별점 (5점)\n3. 객관식\n4. 주관식', '2');
    if (!modal2) return;
    const types = { '1': 'nps', '2': 'rating', '3': 'choice', '4': 'text' };
    const type = types[modal2] || 'rating';
    questions.push({ id: 'q' + Date.now(), type, label: '', options: type === 'choice' ? ['옵션1', '옵션2', '옵션3'] : undefined });
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
        title,
        description: document.getElementById('svDesc').value,
        send_delay_hours: parseInt(document.getElementById('svDelay').value),
        expire_days: parseInt(document.getElementById('svExpire').value),
        questions: validQs,
      }});
      toast('설문 생성 완료!', 'success');
      closeModal();
      navigate('surveys');
    } catch(e) { toast(esc(e.message), 'error'); }
  });
}

/* ──── 설문 상세 / NPS 대시보드 ──── */
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
    renderSurveyDetail(document.getElementById('surveyDetailBody'), survey, analytics, surveyId);
  } catch(e) {
    document.getElementById('surveyDetailBody').innerHTML = `<div style="color:#ef4444;text-align:center;padding:20px">${esc(e.message)}</div>`;
  }
}

function renderSurveyDetail(el, survey, a, surveyId) {
  const nps = a.nps || {};
  const sends = a.sends || {};
  const npsColor = nps.score >= 50 ? '#22c55e' : nps.score >= 0 ? '#f59e0b' : '#ef4444';

  el.innerHTML = `
    <!-- NPS 스코어 -->
    <div style="text-align:center;padding:20px;background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border-radius:12px;margin-bottom:16px">
      <div style="font-size:11px;color:#065f46;font-weight:600">NPS Score</div>
      <div style="font-size:48px;font-weight:900;color:${npsColor}">${nps.total > 0 ? nps.score : '-'}</div>
      <div style="font-size:12px;color:#64748b">${nps.total > 0 ? `평균 ${nps.avgScore}점 · 응답 ${nps.total}건` : '아직 응답이 없습니다'}</div>
    </div>

    <!-- NPS 분포 -->
    ${nps.total > 0 ? `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
      <div style="background:#f0fdf4;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:10px;color:#166534;font-weight:600">추천 (9-10)</div>
        <div style="font-size:22px;font-weight:900;color:#22c55e">${nps.promoters}</div>
        <div style="font-size:10px;color:#64748b">${nps.total > 0 ? Math.round(nps.promoters/nps.total*100) : 0}%</div>
      </div>
      <div style="background:#fef3c7;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:10px;color:#92400e;font-weight:600">중립 (7-8)</div>
        <div style="font-size:22px;font-weight:900;color:#f59e0b">${nps.passives}</div>
        <div style="font-size:10px;color:#64748b">${nps.total > 0 ? Math.round(nps.passives/nps.total*100) : 0}%</div>
      </div>
      <div style="background:#fef2f2;border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:10px;color:#991b1b;font-weight:600">비추천 (0-6)</div>
        <div style="font-size:22px;font-weight:900;color:#ef4444">${nps.detractors}</div>
        <div style="font-size:10px;color:#64748b">${nps.total > 0 ? Math.round(nps.detractors/nps.total*100) : 0}%</div>
      </div>
    </div>` : ''}

    <!-- 발송 통계 -->
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

    <!-- 최근 응답 -->
    ${(a.recentResponses || []).length ? `
    <div class="mb-16">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">💬 최근 응답</div>
      ${a.recentResponses.slice(0, 5).map(r => `
        <div style="background:var(--bg);border-radius:8px;padding:10px 12px;margin-bottom:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <strong>${esc(r.patient_name || '환자')}</strong>
            <span class="text-muted">${r.nps_score != null ? 'NPS ' + r.nps_score : ''}</span>
          </div>
          ${r.answers && r.answers.feedback ? `<div style="color:#64748b;font-size:11px">"${esc(r.answers.feedback)}"</div>` : ''}
        </div>
      `).join('')}
    </div>` : ''}

    <!-- 액션 버튼 -->
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary btn-sm" id="sendSurveyBtn" class="flex-1">📨 수동 발송</button>
      <button class="btn btn-secondary btn-sm" id="toggleActiveBtn" class="flex-1">${survey.is_active ? '⏸️ 비활성화' : '▶️ 활성화'}</button>
    </div>`;

  document.getElementById('sendSurveyBtn').addEventListener('click', () => openSendSurvey(surveyId));
  document.getElementById('toggleActiveBtn').addEventListener('click', async () => {
    try {
      await api('/api/protected/surveys/' + surveyId, { method: 'PUT', json: { is_active: !survey.is_active } });
      toast(survey.is_active ? '설문 비활성화됨' : '설문 활성화됨', 'success');
      closeModal();
      navigate('surveys');
    } catch(e) { toast(esc(e.message), 'error'); }
  });
}

/* ──── 수동 발송 ──── */
function openSendSurvey(surveyId) {
  closeModal();
  setTimeout(() => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>📨 설문 수동 발송</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto">
        <div style="margin-bottom:16px;padding:12px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e">
          💡 환자 이름과 전화번호를 입력하면 설문 링크를 SMS로 발송합니다
        </div>
        <div id="recipientList">
          <div class="rcpt-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
            <input class="form-input rcpt-name" placeholder="환자명" class="text-base">
            <input class="form-input rcpt-phone" placeholder="010-0000-0000" class="text-base">
            <input class="form-input rcpt-doctor" placeholder="담당의 (선택)" class="text-base">
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="addRcptBtn">${ICONS.plus} 수신자 추가</button>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
        <button class="btn btn-primary" id="sendBtn">📨 발송하기</button>
      </div>`;
    showModal();

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('addRcptBtn').addEventListener('click', () => {
      const list = document.getElementById('recipientList');
      const row = document.createElement('div');
      row.className = 'rcpt-row';
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px';
      row.innerHTML = `
        <input class="form-input rcpt-name" placeholder="환자명" class="text-base">
        <input class="form-input rcpt-phone" placeholder="010-0000-0000" class="text-base">
        <input class="form-input rcpt-doctor" placeholder="담당의 (선택)" class="text-base">`;
      list.appendChild(row);
    });

    document.getElementById('sendBtn').addEventListener('click', async () => {
      const rows = document.querySelectorAll('.rcpt-row');
      const recipients = [];
      rows.forEach(row => {
        const name = row.querySelector('.rcpt-name').value.trim();
        const phone = row.querySelector('.rcpt-phone').value.trim();
        const doctor = row.querySelector('.rcpt-doctor').value.trim();
        if (name && phone) recipients.push({ patient_name: name, patient_phone: phone, doctor_name: doctor });
      });
      if (!recipients.length) { toast('수신자를 입력해주세요', 'error'); return; }
      try {
        const result = await api('/api/protected/surveys/' + surveyId + '/send', { method: 'POST', json: { recipients } });
        let msg = `${result.sent}건 발송 완료`;
        if (!result.smsConfigured) msg += ' (SMS 미설정 — 설정 > SMS 설정에서 Aligo API 등록 필요)';
        if (result.errors) msg += `\n실패: ${result.errors.join(', ')}`;
        toast(msg, result.errors ? 'warning' : 'success');
        closeModal();
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  }, 200);
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
        <div class="form-group"><label class="text-base">Aligo User ID</label><input class="form-input" id="smsUserId" value="${esc(cfg.user_id)}" placeholder="Aligo 아이디"></div>
        <div class="form-group"><label class="text-base">API Key</label><input class="form-input" id="smsApiKey" type="password" placeholder="${cfg.has_api_key ? '●●●● (설정됨)' : 'API Key 입력'}"></div>
        <div class="form-group"><label class="text-base">발신번호</label><input class="form-input" id="smsSender" value="${esc(cfg.sender)}" placeholder="02-000-0000"></div>
        <button class="btn btn-primary btn-sm" id="saveSmsBtn">저장</button>
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
      } catch(e) { toast(esc(e.message), 'error'); }
    });
  } catch(e) {
    container.innerHTML = `<div style="color:#ef4444;padding:16px">${esc(e.message)}</div>`;
  }
}

PFM.modules.surveys = { renderSurveys, renderSmsConfig };
})(window.PFM);
