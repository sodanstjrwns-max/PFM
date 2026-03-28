/* ═══ Module: Dashboard + 경영 리포트 ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, ICONS_HIRE, navigate, esc, toast, formatPrice, state, showModal, closeModal } = PFM;

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
  return `<span style="color:var(--text-muted)">— 0%</span>`;
}

async function renderDashboard(body) {
  body.innerHTML = `
    <div id="dashLoading" style="text-align:center;padding:40px"><span class="loading-spinner"></span><div style="margin-top:12px;color:var(--text-muted);font-size:13px">대시보드 로딩중...</div></div>`;

  try {
    const stats = await api('/api/protected/dashboard');
    renderDashboardContent(body, stats);
  } catch(e) {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:40px">대시보드 로딩 실패: ${esc(e.message)}</div>`;
  }
}

function renderDashboardContent(body, s) {
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

  body.innerHTML = `
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

    <!-- 오늘의 현황 카드 -->
    <div class="section-title">📊 <span>오늘의 현황</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:24px">
      ${staffCards.map(c => `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden" data-goto="${c.goto}" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <div style="position:absolute;right:8px;top:8px;font-size:28px;opacity:0.15">${c.icon}</div>
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">${c.label}</div>
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
        <button class="btn btn-primary btn-sm" data-goto="funnel" style="font-size:12px">📊 퍼널 상세보기</button>
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
    el.addEventListener('click', () => navigate(el.dataset.goto));
  });

  // 리포트 버튼 이벤트 (관리자만)
  if (isManager) {
    const weekBtn = document.getElementById('weekReportBtn');
    const monthBtn = document.getElementById('monthReportBtn');
    if (weekBtn) weekBtn.addEventListener('click', (e) => { e.stopPropagation(); openReport('week'); });
    if (monthBtn) monthBtn.addEventListener('click', (e) => { e.stopPropagation(); openReport('month'); });
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
              <div style="flex:1"><div style="font-weight:700;font-size:14px;color:${s.tc}">${h(s.title)}</div><div style="font-size:12px;color:#64748b;margin-top:2px">${s.desc}</div></div>
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
      <div style="text-align:center;padding:40px"><span class="loading-spinner"></span><div style="margin-top:12px;color:var(--text-muted);font-size:13px">리포트 생성중...</div></div>
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
      <div style="font-size:11px;color:var(--text-muted)">리포트 기간</div>
      <div style="font-size:16px;font-weight:800;color:var(--primary)">${esc(r.label)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:4px">비교: ${esc(r.prevLabel)}</div>
    </div>

    <!-- 매출 -->
    <div style="margin-bottom:20px">
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
    <div style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">🦷 환자 현황</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${[
          { label: '총 방문', value: fmtNum(pat.totalVisits), sub: `${fmtNum(pat.daysRecorded)}일 기록`, color: '#3b82f6' },
          { label: '신환', value: fmtNum(pat.newFromKPI), sub: `등록 ${fmtNum(pat.registered)}`, color: '#8b5cf6' },
          { label: '구환', value: fmtNum(pat.existing), sub: '', color: '#06b6d4' },
        ].map(c => `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:10px;color:var(--text-muted);font-weight:600">${c.label}</div>
            <div style="font-size:20px;font-weight:900;color:${c.color};margin:4px 0">${c.value}</div>
            ${c.sub ? `<div style="font-size:10px;color:var(--text-muted)">${c.sub}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 상담 -->
    <div style="margin-bottom:20px">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">💬 상담 성과</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:600">전환율</div>
            <div style="font-size:26px;font-weight:900;color:${con.confirmRate >= 70 ? '#22c55e' : con.confirmRate >= 50 ? '#f59e0b' : '#ef4444'}">${fmtPct(con.confirmRate)}</div>
            <div style="font-size:10px">${changeArrow(con.confirmRate - con.prevConfirmRate)} <span style="color:var(--text-muted)">전기 ${fmtPct(con.prevConfirmRate)}</span></div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-weight:600">상담 건수</div>
            <div style="font-size:26px;font-weight:900;color:#8b5cf6">${fmtNum(con.total)}</div>
            <div style="font-size:10px">${changeArrow(con.change)} <span style="color:var(--text-muted)">확정 ${fmtNum(con.confirmed)}건</span></div>
          </div>
        </div>
        <div style="display:flex;gap:12px;padding-top:12px;border-top:1px solid var(--border-light);font-size:12px">
          <div style="flex:1"><span style="color:var(--text-muted)">제안액</span> <strong>${fmtMoney(con.planned)}</strong></div>
          <div style="flex:1"><span style="color:var(--text-muted)">동의액</span> <strong>${fmtMoney(con.agreed)}</strong></div>
          <div style="flex:1"><span style="color:var(--text-muted)">할인율</span> <strong>${fmtPct(con.discountRate)}</strong></div>
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
          <div style="display:flex;justify-content:space-between"><span>심각</span><strong style="color:#ef4444">${fmtNum(comp.severe)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>해결률</span><strong style="color:#22c55e">${fmtPct(comp.resolveRate)}</strong></div>
        </div>
      </div>
    </div>

    <!-- TOP 성과 -->
    ${doctors.length || counselors.length ? `
    <div style="margin-bottom:20px">
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
