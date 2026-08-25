/* ═══ Patient Series 통합 — PFM 퍼널 스냅샷/신호 공용 로직 ═══
 *
 * routes/funnel.ts의 GET /score (10단계 자동 채점, 문석준 모델)와
 * 동일한 실측 카운트 방식을 사용하되, 기존 라우트는 건드리지 않고
 * PS Open API(/api/v1/*)만을 위해 이 파일에서 독립적으로 계산한다.
 * (회귀 위험을 낮추기 위해 의도적으로 코드를 공유하지 않고 복제함)
 */

export const PS_FUNNEL_STAGES = [
  { key: 'awareness',    no: 1,  label: '인지' },
  { key: 'interest',     no: 2,  label: '관심' },
  { key: 'appointment',  no: 3,  label: '예약' },
  { key: 'visit',        no: 4,  label: '방문' },
  { key: 'waiting',      no: 5,  label: '대기' },
  { key: 'diagnosis',    no: 6,  label: '진단' },
  { key: 'consultation', no: 7,  label: '상담' },
  { key: 'treatment',    no: 8,  label: '진료' },
  { key: 'management',   no: 9,  label: '관리' },
  { key: 'referral',     no: 10, label: '소개' },
] as const

/**
 * 10단계 실측 카운트 조회.
 * dateTo가 없으면 dateFrom 이후 전체(열린 구간), 있으면 [dateFrom, dateTo) 구간.
 * routes/funnel.ts GET /score 와 동일한 테이블/조건을 사용 (문석준 모델과 정의 일치 유지).
 */
export async function fetchPsStageCounts(
  db: D1Database,
  hospitalId: string,
  dateFrom: string,
  dateTo?: string
): Promise<number[]> {
  const range = (col: string) => (dateTo ? `${col} >= ? AND ${col} < ?` : `${col} >= ?`)
  const params = (extra: any[] = []) =>
    dateTo ? [hospitalId, dateFrom, dateTo, ...extra] : [hospitalId, dateFrom, ...extra]

  const [
    callsCnt, patientsCnt, apptCnt, visitedCnt, waitingPassCnt,
    diagnosedCnt, consultCnt, treatedCnt, revisitCnt, referredCnt,
  ] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS c FROM call_records WHERE hospital_id=? AND call_type='inbound' AND ${range('call_date')}`)
      .bind(...params()).first<any>(),
    db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND ${range('created_at')}`)
      .bind(...params()).first<any>(),
    db.prepare(`SELECT COUNT(DISTINCT id) AS c FROM patients WHERE hospital_id=? AND ${range('first_visit_date')}`)
      .bind(...params()).first<any>().catch(() => ({ c: 0 })),
    db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND visit_count >= 1 AND ${range('first_visit_date')}`)
      .bind(...params()).first<any>(),
    db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND visit_count >= 1 AND ${range('first_visit_date')}`)
      .bind(...params()).first<any>(),
    db.prepare(`SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND ${range('consult_date')}`)
      .bind(...params()).first<any>().catch(() => ({ c: 0 })),
    db.prepare(`SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND agreed_amount > 0 AND ${range('consult_date')}`)
      .bind(...params()).first<any>().catch(() => ({ c: 0 })),
    db.prepare(`SELECT COUNT(*) AS c FROM consult_records WHERE hospital_id=? AND COALESCE(is_deleted,0)=0 AND status IN ('payment','treatment','completed') AND ${range('consult_date')}`)
      .bind(...params()).first<any>().catch(() => ({ c: 0 })),
    // 재방문(관리 단계)은 원본 /score와 동일하게 날짜 필터 없이 전체 기준 (스냅샷 성격)
    db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND visit_count >= 2`)
      .bind(hospitalId).first<any>(),
    db.prepare(`SELECT COUNT(*) AS c FROM patients WHERE hospital_id=? AND referrer_name IS NOT NULL AND referrer_name != '' AND ${range('created_at')}`)
      .bind(...params()).first<any>(),
  ])

  return [callsCnt, patientsCnt, apptCnt, visitedCnt, waitingPassCnt, diagnosedCnt, consultCnt, treatedCnt, revisitCnt, referredCnt]
    .map((r: any) => Number(r?.c || 0))
}

/** 단계별 count + 이전 단계 대비 통과율(rate, %) 계산 */
export function computeStageRates(counts: number[]) {
  return PS_FUNNEL_STAGES.map((meta, idx) => {
    const count = counts[idx]
    const previous = idx === 0 ? count : counts[idx - 1]
    const rate = previous === 0 ? (count > 0 ? 100 : 0) : Math.round(Math.min(count / previous, 1) * 1000) / 10
    return { key: meta.key, label: meta.label, count, rate: idx === 0 ? 100 : rate }
  })
}

/** 현재 시각 KST ISO8601 (+09:00) */
export function nowKstIso(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600000)
  return kst.toISOString().replace('Z', '').slice(0, 19) + '+09:00'
}

/** offsetMonths=0 이면 이번 달 1일, -1 이면 전월 1일 (YYYY-MM-DD) */
export function monthDateFrom(offsetMonths = 0): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1)
  return d.toISOString().slice(0, 10)
}
