import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const community = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Community Posts ─── */
community.get('/posts', async (c) => {
  const user = c.get('user')!
  const board = c.req.query('board') || ''
  let sql = 'SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id=u.id WHERE p.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (board) { sql += ' AND p.board_type=?'; params.push(board) }
  sql += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 100'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

community.post('/posts', async (c) => {
  const user = c.get('user')!
  const { board_type, title, content, target_name, is_anonymous, is_pinned } = await c.req.json()
  if (!board_type || !title) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO posts (id, hospital_id, board_type, author_id, title, content, target_name, is_anonymous, is_pinned) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, board_type, user.id, title, content||'', target_name||'', is_anonymous?1:0, is_pinned?1:0).run()
  return c.json({ id })
})

community.delete('/posts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM comments WHERE post_id=?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM posts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

community.get('/posts/:id/comments', async (c) => {
  const rows = await c.env.DB.prepare('SELECT cm.*, u.name as author_name FROM comments cm JOIN users u ON cm.author_id=u.id WHERE cm.post_id=? ORDER BY cm.created_at').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

community.post('/posts/:id/comments', async (c) => {
  const user = c.get('user')!
  const { content } = await c.req.json()
  if (!content) return c.json({ error: '내용을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO comments (id, post_id, author_id, content) VALUES (?,?,?,?)').bind(id, c.req.param('id'), user.id, content).run()
  return c.json({ id })
})

community.post('/posts/:id/like', async (c) => {
  const user = c.get('user')!
  const postId = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM post_likes WHERE post_id=? AND user_id=?').bind(postId, user.id).first()
  if (existing) {
    await c.env.DB.prepare('DELETE FROM post_likes WHERE post_id=? AND user_id=?').bind(postId, user.id).run()
    await c.env.DB.prepare('UPDATE posts SET like_count=MAX(0,like_count-1) WHERE id=?').bind(postId).run()
    return c.json({ liked: false })
  } else {
    await c.env.DB.prepare('INSERT INTO post_likes (id, post_id, user_id) VALUES (?,?,?)').bind(crypto.randomUUID(), postId, user.id).run()
    await c.env.DB.prepare('UPDATE posts SET like_count=like_count+1 WHERE id=?').bind(postId).run()
    return c.json({ liked: true })
  }
})

/* ─── Kanban ─── */
community.get('/kanban/:boardType', async (c) => {
  const user = c.get('user')!
  const boardType = c.req.param('boardType')
  const department = c.req.query('department') || ''
  let board: any = await c.env.DB.prepare('SELECT * FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) {
    const id = crypto.randomUUID()
    const title = boardType === 'purchase' ? '물품 구매 요청' : boardType === 'repair' ? '수리/정비 요청' : '칸반보드'
    await c.env.DB.prepare('INSERT INTO kanban_boards (id, hospital_id, board_type, title) VALUES (?,?,?,?)').bind(id, user.hospitalId, boardType, title).run()
    board = { id, board_type: boardType, title }
  }
  let sql = 'SELECT kc.*, u.name as requested_by_name FROM kanban_cards kc JOIN users u ON kc.requested_by=u.id WHERE kc.board_id=?'
  const params: any[] = [board.id]
  if (department) { sql += ' AND kc.department=?'; params.push(department) }
  sql += " ORDER BY CASE kc.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, kc.created_at DESC"
  const cards = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ board, cards: cards.results })
})

community.post('/kanban/:boardType/cards', async (c) => {
  const user = c.get('user')!
  const boardType = c.req.param('boardType')
  const board: any = await c.env.DB.prepare('SELECT id FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) return c.json({ error: '보드를 찾을 수 없습니다' }, 404)
  const { title, description, priority, estimated_cost, due_date, department } = await c.req.json()
  if (!title) return c.json({ error: '제목을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO kanban_cards (id, board_id, hospital_id, title, description, priority, department, requested_by, estimated_cost, due_date) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, board.id, user.hospitalId, title, description||'', priority||'normal', department||'general', user.id, estimated_cost||null, due_date||null).run()
  return c.json({ id })
})

community.put('/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  const { status, actual_cost } = await c.req.json()
  const completed = status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE kanban_cards SET status=?, actual_cost=COALESCE(?,actual_cost), completed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?').bind(status, actual_cost||null, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

community.delete('/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM kanban_cards WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Staff Supplies ─── */
community.get('/staff-supplies', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status') || ''
  const item_type = c.req.query('item_type') || ''
  let sql = `SELECT ss.*, u.name as user_name, u2.name as requested_by_name, u3.name as approved_by_name FROM staff_supplies ss JOIN users u ON ss.user_id=u.id JOIN users u2 ON ss.requested_by=u2.id LEFT JOIN users u3 ON ss.approved_by=u3.id WHERE ss.hospital_id=?`
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND ss.status=?'; params.push(status) }
  if (item_type) { sql += ' AND ss.item_type=?'; params.push(item_type) }
  sql += ' ORDER BY ss.created_at DESC'
  const results = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results.results)
})

community.post('/staff-supplies', async (c) => {
  const user = c.get('user')!
  const { user_id, item_type, item_name, size, color, quantity, notes } = await c.req.json()
  if (!item_type || !item_name) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'ss-' + crypto.randomUUID().slice(0,8)
  const targetUser = user_id || user.id
  await c.env.DB.prepare(`INSERT INTO staff_supplies (id, hospital_id, user_id, item_type, item_name, size, color, quantity, notes, requested_by) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, targetUser, item_type, item_name, size||'', color||'', quantity||1, notes||'', user.id).run()
  return c.json({ id })
})

community.put('/staff-supplies/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields: string[] = []; const vals: any[] = []
  for (const k of ['status','size','color','quantity','notes','order_date','delivery_date']) {
    if (body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(body[k]) }
  }
  if (body.status === 'approved' || body.status === 'ordered') { fields.push('approved_by = ?'); vals.push(user.id) }
  if (body.status === 'ordered' && !body.order_date) { fields.push('order_date = ?'); vals.push(new Date().toISOString().slice(0,10)) }
  if (body.status === 'delivered' && !body.delivery_date) { fields.push('delivery_date = ?'); vals.push(new Date().toISOString().slice(0,10)) }
  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(id, user.hospitalId)
    await c.env.DB.prepare(`UPDATE staff_supplies SET ${fields.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  }
  return c.json({ success: true })
})

community.delete('/staff-supplies/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM staff_supplies WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Marketing ─── */
community.get('/marketing/channels', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM marketing_channels WHERE hospital_id=? ORDER BY created_at').bind(user.hospitalId).all()
  return c.json(rows.results)
})

community.post('/marketing/channels', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '마케팅 채널 관리 권한이 없습니다' }, 403)
  const { name, monthly_cost } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_channels (id, hospital_id, name, monthly_cost) VALUES (?,?,?,?)').bind(id, user.hospitalId, name, monthly_cost||0).run()
  return c.json({ id })
})

community.get('/marketing/records', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  let sql = 'SELECT r.*, ch.name as channel_name FROM marketing_records r JOIN marketing_channels ch ON r.channel_id=ch.id WHERE r.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND r.record_month=?'; params.push(month) }
  sql += ' ORDER BY r.record_month DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

community.post('/marketing/records', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '마케팅 기록 관리 권한이 없습니다' }, 403)
  const { channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, channel_id, record_month, new_patients||0, revisit_patients||0, ad_spend||0, revenue||0).run()
  return c.json({ id })
})

/* ─── Reviews ─── */
community.get('/reviews', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM reviews WHERE hospital_id=? ORDER BY review_date DESC, created_at DESC LIMIT 100').bind(user.hospitalId).all()
  return c.json(rows.results)
})

community.post('/reviews', async (c) => {
  const user = c.get('user')!
  const { platform, reviewer_name, rating, content, reply, review_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, platform||'manual', reviewer_name||'', rating||5, content||'', reply||'', review_date||new Date().toISOString().split('T')[0]).run()
  return c.json({ id })
})

/* ─── Checklists ─── */
community.get('/checklists', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM checklists WHERE hospital_id=? ORDER BY created_at').bind(user.hospitalId).all()
  return c.json(rows.results)
})

community.post('/checklists', async (c) => {
  const user = c.get('user')!
  const { title, checklist_type, items } = await c.req.json()
  if (!title || !items) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklists (id, hospital_id, title, checklist_type, items) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, title, checklist_type||'custom', JSON.stringify(items)).run()
  return c.json({ id })
})

community.post('/checklists/:id/complete', async (c) => {
  const user = c.get('user')!
  const { completed_items, notes, log_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklist_logs (id, checklist_id, completed_by, completed_items, log_date, notes) VALUES (?,?,?,?,?,?)').bind(id, c.req.param('id'), user.id, JSON.stringify(completed_items), log_date||new Date().toISOString().split('T')[0], notes||'').run()
  return c.json({ id })
})

community.get('/checklists/:id/logs', async (c) => {
  const rows = await c.env.DB.prepare('SELECT cl.*, u.name as completed_by_name FROM checklist_logs cl JOIN users u ON cl.completed_by=u.id WHERE cl.checklist_id=? ORDER BY cl.log_date DESC LIMIT 30').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

/* ─── Events (Calendar) ─── */
community.get('/events', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  let sql = 'SELECT e.*, u.name as created_by_name FROM events e JOIN users u ON e.created_by=u.id WHERE e.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND e.start_date LIKE ?'; params.push(month + '%') }
  sql += ' ORDER BY e.start_date'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

community.post('/events', async (c) => {
  const user = c.get('user')!
  const { title, description, event_type, start_date, end_date, all_day, color } = await c.req.json()
  if (!title || !start_date) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, title, description||'', event_type||'meeting', start_date, end_date||start_date, all_day??1, color||'#0f766e', user.id).run()
  return c.json({ id })
})

community.delete('/events/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM events WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default community
