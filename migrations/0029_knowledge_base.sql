-- ════════════════════════════════════════════════════════════════
-- 0029_knowledge_base.sql
-- PF 지식베이스 (페이션트 가이드 → PFM 이식)
-- 원장님 6권 전자책 노하우를 카드화한 학습/검색 자산
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS knowledge_base (
    id           TEXT PRIMARY KEY,
    hospital_id  TEXT,                          -- NULL = global(전체 공개), 값 있으면 해당 병원 전용
    category     TEXT NOT NULL CHECK(category IN (
        'consultation_script',  -- 상담 스크립트
        'patient_response',     -- 환자 응대 매뉴얼
        'conversion_tips',      -- 전환율 높이는 노하우
        'staff_training',       -- 직원 교육
        'marketing',            -- 마케팅
        'patient_funnel',       -- 페이션트 퍼널 전략
        'success_cases',        -- 성공 사례
        'faq',                  -- 자주 묻는 질문
        'clinic_policy',        -- 병원 정책
        'other'
    )),
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,                 -- 마크다운/플레인 텍스트
    tags         TEXT DEFAULT '',               -- 쉼표로 구분 (검색용)
    priority     INTEGER DEFAULT 50,            -- 0~100, 높을수록 상단 노출
    is_global    INTEGER DEFAULT 0,             -- 1: 전체 공개 (페이션트 퍼널 본사 자산)
    is_active    INTEGER DEFAULT 1,
    view_count   INTEGER DEFAULT 0,             -- 조회 수
    book_source  TEXT DEFAULT '',               -- 출처 책 (페이션트 코드 / PRM / 무자본 마케팅 / 지속개정 / Mission Complete / One Team)
    created_by   TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_hospital   ON knowledge_base(hospital_id);
CREATE INDEX IF NOT EXISTS idx_kb_category   ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_active     ON knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_kb_global     ON knowledge_base(is_global);
CREATE INDEX IF NOT EXISTS idx_kb_priority   ON knowledge_base(priority DESC);

-- 즐겨찾기 (개인별)
CREATE TABLE IF NOT EXISTS knowledge_favorites (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    knowledge_id  TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, knowledge_id)
);
CREATE INDEX IF NOT EXISTS idx_kb_fav_user ON knowledge_favorites(user_id);

-- 조회 로그 (인기도 추적)
CREATE TABLE IF NOT EXISTS knowledge_views (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    knowledge_id  TEXT NOT NULL,
    viewed_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_view_kid ON knowledge_views(knowledge_id);
