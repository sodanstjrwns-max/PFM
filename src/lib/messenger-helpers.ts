// ============================================================
// Messenger Helpers — Patient Chat 통합 Phase B
// ─────────────────────────────────────────────────────────────
// 메신저 라우트 전반에서 공통으로 쓰는 헬퍼 모음.
//   1. ID 생성 (페이션트 챗 원본 prefix 컨벤션 유지)
//   2. 채널 접근/멤버십 검증 (멀티테넌트 hospital_id 강제)
//   3. JSON 안전 파싱 (reactions/mentions/acknowledged_by 등)
//   4. mention 파싱
//   5. 메신저 권한 매트릭스 (페이션트 챗 hasPermission 이식)
// ============================================================

import type { MessengerRole } from './types'

/* ═══ 1. ID Generation ═══ */
// 페이션트 챗 원본 컨벤션:
//   msg = message,   ch  = channel,   cm  = channel_member (사용 안 함, PK 가 복합키)
//   mr  = message_read (사용 안 함, PK 복합키),
//   esc = escalation, uc  = urgent_call, qr  = quick_reply, sm  = scheduled_message
//   mal = messenger_audit_log (audit.ts 에서 직접 사용)
//   us  = user_session, td  = trusted_device
export type MessengerIdPrefix =
  | 'msg' | 'ch' | 'esc' | 'uc' | 'qr' | 'sm' | 'mal' | 'us' | 'td'
  | 'pt'  | 'pte'   // patient_thread / patient_thread_event (Phase C)
  | 'att' | 'tai'   // attachment / thread_ai_insight (Phase E)

/**
 * 메신저용 ID 생성기.
 * 형식: `{prefix}_{uuid}` — 디버깅/로그에서 한눈에 타입 판별 가능.
 *
 * crypto.randomUUID() 는 Cloudflare Workers / 모던 브라우저 모두 지원.
 */
export function generateMessengerId(prefix: MessengerIdPrefix): string {
  return `${prefix}_${crypto.randomUUID()}`
}

/* ═══ 2. Channel Access / Membership Verification ═══ */

/**
 * 채널이 해당 병원 소속인지 검증.
 * IDOR(Insecure Direct Object Reference) 방어 — 다른 병원의 채널 접근 차단.
 *
 * @returns 채널이 존재하고 hospital_id 가 일치하면 true
 */
export async function assertHospitalChannel(
  db: D1Database,
  channelId: string,
  hospitalId: string,
): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 AS ok FROM channels WHERE id = ? AND hospital_id = ? LIMIT 1'
  ).bind(channelId, hospitalId).first<{ ok: number }>()
  return !!row
}

/**
 * 사용자가 채널의 멤버인지 검증 + role 반환.
 *
 * @returns 멤버이면 `{ role: 'admin' | 'member' }`, 아니면 null
 */
export async function assertChannelMember(
  db: D1Database,
  channelId: string,
  userId: string,
): Promise<{ role: string; category_label: string } | null> {
  const row = await db.prepare(
    'SELECT role, category_label FROM channel_members WHERE channel_id = ? AND user_id = ? LIMIT 1'
  ).bind(channelId, userId).first<{ role: string; category_label: string }>()
  return row || null
}

/**
 * 한 번의 호출로 (1) 병원 소속 (2) 멤버 자격 둘 다 검증.
 * 라우트에서 가장 자주 쓰는 패턴.
 *
 * @returns { ok: true, channelRole } 또는 { ok: false, status, error }
 */
export async function assertChannelAccess(
  db: D1Database,
  channelId: string,
  userId: string,
  hospitalId: string,
): Promise<
  | { ok: true; channelRole: string; categoryLabel: string }
  | { ok: false; status: 403 | 404; error: string }
> {
  // 한 쿼리로 두 조건 동시 확인 (DB 라운드트립 절약)
  const row = await db.prepare(`
    SELECT cm.role AS channel_role, cm.category_label
    FROM channels c
    JOIN channel_members cm ON cm.channel_id = c.id
    WHERE c.id = ? AND c.hospital_id = ? AND cm.user_id = ?
    LIMIT 1
  `).bind(channelId, hospitalId, userId).first<{
    channel_role: string
    category_label: string
  }>()

  if (!row) {
    // 채널 존재 여부 별도 확인 — 404 vs 403 구분
    const exists = await db.prepare(
      'SELECT 1 AS ok FROM channels WHERE id = ? AND hospital_id = ? LIMIT 1'
    ).bind(channelId, hospitalId).first()
    if (!exists) return { ok: false, status: 404, error: '채널을 찾을 수 없습니다' }
    return { ok: false, status: 403, error: '채널 멤버가 아닙니다' }
  }
  return { ok: true, channelRole: row.channel_role, categoryLabel: row.category_label || '' }
}

/**
 * 메시지가 해당 병원/채널에 속하는지 검증 + 작성자 반환.
 * 메시지 수정/삭제/핀 등에서 사용.
 */
export async function assertMessageAccess(
  db: D1Database,
  messageId: string,
  hospitalId: string,
): Promise<
  | { ok: true; userId: string; channelId: string; isDeleted: boolean }
  | { ok: false; status: 404; error: string }
> {
  const row = await db.prepare(`
    SELECT m.user_id, m.channel_id, m.is_deleted
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    WHERE m.id = ? AND c.hospital_id = ?
    LIMIT 1
  `).bind(messageId, hospitalId).first<{
    user_id: string
    channel_id: string
    is_deleted: number
  }>()
  if (!row) return { ok: false, status: 404, error: '메시지를 찾을 수 없습니다' }
  return {
    ok: true,
    userId: row.user_id,
    channelId: row.channel_id,
    isDeleted: !!row.is_deleted,
  }
}

/**
 * 같은 병원 사용자인지 검증 (멤버 추가 등에서).
 */
export async function assertSameHospitalUser(
  db: D1Database,
  targetUserId: string,
  hospitalId: string,
): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 AS ok FROM users WHERE id = ? AND hospital_id = ? LIMIT 1'
  ).bind(targetUserId, hospitalId).first()
  return !!row
}

/* ═══ 3. Safe JSON Parsing ═══ */

/**
 * D1 에 TEXT 로 저장된 JSON 컬럼 안전 파싱.
 * 손상되거나 빈 값이면 fallback 반환.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** reactions JSON ({"👍": ["uid1", "uid2"]}) 헬퍼 */
export function parseReactions(raw: string | null | undefined): Record<string, string[]> {
  return safeJsonParse<Record<string, string[]>>(raw, {})
}

/** mentions JSON (["uid1", "uid2"]) 헬퍼 */
export function parseMentionsField(raw: string | null | undefined): string[] {
  const arr = safeJsonParse<string[]>(raw, [])
  return Array.isArray(arr) ? arr : []
}

/* ═══ 4. Mention Parsing ═══ */
// 페이션트 챗 컨벤션: `@홍길동` 형식이지만 ID 기반 매핑은 클라이언트에서 처리.
// 여기서는 raw mention 토큰만 추출 (서버는 후처리에서 ID 매핑).

/**
 * 메시지 본문에서 @멘션 토큰 추출.
 * 예: "안녕 @김매니저 @박원장 보세요" → ["김매니저", "박원장"]
 *
 * 한글/영문/숫자/언더스코어 허용. 공백/구두점에서 끊김.
 */
export function parseMentions(content: string): string[] {
  if (!content) return []
  // \p{L} = 모든 유니코드 문자, \p{N} = 숫자
  const re = /@([\p{L}\p{N}_]+)/gu
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (m[1] && !out.includes(m[1])) out.push(m[1])
  }
  return out
}

/**
 * @멘션 토큰(이름)을 실제 user_id 로 매핑.
 * 같은 병원 내에서 name 일치하는 사용자 검색.
 */
export async function resolveMentionsToUserIds(
  db: D1Database,
  mentionTokens: string[],
  hospitalId: string,
): Promise<string[]> {
  if (mentionTokens.length === 0) return []
  // 중복 제거 + 최대 20개로 제한 (DoS 방어)
  const tokens = [...new Set(mentionTokens)].slice(0, 20)
  const placeholders = tokens.map(() => '?').join(',')
  const { results } = await db.prepare(
    `SELECT id FROM users WHERE hospital_id = ? AND name IN (${placeholders})`
  ).bind(hospitalId, ...tokens).all<{ id: string }>()
  return (results || []).map(r => r.id)
}

/* ═══ 5. Permission Matrix (Patient Chat hasPermission 이식) ═══ */
// 메신저 전용 권한 — PFM 의 role(admin/manager/staff) 과는 별개로
// messenger_role(owner/admin/manager/team_lead/member/guest) 기반.

export type MessengerPermission =
  // 채널
  | 'channel.create' | 'channel.edit' | 'channel.delete' | 'channel.archive'
  | 'member.add' | 'member.remove' | 'member.role_change'
  // 메시지
  | 'message.delete_any' | 'message.pin' | 'message.forward'
  | 'message.confirm_required'   // confirm-required 메시지 발송 권한
  // 긴급/에스컬레이션
  | 'urgent.call' | 'urgent.resolve' | 'escalation.override'
  // 관리
  | 'settings.update' | 'audit.read' | 'patient_thread.manage'

/**
 * messenger_role 권한 매트릭스.
 *
 * - owner    : 모든 권한 (원장)
 * - admin    : owner 와 거의 동일 (settings.update 제외)
 * - manager  : 운영 관리자 (실장급) — 채널/멤버/메시지 관리, confirm 발송
 * - team_lead: 팀장 — 자기 채널 내 관리, confirm 발송
 * - member   : 일반 직원 — 발송/응답만
 * - guest    : 외부 협력자 — 읽기 + 제한된 발송
 */
const PERMISSIONS: Record<MessengerRole, Set<MessengerPermission>> = {
  owner: new Set<MessengerPermission>([
    'channel.create', 'channel.edit', 'channel.delete', 'channel.archive',
    'member.add', 'member.remove', 'member.role_change',
    'message.delete_any', 'message.pin', 'message.forward', 'message.confirm_required',
    'urgent.call', 'urgent.resolve', 'escalation.override',
    'settings.update', 'audit.read', 'patient_thread.manage',
  ]),
  admin: new Set<MessengerPermission>([
    'channel.create', 'channel.edit', 'channel.delete', 'channel.archive',
    'member.add', 'member.remove', 'member.role_change',
    'message.delete_any', 'message.pin', 'message.forward', 'message.confirm_required',
    'urgent.call', 'urgent.resolve', 'escalation.override',
    'audit.read', 'patient_thread.manage',
  ]),
  manager: new Set<MessengerPermission>([
    'channel.create', 'channel.edit', 'channel.archive',
    'member.add', 'member.remove',
    'message.pin', 'message.forward', 'message.confirm_required',
    'urgent.call', 'urgent.resolve',
    'patient_thread.manage',
  ]),
  team_lead: new Set<MessengerPermission>([
    'channel.create',
    'member.add',
    'message.pin', 'message.forward', 'message.confirm_required',
    'urgent.call',
    'patient_thread.manage',
  ]),
  member: new Set<MessengerPermission>([
    'urgent.call',
  ]),
  guest: new Set<MessengerPermission>([]),
}

/**
 * 사용자가 특정 메신저 권한을 갖고 있는지 검사.
 */
export function hasMessengerPermission(
  role: MessengerRole | string | undefined,
  permission: MessengerPermission,
): boolean {
  if (!role) return false
  const set = PERMISSIONS[role as MessengerRole]
  if (!set) return false
  return set.has(permission)
}

/* ═══ 6. Utility — Member Count / Unread Count ═══ */

/**
 * 채널 멤버 수 (자주 쓰임 — 미리 계산해서 응답에 포함).
 */
export async function getChannelMemberCount(
  db: D1Database,
  channelId: string,
): Promise<number> {
  const row = await db.prepare(
    'SELECT COUNT(*) AS cnt FROM channel_members WHERE channel_id = ?'
  ).bind(channelId).first<{ cnt: number }>()
  return row?.cnt || 0
}

/**
 * 채널 + 사용자 기준 미읽음 메시지 카운트.
 * 사용자의 last_read_at 이후 작성된 활성 메시지 수.
 */
export async function getChannelUnreadCount(
  db: D1Database,
  channelId: string,
  userId: string,
): Promise<number> {
  const row = await db.prepare(`
    SELECT COUNT(*) AS cnt FROM messages m
    JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = ?
    WHERE m.channel_id = ?
      AND m.is_deleted = 0
      AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
      AND m.user_id != ?
  `).bind(userId, channelId, userId).first<{ cnt: number }>()
  return row?.cnt || 0
}

/* ═══ 7. Presence Update Helper ═══ */
/**
 * 사용자 last_seen_at 업데이트 (메신저 활동 시 자동 호출).
 * fire-and-forget — 실패해도 무시.
 */
export async function touchUserPresence(
  db: D1Database,
  userId: string,
  status?: 'online' | 'away' | 'dnd',
): Promise<void> {
  try {
    if (status) {
      await db.prepare(
        'UPDATE users SET last_seen_at = CURRENT_TIMESTAMP, presence_status = ? WHERE id = ?'
      ).bind(status, userId).run()
    } else {
      await db.prepare(
        'UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(userId).run()
    }
  } catch (e) {
    console.error('[messenger-helpers] touchUserPresence failed:', (e as Error).message)
  }
}
