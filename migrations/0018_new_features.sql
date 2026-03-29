-- ════════════════════════════════════════════════════════════════
-- v2.6 신규 기능: 게이미피케이션 + 리뷰 관리 테이블
-- ════════════════════════════════════════════════════════════════

-- 1. 게이미피케이션 미션
CREATE TABLE IF NOT EXISTS gamification_missions (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  mission_type TEXT NOT NULL DEFAULT 'custom',
  period TEXT NOT NULL DEFAULT 'weekly',
  target_value INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 100,
  badge_icon TEXT DEFAULT '🏆',
  target_role TEXT DEFAULT 'all',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gm_missions_hospital ON gamification_missions(hospital_id);

-- 2. 게이미피케이션 진행상황
CREATE TABLE IF NOT EXISTS gamification_progress (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES gamification_missions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gp_hospital_user ON gamification_progress(hospital_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gp_mission_period ON gamification_progress(mission_id, period_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gp_unique ON gamification_progress(hospital_id, user_id, mission_id, period_key);

-- 3. 리뷰 관리
CREATE TABLE IF NOT EXISTS review_management (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'naver',
  reviewer_name TEXT DEFAULT '익명',
  rating INTEGER DEFAULT 5,
  review_text TEXT NOT NULL,
  review_date TEXT DEFAULT '',
  review_url TEXT DEFAULT '',
  sentiment TEXT DEFAULT 'neutral',
  tags TEXT DEFAULT '',
  response_text TEXT DEFAULT '',
  response_status TEXT DEFAULT 'pending',
  responded_by TEXT,
  responded_at DATETIME,
  is_pinned INTEGER DEFAULT 0,
  registered_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rm_hospital ON review_management(hospital_id);
CREATE INDEX IF NOT EXISTS idx_rm_platform ON review_management(hospital_id, platform);
CREATE INDEX IF NOT EXISTS idx_rm_sentiment ON review_management(hospital_id, sentiment);
CREATE INDEX IF NOT EXISTS idx_rm_date ON review_management(hospital_id, review_date);
