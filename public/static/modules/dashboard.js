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

    // 온보딩 가이드: 데이터가 거의 없는 신규 병원일 때 표시
    if (stats.materials === 0 && stats.pricing === 0 && stats.cases === 0 && PFM.canManage()) {
      const guideEl = document.createElement('div');
      guideEl.style.cssText = 'margin-top:24px';
      guideEl.innerHTML = `
        <div style="background:linear-gradient(135deg,#f0fdfa,#ccfbf1);border:2px solid #99f6e4;border-radius:16px;padding:28px;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <span style="font-size:32px">🎉</span>
            <div>
              <h3 style="margin:0;font-size:18px;font-weight:800;color:#0f766e">환영합니다! 병원 초기 설정을 시작하세요</h3>
              <p style="margin:4px 0 0;font-size:13px;color:#115e59">아래 단계를 따라 병원 시스템을 세팅하세요</p>
            </div>
          </div>
          <div style="display:grid;gap:10px">
            <div class="onboard-step" data-goto="hr_staff" style="background:white;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid #e0f2fe;transition:box-shadow 0.15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
              <div style="width:44px;height:44px;border-radius:12px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">👥</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px;color:#1e40af">1단계: 직원 초대하기</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px">초대 코드를 생성해서 직원들을 가입시키세요</div>
              </div>
              <span style="font-size:20px">→</span>
            </div>
            <div class="onboard-step" data-goto="pricing" style="background:white;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid #e0f2fe;transition:box-shadow 0.15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
              <div style="width:44px;height:44px;border-radius:12px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">💰</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px;color:#92400e">2단계: 비용 안내 등록</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px">시술별 비용을 등록하면 상담 시 바로 활용할 수 있어요</div>
              </div>
              <span style="font-size:20px">→</span>
            </div>
            <div class="onboard-step" data-goto="materials" style="background:white;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid #e0f2fe;transition:box-shadow 0.15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
              <div style="width:44px;height:44px;border-radius:12px;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📖</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px;color:#166534">3단계: 설명자료 업로드</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px">환자 교육 자료를 등록해서 상담 품질을 높이세요</div>
              </div>
              <span style="font-size:20px">→</span>
            </div>
            <div class="onboard-step" data-goto="scripts" style="background:white;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid #e0f2fe;transition:box-shadow 0.15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
              <div style="width:44px;height:44px;border-radius:12px;background:#fce7f3;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎯</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px;color:#9d174d">4단계: 상담 스크립트 작성</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px">시술별 상담 대본을 만들어 전환율을 높이세요</div>
              </div>
              <span style="font-size:20px">→</span>
            </div>
          </div>
        </div>`;
      body.appendChild(guideEl);
      guideEl.querySelectorAll('.onboard-step').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.goto));
      });
    }
  } catch(e) { console.error('Dashboard load error:', e); }
}

PFM.modules.dashboard = { renderDashboard };
})(window.PFM);
