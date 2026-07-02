import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'

const consult = new Hono<{ Bindings: Bindings; Variables: Variables }>()

consult.get('/', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const counselor = sanitizeString(c.req.query('counselor') || '', 100)
  const doctor = sanitizeString(c.req.query('doctor') || '', 100)
  const category = sanitizeString(c.req.query('category') || '', 50)
  const confirmed = sanitizeString(c.req.query('confirmed') || '', 5)
  const patientType = sanitizeString(c.req.query('patient_type') || '', 20)
  let sql = 'SELECT id, record_date, chart_number, patient_name, patient_type, visit_source, doctor_name, counselor_name, desk_name, treatment_category, treatment_confirmed, planned_amount, agreed_amount, discount_note, appointment_made, recall_done, kakao_registered, pdf_provided, notes, created_at FROM consult_records WHERE hospital_id = ? AND COALESCE(is_deleted,0)=0 AND record_date LIKE ?'
  const params: any[] = [user.hospitalId, month + '%']
  if (counselor) { sql += ' AND counselor_name = ?'; params.push(counselor) }
  if (doctor) { sql += ' AND doctor_name = ?'; params.push(doctor) }
  if (category) { sql += ' AND treatment_category = ?'; params.push(category) }
  if (confirmed) { sql += ' AND treatment_confirmed = ?'; params.push(confirmed) }
  if (patientType) { sql += ' AND patient_type = ?'; params.push(patientType) }
  sql += ' ORDER BY record_date DESC, created_at DESC LIMIT 500'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  // 🔒 일반 staff에게는 재정정보(견적/동의금액/할인내역) 마스킹
  const canSeeFinancials = user.role === 'admin' || user.role === 'manager'
  const results = canSeeFinancials
    ? rows.results
    : (rows.results as any[]).map(r => ({ ...r, planned_amount: null, agreed_amount: null, discount_note: null }))
  return c.json(results)
})

consult.post('/', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    record_date: { type: 'string', max: 20 },
    chart_number: { type: 'string', max: 50 },
    patient_name: { type: 'string', max: 100 },
    doctor_name: { type: 'string', max: 100 },
    counselor_name: { type: 'string', max: 100 },
    desk_name: { type: 'string', max: 100 },
    planned_amount: { type: 'number', min: 0, max: 999999999 },
    agreed_amount: { type: 'number', min: 0, max: 999999999 },
    discount_note: { type: 'string', max: 500 },
    patient_type: { type: 'enum', values: ['new','existing'] },
    treatment_category: { type: 'string', max: 100 },
    treatment_confirmed: { type: 'string', max: 5 },
    appointment_made: { type: 'string', max: 5 },
    recall_done: { type: 'string', max: 5 },
    kakao_registered: { type: 'string', max: 5 },
    pdf_provided: { type: 'string', max: 5 },
    visit_source: { type: 'string', max: 100 },
    notes: { type: 'string', max: 2000 },
  })
  if (!b.patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  if (!b.record_date) return c.json({ error: '날짜를 입력해주세요' }, 400)
  const id = 'cr-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, desk_name, planned_amount, agreed_amount, discount_note, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done, kakao_registered, pdf_provided, visit_source, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, b.record_date, b.chart_number||'', b.patient_name, b.doctor_name||'', b.counselor_name||'', b.desk_name||'', b.planned_amount||0, b.agreed_amount||0, b.discount_note||'', b.patient_type||'new', b.treatment_category||'general', b.treatment_confirmed||'', b.appointment_made||'', b.recall_done||'', b.kakao_registered||'', b.pdf_provided||'', b.visit_source||'', b.notes||'', user.id).run()
  return c.json({ success: true, id })
})

consult.put('/:id', async (c) => {
  const user = c.get('user')!; const raw = await c.req.json(); const id = c.req.param('id')
  const fields = ['record_date','chart_number','patient_name','doctor_name','counselor_name','desk_name','planned_amount','agreed_amount','discount_note','patient_type','treatment_category','treatment_confirmed','appointment_made','recall_done','kakao_registered','pdf_provided','visit_source','notes']
  const numericFields = new Set(['planned_amount','agreed_amount'])
  const updates: string[] = []; const vals: any[] = []
  for (const f of fields) {
    if (raw[f] !== undefined) {
      const val = numericFields.has(f) ? sanitizeNumber(raw[f], 0, 0, 999999999) : sanitizeString(String(raw[f]), f === 'notes' ? 2000 : 200)
      updates.push(`${f}=?`); vals.push(val)
    }
  }
  if (updates.length === 0) return c.json({ error: '수정할 내용이 없습니다' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE consult_records SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

/**
 * 🏥 의료법 제22조 준수: 진료기록부 5년 보존 의무
 * 하드 딜리트 금지 → 소프트 딜리트(is_deleted=1) + admin/manager 권한 필요
 */
consult.delete('/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '상담기록 삭제는 관리자/매니저만 가능합니다' }, 403)
  }
  const id = c.req.param('id')
  // 사전 검증: 본 병원 데이터인지 확인
  const exist: any = await c.env.DB.prepare('SELECT id FROM consult_records WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).first()
  if (!exist) return c.json({ error: '상담기록을 찾을 수 없습니다' }, 404)
  // 소프트 딜리트 (의료법 5년 보존)
  await c.env.DB.prepare('UPDATE consult_records SET is_deleted=1, deleted_at=?, deleted_by=?, updated_at=? WHERE id=? AND hospital_id=?')
    .bind(new Date().toISOString(), user.id, new Date().toISOString(), id, user.hospitalId).run()
  return c.json({ success: true })
})

consult.get('/staff', async (c) => {
  const user = c.get('user')!
  const [presetDoctors, presetCounselors, presetDesk] = await Promise.all([
    c.env.DB.prepare("SELECT name FROM staff_presets WHERE hospital_id=? AND preset_type='doctor' AND is_active=1 ORDER BY sort_order").bind(user.hospitalId).all(),
    c.env.DB.prepare("SELECT name FROM staff_presets WHERE hospital_id=? AND preset_type='counselor' AND is_active=1 ORDER BY sort_order").bind(user.hospitalId).all(),
    c.env.DB.prepare("SELECT name FROM staff_presets WHERE hospital_id=? AND preset_type='desk' AND is_active=1 ORDER BY sort_order").bind(user.hospitalId).all(),
  ])
  let doctors = (presetDoctors.results as any[]).map(r => r.name)
  let counselors = (presetCounselors.results as any[]).map(r => r.name)
  let desk = (presetDesk.results as any[]).map(r => r.name)
  if (doctors.length === 0) { const d = await c.env.DB.prepare('SELECT DISTINCT doctor_name FROM consult_records WHERE hospital_id=? AND doctor_name != "" ORDER BY doctor_name').bind(user.hospitalId).all(); doctors = (d.results as any[]).map(r => r.doctor_name) }
  if (counselors.length === 0) { const c2 = await c.env.DB.prepare('SELECT DISTINCT counselor_name FROM consult_records WHERE hospital_id=? AND counselor_name != "" ORDER BY counselor_name').bind(user.hospitalId).all(); counselors = (c2.results as any[]).map(r => r.counselor_name) }
  const staffUsers = await c.env.DB.prepare('SELECT name, role, position, is_doctor FROM users WHERE hospital_id=? AND is_active=1 ORDER BY name').bind(user.hospitalId).all()
  return c.json({ doctors, counselors, desk, users: staffUsers.results })
})

consult.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const all = await c.env.DB.prepare('SELECT * FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND record_date LIKE ? ORDER BY record_date').bind(user.hospitalId, month + '%').all()
  const rows = all.results as any[]
  const total = rows.length
  let confirmed = 0, rejected = 0, newPatients = 0, existingPatients = 0, totalPlanned = 0, totalAgreed = 0
  const byCounselor: Record<string, any> = {}; const byDoctor: Record<string, any> = {}
  const byCategory: Record<string, any> = {}; const byDate: Record<string, any> = {}
  const byVisitSource: Record<string, any> = {}
  const initGroup = () => ({total:0,confirmed:0,rejected:0,planned:0,agreed:0})
  for (const r of rows as any[]) {
    const isO = r.treatment_confirmed === 'O'; const isX = r.treatment_confirmed === 'X'
    const planned = r.planned_amount || 0; const agreed = r.agreed_amount || 0
    if (isO) confirmed++; if (isX) rejected++
    if (r.patient_type === 'new') newPatients++; else if (r.patient_type === 'existing') existingPatients++
    totalPlanned += planned; totalAgreed += agreed
    const cName = r.counselor_name || '미지정'; if (!byCounselor[cName]) byCounselor[cName] = initGroup()
    byCounselor[cName].total++; if (isO) byCounselor[cName].confirmed++; if (isX) byCounselor[cName].rejected++
    byCounselor[cName].planned += planned; byCounselor[cName].agreed += agreed
    const dName = r.doctor_name || '미지정'; if (!byDoctor[dName]) byDoctor[dName] = initGroup()
    byDoctor[dName].total++; if (isO) byDoctor[dName].confirmed++; if (isX) byDoctor[dName].rejected++
    byDoctor[dName].planned += planned; byDoctor[dName].agreed += agreed
    const cat = r.treatment_category || 'general'; if (!byCategory[cat]) byCategory[cat] = initGroup()
    byCategory[cat].total++; if (isO) byCategory[cat].confirmed++; if (isX) byCategory[cat].rejected++
    byCategory[cat].planned += planned; byCategory[cat].agreed += agreed
    const d = r.record_date; if (!byDate[d]) byDate[d] = {total:0,confirmed:0,planned:0,agreed:0}
    byDate[d].total++; if (isO) byDate[d].confirmed++; byDate[d].planned += planned; byDate[d].agreed += agreed
    const src = r.visit_source || '미기록'; if (!byVisitSource[src]) byVisitSource[src] = initGroup()
    byVisitSource[src].total++; if (isO) byVisitSource[src].confirmed++; if (isX) byVisitSource[src].rejected++
    byVisitSource[src].planned += planned; byVisitSource[src].agreed += agreed
  }
  const pending = total - confirmed - rejected
  const canSeeFinancials = user.role === 'admin' || user.role === 'manager'
  const maskFinancials = (obj: Record<string, any>) => Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, {total:v.total,confirmed:v.confirmed,rejected:v.rejected,planned:null,agreed:null}]))
  return c.json({
    summary: { total, confirmed, rejected, pending, confirmRate: (confirmed + rejected) > 0 ? Math.round(confirmed / (confirmed + rejected) * 1000) / 10 : 0, newPatients, existingPatients, totalPlanned: canSeeFinancials ? totalPlanned : null, totalAgreed: canSeeFinancials ? totalAgreed : null, discountRate: totalPlanned > 0 ? Math.round((1 - totalAgreed / totalPlanned) * 1000) / 10 : 0 },
    byCounselor: canSeeFinancials ? byCounselor : maskFinancials(byCounselor),
    byDoctor: canSeeFinancials ? byDoctor : maskFinancials(byDoctor),
    byCategory, byDate,
    byVisitSource: canSeeFinancials ? byVisitSource : maskFinancials(byVisitSource),
  })
})

consult.get('/patient-search', async (c) => {
  const user = c.get('user')!
  const q = sanitizeString(c.req.query('q') || '', 100)
  if (!q || q.length < 1) return c.json([])
  const rows = await c.env.DB.prepare(`SELECT patient_name, chart_number, MAX(record_date) as last_visit, COUNT(*) as visit_count, GROUP_CONCAT(DISTINCT treatment_category) as categories, GROUP_CONCAT(DISTINCT visit_source) as sources FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND patient_name LIKE ? GROUP BY patient_name, chart_number ORDER BY last_visit DESC LIMIT 20`).bind(user.hospitalId, `%${q}%`).all()
  return c.json(rows.results)
})

consult.get('/patient-history', async (c) => {
  const user = c.get('user')!
  const name = sanitizeString(c.req.query('name') || '', 100)
  const chart = sanitizeString(c.req.query('chart') || '', 50)
  if (!name) return c.json({ error: '환자명을 입력하세요' }, 400)
  let sql = 'SELECT * FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND patient_name=?'
  const params: any[] = [user.hospitalId, name]
  if (chart) { sql += ' AND chart_number=?'; params.push(chart) }
  sql += ' ORDER BY record_date DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  // 🔒 staff에게는 재정정보 마스킹
  const canSeeFinancials = user.role === 'admin' || user.role === 'manager'
  const results = canSeeFinancials
    ? rows.results
    : (rows.results as any[]).map(r => ({ ...r, planned_amount: null, agreed_amount: null, discount_note: null }))
  return c.json(results)
})

consult.get('/summary', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
  const row: any = await c.env.DB.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed, SUM(CASE WHEN treatment_confirmed='X' THEN 1 ELSE 0 END) as rejected, SUM(CASE WHEN patient_type='new' THEN 1 ELSE 0 END) as new_patients, SUM(planned_amount) as total_planned, SUM(agreed_amount) as total_agreed FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND record_date LIKE ?`).bind(user.hospitalId, month + '%').first()
  // 🔒 staff에게는 재정정보 마스킹
  if (row && user.role !== 'admin' && user.role !== 'manager') {
    row.total_planned = null; row.total_agreed = null
  }
  return c.json(row)
})

consult.get('/visit-sources', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || '', 10)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  let sql = `SELECT visit_source, COUNT(*) as total, SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed, SUM(CASE WHEN patient_type='new' THEN 1 ELSE 0 END) as new_patients, SUM(agreed_amount) as total_agreed FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0`
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND record_date LIKE ?'; params.push(month + '%') }
  else if (from && to) { sql += ' AND record_date>=? AND record_date<=?'; params.push(from, to) }
  sql += ' GROUP BY visit_source ORDER BY total DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  // 🔒 staff에게는 재정정보 마스킹
  const canSeeFinancials = user.role === 'admin' || user.role === 'manager'
  const results = canSeeFinancials
    ? rows.results
    : (rows.results as any[]).map(r => ({ ...r, total_agreed: null }))
  return c.json(results)
})

consult.post('/bulk', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 가능합니다' }, 403)
  const { records } = await c.req.json()
  if (!Array.isArray(records) || records.length === 0) return c.json({ error: '데이터가 없습니다' }, 400)
  if (records.length > 500) return c.json({ error: '한 번에 500건까지 가능합니다' }, 400)
  let inserted = 0
  const errors: Array<{index:number; name:string; error:string}> = []
  const SQL = `INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, planned_amount, agreed_amount, discount_note, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done, kakao_registered, pdf_provided, visit_source, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  const stmtOf = (r: any) => c.env.DB.prepare(SQL)
    .bind('cr-' + crypto.randomUUID().slice(0,8), user.hospitalId, sanitizeString(r.record_date||'',10), sanitizeString(r.chart_number||'',50), sanitizeString(r.patient_name||'',100), sanitizeString(r.doctor_name||'',100), sanitizeString(r.counselor_name||'',100), sanitizeNumber(r.planned_amount,0,0,999999999), sanitizeNumber(r.agreed_amount,0,0,999999999), sanitizeString(r.discount_note||'',500), sanitizeString(r.patient_type||'new',20), sanitizeString(r.treatment_category||'general',100), sanitizeString(r.treatment_confirmed||'',5), sanitizeString(r.appointment_made||'',5), sanitizeString(r.recall_done||'',5), sanitizeString(r.kakao_registered||'',5), sanitizeString(r.pdf_provided||'',5), sanitizeString(r.visit_source||'',100), sanitizeString(r.notes||'',2000), user.id)
  // D1 batch: 50건 단위 청크. 청크 실패 시 해당 청크만 개별 재시도해 per-row 에러 리포트 유지
  const CHUNK = 50
  for (let ci = 0; ci < records.length; ci += CHUNK) {
    const chunk = records.slice(ci, ci + CHUNK)
    try {
      await c.env.DB.batch(chunk.map(stmtOf))
      inserted += chunk.length
    } catch {
      for (let j = 0; j < chunk.length; j++) {
        try { await stmtOf(chunk[j]).run(); inserted++ }
        catch(e) { errors.push({ index: ci + j, name: chunk[j].patient_name || '(미입력)', error: (e as Error).message }) }
      }
    }
  }
  return c.json({ success: true, inserted, failed: errors.length, total: records.length, ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {}) })
})

export default consult
