-- ═══ 설문 발송 스케줄 시스템 ═══

-- 1. 설문 발송 스케줄 테이블
CREATE TABLE IF NOT EXISTS survey_schedules (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  survey_id TEXT NOT NULL,
  -- 스케줄 설정: week_of_month (1-4), day_of_week (0=일~6=토)
  week_of_month INTEGER NOT NULL DEFAULT 1 CHECK(week_of_month >= 1 AND week_of_month <= 4),
  day_of_week INTEGER NOT NULL DEFAULT 1 CHECK(day_of_week >= 0 AND day_of_week <= 6),
  send_time TEXT NOT NULL DEFAULT '10:00',  -- HH:MM 형식
  is_active INTEGER NOT NULL DEFAULT 1,
  -- 메시지 템플릿
  sms_template TEXT DEFAULT '',
  -- 통계
  last_sent_at DATETIME,
  total_sent INTEGER DEFAULT 0,
  -- 메타
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
);

CREATE INDEX IF NOT EXISTS idx_survey_schedules_hospital ON survey_schedules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_active ON survey_schedules(is_active, day_of_week);

-- 2. 설문 발송 배치 (한 번의 발송 작업 단위)
CREATE TABLE IF NOT EXISTS survey_batches (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  survey_id TEXT NOT NULL,
  schedule_id TEXT,
  -- 배치 정보
  batch_date TEXT NOT NULL,  -- YYYY-MM-DD
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  -- 상태: draft(명단 업로드됨), confirmed(확인완료), sending(발송중), completed(완료)
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','sending','completed','cancelled')),
  -- 메타
  created_by TEXT DEFAULT '',
  sent_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
);

CREATE INDEX IF NOT EXISTS idx_survey_batches_hospital ON survey_batches(hospital_id);
CREATE INDEX IF NOT EXISTS idx_survey_batches_date ON survey_batches(batch_date);
CREATE INDEX IF NOT EXISTS idx_survey_batches_status ON survey_batches(status);

-- 3. survey_sends에 batch_id 컬럼 추가
ALTER TABLE survey_sends ADD COLUMN batch_id TEXT DEFAULT '';

-- 4. 설문 템플릿(기본 제공 + 병원 커스텀)
CREATE TABLE IF NOT EXISTS survey_templates (
  id TEXT PRIMARY KEY,
  hospital_id TEXT,  -- NULL이면 시스템 기본 템플릿
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',  -- general, nps, treatment, service
  questions TEXT NOT NULL DEFAULT '[]',  -- JSON array
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_survey_templates_hospital ON survey_templates(hospital_id);

-- 5. 시스템 기본 템플릿 삽입
INSERT OR IGNORE INTO survey_templates (id, hospital_id, name, description, category, questions, is_default, sort_order) VALUES
(
  'tpl-nps-standard',
  NULL,
  '표준 NPS 설문',
  '환자 만족도를 측정하는 표준 NPS 설문입니다. 추천 의향, 만족도, 개선점을 묻습니다.',
  'nps',
  '[
    {"id":"q_nps","type":"nps","label":"주변 지인에게 저희 병원을 추천할 의향이 얼마나 되시나요?","description":"0점(전혀 아니다) ~ 10점(매우 그렇다)","required":true},
    {"id":"q_overall","type":"rating","label":"전반적인 진료 만족도는 어떠셨나요?","description":"1~5점으로 평가해주세요","required":true,"max":5},
    {"id":"q_kindness","type":"rating","label":"직원들의 친절도는 어떠셨나요?","max":5,"required":true},
    {"id":"q_waiting","type":"rating","label":"대기 시간은 적절했나요?","max":5,"required":true},
    {"id":"q_explain","type":"rating","label":"진료 설명은 충분했나요?","max":5,"required":true},
    {"id":"q_best","type":"choice","label":"가장 만족스러웠던 부분은?","options":["의료진 실력","친절한 응대","깨끗한 시설","합리적 비용","짧은 대기","자세한 설명"],"multiple":true},
    {"id":"q_improve","type":"choice","label":"개선이 필요한 부분이 있다면?","options":["대기 시간","주차","진료 설명","비용 안내","예약 시스템","시설/환경","없음"],"multiple":true},
    {"id":"q_comment","type":"text","label":"추가로 전하고 싶은 말씀이 있으시면 자유롭게 적어주세요","required":false,"placeholder":"소중한 의견 감사합니다"}
  ]',
  1, 1
),
(
  'tpl-quick-3q',
  NULL,
  '간편 3문항 설문',
  '바쁜 환자를 위한 핵심 3문항 설문. 응답률이 높습니다.',
  'nps',
  '[
    {"id":"q_nps","type":"nps","label":"저희 병원을 지인에게 추천하실 의향이 있으신가요?","description":"0점(전혀 아니다) ~ 10점(매우 그렇다)","required":true},
    {"id":"q_satisfaction","type":"rating","label":"오늘 진료에 만족하셨나요?","max":5,"required":true},
    {"id":"q_comment","type":"text","label":"한 줄 후기를 남겨주세요","required":false,"placeholder":"예: 선생님이 친절하게 설명해주셔서 좋았어요"}
  ]',
  1, 2
),
(
  'tpl-treatment-detail',
  NULL,
  '진료별 상세 설문',
  '치료 종류별로 세분화된 만족도를 측정합니다.',
  'treatment',
  '[
    {"id":"q_nps","type":"nps","label":"저희 병원을 주변에 추천할 의향이 얼마나 되시나요?","required":true},
    {"id":"q_treatment","type":"rating","label":"진료 결과에 만족하시나요?","max":5,"required":true},
    {"id":"q_pain","type":"rating","label":"진료 중 통증 관리는 적절했나요?","max":5,"required":true},
    {"id":"q_cost","type":"rating","label":"비용 대비 만족도는 어떠신가요?","max":5,"required":true},
    {"id":"q_aftercare","type":"rating","label":"치료 후 관리 안내는 충분했나요?","max":5,"required":true},
    {"id":"q_revisit","type":"choice","label":"재방문 의향이 있으신가요?","options":["반드시 재방문","아마도 재방문","모르겠음","재방문 안 할 것 같음"]},
    {"id":"q_source","type":"choice","label":"저희 병원을 어떻게 알게 되셨나요?","options":["지인 소개","인터넷 검색","SNS/블로그","간판/현수막","기존 환자"]},
    {"id":"q_comment","type":"text","label":"더 나은 진료를 위해 의견을 들려주세요","required":false}
  ]',
  1, 3
),
(
  'tpl-service-focus',
  NULL,
  '서비스 품질 설문',
  '접수부터 수납까지 서비스 경험 전반을 평가합니다.',
  'service',
  '[
    {"id":"q_nps","type":"nps","label":"저희 병원 서비스를 지인에게 추천하실 의향은?","required":true},
    {"id":"q_reception","type":"rating","label":"접수 과정은 편리했나요?","max":5,"required":true},
    {"id":"q_waiting_env","type":"rating","label":"대기 공간은 쾌적했나요?","max":5,"required":true},
    {"id":"q_staff","type":"rating","label":"직원들의 응대는 어떠셨나요?","max":5,"required":true},
    {"id":"q_doctor","type":"rating","label":"담당 의사의 진료는 만족스러웠나요?","max":5,"required":true},
    {"id":"q_payment","type":"rating","label":"수납 과정은 원활했나요?","max":5,"required":true},
    {"id":"q_facility","type":"choice","label":"시설 중 인상 깊었던 곳은?","options":["접수/대기실","진료실","수술실","상담실","화장실","주차장"],"multiple":true},
    {"id":"q_comment","type":"text","label":"서비스 개선을 위한 제안이 있으시면 알려주세요","required":false}
  ]',
  1, 4
);
