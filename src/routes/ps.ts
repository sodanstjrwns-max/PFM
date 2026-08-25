/* ═══════════════════════════════════════════════════════════
 * Patient Series 통합 — PFM 공급자 API (Open API v1)
 * ─────────────────────────────────────────────────────────
 * §3 ⬛ PFM 작업창 지시:
 *   1) GET /api/v1/funnel   — 10단계 퍼널 스냅샷
 *   2) GET /api/v1/signals  — 퍼널 단계 전환율 급락 신호
 *
 * 인증: 이 라우트는 기존 /api/protected/* JWT 인증과 완전히 분리된
 *       별도 서버-서버 인증을 사용한다 (§1-2):
 *         Authorization: Bearer {PS_SERVICE_KEY}
 *         X-PS-Hospital-Id: {병원 전역 ID}
 *       PS_SERVICE_KEY 미설정 시 이 라우트 전체가 비활성(404) —
 *       기존 서비스에는 어떤 영향도 주지 않는다.
 *
 * 파일럿 매핑: env.PS_HOSPITAL_MAP = "bdd-001=로컬id123,bdd-002=로컬id456"
 *             (전역 ID → PFM 내부 hospital_id 콤마 구분 다중 매핑)
 * ═══════════════════════════════════════════════════════════ */
import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { PS_FUNNEL_STAGES, fetchPsStageCounts, computeStageRates, nowKstIso, monthDateFrom } from '../lib/ps-funnel'

const ps = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function psError(c: any, status: number, code: string, message: string) {
  return c.json({ error: { code, message } }, status)
}

/* ─── PS 전용 인증 미들웨어 (이 라우트에만 적용) ─── */
ps.use('/*', async (c, next) => {
  const serviceKey = c.env.PS_SERVICE_KEY
  if (!serviceKey) {
    // 파일럿 키 미설정 — 통합 비활성 상태. 기존 서비스 영향 없음.
    return psError(c, 404, 'not_configured', 'Patient Series 통합이 아직 설정되지 않았습니다')
  }
  const auth = c.req.header('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token || token !== serviceKey) {
    return psError(c, 401, 'unauthorized', '인증에 실패했습니다')
  }
  const psHospitalId = c.req.header('X-PS-Hospital-Id') || ''
  if (!psHospitalId) {
    return psError(c, 400, 'missing_hospital_id', 'X-PS-Hospital-Id 헤더가 필요합니다')
  }
  // "bdd-001=로컬id123,bdd-002=로컬id456" 형식 매핑 파싱
  const map: Record<string, string> = {}
  for (const pair of (c.env.PS_HOSPITAL_MAP || '').split(',')) {
    const [k, v] = pair.split('=').map(s => s.trim())
    if (k && v) map[k] = v
  }
  const localHospitalId = map[psHospitalId]
  if (!localHospitalId) {
    return psError(c, 404, 'hospital_not_mapped', '해당 병원 ID가 매핑되어 있지 않습니다')
  }
  c.set('psHospitalId', localHospitalId)
  await next()
})

/* ─── 1) 10단계 퍼널 스냅샷 ─── */
ps.get('/funnel', async (c) => {
  const hid = c.get('psHospitalId')!
  // 스냅샷 성격 — 이번 달 1일부터 현재까지 누적 기준 (funnel.ts /score와 동일 정의)
  const dateFrom = monthDateFrom(0)
  const counts = await fetchPsStageCounts(c.env.DB, hid, dateFrom)
  const rates = computeStageRates(counts)

  const stages = PS_FUNNEL_STAGES.map((meta, idx) => ({
    key: meta.key,
    label: meta.label,
    count: counts[idx],
    rate: rates[idx].rate,
  }))

  return c.json({
    service: 'pfm',
    stages,
    as_of: nowKstIso(),
  })
})

/* ─── 2) 퍼널 단계 전환율 급락 신호 ─── */
ps.get('/signals', async (c) => {
  const hid = c.get('psHospitalId')!
  const since = c.req.query('since') || ''

  const thisMonthFrom = monthDateFrom(0)
  const lastMonthFrom = monthDateFrom(-1)

  const [curCounts, prevCounts] = await Promise.all([
    fetchPsStageCounts(c.env.DB, hid, thisMonthFrom),
    fetchPsStageCounts(c.env.DB, hid, lastMonthFrom, thisMonthFrom),
  ])
  const curRates = computeStageRates(curCounts)
  const prevRates = computeStageRates(prevCounts)

  const signals: any[] = []
  const nowIso = nowKstIso()
  const today = nowIso.slice(0, 10)

  // 단계별 전환율(rate)이 전월 대비 10%p 이상 하락한 경우만 신호 생성 (§2: 가짜 신호 생성 금지)
  for (let i = 1; i < PS_FUNNEL_STAGES.length; i++) {
    const meta = PS_FUNNEL_STAGES[i]
    const cur = curRates[i]
    const prev = prevRates[i]
    // 데이터 자체가 없으면(이전 단계 인원 0 등) 판단 불가 → 신호 생성하지 않음
    if (prevCounts[i - 1] === 0 || curCounts[i - 1] === 0) continue
    const drop = prev.rate - cur.rate
    if (drop >= 10) {
      const signalId = `pfm:${today}:funnel-drop-${meta.key}`
      if (since && signalId < `pfm:${since.slice(0, 10)}:`) continue
      signals.push({
        signal_id: signalId,
        type: 'funnel_stage_conversion_drop',
        severity: drop >= 20 ? 'critical' : 'warn',
        title: `${meta.label} 단계 전환율 하락`,
        summary: `전월 ${prev.rate}% → 이번 달 ${cur.rate}% (${Math.round(drop * 10) / 10}%p 하락)`,
        occurred_at: nowIso,
        data: {
          metric: `funnel_${meta.key}_conversion_rate`,
          series: [
            { date: lastMonthFrom, value: prev.rate },
            { date: thisMonthFrom, value: cur.rate },
          ],
        },
      })
    }
  }

  return c.json({ service: 'pfm', signals })
})

export default ps
