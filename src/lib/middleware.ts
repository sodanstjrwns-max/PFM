import type { AppType } from './types'
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
export function parsePagination(c: any, maxLimit = QUERY_LIMITS.LARGE): { limit: number; offset: number; page: number } {
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '))
  })
}

/* ═══ Auth Middleware ═══ */
export function authMiddleware(app: AppType) {
  app.use('/api/protected/*', async (c, next) => {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) return c.json({ error: '인증이 필요합니다' }, 401)
    const secret = getJwtSecret(c.env.JWT_SECRET)
    const payload = await verifyJWT(auth.slice(7), secret)
    if (!payload) return c.json({ error: '토큰이 만료되었거나 유효하지 않습니다' }, 401)
    c.set('user', payload as any)
    await next()
  })
}

/* ═══ JWT Secret Helper (fail-safe for production) ═══ */
export function getJwtSecret(envSecret?: string): string {
  if (envSecret) return envSecret
  // In development, allow fallback; in production this should always be set
  console.warn('[SECURITY] JWT_SECRET not configured! Using dev fallback.')
  return 'pfm-dev-only-secret-key-not-for-production'
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

/* ═══ Rate Limiter (IP-based, in-memory for Workers) ═══ */
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>()
const MAX_RATE_LIMIT_ENTRIES = 5000
const RATE_LIMIT_TTL = 600000 // 10분

function cleanRateLimitMap() {
  if (loginAttempts.size <= MAX_RATE_LIMIT_ENTRIES) return
  const now = Date.now()
  for (const [key, val] of loginAttempts) {
    if (now - val.firstAttempt > RATE_LIMIT_TTL) loginAttempts.delete(key)
  }
  // 그래도 크면 가장 오래된 절반 제거
  if (loginAttempts.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = [...loginAttempts.entries()].sort((a, b) => a[1].firstAttempt - b[1].firstAttempt)
    const toRemove = entries.slice(0, Math.floor(entries.length / 2))
    for (const [key] of toRemove) loginAttempts.delete(key)
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
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

  // 5회 실패 → 5분 잠금
  if (entry.count >= 5) {
    entry.lockedUntil = now + 300000 // 5분
  }

  loginAttempts.set(ip, entry)
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip)
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
