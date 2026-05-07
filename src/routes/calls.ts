import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeBody } from '../lib/middleware'

const calls = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 콜 기록 (Call Records) ═══ */

calls.get('/', async (c) => {
  const user = c.get('user')!
  const callType = sanitizeString(c.req.query('type') || 'inbound', 20)
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const staff = sanitizeString(c.req.query('staff') || '', 100)
  const purpose = sanitizeString(c.req.query('purpose') || '', 50)
  const reservationStatus = sanitizeString(c.req.query('reservation') || '', 30)
  const search = sanitizeString(c.req.query('search') || '', 200)

  let sql = 'SELECT id, call_date, call_type, patient_name, phone, patient_type, staff_name, treatment_interest, recognition_path, call_purpose, reservation_status, reservation_date, follow_up, comment, created_at FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ?'
  const params: any[] = [user.hospitalId, callType, month+'%']
  if (staff) { sql += ' AND staff_name=?'; params.push(staff) }
  if (purpose) { sql += ' AND call_purpose=?'; params.push(purpose) }
  if (reservationStatus) { sql += ' AND reservation_status=?'; params.push(reservationStatus) }
  if (search) { sql += ' AND (patient_name LIKE ? OR phone LIKE ? OR comment LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`) }
  sql += ' ORDER BY call_date DESC, created_at DESC LIMIT 500'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ records: rows.results })
})

calls.get('/stats', async (c) => {
  const user = c.get('user')!
  const callType = sanitizeString(c.req.query('type') || 'inbound', 20)
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const [total, byStaff, byReservation, byTreatment, byPatientType, byPurpose] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ?').bind(user.hospitalId, callType, month+'%').first(),
    c.env.DB.prepare('SELECT staff_name, COUNT(*) as c FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ? AND staff_name != "" GROUP BY staff_name ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT reservation_status, COUNT(*) as c FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ? GROUP BY reservation_status ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT treatment_interest, COUNT(*) as c FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ? AND treatment_interest != "" GROUP BY treatment_interest ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT patient_type, COUNT(*) as c FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ? AND patient_type != "" GROUP BY patient_type ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
    c.env.DB.prepare('SELECT call_purpose, COUNT(*) as c FROM call_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND call_type=? AND call_date LIKE ? AND call_purpose != "" GROUP BY call_purpose ORDER BY c DESC').bind(user.hospitalId, callType, month+'%').all(),
  ])
  return c.json({
    total: (total as any)?.c || 0,
    byStaff: byStaff.results, byReservation: byReservation.results,
    byTreatment: byTreatment.results, byPatientType: byPatientType.results, byPurpose: byPurpose.results,
  })
})

calls.post('/', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    call_type: { type: 'enum', values: ['inbound','outbound'] },
    call_date: { type: 'string', max: 20 },
    patient_name: { type: 'string', max: 100 },
    phone: { type: 'string', max: 20 },
    patient_type: { type: 'string', max: 30 },
    staff_name: { type: 'string', max: 100 },
    treatment_interest: { type: 'string', max: 200 },
    recognition_path: { type: 'string', max: 200 },
    call_purpose: { type: 'string', max: 100 },
    reservation_status: { type: 'string', max: 30 },
    reservation_date: { type: 'string', max: 20 },
    reservation_fulfilled: { type: 'string', max: 20 },
    follow_up: { type: 'string', max: 500 },
    comment: { type: 'string', max: 2000 },
  })
  if (!b.call_date) return c.json({ error: '날짜를 입력해주세요' }, 400)
  const id = 'call-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`
    INSERT INTO call_records (id, hospital_id, call_type, call_date, patient_name, phone, patient_type,
      staff_name, treatment_interest, recognition_path, call_purpose, reservation_status,
      reservation_date, reservation_fulfilled, follow_up, comment, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, user.hospitalId, b.call_type || 'inbound', b.call_date,
    b.patient_name || '', b.phone || '', b.patient_type || '',
    b.staff_name || '', b.treatment_interest || '', b.recognition_path || '',
    b.call_purpose || '', b.reservation_status || '',
    b.reservation_date || '', b.reservation_fulfilled || '',
    b.follow_up || '', b.comment || '', user.id
  ).run()
  return c.json({ success: true, id })
})

calls.put('/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const id = c.req.param('id')
  const allowedFields = ['call_date','patient_name','phone','patient_type','staff_name',
    'treatment_interest','recognition_path','call_purpose','reservation_status',
    'reservation_date','reservation_fulfilled','follow_up','comment']
  const updates: string[] = []; const vals: any[] = []
  for (const f of allowedFields) {
    if (raw[f] !== undefined) { updates.push(`${f}=?`); vals.push(sanitizeString(String(raw[f]), f === 'comment' ? 2000 : 200)) }
  }
  if (updates.length === 0) return c.json({ error: '수정할 내용이 없습니다' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE call_records SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

/**
 * 🏥 콜 기록 삭제 - 소프트 딜리트 + admin/manager 권한
 * 의료법: 환자 통화 기록도 진료 관련 정보로 보존 의무
 */
calls.delete('/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '콜 기록 삭제는 관리자/매니저만 가능합니다' }, 403)
  }
  const id = c.req.param('id')
  const exist: any = await c.env.DB.prepare('SELECT id FROM call_records WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).first()
  if (!exist) return c.json({ error: '콜 기록을 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare('UPDATE call_records SET is_deleted=1, deleted_at=?, deleted_by=? WHERE id=? AND hospital_id=?')
    .bind(new Date().toISOString(), user.id, id, user.hospitalId).run()
  return c.json({ success: true })
})

export default calls
