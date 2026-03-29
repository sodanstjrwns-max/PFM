import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeBody, validateFile } from '../lib/middleware'
const meetings = new Hono<{ Bindings: Bindings; Variables: Variables }>()

meetings.get('/', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || '', 10)
  const status = sanitizeString(c.req.query('status') || '', 20)
  let query = `SELECT m.*, u.name as creator_name, (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) as participant_count, (SELECT COUNT(*) FROM meeting_minutes WHERE meeting_id = m.id) as has_minutes FROM meetings m JOIN users u ON m.created_by = u.id WHERE m.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  if (user.role !== 'admin') { query += ` AND (m.visibility = 'all' OR (m.visibility = 'participants' AND EXISTS (SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.user_id = ?)) OR m.created_by = ?)`; params.push(user.id, user.id) }
  if (month) { query += ' AND m.meeting_date LIKE ?'; params.push(month + '%') }
  if (status) { query += ' AND m.status = ?'; params.push(status) }
  query += ' ORDER BY m.meeting_date DESC, m.start_time DESC LIMIT 200'
  const rows = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(rows.results)
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
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 5000 },
    meeting_date: { type: 'string', max: 10 },
    start_time: { type: 'string', max: 10 },
    end_time: { type: 'string', max: 10 },
    location: { type: 'string', max: 200 },
    visibility: { type: 'enum', values: ['all','participants','admin'] },
  })
  if (!b.title || !b.meeting_date || !b.start_time) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'mt-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, visibility, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, b.title, b.description || '', b.meeting_date, b.start_time, b.end_time || '', b.location || '', b.visibility || 'all', user.id).run()
  const orgId = 'mp-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(orgId, id, user.id, 'organizer').run()
  // participants from body
  const participants = Array.isArray(raw.participants) ? raw.participants : []
  if (participants.length > 50) return c.json({ error: '참가자는 50명까지 가능합니다' }, 400)
  for (const p of participants) {
    if (!p.user_id || p.user_id === user.id) continue
    const pId = 'mp-' + crypto.randomUUID().slice(0,8)
    const pRole = sanitizeString(p.role || 'attendee', 30)
    await c.env.DB.prepare('INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role) VALUES (?,?,?,?)').bind(pId, id, sanitizeString(p.user_id, 100), pRole).run()
  }
  const eventId = 'ev-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(eventId, user.hospitalId, '📝 ' + b.title, ((b.location ? '장소: ' + b.location + '\n' : '') + (b.description || '')).trim(), 'meeting', b.meeting_date, b.meeting_date, 0, '#3b82f6', user.id).run()
  return c.json({ id })
})

meetings.put('/:id', async (c) => {
  const user = c.get('user')!; const id = c.req.param('id')
  const raw = await c.req.json()
  const meeting = await c.env.DB.prepare('SELECT * FROM meetings WHERE id = ? AND hospital_id = ?').bind(id, user.hospitalId).first() as any
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  if (meeting.created_by !== user.id && user.role !== 'admin') return c.json({ error: '권한이 없습니다' }, 403)
  const allowed = ['title','description','meeting_date','start_time','end_time','location','status','visibility']
  const maxLens: Record<string,number> = { title:200, description:5000, meeting_date:10, start_time:10, end_time:10, location:200, status:20, visibility:20 }
  const fields: string[] = []; const vals: any[] = []
  for (const k of allowed) {
    if (raw[k] !== undefined) { fields.push(`${k} = ?`); vals.push(sanitizeString(String(raw[k]), maxLens[k] || 200)) }
  }
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
  const user = c.get('user')!; const meetingId = c.req.param('id')
  // IDOR 방지: 해당 병원의 회의인지 확인
  const meeting = await c.env.DB.prepare('SELECT id FROM meetings WHERE id=? AND hospital_id=?').bind(meetingId, user.hospitalId).first()
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    user_id: { type: 'string', max: 100 },
    role: { type: 'enum', values: ['organizer','attendee','optional'] },
    attendance: { type: 'enum', values: ['present','absent','late'] },
  })
  if (b.attendance) {
    await c.env.DB.prepare('UPDATE meeting_participants SET attendance = ? WHERE meeting_id = ? AND user_id = ?').bind(b.attendance, meetingId, b.user_id || user.id).run()
  } else if (b.user_id) {
    const pId = 'mp-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare('INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role, hospital_id) VALUES (?,?,?,?,?)').bind(pId, meetingId, b.user_id, b.role || 'attendee', user.hospitalId).run()
  }
  return c.json({ success: true })
})

meetings.delete('/:id/participants/:userId', async (c) => {
  const user = c.get('user')!
  // IDOR 방지: 해당 병원의 회의인지 확인
  const meeting = await c.env.DB.prepare('SELECT id FROM meetings WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare('DELETE FROM meeting_participants WHERE meeting_id = ? AND user_id = ?').bind(c.req.param('id'), c.req.param('userId')).run()
  return c.json({ success: true })
})

meetings.post('/:id/minutes', async (c) => {
  const user = c.get('user')!; const meetingId = c.req.param('id')
  // IDOR 방지: 해당 병원의 회의인지 확인
  const meeting = await c.env.DB.prepare('SELECT id FROM meetings WHERE id=? AND hospital_id=?').bind(meetingId, user.hospitalId).first()
  if (!meeting) return c.json({ error: '회의를 찾을 수 없습니다' }, 404)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    content: { type: 'string', max: 20000 },
    decisions: { type: 'string', max: 10000 },
    action_items: { type: 'string', max: 10000 },
  })
  const existing = await c.env.DB.prepare('SELECT id FROM meeting_minutes WHERE meeting_id = ?').bind(meetingId).first() as any
  if (existing) {
    await c.env.DB.prepare('UPDATE meeting_minutes SET content = ?, decisions = ?, action_items = ?, written_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(b.content || '', b.decisions || '', b.action_items || '', user.id, existing.id).run()
    return c.json({ id: existing.id, updated: true })
  }
  const id = 'mm-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare('INSERT INTO meeting_minutes (id, meeting_id, content, decisions, action_items, written_by, hospital_id) VALUES (?,?,?,?,?,?,?)').bind(id, meetingId, b.content || '', b.decisions || '', b.action_items || '', user.id, user.hospitalId).run()
  await c.env.DB.prepare("UPDATE meetings SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND hospital_id = ?").bind(meetingId, user.hospitalId).run()
  return c.json({ id })
})

meetings.post('/:id/minutes/upload', async (c) => {
  const user = c.get('user')!; const meetingId = c.req.param('id')
  const formData = await c.req.formData(); const file = formData.get('file') as File
  if (!file) return c.json({ error: '파일이 없습니다' }, 400)
  const fv = validateFile(file, 20)
  if (!fv.valid) return c.json({ error: fv.error }, 400)
  const key = `minutes/${user.hospitalId}/${crypto.randomUUID()}.${fv.ext}`
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  const existing = await c.env.DB.prepare('SELECT id FROM meeting_minutes WHERE meeting_id = ?').bind(meetingId).first() as any
  if (existing) { await c.env.DB.prepare('UPDATE meeting_minutes SET file_url = ?, file_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(key, sanitizeString(file.name, 200), existing.id).run() }
  else { const id = 'mm-' + crypto.randomUUID().slice(0,8); await c.env.DB.prepare('INSERT INTO meeting_minutes (id, meeting_id, file_url, file_name, written_by) VALUES (?,?,?,?,?)').bind(id, meetingId, key, sanitizeString(file.name, 200), user.id).run() }
  return c.json({ success: true, file_url: key, file_name: file.name })
})

export default meetings
