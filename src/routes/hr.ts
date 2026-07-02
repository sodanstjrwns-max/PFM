import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeBody } from '../lib/middleware'

const hr = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// HR 대시보드
hr.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const today = sanitizeString(c.req.query('date') || new Date().toISOString().slice(0,10), 10)
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat']
  const dayOfWeek = dayNames[new Date(today + 'T00:00:00').getDay()]
  // v5.6.1: 3개 독립 쿼리 병렬 실행 (직렬 3 RTT → 1 RTT)
  const [staffRows, attRows, leaveRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, name, role, position, team, work_schedule, is_doctor, hire_date FROM users WHERE hospital_id=? AND is_active=1 AND work_status='active' ORDER BY role DESC, team, name`
    ).bind(user.hospitalId).all(),
    c.env.DB.prepare(`SELECT user_id, status, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?`).bind(user.hospitalId, today).all(),
    c.env.DB.prepare(`SELECT user_id FROM leave_requests WHERE hospital_id=? AND status='approved' AND start_date<=? AND end_date>=?`).bind(user.hospitalId, today, today).all(),
  ])
  const staff = staffRows.results as any[]
  const attMap: Record<string, any> = {}
  for (const a of attRows.results as any[]) attMap[a.user_id] = a
  const onLeaveSet = new Set((leaveRows.results as any[]).map((r: any) => r.user_id))
  const members = staff.map((s: any) => {
    let schedule: any = {}
    try { schedule = JSON.parse(s.work_schedule || '{}') } catch(e) {}
    const todaySchedule = schedule[dayOfWeek] || null
    const isScheduledOff = todaySchedule === null
    const isOnLeave = onLeaveSet.has(s.id) || (attMap[s.id]?.status === 'vacation')
    const att = attMap[s.id]
    const isPresent = att && ['present','late','half_day'].includes(att.status)
    let todayStatus = 'not_yet'
    if (isScheduledOff) todayStatus = 'day_off'
    else if (isOnLeave) todayStatus = 'vacation'
    else if (isPresent) todayStatus = att.status
    return { id: s.id, name: s.name, role: s.role, position: s.position, team: s.team, is_doctor: s.is_doctor, hire_date: s.hire_date, today_status: todayStatus, check_in: att?.check_in || null, today_schedule: todaySchedule }
  })
  const teams: Record<string, {total:number, present:number, vacation:number, day_off:number, late:number}> = {}
  let totalAll = 0, presentAll = 0, vacationAll = 0, dayOffAll = 0, lateAll = 0
  for (const m of members) {
    const t = m.team || 'etc'
    if (!teams[t]) teams[t] = {total:0, present:0, vacation:0, day_off:0, late:0}
    teams[t].total++; totalAll++
    if (m.today_status === 'present' || m.today_status === 'late' || m.today_status === 'half_day') { teams[t].present++; presentAll++ }
    if (m.today_status === 'late') { teams[t].late++; lateAll++ }
    if (m.today_status === 'vacation') { teams[t].vacation++; vacationAll++ }
    if (m.today_status === 'day_off') { teams[t].day_off++; dayOffAll++ }
  }
  return c.json({ date: today, summary: { total: totalAll, present: presentAll, vacation: vacationAll, day_off: dayOffAll, late: lateAll, working: presentAll }, teams, members })
})

// 직원 목록
hr.get('/staff', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT id, name, email, role, position, team, phone, hire_date, work_schedule, work_status, is_doctor, is_active, created_at FROM users WHERE hospital_id=? ORDER BY role DESC, team, name`
  ).bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 내 정보 조회
hr.get('/me', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.position, u.team, u.phone, u.hire_date, u.work_schedule, u.work_status, u.is_doctor, u.created_at, h.name as hospital_name FROM users u JOIN hospitals h ON u.hospital_id=h.id WHERE u.id=?`
  ).bind(user.id).first()
  if (!row) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)
  let schedule: any = {}
  try { schedule = JSON.parse(row.work_schedule || '{}') } catch(e) {}
  return c.json({ ...row, work_schedule: schedule })
})

// 내 정보 수정
hr.put('/me', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const allowed = ['name','phone','work_schedule']
  const fields: string[] = []; const vals: any[] = []
  for (const k of allowed) {
    if (body[k] !== undefined) {
      const v = k === 'work_schedule' && typeof body[k] === 'object' ? JSON.stringify(body[k]) : sanitizeString(String(body[k]), 200)
      fields.push(`${k} = ?`); vals.push(v)
    }
  }
  if (fields.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(user.id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 직원 프로필 업데이트
hr.put('/staff/:id', async (c) => {
  const user = c.get('user')!
  const targetId = c.req.param('id')
  const isManagerLike = user.role === 'admin' || user.role === 'manager'
  if (!isManagerLike && user.id !== targetId) return c.json({ error: '권한이 없습니다' }, 403)
  const body = await c.req.json()
  // 🔒 권한 상승 방지: 민감 필드(role/is_active/work_status/hire_date)는 관리자/매니저만 수정 가능
  //    (일반 직원이 본인 계정으로 role=admin 셀프 승격하는 구멍 차단)
  const SENSITIVE = ['role', 'is_active', 'work_status', 'hire_date']
  if (!isManagerLike && SENSITIVE.some(k => body[k] !== undefined)) {
    return c.json({ error: '직급/재직 상태 변경은 관리자/매니저만 가능합니다' }, 403)
  }
  if (body.role !== undefined) {
    if (!['admin','manager','staff'].includes(body.role)) return c.json({ error: '유효하지 않은 역할입니다' }, 400)
    // 초대 코드 정책과 동일: 매니저는 admin 부여 불가
    if (user.role === 'manager' && body.role === 'admin') {
      return c.json({ error: '매니저는 관리자 권한을 부여할 수 없습니다' }, 403)
    }
  }
  // 매니저는 admin 계정을 수정할 수 없음 (하극상 방지)
  if (user.role === 'manager' && user.id !== targetId) {
    const target: any = await c.env.DB.prepare('SELECT role FROM users WHERE id=? AND hospital_id=?').bind(targetId, user.hospitalId).first()
    if (!target) return c.json({ error: '직원을 찾을 수 없습니다' }, 404)
    if (target.role === 'admin') return c.json({ error: '관리자 계정은 수정할 수 없습니다' }, 403)
  }
  const fields: string[] = []; const vals: any[] = []
  for (const k of ['position','team','phone','hire_date','work_schedule','work_status','is_active','role','name']) {
    if (body[k] !== undefined) {
      const v = k === 'work_schedule' && typeof body[k] === 'object' ? JSON.stringify(body[k]) : sanitizeString(String(body[k]), k === 'name' ? 100 : 200)
      fields.push(`${k} = ?`); vals.push(v)
    }
  }
  if (fields.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(targetId, user.hospitalId)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 초대 코드 생성 (v2: 다인용 + 만료일 + 메모)
hr.post('/invite', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    role: { type: 'enum', values: ['admin','manager','staff'] },
    position: { type: 'string', max: 100 },
    team: { type: 'string', max: 100 },
    max_uses: { type: 'number', min: 1, max: 100, default: 1 },
    expires_days: { type: 'number', min: 1, max: 90, default: 7 },
    memo: { type: 'string', max: 200 },
  })
  // manager는 admin 권한의 초대 불가
  if (user.role === 'manager' && b.role === 'admin') {
    return c.json({ error: '실장은 원장(admin) 권한의 초대를 만들 수 없습니다' }, 403)
  }
  const id = 'inv-' + crypto.randomUUID().slice(0,8)
  // 🔒 CSPRNG 기반 초대코드 (Math.random은 예측 가능 → 무차별 대입에 취약했음)
  // 혼동 문자(0/O, 1/I/L) 제외 30자 알파벳 × 8자리 = 6.5×10^11 조합
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ2345678'
  const rand = crypto.getRandomValues(new Uint8Array(8))
  const code = [...rand].map(b => ALPHABET[b % ALPHABET.length]).join('')
  const days = b.expires_days || 7
  const expiresAt = new Date(Date.now() + days*24*60*60*1000).toISOString()
  const maxUses = b.max_uses || 1
  await c.env.DB.prepare(
    'INSERT INTO staff_invites (id, hospital_id, invite_code, role, position, team, created_by, expires_at, max_uses, use_count, status, memo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, code, b.role||'staff', b.position||'', b.team||'', user.id, expiresAt, maxUses, 0, 'active', b.memo || '').run()
  return c.json({ id, invite_code: code, expires_at: expiresAt, max_uses: maxUses, memo: b.memo || '' })
})

// 초대 코드 목록 (v2: 사용 이력 포함)
hr.get('/invites', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`
    SELECT si.*, u1.name as created_by_name, u2.name as used_by_name, ur.name as revoked_by_name,
      (SELECT COUNT(*) FROM staff_invite_uses WHERE invite_id = si.id) as actual_use_count
    FROM staff_invites si
    JOIN users u1 ON si.created_by=u1.id
    LEFT JOIN users u2 ON si.used_by=u2.id
    LEFT JOIN users ur ON si.revoked_by=ur.id
    WHERE si.hospital_id=?
    ORDER BY si.created_at DESC
  `).bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 초대 코드 사용 이력 (특정 코드를 누가 사용했는지)
hr.get('/invites/:id/uses', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const inviteId = c.req.param('id')
  // 본인 병원 소속 확인 (IDOR 방어)
  const invite = await c.env.DB.prepare('SELECT id FROM staff_invites WHERE id=? AND hospital_id=?').bind(inviteId, user.hospitalId).first()
  if (!invite) return c.json({ error: '초대 코드를 찾을 수 없습니다' }, 404)
  const rows = await c.env.DB.prepare(`
    SELECT siu.*, u.name as user_name, u.email as user_email, u.position, u.team
    FROM staff_invite_uses siu
    JOIN users u ON siu.user_id = u.id
    WHERE siu.invite_id = ? AND siu.hospital_id = ?
    ORDER BY siu.used_at DESC
  `).bind(inviteId, user.hospitalId).all()
  return c.json(rows.results)
})

// 초대 코드 취소 (revoke)
hr.delete('/invites/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const inviteId = c.req.param('id')
  const invite: any = await c.env.DB.prepare('SELECT * FROM staff_invites WHERE id=? AND hospital_id=?').bind(inviteId, user.hospitalId).first()
  if (!invite) return c.json({ error: '초대 코드를 찾을 수 없습니다' }, 404)
  if (invite.status === 'revoked') return c.json({ error: '이미 취소된 초대 코드입니다' }, 400)
  await c.env.DB.prepare(
    'UPDATE staff_invites SET status=?, revoked_at=CURRENT_TIMESTAMP, revoked_by=? WHERE id=? AND hospital_id=?'
  ).bind('revoked', user.id, inviteId, user.hospitalId).run()
  return c.json({ success: true })
})

// 출퇴근
hr.post('/attendance/check', async (c) => {
  const user = c.get('user')!
  const today = new Date().toISOString().slice(0,10)
  const now = new Date().toTimeString().slice(0,5)
  const existing: any = await c.env.DB.prepare('SELECT * FROM attendance WHERE user_id=? AND date=?').bind(user.id, today).first()
  if (!existing) {
    const id = 'att-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare('INSERT INTO attendance (id, hospital_id, user_id, date, check_in, status) VALUES (?,?,?,?,?,?)').bind(id, user.hospitalId, user.id, today, now, 'present').run()
    return c.json({ action: 'check_in', time: now })
  } else if (!existing.check_out) {
    await c.env.DB.prepare('UPDATE attendance SET check_out=? WHERE id=?').bind(now, existing.id).run()
    return c.json({ action: 'check_out', time: now })
  }
  return c.json({ action: 'already_done', check_in: existing.check_in, check_out: existing.check_out })
})

// 출근 현황
hr.get('/attendance', async (c) => {
  const user = c.get('user')!
  const date = sanitizeString(c.req.query('date') || new Date().toISOString().slice(0,10), 10)
  const rows = await c.env.DB.prepare(`SELECT a.*, u.name as user_name, u.position, u.team FROM attendance a JOIN users u ON a.user_id=u.id WHERE a.hospital_id=? AND a.date=? ORDER BY a.check_in`).bind(user.hospitalId, date).all()
  return c.json(rows.results)
})

export default hr
