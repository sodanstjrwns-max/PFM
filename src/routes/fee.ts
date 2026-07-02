import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const fee = new Hono<{ Bindings: Bindings; Variables: Variables }>()

fee.get('/categories', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM fee_categories WHERE hospital_id=? ORDER BY sort_order, name').bind(user.hospitalId).all()
  return c.json(rows.results)
})

fee.post('/categories', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    name: { type: 'string', max: 100 },
    icon: { type: 'string', max: 10 },
    color: { type: 'string', max: 20 },
  })
  if (!b.name) return c.json({ error: '카테고리명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO fee_categories (id, hospital_id, name, icon, color) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, b.name, b.icon||'🦷', b.color||'#3b82f6').run()
  return c.json({ id, name: b.name, icon: b.icon, color: b.color })
})

fee.delete('/categories/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM fee_categories WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

fee.get('/items', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const catId = sanitizeString(c.req.query('category_id') || '', 100)
  let sql = 'SELECT fi.*, fc.name as category_name, fc.icon as category_icon FROM fee_items fi JOIN fee_categories fc ON fi.category_id=fc.id WHERE fi.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (catId) { sql += ' AND fi.category_id=?'; params.push(catId) }
  sql += ' ORDER BY fc.sort_order, fi.sort_order, fi.name LIMIT 500'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

fee.post('/items', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    category_id: { type: 'string', max: 100 },
    name: { type: 'string', max: 200 },
    base_price: { type: 'number', min: 0, max: 999999999, default: 0 },
    discount_price: { type: 'number', min: 0, max: 999999999 },
    unit: { type: 'string', max: 20 },
    duration_min: { type: 'number', min: 0, max: 9999, default: 30 },
    description: { type: 'string', max: 2000 },
  })
  if (!b.category_id || !b.name) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO fee_items (id, hospital_id, category_id, name, base_price, discount_price, unit, duration_min, description) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, b.category_id, b.name, b.base_price||0, b.discount_price||null, b.unit||'개', b.duration_min||30, b.description||'').run()
  return c.json({ id, name: b.name, base_price: b.base_price })
})

fee.put('/items/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const allowed: Record<string,{type:string,max?:number,min?:number}> = {
    name: {type:'string',max:200}, base_price: {type:'number',min:0,max:999999999},
    discount_price: {type:'number',min:0,max:999999999}, unit: {type:'string',max:20},
    duration_min: {type:'number',min:0,max:9999}, description: {type:'string',max:2000},
    is_active: {type:'number',min:0,max:1}, sort_order: {type:'number',min:0,max:9999},
  }
  const sets: string[] = []; const vals: any[] = []
  for (const [key, spec] of Object.entries(allowed)) {
    if (raw[key] !== undefined) {
      const val = spec.type === 'number' ? sanitizeNumber(raw[key], 0, spec.min, spec.max) : sanitizeString(String(raw[key]), spec.max || 200)
      sets.push(`${key}=?`); vals.push(val)
    }
  }
  if (!sets.length) return c.json({ error: '변경 사항 없음' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE fee_items SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

fee.delete('/items/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM fee_items WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default fee
