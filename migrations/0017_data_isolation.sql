-- ════════════════════════════════════════════════════════════════
-- v2.5 데이터 격리 강화: 모든 자식 테이블에 hospital_id 추가
-- 병원 간 데이터 절대 혼재 방지
-- ════════════════════════════════════════════════════════════════

-- 1. comments: 게시글 댓글 (부모: posts)
ALTER TABLE comments ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_comments_hospital ON comments(hospital_id);

-- 2. post_likes: 좋아요 (부모: posts)
ALTER TABLE post_likes ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_post_likes_hospital ON post_likes(hospital_id);

-- 3. case_images: 케이스 사진 (부모: cases)
ALTER TABLE case_images ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_case_images_hospital ON case_images(hospital_id);

-- 4. checklist_logs: 체크리스트 완료 기록 (부모: checklists)
ALTER TABLE checklist_logs ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_checklist_logs_hospital ON checklist_logs(hospital_id);

-- 5. meeting_participants: 회의 참석자 (부모: meetings)
ALTER TABLE meeting_participants ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_meeting_participants_hospital ON meeting_participants(hospital_id);

-- 6. meeting_minutes: 회의록 (부모: meetings)
ALTER TABLE meeting_minutes ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_hospital ON meeting_minutes(hospital_id);

-- 7. consultation_notes: 상담 노트 (부모: consultations)
ALTER TABLE consultation_notes ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_consultation_notes_hospital ON consultation_notes(hospital_id);

-- 8. course_progress: 교육 진행 (부모: courses)
ALTER TABLE course_progress ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_course_progress_hospital ON course_progress(hospital_id);

-- 9. evaluations: 지원자 평가 (부모: applicants)
ALTER TABLE evaluations ADD COLUMN hospital_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_evaluations_hospital ON evaluations(hospital_id);

-- ═══ 기존 데이터 hospital_id 백필 (부모 테이블에서 가져오기) ═══
UPDATE comments SET hospital_id = (SELECT p.hospital_id FROM posts p WHERE p.id = comments.post_id) WHERE hospital_id = '';
UPDATE post_likes SET hospital_id = (SELECT p.hospital_id FROM posts p WHERE p.id = post_likes.post_id) WHERE hospital_id = '';
UPDATE case_images SET hospital_id = (SELECT c.hospital_id FROM cases c WHERE c.id = case_images.case_id) WHERE hospital_id = '';
UPDATE checklist_logs SET hospital_id = (SELECT c.hospital_id FROM checklists c WHERE c.id = checklist_logs.checklist_id) WHERE hospital_id = '';
UPDATE meeting_participants SET hospital_id = (SELECT m.hospital_id FROM meetings m WHERE m.id = meeting_participants.meeting_id) WHERE hospital_id = '';
UPDATE meeting_minutes SET hospital_id = (SELECT m.hospital_id FROM meetings m WHERE m.id = meeting_minutes.meeting_id) WHERE hospital_id = '';
UPDATE consultation_notes SET hospital_id = (SELECT c.hospital_id FROM consultations c WHERE c.id = consultation_notes.consultation_id) WHERE hospital_id = '';
UPDATE course_progress SET hospital_id = (SELECT c.hospital_id FROM courses c WHERE c.id = course_progress.course_id) WHERE hospital_id = '';
UPDATE evaluations SET hospital_id = (SELECT a.hospital_id FROM applicants a WHERE a.id = evaluations.applicant_id) WHERE hospital_id = '';
