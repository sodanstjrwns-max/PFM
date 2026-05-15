-- ═══ AI Insights Infrastructure (v5.4.0) ═══

-- 글로벌 시스템 설정 (OpenAI 키 등 admin-level secrets)
-- 병원별 격리가 필요 없는 시스템 키만 저장
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- AI 인사이트 캐시 (LLM 호출 비용 절감)
-- 같은 환자/같은 상담 기록에 대해 24h 캐시
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT NOT NULL,
  cache_key TEXT NOT NULL,        -- 'consult:<id>' 또는 'patient_ltv:<id>'
  insight_type TEXT NOT NULL,     -- 'consult' | 'patient_ltv' | 'funnel_advice'
  payload TEXT NOT NULL,          -- JSON 결과
  model TEXT,                     -- 사용한 모델명
  token_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_insights_cache(hospital_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_insights_cache(expires_at);

-- AI 사용량 로그 (월별 토큰 비용 추적)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT NOT NULL,
  user_id TEXT,
  feature TEXT NOT NULL,          -- 'consult_insight' | 'ltv_analysis' | 'funnel_advice'
  model TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  cached INTEGER DEFAULT 0,        -- 1: 캐시 히트
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_hospital_date ON ai_usage_log(hospital_id, created_at);
