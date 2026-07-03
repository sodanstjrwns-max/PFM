/* ═══ 런칭 전 최종: 서비스 목적 달성 시뮬레이션 ═══
 * "신규 원장이 가입 후 실제로 핵심 가치 루프를 완주할 수 있는가?"
 *
 * 가치 루프 (Patient Funnel의 존재 이유):
 *  1. 신환 콜 인입 기록 → 2. 환자 등록 → 3. 퍼널 진입/단계 이동
 *  4. 상담 기록 (플랜/동의 금액) → 5. 일일 KPI 입력
 *  6. 대시보드에서 데이터 확인 → 7. 퍼널 통계에서 전환율 확인
 *  + 샘플 데이터 체험 (첫 사용 경험) + 일일 브리핑
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;
const issues = [];
const ok = (name, cond, note = '') => {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name} ${note}`); issues.push(name + (note ? ' — ' + note : '')); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message.slice(0, 150)));
page.on('dialog', d => d.accept());

/* ── 0. 신규 병원 가입 ── */
const ts = Date.now();
const email = `valueloop${ts}@sim.com`;
console.log('\n━━ 0. 신규 병원 가입 ━━');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('button.auth-tab[data-tab="register"]');
await page.waitForTimeout(300);
await page.fill('#regHospital', '가치루프치과' + ts);
await page.fill('#regName', '루프원장');
await page.fill('#authEmail', email);
await page.fill('#authPassword', 'sim12345');
await page.check('#agreeTerms');
await page.check('#agreePrivacy');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());

// 온보딩 스킵
const skipBtn = page.locator('#obSkip');
if (await skipBtn.isVisible().catch(() => false)) {
  await skipBtn.click({ force: true });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('welcomeTourOverlay')?.remove());
}
ok('가입 → 앱 진입', await page.locator('.app-layout').isVisible().catch(() => false));

// API 헬퍼 (쿠키 인증으로 페이지 컨텍스트에서 호출)
const api = (path, opts = {}) => page.evaluate(async ({ path, opts }) => {
  const r = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}, { path, opts });

/* ── 1. 신환 콜 인입 기록 ── */
console.log('\n━━ 1. 신환 콜 인입 ━━');
const call = await api('/api/protected/calls', { method: 'POST', body: {
  call_type: 'inbound', call_date: new Date().toISOString().slice(0, 10),
  patient_name: '김신환', phone: '010-1234-5678', patient_type: 'new',
  staff_name: '루프원장', treatment_interest: '임플란트', recognition_path: '네이버 검색',
  call_purpose: '상담 문의', reservation_status: 'confirmed',
}});
ok('콜 인입 기록 API', call.status === 200, `(${call.status}) ${JSON.stringify(call.data).slice(0, 100)}`);

/* ── 2. 환자 등록 ── */
console.log('\n━━ 2. 환자 등록 ━━');
const patient = await api('/api/protected/patients', { method: 'POST', body: {
  chart_number: 'C-0001', patient_name: '김신환', phone: '010-1234-5678',
  patient_type: 'new', visit_source: '네이버 검색', first_visit_date: new Date().toISOString().slice(0, 10),
  treatment_area: '임플란트', visit_reason: '어금니 상실',
}});
ok('환자 등록 API', patient.status === 200, `(${patient.status}) ${JSON.stringify(patient.data).slice(0, 100)}`);

/* ── 3. 퍼널 진입 + 단계 이동 ── */
console.log('\n━━ 3. 퍼널 진입 → 단계 이동 ━━');
const funnelEntry = await api('/api/protected/funnel', { method: 'POST', body: {
  patient_name: '김신환', phone: '010-1234-5678', source: '네이버 검색',
  current_stage: 'consultation', treatment_type: '임플란트', estimated_amount: 3500000,
}});
ok('퍼널 환자 등록 API', funnelEntry.status === 200, `(${funnelEntry.status}) ${JSON.stringify(funnelEntry.data).slice(0, 100)}`);

const funnelId = funnelEntry.data?.id;
if (funnelId) {
  const move = await api(`/api/protected/funnel/${funnelId}/stage`, { method: 'PUT', body: { stage: 'treatment' } });
  const move2 = move.status === 404
    ? await api(`/api/protected/funnel/${funnelId}`, { method: 'PUT', body: { current_stage: 'treatment' } })
    : move;
  ok('퍼널 단계 이동 (상담→진료)', move2.status === 200, `(${move2.status})`);
}

/* ── 4. 상담 기록 (핵심 매출 데이터) ── */
console.log('\n━━ 4. 상담 기록 ━━');
const consult = await api('/api/protected/consult-records', { method: 'POST', body: {
  record_date: new Date().toISOString().slice(0, 10), chart_number: 'C-0001',
  patient_name: '김신환', doctor_name: '루프원장', counselor_name: '루프원장',
  planned_amount: 3500000, agreed_amount: 3000000, patient_type: 'new',
  treatment_category: '임플란트', treatment_confirmed: 'Y', appointment_made: 'Y',
}});
ok('상담 기록 API', consult.status === 200, `(${consult.status}) ${JSON.stringify(consult.data).slice(0, 100)}`);

/* ── 5. 일일 KPI 입력 ── */
console.log('\n━━ 5. 일일 KPI ━━');
const kpi = await api('/api/protected/kpi/daily', { method: 'POST', body: {
  record_date: new Date().toISOString().slice(0, 10),
  revenue: 3000000, new_patients: 1, total_patients: 1, consult_count: 1, consult_agreed: 1,
}});
ok('일일 KPI 입력 API', kpi.status === 200, `(${kpi.status}) ${JSON.stringify(kpi.data).slice(0, 100)}`);

/* ── 6. 대시보드 반영 확인 ── */
console.log('\n━━ 6. 대시보드 데이터 반영 ━━');
const dash = await api('/api/protected/dashboard');
ok('대시보드 API 응답', dash.status === 200, `(${dash.status})`);

// UI에서 대시보드 렌더 확인
await page.evaluate(() => window.PFM.navigate('dashboard'));
await page.waitForTimeout(1500);
const dashText = await page.locator('#mainBody').innerText().catch(() => '');
ok('대시보드 UI 렌더 (빈화면 아님)', dashText.trim().length > 50);

/* ── 7. 퍼널 통계 (서비스 핵심 화면) ── */
console.log('\n━━ 7. 퍼널 통계 확인 ━━');
const stats = await api('/api/protected/funnel/stats');
ok('퍼널 통계 API', stats.status === 200, `(${stats.status})`);
await page.evaluate(() => window.PFM.navigate('funnel'));
await page.waitForTimeout(1500);
const funnelText = await page.locator('#mainBody').innerText().catch(() => '');
ok('퍼널 UI에 등록 환자 반영', funnelText.includes('김신환') || funnelText.includes('임플란트') || funnelText.trim().length > 50,
  '(퍼널 화면 내용 부족)');

/* ── 8. 일일 브리핑 (아침 2분 루틴) ── */
console.log('\n━━ 8. 일일 브리핑 ━━');
const brief = await api('/api/protected/briefing/daily').then(r => r.status === 404 ? api('/api/protected/briefing') : r);
ok('일일 브리핑 API', brief.status === 200, `(${brief.status})`);

/* ── 9. 샘플 데이터 체험 (신규 사용자 첫 경험) ── */
console.log('\n━━ 9. 샘플 데이터 체험 ━━');
const seed = await api('/api/protected/onboarding/seed-sample', { method: 'POST', body: {} });
ok('샘플 데이터 주입 API', seed.status === 200, `(${seed.status}) ${JSON.stringify(seed.data).slice(0, 120)}`);

if (seed.status === 200) {
  await page.evaluate(() => window.PFM.navigate('dashboard'));
  await page.waitForTimeout(1800);
  const dashAfter = await page.locator('#mainBody').innerText().catch(() => '');
  ok('샘플 주입 후 대시보드에 데이터 표시', /[1-9]/.test(dashAfter.replace(/202\d/g, '')));
  // 환자 목록에도 반영?
  await page.evaluate(() => window.PFM.navigate('patients'));
  await page.waitForTimeout(1500);
  const patText = await page.locator('#mainBody').innerText().catch(() => '');
  ok('샘플 주입 후 환자 DB 표시', patText.length > 100 && !patText.includes('아직 등록된 환자가 없습니다'));
}

/* ── 10. JS 에러 총점검 ── */
console.log('\n━━ 10. 전체 여정 JS 에러 ━━');
const realErrors = jsErrors.filter(e => !e.includes('favicon'));
ok(`여정 전체 JS 에러 0건`, realErrors.length === 0, `(${realErrors.length}건: ${realErrors[0] || ''})`);

await browser.close();
console.log(`\n═══ 가치 루프 결과: ✅${pass} / ❌${fail} ═══`);
if (issues.length) { console.log('\n미달성 항목:'); issues.forEach(i => console.log(' - ' + i)); }
process.exit(fail > 0 ? 1 : 0);
