-- Remove test account
DELETE FROM users WHERE email='test_check_12345@test.com';
DELETE FROM hospitals WHERE id='57450928-da8a-47d0-b496-ff9aee04aff6';

-- Remove old newseoulbd account
DELETE FROM users WHERE email='newseoulbd@naver.com';
DELETE FROM hospitals WHERE id='a399c4e3-cef5-46af-84e8-6e143de0a9a1';
