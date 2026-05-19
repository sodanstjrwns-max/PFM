// ============================================================
// Messenger Patient Threads — Phase C (환자 통합)
// ─────────────────────────────────────────────────────────────
// 환자 1명 = 메신저 스레드 1줄.
//   - patient_threads 테이블에 1:1 매핑
//   - patient_thread_events 로 시스템 이벤트 기록
//   - 온도(5단계) ↔ 퍼널 단계(10단계) 자동 양방향 동기화
//   - 메시지는 0035 의 messages.patient_thread_id 로 묶임
//
// 라우트 prefix: /patient-threads (index.tsx 에서 /api/protected/messenger 베이스)
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables, PatientTemperature } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import {
  generateMessengerId,
  hasMessengerPermission,
} from '../../lib/messenger-helpers'
import {
  writeMessengerAudit,
  getClientIP,
  getUserAgent,
} from '../../lib/messenger-audit'
import {
  syncPatientFunnel,
  stageToTemperature,
  initialFunnelState,
  isValidTemperature,
  isValidStage,
} from '../../lib/patient-funnel-sync'

const patientThreads = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * 환자가 해당 병원 소속인지 + 활성 환자인지 검증.
 * IDOR 방어 — 멀티테넌트.
 */
async function assertHospitalPatient(
  db: D1Database,
  patientId: string,
  hospitalId: string,
): Promise<
  | { ok: true; patient: { id: string; patient_name: string; chart_number: string; temperature: string | null; funnel_stage: number | null } }
  | { ok: false; status: 404; error: string }
> {
  const row = await db.prepare(
    `SELECT id, patient_name, chart_number, temperature, funnel_stage, status
     FROM patients WHERE id = ? AND hospital_id = ? LIMIT 1`
  ).bind(patientId, hospitalId).first<any>()
  if (!row) return { ok: false, status: 404, error: '환자를 찾을 수 없습니다' }
  if (row.status === 'inactive') return { ok: false, status: 404, error: '비활성 환자입니다' }
  return { ok: true, patient: row }
}

/** 스레드가 병원 소속인지 검증 */
async function assertHospitalThread(
  db: D1Database,
  threadId: string,
  hospitalId: string,
): Promise<{ ok: true; thread: any } | { ok: false; status: 404; error: string }> {
  const row = await db.prepare(
    `SELECT * FROM patient_threads WHERE id = ? AND hospital_id = ? LIMIT 1`
  ).bind(threadId, hospitalId).first<any>()
  if (!row) return { ok: false, status: 404, error: '환자 스레드를 찾을 수 없습니다' }
  return { ok: true, thread: row }
}

/** 이벤트 한 줄 기록 (실패해도 메인 플로우 중단 안 함) */
async function logThreadEvent(
  db: D1Database,
  args: {
    hospitalId: string
    threadId: string
    patientId: string
    eventType: string
    payload?: any
    actorId?: string
    icon?: string
    title?: string
    body?: string
  }
): Promise<string | null> {
  try {
    const id = generateMessengerId('pte')
    await db.prepare(`
      INSERT INTO patient_thread_events
        (id, hospital_id, thread_id, patient_id, event_type, payload, actor_id, icon, title, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      id,
      args.hospitalId,
      args.threadId,
      args.patientId,
      args.eventType,
      args.payload ? JSON.stringify(args.payload) : '{}',
      args.actorId || null,
      args.icon || '',
      args.title || '',
      args.body || '',
    ).run()
    // 캐시 카운터 갱신
    await db.prepare(`
      UPDATE patient_threads
      SET event_count = event_count + 1, last_event_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND hospital_id = ?
    `).bind(args.threadId, args.hospitalId).run()
    return id
  } catch (e) {
    console.error('[patient-threads] event log failed:', (e as Error).message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// 라우트
// ─────────────────────────────────────────────────────────────

/* ═══ GET /patient-threads ═══
 *  내 병원 환자 스레드 목록.
 *  쿼리: ?temperature=&stage=&owner=&priority=&archived=0&q=&limit=&offset=
 */
patientThreads.get('/patient-threads', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId

  const temperature = c.req.query('temperature') || ''
  const stage = c.req.query('stage') || ''
  const owner = c.req.query('owner') || ''
  const priority = c.req.query('priority') || ''
  const archived = c.req.query('archived') === '1' ? 1 : 0
  const q = (c.req.query('q') || '').trim()
  const limit = Math.min(parseInt(c.req.query('limit') || '50') || 50, 200)
  const offset = parseInt(c.req.query('offset') || '0') || 0

  const where: string[] = ['pt.hospital_id = ?', 'pt.is_archived = ?']
  const params: any[] = [hospitalId, archived]
  if (temperature && isValidTemperature(temperature)) { where.push('pt.temperature = ?'); params.push(temperature) }
  if (stage) {
    const s = parseInt(stage)
    if (isValidStage(s)) { where.push('pt.funnel_stage = ?'); params.push(s) }
  }
  if (owner) { where.push('pt.primary_owner_id = ?'); params.push(owner) }
  if (priority && ['low','normal','high','urgent'].includes(priority)) {
    where.push('pt.priority = ?'); params.push(priority)
  }
  if (q) {
    where.push('(p.patient_name LIKE ? OR p.chart_number LIKE ? OR p.phone LIKE ?)')
    const kw = `%${q}%`
    params.push(kw, kw, kw)
  }

  const sql = `
    SELECT
      pt.id, pt.patient_id, pt.channel_id, pt.temperature, pt.funnel_stage,
      pt.primary_owner_id, pt.counselor_id, pt.doctor_id, pt.desk_id,
      pt.title, pt.summary, pt.tags, pt.priority,
      pt.message_count, pt.event_count, pt.last_message_at, pt.last_event_at,
      pt.created_at, pt.updated_at,
      p.patient_name, p.chart_number, p.phone, p.patient_type,
      p.primary_doctor, p.assigned_counselor, p.desk_staff
    FROM patient_threads pt
    JOIN patients p ON p.id = pt.patient_id AND p.hospital_id = pt.hospital_id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE pt.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      COALESCE(pt.last_message_at, pt.last_event_at, pt.created_at) DESC
    LIMIT ? OFFSET ?
  `
  const { results } = await c.env.DB.prepare(sql).bind(...params, limit, offset).all()
  const cnt: any = await c.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM patient_threads pt
     JOIN patients p ON p.id = pt.patient_id AND p.hospital_id = pt.hospital_id
     WHERE ${where.join(' AND ')}`
  ).bind(...params).first()

  return c.json({ threads: results || [], total: cnt?.c || 0, limit, offset })
})

/* ═══ POST /patient-threads ═══
 *  환자 스레드 생성 (없으면). body: { patient_id, channel_id?, primary_owner_id?, counselor_id?, doctor_id?, desk_id?, priority?, tags? }
 *  - 같은 환자에 대해 스레드가 이미 있으면 그 스레드 반환 (멱등)
 */
patientThreads.post('/patient-threads', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'patient_thread.manage')) {
    return c.json({ error: '환자 스레드 관리 권한이 없습니다' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const patientId = (body.patient_id ?? body.patientId ?? '').toString().trim()
  if (!patientId) {
    return c.json({ error: 'patient_id 가 필요합니다' }, 400)
  }

  // 환자 검증
  const pp = await assertHospitalPatient(c.env.DB, patientId, hospitalId)
  if (!pp.ok) return c.json({ error: pp.error }, pp.status)
  const patient = pp.patient

  // 기존 스레드 확인 (UNIQUE 제약 — 환자당 1줄)
  const existing: any = await c.env.DB.prepare(
    `SELECT id FROM patient_threads WHERE hospital_id = ? AND patient_id = ? LIMIT 1`
  ).bind(hospitalId, patientId).first()
  if (existing) {
    return c.json({ thread_id: existing.id, created: false, message: '이미 존재하는 스레드입니다' })
  }

  // 초기 온도/단계 (patients 의 값을 우선 사용)
  const initial = initialFunnelState({
    temperature: patient.temperature,
    funnel_stage: patient.funnel_stage,
  })

  const id = generateMessengerId('pt')
  const title = `${patient.patient_name}${patient.chart_number ? ' #' + patient.chart_number : ''}`
  const channelId = body.channel_id || body.channelId || null
  const priority = ['low','normal','high','urgent'].includes(body.priority) ? body.priority : 'normal'
  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags.slice(0, 20)) : '[]'

  await c.env.DB.prepare(`
    INSERT INTO patient_threads
      (id, hospital_id, patient_id, channel_id, temperature, funnel_stage,
       primary_owner_id, counselor_id, doctor_id, desk_id,
       title, summary, tags, priority,
       created_at, updated_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
  `).bind(
    id, hospitalId, patientId, channelId,
    initial.temperature, initial.funnel_stage,
    body.primary_owner_id || body.primaryOwnerId || user.id,
    body.counselor_id || body.counselorId || null,
    body.doctor_id || body.doctorId || null,
    body.desk_id || body.deskId || null,
    title, '', tags, priority,
    user.id,
  ).run()

  // patients 측 값도 동기화 (이미 같을 수도 있지만 안전하게)
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    UPDATE patients
    SET temperature = ?, funnel_stage = ?,
        temperature_updated_at = ?, funnel_stage_updated_at = ?, updated_at = ?
    WHERE id = ? AND hospital_id = ?
  `).bind(initial.temperature, initial.funnel_stage, now, now, now, patientId, hospitalId).run()

  // 생성 이벤트 기록
  await logThreadEvent(c.env.DB, {
    hospitalId, threadId: id, patientId,
    eventType: 'system',
    payload: { action: 'thread_created' },
    actorId: user.id,
    icon: '🆕',
    title: '환자 스레드 생성',
    body: `${title} 의 메신저 스레드가 시작되었습니다.`,
  })

  // 감사 로그
  writeMessengerAudit(c.env.DB, {
    hospitalId,
    actorId: user.id,
    action: 'patient_thread.create',
    targetType: 'patient_thread',
    targetId: id,
    metadata: { patient_id: patientId, initial },
    ip: getClientIP(c),
    userAgent: getUserAgent(c),
  })

  return c.json({ thread_id: id, created: true, temperature: initial.temperature, funnel_stage: initial.funnel_stage }, 201)
})

/* ═══ GET /patient-threads/:id ═══
 *  스레드 상세 (환자 정보 조인 + 최근 이벤트 + 최근 메시지)
 */
patientThreads.get('/patient-threads/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId

  const result = await c.env.DB.prepare(`
    SELECT
      pt.*,
      p.patient_name, p.chart_number, p.phone, p.birth_date, p.gender,
      p.patient_type, p.visit_source, p.first_visit_date, p.last_visit_date,
      p.visit_count, p.treatment_area, p.primary_doctor, p.assigned_counselor,
      p.desk_staff, p.addr_sido, p.addr_sigungu, p.kakao_registered
    FROM patient_threads pt
    JOIN patients p ON p.id = pt.patient_id AND p.hospital_id = pt.hospital_id
    WHERE pt.id = ? AND pt.hospital_id = ?
    LIMIT 1
  `).bind(id, hospitalId).first<any>()

  if (!result) return c.json({ error: '환자 스레드를 찾을 수 없습니다' }, 404)

  // 최근 이벤트 20개
  const { results: events } = await c.env.DB.prepare(`
    SELECT id, event_type, payload, actor_id, icon, title, body, created_at
    FROM patient_thread_events
    WHERE thread_id = ? AND hospital_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(id, hospitalId).all()

  // 최근 메시지 20개
  const { results: messages } = await c.env.DB.prepare(`
    SELECT id, channel_id, user_id, content, message_type, mentions, reactions, is_urgent,
           confirm_required, is_pinned, created_at
    FROM messages
    WHERE patient_thread_id = ? AND is_deleted = 0
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(id).all()

  return c.json({ thread: result, events: events || [], messages: messages || [] })
})

/* ═══ PATCH /patient-threads/:id ═══
 *  스레드 메타 업데이트 (담당자/우선순위/태그/요약 등 — 온도/단계 제외)
 *  body: { primary_owner_id?, counselor_id?, doctor_id?, desk_id?, priority?, tags?, summary?, channel_id? }
 */
patientThreads.patch('/patient-threads/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'patient_thread.manage')) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const tt = await assertHospitalThread(c.env.DB, id, hospitalId)
  if (!tt.ok) return c.json({ error: tt.error }, tt.status)
  const before = tt.thread

  const body = await c.req.json().catch(() => ({}))
  const updates: string[] = []
  const vals: any[] = []
  const changes: Record<string, { from: any; to: any }> = {}

  const mapField = (bodyKey: string, snakeKey: string, dbKey: string) => {
    const v = body[bodyKey] ?? body[snakeKey]
    if (v !== undefined && v !== before[dbKey]) {
      updates.push(`${dbKey} = ?`); vals.push(v ?? null)
      changes[dbKey] = { from: before[dbKey], to: v ?? null }
    }
  }
  mapField('primaryOwnerId', 'primary_owner_id', 'primary_owner_id')
  mapField('counselorId',    'counselor_id',     'counselor_id')
  mapField('doctorId',       'doctor_id',        'doctor_id')
  mapField('deskId',         'desk_id',          'desk_id')
  mapField('channelId',      'channel_id',       'channel_id')
  mapField('summary',        'summary',          'summary')

  if (body.priority && ['low','normal','high','urgent'].includes(body.priority) && body.priority !== before.priority) {
    updates.push('priority = ?'); vals.push(body.priority)
    changes.priority = { from: before.priority, to: body.priority }
  }
  if (Array.isArray(body.tags)) {
    const tagsJson = JSON.stringify(body.tags.slice(0, 20))
    if (tagsJson !== before.tags) {
      updates.push('tags = ?'); vals.push(tagsJson)
      changes.tags = { from: before.tags, to: tagsJson }
    }
  }

  if (updates.length === 0) return c.json({ updated: false, message: '변경 없음' })

  updates.push('updated_at = CURRENT_TIMESTAMP')
  await c.env.DB.prepare(
    `UPDATE patient_threads SET ${updates.join(', ')} WHERE id = ? AND hospital_id = ?`
  ).bind(...vals, id, hospitalId).run()

  // 담당자 변경 이벤트
  const ownerChanged = ['primary_owner_id','counselor_id','doctor_id','desk_id']
    .some(k => k in changes)
  if (ownerChanged) {
    await logThreadEvent(c.env.DB, {
      hospitalId, threadId: id, patientId: before.patient_id,
      eventType: 'owner_change',
      payload: changes,
      actorId: user.id,
      icon: '👥',
      title: '담당자 변경',
    })
  }

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id,
    action: 'patient_thread.event_add',
    targetType: 'patient_thread', targetId: id,
    metadata: { changes },
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ updated: true, changes })
})

/* ═══ POST /patient-threads/:id/temperature ═══
 *  환자 온도 변경 (자동으로 퍼널 단계도 같이 이동).
 *  body: { temperature: 'cold'|'warm'|'hot'|'patient'|'advocate', stage?: 1-10, reason? }
 *  - temperature 만 보내면 stage 자동 계산 (현재 stage 가 새 범위 안이면 유지)
 *  - stage 만 보내면 temperature 자동 계산
 */
patientThreads.post('/patient-threads/:id/temperature', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'patient_thread.manage')) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const tt = await assertHospitalThread(c.env.DB, id, hospitalId)
  if (!tt.ok) return c.json({ error: tt.error }, tt.status)
  const thread = tt.thread

  const body = await c.req.json().catch(() => ({}))
  const newTemp = body.temperature as PatientTemperature | undefined
  const newStage = body.stage != null ? parseInt(body.stage) : undefined
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : ''

  if (!newTemp && newStage == null) {
    return c.json({ error: 'temperature 또는 stage 중 하나는 필수입니다' }, 400)
  }
  if (newTemp && !isValidTemperature(newTemp)) {
    return c.json({ error: '유효하지 않은 temperature 입니다' }, 400)
  }
  if (newStage != null && !isValidStage(newStage)) {
    return c.json({ error: '유효하지 않은 funnel_stage 입니다 (1-10)' }, 400)
  }

  let syncResult
  try {
    syncResult = await syncPatientFunnel(c.env.DB, {
      hospitalId,
      threadId: id,
      patientId: thread.patient_id,
      patch: { temperature: newTemp, stage: newStage },
    })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }

  if (syncResult.changedFields.length === 0) {
    return c.json({ updated: false, message: '변경 없음', state: syncResult.after })
  }

  // 이벤트 기록 (변경 종류에 따라 분리)
  if (syncResult.changedFields.includes('temperature')) {
    const fromConf = syncResult.before.temperature
    const toConf = syncResult.after.temperature
    await logThreadEvent(c.env.DB, {
      hospitalId, threadId: id, patientId: thread.patient_id,
      eventType: 'temperature_change',
      payload: { from: fromConf, to: toConf, reason },
      actorId: user.id,
      icon: '🌡️',
      title: `온도 변경: ${fromConf} → ${toConf}`,
      body: reason,
    })
  }
  if (syncResult.changedFields.includes('funnel_stage')) {
    await logThreadEvent(c.env.DB, {
      hospitalId, threadId: id, patientId: thread.patient_id,
      eventType: 'funnel_change',
      payload: { from: syncResult.before.stage, to: syncResult.after.stage, reason },
      actorId: user.id,
      icon: '🎯',
      title: `퍼널 단계: ${syncResult.before.stage} → ${syncResult.after.stage}`,
      body: reason,
    })
  }

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id,
    action: 'patient_thread.temperature_change',
    targetType: 'patient_thread', targetId: id,
    metadata: { ...syncResult, reason },
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ updated: true, ...syncResult })
})

/* ═══ POST /patient-threads/:id/events ═══
 *  수동 이벤트 추가 (메모/결제/치료 등).
 *  body: { event_type, payload?, icon?, title?, body? }
 */
patientThreads.post('/patient-threads/:id/events', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId

  const tt = await assertHospitalThread(c.env.DB, id, hospitalId)
  if (!tt.ok) return c.json({ error: tt.error }, tt.status)
  const thread = tt.thread

  const body = await c.req.json().catch(() => ({}))
  const eventType = (body.event_type || body.eventType || '').toString().slice(0, 50)
  const allowedTypes = [
    'appointment','treatment','payment','note','consult_done','recall','kakao_sent','system'
  ]
  if (!allowedTypes.includes(eventType)) {
    return c.json({ error: `event_type 은 ${allowedTypes.join(', ')} 중 하나여야 합니다` }, 400)
  }

  const eventId = await logThreadEvent(c.env.DB, {
    hospitalId, threadId: id, patientId: thread.patient_id,
    eventType,
    payload: body.payload || {},
    actorId: user.id,
    icon: typeof body.icon === 'string' ? body.icon.slice(0, 8) : '',
    title: typeof body.title === 'string' ? body.title.slice(0, 200) : '',
    body: typeof body.body === 'string' ? body.body.slice(0, 1000) : '',
  })
  if (!eventId) return c.json({ error: '이벤트 기록 실패' }, 500)

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id,
    action: 'patient_thread.event_add',
    targetType: 'patient_thread', targetId: id,
    metadata: { event_type: eventType, event_id: eventId },
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ event_id: eventId, created: true }, 201)
})

/* ═══ GET /patient-threads/:id/events ═══
 *  이벤트 + 메시지 통합 타임라인.
 *  쿼리: ?before=&limit= (created_at 기준 페이징)
 */
patientThreads.get('/patient-threads/:id/events', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId

  const tt = await assertHospitalThread(c.env.DB, id, hospitalId)
  if (!tt.ok) return c.json({ error: tt.error }, tt.status)

  const limit = Math.min(parseInt(c.req.query('limit') || '50') || 50, 200)
  const before = c.req.query('before') || ''
  const beforeClause = before ? 'AND created_at < ?' : ''

  // 이벤트
  const eventsQ = c.env.DB.prepare(`
    SELECT 'event' AS row_type, id, event_type AS type, payload AS data,
           actor_id AS user_id, icon, title, body AS content, created_at
    FROM patient_thread_events
    WHERE thread_id = ? AND hospital_id = ? ${beforeClause}
    ORDER BY created_at DESC LIMIT ?
  `)
  const eventsBind = before
    ? eventsQ.bind(id, hospitalId, before, limit)
    : eventsQ.bind(id, hospitalId, limit)

  // 메시지
  const msgsQ = c.env.DB.prepare(`
    SELECT 'message' AS row_type, m.id, m.message_type AS type, NULL AS data,
           m.user_id, '' AS icon, '' AS title, m.content, m.created_at
    FROM messages m
    JOIN channels ch ON ch.id = m.channel_id
    WHERE m.patient_thread_id = ? AND m.is_deleted = 0
      AND ch.hospital_id = ? ${beforeClause.replace('created_at', 'm.created_at')}
    ORDER BY m.created_at DESC LIMIT ?
  `)
  const msgsBind = before
    ? msgsQ.bind(id, hospitalId, before, limit)
    : msgsQ.bind(id, hospitalId, limit)

  const [evRes, msRes] = await Promise.all([eventsBind.all(), msgsBind.all()])

  // 클라이언트가 created_at desc 로 머지하기 쉽게 둘 다 그대로 반환
  return c.json({
    events: evRes.results || [],
    messages: msRes.results || [],
  })
})

/* ═══ POST /patient-threads/:id/archive ═══ */
patientThreads.post('/patient-threads/:id/archive', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'patient_thread.manage')) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const tt = await assertHospitalThread(c.env.DB, id, hospitalId)
  if (!tt.ok) return c.json({ error: tt.error }, tt.status)

  await c.env.DB.prepare(`
    UPDATE patient_threads
    SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, archived_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND hospital_id = ?
  `).bind(user.id, id, hospitalId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id,
    action: 'patient_thread.archive',
    targetType: 'patient_thread', targetId: id,
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ archived: true })
})

/* ═══ POST /patient-threads/:id/unarchive ═══ */
patientThreads.post('/patient-threads/:id/unarchive', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  if (!hasMessengerPermission(messengerRole, 'patient_thread.manage')) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const tt = await assertHospitalThread(c.env.DB, id, hospitalId)
  if (!tt.ok) return c.json({ error: tt.error }, tt.status)

  await c.env.DB.prepare(`
    UPDATE patient_threads
    SET is_archived = 0, archived_at = NULL, archived_by = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND hospital_id = ?
  `).bind(id, hospitalId).run()

  return c.json({ archived: false })
})

/* ═══ GET /patient-threads/stats/summary ═══
 *  병원 단위 환자 퍼널 분포 (대시보드용).
 */
patientThreads.get('/patient-threads/stats/summary', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId

  const [byTemp, byStage, totals] = await Promise.all([
    c.env.DB.prepare(`
      SELECT temperature, COUNT(*) AS c FROM patient_threads
      WHERE hospital_id = ? AND is_archived = 0
      GROUP BY temperature
    `).bind(hospitalId).all(),
    c.env.DB.prepare(`
      SELECT funnel_stage, COUNT(*) AS c FROM patient_threads
      WHERE hospital_id = ? AND is_archived = 0
      GROUP BY funnel_stage
      ORDER BY funnel_stage
    `).bind(hospitalId).all(),
    c.env.DB.prepare(`
      SELECT
        COUNT(*) AS total_threads,
        SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END) AS active_threads,
        SUM(CASE WHEN priority IN ('urgent','high') AND is_archived = 0 THEN 1 ELSE 0 END) AS priority_threads
      FROM patient_threads WHERE hospital_id = ?
    `).bind(hospitalId).first(),
  ])

  return c.json({
    by_temperature: byTemp.results || [],
    by_stage: byStage.results || [],
    totals: totals || {},
  })
})

/* ═══ GET /patients/:patientId/thread ═══
 *  편의 라우트: 환자 ID 로 스레드 조회/없으면 생성 신호.
 */
patientThreads.get('/patients/:patientId/thread', async (c) => {
  const user = c.get('user')!
  const patientId = c.req.param('patientId')
  const hospitalId = user.hospitalId
  if (!patientId) return c.json({ error: 'patient_id invalid' }, 400)

  const pp = await assertHospitalPatient(c.env.DB, patientId, hospitalId)
  if (!pp.ok) return c.json({ error: pp.error }, pp.status)

  const thread: any = await c.env.DB.prepare(
    `SELECT * FROM patient_threads WHERE hospital_id = ? AND patient_id = ? LIMIT 1`
  ).bind(hospitalId, patientId).first()

  return c.json({
    thread: thread || null,
    patient: pp.patient,
    needs_creation: !thread,
  })
})

export default patientThreads
