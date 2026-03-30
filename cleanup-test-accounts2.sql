-- Remove test user only (hospital stays as empty shell, no harm)
DELETE FROM users WHERE email='test_check_12345@test.com';
-- Remove old newseoulbd user only
DELETE FROM users WHERE email='newseoulbd@naver.com';
