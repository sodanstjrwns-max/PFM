#!/usr/bin/env node
/**
 * 서울비디치과 데모 계정 전체 메뉴용 통합 시드 생성기
 * - 결손 18개 테이블 채우기
 * - hospital_id: 945aa2fc-a88c-4522-8baa-d1daeefa09ab
 */
const fs = require('fs')
const crypto = require('crypto')

const HID = '945aa2fc-a88c-4522-8baa-d1daeefa09ab'
const STAFF = [
  { id: 'df57fa88-e471-4906-8b50-0fc2830ea3ba', name: '강지은' },
  { id: '99cf573d-e1e2-4643-ae90-5273463c41cd', name: '김혜진' },
  { id: '4e3d22c6-01a5-4395-9a9f-9cc324f86045', name: '문석준' },
  { id: 'f1777cc6-95e6-4e53-b889-a5c4b67e1a1b', name: '박나영' },
  { id: '0293794a-9e8e-4170-bad7-329b57f52be6', name: '윤서영' },
  { id: '67f8f588-2824-4e18-a365-48ec8add5718', name: '이수정' },
  { id: '9fa9aaf6-4173-47ae-96ef-b146ea962f83', name: '정하늘' },
]
const ADMIN = STAFF[2].id

const uuid = () => crypto.randomUUID()
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const fmtDate = (d) => d.toISOString().slice(0, 10)
const today = new Date('2026-04-30T00:00:00Z')
const dayN = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d }
const sqlEsc = (s) => String(s).replace(/'/g, "''")
const dayName = ['일', '월', '화', '수', '목', '금', '토']

const out = []
out.push('-- 서울비디치과 데모 통합 시드 (전체 메뉴)\n')
out.push('-- Generated: ' + new Date().toISOString() + '\n\n')

/* ─────── 1) categories (다른 시드의 FK 의존) ─────── */
const CAT = {
  materials: { implant: uuid(), ortho: uuid(), esthetic: uuid(), perio: uuid(), prosth: uuid() },
  pricing:   { implant: uuid(), ortho: uuid(), esthetic: uuid(), perio: uuid(), general: uuid() },
  cases:     { implant: uuid(), ortho: uuid(), esthetic: uuid() },
  scripts:   { reception: uuid(), consult: uuid(), recall: uuid() },
  hire:      { dentist: uuid(), hygienist: uuid(), assistant: uuid() },
}
out.push("-- categories\n")
const catRows = [
  ['materials', 'implant',   '🦷 임플란트',     1],
  ['materials', 'ortho',     '😬 인비절라인',   2],
  ['materials', 'esthetic',  '✨ 라미네이트',   3],
  ['materials', 'perio',     '🪥 잇몸치료',     4],
  ['materials', 'prosth',    '🔧 보철',         5],
  ['pricing',   'implant',   '🦷 임플란트',     1],
  ['pricing',   'ortho',     '😬 치아교정',     2],
  ['pricing',   'esthetic',  '✨ 심미치료',     3],
  ['pricing',   'perio',     '🪥 잇몸치료',     4],
  ['pricing',   'general',   '🏥 일반진료',     5],
  ['cases',     'implant',   '🦷 임플란트',     1],
  ['cases',     'ortho',     '😬 인비절라인',   2],
  ['cases',     'esthetic',  '✨ 라미네이트',   3],
  ['scripts',   'reception', '📞 접수/예약',    1],
  ['scripts',   'consult',   '💬 상담',         2],
  ['scripts',   'recall',    '🔁 리콜',         3],
  ['hire',      'dentist',   '👨‍⚕️ 치과의사',   1],
  ['hire',      'hygienist', '🦷 치과위생사',   2],
  ['hire',      'assistant', '👥 진료보조',     3],
]
for (const [mod, key, name, sort] of catRows) {
  const id = CAT[mod][key]
  const icon = name.split(' ')[0]
  out.push(`INSERT OR IGNORE INTO categories (id, hospital_id, module, name, icon, sort_order) VALUES ('${id}', '${HID}', '${mod}', '${sqlEsc(name)}', '${icon}', ${sort});\n`)
}

/* ─────── 2) pricing (수가표) ─────── */
out.push("\n-- pricing\n")
const pricings = [
  ['implant', '임플란트 (단일)', 80, 150, '본당 식립부터 보철까지 전체 비용. 본원 SLA 표면 처리.'],
  ['implant', '임플란트 (전악)', 1200, 2000, '풀마우스 임플란트, All-on-4/6 옵션 포함'],
  ['implant', '뼈이식 (Bone Graft)', 30, 80, '소량/대량/상악동 거상술'],
  ['ortho',   '인비절라인 라이트', 350, 450, '14단계 이내 경증 케이스'],
  ['ortho',   '인비절라인 풀',   600, 850, '풀스텝 무제한, 리파인먼트 포함'],
  ['ortho',   '메탈 브라켓',     250, 400, '24개월 표준 케이스'],
  ['esthetic','라미네이트 (1개)', 70, 100, '글로우네이트 자체 제작'],
  ['esthetic','글로우네이트 (1개)', 90, 130, '본원 시그니처 라미네이트'],
  ['esthetic','지르코니아 크라운', 50, 70, '심미 전치부'],
  ['perio',   '치주 스케일링',     5,  8, '전악, 60분 소요'],
  ['perio',   '잇몸 수술',        30, 60, '플랩수술 + 골이식'],
  ['general', '신경치료',         15, 25, '근관치료 (전치/구치)'],
  ['general', '레진 충전',         8, 15, '광중합 레진'],
  ['general', '발치',              5, 30, '단순/매복/사랑니'],
]
for (const [catKey, name, pmin, pmax, desc] of pricings) {
  out.push(`INSERT OR IGNORE INTO pricing (id, hospital_id, category_id, procedure_name, price_min, price_max, price_unit, description, sort_order, is_active) VALUES ('${uuid()}', '${HID}', '${CAT.pricing[catKey]}', '${sqlEsc(name)}', ${pmin}, ${pmax}, '만원', '${sqlEsc(desc)}', 0, 1);\n`)
}

/* ─────── 3) scripts (상담 스크립트) ─────── */
out.push("\n-- scripts\n")
const scripts = [
  ['reception', '신환 첫 통화 응대', '신환 인바운드 콜', '안녕하세요, 서울비디치과입니다. 어떤 진료를 원하시는지 편하게 말씀해 주세요.', '비용이 너무 비싸요', '비용보다 결과의 지속성을 보시면 본원 임플란트는 10년 누적 생존율 98%입니다. 분할납부도 안내드릴 수 있어요.'],
  ['reception', '예약 확정 멘트', '예약 시간 확정 시', '○월 ○일 ○요일 ○시로 예약 도와드렸습니다. 진료 30분 전 도착 부탁드릴게요.', '꼭 그 시간만 가능한가요?', '원하시는 시간대가 있으시면 대기 명단에 등록해드리고 자리 나오는 대로 즉시 안내드릴게요.'],
  ['consult',   '임플란트 상담 오프닝', '임플란트 상담 시작', 'X-ray 보시면 여기 잇몸뼈 상태가 좋아서 즉시 식립 가능하세요. 본원은 SLA 표면처리 임플란트만 사용합니다.', '병원마다 가격이 너무 달라요', '재료/수술방식/사후관리에 따라 차이가 큽니다. 본원은 6개 수술실, 에어샤워, 평생 무료 점검 시스템을 갖췄습니다.'],
  ['consult',   '인비절라인 상담', '교정 상담', '인비절라인은 투명하고 탈착 가능해서 직장인분들이 가장 선호하세요. 시뮬레이션부터 보여드릴게요.', '교정기간이 너무 길어요', '평균 14~18개월입니다. 첫 6개월에 가시적 변화가 가장 크고, 본원은 4주 단위 모니터링으로 단축 케이스가 많습니다.'],
  ['consult',   '라미네이트 상담', '심미 상담', '글로우네이트는 본원 시그니처 라미네이트로 0.3mm 초박형, 자연치 거의 안 깎습니다.', '치아 손상이 걱정돼요', '미니멀 프렙 방식으로 자연치 보존율 90% 이상입니다. 시뮬레이션 후 결정하셔도 됩니다.'],
  ['recall',    '6개월 정기검진 리콜', '마지막 내원 6개월 경과', '○○님, 안녕하세요. 서울비디치과입니다. 지난 진료 후 6개월이 되어 정기검진 안내드려요.', '바빠서 시간이 없어요', '20분이면 끝나는 간단한 검진입니다. 미리 예약하시면 대기 없이 바로 진료받으실 수 있어요.'],
  ['recall',    '교정 후 리테이너 점검', '교정 완료 환자', '교정 마치신 지 6개월 되셨네요. 리테이너 마모 상태 확인 한번 받으시면 좋아요.', '괜찮은 것 같아요', '잘 보이지 않는 미세한 변화가 큰 후퇴로 이어질 수 있어요. 5분 점검입니다.'],
]
let sortS = 0
for (const [catKey, title, situation, txt, obj, resp] of scripts) {
  out.push(`INSERT OR IGNORE INTO scripts (id, hospital_id, category_id, title, situation, script_text, objection, response, sort_order) VALUES ('${uuid()}', '${HID}', '${CAT.scripts[catKey]}', '${sqlEsc(title)}', '${sqlEsc(situation)}', '${sqlEsc(txt)}', '${sqlEsc(obj)}', '${sqlEsc(resp)}', ${sortS++});\n`)
}

/* ─────── 4) materials (설명자료) ─────── */
out.push("\n-- materials\n")
const materials = [
  ['implant',  '임플란트 수술 과정 안내', '식립~보철까지 5단계 시각 자료', 'pdf'],
  ['implant',  '임플란트 사후관리 매뉴얼', '식립 후 1주/1개월/6개월 가이드', 'pdf'],
  ['ortho',    '인비절라인 사용법 영상', '장착/세척/교체 주기', 'video'],
  ['ortho',    '교정 단계별 시뮬레이션', 'iTero 결과 안내', 'image'],
  ['esthetic', '글로우네이트 비포애프터', '실제 케이스 모음', 'image'],
  ['esthetic', '라미네이트 vs 크라운 비교', '의사결정 가이드', 'document'],
  ['perio',    '잇몸 출혈 자가관리', '집에서 할 수 있는 5단계', 'pdf'],
  ['prosth',   '지르코니아 vs 골드 크라운', '재료 비교표', 'image'],
]
for (const [catKey, title, desc, ftype] of materials) {
  out.push(`INSERT OR IGNORE INTO materials (id, hospital_id, category_id, title, description, file_url, file_type, view_count) VALUES ('${uuid()}', '${HID}', '${CAT.materials[catKey]}', '${sqlEsc(title)}', '${sqlEsc(desc)}', '/static/demo/${ftype}.${ftype === 'video' ? 'mp4' : ftype === 'pdf' ? 'pdf' : 'jpg'}', '${ftype}', ${rand(20, 250)});\n`)
}

/* ─────── 5) cases + case_images (케이스 사진) ─────── */
out.push("\n-- cases\n")
const cases = [
  ['implant',  '40대 남성 어금니 임플란트 (#36, #46)', '심하게 흔들리던 어금니 2개를 자연치아처럼 복원', '40대', '남', '4개월'],
  ['implant',  '60대 여성 전악 임플란트', 'All-on-4 풀마우스 케이스, 발치 즉시 식립', '60대', '여', '6개월'],
  ['ortho',    '20대 여성 인비절라인 풀스텝', '돌출입 + 비대칭 동시 개선, 18개월 완료', '20대', '여', '18개월'],
  ['ortho',    '30대 남성 발치교정', '4개 발치 후 공간폐쇄, 측모 개선', '30대', '남', '24개월'],
  ['esthetic', '20대 여성 글로우네이트 8개', '상악 전치부 컬러+모양 동시 개선', '20대', '여', '2주'],
  ['esthetic', '30대 여성 라미네이트 6개', '치아 사이 공간 + 변색 케이스', '30대', '여', '3주'],
]
const caseIds = []
for (const [catKey, title, desc, age, gender, period] of cases) {
  const cid = uuid()
  caseIds.push({ cid, catKey })
  out.push(`INSERT OR IGNORE INTO cases (id, hospital_id, category_id, title, description, patient_age, patient_gender, treatment_period, created_by, is_public, view_count) VALUES ('${cid}', '${HID}', '${CAT.cases[catKey]}', '${sqlEsc(title)}', '${sqlEsc(desc)}', '${age}', '${gender}', '${period}', '${ADMIN}', 1, ${rand(50, 500)});\n`)
}
out.push("\n-- case_images\n")
for (const { cid } of caseIds) {
  for (const [type, cap, sort] of [['before', '치료 전', 0], ['during', '치료 중', 1], ['after', '치료 후', 2]]) {
    out.push(`INSERT OR IGNORE INTO case_images (id, case_id, image_url, image_type, caption, sort_order, hospital_id) VALUES ('${uuid()}', '${cid}', '/static/demo/case_${type}.jpg', '${type}', '${cap}', ${sort}, '${HID}');\n`)
  }
}

/* ─────── 6) reservation_records (예약 통계 - 최근 60일) ─────── */
out.push("\n-- reservation_records (최근 60일)\n")
for (let i = -60; i <= 0; i++) {
  const d = dayN(i)
  if (d.getUTCDay() === 0) continue // 일요일 휴진
  const dn = dayName[d.getUTCDay()]
  const cancel = rand(2, 8)
  const dwCancel = rand(0, 3)
  const fulfillRate = Math.round((90 + Math.random() * 8) * 10) / 10
  out.push(`INSERT OR IGNORE INTO reservation_records (id, hospital_id, record_date, day_of_week, cancel_count, dentweb_cancel_count, fulfillment_rate, created_by) VALUES ('${uuid()}', '${HID}', '${fmtDate(d)}', '${dn}', ${cancel}, ${dwCancel}, ${fulfillRate}, '${ADMIN}');\n`)
}

/* ─────── 7) wait_time_records (대기시간 - 최근 60일) ─────── */
out.push("\n-- wait_time_records\n")
for (let i = -60; i <= 0; i++) {
  const d = dayN(i)
  if (d.getUTCDay() === 0) continue
  const dn = dayName[d.getUTCDay()]
  const total = rand(180, 450)
  const avg = Math.round((total / rand(15, 40)) * 10) / 10
  out.push(`INSERT OR IGNORE INTO wait_time_records (id, hospital_id, record_date, day_of_week, total_wait_minutes, avg_wait_minutes, created_by) VALUES ('${uuid()}', '${HID}', '${fmtDate(d)}', '${dn}', ${total}, ${avg}, '${ADMIN}');\n`)
}

/* ─────── 8) parking_records (주차권 - 최근 60일) ─────── */
out.push("\n-- parking_records\n")
for (let i = -60; i <= 0; i++) {
  const d = dayN(i)
  if (d.getUTCDay() === 0) continue
  const dn = dayName[d.getUTCDay()]
  out.push(`INSERT OR IGNORE INTO parking_records (id, hospital_id, record_date, day_of_week, ticket_count, created_by) VALUES ('${uuid()}', '${HID}', '${fmtDate(d)}', '${dn}', ${rand(15, 45)}, '${ADMIN}');\n`)
}

/* ─────── 9) recall_tasks (리콜 자동화 - 30개) ─────── */
out.push("\n-- recall_tasks\n")
const recallReasons = ['6개월 정기검진', '교정 후 리테이너 점검', '임플란트 사후관리', '치주 정기 스케일링', '신경치료 후 크라운 미시술', '발치 후 미수복']
const recallChannels = ['call', 'sms', 'kakao']
const recallStatus = ['pending', 'pending', 'pending', 'contacted', 'completed', 'failed']
for (let i = 0; i < 30; i++) {
  const reason = pick(recallReasons)
  const channel = pick(recallChannels)
  const status = pick(recallStatus)
  const offset = rand(-30, 14)
  const sched = fmtDate(dayN(offset))
  const lastVisit = fmtDate(dayN(-rand(120, 300)))
  const days = rand(120, 300)
  const reservMade = status === 'completed' ? 1 : 0
  const assignedTo = pick(STAFF).id
  out.push(`INSERT OR IGNORE INTO recall_tasks (id, hospital_id, patient_name, phone, reason, last_visit_date, days_elapsed, channel, priority, status, assigned_to, scheduled_date, reservation_made) VALUES ('${uuid()}', '${HID}', '환자${i + 1}', '010-${rand(2000, 9999)}-${rand(1000, 9999)}', '${reason}', '${lastVisit}', ${days}, '${channel}', ${rand(1, 5)}, '${status}', '${assignedTo}', '${sched}', ${reservMade});\n`)
}

/* ─────── 10) job_postings + applicants + interviews (HR) ─────── */
out.push("\n-- job_postings\n")
const jobs = [
  { type: 'hygienist', title: '치과위생사 모집 (경력 2년+)', salary: [320, 400], status: 'open' },
  { type: 'assistant', title: '진료보조 신입 채용', salary: [240, 280], status: 'open' },
  { type: 'coordinator', title: '데스크 코디네이터 (경력)', salary: [300, 380], status: 'open' },
  { type: 'dentist', title: '페이닥터 (보철 전문)', salary: [800, 1500], status: 'paused' },
]
const jobIds = []
for (const job of jobs) {
  const jid = uuid()
  jobIds.push({ jid, type: job.type })
  out.push(`INSERT OR IGNORE INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) VALUES ('${jid}', '${HID}', '${sqlEsc(job.title)}', '${job.type}', 'full_time', '본원 진료팀과 함께 성장할 분을 모십니다.', '관련 자격증 소지자, 책임감 있는 분', '4대보험, 인센티브, 교육비 지원, 주 5일 근무', ${job.salary[0]}, ${job.salary[1]}, '${job.status}', '${ADMIN}', '${fmtDate(dayN(30))}');\n`)
}
out.push("\n-- applicants\n")
const appNames = ['김민수','이지연','박서준','최예진','정하늘','한지훈','윤소희','강도현','임수빈','조민재','유지원','홍나영']
const appStatuses = ['applied', 'screening', 'interview', 'evaluation', 'offer', 'hired', 'rejected']
const applicantIds = []
for (let i = 0; i < 25; i++) {
  const aid = uuid()
  const job = pick(jobIds)
  const status = pick(appStatuses)
  applicantIds.push({ aid, status })
  out.push(`INSERT OR IGNORE INTO applicants (id, hospital_id, job_posting_id, name, email, phone, cover_letter, status, rating, applied_at) VALUES ('${aid}', '${HID}', '${job.jid}', '${pick(appNames)}', 'app${i}@example.com', '010-${rand(2000, 9999)}-${rand(1000, 9999)}', '경력 ${rand(0, 8)}년, 본원 비전에 공감하여 지원했습니다.', '${status}', ${rand(2, 5)}, '${fmtDate(dayN(-rand(1, 45)))} ${rand(9, 18).toString().padStart(2,'0')}:${rand(0, 59).toString().padStart(2,'0')}:00');\n`)
}
out.push("\n-- interviews\n")
for (const { aid, status } of applicantIds) {
  if (!['interview','evaluation','offer','hired'].includes(status)) continue
  const offset = rand(-20, 10)
  const sched = `${fmtDate(dayN(offset))} ${rand(10, 17).toString().padStart(2,'0')}:00:00`
  const istatus = offset < 0 ? 'completed' : 'scheduled'
  const score = istatus === 'completed' ? rand(60, 95) : null
  const fb = istatus === 'completed' ? '인성 우수, 실무 경험 풍부, 채용 추천' : ''
  out.push(`INSERT OR IGNORE INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at, duration_min, interview_type, status, feedback${score ? ', score' : ''}) VALUES ('${uuid()}', '${aid}', '${HID}', '${ADMIN}', '${sched}', 30, 'onsite', '${istatus}', '${sqlEsc(fb)}'${score ? ', ' + score : ''});\n`)
}

/* ─────── 11) events (일정 관리 - 30개) ─────── */
out.push("\n-- events\n")
const eventTypes = [
  { t: 'meeting',     title: '주간 운영회의', color: '#0f766e' },
  { t: 'meeting',     title: '월간 매출 리뷰', color: '#0f766e' },
  { t: 'education',   title: '신입 OJT 교육', color: '#7c3aed' },
  { t: 'education',   title: '임플란트 핸즈온 세미나', color: '#7c3aed' },
  { t: 'maintenance', title: '체어 정기점검', color: '#dc2626' },
  { t: 'vacation',    title: '여름 휴진', color: '#ea580c' },
  { t: 'interview',   title: '치과위생사 면접', color: '#0284c7' },
  { t: 'other',       title: '학회 참석 (대한치과의사협회)', color: '#64748b' },
]
for (let i = 0; i < 30; i++) {
  const ev = pick(eventTypes)
  const start = fmtDate(dayN(rand(-30, 60)))
  out.push(`INSERT OR IGNORE INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES ('${uuid()}', '${HID}', '${sqlEsc(ev.title)}', '${sqlEsc(ev.title + ' 일정')}', '${ev.t}', '${start}', '${start}', 1, '${ev.color}', '${ADMIN}');\n`)
}

/* ─────── 12) checklists (체크리스트) ─────── */
out.push("\n-- checklists\n")
const checklists = [
  { type: 'daily_open', title: '오픈 체크리스트', items: ['전체 조명 점검','체어 작동 확인','멸균기 가동','데스크 컴퓨터 부팅','대기실 정리'] },
  { type: 'daily_close', title: '마감 체크리스트', items: ['멸균기 종료','진료기록 백업','현금 시재 정산','전체 소등 + 가스 차단','보안 시스템 작동'] },
  { type: 'weekly', title: '주간 정기점검', items: ['체어 호스 청소','진공흡인기 필터 교체','석션 라인 소독','약품 재고 확인'] },
  { type: 'infection', title: '감염관리 체크', items: ['멸균기 인디케이터 확인','수술실 표면 소독','기구 멸균 라벨링','폐기물 분리'] },
  { type: 'onboarding', title: '신입 입사 첫주 체크', items: ['사원증 발급','PFM 계정 생성','업무 매뉴얼 전달','선임 멘토 매칭','진료팀 인사'] },
]
for (const cl of checklists) {
  out.push(`INSERT OR IGNORE INTO checklists (id, hospital_id, title, checklist_type, items) VALUES ('${uuid()}', '${HID}', '${sqlEsc(cl.title)}', '${cl.type}', '${sqlEsc(JSON.stringify(cl.items))}');\n`)
}

/* ─────── 13) gamification_missions ─────── */
out.push("\n-- gamification_missions\n")
const missions = [
  ['주간 신환 5명 응대', '신환 첫 통화 5건 달성', 'custom', 'weekly', 5, 200, '🎯', 'all'],
  ['리뷰 3건 응답', '온라인 리뷰 댓글 작성', 'custom', 'weekly', 3, 150, '⭐', 'manager'],
  ['리콜 콜 10건', '리콜 대상자 연락 완료', 'custom', 'weekly', 10, 300, '📞', 'all'],
  ['상담 동의율 70%', '월간 상담 동의율 달성', 'custom', 'monthly', 70, 1000, '💎', 'all'],
  ['오픈 체크리스트 완수', '월 20일 이상 오픈 체크 완료', 'custom', 'monthly', 20, 500, '🌅', 'all'],
]
for (const [title, desc, mtype, period, target, points, icon, role] of missions) {
  out.push(`INSERT OR IGNORE INTO gamification_missions (id, hospital_id, title, description, mission_type, period, target_value, points, badge_icon, target_role, is_active, created_by) VALUES ('${uuid()}', '${HID}', '${sqlEsc(title)}', '${sqlEsc(desc)}', '${mtype}', '${period}', ${target}, ${points}, '${icon}', '${role}', 1, '${ADMIN}');\n`)
}

/* ─────── 14) marketing_channels + marketing_records ─────── */
out.push("\n-- marketing_channels\n")
const channels = [
  { id: uuid(), name: '네이버 검색광고', cost: 1500000 },
  { id: uuid(), name: '인스타그램 광고', cost: 800000 },
  { id: uuid(), name: '블로그 콘텐츠', cost: 0 },
  { id: uuid(), name: '유튜브 광고', cost: 1200000 },
  { id: uuid(), name: '지인 추천', cost: 0 },
]
for (const ch of channels) {
  out.push(`INSERT OR IGNORE INTO marketing_channels (id, hospital_id, name, monthly_cost, is_active) VALUES ('${ch.id}', '${HID}', '${sqlEsc(ch.name)}', ${ch.cost}, 1);\n`)
}
out.push("\n-- marketing_records (최근 6개월)\n")
for (let m = -5; m <= 0; m++) {
  const d = new Date(today)
  d.setUTCMonth(d.getUTCMonth() + m)
  const ym = d.toISOString().slice(0, 7)
  for (const ch of channels) {
    const newP = rand(8, 45)
    const adSpend = ch.cost === 0 ? 0 : rand(50, 300)
    const rev = newP * rand(80, 250)
    out.push(`INSERT OR IGNORE INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) VALUES ('${uuid()}', '${HID}', '${ch.id}', '${ym}', ${newP}, ${rand(20, 80)}, ${adSpend}, ${rev});\n`)
  }
}

/* ─────── 15) onboarding_tasks (applicant별 작업) ─────── */
out.push("\n-- onboarding_tasks (hired/offer 상태 지원자에게 배정)\n")
const onbTaskTemplate = [
  ['신입 환영 인사', '사원증 발급, 라커 배정, 진료팀 인사', 'admin', 1],
  ['업무 매뉴얼 학습', 'PFM 매뉴얼 + 진료 SOP 숙지', 'training', 3],
  ['선임 멘토 매칭', '주임선생님과 1:1 매칭', 'mentoring', 1],
  ['진료실 셰도잉', '실제 진료 옆에서 관찰', 'training', 5],
  ['1주차 자체 평가', '체크리스트 기반 자체 평가', 'evaluation', 7],
  ['2주차 OJT 시작', '실무 투입 (선임 동행)', 'training', 14],
  ['1개월 면담', '관리자 1:1 면담 + 피드백', 'evaluation', 30],
  ['3개월 정식 평가', '정식 직원 전환 평가', 'evaluation', 90],
]
const hiredApplicants = applicantIds.filter(a => ['offer','hired'].includes(a.status)).slice(0, 3)
for (const { aid } of hiredApplicants) {
  for (let i = 0; i < onbTaskTemplate.length; i++) {
    const [title, desc, cat, days] = onbTaskTemplate[i]
    const due = fmtDate(dayN(days - 7)) // 7일 전부터 카운트
    const status = i < 3 ? 'completed' : i < 5 ? 'in_progress' : 'pending'
    const completedAt = status === 'completed' ? `${fmtDate(dayN(-rand(1, 14)))} ${rand(9, 18).toString().padStart(2,'0')}:00:00` : 'NULL'
    const completedClause = status === 'completed' ? `'${completedAt}'` : 'NULL'
    out.push(`INSERT OR IGNORE INTO onboarding_tasks (id, hospital_id, applicant_id, title, description, category, assigned_to, status, due_date, completed_at) VALUES ('${uuid()}', '${HID}', '${aid}', '${sqlEsc(title)}', '${sqlEsc(desc)}', '${cat}', '${ADMIN}', '${status}', '${due}', ${completedClause});\n`)
  }
}

/* ─────── 16) leave_balances (연차) ─────── */
out.push("\n-- leave_balances\n")
for (const s of STAFF) {
  out.push(`INSERT OR IGNORE INTO leave_balances (id, hospital_id, user_id, year, leave_type, total_days, used_days) VALUES ('${uuid()}', '${HID}', '${s.id}', 2026, 'annual', 15, ${rand(2, 8)});\n`)
}

/* ─────── 17) kpi_targets (월별 목표 - 실제 스키마) ─────── */
out.push("\n-- kpi_targets (월별 목표)\n")
for (let m = -2; m <= 1; m++) {
  const d = new Date(today)
  d.setUTCMonth(d.getUTCMonth() + m)
  const ym = d.toISOString().slice(0, 7)
  const targetRev = 18000 + rand(-2000, 2000)
  out.push(`INSERT OR IGNORE INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, created_by) VALUES ('${uuid()}', '${HID}', '${ym}', ${targetRev}, 35, 4, 6, 192, 22, 4, '${ym} 월간 목표', '${ADMIN}');\n`)
}

/* ─────── 18) meeting_minutes (회의록) ─────── */
out.push("\n-- meetings\n")
const meetingTitles = [
  ['주간 운영회의 4월 4주차', '4월 매출 추이, 신환 유입 분석, 5월 캠페인 기획'],
  ['월간 KPI 점검회의', '4월 KPI 달성률 78%, 미달 항목 보완책 논의'],
  ['교정 진료팀 케이스 컨퍼런스', '인비절라인 복합 케이스 3건 토론'],
  ['감염관리 정기교육', '최신 가이드라인 적용, 멸균 프로토콜 점검'],
  ['직원 만족도 설문 결과 공유', '근무환경 개선 5개 항목 채택'],
]
const meetingIds = []
for (let i = 0; i < meetingTitles.length; i++) {
  const mid = uuid()
  meetingIds.push(mid)
  const [title, desc] = meetingTitles[i]
  const md = fmtDate(dayN(-rand(1, 45)))
  out.push(`INSERT OR IGNORE INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, status, visibility, created_by) VALUES ('${mid}', '${HID}', '${sqlEsc(title)}', '${sqlEsc(desc)}', '${md}', '10:00', '11:00', '대회의실', 'completed', 'all', '${ADMIN}');\n`)
}
out.push("\n-- meeting_minutes\n")
for (let i = 0; i < meetingIds.length; i++) {
  const [, desc] = meetingTitles[i]
  out.push(`INSERT OR IGNORE INTO meeting_minutes (id, meeting_id, content, decisions, action_items, written_by, hospital_id) VALUES ('${uuid()}', '${meetingIds[i]}', '${sqlEsc(desc + ' 상세 논의 내용')}', '${sqlEsc('1) 5월 신환 목표 +20% / 2) 광고비 재배분 / 3) 직원 인센티브 개정')}', '${sqlEsc('- 마케팅 보고서 제출 (담당: 강지은, 5/5)\\n- 인센티브 안 초안 (담당: 김혜진, 5/10)\\n- 신규 케이스 사진 정리 (담당: 박나영, 5/3)')}', '${ADMIN}', '${HID}');\n`)
}

/* ─────── 19) survey_templates (만족도 설문) ─────── */
out.push("\n-- survey_templates\n")
const surveyTplId = uuid()
out.push(`INSERT OR IGNORE INTO survey_templates (id, hospital_id, name, description, category, questions, is_default, sort_order) VALUES ('${surveyTplId}', '${HID}', '진료 만족도 조사', '오늘 진료에 대해 평가해주세요', 'satisfaction', '${sqlEsc(JSON.stringify([
  { id: 1, type: 'rating', q: '오늘 진료가 만족스러웠나요?', max: 5 },
  { id: 2, type: 'rating', q: '대기시간은 적절했나요?', max: 5 },
  { id: 3, type: 'rating', q: '직원의 친절도는 어땠나요?', max: 5 },
  { id: 4, type: 'rating', q: '진료 설명이 이해하기 쉬웠나요?', max: 5 },
  { id: 5, type: 'text', q: '개선이 필요한 점이 있다면 알려주세요' },
]))}', 1, 0);\n`)
const surveyTplId2 = uuid()
out.push(`INSERT OR IGNORE INTO survey_templates (id, hospital_id, name, description, category, questions, is_default, sort_order) VALUES ('${surveyTplId2}', '${HID}', '직원 만족도 조사', '근무 환경에 대해 알려주세요', 'staff', '${sqlEsc(JSON.stringify([
  { id: 1, type: 'rating', q: '근무 환경에 만족하시나요?', max: 5 },
  { id: 2, type: 'rating', q: '동료와의 협업이 원활한가요?', max: 5 },
  { id: 3, type: 'rating', q: '교육/성장 기회가 충분한가요?', max: 5 },
  { id: 4, type: 'text', q: '개선 제안이 있다면 알려주세요' },
]))}', 0, 1);\n`)

/* ─────── 20) onboarding_tasks 제거 (applicant 종속이라 의미 없음) ─────── */
// onboarding은 applicant 단위 작업이라 시드는 생략 - applicants에 의존

console.log(`✅ Generated seed: ${out.length} statements`)
fs.writeFileSync('/tmp/demo_seed_full.sql', out.join(''))
console.log('Wrote /tmp/demo_seed_full.sql (' + (out.join('').length / 1024).toFixed(1) + ' KB)')
