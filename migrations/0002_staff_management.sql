-- ════════════════════════════════════════════════════════════════
-- v2.1 직원관리 확장: 직급, 팀, 근무조건, 직원 초대
-- ════════════════════════════════════════════════════════════════

-- users 테이블 확장
ALTER TABLE users ADD COLUMN position TEXT DEFAULT '' ;
-- position: hygienist(치과위생사), desk(데스크), sterilization(소독팀), management(경영지원실), director(실장단), doctor(원장/의사)

ALTER TABLE users ADD COLUMN team TEXT DEFAULT '' ;
-- team: clinical(진료팀), front(프론트), support(지원팀), management(경영지원)

ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '' ;
ALTER TABLE users ADD COLUMN profile_image TEXT DEFAULT '' ;
ALTER TABLE users ADD COLUMN hire_date TEXT DEFAULT '' ;
ALTER TABLE users ADD COLUMN work_schedule TEXT DEFAULT '{}' ;
-- work_schedule JSON: {"mon":{"start":"09:00","end":"18:00"},"tue":{...},...,"sat":null,"sun":null}
-- null = 휴무, 빈 객체 = 근무 안함

ALTER TABLE users ADD COLUMN work_status TEXT DEFAULT 'active' CHECK(work_status IN ('active','on_leave','resigned')) ;
-- active: 재직, on_leave: 휴직, resigned: 퇴사

-- 출퇴근 기록 테이블
CREATE TABLE IF NOT EXISTS attendance (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  date          TEXT NOT NULL,
  check_in      TEXT,
  check_out     TEXT,
  status        TEXT DEFAULT 'present' CHECK(status IN ('present','late','half_day','absent','holiday','vacation')),
  note          TEXT DEFAULT '',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(hospital_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id, date);

-- 직원 초대 코드 (관리자가 직원 초대 시 사용)
CREATE TABLE IF NOT EXISTS staff_invites (
  id            TEXT PRIMARY KEY,
  hospital_id   TEXT NOT NULL REFERENCES hospitals(id),
  invite_code   TEXT NOT NULL UNIQUE,
  role          TEXT DEFAULT 'staff',
  position      TEXT DEFAULT '',
  team          TEXT DEFAULT '',
  created_by    TEXT NOT NULL REFERENCES users(id),
  used_by       TEXT REFERENCES users(id),
  expires_at    DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invites_code ON staff_invites(invite_code);
