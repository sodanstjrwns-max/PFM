/**
 * Web Push Notification API
 * v3.2 Retention Edition
 * 
 * 브라우저 푸시 알림 구독 관리 + 개인 알림 설정
 */

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'

const push = new Hono<{ Bindings: Bindings; Variables: { user: any } }>()

function uuid() {
  return crypto.randomUUID()
}

/** GET /preferences - 개인 알림 설정 조회 */
push.get('/preferences', async (c) => {
  const user = c.get('user')
  let prefs = await c.env.DB
    .prepare('SELECT * FROM notification_preferences WHERE user_id = ?')
    .bind(user.id)
    .first<any>()
  if (!prefs) {
    // 디폴트 생성
    await c.env.DB
      .prepare(
        `INSERT INTO notification_preferences (user_id) VALUES (?)`
      )
      .bind(user.id)
      .run()
    prefs = {
      user_id: user.id,
      daily_briefing: 1,
      briefing_hour: 9,
      recall_alerts: 1,
      complaint_alerts: 1,
      chat_alerts: 1,
    }
  }
  return c.json({ preferences: prefs })
})

/** PATCH /preferences - 개인 알림 설정 변경 */
push.patch('/preferences', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const allowed = ['daily_briefing', 'briefing_hour', 'recall_alerts', 'complaint_alerts', 'chat_alerts']
  const sets: string[] = []
  const vals: any[] = []
  for (const k of allowed) {
    if (k in body) {
      sets.push(`${k} = ?`)
      let v = body[k]
      if (k === 'briefing_hour') v = Math.max(0, Math.min(23, parseInt(v) || 9))
      else v = v ? 1 : 0
      vals.push(v)
    }
  }
  if (!sets.length) return c.json({ error: '변경 사항이 없습니다' }, 400)

  // UPSERT 패턴
  const exists = await c.env.DB
    .prepare('SELECT user_id FROM notification_preferences WHERE user_id = ?')
    .bind(user.id)
    .first()
  if (!exists) {
    await c.env.DB
      .prepare('INSERT INTO notification_preferences (user_id) VALUES (?)')
      .bind(user.id)
      .run()
  }
  sets.push('updated_at = ?')
  vals.push(new Date().toISOString())
  vals.push(user.id)
  await c.env.DB
    .prepare(`UPDATE notification_preferences SET ${sets.join(', ')} WHERE user_id = ?`)
    .bind(...vals)
    .run()
  return c.json({ success: true })
})

/** POST /subscribe - Web Push 구독 등록 */
push.post('/subscribe', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const { endpoint, keys } = body || {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return c.json({ error: '유효하지 않은 구독 정보입니다' }, 400)
  }
  const userAgent = c.req.header('user-agent') || ''
  // 기존 구독이 있으면 업데이트
  const existing = await c.env.DB
    .prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
    .bind(user.id, endpoint)
    .first<any>()
  if (existing) {
    await c.env.DB
      .prepare(
        `UPDATE push_subscriptions
         SET p256dh_key = ?, auth_key = ?, user_agent = ?, enabled = 1, updated_at = ?
         WHERE id = ?`
      )
      .bind(keys.p256dh, keys.auth, userAgent, new Date().toISOString(), existing.id)
      .run()
    return c.json({ success: true, id: existing.id, updated: true })
  }
  const id = uuid()
  await c.env.DB
    .prepare(
      `INSERT INTO push_subscriptions
       (id, hospital_id, user_id, endpoint, p256dh_key, auth_key, user_agent, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(id, user.hospitalId, user.id, endpoint, keys.p256dh, keys.auth, userAgent)
    .run()
  return c.json({ success: true, id })
})

/** POST /unsubscribe - 구독 해제 */
push.post('/unsubscribe', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const endpoint = body.endpoint || ''
  if (endpoint) {
    await c.env.DB
      .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
      .bind(user.id, endpoint)
      .run()
  } else {
    await c.env.DB
      .prepare('DELETE FROM push_subscriptions WHERE user_id = ?')
      .bind(user.id)
      .run()
  }
  return c.json({ success: true })
})

/** GET /status - 현재 사용자의 구독 현황 */
push.get('/status', async (c) => {
  const user = c.get('user')
  const subs = await c.env.DB
    .prepare('SELECT id, endpoint, user_agent, enabled, created_at FROM push_subscriptions WHERE user_id = ?')
    .bind(user.id)
    .all()
  return c.json({ subscriptions: subs.results || [] })
})

export default push
