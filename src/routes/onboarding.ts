import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString } from '../lib/middleware'

const onboarding = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Get onboarding status ─── */
onboarding.get('/status', async (c) => {
  const user = c.get('user')
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
  const user = c.get('user')
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
      // Auto-create chairs from floor_map
      if (body.floor_map && Array.isArray(body.floor_map)) {
        let sortOrder = 1
        for (const floor of body.floor_map) {
          if (floor.spaces && Array.isArray(floor.spaces)) {
            for (const space of floor.spaces) {
              if (space.chairs && space.chairs > 0) {
                for (let i = 0; i < space.chairs; i++) {
                  const chairId = crypto.randomUUID()
                  await c.env.DB.prepare(
                    'INSERT OR IGNORE INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)'
                  ).bind(chairId, user.hospitalId, sortOrder, floor.name || '', space.name || '', sortOrder).run()
                  sortOrder++
                }
              }
            }
          }
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
  const user = c.get('user')
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 완료할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=1, onboarding_step=6 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ─── Skip onboarding ─── */
onboarding.post('/skip', async (c) => {
  const user = c.get('user')
  if (user.role !== 'admin') return c.json({ error: '관리자만 온보딩을 스킵할 수 있습니다' }, 403)
  
  await c.env.DB.prepare(
    'UPDATE hospitals SET onboarding_completed=1 WHERE id=?'
  ).bind(user.hospitalId).run()
  
  return c.json({ success: true })
})

/* ─── Reset onboarding (re-run) ─── */
onboarding.post('/reset', async (c) => {
  const user = c.get('user')
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
  const user = c.get('user')
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
      await c.env.DB.prepare(
        'INSERT INTO chairs (id, hospital_id, chair_number, floor, room_name, sort_order) VALUES (?,?,?,?,?,?)'
      ).bind(crypto.randomUUID(), hid, ch.num, ch.floor, ch.room, ch.num).run()
    }
  }

  /* ─── 2. 수가 카테고리 + 항목 ─── */
  const feeCat: any = await c.env.DB.prepare('SELECT id FROM fee_categories WHERE hospital_id=? LIMIT 1').bind(hid).first()
  let catId = feeCat?.id
  if (!catId) {
    catId = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO fee_categories (id, hospital_id, name, sort_order) VALUES (?,?,?,?)').bind(catId, hid, '주요 진료', 1).run()
    const items = [
      { name: '임플란트 (1개)', price: 1300000, unit: '개', dur: 60 },
      { name: '지르코니아 크라운', price: 550000, unit: '개', dur: 40 },
      { name: '스케일링', price: 40000, unit: '회', dur: 30 },
      { name: '치아 미백', price: 350000, unit: '회', dur: 45 },
      { name: '레진 충전', price: 90000, unit: '개', dur: 20 },
      { name: '신경치료', price: 280000, unit: '근관', dur: 50 },
    ]
    for (const it of items) {
      await c.env.DB.prepare(
        'INSERT INTO fee_items (id, hospital_id, category_id, name, base_price, unit, duration_min, is_active) VALUES (?,?,?,?,?,?,?,?)'
      ).bind(crypto.randomUUID(), hid, catId, it.name, it.price, it.unit, it.dur, 1).run()
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
    patients.push({ pid, name, birthDate, gender, phone, regDate, source, region, specialty, patientType })
    await c.env.DB.prepare(
      `INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, first_visit_date, last_visit_date, visit_count, treatment_area, address)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(pid, hid, chartNum, name, phone, birthDate, gender, patientType, source, regDate, regDate, visitCount, specialty, `서울특별시 ${region}`).run().catch(() => {})
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
    await c.env.DB.prepare(
      `INSERT INTO patient_funnel (id, hospital_id, patient_name, phone, source, current_stage, treatment_type, estimated_amount, agreed_amount, paid_amount)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, p.name, p.phone, p.source, stage, treatmentTypes[Math.floor(Math.random()*treatmentTypes.length)], estimated, agreed, paid).run().catch(() => {})
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
    await c.env.DB.prepare(
      `INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, planned_amount, agreed_amount, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, d, `DEMO-${String(1000 + i).padStart(4, '0')}`, p.name, '데모 원장', '데모 실장', estimated, agreed, p.patientType, treatment, confirmed, confirmed ? 1 : 0, Math.random() > 0.6 ? 1 : 0).run().catch(() => {})
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
    await c.env.DB.prepare(
      `INSERT INTO call_records (id, hospital_id, call_type, call_date, patient_name, phone, patient_type, staff_name, recognition_path, call_purpose, reservation_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, callType, d, p.name, p.phone, p.patientType, '데모 데스크', recogPaths[Math.floor(Math.random()*recogPaths.length)], purpose, reserved).run().catch(() => {})
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
    await c.env.DB.prepare(
      `INSERT INTO complaints (id, hospital_id, complaint_date, patient_name, part, category, description, responder, resolver, resolution, status, severity)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, d, p.name, complaintParts[i], complaintCats[i], complaintDesc[i], '데모 실장', i < 3 ? '데모 원장' : null, i < 3 ? '사과 및 재예약 조치' : null, i < 3 ? 'resolved' : 'in_progress', Math.random() > 0.6 ? 'high' : 'medium').run().catch(() => {})
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
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO daily_records (id, hospital_id, record_date, day_of_week, revenue_non_insurance, revenue_insurance, existing_patients, new_patients, region_core_new, referral_new, online_new)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, d, dayOfWeekKo[dowIdx], nonIns, ins, existingP, newP, Math.floor(newP * 0.4), Math.floor(newP * 0.3), Math.floor(newP * 0.3)).run().catch(() => {})
  }

  /* ─── 9. 이번달 KPI 목표 ─── */
  const thisMonth = today.toISOString().slice(0, 7)
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(crypto.randomUUID(), hid, thisMonth, 180000000, 30, 5, 3, 200, 22, 4).run().catch(() => {})

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
    await c.env.DB.prepare(
      `INSERT INTO review_management (id, hospital_id, platform, reviewer_name, rating, review_text, sentiment, review_date, response_status)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hid, reviewPlatforms[i % 3], `데모환자${i+1}`, rv.s === 'positive' ? 5 : rv.s === 'neutral' ? 3 : 2, rv.t, rv.s, d, i > 8 ? 'pending' : 'responded').run().catch(() => {})
  }

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
    }
  })
})

/* ─── 샘플 데이터 삭제 (원래 상태로 복구) ─── */
onboarding.post('/clear-sample', async (c) => {
  const user = c.get('user')
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
