// ============================================================
// System Audit Trail — 시스템 전역 감사 로그
// ─────────────────────────────────────────────────────────────
// 권한 변경 · 계정 상태 변경 · 데이터 삭제 등 민감 작업을
// audit_logs 테이블에 기록. 실패해도 메인 플로우를 절대 중단
// 시키지 않음 (fire-and-forget). messenger-audit.ts 와 동일 철학.
// ============================================================

export type AuditAction =
  // 인증
  | 'auth.login' | 'auth.join' | 'auth.register' | 'auth.logout'
  // 인사/권한 (가장 민감)
  | 'hr.role_change' | 'hr.status_change' | 'hr.staff_update'
  | 'hr.invite_create' | 'hr.invite_revoke'
  // 환자 데이터
  | 'patient.delete' | 'patient.status_change'
  | 'funnel.delete' | 'referral.delete' | 'review.delete'
  // 연차
  | 'leave.approve' | 'leave.reject' | 'leave.cancel'
  // 관리자
  | 'admin.export'

export interface AuditEntry {
  hospitalId: string
  actorId?: string
  actorName?: string
  actorRole?: string
  action: AuditAction
  targetType?: string
  targetId?: string
  summary?: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

/** 감사 로그 기록 — 실패해도 throw 하지 않음 */
export async function writeAudit(db: D1Database, entry: AuditEntry): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO audit_logs
        (id, hospital_id, actor_id, actor_name, actor_role, action, target_type, target_id, summary, metadata, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `aud_${crypto.randomUUID()}`,
      entry.hospitalId,
      entry.actorId || null,
      entry.actorName || null,
      entry.actorRole || null,
      entry.action,
      entry.targetType || null,
      entry.targetId || null,
      entry.summary || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ip || null,
      entry.userAgent || null,
    ).run()
  } catch (e) {
    console.error('[audit] write failed:', (e as Error).message)
  }
}

/** Hono context 에서 actor/ip/ua 를 뽑아 간편 기록 */
export function auditFromCtx(
  c: any,
  action: AuditAction,
  fields: Omit<AuditEntry, 'hospitalId' | 'actorId' | 'actorName' | 'actorRole' | 'action' | 'ip' | 'userAgent'> = {},
): Promise<void> {
  const user = c.get('user') || {}
  return writeAudit(c.env.DB, {
    hospitalId: user.hospitalId || 'unknown',
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action,
    ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    userAgent: (c.req.header('user-agent') || 'unknown').slice(0, 300),
    ...fields,
  })
}
