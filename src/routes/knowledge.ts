import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const knowledge = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══════════════════════════════════════════════════════════════
 * PF 지식베이스 (Knowledge Base)
 *  - 원장님 6권 전자책 노하우 카드 (페이션트 코드 / PRM / 무자본 마케팅 /
 *    지속 개정 / Mission Complete / One Team)
 *  - is_global=1: 전체 공개 (본사 자산), hospital_id=NULL
 *  - is_global=0 + hospital_id=X: 해당 병원 전용 (자체 노하우)
 * ═══════════════════════════════════════════════════════════════ */

const VALID_CATEGORIES = [
  'consultation_script', 'patient_response', 'conversion_tips',
  'staff_training', 'marketing', 'patient_funnel',
  'success_cases', 'faq', 'clinic_policy', 'other',
] as const

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  conversion_tips:     { label: '전환율 노하우', icon: '🎯' },
  consultation_script: { label: '상담 스크립트', icon: '📜' },
  patient_response:    { label: '환자 응대',     icon: '🤝' },
  marketing:           { label: '마케팅',         icon: '📈' },
  patient_funnel:      { label: '퍼널 전략',     icon: '🌀' },
  staff_training:      { label: '직원 교육',     icon: '👥' },
  success_cases:       { label: '성공 사례',     icon: '🏆' },
  faq:                 { label: '자주 묻는 질문', icon: '❓' },
  clinic_policy:       { label: '병원 정책',     icon: '🏥' },
  other:               { label: '기타',           icon: '📁' },
}

/* ───────────────────────────────────────────────
 * GET /api/protected/knowledge
 *   - 카드 리스트 (검색/카테고리/태그/책 필터)
 *   - q=검색어 (title + content + tags)
 *   - category=conversion_tips
 *   - book=페이션트 코드
 *   - scope=global|hospital|all (default all)
 *   - sort=priority|recent|popular
 *   - limit/offset
 * ─────────────────────────────────────────────── */
knowledge.get('/', async (c) => {
  const user = c.get('user')!
  const q = (c.req.query('q') || '').trim()
  const category = c.req.query('category') || ''
  const book = c.req.query('book') || ''
  const scope = c.req.query('scope') || 'all'
  const sort = c.req.query('sort') || 'priority'
  const limit = Math.min(Number(c.req.query('limit') || 50), 200)
  const offset = Math.max(Number(c.req.query('offset') || 0), 0)

  const conds: string[] = ['is_active=1']
  const binds: any[] = []

  if (scope === 'global') {
    conds.push('is_global=1')
  } else if (scope === 'hospital') {
    conds.push('hospital_id=?')
    binds.push(user.hospitalId)
  } else {
    // all: 전역 공개 + 자기 병원
    conds.push('(is_global=1 OR hospital_id=?)')
    binds.push(user.hospitalId)
  }

  if (q) {
    conds.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)')
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (category && VALID_CATEGORIES.includes(category as any)) {
    conds.push('category=?')
    binds.push(category)
  }
  if (book) {
    conds.push('book_source=?')
    binds.push(book)
  }

  const orderBy = sort === 'recent' ? 'updated_at DESC, priority DESC'
    : sort === 'popular' ? 'view_count DESC, priority DESC'
    : 'priority DESC, updated_at DESC'

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

  const [rows, total, cats, books] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, hospital_id, category, title, content, tags, priority,
              is_global, view_count, book_source, created_at, updated_at
         FROM knowledge_base ${where}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM knowledge_base ${where}`
    ).bind(...binds).first<any>(),
    c.env.DB.prepare(
      `SELECT category, COUNT(*) AS c FROM knowledge_base
        WHERE is_active=1 AND (is_global=1 OR hospital_id=?)
        GROUP BY category ORDER BY c DESC`
    ).bind(user.hospitalId).all<any>(),
    c.env.DB.prepare(
      `SELECT book_source, COUNT(*) AS c FROM knowledge_base
        WHERE is_active=1 AND (is_global=1 OR hospital_id=?) AND book_source!=''
        GROUP BY book_source ORDER BY c DESC`
    ).bind(user.hospitalId).all<any>(),
  ])

  // 즐겨찾기 ID 세트
  const favRows = await c.env.DB.prepare(
    `SELECT knowledge_id FROM knowledge_favorites WHERE user_id=?`
  ).bind(user.id).all<any>()
  const favSet = new Set((favRows.results || []).map(r => r.knowledge_id))

  return c.json({
    cards: (rows.results || []).map(r => ({
      ...r,
      is_global: !!r.is_global,
      is_favorite: favSet.has(r.id),
      tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      categoryMeta: CATEGORY_META[r.category] || { label: r.category, icon: '📁' },
    })),
    total: Number(total?.c || 0),
    categories: (cats.results || []).map((r: any) => ({
      key: r.category,
      label: CATEGORY_META[r.category]?.label || r.category,
      icon: CATEGORY_META[r.category]?.icon || '📁',
      count: r.c,
    })),
    books: (books.results || []).map((r: any) => ({ name: r.book_source, count: r.c })),
    pagination: { limit, offset },
  })
})

/* ───────────────────────────────────────────────
 * GET /api/protected/knowledge/:id
 *   - 카드 상세 + view_count 증가 + view 로그
 * ─────────────────────────────────────────────── */
knowledge.get('/:id', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')

  const card = await c.env.DB.prepare(
    `SELECT * FROM knowledge_base
      WHERE id=? AND is_active=1 AND (is_global=1 OR hospital_id=?)`
  ).bind(id, user.hospitalId).first<any>()

  if (!card) return c.json({ error: '카드를 찾을 수 없습니다' }, 404)

  // view_count 증가 + 로그 (실패해도 본 응답은 진행)
  c.executionCtx.waitUntil((async () => {
    try {
      await c.env.DB.prepare(`UPDATE knowledge_base SET view_count = view_count + 1 WHERE id=?`).bind(id).run()
      await c.env.DB.prepare(
        `INSERT INTO knowledge_views (id, user_id, knowledge_id) VALUES (?, ?, ?)`
      ).bind(crypto.randomUUID(), user.id, id).run()
    } catch (e) { /* noop */ }
  })())

  const fav = await c.env.DB.prepare(
    `SELECT id FROM knowledge_favorites WHERE user_id=? AND knowledge_id=?`
  ).bind(user.id, id).first<any>()

  return c.json({
    ...card,
    is_global: !!card.is_global,
    is_favorite: !!fav,
    tags: card.tags ? card.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    categoryMeta: CATEGORY_META[card.category] || { label: card.category, icon: '📁' },
  })
})

/* ───────────────────────────────────────────────
 * POST /api/protected/knowledge
 *   - 새 카드 생성 (병원 전용)
 *   body: { category, title, content, tags?, priority?, book_source? }
 * ─────────────────────────────────────────────── */
knowledge.post('/', async (c) => {
  const user = c.get('user')!
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다 (관리자/매니저 전용)' }, 403)
  }

  const body = await c.req.json().catch(() => ({})) as any
  const category = String(body.category || '')
  const title = String(body.title || '').trim().slice(0, 200)
  const content = String(body.content || '').trim().slice(0, 50000)
  const tags = String(body.tags || '').slice(0, 500)
  const priority = Math.min(Math.max(Number(body.priority || 50), 0), 100)
  const book = String(body.book_source || '').slice(0, 100)

  if (!VALID_CATEGORIES.includes(category as any)) {
    return c.json({ error: '카테고리가 올바르지 않습니다' }, 400)
  }
  if (!title || !content) {
    return c.json({ error: '제목과 내용은 필수입니다' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO knowledge_base (id, hospital_id, category, title, content, tags,
       priority, is_global, is_active, book_source, created_by, view_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, 0)`
  ).bind(id, user.hospitalId, category, title, content, tags, priority, book, user.id).run()

  return c.json({ ok: true, id })
})

/* ───────────────────────────────────────────────
 * PUT /api/protected/knowledge/:id
 *   - 카드 수정 (병원 전용 카드만, 전역 카드는 수정 불가)
 * ─────────────────────────────────────────────── */
knowledge.put('/:id', async (c) => {
  const user = c.get('user')!
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const id = c.req.param('id')

  const exist = await c.env.DB.prepare(
    `SELECT hospital_id, is_global FROM knowledge_base WHERE id=?`
  ).bind(id).first<any>()
  if (!exist) return c.json({ error: '카드를 찾을 수 없습니다' }, 404)
  if (exist.is_global) return c.json({ error: '전역 카드는 수정할 수 없습니다' }, 403)
  if (exist.hospital_id !== user.hospitalId) return c.json({ error: '권한이 없습니다' }, 403)

  const body = await c.req.json().catch(() => ({})) as any
  const fields: string[] = []
  const binds: any[] = []
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) return c.json({ error: '카테고리 오류' }, 400)
    fields.push('category=?'); binds.push(body.category)
  }
  if (body.title !== undefined)    { fields.push('title=?');    binds.push(String(body.title).slice(0, 200)) }
  if (body.content !== undefined)  { fields.push('content=?');  binds.push(String(body.content).slice(0, 50000)) }
  if (body.tags !== undefined)     { fields.push('tags=?');     binds.push(String(body.tags).slice(0, 500)) }
  if (body.priority !== undefined) { fields.push('priority=?'); binds.push(Math.min(Math.max(Number(body.priority), 0), 100)) }
  if (body.book_source !== undefined) { fields.push('book_source=?'); binds.push(String(body.book_source).slice(0, 100)) }

  if (!fields.length) return c.json({ error: '변경할 항목이 없습니다' }, 400)
  fields.push('updated_at=CURRENT_TIMESTAMP')

  await c.env.DB.prepare(
    `UPDATE knowledge_base SET ${fields.join(', ')} WHERE id=?`
  ).bind(...binds, id).run()

  return c.json({ ok: true })
})

/* ───────────────────────────────────────────────
 * DELETE /api/protected/knowledge/:id (soft delete)
 * ─────────────────────────────────────────────── */
knowledge.delete('/:id', async (c) => {
  const user = c.get('user')!
  if (!['admin', 'manager'].includes(user.role)) {
    return c.json({ error: '권한이 없습니다' }, 403)
  }
  const id = c.req.param('id')
  const exist = await c.env.DB.prepare(
    `SELECT hospital_id, is_global FROM knowledge_base WHERE id=?`
  ).bind(id).first<any>()
  if (!exist) return c.json({ error: '카드를 찾을 수 없습니다' }, 404)
  if (exist.is_global) return c.json({ error: '전역 카드는 삭제할 수 없습니다' }, 403)
  if (exist.hospital_id !== user.hospitalId) return c.json({ error: '권한이 없습니다' }, 403)

  await c.env.DB.prepare(`UPDATE knowledge_base SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run()
  return c.json({ ok: true })
})

/* ───────────────────────────────────────────────
 * POST /api/protected/knowledge/:id/favorite (toggle)
 * ─────────────────────────────────────────────── */
knowledge.post('/:id/favorite', async (c) => {
  const user = c.get('user')!
  const id = c.req.param('id')

  const exist = await c.env.DB.prepare(
    `SELECT id FROM knowledge_favorites WHERE user_id=? AND knowledge_id=?`
  ).bind(user.id, id).first<any>()

  if (exist) {
    await c.env.DB.prepare(`DELETE FROM knowledge_favorites WHERE id=?`).bind(exist.id).run()
    return c.json({ ok: true, favorited: false })
  } else {
    await c.env.DB.prepare(
      `INSERT INTO knowledge_favorites (id, user_id, knowledge_id) VALUES (?, ?, ?)`
    ).bind(crypto.randomUUID(), user.id, id).run()
    return c.json({ ok: true, favorited: true })
  }
})

/* ───────────────────────────────────────────────
 * GET /api/protected/knowledge/_meta/categories
 *   - 카테고리/책 마스터 + 인기 카드 TOP 5
 * ─────────────────────────────────────────────── */
knowledge.get('/_meta/info', async (c) => {
  const user = c.get('user')!

  const [stats, popular, recent, favorites] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN is_global=1 THEN 1 ELSE 0 END) AS global_cnt,
         SUM(CASE WHEN hospital_id=? THEN 1 ELSE 0 END) AS hospital_cnt
       FROM knowledge_base WHERE is_active=1 AND (is_global=1 OR hospital_id=?)`
    ).bind(user.hospitalId, user.hospitalId).first<any>(),
    c.env.DB.prepare(
      `SELECT id, title, category, view_count, book_source FROM knowledge_base
        WHERE is_active=1 AND (is_global=1 OR hospital_id=?)
        ORDER BY view_count DESC LIMIT 5`
    ).bind(user.hospitalId).all<any>(),
    c.env.DB.prepare(
      `SELECT id, title, category, updated_at, book_source FROM knowledge_base
        WHERE is_active=1 AND (is_global=1 OR hospital_id=?)
        ORDER BY updated_at DESC LIMIT 5`
    ).bind(user.hospitalId).all<any>(),
    c.env.DB.prepare(
      `SELECT kb.id, kb.title, kb.category, kb.book_source
         FROM knowledge_favorites f
         JOIN knowledge_base kb ON kb.id = f.knowledge_id
        WHERE f.user_id=? AND kb.is_active=1
        ORDER BY f.created_at DESC LIMIT 10`
    ).bind(user.id).all<any>(),
  ])

  return c.json({
    stats: {
      total: Number(stats?.total || 0),
      global: Number(stats?.global_cnt || 0),
      hospital: Number(stats?.hospital_cnt || 0),
    },
    categories: Object.entries(CATEGORY_META).map(([key, m]) => ({ key, ...m })),
    popular: popular.results || [],
    recent: recent.results || [],
    favorites: favorites.results || [],
  })
})

/* ───────────────────────────────────────────────
 * GET /api/protected/knowledge/_recommend/by-context
 *   - 상황 기반 카드 자동 추천
 *   - context=low_conversion | low_new_patient | high_noshow |
 *            low_review | complaint | daily | onboarding
 *   - limit (default 3)
 * ─────────────────────────────────────────────── */
knowledge.get('/_recommend/by-context', async (c) => {
  const user = c.get('user')!
  const context = c.req.query('context') || 'daily'
  const limit = Math.min(Number(c.req.query('limit') || 3), 10)

  // context → 카테고리·태그 매핑
  const CONTEXT_RULES: Record<string, { categories: string[]; tagsLike: string[] }> = {
    low_conversion:    { categories: ['conversion_tips', 'consultation_script'], tagsLike: ['전환', '상담', 'SPIN', '거절'] },
    low_new_patient:   { categories: ['marketing', 'patient_funnel'],            tagsLike: ['신환', '유입', '광고', '소개'] },
    high_noshow:       { categories: ['patient_response', 'consultation_script'], tagsLike: ['노쇼', '예약', '리마인더'] },
    low_review:        { categories: ['marketing', 'patient_response'],          tagsLike: ['리뷰', '후기', '소개'] },
    complaint:         { categories: ['patient_response', 'staff_training'],     tagsLike: ['컴플레인', '응대', 'VIP'] },
    onboarding:        { categories: ['staff_training'],                          tagsLike: ['교육', '온보딩', 'One Team'] },
    daily:             { categories: ['patient_funnel', 'conversion_tips'],      tagsLike: [] },
  }
  const rule = CONTEXT_RULES[context] || CONTEXT_RULES.daily

  // 카테고리 + 태그 점수 매칭
  const catBinds = rule.categories.map(() => '?').join(',')
  const tagConds = rule.tagsLike.length
    ? rule.tagsLike.map(() => '(tags LIKE ? OR title LIKE ?)').join(' OR ')
    : '1=0'
  const tagBinds = rule.tagsLike.flatMap(t => [`%${t}%`, `%${t}%`])

  const sql = `
    SELECT id, category, title, content, tags, book_source, view_count,
           (CASE WHEN category IN (${catBinds || "''"}) THEN 10 ELSE 0 END) +
           (CASE WHEN ${tagConds} THEN 5 ELSE 0 END) +
           (priority * 0.1) AS score
      FROM knowledge_base
     WHERE is_active=1 AND (is_global=1 OR hospital_id=?)
     ORDER BY score DESC, view_count DESC, priority DESC
     LIMIT ?
  `
  const allBinds = [...rule.categories, ...tagBinds, user.hospitalId, limit]
  const rows = await c.env.DB.prepare(sql).bind(...allBinds).all<any>()

  return c.json({
    context,
    rule,
    cards: (rows.results || []).map(r => ({
      ...r,
      tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      categoryMeta: CATEGORY_META[r.category] || { label: r.category, icon: '📁' },
      // content 길이 제한 (미리보기용)
      preview: String(r.content || '').slice(0, 180),
    })),
  })
})

/* ───────────────────────────────────────────────
 * GET /api/protected/knowledge/_recommend/daily
 *   - "오늘의 노하우 카드" (사용자별 시드 기반 1장)
 * ─────────────────────────────────────────────── */
knowledge.get('/_recommend/daily', async (c) => {
  const user = c.get('user')!
  // 일자 + user.id 해시로 결정적 인덱스 (같은 날 같은 사람은 같은 카드)
  const today = new Date().toISOString().slice(0, 10)
  const seedStr = today + ':' + user.id
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) | 0
  seed = Math.abs(seed)

  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM knowledge_base
      WHERE is_active=1 AND (is_global=1 OR hospital_id=?)`
  ).bind(user.hospitalId).first<any>()
  const cnt = Number(total?.c || 0)
  if (!cnt) return c.json({ card: null })

  const offset = seed % cnt
  const card = await c.env.DB.prepare(
    `SELECT id, category, title, content, tags, book_source, view_count
       FROM knowledge_base
      WHERE is_active=1 AND (is_global=1 OR hospital_id=?)
      ORDER BY priority DESC, id ASC
      LIMIT 1 OFFSET ?`
  ).bind(user.hospitalId, offset).first<any>()

  if (!card) return c.json({ card: null })

  return c.json({
    card: {
      ...card,
      tags: card.tags ? card.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      categoryMeta: CATEGORY_META[card.category] || { label: card.category, icon: '📁' },
      preview: String(card.content || '').slice(0, 220),
    },
    date: today,
  })
})

export default knowledge
