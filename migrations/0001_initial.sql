-- Patient Funnel Manager - Initial Schema

-- 병원 테이블
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',  -- admin, manager, staff
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- 모듈 카테고리 (설명자료, 비용안내, 케이스 등 공용)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,            -- NULL이면 글로벌(공용), 값있으면 병원전용
  module TEXT NOT NULL,        -- 'materials', 'pricing', 'cases'
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- 설명자료
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,            -- NULL이면 공용
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,      -- R2 저장 URL
  file_type TEXT DEFAULT 'image', -- image, video, pdf
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 비용안내
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  price_min INTEGER,
  price_max INTEGER,
  price_unit TEXT DEFAULT '만원',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 케이스 사진
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  patient_age TEXT,
  patient_gender TEXT,
  treatment_period TEXT,
  created_by TEXT,
  is_public INTEGER DEFAULT 0,  -- 다른 병원에 공개 여부
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 케이스 이미지 (Before/After 등 다중 이미지)
CREATE TABLE IF NOT EXISTS case_images (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'during', -- before, during, after
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_hospital ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_categories_module ON categories(module);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_pricing_hospital ON pricing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cases_hospital ON cases(hospital_id);
CREATE INDEX IF NOT EXISTS idx_case_images_case ON case_images(case_id);
