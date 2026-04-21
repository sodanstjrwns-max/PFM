-- ═══════════════════════════════════════════════════════════
-- v3.5: 피드백 노트 (Feedback Notes)
-- 상급자가 하급자의 실수/이슈를 기록하고 피드백을 주면,
-- 하급자는 확인 체크 + 본인 피드백을 입력하는 양방향 게시판
-- ═══════════════════════════════════════════════════════════

-- 1) 피드백 노트 (main)
CREATE TABLE IF NOT EXISTS feedback_notes (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,

  -- 작성자 (상급자)
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,                     -- admin/manager/doctor 등

  -- 대상자 (하급자)
  target_user_id TEXT NOT NULL,
  target_user_name TEXT NOT NULL,
  target_team TEXT,                     -- clinical/front/support/management

  -- 내용
  incident_date TEXT,                   -- YYYY-MM-DD, 실제 발생일
  category TEXT DEFAULT 'other',        -- 진료, 응대, 행정, 위생, 기타
  severity TEXT DEFAULT 'moderate',     -- mild, moderate, severe
  title TEXT NOT NULL,
  description TEXT NOT NULL,            -- 실수 내용 기록
  feedback TEXT,                        -- 상급자의 피드백/조언

  -- 공개 범위
  visibility TEXT DEFAULT 'target',     -- target(본인만), managers(관리자 공유), public(전체)

  -- 확인 상태
  acknowledged INTEGER DEFAULT 0,       -- 0 미확인 / 1 확인
  acknowledged_at DATETIME,
  target_response TEXT,                 -- 하급자 본인 피드백/변명/다짐
  target_responded_at DATETIME,

  -- 후속 조치
  status TEXT DEFAULT 'open',           -- open, acknowledged, resolved, archived
  resolved_at DATETIME,
  resolved_by TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_notes_hospital ON feedback_notes(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_notes_target ON feedback_notes(target_user_id, acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_notes_author ON feedback_notes(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_notes_status ON feedback_notes(hospital_id, status);

-- 2) 피드백 노트 댓글 (쓰레드)
-- 상급자/하급자 간 추가 대화 (선택 사항)
CREATE TABLE IF NOT EXISTS feedback_note_replies (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,

  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,                     -- 'author' (원 작성자) / 'target' (대상자) / 'other'

  body TEXT NOT NULL,
  is_internal INTEGER DEFAULT 0,        -- 0: 대상자도 볼 수 있음 / 1: 관리자만
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (note_id) REFERENCES feedback_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_note ON feedback_note_replies(note_id, created_at);
