import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody, validateFile } from '../lib/middleware'

/* ═══════════════════════════════════════════════════════════════════
 * PF Hire — 채용 관리 (v5.13.0)
 *
 * ⚠️ 채용공고(job_postings) 기능은 제거됐다. (migrations/0048)
 *    지원자는 공고에 매달리지 않고 독립적으로 등록되며,
 *    position_type / employment_type 을 지원자가 직접 갖는다.
 *    면접은 캘린더(월별)로 본다 — GET /interviews/calendar
 * ═══════════════════════════════════════════════════════════════════ */

const hire = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const POSITION_TYPES = ['dentist','hygienist','assistant','coordinator','receptionist','manager','other'] as const
const EMPLOYMENT_TYPES = ['full_time','part_time','contract','intern'] as const

export const POSITION_LABELS: Record<string, string> = {
  dentist: '치과의사', hygienist: '치과위생사', assistant: '진료스텝',
  coordinator: '상담실장', receptionist: '데스크', manager: '관리자', other: '기타',
}

/* ─── PF Hire: Applicants API ─── */
hire.get('/applicants', async (c) => {
  const user = c.get('user')!
  const status = sanitizeString(c.req.query('status') || '', 20)
  const position = sanitizeString(c.req.query('position') || '', 30)
  const q = sanitizeString(c.req.query('q') || '', 100)

  let sql = `SELECT a.*,
    (SELECT COUNT(*) FROM interviews WHERE applicant_id=a.id) AS interview_count,
    (SELECT COUNT(*) FROM evaluations WHERE applicant_id=a.id) AS eval_count,
    (SELECT MIN(scheduled_at) FROM interviews WHERE applicant_id=a.id AND status='scheduled') AS next_interview_at
    FROM applicants a WHERE a.hospital_id=?`
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND a.status=?'; params.push(status) }
  if (position) { sql += ' AND a.position_type=?'; params.push(position) }
  if (q) { sql += ' AND (a.name LIKE ? OR a.phone LIKE ? OR a.email LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  sql += ` ORDER BY CASE a.status
      WHEN 'applied' THEN 0 WHEN 'screening' THEN 1 WHEN 'interview' THEN 2
      WHEN 'evaluation' THEN 3 WHEN 'offer' THEN 4 WHEN 'hired' THEN 5
      WHEN 'rejected' THEN 6 ELSE 7 END, a.applied_at DESC LIMIT 300`

  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/applicants', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    name: { type: 'string', max: 100 },
    position_type: { type: 'enum', values: [...POSITION_TYPES] },
    employment_type: { type: 'enum', values: [...EMPLOYMENT_TYPES] },
    source: { type: 'string', max: 100 },
    email: { type: 'string', max: 200 },
    phone: { type: 'string', max: 20 },
    cover_letter: { type: 'string', max: 10000 },
    notes: { type: 'string', max: 5000 },
  })
  if (!b.name) return c.json({ error: '지원자 이름을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO applicants (id, hospital_id, name, position_type, employment_type, source,
      email, phone, cover_letter, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, user.hospitalId, b.name, b.position_type || 'other', b.employment_type || 'full_time',
    b.source || '', b.email || '', b.phone || '', b.cover_letter || '', b.notes || ''
  ).run()
  return c.json({ id })
})

hire.put('/applicants/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    status: { type: 'enum', values: ['applied','screening','interview','evaluation','offer','hired','rejected','withdrawn'] },
    rating: { type: 'number', min: 0, max: 10 },
    notes: { type: 'string', max: 5000 },
  })
  const updates: string[] = ['updated_at=CURRENT_TIMESTAMP']; const params: any[] = []
  if (b.status !== undefined && b.status !== null) { updates.push('status=?'); params.push(b.status) }
  if (b.rating !== undefined) { updates.push('rating=?'); params.push(b.rating) }
  if (b.notes !== undefined) { updates.push('notes=?'); params.push(b.notes) }
  params.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE applicants SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...params).run()
  return c.json({ success: true })
})

hire.delete('/applicants/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM applicants WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Resume Upload ─── */
hire.post('/applicants/:id/resume', async (c) => {
  const user = c.get('user')!
  const appId = c.req.param('id')
  const form = await c.req.formData()
  const file = form.get('file') as unknown as File
  if (!file) return c.json({ error: '파일을 선택해주세요' }, 400)
  const fv = validateFile(file, 10)
  if (!fv.valid) return c.json({ error: fv.error }, 400)
  const key = `resumes/${user.hospitalId}/${appId}.${fv.ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const resumeUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('UPDATE applicants SET resume_url=? WHERE id=? AND hospital_id=?').bind(resumeUrl, appId, user.hospitalId).run()
  return c.json({ resume_url: resumeUrl })
})

/* ═══ PF Hire: Interviews API — 면접 캘린더 ═══
 * 채용공고가 사라진 뒤 채용 모듈의 중심축은 "면접 일정"이다.
 * 캘린더는 월 단위로 조회한다: GET /interviews/calendar?month=2026-08
 * ─── N+1 방지: 지원자별 개별 호출 대신 병원 전체를 JOIN 한 번으로 조회 */
hire.get('/interviews', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 30)
  const to = sanitizeString(c.req.query('to') || '', 30)
  const status = sanitizeString(c.req.query('status') || '', 20)

  let sql = `SELECT i.*, u.name AS interviewer_name,
      a.name AS applicant_name, a.position_type, a.phone AS applicant_phone
    FROM interviews i
    LEFT JOIN users u ON i.interviewer_id = u.id
    LEFT JOIN applicants a ON i.applicant_id = a.id
    WHERE i.hospital_id = ?`
  const params: any[] = [user.hospitalId]
  if (from) { sql += ' AND i.scheduled_at >= ?'; params.push(from) }
  if (to) { sql += ' AND i.scheduled_at <= ?'; params.push(to) }
  if (status) { sql += ' AND i.status = ?'; params.push(status) }
  sql += ' ORDER BY i.scheduled_at DESC LIMIT 500'

  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

/* GET /interviews/calendar?month=YYYY-MM
 * 월별 캘린더용. 날짜별로 미리 묶어서 내려주므로 프론트는 셀에 꽂기만 하면 된다.
 * ⚠️ 라우트 순서 주의: '/interviews/:id' 보다 먼저 선언해야 'calendar'가 id로 먹히지 않는다.
 *    (현재 :id 는 PUT 에만 있어 충돌은 없지만, 나중에 GET /:id 를 추가할 때를 대비) */
hire.get('/interviews/calendar', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0, 7), 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return c.json({ error: '월 형식이 올바르지 않습니다 (YYYY-MM)' }, 400)

  const rows = await c.env.DB.prepare(`
    SELECT i.id, i.applicant_id, i.scheduled_at, i.duration_min, i.interview_type,
           i.location, i.status, i.score, i.title, i.memo,
           u.name AS interviewer_name,
           a.name AS applicant_name, a.position_type, a.phone AS applicant_phone, a.status AS applicant_status
    FROM interviews i
    LEFT JOIN users u ON i.interviewer_id = u.id
    LEFT JOIN applicants a ON i.applicant_id = a.id
    WHERE i.hospital_id = ? AND i.scheduled_at LIKE ?
    ORDER BY i.scheduled_at
  `).bind(user.hospitalId, month + '%').all()

  const list = (rows.results || []) as any[]
  // 날짜(YYYY-MM-DD) → 면접 배열
  const byDate: Record<string, any[]> = {}
  for (const r of list) {
    const day = String(r.scheduled_at || '').slice(0, 10)
    if (!day) continue
    ;(byDate[day] ||= []).push(r)
  }

  const summary = {
    total: list.length,
    scheduled: list.filter((r) => r.status === 'scheduled').length,
    completed: list.filter((r) => r.status === 'completed').length,
    cancelled: list.filter((r) => r.status === 'cancelled').length,
    no_show: list.filter((r) => r.status === 'no_show').length,
  }

  return c.json({ month, byDate, summary, positionLabels: POSITION_LABELS })
})

hire.get('/applicants/:id/interviews', async (c) => {
  const user = c.get('user')!
  // IDOR 방지: 해당 병원의 지원자인지 확인
  const applicant = await c.env.DB.prepare('SELECT id FROM applicants WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!applicant) return c.json({ error: '지원자를 찾을 수 없습니다' }, 404)
  const rows = await c.env.DB.prepare('SELECT i.*, u.name as interviewer_name FROM interviews i LEFT JOIN users u ON i.interviewer_id=u.id WHERE i.applicant_id=? AND i.hospital_id=? ORDER BY i.scheduled_at DESC LIMIT 50').bind(c.req.param('id'), user.hospitalId).all()
  return c.json(rows.results)
})

hire.post('/interviews', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    applicant_id: { type: 'string', max: 100 },
    scheduled_at: { type: 'string', max: 30 },
    duration_min: { type: 'number', min: 10, max: 480, default: 30 },
    interview_type: { type: 'enum', values: ['onsite','phone','video'] },
    location: { type: 'string', max: 200 },
    interviewer_id: { type: 'string', max: 100 },
    title: { type: 'string', max: 100 },
    memo: { type: 'string', max: 2000 },
  })
  if (!b.applicant_id || !b.scheduled_at) return c.json({ error: '지원자와 일정을 입력해주세요' }, 400)

  // 🔒 IDOR 방지: 우리 병원 지원자인지 확인 (남의 병원 지원자에게 면접을 꽂지 못하게)
  const applicant = await c.env.DB.prepare('SELECT id, name FROM applicants WHERE id=? AND hospital_id=?')
    .bind(b.applicant_id, user.hospitalId).first<any>()
  if (!applicant) return c.json({ error: '지원자를 찾을 수 없습니다' }, 404)

  // 면접관을 지정했다면 우리 병원 직원인지도 확인
  let interviewerId = user.id
  if (b.interviewer_id) {
    const iv = await c.env.DB.prepare('SELECT id FROM users WHERE id=? AND hospital_id=?')
      .bind(b.interviewer_id, user.hospitalId).first()
    if (!iv) return c.json({ error: '면접관을 찾을 수 없습니다' }, 400)
    interviewerId = b.interviewer_id
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at,
      duration_min, interview_type, location, title, memo) VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, b.applicant_id, user.hospitalId, interviewerId, b.scheduled_at,
    b.duration_min || 30, b.interview_type || 'onsite', b.location || '',
    b.title || '', b.memo || ''
  ).run()

  // 면접이 잡히면 지원자 상태를 'interview' 로 자동 전진 (뒤로 가지는 않음)
  await c.env.DB.prepare(
    `UPDATE applicants SET status='interview', updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND hospital_id=? AND status IN ('applied','screening')`
  ).bind(b.applicant_id, user.hospitalId).run()

  return c.json({ id })
})

hire.put('/interviews/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    status: { type: 'enum', values: ['scheduled','completed','cancelled','no_show'] },
    feedback: { type: 'string', max: 5000 },
    score: { type: 'number', min: 0, max: 100 },
    scheduled_at: { type: 'string', max: 30 },
    duration_min: { type: 'number', min: 10, max: 480 },
    interview_type: { type: 'enum', values: ['onsite','phone','video'] },
    location: { type: 'string', max: 200 },
    interviewer_id: { type: 'string', max: 100 },
    title: { type: 'string', max: 100 },
    memo: { type: 'string', max: 2000 },
  })
  const updates: string[] = []; const params: any[] = []
  if (b.status) { updates.push('status=?'); params.push(b.status) }
  if (b.feedback !== undefined) { updates.push('feedback=?'); params.push(b.feedback) }
  if (b.score !== undefined) { updates.push('score=?'); params.push(b.score) }
  if (b.scheduled_at) { updates.push('scheduled_at=?'); params.push(b.scheduled_at) }
  if (b.duration_min) { updates.push('duration_min=?'); params.push(b.duration_min) }
  if (b.interview_type) { updates.push('interview_type=?'); params.push(b.interview_type) }
  if (b.location !== undefined) { updates.push('location=?'); params.push(b.location) }
  if (b.title !== undefined) { updates.push('title=?'); params.push(b.title) }
  if (b.memo !== undefined) { updates.push('memo=?'); params.push(b.memo) }
  if (b.interviewer_id) {
    const iv = await c.env.DB.prepare('SELECT id FROM users WHERE id=? AND hospital_id=?')
      .bind(b.interviewer_id, user.hospitalId).first()
    if (!iv) return c.json({ error: '면접관을 찾을 수 없습니다' }, 400)
    updates.push('interviewer_id=?'); params.push(b.interviewer_id)
  }
  if (!updates.length) return c.json({ error: '수정할 항목이 없습니다' }, 400)
  params.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(
    `UPDATE interviews SET ${updates.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`
  ).bind(...params).run()
  return c.json({ success: true })
})

hire.delete('/interviews/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM interviews WHERE id=? AND hospital_id=?')
    .bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Evaluations API ─── */
hire.get('/applicants/:id/evaluations', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '평가 열람 권한이 없습니다' }, 403)
  // IDOR 방지: 해당 병원의 지원자인지 확인
  const applicant = await c.env.DB.prepare('SELECT id FROM applicants WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!applicant) return c.json({ error: '지원자를 찾을 수 없습니다' }, 404)
  const rows = await c.env.DB.prepare('SELECT e.*, u.name as evaluator_name FROM evaluations e JOIN users u ON e.evaluator_id=u.id WHERE e.applicant_id=? AND e.hospital_id=? ORDER BY e.created_at DESC LIMIT 50').bind(c.req.param('id'), user.hospitalId).all()
  return c.json(rows.results)
})

hire.post('/evaluations', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '평가 작성 권한이 없습니다' }, 403)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    applicant_id: { type: 'string', max: 100 },
    criteria: { type: 'json' },
    total_score: { type: 'number', min: 0, max: 1000 },
    max_score: { type: 'number', min: 1, max: 1000, default: 100 },
    comments: { type: 'string', max: 5000 },
    recommendation: { type: 'enum', values: ['strongly_recommend','recommend','neutral','not_recommend','strongly_not_recommend'] },
  })
  if (!b.applicant_id || !b.criteria) return c.json({ error: '평가 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  // IDOR 방지: 해당 병원의 지원자인지 확인
  const applicant = await c.env.DB.prepare('SELECT id FROM applicants WHERE id=? AND hospital_id=?').bind(b.applicant_id, user.hospitalId).first()
  if (!applicant) return c.json({ error: '지원자를 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare('INSERT INTO evaluations (id, applicant_id, hospital_id, evaluator_id, criteria, total_score, max_score, comments, recommendation) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, b.applicant_id, user.hospitalId, user.id, JSON.stringify(b.criteria), b.total_score||0, b.max_score||100, b.comments||'', b.recommendation||'neutral').run()
  return c.json({ id })
})

/* ─── PF Hire: Onboarding API ─── */
hire.get('/onboarding', async (c) => {
  const user = c.get('user')!
  const appId = sanitizeString(c.req.query('applicant_id') || '', 100)
  let sql = 'SELECT ot.*, u.name as assigned_to_name, a.name as applicant_name FROM onboarding_tasks ot LEFT JOIN users u ON ot.assigned_to=u.id LEFT JOIN applicants a ON ot.applicant_id=a.id WHERE ot.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (appId) { sql += ' AND ot.applicant_id=?'; params.push(appId) }
  sql += ' ORDER BY CASE ot.status WHEN \'pending\' THEN 0 WHEN \'in_progress\' THEN 1 ELSE 2 END, ot.created_at LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/onboarding', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    applicant_id: { type: 'string', max: 100 },
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 5000 },
    category: { type: 'string', max: 50 },
    assigned_to: { type: 'string', max: 100 },
    due_date: { type: 'string', max: 20 },
  })
  if (!b.title) return c.json({ error: '제목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO onboarding_tasks (id, hospital_id, applicant_id, title, description, category, assigned_to, due_date) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.applicant_id||null, b.title, b.description||'', b.category||'general', b.assigned_to||null, b.due_date||null).run()
  return c.json({ id })
})

hire.put('/onboarding/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, { status: { type: 'enum', values: ['pending','in_progress','completed'] } })
  const completed = b.status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE onboarding_tasks SET status=?, completed_at=? WHERE id=? AND hospital_id=?').bind(b.status, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default hire
