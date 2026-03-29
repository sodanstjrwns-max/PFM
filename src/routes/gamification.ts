import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const gamification = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 직원 성과 게이미피케이션 ═══ */

// 미션 목록 조회
gamification.get('/missions', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'weekly', 10)
  const rows = await c.env.DB.prepare(
    'SELECT * FROM gamification_missions WHERE hospital_id=? AND period=? AND is_active=1 ORDER BY sort_order, created_at'
  ).bind(user.hospitalId, period).all()
  return c.json(rows?.results || [])
})

// 미션 생성 (관리자)
gamification.post('/missions', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    title: { type: 'string', max: 200 },
    description: { type: 'string', max: 1000 },
    mission_type: { type: 'enum', values: ['consult_conversion', 'review_collect', 'patient_recall', 'call_target', 'nps_score', 'attendance', 'custom'] },
    period: { type: 'enum', values: ['daily', 'weekly', 'monthly'] },
    target_value: { type: 'number', min: 1, max: 99999 },
    points: { type: 'number', min: 1, max: 10000, default: 100 },
    badge_icon: { type: 'string', max: 10 },
    target_role: { type: 'string', max: 50 },
  })
  if (!b.title || !b.mission_type || !b.target_value) return c.json({ error: '필수 항목을 입력해주세요' }, 400)
  const id = 'gm-' + crypto.randomUUID().slice(0, 8)
  await c.env.DB.prepare(
    'INSERT INTO gamification_missions (id, hospital_id, title, description, mission_type, period, target_value, points, badge_icon, target_role, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, b.title, b.description || '', b.mission_type, b.period || 'weekly', b.target_value, b.points || 100, b.badge_icon || '🏆', b.target_role || 'all', user.id).run()
  return c.json({ success: true, id })
})

// 미션 삭제
gamification.delete('/missions/:id', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('UPDATE gamification_missions SET is_active=0 WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 내 진행상황 + 랭킹
gamification.get('/my-progress', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'weekly', 10)
  
  // 현재 기간 키 계산
  const now = new Date()
  let periodKey = ''
  if (period === 'daily') periodKey = now.toISOString().slice(0, 10)
  else if (period === 'weekly') {
    const d = new Date(now); const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    periodKey = 'W' + d.toISOString().slice(0, 10)
  } else periodKey = now.toISOString().slice(0, 7)

  const [missions, myProgress, totalPoints] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM gamification_missions WHERE hospital_id=? AND period=? AND is_active=1 ORDER BY sort_order').bind(user.hospitalId, period).all(),
    c.env.DB.prepare('SELECT * FROM gamification_progress WHERE hospital_id=? AND user_id=? AND period_key=?').bind(user.hospitalId, user.id, periodKey).all(),
    c.env.DB.prepare('SELECT COALESCE(SUM(points_earned),0) as total FROM gamification_progress WHERE hospital_id=? AND user_id=?').bind(user.hospitalId, user.id).first(),
  ])

  const progressMap: Record<string, any> = {}
  for (const p of (myProgress?.results || []) as any[]) progressMap[p.mission_id] = p

  const missionProgress = (missions?.results || []).map((m: any) => {
    const prog = progressMap[m.id]
    return {
      ...m,
      currentValue: prog?.current_value || 0,
      completed: prog?.completed || 0,
      pointsEarned: prog?.points_earned || 0,
      progress: m.target_value > 0 ? Math.min(100, Math.round((prog?.current_value || 0) / m.target_value * 100)) : 0,
    }
  })

  return c.json({
    periodKey,
    missions: missionProgress,
    totalPoints: (totalPoints as any)?.total || 0,
  })
})

// 포인트 부여 (관리자) 또는 자동 업데이트
gamification.post('/update-progress', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const { user_id, mission_id, value } = raw
  if (!user_id || !mission_id) return c.json({ error: '필수 항목 누락' }, 400)

  const mission: any = await c.env.DB.prepare('SELECT * FROM gamification_missions WHERE id=? AND hospital_id=?').bind(mission_id, user.hospitalId).first()
  if (!mission) return c.json({ error: '미션을 찾을 수 없습니다' }, 404)

  const now = new Date()
  let periodKey = ''
  if (mission.period === 'daily') periodKey = now.toISOString().slice(0, 10)
  else if (mission.period === 'weekly') {
    const d = new Date(now); const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    periodKey = 'W' + d.toISOString().slice(0, 10)
  } else periodKey = now.toISOString().slice(0, 7)

  const newValue = sanitizeNumber(value, 0, 0, 99999)
  const completed = newValue >= mission.target_value ? 1 : 0
  const pointsEarned = completed ? mission.points : 0

  const existing: any = await c.env.DB.prepare('SELECT id FROM gamification_progress WHERE hospital_id=? AND user_id=? AND mission_id=? AND period_key=?').bind(user.hospitalId, user_id, mission_id, periodKey).first()
  if (existing) {
    await c.env.DB.prepare('UPDATE gamification_progress SET current_value=?, completed=?, points_earned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(newValue, completed, pointsEarned, existing.id).run()
  } else {
    const id = 'gp-' + crypto.randomUUID().slice(0, 8)
    await c.env.DB.prepare('INSERT INTO gamification_progress (id, hospital_id, user_id, mission_id, period_key, current_value, completed, points_earned) VALUES (?,?,?,?,?,?,?,?)')
      .bind(id, user.hospitalId, user_id, mission_id, periodKey, newValue, completed, pointsEarned).run()
  }

  return c.json({ success: true, completed, pointsEarned })
})

// 전체 랭킹
gamification.get('/ranking', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'all', 10)

  let dateFilter = ''
  const params: any[] = [user.hospitalId]

  if (period === 'monthly') {
    dateFilter = " AND gp.period_key LIKE ?"
    params.push(new Date().toISOString().slice(0, 7) + '%')
  } else if (period === 'weekly') {
    const d = new Date(); const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    dateFilter = " AND gp.period_key = ?"
    params.push('W' + d.toISOString().slice(0, 10))
  }

  const rows = await c.env.DB.prepare(`
    SELECT u.id, u.name, u.position, u.team, u.role,
      COALESCE(SUM(gp.points_earned), 0) as total_points,
      COUNT(CASE WHEN gp.completed=1 THEN 1 END) as missions_completed
    FROM users u
    LEFT JOIN gamification_progress gp ON u.id=gp.user_id AND gp.hospital_id=?${dateFilter}
    WHERE u.hospital_id=? AND u.is_active=1
    GROUP BY u.id
    ORDER BY total_points DESC, missions_completed DESC
    LIMIT 50
  `).bind(...params, user.hospitalId).all()

  // 배지 계산
  const ranking = (rows?.results || []).map((r: any, i: number) => ({
    ...r,
    rank: i + 1,
    badge: r.total_points >= 5000 ? '💎' : r.total_points >= 2000 ? '🥇' : r.total_points >= 1000 ? '🥈' : r.total_points >= 500 ? '🥉' : r.total_points > 0 ? '⭐' : '',
    level: r.total_points >= 5000 ? '다이아몬드' : r.total_points >= 2000 ? '골드' : r.total_points >= 1000 ? '실버' : r.total_points >= 500 ? '브론즈' : '뉴비',
  }))

  return c.json({ ranking, period })
})

export default gamification
