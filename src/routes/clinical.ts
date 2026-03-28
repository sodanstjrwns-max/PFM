import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const clinical = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Chairs ─── */
clinical.get('/chairs', async (c) => {
  const user = c.get('user')!
  const chairs = await c.env.DB.prepare('SELECT * FROM chairs WHERE hospital_id=? AND is_active=1 ORDER BY sort_order, chair_number').bind(user.hospitalId).all()
  return c.json(chairs.results)
})

clinical.post('/chairs', async (c) => {
  const user = c.get('user')!
  const { chair_number, floor, room_name } = await c.req.json()
  if (!chair_number) return c.json({ error: '체어 번호를 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)').bind(id, user.hospitalId, chair_number, floor||'', room_name||'', chair_number).run()
  return c.json({ id })
})

clinical.delete('/chairs/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('UPDATE chairs SET is_active=0 WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Doctors ─── */
clinical.get('/doctors', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, name, role FROM users WHERE hospital_id=? AND is_doctor=1 AND is_active=1 ORDER BY role, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

clinical.get('/doctors/on-duty', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10)
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat']
  const dayOfWeek = dayNames[new Date(date + 'T00:00:00').getDay()]
  const doctorRows = await c.env.DB.prepare(`SELECT id, name, role, work_schedule FROM users WHERE hospital_id=? AND is_doctor=1 AND is_active=1 AND work_status='active' ORDER BY role DESC, name`).bind(user.hospitalId).all()
  const doctors = doctorRows.results as any[]
  const attRows = await c.env.DB.prepare(`SELECT user_id, status, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?`).bind(user.hospitalId, date).all()
  const attMap: Record<string, any> = {}
  for (const a of attRows.results as any[]) attMap[a.user_id] = a
  const leaveRows = await c.env.DB.prepare(`SELECT user_id FROM leave_requests WHERE hospital_id=? AND status='approved' AND start_date<=? AND end_date>=?`).bind(user.hospitalId, date, date).all()
  const onLeaveSet = new Set((leaveRows.results as any[]).map((r: any) => r.user_id))
  const result = doctors.map((d: any) => {
    let schedule: any = {}; try { schedule = JSON.parse(d.work_schedule || '{}') } catch(e) {}
    const todaySchedule = schedule[dayOfWeek] || null
    const isScheduledOff = todaySchedule === null
    const isOnLeave = onLeaveSet.has(d.id) || (attMap[d.id]?.status === 'vacation')
    const att = attMap[d.id]
    const isPresent = att && ['present','late','half_day'].includes(att.status)
    let status = 'scheduled'
    if (isScheduledOff) status = 'day_off'
    else if (isOnLeave) status = 'vacation'
    else if (isPresent) status = 'on_duty'
    return { id: d.id, name: d.name, role: d.role, status, check_in: att?.check_in || null, today_schedule: todaySchedule }
  })
  return c.json(result)
})

/* ─── Treatment Board ─── */
clinical.get('/treatment-board', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const rows = await c.env.DB.prepare(`SELECT tb.*, c.chair_number, c.floor, c.room_name, d.name as doctor_name, s.name as staff_name FROM treatment_board tb LEFT JOIN chairs c ON tb.chair_id = c.id LEFT JOIN users d ON tb.assigned_doctor = d.id LEFT JOIN users s ON tb.assigned_staff = s.id WHERE tb.hospital_id = ? AND tb.board_date = ? ORDER BY tb.sort_order ASC, tb.appointment_time ASC`).bind(user.hospitalId, date).all()
  return c.json(rows.results)
})

clinical.post('/treatment-board', async (c) => {
  const user = c.get('user')!
  const { patient_name, patient_type, chart_number, chair_id, assigned_doctor, assigned_staff, treatment_desc, treatment_type, appointment_time, notes, priority, board_date } = await c.req.json()
  if (!patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const date = board_date || new Date().toISOString().split('T')[0]
  const maxSort = await c.env.DB.prepare(
    assigned_doctor
      ? 'SELECT COALESCE(MAX(sort_order),0) as mx FROM treatment_board WHERE hospital_id=? AND board_date=? AND assigned_doctor=?'
      : 'SELECT COALESCE(MAX(sort_order),0) as mx FROM treatment_board WHERE hospital_id=? AND board_date=? AND assigned_doctor IS NULL'
  ).bind(...(assigned_doctor ? [user.hospitalId, date, assigned_doctor] : [user.hospitalId, date])).first() as any
  const sortOrder = (maxSort?.mx || 0) + 1
  await c.env.DB.prepare(`INSERT INTO treatment_board (id, hospital_id, chair_id, board_date, patient_name, patient_type, chart_number, assigned_doctor, assigned_staff, treatment_desc, treatment_type, appointment_time, notes, priority, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, chair_id||null, date, patient_name, patient_type||'existing', chart_number||'', assigned_doctor||null, assigned_staff||null, treatment_desc||'', treatment_type||'general', appointment_time||null, notes||'', priority||'normal', sortOrder).run()
  return c.json({ id })
})

clinical.put('/treatment-board/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const id = c.req.param('id')
  const updates: string[] = []; const vals: any[] = []
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

clinical.put('/treatment-board-reorder', async (c) => {
  const user = c.get('user')!
  const { items } = await c.req.json()
  if (!Array.isArray(items)) return c.json({ error: 'items 배열이 필요합니다' }, 400)
  const stmts = items.map((item: any) =>
    c.env.DB.prepare('UPDATE treatment_board SET assigned_doctor=?, sort_order=?, updated_at=? WHERE id=? AND hospital_id=?')
      .bind(item.assigned_doctor || null, item.sort_order, new Date().toISOString(), item.id, user.hospitalId)
  )
  await c.env.DB.batch(stmts)
  return c.json({ success: true })
})

clinical.delete('/treatment-board/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM treatment_board WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

clinical.get('/treatment-board/stats', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const stats = await c.env.DB.prepare(`SELECT status, COUNT(*) as count FROM treatment_board WHERE hospital_id=? AND board_date=? GROUP BY status`).bind(user.hospitalId, date).all()
  const total = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM treatment_board WHERE hospital_id=? AND board_date=?').bind(user.hospitalId, date).first()
  return c.json({ stats: stats.results, total: (total as any)?.cnt || 0 })
})

export default clinical
