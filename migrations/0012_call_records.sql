-- Call records table (shared for inbound/outbound)
CREATE TABLE IF NOT EXISTS call_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'inbound',  -- 'inbound' or 'outbound'
  call_date TEXT NOT NULL,                     -- YYYY-MM-DD
  patient_name TEXT,
  phone TEXT,
  patient_type TEXT DEFAULT '',                -- 'new' or 'existing'
  staff_name TEXT DEFAULT '',                  -- 상담원/응대자
  treatment_interest TEXT DEFAULT '',          -- 관심 진료
  recognition_path TEXT DEFAULT '',            -- 인지경로
  call_purpose TEXT DEFAULT '',                -- 통화 목적 (아웃바운드용)
  reservation_status TEXT DEFAULT '',          -- 예약/미예약/부재중
  reservation_date TEXT DEFAULT '',            -- 예약일
  reservation_fulfilled TEXT DEFAULT '',       -- 예약이행여부
  follow_up TEXT DEFAULT '',                   -- 예약미이행 f/u
  comment TEXT DEFAULT '',                     -- 코멘트/메모
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_call_records_hospital ON call_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_call_records_type ON call_records(call_type);
CREATE INDEX IF NOT EXISTS idx_call_records_date ON call_records(call_date);
CREATE INDEX IF NOT EXISTS idx_call_records_staff ON call_records(staff_name);
CREATE INDEX IF NOT EXISTS idx_call_records_patient ON call_records(patient_name);
