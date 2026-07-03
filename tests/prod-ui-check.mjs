// 프로덕션 실서버 브라우저 UI 검증 (런칭 전 최종)
// 실행: cd /home/user/webapp && node tests/prod-ui-check.mjs
import { chromium } from 'playwright';

const BASE = 'https://patient-funnel-manager.pages.dev';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(String(e.message || e)));
  page.on('dialog', (d) => d.accept());

  try {
    // ① /pricing 렌더링
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle', timeout: 30000 });
    const pricingBody = await page.textContent('body');
    check('① /pricing 렌더링', pricingBody.includes('무료') || pricingBody.includes('체험'), '가격 페이지 콘텐츠 확인');
    check('② 사업자 정보 푸터', pricingBody.includes('문석준') && pricingBody.includes('contact@patientfunnel.kr'));

    // ② CTA 클릭 → 회원가입 진입
    const cta = page.locator('a[href*="mode=register"], a[href="/?mode=register"]').first();
    const ctaCount = await cta.count();
    if (ctaCount > 0) {
      await cta.click();
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto(`${BASE}/?mode=register`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(1500);
    const regTabActive = await page.evaluate(() => {
      const t = document.querySelector('button.auth-tab[data-tab="register"]');
      return t ? t.classList.contains('active') || document.querySelector('#regHospital') !== null : false;
    });
    check('③ CTA → 회원가입 탭 자동 전환', regTabActive);

    // ③ 동의 체크박스 존재
    const consentVisible = await page.evaluate(() => {
      const t = document.querySelector('#agreeTerms');
      const p = document.querySelector('#agreePrivacy');
      return !!t && !!p;
    });
    check('④ 약관/개인정보 동의 체크박스 존재', consentVisible);

    // ④ 실제 가입 (프로덕션 신규 병원)
    const ts = Date.now();
    const email = `prodcheck${ts}@launchtest.kr`;
    await page.fill('#regHospital', `런칭점검치과${ts % 10000}`);
    await page.fill('#regName', '점검원장');
    await page.fill('#authEmail', email);
    await page.fill('#authPassword', 'Launch!2026');
    await page.check('#agreeTerms');
    await page.check('#agreePrivacy');
    await page.click('#authForm button[type="submit"]');
    await page.waitForTimeout(4000);

    // 온보딩/투어 스킵
    await page.evaluate(() => {
      const ov = document.querySelector('#welcomeTourOverlay');
      if (ov) ov.remove();
    });
    const skipBtn = page.locator('#obSkip');
    if (await skipBtn.count() > 0) {
      try { await skipBtn.click({ force: true, timeout: 5000 }); } catch {}
      await page.waitForTimeout(1500);
    }
    await page.evaluate(() => {
      const ov = document.querySelector('#welcomeTourOverlay');
      if (ov) ov.remove();
    });

    const inApp = await page.evaluate(() => !!document.querySelector('#sidebar, .sidebar, nav'));
    check('⑤ 회원가입 → 앱 진입', inApp, email);

    // ⑤ 체험 배너 (D-14)
    const bannerText = await page.evaluate(() => {
      const b = document.querySelector('#trialBanner, .trial-banner, [class*="trial"]');
      return b ? b.textContent : '';
    });
    check('⑥ 무료 체험 배너 표시', /14|무료|체험/.test(bannerText || ''), (bannerText || '').trim().slice(0, 50));

    // ⑥ 빈 DB 페이지 3종 (어제 P0 회귀 확인)
    const emptyPages = [
      ['patients', '환자 DB'],
      ['complaints', '컴플레인'],
      ['calls-inbound', '인바운드 콜'],
    ];
    for (const [pageId, label] of emptyPages) {
      const errBefore = jsErrors.length;
      await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
      await page.evaluate((pid) => window.PFM.navigate(pid), pageId);
      await page.waitForTimeout(2000);
      const bodyText = await page.locator('#mainBody').innerText().catch(() => '');
      const hasContent = bodyText.trim().length > 5;
      const newErr = jsErrors.length - errBefore;
      check(`⑦ 빈 DB "${label}" 페이지`, hasContent && newErr === 0, newErr > 0 ? `JS에러 ${newErr}건` : '정상 렌더');
    }

    // ⑦ 로그아웃 후 비밀번호 재설정 링크
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.cookie = 'pfm_auth=; Max-Age=0; path=/';
      localStorage.clear();
    });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const forgotVisible = await page.evaluate(() => {
      const f = document.querySelector('#forgotPasswordLink');
      return !!f;
    });
    check('⑧ 비밀번호 찾기 링크 존재', forgotVisible);

    // ⑧ JS 에러 총계
    check('⑨ 전체 JS 에러 0건', jsErrors.length === 0, jsErrors.length ? jsErrors.slice(0, 3).join(' | ') : '');
  } catch (e) {
    check('실행 중 예외', false, String(e.message || e).slice(0, 200));
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n═══ 프로덕션 UI 검증: ✅${pass} / ❌${fail} ═══`);
  process.exit(fail > 0 ? 1 : 0);
};

run();
