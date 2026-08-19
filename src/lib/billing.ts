/* ═══ v5.9.0 판매 준비 패키지: 플랜 카탈로그 + 토스페이먼츠 빌링 헬퍼 ═══
 *
 * 가격 정책 (2026-08-19 최종본 기준):
 *  - Starter  19만/월 : 직원 15인 이하 — 퍼널 CRM + 대시보드 + 리뷰관리
 *  - Growth   39만/월 : 직원 30인 이하 — 전 기능 (HR/근태/회의/피드백/감사로그)
 *  - Enterprise 69만/월 : 다지점/30인+ — 전담 온보딩 + 커스텀
 *  - Founding  0원       : 기존 가입 병원 백필 (파운딩 멤버, 무기한)
 *  - 연납: 15% 할인 방식 폐지 → 2개월 무료(10개월치 선결제) 방식으로 통일
 *
 * 토스페이먼츠 자동결제(빌링) 흐름:
 *  1. 프론트: 토스 SDK requestBillingAuth() → successUrl 로 authKey 리다이렉트
 *  2. 백엔드: POST /billing/authorizations/issue → billingKey 발급·저장
 *  3. 매월: POST /billing/{billingKey} 로 자동 청구 (cron tick 에서 갱신 청구)
 * 시크릿 미설정 시 모든 결제 API 는 503 '준비중' — 기능 자체는 안전하게 배포 가능.
 */

export type PlanId = 'starter' | 'growth' | 'enterprise' | 'founding'

export const PLANS: Record<PlanId, {
  id: PlanId; name: string; monthlyPrice: number; yearlyMonthly: number;
  maxStaff: number | null; features: string[]; public: boolean
}> = {
  starter: {
    id: 'starter', name: 'Starter', monthlyPrice: 190000, yearlyMonthly: 158333,
    maxStaff: 15, public: true,
    features: ['환자 퍼널 CRM (10단계 여정)', '경영 대시보드 + KPI', '리뷰 통합 관리', '콜/상담 기록', '일일 브리핑'],
  },
  growth: {
    id: 'growth', name: 'Growth', monthlyPrice: 390000, yearlyMonthly: 325000,
    maxStaff: 30, public: true,
    features: ['Starter 전 기능', 'HR/근태/연차 관리', '회의·피드백 시스템', '원내 메신저 + 환자 채팅', 'AI 인사이트', '감사 로그 (컴플라이언스)', '페이션트 인덱스'],
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', monthlyPrice: 690000, yearlyMonthly: 575000,
    maxStaff: null, public: true,
    features: ['Growth 전 기능', '다지점 통합 관리', '전담 온보딩 매니저', '커스텀 기능 개발', 'SLA 99.9% 보장', '우선 기술 지원'],
  },
  founding: {
    id: 'founding', name: 'Founding Member', monthlyPrice: 0, yearlyMonthly: 0,
    maxStaff: null, public: false,
    features: ['전 기능 무기한 이용 (파운딩 멤버 혜택)'],
  },
}

export const TRIAL_DAYS = 14

/* ─── 구독 상태 조회 (미들웨어/라우트 공용) ─── */
export type SubRow = {
  id: string; hospital_id: string; plan: PlanId; status: string;
  trial_ends_at: string | null; current_period_end: string | null;
  monthly_price: number; toss_customer_key: string | null;
  toss_billing_key: string | null; card_summary: string | null;
}

export async function getSubscription(db: D1Database, hospitalId: string): Promise<SubRow | null> {
  try {
    return await db.prepare('SELECT * FROM subscriptions WHERE hospital_id=?').bind(hospitalId).first<SubRow>()
  } catch { return null } // 테이블 미존재(마이그레이션 전) → 차단하지 않음
}

/* 체험 만료 여부 — trial 상태인데 trial_ends_at 이 지났으면 true */
export function isTrialExpired(sub: SubRow): boolean {
  if (sub.status !== 'trial' || !sub.trial_ends_at) return false
  const iso = sub.trial_ends_at.includes('T') ? sub.trial_ends_at : sub.trial_ends_at.replace(' ', 'T') + 'Z'
  const t = new Date(iso).getTime()
  return !isNaN(t) && t < Date.now()
}

export function trialDaysLeft(sub: SubRow): number {
  if (!sub.trial_ends_at) return 0
  // SQLite DATETIME "YYYY-MM-DD HH:MM:SS" (공백 구분, UTC) → ISO 형식으로 정규화
  const iso = sub.trial_ends_at.includes('T') ? sub.trial_ends_at : sub.trial_ends_at.replace(' ', 'T') + 'Z'
  const end = new Date(iso)
  if (isNaN(end.getTime())) return 0
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000))
}

/* ─── 신규 병원 구독 생성 (가입 시 14일 체험) ─── */
export async function createTrialSubscription(db: D1Database, hospitalId: string): Promise<void> {
  try {
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ')
    await db.prepare(
      `INSERT OR IGNORE INTO subscriptions (id, hospital_id, plan, status, trial_ends_at, monthly_price, toss_customer_key)
       VALUES (?, ?, 'growth', 'trial', ?, 0, ?)`
    ).bind(crypto.randomUUID(), hospitalId, trialEnd, 'pfm_' + hospitalId.replace(/-/g, '').slice(0, 24)).run()
    await db.prepare(
      `INSERT INTO billing_events (id, hospital_id, event_type, plan, detail) VALUES (?, ?, 'trial_start', 'growth', ?)`
    ).bind(crypto.randomUUID(), hospitalId, JSON.stringify({ trialDays: TRIAL_DAYS })).run()
  } catch { /* 마이그레이션 전 환경 — 가입 자체는 막지 않음 */ }
}

/* ─── 토스페이먼츠 API 호출 ─── */
export async function tossRequest(secretKey: string, path: string, body: Record<string, any>): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`https://api.tosspayments.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(secretKey + ':'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data: any = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export async function logBillingEvent(db: D1Database, hospitalId: string, eventType: string, fields: { plan?: string; amount?: number; paymentKey?: string; orderId?: string; detail?: Record<string, any> } = {}): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO billing_events (id, hospital_id, event_type, plan, amount, payment_key, order_id, detail) VALUES (?,?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), hospitalId, eventType, fields.plan || null, fields.amount ?? null, fields.paymentKey || null, fields.orderId || null, JSON.stringify(fields.detail || {})).run()
  } catch { /* fire-and-forget */ }
}

/* ═══ v5.10.0 체험 만료 게이트 ═══
 * 정책:
 *  - TOSS_SECRET_KEY 미설정 (= 결제 인프라 준비 전) → 게이트 비활성. 아무도 잠기지 않음.
 *  - 결제 준비 완료 후: trial 만료 + 3일 유예(grace) 지나면 402 반환.
 *  - founding / active / past_due(결제 재시도 중) 는 차단하지 않음.
 *  - 허용 경로: 결제/구독 관련 + 에러 리포팅 (잠긴 상태에서도 결제는 가능해야 함)
 */
export const TRIAL_GRACE_DAYS = 3

export function isTrialLocked(sub: SubRow | null): boolean {
  if (!sub || sub.status !== 'trial' || !sub.trial_ends_at) return false
  const iso = sub.trial_ends_at.includes('T') ? sub.trial_ends_at : sub.trial_ends_at.replace(' ', 'T') + 'Z'
  const t = new Date(iso).getTime()
  if (isNaN(t)) return false
  return Date.now() > t + TRIAL_GRACE_DAYS * 86400000
}

/* ═══ v5.10.0 월 자동 갱신 청구 (cron tick 에서 호출) ═══
 * 대상: status='active' AND billing_key 있음 AND current_period_end 경과
 * 성공 → period +1개월 연장, payment_success 이벤트
 * 실패 → status='past_due', payment_failed 이벤트 (3회 연속 실패 시 canceled 는 수동 정책으로 보류)
 */
export async function chargeRenewals(db: D1Database, tossSecretKey: string): Promise<{ charged: number; failed: number; skipped: number }> {
  const result = { charged: 0, failed: 0, skipped: 0 }
  const due = await db.prepare(`
    SELECT s.*, h.name as hospital_name FROM subscriptions s
    JOIN hospitals h ON h.id = s.hospital_id
    WHERE s.status = 'active' AND s.toss_billing_key IS NOT NULL
      AND s.monthly_price > 0
      AND s.current_period_end IS NOT NULL
      AND s.current_period_end < datetime('now')
    LIMIT 20
  `).all<SubRow & { hospital_name: string }>()

  for (const sub of (due.results || [])) {
    const orderId = `pfm-renew-${sub.hospital_id.slice(0, 8)}-${Date.now()}`
    try {
      const res = await tossRequest(tossSecretKey, `/billing/${sub.toss_billing_key}`, {
        customerKey: sub.toss_customer_key,
        amount: sub.monthly_price,
        orderId,
        orderName: `Patient Funnel ${PLANS[sub.plan]?.name || sub.plan} 월 구독`,
      })
      if (res.ok) {
        // 갱신: current_period_end 기준 +1개월 (지연 청구여도 주기 유지)
        await db.prepare(`
          UPDATE subscriptions SET current_period_end = datetime(current_period_end, '+1 month'), updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(sub.id).run()
        await logBillingEvent(db, sub.hospital_id, 'payment_success', { plan: sub.plan, amount: sub.monthly_price, paymentKey: res.data?.paymentKey, orderId })
        result.charged++
      } else {
        await db.prepare(`UPDATE subscriptions SET status='past_due', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(sub.id).run()
        await logBillingEvent(db, sub.hospital_id, 'payment_failed', { plan: sub.plan, amount: sub.monthly_price, orderId, detail: { code: res.data?.code, message: (res.data?.message || '').slice(0, 200) } })
        result.failed++
      }
    } catch (e: any) {
      // 네트워크 오류 → 상태 변경 없이 다음 tick 재시도
      await logBillingEvent(db, sub.hospital_id, 'payment_error', { plan: sub.plan, orderId, detail: { error: (e?.message || '').slice(0, 200) } })
      result.skipped++
    }
  }
  return result
}
