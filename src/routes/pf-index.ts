import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'

const pfIndex = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══════════════════════════════════════════════════════════════
 * PF Index (페이션트 인덱스)
 *  - 매주 월요일 원장 대상 병원 경영 / 개원가 분위기 설문 (20문항)
 *  - 5점 척도 (1~5), reverse: Q6/Q7/Q11
 *  - 카테고리: inflow(Q1-4) / behavior(Q5-7) / operation(Q8-11) / outlook(Q12-19)
 *    Q20 은 종합 만족도 → overall 평균에 포함
 * ═══════════════════════════════════════════════════════════════ */

const REVERSE_Q = new Set([6, 7, 11])

/** 점수 정규화 (역산 항목 적용) */
function normalize(qNo: number, raw: number): number {
  if (REVERSE_Q.has(qNo)) return 6 - raw
  return raw
}

/** KST(=UTC+9) 기준 오늘 날짜의 "이번 주 월요일" YYYY-MM-DD 반환 */
function getWeekStart(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000)
  const day = kst.getUTCDay() // 0=Sun .. 1=Mon .. 6=Sat
  const diff = day === 0 ? -6 : 1 - day // Sun → -6, Mon → 0, Tue → -1 ...
  const monday = new Date(kst.getTime() + diff * 86400 * 1000)
  return monday.toISOString().slice(0, 10)
}

/** 해당 날짜의 ISO week number */
function getWeekNumber(yyyymmdd: string): { year: number; week: number } {
  const d = new Date(yyyymmdd + 'T00:00:00Z')
  const target = new Date(d.valueOf())
  const dayNr = (d.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const diff = (target.valueOf() - firstThursday.valueOf()) / 86400000
  return {
    year: target.getUTCFullYear(),
    week: 1 + Math.floor(diff / 7)
  }
}

/** 객관 데이터 자동 계산 (이번 달 기준) */
async function computeObjective(db: D1Database, hospitalId: string) {
  const month = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7)
  const monthStart = `${month}-01`

  const [pat, cs, calls, rev] = await Promise.all([
    db.prepare(`
      SELECT
        SUM(CASE WHEN first_visit_date >= ? THEN 1 ELSE 0 END) AS new_cnt,
        COUNT(*) AS total_cnt
      FROM patients WHERE hospital_id = ?
    `).bind(monthStart, hospitalId).first<any>(),
    db.prepare(`
      SELECT
        COUNT(*) AS cs_cnt,
        SUM(CASE WHEN status IN ('payment','treatment','completed') THEN 1 ELSE 0 END) AS paid_cnt,
        AVG(CASE WHEN status IN ('payment','treatment','completed') THEN COALESCE(paid_amount, agreed_amount, estimated_amount, 0) END) AS avg_rev,
        SUM(CASE WHEN status IN ('payment','treatment','completed') THEN COALESCE(paid_amount, agreed_amount, estimated_amount, 0) ELSE 0 END) AS total_rev
      FROM consultations
      WHERE hospital_id = ? AND consultation_date >= ?
    `).bind(hospitalId, monthStart).first<any>(),
    db.prepare(`SELECT COUNT(*) AS c FROM call_records WHERE hospital_id = ? AND call_date >= ?`)
      .bind(hospitalId, monthStart).first<any>(),
    db.prepare(`SELECT COUNT(*) AS c FROM reviews WHERE hospital_id = ? AND created_at >= ?`)
      .bind(hospitalId, monthStart).first<any>(),
  ])

  const csCnt = Number(cs?.cs_cnt || 0)
  const paidCnt = Number(cs?.paid_cnt || 0)
  return {
    new_patients: Number(pat?.new_cnt || 0),
    total_patients: Number(pat?.total_cnt || 0),
    consultation_cnt: csCnt,
    conversion_rate: csCnt > 0 ? Math.round((paidCnt / csCnt) * 1000) / 10 : 0,
    avg_revenue: Math.round(Number(cs?.avg_rev || 0)),
    total_revenue: Math.round(Number(cs?.total_rev || 0)),
    call_count: Number(calls?.c || 0),
    review_count: Number(rev?.c || 0),
  }
}

/* ───────────────────────────────────────────────
 * GET /api/protected/pf-index/status
 *   - 이번 주 응답 여부
 *   - 객관 데이터 자동 채움 (참고용)
 *   - 회피 횟수, 누적 응답, streak
 *   - 문항 마스터 동봉
 * ─────────────────────────────────────────────── */
pfIndex.get('/status', async (c) => {
  const user = c.get('user')!
  const weekStart = getWeekStart()

  const [resp, status, questions] = await Promise.all([
    c.env.DB.prepare(`SELECT id, score_overall, created_at FROM pf_index_responses WHERE user_id=? AND week_start=?`)
      .bind(user.id, weekStart).first<any>(),
    c.env.DB.prepare(`SELECT * FROM pf_index_user_status WHERE user_id=?`).bind(user.id).first<any>(),
    c.env.DB.prepare(`SELECT id, category, question, reverse, options FROM pf_index_questions WHERE active=1 ORDER BY sort_order`).all(),
  ])

  const objective = await computeObjective(c.env.DB, user.hospitalId)

  // 전국 참여 현황 (이번 주)
  const nat = await c.env.DB.prepare(
    `SELECT COUNT(*) AS responses, COUNT(DISTINCT hospital_id) AS hospitals
     FROM pf_index_responses WHERE week_start=? AND share_to_national=1`
  ).bind(weekStart).first<any>()

  return c.json({
    weekStart,
    responded: !!resp,
    respondedAt: resp?.created_at || null,
    myScore: resp?.score_overall || null,
    status: status || {
      total_responses: 0,
      current_streak: 0,
      longest_streak: 0,
      last_dismissed_week: '',
      dismissed_count: 0,
    },
    objective,
    questions: (questions.results || []).map((q: any) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      reverse: !!q.reverse,
      options: JSON.parse(q.options || '[]'),
    })),
    national: {
      thisWeekResponses: Number(nat?.responses || 0),
      thisWeekHospitals: Number(nat?.hospitals || 0),
    }
  })
})

/* ───────────────────────────────────────────────
 * POST /api/protected/pf-index/submit
 *   body: { answers: {1:5,2:4,...,20:3}, comment?, region?, specialty?, hospital_size?, share_to_national? }
 * ─────────────────────────────────────────────── */
pfIndex.post('/submit', async (c) => {
  const user = c.get('user')!
  const body = await c.req.json().catch(() => ({})) as any

  const answers = body.answers || {}
  // 1~20 모두 1~5 정수 검증
  for (let i = 1; i <= 20; i++) {
    const v = Number(answers[i])
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return c.json({ error: `Q${i} 답변이 누락되었거나 잘못되었습니다 (1~5)` }, 400)
    }
  }

  const weekStart = getWeekStart()
  const { year, week } = getWeekNumber(weekStart)

  // 점수 계산 (역산 적용)
  const norm: Record<number, number> = {}
  for (let i = 1; i <= 20; i++) norm[i] = normalize(i, Number(answers[i]))

  const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100
  const score_inflow    = avg([norm[1], norm[2], norm[3], norm[4]])
  const score_behavior  = avg([norm[5], norm[6], norm[7]])
  const score_operation = avg([norm[8], norm[9], norm[10], norm[11]])
  const score_outlook   = avg([norm[12], norm[13], norm[14], norm[15], norm[16], norm[17], norm[18], norm[19]])
  const score_overall   = avg(Object.values(norm))

  // 객관 데이터 스냅샷
  const obj = await computeObjective(c.env.DB, user.hospitalId)

  const id = crypto.randomUUID()
  const region = String(body.region || '').slice(0, 50)
  const specialty = String(body.specialty || 'dental').slice(0, 30)
  const hospital_size = String(body.hospital_size || '').slice(0, 30)
  const position = String((user as any).position || 'doctor').slice(0, 30)
  const comment = String(body.comment || '').slice(0, 1000)
  const share_to_national = body.share_to_national === false ? 0 : 1

  // UNIQUE(user_id, week_start) 위배 시 OR REPLACE 로 덮어쓰기 (수정 허용)
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO pf_index_responses (
      id, hospital_id, user_id, week_start, year, week_number,
      region, specialty, position, hospital_size,
      q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20,
      obj_new_patients, obj_total_patients, obj_consultation_cnt, obj_conversion_rate,
      obj_avg_revenue, obj_total_revenue, obj_call_count, obj_review_count,
      score_inflow, score_behavior, score_operation, score_outlook, score_overall,
      comment, share_to_national,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `).bind(
    id, user.hospitalId, user.id, weekStart, year, week,
    region, specialty, position, hospital_size,
    answers[1],answers[2],answers[3],answers[4],answers[5],
    answers[6],answers[7],answers[8],answers[9],answers[10],
    answers[11],answers[12],answers[13],answers[14],answers[15],
    answers[16],answers[17],answers[18],answers[19],answers[20],
    obj.new_patients, obj.total_patients, obj.consultation_cnt, obj.conversion_rate,
    obj.avg_revenue, obj.total_revenue, obj.call_count, obj.review_count,
    score_inflow, score_behavior, score_operation, score_outlook, score_overall,
    comment, share_to_national
  ).run()

  // user_status UPSERT (streak 갱신)
  const prev = await c.env.DB.prepare(`SELECT * FROM pf_index_user_status WHERE user_id=?`).bind(user.id).first<any>()
  const lastWk = prev?.last_responded_week || ''
  const prevStreak = Number(prev?.current_streak || 0)
  const longest = Number(prev?.longest_streak || 0)

  // streak 계산: lastWk 가 정확히 1주 전 월요일이면 +1, 아니면 1로 리셋
  const lastDate = lastWk ? new Date(lastWk + 'T00:00:00Z') : null
  const thisDate = new Date(weekStart + 'T00:00:00Z')
  const diffDays = lastDate ? Math.round((thisDate.getTime() - lastDate.getTime()) / 86400000) : null
  const newStreak = diffDays === 7 ? prevStreak + 1 : 1
  const newLongest = Math.max(longest, newStreak)
  const totalResp = Number(prev?.total_responses || 0) + (lastWk === weekStart ? 0 : 1)

  await c.env.DB.prepare(`
    INSERT INTO pf_index_user_status (user_id, hospital_id, last_responded_week, total_responses, current_streak, longest_streak, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      last_responded_week=excluded.last_responded_week,
      total_responses=excluded.total_responses,
      current_streak=excluded.current_streak,
      longest_streak=excluded.longest_streak,
      updated_at=CURRENT_TIMESTAMP
  `).bind(user.id, user.hospitalId, weekStart, totalResp, newStreak, newLongest).run()

  // 이번 주 집계 캐시 무효화 (다음 호출 시 재계산)
  await c.env.DB.prepare(`DELETE FROM pf_index_weekly_aggregate WHERE week_start=?`).bind(weekStart).run()

  return c.json({
    success: true,
    id,
    weekStart,
    scores: { inflow: score_inflow, behavior: score_behavior, operation: score_operation, outlook: score_outlook, overall: score_overall },
    streak: newStreak,
    totalResponses: totalResp,
    objective: obj,
  })
})

/* ───────────────────────────────────────────────
 * POST /api/protected/pf-index/dismiss
 *   "이번 주는 나중에" 버튼 — 팝업 일시 회피
 * ─────────────────────────────────────────────── */
pfIndex.post('/dismiss', async (c) => {
  const user = c.get('user')!
  const weekStart = getWeekStart()
  await c.env.DB.prepare(`
    INSERT INTO pf_index_user_status (user_id, hospital_id, last_dismissed_week, dismissed_count, updated_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      last_dismissed_week=excluded.last_dismissed_week,
      dismissed_count=dismissed_count+1,
      updated_at=CURRENT_TIMESTAMP
  `).bind(user.id, user.hospitalId, weekStart).run()
  return c.json({ success: true, dismissedFor: weekStart })
})

/* ───────────────────────────────────────────────
 * 주간 집계 재계산 (캐시 미스 시)
 * ─────────────────────────────────────────────── */
async function computeWeeklyAggregate(db: D1Database, weekStart: string) {
  // 전체 평균 + 카테고리 평균
  const agg = await db.prepare(`
    SELECT
      COUNT(*) AS total_responses,
      COUNT(DISTINCT hospital_id) AS total_hospitals,
      AVG(q1) AS aq1, AVG(q2) AS aq2, AVG(q3) AS aq3, AVG(q4) AS aq4,
      AVG(q5) AS aq5, AVG(q6) AS aq6, AVG(q7) AS aq7, AVG(q8) AS aq8,
      AVG(q9) AS aq9, AVG(q10) AS aq10, AVG(q11) AS aq11, AVG(q12) AS aq12,
      AVG(q13) AS aq13, AVG(q14) AS aq14, AVG(q15) AS aq15, AVG(q16) AS aq16,
      AVG(q17) AS aq17, AVG(q18) AS aq18, AVG(q19) AS aq19, AVG(q20) AS aq20,
      AVG(score_inflow) AS ai, AVG(score_behavior) AS ab,
      AVG(score_operation) AS ao, AVG(score_outlook) AS aol,
      AVG(score_overall) AS aov
    FROM pf_index_responses
    WHERE week_start=? AND share_to_national=1
  `).bind(weekStart).first<any>()

  // 분포
  const distRows = await db.prepare(`
    SELECT ROUND(score_overall) AS bucket, COUNT(*) AS c
    FROM pf_index_responses
    WHERE week_start=? AND share_to_national=1
    GROUP BY bucket
  `).bind(weekStart).all()
  const total = Number(agg?.total_responses || 0)
  const dist: Record<string, number> = {}
  for (const r of (distRows.results || []) as any[]) {
    dist[String(r.bucket)] = total > 0 ? Math.round((Number(r.c) / total) * 1000) / 10 : 0
  }

  // 전주 비교
  const prevWk = new Date(weekStart + 'T00:00:00Z')
  prevWk.setUTCDate(prevWk.getUTCDate() - 7)
  const prevWkStr = prevWk.toISOString().slice(0, 10)
  const prev = await db.prepare(
    `SELECT AVG(score_overall) AS a FROM pf_index_responses WHERE week_start=? AND share_to_national=1`
  ).bind(prevWkStr).first<any>()
  const delta = (Number(agg?.aov || 0) - Number(prev?.a || 0))

  await db.prepare(`
    INSERT OR REPLACE INTO pf_index_weekly_aggregate (
      id, week_start, scope, scope_value,
      total_responses, total_hospitals,
      avg_q1,avg_q2,avg_q3,avg_q4,avg_q5,avg_q6,avg_q7,avg_q8,avg_q9,avg_q10,
      avg_q11,avg_q12,avg_q13,avg_q14,avg_q15,avg_q16,avg_q17,avg_q18,avg_q19,avg_q20,
      avg_inflow, avg_behavior, avg_operation, avg_outlook, avg_overall,
      dist_overall, delta_overall, computed_at
    ) VALUES (?, ?, 'all', '', ?, ?,
      ?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?,?,
      ?, ?, CURRENT_TIMESTAMP
    )
  `).bind(
    crypto.randomUUID(), weekStart,
    Number(agg?.total_responses || 0), Number(agg?.total_hospitals || 0),
    agg?.aq1||0, agg?.aq2||0, agg?.aq3||0, agg?.aq4||0, agg?.aq5||0,
    agg?.aq6||0, agg?.aq7||0, agg?.aq8||0, agg?.aq9||0, agg?.aq10||0,
    agg?.aq11||0, agg?.aq12||0, agg?.aq13||0, agg?.aq14||0, agg?.aq15||0,
    agg?.aq16||0, agg?.aq17||0, agg?.aq18||0, agg?.aq19||0, agg?.aq20||0,
    agg?.ai||0, agg?.ab||0, agg?.ao||0, agg?.aol||0, agg?.aov||0,
    JSON.stringify(dist), Math.round(delta * 100) / 100
  ).run()

  return { agg, dist, delta }
}

/* ───────────────────────────────────────────────
 * GET /api/protected/pf-index/national
 *   - 미참여자 → 게이팅 (lock=true)
 *   - 참여자 → 전국 평균 / 카테고리별 / 분포 / 추이(8주)
 * ─────────────────────────────────────────────── */
pfIndex.get('/national', async (c) => {
  const user = c.get('user')!
  const weekStart = getWeekStart()

  // 게이팅: 이번 주 응답했는지
  const myResp = await c.env.DB.prepare(
    `SELECT id, score_overall, score_inflow, score_behavior, score_operation, score_outlook FROM pf_index_responses WHERE user_id=? AND week_start=?`
  ).bind(user.id, weekStart).first<any>()

  if (!myResp) {
    return c.json({
      locked: true,
      message: '이번 주 설문에 참여하시면 전국 인사이트 보고서를 확인하실 수 있습니다.',
      weekStart,
    })
  }

  // 캐시 확인 → 없으면 재계산
  let cache = await c.env.DB.prepare(
    `SELECT * FROM pf_index_weekly_aggregate WHERE week_start=? AND scope='all'`
  ).bind(weekStart).first<any>()
  if (!cache) {
    await computeWeeklyAggregate(c.env.DB, weekStart)
    cache = await c.env.DB.prepare(
      `SELECT * FROM pf_index_weekly_aggregate WHERE week_start=? AND scope='all'`
    ).bind(weekStart).first<any>()
  }

  // 8주 추이
  const trend = await c.env.DB.prepare(`
    SELECT week_start,
           AVG(score_overall) AS overall,
           AVG(score_inflow) AS inflow,
           AVG(score_behavior) AS behavior,
           AVG(score_operation) AS operation,
           AVG(score_outlook) AS outlook,
           COUNT(*) AS responses
    FROM pf_index_responses
    WHERE share_to_national=1 AND week_start >= date(?, '-49 days')
    GROUP BY week_start
    ORDER BY week_start ASC
  `).bind(weekStart).all()

  // 지역별 평균 (이번 주)
  const byRegion = await c.env.DB.prepare(`
    SELECT region, AVG(score_overall) AS avg_overall, COUNT(*) AS responses
    FROM pf_index_responses
    WHERE week_start=? AND share_to_national=1 AND region != ''
    GROUP BY region
    ORDER BY avg_overall DESC
  `).bind(weekStart).all()

  // 진료과별 평균 (이번 주)
  const bySpec = await c.env.DB.prepare(`
    SELECT specialty, AVG(score_overall) AS avg_overall, COUNT(*) AS responses
    FROM pf_index_responses
    WHERE week_start=? AND share_to_national=1
    GROUP BY specialty
    ORDER BY avg_overall DESC
  `).bind(weekStart).all()

  return c.json({
    locked: false,
    weekStart,
    me: {
      overall: myResp.score_overall,
      inflow: myResp.score_inflow,
      behavior: myResp.score_behavior,
      operation: myResp.score_operation,
      outlook: myResp.score_outlook,
    },
    national: {
      totalResponses: cache?.total_responses || 0,
      totalHospitals: cache?.total_hospitals || 0,
      avgOverall: Math.round((cache?.avg_overall || 0) * 100) / 100,
      avgInflow: Math.round((cache?.avg_inflow || 0) * 100) / 100,
      avgBehavior: Math.round((cache?.avg_behavior || 0) * 100) / 100,
      avgOperation: Math.round((cache?.avg_operation || 0) * 100) / 100,
      avgOutlook: Math.round((cache?.avg_outlook || 0) * 100) / 100,
      deltaOverall: cache?.delta_overall || 0,
      distribution: JSON.parse(cache?.dist_overall || '{}'),
      byQuestion: Array.from({ length: 20 }, (_, i) => ({
        q: i + 1,
        avg: Math.round((Number(cache?.[`avg_q${i + 1}`] || 0)) * 100) / 100,
      })),
    },
    trend: (trend.results || []).map((r: any) => ({
      week: r.week_start,
      overall: Math.round(Number(r.overall) * 100) / 100,
      inflow: Math.round(Number(r.inflow) * 100) / 100,
      behavior: Math.round(Number(r.behavior) * 100) / 100,
      operation: Math.round(Number(r.operation) * 100) / 100,
      outlook: Math.round(Number(r.outlook) * 100) / 100,
      responses: Number(r.responses),
    })),
    byRegion: (byRegion.results || []).map((r: any) => ({
      region: r.region,
      avg: Math.round(Number(r.avg_overall) * 100) / 100,
      responses: Number(r.responses),
    })),
    bySpecialty: (bySpec.results || []).map((r: any) => ({
      specialty: r.specialty,
      avg: Math.round(Number(r.avg_overall) * 100) / 100,
      responses: Number(r.responses),
    })),
  })
})

/* ───────────────────────────────────────────────
 * GET /api/protected/pf-index/my-trend
 *   본인 6주 추이 (잠금 없음)
 * ─────────────────────────────────────────────── */
pfIndex.get('/my-trend', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`
    SELECT week_start, score_overall, score_inflow, score_behavior, score_operation, score_outlook,
           obj_new_patients, obj_total_revenue, obj_conversion_rate
    FROM pf_index_responses
    WHERE user_id=?
    ORDER BY week_start DESC
    LIMIT 6
  `).bind(user.id).all()

  return c.json({
    weeks: ((rows.results || []) as any[]).reverse().map(r => ({
      week: r.week_start,
      overall: r.score_overall,
      inflow: r.score_inflow,
      behavior: r.score_behavior,
      operation: r.score_operation,
      outlook: r.score_outlook,
      objNewPatients: r.obj_new_patients,
      objTotalRevenue: r.obj_total_revenue,
      objConversionRate: r.obj_conversion_rate,
    }))
  })
})

export default pfIndex
