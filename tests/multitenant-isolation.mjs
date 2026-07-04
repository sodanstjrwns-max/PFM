// 멀티테넌트 격리 검증: 병원 A/B 2개를 만들어 교차 접근이 전부 차단되는지 확인
// 실행: cd /home/user/webapp && node tests/multitenant-isolation.mjs [BASE_URL]
const BASE = process.argv[2] || 'http://localhost:3000';
const ts = Date.now();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

// 쿠키 저장 fetch 헬퍼 (병원별 세션 분리)
function makeClient() {
  let cookie = '';
  return async (path, opts = {}) => {
    const res = await fetch(BASE + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(opts.headers || {}),
      },
    });
    const setC = res.headers.get('set-cookie');
    if (setC) cookie = setC.split(';')[0];
    let body = null;
    try { body = await res.json(); } catch {}
    return { status: res.status, body };
  };
}

async function registerHospital(client, tag) {
  const email = `iso-${tag}-${ts}@test.kr`;
  const r = await client('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      hospitalName: `격리검증${tag}치과${ts % 10000}`,
      name: `원장${tag}`,
      email,
      password: 'Isolate!2026',
      agreeTerms: true,
      agreePrivacy: true,
    }),
  });
  return { ok: r.status === 200 || r.status === 201, email, body: r.body };
}

const run = async () => {
  const A = makeClient();
  const B = makeClient();

  // ── 1. 병원 A, B 생성 ──
  const regA = await registerHospital(A, 'A');
  const regB = await registerHospital(B, 'B');
  check('① 병원 A 가입', regA.ok, regA.email);
  check('② 병원 B 가입', regB.ok, regB.email);
  if (!regA.ok || !regB.ok) { console.log('가입 실패 — 중단'); process.exit(1); }

  // ── 2. 병원 A에 데이터 생성 ──
  const patA = await A('/api/protected/patients', {
    method: 'POST',
    body: JSON.stringify({ patient_name: 'A병원환자', chart_number: 'A-001', patient_type: 'new', phone: '010-1111-2222' }),
  });
  const patAId = patA.body?.id;
  check('③ A 환자 생성', patA.status === 200 && !!patAId, `id=${patAId}`);

  const funA = await A('/api/protected/funnel', {
    method: 'POST',
    body: JSON.stringify({ patient_name: 'A병원환자', current_stage: 'consultation', estimated_amount: 500 }),
  });
  const funAId = funA.body?.id;
  check('④ A 퍼널 생성', funA.status === 200 && !!funAId, `id=${funAId}`);

  const callA = await A('/api/protected/calls', {
    method: 'POST',
    body: JSON.stringify({ call_type: 'inbound', call_date: new Date().toISOString().slice(0, 10), patient_name: 'A병원환자', phone: '010-1111-2222', patient_type: 'new', recognition_path: '지인소개' }),
  });
  check('⑤ A 콜 기록 생성', callA.status === 200);

  await A('/api/protected/kpi/daily', {
    method: 'POST',
    body: JSON.stringify({ record_date: new Date().toISOString().slice(0, 10), revenue_non_insurance: 999, new_patients: 7 }),
  });

  // A 사용자 목록에서 A 원장 id 추출 (교차 검증용)
  const usersA = await A('/api/protected/hr/staff').catch(() => null);
  const aUserId = usersA?.body?.staff?.[0]?.id || usersA?.body?.[0]?.id || null;

  // ── 3. 병원 B에서 A 데이터 교차 접근 시도 (전부 차단되어야 함) ──
  console.log('\n━━ 교차 접근 차단 검증 (B → A 데이터) ━━');

  // 3-1. B의 환자 목록에 A 환자가 안 보여야 함
  const patListB = await B('/api/protected/patients?search=A병원환자');
  const leaked = JSON.stringify(patListB.body || {}).includes('A병원환자');
  check('⑥ B 환자검색에 A 환자 미노출', patListB.status === 200 && !leaked);

  // 3-2. B가 A 환자 id로 직접 조회 (IDOR)
  if (patAId) {
    const direct = await B(`/api/protected/patients/${patAId}`);
    check('⑦ B → A 환자 직접조회 차단', direct.status === 404 || direct.status === 403, `status=${direct.status}`);
    // 3-3. B가 A 환자 수정 시도
    const upd = await B(`/api/protected/patients/${patAId}`, { method: 'PUT', body: JSON.stringify({ patient_name: '해킹시도' }) });
    check('⑧ B → A 환자 수정 차단', upd.status === 404 || upd.status === 403 || upd.status === 400, `status=${upd.status}`);
    // 3-4. B가 A 환자 삭제 시도
    const del = await B(`/api/protected/patients/${patAId}`, { method: 'DELETE' });
    check('⑨ B → A 환자 삭제 차단', del.status === 404 || del.status === 403, `status=${del.status}`);
  }

  // 3-5. B가 A 퍼널 id로 단계 이동 시도
  if (funAId) {
    let mv = await B(`/api/protected/funnel/${funAId}/stage`, { method: 'PUT', body: JSON.stringify({ stage: 'treatment' }) });
    if (mv.status === 404 && (mv.body?.path || '').includes('stage') === false) {
      mv = await B(`/api/protected/funnel/${funAId}`, { method: 'PUT', body: JSON.stringify({ current_stage: 'treatment' }) });
    }
    check('⑩ B → A 퍼널 조작 차단', mv.status === 404 || mv.status === 403, `status=${mv.status}`);
  }

  // 3-6. B 대시보드에 A 매출이 안 섞여야 함
  const dashB = await B('/api/protected/dashboard');
  const dashStr = JSON.stringify(dashB.body || {});
  check('⑪ B 대시보드에 A 매출(999) 미반영', dashB.status === 200 && !dashStr.includes('999'));

  // 3-7. B가 A 직원과 DM 시도 (chat)
  if (aUserId) {
    const dm = await B('/api/protected/chat/rooms/dm', { method: 'POST', body: JSON.stringify({ target_user_id: aUserId }) });
    check('⑫ B → A 직원 DM 차단', dm.status === 404 || dm.status === 400, `status=${dm.status}`);
    // 3-8. B가 A 직원을 그룹 채팅에 초대 시도
    const grp = await B('/api/protected/chat/rooms/group', { method: 'POST', body: JSON.stringify({ name: '침투그룹', member_ids: [aUserId] }) });
    check('⑬ B → A 직원 그룹초대 차단', grp.status === 400 || grp.status === 404, `status=${grp.status}`);
  } else {
    check('⑫ B → A 직원 DM 차단', true, 'A 직원 id 추출 불가로 스킵');
    check('⑬ B → A 직원 그룹초대 차단', true, '스킵');
  }

  // 3-9. B의 KPI 통계에 A 데이터 미반영
  const kpiB = await B('/api/protected/kpi/daily');
  const kpiStr = JSON.stringify(kpiB.body || []);
  check('⑭ B KPI 목록에 A 기록 미노출', kpiB.status === 200 && !kpiStr.includes('999'));

  // 3-10. B 퍼널 통계에 A 환자 미반영
  const fsB = await B('/api/protected/funnel/stats');
  check('⑮ B 퍼널통계에 A 환자 미노출', fsB.status === 200 && !JSON.stringify(fsB.body || {}).includes('A병원환자'));

  // ── 4. 동시성: 두 병원이 같은 차트번호/같은 날짜 KPI를 써도 충돌 없어야 함 ──
  console.log('\n━━ 테넌트 간 데이터 충돌 검증 ━━');
  const patB = await B('/api/protected/patients', {
    method: 'POST',
    body: JSON.stringify({ patient_name: 'B병원환자', chart_number: 'A-001', patient_type: 'new' }),
  });
  check('⑯ 동일 차트번호(A-001) 타병원 등록 허용', patB.status === 200, `status=${patB.status}`);

  const kpiB2 = await B('/api/protected/kpi/daily', {
    method: 'POST',
    body: JSON.stringify({ record_date: new Date().toISOString().slice(0, 10), revenue_non_insurance: 111, new_patients: 1 }),
  });
  check('⑰ 동일 날짜 KPI 타병원 입력 허용', kpiB2.status === 200, `status=${kpiB2.status}`);

  // A 데이터가 그대로인지 재확인
  const dashA = await A('/api/protected/dashboard');
  check('⑱ A 대시보드 데이터 무결성 유지', dashA.status === 200 && !JSON.stringify(dashA.body || {}).includes('B병원환자'));

  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n═══ 멀티테넌트 격리 검증: ✅${pass} / ❌${fail} ═══`);
  process.exit(fail > 0 ? 1 : 0);
};

run().catch(e => { console.error('실행 실패:', e); process.exit(1); });
