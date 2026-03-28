import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const calls = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 콜 기록 (Call Records) ═══ */

// 콜 기록 목록 (월별, 타입별)
calls.get('/api/protected/calls', async (c) => {
  const user = c.get('user')!
  const callType = c.req.query('type') || 'inbound'
  const month = c.req.query('month') || new Date().toISOString().slice(0,7)
  const staff = c.req.query('staff')
  const purpose = c.req.query('purpose')
  const reservationStatus = c.req.query('reservation')
  const search = c.req.query('search')

  let sql = 'SELECT * FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ?'
  const params: any[] = [user.hospitalId, callType, month+'%']
  if (staff) { sql += ' AND staff_name=?'; params.push(staff) }
  if (purpose) { sql += ' AND call_purpose=?'; params.push(purpose) }
  if (reservationStatus) { sql += ' AND reservation_status=?'; params.push(reservationStatus) }
  if (search) { sql += ' AND (patient_name LIKE ? OR phone LIKE ? OR comment LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`) }
  sql += ' ORDER BY call_date DESC, created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ records: rows.results })
})

// 콜 기록 통계
calls.get('/stats', async (c) => {
  const user = c.get('user')!
  const callType = c.req.query('type') || 'inbound'
  const month = c.req.query('month') || new Date().toISOString().slice(0,7)
  const [total, byStaff, byReservation, byTreatment, byPatientType, byPurpose] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ?').bind(user.hospitalId, callType, month+'%').first(),
    c.env.DB.prepare('SELECT staff_name, COUNT(*) as c FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ? AND staff_name != "" GROUP BY staff_name ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT reservation_status, COUNT(*) as c FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ? GROUP BY reservation_status ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT treatment_interest, COUNT(*) as c FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ? AND treatment_interest != "" GROUP BY treatment_interest ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT patient_type, COUNT(*) as c FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ? AND patient_type != "" GROUP BY patient_type ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT call_purpose, COUNT(*) as c FROM call_records WHERE hospital_id=? AND call_type=? AND call_date LIKE ? AND call_purpose != "" GROUP BY call_purpose ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
  ])
  return c.json({
    total: (total as any)?.c || 0,
    byStaff: byStaff.results,
    byReservation: byReservation.results,
    byTreatment: byTreatment.results,
    byPatientType: byPatientType.results,
    byPurpose: byPurpose.results,
  })
})

// 콜 기록 등록
calls.post('/api/protected/calls', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  if (!body.call_date) return c.json({ error: '날짜를 입력해주세요' }, 400)
  const id = 'call-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`
    INSERT INTO call_records (id, hospital_id, call_type, call_date, patient_name, phone, patient_type,
      staff_name, treatment_interest, recognition_path, call_purpose, reservation_status,
      reservation_date, reservation_fulfilled, follow_up, comment, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, user.hospitalId,
    body.call_type || 'inbound',
    body.call_date,
    body.patient_name || '', body.phone || '', body.patient_type || '',
    body.staff_name || '', body.treatment_interest || '', body.recognition_path || '',
    body.call_purpose || '', body.reservation_status || '',
    body.reservation_date || '', body.reservation_fulfilled || '',
    body.follow_up || '', body.comment || '', user.id
  ).run()
  return c.json({ success: true, id })
})

// 콜 기록 수정
calls.put('/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const id = c.req.param('id')
  const fields = ['call_date','patient_name','phone','patient_type','staff_name',
    'treatment_interest','recognition_path','call_purpose','reservation_status',
    'reservation_date','reservation_fulfilled','follow_up','comment']
  const updates: string[] = []; const vals: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f}=?`); vals.push(body[f]) }
  }
  if (updates.length === 0) return c.json({ error: '수정할 내용이 없습니다' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE call_records SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 콜 기록 삭제
calls.delete('/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM call_records WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})


export default calls
