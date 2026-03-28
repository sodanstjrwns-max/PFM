import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const leave = new Hono<{ Bindings: Bindings; Variables: Variables }>()

leave.get('/users', async (c) => { const user = c.get('user')!; const rows = await c.env.DB.prepare('SELECT id, name, role, position, team, is_doctor, phone, hire_date FROM users WHERE hospital_id = ? AND is_active = 1 ORDER BY role, name').bind(user.hospitalId).all(); return c.json(rows.results) })

leave.get('/balances', async (c) => {
  const user = c.get('user')!; const year = c.req.query('year') || new Date().getFullYear().toString(); const userId = c.req.query('user_id')
  if (userId && user.role !== 'admin' && user.role !== 'manager' && userId !== user.id) return c.json({ error: '권한이 없습니다' }, 403)
  let query = 'SELECT lb.*, u.name as user_name, u.role as user_role FROM leave_balances lb JOIN users u ON lb.user_id = u.id WHERE lb.hospital_id = ? AND lb.year = ?'
  const params: any[] = [user.hospitalId, parseInt(year)]
  if (userId) { query += ' AND lb.user_id = ?'; params.push(userId) } else if (user.role !== 'admin' && user.role !== 'manager') { query += ' AND lb.user_id = ?'; params.push(user.id) }
  query += ' ORDER BY u.name, lb.leave_type'
  const rows = await c.env.DB.prepare(query).bind(...params).all(); return c.json(rows.results)
})

leave.post('/balances', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const { user_id, year, leave_type, total_days } = await c.req.json()
  if (!user_id || !year || !leave_type) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'lb-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO leave_balances (id, hospital_id, user_id, year, leave_type, total_days, used_days) VALUES (?,?,?,?,?,?,0) ON CONFLICT(user_id, year, leave_type) DO UPDATE SET total_days = ?, updated_at = CURRENT_TIMESTAMP`).bind(id, user.hospitalId, user_id, year, leave_type, total_days || 0, total_days || 0).run()
  return c.json({ success: true })
})

leave.get('/requests', async (c) => {
  const user = c.get('user')!; const month = c.req.query('month'); const status = c.req.query('status'); const userId = c.req.query('user_id')
  let query = `SELECT lr.*, u.name as user_name, u.role as user_role, ap.name as approver_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id LEFT JOIN users ap ON lr.approved_by = ap.id WHERE lr.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  if (user.role !== 'admin' && user.role !== 'manager') { query += ' AND lr.user_id = ?'; params.push(user.id) }
  if (userId) { query += ' AND lr.user_id = ?'; params.push(userId) }
  if (status) { query += ' AND lr.status = ?'; params.push(status) }
  if (month) { query += ' AND (lr.start_date LIKE ? OR lr.end_date LIKE ?)'; params.push(month + '%', month + '%') }
  query += ' ORDER BY lr.start_date DESC'
  const rows = await c.env.DB.prepare(query).bind(...params).all(); return c.json(rows.results)
})

leave.post('/requests', async (c) => {
  const user = c.get('user')!
  const { leave_type, start_date, end_date, reason } = await c.req.json()
  if (!leave_type || !start_date || !end_date) return c.json({ error: '필수 항목 누락' }, 400)
  let days = 1
  if (leave_type === 'half_am' || leave_type === 'half_pm') { days = 0.5 } else { const s = new Date(start_date); const e = new Date(end_date); days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1 }
  const balType = (leave_type === 'half_am' || leave_type === 'half_pm') ? 'annual' : leave_type
  const year = new Date(start_date).getFullYear()
  const balance = await c.env.DB.prepare('SELECT total_days, used_days FROM leave_balances WHERE user_id = ? AND year = ? AND leave_type = ?').bind(user.id, year, balType).first() as any
  if (balance && (balance.total_days - balance.used_days) < days) return c.json({ error: `잔여 ${balType === 'annual' ? '연차' : '병가'}가 부족합니다 (잔여: ${balance.total_days - balance.used_days}일)` }, 400)
  const id = 'lr-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO leave_requests (id, hospital_id, user_id, leave_type, start_date, end_date, days, reason, status) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, user.id, leave_type, start_date, end_date, days, reason || '', 'pending').run()
  return c.json({ id, days })
})

leave.put('/requests/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const id = c.req.param('id'); const { status, reject_reason } = await c.req.json()
  if (!['approved','rejected'].includes(status)) return c.json({ error: '잘못된 상태' }, 400)
  const req = await c.env.DB.prepare('SELECT * FROM leave_requests WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!req) return c.json({ error: '요청을 찾을 수 없습니다' }, 404)
  if (req.status !== 'pending') return c.json({ error: '이미 처리된 요청입니다' }, 400)
  if (status === 'approved') {
    const balType = (req.leave_type === 'half_am' || req.leave_type === 'half_pm') ? 'annual' : req.leave_type
    const year = new Date(req.start_date).getFullYear()
    await c.env.DB.prepare('UPDATE leave_balances SET used_days = used_days + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND leave_type = ?').bind(req.days, req.user_id, year, balType).run()
  }
  await c.env.DB.prepare('UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, reject_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, user.id, reject_reason || '', id).run()
  return c.json({ success: true })
})

leave.delete('/requests/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const req = await c.env.DB.prepare('SELECT * FROM leave_requests WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!req) return c.json({ error: '요청을 찾을 수 없습니다' }, 404)
  if (req.user_id !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  if (req.status === 'approved') {
    const balType = (req.leave_type === 'half_am' || req.leave_type === 'half_pm') ? 'annual' : req.leave_type
    const year = new Date(req.start_date).getFullYear()
    await c.env.DB.prepare('UPDATE leave_balances SET used_days = MAX(0, used_days - ?), updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND leave_type = ?').bind(req.days, req.user_id, year, balType).run()
  }
  await c.env.DB.prepare('UPDATE leave_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('cancelled', id).run()
  return c.json({ success: true })
})

leave.get('/stats', async (c) => {
  const user = c.get('user')!; const year = c.req.query('year') || new Date().getFullYear().toString()
  const pending = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM leave_requests WHERE hospital_id = ? AND status = ? AND start_date LIKE ?').bind(user.hospitalId, 'pending', year + '%').first() as any
  const today = new Date().toISOString().slice(0,10)
  const onLeave = await c.env.DB.prepare(`SELECT lr.*, u.name as user_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE lr.hospital_id = ? AND lr.status = 'approved' AND lr.start_date <= ? AND lr.end_date >= ?`).bind(user.hospitalId, today, today).all()
  return c.json({ pendingCount: pending?.cnt || 0, onLeaveToday: onLeave.results })
})

export default leave
