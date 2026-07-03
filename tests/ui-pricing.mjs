/* v5.9 프라이싱/구독 UI 스모크 테스트
 * 1) /pricing 렌더 + 월/연 토글 동작 + CSP 위반 0
 * 2) /legal/* 3종 렌더
 * 3) 로그인 → 설정 > 구독 관리 섹션 렌더
 * 4) 체험 배너 (trial 병원)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? (pass++, console.log(`✅ ${name}`)) : (fail++, console.log(`❌ ${name}`)); };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cspViolations = [];
page.on('console', m => { if (m.text().includes('Content Security Policy')) cspViolations.push(m.text()); });

// ── 1. Pricing page ──
await page.goto(BASE + '/pricing', { waitUntil: 'networkidle' });
ok('pricing: plans grid 렌더', await page.locator('#plans-grid .plan').count() === 3);
ok('pricing: Growth featured', await page.locator('#plan-growth.featured').count() === 1);
const before = await page.locator('#plan-growth .price b').textContent();
await page.click('#btnYearly');
const after = await page.locator('#plan-growth .price b').textContent();
ok(`pricing: 연간 토글 동작 (${before} → ${after})`, before === '39.9' && after === '33.9');
ok('pricing: 연납 노트 표시', (await page.locator('#plan-growth .price-note').textContent()).includes('406.8'));

// ── 2. Legal pages ──
for (const d of ['privacy', 'terms', 'sla']) {
  await page.goto(`${BASE}/legal/${d}`, { waitUntil: 'domcontentloaded' });
  ok(`legal/${d}: 렌더`, (await page.locator('main.legal h2').count()) === 1);
}

// ── 3. Login → 설정 > 구독 관리 ──
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#authEmail', 'admin@seoulbd.com');
await page.fill('#authPassword', 'admin123');
await page.click('button[type="submit"]');
await page.waitForSelector('.app-layout', { timeout: 15000 });
await page.evaluate(() => window.PFM.navigate('settings'));
await page.waitForSelector('#subscriptionSection', { timeout: 10000 });
await page.waitForFunction(() => {
  const s = document.getElementById('subscriptionSection');
  return s && !s.querySelector('.loading-spinner');
}, { timeout: 10000 });
const subText = await page.locator('#subscriptionSection').textContent();
ok('settings: 구독 섹션 렌더 (Founding)', subText.includes('Founding Member'));
ok('settings: 파운딩 무기한 안내', subText.includes('무기한'));

// founding 병원은 배너 없어야 함
const bannerHtml = await page.locator('#trialBanner').innerHTML();
ok('banner: founding 병원은 배너 없음', bannerHtml.trim() === '');

// ── 4. 신규 체험 병원 배너 ──
const ts = Date.now();
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(BASE, { waitUntil: 'networkidle' });
const reg = await p2.evaluate(async (ts) => {
  const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalName: 'UI체험치과' + ts, email: `uitrial${ts}@t.com`, password: 'test1234', name: 'UI원장', agreeTerms: true, agreePrivacy: true }) });
  return await r.json();
}, ts);
ok('register: 신규 병원 생성', !!reg.user);
// 온보딩 화면 스킵을 위해 완료 플래그 저장
await p2.evaluate((u) => {
  u.onboardingCompleted = true;
  localStorage.setItem('pfm_user', JSON.stringify(u));
  location.reload();
}, reg.user);
await p2.waitForSelector('.app-layout', { timeout: 10000 });
await p2.waitForFunction(() => {
  const b = document.getElementById('trialBanner');
  return b && b.innerHTML.trim() !== '';
}, { timeout: 10000 }).catch(() => {});
const trialBanner = await p2.locator('#trialBanner').textContent();
ok('banner: 체험 병원 배너 표시 (14일)', trialBanner.includes('무료 체험') && trialBanner.includes('14일'));

ok('CSP 위반 0건', cspViolations.length === 0);
if (cspViolations.length) console.log(cspViolations.slice(0, 3));

await browser.close();
console.log(`\n═══ 결과: ${pass} passed / ${fail} failed ═══`);
process.exit(fail ? 1 : 0);
