import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'

const clinical = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Chairs ─── */
clinical.get('/chairs', async (c) => {
  const user = c.get('user')!
  const chairs = await c.env.DB.prepare('SELECT id, chair_number, floor, room_name, is_active, sort_order FROM chairs WHERE hospital_id=? AND is_active=1 ORDER BY sort_order, chair_number').bind(user.hospitalId).all()
  return c.json(chairs.results)
})

clinical.post('/chairs', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    chair_number: { type: 'number', min: 1, max: 999 },
    floor: { type: 'string', max: 20 },
    room_name: { type: 'string', max: 100 },
  })
  if (!b.chair_number) return c.json({ error: '체어 번호를 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)').bind(id, user.hospitalId, b.chair_number, b.floor||'', b.room_name||'', b.chair_number).run()
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
  const date = sanitizeString(c.req.query('date') || new Date().toISOString().slice(0, 10), 10)
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat']
  const dayOfWeek = dayNames[new Date(date + 'T00:00:00').getDay()]
  const [doctorRows, attRows, leaveRows] = await Promise.all([
    c.env.DB.prepare(`SELECT id, name, role, work_schedule FROM users WHERE hospital_id=? AND is_doctor=1 AND is_active=1 AND work_status='active' ORDER BY role DESC, name`).bind(user.hospitalId).all(),
    c.env.DB.prepare(`SELECT user_id, status, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?`).bind(user.hospitalId, date).all(),
    c.env.DB.prepare(`SELECT user_id FROM leave_requests WHERE hospital_id=? AND status='approved' AND start_date<=? AND end_date>=?`).bind(user.hospitalId, date, date).all(),
  ])
  const doctors = doctorRows.results as any[]
  const attMap: Record<string, any> = {}
  for (const a of attRows.results as any[]) attMap[a.user_id] = a
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
  const date = sanitizeString(c.req.query('date') || new Date().toISOString().split('T')[0], 10)
  const rows = await c.env.DB.prepare(`SELECT tb.*, c.chair_number, c.floor, c.room_name, d.name as doctor_name, s.name as staff_name FROM treatment_board tb LEFT JOIN chairs c ON tb.chair_id = c.id LEFT JOIN users d ON tb.assigned_doctor = d.id LEFT JOIN users s ON tb.assigned_staff = s.id WHERE tb.hospital_id = ? AND tb.board_date = ? ORDER BY tb.sort_order ASC, tb.appointment_time ASC`).bind(user.hospitalId, date).all()
  return c.json(rows.results)
})

clinical.post('/treatment-board', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    patient_name: { type: 'string', max: 100 },
    patient_type: { type: 'enum', values: ['new','existing'] },
    chart_number: { type: 'string', max: 50 },
    chair_id: { type: 'string', max: 100 },
    assigned_doctor: { type: 'string', max: 100 },
    assigned_staff: { type: 'string', max: 100 },
    treatment_desc: { type: 'string', max: 500 },
    treatment_type: { type: 'string', max: 50 },
    appointment_time: { type: 'string', max: 10 },
    notes: { type: 'string', max: 2000 },
    priority: { type: 'enum', values: ['normal','high','urgent'] },
    board_date: { type: 'string', max: 10 },
  })
  if (!b.patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const date = b.board_date || new Date().toISOString().split('T')[0]
  const maxSort = await c.env.DB.prepare(
    b.assigned_doctor
      ? 'SELECT COALESCE(MAX(sort_order),0) as mx FROM treatment_board WHERE hospital_id=? AND board_date=? AND assigned_doctor=?'
      : 'SELECT COALESCE(MAX(sort_order),0) as mx FROM treatment_board WHERE hospital_id=? AND board_date=? AND assigned_doctor IS NULL'
  ).bind(...(b.assigned_doctor ? [user.hospitalId, date, b.assigned_doctor] : [user.hospitalId, date])).first() as any
  const sortOrder = (maxSort?.mx || 0) + 1
  await c.env.DB.prepare(`INSERT INTO treatment_board (id, hospital_id, chair_id, board_date, patient_name, patient_type, chart_number, assigned_doctor, assigned_staff, treatment_desc, treatment_type, appointment_time, notes, priority, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, b.chair_id||null, date, b.patient_name, b.patient_type||'existing', b.chart_number||'', b.assigned_doctor||null, b.assigned_staff||null, b.treatment_desc||'', b.treatment_type||'general', b.appointment_time||null, b.notes||'', b.priority||'normal', sortOrder).run()
  return c.json({ id })
})

clinical.put('/treatment-board/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const id = c.req.param('id')
  const updates: string[] = []; const vals: any[] = []
  const fieldMap: Record<string, number> = { status:50, chair_id:100, assigned_doctor:100, assigned_staff:100, treatment_desc:500, notes:2000, priority:20, sort_order:-1 }
  for (const [k, maxLen] of Object.entries(fieldMap)) {
    if (raw[k] !== undefined) {
      const val = maxLen === -1 ? sanitizeNumber(raw[k], 0, 0, 9999) : sanitizeString(String(raw[k]), maxLen)
      updates.push(`${k}=?`); vals.push(val)
    }
  }
  if (raw.status === 'arrived') { updates.push('arrived_at=?'); vals.push(new Date().toISOString()) }
  if (raw.status === 'in_treatment') { updates.push('treatment_started_at=?'); vals.push(new Date().toISOString()) }
  if (raw.status === 'completed') { updates.push('completed_at=?'); vals.push(new Date().toISOString()) }
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE treatment_board SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

clinical.put('/treatment-board-reorder', async (c) => {
  const user = c.get('user')!
  const { items } = await c.req.json()
  if (!Array.isArray(items)) return c.json({ error: 'items 배열이 필요합니다' }, 400)
  if (items.length > 200) return c.json({ error: '한 번에 200개까지 가능합니다' }, 400)
  const stmts = items.map((item: any) =>
    c.env.DB.prepare('UPDATE treatment_board SET assigned_doctor=?, sort_order=?, updated_at=? WHERE id=? AND hospital_id=?')
      .bind(sanitizeString(item.assigned_doctor || '', 100) || null, sanitizeNumber(item.sort_order, 0, 0, 9999), new Date().toISOString(), sanitizeString(item.id, 100), user.hospitalId)
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
  const date = sanitizeString(c.req.query('date') || new Date().toISOString().split('T')[0], 10)
  const [stats, total] = await Promise.all([
    c.env.DB.prepare(`SELECT status, COUNT(*) as count FROM treatment_board WHERE hospital_id=? AND board_date=? GROUP BY status`).bind(user.hospitalId, date).all(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM treatment_board WHERE hospital_id=? AND board_date=?').bind(user.hospitalId, date).first(),
  ])
  return c.json({ stats: stats.results, total: (total as any)?.cnt || 0 })
})

export default clinical
