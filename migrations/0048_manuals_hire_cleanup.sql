-- ════════════════════════════════════════════════════════════════════
-- 0048: 병원 매뉴얼 학습 / 실수·피드백 노트 / 채용 정리 / 게이미피케이션 제거
--
-- 배경
--   ① 지식네트워크: PF 지식베이스(에디터로 카드 작성) → 병원 매뉴얼 업로드로 교체.
--      AI가 업로드된 매뉴얼을 검색해 답변 근거로 쓰는 RAG 구조로 간다.
--   ② 커뮤니티: 실수노트는 "실수한 본인"이 쓰고, 상급자가 피드백을 단다.
--      피드백노트는 "실수를 발견한 상급자"가 쓰고, 대상자가 답변한다. (기존 feedback_notes)
--   ③ HR: 채용공고/게이미피케이션 제거. 지원자·면접은 공고 없이 독립 운영.
--   ④ 직원관리 확장에 필요한 컬럼 보강.
--
-- ⚠️ 파괴적 마이그레이션: job_postings / knowledge_base / gamification_* 를 DROP한다.
--    사용자 확인 완료 — 해당 데이터는 전부 데모/가짜 데이터.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- ① 게이미피케이션 제거
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS gamification_progress;
DROP TABLE IF EXISTS gamification_missions;

-- ─────────────────────────────────────────────────────────────
-- ② PF 지식베이스 제거
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS knowledge_views;
DROP TABLE IF EXISTS knowledge_favorites;
DROP TABLE IF EXISTS knowledge_base;

-- ─────────────────────────────────────────────────────────────
-- ③ 병원 매뉴얼 (업로드 → 텍스트 추출 → 청크 → AI 학습)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_manuals (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other'
                CHECK(category IN ('consultation','clinical','reception','sterilization',
                                   'insurance','marketing','hr','emergency','policy','other')),
  description   TEXT DEFAULT '',
  -- 원본 파일 메타 (원본은 R2에 보관, 본문 텍스트는 D1에 저장)
  file_name     TEXT DEFAULT '',
  file_type     TEXT DEFAULT 'txt' CHECK(file_type IN ('docx','pdf','md','txt')),
  file_size     INTEGER DEFAULT 0,
  r2_key        TEXT DEFAULT '',
  -- 추출된 전체 텍스트 (AI 컨텍스트 원본)
  content       TEXT NOT NULL DEFAULT '',
  char_count    INTEGER DEFAULT 0,
  chunk_count   INTEGER DEFAULT 0,
  -- AI 학습 대상 포함 여부 (끄면 검색에서 제외)
  ai_enabled    INTEGER DEFAULT 1,
  is_active     INTEGER DEFAULT 1,
  version       INTEGER DEFAULT 1,
  uploaded_by   TEXT REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_manuals_hospital ON hospital_manuals(hospital_id, is_active);
CREATE INDEX IF NOT EXISTS idx_manuals_category ON hospital_manuals(hospital_id, category);

-- 청크: 검색 단위. 제목(heading)을 함께 저장해 인용 시 출처를 정확히 표시한다.
CREATE TABLE IF NOT EXISTS manual_chunks (
  id            TEXT PRIMARY KEY,
  manual_id     TEXT NOT NULL REFERENCES hospital_manuals(id) ON DELETE CASCADE,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  heading       TEXT DEFAULT '',
  content       TEXT NOT NULL,
  char_count    INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chunks_manual   ON manual_chunks(manual_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_hospital ON manual_chunks(hospital_id);

-- AI가 실제로 어떤 청크를 인용했는지 추적 (매뉴얼 품질 개선용)
CREATE TABLE IF NOT EXISTS manual_citations (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  manual_id     TEXT REFERENCES hospital_manuals(id) ON DELETE SET NULL,
  chunk_id      TEXT,
  query         TEXT DEFAULT '',
  feature       TEXT DEFAULT '',
  user_id       TEXT REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_citations_manual ON manual_citations(manual_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- ④ 실수노트: 상급자 피드백 + 역할 구분
--    실수노트(mistake)  = 실수한 본인이 작성  → 상급자가 피드백 댓글
--    피드백노트(feedback_notes) = 상급자가 작성 → 대상자가 답변 (이미 구현됨)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE posts ADD COLUMN resolution_status TEXT DEFAULT 'open';
-- open: 피드백 대기 / feedback_given: 상급자 피드백 완료 / resolved: 해결 종료

ALTER TABLE posts ADD COLUMN mistake_category TEXT DEFAULT '';
-- consultation / clinical / reception / billing / communication / system / other

ALTER TABLE posts ADD COLUMN severity TEXT DEFAULT 'low';
-- low / medium / high

ALTER TABLE posts ADD COLUMN feedback_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN resolved_at DATETIME;

-- 댓글에 역할 배지 + "상급자 피드백" 플래그
-- (hospital_id 는 0017_data_isolation 에서 이미 추가됨 — 중복 ALTER 금지)
ALTER TABLE comments ADD COLUMN author_role TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN comment_kind TEXT DEFAULT 'comment';
-- comment: 일반 댓글 / feedback: 상급자 피드백 / reply: 작성자 답변

CREATE INDEX IF NOT EXISTS idx_posts_resolution ON posts(hospital_id, board_type, resolution_status);

-- ─────────────────────────────────────────────────────────────
-- ⑤ 채용: job_postings 제거, 지원자를 공고 없이 독립 운영
--    applicants.job_posting_id (NOT NULL FK) 를 없애고 position_type 을 직접 갖게 한다.
--    → 지원자 → 면접 → 캘린더 흐름이 공고 없이도 성립.
-- ─────────────────────────────────────────────────────────────
PRAGMA defer_foreign_keys = ON;

CREATE TABLE applicants_new (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  position_type   TEXT DEFAULT 'other'
                  CHECK(position_type IN ('dentist','hygienist','assistant','coordinator',
                                          'receptionist','manager','other')),
  employment_type TEXT DEFAULT 'full_time'
                  CHECK(employment_type IN ('full_time','part_time','contract','intern')),
  source          TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  resume_url      TEXT DEFAULT '',
  cover_letter    TEXT DEFAULT '',
  status          TEXT DEFAULT 'applied'
                  CHECK(status IN ('applied','screening','interview','evaluation',
                                   'offer','hired','rejected','withdrawn')),
  rating          INTEGER DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
  notes           TEXT DEFAULT '',
  applied_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기존 지원자 데이터 이관 (공고의 position_type을 지원자에게 승계)
INSERT INTO applicants_new (id, hospital_id, name, position_type, employment_type,
                            email, phone, resume_url, cover_letter, status, rating,
                            notes, applied_at, updated_at)
SELECT a.id, a.hospital_id, a.name,
       COALESCE(jp.position_type, 'other'),
       COALESCE(jp.employment_type, 'full_time'),
       a.email, a.phone, a.resume_url, a.cover_letter, a.status, a.rating,
       a.notes, a.applied_at, a.updated_at
FROM applicants a
LEFT JOIN job_postings jp ON a.job_posting_id = jp.id;

DROP TABLE applicants;
ALTER TABLE applicants_new RENAME TO applicants;

CREATE INDEX IF NOT EXISTS idx_applicants_hospital ON applicants(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_applicants_position ON applicants(hospital_id, position_type);

DROP TABLE IF EXISTS job_postings;

PRAGMA defer_foreign_keys = OFF;

-- 면접 캘린더용 인덱스 (월별 조회가 주 사용 패턴)
CREATE INDEX IF NOT EXISTS idx_interviews_schedule ON interviews(hospital_id, scheduled_at);

-- 면접에 제목/메모 보강 (캘린더 셀 표기용)
ALTER TABLE interviews ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE interviews ADD COLUMN memo TEXT DEFAULT '';
-- ⚠️ hire.ts PUT /interviews/:id 가 updated_at 을 쓰는데 컬럼이 없었다 (잠재 버그) — 여기서 보강
ALTER TABLE interviews ADD COLUMN updated_at DATETIME;

-- ─────────────────────────────────────────────────────────────
-- ⑥ 직원관리 확장용 컬럼
-- ─────────────────────────────────────────────────────────────
-- 재직상태는 0002 의 work_status(active|on_leave|resigned) 를 그대로 쓴다 (중복 컬럼 금지)
ALTER TABLE users ADD COLUMN birth_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN resign_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN staff_memo TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_workstatus ON users(hospital_id, work_status);
