-- 멀티테넌트 최적화: hospital_id 컬럼은 있으나 인덱스가 없던 테이블들
-- 여러 병원 동시 사용 시 테넌트 필터 쿼리가 풀스캔되는 것을 방지

CREATE INDEX IF NOT EXISTS idx_chat_quick_messages_hospital ON chat_quick_messages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_checklists_hospital ON checklists(hospital_id);
CREATE INDEX IF NOT EXISTS idx_courses_hospital ON courses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_feedback_note_replies_hospital ON feedback_note_replies(hospital_id, note_id);
CREATE INDEX IF NOT EXISTS idx_interviews_hospital ON interviews(hospital_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_hospital ON scheduled_messages(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_invites_hospital ON staff_invites(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_hospital ON trusted_devices(hospital_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_hospital ON user_sessions(hospital_id);

-- 자식 테이블 조인 성능 (병원 규모 커질 때 대비)
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_favorites_user ON knowledge_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_pref_user ON notification_preferences(user_id);
