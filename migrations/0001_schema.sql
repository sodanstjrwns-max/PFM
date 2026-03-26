-- ════════════════════════════════════════════════════════════════
-- Patient Funnel Manager - Unified Schema v2.0
-- 병의원 통합 관리 플랫폼 데이터베이스
-- ════════════════════════════════════════════════════════════════

-- ═══ 1. Core: 병원 & 사용자 ═══

CREATE TABLE IF NOT EXISTS hospitals (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  logo_url      TEXT DEFAULT '',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','manager','staff')),
  is_active     INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_hospital ON users(hospital_id);
CREATE INDEX idx_users_email    ON users(email);

-- ═══ 2. Categories: 공통 카테고리 시스템 ═══

CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT REFERENCES hospitals(id) ON DELETE CASCADE,  -- NULL = 글로벌
  module        TEXT NOT NULL CHECK(module IN ('materials','pricing','cases','scripts','hire','treatment','consultation')),
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT '📁',
  sort_order    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_categories_module ON categories(module, hospital_id);

-- ═══ 3. 진료관리: 설명자료 / 비용 / 케이스 / 스크립트 ═══

CREATE TABLE IF NOT EXISTS materials (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT REFERENCES hospitals(id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL REFERENCES categories(id),
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  file_url      TEXT DEFAULT '',
  file_type     TEXT DEFAULT 'image' CHECK(file_type IN ('image','video','pdf','document')),
  thumbnail_url TEXT DEFAULT '',
  sort_order    INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_materials_hospital ON materials(hospital_id, category_id);

CREATE TABLE IF NOT EXISTS pricing (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  category_id     TEXT NOT NULL REFERENCES categories(id),
  procedure_name  TEXT NOT NULL,
  price_min       REAL,
  price_max       REAL,
  price_unit      TEXT DEFAULT '만원',
  description     TEXT DEFAULT '',
  sort_order      INTEGER DEFAULT 0,
  is_active       INTEGER DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pricing_hospital ON pricing(hospital_id, category_id);

CREATE TABLE IF NOT EXISTS cases (
  id                TEXT PRIMARY KEY,
  hospital_id       TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  category_id       TEXT NOT NULL REFERENCES categories(id),
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  patient_age       TEXT DEFAULT '',
  patient_gender    TEXT DEFAULT '',
  treatment_period  TEXT DEFAULT '',
  created_by        TEXT REFERENCES users(id),
  is_public         INTEGER DEFAULT 0,
  view_count        INTEGER DEFAULT 0,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cases_hospital ON cases(hospital_id, category_id);

CREATE TABLE IF NOT EXISTS case_images (
  id            TEXT PRIMARY KEY,
  case_id       TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  image_type    TEXT DEFAULT 'during' CHECK(image_type IN ('before','during','after')),
  caption       TEXT DEFAULT '',
  sort_order    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_case_images_case ON case_images(case_id);

CREATE TABLE IF NOT EXISTS scripts (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT REFERENCES hospitals(id) ON DELETE CASCADE,
  category_id   TEXT REFERENCES categories(id),
  title         TEXT NOT NULL,
  situation     TEXT DEFAULT '',
  script_text   TEXT NOT NULL DEFAULT '',
  objection     TEXT DEFAULT '',
  response      TEXT DEFAULT '',
  sort_order    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_scripts_hospital ON scripts(hospital_id, category_id);

-- ═══ 4. 커뮤니티: 게시판 / 댓글 / 좋아요 ═══

CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  board_type    TEXT NOT NULL CHECK(board_type IN ('notice','free','praise','mistake')),
  author_id     TEXT NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  content       TEXT DEFAULT '',
  target_name   TEXT DEFAULT '',
  is_pinned     INTEGER DEFAULT 0,
  is_anonymous  INTEGER DEFAULT 0,
  like_count    INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_posts_hospital_board ON posts(hospital_id, board_type);

CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id     TEXT NOT NULL REFERENCES users(id),
  content       TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS post_likes (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- ═══ 5. 병원운영: 칸반보드 / 체크리스트 / 일정 ═══

CREATE TABLE IF NOT EXISTS kanban_boards (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  board_type    TEXT NOT NULL CHECK(board_type IN ('purchase','repair','custom')),
  title         TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_kanban_boards_hospital ON kanban_boards(hospital_id, board_type);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id              TEXT PRIMARY KEY,
  board_id        TEXT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  status          TEXT DEFAULT 'requested' CHECK(status IN ('requested','approved','in_progress','completed','rejected')),
  priority        TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','high','normal','low')),
  requested_by    TEXT NOT NULL REFERENCES users(id),
  assigned_to     TEXT REFERENCES users(id),
  estimated_cost  REAL,
  actual_cost     REAL,
  due_date        TEXT,
  completed_at    DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_kanban_cards_board  ON kanban_cards(board_id, status);
CREATE INDEX idx_kanban_cards_hospital ON kanban_cards(hospital_id);

CREATE TABLE IF NOT EXISTS checklists (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  checklist_type  TEXT DEFAULT 'custom' CHECK(checklist_type IN ('daily_open','daily_close','weekly','infection','onboarding','custom')),
  items           TEXT NOT NULL,  -- JSON array
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklist_logs (
  id              TEXT PRIMARY KEY,
  checklist_id    TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  completed_by    TEXT NOT NULL REFERENCES users(id),
  completed_items TEXT NOT NULL,  -- JSON array of indices
  log_date        TEXT NOT NULL,
  notes           TEXT DEFAULT '',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_checklist_logs_date ON checklist_logs(checklist_id, log_date);

CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  event_type    TEXT DEFAULT 'meeting' CHECK(event_type IN ('meeting','vacation','maintenance','education','interview','other')),
  start_date    TEXT NOT NULL,
  end_date      TEXT,
  all_day       INTEGER DEFAULT 1,
  color         TEXT DEFAULT '#0f766e',
  created_by    TEXT NOT NULL REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_hospital_date ON events(hospital_id, start_date);

-- ═══ 6. 마케팅: 채널 / 실적 / 리뷰 ═══

CREATE TABLE IF NOT EXISTS marketing_channels (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  monthly_cost  REAL DEFAULT 0,
  is_active     INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mkt_channels_hospital ON marketing_channels(hospital_id);

CREATE TABLE IF NOT EXISTS marketing_records (
  id                TEXT PRIMARY KEY,
  hospital_id       TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  channel_id        TEXT NOT NULL REFERENCES marketing_channels(id) ON DELETE CASCADE,
  record_month      TEXT NOT NULL,
  new_patients      INTEGER DEFAULT 0,
  revisit_patients  INTEGER DEFAULT 0,
  ad_spend          REAL DEFAULT 0,
  revenue           REAL DEFAULT 0,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_mkt_records_month ON marketing_records(hospital_id, record_month);

CREATE TABLE IF NOT EXISTS reviews (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK(platform IN ('naver','google','kakao','manual')),
  reviewer_name   TEXT DEFAULT '',
  rating          INTEGER DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
  content         TEXT DEFAULT '',
  reply           TEXT DEFAULT '',
  review_date     TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reviews_hospital ON reviews(hospital_id);

-- ═══ 7. HR: PF Hire 채용 모듈 ═══

CREATE TABLE IF NOT EXISTS job_postings (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  position_type   TEXT NOT NULL CHECK(position_type IN ('dentist','hygienist','assistant','coordinator','receptionist','manager','other')),
  employment_type TEXT DEFAULT 'full_time' CHECK(employment_type IN ('full_time','part_time','contract','intern')),
  description     TEXT DEFAULT '',
  requirements    TEXT DEFAULT '',
  benefits        TEXT DEFAULT '',
  salary_min      REAL,
  salary_max      REAL,
  salary_unit     TEXT DEFAULT '만원/월',
  status          TEXT DEFAULT 'draft' CHECK(status IN ('draft','open','closed','paused')),
  created_by      TEXT REFERENCES users(id),
  deadline        TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_postings_hospital ON job_postings(hospital_id, status);

CREATE TABLE IF NOT EXISTS applicants (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  job_posting_id  TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  resume_url      TEXT DEFAULT '',
  cover_letter    TEXT DEFAULT '',
  status          TEXT DEFAULT 'applied' CHECK(status IN ('applied','screening','interview','evaluation','offer','hired','rejected','withdrawn')),
  rating          INTEGER DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
  notes           TEXT DEFAULT '',
  applied_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_applicants_job     ON applicants(job_posting_id, status);
CREATE INDEX idx_applicants_hospital ON applicants(hospital_id);

CREATE TABLE IF NOT EXISTS interviews (
  id              TEXT PRIMARY KEY,
  applicant_id    TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  interviewer_id  TEXT REFERENCES users(id),
  scheduled_at    TEXT NOT NULL,
  duration_min    INTEGER DEFAULT 30,
  interview_type  TEXT DEFAULT 'onsite' CHECK(interview_type IN ('onsite','phone','video')),
  location        TEXT DEFAULT '',
  status          TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','no_show')),
  feedback        TEXT DEFAULT '',
  score           INTEGER CHECK(score BETWEEN 0 AND 100),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_interviews_applicant ON interviews(applicant_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id              TEXT PRIMARY KEY,
  applicant_id    TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  evaluator_id    TEXT NOT NULL REFERENCES users(id),
  criteria        TEXT NOT NULL,  -- JSON: [{name, score, maxScore}]
  total_score     INTEGER DEFAULT 0,
  max_score       INTEGER DEFAULT 100,
  comments        TEXT DEFAULT '',
  recommendation  TEXT DEFAULT 'neutral' CHECK(recommendation IN ('strong_yes','yes','neutral','no','strong_no')),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_evaluations_applicant ON evaluations(applicant_id);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  applicant_id    TEXT REFERENCES applicants(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  category        TEXT DEFAULT 'general' CHECK(category IN ('documents','training','equipment','access','general')),
  assigned_to     TEXT REFERENCES users(id),
  status          TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
  due_date        TEXT,
  completed_at    DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_onboarding_hospital ON onboarding_tasks(hospital_id, applicant_id);

-- ═══ 8. 진료보드: 실시간 체어 현황판 ═══

CREATE TABLE IF NOT EXISTS chairs (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  chair_number  INTEGER NOT NULL,
  floor         TEXT DEFAULT '',
  room_name     TEXT DEFAULT '',
  is_active     INTEGER DEFAULT 1,
  sort_order    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_chairs_hospital ON chairs(hospital_id);

CREATE TABLE IF NOT EXISTS treatment_board (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  chair_id        TEXT REFERENCES chairs(id) ON DELETE SET NULL,
  board_date      TEXT NOT NULL,
  patient_name    TEXT NOT NULL,
  patient_type    TEXT DEFAULT 'new' CHECK(patient_type IN ('new','existing','emergency','referral')),
  chart_number    TEXT DEFAULT '',
  assigned_doctor TEXT REFERENCES users(id),
  assigned_staff  TEXT REFERENCES users(id),
  treatment_desc  TEXT DEFAULT '',
  treatment_type  TEXT DEFAULT 'general' CHECK(treatment_type IN ('general','implant','ortho','prosth','endo','perio','extraction','esthetic','pedo','emergency','checkup','other')),
  status          TEXT DEFAULT 'waiting' CHECK(status IN ('waiting','arrived','seating','in_treatment','doctor_needed','completed','cancelled','no_show')),
  priority        TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','high','normal','low')),
  appointment_time TEXT,
  arrived_at      DATETIME,
  treatment_started_at DATETIME,
  completed_at    DATETIME,
  notes           TEXT DEFAULT '',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_treatment_board_date    ON treatment_board(hospital_id, board_date, status);
CREATE INDEX idx_treatment_board_chair   ON treatment_board(chair_id, board_date);

-- ═══ 9. 상담관리: 파이프라인 + 기록 + 전환율 ═══

CREATE TABLE IF NOT EXISTS consultations (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_name    TEXT NOT NULL,
  patient_phone   TEXT DEFAULT '',
  patient_age     TEXT DEFAULT '',
  patient_gender  TEXT DEFAULT '',
  source_channel  TEXT DEFAULT 'walk_in' CHECK(source_channel IN ('walk_in','phone','naver','instagram','youtube','blog','referral','kakao','homepage','other')),
  treatment_type  TEXT DEFAULT 'general' CHECK(treatment_type IN ('general','implant','ortho','prosth','endo','perio','extraction','esthetic','pedo','checkup','other')),
  status          TEXT DEFAULT 'inquiry' CHECK(status IN ('inquiry','reserved','visited','consulting','agreed','payment','treatment','completed','lost','cancelled')),
  assigned_counselor TEXT REFERENCES users(id),
  estimated_amount REAL,
  agreed_amount   REAL,
  paid_amount     REAL,
  consultation_date TEXT,
  next_visit_date TEXT,
  priority        TEXT DEFAULT 'normal' CHECK(priority IN ('urgent','high','normal','low')),
  lost_reason     TEXT DEFAULT '',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_consultations_hospital  ON consultations(hospital_id, status);
CREATE INDEX idx_consultations_date      ON consultations(hospital_id, consultation_date);

CREATE TABLE IF NOT EXISTS consultation_notes (
  id              TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  author_id       TEXT NOT NULL REFERENCES users(id),
  note_type       TEXT DEFAULT 'general' CHECK(note_type IN ('general','objection','follow_up','treatment_plan','payment','phone_call')),
  content         TEXT NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_consultation_notes ON consultation_notes(consultation_id);

-- ═══ 10. LMS: 교육 과정 ═══

CREATE TABLE IF NOT EXISTS courses (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT REFERENCES hospitals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  category      TEXT DEFAULT 'general' CHECK(category IN ('onboarding','clinical','service','general')),
  is_required   INTEGER DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_progress (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
  completed_at  DATETIME,
  score         INTEGER,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, user_id)
);
CREATE INDEX idx_course_progress_user ON course_progress(user_id);
