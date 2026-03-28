import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const consult = new Hono<{ Bindings: Bindings; Variables: Variables }>()

consult.get('/', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month') || new Date().toISOString().slice(0,7)
  const counselor = c.req.query('counselor'); const doctor = c.req.query('doctor')
  const category = c.req.query('category'); const confirmed = c.req.query('confirmed')
  const patientType = c.req.query('patient_type')
  let sql = 'SELECT * FROM consult_records WHERE hospital_id = ? AND record_date LIKE ?'
  const params: any[] = [user.hospitalId, month + '%']
  if (counselor) { sql += ' AND counselor_name = ?'; params.push(counselor) }
  if (doctor) { sql += ' AND doctor_name = ?'; params.push(doctor) }
  if (category) { sql += ' AND treatment_category = ?'; params.push(category) }
  if (confirmed) { sql += ' AND treatment_confirmed = ?'; params.push(confirmed) }
  if (patientType) { sql += ' AND patient_type = ?'; params.push(patientType) }
  sql += ' ORDER BY record_date DESC, created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

consult.post('/', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  if (!body.patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  if (!body.record_date) return c.json({ error: '날짜를 입력해주세요' }, 400)
  const id = 'cr-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, desk_name, planned_amount, agreed_amount, discount_note, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done, kakao_registered, pdf_provided, visit_source, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, user.hospitalId, body.record_date, body.chart_number||'', body.patient_name, body.doctor_name||'', body.counselor_name||'', body.desk_name||'', body.planned_amount||0, body.agreed_amount||0, body.discount_note||'', body.patient_type||'new', body.treatment_category||'general', body.treatment_confirmed||'', body.appointment_made||'', body.recall_done||'', body.kakao_registered||'', body.pdf_provided||'', body.visit_source||'', body.notes||'', user.id).run()
  return c.json({ success: true, id })
})

consult.put('/:id', async (c) => {
  const user = c.get('user')!; const body = await c.req.json(); const id = c.req.param('id')
  const fields = ['record_date','chart_number','patient_name','doctor_name','counselor_name','desk_name','planned_amount','agreed_amount','discount_note','patient_type','treatment_category','treatment_confirmed','appointment_made','recall_done','kakao_registered','pdf_provided','visit_source','notes']
  const updates: string[] = []; const vals: any[] = []
  for (const f of fields) { if (body[f] !== undefined) { updates.push(`${f}=?`); vals.push(body[f]) } }
  if (updates.length === 0) return c.json({ error: '수정할 내용이 없습니다' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE consult_records SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

consult.delete('/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM consult_records WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
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
  const month = c.req.query('month') || new Date().toISOString().slice(0,7)
  const all = await c.env.DB.prepare('SELECT * FROM consult_records WHERE hospital_id=? AND record_date LIKE ? ORDER BY record_date').bind(user.hospitalId, month + '%').all()
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
  const user = c.get('user')!; const q = c.req.query('q')
  if (!q || q.length < 1) return c.json([])
  const rows = await c.env.DB.prepare(`SELECT patient_name, chart_number, MAX(record_date) as last_visit, COUNT(*) as visit_count, GROUP_CONCAT(DISTINCT treatment_category) as categories, GROUP_CONCAT(DISTINCT visit_source) as sources FROM consult_records WHERE hospital_id=? AND patient_name LIKE ? GROUP BY patient_name, chart_number ORDER BY last_visit DESC LIMIT 20`).bind(user.hospitalId, `%${q}%`).all()
  return c.json(rows.results)
})

consult.get('/patient-history', async (c) => {
  const user = c.get('user')!; const name = c.req.query('name'); const chart = c.req.query('chart')
  if (!name) return c.json({ error: '환자명을 입력하세요' }, 400)
  let sql = 'SELECT * FROM consult_records WHERE hospital_id=? AND patient_name=?'
  const params: any[] = [user.hospitalId, name]
  if (chart) { sql += ' AND chart_number=?'; params.push(chart) }
  sql += ' ORDER BY record_date DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

consult.get('/summary', async (c) => {
  const user = c.get('user')!; const month = c.req.query('month') || new Date().toISOString().slice(0,7)
  const row = await c.env.DB.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed, SUM(CASE WHEN treatment_confirmed='X' THEN 1 ELSE 0 END) as rejected, SUM(CASE WHEN patient_type='new' THEN 1 ELSE 0 END) as new_patients, SUM(planned_amount) as total_planned, SUM(agreed_amount) as total_agreed FROM consult_records WHERE hospital_id=? AND record_date LIKE ?`).bind(user.hospitalId, month + '%').first()
  return c.json(row)
})

consult.get('/visit-sources', async (c) => {
  const user = c.get('user')!; const month = c.req.query('month'); const from = c.req.query('from'); const to = c.req.query('to')
  let sql = `SELECT visit_source, COUNT(*) as total, SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed, SUM(CASE WHEN patient_type='new' THEN 1 ELSE 0 END) as new_patients, SUM(agreed_amount) as total_agreed FROM consult_records WHERE hospital_id=?`
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND record_date LIKE ?'; params.push(month + '%') }
  else if (from && to) { sql += ' AND record_date>=? AND record_date<=?'; params.push(from, to) }
  sql += ' GROUP BY visit_source ORDER BY total DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

consult.post('/bulk', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 가능합니다' }, 403)
  const { records } = await c.req.json()
  if (!Array.isArray(records) || records.length === 0) return c.json({ error: '데이터가 없습니다' }, 400)
  let inserted = 0
  for (const r of records) {
    const id = 'cr-' + crypto.randomUUID().slice(0,8)
    try {
      await c.env.DB.prepare(`INSERT INTO consult_records (id, hospital_id, record_date, chart_number, patient_name, doctor_name, counselor_name, planned_amount, agreed_amount, discount_note, patient_type, treatment_category, treatment_confirmed, appointment_made, recall_done, kakao_registered, pdf_provided, visit_source, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id, user.hospitalId, r.record_date||'', r.chart_number||'', r.patient_name||'', r.doctor_name||'', r.counselor_name||'', r.planned_amount||0, r.agreed_amount||0, r.discount_note||'', r.patient_type||'new', r.treatment_category||'general', r.treatment_confirmed||'', r.appointment_made||'', r.recall_done||'', r.kakao_registered||'', r.pdf_provided||'', r.visit_source||'', r.notes||'', user.id).run()
      inserted++
    } catch(e) {}
  }
  return c.json({ success: true, inserted, total: records.length })
})

export default consult
