import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Bindings, Variables } from '../lib/types'
import { hashPassword, verifyPassword, signJWT, verifyJWT } from '../lib/crypto'
import { checkRateLimitD1, recordLoginFailureD1, clearLoginAttemptsD1, validateEmail, validateRequired, sanitizeString, getJwtSecret } from '../lib/middleware'
import { writeAudit } from '../lib/audit'
import { createTrialSubscription } from '../lib/billing'
import { sendEmail, passwordResetEmailHTML } from '../lib/email'

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
  const { hospitalName, email, password, name, phone, hospitalPhone, hospitalAddress, businessNumber, agreeTerms, agreePrivacy } = await c.req.json()
  const missing = validateRequired({ hospitalName, email, password, name }, ['hospitalName', 'email', 'password', 'name'])
  if (missing) return c.json({ error: '모든 필드를 입력해주세요' }, 400)
  // v5.9.1: 약관/개인정보 동의 필수 (개인정보보호법 준수)
  if (!agreeTerms || !agreePrivacy) return c.json({ error: '이용약관과 개인정보 처리방침에 동의해주세요' }, 400)
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
  // v5.9: 신규 병원 = Growth 14일 무료 체험 시작 (fire-and-forget 아님 — 가입 직후 상태 필요)
  await createTrialSubscription(c.env.DB, hid)
  // v5.9.1: 동의 기록 영구 보존 (법적 증빙 — 실패해도 가입은 막지 않음)
  try {
    const consentIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || ''
    const stmt = c.env.DB.prepare('INSERT INTO consent_logs (id, user_id, hospital_id, doc_type, doc_version, ip) VALUES (?,?,?,?,?,?)')
    await c.env.DB.batch([
      stmt.bind(crypto.randomUUID(), uid, hid, 'terms', 'v1-2026-07', consentIp),
      stmt.bind(crypto.randomUUID(), uid, hid, 'privacy', 'v1-2026-07', consentIp),
    ])
  } catch { /* 기록 실패가 가입을 막지는 않음 */ }
  const secret = getJwtSecret(c.env.JWT_SECRET)
  const token = await signJWT({ id: uid, hospitalId: hid, email, name, role: 'admin' }, secret)
  setAuthCookie(c, token)
  return c.json({ token, user: { id: uid, hospitalId: hid, email, name, role: 'admin', position: 'doctor', team: 'clinical', hospitalName, onboardingCompleted: false } })
})

/* ─── Staff Join (invite code) - v2: 다인용 코드 + 취소 상태 체크 ─── */
auth.post('/join', async (c) => {
  // 초대코드 무차별 대입 방지: 로그인과 동일한 IP 레이트리밋 적용
  const joinIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
  const joinRate = await checkRateLimitD1(c.env.DB, joinIp)
  if (!joinRate.allowed) {
    return c.json({ error: `시도가 너무 많습니다. ${joinRate.retryAfter}초 후에 다시 시도해주세요.` }, 429)
  }
  const { invite_code, email, password, name, phone, position, team, work_schedule } = await c.req.json()
  const missing = validateRequired({ invite_code, email, password, name }, ['invite_code', 'email', 'password', 'name'])
  if (missing) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  if (!validateEmail(email)) return c.json({ error: '올바른 이메일 형식이 아닙니다' }, 400)
  if (password.length < 6) return c.json({ error: '비밀번호는 6자 이상이어야 합니다' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(sanitizeString(email, 200)).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다' }, 400)

  const codeUpper = sanitizeString(invite_code, 20).toUpperCase()
  const invite: any = await c.env.DB.prepare('SELECT * FROM staff_invites WHERE invite_code=?').bind(codeUpper).first()
  if (!invite) {
    await recordLoginFailureD1(c.env.DB, joinIp) // 무효 코드 시도도 실패 카운트 (무차별 대입 차단)
    return c.json({ error: '유효하지 않은 초대코드입니다' }, 400)
  }
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
  writeAudit(c.env.DB, { hospitalId: invite.hospital_id, actorId: uid, actorName: name, actorRole: role, action: 'auth.join', targetType: 'invite', targetId: invite.id, summary: `직원 합류: ${name} (${email}, 권한: ${role})`, ip: joinIp, userAgent: (c.req.header('user-agent') || '').slice(0, 300) })
  return c.json({ token, user: { id: uid, hospitalId: invite.hospital_id, email, name, role, hospitalName: hospital?.name } })
})

/* ─── Validate invite code - v2 ─── */
auth.get('/invite/:code', async (c) => {
  // 초대코드 조회도 레이트리밋 (무차별 탐색 방지)
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
  const rate = await checkRateLimitD1(c.env.DB, ip)
  if (!rate.allowed) {
    return c.json({ error: `시도가 너무 많습니다. ${rate.retryAfter}초 후에 다시 시도해주세요.` }, 429)
  }
  const code = c.req.param('code').toUpperCase()
  const invite: any = await c.env.DB.prepare(
    'SELECT si.*, h.name as hospital_name FROM staff_invites si JOIN hospitals h ON si.hospital_id=h.id WHERE si.invite_code=?'
  ).bind(code).first()
  if (!invite) {
    await recordLoginFailureD1(c.env.DB, ip) // 무효 코드 탐색도 카운트
    return c.json({ error: '유효하지 않은 초대코드입니다' }, 404)
  }
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
  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) {
    await recordLoginFailureD1(c.env.DB, ip)
    return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  }
  // 퇴사/비활성 계정 차단 — 비밀번호 검증 이후에 체크 (계정 열거 방지)
  if (row.work_status === 'resigned') return c.json({ error: '퇴사 처리된 계정입니다' }, 401)
  if (row.is_active === 0) return c.json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' }, 401)

  await clearLoginAttemptsD1(c.env.DB, ip)
  const secret = getJwtSecret(c.env.JWT_SECRET)
  const token = await signJWT({ id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role }, secret)
  setAuthCookie(c, token)
  writeAudit(c.env.DB, { hospitalId: row.hospital_id, actorId: row.id, actorName: row.name, actorRole: row.role, action: 'auth.login', summary: `로그인 성공 (${row.email})`, ip, userAgent: (c.req.header('user-agent') || '').slice(0, 300) })
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

/* ═══ v5.10.0 비밀번호 재설정 (이메일 기반 셀프 재설정) ═══
 * 보안 설계:
 *  - 토큰 원문은 이메일로만 전달, DB에는 SHA-256 해시만 저장
 *  - 30분 만료 + 1회용 (used_at 기록)
 *  - 이메일 존재 여부를 응답으로 누설하지 않음 (계정 열거 방지)
 *  - IP 레이트리밋 (로그인과 동일 인프라 재사용)
 *  - RESEND_API_KEY 미설정 시 안내 메시지로 폴백 (지원팀 메일 안내)
 */
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

auth.post('/forgot-password', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
  const rate = await checkRateLimitD1(c.env.DB, ip)
  if (!rate.allowed) return c.json({ error: `시도가 너무 많습니다. ${rate.retryAfter}초 후에 다시 시도해주세요.` }, 429)

  const { email } = await c.req.json()
  if (!email || !validateEmail(email)) return c.json({ error: '올바른 이메일을 입력해주세요' }, 400)

  // 이메일 발송 인프라 자체가 없으면 명확히 안내 (설정 전 임시)
  if (!c.env.RESEND_API_KEY) {
    return c.json({ error: '자동 재설정이 아직 준비되지 않았습니다. contact@patientfunnel.kr 로 가입 이메일·병원명을 보내주시면 1영업일 내 처리해드립니다.' }, 503)
  }

  const user: any = await c.env.DB.prepare('SELECT id, name, email, hospital_id FROM users WHERE email=? AND is_active=1').bind(sanitizeString(email, 200)).first()
  // 계정 존재 여부와 무관하게 동일 응답 (열거 방지)
  const genericOk = { success: true, message: '해당 이메일로 가입된 계정이 있다면 재설정 링크를 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.' }
  if (!user) return c.json(genericOk)

  // 토큰 생성: 32바이트 CSPRNG → hex 64자
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = [...tokenBytes].map(b => b.toString(16).padStart(2, '0')).join('')
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  // 기존 미사용 토큰 무효화 (최신 1개만 유효)
  await c.env.DB.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND used_at IS NULL").bind(user.id).run()
  await c.env.DB.prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt).run()

  const origin = new URL(c.req.url).origin
  const resetUrl = `${origin}/?reset=${token}`
  const sent = await sendEmail(c.env, user.email, '[Patient Funnel] 비밀번호 재설정', passwordResetEmailHTML(user.name || '', resetUrl))
  if (!sent.ok) {
    console.error('[forgot-password] email send failed:', sent.reason)
    return c.json({ error: '메일 발송에 실패했습니다. 잠시 후 다시 시도하거나 contact@patientfunnel.kr 로 문의해주세요.' }, 502)
  }
  writeAudit(c.env.DB, { hospitalId: user.hospital_id || '-', actorId: user.id, actorName: user.name || '', action: 'auth.password_reset_request' as any, targetType: 'user', targetId: user.id, summary: '비밀번호 재설정 메일 발송', metadata: { ip } }).catch(() => {})
  return c.json(genericOk)
})

auth.post('/reset-password', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
  const rate = await checkRateLimitD1(c.env.DB, ip)
  if (!rate.allowed) return c.json({ error: `시도가 너무 많습니다. ${rate.retryAfter}초 후에 다시 시도해주세요.` }, 429)

  const { token, newPassword } = await c.req.json()
  if (!token || typeof token !== 'string' || token.length !== 64) return c.json({ error: '재설정 링크가 올바르지 않습니다' }, 400)
  if (!newPassword || newPassword.length < 6) return c.json({ error: '새 비밀번호는 6자 이상이어야 합니다' }, 400)

  const tokenHash = await sha256Hex(token)
  const row: any = await c.env.DB.prepare(
    "SELECT id, user_id FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at > datetime('now')"
  ).bind(tokenHash).first()
  if (!row) {
    await recordLoginFailureD1(c.env.DB, ip) // 무차별 토큰 대입 차단
    return c.json({ error: '링크가 만료되었거나 이미 사용되었습니다. 재설정을 다시 요청해주세요.' }, 400)
  }

  const hash = await hashPassword(newPassword)
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(hash, row.user_id),
    c.env.DB.prepare('UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id),
  ])
  const u: any = await c.env.DB.prepare('SELECT hospital_id, name FROM users WHERE id=?').bind(row.user_id).first()
  writeAudit(c.env.DB, { hospitalId: u?.hospital_id || '-', actorId: row.user_id, actorName: u?.name || '', action: 'auth.password_reset_complete' as any, targetType: 'user', targetId: row.user_id, summary: '비밀번호 재설정 완료', metadata: { ip } }).catch(() => {})
  return c.json({ success: true, message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' })
})

export default auth
