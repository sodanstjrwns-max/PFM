/* ═══════════════════════════════════════════════════════════
 * Fan Score Calculator
 * 환자 팬 등급 자동 계산 엔진
 * ═══════════════════════════════════════════════════════════ */

export type FanLevel = 'general' | 'satisfied' | 'loyal' | 'fan' | 'evangelist'

export interface FanScoreInput {
  referralCount: number
  referralDepth: number          // 소개 트리 전파 깊이 (A→B→C 면 2)
  totalReferralRevenue: number    // 소개로 발생한 총 매출 (원)
  visitCount: number
  totalPaid: number              // 본인 결제 누적 (원)
  positiveReviewCount: number
  satisfactionScore: number       // 0~5
}

export interface FanScoreResult {
  score: number              // 0-1000
  level: FanLevel
  components: {
    referralPoints: number
    depthPoints: number
    revenuePoints: number
    visitPoints: number
    paidPoints: number
    reviewPoints: number
    satisfactionPoints: number
  }
}

/**
 * 팬 점수 계산 (총점 0-1000 정규화)
 *
 * 공식:
 *  - 소개 1명         × 50pt   (최대 500)
 *  - 소개 트리 깊이   × 30pt   (최대 150)
 *  - 소개 매출 10만원 × 10pt   (최대 200)
 *  - 방문 1회         × 5pt    (최대 100)
 *  - 본인 결제 100만  × 5pt    (최대 100)
 *  - 긍정 리뷰        × 20pt   (최대 100)
 *  - 만족도 (0~5)     × 10pt   (최대 50)
 */
export function calculateFanScore(input: FanScoreInput): FanScoreResult {
  const referralPoints = Math.min(input.referralCount * 50, 500)
  const depthPoints = Math.min(input.referralDepth * 30, 150)
  const revenuePoints = Math.min(Math.floor(input.totalReferralRevenue / 100000) * 10, 200)
  const visitPoints = Math.min(input.visitCount * 5, 100)
  const paidPoints = Math.min(Math.floor(input.totalPaid / 1000000) * 5, 100)
  const reviewPoints = Math.min(input.positiveReviewCount * 20, 100)
  const satisfactionPoints = Math.min(input.satisfactionScore * 10, 50)

  const totalRaw = referralPoints + depthPoints + revenuePoints +
                   visitPoints + paidPoints + reviewPoints + satisfactionPoints

  // 정규화: 1200 만점 → 1000으로 스케일 (실제 1200 도달은 거의 불가능)
  const score = Math.min(Math.round(totalRaw), 1000)

  return {
    score,
    level: classifyLevel(score, input.referralCount),
    components: {
      referralPoints, depthPoints, revenuePoints,
      visitPoints, paidPoints, reviewPoints, satisfactionPoints
    }
  }
}

/**
 * 등급 분류 (점수 + 소개 수 기준)
 *
 * - evangelist (전도사) : 700+ OR 소개 10+
 * - fan        (팬)     : 400+ OR 소개 5+
 * - loyal      (충성)   : 200+ OR 소개 2+
 * - satisfied  (만족)   : 50+  OR 소개 1+
 * - general    (일반)   : 그 외
 */
export function classifyLevel(score: number, referralCount: number): FanLevel {
  if (score >= 700 || referralCount >= 10) return 'evangelist'
  if (score >= 400 || referralCount >= 5)  return 'fan'
  if (score >= 200 || referralCount >= 2)  return 'loyal'
  if (score >= 50  || referralCount >= 1)  return 'satisfied'
  return 'general'
}

export const FAN_LEVEL_META: Record<FanLevel, {
  label: string
  emoji: string
  color: string
  glowColor: string
  size: number
  description: string
}> = {
  evangelist: {
    label: '전도사',
    emoji: '🌟',
    color: '#fbbf24',
    glowColor: '#fde68a',
    size: 14,
    description: '병원의 핵심 옹호자. 10명 이상 소개하거나 영향력 점수 700+'
  },
  fan: {
    label: '팬',
    emoji: '💎',
    color: '#06b6d4',
    glowColor: '#67e8f9',
    size: 11,
    description: '5명 이상 소개한 충성 환자. 영향력 400+'
  },
  loyal: {
    label: '충성',
    emoji: '💗',
    color: '#ec4899',
    glowColor: '#f9a8d4',
    size: 9,
    description: '2명 이상 소개한 단골 환자. 영향력 200+'
  },
  satisfied: {
    label: '만족',
    emoji: '😊',
    color: '#10b981',
    glowColor: '#6ee7b7',
    size: 7,
    description: '1명 이상 소개한 만족 환자. 영향력 50+'
  },
  general: {
    label: '일반',
    emoji: '👤',
    color: '#94a3b8',
    glowColor: '#cbd5e1',
    size: 5,
    description: '아직 소개 이력이 없는 일반 환자'
  }
}

/**
 * 등급 변경 감지 (알림 발생 여부 결정)
 */
export function getLevelChangeNotification(
  oldLevel: FanLevel | null,
  newLevel: FanLevel,
  referralCount: number
): { type: string; message: string; priority: 'low' | 'normal' | 'high' } | null {
  // 첫 소개
  if (referralCount === 1 && (!oldLevel || oldLevel === 'general')) {
    return {
      type: 'first_referral',
      message: '첫 소개를 해주셨습니다 💝 다음 방문 시 감사 인사를 잊지 마세요',
      priority: 'normal'
    }
  }

  if (!oldLevel || oldLevel === newLevel) return null

  const order: FanLevel[] = ['general', 'satisfied', 'loyal', 'fan', 'evangelist']
  const oldIdx = order.indexOf(oldLevel)
  const newIdx = order.indexOf(newLevel)

  // 등급 상승만 알림
  if (newIdx <= oldIdx) return null

  // 5명 마일스톤
  if (newLevel === 'fan' && referralCount >= 5) {
    return {
      type: 'milestone_5',
      message: `🎉 팬 등급 승급! 5명 이상 소개 (${referralCount}명) — 원장님 감사 카드 + 소정 선물 검토`,
      priority: 'high'
    }
  }

  // 10명 마일스톤
  if (newLevel === 'evangelist' && referralCount >= 10) {
    return {
      type: 'milestone_10',
      message: `🌟 전도사 등극! 10명 이상 소개 (${referralCount}명) — VIP 검진권 + 원장님 직접 연락 추천`,
      priority: 'high'
    }
  }

  // 일반 등급 상승
  return {
    type: 'level_up',
    message: `${FAN_LEVEL_META[oldLevel].emoji} ${FAN_LEVEL_META[oldLevel].label} → ${FAN_LEVEL_META[newLevel].emoji} ${FAN_LEVEL_META[newLevel].label} 등급 상승`,
    priority: newLevel === 'fan' || newLevel === 'evangelist' ? 'high' : 'normal'
  }
}
