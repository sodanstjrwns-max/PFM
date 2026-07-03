/* ═══ v5.9.0 구독/빌링 라우트 ═══
 *
 * 공개:   GET  /api/billing/plans                — 요금제 카탈로그 (랜딩/프라이싱 페이지용)
 * 보호:   GET  /api/protected/billing/status     — 내 병원 구독 상태 (배너/설정 UI)
 *         POST /api/protected/billing/issue-key  — 토스 authKey → billingKey 발급 (admin)
 *         POST /api/protected/billing/subscribe  — 플랜 선택 + 첫 결제 (admin)
 *         POST /api/protected/billing/cancel     — 구독 해지 (admin)
 *         GET  /api/protected/billing/history    — 결제 이력 (admin)
 *
 * TOSS_SECRET_KEY 미설정 → 결제 계열 API 는 503 { reason: 'not_configured' }
 * 프론트는 이를 받아 "결제 준비중 — 도입 문의" 안내로 폴백. 배포 안전.
 */
import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole } from '../lib/middleware'
import { PLANS, type PlanId, getSubscription, trialDaysLeft, isTrialExpired, tossRequest, logBillingEvent } from '../lib/billing'
import { auditFromCtx } from '../lib/audit'

/* ─── 공개 라우트: 요금제 카탈로그 ─── */
export const billingPublic = new Hono<{ Bindings: Bindings }>()

billingPublic.get('/plans', (c) => {
  const plans = Object.values(PLANS).filter(p => p.public).map(p => ({
    id: p.id, name: p.name,
    monthlyPrice: p.monthlyPrice, yearlyMonthly: p.yearlyMonthly,
    maxStaff: p.maxStaff, features: p.features,
  }))
  return c.json({ plans, trialDays: 14 })
})

/* ─── 보호 라우트: 구독 관리 ─── */
const billing = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* 구독 상태 — 모든 로그인 사용자 조회 가능 (배너 표시용) */
billing.get('/status', async (c) => {
  const user = c.get('user')!
  const sub = await getSubscription(c.env.DB, user.hospitalId)
  if (!sub) return c.json({ configured: false, status: 'none' })
  const plan = PLANS[sub.plan as PlanId] || PLANS.growth
  return c.json({
    configured: true,
    plan: sub.plan, planName: plan.name,
    status: sub.status,
    trialEndsAt: sub.trial_ends_at,
    trialDaysLeft: sub.status === 'trial' ? trialDaysLeft(sub) : null,
    trialExpired: isTrialExpired(sub),
    currentPeriodEnd: sub.current_period_end,
    monthlyPrice: sub.monthly_price,
    cardSummary: sub.card_summary,
    paymentsReady: !!c.env.TOSS_SECRET_KEY,
    tossClientKey: c.env.TOSS_CLIENT_KEY || null,
    customerKey: sub.toss_customer_key,
  })
})

/* 토스 빌링키 발급 — 카드 등록 성공 리다이렉트 후 authKey 교환 */
billing.post('/issue-key', requireRole('admin'), async (c) => {
  if (!c.env.TOSS_SECRET_KEY) return c.json({ error: '결제 시스템 준비중입니다', reason: 'not_configured' }, 503)
  const user = c.get('user')!
  const { authKey } = await c.req.json().catch(() => ({}))
  if (!authKey) return c.json({ error: 'authKey가 필요합니다' }, 400)
  const sub = await getSubscription(c.env.DB, user.hospitalId)
  if (!sub) return c.json({ error: '구독 정보가 없습니다' }, 404)

  const r = await tossRequest(c.env.TOSS_SECRET_KEY, '/billing/authorizations/issue', {
    authKey, customerKey: sub.toss_customer_key,
  })
  if (!r.ok) return c.json({ error: r.data?.message || '빌링키 발급 실패', code: r.data?.code }, 400)

  const cardSummary = `${r.data?.card?.issuerCode ? '' : ''}${r.data?.card?.company || r.data?.cardCompany || '카드'} **** ${(r.data?.card?.number || '').slice(-4)}`
  await c.env.DB.prepare(
    `UPDATE subscriptions SET toss_billing_key=?, card_summary=?, updated_at=CURRENT_TIMESTAMP WHERE hospital_id=?`
  ).bind(r.data.billingKey, cardSummary, user.hospitalId).run()
  logBillingEvent(c.env.DB, user.hospitalId, 'billing_key_issued', { detail: { cardSummary } })
  auditFromCtx(c, 'billing.card_registered', { summary: `결제 카드 등록: ${cardSummary}` })
  return c.json({ success: true, cardSummary })
})

/* 플랜 구독 시작 (첫 결제) */
billing.post('/subscribe', requireRole('admin'), async (c) => {
  if (!c.env.TOSS_SECRET_KEY) return c.json({ error: '결제 시스템 준비중입니다', reason: 'not_configured' }, 503)
  const user = c.get('user')!
  const { plan: planId, yearly } = await c.req.json().catch(() => ({}))
  const plan = PLANS[planId as PlanId]
  if (!plan || !plan.public) return c.json({ error: '올바른 플랜을 선택해주세요' }, 400)

  const sub = await getSubscription(c.env.DB, user.hospitalId)
  if (!sub) return c.json({ error: '구독 정보가 없습니다' }, 404)
  if (!sub.toss_billing_key) return c.json({ error: '먼저 결제 카드를 등록해주세요', reason: 'no_billing_key' }, 400)

  const amount = yearly ? plan.yearlyMonthly * 12 : plan.monthlyPrice
  const orderId = `pfm_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
  const orderName = `Patient Funnel OS ${plan.name} (${yearly ? '연간' : '월간'})`

  const r = await tossRequest(c.env.TOSS_SECRET_KEY, `/billing/${sub.toss_billing_key}`, {
    customerKey: sub.toss_customer_key, amount, orderId, orderName,
  })
  if (!r.ok) {
    logBillingEvent(c.env.DB, user.hospitalId, 'payment_failed', { plan: plan.id, amount, orderId, detail: { code: r.data?.code, message: r.data?.message } })
    return c.json({ error: r.data?.message || '결제 실패', code: r.data?.code }, 400)
  }

  const periodDays = yearly ? 365 : 31
  const periodEnd = new Date(Date.now() + periodDays * 86400000).toISOString().slice(0, 19).replace('T', ' ')
  await c.env.DB.prepare(
    `UPDATE subscriptions SET plan=?, status='active', monthly_price=?, current_period_end=?, trial_ends_at=NULL, canceled_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE hospital_id=?`
  ).bind(plan.id, yearly ? plan.yearlyMonthly : plan.monthlyPrice, periodEnd, user.hospitalId).run()
  logBillingEvent(c.env.DB, user.hospitalId, 'payment_success', { plan: plan.id, amount, paymentKey: r.data?.paymentKey, orderId })
  auditFromCtx(c, 'billing.subscribe', { summary: `구독 시작: ${plan.name} ${yearly ? '연간' : '월간'} (${amount.toLocaleString()}원)` })
  return c.json({ success: true, plan: plan.id, amount, periodEnd })
})

/* 구독 해지 — 현재 주기 말까지 이용 가능 */
billing.post('/cancel', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  const sub = await getSubscription(c.env.DB, user.hospitalId)
  if (!sub) return c.json({ error: '구독 정보가 없습니다' }, 404)
  if (sub.plan === 'founding') return c.json({ error: '파운딩 멤버는 해지 대상이 아닙니다' }, 400)
  await c.env.DB.prepare(
    `UPDATE subscriptions SET status='canceled', canceled_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE hospital_id=?`
  ).bind(user.hospitalId).run()
  logBillingEvent(c.env.DB, user.hospitalId, 'cancel', { plan: sub.plan })
  auditFromCtx(c, 'billing.cancel', { summary: `구독 해지 (${sub.plan})` })
  return c.json({ success: true, message: '구독이 해지되었습니다. 현재 결제 주기 종료일까지 이용 가능합니다.' })
})

/* 결제 이력 */
billing.get('/history', requireRole('admin'), async (c) => {
  const user = c.get('user')!
  try {
    const rows = await c.env.DB.prepare(
      `SELECT event_type, plan, amount, order_id, created_at FROM billing_events WHERE hospital_id=? ORDER BY created_at DESC LIMIT 50`
    ).bind(user.hospitalId).all()
    return c.json({ events: rows.results || [] })
  } catch { return c.json({ events: [] }) }
})

export default billing
