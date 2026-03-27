-- 환자 테이블에 데스크 담당자 컬럼 추가
ALTER TABLE patients ADD COLUMN desk_staff TEXT DEFAULT '';
