/* ═══ Module: Dashboard + 경영 리포트 ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, ICONS_HIRE, navigate, esc, toast, formatPrice, state, showModal, closeModal } = PFM;
const showToast = PFM.showToast || toast;

const FUNNEL_STAGES = [
  { key: 'awareness', label: '인지', icon: '👁️', color: '#94a3b8' },
  { key: 'interest', label: '관심', icon: '💡', color: '#f59e0b' },
  { key: 'appointment', label: '예약', icon: '📅', color: '#3b82f6' },
  { key: 'visit', label: '방문', icon: '🏥', color: '#8b5cf6' },
  { key: 'waiting', label: '대기', icon: '⏳', color: '#06b6d4' },
  { key: 'diagnosis', label: '진단', icon: '🔍', color: '#10b981' },
  { key: 'consultation', label: '상담', icon: '💬', color: '#f97316' },
  { key: 'treatment', label: '진료', icon: '🦷', color: '#ef4444' },
  { key: 'management', label: '관리', icon: '📋', color: '#22c55e' },
  { key: 'referral', label: '소개', icon: '🤝', color: '#ec4899' },
];

/* ──── 숫자 포맷 유틸 ──── */
function fmtNum(n) { return (n||0).toLocaleString('ko-KR'); }
function fmtMoney(n) {
  if (!n) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return n.toLocaleString('ko-KR');
}
function fmtPct(n) { return (n||0).toFixed(1) + '%'; }
function changeArrow(pct) {
  if (pct > 0) return `<span style="color:#22c55e;font-weight:700">▲ ${fmtPct(Math.abs(pct))}</span>`;
  if (pct < 0) return `<span style="color:#ef4444;font-weight:700">▼ ${fmtPct(Math.abs(pct))}</span>`;
  return `<span class="text-muted">— 0%</span>`;
}

async function renderDashboard(body) {
  await PFM.withErrorBoundary(body, async () => {
    const [stats, briefing, surveyToday] = await Promise.all([
      api('/api/protected/dashboard'),
      api('/api/protected/briefing').catch(() => null),
      api('/api/protected/surveys/schedules/today').catch(() => null),
    ]);
    renderDashboardContent(body, stats, briefing, surveyToday);
  }, 'dashboard');
}

/* ═══ 샘플 데이터 주입 - Aha Moment (v3.3 강화) ═══ */
async function injectSampleData(btn) {
  if (!confirm('✨ 3개월치 샘플 데이터를 주입합니다.\n\n• 환자 40명\n• 상담 28건\n• 콜 60건\n• KPI 일간 기록 60일\n• 리뷰 15건\n• 퍼널 10단계 분포\n\n기존 데이터가 거의 없을 때만 실행됩니다.\n진행하시겠습니까?')) return;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-right:6px"></span> 주입 중... (5초 소요)';
  try {
    const result = await api('/api/protected/onboarding/seed-sample', { method: 'POST', json: {} });
    const counts = result.counts || {};
    // 🎉 축하 모달 (Aha Moment Peak)
    showAhaMomentModal(counts);
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
window.injectSampleData = injectSampleData;

function showAhaMomentModal(counts) {
  // 배경 오버레이
  const overlay = document.createElement('div');
  overlay.id = 'ahaMomentOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.75);backdrop-filter:blur(6px);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s ease';

  overlay.innerHTML = `
    <div class="aha-modal" style="background:#fff;border-radius:20px;max-width:540px;width:100%;padding:40px 32px;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,0.4);animation:ahaBounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);position:relative;overflow:hidden">
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(34,197,94,0.08) 0%,rgba(20,184,166,0.08) 50%,rgba(59,130,246,0.08) 100%);pointer-events:none"></div>
      <div style="position:relative">
        <div style="font-size:72px;margin-bottom:8px;animation:ahaSpin 0.8s ease">🎉</div>
        <h2 style="margin:0 0 8px;font-size:26px;font-weight:800;background:linear-gradient(135deg,#0f766e,#0ea5e9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">축하합니다!</h2>
        <p style="font-size:15px;color:#475569;margin:0 0 24px;line-height:1.6">
          3개월치 샘플 데이터가 성공적으로 주입되었습니다.<br>
          이제 <b>진짜 병원경영 데이터</b>가 어떻게 보이는지 확인해보세요.
        </p>
        <div class="aha-counts" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
          <div class="aha-count-item"><span class="n">${counts.patients || 40}</span><span class="l">👥 환자</span></div>
          <div class="aha-count-item"><span class="n">${counts.consultRecords || 28}</span><span class="l">💬 상담</span></div>
          <div class="aha-count-item"><span class="n">${counts.callRecords || 60}</span><span class="l">📞 콜</span></div>
          <div class="aha-count-item"><span class="n">${counts.dailyRecords || 60}</span><span class="l">📊 KPI일</span></div>
          <div class="aha-count-item"><span class="n">${counts.reviews || 15}</span><span class="l">⭐ 리뷰</span></div>
          <div class="aha-count-item"><span class="n">${counts.funnelStages || 40}</span><span class="l">🔄 퍼널</span></div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 16px;margin-bottom:20px;text-align:left;font-size:13px;color:#15803d;line-height:1.5">
          <b>💡 다음 단계 추천:</b><br>
          1. <b>대시보드</b>에서 월 매출 / 신환 / 전환율 확인<br>
          2. <b>환자 퍼널</b>에서 10단계 여정 흐름 보기<br>
          3. <b>KPI 벤치마킹</b>으로 타 병원과 비교하기
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary" id="ahaGoDashboard" style="min-width:160px">🏠 대시보드로 이동</button>
          <button class="btn btn-outline" id="ahaGoFunnel" style="min-width:140px">🔄 퍼널 보기</button>
        </div>
        <button class="btn btn-sm" style="background:transparent;color:#94a3b8;margin-top:12px;font-size:12px" id="ahaClose">나중에 둘러볼게요</button>
      </div>
    </div>
    <style>
      @keyframes ahaBounceIn {
        0% { transform: scale(0.3); opacity: 0 }
        60% { transform: scale(1.05); opacity: 1 }
        100% { transform: scale(1); opacity: 1 }
      }
      @keyframes ahaSpin {
        0% { transform: rotate(-180deg) scale(0) }
        100% { transform: rotate(0) scale(1) }
      }
      .aha-count-item { display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 8px;transition:transform 0.2s }
      .aha-count-item:hover { transform:translateY(-3px);border-color:#14b8a6 }
      .aha-count-item .n { font-size:22px;font-weight:800;color:#0f172a }
      .aha-count-item .l { font-size:11px;color:#64748b;font-weight:600 }
      @media (max-width:500px) {
        .aha-modal { padding:28px 20px !important }
        .aha-counts { grid-template-columns:repeat(2,1fr) !important }
      }
    </style>
  `;
  document.body.appendChild(overlay);

  const goDash = () => { overlay.remove(); navigate('dashboard'); };
  const goFunnel = () => { overlay.remove(); navigate('funnel'); };
  const close = () => { overlay.remove(); navigate('dashboard'); };

  overlay.querySelector('#ahaGoDashboard')?.addEventListener('click', goDash);
  overlay.querySelector('#ahaGoFunnel')?.addEventListener('click', goFunnel);
  overlay.querySelector('#ahaClose')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // 컨페티 효과 (간단한 CSS 입자)
  launchConfetti();

  // 15초 후 자동 이동
  setTimeout(() => {
    if (document.getElementById('ahaMomentOverlay')) goDash();
  }, 15000);
}

function launchConfetti() {
  const colors = ['#14b8a6','#0ea5e9','#f59e0b','#ec4899','#22c55e','#8b5cf6'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100001;overflow:hidden';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const dur = 2 + Math.random() * 2;
    const size = 8 + Math.random() * 6;
    p.style.cssText = `position:absolute;top:-20px;left:${left}%;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};animation:confettiFall ${dur}s ${delay}s linear forwards;transform:rotate(${Math.random()*360}deg)`;
    container.appendChild(p);
  }
  const style = document.createElement('style');
  style.textContent = '@keyframes confettiFall { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }';
  container.appendChild(style);
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 5000);
}
window.showAhaMomentModal = showAhaMomentModal;

function renderDashboardContent(body, s, briefing, surveyToday) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? '좋은 아침이에요' : hour < 18 ? '오후도 화이팅' : '오늘도 수고하셨습니다';
  const todayStr = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  const isManager = ['admin','manager'].includes(state.user.role);
  const posTitle = { doctor:'원장님', director:'실장님', hygienist:'선생님', desk:'선생님', sterilization:'선생님', management:'선생님' };
  const honorific = posTitle[state.user.position] || '님';

  // 직원 전용 카드
  const staffCards = [
    { label: '오늘 환자', value: s.todayPatients, icon: '🦷', color: '#3b82f6', goto: 'clinical_board' },
    { label: '진료중', value: s.inTreatment, icon: '⚡', color: '#f59e0b', goto: 'clinical_board' },
    { label: '완료', value: s.completedToday, icon: '✅', color: '#22c55e', goto: 'clinical_board' },
    { label: '원장 필요', value: s.doctorNeeded, icon: '🚨', color: '#ef4444', goto: 'clinical_board' },
  ];
  if (isManager) {
    staffCards.push(
      { label: '이달 상담', value: s.monthConsultations, icon: '💬', color: '#8b5cf6', goto: 'consultation' },
      { label: '전환율', value: s.conversionRate + '%', icon: '📈', color: '#0ea5e9', goto: 'consultation_stats' },
    );
  }

  // 빠른 메뉴 구성
  const quickLinks = [
    { id: 'clinical_board', icon: '🦷', title: '진료보드', desc: '오늘의 진료 현황', bg: '#f0fdfa' },
  ];
  if (isManager) {
    quickLinks.push(
      { id: 'consultation', icon: '💬', title: '상담관리', desc: '상담 파이프라인', bg: '#fef3c7' },
      { id: 'funnel', icon: '🔄', title: '환자 퍼널', desc: '10단계 여정 관리', bg: '#ede9fe' },
      { id: 'fee_schedule', icon: '💰', title: '수가표', desc: '진료 항목별 비용', bg: '#dbeafe' },
      { id: 'hr_staff', icon: '👥', title: '직원 관리', desc: '출퇴근·스케줄', bg: '#dcfce7' },
    );
  }
  quickLinks.push(
    { id: 'checklists', icon: '✅', title: '체크리스트', desc: '일일 점검 체크', bg: '#f0fdf4' },
    { id: 'notice', icon: '📢', title: '공지사항', desc: '병원 공지 확인', bg: '#fffbeb' },
    { id: 'materials', icon: '📖', title: '설명자료', desc: '환자 교육 자료', bg: '#f0fdfa' },
    { id: 'scripts', icon: '🎯', title: '상담 스크립트', desc: '시술별 상담 가이드', bg: '#eff6ff' },
  );
  if (!isManager) {
    quickLinks.push(
      { id: 'praise', icon: '👏', title: '칭찬하기', desc: '동료 칭찬 보내기', bg: '#fce7f3' },
      { id: 'leave_management', icon: '📅', title: '연차·휴가', desc: '내 휴가 신청·확인', bg: '#e0f2fe' },
    );
  }
  quickLinks.push(
    { id: 'kanban_purchase', icon: '🛒', title: '물품 구매', desc: '필요 물품 요청', bg: '#ecfdf5' },
    { id: 'settings', icon: '⚙️', title: '설정', desc: '내 정보·병원설정', bg: '#f3f4f6' },
  );

  // 샘플 데이터 주입 가능 여부 (데이터 거의 없고 admin일 때)
  const hasData = (s.todayPatients > 0) || (s.monthConsultations > 0) || (briefing?.monthCumulative?.totalRevenue > 0) || (Object.keys(s.funnel || {}).length > 0);
  const showSampleBanner = !hasData && isManager;

  // "오늘의 할 일" 체크리스트 - 샘플 데이터 있고 탐험 안 했을 때 (3일간 표시)
  const exploreDone = JSON.parse(localStorage.getItem('pfm_explore_done') || '{}');
  const exploreDismissedAt = parseInt(localStorage.getItem('pfm_explore_dismissed_at') || '0', 10);
  const daysSinceDismiss = (Date.now() - exploreDismissedAt) / 86400000;
  const exploreDoneCount = Object.values(exploreDone).filter(Boolean).length;
  const showExploreCard = hasData && isManager && exploreDoneCount < 5 && (daysSinceDismiss > 3 || !exploreDismissedAt);
  const exploreTasks = [
    { key: 'funnel',     icon: '🔄', title: '환자 퍼널 확인',       desc: '10단계 여정에서 이탈 포인트 찾기', goto: 'funnel' },
    { key: 'kpi_bench',  icon: '🏆', title: 'KPI 벤치마킹',          desc: '타 병원 평균과 내 병원 비교',       goto: 'kpi_benchmark' },
    { key: 'consult',    icon: '💬', title: '상담 기록 & 전환율',    desc: '상담 후 치료 결정 흐름 보기',        goto: 'consult_dashboard' },
    { key: 'recall',     icon: '📞', title: '리콜 자동화 생성',      desc: '오늘의 리콜 대상 자동 추출',        goto: 'recall' },
    { key: 'reports',    icon: '📄', title: '월간 보고서 내보내기',  desc: 'Excel/PDF로 원장님 보고용 자료',    goto: 'reports' },
  ];

  body.innerHTML = `
    <!-- 🎉 Aha Moment: 샘플 데이터 환영 배너 -->
    ${showSampleBanner ? `
    <section class="sample-banner" aria-label="샘플 데이터 주입">
      <div class="sample-banner-icon">✨</div>
      <div class="sample-banner-content">
        <h3>환영합니다! 제품을 <u>바로 체험</u>해보시겠어요?</h3>
        <p>실제 병원처럼 움직이는 <strong>3개월치 샘플 데이터</strong>를 원클릭으로 주입해서<br>
           모든 기능을 진짜로 돌아가는 환경에서 바로 둘러볼 수 있어요.</p>
        <div class="sample-banner-meta">
          <span>👤 환자 40명</span><span>💬 상담 28건</span><span>📞 콜 60건</span>
          <span>📊 KPI 60일</span><span>⭐ 리뷰 15건</span><span>🔄 퍼널 10단계</span>
        </div>
      </div>
      <div class="sample-banner-actions">
        <button class="btn-sample-inject" onclick="injectSampleData(this)">
          ✨ 샘플 데이터로 체험 시작
        </button>
        <button class="btn-sample-skip" onclick="this.closest('.sample-banner').style.display='none';localStorage.setItem('pfm_skip_sample','1')">
          직접 입력할게요
        </button>
      </div>
    </section>
    ` : ''}

    <!-- 🎯 오늘의 할 일 - 첫 탐험 가이드 -->
    ${showExploreCard ? `
    <section class="explore-card" aria-label="첫 탐험 가이드">
      <div class="explore-card-header">
        <div>
          <h3>🎯 처음이시죠? <span style="color:#0f766e">핵심 기능 5분 투어</span></h3>
          <p>아래 5가지만 둘러보시면 PF Manager 전체 흐름이 잡힙니다</p>
        </div>
        <div class="explore-progress">
          <div class="explore-progress-bar"><div style="width:${(exploreDoneCount/5)*100}%"></div></div>
          <div class="explore-progress-text">${exploreDoneCount}/5 완료</div>
        </div>
      </div>
      <div class="explore-tasks">
        ${exploreTasks.map(t => `
          <button class="explore-task ${exploreDone[t.key] ? 'done' : ''}" data-explore="${t.key}" data-goto="${t.goto}">
            <span class="explore-check">${exploreDone[t.key] ? '✅' : '⬜'}</span>
            <span class="explore-icon">${t.icon}</span>
            <span class="explore-text">
              <span class="explore-title">${t.title}</span>
              <span class="explore-desc">${t.desc}</span>
            </span>
            <span class="explore-arrow">→</span>
          </button>
        `).join('')}
      </div>
      <div style="text-align:center;margin-top:10px">
        <button class="btn btn-sm" style="background:transparent;color:#94a3b8;font-size:11px" id="exploreDismiss">이 가이드 3일간 숨기기</button>
      </div>
    </section>
    ` : ''}

    <!-- 인사 헤더 -->
    <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);border-radius:16px;padding:24px 28px;margin-bottom:24px;color:white;position:relative;overflow:hidden">
      <div style="position:absolute;right:-20px;top:-20px;font-size:120px;opacity:0.1">🏥</div>
      <div style="font-size:13px;opacity:0.85">${todayStr}</div>
      <div style="font-size:22px;font-weight:800;margin:6px 0">${greeting}, ${esc(state.user.name)} ${honorific}!</div>
      <div style="display:flex;gap:20px;margin-top:12px;font-size:13px;opacity:0.9;flex-wrap:wrap">
        <span>👥 출근 ${s.staff?.present||0}/${s.staff?.total||0}명</span>
        <span>🩺 원장 ${s.staff?.doctorsPresent||0}/${s.staff?.doctors||0}명</span>
        <span>💺 체어 ${s.chairs?.busy||0}/${s.chairs?.total||0} 사용중</span>
      </div>
      ${isManager ? `<div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-sm" id="weekReportBtn" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);font-size:11px;padding:6px 14px;border-radius:8px">📊 주간 리포트</button>
        <button class="btn btn-sm" id="monthReportBtn" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);font-size:11px;padding:6px 14px;border-radius:8px">📋 월간 리포트</button>
      </div>` : ''}
    </div>

    ${(surveyToday?.isSendDay && isManager) ? `
    <div id="surveyTodayBanner" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:14px;padding:16px 20px;margin-bottom:20px;border:2px solid #f59e0b;cursor:pointer;transition:transform .15s" onmouseenter="this.style.transform='translateY(-1px)'" onmouseleave="this.style.transform=''">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:32px;flex-shrink:0">🔔</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;font-size:15px;color:#92400e">오늘은 설문 발송일입니다!</div>
          <div style="font-size:12px;color:#a16207;margin-top:2px">${(surveyToday.schedules||[]).map(s => esc(s.survey_title)).join(', ')}</div>
          ${(surveyToday.todayBatches||[]).length ? '<div style="font-size:11px;color:#92400e;margin-top:4px">✅ 오늘 ' + surveyToday.todayBatches.length + '건 배치 처리됨</div>' : ''}
        </div>
        <span style="font-size:12px;color:#92400e;font-weight:700;white-space:nowrap">발송하기 →</span>
      </div>
    </div>` : ''}

    <!-- 일일 브리핑 -->
    ${briefing ? renderBriefingSection(briefing, isManager) : ''}

    <!-- 오늘의 현황 카드 -->
    <div class="section-title">📊 <span>오늘의 현황</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:24px">
      ${staffCards.map(c => `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden" data-goto="${c.goto}" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <div style="position:absolute;right:8px;top:8px;font-size:28px;opacity:0.15">${c.icon}</div>
          <div class="mod-muted-sm-bold">${c.label}</div>
          <div style="font-size:28px;font-weight:900;color:${c.color};margin-top:4px">${c.value}</div>
        </div>
      `).join('')}
    </div>

    ${isManager ? `
    <!-- Patient Funnel 미니 -->
    <div class="section-title">🔄 <span>Patient Funnel</span><span style="font-size:11px;color:var(--text-muted);margin-left:8px;font-weight:400">환자 여정 10단계</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="display:flex;gap:2px;align-items:end;height:80px;margin-bottom:12px" id="funnelChart"></div>
      <div style="display:flex;gap:2px" id="funnelLabels"></div>
      <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light)">
        <button class="btn btn-primary btn-sm" data-goto="funnel" class="text-base">📊 퍼널 상세보기</button>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
          <span>총 <strong style="color:var(--text)">${Object.values(s.funnel||{}).reduce((a,b) => a+b, 0)}</strong>명</span>
        </div>
      </div>
    </div>
    ` : ''}

    ${!isManager ? `
    <div style="background:linear-gradient(135deg,#dbeafe,#ede9fe);border:1px solid #c7d2fe;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:14px">
      <span style="font-size:28px">💪</span>
      <div>
        <div style="font-weight:700;font-size:14px;color:#3730a3">오늘도 환자분들에게 최고의 경험을!</div>
        <div style="font-size:12px;color:#4338ca;margin-top:4px">체크리스트 완료하고, 진료보드에서 오늘 일정을 확인하세요</div>
      </div>
    </div>
    ` : ''}

    <!-- 빠른 메뉴 -->
    <div class="section-title">${ICONS.folder}<span>빠른 메뉴</span></div>
    <div class="quick-links">
      ${quickLinks.map(q => `
        <div class="quick-link-card" data-goto="${q.id}">
          <div class="quick-link-icon" style="background:${q.bg}">${q.icon}</div>
          <div class="quick-link-text"><h3>${h(q.title)}</h3><p>${q.desc}</p></div>
        </div>
      `).join('')}
    </div>`;

  // 퍼널 차트 렌더 (관리자만)
  if (isManager) {
    const funnelData = s.funnel || {};
    const maxVal = Math.max(1, ...FUNNEL_STAGES.map(st => funnelData[st.key]||0));
    const chartEl = document.getElementById('funnelChart');
    const labelsEl = document.getElementById('funnelLabels');
    if (chartEl && labelsEl) {
      chartEl.innerHTML = FUNNEL_STAGES.map(st => {
        const val = funnelData[st.key] || 0;
        const pct = Math.max(8, (val / maxVal) * 100);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end;gap:4px">
          <div style="font-size:10px;font-weight:700;color:${st.color}">${val}</div>
          <div style="width:100%;height:${pct}%;background:${st.color};border-radius:6px 6px 2px 2px;min-height:6px;transition:height .3s"></div>
        </div>`;
      }).join('');
      labelsEl.innerHTML = FUNNEL_STAGES.map(st => `
        <div style="flex:1;text-align:center;font-size:9px;color:var(--text-muted);line-height:1.3">
          <div>${st.icon}</div><div>${st.label}</div>
        </div>
      `).join('');
    }
  }

  // 이벤트
  body.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => {
      // 탐험 태스크면 완료 저장
      if (el.dataset.explore) {
        const done = JSON.parse(localStorage.getItem('pfm_explore_done') || '{}');
        done[el.dataset.explore] = true;
        localStorage.setItem('pfm_explore_done', JSON.stringify(done));
      }
      navigate(el.dataset.goto);
    });
  });

  // 탐험 가이드 숨기기 버튼
  const exploreDismissBtn = document.getElementById('exploreDismiss');
  if (exploreDismissBtn) {
    exploreDismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem('pfm_explore_dismissed_at', Date.now().toString());
      const card = e.target.closest('.explore-card');
      if (card) {
        card.style.transition = 'all 0.4s';
        card.style.opacity = '0';
        card.style.transform = 'translateY(-10px)';
        setTimeout(() => card.remove(), 400);
      }
      if (typeof showToast === 'function') showToast('👍 3일간 숨겨둘게요', 'info');
    });
  }

  // 리포트 버튼 이벤트 (관리자만)
  if (isManager) {
    const weekBtn = document.getElementById('weekReportBtn');
    const monthBtn = document.getElementById('monthReportBtn');
    if (weekBtn) weekBtn.addEventListener('click', (e) => { e.stopPropagation(); openReport('week'); });
    if (monthBtn) monthBtn.addEventListener('click', (e) => { e.stopPropagation(); openReport('month'); });
    // 설문 발송일 배너 클릭
    const surveyBanner = document.getElementById('surveyTodayBanner');
    if (surveyBanner) surveyBanner.addEventListener('click', () => { state._surveyTab = 'batches'; navigate('surveys'); });
  }

  // 온보딩 (데이터 없을 때)
  if (s.materials === 0 && s.pricing === 0 && s.cases === 0 && PFM.canManage()) {
    const guideEl = document.createElement('div');
    guideEl.style.marginTop = '24px';
    guideEl.innerHTML = `
      <div style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border:2px solid #99f6e4;border-radius:16px;padding:28px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:32px">🎉</span>
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f766e">병원 초기 설정을 시작하세요</h3>
            <p style="margin:4px 0 0;font-size:13px;color:#115e59">아래 단계를 따라 시스템을 세팅하세요</p>
          </div>
        </div>
        <div style="display:grid;gap:10px">
          ${[
            { goto: 'hr_staff', icon: '👥', bg: '#dbeafe', title: '1단계: 직원 초대', desc: '초대 링크로 직원 가입시키기', tc: '#1e40af' },
            { goto: 'fee_schedule', icon: '💰', bg: '#fef3c7', title: '2단계: 수가표 등록', desc: '진료 항목별 비용 설정', tc: '#92400e' },
            { goto: 'materials', icon: '📖', bg: '#dcfce7', title: '3단계: 설명자료 업로드', desc: '환자 교육 자료 등록', tc: '#166534' },
            { goto: 'scripts', icon: '🎯', bg: '#fce7f3', title: '4단계: 상담 스크립트', desc: '시술별 상담 가이드 작성', tc: '#9d174d' },
          ].map(s => `
            <div class="onboard-step" data-goto="${s.goto}" style="background:white;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid #e0f2fe;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow=''">
              <div style="width:44px;height:44px;border-radius:12px;background:${s.bg};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${s.icon}</div>
              <div class="flex-1"><div style="font-weight:700;font-size:14px;color:${s.tc}">${h(s.title)}</div><div style="font-size:12px;color:#64748b;margin-top:2px">${s.desc}</div></div>
              <span style="font-size:20px">→</span>
            </div>
          `).join('')}
        </div>
      </div>`;
    body.appendChild(guideEl);
    guideEl.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.goto));
    });
  }
}

/* ════════════════════════════════════════════════
   일일 브리핑 섹션 (대시보드 내장)
   ════════════════════════════════════════════════ */
function renderBriefingSection(d, isManager) {
  const alertColors = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
  const alertIcons = { complaint: '⚠️', leave: '🏖️', birthday: '🎂', kanban: '📋', consult: '📉' };

  // 어제 매출 포맷
  const yRev = d.yesterday?.revenue || 0;
  const yRevFmt = yRev >= 10000 ? (yRev/10000).toFixed(0) + '만' : fmtNum(yRev);

  // 달성률
  const achRate = d.monthCumulative?.achieveRate || 0;
  const achColor = achRate >= 100 ? '#10b981' : achRate >= 70 ? '#0f766e' : '#f59e0b';

  // 상담 전환
  const cRate = d.consult?.confirmRate || 0;
  const cColor = cRate >= 60 ? '#10b981' : cRate >= 40 ? '#f59e0b' : '#ef4444';

  return `
    <div class="mb-24">
      <!-- 알림 배너 -->
      ${d.alerts && d.alerts.length > 0 ? `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-left:4px solid #ef4444;border-radius:12px;padding:14px 18px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">🔔 주요 알림 <span style="font-size:11px;color:var(--text-muted);font-weight:400">${d.alerts.length}건</span></div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${d.alerts.map(a => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${a.priority==='high'?'#fef2f2':a.priority==='medium'?'#fffbeb':'#f0f9ff'};border-radius:8px;font-size:12px">
              <span>${alertIcons[a.type] || '📌'}</span>
              <span style="font-weight:600;color:${alertColors[a.priority]};font-size:10px;min-width:28px">${a.priority==='high'?'긴급':a.priority==='medium'?'주의':'참고'}</span>
              <span class="flex-1">${esc(a.message)}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${isManager ? `
      <!-- 어제 실적 + 월 누적 + 상담 전환 요약 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px">
        <!-- 어제 실적 -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:8px">📊 어제 실적 <span class="mod-muted-xs">${d.yesterday?.date || ''}</span></div>
          ${d.yesterday?.hasData ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
            <div style="text-align:center;padding:8px;background:var(--primary-bg);border-radius:8px">
              <div class="mod-muted-xs">매출</div>
              <div style="font-size:18px;font-weight:800;color:var(--primary)">${yRevFmt}</div>
            </div>
            <div style="text-align:center;padding:8px;background:#eff6ff;border-radius:8px">
              <div class="mod-muted-xs">환자</div>
              <div style="font-size:18px;font-weight:800;color:#2563eb">${(d.yesterday?.newPatients||0)+(d.yesterday?.existingPatients||0)}</div>
              <div style="font-size:9px;color:var(--text-muted)">신${d.yesterday?.newPatients||0}/구${d.yesterday?.existingPatients||0}</div>
            </div>
          </div>
          ${(d.yesterday?.cancels > 0 || d.yesterday?.complaints > 0) ? `
          <div style="display:flex;gap:6px;margin-top:6px">
            ${d.yesterday?.cancels > 0 ? `<span style="font-size:10px;color:#ef4444;background:#fef2f2;padding:2px 8px;border-radius:4px">취소 ${d.yesterday.cancels}</span>` : ''}
            ${d.yesterday?.complaints > 0 ? `<span style="font-size:10px;color:#ef4444;background:#fef2f2;padding:2px 8px;border-radius:4px">컴플레인 ${d.yesterday.complaints}</span>` : ''}
          </div>` : ''}
          ` : `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px">기록 없음</div>`}
        </div>

        <!-- 월 누적 -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:8px">📈 월 누적 <span style="font-size:10px">${d.monthCumulative?.month || ''} (${d.monthCumulative?.days||0}일)</span></div>
          <div style="text-align:center;margin-bottom:8px">
            <div style="font-size:20px;font-weight:800;color:var(--primary)">${fmtMoney(d.monthCumulative?.totalRevenue || 0)}</div>
          </div>
          ${d.monthCumulative?.target > 0 ? `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:3px">
              <span>달성률</span><span style="font-weight:700;color:${achColor}">${achRate}%</span>
            </div>
            <div style="height:6px;background:var(--border-light);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,achRate)}%;background:${achColor};border-radius:3px"></div>
            </div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:3px;text-align:right">목표 ${fmtMoney(d.monthCumulative.target)}</div>
          </div>` : ''}
        </div>

        <!-- 상담 전환 -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:8px">💬 이번 달 상담</div>
          <div class="text-center">
            <div style="font-size:28px;font-weight:900;color:${cColor}">${cRate}%</div>
            <div class="mod-muted-sm">${d.consult?.monthConfirmed||0}건 동의 / ${d.consult?.monthTotal||0}건</div>
            ${d.consult?.monthAgreed > 0 ? `<div style="font-size:11px;color:var(--primary);margin-top:4px">동의액 ${fmtMoney(d.consult.monthAgreed)}</div>` : ''}
          </div>
        </div>
      </div>` : ''}

      <!-- 미해결 컴플레인 (있을 때만) -->
      ${(d.pendingComplaints && d.pendingComplaints.length > 0) ? `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-left:4px solid #ef4444;border-radius:12px;padding:14px 18px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">⚠️ 미해결 컴플레인 ${d.pendingComplaints.length}건</div>
        ${d.pendingComplaints.slice(0,3).map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border-light)">
            <span><strong>${esc(c.patient_name)}</strong> <span class="text-muted">${esc(c.part||'')} · ${esc(c.category||'')}</span></span>
            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${c.severity==='critical'?'#ef4444':c.severity==='high'?'#f59e0b':'#94a3b8'};color:#fff">${c.severity}</span>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- 하단 정보 행: 출근 + 생일 + 신환 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
        <!-- 출근 현황 -->
        <div class="card-sm">
          <div class="mod-muted-sm-bold">👥 출근</div>
          <div style="font-size:24px;font-weight:800;color:${(d.attendance?.rate||0)>=90?'#10b981':(d.attendance?.rate||0)>=70?'#f59e0b':'#ef4444'};margin:4px 0">${d.attendance?.present||0}/${d.attendance?.shouldWork||0}</div>
          <div class="mod-muted-xs">${d.attendance?.rate||0}%</div>
        </div>
        ${(d.birthdayPatients && d.birthdayPatients.length > 0) ? `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:6px">🎂 오늘 생일</div>
          ${d.birthdayPatients.slice(0,3).map(p => `<div style="font-size:12px;padding:2px 0">${esc(p.patient_name)} <span style="color:var(--text-muted);font-size:10px">${esc(p.phone||'')}</span></div>`).join('')}
          ${d.birthdayPatients.length > 3 ? `<div class="mod-muted-xs">+${d.birthdayPatients.length-3}명 더</div>` : ''}
        </div>` : ''}
        ${(d.recentNewPatients && d.recentNewPatients.length > 0) ? `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:6px">🆕 최근 신환</div>
          ${d.recentNewPatients.slice(0,3).map(p => `<div style="font-size:12px;padding:2px 0">${esc(p.patient_name)} <span style="color:var(--text-muted);font-size:10px">${esc(p.visit_source||'')} · ${esc(p.treatment_area||'')}</span></div>`).join('')}
          ${d.recentNewPatients.length > 3 ? `<div class="mod-muted-xs">+${d.recentNewPatients.length-3}명 더</div>` : ''}
        </div>` : ''}
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════
   경영 리포트 모달 (주간/월간)
   ════════════════════════════════════════════════ */
async function openReport(period) {
  const modal = document.getElementById('modalContent');
  const today = new Date().toISOString().slice(0,10);
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${period === 'week' ? '📊 주간 경영 리포트' : '📋 월간 경영 리포트'}</h3>
      <button class="btn-icon" id="modalClose">${ICONS.close}</button>
    </div>
    <div class="modal-body" style="max-height:75vh;overflow-y:auto" id="reportBody">
      <div class="mod-empty"><span class="loading-spinner"></span><div style="margin-top:12px;color:var(--text-muted);font-size:13px">리포트 생성중...</div></div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);

  try {
    const r = await api(`/api/protected/dashboard/report?period=${period}&date=${today}`);
    renderReportContent(document.getElementById('reportBody'), r, period);
  } catch(e) {
    document.getElementById('reportBody').innerHTML = `<div style="color:#ef4444;text-align:center;padding:30px">리포트 로딩 실패: ${esc(e.message)}</div>`;
  }
}

function renderReportContent(el, r, period) {
  const periodLabel = period === 'week' ? '주간' : '월간';
  const rev = r.revenue || {};
  const pat = r.patients || {};
  const con = r.consult || {};
  const call = r.calls || {};
  const comp = r.complaints || {};
  const doctors = r.topDoctors || [];
  const counselors = r.topCounselors || [];

  el.innerHTML = `
    <!-- 기간 표시 -->
    <div style="text-align:center;margin-bottom:20px;padding:12px;background:var(--primary-bg);border-radius:10px">
      <div class="mod-muted-sm">리포트 기간</div>
      <div style="font-size:16px;font-weight:800;color:var(--primary)">${esc(r.label)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:4px">비교: ${esc(r.prevLabel)}</div>
    </div>

    <!-- 매출 -->
    <div class="mb-20">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:6px">💰 매출 현황</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:10px;color:#065f46;font-weight:600">${periodLabel} 매출</div>
          <div style="font-size:22px;font-weight:900;color:#047857;margin:6px 0">${fmtMoney(rev.total)}</div>
          <div>${changeArrow(rev.change)}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:8px">매출 구성</div>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;justify-content:space-between"><span>비급여</span><strong>${fmtMoney(rev.nonInsurance)}</strong></div>
            <div style="display:flex;justify-content:space-between"><span>급여</span><strong>${fmtMoney(rev.insurance)}</strong></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 환자 -->
    <div class="mb-20">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">🦷 환자 현황</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[
          { label: '총 방문', value: fmtNum(pat.totalVisits), sub: `${fmtNum(pat.daysRecorded)}일 기록`, color: '#3b82f6' },
          { label: '신환', value: fmtNum(pat.newFromKPI), sub: `등록 ${fmtNum(pat.registered)}`, color: '#8b5cf6' },
          { label: '구환', value: fmtNum(pat.existing), sub: '', color: '#06b6d4' },
        ].map(c => `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
            <div class="mod-muted-xs-bold">${c.label}</div>
            <div style="font-size:20px;font-weight:900;color:${c.color};margin:4px 0">${c.value}</div>
            ${c.sub ? `<div class="mod-muted-xs">${c.sub}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 상담 -->
    <div class="mb-20">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">💬 상담 성과</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div class="grid-2 mb-12">
          <div>
            <div class="mod-muted-xs-bold">전환율</div>
            <div style="font-size:26px;font-weight:900;color:${con.confirmRate >= 70 ? '#22c55e' : con.confirmRate >= 50 ? '#f59e0b' : '#ef4444'}">${fmtPct(con.confirmRate)}</div>
            <div style="font-size:10px">${changeArrow(con.confirmRate - con.prevConfirmRate)} <span class="text-muted">전기 ${fmtPct(con.prevConfirmRate)}</span></div>
          </div>
          <div>
            <div class="mod-muted-xs-bold">상담 건수</div>
            <div style="font-size:26px;font-weight:900;color:#8b5cf6">${fmtNum(con.total)}</div>
            <div style="font-size:10px">${changeArrow(con.change)} <span class="text-muted">확정 ${fmtNum(con.confirmed)}건</span></div>
          </div>
        </div>
        <div style="display:flex;gap:12px;padding-top:12px;border-top:1px solid var(--border-light);font-size:12px">
          <div class="flex-1"><span class="text-muted">제안액</span> <strong>${fmtMoney(con.planned)}</strong></div>
          <div class="flex-1"><span class="text-muted">동의액</span> <strong>${fmtMoney(con.agreed)}</strong></div>
          <div class="flex-1"><span class="text-muted">할인율</span> <strong>${fmtPct(con.discountRate)}</strong></div>
        </div>
      </div>
    </div>

    <!-- 콜 & 컴플레인 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:800;margin-bottom:8px">📞 콜</div>
        <div style="font-size:11px;display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between"><span>총</span><strong>${fmtNum(call.total)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>인바운드</span><strong>${fmtNum(call.inbound)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>아웃바운드</span><strong>${fmtNum(call.outbound)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>예약 전환율</span><strong style="color:#22c55e">${fmtPct(call.reservationRate)}</strong></div>
        </div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:800;margin-bottom:8px">⚠️ 컴플레인</div>
        <div style="font-size:11px;display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between"><span>총</span><strong>${fmtNum(comp.total)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>해결</span><strong style="color:#22c55e">${fmtNum(comp.resolved)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>심각</span><strong class="text-danger">${fmtNum(comp.severe)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>해결률</span><strong style="color:#22c55e">${fmtPct(comp.resolveRate)}</strong></div>
        </div>
      </div>
    </div>

    <!-- TOP 성과 -->
    ${doctors.length || counselors.length ? `
    <div class="mb-20">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">🏆 성과 TOP</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${doctors.length ? `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">👨‍⚕️ 원장 TOP</div>
          ${doctors.map((d,i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:4px 0;${i>0?'border-top:1px solid var(--border-light)':''}">
              <span>${i===0?'🥇':i===1?'🥈':'🥉'} ${esc(d.name)}</span>
              <span><strong>${fmtPct(d.rate)}</strong> (${fmtNum(d.total)}건)</span>
            </div>
          `).join('')}
        </div>` : ''}
        ${counselors.length ? `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">💁 상담사 TOP</div>
          ${counselors.map((d,i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:4px 0;${i>0?'border-top:1px solid var(--border-light)':''}">
              <span>${i===0?'🥇':i===1?'🥈':'🥉'} ${esc(d.name)}</span>
              <span><strong>${fmtPct(d.rate)}</strong> (${fmtNum(d.total)}건)</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>
    </div>` : ''}

    <!-- 직원수 & 생성일 -->
    <div style="text-align:center;font-size:10px;color:var(--text-muted);padding-top:12px;border-top:1px solid var(--border-light)">
      직원 ${fmtNum(r.staffTotal)}명 · 리포트 생성: ${new Date(r.generatedAt).toLocaleString('ko-KR')}
    </div>`;
}

PFM.modules.dashboard = { renderDashboard, openReport };
})(window.PFM);
