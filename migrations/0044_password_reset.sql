-- ════════════════════════════════════════════════════════════════
-- v5.10.0 런칭 마감 패키지: 비밀번호 재설정 토큰
-- 이메일 발송(Resend) 기반 셀프 재설정 — 토큰 1회용 + 30분 만료
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  token_hash  TEXT NOT NULL,           -- SHA-256(token) — 원문 저장 금지
  expires_at  DATETIME NOT NULL,       -- 발급 +30분
  used_at     DATETIME,                -- 사용 시각 (1회용)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_hash ON password_reset_tokens(token_hash);
