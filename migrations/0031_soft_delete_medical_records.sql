-- ════════════════════════════════════════════════════════════════
-- 0031: 의료법 준수 - 환자/상담 기록 소프트 딜리트 전환
-- 의료법 제22조: 진료기록부 5년 보존 의무
-- 개인정보보호법: 삭제 요청 시 별도 보관소 이동 필요
-- ════════════════════════════════════════════════════════════════

-- 1. consult_records (상담 기록) - 소프트 딜리트 컬럼
ALTER TABLE consult_records ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE consult_records ADD COLUMN deleted_at TEXT DEFAULT '';
ALTER TABLE consult_records ADD COLUMN deleted_by TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_cr_is_deleted ON consult_records(hospital_id, is_deleted);

-- 2. call_records (콜 기록) - 환자 상담 이력의 일종
ALTER TABLE call_records ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE call_records ADD COLUMN deleted_at TEXT DEFAULT '';
ALTER TABLE call_records ADD COLUMN deleted_by TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_call_is_deleted ON call_records(hospital_id, is_deleted);

-- 3. complaints (컴플레인 - 환자 클레임 기록)
ALTER TABLE complaints ADD COLUMN is_deleted INTEGER DEFAULT 0;
ALTER TABLE complaints ADD COLUMN deleted_at TEXT DEFAULT '';
ALTER TABLE complaints ADD COLUMN deleted_by TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_complaints_is_deleted ON complaints(hospital_id, is_deleted);

-- patients 테이블은 이미 status='inactive' 패턴으로 소프트 딜리트 적용 중
