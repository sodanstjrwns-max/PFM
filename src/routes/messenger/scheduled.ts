// ============================================================
// Scheduled Messages — Phase F.3
// ─────────────────────────────────────────────────────────────
// 메시지를 미래 시각에 발송 예약.
//   "내일 09:00에 '오전 미팅 시작합니다' 보내기" 같은 시나리오.
//
// 발송 트리거:
//   - POST /scheduled/send-due  → status='pending' && scheduled_at <= now() 인 것 일괄 발송
//     (Cron Trigger 가 1분마다 호출하는 endpoint — 지금은 수동/관리자 호출용으로 동작)
//   - 일반 GET /scheduled 호출 시에도 due 검사 1회 inline 실행 (best-effort)
//
// Routes:
//   GET    /scheduled                 내 예약 목록 (status 필터 가능)
//   GET    /scheduled/:id             단건 조회
//   POST   /scheduled                 예약 생성
//   PUT    /scheduled/:id             예약 수정 (pending 만)
//   DELETE /scheduled/:id             예약 취소 (pending 만 → status='cancelled')
//   POST   /scheduled/send-due        due 메시지 일괄 발송 (idempotent)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import { generateMessengerId, hasMessengerPermission } from '../../lib/messenger-helpers'
import { writeMessengerAudit } from '../../lib/messenger-audit'

const sched = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const MAX_SCHEDULED_PER_USER = 100
const MAX_FUTURE_DAYS = 90

/**
 * scheduled_at 을 ISO string 또는 'YYYY-MM-DD HH:MM' 형식으로 받아 D1 호환 문자열로 정규화.
 * 과거/너무 먼 미래는 거부.
 */
function normalizeScheduledAt(raw: any): { ok: true, value: string, dateMs: number } | { ok: false, error: string } {
  if (!raw) return { ok: false, error: 'scheduled_at 필수' }
  const s = String(raw).trim()
  // 'YYYY-MM-DD HH:MM' → 'YYYY-MM-DDTHH:MM:00' 로 변환 (로컬 타임)
  const localFormatted = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s)
    ? s.replace(' ', 'T') + (s.length === 16 ? ':00' : '')
    : s
  const ms = Date.parse(localFormatted)
  if (isNaN(ms)) return { ok: false, error: 'scheduled_at 형식 오류 (ISO 8601 또는 YYYY-MM-DD HH:MM)' }
  const now = Date.now()
  if (ms < now - 60_000) return { ok: false, error: '과거 시각은 예약할 수 없습니다' }
  if (ms > now + MAX_FUTURE_DAYS * 86400_000) return { ok: false, error: `${MAX_FUTURE_DAYS}일 이내만 예약 가능` }
  // D1 (SQLite) 호환 포맷: 'YYYY-MM-DD HH:MM:SS'
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  const value = `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  return { ok: true, value, dateMs: ms }
}

async function assertChannelMember(db: D1Database, channelId: string, userId: string, hospitalId: string) {
  const row = await db.prepare(`
    SELECT cm.role
    FROM channel_members cm
    JOIN channels c ON c.id = cm.channel_id
    WHERE cm.channel_id = ? AND cm.user_id = ? AND c.hospital_id = ?
  `).bind(channelId, userId, hospitalId).first<{ role: string }>()
  return row?.role || null
}

/* ─── 인라인 due-dispatch: 비싸지 않게, 호출당 최대 20건만 ───
 * 호출자 컨텍스트로 발송 (현재 user 가 보낸 것처럼) — 본인 예약만 처리하니까 자연스러움.
 */
async function dispatchMyDue(db: D1Database, hospitalId: string, userId: string): Promise<number> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const due = await db.prepare(`
    SELECT * FROM scheduled_messages
    WHERE user_id = ? AND hospital_id = ?
      AND status = 'pending' AND scheduled_at <= ?
    ORDER BY scheduled_at ASC LIMIT 20
  `).bind(userId, hospitalId, now).all<any>()

  let sent = 0
  for (const s of due.results || []) {
    try {
      const msgId = generateMessengerId('msg')
      await db.prepare(`
        INSERT INTO messages
          (id, channel_id, thread_id, patient_thread_id, user_id, content, message_type,
           confirm_required, is_urgent, mentions, reactions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
      `).bind(
        msgId, s.channel_id, s.thread_id, s.patient_thread_id,
        s.user_id, s.content, s.message_type || 'text',
        s.confirm_required ? 1 : 0, s.is_urgent ? 1 : 0,
        s.mentions || '[]'
      ).run()

      // 발신자 자기 메시지 읽음 처리
      await db.prepare(
        'INSERT OR IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
      ).bind(msgId, s.user_id).run()

      await db.prepare(`
        UPDATE scheduled_messages
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(s.id).run()

      await writeMessengerAudit(db, {
        hospitalId,
        actorId: s.user_id,
        action: 'scheduled.send',
        targetType: 'scheduled_message',
        targetId: s.id,
        metadata: { message_id: msgId, channel_id: s.channel_id }
      })
      sent++
    } catch (e: any) {
      await db.prepare(`
        UPDATE scheduled_messages
        SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind((e?.message || 'unknown').slice(0, 500), s.id).run()
    }
  }
  return sent
}

/* ─── GET /scheduled ─────────────────────────────────────────
 *   ?status=pending|sent|cancelled|failed|all (default: pending)
 * ────────────────────────────────────────────────────────────*/
sched.get('/scheduled', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)

  // 호출 김에 due 일괄 발송 (best-effort)
  let dispatched = 0
  try { dispatched = await dispatchMyDue(c.env.DB, user.hospitalId, user.id) } catch {}

  const status = (c.req.query('status') || 'pending').trim()
  let sql = `
    SELECT s.*, c.name AS channel_name, c.category AS channel_category
    FROM scheduled_messages s
    LEFT JOIN channels c ON c.id = s.channel_id
    WHERE s.user_id = ? AND s.hospital_id = ?
  `
  const params: any[] = [user.id, user.hospitalId]
  if (status !== 'all') {
    sql += ' AND s.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY s.scheduled_at ASC LIMIT 100'

  const rows = await c.env.DB.prepare(sql).bind(...params).all<any>()
  return c.json({
    scheduled: rows.results || [],
    total: (rows.results || []).length,
    dispatched_now: dispatched
  })
})

/* ─── GET /scheduled/:id ─────────────────────────────────────*/
sched.get('/scheduled/:id', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(`
    SELECT s.*, c.name AS channel_name FROM scheduled_messages s
    LEFT JOIN channels c ON c.id = s.channel_id
    WHERE s.id = ? AND s.hospital_id = ? AND s.user_id = ?
  `).bind(id, user.hospitalId, user.id).first<any>()

  if (!row) return c.json({ error: '예약 메시지를 찾을 수 없습니다' }, 404)
  return c.json({ scheduled: row })
})

/* ─── POST /scheduled ────────────────────────────────────────
 *   body: { channel_id, content, scheduled_at, message_type?, thread_id?,
 *           patient_thread_id?, mentions?, confirm_required?, is_urgent? }
 * ────────────────────────────────────────────────────────────*/
sched.post('/scheduled', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const channelId = String(body.channel_id || body.channelId || '').trim()
  const content = String(body.content || '').trim()
  const messageType = ['text', 'system'].includes(body.message_type) ? body.message_type : 'text'

  if (!channelId) return c.json({ error: 'channel_id 필수' }, 400)
  if (!content)   return c.json({ error: 'content 필수' }, 400)
  if (content.length > 4000) return c.json({ error: 'content 4000자 초과' }, 400)

  // 시간 검증
  const ts = normalizeScheduledAt(body.scheduled_at || body.scheduledAt)
  if (!ts.ok) return c.json({ error: ts.error }, 400)

  // 채널 멤버 확인 (보낼 권한)
  const memberRole = await assertChannelMember(c.env.DB, channelId, user.id, user.hospitalId)
  if (!memberRole) return c.json({ error: '채널 멤버가 아닙니다' }, 403)

  // confirm_required / is_urgent 권한 체크
  const confirmRequired = !!(body.confirm_required ?? body.confirmRequired)
  const isUrgent = !!(body.is_urgent ?? body.isUrgent)
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)
  if (confirmRequired && !hasMessengerPermission(messengerRole, 'message.confirm_required')) {
    return c.json({ error: '확인 필수 메시지 발송 권한이 없습니다' }, 403)
  }

  // 사용자별 한도 (pending 만 카운트)
  const pendingCount = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scheduled_messages
     WHERE user_id = ? AND hospital_id = ? AND status = 'pending'`
  ).bind(user.id, user.hospitalId).first<{ n: number }>()
  if ((pendingCount?.n || 0) >= MAX_SCHEDULED_PER_USER) {
    return c.json({ error: `예약 메시지는 동시 ${MAX_SCHEDULED_PER_USER}개까지` }, 400)
  }

  const mentions: string[] = Array.isArray(body.mentions)
    ? body.mentions.filter((m: any) => typeof m === 'string').slice(0, 20)
    : []

  const id = generateMessengerId('sm')
  await c.env.DB.prepare(`
    INSERT INTO scheduled_messages
      (id, hospital_id, channel_id, user_id, content, message_type,
       thread_id, patient_thread_id, mentions, confirm_required, is_urgent,
       scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(
    id, user.hospitalId, channelId, user.id, content, messageType,
    body.thread_id || null, body.patient_thread_id || null,
    JSON.stringify(mentions), confirmRequired ? 1 : 0, isUrgent ? 1 : 0,
    ts.value
  ).run()

  await writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'scheduled.create',
    targetType: 'scheduled_message',
    targetId: id,
    metadata: { channel_id: channelId, scheduled_at: ts.value, length: content.length }
  })

  return c.json({
    success: true,
    id,
    scheduled_at: ts.value,
    seconds_until: Math.max(0, Math.floor((ts.dateMs - Date.now()) / 1000))
  })
})

/* ─── PUT /scheduled/:id ─────────────────────────────────────
 *   pending 만 수정 가능. content / scheduled_at / mentions 변경.
 * ────────────────────────────────────────────────────────────*/
sched.put('/scheduled/:id', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(
    'SELECT * FROM scheduled_messages WHERE id = ? AND hospital_id = ? AND user_id = ?'
  ).bind(id, user.hospitalId, user.id).first<any>()
  if (!row) return c.json({ error: '예약 메시지를 찾을 수 없습니다' }, 404)
  if (row.status !== 'pending') return c.json({ error: `${row.status} 상태는 수정 불가` }, 400)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const updates: string[] = []
  const params: any[] = []

  if (typeof body.content === 'string') {
    const t = body.content.trim()
    if (!t || t.length > 4000) return c.json({ error: 'content 0~4000자' }, 400)
    updates.push('content = ?'); params.push(t)
  }
  if (body.scheduled_at) {
    const ts = normalizeScheduledAt(body.scheduled_at)
    if (!ts.ok) return c.json({ error: ts.error }, 400)
    updates.push('scheduled_at = ?'); params.push(ts.value)
  }
  if (Array.isArray(body.mentions)) {
    const m = body.mentions.filter((x: any) => typeof x === 'string').slice(0, 20)
    updates.push('mentions = ?'); params.push(JSON.stringify(m))
  }
  if (updates.length === 0) return c.json({ error: '변경할 항목 없음' }, 400)
  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  await c.env.DB.prepare(
    `UPDATE scheduled_messages SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run()

  return c.json({ success: true, id })
})

/* ─── DELETE /scheduled/:id ──────────────────────────────────
 *   취소: pending → cancelled. sent 는 못 취소.
 * ────────────────────────────────────────────────────────────*/
sched.delete('/scheduled/:id', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const id = c.req.param('id')

  const row = await c.env.DB.prepare(
    'SELECT status FROM scheduled_messages WHERE id = ? AND hospital_id = ? AND user_id = ?'
  ).bind(id, user.hospitalId, user.id).first<{ status: string }>()
  if (!row) return c.json({ error: '예약 메시지를 찾을 수 없습니다' }, 404)
  if (row.status !== 'pending') return c.json({ error: `${row.status} 상태는 취소 불가` }, 400)

  await c.env.DB.prepare(`
    UPDATE scheduled_messages
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(id).run()

  await writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'scheduled.cancel',
    targetType: 'scheduled_message',
    targetId: id
  })

  return c.json({ success: true })
})

/* ─── POST /scheduled/send-due ───────────────────────────────
 *   관리자 또는 본인 예약만 발송. Cron Trigger 가 호출하는 용도.
 *   응답: { dispatched: N }
 * ────────────────────────────────────────────────────────────*/
sched.post('/scheduled/send-due', async (c) => {
  const user = c.get('user') as any
  if (!user) return c.json({ error: '인증 필요' }, 401)
  const sent = await dispatchMyDue(c.env.DB, user.hospitalId, user.id)
  return c.json({ success: true, dispatched: sent })
})

/* ─── 전 병원 due 발송 (외부 크론 전용, v5.5.1) ───────────────
 * dispatchMyDue 는 "접속한 사용자 본인 것만" 처리 → 새벽/주말에
 * 아무도 접속 안 하면 예약이 안 나가는 구멍이 있었음.
 * 이 함수는 hospital/user 구분 없이 전체 due 를 처리 (호출당 최대 50건).
 */
export async function dispatchAllDue(db: D1Database): Promise<{ sent: number; failed: number }> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const due = await db.prepare(`
    SELECT * FROM scheduled_messages
    WHERE status = 'pending' AND scheduled_at <= ?
    ORDER BY scheduled_at ASC LIMIT 50
  `).bind(now).all<any>()

  let sent = 0, failed = 0
  for (const s of due.results || []) {
    try {
      const msgId = generateMessengerId('msg')
      await db.prepare(`
        INSERT INTO messages
          (id, channel_id, thread_id, patient_thread_id, user_id, content, message_type,
           confirm_required, is_urgent, mentions, reactions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
      `).bind(
        msgId, s.channel_id, s.thread_id, s.patient_thread_id,
        s.user_id, s.content, s.message_type || 'text',
        s.confirm_required ? 1 : 0, s.is_urgent ? 1 : 0,
        s.mentions || '[]'
      ).run()

      await db.prepare(
        'INSERT OR IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
      ).bind(msgId, s.user_id).run()

      await db.prepare(`
        UPDATE scheduled_messages
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(s.id).run()

      await writeMessengerAudit(db, {
        hospitalId: s.hospital_id,
        actorId: s.user_id,
        action: 'scheduled.send',
        targetType: 'scheduled_message',
        targetId: s.id,
        metadata: { message_id: msgId, channel_id: s.channel_id, via: 'cron' }
      })
      sent++
    } catch (e: any) {
      failed++
      await db.prepare(`
        UPDATE scheduled_messages
        SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind((e?.message || 'unknown').slice(0, 500), s.id).run()
    }
  }
  return { sent, failed }
}

export default sched
