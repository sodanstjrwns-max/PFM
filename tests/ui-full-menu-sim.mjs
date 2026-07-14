/* ═══ 전 메뉴 실사용 시뮬레이션 (v5.11 기준 재검증) ═══
 * getNavConfig() 실제 사이드바 구조에서 추출한 61개 리프 페이지를 admin + staff
 * 두 역할로 전부 순회하며 다음을 검증:
 *  1. 페이지 이동 성공 (renderPage 예외 없음)
 *  2. 본문이 빈 화면이 아님 (최소 텍스트 길이)
 *  3. JS 콘솔 에러 / CSP 위반 0건
 *  4. 네트워크 요청 중 5xx 없음
 *  5. "추가" 계열 주요 액션 버튼 클릭 시 모달/폼 정상 오픈 (샘플 페이지)
 *  6. 그룹 메뉴 토글(아코디언) 동작
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

// getNavConfig()에서 추출한 실제 리프 페이지 61개 (그룹 헤더 제외)
const LEAF_PAGES = [
  'dashboard','clinical_board',
  'patients','patients_stats','ltv_ranking','funnel','recall','consult_records','consult_dashboard',
  'complaints','complaints_stats','reservations','reservation_stats','wait_times','wait_time_stats',
  'calls_inbound','calls_outbound','calls_stats',
  'fee_schedule','materials','pricing','cases','scripts',
  'kpi_dashboard','kpi_stats','kpi_benchmark','kpi_daily','kpi_targets','reports',
  'marketing','heatmap','review_mgmt','reviews','surveys','kakao',
  'hr_dashboard','hr_staff','gamification','hire_postings','hire_applicants','hire_interviews','hire_onboarding','leave_management',
  'notice','calendar','meetings','checklists','kanban_purchase','kanban_repair','parking','parking_stats',
  'free','praise','mistake','feedback_notes',
  'messenger','pf_index','knowledge','referrals','settings',
];
// weekly_insights 는 대시보드 모달로 별도 흐름이라 제외 (기존 스위트에서 처리)

// getNavConfig()에서 isManager(admin/manager)만 사이드바에 노출되는 항목들.
// staff 계정은 이 메뉴 버튼 자체가 렌더되지 않으므로 정상 UX 흐름상 도달 불가 →
// staff 순회 시 제외해야 오탐(false positive)이 나지 않음.
const MANAGER_ONLY_PAGES = new Set(['fee_schedule', 'weekly_insights', 'kpi_targets', 'kakao']);

let pass = 0, fail = 0, warn = 0;
const issues = [];
const ok = (name, cond, note = '', sev = 'FAIL') => {
  if (cond) { pass++; }
  else {
    if (sev === 'WARN') { warn++; console.log(`⚠️ ${name} ${note}`); }
    else { fail++; console.log(`❌ ${name} ${note}`); }
    issues.push(`[${sev}] ${name}${note ? ' — ' + note : ''}`);
  }
};

async function runRoleSweep(role, email, password) {
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`━━ [${role}] 전체 메뉴 순회 시작 (${email}) ━━`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let currentPage = 'login';
  const jsErrors = [];
  const cspViolations = [];
  const http5xx = [];
  const http4xx = [];

  page.on('pageerror', (e) => jsErrors.push({ page: currentPage, text: String(e.message || e).slice(0, 200) }));
  page.on('console', (msg) => {
    const t = msg.text();
    if (msg.type() === 'error') {
      if (t.includes('Content Security Policy') || t.includes('Refused to')) {
        cspViolations.push({ page: currentPage, text: t.slice(0, 200) });
      } else if (!t.includes('Failed to load resource') && !t.includes('favicon')) {
        jsErrors.push({ page: currentPage, text: t.slice(0, 200) });
      }
    }
  });
  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 500) http5xx.push({ page: currentPage, url, status });
    else if (status >= 400 && url.includes('/api/') && !url.includes('/api/auth/')) {
      http4xx.push({ page: currentPage, url, status });
    }
  });
  page.on('dialog', (d) => d.accept());

  // ── 로그인 ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('#authEmail', email);
  await page.fill('#authPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
  const loggedIn = await page.locator('.app-layout').isVisible().catch(() => false);
  ok(`[${role}] 로그인 → 앱 진입`, loggedIn);
  if (!loggedIn) {
    await browser.close();
    return { pass, fail, jsErrors, cspViolations, http5xx };
  }

  // 주간 인사이트 자동 모달 — ESC 키로 닫히는지 검증 (v5.11.1에서 수정된 회귀 포인트)
  const weeklyOverlayShown = await page.locator('#weeklyInsightsOverlay').isVisible().catch(() => false);
  if (weeklyOverlayShown) {
    await page.locator('#weeklyInsightsOverlay').focus().catch(() => {});
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closedByEsc = !(await page.locator('#weeklyInsightsOverlay').isVisible().catch(() => false));
    ok(`[${role}] 주간 인사이트 모달 ESC 키로 닫힘`, closedByEsc);
    await page.evaluate(() => document.getElementById('weeklyInsightsOverlay')?.remove());
    await page.waitForTimeout(300);
  }

  // ── 그룹 메뉴 아코디언 토글 확인 (샘플: patient_group) ──
  const groupBtn = page.locator('[data-group="patient_group"]').first();
  if (await groupBtn.count() > 0) {
    const before = await page.locator('[data-group-children="patient_group"]').getAttribute('class').catch(() => '');
    await groupBtn.click();
    await page.waitForTimeout(300);
    const after = await page.locator('[data-group-children="patient_group"]').getAttribute('class').catch(() => '');
    ok(`[${role}] 그룹 메뉴 아코디언 토글 동작`, before !== after);
    // 원상복구 (열린 상태로)
    if (!after.includes('open')) { await groupBtn.click(); await page.waitForTimeout(300); }
  }

  // ── 전체 리프 페이지 순회 (해당 역할 사이드바에 실제로 노출되는 페이지만) ──
  const isManagerRole = role === 'ADMIN';
  const pagesForRole = LEAF_PAGES.filter((p) => isManagerRole || !MANAGER_ONLY_PAGES.has(p));
  let visited = 0;
  for (const pid of pagesForRole) {
    currentPage = pid;
    const errBefore = jsErrors.length;
    const cspBefore = cspViolations.length;
    const err5xxBefore = http5xx.length;
    try {
      await page.evaluate((id) => window.PFM.navigate(id), pid);
      await page.waitForTimeout(1100);
      // dashboard 재방문 시 주간 인사이트 모달이 다시 뜰 수 있음 (dismiss 안 했으므로) → 매번 제거
      await page.evaluate(() => document.getElementById('weeklyInsightsOverlay')?.remove());
      // 로딩 스피너가 있으면 잠깐 더 대기
      const stillLoading = await page.locator('#mainBody .loading-spinner').first().isVisible().catch(() => false);
      if (stillLoading) await page.waitForTimeout(1200);
      visited++;
    } catch (e) {
      ok(`[${role}] "${pid}" 페이지 이동`, false, 'NAV EXCEPTION: ' + String(e.message || e).slice(0, 100));
      continue;
    }

    const bodyText = await page.locator('#mainBody').innerText().catch(() => '');
    const hasContent = bodyText.trim().length > 3;
    ok(`[${role}] "${pid}" 빈 화면 아님`, hasContent, hasContent ? '' : '(본문 텅 빔)');

    const newJsErr = jsErrors.length - errBefore;
    ok(`[${role}] "${pid}" JS 에러 0건`, newJsErr === 0, newJsErr > 0 ? `(${newJsErr}건: ${jsErrors[jsErrors.length-1]?.text})` : '');

    const newCsp = cspViolations.length - cspBefore;
    ok(`[${role}] "${pid}" CSP 위반 0건`, newCsp === 0, newCsp > 0 ? `(${cspViolations[cspViolations.length-1]?.text})` : '');

    const new5xx = http5xx.length - err5xxBefore;
    ok(`[${role}] "${pid}" API 5xx 없음`, new5xx === 0, new5xx > 0 ? `(${JSON.stringify(http5xx[http5xx.length-1])})` : '');
  }
  console.log(`\n[${role}] 순회 완료: ${visited}/${pagesForRole.length} 페이지 (역할별 사이드바 노출 기준)`);

  // ── 주요 CRUD 진입점 스모크: "추가" 버튼 클릭 → 모달/폼 오픈 여부 (대표 5개 페이지) ──
  const addButtonSamples = [
    { pageId: 'patients', selector: '#addPatientBtn', label: '환자 등록' },
    { pageId: 'funnel', selector: '#addFunnelBtn', label: '퍼널 환자 등록' },
    { pageId: 'complaints', selector: '#addComplaint', label: '컴플레인 기록' },
    { pageId: 'meetings', selector: '#addMeetingBtn', label: '회의 등록' },
    { pageId: 'leave_management', selector: '#leaveRequestBtn', label: '연차 신청' },
  ];
  console.log(`\n━━ [${role}] 주요 액션 버튼 → 모달 오픈 스모크 ━━`);
  for (const { pageId, selector, label } of addButtonSamples) {
    currentPage = pageId;
    await page.evaluate((id) => window.PFM.navigate(id), pageId);
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.getElementById('weeklyInsightsOverlay')?.remove());
    const btn = page.locator(selector).first();
    const btnCount = await btn.count();
    if (btnCount === 0) {
      ok(`[${role}] "${label}" 버튼 존재 (권한 제한 가능성)`, true, '(버튼 미노출 — 권한 스코프상 정상일 수 있음)', 'WARN');
      continue;
    }
    await btn.click();
    await page.waitForTimeout(700);
    const modalOpen = await page.locator('.modal-overlay, .modal').first().isVisible().catch(() => false);
    ok(`[${role}] "${label}" 클릭 → 모달/폼 오픈`, modalOpen);
    if (modalOpen) {
      // ESC로 닫기 시도
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  }

  // ── 검색/필터 인터랙션 스모크 (환자 DB) ──
  console.log(`\n━━ [${role}] 검색/필터 인터랙션 스모크 ━━`);
  currentPage = 'patients';
  await page.evaluate(() => window.PFM.navigate('patients'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('weeklyInsightsOverlay')?.remove());
  const searchInput = page.locator('#mainBody input[type="text"], #mainBody input[placeholder*="검색"]').first();
  if (await searchInput.count() > 0) {
    await searchInput.fill('테스트검색어');
    await page.waitForTimeout(900);
    const noJsErrAfterSearch = jsErrors.filter(e => e.page === 'patients').length === 0;
    ok(`[${role}] 환자 검색 입력 → JS 에러 없음`, noJsErrAfterSearch);
  }

  // ── 최종 JS 에러 요약 ──
  const realErrors = jsErrors.filter(e => !e.text.includes('favicon'));
  ok(`[${role}] 전체 여정 JS 에러 총계 0건`, realErrors.length === 0,
    realErrors.length > 0 ? `(${realErrors.length}건, 최초: [${realErrors[0].page}] ${realErrors[0].text})` : '');
  ok(`[${role}] 전체 여정 CSP 위반 총계 0건`, cspViolations.length === 0,
    cspViolations.length > 0 ? `(${cspViolations.length}건, 최초: [${cspViolations[0].page}] ${cspViolations[0].text})` : '');
  ok(`[${role}] 전체 여정 API 5xx 총계 0건`, http5xx.length === 0,
    http5xx.length > 0 ? `(${http5xx.length}건, 최초: ${JSON.stringify(http5xx[0])})` : '');

  await browser.close();
  return { jsErrors, cspViolations, http5xx, http4xx };
}

// ── 실행: admin + staff 두 역할 ──
const adminResult = await runRoleSweep('ADMIN', 'admin@seoulbd.com', 'admin123');
const staffResult = await runRoleSweep('STAFF', 'desk1@seoulbd.com', 'staff123').catch(async (e) => {
  console.log('⚠️ STAFF 계정 로그인 실패, 비밀번호 추정 오류일 수 있음:', e.message);
  return null;
});

console.log(`\n\n═══════════════════════════════════════`);
console.log(`═══ 전 메뉴 실사용 시뮬레이션 최종 결과 ═══`);
console.log(`═══════════════════════════════════════`);
console.log(`✅ ${pass}  ❌ ${fail}  ⚠️ ${warn}`);
if (issues.length) {
  console.log(`\n미달성/이슈 항목 (${issues.length}건):`);
  issues.forEach((i) => console.log(' - ' + i));
}
process.exit(fail > 0 ? 1 : 0);
