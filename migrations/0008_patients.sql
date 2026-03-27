-- ═══ 환자 데이터베이스 (Patient Registry) ═══
-- CRM 엑셀의 신환 내원 경로 개별 시트 기반 설계

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  
  -- 기본 정보
  chart_number TEXT DEFAULT '',           -- 차트번호
  patient_name TEXT NOT NULL,             -- 환자 성함
  phone TEXT DEFAULT '',                  -- 연락처
  birth_date TEXT DEFAULT '',             -- 생년월일
  gender TEXT DEFAULT '',                 -- 성별: male/female
  
  -- 환자 분류
  patient_type TEXT DEFAULT 'new',        -- new(신환) / existing(구환)
  
  -- 내원 경로 (CRM 14가지 분류)
  visit_source TEXT DEFAULT '',           -- 내원경로 코드
  visit_source_detail TEXT DEFAULT '',    -- 경로 상세 (예: 소개자명)
  referrer_name TEXT DEFAULT '',          -- 소개자 성함
  
  -- 방문 정보
  first_visit_date TEXT DEFAULT '',       -- 최초 내원일
  last_visit_date TEXT DEFAULT '',        -- 최근 내원일
  visit_count INTEGER DEFAULT 1,          -- 내원 횟수
  
  -- 진료 관련
  treatment_area TEXT DEFAULT '',         -- 관심진료/진료영역
  primary_doctor TEXT DEFAULT '',         -- 담당 원장(상담의)
  assigned_counselor TEXT DEFAULT '',     -- 담당 상담사(접수자)
  
  -- 방문 이유
  visit_reason TEXT DEFAULT '',           -- 방문 이유/주소(chief complaint)
  
  -- 추가 정보
  address TEXT DEFAULT '',                -- 주소/지역
  memo TEXT DEFAULT '',                   -- 메모
  
  -- 관리 상태
  status TEXT DEFAULT 'active',           -- active / inactive / lost
  kakao_registered TEXT DEFAULT '',       -- 카카오 등록여부 O/X
  
  -- 메타
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_patients_hospital ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(patient_name);
CREATE INDEX IF NOT EXISTS idx_patients_chart ON patients(hospital_id, chart_number);
CREATE INDEX IF NOT EXISTS idx_patients_type ON patients(hospital_id, patient_type);
CREATE INDEX IF NOT EXISTS idx_patients_source ON patients(hospital_id, visit_source);
CREATE INDEX IF NOT EXISTS idx_patients_first_visit ON patients(hospital_id, first_visit_date);
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(hospital_id, primary_doctor);
CREATE INDEX IF NOT EXISTS idx_patients_counselor ON patients(hospital_id, assigned_counselor);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(hospital_id, status);

-- 상담사/상담의 프리셋 테이블 (병원별 설정)
CREATE TABLE IF NOT EXISTS staff_presets (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  preset_type TEXT NOT NULL,   -- 'doctor' / 'counselor'
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_staff_presets ON staff_presets(hospital_id, preset_type, is_active);
