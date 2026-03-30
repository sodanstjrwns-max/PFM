-- Temp Staff table for daily temporary/part-time workers
CREATE TABLE IF NOT EXISTS temp_staff (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT DEFAULT '알바',
  team TEXT DEFAULT '',
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_temp_staff_hospital_date ON temp_staff(hospital_id, date);
