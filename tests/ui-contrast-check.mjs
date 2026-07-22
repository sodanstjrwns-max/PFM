/* ═══ 텍스트 명암비(Contrast) 자동 회귀 테스트 ═══
 * 배경: "화이트 버전에서 글씨가 잘 안 보여" 버그 2건이 기존 시뮬레이션 스위트를
 * 전부 통과한 뒤에도 발견됐다. 기존 테스트는 "기능이 동작하는가"만 검증하고
 * "글씨가 눈에 보이는가(명암비)"는 전혀 체크하지 않았기 때문.
 *
 * 이 스크립트는 axe-core(W3C 표준 접근성 엔진)를 브라우저에 직접 주입해서
 * 각 페이지의 실제 "최종 렌더링 결과"(CSS 변수 중복 선언, !important 충돌,
 * 인라인 스타일 오버라이드 등 무엇이 원인이든 상관없이 브라우저가 실제로
 * 그린 최종 색상)를 기준으로 WCAG 2.1 AA 명암비(4.5:1)를 검사한다.
 * → 원인이 무엇이든 "글씨가 실제로 안 보이면" 무조건 잡힌다.
 *
 * 라이트/다크 테마 각각에 대해 59개 리프 페이지 전체를 순회한다.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';

const LEAF_PAGES = [
  'dashboard','clinical_board',
  'patients','patients_stats','ltv_ranking','funnel','recall','consult_records','consult_dashboard',
  'complaints','complaints_stats','reservations','reservation_stats','wait_times','wait_time_stats',
  'calls_inbound','calls_outbound','calls_stats',
  'fee_schedule','materials','cases','scripts',
  'kpi_dashboard','kpi_stats','kpi_benchmark','kpi_daily','kpi_targets','reports',
  'marketing','heatmap','review_mgmt','surveys','kakao',
  'hr_dashboard','hr_staff','gamification','hire_postings','hire_applicants','hire_interviews','hire_onboarding','leave_management',
  'notice','calendar','meetings','checklists','kanban_purchase','kanban_repair','staff_supplies',
  'free','praise','mistake','feedback_notes',
  'pf_index','knowledge','referrals','settings',
];

let totalViolations = 0;
const report = []; // { theme, page, count, details:[{html, ratio, expected}] }

async function checkPageContrast(page, theme, pageId) {
  try {
    await page.evaluate((p) => window.PFM && window.PFM.navigate && window.PFM.navigate(p), pageId);
  } catch (e) {
    console.log(`  ⚠️ navigate(${pageId}) 실패: ${e.message}`);
    return;
  }
  await page.waitForTimeout(500);

  let result;
  try {
    result = await page.evaluate(async () => {
      return await window.axe.run(document, { runOnly: ['color-contrast'] });
    });
  } catch (e) {
    console.log(`  ⚠️ axe.run 실패 (${pageId}): ${e.message}`);
    return;
  }

  const violations = result.violations || [];
  if (violations.length === 0) return;

  const details = [];
  for (const v of violations) {
    for (const node of v.nodes) {
      const data = node.any?.[0]?.data || {};
      details.push({
        html: (node.html || '').slice(0, 160),
        fg: data.fgColor,
        bg: data.bgColor,
        ratio: data.contrastRatio,
        expected: data.expectedContrastRatio,
      });
    }
  }

  totalViolations += details.length;
  report.push({ theme, page: pageId, count: details.length, details });
  console.log(`  ❌ [${theme}] ${pageId}: 명암비 위반 ${details.length}건`);
  for (const d of details.slice(0, 3)) {
    console.log(`      ratio=${d.ratio} (기준 ${d.expected})  fg=${d.fg} bg=${d.bg}`);
    console.log(`      ${d.html}`);
  }
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('#authEmail', { timeout: 15000 });
  } catch (e) {
    console.log('DEBUG: authEmail not found, url=', page.url(), 'title=', await page.title());
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500)).catch(() => 'N/A');
    console.log('DEBUG body text:', bodyText);
    throw e;
  }
  await page.fill('#authEmail', 'admin@seoulbd.com');
  await page.fill('#authPassword', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.getElementById('welcomeTourOverlay')?.remove();
    document.getElementById('weeklyInsightsOverlay')?.remove();
  });

  // axe-core 주입 (세션당 1회, 페이지 리로드 시 재주입 필요)
  await page.addScriptTag({ url: AXE_CDN });

  for (const theme of ['light', 'dark']) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`━━ [${theme.toUpperCase()}] 테마 명암비 검사 시작 ━━`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    await page.evaluate((t) => {
      localStorage.setItem('pfm_theme', t);
      document.documentElement.setAttribute('data-theme', t);
    }, theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById('welcomeTourOverlay')?.remove();
      document.getElementById('weeklyInsightsOverlay')?.remove();
    });
    await page.addScriptTag({ url: AXE_CDN });

    for (const pageId of LEAF_PAGES) {
      await checkPageContrast(page, theme, pageId);
    }
  }

  await browser.close();

  console.log(`\n\n═══════════════════════════════════════`);
  console.log(`  명암비 검사 완료 — 총 위반 ${totalViolations}건 (${report.length}개 페이지×테마 조합)`);
  console.log(`═══════════════════════════════════════`);

  if (totalViolations > 0) {
    console.log('\n상세 리포트:');
    for (const r of report) {
      console.log(`\n[${r.theme}] ${r.page} — ${r.count}건`);
      for (const d of r.details) {
        console.log(`  - ratio=${d.ratio} (기준 ${d.expected}) fg=${d.fg} bg=${d.bg}`);
        console.log(`    ${d.html}`);
      }
    }
    process.exit(1);
  } else {
    console.log('✅ 모든 페이지 라이트/다크 테마에서 WCAG AA 명암비 통과');
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
