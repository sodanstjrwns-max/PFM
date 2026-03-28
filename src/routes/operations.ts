import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const operations = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── 예약 관리 API ─── */
operations.get('/reservations', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  const search = sanitizeString(c.req.query('search') || '', 200)
  let where = 'hospital_id=?'; const params: any[] = [user.hospitalId]
  if (from) { where += ' AND record_date >= ?'; params.push(from) }
  if (to) { where += ' AND record_date <= ?'; params.push(to) }
  if (search) { where += ' AND (memo LIKE ?)'; params.push(`%${search}%`) }
  const rows = await c.env.DB.prepare(`SELECT * FROM reservation_records WHERE ${where} ORDER BY record_date DESC LIMIT 500`).bind(...params).all()
  return c.json({ data: rows.results })
})

operations.post('/reservations', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 10 }, day_of_week: { type: 'string', max: 5 },
    cancel_count: { type: 'number', min: 0, max: 9999 }, dentweb_cancel_count: { type: 'number', min: 0, max: 9999 },
    fulfillment_rate: { type: 'number', min: 0, max: 100 }, memo: { type: 'string', max: 2000 },
  })
  const id = 'res-' + crypto.randomUUID().slice(0,12)
  await c.env.DB.prepare(`INSERT INTO reservation_records (id,hospital_id,record_date,day_of_week,cancel_count,dentweb_cancel_count,fulfillment_rate,memo,created_by) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, b.record_date||'', b.day_of_week||'', b.cancel_count||0, b.dentweb_cancel_count||0, b.fulfillment_rate||0, b.memo||'', user.id).run()
  return c.json({ success: true, id })
})

operations.get('/reservations/stats', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let df = ''; const params: any[] = [user.hospitalId]
  if (from) { df += ' AND record_date >= ?'; params.push(from) }
  if (to) { df += ' AND record_date <= ?'; params.push(to) }
  const bw = 'hospital_id=?' + df
  const bwData = bw + ' AND (cancel_count > 0 OR dentweb_cancel_count > 0 OR fulfillment_rate > 0)'
  const [total, avg, dow, monthly] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as cnt, SUM(cancel_count) as total_cancel, SUM(dentweb_cancel_count) as total_dentweb, ROUND(AVG(fulfillment_rate),1) as avg_fulfill FROM reservation_records WHERE ${bwData}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT ROUND(AVG(cancel_count),1) as avg_cancel, ROUND(AVG(dentweb_cancel_count),1) as avg_dentweb FROM reservation_records WHERE ${bwData}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT day_of_week as dow, ROUND(AVG(cancel_count),1) as avg_cancel, ROUND(AVG(dentweb_cancel_count),1) as avg_dentweb, ROUND(AVG(fulfillment_rate),1) as avg_fulfill FROM reservation_records WHERE ${bwData} AND day_of_week != '' GROUP BY day_of_week`).bind(...params).all(),
    c.env.DB.prepare(`SELECT substr(record_date,1,7) as month, SUM(cancel_count) as cancel, SUM(dentweb_cancel_count) as dentweb, ROUND(AVG(fulfillment_rate),1) as fulfill FROM reservation_records WHERE ${bwData} GROUP BY month ORDER BY month`).bind(...params).all(),
  ])
  return c.json({ total, avg, byDow: dow.results, monthlyTrend: monthly.results })
})

operations.put('/reservations/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 10 }, day_of_week: { type: 'string', max: 5 },
    cancel_count: { type: 'number', min: 0, max: 9999 }, dentweb_cancel_count: { type: 'number', min: 0, max: 9999 },
    fulfillment_rate: { type: 'number', min: 0, max: 100 }, memo: { type: 'string', max: 2000 },
  })
  await c.env.DB.prepare(`UPDATE reservation_records SET record_date=?,day_of_week=?,cancel_count=?,dentweb_cancel_count=?,fulfillment_rate=?,memo=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`)
    .bind(b.record_date||'', b.day_of_week||'', b.cancel_count||0, b.dentweb_cancel_count||0, b.fulfillment_rate||0, b.memo||'', id, user.hospitalId).run()
  return c.json({ success: true })
})

operations.delete('/reservations/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM reservation_records WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── 대기시간 관리 API ─── */
operations.get('/wait-times', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let where = 'hospital_id=?'; const params: any[] = [user.hospitalId]
  if (from) { where += ' AND record_date >= ?'; params.push(from) }
  if (to) { where += ' AND record_date <= ?'; params.push(to) }
  const rows = await c.env.DB.prepare(`SELECT * FROM wait_time_records WHERE ${where} ORDER BY record_date DESC LIMIT 500`).bind(...params).all()
  return c.json({ data: rows.results })
})

operations.post('/wait-times', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 10 }, day_of_week: { type: 'string', max: 5 },
    total_wait_minutes: { type: 'number', min: 0, max: 99999 },
    avg_wait_minutes: { type: 'number', min: 0, max: 999 },
    memo: { type: 'string', max: 2000 },
  })
  const id = 'wt-' + crypto.randomUUID().slice(0,12)
  await c.env.DB.prepare(`INSERT INTO wait_time_records (id,hospital_id,record_date,day_of_week,total_wait_minutes,avg_wait_minutes,memo,created_by) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, b.record_date||'', b.day_of_week||'', b.total_wait_minutes||0, b.avg_wait_minutes||0, b.memo||'', user.id).run()
  return c.json({ success: true, id })
})

operations.get('/wait-times/stats', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let df = ''; const params: any[] = [user.hospitalId]
  if (from) { df += ' AND record_date >= ?'; params.push(from) }
  if (to) { df += ' AND record_date <= ?'; params.push(to) }
  const bw = 'hospital_id=?' + df; const bwData = bw + ' AND avg_wait_minutes > 0'
  const [total, dow, monthly] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as cnt, ROUND(AVG(avg_wait_minutes),1) as overall_avg, ROUND(MAX(avg_wait_minutes),1) as max_avg, ROUND(MIN(avg_wait_minutes),1) as min_avg, SUM(total_wait_minutes) as total_minutes FROM wait_time_records WHERE ${bwData}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT day_of_week as dow, ROUND(AVG(avg_wait_minutes),1) as avg_wait, ROUND(AVG(total_wait_minutes),0) as avg_total FROM wait_time_records WHERE ${bwData} AND day_of_week != '' GROUP BY day_of_week`).bind(...params).all(),
    c.env.DB.prepare(`SELECT substr(record_date,1,7) as month, ROUND(AVG(avg_wait_minutes),1) as avg_wait, ROUND(AVG(total_wait_minutes),0) as avg_total FROM wait_time_records WHERE ${bwData} GROUP BY month ORDER BY month`).bind(...params).all(),
  ])
  return c.json({ total, byDow: dow.results, monthlyTrend: monthly.results })
})

operations.put('/wait-times/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 10 }, day_of_week: { type: 'string', max: 5 },
    total_wait_minutes: { type: 'number', min: 0, max: 99999 },
    avg_wait_minutes: { type: 'number', min: 0, max: 999 },
    memo: { type: 'string', max: 2000 },
  })
  await c.env.DB.prepare(`UPDATE wait_time_records SET record_date=?,day_of_week=?,total_wait_minutes=?,avg_wait_minutes=?,memo=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`)
    .bind(b.record_date||'', b.day_of_week||'', b.total_wait_minutes||0, b.avg_wait_minutes||0, b.memo||'', id, user.hospitalId).run()
  return c.json({ success: true })
})

operations.delete('/wait-times/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM wait_time_records WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── 주차권 관리 API ─── */
operations.get('/parking', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let where = 'hospital_id=?'; const params: any[] = [user.hospitalId]
  if (from) { where += ' AND record_date >= ?'; params.push(from) }
  if (to) { where += ' AND record_date <= ?'; params.push(to) }
  const rows = await c.env.DB.prepare(`SELECT * FROM parking_records WHERE ${where} ORDER BY record_date DESC LIMIT 500`).bind(...params).all()
  return c.json({ data: rows.results })
})

operations.post('/parking', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 10 }, day_of_week: { type: 'string', max: 5 },
    ticket_count: { type: 'number', min: 0, max: 9999 }, memo: { type: 'string', max: 2000 },
  })
  const id = 'pk-' + crypto.randomUUID().slice(0,12)
  await c.env.DB.prepare(`INSERT INTO parking_records (id,hospital_id,record_date,day_of_week,ticket_count,memo,created_by) VALUES (?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, b.record_date||'', b.day_of_week||'', b.ticket_count||0, b.memo||'', user.id).run()
  return c.json({ success: true, id })
})

operations.get('/parking/stats', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let df = ''; const params: any[] = [user.hospitalId]
  if (from) { df += ' AND record_date >= ?'; params.push(from) }
  if (to) { df += ' AND record_date <= ?'; params.push(to) }
  const bw = 'hospital_id=?' + df; const bwData = bw + ' AND ticket_count > 0'
  const [total, dow, monthly] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as cnt, SUM(ticket_count) as total_tickets, ROUND(AVG(ticket_count),1) as avg_tickets, MAX(ticket_count) as max_tickets FROM parking_records WHERE ${bwData}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT day_of_week as dow, ROUND(AVG(ticket_count),1) as avg_tickets, SUM(ticket_count) as total FROM parking_records WHERE ${bwData} AND day_of_week != '' GROUP BY day_of_week`).bind(...params).all(),
    c.env.DB.prepare(`SELECT substr(record_date,1,7) as month, SUM(ticket_count) as total, ROUND(AVG(ticket_count),1) as avg_tickets FROM parking_records WHERE ${bwData} GROUP BY month ORDER BY month`).bind(...params).all(),
  ])
  return c.json({ total, byDow: dow.results, monthlyTrend: monthly.results })
})

operations.put('/parking/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 10 }, day_of_week: { type: 'string', max: 5 },
    ticket_count: { type: 'number', min: 0, max: 9999 }, memo: { type: 'string', max: 2000 },
  })
  await c.env.DB.prepare(`UPDATE parking_records SET record_date=?,day_of_week=?,ticket_count=?,memo=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`)
    .bind(b.record_date||'', b.day_of_week||'', b.ticket_count||0, b.memo||'', id, user.hospitalId).run()
  return c.json({ success: true })
})

operations.delete('/parking/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM parking_records WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default operations
