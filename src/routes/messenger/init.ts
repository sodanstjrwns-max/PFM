// ============================================================
// Messenger Init — Patient Chat 통합 Phase B
// ─────────────────────────────────────────────────────────────
// 메신저 초기 진입 시 호출하는 부트스트랩 엔드포인트.
//
//   GET  /messenger/init  → 병원에 기본 채널이 없으면 자동 생성
//                            + 모든 직원을 공지 채널에 자동 가입
//                            + 현재 사용자의 채널 목록 + 설정 반환
//   GET  /messenger/me    → 현재 사용자의 메신저 컨텍스트
//                            (messenger_role, presence, notification prefs)
//   GET  /messenger/settings  → 병원 메신저 설정 (hospital_messenger_settings)
//   PATCH /messenger/settings → 병원 메신저 설정 수정 (admin/owner 만)
//
// "기본 채널" 정의:
//   1. 📢 공지   — 카테고리: 경영, write_restricted=1, 모든 직원 자동 가입
//   2. 💼 경영   — 카테고리: 경영, 원장/매니저
//   3. 🦷 진료   — 카테고리: 진료, 모든 직원
//   4. 💬 상담/데스크 — 카테고리: 상담/데스크
//   5. ☕ 휴게실 — 카테고리: 기타, 모든 직원
//
// 마운트 경로: /api/protected/messenger
//   → /api/protected/messenger/init
//   → /api/protected/messenger/me
//   → /api/protected/messenger/settings
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import { generateMessengerId, hasMessengerPermission } from '../../lib/messenger-helpers'
import { writeMessengerAudit, getClientIP, getUserAgent } from '../../lib/messenger-audit'

const init = new Hono<{ Bindings: Bindings; Variables: Variables }>()

type DefaultChannel = {
  name: string
  description: string
  category: string
  view_mode: 'chat' | 'board'
  write_restricted: 0 | 1
  is_default: 0 | 1
  auto_join: 'all' | 'admin_manager'  // 모든 직원 vs 관리자만
}

const DEFAULT_CHANNELS: DefaultChannel[] = [
  {
    name: '📢 공지',
    description: '병원 공지사항 — 관리자만 작성, 모든 직원이 확인',
    category: '경영',
    view_mode: 'board',
    write_restricted: 1,
    is_default: 1,
    auto_join: 'all',
  },
  {
    name: '💼 경영',
    description: '원장/실장 — 경영 의사결정 및 KPI 공유',
    category: '경영',
    view_mode: 'chat',
    write_restricted: 0,
    is_default: 1,
    auto_join: 'admin_manager',
  },
  {
    name: '🦷 진료',
    description: '진료실 협업 — 환자 케어, 진료 일정 조율',
    category: '진료',
    view_mode: 'chat',
    write_restricted: 0,
    is_default: 1,
    auto_join: 'all',
  },
  {
    name: '💬 상담/데스크',
    description: '상담실/데스크 — 환자 응대, 예약, 수납',
    category: '상담/데스크',
    view_mode: 'chat',
    write_restricted: 0,
    is_default: 1,
    auto_join: 'all',
  },
  {
    name: '☕ 휴게실',
    description: '잡담/이벤트/생일 축하 등 자유로운 소통 공간',
    category: '기타',
    view_mode: 'chat',
    write_restricted: 0,
    is_default: 1,
    auto_join: 'all',
  },
]

/* ═══ GET /messenger/init ═══
 *  병원에 메신저 기본 채널이 없으면 자동 생성하고, 모든 직원을 가입시킴.
 *  이미 있는 경우엔 그냥 현재 상태만 반환 (멱등).
 */
init.get('/init', async (c) => {
  const user = c.get('user')!
  const userId = user.id
  const hospitalId = user.hospitalId

  // 현재 병원에 default 채널이 몇 개나 있는지
  const existingDefaults = await c.env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM channels WHERE hospital_id = ? AND is_default = 1'
  ).bind(hospitalId).first<{ cnt: number }>()

  const existingCount = existingDefaults?.cnt || 0
  let created = 0
  const createdChannels: { id: string; name: string }[] = []

  if (existingCount < DEFAULT_CHANNELS.length) {
    // 어떤 default 채널이 빠져 있는지 이름 기준으로 확인
    const { results: existing } = await c.env.DB.prepare(
      'SELECT name FROM channels WHERE hospital_id = ? AND is_default = 1'
    ).bind(hospitalId).all<{ name: string }>()
    const existingNames = new Set((existing || []).map(r => r.name))

    // 같은 병원의 모든 직원 + role 미리 조회 (auto_join 용)
    const { results: allUsers } = await c.env.DB.prepare(
      'SELECT id, role, messenger_role FROM users WHERE hospital_id = ?'
    ).bind(hospitalId).all<{ id: string; role: string; messenger_role: string }>()
    const everyone = allUsers || []
    const adminManagerIds = everyone
      .filter(u => u.role === 'admin' || u.role === 'manager')
      .map(u => u.id)

    for (const def of DEFAULT_CHANNELS) {
      if (existingNames.has(def.name)) continue

      const channelId = generateMessengerId('ch')
      await c.env.DB.prepare(`
        INSERT INTO channels
          (id, hospital_id, name, description, type, category, view_mode,
           is_default, write_restricted, created_by)
        VALUES (?, ?, ?, ?, 'public', ?, ?, 1, ?, ?)
      `).bind(
        channelId, hospitalId, def.name, def.description, def.category, def.view_mode,
        def.write_restricted, userId
      ).run()

      // auto_join 멤버 일괄 INSERT
      const memberIds = def.auto_join === 'all'
        ? everyone.map(u => u.id)
        : adminManagerIds

      if (memberIds.length > 0) {
        const memberStmt = c.env.DB.prepare(`
          INSERT OR IGNORE INTO channel_members (channel_id, user_id, role, category_label)
          VALUES (?, ?, ?, ?)
        `)
        // 첫 가입자 (대부분 본인) 가 admin, 나머지는 member
        const batchOps = memberIds.map(mid => {
          // PFM role 이 admin/manager 면 채널 admin 으로
          const u = everyone.find(x => x.id === mid)
          const channelRole = (u?.role === 'admin' || u?.role === 'manager') ? 'admin' : 'member'
          return memberStmt.bind(channelId, mid, channelRole, def.category)
        })
        // D1 배치 한도 (보통 500) 이내라면 한 번에. 안전하게 100개씩 분할.
        for (let i = 0; i < batchOps.length; i += 100) {
          await c.env.DB.batch(batchOps.slice(i, i + 100))
        }
      }

      createdChannels.push({ id: channelId, name: def.name })
      created++

      // 감사 로그
      writeMessengerAudit(c.env.DB, {
        hospitalId,
        actorId: userId,
        action: 'channel.create',
        targetType: 'channel',
        targetId: channelId,
        metadata: {
          name: def.name,
          is_default: true,
          auto_join: def.auto_join,
          member_count: memberIds.length,
        },
        ip: getClientIP(c),
        userAgent: getUserAgent(c),
      })
    }
  }

  // hospital_messenger_settings 확인 — 0035 마이그레이션에서 자동 시드됐지만 누락 대비
  const settings = await c.env.DB.prepare(
    'SELECT * FROM hospital_messenger_settings WHERE hospital_id = ?'
  ).bind(hospitalId).first<any>()
  if (!settings) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO hospital_messenger_settings (hospital_id) VALUES (?)'
    ).bind(hospitalId).run()
  }

  // 현재 사용자가 어디에도 가입돼 있지 않으면 (기존 사용자가 새 가입 등) — 공지 채널엔 자동 가입
  const myChannelCount = await c.env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM channel_members WHERE user_id = ?'
  ).bind(userId).first<{ cnt: number }>()
  if ((myChannelCount?.cnt || 0) === 0) {
    const announceCh = await c.env.DB.prepare(
      "SELECT id, category FROM channels WHERE hospital_id = ? AND name = '📢 공지' AND is_default = 1 LIMIT 1"
    ).bind(hospitalId).first<{ id: string; category: string }>()
    if (announceCh) {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO channel_members (channel_id, user_id, role, category_label)
        VALUES (?, ?, 'member', ?)
      `).bind(announceCh.id, userId, announceCh.category).run()
    }
  }

  // 사용자의 채널 목록 (channels.ts GET / 과 동일한 응답)
  const { results: myChannels } = await c.env.DB.prepare(`
    SELECT
      c.id, c.name, c.description, c.type, c.category, c.view_mode,
      c.is_default, c.write_restricted, c.created_at,
      cm.role AS channel_role, cm.last_read_at, cm.category_label,
      (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) AS member_count,
      (SELECT COUNT(*) FROM messages m
        WHERE m.channel_id = c.id
          AND m.is_deleted = 0
          AND m.user_id != ?
          AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
      ) AS unread_count
    FROM channels c
    JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
    WHERE c.hospital_id = ?
    ORDER BY c.is_default DESC, c.category ASC, c.name ASC
  `).bind(userId, userId, hospitalId).all()

  return c.json({
    bootstrapped: created > 0,
    created,
    createdChannels,
    channels: myChannels || [],
    settings: settings || { hospital_id: hospitalId },
    messengerRole: user.messengerRole || pfmRoleToMessengerRole(user.role),
  })
})

/* ═══ GET /messenger/me ═══
 *  현재 사용자의 메신저 컨텍스트.
 */
init.get('/me', async (c) => {
  const user = c.get('user')!

  const row = await c.env.DB.prepare(`
    SELECT
      id, name, email, role AS pfm_role,
      messenger_role, department,
      presence_status, presence_location, last_seen_at,
      totp_enabled
    FROM users
    WHERE id = ?
  `).bind(user.id).first<any>()

  if (!row) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)

  // 전역 알림 설정 (없으면 기본값 응답)
  const prefs = await c.env.DB.prepare(`
    SELECT muted, muted_until, dnd_enabled, dnd_start_time, dnd_end_time,
           notify_mentions_only, sound_enabled, desktop_enabled
    FROM messenger_notification_preferences
    WHERE user_id = ? AND channel_id = '__global__'
    LIMIT 1
  `).bind(user.id).first<any>()

  // 가입한 채널 수
  const channelCountRow = await c.env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM channel_members WHERE user_id = ?'
  ).bind(user.id).first<{ cnt: number }>()

  return c.json({
    user: row,
    messengerRole: row.messenger_role || pfmRoleToMessengerRole(user.role),
    notificationPrefs: prefs || {
      muted: 0,
      dnd_enabled: 0,
      notify_mentions_only: 0,
      sound_enabled: 1,
      desktop_enabled: 1,
    },
    channelCount: channelCountRow?.cnt || 0,
  })
})

/* ═══ GET /messenger/settings ═══
 *  병원 메신저 설정 조회.
 */
init.get('/settings', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare(
    'SELECT * FROM hospital_messenger_settings WHERE hospital_id = ?'
  ).bind(user.hospitalId).first<any>()

  if (!row) {
    // 자동 시드 (방어)
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO hospital_messenger_settings (hospital_id) VALUES (?)'
    ).bind(user.hospitalId).run()
    const fresh = await c.env.DB.prepare(
      'SELECT * FROM hospital_messenger_settings WHERE hospital_id = ?'
    ).bind(user.hospitalId).first<any>()
    return c.json({ settings: fresh })
  }
  return c.json({ settings: row })
})

/* ═══ PATCH /messenger/settings ═══
 *  병원 메신저 설정 수정 (settings.update 권한 — owner 만).
 */
init.patch('/settings', async (c) => {
  const user = c.get('user')!
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role)

  if (!hasMessengerPermission(messengerRole, 'settings.update')) {
    return c.json({ error: '병원 설정 수정 권한이 없습니다 (원장 전용)' }, 403)
  }

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const updates: string[] = []
  const params: any[] = []

  const intFields = [
    'mask_patient_names', 'enforce_confirm_escalation',
    'show_sender_roles', 'daily_report_enabled', 'temperature_stages_enabled',
  ]
  for (const f of intFields) {
    if (f in body) {
      updates.push(`${f} = ?`)
      params.push(body[f] ? 1 : 0)
    }
  }

  if (typeof body.undo_window_seconds === 'number') {
    updates.push('undo_window_seconds = ?')
    params.push(Math.max(0, Math.min(60, Math.floor(body.undo_window_seconds))))
  }
  if (typeof body.escalation_minutes_l1 === 'number') {
    updates.push('escalation_minutes_l1 = ?')
    params.push(Math.max(1, Math.min(1440, Math.floor(body.escalation_minutes_l1))))
  }
  if (typeof body.escalation_minutes_l2 === 'number') {
    updates.push('escalation_minutes_l2 = ?')
    params.push(Math.max(1, Math.min(1440, Math.floor(body.escalation_minutes_l2))))
  }
  if (typeof body.escalation_minutes_l3 === 'number') {
    updates.push('escalation_minutes_l3 = ?')
    params.push(Math.max(1, Math.min(1440, Math.floor(body.escalation_minutes_l3))))
  }
  if (Array.isArray(body.daily_report_recipient_roles)) {
    updates.push('daily_report_recipient_roles = ?')
    params.push(JSON.stringify(body.daily_report_recipient_roles))
  }

  if (updates.length === 0) return c.json({ error: '변경할 필드가 없습니다' }, 400)

  updates.push("updated_at = CURRENT_TIMESTAMP")
  params.push(user.hospitalId)

  await c.env.DB.prepare(
    `UPDATE hospital_messenger_settings SET ${updates.join(', ')} WHERE hospital_id = ?`
  ).bind(...params).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'settings.update',
    targetType: 'hospital_messenger_settings',
    targetId: user.hospitalId,
    metadata: { fields: updates.slice(0, -1) },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  const fresh = await c.env.DB.prepare(
    'SELECT * FROM hospital_messenger_settings WHERE hospital_id = ?'
  ).bind(user.hospitalId).first<any>()
  return c.json({ settings: fresh, success: true })
})

/* ═══ PUT /messenger/me/notifications ═══
 *  내 알림 설정 (전역) 수정.
 *  body: { muted?, dnd_enabled?, dnd_start_time?, dnd_end_time?, notify_mentions_only?, sound_enabled?, desktop_enabled? }
 */
init.put('/me/notifications', async (c) => {
  const user = c.get('user')!
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  // 기존 레코드 있는지
  const existing = await c.env.DB.prepare(
    "SELECT id FROM messenger_notification_preferences WHERE user_id = ? AND channel_id = '__global__'"
  ).bind(user.id).first<{ id: string }>()

  // 정규화
  const muted = body.muted ? 1 : 0
  const dndEnabled = body.dnd_enabled ? 1 : 0
  const dndStart = typeof body.dnd_start_time === 'string' ? body.dnd_start_time.slice(0, 8) : null
  const dndEnd = typeof body.dnd_end_time === 'string' ? body.dnd_end_time.slice(0, 8) : null
  const mentionsOnly = body.notify_mentions_only ? 1 : 0
  const soundEnabled = body.sound_enabled === false || body.sound_enabled === 0 ? 0 : 1
  const desktopEnabled = body.desktop_enabled === false || body.desktop_enabled === 0 ? 0 : 1

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE messenger_notification_preferences
      SET muted = ?, dnd_enabled = ?, dnd_start_time = ?, dnd_end_time = ?,
          notify_mentions_only = ?, sound_enabled = ?, desktop_enabled = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(muted, dndEnabled, dndStart, dndEnd, mentionsOnly, soundEnabled, desktopEnabled, existing.id).run()
  } else {
    const id = generateMessengerId('msg')  // prefix 만 재사용 (별도 prefix 만들기보다 간단)
    await c.env.DB.prepare(`
      INSERT INTO messenger_notification_preferences
        (id, user_id, hospital_id, channel_id, muted, dnd_enabled, dnd_start_time, dnd_end_time,
         notify_mentions_only, sound_enabled, desktop_enabled)
      VALUES (?, ?, ?, '__global__', ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, user.id, user.hospitalId, muted, dndEnabled, dndStart, dndEnd,
             mentionsOnly, soundEnabled, desktopEnabled).run()
  }

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'notification.pref_update',
    metadata: { muted, dndEnabled, mentionsOnly },
    ip: getClientIP(c),
  })

  return c.json({ success: true })
})

export default init
