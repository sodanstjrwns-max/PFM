/* 사이드바 9그룹 재설계 회귀 테스트
 * 1) 로그인 직후 모든 그룹이 닫혀있는지 (이전 "진료 관리 강제 열림" 버그 재발 방지)
 * 2) 그룹이 정확히 9개, 예상 id 그대로인지
 * 3) staff_supplies가 병원 운영 그룹 nav에 존재하는지 (orphan 페이지 정식 편입 확인)
 * 4) briefing이 nav에서 완전히 사라졌는지 (orphan/중복 페이지 제거 확인)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? (pass++, console.log(`  ✅ ${name}`)) : (fail++, console.log(`  ❌ ${name}`)); };

const EXPECTED_GROUPS = [
  'patient_group', 'calls_group', 'clinical_materials', 'kpi_group',
  'marketing_group', 'hr', 'operations', 'community', 'knowledge_group',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#authEmail', 'admin@seoulbd.com');
await page.fill('#authPassword', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.evaluate(() => {
  document.getElementById('welcomeTourOverlay')?.remove();
  document.getElementById('weeklyInsightsOverlay')?.remove();
});

// 1) 새로고침 상태: 모든 그룹이 닫혀있는지
const initialOpen = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.nav-group-children.open')).map(el => el.dataset.groupChildren)
);
ok(`로그인 직후 모든 그룹 닫힘 (${JSON.stringify(initialOpen)})`, initialOpen.length === 0);

// 2) 그룹 9개 + id 일치
const groups = await page.evaluate(() => Array.from(document.querySelectorAll('[data-group]')).map(el => el.dataset.group));
ok(`사이드바 그룹 개수 9개 (실제: ${groups.length})`, groups.length === 9);
ok(`그룹 id 목록 일치 (${JSON.stringify(groups)})`, JSON.stringify(groups) === JSON.stringify(EXPECTED_GROUPS));

// 3) staff_supplies 그룹 펼쳐서 존재 확인
await page.evaluate(() => document.getElementById('weeklyInsightsOverlay')?.remove());
await page.click('[data-group="operations"]', { force: true });
await page.waitForTimeout(300);
const staffSuppliesExists = await page.locator('[data-page="staff_supplies"]').count();
ok(`staff_supplies nav 항목 존재 (병원 운영 그룹 편입 확인)`, staffSuppliesExists === 1);

// 4) briefing 완전 제거 확인
const briefingExists = await page.locator('[data-page="briefing"]').count();
ok(`briefing nav 항목 제거 확인 (0이어야 정상)`, briefingExists === 0);

console.log(`\n총 ${pass + fail}개 검증, 통과 ${pass}, 실패 ${fail}`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
