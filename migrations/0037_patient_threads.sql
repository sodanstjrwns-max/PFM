-- =====================================================
-- 0037_patient_threads.sql
-- Phase C — 환자 통합 (Patient Threads)
-- ─────────────────────────────────────────────────────
-- PFM 의 patients 테이블과 메신저를 연결하는 다리.
--   1. patient_threads        : 환자 한 명 = 스레드 한 줄 (담당자 묶음 + 온도)
--   2. patient_thread_events  : 스레드 안의 비-메시지 이벤트 (퍼널 변경, 진료, 결제 등)
-- 메시지 본문은 0035 의 messages.patient_thread_id 로 이미 연결돼 있음.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. patient_threads
--    환자 1명당 한 줄. PFM patients(id) 와 1:1 매핑.
--    "환자 카드 + 채팅" 의 채팅 측 메타데이터.
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_threads (
  id              TEXT PRIMARY KEY,                  -- 'pt_<uuid>'
  hospital_id     TEXT NOT NULL,
  patient_id      TEXT NOT NULL,                     -- PFM patients.id (TEXT PK, 'pt-xxxx')
  channel_id      TEXT,                              -- 묶을 채널 (보통 🦷진료 또는 💬상담 채널)

  -- 환자 상태
  temperature     TEXT NOT NULL DEFAULT 'cold'
                  CHECK(temperature IN ('cold','warm','hot','patient','advocate')),
  funnel_stage    INTEGER NOT NULL DEFAULT 1
                  CHECK(funnel_stage BETWEEN 1 AND 10),

  -- 담당자 (PFM 의 assigned_counselor / primary_doctor / desk_staff 와 별개로
  --        메신저 안에서의 책임자를 따로 묶음. users.id 참조)
  primary_owner_id    TEXT,                          -- 메인 담당 (실장/원장)
  counselor_id        TEXT,                          -- 상담 담당
  doctor_id           TEXT,                          -- 진료 담당
  desk_id             TEXT,                          -- 데스크 담당

  -- 메타
  title           TEXT DEFAULT '',                   -- 표시용 (보통 "환자명 - 차트번호")
  summary         TEXT DEFAULT '',                   -- AI 요약 / 메모 (Phase E)
  tags            TEXT DEFAULT '[]',                 -- JSON array
  priority        TEXT DEFAULT 'normal'
                  CHECK(priority IN ('low','normal','high','urgent')),

  -- 상태
  is_archived     INTEGER DEFAULT 0,
  archived_at     DATETIME,
  archived_by     TEXT,

  -- 통계 (캐시 — 트리거 없이 라우트에서 갱신)
  message_count   INTEGER DEFAULT 0,
  event_count     INTEGER DEFAULT 0,
  last_message_at DATETIME,
  last_event_at   DATETIME,

  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      TEXT,

  -- 1 환자 = 1 스레드 (병원 내 unique)
  UNIQUE(hospital_id, patient_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_hospital_temp ON patient_threads(hospital_id, temperature, is_archived);
CREATE INDEX IF NOT EXISTS idx_pt_hospital_stage ON patient_threads(hospital_id, funnel_stage, is_archived);
CREATE INDEX IF NOT EXISTS idx_pt_hospital_priority ON patient_threads(hospital_id, priority, is_archived);
CREATE INDEX IF NOT EXISTS idx_pt_patient ON patient_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_pt_owner ON patient_threads(primary_owner_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_pt_last_message ON patient_threads(hospital_id, last_message_at DESC) WHERE is_archived = 0;

-- ─────────────────────────────────────────────────────
-- 2. patient_thread_events
--    스레드 안의 비-메시지 사건들.
--    "오늘 임플란트 시술 완료", "결제 500만원", "퍼널 5→6 이동" 같은 시스템 이벤트.
--    chat 메시지(messages) 와 함께 타임라인에서 인터리브 렌더링.
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_thread_events (
  id             TEXT PRIMARY KEY,                   -- 'pte_<uuid>'
  hospital_id    TEXT NOT NULL,
  thread_id      TEXT NOT NULL,                      -- patient_threads.id
  patient_id     TEXT NOT NULL,                      -- 비정규화 (조회 편의)

  event_type     TEXT NOT NULL,
                 -- 'temperature_change' | 'funnel_change' | 'appointment'
                 -- 'treatment' | 'payment' | 'note' | 'owner_change'
                 -- 'consult_done' | 'recall' | 'kakao_sent' | 'system'

  -- 이벤트 데이터 (JSON)
  -- temperature_change: { from: 'warm', to: 'hot' }
  -- funnel_change:      { from: 5, to: 6 }
  -- payment:            { amount: 5000000, method: 'card' }
  -- treatment:          { treatment_area: '임플란트', chair: 'A2', duration_min: 60 }
  -- note:               { content: '...' }
  payload        TEXT DEFAULT '{}',

  -- 액터 (시스템 이벤트면 null)
  actor_id       TEXT,

  -- 표시
  icon           TEXT DEFAULT '',                    -- 이모지 (선택)
  title          TEXT DEFAULT '',                    -- 한 줄 표시
  body           TEXT DEFAULT '',                    -- 본문 (선택)

  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (thread_id) REFERENCES patient_threads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pte_thread_time ON patient_thread_events(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pte_hospital_type ON patient_thread_events(hospital_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pte_patient ON patient_thread_events(patient_id, created_at DESC);
