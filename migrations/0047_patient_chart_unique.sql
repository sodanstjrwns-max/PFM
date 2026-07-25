-- 0047: 차트번호 중복 방지 (v5.12)
--
-- 배경: 실사용 시뮬레이션에서 환자 등록 버튼을 연타하면
--   동일 (병원, 차트번호) 환자가 5건까지 그대로 쌓였다.
--   데스크에서 응답이 늦을 때 실제로 자주 일어나는 상황이며,
--   중복 환자는 곧 상담/수납/리콜 통계 오염으로 이어진다.
--
-- 방침: 차트번호는 병원 내 유일해야 한다. 다만 차트번호를 아직 안 딴
--   환자(빈 문자열)는 여럿일 수 있으므로 부분 인덱스로 빈 값은 제외한다.

-- 기존 중복 데이터가 있으면 인덱스 생성이 실패하므로, 가장 오래된 1건만 남기고 정리.
DELETE FROM patients
WHERE chart_number IS NOT NULL
  AND chart_number != ''
  AND rowid NOT IN (
    SELECT MIN(rowid) FROM patients
    WHERE chart_number IS NOT NULL AND chart_number != ''
    GROUP BY hospital_id, chart_number
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_chart_unique
  ON patients(hospital_id, chart_number)
  WHERE chart_number IS NOT NULL AND chart_number != '';
