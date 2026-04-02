import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber } from '../lib/middleware'

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ #19 Error Monitoring / Logging ═══ */

// GET error logs (admin/manager only)
admin.get('/errors', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const level = sanitizeString(c.req.query('level') || '', 10)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  const limit = sanitizeNumber(c.req.query('limit'), 50, 1, 200)
  const offset = sanitizeNumber(c.req.query('offset'), 0, 0, 99999)

  let where = 'hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (level) { where += ' AND level=?'; params.push(level) }
  if (from) { where += ' AND created_at>=?'; params.push(from) }
  if (to) { where += ' AND created_at<=?'; params.push(to + ' 23:59:59') }

  const [rows, cnt] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM error_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM error_logs WHERE ${where}`).bind(...params).first() as Promise<any>,
  ])
  return c.json({ errors: rows.results, total: cnt?.c || 0 })
})

// POST log error (called by global error handler and frontend)
admin.post('/errors', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const source = sanitizeString(body.source || 'unknown', 50)
  const message = sanitizeString(body.message || '', 2000)
  const level = ['error', 'warn', 'info'].includes(body.level) ? body.level : 'error'
  if (!message) return c.json({ error: '메시지가 필요합니다' }, 400)

  await c.env.DB.prepare(
    'INSERT INTO error_logs (hospital_id, user_id, level, source, message, stack, path, method, user_agent, ip) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(
    user?.hospitalId || null, user?.id || null, level, source,
    message, sanitizeString(body.stack || '', 5000),
    sanitizeString(body.path || '', 500), sanitizeString(body.method || '', 10),
    (c.req.header('user-agent') || '').slice(0, 500),
    c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || ''
  ).run()

  return c.json({ success: true })
})

// DELETE clear old error logs (admin only)
admin.delete('/errors', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const days = sanitizeNumber(c.req.query('days'), 30, 1, 365)
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  const result = await c.env.DB.prepare(
    'DELETE FROM error_logs WHERE hospital_id=? AND created_at<?'
  ).bind(user.hospitalId, cutoff).run()
  return c.json({ success: true, deleted: result.meta.changes || 0 })
})

/* ═══ #18 Data Export API ═══ */

// CSV export for any major table
admin.get('/export/:table', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const table = c.req.param('table')
  const allowedTables: Record<string, { query: string; columns: string[] }> = {
    patients: {
      query: 'SELECT id, chart_number, patient_name, phone, birth_date, gender, patient_type, visit_source, first_visit_date, last_visit_date, visit_count, treatment_area, primary_doctor, assigned_counselor, addr_sido, addr_sigungu, status, created_at FROM patients WHERE hospital_id=? ORDER BY created_at DESC LIMIT 10000',
      columns: ['ID', '차트번호', '이름', '전화번호', '생년월일', '성별', '환자유형', '유입경로', '초진일', '최근내원일', '내원횟수', '진료영역', '담당의', '상담사', '시도', '시군구', '상태', '등록일'],
    },
    daily_records: {
      query: 'SELECT record_date, revenue_non_insurance, revenue_insurance, new_patients, existing_patients, total_consultations, inbound_calls, outbound_calls, cancel_count, complaint_count, avg_wait_time, naver_reviews, notes FROM daily_records WHERE hospital_id=? ORDER BY record_date DESC LIMIT 5000',
      columns: ['날짜', '비급여매출', '급여매출', '신환수', '구환수', '상담건수', '인바운드콜', '아웃바운드콜', '취소건수', '컴플레인', '평균대기시간', '네이버리뷰', '비고'],
    },
    consult_records: {
      query: 'SELECT id, patient_name, consult_date, counselor_name, doctor_name, treatment_type, chief_complaint, status, estimated_amount, agreed_amount, payment_method, next_appointment, created_at FROM consult_records WHERE hospital_id=? ORDER BY consult_date DESC LIMIT 10000',
      columns: ['ID', '환자명', '상담일', '상담사', '의사', '진료유형', '주소', '상태', '견적금액', '동의금액', '결제방식', '다음예약', '등록일'],
    },
    call_records: {
      query: "SELECT call_date, call_time, call_type, caller_name, phone, staff_name, duration, status, purpose, result, notes, created_at FROM call_records WHERE hospital_id=? ORDER BY call_date DESC, call_time DESC LIMIT 20000",
      columns: ['날짜', '시간', '유형', '발신자', '전화번호', '직원', '통화시간', '상태', '목적', '결과', '메모', '등록일'],
    },
    complaints: {
      query: 'SELECT complaint_date, patient_name, part, category, severity, description, resolution, resolver, status, created_at FROM complaints WHERE hospital_id=? ORDER BY complaint_date DESC LIMIT 5000',
      columns: ['날짜', '환자명', '파트', '카테고리', '심각도', '내용', '해결내용', '해결자', '상태', '등록일'],
    },
    kpi_targets: {
      query: 'SELECT year_month, target_revenue, insurance_ratio, target_new_patients_weekday, target_new_patients_weekend, total_hours, weekdays, weekend_days, notes, updated_at FROM kpi_targets WHERE hospital_id=? ORDER BY year_month DESC',
      columns: ['월', '목표매출', '보험비율', '신환목표(평일)', '신환목표(주말)', '총시간', '평일수', '주말수', '비고', '수정일'],
    },
  }

  const spec = allowedTables[table]
  if (!spec) return c.json({ error: '지원하지 않는 테이블입니다. 가능: ' + Object.keys(allowedTables).join(', ') }, 400)

  const rows = await c.env.DB.prepare(spec.query).bind(user.hospitalId).all()
  
  // Build CSV
  const csvRows = [spec.columns.join(',')]
  for (const row of (rows.results || []) as any[]) {
    const vals = Object.values(row).map(v => {
      if (v === null || v === undefined) return ''
      const s = String(v).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
    })
    csvRows.push(vals.join(','))
  }

  // Log export
  await c.env.DB.prepare(
    'INSERT INTO export_logs (hospital_id, user_id, export_type, table_name, row_count, format) VALUES (?,?,?,?,?,?)'
  ).bind(user.hospitalId, user.id, 'csv', table, rows.results?.length || 0, 'csv').run()

  // Return CSV with BOM for Excel compatibility
  const bom = '\uFEFF'
  c.header('Content-Type', 'text/csv; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="${table}_${new Date().toISOString().slice(0,10)}.csv"`)
  return c.body(bom + csvRows.join('\n'))
})

// Export history
admin.get('/export-logs', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    'SELECT el.*, u.name as user_name FROM export_logs el LEFT JOIN users u ON el.user_id=u.id WHERE el.hospital_id=? ORDER BY el.created_at DESC LIMIT 50'
  ).bind(user.hospitalId).all()
  return c.json(rows.results || [])
})

/* ═══ #17 Multi-tenant Admin Console Basics ═══ */

// Hospital overview stats (admin only)
admin.get('/hospital/overview', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const [hospital, userCount, patientCount, recordCount, errorCount] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM hospitals WHERE id=?').bind(user.hospitalId).first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM users WHERE hospital_id=?').bind(user.hospitalId).first() as Promise<any>,
    c.env.DB.prepare("SELECT COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active'").bind(user.hospitalId).first() as Promise<any>,
    c.env.DB.prepare('SELECT COUNT(*) as c FROM daily_records WHERE hospital_id=?').bind(user.hospitalId).first() as Promise<any>,
    c.env.DB.prepare("SELECT COUNT(*) as c FROM error_logs WHERE hospital_id=? AND created_at>datetime('now','-7 days')").bind(user.hospitalId).first() as Promise<any>,
  ])
  
  let settings = {}
  try { settings = JSON.parse((hospital as any)?.settings || '{}') } catch {}

  return c.json({
    hospital: {
      id: (hospital as any)?.id,
      name: (hospital as any)?.name,
      business_number: (hospital as any)?.business_number,
      phone: (hospital as any)?.phone,
      address: (hospital as any)?.address,
      created_at: (hospital as any)?.created_at,
      onboarding_completed: (hospital as any)?.onboarding_completed,
    },
    settings,
    stats: {
      users: userCount?.c || 0,
      activePatients: patientCount?.c || 0,
      dailyRecords: recordCount?.c || 0,
      recentErrors: errorCount?.c || 0,
    }
  })
})

/* ═══ #12 Data Gap Detection API ═══ */
admin.get('/data-gaps', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  
  // Find gaps in daily_records
  const minMax = await c.env.DB.prepare(
    'SELECT MIN(record_date) as first_date, MAX(record_date) as last_date, COUNT(*) as total_days FROM daily_records WHERE hospital_id=?'
  ).bind(user.hospitalId).first() as any

  // Count by year-month
  const monthly = await c.env.DB.prepare(
    "SELECT substr(record_date,1,7) as month, COUNT(*) as days FROM daily_records WHERE hospital_id=? GROUP BY substr(record_date,1,7) ORDER BY month"
  ).bind(user.hospitalId).all()

  // Missing months detection
  const existingMonths = new Set((monthly.results || []).map((r: any) => r.month))
  const missingMonths: string[] = []
  if (minMax?.first_date && minMax?.last_date) {
    const start = new Date(minMax.first_date)
    const end = new Date(minMax.last_date)
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const ym = cur.toISOString().slice(0, 7)
      if (!existingMonths.has(ym)) missingMonths.push(ym)
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  return c.json({
    range: { first: minMax?.first_date, last: minMax?.last_date, totalDays: minMax?.total_days || 0 },
    monthly: monthly.results,
    missingMonths,
    recommendation: missingMonths.length > 0 
      ? `${missingMonths.length}개월의 데이터가 누락되어 있습니다. 엑셀 데이터가 있다면 일괄 업로드를 권장합니다.`
      : '데이터가 연속적으로 잘 입력되어 있습니다.'
  })
})

export default admin
