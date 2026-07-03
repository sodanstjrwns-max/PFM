/* v5.10 체험 만료 게이트 + 갱신 청구 로직 단위 테스트 */
import { describe, it, expect } from 'vitest'
import { isTrialLocked, isTrialExpired, trialDaysLeft, TRIAL_GRACE_DAYS, type SubRow } from '../src/lib/billing'

const mkSub = (over: Partial<SubRow> = {}): SubRow => ({
  id: 's1', hospital_id: 'h1', plan: 'growth', status: 'trial',
  trial_ends_at: null, current_period_end: null, monthly_price: 0,
  toss_customer_key: null, toss_billing_key: null, card_summary: null,
  ...over,
})

const sqliteDt = (msFromNow: number) =>
  new Date(Date.now() + msFromNow).toISOString().slice(0, 19).replace('T', ' ')

describe('isTrialLocked (체험 만료 게이트)', () => {
  it('null 구독 → 잠기지 않음 (마이그레이션 전 안전)', () => {
    expect(isTrialLocked(null)).toBe(false)
  })
  it('active 상태 → 잠기지 않음', () => {
    expect(isTrialLocked(mkSub({ status: 'active', trial_ends_at: sqliteDt(-30 * 86400000) }))).toBe(false)
  })
  it('founding(active) → 잠기지 않음', () => {
    expect(isTrialLocked(mkSub({ plan: 'founding', status: 'active' }))).toBe(false)
  })
  it('past_due → 잠기지 않음 (결제 재시도 중)', () => {
    expect(isTrialLocked(mkSub({ status: 'past_due' }))).toBe(false)
  })
  it('trial + 아직 기간 내 → 잠기지 않음', () => {
    expect(isTrialLocked(mkSub({ trial_ends_at: sqliteDt(5 * 86400000) }))).toBe(false)
  })
  it('trial + 만료됐지만 유예기간(3일) 내 → 잠기지 않음', () => {
    expect(isTrialLocked(mkSub({ trial_ends_at: sqliteDt(-(TRIAL_GRACE_DAYS - 1) * 86400000) }))).toBe(false)
  })
  it('trial + 만료 + 유예 지남 → 잠김', () => {
    expect(isTrialLocked(mkSub({ trial_ends_at: sqliteDt(-(TRIAL_GRACE_DAYS + 1) * 86400000) }))).toBe(true)
  })
  it('trial_ends_at 없음 → 잠기지 않음', () => {
    expect(isTrialLocked(mkSub({ trial_ends_at: null }))).toBe(false)
  })
  it('SQLite 공백 구분 DATETIME 파싱 정상', () => {
    // "YYYY-MM-DD HH:MM:SS" 형식이 ISO 로 정규화되어 계산됨
    expect(isTrialLocked(mkSub({ trial_ends_at: '2020-01-01 00:00:00' }))).toBe(true)
    expect(isTrialLocked(mkSub({ trial_ends_at: '2099-01-01 00:00:00' }))).toBe(false)
  })
})

describe('isTrialExpired / trialDaysLeft (기존 회귀)', () => {
  it('trial 만료 판정', () => {
    expect(isTrialExpired(mkSub({ trial_ends_at: sqliteDt(-1000) }))).toBe(true)
    expect(isTrialExpired(mkSub({ trial_ends_at: sqliteDt(86400000) }))).toBe(false)
  })
  it('남은 일수 계산 (14일 체험)', () => {
    const d = trialDaysLeft(mkSub({ trial_ends_at: sqliteDt(14 * 86400000) }))
    expect(d).toBeGreaterThanOrEqual(13)
    expect(d).toBeLessThanOrEqual(14)
  })
  it('만료 후 → 0', () => {
    expect(trialDaysLeft(mkSub({ trial_ends_at: sqliteDt(-86400000) }))).toBe(0)
  })
})
