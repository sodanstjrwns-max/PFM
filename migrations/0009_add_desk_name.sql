-- 상담 기록에 데스크 담당자 컬럼 추가
ALTER TABLE consult_records ADD COLUMN desk_name TEXT DEFAULT '';
