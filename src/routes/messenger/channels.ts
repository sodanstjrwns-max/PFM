// ============================================================
// Messenger Channels — Patient Chat 통합 Phase B
// ─────────────────────────────────────────────────────────────
// Patient Chat v5.5.5 의 채널 라우트를 PFM 패턴으로 이식.
//   - JWT/hospital_id 컨텍스트 → c.get('user') 에서 추출
//   - hasPermission → hasMessengerPermission(user.messengerRole, ...)
//   - generateId('ch') → generateMessengerId('ch')
//   - writeAuditLog → writeMessengerAudit
//   - 모든 SQL 에 `hospital_id = ?` 강제 (멀티테넌트)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import {
  generateMessengerId,
  assertChannelAccess,
  assertSameHospitalUser,
  hasMessengerPermission,
  touchUserPresence,
} from '../../lib/messenger-helpers'
import {
  writeMessengerAudit,
  getClientIP,
  getUserAgent,
} from '../../lib/messenger-audit'

const channels = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/** Typing indicator — in-memory per worker isolate (best-effort, 4 초 TTL) */
const typingState: Record<string, { userId: string; userName: string; expires: number }[]> = {}

/* ═══ GET /messenger/channels ═══
 *  현재 사용자가 멤버인 모든 채널 + 미읽음 수 + 카테고리 라벨
 */
channels.get('/', async (c) => {
  const user = c.get('user')!
  const userId = user.id
  const hospitalId = user.hospitalId

  const { results } = await c.env.DB.prepare(`
    SELECT
      c.id, c.name, c.description, c.type, c.category, c.view_mode,
      c.is_default, c.write_restricted, c.created_by, c.created_at, c.updated_at,
      cm.category_label, cm.last_read_at, cm.role AS channel_role,
      (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) AS member_count,
      (SELECT COUNT(*) FROM messages m
        WHERE m.channel_id = c.id
          AND m.is_deleted = 0
          AND m.user_id != ?
          AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
      ) AS unread_count,
      (SELECT m.content FROM messages m
        WHERE m.channel_id = c.id AND m.is_deleted = 0
        ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT m.created_at FROM messages m
        WHERE m.channel_id = c.id AND m.is_deleted = 0
        ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
    FROM channels c
    JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
    WHERE c.hospital_id = ?
    ORDER BY
      c.is_default DESC,
      COALESCE(last_message_at, c.created_at) DESC,
      c.name ASC
  `).bind(userId, userId, hospitalId).all()

  // presence 갱신 (fire-and-forget)
  touchUserPresence(c.env.DB, userId, 'online')

  return c.json({ channels: results || [] })
})

/* ═══ POST /messenger/channels ═══
 *  채널 생성. body: { name, description?, type?, category?, view_mode?, memberIds? }
 *
 *  권한: messengerRole 이 'channel.create' 권한 보유 (owner/admin/manager/team_lead)
 */
channels.post('/', async (c) => {
  const user = c.get('user')!
  const userId = user.id
  const hospitalId = user.hospitalId
  // PFM 의 role → messenger role 매핑 (마이그레이션 0036 과 일치)
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  if (!hasMessengerPermission(messengerRole, 'channel.create')) {
    return c.json({ error: '채널 생성 권한이 없습니다' }, 403)
  }

  let body: any
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON 본문이 필요합니다' }, 400)
  }

  const name = String(body.name || '').trim()
  if (!name) return c.json({ error: '채널 이름이 필요합니다' }, 400)
  if (name.length > 80) return c.json({ error: '채널 이름은 80자 이내' }, 400)

  const type = ['public', 'private', 'dm'].includes(body.type) ? body.type : 'public'
  const category = String(body.category || '경영').slice(0, 40)
  const viewMode = body.view_mode === 'board' ? 'board' : 'chat'
  const description = String(body.description || '').slice(0, 500)

  const id = generateMessengerId('ch')
  await c.env.DB.prepare(`
    INSERT INTO channels
      (id, hospital_id, name, description, type, category, view_mode, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, hospitalId, name, description, type, category, viewMode, userId).run()

  // 생성자는 admin 으로 자동 가입
  await c.env.DB.prepare(`
    INSERT INTO channel_members (channel_id, user_id, role, category_label)
    VALUES (?, ?, 'admin', ?)
  `).bind(id, userId, category).run()

  // 추가 멤버 일괄 가입
  if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
    const ids = [...new Set(body.memberIds as string[])]
      .filter(mid => typeof mid === 'string' && mid !== userId)
      .slice(0, 200)
    if (ids.length > 0) {
      // 같은 병원인지만 한꺼번에 검증
      const placeholders = ids.map(() => '?').join(',')
      const { results: valid } = await c.env.DB.prepare(
        `SELECT id FROM users WHERE hospital_id = ? AND id IN (${placeholders})`
      ).bind(hospitalId, ...ids).all<{ id: string }>()
      const validIds = (valid || []).map(r => r.id)
      if (validIds.length > 0) {
        const stmt = c.env.DB.prepare(`
          INSERT OR IGNORE INTO channel_members (channel_id, user_id, role, category_label)
          VALUES (?, ?, 'member', ?)
        `)
        await c.env.DB.batch(validIds.map(mid => stmt.bind(id, mid, category)))
      }
    }
  }

  const channel = await c.env.DB.prepare(
    'SELECT * FROM channels WHERE id = ?'
  ).bind(id).first()

  // 감사 로그 (fire-and-forget)
  writeMessengerAudit(c.env.DB, {
    hospitalId,
    actorId: userId,
    action: 'channel.create',
    targetType: 'channel',
    targetId: id,
    metadata: { name, type, category, view_mode: viewMode },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ id, channel, success: true })
})

/* ═══ GET /messenger/channels/:id ═══
 *  채널 상세 + 멤버 + 핀 메시지
 */
channels.get('/:id', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const channel = await c.env.DB.prepare(
    'SELECT * FROM channels WHERE id = ? AND hospital_id = ?'
  ).bind(channelId, user.hospitalId).first()

  const { results: members } = await c.env.DB.prepare(`
    SELECT
      u.id, u.name, u.email, u.role AS pfm_role,
      u.department, u.presence_status, u.presence_location, u.last_seen_at,
      u.messenger_role,
      cm.role AS channel_role, cm.category_label, cm.joined_at, cm.last_read_at
    FROM channel_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.channel_id = ?
    ORDER BY
      CASE cm.role WHEN 'admin' THEN 0 ELSE 1 END,
      u.name ASC
  `).bind(channelId).all()

  const { results: pinnedMessages } = await c.env.DB.prepare(`
    SELECT
      m.id, m.content, m.message_type, m.created_at, m.updated_at,
      m.confirm_required, m.is_urgent, m.mentions, m.reactions,
      m.user_id, u.name AS user_name, u.role AS user_role, u.department AS user_department
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ? AND m.is_pinned = 1 AND m.is_deleted = 0
    ORDER BY m.created_at DESC LIMIT 50
  `).bind(channelId).all()

  return c.json({
    channel,
    members: members || [],
    pinnedMessages: pinnedMessages || [],
    myRole: access.channelRole,
  })
})

/* ═══ PATCH /messenger/channels/:id ═══
 *  채널 정보 수정 (이름/설명/카테고리/view_mode/write_restricted)
 *  권한: channel.edit + 본인이 채널 admin 이거나 messenger admin/owner 이상
 */
channels.patch('/:id', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  // 권한: messenger-level edit 권한 OR 채널 내 admin
  if (!hasMessengerPermission(messengerRole, 'channel.edit') && access.channelRole !== 'admin') {
    return c.json({ error: '채널 수정 권한이 없습니다' }, 403)
  }

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const updates: string[] = []
  const params: any[] = []

  if (typeof body.name === 'string' && body.name.trim()) {
    updates.push('name = ?'); params.push(body.name.trim().slice(0, 80))
  }
  if (typeof body.description === 'string') {
    updates.push('description = ?'); params.push(body.description.slice(0, 500))
  }
  if (typeof body.category === 'string' && body.category.trim()) {
    updates.push('category = ?'); params.push(body.category.trim().slice(0, 40))
  }
  if (body.view_mode === 'chat' || body.view_mode === 'board') {
    updates.push('view_mode = ?'); params.push(body.view_mode)
  }
  if (typeof body.write_restricted === 'boolean' || body.write_restricted === 0 || body.write_restricted === 1) {
    updates.push('write_restricted = ?'); params.push(body.write_restricted ? 1 : 0)
  }

  if (updates.length === 0) return c.json({ error: '변경할 필드가 없습니다' }, 400)

  updates.push("updated_at = CURRENT_TIMESTAMP")
  params.push(channelId, user.hospitalId)

  await c.env.DB.prepare(
    `UPDATE channels SET ${updates.join(', ')} WHERE id = ? AND hospital_id = ?`
  ).bind(...params).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'channel.update',
    targetType: 'channel',
    targetId: channelId,
    metadata: { fields: updates.slice(0, -1) },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  const channel = await c.env.DB.prepare(
    'SELECT * FROM channels WHERE id = ?'
  ).bind(channelId).first()
  return c.json({ channel, success: true })
})

/* ═══ DELETE /messenger/channels/:id ═══
 *  채널 삭제 (실제 DELETE — CASCADE 로 멤버/메시지 정리).
 *  is_default 채널은 보호.
 *  권한: channel.delete (보통 owner/admin)
 */
channels.delete('/:id', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  if (!hasMessengerPermission(messengerRole, 'channel.delete')) {
    return c.json({ error: '채널 삭제 권한이 없습니다' }, 403)
  }

  const ch = await c.env.DB.prepare(
    'SELECT id, name, is_default FROM channels WHERE id = ? AND hospital_id = ?'
  ).bind(channelId, user.hospitalId).first<{ id: string; name: string; is_default: number }>()
  if (!ch) return c.json({ error: '채널을 찾을 수 없습니다' }, 404)
  if (ch.is_default) return c.json({ error: '기본 채널은 삭제할 수 없습니다' }, 400)

  await c.env.DB.prepare(
    'DELETE FROM channels WHERE id = ? AND hospital_id = ?'
  ).bind(channelId, user.hospitalId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'channel.delete',
    targetType: 'channel',
    targetId: channelId,
    metadata: { name: ch.name },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true })
})

/* ═══ POST /messenger/channels/:id/members ═══
 *  멤버 추가. body: { userId, role? } 또는 { userIds: [], role? }
 */
channels.post('/:id/members', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  // 권한: messenger-level member.add OR 채널 admin
  if (!hasMessengerPermission(messengerRole, 'member.add') && access.channelRole !== 'admin') {
    return c.json({ error: '멤버 추가 권한이 없습니다' }, 403)
  }

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const role = body.role === 'admin' ? 'admin' : 'member'
  const ids: string[] = Array.isArray(body.userIds)
    ? body.userIds
    : (body.userId ? [body.userId] : [])
  const validInputIds = [...new Set(ids)].filter(id => typeof id === 'string').slice(0, 200)
  if (validInputIds.length === 0) return c.json({ error: 'userId/userIds 가 필요합니다' }, 400)

  // 같은 병원 사용자만 통과
  const placeholders = validInputIds.map(() => '?').join(',')
  const { results: valid } = await c.env.DB.prepare(
    `SELECT id FROM users WHERE hospital_id = ? AND id IN (${placeholders})`
  ).bind(user.hospitalId, ...validInputIds).all<{ id: string }>()
  const validIds = (valid || []).map(r => r.id)
  if (validIds.length === 0) return c.json({ error: '같은 병원의 사용자가 아닙니다' }, 400)

  // 카테고리 라벨은 채널의 category 기본값으로
  const ch = await c.env.DB.prepare(
    'SELECT category FROM channels WHERE id = ?'
  ).bind(channelId).first<{ category: string }>()
  const categoryLabel = ch?.category || ''

  const stmt = c.env.DB.prepare(`
    INSERT OR IGNORE INTO channel_members (channel_id, user_id, role, category_label)
    VALUES (?, ?, ?, ?)
  `)
  await c.env.DB.batch(validIds.map(uid => stmt.bind(channelId, uid, role, categoryLabel)))

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'channel.member_add',
    targetType: 'channel',
    targetId: channelId,
    metadata: { addedUserIds: validIds, role },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true, added: validIds.length, userIds: validIds })
})

/* ═══ DELETE /messenger/channels/:id/members/:userId ═══
 *  멤버 제거 (본인이면 채널 나가기 = leave).
 */
channels.delete('/:id/members/:userId', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const isLeaveSelf = targetUserId === user.id
  if (!isLeaveSelf) {
    // 타인 제거: messenger 권한 OR 채널 admin 필요
    if (!hasMessengerPermission(messengerRole, 'member.remove') && access.channelRole !== 'admin') {
      return c.json({ error: '멤버 제거 권한이 없습니다' }, 403)
    }
  }

  await c.env.DB.prepare(
    'DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?'
  ).bind(channelId, targetUserId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: isLeaveSelf ? 'channel.member_remove' : 'channel.member_remove',
    targetType: 'channel',
    targetId: channelId,
    metadata: { removedUserId: targetUserId, leave: isLeaveSelf },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true })
})

/* ═══ POST /messenger/channels/:id/read ═══
 *  채널의 last_read_at 을 현재 시각으로 갱신 (Slack 의 "모두 읽음" 효과).
 */
channels.post('/:id/read', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  await c.env.DB.prepare(`
    UPDATE channel_members
    SET last_read_at = CURRENT_TIMESTAMP
    WHERE channel_id = ? AND user_id = ?
  `).bind(channelId, user.id).run()

  return c.json({ success: true })
})

/* ═══ POST /messenger/channels/:id/typing ═══
 *  타이핑 표시 (in-memory, 4초 TTL). 발신 후 즉시 만료/갱신.
 */
channels.post('/:id/typing', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const now = Date.now()
  if (!typingState[channelId]) typingState[channelId] = []
  typingState[channelId] = typingState[channelId]
    .filter(t => t.expires > now && t.userId !== user.id)
  typingState[channelId].push({
    userId: user.id,
    userName: user.name || '?',
    expires: now + 4000,
  })

  // 메모리 폭주 방지 — 50개 채널 초과 시 만료된 항목 정리
  if (Object.keys(typingState).length > 50) {
    for (const k of Object.keys(typingState)) {
      typingState[k] = typingState[k].filter(t => t.expires > now)
      if (typingState[k].length === 0) delete typingState[k]
    }
  }

  return c.json({ success: true })
})

/* ═══ GET /messenger/channels/:id/typing ═══ */
channels.get('/:id/typing', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const now = Date.now()
  const typing = (typingState[channelId] || [])
    .filter(t => t.expires > now && t.userId !== user.id)
  return c.json({ typing })
})

/* ═══ POST /messenger/channels/dm ═══
 *  DM 채널 시작 (기존 DM 있으면 재사용).
 *  body: { targetUserId }
 */
channels.post('/dm', async (c) => {
  const user = c.get('user')!
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const targetUserId = String(body.targetUserId || '').trim()
  if (!targetUserId) return c.json({ error: 'targetUserId 가 필요합니다' }, 400)
  if (targetUserId === user.id) return c.json({ error: '자기 자신과는 DM 할 수 없습니다' }, 400)

  // 같은 병원 사용자인지
  const targetOk = await assertSameHospitalUser(c.env.DB, targetUserId, user.hospitalId)
  if (!targetOk) return c.json({ error: '같은 병원의 사용자가 아닙니다' }, 404)

  // 이미 존재하는 DM 채널 찾기
  const existing = await c.env.DB.prepare(`
    SELECT c.* FROM channels c
    WHERE c.type = 'dm' AND c.hospital_id = ?
      AND EXISTS (SELECT 1 FROM channel_members WHERE channel_id = c.id AND user_id = ?)
      AND EXISTS (SELECT 1 FROM channel_members WHERE channel_id = c.id AND user_id = ?)
      AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
    LIMIT 1
  `).bind(user.hospitalId, user.id, targetUserId).first()

  if (existing) {
    return c.json({ channel: existing, existing: true })
  }

  const target = await c.env.DB.prepare(
    'SELECT name FROM users WHERE id = ?'
  ).bind(targetUserId).first<{ name: string }>()
  const dmName = `${user.name || '?'} ↔ ${target?.name || '?'}`

  const id = generateMessengerId('ch')
  await c.env.DB.prepare(`
    INSERT INTO channels (id, hospital_id, name, type, category, view_mode)
    VALUES (?, ?, ?, 'dm', 'DM', 'chat')
  `).bind(id, user.hospitalId, dmName).run()

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO channel_members (channel_id, user_id, role, category_label)
       VALUES (?, ?, 'admin', 'DM')`
    ).bind(id, user.id),
    c.env.DB.prepare(
      `INSERT INTO channel_members (channel_id, user_id, role, category_label)
       VALUES (?, ?, 'admin', 'DM')`
    ).bind(id, targetUserId),
  ])

  const channel = await c.env.DB.prepare(
    'SELECT * FROM channels WHERE id = ?'
  ).bind(id).first()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'channel.create',
    targetType: 'channel',
    targetId: id,
    metadata: { type: 'dm', targetUserId },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ channel, existing: false })
})

/* ═══ GET /messenger/channels/users/directory ═══
 *  DM 대상 검색용 — 같은 병원 사용자 목록 (간단 디렉토리)
 *  쿼리: ?q=검색어 (이름/이메일/부서)
 */
channels.get('/users/directory', async (c) => {
  const user = c.get('user')!
  const q = String(c.req.query('q') || '').trim().slice(0, 50)
  const like = `%${q}%`

  let sql = `
    SELECT id, name, email, role AS pfm_role, department,
           presence_status, presence_location, last_seen_at, messenger_role
    FROM users
    WHERE hospital_id = ? AND id != ?
  `
  const params: any[] = [user.hospitalId, user.id]

  if (q) {
    sql += ` AND (name LIKE ? OR email LIKE ? OR department LIKE ?)`
    params.push(like, like, like)
  }
  sql += ` ORDER BY name ASC LIMIT 100`

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ users: results || [] })
})

// 폴링 라우트에서 typingState 참조용으로 export (선택)
export { typingState }
export default channels
