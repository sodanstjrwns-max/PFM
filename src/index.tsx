import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { DB: D1Database; R2: R2Bucket }
type Variables = { user?: { id: string; hospitalId: string; email: string; name: string; role: string } }
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/*', cors())

/* ─── Crypto helpers (Web Crypto API only) ─── */
async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
  return saltHex + ':' + hashHex
}
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$pbkdf2$')) return pw === stored.replace('$pbkdf2$', '')
  const [saltHex, hashHex] = stored.split(':')
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  const computed = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === hashHex
}

const JWT_SECRET = 'pfm-secret-key-change-in-production'
function b64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function b64UrlDecodeStr(str: string): string {
  return new TextDecoder().decode(b64UrlDecode(str));
}
async function signJWT(payload: Record<string, unknown>): Promise<string> {
  const header = b64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64UrlEncode(JSON.stringify({ ...payload, exp: Date.now() + 86400000 * 7 }));
  const data = header + '.' + body
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigStr = b64UrlEncode(new Uint8Array(sig));
  return data + '.' + sigStr
}
async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.')
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = b64UrlDecode(sig)
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(header + '.' + body))
    if (!valid) return null
    const payload = JSON.parse(b64UrlDecodeStr(body))
    if (payload.exp && payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

/* ─── Auth Middleware ─── */
app.use('/api/protected/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: '인증이 필요합니다' }, 401)
  const payload = await verifyJWT(auth.slice(7))
  if (!payload) return c.json({ error: '토큰이 만료되었거나 유효하지 않습니다' }, 401)
  c.set('user', payload as any)
  await next()
})

/* ─── Auth API ─── */
app.post('/api/auth/register', async (c) => {
  const { hospitalName, email, password, name } = await c.req.json()
  if (!hospitalName || !email || !password || !name) return c.json({ error: '모든 필드를 입력해주세요' }, 400)
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first()
  if (existing) return c.json({ error: '이미 등록된 이메일입니다' }, 400)
  const hid = crypto.randomUUID()
  const uid = crypto.randomUUID()
  const hash = await hashPassword(password)
  await c.env.DB.prepare('INSERT INTO hospitals (id, name) VALUES (?, ?)').bind(hid, hospitalName).run()
  await c.env.DB.prepare('INSERT INTO users (id, hospital_id, email, password_hash, name, role) VALUES (?,?,?,?,?,?)').bind(uid, hid, email, hash, name, 'admin').run()
  const token = await signJWT({ id: uid, hospitalId: hid, email, name, role: 'admin' })
  return c.json({ token, user: { id: uid, hospitalId: hid, email, name, role: 'admin', hospitalName } })
})

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: '이메일과 비밀번호를 입력해주세요' }, 400)
  const row: any = await c.env.DB.prepare('SELECT u.*, h.name as hospital_name FROM users u JOIN hospitals h ON u.hospital_id=h.id WHERE u.email=?').bind(email).first()
  if (!row) return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401)
  const token = await signJWT({ id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role })
  return c.json({ token, user: { id: row.id, hospitalId: row.hospital_id, email: row.email, name: row.name, role: row.role, hospitalName: row.hospital_name } })
})

/* ─── Categories API ─── */
app.get('/api/protected/categories/:module', async (c) => {
  const mod = c.req.param('module')
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM categories WHERE module=? AND (hospital_id IS NULL OR hospital_id=?) ORDER BY sort_order').bind(mod, user.hospitalId).all()
  return c.json(rows.results)
})

/* ─── Materials API ─── */
app.get('/api/protected/materials', async (c) => {
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

app.post('/api/protected/materials', async (c) => {
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

app.delete('/api/protected/materials/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM materials WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Pricing API ─── */
app.get('/api/protected/pricing', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT p.*, c.name as category_name FROM pricing p JOIN categories c ON p.category_id=c.id WHERE p.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND p.category_id=?'; params.push(cat) }
  sql += ' ORDER BY c.sort_order, p.sort_order'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/pricing', async (c) => {
  const user = c.get('user')!
  const { category_id, procedure_name, price_min, price_max, description } = await c.req.json()
  if (!category_id || !procedure_name) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO pricing (id, hospital_id, category_id, procedure_name, price_min, price_max, description) VALUES (?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id, procedure_name, price_min || null, price_max || null, description || '').run()
  return c.json({ id })
})

app.put('/api/protected/pricing/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const { procedure_name, price_min, price_max, description, is_active } = await c.req.json()
  await c.env.DB.prepare('UPDATE pricing SET procedure_name=?, price_min=?, price_max=?, description=?, is_active=? WHERE id=? AND hospital_id=?').bind(procedure_name, price_min, price_max, description || '', is_active ?? 1, id, user.hospitalId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/pricing/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM pricing WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Cases API ─── */
app.get('/api/protected/cases', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT cs.*, c.name as category_name, (SELECT COUNT(*) FROM case_images WHERE case_id=cs.id) as image_count FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND cs.category_id=?'; params.push(cat) }
  sql += ' ORDER BY cs.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/cases', async (c) => {
  const user = c.get('user')!
  const { category_id, title, description, patient_age, patient_gender, treatment_period } = await c.req.json()
  if (!category_id || !title) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO cases (id, hospital_id, category_id, title, description, patient_age, patient_gender, treatment_period, created_by) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id, title, description || '', patient_age || '', patient_gender || '', treatment_period || '', user.id).run()
  return c.json({ id })
})

app.get('/api/protected/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const cs: any = await c.env.DB.prepare('SELECT cs.*, c.name as category_name FROM cases cs JOIN categories c ON cs.category_id=c.id WHERE cs.id=? AND cs.hospital_id=?').bind(id, user.hospitalId).first()
  if (!cs) return c.json({ error: 'Not found' }, 404)
  const images = await c.env.DB.prepare('SELECT * FROM case_images WHERE case_id=? ORDER BY sort_order').bind(id).all()
  return c.json({ ...cs, images: images.results })
})

app.delete('/api/protected/cases/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM case_images WHERE case_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM cases WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Case Images API ─── */
app.post('/api/protected/cases/:id/images', async (c) => {
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

app.delete('/api/protected/case-images/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM case_images WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

/* ─── File Serving (R2) ─── */
app.get('/api/protected/files/*', async (c) => {
  const key = c.req.path.replace('/api/protected/files/', '')
  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'File not found' }, 404)
  return new Response(obj.body as ReadableStream, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' }
  })
})

/* ─── Community Posts API ─── */
app.get('/api/protected/posts', async (c) => {
  const user = c.get('user')!
  const board = c.req.query('board') || ''
  let sql = 'SELECT p.*, u.name as author_name FROM posts p JOIN users u ON p.author_id=u.id WHERE p.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (board) { sql += ' AND p.board_type=?'; params.push(board) }
  sql += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT 100'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/posts', async (c) => {
  const user = c.get('user')!
  const { board_type, title, content, target_name, is_anonymous, is_pinned } = await c.req.json()
  if (!board_type || !title) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO posts (id, hospital_id, board_type, author_id, title, content, target_name, is_anonymous, is_pinned) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, board_type, user.id, title, content||'', target_name||'', is_anonymous?1:0, is_pinned?1:0).run()
  return c.json({ id })
})

app.delete('/api/protected/posts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM comments WHERE post_id=?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM posts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

app.get('/api/protected/posts/:id/comments', async (c) => {
  const rows = await c.env.DB.prepare('SELECT cm.*, u.name as author_name FROM comments cm JOIN users u ON cm.author_id=u.id WHERE cm.post_id=? ORDER BY cm.created_at').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

app.post('/api/protected/posts/:id/comments', async (c) => {
  const user = c.get('user')!
  const { content } = await c.req.json()
  if (!content) return c.json({ error: '내용을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO comments (id, post_id, author_id, content) VALUES (?,?,?,?)').bind(id, c.req.param('id'), user.id, content).run()
  return c.json({ id })
})

app.post('/api/protected/posts/:id/like', async (c) => {
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

/* ─── Kanban API ─── */
app.get('/api/protected/kanban/:boardType', async (c) => {
  const user = c.get('user')!
  const boardType = c.req.param('boardType')
  let board: any = await c.env.DB.prepare('SELECT * FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) {
    const id = crypto.randomUUID()
    const title = boardType === 'purchase' ? '물품 구매 요청' : boardType === 'repair' ? '수리/정비 요청' : '칸반보드'
    await c.env.DB.prepare('INSERT INTO kanban_boards (id, hospital_id, board_type, title) VALUES (?,?,?,?)').bind(id, user.hospitalId, boardType, title).run()
    board = { id, board_type: boardType, title }
  }
  const cards = await c.env.DB.prepare('SELECT kc.*, u.name as requested_by_name FROM kanban_cards kc JOIN users u ON kc.requested_by=u.id WHERE kc.board_id=? ORDER BY CASE kc.priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 WHEN \'normal\' THEN 2 ELSE 3 END, kc.created_at DESC').bind(board.id).all()
  return c.json({ board, cards: cards.results })
})

app.post('/api/protected/kanban/:boardType/cards', async (c) => {
  const user = c.get('user')!
  const boardType = c.req.param('boardType')
  const board: any = await c.env.DB.prepare('SELECT id FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) return c.json({ error: '보드를 찾을 수 없습니다' }, 404)
  const { title, description, priority, estimated_cost, due_date } = await c.req.json()
  if (!title) return c.json({ error: '제목을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO kanban_cards (id, board_id, hospital_id, title, description, priority, requested_by, estimated_cost, due_date) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, board.id, user.hospitalId, title, description||'', priority||'normal', user.id, estimated_cost||null, due_date||null).run()
  return c.json({ id })
})

app.put('/api/protected/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  const { status, actual_cost } = await c.req.json()
  const completed = status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE kanban_cards SET status=?, actual_cost=COALESCE(?,actual_cost), completed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?').bind(status, actual_cost||null, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

app.delete('/api/protected/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM kanban_cards WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Scripts API ─── */
app.get('/api/protected/scripts', async (c) => {
  const user = c.get('user')!
  const cat = c.req.query('category')
  let sql = 'SELECT s.*, c.name as category_name FROM scripts s LEFT JOIN categories c ON s.category_id=c.id WHERE (s.hospital_id IS NULL OR s.hospital_id=?)'
  const params: any[] = [user.hospitalId]
  if (cat) { sql += ' AND s.category_id=?'; params.push(cat) }
  sql += ' ORDER BY s.sort_order, s.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/scripts', async (c) => {
  const user = c.get('user')!
  const { category_id, title, situation, script_text, objection, response } = await c.req.json()
  if (!title || !script_text) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, category_id||null, title, situation||'', script_text, objection||'', response||'').run()
  return c.json({ id })
})

app.delete('/api/protected/scripts/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM scripts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Marketing API ─── */
app.get('/api/protected/marketing/channels', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM marketing_channels WHERE hospital_id=? ORDER BY created_at').bind(user.hospitalId).all()
  return c.json(rows.results)
})

app.post('/api/protected/marketing/channels', async (c) => {
  const user = c.get('user')!
  const { name, monthly_cost } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_channels (id, hospital_id, name, monthly_cost) VALUES (?,?,?,?)').bind(id, user.hospitalId, name, monthly_cost||0).run()
  return c.json({ id })
})

app.get('/api/protected/marketing/records', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  let sql = 'SELECT r.*, ch.name as channel_name FROM marketing_records r JOIN marketing_channels ch ON r.channel_id=ch.id WHERE r.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND r.record_month=?'; params.push(month) }
  sql += ' ORDER BY r.record_month DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/marketing/records', async (c) => {
  const user = c.get('user')!
  const { channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, channel_id, record_month, new_patients||0, revisit_patients||0, ad_spend||0, revenue||0).run()
  return c.json({ id })
})

app.get('/api/protected/reviews', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM reviews WHERE hospital_id=? ORDER BY review_date DESC, created_at DESC LIMIT 100').bind(user.hospitalId).all()
  return c.json(rows.results)
})

app.post('/api/protected/reviews', async (c) => {
  const user = c.get('user')!
  const { platform, reviewer_name, rating, content, reply, review_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, platform||'manual', reviewer_name||'', rating||5, content||'', reply||'', review_date||new Date().toISOString().split('T')[0]).run()
  return c.json({ id })
})

/* ─── Checklists API ─── */
app.get('/api/protected/checklists', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM checklists WHERE hospital_id=? ORDER BY created_at').bind(user.hospitalId).all()
  return c.json(rows.results)
})

app.post('/api/protected/checklists', async (c) => {
  const user = c.get('user')!
  const { title, checklist_type, items } = await c.req.json()
  if (!title || !items) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklists (id, hospital_id, title, checklist_type, items) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, title, checklist_type||'custom', JSON.stringify(items)).run()
  return c.json({ id })
})

app.post('/api/protected/checklists/:id/complete', async (c) => {
  const user = c.get('user')!
  const { completed_items, notes, log_date } = await c.req.json()
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklist_logs (id, checklist_id, completed_by, completed_items, log_date, notes) VALUES (?,?,?,?,?,?)').bind(id, c.req.param('id'), user.id, JSON.stringify(completed_items), log_date||new Date().toISOString().split('T')[0], notes||'').run()
  return c.json({ id })
})

app.get('/api/protected/checklists/:id/logs', async (c) => {
  const rows = await c.env.DB.prepare('SELECT cl.*, u.name as completed_by_name FROM checklist_logs cl JOIN users u ON cl.completed_by=u.id WHERE cl.checklist_id=? ORDER BY cl.log_date DESC LIMIT 30').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

/* ─── Events (Calendar) API ─── */
app.get('/api/protected/events', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month')
  let sql = 'SELECT e.*, u.name as created_by_name FROM events e JOIN users u ON e.created_by=u.id WHERE e.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND e.start_date LIKE ?'; params.push(month + '%') }
  sql += ' ORDER BY e.start_date'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

app.post('/api/protected/events', async (c) => {
  const user = c.get('user')!
  const { title, description, event_type, start_date, end_date, all_day, color } = await c.req.json()
  if (!title || !start_date) return c.json({ error: '필수 항목' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, title, description||'', event_type||'meeting', start_date, end_date||start_date, all_day??1, color||'#0f766e', user.id).run()
  return c.json({ id })
})

app.delete('/api/protected/events/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM events WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Dashboard stats ─── */
app.get('/api/protected/dashboard', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const [matCount, prcCount, caseCount, imgCount, postCount, kanbanCount] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM materials WHERE hospital_id=? OR hospital_id IS NULL').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM pricing WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM cases WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM case_images ci JOIN cases cs ON ci.case_id=cs.id WHERE cs.hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM posts WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM kanban_cards WHERE hospital_id=? AND status!=\'completed\'').bind(hid).first<{ c: number }>(),
  ])
  return c.json({ materials: matCount?.c||0, pricing: prcCount?.c||0, cases: caseCount?.c||0, caseImages: imgCount?.c||0, posts: postCount?.c||0, pendingTasks: kanbanCount?.c||0 })
})

/* ─── Main Page (SPA) ─── */
app.get('*', async (c) => {
  // Serve static files from R2 first, then SPA
  if (c.req.path.startsWith('/static/')) {
    // handled by Cloudflare Pages automatically
  }
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Patient Funnel Manager</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/style.css" rel="stylesheet">
</head>
<body>
<div id="app"></div>
<script src="/static/app.js"><` + `/script>
</body>
</html>`
}

export default app
