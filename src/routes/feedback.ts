/**
 * 📝 피드백 노트 (Feedback Notes) - v3.5
 * 상급자가 하급자의 실수/이슈를 기록 + 피드백
 * 하급자는 확인 체크 + 본인 피드백 입력
 *
 * 권한 규칙:
 * - 작성(POST): admin/manager/doctor만 가능
 * - 조회(GET): 본인이 작성자 or 본인이 대상자 or admin/manager
 * - 확인+답글(ack/reply): 대상자 본인, 또는 작성자
 * - 삭제(DELETE): 작성자 본인 or admin (24시간 이내만 작성자, 이후엔 admin만)
 */
import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString } from '../lib/middleware'

const feedback = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const CATEGORIES = ['care', 'service', 'admin', 'hygiene', 'safety', 'other'] as const
const SEVERITIES = ['mild', 'moderate', 'severe'] as const
const VISIBILITIES = ['target', 'managers', 'public'] as const

const isManagerLike = (role: string) => role === 'admin' || role === 'manager'
const canAuthor = (role: string, position?: string) =>
  isManagerLike(role) || position === 'doctor' || position === 'director'

/* ─── 목록 조회 ───
 * query params:
 *   scope: 'received'(받은것) | 'sent'(보낸것) | 'all'(관리자 전체)
 *   status: open | acknowledged | resolved | archived
 *   unread: 1 (미확인만)
 *   limit, offset
 */
feedback.get('/', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const scope = sanitizeString(c.req.query('scope') || 'received', 20)
  const status = sanitizeString(c.req.query('status') || '', 20)
  const unread = c.req.query('unread') === '1'
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200)
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0)

  let where = 'hospital_id = ?'
  const binds: any[] = [hid]

  if (scope === 'received') {
    where += ' AND target_user_id = ?'
    binds.push(uid)
  } else if (scope === 'sent') {
    where += ' AND author_id = ?'
    binds.push(uid)
  } else if (scope === 'all') {
    if (!isManagerLike(user.role)) {
      // 관리자 아니면 받은 것만 보여줌 (안전장치)
      where += ' AND target_user_id = ?'
      binds.push(uid)
    }
    // managers visibility 필터
    if (!isManagerLike(user.role)) {
      where += " AND visibility IN ('target','public')"
    }
  }

  if (status && ['open','acknowledged','resolved','archived'].includes(status)) {
    where += ' AND status = ?'
    binds.push(status)
  }
  if (unread) {
    where += ' AND acknowledged = 0'
  }

  try {
    const rows: any = await c.env.DB.prepare(
      `SELECT * FROM feedback_notes WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all()

    const list = rows.results || []

    // 미확인 카운트 (받은 것 중)
    const unreadRow: any = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM feedback_notes WHERE hospital_id=? AND target_user_id=? AND acknowledged=0`
    ).bind(hid, uid).first()

    return c.json({
      ok: true,
      notes: list,
      unread_count: Number(unreadRow?.cnt || 0),
      scope,
    })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || 'list_failed', notes: [] }, 500)
  }
})

/* ─── 통계 (관리자 대시보드용) ─── */
feedback.get('/stats/summary', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  if (!isManagerLike(user.role)) return c.json({ error: 'forbidden' }, 403)

  try {
    const totals: any = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open_cnt,
        SUM(CASE WHEN status='acknowledged' THEN 1 ELSE 0 END) as ack_cnt,
        SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved_cnt,
        SUM(CASE WHEN severity='severe' THEN 1 ELSE 0 END) as severe_cnt,
        SUM(CASE WHEN created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as last_30d
      FROM feedback_notes WHERE hospital_id=?
    `).bind(hid).first()

    const byCategory: any = await c.env.DB.prepare(`
      SELECT category, COUNT(*) as cnt FROM feedback_notes
      WHERE hospital_id=? AND created_at >= date('now', '-90 days')
      GROUP BY category ORDER BY cnt DESC
    `).bind(hid).all()

    const byTarget: any = await c.env.DB.prepare(`
      SELECT target_user_id, target_user_name, COUNT(*) as cnt
      FROM feedback_notes WHERE hospital_id=? AND created_at >= date('now', '-90 days')
      GROUP BY target_user_id ORDER BY cnt DESC LIMIT 10
    `).bind(hid).all()

    return c.json({
      ok: true,
      totals,
      byCategory: byCategory.results || [],
      byTarget: byTarget.results || [],
    })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500)
  }
})

/* ─── 대상자 선택용: 병원 직원 목록 (작성 폼에서 사용) ─── */
feedback.get('/users/list', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id

  if (!canAuthor(user.role, (user as any).position)) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const rows: any = await c.env.DB.prepare(
    `SELECT id, name, role, team, position FROM users
     WHERE hospital_id=? AND is_active=1 AND id != ?
     ORDER BY name`
  ).bind(hid, uid).all()

  return c.json({ ok: true, users: rows.results || [] })
})

/* ─── 단건 조회 (댓글 포함) ─── */
feedback.get('/:id', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const id = sanitizeString(c.req.param('id'), 40)

  const note: any = await c.env.DB.prepare(
    'SELECT * FROM feedback_notes WHERE id=? AND hospital_id=?'
  ).bind(id, hid).first()

  if (!note) return c.json({ error: 'not_found' }, 404)

  // 접근 권한 확인
  const canSee = note.author_id === uid
    || note.target_user_id === uid
    || (isManagerLike(user.role) && note.visibility !== 'target')
    || isManagerLike(user.role)  // admin/manager는 일단 모두 열람 (병원 운영상 필요)
  if (!canSee) return c.json({ error: 'forbidden' }, 403)

  // 댓글 (대상자는 is_internal=0만)
  const isTarget = note.target_user_id === uid
  const isAuthor = note.author_id === uid
  let repliesWhere = 'note_id=? AND hospital_id=?'
  const rBinds: any[] = [id, hid]
  if (isTarget && !isAuthor && !isManagerLike(user.role)) {
    repliesWhere += ' AND is_internal=0'
  }
  const replies: any = await c.env.DB.prepare(
    `SELECT * FROM feedback_note_replies WHERE ${repliesWhere} ORDER BY created_at ASC`
  ).bind(...rBinds).all()

  return c.json({ ok: true, note, replies: replies.results || [] })
})

/* ─── 신규 작성 (상급자/원장) ─── */
feedback.post('/', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id

  if (!canAuthor(user.role, (user as any).position)) {
    return c.json({ error: '작성 권한이 없습니다 (관리자/원장만 가능)' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const targetUserId = sanitizeString(body.target_user_id || '', 40)
  const title = sanitizeString(body.title || '', 200)
  const description = sanitizeString(body.description || '', 2000)
  const feedbackText = sanitizeString(body.feedback || '', 2000)
  const category = CATEGORIES.includes(body.category) ? body.category : 'other'
  const severity = SEVERITIES.includes(body.severity) ? body.severity : 'moderate'
  const visibility = VISIBILITIES.includes(body.visibility) ? body.visibility : 'target'
  const incidentDate = sanitizeString(body.incident_date || '', 10) || new Date().toISOString().slice(0, 10)

  if (!targetUserId) return c.json({ error: '대상자를 선택해주세요' }, 400)
  if (!title) return c.json({ error: '제목을 입력해주세요' }, 400)
  if (!description) return c.json({ error: '실수/이슈 내용을 입력해주세요' }, 400)

  // 대상자 존재 & 같은 병원 확인
  const target: any = await c.env.DB.prepare(
    'SELECT id, name, role, team FROM users WHERE id=? AND hospital_id=? AND is_active=1'
  ).bind(targetUserId, hid).first()
  if (!target) return c.json({ error: '대상 직원을 찾을 수 없습니다' }, 404)

  // 자기 자신에게는 작성 불가
  if (targetUserId === uid) return c.json({ error: '자기 자신에게는 작성할 수 없습니다' }, 400)

  const id = 'fb-' + crypto.randomUUID().slice(0, 12)
  try {
    await c.env.DB.prepare(
      `INSERT INTO feedback_notes
       (id, hospital_id, author_id, author_name, author_role,
        target_user_id, target_user_name, target_team,
        incident_date, category, severity, title, description, feedback, visibility)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, hid, uid, user.name || '관리자', user.role,
      target.id, target.name, target.team || null,
      incidentDate, category, severity, title, description, feedbackText, visibility
    ).run()

    return c.json({ ok: true, id, message: '피드백 노트가 작성되었습니다' })
  } catch (e: any) {
    return c.json({ error: e.message || 'create_failed' }, 500)
  }
})

/* ─── 수정 (작성자 본인, 대상자 확인 전까지만) ─── */
feedback.patch('/:id', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const id = sanitizeString(c.req.param('id'), 40)

  const note: any = await c.env.DB.prepare(
    'SELECT * FROM feedback_notes WHERE id=? AND hospital_id=?'
  ).bind(id, hid).first()
  if (!note) return c.json({ error: 'not_found' }, 404)

  const isAdmin = user.role === 'admin'
  const isAuthor = note.author_id === uid
  if (!isAuthor && !isAdmin) return c.json({ error: 'forbidden' }, 403)
  if (note.acknowledged === 1 && !isAdmin) {
    return c.json({ error: '대상자가 이미 확인했습니다. 관리자만 수정 가능합니다' }, 400)
  }

  const body = await c.req.json().catch(() => ({}))
  const fields: string[] = []
  const binds: any[] = []
  if (body.title !== undefined) { fields.push('title=?'); binds.push(sanitizeString(body.title, 200)) }
  if (body.description !== undefined) { fields.push('description=?'); binds.push(sanitizeString(body.description, 2000)) }
  if (body.feedback !== undefined) { fields.push('feedback=?'); binds.push(sanitizeString(body.feedback, 2000)) }
  if (body.category !== undefined && CATEGORIES.includes(body.category)) { fields.push('category=?'); binds.push(body.category) }
  if (body.severity !== undefined && SEVERITIES.includes(body.severity)) { fields.push('severity=?'); binds.push(body.severity) }
  if (body.visibility !== undefined && VISIBILITIES.includes(body.visibility)) { fields.push('visibility=?'); binds.push(body.visibility) }
  if (body.incident_date !== undefined) { fields.push('incident_date=?'); binds.push(sanitizeString(body.incident_date, 10)) }

  if (fields.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  fields.push("updated_at=CURRENT_TIMESTAMP")
  binds.push(id, hid)

  await c.env.DB.prepare(
    `UPDATE feedback_notes SET ${fields.join(', ')} WHERE id=? AND hospital_id=?`
  ).bind(...binds).run()

  return c.json({ ok: true })
})

/* ─── 대상자 확인 + 본인 피드백 ─── */
feedback.post('/:id/acknowledge', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const id = sanitizeString(c.req.param('id'), 40)

  const note: any = await c.env.DB.prepare(
    'SELECT * FROM feedback_notes WHERE id=? AND hospital_id=?'
  ).bind(id, hid).first()
  if (!note) return c.json({ error: 'not_found' }, 404)
  if (note.target_user_id !== uid) {
    return c.json({ error: '본인에게 온 피드백만 확인할 수 있습니다' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const response = sanitizeString(body.response || '', 2000)

  const now = new Date().toISOString()
  const nextStatus = note.status === 'open' ? 'acknowledged' : note.status

  await c.env.DB.prepare(
    `UPDATE feedback_notes
     SET acknowledged=1, acknowledged_at=?, target_response=?, target_responded_at=?, status=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND hospital_id=?`
  ).bind(now, response || note.target_response, response ? now : note.target_responded_at, nextStatus, id, hid).run()

  return c.json({ ok: true, message: '확인 완료' })
})

/* ─── 상태 변경 (resolve/archive) - 작성자/관리자 ─── */
feedback.post('/:id/status', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const id = sanitizeString(c.req.param('id'), 40)

  const note: any = await c.env.DB.prepare(
    'SELECT author_id, status FROM feedback_notes WHERE id=? AND hospital_id=?'
  ).bind(id, hid).first()
  if (!note) return c.json({ error: 'not_found' }, 404)
  if (note.author_id !== uid && !isManagerLike(user.role)) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const status = body.status
  if (!['open','acknowledged','resolved','archived'].includes(status)) {
    return c.json({ error: 'invalid status' }, 400)
  }

  const extra = status === 'resolved'
    ? `, resolved_at=CURRENT_TIMESTAMP, resolved_by='${uid}'`
    : ''
  await c.env.DB.prepare(
    `UPDATE feedback_notes SET status=?, updated_at=CURRENT_TIMESTAMP${extra} WHERE id=? AND hospital_id=?`
  ).bind(status, id, hid).run()

  return c.json({ ok: true, status })
})

/* ─── 댓글 작성 ─── */
feedback.post('/:id/replies', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const id = sanitizeString(c.req.param('id'), 40)

  const note: any = await c.env.DB.prepare(
    'SELECT author_id, target_user_id FROM feedback_notes WHERE id=? AND hospital_id=?'
  ).bind(id, hid).first()
  if (!note) return c.json({ error: 'not_found' }, 404)

  const isAuthor = note.author_id === uid
  const isTarget = note.target_user_id === uid
  if (!isAuthor && !isTarget && !isManagerLike(user.role)) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const text = sanitizeString(body.body || '', 1500)
  if (!text) return c.json({ error: '댓글 내용이 비어있습니다' }, 400)
  const isInternal = (body.is_internal === true || body.is_internal === 1) ? 1 : 0
  // 대상자는 internal 작성 불가
  const finalInternal = isTarget && !isManagerLike(user.role) ? 0 : isInternal

  const role = isAuthor ? 'author' : (isTarget ? 'target' : 'other')
  const rid = 'fr-' + crypto.randomUUID().slice(0, 10)
  await c.env.DB.prepare(
    `INSERT INTO feedback_note_replies (id, note_id, hospital_id, author_id, author_name, author_role, body, is_internal)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(rid, id, hid, uid, user.name || '사용자', role, text, finalInternal).run()

  // 노트 업데이트 시각
  await c.env.DB.prepare('UPDATE feedback_notes SET updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run()

  return c.json({ ok: true, id: rid })
})

/* ─── 삭제 ─── */
feedback.delete('/:id', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const uid = user.userId || (user as any).id
  const id = sanitizeString(c.req.param('id'), 40)

  const note: any = await c.env.DB.prepare(
    'SELECT author_id, created_at, acknowledged FROM feedback_notes WHERE id=? AND hospital_id=?'
  ).bind(id, hid).first()
  if (!note) return c.json({ error: 'not_found' }, 404)

  const isAdmin = user.role === 'admin'
  const isAuthor = note.author_id === uid
  if (!isAuthor && !isAdmin) return c.json({ error: 'forbidden' }, 403)

  // 작성자는 24시간 이내 + 대상자 확인 전까지만 가능
  if (!isAdmin) {
    const ageMs = Date.now() - new Date(note.created_at + 'Z').getTime()
    if (ageMs > 24 * 3600 * 1000 || note.acknowledged === 1) {
      return c.json({ error: '24시간 이후 또는 대상자가 확인한 노트는 관리자만 삭제할 수 있습니다' }, 400)
    }
  }

  await c.env.DB.prepare('DELETE FROM feedback_notes WHERE id=? AND hospital_id=?').bind(id, hid).run()
  return c.json({ ok: true })
})

export default feedback
