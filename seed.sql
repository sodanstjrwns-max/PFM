-- Seed: 기본 카테고리 데이터

-- 설명자료 카테고리 (글로벌)
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('mat-implant', NULL, 'materials', '임플란트', '🦷', 1),
  ('mat-cavity', NULL, 'materials', '충치치료/신경치료', '🔬', 2),
  ('mat-prosth', NULL, 'materials', '보철치료', '👑', 3),
  ('mat-ortho', NULL, 'materials', '교정치료', '😁', 4),
  ('mat-perio', NULL, 'materials', '치주치료', '🩺', 5),
  ('mat-extract', NULL, 'materials', '발치/사랑니', '⚡', 6),
  ('mat-pedo', NULL, 'materials', '소아치과', '👶', 7),
  ('mat-hygiene', NULL, 'materials', '구강위생/예방', '🪥', 8),
  ('mat-esthetic', NULL, 'materials', '심미치료', '✨', 9),
  ('mat-tmj', NULL, 'materials', 'TMJ/턱관절', '🫠', 10);

-- 비용안내 카테고리 (글로벌 - 각 병원이 가격만 커스텀)
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('prc-implant', NULL, 'pricing', '임플란트', '🦷', 1),
  ('prc-prosth', NULL, 'pricing', '보철치료', '👑', 2),
  ('prc-cavity', NULL, 'pricing', '충치/신경치료', '🔬', 3),
  ('prc-esthetic', NULL, 'pricing', '심미치료', '✨', 4),
  ('prc-ortho', NULL, 'pricing', '교정치료', '😁', 5),
  ('prc-perio', NULL, 'pricing', '치주치료', '🩺', 6),
  ('prc-etc', NULL, 'pricing', '기타', '📋', 7);

-- 케이스 카테고리 (글로벌)
INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES
  ('case-implant', NULL, 'cases', '임플란트', '🦷', 1),
  ('case-resin', NULL, 'cases', '레진/심미수복', '✨', 2),
  ('case-prosth', NULL, 'cases', '보철치료', '👑', 3),
  ('case-ortho', NULL, 'cases', '교정치료', '😁', 4),
  ('case-endo', NULL, 'cases', '신경치료', '🔬', 5),
  ('case-perio', NULL, 'cases', '치주치료', '🩺', 6),
  ('case-surgery', NULL, 'cases', '구강외과', '⚡', 7);

-- 데모 병원
INSERT OR IGNORE INTO hospitals (id, name, phone, address) VALUES
  ('h-demo', '서울비디치과', '02-1234-5678', '서울특별시 강남구');

-- 데모 관리자 (password: admin123 → 해시는 런타임에서 처리, 여기선 placeholder)
INSERT OR IGNORE INTO users (id, hospital_id, email, password_hash, name, role) VALUES
  ('u-admin', 'h-demo', 'admin@seoulbd.com', '$pbkdf2$admin123', '문석준', 'admin');
