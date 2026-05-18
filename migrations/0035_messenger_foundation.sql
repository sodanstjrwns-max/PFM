-- ============================================================
-- 0035 — Messenger Foundation (Patient Chat 통합 Phase A)
-- ============================================================
-- Patient Chat v5.5.5 의 핵심 메신저 스키마를 PFM 에 이식.
-- 기존 chat_* 테이블 (0020) 은 비어 있고 사용되지 않으므로 그대로 둠 (충돌 없음).
-- 새 테이블은 prefix 없이 페이션트 챗 원본 이름 그대로 사용 (channels, messages, ...).
--
-- 이번 마이그레이션에 들어가는 것:
--   1. channels          — 메신저 채널 (공지/진료실/상담실/원장실/DM)
--   2. channel_members   — 채널 멤버십
--   3. messages          — 채널 메시지 (+ confirm_required, is_urgent)
--   4. message_reads     — 읽음/확인 추적 (Slack 스타일 read bar)
--   5. message_escalations — 미응답 메시지 자동 에스컬레이션 (페이션트 퍼널 핵심)
--   6. urgent_calls      — 긴급 호출 (응급 상황)
--   7. quick_replies     — Quick Reply 템플릿
--   8. scheduled_messages — 예약 메시지
--   9. messenger_audit_logs — 메신저 감사 로그 (의료 컴플라이언스)
--   10. messenger_notification_preferences — 메신저 알림 설정 (DND/뮤트/멘션 only)
--       ※ PFM 의 기존 notification_preferences (브리핑/리콜) 와 충돌 회피 위해 prefix 분리
--   11. hospital_messenger_settings — 병원별 메신저 옵션
--
-- 환자 스레드 (patient_threads / patient_thread_events) 는 Phase C 에서
-- 기존 PFM patients 테이블과 통합하면서 도입.
-- ============================================================

-- ─── 1. channels ───
CREATE TABLE IF NOT EXISTS channels (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'public',     -- public | private | dm
  category        TEXT DEFAULT '경영',                 -- 경영 | 진료 | 상담/데스크 | 기타
  view_mode       TEXT DEFAULT 'chat',                -- chat | board
  is_default      INTEGER DEFAULT 0,
  write_restricted INTEGER DEFAULT 0,                 -- 관리자만 작성
  created_by      TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_channels_hospital ON channels(hospital_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(hospital_id, type);

-- ─── 2. channel_members ───
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id      TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  role            TEXT DEFAULT 'member',              -- admin | member
  category_label  TEXT DEFAULT '',                    -- UI 그룹핑용
  joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at    DATETIME,
  PRIMARY KEY (channel_id, user_id),
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id, channel_id);

-- ─── 3. messages ───
CREATE TABLE IF NOT EXISTS messages (
  id                 TEXT PRIMARY KEY,
  channel_id         TEXT NOT NULL,
  thread_id          TEXT,                            -- 스레드 댓글의 부모 메시지 id
  patient_thread_id  TEXT,                            -- Phase C 에서 환자 스레드 연결
  user_id            TEXT NOT NULL,
  content            TEXT DEFAULT '',
  message_type       TEXT DEFAULT 'text',             -- text | file | image | system
  is_pinned          INTEGER DEFAULT 0,
  is_deleted         INTEGER DEFAULT 0,
  deleted_at         DATETIME,
  deleted_by         TEXT,
  confirm_required   INTEGER DEFAULT 0,               -- 100% 응답 보장 메시지
  is_urgent          INTEGER DEFAULT 0,               -- 긴급 메시지
  mentions           TEXT DEFAULT '[]',               -- JSON array of user_ids
  reactions          TEXT DEFAULT '{}',               -- JSON: {"👍": ["u1","u2"]}
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- 채널별 최신 메시지 조회 (가장 자주 쓰임)
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
-- 활성 메시지만 조회 (is_deleted 필터)
CREATE INDEX IF NOT EXISTS idx_messages_channel_active ON messages(channel_id, created_at DESC) WHERE is_deleted = 0;
-- 스레드 댓글 조회
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at ASC) WHERE thread_id IS NOT NULL;
-- 환자 스레드 연결 메시지 (Phase C)
CREATE INDEX IF NOT EXISTS idx_messages_patient_thread ON messages(patient_thread_id) WHERE patient_thread_id IS NOT NULL;
-- 사용자별 메시지
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
-- 미확인 confirm 메시지 (에스컬레이션 후보)
CREATE INDEX IF NOT EXISTS idx_messages_confirm_pending ON messages(confirm_required, is_deleted, created_at)
  WHERE confirm_required = 1 AND is_deleted = 0;

-- ─── 4. message_reads ───
CREATE TABLE IF NOT EXISTS message_reads (
  message_id    TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  read_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at  DATETIME,                            -- confirm_required 메시지의 명시적 확인 시각
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);

-- ─── 5. message_escalations (페이션트 퍼널 핵심) ───
CREATE TABLE IF NOT EXISTS message_escalations (
  id              TEXT PRIMARY KEY,
  message_id      TEXT NOT NULL,
  hospital_id     TEXT NOT NULL,
  level           INTEGER NOT NULL,                   -- 1=reminder(10min) | 2=manager(20min) | 3=owner(40min)
  triggered_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  notified_user_ids TEXT DEFAULT '[]',                -- JSON array
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_esc_msg ON message_escalations(message_id, level);
CREATE INDEX IF NOT EXISTS idx_esc_hospital ON message_escalations(hospital_id, triggered_at DESC);

-- ─── 6. urgent_calls (응급 호출) ───
CREATE TABLE IF NOT EXISTS urgent_calls (
  id                TEXT PRIMARY KEY,
  hospital_id       TEXT NOT NULL,
  caller_id         TEXT NOT NULL,
  target_type       TEXT NOT NULL,                    -- user | channel | all
  target_id         TEXT,                             -- target_type=user/channel 일 때
  message           TEXT NOT NULL,
  call_type         TEXT DEFAULT 'urgent',            -- urgent | emergency | code_blue
  status            TEXT DEFAULT 'active',            -- active | acknowledged | resolved
  acknowledged_by   TEXT DEFAULT '[]',                -- JSON array of user_ids
  resolved_at       DATETIME,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_urgent_hospital_status ON urgent_calls(hospital_id, status, created_at DESC);

-- ─── 7. quick_replies (자주 쓰는 답변 템플릿) ───
CREATE TABLE IF NOT EXISTS quick_replies (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL,
  user_id       TEXT,                                 -- NULL = 병원 공유, 값 있으면 개인 템플릿
  shortcut      TEXT NOT NULL,                        -- '/call' '/done' 같은 단축어
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,                        -- {patient_name} 같은 placeholder 지원
  category      TEXT DEFAULT 'general',               -- general | reminder | medical | admin
  use_count     INTEGER DEFAULT 0,
  created_by    TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_qr_hospital ON quick_replies(hospital_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_shortcut ON quick_replies(hospital_id, COALESCE(user_id, ''), shortcut);

-- ─── 8. scheduled_messages (예약 발송) ───
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id                  TEXT PRIMARY KEY,
  hospital_id         TEXT NOT NULL,
  channel_id          TEXT NOT NULL,
  user_id             TEXT NOT NULL,
  content             TEXT NOT NULL,
  message_type        TEXT DEFAULT 'text',
  thread_id           TEXT,
  patient_thread_id   TEXT,
  mentions            TEXT DEFAULT '[]',
  confirm_required    INTEGER DEFAULT 0,
  is_urgent           INTEGER DEFAULT 0,
  scheduled_at        DATETIME NOT NULL,
  status              TEXT DEFAULT 'pending',         -- pending | sent | cancelled | failed
  sent_at             DATETIME,
  cancelled_at        DATETIME,
  error_message       TEXT,
  repeat_type         TEXT,                           -- NULL | daily | weekly | monthly
  repeat_until        DATETIME,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_messages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_pending ON scheduled_messages(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_channel ON scheduled_messages(channel_id, scheduled_at);

-- ─── 9. messenger_audit_logs ───
-- 기존 PFM 에 audit_logs 가 다른 용도로 있을 수 있어서 prefix 분리.
-- 의료 컴플라이언스용 — 모든 민감 작업 자동 기록.
CREATE TABLE IF NOT EXISTS messenger_audit_logs (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL,
  actor_id      TEXT NOT NULL,
  action        TEXT NOT NULL,                        -- message.delete | channel.create | escalation.trigger ...
  target_type   TEXT,                                 -- message | channel | user | patient_thread
  target_id     TEXT,
  metadata      TEXT DEFAULT '{}',                    -- JSON
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_maudit_hospital_time ON messenger_audit_logs(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maudit_action_time ON messenger_audit_logs(hospital_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maudit_actor_time ON messenger_audit_logs(hospital_id, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maudit_target ON messenger_audit_logs(target_type, target_id);

-- ─── 10. messenger_notification_preferences ───
-- 주의: PFM 에 이미 notification_preferences (0024, 데일리 브리핑/리콜용) 가 있음.
-- 충돌 회피를 위해 메신저용은 messenger_ prefix.
CREATE TABLE IF NOT EXISTS messenger_notification_preferences (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  hospital_id           TEXT NOT NULL,
  channel_id            TEXT DEFAULT '__global__',    -- '__global__' = 전역 설정
  muted                 INTEGER DEFAULT 0,
  muted_until           DATETIME,
  dnd_enabled           INTEGER DEFAULT 0,
  dnd_start_time        TEXT,                         -- '22:00'
  dnd_end_time          TEXT,                         -- '07:00'
  notify_mentions_only  INTEGER DEFAULT 0,
  sound_enabled         INTEGER DEFAULT 1,
  desktop_enabled       INTEGER DEFAULT 1,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messenger_notif_prefs_user ON messenger_notification_preferences(user_id, muted);

-- ─── 11. hospital_messenger_settings ───
-- 병원별 메신저 동작 옵션
CREATE TABLE IF NOT EXISTS hospital_messenger_settings (
  hospital_id                   TEXT PRIMARY KEY,
  mask_patient_names            INTEGER DEFAULT 0,    -- 개인정보 마스킹 모드
  enforce_confirm_escalation    INTEGER DEFAULT 1,    -- 미확인 메시지 자동 에스컬레이션
  undo_window_seconds           INTEGER DEFAULT 5,    -- 메시지 발송 후 취소 가능 시간
  show_sender_roles             INTEGER DEFAULT 1,    -- 메시지에 발신자 직책 표시
  daily_report_enabled          INTEGER DEFAULT 1,    -- 일일 리포트 자동 생성
  daily_report_recipient_roles  TEXT DEFAULT '["admin","manager"]',
  temperature_stages_enabled    INTEGER DEFAULT 1,    -- 환자 온도 UI 사용 (Phase C 에서 활용)
  escalation_minutes_l1         INTEGER DEFAULT 10,   -- L1 리마인더 (기존 페이션트 챗 기본)
  escalation_minutes_l2         INTEGER DEFAULT 20,   -- L2 매니저 알림
  escalation_minutes_l3         INTEGER DEFAULT 40,   -- L3 원장 알림
  created_at                    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 기존 병원에 기본 설정 자동 시드
INSERT OR IGNORE INTO hospital_messenger_settings (hospital_id)
SELECT id FROM hospitals;

-- ─── ANALYZE ───
ANALYZE;
