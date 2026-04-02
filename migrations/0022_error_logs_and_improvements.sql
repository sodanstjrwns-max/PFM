-- ═══ Error Logs Table (#19) ═══
CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT,
  user_id TEXT,
  level TEXT DEFAULT 'error' CHECK(level IN ('error','warn','info')),
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  method TEXT,
  user_agent TEXT,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_error_logs_hospital ON error_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);

-- ═══ Data Export Tracking (#18) ═══
CREATE TABLE IF NOT EXISTS export_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  table_name TEXT,
  row_count INTEGER DEFAULT 0,
  format TEXT DEFAULT 'csv',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_export_logs_hospital ON export_logs(hospital_id);
