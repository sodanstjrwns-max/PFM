import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const patients = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 환자 데이터베이스 (Patient Registry) ═══ */

// 환자 목록 (검색/필터)
patients.get('/', async (c) => {
  const user = c.get('user')!
  const search = sanitizeString(c.req.query('search') || '', 200)
  const type = sanitizeString(c.req.query('type') || '', 20)
  const source = sanitizeString(c.req.query('source') || '', 100)
  const doctor = sanitizeString(c.req.query('doctor') || '', 100)
  const counselor = sanitizeString(c.req.query('counselor') || '', 100)
  const area = sanitizeString(c.req.query('area') || '', 100)
  const status = sanitizeString(c.req.query('status') || '', 20)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  const sido = sanitizeString(c.req.query('sido') || '', 30)
  const limit = sanitizeNumber(c.req.query('limit'), 200, 1, 500)
  const offset = sanitizeNumber(c.req.query('offset'), 0, 0, 99999)

  // Build shared WHERE clause (DRY - used for both data and count queries)
  let where = 'hospital_id=?'
  const filterParams: any[] = [user.hospitalId]
  if (search) { 
    // 이름/차트번호는 앞부분 매칭 우선, 나머지는 LIKE
    where += ' AND (patient_name LIKE ? OR chart_number LIKE ? OR phone LIKE ? OR memo LIKE ?)'
    filterParams.push(`${search}%`,`${search}%`,`%${search}%`,`%${search}%`) 
  }
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
    c.env.DB.prepare(`SELECT id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, desk_staff, addr_sido, addr_sigungu, status, kakao_registered, created_at FROM patients WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...filterParams, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM patients WHERE ${where}`).bind(...filterParams).first() as Promise<any>,
  ])
  // 🔒 일반 staff에게는 연락처/생년월일 마스킹 (개인정보보호법 최소권한 원칙)
  const canSeePII = user.role === 'admin' || user.role === 'manager'
  const maskPhone = (p: string) => p ? p.replace(/(\d{3})\d{3,4}(\d{4})/, '$1-****-$2') : ''
  const maskBirth = (b: string) => b && b.length >= 8 ? b.slice(0, 4) + '-**-**' : b
  const patients = canSeePII
    ? rows.results
    : (rows.results as any[]).map(p => ({ ...p, phone: maskPhone(p.phone), birth_date: maskBirth(p.birth_date) }))
  return c.json({ patients, total: cnt?.c || 0 })
})

// 환자 자동완성 (상담기록에서 사용) - :id 보다 먼저 선언해야 함
patients.get('/search/autocomplete', async (c) => {
  const user = c.get('user')!
  const q = sanitizeString(c.req.query('q') || '', 100)
  if (!q || q.length < 1) return c.json([])
  // Prefix-first search: name/chart use prefix match (uses index), phone/memo use contains
  const rows = await c.env.DB.prepare(
    `SELECT id, patient_name, chart_number, phone, patient_type, visit_source, treatment_area, primary_doctor, assigned_counselor, desk_staff, addr_sido, addr_sigungu, first_visit_date, last_visit_date, visit_count
    FROM patients WHERE hospital_id=? AND status='active' AND (patient_name LIKE ? OR chart_number LIKE ? OR phone LIKE ?)
    ORDER BY last_visit_date DESC LIMIT 15`
  ).bind(user.hospitalId, `${q}%`, `${q}%`, `%${q}%`).all()
  return c.json(rows.results)
})

// 환자 통계 (대시보드용) - :id 보다 먼저 선언해야 함
patients.get('/stats/summary', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0,7), 10)
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
  const period = sanitizeString(c.req.query('period') || 'monthly', 10)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)

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

  const results = await Promise.all(queries) as any[]
  return c.json({
    total: results[0]?.c || 0,
    byPatientType: results[1]?.results || [],
    bySource: results[2]?.results || [],
    byTreatmentArea: results[3]?.results || [],
    bySido: results[4]?.results || [],
    bySigungu: results[5]?.results || [],
    byDoctor: results[6]?.results || [],
    byCounselor: results[7]?.results || [],
    trend: results[8]?.results || [],
    byGender: results[9]?.results || [],
    period, from, to,
  })
})

// 환자 상세 (상담 이력 포함)
patients.get('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const patient: any = await c.env.DB.prepare('SELECT * FROM patients WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).first()
  if (!patient) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  // 상담 이력 연결 (소프트 딜리트 제외)
  const consults = await c.env.DB.prepare('SELECT * FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND patient_name=? ORDER BY record_date DESC LIMIT 50').bind(user.hospitalId, patient.patient_name).all()
  // 🔒 권한별 민감정보 마스킹
  const canSeePII = user.role === 'admin' || user.role === 'manager'
  const canSeeFinancials = canSeePII
  const maskPhone = (p: string) => p ? p.replace(/(\d{3})\d{3,4}(\d{4})/, '$1-****-$2') : ''
  const maskBirth = (b: string) => b && b.length >= 8 ? b.slice(0, 4) + '-**-**' : b
  const masked = canSeePII ? patient : { ...patient, phone: maskPhone(patient.phone), birth_date: maskBirth(patient.birth_date), address: '', addr_detail: '' }
  const consultHistory = canSeeFinancials
    ? consults.results
    : (consults.results as any[]).map(r => ({ ...r, planned_amount: null, agreed_amount: null, discount_note: null }))
  return c.json({ ...masked, consult_history: consultHistory })
})

// 환자 등록
patients.post('/', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    chart_number: { type: 'string', max: 50 }, patient_name: { type: 'string', max: 100 },
    phone: { type: 'string', max: 20 }, birth_date: { type: 'string', max: 10 }, gender: { type: 'string', max: 10 },
    patient_type: { type: 'enum', values: ['new','existing'] },
    visit_source: { type: 'string', max: 100 }, visit_source_detail: { type: 'string', max: 200 }, referrer_name: { type: 'string', max: 100 },
    first_visit_date: { type: 'string', max: 10 }, last_visit_date: { type: 'string', max: 10 }, visit_count: { type: 'number', min: 0, max: 99999, default: 1 },
    treatment_area: { type: 'string', max: 100 }, primary_doctor: { type: 'string', max: 100 }, assigned_counselor: { type: 'string', max: 100 }, desk_staff: { type: 'string', max: 100 },
    visit_reason: { type: 'string', max: 500 }, address: { type: 'string', max: 500 }, addr_sido: { type: 'string', max: 30 }, addr_sigungu: { type: 'string', max: 30 }, addr_detail: { type: 'string', max: 200 },
    memo: { type: 'string', max: 2000 }, status: { type: 'string', max: 20 }, kakao_registered: { type: 'string', max: 5 },
  })
  if (!b.patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = 'pt-' + crypto.randomUUID().slice(0,8)
  await c.env.DB.prepare(`
    INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender,
      patient_type, visit_source, visit_source_detail, referrer_name,
      first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, desk_staff,
      visit_reason, address, addr_sido, addr_sigungu, addr_detail, memo, status, kakao_registered, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, user.hospitalId,
    b.chart_number||'', b.patient_name, b.phone||'', b.birth_date||'', b.gender||'',
    b.patient_type||'new',
    b.visit_source||'', b.visit_source_detail||'', b.referrer_name||'',
    b.first_visit_date || new Date().toISOString().slice(0,10),
    b.last_visit_date || b.first_visit_date || new Date().toISOString().slice(0,10),
    b.visit_count||1,
    b.treatment_area||'', b.primary_doctor||'', b.assigned_counselor||'', b.desk_staff||'',
    b.visit_reason||'', b.address||'', b.addr_sido||'', b.addr_sigungu||'', b.addr_detail||'',
    b.memo||'',
    b.status||'active', b.kakao_registered||'', user.id
  ).run()
  return c.json({ success: true, id })
})

// 환자 수정
patients.put('/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const id = c.req.param('id')
  const fields = ['chart_number','patient_name','phone','birth_date','gender','patient_type',
    'visit_source','visit_source_detail','referrer_name','first_visit_date','last_visit_date',
    'visit_count','treatment_area','primary_doctor','assigned_counselor','desk_staff',
    'visit_reason','address','addr_sido','addr_sigungu','addr_detail','memo','status','kakao_registered']
  const numericFields = new Set(['visit_count'])
  const updates: string[] = []; const vals: any[] = []
  for (const f of fields) {
    if (raw[f] !== undefined) {
      const val = numericFields.has(f) ? sanitizeNumber(raw[f], 0, 0, 99999) : sanitizeString(String(raw[f]), f === 'memo' ? 2000 : f === 'address' ? 500 : 200)
      updates.push(`${f}=?`); vals.push(val)
    }
  }
  if (updates.length === 0) return c.json({ error: '수정할 내용이 없습니다' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE patients SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 환자 삭제 (비활성화)
/**
 * 🏥 환자 비활성화 (소프트 딜리트) - admin/manager 전용
 * 의료법: 환자 정보는 5년 보존, 하드 딜리트 금지
 */
patients.delete('/:id', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '환자 비활성화는 관리자/매니저만 가능합니다' }, 403)
  }
  const id = c.req.param('id')
  const exist: any = await c.env.DB.prepare('SELECT id FROM patients WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).first()
  if (!exist) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare("UPDATE patients SET status='inactive', updated_at=? WHERE id=? AND hospital_id=?").bind(new Date().toISOString(), id, user.hospitalId).run()
  return c.json({ success: true })
})

// (autocomplete & stats routes moved above :id route)

// 환자 벌크 임포트
patients.post('/bulk', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const { patients: patientList } = await c.req.json()
  if (!Array.isArray(patientList) || patientList.length === 0) return c.json({ error: '데이터가 없습니다' }, 400)
  if (patientList.length > 500) return c.json({ error: '한 번에 500건까지 가능합니다' }, 400)
  let inserted = 0
  const errors: Array<{index:number; name:string; error:string}> = []
  const SQL = `INSERT INTO patients (id, hospital_id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, visit_source_detail, referrer_name, first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, visit_reason, address, memo, status, kakao_registered, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  const stmtOf = (p: any) => c.env.DB.prepare(SQL)
    .bind('pt-' + crypto.randomUUID().slice(0,8), user.hospitalId, sanitizeString(p.chart_number||'',50), sanitizeString(p.patient_name||'',100), sanitizeString(p.phone||'',20), sanitizeString(p.birth_date||'',10), sanitizeString(p.gender||'',10), sanitizeString(p.patient_type||'new',20), sanitizeString(p.visit_source||'',100), sanitizeString(p.visit_source_detail||'',200), sanitizeString(p.referrer_name||'',100), sanitizeString(p.first_visit_date||'',10), sanitizeString(p.last_visit_date||'',10), sanitizeNumber(p.visit_count,1,0,99999), sanitizeString(p.treatment_area||'',100), sanitizeString(p.primary_doctor||'',100), sanitizeString(p.assigned_counselor||'',100), sanitizeString(p.visit_reason||'',500), sanitizeString(p.address||'',500), sanitizeString(p.memo||'',2000), 'active', sanitizeString(p.kakao_registered||'',5), user.id)
  // D1 batch: 50건 단위 청크. 청크 실패 시 개별 재시도로 per-row 에러 리포트 유지
  const CHUNK = 50
  for (let ci = 0; ci < patientList.length; ci += CHUNK) {
    const chunk = patientList.slice(ci, ci + CHUNK)
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
  return c.json({ success: true, inserted, failed: errors.length, total: patientList.length, ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {}) })
})


export default patients
