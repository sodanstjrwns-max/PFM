-- =====================================================
-- 0028_pf_index_drop_fk.sql
-- pf_index_responses 의 hospital_id / user_id FK 제거
-- 이유: 전국 풀에 가상/외부 응답을 익명으로 합산하기 위함.
--      병원 격리는 hospital_id 컬럼 필터로 충분 (FK 없어도 됨).
-- D1(SQLite)는 ALTER TABLE DROP CONSTRAINT 미지원 → 테이블 재생성.
-- =====================================================

-- 1) 새 테이블 (FK 없음, UNIQUE/CHECK/인덱스 동일)
CREATE TABLE IF NOT EXISTS pf_index_responses_new (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  week_start      TEXT NOT NULL,
  year            INTEGER NOT NULL,
  week_number     INTEGER NOT NULL,
  region          TEXT DEFAULT '',
  specialty       TEXT DEFAULT 'dental',
  position        TEXT DEFAULT '',
  hospital_size   TEXT DEFAULT '',
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
  obj_new_patients      INTEGER DEFAULT 0,
  obj_total_patients    INTEGER DEFAULT 0,
  obj_consultation_cnt  INTEGER DEFAULT 0,
  obj_conversion_rate   REAL    DEFAULT 0,
  obj_avg_revenue       INTEGER DEFAULT 0,
  obj_total_revenue     INTEGER DEFAULT 0,
  obj_call_count        INTEGER DEFAULT 0,
  obj_review_count      INTEGER DEFAULT 0,
  score_inflow      REAL DEFAULT 0,
  score_behavior    REAL DEFAULT 0,
  score_operation   REAL DEFAULT 0,
  score_outlook     REAL DEFAULT 0,
  score_overall     REAL DEFAULT 0,
  comment           TEXT DEFAULT '',
  share_to_national INTEGER DEFAULT 1,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_start)
);

-- 2) 기존 데이터 복사 (있다면)
INSERT INTO pf_index_responses_new SELECT * FROM pf_index_responses;

-- 3) 교체
DROP TABLE pf_index_responses;
ALTER TABLE pf_index_responses_new RENAME TO pf_index_responses;

-- 4) 인덱스 재생성
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

-- pf_index_user_status 도 동일하게 처리
CREATE TABLE IF NOT EXISTS pf_index_user_status_new (
  user_id              TEXT PRIMARY KEY,
  hospital_id          TEXT NOT NULL,
  last_responded_week  TEXT DEFAULT '',
  total_responses      INTEGER DEFAULT 0,
  current_streak       INTEGER DEFAULT 0,
  longest_streak       INTEGER DEFAULT 0,
  last_dismissed_week  TEXT DEFAULT '',
  dismissed_count      INTEGER DEFAULT 0,
  email_opt_in         INTEGER DEFAULT 1,
  push_opt_in          INTEGER DEFAULT 1,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pf_index_user_status_new SELECT * FROM pf_index_user_status;
DROP TABLE pf_index_user_status;
ALTER TABLE pf_index_user_status_new RENAME TO pf_index_user_status;

CREATE INDEX IF NOT EXISTS idx_pfi_status_hospital
  ON pf_index_user_status(hospital_id);
