import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'

const chat = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══════════════════════════════════════
   채팅방 (Rooms) CRUD
   ═══════════════════════════════════════ */

// 내가 참여한 채팅방 목록 + 최신 메시지 + 읽지않은 수
chat.get('/rooms', async (c) => {
  const user = c.get('user')!
  const rooms = await c.env.DB.prepare(`
    SELECT cr.id, cr.type, cr.name, cr.created_at, cr.updated_at,
      (SELECT cm2.message FROM chat_messages cm2 WHERE cm2.room_id=cr.id ORDER BY cm2.created_at DESC LIMIT 1) as last_message,
      (SELECT cm2.created_at FROM chat_messages cm2 WHERE cm2.room_id=cr.id ORDER BY cm2.created_at DESC LIMIT 1) as last_message_at,
      (SELECT cm2.sender_id FROM chat_messages cm2 WHERE cm2.room_id=cr.id ORDER BY cm2.created_at DESC LIMIT 1) as last_sender_id,
      (SELECT COUNT(*) FROM chat_messages cm3
        WHERE cm3.room_id=cr.id
        AND cm3.created_at > COALESCE(
          (SELECT crd.last_read_at FROM chat_reads crd WHERE crd.room_id=cr.id AND crd.user_id=?), '2000-01-01')
        AND cm3.sender_id != ?
      ) as unread_count
    FROM chat_rooms cr
    JOIN chat_members cmb ON cmb.room_id=cr.id AND cmb.user_id=?
    WHERE cr.hospital_id=?
    ORDER BY last_message_at DESC NULLS LAST, cr.created_at DESC
  `).bind(user.id, user.id, user.id, user.hospitalId).all()

  // Fetch members for each room
  const roomIds = (rooms.results as any[]).map(r => r.id)
  let membersMap: Record<string, any[]> = {}
  if (roomIds.length > 0) {
    // Batch get members for all rooms
    const allMembers = await c.env.DB.prepare(`
      SELECT cm.room_id, cm.user_id, u.name, u.role, u.position, u.team, u.is_doctor
      FROM chat_members cm
      JOIN users u ON u.id=cm.user_id
      WHERE cm.room_id IN (${roomIds.map(() => '?').join(',')})
    `).bind(...roomIds).all()
    for (const m of allMembers.results as any[]) {
      if (!membersMap[m.room_id]) membersMap[m.room_id] = []
      membersMap[m.room_id].push(m)
    }
  }

  const enriched = (rooms.results as any[]).map(r => {
    const members = membersMap[r.id] || []
    // DM인 경우 상대방 이름을 room name으로
    let displayName = r.name
    if (r.type === 'dm') {
      const other = members.find((m: any) => m.user_id !== user.id)
      displayName = other?.name || '알 수 없음'
    }
    return { ...r, display_name: displayName, members }
  })

  return c.json(enriched)
})

// DM 방 생성 또는 기존 방 반환
chat.post('/rooms/dm', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const targetUserId = sanitizeString(raw.target_user_id || '', 100)
  if (!targetUserId) return c.json({ error: '대상 사용자를 선택해주세요' }, 400)
  if (targetUserId === user.id) return c.json({ error: '자기 자신과 대화할 수 없습니다' }, 400)

  // 🔒 멀티테넌트 격리: 대상이 같은 병원 소속인지 검증 (교차 병원 DM 차단)
  const targetOk = await c.env.DB.prepare('SELECT 1 FROM users WHERE id=? AND hospital_id=? AND is_active=1')
    .bind(targetUserId, user.hospitalId).first()
  if (!targetOk) return c.json({ error: '같은 병원의 사용자가 아닙니다' }, 404)

  // 기존 DM 방이 있는지 확인
  const existing = await c.env.DB.prepare(`
    SELECT cr.id FROM chat_rooms cr
    WHERE cr.hospital_id=? AND cr.type='dm'
    AND EXISTS (SELECT 1 FROM chat_members cm1 WHERE cm1.room_id=cr.id AND cm1.user_id=?)
    AND EXISTS (SELECT 1 FROM chat_members cm2 WHERE cm2.room_id=cr.id AND cm2.user_id=?)
  `).bind(user.hospitalId, user.id, targetUserId).first()

  if (existing) return c.json({ room_id: (existing as any).id, existing: true })

  // 새 DM 방 생성
  const roomId = 'room-' + crypto.randomUUID().slice(0, 8)
  const mem1Id = 'cmb-' + crypto.randomUUID().slice(0, 8)
  const mem2Id = 'cmb-' + crypto.randomUUID().slice(0, 8)

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO chat_rooms (id, hospital_id, type, name, created_by) VALUES (?,?,?,?,?)')
      .bind(roomId, user.hospitalId, 'dm', '', user.id),
    c.env.DB.prepare('INSERT INTO chat_members (id, room_id, user_id) VALUES (?,?,?)')
      .bind(mem1Id, roomId, user.id),
    c.env.DB.prepare('INSERT INTO chat_members (id, room_id, user_id) VALUES (?,?,?)')
      .bind(mem2Id, roomId, targetUserId),
  ])
  return c.json({ room_id: roomId, existing: false })
})

// 그룹 채팅방 생성
chat.post('/rooms/group', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const name = sanitizeString(raw.name || '', 100)
  const memberIds: string[] = Array.isArray(raw.member_ids) ? raw.member_ids.map((id: string) => sanitizeString(id, 100)).filter(Boolean) : []

  if (!name) return c.json({ error: '그룹명을 입력해주세요' }, 400)
  if (memberIds.length < 1) return c.json({ error: '최소 1명 이상의 멤버를 선택해주세요' }, 400)

  // 🔒 멀티테넌트 격리: 같은 병원 소속 사용자만 그룹 멤버로 허용
  const uniqueIds = [...new Set(memberIds.filter(id => id !== user.id))].slice(0, 100)
  let validMemberIds: string[] = []
  if (uniqueIds.length > 0) {
    const ph = uniqueIds.map(() => '?').join(',')
    const valid = await c.env.DB.prepare(`SELECT id FROM users WHERE hospital_id=? AND is_active=1 AND id IN (${ph})`)
      .bind(user.hospitalId, ...uniqueIds).all()
    validMemberIds = ((valid.results || []) as any[]).map(r => r.id)
  }
  if (validMemberIds.length < 1) return c.json({ error: '같은 병원의 사용자만 초대할 수 있습니다' }, 400)

  const roomId = 'room-' + crypto.randomUUID().slice(0, 8)
  const allMembers = [user.id, ...validMemberIds]

  const stmts = [
    c.env.DB.prepare('INSERT INTO chat_rooms (id, hospital_id, type, name, created_by) VALUES (?,?,?,?,?)')
      .bind(roomId, user.hospitalId, 'group', name, user.id),
    ...allMembers.map(uid =>
      c.env.DB.prepare('INSERT INTO chat_members (id, room_id, user_id) VALUES (?,?,?)')
        .bind('cmb-' + crypto.randomUUID().slice(0, 8), roomId, uid)
    ),
  ]
  await c.env.DB.batch(stmts)
  return c.json({ room_id: roomId })
})

/* ═══════════════════════════════════════
   메시지 (Messages)
   ═══════════════════════════════════════ */

// 특정 방의 메시지 조회 (페이지네이션)
chat.get('/rooms/:roomId/messages', async (c) => {
  const user = c.get('user')!
  const roomId = c.req.param('roomId')
  const before = sanitizeString(c.req.query('before') || '', 30)
  const limit = sanitizeNumber(parseInt(c.req.query('limit') || '50'), 50, 1, 100)

  // 멤버인지 확인
  const isMember = await c.env.DB.prepare('SELECT 1 FROM chat_members WHERE room_id=? AND user_id=?').bind(roomId, user.id).first()
  if (!isMember) return c.json({ error: '이 채팅방에 접근할 수 없습니다' }, 403)

  let query = `
    SELECT cm.id, cm.sender_id, cm.message, cm.message_type, cm.metadata, cm.created_at,
      u.name as sender_name, u.role as sender_role, u.position as sender_position, u.is_doctor as sender_is_doctor
    FROM chat_messages cm
    JOIN users u ON u.id=cm.sender_id
    WHERE cm.room_id=?
  `
  const params: any[] = [roomId]
  if (before) {
    query += ' AND cm.created_at < ?'
    params.push(before)
  }
  query += ' ORDER BY cm.created_at DESC LIMIT ?'
  params.push(limit)

  const messages = await c.env.DB.prepare(query).bind(...params).all()

  // 읽음 상태 업데이트 (가장 최신 메시지 시간)
  const latestMsg = (messages.results as any[])[0]
  if (latestMsg) {
    await c.env.DB.prepare(`
      INSERT INTO chat_reads (room_id, user_id, last_read_at, last_read_msg_id)
      VALUES (?,?,?,?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET last_read_at=excluded.last_read_at, last_read_msg_id=excluded.last_read_msg_id
    `).bind(roomId, user.id, latestMsg.created_at, latestMsg.id).run()
  }

  // 읽음 상태 정보: 방 멤버들의 마지막 읽은 시간
  const reads = await c.env.DB.prepare(`
    SELECT cr.user_id, cr.last_read_at, u.name
    FROM chat_reads cr
    JOIN users u ON u.id=cr.user_id
    WHERE cr.room_id=?
  `).bind(roomId).all()

  return c.json({
    messages: (messages.results as any[]).reverse(), // 시간 오름차순으로 반환
    reads: reads.results,
    has_more: messages.results.length >= limit
  })
})

// 새 메시지 조회 (폴링용 - 특정 시간 이후)
chat.get('/rooms/:roomId/messages/new', async (c) => {
  const user = c.get('user')!
  const roomId = c.req.param('roomId')
  const after = sanitizeString(c.req.query('after') || '', 30)

  const isMember = await c.env.DB.prepare('SELECT 1 FROM chat_members WHERE room_id=? AND user_id=?').bind(roomId, user.id).first()
  if (!isMember) return c.json({ error: '접근 권한 없음' }, 403)

  if (!after) return c.json({ messages: [], reads: [] })

  const messages = await c.env.DB.prepare(`
    SELECT cm.id, cm.sender_id, cm.message, cm.message_type, cm.metadata, cm.created_at,
      u.name as sender_name, u.role as sender_role, u.position as sender_position, u.is_doctor as sender_is_doctor
    FROM chat_messages cm
    JOIN users u ON u.id=cm.sender_id
    WHERE cm.room_id=? AND cm.created_at > ?
    ORDER BY cm.created_at ASC
    LIMIT 100
  `).bind(roomId, after).all()

  // 읽음 업데이트
  const latestMsg = (messages.results as any[])[(messages.results as any[]).length - 1]
  if (latestMsg) {
    await c.env.DB.prepare(`
      INSERT INTO chat_reads (room_id, user_id, last_read_at, last_read_msg_id)
      VALUES (?,?,?,?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET last_read_at=excluded.last_read_at, last_read_msg_id=excluded.last_read_msg_id
    `).bind(roomId, user.id, latestMsg.created_at, latestMsg.id).run()
  }

  const reads = await c.env.DB.prepare(`
    SELECT cr.user_id, cr.last_read_at, u.name
    FROM chat_reads cr JOIN users u ON u.id=cr.user_id WHERE cr.room_id=?
  `).bind(roomId).all()

  return c.json({ messages: messages.results, reads: reads.results })
})

// 메시지 전송
chat.post('/rooms/:roomId/messages', async (c) => {
  const user = c.get('user')!
  const roomId = c.req.param('roomId')
  const raw = await c.req.json()
  const message = sanitizeString(raw.message || '', 2000)
  const messageType = sanitizeString(raw.message_type || 'text', 20)
  const metadata = raw.metadata ? JSON.stringify(raw.metadata).slice(0, 5000) : '{}'

  if (!message) return c.json({ error: '메시지를 입력해주세요' }, 400)

  // 멤버 확인
  const isMember = await c.env.DB.prepare('SELECT 1 FROM chat_members WHERE room_id=? AND user_id=?').bind(roomId, user.id).first()
  if (!isMember) return c.json({ error: '이 채팅방에 접근할 수 없습니다' }, 403)

  const msgId = 'msg-' + crypto.randomUUID().slice(0, 12)
  const now = new Date().toISOString()
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO chat_messages (id, room_id, sender_id, message, message_type, metadata, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(msgId, roomId, user.id, message, messageType, metadata, now),
    c.env.DB.prepare('UPDATE chat_rooms SET updated_at=? WHERE id=?')
      .bind(now, roomId),
    // 발신자의 읽음 상태 업데이트
    c.env.DB.prepare(`
      INSERT INTO chat_reads (room_id, user_id, last_read_at, last_read_msg_id)
      VALUES (?,?,?,?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET last_read_at=excluded.last_read_at, last_read_msg_id=excluded.last_read_msg_id
    `).bind(roomId, user.id, now, msgId),
  ])

  return c.json({ id: msgId, created_at: now })
})

/* ═══════════════════════════════════════
   읽음 확인 (Read Receipts)
   ═══════════════════════════════════════ */

// 읽음 처리
chat.post('/rooms/:roomId/read', async (c) => {
  const user = c.get('user')!
  const roomId = c.req.param('roomId')
  const now = new Date().toISOString()
  // 최신 메시지 ID 가져오기
  const latestMsg: any = await c.env.DB.prepare('SELECT id FROM chat_messages WHERE room_id=? ORDER BY created_at DESC LIMIT 1').bind(roomId).first()
  await c.env.DB.prepare(`
    INSERT INTO chat_reads (room_id, user_id, last_read_at, last_read_msg_id)
    VALUES (?,?,?,?)
    ON CONFLICT(room_id, user_id) DO UPDATE SET last_read_at=excluded.last_read_at, last_read_msg_id=excluded.last_read_msg_id
  `).bind(roomId, user.id, now, latestMsg?.id || '').run()
  return c.json({ success: true })
})

/* ═══════════════════════════════════════
   전체 읽지 않은 메시지 수 (배지용)
   ═══════════════════════════════════════ */

chat.get('/unread-count', async (c) => {
  const user = c.get('user')!
  const row = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM chat_messages cm
    JOIN chat_members cmb ON cmb.room_id=cm.room_id AND cmb.user_id=?
    WHERE cm.sender_id != ?
    AND cm.created_at > COALESCE(
      (SELECT crd.last_read_at FROM chat_reads crd WHERE crd.room_id=cm.room_id AND crd.user_id=?), '2000-01-01'
    )
    AND cm.room_id IN (SELECT room_id FROM chat_members WHERE user_id=?)
  `).bind(user.id, user.id, user.id, user.id).first()
  return c.json({ unread: (row as any)?.cnt || 0 })
})

/* ═══════════════════════════════════════
   퀵 메시지 (Quick Messages)
   ═══════════════════════════════════════ */

// 퀵 메시지 목록
chat.get('/quick-messages', async (c) => {
  const user = c.get('user')!
  const category = sanitizeString(c.req.query('category') || '', 30)
  let query = 'SELECT * FROM chat_quick_messages WHERE hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (category) { query += ' AND category=?'; params.push(category) }
  query += ' ORDER BY sort_order, category'
  const rows = await c.env.DB.prepare(query).bind(...params).all()

  // 퀵 메시지가 비어있으면 기본값 시드
  if (rows.results.length === 0) {
    const defaults = [
      { cat: 'chair', label: '체어 준비 완료', msg: '#{chair}번 체어 준비 완료되었습니다', icon: '🪥' },
      { cat: 'chair', label: '체어 정리 완료', msg: '#{chair}번 체어 정리 완료', icon: '✨' },
      { cat: 'patient', label: '환자 도착', msg: '#{patient}님 도착하셨습니다', icon: '🏥' },
      { cat: 'patient', label: '환자 대기중', msg: '#{patient}님 대기실에서 대기중입니다', icon: '⏳' },
      { cat: 'patient', label: '상담 가능', msg: '#{patient}님 상담 가능합니다', icon: '💬' },
      { cat: 'general', label: '점심시간', msg: '점심시간입니다 🍽️', icon: '🍽️' },
      { cat: 'general', label: '회의 시작', msg: '회의를 시작하겠습니다', icon: '📋' },
      { cat: 'general', label: '전화 왔습니다', msg: '#{name}님 전화왔습니다 📞', icon: '📞' },
      { cat: 'emergency', label: '긴급 호출', msg: '🚨 긴급 호출: 즉시 와주세요', icon: '🚨' },
      { cat: 'emergency', label: '응급 상황', msg: '🚨 응급 상황 발생!', icon: '🆘' },
    ]
    const stmts = defaults.map((d, i) =>
      c.env.DB.prepare('INSERT INTO chat_quick_messages (id, hospital_id, category, label, message, icon, sort_order) VALUES (?,?,?,?,?,?,?)')
        .bind('qm-' + crypto.randomUUID().slice(0, 8), user.hospitalId, d.cat, d.label, d.msg, d.icon, i)
    )
    await c.env.DB.batch(stmts)
    // Refetch
    const refetch = await c.env.DB.prepare('SELECT * FROM chat_quick_messages WHERE hospital_id=? ORDER BY sort_order, category').bind(user.hospitalId).all()
    return c.json(refetch.results)
  }

  return c.json(rows.results)
})

// 퀵 메시지 추가
chat.post('/quick-messages', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    category: { type: 'string', max: 30 },
    label: { type: 'string', max: 100 },
    message: { type: 'string', max: 500 },
    icon: { type: 'string', max: 10 },
  })
  if (!b.label || !b.message) return c.json({ error: '라벨과 메시지를 입력해주세요' }, 400)
  const id = 'qm-' + crypto.randomUUID().slice(0, 8)
  await c.env.DB.prepare('INSERT INTO chat_quick_messages (id, hospital_id, category, label, message, icon, sort_order) VALUES (?,?,?,?,?,?,?)')
    .bind(id, user.hospitalId, b.category || 'general', b.label, b.message, b.icon || '💬', 0).run()
  return c.json({ id })
})

// 퀵 메시지 삭제
chat.delete('/quick-messages/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM chat_quick_messages WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══════════════════════════════════════
   직원 목록 (채팅용 - 대화 시작)
   ═══════════════════════════════════════ */

chat.get('/users', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`
    SELECT id, name, role, position, team, is_doctor
    FROM users WHERE hospital_id=? AND is_active=1 AND id!=?
    ORDER BY is_doctor DESC, team, name
  `).bind(user.hospitalId, user.id).all()
  return c.json(rows.results)
})

export default chat
