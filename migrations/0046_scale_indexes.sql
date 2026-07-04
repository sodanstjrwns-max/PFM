-- v5.11 수천 명 스케일 검증에서 발견된 정렬/조회 최적화
-- (부하 감사: 병원 40곳 × 직원 1,095명 × 메시지 118k × 환자 27.5k 시드 기준)

-- 환자 목록 페이지: hospital_id 필터 + created_at DESC 정렬이 TEMP B-TREE 를 타던 것 제거
CREATE INDEX IF NOT EXISTS idx_patients_hospital_created ON patients(hospital_id, created_at DESC);

-- 구 채팅 unread 배지 (15초 주기 백그라운드 폴링): 발신자 제외 카운트 최적화
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_sender ON chat_messages(room_id, sender_id, created_at);

-- 상담 기록 목록: 병원 + 날짜 역순 (기본 목록 쿼리)
CREATE INDEX IF NOT EXISTS idx_consult_hospital_date ON consult_records(hospital_id, record_date DESC);

-- 콜 기록 목록: 병원 + 유형 + 날짜 역순
CREATE INDEX IF NOT EXISTS idx_calls_hospital_type_date ON call_records(hospital_id, call_type, call_date DESC);
