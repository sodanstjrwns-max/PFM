import type { AppType } from './types'
import { getCookie } from 'hono/cookie'
import { verifyJWT } from './crypto'

/* ═══ Query Constants ═══ */
export const QUERY_LIMITS = {
  DEFAULT: 200,    // 기본 목록 조회
  SMALL: 50,       // 소규모 목록 (자동완성, 프리셋 등)
  MEDIUM: 200,     // 중간 목록 (대부분의 CRUD)
  LARGE: 500,      // 대량 목록 (일괄조회, 통계)
  MAX_BULK: 500,   // 벌크 작업 최대
} as const

/* helper: parse pagination from query */
export function parsePagination(c: any, maxLimit: number = QUERY_LIMITS.LARGE): { limit: number; offset: number; page: number } {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || String(QUERY_LIMITS.DEFAULT)) || QUERY_LIMITS.DEFAULT, 1), maxLimit)
  const page = Math.max(parseInt(c.req.query('page') || '1') || 1, 1)
  const offset = parseInt(c.req.query('offset') || '') || (page - 1) * limit
  return { limit, offset: Math.max(offset, 0), page }
}

/* ═══ Security Headers Middleware ═══ */
export function securityHeaders(app: AppType) {
  app.use('*', async (c, next) => {
    await next()
    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY')
    // Prevent MIME sniffing
    c.header('X-Content-Type-Options', 'nosniff')
    // Referrer policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    // Permissions policy (disable unused browser features)
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    // XSS protection (legacy browsers)
    c.header('X-XSS-Protection', '1; mode=block')
    // HSTS (force HTTPS) - only on non-localhost
    const host = c.req.header('Host') || ''
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    // CSP - allow CDN resources used by frontend
    c.header('Content-Security-Policy', [
      "default-src 'self'",
      // v5.6.1: Tailwind 정적화로 'unsafe-eval' 제거
      // v5.7: 모든 인라인 <script> 블록 외부화 완료 → script-src-elem 에서 'unsafe-inline' 제거.
      // v5.8: onclick= 등 인라인 이벤트 핸들러 129곳 → data-act 이벤트 위임으로 전환 완료.
      //   script-src-attr 에서도 'unsafe-inline' 제거 → 인라인 스크립트 실행 경로 전면 차단.
      //   script-src(폴백)에서도 'unsafe-inline' 제거 — 구형 브라우저에서도 동일 차단.
      "script-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com https://unpkg.com",
      "script-src-elem 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com https://unpkg.com",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '))
  })
}

/* ═══ Auth User-State Cache (v5.11 수평확장 최적화) ═══
 * 문제: 보호 API 요청마다 users 단건 조회 1회 → 동시 사용자 수천 명이
 *       3초 폴링을 돌리면 인증 검증만으로 초당 수백 쿼리가 D1에 적중.
 * 해법: isolate 로컬 30초 TTL 캐시. 보안 성질은 유지하되 전파 지연만 허용:
 *   - 퇴사/비활성/강등 반영이 "즉시" → "최대 30초"로 완화 (기존 JWT 7일 박제 대비 여전히 압도적 개선)
 *   - 같은 isolate 내 변경은 invalidateUserAuthCache() 로 즉시 반영
 *   - 비밀번호/토큰 검증과 무관 (상태 필드만 캐시) → 세션 탈취 표면 증가 없음
 */
type LiveUserState = { role: string; is_active: number; work_status: string; hospital_id: string }
const _authCache = new Map<string, { v: LiveUserState; exp: number }>()
const AUTH_CACHE_TTL = 30_000
const AUTH_CACHE_MAX = 10_000

export function invalidateUserAuthCache(userId?: string) {
  if (userId) _authCache.delete(userId)
  else _authCache.clear()
}

async function getLiveUserState(db: D1Database, userId: string): Promise<LiveUserState | null> {
  const now = Date.now()
  const hit = _authCache.get(userId)
  if (hit && hit.exp > now) return hit.v
  const live = await db.prepare(
    'SELECT role, is_active, work_status, hospital_id FROM users WHERE id=?'
  ).bind(userId).first<LiveUserState>()
  if (live) {
    if (_authCache.size >= AUTH_CACHE_MAX) {
      // 만료분 정리 → 그래도 크면 전체 리셋 (isolate 메모리 보호)
      for (const [k, v] of _authCache) { if (v.exp <= now) _authCache.delete(k) }
      if (_authCache.size >= AUTH_CACHE_MAX) _authCache.clear()
    }
    _authCache.set(userId, { v: live, exp: now + AUTH_CACHE_TTL })
  }
  // 음성 결과(미존재 계정)는 캐시하지 않음 — 신규 가입 직후 레이스 방지
  return live || null
}

/* ═══ Subscription Gate Cache (v5.11) ═══
 * 체험 만료 게이트가 요청마다 subscriptions 조회 → 병원 단위 60초 캐시.
 * 결제/해지 직후엔 invalidateSubscriptionCache() 로 즉시 반영.
 */
const _subGateCache = new Map<string, { locked: boolean; exp: number }>()
const SUB_GATE_TTL = 60_000

export function invalidateSubscriptionCache(hospitalId?: string) {
  if (hospitalId) _subGateCache.delete(hospitalId)
  else _subGateCache.clear()
}

/* ═══ Auth Middleware (v5.7: httpOnly 쿠키 우선 + Bearer 폴백) ═══ */
export function authMiddleware(app: AppType) {
  app.use('/api/protected/*', async (c, next) => {
    // 1) httpOnly 쿠키 우선 (XSS 안전) → 2) Bearer 헤더 폴백 (전환기 호환 + API 클라이언트)
    let token = getCookie(c, 'pfm_auth') || ''
    if (!token) {
      const auth = c.req.header('Authorization')
      if (auth?.startsWith('Bearer ')) token = auth.slice(7)
    }
    if (!token) return c.json({ error: '인증이 필요합니다' }, 401)
    const secret = getJwtSecret(c.env.JWT_SECRET)
    const payload = await verifyJWT(token, secret)
    if (!payload) return c.json({ error: '토큰이 만료되었거나 유효하지 않습니다' }, 401)
    // 🔒 토큰 role 박제 방지: DB 현재 상태 확인 (v5.11: 30초 캐시로 D1 부하 절감)
    //    (퇴사/비활성 직원의 발급済 토큰 7일 유효 문제 + 강등된 관리자가 admin 권한 유지하는 문제 차단)
    const live = await getLiveUserState(c.env.DB, (payload as any).id)
    if (!live) return c.json({ error: '존재하지 않는 계정입니다' }, 401)
    if (live.is_active === 0 || live.work_status === 'resigned') {
      return c.json({ error: '비활성화되었거나 퇴사 처리된 계정입니다' }, 401)
    }
    if (live.hospital_id !== (payload as any).hospitalId) {
      return c.json({ error: '토큰 정보가 일치하지 않습니다' }, 401)
    }
    // role은 항상 DB 최신값 사용 (토큰 발급 후 승격/강등 즉시 반영)
    ;(payload as any).role = live.role
    c.set('user', payload as any)

    // ═══ v5.10 체험 만료 게이트 (v5.11: 병원 단위 60초 캐시) ═══
    // 결제 인프라(TOSS_SECRET_KEY)가 준비된 경우에만 활성 — 준비 전엔 아무도 잠기지 않음.
    // 만료 + 3일 유예 후: 결제/구독/에러리포팅 경로만 허용, 나머지는 402.
    if (c.env.TOSS_SECRET_KEY) {
      const path = new URL(c.req.url).pathname
      const BILLING_ALLOWED = path.startsWith('/api/protected/billing') || path === '/api/protected/admin/errors'
      if (!BILLING_ALLOWED) {
        try {
          const hid = (payload as any).hospitalId as string
          const now = Date.now()
          let locked: boolean
          const cached = _subGateCache.get(hid)
          if (cached && cached.exp > now) {
            locked = cached.locked
          } else {
            const { getSubscription, isTrialLocked } = await import('./billing')
            const sub = await getSubscription(c.env.DB, hid)
            locked = isTrialLocked(sub)
            if (_subGateCache.size > 5000) _subGateCache.clear()
            _subGateCache.set(hid, { locked, exp: now + SUB_GATE_TTL })
          }
          if (locked) {
            return c.json({
              error: '무료 체험이 종료되었습니다. 플랜을 구독하시면 데이터 그대로 바로 이어서 사용할 수 있습니다.',
              reason: 'trial_expired',
            }, 402)
          }
        } catch { /* 게이트 오류가 서비스를 죽이면 안 됨 — 통과 */ }
      }
    }

    await next()
  })
}

/* ═══ JWT Secret Helper (fail-safe for production) ═══ */
export function getJwtSecret(envSecret?: string): string {
  if (envSecret) return envSecret
  // Development fallback only — production MUST set JWT_SECRET via wrangler secret
  console.error('[SECURITY CRITICAL] JWT_SECRET not configured! Set via: wrangler pages secret put JWT_SECRET')
  return 'pfm-dev-only-' + Date.now() // Rotating fallback = tokens expire on restart
}

/* ═══ Permission Helpers ═══ */
export function requireRole(...roles: string[]) {
  return async (c: any, next: any) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: '접근 권한이 없습니다 (필요 권한: ' + roles.join('/') + ')' }, 403)
    }
    await next()
  }
}

/* ═══ Sensitive Data Filter ═══ */
export function filterSensitiveData(data: any, userRole: string): any {
  if (userRole === 'admin' || userRole === 'manager') return data
  if (Array.isArray(data)) return data.map(item => filterSensitiveFields(item))
  return filterSensitiveFields(data)
}

function filterSensitiveFields(item: any): any {
  if (!item) return item
  const masked = { ...item }
  if ('estimated_amount' in masked) masked.estimated_amount = null
  if ('agreed_amount' in masked) masked.agreed_amount = null
  if ('paid_amount' in masked) masked.paid_amount = null
  if ('remaining_amount' in masked) masked.remaining_amount = null
  if ('evaluation_score' in masked) masked.evaluation_score = null
  if ('evaluation_notes' in masked) masked.evaluation_notes = null
  if ('salary' in masked) masked.salary = null
  return masked
}

/* ═══ Rate Limiter (Hybrid: in-memory primary + D1 fallback for distributed) ═══ */
// In-memory handles same-isolate bursts; D1 handles cross-isolate persistence
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>()
const MAX_RATE_LIMIT_ENTRIES = 5000
const RATE_LIMIT_TTL = 600000 // 10분
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 300000 // 5분

function cleanRateLimitMap() {
  if (loginAttempts.size <= MAX_RATE_LIMIT_ENTRIES) return
  const now = Date.now()
  for (const [key, val] of loginAttempts) {
    if (now - val.firstAttempt > RATE_LIMIT_TTL) loginAttempts.delete(key)
  }
  if (loginAttempts.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = [...loginAttempts.entries()].sort((a, b) => a[1].firstAttempt - b[1].firstAttempt)
    const toRemove = entries.slice(0, Math.floor(entries.length / 2))
    for (const [key] of toRemove) loginAttempts.delete(key)
  }
}

export function checkRateLimit(ip: string, db?: any): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  cleanRateLimitMap()
  const entry = loginAttempts.get(ip)

  if (!entry) return { allowed: true }

  // 잠금 상태 확인
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) }
  }

  // 잠금 해제되었으면 초기화
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    loginAttempts.delete(ip)
    return { allowed: true }
  }

  // 15분 창 안에서 체크
  if (now - entry.firstAttempt > 900000) {
    loginAttempts.delete(ip)
    return { allowed: true }
  }

  // 시도 횟수가 한도에 가까우면 사전 차단
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION
    loginAttempts.set(ip, entry)
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_DURATION / 1000) }
  }

  return { allowed: true }
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now()
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 }

  // 15분 창 리셋
  if (now - entry.firstAttempt > 900000) {
    entry.count = 0
    entry.firstAttempt = now
  }

  entry.count++

  // MAX_ATTEMPTS회 실패 → 5분 잠금
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION
  }

  loginAttempts.set(ip, entry)
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

/* ═══ D1 영속 레이트리밋 계층 (v5.5.1) ═══
 * Workers isolate 는 콜로마다 별개 + 수시 재생성 → in-memory Map 만으로는
 * 공격자가 엣지 노드를 옮겨다니며 우회 가능. D1 계층이 cross-isolate 정합성 보장.
 * in-memory 를 1차 필터로 유지해 정상 트래픽엔 D1 쿼리 0회.
 */
export async function checkRateLimitD1(db: D1Database, ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  // 1차: in-memory (같은 isolate 내 즉시 차단, 0 쿼리)
  const mem = checkRateLimit(ip)
  if (!mem.allowed) return mem

  // 2차: D1 영속 계층
  try {
    const row = await db.prepare(
      `SELECT attempt_count, first_attempt_at, locked_until,
              CAST((julianday('now') - julianday(first_attempt_at)) * 86400 AS INTEGER) AS age_sec,
              CASE WHEN locked_until IS NOT NULL
                   THEN CAST((julianday(locked_until) - julianday('now')) * 86400 AS INTEGER)
                   ELSE NULL END AS lock_remaining_sec
       FROM login_rate_limits WHERE ip = ?`
    ).bind(ip).first<any>()

    if (!row) return { allowed: true }

    // 잠금 중
    if (row.lock_remaining_sec !== null && row.lock_remaining_sec > 0) {
      return { allowed: false, retryAfter: row.lock_remaining_sec }
    }
    // 15분 창 만료 → 행 정리 후 통과
    if (row.age_sec > 900) {
      await db.prepare('DELETE FROM login_rate_limits WHERE ip = ?').bind(ip).run()
      return { allowed: true }
    }
    // 한도 도달 → 잠금 설정
    if (row.attempt_count >= MAX_ATTEMPTS) {
      await db.prepare(
        `UPDATE login_rate_limits SET locked_until = datetime('now', '+${Math.floor(LOCKOUT_DURATION / 1000)} seconds') WHERE ip = ?`
      ).bind(ip).run()
      return { allowed: false, retryAfter: Math.ceil(LOCKOUT_DURATION / 1000) }
    }
    return { allowed: true }
  } catch {
    // 테이블 미존재 등 — in-memory 결과로 폴백
    return { allowed: true }
  }
}

export async function recordLoginFailureD1(db: D1Database, ip: string): Promise<void> {
  recordLoginFailure(ip) // in-memory 동시 갱신
  try {
    // UPSERT: 15분 창 만료 시 카운터 리셋, 아니면 증가
    await db.prepare(
      `INSERT INTO login_rate_limits (ip, attempt_count, first_attempt_at)
       VALUES (?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(ip) DO UPDATE SET
         attempt_count = CASE
           WHEN (julianday('now') - julianday(first_attempt_at)) * 86400 > 900 THEN 1
           ELSE attempt_count + 1 END,
         first_attempt_at = CASE
           WHEN (julianday('now') - julianday(first_attempt_at)) * 86400 > 900 THEN CURRENT_TIMESTAMP
           ELSE first_attempt_at END,
         locked_until = CASE
           WHEN (julianday('now') - julianday(first_attempt_at)) * 86400 <= 900
                AND attempt_count + 1 >= ${MAX_ATTEMPTS}
           THEN datetime('now', '+${Math.floor(LOCKOUT_DURATION / 1000)} seconds')
           ELSE locked_until END`
    ).bind(ip).run()
  } catch { /* 마이그레이션 전 — 무시 */ }
}

export async function clearLoginAttemptsD1(db: D1Database, ip: string): Promise<void> {
  clearLoginAttempts(ip)
  try {
    await db.prepare('DELETE FROM login_rate_limits WHERE ip = ?').bind(ip).run()
  } catch { /* 무시 */ }
}

/* ═══ Input Validation Helpers ═══ */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateRequired(fields: Record<string, any>, required: string[]): string | null {
  for (const field of required) {
    if (!fields[field] || (typeof fields[field] === 'string' && fields[field].trim() === '')) {
      return field
    }
  }
  return null
}

export function sanitizeString(str: string, maxLength = 1000): string {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLength)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function sanitizeNumber(val: any, defaultVal = 0, min?: number, max?: number): number {
  const n = Number(val)
  if (isNaN(n)) return defaultVal
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}

/* ═══ Bulk Body Sanitizer ═══ */
type FieldSpec = { type: 'string'; max?: number } | { type: 'number'; min?: number; max?: number; default?: number } | { type: 'boolean' } | { type: 'json' } | { type: 'enum'; values: string[] }

export function sanitizeBody(body: Record<string, any>, schema: Record<string, FieldSpec>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, spec] of Object.entries(schema)) {
    const val = body[key]
    if (val === undefined || val === null) { result[key] = val; continue }
    switch (spec.type) {
      case 'string':
        result[key] = sanitizeString(val, spec.max || 1000)
        break
      case 'number':
        result[key] = sanitizeNumber(val, spec.default ?? 0, spec.min, spec.max)
        break
      case 'boolean':
        result[key] = val === true || val === 1 || val === 'true' || val === '1'
        break
      case 'json':
        result[key] = typeof val === 'object' ? val : null
        break
      case 'enum':
        result[key] = spec.values.includes(String(val)) ? String(val) : null
        break
    }
  }
  return result
}

/* ═══ Safe JSON Body Parser ═══ */
export async function safeJsonParse(c: any): Promise<Record<string, any> | null> {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

/* ═══ Hospital Ownership Verification (IDOR 방지) ═══ */
// 자식 테이블 리소스가 해당 병원 소유인지 검증
export async function verifyOwnership(
  db: any,
  table: string,
  resourceId: string,
  hospitalId: string,
  idColumn = 'id'
): Promise<boolean> {
  const row = await db.prepare(
    `SELECT hospital_id FROM ${table} WHERE ${idColumn}=?`
  ).bind(resourceId).first()
  return row?.hospital_id === hospitalId
}

// 부모 테이블을 통한 간접 소유권 검증 (hospital_id가 없는 레거시 자식 테이블)
export async function verifyOwnershipViaParent(
  db: any,
  parentTable: string,
  parentId: string,
  hospitalId: string
): Promise<boolean> {
  const row = await db.prepare(
    `SELECT hospital_id FROM ${parentTable} WHERE id=?`
  ).bind(parentId).first()
  return row?.hospital_id === hospitalId
}

/* ═══ File Upload Validation ═══ */

/* ═══ API Response Cache (Worker-compatible) ═══ */
// In-memory cache for GET requests (per-isolate, resets on deployment)
// Designed to be swappable with KV for production
const _cache = new Map<string, { data: string; headers: Record<string, string>; exp: number }>()
const MAX_CACHE_ENTRIES = 1000
const CACHE_CLEANUP_THRESHOLD = 800

function cleanCache() {
  if (_cache.size < CACHE_CLEANUP_THRESHOLD) return
  const now = Date.now()
  for (const [key, val] of _cache) {
    if (val.exp < now) _cache.delete(key)
  }
  // If still too big, remove oldest half
  if (_cache.size > MAX_CACHE_ENTRIES) {
    const entries = [..._cache.entries()].sort((a, b) => a[1].exp - b[1].exp)
    entries.slice(0, Math.floor(entries.length / 2)).forEach(([k]) => _cache.delete(k))
  }
}

// Cache TTLs for different endpoint patterns (seconds)
const CACHE_RULES: Array<{ pattern: RegExp; ttl: number }> = [
  // Dashboard/stats - cache 30s (frequently changes)
  { pattern: /\/dashboard$/, ttl: 30 },
  { pattern: /\/briefing$/, ttl: 60 },
  // KPI/stats - cache 60s
  { pattern: /\/kpi\/dashboard/, ttl: 60 },
  { pattern: /\/kpi\/stats/, ttl: 60 },
  { pattern: /\/kpi\/targets\/list/, ttl: 120 },
  { pattern: /\/stats/, ttl: 45 },
  // Funnel analytics - cache 120s
  { pattern: /\/funnel\/analytics/, ttl: 120 },
  { pattern: /\/funnel\/overview/, ttl: 90 },
  // Hospital settings - cache 300s (rarely changes)
  { pattern: /\/hospital\/settings/, ttl: 300 },
  { pattern: /\/hospital\/overview/, ttl: 120 },
  // Categories - cache 300s (rarely changes)
  { pattern: /\/categories\//, ttl: 300 },
  // Gamification ranking - cache 60s
  { pattern: /\/gamification\/ranking/, ttl: 60 },
  // Review dashboard - cache 60s
  { pattern: /\/review-mgmt\/dashboard/, ttl: 60 },
  // Onboarding status - cache 60s
  { pattern: /\/onboarding\/status/, ttl: 60 },
  // Staff presets - cache 120s
  { pattern: /\/staff-presets/, ttl: 120 },
  // Patient stats - cache 45s
  { pattern: /\/patients\/stats/, ttl: 45 },
  // Admin data-gaps - cache 300s
  { pattern: /\/admin\/data-gaps/, ttl: 300 },
]

function getCacheTTL(path: string): number {
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(path)) return rule.ttl
  }
  return 0 // No caching for unmatched routes
}

export function apiCacheMiddleware(app: AppType) {
  app.use('/api/protected/*', async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      // Invalidate cache for this hospital on write operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
        const user = (c as any).get('user')
        if (user?.hospitalId) {
          invalidateCacheForHospital(user.hospitalId)
        }
      }
      await next()
      return
    }

    const ttl = getCacheTTL(c.req.path)
    if (ttl === 0) {
      await next()
      return
    }

    const user = (c as any).get('user')
    const hospitalId = user?.hospitalId || 'anon'
    // 🔒 캐시 키에 role 포함 — 역할별 권한이 다른 엔드포인트(예: /stats)에서
    // admin의 캐시된 200 응답을 staff가 받아가는 권한 우회를 방지
    const role = user?.role || 'anon'
    const cacheKey = `${hospitalId}:${role}:${c.req.path}:${c.req.url.split('?')[1] || ''}`
    
    // Check cache
    const cached = _cache.get(cacheKey)
    if (cached && cached.exp > Date.now()) {
      c.header('X-Cache', 'HIT')
      c.header('Content-Type', 'application/json')
      return c.body(cached.data)
    }

    // Pass through and capture response
    await next()

    // Cache the response
    try {
      const body = await (c.res as any).clone().text()
      if (c.res.status === 200 && body) {
        cleanCache()
        _cache.set(cacheKey, {
          data: body,
          headers: { 'Content-Type': 'application/json' },
          exp: Date.now() + ttl * 1000,
        })
        c.header('X-Cache', 'MISS')
      }
    } catch(e) {
      // Silently fail caching
    }
  })
}

function invalidateCacheForHospital(hospitalId: string) {
  const prefix = hospitalId + ':'
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key)
  }
}

/* ═══ File Upload Validation (below) ═══ */
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}
const ALLOWED_EXTENSIONS = new Set(['jpg','jpeg','png','gif','webp','svg','pdf','doc','docx','xls','xlsx','ppt','pptx','mp4','webm','mov'])
const DANGEROUS_EXTENSIONS = new Set(['exe','bat','cmd','sh','ps1','vbs','js','msi','dll','scr','com','pif','hta','cpl','inf','reg'])

export function validateFile(file: File, maxSizeMB: number = 50): { valid: boolean; error?: string; ext: string; safeType: string } {
  if (!file || !file.name) return { valid: false, error: '파일이 없습니다', ext: '', safeType: '' }
  if (file.size > maxSizeMB * 1024 * 1024) return { valid: false, error: `파일 크기는 ${maxSizeMB}MB 이하여야 합니다`, ext: '', safeType: '' }
  if (file.size === 0) return { valid: false, error: '빈 파일은 업로드할 수 없습니다', ext: '', safeType: '' }
  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (DANGEROUS_EXTENSIONS.has(ext)) return { valid: false, error: '해당 파일 형식은 업로드할 수 없습니다', ext, safeType: '' }
  if (!ALLOWED_EXTENSIONS.has(ext)) return { valid: false, error: `지원하지 않는 파일 형식입니다 (${ext})`, ext, safeType: '' }
  const safeType = ALLOWED_FILE_TYPES.image.includes(file.type) ? 'image'
    : ALLOWED_FILE_TYPES.video.includes(file.type) ? 'video'
    : ALLOWED_FILE_TYPES.document.includes(file.type) ? 'document' : 'other'
  return { valid: true, ext, safeType }
}
