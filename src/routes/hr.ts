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
  const staffRows = await c.env.DB.prepare(
    `SELECT id, name, role, position, team, work_schedule, is_doctor, hire_date FROM users WHERE hospital_id=? AND is_active=1 AND work_status='active' ORDER BY role DESC, team, name`
  ).bind(user.hospitalId).all()
  const staff = staffRows.results as any[]
  const attRows = await c.env.DB.prepare(`SELECT user_id, status, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?`).bind(user.hospitalId, today).all()
  const attMap: Record<string, any> = {}
  for (const a of attRows.results as any[]) attMap[a.user_id] = a
  const leaveRows = await c.env.DB.prepare(`SELECT user_id FROM leave_requests WHERE hospital_id=? AND status='approved' AND start_date<=? AND end_date>=?`).bind(user.hospitalId, today, today).all()
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
  fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(user.id)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 직원 프로필 업데이트
hr.put('/staff/:id', async (c) => {
  const user = c.get('user')!
  const targetId = c.req.param('id')
  if (user.role !== 'admin' && user.role !== 'manager' && user.id !== targetId) return c.json({ error: '권한이 없습니다' }, 403)
  const body = await c.req.json()
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

// 초대 코드 생성
hr.post('/invite', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    role: { type: 'enum', values: ['admin','manager','staff'] },
    position: { type: 'string', max: 100 },
    team: { type: 'string', max: 100 },
  })
  const id = 'inv-' + crypto.randomUUID().slice(0,8)
  const code = Math.random().toString(36).slice(2,8).toUpperCase()
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000).toISOString()
  await c.env.DB.prepare('INSERT INTO staff_invites (id, hospital_id, invite_code, role, position, team, created_by, expires_at) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, code, b.role||'staff', b.position||'', b.team||'', user.id, expiresAt).run()
  return c.json({ invite_code: code, expires_at: expiresAt })
})

// 초대 코드 목록
hr.get('/invites', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT si.*, u1.name as created_by_name, u2.name as used_by_name FROM staff_invites si JOIN users u1 ON si.created_by=u1.id LEFT JOIN users u2 ON si.used_by=u2.id WHERE si.hospital_id=? ORDER BY si.created_at DESC`).bind(user.hospitalId).all()
  return c.json(rows.results)
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
