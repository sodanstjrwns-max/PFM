-- ═══ 환자 만족도 설문 시스템 ═══

-- 설문 템플릿
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '진료 후 만족도 설문',
  description TEXT DEFAULT '',
  
  -- 설문 질문 (JSON 배열)
  -- [{id:"q1", type:"nps"|"rating"|"choice"|"text", label:"...", options:["..."]}]
  questions TEXT NOT NULL DEFAULT '[]',
  
  -- 설정
  is_active INTEGER DEFAULT 1,           -- 활성 여부
  auto_send INTEGER DEFAULT 0,           -- 자동 발송 여부
  send_delay_hours INTEGER DEFAULT 2,    -- 진료 후 N시간 뒤 발송
  expire_days INTEGER DEFAULT 7,         -- 설문 링크 만료일
  
  -- 통계 캐시
  response_count INTEGER DEFAULT 0,
  avg_nps REAL DEFAULT 0,
  
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_surveys_hospital ON surveys(hospital_id);

-- 개별 설문 발송 기록
CREATE TABLE IF NOT EXISTS survey_sends (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  
  -- 환자 정보
  patient_name TEXT DEFAULT '',
  patient_phone TEXT DEFAULT '',
  patient_id TEXT DEFAULT '',            -- patients 테이블 참조 (선택)
  
  -- 진료 정보
  doctor_name TEXT DEFAULT '',
  treatment_type TEXT DEFAULT '',
  visit_date TEXT DEFAULT '',
  
  -- 발송 정보
  token TEXT NOT NULL,                    -- 고유 응답 토큰 (URL에 사용)
  status TEXT DEFAULT 'pending',          -- pending, sent, opened, completed, expired
  sent_at DATETIME,
  opened_at DATETIME,
  completed_at DATETIME,
  expired_at DATETIME,
  
  -- 문자 발송
  sms_result TEXT DEFAULT '',             -- 발송 결과 코드
  sms_message_id TEXT DEFAULT '',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (survey_id) REFERENCES surveys(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_survey_sends_token ON survey_sends(token);
CREATE INDEX IF NOT EXISTS idx_survey_sends_survey ON survey_sends(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_sends_hospital ON survey_sends(hospital_id, status);

-- 설문 응답
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  send_id TEXT NOT NULL,
  survey_id TEXT NOT NULL,
  hospital_id TEXT NOT NULL,
  
  -- 응답 데이터 (JSON)
  -- {q1: 9, q2: 5, q3: "매우 만족", q4: "친절하게 설명해주셔서 좋았습니다"}
  answers TEXT NOT NULL DEFAULT '{}',
  
  -- NPS 점수 (0~10, 별도 저장하여 집계 최적화)
  nps_score INTEGER,
  
  -- 메타
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT DEFAULT '',
  
  FOREIGN KEY (send_id) REFERENCES survey_sends(id),
  FOREIGN KEY (survey_id) REFERENCES surveys(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_hospital ON survey_responses(hospital_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_nps ON survey_responses(hospital_id, nps_score);
