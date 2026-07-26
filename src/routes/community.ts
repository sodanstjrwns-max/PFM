import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'

const community = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Community Posts ─── */
community.get('/posts', async (c) => {
  const user = c.get('user')!
  const board = sanitizeString(c.req.query('board') || '', 50)
  const page = sanitizeNumber(c.req.query('page'), 1, 1, 1000)
  const limit = sanitizeNumber(c.req.query('limit'), 50, 1, 200)
  const offset = (page - 1) * limit
  // 댓글 수는 서브쿼리로 집계 (posts 테이블에 댓글 수 컬럼 없을 수 있음)
  let sql = `SELECT p.*, u.name as author_name, u.role as author_role,
    u.position as author_position, u.team as author_team,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.comment_kind='feedback') AS supervisor_feedback_count
    FROM posts p JOIN users u ON p.author_id=u.id WHERE p.hospital_id=?`
  const params: any[] = [user.hospitalId]
  if (board) { sql += ' AND p.board_type=?'; params.push(board) }
  sql += ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)
  const [rows, countResult] = await Promise.all([
    c.env.DB.prepare(sql).bind(...params).all(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM posts WHERE hospital_id=?' + (board ? ' AND board_type=?' : '')).bind(...(board ? [user.hospitalId, board] : [user.hospitalId])).first<{c:number}>(),
  ])
  // 🔒 익명글 작성자 마스킹: is_anonymous 글은 API 응답에서 author 식별자 완전 제거
  // (프론트만 가리면 개발자도구로 노출됨 — 서버에서 차단)
  // _can_delete: 본인 글 또는 관리자/원장만 삭제 버튼 노출용 힌트
  const isManagerLike = user.role === 'admin' || user.role === 'manager'
  const data = (rows.results || []).map((p: any) => {
    const canDelete = isManagerLike || p.author_id === user.id
    // 실수노트: 상급자만 "피드백 달기" 버튼이 보여야 한다.
    // 본인 실수에 본인이 상급자 자격으로 피드백을 다는 건 말이 안 되므로 작성자 본인은 제외.
    const canFeedback = board === 'mistake' && isManagerLike && p.author_id !== user.id
    if (p.is_anonymous) {
      const { author_id, author_position, author_team, ...rest } = p
      return { ...rest, author_name: null, author_role: null, _can_delete: canDelete, _can_feedback: canFeedback }
    }
    return { ...p, _can_delete: canDelete, _can_feedback: canFeedback }
  })
  return c.json({ data, total: countResult?.c || 0, page, limit })
})

community.post('/posts', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    board_type: { type: 'string', max: 50 },
    title: { type: 'string', max: 200 },
    content: { type: 'string', max: 10000 },
    target_name: { type: 'string', max: 100 },
    is_anonymous: { type: 'boolean' },
    is_pinned: { type: 'boolean' },
    mistake_category: { type: 'string', max: 30 },
    severity: { type: 'enum', values: ['low','medium','high'] },
  })
  if (!b.board_type || !b.title) return c.json({ error: '게시판과 제목은 필수입니다' }, 400)

  // 🔒 board_type 서버 검증 (DB CHECK 제약 도달 전 400으로 차단)
  if (!['notice', 'free', 'praise', 'mistake'].includes(b.board_type)) {
    return c.json({ error: '유효하지 않은 게시판입니다' }, 400)
  }

  // 🔒 권한 가드: 공지사항(notice)은 관리자/원장만 작성 가능
  const isManager = user.role === 'admin' || user.role === 'manager'
  if (b.board_type === 'notice' && !isManager) {
    return c.json({ error: '공지사항은 관리자/원장만 작성할 수 있습니다' }, 403)
  }
  // 🔒 권한 가드: is_pinned(고정글) 설정은 관리자/원장만 가능
  const pinned = b.is_pinned && isManager ? 1 : 0

  // 실수노트 전용 필드 (다른 게시판에서는 무시)
  const MISTAKE_CATS = ['consultation','clinical','reception','billing','communication','system','other']
  const mistakeCat = b.board_type === 'mistake' && MISTAKE_CATS.includes(b.mistake_category || '')
    ? b.mistake_category : ''
  const severity = b.board_type === 'mistake' ? (b.severity || 'low') : 'low'
  const resolution = b.board_type === 'mistake' ? 'open' : 'open'

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO posts (id, hospital_id, board_type, author_id, title, content, target_name,
      is_anonymous, is_pinned, mistake_category, severity, resolution_status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, user.hospitalId, b.board_type, user.id, b.title, b.content || '', b.target_name || '',
    b.is_anonymous ? 1 : 0, pinned, mistakeCat, severity, resolution
  ).run()
  return c.json({ id })
})

/* ─── 실수노트: 상급자 피드백 상태 변경 ───
 * 실수한 본인이 글을 쓰고 → 상급자가 피드백 댓글을 달고 → 해결 처리한다.
 * (피드백노트 = 상급자가 먼저 쓰는 반대 방향. src/routes/feedback.ts 참고) */
community.put('/posts/:id/resolution', async (c) => {
  const user = c.get('user')!
  const postId = c.req.param('id')
  const post: any = await c.env.DB.prepare(
    'SELECT id, author_id, board_type FROM posts WHERE id=? AND hospital_id=?'
  ).bind(postId, user.hospitalId).first()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다' }, 404)
  if (post.board_type !== 'mistake') return c.json({ error: '실수노트에서만 사용할 수 있습니다' }, 400)

  const isManagerLike = user.role === 'admin' || user.role === 'manager'
  // 해결 처리는 상급자 또는 작성자 본인
  if (!isManagerLike && post.author_id !== user.id) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }

  const raw = await c.req.json()
  const status = sanitizeString(raw.resolution_status || '', 20)
  if (!['open','feedback_given','resolved'].includes(status)) {
    return c.json({ error: '유효하지 않은 상태입니다' }, 400)
  }
  const resolvedAt = status === 'resolved' ? new Date().toISOString() : null
  await c.env.DB.prepare(
    'UPDATE posts SET resolution_status=?, resolved_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?'
  ).bind(status, resolvedAt, postId, user.hospitalId).run()
  return c.json({ success: true, resolution_status: status })
})

community.delete('/posts/:id', async (c) => {
  const user = c.get('user')!
  const postId = c.req.param('id')
  // IDOR 방지: 해당 병원의 게시글인지 먼저 확인
  const post: any = await c.env.DB.prepare('SELECT id, author_id FROM posts WHERE id=? AND hospital_id=?').bind(postId, user.hospitalId).first()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다' }, 404)
  // 🔒 삭제 권한: 작성자 본인 또는 관리자/원장만
  const isManagerLike = user.role === 'admin' || user.role === 'manager'
  if (post.author_id !== user.id && !isManagerLike) {
    return c.json({ error: '본인 글 또는 관리자만 삭제할 수 있습니다' }, 403)
  }
  await c.env.DB.prepare('DELETE FROM comments WHERE post_id=?').bind(postId).run()
  await c.env.DB.prepare('DELETE FROM post_likes WHERE post_id=?').bind(postId).run()
  await c.env.DB.prepare('DELETE FROM posts WHERE id=?').bind(postId).run()
  return c.json({ success: true })
})

community.get('/posts/:id/comments', async (c) => {
  const user = c.get('user')!
  // IDOR 방지: 해당 병원의 게시글인지 확인
  const post: any = await c.env.DB.prepare('SELECT id, author_id, board_type FROM posts WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다' }, 404)
  // 역할 배지를 위해 작성 시점 역할(comments.author_role)을 우선 쓰고, 없으면 현재 역할로 폴백.
  // (직원이 실장으로 승진해도 그때 남긴 피드백의 배지가 바뀌지 않게 하려는 의도)
  const rows = await c.env.DB.prepare(
    `SELECT cm.*, u.name AS author_name,
       COALESCE(NULLIF(cm.author_role,''), u.role) AS role_badge,
       u.position AS author_position, u.team AS author_team
     FROM comments cm JOIN users u ON cm.author_id=u.id
     WHERE cm.post_id=? ORDER BY cm.created_at LIMIT 200`
  ).bind(c.req.param('id')).all()

  const data = (rows.results || []).map((cm: any) => ({
    ...cm,
    comment_kind: cm.comment_kind || 'comment',
    // 원글 작성자가 단 댓글인지 표시 (실수노트에서 "작성자 답변" 배지)
    _is_post_author: cm.author_id === post.author_id,
  }))
  return c.json(data)
})

community.post('/posts/:id/comments', async (c) => {
  const user = c.get('user')!
  const postId = c.req.param('id')
  // IDOR 방지: 해당 병원의 게시글인지 확인
  const post: any = await c.env.DB.prepare('SELECT id, author_id, board_type FROM posts WHERE id=? AND hospital_id=?').bind(postId, user.hospitalId).first()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다' }, 404)
  const raw = await c.req.json()
  const content = sanitizeString(raw.content || '', 5000)
  if (!content) return c.json({ error: '내용을 입력하세요' }, 400)

  /* ── 댓글 종류 판정 ──
   * feedback : 실수노트에서 상급자(admin/manager)가 다는 정식 피드백
   * reply    : 원글 작성자가 다는 답변
   * comment  : 그 외 일반 댓글
   * 클라이언트가 kind=feedback 을 보내도 권한이 없으면 comment 로 강등한다. */
  const isManagerLike = user.role === 'admin' || user.role === 'manager'
  const wantFeedback = String(raw.comment_kind || '') === 'feedback'
  let kind: 'comment' | 'feedback' | 'reply' = 'comment'
  if (wantFeedback && post.board_type === 'mistake' && isManagerLike && post.author_id !== user.id) {
    kind = 'feedback'
  } else if (post.author_id === user.id) {
    kind = 'reply'
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO comments (id, post_id, author_id, content, hospital_id, author_role, comment_kind) VALUES (?,?,?,?,?,?,?)'
  ).bind(id, postId, user.id, content, user.hospitalId, user.role, kind).run()

  // 상급자 피드백이면 카운터 증가 + 상태를 feedback_given 으로 전진
  if (kind === 'feedback') {
    await c.env.DB.prepare(
      `UPDATE posts SET feedback_count = feedback_count + 1,
         resolution_status = CASE WHEN resolution_status='open' THEN 'feedback_given' ELSE resolution_status END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id=? AND hospital_id=?`
    ).bind(postId, user.hospitalId).run()
  }

  return c.json({ id, comment_kind: kind })
})

community.post('/posts/:id/like', async (c) => {
  const user = c.get('user')!
  const postId = c.req.param('id')
  // IDOR 방지: 해당 병원의 게시글인지 확인
  const post = await c.env.DB.prepare('SELECT id FROM posts WHERE id=? AND hospital_id=?').bind(postId, user.hospitalId).first()
  if (!post) return c.json({ error: '게시글을 찾을 수 없습니다' }, 404)
  const existing = await c.env.DB.prepare('SELECT id FROM post_likes WHERE post_id=? AND user_id=?').bind(postId, user.id).first()
  if (existing) {
    await c.env.DB.prepare('DELETE FROM post_likes WHERE post_id=? AND user_id=?').bind(postId, user.id).run()
    await c.env.DB.prepare('UPDATE posts SET like_count=MAX(0,like_count-1) WHERE id=? AND hospital_id=?').bind(postId, user.hospitalId).run()
    return c.json({ liked: false })
  } else {
    await c.env.DB.prepare('INSERT INTO post_likes (id, post_id, user_id, hospital_id) VALUES (?,?,?,?)').bind(crypto.randomUUID(), postId, user.id, user.hospitalId).run()
    await c.env.DB.prepare('UPDATE posts SET like_count=like_count+1 WHERE id=? AND hospital_id=?').bind(postId, user.hospitalId).run()
    return c.json({ liked: true })
  }
})

/* ─── Kanban ─── */
community.get('/kanban/:boardType', async (c) => {
  const user = c.get('user')!
  const boardType = sanitizeString(c.req.param('boardType'), 50)
  const department = sanitizeString(c.req.query('department') || '', 50)
  let board: any = await c.env.DB.prepare('SELECT id, board_type, title, created_at FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) {
    const id = crypto.randomUUID()
    const title = boardType === 'purchase' ? '물품 구매 요청' : boardType === 'repair' ? '수리/정비 요청' : '칸반보드'
    await c.env.DB.prepare('INSERT INTO kanban_boards (id, hospital_id, board_type, title) VALUES (?,?,?,?)').bind(id, user.hospitalId, boardType, title).run()
    board = { id, board_type: boardType, title }
  }
  let sql = 'SELECT kc.*, u.name as requested_by_name FROM kanban_cards kc JOIN users u ON kc.requested_by=u.id WHERE kc.board_id=?'
  const params: any[] = [board.id]
  if (department) { sql += ' AND kc.department=?'; params.push(department) }
  sql += " ORDER BY CASE kc.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, kc.created_at DESC LIMIT 200"
  const cards = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ board, cards: cards.results })
})

community.post('/kanban/:boardType/cards', async (c) => {
  const user = c.get('user')!
  const boardType = sanitizeString(c.req.param('boardType'), 50)
  const board: any = await c.env.DB.prepare('SELECT id FROM kanban_boards WHERE hospital_id=? AND board_type=?').bind(user.hospitalId, boardType).first()
  if (!board) return c.json({ error: '보드를 찾을 수 없습니다' }, 404)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 5000 },
    priority: { type: 'enum', values: ['urgent','high','normal','low'] },
    estimated_cost: { type: 'number', min: 0, max: 999999999 },
    due_date: { type: 'string', max: 20 },
    department: { type: 'string', max: 50 },
  })
  if (!b.title) return c.json({ error: '제목을 입력하세요' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO kanban_cards (id, board_id, hospital_id, title, description, priority, department, requested_by, estimated_cost, due_date) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, board.id, user.hospitalId, b.title, b.description||'', b.priority||'normal', b.department||'general', user.id, b.estimated_cost||null, b.due_date||null).run()
  return c.json({ id })
})

community.put('/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    // DB CHECK 제약과 동일한 enum (requested/approved/in_progress/completed/rejected)
    status: { type: 'enum', values: ['requested','approved','in_progress','completed','rejected'] },
    actual_cost: { type: 'number', min: 0, max: 999999999 },
  })
  if (!b.status) return c.json({ error: '유효하지 않은 상태입니다' }, 400)
  // 승인/반려는 관리자만 가능 (셀프 승인 방지)
  if ((b.status === 'approved' || b.status === 'rejected') && user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '승인/반려는 관리자만 가능합니다' }, 403)
  }
  const completed = b.status === 'completed' ? new Date().toISOString() : null
  await c.env.DB.prepare('UPDATE kanban_cards SET status=?, actual_cost=COALESCE(?,actual_cost), completed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND hospital_id=?').bind(b.status, b.actual_cost||null, completed, c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

community.delete('/kanban/cards/:id', async (c) => {
  const user = c.get('user')!
  // 삭제는 요청자 본인 또는 관리자만 가능
  const card = await c.env.DB.prepare('SELECT requested_by FROM kanban_cards WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first() as any
  if (!card) return c.json({ error: '카드를 찾을 수 없습니다' }, 404)
  if (card.requested_by !== user.id && user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '삭제 권한이 없습니다' }, 403)
  await c.env.DB.prepare('DELETE FROM kanban_cards WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Staff Supplies ─── */
community.get('/staff-supplies', async (c) => {
  const user = c.get('user')!
  const status = sanitizeString(c.req.query('status') || '', 30)
  const item_type = sanitizeString(c.req.query('item_type') || '', 50)
  let sql = `SELECT ss.*, u.name as user_name, u2.name as requested_by_name, u3.name as approved_by_name FROM staff_supplies ss JOIN users u ON ss.user_id=u.id JOIN users u2 ON ss.requested_by=u2.id LEFT JOIN users u3 ON ss.approved_by=u3.id WHERE ss.hospital_id=?`
  const params: any[] = [user.hospitalId]
  if (status) { sql += ' AND ss.status=?'; params.push(status) }
  if (item_type) { sql += ' AND ss.item_type=?'; params.push(item_type) }
  sql += ' ORDER BY ss.created_at DESC LIMIT 200'
  const results = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(results.results)
})

community.post('/staff-supplies', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    user_id: { type: 'string', max: 100 },
    item_type: { type: 'string', max: 50 },
    item_name: { type: 'string', max: 200 },
    size: { type: 'string', max: 20 },
    color: { type: 'string', max: 30 },
    quantity: { type: 'number', min: 1, max: 9999, default: 1 },
    notes: { type: 'string', max: 1000 },
  })
  if (!b.item_type || !b.item_name) return c.json({ error: '품목 유형과 이름은 필수입니다' }, 400)
  const id = 'ss-' + crypto.randomUUID().slice(0,8)
  const targetUser = b.user_id || user.id
  await c.env.DB.prepare(`INSERT INTO staff_supplies (id, hospital_id, user_id, item_type, item_name, size, color, quantity, notes, requested_by) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, user.hospitalId, targetUser, b.item_type, b.item_name, b.size||'', b.color||'', b.quantity||1, b.notes||'', user.id).run()
  return c.json({ id })
})

community.put('/staff-supplies/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const raw = await c.req.json()
  const supply = await c.env.DB.prepare('SELECT requested_by, status FROM staff_supplies WHERE id=? AND hospital_id=?').bind(id, user.hospitalId).first() as any
  if (!supply) return c.json({ error: '주문을 찾을 수 없습니다' }, 404)
  const isManagerLike = user.role === 'admin' || user.role === 'manager'
  if (raw.status !== undefined) {
    // 상태 변경: 관리자 전체 가능, 요청자 본인은 취소만 가능 (셀프 승인/주문 처리 방지)
    const validStatuses = ['requested','approved','ordered','delivered','cancelled']
    if (!validStatuses.includes(raw.status)) return c.json({ error: '유효하지 않은 상태입니다' }, 400)
    if (!isManagerLike && !(supply.requested_by === user.id && raw.status === 'cancelled')) {
      return c.json({ error: '상태 변경은 관리자만 가능합니다 (본인 요청은 취소만 가능)' }, 403)
    }
  } else if (!isManagerLike && supply.requested_by !== user.id) {
    return c.json({ error: '수정 권한이 없습니다' }, 403)
  }
  const allowed = ['status','size','color','quantity','notes','order_date','delivery_date']
  const fields: string[] = []; const vals: any[] = []
  for (const k of allowed) {
    if (raw[k] !== undefined) {
      const val = (k === 'quantity') ? sanitizeNumber(raw[k], 1, 1, 9999) : sanitizeString(String(raw[k]), 200)
      fields.push(`${k} = ?`); vals.push(val)
    }
  }
  if (raw.status === 'approved' || raw.status === 'ordered') { fields.push('approved_by = ?'); vals.push(user.id) }
  if (raw.status === 'ordered' && !raw.order_date) { fields.push('order_date = ?'); vals.push(new Date().toISOString().slice(0,10)) }
  if (raw.status === 'delivered' && !raw.delivery_date) { fields.push('delivery_date = ?'); vals.push(new Date().toISOString().slice(0,10)) }
  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(id, user.hospitalId)
    await c.env.DB.prepare(`UPDATE staff_supplies SET ${fields.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  }
  return c.json({ success: true })
})

community.delete('/staff-supplies/:id', async (c) => {
  const user = c.get('user')!
  // 삭제는 요청자 본인 또는 관리자만 가능
  const supply = await c.env.DB.prepare('SELECT requested_by FROM staff_supplies WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first() as any
  if (!supply) return c.json({ error: '주문을 찾을 수 없습니다' }, 404)
  if (supply.requested_by !== user.id && user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '삭제 권한이 없습니다' }, 403)
  await c.env.DB.prepare('DELETE FROM staff_supplies WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ─── Marketing ─── */
community.get('/marketing/channels', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, name, monthly_cost, is_active, created_at FROM marketing_channels WHERE hospital_id=? ORDER BY created_at LIMIT 100').bind(user.hospitalId).all()
  return c.json(rows.results)
})

community.post('/marketing/channels', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '마케팅 채널 관리 권한이 없습니다' }, 403)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, { name: { type: 'string', max: 100 }, monthly_cost: { type: 'number', min: 0, max: 999999999 } })
  if (!b.name) return c.json({ error: '채널 이름은 필수입니다' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_channels (id, hospital_id, name, monthly_cost) VALUES (?,?,?,?)').bind(id, user.hospitalId, b.name, b.monthly_cost||0).run()
  return c.json({ id })
})

community.get('/marketing/records', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || '', 10)
  let sql = 'SELECT r.*, ch.name as channel_name FROM marketing_records r JOIN marketing_channels ch ON r.channel_id=ch.id WHERE r.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND r.record_month=?'; params.push(month) }
  sql += ' ORDER BY r.record_month DESC LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

community.post('/marketing/records', async (c) => {
  const user = c.get('user')!
  if (user.role === 'staff') return c.json({ error: '마케팅 기록 관리 권한이 없습니다' }, 403)
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    channel_id: { type: 'string', max: 100 },
    record_month: { type: 'string', max: 10 },
    new_patients: { type: 'number', min: 0, max: 99999 },
    revisit_patients: { type: 'number', min: 0, max: 99999 },
    ad_spend: { type: 'number', min: 0, max: 999999999 },
    revenue: { type: 'number', min: 0, max: 999999999 },
  })
  if (!b.channel_id || !b.record_month) return c.json({ error: '채널과 월은 필수입니다' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO marketing_records (id, hospital_id, channel_id, record_month, new_patients, revisit_patients, ad_spend, revenue) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.channel_id, b.record_month, b.new_patients||0, b.revisit_patients||0, b.ad_spend||0, b.revenue||0).run()
  return c.json({ id })
})

/* ─── Checklists ─── */
community.get('/checklists', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare('SELECT id, title, checklist_type, items, created_at FROM checklists WHERE hospital_id=? ORDER BY created_at LIMIT 100').bind(user.hospitalId).all()
  return c.json(rows.results)
})

community.post('/checklists', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    // DB CHECK 제약과 동일한 enum — 미일치 값은 null → 'custom' 폴백 (503 방지)
    checklist_type: { type: 'enum', values: ['daily_open','daily_close','weekly','infection','onboarding','custom'] },
    items: { type: 'json' },
  })
  if (!b.title || !b.items) return c.json({ error: '제목과 항목은 필수입니다' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO checklists (id, hospital_id, title, checklist_type, items) VALUES (?,?,?,?,?)').bind(id, user.hospitalId, b.title, b.checklist_type||'custom', JSON.stringify(b.items)).run()
  return c.json({ id })
})

community.post('/checklists/:id/complete', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    completed_items: { type: 'json' },
    notes: { type: 'string', max: 2000 },
    log_date: { type: 'string', max: 20 },
  })
  const id = crypto.randomUUID()
  // IDOR 방지: 해당 병원의 체크리스트인지 확인
  const checklist = await c.env.DB.prepare('SELECT id FROM checklists WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!checklist) return c.json({ error: '체크리스트를 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare('INSERT INTO checklist_logs (id, checklist_id, completed_by, completed_items, log_date, notes, hospital_id) VALUES (?,?,?,?,?,?,?)').bind(id, c.req.param('id'), user.id, JSON.stringify(b.completed_items), b.log_date||new Date().toISOString().split('T')[0], b.notes||'', user.hospitalId).run()
  return c.json({ id })
})

community.get('/checklists/:id/logs', async (c) => {
  const user = c.get('user')!
  // IDOR 방지: 해당 병원의 체크리스트인지 확인
  const checklist = await c.env.DB.prepare('SELECT id FROM checklists WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!checklist) return c.json({ error: '체크리스트를 찾을 수 없습니다' }, 404)
  const rows = await c.env.DB.prepare('SELECT cl.*, u.name as completed_by_name FROM checklist_logs cl JOIN users u ON cl.completed_by=u.id WHERE cl.checklist_id=? ORDER BY cl.log_date DESC LIMIT 30').bind(c.req.param('id')).all()
  return c.json(rows.results)
})

/* ─── Events (Calendar) ─── */
community.get('/events', async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || '', 10)
  let sql = 'SELECT e.*, u.name as created_by_name FROM events e JOIN users u ON e.created_by=u.id WHERE e.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (month) { sql += ' AND e.start_date LIKE ?'; params.push(month + '%') }
  sql += ' ORDER BY e.start_date LIMIT 200'
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

community.post('/events', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 5000 },
    // DB CHECK 제약과 동일한 enum (UI의 휴가/장비점검/교육이 'meeting'으로 둘갑되던 버그 수정)
    event_type: { type: 'enum', values: ['meeting','vacation','maintenance','education','interview','other'] },
    start_date: { type: 'string', max: 30 },
    end_date: { type: 'string', max: 30 },
    all_day: { type: 'boolean' },
    color: { type: 'string', max: 20 },
  })
  if (!b.title || !b.start_date) return c.json({ error: '제목과 시작일은 필수입니다' }, 400)
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO events (id, hospital_id, title, description, event_type, start_date, end_date, all_day, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id, user.hospitalId, b.title, b.description||'', b.event_type||'meeting', b.start_date, b.end_date||b.start_date, b.all_day!==false?1:0, b.color||'#0f766e', user.id).run()
  return c.json({ id })
})

community.delete('/events/:id', async (c) => {
  const user = c.get('user')!
  // 삭제는 작성자 본인 또는 관리자만 가능
  const ev = await c.env.DB.prepare('SELECT created_by FROM events WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first() as any
  if (!ev) return c.json({ error: '일정을 찾을 수 없습니다' }, 404)
  if (ev.created_by !== user.id && user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '삭제 권한이 없습니다' }, 403)
  await c.env.DB.prepare('DELETE FROM events WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

export default community
