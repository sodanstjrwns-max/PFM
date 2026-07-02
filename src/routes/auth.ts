import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Bindings, Variables } from '../lib/types'
import { hashPassword, verifyPassword, signJWT, verifyJWT } from '../lib/crypto'
import { checkRateLimitD1, recordLoginFailureD1, clearLoginAttemptsD1, validateEmail, validateRequired, sanitizeString, getJwtSecret } from '../lib/middleware'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ v5.7: httpOnly 쿠키 인증 ═══
 * 토큰을 localStorage 대신 httpOnly 쿠키에 저장 → XSS로 탈취 불가.
 * SameSite=Lax로 CSRF 방어 (+ middleware의 Origin 검증).
 * Secure 플래그는 https 요청일 때만 (로컬 http 개발 호환). */
export const AUTH_COOKIE = 'pfm_auth'
const COOKIE_MAX_AGE = 604800 // 7일 — JWT exp와 동일

function setAuthCookie(c: any, token: string) {
  const isHttps = c.req.url.startsWith('https:') || (c.req.header('X-Forwarded-Proto') || '').includes('https')
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

/* ─── Hospital Registration ─── */
auth.post('/register', async (c) => {
  const { hospitalName, email, password, name, phone, hospitalPhone, hospitalAddress, businessNumber } = await c.req.json()
  const missing = validateRequired({ hospitalName, email, password, name }, ['hospitalName', 'email', 'password', 'name'])
  if (missing) return c.json({ error: '모든 필드를 입력해주세요' }, 400)
  if (!validateEmail(email)) return c.json({ error: '올바른 이메일 형식이 아닙니다' }, 400)
  if (password.length < 6) return c.json({ error: '비밀번호는 6자 이상이어야 합니다' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(sanitizeString(email, 200)).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다' }, 400)
  const hid = crypto.randomUUID()
  const uid = crypto.randomUUID()
  const hash = await hashPassword(password)
  await c.env.DB.prepare('INSERT INTO hospitals (id, name, phone, address, business_number) VALUES (?,?,?,?,?)').bind(hid, sanitizeString(hospitalName, 200), sanitizeString(hospitalPhone||'', 20), sanitizeString(hospitalAddress||'', 500), sanitizeString(businessNumber||'', 20)).run()
  const defaultSchedule = JSON.stringify({mon:{start:'09:00',end:'19:00'},tue:{start:'09:00',end:'19:00'},wed:{start:'09:00',end:'19:00'},thu:{start:'09:00',end:'19:00'},fri:{start:'09:00',end:'19:00'},sat:{start:'09:00',end:'14:00'},sun:null})
  const hireDate = new Date().toISOString().slice(0,10)
  await c.env.DB.prepare(
    `INSERT INTO users (id, hospital_id, email, password_hash, name, role, is_doctor, position, team, phone, hire_date, work_schedule) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(uid, hid, sanitizeString(email, 200), hash, sanitizeString(name, 100), 'admin', 1, 'doctor', 'clinical', sanitizeString(phone||'', 20), hireDate, defaultSchedule).run()
  const secret = getJwtSecret(c.env.JWT_SECRET)
  const token = await signJWT({ id: uid, hospitalId: hid, email, name, role: 'admin' }, secret)
  setAuthCookie(c, token)
  return c.json({ token, user: { id: uid, hospitalId: hid, email, name, role: 'admin', position: 'doctor', team: 'clinical', hospitalName, onboardingCompleted: false } })
})

/* ─── Staff Join (invite code) - v2: 다인용 코드 + 취소 상태 체크 ─── */
auth.post('/join', async (c) => {
  const { invite_code, email, password, name, phone, position, team, work_schedule } = await c.req.json()
  const missing = validateRequired({ invite_code, email, password, name }, ['invite_code', 'email', 'password', 'name'])
  if (missing) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  if (!validateEmail(email)) return c.json({ error: '올바른 이메일 형식이 아닙니다' }, 400)
  if (password.length < 6) return c.json({ error: '비밀번호는 6자 이상이어야 합니다' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(sanitizeString(email, 200)).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다' }, 400)

  const codeUpper = sanitizeString(invite_code, 20).toUpperCase()
  const invite: any = await c.env.DB.prepare('SELECT * FROM staff_invites WHERE invite_code=?').bind(codeUpper).first()
  if (!invite) return c.json({ error: '유효하지 않은 초대코드입니다' }, 400)
  if (invite.status === 'revoked') return c.json({ error: '취소된 초대코드입니다' }, 400)
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return c.json({ error: '만료된 초대코드입니다' }, 400)
  const maxUses = invite.max_uses || 1
  const useCount = invite.use_count || 0
  if (useCount >= maxUses) return c.json({ error: '사용 횟수를 모두 소진한 초대코드입니다' }, 400)

  const uid = crypto.randomUUID()
  const hash = await hashPassword(password)
  const pos = sanitizeString(position || invite.position || '', 100)
  const tm = sanitizeString(team || invite.team || '', 100)
  const ws = work_schedule ? JSON.stringify(work_schedule) : '{}'
  const hireDate = new Date().toISOString().slice(0,10)
  await c.env.DB.prepare(
    `INSERT INTO users (id, hospital_id, email, password_hash, name, role, position, team, phone, hire_date, work_schedule) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(uid, invite.hospital_id, sanitizeString(email, 200), hash, sanitizeString(name, 100), invite.role||'staff', pos, tm, sanitizeString(phone||'', 20), hireDate, ws).run()

  // 사용 이력 기록 (다인용 코드 추적용)
  const useId = 'iu-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(
    'INSERT INTO staff_invite_uses (id, invite_id, user_id, hospital_id) VALUES (?,?,?,?)'
  ).bind(useId, invite.id, uid, invite.hospital_id).run()

  // 사용 횟수 증가 + 단일 코드면 used_by 갱신 + 소진 시 status 변경
  const newCount = useCount + 1
  const newStatus = newCount >= maxUses ? 'used_up' : 'active'
  if (maxUses === 1) {
    await c.env.DB.prepare('UPDATE staff_invites SET used_by=?, use_count=?, status=? WHERE id=?').bind(uid, newCount, newStatus, invite.id).run()
  } else {
    await c.env.DB.prepare('UPDATE staff_invites SET use_count=?, status=? WHERE id=?').bind(newCount, newStatus, invite.id).run()
  }

  const hospital: any = await c.env.DB.prepare('SELECT name FROM hospitals WHERE id=?').bind(invite.hospital_id).first()
  const role = invite.role || 'staff'
  const secret = getJwtSecret(c.env.JWT_SECRET)
  const token = await signJWT({ id: uid, hospitalId: invite.hospital_id, email, name, role }, secret)
  setAuthCookie(c, token)
  return c.json({ token, user: { id: uid, hospitalId: invite.hospital_id, email, name, role, hospitalName: hospital?.name } })
})

/* ─── Validate invite code - v2 ─── */
auth.get('/invite/:code', async (c) => {
  const code = c.req.param('code').toUpperCase()
  const invite: any = await c.env.DB.prepare(
    'SELECT si.*, h.name as hospital_name FROM staff_invites si JOIN hospitals h ON si.hospital_id=h.id WHERE si.invite_code=?'
  ).bind(code).first()
  if (!invite) return c.json({ error: '유효하지 않은 초대코드입니다' }, 404)
  if (invite.status === 'revoked') return c.json({ error: '취소된 초대코드입니다' }, 400)
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return c.json({ error: '만료된 초대코드입니다' }, 400)
  const maxUses = invite.max_uses || 1
  const useCount = invite.use_count || 0
  if (useCount >= maxUses) return c.json({ error: '사용 횟수를 모두 소진한 초대코드입니다' }, 400)
  return c.json({
    hospital_name: invite.hospital_name,
    role: invite.role,
    position: invite.position,
    team: invite.team,
    max_uses: maxUses,
    use_count: useCount,
    remaining: maxUses - useCount,
    expires_at: invite.expires_at,
  })
})

/* ─── Login (with rate limiting) ─── */
auth.post('/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
  const rateCheck = await checkRateLimitD1(c.env.DB, ip)
  if (!rateCheck.allowed) {
    return c.json({ error: `로그인 시도가 너무 많습니다. ${rateCheck.retryAfter}초 후에 다시 시도해주세요.` }, 429)
  }

  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: '이메일과 비밀번호를 입력해주세요' }, 400)

  const row: any = await c.env.DB.prepare('SELECT u.*, h.name as hospital_name, h.onboarding_completed FROM users u JOIN hospitals h ON u.hospital_id=h.id WHERE u.email=?').bind(sanitizeString(email, 200)).first()
  if (!row) {
    await recordLoginFailureD1(c.env.DB, ip)
    return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  }
  if (row.work_status === 'resigned') return c.json({ error: '퇴사 처리된 계정입니다' }, 401)
  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) {
    await recordLoginFailureD1(c.env.DB, ip)
    return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  }

  await clearLoginAttemptsD1(c.env.DB, ip)
  const secret = getJwtSecret(c.env.JWT_SECRET)
  const token = await signJWT({ id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role }, secret)
  setAuthCookie(c, token)
  return c.json({ token, user: { id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role, position: row.position, team: row.team, hospitalName: row.hospital_name, onboardingCompleted: !!row.onboarding_completed } })
})

/* ─── Logout — httpOnly 쿠키 제거 (v5.7) ─── */
auth.post('/logout', (c) => {
  deleteCookie(c, AUTH_COOKIE, { path: '/' })
  return c.json({ success: true })
})

/* ─── Cookie Sync — 레거시 localStorage 토큰 → httpOnly 쿠키 전환 (v5.7 마이그레이션) ─── */
auth.post('/cookie-sync', async (c) => {
  const h = c.req.header('Authorization')
  if (!h?.startsWith('Bearer ')) return c.json({ error: '토큰이 필요합니다' }, 401)
  const token = h.slice(7)
  const payload = await verifyJWT(token, getJwtSecret(c.env.JWT_SECRET))
  if (!payload) return c.json({ error: '유효하지 않은 토큰입니다' }, 401)
  setAuthCookie(c, token)
  return c.json({ success: true })
})

export default auth
