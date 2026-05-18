// ============================================================
// Messenger Audit Log — 의료 컴플라이언스용 감사 로그
// Patient Chat 통합 Phase A
// ─────────────────────────────────────────────────────────────
// 모든 민감한 메신저 액션은 messenger_audit_logs 테이블에 자동 기록.
// 실패해도 메인 플로우를 절대 중단시키지 않음 (비동기 fire-and-forget).
// ============================================================

export type MessengerAuditAction =
  // 메시지
  | 'message.create' | 'message.edit' | 'message.delete' | 'message.undo'
  | 'message.pin' | 'message.unpin' | 'message.forward' | 'message.confirm'
  | 'message.read' | 'message.react' | 'message.unreact'
  // 채널
  | 'channel.create' | 'channel.update' | 'channel.archive' | 'channel.delete'
  | 'channel.member_add' | 'channel.member_remove' | 'channel.member_role_change'
  // 환자 스레드 (Phase C 예약)
  | 'patient_thread.create' | 'patient_thread.temperature_change'
  | 'patient_thread.event_add' | 'patient_thread.archive'
  // 긴급/에스컬레이션
  | 'urgent.call' | 'urgent.ack' | 'urgent.resolve'
  | 'escalation.trigger' | 'escalation.l1' | 'escalation.l2' | 'escalation.l3'
  // 파일
  | 'file.upload' | 'file.download' | 'file.delete'
  // Quick Reply / Scheduled
  | 'quick_reply.create' | 'quick_reply.update' | 'quick_reply.delete'
  | 'scheduled.create' | 'scheduled.cancel' | 'scheduled.send'
  // 보안
  | 'auth.totp_setup' | 'auth.totp_enable' | 'auth.totp_disable' | 'auth.totp_fail'
  | 'session.create' | 'session.revoke' | 'session.revoke_all'
  // 설정
  | 'settings.update' | 'notification.pref_update'

export interface MessengerAuditEntry {
  hospitalId: string
  actorId: string
  action: MessengerAuditAction
  targetType?: string                  // 'message' | 'channel' | 'user' | 'patient_thread' | 'file'
  targetId?: string
  metadata?: Record<string, any>       // JSON 으로 저장
  ip?: string
  userAgent?: string
}

/**
 * 감사 로그 기록 (실패해도 throw 하지 않음).
 * 보통은 await 없이 fire-and-forget 으로 호출하지만,
 * 정말 중요한 감사는 await 으로 받아도 됨.
 */
export async function writeMessengerAudit(
  db: D1Database,
  entry: MessengerAuditEntry,
): Promise<void> {
  try {
    const id = `mal_${crypto.randomUUID()}`
    await db.prepare(`
      INSERT INTO messenger_audit_logs
        (id, hospital_id, actor_id, action, target_type, target_id, metadata, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      id,
      entry.hospitalId,
      entry.actorId,
      entry.action,
      entry.targetType || null,
      entry.targetId || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ip || null,
      entry.userAgent || null,
    ).run()
  } catch (e) {
    // 감사 로그 실패는 절대 메인 플로우를 막지 않는다.
    console.error('[messenger-audit] write failed:', (e as Error).message)
  }
}

/**
 * Hono context 에서 클라이언트 IP 추출.
 * Cloudflare 뒤에서는 cf-connecting-ip 가 가장 신뢰성 있음.
 */
export function getClientIP(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export function getUserAgent(c: any): string {
  return c.req.header('user-agent') || 'unknown'
}
