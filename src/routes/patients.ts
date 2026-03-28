import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole } from '../lib/middleware'
const patients = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 환자 데이터베이스 (Patient Registry) ═══ */

// 환자 목록 (검색/필터)
patients.get('/api/protected/patients', async (c) => {
  const user = c.get('user')!
  const search = c.req.query('search')
  const type = c.req.query('type')
  const source = c.req.query('source')
  const doctor = c.req.query('doctor')
  const counselor = c.req.query('counselor')
  const area = c.req.query('area')
  const status = c.req.query('status')
  const from = c.req.query('from')
  const to = c.req.query('to')
  const sido = c.req.query('sido')
  const limit = parseInt(c.req.query('limit') || '200')
  const offset = parseInt(c.req.query('offset') || '0')

  // Build shared WHERE clause (DRY - used for both data and count queries)
  let where = 'hospital_id=?'
  const filterParams: any[] = [user.hospitalId]
  if (search) { where += ' AND (patient_name LIKE ? OR chart_number LIKE ? OR phone LIKE ? OR memo LIKE ?)'; filterParams.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`) }
  if (type) { where += ' AND patient_type=?'; filterParams.push(type) }
  if (source) { where += ' AND visit_source=?'; filterParams.push(source) }
  if (doctor) { where += ' AND primary_doctor=?'; filterParams.push(doctor) }
  if (counselor) { where += ' AND assigned_counselor=?'; filterParams.push(counselor) }
  if (area) { where += ' AND treatment_area=?'; filterParams.push(area) }
  if (sido) { where += ' AND addr_sido=?'; filterParams.push(sido) }
  if (status) { where += ' AND status=?'; filterParams.push(status) }
  else { where += " AND status='active'" }
  if (from) { where += ' AND first_visit_date>=?'; filterParams.push(from) }
  if (to) { where += ' AND first_visit_date<=?'; filterParams.push(to) }

  const [rows, cnt] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM patients WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...filterParams, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM patients WHERE ${where}`).bind(...filterParams).first() as Promise<any>,
  ])
  return c.json({ patients: rows.results, total: cnt?.c || 0 })
})

// 환자 자동완성 (상담기록에서 사용) - :id 보다 먼저 선언해야 함
patients.get('/search/autocomplete', async (c) => {
  const user = c.get('user')!
  const q = c.req.query('q')
  if (!q || q.length < 1) return c.json([])
  const rows = await c.env.DB.prepare(
    `SELECT id, patient_name, chart_number, phone, patient_type, visit_source, treatment_area, primary_doctor, assigned_counselor, desk_staff, addr_sido, addr_sigungu, first_visit_date, last_visit_date, visit_count
    FROM patients WHERE hospital_id=? AND status='active' AND (patient_name LIKE ? OR chart_number LIKE ? OR phone LIKE ?)
    ORDER BY last_visit_date DESC LIMIT 15`
  ).bind(user.hospitalId, `%${q}%`, `%${q}%`, `%${q}%`).all()
  return c.json(rows.results)
})

// 환자 통계 (대시보드용) - :id 보다 먼저 선언해야 함
patients.get('/stats/summary', async (c) => {
  const user = c.get('user')!
  const month = c.req.query('month') || new Date().toISOString().slice(0,7)
  const [total, newThisMonth, bySource, byArea] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active'").bind(user.hospitalId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active' AND first_visit_date LIKE ?").bind(user.hospitalId, month+'%').first(),
    c.env.DB.prepare("SELECT visit_source, COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active' AND first_visit_date LIKE ? GROUP BY visit_source ORDER BY c DESC").bind(user.hospitalId, month+'%').all(),
    c.env.DB.prepare("SELECT treatment_area, COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active' AND first_visit_date LIKE ? GROUP BY treatment_area ORDER BY c DESC").bind(user.hospitalId, month+'%').all(),
  ])
  return c.json({
    totalActive: (total as any)?.c || 0,
    newThisMonth: (newThisMonth as any)?.c || 0,
    bySource: bySource.results,
    byArea: byArea.results,
  })
})

// 환자 상세 통계 (기간별: daily/weekly/monthly/yearly)
patients.get('/stats/detailed', async (c) => {
  const user = c.get('user')!
  const period = c.req.query('period') || 'monthly' // daily, weekly, monthly, yearly
  const from = c.req.query('from') || ''
  const to = c.req.query('to') || ''

  // 기간 조건 빌드
  let dateFilter = ''
  const params: any[] = [user.hospitalId]
  if (from && to) {
    dateFilter = ' AND first_visit_date >= ? AND first_visit_date <= ?'
    params.push(from, to)
  } else if (from) {
    dateFilter = ' AND first_visit_date >= ?'
    params.push(from)
  } else if (to) {
    dateFilter = ' AND first_visit_date <= ?'
    params.push(to)
  }

  const baseWhere = "hospital_id=? AND status='active'" + dateFilter

  // 기간별 그룹 키
  let dateGroupExpr = ''
  if (period === 'daily') dateGroupExpr = 'first_visit_date'
  else if (period === 'weekly') dateGroupExpr = "strftime('%Y-W%W', first_visit_date)"
  else if (period === 'monthly') dateGroupExpr = "substr(first_visit_date, 1, 7)"
  else dateGroupExpr = "substr(first_visit_date, 1, 4)"

  const queries = [
    // 0) 전체 카운트
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM patients WHERE ${baseWhere}`).bind(...params).first(),
    // 1) 신환/구환
    c.env.DB.prepare(`SELECT patient_type, COUNT(*) as c FROM patients WHERE ${baseWhere} AND patient_type != '' GROUP BY patient_type ORDER BY c DESC`).bind(...params).all(),
    // 2) 내원경로별
    c.env.DB.prepare(`SELECT visit_source, COUNT(*) as c FROM patients WHERE ${baseWhere} AND visit_source != '' GROUP BY visit_source ORDER BY c DESC`).bind(...params).all(),
    // 3) 진료과목별
    c.env.DB.prepare(`SELECT treatment_area, COUNT(*) as c FROM patients WHERE ${baseWhere} AND treatment_area != '' GROUP BY treatment_area ORDER BY c DESC`).bind(...params).all(),
    // 4) 지역별 (시/도)
    c.env.DB.prepare(`SELECT addr_sido, COUNT(*) as c FROM patients WHERE ${baseWhere} AND addr_sido != '' GROUP BY addr_sido ORDER BY c DESC`).bind(...params).all(),
    // 5) 지역별 (시/군/구) - 상위 20
    c.env.DB.prepare(`SELECT addr_sido, addr_sigungu, COUNT(*) as c FROM patients WHERE ${baseWhere} AND addr_sido != '' AND addr_sigungu != '' GROUP BY addr_sido, addr_sigungu ORDER BY c DESC LIMIT 20`).bind(...params).all(),
    // 6) 담당 원장별
    c.env.DB.prepare(`SELECT primary_doctor, COUNT(*) as c FROM patients WHERE ${baseWhere} AND primary_doctor != '' GROUP BY primary_doctor ORDER BY c DESC`).bind(...params).all(),
    // 7) 담당 상담사별
    c.env.DB.prepare(`SELECT assigned_counselor, COUNT(*) as c FROM patients WHERE ${baseWhere} AND assigned_counselor != '' GROUP BY assigned_counselor ORDER BY c DESC`).bind(...params).all(),
    // 8) 기간별 트렌드
    c.env.DB.prepare(`SELECT ${dateGroupExpr} as period_key, COUNT(*) as c, SUM(CASE WHEN patient_type='new' THEN 1 ELSE 0 END) as new_count, SUM(CASE WHEN patient_type='existing' THEN 1 ELSE 0 END) as existing_count FROM patients WHERE ${baseWhere} AND first_visit_date != '' GROUP BY period_key ORDER BY period_key`).bind(...params).all(),
    // 9) 성별
    c.env.DB.prepare(`SELECT gender, COUNT(*) as c FROM patients WHERE ${baseWhere} AND gender != '' GROUP BY gender ORDER BY c DESC`).bind(...params).all(),
  ]

  const results = await Promise.all(queries)
  return c.json({
    total: (results[0] as any)?.c || 0,
    byPatientType: results[1].results,
    bySource: results[2].results,
    byTreatmentArea: results[3].results,
    bySido: results[4].results,
    bySigungu: results[5].results,
    byDoctor: results[6].results,
    byCounselor: results[7].results,
    trend: results[8].results,
    byGender: results[9].results,
    period, from, to,
  })
})

// 환자 상세 (상담 이력 포함)
patients.get('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const patient: any = await c.env.DB.prepare('SELECT * FROM patients WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).first()
  if (!patient) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  // 상담 이력 연결
  const consults = await c.env.DB.prepare('SELECT * FROM consult_records WHERE hospital_id=? AND patient_name=? ORDER BY record_date DESC LIMIT 50').bind(user.hospitalId, patient.patient_name).all()
  return c.json({ ...patient, consult_history: consults.results })
})

// 환자 등록
patients.post('/api/protected/patients', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  if (!body.patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = 'pt-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`
    INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender,
      patient_type, visit_source, visit_source_detail, referrer_name,
      first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, desk_staff,
      visit_reason, address, addr_sido, addr_sigungu, addr_detail, memo, status, kakao_registered, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, user.hospitalId,
    body.chart_number||'', body.patient_name, body.phone||'', body.birth_date||'', body.gender||'',
    body.patient_type||'new',
    body.visit_source||'', body.visit_source_detail||'', body.referrer_name||'',
    body.first_visit_date || new Date().toISOString().slice(0,10),
    body.last_visit_date || body.first_visit_date || new Date().toISOString().slice(0,10),
    body.visit_count||1,
    body.treatment_area||'', body.primary_doctor||'', body.assigned_counselor||'', body.desk_staff||'',
    body.visit_reason||'', body.address||'', body.addr_sido||'', body.addr_sigungu||'', body.addr_detail||'',
    body.memo||'',
    body.status||'active', body.kakao_registered||'', user.id
  ).run()
  return c.json({ success: true, id })
})

// 환자 수정
patients.put('/:id', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json()
  const id = c.req.param('id')
  const fields = ['chart_number','patient_name','phone','birth_date','gender','patient_type',
    'visit_source','visit_source_detail','referrer_name','first_visit_date','last_visit_date',
    'visit_count','treatment_area','primary_doctor','assigned_counselor','desk_staff',
    'visit_reason','address','addr_sido','addr_sigungu','addr_detail','memo','status','kakao_registered']
  const updates: string[] = []; const vals: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f}=?`); vals.push(body[f]) }
  }
  if (updates.length === 0) return c.json({ error: '수정할 내용이 없습니다' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE patients SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 환자 삭제 (비활성화)
patients.delete('/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare("UPDATE patients SET status='inactive', updated_at=? WHERE id=? AND hospital_id=?").bind(new Date().toISOString(), c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// (autocomplete & stats routes moved above :id route)

// 환자 벌크 임포트
patients.post('/bulk', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const { patients } = await c.req.json()
  if (!Array.isArray(patients) || patients.length === 0) return c.json({ error: '데이터가 없습니다' }, 400)
  let inserted = 0
  for (const p of patients) {
    const id = 'pt-' + crypto.randomUUID().slice(0,8)
    try {
      await c.env.DB.prepare(`INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, visit_source_detail, referrer_name, first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, visit_reason, address, memo, status, kakao_registered, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id, user.hospitalId, p.chart_number||'', p.patient_name||'', p.phone||'', p.birth_date||'', p.gender||'', p.patient_type||'new', p.visit_source||'', p.visit_source_detail||'', p.referrer_name||'', p.first_visit_date||'', p.last_visit_date||'', p.visit_count||1, p.treatment_area||'', p.primary_doctor||'', p.assigned_counselor||'', p.visit_reason||'', p.address||'', p.memo||'', 'active', p.kakao_registered||'', user.id).run()
      inserted++
    } catch(e) {}
  }
  return c.json({ success: true, inserted, total: patients.length })
})


export default patients
