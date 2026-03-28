import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const surveys = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 설문 CRUD (관리자만) ═══ */

// 설문 목록
surveys.get('/', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    'SELECT id, title, description, is_active, auto_send, send_delay_hours, expire_days, response_count, avg_nps, created_at, updated_at FROM surveys WHERE hospital_id=? ORDER BY created_at DESC LIMIT 50'
  ).bind(user.hospitalId).all()
  return c.json(rows?.results || [])
})

/* ═══ SMS 설정 (병원 설정에 저장) — /:id 라우트보다 먼저 등록! ═══ */

surveys.get('/sms-config', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 조회 가능합니다' }, 403)
  const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(row?.settings || '{}') } catch (e) { /* ignore */ }
  const cfg = settings.sms_config || {}
  return c.json({
    configured: !!(cfg.api_key && cfg.user_id && cfg.sender),
    user_id: cfg.user_id || '',
    sender: cfg.sender || '',
    has_api_key: !!cfg.api_key,
  })
})

surveys.put('/sms-config', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const cfg = {
    api_key: sanitizeString(raw.api_key || '', 100),
    user_id: sanitizeString(raw.user_id || '', 50),
    sender: sanitizeString(raw.sender || '', 20).replace(/[^0-9]/g, ''),
  }
  if (!cfg.api_key || !cfg.user_id || !cfg.sender) return c.json({ error: 'API Key, User ID, 발신번호를 모두 입력해주세요' }, 400)

  const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(row?.settings || '{}') } catch (e) { /* ignore */ }
  settings.sms_config = cfg
  await c.env.DB.prepare('UPDATE hospitals SET settings=?, updated_at=? WHERE id=?').bind(JSON.stringify(settings), new Date().toISOString(), user.hospitalId).run()
  return c.json({ success: true })
})

// 설문 상세
surveys.get('/:id', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare(
    'SELECT * FROM surveys WHERE id=? AND hospital_id=?'
  ).bind(c.req.param('id'), user.hospitalId).first()
  if (!row) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)
  return c.json(row)
})

// 설문 생성
surveys.post('/', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 1000 },
    send_delay_hours: { type: 'number', min: 0, max: 168, default: 2 },
    expire_days: { type: 'number', min: 1, max: 90, default: 7 },
    auto_send: { type: 'number', min: 0, max: 1, default: 0 },
  })
  if (!b.title) return c.json({ error: '설문 제목을 입력해주세요' }, 400)
  const questions = raw.questions
  if (!Array.isArray(questions) || questions.length === 0) return c.json({ error: '최소 1개 이상의 질문이 필요합니다' }, 400)
  if (questions.length > 20) return c.json({ error: '질문은 최대 20개까지 가능합니다' }, 400)

  // 질문 유효성 검사
  const validTypes = ['nps', 'rating', 'choice', 'text']
  for (const q of questions) {
    if (!q.id || !q.type || !q.label) return c.json({ error: '질문 형식이 올바르지 않습니다' }, 400)
    if (!validTypes.includes(q.type)) return c.json({ error: `허용되지 않는 질문 유형: ${q.type}` }, 400)
  }

  const id = 'srv-' + crypto.randomUUID().slice(0, 8)
  await c.env.DB.prepare(
    'INSERT INTO surveys (id, hospital_id, title, description, questions, auto_send, send_delay_hours, expire_days, created_by) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, b.title, b.description || '', JSON.stringify(questions), b.auto_send || 0, b.send_delay_hours || 2, b.expire_days || 7, user.id).run()

  return c.json({ success: true, id })
})

// 설문 수정
surveys.put('/:id', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const surveyId = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM surveys WHERE id=? AND hospital_id=?').bind(surveyId, user.hospitalId).first()
  if (!existing) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)

  const raw = await c.req.json()
  const sets: string[] = []
  const vals: any[] = []

  if (raw.title !== undefined) { sets.push('title=?'); vals.push(sanitizeString(raw.title, 200)) }
  if (raw.description !== undefined) { sets.push('description=?'); vals.push(sanitizeString(raw.description, 1000)) }
  if (raw.is_active !== undefined) { sets.push('is_active=?'); vals.push(raw.is_active ? 1 : 0) }
  if (raw.auto_send !== undefined) { sets.push('auto_send=?'); vals.push(raw.auto_send ? 1 : 0) }
  if (raw.send_delay_hours !== undefined) { sets.push('send_delay_hours=?'); vals.push(sanitizeNumber(raw.send_delay_hours, 2, 0, 168)) }
  if (raw.expire_days !== undefined) { sets.push('expire_days=?'); vals.push(sanitizeNumber(raw.expire_days, 7, 1, 90)) }
  if (Array.isArray(raw.questions)) { sets.push('questions=?'); vals.push(JSON.stringify(raw.questions)) }

  if (sets.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(surveyId); vals.push(user.hospitalId)

  await c.env.DB.prepare(`UPDATE surveys SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 설문 삭제
surveys.delete('/:id', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM surveys WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══ 설문 발송 ═══ */

// 수동 발송 (개별 또는 벌크)
surveys.post('/:id/send', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const surveyId = c.req.param('id')
  const survey: any = await c.env.DB.prepare('SELECT id, title, is_active FROM surveys WHERE id=? AND hospital_id=?').bind(surveyId, user.hospitalId).first()
  if (!survey) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)
  if (!survey.is_active) return c.json({ error: '비활성 설문입니다' }, 400)

  const raw = await c.req.json()
  const recipients = raw.recipients
  if (!Array.isArray(recipients) || recipients.length === 0) return c.json({ error: '수신자를 입력해주세요' }, 400)
  if (recipients.length > 100) return c.json({ error: '한 번에 최대 100명까지 발송 가능합니다' }, 400)

  let sentCount = 0
  const errors: string[] = []

  // Aligo SMS 설정 확인 (병원 settings에서)
  const hospitalRow: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let hospitalSettings: any = {}
  try { hospitalSettings = JSON.parse(hospitalRow?.settings || '{}') } catch (e) { /* ignore */ }
  const smsConfig = hospitalSettings.sms_config || null
  const hospitalName = (await c.env.DB.prepare('SELECT name FROM hospitals WHERE id=?').bind(user.hospitalId).first() as any)?.name || '병원'

  for (const rcpt of recipients) {
    const name = sanitizeString(rcpt.patient_name || '', 100)
    const phone = sanitizeString(rcpt.patient_phone || '', 20).replace(/[^0-9]/g, '')
    if (!phone || phone.length < 10) {
      errors.push(`${name || '?'}: 전화번호 오류`)
      continue
    }

    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const sendId = 'ss-' + crypto.randomUUID().slice(0, 8)

    await c.env.DB.prepare(
      'INSERT INTO survey_sends (id, survey_id, hospital_id, patient_name, patient_phone, patient_id, doctor_name, treatment_type, visit_date, token, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      sendId, surveyId, user.hospitalId, name, phone,
      sanitizeString(rcpt.patient_id || '', 50),
      sanitizeString(rcpt.doctor_name || '', 100),
      sanitizeString(rcpt.treatment_type || '', 100),
      sanitizeString(rcpt.visit_date || '', 10),
      token, 'pending'
    ).run()

    // SMS 발송 시도
    if (smsConfig && smsConfig.api_key && smsConfig.user_id && smsConfig.sender) {
      try {
        const surveyUrl = `${new URL(c.req.url).origin}/survey/${token}`
        const msg = `[${esc(hospitalName)}] ${name}님, 진료 만족도 설문에 참여해주세요.\n${surveyUrl}\n(7일내 응답)`
        const smsResult = await sendAligoSMS(smsConfig, phone, msg)
        await c.env.DB.prepare('UPDATE survey_sends SET status=?, sent_at=?, sms_result=?, sms_message_id=? WHERE id=?')
          .bind('sent', new Date().toISOString(), smsResult.result_code || '', smsResult.msg_id || '', sendId).run()
        sentCount++
      } catch (e: any) {
        errors.push(`${name}: SMS 발송 실패 - ${e.message}`)
        await c.env.DB.prepare("UPDATE survey_sends SET sms_result=? WHERE id=?").bind('error:' + (e.message || ''), sendId).run()
      }
    } else {
      // SMS 미설정 – 상태만 pending으로 유지 (수동 링크 공유용)
      sentCount++
    }
  }

  return c.json({
    success: true,
    sent: sentCount,
    errors: errors.length ? errors : undefined,
    smsConfigured: !!(smsConfig && smsConfig.api_key),
  })
})

// 발송 기록 목록
surveys.get('/:id/sends', async (c) => {
  const user = c.get('user')!
  const surveyId = c.req.param('id')
  const page = sanitizeNumber(Number(c.req.query('page')), 1, 1, 999)
  const limit = 30
  const offset = (page - 1) * limit

  const [total, rows] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM survey_sends WHERE survey_id=? AND hospital_id=?').bind(surveyId, user.hospitalId).first(),
    c.env.DB.prepare(
      'SELECT id, patient_name, patient_phone, doctor_name, treatment_type, visit_date, token, status, sent_at, opened_at, completed_at FROM survey_sends WHERE survey_id=? AND hospital_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(surveyId, user.hospitalId, limit, offset).all(),
  ])

  return c.json({ total: (total as any)?.c || 0, data: rows?.results || [], page, limit })
})

/* ═══ NPS / 응답 분석 ═══ */

surveys.get('/:id/analytics', async (c) => {
  const user = c.get('user')!
  const surveyId = c.req.param('id')

  const [survey, sendStats, npsDistribution, responses, recentResponses] = await Promise.all([
    c.env.DB.prepare('SELECT id, title, response_count, avg_nps FROM surveys WHERE id=? AND hospital_id=?').bind(surveyId, user.hospitalId).first(),
    c.env.DB.prepare(`SELECT
      COUNT(*) as total_sent,
      SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status='opened' THEN 1 ELSE 0 END) as opened,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END) as expired
    FROM survey_sends WHERE survey_id=? AND hospital_id=?`).bind(surveyId, user.hospitalId).first(),
    c.env.DB.prepare(`SELECT
      SUM(CASE WHEN nps_score >= 9 THEN 1 ELSE 0 END) as promoters,
      SUM(CASE WHEN nps_score >= 7 AND nps_score < 9 THEN 1 ELSE 0 END) as passives,
      SUM(CASE WHEN nps_score < 7 THEN 1 ELSE 0 END) as detractors,
      COUNT(*) as total,
      ROUND(AVG(nps_score), 1) as avg_score
    FROM survey_responses WHERE survey_id=? AND hospital_id=?`).bind(surveyId, user.hospitalId).first(),
    c.env.DB.prepare(
      'SELECT sr.answers, sr.nps_score, sr.submitted_at, ss.patient_name, ss.doctor_name, ss.treatment_type FROM survey_responses sr JOIN survey_sends ss ON sr.send_id=ss.id WHERE sr.survey_id=? AND sr.hospital_id=? ORDER BY sr.submitted_at DESC LIMIT 20'
    ).bind(surveyId, user.hospitalId).all(),
    c.env.DB.prepare(`SELECT
      substr(sr.submitted_at, 1, 10) as date,
      COUNT(*) as count,
      ROUND(AVG(sr.nps_score), 1) as avg_nps
    FROM survey_responses sr WHERE sr.survey_id=? AND sr.hospital_id=?
    GROUP BY date ORDER BY date DESC LIMIT 30`).bind(surveyId, user.hospitalId).all(),
  ])

  if (!survey) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)

  const stats = (sendStats || {}) as any
  const nps = (npsDistribution || {}) as any
  const npsTotal = (nps.total || 0)
  const npsScore = npsTotal > 0
    ? Math.round(((nps.promoters || 0) / npsTotal * 100) - ((nps.detractors || 0) / npsTotal * 100))
    : 0

  return c.json({
    survey,
    sends: {
      total: stats.total_sent || 0,
      sent: stats.sent || 0,
      opened: stats.opened || 0,
      completed: stats.completed || 0,
      expired: stats.expired || 0,
      openRate: stats.total_sent > 0 ? Math.round((stats.opened || 0 + stats.completed || 0) / stats.total_sent * 1000) / 10 : 0,
      completionRate: stats.total_sent > 0 ? Math.round((stats.completed || 0) / stats.total_sent * 1000) / 10 : 0,
    },
    nps: {
      score: npsScore,
      avgScore: nps.avg_score || 0,
      promoters: nps.promoters || 0,
      passives: nps.passives || 0,
      detractors: nps.detractors || 0,
      total: npsTotal,
    },
    recentResponses: (responses?.results || []).map((r: any) => ({
      ...r,
      answers: safeParseJSON(r.answers),
    })),
    trend: recentResponses?.results || [],
  })
})

/* ═══ 공개 API (인증 불필요 — index.tsx에서 public 라우팅) ═══ */

// 설문 데이터 조회 (토큰 기반)
surveys.get('/public/:token', async (c) => {
  const token = sanitizeString(c.req.param('token'), 32)
  const send: any = await c.env.DB.prepare(
    'SELECT ss.id, ss.survey_id, ss.hospital_id, ss.patient_name, ss.doctor_name, ss.treatment_type, ss.visit_date, ss.status, ss.token, s.title, s.description, s.questions, s.expire_days, ss.created_at FROM survey_sends ss JOIN surveys s ON ss.survey_id=s.id WHERE ss.token=? AND s.is_active=1'
  ).bind(token).first()

  if (!send) return c.json({ error: '유효하지 않은 설문 링크입니다' }, 404)
  if (send.status === 'completed') return c.json({ error: '이미 응답한 설문입니다', completed: true }, 400)

  // 만료 체크
  const createdAt = new Date(send.created_at)
  const expireDate = new Date(createdAt.getTime() + (send.expire_days || 7) * 86400000)
  if (new Date() > expireDate) {
    await c.env.DB.prepare("UPDATE survey_sends SET status='expired', expired_at=? WHERE id=?").bind(new Date().toISOString(), send.id).run()
    return c.json({ error: '설문 기간이 만료되었습니다', expired: true }, 400)
  }

  // 열람 상태 업데이트
  if (send.status === 'sent' || send.status === 'pending') {
    await c.env.DB.prepare("UPDATE survey_sends SET status='opened', opened_at=? WHERE id=?").bind(new Date().toISOString(), send.id).run()
  }

  // 병원명 조회
  const hospital: any = await c.env.DB.prepare('SELECT name FROM hospitals WHERE id=?').bind(send.hospital_id).first()

  return c.json({
    sendId: send.id,
    surveyId: send.survey_id,
    title: send.title,
    description: send.description,
    questions: safeParseJSON(send.questions),
    patientName: send.patient_name,
    doctorName: send.doctor_name,
    treatmentType: send.treatment_type,
    visitDate: send.visit_date,
    hospitalName: hospital?.name || '',
  })
})

// 설문 응답 제출 (공개)
surveys.post('/public/:token/submit', async (c) => {
  const token = sanitizeString(c.req.param('token'), 32)
  const send: any = await c.env.DB.prepare(
    'SELECT ss.id, ss.survey_id, ss.hospital_id, ss.status, ss.created_at, s.questions, s.expire_days FROM survey_sends ss JOIN surveys s ON ss.survey_id=s.id WHERE ss.token=?'
  ).bind(token).first()

  if (!send) return c.json({ error: '유효하지 않은 설문 링크입니다' }, 404)
  if (send.status === 'completed') return c.json({ error: '이미 응답한 설문입니다' }, 400)

  const createdAt = new Date(send.created_at)
  const expireDate = new Date(createdAt.getTime() + (send.expire_days || 7) * 86400000)
  if (new Date() > expireDate) return c.json({ error: '설문 기간이 만료되었습니다' }, 400)

  const raw = await c.req.json()
  const answers = raw.answers
  if (!answers || typeof answers !== 'object') return c.json({ error: '응답 데이터가 올바르지 않습니다' }, 400)

  // NPS 점수 추출
  const questions = safeParseJSON(send.questions)
  const npsQuestion = questions.find((q: any) => q.type === 'nps')
  const npsScore = npsQuestion ? sanitizeNumber(Number(answers[npsQuestion.id]), -1, 0, 10) : null

  const respId = 'sr-' + crypto.randomUUID().slice(0, 8)
  const ua = c.req.header('user-agent') || ''

  await c.env.DB.prepare(
    'INSERT INTO survey_responses (id, send_id, survey_id, hospital_id, answers, nps_score, user_agent) VALUES (?,?,?,?,?,?,?)'
  ).bind(respId, send.id, send.survey_id, send.hospital_id, JSON.stringify(answers), npsScore, ua.slice(0, 500)).run()

  // 발송 상태 업데이트
  await c.env.DB.prepare("UPDATE survey_sends SET status='completed', completed_at=? WHERE id=?").bind(new Date().toISOString(), send.id).run()

  // 설문 통계 갱신
  const statsRow: any = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt, ROUND(AVG(nps_score),1) as avg FROM survey_responses WHERE survey_id=?'
  ).bind(send.survey_id).first()
  await c.env.DB.prepare('UPDATE surveys SET response_count=?, avg_nps=?, updated_at=? WHERE id=?')
    .bind(statsRow?.cnt || 0, statsRow?.avg || 0, new Date().toISOString(), send.survey_id).run()

  return c.json({ success: true, message: '소중한 의견 감사합니다!' })
})

/* ═══ 헬퍼 ═══ */

function safeParseJSON(str: any): any {
  if (!str) return []
  if (typeof str === 'object') return str
  try { return JSON.parse(str) } catch { return [] }
}

function esc(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

async function sendAligoSMS(config: any, receiver: string, msg: string): Promise<any> {
  const body = new URLSearchParams({
    key: config.api_key,
    user_id: config.user_id,
    sender: config.sender,
    receiver,
    msg,
    testmode_yn: 'N',
  })

  const resp = await fetch('https://apis.aligo.in/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const result = await resp.json() as any
  if (result.result_code && result.result_code !== '1') {
    throw new Error(result.message || 'SMS 발송 실패')
  }
  return result
}

export default surveys
