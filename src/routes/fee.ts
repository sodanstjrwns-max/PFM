import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole } from '../lib/middleware'
const fee = new Hono<{ Bindings: Bindings; Variables: Variables }>()

fee.get('/categories', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM fee_categories WHERE hospital_id=? ORDER BY sort_order, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

// 카테고리 생성
fee.post('/categories', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const { name, icon, color } = await c.req.json()
  if (!name) return c.json({ error: '카테고리명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO fee_categories (id, hospital_id, name, icon, color) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, name, icon||'🦷', color||'#3b82f6').run()
  return c.json({ id, name, icon, color })
})

// 카테고리 삭제
fee.delete('/categories/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM fee_categories WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 수가 항목 목록
fee.get('/items', async (c) => {
  const user = c.get('user')!
  const catId = c.req.query('category_id')
  let sql = 'SELECT fi.*, fc.name as category_name, fc.icon as category_icon FROM fee_items fi JOIN fee_categories fc ON fi.category_id=fc.id WHERE fi.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (catId) { sql += ' AND fi.category_id=?'; params.push(catId) }
  sql += ' ORDER BY fc.sort_order, fi.sort_order, fi.name'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

// 수가 항목 생성
fee.post('/items', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const { category_id, name, base_price, discount_price, unit, duration_min, description } = await c.req.json()
  if (!category_id || !name) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO fee_items (id, hospital_id, category_id, name, base_price, discount_price, unit, duration_min, description) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, category_id, name, base_price||0, discount_price||null, unit||'개', duration_min||30, description||'').run()
  return c.json({ id, name, base_price })
})

// 수가 항목 수정
fee.put('/items/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const sets: string[] = []; const vals: any[] = []
  for (const key of ['name','base_price','discount_price','unit','duration_min','description','is_active','sort_order']) {
    if (body[key] !== undefined) { sets.push(`${key}=?`); vals.push(body[key]) }
  }
  if (!sets.length) return c.json({ error: '변경 사항 없음' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE fee_items SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 수가 항목 삭제
fee.delete('/items/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM fee_items WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})


export default fee
