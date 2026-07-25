/**
 * _helpers.mjs — 테스트 스위트 공용 유틸 (v5.12.1)
 *
 * ═══ 배경 ═══
 * 레이트리밋 검증 테스트가 남긴 잠금 기록 때문에 뒤이어 실행되는 UI 스위트의
 * 로그인이 429로 막혀 "앱 버그"처럼 보이는 일이 세 번 반복됐다.
 *
 * ═══ 처음 세운 가설(틀렸음) ═══
 * "스위트마다 다른 X-Forwarded-For를 쓰면 서로 간섭하지 않는다"
 *
 * ═══ 실제 원인 ═══
 * 서버는 IP를 이렇게 읽는다:
 *     CF-Connecting-IP  ||  X-Forwarded-For  ||  'unknown'
 * 그런데 로컬 `wrangler pages dev`는 모든 요청에 CF-Connecting-IP: 127.0.0.1 을
 * 자동 주입한다. 즉 우선순위 앞단이 항상 채워져 있어서 테스트가 보낸
 * X-Forwarded-For는 전부 무시되고, 모든 스위트가 127.0.0.1 하나에 집계된다.
 * (프로덕션에서는 CF-Connecting-IP가 진짜 클라이언트 IP라 정상 동작한다.)
 *
 * ═══ 그래서 실제 격리 전략 ═══
 * 1. IP 격리는 로컬에서 불가능하다 → 포기.
 * 2. 대신 계정 키(`ip|email`)는 이메일이 다르면 분리된다 → 스위트마다
 *    타임스탬프가 박힌 고유 이메일을 쓴다. (suiteEmail)
 * 3. IP 상한(30회) 카운터는 피할 수 없으므로, 로그인 실패를 많이 내는
 *    스위트는 실행 전후로 스스로 청소한다. (resetRateLimits)
 * 4. 잠금 카운터는 D1 + 워커 프로세스 메모리 양쪽에 있다. D1만 지우면
 *    메모리 카운터가 살아남아 다음 실행이 1번째 시도부터 429가 된다.
 *    → 완전 초기화는 워커 재시작까지 해야 한다. (hardResetRateLimits)
 */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function isLocal() {
  const base = process.env.BASE_URL || process.env.BASE || 'http://localhost:3000'
  return /localhost|127\.0\.0\.1/.test(base)
}

/**
 * 스위트별 고유 이메일 접미사.
 * 계정 키는 `ip|email` 이므로 이메일이 다르면 잠금이 서로 번지지 않는다.
 * 로컬에서 IP 분리가 불가능한 상황의 유일하게 유효한 격리 수단이다.
 */
export function suiteEmail(suiteName, label = 'u') {
  const slug = String(suiteName).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)
  return `${slug}-${label}-${Date.now()}-${Math.floor(Math.random() * 9999)}@test.local`
}

/**
 * D1의 레이트리밋 기록 삭제. 워커 메모리 카운터는 남는다.
 * 로그인 실패를 거의 내지 않는 스위트의 사전 청소용.
 */
export function resetRateLimits() {
  if (!isLocal()) return false // 프로덕션 대상 실행 시 원격 DB를 건드리지 않는다
  try {
    execSync(
      'npx wrangler d1 execute pfm-production --local --command="DELETE FROM login_rate_limits"',
      { stdio: 'ignore', cwd: REPO_ROOT }
    )
    return true
  } catch {
    return false
  }
}

/**
 * D1 기록 삭제 + 워커 재시작으로 메모리 카운터까지 완전 초기화.
 * 잠금이 실제로 걸리는지 검증하는 스위트(rate-limit-scope)는 이걸 써야 한다.
 * 재시작 후 서버가 응답할 때까지 대기한다.
 */
export function hardResetRateLimits() {
  if (!isLocal()) return false
  resetRateLimits()
  try {
    execSync('pm2 restart pfm --update-env', { stdio: 'ignore', cwd: REPO_ROOT })
  } catch {
    return false
  }
  return true
}

/** 서버가 응답할 때까지 대기 (재시작 직후 호출) */
export async function waitForServer(timeoutMs = 30000) {
  const base = process.env.BASE_URL || process.env.BASE || 'http://localhost:3000'
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      // 전용 health 엔드포인트가 없으므로 루트 페이지로 생존 확인
      const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) })
      if (r.status === 200) return true
    } catch { /* 아직 안 떴다 */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

/**
 * @deprecated 로컬 wrangler가 CF-Connecting-IP를 덮어써서 효과가 없다.
 * 프로덕션 대상 테스트에서만 의미가 있다. 남겨두는 이유는 호출부 호환.
 */
export function suiteIP(suiteName) {
  let h = 0
  for (const ch of String(suiteName)) h = (h * 31 + ch.charCodeAt(0)) % 60000
  return `198.18.${Math.floor(h / 254) % 254}.${(h % 253) + 1}`
}
