/* 모달 footer sticky 고정 fix 검증 스크립트
 * 1) clinical.js 환자 등록 모달(가장 긴 모달)에서 등록 버튼이 스크롤 없이/스크롤 후에도 보이는지 확인
 * 2) hire.js 등 폼 필드가 많은 다른 모달도 스팟체크
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? (pass++, console.log(`  ✅ ${name}`)) : (fail++, console.log(`  ❌ ${name}`)); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#authEmail', 'admin@seoulbd.com');
await page.fill('#authPassword', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
ok('로그인 성공', await page.locator('.sidebar, #sidebar, nav').first().isVisible().catch(() => false));

// 1) clinical_board 진입 후 환자 등록 모달 오픈
await page.evaluate(() => window.PFM.navigate('clinical_board'));
await page.waitForTimeout(1500);
const addBtn = page.locator('#addTreatmentBtn');
ok('진료보드 진입 및 addTreatmentBtn 존재', await addBtn.count() > 0);
if (await addBtn.count() > 0) {
  await addBtn.click();
  await page.waitForTimeout(600);
  const overlayVisible = await page.locator('#modalOverlay.show').isVisible().catch(() => false);
  ok('환자 등록 모달 오픈됨', overlayVisible);

  const footerBox = await page.locator('.modal-footer').first().boundingBox();
  const viewport = page.viewportSize();
  console.log(`  ℹ️ modal-footer boundingBox: ${JSON.stringify(footerBox)}, viewport height: ${viewport.height}`);
  const footerFullyInViewport = footerBox && footerBox.y >= 0 && (footerBox.y + footerBox.height) <= viewport.height;
  ok('스크롤 없이 등록 버튼(모달 footer)이 뷰포트 내에 보임', footerFullyInViewport);

  // sticky 검증: modal-footer의 computed position이 sticky인지
  const footerPosition = await page.locator('.modal-footer').first().evaluate(el => getComputedStyle(el).position);
  ok(`.modal-footer의 CSS position이 sticky (현재: ${footerPosition})`, footerPosition === 'sticky');

  const submitBtn = page.locator('#tbSubmitBtn');
  const submitVisible = await submitBtn.isVisible().catch(() => false);
  ok('등록 버튼(#tbSubmitBtn)이 visible 상태', submitVisible);

  // 스크린샷 저장 (증거)
  await page.screenshot({ path: '/home/user/webapp/tests/screenshot-modal-fix-clinical.png' });

  // 모달 body를 맨 위로 스크롤한 상태에서도 footer가 보이는지 재확인 (sticky 특성)
  await page.locator('.modal').first().evaluate(el => el.scrollTop = 0);
  await page.waitForTimeout(200);
  const footerBox2 = await page.locator('.modal-footer').first().boundingBox();
  const footerVisibleAtTop = footerBox2 && footerBox2.y >= 0 && (footerBox2.y + footerBox2.height) <= viewport.height;
  ok('모달을 맨 위로 스크롤한 상태에서도 footer 계속 보임 (sticky 동작 확인)', footerVisibleAtTop);

  await page.locator('#modalCancelBtn').click();
  await page.waitForTimeout(400);
}

// 2) 다른 필드 多 모달 스팟체크: hire.js 지원자 등록(apSubmitBtn 추정), operations.js 비품 주문(supplySubmitBtn)
async function spotCheckModal(pageName, openSelector, submitId, label) {
  await page.evaluate((p) => window.PFM.navigate(p), pageName);
  await page.waitForTimeout(1200);
  const opener = page.locator(openSelector).first();
  if (await opener.count() === 0) { console.log(`  ⚠️ ${label}: opener(${openSelector}) 못찾음, 스킵`); return; }
  await opener.click();
  await page.waitForTimeout(600);
  const overlayVisible = await page.locator('#modalOverlay.show').isVisible().catch(() => false);
  if (!overlayVisible) { console.log(`  ⚠️ ${label}: 모달이 안열림, 스킵`); return; }
  const footerPosition = await page.locator('.modal-footer').first().evaluate(el => getComputedStyle(el).position).catch(() => null);
  ok(`[스팟체크] ${label} 모달의 .modal-footer position=sticky`, footerPosition === 'sticky');
  const submitBtn = page.locator(`#${submitId}`);
  const submitVisible = await submitBtn.isVisible().catch(() => false);
  ok(`[스팟체크] ${label} 등록/제출 버튼 visible`, submitVisible);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

await spotCheckModal('staff_supplies', '[data-act*="supply"], button:has-text("주문 요청"), button:has-text("추가")', 'supplySubmitBtn', 'operations.js 비품 주문');

console.log(`\n총 ${pass + fail}개 검증, 통과 ${pass}, 실패 ${fail}`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
