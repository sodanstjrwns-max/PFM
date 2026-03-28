import type { AppType } from './types'
import { verifyJWT } from './crypto'

/* ═══ Auth Middleware ═══ */
export function authMiddleware(app: AppType) {
  app.use('/api/protected/*', async (c, next) => {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) return c.json({ error: '인증이 필요합니다' }, 401)
    const secret = c.env.JWT_SECRET || 'pfm-secret-key-change-in-production'
    const payload = await verifyJWT(auth.slice(7), secret)
    if (!payload) return c.json({ error: '토큰이 만료되었거나 유효하지 않습니다' }, 401)
    c.set('user', payload as any)
    await next()
  })
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

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  // Clean old entries periodically
  if (loginAttempts.size > 10000) {
    for (const [key, val] of loginAttempts) {
      if (now - val.firstAttempt > 900000) loginAttempts.delete(key) // 15분 지난 것 정리
    }
  }

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
}

export function sanitizeNumber(val: any, defaultVal = 0, min?: number, max?: number): number {
  const n = Number(val)
  if (isNaN(n)) return defaultVal
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}
