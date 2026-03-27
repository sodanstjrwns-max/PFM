-- ═══ 상담 기록에 내원 경로 컬럼 추가 ═══
-- 환자가 어떤 경로로 내원했는지 추적

ALTER TABLE consult_records ADD COLUMN visit_source TEXT DEFAULT '';
-- visit_source: 'referral'=소개, 'online_naver'=네이버, 'online_google'=구글,
--   'online_youtube'=유튜브, 'online_insta'=인스타그램, 'online_etc'=기타온라인,
--   'walk_in'=통행, 'hospital_referral'=타병원의뢰, 'recall'=리콜, 'etc'=기타
CREATE INDEX IF NOT EXISTS idx_cr_visit_source ON consult_records(hospital_id, visit_source);
