import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const reviewMgmt = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 리뷰 통합 관리 시스템 ═══ */

// 리뷰 목록 조회 (수동 등록 + 관리)
reviewMgmt.get('/', async (c) => {
  const user = c.get('user')!
  const platform = sanitizeString(c.req.query('platform') || '', 20)
  const sentiment = sanitizeString(c.req.query('sentiment') || '', 20)
  const status = sanitizeString(c.req.query('status') || '', 20)
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)
  const page = sanitizeNumber(c.req.query('page'), 1, 1, 999)
  const limit = 30
  const offset = (page - 1) * limit

  let where = 'hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (platform) { where += ' AND platform=?'; params.push(platform) }
  if (sentiment) { where += ' AND sentiment=?'; params.push(sentiment) }
  if (status) { where += ' AND response_status=?'; params.push(status) }
  if (from) { where += ' AND review_date>=?'; params.push(from) }
  if (to) { where += ' AND review_date<=?'; params.push(to) }

  const [total, rows] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM review_management WHERE ${where}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT * FROM review_management WHERE ${where} ORDER BY review_date DESC, created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
  ])
  return c.json({ total: (total as any)?.c || 0, data: rows?.results || [], page, limit })
})

// 리뷰 등록 (수동)
reviewMgmt.post('/', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    platform: { type: 'enum', values: ['naver', 'google', 'kakao', 'modoo', 'instagram', 'other'] },
    reviewer_name: { type: 'string', max: 100 },
    rating: { type: 'number', min: 1, max: 5 },
    review_text: { type: 'string', max: 5000 },
    review_date: { type: 'string', max: 10 },
    review_url: { type: 'string', max: 500 },
    tags: { type: 'string', max: 500 },
  })
  if (!b.platform || !b.review_text) return c.json({ error: '플랫폼과 리뷰 내용을 입력해주세요' }, 400)

  // 자동 감성 분석 (키워드 기반)
  const text = (b.review_text || '').toLowerCase()
  const posWords = ['친절', '좋', '만족', '추천', '깨끗', '편안', '전문', '최고', '감사', '꼼꼼', '세심', '안심', '믿음', '정성', '빠른']
  const negWords = ['불친절', '나쁘', '불만', '최악', '더럽', '불편', '실망', '아프', '비싸', '오래', '기다', '무시', '불쾌', '화가']
  let posCount = 0, negCount = 0
  for (const w of posWords) if (text.includes(w)) posCount++
  for (const w of negWords) if (text.includes(w)) negCount++
  const sentiment = negCount > posCount ? 'negative' : posCount > 0 ? 'positive' : 'neutral'

  const id = 'rv-' + crypto.randomUUID().slice(0, 8)
  await c.env.DB.prepare(
    'INSERT INTO review_management (id, hospital_id, platform, reviewer_name, rating, review_text, review_date, review_url, sentiment, tags, registered_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, b.platform, b.reviewer_name || '익명', b.rating || 5, b.review_text, b.review_date || new Date().toISOString().slice(0, 10), b.review_url || '', sentiment, b.tags || '', user.id).run()

  return c.json({ success: true, id, sentiment })
})

// 리뷰 수정 (답글 등록, 상태 변경)
reviewMgmt.put('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')
  const raw = await c.req.json()
  const sets: string[] = []; const vals: any[] = []

  if (raw.response_text !== undefined) { sets.push('response_text=?'); vals.push(sanitizeString(raw.response_text, 2000)) }
  if (raw.response_status !== undefined) {
    if (!['pending','completed','skipped'].includes(raw.response_status)) return c.json({ error: '유효하지 않은 답변 상태입니다' }, 400)
    sets.push('response_status=?'); vals.push(raw.response_status)
  }
  if (raw.sentiment !== undefined) {
    if (!['positive','neutral','negative'].includes(raw.sentiment)) return c.json({ error: '유효하지 않은 감성 분류입니다' }, 400)
    sets.push('sentiment=?'); vals.push(raw.sentiment)
  }
  if (raw.tags !== undefined) { sets.push('tags=?'); vals.push(sanitizeString(raw.tags, 500)) }
  if (raw.is_pinned !== undefined) { sets.push('is_pinned=?'); vals.push(raw.is_pinned ? 1 : 0) }

  if (sets.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  sets.push('responded_by=?', 'responded_at=?', 'updated_at=CURRENT_TIMESTAMP')
  vals.push(user.id, new Date().toISOString())
  vals.push(id, user.hospitalId)

  await c.env.DB.prepare(`UPDATE review_management SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// 리뷰 삭제
reviewMgmt.delete('/:id', async (c) => {
  const user = c.get('user')!
  // 리뷰 기록 삭제는 관리자/매니저만 (평판 데이터 무단 삭제 방지)
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: '리뷰 삭제는 관리자/매니저만 가능합니다' }, 403)
  }
  const exist: any = await c.env.DB.prepare('SELECT id FROM review_management WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!exist) return c.json({ error: '리뷰를 찾을 수 없습니다' }, 404)
  await c.env.DB.prepare('DELETE FROM review_management WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

// 리뷰 대시보드 (통계)
reviewMgmt.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const from = sanitizeString(c.req.query('from') || '', 10)
  const to = sanitizeString(c.req.query('to') || '', 10)

  let df = ''
  const params: any[] = [user.hospitalId]
  if (from) { df += ' AND review_date>=?'; params.push(from) }
  if (to) { df += ' AND review_date<=?'; params.push(to) }
  const bw = 'hospital_id=?' + df

  const [
    overview,
    byPlatform,
    bySentiment,
    monthlyTrend,
    recentNegative,
    topKeywords,
    pendingResponse,
  ] = await Promise.all([
    c.env.DB.prepare(`SELECT 
      COUNT(*) as total,
      ROUND(AVG(rating),1) as avg_rating,
      SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative,
      SUM(CASE WHEN sentiment='neutral' THEN 1 ELSE 0 END) as neutral,
      SUM(CASE WHEN response_status='pending' THEN 1 ELSE 0 END) as pending_response
    FROM review_management WHERE ${bw}`).bind(...params).first(),
    c.env.DB.prepare(`SELECT platform, COUNT(*) as count, ROUND(AVG(rating),1) as avg_rating,
      SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative
    FROM review_management WHERE ${bw} GROUP BY platform ORDER BY count DESC`).bind(...params).all(),
    c.env.DB.prepare(`SELECT sentiment, COUNT(*) as count FROM review_management WHERE ${bw} GROUP BY sentiment`).bind(...params).all(),
    c.env.DB.prepare(`SELECT substr(review_date,1,7) as month, COUNT(*) as count, ROUND(AVG(rating),1) as avg_rating,
      SUM(CASE WHEN sentiment='positive' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN sentiment='negative' THEN 1 ELSE 0 END) as negative
    FROM review_management WHERE ${bw} GROUP BY month ORDER BY month DESC LIMIT 12`).bind(...params).all(),
    c.env.DB.prepare(`SELECT id, platform, reviewer_name, rating, review_text, review_date, response_status FROM review_management WHERE ${bw} AND sentiment='negative' ORDER BY review_date DESC LIMIT 10`).bind(...params).all(),
    c.env.DB.prepare(`SELECT tags FROM review_management WHERE ${bw} AND tags!=''`).bind(...params).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM review_management WHERE hospital_id=? AND response_status='pending'`).bind(user.hospitalId).first(),
  ])

  // 키워드 빈도 계산
  const kwMap: Record<string, number> = {}
  for (const r of (topKeywords?.results || []) as any[]) {
    for (const t of (r.tags || '').split(',')) {
      const k = t.trim()
      if (k) kwMap[k] = (kwMap[k] || 0) + 1
    }
  }
  const keywords = Object.entries(kwMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count }))

  const ov = (overview || {}) as any
  return c.json({
    overview: {
      total: ov.total || 0,
      avgRating: ov.avg_rating || 0,
      positive: ov.positive || 0,
      negative: ov.negative || 0,
      neutral: ov.neutral || 0,
      pendingResponse: ov.pending_response || 0,
      positiveRate: ov.total > 0 ? Math.round((ov.positive || 0) / ov.total * 1000) / 10 : 0,
    },
    byPlatform: byPlatform?.results || [],
    bySentiment: bySentiment?.results || [],
    monthlyTrend: monthlyTrend?.results || [],
    recentNegative: recentNegative?.results || [],
    keywords,
    pendingCount: (pendingResponse as any)?.c || 0,
  })
})

export default reviewMgmt
