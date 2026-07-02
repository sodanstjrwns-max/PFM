-- ============================================================
-- 0041: 시스템 전역 감사 로그 (Audit Trail)
-- messenger_audit_logs 패턴을 시스템 전역으로 확장.
-- 권한 변경 · 계정 상태 변경 · 데이터 삭제 등 민감 작업 추적.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,          -- 'hr.role_change' | 'patient.delete' | 'auth.login' ...
  target_type TEXT,              -- 'user' | 'patient' | 'invite' | 'leave' | ...
  target_id TEXT,
  summary TEXT,                  -- 사람이 읽는 한 줄 요약
  metadata TEXT,                 -- JSON (before/after 등)
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_hospital_time ON audit_logs(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(hospital_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(hospital_id, actor_id);
