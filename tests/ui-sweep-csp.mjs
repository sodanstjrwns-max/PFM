/* v5.8 전 메뉴 순회 CSP/JS 에러 스모크 — data-act 전환 후 회귀 없는지 확인 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const PAGES = [
  'dashboard','patients','patients_stats','funnel','consult_records','consult_dashboard',
  'calls_inbound','calls_outbound','kpi_daily','kpi_dashboard','kpi_targets',
  'leave_management','meetings','feedback_notes','knowledge','pf_index','referrals','reservations',
  'wait_times','parking','complaints','surveys','gamification','staff_supplies',
  'recall','reports','settings','hr_dashboard','hr_staff',
  'hire_postings','hire_applicants','hire_interviews','hire_onboarding',
  'free','praise','mistake','clinical_board','help'
];

const browser = await chromium.launch();
const page = await browser.newPage();
const issues = [];
page.on('console', msg => {
  const t = msg.text();
  if (msg.type() === 'error' || t.includes('Content Security Policy') || t.includes('Refused to')) {
    // 리소스 404 등 네트워크 에러는 노이즈 → JS/CSP만
    if (!t.includes('Failed to load resource')) issues.push({ page: current, text: t.slice(0, 150) });
  }
});
page.on('pageerror', err => issues.push({ page: current, text: 'PAGEERROR: ' + err.message.slice(0, 150) }));

let current = 'login';
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#authEmail', 'admin@seoulbd.com');
await page.fill('#authPassword', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

let visited = 0;
for (const p of PAGES) {
  current = p;
  try {
    await page.evaluate((name) => window.PFM.navigate(name), p);
    await page.waitForTimeout(1200);
    visited++;
  } catch (e) {
    issues.push({ page: p, text: 'NAV FAIL: ' + e.message.slice(0, 100) });
  }
}

await browser.close();
console.log(`순회: ${visited}/${PAGES.length} 페이지`);
if (issues.length === 0) {
  console.log('✅ CSP 위반 / JS 에러 0건');
  process.exit(0);
} else {
  console.log(`❌ 이슈 ${issues.length}건:`);
  issues.slice(0, 15).forEach(i => console.log(`  [${i.page}] ${i.text}`));
  process.exit(1);
}
