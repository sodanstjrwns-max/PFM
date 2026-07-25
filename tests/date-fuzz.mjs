#!/usr/bin/env node
/**
 * date-fuzz.mjs — 날짜 입력 퍼징 (v5.12)
 *
 * 배경: v5.11 실사용 시뮬레이션에서 잘못된 날짜 문자열이
 *   new Date(x + 'T00:00:00').getDay() → NaN → array[NaN] → undefined
 *   → D1 bind() → D1_TYPE_ERROR → HTTP 500
 * 으로 이어져 27건의 500 에러가 발생했다.
 *
 * 이 스크립트는 날짜를 받는 모든 엔드포인트에 비정상 값을 던져
 * 500(서버 크래시)이 하나도 없는지 검증한다. 400/422는 정상(방어 성공).
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000'
import { suiteIP, resetRateLimits } from './_helpers.mjs'
const IP = suiteIP('date-fuzz')

/* 이 스위트는 로그인 실패를 내지 않으므로 잔여 잠금 기록의 "피해자"다.
 * 앞서 돌린 레이트리밋 스위트가 남긴 기록 때문에 사전 로그인이 429로 막히면
 * 날짜 검증과 무관한 실패가 무더기로 뜬다. → 시작 전 자기방어 청소.
 * (로컬 wrangler는 CF-Connecting-IP를 덮어써서 IP 분리가 통하지 않는다) */
resetRateLimits()

const BAD_DATES = [
  'NOT-A-DATE',
  '2026-13-45',
  'null',
  'undefined',
  '0000-00-00',
  '9999-99-99',
  '2026/07/24',
  '2026-02-31',
  '',
  '   ',
  '2026-7-4',
  '<script>alert(1)</script>',
]

let pass = 0, fail = 0
const failures = []

function log(ok, label, detail = '') {
  if (ok) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`) }
  else { fail++; failures.push(`${label} ${detail}`); console.log(`  ❌ ${label} — ${detail}`) }
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': IP }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch { /* non-json */ }
  return { status: res.status, json }
}

async function main() {
  console.log('═══ 날짜 퍼징 (v5.12) ═══\n')

  // 1) 신규 병원 등록
  const stamp = Date.now()
  const email = `fuzz-${stamp}@example.com`
  const reg = await req('POST', '/api/auth/register', {
    body: {
      hospitalName: `퍼징치과${stamp}`, email, password: 'fuzz1234',
      name: '퍼징원장', phone: '010-0000-0000',
      agreeTerms: true, agreePrivacy: true,
    },
  })
  if (reg.status !== 200 || !reg.json?.token) {
    console.error('가입 실패 — 퍼징 중단:', reg.status, JSON.stringify(reg.json))
    process.exit(1)
  }
  const token = reg.json.token
  console.log(`가입 완료: ${email}\n`)

  // 2) 날짜를 body로 받는 POST 엔드포인트
  const postTargets = [
    { label: 'POST /kpi/daily', path: '/api/protected/kpi/daily',
      body: (d) => ({ record_date: d, new_patients: 5, revenue: 1000000 }) },
    { label: 'POST /kpi/bulk-import', path: '/api/protected/kpi/bulk-import',
      body: (d) => ({ daily_records: [{ record_date: d, new_patients: 1, revenue: 100 }] }) },
    { label: 'POST /leave/requests', path: '/api/protected/leave/requests',
      body: (d) => ({ start_date: d, end_date: d, leave_type: 'annual', reason: '퍼징' }) },
    { label: 'POST /consult-records', path: '/api/protected/consult-records',
      body: (d) => ({ record_date: d, patient_name: '퍼징환자', planned_amount: 100, agreed_amount: 50 }) },
  ]

  console.log('── POST 엔드포인트 ──')
  for (const t of postTargets) {
    for (const d of BAD_DATES) {
      const r = await req('POST', t.path, { token, body: t.body(d) })
      log(r.status < 500, `${t.label} [${JSON.stringify(d)}]`, `→ ${r.status}`)
    }
  }

  // 3) 날짜를 쿼리로 받는 GET 엔드포인트
  const getTargets = [
    { label: 'GET /briefing?date', path: (d) => `/api/protected/briefing?date=${encodeURIComponent(d)}` },
    { label: 'GET /doctors/on-duty', path: (d) => `/api/protected/doctors/on-duty?date=${encodeURIComponent(d)}` },
    { label: 'GET /staff/on-duty', path: (d) => `/api/protected/staff/on-duty?date=${encodeURIComponent(d)}` },
    { label: 'GET /hr/dashboard?date', path: (d) => `/api/protected/hr/dashboard?date=${encodeURIComponent(d)}` },
    { label: 'GET /kpi/weekly', path: (d) => `/api/protected/kpi/weekly?from=${encodeURIComponent(d)}&to=${encodeURIComponent(d)}` },
    { label: 'GET /kpi/dashboard', path: (d) => `/api/protected/kpi/dashboard?month=${encodeURIComponent(d)}` },
  ]

  console.log('\n── GET 엔드포인트 ──')
  for (const t of getTargets) {
    for (const d of BAD_DATES) {
      const r = await req('GET', t.path(d), { token })
      log(r.status < 500, `${t.label} [${JSON.stringify(d)}]`, `→ ${r.status}`)
    }
  }

  // 4) 정상 날짜는 여전히 통과해야 함 (과잉 차단 회귀 방지)
  console.log('\n── 정상 날짜 회귀 확인 ──')
  const good = new Date().toISOString().slice(0, 10)
  const goodMonth = good.slice(0, 7)
  const okChecks = [
    ['POST /kpi/daily', await req('POST', '/api/protected/kpi/daily', { token, body: { record_date: good, new_patients: 3, revenue: 500000 } })],
    ['GET /briefing', await req('GET', `/api/protected/briefing?date=${good}`, { token })],
    ['GET /doctors/on-duty', await req('GET', `/api/protected/doctors/on-duty?date=${good}`, { token })],
    ['GET /staff/on-duty', await req('GET', `/api/protected/staff/on-duty?date=${good}`, { token })],
    ['GET /hr/dashboard', await req('GET', `/api/protected/hr/dashboard?date=${good}`, { token })],
    ['GET /kpi/weekly', await req('GET', `/api/protected/kpi/weekly?from=${good}&to=${good}`, { token })],
    ['GET /kpi/dashboard', await req('GET', `/api/protected/kpi/dashboard?month=${goodMonth}`, { token })],
  ]
  for (const [label, r] of okChecks) {
    log(r.status === 200, `${label} (정상값)`, `→ ${r.status}`)
  }

  // 5) 깨진 JSON body → 400 이어야 함 (500 금지)
  console.log('\n── 깨진 JSON body ──')
  for (const path of ['/api/protected/kpi/daily', '/api/protected/patients', '/api/protected/consult-records']) {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Forwarded-For': IP },
      body: '{"broken": ',
    })
    log(res.status < 500, `POST ${path} (깨진 JSON)`, `→ ${res.status}`)
  }

  // 6) 미래 날짜 — 실적은 거부, 계획은 허용 (v5.12.1)
  console.log('\n── 미래 날짜 구분 (실적 vs 계획) ──')
  const future = new Date(Date.now() + 400 * 86400_000).toISOString().slice(0, 10)
  const farFuture = '2099-01-01'
  const futureMonth = future.slice(0, 7)

  // 실적 기록 = 이미 일어난 일 → 미래 거부되어야 함
  for (const d of [future, farFuture]) {
    const r1 = await req('POST', '/api/protected/kpi/daily', { token, body: { record_date: d, revenue_non_insurance: 9000000 } })
    log(r1.status === 400, `KPI 일일실적 미래 거부 [${d}]`, `→ ${r1.status}`)

    const r2 = await req('POST', '/api/protected/consult-records', { token, body: { record_date: d, patient_name: '미래환자', planned_amount: 100 } })
    log(r2.status === 400, `상담기록 미래 거부 [${d}]`, `→ ${r2.status}`)
  }

  // bulk-import: 미래 행은 건너뛰고 정상 행만 반영
  const bulk = await req('POST', '/api/protected/kpi/bulk-import', {
    token,
    body: { daily_records: [{ record_date: good, revenue_non_insurance: 100 }, { record_date: farFuture, revenue_non_insurance: 200 }] },
  })
  log(bulk.status === 200 && bulk.json?.daily_records_imported === 1,
    'bulk-import가 미래 행만 건너뜀', `반영=${bulk.json?.daily_records_imported}, 스킵=${bulk.json?.skipped_invalid_dates}`)

  // 계획성 데이터 = 미래가 정상 → 허용되어야 함
  const leaveFuture = await req('POST', '/api/protected/leave/requests', {
    token, body: { start_date: future, end_date: future, leave_type: 'annual', reason: '미래 휴가 신청' },
  })
  log(leaveFuture.status === 200 || leaveFuture.status === 201,
    '휴가 신청은 미래 허용 (과잉 차단 아님)', `→ ${leaveFuture.status}`)

  const targetFuture = await req('POST', '/api/protected/kpi/targets', {
    token, body: { year_month: futureMonth, target_revenue: 50000000 },
  })
  log(targetFuture.status === 200, 'KPI 목표는 미래 월 허용', `→ ${targetFuture.status}`)

  // 어제/오늘 경계값
  const yesterday = new Date(Date.now() + 9 * 3600_000 - 86400_000).toISOString().slice(0, 10)
  const bYesterday = await req('POST', '/api/protected/kpi/daily', { token, body: { record_date: yesterday, revenue_non_insurance: 1 } })
  log(bYesterday.status === 200, '어제 실적은 정상 입력', `→ ${bYesterday.status}`)

  console.log(`\n═══ 결과: ✅ ${pass} / ❌ ${fail} ═══`)
  if (fail) {
    console.log('\n실패 목록:')
    failures.forEach((f) => console.log('  · ' + f))
  }
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
