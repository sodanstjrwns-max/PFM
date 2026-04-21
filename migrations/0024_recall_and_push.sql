-- Migration 0024: Recall Automation + Push Notifications
-- v3.2 "Retention Edition"
-- 
-- 환자 리콜 자동화 시스템
-- - recall_rules: 병원별 리콜 규칙 (치료종류 × 경과일 × 채널)
-- - recall_tasks: 오늘 해야 할 리콜 작업 큐 (매일 자동 생성)
-- - push_subscriptions: Web Push 구독 정보

-- 1. 리콜 규칙 (병원별 룰북)
CREATE TABLE IF NOT EXISTS recall_rules (
  id             TEXT PRIMARY KEY,
  hospital_id    TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,                    -- "스케일링 6개월 리콜"
  trigger_type   TEXT NOT NULL DEFAULT 'last_visit', -- last_visit | treatment | no_show | consult_lost
  treatment_keyword TEXT DEFAULT '',               -- 매칭 키워드 (스케일링, 임플란트 등)
  days_after     INTEGER NOT NULL DEFAULT 180,     -- 경과일
  channel        TEXT DEFAULT 'call',              -- call | sms | kakao | all
  script_template TEXT DEFAULT '',                 -- 스크립트 템플릿
  priority       INTEGER DEFAULT 3,                -- 1(최고)~5(최저)
  is_active      INTEGER DEFAULT 1,
  created_by     TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recall_rules_hospital ON recall_rules(hospital_id, is_active);

-- 2. 리콜 태스크 (실행 큐)
CREATE TABLE IF NOT EXISTS recall_tasks (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule_id         TEXT REFERENCES recall_rules(id) ON DELETE SET NULL,
  patient_id      TEXT,                            -- patients.id (또는 chart_number 매칭)
  patient_name    TEXT NOT NULL,
  phone           TEXT DEFAULT '',
  chart_number    TEXT DEFAULT '',
  
  -- 리콜 사유
  reason          TEXT DEFAULT '',                 -- "마지막 방문 6개월 경과"
  last_visit_date TEXT DEFAULT '',
  days_elapsed    INTEGER DEFAULT 0,
  treatment_area  TEXT DEFAULT '',
  
  -- 추천 채널 & 스크립트
  channel         TEXT DEFAULT 'call',
  script          TEXT DEFAULT '',
  priority        INTEGER DEFAULT 3,
  
  -- 진행 상태
  status          TEXT DEFAULT 'pending',          -- pending | done | skipped | reserved | failed
  assigned_to     TEXT DEFAULT '',                 -- 담당자 이름
  result_note     TEXT DEFAULT '',                 -- 결과 메모 (예약확정, 연결안됨 등)
  contacted_at    DATETIME,
  
  -- 예약 연결
  reservation_made INTEGER DEFAULT 0,
  reservation_date TEXT DEFAULT '',
  
  -- 자동 생성 날짜 (중복 방지용)
  scheduled_date  TEXT NOT NULL,                   -- YYYY-MM-DD
  
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recall_tasks_hospital_status 
  ON recall_tasks(hospital_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_recall_tasks_patient 
  ON recall_tasks(hospital_id, patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recall_tasks_dedupe
  ON recall_tasks(hospital_id, patient_name, phone, rule_id, scheduled_date);

-- 3. Web Push 구독 (브라우저 알림용)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh_key      TEXT NOT NULL,
  auth_key        TEXT NOT NULL,
  user_agent      TEXT DEFAULT '',
  enabled         INTEGER DEFAULT 1,
  last_success_at DATETIME,
  last_error      TEXT DEFAULT '',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_user_endpoint 
  ON push_subscriptions(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_push_sub_hospital 
  ON push_subscriptions(hospital_id, enabled);

-- 4. 알림 설정 (개인 선호)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_briefing  INTEGER DEFAULT 1,     -- 일일 브리핑 알림
  briefing_hour   INTEGER DEFAULT 9,     -- 알림 시간 (0-23)
  recall_alerts   INTEGER DEFAULT 1,     -- 리콜 할 일 알림
  complaint_alerts INTEGER DEFAULT 1,    -- 실시간 컴플레인 알림
  chat_alerts     INTEGER DEFAULT 1,     -- 채팅 알림
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 디폴트 리콜 룰 3종 시드 (기존 병원에 자동 추가)
-- (앱에서 온보딩 시 자동 삽입하도록 별도 처리)
