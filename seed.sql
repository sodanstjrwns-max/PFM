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

-- ═══ 샘플 칸반 카드: 물품 구매 (부서별 분리) ═══
INSERT OR IGNORE INTO kanban_cards (id, board_id, hospital_id, title, description, priority, department, requested_by, estimated_cost, status) VALUES
  ('kc-p1', 'kb-purchase', 'h-demo', '글러브 L사이즈 3박스', '진료용 니트릴 글러브 재고 부족', 'urgent', 'clinical', 'u-staff1', 5, 'requested'),
  ('kc-p2', 'kb-purchase', 'h-demo', '석션팁 일회용 500개', '일회용 석션팁 재고 소진 예정', 'high', 'clinical', 'u-staff2', 8, 'approved'),
  ('kc-p3', 'kb-purchase', 'h-demo', '인상용 트레이 세트', '상악/하악 각 사이즈별 2세트', 'normal', 'clinical', 'u-mgr', 12, 'in_progress'),
  ('kc-p4', 'kb-purchase', 'h-demo', '광중합기 배터리', '3번 진료실 광중합기 배터리 교체용', 'normal', 'clinical', 'u-admin', 15, 'completed'),
  ('kc-p5', 'kb-purchase', 'h-demo', 'A2 레진 5개', '필텍 A2 쉐이드 재고 부족', 'high', 'clinical', 'u-staff1', 25, 'requested'),
  ('kc-p6', 'kb-purchase', 'h-demo', '영수증 프린터 용지 10롤', '수납용 프린터 용지 재고 소진 예정', 'normal', 'desk', 'u-staff2', 3, 'requested'),
  ('kc-p7', 'kb-purchase', 'h-demo', '손소독제 대용량 5개', '데스크 및 대기실용 손소독제 보충', 'high', 'desk', 'u-staff2', 5, 'approved'),
  ('kc-p8', 'kb-purchase', 'h-demo', '대기실 잡지 갱신', '3월호 잡지 비치', 'low', 'desk', 'u-mgr', 2, 'completed'),
  ('kc-p9', 'kb-purchase', 'h-demo', '화장실 방향제 3개', '1층, 3층, 5층 화장실 방향제 교체', 'normal', 'general', 'u-staff1', 2, 'requested');

-- ═══ 샘플 칸반 카드: 수리/정비 ═══
INSERT OR IGNORE INTO kanban_cards (id, board_id, hospital_id, title, description, priority, department, requested_by, estimated_cost, status) VALUES
  ('kc-r1', 'kb-repair', 'h-demo', '2번 유닛 체어 리클라인 고장', '환자 체어가 뒤로 안 넘어감, 모터 점검 필요', 'urgent', 'clinical', 'u-staff1', 50, 'requested'),
  ('kc-r2', 'kb-repair', 'h-demo', '파노라마 센서 교정', '촬영 영상 일부 흐림 발생', 'high', 'clinical', 'u-admin', 80, 'approved'),
  ('kc-r3', 'kb-repair', 'h-demo', '에어컨 필터 교체 (3층)', '냉방 효율 저하, 필터 교체 시기', 'normal', 'general', 'u-mgr', 10, 'in_progress'),
  ('kc-r4', 'kb-repair', 'h-demo', '멸균기 패킹 교체', '고압증기멸균기 패킹 마모', 'high', 'clinical', 'u-staff2', 20, 'requested'),
  ('kc-r5', 'kb-repair', 'h-demo', '1층 자동문 센서 오작동', '문이 열린 채 닫히지 않는 경우 발생', 'high', 'desk', 'u-staff2', 30, 'requested');

-- ═══ 직원용품 주문 데이터 ═══
INSERT OR IGNORE INTO staff_supplies (id, hospital_id, user_id, item_type, item_name, size, color, quantity, notes, status, requested_by, order_date, delivery_date) VALUES
  ('ss-1', 'h-demo', 'u-staff1', 'uniform', '수술복 상의', '55', '네이비', 2, '', 'delivered', 'u-staff1', '2026-02-15', '2026-02-22'),
  ('ss-2', 'h-demo', 'u-staff1', 'crocs', '크록스 슬리퍼', '230', '화이트', 1, '', 'delivered', 'u-staff1', '2026-02-15', '2026-02-20'),
  ('ss-3', 'h-demo', 'u-staff2', 'uniform', '수술복 상하의 세트', '66', '네이비', 1, '신규입사 지급', 'ordered', 'u-mgr', '2026-03-20', NULL),
  ('ss-4', 'h-demo', 'u-staff2', 'nametag', '명찰', '', '', 1, '이하늘 / 진료실', 'delivered', 'u-mgr', '2026-03-10', '2026-03-12'),
  ('ss-5', 'h-demo', 'u-mgr', 'cardigan', '가디건', 'F', '차콜', 1, '사이즈 교환 요청', 'requested', 'u-mgr', NULL, NULL),
  ('ss-6', 'h-demo', 'u-staff1', 'crocs', '크록스 슬리퍼', '235', '화이트', 1, '기존 것 마모 심함', 'approved', 'u-staff1', NULL, NULL);

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

-- ═══ 연차/휴가 잔여일수 (2026년) ═══
INSERT OR IGNORE INTO leave_balances (id, hospital_id, user_id, year, leave_type, total_days, used_days) VALUES
  ('lb-1',  'h-demo', 'u-admin',  2026, 'annual', 15, 3),
  ('lb-2',  'h-demo', 'u-admin',  2026, 'sick', 3, 0),
  ('lb-3',  'h-demo', 'u-mgr',    2026, 'annual', 15, 2),
  ('lb-4',  'h-demo', 'u-mgr',    2026, 'sick', 3, 1),
  ('lb-5',  'h-demo', 'u-staff1', 2026, 'annual', 11, 1.5),
  ('lb-6',  'h-demo', 'u-staff1', 2026, 'sick', 3, 0),
  ('lb-7',  'h-demo', 'u-staff2', 2026, 'annual', 11, 2),
  ('lb-8',  'h-demo', 'u-staff2', 2026, 'sick', 3, 0),
  ('lb-9',  'h-demo', 'u-staff1', 2026, 'half_am', 0, 0),
  ('lb-10', 'h-demo', 'u-staff1', 2026, 'half_pm', 0, 0),
  ('lb-11', 'h-demo', 'u-staff2', 2026, 'half_am', 0, 0),
  ('lb-12', 'h-demo', 'u-staff2', 2026, 'half_pm', 0, 0);

-- ═══ 연차 신청 데이터 ═══
INSERT OR IGNORE INTO leave_requests (id, hospital_id, user_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at) VALUES
  ('lr-1', 'h-demo', 'u-admin',  'annual', '2026-01-20', '2026-01-22', 3, '개인 사유 (가족 여행)', 'approved', 'u-admin', '2026-01-15 10:00:00'),
  ('lr-2', 'h-demo', 'u-mgr',    'annual', '2026-02-14', '2026-02-14', 1, '결혼기념일', 'approved', 'u-admin', '2026-02-10 09:00:00'),
  ('lr-3', 'h-demo', 'u-mgr',    'sick',   '2026-03-05', '2026-03-05', 1, '감기 몸살', 'approved', 'u-admin', '2026-03-05 08:30:00'),
  ('lr-4', 'h-demo', 'u-staff1', 'half_am','2026-03-12', '2026-03-12', 0.5, '병원 방문 (오전)', 'approved', 'u-admin', '2026-03-10 14:00:00'),
  ('lr-5', 'h-demo', 'u-staff1', 'annual', '2026-03-20', '2026-03-20', 1, '개인 사유', 'approved', 'u-mgr', '2026-03-18 11:00:00'),
  ('lr-6', 'h-demo', 'u-staff2', 'annual', '2026-04-07', '2026-04-08', 2, '제주도 여행', 'pending', NULL, NULL),
  ('lr-7', 'h-demo', 'u-staff2', 'half_pm','2026-03-28', '2026-03-28', 0.5, '은행 업무 (오후)', 'pending', NULL, NULL),
  ('lr-8', 'h-demo', 'u-mgr',    'annual', '2026-04-14', '2026-04-14', 1, '개인 사유', 'pending', NULL, NULL),
  ('lr-9', 'h-demo', 'u-staff1', 'annual', '2026-04-21', '2026-04-22', 2, '친구 결혼식 + 이동', 'rejected', 'u-admin', '2026-04-15 09:00:00');

-- ═══ 회의 데이터 ═══
INSERT OR IGNORE INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, status, visibility, created_by) VALUES
  ('mt-1', 'h-demo', '3월 월간 경영회의', '3월 매출 리뷰, 4월 마케팅 계획, 신규 장비 도입 논의', '2026-03-10', '09:00', '10:30', '4층 회의실', 'completed', 'all', 'u-admin'),
  ('mt-2', 'h-demo', '감염관리 교육 회의', '분기별 감염관리 교육 및 체크리스트 점검', '2026-03-17', '18:00', '19:00', '3층 세미나실', 'completed', 'all', 'u-mgr'),
  ('mt-3', 'h-demo', '신환 상담 프로세스 개선 회의', '상담 전환율 개선을 위한 프로세스 점검', '2026-03-24', '12:30', '13:30', '원장실', 'completed', 'participants', 'u-admin'),
  ('mt-4', 'h-demo', '4월 월간 경영회의', '4월 목표 설정, 직원 평가, 장비 발주 확인', '2026-04-07', '09:00', '10:30', '4층 회의실', 'scheduled', 'all', 'u-admin'),
  ('mt-5', 'h-demo', '인터뷰 결과 논의', '치과위생사 채용 후보 3명 평가', '2026-04-02', '18:00', '18:30', '원장실', 'scheduled', 'admin', 'u-admin'),
  ('mt-6', 'h-demo', '직원 워크숍 기획', '상반기 워크숍 일정 및 프로그램 논의', '2026-04-14', '12:30', '13:00', '4층 회의실', 'scheduled', 'participants', 'u-mgr');

-- 회의 참가자
INSERT OR IGNORE INTO meeting_participants (id, meeting_id, user_id, role, attendance) VALUES
  ('mp-1',  'mt-1', 'u-admin',  'organizer',  'attended'),
  ('mp-2',  'mt-1', 'u-mgr',    'presenter',  'attended'),
  ('mp-3',  'mt-1', 'u-staff1', 'attendee',   'attended'),
  ('mp-4',  'mt-1', 'u-staff2', 'attendee',   'late'),
  ('mp-5',  'mt-2', 'u-mgr',    'organizer',  'attended'),
  ('mp-6',  'mt-2', 'u-staff1', 'attendee',   'attended'),
  ('mp-7',  'mt-2', 'u-staff2', 'attendee',   'attended'),
  ('mp-8',  'mt-3', 'u-admin',  'organizer',  'attended'),
  ('mp-9',  'mt-3', 'u-mgr',    'presenter',  'attended'),
  ('mp-10', 'mt-3', 'u-staff1', 'attendee',   'absent'),
  ('mp-11', 'mt-4', 'u-admin',  'organizer',  'pending'),
  ('mp-12', 'mt-4', 'u-mgr',    'attendee',   'pending'),
  ('mp-13', 'mt-4', 'u-staff1', 'attendee',   'pending'),
  ('mp-14', 'mt-4', 'u-staff2', 'attendee',   'pending'),
  ('mp-15', 'mt-5', 'u-admin',  'organizer',  'pending'),
  ('mp-16', 'mt-5', 'u-mgr',    'attendee',   'pending'),
  ('mp-17', 'mt-6', 'u-mgr',    'organizer',  'pending'),
  ('mp-18', 'mt-6', 'u-admin',  'attendee',   'pending'),
  ('mp-19', 'mt-6', 'u-staff1', 'attendee',   'pending'),
  ('mp-20', 'mt-6', 'u-staff2', 'attendee',   'pending');

-- 회의록 (완료된 회의만)
INSERT OR IGNORE INTO meeting_minutes (id, meeting_id, content, decisions, action_items, written_by) VALUES
  ('mm-1', 'mt-1', '1. 3월 매출 11.2억 달성 (목표 대비 102%)\n2. 임플란트 매출 전월 대비 15% 증가\n3. 네이버 광고 ROI 3.2배로 효율적\n4. 인스타그램 팔로워 2,000명 돌파\n5. 4월 벚꽃 이벤트 마케팅 계획 발표\n6. CT 장비 교체 견적 3곳 비교 완료', '1. 4월 마케팅 예산 500만원 → 600만원 증액 승인\n2. CT 장비 A사 제품으로 5월 도입 결정\n3. 신환 목표 월 80명 → 90명 상향', '1. 김수현: 4월 마케팅 상세 계획서 4/3까지 제출\n2. 박지은: CT 장비 A사 계약서 검토\n3. 이하늘: 벚꽃 이벤트 SNS 콘텐츠 제작\n4. 문석준: 직원 인센티브 기준 재정립', 'u-mgr'),
  ('mm-2', 'mt-2', '1. 핸드피스 멸균 프로토콜 재점검\n2. 에어샤워 시스템 점검 결과 보고\n3. 1회용품 재고 관리 시스템 개선\n4. 직원별 감염관리 체크리스트 이행률 확인', '1. 핸드피스 멸균 주기 4시간 → 3시간으로 단축\n2. 1회용 장갑 브랜드 변경 (A사 → B사)', '1. 박지은: 새 멸균 매뉴얼 작성 3/24까지\n2. 이하늘: 1회용품 발주 리스트 업데이트', 'u-mgr'),
  ('mm-3', 'mt-3', '1. 현재 상담 전환율 50% → 목표 65%\n2. 초진 상담 시 환자 불안감 해소 스크립트 부족\n3. 비용 상담 시 할부 안내가 늦어지는 경우 발견\n4. 상담 후 팔로업 콜 누락 건 3건', '1. 초진 상담 스크립트 3종 신규 제작\n2. 비용 안내 시 무이자 할부 먼저 안내하도록 변경\n3. 팔로업 콜 체크리스트 도입', '1. 김수현: 초진 상담 스크립트 초안 3/28까지\n2. 문석준: 상담 스크립트 최종 검토', 'u-admin');

-- ═══ 캘린더 일정 데이터 ═══
-- 회의 → 캘린더 자동 등록 (시드 회의에 대응)
INSERT OR IGNORE INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES
  ('ev-mt1', 'h-demo', '📝 3월 월간 경영회의',         '장소: 4층 회의실\n3월 매출 리뷰, 4월 마케팅 계획, 신규 장비 도입 논의',     'meeting', '2026-03-10', '2026-03-10', 0, '#3b82f6', 'u-admin'),
  ('ev-mt2', 'h-demo', '📝 감염관리 교육 회의',         '장소: 3층 세미나실\n분기별 감염관리 교육 및 체크리스트 점검',               'meeting', '2026-03-17', '2026-03-17', 0, '#3b82f6', 'u-mgr'),
  ('ev-mt3', 'h-demo', '📝 신환 상담 프로세스 개선 회의', '장소: 원장실\n상담 전환율 개선을 위한 프로세스 점검',                    'meeting', '2026-03-24', '2026-03-24', 0, '#3b82f6', 'u-admin'),
  ('ev-mt4', 'h-demo', '📝 4월 월간 경영회의',          '장소: 4층 회의실\n4월 목표 설정, 직원 평가, 장비 발주 확인',              'meeting', '2026-04-07', '2026-04-07', 0, '#3b82f6', 'u-admin'),
  ('ev-mt5', 'h-demo', '📝 인터뷰 결과 논의',           '장소: 원장실\n치과위생사 채용 후보 3명 평가',                           'meeting', '2026-04-02', '2026-04-02', 0, '#3b82f6', 'u-admin'),
  ('ev-mt6', 'h-demo', '📝 직원 워크숍 기획',           '장소: 4층 회의실\n상반기 워크숍 일정 및 프로그램 논의',                   'meeting', '2026-04-14', '2026-04-14', 0, '#3b82f6', 'u-mgr'),
-- 일반 병원 일정
  ('ev-1',   'h-demo', '🏥 CT 장비 정기 점검',          '업체 엔지니어 방문 예정 (오전 9시)',                                    'maintenance', '2026-03-12', '2026-03-12', 0, '#f59e0b', 'u-admin'),
  ('ev-2',   'h-demo', '🎓 네이버 광고 교육 세미나',     '온라인 참가 (줌 링크 별도 공유)',                                       'education',   '2026-03-14', '2026-03-14', 0, '#8b5cf6', 'u-mgr'),
  ('ev-3',   'h-demo', '🌸 벚꽃 시즌 이벤트 시작',       '화이트닝 20% 할인 + SNS 이벤트 동시 진행',                              'other',       '2026-04-01', '2026-04-15', 1, '#ec4899', 'u-admin'),
  ('ev-4',   'h-demo', '🔧 오토클레이브 필터 교체',       '멸균기 정기 필터 교체 (연 2회)',                                        'maintenance', '2026-04-10', '2026-04-10', 0, '#f59e0b', 'u-mgr'),
  ('ev-5',   'h-demo', '🏖️ 개원 기념일',                '서울비디치과 5주년 기념',                                              'other',       '2026-04-20', '2026-04-20', 1, '#22c55e', 'u-admin'),
  ('ev-6',   'h-demo', '📋 4월 위생사 면접',             '오전 10시~12시, 3명 면접 예정',                                         'other',       '2026-04-03', '2026-04-03', 0, '#6366f1', 'u-admin'),
  ('ev-7',   'h-demo', '🏥 파노라마 센서 수리',          '수리 업체 내원 예정 (오후 2시)',                                         'maintenance', '2026-03-28', '2026-03-28', 0, '#f59e0b', 'u-admin');
