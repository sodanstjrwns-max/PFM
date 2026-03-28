-- ═══ 컴플레인 기록 (Complaint Records) ═══
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  hospital_id TEXT NOT NULL,
  
  -- 발생 정보
  complaint_date TEXT NOT NULL,         -- 발생일 (YYYY-MM-DD)
  patient_name TEXT DEFAULT '',         -- 환자 성함
  
  -- 분류
  part TEXT NOT NULL DEFAULT '',        -- 파트/장소: desk(데스크), clinic(진료실), consult(상담실), phone(전화), etc(기타)
  category TEXT NOT NULL DEFAULT '',    -- 세부분류
  
  -- 상세 내용
  description TEXT DEFAULT '',          -- 내용 정리
  
  -- 응대/해결
  responder TEXT DEFAULT '',            -- 응대자 (최초 접수한 직원)
  resolver TEXT DEFAULT '',             -- 해결자
  resolution TEXT DEFAULT '',           -- 해결 내용
  
  -- 상태
  status TEXT DEFAULT 'resolved',       -- open(미해결), resolved(해결), escalated(에스컬레이션)
  severity TEXT DEFAULT 'normal',       -- low(경미), normal(보통), high(심각), critical(매우심각)
  
  -- 메타
  created_by TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX IF NOT EXISTS idx_complaints_hospital ON complaints(hospital_id);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints(hospital_id, complaint_date);
CREATE INDEX IF NOT EXISTS idx_complaints_part ON complaints(hospital_id, part);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(hospital_id, status);
