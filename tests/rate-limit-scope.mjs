#!/usr/bin/env node
/**
 * rate-limit-scope.mjs — 로그인 레이트리밋 범위 검증 (v5.12)
 *
 * 배경: v5.11까지 레이트리밋 키가 IP 단독이라, 공용 IP를 쓰는 병원에서
 * 직원 1명이 비밀번호를 5번 틀리면 원장·실장까지 5분간 로그인 불가였다.
 *
 * 검증 항목:
 *  1. 오타 낸 본인 계정은 5회 후 잠긴다 (보안 유지)
 *  2. 같은 IP의 다른 정상 계정은 영향 없이 로그인된다 (부작용 제거)
 *  3. 여러 계정을 훑는 스프레이 공격은 IP 상한(30회)에서 여전히 차단된다
 */
import { hardResetRateLimits, resetRateLimits, waitForServer } from './_helpers.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
let pass = 0, fail = 0

/* 이 스위트는 "잠금이 실제로 걸리는지"를 검증하므로 반드시 흔적을 남긴다.
 * 그대로 두면 뒤이어 실행되는 UI 스위트의 로그인이 429로 막혀 앱 버그처럼 보인다.
 *
 * 주의: 잠금 카운터는 D1과 워커 프로세스 메모리 양쪽에 있다.
 * D1만 지우면 메모리 카운터가 살아남아 재실행 시 1번째 시도부터 429가 된다.
 * → 시작 전에는 워커 재시작까지 포함한 완전 초기화가 필요하다. */
if (/localhost|127\.0\.0\.1/.test(BASE)) {
  console.log('… 레이트리밋 완전 초기화 (D1 + 워커 메모리)')
  hardResetRateLimits()
  if (!(await waitForServer())) {
    console.error('❌ 워커 재시작 후 서버가 응답하지 않습니다')
    process.exit(1)
  }
}
/* 비정상 종료(예외·중단) 시에도 최소한 D1은 비워둔다 */
process.on('exit', () => { resetRateLimits() })

function log(ok, label, detail = '') {
  if (ok) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`  ❌ ${label} — ${detail}`) }
}

async function register(ip, email, name) {
  const r = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({
      hospitalName: name, email, password: 'correct1234', name,
      agreeTerms: true, agreePrivacy: true,
    }),
  })
  return r.status
}

async function login(ip, email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ email, password }),
  })
  return r.status
}

async function main() {
  console.log('═══ 로그인 레이트리밋 범위 검증 (v5.12) ═══\n')
  const stamp = Date.now()
  const IP = '198.51.100.' + (Math.floor(Math.random() * 200) + 20) // 병원 공용 IP 가정
  const staff = `staff-${stamp}@clinic.test`   // 비번 오타 내는 직원
  const owner = `owner-${stamp}@clinic.test`   // 같은 IP의 원장

  console.log('── 사전 준비: 같은 IP에서 두 계정 생성 ──')
  log(await register(IP, staff, `직원치과${stamp}`) === 200, '직원 계정 생성')
  log(await register(IP, owner, `원장치과${stamp}`) === 200, '원장 계정 생성')

  console.log('\n── 1. 직원이 비밀번호 5회 오타 ──')
  const codes = []
  for (let i = 0; i < 5; i++) codes.push(await login(IP, staff, 'wrong-pass'))
  console.log(`   응답 코드: ${codes.join(', ')}`)
  const staffLocked = await login(IP, staff, 'correct1234')
  log(staffLocked === 429, '오타 낸 본인 계정은 잠김 (보안 유지)', `→ ${staffLocked}`)

  console.log('\n── 2. 같은 IP의 원장은? (핵심 회귀 검증) ──')
  const ownerStatus = await login(IP, owner, 'correct1234')
  log(ownerStatus === 200, '같은 IP 다른 계정은 정상 로그인 (부작용 제거)', `→ ${ownerStatus}`)

  console.log('\n── 3. 계정 스프레이 공격은 여전히 차단되는가 ──')
  const ATTACK_IP = '198.51.100.' + (Math.floor(Math.random() * 30) + 220)
  let blockedAt = -1
  for (let i = 0; i < 40; i++) {
    const s = await login(ATTACK_IP, `victim${i}-${stamp}@clinic.test`, 'guess')
    if (s === 429) { blockedAt = i + 1; break }
  }
  log(blockedAt > 0 && blockedAt <= 35,
    'IP 상한으로 계정 스프레이 차단', blockedAt > 0 ? `${blockedAt}번째 시도에서 429` : '40회까지 차단 안 됨')

  console.log(`\n═══ 결과: ✅ ${pass} / ❌ ${fail} ═══`)

  /* 뒤처리: 이 스위트는 127.0.0.1의 IP 상한(30회)을 의도적으로 소진시킨다.
   * D1만 지우면 워커 메모리 카운터가 남아 다음 스위트의 로그인이 429로 막힌다.
   * (ui-full-menu-sim의 유령 실패 2건이 정확히 이 원인이었다.)
   * → 워커 재시작까지 포함한 완전 청소로 마무리한다. */
  if (/localhost|127\.0\.0\.1/.test(BASE)) {
    console.log('\n… 뒤처리: 레이트리밋 완전 초기화 (후속 스위트 보호)')
    hardResetRateLimits()
    await waitForServer()
  }
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
