-- 초대 시스템 v2: 다인용 코드, 취소, 메모, 사용 이력 추적

-- staff_invites 확장
ALTER TABLE staff_invites ADD COLUMN max_uses INTEGER DEFAULT 1;       -- 코드 최대 사용 횟수 (1 = 단일 사용, N = 다인용)
ALTER TABLE staff_invites ADD COLUMN use_count INTEGER DEFAULT 0;      -- 현재 사용된 횟수
ALTER TABLE staff_invites ADD COLUMN status TEXT DEFAULT 'active';     -- active / revoked / used_up
ALTER TABLE staff_invites ADD COLUMN memo TEXT DEFAULT '';             -- 관리자 메모 (예: "2026년 1분기 신입")
ALTER TABLE staff_invites ADD COLUMN revoked_at DATETIME;
ALTER TABLE staff_invites ADD COLUMN revoked_by TEXT REFERENCES users(id);

-- 다인용 코드 사용 이력 (1코드 N명 가입 추적)
CREATE TABLE IF NOT EXISTS staff_invite_uses (
  id          TEXT PRIMARY KEY,
  invite_id   TEXT NOT NULL REFERENCES staff_invites(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id),
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  used_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invite_uses_invite ON staff_invite_uses(invite_id);
CREATE INDEX IF NOT EXISTS idx_invite_uses_hospital ON staff_invite_uses(hospital_id);

-- 기존 used_by가 있는 행은 use_count=1 / status='used_up'로 마이그레이션
UPDATE staff_invites SET use_count = 1, status = 'used_up' WHERE used_by IS NOT NULL;
