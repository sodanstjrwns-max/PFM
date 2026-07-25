import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeBody, isValidDateString } from '../lib/middleware'
import { auditFromCtx } from '../lib/audit'
const leave = new Hono<{ Bindings: Bindings; Variables: Variables }>()

leave.get('/users', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, name, role, position, team, is_doctor, phone, hire_date FROM users WHERE hospital_id = ? AND is_active = 1 ORDER BY role, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

leave.get('/balances', async (c) => {
  const user = c.get('user')!
  const year = sanitizeString(c.req.query('year') || String(new Date().getFullYear()), 4)
  const userId = sanitizeString(c.req.query('user_id') || '', 100)
  if (userId && user.role !== 'admin' && user.role !== 'manager' && userId !== user.id) return c.json({ error: '권한이 없습니다' }, 403)
  let query = 'SELECT lb.*, u.name as user_name, u.role as user_role FROM leave_balances lb JOIN users u ON lb.user_id = u.id WHERE lb.hospital_id = ? AND lb.year = ?'
  const params: any[] = [user.hospitalId, parseInt(year)]
  if (userId) { query += ' AND lb.user_id = ?'; params.push(userId) } else if (user.role !== 'admin' && user.role !== 'manager') { query += ' AND lb.user_id = ?'; params.push(user.id) }
  query += ' ORDER BY u.name, lb.leave_type'
  const rows = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(rows.results)
})

leave.post('/balances', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    user_id: { type: 'string', max: 100 },
    year: { type: 'number', min: 2020, max: 2099 },
    leave_type: { type: 'string', max: 30 },
    total_days: { type: 'number', min: 0, max: 365, default: 0 },
  })
  if (!b.user_id || !b.year || !b.leave_type) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'lb-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO leave_balances (id, hospital_id, user_id, year, leave_type, total_days, used_days) VALUES (?,?,?,?,?,?,0) ON CONFLICT(user_id, year, leave_type) DO UPDATE SET total_days = ?, updated_at = CURRENT_TIMESTAMP`).bind(id, user.hospitalId, b.user_id, b.year, b.leave_type, b.total_days || 0, b.total_days || 0).run()
  return c.json({ success: true })
})

leave.get('/requests', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || '', 10)
  const status = sanitizeString(c.req.query('status') || '', 20)
  const userId = sanitizeString(c.req.query('user_id') || '', 100)
  let query = `SELECT lr.*, u.name as user_name, u.role as user_role, ap.name as approver_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id LEFT JOIN users ap ON lr.approved_by = ap.id WHERE lr.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  if (user.role !== 'admin' && user.role !== 'manager') { query += ' AND lr.user_id = ?'; params.push(user.id) }
  if (userId) { query += ' AND lr.user_id = ?'; params.push(userId) }
  if (status) { query += ' AND lr.status = ?'; params.push(status) }
  if (month) { query += ' AND (lr.start_date LIKE ? OR lr.end_date LIKE ?)'; params.push(month + '%', month + '%') }
  query += ' ORDER BY lr.start_date DESC LIMIT 200'
  const rows = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(rows.results)
})

leave.post('/requests', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    leave_type: { type: 'string', max: 30 },
    start_date: { type: 'string', max: 10 },
    end_date: { type: 'string', max: 10 },
    reason: { type: 'string', max: 1000 },
  })
  if (!b.leave_type || !b.start_date || !b.end_date) return c.json({ error: '필수 항목 누락' }, 400)
  // v5.12: 날짜 형식 검증 없이 new Date() 산술을 해 days=NaN, year=NaN 이 D1까지 흘러가 500이 되던 문제 수정
  if (!isValidDateString(b.start_date) || !isValidDateString(b.end_date)) {
    return c.json({ error: '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)' }, 400)
  }
  if (b.end_date < b.start_date) return c.json({ error: '종료일이 시작일보다 빤를 수 없습니다' }, 400)
  let days = 1
  if (b.leave_type === 'half_am' || b.leave_type === 'half_pm') { days = 0.5 } else { const s = new Date(b.start_date); const e = new Date(b.end_date); days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1 }
  if (days <= 0 || days > 365) return c.json({ error: '유효하지 않은 기간입니다' }, 400)
  const balType = (b.leave_type === 'half_am' || b.leave_type === 'half_pm') ? 'annual' : b.leave_type
  const year = new Date(b.start_date).getFullYear()
  const balance = await c.env.DB.prepare('SELECT total_days, used_days FROM leave_balances WHERE user_id = ? AND year = ? AND leave_type = ?').bind(user.id, year, balType).first() as any
  if (balance && (balance.total_days - balance.used_days) < days) return c.json({ error: `잔여 ${balType === 'annual' ? '연차' : '병가'}가 부족합니다 (잔여: ${balance.total_days - balance.used_days}일)` }, 400)
  // 중복 기간 신청 방지: 대기/승인 상태의 기존 신청과 기간이 겹치면 거부
  const overlap = await c.env.DB.prepare(`SELECT id FROM leave_requests WHERE user_id = ? AND status IN ('pending','approved') AND start_date <= ? AND end_date >= ?`).bind(user.id, b.end_date, b.start_date).first()
  if (overlap) return c.json({ error: '해당 기간에 이미 신청된 연차가 있습니다' }, 400)
  const id = 'lr-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO leave_requests (id, hospital_id, user_id, leave_type, start_date, end_date, days, reason, status) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, user.id, b.leave_type, b.start_date, b.end_date, days, b.reason || '', 'pending').run()
  return c.json({ id, days })
})

leave.put('/requests/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const id = c.req.param('id')
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    status: { type: 'enum', values: ['approved','rejected'] },
    reject_reason: { type: 'string', max: 500 },
  })
  if (!b.status) return c.json({ error: '잘못된 상태' }, 400)
  const req = await c.env.DB.prepare('SELECT * FROM leave_requests WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!req) return c.json({ error: '요청을 찾을 수 없습니다' }, 404)
  if (req.status !== 'pending') return c.json({ error: '이미 처리된 요청입니다' }, 400)
  if (b.status === 'approved') {
    const balType = (req.leave_type === 'half_am' || req.leave_type === 'half_pm') ? 'annual' : req.leave_type
    const year = new Date(req.start_date).getFullYear()
    await c.env.DB.prepare('UPDATE leave_balances SET used_days = used_days + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND leave_type = ?').bind(req.days, req.user_id, year, balType).run()
  }
  await c.env.DB.prepare('UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, reject_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(b.status, user.id, b.reject_reason || '', id).run()
  auditFromCtx(c, b.status === 'approved' ? 'leave.approve' : 'leave.reject', { targetType: 'leave', targetId: id, summary: `연차 ${b.status === 'approved' ? '승인' : '반려'} (신청자: ${req.user_id}, ${req.start_date}~${req.end_date}, ${req.days}일)`, metadata: { leave_type: req.leave_type, days: req.days, reject_reason: b.reject_reason || undefined } })
  return c.json({ success: true })
})

leave.delete('/requests/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const req = await c.env.DB.prepare('SELECT * FROM leave_requests WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!req) return c.json({ error: '요청을 찾을 수 없습니다' }, 404)
  if (req.user_id !== user.id && user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  if (req.status === 'cancelled') return c.json({ error: '이미 취소된 요청입니다' }, 400)
  if (req.status === 'approved') {
    const balType = (req.leave_type === 'half_am' || req.leave_type === 'half_pm') ? 'annual' : req.leave_type
    const year = new Date(req.start_date).getFullYear()
    await c.env.DB.prepare('UPDATE leave_balances SET used_days = MAX(0, used_days - ?), updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND leave_type = ?').bind(req.days, req.user_id, year, balType).run()
  }
  await c.env.DB.prepare('UPDATE leave_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('cancelled', id).run()
  if (req.user_id !== user.id) {
    // 본인 취소는 일상 작업 — 관리자가 타인 연차를 취소한 경우만 기록
    auditFromCtx(c, 'leave.cancel', { targetType: 'leave', targetId: id, summary: `타인 연차 취소 (신청자: ${req.user_id}, 상태였던 값: ${req.status})`, metadata: { was_approved: req.status === 'approved', days: req.days } })
  }
  return c.json({ success: true })
})

leave.get('/stats', async (c) => {
  const user = c.get('user')!
  const year = sanitizeString(c.req.query('year') || String(new Date().getFullYear()), 4)
  const pending = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM leave_requests WHERE hospital_id = ? AND status = ? AND start_date LIKE ?').bind(user.hospitalId, 'pending', year + '%').first() as any
  const today = new Date().toISOString().slice(0,10)
  const onLeave = await c.env.DB.prepare(`SELECT lr.*, u.name as user_name FROM leave_requests lr JOIN users u ON lr.user_id = u.id WHERE lr.hospital_id = ? AND lr.status = 'approved' AND lr.start_date <= ? AND lr.end_date >= ?`).bind(user.hospitalId, today, today).all()
  return c.json({ pendingCount: pending?.cnt || 0, onLeaveToday: onLeave.results })
})

export default leave
