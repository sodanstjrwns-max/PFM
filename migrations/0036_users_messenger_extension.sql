-- ============================================================
-- 0036 — Users 테이블 메신저 확장 (Patient Chat 통합 Phase A)
-- ============================================================
-- PFM users 테이블에 메신저/2FA 관련 컬럼 추가.
-- PFM 의 기존 role CHECK 제약(admin|manager|staff) 은 그대로 두고,
-- 페이션트 챗의 다양한 role(owner/team_lead/member 등) 은 messenger_role 컬럼으로 보조.
--
-- 추가되는 컬럼:
--   1. totp_secret         — TOTP 2FA 시크릿 (base32)
--   2. totp_enabled        — 2FA 활성화 여부
--   3. totp_backup_codes   — 1회용 백업 코드 (JSON array)
--   4. messenger_role      — 페이션트 챗 호환 role (owner|admin|manager|team_lead|member|guest)
--   5. department          — 부서 (진료실-1, 상담실 등)
--   6. presence_status     — 온라인 상태 (online|away|dnd|offline)
--   7. presence_location   — 위치 표시 ("진료실-1", "점심시간")
--   8. last_seen_at        — 마지막 활동 시각
-- ============================================================

-- TOTP 2FA
ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_backup_codes TEXT DEFAULT NULL;

-- 메신저 role (페이션트 챗 호환)
-- PFM role 매핑 기본값:
--   admin   → owner
--   manager → manager
--   staff   → member
-- (라우트 핸들러에서 INSERT/UPDATE 시 자동 매핑)
ALTER TABLE users ADD COLUMN messenger_role TEXT DEFAULT 'member';

-- 부서 (PFM 의 team 과 별개로 메신저용)
ALTER TABLE users ADD COLUMN department TEXT DEFAULT '';

-- presence (실시간 상태)
ALTER TABLE users ADD COLUMN presence_status TEXT DEFAULT 'offline';   -- online|away|dnd|offline
ALTER TABLE users ADD COLUMN presence_location TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN last_seen_at DATETIME;

-- 기존 사용자 메신저 role 자동 매핑
UPDATE users SET messenger_role = 'owner'   WHERE role = 'admin'   AND messenger_role = 'member';
UPDATE users SET messenger_role = 'manager' WHERE role = 'manager' AND messenger_role = 'member';
-- staff 는 이미 기본값 'member' 이므로 그대로

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_messenger_role ON users(hospital_id, messenger_role);
CREATE INDEX IF NOT EXISTS idx_users_presence ON users(hospital_id, presence_status, last_seen_at DESC);

-- ============================================================
-- 세션 추적 (JWT refresh + revocation)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  hospital_id       TEXT NOT NULL,
  device_name       TEXT,
  device_type       TEXT,                             -- desktop | mobile | tablet
  browser           TEXT,
  os                TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  last_active_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at        DATETIME,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at        DATETIME,
  is_active         INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(last_active_at DESC) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ============================================================
-- Trusted devices (2FA remember-me)
-- ============================================================
CREATE TABLE IF NOT EXISTS trusted_devices (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  hospital_id   TEXT NOT NULL,
  device_hash   TEXT NOT NULL,
  device_label  TEXT,
  user_agent    TEXT,
  last_ip       TEXT,
  trusted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  revoked_at    DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_hash ON trusted_devices(device_hash);

ANALYZE;
