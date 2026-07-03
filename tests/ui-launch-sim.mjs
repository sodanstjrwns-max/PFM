/* 런칭 전 실사용 시뮬레이션 — 신규 병원 전체 여정
 * A. /pricing → CTA 클릭 → 가입 화면 도달 여부
 * B. 신규 가입 → 온보딩 화면 → 완료/스킵 → 앱 진입
 * C. 빈 DB 상태로 전 메뉴 순회 (콘솔에러/CSP/빈화면 수집)
 * D. 초대코드 발급 → 직원 합류 → 직원 화면 진입
 * E. 모바일 뷰포트 /pricing + 로그인 화면
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0, warn = 0;
const issues = [];
const ok = (name, cond, sev = 'FAIL') => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { sev === 'WARN' ? warn++ : fail++; console.log(`${sev === 'WARN' ? '⚠️' : '❌'} ${name}`); issues.push(`[${sev}] ${name}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 150)));
page.on('dialog', d => d.accept()); // confirm() 자동 수락 (온보딩 건너뛰기 등)

/* ── A. 랜딩 → 가입 CTA ── */
console.log('\n━━ A. /pricing → 가입 CTA ━━');
await page.goto(BASE + '/pricing', { waitUntil: 'networkidle' });
await page.click('#plan-growth .cta');
await page.waitForTimeout(2000);
// /?mode=register 로 이동했을 때 register 탭이 자동 선택되는가?
const regFieldVisible = await page.locator('#regHospitalField').isVisible().catch(() => false);
ok('CTA 클릭 → 병원등록 탭 자동 선택', regFieldVisible);

/* ── B. 신규 가입 → 온보딩 ── */
console.log('\n━━ B. 신규 가입 → 온보딩 ━━');
const ts = Date.now();
const email = `launch${ts}@sim.com`;
// 병원 등록 탭 강제 선택
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('button.auth-tab[data-tab="register"]');
await page.waitForTimeout(400);
await page.fill('#authEmail', email);
await page.fill('#authPassword', 'sim12345');
const nameField = page.locator('#authName, #regName').first();
await nameField.fill('시뮬원장');
await page.fill('#regHospital, #regHospitalName', '런칭시뮬치과' + ts).catch(async () => {
  await page.locator('#regHospitalField input').fill('런칭시뮬치과' + ts);
});
// 약관 동의 체크박스 (v5.9.1 P0 수정 검증: 존재해야 함)
const consentVisible = await page.locator('#agreeTerms').isVisible().catch(() => false);
ok('가입 폼에 약관/개인정보 동의 체크박스 존재', consentVisible);
if (consentVisible) {
  // 미동의 시 서버가 거부하는지 먼저 검증
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  const errShown = await page.locator('#authError.show').isVisible().catch(() => false);
  ok('동의 없이 가입 시도 → 차단됨', errShown);
  await page.check('#agreeTerms');
  await page.check('#agreePrivacy');
}
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
// 웰컴 투어 오버레이가 뜨면 확인 후 제거 (클릭 가로채기 방지)
const tourShown = await page.locator('#welcomeTourOverlay').isVisible().catch(() => false);
if (tourShown) console.log('   ℹ️ 웰컴 투어 표시됨 (정상) → 시뮬레이션 위해 제거');
await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
const onboardingShown = await page.locator('text=온보딩').first().isVisible().catch(() => false)
  || await page.evaluate(() => document.body.innerText.includes('환영') || document.body.innerText.includes('설정을 시작'));
const appShown = await page.locator('.app-layout').isVisible().catch(() => false);
ok('가입 직후 온보딩 또는 앱 진입', onboardingShown || appShown);
console.log(`   (온보딩: ${onboardingShown}, 앱: ${appShown})`);

// 온보딩이면 스킵 시도
if (!appShown) {
  const skipBtn = page.locator('button:has-text("건너뛰기"), button:has-text("나중에"), button:has-text("스킵")').first();
  if (await skipBtn.isVisible().catch(() => false)) {
    await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
    await skipBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
  } else {
    // localStorage 우회
    await page.evaluate(() => {
      const u = JSON.parse(localStorage.getItem('pfm_user') || '{}');
      u.onboardingCompleted = true;
      localStorage.setItem('pfm_user', JSON.stringify(u));
      location.reload();
    });
    await page.waitForTimeout(2500);
    issues.push('[WARN] 온보딩에 건너뛰기 버튼 없음 (필수 완료 강제)');
  }
}
ok('앱 레이아웃 진입', await page.locator('.app-layout').isVisible().catch(() => false));

/* ── C. 빈 DB 전 메뉴 순회 ── */
console.log('\n━━ C. 빈 DB 전 메뉴 순회 ━━');
const pages = await page.evaluate(() => {
  const nav = [];
  document.querySelectorAll('[data-page]').forEach(b => nav.push(b.getAttribute('data-page')));
  return [...new Set(nav)];
});
console.log(`   메뉴 ${pages.length}개 발견`);
let visited = 0, brokenPages = [];
for (const p of pages) {
  errors.length = 0;
  try {
    await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
    await page.evaluate((pg) => window.PFM.navigate(pg), p);
    await page.waitForTimeout(900);
    const bodyText = await page.locator('#mainBody').innerText().catch(() => '');
    const hasError = errors.some(e => !e.includes('favicon') && !e.includes('404'));
    const isBlank = bodyText.trim().length < 5;
    if (hasError || isBlank) brokenPages.push(`${p}${hasError ? ' [JS에러]' : ''}${isBlank ? ' [빈화면]' : ''}: ${errors[0] || ''}`);
    visited++;
  } catch (e) { brokenPages.push(`${p} [네비실패]`); }
}
ok(`전 메뉴 ${visited}/${pages.length} 순회, 문제 페이지 ${brokenPages.length}개`, brokenPages.length === 0, 'WARN');
brokenPages.forEach(b => console.log(`   ⚠️ ${b}`));

/* ── D. 초대코드 → 직원 합류 ── */
console.log('\n━━ D. 초대코드 → 직원 합류 ━━');
let inviteCode = null;
try {
  inviteCode = await page.evaluate(async () => {
    const r = await fetch('/api/protected/hr/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'staff', max_uses: 5 }) });
    const d = await r.json();
    return d.invite_code || JSON.stringify(d).slice(0, 100);
  });
} catch (e) { inviteCode = null; }
ok('초대코드 발급 API', !!inviteCode && inviteCode.length < 30);
console.log(`   코드: ${inviteCode}`);

if (inviteCode && inviteCode.length < 30) {
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  const joined = await p2.evaluate(async ({ code, ts }) => {
    const r = await fetch('/api/auth/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invite_code: code, email: `staff${ts}@sim.com`, password: 'sim12345', name: '시뮬직원' }) });
    return { status: r.status, body: await r.json() };
  }, { code: inviteCode, ts });
  ok('직원 합류 (join)', joined.status === 200);
  if (joined.status !== 200) console.log('   응답:', JSON.stringify(joined.body).slice(0, 150));
  // 직원 계정으로 로그인 → 화면 진입 확인
  if (joined.status === 200) {
    await p2.fill('#authEmail', `staff${ts}@sim.com`);
    await p2.fill('#authPassword', 'sim12345');
    await p2.click('button[type="submit"]');
    await p2.waitForTimeout(2500);
    await p2.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
    const staffApp = await p2.locator('.app-layout').isVisible().catch(() => false);
    ok('직원 로그인 → 앱 진입', staffApp);
  }
  await ctx2.close();
}

/* ── E. 모바일 뷰포트 ── */
console.log('\n━━ E. 모바일 (390x844) ━━');
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mctx.newPage();
await mp.goto(BASE + '/pricing', { waitUntil: 'networkidle' });
const planWidth = await mp.locator('#plan-growth').boundingBox();
ok('모바일 /pricing 플랜카드 가로 안 넘침', planWidth && planWidth.width <= 390);
const hScroll = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5);
ok('모바일 /pricing 가로 스크롤 없음', !hScroll);
await mp.goto(BASE, { waitUntil: 'networkidle' });
const authVisible = await mp.locator('#authEmail').isVisible().catch(() => false);
ok('모바일 로그인 화면 렌더', authVisible);
await mctx.close();

await browser.close();
console.log(`\n═══ 시뮬레이션 결과: ✅${pass} / ❌${fail} / ⚠️${warn} ═══`);
if (issues.length) { console.log('\n발견된 이슈:'); issues.forEach(i => console.log(' - ' + i)); }
