import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const complaints = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ═══ 컴플레인 기록 (Complaint Records) ═══

complaints.get('/', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  const part = sanitizeString(c.req.query('part') || '', 50)
  const status = sanitizeString(c.req.query('status') || '', 20)
  const search = sanitizeString(c.req.query('search') || '', 200)
  const page = sanitizeNumber(c.req.query('page'), 1, 1, 1000)
  const limit = sanitizeNumber(c.req.query('limit'), 50, 1, 200)
  const offset = (page - 1) * limit

  let where = 'hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (from) { where += ' AND complaint_date >= ?'; params.push(from) }
  if (to) { where += ' AND complaint_date <= ?'; params.push(to) }
  if (part) { where += ' AND part = ?'; params.push(part) }
  if (status) { where += ' AND status = ?'; params.push(status) }
  if (search) { where += " AND (patient_name LIKE ? OR description LIKE ? OR responder LIKE ? OR resolver LIKE ?)"; const s = `%${search}%`; params.push(s,s,s,s) }

  const [countResult, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM complaints WHERE ${where}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT * FROM complaints WHERE ${where} ORDER BY complaint_date DESC, created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
  ])
  return c.json({ total: (countResult as any)?.c || 0, data: rows.results, page, limit })
})

complaints.post('/', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    complaint_date: { type: 'string', max: 10 },
    patient_name: { type: 'string', max: 100 },
    part: { type: 'string', max: 50 },
    category: { type: 'string', max: 50 },
    description: { type: 'string', max: 5000 },
    responder: { type: 'string', max: 100 },
    resolver: { type: 'string', max: 100 },
    resolution: { type: 'string', max: 5000 },
    status: { type: 'enum', values: ['resolved','pending','in_progress','escalated'] },
    severity: { type: 'enum', values: ['low','normal','high','critical'] },
  })
  const id = 'cmp-' + crypto.randomUUID().slice(0,12)
  await c.env.DB.prepare(`INSERT INTO complaints (id, hospital_id, complaint_date, patient_name, part, category, description, responder, resolver, resolution, status, severity, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, b.complaint_date||'', b.patient_name||'', b.part||'', b.category||'', b.description||'', b.responder||'', b.resolver||'', b.resolution||'', b.status||'resolved', b.severity||'normal', user.id).run()
  return c.json({ success: true, id })
})

complaints.put('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    complaint_date: { type: 'string', max: 10 },
    patient_name: { type: 'string', max: 100 },
    part: { type: 'string', max: 50 },
    category: { type: 'string', max: 50 },
    description: { type: 'string', max: 5000 },
    responder: { type: 'string', max: 100 },
    resolver: { type: 'string', max: 100 },
    resolution: { type: 'string', max: 5000 },
    status: { type: 'enum', values: ['resolved','pending','in_progress','escalated'] },
    severity: { type: 'enum', values: ['low','normal','high','critical'] },
  })
  await c.env.DB.prepare(`UPDATE complaints SET complaint_date=?, patient_name=?, part=?, category=?, description=?, responder=?, resolver=?, resolution=?, status=?, severity=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`)
    .bind(b.complaint_date||'', b.patient_name||'', b.part||'', b.category||'', b.description||'', b.responder||'', b.resolver||'', b.resolution||'', b.status||'resolved', b.severity||'normal', id, user.hospitalId).run()
  return c.json({ success: true })
})

complaints.delete('/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM complaints WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

complaints.get('/stats', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let dateFilter = ''
  const params: any[] = [user.hospitalId]
  if (from && to) { dateFilter = ' AND complaint_date >= ? AND complaint_date <= ?'; params.push(from, to) }
  else if (from) { dateFilter = ' AND complaint_date >= ?'; params.push(from) }
  else if (to) { dateFilter = ' AND complaint_date <= ?'; params.push(to) }
  const baseWhere = 'hospital_id=?' + dateFilter
  const results = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM complaints WHERE ${baseWhere}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT part, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY part ORDER BY c DESC`).bind(...params).all(),
    c.env.DB.prepare(`SELECT category, COUNT(*) as c FROM complaints WHERE ${baseWhere} AND category != '' GROUP BY category ORDER BY c DESC`).bind(...params).all(),
    c.env.DB.prepare(`SELECT status, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY status ORDER BY c DESC`).bind(...params).all(),
    c.env.DB.prepare(`SELECT severity, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY severity ORDER BY c DESC`).bind(...params).all(),
    c.env.DB.prepare(`SELECT substr(complaint_date,1,7) as month, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY month ORDER BY month`).bind(...params).all(),
    c.env.DB.prepare(`SELECT CASE CAST(strftime('%w', complaint_date) AS INTEGER) WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' WHEN 6 THEN 'sat' END as dow, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY dow ORDER BY c DESC`).bind(...params).all(),
    c.env.DB.prepare(`SELECT responder, COUNT(*) as c FROM complaints WHERE ${baseWhere} AND responder != '' GROUP BY responder ORDER BY c DESC LIMIT 20`).bind(...params).all(),
    c.env.DB.prepare(`SELECT resolver, COUNT(*) as c FROM complaints WHERE ${baseWhere} AND resolver != '' GROUP BY resolver ORDER BY c DESC LIMIT 20`).bind(...params).all(),
    c.env.DB.prepare(`SELECT complaint_date, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY complaint_date ORDER BY complaint_date DESC LIMIT 90`).bind(...params).all(),
  ])
  return c.json({
    total: (results[0] as any)?.total || 0,
    byPart: results[1].results, byCategory: results[2].results,
    byStatus: results[3].results, bySeverity: results[4].results,
    monthlyTrend: results[5].results, byDayOfWeek: results[6].results,
    byResponder: results[7].results, byResolver: results[8].results,
    dailyTrend: results[9].results,
  })
})

export default complaints
