-- Extended Seed Data

-- 상담 스크립트 카테고리
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('scr-implant', NULL, 'scripts', '임플란트 상담', '🦷', 1),
  ('scr-cavity', NULL, 'scripts', '충치/신경치료 상담', '🔬', 2),
  ('scr-prosth', NULL, 'scripts', '보철 상담', '👑', 3),
  ('scr-ortho', NULL, 'scripts', '교정 상담', '😁', 4),
  ('scr-esthetic', NULL, 'scripts', '심미치료 상담', '✨', 5),
  ('scr-objection', NULL, 'scripts', '반론 대응', '🛡️', 6);

-- 기본 칸반보드 (서울비디치과)
INSERT OR IGNORE INTO kanban_boards (id, hospital_id, board_type, title) VALUES
  ('kb-purchase', 'h-demo', 'purchase', '물품 구매 요청'),
  ('kb-repair', 'h-demo', 'repair', '수리/정비 요청');

-- 샘플 상담 스크립트
INSERT OR IGNORE INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response, sort_order) VALUES
  ('s1', NULL, 'scr-implant', '임플란트 첫 상담',
   '환자가 임플란트에 대해 처음 문의할 때',
   '안녕하세요, 임플란트에 대해 궁금하신 점이 있으시군요. 먼저 현재 치아 상태를 정확히 파악한 후에 가장 적합한 치료 방법을 안내해 드리겠습니다. 임플란트는 자연 치아와 가장 유사한 기능과 심미성을 제공하는 치료법입니다.',
   '임플란트가 너무 비싸지 않나요?',
   '충분히 이해합니다. 비용이 부담되실 수 있는데요, 임플란트는 평균 15~20년 이상 사용 가능하기 때문에 장기적으로 보면 가장 경제적인 선택이 될 수 있습니다. 또한 무이자 할부도 가능하시니 부담 없이 진행하실 수 있어요.',
   1),
  ('s2', NULL, 'scr-objection', '비용 부담 대응',
   '환자가 치료 비용이 비싸다고 할 때',
   '',
   '너무 비싸요. 다른 데는 더 싸던데요.',
   '네, 가격 비교를 하시는 건 당연한 거예요. 다만 저희 병원은 서울대 치과병원과 동일한 진료 시스템, 6개 독립 수술실, 에어샤워 감염관리까지 갖추고 있어서 안전성과 결과에서 차이가 있습니다. 결국 한 번 제대로 하시는 게 시간과 비용 모두 절약하는 길이에요.',
   1);

-- 샘플 체크리스트
INSERT OR IGNORE INTO checklists (id, hospital_id, title, checklist_type, items) VALUES
  ('cl-open', 'h-demo', '개원 전 체크리스트', 'daily_open',
   '["전원 및 조명 점검","에어컨/난방 온도 설정","대기실 정리 및 청소","진료실 장비 전원 ON","멸균기 작동 확인","예약 환자 리스트 확인","수납 시스템 부팅","직원 출근 현황 체크"]'),
  ('cl-close', 'h-demo', '마감 체크리스트', 'daily_close',
   '["당일 수납 마감 정산","내일 예약 환자 확인","진료실 장비 전원 OFF","멸균기 사이클 완료 확인","쓰레기/의료폐기물 처리","대기실 및 화장실 정리","보안 시스템 설정","전체 조명 소등"]'),
  ('cl-infection', 'h-demo', '감염관리 체크리스트', 'infection',
   '["에어샤워 시스템 작동 확인","고압증기멸균기 BI 테스트","핸드피스 멸균 상태 확인","석션라인 소독","진료실 표면소독 완료","일회용품 재고 확인","손소독제 보충","폐기물 분리수거 확인"]');

-- 샘플 마케팅 채널
INSERT OR IGNORE INTO marketing_channels (id, hospital_id, name, monthly_cost) VALUES
  ('mc-naver', 'h-demo', '네이버 플레이스', 0),
  ('mc-nblog', 'h-demo', '네이버 블로그/파워링크', 200),
  ('mc-insta', 'h-demo', '인스타그램', 150),
  ('mc-referral', 'h-demo', '지인소개', 0),
  ('mc-walk', 'h-demo', '도보 내원', 0);
