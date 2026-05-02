/* ═══ Module: PF Index (페이션트 인덱스) ═══
 * 매주 월요일 원장 대상 병원 경영 / 개원가 분위기 설문 (20문항)
 * - 자동 팝업 (월~수 미응답 시)
 * - 자동저장 (sessionStorage)
 * - 객관 데이터 자동 채움
 * - 제출 후 즉시 결과 + 전국 인사이트 잠금 해제
 */
(function(PFM) {
'use strict';
const { api, esc, toast, state, showModal, closeModal } = PFM;

const AUTO_SAVE_KEY = 'pfm_pfindex_draft';
const DISMISS_KEY = 'pfm_pfindex_dismissed_until'; // 로컬 회피 (서버에도 동기화)

const CATEGORY_META = {
  inflow:    { label: '환자 유입',  icon: '👥', color: '#3b82f6' },
  behavior:  { label: '환자 행동',  icon: '💰', color: '#f59e0b' },
  operation: { label: '운영 효율',  icon: '⚙️', color: '#10b981' },
  outlook:   { label: '전망/종합',  icon: '🔭', color: '#8b5cf6' },
};

/* ────────────────────────────────────────────────
 * 진입 페이지: 메뉴에서 "페이션트 인덱스" 클릭 시
 * ──────────────────────────────────────────────── */
async function renderPfIndex(body) {
  await PFM.withErrorBoundary(body, async () => {
    const status = await api('/api/protected/pf-index/status');
    renderPfIndexHome(body, status);
  }, 'pf_index');
}

function renderPfIndexHome(body, status) {
  const responded = !!status.responded;
  const wkStart = status.weekStart;
  const myScore = status.myScore;

  body.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="margin:0;font-size:22px;font-weight:700">📊 페이션트 인덱스</h2>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px">매주 월요일, 5분으로 측정하는 우리 병원과 개원가 전체의 경영 체감 지수</p>
      </div>
      <div style="display:flex;gap:8px">
        ${responded
          ? `<button class="btn btn-primary" onclick="PFMPfIndex.openNational()"><i class="fas fa-globe"></i> 전국 인사이트</button>`
          : `<button class="btn btn-primary" onclick="PFMPfIndex.openSurvey()"><i class="fas fa-pen-to-square"></i> 이번 주 설문 시작 (5분)</button>`
        }
      </div>
    </div>

    <!-- 이번 주 카드 -->
    <div class="card" style="padding:24px;margin-bottom:16px;background:linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%);border:1px solid #c7d2fe">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:12px;color:#6366f1;font-weight:600;letter-spacing:0.5px">${wkStart} 시작 주</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px">
            ${responded
              ? `✅ 이번 주 응답 완료 — 내 지수 <span style="color:#6366f1;font-size:24px">${(myScore||0).toFixed(2)}</span> / 5.00`
              : `📝 이번 주 아직 응답하지 않으셨습니다`
            }
          </div>
          <div style="font-size:13px;color:#475569;margin-top:6px">
            전국 ${status.national.thisWeekHospitals}개 병원 · ${status.national.thisWeekResponses}명 응답 (이번 주 누적)
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#64748b">연속 참여</div>
          <div style="font-size:28px;font-weight:800;color:#6366f1">${status.status.current_streak || 0}<span style="font-size:14px;color:#94a3b8">주</span></div>
          <div style="font-size:11px;color:#64748b">최장 ${status.status.longest_streak || 0}주 · 누적 ${status.status.total_responses || 0}회</div>
        </div>
      </div>
    </div>

    <!-- 객관 데이터 미리보기 (이번 달 자동 집계) -->
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#0f172a">📌 이번 달 우리 병원 실측 데이터 <span style="font-weight:400;color:#94a3b8;font-size:12px">(설문 응답 시 자동 첨부)</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
        ${objCard('🆕 신환', status.objective.new_patients, '명')}
        ${objCard('👥 총 환자', status.objective.total_patients, '명')}
        ${objCard('💬 상담', status.objective.consultation_cnt, '건')}
        ${objCard('🎯 전환율', status.objective.conversion_rate, '%')}
        ${objCard('💵 평균 객단가', formatMoney(status.objective.avg_revenue), '')}
        ${objCard('💰 매출', formatMoney(status.objective.total_revenue), '')}
        ${objCard('📞 통화', status.objective.call_count, '건')}
        ${objCard('⭐ 리뷰', status.objective.review_count, '건')}
      </div>
    </div>

    <!-- 본인 6주 추이 -->
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#0f172a">📈 내 6주 추이</div>
      <div id="pfindex-mytrend" style="min-height:120px;color:#94a3b8;font-size:13px">불러오는 중...</div>
    </div>

    <!-- 안내 -->
    <div class="card" style="padding:20px;background:#fffbeb;border:1px solid #fde68a">
      <div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:8px">💡 페이션트 인덱스 사용법</div>
      <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13px;line-height:1.8">
        <li><strong>매주 월요일</strong> 자동으로 5분짜리 팝업이 뜹니다 (응답하면 그 주는 안 떠요)</li>
        <li><strong>20문항 5점 척도</strong> — 신환·소개·마케팅·전환·매출 전망 등 4개 영역</li>
        <li><strong>응답한 분만</strong> 전국/지역/진료과별 인사이트 보고서를 볼 수 있어요</li>
        <li>제출하시면 익명으로 합산되어 전국 풀에 기여됩니다 (병원명·이메일 비공개)</li>
        <li>이번 달 신환·매출 등 우리 병원 실측은 자동으로 함께 저장돼 더 정확해집니다</li>
      </ul>
    </div>
  `;

  loadMyTrend();
}

function objCard(label, value, unit) {
  return `
    <div style="background:#f8fafc;border-radius:10px;padding:12px;border:1px solid #e2e8f0">
      <div style="font-size:11px;color:#64748b">${label}</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px;color:#0f172a">${value}<span style="font-size:11px;color:#94a3b8;margin-left:2px">${unit}</span></div>
    </div>
  `;
}

function formatMoney(n) {
  n = Number(n) || 0;
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return n.toLocaleString('ko-KR');
}

async function loadMyTrend() {
  const box = document.getElementById('pfindex-mytrend');
  if (!box) return;
  try {
    const data = await api('/api/protected/pf-index/my-trend');
    if (!data.weeks || data.weeks.length === 0) {
      box.innerHTML = `<div style="color:#94a3b8;font-size:13px;padding:20px 0;text-align:center">아직 응답 이력이 없습니다. 첫 응답을 시작해보세요!</div>`;
      return;
    }
    const max = 5;
    box.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:8px;height:140px">
        ${data.weeks.map(w => {
          const h = Math.max(8, (w.overall / max) * 110);
          const color = w.overall >= 3.5 ? '#10b981' : w.overall >= 2.5 ? '#f59e0b' : '#ef4444';
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <div style="font-size:11px;font-weight:700;color:${color}">${(w.overall||0).toFixed(2)}</div>
              <div style="width:100%;background:${color};height:${h}px;border-radius:6px 6px 0 0"></div>
              <div style="font-size:10px;color:#94a3b8">${w.week.slice(5)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div style="color:#ef4444;font-size:13px">추이 로딩 실패</div>`;
  }
}

/* ────────────────────────────────────────────────
 * 설문 모달 (전체 화면)
 * ──────────────────────────────────────────────── */
let _surveyState = null;

async function openSurvey(autoOpen) {
  // 기존 모달 제거
  document.getElementById('pfindexSurveyOverlay')?.remove();

  let status;
  try {
    status = await api('/api/protected/pf-index/status');
  } catch (e) {
    toast('설문 정보를 불러오지 못했어요', 'error');
    return;
  }

  if (status.responded) {
    toast('이번 주는 이미 응답하셨습니다 — 전국 인사이트로 이동합니다', 'info');
    setTimeout(() => openNational(), 600);
    return;
  }

  // 자동저장 복원
  let draft = null;
  try {
    const raw = sessionStorage.getItem(AUTO_SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.weekStart === status.weekStart) draft = parsed;
    }
  } catch {}

  _surveyState = {
    weekStart: status.weekStart,
    questions: status.questions,
    objective: status.objective,
    answers: draft?.answers || {},
    region: draft?.region || '',
    specialty: draft?.specialty || 'dental',
    hospitalSize: draft?.hospitalSize || '',
    comment: draft?.comment || '',
    shareToNational: draft?.shareToNational !== false,
    currentStep: draft?.currentStep || 0, // 0=intro, 1~5=문항그룹, 6=완료
    autoOpen: !!autoOpen,
  };

  renderSurveyOverlay();
}

function renderSurveyOverlay() {
  const s = _surveyState;
  const overlay = document.createElement('div');
  overlay.id = 'pfindexSurveyOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;animation:fadeIn 0.25s ease';

  const totalAnswered = Object.keys(s.answers).length;
  const progress = Math.round((totalAnswered / 20) * 100);

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;width:100%;max-width:760px;margin:auto;padding:0;overflow:hidden;animation:slideUp 0.3s ease;box-shadow:0 25px 60px rgba(0,0,0,0.3)">
      <!-- 헤더 -->
      <div style="padding:20px 28px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:11px;opacity:0.85;letter-spacing:1px;font-weight:600">PATIENT INDEX · ${s.weekStart}</div>
          <div style="font-size:20px;font-weight:700;margin-top:2px">이번 주 병원 경영 체감 설문</div>
        </div>
        <button onclick="PFMPfIndex.dismissSurvey()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>
      </div>

      <!-- 진행 바 -->
      <div style="padding:0 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:10px 0 6px">
          <span>${totalAnswered} / 20 문항 완료</span>
          <span style="font-weight:700;color:#6366f1">${progress}%</span>
        </div>
        <div style="height:4px;background:#e2e8f0;border-radius:99px;margin-bottom:10px;overflow:hidden">
          <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);transition:width 0.3s"></div>
        </div>
      </div>

      <!-- 본문 -->
      <div id="pfindexSurveyBody" style="padding:24px 28px;max-height:calc(100vh - 200px);overflow-y:auto"></div>

      <!-- 푸터 -->
      <div id="pfindexSurveyFooter" style="padding:16px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;gap:12px"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderSurveyStep();
}

function renderSurveyStep() {
  const s = _surveyState;
  const body = document.getElementById('pfindexSurveyBody');
  const footer = document.getElementById('pfindexSurveyFooter');
  if (!body) return;

  // step 0: 인트로 + 메타 (지역/규모)
  if (s.currentStep === 0) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 0 24px">
        <div style="font-size:44px;margin-bottom:8px">📊</div>
        <h3 style="margin:0;font-size:22px;font-weight:700">5분이면 충분합니다</h3>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px;line-height:1.6">
          20개 질문에 답하시면<br>
          이번 주 <strong>전국 개원가 분위기 보고서</strong>를 보실 수 있습니다.
        </p>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:18px">
        <div style="font-weight:700;font-size:13px;margin-bottom:12px;color:#0f172a">기본 정보</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px">지역</label>
            <select id="pfi-region" class="form-control" style="width:100%">
              <option value="">선택 안 함</option>
              ${['서울','경기','인천','부산','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'].map(r =>
                `<option value="${r}" ${s.region===r?'selected':''}>${r}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px">병원 규모</label>
            <select id="pfi-size" class="form-control" style="width:100%">
              <option value="">선택 안 함</option>
              <option value="small" ${s.hospitalSize==='small'?'selected':''}>소형 (~5인)</option>
              <option value="medium" ${s.hospitalSize==='medium'?'selected':''}>중형 (6~15인)</option>
              <option value="large" ${s.hospitalSize==='large'?'selected':''}>대형 (16인 이상)</option>
            </select>
          </div>
        </div>
      </div>
      <div style="background:#eff6ff;border-radius:12px;padding:14px 16px;border:1px solid #bfdbfe">
        <div style="font-size:12px;color:#1e40af;font-weight:600;margin-bottom:6px">📌 이번 달 우리 병원 자동 첨부 데이터</div>
        <div style="font-size:13px;color:#1e3a8a;line-height:1.7">
          신환 <strong>${s.objective.new_patients}명</strong> ·
          상담 <strong>${s.objective.consultation_cnt}건</strong> ·
          전환율 <strong>${s.objective.conversion_rate}%</strong> ·
          매출 <strong>${formatMoney(s.objective.total_revenue)}</strong>
        </div>
        <div style="font-size:11px;color:#3b82f6;margin-top:6px">→ 답변과 함께 익명으로 합산되어 인사이트 정확도를 높입니다</div>
      </div>
    `;
    footer.innerHTML = `
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#475569;cursor:pointer">
        <input type="checkbox" id="pfi-share" ${s.shareToNational?'checked':''}>
        전국 풀에 익명 합산
      </label>
      <button class="btn btn-primary" onclick="PFMPfIndex.nextStep()">시작하기 <i class="fas fa-arrow-right"></i></button>
    `;
    return;
  }

  // step 1~4: 카테고리별 문항 그룹 (5/3/4/8)
  const groups = [
    { range: [1, 4],  category: 'inflow',    title: '환자 유입 현황',   desc: '지난달 대비 체감 변화를 선택해주세요.' },
    { range: [5, 7],  category: 'behavior',  title: '환자 행동 변화',   desc: '환자들의 내원 및 소비 패턴 변화를 체크해주세요.' },
    { range: [8, 11], category: 'operation', title: '운영 현황',       desc: '병원 운영과 비용 관련 현황을 체크해주세요.' },
    { range: [12, 20],category: 'outlook',   title: '전망 및 종합 평가', desc: '마지막 단계입니다. 조금만 더 힘내주세요!' },
  ];

  if (s.currentStep >= 1 && s.currentStep <= 4) {
    const g = groups[s.currentStep - 1];
    const meta = CATEGORY_META[g.category];
    const qs = s.questions.filter(q => q.id >= g.range[0] && q.id <= g.range[1]);
    const answeredInGroup = qs.filter(q => s.answers[q.id]).length;
    const allAnswered = answeredInGroup === qs.length;

    body.innerHTML = `
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:32px">${meta.icon}</div>
        <h3 style="margin:6px 0 4px;font-size:18px;font-weight:700;color:${meta.color}">${g.title}</h3>
        <p style="margin:0;color:#64748b;font-size:13px">${g.desc}</p>
      </div>
      ${qs.map(q => renderQuestion(q, s.answers[q.id])).join('')}
      ${s.currentStep === 4 ? `
        <div style="margin-top:18px">
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px">자유 의견 (선택, 익명 처리)</label>
          <textarea id="pfi-comment" class="form-control" rows="2" placeholder="이번 주 특별히 느낀 점이나 공유하고 싶은 인사이트가 있다면..." style="width:100%;resize:vertical">${esc(s.comment)}</textarea>
        </div>
      ` : ''}
    `;

    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="PFMPfIndex.prevStep()"><i class="fas fa-arrow-left"></i> 이전</button>
      <div style="font-size:12px;color:${allAnswered?'#10b981':'#94a3b8'}">
        ${answeredInGroup} / ${qs.length} 답변
      </div>
      ${s.currentStep === 4
        ? `<button class="btn btn-primary" onclick="PFMPfIndex.submitSurvey()" ${allAnswered ? '' : 'disabled'} id="pfi-submit-btn">
            ${allAnswered ? '<i class="fas fa-paper-plane"></i> 제출하기' : '모든 문항에 답해주세요'}
          </button>`
        : `<button class="btn btn-primary" onclick="PFMPfIndex.nextStep()" ${allAnswered ? '' : 'disabled'}>
            다음 <i class="fas fa-arrow-right"></i>
          </button>`
      }
    `;

    // 옵션 클릭 핸들러
    body.querySelectorAll('[data-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = Number(btn.getAttribute('data-q'));
        const val = Number(btn.getAttribute('data-v'));
        s.answers[qId] = val;
        autoSave();
        renderSurveyStep();
      });
    });
    return;
  }
}

function renderQuestion(q, answer) {
  const meta = CATEGORY_META[q.category];
  return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:12px;background:#fff;${answer?'border-color:'+meta.color+';background:'+meta.color+'08':''}">
      <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px">
        <span style="background:${meta.color};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;flex-shrink:0">Q${q.id}</span>
        <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.5">${esc(q.question)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${q.options.map((opt, idx) => {
          const val = idx + 1;
          const selected = answer === val;
          return `
            <button data-q="${q.id}" data-v="${val}" class="pfi-opt"
              style="text-align:left;padding:10px 14px;border-radius:8px;border:1px solid ${selected?meta.color:'#e2e8f0'};background:${selected?meta.color:'#fff'};color:${selected?'#fff':'#0f172a'};font-size:13px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:10px;font-weight:${selected?'600':'400'}">
              <span style="width:20px;height:20px;border-radius:50%;border:2px solid ${selected?'#fff':'#cbd5e1'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${selected ? '<span style="width:8px;height:8px;background:#fff;border-radius:50%"></span>' : ''}
              </span>
              ${esc(opt)}
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function nextStep() {
  const s = _surveyState;
  // step 0 → 메타 저장
  if (s.currentStep === 0) {
    s.region = document.getElementById('pfi-region')?.value || '';
    s.hospitalSize = document.getElementById('pfi-size')?.value || '';
    s.shareToNational = !!document.getElementById('pfi-share')?.checked;
  }
  if (s.currentStep === 4) {
    s.comment = document.getElementById('pfi-comment')?.value || '';
  }
  s.currentStep++;
  autoSave();
  renderSurveyStep();
  document.getElementById('pfindexSurveyBody').scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep() {
  const s = _surveyState;
  if (s.currentStep === 4) s.comment = document.getElementById('pfi-comment')?.value || '';
  if (s.currentStep > 0) s.currentStep--;
  autoSave();
  renderSurveyStep();
}

function autoSave() {
  try {
    sessionStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(_surveyState));
  } catch {}
}

async function dismissSurvey() {
  const s = _surveyState;
  if (Object.keys(s.answers).length > 0) {
    if (!confirm('진행 중인 답변은 자동저장됩니다. 닫으시겠습니까?')) return;
  }
  // 서버에 dismiss 기록 (월요일 자동 팝업 방지용)
  try { await api('/api/protected/pf-index/dismiss', { method: 'POST', body: '{}' }); } catch {}
  try { localStorage.setItem(DISMISS_KEY, s.weekStart); } catch {}
  document.getElementById('pfindexSurveyOverlay')?.remove();
}

async function submitSurvey() {
  const s = _surveyState;
  s.comment = document.getElementById('pfi-comment')?.value || '';
  if (Object.keys(s.answers).length < 20) {
    toast('아직 답변하지 않은 문항이 있습니다', 'warning');
    return;
  }

  const btn = document.getElementById('pfi-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 제출 중...'; }

  try {
    const res = await api('/api/protected/pf-index/submit', {
      method: 'POST',
      body: JSON.stringify({
        answers: s.answers,
        region: s.region,
        specialty: 'dental',
        hospital_size: s.hospitalSize,
        comment: s.comment,
        share_to_national: s.shareToNational,
      })
    });
    sessionStorage.removeItem(AUTO_SAVE_KEY);
    _surveyState = null;
    renderSubmitResult(res);
  } catch (e) {
    toast('제출 실패: ' + (e.message || ''), 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> 다시 제출'; }
  }
}

function renderSubmitResult(res) {
  const overlay = document.getElementById('pfindexSurveyOverlay');
  if (!overlay) return;
  const inner = overlay.querySelector('div');
  const sc = res.scores;
  inner.innerHTML = `
    <div style="padding:48px 32px;text-align:center">
      <div style="font-size:60px;margin-bottom:12px">🎉</div>
      <h3 style="margin:0;font-size:24px;font-weight:800;color:#10b981">설문 제출 완료!</h3>
      <p style="color:#64748b;margin:8px 0 24px;font-size:14px">${res.streak}주 연속 참여 · 누적 ${res.totalResponses}회</p>

      <div style="background:linear-gradient(135deg,#eff6ff,#f5f3ff);border-radius:14px;padding:24px;margin-bottom:20px">
        <div style="font-size:11px;color:#6366f1;letter-spacing:1px;font-weight:700">YOUR PATIENT INDEX</div>
        <div style="font-size:48px;font-weight:800;color:#6366f1;margin:6px 0;line-height:1">${sc.overall.toFixed(2)}<span style="font-size:18px;color:#94a3b8">/ 5.00</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px">
          ${[
            ['유입',sc.inflow,'#3b82f6'], ['행동',sc.behavior,'#f59e0b'],
            ['운영',sc.operation,'#10b981'], ['전망',sc.outlook,'#8b5cf6']
          ].map(([k,v,c]) => `
            <div style="background:#fff;border-radius:8px;padding:10px 6px">
              <div style="font-size:10px;color:#64748b">${k}</div>
              <div style="font-size:18px;font-weight:700;color:${c}">${v.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="PFMPfIndex.openNational()"><i class="fas fa-globe"></i> 전국 인사이트 보기</button>
        <button class="btn btn-secondary" onclick="document.getElementById('pfindexSurveyOverlay').remove();PFM.navigate('pf_index')">대시보드로</button>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
 * 전국 인사이트 모달
 * ──────────────────────────────────────────────── */
async function openNational() {
  document.getElementById('pfindexSurveyOverlay')?.remove();
  document.getElementById('pfindexNationalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pfindexNationalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);z-index:100000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;width:100%;max-width:900px;margin:auto;padding:40px;text-align:center">
      <div class="loading-spinner" style="width:36px;height:36px;border-width:3px;margin:0 auto 14px"></div>
      <div style="font-size:14px;color:#475569">🌐 전국 인사이트 불러오는 중...</div>
    </div>
  `;
  document.body.appendChild(overlay);

  let data;
  try { data = await api('/api/protected/pf-index/national'); }
  catch (e) {
    overlay.remove();
    toast('인사이트 로딩 실패', 'error');
    return;
  }

  // 게이팅
  if (data.locked) {
    overlay.querySelector('div').innerHTML = `
      <div style="font-size:60px;margin-bottom:12px">🔒</div>
      <h3 style="margin:0;font-size:22px;font-weight:700">참여자 전용 보고서</h3>
      <p style="color:#64748b;margin:12px 0 24px;font-size:14px">${esc(data.message)}</p>
      <button class="btn btn-primary" onclick="document.getElementById('pfindexNationalOverlay').remove();PFMPfIndex.openSurvey()">
        <i class="fas fa-pen-to-square"></i> 이번 주 설문 시작 (5분)
      </button>
      <button class="btn btn-secondary" style="margin-left:8px" onclick="document.getElementById('pfindexNationalOverlay').remove()">닫기</button>
    `;
    return;
  }

  renderNational(overlay, data);
}

function renderNational(overlay, data) {
  const n = data.national;
  const me = data.me;
  const deltaColor = n.deltaOverall > 0 ? '#10b981' : n.deltaOverall < 0 ? '#ef4444' : '#94a3b8';
  const deltaSign = n.deltaOverall > 0 ? '▲' : n.deltaOverall < 0 ? '▼' : '—';

  // 본인 vs 전국
  const compareBars = [
    ['전체',  me.overall,   n.avgOverall,   '#6366f1'],
    ['유입',  me.inflow,    n.avgInflow,    '#3b82f6'],
    ['행동',  me.behavior,  n.avgBehavior,  '#f59e0b'],
    ['운영',  me.operation, n.avgOperation, '#10b981'],
    ['전망',  me.outlook,   n.avgOutlook,   '#8b5cf6'],
  ];

  // 추이 차트 (단순 SVG line)
  const trendW = 800, trendH = 160, padding = 30;
  const trendData = data.trend;
  const xStep = trendData.length > 1 ? (trendW - padding * 2) / (trendData.length - 1) : 0;
  const yScale = (v) => trendH - padding - (v / 5) * (trendH - padding * 2);
  const points = trendData.map((p, i) => `${padding + i * xStep},${yScale(p.overall)}`).join(' ');

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;width:100%;max-width:900px;margin:auto;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.3)">
      <!-- 헤더 -->
      <div style="padding:20px 28px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:11px;opacity:0.85;letter-spacing:1px;font-weight:600">NATIONAL INSIGHTS · ${data.weekStart}</div>
          <div style="font-size:20px;font-weight:700;margin-top:2px">전국 개원가 분위기 보고서</div>
        </div>
        <button onclick="document.getElementById('pfindexNationalOverlay').remove()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer">×</button>
      </div>

      <div style="padding:24px 28px;max-height:calc(100vh - 160px);overflow-y:auto">
        <!-- 핵심 지표 -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">
          <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:16px">
            <div style="font-size:11px;color:#1e40af;font-weight:600">전국 평균 인덱스</div>
            <div style="font-size:32px;font-weight:800;color:#1e3a8a;margin-top:4px">${n.avgOverall.toFixed(2)}</div>
            <div style="font-size:12px;color:${deltaColor};font-weight:600">${deltaSign} ${Math.abs(n.deltaOverall).toFixed(2)} (전주 대비)</div>
          </div>
          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:16px">
            <div style="font-size:11px;color:#166534;font-weight:600">참여 병원</div>
            <div style="font-size:32px;font-weight:800;color:#14532d;margin-top:4px">${n.totalHospitals}<span style="font-size:14px;color:#64748b">개</span></div>
            <div style="font-size:12px;color:#16a34a">${n.totalResponses}명 응답</div>
          </div>
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:16px">
            <div style="font-size:11px;color:#92400e;font-weight:600">내 인덱스</div>
            <div style="font-size:32px;font-weight:800;color:#78350f;margin-top:4px">${me.overall.toFixed(2)}</div>
            <div style="font-size:12px;color:${me.overall >= n.avgOverall ? '#16a34a' : '#dc2626'};font-weight:600">
              ${me.overall >= n.avgOverall ? '▲ 평균 대비 +' : '▼ 평균 대비 '}${(me.overall - n.avgOverall).toFixed(2)}
            </div>
          </div>
        </div>

        <!-- 본인 vs 전국 비교 -->
        <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:20px">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:#0f172a">📊 내 체감 vs 전국 평균</div>
          ${compareBars.map(([label, mine, avg, color]) => {
            const mineW = (mine / 5) * 100;
            const avgW = (avg / 5) * 100;
            return `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                  <span style="font-weight:600;color:${color}">${label}</span>
                  <span><strong style="color:${color}">${mine.toFixed(2)}</strong> <span style="color:#94a3b8">vs ${avg.toFixed(2)}</span></span>
                </div>
                <div style="position:relative;height:18px;background:#e2e8f0;border-radius:9px;overflow:hidden">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${avgW}%;background:#cbd5e1"></div>
                  <div style="position:absolute;left:0;top:0;height:100%;width:${mineW}%;background:${color};opacity:0.85"></div>
                  <div style="position:absolute;left:${avgW}%;top:0;width:2px;height:100%;background:#475569"></div>
                </div>
              </div>
            `;
          }).join('')}
          <div style="font-size:11px;color:#94a3b8;margin-top:8px">색상 = 내 점수 · 회색 = 전국 평균 · 검은선 = 평균 위치</div>
        </div>

        <!-- 8주 추이 -->
        ${trendData.length > 1 ? `
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:20px">
            <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:#0f172a">📈 전국 인덱스 8주 추이</div>
            <svg viewBox="0 0 ${trendW} ${trendH}" style="width:100%;height:auto">
              <line x1="${padding}" y1="${yScale(3)}" x2="${trendW-padding}" y2="${yScale(3)}" stroke="#e2e8f0" stroke-dasharray="4 4"/>
              <text x="${padding-5}" y="${yScale(3)+4}" text-anchor="end" font-size="10" fill="#94a3b8">3.0</text>
              <polyline points="${points}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round"/>
              ${trendData.map((p, i) => `
                <circle cx="${padding + i * xStep}" cy="${yScale(p.overall)}" r="4" fill="#6366f1" />
                <text x="${padding + i * xStep}" y="${yScale(p.overall) - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#1e293b">${p.overall.toFixed(2)}</text>
                <text x="${padding + i * xStep}" y="${trendH - 8}" text-anchor="middle" font-size="10" fill="#94a3b8">${p.week.slice(5)}</text>
              `).join('')}
            </svg>
          </div>
        ` : ''}

        <!-- 지역별 -->
        ${data.byRegion.length > 0 ? `
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:20px">
            <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:#0f172a">🗺️ 지역별 평균 (이번 주)</div>
            ${data.byRegion.slice(0, 10).map(r => `
              <div style="display:flex;align-items:center;gap:12px;padding:6px 0">
                <div style="width:60px;font-size:13px;font-weight:600">${esc(r.region)}</div>
                <div style="flex:1;height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden">
                  <div style="height:100%;width:${(r.avg/5)*100}%;background:linear-gradient(90deg,#6366f1,#8b5cf6)"></div>
                </div>
                <div style="width:60px;text-align:right;font-size:13px;font-weight:700;color:#6366f1">${r.avg.toFixed(2)}</div>
                <div style="width:50px;text-align:right;font-size:11px;color:#94a3b8">${r.responses}명</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- 문항별 평균 -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px">
          <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:#0f172a">📋 문항별 전국 평균</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
            ${n.byQuestion.map(q => {
              const color = q.avg >= 3.5 ? '#10b981' : q.avg >= 2.5 ? '#f59e0b' : '#ef4444';
              return `
                <div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center">
                  <div style="font-size:10px;color:#64748b;font-weight:600">Q${q.q}</div>
                  <div style="font-size:18px;font-weight:700;color:${color};margin-top:2px">${q.avg.toFixed(2)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
 * 자동 팝업 트리거 (월요일 로그인 시)
 * 외부에서 호출: PFMPfIndex.checkWeeklyPopup()
 * ──────────────────────────────────────────────── */
async function checkWeeklyPopup() {
  if (!state.user) return;
  // admin / doctor 만 팝업 (직원은 메뉴로만 접근)
  const role = state.user.role;
  if (!['admin','manager'].includes(role)) return;

  // 월~수 만 자동 팝업
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const day = now.getUTCDay(); // 1=월, 2=화, 3=수
  if (day < 1 || day > 3) return;

  try {
    const status = await api('/api/protected/pf-index/status');
    if (status.responded) return;

    // 로컬에서 이번 주 dismiss 했는지
    const dismissedFor = localStorage.getItem(DISMISS_KEY);
    if (dismissedFor === status.weekStart) return;

    // 다른 모달이 떠 있으면 양보
    if (document.querySelector('.modal-overlay,#weeklyInsightsOverlay')) return;

    setTimeout(() => openSurvey(true), 1500);
  } catch (e) { /* 무시 */ }
}

/* Public API */
const pubApi = {
  renderPfIndex,
  openSurvey,
  openNational,
  nextStep,
  prevStep,
  dismissSurvey,
  submitSurvey,
  checkWeeklyPopup,
};
PFM.modules = PFM.modules || {};
PFM.modules.pfIndex = pubApi;
window.PFMPfIndex = pubApi;
})(window.PFM = window.PFM || {});
