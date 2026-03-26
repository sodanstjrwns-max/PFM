-- Patient Funnel Manager - Initial Schema
-- 병원 관리 플랫폼 DB

CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  plan TEXT DEFAULT 'basic',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  avatar_url TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image',
  thumbnail_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  price_min REAL,
  price_max REAL,
  description TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  patient_age TEXT DEFAULT '',
  patient_gender TEXT DEFAULT '',
  treatment_period TEXT DEFAULT '',
  created_by TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS case_images (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'during',
  caption TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_categories_module ON categories(module);
CREATE INDEX IF NOT EXISTS idx_materials_hospital ON materials(hospital_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_pricing_hospital ON pricing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cases_hospital ON cases(hospital_id);
CREATE INDEX IF NOT EXISTS idx_case_images_case ON case_images(case_id);
