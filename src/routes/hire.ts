import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody, validateFile } from '../lib/middleware'

const hire = new Hono<{ Bindings: Bindings; Variables: Variables }>()

hire.get('/postings', async (c) => {
  const user = c.get('user')!
  const status = sanitizeString(c.req.query('status') || '', 20)
  let sql = 'SELECT jp.*, u.name as created_by_name, (SELECT COUNT(*) FROM applicants WHERE job_posting_id=jp.id) as applicant_count FROM job_postings jp LEFT JOIN users u ON jp.created_by=u.id WHERE jp.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND jp.status=?'; params.push(status) }
  sql += ' ORDER BY jp.created_at DESC LIMIT 100'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/postings', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    position_type: { type: 'string', max: 50 },
    employment_type: { type: 'enum', values: ['full_time','part_time','contract','intern'] },
    description: { type: 'string', max: 10000 },
    requirements: { type: 'string', max: 5000 },
    benefits: { type: 'string', max: 5000 },
    salary_min: { type: 'number', min: 0, max: 999999999 },
    salary_max: { type: 'number', min: 0, max: 999999999 },
    deadline: { type: 'string', max: 20 },
  })
  if (!b.title || !b.position_type) return c.json({ error: '직책과 제목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.title, b.position_type, b.employment_type||'full_time', b.description||'', b.requirements||'', b.benefits||'', b.salary_min||null, b.salary_max||null, 'open', user.id, b.deadline||null).run()
  return c.json({ id })
})

hire.put('/postings/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const raw = await c.req.json()
  const allowed = ['title','position_type','employment_type','description','requirements','benefits','salary_min','salary_max','status','deadline']
  const updates: string[] = []; const params: any[] = []
  for (const f of allowed) {
    if (raw[f] !== undefined) {
      const val = ['salary_min','salary_max'].includes(f) ? sanitizeNumber(raw[f], 0, 0, 999999999) : sanitizeString(String(raw[f]), f === 'description' ? 10000 : 500)
      updates.push(`${f}=?`); params.push(val)
    }
  }
  if (!updates.length) return c.json({ error: '수정할 항목이 없습니다' }, 400)
  updates.push('updated_at=CURRENT_TIMESTAMP'); params.push(id, user.hospitalId)
  await c.env.DB.prepare(`UPDATE job_postings SET ${updates.join(',')} WHERE id=? AND hospital_id=?`).bind(...params).run()
  return c.json({ success: true })
})

hire.delete('/postings/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM job_postings WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Applicants API ─── */
hire.get('/postings/:id/applicants', async (c) => {
  const user = c.get('user')!
  const jobId = c.req.param('id')
  const rows = await c.env.DB.prepare('SELECT a.*, (SELECT COUNT(*) FROM interviews WHERE applicant_id=a.id) as interview_count, (SELECT COUNT(*) FROM evaluations WHERE applicant_id=a.id) as eval_count FROM applicants a WHERE a.job_posting_id=? AND a.hospital_id=? ORDER BY CASE a.status WHEN \'applied\' THEN 0 WHEN \'screening\' THEN 1 WHEN \'interview\' THEN 2 WHEN \'evaluation\' THEN 3 WHEN \'offer\' THEN 4 WHEN \'hired\' THEN 5 WHEN \'rejected\' THEN 6 ELSE 7 END, a.applied_at DESC LIMIT 200').bind(jobId, user.hospitalId).all()
  return c.json(rows.results)
})

hire.get('/applicants', async (c) => {
  const user = c.get('user')!
  const status = sanitizeString(c.req.query('status') || '', 20)
  let sql = 'SELECT a.*, jp.title as job_title FROM applicants a JOIN job_postings jp ON a.job_posting_id=jp.id WHERE a.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND a.status=?'; params.push(status) }
  sql += ' ORDER BY a.applied_at DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/applicants', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    job_posting_id: { type: 'string', max: 100 },
    name: { type: 'string', max: 100 },
    email: { type: 'string', max: 200 },
    phone: { type: 'string', max: 20 },
    cover_letter: { type: 'string', max: 10000 },
    notes: { type: 'string', max: 5000 },
  })
  if (!b.job_posting_id || !b.name) return c.json({ error: '공고와 이름을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO applicants (id, hospital_id, job_posting_id, name, email, phone, cover_letter, notes) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.job_posting_id, b.name, b.email||'', b.phone||'', b.cover_letter||'', b.notes||'').run()
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
  const file = form.get('file') as File
  if (!file) return c.json({ error: '파일을 선택해주세요' }, 400)
  const fv = validateFile(file, 10)
  if (!fv.valid) return c.json({ error: fv.error }, 400)
  const key = `resumes/${user.hospitalId}/${appId}.${fv.ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const resumeUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('UPDATE applicants SET resume_url=? WHERE id=? AND hospital_id=?').bind(resumeUrl, appId, user.hospitalId).run()
  return c.json({ resume_url: resumeUrl })
})

/* ─── PF Hire: Interviews API ─── */
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
  })
  if (!b.applicant_id || !b.scheduled_at) return c.json({ error: '지원자와 일정을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at, duration_min, interview_type, location) VALUES (?,?,?,?,?,?,?,?)').bind(id, b.applicant_id, user.hospitalId, user.id, b.scheduled_at, b.duration_min||30, b.interview_type||'onsite', b.location||'').run()
  return c.json({ id })
})

hire.put('/interviews/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    status: { type: 'enum', values: ['scheduled','completed','cancelled','no_show'] },
    feedback: { type: 'string', max: 5000 },
    score: { type: 'number', min: 0, max: 100 },
  })
  const updates: string[] = []; const params: any[] = []
  if (b.status) { updates.push('status=?'); params.push(b.status) }
  if (b.feedback !== undefined) { updates.push('feedback=?'); params.push(b.feedback) }
  if (b.score !== undefined) { updates.push('score=?'); params.push(b.score) }
  if (!updates.length) return c.json({ error: '수정할 항목이 없습니다' }, 400)
  params.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE interviews SET ${updates.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?`).bind(...params).run()
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
