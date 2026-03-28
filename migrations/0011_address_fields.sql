-- 환자 주소 구조화 (도/시, 시/군/구, 상세주소)
ALTER TABLE patients ADD COLUMN addr_sido TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN addr_sigungu TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN addr_detail TEXT DEFAULT '';

-- 지역별 인덱스
CREATE INDEX IF NOT EXISTS idx_patients_sido ON patients(hospital_id, addr_sido);
CREATE INDEX IF NOT EXISTS idx_patients_sigungu ON patients(hospital_id, addr_sido, addr_sigungu);
