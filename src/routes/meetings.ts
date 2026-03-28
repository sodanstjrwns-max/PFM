import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const meetings = new Hono<{ Bindings: Bindings; Variables: Variables }>()

meetings.get('/', async (c) => {
  const user = c.get('user')!; const month = c.req.query('month'); const status = c.req.query('status')
  let query = `SELECT m.*, u.name as creator_name, (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) as participant_count, (SELECT COUNT(*) FROM meeting_minutes WHERE meeting_id = m.id) as has_minutes FROM meetings m JOIN users u ON m.created_by = u.id WHERE m.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  if (user.role !== 'admin') { query += ` AND (m.visibility = 'all' OR (m.visibility = 'participants' AND EXISTS (SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.user_id = ?)) OR m.created_by = ?)`; params.push(user.id, user.id) }
  if (month) { query += ' AND m.meeting_date LIKE ?'; params.push(month + '%') }
  if (status) { query += ' AND m.status = ?'; params.push(status) }
  query += ' ORDER BY m.meeting_date DESC, m.start_time DESC'
  const rows = await c.env.DB.prepare(query).bind(...params).all(); return c.json(rows.results)
})

meetings.get('/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const meeting = await c.env.DB.prepare('SELECT m.*, u.name as creator_name FROM meetings m JOIN users u ON m.created_by = u.id WHERE m.id = ? AND m.hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  if (meeting.visibility === 'admin' && user.role !== 'admin') return c.json({ error: '접근 권한이 없습니다' }, 403)
  if (meeting.visibility === 'participants' && user.role !== 'admin') {
    const isP = await c.env.DB.prepare('SELECT 1 FROM meeting_participants WHERE meeting_id = ? AND user_id = ?').bind(id, user.id).first()
    if (!isP && meeting.created_by !== user.id) return c.json({ error: '접근 권한이 없습니다' }, 403)
  }
  const participants = await c.env.DB.prepare('SELECT mp.*, u.name as user_name, u.role as user_role FROM meeting_participants mp JOIN users u ON mp.user_id = u.id WHERE mp.meeting_id = ? ORDER BY mp.role, u.name').bind(id).all()
  const minutes = await c.env.DB.prepare('SELECT mm.*, u.name as writer_name FROM meeting_minutes mm JOIN users u ON mm.written_by = u.id WHERE mm.meeting_id = ? ORDER BY mm.created_at DESC').bind(id).all()
  return c.json({ ...meeting, participants: participants.results, minutes: minutes.results })
})

meetings.post('/', async (c) => {
  const user = c.get('user')!
  const { title, description, meeting_date, start_time, end_time, location, visibility, participants } = await c.req.json()
  if (!title || !meeting_date || !start_time) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'mt-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, visibility, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, title, description || '', meeting_date, start_time, end_time || '', location || '', visibility || 'all', user.id).run()
  const orgId = 'mp-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(orgId, id, user.id, 'organizer').run()
  if (participants && Array.isArray(participants)) {
    for (const p of participants) {
      if (p.user_id === user.id) continue
      const pId = 'mp-' + crypto.randomUUID().slice(0,8)
      await c.env.DB.prepare('INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(pId, id, p.user_id, p.role || 'attendee').run()
    }
  }
  const eventId = 'ev-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(eventId, user.hospitalId, '📝 ' + title, ((location ? '장소: ' + location + '\n' : '') + (description || '')).trim(), 'meeting', meeting_date, meeting_date, 0, '#3b82f6', user.id).run()
  return c.json({ id })
})

meetings.put('/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id'); const body = await c.req.json()
  const meeting = await c.env.DB.prepare('SELECT * FROM meetings WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  if (meeting.created_by !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  const fields: string[] = []; const vals: any[] = []
  for (const k of ['title','description','meeting_date','start_time','end_time','location','status','visibility']) { if (body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(body[k]) } }
  if (fields.length > 0) { fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(id, user.hospitalId); await c.env.DB.prepare(`UPDATE meetings SET ${fields.join(',')} WHERE id = ? AND hospital_id = ?`).bind(...vals).run() }
  return c.json({ success: true })
})

meetings.delete('/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const meeting = await c.env.DB.prepare('SELECT * FROM meetings WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  if (meeting.created_by !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  await c.env.DB.prepare('DELETE FROM meetings WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

meetings.put('/:id/participants', async (c) => {
  const user = c.get('user')!; const meetingId = c.req.param('id'); const { user_id, role, attendance } = await c.req.json()
  if (attendance) { await c.env.DB.prepare('UPDATE meeting_participants SET attendance = ? WHERE meeting_id = ? AND user_id = ?').bind(attendance, meetingId, user_id || user.id).run() }
  else if (user_id) { const pId = 'mp-' + crypto.randomUUID().slice(0,8); await c.env.DB.prepare('INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(pId, meetingId, user_id, role || 'attendee').run() }
  return c.json({ success: true })
})

meetings.delete('/:id/participants/:userId', async (c) => {
  await c.env.DB.prepare('DELETE FROM meeting_participants WHERE meeting_id = ? AND user_id = ?').bind(c.req.param('id'), c.req.param('userId')).run()
  return c.json({ success: true })
})

meetings.post('/:id/minutes', async (c) => {
  const user = c.get('user')!; const meetingId = c.req.param('id'); const { content, decisions, action_items } = await c.req.json()
  const existing = await c.env.DB.prepare('SELECT id FROM meeting_minutes WHERE meeting_id = ?').bind(meetingId).first() as any
  if (existing) { await c.env.DB.prepare('UPDATE meeting_minutes SET content = ?, decisions = ?, action_items = ?, written_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(content || '', decisions || '', action_items || '', user.id, existing.id).run(); return c.json({ id: existing.id, updated: true }) }
  const id = 'mm-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO meeting_minutes (id, meeting_id, content, decisions, action_items, written_by) VALUES (?,?,?,?,?,?)').bind(id, meetingId, content || '', decisions || '', action_items || '', user.id).run()
  await c.env.DB.prepare("UPDATE meetings SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(meetingId).run()
  return c.json({ id })
})

meetings.post('/:id/minutes/upload', async (c) => {
  const user = c.get('user')!; const meetingId = c.req.param('id')
  const formData = await c.req.formData(); const file = formData.get('file') as File
  if (!file) return c.json({ error: '파일이 없습니다' }, 400)
  const ext = file.name.split('.').pop() || 'pdf'; const key = `minutes/${user.hospitalId}/${crypto.randomUUID()}.${ext}`
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  const existing = await c.env.DB.prepare('SELECT id FROM meeting_minutes WHERE meeting_id = ?').bind(meetingId).first() as any
  if (existing) { await c.env.DB.prepare('UPDATE meeting_minutes SET file_url = ?, file_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(key, file.name, existing.id).run() }
  else { const id = 'mm-' + crypto.randomUUID().slice(0,8); await c.env.DB.prepare('INSERT INTO meeting_minutes (id, meeting_id, file_url, file_name, written_by) VALUES (?,?,?,?,?)').bind(id, meetingId, key, file.name, user.id).run() }
  return c.json({ success: true, file_url: key, file_name: file.name })
})

export default meetings
