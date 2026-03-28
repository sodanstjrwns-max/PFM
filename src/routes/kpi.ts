import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole } from '../lib/middleware'
const kpi = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── KPI System: 월간 목표 + 일간 기록 ─── */

// KPI 목표 조회
kpi.get('/targets', async (c) => {
  const user = c.get('user')!
  const yearMonth = c.req.query('month') || new Date().toISOString().slice(0,7)
  const row = await c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, yearMonth).first()
  return c.json(row || null)
})

// KPI 목표 목록 (최근 12개월)
kpi.get('/targets/list', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? ORDER BY year_month DESC LIMIT 12').bind(user.hospitalId).all()
  return c.json(rows?.results || [])
})

// KPI 목표 설정/수정
kpi.post('/targets', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const { year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes } = body
  if (!year_month) return c.json({ error: '월을 선택하세요' }, 400)
  
  const existing = await c.env.DB.prepare('SELECT id FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, year_month).first()
  
  if (existing) {
    await c.env.DB.prepare(`UPDATE kpi_targets SET target_revenue=?, insurance_ratio=?, target_new_patients_weekday=?, target_new_patients_weekend=?, total_hours=?, weekdays=?, weekend_days=?, notes=?, updated_at=? WHERE id=?`)
      .bind(target_revenue||0, insurance_ratio||13, target_new_patients_weekday||25, target_new_patients_weekend||20, total_hours||260, weekdays||21, weekend_days||10, notes||'', new Date().toISOString(), existing.id).run()
    return c.json({ success: true, id: existing.id, updated: true })
  } else {
    const id = 'kpi-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare(`INSERT INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, user.hospitalId, year_month, target_revenue||0, insurance_ratio||13, target_new_patients_weekday||25, target_new_patients_weekend||20, total_hours||260, weekdays||21, weekend_days||10, notes||'', user.id).run()
    return c.json({ success: true, id, created: true })
  }
})

// 일간 기록 조회 (날짜 or 기간)
kpi.get('/daily', async (c) => {
  const user = c.get('user')!
  const date = c.req.query('date')
  const from = c.req.query('from')
  const to = c.req.query('to')
  
  if (date) {
    const row = await c.env.DB.prepare('SELECT * FROM daily_records WHERE hospital_id=? AND record_date=?').bind(user.hospitalId, date).first()
    return c.json(row || null)
  }
  if (from && to) {
    const rows = await c.env.DB.prepare('SELECT * FROM daily_records WHERE hospital_id=? AND record_date>=? AND record_date<=? ORDER BY record_date')
      .bind(user.hospitalId, from, to).all()
    return c.json(rows?.results || [])
  }
  // 기본: 이번 달
  const thisMonth = new Date().toISOString().slice(0,7)
  const rows = await c.env.DB.prepare("SELECT * FROM daily_records WHERE hospital_id=? AND record_date LIKE ? ORDER BY record_date")
    .bind(user.hospitalId, thisMonth + '%').all()
  return c.json(rows?.results || [])
})

// 일간 기록 저장/수정
kpi.post('/daily', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const { record_date } = body
  if (!record_date) return c.json({ error: '날짜를 입력하세요' }, 400)
  
  const dow = ['sun','mon','tue','wed','thu','fri','sat'][new Date(record_date + 'T00:00:00').getDay()]
  const existing: any = await c.env.DB.prepare('SELECT id FROM daily_records WHERE hospital_id=? AND record_date=?').bind(user.hospitalId, record_date).first()
  
  const fields = [
    'revenue_non_insurance','revenue_insurance','existing_patients','new_patients',
    'core_treatment_1_new','core_treatment_2_new','core_treatment_3_new',
    'region_core_new','region_expand_new','region_adjacent_new','region_other_new',
    'referral_new','online_new','etc_new',
    'core_treatment_1_count','core_treatment_2_count','core_treatment_3_count',
    'total_consultations','core_treat_1_consult','core_treat_1_agree',
    'core_treat_2_consult','core_treat_2_agree','core_treat_3_consult','core_treat_3_agree',
    'referral_thanks','inbound_calls','outbound_calls','cancel_count','complaint_count',
    'avg_wait_time','naver_reviews','notes'
  ]
  
  if (existing) {
    const sets = fields.map(f => `${f}=?`).join(',')
    const vals = fields.map(f => f === 'notes' ? (body[f] || '') : (body[f] ?? 0))
    await c.env.DB.prepare(`UPDATE daily_records SET ${sets}, day_of_week=?, updated_at=? WHERE id=?`)
      .bind(...vals, dow, new Date().toISOString(), existing.id).run()
    return c.json({ success: true, id: existing.id, updated: true })
  } else {
    const id = 'dr-' + crypto.randomUUID().slice(0,8)
    const cols = ['id','hospital_id','record_date','day_of_week', ...fields, 'recorded_by'].join(',')
    const placeholders = Array(fields.length + 5).fill('?').join(',')
    const vals = [id, user.hospitalId, record_date, dow, ...fields.map(f => f === 'notes' ? (body[f] || '') : (body[f] ?? 0)), user.id]
    await c.env.DB.prepare(`INSERT INTO daily_records (${cols}) VALUES (${placeholders})`).bind(...vals).run()
    return c.json({ success: true, id, created: true })
  }
})

// ── KPI Bulk Import (월간 목표 + 일간 기록 일괄 입력) ──
kpi.post('/bulk-import', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const { targets, daily_records: records } = body
  let targetCount = 0, dailyCount = 0

  // 1) 월간 목표 일괄 입력
  if (Array.isArray(targets)) {
    for (const t of targets) {
      if (!t.year_month) continue
      const existing: any = await c.env.DB.prepare(
        'SELECT id FROM kpi_targets WHERE hospital_id=? AND year_month=?'
      ).bind(user.hospitalId, t.year_month).first()
      if (existing) {
        await c.env.DB.prepare(`UPDATE kpi_targets SET target_revenue=?, insurance_ratio=?, target_new_patients_weekday=?, target_new_patients_weekend=?, total_hours=?, weekdays=?, weekend_days=?, notes=?, updated_at=? WHERE id=?`)
          .bind(t.target_revenue||0, t.insurance_ratio||13, t.target_new_patients_weekday||25, t.target_new_patients_weekend||20, t.total_hours||260, t.weekdays||21, t.weekend_days||10, t.notes||'', new Date().toISOString(), existing.id).run()
      } else {
        const id = 'kpi-' + crypto.randomUUID().slice(0,8)
        await c.env.DB.prepare(`INSERT INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(id, user.hospitalId, t.year_month, t.target_revenue||0, t.insurance_ratio||13, t.target_new_patients_weekday||25, t.target_new_patients_weekend||20, t.total_hours||260, t.weekdays||21, t.weekend_days||10, t.notes||'', user.id).run()
      }
      targetCount++
    }
  }

  // 2) 일간 기록 일괄 입력
  const dailyFields = [
    'revenue_non_insurance','revenue_insurance','existing_patients','new_patients',
    'core_treatment_1_new','core_treatment_2_new','core_treatment_3_new',
    'region_core_new','region_expand_new','region_adjacent_new','region_other_new',
    'referral_new','online_new','etc_new',
    'core_treatment_1_count','core_treatment_2_count','core_treatment_3_count',
    'total_consultations','core_treat_1_consult','core_treat_1_agree',
    'core_treat_2_consult','core_treat_2_agree','core_treat_3_consult','core_treat_3_agree',
    'referral_thanks','inbound_calls','outbound_calls','cancel_count','complaint_count',
    'avg_wait_time','naver_reviews','notes'
  ]
  if (Array.isArray(records)) {
    for (const r of records) {
      if (!r.record_date) continue
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][new Date(r.record_date + 'T00:00:00').getDay()]
      const existing: any = await c.env.DB.prepare('SELECT id FROM daily_records WHERE hospital_id=? AND record_date=?').bind(user.hospitalId, r.record_date).first()
      if (existing) {
        const sets = dailyFields.map(f => `${f}=?`).join(',')
        const vals = dailyFields.map(f => f === 'notes' ? (r[f] || '') : (r[f] ?? 0))
        await c.env.DB.prepare(`UPDATE daily_records SET ${sets}, day_of_week=?, updated_at=? WHERE id=?`)
          .bind(...vals, dow, new Date().toISOString(), existing.id).run()
      } else {
        const id = 'dr-' + crypto.randomUUID().slice(0,8)
        const cols = ['id','hospital_id','record_date','day_of_week', ...dailyFields, 'recorded_by'].join(',')
        const placeholders = Array(dailyFields.length + 5).fill('?').join(',')
        const vals = [id, user.hospitalId, r.record_date, dow, ...dailyFields.map(f => f === 'notes' ? (r[f] || '') : (r[f] ?? 0)), user.id]
        await c.env.DB.prepare(`INSERT INTO daily_records (${cols}) VALUES (${placeholders})`).bind(...vals).run()
      }
      dailyCount++
    }
  }

  return c.json({ success: true, targets_imported: targetCount, daily_records_imported: dailyCount })
})

// 주간 집계
kpi.get('/weekly', async (c) => {
  const user = c.get('user')!
  const from = c.req.query('from')
  const to = c.req.query('to')
  if (!from || !to) return c.json({ error: 'from, to 필수' }, 400)
  
  const rows = await c.env.DB.prepare(`SELECT 
    COUNT(*) as days,
    SUM(revenue_non_insurance) as revenue_non_insurance,
    SUM(revenue_insurance) as revenue_insurance,
    SUM(revenue_non_insurance + revenue_insurance) as total_revenue,
    SUM(existing_patients) as existing_patients,
    SUM(new_patients) as new_patients,
    SUM(existing_patients + new_patients) as total_patients,
    SUM(core_treatment_1_new) as core_treatment_1_new,
    SUM(core_treatment_2_new) as core_treatment_2_new,
    SUM(core_treatment_3_new) as core_treatment_3_new,
    SUM(region_core_new) as region_core_new,
    SUM(region_expand_new) as region_expand_new,
    SUM(region_adjacent_new) as region_adjacent_new,
    SUM(region_other_new) as region_other_new,
    SUM(referral_new) as referral_new,
    SUM(online_new) as online_new,
    SUM(etc_new) as etc_new,
    SUM(core_treatment_1_count) as core_treatment_1_count,
    SUM(core_treatment_2_count) as core_treatment_2_count,
    SUM(core_treatment_3_count) as core_treatment_3_count,
    SUM(total_consultations) as total_consultations,
    SUM(core_treat_1_consult) as core_treat_1_consult,
    SUM(core_treat_1_agree) as core_treat_1_agree,
    SUM(core_treat_2_consult) as core_treat_2_consult,
    SUM(core_treat_2_agree) as core_treat_2_agree,
    SUM(core_treat_3_consult) as core_treat_3_consult,
    SUM(core_treat_3_agree) as core_treat_3_agree,
    SUM(referral_thanks) as referral_thanks,
    SUM(inbound_calls) as inbound_calls,
    SUM(outbound_calls) as outbound_calls,
    SUM(cancel_count) as cancel_count,
    SUM(complaint_count) as complaint_count,
    ROUND(AVG(avg_wait_time),1) as avg_wait_time,
    SUM(naver_reviews) as naver_reviews
  FROM daily_records WHERE hospital_id=? AND record_date>=? AND record_date<=?`)
    .bind(user.hospitalId, from, to).first()
  return c.json(rows || {})
})

// KPI 통계 (기간별 + 요일별 + 월별 트렌드)
kpi.get('/stats', async (c) => {
  const user = c.get('user')!
  const period = c.req.query('period') || 'monthly' // daily, weekly, monthly, yearly
  const from = c.req.query('from') || ''
  const to = c.req.query('to') || ''

  let dateFilter = ''
  const params: any[] = [user.hospitalId]
  if (from && to) { dateFilter = ' AND record_date >= ? AND record_date <= ?'; params.push(from, to) }
  else if (from) { dateFilter = ' AND record_date >= ?'; params.push(from) }
  else if (to) { dateFilter = ' AND record_date <= ?'; params.push(to) }

  const baseWhere = 'hospital_id=?' + dateFilter
  const sumFields = `
    COUNT(*) as days,
    SUM(revenue_non_insurance) as revenue_ni,
    SUM(revenue_insurance) as revenue_i,
    SUM(revenue_non_insurance + revenue_insurance) as total_revenue,
    SUM(existing_patients) as existing_patients,
    SUM(new_patients) as new_patients,
    SUM(existing_patients + new_patients) as total_patients,
    SUM(core_treatment_1_new) as core_t1_new,
    SUM(core_treatment_2_new) as core_t2_new,
    SUM(core_treatment_3_new) as core_t3_new,
    SUM(core_treatment_1_count) as core_t1_cnt,
    SUM(core_treatment_2_count) as core_t2_cnt,
    SUM(core_treatment_3_count) as core_t3_cnt,
    SUM(region_core_new) as region_core,
    SUM(region_expand_new) as region_expand,
    SUM(region_adjacent_new) as region_adjacent,
    SUM(region_other_new) as region_other,
    SUM(referral_new) as referral_new,
    SUM(online_new) as online_new,
    SUM(etc_new) as etc_new,
    SUM(total_consultations) as total_consult,
    SUM(core_treat_1_consult) as t1_consult,
    SUM(core_treat_1_agree) as t1_agree,
    SUM(core_treat_2_consult) as t2_consult,
    SUM(core_treat_2_agree) as t2_agree,
    SUM(core_treat_3_consult) as t3_consult,
    SUM(core_treat_3_agree) as t3_agree,
    SUM(referral_thanks) as referral_thanks,
    SUM(inbound_calls) as inbound_calls,
    SUM(outbound_calls) as outbound_calls,
    SUM(cancel_count) as cancel_count,
    SUM(complaint_count) as complaint_count,
    ROUND(AVG(CASE WHEN avg_wait_time>0 THEN avg_wait_time END),1) as avg_wait_time,
    SUM(naver_reviews) as naver_reviews`

  // 기간별 그룹 키
  let dateGroupExpr = ''
  if (period === 'daily') dateGroupExpr = 'record_date'
  else if (period === 'weekly') dateGroupExpr = "strftime('%Y-W%W', record_date)"
  else if (period === 'monthly') dateGroupExpr = "substr(record_date, 1, 7)"
  else dateGroupExpr = "substr(record_date, 1, 4)"

  const queries = [
    // 0) 전체 합계
    c.env.DB.prepare(`SELECT ${sumFields} FROM daily_records WHERE ${baseWhere}`).bind(...params).first(),
    // 1) 요일별 평균
    c.env.DB.prepare(`SELECT day_of_week,
      COUNT(*) as days,
      ROUND(AVG(revenue_non_insurance + revenue_insurance)) as avg_revenue,
      ROUND(AVG(new_patients),1) as avg_new,
      ROUND(AVG(existing_patients),1) as avg_existing,
      ROUND(AVG(existing_patients + new_patients),1) as avg_total_patients,
      ROUND(AVG(inbound_calls),1) as avg_inbound,
      ROUND(AVG(outbound_calls),1) as avg_outbound,
      ROUND(AVG(cancel_count),1) as avg_cancel,
      ROUND(AVG(complaint_count),1) as avg_complaint,
      ROUND(AVG(CASE WHEN avg_wait_time>0 THEN avg_wait_time END),1) as avg_wait,
      ROUND(AVG(total_consultations),1) as avg_consult,
      ROUND(AVG(naver_reviews),1) as avg_reviews
    FROM daily_records WHERE ${baseWhere} AND day_of_week != '' GROUP BY day_of_week`).bind(...params).all(),
    // 2) 기간별 트렌드
    c.env.DB.prepare(`SELECT ${dateGroupExpr} as period_key, ${sumFields}
    FROM daily_records WHERE ${baseWhere} GROUP BY period_key ORDER BY period_key`).bind(...params).all(),
    // 3) 월별 목표 (최근 12개월)
    c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? ORDER BY year_month DESC LIMIT 24').bind(user.hospitalId).all(),
  ]

  const results = await Promise.all(queries)
  return c.json({
    summary: results[0] || {},
    byDayOfWeek: results[1].results,
    trend: results[2].results,
    targets: results[3].results,
    period, from, to,
  })
})

// KPI 대시보드 통계 (목표 vs 실적)
kpi.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const yearMonth = c.req.query('month') || new Date().toISOString().slice(0,7)
  
  const [target, dailyRows, hospitalRow] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, yearMonth).first(),
    c.env.DB.prepare("SELECT * FROM daily_records WHERE hospital_id=? AND record_date LIKE ? ORDER BY record_date")
      .bind(user.hospitalId, yearMonth + '%').all(),
    c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first(),
  ])
  
  // 병원 진료시간 설정 파싱
  let hospitalSettings: any = {}
  try { hospitalSettings = JSON.parse((hospitalRow as any)?.settings || '{}') } catch(e) {}
  const oh = hospitalSettings.operating_hours || {}
  
  // 요일별 실 진료시간(시간 단위) 계산 헬퍼
  function calcDayHours(dayConfig: any, lunchConfig: any): number {
    if (!dayConfig || !dayConfig.enabled || !dayConfig.start || !dayConfig.end) return 0
    const [sh, sm] = dayConfig.start.split(':').map(Number)
    const [eh, em] = dayConfig.end.split(':').map(Number)
    let hours = (eh + em/60) - (sh + sm/60)
    // 점심시간 차감
    if (lunchConfig && lunchConfig.enabled && lunchConfig.start && lunchConfig.end) {
      const [lsh, lsm] = lunchConfig.start.split(':').map(Number)
      const [leh, lem] = lunchConfig.end.split(':').map(Number)
      const lunchH = (leh + lem/60) - (lsh + lsm/60)
      // 점심시간이 해당 진료시간 내에 있을 때만 차감
      if ((lsh + lsm/60) >= (sh + sm/60) && (leh + lem/60) <= (eh + em/60)) {
        hours -= lunchH
      }
    }
    return Math.max(0, hours)
  }
  
  const lunch = oh.lunch || null
  // 요일 → 진료시간 매핑 (mon~sun)
  const holidays = oh.regular_holidays || []
  const dayHoursMap: Record<string, number> = {
    mon: holidays.includes('mon') ? 0 : calcDayHours(oh.weekday, lunch),
    tue: holidays.includes('tue') ? 0 : calcDayHours(oh.weekday, lunch),
    wed: holidays.includes('wed') ? 0 : calcDayHours(oh.weekday, lunch),
    thu: holidays.includes('thu') ? 0 : calcDayHours(oh.weekday, lunch),
    fri: holidays.includes('fri') ? 0 : calcDayHours(oh.weekday, lunch),
    sat: holidays.includes('sat') ? 0 : calcDayHours(oh.saturday, lunch),
    sun: holidays.includes('sun') ? 0 : calcDayHours(oh.sunday, lunch),
  }
  
  // 해당 월의 요일별 일수 계산
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const dowKeys = ['sun','mon','tue','wed','thu','fri','sat']
  const dowDayCount: Record<string, number> = { sun:0, mon:0, tue:0, wed:0, thu:0, fri:0, sat:0 }
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = dowKeys[new Date(year, month-1, d).getDay()]
    dowDayCount[dow]++
  }
  
  // 월 전체 진료시간 합산 + 요일별 1일 진료시간
  let totalMonthHours = 0
  for (const dow of Object.keys(dowDayCount)) {
    totalMonthHours += dayHoursMap[dow] * dowDayCount[dow]
  }
  
  // 진료시간 비례 일별 목표 계산 함수
  function getDayTarget(dayOfWeek: string): number {
    const tgt: any = target || {}
    if (!tgt.target_revenue || totalMonthHours <= 0) return 0
    const dayH = dayHoursMap[dayOfWeek] || 0
    if (dayH <= 0) return 0
    return tgt.target_revenue * (dayH / totalMonthHours)
  }
  
  const records: any[] = dailyRows?.results || []
  
  // 일별 누적 계산
  let cumRevenue = 0, cumNonIns = 0, cumIns = 0, cumNew = 0, cumDiff = 0
  const daily: any[] = records.map((r: any) => {
    const dayRevenue = (r.revenue_non_insurance||0) + (r.revenue_insurance||0)
    const dayTarget = getDayTarget(r.day_of_week)
    
    const diff = dayRevenue - dayTarget
    cumRevenue += dayRevenue
    cumNonIns += (r.revenue_non_insurance||0)
    cumIns += (r.revenue_insurance||0)
    cumNew += (r.new_patients||0)
    cumDiff += diff
    
    return {
      ...r,
      total_revenue: dayRevenue,
      day_target: Math.round(dayTarget),
      day_hours: dayHoursMap[r.day_of_week] || 0,
      diff: Math.round(diff),
      cum_revenue: cumRevenue,
      cum_diff: Math.round(cumDiff),
    }
  })
  
  // 요약
  const achieveRate = (target as any)?.target_revenue > 0 ? Math.round(cumRevenue / (target as any).target_revenue * 100 * 10) / 10 : 0
  
  // 요일별 정보 (프론트에서 활용)
  const dowInfo = Object.entries(dayHoursMap).map(([dow, hours]) => ({
    dow, hours, days: dowDayCount[dow],
    dayTarget: Math.round(getDayTarget(dow)),
  }))
  
  return c.json({
    target: target || null,
    daily,
    dowInfo,
    totalMonthHours: Math.round(totalMonthHours * 10) / 10,
    summary: {
      cum_revenue: cumRevenue,
      cum_non_insurance: cumNonIns,
      cum_insurance: cumIns,
      cum_new_patients: cumNew,
      cum_diff: Math.round(cumDiff),
      achieve_rate: achieveRate,
      days_recorded: records.length,
    }
  })
})

/* ═══ 스태프 프리셋 (상담의/상담사 목록) ═══ */

// 프리셋 조회
kpi.get('/staff-presets', async (c) => {
  const user = c.get('user')!
  const type = c.req.query('type') // doctor / counselor
  let sql = 'SELECT * FROM staff_presets WHERE hospital_id=? AND is_active=1'
  const params: any[] = [user.hospitalId]
  if (type) { sql += ' AND preset_type=?'; params.push(type) }
  sql += ' ORDER BY sort_order, name'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

// 프리셋 추가
kpi.post('/staff-presets', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const { preset_type, name } = await c.req.json()
  if (!preset_type || !name) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'sp-' + crypto.randomUUID().slice(0,8)
  const maxSort: any = await c.env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) as mx FROM staff_presets WHERE hospital_id=? AND preset_type=?').bind(user.hospitalId, preset_type).first()
  await c.env.DB.prepare('INSERT INTO staff_presets (id, hospital_id, preset_type, name, sort_order) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, preset_type, name, (maxSort?.mx||0)+1).run()
  return c.json({ id, name })
})

// 프리셋 삭제 (비활성화)
kpi.delete('/staff-presets/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('UPDATE staff_presets SET is_active=0 WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})


export default kpi
