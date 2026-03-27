-- ═══ KPI 시스템: 월간 목표 + 일간 기록 ═══

-- 월간 KPI 목표 설정
CREATE TABLE IF NOT EXISTS kpi_targets (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  year_month      TEXT NOT NULL,  -- '2026-03' 형식
  target_revenue  INTEGER DEFAULT 0,         -- 목표 매출 (만원)
  insurance_ratio REAL DEFAULT 13.0,         -- 보험 매출 비중 (%)
  target_new_patients_weekday INTEGER DEFAULT 25,  -- 평일 목표 신환수
  target_new_patients_weekend INTEGER DEFAULT 20,  -- 주말 목표 신환수
  total_hours     INTEGER DEFAULT 260,       -- 총 진료시간
  weekdays        INTEGER DEFAULT 21,        -- 평일 진료일수
  weekend_days    INTEGER DEFAULT 10,        -- 주말 진료일수
  notes           TEXT DEFAULT '',
  created_by      TEXT REFERENCES users(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_targets_month ON kpi_targets(hospital_id, year_month);

-- 일간 기록
CREATE TABLE IF NOT EXISTS daily_records (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  record_date     TEXT NOT NULL,  -- '2026-03-27' 형식
  day_of_week     TEXT NOT NULL,  -- 'mon','tue','wed','thu','fri','sat','sun'

  -- 매출 관련
  revenue_non_insurance INTEGER DEFAULT 0,  -- 비급여매출 (만원)
  revenue_insurance     INTEGER DEFAULT 0,  -- 공단청구 (만원)

  -- 환자수 관련
  existing_patients INTEGER DEFAULT 0,  -- 구환수
  new_patients      INTEGER DEFAULT 0,  -- 신환수

  -- 신환 진료별 (핵심진료 1,2,3 신환수)
  core_treatment_1_new INTEGER DEFAULT 0,
  core_treatment_2_new INTEGER DEFAULT 0,
  core_treatment_3_new INTEGER DEFAULT 0,

  -- 신환 지역별
  region_core_new      INTEGER DEFAULT 0,  -- 핵심 지역
  region_expand_new    INTEGER DEFAULT 0,  -- 확장 지역
  region_adjacent_new  INTEGER DEFAULT 0,  -- 인접 지역
  region_other_new     INTEGER DEFAULT 0,  -- 그 외 지역

  -- 신환 유입별
  referral_new    INTEGER DEFAULT 0,  -- 소개 신환
  online_new      INTEGER DEFAULT 0,  -- 온라인 신환
  etc_new         INTEGER DEFAULT 0,  -- 기타 신환

  -- 진료 관련 (핵심진료 1,2,3 진행수)
  core_treatment_1_count INTEGER DEFAULT 0,
  core_treatment_2_count INTEGER DEFAULT 0,
  core_treatment_3_count INTEGER DEFAULT 0,

  -- 상담 관련
  total_consultations    INTEGER DEFAULT 0,  -- 전체 상담수
  core_treat_1_consult   INTEGER DEFAULT 0,  -- 핵심진료1 상담수
  core_treat_1_agree     INTEGER DEFAULT 0,  -- 핵심진료1 동의수
  core_treat_2_consult   INTEGER DEFAULT 0,  -- 핵심진료2 상담수
  core_treat_2_agree     INTEGER DEFAULT 0,  -- 핵심진료2 동의수
  core_treat_3_consult   INTEGER DEFAULT 0,  -- 핵심진료3 상담수
  core_treat_3_agree     INTEGER DEFAULT 0,  -- 핵심진료3 동의수
  referral_thanks        INTEGER DEFAULT 0,  -- 소개 감사 연락수

  -- 기타 사항
  inbound_calls     INTEGER DEFAULT 0,  -- 인바운드콜
  outbound_calls    INTEGER DEFAULT 0,  -- 아웃바운드콜
  cancel_count      INTEGER DEFAULT 0,  -- 예약 취소 수
  complaint_count   INTEGER DEFAULT 0,  -- 컴플레인 수
  avg_wait_time     REAL DEFAULT 0,     -- 평균 대기시간 (분)
  naver_reviews     INTEGER DEFAULT 0,  -- 네이버 리뷰수

  -- 메타
  notes             TEXT DEFAULT '',
  recorded_by       TEXT REFERENCES users(id),
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(hospital_id, record_date);
CREATE INDEX IF NOT EXISTS idx_daily_records_month ON daily_records(hospital_id, record_date);
