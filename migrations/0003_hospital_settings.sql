-- ═══ 병원별 설정 (위치 용어 커스텀 등) ═══
ALTER TABLE hospitals ADD COLUMN settings TEXT DEFAULT '{}';

-- 기본 위치 용어 설정 예시:
-- {
--   "location_terms": {
--     "chair":  "체어",        -- 체어/유닛/진료대
--     "room":   "진료실",      -- 진료실/방/룸
--     "floor":  "층",          -- 층/F/플로어
--     "surgery_room": "수술실", -- 수술실/OP실
--     "waiting_room": "대기실", -- 대기실/로비
--     "consult_room": "상담실", -- 상담실/CC룸
--     "xray_room": "촬영실",   -- 촬영실/방사선실
--     "sterilization": "소독실" -- 소독실/멸균실
--   },
--   "location_presets": [       -- 자주 쓰는 위치 프리셋
--     { "label": "2F 진료실A",  "floor": "2F", "room": "진료실 A" },
--     { "label": "3F 수술실1",  "floor": "3F", "room": "수술실 1" }
--   ]
-- }
