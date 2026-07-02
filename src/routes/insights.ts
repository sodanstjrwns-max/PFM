/**
 * 📊 주간 인사이트 (v3.5 Weekly Edition)
 * 매주 월요일 아침, 지난 7일 vs 그 전 7일 데이터를 비교해 의미있는 변화를 발견
 * 
 * GET /api/protected/insights/weekly
 * POST /api/protected/insights/weekly/dismiss  (이번주는 확인 완료 표시)
 */
import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole } from '../lib/middleware'

const insights = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ISO week 형식 yyyy-Www
function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function formatMan(v: number): string {
  if (!v) return '0'
  const man = Math.round(v / 10000)
  if (Math.abs(man) >= 10000) return (man / 10000).toFixed(1) + '억'
  return man.toLocaleString() + '만'
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

/**
 * 지난 7일 vs 그 전 7일 주요 지표 자동 비교
 */
insights.get('/weekly', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const wk1Start = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10)  // 7일 전
  const wk2Start = new Date(today.getTime() - 14 * 86400000).toISOString().slice(0, 10) // 14일 전
  const currentWeek = isoWeek(today)

  try {
    /* ─── 1) 매출 (daily_records) ─── */
    const revThis: any = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(revenue_insurance + revenue_non_insurance), 0) as rev,
             COALESCE(SUM(new_patients), 0) as new_p,
             COALESCE(SUM(existing_patients), 0) as exist_p,
             COUNT(*) as days
      FROM daily_records WHERE hospital_id=? AND record_date >= ? AND record_date < ?
    `).bind(hid, wk1Start, todayStr).first().catch(() => ({ rev: 0, new_p: 0, exist_p: 0, days: 0 }))

    const revLast: any = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(revenue_insurance + revenue_non_insurance), 0) as rev,
             COALESCE(SUM(new_patients), 0) as new_p,
             COALESCE(SUM(existing_patients), 0) as exist_p,
             COUNT(*) as days
      FROM daily_records WHERE hospital_id=? AND record_date >= ? AND record_date < ?
    `).bind(hid, wk2Start, wk1Start).first().catch(() => ({ rev: 0, new_p: 0, exist_p: 0, days: 0 }))

    /* ─── 2) 상담 (consult_records) ─── */
    const conThis: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN treatment_confirmed = 'O' THEN 1 ELSE 0 END) as confirmed,
             COALESCE(SUM(planned_amount), 0) as planned,
             COALESCE(SUM(CASE WHEN treatment_confirmed = 'O' THEN agreed_amount ELSE 0 END), 0) as agreed
      FROM consult_records WHERE hospital_id=? AND record_date >= ? AND record_date < ?
    `).bind(hid, wk1Start, todayStr).first().catch(() => ({ total: 0, confirmed: 0, planned: 0, agreed: 0 }))

    const conLast: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN treatment_confirmed = 'O' THEN 1 ELSE 0 END) as confirmed,
             COALESCE(SUM(planned_amount), 0) as planned,
             COALESCE(SUM(CASE WHEN treatment_confirmed = 'O' THEN agreed_amount ELSE 0 END), 0) as agreed
      FROM consult_records WHERE hospital_id=? AND record_date >= ? AND record_date < ?
    `).bind(hid, wk2Start, wk1Start).first().catch(() => ({ total: 0, confirmed: 0, planned: 0, agreed: 0 }))

    /* ─── 3) 콜 (call_records) ─── */
    const callThis: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN reservation_status IN ('completed','scheduled') THEN 1 ELSE 0 END) as booked
      FROM call_records WHERE hospital_id=? AND call_date >= ? AND call_date < ?
    `).bind(hid, wk1Start, todayStr).first().catch(() => ({ total: 0, booked: 0 }))

    const callLast: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN reservation_status IN ('completed','scheduled') THEN 1 ELSE 0 END) as booked
      FROM call_records WHERE hospital_id=? AND call_date >= ? AND call_date < ?
    `).bind(hid, wk2Start, wk1Start).first().catch(() => ({ total: 0, booked: 0 }))

    /* ─── 4) 컴플레인 (complaints) ─── */
    const cplThis: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM complaints WHERE hospital_id=? AND complaint_date >= ? AND complaint_date < ?
    `).bind(hid, wk1Start, todayStr).first().catch(() => ({ total: 0 }))
    const cplLast: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM complaints WHERE hospital_id=? AND complaint_date >= ? AND complaint_date < ?
    `).bind(hid, wk2Start, wk1Start).first().catch(() => ({ total: 0 }))

    /* ─── 5) 리뷰 (review_management) ─── */
    const rvThis: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total, COALESCE(AVG(rating),0) as avg_r
      FROM review_management WHERE hospital_id=? AND review_date >= ? AND review_date < ?
    `).bind(hid, wk1Start, todayStr).first().catch(() => ({ total: 0, avg_r: 0 }))
    const rvLast: any = await c.env.DB.prepare(`
      SELECT COUNT(*) as total, COALESCE(AVG(rating),0) as avg_r
      FROM review_management WHERE hospital_id=? AND review_date >= ? AND review_date < ?
    `).bind(hid, wk2Start, wk1Start).first().catch(() => ({ total: 0, avg_r: 0 }))

    /* ─── 수치 계산 ─── */
    const rev = { cur: Number(revThis.rev) || 0, prev: Number(revLast.rev) || 0 }
    const newP = { cur: Number(revThis.new_p) || 0, prev: Number(revLast.new_p) || 0 }
    const convThis = Number(conThis.total) > 0 ? Math.round((Number(conThis.confirmed) / Number(conThis.total)) * 100) : 0
    const convLast = Number(conLast.total) > 0 ? Math.round((Number(conLast.confirmed) / Number(conLast.total)) * 100) : 0
    const hidden = { cur: Number(conThis.planned) - Number(conThis.agreed), prev: Number(conLast.planned) - Number(conLast.agreed) }
    const bookRateThis = Number(callThis.total) > 0 ? Math.round((Number(callThis.booked) / Number(callThis.total)) * 100) : 0
    const bookRateLast = Number(callLast.total) > 0 ? Math.round((Number(callLast.booked) / Number(callLast.total)) * 100) : 0

    /* ─── 인사이트 카드 (변화 기반) ─── */
    const cards: any[] = []

    // 💰 매출
    const revPct = pctChange(rev.cur, rev.prev)
    cards.push({
      icon: '💰',
      tone: revPct >= 0 ? 'up' : 'down',
      key: 'revenue',
      title: '주간 매출',
      value: formatMan(rev.cur) + '원',
      change: revPct,
      detail: rev.prev > 0
        ? `지난주 ${formatMan(rev.prev)}원 대비 ${revPct >= 0 ? '+' : ''}${revPct}%`
        : '지난주 기록 없음',
      narrative: revPct >= 10
        ? '🔥 매출이 10% 이상 증가! 무엇이 효과적이었는지 복기해보세요'
        : revPct <= -10
          ? '⚠️ 매출이 10% 이상 감소. 이번주 캠페인·상담·예약 재점검 필요'
          : '안정적인 흐름. 신규 유입 채널을 하나 더 붙일 타이밍',
      goto: 'kpi_daily',
    })

    // 👤 신환
    const newPct = pctChange(newP.cur, newP.prev)
    cards.push({
      icon: '👤',
      tone: newPct >= 0 ? 'up' : 'down',
      key: 'new_patients',
      title: '신규 환자',
      value: `${newP.cur}명`,
      change: newPct,
      detail: newP.prev > 0
        ? `지난주 ${newP.prev}명 대비 ${newPct >= 0 ? '+' : ''}${newPct}%`
        : '지난주 기록 없음',
      narrative: newP.cur === 0
        ? '🚨 이번주 신환 0명. 마케팅·후기·소개 경로 긴급 점검'
        : newPct >= 20
          ? '📈 신환 급증! 유입 경로(퍼널)에서 어떤 소스가 늘었는지 확인'
          : '꾸준한 유입. 퍼널 첫 단계(인지)를 강화할 기회',
      goto: 'funnel',
    })

    // 📊 상담 전환율
    const convDiff = convThis - convLast
    cards.push({
      icon: '📊',
      tone: convDiff >= 0 ? 'up' : 'down',
      key: 'conv_rate',
      title: '상담 전환율',
      value: `${convThis}%`,
      change: convDiff,
      detail: convLast > 0
        ? `지난주 ${convLast}% → 이번주 ${convThis}% (${convDiff >= 0 ? '+' : ''}${convDiff}%p)`
        : `이번주 ${convThis}% (업계 평균 62%)`,
      narrative: convThis < 40
        ? '💡 업계 평균(62%) 대비 많이 낮음. 스크립트·상담 흐름 재점검 필요'
        : convThis >= 62
          ? '👏 업계 평균 이상! 강한 상담 시스템이 돌아가고 있음'
          : '평균권. 결정 미루는 환자 리콜 플로우 추가 여지',
      goto: 'consult_dashboard',
    })

    // 💎 숨은 매출 변화
    if (hidden.cur > 0) {
      const hiddenPct = pctChange(hidden.cur, hidden.prev)
      cards.push({
        icon: '💎',
        tone: hiddenPct <= 0 ? 'up' : 'warn',  // 줄어든 게 좋은 것
        key: 'hidden_revenue',
        title: '숨은 매출 (미결정)',
        value: formatMan(hidden.cur) + '원',
        change: -hiddenPct,  // 부호 반전 (줄면 +)
        detail: hidden.prev > 0
          ? `지난주 ${formatMan(hidden.prev)}원 → ${hiddenPct >= 0 ? '+' : ''}${formatMan(hidden.cur - hidden.prev)}원`
          : '이번주 신규 발생',
        narrative: hiddenPct > 20
          ? '🔔 미결정 상담이 빠르게 쌓이는 중. 팔로업 콜 자동화 켜세요'
          : '📞 리콜 한 통이면 이 중 20-30%는 예약으로 전환 가능',
        goto: 'recall',
      })
    }

    // 📞 콜 예약 전환율
    if (Number(callThis.total) > 0) {
      const bookDiff = bookRateThis - bookRateLast
      cards.push({
        icon: '📞',
        tone: bookDiff >= 0 ? 'up' : 'down',
        key: 'call_booking',
        title: '콜 → 예약 전환',
        value: `${bookRateThis}%`,
        change: bookDiff,
        detail: `${callThis.total}건 중 ${callThis.booked}건 예약 (지난주 ${bookRateLast}%)`,
        narrative: bookRateThis < 50
          ? '☎️ 예약 전환 낮음. 응대 스크립트 개선 or 부재중 리콜 점검'
          : '예약 흐름 양호. 더 많은 인바운드를 유도할 광고 채널 검토',
        goto: 'calls_inbound',
      })
    }

    // 😠 컴플레인 변화
    if (Number(cplThis.total) > 0 || Number(cplLast.total) > 0) {
      const cplDiff = Number(cplThis.total) - Number(cplLast.total)
      cards.push({
        icon: '😠',
        tone: cplDiff <= 0 ? 'up' : 'warn',
        key: 'complaints',
        title: '컴플레인 건수',
        value: `${cplThis.total}건`,
        change: -cplDiff,
        detail: `지난주 ${cplLast.total}건 → ${cplDiff >= 0 ? '+' : ''}${cplDiff}건`,
        narrative: cplDiff > 0
          ? '🚨 증가 추세. 주간 원내 회의에서 패턴 분석 필요'
          : cplDiff < 0
            ? '✨ 감소! 원내 개선 활동이 효과 보는 중'
            : '변화 없음. 예방형 체크리스트 점검',
        goto: 'complaints',
      })
    }

    // ⭐ 리뷰
    if (Number(rvThis.total) > 0 || Number(rvLast.total) > 0) {
      const rvDiff = Number(rvThis.total) - Number(rvLast.total)
      cards.push({
        icon: '⭐',
        tone: rvDiff >= 0 ? 'up' : 'down',
        key: 'reviews',
        title: '신규 리뷰',
        value: `${rvThis.total}건`,
        change: rvDiff,
        detail: `평균 ${Number(rvThis.avg_r).toFixed(1)}점 (지난주 ${Number(rvLast.avg_r).toFixed(1)}점)`,
        narrative: rvDiff > 0 && Number(rvThis.avg_r) >= 4.5
          ? '🎉 리뷰도 늘고 평점도 높음. 팬 마케팅이 작동 중'
          : rvDiff < 0
            ? '후기 요청 타이밍 점검. 진료 직후 SMS 자동화 켜세요'
            : '평판 관리 지속 필요',
        goto: 'review_mgmt',
      })
    }

    /* ─── 한 줄 요약 (원장님 아침 브리핑용) ─── */
    const topMove = cards
      .filter(c => typeof c.change === 'number' && c.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]

    const unit = topMove ? (
      topMove.key === 'conv_rate' ? '%p'
      : topMove.key === 'complaints' || topMove.key === 'reviews' ? '건'
      : '%'
    ) : ''
    const headline = topMove
      ? `${topMove.icon} ${topMove.title} ${topMove.change >= 0 ? '+' : ''}${topMove.change}${unit} — ${(topMove.narrative || '').split(/[.!?]/)[0].trim()}`
      : '📊 이번주 주요 변화 추적 중'

    return c.json({
      ok: true,
      week: currentWeek,
      range: { start: wk1Start, end: todayStr, prev_start: wk2Start, prev_end: wk1Start },
      headline,
      cards: cards.slice(0, 6),
      summary: {
        revenue: rev,
        newPatients: newP,
        convRate: { cur: convThis, prev: convLast },
        hiddenRevenue: hidden,
        complaints: { cur: Number(cplThis.total), prev: Number(cplLast.total) },
        reviews: { cur: Number(rvThis.total), prev: Number(rvLast.total) },
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || 'weekly_insights_failed', cards: [] }, 500)
  }
})

/**
 * 이번주 브리핑 확인 표시 (대시보드 배너 숨김용)
 * hospitals.settings.weekly_insights_seen[week] = timestamp
 */
insights.post('/weekly/dismiss', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const body = await c.req.json().catch(() => ({}))
  const week = body.week || isoWeek(new Date())

  try {
    const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(hid).first()
    let settings: any = {}
    try { settings = JSON.parse(row?.settings || '{}') } catch {}
    settings.weekly_insights_seen = settings.weekly_insights_seen || {}
    // 사용자별로 기록 (원장/실장 각자 확인)
    const userKey = `${user.userId || user.id}_${week}`
    settings.weekly_insights_seen[userKey] = Date.now()
    // 4주 이상 지난 것은 정리
    const cutoff = Date.now() - 30 * 86400000
    Object.keys(settings.weekly_insights_seen).forEach(k => {
      if (settings.weekly_insights_seen[k] < cutoff) delete settings.weekly_insights_seen[k]
    })
    await c.env.DB.prepare('UPDATE hospitals SET settings=? WHERE id=?').bind(JSON.stringify(settings), hid).run()
    return c.json({ ok: true, week })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500)
  }
})

/**
 * 이번주 확인 여부 체크 (대시보드 로드 시 호출)
 */
insights.get('/weekly/status', requireRole('admin','manager'), async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const week = isoWeek(new Date())

  try {
    const row: any = await c.env.DB.prepare('SELECT settings FROM hospitals WHERE id=?').bind(hid).first()
    let settings: any = {}
    try { settings = JSON.parse(row?.settings || '{}') } catch {}
    const userKey = `${user.userId || user.id}_${week}`
    const seenAt = settings.weekly_insights_seen?.[userKey] || 0
    const today = new Date()
    const dayOfWeek = today.getDay()  // 0=일, 1=월, ...
    // 월요일 9시 이후, 그리고 이번주 아직 안 봤으면 표시
    const shouldShow = !seenAt && (dayOfWeek >= 1 || dayOfWeek === 0)  // 항상 보여줄 수 있음(월~일)
    return c.json({ ok: true, week, seen: seenAt > 0, seenAt, shouldShow, dayOfWeek })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message, shouldShow: false })
  }
})

export default insights
