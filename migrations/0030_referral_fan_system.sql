-- ═══════════════════════════════════════════════════════════
-- 0030_referral_fan_system.sql
-- 소개 트리 시스템 + 팬 등급 자동 분류
-- ═══════════════════════════════════════════════════════════

-- 1. 소개 관계 (그래프 엣지)
CREATE TABLE IF NOT EXISTS patient_referrals (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  referrer_id TEXT NOT NULL,           -- 소개한 환자 (A)
  referred_id TEXT NOT NULL,           -- 소개받은 환자 (B)
  referred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  channel TEXT DEFAULT 'direct',       -- direct/event/online/external
  initial_treatment TEXT DEFAULT '',
  generated_revenue INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  -- 내부 트래킹 (직원이 감사 인사 했는지)
  thanks_noted INTEGER DEFAULT 0,
  thanks_noted_at DATETIME,
  thanks_noted_by TEXT,
  -- 매칭 신뢰도 (자동 매칭의 경우)
  match_confidence TEXT DEFAULT 'manual',  -- manual/exact/fuzzy/external
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  UNIQUE(referred_id)
);

-- 2. 팬 등급 (계산 캐시)
CREATE TABLE IF NOT EXISTS patient_fan_levels (
  patient_id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  fan_level TEXT DEFAULT 'general',
  -- general / satisfied / loyal / fan / evangelist
  fan_score INTEGER DEFAULT 0,
  
  -- 점수 구성 요소
  referral_count INTEGER DEFAULT 0,
  referral_depth INTEGER DEFAULT 0,
  total_referral_revenue INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  total_paid INTEGER DEFAULT 0,
  satisfaction_score REAL DEFAULT 0,
  
  -- 시간 추적
  last_visit_at DATETIME,
  last_referral_at DATETIME,
  level_changed_at DATETIME,
  
  -- 메타
  calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 내부 알림 (환자한테 X, 우리만 봄)
CREATE TABLE IF NOT EXISTS fan_level_notifications (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  -- 'level_up' / 'first_referral' / 'milestone_5' / 'milestone_10' / 'top10_entry'
  old_level TEXT DEFAULT '',
  new_level TEXT DEFAULT '',
  message TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',  -- low/normal/high
  is_read INTEGER DEFAULT 0,
  is_actioned INTEGER DEFAULT 0,
  actioned_by TEXT,
  actioned_at DATETIME,
  action_note TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 외부 소개자 (의사 친구 등 환자가 아닌 소개자)
CREATE TABLE IF NOT EXISTS external_referrers (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',   -- doctor/dentist/pharmacy/business/other
  contact TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON patient_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON patient_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_hospital ON patient_referrals(hospital_id);
CREATE INDEX IF NOT EXISTS idx_referrals_date ON patient_referrals(hospital_id, referred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fan_level_hospital ON patient_fan_levels(hospital_id, fan_level);
CREATE INDEX IF NOT EXISTS idx_fan_score ON patient_fan_levels(hospital_id, fan_score DESC);
CREATE INDEX IF NOT EXISTS idx_fan_notif_unread ON fan_level_notifications(hospital_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_referrers ON external_referrers(hospital_id, is_active);
