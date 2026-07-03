-- ════════════════════════════════════════════════════════════════
-- v5.9.0 판매 준비 패키지: 구독/빌링 테이블
-- 플랜: starter(19.9만) / growth(39.9만) / enterprise(협의) / founding(파운딩 멤버)
-- 상태: trial(체험) / active(구독중) / past_due(결제실패) / canceled(해지)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  TEXT PRIMARY KEY,
  hospital_id         TEXT NOT NULL UNIQUE REFERENCES hospitals(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL DEFAULT 'starter' CHECK(plan IN ('starter','growth','enterprise','founding')),
  status              TEXT NOT NULL DEFAULT 'trial' CHECK(status IN ('trial','active','past_due','canceled')),
  trial_ends_at       DATETIME,                -- 체험 종료일 (가입 +14일)
  current_period_end  DATETIME,                -- 현재 결제 주기 종료일
  monthly_price       INTEGER NOT NULL DEFAULT 0, -- 월 요금 (원)
  -- 토스페이먼츠 빌링
  toss_customer_key   TEXT,                    -- 병원별 고유 customerKey
  toss_billing_key    TEXT,                    -- 발급된 billingKey (자동결제용)
  card_summary        TEXT,                    -- 표시용: "신한 **** 1234"
  canceled_at         DATETIME,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_hospital ON subscriptions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 결제/빌링 이벤트 이력 (감사 및 CS 대응용)
CREATE TABLE IF NOT EXISTS billing_events (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,   -- trial_start | billing_key_issued | payment_success | payment_failed | plan_change | cancel
  plan          TEXT,
  amount        INTEGER,
  payment_key   TEXT,            -- 토스 paymentKey
  order_id      TEXT,
  detail        TEXT DEFAULT '{}', -- JSON
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_billing_events_hospital ON billing_events(hospital_id, created_at DESC);

-- 기존 병원 백필: 파운딩 멤버 (무료 active — 기존 사용자 무중단 보장)
INSERT OR IGNORE INTO subscriptions (id, hospital_id, plan, status, monthly_price, trial_ends_at, current_period_end)
SELECT
  lower(hex(randomblob(16))),
  h.id,
  'founding',
  'active',
  0,
  NULL,
  '2099-12-31 23:59:59'
FROM hospitals h
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.hospital_id = h.id);
