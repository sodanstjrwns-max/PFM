#!/usr/bin/env node
/**
 * 🎬 PFM v5.4.0 전체 기능 데모 시드 생성기
 *  - 새로운 데모 병원 1개 (페이션트 퍼널 데모치과)
 *  - 유저: 원장(admin) + 매니저 + 직원 3명
 *  - 환자: 30명 (등급/유입경로/연령대 다양)
 *  - 콜 인입: 60건 (최근 60일 분산)
 *  - 상담 기록: 50건 (확정/미확정/카테고리 다양 — C-2 AI 분석용)
 *  - 소개: 15건 (팬 등급 자동 분류용)
 *  - 불만 5건
 *
 * 비밀번호: demo1234 (PBKDF2 100k 호환 해시 사전 생성)
 */
const fs = require('fs')
const crypto = require('crypto')

const uuid = () => crypto.randomUUID()
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randF = (min, max) => Math.random() * (max - min) + min
const sqlEsc = (s) => String(s == null ? '' : s).replace(/'/g, "''")
const fmtDate = (d) => d.toISOString().slice(0, 10)
const fmtDT = (d) => d.toISOString().slice(0, 19).replace('T', ' ')

const TODAY = new Date('2026-05-16T00:00:00Z')
const daysAgo = (n) => { const d = new Date(TODAY); d.setUTCDate(d.getUTCDate() - n); return d }

function makeHash(pw) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256')
  return salt.toString('hex') + ':' + hash.toString('hex')
}

const HID = 'demo-pf-v54-' + crypto.randomBytes(8).toString('hex')

const ADMIN_ID = uuid()
const MGR_ID = uuid()
const STAFF1_ID = uuid()
const STAFF2_ID = uuid()
const STAFF3_ID = uuid()

const STAFF = [
  { id: ADMIN_ID,  email: 'admin@demo.pf',   name: '박원장',   role: 'admin',   is_doctor: 1, position: '대표원장', team: '진료팀', phone: '010-1000-0001' },
  { id: MGR_ID,    email: 'manager@demo.pf', name: '김매니저', role: 'manager', is_doctor: 0, position: '실장',     team: '경영팀', phone: '010-1000-0002' },
  { id: STAFF1_ID, email: 'consult@demo.pf', name: '이상담',   role: 'staff',   is_doctor: 0, position: '상담실장', team: '상담팀', phone: '010-1000-0003' },
  { id: STAFF2_ID, email: 'desk@demo.pf',    name: '정데스크', role: 'staff',   is_doctor: 0, position: '데스크',   team: '경영팀', phone: '010-1000-0004' },
  { id: STAFF3_ID, email: 'hygi@demo.pf',    name: '최간호',   role: 'staff',   is_doctor: 0, position: '치과위생사', team: '진료팀', phone: '010-1000-0005' },
]

const COUNSELORS = ['이상담', '김매니저']
const DESKS = ['정데스크', '김매니저']

const CATEGORIES = [
  { key: 'implant',  minP: 1500000, maxP: 4500000 },
  { key: 'ortho',    minP: 3000000, maxP: 6500000 },
  { key: 'esthetic', minP: 800000,  maxP: 3500000 },
  { key: 'perio',    minP: 200000,  maxP: 800000  },
  { key: 'prosth',   minP: 400000,  maxP: 1800000 },
  { key: 'general',  minP: 50000,   maxP: 300000  },
]

const VISIT_SOURCES = ['naver_search','naver_blog','instagram','kakao_ad','google_search','youtube','referral','walk_in','banner','sign']
const SOURCE_WEIGHTS = [25, 12, 15, 8, 10, 5, 18, 4, 2, 1]

const TREATMENT_AREAS = ['implant','ortho','esthetic','perio','prosth','general']

const KOREAN_LAST = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','전','홍','문','양','손','배']
const KOREAN_FIRST = ['민준','서연','지호','하윤','도윤','지민','시우','수아','예준','지우','시현','윤서','선우','채원','지안','서윤','준우','다은','현우','예린','지원','수빈','예원','민서','지훈','하린','시안','은서','윤호','서아']
const SIDOS = ['서울특별시','경기도','인천광역시','부산광역시']
const SIGUNGUS = {
  '서울특별시': ['강남구','서초구','송파구','강동구','마포구','성동구','용산구','종로구','중구'],
  '경기도': ['성남시 분당구','수원시 영통구','용인시 수지구','고양시 일산동구','부천시'],
  '인천광역시': ['연수구','남동구','부평구'],
  '부산광역시': ['해운대구','수영구','부산진구']
}

function weightedPick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i] }
  return items[items.length - 1]
}

const out = []
const push = (s) => out.push(s)

push('-- ═══════════════════════════════════════════════════')
push('-- 🎬 PFM v5.4.0 데모 시드 (페이션트 퍼널 데모치과)')
push('-- Generated: ' + new Date().toISOString())
push('-- Hospital ID: ' + HID)
push('-- 로그인: admin@demo.pf / demo1234')
push('-- ═══════════════════════════════════════════════════')
push('')
push('-- 재실행 가능하도록 기존 데모 데이터 청소 (이메일/hid 기반 모두)')
push(`-- 1) demo.pf 이메일을 가진 기존 유저의 hospital_id로 캐스케이드 삭제`)
push(`DELETE FROM ai_insights_cache WHERE hospital_id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM ai_usage_log WHERE hospital_id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM consult_records WHERE hospital_id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM call_records WHERE hospital_id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM complaints WHERE hospital_id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM patients WHERE hospital_id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM hospitals WHERE id IN (SELECT hospital_id FROM users WHERE email LIKE '%@demo.pf');`)
push(`DELETE FROM users WHERE email LIKE '%@demo.pf';`)
push('')

// 1) Hospital
push('-- 1) 데모 병원')
push(`INSERT INTO hospitals (id, name, phone, address, business_number, onboarding_completed, onboarding_step, settings)
VALUES ('${HID}', '페이션트 퍼널 데모치과', '02-1234-5678', '서울특별시 강남구 테헤란로 123', '123-45-67890', 1, 5, '{"theme":"light"}');`)
push('')

// 2) Users
push('-- 2) 유저 5명 — 비밀번호 모두 demo1234')
for (const u of STAFF) {
  const pwHash = makeHash('demo1234')
  push(`INSERT INTO users (id, hospital_id, email, password_hash, name, role, is_doctor, is_active, position, team, phone, hire_date, work_status)
VALUES ('${u.id}','${HID}','${u.email}','${pwHash}','${u.name}','${u.role}',${u.is_doctor},1,'${u.position}','${u.team}','${u.phone}','2024-01-01','active');`)
}
push('')

// 3) Patients (30명)
push('-- 3) 환자 30명')
const patients = []
for (let i = 0; i < 30; i++) {
  const name = pick(KOREAN_LAST) + pick(KOREAN_FIRST)
  const chart = 'C' + String(20240000 + i + 1).padStart(8, '0')
  const phone = '010-' + String(rand(2000, 9999)).padStart(4, '0') + '-' + String(rand(1000, 9999)).padStart(4, '0')
  const birthYear = rand(1955, 2010)
  const birth = `${birthYear}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`
  const gender = Math.random() < 0.55 ? 'female' : 'male'
  const source = weightedPick(VISIT_SOURCES, SOURCE_WEIGHTS)
  const monthsAgo = i < 5 ? rand(8, 18) : i < 15 ? rand(2, 8) : rand(0, 2)
  const firstVisit = daysAgo(monthsAgo * 30 + rand(0, 15))
  const visitCount = i < 5 ? rand(8, 20) : i < 12 ? rand(3, 7) : rand(1, 3)
  const lastVisit = visitCount > 1 ? daysAgo(rand(2, 60)) : firstVisit
  const sido = pick(SIDOS)
  const sigungu = pick(SIGUNGUS[sido])

  const isReferred = source === 'referral' && patients.length > 0
  const referrer = isReferred ? pick(patients.slice(0, Math.min(5, patients.length))).patient_name : ''

  const p = {
    id: uuid(),
    chart_number: chart,
    patient_name: name,
    phone,
    visit_source: source,
    referrer_name: referrer,
    first_visit_date: fmtDate(firstVisit),
    last_visit_date: fmtDate(lastVisit),
    visit_count: visitCount,
    treatment_area: pick(TREATMENT_AREAS),
    primary_doctor: '박원장',
    assigned_counselor: pick(COUNSELORS),
    desk_staff: pick(DESKS),
    patient_type: visitCount > 1 ? 'existing' : 'new',
    kakao_registered: Math.random() < 0.7 ? 'O' : '',
  }
  patients.push(p)

  push(`INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, referrer_name, first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, desk_staff, addr_sido, addr_sigungu, addr_detail, visit_reason, memo, status, kakao_registered, created_by, created_at)
VALUES ('${p.id}','${HID}','${chart}','${sqlEsc(name)}','${phone}','${birth}','${gender}','${p.patient_type}','${source}','${sqlEsc(referrer)}','${p.first_visit_date}','${p.last_visit_date}',${visitCount},'${p.treatment_area}','박원장','${p.assigned_counselor}','${p.desk_staff}','${sqlEsc(sido)}','${sqlEsc(sigungu)}','${rand(1,999)}동 ${rand(1,50)}호','${sqlEsc(pick(['치아 시린 증상','잇몸 부음','교정 상담','임플란트 상담','치아미백','정기검진','신경치료','발치 상담']))}','${sqlEsc(Math.random() < 0.3 ? pick(['VIP 응대 필수','연락 시 오후 선호','진료 시 긴장 많음','소개 활발']) : '')}','active','${p.kakao_registered}','${pick([STAFF2_ID, MGR_ID])}','${fmtDT(firstVisit)}');`)
}
push('')

// 4) Calls (60건)
push('-- 4) 콜 인입 60건')
const callPurposes = ['진료문의','예약문의','비용문의','교정상담','임플란트상담']
const rStatuses = ['예약완료','예약완료','예약완료','추후연락','추후연락','검토중']
for (let i = 0; i < 60; i++) {
  const daysBack = rand(0, 60)
  const callDate = daysAgo(daysBack)
  const isExisting = Math.random() < 0.4
  const p = isExisting ? pick(patients) : null
  const name = p ? p.patient_name : pick(KOREAN_LAST) + pick(KOREAN_FIRST)
  const phone = p ? p.phone : '010-' + String(rand(2000, 9999)).padStart(4, '0') + '-' + String(rand(1000, 9999)).padStart(4, '0')
  const source = p ? p.visit_source : weightedPick(VISIT_SOURCES, SOURCE_WEIGHTS)
  const rs = pick(rStatuses)
  const rDate = rs === '예약완료' ? fmtDate(daysAgo(Math.max(0, daysBack - rand(1, 14)))) : ''
  const fulfilled = rs === '예약완료' && daysBack > 14 ? (Math.random() < 0.75 ? 'O' : 'X') : ''

  push(`INSERT INTO call_records (id, hospital_id, call_type, call_date, patient_name, phone, patient_type, staff_name, treatment_interest, recognition_path, call_purpose, reservation_status, reservation_date, reservation_fulfilled, follow_up, comment, created_by, created_at)
VALUES ('${uuid()}','${HID}','inbound','${fmtDate(callDate)}','${sqlEsc(name)}','${phone}','${isExisting ? 'existing' : 'new'}','${pick(DESKS)}','${pick(['implant','ortho','esthetic','general'])}','${source}','${pick(callPurposes)}','${rs}','${rDate}','${fulfilled}','${Math.random() < 0.2 ? '재통화 필요' : ''}','${sqlEsc(Math.random() < 0.3 ? '친절하게 응대함' : '')}','${pick([STAFF2_ID, MGR_ID])}','${fmtDT(callDate)}');`)
}
push('')

// 5) Consult Records (50건) — C-2 AI 분석 핵심 데이터
push('-- 5) 상담 기록 50건 (C-2 AI 분석용 - 카테고리/확정율 다양)')
const consultMonths = [0,0,0,0,0,0,1,1,1,2]
for (let i = 0; i < 50; i++) {
  const patient = pick(patients)
  const monthsBack = pick(consultMonths)
  const baseDate = new Date(TODAY)
  baseDate.setUTCMonth(baseDate.getUTCMonth() - monthsBack)
  baseDate.setUTCDate(rand(1, 28))
  const recordDate = fmtDate(baseDate)

  const cat = pick(CATEGORIES)
  const planned = rand(cat.minP, cat.maxP)
  let confirmProb = 0.65
  if (cat.key === 'implant') confirmProb = 0.55
  else if (cat.key === 'ortho') confirmProb = 0.45
  else if (cat.key === 'esthetic') confirmProb = 0.50
  else if (cat.key === 'general') confirmProb = 0.80
  else if (cat.key === 'perio') confirmProb = 0.75

  const confirmed = Math.random() < confirmProb
  const agreed = confirmed ? Math.round(planned * randF(0.8, 1.0) / 10000) * 10000 : 0
  const appointed = confirmed ? 'O' : (Math.random() < 0.3 ? 'O' : '')
  const counselor = patient.assigned_counselor
  const discount = agreed > 0 && agreed < planned * 0.95 ? pick(['가족할인','이벤트','지인소개','분할납부']) : ''

  push(`INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, planned_amount, agreed_amount, discount_note, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done, kakao_registered, pdf_provided, notes, visit_source, desk_name, created_by, created_at)
VALUES ('${uuid()}','${HID}','${recordDate}','${patient.chart_number}','${sqlEsc(patient.patient_name)}','박원장','${counselor}',${planned},${agreed},'${sqlEsc(discount)}','${patient.patient_type}','${cat.key}','${confirmed ? 'O' : 'X'}','${appointed}','${Math.random() < 0.5 ? 'O' : ''}','${patient.kakao_registered}','${Math.random() < 0.6 ? 'O' : ''}','${sqlEsc(pick(['치아 상태 양호','추가 검진 필요','보험 적용 안내','분할납부 안내','다음 예약 잡음','신뢰관계 형성 잘 됨','재방문 의지 확인']))}','${patient.visit_source}','${patient.desk_staff}','${counselor === '이상담' ? STAFF1_ID : MGR_ID}','${fmtDT(baseDate)}');`)
}
push('')

// 6) 소개 관계는 patients.referrer_name으로 이미 시드됨 (별도 referrals 테이블 없음)
//    LTV 랭킹과 팬 등급은 patients.referrer_name 컬럼 기반으로 자동 집계됨
push('-- 6) 소개 관계: patients.referrer_name 컬럼으로 이미 시드 (별도 테이블 없음)')
// 추가로 referrer 환자 몇 명에게 더 referee를 만들어서 VIP/팬 등급 만들기 (UPDATE)
const topReferrers = patients.slice(0, 5).map(p => p.patient_name)
let extraRefs = 0
for (const p of patients.slice(15)) {
  // 30% 확률로 referrer 강제 설정 (VIP 활동성 강조)
  if (Math.random() < 0.3 && p.visit_source !== 'referral') {
    const ref = pick(topReferrers)
    push(`UPDATE patients SET visit_source='referral', referrer_name='${sqlEsc(ref)}' WHERE id='${p.id}';`)
    extraRefs++
  }
}
push(`-- ${extraRefs}건의 추가 referral 관계 생성됨`)
push('')

// 7) Complaints (5건) — 실제 스키마: part, responder, resolver, resolution
push('-- 7) 불만 5건')
for (let i = 0; i < 5; i++) {
  const p = pick(patients)
  const date = fmtDate(daysAgo(rand(5, 90)))
  push(`INSERT INTO complaints (id, hospital_id, complaint_date, patient_name, part, category, description, responder, resolver, resolution, status, severity, created_by, created_at)
VALUES ('${uuid()}','${HID}','${date}','${sqlEsc(p.patient_name)}','${pick(['데스크','상담','진료','대기실'])}','${pick(['대기시간','응대불만','비용불만','치료품질','시설'])}','${sqlEsc(pick(['대기시간이 너무 길었음','직원 응대가 차가웠음','비용이 예상보다 비쌌음','진료 후 통증 지속','대기실이 협소함']))}','김매니저','박원장','${sqlEsc(pick(['사과 전화 후 다음 진료 시 우선 안내','담당자 교육 진행','상담 추가 진행 분할납부 안내','재내원하여 추가 처치','대기실 좌석 보강']))}','${pick(['resolved','in_progress','resolved'])}','${pick(['low','normal','high'])}','${pick([MGR_ID, ADMIN_ID])}','${date} 14:30:00');`)
}
push('')

push('-- ═══════════════════════════════════════════════════')
push('-- 시드 완료. 로그인:')
push('--   원장:   admin@demo.pf   / demo1234')
push('--   매니저: manager@demo.pf / demo1234')
push('--   상담사: consult@demo.pf / demo1234')
push('-- ═══════════════════════════════════════════════════')

fs.writeFileSync('scripts/demo_v54_seed.sql', out.join('\n'))
fs.writeFileSync('scripts/demo_v54_hid.txt', HID)
console.log(`✅ scripts/demo_v54_seed.sql 생성 (${out.length} lines)`)
console.log(`📍 Hospital ID: ${HID}`)
console.log(`🔑 로그인: admin@demo.pf / demo1234`)
