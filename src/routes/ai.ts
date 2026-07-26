import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { aiInsightWithCache } from '../lib/openai'
import { requireRole, sanitizeString } from '../lib/middleware'
import { buildManualContext } from '../lib/manual-parse'

const ai = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══════════════════════════════════════════════════════════
 * 🤖 AI Insights API (v5.4.0)
 *  - C-2: 상담 인사이트 (이번 달 상담 기록 분석)
 *  - C-3: 환자 LTV 분석 (개별 환자 평생가치)
 *  - C-4: 벤치마크 비교 (페이션트 퍼널 점수 vs 전국)
 * ═══════════════════════════════════════════════════════════ */

/* ─── C-2: 상담 인사이트 ─── */
ai.get('/consult-insight', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0, 7), 7)
  const forceRefresh = c.req.query('nocache') === '1'

  // 이번 달 상담 기록 집계
  const records = await c.env.DB.prepare(`
    SELECT
      treatment_category,
      patient_type,
      treatment_confirmed,
      appointment_made,
      planned_amount,
      agreed_amount,
      counselor_name,
      doctor_name,
      discount_note,
      notes
    FROM consult_records
    WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND record_date LIKE ?
    ORDER BY record_date DESC
    LIMIT 200
  `).bind(user.hospitalId, `${month}%`).all()

  const rows = (records.results || []) as any[]
  if (rows.length === 0) {
    return c.json({
      empty: true,
      message: `${month} 기간의 상담 기록이 없습니다.`,
    })
  }

  // 통계 집계
  const total = rows.length
  const confirmedCount = rows.filter(r => r.treatment_confirmed === 'O').length
  const appointedCount = rows.filter(r => r.appointment_made === 'O').length
  const newPatients = rows.filter(r => r.patient_type === 'new').length
  const sumPlanned = rows.reduce((s, r) => s + (Number(r.planned_amount) || 0), 0)
  const sumAgreed = rows.reduce((s, r) => s + (Number(r.agreed_amount) || 0), 0)
  const consentRate = sumPlanned > 0 ? Math.round((sumAgreed / sumPlanned) * 1000) / 10 : 0

  // 카테고리별 분포
  const byCategory: Record<string, number> = {}
  rows.forEach(r => {
    const k = r.treatment_category || 'general'
    byCategory[k] = (byCategory[k] || 0) + 1
  })

  // 상담사별 동의율 TOP/Bottom
  const byCounselor: Record<string, { total: number; confirmed: number; agreed: number; planned: number }> = {}
  rows.forEach(r => {
    const k = r.counselor_name || '미지정'
    if (!byCounselor[k]) byCounselor[k] = { total: 0, confirmed: 0, agreed: 0, planned: 0 }
    byCounselor[k].total += 1
    if (r.treatment_confirmed === 'O') byCounselor[k].confirmed += 1
    byCounselor[k].agreed += Number(r.agreed_amount) || 0
    byCounselor[k].planned += Number(r.planned_amount) || 0
  })

  const stats = {
    month,
    total,
    confirmedRate: total > 0 ? Math.round((confirmedCount / total) * 1000) / 10 : 0,
    appointmentRate: total > 0 ? Math.round((appointedCount / total) * 1000) / 10 : 0,
    newPatientRatio: total > 0 ? Math.round((newPatients / total) * 1000) / 10 : 0,
    consentRate,
    sumAgreed,
    avgAgreed: total > 0 ? Math.round(sumAgreed / total) : 0,
    byCategory,
    byCounselor: Object.entries(byCounselor).map(([k, v]) => ({
      counselor: k,
      total: v.total,
      confirmRate: v.total > 0 ? Math.round((v.confirmed / v.total) * 1000) / 10 : 0,
      consentRate: v.planned > 0 ? Math.round((v.agreed / v.planned) * 1000) / 10 : 0,
    })).sort((a, b) => b.consentRate - a.consentRate),
  }

  // AI에 전달할 프롬프트 (상위 30건 샘플 + 통계)
  const sample = rows.slice(0, 30).map(r => ({
    cat: r.treatment_category, type: r.patient_type,
    confirmed: r.treatment_confirmed, appointed: r.appointment_made,
    planned: r.planned_amount, agreed: r.agreed_amount,
    counselor: r.counselor_name,
    discount: r.discount_note || '',
  }))

  const systemPrompt = `당신은 한국 치과/의료 병원 경영 컨설턴트입니다. 문석준 원장의 "페이션트 퍼널" 방법론 전문가입니다.
상담 기록 통계와 샘플을 분석하여 구체적이고 실행 가능한 인사이트를 JSON으로 반환하세요.
반드시 다음 형식의 JSON으로만 응답하세요:
{
  "summary": "한 줄 핵심 요약 (40자 이내)",
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "weaknesses": ["약점 1", "약점 2", "약점 3"],
  "actions": [
    {"priority": "high|medium|low", "title": "액션 제목 (20자)", "detail": "구체적 실행 방안 (80자)"}
  ],
  "trend": "이번 달 흐름 평가 (한 줄)",
  "counselorAdvice": "상담사별 코칭 포인트 (한 줄)"
}
액션은 3~5개, 모두 한국어, 친근하고 격려하는 톤. 페이션트 퍼널 10단계 (인지/관심/예약/방문/대기/진단/상담/진료/관리/소개) 관점 활용.`

  // 📚 우리 병원 매뉴얼을 근거로 붙인다 (매뉴얼이 없으면 block 은 빈 문자열)
  // 검색어에 상위 카테고리를 섞어 넣어 "이 병원의 상담 방식"이 걸리도록 한다
  const topCats = Object.entries(stats.byCategory)
    .sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(' ')
  const manualCtx = await buildManualContext(
    c.env.DB, user.hospitalId,
    `상담 진단 치료동의 예약 응대 전환율 ${topCats}`, 4
  )

  const userPrompt = `[${month} 통계]
총 상담: ${stats.total}건 / 치료확정율: ${stats.confirmedRate}% / 예약율: ${stats.appointmentRate}%
신환비율: ${stats.newPatientRatio}% / 동의율(금액): ${stats.consentRate}% / 평균동의금액: ${stats.avgAgreed.toLocaleString()}원
카테고리: ${JSON.stringify(stats.byCategory)}
상담사별: ${JSON.stringify(stats.byCounselor.slice(0, 5))}

[샘플 30건]
${JSON.stringify(sample)}

위 데이터로 인사이트 분석해주세요.`

  try {
    const result = await aiInsightWithCache(c.env.DB, {
      hospitalId: user.hospitalId,
      userId: user.id,
      feature: 'consult_insight',
      cacheKey: `consult:${month}:${user.hospitalId}`,
      // 매뉴얼이 바뀌면 답도 바뀌어야 하므로 캐시키에 근거 지문을 섮는다
      cacheTtlHours: 6, // 6시간 캐시 (당일 여러번 봐도 캐시)
      systemPrompt: systemPrompt + manualCtx.block,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.5,
      forceRefresh,
    })
    return c.json({
      stats, ai: result.payload, cached: result.cached, model: result.model,
      manualSources: manualCtx.sources,
    })
  } catch (e: any) {
    return c.json({ stats, ai: null, error: e.message }, 200) // 통계는 보여주되 AI 부분만 에러
  }
})

/* ─── C-3: 환자 LTV 분석 ─── */
ai.get('/patient-ltv/:patientId', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const patientId = c.req.param('patientId')
  const forceRefresh = c.req.query('nocache') === '1'

  // IDOR 방어: 환자가 본인 병원 소속인지 확인
  const patient = await c.env.DB.prepare(
    'SELECT * FROM patients WHERE id=? AND hospital_id=?'
  ).bind(patientId, user.hospitalId).first<any>()
  if (!patient) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)

  // 환자별 상담 기록
  const consults = await c.env.DB.prepare(`
    SELECT record_date, treatment_category, planned_amount, agreed_amount,
           treatment_confirmed, appointment_made, discount_note
    FROM consult_records
    WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND patient_name=?
    ORDER BY record_date DESC
  `).bind(user.hospitalId, patient.patient_name).all()

  const consultRows = (consults.results || []) as any[]
  const totalAgreed = consultRows.reduce((s, r) => s + (Number(r.agreed_amount) || 0), 0)
  const visitCount = Number(patient.visit_count || 1)
  const monthsSinceFirst = patient.first_visit_date
    ? Math.max(1, Math.round((Date.now() - new Date(patient.first_visit_date).getTime()) / (30 * 86400000)))
    : 1
  const avgRevenuePerMonth = totalAgreed / monthsSinceFirst

  // 단순 LTV 추정: (월 평균 매출 × 24개월) + (소개 점수 보너스)
  const projectedLTV = Math.round(avgRevenuePerMonth * 24)
  
  // 소개 이력 (referrer가 이 환자인 다른 환자들)
  const refIn = await c.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND referrer_name=?`
  ).bind(user.hospitalId, patient.patient_name).first<any>().catch(() => ({ c: 0 }))
  const referralCount = Number(refIn?.c || 0)

  const stats = {
    patientName: patient.patient_name,
    chartNumber: patient.chart_number,
    visitCount,
    monthsSinceFirst,
    totalConsults: consultRows.length,
    totalAgreed,
    avgRevenuePerMonth: Math.round(avgRevenuePerMonth),
    projectedLTV,
    referralCount,
    firstVisitDate: patient.first_visit_date,
    lastVisitDate: patient.last_visit_date,
    treatmentArea: patient.treatment_area,
    visitSource: patient.visit_source,
  }

  // 카테고리 분포
  const catDist: Record<string, number> = {}
  consultRows.forEach(r => {
    catDist[r.treatment_category || 'general'] = (catDist[r.treatment_category || 'general'] || 0) + (Number(r.agreed_amount) || 0)
  })

  const systemPrompt = `당신은 한국 치과 환자 관계 관리(PRM) 전문가입니다.
한 환자의 데이터를 분석하여 LTV(Life Time Value) 분석과 맞춤 관리 전략을 JSON으로 반환하세요.
반드시 다음 형식의 JSON으로만 응답하세요:
{
  "tier": "VIP|GOLD|SILVER|REGULAR|NEW",
  "tierReason": "등급 부여 이유 (한 줄)",
  "ltvAssessment": "LTV 종합 평가 (50자 내)",
  "nextActions": [
    {"when": "지금|1주내|1개월내", "title": "액션 제목", "detail": "구체적 실행 방안"}
  ],
  "upsellOpportunity": "추가 진료/업셀 기회 (한 줄)",
  "referralPotential": "low|medium|high",
  "referralStrategy": "이 환자를 소개 환자로 만드는 전략 (한 줄)",
  "riskFactors": ["이탈 위험 요인 1", "위험 요인 2"]
}
환자 이름과 챠트번호는 사용하지 말고 "이 환자"로 칭하세요. 친근하고 실행 가능한 어조.`

  // 📚 환자 관리/리콜/소개 관련 매뉴얼을 근거로 붙인다
  const manualCtx = await buildManualContext(
    c.env.DB, user.hospitalId,
    `환자 관리 리콜 재내원 소개 이탈방지 ${patient.treatment_area || ''}`, 3
  )

  const userPrompt = `[환자 데이터]
- 내원 횟수: ${stats.visitCount}회 / 첫 내원 ${stats.monthsSinceFirst}개월 전
- 총 상담: ${stats.totalConsults}건 / 누적 동의금액: ${stats.totalAgreed.toLocaleString()}원
- 월 평균 매출 기여: ${stats.avgRevenuePerMonth.toLocaleString()}원
- 예상 LTV (24개월): ${stats.projectedLTV.toLocaleString()}원
- 소개한 환자: ${stats.referralCount}명
- 진료영역: ${patient.treatment_area || '미지정'} / 유입경로: ${patient.visit_source || '미지정'}
- 카테고리별 매출: ${JSON.stringify(catDist)}

이 환자에 대한 LTV 분석과 다음 액션을 추천해주세요.`

  try {
    const result = await aiInsightWithCache(c.env.DB, {
      hospitalId: user.hospitalId,
      userId: user.id,
      feature: 'ltv_analysis',
      cacheKey: `ltv:${patientId}`,
      cacheTtlHours: 24,
      systemPrompt: systemPrompt + manualCtx.block,
      userPrompt,
      maxTokens: 800,
      temperature: 0.5,
      forceRefresh,
    })
    return c.json({
      stats, categoryDist: catDist, ai: result.payload, cached: result.cached,
      manualSources: manualCtx.sources,
    })
  } catch (e: any) {
    return c.json({ stats, categoryDist: catDist, ai: null, error: e.message }, 200)
  }
})

/* ─── C-3: LTV 환자 랭킹 (AI 호출 없는 통계만) ─── */
ai.get('/ltv-ranking', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!
  const limit = Math.min(Number(c.req.query('limit')) || 30, 100)

  // 환자별 누적 동의금액 + 내원횟수 기반 랭킹
  const rows = await c.env.DB.prepare(`
    SELECT
      p.id,
      p.patient_name,
      p.chart_number,
      p.visit_count,
      p.first_visit_date,
      p.last_visit_date,
      p.visit_source,
      p.treatment_area,
      COALESCE((
        SELECT SUM(cr.agreed_amount)
        FROM consult_records cr
        WHERE cr.hospital_id=p.hospital_id
          AND cr.patient_name=p.patient_name
          AND COALESCE(cr.is_deleted,0)=0
      ), 0) AS total_agreed,
      COALESCE((
        SELECT COUNT(*) FROM patients p2
        WHERE p2.hospital_id=p.hospital_id AND p2.referrer_name=p.patient_name
      ), 0) AS referral_count
    FROM patients p
    WHERE p.hospital_id=? AND p.status='active'
    ORDER BY total_agreed DESC, p.visit_count DESC
    LIMIT ?
  `).bind(user.hospitalId, limit).all()

  const ranked = (rows.results || []).map((r: any, i: number) => {
    const totalAgreed = Number(r.total_agreed) || 0
    const visits = Number(r.visit_count) || 1
    const refs = Number(r.referral_count) || 0
    // 등급 분류
    let tier = 'REGULAR'
    if (totalAgreed >= 10000000 || refs >= 3) tier = 'VIP'
    else if (totalAgreed >= 5000000 || refs >= 1) tier = 'GOLD'
    else if (totalAgreed >= 1000000 || visits >= 5) tier = 'SILVER'
    return {
      rank: i + 1,
      ...r,
      total_agreed: totalAgreed,
      referral_count: refs,
      tier,
    }
  })

  return c.json({ ranking: ranked, total: ranked.length })
})

/* ─── C-4: 벤치마크 비교 (페이션트 퍼널 점수 기준) ─── */
ai.get('/benchmark', requireRole('admin', 'manager'), async (c) => {
  const user = c.get('user')!

  // 우리 병원 페이션트 퍼널 점수 (이번 달)
  // 간단화를 위해 핵심 지표만 별도로 계산
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'
  const [myCalls, myPatients, myConsult, myTreated] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS c FROM call_records WHERE hospital_id=? AND call_type='inbound' AND call_date >= ?`).bind(user.hospitalId, monthStart).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND created_at >= ?`).bind(user.hospitalId, monthStart).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS c, AVG(CASE WHEN planned_amount > 0 THEN CAST(agreed_amount AS FLOAT)/planned_amount ELSE 0 END) AS consent FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND record_date >= ?`).bind(user.hospitalId, monthStart).first<any>().catch(() => ({ c: 0, consent: 0 })),
    c.env.DB.prepare(`SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND treatment_confirmed='O' AND record_date >= ?`).bind(user.hospitalId, monthStart).first<any>().catch(() => ({ c: 0 })),
  ])

  // 전국 평균 (모든 병원, 이번 달, 익명화)
  const [natCalls, natPatients, natConsult, natTreated, natHospitals] = await Promise.all([
    c.env.DB.prepare(`SELECT AVG(c) AS avg FROM (SELECT hospital_id, COUNT(*) AS c FROM call_records WHERE call_type='inbound' AND call_date >= ? GROUP BY hospital_id)`).bind(monthStart).first<any>(),
    c.env.DB.prepare(`SELECT AVG(c) AS avg FROM (SELECT hospital_id, COUNT(*) AS c FROM patients WHERE created_at >= ? GROUP BY hospital_id)`).bind(monthStart).first<any>(),
    c.env.DB.prepare(`SELECT AVG(consent) AS avg FROM (SELECT hospital_id, AVG(CASE WHEN planned_amount > 0 THEN CAST(agreed_amount AS FLOAT)/planned_amount ELSE 0 END) AS consent FROM consult_records WHERE COALESCE(is_deleted,0)=0 AND record_date >= ? GROUP BY hospital_id)`).bind(monthStart).first<any>().catch(() => ({ avg: 0 })),
    c.env.DB.prepare(`SELECT AVG(c) AS avg FROM (SELECT hospital_id, COUNT(*) AS c FROM consult_records WHERE COALESCE(is_deleted,0)=0 AND treatment_confirmed='O' AND record_date >= ? GROUP BY hospital_id)`).bind(monthStart).first<any>().catch(() => ({ avg: 0 })),
    c.env.DB.prepare(`SELECT COUNT(*) AS c FROM hospitals`).first<any>(),
  ])

  const me = {
    calls: Number(myCalls?.c || 0),
    patients: Number(myPatients?.c || 0),
    consults: Number(myConsult?.c || 0),
    consentRate: Math.round(Number(myConsult?.consent || 0) * 1000) / 10,
    treated: Number(myTreated?.c || 0),
  }
  const national = {
    avgCalls: Math.round(Number(natCalls?.avg || 0) * 10) / 10,
    avgPatients: Math.round(Number(natPatients?.avg || 0) * 10) / 10,
    avgConsentRate: Math.round(Number(natConsult?.avg || 0) * 1000) / 10,
    avgTreated: Math.round(Number(natTreated?.avg || 0) * 10) / 10,
    totalHospitals: Number(natHospitals?.c || 0),
  }

  // 백분위 추정 (간이): 우리/전국평균 비율
  function ratio(my: number, avg: number): number {
    if (avg === 0) return my > 0 ? 100 : 50
    return Math.min(Math.round((my / avg) * 50 + 50), 99)  // 50% = 평균선, 99% 상한
  }

  const percentile = {
    calls: ratio(me.calls, national.avgCalls),
    patients: ratio(me.patients, national.avgPatients),
    consentRate: ratio(me.consentRate, national.avgConsentRate),
    treated: ratio(me.treated, national.avgTreated),
  }

  return c.json({
    period: new Date().toISOString().slice(0, 7),
    me,
    national,
    percentile,
    disclaimer: `전국 ${national.totalHospitals}개 병원 평균 (익명 집계). 표본이 작을수록 신뢰도 제한적.`,
  })
})

/* ─── AI 사용량 통계 (admin only) ─── */
ai.get('/usage', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const month = sanitizeString(c.req.query('month') || new Date().toISOString().slice(0, 7), 7)
  const rows = await c.env.DB.prepare(`
    SELECT feature,
           COUNT(*) AS calls,
           SUM(prompt_tokens) AS prompt_tokens,
           SUM(completion_tokens) AS completion_tokens,
           SUM(cached) AS cached_hits
    FROM ai_usage_log
    WHERE hospital_id=? AND created_at LIKE ?
    GROUP BY feature
  `).bind(user.hospitalId, `${month}%`).all()

  return c.json({ month, usage: rows.results || [] })
})

export default ai
