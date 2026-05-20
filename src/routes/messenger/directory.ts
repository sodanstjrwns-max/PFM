// ============================================================
// Messenger Directory + Presence — Phase F.1
// ─────────────────────────────────────────────────────────────
// 원내 직원 디렉토리 (DM 상대 찾기, 부서별 필터, 온라인 표시).
//   - 디렉토리:  GET  /directory                 검색/부서/online filter
//   - 부서 목록: GET  /directory/departments     필터 옵션용
//   - 통계:      GET  /directory/stats           online/away/offline 카운트
//   - presence:  POST /directory/presence        본인 status 갱신 (online/away/dnd/offline + location)
//   - heartbeat: POST /directory/heartbeat       last_seen_at 만 가볍게 갱신 (폴링과 별개)
//
// 환자 안 끼어듭니다 — 전부 users 테이블만 건드림.
// ============================================================

import { Hono } from 'hono'
import type { Bindings, Variables } from '../../lib/types'

const directory = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const VALID_PRESENCE = ['online', 'away', 'dnd', 'offline'] as const
type PresenceStatus = typeof VALID_PRESENCE[number]

/** away 자동 전환 임계 (5분 이상 미응답 → away 로 표시) */
const AWAY_THRESHOLD_MIN = 5
/** offline 자동 전환 임계 (15분 이상 → offline) */
const OFFLINE_THRESHOLD_MIN = 15

/** 응답에서 last_seen_at 기준으로 'effective' presence 계산
 *  본인이 dnd 설정했으면 무조건 dnd 유지.
 *  본인이 online이라고 했어도 last_seen 이 5분 이상 전이면 away, 15분 전이면 offline 표시.
 */
function effectivePresence(stored: string, lastSeenAt: string | null): PresenceStatus {
  if (stored === 'dnd') return 'dnd'
  if (stored === 'offline') return 'offline'
  if (!lastSeenAt) return 'offline'

  const last = new Date(lastSeenAt).getTime()
  if (isNaN(last)) return 'offline'

  const diffMin = (Date.now() - last) / 60000
  if (diffMin >= OFFLINE_THRESHOLD_MIN) return 'offline'
  if (diffMin >= AWAY_THRESHOLD_MIN) return 'away'
  return (stored === 'away' ? 'away' : 'online')
}

/* ═══ GET /directory ═══
 *  쿼리: ?q=검색어 &department=치과위생사 &online=1 &role=manager &limit=&offset=
 *  응답: { users: [...], total, online_count }
 */
directory.get('/directory', async (c) => {
  const user = c.get('user')!
  const q = String(c.req.query('q') || '').trim().slice(0, 50)
  const department = String(c.req.query('department') || '').trim().slice(0, 50)
  const role = String(c.req.query('role') || '').trim()
  const onlineOnly = c.req.query('online') === '1'
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10), 1), 200)
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0)

  const wheres: string[] = [`hospital_id = ?`, `is_active = 1`, `id != ?`]
  const params: any[] = [user.hospitalId, user.id]

  if (q) {
    wheres.push(`(name LIKE ? OR email LIKE ? OR department LIKE ? OR position LIKE ?)`)
    const like = `%${q}%`
    params.push(like, like, like, like)
  }
  if (department) {
    wheres.push(`department = ?`)
    params.push(department)
  }
  if (role && ['owner', 'admin', 'manager', 'team_lead', 'member', 'guest'].includes(role)) {
    wheres.push(`messenger_role = ?`)
    params.push(role)
  }

  // Count (online_count는 후처리)
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM users WHERE ${wheres.join(' AND ')}`
  ).bind(...params).first<{ cnt: number }>()

  // 본 쿼리
  const sql = `
    SELECT id, name, email, role AS pfm_role, department, position, team,
           messenger_role, presence_status, presence_location, last_seen_at,
           profile_image, is_doctor
    FROM users
    WHERE ${wheres.join(' AND ')}
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `
  const { results } = await c.env.DB.prepare(sql).bind(...params, limit, offset).all<any>()

  // effective presence 계산
  let onlineCount = 0
  const users = (results || []).map((u: any) => {
    const eff = effectivePresence(u.presence_status || 'offline', u.last_seen_at)
    if (eff === 'online' || eff === 'dnd') onlineCount++
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      pfm_role: u.pfm_role,
      messenger_role: u.messenger_role,
      department: u.department || null,
      position: u.position || null,
      team: u.team || null,
      is_doctor: u.is_doctor === 1,
      presence: {
        stored: u.presence_status || 'offline',
        effective: eff,
        location: u.presence_location || null,
        last_seen_at: u.last_seen_at,
      },
      profile_image: u.profile_image || null,
    }
  })

  // online filter (after effective calc)
  const filtered = onlineOnly
    ? users.filter(u => u.presence.effective === 'online' || u.presence.effective === 'dnd')
    : users

  return c.json({
    users: filtered,
    total: countRow?.cnt || 0,
    online_count: onlineCount,
    limit,
    offset,
  })
})


/* ═══ GET /directory/departments ═══
 *  병원 내 distinct 부서 목록 + 각 부서별 인원 수 (필터 옵션용)
 */
directory.get('/directory/departments', async (c) => {
  const user = c.get('user')!
  const { results } = await c.env.DB.prepare(`
    SELECT
      COALESCE(NULLIF(department, ''), '(미배정)') AS department,
      COUNT(*) AS count
    FROM users
    WHERE hospital_id = ? AND is_active = 1
    GROUP BY department
    ORDER BY count DESC
  `).bind(user.hospitalId).all<any>()
  return c.json({ departments: results || [] })
})


/* ═══ GET /directory/stats ═══
 *  병원 단위 presence 통계 (대시보드용)
 */
directory.get('/directory/stats', async (c) => {
  const user = c.get('user')!
  const { results } = await c.env.DB.prepare(`
    SELECT id, presence_status, last_seen_at
    FROM users
    WHERE hospital_id = ? AND is_active = 1
  `).bind(user.hospitalId).all<any>()

  const buckets = { online: 0, away: 0, dnd: 0, offline: 0 }
  for (const u of (results || [])) {
    const eff = effectivePresence(u.presence_status || 'offline', u.last_seen_at)
    buckets[eff] = (buckets[eff] || 0) + 1
  }

  return c.json({
    total: results?.length || 0,
    ...buckets,
  })
})


/* ═══ POST /directory/presence ═══
 *  본인 presence 수동 설정.
 *  body: { status: 'online'|'away'|'dnd'|'offline', location?: string }
 */
directory.post('/directory/presence', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({}))
  const status = String(body.status || '').toLowerCase()
  const location = String(body.location || '').trim().slice(0, 50)

  if (!VALID_PRESENCE.includes(status as PresenceStatus)) {
    return c.json({ error: `status는 ${VALID_PRESENCE.join(', ')} 중 하나여야 합니다` }, 400)
  }

  await c.env.DB.prepare(`
    UPDATE users
    SET presence_status = ?, presence_location = ?, last_seen_at = CURRENT_TIMESTAMP
    WHERE id = ? AND hospital_id = ?
  `).bind(status, location, user.id, user.hospitalId).run()

  return c.json({
    success: true,
    presence: {
      stored: status,
      effective: status as PresenceStatus,
      location: location || null,
      last_seen_at: new Date().toISOString(),
    }
  })
})


/* ═══ POST /directory/heartbeat ═══
 *  last_seen_at 만 살짝 갱신 (폴링과 별개 — 페이지 활성화돼있는 동안 30초마다 호출 권장)
 *  presence_status 가 offline 이면 자동 online 으로.
 */
directory.post('/directory/heartbeat', async (c) => {
  const user = c.get('user')!

  // 현재 상태 조회
  const cur = await c.env.DB.prepare(
    `SELECT presence_status FROM users WHERE id = ? AND hospital_id = ?`
  ).bind(user.id, user.hospitalId).first<any>()

  const stored = cur?.presence_status || 'offline'
  // offline 이면 online 으로 자동 승격, 그 외 (dnd/away/online) 는 그대로 유지
  const newStatus = stored === 'offline' ? 'online' : stored

  await c.env.DB.prepare(`
    UPDATE users
    SET presence_status = ?, last_seen_at = CURRENT_TIMESTAMP
    WHERE id = ? AND hospital_id = ?
  `).bind(newStatus, user.id, user.hospitalId).run()

  return c.json({
    success: true,
    presence_status: newStatus,
    last_seen_at: new Date().toISOString(),
  })
})


/* ═══ GET /directory/me ═══
 *  본인 presence + 메신저 컨텍스트 한 번에 (UI 헤더용)
 */
directory.get('/directory/me', async (c) => {
  const user = c.get('user')!

  const row = await c.env.DB.prepare(`
    SELECT id, name, email, role AS pfm_role, messenger_role, department, position,
           presence_status, presence_location, last_seen_at, profile_image, is_doctor
    FROM users WHERE id = ? AND hospital_id = ? LIMIT 1
  `).bind(user.id, user.hospitalId).first<any>()

  if (!row) return c.json({ error: 'user not found' }, 404)

  return c.json({
    me: {
      id: row.id,
      name: row.name,
      email: row.email,
      pfm_role: row.pfm_role,
      messenger_role: row.messenger_role,
      department: row.department || null,
      position: row.position || null,
      is_doctor: row.is_doctor === 1,
      presence: {
        stored: row.presence_status || 'offline',
        effective: effectivePresence(row.presence_status || 'offline', row.last_seen_at),
        location: row.presence_location || null,
        last_seen_at: row.last_seen_at,
      },
      profile_image: row.profile_image || null,
    }
  })
})

export default directory
