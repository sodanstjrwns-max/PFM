// ============================================================
// Quick Replies — Phase F.3
// ─────────────────────────────────────────────────────────────
// 직원이 자주 쓰는 문구를 단축어로 저장/호출.
//   user_id = NULL  → 병원 공유 (모든 직원이 사용 가능, 관리자만 작성)
//   user_id = me    → 개인 템플릿
//
// 단축어 충돌 방지: UNIQUE(hospital_id, COALESCE(user_id,''), shortcut)
// Placeholder: {patient_name} {channel_name} {user_name} {my_name} {date} {time}
//
// Routes:
//   GET    /quick-replies              내가 쓸 수 있는 전체 목록 (공유 + 내 개인)
//   GET    /quick-replies/:id          단건 조회
//   POST   /quick-replies              생성 (shared=true 면 관리자만)
//   PUT    /quick-replies/:id          수정 (소유자/관리자)
//   DELETE /quick-replies/:id          삭제 (소유자/관리자)
//   POST   /quick-replies/:id/use      사용 카운트 +1 + body 반환 (placeholder 치환)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import { generateMessengerId } from '../../lib/messenger-helpers'
import { writeMessengerAudit } from '../../lib/messenger-audit'

const qr = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ALLOWED_CATEGORIES = new Set(['general', 'reminder', 'medical', 'admin'])

function isAdmin(user: any): boolean {
  const role = user?.messengerRole || pfmRoleToMessengerRole(user?.role)
  return role === 'owner' || role === 'manager' || role === 'admin'
}

/* ─── GET /quick-replies ─────────────────────────────────────
 *   shared (user_id IS NULL) + 내 개인 (user_id = me) 합쳐서 반환.
 *   use_count 내림차순, 최근 수정 우선.
 *   ?category=general|reminder|medical|admin
 *   ?q=검색어 (shortcut/title/body LIKE)
 * ────────────────────────────────────────────────────────────*/
qr.get('/quick-replies', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)

  const category = (c.req.query('category') || '').trim()
  const q = (c.req.query('q') || '').trim()

  let sql = `
    SELECT id, hospital_id, user_id, shortcut, title, body, category, use_count,
           created_by, created_at, updated_at,
           CASE WHEN user_id IS NULL THEN 1 ELSE 0 END AS is_shared
    FROM quick_replies
    WHERE hospital_id = ? AND (user_id IS NULL OR user_id = ?)
  `
  const params: any[] = [user.hospitalId, user.id]

  if (category && ALLOWED_CATEGORIES.has(category)) {
    sql += ' AND category = ?'
    params.push(category)
  }
  if (q) {
    sql += ' AND (shortcut LIKE ? OR title LIKE ? OR body LIKE ?)'
    const pattern = `%${q}%`
    params.push(pattern, pattern, pattern)
  }
  sql += ' ORDER BY use_count DESC, updated_at DESC LIMIT 200'

  const rows = await c.env.DB.prepare(sql).bind(...params).all<any>()
  return c.json({ replies: rows.results || [], total: (rows.results || []).length })
})

/* ─── GET /quick-replies/:id ─────────────────────────────────*/
qr.get('/quick-replies/:id', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(`
    SELECT * FROM quick_replies
    WHERE id = ? AND hospital_id = ? AND (user_id IS NULL OR user_id = ?)
  `).bind(id, user.hospitalId, user.id).first<any>()

  if (!row) return c.json({ error: '단축어를 찾을 수 없습니다' }, 404)
  return c.json({ reply: row })
})

/* ─── POST /quick-replies ────────────────────────────────────
 *   body: { shortcut, title, body, category?, shared? }
 *   shared=true → user_id NULL (관리자만)
 * ────────────────────────────────────────────────────────────*/
qr.post('/quick-replies', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const shortcut = String(body.shortcut || '').trim().toLowerCase()
  const title = String(body.title || '').trim()
  const content = String(body.body || '').trim()
  const category = ALLOWED_CATEGORIES.has(body.category) ? body.category : 'general'
  const shared = !!body.shared

  if (!shortcut || !title || !content) {
    return c.json({ error: 'shortcut/title/body 모두 필수' }, 400)
  }
  if (shortcut.length > 32 || title.length > 100 || content.length > 2000) {
    return c.json({ error: '길이 초과 (shortcut 32 / title 100 / body 2000)' }, 400)
  }
  if (!/^\/?[a-z0-9_\-가-힣]+$/i.test(shortcut)) {
    return c.json({ error: 'shortcut 형식: 영/한/숫자/_/- 만 허용' }, 400)
  }

  if (shared && !isAdmin(user)) {
    return c.json({ error: '병원 공유 단축어는 관리자만 만들 수 있습니다' }, 403)
  }

  const userId = shared ? null : user.id
  const id = generateMessengerId('qr')

  // shortcut 중복 체크 (UNIQUE index 가 잡지만 더 친절한 에러)
  const conflict = await c.env.DB.prepare(`
    SELECT id FROM quick_replies
    WHERE hospital_id = ? AND COALESCE(user_id,'') = COALESCE(?,'') AND shortcut = ?
  `).bind(user.hospitalId, userId, shortcut).first()
  if (conflict) return c.json({ error: '이미 동일한 단축어가 있습니다' }, 409)

  try {
    await c.env.DB.prepare(`
      INSERT INTO quick_replies
        (id, hospital_id, user_id, shortcut, title, body, category, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, user.hospitalId, userId, shortcut, title, content, category, user.id).run()

    await writeMessengerAudit(c.env.DB, {
      hospitalId: user.hospitalId,
      actorId: user.id,
      action: 'quick_reply.create',
      targetType: 'quick_reply',
      targetId: id,
      metadata: { shortcut, shared, category }
    })
  } catch (e: any) {
    return c.json({ error: 'DB 오류: ' + (e.message || 'unknown') }, 500)
  }

  return c.json({ success: true, id, shortcut, shared })
})

/* ─── PUT /quick-replies/:id ─────────────────────────────────*/
qr.put('/quick-replies/:id', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(
    'SELECT * FROM quick_replies WHERE id = ? AND hospital_id = ?'
  ).bind(id, user.hospitalId).first<any>()
  if (!row) return c.json({ error: '단축어를 찾을 수 없습니다' }, 404)

  // 권한: 공유면 관리자, 개인이면 소유자만
  if (row.user_id === null) {
    if (!isAdmin(user)) return c.json({ error: '관리자 전용' }, 403)
  } else if (row.user_id !== user.id) {
    return c.json({ error: '본인 단축어가 아닙니다' }, 403)
  }

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const updates: string[] = []
  const params: any[] = []
  if (typeof body.title === 'string') { updates.push('title = ?'); params.push(body.title.trim().slice(0, 100)) }
  if (typeof body.body === 'string')  { updates.push('body = ?');  params.push(body.body.trim().slice(0, 2000)) }
  if (body.category && ALLOWED_CATEGORIES.has(body.category)) {
    updates.push('category = ?'); params.push(body.category)
  }
  if (updates.length === 0) return c.json({ error: '변경할 항목 없음' }, 400)
  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await c.env.DB.prepare(
    `UPDATE quick_replies SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run()

  await writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'quick_reply.update',
    targetType: 'quick_reply',
    targetId: id,
    metadata: { fields: Object.keys(body) }
  })

  return c.json({ success: true, id })
})

/* ─── DELETE /quick-replies/:id ──────────────────────────────*/
qr.delete('/quick-replies/:id', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(
    'SELECT * FROM quick_replies WHERE id = ? AND hospital_id = ?'
  ).bind(id, user.hospitalId).first<any>()
  if (!row) return c.json({ error: '단축어를 찾을 수 없습니다' }, 404)

  if (row.user_id === null) {
    if (!isAdmin(user)) return c.json({ error: '관리자 전용' }, 403)
  } else if (row.user_id !== user.id) {
    return c.json({ error: '본인 단축어가 아닙니다' }, 403)
  }

  await c.env.DB.prepare('DELETE FROM quick_replies WHERE id = ?').bind(id).run()
  await writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'quick_reply.delete',
    targetType: 'quick_reply',
    targetId: id,
    metadata: { shortcut: row.shortcut }
  })

  return c.json({ success: true })
})

/* ─── POST /quick-replies/:id/use ────────────────────────────
 *   use_count +1, placeholder 치환된 body 반환.
 *   body: { context?: { patient_name?, channel_name?, user_name? } }
 * ────────────────────────────────────────────────────────────*/
qr.post('/quick-replies/:id/use', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(`
    SELECT * FROM quick_replies
    WHERE id = ? AND hospital_id = ? AND (user_id IS NULL OR user_id = ?)
  `).bind(id, user.hospitalId, user.id).first<any>()
  if (!row) return c.json({ error: '단축어를 찾을 수 없습니다' }, 404)

  let ctx: any = {}
  try { ctx = await c.req.json() } catch {}
  const context = ctx?.context || {}

  // Placeholder 치환
  let resolved = String(row.body)
  const substitutions: Record<string, string> = {
    '{patient_name}': String(context.patient_name || ''),
    '{channel_name}': String(context.channel_name || ''),
    '{user_name}': String(context.user_name || user.name || ''),
    '{my_name}': String(user.name || ''),
    '{date}': new Date().toISOString().slice(0, 10),
    '{time}': new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  for (const [k, v] of Object.entries(substitutions)) {
    resolved = resolved.split(k).join(v)
  }

  // use_count 증가
  await c.env.DB.prepare(
    'UPDATE quick_replies SET use_count = use_count + 1 WHERE id = ?'
  ).bind(id).run()

  return c.json({
    success: true,
    id,
    shortcut: row.shortcut,
    title: row.title,
    body: resolved,
    raw_body: row.body
  })
})

export default qr
