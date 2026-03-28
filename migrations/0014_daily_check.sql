-- 예약 관리 (예약취소, 덴트웹취소, 예약이행율)
CREATE TABLE IF NOT EXISTS reservation_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  day_of_week TEXT DEFAULT '',
  cancel_count INTEGER DEFAULT 0,
  dentweb_cancel_count INTEGER DEFAULT 0,
  fulfillment_rate REAL DEFAULT 0,
  memo TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_reservation_hospital ON reservation_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_reservation_date ON reservation_records(hospital_id, record_date);

-- 대기시간 관리
CREATE TABLE IF NOT EXISTS wait_time_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  day_of_week TEXT DEFAULT '',
  total_wait_minutes REAL DEFAULT 0,
  avg_wait_minutes REAL DEFAULT 0,
  memo TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_waittime_hospital ON wait_time_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_waittime_date ON wait_time_records(hospital_id, record_date);

-- 주차권 관리
CREATE TABLE IF NOT EXISTS parking_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  day_of_week TEXT DEFAULT '',
  ticket_count INTEGER DEFAULT 0,
  memo TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_parking_hospital ON parking_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_parking_date ON parking_records(hospital_id, record_date);
