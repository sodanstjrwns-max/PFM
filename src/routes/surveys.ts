import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const surveys = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const DOW_NAMES = ['일', '월', '화', '수', '목', '금', '토']

/* ═══════════════════════════════════════════════════════════════════
   ⚠️ 라우트 순서 중요! 고정 경로를 /:id 보다 반드시 먼저 등록
   ═══════════════════════════════════════════════════════════════════ */

/* ═══ 1. SMS 설정 (병원 settings에 저장) ═══ */

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

// 알리고 SMS 연결 테스트
surveys.post('/sms-config/test', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const phone = sanitizeString(raw.phone || '', 20).replace(/[^0-9]/g, '')
  if (!phone || phone.length < 10) return c.json({ error: '테스트 수신번호를 입력해주세요' }, 400)

  const hospitalRow: any = await c.env.DB.prepare('SELECT settings, name FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(hospitalRow?.settings || '{}') } catch (e) { /* ignore */ }
  const smsConfig = settings.sms_config
  if (!smsConfig?.api_key || !smsConfig?.user_id || !smsConfig?.sender) {
    return c.json({ error: 'SMS 설정이 완료되지 않았습니다. API Key, User ID, 발신번호를 먼저 설정해주세요.' }, 400)
  }

  try {
    const result = await sendAligoSMS(smsConfig, phone, `[${hospitalRow?.name || '병원'}] 알리고 SMS 연동 테스트 메시지입니다.`)
    return c.json({ success: true, message: '테스트 SMS 발송 성공!', result_code: result.result_code, msg_id: result.msg_id })
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'SMS 발송 실패' }, 400)
  }
})

/* ═══ 2. 설문 템플릿 (기본 제공 + 병원 커스텀) ═══ */

surveys.get('/templates', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    'SELECT id, hospital_id, name, description, category, questions, is_default, sort_order FROM survey_templates WHERE hospital_id IS NULL OR hospital_id=? ORDER BY is_default DESC, sort_order ASC, created_at DESC'
  ).bind(user.hospitalId).all()
  return c.json((rows?.results || []).map((r: any) => ({
    ...r, questions: safeParseJSON(r.questions),
    isSystem: !r.hospital_id,
  })))
})

surveys.post('/templates', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  if (!raw.name || !Array.isArray(raw.questions) || raw.questions.length === 0) {
    return c.json({ error: '템플릿 이름과 질문을 입력해주세요' }, 400)
  }
  const id = 'tpl-' + crypto.randomUUID().slice(0, 8)
  await c.env.DB.prepare(
    'INSERT INTO survey_templates (id, hospital_id, name, description, category, questions, sort_order) VALUES (?,?,?,?,?,?,10)'
  ).bind(id, user.hospitalId, sanitizeString(raw.name, 200), sanitizeString(raw.description || '', 1000), sanitizeString(raw.category || 'general', 20), JSON.stringify(raw.questions)).run()
  return c.json({ success: true, id })
})

surveys.post('/templates/:tid/create-survey', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const tpl: any = await c.env.DB.prepare(
    'SELECT * FROM survey_templates WHERE id=? AND (hospital_id IS NULL OR hospital_id=?)'
  ).bind(c.req.param('tid'), user.hospitalId).first()
  if (!tpl) return c.json({ error: '템플릿을 찾을 수 없습니다' }, 404)

  const raw = await c.req.json()
  const title = sanitizeString(raw.title || tpl.name, 200)
  const id = 'srv-' + crypto.randomUUID().slice(0, 8)

  await c.env.DB.prepare(
    'INSERT INTO surveys (id, hospital_id, title, description, questions, auto_send, send_delay_hours, expire_days, created_by) VALUES (?,?,?,?,?,0,2,7,?)'
  ).bind(id, user.hospitalId, title, tpl.description || '', tpl.questions, user.id).run()

  return c.json({ success: true, id })
})

surveys.put('/templates/:tid', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const tplId = c.req.param('tid')
  const raw = await c.req.json()
  const sets: string[] = []; const vals: any[] = []
  if (raw.name !== undefined) { sets.push('name=?'); vals.push(sanitizeString(raw.name, 200)) }
  if (raw.description !== undefined) { sets.push('description=?'); vals.push(sanitizeString(raw.description, 1000)) }
  if (raw.category !== undefined) { sets.push('category=?'); vals.push(sanitizeString(raw.category, 20)) }
  if (Array.isArray(raw.questions)) { sets.push('questions=?'); vals.push(JSON.stringify(raw.questions)) }
  if (sets.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(tplId); vals.push(user.hospitalId)
  await c.env.DB.prepare(`UPDATE survey_templates SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

surveys.delete('/templates/:tid', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM survey_templates WHERE id=? AND hospital_id=?').bind(c.req.param('tid'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══ 3. 발송 스케줄 관리 (매월 N째주 X요일) ═══ */

surveys.get('/schedules', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT sc.*, s.title as survey_title, s.is_active as survey_active 
     FROM survey_schedules sc 
     JOIN surveys s ON sc.survey_id=s.id 
     WHERE sc.hospital_id=? 
     ORDER BY sc.created_at DESC`
  ).bind(user.hospitalId).all()
  return c.json(rows?.results || [])
})

surveys.get('/schedules/today', async (c) => {
  const user = c.get('user')!
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 3600000)
  const todayDow = kstNow.getDay()
  const todayDate = kstNow.getDate()
  const todayWeek = Math.ceil(todayDate / 7)

  const schedules = await c.env.DB.prepare(
    'SELECT sc.*, s.title as survey_title FROM survey_schedules sc JOIN surveys s ON sc.survey_id=s.id WHERE sc.hospital_id=? AND sc.is_active=1 AND sc.week_of_month=? AND sc.day_of_week=?'
  ).bind(user.hospitalId, todayWeek, todayDow).all()

  const todayStr = kstNow.toISOString().slice(0, 10)
  const existingBatches = await c.env.DB.prepare(
    'SELECT id, status, total_recipients FROM survey_batches WHERE hospital_id=? AND batch_date=?'
  ).bind(user.hospitalId, todayStr).all()

  return c.json({
    isSendDay: (schedules?.results || []).length > 0,
    schedules: schedules?.results || [],
    todayBatches: existingBatches?.results || [],
    today: todayStr,
    weekOfMonth: todayWeek,
    dayOfWeek: todayDow,
    dayName: DOW_NAMES[todayDow],
  })
})

surveys.get('/schedules/next', async (c) => {
  const user = c.get('user')!
  const schedules = await c.env.DB.prepare(
    'SELECT sc.*, s.title as survey_title FROM survey_schedules sc JOIN surveys s ON sc.survey_id=s.id WHERE sc.hospital_id=? AND sc.is_active=1'
  ).bind(user.hospitalId).all()

  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 3600000)
  const results: any[] = []

  for (const sch of (schedules?.results || []) as any[]) {
    const nextDate = getNextScheduleDate(kstNow, sch.week_of_month, sch.day_of_week)
    results.push({
      scheduleId: sch.id,
      surveyTitle: sch.survey_title,
      nextDate: nextDate.toISOString().slice(0, 10),
      label: `${sch.week_of_month}째주 ${DOW_NAMES[sch.day_of_week]}요일`,
      sendTime: sch.send_time,
      daysUntil: Math.ceil((nextDate.getTime() - kstNow.getTime()) / 86400000),
    })
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil)
  return c.json(results)
})

surveys.post('/schedules', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const surveyId = sanitizeString(raw.survey_id || '', 50)
  const weekOfMonth = sanitizeNumber(Number(raw.week_of_month), 1, 1, 4)
  const dayOfWeek = sanitizeNumber(Number(raw.day_of_week), 1, 0, 6)
  const sendTime = sanitizeString(raw.send_time || '10:00', 5)

  if (!surveyId) return c.json({ error: '설문을 선택해주세요' }, 400)
  const survey: any = await c.env.DB.prepare('SELECT id FROM surveys WHERE id=? AND hospital_id=?').bind(surveyId, user.hospitalId).first()
  if (!survey) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)

  const id = 'sch-' + crypto.randomUUID().slice(0, 8)
  const smsTemplate = sanitizeString(raw.sms_template || '', 500)

  await c.env.DB.prepare(
    'INSERT INTO survey_schedules (id, hospital_id, survey_id, week_of_month, day_of_week, send_time, sms_template, created_by) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, surveyId, weekOfMonth, dayOfWeek, sendTime, smsTemplate, user.id).run()

  return c.json({ success: true, id, label: `매월 ${weekOfMonth}째주 ${DOW_NAMES[dayOfWeek]}요일 ${sendTime}` })
})

surveys.put('/schedules/:schId', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const schId = c.req.param('schId')
  const raw = await c.req.json()
  const sets: string[] = []; const vals: any[] = []

  if (raw.week_of_month !== undefined) { sets.push('week_of_month=?'); vals.push(sanitizeNumber(Number(raw.week_of_month), 1, 1, 4)) }
  if (raw.day_of_week !== undefined) { sets.push('day_of_week=?'); vals.push(sanitizeNumber(Number(raw.day_of_week), 1, 0, 6)) }
  if (raw.send_time !== undefined) { sets.push('send_time=?'); vals.push(sanitizeString(raw.send_time, 5)) }
  if (raw.is_active !== undefined) { sets.push('is_active=?'); vals.push(raw.is_active ? 1 : 0) }
  if (raw.sms_template !== undefined) { sets.push('sms_template=?'); vals.push(sanitizeString(raw.sms_template, 500)) }
  if (raw.survey_id !== undefined) { sets.push('survey_id=?'); vals.push(sanitizeString(raw.survey_id, 50)) }

  if (sets.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(schId); vals.push(user.hospitalId)

  await c.env.DB.prepare(`UPDATE survey_schedules SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

surveys.delete('/schedules/:schId', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM survey_schedules WHERE id=? AND hospital_id=?').bind(c.req.param('schId'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══ 4. 발송 배치 관리 (명단 업로드 → 확인 → 발송) ═══ */

surveys.get('/batches', async (c) => {
  const user = c.get('user')!
  const limit = sanitizeNumber(Number(c.req.query('limit')), 20, 1, 50)
  const offset = sanitizeNumber(Number(c.req.query('offset')), 0, 0, 9999)

  const [total, rows] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM survey_batches WHERE hospital_id=?').bind(user.hospitalId).first(),
    c.env.DB.prepare(
      `SELECT b.*, s.title as survey_title 
       FROM survey_batches b JOIN surveys s ON b.survey_id=s.id 
       WHERE b.hospital_id=? ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    ).bind(user.hospitalId, limit, offset).all(),
  ])

  return c.json({ total: (total as any)?.c || 0, batches: rows?.results || [] })
})

surveys.get('/batches/:batchId', async (c) => {
  const user = c.get('user')!
  const batchId = c.req.param('batchId')

  const [batch, items] = await Promise.all([
    c.env.DB.prepare(
      'SELECT b.*, s.title as survey_title FROM survey_batches b JOIN surveys s ON b.survey_id=s.id WHERE b.id=? AND b.hospital_id=?'
    ).bind(batchId, user.hospitalId).first(),
    c.env.DB.prepare(
      'SELECT id, patient_name, patient_phone, doctor_name, treatment_type, visit_date, status, sent_at, opened_at, completed_at, token FROM survey_sends WHERE batch_id=? AND hospital_id=? ORDER BY created_at ASC'
    ).bind(batchId, user.hospitalId).all(),
  ])

  if (!batch) return c.json({ error: '배치를 찾을 수 없습니다' }, 404)
  return c.json({ batch, items: items?.results || [] })
})

surveys.post('/batches', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const surveyId = sanitizeString(raw.survey_id || '', 50)
  const scheduleId = sanitizeString(raw.schedule_id || '', 50)
  const recipients = raw.recipients

  if (!surveyId) return c.json({ error: '설문을 선택해주세요' }, 400)
  if (!Array.isArray(recipients) || recipients.length === 0) return c.json({ error: '발송 명단을 입력해주세요' }, 400)
  if (recipients.length > 500) return c.json({ error: '한 번에 최대 500명까지 가능합니다' }, 400)

  const survey: any = await c.env.DB.prepare('SELECT id, is_active FROM surveys WHERE id=? AND hospital_id=?').bind(surveyId, user.hospitalId).first()
  if (!survey) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)

  const batchId = 'bat-' + crypto.randomUUID().slice(0, 8)
  const kstNow = new Date(Date.now() + 9 * 3600000)
  const batchDate = sanitizeString(raw.batch_date || kstNow.toISOString().slice(0, 10), 10)

  await c.env.DB.prepare(
    'INSERT INTO survey_batches (id, hospital_id, survey_id, schedule_id, batch_date, total_recipients, status, created_by) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(batchId, user.hospitalId, surveyId, scheduleId, batchDate, recipients.length, 'draft', user.id).run()

  // 유효 수신자 필터링 후 D1 batch 로 일괄 INSERT (50건 청크)
  const validStmts = recipients
    .map((rcpt: any) => {
      const name = sanitizeString(rcpt.patient_name || rcpt.name || '', 100)
      const phone = sanitizeString(rcpt.patient_phone || rcpt.phone || '', 20).replace(/[^0-9]/g, '')
      if (!phone || phone.length < 10) return null
      return c.env.DB.prepare(
        'INSERT INTO survey_sends (id, survey_id, hospital_id, batch_id, patient_name, patient_phone, patient_id, doctor_name, treatment_type, visit_date, token, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        'ss-' + crypto.randomUUID().slice(0, 8), surveyId, user.hospitalId, batchId, name, phone,
        sanitizeString(rcpt.patient_id || '', 50),
        sanitizeString(rcpt.doctor_name || rcpt.doctor || '', 100),
        sanitizeString(rcpt.treatment_type || rcpt.treatment || '', 100),
        sanitizeString(rcpt.visit_date || batchDate, 10),
        crypto.randomUUID().replace(/-/g, '').slice(0, 16), 'pending'
      )
    })
    .filter((s): s is D1PreparedStatement => s !== null)
  let inserted = 0
  const CHUNK = 50
  for (let ci = 0; ci < validStmts.length; ci += CHUNK) {
    const chunk = validStmts.slice(ci, ci + CHUNK)
    await c.env.DB.batch(chunk)
    inserted += chunk.length
  }

  await c.env.DB.prepare('UPDATE survey_batches SET total_recipients=? WHERE id=?').bind(inserted, batchId).run()
  return c.json({ success: true, batchId, totalRecipients: inserted })
})

surveys.post('/batches/:batchId/send', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const batchId = c.req.param('batchId')

  const batch: any = await c.env.DB.prepare(
    'SELECT b.*, s.title as survey_title FROM survey_batches b JOIN surveys s ON b.survey_id=s.id WHERE b.id=? AND b.hospital_id=?'
  ).bind(batchId, user.hospitalId).first()
  if (!batch) return c.json({ error: '배치를 찾을 수 없습니다' }, 404)
  if (batch.status === 'completed') return c.json({ error: '이미 발송 완료된 배치입니다' }, 400)
  if (batch.status === 'cancelled') return c.json({ error: '취소된 배치입니다' }, 400)

  const hospitalRow: any = await c.env.DB.prepare('SELECT settings, name FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let settings: any = {}
  try { settings = JSON.parse(hospitalRow?.settings || '{}') } catch (e) { /* ignore */ }
  const smsConfig = settings.sms_config || null
  const hospitalName = hospitalRow?.name || '병원'

  let smsTemplate = ''
  if (batch.schedule_id) {
    const sch: any = await c.env.DB.prepare('SELECT sms_template FROM survey_schedules WHERE id=?').bind(batch.schedule_id).first()
    smsTemplate = sch?.sms_template || ''
  }

  await c.env.DB.prepare("UPDATE survey_batches SET status='sending', sent_by=?, sent_at=? WHERE id=?")
    .bind(user.id, new Date().toISOString(), batchId).run()

  const items = await c.env.DB.prepare(
    "SELECT id, patient_name, patient_phone, token FROM survey_sends WHERE batch_id=? AND hospital_id=? AND status='pending'"
  ).bind(batchId, user.hospitalId).all()

  let sentCount = 0; let failedCount = 0
  const errors: string[] = []

  for (const item of (items?.results || []) as any[]) {
    const surveyUrl = `${new URL(c.req.url).origin}/survey/${item.token}`
    let msg = smsTemplate
      ? smsTemplate
          .replace(/{병원명}/g, hospitalName)
          .replace(/{환자명}/g, item.patient_name)
          .replace(/{링크}/g, surveyUrl)
      : `[${esc(hospitalName)}] ${item.patient_name}님, 진료 만족도 설문에 참여해주세요.\n${surveyUrl}\n(7일내 응답)`

    if (smsConfig && smsConfig.api_key && smsConfig.user_id && smsConfig.sender) {
      try {
        const smsResult = await sendAligoSMS(smsConfig, item.patient_phone, msg)
        await c.env.DB.prepare("UPDATE survey_sends SET status='sent', sent_at=?, sms_result=?, sms_message_id=? WHERE id=?")
          .bind(new Date().toISOString(), smsResult.result_code || '', smsResult.msg_id || '', item.id).run()
        sentCount++
      } catch (e: any) {
        failedCount++
        errors.push(`${item.patient_name}: ${e.message}`)
        await c.env.DB.prepare("UPDATE survey_sends SET status='failed', sms_result=? WHERE id=?")
          .bind('error:' + (e.message || ''), item.id).run()
      }
    } else {
      await c.env.DB.prepare("UPDATE survey_sends SET status='sent', sent_at=? WHERE id=?")
        .bind(new Date().toISOString(), item.id).run()
      sentCount++
    }
  }

  await c.env.DB.prepare(
    "UPDATE survey_batches SET status='completed', sent_count=?, failed_count=?, completed_at=? WHERE id=?"
  ).bind(sentCount, failedCount, new Date().toISOString(), batchId).run()

  if (batch.schedule_id) {
    await c.env.DB.prepare(
      'UPDATE survey_schedules SET last_sent_at=?, total_sent=total_sent+? WHERE id=?'
    ).bind(new Date().toISOString(), sentCount, batch.schedule_id).run()
  }

  return c.json({
    success: true,
    sent: sentCount,
    failed: failedCount,
    errors: errors.length ? errors.slice(0, 10) : undefined,
    smsConfigured: !!(smsConfig && smsConfig.api_key),
  })
})

surveys.delete('/batches/:batchId', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const batchId = c.req.param('batchId')
  const batch: any = await c.env.DB.prepare('SELECT status FROM survey_batches WHERE id=? AND hospital_id=?').bind(batchId, user.hospitalId).first()
  if (!batch) return c.json({ error: '배치를 찾을 수 없습니다' }, 404)
  if (batch.status === 'completed') return c.json({ error: '이미 완료된 배치는 취소할 수 없습니다' }, 400)

  await c.env.DB.prepare("UPDATE survey_batches SET status='cancelled' WHERE id=?").bind(batchId).run()
  await c.env.DB.prepare("DELETE FROM survey_sends WHERE batch_id=? AND status='pending'").bind(batchId).run()
  return c.json({ success: true })
})

/* ═══ 5. 종합 통계 / 대시보드 ═══ */

surveys.get('/stats/overview', async (c) => {
  const user = c.get('user')!

  const [surveyCount, totalSent, totalResponses, npsOverall, monthlyTrend, recentBatches] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM surveys WHERE hospital_id=? AND is_active=1').bind(user.hospitalId).first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM survey_sends WHERE hospital_id=?').bind(user.hospitalId).first(),
    c.env.DB.prepare('SELECT COUNT(*) as c, ROUND(AVG(nps_score),1) as avg_nps FROM survey_responses WHERE hospital_id=?').bind(user.hospitalId).first(),
    c.env.DB.prepare(`SELECT 
      SUM(CASE WHEN nps_score >= 9 THEN 1 ELSE 0 END) as promoters,
      SUM(CASE WHEN nps_score >= 7 AND nps_score < 9 THEN 1 ELSE 0 END) as passives,
      SUM(CASE WHEN nps_score < 7 THEN 1 ELSE 0 END) as detractors,
      COUNT(*) as total
    FROM survey_responses WHERE hospital_id=?`).bind(user.hospitalId).first(),
    c.env.DB.prepare(`SELECT 
      substr(submitted_at, 1, 7) as month,
      COUNT(*) as responses,
      ROUND(AVG(nps_score), 1) as avg_nps
    FROM survey_responses WHERE hospital_id=?
    GROUP BY month ORDER BY month DESC LIMIT 12`).bind(user.hospitalId).all(),
    c.env.DB.prepare(
      'SELECT b.*, s.title as survey_title FROM survey_batches b JOIN surveys s ON b.survey_id=s.id WHERE b.hospital_id=? ORDER BY b.created_at DESC LIMIT 5'
    ).bind(user.hospitalId).all(),
  ])

  const nps = (npsOverall || {}) as any
  const npsTotal = nps.total || 0
  const npsScore = npsTotal > 0
    ? Math.round(((nps.promoters || 0) / npsTotal * 100) - ((nps.detractors || 0) / npsTotal * 100))
    : null

  const sent = (totalSent as any)?.c || 0
  const responded = (totalResponses as any)?.c || 0

  return c.json({
    activeSurveys: (surveyCount as any)?.c || 0,
    totalSent: sent,
    totalResponses: responded,
    responseRate: sent > 0 ? Math.round(responded / sent * 1000) / 10 : 0,
    nps: {
      score: npsScore,
      avgScore: (totalResponses as any)?.avg_nps || 0,
      promoters: nps.promoters || 0,
      passives: nps.passives || 0,
      detractors: nps.detractors || 0,
      total: npsTotal,
    },
    monthlyTrend: monthlyTrend?.results || [],
    recentBatches: recentBatches?.results || [],
  })
})

/* ═══ 6. 설문 CRUD (관리자용) ═══ */

// 설문 목록
surveys.get('/', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    'SELECT id, title, description, is_active, auto_send, send_delay_hours, expire_days, response_count, avg_nps, created_at, updated_at FROM surveys WHERE hospital_id=? ORDER BY created_at DESC LIMIT 50'
  ).bind(user.hospitalId).all()
  return c.json(rows?.results || [])
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

/* ═══ 7. 설문 상세 / 수정 / 삭제 — /:id 패턴은 반드시 마지막! ═══ */

// 설문 상세
surveys.get('/:id', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare(
    'SELECT * FROM surveys WHERE id=? AND hospital_id=?'
  ).bind(c.req.param('id'), user.hospitalId).first()
  if (!row) return c.json({ error: '설문을 찾을 수 없습니다' }, 404)
  return c.json(row)
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

/* ═══ 8. 발송 기록 / NPS 분석 — /:id 하위 경로 ═══ */

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

  const hospitalRow: any = await c.env.DB.prepare('SELECT settings, name FROM hospitals WHERE id=?').bind(user.hospitalId).first()
  let hospitalSettings: any = {}
  try { hospitalSettings = JSON.parse(hospitalRow?.settings || '{}') } catch (e) { /* ignore */ }
  const smsConfig = hospitalSettings.sms_config || null
  const hospitalName = hospitalRow?.name || '병원'

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

// NPS / 응답 분석
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
      openRate: stats.total_sent > 0 ? Math.round(((stats.opened || 0) + (stats.completed || 0)) / stats.total_sent * 1000) / 10 : 0,
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

/* ═══ 헬퍼 함수 ═══ */

function safeParseJSON(str: any): any {
  if (!str) return []
  if (typeof str === 'object') return str
  try { return JSON.parse(str) } catch { return [] }
}

function esc(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

function getNextScheduleDate(fromDate: Date, weekOfMonth: number, dayOfWeek: number): Date {
  const now = new Date(fromDate)
  for (let m = 0; m < 3; m++) {
    const year = now.getFullYear()
    const month = now.getMonth() + m
    const adjustedMonth = month % 12
    const adjustedYear = year + Math.floor(month / 12)
    let count = 0
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(adjustedYear, adjustedMonth, d)
      if (dt.getMonth() !== adjustedMonth) break
      if (dt.getDay() === dayOfWeek) {
        count++
        if (count === weekOfMonth) {
          if (dt > fromDate) return dt
          break
        }
      }
    }
  }
  return new Date(now.getTime() + 30 * 86400000)
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
