/* ═══════════════════════════════════════════════════════════
 * Referral & Fan System API
 * 소개 트리 + 팬 등급 시스템
 * ═══════════════════════════════════════════════════════════ */

import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { calculateFanScore, classifyLevel, FAN_LEVEL_META, getLevelChangeNotification, type FanLevel } from '../lib/fan-score'

const referrals = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 유틸: UUID
function uuid(): string {
  return crypto.randomUUID()
}

function sanitizeString(s: any, max: number): string {
  if (s === undefined || s === null) return ''
  return String(s).slice(0, max)
}

/* ───────────────────────────────────────────────────────────
 * 1. 소개 관계 CRUD
 * ─────────────────────────────────────────────────────────── */

// GET /api/protected/referrals — 소개 관계 목록
referrals.get('/', async (c) => {
  const user = c.get('user')
  const limit = Math.min(parseInt(c.req.query('limit') || '500'), 2000)

  const result = await c.env.DB.prepare(`
    SELECT
      r.id, r.referrer_id, r.referred_id, r.referred_at,
      r.channel, r.initial_treatment, r.generated_revenue, r.notes,
      r.thanks_noted, r.match_confidence,
      p1.patient_name as referrer_name,
      p2.patient_name as referred_name
    FROM patient_referrals r
    LEFT JOIN patients p1 ON p1.id = r.referrer_id
    LEFT JOIN patients p2 ON p2.id = r.referred_id
    WHERE r.hospital_id = ?
    ORDER BY r.referred_at DESC
    LIMIT ?
  `).bind(user.hospitalId, limit).all()

  return c.json({ ok: true, referrals: result.results || [] })
})

// POST /api/protected/referrals — 소개 등록
referrals.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))

  const referrerId = sanitizeString(body.referrer_id, 50)
  const referredId = sanitizeString(body.referred_id, 50)
  const channel = sanitizeString(body.channel || 'direct', 30)
  const initialTreatment = sanitizeString(body.initial_treatment || '', 100)
  const revenue = Math.max(0, parseInt(body.generated_revenue) || 0)
  const notes = sanitizeString(body.notes || '', 1000)

  if (!referrerId || !referredId) {
    return c.json({ error: '소개자와 소개받은 환자를 모두 선택하세요' }, 400)
  }
  if (referrerId === referredId) {
    return c.json({ error: '본인이 본인을 소개할 수 없습니다' }, 400)
  }

  // 두 환자 존재 + 같은 병원 확인
  const check = await c.env.DB.prepare(`
    SELECT id FROM patients WHERE id IN (?, ?) AND hospital_id = ?
  `).bind(referrerId, referredId, user.hospitalId).all()
  if ((check.results || []).length !== 2) {
    return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  }

  // 이미 등록되었는지 확인 (referred_id UNIQUE)
  const existing = await c.env.DB.prepare(`
    SELECT id FROM patient_referrals WHERE referred_id = ?
  `).bind(referredId).first()
  if (existing) {
    return c.json({ error: '이미 소개 관계가 등록된 환자입니다' }, 409)
  }

  const id = uuid()
  await c.env.DB.prepare(`
    INSERT INTO patient_referrals
    (id, hospital_id, referrer_id, referred_id, channel, initial_treatment,
     generated_revenue, notes, match_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
  `).bind(id, user.hospitalId, referrerId, referredId, channel,
    initialTreatment, revenue, notes).run()

  // 즉시 팬 점수 재계산 (소개자만)
  await recalculateFanLevel(c.env.DB, user.hospitalId, referrerId)

  return c.json({ ok: true, id })
})

// PUT /api/protected/referrals/:id — 소개 정보 수정
referrals.put('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const exists = await c.env.DB.prepare(`
    SELECT referrer_id FROM patient_referrals WHERE id = ? AND hospital_id = ?
  `).bind(id, user.hospitalId).first()
  if (!exists) return c.json({ error: '소개 관계를 찾을 수 없습니다' }, 404)

  const updates: string[] = []
  const params: any[] = []

  if (body.channel !== undefined) {
    updates.push('channel = ?'); params.push(sanitizeString(body.channel, 30))
  }
  if (body.initial_treatment !== undefined) {
    updates.push('initial_treatment = ?'); params.push(sanitizeString(body.initial_treatment, 100))
  }
  if (body.generated_revenue !== undefined) {
    updates.push('generated_revenue = ?'); params.push(Math.max(0, parseInt(body.generated_revenue) || 0))
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?'); params.push(sanitizeString(body.notes, 1000))
  }
  if (body.thanks_noted !== undefined) {
    updates.push('thanks_noted = ?', 'thanks_noted_at = ?', 'thanks_noted_by = ?')
    params.push(body.thanks_noted ? 1 : 0,
                body.thanks_noted ? new Date().toISOString() : null,
                body.thanks_noted ? user.id : null)
  }

  if (!updates.length) return c.json({ error: '변경할 항목이 없습니다' }, 400)

  updates.push("updated_at = CURRENT_TIMESTAMP")
  params.push(id, user.hospitalId)

  await c.env.DB.prepare(`
    UPDATE patient_referrals SET ${updates.join(', ')}
    WHERE id = ? AND hospital_id = ?
  `).bind(...params).run()

  // 매출 변경 시 재계산
  if (body.generated_revenue !== undefined) {
    await recalculateFanLevel(c.env.DB, user.hospitalId, (exists as any).referrer_id)
  }

  return c.json({ ok: true })
})

// DELETE /api/protected/referrals/:id
referrals.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const ref = await c.env.DB.prepare(`
    SELECT referrer_id FROM patient_referrals WHERE id = ? AND hospital_id = ?
  `).bind(id, user.hospitalId).first()
  if (!ref) return c.json({ error: 'not found' }, 404)

  await c.env.DB.prepare(`
    DELETE FROM patient_referrals WHERE id = ? AND hospital_id = ?
  `).bind(id, user.hospitalId).run()

  await recalculateFanLevel(c.env.DB, user.hospitalId, (ref as any).referrer_id)
  return c.json({ ok: true })
})

/* ───────────────────────────────────────────────────────────
 * 2. 그래프 데이터 (3D 시각화용)
 * ─────────────────────────────────────────────────────────── */

// GET /api/protected/referrals/graph
// 전체 소개 트리를 3D 그래프 데이터로 반환
referrals.get('/graph', async (c) => {
  const user = c.get('user')
  const minScoreParam = parseInt(c.req.query('min_score') || '0')
  const levelFilter = c.req.query('level') || ''
  const treatmentFilter = c.req.query('treatment') || ''

  // 1) 모든 환자 + 팬 레벨 조회
  let patientSql = `
    SELECT
      p.id, p.patient_name as name, p.patient_type, p.visit_source,
      p.first_visit_date, p.treatment_area, p.primary_doctor,
      COALESCE(fl.fan_level, 'general') as fan_level,
      COALESCE(fl.fan_score, 0) as fan_score,
      COALESCE(fl.referral_count, 0) as referral_count,
      COALESCE(fl.total_referral_revenue, 0) as referral_revenue,
      COALESCE(fl.visit_count, 0) as visit_count
    FROM patients p
    LEFT JOIN patient_fan_levels fl ON fl.patient_id = p.id
    WHERE p.hospital_id = ? AND p.status = 'active'
  `
  const patientParams: any[] = [user.hospitalId]

  if (minScoreParam > 0) {
    patientSql += ' AND COALESCE(fl.fan_score, 0) >= ?'
    patientParams.push(minScoreParam)
  }
  if (levelFilter) {
    patientSql += ' AND COALESCE(fl.fan_level, "general") = ?'
    patientParams.push(levelFilter)
  }
  if (treatmentFilter) {
    patientSql += ' AND p.treatment_area LIKE ?'
    patientParams.push(`%${treatmentFilter}%`)
  }

  const patients = await c.env.DB.prepare(patientSql).bind(...patientParams).all()

  // 2) 모든 소개 관계 조회
  const refsResult = await c.env.DB.prepare(`
    SELECT referrer_id, referred_id, referred_at, channel,
           initial_treatment, generated_revenue
    FROM patient_referrals
    WHERE hospital_id = ?
  `).bind(user.hospitalId).all()

  // 3) 그래프 형태로 변환
  const nodes = (patients.results || []).map((p: any) => {
    const meta = FAN_LEVEL_META[p.fan_level as FanLevel] || FAN_LEVEL_META.general
    return {
      id: p.id,
      name: p.name,
      val: meta.size + Math.min(p.referral_count, 15),  // 노드 크기
      color: meta.color,
      glowColor: meta.glowColor,
      level: p.fan_level,
      levelLabel: meta.label,
      levelEmoji: meta.emoji,
      score: p.fan_score,
      referralCount: p.referral_count,
      referralRevenue: p.referral_revenue,
      visitCount: p.visit_count,
      patientType: p.patient_type,
      visitSource: p.visit_source,
      firstVisit: p.first_visit_date,
      treatmentArea: p.treatment_area,
      primaryDoctor: p.primary_doctor
    }
  })

  const links = (refsResult.results || []).map((r: any) => ({
    source: r.referrer_id,
    target: r.referred_id,
    referredAt: r.referred_at,
    channel: r.channel,
    treatment: r.initial_treatment,
    revenue: r.generated_revenue,
    width: Math.max(1, Math.min(8, Math.floor(r.generated_revenue / 1000000)))
  }))

  return c.json({
    ok: true,
    nodes,
    links,
    stats: {
      totalNodes: nodes.length,
      totalLinks: links.length,
      byLevel: nodes.reduce((acc: any, n: any) => {
        acc[n.level] = (acc[n.level] || 0) + 1
        return acc
      }, {})
    }
  })
})

/* ───────────────────────────────────────────────────────────
 * 3. 팬 등급 시스템
 * ─────────────────────────────────────────────────────────── */

// GET /api/protected/referrals/fans — 팬 랭킹 TOP N
referrals.get('/fans', async (c) => {
  const user = c.get('user')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 500)
  const level = c.req.query('level') || ''

  let sql = `
    SELECT fl.*, p.patient_name, p.phone, p.first_visit_date,
           p.treatment_area, p.primary_doctor
    FROM patient_fan_levels fl
    JOIN patients p ON p.id = fl.patient_id
    WHERE fl.hospital_id = ? AND p.status = 'active'
  `
  const params: any[] = [user.hospitalId]

  if (level) {
    sql += ' AND fl.fan_level = ?'
    params.push(level)
  }

  sql += ' ORDER BY fl.fan_score DESC, fl.referral_count DESC LIMIT ?'
  params.push(limit)

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ ok: true, fans: result.results || [] })
})

// GET /api/protected/referrals/fans/:patientId — 특정 환자 팬 정보 + 소개한 사람들
referrals.get('/fans/:patientId', async (c) => {
  const user = c.get('user')
  const patientId = c.req.param('patientId')

  const patient = await c.env.DB.prepare(`
    SELECT p.*, fl.fan_level, fl.fan_score, fl.referral_count,
           fl.total_referral_revenue, fl.visit_count, fl.calculated_at
    FROM patients p
    LEFT JOIN patient_fan_levels fl ON fl.patient_id = p.id
    WHERE p.id = ? AND p.hospital_id = ?
  `).bind(patientId, user.hospitalId).first()

  if (!patient) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)

  // 이 환자가 소개한 사람들
  const referred = await c.env.DB.prepare(`
    SELECT r.*, p.patient_name, p.first_visit_date, p.treatment_area
    FROM patient_referrals r
    JOIN patients p ON p.id = r.referred_id
    WHERE r.referrer_id = ? AND r.hospital_id = ?
    ORDER BY r.referred_at DESC
  `).bind(patientId, user.hospitalId).all()

  // 이 환자를 소개한 사람
  const referredBy = await c.env.DB.prepare(`
    SELECT r.*, p.patient_name as referrer_name
    FROM patient_referrals r
    JOIN patients p ON p.id = r.referrer_id
    WHERE r.referred_id = ? AND r.hospital_id = ?
  `).bind(patientId, user.hospitalId).first()

  return c.json({
    ok: true,
    patient,
    referred: referred.results || [],
    referredBy: referredBy || null
  })
})

// POST /api/protected/referrals/fans/recalculate — 전체 재계산
referrals.post('/fans/recalculate', async (c) => {
  const user = c.get('user')
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const result = await recalculateAllFans(c.env.DB, user.hospitalId)
  return c.json({ ok: true, ...result })
})

/* ───────────────────────────────────────────────────────────
 * 4. 통계
 * ─────────────────────────────────────────────────────────── */

// GET /api/protected/referrals/stats
referrals.get('/stats', async (c) => {
  const user = c.get('user')

  const total = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt, SUM(generated_revenue) as revenue
    FROM patient_referrals WHERE hospital_id = ?
  `).bind(user.hospitalId).first() as any

  const byLevel = await c.env.DB.prepare(`
    SELECT fan_level, COUNT(*) as cnt
    FROM patient_fan_levels
    WHERE hospital_id = ?
    GROUP BY fan_level
  `).bind(user.hospitalId).all()

  const recentMonth = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt
    FROM patient_referrals
    WHERE hospital_id = ? AND date(referred_at) >= date('now', '-30 days')
  `).bind(user.hospitalId).first() as any

  const topReferrers = await c.env.DB.prepare(`
    SELECT p.id, p.patient_name, fl.referral_count, fl.fan_score, fl.fan_level
    FROM patient_fan_levels fl
    JOIN patients p ON p.id = fl.patient_id
    WHERE fl.hospital_id = ? AND fl.referral_count > 0
    ORDER BY fl.referral_count DESC, fl.fan_score DESC
    LIMIT 10
  `).bind(user.hospitalId).all()

  return c.json({
    ok: true,
    totalReferrals: total?.cnt || 0,
    totalRevenue: total?.revenue || 0,
    last30Days: recentMonth?.cnt || 0,
    byLevel: byLevel.results || [],
    topReferrers: topReferrers.results || []
  })
})

/* ───────────────────────────────────────────────────────────
 * 5. 알림 (내부 전용)
 * ─────────────────────────────────────────────────────────── */

// GET /api/protected/referrals/notifications
referrals.get('/notifications', async (c) => {
  const user = c.get('user')
  const onlyUnread = c.req.query('unread') === '1'

  let sql = `
    SELECT n.*, p.patient_name
    FROM fan_level_notifications n
    LEFT JOIN patients p ON p.id = n.patient_id
    WHERE n.hospital_id = ?
  `
  if (onlyUnread) sql += ' AND n.is_read = 0'
  sql += ' ORDER BY n.created_at DESC LIMIT 100'

  const result = await c.env.DB.prepare(sql).bind(user.hospitalId).all()

  const unreadCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM fan_level_notifications
    WHERE hospital_id = ? AND is_read = 0
  `).bind(user.hospitalId).first() as any

  return c.json({
    ok: true,
    notifications: result.results || [],
    unreadCount: unreadCount?.cnt || 0
  })
})

// PUT /api/protected/referrals/notifications/:id/read
referrals.put('/notifications/:id/read', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  await c.env.DB.prepare(`
    UPDATE fan_level_notifications
    SET is_read = 1
    WHERE id = ? AND hospital_id = ?
  `).bind(id, user.hospitalId).run()

  return c.json({ ok: true })
})

// PUT /api/protected/referrals/notifications/:id/action
referrals.put('/notifications/:id/action', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const note = sanitizeString(body.note || '', 500)

  await c.env.DB.prepare(`
    UPDATE fan_level_notifications
    SET is_actioned = 1, actioned_by = ?, actioned_at = ?, action_note = ?, is_read = 1
    WHERE id = ? AND hospital_id = ?
  `).bind(user.id, new Date().toISOString(), note, id, user.hospitalId).run()

  return c.json({ ok: true })
})

/* ───────────────────────────────────────────────────────────
 * 6. 환자 검색 (소개 등록용)
 * ─────────────────────────────────────────────────────────── */

referrals.get('/search-patients', async (c) => {
  const user = c.get('user')
  const q = (c.req.query('q') || '').trim()
  if (q.length < 1) return c.json({ ok: true, patients: [] })

  const result = await c.env.DB.prepare(`
    SELECT p.id, p.patient_name, p.phone, p.chart_number,
           p.treatment_area, p.first_visit_date,
           COALESCE(fl.fan_level, 'general') as fan_level,
           COALESCE(fl.referral_count, 0) as referral_count
    FROM patients p
    LEFT JOIN patient_fan_levels fl ON fl.patient_id = p.id
    WHERE p.hospital_id = ?
      AND p.status = 'active'
      AND (p.patient_name LIKE ? OR p.phone LIKE ? OR p.chart_number LIKE ?)
    ORDER BY p.patient_name
    LIMIT 20
  `).bind(user.hospitalId, `%${q}%`, `%${q}%`, `%${q}%`).all()

  return c.json({ ok: true, patients: result.results || [] })
})

/* ═══════════════════════════════════════════════════════════
 * Helper Functions
 * ═══════════════════════════════════════════════════════════ */

/**
 * 특정 환자의 팬 레벨 재계산
 */
export async function recalculateFanLevel(
  db: D1Database,
  hospitalId: string,
  patientId: string
): Promise<{ level: FanLevel; score: number }> {
  // 1) 소개 카운트 + 매출
  const refStats = await db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(generated_revenue), 0) as revenue,
      MAX(referred_at) as last_referral
    FROM patient_referrals
    WHERE referrer_id = ? AND hospital_id = ?
  `).bind(patientId, hospitalId).first() as any

  // 2) 소개 트리 깊이 (이 환자가 소개한 사람들이 또 소개한 깊이)
  const depth = await calcReferralDepth(db, hospitalId, patientId)

  // 3) 환자 본인 정보
  const patient = await db.prepare(`
    SELECT visit_count, last_visit_date
    FROM patients WHERE id = ?
  `).bind(patientId).first() as any

  // 4) 누적 결제 (consult_records confirmed 합)
  const paid = await db.prepare(`
    SELECT COALESCE(SUM(agreed_amount), 0) as total
    FROM consult_records
    WHERE patient_name = (SELECT patient_name FROM patients WHERE id = ?)
      AND hospital_id = ? AND confirmed = 1
  `).bind(patientId, hospitalId).first() as any

  // 5) 점수 계산
  const result = calculateFanScore({
    referralCount: refStats?.count || 0,
    referralDepth: depth,
    totalReferralRevenue: refStats?.revenue || 0,
    visitCount: patient?.visit_count || 0,
    totalPaid: paid?.total || 0,
    positiveReviewCount: 0,
    satisfactionScore: 0
  })

  // 6) 기존 레벨 조회
  const existing = await db.prepare(`
    SELECT fan_level FROM patient_fan_levels WHERE patient_id = ?
  `).bind(patientId).first() as any
  const oldLevel = existing?.fan_level as FanLevel | null

  // 7) 업서트
  await db.prepare(`
    INSERT INTO patient_fan_levels (
      patient_id, hospital_id, fan_level, fan_score,
      referral_count, referral_depth, total_referral_revenue,
      visit_count, total_paid, last_referral_at,
      level_changed_at, calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(patient_id) DO UPDATE SET
      fan_level = excluded.fan_level,
      fan_score = excluded.fan_score,
      referral_count = excluded.referral_count,
      referral_depth = excluded.referral_depth,
      total_referral_revenue = excluded.total_referral_revenue,
      visit_count = excluded.visit_count,
      total_paid = excluded.total_paid,
      last_referral_at = excluded.last_referral_at,
      level_changed_at = CASE WHEN patient_fan_levels.fan_level != excluded.fan_level
                              THEN CURRENT_TIMESTAMP
                              ELSE patient_fan_levels.level_changed_at END,
      calculated_at = CURRENT_TIMESTAMP
  `).bind(
    patientId, hospitalId, result.level, result.score,
    refStats?.count || 0, depth, refStats?.revenue || 0,
    patient?.visit_count || 0, paid?.total || 0,
    refStats?.last_referral || null,
    oldLevel !== result.level ? new Date().toISOString() : null
  ).run()

  // 8) 등급 변경 알림 생성
  const notif = getLevelChangeNotification(oldLevel, result.level, refStats?.count || 0)
  if (notif) {
    await db.prepare(`
      INSERT INTO fan_level_notifications
      (id, hospital_id, patient_id, notification_type, old_level, new_level, message, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), hospitalId, patientId, notif.type,
      oldLevel || 'general', result.level, notif.message, notif.priority
    ).run()
  }

  return { level: result.level, score: result.score }
}

/**
 * 소개 트리 깊이 계산 (BFS, 최대 5단계)
 */
async function calcReferralDepth(
  db: D1Database,
  hospitalId: string,
  rootId: string,
  maxDepth = 5
): Promise<number> {
  let currentLevel = [rootId]
  let depth = 0

  for (let i = 0; i < maxDepth; i++) {
    if (!currentLevel.length) break
    const placeholders = currentLevel.map(() => '?').join(',')
    const next = await db.prepare(`
      SELECT DISTINCT referred_id FROM patient_referrals
      WHERE hospital_id = ? AND referrer_id IN (${placeholders})
    `).bind(hospitalId, ...currentLevel).all()
    const nextIds = (next.results || []).map((r: any) => r.referred_id)
    if (!nextIds.length) break
    depth = i + 1
    currentLevel = nextIds
  }

  return depth
}

/**
 * 전체 환자 팬 레벨 재계산
 */
export async function recalculateAllFans(
  db: D1Database,
  hospitalId: string
): Promise<{ processed: number; byLevel: Record<string, number> }> {
  const patients = await db.prepare(`
    SELECT id FROM patients WHERE hospital_id = ? AND status = 'active'
  `).bind(hospitalId).all()

  const byLevel: Record<string, number> = {
    evangelist: 0, fan: 0, loyal: 0, satisfied: 0, general: 0
  }
  let processed = 0

  for (const p of (patients.results || [])) {
    const result = await recalculateFanLevel(db, hospitalId, (p as any).id)
    byLevel[result.level] = (byLevel[result.level] || 0) + 1
    processed++
  }

  return { processed, byLevel }
}

export default referrals
