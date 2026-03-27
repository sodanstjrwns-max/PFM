-- ═══ 진료 수가표 ═══
CREATE TABLE IF NOT EXISTS fee_categories (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT DEFAULT '🦷',
  color           TEXT DEFAULT '#3b82f6',
  sort_order      INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fee_cat_hospital ON fee_categories(hospital_id);

CREATE TABLE IF NOT EXISTS fee_items (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  category_id     TEXT NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  base_price      INTEGER DEFAULT 0,
  discount_price  INTEGER,
  unit            TEXT DEFAULT '개',
  duration_min    INTEGER DEFAULT 30,
  description     TEXT DEFAULT '',
  is_active       INTEGER DEFAULT 1,
  sort_order      INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fee_items_hospital ON fee_items(hospital_id, category_id);

-- ═══ 환자 퍼널 (Patient Funnel 10단계) ═══
CREATE TABLE IF NOT EXISTS patient_funnel (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_name    TEXT NOT NULL,
  phone           TEXT DEFAULT '',
  source          TEXT DEFAULT '',
  current_stage   TEXT NOT NULL DEFAULT 'awareness' CHECK(current_stage IN ('awareness','interest','appointment','visit','waiting','diagnosis','consultation','treatment','management','referral')),
  treatment_type  TEXT DEFAULT '',
  assigned_doctor TEXT DEFAULT '',
  estimated_amount INTEGER DEFAULT 0,
  agreed_amount   INTEGER DEFAULT 0,
  paid_amount     INTEGER DEFAULT 0,
  notes           TEXT DEFAULT '',
  stage_history   TEXT DEFAULT '[]',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_funnel_hospital ON patient_funnel(hospital_id, current_stage);
CREATE INDEX IF NOT EXISTS idx_funnel_date ON patient_funnel(hospital_id, created_at);
