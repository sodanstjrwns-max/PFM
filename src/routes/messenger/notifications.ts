// ============================================================
// Messenger Notifications — Phase F.2
// ─────────────────────────────────────────────────────────────
// 직원별 알림 선호 + Quiet Hours.
//   - 전역 설정:    channel_id = '__global__'
//   - 채널별 설정:  channel_id = 실제 채널 ID
//
//   - GET   /notifications/preferences            (내 모든 설정 + global 머지)
//   - PUT   /notifications/preferences            (전역 설정 upsert)
//   - PUT   /notifications/preferences/:channel   (채널별 설정 upsert)
//   - DELETE /notifications/preferences/:channel  (채널별 설정 제거 → global 로 fallback)
//   - POST  /notifications/quiet-check            (지금이 quiet hour 인지 + ms-until-end)
//
// Quiet Hours 우회 규칙 (UX 약속):
//   - 긴급콜 (urgent_calls) 은 항상 알림
//   - L3 에스컬레이션은 항상 알림 (Phase D 약속)
//   - mention(@) + confirm_required 는 알림 (notify_mentions_only=1 일 때만)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'

const notif = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const GLOBAL = '__global__'

interface PrefRow {
  channel_id: string
  muted: number
  muted_until: string | null
  dnd_enabled: number
  dnd_start_time: string | null
  dnd_end_time: string | null
  notify_mentions_only: number
  sound_enabled: number
  desktop_enabled: number
  updated_at: string
}

function normalizeBody(body: any) {
  return {
    muted: body.muted === true || body.muted === 1 ? 1 : 0,
    muted_until: body.muted_until ? String(body.muted_until).slice(0, 30) : null,
    dnd_enabled: body.dnd_enabled === true || body.dnd_enabled === 1 ? 1 : 0,
    dnd_start_time: body.dnd_start_time ? String(body.dnd_start_time).slice(0, 5) : null,  // 'HH:MM'
    dnd_end_time: body.dnd_end_time ? String(body.dnd_end_time).slice(0, 5) : null,
    notify_mentions_only: body.notify_mentions_only === true || body.notify_mentions_only === 1 ? 1 : 0,
    sound_enabled: body.sound_enabled === false || body.sound_enabled === 0 ? 0 : 1,
    desktop_enabled: body.desktop_enabled === false || body.desktop_enabled === 0 ? 0 : 1,
  }
}

/** 'HH:MM' 시작/종료가 자정을 넘어가는 quiet window 인지 (예: 22:00 ~ 07:00) */
function isWithinQuietWindow(startHHMM: string | null, endHHMM: string | null, now = new Date()): boolean {
  if (!startHHMM || !endHHMM) return false
  const [sh, sm] = startHHMM.split(':').map(Number)
  const [eh, em] = endHHMM.split(':').map(Number)
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return false
  const nowM = now.getHours() * 60 + now.getMinutes()
  const startM = sh * 60 + sm
  const endM = eh * 60 + em
  // 자정 넘는 윈도우 (22:00 → 07:00)
  if (startM <= endM) {
    return nowM >= startM && nowM < endM
  } else {
    return nowM >= startM || nowM < endM
  }
}

/* ═══ GET /notifications/preferences ═══
 *  내 전역 + 채널별 모든 설정.
 *  응답: { global: {...}, per_channel: [{channel_id, name, muted, ...}] }
 */
notif.get('/notifications/preferences', async (c) => {
  const user = c.get('user')!

  const { results } = await c.env.DB.prepare(`
    SELECT p.channel_id, p.muted, p.muted_until, p.dnd_enabled, p.dnd_start_time, p.dnd_end_time,
           p.notify_mentions_only, p.sound_enabled, p.desktop_enabled, p.updated_at,
           c.name AS channel_name, c.category
    FROM messenger_notification_preferences p
    LEFT JOIN channels c ON c.id = p.channel_id AND c.hospital_id = p.hospital_id
    WHERE p.user_id = ? AND p.hospital_id = ?
    ORDER BY p.channel_id = '__global__' DESC, p.updated_at DESC
  `).bind(user.id, user.hospitalId).all<PrefRow & { channel_name: string | null, category: string | null }>()

  const rows = results || []
  const global = rows.find(r => r.channel_id === GLOBAL) || null
  const per = rows.filter(r => r.channel_id !== GLOBAL)

  // global 기본값 (없으면 default 객체)
  const defaultGlobal = {
    channel_id: GLOBAL,
    muted: 0, muted_until: null,
    dnd_enabled: 0, dnd_start_time: null, dnd_end_time: null,
    notify_mentions_only: 0,
    sound_enabled: 1, desktop_enabled: 1,
  }

  return c.json({
    global: global ? {
      muted: global.muted === 1,
      muted_until: global.muted_until,
      dnd_enabled: global.dnd_enabled === 1,
      dnd_start_time: global.dnd_start_time,
      dnd_end_time: global.dnd_end_time,
      notify_mentions_only: global.notify_mentions_only === 1,
      sound_enabled: global.sound_enabled === 1,
      desktop_enabled: global.desktop_enabled === 1,
      updated_at: global.updated_at,
    } : { ...defaultGlobal, muted: false, dnd_enabled: false, notify_mentions_only: false, sound_enabled: true, desktop_enabled: true },
    per_channel: per.map(r => ({
      channel_id: r.channel_id,
      channel_name: r.channel_name,
      category: r.category,
      muted: r.muted === 1,
      muted_until: r.muted_until,
      notify_mentions_only: r.notify_mentions_only === 1,
      sound_enabled: r.sound_enabled === 1,
      desktop_enabled: r.desktop_enabled === 1,
      updated_at: r.updated_at,
    })),
  })
})


/* ═══ PUT /notifications/preferences ═══
 *  전역 설정 upsert.
 *  body: { muted, muted_until, dnd_enabled, dnd_start_time, dnd_end_time, notify_mentions_only, sound_enabled, desktop_enabled }
 */
notif.put('/notifications/preferences', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const v = normalizeBody(body)

  // dnd_start/end validation
  if (v.dnd_enabled === 1) {
    const re = /^\d{2}:\d{2}$/
    if (!v.dnd_start_time || !v.dnd_end_time || !re.test(v.dnd_start_time) || !re.test(v.dnd_end_time)) {
      return c.json({ error: 'dnd_enabled=true 일 때는 dnd_start_time / dnd_end_time (HH:MM) 이 필요합니다' }, 400)
    }
  }

  const id = `mnp_${crypto.randomUUID()}`
  await c.env.DB.prepare(`
    INSERT INTO messenger_notification_preferences
      (id, user_id, hospital_id, channel_id, muted, muted_until, dnd_enabled,
       dnd_start_time, dnd_end_time, notify_mentions_only, sound_enabled, desktop_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, channel_id) DO UPDATE SET
      muted = excluded.muted,
      muted_until = excluded.muted_until,
      dnd_enabled = excluded.dnd_enabled,
      dnd_start_time = excluded.dnd_start_time,
      dnd_end_time = excluded.dnd_end_time,
      notify_mentions_only = excluded.notify_mentions_only,
      sound_enabled = excluded.sound_enabled,
      desktop_enabled = excluded.desktop_enabled,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id, user.id, user.hospitalId, GLOBAL,
    v.muted, v.muted_until, v.dnd_enabled,
    v.dnd_start_time, v.dnd_end_time, v.notify_mentions_only,
    v.sound_enabled, v.desktop_enabled
  ).run()

  return c.json({ success: true, scope: 'global', preferences: v })
})


/* ═══ PUT /notifications/preferences/:channelId ═══
 *  채널별 설정 upsert.
 *  (dnd 은 전역만 적용 — 채널별 dnd 는 의미 없음. mute / mentions_only 위주)
 */
notif.put('/notifications/preferences/:channelId', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('channelId')

  if (channelId === GLOBAL) return c.json({ error: 'global 은 /notifications/preferences 로 PUT 하세요' }, 400)

  // 채널이 본인 병원 소속인지 검증
  const ch = await c.env.DB.prepare(
    `SELECT 1 FROM channels WHERE id = ? AND hospital_id = ? LIMIT 1`
  ).bind(channelId, user.hospitalId).first()
  if (!ch) return c.json({ error: '채널을 찾을 수 없습니다' }, 404)

  const body = await c.req.json().catch(() => ({}))
  const v = normalizeBody(body)

  const id = `mnp_${crypto.randomUUID()}`
  await c.env.DB.prepare(`
    INSERT INTO messenger_notification_preferences
      (id, user_id, hospital_id, channel_id, muted, muted_until, dnd_enabled,
       dnd_start_time, dnd_end_time, notify_mentions_only, sound_enabled, desktop_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, channel_id) DO UPDATE SET
      muted = excluded.muted,
      muted_until = excluded.muted_until,
      notify_mentions_only = excluded.notify_mentions_only,
      sound_enabled = excluded.sound_enabled,
      desktop_enabled = excluded.desktop_enabled,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    id, user.id, user.hospitalId, channelId,
    v.muted, v.muted_until,
    v.notify_mentions_only, v.sound_enabled, v.desktop_enabled
  ).run()

  return c.json({ success: true, channel_id: channelId, preferences: v })
})


/* ═══ DELETE /notifications/preferences/:channelId ═══
 *  채널별 설정 삭제 (전역으로 fallback)
 */
notif.delete('/notifications/preferences/:channelId', async (c) => {
  const user = c.get('user')!
  const channelId = c.req.param('channelId')
  if (channelId === GLOBAL) return c.json({ error: 'global 설정은 삭제할 수 없습니다 (PUT 으로 reset)' }, 400)

  const res = await c.env.DB.prepare(
    `DELETE FROM messenger_notification_preferences
     WHERE user_id = ? AND hospital_id = ? AND channel_id = ?`
  ).bind(user.id, user.hospitalId, channelId).run()

  return c.json({ success: true, deleted: res.meta?.changes || 0 })
})


/* ═══ POST /notifications/quiet-check ═══
 *  지금이 quiet hour 인지 확인 (프론트에서 알림 띄울지 판단용).
 *  body: { channel_id?: string, is_mention?: boolean, is_urgent?: boolean, is_l3_escalation?: boolean }
 *  응답: { quiet, reason, ms_until_end?, override_reasons }
 */
notif.post('/notifications/quiet-check', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const channelId = body.channel_id || null
  const isMention = !!body.is_mention
  const isUrgent = !!body.is_urgent
  const isL3 = !!body.is_l3_escalation

  // 우회 케이스 먼저
  const overrides: string[] = []
  if (isUrgent) overrides.push('urgent_call')
  if (isL3) overrides.push('l3_escalation')
  if (overrides.length > 0) {
    return c.json({ quiet: false, override: true, override_reasons: overrides })
  }

  // global 설정
  const global = await c.env.DB.prepare(`
    SELECT muted, muted_until, dnd_enabled, dnd_start_time, dnd_end_time, notify_mentions_only
    FROM messenger_notification_preferences
    WHERE user_id = ? AND hospital_id = ? AND channel_id = '__global__' LIMIT 1
  `).bind(user.id, user.hospitalId).first<any>()

  const now = new Date()

  // 전역 mute (muted_until 까지)
  if (global?.muted === 1) {
    if (!global.muted_until || new Date(global.muted_until).getTime() > now.getTime()) {
      return c.json({ quiet: true, reason: 'global_mute', muted_until: global.muted_until })
    }
  }

  // 전역 DND 시간대
  if (global?.dnd_enabled === 1 && isWithinQuietWindow(global.dnd_start_time, global.dnd_end_time, now)) {
    return c.json({ quiet: true, reason: 'dnd_window', dnd_end_time: global.dnd_end_time })
  }

  // mentions_only 인데 mention 아님
  if (global?.notify_mentions_only === 1 && !isMention) {
    return c.json({ quiet: true, reason: 'mentions_only' })
  }

  // 채널별 mute 확인
  if (channelId) {
    const ch = await c.env.DB.prepare(`
      SELECT muted, muted_until, notify_mentions_only
      FROM messenger_notification_preferences
      WHERE user_id = ? AND hospital_id = ? AND channel_id = ? LIMIT 1
    `).bind(user.id, user.hospitalId, channelId).first<any>()

    if (ch?.muted === 1) {
      if (!ch.muted_until || new Date(ch.muted_until).getTime() > now.getTime()) {
        return c.json({ quiet: true, reason: 'channel_mute', muted_until: ch.muted_until })
      }
    }
    if (ch?.notify_mentions_only === 1 && !isMention) {
      return c.json({ quiet: true, reason: 'channel_mentions_only' })
    }
  }

  return c.json({ quiet: false })
})

export default notif
