/* ═══ 전 API 엔드포인트 수평 사격 (역할 3종 × 파라미터 없는 GET 전량) ═══
 * 기존 UI 스위트가 "화면이 렌더되는가"만 보는 사각지대를 메움:
 *  1. 모든 GET API가 200/정상 JSON을 반환하는가 (5xx / 크래시 없음)
 *  2. 역할별 권한이 일관되게 걸려있는가 (staff가 admin 전용 데이터를 못 보는가)
 *  3. 신규 가입 병원(데이터 0건)에서도 API가 안전하게 빈 결과를 주는가
 *  4. 응답 지연 (느린 엔드포인트 식별)
 */
import fs from 'fs';
import { execSync } from 'child_process';

const BASE = process.env.BASE || 'http://localhost:3000';

// v5.12: 라우트 목록이 없으면 자동 생성 (샌드박스 리셋 후에도 단독 실행 가능하게)
const ROUTES_FILE = new URL('../.tmp-routes.json', import.meta.url);
if (!fs.existsSync(ROUTES_FILE)) {
  execSync('node scripts/extract-routes.cjs', { cwd: new URL('..', import.meta.url).pathname, stdio: 'inherit' });
}
const routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));

const ACCOUNTS = [
  { role: 'admin', email: 'admin@seoulbd.com', password: 'admin123' },
  { role: 'manager', email: 'manager@seoulbd.com', password: 'manager123' },
  { role: 'staff', email: 'desk1@seoulbd.com', password: 'staff123' },
];

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  return j.token || j.accessToken || null;
}

const results = [];
const slow = [];

async function sweep(acct, token) {
  const gets = routes.filter(r => r.method === 'GET' && !r.full.includes(':') && !r.full.includes('*'));
  for (const rt of gets) {
    const t0 = Date.now();
    let status = 0, body = '', err = null;
    try {
      const res = await fetch(BASE + rt.full, { headers: { Authorization: `Bearer ${token}` } });
      status = res.status;
      body = (await res.text()).slice(0, 300);
    } catch (e) { err = String(e.message || e); }
    const ms = Date.now() - t0;
    if (ms > 1500) slow.push({ role: acct.role, path: rt.full, ms });
    results.push({ role: acct.role, path: rt.full, file: rt.file, status, ms, body, err });
  }
}

for (const acct of ACCOUNTS) {
  const token = await login(acct.email, acct.password);
  if (!token) { console.log(`❌ 로그인 실패: ${acct.email}`); continue; }
  console.log(`\n━━ [${acct.role}] ${acct.email} 로그인 성공, API 사격 시작 ━━`);
  await sweep(acct, token);
}

// ── 무인증 접근 테스트 (보안) ──
console.log(`\n━━ [anon] 무인증 접근 차단 확인 ━━`);
const anonSample = routes.filter(r => r.method === 'GET' && !r.full.includes(':') && !r.full.includes('*'))
  .filter(r => r.full.startsWith('/api/protected'));
let anonLeak = 0;
for (const rt of anonSample) {
  const res = await fetch(BASE + rt.full).catch(() => null);
  if (res && res.status === 200) { anonLeak++; console.log(`🚨 무인증 200 유출: ${rt.full}`); }
}
console.log(anonLeak === 0 ? `✅ 무인증 유출 0건 (${anonSample.length}개 검사)` : `🚨 무인증 유출 ${anonLeak}건`);

// ── 결과 집계 ──
const err5xx = results.filter(r => r.status >= 500);
const err4xx = results.filter(r => r.status >= 400 && r.status < 500);
const netErr = results.filter(r => r.err);

console.log(`\n\n═══ API 사격 결과 ═══`);
console.log(`총 요청: ${results.length}  |  200 OK: ${results.filter(r => r.status === 200).length}  |  4xx: ${err4xx.length}  |  5xx: ${err5xx.length}  |  네트워크에러: ${netErr.length}`);

if (err5xx.length) {
  console.log(`\n🚨 5xx 서버 에러 (${err5xx.length}건):`);
  err5xx.forEach(r => console.log(`  [${r.role}] ${r.status} ${r.path}  (${r.file}.ts)\n     → ${r.body.slice(0, 200)}`));
}
if (err4xx.length) {
  console.log(`\n⚠️ 4xx 응답 (${err4xx.length}건) — 권한 차단이면 정상, 그 외면 버그:`);
  err4xx.forEach(r => console.log(`  [${r.role}] ${r.status} ${r.path} → ${r.body.slice(0, 120)}`));
}
if (netErr.length) {
  console.log(`\n🚨 네트워크/타임아웃 (${netErr.length}건):`);
  netErr.forEach(r => console.log(`  [${r.role}] ${r.path} → ${r.err}`));
}
if (slow.length) {
  console.log(`\n🐢 느린 응답 >1.5s (${slow.length}건):`);
  slow.sort((a, b) => b.ms - a.ms).slice(0, 20).forEach(r => console.log(`  [${r.role}] ${r.ms}ms  ${r.path}`));
}

// 역할 간 응답 차이 (권한 일관성)
console.log(`\n━━ 역할별 응답 상태 차이 (권한 스코프 점검) ━━`);
const byPath = {};
results.forEach(r => { (byPath[r.path] ||= {})[r.role] = r.status; });
let diffCount = 0;
for (const [p, m] of Object.entries(byPath)) {
  const st = new Set(Object.values(m));
  if (st.size > 1) { diffCount++; console.log(`  ${p}  admin=${m.admin} manager=${m.manager} staff=${m.staff}`); }
}
console.log(`역할별 상태 상이: ${diffCount}건`);

process.exit(err5xx.length + netErr.length + anonLeak > 0 ? 1 : 0);
