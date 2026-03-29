import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const kpi = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── KPI System: 월간 목표 + 일간 기록 ─── */

kpi.get('/targets', async (c) => {
  const user = c.get('user')!
  const yearMonth = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const row = await c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, yearMonth).first()
  return c.json(row || null)
})

kpi.get('/targets/list', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, updated_at FROM kpi_targets WHERE hospital_id=? ORDER BY year_month DESC LIMIT 12').bind(user.hospitalId).all()
  return c.json(rows?.results || [])
})

kpi.post('/targets', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    year_month: { type: 'string', max: 10 },
    target_revenue: { type: 'number', min: 0, max: 99999999999, default: 0 },
    insurance_ratio: { type: 'number', min: 0, max: 100, default: 13 },
    target_new_patients_weekday: { type: 'number', min: 0, max: 9999, default: 25 },
    target_new_patients_weekend: { type: 'number', min: 0, max: 9999, default: 20 },
    total_hours: { type: 'number', min: 0, max: 9999, default: 260 },
    weekdays: { type: 'number', min: 0, max: 31, default: 21 },
    weekend_days: { type: 'number', min: 0, max: 31, default: 10 },
    notes: { type: 'string', max: 2000 },
  })
  if (!b.year_month) return c.json({ error: '월을 선택하세요' }, 400)
  const existing = await c.env.DB.prepare('SELECT id FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, b.year_month).first() as any
  if (existing) {
    await c.env.DB.prepare(`UPDATE kpi_targets SET target_revenue=?, insurance_ratio=?, target_new_patients_weekday=?, target_new_patients_weekend=?, total_hours=?, weekdays=?, weekend_days=?, notes=?, updated_at=? WHERE id=?`)
      .bind(b.target_revenue||0, b.insurance_ratio||13, b.target_new_patients_weekday||25, b.target_new_patients_weekend||20, b.total_hours||260, b.weekdays||21, b.weekend_days||10, b.notes||'', new Date().toISOString(), existing.id).run()
    return c.json({ success: true, id: existing.id, updated: true })
  } else {
    const id = 'kpi-' + crypto.randomUUID().slice(0,8)
    await c.env.DB.prepare(`INSERT INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, user.hospitalId, b.year_month, b.target_revenue||0, b.insurance_ratio||13, b.target_new_patients_weekday||25, b.target_new_patients_weekend||20, b.total_hours||260, b.weekdays||21, b.weekend_days||10, b.notes||'', user.id).run()
    return c.json({ success: true, id, created: true })
  }
})

kpi.get('/daily', async (c) => {
  const user = c.get('user')!
  const date = sanitizeString(c.req.query('date') || '', 10)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  if (date) {
    const row = await c.env.DB.prepare('SELECT * FROM daily_records WHERE hospital_id=? AND record_date=?').bind(user.hospitalId, date).first()
    return c.json(row || null)
  }
  if (from && to) {
    const rows = await c.env.DB.prepare('SELECT * FROM daily_records WHERE hospital_id=? AND record_date>=? AND record_date<=? ORDER BY record_date').bind(user.hospitalId, from, to).all()
    return c.json(rows?.results || [])
  }
  const thisMonth = new Date().toISOString().slice(0,7)
  const rows = await c.env.DB.prepare("SELECT * FROM daily_records WHERE hospital_id=? AND record_date LIKE ? ORDER BY record_date").bind(user.hospitalId, thisMonth + '%').all()
  return c.json(rows?.results || [])
})

kpi.post('/daily', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const record_date = sanitizeString(raw.record_date || '', 10)
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
  const getVal = (f: string) => f === 'notes' ? sanitizeString(raw[f] || '', 2000) : sanitizeNumber(raw[f], 0, 0, 999999999)
  if (existing) {
    const sets = fields.map(f => `${f}=?`).join(',')
    const vals = fields.map(getVal)
    await c.env.DB.prepare(`UPDATE daily_records SET ${sets}, day_of_week=?, updated_at=? WHERE id=?`)
      .bind(...vals, dow, new Date().toISOString(), existing.id).run()
    return c.json({ success: true, id: existing.id, updated: true })
  } else {
    const id = 'dr-' + crypto.randomUUID().slice(0,8)
    const cols = ['id','hospital_id','record_date','day_of_week', ...fields, 'recorded_by'].join(',')
    const placeholders = Array(fields.length + 5).fill('?').join(',')
    const vals = [id, user.hospitalId, record_date, dow, ...fields.map(getVal), user.id]
    await c.env.DB.prepare(`INSERT INTO daily_records (${cols}) VALUES (${placeholders})`).bind(...vals).run()
    return c.json({ success: true, id, created: true })
  }
})

kpi.post('/bulk-import', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const { targets, daily_records: records } = body
  if (targets && !Array.isArray(targets)) return c.json({ error: 'targets는 배열이어야 합니다' }, 400)
  if (records && !Array.isArray(records)) return c.json({ error: 'daily_records는 배열이어야 합니다' }, 400)
  if ((targets?.length || 0) > 100) return c.json({ error: '한 번에 100개월까지 가능합니다' }, 400)
  if ((records?.length || 0) > 500) return c.json({ error: '한 번에 500일까지 가능합니다' }, 400)
  let targetCount = 0, dailyCount = 0

  if (Array.isArray(targets)) {
    for (const t of targets) {
      const ym = sanitizeString(t.year_month || '', 10)
      if (!ym) continue
      const existing: any = await c.env.DB.prepare('SELECT id FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, ym).first()
      if (existing) {
        await c.env.DB.prepare(`UPDATE kpi_targets SET target_revenue=?, insurance_ratio=?, target_new_patients_weekday=?, target_new_patients_weekend=?, total_hours=?, weekdays=?, weekend_days=?, notes=?, updated_at=? WHERE id=?`)
          .bind(sanitizeNumber(t.target_revenue,0,0,99999999999), sanitizeNumber(t.insurance_ratio,13,0,100), sanitizeNumber(t.target_new_patients_weekday,25,0,9999), sanitizeNumber(t.target_new_patients_weekend,20,0,9999), sanitizeNumber(t.total_hours,260,0,9999), sanitizeNumber(t.weekdays,21,0,31), sanitizeNumber(t.weekend_days,10,0,31), sanitizeString(t.notes||'',2000), new Date().toISOString(), existing.id).run()
      } else {
        const id = 'kpi-' + crypto.randomUUID().slice(0,8)
        await c.env.DB.prepare(`INSERT INTO kpi_targets (id, hospital_id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(id, user.hospitalId, ym, sanitizeNumber(t.target_revenue,0,0,99999999999), sanitizeNumber(t.insurance_ratio,13,0,100), sanitizeNumber(t.target_new_patients_weekday,25,0,9999), sanitizeNumber(t.target_new_patients_weekend,20,0,9999), sanitizeNumber(t.total_hours,260,0,9999), sanitizeNumber(t.weekdays,21,0,31), sanitizeNumber(t.weekend_days,10,0,31), sanitizeString(t.notes||'',2000), user.id).run()
      }
      targetCount++
    }
  }

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
      const rd = sanitizeString(r.record_date || '', 10)
      if (!rd) continue
      const dow = ['sun','mon','tue','wed','thu','fri','sat'][new Date(rd + 'T00:00:00').getDay()]
      const existing: any = await c.env.DB.prepare('SELECT id FROM daily_records WHERE hospital_id=? AND record_date=?').bind(user.hospitalId, rd).first()
      const getVal = (f: string) => f === 'notes' ? sanitizeString(r[f]||'',2000) : sanitizeNumber(r[f],0,0,999999999)
      if (existing) {
        const sets = dailyFields.map(f => `${f}=?`).join(',')
        const vals = dailyFields.map(getVal)
        await c.env.DB.prepare(`UPDATE daily_records SET ${sets}, day_of_week=?, updated_at=? WHERE id=?`)
          .bind(...vals, dow, new Date().toISOString(), existing.id).run()
      } else {
        const id = 'dr-' + crypto.randomUUID().slice(0,8)
        const cols = ['id','hospital_id','record_date','day_of_week', ...dailyFields, 'recorded_by'].join(',')
        const placeholders = Array(dailyFields.length + 5).fill('?').join(',')
        const vals = [id, user.hospitalId, rd, dow, ...dailyFields.map(getVal), user.id]
        await c.env.DB.prepare(`INSERT INTO daily_records (${cols}) VALUES (${placeholders})`).bind(...vals).run()
      }
      dailyCount++
    }
  }

  return c.json({ success: true, targets_imported: targetCount, daily_records_imported: dailyCount })
})

kpi.get('/weekly', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
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

kpi.get('/stats', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'monthly', 10)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let dateFilter = ''
  const params: any[] = [user.hospitalId]
  if (from && to) { dateFilter = ' AND record_date >= ? AND record_date <= ?'; params.push(from, to) }
  else if (from) { dateFilter = ' AND record_date >= ?'; params.push(from) }
  else if (to) { dateFilter = ' AND record_date <= ?'; params.push(to) }
  const baseWhere = 'hospital_id=?' + dateFilter
  const sumFields = `
    COUNT(*) as days,
    SUM(revenue_non_insurance) as revenue_ni, SUM(revenue_insurance) as revenue_i,
    SUM(revenue_non_insurance + revenue_insurance) as total_revenue,
    SUM(existing_patients) as existing_patients, SUM(new_patients) as new_patients,
    SUM(existing_patients + new_patients) as total_patients,
    SUM(core_treatment_1_new) as core_t1_new, SUM(core_treatment_2_new) as core_t2_new, SUM(core_treatment_3_new) as core_t3_new,
    SUM(core_treatment_1_count) as core_t1_cnt, SUM(core_treatment_2_count) as core_t2_cnt, SUM(core_treatment_3_count) as core_t3_cnt,
    SUM(region_core_new) as region_core, SUM(region_expand_new) as region_expand, SUM(region_adjacent_new) as region_adjacent, SUM(region_other_new) as region_other,
    SUM(referral_new) as referral_new, SUM(online_new) as online_new, SUM(etc_new) as etc_new,
    SUM(total_consultations) as total_consult,
    SUM(core_treat_1_consult) as t1_consult, SUM(core_treat_1_agree) as t1_agree,
    SUM(core_treat_2_consult) as t2_consult, SUM(core_treat_2_agree) as t2_agree,
    SUM(core_treat_3_consult) as t3_consult, SUM(core_treat_3_agree) as t3_agree,
    SUM(referral_thanks) as referral_thanks, SUM(inbound_calls) as inbound_calls, SUM(outbound_calls) as outbound_calls,
    SUM(cancel_count) as cancel_count, SUM(complaint_count) as complaint_count,
    ROUND(AVG(CASE WHEN avg_wait_time>0 THEN avg_wait_time END),1) as avg_wait_time, SUM(naver_reviews) as naver_reviews`
  let dateGroupExpr = ''
  if (period === 'daily') dateGroupExpr = 'record_date'
  else if (period === 'weekly') dateGroupExpr = "strftime('%Y-W%W', record_date)"
  else if (period === 'monthly') dateGroupExpr = "substr(record_date, 1, 7)"
  else dateGroupExpr = "substr(record_date, 1, 4)"
  const queries = [
    c.env.DB.prepare(`SELECT ${sumFields} FROM daily_records WHERE ${baseWhere}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT day_of_week,
      COUNT(*) as days, ROUND(AVG(revenue_non_insurance + revenue_insurance)) as avg_revenue,
      ROUND(AVG(new_patients),1) as avg_new, ROUND(AVG(existing_patients),1) as avg_existing,
      ROUND(AVG(existing_patients + new_patients),1) as avg_total_patients,
      ROUND(AVG(inbound_calls),1) as avg_inbound, ROUND(AVG(outbound_calls),1) as avg_outbound,
      ROUND(AVG(cancel_count),1) as avg_cancel, ROUND(AVG(complaint_count),1) as avg_complaint,
      ROUND(AVG(CASE WHEN avg_wait_time>0 THEN avg_wait_time END),1) as avg_wait,
      ROUND(AVG(total_consultations),1) as avg_consult, ROUND(AVG(naver_reviews),1) as avg_reviews
    FROM daily_records WHERE ${baseWhere} AND day_of_week != '' GROUP BY day_of_week`).bind(...params).all(),
    c.env.DB.prepare(`SELECT ${dateGroupExpr} as period_key, ${sumFields}
    FROM daily_records WHERE ${baseWhere} GROUP BY period_key ORDER BY period_key`).bind(...params).all(),
    c.env.DB.prepare('SELECT id, year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days FROM kpi_targets WHERE hospital_id=? ORDER BY year_month DESC LIMIT 24').bind(user.hospitalId).all(),
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

kpi.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const yearMonth = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const [target, dailyRows, hospitalRow] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(user.hospitalId, yearMonth).first(),
    c.env.DB.prepare("SELECT * FROM daily_records WHERE hospital_id=? AND record_date LIKE ? ORDER BY record_date").bind(user.hospitalId, yearMonth + '%').all(),
    c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first(),
  ])
  let hospitalSettings: any = {}
  try { hospitalSettings = JSON.parse((hospitalRow as any)?.settings || '{}') } catch(e) {}
  const oh = hospitalSettings.operating_hours || {}
  function calcDayHours(dayConfig: any, lunchConfig: any): number {
    if (!dayConfig || !dayConfig.enabled || !dayConfig.start || !dayConfig.end) return 0
    const [sh, sm] = dayConfig.start.split(':').map(Number)
    const [eh, em] = dayConfig.end.split(':').map(Number)
    let hours = (eh + em/60) - (sh + sm/60)
    if (lunchConfig && lunchConfig.enabled && lunchConfig.start && lunchConfig.end) {
      const [lsh, lsm] = lunchConfig.start.split(':').map(Number)
      const [leh, lem] = lunchConfig.end.split(':').map(Number)
      const lunchH = (leh + lem/60) - (lsh + lsm/60)
      if ((lsh + lsm/60) >= (sh + sm/60) && (leh + lem/60) <= (eh + em/60)) hours -= lunchH
    }
    return Math.max(0, hours)
  }
  const lunch = oh.lunch || null
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
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const dowKeys = ['sun','mon','tue','wed','thu','fri','sat']
  const dowDayCount: Record<string, number> = { sun:0, mon:0, tue:0, wed:0, thu:0, fri:0, sat:0 }
  for (let d = 1; d <= daysInMonth; d++) { dowDayCount[dowKeys[new Date(year, month-1, d).getDay()]]++ }
  let totalMonthHours = 0
  for (const dow of Object.keys(dowDayCount)) totalMonthHours += dayHoursMap[dow] * dowDayCount[dow]
  function getDayTarget(dayOfWeek: string): number {
    const tgt: any = target || {}
    if (!tgt.target_revenue || totalMonthHours <= 0) return 0
    return tgt.target_revenue * ((dayHoursMap[dayOfWeek] || 0) / totalMonthHours)
  }
  const records: any[] = dailyRows?.results || []
  let cumRevenue = 0, cumNonIns = 0, cumIns = 0, cumNew = 0, cumDiff = 0
  const daily: any[] = records.map((r: any) => {
    const dayRevenue = (r.revenue_non_insurance||0) + (r.revenue_insurance||0)
    const dayTarget = getDayTarget(r.day_of_week)
    const diff = dayRevenue - dayTarget
    cumRevenue += dayRevenue; cumNonIns += (r.revenue_non_insurance||0); cumIns += (r.revenue_insurance||0)
    cumNew += (r.new_patients||0); cumDiff += diff
    return { ...r, total_revenue: dayRevenue, day_target: Math.round(dayTarget), day_hours: dayHoursMap[r.day_of_week]||0, diff: Math.round(diff), cum_revenue: cumRevenue, cum_diff: Math.round(cumDiff) }
  })
  const achieveRate = (target as any)?.target_revenue > 0 ? Math.round(cumRevenue / (target as any).target_revenue * 1000) / 10 : 0
  const dowInfo = Object.entries(dayHoursMap).map(([dow, hours]) => ({ dow, hours, days: dowDayCount[dow], dayTarget: Math.round(getDayTarget(dow)) }))
  return c.json({
    target: target || null, daily, dowInfo,
    totalMonthHours: Math.round(totalMonthHours * 10) / 10,
    summary: { cum_revenue: cumRevenue, cum_non_insurance: cumNonIns, cum_insurance: cumIns, cum_new_patients: cumNew, cum_diff: Math.round(cumDiff), achieve_rate: achieveRate, days_recorded: records.length }
  })
})

/* ═══ 스태프 프리셋 ═══ */

kpi.get('/staff-presets', async (c) => {
  const user = c.get('user')!
  const type = sanitizeString(c.req.query('type') || '', 30)
  let sql = 'SELECT id, name, preset_type, sort_order FROM staff_presets WHERE hospital_id=? AND is_active=1'
  const params: any[] = [user.hospitalId]
  if (type) { sql += ' AND preset_type=?'; params.push(type) }
  sql += ' ORDER BY sort_order, name LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

kpi.post('/staff-presets', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    preset_type: { type: 'enum', values: ['doctor','counselor','desk'] },
    name: { type: 'string', max: 100 },
  })
  if (!b.preset_type || !b.name) return c.json({ error: '필수 항목 누락' }, 400)
  const id = 'sp-' + crypto.randomUUID().slice(0,8)
  const maxSort: any = await c.env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) as mx FROM staff_presets WHERE hospital_id=? AND preset_type=?').bind(user.hospitalId, b.preset_type).first()
  await c.env.DB.prepare('INSERT INTO staff_presets (id, hospital_id, preset_type, name, sort_order) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, b.preset_type, b.name, (maxSort?.mx||0)+1).run()
  return c.json({ id, name: b.name })
})

kpi.delete('/staff-presets/:id', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('UPDATE staff_presets SET is_active=0 WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ══════════════════════════════════════
   🏆 병원 벤치마킹 — 동일 규모 병원 대비 KPI 비교
   ══════════════════════════════════════ */
kpi.get('/benchmark', async (c) => {
  const user = c.get('user')!
  const yearMonth = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0, 7), 10)

  // 1) 우리 병원 통계
  const myStats: any = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as days_recorded,
      COALESCE(SUM(revenue_non_insurance + revenue_insurance), 0) as total_revenue,
      COALESCE(SUM(new_patients), 0) as new_patients,
      COALESCE(SUM(existing_patients), 0) as existing_patients,
      COALESCE(SUM(total_consultations), 0) as total_consult,
      COALESCE(SUM(core_treat_1_consult), 0) as t1_consult,
      COALESCE(SUM(core_treat_1_agree), 0) as t1_agree,
      COALESCE(SUM(core_treat_2_consult), 0) as t2_consult,
      COALESCE(SUM(core_treat_2_agree), 0) as t2_agree,
      COALESCE(SUM(inbound_calls), 0) as inbound_calls,
      COALESCE(SUM(outbound_calls), 0) as outbound_calls,
      COALESCE(SUM(cancel_count), 0) as cancel_count,
      COALESCE(SUM(complaint_count), 0) as complaint_count,
      COALESCE(SUM(referral_new), 0) as referral_new,
      COALESCE(SUM(naver_reviews), 0) as naver_reviews,
      ROUND(AVG(CASE WHEN avg_wait_time > 0 THEN avg_wait_time END), 1) as avg_wait_time
    FROM daily_records WHERE hospital_id = ? AND record_date LIKE ?
  `).bind(user.hospitalId, yearMonth + '%').first()

  // 2) 전체 병원 집계 (익명)
  const allStats: any = await c.env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT hospital_id) as hospital_count,
      ROUND(AVG(monthly_revenue)) as avg_revenue,
      ROUND(AVG(monthly_new_patients), 1) as avg_new_patients,
      ROUND(AVG(monthly_total_patients), 1) as avg_total_patients,
      ROUND(AVG(monthly_consult), 1) as avg_consult,
      ROUND(AVG(conv_rate), 1) as avg_conv_rate,
      ROUND(AVG(avg_wait), 1) as avg_wait,
      ROUND(AVG(monthly_cancel), 1) as avg_cancel,
      ROUND(AVG(monthly_complaint), 1) as avg_complaint,
      ROUND(AVG(monthly_referral), 1) as avg_referral,
      ROUND(AVG(monthly_reviews), 1) as avg_reviews,
      ROUND(AVG(monthly_inbound), 1) as avg_inbound,
      ROUND(AVG(monthly_outbound), 1) as avg_outbound
    FROM (
      SELECT 
        hospital_id,
        SUM(revenue_non_insurance + revenue_insurance) as monthly_revenue,
        SUM(new_patients) as monthly_new_patients,
        SUM(existing_patients + new_patients) as monthly_total_patients,
        SUM(total_consultations) as monthly_consult,
        CASE WHEN SUM(total_consultations) > 0 
          THEN ROUND(SUM(core_treat_1_agree + core_treat_2_agree + core_treat_3_agree) * 100.0 / SUM(total_consultations), 1)
          ELSE 0 END as conv_rate,
        AVG(CASE WHEN avg_wait_time > 0 THEN avg_wait_time END) as avg_wait,
        SUM(cancel_count) as monthly_cancel,
        SUM(complaint_count) as monthly_complaint,
        SUM(referral_new) as monthly_referral,
        SUM(naver_reviews) as monthly_reviews,
        SUM(inbound_calls) as monthly_inbound,
        SUM(outbound_calls) as monthly_outbound
      FROM daily_records WHERE record_date LIKE ?
      GROUP BY hospital_id
      HAVING COUNT(*) >= 5
    )
  `).bind(yearMonth + '%').first()

  // 3) 우리 병원의 전환율 계산
  const myTotalConsult = (myStats?.t1_consult || 0) + (myStats?.t2_consult || 0)
  const myTotalAgree = (myStats?.t1_agree || 0) + (myStats?.t2_agree || 0)
  const myConvRate = myTotalConsult > 0 ? Math.round(myTotalAgree / myTotalConsult * 1000) / 10 : 0

  // 4) 퍼센타일 계산 (우리 병원이 전체 중 어디에 위치하는지)
  const revenueRank: any = await c.env.DB.prepare(`
    SELECT COUNT(*) as below_count FROM (
      SELECT hospital_id, SUM(revenue_non_insurance + revenue_insurance) as rev
      FROM daily_records WHERE record_date LIKE ?
      GROUP BY hospital_id HAVING COUNT(*) >= 5
    ) WHERE rev < ?
  `).bind(yearMonth + '%', myStats?.total_revenue || 0).first()

  const hospitalCount = allStats?.hospital_count || 1
  const percentile = hospitalCount > 1 
    ? Math.round(((revenueRank?.below_count || 0) / hospitalCount) * 100) 
    : 50

  // 5) 비교 데이터 구성
  const myDays = myStats?.days_recorded || 1
  const indicators = [
    {
      key: 'revenue',
      label: '월 매출',
      myValue: myStats?.total_revenue || 0,
      avgValue: allStats?.avg_revenue || 0,
      format: 'money',
      higherIsBetter: true,
    },
    {
      key: 'new_patients',
      label: '신환 수',
      myValue: myStats?.new_patients || 0,
      avgValue: allStats?.avg_new_patients || 0,
      format: 'number',
      higherIsBetter: true,
    },
    {
      key: 'total_patients',
      label: '총 환자 수',
      myValue: (myStats?.new_patients || 0) + (myStats?.existing_patients || 0),
      avgValue: allStats?.avg_total_patients || 0,
      format: 'number',
      higherIsBetter: true,
    },
    {
      key: 'conv_rate',
      label: '상담 전환율',
      myValue: myConvRate,
      avgValue: allStats?.avg_conv_rate || 0,
      format: 'percent',
      higherIsBetter: true,
    },
    {
      key: 'wait_time',
      label: '평균 대기시간',
      myValue: myStats?.avg_wait_time || 0,
      avgValue: allStats?.avg_wait || 0,
      format: 'minutes',
      higherIsBetter: false,
    },
    {
      key: 'cancel',
      label: '취소/노쇼',
      myValue: myStats?.cancel_count || 0,
      avgValue: allStats?.avg_cancel || 0,
      format: 'number',
      higherIsBetter: false,
    },
    {
      key: 'complaint',
      label: '컴플레인',
      myValue: myStats?.complaint_count || 0,
      avgValue: allStats?.avg_complaint || 0,
      format: 'number',
      higherIsBetter: false,
    },
    {
      key: 'referral',
      label: '소개 환자',
      myValue: myStats?.referral_new || 0,
      avgValue: allStats?.avg_referral || 0,
      format: 'number',
      higherIsBetter: true,
    },
    {
      key: 'reviews',
      label: '네이버 리뷰',
      myValue: myStats?.naver_reviews || 0,
      avgValue: allStats?.avg_reviews || 0,
      format: 'number',
      higherIsBetter: true,
    },
  ]

  // Calculate diff percentage for each indicator
  const enrichedIndicators = indicators.map(ind => {
    const diff = ind.avgValue > 0 ? Math.round((ind.myValue - ind.avgValue) / ind.avgValue * 100) : 0
    const isGood = ind.higherIsBetter ? diff >= 0 : diff <= 0
    return { ...ind, diff, isGood }
  })

  return c.json({
    month: yearMonth,
    hospitalCount,
    percentile,
    daysRecorded: myDays,
    indicators: enrichedIndicators,
  })
})

export default kpi
