import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const materials = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Categories ─── */
materials.get('/categories/:module', async (c) => {
  const mod = c.req.param('module')
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM categories WHERE module=? AND (hospital_id IS NULL OR hospital_id=?) ORDER BY sort_order').bind(mod, user.hospitalId).all()
  return c.json(rows.results)
})

/* ─── Materials ─── */
materials.get('/materials', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  const search = c.req.query('search')
  let sql = 'SELECT m.*, c.name as category_name FROM materials m JOIN categories c ON m.category_id=c.id WHERE (m.hospital_id IS NULL OR m.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND m.category_id=?'; params.push(cat) }
  if (search) { sql += ' AND (m.title LIKE ? OR m.description LIKE ?)'; params.push('%' + search + '%', '%' + search + '%') }
  sql += ' ORDER BY m.sort_order, m.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/materials', async (c) => {
  const user = c.get('user')!
  const form = await c.req.formData()
  const title = form.get('title') as string
  const categoryId = form.get('category_id') as string
  const description = form.get('description') as string || ''
  const file = form.get('file') as File
  if (!title || !categoryId || !file) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `materials/${user.hospitalId}/${id}.${ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const fileUrl = `/api/protected/files/${key}`
  const fileType = file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'pdf' : 'image'
  await c.env.DB.prepare('INSERT INTO materials (id, hospital_id, category_id, title, description, file_url, file_type) VALUES (?,?,?,?,?,?,?)').bind(id, user.hospitalId, categoryId, title, description, fileUrl, fileType).run()
  return c.json({ id, title, file_url: fileUrl, file_type: fileType })
})

materials.delete('/materials/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM materials WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Pricing ─── */
materials.get('/pricing', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT p.*, c.name as category_name FROM pricing p JOIN categories c ON p.category_id=c.id WHERE p.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND p.category_id=?'; params.push(cat) }
  sql += ' ORDER BY c.sort_order, p.sort_order'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/pricing', async (c) => {
  const user = c.get('user')!
  const { category_id, procedure_name, price_min, price_max, description } = await c.req.json()
  if (!category_id || !procedure_name) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO pricing (id, hospital_id, category_id, procedure_name, price_min, price_max, description) VALUES (?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id, procedure_name, price_min || null, price_max || null, description || '').run()
  return c.json({ id })
})

materials.put('/pricing/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const { procedure_name, price_min, price_max, description, is_active } = await c.req.json()
  await c.env.DB.prepare('UPDATE pricing SET procedure_name=?, price_min=?, price_max=?, description=?, is_active=? WHERE id=? AND hospital_id=?').bind(procedure_name, price_min, price_max, description || '', is_active ?? 1, id, user.hospitalId).run()
  return c.json({ success: true })
})

materials.delete('/pricing/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM pricing WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Cases ─── */
materials.get('/cases', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT cs.*, c.name as category_name, (SELECT COUNT(*) FROM case_images WHERE case_id=cs.id) as image_count FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND cs.category_id=?'; params.push(cat) }
  sql += ' ORDER BY cs.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/cases', async (c) => {
  const user = c.get('user')!
  const { category_id, title, description, patient_age, patient_gender, treatment_period } = await c.req.json()
  if (!category_id || !title) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO cases (id, hospital_id, category_id, title, description, patient_age, patient_gender, treatment_period, created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id, title, description || '', patient_age || '', patient_gender || '', treatment_period || '', user.id).run()
  return c.json({ id })
})

materials.get('/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const cs: any = await c.env.DB.prepare('SELECT cs.*, c.name as category_name FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.id=? AND cs.hospital_id=?').bind(id, user.hospitalId).first()
  if (!cs) return c.json({ error: 'Not found' }, 404)
  const images = await c.env.DB.prepare('SELECT * FROM case_images WHERE case_id=? ORDER BY sort_order').bind(id).all()
  return c.json({ ...cs, images: images.results })
})

materials.delete('/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM case_images WHERE case_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM cases WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Case Images ─── */
materials.post('/cases/:id/images', async (c) => {
  const user = c.get('user')!
  const caseId = c.req.param('id')
  const form = await c.req.formData()
  const file = form.get('file') as File
  const imageType = (form.get('image_type') as string) || 'during'
  const caption = (form.get('caption') as string) || ''
  if (!file) return c.json({ error: '파일을 선택해주세요' }, 400)
  const imgId = crypto.randomUUID()
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `cases/${user.hospitalId}/${caseId}/${imgId}.${ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const imageUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('INSERT INTO case_images (id, case_id, image_url, image_type, caption) VALUES (?,?,?,?,?)').bind(imgId, caseId, imageUrl, imageType, caption).run()
  return c.json({ id: imgId, image_url: imageUrl })
})

materials.delete('/case-images/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM case_images WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

/* ─── File Serving (R2) ─── */
materials.get('/files/*', async (c) => {
  const key = c.req.path.replace('/api/protected/files/', '')
  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'File not found' }, 404)
  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' }
  })
})

/* ─── Scripts ─── */
materials.get('/scripts', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT s.*, c.name as category_name FROM scripts s LEFT JOIN categories c ON s.category_id=c.id WHERE (s.hospital_id IS NULL OR s.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND s.category_id=?'; params.push(cat) }
  sql += ' ORDER BY s.sort_order, s.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

materials.post('/scripts', async (c) => {
  const user = c.get('user')!
  const { category_id, title, situation, script_text, objection, response } = await c.req.json()
  if (!title || !script_text) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id||null, title, situation||'', script_text, objection||'', response||'').run()
  return c.json({ id })
})

materials.delete('/scripts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM scripts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default materials
