// ============================================================
// Patient Thread AI Routes — Phase E.5
// ─────────────────────────────────────────────────────────────
// 환자 스레드 한 줄 요약, 다음 액션 제안, 위험 평가.
//   - POST /patient-threads/:id/ai/:type  (생성/갱신)
//   - GET  /patient-threads/:id/ai/:type  (최신 캐시 조회)
//   - GET  /patient-threads/:id/ai         (3종 한꺼번에)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import {
  generateThreadInsight,
  getLatestInsight,
  type ThreadInsightType,
} from '../../lib/thread-ai'

const threadAI = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const VALID_TYPES: ThreadInsightType[] = ['summary', 'next_actions', 'risk_assessment']

async function assertThread(db: D1Database, threadId: string, hospitalId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT 1 FROM patient_threads WHERE id=? AND hospital_id=? LIMIT 1`
  ).bind(threadId, hospitalId).first()
  return !!row
}

/* ═══ POST /patient-threads/:id/ai/:type ═══
 *  AI 인사이트 생성 (캐시 무효화 시 새로 호출)
 *  body: { force_refresh?: boolean }
 */
threadAI.post('/patient-threads/:id/ai/:type', async (c) => {
  const user = c.get('user')!
  const threadId = c.req.param('id')
  const type = c.req.param('type') as ThreadInsightType

  if (!VALID_TYPES.includes(type)) {
    return c.json({ error: `type은 ${VALID_TYPES.join(', ')} 중 하나여야 합니다` }, 400)
  }

  const ok = await assertThread(c.env.DB, threadId, user.hospitalId)
  if (!ok) return c.json({ error: '스레드를 찾을 수 없습니다' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const forceRefresh = !!body.force_refresh

  try {
    const result = await generateThreadInsight(c.env.DB, {
      hospitalId: user.hospitalId,
      threadId,
      userId: user.id,
      insightType: type,
      forceRefresh,
    })
    return c.json({ insight: result })
  } catch (e: any) {
    return c.json({ error: e.message || 'AI 인사이트 생성 실패' }, 500)
  }
})


/* ═══ GET /patient-threads/:id/ai/:type ═══
 *  최신 캐시 조회 (없으면 null) — 새로 호출 안 함
 */
threadAI.get('/patient-threads/:id/ai/:type', async (c) => {
  const user = c.get('user')!
  const threadId = c.req.param('id')
  const type = c.req.param('type') as ThreadInsightType

  if (!VALID_TYPES.includes(type)) {
    return c.json({ error: `type은 ${VALID_TYPES.join(', ')} 중 하나여야 합니다` }, 400)
  }

  const ok = await assertThread(c.env.DB, threadId, user.hospitalId)
  if (!ok) return c.json({ error: '스레드를 찾을 수 없습니다' }, 404)

  const insight = await getLatestInsight(c.env.DB, user.hospitalId, threadId, type)
  return c.json({ insight })
})


/* ═══ GET /patient-threads/:id/ai ═══
 *  3종 최신 캐시 한 번에
 */
threadAI.get('/patient-threads/:id/ai', async (c) => {
  const user = c.get('user')!
  const threadId = c.req.param('id')

  const ok = await assertThread(c.env.DB, threadId, user.hospitalId)
  if (!ok) return c.json({ error: '스레드를 찾을 수 없습니다' }, 404)

  const [summary, nextActions, risk] = await Promise.all([
    getLatestInsight(c.env.DB, user.hospitalId, threadId, 'summary'),
    getLatestInsight(c.env.DB, user.hospitalId, threadId, 'next_actions'),
    getLatestInsight(c.env.DB, user.hospitalId, threadId, 'risk_assessment'),
  ])

  return c.json({
    summary,
    next_actions: nextActions,
    risk_assessment: risk,
  })
})


/* ═══ GET /patient-threads/:id/ai/history ═══
 *  생성 이력 (디버깅/감사용, 최근 20개)
 */
threadAI.get('/patient-threads/:id/ai/history/list', async (c) => {
  const user = c.get('user')!
  const threadId = c.req.param('id')

  const ok = await assertThread(c.env.DB, threadId, user.hospitalId)
  if (!ok) return c.json({ error: '스레드를 찾을 수 없습니다' }, 404)

  const rows = await c.env.DB.prepare(`
    SELECT id, insight_type, model, token_count, created_by, created_at,
           message_count_at_gen, event_count_at_gen
    FROM patient_thread_ai_insights
    WHERE hospital_id = ? AND thread_id = ?
    ORDER BY created_at DESC LIMIT 20
  `).bind(user.hospitalId, threadId).all<any>()

  return c.json({ history: rows.results || [] })
})

export default threadAI
