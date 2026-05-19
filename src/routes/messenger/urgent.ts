// ============================================================
// Messenger Urgent Calls — Phase D
// ─────────────────────────────────────────────────────────────
// 긴급 호출 (Code Blue 등 의료 응급).
//   - 발송자: 모든 직원 (긴급 발송 권한은 messengerRole 무관 — 안전 우선)
//   - 대상:   특정 사용자 / 특정 채널 / 병원 전체
//   - 상태:   active → acknowledged (수신확인) → resolved (해결)
// 폴링 응답의 urgentCalls 필드에 실려 모든 직원의 화면 빨갛게.
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'
import { pfmRoleToMessengerRole } from '../../lib/types'
import {
  generateMessengerId,
  hasMessengerPermission,
  safeJsonParse,
} from '../../lib/messenger-helpers'
import {
  writeMessengerAudit,
  getClientIP,
  getUserAgent,
} from '../../lib/messenger-audit'

const urgent = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const VALID_CALL_TYPES = ['urgent', 'emergency', 'code_blue'] as const
const VALID_TARGET_TYPES = ['user', 'channel', 'all'] as const

/* ═══ POST /urgent ═══
 *  긴급콜 발송.
 *  body: { message, target_type: 'user'|'channel'|'all', target_id?, call_type? }
 */
urgent.post('/urgent', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId

  const body = await c.req.json().catch(() => ({}))
  const message = (body.message || '').toString().trim().slice(0, 500)
  const targetType = body.target_type ?? body.targetType
  const targetId = body.target_id ?? body.targetId ?? null
  const callType = body.call_type ?? body.callType ?? 'urgent'

  if (!message) return c.json({ error: '메시지가 비어있습니다' }, 400)
  if (!VALID_TARGET_TYPES.includes(targetType)) {
    return c.json({ error: `target_type 은 ${VALID_TARGET_TYPES.join(', ')} 중 하나여야 합니다` }, 400)
  }
  if (!VALID_CALL_TYPES.includes(callType)) {
    return c.json({ error: `call_type 은 ${VALID_CALL_TYPES.join(', ')} 중 하나여야 합니다` }, 400)
  }
  if (targetType !== 'all' && !targetId) {
    return c.json({ error: 'target_type 이 user/channel 이면 target_id 필수' }, 400)
  }

  // 멀티테넌트 검증 — target 이 같은 병원 소속인지
  if (targetType === 'user') {
    const ok = await c.env.DB.prepare(
      'SELECT 1 AS o FROM users WHERE id = ? AND hospital_id = ? LIMIT 1'
    ).bind(targetId, hospitalId).first()
    if (!ok) return c.json({ error: '대상 사용자를 찾을 수 없습니다' }, 404)
  } else if (targetType === 'channel') {
    const ok = await c.env.DB.prepare(
      'SELECT 1 AS o FROM channels WHERE id = ? AND hospital_id = ? LIMIT 1'
    ).bind(targetId, hospitalId).first()
    if (!ok) return c.json({ error: '대상 채널을 찾을 수 없습니다' }, 404)
  }

  const id = generateMessengerId('uc')
  await c.env.DB.prepare(`
    INSERT INTO urgent_calls
      (id, hospital_id, caller_id, target_type, target_id, message, call_type, status, acknowledged_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', '[]', CURRENT_TIMESTAMP)
  `).bind(id, hospitalId, user.id, targetType, targetId, message, callType).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id, action: 'urgent.call',
    targetType: 'urgent_call', targetId: id,
    metadata: { call_type: callType, target_type: targetType, target_id: targetId },
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ id, status: 'active', created: true }, 201)
})

/* ═══ GET /urgent ═══
 *  활성 긴급콜 목록. 쿼리: ?status=active&limit=
 */
urgent.get('/urgent', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId
  const status = c.req.query('status') || 'active'
  const limit = Math.min(parseInt(c.req.query('limit') || '50') || 50, 200)

  const { results } = await c.env.DB.prepare(`
    SELECT uc.id, uc.caller_id, uc.target_type, uc.target_id, uc.message, uc.call_type,
           uc.status, uc.acknowledged_by, uc.resolved_at, uc.created_at,
           u.name AS caller_name, u.role AS caller_role
    FROM urgent_calls uc
    LEFT JOIN users u ON u.id = uc.caller_id
    WHERE uc.hospital_id = ? AND uc.status = ?
    ORDER BY uc.created_at DESC
    LIMIT ?
  `).bind(hospitalId, status, limit).all()

  const enriched = (results || []).map((r: any) => ({
    ...r,
    acknowledged_by: safeJsonParse<string[]>(r.acknowledged_by, []),
  }))

  return c.json({ urgent_calls: enriched })
})

/* ═══ GET /urgent/:id ═══ */
urgent.get('/urgent/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId

  const row: any = await c.env.DB.prepare(`
    SELECT uc.*, u.name AS caller_name, u.role AS caller_role
    FROM urgent_calls uc
    LEFT JOIN users u ON u.id = uc.caller_id
    WHERE uc.id = ? AND uc.hospital_id = ? LIMIT 1
  `).bind(id, hospitalId).first()

  if (!row) return c.json({ error: '긴급콜을 찾을 수 없습니다' }, 404)
  row.acknowledged_by = safeJsonParse<string[]>(row.acknowledged_by, [])
  return c.json({ urgent_call: row })
})

/* ═══ POST /urgent/:id/ack ═══
 *  수신 확인 (한 명이라도 보면 active → acknowledged).
 */
urgent.post('/urgent/:id/ack', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId

  const row: any = await c.env.DB.prepare(
    'SELECT id, acknowledged_by, status FROM urgent_calls WHERE id = ? AND hospital_id = ?'
  ).bind(id, hospitalId).first()
  if (!row) return c.json({ error: '긴급콜을 찾을 수 없습니다' }, 404)
  if (row.status === 'resolved') return c.json({ error: '이미 해결된 긴급콜입니다' }, 400)

  const acked: string[] = safeJsonParse<string[]>(row.acknowledged_by, [])
  if (!acked.includes(user.id)) acked.push(user.id)
  const nextStatus = row.status === 'active' ? 'acknowledged' : row.status

  await c.env.DB.prepare(`
    UPDATE urgent_calls SET acknowledged_by = ?, status = ? WHERE id = ? AND hospital_id = ?
  `).bind(JSON.stringify(acked), nextStatus, id, hospitalId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id, action: 'urgent.ack',
    targetType: 'urgent_call', targetId: id,
    metadata: { ack_count: acked.length },
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ id, status: nextStatus, acknowledged_by: acked })
})

/* ═══ POST /urgent/:id/resolve ═══
 *  해결 (긴급콜 종료). 권한: urgent.resolve (manager 이상).
 */
urgent.post('/urgent/:id/resolve', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const hospitalId = user.hospitalId
  const messengerRole = user.messengerRole || pfmRoleToMessengerRole(user.role || 'staff')

  // 발송자 본인은 항상 해결 가능, 그 외는 권한 체크
  const row: any = await c.env.DB.prepare(
    'SELECT caller_id, status FROM urgent_calls WHERE id = ? AND hospital_id = ?'
  ).bind(id, hospitalId).first()
  if (!row) return c.json({ error: '긴급콜을 찾을 수 없습니다' }, 404)

  const isCaller = row.caller_id === user.id
  if (!isCaller && !hasMessengerPermission(messengerRole, 'urgent.resolve')) {
    return c.json({ error: '긴급콜 해결 권한이 없습니다' }, 403)
  }
  if (row.status === 'resolved') return c.json({ error: '이미 해결된 긴급콜입니다' }, 400)

  await c.env.DB.prepare(`
    UPDATE urgent_calls SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE id = ? AND hospital_id = ?
  `).bind(id, hospitalId).run()

  writeMessengerAudit(c.env.DB, {
    hospitalId, actorId: user.id, action: 'urgent.resolve',
    targetType: 'urgent_call', targetId: id,
    metadata: { resolved_by: isCaller ? 'caller' : 'admin' },
    ip: getClientIP(c), userAgent: getUserAgent(c),
  })

  return c.json({ id, status: 'resolved' })
})

/* ═══ GET /urgent/stats/summary ═══
 *  활성/금일/오늘 해결됨 카운트 (대시보드 배지용).
 */
urgent.get('/urgent/stats/summary', async (c) => {
  const user = c.get('user')!
  const hospitalId = user.hospitalId

  const stats: any = await c.env.DB.prepare(`
    SELECT
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) AS acknowledged,
      SUM(CASE WHEN status = 'resolved' AND DATE(resolved_at) = DATE('now') THEN 1 ELSE 0 END) AS resolved_today,
      SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) AS total_today
    FROM urgent_calls WHERE hospital_id = ?
  `).bind(hospitalId).first()

  return c.json({
    active: stats?.active ?? 0,
    acknowledged: stats?.acknowledged ?? 0,
    resolved_today: stats?.resolved_today ?? 0,
    total_today: stats?.total_today ?? 0,
  })
})

export default urgent
