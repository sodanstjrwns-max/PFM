// ============================================================
// Messenger Init — Patient Chat 통합 Phase B
// ─────────────────────────────────────────────────────────────
// 메신저 첫 진입 시 호출되는 idempotent 초기화 라우트.
//   - 병원에 채널이 0개면 4 개의 기본 채널 자동 생성:
//       1. "📢 공지사항"   (announcement, write_restricted, 전 직원 자동 가입)
//       2. "💼 경영팀"     (group/경영, owner/admin/manager 자동 가입)
//       3. "🦷 진료팀"     (group/진료, 전 직원 자동 가입)
//       4. "💬 잡담"       (group/기타, 전 직원 자동 가입)
//   - 모든 현직 사용자의 messenger_role 이 비어 있으면 PFM role 기반으로 매핑.
//   - 본인의 messenger 초기 컨텍스트 (myProfile, settings, channelCount) 반환.
//
// 호출 시점: 프론트엔드 메신저 패널 mount 직전 1회.
// 마운트 경로: GET /api/protected/messenger/init
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import { generateMessengerId } from '../../lib/messenger-helpers'
import {
  writeMessengerAudit,
  getClientIP,
  getUserAgent,
} from '../../lib/messenger-audit'

const init = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/** 기본 채널 정의 — bootstrapping 용 */
type DefaultChannel = {
  name: string
  description: string
  category: string
  write_restricted: 0 | 1
  /** 'all' = 전 직원 / 'managers' = admin+manager only */
  audience: 'all' | 'managers'
}

const DEFAULT_CHANNELS: DefaultChannel[] = [
  {
    name: '📢 공지사항',
    description: '병원 전체 공지 — 관리자만 작성',
    category: '경영',
    write_restricted: 1,
    audience: 'all',
  },
  {
    name: '💼 경영팀',
    description: '경영진/매니저 의사결정 채널',
    category: '경영',
    write_restricted: 0,
    audience: 'managers',
  },
  {
    name: '🦷 진료팀',
    description: '진료 관련 공유 — 케이스/팁/장비',
    category: '진료',
    write_restricted: 0,
    audience: 'all',
  },
  {
    name: '💬 잡담',
    description: '자유 대화 공간',
    category: '기타',
    write_restricted: 0,
    audience: 'all',
  },
]

/**
 * 병원의 messenger_role 미설정 사용자 일괄 매핑 (idempotent).
 * 마이그레이션 0036 에서 이미 한 번 돌렸지만,
 * 그 이후 신규 가입한 사용자가 있으면 여기서 자동 갱신.
 */
async function ensureMessengerRoles(db: D1Database, hospitalId: string) {
  await db.batch([
    db.prepare(`
      UPDATE users SET messenger_role = 'owner'
      WHERE hospital_id = ? AND role = 'admin'
        AND (messenger_role IS NULL OR messenger_role = '' OR messenger_role = 'member')
    `).bind(hospitalId),
    db.prepare(`
      UPDATE users SET messenger_role = 'manager'
      WHERE hospital_id = ? AND role = 'manager'
        AND (messenger_role IS NULL OR messenger_role = '')
    `).bind(hospitalId),
    db.prepare(`
      UPDATE users SET messenger_role = 'member'
      WHERE hospital_id = ? AND role = 'staff'
        AND (messenger_role IS NULL OR messenger_role = '')
    `).bind(hospitalId),
  ])
}

/**
 * 기본 채널 4개 생성 + 적절한 멤버 자동 가입.
 * 이미 채널이 있는 병원은 건너뜀.
 */
async function bootstrapDefaultChannels(
  db: D1Database,
  hospitalId: string,
  creatorUserId: string,
): Promise<{ created: number; channelIds: string[] }> {
  // 이미 채널이 있으면 스킵 (idempotent)
  const existingCnt = await db.prepare(
    'SELECT COUNT(*) AS cnt FROM channels WHERE hospital_id = ?'
  ).bind(hospitalId).first<{ cnt: number }>()
  if ((existingCnt?.cnt || 0) > 0) {
    return { created: 0, channelIds: [] }
  }

  // 병원의 사용자 목록 (audience 분배용)
  const { results: usersAll } = await db.prepare(
    'SELECT id, role FROM users WHERE hospital_id = ?'
  ).bind(hospitalId).all<{ id: string; role: string }>()
  const allIds = (usersAll || []).map(u => u.id)
  const managerIds = (usersAll || [])
    .filter(u => u.role === 'admin' || u.role === 'manager')
    .map(u => u.id)

  const createdIds: string[] = []

  for (const ch of DEFAULT_CHANNELS) {
    const id = generateMessengerId('ch')

    await db.prepare(`
      INSERT INTO channels
        (id, hospital_id, name, description, type, category, view_mode,
         is_default, write_restricted, created_by)
      VALUES (?, ?, ?, ?, 'public', ?, 'chat', 1, ?, ?)
    `).bind(
      id,
      hospitalId,
      ch.name,
      ch.description,
      ch.category,
      ch.write_restricted,
      creatorUserId,
    ).run()

    const targets = ch.audience === 'managers' ? managerIds : allIds
    if (targets.length > 0) {
      const memberStmt = db.prepare(`
        INSERT OR IGNORE INTO channel_members
          (channel_id, user_id, role, category_label)
        VALUES (?, ?, ?, ?)
      `)
      await db.batch(
        targets.map(uid =>
          memberStmt.bind(
            id,
            uid,
            // 채널 생성자(또는 관리자)는 admin, 그 외 member
            uid === creatorUserId || (ch.audience === 'managers' && managerIds.includes(uid))
              ? 'admin'
              : 'member',
            ch.category,
          )
        )
      )
    }

    createdIds.push(id)
  }

  return { created: createdIds.length, channelIds: createdIds }
}

/* ═══ GET /messenger/init ═══
 *  메신저 첫 로드 시 호출. 다음을 한 응답에:
 *   - bootstrap : 기본 채널 자동 생성 여부 + 갯수
 *   - profile   : 본인의 메신저 컨텍스트 (messenger_role, presence 등)
 *   - settings  : 병원 메신저 설정 (escalation 분 단위 등)
 *   - stats     : 가입 채널 수, 전체 직원 수
 */
init.get('/', async (c) => {
  const user = c.get('user')!
  const userId = user.id
  const hospitalId = user.hospitalId

  // 1) messenger_role 자동 매핑 보강 (신규 직원 대응)
  try {
    await ensureMessengerRoles(c.env.DB, hospitalId)
  } catch (e) {
    console.error('[messenger-init] ensureMessengerRoles failed:', (e as Error).message)
  }

  // 2) 본인이 채널 admin/owner 권한이거나, 채널이 아예 없으면 부트스트랩
  //    (어떤 직원이 처음 열어도 자동 생성되도록 — 권한 체크는 ensure 후에)
  const meRole = await c.env.DB.prepare(
    'SELECT role, messenger_role FROM users WHERE id = ?'
  ).bind(userId).first<{ role: string; messenger_role: string }>()
  const isAdmin = meRole?.role === 'admin' || meRole?.role === 'manager'

  let bootstrapResult: { created: number; channelIds: string[] } = { created: 0, channelIds: [] }
  if (isAdmin) {
    try {
      bootstrapResult = await bootstrapDefaultChannels(c.env.DB, hospitalId, userId)
      if (bootstrapResult.created > 0) {
        writeMessengerAudit(c.env.DB, {
          hospitalId,
          actorId: userId,
          action: 'channel.create',
          targetType: 'channel',
          metadata: {
            event: 'bootstrap',
            created: bootstrapResult.created,
            channelIds: bootstrapResult.channelIds,
          },
          ip: getClientIP(c),
          userAgent: getUserAgent(c),
        })
      }
    } catch (e) {
      console.error('[messenger-init] bootstrap failed:', (e as Error).message)
    }
  }

  // 3) 본인이 어떤 기본 채널에 미가입이면 추가 (admin 이 아니어도)
  //    예: 신규 직원이 입사 → 이미 부트스트랩된 병원의 채널에 자동 합류
  try {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO channel_members (channel_id, user_id, role, category_label)
      SELECT c.id, ?, 'member', c.category
      FROM channels c
      WHERE c.hospital_id = ?
        AND c.is_default = 1
        AND c.type = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM channel_members WHERE channel_id = c.id AND user_id = ?
        )
    `).bind(userId, hospitalId, userId).run()
  } catch (e) {
    console.error('[messenger-init] auto-join failed:', (e as Error).message)
  }

  // 4) profile + 채널 수 + 병원 설정 동시 조회
  const [profileRow, settingsRow, statsRow] = await Promise.all([
    c.env.DB.prepare(`
      SELECT
        id, name, email, role AS pfm_role, department, position,
        messenger_role, presence_status, presence_location, last_seen_at,
        totp_enabled
      FROM users WHERE id = ?
    `).bind(userId).first<any>(),

    c.env.DB.prepare(`
      SELECT
        mask_patient_names, enforce_confirm_escalation, undo_window_seconds,
        show_sender_roles, daily_report_enabled, temperature_stages_enabled,
        escalation_minutes_l1, escalation_minutes_l2, escalation_minutes_l3
      FROM hospital_messenger_settings WHERE hospital_id = ?
    `).bind(hospitalId).first<any>(),

    c.env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM channels WHERE hospital_id = ?) AS channel_count,
        (SELECT COUNT(*) FROM channel_members cm
         JOIN channels c ON c.id = cm.channel_id
         WHERE c.hospital_id = ? AND cm.user_id = ?) AS my_channel_count,
        (SELECT COUNT(*) FROM users WHERE hospital_id = ?) AS user_count
    `).bind(hospitalId, hospitalId, userId, hospitalId).first<any>(),
  ])

  // 5) profile 의 messenger_role 이 비어 있다면 안전망으로 PFM role 매핑
  const profile = profileRow ? {
    ...profileRow,
    messenger_role: profileRow.messenger_role || pfmRoleToMessengerRole(profileRow.pfm_role),
  } : null

  // 6) 기본 메신저 알림 설정 (없으면 자동 시드)
  try {
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO messenger_notification_preferences
        (id, user_id, hospital_id, channel_id)
      VALUES (?, ?, ?, '__global__')
    `).bind(generateMessengerId('us') /* 임의 id */, userId, hospitalId).run()
  } catch { /* ignore */ }

  return c.json({
    success: true,
    bootstrap: {
      ranBootstrap: bootstrapResult.created > 0,
      createdChannels: bootstrapResult.created,
      channelIds: bootstrapResult.channelIds,
    },
    profile,
    settings: settingsRow || null,
    stats: statsRow || { channel_count: 0, my_channel_count: 0, user_count: 0 },
  })
})

/* ═══ POST /messenger/init/reset-defaults ═══
 *  관리자가 수동으로 기본 채널 재생성 호출 (이미 채널이 있으면 no-op).
 *  주의: 기존 채널을 지우지는 않음.
 */
init.post('/reset-defaults', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '관리자만 사용 가능합니다' }, 403)
  }

  const result = await bootstrapDefaultChannels(c.env.DB, user.hospitalId, user.id)
  return c.json({ success: true, ...result })
})

/* ═══ GET /messenger/init/settings ═══
 *  메신저 병원 설정만 단독 조회 (설정 페이지용).
 */
init.get('/settings', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare(`
    SELECT * FROM hospital_messenger_settings WHERE hospital_id = ?
  `).bind(user.hospitalId).first()
  return c.json({ settings: row || null })
})

/* ═══ PUT /messenger/init/settings ═══
 *  메신저 병원 설정 수정 (admin 만).
 */
init.put('/settings', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') {
    return c.json({ error: '원장(admin)만 수정 가능합니다' }, 403)
  }

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'JSON 필요' }, 400) }

  const allowed = [
    'mask_patient_names', 'enforce_confirm_escalation', 'undo_window_seconds',
    'show_sender_roles', 'daily_report_enabled', 'temperature_stages_enabled',
    'escalation_minutes_l1', 'escalation_minutes_l2', 'escalation_minutes_l3',
  ] as const
  const updates: string[] = []
  const params: any[] = []
  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = ?`)
      params.push(typeof body[key] === 'boolean' ? (body[key] ? 1 : 0) : body[key])
    }
  }
  if (updates.length === 0) return c.json({ error: '변경할 필드 없음' }, 400)

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(user.hospitalId)
  await c.env.DB.prepare(
    `UPDATE hospital_messenger_settings SET ${updates.join(', ')} WHERE hospital_id = ?`
  ).bind(...params).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: 'settings.update',
    targetType: 'hospital',
    targetId: user.hospitalId,
    metadata: { fields: updates.slice(0, -1) },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  const updated = await c.env.DB.prepare(
    'SELECT * FROM hospital_messenger_settings WHERE hospital_id = ?'
  ).bind(user.hospitalId).first()
  return c.json({ success: true, settings: updated })
})

export default init
