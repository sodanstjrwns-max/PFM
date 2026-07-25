/* ═══ 실사용 시뮬레이션: 신규 병원 원장의 0일차 → 운영 정착 여정 (쓰기 경로 중심) ═══
 * 기존 UI 스위트가 못 보던 영역:
 *   - 신규 가입 병원(데이터 0건)에서 각 API가 안전하게 동작하는가 (empty state)
 *   - POST/PUT/DELETE 쓰기 경로가 실제로 데이터를 남기고 되읽히는가 (round-trip)
 *   - 잘못된 입력에 대한 방어 (validation)
 *   - 테넌트 격리 / 권한 상승 / 토큰 위변조
 *   - 로그인 레이트리밋의 IP 공유 부작용
 * 주의: 로그인 레이트리밋이 IP 단위이므로 시나리오마다 다른 X-Forwarded-For 를 씀
 */
const BASE = process.env.BASE || 'http://localhost:3000';
let pass = 0, fail = 0;
const issues = [];
const notes = [];
const ok = (name, cond, note = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${note}`); issues.push(`${name} — ${note}`); }
};
const warn = (msg) => { notes.push(msg); console.log(`  ⚠️  ${msg}`); };

const api = async (token, method, path, body, ip = '198.51.100.7') => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { status: res.status, json };
};

const today = new Date().toISOString().slice(0, 10);
const stamp = Date.now();
const NEW = {
  email: `sim${stamp}@clinic.test`,
  password: 'Test1234!@',
  name: '시뮬레이션원장',
  hospitalName: `시뮬치과${stamp}`,
};
const IP_NEW = '198.51.100.7';
const IP_DEMO = '198.51.100.21';
const IP_STAFF = '198.51.100.33';
const IP_ATTACK = '198.51.100.99';

console.log('\n═══════ 1단계: 신규 병원 회원가입 ═══════');
const reg = await api(null, 'POST', '/api/auth/register', {
  email: NEW.email, password: NEW.password, name: NEW.name,
  hospitalName: NEW.hospitalName, phone: '010-1234-5678',
  agreeTerms: true, agreePrivacy: true,
}, IP_NEW);
ok('신규 병원 가입 성공', reg.status === 200 || reg.status === 201, `status=${reg.status} ${JSON.stringify(reg.json).slice(0, 200)}`);
let token = reg.json?.token;
if (!token) {
  const li = await api(null, 'POST', '/api/auth/login', { email: NEW.email, password: NEW.password }, IP_NEW);
  token = li.json?.token;
}
ok('가입 직후 토큰 발급', !!token);
if (!token) { console.log('토큰 없음 — 중단'); process.exit(1); }

const me = await api(token, 'GET', '/api/protected/me');
ok('내 정보 조회 (role=admin)', me.json?.user?.role === 'admin' || me.json?.role === 'admin', JSON.stringify(me.json).slice(0, 200));

console.log('\n═══════ 2단계: 데이터 0건 상태에서 주요 화면 API (empty state) ═══════');
const emptyChecks = [
  '/api/protected/dashboard', '/api/protected/patients', '/api/protected/funnel/stats',
  '/api/protected/kpi/dashboard', '/api/protected/calls/stats', '/api/protected/consult-records/dashboard',
  '/api/protected/briefing', '/api/protected/referrals/stats', '/api/protected/pf-index/status',
  '/api/protected/gamification/my-progress', '/api/protected/review-mgmt/dashboard',
  '/api/protected/hr/dashboard', '/api/protected/patients/stats/summary', '/api/protected/complaints/stats',
  '/api/protected/reservations/stats', '/api/protected/wait-times/stats', '/api/protected/surveys/stats/overview',
  '/api/protected/onboarding/status', '/api/protected/admin/data-gaps', '/api/protected/insights/weekly',
];
let emptyOk = 0;
for (const p of emptyChecks) {
  const r = await api(token, 'GET', p);
  if (r.status === 200) emptyOk++;
  else ok(`빈 병원 ${p}`, false, `status=${r.status} ${JSON.stringify(r.json).slice(0, 150)}`);
}
ok(`빈 병원 주요 API ${emptyOk}/${emptyChecks.length} 정상`, emptyOk === emptyChecks.length);

console.log('\n═══════ 3단계: 실제 업무 쓰기 → 되읽기 (round-trip) ═══════');
const pName = `테스트환자${stamp}`;
const pc = await api(token, 'POST', '/api/protected/patients', {
  patient_name: pName, phone: '010-9999-0001', birth_date: '1990-01-01', gender: '여',
  visit_source: '검색', chart_number: `C${stamp}`, patient_type: 'new', first_visit_date: today,
});
ok('환자 등록', pc.status === 200 || pc.status === 201, `status=${pc.status} ${JSON.stringify(pc.json).slice(0, 200)}`);
const patientId = pc.json?.id;

const plist = await api(token, 'GET', '/api/protected/patients');
const arr = plist.json?.patients || plist.json?.data || plist.json;
ok('등록 환자가 목록에 반영', Array.isArray(arr) && arr.some(p => p.patient_name === pName), `목록 ${Array.isArray(arr) ? arr.length : '?'}건`);

if (patientId) {
  const up = await api(token, 'PUT', `/api/protected/patients/${patientId}`, { patient_name: pName, phone: '010-9999-0002', memo: '시뮬 수정' });
  ok('환자 정보 수정', up.status === 200, `status=${up.status} ${JSON.stringify(up.json).slice(0, 150)}`);
  const re = await api(token, 'GET', '/api/protected/patients');
  const reArr = re.json?.patients || re.json?.data || re.json;
  const t = Array.isArray(reArr) && reArr.find(p => p.id === patientId);
  ok('수정 내용이 실제 반영됨', t && t.phone === '010-9999-0002', `phone=${t?.phone}`);
}

const call = await api(token, 'POST', '/api/protected/calls', {
  call_type: 'inbound', patient_name: pName, phone: '010-9999-0001',
  call_date: today, content: '임플란트 문의', result: 'reserved',
});
ok('콜 기록 등록', call.status === 200 || call.status === 201, `status=${call.status} ${JSON.stringify(call.json).slice(0, 200)}`);

const fn = await api(token, 'POST', '/api/protected/funnel', {
  patient_name: pName, phone: '010-9999-0001', current_stage: 'awareness', source: '검색', estimated_amount: 3000000,
});
ok('퍼널 환자 등록', fn.status === 200 || fn.status === 201, `status=${fn.status} ${JSON.stringify(fn.json).slice(0, 200)}`);
const fnId = fn.json?.id;
if (fnId) {
  const mv = await api(token, 'PUT', `/api/protected/funnel/${fnId}`, { current_stage: 'consult' });
  ok('퍼널 단계 이동 (awareness→consult)', mv.status === 200, `status=${mv.status} ${JSON.stringify(mv.json).slice(0, 150)}`);
  const fstat = await api(token, 'GET', '/api/protected/funnel/stats');
  ok('퍼널 통계 반영', fstat.status === 200, `status=${fstat.status}`);
  // 잘못된 단계값
  const badStage = await api(token, 'PUT', `/api/protected/funnel/${fnId}`, { current_stage: 'nonexistent_stage' });
  ok('존재하지 않는 퍼널 단계 거부', badStage.status >= 400, `status=${badStage.status} ${JSON.stringify(badStage.json).slice(0, 120)}`);
}

const cs = await api(token, 'POST', '/api/protected/consult-records', {
  record_date: today, patient_name: pName, treatment_category: '임플란트',
  planned_amount: 3000000, agreed_amount: 3000000, patient_type: 'new', treatment_confirmed: 'Y',
});
ok('상담 기록 등록', cs.status === 200 || cs.status === 201, `status=${cs.status} ${JSON.stringify(cs.json).slice(0, 200)}`);

const kpi = await api(token, 'POST', '/api/protected/kpi/daily', {
  record_date: today, new_patients: 5, existing_patients: 12,
  revenue_non_insurance: 5000000, revenue_insurance: 800000, total_consultations: 3, inbound_calls: 9,
});
ok('일일 KPI 입력', kpi.status === 200 || kpi.status === 201, `status=${kpi.status} ${JSON.stringify(kpi.json).slice(0, 200)}`);
const kpiRead = await api(token, 'GET', `/api/protected/kpi/daily?date=${today}`);
ok('KPI 되읽기 일치', kpiRead.json && Number(kpiRead.json.new_patients) === 5, `읽은값=${JSON.stringify(kpiRead.json).slice(0, 150)}`);

// 같은 날짜 재입력 (upsert 동작 확인)
const kpi2 = await api(token, 'POST', '/api/protected/kpi/daily', { record_date: today, new_patients: 7 });
const kpiRead2 = await api(token, 'GET', `/api/protected/kpi/daily?date=${today}`);
ok('KPI 같은 날짜 재입력 → 덮어쓰기(upsert)', Number(kpiRead2.json?.new_patients) === 7, `값=${kpiRead2.json?.new_patients}`);
if (Number(kpiRead2.json?.revenue_non_insurance) === 0) {
  warn('KPI 부분 수정 시 미전송 필드가 0으로 초기화됨 — "신규환자만 고치려다 매출 날아감" 사고 가능 (PATCH 시맨틱 부재)');
}

const cp = await api(token, 'POST', '/api/protected/complaints', {
  patient_name: pName, complaint_date: today, category: '대기시간', content: '대기가 길었음', severity: 'low',
});
ok('컴플레인 기록', cp.status === 200 || cp.status === 201, `status=${cp.status} ${JSON.stringify(cp.json).slice(0, 200)}`);

const dash = await api(token, 'GET', '/api/protected/dashboard');
ok('대시보드 정상 응답', dash.status === 200 && JSON.stringify(dash.json).length > 50);

console.log('\n═══════ 4단계: 입력 검증 (validation) ═══════');
const vCases = [
  { n: '환자명 누락', m: 'POST', p: '/api/protected/patients', b: { phone: '010-0000-0000' }, expect: 'reject' },
  { n: '환자명 빈문자열', m: 'POST', p: '/api/protected/patients', b: { patient_name: '', phone: '010-0000-0000' }, expect: 'reject' },
  { n: 'KPI 날짜 누락', m: 'POST', p: '/api/protected/kpi/daily', b: { new_patients: 1 }, expect: 'reject' },
  { n: '상담 날짜 누락', m: 'POST', p: '/api/protected/consult-records', b: { patient_name: 'x' }, expect: 'reject' },
];
for (const t of vCases) {
  const r = await api(token, t.m, t.p, t.b);
  ok(`${t.n} → 400대 거부`, r.status >= 400 && r.status < 500, `status=${r.status} ${JSON.stringify(r.json).slice(0, 130)}`);
}

// 크래시/오염 계열 (거부 안 해도 크래시만 없으면 통과, 단 데이터 오염은 경고)
const abuse = [
  { n: 'KPI 음수 매출', m: 'POST', p: '/api/protected/kpi/daily', b: { record_date: '2026-01-05', revenue_non_insurance: -99999999 }, check: async () => {
      const r = await api(token, 'GET', '/api/protected/kpi/daily?date=2026-01-05');
      if (Number(r.json?.revenue_non_insurance) < 0) warn('음수 매출이 그대로 저장됨 — 통계 왜곡 가능');
    } },
  { n: 'KPI 미래 날짜(2099년)', m: 'POST', p: '/api/protected/kpi/daily', b: { record_date: '2099-12-31', new_patients: 999 }, check: async () => {
      const r = await api(token, 'GET', '/api/protected/kpi/daily?date=2099-12-31');
      if (r.json && r.json.new_patients) warn('2099년 미래 날짜 KPI가 저장됨 — 오타 입력 시 그래프/평균 왜곡');
    } },
  { n: 'XSS 스크립트 환자명', m: 'POST', p: '/api/protected/patients', b: { patient_name: '<script>alert(1)</script>', phone: '010-0000-0000' }, check: async () => {
      const r = await api(token, 'GET', '/api/protected/patients');
      const raw = JSON.stringify(r.json);
      if (raw.includes('<script>')) warn('XSS 페이로드가 원문 그대로 저장/반환됨 — 프론트 이스케이프에 전적으로 의존');
    } },
  { n: 'SQL 인젝션 검색', m: 'GET', p: `/api/protected/patients?search=${encodeURIComponent("' OR 1=1--")}` },
  { n: '초장문 환자명(1만자)', m: 'POST', p: '/api/protected/patients', b: { patient_name: 'ㅁ'.repeat(10000), phone: '010-0000-0000' } },
  { n: '잘못된 날짜형식 KPI', m: 'POST', p: '/api/protected/kpi/daily', b: { record_date: 'NOT-A-DATE', new_patients: 3 }, check: async () => {
      const r = await api(token, 'GET', '/api/protected/kpi/daily?date=NOT-A-DATE');
      if (r.json && r.json.id) warn('날짜 형식 검증 없이 "NOT-A-DATE" 레코드가 저장됨 — 달력/집계 깨짐 가능');
    } },
];
for (const t of abuse) {
  const r = await api(token, t.m, t.p, t.b);
  ok(`${t.n} → 서버 크래시 없음 (status=${r.status})`, r.status < 500, JSON.stringify(r.json).slice(0, 130));
  if (t.check) await t.check();
}

console.log('\n═══════ 5단계: 테넌트 격리 (다른 병원 데이터 침범) ═══════');
const demoLogin = await api(null, 'POST', '/api/auth/login', { email: 'admin@seoulbd.com', password: 'admin123' }, IP_DEMO);
const demoToken = demoLogin.json?.token;
ok('데모 병원 admin 로그인', !!demoToken, JSON.stringify(demoLogin.json).slice(0, 150));
if (demoToken) {
  const dp = await api(demoToken, 'GET', '/api/protected/patients');
  const dArr = dp.json?.patients || dp.json?.data || dp.json;
  const demoId = Array.isArray(dArr) && dArr[0]?.id;
  ok('데모 병원 환자 존재 (사전조건)', !!demoId);
  if (demoId) {
    const s1 = await api(token, 'GET', `/api/protected/patients/${demoId}`);
    ok('타 병원 환자 조회 차단', s1.status === 403 || s1.status === 404, `status=${s1.status}`);
    const s2 = await api(token, 'PUT', `/api/protected/patients/${demoId}`, { patient_name: '해킹됨' });
    ok('타 병원 환자 수정 차단', s2.status === 403 || s2.status === 404, `status=${s2.status}`);
    const s3 = await api(token, 'DELETE', `/api/protected/patients/${demoId}`);
    ok('타 병원 환자 삭제 차단', s3.status === 403 || s3.status === 404, `status=${s3.status}`);
    // 삭제 실제로 됐는지 재확인
    const after = await api(demoToken, 'GET', '/api/protected/patients');
    const stillThere = JSON.stringify(after.json).includes(demoId);
    ok('삭제 시도 후에도 원본 데이터 무사', stillThere);
  }
  const leaked = JSON.stringify(dp.json).includes(pName);
  ok('신규 병원 환자가 데모 병원에 노출되지 않음', !leaked);
}

console.log('\n═══════ 6단계: 권한 상승 시도 (staff 계정) ═══════');
const staffLogin = await api(null, 'POST', '/api/auth/login', { email: 'desk1@seoulbd.com', password: 'staff123' }, IP_STAFF);
const staffToken = staffLogin.json?.token;
ok('staff 로그인', !!staffToken, JSON.stringify(staffLogin.json).slice(0, 150));
if (staffToken) {
  const esc = [
    { n: 'staff → 타인 역할을 admin으로 변경', m: 'PUT', p: '/api/protected/hr/staff/u-admin', b: { role: 'admin' } },
    { n: 'staff → 감사로그 열람', m: 'GET', p: '/api/protected/admin/audit-logs' },
    { n: 'staff → 병원 설정 변경', m: 'PUT', p: '/api/protected/hospital/settings', b: { hospital_name: '탈취됨' } },
    { n: 'staff → 관리자 비밀번호 강제 리셋', m: 'POST', p: '/api/protected/admin/reset-pw', b: { email: 'admin@seoulbd.com', newPassword: 'hacked123' } },
    { n: 'staff → 환자 전체 CSV 내보내기', m: 'GET', p: '/api/protected/reports/csv/patients' },
    { n: 'staff → 병원 전체 개요 조회', m: 'GET', p: '/api/protected/admin/hospital/overview' },
  ];
  for (const t of esc) {
    const r = await api(staffToken, t.m, t.p, t.b);
    ok(`${t.n} → 차단`, r.status === 403 || r.status === 401 || r.status === 404, `status=${r.status} ${JSON.stringify(r.json).slice(0, 120)}`);
  }
  // 리셋이 실제로 안 먹혔는지 확인
  const stillAdmin = await api(null, 'POST', '/api/auth/login', { email: 'admin@seoulbd.com', password: 'admin123' }, IP_DEMO);
  ok('관리자 비밀번호가 실제로 변경되지 않음', !!stillAdmin.json?.token);
}

console.log('\n═══════ 7단계: 토큰 위변조 ═══════');
const forged = [
  { n: '변조된 서명 JWT', t: token.slice(0, -6) + 'AAAAAA' },
  { n: 'alg:none 위조 토큰', t: Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ id: 'u-admin', hospitalId: 'h-demo', role: 'admin' })).toString('base64url') + '.' },
  { n: '빈 토큰', t: ' ' },
  { n: '랜덤 문자열', t: 'abcdefg' },
];
for (const b of forged) {
  const r = await api(b.t, 'GET', '/api/protected/patients');
  ok(`${b.n} → 401/403 차단`, r.status === 401 || r.status === 403, `status=${r.status}`);
}

console.log('\n═══════ 8단계: 로그인 레이트리밋의 실제 병원 부작용 ═══════');
const SHARED_IP = '203.0.113.200';
// 직원 한 명이 비번 5번 틀림
for (let i = 0; i < 5; i++) {
  await api(null, 'POST', '/api/auth/login', { email: 'desk2@seoulbd.com', password: 'wrong' + i }, SHARED_IP);
}
// 같은 병원 다른 직원(정상 비번)이 같은 공용 IP로 로그인 시도
const victim = await api(null, 'POST', '/api/auth/login', { email: 'admin@seoulbd.com', password: 'admin123' }, SHARED_IP);
if (victim.status === 429 || String(victim.json?.error || '').includes('너무 많습니다')) {
  warn(`공용 IP 레이트리밋 부작용 확인: 직원 A의 비번 오타 5회로 → 정상 계정(원장)까지 로그인 차단됨. 응답: ${JSON.stringify(victim.json).slice(0, 120)}`);
  ok('[정보] 레이트리밋은 동작함 (보안상 정상, UX상 리스크)', true);
} else {
  ok('공용 IP에서 타 계정 정상 로그인 (계정 단위 격리됨)', !!victim.json?.token, `status=${victim.status}`);
}

console.log(`\n\n═══════ 실사용 시뮬레이션 결과: ✅ ${pass} / ❌ ${fail} ═══════`);
if (issues.length) { console.log(`\n❌ 실패 (${issues.length}건):`); issues.forEach(i => console.log(' - ' + i)); }
if (notes.length) { console.log(`\n⚠️  검토 필요 (${notes.length}건):`); notes.forEach(i => console.log(' - ' + i)); }
process.exit(fail > 0 ? 1 : 0);
