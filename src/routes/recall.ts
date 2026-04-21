/**
 * Recall Automation API
 * v3.2 Retention Edition
 * 
 * 환자 리콜 자동화 시스템:
 * - 병원별 리콜 룰북 CRUD (치료종류 × 경과일 × 채널)
 * - 매일 아침 "오늘의 리콜 대상자" 자동 생성
 * - 실행/스니볳/완료 처리
 */

import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { parsePagination, QUERY_LIMITS } from '../lib/middleware'

const recall = new Hono<{ Bindings: Bindings; Variables: { user: any } }>()

/** UUID 생성 헬퍼 */
function uuid() {
  return crypto.randomUUID()
}

/** 오늘 날짜 (YYYY-MM-DD, Asia/Seoul 가정) */
function today() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

/** 기본 리콜 룰 3종 (병원 가입시 자동 세팅용) */
const DEFAULT_RULES = [
  {
    name: '스케일링 6개월 리콜',
    trigger_type: 'last_visit',
    treatment_keyword: '스케일링',
    days_after: 180,
    channel: 'call',
    priority: 2,
    script_template: '{patient_name}님 안녕하세요, {hospital_name}입니다. 마지막 방문 후 6개월이 지나셔서 정기 스케일링 안내드립니다. 편하신 날짜 있으신가요?',
  },
  {
    name: '임플란트 1년 정기검진',
    trigger_type: 'treatment',
    treatment_keyword: '임플란트',
    days_after: 365,
    channel: 'call',
    priority: 1,
    script_template: '{patient_name}님, 지난해 임플란트 시술 후 1년 정기검진 시기가 되어 연락드립니다. 편하신 날짜 알려주시겠어요?',
  },
  {
    name: '상담 미결정 환자 7일 후 팔로업',
    trigger_type: 'consult_lost',
    treatment_keyword: '',
    days_after: 7,
    channel: 'sms',
    priority: 3,
    script_template: '{patient_name}님 안녕하세요, 지난 상담에서 고민되셨던 부분 있으셨죠? 궁금한 점 있으시면 편하게 연락주세요.',
  },
]

/** 병원 처음 접속시 디폴트 룰 자동 시드 */
async function ensureDefaultRules(db: D1Database, hospitalId: string, userId: string) {
  const existing = await db
    .prepare('SELECT COUNT(*) as cnt FROM recall_rules WHERE hospital_id = ?')
    .bind(hospitalId)
    .first<{ cnt: number }>()
  if (existing && existing.cnt > 0) return false
  const now = new Date().toISOString()
  for (const r of DEFAULT_RULES) {
    await db
      .prepare(
        `INSERT INTO recall_rules
         (id, hospital_id, name, trigger_type, treatment_keyword, days_after, channel,
          script_template, priority, is_active, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(uuid(), hospitalId, r.name, r.trigger_type, r.treatment_keyword, r.days_after,
        r.channel, r.script_template, r.priority, userId, now, now)
      .run()
  }
  return true
}

// ─────────────────────────────────────────────────────────
// 룰북 CRUD
// ─────────────────────────────────────────────────────────

/** GET /rules - 룰 목록 */
recall.get('/rules', async (c) => {
  const user = c.get('user')
  await ensureDefaultRules(c.env.DB, user.hospitalId, user.id)
  const rows = await c.env.DB
    .prepare('SELECT * FROM recall_rules WHERE hospital_id = ? ORDER BY priority ASC, created_at DESC')
    .bind(user.hospitalId)
    .all()
  return c.json({ rules: rows.results || [] })
})

/** POST /rules - 룰 생성 (admin/manager) */
recall.post('/rules', async (c) => {
  const user = c.get('user')
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const body = await c.req.json().catch(() => ({}))
  const name = (body.name || '').trim()
  if (!name) return c.json({ error: '룰 이름을 입력해주세요' }, 400)
  const id = uuid()
  const now = new Date().toISOString()
  await c.env.DB
    .prepare(
      `INSERT INTO recall_rules
       (id, hospital_id, name, trigger_type, treatment_keyword, days_after, channel,
        script_template, priority, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, user.hospitalId, name,
      body.trigger_type || 'last_visit',
      body.treatment_keyword || '',
      parseInt(body.days_after) || 180,
      body.channel || 'call',
      body.script_template || '',
      parseInt(body.priority) || 3,
      body.is_active === false ? 0 : 1,
      user.id, now, now
    )
    .run()
  return c.json({ success: true, id })
})

/** PATCH /rules/:id - 룰 수정 */
recall.patch('/rules/:id', async (c) => {
  const user = c.get('user')
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const allowed = ['name', 'trigger_type', 'treatment_keyword', 'days_after',
    'channel', 'script_template', 'priority', 'is_active']
  const sets: string[] = []
  const vals: any[] = []
  for (const k of allowed) {
    if (k in body) {
      sets.push(`${k} = ?`)
      let v = body[k]
      if (k === 'is_active') v = v ? 1 : 0
      if (k === 'days_after' || k === 'priority') v = parseInt(v) || 0
      vals.push(v)
    }
  }
  if (!sets.length) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push(`updated_at = ?`)
  vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB
    .prepare(`UPDATE recall_rules SET ${sets.join(', ')} WHERE id = ? AND hospital_id = ?`)
    .bind(...vals)
    .run()
  return c.json({ success: true })
})

/** DELETE /rules/:id */
recall.delete('/rules/:id', async (c) => {
  const user = c.get('user')
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const id = c.req.param('id')
  await c.env.DB
    .prepare('DELETE FROM recall_rules WHERE id = ? AND hospital_id = ?')
    .bind(id, user.hospitalId)
    .run()
  return c.json({ success: true })
})

// ─────────────────────────────────────────────────────────
// 리콜 태스크 생성 (매일 아침 또는 수동 트리거)
// ─────────────────────────────────────────────────────────

/**
 * POST /generate - 오늘의 리콜 대상자 생성
 * 활성화된 룰을 돌며 조건 맞는 환자 찾아서 task 생성 (중복 방지)
 */
recall.post('/generate', async (c) => {
  const user = c.get('user')
  const hospitalId = user.hospitalId
  await ensureDefaultRules(c.env.DB, hospitalId, user.id)

  const rules = await c.env.DB
    .prepare('SELECT * FROM recall_rules WHERE hospital_id = ? AND is_active = 1')
    .bind(hospitalId)
    .all<any>()

  const todayStr = today()
  let created = 0
  let skipped = 0

  for (const rule of rules.results || []) {
    const days = rule.days_after || 180
    const keyword = rule.treatment_keyword || ''

    let candidates: any[] = []

    if (rule.trigger_type === 'last_visit' || rule.trigger_type === 'treatment') {
      // 마지막 방문일 기준 (patients.last_visit_date)
      const q = keyword
        ? `SELECT id, patient_name, phone, chart_number, last_visit_date, treatment_area
           FROM patients
           WHERE hospital_id = ?
             AND last_visit_date != ''
             AND CAST(julianday(?) - julianday(last_visit_date) AS INTEGER) >= ?
             AND CAST(julianday(?) - julianday(last_visit_date) AS INTEGER) < ?
             AND (treatment_area LIKE ? OR visit_reason LIKE ?)
             AND (status IS NULL OR status = 'active')
           LIMIT 100`
        : `SELECT id, patient_name, phone, chart_number, last_visit_date, treatment_area
           FROM patients
           WHERE hospital_id = ?
             AND last_visit_date != ''
             AND CAST(julianday(?) - julianday(last_visit_date) AS INTEGER) >= ?
             AND CAST(julianday(?) - julianday(last_visit_date) AS INTEGER) < ?
             AND (status IS NULL OR status = 'active')
           LIMIT 100`
      const windowEnd = days + 30 // 룰 경과일~+30일 사이의 환자만
      const res = keyword
        ? await c.env.DB.prepare(q).bind(hospitalId, todayStr, days, todayStr, windowEnd, `%${keyword}%`, `%${keyword}%`).all<any>()
        : await c.env.DB.prepare(q).bind(hospitalId, todayStr, days, todayStr, windowEnd).all<any>()
      candidates = res.results || []
    } else if (rule.trigger_type === 'consult_lost') {
      // 상담했지만 계약 안 된 환자 (agreed_amount = 0)
      const q = `SELECT patient_name, chart_number, record_date,
                  CAST(julianday(?) - julianday(record_date) AS INTEGER) as days_elapsed
                 FROM consult_records
                 WHERE hospital_id = ?
                   AND (agreed_amount IS NULL OR agreed_amount = 0)
                   AND CAST(julianday(?) - julianday(record_date) AS INTEGER) >= ?
                   AND CAST(julianday(?) - julianday(record_date) AS INTEGER) < ?
                 LIMIT 100`
      const res = await c.env.DB.prepare(q)
        .bind(todayStr, hospitalId, todayStr, days, todayStr, days + 30)
        .all<any>()
      candidates = (res.results || []).map((r: any) => ({
        id: null,
        patient_name: r.patient_name,
        chart_number: r.chart_number || '',
        phone: '',
        last_visit_date: r.record_date,
        treatment_area: '',
        days_elapsed: r.days_elapsed,
      }))
    }

    for (const p of candidates) {
      const lastDate = p.last_visit_date || ''
      const daysElapsed = p.days_elapsed ||
        Math.floor((Date.parse(todayStr) - Date.parse(lastDate || todayStr)) / 86400000)
      const script = (rule.script_template || '')
        .replace(/\{patient_name\}/g, p.patient_name)
        .replace(/\{hospital_name\}/g, '우리 병원')
      try {
        await c.env.DB
          .prepare(
            `INSERT INTO recall_tasks
             (id, hospital_id, rule_id, patient_id, patient_name, phone, chart_number,
              reason, last_visit_date, days_elapsed, treatment_area,
              channel, script, priority, status, scheduled_date,
              created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          )
          .bind(
            uuid(), hospitalId, rule.id, p.id || null,
            p.patient_name, p.phone || '', p.chart_number || '',
            `${rule.name} (${daysElapsed}일 경과)`,
            lastDate, daysElapsed, p.treatment_area || '',
            rule.channel, script, rule.priority,
            todayStr
          )
          .run()
        created++
      } catch (e: any) {
        // UNIQUE 제약 걸리면 skip (이미 오늘 생성됨)
        if (String(e).includes('UNIQUE')) skipped++
        else console.error('recall generate:', e)
      }
    }
  }

  return c.json({ success: true, created, skipped, date: todayStr })
})

// ─────────────────────────────────────────────────────────
// 태스크 목록 & 상태 변경
// ─────────────────────────────────────────────────────────

/** GET /tasks - 오늘의 리콜 대상자 목록 */
recall.get('/tasks', async (c) => {
  const user = c.get('user')
  const status = c.req.query('status') || 'pending'
  const dateFrom = c.req.query('date_from') || ''
  const dateTo = c.req.query('date_to') || today()
  const { limit, offset } = parsePagination(c, QUERY_LIMITS.MEDIUM)

  let q = `SELECT * FROM recall_tasks
           WHERE hospital_id = ?
             AND scheduled_date <= ?`
  const bindings: any[] = [user.hospitalId, dateTo]
  if (status !== 'all') {
    q += ' AND status = ?'
    bindings.push(status)
  }
  if (dateFrom) {
    q += ' AND scheduled_date >= ?'
    bindings.push(dateFrom)
  }
  q += ' ORDER BY priority ASC, days_elapsed DESC LIMIT ? OFFSET ?'
  bindings.push(limit, offset)

  const rows = await c.env.DB.prepare(q).bind(...bindings).all()

  // 요약 통계
  const stats = await c.env.DB
    .prepare(
      `SELECT 
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
         SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
         SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
         COUNT(*) as total
       FROM recall_tasks
       WHERE hospital_id = ? AND scheduled_date = ?`
    )
    .bind(user.hospitalId, today())
    .first()

  return c.json({ tasks: rows.results || [], stats })
})

/** PATCH /tasks/:id - 태스크 상태 업데이트 */
recall.patch('/tasks/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const allowed = ['status', 'result_note', 'assigned_to', 'reservation_made', 'reservation_date']
  const sets: string[] = []
  const vals: any[] = []
  for (const k of allowed) {
    if (k in body) {
      sets.push(`${k} = ?`)
      let v = body[k]
      if (k === 'reservation_made') v = v ? 1 : 0
      vals.push(v)
    }
  }
  if (body.status === 'done' || body.status === 'reserved') {
    sets.push(`contacted_at = ?`)
    vals.push(new Date().toISOString())
  }
  if (!sets.length) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push(`updated_at = ?`)
  vals.push(new Date().toISOString())
  vals.push(id, user.hospitalId)
  await c.env.DB
    .prepare(`UPDATE recall_tasks SET ${sets.join(', ')} WHERE id = ? AND hospital_id = ?`)
    .bind(...vals)
    .run()
  return c.json({ success: true })
})

/** GET /summary - 리콜 KPI 요약 (이번 달 성과) */
recall.get('/summary', async (c) => {
  const user = c.get('user')
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStr = monthStart.toISOString().slice(0, 10)

  const summary = await c.env.DB
    .prepare(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as contacted,
         SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
         SUM(CASE WHEN reservation_made = 1 THEN 1 ELSE 0 END) as booked,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM recall_tasks
       WHERE hospital_id = ? AND scheduled_date >= ?`
    )
    .bind(user.hospitalId, monthStr)
    .first<any>()

  const total = summary?.total || 0
  const reserved = summary?.reserved || 0
  const conversionRate = total > 0 ? Math.round((reserved / total) * 100) : 0

  return c.json({
    month: monthStr.slice(0, 7),
    ...summary,
    conversion_rate: conversionRate,
  })
})

export default recall
