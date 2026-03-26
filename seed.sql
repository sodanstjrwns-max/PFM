-- ════════════════════════════════════════════════════════════════
-- Patient Funnel Manager - Seed Data v2.0
-- ════════════════════════════════════════════════════════════════

-- ═══ 데모 병원 & 관리자 ═══
INSERT OR IGNORE INTO hospitals (id, name, phone, address) VALUES
  ('h-demo', '서울비디치과', '02-1234-5678', '서울특별시 강남구 테헤란로 123');

INSERT OR IGNORE INTO users (id, hospital_id, email, password_hash, name, role) VALUES
  ('u-admin', 'h-demo', 'admin@seoulbd.com', '$pbkdf2$admin123', '문석준', 'admin'),
  ('u-mgr', 'h-demo', 'manager@seoulbd.com', '$pbkdf2$manager1', '김수현', 'manager'),
  ('u-staff1', 'h-demo', 'hygienist1@seoulbd.com', '$pbkdf2$staff123', '박지은', 'staff'),
  ('u-staff2', 'h-demo', 'assistant1@seoulbd.com', '$pbkdf2$staff123', '이하늘', 'staff');

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
