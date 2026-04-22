-- v4.5.0 성능 최적화: 누락된 인덱스 보강
-- 6,000 병원 × 각 20명 × 월 1000건 게시글 규모에서도 빠르게

-- posts: 게시판별 조회 (hospital_id + board_type + 정렬)
CREATE INDEX IF NOT EXISTS idx_posts_hospital_board_created 
  ON posts(hospital_id, board_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hospital_pinned 
  ON posts(hospital_id, is_pinned DESC, created_at DESC);

-- comments: 게시글별 댓글 (post_id)
CREATE INDEX IF NOT EXISTS idx_comments_post_created 
  ON comments(post_id, created_at);

-- post_likes: 좋아요 조회
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post 
  ON post_likes(user_id, post_id);

-- attendance: 병원 + 날짜 복합 조회
CREATE INDEX IF NOT EXISTS idx_attendance_hospital_date 
  ON attendance(hospital_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date 
  ON attendance(user_id, date);

-- meetings: 월별 조회
CREATE INDEX IF NOT EXISTS idx_meetings_hospital_date 
  ON meetings(hospital_id, meeting_date DESC);

-- patient_funnel: 퍼널 분석
CREATE INDEX IF NOT EXISTS idx_patient_funnel_hospital 
  ON patient_funnel(hospital_id, current_stage);
CREATE INDEX IF NOT EXISTS idx_patient_funnel_hospital_created 
  ON patient_funnel(hospital_id, created_at DESC);

-- chat_messages: 채팅방별 메시지 시간순
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created 
  ON chat_messages(room_id, created_at DESC);

-- call_records: 통화 이력 (call_date 사용)
CREATE INDEX IF NOT EXISTS idx_call_records_hospital_date 
  ON call_records(hospital_id, call_date DESC);

-- consult_records: 상담 이력 (record_date 사용)
CREATE INDEX IF NOT EXISTS idx_consult_hospital_date 
  ON consult_records(hospital_id, record_date DESC);

-- leave_requests: 휴가 조회
CREATE INDEX IF NOT EXISTS idx_leave_hospital_status 
  ON leave_requests(hospital_id, status, start_date);

-- feedback_notes: 목록 조회 (병원 + 생성일)
CREATE INDEX IF NOT EXISTS idx_feedback_hospital_created 
  ON feedback_notes(hospital_id, created_at DESC);

-- survey_sends: 상태별 조회
CREATE INDEX IF NOT EXISTS idx_survey_sends_batch_status 
  ON survey_sends(batch_id, status);

-- gamification_progress: 사용자별 진행 상황
CREATE INDEX IF NOT EXISTS idx_gami_progress_user_mission 
  ON gamification_progress(user_id, mission_id);

-- patients: 마지막 방문일 기준 정렬
CREATE INDEX IF NOT EXISTS idx_patients_hospital_last_visit 
  ON patients(hospital_id, last_visit_date DESC);

-- events: 캘린더 조회
CREATE INDEX IF NOT EXISTS idx_events_hospital_date 
  ON events(hospital_id, start_date);

-- recall_tasks: 리콜 태스크 필터 (scheduled_date 사용)
CREATE INDEX IF NOT EXISTS idx_recall_tasks_hospital_status 
  ON recall_tasks(hospital_id, status, scheduled_date);

-- error_logs: 최근 에러 조회
CREATE INDEX IF NOT EXISTS idx_error_logs_created 
  ON error_logs(created_at DESC);
