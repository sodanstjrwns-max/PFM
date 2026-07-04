/* ═══ v5.11 동시성 부하 + 멀티테넌트 격리 검증 ═══
 * 시나리오: 여러 병원의 여러 직원이 동시에 폴링/조회/쓰기를 수행.
 *   1) 로그인 60명 (병원 6곳 × 10명)
 *   2) 폴링 스톰: 60명이 poll+badge 를 5라운드 동시 호출 (600 req)
 *   3) 읽기 혼합: hr/me + patients + dashboard 동시 호출
 *   4) 쓰기 경합: 같은 채널에 20명 동시 메시지 발송 → 유실/중복 검증
 *   5) 격리: 병원 A 사용자가 병원 B 데이터에 접근 불가 확인
 * 실행: node tests/load-concurrency.mjs [BASE_URL]
 */
const BASE = process.argv[2] || 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
};

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'LoadTest!2026' }),
  });
  const j = await r.json();
  if (!j.token) throw new Error(`login failed: ${email} ${JSON.stringify(j).slice(0, 100)}`);
  return j.token;
}
const authed = (token, path, opts = {}) =>
  fetch(`${BASE}${path}`, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

const pct = (arr, p) => arr.sort((a, b) => a - b)[Math.floor(arr.length * p)] || 0;

(async () => {
  console.log(`\n═══ 1) 동시 로그인 60명 (병원 6곳 × 10명) ═══`);
  const t0 = Date.now();
  const sessions = [];
  const loginJobs = [];
  for (let h = 0; h < 6; h++)
    for (let u = 0; u < 10; u++)
      loginJobs.push(login(`lt-h${h}-u${u}@loadtest.com`).then(tok => sessions.push({ h, u, tok })));
  await Promise.all(loginJobs);
  ok('60명 동시 로그인', sessions.length === 60, `${Date.now() - t0}ms`);

  console.log(`\n═══ 2) 폴링 스톰: 60명 × 5라운드 (poll + badge = 600 req) ═══`);
  /* ⚠️ 로컬 miniflare 는 단일 프로세스라 동시 요청을 직렬화한다 (프로덕션 Workers 는 isolate 수평 분산).
   *    절대값 대신 "DB 무접촉 베이스라인 대비 배수"로 앱 오버헤드를 평가한다. */
  const baseLat = [];
  for (let round = 0; round < 5; round++) {
    await Promise.all(sessions.map(async (s) => {
      const t = Date.now();
      await fetch(`${BASE}/api/__nonexistent__`); // 404 JSON — 라우팅+직렬화만 측정
      await fetch(`${BASE}/api/__nonexistent__`);
      baseLat.push(Date.now() - t);
    }));
  }
  const lat = [];
  let pollErrors = 0;
  for (let round = 0; round < 5; round++) {
    await Promise.all(sessions.map(async (s) => {
      const t = Date.now();
      try {
        const r1 = await authed(s.tok, `/api/protected/messenger/poll?channelId=loadtest-c${s.h}-0`);
        if (r1.status !== 200) pollErrors++;
        const r2 = await authed(s.tok, `/api/protected/messenger/poll/badge`);
        if (r2.status !== 200) pollErrors++;
        await r1.json(); await r2.json();
      } catch { pollErrors += 2; }
      lat.push(Date.now() - t);
    }));
  }
  const b50 = pct(baseLat, 0.5), p50 = pct(lat, 0.5);
  ok('폴링 600 req 무오류', pollErrors === 0, `오류 ${pollErrors}건`);
  /* 기준 ×10: poll+badge 는 요청당 D1 쿼리 ~6개 — miniflare 는 D1 접근을 단일
   * DO 스레드로 직렬화하므로 동시 60명이면 쿼리 수에 비례해 지연이 누적된다.
   * 프로덕션 D1 은 쿼리당 ~1ms + isolate 수평 분산이라 이 배수가 그대로 나타나지 않음.
   * 여기서 보는 것: 배수가 쿼리 수 대비 폭주하지 않는가 (락 경합/풀스캔 부재 확인). */
  ok('앱 오버헤드 ≤ 베이스라인 ×10', p50 <= Math.max(b50 * 10, 1000),
    `baseline p50=${b50}ms → poll p50=${p50}ms p95=${pct(lat, 0.95)}ms (배수 ${(p50 / b50).toFixed(1)}x)`);

  console.log(`\n═══ 3) 읽기 혼합 (hr/me + patients + poll 병렬) ═══`);
  const t3 = Date.now();
  let readErrors = 0;
  await Promise.all(sessions.slice(0, 30).map(async (s) => {
    const rs = await Promise.all([
      authed(s.tok, '/api/protected/hr/me'),
      authed(s.tok, '/api/protected/patients?limit=50'),
      authed(s.tok, '/api/protected/messenger/poll/badge'),
    ]);
    for (const r of rs) if (r.status !== 200) readErrors++;
  }));
  ok('읽기 혼합 90 req 무오류', readErrors === 0, `${Date.now() - t3}ms, 오류 ${readErrors}건`);

  console.log(`\n═══ 4) 쓰기 경합: 같은 채널 20명 동시 발송 ═══`);
  const megaUsers = sessions.filter(s => s.h === 0).slice(0, 10);
  // 세션 부족하면 추가 로그인
  while (megaUsers.length < 20) {
    const idx = megaUsers.length + 10;
    megaUsers.push({ h: 0, u: idx, tok: await login(`lt-h0-u${idx}@loadtest.com`) });
  }
  const marker = `동시성테스트-${Date.now()}`;
  const sendResults = await Promise.all(megaUsers.map((s, i) =>
    authed(s.tok, `/api/protected/messenger/channels/loadtest-c0-7/messages`, {
      method: 'POST', body: JSON.stringify({ content: `${marker}-${i}` }),
    }).then(r => r.status)
  ));
  const sent = sendResults.filter(s => s === 200 || s === 201).length;
  ok('20명 동시 발송 성공', sent === 20, `성공 ${sent}/20`);
  // 유실/중복 검증
  await new Promise(r => setTimeout(r, 500));
  const verify = await authed(megaUsers[0].tok, `/api/protected/messenger/channels/loadtest-c0-7/messages?limit=60`);
  const vj = await verify.json();
  const msgs = (vj.messages || vj.results || vj || []);
  const found = (Array.isArray(msgs) ? msgs : []).filter(m => (m.content || '').startsWith(marker));
  ok('메시지 유실/중복 없음', found.length === 20, `조회됨 ${found.length}/20`);

  console.log(`\n═══ 5) 멀티테넌트 격리 (병원 h1 사용자 → 병원 h0 자원) ═══`);
  const alien = sessions.find(s => s.h === 1);
  const r5a = await authed(alien.tok, `/api/protected/messenger/channels/loadtest-c0-0/messages?limit=5`);
  ok('타 병원 채널 메시지 접근 차단', r5a.status === 403 || r5a.status === 404 || (await r5a.clone().json().then(j => (j.messages || j.results || []).length === 0).catch(() => false)), `status=${r5a.status}`);
  const r5b = await authed(alien.tok, `/api/protected/messenger/channels/loadtest-c0-0/messages`, {
    method: 'POST', body: JSON.stringify({ content: '침투 시도' }),
  });
  ok('타 병원 채널 쓰기 차단', r5b.status >= 400, `status=${r5b.status}`);
  // 폴링이 타 병원 데이터를 새지 않는지
  const r5c = await authed(alien.tok, `/api/protected/messenger/poll?full=1`);
  const j5c = await r5c.json();
  const leaked = (j5c.userStatuses || []).some(u => String(u.id).startsWith('loadtest-u0-'));
  ok('폴링 presence 테넌트 격리', !leaked, `h1 폴링에 h0 사용자 ${leaked ? '노출!' : '없음'}`);

  console.log(`\n═══ 결과: ${pass} passed / ${fail} failed ═══`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
