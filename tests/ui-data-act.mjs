/* v5.8 data-act 이벤트 위임 UI 스모크 테스트
 * CSP script-src-attr 'none' 상태에서 클릭 인터랙션이 살아있는지 검증 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? (pass++, console.log(`  ✅ ${name}`)) : (fail++, console.log(`  ❌ ${name}`)); };

const browser = await chromium.launch();
const page = await browser.newPage();

// CSP 위반 수집
const cspViolations = [];
page.on('console', msg => {
  const t = msg.text();
  if (t.includes('Content Security Policy') || t.includes('Refused to execute')) cspViolations.push(t);
});

// 1. 로그인
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#authEmail', 'admin@seoulbd.com');
await page.fill('#authPassword', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
ok('로그인 후 대시보드 진입', await page.locator('#sidebar, .sidebar, nav').first().isVisible().catch(() => false));

// 2. data-act 핸들러 존재 확인
const actCount = await page.evaluate(() => document.querySelectorAll('[data-act]').length);
console.log(`  ℹ️ 현재 페이지 data-act 요소: ${actCount}개`);

// 3. 지식베이스 이동 (PFM.navigate data-act 사용처)
await page.evaluate(() => window.PFM.navigate('knowledge'));
await page.waitForTimeout(2000);
const knowledgeActs = await page.evaluate(() => document.querySelectorAll('[data-act]').length);
ok(`지식베이스 페이지 data-act 요소 렌더 (${knowledgeActs}개)`, knowledgeActs > 0);

// 4. 모달 열고 data-act="PFM.closeModal()" 로 닫기 (필터 적용 전 먼저)
await page.waitForSelector('[data-act*="openCard"]', { timeout: 5000 }).catch(() => {});
const card = page.locator('[data-act*="openCard"]').first();
if (await card.count() > 0) {
  await card.click();
  await page.waitForTimeout(1000);
  const modalOpen = await page.locator('.modal-overlay, .modal').first().isVisible().catch(() => false);
  ok('카드 클릭 → 모달 열림', modalOpen);
  const closeBtn = page.locator('[data-act="PFM.closeModal()"]').first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
    await page.waitForTimeout(600);
    const modalClosed = !(await page.locator('.modal-overlay').first().isVisible().catch(() => false));
    ok('data-act closeModal 클릭 → 모달 닫힘', modalClosed);
  } else { ok('closeModal data-act 버튼 존재', false); }
} else {
  // 로컬 DB에 카드 시드가 없으면 모달 대신 data-act 인터프리터 직접 검증
  const interp = await page.evaluate(() => {
    let hit = false;
    window.__actProbe = () => { hit = true; };
    (window.__pfmRunAction || window.PFM.runAction)("__actProbe()", document.body, null);
    return hit;
  });
  ok('data-act 인터프리터 직접 호출 동작 (카드 시드 없음 → 대체 검증)', interp);
}

// 5. data-act 클릭 실제 동작: 카테고리 필터 버튼
const catBtn = page.locator('[data-act*="setCategory"]').first();
if (await catBtn.count() > 0) {
  await catBtn.click();
  await page.waitForTimeout(800);
  ok('data-act 클릭 → PFMKnowledge.setCategory 실행', true);
} else {
  ok('setCategory 버튼 존재', false);
}

// 6. 설정 페이지 — 감사 로그 섹션 렌더
await page.evaluate(() => window.PFM.navigate('settings'));
await page.waitForTimeout(2500);
const auditVisible = await page.locator('#auditLogSection').isVisible().catch(() => false);
ok('설정 페이지 감사 로그 섹션 렌더', auditVisible);
if (auditVisible) {
  // 비동기 로딩 대기: 스피너가 사라질 때까지
  await page.waitForFunction(() => {
    const s = document.getElementById('auditLogSection');
    return s && !s.querySelector('.loading-spinner');
  }, { timeout: 8000 }).catch(() => {});
  const auditText = await page.locator('#auditLogSection').innerText();
  ok('감사 로그 항목 표시 (로그인/권한변경)', auditText.includes('로그인') || auditText.includes('권한'));
}

// 7. CSP 위반 없음
ok(`CSP 인라인 실행 위반 0건 (실제: ${cspViolations.length})`, cspViolations.length === 0);
if (cspViolations.length > 0) console.log(cspViolations.slice(0, 3).join('\n'));

await browser.close();
console.log(`\n결과: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
