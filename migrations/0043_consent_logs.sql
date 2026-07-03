-- ════════════════════════════════════════════════════════════════
-- v5.9.1 런칭 준비: 약관/개인정보 동의 기록 (개인정보보호법 증빙용)
-- 가입 시점의 동의 사실을 영구 보존 — CS/법적 분쟁 대응
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consent_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  hospital_id   TEXT NOT NULL,
  doc_type      TEXT NOT NULL,   -- terms | privacy
  doc_version   TEXT NOT NULL DEFAULT 'v1-2026-07',
  ip            TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_consent_logs_user ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_hospital ON consent_logs(hospital_id);
