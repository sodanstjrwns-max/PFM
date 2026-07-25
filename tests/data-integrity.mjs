#!/usr/bin/env node
/**
 * data-integrity.mjs — 데이터 무결성 회귀 검증 (v5.12)
 *
 * 실사용 시뮬레이션에서 드러난 "조용히 데이터가 망가지는" 두 가지를 검증한다:
 *  1. KPI 부분 수정 — 신규환자만 고치려다 그날 매출이 0으로 날아가던 문제
 *  2. 환자 등록 연타 — 동일 차트번호 환자가 여러 건 생기던 문제
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const IP = '192.0.2.' + (Math.floor(Math.random() * 200) + 20)
let pass = 0, fail = 0

function log(ok, label, detail = '') {
  if (ok) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`  ❌ ${label} — ${detail}`) }
}

let TOKEN = ''
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': IP,
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

async function main() {
  console.log('═══ 데이터 무결성 검증 (v5.12) ═══\n')
  const stamp = Date.now()
  const reg = await api('POST', '/api/auth/register', {
    hospitalName: `무결성치과${stamp}`, email: `integrity-${stamp}@test.kr`,
    password: 'test1234', name: '검증원장', agreeTerms: true, agreePrivacy: true,
  })
  if (reg.status !== 200) { console.error('가입 실패:', reg.status, reg.json); process.exit(1) }
  TOKEN = reg.json.token

  // ── 1. KPI 부분 수정 시맨틱 ──
  console.log('── 1. KPI 부분 수정 (PATCH 시맨틱) ──')
  const day = '2026-03-16'
  const create = await api('POST', '/api/protected/kpi/daily', {
    record_date: day, new_patients: 12, revenue_non_insurance: 8500000,
    inbound_calls: 40, notes: '원본 기록',
  })
  log(create.status === 200, '최초 KPI 입력', `→ ${create.status}`)

  // 신규환자 숫자만 수정 — 나머지는 아예 전송하지 않는다
  const patch = await api('POST', '/api/protected/kpi/daily', {
    record_date: day, new_patients: 15,
  })
  log(patch.status === 200, '신규환자만 부분 수정', `→ ${patch.status}`)

  const after = await api('GET', `/api/protected/kpi/daily?date=${day}`)
  const rec = after.json || {}
  log(rec.new_patients === 15, '수정한 필드는 반영됨', `new_patients=${rec.new_patients}`)
  log(rec.revenue_non_insurance === 8500000,
    '미전송 매출이 0으로 날아가지 않음', `revenue=${rec.revenue_non_insurance}`)
  log(rec.inbound_calls === 40, '미전송 인바운드콜 보존', `inbound_calls=${rec.inbound_calls}`)
  log(rec.notes === '원본 기록', '미전송 메모 보존', `notes="${rec.notes}"`)

  // 명시적으로 0을 보내면 0이 되어야 한다 (과잉 보호 방지)
  await api('POST', '/api/protected/kpi/daily', { record_date: day, inbound_calls: 0 })
  const zeroed = await api('GET', `/api/protected/kpi/daily?date=${day}`)
  log(zeroed.json?.inbound_calls === 0, '명시적 0은 정상 반영 (과잉 보호 아님)', `inbound_calls=${zeroed.json?.inbound_calls}`)

  // ── 2. 환자 등록 중복 방지 ──
  console.log('\n── 2. 환자 등록 연타 (차트번호 중복) ──')
  const chart = `C-${stamp}`
  const payload = { chart_number: chart, patient_name: '김중복', phone: '010-1111-2222' }

  const first = await api('POST', '/api/protected/patients', payload)
  log(first.status === 200, '최초 환자 등록', `→ ${first.status}`)

  // 연타 시뮬레이션: 동시 5회 전송
  const burst = await Promise.all(Array.from({ length: 5 }, () => api('POST', '/api/protected/patients', payload)))
  const created = burst.filter(r => r.status === 200).length
  const rejected = burst.filter(r => r.status === 409).length
  log(created === 0, '연타 5회가 추가 등록되지 않음', `추가생성=${created}, 409차단=${rejected}`)
  log(burst.every(r => r.status < 500), '중복 시도가 500으로 터지지 않음',
    `상태=${[...new Set(burst.map(r => r.status))].join(',')}`)

  const list = await api('GET', `/api/protected/patients?search=${encodeURIComponent(chart)}`)
  const rows = Array.isArray(list.json) ? list.json : (list.json?.results || list.json?.patients || [])
  const dupCount = rows.filter((p) => p.chart_number === chart).length
  log(dupCount === 1, 'DB에 차트번호가 정확히 1건', `실제=${dupCount}건`)

  // 차트번호 없는 환자는 여러 명 등록 가능해야 한다 (부분 인덱스 확인)
  const noChart1 = await api('POST', '/api/protected/patients', { patient_name: '무차트A' })
  const noChart2 = await api('POST', '/api/protected/patients', { patient_name: '무차트B' })
  log(noChart1.status === 200 && noChart2.status === 200,
    '차트번호 없는 환자는 복수 등록 가능', `→ ${noChart1.status}, ${noChart2.status}`)

  console.log(`\n═══ 결과: ✅ ${pass} / ❌ ${fail} ═══`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
