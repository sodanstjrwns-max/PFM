// ============================================================
// Messenger Messages — Patient Chat 통합 Phase B
// ─────────────────────────────────────────────────────────────
// 메시지 CRUD + 핀 + 리액션 + 읽음/확인 + 스레드 + 전달 + 리마인더.
//
// PFM 패턴 적용:
//   - c.get('user') 에서 hospitalId/userId/role 추출
//   - hasMessengerPermission(messengerRole, ...) 로 권한 체크
//   - sanitizeString 으로 XSS 방어 (PFM 의 기본 유틸 재사용)
//   - 모든 :id 라우트에 cross-tenant 가드 (assertMessageAccess)
//
// 마운트 경로 (index.tsx 에서):
//   app.route('/api/protected/messenger', messages)
//   → /api/protected/messenger/channels/:id/messages
//   → /api/protected/messenger/messages/:id
//   → /api/protected/messenger/messages/:id/{pin,read,confirm,reaction,thread,forward,remind,reads}
//
// Phase B 에서 제외 (후속 단계):
//   - files (Phase E: R2 업로드)
//   - bookmarks (선택 — 일단 미포함)
//   - patient_threads 조인 (Phase C 환자 통합)
//   - Durable Object 실시간 브로드캐스트 (Phase D)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import { sanitizeString } from '../../lib/middleware'
import {
  generateMessengerId,
  assertChannelAccess,
  assertMessageAccess,
  hasMessengerPermission,
  parseReactions,
  parseMentionsField,
  touchUserPresence,
} from '../../lib/messenger-helpers'
import {
  writeMessengerAudit,
  getClientIP,
  getUserAgent,
} from '../../lib/messenger-audit'

const messages = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 메시지 내용 sanitize (XSS 방어) ═══
 * PFM 의 sanitizeString 은 모든 <,>,&,",' 를 HTML-escape 함.
 * 메신저 메시지에도 같은 정책 적용 (frontend 는 textContent 로 렌더).
 * 최대 4000 자.
 */
function sanitizeMessageContent(raw: string): string {
  return sanitizeString(String(raw || ''), 4000)
}

/* ═══ GET /messenger/channels/:id/messages ═══
 *  채널의 메시지 목록 조회 (페이지네이션 by before timestamp).
 *  - thread 댓글 제외 (thread_id IS NULL)
 *  - is_deleted = 0 만
 *  - 응답 시 mentions/reactions JSON 파싱
 *  - 호출과 동시에 last_read_at 갱신
 */
messages.get('/channels/:id/messages', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')
  const before = c.req.query('before')
  const limit = Math.min(parseInt(c.req.query('limit') || '50') || 50, 100)

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  let query = `
    SELECT
      m.id, m.channel_id, m.thread_id, m.patient_thread_id,
      m.user_id, m.content, m.message_type,
      m.is_pinned, m.is_deleted, m.confirm_required, m.is_urgent,
      m.mentions, m.reactions,
      m.created_at, m.updated_at,
      u.name AS user_name, u.role AS user_role, u.department AS user_department,
      u.messenger_role AS user_messenger_role,
      (SELECT COUNT(*) FROM message_reads WHERE message_id = m.id) AS read_count,
      (SELECT COUNT(*) FROM message_reads WHERE message_id = m.id AND confirmed_at IS NOT NULL) AS confirm_count,
      (SELECT COUNT(*) FROM channel_members WHERE channel_id = m.channel_id) AS total_members
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ? AND m.is_deleted = 0 AND m.thread_id IS NULL
  `
  const params: any[] = [channelId]
  if (before) {
    query += ' AND m.created_at < ?'
    params.push(before)
  }
  query += ' ORDER BY m.created_at DESC LIMIT ?'
  params.push(limit)

  const { results } = await c.env.DB.prepare(query).bind(...params).all<any>()

  // 스레드 댓글 수 배치 조회
  const ids = (results || []).map(m => m.id)
  const threadCounts: Record<string, number> = {}
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',')
    const { results: tcs } = await c.env.DB.prepare(
      `SELECT thread_id, COUNT(*) AS c
       FROM messages
       WHERE thread_id IN (${ph}) AND is_deleted = 0
       GROUP BY thread_id`
    ).bind(...ids).all<{ thread_id: string; c: number }>()
    for (const t of tcs || []) threadCounts[t.thread_id] = t.c
  }

  // 모두 읽음 표시
  await c.env.DB.prepare(
    'UPDATE channel_members SET last_read_at = CURRENT_TIMESTAMP WHERE channel_id = ? AND user_id = ?'
  ).bind(channelId, user.id).run()

  // 응답 가공 (오래된 → 최신 순)
  const messagesOut = (results || []).reverse().map(m => ({
    ...m,
    mentions: parseMentionsField(m.mentions),
    reactions: parseReactions(m.reactions),
    thread_count: threadCounts[m.id] || 0,
  }))

  return c.json({ messages: messagesOut, channelId, count: messagesOut.length })
})

/* ═══ POST /messenger/channels/:id/messages ═══
 *  메시지 발송. body:
 *    { content, message_type?, mentions?, confirm_required?, is_urgent?, thread_id?, patient_thread_id? }
 */
messages.post('/channels/:id/messages', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  const access = await assertChannelAccess(c.env.DB, channelId, user.id, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  // 채널 write_restricted 체크
  const ch = await c.env.DB.prepare(
    'SELECT write_restricted FROM channels WHERE id = ?'
  ).bind(channelId).first<{ write_restricted: number }>()
  if (ch?.write_restricted && access.channelRole !== 'admin' &&
      !hasMessengerPermission(messengerRole, 'channel.edit')) {
    return c.json({ error: '이 채널은 관리자만 작성할 수 있습니다' }, 403)
  }

  // 내용 sanitize
  const content = sanitizeMessageContent(body.content || '')
  // file 메시지는 빈 content 허용 (Phase E)
  const messageType = ['text', 'file', 'image', 'system'].includes(body.message_type || body.messageType)
    ? (body.message_type || body.messageType)
    : 'text'
  if (messageType === 'text' && !content.trim()) {
    return c.json({ error: '메시지 내용이 비어 있습니다' }, 400)
  }

  // camelCase / snake_case 둘 다 수용
  const confirmRequired = body.confirmRequired ?? body.confirm_required ?? false
  const isUrgent = body.isUrgent ?? body.is_urgent ?? false
  const threadIdField = body.threadId ?? body.thread_id ?? null
  const patientThreadIdField = body.patientThreadId ?? body.patient_thread_id ?? null

  // confirm_required 발송은 권한 체크
  if (confirmRequired && !hasMessengerPermission(messengerRole, 'message.confirm_required')) {
    return c.json({ error: '확인 필수 메시지 발송 권한이 없습니다' }, 403)
  }

  // mentions 검증 (배열 + 최대 20개)
  const mentions: string[] = Array.isArray(body.mentions)
    ? body.mentions.filter((m: any) => typeof m === 'string').slice(0, 20)
    : []

  // thread_id 가 있으면 같은 채널에 존재하는지 확인 (cross-channel 방어)
  if (threadIdField) {
    const parent = await c.env.DB.prepare(
      'SELECT id FROM messages WHERE id = ? AND channel_id = ? AND is_deleted = 0'
    ).bind(threadIdField, channelId).first()
    if (!parent) return c.json({ error: '부모 메시지를 찾을 수 없습니다' }, 404)
  }

  const id = generateMessengerId('msg')
  await c.env.DB.prepare(`
    INSERT INTO messages
      (id, channel_id, thread_id, patient_thread_id, user_id, content, message_type,
       confirm_required, is_urgent, mentions, reactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
  `).bind(
    id, channelId, threadIdField, patientThreadIdField,
    user.id, content, messageType,
    confirmRequired ? 1 : 0, isUrgent ? 1 : 0,
    JSON.stringify(mentions),
  ).run()

  // 발신자는 자동으로 읽음 처리
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).bind(id, user.id).run()

  // 발신자의 last_read_at 도 갱신 (자기 메시지는 안 읽음으로 잡히면 안 됨)
  await c.env.DB.prepare(
    'UPDATE channel_members SET last_read_at = CURRENT_TIMESTAMP WHERE channel_id = ? AND user_id = ?'
  ).bind(channelId, user.id).run()

  // 응답용 메시지 조회 (user_name 등 join)
  const row = await c.env.DB.prepare(`
    SELECT m.*, u.name AS user_name, u.role AS user_role, u.department AS user_department,
           u.messenger_role AS user_messenger_role
    FROM messages m JOIN users u ON m.user_id = u.id WHERE m.id = ?
  `).bind(id).first<any>()

  // 감사 로그
  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'message.create',
    targetType: 'message',
    targetId: id,
    metadata: {
      channelId,
      message_type: messageType,
      confirm_required: !!confirmRequired,
      is_urgent: !!isUrgent,
      mention_count: mentions.length,
      thread_id: threadIdField,
    },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  // presence (fire-and-forget)
  touchUserPresence(c.env.DB, user.id, 'online')

  return c.json({
    message: {
      ...row,
      mentions,
      reactions: {},
      read_count: 1,
      confirm_count: 0,
      total_members: 0,  // 클라이언트가 별도로 채워도 됨
      thread_count: 0,
    },
  })
})

/* ═══ PUT /messenger/messages/:id ═══
 *  메시지 수정 (작성자만). 24 시간 제한 권장이지만 우선 무제한.
 */
messages.put('/messages/:id', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)
  if (access.isDeleted) return c.json({ error: '삭제된 메시지입니다' }, 400)
  if (access.userId !== user.id) return c.json({ error: '본인 메시지만 수정할 수 있습니다' }, 403)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const content = sanitizeMessageContent(body.content || '')
  if (!content.trim()) return c.json({ error: '메시지 내용이 비어 있습니다' }, 400)

  await c.env.DB.prepare(
    'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  ).bind(content, msgId, user.id).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'message.edit',
    targetType: 'message',
    targetId: msgId,
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true })
})

/* ═══ DELETE /messenger/messages/:id ═══
 *  메시지 soft-delete. 본인 OR messenger.delete_any 권한.
 */
messages.delete('/messages/:id', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)
  if (access.isDeleted) return c.json({ error: '이미 삭제된 메시지입니다' }, 400)

  const isOwner = access.userId === user.id
  if (!isOwner && !hasMessengerPermission(messengerRole, 'message.delete_any')) {
    return c.json({ error: '삭제 권한이 없습니다' }, 403)
  }

  await c.env.DB.prepare(`
    UPDATE messages
    SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
    WHERE id = ?
  `).bind(user.id, msgId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'message.delete',
    targetType: 'message',
    targetId: msgId,
    metadata: { originalUserId: access.userId, deletedByAdmin: !isOwner },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true })
})

/* ═══ POST /messenger/messages/:id/pin ═══
 *  메시지 핀 토글. 권한: message.pin (manager 이상) OR 채널 admin.
 */
messages.post('/messages/:id/pin', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  // 채널 admin 여부 확인
  const cm = await c.env.DB.prepare(
    'SELECT role FROM channel_members WHERE channel_id = ? AND user_id = ?'
  ).bind(access.channelId, user.id).first<{ role: string }>()
  const isChannelAdmin = cm?.role === 'admin'

  if (!hasMessengerPermission(messengerRole, 'message.pin') && !isChannelAdmin) {
    return c.json({ error: '메시지 고정 권한이 없습니다' }, 403)
  }

  const cur = await c.env.DB.prepare(
    'SELECT is_pinned FROM messages WHERE id = ?'
  ).bind(msgId).first<{ is_pinned: number }>()
  const newPinned = cur?.is_pinned ? 0 : 1

  await c.env.DB.prepare(
    'UPDATE messages SET is_pinned = ? WHERE id = ?'
  ).bind(newPinned, msgId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: newPinned ? 'message.pin' : 'message.unpin',
    targetType: 'message',
    targetId: msgId,
    metadata: { pinned: !!newPinned },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ pinned: !!newPinned })
})

/* ═══ POST /messenger/messages/:id/read ═══ */
messages.post('/messages/:id/read', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)'
  ).bind(msgId, user.id).run()

  return c.json({ success: true })
})

/* ═══ POST /messenger/messages/:id/confirm ═══
 *  confirm_required 메시지에 명시적 "확인" 표시 (응급 ACK 와 유사).
 *  read 도 동시에 처리됨 (UPSERT).
 */
messages.post('/messages/:id/confirm', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  await c.env.DB.prepare(`
    INSERT INTO message_reads (message_id, user_id, read_at, confirmed_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(message_id, user_id)
    DO UPDATE SET confirmed_at = CURRENT_TIMESTAMP
  `).bind(msgId, user.id).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'message.confirm',
    targetType: 'message',
    targetId: msgId,
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ success: true })
})

/* ═══ GET /messenger/messages/:id/reads ═══
 *  Slack 식 read bar — 누가 언제 읽고 확인했는지.
 */
messages.get('/messages/:id/reads', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const { results } = await c.env.DB.prepare(`
    SELECT mr.user_id, mr.read_at, mr.confirmed_at,
           u.name, u.role AS pfm_role, u.department, u.messenger_role
    FROM message_reads mr
    JOIN users u ON mr.user_id = u.id
    WHERE mr.message_id = ?
    ORDER BY mr.read_at ASC
  `).bind(msgId).all()

  return c.json({ reads: results || [] })
})

/* ═══ POST /messenger/messages/:id/reaction ═══
 *  body: { emoji: '👍' }. 토글 방식.
 */
messages.post('/messages/:id/reaction', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }
  const emoji = String(body.emoji || '').trim().slice(0, 20)
  if (!emoji) return c.json({ error: 'emoji 가 필요합니다' }, 400)

  const row = await c.env.DB.prepare(
    'SELECT reactions FROM messages WHERE id = ?'
  ).bind(msgId).first<{ reactions: string }>()
  const reactions = parseReactions(row?.reactions)

  if (!reactions[emoji]) reactions[emoji] = []
  const idx = reactions[emoji].indexOf(user.id)
  let toggled: 'added' | 'removed'
  if (idx >= 0) {
    reactions[emoji].splice(idx, 1)
    if (reactions[emoji].length === 0) delete reactions[emoji]
    toggled = 'removed'
  } else {
    reactions[emoji].push(user.id)
    toggled = 'added'
  }

  await c.env.DB.prepare(
    'UPDATE messages SET reactions = ? WHERE id = ?'
  ).bind(JSON.stringify(reactions), msgId).run()

  // 감사 (반복 호출 가능성 있으니 verbose 안 함)
  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: toggled === 'added' ? 'message.react' : 'message.unreact',
    targetType: 'message',
    targetId: msgId,
    metadata: { emoji },
    ip: getClientIP(c),
  })

  return c.json({ reactions, toggled })
})

/* ═══ GET /messenger/messages/:id/thread ═══
 *  스레드 댓글 목록 + 부모 메시지.
 */
messages.get('/messages/:id/thread', async (c) => {
  const user = c.get('user')!
  const parentId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, parentId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const parent = await c.env.DB.prepare(`
    SELECT m.*, u.name AS user_name, u.role AS user_role, u.department AS user_department,
           u.messenger_role AS user_messenger_role
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).bind(parentId).first<any>()

  const { results } = await c.env.DB.prepare(`
    SELECT m.*, u.name AS user_name, u.role AS user_role, u.department AS user_department,
           u.messenger_role AS user_messenger_role
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.thread_id = ? AND m.is_deleted = 0
    ORDER BY m.created_at ASC
  `).bind(parentId).all<any>()

  return c.json({
    parent: parent ? {
      ...parent,
      mentions: parseMentionsField(parent.mentions),
      reactions: parseReactions(parent.reactions),
    } : null,
    replies: (results || []).map(r => ({
      ...r,
      mentions: parseMentionsField(r.mentions),
      reactions: parseReactions(r.reactions),
    })),
  })
})

/* ═══ POST /messenger/messages/:id/forward ═══
 *  메시지 전달.
 *  body: { targetChannelId }
 */
messages.post('/messages/:id/forward', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  if (!hasMessengerPermission(messengerRole, 'message.forward')) {
    return c.json({ error: '메시지 전달 권한이 없습니다' }, 403)
  }

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }
  const targetChannelId = String(body.targetChannelId || body.target_channel_id || '').trim()
  if (!targetChannelId) return c.json({ error: 'targetChannelId 가 필요합니다' }, 400)

  // 원본 메시지 검증
  const msgAccess = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!msgAccess.ok) return c.json({ error: msgAccess.error }, msgAccess.status)

  // 대상 채널 멤버십 검증
  const targetAccess = await assertChannelAccess(c.env.DB, targetChannelId, user.id, user.hospitalId)
  if (!targetAccess.ok) return c.json({ error: '대상 채널에 접근할 수 없습니다' }, targetAccess.status)

  const original = await c.env.DB.prepare(`
    SELECT m.user_id, m.content, m.message_type, u.name AS user_name
    FROM messages m JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).bind(msgId).first<{ user_id: string; content: string; message_type: string; user_name: string }>()

  if (!original) return c.json({ error: '원본 메시지를 찾을 수 없습니다' }, 404)

  const newId = generateMessengerId('msg')
  // sanitizeString 은 이미 적용된 content 를 다시 escape 하면 이중 인코딩되므로 raw 그대로 사용
  const forwardedContent = `[전달됨] ${original.user_name || '?'}님의 메시지:\n${original.content || ''}`

  await c.env.DB.prepare(`
    INSERT INTO messages
      (id, channel_id, user_id, content, message_type, mentions, reactions)
    VALUES (?, ?, ?, ?, 'text', '[]', '{}')
  `).bind(newId, targetChannelId, user.id, forwardedContent).run()

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)'
  ).bind(newId, user.id).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'message.forward',
    targetType: 'message',
    targetId: newId,
    metadata: { originalMessageId: msgId, targetChannelId },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ id: newId, success: true })
})

/* ═══ POST /messenger/messages/:id/remind ═══
 *  미읽음 멤버 ID 반환 (frontend 가 후속 알림 처리).
 *  실제 푸시 알림은 Phase D 의 에스컬레이션 엔진에서.
 */
messages.post('/messages/:id/remind', async (c) => {
  const user = c.get('user')!
  const msgId = c.req.param('id')

  const access = await assertMessageAccess(c.env.DB, msgId, user.hospitalId)
  if (!access.ok) return c.json({ error: access.error }, access.status)

  const { results: members } = await c.env.DB.prepare(
    'SELECT user_id FROM channel_members WHERE channel_id = ?'
  ).bind(access.channelId).all<{ user_id: string }>()

  const { results: readers } = await c.env.DB.prepare(
    'SELECT user_id FROM message_reads WHERE message_id = ?'
  ).bind(msgId).all<{ user_id: string }>()

  const readerSet = new Set((readers || []).map(r => r.user_id))
  const unread = (members || []).map(m => m.user_id).filter(u => !readerSet.has(u))

  return c.json({ success: true, reminded: unread.length, unreadUsers: unread })
})

/* ═══ GET /messenger/messages/search ═══
 *  본문 검색 (LIKE 기반, 멤버인 채널만). ?q=...&limit=...
 */
messages.get('/search', async (c) => {
  const user = c.get('user')!
  const q = String(c.req.query('q') || '').trim()
  const limit = Math.min(parseInt(c.req.query('limit') || '50') || 50, 100)

  if (!q || q.length < 2) return c.json({ messages: [], count: 0 })

  const like = `%${q}%`
  const { results } = await c.env.DB.prepare(`
    SELECT
      m.id, m.channel_id, m.content, m.created_at, m.user_id,
      u.name AS user_name, u.role AS user_role,
      c.name AS channel_name, c.type AS channel_type
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    JOIN users u ON u.id = m.user_id
    WHERE c.hospital_id = ?
      AND m.is_deleted = 0
      AND m.content LIKE ?
      AND EXISTS (
        SELECT 1 FROM channel_members
        WHERE channel_id = m.channel_id AND user_id = ?
      )
    ORDER BY m.created_at DESC
    LIMIT ?
  `).bind(user.hospitalId, like, user.id, limit).all()

  return c.json({ messages: results || [], count: (results || []).length, query: q })
})

export default messages
