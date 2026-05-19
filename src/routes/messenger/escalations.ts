// ============================================================
// Messenger Escalations — Phase D
// ─────────────────────────────────────────────────────────────
// 자동 트리거는 escalation-engine.scanAndEscalate() 가 poll 에서 호출.
// 이 라우트는 조회/통계/수동 트리거(테스트용) 만 제공.
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import {
  hasMessengerPermission,
  safeJsonParse,
} from '../../lib/messenger-helpers'
import { scanAndEscalate, getUserEscalations } from '../../lib/escalation-engine'

const escalations = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ GET /escalations ═══
 *  병원의 최근 에스컬레이션 목록 (audit.read 권한).
 *  쿼리: ?level=1&limit=
 */
escalations.get('/escalations', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'audit.read')) {
    return c.json({ error: '권한이 없습니다 (audit.read 필요)' }, 403)
  }

  const level = c.req.query('level')
  const limit = Math.min(parseInt(c.req.query('limit') || '50') || 50, 200)
  const where: string[] = ['e.hospital_id = ?']
  const params: any[] = [hospitalId]
  if (level && ['1','2','3'].includes(level)) {
    where.push('e.level = ?'); params.push(parseInt(level))
  }

  const { results } = await c.env.DB.prepare(`
    SELECT
      e.id, e.message_id, e.level, e.triggered_at, e.notified_user_ids,
      m.content, m.channel_id, m.user_id AS sender_id, m.created_at AS message_created_at,
      u.name AS sender_name,
      ch.name AS channel_name
    FROM message_escalations e
    JOIN messages m ON m.id = e.message_id
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN channels ch ON ch.id = m.channel_id
    WHERE ${where.join(' AND ')}
    ORDER BY e.triggered_at DESC
    LIMIT ?
  `).bind(...params, limit).all()

  const enriched = (results || []).map((r: any) => ({
    ...r,
    notified_user_ids: safeJsonParse<string[]>(r.notified_user_ids, []),
  }))

  return c.json({ escalations: enriched })
})

/* ═══ GET /escalations/me ═══
 *  내가 알림 대상인 에스컬레이션 (사이드바 배지에 사용).
 *  쿼리: ?since=ISO_DATETIME
 */
escalations.get('/escalations/me', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId
  const since = c.req.query('since') || undefined

  const items = await getUserEscalations(c.env.DB, hospitalId, user.id, since)
  return c.json({ escalations: items, count: items.length })
})

/* ═══ GET /escalations/stats/summary ═══
 *  L1/L2/L3 카운트 + 오늘 트리거 수 (대시보드용).
 */
escalations.get('/escalations/stats/summary', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId

  const stats: any = await c.env.DB.prepare(`
    SELECT
      SUM(CASE WHEN level = 1 THEN 1 ELSE 0 END) AS l1,
      SUM(CASE WHEN level = 2 THEN 1 ELSE 0 END) AS l2,
      SUM(CASE WHEN level = 3 THEN 1 ELSE 0 END) AS l3,
      SUM(CASE WHEN DATE(triggered_at) = DATE('now') THEN 1 ELSE 0 END) AS today,
      COUNT(*) AS total
    FROM message_escalations WHERE hospital_id = ?
  `).bind(hospitalId).first()

  return c.json({
    l1: stats?.l1 ?? 0,
    l2: stats?.l2 ?? 0,
    l3: stats?.l3 ?? 0,
    today: stats?.today ?? 0,
    total: stats?.total ?? 0,
  })
})

/* ═══ POST /escalations/scan ═══
 *  수동 스캔 트리거 (테스트/관리용). force=true 면 throttle 무시.
 *  권한: settings.update (manager+)
 */
escalations.post('/escalations/scan', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'settings.update')) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const force = body.force === true

  const triggered = await scanAndEscalate(c.env.DB, hospitalId, { force })
  return c.json({ scanned: true, triggered_count: triggered.length, triggered })
})

export default escalations
