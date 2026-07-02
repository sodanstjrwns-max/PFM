import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString } from '../lib/middleware'

const onboarding = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Get onboarding status ─── */
onboarding.get('/status', async (c) => {
  const user = c.get('user')!
  const row: any = await c.env.DB.prepare(
    'SELECT onboarding_completed, onboarding_step, onboarding_data, settings FROM hospitals WHERE id=?'
  ).bind(user.hospitalId).first()
  if (!row) return c.json({ error: '병원 정보를 찾을 수 없습니다' }, 404)
  
  let data = {}
  try { data = JSON.parse(row.onboarding_data || '{}') } catch {}
  let settings = {}
  try { settings = JSON.parse(row.settings || '{}') } catch {}
  
  // Count staff for step info
  const staffCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM users WHERE hospital_id=?'
  ).bind(user.hospitalId).first() as any
  
  // Count chairs
  const chairCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM chairs WHERE hospital_id=? AND is_active=1'
  ).bind(user.hospitalId).first() as any

  return c.json({
    completed: !!row.onboarding_completed,
    currentStep: row.onboarding_step || 0,
    data,
    settings,
    stats: {
      staffCount: staffCount?.cnt || 0,
      chairCount: chairCount?.cnt || 0,
    }
  })
})

/* ─── Save step data ─── */
onboarding.post('/step/:step', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 진행할 수 있습니다' }, 403)
  
  const step = parseInt(c.req.param('step'))
  if (isNaN(step) || step < 1 || step > 6) return c.json({ error: '유효하지 않은 스텝입니다' }, 400)
  
  const body = await c.req.json()
  
  // Get current onboarding data
  const hospital: any = await c.env.DB.prepare(
    'SELECT onboarding_data, settings FROM hospitals WHERE id=?'
  ).bind(user.hospitalId).first()
  if (!hospital) return c.json({ error: '병원 정보를 찾을 수 없습니다' }, 404)
  
  let existingData = {}
  try { existingData = JSON.parse(hospital.onboarding_data || '{}') } catch {}
  let settings = {}
  try { settings = JSON.parse(hospital.settings || '{}') } catch {}
  
  // Process step-specific data
  switch (step) {
    case 1: // 핵심 진료과목
      existingData = { ...existingData, specialties: body.specialties || [] }
      break
      
    case 2: // 핵심 지역 / 타겟
      existingData = { ...existingData, 
        region: sanitizeString(body.region || '', 200),
        subRegions: body.subRegions || [],
        targetPatients: body.targetPatients || [],
      }
      break
      
    case 3: // 병원 운영시간
      settings = { ...settings, operating_hours: body.operating_hours }
      await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?')
        .bind(JSON.stringify(settings), user.hospitalId).run()
      existingData = { ...existingData, operatingHoursSet: true }
      break
      
    case 4: // 층/공간 구성
      settings = { ...settings, floor_map: body.floor_map }
      await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?')
        .bind(JSON.stringify(settings), user.hospitalId).run()
      existingData = { ...existingData, floorMapSet: true }
      // Auto-create chairs from floor_map (v5.7.1: N회 순차 INSERT → D1 batch)
      if (body.floor_map && Array.isArray(body.floor_map)) {
        let sortOrder = 1
        const chairStmts: D1PreparedStatement[] = []
        for (const floor of body.floor_map) {
          if (floor.spaces && Array.isArray(floor.spaces)) {
            for (const space of floor.spaces) {
              if (space.chairs && space.chairs > 0) {
                for (let i = 0; i < space.chairs; i++) {
                  chairStmts.push(c.env.DB.prepare(
                    'INSERT OR IGNORE INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)'
                  ).bind(crypto.randomUUID(), user.hospitalId, sortOrder, floor.name || '', space.name || '', sortOrder))
                  sortOrder++
                }
              }
            }
          }
        }
        for (let i = 0; i < chairStmts.length; i += 50) {
          await c.env.DB.batch(chairStmts.slice(i, i + 50))
        }
      }
      break
      
    case 5: // 직원 구성
      existingData = { ...existingData, 
        staffStructure: body.staffStructure || {},
        totalStaff: body.totalStaff || 0,
      }
      break
      
    case 6: // 완료
      existingData = { ...existingData, completedAt: new Date().toISOString() }
      break
  }
  
  // Update onboarding progress
  const newStep = Math.max(step, parseInt(hospital.onboarding_step || '0') || 0)
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_step=?, onboarding_data=? WHERE id=?'
  ).bind(newStep, JSON.stringify(existingData), user.hospitalId).run()
  
  return c.json({ success: true, step, data: existingData })
})

/* ─── Complete onboarding ─── */
onboarding.post('/complete', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 완료할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=1, onboarding_step=6 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ─── Skip onboarding ─── */
onboarding.post('/skip', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 스킵할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=1 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ─── Reset onboarding (re-run) ─── */
onboarding.post('/reset', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 초기화할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=0, onboarding_step=0 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ═════════════════════════════════════════════════════════════
   샘플 데이터 주입 (Aha Moment!)
   - 가입 직후 원클릭으로 3개월치 데모 데이터 생성
   - 본인 병원 데이터와 섞이지 않도록 sample_generated 플래그 기록
   ═════════════════════════════════════════════════════════════ */
onboarding.post('/seed-sample', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 실행할 수 있습니다' }, 403)
  const hid = user.hospitalId

  // 이미 실제 데이터가 있으면 거부 (덮어쓰기 방지)
  const existingPatients: any = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM patients WHERE hospital_id=?'
  ).bind(hid).first()
  if ((existingPatients?.cnt || 0) > 5) {
    return c.json({ error: '이미 환자 데이터가 있습니다. 기존 데이터 보호를 위해 샘플 주입이 차단되었습니다.' }, 400)
  }

  const hospital: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(hid).first()
  let settings: any = {}
  try { settings = JSON.parse(hospital?.settings || '{}') } catch {}
  settings.sample_generated_at = new Date().toISOString()

  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }

  /* v5.7.1 슈퍼최적화: ~258회 순차 INSERT → D1 batch 50개 청크.
   * 샘플 데이터는 best-effort(catch 무시)였으므로 청크 단위 catch로 동일 시맨틱 유지. */
  const stmts: D1PreparedStatement[] = []
  const flushStmts = async () => {
    for (let i = 0; i < stmts.length; i += 50) {
      await c.env.DB.batch(stmts.slice(i, i + 50)).catch(() => {})
    }
    stmts.length = 0
  }

  /* ─── 1. 체어 4개 생성 ─── */
  const chairRows: any = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM chairs WHERE hospital_id=?').bind(hid).first()
  if ((chairRows?.cnt || 0) === 0) {
    const chairs = [
      { num: 1, floor: '2F', room: '일반 진료실' },
      { num: 2, floor: '2F', room: '일반 진료실' },
      { num: 3, floor: '3F', room: '보철 진료실' },
      { num: 4, floor: '3F', room: '수술실' },
    ]
    for (const ch of chairs) {
      stmts.push(c.env.DB.prepare(
        'INSERT INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)'
      ).bind(crypto.randomUUID(), hid, ch.num, ch.floor, ch.room, ch.num))
    }
  }

  /* ─── 2. 수가 카테고리 + 항목 ─── */
  const feeCat: any = await c.env.DB.prepare('SELECT id FROM fee_categories WHERE hospital_id=? LIMIT 1').bind(hid).first()
  let catId = feeCat?.id
  if (!catId) {
    catId = crypto.randomUUID()
    stmts.push(c.env.DB.prepare('INSERT INTO fee_categories (id, hospital_id, name, sort_order) VALUES (?,?,?,?)').bind(catId, hid, '주요 진료', 1))
    const items = [
      { name: '임플란트 (1개)', price: 1300000, unit: '개', dur: 60 },
      { name: '지르코니아 크라운', price: 550000, unit: '개', dur: 40 },
      { name: '스케일링', price: 40000, unit: '회', dur: 30 },
      { name: '치아 미백', price: 350000, unit: '회', dur: 45 },
      { name: '레진 충전', price: 90000, unit: '개', dur: 20 },
      { name: '신경치료', price: 280000, unit: '근관', dur: 50 },
    ]
    for (const it of items) {
      stmts.push(c.env.DB.prepare(
        'INSERT INTO fee_items (id, hospital_id, category_id, name, base_price, unit, duration_min, is_active) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(crypto.randomUUID(), hid, catId, it.name, it.price, it.unit, it.dur, 1))
    }
  }

  /* ─── 3. 환자 40명 생성 (90일간 유입) ─── */
  const firstNames = ['민준','서연','지우','하준','수아','도윤','예준','시우','건우','채원','지호','유나','서윤','지민','준서','하은','승우','예원','시윤','수현']
  const lastNames = ['김','이','박','최','정','강','조','윤','장','임','오','서','신','권','황','안','송','류','전','홍']
  const sources = ['네이버 검색', '인스타그램', '지인 소개', '간판 보고', '블로그', '당근마켓', '카카오맵', '홈페이지']
  const regions = ['강남구', '서초구', '송파구', '강동구', '마포구', '영등포구']
  const specialties = ['임플란트', '보철', '교정', '소아치과', '일반진료', '치주']

  const patients: any[] = []
  for (let i = 0; i < 40; i++) {
    const pid = crypto.randomUUID()
    const daysBack = Math.floor(Math.random() * 90)
    const regDate = iso(daysAgo(daysBack))
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[Math.floor(i / 2) % lastNames.length]
    const name = ln + fn
    const birthYear = (new Date().getFullYear()) - (20 + Math.floor(Math.random() * 50))
    const birthDate = `${birthYear}-${String(Math.floor(Math.random()*12)+1).padStart(2,'0')}-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`
    const gender = Math.random() > 0.5 ? 'M' : 'F'
    const phone = `010-${String(Math.floor(1000 + Math.random() * 9000))}-${String(Math.floor(1000 + Math.random() * 9000))}`
    const source = sources[Math.floor(Math.random() * sources.length)]
    const region = regions[Math.floor(Math.random() * regions.length)]
    const specialty = specialties[Math.floor(Math.random() * specialties.length)]
    const chartNum = `DEMO-${String(1000 + i).padStart(4, '0')}`
    const visitCount = Math.floor(Math.random() * 8) + 1
    const patientType = visitCount > 1 ? 'existing' : 'new'
    // 🎯 30% 환자는 "휴면"(6개월 이상 미방문) — 리콜 대상 인사이트용
    const isDormant = Math.random() < 0.3
    const lastVisit = isDormant
      ? iso(daysAgo(200 + Math.floor(Math.random() * 180)))  // 200~380일 전
      : regDate
    patients.push({ pid, name, birthDate, gender, phone, regDate, source, region, specialty, patientType })
    stmts.push(c.env.DB.prepare(
      `INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, first_visit_date, last_visit_date, visit_count, treatment_area, address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(pid, hid, chartNum, name, phone, birthDate, gender, patientType, source, regDate, lastVisit, visitCount, specialty, `서울특별시 ${region}`))
  }

  /* ─── 4. 퍼널 단계 분포 (10단계) ─── */
  const stages = ['awareness','interest','appointment','visit','waiting','diagnosis','consultation','treatment','management','referral']
  const treatmentTypes = ['임플란트', '교정', '보철', '일반', '심미']
  for (const p of patients) {
    const stage = stages[Math.floor(Math.random() * stages.length)]
    const estimated = [800000, 1500000, 2500000, 3800000, 5500000, 7500000][Math.floor(Math.random() * 6)]
    const agreedFactor = ['treatment','management','referral'].includes(stage) ? 1 : (['consultation','diagnosis'].includes(stage) ? 0.5 : 0)
    const agreed = Math.floor(estimated * agreedFactor)
    const paid = Math.floor(agreed * (stage === 'referral' ? 1 : stage === 'management' ? 0.8 : stage === 'treatment' ? 0.5 : 0))
    stmts.push(c.env.DB.prepare(
      `INSERT INTO patient_funnel (id, hospital_id, patient_name, phone, source, current_stage, treatment_type, estimated_amount, agreed_amount, paid_amount)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, p.name, p.phone, p.source, stage, treatmentTypes[Math.floor(Math.random()*treatmentTypes.length)], estimated, agreed, paid))
  }

  /* ─── 5. 상담 기록 28건 ─── */
  const treatCategories = ['임플란트', '보철', '교정', '심미', '일반진료', '치주']
  for (let i = 0; i < 28; i++) {
    const p = patients[i]
    if (!p) continue
    const daysBack = Math.floor(Math.random() * 85)
    const d = iso(daysAgo(daysBack))
    const estimated = [800000, 1500000, 2500000, 3800000, 5500000, 7500000, 12000000][Math.floor(Math.random() * 7)]
    const confirmed = Math.random() > 0.4 ? 1 : 0
    const agreed = confirmed ? estimated : (Math.random() > 0.6 ? Math.floor(estimated * 0.3) : 0)
    const treatment = treatCategories[Math.floor(Math.random() * treatCategories.length)]
    stmts.push(c.env.DB.prepare(
      `INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, planned_amount, agreed_amount, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, d, `DEMO-${String(1000 + i).padStart(4, '0')}`, p.name, '데모 원장', '데모 실장', estimated, agreed, p.patientType, treatment, confirmed, confirmed ? 1 : 0, Math.random() > 0.6 ? 1 : 0))
  }

  /* ─── 6. 콜 기록 60건 (인/아웃바운드 혼합) ─── */
  const callPurposes = ['예약 문의', '치료 비용 문의', '예약 변경', '진료 후 문의', '리콜', '컴플레인']
  const recogPaths = ['네이버', '인스타', '지인', '블로그', '간판', '카카오맵']
  for (let i = 0; i < 60; i++) {
    const p = patients[i % patients.length]
    const daysBack = Math.floor(Math.random() * 90)
    const d = iso(daysAgo(daysBack))
    const callType = Math.random() > 0.4 ? 'inbound' : 'outbound'
    const purpose = callPurposes[Math.floor(Math.random() * callPurposes.length)]
    const reserved = Math.random() > 0.5 ? 'reserved' : 'not_reserved'
    stmts.push(c.env.DB.prepare(
      `INSERT INTO call_records (id, hospital_id, call_type, call_date, patient_name, phone, patient_type, staff_name, recognition_path, call_purpose, reservation_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, callType, d, p.name, p.phone, p.patientType, '데모 데스크', recogPaths[Math.floor(Math.random()*recogPaths.length)], purpose, reserved))
  }

  /* ─── 7. 컴플레인 5건 ─── */
  const complaintParts = ['데스크', '진료실', '상담실', '주차장', '대기실']
  const complaintCats = ['대기시간', '가격', '설명 부족', '응대 태도', '예약 오류']
  const complaintDesc = [
    '예약 시간보다 40분 대기함. 다음부터 미리 연락 요청.',
    '견적이 너무 비싸게 느껴진다는 피드백.',
    '치료 과정 설명이 부족했다고 보고.',
    '상담 중 태도가 불편했다는 의견.',
    '예약이 누락되어 허탕침.'
  ]
  for (let i = 0; i < 5; i++) {
    const p = patients[i + 10]
    if (!p) continue
    const d = iso(daysAgo(Math.floor(Math.random() * 60)))
    stmts.push(c.env.DB.prepare(
      `INSERT INTO complaints (id, hospital_id, complaint_date, patient_name, part, category, description, responder, resolver, resolution, status, severity)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, d, p.name, complaintParts[i], complaintCats[i], complaintDesc[i], '데모 실장', i < 3 ? '데모 원장' : null, i < 3 ? '사과 및 재예약 조치' : null, i < 3 ? 'resolved' : 'in_progress', Math.random() > 0.6 ? 'high' : 'medium'))
  }

  /* ─── 8. KPI 일간 기록 (최근 60일) ─── */
  const dayOfWeekKo = ['sun','mon','tue','wed','thu','fri','sat']
  for (let i = 0; i < 60; i++) {
    const d = iso(daysAgo(i))
    const dowIdx = daysAgo(i).getDay()
    if (dowIdx === 0) continue // 일요일 휴진
    const baseRevenue = dowIdx === 6 ? 3500000 : 6500000
    const revenue = baseRevenue + Math.floor(Math.random() * 4000000)
    const nonIns = Math.floor(revenue * 0.7)
    const ins = revenue - nonIns
    const newP = Math.floor(Math.random() * 8) + 2
    const existingP = Math.floor(Math.random() * 25) + 10
    stmts.push(c.env.DB.prepare(
      `INSERT OR IGNORE INTO daily_records (id, hospital_id, record_date, day_of_week, revenue_non_insurance, revenue_insurance, existing_patients, new_patients, region_core_new, referral_new, online_new)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, d, dayOfWeekKo[dowIdx], nonIns, ins, existingP, newP, Math.floor(newP * 0.4), Math.floor(newP * 0.3), Math.floor(newP * 0.3)))
  }

  /* ─── 9. 이번달 KPI 목표 ─── */
  const thisMonth = today.toISOString().slice(0, 7)
  stmts.push(c.env.DB.prepare(
    `INSERT OR IGNORE INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(crypto.randomUUID(), hid, thisMonth, 180000000, 30, 5, 3, 200, 22, 4))

  /* ─── 10. 리뷰 데이터 15건 (네이버/구글/카카오) ─── */
  const reviewPlatforms = ['naver', 'google', 'kakao']
  const reviewTexts = [
    { s: 'positive', t: '원장님이 정말 친절하시고 치료도 꼼꼼하게 잘 해주셨어요. 다음에도 꼭 방문하겠습니다.' },
    { s: 'positive', t: '대기 없이 바로 진료받을 수 있어서 좋았어요. 시설도 깔끔하고 직원분들도 친절합니다.' },
    { s: 'positive', t: '임플란트 치료 받았는데 진짜 만족스러워요. 설명도 자세히 해주시고 가격도 합리적.' },
    { s: 'neutral', t: '시설은 괜찮은데 주차가 좀 힘들어요. 그 외에는 무난합니다.' },
    { s: 'negative', t: '예약했는데 대기가 너무 길었어요. 시간 관리가 좀 아쉽습니다.' },
  ]
  for (let i = 0; i < 15; i++) {
    const rv = reviewTexts[i % reviewTexts.length]
    const d = iso(daysAgo(Math.floor(Math.random() * 60)))
    stmts.push(c.env.DB.prepare(
      `INSERT INTO review_management (id, hospital_id, platform, reviewer_name, rating, review_text, sentiment, review_date, response_status)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, reviewPlatforms[i % 3], `데모환자${i+1}`, rv.s === 'positive' ? 5 : rv.s === 'neutral' ? 3 : 2, rv.t, rv.s, d, i > 8 ? 'pending' : 'responded'))
  }

  /* ─── 11. 커뮤니티 샘플 글 (공지/자유/칭찬) + 회의록 ─── */
  // 관리자 본인 계정을 작성자로
  const adminUser: any = await c.env.DB.prepare(
    "SELECT id, name FROM users WHERE hospital_id=? AND role='admin' ORDER BY created_at LIMIT 1"
  ).bind(hid).first()
  const authorId = adminUser?.id || user.id
  const authorName = adminUser?.name || user.name || '원장'

  const samplePosts = [
    { board: 'notice', title: '[환영합니다] Patient Funnel Manager를 시작하세요', content: '안녕하세요, 원장님. PFM에 오신 걸 환영합니다.\n\n이 공지를 포함한 모든 샘플 글은 [설정 → 샘플 초기화]에서 한 번에 삭제할 수 있습니다. 직원 초대 후 실제 사용을 시작해보세요.\n\n- 대시보드에서 오늘의 KPI 확인\n- 퍼널에서 상담 전환율 추적\n- 회의록/게시판으로 팀 소통', pin: 1 },
    { board: 'notice', title: '[가이드] 첫 1주일 체크리스트', content: '1일차: 대표원장 프로필 완성\n2일차: 직원 초대코드 발급 (HR → 직원 초대)\n3일차: 월간 KPI 목표 입력\n4일차: 가격표/상담 스크립트 정리\n5일차: 퍼널 단계 커스터마이징\n6일차: 회의록 첫 작성\n7일차: 만족도 설문 발송 테스트', pin: 0 },
    { board: 'free', title: '이 게시판은 이렇게 사용하세요', content: '자유게시판은 원내 누구나 자유롭게 의견을 나누는 공간입니다. 제안, 궁금증, 일상 잡담도 환영!', pin: 0 },
    { board: 'praise', title: '오늘의 칭찬 예시 — 우리 함께 시작해요', content: '오늘 오전 긴급 환자 대응을 빠르게 해주신 팀원께 감사드립니다. 이런 순간순간이 서로의 동기부여가 됩니다.', pin: 0, target: '동료 여러분' },
  ]
  for (const p of samplePosts) {
    stmts.push(c.env.DB.prepare(
      `INSERT INTO posts (id, hospital_id, board_type, title, content, author_id, is_pinned, target_name, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, p.board, p.title, p.content, authorId, p.pin, (p as any).target || '', iso(daysAgo(Math.floor(Math.random()*5)))))
  }

  /* ─── 12. 샘플 회의록 2건 ─── */
  {
    const meetingDate1 = iso(daysAgo(7))
    const meetingDate2 = iso(daysAgo(-3)) // 3일 뒤
    stmts.push(c.env.DB.prepare(
      `INSERT INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, status, visibility, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, '주간 원장 브리핑',
      '지난주 KPI 리뷰 및 이번주 목표 설정. 신환 수 +12%, 상담 전환율 58% 기록.',
      meetingDate1, '09:00', '09:30', '원장실', 'completed', 'all', authorId))
    stmts.push(c.env.DB.prepare(
      `INSERT INTO meetings (id, hospital_id, title, description, meeting_date, start_time, end_time, location, status, visibility, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, '전체 스태프 회의',
      '4월 만족도 설문 결과 공유, 신규 가격표 반영, 컴플레인 케이스 학습.',
      meetingDate2, '18:30', '19:30', '교육실', 'scheduled', 'all', authorId))
  }

  /* ─── 🚀 v5.7.1: 누적된 ~258개 INSERT를 50개 청크 batch로 일괄 실행 ─── */
  await flushStmts()

  /* ─── settings에 샘플 생성 플래그 기록 ─── */
  await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?')
    .bind(JSON.stringify(settings), hid).run()

  return c.json({
    success: true,
    message: '✨ 샘플 데이터 주입 완료! 대시보드에서 3개월치 데모 데이터를 확인해보세요.',
    counts: {
      patients: patients.length,
      consultRecords: 28,
      callRecords: 60,
      complaints: 5,
      dailyRecords: 60,
      reviews: 15,
      funnelStages: patients.length,
      posts: samplePosts.length,
      meetings: 2,
    }
  })
})

/* ─── 🎯 아하모멘트 인사이트: 데이터에서 자동으로 숨은 기회 발견 ─── */
onboarding.get('/insights', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId

  try {
    // 1) 총 환자수 + 최근 방문이 없는 환자(리콜 기회)
    const patientStats: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN last_visit_date IS NULL OR julianday('now') - julianday(last_visit_date) > 180 THEN 1 ELSE 0 END) as dormant,
             SUM(CASE WHEN (referrer_name IS NOT NULL AND referrer_name != '') OR visit_source IN ('지인소개','지인','referral') THEN 1 ELSE 0 END) as referred
      FROM patients WHERE hospital_id=?
    `).bind(hid).first().catch(() => ({ total: 0, dormant: 0, referred: 0 }))

    // 2) 상담 - 동의율 및 미결정 환자(전환 기회)
    const consultStats: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN treatment_confirmed = 'O' THEN 1 ELSE 0 END) as confirmed,
             SUM(CASE WHEN treatment_confirmed = 0 AND recall_done = 0 THEN 1 ELSE 0 END) as undecided,
             COALESCE(SUM(planned_amount), 0) as total_planned,
             COALESCE(SUM(CASE WHEN treatment_confirmed = 'O' THEN agreed_amount ELSE 0 END), 0) as total_agreed
      FROM consult_records WHERE hospital_id=?
    `).bind(hid).first().catch(() => ({ total: 0, confirmed: 0, undecided: 0, total_planned: 0, total_agreed: 0 }))

    // 3) 이번달 매출 현황
    const monthRevenue: any = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(revenue_insurance + revenue_non_insurance), 0) as revenue,
             COALESCE(SUM(new_patients), 0) as new_patients,
             COUNT(*) as days_recorded
      FROM daily_records
      WHERE hospital_id=? AND substr(record_date,1,7) = strftime('%Y-%m', 'now')
    `).bind(hid).first().catch(() => ({ revenue: 0, new_patients: 0, days_recorded: 0 }))

    // 4) 미응대 리뷰 (평판 기회)
    const reviewStats: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN response_status = 'pending' THEN 1 ELSE 0 END) as pending,
             COALESCE(AVG(rating), 0) as avg_rating
      FROM review_management WHERE hospital_id=?
    `).bind(hid).first().catch(() => ({ total: 0, pending: 0, avg_rating: 0 }))

    // 5) 콜 전환율 (인바운드 중 예약 전환)
    const callStats: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN reservation_status = 'completed' OR reservation_status = 'scheduled' THEN 1 ELSE 0 END) as booked
      FROM call_records WHERE hospital_id=? AND call_type='inbound'
    `).bind(hid).first().catch(() => ({ total: 0, booked: 0 }))

    /* ══ 핵심: 자동 계산되는 "아하!" 인사이트 ══ */
    const insights = []

    // 💰 숨은 매출: 미결정 상담금액 합계
    const hiddenRevenue = Number(consultStats.total_planned || 0) - Number(consultStats.total_agreed || 0)
    if (hiddenRevenue > 0) {
      insights.push({
        icon: '💰',
        tone: 'revenue',
        title: '숨은 매출 기회',
        value: `${(hiddenRevenue / 10000).toFixed(0)}만원`,
        desc: `상담은 받았지만 아직 결정 안 한 환자들의 예상 진료비`,
        action: '상담 기록으로 이동 →',
        goto: 'consult_records',
      })
    }

    // 📞 리콜 대상: 180일 이상 미방문
    if (Number(patientStats.dormant || 0) > 0) {
      insights.push({
        icon: '📞',
        tone: 'recall',
        title: '돌아올 만한 환자',
        value: `${patientStats.dormant}명`,
        desc: `6개월 이상 미방문. 문자 한 통으로 복귀 가능성이 높아요`,
        action: '리콜 자동화 보기 →',
        goto: 'recall',
      })
    }

    // 💬 미결정 상담
    if (Number(consultStats.undecided || 0) > 0) {
      insights.push({
        icon: '💬',
        tone: 'convert',
        title: '전환 대기 상담',
        value: `${consultStats.undecided}건`,
        desc: `상담 후 아직 결정 안 한 환자. 팔로업 타이밍 놓치면 이탈`,
        action: '미결정 환자 보기 →',
        goto: 'consult_records',
      })
    }

    // ⭐ 미응대 리뷰
    if (Number(reviewStats.pending || 0) > 0) {
      insights.push({
        icon: '⭐',
        tone: 'reputation',
        title: '응답 대기 리뷰',
        value: `${reviewStats.pending}건`,
        desc: `미응답 리뷰는 신규환자 방문율을 -23% 낮춥니다`,
        action: '리뷰 관리로 이동 →',
        goto: 'review_mgmt',
      })
    }

    // 📈 상담 동의율 (벤치마크: 62%)
    const convRate = Number(consultStats.total) > 0
      ? Math.round((Number(consultStats.confirmed) / Number(consultStats.total)) * 100)
      : 0
    if (Number(consultStats.total) > 0) {
      const benchmark = 62
      const gap = benchmark - convRate
      insights.push({
        icon: '📊',
        tone: gap > 5 ? 'warn' : 'ok',
        title: '내 상담 전환율',
        value: `${convRate}%`,
        desc: gap > 5
          ? `업계 평균 ${benchmark}% 대비 ${gap}%p 낮음. 스크립트 개선 여지가 있어요`
          : gap > 0
            ? `업계 평균 ${benchmark}%와 비슷. 안정적인 흐름이에요`
            : `업계 평균 ${benchmark}%보다 +${Math.abs(gap)}%p 높음. 👏 최고 수준`,
        action: '상담 대시보드 →',
        goto: 'consult_dashboard',
      })
    }

    // 🤝 소개환자 비중
    if (Number(patientStats.total) > 0 && Number(patientStats.referred) > 0) {
      const refRate = Math.round((Number(patientStats.referred) / Number(patientStats.total)) * 100)
      insights.push({
        icon: '🤝',
        tone: 'referral',
        title: '소개로 온 환자',
        value: `${refRate}%`,
        desc: `전체 ${patientStats.total}명 중 ${patientStats.referred}명이 지인 소개. 팬 마케팅이 작동 중`,
        action: '퍼널 10단계 보기 →',
        goto: 'funnel',
      })
    }

    return c.json({
      ok: true,
      insights: insights.slice(0, 6),
      summary: {
        totalPatients: Number(patientStats.total) || 0,
        monthRevenue: Number(monthRevenue.revenue) || 0,
        monthNewPatients: Number(monthRevenue.new_patients) || 0,
        hiddenRevenue,
        dormantPatients: Number(patientStats.dormant) || 0,
        convRate,
        avgRating: Number(reviewStats.avg_rating).toFixed(1),
      }
    })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || 'insights_failed', insights: [], summary: {} })
  }
})

/* ═════════════════════════════════════════════════════════════
   상담기록 단독 샘플 데이터 주입 (Aha Moment for Consult)
   - 기존 seed-sample과 별개로 상담기록만 빠르게 주입
   - 이미 5건 이상 상담기록이 있으면 거부 (덮어쓰기 방지)
   ═════════════════════════════════════════════════════════════ */
onboarding.post('/seed-consult-sample', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '관리자/매니저만 실행할 수 있습니다' }, 403)
  }
  const hid = user.hospitalId

  // 이미 실제 상담기록이 있으면 거부
  const existing: any = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0'
  ).bind(hid).first()
  if ((existing?.cnt || 0) > 5) {
    return c.json({ error: '이미 상담기록이 충분히 있습니다. 기존 데이터 보호를 위해 샘플 주입이 차단되었습니다.' }, 400)
  }

  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d }

  /* ─── 샘플 환자 풀 ─── */
  const firstNames = ['민준','서연','지우','하준','수아','도윤','예준','시우','건우','채원','지호','유나','서윤','지민','준서','하은','승우','예원','시윤','수현']
  const lastNames = ['김','이','박','최','정','강','조','윤','장','임','오','서','신','권','황','안','송','류','전','홍']
  const sources = ['네이버 검색', '인스타그램', '지인 소개', '간판 보고', '블로그', '카카오맵', '홈페이지']
  const treatCategories = ['임플란트', '보철', '교정', '심미', '일반진료', '치주', '소아치과']
  const doctors = ['김원장', '이원장', '박원장', '데모 원장']
  const counselors = ['최실장', '정실장', '한실장', '데모 실장']
  const desks = ['이데스크', '박데스크', '데모 데스크']
  const discountNotes = ['', '', '', '가족 할인 5%', '재방문 할인', '현금 결제 할인', '학생 할인']
  const notesSamples = [
    '환자가 가격 부담 호소. 분할 결제 제안 후 긍정 반응.',
    '치료 계획 상세 설명. 다음 주 가족과 상의 후 결정 예정.',
    '타원에서 상담 받고 비교 차원으로 방문. 신뢰도 강조 필요.',
    '경제적 여유 있음. 프리미엄 옵션 제안 가능.',
    '통증 호소 강함. 빠른 치료 일정 잡기로 합의.',
    '심미적 만족도 매우 중요시. 사례 사진 제공.',
    '교정 상담. 투명교정과 메탈 비교 설명 후 투명 선택.',
    '임플란트 1차 동의. 2차 본 뜨기 일정 조율 필요.',
    '',
    '재방문. 이전 상담 내용 기반 후속 진행.',
  ]

  /* ─── 상담기록 30건 생성 (최근 90일) ─── */
  const treatmentTypes = ['신환 첫 상담', '재상담', '치료 계획 동의', '추가 치료 상담']
  let inserted = 0
  for (let i = 0; i < 30; i++) {
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[Math.floor(i / 2) % lastNames.length]
    const name = ln + fn
    const chartNum = `DEMO-C-${String(2000 + i).padStart(4, '0')}`
    const daysBack = Math.floor(Math.random() * 88) + 1
    const recordDate = iso(daysAgo(daysBack))

    // 시술 카테고리 + 금액 매트릭스
    const cat = treatCategories[Math.floor(Math.random() * treatCategories.length)]
    let planned = 0
    if (cat === '임플란트') planned = [1300000, 2600000, 3900000, 5200000][Math.floor(Math.random() * 4)]
    else if (cat === '보철') planned = [550000, 1100000, 1650000, 2200000][Math.floor(Math.random() * 4)]
    else if (cat === '교정') planned = [4500000, 5500000, 6500000, 8000000][Math.floor(Math.random() * 4)]
    else if (cat === '심미') planned = [350000, 700000, 1500000, 2800000][Math.floor(Math.random() * 4)]
    else if (cat === '치주') planned = [200000, 400000, 800000, 1200000][Math.floor(Math.random() * 4)]
    else if (cat === '소아치과') planned = [80000, 150000, 250000, 400000][Math.floor(Math.random() * 4)]
    else planned = [40000, 90000, 280000, 450000][Math.floor(Math.random() * 4)] // 일반진료

    // 동의율 60%, 부분동의 20%, 거절 20%
    const r = Math.random()
    let confirmed = ''
    let agreed = 0
    let appointmentMade = ''
    if (r < 0.6) {
      confirmed = 'O'
      agreed = planned
      appointmentMade = 'O'
    } else if (r < 0.8) {
      confirmed = ''  // 미정
      agreed = Math.floor(planned * (0.3 + Math.random() * 0.4))  // 30~70% 부분 동의
      appointmentMade = Math.random() > 0.5 ? 'O' : ''
    } else {
      confirmed = 'X'
      agreed = 0
      appointmentMade = ''
    }

    const patientType = Math.random() > 0.35 ? 'new' : 'existing'
    const visitSource = sources[Math.floor(Math.random() * sources.length)]
    const doctor = doctors[Math.floor(Math.random() * doctors.length)]
    const counselor = counselors[Math.floor(Math.random() * counselors.length)]
    const desk = desks[Math.floor(Math.random() * desks.length)]
    const discount = discountNotes[Math.floor(Math.random() * discountNotes.length)]
    const notes = notesSamples[Math.floor(Math.random() * notesSamples.length)]
    const recallDone = (confirmed !== 'O' && Math.random() > 0.5) ? 'O' : ''
    const kakaoReg = Math.random() > 0.5 ? 'O' : ''
    const pdfProv = (confirmed === 'O' && Math.random() > 0.4) ? 'O' : ''

    try {
      await c.env.DB.prepare(
        `INSERT INTO consult_records (
          id, hospital_id, record_date, chart_number, patient_name,
          doctor_name, counselor_name, desk_name,
          planned_amount, agreed_amount, discount_note,
          patient_type, visit_source, treatment_category,
          treatment_confirmed, appointment_made, recall_done,
          kakao_registered, pdf_provided, notes, created_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        crypto.randomUUID(), hid, recordDate, chartNum, name,
        doctor, counselor, desk,
        planned, agreed, discount,
        patientType, visitSource, cat,
        confirmed, appointmentMade, recallDone,
        kakaoReg, pdfProv, notes, user.id
      ).run()
      inserted++
    } catch (e) {
      // visit_source/desk_name 컬럼 없는 구버전 대비 fallback
      try {
        await c.env.DB.prepare(
          `INSERT INTO consult_records (
            id, hospital_id, record_date, chart_number, patient_name,
            doctor_name, counselor_name,
            planned_amount, agreed_amount,
            patient_type, treatment_category,
            treatment_confirmed, appointment_made, recall_done, notes
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          crypto.randomUUID(), hid, recordDate, chartNum, name,
          doctor, counselor,
          planned, agreed,
          patientType, cat,
          confirmed, appointmentMade, recallDone, notes
        ).run()
        inserted++
      } catch {}
    }
  }

  return c.json({
    success: true,
    inserted,
    message: `상담기록 샘플 ${inserted}건 주입 완료! 최근 90일치 상담 데이터입니다.`,
  })
})

/* ─── 상담기록 샘플만 삭제 ─── */
onboarding.post('/clear-consult-sample', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '관리자/매니저만 실행할 수 있습니다' }, 403)
  }
  const hid = user.hospitalId
  // DEMO-C- 접두사로 시작하는 샘플 상담기록만 삭제
  const result: any = await c.env.DB.prepare(
    "DELETE FROM consult_records WHERE hospital_id=? AND chart_number LIKE 'DEMO-C-%'"
  ).bind(hid).run()
  return c.json({ success: true, deleted: result?.meta?.changes || 0, message: '상담기록 샘플이 삭제되었습니다.' })
})

/* ─── 샘플 데이터 삭제 (원래 상태로 복구) ─── */
onboarding.post('/clear-sample', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 실행할 수 있습니다' }, 403)
  const hid = user.hospitalId

  const hospital: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(hid).first()
  let settings: any = {}
  try { settings = JSON.parse(hospital?.settings || '{}') } catch {}
  if (!settings.sample_generated_at) {
    return c.json({ error: '샘플 데이터가 주입된 적이 없습니다' }, 400)
  }

  // 샘플 데이터 일괄 삭제 (병원 스코프)
  const tables = ['patient_funnel', 'consult_records', 'call_records', 'complaints', 'daily_records', 'review_management', 'kpi_targets', 'patients', 'fee_items', 'fee_categories']
  for (const t of tables) {
    await c.env.DB.prepare(`DELETE FROM ${t} WHERE hospital_id=?`).bind(hid).run().catch(() => {})
  }
  await c.env.DB.prepare('DELETE FROM chairs WHERE hospital_id=?').bind(hid).run().catch(() => {})

  delete settings.sample_generated_at
  await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?')
    .bind(JSON.stringify(settings), hid).run()

  return c.json({ success: true, message: '샘플 데이터가 모두 삭제되었습니다.' })
})

export default onboarding
