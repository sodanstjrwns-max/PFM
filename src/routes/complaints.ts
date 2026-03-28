import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const complaints = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ═══ 컴플레인 기록 (Complaint Records) ═══

// 컴플레인 목록
complaints.get('/api/protected/complaints', async (c) => {
  const user = c.get('user')!
  const from = c.req.query('from') || ''
  const to = c.req.query('to') || ''
  const part = c.req.query('part') || ''
  const status = c.req.query('status') || ''
  const search = c.req.query('search') || ''
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
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

// 컴플레인 등록
complaints.post('/api/protected/complaints', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const id = 'cmp-' + crypto.randomUUID().slice(0,12)
  await c.env.DB.prepare(`INSERT INTO complaints (id, hospital_id, complaint_date, patient_name, part, category, description, responder, resolver, resolution, status, severity, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, body.complaint_date||'', body.patient_name||'', body.part||'', body.category||'', body.description||'', body.responder||'', body.resolver||'', body.resolution||'', body.status||'resolved', body.severity||'normal', user.id).run()
  return c.json({ success: true, id })
})

// 컴플레인 수정
complaints.put('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const body = await c.req.json()
  await c.env.DB.prepare(`UPDATE complaints SET complaint_date=?, patient_name=?, part=?, category=?, description=?, responder=?, resolver=?, resolution=?, status=?, severity=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`)
    .bind(body.complaint_date||'', body.patient_name||'', body.part||'', body.category||'', body.description||'', body.responder||'', body.resolver||'', body.resolution||'', body.status||'resolved', body.severity||'normal', id, user.hospitalId).run()
  return c.json({ success: true })
})

// 컴플레인 삭제
complaints.delete('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM complaints WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

// 컴플레인 통계
complaints.get('/stats', async (c) => {
  const user = c.get('user')!
  const from = c.req.query('from') || ''
  const to = c.req.query('to') || ''

  let dateFilter = ''
  const params: any[] = [user.hospitalId]
  if (from && to) { dateFilter = ' AND complaint_date >= ? AND complaint_date <= ?'; params.push(from, to) }
  else if (from) { dateFilter = ' AND complaint_date >= ?'; params.push(from) }
  else if (to) { dateFilter = ' AND complaint_date <= ?'; params.push(to) }
  const baseWhere = 'hospital_id=?' + dateFilter

  const queries = [
    // 0) 전체 건수
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM complaints WHERE ${baseWhere}`).bind(...params).first(),
    // 1) 파트별
    c.env.DB.prepare(`SELECT part, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY part ORDER BY c DESC`).bind(...params).all(),
    // 2) 세부분류별
    c.env.DB.prepare(`SELECT category, COUNT(*) as c FROM complaints WHERE ${baseWhere} AND category != '' GROUP BY category ORDER BY c DESC`).bind(...params).all(),
    // 3) 상태별
    c.env.DB.prepare(`SELECT status, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY status ORDER BY c DESC`).bind(...params).all(),
    // 4) 심각도별
    c.env.DB.prepare(`SELECT severity, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY severity ORDER BY c DESC`).bind(...params).all(),
    // 5) 월별 트렌드
    c.env.DB.prepare(`SELECT substr(complaint_date,1,7) as month, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY month ORDER BY month`).bind(...params).all(),
    // 6) 요일별
    c.env.DB.prepare(`SELECT CASE CAST(strftime('%w', complaint_date) AS INTEGER) WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' WHEN 6 THEN 'sat' END as dow, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY dow ORDER BY c DESC`).bind(...params).all(),
    // 7) 응대자별
    c.env.DB.prepare(`SELECT responder, COUNT(*) as c FROM complaints WHERE ${baseWhere} AND responder != '' GROUP BY responder ORDER BY c DESC LIMIT 20`).bind(...params).all(),
    // 8) 해결자별
    c.env.DB.prepare(`SELECT resolver, COUNT(*) as c FROM complaints WHERE ${baseWhere} AND resolver != '' GROUP BY resolver ORDER BY c DESC LIMIT 20`).bind(...params).all(),
    // 9) 일별 트렌드 (최근 90일)
    c.env.DB.prepare(`SELECT complaint_date, COUNT(*) as c FROM complaints WHERE ${baseWhere} GROUP BY complaint_date ORDER BY complaint_date DESC LIMIT 90`).bind(...params).all(),
  ]

  const results = await Promise.all(queries)
  return c.json({
    total: (results[0] as any)?.total || 0,
    byPart: results[1].results,
    byCategory: results[2].results,
    byStatus: results[3].results,
    bySeverity: results[4].results,
    monthlyTrend: results[5].results,
    byDayOfWeek: results[6].results,
    byResponder: results[7].results,
    byResolver: results[8].results,
    dailyTrend: results[9].results,
  })
})


export default complaints
