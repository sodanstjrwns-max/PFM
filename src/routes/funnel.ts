import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { sanitizeString, sanitizeNumber, sanitizeBody } from '../lib/middleware'
const funnel = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 환자 퍼널 (Patient Funnel) 10단계 ═══ */

const FUNNEL_STAGES = ['awareness','interest','appointment','visit','waiting','diagnosis','consultation','treatment','management','referral']

const STAGE_LABELS: Record<string, string> = {
  awareness: '인지', interest: '관심', appointment: '예약', visit: '방문',
  waiting: '대기', diagnosis: '진단', consultation: '상담', treatment: '진료',
  management: '관리', referral: '소개',
}

/* ── 퍼널 환자 목록 ── */
funnel.get('/', async (c) => {
  const user = c.get('user')!
  const stage = sanitizeString(c.req.query('stage') || '', 30)
  const limit = sanitizeNumber(c.req.query('limit'), 50, 1, 500)
  let sql = 'SELECT pf.*, u.name as doctor_name FROM patient_funnel pf LEFT JOIN users u ON pf.assigned_doctor=u.id WHERE pf.hospital_id=?'
  const params: any[] = [user.hospitalId]
  if (stage && FUNNEL_STAGES.includes(stage)) { sql += ' AND pf.current_stage=?'; params.push(stage) }
  sql += ' ORDER BY pf.updated_at DESC LIMIT ?'; params.push(limit)
  const rows = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json(rows.results)
})

/* ── 기본 퍼널 통계 ── */
funnel.get('/stats', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'month', 10)
  let dateFilter = ''
  const now = new Date()
  if (period === 'month') dateFilter = now.toISOString().slice(0,7)
  else if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    dateFilter = d.toISOString().slice(0,10)
  }
  const countSql = "SELECT current_stage, COUNT(*) as count FROM patient_funnel WHERE hospital_id=?" + (dateFilter ? " AND created_at >= ?" : "") + " GROUP BY current_stage"
  const params: any[] = [user.hospitalId]; if (dateFilter) params.push(dateFilter)
  const counts = await c.env.DB.prepare(countSql).bind(...params).all()
  const amountSql = "SELECT COALESCE(SUM(estimated_amount),0) as est, COALESCE(SUM(agreed_amount),0) as agreed, COALESCE(SUM(paid_amount),0) as paid FROM patient_funnel WHERE hospital_id=?" + (dateFilter ? " AND created_at >= ?" : "")
  const amounts: any = await c.env.DB.prepare(amountSql).bind(...params).first()
  const stageMap: any = {}
  ;(counts?.results||[]).forEach((r: any) => { stageMap[r.current_stage] = r.count })
  return c.json({ stages: stageMap, estimated: amounts?.est||0, agreed: amounts?.agreed||0, paid: amounts?.paid||0 })
})

/* ══════════════════════════════════════
   🆕 퍼널 분석 대시보드 (상세 이탈률 + 전환율 + 액션)
   ══════════════════════════════════════ */
funnel.get('/analytics', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'month', 10)
  const now = new Date()
  
  // 기간 필터 계산
  let dateFilter = ''
  let prevDateFilter = ''
  if (period === 'month') {
    dateFilter = now.toISOString().slice(0,7)
    const prev = new Date(now); prev.setMonth(prev.getMonth() - 1)
    prevDateFilter = prev.toISOString().slice(0,7)
  } else if (period === 'quarter') {
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    dateFilter = qStart.toISOString().slice(0,10)
    const prevQ = new Date(qStart); prevQ.setMonth(prevQ.getMonth() - 3)
    prevDateFilter = prevQ.toISOString().slice(0,10)
  } else { // all
    dateFilter = ''
    prevDateFilter = ''
  }

  const hid = user.hospitalId
  const dateWhere = dateFilter ? " AND created_at >= ?" : ""
  const prevDateWhere = prevDateFilter && dateFilter ? ` AND created_at >= ? AND created_at < ?` : ""
  
  // 1) 현재 기간 단계별 카운트
  const currentParams: any[] = [hid]; if (dateFilter) currentParams.push(dateFilter)
  const currentCounts = await c.env.DB.prepare(
    `SELECT current_stage, COUNT(*) as count FROM patient_funnel WHERE hospital_id=?${dateWhere} GROUP BY current_stage`
  ).bind(...currentParams).all()
  
  // 2) 이전 기간 단계별 카운트 (전월 대비)
  let prevStageMap: any = {}
  if (prevDateFilter && dateFilter) {
    const prevParams: any[] = [hid, prevDateFilter, dateFilter]
    const prevCounts = await c.env.DB.prepare(
      `SELECT current_stage, COUNT(*) as count FROM patient_funnel WHERE hospital_id=?${prevDateWhere} GROUP BY current_stage`
    ).bind(...prevParams).all()
    ;(prevCounts?.results||[]).forEach((r: any) => { prevStageMap[r.current_stage] = r.count })
  }
  
  // 3) 금액 통계
  const amountParams: any[] = [hid]; if (dateFilter) amountParams.push(dateFilter)
  const amounts: any = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(estimated_amount),0) as est, COALESCE(SUM(agreed_amount),0) as agreed, COALESCE(SUM(paid_amount),0) as paid, COUNT(*) as total FROM patient_funnel WHERE hospital_id=?${dateWhere}`
  ).bind(...amountParams).first()
  
  // 4) 유입 경로별 통계
  const sourceCounts = await c.env.DB.prepare(
    `SELECT source, COUNT(*) as count FROM patient_funnel WHERE hospital_id=? AND source != ''${dateWhere} GROUP BY source ORDER BY count DESC LIMIT 10`
  ).bind(...(dateFilter ? [hid, dateFilter] : [hid])).all()
  
  // 5) 진료 유형별 통계
  const treatmentCounts = await c.env.DB.prepare(
    `SELECT treatment_type, COUNT(*) as count, COALESCE(SUM(paid_amount),0) as revenue FROM patient_funnel WHERE hospital_id=? AND treatment_type != ''${dateWhere} GROUP BY treatment_type ORDER BY count DESC LIMIT 10`
  ).bind(...(dateFilter ? [hid, dateFilter] : [hid])).all()

  // 6) stage_history에서 단계별 평균 체류 시간 계산 (최근 100건 샘플)
  const historyRows = await c.env.DB.prepare(
    `SELECT stage_history FROM patient_funnel WHERE hospital_id=? AND stage_history IS NOT NULL AND stage_history != '[]' ORDER BY updated_at DESC LIMIT 100`
  ).bind(hid).all()
  
  const stageDurations: Record<string, number[]> = {}
  FUNNEL_STAGES.forEach(s => { stageDurations[s] = [] })
  
  for (const row of (historyRows.results || [])) {
    try {
      const history: any[] = JSON.parse((row as any).stage_history || '[]')
      for (let i = 1; i < history.length; i++) {
        const prev = history[i-1]
        const curr = history[i]
        if (prev.at && curr.at && prev.stage) {
          const duration = new Date(curr.at).getTime() - new Date(prev.at).getTime()
          if (duration > 0 && duration < 365 * 86400000) { // 1년 이내만
            stageDurations[prev.stage]?.push(duration)
          }
        }
      }
    } catch(e) {}
  }

  // 평균 체류시간 계산
  const avgDurations: Record<string, number | null> = {}
  for (const [stage, durations] of Object.entries(stageDurations)) {
    if (durations.length > 0) {
      avgDurations[stage] = Math.round(durations.reduce((a,b) => a+b, 0) / durations.length / 3600000) // hours
    } else {
      avgDurations[stage] = null
    }
  }

  // 단계별 데이터 구성
  const stageMap: any = {}
  ;(currentCounts?.results||[]).forEach((r: any) => { stageMap[r.current_stage] = r.count })
  
  const stagesData = FUNNEL_STAGES.map((stage, i) => {
    const count = stageMap[stage] || 0
    const prevCount = prevStageMap[stage] || 0
    const prevStage = i > 0 ? FUNNEL_STAGES[i-1] : null
    const prevStageCount = prevStage ? (stageMap[prevStage] || 0) : count
    const conversionRate = prevStageCount > 0 ? Math.round(count / prevStageCount * 100) : (count > 0 ? 100 : 0)
    const dropoffRate = 100 - conversionRate
    const trend = prevCount > 0 ? Math.round((count - prevCount) / prevCount * 100) : 0
    
    return {
      key: stage,
      label: STAGE_LABELS[stage],
      count,
      prevCount,
      conversionRate: i === 0 ? 100 : conversionRate,
      dropoffRate: i === 0 ? 0 : dropoffRate,
      trend,
      avgDurationHours: avgDurations[stage],
    }
  })

  // 핵심 전환율 요약
  const totalIn = stageMap['awareness'] || 0
  const totalConsult = stageMap['consultation'] || 0
  const totalTreatment = stageMap['treatment'] || 0
  const totalReferral = stageMap['referral'] || 0
  const overallConversion = totalIn > 0 ? Math.round(totalTreatment / totalIn * 100) : 0
  const consultConversion = totalConsult > 0 ? Math.round(totalTreatment / totalConsult * 100) : 0
  const referralRate = totalTreatment > 0 ? Math.round(totalReferral / totalTreatment * 100) : 0

  // 병목 단계 찾기 (이탈률 가장 높은 곳)
  const bottleneck = stagesData.slice(1).reduce((max, s) => s.dropoffRate > max.dropoffRate ? s : max, stagesData[1])

  // 구체적 액션 추천
  const actions = generateActions(stagesData, bottleneck, sourceCounts.results || [], amounts)

  return c.json({
    stages: stagesData,
    summary: {
      totalPatients: amounts?.total || 0,
      totalIn,
      totalTreatment,
      totalReferral,
      overallConversion,
      consultConversion,
      referralRate,
      estimated: amounts?.est || 0,
      agreed: amounts?.agreed || 0,
      paid: amounts?.paid || 0,
      collectionRate: amounts?.est > 0 ? Math.round((amounts?.paid || 0) / amounts.est * 100) : 0,
    },
    bottleneck: {
      stage: bottleneck.key,
      label: bottleneck.label,
      dropoffRate: bottleneck.dropoffRate,
    },
    sources: sourceCounts.results || [],
    treatments: treatmentCounts.results || [],
    actions,
    period,
  })
})

/* 구체적 액션 생성 */
function generateActions(stages: any[], bottleneck: any, sources: any[], amounts: any) {
  const actions: Array<{priority: string, stage: string, title: string, description: string, impact: string}> = []
  
  for (const s of stages) {
    if (s.key === 'awareness') continue
    
    if (s.dropoffRate >= 50) {
      const actionMap: Record<string, { title: string, desc: string, impact: string }> = {
        interest: {
          title: '🔍 인지→관심 전환 강화',
          desc: '블로그/SNS 콘텐츠 품질 개선, 차별화된 before-after 사례 공유, 지역 키워드 SEO 최적화',
          impact: `전환율 ${s.conversionRate}% → ${Math.min(80, s.conversionRate + 15)}% 개선 시 월 ${Math.round(s.count * 0.15)}명 추가 확보`,
        },
        appointment: {
          title: '📅 관심→예약 전환 강화',
          desc: '온라인 예약 편의성 개선, 상담 CTA 강화, 전화 응대 스크립트 개선, 초진 할인 이벤트',
          impact: `전환율 개선 시 월 ${Math.round(s.count * 0.2)}명 추가 예약 가능`,
        },
        visit: {
          title: '🏥 예약→방문 노쇼 관리',
          desc: 'D-1 리마인드 문자/카카오톡, 주차 안내 사전 발송, 노쇼 시 재예약 자동 유도',
          impact: `노쇼율 ${s.dropoffRate}% → ${Math.max(10, s.dropoffRate - 15)}% 감소 목표`,
        },
        waiting: {
          title: '⏳ 대기 경험 개선',
          desc: '예상 대기시간 안내, 진료 순서 실시간 표시, 대기실 환경 개선 (음료/와이파이)',
          impact: '대기 불만족 환자 이탈 방지',
        },
        diagnosis: {
          title: '🔍 진단 과정 신뢰 구축',
          desc: '검사 결과 시각적 설명, 구강 카메라 활용, 환자 참여형 진단 프로세스',
          impact: '상담 동의율 향상 기대',
        },
        consultation: {
          title: '💬 상담 전환율 개선',
          desc: '상담 스크립트 체계화, 비용 투명성 강화, 다양한 결제 방법 제시, 상담사 교육 강화',
          impact: `전환율 ${s.conversionRate}% 개선 시 매출 직접 연결`,
        },
        treatment: {
          title: '🦷 상담→진료 결정 촉진',
          desc: '결정 유예 환자 후속 연락, 두려움 해소 컨텐츠 제공, 시술 후기 공유',
          impact: `진료 동의율 ${s.conversionRate}% → ${Math.min(90, s.conversionRate + 10)}% 목표`,
        },
        management: {
          title: '📋 사후관리 체계 구축',
          desc: '진료 후 3일/1주/1개월 Follow-up 체계, 정기검진 리마인더, 관리 프로그램 운영',
          impact: '재방문율 향상 + 소개 환자 유입 증가',
        },
        referral: {
          title: '🤝 소개 환자 활성화',
          desc: '소개 인센티브 프로그램, 리뷰 작성 유도, 가족 패키지 할인, 소개 카드 제작',
          impact: `소개 환자 비율 ${amounts?.referralRate || 0}% → ${Math.min(30, (amounts?.referralRate || 0) + 10)}% 목표`,
        },
      }
      
      const action = actionMap[s.key]
      if (action) {
        actions.push({
          priority: s.key === bottleneck.key ? 'critical' : (s.dropoffRate >= 60 ? 'high' : 'medium'),
          stage: s.key,
          title: action.title,
          description: action.desc,
          impact: action.impact,
        })
      }
    }
  }
  
  // 정렬: critical > high > medium
  const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 }
  actions.sort((a, b) => (pOrder[a.priority] || 9) - (pOrder[b.priority] || 9))
  
  return actions
}

/* ── 퍼널 환자 등록 ── */
funnel.post('/', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    patient_name: { type: 'string', max: 100 },
    phone: { type: 'string', max: 20 },
    source: { type: 'string', max: 100 },
    current_stage: { type: 'enum', values: FUNNEL_STAGES },
    treatment_type: { type: 'string', max: 100 },
    assigned_doctor: { type: 'string', max: 100 },
    estimated_amount: { type: 'number', min: 0, max: 999999999, default: 0 },
    notes: { type: 'string', max: 2000 },
  })
  if (!b.patient_name) return c.json({ error: '환자명을 입력해주세요' }, 400)
  const id = crypto.randomUUID()
  const stage = b.current_stage || 'awareness'
  const history = JSON.stringify([{ stage, at: new Date().toISOString(), by: user.id }])
  await c.env.DB.prepare(
    'INSERT INTO patient_funnel (id, hospital_id, patient_name, phone, source, current_stage, treatment_type, assigned_doctor, estimated_amount, notes, stage_history) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(id, user.hospitalId, b.patient_name, b.phone||'', b.source||'', stage, b.treatment_type||'', b.assigned_doctor||'', b.estimated_amount||0, b.notes||'', history).run()
  return c.json({ id, patient_name: b.patient_name, current_stage: stage })
})

/* ── 퍼널 환자 수정 ── */
funnel.put('/:id', async (c) => {
  const user = c.get('user')!
  const raw = await c.req.json()
  const b = sanitizeBody(raw, {
    patient_name: { type: 'string', max: 100 },
    phone: { type: 'string', max: 20 },
    source: { type: 'string', max: 100 },
    current_stage: { type: 'enum', values: FUNNEL_STAGES },
    treatment_type: { type: 'string', max: 100 },
    assigned_doctor: { type: 'string', max: 100 },
    estimated_amount: { type: 'number', min: 0, max: 999999999 },
    agreed_amount: { type: 'number', min: 0, max: 999999999 },
    paid_amount: { type: 'number', min: 0, max: 999999999 },
    notes: { type: 'string', max: 2000 },
  })
  const row: any = await c.env.DB.prepare('SELECT * FROM patient_funnel WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).first()
  if (!row) return c.json({ error: '환자를 찾을 수 없습니다' }, 404)
  const sets: string[] = []; const vals: any[] = []
  for (const key of ['patient_name','phone','source','current_stage','treatment_type','assigned_doctor','estimated_amount','agreed_amount','paid_amount','notes']) {
    if (b[key] !== undefined && b[key] !== null) { sets.push(`${key}=?`); vals.push(b[key]) }
  }
  if (b.current_stage && b.current_stage !== row.current_stage) {
    let history: any[] = []; try { history = JSON.parse(row.stage_history||'[]') } catch(e) {}
    history.push({ stage: b.current_stage, from: row.current_stage, at: new Date().toISOString(), by: user.id })
    sets.push('stage_history=?'); vals.push(JSON.stringify(history))
  }
  if (!sets.length) return c.json({ error: '변경 사항 없음' }, 400)
  sets.push('updated_at=?'); vals.push(new Date().toISOString())
  vals.push(c.req.param('id'), user.hospitalId)
  await c.env.DB.prepare(`UPDATE patient_funnel SET ${sets.join(',')} WHERE id=? AND hospital_id=?`).bind(...vals).run()
  return c.json({ success: true })
})

/* ── 퍼널 환자 삭제 ── */
funnel.delete('/:id', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare('DELETE FROM patient_funnel WHERE id=? AND hospital_id=?').bind(c.req.param('id'), user.hospitalId).run()
  return c.json({ success: true })
})

/* ═══════════════════════════════════════════════════════════
 * 🏆 페이션트 퍼널 10단계 자동 채점 (Signature Feature)
 *  - 환자 데이터 기반으로 10단계 통과율 산출
 *  - 가중 합산 → 0~100점 (병원 페이션트 퍼널 점수)
 *  - 단계별 약점 식별 + 액션 제안
 * ═══════════════════════════════════════════════════════════ */

// 페이션트 퍼널 10단계 정의 (문석준 모델)
const PF_STAGES_META = [
  { key: 'awareness',    no: 1,  label: '인지',   icon: '📡', weight: 8,  desc: '병원을 처음 알게 된 환자 수 (콜 인입)' },
  { key: 'interest',     no: 2,  label: '관심',   icon: '🔍', weight: 10, desc: '관심을 갖고 환자 등록까지 진행' },
  { key: 'appointment',  no: 3,  label: '예약',   icon: '📅', weight: 12, desc: '예약을 잡은 환자' },
  { key: 'visit',        no: 4,  label: '방문',   icon: '🏥', weight: 12, desc: '실제 내원한 환자 (no-show 제외)' },
  { key: 'waiting',      no: 5,  label: '대기',   icon: '⏱️', weight: 6,  desc: '내원 후 대기 경험 (이탈 없이 진료실 진입)' },
  { key: 'diagnosis',    no: 6,  label: '진단',   icon: '🔬', weight: 8,  desc: '진단 완료 (진료 시작 시점)' },
  { key: 'consultation', no: 7,  label: '상담',   icon: '💬', weight: 12, desc: '상담 후 동의금액 입력' },
  { key: 'treatment',    no: 8,  label: '진료',   icon: '🦷', weight: 12, desc: '진료 완료 및 결제' },
  { key: 'management',   no: 9,  label: '관리',   icon: '🔔', weight: 10, desc: '재방문 / 리콜 / 리뷰 작성' },
  { key: 'referral',     no: 10, label: '소개',   icon: '🌟', weight: 10, desc: '소개 발생 (가장 어려운 단계)' },
] as const

/**
 * 10단계 자동 채점 GET /api/protected/funnel/score
 * Query: ?period=month|quarter|all (default: month)
 *
 * 산출 로직:
 *  - 단계별 통과 인원 / 이전 단계 통과 인원 = 통과율 (0~1)
 *  - 통과율 × 단계 가중치 = 단계 점수
 *  - 단계 점수 합계 = 페이션트 퍼널 점수 (0~100)
 *  - 가중치 합계가 100이 되도록 설계됨 (8+10+12+12+6+8+12+12+10+10=100)
 */
funnel.get('/score', async (c) => {
  const user = c.get('user')!
  const period = sanitizeString(c.req.query('period') || 'month', 10)
  const hid = user.hospitalId

  // 기간 필터 계산
  const now = new Date()
  let dateFrom = ''
  if (period === 'month') {
    dateFrom = now.toISOString().slice(0, 7) + '-01'
  } else if (period === 'quarter') {
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    dateFrom = qStart.toISOString().slice(0, 10)
  } else {
    dateFrom = '1970-01-01'
  }

  // 각 단계 실측 카운트 (병렬 조회) — 환자 데이터로부터 실제 통과한 사람 수 측정
  const [
    callsCnt,         // 1. 인지: 인바운드 콜
    patientsCnt,      // 2. 관심: 환자 등록
    apptCnt,          // 3. 예약: 예약 생성
    visitedCnt,       // 4. 방문: 첫 내원 발생
    waitingPassCnt,   // 5. 대기: 진료 시작 (대기 통과)
    diagnosedCnt,     // 6. 진단: 진단 완료된 환자
    consultCnt,       // 7. 상담: 상담 후 동의금액 > 0
    treatedCnt,       // 8. 진료: 진료 완료 (결제 완료)
    revisitCnt,       // 9. 관리: 2회 이상 방문
    referredCnt,      // 10. 소개: 소개 발생
  ] = await Promise.all([
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM call_records WHERE hospital_id=? AND call_type='inbound' AND call_date >= ?`
    ).bind(hid, dateFrom).first<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND created_at >= ?`
    ).bind(hid, dateFrom).first<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(DISTINCT id) AS c FROM patients WHERE hospital_id=? AND first_visit_date >= ?`
    ).bind(hid, dateFrom).first<any>().catch(() => ({ c: 0 })),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND visit_count >= 1 AND first_visit_date >= ?`
    ).bind(hid, dateFrom).first<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND visit_count >= 1 AND first_visit_date >= ?`
    ).bind(hid, dateFrom).first<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND consult_date >= ?`
    ).bind(hid, dateFrom).first<any>().catch(() => ({ c: 0 })),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND agreed_amount > 0 AND consult_date >= ?`
    ).bind(hid, dateFrom).first<any>().catch(() => ({ c: 0 })),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND status IN ('payment','treatment','completed') AND consult_date >= ?`
    ).bind(hid, dateFrom).first<any>().catch(() => ({ c: 0 })),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND visit_count >= 2`
    ).bind(hid).first<any>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND referrer_name IS NOT NULL AND referrer_name != '' AND created_at >= ?`
    ).bind(hid, dateFrom).first<any>(),
  ])

  const counts = [
    Number(callsCnt?.c || 0),
    Number(patientsCnt?.c || 0),
    Number(apptCnt?.c || 0),
    Number(visitedCnt?.c || 0),
    Number(waitingPassCnt?.c || 0),
    Number(diagnosedCnt?.c || 0),
    Number(consultCnt?.c || 0),
    Number(treatedCnt?.c || 0),
    Number(revisitCnt?.c || 0),
    Number(referredCnt?.c || 0),
  ]

  // 단계별 통과율 계산 (이전 단계 대비)
  // 1단계는 baseline이라 통과율 100%로 처리
  const stages = PF_STAGES_META.map((meta, idx) => {
    const current = counts[idx]
    const previous = idx === 0 ? current : counts[idx - 1]
    const passRate = previous === 0 ? 0 : Math.min(current / previous, 1)
    const stageScore = Math.round(passRate * meta.weight * 100) / 100
    
    // 단계별 색상 & 액션 제안
    let color = '#10b981' // green
    let action = ''
    if (passRate < 0.3) {
      color = '#ef4444'  // red - 심각
      action = getActionAdvice(meta.key, 'critical')
    } else if (passRate < 0.6) {
      color = '#f59e0b'  // amber - 주의
      action = getActionAdvice(meta.key, 'warning')
    } else if (passRate < 0.85) {
      color = '#3b82f6'  // blue - 개선여지
      action = getActionAdvice(meta.key, 'improve')
    } else {
      action = getActionAdvice(meta.key, 'good')
    }

    return {
      no: meta.no,
      key: meta.key,
      label: meta.label,
      icon: meta.icon,
      desc: meta.desc,
      weight: meta.weight,
      count: current,
      previousCount: idx === 0 ? null : counts[idx - 1],
      passRate: Math.round(passRate * 1000) / 10, // %로 표기 (소수1)
      score: stageScore,
      color,
      action,
    }
  })

  const totalScore = Math.round(stages.reduce((s, st) => s + st.score, 0) * 10) / 10

  // 등급 분류
  const grade = totalScore >= 85 ? { label: '최상위', emoji: '🏆', color: '#fbbf24', desc: '페이션트 퍼널 마스터 — 페이션트 퍼널 모범 사례' }
              : totalScore >= 70 ? { label: '우수',   emoji: '🥇', color: '#10b981', desc: '안정적인 환자 여정 — 추가 최적화 여지' }
              : totalScore >= 55 ? { label: '양호',   emoji: '🥈', color: '#3b82f6', desc: '평균 이상 — 약한 단계 집중 개선 필요' }
              : totalScore >= 40 ? { label: '보통',   emoji: '🥉', color: '#f59e0b', desc: '개선 시급 — 페이션트 퍼널 체계 재정비 권장' }
              :                    { label: '미흡',   emoji: '⚠️',  color: '#ef4444', desc: '전반적 재설계 필요 — 페이션트 퍼널 교육 수강 강력 권장' }

  // 가장 약한 단계 TOP 3
  const weakest = [...stages]
    .filter(s => s.no > 1) // 1단계는 baseline 제외
    .sort((a, b) => a.passRate - b.passRate)
    .slice(0, 3)

  return c.json({
    period,
    dateFrom,
    score: totalScore,           // 0~100
    grade,
    stages,
    weakest,
    summary: {
      totalCalls: counts[0],
      totalPatients: counts[1],
      conversionFunnel: counts[0] > 0 ? Math.round((counts[7] / counts[0]) * 1000) / 10 : 0, // 콜→진료완료 최종 전환율
      referralRate: counts[1] > 0 ? Math.round((counts[9] / counts[1]) * 1000) / 10 : 0,
    }
  })
})

/** 단계별 액션 제안 (상태에 따라 자동 메시지) */
function getActionAdvice(stage: string, level: 'critical' | 'warning' | 'improve' | 'good'): string {
  const advice: Record<string, Record<string, string>> = {
    awareness: {
      critical: '⚠️ 콜 인입 자체가 부족합니다. 광고/마케팅 채널 점검 + 키워드 분석 우선',
      warning: '광고 채널별 ROI 분석 → 효율 낮은 채널 정리, 신규 유입 채널 테스트',
      improve: '유입 경로별 콜 품질 측정해서 고품질 채널 비중 확대',
      good: '✅ 인지 단계 양호 — 다음 단계 전환율 집중',
    },
    interest: {
      critical: '⚠️ 콜은 들어오지만 환자 등록까지 이어지지 않음. 상담사 응대 스크립트 재검토',
      warning: '인바운드 콜 시 환자 정보 입력 누락이 많습니다. 등록 의무화 정책 검토',
      improve: '관심을 환자 등록으로 전환하는 클로징 멘트 강화',
      good: '✅ 콜 → 등록 전환 양호',
    },
    appointment: {
      critical: '⚠️ 등록은 되는데 예약이 안 잡힙니다. 캘린더 가시성/예약 동기부여 점검',
      warning: '예약 안내 타이밍/방식 개선 — 콜 종료 전 예약 확정 의무화',
      improve: '예약 미확정 환자에게 24시간 내 재안내 SOP 구축',
      good: '✅ 예약 전환 양호',
    },
    visit: {
      critical: '⚠️ 예약은 잡혔으나 No-show 비율 심각. 리마인더 시스템 재점검',
      warning: '카카오톡 리마인더 D-1, D-당일 자동 발송 활성화 권장',
      improve: '주말/평일 예약별 no-show 패턴 분석 → 차별화된 리마인더',
      good: '✅ 방문 전환 양호',
    },
    waiting: {
      critical: '⚠️ 내원 후 대기 중 이탈이 큽니다. 대기시간 측정 + 안내 시스템 도입',
      warning: '평균 대기시간 점검 — 15분 초과 시 양해 인사 SOP 적용',
      improve: '대기 환자 만족도 설문 도입',
      good: '✅ 대기 단계 양호',
    },
    diagnosis: {
      critical: '⚠️ 대기까지 통과한 환자가 진단까지 못 갑니다. 진료 흐름 재점검',
      warning: '진단 단계 기록 누락 가능성 — 진료 노트 의무화',
      improve: '진단 후 상담 연결 동선 최적화',
      good: '✅ 진단 단계 양호',
    },
    consultation: {
      critical: '⚠️ 진단은 됐는데 상담 동의가 안 됩니다. 상담사 역량 점검 + 견적 설명 방식 재설계',
      warning: '동의율이 낮습니다. 견적 시각화 자료(사례 사진/비교표) 도입 권장',
      improve: '상담 시간 평균 20분 이상 확보 + 침묵의 클로징 기법 적용',
      good: '✅ 상담 동의 단계 양호',
    },
    treatment: {
      critical: '⚠️ 동의는 받았는데 결제까지 안 갑니다. 결제 안내 타이밍/방식 점검',
      warning: '결제 단계 이탈 발생 — 분납/카드 옵션 다양화 검토',
      improve: '결제 후 first follow-up 24시간 내 강화',
      good: '✅ 진료/결제 단계 양호',
    },
    management: {
      critical: '⚠️ 재방문/리콜이 안 됩니다. 사후 관리 시스템 부재 — 즉시 구축 필요',
      warning: '리콜 발송률 점검 — 진료 후 D+30, D+90, D+180 자동화 권장',
      improve: '환자별 맞춤 리콜 메시지 + 정기 검진 안내 시스템',
      good: '✅ 사후 관리 단계 양호',
    },
    referral: {
      critical: '⚠️ 소개가 거의 없습니다. 환자 만족도 점검 + 소개 유도 시스템 필요',
      warning: '소개 환자 인센티브/감사 시스템 도입 권장',
      improve: '팬 등급 환자 발굴 → 개별 소개 부탁 캠페인',
      good: '🌟 소개 단계 우수 — 페이션트 퍼널 완성형',
    },
  }
  return advice[stage]?.[level] || ''
}

export default funnel
