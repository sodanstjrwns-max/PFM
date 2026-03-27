-- ═══ 상담 기록 테이블 (실장노트 시트 구조 기반) ═══
-- 실장님들이 매일 상담 후 기록하는 테이블
-- 컬럼: 날짜, 챠트번호, 성함, 상담의, 상담사, 비용계획, 동의금액, 할인내역, 구신환, 진료카테고리, 치료확정, 예약, 리콜, 카카오, PDF제공

CREATE TABLE IF NOT EXISTS consult_records (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  
  -- 기본 정보
  record_date TEXT NOT NULL,             -- 상담 날짜 (YYYY-MM-DD)
  chart_number TEXT,                      -- 챠트번호
  patient_name TEXT NOT NULL,             -- 환자 성함
  
  -- 상담 담당
  doctor_name TEXT,                       -- 상담의 (진료 의사)
  counselor_name TEXT,                    -- 상담사 (실장/코디)
  
  -- 금액
  planned_amount INTEGER DEFAULT 0,       -- 비용계획 (원 단위)
  agreed_amount INTEGER DEFAULT 0,        -- 동의금액 (원 단위)
  discount_note TEXT,                     -- 할인 내역 (예: "소개10%+당일완납5%")
  
  -- 환자 구분
  patient_type TEXT DEFAULT 'new',        -- 'new'=신환, 'existing'=구환
  
  -- 진료 정보
  treatment_category TEXT DEFAULT 'general',  -- 진료 카테고리: implant, orthodontics, complex, general
  treatment_confirmed TEXT DEFAULT '',     -- 치료확정: 'O', 'X', '' (빈값=미정/결과상담대기)
  appointment_made TEXT DEFAULT '',        -- 예약: 'O', 'X', ''
  
  -- 후속 관리
  recall_done TEXT DEFAULT '',             -- 리콜진행여부: 'O', 'X', ''
  kakao_registered TEXT DEFAULT '',        -- 카카오 플러스친구 등록: 'O', 'X', ''
  pdf_provided TEXT DEFAULT '',            -- 구강건강관리 PDF 제공: 'O', 'X', ''
  
  -- 메모
  notes TEXT,                              -- 비고/메모
  
  -- 메타
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cr_hospital_date ON consult_records(hospital_id, record_date);
CREATE INDEX IF NOT EXISTS idx_cr_counselor ON consult_records(hospital_id, counselor_name);
CREATE INDEX IF NOT EXISTS idx_cr_doctor ON consult_records(hospital_id, doctor_name);
CREATE INDEX IF NOT EXISTS idx_cr_category ON consult_records(hospital_id, treatment_category);
CREATE INDEX IF NOT EXISTS idx_cr_month ON consult_records(hospital_id, record_date);
CREATE INDEX IF NOT EXISTS idx_cr_patient_type ON consult_records(hospital_id, patient_type);
CREATE INDEX IF NOT EXISTS idx_cr_confirmed ON consult_records(hospital_id, treatment_confirmed);
