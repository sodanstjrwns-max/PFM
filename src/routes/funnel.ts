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

export default funnel
