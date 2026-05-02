-- =====================================================
-- 0027_pf_index.sql
-- PF Index (페이션트 인덱스) — 매주 월요일 원장 대상
-- 병원 경영 / 개원가 분위기 설문 (20문항, 5점 척도)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. 응답 원본 테이블
--    한 응답 = 한 사람 × 한 주 (week_start = 해당 주의 월요일 KST)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pf_index_responses (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL,
  user_id         TEXT NOT NULL,

  -- 시간 축
  week_start      TEXT NOT NULL,                       -- 'YYYY-MM-DD' (해당 주 월요일, KST)
  year            INTEGER NOT NULL,                    -- 2026
  week_number     INTEGER NOT NULL,                    -- ISO week 1-53

  -- 메타
  region          TEXT DEFAULT '',                     -- 시/도 (서울, 경기 …)
  specialty       TEXT DEFAULT 'dental',               -- dental / medical / oriental …
  position        TEXT DEFAULT '',                     -- doctor / admin / staff
  hospital_size   TEXT DEFAULT '',                     -- small / medium / large

  -- 20문항 답 (1~5)
  q1  INTEGER NOT NULL CHECK(q1  BETWEEN 1 AND 5),
  q2  INTEGER NOT NULL CHECK(q2  BETWEEN 1 AND 5),
  q3  INTEGER NOT NULL CHECK(q3  BETWEEN 1 AND 5),
  q4  INTEGER NOT NULL CHECK(q4  BETWEEN 1 AND 5),
  q5  INTEGER NOT NULL CHECK(q5  BETWEEN 1 AND 5),
  q6  INTEGER NOT NULL CHECK(q6  BETWEEN 1 AND 5),
  q7  INTEGER NOT NULL CHECK(q7  BETWEEN 1 AND 5),
  q8  INTEGER NOT NULL CHECK(q8  BETWEEN 1 AND 5),
  q9  INTEGER NOT NULL CHECK(q9  BETWEEN 1 AND 5),
  q10 INTEGER NOT NULL CHECK(q10 BETWEEN 1 AND 5),
  q11 INTEGER NOT NULL CHECK(q11 BETWEEN 1 AND 5),
  q12 INTEGER NOT NULL CHECK(q12 BETWEEN 1 AND 5),
  q13 INTEGER NOT NULL CHECK(q13 BETWEEN 1 AND 5),
  q14 INTEGER NOT NULL CHECK(q14 BETWEEN 1 AND 5),
  q15 INTEGER NOT NULL CHECK(q15 BETWEEN 1 AND 5),
  q16 INTEGER NOT NULL CHECK(q16 BETWEEN 1 AND 5),
  q17 INTEGER NOT NULL CHECK(q17 BETWEEN 1 AND 5),
  q18 INTEGER NOT NULL CHECK(q18 BETWEEN 1 AND 5),
  q19 INTEGER NOT NULL CHECK(q19 BETWEEN 1 AND 5),
  q20 INTEGER NOT NULL CHECK(q20 BETWEEN 1 AND 5),

  -- 객관 데이터 자동 채움 (응답 시점 D1에서 계산해 저장 → 분석용)
  obj_new_patients      INTEGER DEFAULT 0,             -- 이번 달 신환 수
  obj_total_patients    INTEGER DEFAULT 0,             -- 이번 달 총 환자 수
  obj_consultation_cnt  INTEGER DEFAULT 0,             -- 이번 달 상담 수
  obj_conversion_rate   REAL    DEFAULT 0,             -- 상담→결제 전환율 (%)
  obj_avg_revenue       INTEGER DEFAULT 0,             -- 평균 객단가 (KRW)
  obj_total_revenue     INTEGER DEFAULT 0,             -- 이번 달 총 매출 (KRW)
  obj_call_count        INTEGER DEFAULT 0,             -- 이번 달 통화 수
  obj_review_count      INTEGER DEFAULT 0,             -- 이번 달 리뷰 수

  -- 합산/요약 점수 (제출 시 계산해서 저장)
  score_inflow      REAL DEFAULT 0,                    -- Q1~Q4 평균
  score_behavior    REAL DEFAULT 0,                    -- Q5~Q7 평균
  score_operation   REAL DEFAULT 0,                    -- Q8~Q11 평균
  score_outlook     REAL DEFAULT 0,                    -- Q12~Q19 평균
  score_overall     REAL DEFAULT 0,                    -- 전체 평균 (= 페이션트 인덱스)

  -- 자유 의견 (선택)
  comment           TEXT DEFAULT '',

  -- 공유 동의 (전국 풀 합산용)
  share_to_national INTEGER DEFAULT 1,                 -- 1=동의, 0=거부

  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (user_id) REFERENCES users(id),

  -- 한 사람은 한 주에 한 번만 응답
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_pfi_resp_hospital
  ON pf_index_responses(hospital_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_pfi_resp_user
  ON pf_index_responses(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_pfi_resp_week
  ON pf_index_responses(week_start);
CREATE INDEX IF NOT EXISTS idx_pfi_resp_region
  ON pf_index_responses(week_start, region);
CREATE INDEX IF NOT EXISTS idx_pfi_resp_specialty
  ON pf_index_responses(week_start, specialty);


-- ─────────────────────────────────────────────────────
-- 2. 주간 전국 집계 캐시 (월요일 자정 또는 첫 호출 시 재계산)
--    /api/protected/pf-index/national 가 이 테이블만 읽으면 빠름
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pf_index_weekly_aggregate (
  id              TEXT PRIMARY KEY,
  week_start      TEXT NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'all',         -- 'all' | 'region:서울' | 'specialty:dental'
  scope_value     TEXT DEFAULT '',                     -- 부가 키 (서울 / dental …)

  total_responses INTEGER DEFAULT 0,
  total_hospitals INTEGER DEFAULT 0,

  -- 평균 점수
  avg_q1  REAL DEFAULT 0, avg_q2  REAL DEFAULT 0, avg_q3  REAL DEFAULT 0, avg_q4  REAL DEFAULT 0,
  avg_q5  REAL DEFAULT 0, avg_q6  REAL DEFAULT 0, avg_q7  REAL DEFAULT 0, avg_q8  REAL DEFAULT 0,
  avg_q9  REAL DEFAULT 0, avg_q10 REAL DEFAULT 0, avg_q11 REAL DEFAULT 0, avg_q12 REAL DEFAULT 0,
  avg_q13 REAL DEFAULT 0, avg_q14 REAL DEFAULT 0, avg_q15 REAL DEFAULT 0, avg_q16 REAL DEFAULT 0,
  avg_q17 REAL DEFAULT 0, avg_q18 REAL DEFAULT 0, avg_q19 REAL DEFAULT 0, avg_q20 REAL DEFAULT 0,

  avg_inflow      REAL DEFAULT 0,
  avg_behavior    REAL DEFAULT 0,
  avg_operation   REAL DEFAULT 0,
  avg_outlook     REAL DEFAULT 0,
  avg_overall     REAL DEFAULT 0,

  -- 분포 (1~5 비율, %)
  dist_overall    TEXT DEFAULT '{}',                   -- JSON: {"1":3.2,"2":12.5,...}

  -- 전주 대비 변화 (delta = 이번주 - 지난주)
  delta_overall   REAL DEFAULT 0,

  computed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(week_start, scope, scope_value)
);

CREATE INDEX IF NOT EXISTS idx_pfi_agg_week
  ON pf_index_weekly_aggregate(week_start DESC, scope);


-- ─────────────────────────────────────────────────────
-- 3. 사용자별 참여 상태 / 알림 추적
--    매주 월요일 로그인 시 팝업 띄울지 판단하는 핵심 테이블
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pf_index_user_status (
  user_id              TEXT PRIMARY KEY,
  hospital_id          TEXT NOT NULL,

  last_responded_week  TEXT DEFAULT '',                -- 마지막 응답 주 (YYYY-MM-DD)
  total_responses      INTEGER DEFAULT 0,
  current_streak       INTEGER DEFAULT 0,              -- 연속 참여 주 수
  longest_streak       INTEGER DEFAULT 0,

  -- 모달 동작 제어
  last_dismissed_week  TEXT DEFAULT '',                -- "이번 주는 나중에" 누른 주
  dismissed_count      INTEGER DEFAULT 0,              -- 누적 회피 횟수

  -- 알림 옵션
  email_opt_in         INTEGER DEFAULT 1,              -- 1=알림 수신
  push_opt_in          INTEGER DEFAULT 1,

  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_pfi_status_hospital
  ON pf_index_user_status(hospital_id);


-- ─────────────────────────────────────────────────────
-- 4. 문항 마스터 (관리/표시용 — 코드와 동기화)
--    프론트는 이 테이블 없이도 동작 가능 (정적 JSON으로 갖고 있음)
--    하지만 향후 문항 변경 추적/관리 페이지에 사용
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pf_index_questions (
  id           INTEGER PRIMARY KEY,                    -- 1~20
  category     TEXT NOT NULL,                          -- inflow / behavior / operation / outlook
  question     TEXT NOT NULL,
  reverse      INTEGER DEFAULT 0,                      -- 점수 역산 여부 (Q6, Q7, Q11 = 1)
  options      TEXT NOT NULL,                          -- JSON 배열 ['많이 늘었다','조금 늘었다',...]
  active       INTEGER DEFAULT 1,
  sort_order   INTEGER DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO pf_index_questions (id, category, question, reverse, options, sort_order) VALUES
(1,  'inflow',    '지난달 대비 신규 환자(신환) 수가 어떻게 변했나요?', 0, '["많이 줄었다 (-20% 이상)","조금 줄었다 (-5~20%)","비슷하다","조금 늘었다 (+5~20%)","많이 늘었다 (+20% 이상)"]', 1),
(2,  'inflow',    '지난달 대비 소개 환자 수가 어떻게 변했나요?', 0, '["많이 줄었다","조금 줄었다","비슷하다","조금 늘었다","많이 늘었다"]', 2),
(3,  'inflow',    '온라인 마케팅(블로그, SNS, 검색광고 등) 효과는 어떤가요?', 0, '["매우 나빠졌다","조금 나빠졌다","비슷하다","조금 좋아졌다","매우 좋아졌다"]', 3),
(4,  'inflow',    '예약 후 실제 내원하는 비율(예약 이행률)은 어떤가요?', 0, '["많이 낮아졌다","조금 낮아졌다","비슷하다","조금 높아졌다","많이 높아졌다"]', 4),
(5,  'behavior',  '환자 1인당 평균 진료비(객단가)는 어떻게 변했나요?', 0, '["많이 낮아졌다","조금 낮아졌다","비슷하다","조금 높아졌다","많이 높아졌다"]', 5),
(6,  'behavior',  '환자들의 가격 민감도(가격 문의, 할인 요청)는 어떤가요?', 1, '["많이 늘었다 (경기 나쁨)","조금 늘었다","비슷하다","조금 줄었다","많이 줄었다 (경기 좋음)"]', 6),
(7,  'behavior',  '"나중에 할게요", "생각해볼게요" 등 치료 보류 반응이 어떤가요?', 1, '["많이 늘었다 (경기 나쁨)","조금 늘었다","비슷하다","조금 줄었다","많이 줄었다 (경기 좋음)"]', 7),
(8,  'operation', '상담 후 실제 진료/시술로 이어지는 전환율은 어떤가요?', 0, '["많이 낮아졌다","조금 낮아졌다","비슷하다","조금 높아졌다","많이 높아졌다"]', 8),
(9,  'operation', '직원들의 업무 부하(바쁨 정도)는 어떤가요?', 0, '["많이 한가해졌다 (환자 少)","조금 한가해졌다","비슷하다","조금 바빠졌다","매우 바빠졌다 (환자 多)"]', 9),
(10, 'operation', '마케팅 비용 대비 효율(ROI)은 어떤가요?', 0, '["매우 나빠졌다","조금 나빠졌다","비슷하다","조금 좋아졌다","매우 좋아졌다"]', 10),
(11, 'operation', '인건비, 임대료 등 고정비 부담은 어떻게 느껴지시나요?', 1, '["매우 부담스럽다","조금 부담스럽다","비슷하다","조금 여유롭다","매우 여유롭다"]', 11),
(12, 'outlook',   '이번 달 전체 매출은 지난달 대비 어떤가요?', 0, '["많이 줄었다 (-20% 이상)","조금 줄었다 (-5~20%)","비슷하다","조금 늘었다 (+5~20%)","많이 늘었다 (+20% 이상)"]', 12),
(13, 'outlook',   '재진(재방문) 환자 수는 어떻게 변했나요?', 0, '["많이 줄었다","조금 줄었다","비슷하다","조금 늘었다","많이 늘었다"]', 13),
(14, 'outlook',   '전화 문의 및 상담 예약 문의 수는 어떤가요?', 0, '["많이 줄었다","조금 줄었다","비슷하다","조금 늘었다","많이 늘었다"]', 14),
(15, 'outlook',   '고가 시술/치료에 대한 환자 수요는 어떤가요?', 0, '["많이 줄었다","조금 줄었다","비슷하다","조금 늘었다","많이 늘었다"]', 15),
(16, 'outlook',   '주변 경쟁 병원 대비 우리 병원 상황은 어떤 것 같나요?', 0, '["훨씬 나쁜 것 같다","조금 나쁜 것 같다","비슷한 것 같다","조금 좋은 것 같다","훨씬 좋은 것 같다"]', 16),
(17, 'outlook',   '현재 개원가 전체 경기가 어떻다고 느끼시나요?', 0, '["매우 나쁘다","조금 나쁘다","보통이다","조금 좋다","매우 좋다"]', 17),
(18, 'outlook',   '다음 달 우리 병원 매출 전망은 어떻게 예상하시나요?', 0, '["많이 나빠질 것 같다","조금 나빠질 것 같다","비슷할 것 같다","조금 좋아질 것 같다","많이 좋아질 것 같다"]', 18),
(19, 'outlook',   '다음 달 개원가 전체 경기 전망은 어떻게 예상하시나요?', 0, '["많이 나빠질 것 같다","조금 나빠질 것 같다","비슷할 것 같다","조금 좋아질 것 같다","많이 좋아질 것 같다"]', 19),
(20, 'outlook',   '마지막으로, 지금 병원 경영에 대한 전반적인 체감은 어떠신가요?', 0, '["매우 불만족스럽다","조금 불만족스럽다","보통이다","조금 만족스럽다","매우 만족스럽다"]', 20);
