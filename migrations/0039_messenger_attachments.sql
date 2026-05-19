-- ═══════════════════════════════════════════════════════════
-- Phase E.1 — 메신저 첨부파일 + 스레드 AI 인사이트
-- (R2 파일 + AI 요약/다음 액션 캐시)
-- ═══════════════════════════════════════════════════════════

-- 메신저 첨부파일 메타데이터
-- (실제 파일은 R2 'pfm-assets' 버킷, key 컬럼이 R2 경로)
CREATE TABLE IF NOT EXISTS messenger_attachments (
  id TEXT PRIMARY KEY,                       -- 'att_xxxxx'
  hospital_id TEXT NOT NULL,
  uploader_id TEXT NOT NULL,                 -- users.id
  r2_key TEXT NOT NULL,                      -- R2 경로 'hospitals/{hospital_id}/attachments/{att_id}/{filename}'
  file_name TEXT NOT NULL,                   -- 원본 파일명
  content_type TEXT NOT NULL,                -- MIME
  file_size INTEGER NOT NULL,                -- bytes
  sha256 TEXT,                               -- 향후 dedupe / 무결성

  -- 컨텍스트 (셋 중 하나 또는 둘 — channel + thread, channel + patient_thread)
  channel_id TEXT,                           -- channels.id (nullable: DM 전 단계 업로드 등)
  message_id TEXT,                           -- messages.id (첨부가 메시지에 attach 되면 채워짐)
  patient_thread_id TEXT,                    -- patient_threads.id

  -- 이미지 메타 (있으면)
  is_image INTEGER DEFAULT 0,                -- 0/1
  width INTEGER,
  height INTEGER,

  -- 라이프사이클
  status TEXT NOT NULL DEFAULT 'active'      -- 'active' | 'deleted'
    CHECK (status IN ('active','deleted')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by TEXT,

  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attach_hospital_created
  ON messenger_attachments(hospital_id, created_at DESC) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_attach_message
  ON messenger_attachments(message_id) WHERE message_id IS NOT NULL AND status='active';
CREATE INDEX IF NOT EXISTS idx_attach_patient_thread
  ON messenger_attachments(patient_thread_id) WHERE patient_thread_id IS NOT NULL AND status='active';
CREATE INDEX IF NOT EXISTS idx_attach_channel
  ON messenger_attachments(channel_id) WHERE channel_id IS NOT NULL AND status='active';
CREATE INDEX IF NOT EXISTS idx_attach_uploader
  ON messenger_attachments(hospital_id, uploader_id, created_at DESC) WHERE status='active';


-- 환자 스레드 AI 인사이트 (요약 + 다음 액션 제안)
-- ai_insights_cache 와 분리한 이유:
--   - thread_id 로 직접 조회 필요 (cache_key 기반 lookup 보다 빠름)
--   - "최신 1건"이 항상 의미 있음 (cache TTL 보다 "마지막 N개 메시지/이벤트 기준" 키가 적절)
--   - 사용자가 직접 보는 데이터라 schema 노출 필요
CREATE TABLE IF NOT EXISTS patient_thread_ai_insights (
  id TEXT PRIMARY KEY,                       -- 'tai_xxxxx'
  hospital_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,                   -- patient_threads.id
  patient_id TEXT NOT NULL,                  -- patients.id (TEXT — pt-xxxxx)

  insight_type TEXT NOT NULL                 -- 'summary' | 'next_actions' | 'risk_assessment'
    CHECK (insight_type IN ('summary','next_actions','risk_assessment')),

  -- 생성 시점 입력 스냅샷 (어떤 컨텍스트로 만들어졌는지)
  message_count_at_gen INTEGER DEFAULT 0,    -- 생성 시점의 메시지 수
  event_count_at_gen INTEGER DEFAULT 0,      -- 생성 시점의 이벤트 수
  context_hash TEXT,                         -- 입력 컨텍스트 해시 (캐시 invalidation)

  -- 결과
  payload TEXT NOT NULL,                     -- JSON
  model TEXT DEFAULT 'gpt-4o-mini',
  token_count INTEGER DEFAULT 0,

  created_by TEXT,                           -- users.id (누가 트리거)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                       -- 기본 24h, NULL이면 무한

  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tai_thread_type_created
  ON patient_thread_ai_insights(thread_id, insight_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tai_hospital_created
  ON patient_thread_ai_insights(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tai_expires
  ON patient_thread_ai_insights(expires_at) WHERE expires_at IS NOT NULL;


-- messages 에 첨부 카운트 캐시 (선택)
-- 기존 messages 테이블 변경 없이도 attachments.message_id 조회로 가능하지만
-- 메시지 목록 N+1 방지용으로 attach_count 캐시
ALTER TABLE messages ADD COLUMN attachment_count INTEGER DEFAULT 0;
