-- =============================================
-- h-demo 병원의 모든 데이터 완전 삭제
-- (hospital 레코드와 user 레코드 포함)
-- =============================================

-- FK 체크 끄기
PRAGMA foreign_keys = OFF;

-- 자식 테이블 먼저 삭제 (FK 의존성 순서)
DELETE FROM chat_reads WHERE room_id IN (SELECT id FROM chat_rooms WHERE hospital_id = 'h-demo');
DELETE FROM chat_messages WHERE room_id IN (SELECT id FROM chat_rooms WHERE hospital_id = 'h-demo');
DELETE FROM chat_members WHERE room_id IN (SELECT id FROM chat_rooms WHERE hospital_id = 'h-demo');
DELETE FROM chat_rooms WHERE hospital_id = 'h-demo';
DELETE FROM chat_quick_messages WHERE hospital_id = 'h-demo';

DELETE FROM consultation_notes WHERE hospital_id = 'h-demo';
DELETE FROM consultations WHERE hospital_id = 'h-demo';
DELETE FROM consult_records WHERE hospital_id = 'h-demo';

DELETE FROM meeting_minutes WHERE hospital_id = 'h-demo';
DELETE FROM meeting_participants WHERE hospital_id = 'h-demo';
DELETE FROM meetings WHERE hospital_id = 'h-demo';

DELETE FROM leave_requests WHERE hospital_id = 'h-demo';
DELETE FROM leave_balances WHERE hospital_id = 'h-demo';

DELETE FROM kanban_cards WHERE hospital_id = 'h-demo';
DELETE FROM kanban_boards WHERE hospital_id = 'h-demo';

DELETE FROM treatment_board WHERE hospital_id = 'h-demo';
DELETE FROM chairs WHERE hospital_id = 'h-demo';
DELETE FROM attendance WHERE hospital_id = 'h-demo';

DELETE FROM call_records WHERE hospital_id = 'h-demo';
DELETE FROM complaints WHERE hospital_id = 'h-demo';
DELETE FROM daily_records WHERE hospital_id = 'h-demo';
DELETE FROM reservation_records WHERE hospital_id = 'h-demo';
DELETE FROM wait_time_records WHERE hospital_id = 'h-demo';
DELETE FROM parking_records WHERE hospital_id = 'h-demo';
DELETE FROM kpi_targets WHERE hospital_id = 'h-demo';

DELETE FROM fee_items WHERE hospital_id = 'h-demo';
DELETE FROM fee_categories WHERE hospital_id = 'h-demo';
DELETE FROM patient_funnel WHERE hospital_id = 'h-demo';
DELETE FROM patients WHERE hospital_id = 'h-demo';

DELETE FROM categories WHERE hospital_id = 'h-demo';
DELETE FROM scripts WHERE hospital_id = 'h-demo';
DELETE FROM pricing WHERE hospital_id = 'h-demo';
DELETE FROM materials WHERE hospital_id = 'h-demo';

DELETE FROM survey_responses WHERE survey_id IN (SELECT id FROM surveys WHERE hospital_id = 'h-demo');
DELETE FROM survey_sends WHERE survey_id IN (SELECT id FROM surveys WHERE hospital_id = 'h-demo');
DELETE FROM surveys WHERE hospital_id = 'h-demo';

DELETE FROM review_management WHERE hospital_id = 'h-demo';
DELETE FROM reviews WHERE hospital_id = 'h-demo';

DELETE FROM gamification_progress WHERE hospital_id = 'h-demo';
DELETE FROM gamification_missions WHERE hospital_id = 'h-demo';

DELETE FROM checklist_logs WHERE hospital_id = 'h-demo';
DELETE FROM checklists WHERE hospital_id = 'h-demo';
DELETE FROM events WHERE hospital_id = 'h-demo';

DELETE FROM course_progress WHERE hospital_id = 'h-demo';
DELETE FROM courses WHERE hospital_id = 'h-demo';

DELETE FROM evaluations WHERE hospital_id = 'h-demo';

DELETE FROM case_images WHERE hospital_id = 'h-demo';
DELETE FROM cases WHERE hospital_id = 'h-demo';

DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE hospital_id = 'h-demo');
DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE hospital_id = 'h-demo');
DELETE FROM posts WHERE hospital_id = 'h-demo';

DELETE FROM marketing_records WHERE hospital_id = 'h-demo';
DELETE FROM marketing_channels WHERE hospital_id = 'h-demo';

DELETE FROM interviews WHERE hospital_id = 'h-demo';
DELETE FROM applicants WHERE hospital_id = 'h-demo';
DELETE FROM job_postings WHERE hospital_id = 'h-demo';
DELETE FROM onboarding_tasks WHERE hospital_id = 'h-demo';
DELETE FROM staff_presets WHERE hospital_id = 'h-demo';
DELETE FROM staff_supplies WHERE hospital_id = 'h-demo';
DELETE FROM staff_invites WHERE hospital_id = 'h-demo';
DELETE FROM temp_staff WHERE hospital_id = 'h-demo';

-- 유저 삭제
DELETE FROM users WHERE hospital_id = 'h-demo';

-- 병원 삭제
DELETE FROM hospitals WHERE id = 'h-demo';

-- 테스트 계정도 삭제
DELETE FROM users WHERE email = 'test_check_12345@test.com';
DELETE FROM hospitals WHERE id = '57450928-da8a-47d0-b496-ff9aee04aff6';

-- 이전 가입 계정도 삭제 (newseoulbd@naver.com)
DELETE FROM users WHERE email = 'newseoulbd@naver.com';
DELETE FROM hospitals WHERE id = 'a399c4e3-cef5-46af-84e8-6e143de0a9a1';

PRAGMA foreign_keys = ON;
