import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { DB: D1Database; R2: R2Bucket }
type Variables = { user?: { id: string; hospitalId: string; email: string; name: string; role: string } }
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/*', cors())

/* ─── Crypto helpers (Web Crypto API only) ─── */
async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
  return saltHex + ':' + hashHex
}
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$pbkdf2$')) return pw === stored.replace('$pbkdf2$', '')
  const [saltHex, hashHex] = stored.split(':')
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  const computed = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === hashHex
}

const JWT_SECRET = 'pfm-secret-key-change-in-production'
function b64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function b64UrlDecodeStr(str: string): string {
  return new TextDecoder().decode(b64UrlDecode(str));
}
async function signJWT(payload: Record<string, unknown>): Promise<string> {
  const header = b64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64UrlEncode(JSON.stringify({ ...payload, exp: Date.now() + 86400000 * 7 }));
  const data = header + '.' + body
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigStr = b64UrlEncode(new Uint8Array(sig));
  return data + '.' + sigStr
}
async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.')
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = b64UrlDecode(sig)
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(header + '.' + body))
    if (!valid) return null
    const payload = JSON.parse(b64UrlDecodeStr(body))
    if (payload.exp && payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

/* ─── Auth Middleware ─── */
app.use('/api/protected/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: '인증이 필요합니다' }, 401)
  const payload = await verifyJWT(auth.slice(7))
  if (!payload) return c.json({ error: '토큰이 만료되었거나 유효하지 않습니다' }, 401)
  c.set('user', payload as any)
  await next()
})

/* ─── Permission Helpers ─── */
// 권한 레벨: admin(원장) > manager(실장) > staff(스태프)
function requireRole(...roles: string[]) {
  return async (c: any, next: any) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: '접근 권한이 없습니다 (필요 권한: ' + roles.join('/') + ')' }, 403)
    }
    await next()
  }
}
// 민감 데이터 필터 (수납금액 등)
function filterSensitiveData(data: any, userRole: string): any {
  if (userRole === 'admin') return data // 원장은 모든 데이터 접근
  if (userRole === 'manager') return data // 실장도 수납금액 열람 가능 (수정 불가)
  // staff: 수납금액 관련 필드 마스킹
  if (Array.isArray(data)) return data.map(item => filterSensitiveFields(item))
  return filterSensitiveFields(data)
}
function filterSensitiveFields(item: any): any {
  if (!item) return item
  const masked = { ...item }
  // 수납금액 관련 필드 마스킹
  if ('estimated_amount' in masked) masked.estimated_amount = null
  if ('agreed_amount' in masked) masked.agreed_amount = null
  if ('paid_amount' in masked) masked.paid_amount = null
  if ('remaining_amount' in masked) masked.remaining_amount = null
  // 직원 평가 관련 마스킹
  if ('evaluation_score' in masked) masked.evaluation_score = null
  if ('evaluation_notes' in masked) masked.evaluation_notes = null
  if ('salary' in masked) masked.salary = null
  return masked
}

/* ─── Auth API ─── */
app.post('/api/auth/register', async (c) => {
  const { hospitalName, email, password, name, phone, hospitalPhone, hospitalAddress } = await c.req.json()
  if (!hospitalName || !email || !password || !name) return c.json({ error: '모든 필드를 입력해주세요' }, 400)
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다' }, 400)
  const hid = crypto.randomUUID()
  const uid = crypto.randomUUID()
  const hash = await hashPassword(password)
  await c.env.DB.prepare('INSERT INTO hospitals (id, name, phone, address) VALUES (?,?,?,?)').bind(hid, hospitalName, hospitalPhone||'', hospitalAddress||'').run()
  // 원장은 자동으로 doctor/clinical + 기본 근무스케줄 설정
  const defaultSchedule = JSON.stringify({mon:{start:'09:00',end:'19:00'},tue:{start:'09:00',end:'19:00'},wed:{start:'09:00',end:'19:00'},thu:{start:'09:00',end:'19:00'},fri:{start:'09:00',end:'19:00'},sat:{start:'09:00',end:'14:00'},sun:null})
  const hireDate = new Date().toISOString().slice(0,10)
  await c.env.DB.prepare(
    `INSERT INTO users (id, hospital_id, email, password_hash, name, role, is_doctor, position, team, phone, hire_date, work_schedule) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(uid, hid, email, hash, name, 'admin', 1, 'doctor', 'clinical', phone||'', hireDate, defaultSchedule).run()
  const token = await signJWT({ id: uid, hospitalId: hid, email, name, role: 'admin' })
  return c.json({ token, user: { id: uid, hospitalId: hid, email, name, role: 'admin', position: 'doctor', team: 'clinical', hospitalName } })
})

/* ─── Staff Join (초대코드로 직원 가입) ─── */
app.post('/api/auth/join', async (c) => {
  const { invite_code, email, password, name, phone, position, team, work_schedule } = await c.req.json()
  if (!invite_code || !email || !password || !name) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다' }, 400)
  const invite: any = await c.env.DB.prepare('SELECT * FROM staff_invites WHERE invite_code=? AND used_by IS NULL').bind(invite_code).first()
  if (!invite) return c.json({ error: '유효하지 않거나 사용된 초대코드입니다' }, 400)
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return c.json({ error: '만료된 초대코드입니다' }, 400)
  const uid = crypto.randomUUID()
  const hash = await hashPassword(password)
  const pos = position || invite.position || ''
  const tm = team || invite.team || ''
  const ws = work_schedule ? JSON.stringify(work_schedule) : '{}'
  const hireDate = new Date().toISOString().slice(0,10)
  await c.env.DB.prepare(
    `INSERT INTO users (id, hospital_id, email, password_hash, name, role, position, team, phone, hire_date, work_schedule) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(uid, invite.hospital_id, email, hash, name, invite.role||'staff', pos, tm, phone||'', hireDate, ws).run()
  await c.env.DB.prepare('UPDATE staff_invites SET used_by=? WHERE id=?').bind(uid, invite.id).run()
  const hospital: any = await c.env.DB.prepare('SELECT name FROM hospitals WHERE id=?').bind(invite.hospital_id).first()
  const role = invite.role || 'staff'
  const token = await signJWT({ id: uid, hospitalId: invite.hospital_id, email, name, role })
  return c.json({ token, user: { id: uid, hospitalId: invite.hospital_id, email, name, role, hospitalName: hospital?.name } })
})

/* ─── Validate invite code ─── */
app.get('/api/auth/invite/:code', async (c) => {
  const code = c.req.param('code')
  const invite: any = await c.env.DB.prepare('SELECT si.*, h.name as hospital_name FROM staff_invites si JOIN hospitals h ON si.hospital_id=h.id WHERE si.invite_code=? AND si.used_by IS NULL').bind(code).first()
  if (!invite) return c.json({ error: '유효하지 않은 초대코드입니다' }, 404)
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return c.json({ error: '만료된 초대코드입니다' }, 400)
  return c.json({ hospital_name: invite.hospital_name, role: invite.role, position: invite.position, team: invite.team })
})

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: '이메일과 비밀번호를 입력해주세요' }, 400)
  const row: any = await c.env.DB.prepare('SELECT u.*, h.name as hospital_name FROM users u JOIN hospitals h ON u.hospital_id=h.id WHERE u.email=?').bind(email).first()
  if (!row) return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  if (row.work_status === 'resigned') return c.json({ error: '퇴사 처리된 계정입니다' }, 401)
  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  const token = await signJWT({ id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role })
  return c.json({ token, user: { id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role, position: row.position, team: row.team, hospitalName: row.hospital_name } })
})

/* ─── HR Dashboard & Staff Management API ─── */

// HR 대시보드 - 전체/팀별 인원현황
app.get('/api/protected/hr/dashboard', async (c) => {
  const user = c.get('user')!
  const today = c.req.query('date') || new Date().toISOString().slice(0,10)
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat']
  const dayOfWeek = dayNames[new Date(today + 'T00:00:00').getDay()]

  // 전체 활성 직원 목록 (with schedule)
  const staffRows = await c.env.DB.prepare(
    `SELECT id, name, role, position, team, work_schedule, is_doctor, hire_date FROM users WHERE hospital_id=? AND is_active=1 AND work_status='active' ORDER BY role DESC, team, name`
  ).bind(user.hospitalId).all()
  const staff = staffRows.results as any[]

  // 오늘 출근 기록
  const attRows = await c.env.DB.prepare(
    `SELECT user_id, status, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?`
  ).bind(user.hospitalId, today).all()
  const attMap: Record<string, any> = {}
  for (const a of attRows.results as any[]) attMap[a.user_id] = a

  // 오늘 휴가 기록
  const leaveRows = await c.env.DB.prepare(
    `SELECT user_id FROM leave_requests WHERE hospital_id=? AND status='approved' AND start_date<=? AND end_date>=?`
  ).bind(user.hospitalId, today, today).all()
  const onLeaveSet = new Set((leaveRows.results as any[]).map((r: any) => r.user_id))

  // 각 직원의 오늘 상태 계산
  const members = staff.map((s: any) => {
    let schedule: any = {}
    try { schedule = JSON.parse(s.work_schedule || '{}') } catch(e) {}
    const todaySchedule = schedule[dayOfWeek] || null
    const isScheduledOff = todaySchedule === null
    const isOnLeave = onLeaveSet.has(s.id) || (attMap[s.id]?.status === 'vacation')
    const att = attMap[s.id]
    const isPresent = att && ['present','late','half_day'].includes(att.status)

    let todayStatus = 'not_yet' // 미출근
    if (isScheduledOff) todayStatus = 'day_off'   // 정기 휴무
    else if (isOnLeave) todayStatus = 'vacation'    // 휴가
    else if (isPresent) todayStatus = att.status     // 출근/지각
    
    return {
      id: s.id, name: s.name, role: s.role, position: s.position, team: s.team,
      is_doctor: s.is_doctor, hire_date: s.hire_date,
      today_status: todayStatus,
      check_in: att?.check_in || null,
      today_schedule: todaySchedule,
    }
  })

  // 팀별 집계
  const teams: Record<string, {total:number, present:number, vacation:number, day_off:number, late:number}> = {}
  let totalAll = 0, presentAll = 0, vacationAll = 0, dayOffAll = 0, lateAll = 0

  for (const m of members) {
    const t = m.team || 'etc'
    if (!teams[t]) teams[t] = {total:0, present:0, vacation:0, day_off:0, late:0}
    teams[t].total++
    totalAll++
    if (m.today_status === 'present' || m.today_status === 'late' || m.today_status === 'half_day') { teams[t].present++; presentAll++ }
    if (m.today_status === 'late') { teams[t].late++; lateAll++ }
    if (m.today_status === 'vacation') { teams[t].vacation++; vacationAll++ }
    if (m.today_status === 'day_off') { teams[t].day_off++; dayOffAll++ }
  }

  return c.json({
    date: today,
    summary: { total: totalAll, present: presentAll, vacation: vacationAll, day_off: dayOffAll, late: lateAll, working: presentAll },
    teams, members
  })
})

// 직원 목록 (상세 정보 포함)
app.get('/api/protected/hr/staff', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT id, name, email, role, position, team, phone, hire_date, work_schedule, work_status, is_doctor, is_active, created_at FROM users WHERE hospital_id=? ORDER BY role DESC, team, name`
  ).bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 내 정보 조회
app.get('/api/protected/me', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.position, u.team, u.phone, u.hire_date, u.work_schedule, u.work_status, u.is_doctor, u.created_at, h.name as hospital_name FROM users u JOIN hospitals h ON u.hospital_id=h.id WHERE u.id=?`
  ).bind(user.id).first()
  if (!row) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)
  let schedule: any = {}
  try { schedule = JSON.parse(row.work_schedule || '{}') } catch(e) {}
  return c.json({ ...row, work_schedule: schedule })
})

// 내 정보 수정 (본인만)
app.put('/api/protected/me', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  // 본인이 수정 가능한 필드 제한 (role, work_status 등은 관리자만)
  const allowed = ['name','phone','work_schedule']
  const fields: string[] = []
  const vals: any[] = []
  for (const k of allowed) {
    if (body[k] !== undefined) {
      const v = k === 'work_schedule' && typeof body[k] === 'object' ? JSON.stringify(body[k]) : body[k]
      fields.push(`${k} = ?`); vals.push(v)
    }
  }
  if (fields.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  fields.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(user.id)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 직원 프로필 업데이트 (관리자 or 본인)
app.put('/api/protected/hr/staff/:id', async (c) => {
  const user = c.get('user')!
  const targetId = c.req.param('id')
  if (user.role !== 'admin' && user.role !== 'manager' && user.id !== targetId) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const body = await c.req.json()
  const fields: string[] = []
  const vals: any[] = []
  for (const k of ['position','team','phone','hire_date','work_schedule','work_status','is_active','role','name']) {
    if (body[k] !== undefined) {
      const v = k === 'work_schedule' && typeof body[k] === 'object' ? JSON.stringify(body[k]) : body[k]
      fields.push(`${k} = ?`); vals.push(v)
    }
  }
  if (fields.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  fields.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(targetId, user.hospitalId)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 초대 코드 생성
app.post('/api/protected/hr/invite', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const { role, position, team } = await c.req.json()
  const id = 'inv-' + crypto.randomUUID().slice(0,8)
  const code = Math.random().toString(36).slice(2,8).toUpperCase()
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000).toISOString()
  await c.env.DB.prepare(
    'INSERT INTO staff_invites (id, hospital_id, invite_code, role, position, team, created_by, expires_at) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, code, role||'staff', position||'', team||'', user.id, expiresAt).run()
  return c.json({ invite_code: code, expires_at: expiresAt })
})

// 초대 코드 목록
app.get('/api/protected/hr/invites', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT si.*, u1.name as created_by_name, u2.name as used_by_name 
     FROM staff_invites si 
     JOIN users u1 ON si.created_by=u1.id 
     LEFT JOIN users u2 ON si.used_by=u2.id 
     WHERE si.hospital_id=? ORDER BY si.created_at DESC`
  ).bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 출퇴근 체크인/체크아웃
app.post('/api/protected/hr/attendance/check', async (c) => {
  const user = c.get('user')!
  const today = new Date().toISOString().slice(0,10)
  const now = new Date().toTimeString().slice(0,5)
  const existing: any = await c.env.DB.prepare(
    'SELECT * FROM attendance WHERE user_id=? AND date=?'
  ).bind(user.id, today).first()
  if (!existing) {
    const id = 'att-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare(
      'INSERT INTO attendance (id, hospital_id, user_id, date, check_in, status) VALUES (?,?,?,?,?,?)'
    ).bind(id, user.hospitalId, user.id, today, now, 'present').run()
    return c.json({ action: 'check_in', time: now })
  } else if (!existing.check_out) {
    await c.env.DB.prepare('UPDATE attendance SET check_out=? WHERE id=?').bind(now, existing.id).run()
    return c.json({ action: 'check_out', time: now })
  }
  return c.json({ action: 'already_done', check_in: existing.check_in, check_out: existing.check_out })
})

// 출근 현황 조회
app.get('/api/protected/hr/attendance', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().slice(0,10)
  const rows = await c.env.DB.prepare(
    `SELECT a.*, u.name as user_name, u.position, u.team FROM attendance a JOIN users u ON a.user_id=u.id WHERE a.hospital_id=? AND a.date=? ORDER BY a.check_in`
  ).bind(user.hospitalId, date).all()
  return c.json(rows.results)
})

/* ─── Categories API ─── */
app.get('/api/protected/categories/:module', async (c) => {
  const mod = c.req.param('module')
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM categories WHERE module=? AND (hospital_id IS NULL OR hospital_id=?) ORDER BY sort_order').bind(mod, user.hospitalId).all()
  return c.json(rows.results)
})

/* ─── Materials API ─── */
app.get('/api/protected/materials', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  const search = c.req.query('search')
  let sql = 'SELECT m.*, c.name as category_name FROM materials m JOIN categories c ON m.category_id=c.id WHERE (m.hospital_id IS NULL OR m.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND m.category_id=?'; params.push(cat) }
  if (search) { sql += ' AND (m.title LIKE ? OR m.description LIKE ?)'; params.push('%' + search + '%', '%' + search + '%') }
  sql += ' ORDER BY m.sort_order, m.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/materials', async (c) => {
  const user = c.get('user')!
  const form = await c.req.formData()
  const title = form.get('title') as string
  const categoryId = form.get('category_id') as string
  const description = form.get('description') as string || ''
  const file = form.get('file') as File
  if (!title || !categoryId || !file) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `materials/${user.hospitalId}/${id}.${ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const fileUrl = `/api/protected/files/${key}`
  const fileType = file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'pdf' : 'image'
  await c.env.DB.prepare('INSERT INTO materials (id, hospital_id, category_id, title, description, file_url, file_type) VALUES (?,?,?,?,?,?,?)').bind(id, user.hospitalId, categoryId, title, description, fileUrl, fileType).run()
  return c.json({ id, title, file_url: fileUrl, file_type: fileType })
})

app.delete('/api/protected/materials/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM materials WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Pricing API ─── */
app.get('/api/protected/pricing', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT p.*, c.name as category_name FROM pricing p JOIN categories c ON p.category_id=c.id WHERE p.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND p.category_id=?'; params.push(cat) }
  sql += ' ORDER BY c.sort_order, p.sort_order'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/pricing', async (c) => {
  const user = c.get('user')!
  const { category_id, procedure_name, price_min, price_max, description } = await c.req.json()
  if (!category_id || !procedure_name) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO pricing (id, hospital_id, category_id, procedure_name, price_min, price_max, description) VALUES (?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id, procedure_name, price_min || null, price_max || null, description || '').run()
  return c.json({ id })
})

app.put('/api/protected/pricing/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const { procedure_name, price_min, price_max, description, is_active } = await c.req.json()
  await c.env.DB.prepare('UPDATE pricing SET procedure_name=?, price_min=?, price_max=?, description=?, is_active=? WHERE id=? AND hospital_id=?').bind(procedure_name, price_min, price_max, description || '', is_active ?? 1, id, user.hospitalId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/pricing/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM pricing WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Cases API ─── */
app.get('/api/protected/cases', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT cs.*, c.name as category_name, (SELECT COUNT(*) FROM case_images WHERE case_id=cs.id) as image_count FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND cs.category_id=?'; params.push(cat) }
  sql += ' ORDER BY cs.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/cases', async (c) => {
  const user = c.get('user')!
  const { category_id, title, description, patient_age, patient_gender, treatment_period } = await c.req.json()
  if (!category_id || !title) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO cases (id, hospital_id, category_id, title, description, patient_age, patient_gender, treatment_period, created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id, title, description || '', patient_age || '', patient_gender || '', treatment_period || '', user.id).run()
  return c.json({ id })
})

app.get('/api/protected/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const cs: any = await c.env.DB.prepare('SELECT cs.*, c.name as category_name FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.id=? AND cs.hospital_id=?').bind(id, user.hospitalId).first()
  if (!cs) return c.json({ error: 'Not found' }, 404)
  const images = await c.env.DB.prepare('SELECT * FROM case_images WHERE case_id=? ORDER BY sort_order').bind(id).all()
  return c.json({ ...cs, images: images.results })
})

app.delete('/api/protected/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM case_images WHERE case_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM cases WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Case Images API ─── */
app.post('/api/protected/cases/:id/images', async (c) => {
  const user = c.get('user')!
  const caseId = c.req.param('id')
  const form = await c.req.formData()
  const file = form.get('file') as File
  const imageType = (form.get('image_type') as string) || 'during'
  const caption = (form.get('caption') as string) || ''
  if (!file) return c.json({ error: '파일을 선택해주세요' }, 400)
  const imgId = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `cases/${user.hospitalId}/${caseId}/${imgId}.${ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const imageUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('INSERT INTO case_images (id, case_id, image_url, image_type, caption) VALUES (?,?,?,?,?)').bind(imgId, caseId, imageUrl, imageType, caption).run()
  return c.json({ id: imgId, image_url: imageUrl })
})

app.delete('/api/protected/case-images/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM case_images WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

/* ─── File Serving (R2) ─── */
app.get('/api/protected/files/*', async (c) => {
  const key = c.req.path.replace('/api/protected/files/', '')
  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'File not found' }, 404)
  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' }
  })
})

/* ─── Community Posts API ─── */
app.get('/api/protected/posts', async (c) => {
  const user = c.get('user')!
  const board = c.req.query('board') || ''
  let sql = 'SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id=u.id WHERE p.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (board) { sql += ' AND p.board_type=?'; params.push(board) }
  sql += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 100'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/posts', async (c) => {
  const user = c.get('user')!
  const { board_type, title, content, target_name, is_anonymous, is_pinned } = await c.req.json()
  if (!board_type || !title) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO posts (id, hospital_id, board_type, author_id, title, content, target_name, is_anonymous, is_pinned) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, board_type, user.id, title, content||'', target_name||'', is_anonymous?1:0, is_pinned?1:0).run()
  return c.json({ id })
})

app.delete('/api/protected/posts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM comments WHERE post_id=?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM posts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

app.get('/api/protected/posts/:id/comments', async (c) => {
  const rows = await c.env.DB.prepare('SELECT cm.*, u.name as author_name FROM comments cm JOIN users u ON cm.author_id=u.id WHERE cm.post_id=? ORDER BY cm.created_at').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

app.post('/api/protected/posts/:id/comments', async (c) => {
  const user = c.get('user')!
  const { content } = await c.req.json()
  if (!content) return c.json({ error: '내용을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO comments (id, post_id, author_id, content) VALUES (?,?,?,?)').bind(id, c.req.param('id'), user.id, content).run()
  return c.json({ id })
})

app.post('/api/protected/posts/:id/like', async (c) => {
  const user = c.get('user')!
  const postId = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM post_likes WHERE post_id=? AND user_id=?').bind(postId, user.id).first()
  if (existing) {
    await c.env.DB.prepare('DELETE FROM post_likes WHERE post_id=? AND user_id=?').bind(postId, user.id).run()
    await c.env.DB.prepare('UPDATE posts SET like_count=MAX(0,like_count-1) WHERE id=?').bind(postId).run()
    return c.json({ liked: false })
  } else {
    await c.env.DB.prepare('INSERT INTO post_likes (id, post_id, user_id) VALUES (?,?,?)').bind(crypto.randomUUID(), postId, user.id).run()
    await c.env.DB.prepare('UPDATE posts SET like_count=like_count+1 WHERE id=?').bind(postId).run()
    return c.json({ liked: true })
  }
})

/* ─── Kanban API ─── */
app.get('/api/protected/kanban/:boardType', async (c) => {
  const user = c.get('user')!
  const boardType = c.req.param('boardType')
  const department = c.req.query('department') || ''
  let board: any = await c.env.DB.prepare('SELECT * FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) {
    const id = crypto.randomUUID()
    const title = boardType === 'purchase' ? '물품 구매 요청' : boardType === 'repair' ? '수리/정비 요청' : '칸반보드'
    await c.env.DB.prepare('INSERT INTO kanban_boards (id, hospital_id, board_type, title) VALUES (?,?,?,?)').bind(id, user.hospitalId, boardType, title).run()
    board = { id, board_type: boardType, title }
  }
  let sql = 'SELECT kc.*, u.name as requested_by_name FROM kanban_cards kc JOIN users u ON kc.requested_by=u.id WHERE kc.board_id=?'
  const params: any[] = [board.id]
  if (department) { sql += ' AND kc.department=?'; params.push(department) }
  sql += " ORDER BY CASE kc.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, kc.created_at DESC"
  const cards = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ board, cards: cards.results })
})

app.post('/api/protected/kanban/:boardType/cards', async (c) => {
  const user = c.get('user')!
  const boardType = c.req.param('boardType')
  const board: any = await c.env.DB.prepare('SELECT id FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) return c.json({ error: '보드를 찾을 수 없습니다' }, 404)
  const { title, description, priority, estimated_cost, due_date, department } = await c.req.json()
  if (!title) return c.json({ error: '제목을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO kanban_cards (id, board_id, hospital_id, title, description, priority, department, requested_by, estimated_cost, due_date) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, board.id, user.hospitalId, title, description||'', priority||'normal', department||'general', user.id, estimated_cost||null, due_date||null).run()
  return c.json({ id })
})

app.put('/api/protected/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  const { status, actual_cost } = await c.req.json()
  const completed = status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE kanban_cards SET status=?, actual_cost=COALESCE(?,actual_cost), completed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?').bind(status, actual_cost||null, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM kanban_cards WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Staff Supplies (직원용품 주문) API ─── */
app.get('/api/protected/staff-supplies', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status') || ''
  const item_type = c.req.query('item_type') || ''
  let sql = `SELECT ss.*, u.name as user_name, u2.name as requested_by_name, u3.name as approved_by_name 
    FROM staff_supplies ss 
    JOIN users u ON ss.user_id=u.id 
    JOIN users u2 ON ss.requested_by=u2.id 
    LEFT JOIN users u3 ON ss.approved_by=u3.id 
    WHERE ss.hospital_id=?`
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND ss.status=?'; params.push(status) }
  if (item_type) { sql += ' AND ss.item_type=?'; params.push(item_type) }
  sql += ' ORDER BY ss.created_at DESC'
  const results = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results.results)
})

app.post('/api/protected/staff-supplies', async (c) => {
  const user = c.get('user')!
  const { user_id, item_type, item_name, size, color, quantity, notes } = await c.req.json()
  if (!item_type || !item_name) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'ss-' + crypto.randomUUID().slice(0,8)
  const targetUser = user_id || user.id
  await c.env.DB.prepare(`INSERT INTO staff_supplies (id, hospital_id, user_id, item_type, item_name, size, color, quantity, notes, requested_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, targetUser, item_type, item_name, size||'', color||'', quantity||1, notes||'', user.id).run()
  return c.json({ id })
})

app.put('/api/protected/staff-supplies/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields: string[] = []
  const vals: any[] = []
  for (const k of ['status','size','color','quantity','notes','order_date','delivery_date']) {
    if (body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(body[k]) }
  }
  if (body.status === 'approved' || body.status === 'ordered') {
    fields.push('approved_by = ?'); vals.push(user.id)
  }
  if (body.status === 'ordered' && !body.order_date) {
    fields.push('order_date = ?'); vals.push(new Date().toISOString().slice(0,10))
  }
  if (body.status === 'delivered' && !body.delivery_date) {
    fields.push('delivery_date = ?'); vals.push(new Date().toISOString().slice(0,10))
  }
  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP')
    vals.push(id, user.hospitalId)
    await c.env.DB.prepare(`UPDATE staff_supplies SET ${fields.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  }
  return c.json({ success: true })
})

app.delete('/api/protected/staff-supplies/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM staff_supplies WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Scripts API ─── */
app.get('/api/protected/scripts', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT s.*, c.name as category_name FROM scripts s LEFT JOIN categories c ON s.category_id=c.id WHERE (s.hospital_id IS NULL OR s.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND s.category_id=?'; params.push(cat) }
  sql += ' ORDER BY s.sort_order, s.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/scripts', async (c) => {
  const user = c.get('user')!
  const { category_id, title, situation, script_text, objection, response } = await c.req.json()
  if (!title || !script_text) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id||null, title, situation||'', script_text, objection||'', response||'').run()
  return c.json({ id })
})

app.delete('/api/protected/scripts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM scripts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Marketing API ─── */
app.get('/api/protected/marketing/channels', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM marketing_channels WHERE hospital_id=? ORDER BY created_at').bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 마케팅 채널 추가 - admin/manager만
app.post('/api/protected/marketing/channels', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '마케팅 채널 관리 권한이 없습니다' }, 403)
  const { name, monthly_cost } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_channels (id, hospital_id, name, monthly_cost) VALUES (?,?,?,?)').bind(id, user.hospitalId, name, monthly_cost||0).run()
  return c.json({ id })
})

app.get('/api/protected/marketing/records', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  let sql = 'SELECT r.*, ch.name as channel_name FROM marketing_records r JOIN marketing_channels ch ON r.channel_id=ch.id WHERE r.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND r.record_month=?'; params.push(month) }
  sql += ' ORDER BY r.record_month DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

// 마케팅 기록 추가 - admin/manager만
app.post('/api/protected/marketing/records', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '마케팅 기록 관리 권한이 없습니다' }, 403)
  const { channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, channel_id, record_month, new_patients||0, revisit_patients||0, ad_spend||0, revenue||0).run()
  return c.json({ id })
})

app.get('/api/protected/reviews', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM reviews WHERE hospital_id=? ORDER BY review_date DESC, created_at DESC LIMIT 100').bind(user.hospitalId).all()
  return c.json(rows.results)
})

app.post('/api/protected/reviews', async (c) => {
  const user = c.get('user')!
  const { platform, reviewer_name, rating, content, reply, review_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, platform||'manual', reviewer_name||'', rating||5, content||'', reply||'', review_date||new Date().toISOString().split('T')[0]).run()
  return c.json({ id })
})

/* ─── Checklists API ─── */
app.get('/api/protected/checklists', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM checklists WHERE hospital_id=? ORDER BY created_at').bind(user.hospitalId).all()
  return c.json(rows.results)
})

app.post('/api/protected/checklists', async (c) => {
  const user = c.get('user')!
  const { title, checklist_type, items } = await c.req.json()
  if (!title || !items) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklists (id, hospital_id, title, checklist_type, items) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, title, checklist_type||'custom', JSON.stringify(items)).run()
  return c.json({ id })
})

app.post('/api/protected/checklists/:id/complete', async (c) => {
  const user = c.get('user')!
  const { completed_items, notes, log_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklist_logs (id, checklist_id, completed_by, completed_items, log_date, notes) VALUES (?,?,?,?,?,?)').bind(id, c.req.param('id'), user.id, JSON.stringify(completed_items), log_date||new Date().toISOString().split('T')[0], notes||'').run()
  return c.json({ id })
})

app.get('/api/protected/checklists/:id/logs', async (c) => {
  const rows = await c.env.DB.prepare('SELECT cl.*, u.name as completed_by_name FROM checklist_logs cl JOIN users u ON cl.completed_by=u.id WHERE cl.checklist_id=? ORDER BY cl.log_date DESC LIMIT 30').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

/* ─── Events (Calendar) API ─── */
app.get('/api/protected/events', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  let sql = 'SELECT e.*, u.name as created_by_name FROM events e JOIN users u ON e.created_by=u.id WHERE e.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND e.start_date LIKE ?'; params.push(month + '%') }
  sql += ' ORDER BY e.start_date'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/events', async (c) => {
  const user = c.get('user')!
  const { title, description, event_type, start_date, end_date, all_day, color } = await c.req.json()
  if (!title || !start_date) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, title, description||'', event_type||'meeting', start_date, end_date||start_date, all_day??1, color||'#0f766e', user.id).run()
  return c.json({ id })
})

app.delete('/api/protected/events/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM events WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Dashboard stats ─── */
app.get('/api/protected/dashboard', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0,7)
  const dayOfWeek = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
  const [matCount, prcCount, caseCount, imgCount, postCount, kanbanCount, hireCount, applicantCount, tbTotal, tbDoctorNeeded, tbInTreatment, tbCompleted, csTotal, csAgreed, csPaid, csLost, staffAll, attendanceToday, chairAll, tbWaiting, funnelCounts] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM materials WHERE hospital_id=? OR hospital_id IS NULL').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM pricing WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM cases WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM case_images ci JOIN cases cs ON ci.case_id=cs.id WHERE cs.hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM posts WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM kanban_cards WHERE hospital_id=? AND status!='completed'").bind(hid).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM job_postings WHERE hospital_id=? AND status='open'").bind(hid).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM applicants WHERE hospital_id=? AND status NOT IN ('hired','rejected','withdrawn')").bind(hid).first<{ c: number }>(),
    // 진료보드
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=?").bind(hid, today).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=? AND status='doctor_needed'").bind(hid, today).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=? AND status='in_treatment'").bind(hid, today).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=? AND status='completed'").bind(hid, today).first<{ c: number }>(),
    // 상담관리 (이번 달)
    c.env.DB.prepare("SELECT COUNT(*) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ?").bind(hid, thisMonth+'%').first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ? AND status IN ('agreed','payment','treatment','completed')").bind(hid, thisMonth+'%').first<{ c: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(paid_amount),0) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ? AND paid_amount IS NOT NULL").bind(hid, thisMonth+'%').first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ? AND status='lost'").bind(hid, thisMonth+'%').first<{ c: number }>(),
    // 직원 현황
    c.env.DB.prepare("SELECT id, name, role, position, team, is_doctor, work_schedule FROM users WHERE hospital_id=? AND is_active=1").bind(hid).all(),
    c.env.DB.prepare("SELECT user_id, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?").bind(hid, today).all(),
    // 체어 현황
    c.env.DB.prepare("SELECT id, chair_number, floor, room_name FROM chairs WHERE hospital_id=? AND is_active=1 ORDER BY sort_order, chair_number").bind(hid).all(),
    c.env.DB.prepare("SELECT chair_id FROM treatment_board WHERE hospital_id=? AND board_date=? AND status IN ('in_treatment','doctor_needed','waiting')").bind(hid, today).all(),
    // 퍼널 현황
    c.env.DB.prepare("SELECT current_stage, COUNT(*) as c FROM patient_funnel WHERE hospital_id=? GROUP BY current_stage").bind(hid).all(),
  ])

  // 직원 출근 현황 가공
  const attendMap: any = {}
  ;(attendanceToday?.results||[]).forEach((a: any) => { attendMap[a.user_id] = a })
  const staffSummary = { total: 0, present: 0, doctors: 0, doctorsPresent: 0 }
  ;(staffAll?.results||[]).forEach((s: any) => {
    let ws: any = {}; try { ws = JSON.parse(s.work_schedule||'{}') } catch(e) {}
    const scheduledToday = !!ws[dayOfWeek]
    if (!scheduledToday) return
    staffSummary.total++
    if (s.is_doctor) staffSummary.doctors++
    if (attendMap[s.id]?.check_in) { staffSummary.present++; if (s.is_doctor) staffSummary.doctorsPresent++ }
  })

  // 체어 사용 현황
  const busyChairs = new Set((tbWaiting?.results||[]).map((r: any) => r.chair_id))
  const chairSummary = { total: (chairAll?.results||[]).length, busy: busyChairs.size, available: (chairAll?.results||[]).length - busyChairs.size }

  // 퍼널 현황
  const funnelMap: any = {}
  ;(funnelCounts?.results||[]).forEach((r: any) => { funnelMap[r.current_stage] = r.c })

  return c.json({
    materials: matCount?.c||0, pricing: prcCount?.c||0, cases: caseCount?.c||0, caseImages: imgCount?.c||0,
    posts: postCount?.c||0, pendingTasks: kanbanCount?.c||0,
    openJobs: hireCount?.c||0, activeApplicants: applicantCount?.c||0,
    todayPatients: tbTotal?.c||0, doctorNeeded: tbDoctorNeeded?.c||0,
    inTreatment: tbInTreatment?.c||0, completedToday: tbCompleted?.c||0,
    monthConsultations: csTotal?.c||0, monthAgreed: csAgreed?.c||0,
    monthPaid: csPaid?.c||0, monthLost: csLost?.c||0,
    conversionRate: (csTotal?.c||0) > 0 ? Math.round((csAgreed?.c||0)/(csTotal?.c||0)*100) : 0,
    staff: staffSummary, chairs: chairSummary, funnel: funnelMap,
  })
})

/* ─── PF Hire: Job Postings API ─── */
app.get('/api/protected/hire/postings', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  let sql = 'SELECT jp.*, u.name as created_by_name, (SELECT COUNT(*) FROM applicants WHERE job_posting_id=jp.id) as applicant_count FROM job_postings jp LEFT JOIN users u ON jp.created_by=u.id WHERE jp.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND jp.status=?'; params.push(status) }
  sql += ' ORDER BY jp.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/hire/postings', async (c) => {
  const user = c.get('user')!
  const { title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, deadline } = await c.req.json()
  if (!title || !position_type) return c.json({ error: '직책과 제목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, title, position_type, employment_type||'full_time', description||'', requirements||'', benefits||'', salary_min||null, salary_max||null, 'open', user.id, deadline||null).run()
  return c.json({ id })
})

app.put('/api/protected/hire/postings/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = ['title','position_type','employment_type','description','requirements','benefits','salary_min','salary_max','status','deadline']
  const updates: string[] = []
  const params: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f}=?`); params.push(body[f]) }
  }
  if (!updates.length) return c.json({ error: '수정할 항목이 없습니다' }, 400)
  updates.push('updated_at=CURRENT_TIMESTAMP')
  params.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE job_postings SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...params).run()
  return c.json({ success: true })
})

app.delete('/api/protected/hire/postings/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM job_postings WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Applicants API ─── */
app.get('/api/protected/hire/postings/:id/applicants', async (c) => {
  const user = c.get('user')!
  const jobId = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT a.*, (SELECT COUNT(*) FROM interviews WHERE applicant_id=a.id) as interview_count, (SELECT COUNT(*) FROM evaluations WHERE applicant_id=a.id) as eval_count FROM applicants a WHERE a.job_posting_id=? AND a.hospital_id=? ORDER BY CASE a.status WHEN \'applied\' THEN 0 WHEN \'screening\' THEN 1 WHEN \'interview\' THEN 2 WHEN \'evaluation\' THEN 3 WHEN \'offer\' THEN 4 WHEN \'hired\' THEN 5 WHEN \'rejected\' THEN 6 ELSE 7 END, a.applied_at DESC').bind(jobId, user.hospitalId).all()
  return c.json(rows.results)
})

app.get('/api/protected/hire/applicants', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  let sql = 'SELECT a.*, jp.title as job_title FROM applicants a JOIN job_postings jp ON a.job_posting_id=jp.id WHERE a.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND a.status=?'; params.push(status) }
  sql += ' ORDER BY a.applied_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/hire/applicants', async (c) => {
  const user = c.get('user')!
  const { job_posting_id, name, email, phone, cover_letter, notes } = await c.req.json()
  if (!job_posting_id || !name) return c.json({ error: '공고와 이름을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO applicants (id, hospital_id, job_posting_id, name, email, phone, cover_letter, notes) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, job_posting_id, name, email||'', phone||'', cover_letter||'', notes||'').run()
  return c.json({ id })
})

app.put('/api/protected/hire/applicants/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const { status, rating, notes } = await c.req.json()
  const updates: string[] = ['updated_at=CURRENT_TIMESTAMP']
  const params: any[] = []
  if (status !== undefined) { updates.push('status=?'); params.push(status) }
  if (rating !== undefined) { updates.push('rating=?'); params.push(rating) }
  if (notes !== undefined) { updates.push('notes=?'); params.push(notes) }
  params.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE applicants SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...params).run()
  return c.json({ success: true })
})

app.delete('/api/protected/hire/applicants/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM applicants WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Resume Upload ─── */
app.post('/api/protected/hire/applicants/:id/resume', async (c) => {
  const user = c.get('user')!
  const appId = c.req.param('id')
  const form = await c.req.formData()
  const file = form.get('file') as File
  if (!file) return c.json({ error: '파일을 선택해주세요' }, 400)
  const ext = file.name.split('.').pop() || 'pdf'
  const key = `resumes/${user.hospitalId}/${appId}.${ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const resumeUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('UPDATE applicants SET resume_url=? WHERE id=? AND hospital_id=?').bind(resumeUrl, appId, user.hospitalId).run()
  return c.json({ resume_url: resumeUrl })
})

/* ─── PF Hire: Interviews API ─── */
app.get('/api/protected/hire/applicants/:id/interviews', async (c) => {
  const rows = await c.env.DB.prepare('SELECT i.*, u.name as interviewer_name FROM interviews i LEFT JOIN users u ON i.interviewer_id=u.id WHERE i.applicant_id=? ORDER BY i.scheduled_at DESC').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

app.post('/api/protected/hire/interviews', async (c) => {
  const user = c.get('user')!
  const { applicant_id, scheduled_at, duration_min, interview_type, location } = await c.req.json()
  if (!applicant_id || !scheduled_at) return c.json({ error: '지원자와 일정을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at, duration_min, interview_type, location) VALUES (?,?,?,?,?,?,?,?)').bind(id, applicant_id, user.hospitalId, user.id, scheduled_at, duration_min||30, interview_type||'onsite', location||'').run()
  return c.json({ id })
})

app.put('/api/protected/hire/interviews/:id', async (c) => {
  const { status, feedback, score } = await c.req.json()
  const updates: string[] = []
  const params: any[] = []
  if (status) { updates.push('status=?'); params.push(status) }
  if (feedback !== undefined) { updates.push('feedback=?'); params.push(feedback) }
  if (score !== undefined) { updates.push('score=?'); params.push(score) }
  params.push(c.req.param('id'))
  await c.env.DB.prepare(`UPDATE interviews SET ${updates.join(',')} WHERE id=?`).bind(...params).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Evaluations API ─── */
// 채용 평가 - admin/manager만 조회 가능
app.get('/api/protected/hire/applicants/:id/evaluations', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '평가 열람 권한이 없습니다' }, 403)
  const rows = await c.env.DB.prepare('SELECT e.*, u.name as evaluator_name FROM evaluations e JOIN users u ON e.evaluator_id=u.id WHERE e.applicant_id=? ORDER BY e.created_at DESC').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

// 채용 평가 작성 - admin/manager만
app.post('/api/protected/hire/evaluations', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '평가 작성 권한이 없습니다' }, 403)
  const { applicant_id, criteria, total_score, max_score, comments, recommendation } = await c.req.json()
  if (!applicant_id || !criteria) return c.json({ error: '평가 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO evaluations (id, applicant_id, evaluator_id, criteria, total_score, max_score, comments, recommendation) VALUES (?,?,?,?,?,?,?,?)').bind(id, applicant_id, user.id, JSON.stringify(criteria), total_score||0, max_score||100, comments||'', recommendation||'neutral').run()
  return c.json({ id })
})

/* ─── PF Hire: Onboarding API ─── */
app.get('/api/protected/hire/onboarding', async (c) => {
  const user = c.get('user')!
  const appId = c.req.query('applicant_id')
  let sql = 'SELECT ot.*, u.name as assigned_to_name, a.name as applicant_name FROM onboarding_tasks ot LEFT JOIN users u ON ot.assigned_to=u.id LEFT JOIN applicants a ON ot.applicant_id=a.id WHERE ot.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (appId) { sql += ' AND ot.applicant_id=?'; params.push(appId) }
  sql += ' ORDER BY CASE ot.status WHEN \'pending\' THEN 0 WHEN \'in_progress\' THEN 1 ELSE 2 END, ot.created_at'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/hire/onboarding', async (c) => {
  const user = c.get('user')!
  const { applicant_id, title, description, category, assigned_to, due_date } = await c.req.json()
  if (!title) return c.json({ error: '제목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO onboarding_tasks (id, hospital_id, applicant_id, title, description, category, assigned_to, due_date) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, applicant_id||null, title, description||'', category||'general', assigned_to||null, due_date||null).run()
  return c.json({ id })
})

app.put('/api/protected/hire/onboarding/:id', async (c) => {
  const user = c.get('user')!
  const { status } = await c.req.json()
  const completed = status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE onboarding_tasks SET status=?, completed_at=? WHERE id=? AND hospital_id=?').bind(status, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══ 병원 설정 (Hospital Settings) ═══ */

// 병원 설정 조회
app.get('/api/protected/hospital/settings', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(row?.settings || '{}') } catch(e) {}
  // 기본값 병합
  const defaults: any = {
    location_terms: {
      chair: '체어', room: '진료실', floor: '층',
      surgery_room: '수술실', waiting_room: '대기실', consult_room: '상담실',
      xray_room: '촬영실', sterilization: '소독실'
    },
    location_presets: [],
    operating_hours: {
      weekday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '09:00', end: '14:00', enabled: true },
      sunday: { start: '', end: '', enabled: false },
      lunch: { start: '13:00', end: '14:00', enabled: true },
      evening: { start: '', end: '', enabled: false, label: '야간진료' },
      regular_holidays: [],
      holiday_notice: '',
    },
    floor_map: [],
  }
  const merged: any = {
    location_terms: { ...defaults.location_terms, ...(settings.location_terms || {}) },
    location_presets: settings.location_presets || defaults.location_presets,
    operating_hours: { ...defaults.operating_hours, ...(settings.operating_hours || {}) },
    floor_map: settings.floor_map || defaults.floor_map,
  }
  return c.json(merged)
})

// 병원 설정 업데이트 (admin/manager만)
app.put('/api/protected/hospital/settings', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  // 기존 설정 로드 후 깊은 머지 (location_terms 등 중첩 객체 보존)
  const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let existing: any = {}
  try { existing = JSON.parse(row?.settings || '{}') } catch(e) {}
  const updated = { ...existing }
  for (const key of Object.keys(body)) {
    if (typeof body[key] === 'object' && !Array.isArray(body[key]) && body[key] !== null && typeof existing[key] === 'object' && !Array.isArray(existing[key])) {
      updated[key] = { ...existing[key], ...body[key] }
    } else {
      updated[key] = body[key]
    }
  }
  await c.env.DB.prepare('UPDATE hospitals SET settings=?, updated_at=? WHERE id=?').bind(JSON.stringify(updated), new Date().toISOString(), user.hospitalId).run()
  return c.json({ success: true, settings: updated })
})

// 병원 기본 정보 조회
app.get('/api/protected/hospital/info', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare('SELECT id, name, phone, address, logo_url, settings, created_at FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  if (!row) return c.json({ error: '병원 정보를 찾을 수 없습니다' }, 404)
  let settings: any = {}
  try { settings = JSON.parse(row.settings || '{}') } catch(e) {}
  return c.json({ ...row, settings })
})

// 병원 기본 정보 수정 (admin만)
app.put('/api/protected/hospital/info', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const { name, phone, address } = await c.req.json()
  const sets: string[] = []
  const vals: any[] = []
  if (name) { sets.push('name=?'); vals.push(name) }
  if (phone !== undefined) { sets.push('phone=?'); vals.push(phone) }
  if (address !== undefined) { sets.push('address=?'); vals.push(address) }
  if (!sets.length) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(user.hospitalId)
  await c.env.DB.prepare(`UPDATE hospitals SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

/* ═══ 진료보드 (Treatment Board) ═══ */

// 체어 목록
app.get('/api/protected/chairs', async (c) => {
  const user = c.get('user')!
  const chairs = await c.env.DB.prepare('SELECT * FROM chairs WHERE hospital_id=? AND is_active=1 ORDER BY sort_order, chair_number').bind(user.hospitalId).all()
  return c.json(chairs.results)
})

app.post('/api/protected/chairs', async (c) => {
  const user = c.get('user')!
  const { chair_number, floor, room_name } = await c.req.json()
  if (!chair_number) return c.json({ error: '체어 번호를 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)').bind(id, user.hospitalId, chair_number, floor||'', room_name||'', chair_number).run()
  return c.json({ id })
})

app.delete('/api/protected/chairs/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('UPDATE chairs SET is_active=0 WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 원장(의사) 목록 조회
app.get('/api/protected/doctors', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, name, role FROM users WHERE hospital_id=? AND is_doctor=1 AND is_active=1 ORDER BY role, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 오늘 출근한 원장(doctor) 목록 — 진료보드 상단 표시용
app.get('/api/protected/doctors/on-duty', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10)
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat']
  const dayOfWeek = dayNames[new Date(date + 'T00:00:00').getDay()]

  // 전체 의사(원장) 가져오기
  const doctorRows = await c.env.DB.prepare(
    `SELECT id, name, role, work_schedule FROM users WHERE hospital_id=? AND is_doctor=1 AND is_active=1 AND work_status='active' ORDER BY role DESC, name`
  ).bind(user.hospitalId).all()
  const doctors = doctorRows.results as any[]

  // 오늘 출근 기록
  const attRows = await c.env.DB.prepare(
    `SELECT user_id, status, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?`
  ).bind(user.hospitalId, date).all()
  const attMap: Record<string, any> = {}
  for (const a of attRows.results as any[]) attMap[a.user_id] = a

  // 오늘 휴가 기록
  const leaveRows = await c.env.DB.prepare(
    `SELECT user_id FROM leave_requests WHERE hospital_id=? AND status='approved' AND start_date<=? AND end_date>=?`
  ).bind(user.hospitalId, date, date).all()
  const onLeaveSet = new Set((leaveRows.results as any[]).map((r: any) => r.user_id))

  const result = doctors.map((d: any) => {
    let schedule: any = {}
    try { schedule = JSON.parse(d.work_schedule || '{}') } catch(e) {}
    const todaySchedule = schedule[dayOfWeek] || null
    const isScheduledOff = todaySchedule === null
    const isOnLeave = onLeaveSet.has(d.id) || (attMap[d.id]?.status === 'vacation')
    const att = attMap[d.id]
    const isPresent = att && ['present','late','half_day'].includes(att.status)

    let status = 'scheduled' // 근무 예정
    if (isScheduledOff) status = 'day_off'
    else if (isOnLeave) status = 'vacation'
    else if (isPresent) status = 'on_duty'   // 출근 완료

    return {
      id: d.id, name: d.name, role: d.role,
      status,
      check_in: att?.check_in || null,
      today_schedule: todaySchedule,
    }
  })

  return c.json(result)
})

// 진료보드 (날짜별) — sort_order 기준 정렬 (원장이 이동해야 할 순서)
app.get('/api/protected/treatment-board', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const rows = await c.env.DB.prepare(`
    SELECT tb.*, c.chair_number, c.floor, c.room_name,
           d.name as doctor_name, s.name as staff_name
    FROM treatment_board tb
    LEFT JOIN chairs c ON tb.chair_id = c.id
    LEFT JOIN users d ON tb.assigned_doctor = d.id
    LEFT JOIN users s ON tb.assigned_staff = s.id
    WHERE tb.hospital_id = ? AND tb.board_date = ?
    ORDER BY tb.sort_order ASC, tb.appointment_time ASC
  `).bind(user.hospitalId, date).all()
  return c.json(rows.results)
})

app.post('/api/protected/treatment-board', async (c) => {
  const user = c.get('user')!
  const { patient_name, patient_type, chart_number, chair_id, assigned_doctor, assigned_staff, treatment_desc, treatment_type, appointment_time, notes, priority, board_date } = await c.req.json()
  if (!patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const date = board_date || new Date().toISOString().split('T')[0]
  // 새 카드는 해당 컬럼의 맨 아래에 추가
  const maxSort = await c.env.DB.prepare(
    assigned_doctor
      ? 'SELECT COALESCE(MAX(sort_order),0) as mx FROM treatment_board WHERE hospital_id=? AND board_date=? AND assigned_doctor=?'
      : 'SELECT COALESCE(MAX(sort_order),0) as mx FROM treatment_board WHERE hospital_id=? AND board_date=? AND assigned_doctor IS NULL'
  ).bind(...(assigned_doctor ? [user.hospitalId, date, assigned_doctor] : [user.hospitalId, date])).first() as any
  const sortOrder = (maxSort?.mx || 0) + 1
  await c.env.DB.prepare(`INSERT INTO treatment_board (id, hospital_id, chair_id, board_date, patient_name, patient_type, chart_number, assigned_doctor, assigned_staff, treatment_desc, treatment_type, appointment_time, notes, priority, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, chair_id||null, date, patient_name, patient_type||'existing', chart_number||'', assigned_doctor||null, assigned_staff||null, treatment_desc||'', treatment_type||'general', appointment_time||null, notes||'', priority||'normal', sortOrder).run()
  return c.json({ id })
})

app.put('/api/protected/treatment-board/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const id = c.req.param('id')
  const updates: string[] = []
  const vals: any[] = []
  const fields: Record<string, string> = { status:'status', chair_id:'chair_id', assigned_doctor:'assigned_doctor', assigned_staff:'assigned_staff', treatment_desc:'treatment_desc', notes:'notes', priority:'priority', sort_order:'sort_order' }
  for (const [k, col] of Object.entries(fields)) {
    if (body[k] !== undefined) { updates.push(`${col}=?`); vals.push(body[k]) }
  }
  if (body.status === 'arrived') { updates.push('arrived_at=?'); vals.push(new Date().toISOString()) }
  if (body.status === 'in_treatment') { updates.push('treatment_started_at=?'); vals.push(new Date().toISOString()) }
  if (body.status === 'completed') { updates.push('completed_at=?'); vals.push(new Date().toISOString()) }
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE treatment_board SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 카드 순서 일괄 변경 (드래그 → 원장 이동 + 순서 변경)
app.put('/api/protected/treatment-board-reorder', async (c) => {
  const user = c.get('user')!
  const { items } = await c.req.json() // [{id, assigned_doctor, sort_order}]
  if (!Array.isArray(items)) return c.json({ error: 'items 배열이 필요합니다' }, 400)
  const stmts = items.map((item: any) =>
    c.env.DB.prepare('UPDATE treatment_board SET assigned_doctor=?, sort_order=?, updated_at=? WHERE id=? AND hospital_id=?')
      .bind(item.assigned_doctor || null, item.sort_order, new Date().toISOString(), item.id, user.hospitalId)
  )
  await c.env.DB.batch(stmts)
  return c.json({ success: true })
})

app.delete('/api/protected/treatment-board/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM treatment_board WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 진료보드 통계
app.get('/api/protected/treatment-board/stats', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const stats = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count FROM treatment_board
    WHERE hospital_id=? AND board_date=? GROUP BY status
  `).bind(user.hospitalId, date).all()
  const total = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM treatment_board WHERE hospital_id=? AND board_date=?').bind(user.hospitalId, date).first()
  return c.json({ stats: stats.results, total: (total as any)?.cnt || 0 })
})

/* ═══ 상담관리 (Consultation) ═══ */

app.get('/api/protected/consultations', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  const source = c.req.query('source')
  const treatment = c.req.query('treatment')
  const period = c.req.query('period') // YYYY-MM
  let sql = 'SELECT c.*, u.name as counselor_name FROM consultations c LEFT JOIN users u ON c.assigned_counselor = u.id WHERE c.hospital_id = ?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND c.status = ?'; params.push(status) }
  if (source) { sql += ' AND c.source_channel = ?'; params.push(source) }
  if (treatment) { sql += ' AND c.treatment_type = ?'; params.push(treatment) }
  if (period) { sql += ' AND c.consultation_date LIKE ?'; params.push(period + '%') }
  sql += ' ORDER BY c.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(filterSensitiveData(rows.results, user.role))
})

app.post('/api/protected/consultations', async (c) => {
  const user = c.get('user')!
  const { patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, assigned_counselor, estimated_amount, consultation_date, notes, priority } = await c.req.json()
  if (!patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(`INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, assigned_counselor, estimated_amount, consultation_date, priority) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, patient_name, patient_phone||'', patient_age||'', patient_gender||'', source_channel||'walk_in', treatment_type||'general', assigned_counselor||null, estimated_amount||null, consultation_date || new Date().toISOString().split('T')[0], priority||'normal').run()
  // Add initial note if provided
  if (notes) {
    const noteId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO consultation_notes (id, consultation_id, author_id, note_type, content) VALUES (?,?,?,?,?)').bind(noteId, id, user.id, 'general', notes).run()
  }
  return c.json({ id })
})

app.put('/api/protected/consultations/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const id = c.req.param('id')
  const updates: string[] = []
  const vals: any[] = []
  const fields = ['status','assigned_counselor','estimated_amount','agreed_amount','paid_amount','next_visit_date','priority','lost_reason','patient_phone','treatment_type']
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f}=?`); vals.push(body[f]) }
  }
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE consultations SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

app.delete('/api/protected/consultations/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM consultations WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 상담 노트
app.get('/api/protected/consultations/:id/notes', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`
    SELECT cn.*, u.name as author_name FROM consultation_notes cn
    LEFT JOIN users u ON cn.author_id = u.id
    WHERE cn.consultation_id = ?
    ORDER BY cn.created_at DESC
  `).bind(c.req.param('id')).all()
  return c.json(rows.results)
})

app.post('/api/protected/consultations/:id/notes', async (c) => {
  const user = c.get('user')!
  const { content, note_type } = await c.req.json()
  if (!content) return c.json({ error: '내용을 입력해주세요' }, 400)
  const noteId = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO consultation_notes (id, consultation_id, author_id, note_type, content) VALUES (?,?,?,?,?)').bind(noteId, c.req.param('id'), user.id, note_type||'general', content).run()
  return c.json({ id: noteId })
})

// 상담 전환율 통계
app.get('/api/protected/consultations/stats/conversion', async (c) => {
  const user = c.get('user')!
  const period = c.req.query('period') || new Date().toISOString().slice(0,7)
  const all = await c.env.DB.prepare(`
    SELECT status, source_channel, treatment_type, estimated_amount, agreed_amount, paid_amount
    FROM consultations WHERE hospital_id = ? AND consultation_date LIKE ?
  `).bind(user.hospitalId, period + '%').all()
  const rows = all.results as any[]
  const total = rows.length
  const visited = rows.filter(r => !['inquiry','reserved','cancelled'].includes(r.status)).length
  const agreed = rows.filter(r => ['agreed','payment','treatment','completed'].includes(r.status)).length
  const paid = rows.filter(r => ['payment','treatment','completed'].includes(r.status)).length
  const completed = rows.filter(r => r.status === 'completed').length
  const lost = rows.filter(r => r.status === 'lost').length
  const totalEstimated = rows.reduce((s: number, r: any) => s + (r.estimated_amount||0), 0)
  const totalAgreed = rows.reduce((s: number, r: any) => s + (r.agreed_amount||0), 0)
  const totalPaid = rows.reduce((s: number, r: any) => s + (r.paid_amount||0), 0)
  // By source
  const bySource: Record<string, { total: number; agreed: number; paid: number }> = {}
  rows.forEach(r => {
    if (!bySource[r.source_channel]) bySource[r.source_channel] = { total:0, agreed:0, paid:0 }
    bySource[r.source_channel].total++
    if (['agreed','payment','treatment','completed'].includes(r.status)) bySource[r.source_channel].agreed++
    if (['payment','treatment','completed'].includes(r.status)) bySource[r.source_channel].paid++
  })
  // By treatment
  const byTreatment: Record<string, { total: number; agreed: number; amount: number }> = {}
  rows.forEach(r => {
    if (!byTreatment[r.treatment_type]) byTreatment[r.treatment_type] = { total:0, agreed:0, amount:0 }
    byTreatment[r.treatment_type].total++
    if (['agreed','payment','treatment','completed'].includes(r.status)) { byTreatment[r.treatment_type].agreed++; byTreatment[r.treatment_type].amount += (r.agreed_amount||0) }
  })
  const canSeeFinancials = user.role === 'admin' || user.role === 'manager'
  return c.json({
    total, visited, agreed, paid, completed, lost,
    conversionRate: total ? Math.round(agreed/total*100) : 0,
    paymentRate: agreed ? Math.round(paid/agreed*100) : 0,
    totalEstimated: canSeeFinancials ? totalEstimated : null,
    totalAgreed: canSeeFinancials ? totalAgreed : null,
    totalPaid: canSeeFinancials ? totalPaid : null,
    bySource, byTreatment,
    canSeeFinancials
  })
})

/* ─── 연차/휴가 관리 ─── */

// 직원 목록 (연차 관리용 - admin/manager만)
app.get('/api/protected/leave/users', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, name, role, position, team, is_doctor, phone, hire_date FROM users WHERE hospital_id = ? AND is_active = 1 ORDER BY role, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 잔여일수 조회 (본인 or 관리자는 전체)
app.get('/api/protected/leave/balances', async (c) => {
  const user = c.get('user')!
  const year = c.req.query('year') || new Date().getFullYear().toString()
  const userId = c.req.query('user_id')
  
  if (userId && user.role !== 'admin' && user.role !== 'manager' && userId !== user.id) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  
  let query = 'SELECT lb.*, u.name as user_name, u.role as user_role FROM leave_balances lb JOIN users u ON lb.user_id = u.id WHERE lb.hospital_id = ? AND lb.year = ?'
  const params: any[] = [user.hospitalId, parseInt(year)]
  
  if (userId) {
    query += ' AND lb.user_id = ?'
    params.push(userId)
  } else if (user.role !== 'admin' && user.role !== 'manager') {
    query += ' AND lb.user_id = ?'
    params.push(user.id)
  }
  query += ' ORDER BY u.name, lb.leave_type'
  
  const rows = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(rows.results)
})

// 잔여일수 설정 (admin/manager만)
app.post('/api/protected/leave/balances', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const { user_id, year, leave_type, total_days } = await c.req.json()
  if (!user_id || !year || !leave_type) return c.json({ error: '필수 항목 누락' }, 400)
  
  const id = 'lb-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`
    INSERT INTO leave_balances (id, hospital_id, user_id, year, leave_type, total_days, used_days)
    VALUES (?,?,?,?,?,?,0)
    ON CONFLICT(user_id, year, leave_type) DO UPDATE SET total_days = ?, updated_at = CURRENT_TIMESTAMP
  `).bind(id, user.hospitalId, user_id, year, leave_type, total_days || 0, total_days || 0).run()
  return c.json({ success: true })
})

// 연차 신청 목록 (캘린더/리스트)
app.get('/api/protected/leave/requests', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month') // 2026-03 형식
  const status = c.req.query('status')
  const userId = c.req.query('user_id')
  
  let query = `SELECT lr.*, u.name as user_name, u.role as user_role, ap.name as approver_name 
    FROM leave_requests lr 
    JOIN users u ON lr.user_id = u.id 
    LEFT JOIN users ap ON lr.approved_by = ap.id 
    WHERE lr.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  
  // 일반 직원은 본인 것만
  if (user.role !== 'admin' && user.role !== 'manager') {
    query += ' AND lr.user_id = ?'
    params.push(user.id)
  }
  if (userId) { query += ' AND lr.user_id = ?'; params.push(userId) }
  if (status) { query += ' AND lr.status = ?'; params.push(status) }
  if (month) {
    query += ' AND (lr.start_date LIKE ? OR lr.end_date LIKE ?)'
    params.push(month + '%', month + '%')
  }
  query += ' ORDER BY lr.start_date DESC'
  
  const rows = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(rows.results)
})

// 연차 신청
app.post('/api/protected/leave/requests', async (c) => {
  const user = c.get('user')!
  const { leave_type, start_date, end_date, reason } = await c.req.json()
  if (!leave_type || !start_date || !end_date) return c.json({ error: '필수 항목 누락' }, 400)
  
  // 일수 계산
  let days = 1
  if (leave_type === 'half_am' || leave_type === 'half_pm') {
    days = 0.5
  } else {
    const s = new Date(start_date)
    const e = new Date(end_date)
    days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  }
  
  // 잔여일수 체크 (연차/병가만 - 반차는 연차에서 차감)
  const balType = (leave_type === 'half_am' || leave_type === 'half_pm') ? 'annual' : leave_type
  const year = new Date(start_date).getFullYear()
  const balance = await c.env.DB.prepare(
    'SELECT total_days, used_days FROM leave_balances WHERE user_id = ? AND year = ? AND leave_type = ?'
  ).bind(user.id, year, balType).first() as any
  
  if (balance && (balance.total_days - balance.used_days) < days) {
    return c.json({ error: `잔여 ${balType === 'annual' ? '연차' : '병가'}가 부족합니다 (잔여: ${balance.total_days - balance.used_days}일)` }, 400)
  }
  
  const id = 'lr-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`
    INSERT INTO leave_requests (id, hospital_id, user_id, leave_type, start_date, end_date, days, reason, status)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(id, user.hospitalId, user.id, leave_type, start_date, end_date, days, reason || '', 'pending').run()
  
  return c.json({ id, days })
})

// 연차 승인/반려 (admin/manager만)
app.put('/api/protected/leave/requests/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const id = c.req.param('id')
  const { status, reject_reason } = await c.req.json()
  
  if (!['approved','rejected'].includes(status)) return c.json({ error: '잘못된 상태' }, 400)
  
  // 기존 요청 조회
  const req = await c.env.DB.prepare('SELECT * FROM leave_requests WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!req) return c.json({ error: '요청을 찾을 수 없습니다' }, 404)
  if (req.status !== 'pending') return c.json({ error: '이미 처리된 요청입니다' }, 400)
  
  // 승인 시 잔여일수 차감
  if (status === 'approved') {
    const balType = (req.leave_type === 'half_am' || req.leave_type === 'half_pm') ? 'annual' : req.leave_type
    const year = new Date(req.start_date).getFullYear()
    await c.env.DB.prepare(
      'UPDATE leave_balances SET used_days = used_days + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND leave_type = ?'
    ).bind(req.days, req.user_id, year, balType).run()
  }
  
  await c.env.DB.prepare(
    'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, reject_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(status, user.id, reject_reason || '', id).run()
  
  return c.json({ success: true })
})

// 연차 취소 (본인만, pending만)
app.delete('/api/protected/leave/requests/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  
  const req = await c.env.DB.prepare('SELECT * FROM leave_requests WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!req) return c.json({ error: '요청을 찾을 수 없습니다' }, 404)
  
  // 본인만 취소 가능 (admin은 아무나)
  if (req.user_id !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  
  // 승인된 건 취소 시 잔여일수 복구
  if (req.status === 'approved') {
    const balType = (req.leave_type === 'half_am' || req.leave_type === 'half_pm') ? 'annual' : req.leave_type
    const year = new Date(req.start_date).getFullYear()
    await c.env.DB.prepare(
      'UPDATE leave_balances SET used_days = MAX(0, used_days - ?), updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND leave_type = ?'
    ).bind(req.days, req.user_id, year, balType).run()
  }
  
  await c.env.DB.prepare('UPDATE leave_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('cancelled', id).run()
  return c.json({ success: true })
})

// 연차 통계 (대시보드용)
app.get('/api/protected/leave/stats', async (c) => {
  const user = c.get('user')!
  const year = c.req.query('year') || new Date().getFullYear().toString()
  
  const pending = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM leave_requests WHERE hospital_id = ? AND status = ? AND start_date LIKE ?'
  ).bind(user.hospitalId, 'pending', year + '%').first() as any
  
  const today = new Date().toISOString().slice(0,10)
  const onLeave = await c.env.DB.prepare(
    `SELECT lr.*, u.name as user_name FROM leave_requests lr 
     JOIN users u ON lr.user_id = u.id 
     WHERE lr.hospital_id = ? AND lr.status = 'approved' AND lr.start_date <= ? AND lr.end_date >= ?`
  ).bind(user.hospitalId, today, today).all()
  
  return c.json({
    pendingCount: pending?.cnt || 0,
    onLeaveToday: onLeave.results
  })
})

/* ─── 회의/회의록 관리 ─── */

// 회의 목록 (공개범위 필터링 적용)
app.get('/api/protected/meetings', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  const status = c.req.query('status')
  
  let query = `SELECT m.*, u.name as creator_name,
    (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) as participant_count,
    (SELECT COUNT(*) FROM meeting_minutes WHERE meeting_id = m.id) as has_minutes
    FROM meetings m
    JOIN users u ON m.created_by = u.id
    WHERE m.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  
  // 공개범위 필터링
  if (user.role !== 'admin') {
    query += ` AND (m.visibility = 'all' OR (m.visibility = 'participants' AND EXISTS (SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.user_id = ?)) OR m.created_by = ?)`
    params.push(user.id, user.id)
  }
  if (month) { query += ' AND m.meeting_date LIKE ?'; params.push(month + '%') }
  if (status) { query += ' AND m.status = ?'; params.push(status) }
  query += ' ORDER BY m.meeting_date DESC, m.start_time DESC'
  
  const rows = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(rows.results)
})

// 회의 상세 (참가자 + 회의록)
app.get('/api/protected/meetings/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  
  const meeting = await c.env.DB.prepare('SELECT m.*, u.name as creator_name FROM meetings m JOIN users u ON m.created_by = u.id WHERE m.id = ? AND m.hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  
  // 공개범위 체크
  if (meeting.visibility === 'admin' && user.role !== 'admin') return c.json({ error: '접근 권한이 없습니다' }, 403)
  if (meeting.visibility === 'participants' && user.role !== 'admin') {
    const isParticipant = await c.env.DB.prepare('SELECT 1 FROM meeting_participants WHERE meeting_id = ? AND user_id = ?').bind(id, user.id).first()
    if (!isParticipant && meeting.created_by !== user.id) return c.json({ error: '접근 권한이 없습니다' }, 403)
  }
  
  const participants = await c.env.DB.prepare('SELECT mp.*, u.name as user_name, u.role as user_role FROM meeting_participants mp JOIN users u ON mp.user_id = u.id WHERE mp.meeting_id = ? ORDER BY mp.role, u.name').bind(id).all()
  const minutes = await c.env.DB.prepare('SELECT mm.*, u.name as writer_name FROM meeting_minutes mm JOIN users u ON mm.written_by = u.id WHERE mm.meeting_id = ? ORDER BY mm.created_at DESC').bind(id).all()
  
  return c.json({ ...meeting, participants: participants.results, minutes: minutes.results })
})

// 회의 생성
app.post('/api/protected/meetings', async (c) => {
  const user = c.get('user')!
  const { title, description, meeting_date, start_time, end_time, location, visibility, participants } = await c.req.json()
  if (!title || !meeting_date || !start_time) return c.json({ error: '필수 항목 누락' }, 400)
  
  const id = 'mt-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, visibility, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, title, description || '', meeting_date, start_time, end_time || '', location || '', visibility || 'all', user.id).run()
  
  // 주최자 자동 추가
  const orgId = 'mp-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(orgId, id, user.id, 'organizer').run()
  
  // 추가 참가자
  if (participants && Array.isArray(participants)) {
    for (const p of participants) {
      if (p.user_id === user.id) continue
      const pId = 'mp-' + crypto.randomUUID().slice(0,8)
      await c.env.DB.prepare('INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(pId, id, p.user_id, p.role || 'attendee').run()
    }
  }

  // 캘린더에 자동 등록
  const eventId = 'ev-' + crypto.randomUUID().slice(0,8)
  const eventTitle = '📝 ' + title
  const eventDesc = (location ? '장소: ' + location + '\n' : '') + (description || '')
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(eventId, user.hospitalId, eventTitle, eventDesc.trim(), 'meeting', meeting_date, meeting_date, 0, '#3b82f6', user.id).run()

  return c.json({ id })
})

// 회의 수정
app.put('/api/protected/meetings/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const meeting = await c.env.DB.prepare('SELECT * FROM meetings WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  if (meeting.created_by !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  
  const fields: string[] = []
  const vals: any[] = []
  for (const k of ['title','description','meeting_date','start_time','end_time','location','status','visibility']) {
    if (body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(body[k]) }
  }
  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP')
    vals.push(id, user.hospitalId)
    await c.env.DB.prepare(`UPDATE meetings SET ${fields.join(',')} WHERE id = ? AND hospital_id = ?`).bind(...vals).run()
  }
  return c.json({ success: true })
})

// 회의 삭제
app.delete('/api/protected/meetings/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const meeting = await c.env.DB.prepare('SELECT * FROM meetings WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  if (meeting.created_by !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  await c.env.DB.prepare('DELETE FROM meetings WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// 참가자 추가/출석 변경
app.put('/api/protected/meetings/:id/participants', async (c) => {
  const user = c.get('user')!
  const meetingId = c.req.param('id')
  const { user_id, role, attendance } = await c.req.json()
  
  if (attendance) {
    await c.env.DB.prepare('UPDATE meeting_participants SET attendance = ? WHERE meeting_id = ? AND user_id = ?').bind(attendance, meetingId, user_id || user.id).run()
  } else if (user_id) {
    const pId = 'mp-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare('INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(pId, meetingId, user_id, role || 'attendee').run()
  }
  return c.json({ success: true })
})

// 참가자 삭제
app.delete('/api/protected/meetings/:id/participants/:userId', async (c) => {
  const meetingId = c.req.param('id')
  const userId = c.req.param('userId')
  await c.env.DB.prepare('DELETE FROM meeting_participants WHERE meeting_id = ? AND user_id = ?').bind(meetingId, userId).run()
  return c.json({ success: true })
})

// 회의록 작성/수정
app.post('/api/protected/meetings/:id/minutes', async (c) => {
  const user = c.get('user')!
  const meetingId = c.req.param('id')
  const { content, decisions, action_items } = await c.req.json()
  
  // 기존 회의록이 있으면 업데이트
  const existing = await c.env.DB.prepare('SELECT id FROM meeting_minutes WHERE meeting_id = ?').bind(meetingId).first() as any
  if (existing) {
    await c.env.DB.prepare('UPDATE meeting_minutes SET content = ?, decisions = ?, action_items = ?, written_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(content || '', decisions || '', action_items || '', user.id, existing.id).run()
    return c.json({ id: existing.id, updated: true })
  }
  
  const id = 'mm-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO meeting_minutes (id, meeting_id, content, decisions, action_items, written_by) VALUES (?,?,?,?,?,?)')
    .bind(id, meetingId, content || '', decisions || '', action_items || '', user.id).run()
  
  // 회의 상태를 completed로 변경
  await c.env.DB.prepare("UPDATE meetings SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(meetingId).run()
  
  return c.json({ id })
})

// 회의록 파일 업로드
app.post('/api/protected/meetings/:id/minutes/upload', async (c) => {
  const user = c.get('user')!
  const meetingId = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  if (!file) return c.json({ error: '파일이 없습니다' }, 400)
  
  const ext = file.name.split('.').pop() || 'pdf'
  const key = `minutes/${user.hospitalId}/${crypto.randomUUID()}.${ext}`
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  
  const existing = await c.env.DB.prepare('SELECT id FROM meeting_minutes WHERE meeting_id = ?').bind(meetingId).first() as any
  if (existing) {
    await c.env.DB.prepare('UPDATE meeting_minutes SET file_url = ?, file_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(key, file.name, existing.id).run()
  } else {
    const id = 'mm-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare('INSERT INTO meeting_minutes (id, meeting_id, file_url, file_name, written_by) VALUES (?,?,?,?,?)').bind(id, meetingId, key, file.name, user.id).run()
  }
  return c.json({ success: true, file_url: key, file_name: file.name })
})

/* ═══ 수가표 (Fee Schedule) ═══ */

// 카테고리 목록
app.get('/api/protected/fee/categories', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM fee_categories WHERE hospital_id=? ORDER BY sort_order, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 카테고리 생성
app.post('/api/protected/fee/categories', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const { name, icon, color } = await c.req.json()
  if (!name) return c.json({ error: '카테고리명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO fee_categories (id, hospital_id, name, icon, color) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, name, icon||'🦷', color||'#3b82f6').run()
  return c.json({ id, name, icon, color })
})

// 카테고리 삭제
app.delete('/api/protected/fee/categories/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM fee_categories WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 수가 항목 목록
app.get('/api/protected/fee/items', async (c) => {
  const user = c.get('user')!
  const catId = c.req.query('category_id')
  let sql = 'SELECT fi.*, fc.name as category_name, fc.icon as category_icon FROM fee_items fi JOIN fee_categories fc ON fi.category_id=fc.id WHERE fi.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (catId) { sql += ' AND fi.category_id=?'; params.push(catId) }
  sql += ' ORDER BY fc.sort_order, fi.sort_order, fi.name'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

// 수가 항목 생성
app.post('/api/protected/fee/items', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const { category_id, name, base_price, discount_price, unit, duration_min, description } = await c.req.json()
  if (!category_id || !name) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO fee_items (id, hospital_id, category_id, name, base_price, discount_price, unit, duration_min, description) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, category_id, name, base_price||0, discount_price||null, unit||'개', duration_min||30, description||'').run()
  return c.json({ id, name, base_price })
})

// 수가 항목 수정
app.put('/api/protected/fee/items/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const sets: string[] = []; const vals: any[] = []
  for (const key of ['name','base_price','discount_price','unit','duration_min','description','is_active','sort_order']) {
    if (body[key] !== undefined) { sets.push(`${key}=?`); vals.push(body[key]) }
  }
  if (!sets.length) return c.json({ error: '변경 사항 없음' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE fee_items SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 수가 항목 삭제
app.delete('/api/protected/fee/items/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM fee_items WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══ 환자 퍼널 (Patient Funnel) ═══ */

const FUNNEL_STAGES = ['awareness','interest','appointment','visit','waiting','diagnosis','consultation','treatment','management','referral']

// 퍼널 목록
app.get('/api/protected/funnel', async (c) => {
  const user = c.get('user')!
  const stage = c.req.query('stage')
  const limit = parseInt(c.req.query('limit')||'50')
  let sql = 'SELECT pf.*, u.name as doctor_name FROM patient_funnel pf LEFT JOIN users u ON pf.assigned_doctor=u.id WHERE pf.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (stage) { sql += ' AND pf.current_stage=?'; params.push(stage) }
  sql += ' ORDER BY pf.updated_at DESC LIMIT ?'; params.push(limit)
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

// 퍼널 통계
app.get('/api/protected/funnel/stats', async (c) => {
  const user = c.get('user')!
  const period = c.req.query('period') || 'month'
  let dateFilter = ''
  const now = new Date()
  if (period === 'month') dateFilter = now.toISOString().slice(0,7)
  else if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    dateFilter = d.toISOString().slice(0,10)
  }
  const countSql = "SELECT current_stage, COUNT(*) as count FROM patient_funnel WHERE hospital_id=?" + (dateFilter ? " AND created_at >= ?" : "") + " GROUP BY current_stage"
  const params: any[] = [user.hospitalId]; if (dateFilter) params.push(dateFilter)
  const counts = await c.env.DB.prepare(countSql).bind(...params).all()
  const amountSql = "SELECT COALESCE(SUM(estimated_amount),0) as est, COALESCE(SUM(agreed_amount),0) as agreed, COALESCE(SUM(paid_amount),0) as paid FROM patient_funnel WHERE hospital_id=?" + (dateFilter ? " AND created_at >= ?" : "")
  const amounts: any = await c.env.DB.prepare(amountSql).bind(...params).first()
  const stageMap: any = {}
  ;(counts?.results||[]).forEach((r: any) => { stageMap[r.current_stage] = r.count })
  return c.json({ stages: stageMap, estimated: amounts?.est||0, agreed: amounts?.agreed||0, paid: amounts?.paid||0 })
})

// 퍼널 환자 등록
app.post('/api/protected/funnel', async (c) => {
  const user = c.get('user')!
  const { patient_name, phone, source, current_stage, treatment_type, assigned_doctor, estimated_amount, notes } = await c.req.json()
  if (!patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const stage = current_stage || 'awareness'
  const history = JSON.stringify([{ stage, at: new Date().toISOString(), by: user.id }])
  await c.env.DB.prepare(
    'INSERT INTO patient_funnel (id, hospital_id, patient_name, phone, source, current_stage, treatment_type, assigned_doctor, estimated_amount, notes, stage_history) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, patient_name, phone||'', source||'', stage, treatment_type||'', assigned_doctor||'', estimated_amount||0, notes||'', history).run()
  return c.json({ id, patient_name, current_stage: stage })
})

// 퍼널 단계 변경
app.put('/api/protected/funnel/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const row: any = await c.env.DB.prepare('SELECT * FROM patient_funnel WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!row) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  const sets: string[] = []; const vals: any[] = []
  for (const key of ['patient_name','phone','source','current_stage','treatment_type','assigned_doctor','estimated_amount','agreed_amount','paid_amount','notes']) {
    if (body[key] !== undefined) { sets.push(`${key}=?`); vals.push(body[key]) }
  }
  // 단계 변경 시 히스토리 추가
  if (body.current_stage && body.current_stage !== row.current_stage) {
    let history: any[] = []; try { history = JSON.parse(row.stage_history||'[]') } catch(e) {}
    history.push({ stage: body.current_stage, from: row.current_stage, at: new Date().toISOString(), by: user.id })
    sets.push('stage_history=?'); vals.push(JSON.stringify(history))
  }
  if (!sets.length) return c.json({ error: '변경 사항 없음' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE patient_funnel SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 퍼널 삭제
app.delete('/api/protected/funnel/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM patient_funnel WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Main Page (SPA) ─── */
app.get('*', async (c) => {
  // Serve static files from R2 first, then SPA
  if (c.req.path.startsWith('/static/')) {
    // handled by Cloudflare Pages automatically
  }
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Patient Funnel Manager</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/style.css" rel="stylesheet">
</head>
<body>
<div id="app"></div>
<script src="/static/app.js"><` + `/script>
<script src="/static/modules/dashboard.js"><` + `/script>
<script src="/static/modules/management.js"><` + `/script>
<script src="/static/modules/scripts.js"><` + `/script>
<script src="/static/modules/community.js"><` + `/script>
<script src="/static/modules/operations.js"><` + `/script>
<script src="/static/modules/hire.js"><` + `/script>
<script src="/static/modules/hr.js"><` + `/script>
<script src="/static/modules/clinical.js"><` + `/script>
<script src="/static/modules/leave.js"><` + `/script>
<script src="/static/modules/meetings.js"><` + `/script>
<script src="/static/modules/fee-schedule.js"><` + `/script>
<script src="/static/modules/funnel.js"><` + `/script>
<script src="/static/modules/settings.js"><` + `/script>
</body>
</html>`
}

export default app
