/* ═══ Module: Dashboard ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, ICONS_HIRE, navigate, esc, toast } = PFM;

async function renderDashboard(body) {
  body.innerHTML = `
    <div class="dashboard-grid" id="dashStats">
      ${[1,2,3,4].map(() => `<div class="stat-card" style="opacity:0.5"><div class="stat-card-icon teal"><span class="loading-spinner"></span></div><div class="stat-card-body"><div class="stat-card-label">로딩중...</div></div></div>`).join('')}
    </div>
    <div class="section-title">${ICONS.folder}<span>빠른 메뉴</span></div>
    <div class="quick-links">
      <div class="quick-link-card" data-goto="materials">
        <div class="quick-link-icon teal-bg">📖</div>
        <div class="quick-link-text"><h3>설명자료</h3><p>환자 교육 자료 관리</p></div>
      </div>
      <div class="quick-link-card" data-goto="pricing">
        <div class="quick-link-icon blue-bg">💰</div>
        <div class="quick-link-text"><h3>비용 안내</h3><p>시술별 비용 관리</p></div>
      </div>
      <div class="quick-link-card" data-goto="cases">
        <div class="quick-link-icon amber-bg">📸</div>
        <div class="quick-link-text"><h3>케이스 사진</h3><p>Before/After 포트폴리오</p></div>
      </div>
      <div class="quick-link-card" data-goto="settings">
        <div class="quick-link-icon purple-bg">⚙️</div>
        <div class="quick-link-text"><h3>설정</h3><p>병원 정보 및 계정</p></div>
      </div>
      <div class="quick-link-card" data-goto="praise">
        <div class="quick-link-icon" style="background:#fce7f3">💛</div>
        <div class="quick-link-text"><h3>칭찬하기</h3><p>동료에게 감사 전하기</p></div>
      </div>
      <div class="quick-link-card" data-goto="kanban_purchase">
        <div class="quick-link-icon" style="background:#ecfdf5">🛒</div>
        <div class="quick-link-text"><h3>물품 구매</h3><p>필요 물품 요청</p></div>
      </div>
      <div class="quick-link-card" data-goto="checklists">
        <div class="quick-link-icon" style="background:#f0fdf4">✅</div>
        <div class="quick-link-text"><h3>체크리스트</h3><p>일일 점검 체크</p></div>
      </div>
      <div class="quick-link-card" data-goto="scripts">
        <div class="quick-link-icon" style="background:#eff6ff">🎯</div>
        <div class="quick-link-text"><h3>상담 스크립트</h3><p>시술별 상담 가이드</p></div>
      </div>
      <div class="quick-link-card" data-goto="hire_postings">
        <div class="quick-link-icon" style="background:#f0fdf4">💼</div>
        <div class="quick-link-text"><h3>채용 관리</h3><p>PF Hire 채용 모듈</p></div>
      </div>
    </div>`;

  body.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.goto));
  });

  try {
    const stats = await api('/api/protected/dashboard');
    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon teal">${ICONS.materials}</div>
        <div class="stat-card-body"><div class="stat-card-label">설명자료</div><div class="stat-card-value">${stats.materials}</div><div class="stat-card-sub">등록된 자료</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon blue">${ICONS.pricing}</div>
        <div class="stat-card-body"><div class="stat-card-label">비용 항목</div><div class="stat-card-value">${stats.pricing}</div><div class="stat-card-sub">시술 항목</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon amber">${ICONS.cases}</div>
        <div class="stat-card-body"><div class="stat-card-label">케이스</div><div class="stat-card-value">${stats.cases}</div><div class="stat-card-sub">등록된 케이스</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon purple">${ICONS.eye}</div>
        <div class="stat-card-body"><div class="stat-card-label">케이스 사진</div><div class="stat-card-value">${stats.caseImages}</div><div class="stat-card-sub">총 이미지</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#ec4899">${ICONS.heart}</div>
        <div class="stat-card-body"><div class="stat-card-label">커뮤니티</div><div class="stat-card-value">${stats.posts}</div><div class="stat-card-sub">게시글</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706">${ICONS.cart}</div>
        <div class="stat-card-body"><div class="stat-card-label">진행중 요청</div><div class="stat-card-value">${stats.pendingTasks}</div><div class="stat-card-sub">물품/수리</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#059669">${ICONS_HIRE.briefcase}</div>
        <div class="stat-card-body"><div class="stat-card-label">채용 공고</div><div class="stat-card-value">${stats.openJobs}</div><div class="stat-card-sub">진행중</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#ede9fe,#c4b5fd);color:#7c3aed">${ICONS_HIRE.userPlus}</div>
        <div class="stat-card-body"><div class="stat-card-label">지원자</div><div class="stat-card-value">${stats.activeApplicants}</div><div class="stat-card-sub">검토 대기</div></div>
      </div>`;
  } catch(e) { console.error('Dashboard load error:', e); }
}

PFM.modules.dashboard = { renderDashboard };
})(window.PFM);
