-- =====================================================
-- 0038_patients_funnel.sql
-- Phase C — PFM patients 테이블에 환자 온도/퍼널 단계 추가
-- ─────────────────────────────────────────────────────
-- PFM 의 환자 카드 자체에도 온도/퍼널 표시를 위해 컬럼 추가.
-- patient_threads.temperature/funnel_stage 와 양방향 동기화.
-- 기존 데이터는 cold/1 로 시작.
-- =====================================================

ALTER TABLE patients ADD COLUMN temperature TEXT DEFAULT 'cold';
ALTER TABLE patients ADD COLUMN funnel_stage INTEGER DEFAULT 1;
ALTER TABLE patients ADD COLUMN temperature_updated_at DATETIME;
ALTER TABLE patients ADD COLUMN funnel_stage_updated_at DATETIME;

-- 단계별 환자 수 집계용
CREATE INDEX IF NOT EXISTS idx_patients_hospital_temp
  ON patients(hospital_id, temperature)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_patients_hospital_stage
  ON patients(hospital_id, funnel_stage)
  WHERE status = 'active';

-- 기존 환자들에 기본값 보정 (NULL 방어)
UPDATE patients SET temperature = 'cold' WHERE temperature IS NULL OR temperature = '';
UPDATE patients SET funnel_stage = 1 WHERE funnel_stage IS NULL OR funnel_stage < 1;
