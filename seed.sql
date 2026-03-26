-- ════════════════════════════════════════════════════════════════
-- Patient Funnel Manager - Seed Data v2.0
-- ════════════════════════════════════════════════════════════════

-- ═══ 데모 병원 & 관리자 ═══
INSERT OR IGNORE INTO hospitals (id, name, phone, address) VALUES
  ('h-demo', '서울비디치과', '02-1234-5678', '서울특별시 강남구 테헤란로 123');

INSERT OR IGNORE INTO users (id, hospital_id, email, password_hash, name, role, is_doctor) VALUES
  ('u-admin', 'h-demo', 'admin@seoulbd.com', '$pbkdf2$admin123', '문석준', 'admin', 1),
  ('u-mgr', 'h-demo', 'manager@seoulbd.com', '$pbkdf2$manager1', '김수현', 'manager', 1),
  ('u-staff1', 'h-demo', 'hygienist1@seoulbd.com', '$pbkdf2$staff123', '박지은', 'staff', 0),
  ('u-staff2', 'h-demo', 'assistant1@seoulbd.com', '$pbkdf2$staff123', '이하늘', 'staff', 0);

-- ═══ 카테고리: 설명자료 ═══
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('mat-implant', NULL, 'materials', '임플란트', '🦷', 1),
  ('mat-cavity', NULL, 'materials', '충치/신경치료', '🔬', 2),
  ('mat-prosth', NULL, 'materials', '보철치료', '👑', 3),
  ('mat-ortho', NULL, 'materials', '교정치료', '😁', 4),
  ('mat-perio', NULL, 'materials', '치주치료', '🩺', 5),
  ('mat-extract', NULL, 'materials', '발치/사랑니', '⚡', 6),
  ('mat-pedo', NULL, 'materials', '소아치과', '👶', 7),
  ('mat-hygiene', NULL, 'materials', '구강위생/예방', '🪥', 8),
  ('mat-esthetic', NULL, 'materials', '심미치료', '✨', 9),
  ('mat-tmj', NULL, 'materials', 'TMJ/턱관절', '🫠', 10);

-- ═══ 카테고리: 비용 안내 ═══
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('prc-implant', NULL, 'pricing', '임플란트', '🦷', 1),
  ('prc-prosth', NULL, 'pricing', '보철치료', '👑', 2),
  ('prc-cavity', NULL, 'pricing', '충치/신경치료', '🔬', 3),
  ('prc-esthetic', NULL, 'pricing', '심미치료', '✨', 4),
  ('prc-ortho', NULL, 'pricing', '교정치료', '😁', 5),
  ('prc-perio', NULL, 'pricing', '치주치료', '🩺', 6),
  ('prc-etc', NULL, 'pricing', '기타', '📋', 7);

-- ═══ 카테고리: 케이스 ═══
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('case-implant', NULL, 'cases', '임플란트', '🦷', 1),
  ('case-resin', NULL, 'cases', '레진/심미수복', '✨', 2),
  ('case-prosth', NULL, 'cases', '보철치료', '👑', 3),
  ('case-ortho', NULL, 'cases', '교정치료', '😁', 4),
  ('case-endo', NULL, 'cases', '신경치료', '🔬', 5),
  ('case-perio', NULL, 'cases', '치주치료', '🩺', 6),
  ('case-surgery', NULL, 'cases', '구강외과', '⚡', 7);

-- ═══ 카테고리: 상담 스크립트 ═══
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('scr-implant', NULL, 'scripts', '임플란트 상담', '🦷', 1),
  ('scr-cavity', NULL, 'scripts', '충치/신경치료 상담', '🔬', 2),
  ('scr-prosth', NULL, 'scripts', '보철 상담', '👑', 3),
  ('scr-ortho', NULL, 'scripts', '교정 상담', '😁', 4),
  ('scr-esthetic', NULL, 'scripts', '심미치료 상담', '✨', 5),
  ('scr-objection', NULL, 'scripts', '반론 대응', '🛡️', 6);

-- ═══ 카테고리: 채용 직군 ═══
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('hire-dentist', NULL, 'hire', '치과의사', '🩺', 1),
  ('hire-hygienist', NULL, 'hire', '치과위생사', '🦷', 2),
  ('hire-assistant', NULL, 'hire', '치과조무사', '🤲', 3),
  ('hire-coordinator', NULL, 'hire', '상담실장', '💬', 4),
  ('hire-receptionist', NULL, 'hire', '접수/수납', '🖥️', 5),
  ('hire-manager', NULL, 'hire', '사무/관리직', '📊', 6);

-- ═══ 샘플 상담 스크립트 ═══
INSERT OR IGNORE INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response, sort_order) VALUES
  ('s1', NULL, 'scr-implant', '임플란트 첫 상담',
   '환자가 임플란트에 대해 처음 문의할 때',
   '안녕하세요, 임플란트에 대해 궁금하신 점이 있으시군요. 먼저 현재 치아 상태를 정확히 파악한 후에 가장 적합한 치료 방법을 안내해 드리겠습니다. 임플란트는 자연 치아와 가장 유사한 기능과 심미성을 제공하는 치료법입니다.',
   '임플란트가 너무 비싸지 않나요?',
   '충분히 이해합니다. 비용이 부담되실 수 있는데요, 임플란트는 평균 15~20년 이상 사용 가능하기 때문에 장기적으로 보면 가장 경제적인 선택이 될 수 있습니다. 또한 무이자 할부도 가능하시니 부담 없이 진행하실 수 있어요.', 1),
  ('s2', NULL, 'scr-objection', '비용 부담 대응',
   '환자가 치료 비용이 비싸다고 할 때', '',
   '너무 비싸요. 다른 데는 더 싸던데요.',
   '네, 가격 비교를 하시는 건 당연한 거예요. 다만 저희 병원은 서울대 치과병원과 동일한 진료 시스템, 6개 독립 수술실, 에어샤워 감염관리까지 갖추고 있어서 안전성과 결과에서 차이가 있습니다. 결국 한 번 제대로 하시는 게 시간과 비용 모두 절약하는 길이에요.', 1);

-- ═══ 기본 칸반보드 ═══
INSERT OR IGNORE INTO kanban_boards (id, hospital_id, board_type, title) VALUES
  ('kb-purchase', 'h-demo', 'purchase', '물품 구매 요청'),
  ('kb-repair', 'h-demo', 'repair', '수리/정비 요청');

-- ═══ 샘플 칸반 카드: 물품 구매 ═══
INSERT OR IGNORE INTO kanban_cards (id, board_id, hospital_id, title, description, priority, requested_by, estimated_cost, status) VALUES
  ('kc-p1', 'kb-purchase', 'h-demo', '글러브 L사이즈 3박스', '진료용 니트릴 글러브 재고 부족', 'urgent', 'u-staff1', 5, 'requested'),
  ('kc-p2', 'kb-purchase', 'h-demo', '석션팁 일회용 500개', '일회용 석션팁 재고 소진 예정', 'high', 'u-staff2', 8, 'approved'),
  ('kc-p3', 'kb-purchase', 'h-demo', '인상용 트레이 세트', '상악/하악 각 사이즈별 2세트', 'normal', 'u-mgr', 12, 'in_progress'),
  ('kc-p4', 'kb-purchase', 'h-demo', '광중합기 배터리', '3번 진료실 광중합기 배터리 교체용', 'normal', 'u-admin', 15, 'completed'),
  ('kc-p5', 'kb-purchase', 'h-demo', 'A2 레진 5개', '필텍 A2 쉐이드 재고 부족', 'high', 'u-staff1', 25, 'requested');

-- ═══ 샘플 칸반 카드: 수리/정비 ═══
INSERT OR IGNORE INTO kanban_cards (id, board_id, hospital_id, title, description, priority, requested_by, estimated_cost, status) VALUES
  ('kc-r1', 'kb-repair', 'h-demo', '2번 유닛 체어 리클라인 고장', '환자 체어가 뒤로 안 넘어감, 모터 점검 필요', 'urgent', 'u-staff1', 50, 'requested'),
  ('kc-r2', 'kb-repair', 'h-demo', '파노라마 센서 교정', '촬영 영상 일부 흐림 발생', 'high', 'u-admin', 80, 'approved'),
  ('kc-r3', 'kb-repair', 'h-demo', '에어컨 필터 교체 (3층)', '냉방 효율 저하, 필터 교체 시기', 'normal', 'u-mgr', 10, 'in_progress'),
  ('kc-r4', 'kb-repair', 'h-demo', '멸균기 패킹 교체', '고압증기멸균기 패킹 마모', 'high', 'u-staff2', 20, 'requested');

-- ═══ 샘플 체크리스트 ═══
INSERT OR IGNORE INTO checklists (id, hospital_id, title, checklist_type, items) VALUES
  ('cl-open', 'h-demo', '개원 전 체크리스트', 'daily_open',
   '["전원 및 조명 점검","에어컨/난방 온도 설정","대기실 정리 및 청소","진료실 장비 전원 ON","멸균기 작동 확인","예약 환자 리스트 확인","수납 시스템 부팅","직원 출근 현황 체크"]'),
  ('cl-close', 'h-demo', '마감 체크리스트', 'daily_close',
   '["당일 수납 마감 정산","내일 예약 환자 확인","진료실 장비 전원 OFF","멸균기 사이클 완료 확인","쓰레기/의료폐기물 처리","대기실 및 화장실 정리","보안 시스템 설정","전체 조명 소등"]'),
  ('cl-infection', 'h-demo', '감염관리 체크리스트', 'infection',
   '["에어샤워 시스템 작동 확인","고압증기멸균기 BI 테스트","핸드피스 멸균 상태 확인","석션라인 소독","진료실 표면소독 완료","일회용품 재고 확인","손소독제 보충","폐기물 분리수거 확인"]');

-- ═══ 샘플 마케팅 채널 ═══
INSERT OR IGNORE INTO marketing_channels (id, hospital_id, name, monthly_cost) VALUES
  ('mc-naver', 'h-demo', '네이버 플레이스', 0),
  ('mc-nblog', 'h-demo', '네이버 블로그/파워링크', 200),
  ('mc-insta', 'h-demo', '인스타그램', 150),
  ('mc-youtube', 'h-demo', '유튜브', 100),
  ('mc-referral', 'h-demo', '지인소개', 0),
  ('mc-walk', 'h-demo', '도보 내원', 0);

-- ═══ 샘플 채용 공고 ═══
INSERT OR IGNORE INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by) VALUES
  ('jp-1', 'h-demo', '치과위생사 정규직 채용', 'hygienist', 'full_time',
   '서울비디치과에서 함께 성장할 치과위생사를 모집합니다.\n\n400평 규모, 6개 독립 수술실, 에어샤워 감염관리 시스템을 갖춘 최첨단 환경에서 근무하실 수 있습니다.',
   '- 치과위생사 면허 소지자\n- 경력 2년 이상 우대\n- 임플란트/보철 경험자 우대\n- 친절하고 책임감 있는 분',
   '- 4대 보험\n- 점심 제공\n- 연차/월차\n- 인센티브 제도\n- 체계적 교육 프로그램',
   280, 350, 'open', 'u-admin'),
  ('jp-2', 'h-demo', '상담실장 채용', 'coordinator', 'full_time',
   'Patient Funnel 시스템을 활용한 체계적 상담을 담당할 실장님을 모집합니다.',
   '- 치과 상담 경력 3년 이상\n- 커뮤니케이션 능력 우수자\n- 환자 응대 경험 풍부',
   '- 성과급 인센티브\n- 4대 보험\n- 점심 제공\n- 자기계발비 지원',
   300, 400, 'open', 'u-admin');

-- ═══ 샘플 지원자 ═══
INSERT OR IGNORE INTO applicants (id, hospital_id, job_posting_id, name, email, phone, status, rating, notes) VALUES
  ('ap-1', 'h-demo', 'jp-1', '최수진', 'choi@email.com', '010-1234-5678', 'interview', 4, '경력 3년, 임플란트 경험 풍부'),
  ('ap-2', 'h-demo', 'jp-1', '김민정', 'kimm@email.com', '010-2345-6789', 'screening', 3, '신입, 성실한 태도'),
  ('ap-3', 'h-demo', 'jp-1', '이서연', 'lee@email.com', '010-3456-7890', 'applied', 0, ''),
  ('ap-4', 'h-demo', 'jp-2', '정하나', 'jung@email.com', '010-4567-8901', 'evaluation', 5, '대형치과 5년 경력, 전환율 62% 달성');

-- ═══ 샘플 체어 ═══
INSERT OR IGNORE INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES
  ('ch-1', 'h-demo', 1, '2F', '진료실 A', 1),
  ('ch-2', 'h-demo', 2, '2F', '진료실 A', 2),
  ('ch-3', 'h-demo', 3, '2F', '진료실 B', 3),
  ('ch-4', 'h-demo', 4, '3F', '수술실 1', 4),
  ('ch-5', 'h-demo', 5, '3F', '수술실 2', 5),
  ('ch-6', 'h-demo', 6, '3F', '수술실 3', 6),
  ('ch-7', 'h-demo', 7, '4F', '교정실', 7);

-- ═══ 샘플 진료보드 (오늘 날짜는 seed시 수동 설정 필요. 일단 고정 날짜) ═══
-- sort_order = 원장이 가야할 순서 (낮을수록 먼저!)
-- assigned_doctor = NULL → 대기 컬럼, 원장ID → 해당 원장 컬럼
INSERT OR IGNORE INTO treatment_board (id, hospital_id, chair_id, board_date, patient_name, patient_type, chart_number, assigned_doctor, assigned_staff, treatment_desc, treatment_type, status, priority, appointment_time, sort_order) VALUES
  -- 🔔 문석준 원장 컬럼 (sort_order순 = 이동 순서)
  ('tb-7', 'h-demo', 'ch-5', '2026-03-26', '최유나', 'existing', '20250201', 'u-admin', 'u-staff2', '신경치료 2회차 - 근관 충전', 'endo', 'doctor_needed', 'urgent', '10:30', 1),
  ('tb-6', 'h-demo', 'ch-1', '2026-03-26', '박서준', 'new', '', 'u-admin', NULL, '임플란트 1차 식립 (46번)', 'implant', 'in_treatment', 'high', '11:00', 2),
  ('tb-1', 'h-demo', 'ch-2', '2026-03-26', '강민우', 'existing', '20240312', 'u-admin', 'u-staff1', '라미네이트 + 브릿지 셋팅 리메이크', 'prosth', 'arrived', 'normal', '09:30', 3),
  ('tb-2', 'h-demo', 'ch-4', '2026-03-26', '김학권', 'existing', '20250115', 'u-admin', 'u-staff2', '전체적 검진 후 임플란트 상담', 'implant', 'waiting', 'normal', '10:00', 4),
  ('tb-4', 'h-demo', 'ch-7', '2026-03-26', '윤명한', 'existing', '20231108', 'u-admin', 'u-staff2', '상악 틀니 체크', 'prosth', 'completed', 'normal', '09:00', 99),
  -- 🩺 김수현 원장 컬럼
  ('tb-5', 'h-demo', 'ch-3', '2026-03-26', '이동희', 'existing', '20240520', 'u-mgr', 'u-staff1', '3개월 정기검진', 'checkup', 'in_treatment', 'low', '09:30', 1),
  ('tb-9', 'h-demo', 'ch-6', '2026-03-26', '정윤서', 'existing', '20250110', 'u-mgr', NULL, '스케일링 + 잇몸 치료', 'perio', 'arrived', 'normal', '10:00', 2),
  ('tb-10', 'h-demo', NULL, '2026-03-26', '이승민', 'new', '', 'u-mgr', 'u-staff2', '충치 5개 레진 수복', 'general', 'waiting', 'high', '10:30', 3),
  -- 📋 대기 컬럼 (아직 원장 미배정)
  ('tb-3', 'h-demo', 'ch-7', '2026-03-26', '맹선영', 'new', '', NULL, 'u-staff1', '오른쪽 윗 어금니 시림/통증', 'general', 'seating', 'high', '10:30', 1),
  ('tb-8', 'h-demo', NULL, '2026-03-26', '한지민', 'referral', '', NULL, NULL, '교정 상담 (소개 환자)', 'ortho', 'waiting', 'normal', '11:30', 2),
  ('tb-11', 'h-demo', NULL, '2026-03-26', '오서진', 'new', '', NULL, NULL, '사랑니 발치 상담', 'extraction', 'arrived', 'normal', '11:00', 3);

-- ═══ 샘플 상담 데이터 ═══
INSERT OR IGNORE INTO consultations (id, hospital_id, patient_name, patient_phone, patient_age, patient_gender, source_channel, treatment_type, status, assigned_counselor, estimated_amount, agreed_amount, paid_amount, consultation_date) VALUES
  ('cs-1', 'h-demo', '김영희', '010-1111-2222', '45', 'F', 'naver', 'implant', 'agreed', 'u-mgr', 800, 750, NULL, '2026-03-20'),
  ('cs-2', 'h-demo', '이철수', '010-2222-3333', '52', 'M', 'referral', 'implant', 'payment', 'u-mgr', 1200, 1100, 550, '2026-03-18'),
  ('cs-3', 'h-demo', '박민수', '010-3333-4444', '35', 'M', 'instagram', 'ortho', 'consulting', NULL, 600, NULL, NULL, '2026-03-25'),
  ('cs-4', 'h-demo', '정수아', '010-4444-5555', '28', 'F', 'phone', 'esthetic', 'visited', 'u-staff1', 200, NULL, NULL, '2026-03-26'),
  ('cs-5', 'h-demo', '한서연', '010-5555-6666', '40', 'F', 'walk_in', 'prosth', 'completed', 'u-mgr', 500, 480, 480, '2026-03-10'),
  ('cs-6', 'h-demo', '오진우', '010-6666-7777', '33', 'M', 'youtube', 'implant', 'lost', NULL, 900, NULL, NULL, '2026-03-15'),
  ('cs-7', 'h-demo', '강민지', '010-7777-8888', '29', 'F', 'naver', 'checkup', 'treatment', 'u-staff1', 50, 50, 50, '2026-03-22'),
  ('cs-8', 'h-demo', '윤재호', '010-8888-9999', '55', 'M', 'blog', 'perio', 'inquiry', NULL, 300, NULL, NULL, '2026-03-26'),
  ('cs-9', 'h-demo', '조은별', '010-9999-0000', '38', 'F', 'kakao', 'implant', 'reserved', 'u-mgr', 700, NULL, NULL, '2026-03-27'),
  ('cs-10', 'h-demo', '신동현', '010-1234-0000', '48', 'M', 'referral', 'prosth', 'payment', 'u-mgr', 400, 380, 380, '2026-03-12');

-- 상담 노트
INSERT OR IGNORE INTO consultation_notes (id, consultation_id, author_id, note_type, content) VALUES
  ('cn-1', 'cs-1', 'u-mgr', 'general', '임플란트 2개 식립 희망. 골질 양호. CT 촬영 완료.'),
  ('cn-2', 'cs-1', 'u-mgr', 'objection', '환자: "비용이 부담됩니다." → 무이자 6개월 할부 안내 후 긍정적 반응'),
  ('cn-3', 'cs-2', 'u-mgr', 'treatment_plan', '상악 4개 임플란트 + 하악 브릿지. 1차 수술 3/25 예정'),
  ('cn-4', 'cs-2', 'u-admin', 'payment', '1차 수납 550만원 완료. 잔금 550만원 보철 세팅 시 수납 예정'),
  ('cn-5', 'cs-3', 'u-staff1', 'general', '투명교정 관심. 비용 상담 진행 중. 치아 사진 촬영 완료'),
  ('cn-6', 'cs-6', 'u-mgr', 'follow_up', '3회 전화 연결 안 됨. 비용 부담으로 보류 상태로 판단');
