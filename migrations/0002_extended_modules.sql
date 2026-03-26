-- Patient Funnel Manager - Extended Modules Schema

-- ═══════════════════════════════════════
-- 커뮤니티 (공지, 자유게시판, 칭찬, 실수노트)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  board_type TEXT NOT NULL,  -- 'notice', 'free', 'praise', 'mistake'
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  target_name TEXT DEFAULT '',  -- 칭찬 대상자 이름
  is_pinned INTEGER DEFAULT 0,
  is_anonymous INTEGER DEFAULT 0,  -- 실수노트 익명 옵션
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)
);

-- ═══════════════════════════════════════
-- 운영 칸반보드 (물품구매, 수리내역 등)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS kanban_boards (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  board_type TEXT NOT NULL,  -- 'purchase', 'repair', 'custom'
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'requested',  -- 'requested', 'approved', 'in_progress', 'completed', 'rejected'
  priority TEXT DEFAULT 'normal',   -- 'urgent', 'high', 'normal', 'low'
  requested_by TEXT NOT NULL,
  assigned_to TEXT,
  estimated_cost REAL,
  actual_cost REAL,
  due_date TEXT,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES kanban_boards(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- ═══════════════════════════════════════
-- 상담 스크립트
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,          -- NULL이면 글로벌 템플릿
  category_id TEXT,
  title TEXT NOT NULL,
  situation TEXT DEFAULT '',  -- 상황 설명
  script_text TEXT NOT NULL,  -- 실제 멘트
  objection TEXT DEFAULT '',  -- 환자 반론 예시
  response TEXT DEFAULT '',   -- 반론 대응 멘트
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ═══════════════════════════════════════
-- 마케팅
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS marketing_channels (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  name TEXT NOT NULL,          -- '네이버 플레이스', '인스타그램', '지인소개' 등
  monthly_cost REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS marketing_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  record_month TEXT NOT NULL,   -- '2026-03'
  new_patients INTEGER DEFAULT 0,
  revisit_patients INTEGER DEFAULT 0,
  ad_spend REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (channel_id) REFERENCES marketing_channels(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  platform TEXT NOT NULL,       -- 'naver', 'google', 'kakao', 'manual'
  reviewer_name TEXT DEFAULT '',
  rating INTEGER DEFAULT 5,
  content TEXT DEFAULT '',
  reply TEXT DEFAULT '',
  review_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ═══════════════════════════════════════
-- 직원 교육 (LMS)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',  -- 'onboarding', 'clinical', 'service', 'general'
  is_required INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS course_progress (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',  -- 'not_started', 'in_progress', 'completed'
  completed_at DATETIME,
  score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(course_id, user_id)
);

-- ═══════════════════════════════════════
-- 체크리스트
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  title TEXT NOT NULL,
  checklist_type TEXT DEFAULT 'daily',  -- 'daily_open', 'daily_close', 'weekly', 'onboarding', 'infection', 'custom'
  items TEXT NOT NULL,  -- JSON array of items
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE IF NOT EXISTS checklist_logs (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL,
  completed_by TEXT NOT NULL,
  completed_items TEXT NOT NULL,  -- JSON array of completed indices
  log_date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id),
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- ═══════════════════════════════════════
-- 일정 관리
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT DEFAULT 'meeting',  -- 'meeting', 'vacation', 'maintenance', 'education', 'other'
  start_date TEXT NOT NULL,
  end_date TEXT,
  all_day INTEGER DEFAULT 1,
  assigned_to TEXT,
  color TEXT DEFAULT '#0f766e',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_hospital_board ON posts(hospital_id, board_type);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON kanban_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_status ON kanban_cards(status);
CREATE INDEX IF NOT EXISTS idx_scripts_hospital ON scripts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_marketing_records_month ON marketing_records(record_month);
CREATE INDEX IF NOT EXISTS idx_reviews_hospital ON reviews(hospital_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_logs_date ON checklist_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_events_hospital ON events(hospital_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(start_date);
