import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const hire = new Hono<{ Bindings: Bindings; Variables: Variables }>()

hire.get('/postings', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  let sql = 'SELECT jp.*, u.name as created_by_name, (SELECT COUNT(*) FROM applicants WHERE job_posting_id=jp.id) as applicant_count FROM job_postings jp LEFT JOIN users u ON jp.created_by=u.id WHERE jp.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND jp.status=?'; params.push(status) }
  sql += ' ORDER BY jp.created_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/postings', async (c) => {
  const user = c.get('user')!
  const { title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, deadline } = await c.req.json()
  if (!title || !position_type) return c.json({ error: '직책과 제목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO job_postings (id, hospital_id, title, position_type, employment_type, description, requirements, benefits, salary_min, salary_max, status, created_by, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, title, position_type, employment_type||'full_time', description||'', requirements||'', benefits||'', salary_min||null, salary_max||null, 'open', user.id, deadline||null).run()
  return c.json({ id })
})

hire.put('/postings/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields = ['title','position_type','employment_type','description','requirements','benefits','salary_min','salary_max','status','deadline']
  const updates: string[] = []
  const params: any[] = []
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f}=?`); params.push(body[f]) }
  }
  if (!updates.length) return c.json({ error: '수정할 항목이 없습니다' }, 400)
  updates.push('updated_at=CURRENT_TIMESTAMP')
  params.push(id, user.hospitalId)
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
  const rows = await c.env.DB.prepare('SELECT a.*, (SELECT COUNT(*) FROM interviews WHERE applicant_id=a.id) as interview_count, (SELECT COUNT(*) FROM evaluations WHERE applicant_id=a.id) as eval_count FROM applicants a WHERE a.job_posting_id=? AND a.hospital_id=? ORDER BY CASE a.status WHEN \'applied\' THEN 0 WHEN \'screening\' THEN 1 WHEN \'interview\' THEN 2 WHEN \'evaluation\' THEN 3 WHEN \'offer\' THEN 4 WHEN \'hired\' THEN 5 WHEN \'rejected\' THEN 6 ELSE 7 END, a.applied_at DESC').bind(jobId, user.hospitalId).all()
  return c.json(rows.results)
})

hire.get('/applicants', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  let sql = 'SELECT a.*, jp.title as job_title FROM applicants a JOIN job_postings jp ON a.job_posting_id=jp.id WHERE a.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND a.status=?'; params.push(status) }
  sql += ' ORDER BY a.applied_at DESC'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/applicants', async (c) => {
  const user = c.get('user')!
  const { job_posting_id, name, email, phone, cover_letter, notes } = await c.req.json()
  if (!job_posting_id || !name) return c.json({ error: '공고와 이름을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO applicants (id, hospital_id, job_posting_id, name, email, phone, cover_letter, notes) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, job_posting_id, name, email||'', phone||'', cover_letter||'', notes||'').run()
  return c.json({ id })
})

hire.put('/applicants/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const { status, rating, notes } = await c.req.json()
  const updates: string[] = ['updated_at=CURRENT_TIMESTAMP']
  const params: any[] = []
  if (status !== undefined) { updates.push('status=?'); params.push(status) }
  if (rating !== undefined) { updates.push('rating=?'); params.push(rating) }
  if (notes !== undefined) { updates.push('notes=?'); params.push(notes) }
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
  const ext = file.name.split('.').pop() || 'pdf'
  const key = `resumes/${user.hospitalId}/${appId}.${ext}`
  await c.env.R2.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  const resumeUrl = `/api/protected/files/${key}`
  await c.env.DB.prepare('UPDATE applicants SET resume_url=? WHERE id=? AND hospital_id=?').bind(resumeUrl, appId, user.hospitalId).run()
  return c.json({ resume_url: resumeUrl })
})

/* ─── PF Hire: Interviews API ─── */
hire.get('/applicants/:id/interviews', async (c) => {
  const rows = await c.env.DB.prepare('SELECT i.*, u.name as interviewer_name FROM interviews i LEFT JOIN users u ON i.interviewer_id=u.id WHERE i.applicant_id=? ORDER BY i.scheduled_at DESC').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

hire.post('/interviews', async (c) => {
  const user = c.get('user')!
  const { applicant_id, scheduled_at, duration_min, interview_type, location } = await c.req.json()
  if (!applicant_id || !scheduled_at) return c.json({ error: '지원자와 일정을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO interviews (id, applicant_id, hospital_id, interviewer_id, scheduled_at, duration_min, interview_type, location) VALUES (?,?,?,?,?,?,?,?)').bind(id, applicant_id, user.hospitalId, user.id, scheduled_at, duration_min||30, interview_type||'onsite', location||'').run()
  return c.json({ id })
})

hire.put('/interviews/:id', async (c) => {
  const { status, feedback, score } = await c.req.json()
  const updates: string[] = []
  const params: any[] = []
  if (status) { updates.push('status=?'); params.push(status) }
  if (feedback !== undefined) { updates.push('feedback=?'); params.push(feedback) }
  if (score !== undefined) { updates.push('score=?'); params.push(score) }
  params.push(c.req.param('id'))
  await c.env.DB.prepare(`UPDATE interviews SET ${updates.join(',')} WHERE id=?`).bind(...params).run()
  return c.json({ success: true })
})

/* ─── PF Hire: Evaluations API ─── */
// 채용 평가 - admin/manager만 조회 가능
hire.get('/applicants/:id/evaluations', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '평가 열람 권한이 없습니다' }, 403)
  const rows = await c.env.DB.prepare('SELECT e.*, u.name as evaluator_name FROM evaluations e JOIN users u ON e.evaluator_id=u.id WHERE e.applicant_id=? ORDER BY e.created_at DESC').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

// 채용 평가 작성 - admin/manager만
hire.post('/evaluations', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '평가 작성 권한이 없습니다' }, 403)
  const { applicant_id, criteria, total_score, max_score, comments, recommendation } = await c.req.json()
  if (!applicant_id || !criteria) return c.json({ error: '평가 항목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO evaluations (id, applicant_id, evaluator_id, criteria, total_score, max_score, comments, recommendation) VALUES (?,?,?,?,?,?,?,?)').bind(id, applicant_id, user.id, JSON.stringify(criteria), total_score||0, max_score||100, comments||'', recommendation||'neutral').run()
  return c.json({ id })
})

/* ─── PF Hire: Onboarding API ─── */
hire.get('/onboarding', async (c) => {
  const user = c.get('user')!
  const appId = c.req.query('applicant_id')
  let sql = 'SELECT ot.*, u.name as assigned_to_name, a.name as applicant_name FROM onboarding_tasks ot LEFT JOIN users u ON ot.assigned_to=u.id LEFT JOIN applicants a ON ot.applicant_id=a.id WHERE ot.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (appId) { sql += ' AND ot.applicant_id=?'; params.push(appId) }
  sql += ' ORDER BY CASE ot.status WHEN \'pending\' THEN 0 WHEN \'in_progress\' THEN 1 ELSE 2 END, ot.created_at'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

hire.post('/onboarding', async (c) => {
  const user = c.get('user')!
  const { applicant_id, title, description, category, assigned_to, due_date } = await c.req.json()
  if (!title) return c.json({ error: '제목을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO onboarding_tasks (id, hospital_id, applicant_id, title, description, category, assigned_to, due_date) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, applicant_id||null, title, description||'', category||'general', assigned_to||null, due_date||null).run()
  return c.json({ id })
})

hire.put('/onboarding/:id', async (c) => {
  const user = c.get('user')!
  const { status } = await c.req.json()
  const completed = status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE onboarding_tasks SET status=?, completed_at=? WHERE id=? AND hospital_id=?').bind(status, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})


export default hire
