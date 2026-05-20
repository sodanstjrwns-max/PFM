// ============================================================
// Messenger Operations Dashboard — Phase F.4
// ─────────────────────────────────────────────────────────────
// 감사 로그 뷰어 + 운영 대시보드.
//
// 권한: 관리자 (admin/manager/owner) 만 접근.
//
// Routes:
//   GET /ops/audit            감사 로그 조회 (필터/페이지네이션)
//   GET /ops/audit/actions    사용된 액션 종류 (필터 옵션용)
//   GET /ops/dashboard        종합 대시보드 (활성도/Confirm 미확인 TOP/에스컬레이션/예약/AI 사용량)
//   GET /ops/activity         일자별 메시지/유저 활성도 (last 14d)
//   GET /ops/unconfirmed      현재 미확인 confirm_required 메시지 TOP
//   GET /ops/escalations      최근 에스컬레이션 발동 이력
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'

const ops = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function requireAdmin(c: any): { ok: true } | { ok: false, res: Response } {
  const user = c.get('user')
  if (!user) return { ok: false, res: c.json({ error: '인증 필요' }, 401) }
  const role = user.messengerRole || pfmRoleToMessengerRole(user.role)
  if (role !== 'owner' && role !== 'manager' && role !== 'admin') {
    return { ok: false, res: c.json({ error: '관리자 전용' }, 403) }
  }
  return { ok: true }
}

/* ─── GET /ops/audit ─────────────────────────────────────────
 *   ?action=  (특정 액션만, 예: message.delete)
 *   ?actor_id= (특정 사용자)
 *   ?target_type= (message|channel|patient_thread|escalation|file|...)
 *   ?since=YYYY-MM-DD
 *   ?limit=20  (max 100)
 *   ?cursor=YYYY-MM-DD HH:MM:SS  (시간 커서, created_at < cursor)
 * ────────────────────────────────────────────────────────────*/
ops.get('/ops/audit', async (c) => {
  const auth = requireAdmin(c)
  if (!auth.ok) return auth.res
  const user = c.get('user') as any

  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const action = (c.req.query('action') || '').trim()
  const actorId = (c.req.query('actor_id') || '').trim()
  const targetType = (c.req.query('target_type') || '').trim()
  const since = (c.req.query('since') || '').trim()
  const cursor = (c.req.query('cursor') || '').trim()

  let sql = `
    SELECT al.id, al.actor_id, al.action, al.target_type, al.target_id,
           al.metadata, al.ip_address, al.created_at,
           u.name AS actor_name, u.role AS actor_role
    FROM messenger_audit_logs al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.hospital_id = ?
  `
  const params: any[] = [user.hospitalId]

  if (action) { sql += ' AND al.action = ?'; params.push(action) }
  if (actorId) { sql += ' AND al.actor_id = ?'; params.push(actorId) }
  if (targetType) { sql += ' AND al.target_type = ?'; params.push(targetType) }
  if (since && /^\d{4}-\d{2}-\d{2}/.test(since)) {
    sql += ' AND al.created_at >= ?'; params.push(since)
  }
  if (cursor) { sql += ' AND al.created_at < ?'; params.push(cursor) }

  sql += ' ORDER BY al.created_at DESC LIMIT ?'
  params.push(limit + 1) // +1 to detect more

  const rows = await c.env.DB.prepare(sql).bind(...params).all<any>()
  const list = rows.results || []
  const hasMore = list.length > limit
  const items = hasMore ? list.slice(0, limit) : list
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null

  // metadata 는 JSON 파싱
  for (const item of items) {
    try { item.metadata = item.metadata ? JSON.parse(item.metadata) : {} } catch { item.metadata = {} }
  }

  return c.json({
    logs: items,
    has_more: hasMore,
    next_cursor: nextCursor,
    count: items.length
  })
})

/* ─── GET /ops/audit/actions ─────────────────────────────────
 *   필터 드롭다운용 — 실제로 기록된 action 종류 + 카운트
 * ────────────────────────────────────────────────────────────*/
ops.get('/ops/audit/actions', async (c) => {
  const auth = requireAdmin(c)
  if (!auth.ok) return auth.res
  const user = c.get('user') as any

  const rows = await c.env.DB.prepare(`
    SELECT action, COUNT(*) AS n
    FROM messenger_audit_logs
    WHERE hospital_id = ? AND created_at >= date('now', '-30 days')
    GROUP BY action
    ORDER BY n DESC
  `).bind(user.hospitalId).all<{ action: string, n: number }>()

  return c.json({ actions: rows.results || [] })
})

/* ─── GET /ops/dashboard ─────────────────────────────────────
 *   종합 카드 — 한 번에 다 가져옴 (대시보드 메인 화면용)
 * ────────────────────────────────────────────────────────────*/
ops.get('/ops/dashboard', async (c) => {
  const auth = requireAdmin(c)
  if (!auth.ok) return auth.res
  const user = c.get('user') as any
  const H = user.hospitalId

  // 1) 활성도 — 오늘/어제/지난 7일 메시지 수
  const activityRows = await c.env.DB.prepare(`
    SELECT
      SUM(CASE WHEN date(m.created_at) = date('now')      THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN date(m.created_at) = date('now','-1 day') THEN 1 ELSE 0 END) AS yesterday,
      SUM(CASE WHEN m.created_at >= date('now','-7 days') THEN 1 ELSE 0 END) AS last_7d,
      COUNT(DISTINCT m.user_id) AS active_users_7d
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    WHERE c.hospital_id = ? AND m.created_at >= date('now','-7 days')
      AND m.is_deleted = 0
  `).bind(H).first<any>()

  // 2) 채널 활성 TOP 5 (지난 7일)
  const topChannels = await c.env.DB.prepare(`
    SELECT c.id, c.name, c.category, COUNT(m.id) AS msg_count, COUNT(DISTINCT m.user_id) AS user_count
    FROM channels c
    LEFT JOIN messages m ON m.channel_id = c.id AND m.is_deleted = 0
      AND m.created_at >= date('now','-7 days')
    WHERE c.hospital_id = ?
    GROUP BY c.id
    ORDER BY msg_count DESC LIMIT 5
  `).bind(H).all<any>()

  // 3) Confirm 미확인 TOP — confirm_required 메시지 중 전원 확인 안 된 것
  //    confirm 추적은 message_reads.confirmed_at 컬럼 사용 (별도 테이블 없음)
  //    채널 멤버 총원 vs confirmed_at IS NOT NULL 인 read 수 비교
  const unconfirmed = await c.env.DB.prepare(`
    SELECT m.id AS message_id, m.channel_id, c.name AS channel_name,
           m.user_id AS sender_id, u.name AS sender_name,
           SUBSTR(m.content, 1, 80) AS content_preview,
           m.is_urgent, m.created_at,
           CAST((julianday('now') - julianday(m.created_at)) * 1440 AS INTEGER) AS minutes_ago,
           (SELECT COUNT(*) FROM channel_members cm WHERE cm.channel_id = m.channel_id) AS total_members,
           (SELECT COUNT(*) FROM message_reads mr WHERE mr.message_id = m.id AND mr.confirmed_at IS NOT NULL) AS confirmed_count
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    LEFT JOIN users u ON u.id = m.user_id
    WHERE c.hospital_id = ?
      AND m.confirm_required = 1
      AND m.is_deleted = 0
      AND m.created_at >= datetime('now', '-7 days')
    ORDER BY m.is_urgent DESC, m.created_at ASC LIMIT 10
  `).bind(H).all<any>()

  // pending confirm 만 추리기 (confirmed < total)
  const unconfirmedFiltered = (unconfirmed.results || []).filter((r: any) =>
    (r.confirmed_count || 0) < (r.total_members || 0)
  )

  // 4) 최근 에스컬레이션 (지난 7일) — message_escalations 사용
  const escalations = await c.env.DB.prepare(`
    SELECT e.id, e.level, e.message_id, e.triggered_at, e.notified_user_ids,
           SUBSTR(m.content, 1, 80) AS message_preview,
           u.name AS sender_name,
           c.name AS channel_name
    FROM message_escalations e
    LEFT JOIN messages m ON m.id = e.message_id
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN channels c ON c.id = m.channel_id
    WHERE e.hospital_id = ? AND e.triggered_at >= date('now','-7 days')
    ORDER BY e.triggered_at DESC LIMIT 10
  `).bind(H).all<any>()

  // 5) 예약 메시지 카운트
  const sched = await c.env.DB.prepare(`
    SELECT status, COUNT(*) AS n FROM scheduled_messages
    WHERE hospital_id = ? AND created_at >= date('now','-30 days')
    GROUP BY status
  `).bind(H).all<{ status: string, n: number }>()

  // 6) AI 사용 (지난 30일, 토큰 비용)
  let aiUsage: any = null
  try {
    aiUsage = await c.env.DB.prepare(`
      SELECT
        COUNT(*) AS calls,
        SUM(token_count) AS total_tokens,
        SUM(CASE WHEN feature LIKE 'thread_%' THEN token_count ELSE 0 END) AS thread_tokens
      FROM ai_usage_log
      WHERE hospital_id = ? AND created_at >= date('now','-30 days')
    `).bind(H).first<any>()
  } catch {} // ai_usage_log 없을 수도

  // 7) 직원 presence 분포
  const presence = await c.env.DB.prepare(`
    SELECT
      SUM(CASE WHEN presence_status = 'online' OR presence_status IS NULL THEN 1 ELSE 0 END) AS online_ish,
      SUM(CASE WHEN presence_status = 'away' THEN 1 ELSE 0 END) AS away,
      SUM(CASE WHEN presence_status = 'dnd' THEN 1 ELSE 0 END) AS dnd,
      SUM(CASE WHEN presence_status = 'offline' THEN 1 ELSE 0 END) AS offline,
      COUNT(*) AS total
    FROM users
    WHERE hospital_id = ? AND is_active = 1
  `).bind(H).first<any>()

  // 8) 환자 스레드 — open 카운트
  let patientThreads: any = null
  try {
    patientThreads = await c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_count,
        COUNT(*) AS total
      FROM patient_threads WHERE hospital_id = ?
    `).bind(H).first<any>()
  } catch {}

  return c.json({
    activity: activityRows || { today: 0, yesterday: 0, last_7d: 0, active_users_7d: 0 },
    top_channels: topChannels.results || [],
    unconfirmed_top: unconfirmedFiltered,
    recent_escalations: escalations.results || [],
    scheduled_breakdown: sched.results || [],
    ai_usage_30d: aiUsage || { calls: 0, total_tokens: 0, thread_tokens: 0 },
    presence_distribution: presence || { online_ish: 0, away: 0, dnd: 0, offline: 0, total: 0 },
    patient_threads: patientThreads || { open_count: 0, closed_count: 0, total: 0 },
    generated_at: new Date().toISOString()
  })
})

/* ─── GET /ops/activity ──────────────────────────────────────
 *   ?days=14  (1~30)
 *   일자별 메시지 수 + 활성 유저 수
 * ────────────────────────────────────────────────────────────*/
ops.get('/ops/activity', async (c) => {
  const auth = requireAdmin(c)
  if (!auth.ok) return auth.res
  const user = c.get('user') as any
  const days = Math.min(Math.max(parseInt(c.req.query('days') || '14'), 1), 30)

  const rows = await c.env.DB.prepare(`
    SELECT
      date(m.created_at) AS day,
      COUNT(*) AS messages,
      COUNT(DISTINCT m.user_id) AS active_users,
      SUM(CASE WHEN m.is_urgent = 1 THEN 1 ELSE 0 END) AS urgent_count,
      SUM(CASE WHEN m.confirm_required = 1 THEN 1 ELSE 0 END) AS confirm_count
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    WHERE c.hospital_id = ? AND m.is_deleted = 0
      AND m.created_at >= date('now', ?)
    GROUP BY day ORDER BY day ASC
  `).bind(user.hospitalId, `-${days} days`).all<any>()

  return c.json({ days, activity: rows.results || [] })
})

/* ─── GET /ops/unconfirmed ───────────────────────────────────
 *   현재 미확인 confirm_required 전체 + 누가 안 봤는지
 * ────────────────────────────────────────────────────────────*/
ops.get('/ops/unconfirmed', async (c) => {
  const auth = requireAdmin(c)
  if (!auth.ok) return auth.res
  const user = c.get('user') as any

  const rows = await c.env.DB.prepare(`
    SELECT m.id AS message_id, m.channel_id, c.name AS channel_name,
           m.user_id AS sender_id, u.name AS sender_name,
           m.content, m.is_urgent, m.created_at,
           CAST((julianday('now') - julianday(m.created_at)) * 1440 AS INTEGER) AS minutes_ago,
           (SELECT COUNT(*) FROM channel_members cm WHERE cm.channel_id = m.channel_id) AS total_members,
           (SELECT COUNT(*) FROM message_reads mr WHERE mr.message_id = m.id AND mr.confirmed_at IS NOT NULL) AS confirmed_count
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    LEFT JOIN users u ON u.id = m.user_id
    WHERE c.hospital_id = ?
      AND m.confirm_required = 1
      AND m.is_deleted = 0
      AND m.created_at >= datetime('now','-7 days')
    ORDER BY m.is_urgent DESC, m.created_at ASC LIMIT 50
  `).bind(user.hospitalId).all<any>()

  // confirmed_count < total_members 인 것만 (전원 확인 안 된 것)
  const unconfirmed = (rows.results || []).filter((r: any) =>
    (r.confirmed_count || 0) < (r.total_members || 0)
  )

  return c.json({ unconfirmed, total: unconfirmed.length })
})

/* ─── GET /ops/escalations ───────────────────────────────────*/
ops.get('/ops/escalations', async (c) => {
  const auth = requireAdmin(c)
  if (!auth.ok) return auth.res
  const user = c.get('user') as any
  const days = Math.min(parseInt(c.req.query('days') || '30'), 90)

  const rows = await c.env.DB.prepare(`
    SELECT e.id, e.message_id, e.level, e.triggered_at, e.notified_user_ids,
           m.content AS source_content, m.is_urgent,
           u.name AS source_sender_name,
           c.name AS channel_name
    FROM message_escalations e
    LEFT JOIN messages m ON m.id = e.message_id
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN channels c ON c.id = m.channel_id
    WHERE e.hospital_id = ? AND e.triggered_at >= date('now', ?)
    ORDER BY e.triggered_at DESC LIMIT 100
  `).bind(user.hospitalId, `-${days} days`).all<any>()

  // 통계 (status 컬럼 없음 — by_level + total 만)
  const stats = (rows.results || []).reduce((acc: any, r: any) => {
    acc.by_level[r.level] = (acc.by_level[r.level] || 0) + 1
    return acc
  }, { by_level: {}, total: (rows.results || []).length })

  return c.json({ escalations: rows.results || [], stats, days })
})

export default ops
