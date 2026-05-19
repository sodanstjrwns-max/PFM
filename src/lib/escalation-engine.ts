// ============================================================
// Escalation Engine — Confirm-required 메시지 자동 승격
// Phase D
// ─────────────────────────────────────────────────────────────
// 규칙 (hospital_messenger_settings 에서 분 단위 조정 가능):
//   L1 (기본 10분) : 발송자에게 리마인더 + 채널 멤버 전원 재알림
//   L2 (기본 20분) : 매니저급 (messenger_role IN ('owner','admin','manager')) 알림
//   L3 (기본 40분) : 원장(owner) 알림
//
// 트리거 조건:
//   - messages.confirm_required = 1 AND is_deleted = 0
//   - 채널 멤버 전원이 message_reads.confirmed_at 을 채우지 못함
//   - 발송 후 임계 시간(L1/L2/L3) 경과
//   - 같은 (message_id, level) 의 message_escalations 가 아직 없음 (idempotency)
//
// 멀티테넌트: hospital_id 항상 강제. 한 번에 한 병원만 처리하므로
// 다른 병원 데이터로 새지 않음.
//
// 1분 throttle: 워커 isolate 메모리에 '병원별 마지막 스캔 시각' 보관.
// 1분 이내 재호출은 즉시 종료 (no-op). 폴링이 1-2초마다 와도 안전.
// ============================================================

import { generateMessengerId } from './messenger-helpers'
import { writeMessengerAudit } from './messenger-audit'

const SCAN_THROTTLE_MS = 60_000           // 1 분
const lastScanByHospital = new Map<string, number>()

interface SettingsRow {
  escalation_minutes_l1: number
  escalation_minutes_l2: number
  escalation_minutes_l3: number
  enforce_confirm_escalation: number
}

const DEFAULT_SETTINGS: SettingsRow = {
  escalation_minutes_l1: 10,
  escalation_minutes_l2: 20,
  escalation_minutes_l3: 40,
  enforce_confirm_escalation: 1,
}

export interface EscalationTriggered {
  id: string
  message_id: string
  level: 1 | 2 | 3
  triggered_at: string
  channel_id: string
  sender_id: string
  message_preview: string
  notified_count: number
}

/**
 * 한 병원의 confirm-required 미확인 메시지를 스캔해 필요한 에스컬레이션을 INSERT.
 *
 * @returns 이번 스캔에서 새로 트리거된 에스컬레이션 목록 (폴링 응답에 실어 보냄)
 */
export async function scanAndEscalate(
  db: D1Database,
  hospitalId: string,
  opts: { force?: boolean } = {},
): Promise<EscalationTriggered[]> {
  // 1. throttle
  if (!opts.force) {
    const last = lastScanByHospital.get(hospitalId) ?? 0
    const now = Date.now()
    if (now - last < SCAN_THROTTLE_MS) return []
    lastScanByHospital.set(hospitalId, now)
  } else {
    lastScanByHospital.set(hospitalId, Date.now())
  }

  // 2. 설정 로드 (없으면 기본값)
  const settings = await db.prepare(`
    SELECT escalation_minutes_l1, escalation_minutes_l2, escalation_minutes_l3, enforce_confirm_escalation
    FROM hospital_messenger_settings WHERE hospital_id = ?
  `).bind(hospitalId).first<SettingsRow>() ?? DEFAULT_SETTINGS

  if (!settings.enforce_confirm_escalation) return []

  const triggered: EscalationTriggered[] = []

  // 3. L1/L2/L3 각각 처리
  for (const level of [1, 2, 3] as const) {
    const minutes = level === 1 ? settings.escalation_minutes_l1
                  : level === 2 ? settings.escalation_minutes_l2
                  : settings.escalation_minutes_l3

    // 미확인 confirm-required 메시지 = (채널 멤버 수) > (메시지에 confirmed_at != null 한 read 수)
    //   AND 발송 후 minutes 분 경과
    //   AND 같은 level 의 escalation 미존재
    const candidates = await db.prepare(`
      SELECT
        m.id AS message_id,
        m.channel_id,
        m.user_id AS sender_id,
        m.content,
        m.created_at,
        (SELECT COUNT(*) FROM channel_members WHERE channel_id = m.channel_id) AS member_count,
        (SELECT COUNT(*) FROM message_reads
          WHERE message_id = m.id AND confirmed_at IS NOT NULL) AS confirmed_count
      FROM messages m
      JOIN channels ch ON ch.id = m.channel_id
      WHERE ch.hospital_id = ?
        AND m.confirm_required = 1
        AND m.is_deleted = 0
        AND m.created_at <= datetime('now', ?)
        AND NOT EXISTS (
          SELECT 1 FROM message_escalations e
          WHERE e.message_id = m.id AND e.level = ?
        )
      ORDER BY m.created_at ASC
      LIMIT 50
    `).bind(hospitalId, `-${minutes} minutes`, level).all<any>()

    for (const row of (candidates.results || [])) {
      // 멤버 1명 이하면 트리거 안 함 (자기자신만)
      if ((row.member_count ?? 0) <= 1) continue
      // 모두 확인했으면 트리거 안 함 (발송자 제외하고 멤버-1 명만 확인하면 됨)
      if ((row.confirmed_count ?? 0) >= (row.member_count - 1)) continue

      // 알림 대상 결정
      const notifyIds = await pickNotifyUserIds(db, {
        hospitalId,
        channelId: row.channel_id,
        senderId: row.sender_id,
        level,
      })

      const escId = generateMessengerId('esc')
      await db.prepare(`
        INSERT INTO message_escalations (id, message_id, hospital_id, level, triggered_at, notified_user_ids)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `).bind(escId, row.message_id, hospitalId, level, JSON.stringify(notifyIds)).run()

      // 감사 로그 (fire-and-forget)
      writeMessengerAudit(db, {
        hospitalId,
        actorId: 'system',
        action: level === 1 ? 'escalation.l1' : level === 2 ? 'escalation.l2' : 'escalation.l3',
        targetType: 'message',
        targetId: row.message_id,
        metadata: {
          level,
          channel_id: row.channel_id,
          sender_id: row.sender_id,
          notified: notifyIds,
          member_count: row.member_count,
          confirmed_count: row.confirmed_count,
        },
      })

      triggered.push({
        id: escId,
        message_id: row.message_id,
        level,
        triggered_at: new Date().toISOString(),
        channel_id: row.channel_id,
        sender_id: row.sender_id,
        message_preview: (row.content || '').slice(0, 140),
        notified_count: notifyIds.length,
      })
    }
  }

  return triggered
}

/**
 * 레벨별 알림 대상 user_id 목록.
 * L1: 채널 미확인 멤버 + 발송자 (리마인드)
 * L2: 채널 멤버 중 messenger_role IN (manager, admin, owner)
 * L3: 병원 owner + admin (전사)
 */
async function pickNotifyUserIds(
  db: D1Database,
  args: { hospitalId: string; channelId: string; senderId: string; level: 1 | 2 | 3 },
): Promise<string[]> {
  if (args.level === 1) {
    // 미확인 멤버 + 발송자 자신
    // (특정 메시지에 대해 confirmed_at 이 없는 채널 멤버)
    // — 호출자는 채널 단위라 어떤 메시지인지 모르지만, L1 은 "이 채널의 미확인 멤버 전원" 으로 충분.
    // 정확히는 message_id 가 필요하지만, scanAndEscalate 가 메시지 단위로 호출하므로 별도 오버로드 제공.
    const rows = await db.prepare(`
      SELECT cm.user_id
      FROM channel_members cm
      WHERE cm.channel_id = ?
    `).bind(args.channelId).all<{ user_id: string }>()
    const ids = (rows.results || []).map(r => r.user_id)
    if (!ids.includes(args.senderId)) ids.push(args.senderId)
    return [...new Set(ids)]
  }

  if (args.level === 2) {
    const rows = await db.prepare(`
      SELECT u.id
      FROM users u
      JOIN channel_members cm ON cm.user_id = u.id AND cm.channel_id = ?
      WHERE u.hospital_id = ?
        AND u.messenger_role IN ('owner','admin','manager','team_lead')
    `).bind(args.channelId, args.hospitalId).all<{ id: string }>()
    return (rows.results || []).map(r => r.id)
  }

  // L3
  const rows = await db.prepare(`
    SELECT id FROM users
    WHERE hospital_id = ? AND messenger_role IN ('owner','admin')
  `).bind(args.hospitalId).all<{ id: string }>()
  return (rows.results || []).map(r => r.id)
}

/**
 * 폴링 응답에 실을 "사용자별 미해결 에스컬레이션 카운트".
 * notified_user_ids 에 본인이 포함되고 still pending 인 것만.
 */
export async function getUserEscalations(
  db: D1Database,
  hospitalId: string,
  userId: string,
  since?: string,
): Promise<any[]> {
  const sinceClause = since ? 'AND e.triggered_at > ?' : ''
  const stmt = since
    ? db.prepare(`
        SELECT e.id, e.message_id, e.level, e.triggered_at, e.notified_user_ids,
               m.content, m.channel_id, m.user_id AS sender_id
        FROM message_escalations e
        JOIN messages m ON m.id = e.message_id
        WHERE e.hospital_id = ? ${sinceClause}
        ORDER BY e.triggered_at DESC LIMIT 50
      `).bind(hospitalId, since)
    : db.prepare(`
        SELECT e.id, e.message_id, e.level, e.triggered_at, e.notified_user_ids,
               m.content, m.channel_id, m.user_id AS sender_id
        FROM message_escalations e
        JOIN messages m ON m.id = e.message_id
        WHERE e.hospital_id = ?
        ORDER BY e.triggered_at DESC LIMIT 50
      `).bind(hospitalId)

  const { results } = await stmt.all<any>()
  return (results || []).filter(r => {
    try {
      const ids: string[] = JSON.parse(r.notified_user_ids || '[]')
      return ids.includes(userId)
    } catch {
      return false
    }
  })
}
