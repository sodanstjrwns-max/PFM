// ============================================================
// Messenger Poll — Patient Chat 통합 Phase B
// ─────────────────────────────────────────────────────────────
// 1~2 초 간격 폴링 기반 실시간 업데이트.
// 한 번의 응답에 다음을 모두 담아 클라이언트가 차분(diff)을 받도록.
//   1. newMessages     — 현재 채널의 since 이후 새 메시지
//   2. unreadCounts    — 모든 가입 채널별 미읽음 수
//   3. urgentCalls     — 활성 긴급 호출 (active 상태, since 이후)
//   4. userStatuses    — 같은 병원 사용자의 presence (online/away/dnd/offline)
//   5. pendingConfirms — confirm_required 인데 본인이 아직 확인 안 한 메시지 (24h 윈도우)
//   6. typing          — 현재 채널 타이핑 인디케이터
//   7. serverTime      — 다음 poll 의 since 로 쓰일 서버 시각
//
// v5.5.3 의 Promise.all 병렬화 적용 — 4개의 독립 SELECT 를 동시 실행.
//
// 마운트 경로: /api/protected/messenger/poll
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { parseMentionsField, parseReactions, touchUserPresence } from '../../lib/messenger-helpers'
import { typingState } from './channels'
import { scanAndEscalate, getUserEscalations } from '../../lib/escalation-engine'

const poll = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/** "YYYY-MM-DD HH:MM:SS" SQLite 친화 포맷 */
function sqliteNow(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString().replace('T', ' ').substring(0, 19)
}

poll.get('/poll', async (c) => {
  const user = c.get('user')!
  const userId = user.id
  const hospitalId = user.hospitalId

  // since 기본값: 5초 전
  const since = c.req.query('since') || sqliteNow(-5000)
  const currentChannelId = c.req.query('channelId') || ''
  const forceFull = c.req.query('full') === '1'

  /* ─── Fast-path (v5.5.1) ───
   * 13개 쿼리 전에 "변화 있나?" 를 1개 쿼리로 먼저 확인.
   * 새 메시지/긴급콜/에스컬레이션이 없으면 경량 응답 즉시 반환.
   * 클라이언트는 ~10회마다 full=1 로 전체 상태를 재동기화 (읽음수/presence 드리프트 보정).
   * 유휴 상태의 D1 부하를 ~90% 절감.
   */
  if (!forceFull) {
    try {
      const chg = await c.env.DB.prepare(`
        SELECT
          EXISTS(
            SELECT 1 FROM messages m
            JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ?1
            JOIN channels ch ON ch.id = m.channel_id
            WHERE ch.hospital_id = ?2 AND m.created_at > ?3
              AND m.is_deleted = 0 AND m.user_id != ?1
          ) AS has_msg,
          EXISTS(
            SELECT 1 FROM urgent_calls
            WHERE hospital_id = ?2 AND status = 'active' AND created_at > ?3
          ) AS has_urgent,
          EXISTS(
            SELECT 1 FROM message_escalations
            WHERE hospital_id = ?2 AND triggered_at > ?3
          ) AS has_esc
      `).bind(userId, hospitalId, since).first<any>()

      if (chg && !chg.has_msg && !chg.has_urgent && !chg.has_esc) {
        // 변화 없음 — 에스컬레이션 스캔만 유지 (1분 throttle, 대부분 no-op)
        let fastNewEsc: any[] = []
        try { fastNewEsc = await scanAndEscalate(c.env.DB, hospitalId) } catch {}
        touchUserPresence(c.env.DB, userId, 'online') // 내부 30초 스로틀

        if (fastNewEsc.length === 0) {
          const now = Date.now()
          const typingNow = currentChannelId
            ? (typingState[currentChannelId] || []).filter(t => t.expires > now && t.userId !== userId)
            : []
          return c.json({
            unchanged: true,
            typing: typingNow,
            // 2초 lookback — 체크~응답 사이 레이스 보정 (클라이언트가 id 중복 제거)
            serverTime: sqliteNow(-2000),
          })
        }
        // 새 에스컬레이션이 방금 트리거됨 → full path 로 계속 진행
      }
    } catch { /* fast-path 실패 시 full path 폴백 */ }
  }

  // ─── 1) 현재 채널의 새 메시지 (since 이후, 본인 제외) ───
  let newMessages: any[] = []
  let typing: { userId: string; userName: string; expires: number }[] = []

  if (currentChannelId) {
    // 채널 멤버십 확인 (cross-tenant 가드)
    const cm = await c.env.DB.prepare(
      `SELECT 1 AS ok FROM channels c
       JOIN channel_members cm ON cm.channel_id = c.id
       WHERE c.id = ? AND c.hospital_id = ? AND cm.user_id = ?
       LIMIT 1`
    ).bind(currentChannelId, hospitalId, userId).first()

    if (cm) {
      const { results } = await c.env.DB.prepare(`
        SELECT
          m.id, m.channel_id, m.thread_id, m.patient_thread_id,
          m.user_id, m.content, m.message_type,
          m.is_pinned, m.is_deleted, m.confirm_required, m.is_urgent,
          m.mentions, m.reactions,
          m.created_at, m.updated_at,
          u.name AS user_name, u.role AS user_role, u.department AS user_department,
          u.messenger_role AS user_messenger_role,
          (SELECT COUNT(*) FROM message_reads WHERE message_id = m.id) AS read_count,
          (SELECT COUNT(*) FROM channel_members WHERE channel_id = m.channel_id) AS total_members
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ?
          AND m.created_at > ?
          AND m.is_deleted = 0
          AND m.user_id != ?
          AND m.thread_id IS NULL
        ORDER BY m.created_at ASC
        LIMIT 50
      `).bind(currentChannelId, since, userId).all<any>()

      newMessages = (results || []).map(m => ({
        ...m,
        mentions: parseMentionsField(m.mentions),
        reactions: parseReactions(m.reactions),
      }))

      // 자동 읽음 처리 (batch)
      if (newMessages.length > 0) {
        const readStmt = c.env.DB.prepare(
          'INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)'
        )
        const batchStmts = [
          c.env.DB.prepare(
            'UPDATE channel_members SET last_read_at = CURRENT_TIMESTAMP WHERE channel_id = ? AND user_id = ?'
          ).bind(currentChannelId, userId),
          ...newMessages.map((msg: any) => readStmt.bind(msg.id, userId)),
        ]
        // fire-and-forget — 폴링 응답 지연 방지
        const p = c.env.DB.batch(batchStmts).catch(() => {})
        try { c.executionCtx?.waitUntil?.(p) } catch { /* dev fallback */ }
      }

      // 타이핑 인디케이터 (in-memory, 4초 TTL)
      const now = Date.now()
      typing = (typingState[currentChannelId] || [])
        .filter(t => t.expires > now && t.userId !== userId)
    }
  }

  // ─── 2~5) 4개 SELECT 병렬 실행 ───
  const [unreadRes, urgentRes, statusRes, pendingRes] = await Promise.all([
    // 2) 채널별 unread_count
    //    v5.11: 카운트를 100에서 캅 — UI는 99+로 표시하므로 정확한 대수 불필요.
    //    오래 안 읽은 멤버가 채널당 수천 행을 매 폴링마다 스캔하던 것 방지 (D1 rows_read 과금 절감)
    c.env.DB.prepare(`
      SELECT
        c.id AS channel_id,
        c.name AS channel_name,
        c.type AS channel_type,
        (SELECT COUNT(*) FROM (
          SELECT 1 FROM messages m
          WHERE m.channel_id = c.id
            AND m.is_deleted = 0
            AND m.user_id != ?
            AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
          LIMIT 100
        )) AS unread_count,
        (SELECT MAX(m.created_at) FROM messages m
         WHERE m.channel_id = c.id AND m.is_deleted = 0
        ) AS last_message_at
      FROM channels c
      JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.hospital_id = ?
    `).bind(userId, userId, hospitalId).all(),

    // 3) 활성 긴급 호출 (since 이후)
    c.env.DB.prepare(`
      SELECT
        uc.id, uc.target_type, uc.target_id, uc.message, uc.call_type,
        uc.status, uc.created_at, uc.caller_id,
        u.name AS caller_name, u.role AS caller_role, u.department AS caller_department
      FROM urgent_calls uc
      JOIN users u ON uc.caller_id = u.id
      WHERE uc.hospital_id = ?
        AND uc.status = 'active'
        AND uc.created_at > ?
        AND (
          uc.target_type = 'all'
          OR (uc.target_type = 'user' AND uc.target_id = ?)
          OR (uc.target_type = 'channel' AND uc.target_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = ?
          ))
        )
      ORDER BY uc.created_at DESC
      LIMIT 20
    `).bind(hospitalId, since, userId, userId).all(),

    // 4) 같은 병원 사용자 presence (간단 필드만)
    c.env.DB.prepare(`
      SELECT
        id, name, role, department,
        presence_status, presence_location, last_seen_at
      FROM users
      WHERE hospital_id = ?
    `).bind(hospitalId).all(),

    // 5) 미확인 confirm_required 메시지 (24h 윈도우)
    c.env.DB.prepare(`
      SELECT
        m.id, m.content, m.created_at, m.channel_id,
        c.name AS channel_name,
        u.name AS sender_name, u.role AS sender_role,
        m.is_urgent,
        (SELECT MAX(level) FROM message_escalations WHERE message_id = m.id) AS escalation_level
      FROM messages m
      JOIN channels c ON m.channel_id = c.id
      JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
      JOIN users u ON m.user_id = u.id
      LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = ?
      WHERE c.hospital_id = ?
        AND m.confirm_required = 1
        AND m.is_deleted = 0
        AND m.user_id != ?
        AND mr.confirmed_at IS NULL
        AND m.created_at > datetime('now', '-24 hours')
      ORDER BY m.is_urgent DESC, m.created_at ASC
      LIMIT 20
    `).bind(userId, userId, hospitalId, userId).all(),
  ])

  // presence 갱신 (fire-and-forget) — 폴링 호출 자체가 "online" 신호
  touchUserPresence(c.env.DB, userId, 'online')

  // ─── 6) 에스컬레이션 엔진 (1분 throttle, 내부에서 알아서) ───
  // poll 호출 시마다 시도 → 1분 안에 재호출이면 즉시 no-op.
  // 워커가 idle 이라도 다음 poll 이 보장된 트리거.
  // 결과는 폴링 응답에 같이 실어 화면을 빨갛게.
  let escalations: any[] = []
  let newEscalations: any[] = []
  try {
    newEscalations = await scanAndEscalate(c.env.DB, hospitalId)
    escalations = await getUserEscalations(c.env.DB, hospitalId, userId, since)
  } catch (e) {
    console.error('[poll] escalation scan failed:', (e as Error).message)
  }

  return c.json({
    newMessages,
    unreadCounts: unreadRes.results || [],
    urgentCalls: urgentRes.results || [],
    userStatuses: statusRes.results || [],
    pendingConfirms: pendingRes.results || [],
    typing,
    escalations,                  // 본인이 알림 대상인 미해결 에스컬레이션
    newEscalations,               // 이번 스캔에서 새로 트리거된 것 (전체)
    serverTime: sqliteNow(),
  })
})

/* ═══ GET /messenger/poll/badge ═══
 *  사이드바 메뉴 옆 빨간 점 / 숫자 배지용 경량 응답.
 *  다른 페이지 (대시보드/환자/상담 등) 에서도 백그라운드로 호출 가능.
 */
poll.get('/poll/badge', async (c) => {
  const user = c.get('user')!
  const userId = user.id
  const hospitalId = user.hospitalId

  const [unreadRes, urgentRes, confirmRes] = await Promise.all([
    // v5.11: 채널당 100 캅 — 배지는 99+ 표시용이므로 정밀 카운트 불필요 (rows_read 절감)
    c.env.DB.prepare(`
      SELECT COALESCE(SUM(uc), 0) AS total_unread
      FROM (
        SELECT
          (SELECT COUNT(*) FROM (
            SELECT 1 FROM messages m
            WHERE m.channel_id = c.id
              AND m.is_deleted = 0
              AND m.user_id != ?
              AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
            LIMIT 100
          )) AS uc
        FROM channels c
        JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
        WHERE c.hospital_id = ?
      )
    `).bind(userId, userId, hospitalId).first<{ total_unread: number }>(),

    c.env.DB.prepare(`
      SELECT COUNT(*) AS cnt FROM urgent_calls
      WHERE hospital_id = ? AND status = 'active'
        AND (
          target_type = 'all'
          OR (target_type = 'user' AND target_id = ?)
          OR (target_type = 'channel' AND target_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = ?
          ))
        )
    `).bind(hospitalId, userId, userId).first<{ cnt: number }>(),

    c.env.DB.prepare(`
      SELECT COUNT(*) AS cnt
      FROM messages m
      JOIN channels c ON m.channel_id = c.id
      JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
      LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = ?
      WHERE c.hospital_id = ?
        AND m.confirm_required = 1
        AND m.is_deleted = 0
        AND m.user_id != ?
        AND mr.confirmed_at IS NULL
        AND m.created_at > datetime('now', '-24 hours')
    `).bind(userId, userId, hospitalId, userId).first<{ cnt: number }>(),
  ])

  return c.json({
    unread: unreadRes?.total_unread || 0,
    urgent: urgentRes?.cnt || 0,
    pendingConfirms: confirmRes?.cnt || 0,
  })
})

/* ═══ POST /messenger/presence ═══
 *  presence 수동 변경 (사용자가 메뉴에서 "자리 비움" / "방해금지" 선택 시).
 *  body: { status: 'online' | 'away' | 'dnd' | 'offline', location? }
 */
poll.post('/poll/presence', async (c) => {
  const user = c.get('user')!
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const status = ['online', 'away', 'dnd', 'offline'].includes(body.status) ? body.status : null
  if (!status) return c.json({ error: 'status 값이 유효하지 않습니다' }, 400)

  const location = typeof body.location === 'string' ? body.location.slice(0, 80) : null

  if (location !== null) {
    await c.env.DB.prepare(
      'UPDATE users SET presence_status = ?, presence_location = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, location, user.id).run()
  } else {
    await c.env.DB.prepare(
      'UPDATE users SET presence_status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, user.id).run()
  }

  return c.json({ success: true, status, location })
})

export default poll
