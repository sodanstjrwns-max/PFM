import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeBody, validateFile } from '../lib/middleware'

const materials = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Categories ─── */
materials.get('/categories/:module', async (c) => {
  const mod = sanitizeString(c.req.param('module'), 50)
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, name, icon, module, hospital_id, sort_order, created_at FROM categories WHERE module=? AND (hospital_id IS NULL OR hospital_id=?) ORDER BY sort_order').bind(mod, user.hospitalId).all()
  return c.json(rows.results)
})

/* ─── Materials ─── */
materials.get('/materials', async (c) => {
  const user = c.get('user')!
  const cat = sanitizeString(c.req.query('category') || '', 100)
  const search = sanitizeString(c.req.query('search') || '', 200)
  let sql = 'SELECT m.*, c.name as category_name FROM materials m JOIN categories c ON m.category_id=c.id WHERE (m.hospital_id IS NULL OR m.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND m.category_id=?'; params.push(cat) }
  if (search) { sql += ' AND (m.title LIKE ? OR m.description LIKE ?)'; params.push('%' + search + '%', '%' + search + '%') }
  sql += ' ORDER BY m.sort_order, m.created_at DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/materials', async (c) => {
  const user = c.get('user')!
  const form = await c.req.formData()
  const title = sanitizeString(form.get('title') as string || '', 200)
  const categoryId = sanitizeString(form.get('category_id') as string || '', 100)
  const description = sanitizeString(form.get('description') as string || '', 2000)
  const file = form.get('file') as unknown as File
  if (!title || !categoryId || !file) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const fv = validateFile(file, 50)
  if (!fv.valid) return c.json({ error: fv.error }, 400)
  const id = crypto.randomUUID()
  const key = `materials/${user.hospitalId}/${id}.${fv.ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const fileUrl = `/api/protected/files/${key}`
  const fileType = fv.safeType === 'video' ? 'video' : fv.safeType === 'document' ? 'pdf' : 'image'
  await c.env.DB.prepare('INSERT INTO materials (id, hospital_id, category_id, title, description, file_url, file_type) VALUES (?,?,?,?,?,?,?)').bind(id, user.hospitalId, categoryId, title, description, fileUrl, fileType).run()
  return c.json({ id, title, file_url: fileUrl, file_type: fileType })
})

materials.delete('/materials/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM materials WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Cases ─── */
materials.get('/cases', async (c) => {
  const user = c.get('user')!
  const cat = sanitizeString(c.req.query('category') || '', 100)
  let sql = 'SELECT cs.*, c.name as category_name, (SELECT COUNT(*) FROM case_images WHERE case_id=cs.id) as image_count FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND cs.category_id=?'; params.push(cat) }
  sql += ' ORDER BY cs.created_at DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/cases', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    category_id: { type: 'string', max: 100 },
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 5000 },
    patient_age: { type: 'string', max: 20 },
    patient_gender: { type: 'string', max: 10 },
    treatment_period: { type: 'string', max: 100 },
  })
  if (!b.category_id || !b.title) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO cases (id, hospital_id, category_id, title, description, patient_age, patient_gender, treatment_period, created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.category_id, b.title, b.description || '', b.patient_age || '', b.patient_gender || '', b.treatment_period || '', user.id).run()
  return c.json({ id })
})

materials.get('/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const cs: any = await c.env.DB.prepare('SELECT cs.*, c.name as category_name FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.id=? AND cs.hospital_id=?').bind(id, user.hospitalId).first()
  if (!cs) return c.json({ error: 'Not found' }, 404)
  const images = await c.env.DB.prepare('SELECT id, case_id, image_url, image_type, caption, sort_order FROM case_images WHERE case_id=? AND hospital_id=? ORDER BY sort_order').bind(id, user.hospitalId).all()
  return c.json({ ...cs, images: images.results })
})

materials.delete('/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM case_images WHERE case_id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  await c.env.DB.prepare('DELETE FROM cases WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Case Images ─── */
materials.post('/cases/:id/images', async (c) => {
  const user = c.get('user')!
  const caseId = c.req.param('id')
  // IDOR 방지: 해당 병원의 케이스인지 확인
  const cs = await c.env.DB.prepare('SELECT id FROM cases WHERE id=? AND hospital_id=?').bind(caseId, user.hospitalId).first()
  if (!cs) return c.json({ error: '케이스를 찾을 수 없습니다' }, 404)
  const form = await c.req.formData()
  const file = form.get('file') as unknown as File
  const imageType = sanitizeString((form.get('image_type') as string) || 'during', 20)
  const caption = sanitizeString((form.get('caption') as string) || '', 500)
  if (!file) return c.json({ error: '파일을 선택해주세요' }, 400)
  const fv = validateFile(file, 20)
  if (!fv.valid) return c.json({ error: fv.error }, 400)
  const imgId = crypto.randomUUID()
  const key = `cases/${user.hospitalId}/${caseId}/${imgId}.${fv.ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const imageUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('INSERT INTO case_images (id, case_id, image_url, image_type, caption, hospital_id) VALUES (?,?,?,?,?,?)').bind(imgId, caseId, imageUrl, imageType, caption, user.hospitalId).run()
  return c.json({ id: imgId, image_url: imageUrl })
})

materials.delete('/case-images/:id', async (c) => {
  const user = c.get('user')!
  // IDOR 방지: case_images → cases → hospital_id 검증
  const img: any = await c.env.DB.prepare('SELECT ci.id, cs.hospital_id FROM case_images ci JOIN cases cs ON ci.case_id=cs.id WHERE ci.id=?').bind(c.req.param('id')).first()
  if (!img || img.hospital_id !== user.hospitalId) return c.json({ error: '이미지를 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare('DELETE FROM case_images WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

/* ─── File Serving (R2) ─── */
materials.get('/files/*', async (c) => {
  const user = c.get('user')!
  const rawKey = c.req.path.replace('/api/protected/files/', '')
  // Decode and check for path traversal (defense-in-depth)
  let key: string
  try { key = decodeURIComponent(rawKey) } catch { return c.json({ error: 'Invalid path' }, 400) }
  if (key.includes('..') || key.includes('\0') || rawKey.includes('%2e%2e') || rawKey.toLowerCase().includes('%2e%2e')) {
    return c.json({ error: 'Invalid path' }, 400)
  }

  // 🔒 Multi-tenant isolation: key must belong to user's hospital
  // Allowed key patterns:
  //   resumes/{hid}/...      (hire.ts)
  //   materials/{hid}/...    (materials.ts)
  //   cases/{hid}/...        (materials.ts)
  //   minutes/{hid}/...      (meetings.ts)
  const allowedPrefixes = ['resumes/', 'materials/', 'cases/', 'minutes/']
  const prefix = allowedPrefixes.find(p => key.startsWith(p))
  if (!prefix) return c.json({ error: 'Invalid path' }, 400)
  const rest = key.slice(prefix.length)
  const hidInKey = rest.split('/')[0]
  if (hidInKey !== user.hospitalId) {
    return c.json({ error: 'File not found' }, 404)  // 404로 존재 여부도 숨김
  }

  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'File not found' }, 404)
  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'private, max-age=31536000' }
  })
})

/* ─── Scripts ─── */
materials.get('/scripts', async (c) => {
  const user = c.get('user')!
  const cat = sanitizeString(c.req.query('category') || '', 100)
  let sql = 'SELECT s.*, c.name as category_name FROM scripts s LEFT JOIN categories c ON s.category_id=c.id WHERE (s.hospital_id IS NULL OR s.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND s.category_id=?'; params.push(cat) }
  sql += ' ORDER BY s.sort_order, s.created_at DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/scripts', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    category_id: { type: 'string', max: 100 },
    title: { type: 'string', max: 200 },
    situation: { type: 'string', max: 2000 },
    script_text: { type: 'string', max: 5000 },
    objection: { type: 'string', max: 2000 },
    response: { type: 'string', max: 2000 },
  })
  if (!b.title || !b.script_text) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.category_id||null, b.title, b.situation||'', b.script_text, b.objection||'', b.response||'').run()
  return c.json({ id })
})

materials.delete('/scripts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM scripts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default materials
