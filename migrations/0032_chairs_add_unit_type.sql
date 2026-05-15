-- 진료 유닛 범용화: 치과(체어), 피부과(베드/처치실), 일반(진료실/수술실) 모두 지원
-- chairs 테이블 그대로 유지하되 unit_type 컬럼 추가

ALTER TABLE chairs ADD COLUMN unit_type TEXT DEFAULT 'chair';
-- unit_type 예시: 'chair'(체어), 'bed'(베드), 'room'(진료실/처치실), 'surgery'(수술실), 'consult'(상담실), 'other'

CREATE INDEX IF NOT EXISTS idx_chairs_unit_type ON chairs(hospital_id, unit_type, is_active);
