DELETE FROM consultations WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM reviews WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM materials WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM scripts WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM posts WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM checklists WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM cases WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM consult_records WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM recall_tasks WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM surveys WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM kanban_cards WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM kanban_boards WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
DELETE FROM fee_items WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-35cb4646c522bde5da0e', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '김민수', '010-5506-5012',
'34', 'male', 'instagram', 'endo', 'reserved',
800000, 0, 0,
'2026-03-12', 'test-desk-001', 'normal', '2026-03-12 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-0051151ebf73123bdf86', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '이서연', '010-1488-2535',
'33', 'male', 'naver', 'general', 'completed',
800000, 800000, 800000,
'2026-04-16', 'test-desk-001', 'high', '2026-04-16 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-b28631a99bfae5301e08', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '박준호', '010-8359-5557',
'20', 'male', 'homepage', 'prosth', 'completed',
3500000, 3500000, 3500000,
'2026-03-07', 'test-desk-001', 'normal', '2026-03-07 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-955c179e2eee803c209e', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '최수빈', '010-2674-2519',
'44', 'male', 'kakao', 'perio', 'consulting',
6000000, 0, 0,
'2026-04-12', 'test-desk-001', 'normal', '2026-04-12 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-696b95150ff1c56c0546', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '정재훈', '010-8527-9785',
'27', 'female', 'instagram', 'general', 'agreed',
800000, 800000, 240000,
'2026-03-14', 'test-desk-001', 'normal', '2026-03-14 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-d45ecad2c23446ac8ba6', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '한지우', '010-2139-1750',
'62', 'male', 'phone', 'implant', 'payment',
3500000, 3500000, 3500000,
'2026-03-12', 'test-desk-001', 'high', '2026-03-12 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-cb950b0c5298f4121cfe', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '오예린', '010-8428-6977',
'30', 'female', 'kakao', 'ortho', 'completed',
4500000, 4500000, 4500000,
'2026-04-15', 'test-desk-001', 'normal', '2026-04-15 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-ce0f669eaf0185df087b', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '윤도현', '010-9751-5010',
'30', 'female', 'homepage', 'prosth', 'reserved',
2800000, 0, 0,
'2026-03-08', 'test-desk-001', 'normal', '2026-03-08 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-3641e6bfa8d193f8332b', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '임채원', '010-4752-1525',
'40', 'female', 'phone', 'implant', 'payment',
800000, 800000, 800000,
'2026-04-07', 'test-desk-001', 'high', '2026-04-07 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-67420d34d32ebcd601f1', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '강다은', '010-9179-7482',
'61', 'female', 'referral', 'prosth', 'payment',
3500000, 3500000, 3500000,
'2026-03-16', 'test-desk-001', 'high', '2026-03-16 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-e80b0b8d6bb21d25b82b', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '조민재', '010-7543-6930',
'34', 'male', 'blog', 'implant', 'agreed',
12000000, 12000000, 3600000,
'2026-04-06', 'test-desk-001', 'urgent', '2026-04-06 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-829068ba280c334c1bf8', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '서유나', '010-7916-2040',
'44', 'female', 'blog', 'general', 'visited',
2800000, 0, 0,
'2026-04-14', 'test-desk-001', 'normal', '2026-04-14 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-c9d9f67160c143d23c6a', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '백승우', '010-9797-5371',
'61', 'female', 'instagram', 'prosth', 'inquiry',
1500000, 0, 0,
'2026-03-17', 'test-desk-001', 'normal', '2026-03-17 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-bc646522f35fb859768c', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '나혜린', '010-5315-9201',
'31', 'male', 'phone', 'perio', 'lost',
800000, 0, 0,
'2026-04-11', 'test-desk-001', 'normal', '2026-04-11 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-b933cbd4c49e92e2faf7', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '문지훈', '010-7126-3646',
'54', 'male', 'kakao', 'esthetic', 'consulting',
2800000, 0, 0,
'2026-03-14', 'test-desk-001', 'urgent', '2026-03-14 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-88023b50c20ce165526c', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '홍은서', '010-4923-1949',
'35', 'male', 'instagram', 'endo', 'payment',
4500000, 4500000, 4500000,
'2026-04-14', 'test-desk-001', 'normal', '2026-04-14 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-be6c343dd622c6891c26', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '송재민', '010-8787-3705',
'36', 'female', 'walk_in', 'general', 'visited',
2800000, 0, 0,
'2026-04-17', 'test-desk-001', 'high', '2026-04-17 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-88cf2ae440e12a3d89e6', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '안수아', '010-7118-8177',
'53', 'female', 'instagram', 'ortho', 'agreed',
12000000, 12000000, 3600000,
'2026-03-07', 'test-desk-001', 'high', '2026-03-07 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-d57b5baa3d30064d97e8', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '구현우', '010-4770-4608',
'20', 'male', 'naver', 'ortho', 'payment',
800000, 800000, 800000,
'2026-04-17', 'test-desk-001', 'urgent', '2026-04-17 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-b86113c492a2828f2763', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '류지영', '010-9423-4899',
'37', 'female', 'walk_in', 'general', 'payment',
1500000, 1500000, 1500000,
'2026-04-19', 'test-desk-001', 'high', '2026-04-19 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-70379ff02d7984ca9d7d', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '전하은', '010-8749-7669',
'32', 'male', 'instagram', 'endo', 'lost',
3500000, 0, 0,
'2026-03-16', 'test-desk-001', 'normal', '2026-03-16 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-c1c0b46a5149e4acb3ff', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '양도윤', '010-8651-1887',
'63', 'male', 'naver', 'esthetic', 'completed',
12000000, 12000000, 12000000,
'2026-03-30', 'test-desk-001', 'normal', '2026-03-30 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-d336ab154b7e08b62f53', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '배서윤', '010-4116-9786',
'48', 'male', 'homepage', 'ortho', 'consulting',
3500000, 0, 0,
'2026-04-15', 'test-desk-001', 'normal', '2026-04-15 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-5cf4c2bbd2ff61f45780', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '황민준', '010-8260-2604',
'23', 'male', 'instagram', 'perio', 'consulting',
1500000, 0, 0,
'2026-03-23', 'test-desk-001', 'high', '2026-03-23 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-f4748e94aedcdabe3de6', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '노아린', '010-8886-4502',
'45', 'male', 'referral', 'esthetic', 'completed',
18000000, 18000000, 18000000,
'2026-04-11', 'test-desk-001', 'urgent', '2026-04-11 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-ba20e34d894a3f5cdf95', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '황태현', '010-5673-7930',
'64', 'female', 'referral', 'ortho', 'agreed',
18000000, 18000000, 5400000,
'2026-03-28', 'test-desk-001', 'normal', '2026-03-28 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-6da2cf57c48460ba2bb8', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '유예은', '010-6138-1936',
'23', 'female', 'referral', 'implant', 'inquiry',
800000, 0, 0,
'2026-04-08', 'test-desk-001', 'normal', '2026-04-08 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-a24547806a18b0df9235', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '심재호', '010-2113-4853',
'45', 'male', 'walk_in', 'general', 'visited',
1500000, 0, 0,
'2026-04-16', 'test-desk-001', 'normal', '2026-04-16 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-2d0bfbe99c59d389f062', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '조윤서', '010-9565-6183',
'36', 'male', 'kakao', 'ortho', 'reserved',
12000000, 0, 0,
'2026-04-19', 'test-desk-001', 'normal', '2026-04-19 14:00:00');
INSERT INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, assigned_counselor, priority, created_at) VALUES (
'con-93d86203625bca13415c', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', '김도영', '010-8491-6180',
'24', 'male', 'blog', 'general', 'visited',
4500000, 0, 0,
'2026-03-27', 'test-desk-001', 'normal', '2026-03-27 14:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-9b61695725898a2c75aa','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','김민수',5,'친절하게 설명해주셔서 감사합니다. 시설도 깨끗해요','','2026-04-14','2026-04-14 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-b1349534ea5ac3e5348a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','이서연',5,'원장님이 아프지 않게 잘해주셔서 너무 좋았어요','','2026-03-17','2026-03-17 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-cb3c93a1362d21be40f2','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','박준호',4,'대기시간이 조금 길었지만 진료는 만족스러웠습니다','','2026-03-19','2026-03-19 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-800eb29c22a7057c57e5','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','최수빈',5,'스켈링 받았는데 아주 시원하고 깔끔합니다','','2026-04-12','2026-04-12 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-0281360840661fcaccdc','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','정재훈',5,'임플란트 상담받았는데 자세히 알려주셔서 결정했어요','','2026-02-23','2026-02-23 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-5c1e7b5b20e33d941114','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','한지우',5,'원장님 실력이 정말 좋으시네요. 추천합니다','','2026-02-23','2026-02-23 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-4b97bcea5d0d3db5196f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','오예린',5,'데스크 직원분이 너무 친절하세요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-03-28','2026-03-28 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-6576d7494972ca6607f3','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','윤도현',3,'주차가 좀 불편했어요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-04-10','2026-04-10 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-4d6951e105a7046766bb','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','임채원',5,'치료 후 통증 관리도 잘 알려주셔서 편했습니다','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-02-26','2026-02-26 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-6bedbd393458a4461935','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','강다은',5,'아이가 울지 않고 진료 받았어요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-03-06','2026-03-06 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-76195bc7c801985a7d55','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','조민재',5,'진료실 분위기가 아늑하고 좋아요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-03-12','2026-03-12 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-af43851bbd05281be5ac','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','서유나',4,'예약 시간이 잘 지켜져서 좋았어요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-03-18','2026-03-18 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-a2769582725f80f24846','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','백승우',4,'비용이 좀 부담스러웠지만 만족합니다','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-03-09','2026-03-09 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-4a56b3866b11251d4d71','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','나혜린',5,'다시 방문하고 싶은 치과에요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-04-01','2026-04-01 10:00:00');
INSERT INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date, created_at) VALUES (
'rv-d9ae377dce0dc1a17c8f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','문지훈',5,'설명이 이해하기 쉽게 잘 해주셔요','감사합니다! 앞으로도 최선을 다하겠습니다 :)','2026-04-14','2026-04-14 10:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-19a4b1958b742c36eb14','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-implant','임플란트 수술 전 주의사항','수술 24시간 전부터 음주/흡연 금지. 당일 가벼운 식사 가능','pdf',74,0,'2026-02-08 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-47dba6d1d17e76a769ec','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-implant','임플란트 식립 과정 안내','1단계 진단 → 2단계 임플란트 식립 → 3단계 보철 장착','pdf',298,1,'2026-03-20 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-b6b99bad8a62b5207703','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-implant','뼈이식이 필요한 경우','잇몸뼈가 부족한 경우 자가뼈/동종골을 이용합니다','pdf',154,2,'2026-03-08 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-4d88ab58cbd44a093930','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-cavity','충치 치료 단계별 안내','신경을 건드리지 않는 경미한 충치는 1회 내원으로 치료','image',324,3,'2026-02-03 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-b3687fc333d6528947ba','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-cavity','신경치료 과정','3-4회 내원이 필요하며 통증 관리를 위해 진통제 처방','pdf',190,4,'2026-02-22 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-ab8e5fed1572b9d2293b','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-prosth','크라운 치료 이해하기','신경치료 후 반드시 크라운이 필요한 이유','pdf',339,5,'2026-02-23 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-e37eceabe391124ef1a0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-prosth','라미네이트 vs 올세라믹','심미 크라운 재료별 장단점 비교표','pdf',273,6,'2026-02-08 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-3862cb47b80f0b1c935a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-ortho','투명교정 vs 철사교정','투명교정은 탈착 가능, 철사교정은 효과 확실','pdf',143,7,'2025-12-12 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-124250c9c53342ab8b2d','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-perio','잇몸병 4단계','치은염 → 초기 치주염 → 중기 치주염 → 말기','image',62,8,'2026-04-03 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-d6f18aae911260ccf2d8','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-extract','발치 후 주의사항','거즈 2시간 물고 있기, 침 삼키지 말기','pdf',231,9,'2025-11-05 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-ebadca850b00f30dc16f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-extract','사랑니 발치 가이드','매복 사랑니는 CT 촬영 후 진료 결정','pdf',37,10,'2026-02-05 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-8848522e411cb59ca1a9','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-pedo','어린이 구강 검진 시기','첫 치아가 나면 6개월 이내 첫 방문 권장','image',185,11,'2026-04-16 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-3af931e2ba79a2893ea6','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-hygiene','올바른 칫솔질 방법','바스법: 45도 각도로 치아-잇몸 경계 진동','video',149,12,'2026-03-14 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-d27d54c1a8529e887460','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-esthetic','치아 미백 과정','병원 미백 1회 + 가정용 키트 2주 병행','pdf',241,13,'2026-03-06 09:00:00');
INSERT INTO materials (id,hospital_id,category_id,title,description,file_type,view_count,sort_order,created_at) VALUES (
'mt-136b8c1b2dcda697c3d0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','mat-tmj','턱관절 장애 자가진단','입 벌릴 때 소리 + 통증 + 제한 중 2개 이상 시 진료','pdf',233,14,'2025-11-26 09:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-ba497fdda44a8176e7c1','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-implant','임플란트 가격 문의 대응','"임플란트 얼마예요?"','가격보다는 수명과 안전성 먼저 설명드려요. "저희 병원은 OOO 임플란트를 사용하고, 10년 보증을 해드립니다..."','비싸네요','네, 솔직히 비싸긴 하죠. 하지만 자연치아와 가장 비슷하게 쓸 수 있어요',0,'2026-01-30 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-a693ea2b7245e8daaa32','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-implant','뼈이식 필요 설명','CT에서 뼈 부족 발견','"임플란트는 단단한 뼈에 고정되어야 오래 쓸 수 있어요..."','꼭 해야 하나요','필수는 아니지만, 뼈이식 없이 하면 임플란트 수명이 절반으로 줄어요',1,'2026-04-10 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-161969a14430f499d44c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-implant','즉시 심기 vs 2단계','발치 후 바로 심기 선호','"치아 뽑은 자리에 바로 심는 방법이 있지만..."','빨리 끝내고 싶어요','즉시식립은 조건이 맞을 때만 가능해요. CT 먼저 보겠습니다',2,'2026-03-28 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-af04a151d4d66cf94563','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-cavity','신경치료 필요성 설명','"꼭 신경치료 해야 해요?"','신경이 이미 감염됐기 때문에 안 하면 농이 생겨요','통증이 없어요','지금은 없어도 갑자기 부을 수 있어요. 미리 치료가 안전해요',3,'2026-04-02 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-39eab510f91f3746b0a5','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-cavity','충치 예방 상담','스케일링 내원 환자','"충치는 생기기 전에 예방이 제일 중요해요..."','','',4,'2026-03-23 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-3af043f744fee850f786','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-prosth','크라운 vs 인레이 비교','큰 충치 치료 후','"충치가 큰 경우 인레이만으로 부족할 수 있어요..."','비용 차이는','크라운이 2배 비싸지만 수명이 3배 길어요',5,'2026-02-01 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-4408c61ebe085ee10bd3','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-prosth','라미네이트 상담','앞니 심미 개선','"라미네이트는 치아를 덜 깎고 자연스러워요..."','통증 있나요','마취하고 하니까 전혀 안 아파요',6,'2026-04-07 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-5aa4875d667b70f56b5a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-ortho','성인 교정 상담','"30살인데 해도 돼요?"','교정은 나이 제한이 없어요. 치아뿌리가 건강하면 가능','기간은','성인은 평균 24개월, 발치여부에 따라 다릅니다',7,'2026-02-23 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-b5f53d10dc39aac2583a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-ortho','투명교정 장단점','심미적 선호 환자','"투명교정은 탈착 가능한 게 장점이에요..."','확실해요','케이스에 따라 다르지만 경미한 경우 충분합니다',8,'2026-01-27 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-d0a505569bde74584fd4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-esthetic','미백 상담','변색된 앞니','"미백은 과산화수소로 치아 속 색소를 분해하는 방식..."','오래 가나요','6개월~1년 유지. 관리하면 더 오래갑니다',9,'2026-01-31 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-8dfe44fda0340d8df96a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-esthetic','치아 성형 상담','치아 모양 개선','"조금만 깎거나 레진으로 모양을 바꿀 수 있어요..."','','',10,'2026-03-24 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-a7a40c8cf653657dddf0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-objection','비싸다는 반응','가격 문의 후 망설임','"네, 비용 부담되시죠. 저희 무이자 할부 가능해요..."','무이자 최대','최대 24개월 카드 무이자 가능합니다',11,'2026-02-15 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-4d8d388b654ee28a37f0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-objection','생각해볼게요 응대','즉답 회피 환자','"네, 충분히 고민하세요. 다만 치료는 빠를수록..."','언제까지','이번주 안에 결정 주시면 예약 잡아드릴게요',12,'2026-03-26 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-44289174b3f1bcf2e3fb','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-objection','다른 병원과 비교','가격/시스템 비교 시도','"어디서 상담 받으셨는지 편하게 말씀 주세요..."','','',13,'2026-04-06 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-4107dea1cb72e5b519aa','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-implant','임플란트 보증 안내','장기 보증 문의','"저희 병원은 10년 보증 제도가 있어요..."','조건은','정기검진 유지 시 10년 보증 적용됩니다',14,'2026-03-03 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-722626c7f20cbe12302a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-cavity','레진 vs 아말감','충치 치료 재료 선택','"레진은 색이 치아와 같고, 아말감은 보험 적용..."','','',15,'2026-02-24 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-f8127ce4db34f9105abe','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-prosth','보철 관리법 설명','크라운 장착 후','"크라운은 깨지지 않게 단단한 것 피하세요..."','','',16,'2026-04-06 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-eec7cb031fd1fa6a3672','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-ortho','교정 후 유지 장치','교정 완료 환자','"유지 장치를 안 끼면 다시 돌아갈 수 있어요..."','','',17,'2026-02-25 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-c6fcee36b9f17b417baf','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-esthetic','라미네이트 후 관리','장착 후 주의','"얼음, 사탕 등은 피해주세요. 수명 단축 원인..."','','',18,'2026-03-16 11:00:00');
INSERT INTO scripts (id,hospital_id,category_id,title,situation,script_text,objection,response,sort_order,created_at) VALUES (
'sc-3d39717f8f5e75fc53e9','af4542c2-e55b-41cf-8d5d-805f8294a3d3','scr-objection','가족 상의 필요','결정권자 아님','"네, 가족분과 상의하세요. 저희가 자료 준비해드릴게요..."','','',19,'2026-03-11 11:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-801636592b6a2cc36fce','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','4월 신환 이벤트 안내','이번달 신환분 전원 파노라마 X-ray 무료 촬영',1,1,55,'2026-03-30 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-c17b7153027950e50e97','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','4/25 오후 휴진 안내','학회 참석으로 4월 25일 오후 진료가 휴진입니다',1,8,62,'2026-03-27 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-77abddb9a4f254d02875','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','보험 파일 업데이트','5월부터 새로운 수가 적용됩니다. 교육 참고',1,11,29,'2026-04-01 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-792d6577aad0caeada1c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','직원 복지 개선 - 간식 코너 신설','3층 탕비실에 간식 비치합니다. 자율적으로!',0,2,32,'2026-04-13 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-7e4a69c07de095a57b51','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','4월 생일자 축하 이벤트','김수민 선생님 생일 축하드려요 🎉',0,0,32,'2026-04-07 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-b439e8220922d7d52fdd','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','신규 직원 온보딩 가이드','신입 입사 시 1주 온보딩 프로세스 확인해주세요',0,5,62,'2026-03-28 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-4679af2eb1c7026772e5','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','환자 만족도 설문 - 목표 NPS 70 달성','이번달 NPS 목표 72점 달성했어요! 고생하셨습니다',0,11,41,'2026-03-30 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-f87f2b6eb6ab1ab89ba8','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','수기 기록 중단, 차트 필수 입력','5월부터 모든 기록은 차트에만 입력해주세요',1,2,23,'2026-04-12 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-c9af506b163de2b08c45','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','감염관리 월례 점검 결과','4월 점검 전항목 PASS! 수고 많으셨습니다',0,0,70,'2026-04-08 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,is_pinned,like_count,view_count,created_at) VALUES (
'po-ce81568ac9b36ab21813','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','야간 당직 변경 안내','다음주부터 야간 당직 스케줄이 변경됩니다. 확인',1,3,68,'2026-04-13 09:30:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-1f9b021685f434cf8888','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','오늘 점심 뭐 드실래요? 2층 새 파스타집 어때요','오늘 점심 뭐 드실래요? 2층 새 파스타집 어때요',6,19,'2026-04-10 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-efdb8cd43751da77f9f6','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','515e829a-2a40-48f7-b49e-fef2cabfd23f','감사하게도 환자분이 케이크 가져다 주셨어요 🎂','감사하게도 환자분이 케이크 가져다 주셨어요 🎂',5,17,'2026-04-14 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-a04d0b52a0d70509fe40','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','진료실 에어컨 필터 청소는 누가 예약하셨나요?','진료실 에어컨 필터 청소는 누가 예약하셨나요?',2,9,'2026-04-09 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-28dde8fc1e07decc7810','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','다들 마스크 어떤 거 쓰시는지 궁금해요','다들 마스크 어떤 거 쓰시는지 궁금해요',5,37,'2026-04-13 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-266246047ed5cd862e81','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','오늘 아침 1번 체어 물 안 나와서 확인 부탁드려요','오늘 아침 1번 체어 물 안 나와서 확인 부탁드려요',6,39,'2026-04-09 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-95f3d917719f08864de0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','515e829a-2a40-48f7-b49e-fef2cabfd23f','점심 1시간 > 1시간 30분 변경되나요?','점심 1시간 > 1시간 30분 변경되나요?',0,21,'2026-04-11 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-1bb0e0e3d96e2933b9fe','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','연말 회식 장소 추천받아요','연말 회식 장소 추천받아요',2,7,'2026-04-16 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-7b669eb9c5e3f21ea120','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','임플란트 보증 양식 어디 있나요?','임플란트 보증 양식 어디 있나요?',3,27,'2026-04-18 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-9875b18a3650d93fabc6','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','데스크 프린터 토너 떨어졌어요','데스크 프린터 토너 떨어졌어요',4,37,'2026-04-11 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-5f25cdf63a67b1a7c04c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','3층 세미나실 월요일 몇시에 비어있나요?','3층 세미나실 월요일 몇시에 비어있나요?',4,17,'2026-04-18 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-689612bc3d2d8ac568bf','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','515e829a-2a40-48f7-b49e-fef2cabfd23f','직원 명찰 분실했는데 재발급 절차?','직원 명찰 분실했는데 재발급 절차?',5,32,'2026-04-13 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,like_count,view_count,created_at) VALUES (
'po-1de43b80161270806555','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','구강카메라 SD카드 어디 보관하나요?','구강카메라 SD카드 어디 보관하나요?',6,39,'2026-04-21 14:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-ed13831b03dd88a715eb','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','김수민 칭찬합니다','오늘 까다로운 교정 환자 케어 최고였어요','김수민',8,35,'2026-03-31 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-586bb071f3e752fc6a54','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','이지영 칭찬합니다','전화 예약 3건 연속 퍼펙트, 센스 👍','이지영',12,28,'2026-04-19 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-c2430657c9c988473b1a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','김수민 칭찬합니다','어린이 환자 달래는 스킬이 대단해요','김수민',14,27,'2026-03-31 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-e5a8d9bfe5ab7c3c439f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','이지영 칭찬합니다','컴플레인 한 환자 마음 돌린 거 진짜 고생했어요','이지영',13,34,'2026-04-05 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-6348502551883a59d916','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','김수민 칭찬합니다','기구 세팅 빠르고 정확해서 진료가 매끄러워요','김수민',14,26,'2026-04-11 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-8365e04da933959a4d00','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','이지영 칭찬합니다','퇴근 전 정리 항상 깔끔하게 해주셔서 감사','이지영',6,34,'2026-04-04 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-aa748156204b93a0217d','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','김수민 칭찬합니다','오늘 수술 어시 완벽했어요','김수민',13,19,'2026-03-31 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-db9c6131c490c7c3cd4a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','이지영 칭찬합니다','환자분들 반응 좋다고 후기 여러 건 받았어요','이지영',9,43,'2026-04-02 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-ff3aef6fbd5b4b36603c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','김수민 칭찬합니다','임플란트 환자 설명 잘해서 바로 결정 났어요','김수민',7,26,'2026-03-26 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-1a568b6c38f46e5d343f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','이지영 칭찬합니다','보험 청구 실수 없이 정리 최고입니다','이지영',15,45,'2026-04-15 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-c594880b4eef8ecdb407','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','김수민 칭찬합니다','멸균 체크리스트 빠짐없이 매일 감사','김수민',10,36,'2026-04-02 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-05a8d8db8670e9e63409','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','이지영 칭찬합니다','친절한 응대가 우리 병원 브랜드','이지영',11,38,'2026-04-07 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-be58908529103dd808b3','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','김수민 칭찬합니다','교정 체어사이드 속도 빨라짐, 인정','김수민',13,13,'2026-03-27 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-7b87dde0b02840aae893','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','이지영 칭찬합니다','고령 환자 길 안내까지 최고','이지영',4,23,'2026-04-12 18:00:00');
INSERT INTO posts (id,hospital_id,board_type,author_id,title,content,target_name,like_count,view_count,created_at) VALUES (
'po-7a28b703c3f4779cf9be','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','김수민 칭찬합니다','학회 스터디 발표 준비 너무 잘했어요','김수민',6,20,'2026-03-31 18:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-a4ef2a66af0d80d15acb','af4542c2-e55b-41cf-8d5d-805f8294a3d3','아침 오픈 체크리스트','daily_open','[{"id": 0, "text": "전체 기기 전원 ON", "done": false}, {"id": 1, "text": "에어컨/환기 체크", "done": false}, {"id": 2, "text": "진료실 청소 상태 확인", "done": false}, {"id": 3, "text": "데스크 POS/프린터 확인", "done": false}, {"id": 4, "text": "오늘 환자 스케줄 확인", "done": false}, {"id": 5, "text": "멸균기 가동 확인", "done": false}, {"id": 6, "text": "수도/전기 이상 여부", "done": false}, {"id": 7, "text": "음악/조명 세팅", "done": false}]','2026-04-21 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-45f2e00f2d9cd27e5e8a','af4542c2-e55b-41cf-8d5d-805f8294a3d3','저녁 마감 체크리스트','daily_close','[{"id": 0, "text": "기구 멸균 완료", "done": false}, {"id": 1, "text": "진료실 청소 완료", "done": false}, {"id": 2, "text": "세면대/체어 소독", "done": false}, {"id": 3, "text": "POS 마감", "done": false}, {"id": 4, "text": "금고 확인", "done": false}, {"id": 5, "text": "쓰레기 배출", "done": false}, {"id": 6, "text": "에어컨/전원 OFF", "done": false}, {"id": 7, "text": "문단속", "done": false}]','2026-04-18 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-3be83dcd6ef94ae2edc9','af4542c2-e55b-41cf-8d5d-805f8294a3d3','주간 점검 (금요일)','weekly','[{"id": 0, "text": "에어컨 필터 청소", "done": false}, {"id": 1, "text": "X-ray 기기 캘리브레이션", "done": false}, {"id": 2, "text": "멸균기 내부 청소", "done": false}, {"id": 3, "text": "소모품 재고 확인", "done": false}, {"id": 4, "text": "차트 백업 확인", "done": false}, {"id": 5, "text": "직원 스케줄 조율", "done": false}]','2026-04-15 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-73a5c2fd48e03fa5c202','af4542c2-e55b-41cf-8d5d-805f8294a3d3','감염관리 월례 점검','infection','[{"id": 0, "text": "모든 진료실 멸균 상태", "done": false}, {"id": 1, "text": "기구 보관 순서", "done": false}, {"id": 2, "text": "손세정 시설 점검", "done": false}, {"id": 3, "text": "고위험 오염구역 관리", "done": false}, {"id": 4, "text": "의료폐기물 분리", "done": false}, {"id": 5, "text": "방호복 재고", "done": false}, {"id": 6, "text": "살균 용액 농도 체크", "done": false}]','2026-04-12 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-073965e3d2d34ae71d2d','af4542c2-e55b-41cf-8d5d-805f8294a3d3','신규 직원 온보딩','onboarding','[{"id": 0, "text": "병원 투어", "done": false}, {"id": 1, "text": "시스템 로그인 설정", "done": false}, {"id": 2, "text": "유니폼 지급", "done": false}, {"id": 3, "text": "감염관리 교육", "done": false}, {"id": 4, "text": "1주 멘토 배정", "done": false}, {"id": 5, "text": "1개월 피드백 미팅", "done": false}]','2026-04-09 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-2dbb74091ee059bc2f6c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','수술 전 준비 체크','custom','[{"id": 0, "text": "환자 동의서 확인", "done": false}, {"id": 1, "text": "CT/X-ray 준비", "done": false}, {"id": 2, "text": "수술 기구 세트 멸균", "done": false}, {"id": 3, "text": "약품 재고", "done": false}, {"id": 4, "text": "응급키트 점검", "done": false}, {"id": 5, "text": "어시스트 배정", "done": false}]','2026-04-06 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-74ed61bfd46e6c17057c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','환자 응대 체크 (데스크)','custom','[{"id": 0, "text": "밝은 인사", "done": false}, {"id": 1, "text": "예약 확인", "done": false}, {"id": 2, "text": "문진표 작성 안내", "done": false}, {"id": 3, "text": "대기 시간 안내", "done": false}, {"id": 4, "text": "결제/보험 확인", "done": false}, {"id": 5, "text": "차팅 전달", "done": false}]','2026-04-03 09:00:00');
INSERT INTO checklists (id,hospital_id,title,checklist_type,items,created_at) VALUES (
'ck-ba4a2a8420a0599faf48','af4542c2-e55b-41cf-8d5d-805f8294a3d3','임플란트 상담 체크','custom','[{"id": 0, "text": "CT 촬영 결과 확인", "done": false}, {"id": 1, "text": "뼈 상태 설명", "done": false}, {"id": 2, "text": "비용/보증 안내", "done": false}, {"id": 3, "text": "대체치료 제안", "done": false}, {"id": 4, "text": "사후관리 안내", "done": false}, {"id": 5, "text": "동의서 수령", "done": false}]','2026-03-31 09:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-0c73344f49602bc384fe','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-implant','상악 구치부 임플란트 2본','45세 남성, 어금니 결손 2개 임플란트 식립','45','male','3개월','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,26,'2026-03-05 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-b12efe4e2b53de51a261','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-implant','하악 전체 임플란트 4본 All-on-4','60대 남성, 틀니 사용 → 고정성 보철','62','male','6개월','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,82,'2026-03-31 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-43c8ce94d81492e62c60','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-implant','단일 임플란트 즉시식립','30대 여성, 발치 후 즉시식립','35','female','2개월','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,176,'2025-12-11 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-834c51a71b8c3cca0661','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-resin','전치부 레진 수복','20대 여성, 앞니 미세 충치 심미 수복','25','female','1일','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,136,'2026-03-24 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-254f0e9b6c5d98c1da85','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-resin','다발성 레진 미백 효과','40대 여성, 변색 치아 6개 레진 수복','42','female','2주','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,167,'2025-12-26 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-7a677e9be0584b5e820b','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-prosth','올세라믹 크라운 2개','30대 여성, 앞니 크라운 교체','33','female','2주','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,118,'2026-02-21 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-54ef7cb77c0da84d92a5','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-prosth','라미네이트 6개','30대 여성, 웨딩 앞서 라미네이트','29','female','4주','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,122,'2025-12-06 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-f9537d0e9cebfc4a30f9','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-ortho','성인 투명교정','20대 여성, 경미한 앞니 돌출 교정','26','female','14개월','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,57,'2026-02-08 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-ca899978342a9e2cde12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-ortho','청소년 금속교정','16세 남성, 부정교합 전체 교정','16','male','22개월','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,21,'2025-10-26 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-29591f1bd408a9b7f2ca','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-endo','재근관치료','50대 남성, 기존 신경치료 실패 후 재치료','52','male','4주','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,128,'2026-03-15 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-74bcdc242a8b788fa428','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-perio','치주수술 풀마우스','50대 여성, 말기 치주염 전체 수술','55','female','3개월','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,65,'2026-02-14 15:00:00');
INSERT INTO cases (id,hospital_id,category_id,title,description,patient_age,patient_gender,treatment_period,created_by,is_public,view_count,created_at) VALUES (
'cs-8cd3a077e5b46a2dd509','af4542c2-e55b-41cf-8d5d-805f8294a3d3','case-surgery','매복 사랑니 발치','20대 남성, 완전매복 사랑니 4개 발치','24','male','1주','515e829a-2a40-48f7-b49e-fef2cabfd23f',1,152,'2025-10-15 15:00:00');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-de2c198cb6cdbeb146af','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-23','CH1000','김민수','데모 원장','이지영',
500000,500000,'new','esthetic','동의','예약',
'완료','등록',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-cff6c29e8e17f792e800','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-02-27','CH1001','이서연','데모 원장','이지영',
5500000,5500000,'new','endo','동의','',
'','등록',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-ec149eb4e12a4c746af1','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-04','CH1002','박준호','데모 원장','이지영',
3500000,2100000,'existing','ortho','거절','예약',
'','',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-601ce7da7ae943046e1c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-07','CH1003','최수빈','데모 원장','이지영',
1200000,720000,'return','prosth','동의','',
'완료','',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-e2f10b6423df3f96300f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-22','CH1004','정재훈','데모 원장','이지영',
500000,500000,'existing','perio','동의','예약',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-6de3ed38b034d8f803c0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-07','CH1005','한지우','데모 원장','이지영',
1800000,1800000,'new','esthetic','동의','예약',
'완료','등록',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-94e2f00061c6044c45f6','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-15','CH1006','오예린','데모 원장','이지영',
5500000,5500000,'new','endo','동의','',
'','',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-c9178aa682eadb31aa6d','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-31','CH1007','윤도현','데모 원장','이지영',
12000000,12000000,'existing','perio','동의','',
'','',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-7fa1389ff6f9700541dd','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-07','CH1008','임채원','데모 원장','이지영',
8000000,4800000,'new','perio','','',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-f5bf72a73d99bff8ec10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-22','CH1009','강다은','데모 원장','이지영',
8000000,4800000,'new','esthetic','거절','',
'완료','등록',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-7ef3fff500a03d97fc80','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-02','CH1010','조민재','데모 원장','이지영',
500000,500000,'existing','general','동의','예약',
'완료','',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-a39984627a1b3073337e','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-08','CH1011','서유나','데모 원장','이지영',
12000000,7200000,'new','perio','동의','예약',
'','',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-bfe16f76b48f80439175','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-02-26','CH1012','백승우','데모 원장','이지영',
3500000,3500000,'new','esthetic','동의','예약',
'','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-b177763a60e59f6b8ae0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-23','CH1013','나혜린','데모 원장','이지영',
3500000,3500000,'existing','prosth','동의','',
'','등록',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-a8825d5ba11a1da018d0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-20','CH1014','문지훈','데모 원장','이지영',
3500000,3500000,'new','esthetic','거절','예약',
'완료','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-621ad41d412624440695','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-19','CH1015','홍은서','데모 원장','이지영',
1200000,720000,'return','esthetic','보류','예약',
'완료','등록',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-82ca203191652915fd28','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-03','CH1016','송재민','데모 원장','이지영',
1200000,1200000,'new','prosth','거절','예약',
'완료','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-5d733c04263a94f23e40','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-08','CH1017','안수아','데모 원장','이지영',
3500000,2100000,'existing','ortho','보류','예약',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-7db5cd942d34db4313d5','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-08','CH1018','구현우','데모 원장','이지영',
8000000,8000000,'existing','implant','거절','',
'','',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-48a194b65a7c8686d21c','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-19','CH1019','류지영','데모 원장','이지영',
500000,500000,'new','endo','동의','',
'','',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-2e31654e4fb20b65e24f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-31','CH1020','전하은','데모 원장','이지영',
1200000,1200000,'existing','perio','동의','예약',
'','등록',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-55d67c5ef5fea9846681','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-12','CH1021','양도윤','데모 원장','이지영',
12000000,12000000,'existing','implant','동의','예약',
'','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-0e82ad610dd53dc44622','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-24','CH1022','배서윤','데모 원장','이지영',
3500000,2100000,'return','prosth','동의','예약',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-bda63dddec504e0c0f16','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-05','CH1023','황민준','데모 원장','이지영',
8000000,4800000,'new','ortho','보류','',
'','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-9a4a164366b3e516f397','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-07','CH1024','노아린','데모 원장','이지영',
1800000,1800000,'return','implant','거절','예약',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-668e1ba1dc0d72cebb99','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-14','CH1025','황태현','데모 원장','이지영',
5500000,3300000,'new','prosth','동의','',
'완료','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-1194eda1e40be54e1883','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-14','CH1026','유예은','데모 원장','이지영',
3500000,3500000,'return','prosth','동의','예약',
'완료','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-27e7b3768242e7d07e9d','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-20','CH1027','심재호','데모 원장','이지영',
500000,300000,'new','perio','거절','예약',
'완료','',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-4e79c029d001bd4a0e00','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-10','CH1028','조윤서','데모 원장','이지영',
5500000,5500000,'return','implant','동의','예약',
'완료','등록',
'2차 상담 예약',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','referral','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-264da37b9a70582be967','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-08','CH1029','김도영','데모 원장','이지영',
3500000,2100000,'return','perio','동의','예약',
'','',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-411f4b32a5161ce5b2b1','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-10','CH1030','김민수','데모 원장','이지영',
12000000,12000000,'return','implant','거절','예약',
'','등록',
'상세 설명 후 동의',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-66b8c72281261f7a8493','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-04','CH1031','이서연','데모 원장','이지영',
5500000,3300000,'existing','esthetic','동의','',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-3e724854f7207d1fc371','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-02','CH1032','박준호','데모 원장','이지영',
5500000,3300000,'return','implant','동의','예약',
'','등록',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','walk_in','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-d8ce0d6a8c7ce82e53af','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-03-20','CH1033','최수빈','데모 원장','이지영',
8000000,4800000,'return','esthetic','보류','예약',
'완료','등록',
'가격 부담으로 보류',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','naver','이지영');
INSERT INTO consult_records (id,hospital_id,record_date,chart_number,patient_name,doctor_name,counselor_name,planned_amount,agreed_amount,patient_type,treatment_category,treatment_confirmed,appointment_made,recall_done,kakao_registered,notes,created_by,visit_source,desk_name) VALUES (
'cr-14f191be6057138c2c67','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2026-04-04','CH1034','정재훈','데모 원장','이지영',
12000000,12000000,'return','prosth','거절','예약',
'','',
'가족 상의 후 결정',
'515e829a-2a40-48f7-b49e-fef2cabfd23f','instagram','이지영');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-3729ca7e59fd38198fa3','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-000','김민수','010-8935-6654','CH2000',
'임플란트 정기검진','2025-06-04',375,
'하악','kakao',3,
'pending','2026-05-08','2026-04-21 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-56950ca3c94731b24f35','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-001','이서연','010-7274-4826','CH2001',
'교정 리테이너 확인','2025-10-12',261,
'하악','sms',4,
'contacted','2026-05-09','2026-04-20 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-fbb6debbaf22b5f9f576','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-002','박준호','010-1606-3068','CH2002',
'충치 치료 후 재방문','2025-05-25',264,
'구치부','kakao',1,
'contacted','2026-05-06','2026-04-19 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-e04523e0cbf0f4fd386d','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-003','최수빈','010-7717-3529','CH2003',
'6개월 정기검진','2025-06-25',380,
'상악','kakao',5,
'contacted','2026-04-25','2026-04-18 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-374315ed9864f687d6d5','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-004','정재훈','010-9742-7226','CH2004',
'임플란트 정기검진','2025-05-16',363,
'하악','sms',1,
'pending','2026-05-01','2026-04-17 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-7d3b5177ab7b615c65f0','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-005','한지우','010-5708-4727','CH2005',
'6개월 정기검진','2025-07-04',205,
'구치부','kakao',2,
'pending','2026-05-11','2026-04-16 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-09db3723c7c5437dbdf3','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-006','오예린','010-6314-1919','CH2006',
'임플란트 정기검진','2025-07-24',275,
'하악','call',2,
'contacted','2026-04-22','2026-04-15 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-fc8d616b7261e1828415','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-007','윤도현','010-3950-3785','CH2007',
'스케일링 주기','2025-10-03',336,
'하악','sms',2,
'contacted','2026-05-12','2026-04-14 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-f98918f109d87df31004','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-008','임채원','010-4804-8555','CH2008',
'임플란트 정기검진','2025-06-28',245,
'구치부','kakao',3,
'pending','2026-04-25','2026-04-13 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-57161cafeca7b25319dd','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-009','강다은','010-6661-5901','CH2009',
'교정 리테이너 확인','2025-04-30',244,
'하악','kakao',2,
'contacted','2026-05-05','2026-04-12 10:00:00');
INSERT INTO recall_tasks (id,hospital_id,patient_id,patient_name,phone,chart_number,reason,last_visit_date,days_elapsed,treatment_area,channel,priority,status,scheduled_date,created_at) VALUES (
'rc-2d9fb24111586b44ee21','af4542c2-e55b-41cf-8d5d-805f8294a3d3','pat-010','조민재','010-4886-7248','CH2010',
'충치 치료 후 재방문','2025-07-24',327,
'상악','sms',3,
'pending','2026-04-24','2026-04-11 10:00:00');
INSERT INTO surveys (id,hospital_id,title,description,questions,is_active,auto_send,response_count,avg_nps,created_by,created_at) VALUES (
'sv-f7867fb797e94c164d37','af4542c2-e55b-41cf-8d5d-805f8294a3d3','진료 후 만족도 설문','NPS + 친절도 + 대기시간 평가','[{"id": 1, "type": "nps", "question": "친구에게 우리 병원을 추천할 의향은?"}, {"id": 2, "type": "rating", "question": "직원 친절도"}, {"id": 3, "type": "text", "question": "개선 제안"}]',1,1,34,74.7,'515e829a-2a40-48f7-b49e-fef2cabfd23f','2026-03-22 10:00:00');
INSERT INTO surveys (id,hospital_id,title,description,questions,is_active,auto_send,response_count,avg_nps,created_by,created_at) VALUES (
'sv-95931954279497f4ada8','af4542c2-e55b-41cf-8d5d-805f8294a3d3','신환 온보딩 설문','첫 방문 후 인상 조사','[{"id": 1, "type": "rating", "question": "전반적 만족도"}, {"id": 2, "type": "choice", "question": "방문 경로", "options": ["네이버", "지인소개", "인스타", "기타"]}]',1,0,16,55.2,'515e829a-2a40-48f7-b49e-fef2cabfd23f','2026-03-12 10:00:00');
INSERT INTO surveys (id,hospital_id,title,description,questions,is_active,auto_send,response_count,avg_nps,created_by,created_at) VALUES (
'sv-df9c60f45c6091369a0f','af4542c2-e55b-41cf-8d5d-805f8294a3d3','정기 NPS 설문','월간 발송','[{"id": 1, "type": "nps", "question": "추천 의향 0-10"}, {"id": 2, "type": "text", "question": "이유"}]',1,0,35,75.6,'515e829a-2a40-48f7-b49e-fef2cabfd23f','2026-03-02 10:00:00');
-- fee items below assume fee_categories row exists (id=91512db3-...)
DELETE FROM fee_items WHERE hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3';
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-f92a934bb8b32234cc18','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'임플란트 (오스템)',1650000,1450000,'개',120,'10년 보증 포함',1,0,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-5d2cee9b0b28a5db3d63','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'임플란트 (스트라우만)',2200000,2000000,'개',120,'20년 보증 포함',1,1,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-c47c54673494e1ea5405','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'자연치 신경치료 (단근관)',80000,70000,'개',30,'건강보험 적용 가능',1,2,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-11eb25d49808c7869e97','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'자연치 신경치료 (다근관)',180000,160000,'개',60,'건강보험 적용',1,3,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-25fbb862443204ea140f','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'골드 크라운',550000,500000,'개',60,'',1,4,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-1e076dcb89607150088b','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'올세라믹 크라운',650000,600000,'개',60,'',1,5,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-e1b3060d46961dc9087a','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'지르코니아 크라운',750000,700000,'개',60,'',1,6,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-fa8a236056756e1de7df','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'라미네이트 (1본)',800000,750000,'개',90,'',1,7,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-d2b2a20f12c61f621733','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'치아 미백 (병원)',450000,400000,'회',60,'1회 30분',1,8,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-741a6889bff0450fb429','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'스켈링',60000,50000,'회',30,'보험 적용',1,9,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-985824dfac7eff9311b7','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'잇몸치료 (풀마우스)',300000,280000,'회',90,'',1,10,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-769b1ccd7d023abf157b','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'교정 (투명 풀세트)',5500000,5000000,'세트',720,'유지장치 포함',1,11,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-adfb2e5f11ddd7f0fb92','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'교정 (금속 풀세트)',4200000,3800000,'세트',720,'유지장치 포함',1,12,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-2f21d64658720abf4d04','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'단순 발치',30000,25000,'개',20,'보험 적용',1,13,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-0aa4ecbcddc35bc021fa','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'매복 사랑니 발치',180000,150000,'개',60,'',1,14,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-34010a505a26bb52289b','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'임플란트 제거',300000,280000,'개',60,'',1,15,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-68bbeca48294066f2914','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'뼈이식 (자가골)',800000,750000,'회',120,'',1,16,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO fee_items (id,hospital_id,category_id,name,base_price,discount_price,unit,duration_min,description,is_active,sort_order,created_at)
SELECT 'fi-4b20742e3eb91be82391','af4542c2-e55b-41cf-8d5d-805f8294a3d3',fc.id,'CT 촬영',80000,70000,'회',15,'',1,17,datetime('now')
FROM fee_categories fc WHERE fc.hospital_id='af4542c2-e55b-41cf-8d5d-805f8294a3d3' LIMIT 1;
INSERT INTO kanban_boards (id,hospital_id,board_type,title) VALUES ('pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','purchase','물품 구매 요청'),('pb-c8d40ad88ed22098c248','af4542c2-e55b-41cf-8d5d-805f8294a3d3','repair','수리/정비');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-4ad32001e0e8d76b0977','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','일회용 마스크 5박스','KF94 중형, 박스당 50매','approved','normal','general','test-desk-001',45000,90000,'2026-04-20 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-eee4c8d070139c841fb4','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','멸균 백 리필','오토클레이브용 M/L 각 100매','in_progress','high','general','test-desk-001',120000,NULL,'2026-03-29 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-857cb97a6c035a535d9d','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','진료실 LED 전구 교체','3번 체어 메인 라이트','requested','urgent','general','test-hyg-001',80000,NULL,'2026-04-12 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-0645fe9cf8417fc845bc','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','보철 기구 세트 추가 구매','IIHS 임플란트 키트','requested','normal','general','515e829a-2a40-48f7-b49e-fef2cabfd23f',1800000,NULL,'2026-04-02 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-e57c86eeb8a4251bafce','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','구강카메라 교체','MyRay 카메라 배터리 이슈','approved','high','general','test-hyg-001',950000,NULL,'2026-04-14 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-7d0313c2362238256137','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','컴프레서 오일 교환','연 1회 정기 교환','completed','normal','general','test-desk-001',150000,145000,'2026-04-15 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-4db39605705bf2b9e820','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','에어컨 필터 교환','2,3층 진료실 총 4대','in_progress','normal','general','test-desk-001',60000,NULL,'2026-04-13 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-be8e7bacb1d6228971ba','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','데스크 프린터 토너','HP 오리지널 2개','completed','low','general','test-desk-001',85000,82000,'2026-03-28 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-71b6130c354912dcb706','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','X-ray 센서 보호 필름','1년치 소모품','requested','normal','general','test-desk-001',250000,NULL,'2026-03-28 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-115420bb0ad04586ffdd','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','기구 세척 브러시','스켈링 전용 소형','approved','low','general','test-desk-001',40000,NULL,'2026-03-31 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-7843b0ee14ea097e31c5','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','환자 가운 추가 제작','30벌 신규 로고 적용','requested','normal','general','515e829a-2a40-48f7-b49e-fef2cabfd23f',800000,NULL,'2026-04-01 11:00:00');
INSERT INTO kanban_cards (id,board_id,hospital_id,title,description,status,priority,department,requested_by,estimated_cost,actual_cost,created_at) VALUES (
'kc-6c344ddcdc35e4477a72','pb-d12912dc10168d6d12e4','af4542c2-e55b-41cf-8d5d-805f8294a3d3','세탁기 수리','스핀 이상 서비스 요청','rejected','high','general','515e829a-2a40-48f7-b49e-fef2cabfd23f',200000,NULL,'2026-04-01 11:00:00');