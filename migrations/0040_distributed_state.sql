-- ============================================================
-- 0040: 분산환경(D1) 기반 상태 관리
-- ─────────────────────────────────────────────────────────────
-- Workers isolate 는 수시로 재생성되고 콜로마다 별개이므로
-- in-memory Map 기반 스로틀/레이트리밋은 신뢰할 수 없음.
--   1. system_throttle    — 에스컬레이션 스캔 등 주기 작업의 cross-isolate 게이트
--   2. login_rate_limits  — 로그인 브루트포스 방어의 영속 계층
-- ============================================================

-- ─── 1. system_throttle ───
-- key 예: 'esc_scan:<hospital_id>', 'sched_dispatch:global'
CREATE TABLE IF NOT EXISTS system_throttle (
  key          TEXT PRIMARY KEY,
  last_run_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── 2. login_rate_limits ───
CREATE TABLE IF NOT EXISTS login_rate_limits (
  ip                TEXT PRIMARY KEY,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  first_attempt_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until      DATETIME
);

-- 오래된 항목 정리를 빠르게 하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_login_rate_first ON login_rate_limits(first_attempt_at);
