-- 🎨 MEGA SEED · 모든 게시판 풍성한 데모 데이터
-- Hospital ID: af4542c2-e55b-41cf-8d5d-805f8294a3d3 (fin2@test.com / 데모 원장)
-- Author IDs: 515e829a-2a40-48f7-b49e-fef2cabfd23f (원장)
--             test-hyg-001 (김수민 위생사)
--             test-desk-001 (이지엥 데스크)

-- ═══════════════════════════════════════════════════════════════
-- 1. CATEGORIES (materials, pricing, cases, scripts, consultation)
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
('cat-mat-01', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'materials', '임플란트', '🦷', 1),
('cat-mat-02', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'materials', '교정', '😁', 2),
('cat-mat-03', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'materials', '보철', '👑', 3),
('cat-mat-04', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'materials', '심미', '✨', 4),
('cat-case-01', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'cases', 'Before/After', '📸', 1),
('cat-case-02', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'cases', '수술 케이스', '🔬', 2),
('cat-scr-01', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'scripts', '상담 초진', '💬', 1),
('cat-scr-02', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'scripts', '전화 응대', '📞', 2),
('cat-scr-03', 'af4542c2-e55b-41cf-8d5d-805f8294a3d3', 'scripts', '반대 의견 대응', '🛡️', 3);

-- ═══════════════════════════════════════════════════════════════
-- 2. POSTS: 공지사항 (notice) + 칭찬 (praise) + 자유게시판 (free)
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO posts (id, hospital_id, board_type, author_id, title, content, is_pinned, like_count, view_count, created_at) VALUES
-- 공지 10건
('post-not-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','📢 5월 근무 스케줄 공유합니다','5월 연휴 및 근무표 확인해주세요. 어린이날(5/5), 부처님오신날(5/6) 휴진입니다.',1,12,87,datetime('now','-1 day')),
('post-not-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','🎂 이번 달 생일자','4월 생일자: 김수민(4/12), 이지엥(4/25) — 축하합시다 🎉',1,8,62,datetime('now','-2 day')),
('post-not-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','🧼 감염관리 매뉴얼 v2.3 업데이트','새 가이드라인 자료실에 업로드했습니다. 이번 주 내 숙지 부탁드려요.',0,4,48,datetime('now','-3 day')),
('post-not-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','🏥 장비 점검 안내 (4/28 화)','저녁 8시 이후 X-ray 장비 정기점검 있습니다. 예약 피해주세요.',0,3,35,datetime('now','-4 day')),
('post-not-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','📚 신입교육 일정','다음 주 입사 예정자 대상 오리엔테이션 5/2(월) 9시.',0,2,28,datetime('now','-5 day')),
('post-not-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','💊 약제 관리 철저','유효기간 임박 약제는 분기별 체크리스트 작성해주세요.',0,5,41,datetime('now','-7 day')),
('post-not-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','🎓 임플란트 세미나 참가자 모집','5/15(일) 상급과정 세미나. 관심자 댓글 남겨주세요.',0,6,53,datetime('now','-10 day')),
('post-not-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','📢 환자 만족도 설문 1분기 결과','평균 4.7점 달성! 상세 결과 자료실 참고.',0,15,102,datetime('now','-12 day')),
('post-not-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','🚨 컴플레인 공유 프로토콜 변경','모든 컴플레인은 당일 저녁 7시까지 공유방에 기록.',0,3,39,datetime('now','-15 day')),
('post-not-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','notice','515e829a-2a40-48f7-b49e-fef2cabfd23f','💡 아이디어 제안함 오픈','병원 개선 아이디어 자유롭게 — 채택 시 인센티브.',0,9,67,datetime('now','-20 day')),

-- 칭찬 12건
('post-prs-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','👏 김수민 샘에게 감사','오늘 컴플레인 환자분 침착하게 잘 응대해주셔서 감사합니다. 환자분이 오히려 미안하다고 하셨어요.',0,18,124,datetime('now','-1 day')),
('post-prs-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-hyg-001','👏 이지엥 샘 덕분에','예약 변경 급하게 처리해주셔서 환자분 놓치지 않았어요. 고마워요!',0,11,78,datetime('now','-2 day')),
('post-prs-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','👏 원장님께','임플란트 수술 중 당황스러운 상황을 차분하게 리드해주셔서 감동이었습니다.',0,22,156,datetime('now','-2 day')),
('post-prs-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','👏 팀 전체에게','이번 분기 목표 달성! 다들 고생 많으셨어요.',1,35,203,datetime('now','-5 day')),
('post-prs-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-hyg-001','👏 청소 도와주신 샘들께','회식 다음 날 자발적으로 청소 정리해주신 분들 감사합니다 🙏',0,9,64,datetime('now','-7 day')),
('post-prs-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','👏 상담 전환 1위 김수민 샘','이번 달 상담→치료 전환율 1위 축하드려요!',0,14,92,datetime('now','-8 day')),
('post-prs-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','👏 신환 케어 칭찬','신환 첫 방문 친절하게 안내해주신 데스크 분들 덕에 예약 취소율 0%!',0,12,81,datetime('now','-10 day')),
('post-prs-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-hyg-001','👏 소독기 관리','매일 아침 소독기 꼼꼼히 체크해주시는 샘들 최고예요.',0,7,53,datetime('now','-11 day')),
('post-prs-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','👏 리뷰 이벤트 반응 폭발','4월 리뷰 이벤트 아이디어 낸 이지엥 샘 굿잡!',0,16,108,datetime('now','-13 day')),
('post-prs-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','515e829a-2a40-48f7-b49e-fef2cabfd23f','👏 환자분 칭찬 후기','"김선생님 진짜 친절하고 꼼꼼해요" — 네이버 리뷰에서 직접 언급된 우리 샘!',0,20,142,datetime('now','-16 day')),
('post-prs-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-hyg-001','👏 응급상황 대처','어제 쓰러지실 뻔한 환자분 빠르게 대응해주셔서 감사.',0,13,89,datetime('now','-19 day')),
('post-prs-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','praise','test-desk-001','👏 신입 온보딩 멘토링','신입선생님 차근차근 알려주신 수민 샘 👍',0,8,62,datetime('now','-22 day')),

-- 자유게시판 8건
('post-free-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','🍜 오늘 점심 뭐 드셨나요?','저는 부대찌개 먹었어요. 추천 메뉴 있나요?',0,6,47,datetime('now','-1 day')),
('post-free-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','🎬 주말 본 영화 추천','"파묘" 진짜 재밌더라구요!',0,9,68,datetime('now','-3 day')),
('post-free-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','☕ 커피 취향 공유','저희는 라떼파 vs 아메리카노파?',0,12,84,datetime('now','-5 day')),
('post-free-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','🌸 벚꽃 사진 공유해요','어제 석촌호수 진짜 이뻤어요.',0,15,96,datetime('now','-8 day')),
('post-free-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','💪 운동 같이 하실 분','강남 쪽 필라테스 같이 다닐 사람 구해요!',0,7,52,datetime('now','-11 day')),
('post-free-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','📚 책 추천','"도둑맞은 집중력" 읽는 중 — 강추.',0,5,38,datetime('now','-14 day')),
('post-free-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-hyg-001','🎵 플레이리스트 공유','일할 때 듣기 좋은 lofi 리스트 만들었어요.',0,11,73,datetime('now','-17 day')),
('post-free-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','free','test-desk-001','🧘 번아웃 회복 팁','이번 주 쉬고 나서 많이 나아졌어요. 다들 잘 쉬세요.',0,18,115,datetime('now','-21 day'));

-- ═══════════════════════════════════════════════════════════════
-- 3. CONSULTATIONS (상담 파이프라인) — 30건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, estimated_amount, agreed_amount, paid_amount, consultation_date, priority, created_at) VALUES
('cns-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','박민지','010-1234-5671','32','female','naver','implant','agreed',3500000,3200000,1000000,date('now','-1 day'),'high',datetime('now','-1 day')),
('cns-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','김태훈','010-1234-5672','45','male','referral','implant','treatment',5800000,5500000,5500000,date('now','-2 day'),'normal',datetime('now','-3 day')),
('cns-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','이수정','010-1234-5673','28','female','instagram','ortho','consulting',7200000,NULL,NULL,date('now','-1 day'),'high',datetime('now','-2 day')),
('cns-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','최영은','010-1234-5674','38','female','kakao','esthetic','visited',2400000,NULL,NULL,date('now'),'normal',datetime('now')),
('cns-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','정현우','010-1234-5675','52','male','phone','prosth','completed',4800000,4500000,4500000,date('now','-10 day'),'normal',datetime('now','-12 day')),
('cns-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','강미래','010-1234-5676','26','female','naver','ortho','inquiry',6500000,NULL,NULL,date('now'),'normal',datetime('now')),
('cns-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','윤지호','010-1234-5677','41','male','walk_in','general','reserved',450000,NULL,NULL,date('now','+1 day'),'low',datetime('now','-1 day')),
('cns-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','한서연','010-1234-5678','29','female','blog','esthetic','agreed',3800000,3500000,1500000,date('now','-3 day'),'high',datetime('now','-4 day')),
('cns-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','오준석','010-1234-5679','47','male','referral','implant','payment',8200000,7800000,3000000,date('now','-5 day'),'high',datetime('now','-6 day')),
('cns-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','서지민','010-1234-5680','34','female','instagram','ortho','consulting',6800000,NULL,NULL,date('now','-2 day'),'normal',datetime('now','-2 day')),
('cns-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','장예린','010-1234-5681','22','female','naver','esthetic','inquiry',1800000,NULL,NULL,date('now'),'low',datetime('now')),
('cns-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','임재현','010-1234-5682','55','male','phone','prosth','visited',5200000,NULL,NULL,date('now','-1 day'),'normal',datetime('now','-1 day')),
('cns-13','af4542c2-e55b-41cf-8d5d-805f8294a3d3','조민서','010-1234-5683','31','female','kakao','implant','lost',4200000,NULL,NULL,date('now','-8 day'),'normal',datetime('now','-10 day')),
('cns-14','af4542c2-e55b-41cf-8d5d-805f8294a3d3','신동욱','010-1234-5684','39','male','youtube','implant','treatment',6100000,5800000,2000000,date('now','-6 day'),'high',datetime('now','-8 day')),
('cns-15','af4542c2-e55b-41cf-8d5d-805f8294a3d3','배지은','010-1234-5685','27','female','instagram','ortho','agreed',7500000,7000000,2500000,date('now','-4 day'),'high',datetime('now','-5 day')),
('cns-16','af4542c2-e55b-41cf-8d5d-805f8294a3d3','문채원','010-1234-5686','33','female','naver','esthetic','completed',2200000,2000000,2000000,date('now','-15 day'),'normal',datetime('now','-18 day')),
('cns-17','af4542c2-e55b-41cf-8d5d-805f8294a3d3','백승호','010-1234-5687','48','male','referral','implant','treatment',9500000,9000000,4500000,date('now','-7 day'),'urgent',datetime('now','-9 day')),
('cns-18','af4542c2-e55b-41cf-8d5d-805f8294a3d3','남주형','010-1234-5688','30','male','blog','general','reserved',380000,NULL,NULL,date('now','+2 day'),'low',datetime('now','-1 day')),
('cns-19','af4542c2-e55b-41cf-8d5d-805f8294a3d3','송하늘','010-1234-5689','25','female','kakao','esthetic','visited',1600000,NULL,NULL,date('now'),'normal',datetime('now')),
('cns-20','af4542c2-e55b-41cf-8d5d-805f8294a3d3','허재민','010-1234-5690','44','male','walk_in','prosth','consulting',4400000,NULL,NULL,date('now','-3 day'),'normal',datetime('now','-3 day')),
('cns-21','af4542c2-e55b-41cf-8d5d-805f8294a3d3','양소희','010-1234-5691','36','female','naver','ortho','inquiry',7800000,NULL,NULL,date('now','-1 day'),'normal',datetime('now','-1 day')),
('cns-22','af4542c2-e55b-41cf-8d5d-805f8294a3d3','유진호','010-1234-5692','42','male','phone','implant','agreed',5200000,4900000,2000000,date('now','-2 day'),'high',datetime('now','-3 day')),
('cns-23','af4542c2-e55b-41cf-8d5d-805f8294a3d3','권나연','010-1234-5693','28','female','instagram','esthetic','completed',2800000,2600000,2600000,date('now','-20 day'),'normal',datetime('now','-25 day')),
('cns-24','af4542c2-e55b-41cf-8d5d-805f8294a3d3','홍석진','010-1234-5694','51','male','referral','implant','payment',6800000,6500000,3000000,date('now','-6 day'),'high',datetime('now','-7 day')),
('cns-25','af4542c2-e55b-41cf-8d5d-805f8294a3d3','노수빈','010-1234-5695','24','female','kakao','ortho','cancelled',6200000,NULL,NULL,date('now','-12 day'),'low',datetime('now','-14 day')),
('cns-26','af4542c2-e55b-41cf-8d5d-805f8294a3d3','심우진','010-1234-5696','37','male','blog','esthetic','visited',2100000,NULL,NULL,date('now'),'normal',datetime('now')),
('cns-27','af4542c2-e55b-41cf-8d5d-805f8294a3d3','고예림','010-1234-5697','29','female','naver','ortho','agreed',6900000,6500000,2000000,date('now','-4 day'),'high',datetime('now','-5 day')),
('cns-28','af4542c2-e55b-41cf-8d5d-805f8294a3d3','진성호','010-1234-5698','46','male','phone','prosth','treatment',5400000,5100000,2500000,date('now','-9 day'),'normal',datetime('now','-11 day')),
('cns-29','af4542c2-e55b-41cf-8d5d-805f8294a3d3','류지원','010-1234-5699','32','female','instagram','esthetic','inquiry',1900000,NULL,NULL,date('now'),'normal',datetime('now')),
('cns-30','af4542c2-e55b-41cf-8d5d-805f8294a3d3','안재윤','010-1234-5700','40','male','referral','implant','completed',7200000,6800000,6800000,date('now','-25 day'),'normal',datetime('now','-30 day'));

-- ═══════════════════════════════════════════════════════════════
-- 4. REVIEWS (네이버/구글/카카오 리뷰) — 18건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO reviews (id, hospital_id, platform, reviewer_name, rating, content, reply, review_date) VALUES
('rev-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','박**',5,'임플란트 수술 진짜 꼼꼼하게 해주셨어요. 원장님 설명이 친절해서 무서움 없이 받았습니다.','소중한 후기 감사합니다! 앞으로도 최선을 다하겠습니다 😊',date('now','-1 day')),
('rev-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','김**',5,'데스크 선생님들이 너무 친절하세요. 예약 잡을 때마다 세심하게 챙겨주심.','', date('now','-2 day')),
('rev-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','이**',4,'전반적으로 만족하지만 대기시간이 조금 길었어요.','말씀 감사합니다. 대기시간 개선 노력하겠습니다 🙏',date('now','-3 day')),
('rev-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','Minjung P.',5,'Best dental clinic in Seoul. Dr. is very professional.','Thank you so much for your kind words!',date('now','-4 day')),
('rev-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','최**',5,'교정 상담 받았는데 다른 데랑 비교해도 여기가 제일 친절하고 합리적이었어요.','', date('now','-5 day')),
('rev-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','정**',5,'신경치료 하나도 안 아팠어요. 추천합니다.','', date('now','-6 day')),
('rev-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','강**',5,'아이가 치과 싫어했는데 여기 오고 나서는 스스로 가자고 해요.','아이 마음 열어주셔서 감사합니다 ❤️',date('now','-8 day')),
('rev-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','윤**',3,'시설은 좋은데 상담이 좀 빠른 느낌이었어요.','피드백 감사합니다. 더 천천히 설명드리겠습니다.',date('now','-9 day')),
('rev-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','Suyeon L.',5,'Crown work was perfect. Highly recommend!','', date('now','-10 day')),
('rev-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','한**',5,'임플란트 6개월차인데 불편함 없이 잘 쓰고 있어요.','', date('now','-12 day')),
('rev-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','오**',4,'가격이 조금 있지만 그만한 가치가 있습니다.','만족해 주셔서 감사합니다!',date('now','-14 day')),
('rev-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','서**',5,'위생사 선생님이 너무 꼼꼼하게 스케일링 해주심.','', date('now','-16 day')),
('rev-13','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','장**',5,'원장님 수술 실력 최고. 다른 곳에서 안 된다던 거 여기서 해결!','', date('now','-18 day')),
('rev-14','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','임**',2,'예약 시스템이 좀 불편해요. 문자로 확인이 잘 안 옴.','불편 드려 죄송합니다. 시스템 개선 중입니다.',date('now','-20 day')),
('rev-15','af4542c2-e55b-41cf-8d5d-805f8294a3d3','google','Jaehyun C.',5,'Very clean facility and staff speaks English well.','Thank you! We do our best for international patients.',date('now','-22 day')),
('rev-16','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','조**',5,'친정 엄마도 모시고 왔어요. 노인 환자 대하는 게 남달라요.','', date('now','-25 day')),
('rev-17','af4542c2-e55b-41cf-8d5d-805f8294a3d3','naver','신**',4,'주차장이 협소한 게 유일한 단점.','', date('now','-28 day')),
('rev-18','af4542c2-e55b-41cf-8d5d-805f8294a3d3','kakao','배**',5,'어린이 진료도 잘하세요. 아이가 울지 않고 받았어요.','감사합니다. 우리 아이들 편하게 진료받도록 노력할게요!',date('now','-30 day'));

-- ═══════════════════════════════════════════════════════════════
-- 5. MATERIALS (설명 자료) — 15건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO materials (id, hospital_id, category_id, title, description, file_type, view_count, sort_order) VALUES
('mat-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-01','임플란트란 무엇인가요?','인공치근을 심어 자연치처럼 사용하는 치료','image',142,1),
('mat-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-01','임플란트 치료 과정 안내','1차 수술 → 골유착 → 2차 → 보철 총 4~6개월','image',128,2),
('mat-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-01','임플란트 후 관리법','스케일링 주기 및 주의사항','pdf',87,3),
('mat-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-02','투명교정 vs 메탈교정','각 방식의 장단점 비교','image',215,1),
('mat-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-02','교정 시작 전 체크리스트','상담 시 꼭 물어볼 5가지','pdf',103,2),
('mat-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-02','교정 중 양치질 방법','올바른 구강위생 관리','video',196,3),
('mat-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-03','세라믹 크라운 vs 골드','재료별 특성과 추천 케이스','image',78,1),
('mat-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-03','지르코니아 크라운의 장점','심미성과 강도','image',112,2),
('mat-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-03','틀니 vs 임플란트','비용과 편의성 비교','pdf',94,3),
('mat-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-04','라미네이트 vs 루미니어','심미 보철 선택 가이드','image',156,1),
('mat-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-04','치아미백 종류와 효과','가정용 vs 치과 시술','image',189,2),
('mat-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-04','치아성형 전후 주의사항','','pdf',67,3),
('mat-13','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-01','임플란트 보험 적용 안내','건강보험 적용 범위','pdf',52,4),
('mat-14','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-02','교정 치료비 분할 납부','', 'pdf',43,4),
('mat-15','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-mat-04','미백 후 관리 주의사항','', 'video',71,4);

-- ═══════════════════════════════════════════════════════════════
-- 6. SCRIPTS (상담 스크립트) — 18건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response, sort_order) VALUES
('scr-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','초진 환자 첫 인사','환자가 처음 내원했을 때','"안녕하세요, 000 환자분이시죠? 오시느라 수고하셨습니다. 오늘 어떤 불편으로 오셨나요?"','','',1),
('scr-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','구강검진 결과 설명','x-ray, 사진 촬영 후','"먼저 전체 구강 상태를 보여드리겠습니다. 이쪽 보이시는 부분이..."','','',2),
('scr-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','치료계획 제안','진단 후 치료안 제시','"환자분의 상태를 종합해보면 3가지 옵션이 있어요. 각각 장단점을 설명드리면..."','','',3),
('scr-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','가격 부담 이의 제기','"너무 비싸요"','','"가격 부담이 큰 부분 충분히 이해됩니다. 분할 납부 / 단계별 치료 옵션도 있는데 설명드려도 될까요?"','가격 부담이 큰 부분 충분히 이해됩니다. 분할 납부 / 단계별 치료 옵션도 있는데 설명드려도 될까요?',1),
('scr-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','타 치과 비교','"다른 데는 더 싸던데"','','"가격 차이가 있는 이유는 사용하는 재료와 수술 방식 때문입니다. 저희는 ...에 중점을 두고 있어요."','',2),
('scr-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','시간 부담','"일정이 너무 길어요"','','"이해합니다. 꼭 필요한 부분부터 우선 진행하고 나머지는 천천히 하는 방법도 있어요."','',3),
('scr-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','통증 우려','"아프지 않을까요?"','','"요즘은 마취 기술이 많이 발전해서 거의 아프지 않습니다. 수술 전/중/후 통증 관리 프로토콜을..."','',4),
('scr-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-02','예약 안내 전화','신규 예약 확정','"안녕하세요, 000치과입니다. 000 환자분 5월 3일 오후 2시 예약 확인차 연락드렸어요."','','',1),
('scr-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-02','예약 변경 요청','환자가 일정 변경','"네, 일정 조정 가능합니다. 언제가 편하세요?"','','',2),
('scr-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-02','노쇼 방지 전화','예약 하루 전','"안녕하세요 000환자분. 내일 오후 2시 예약 리마인드 드립니다. 변경 필요하시면 편하게 말씀해주세요!"','','',3),
('scr-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','임플란트 치료 동의서 안내','수술 동의서 설명','"이 동의서는 수술 전 환자분이 꼭 알아야 할 내용들을 정리한 것입니다. 차근차근 읽어드릴게요."','','',4),
('scr-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','수술 후 주의사항','수술 직후 환자에게','"오늘부터 3일간은 딱딱한 음식 피해주시고, 처방약 꼭 챙겨드세요. 24시간 내 부기가 정상입니다."','','',5),
('scr-13','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','배우자 상의 필요','"집에 가서 상의하고"','','"그럼요, 충분히 고민해보세요. 혹시 상의하실 때 도움 되시라고 요약 자료 준비해드릴게요."','',5),
('scr-14','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-02','치료 중단 환자 연락','3개월 미방문 환자','"안녕하세요 000환자분. 마지막 방문 후 3개월 지나서 안부 겸 연락드렸어요. 불편한 점 없으신가요?"','','',4),
('scr-15','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','교정 상담 첫 시작','교정 상담 환자','"투명교정이 편하지만 케이스에 따라 메탈이 더 효과적인 경우도 있어요. 사진으로 비교 보여드릴게요."','','',6),
('scr-16','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','나중에 결정','"일단 생각해볼게요"','','"네 편하게 결정하세요. 오늘 설명드린 자료는 카톡으로 보내드릴까요? 보시면서 궁금한 점은 언제든 연락주세요."','',6),
('scr-17','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-01','신경치료 설명','신경치료 대상자','"충치가 신경까지 진행됐어요. 신경치료 → 크라운 순서로 진행하며 총 3~4회 내원 필요합니다."','','',7),
('scr-18','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-scr-03','부작용 우려','"부작용 있지 않아요?"','','"아주 좋은 질문이에요. 일반적으로 보고되는 부작용과 저희 병원의 예방 프로토콜을 설명드릴게요..."','',7);

-- ═══════════════════════════════════════════════════════════════
-- 7. CASES (케이스 갤러리) — 10건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO cases (id, hospital_id, category_id, title, description, patient_age, patient_gender, treatment_period, is_public, view_count) VALUES
('case-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','앞니 라미네이트 4개','심미 개선 케이스','28','female','3주',1,238),
('case-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','전치부 임플란트 복원','교통사고로 손실','35','male','4개월',1,186),
('case-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','성인 교정 1년 6개월','투명교정','31','female','18개월',1,312),
('case-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-02','상악동거상 임플란트','골이식 동반','54','male','6개월',0,94),
('case-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','Full Mouth 세라믹','전체 심미 치료','45','female','3개월',1,267),
('case-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-02','매복사랑니 발치','완전 매복 케이스','22','male','1일',0,78),
('case-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','지르코니아 크라운 복원','','38','male','2주',1,142),
('case-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-02','임플란트 실패 재수술','타원 임플란트 리커버리','47','female','8개월',0,103),
('case-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','청소년 교정 완료','','16','male','24개월',1,198),
('case-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','cat-case-01','치아미백 Before/After','ZOOM 화이트닝','26','female','1일',1,221);

-- ═══════════════════════════════════════════════════════════════
-- 8. FEE_CATEGORIES + FEE_ITEMS (수가표)
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO fee_categories (id, hospital_id, name, sort_order) VALUES
('fcat-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','임플란트',1),
('fcat-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','교정',2),
('fcat-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','보철',3),
('fcat-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','심미',4),
('fcat-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','일반진료',5);

INSERT OR IGNORE INTO fee_items (id, hospital_id, category_id, name, base_price, discount_price, unit, duration_min, description) VALUES
('fi-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-01','임플란트 (국산)',1200000,1000000,'개',60,'국산 오스템'),
('fi-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-01','임플란트 (수입)',1800000,1600000,'개',60,'스트라우만'),
('fi-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-01','상악동거상술',800000,700000,'건',90,'골이식 포함'),
('fi-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-02','투명교정 (인비절라인)',7500000,7000000,'case',60,'24개월 포함'),
('fi-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-02','메탈교정',5500000,5000000,'case',60,'24개월 포함'),
('fi-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-02','부분교정',3500000,3200000,'case',60,'6~12개월'),
('fi-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-03','지르코니아 크라운',650000,600000,'개',30,'1일 완성'),
('fi-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-03','세라믹 크라운',580000,520000,'개',30,''),
('fi-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-03','골드 크라운',680000,620000,'개',30,''),
('fi-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-04','라미네이트',850000,800000,'개',40,''),
('fi-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-04','치아미백 (ZOOM)',450000,400000,'건',60,'1회 시술'),
('fi-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-04','라미네이트 (풀세라믹)',1200000,1100000,'개',40,''),
('fi-13','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-05','스케일링',80000,70000,'회',30,'건보적용'),
('fi-14','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-05','신경치료',350000,300000,'치',60,'회당'),
('fi-15','af4542c2-e55b-41cf-8d5d-805f8294a3d3','fcat-05','사랑니 발치 (매복)',250000,220000,'개',45,'');

-- ═══════════════════════════════════════════════════════════════
-- 9. CHECKLISTS (일일 점검) — 6건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO checklists (id, hospital_id, title, checklist_type, items) VALUES
('chk-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','오픈 체크리스트 (09:00)','daily_open','[{"id":"1","text":"진료실 전원 ON","done":false},{"id":"2","text":"소독기 가동 확인","done":false},{"id":"3","text":"X-ray 워밍업","done":false},{"id":"4","text":"수술실 멸균 포 준비","done":false},{"id":"5","text":"대기실 청소 및 음악 ON","done":false}]'),
('chk-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','클로징 체크리스트 (19:00)','daily_close','[{"id":"1","text":"진료실 소독 및 정리","done":false},{"id":"2","text":"소독기 사이클 완료","done":false},{"id":"3","text":"현금 마감 정산","done":false},{"id":"4","text":"내일 예약 확인 콜","done":false},{"id":"5","text":"진료실 전원 OFF","done":false}]'),
('chk-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','주간 감염관리 점검','weekly','[{"id":"1","text":"자외선 멸균기 램프 확인","done":false},{"id":"2","text":"고압증기멸균기 BI 테스트","done":false},{"id":"3","text":"소독액 유효기간 점검","done":false},{"id":"4","text":"구강외과 수술 도구 재고","done":false}]'),
('chk-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','감염관리 월간 점검','infection','[{"id":"1","text":"멸균 패키지 만료일 확인","done":false},{"id":"2","text":"수술실 공기 필터 교체","done":false},{"id":"3","text":"손소독제 전체 리필","done":false}]'),
('chk-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','신입 온보딩 1주차','onboarding','[{"id":"1","text":"인사 및 자리 안내","done":false},{"id":"2","text":"기본 장비 사용법 교육","done":false},{"id":"3","text":"감염관리 매뉴얼 숙지","done":false},{"id":"4","text":"첫 주 평가 피드백","done":false}]'),
('chk-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','수술 전 준비 체크','custom','[{"id":"1","text":"환자 동의서 확인","done":false},{"id":"2","text":"수술 도구 멸균 확인","done":false},{"id":"3","text":"약제 및 마취제 준비","done":false},{"id":"4","text":"응급 장비 점검","done":false}]');

-- ═══════════════════════════════════════════════════════════════
-- 10. KANBAN_BOARDS + KANBAN_CARDS (물품구매) — 12건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO kanban_boards (id, hospital_id, board_type, title) VALUES
('kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','purchase','물품 구매 요청'),
('kb-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','repair','시설 수리 요청');

INSERT OR IGNORE INTO kanban_cards (id, board_id, hospital_id, title, description, status, priority, department, requested_by, estimated_cost, created_at) VALUES
('kc-01','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','임플란트 픽스쳐 추가 주문','오스템 3.5x10 30개 소진 임박','requested','high','clinical','test-hyg-001',1500000,datetime('now','-1 day')),
('kc-02','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','러버댐 5박스','in-stock 부족','approved','normal','clinical','test-hyg-001',180000,datetime('now','-2 day')),
('kc-03','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','수술용 장갑 라지 10박스','월간 정기 주문','in_progress','normal','clinical','test-hyg-001',95000,datetime('now','-3 day')),
('kc-04','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','데스크 프린터 토너','','completed','low','desk','test-desk-001',85000,datetime('now','-5 day')),
('kc-05','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','알기네이트 5kg','인상재 재고 부족','approved','normal','clinical','test-hyg-001',120000,datetime('now','-3 day')),
('kc-06','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','마스크 N95 3박스','감염관리용','requested','high','clinical','test-hyg-001',75000,datetime('now','-1 day')),
('kc-07','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','환자용 음료 (캡슐커피 등)','대기실 비치용','requested','low','desk','test-desk-001',120000,datetime('now','-2 day')),
('kc-08','kb-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','사은품 치실 홀더 200개','리뷰 이벤트용','approved','normal','desk','test-desk-001',150000,datetime('now','-4 day')),
('kc-09','kb-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','2번 진료실 유니트 수리','물 안 나옴','in_progress','urgent','clinical','test-hyg-001',0,datetime('now','-1 day')),
('kc-10','kb-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','대기실 에어컨 청소','필터 오염','approved','normal','general','test-desk-001',80000,datetime('now','-3 day')),
('kc-11','kb-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','출입구 자동문 센서 점검','감지 오류','requested','normal','general','test-desk-001',150000,datetime('now','-2 day')),
('kc-12','kb-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','3층 화장실 변기 교체','노후','completed','low','general','test-desk-001',350000,datetime('now','-10 day'));

-- ═══════════════════════════════════════════════════════════════
-- 11. SURVEYS (만족도 설문) — 3건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO surveys (id, hospital_id, title, description, questions, is_active, auto_send, response_count, avg_nps) VALUES
('srv-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','진료 후 만족도 조사','전반적 진료 경험에 대한 만족도','[{"id":"q1","type":"nps","text":"친구에게 저희 병원을 추천할 가능성이 얼마나 되나요?"},{"id":"q2","type":"rating","text":"대기 시간은 어땠나요?"},{"id":"q3","type":"rating","text":"설명은 충분했나요?"},{"id":"q4","type":"text","text":"개선 제안이 있다면?"}]',1,1,47,8.3),
('srv-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','임플란트 치료 만족도','수술 경험 상세 피드백','[{"id":"q1","type":"rating","text":"수술 중 불편함은 없으셨나요?"},{"id":"q2","type":"rating","text":"수술 후 회복 과정은 어땠나요?"},{"id":"q3","type":"text","text":"인상 깊었던 순간은?"}]',1,0,23,9.1),
('srv-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','데스크 응대 만족도','접수/예약/수납 과정 평가','[{"id":"q1","type":"rating","text":"예약 과정이 편리했나요?"},{"id":"q2","type":"rating","text":"데스크 직원 친절도"}]',1,1,52,8.7);

-- ═══════════════════════════════════════════════════════════════
-- 12. RECALL_RULES + RECALL_TASKS — 15건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO recall_rules (id, hospital_id, name, trigger_type, treatment_keyword, days_after, channel, priority, is_active) VALUES
('rr-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','6개월 정기검진','last_visit','',180,'call',2,1),
('rr-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','임플란트 1년 후','last_visit','임플란트',365,'kakao',1,1),
('rr-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','교정 종료 후 리테이너','last_visit','교정',180,'sms',2,1);

INSERT OR IGNORE INTO recall_tasks (id, hospital_id, rule_id, patient_name, phone, reason, last_visit_date, days_elapsed, channel, priority, status, scheduled_date) VALUES
('rt-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','김민수','010-0000-0001','6개월 정기 검진 미수행',date('now','-210 day'),210,'call',1,'pending',date('now')),
('rt-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','이지영','010-0000-0002','6개월 미방문',date('now','-195 day'),195,'call',2,'pending',date('now')),
('rt-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-02','박재훈','010-0000-0003','임플란트 1년차 체크',date('now','-370 day'),370,'kakao',1,'pending',date('now')),
('rt-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','최서연','010-0000-0004','8개월 미방문',date('now','-240 day'),240,'call',1,'contacted',date('now','-1 day')),
('rt-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-03','정하윤','010-0000-0005','교정 완료 후 리테이너 체크',date('now','-185 day'),185,'sms',2,'pending',date('now','+1 day')),
('rt-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','장우진','010-0000-0006','정기 스케일링 제안',date('now','-190 day'),190,'call',3,'pending',date('now','+2 day')),
('rt-07','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-02','강예린','010-0000-0007','임플란트 1년 후 점검',date('now','-380 day'),380,'kakao',1,'completed',date('now','-3 day')),
('rt-08','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','오민지','010-0000-0008','장기 미방문 환자',date('now','-220 day'),220,'call',2,'pending',date('now','+1 day')),
('rt-09','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','윤태성','010-0000-0009','정기 검진 권유',date('now','-200 day'),200,'call',3,'pending',date('now','+3 day')),
('rt-10','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','한소미','010-0000-0010','보철 관리 상태 확인',date('now','-250 day'),250,'kakao',2,'contacted',date('now','-2 day')),
('rt-11','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','송유찬','010-0000-0011','', date('now','-215 day'),215,'call',3,'pending',date('now','+2 day')),
('rt-12','af4542c2-e55b-41cf-8d5d-805f8294a3d3','rr-01','백하준','010-0000-0012','정기검진 시기',date('now','-225 day'),225,'call',2,'pending',date('now','+1 day'));

-- ═══════════════════════════════════════════════════════════════
-- 13. MARKETING_CHANNELS (광고 채널) — 6건
-- ═══════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO marketing_channels (id, hospital_id, name, monthly_cost, is_active) VALUES
('mc-01','af4542c2-e55b-41cf-8d5d-805f8294a3d3','네이버 파워링크',1800000,1),
('mc-02','af4542c2-e55b-41cf-8d5d-805f8294a3d3','네이버 플레이스 광고',800000,1),
('mc-03','af4542c2-e55b-41cf-8d5d-805f8294a3d3','인스타그램 광고',1200000,1),
('mc-04','af4542c2-e55b-41cf-8d5d-805f8294a3d3','유튜브 광고',600000,1),
('mc-05','af4542c2-e55b-41cf-8d5d-805f8294a3d3','블로그 체험단',400000,1),
('mc-06','af4542c2-e55b-41cf-8d5d-805f8294a3d3','카카오 모먼트',500000,1);
