import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
import { requireRole, sanitizeString } from '../lib/middleware'
const briefing = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ 일일 브리핑 자동 생성 ═══ */

briefing.get('/', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const dateParam = sanitizeString(c.req.query('date') || '', 10)
  const today = dateParam || new Date().toISOString().slice(0, 10)
  const yesterday = new Date(new Date(today + 'T00:00:00').getTime() - 86400000).toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const todayDow = dayNames[new Date(today + 'T00:00:00').getDay()]

  const [
    // 어제 실적
    yesterdayRecord,
    yesterdayTarget,
    // 이번 달 누적
    monthCum,
    monthTarget,
    // 오늘 예약 (treatment_board)
    todayBoard,
    // 컴플레인 (미해결)
    pendingComplaints,
    // 오늘 출근 해야 할 직원
    staffAll,
    todayAttendance,
    // 대기 중 휴가 신청
    pendingLeave,
    // 최근 신환
    recentNewPatients,
    // 이번 달 상담 전환
    monthConsult,
    // 오늘 생일 환자
    birthdayPatients,
    // 미결 칸반
    pendingKanban,
  ] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM daily_records WHERE hospital_id=? AND record_date=?').bind(hid, yesterday).first(),
    c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(hid, yesterday.slice(0, 7)).first(),
    c.env.DB.prepare(`SELECT 
      COUNT(*) as days, SUM(revenue_non_insurance+revenue_insurance) as total_revenue,
      SUM(new_patients) as new_patients, SUM(existing_patients) as existing_patients,
      SUM(total_consultations) as total_consult,
      SUM(inbound_calls) as inbound_calls, SUM(cancel_count) as cancels,
      SUM(complaint_count) as complaints
    FROM daily_records WHERE hospital_id=? AND record_date LIKE ?`).bind(hid, thisMonth + '%').first(),
    c.env.DB.prepare('SELECT * FROM kpi_targets WHERE hospital_id=? AND year_month=?').bind(hid, thisMonth).first(),
    c.env.DB.prepare(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status='in_treatment' THEN 1 ELSE 0 END) as in_treatment,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
    FROM treatment_board WHERE hospital_id=? AND board_date=?`).bind(hid, today).first(),
    c.env.DB.prepare("SELECT id, complaint_date, patient_name, part, category, severity, description FROM complaints WHERE hospital_id=? AND status IN ('pending','in_progress') ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, complaint_date DESC LIMIT 10").bind(hid).all(),
    c.env.DB.prepare("SELECT id, name, role, position, team, work_schedule, is_doctor FROM users WHERE hospital_id=? AND is_active=1 AND work_status='active'").bind(hid).all(),
    c.env.DB.prepare("SELECT user_id, check_in FROM attendance WHERE hospital_id=? AND date=?").bind(hid, today).all(),
    c.env.DB.prepare("SELECT lr.id, lr.start_date, lr.end_date, lr.leave_type, lr.days, u.name FROM leave_requests lr JOIN users u ON lr.user_id=u.id WHERE lr.hospital_id=? AND lr.status='pending' ORDER BY lr.start_date LIMIT 10").bind(hid).all(),
    c.env.DB.prepare("SELECT patient_name, chart_number, visit_source, treatment_area, first_visit_date FROM patients WHERE hospital_id=? AND status='active' AND first_visit_date>=? ORDER BY first_visit_date DESC LIMIT 10").bind(hid, new Date(new Date(today + 'T00:00:00').getTime() - 7 * 86400000).toISOString().slice(0, 10)).all(),
    c.env.DB.prepare(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed,
      COALESCE(SUM(agreed_amount),0) as agreed
    FROM consult_records WHERE hospital_id=? AND record_date LIKE ?`).bind(hid, thisMonth + '%').first(),
    c.env.DB.prepare("SELECT patient_name, phone, birth_date FROM patients WHERE hospital_id=? AND status='active' AND substr(birth_date,6)=? LIMIT 20").bind(hid, today.slice(5)).all(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM kanban_cards WHERE hospital_id=? AND status!='completed'").bind(hid).first(),
  ])

  // 어제 실적 가공
  const yr = (yesterdayRecord || {}) as any
  const yesterdayRevenue = (yr.revenue_non_insurance || 0) + (yr.revenue_insurance || 0)
  const yt = (yesterdayTarget || {}) as any

  // 이번 달 누적
  const mc = (monthCum || {}) as any
  const mt = (monthTarget || {}) as any
  const monthAchieveRate = mt.target_revenue > 0 ? Math.round((mc.total_revenue || 0) / mt.target_revenue * 1000) / 10 : 0

  // 출근 계산
  const dowKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(today + 'T00:00:00').getDay()]
  const attMap = new Set((todayAttendance?.results || []).map((a: any) => a.user_id))
  let shouldWork = 0, presentCount = 0
  for (const s of (staffAll?.results || []) as any[]) {
    let ws: any = {}; try { ws = JSON.parse(s.work_schedule || '{}') } catch (e) { }
    if (ws[dowKey]) { shouldWork++; if (attMap.has(s.id)) presentCount++ }
  }

  // 상담 전환
  const mcon = (monthConsult || {}) as any
  const confirmRate = mcon.total > 0 ? Math.round((mcon.confirmed || 0) / mcon.total * 1000) / 10 : 0

  // 알림 items
  const alerts: Array<{ type: string; priority: string; message: string }> = []

  // 미해결 컴플레인
  const pc = pendingComplaints?.results || []
  if (pc.length > 0) {
    const critical = pc.filter((c: any) => c.severity === 'critical' || c.severity === 'high')
    if (critical.length > 0) alerts.push({ type: 'complaint', priority: 'high', message: `긴급 컴플레인 ${critical.length}건 미해결 (${critical.map((c: any) => c.patient_name).join(', ')})` })
    else alerts.push({ type: 'complaint', priority: 'medium', message: `미해결 컴플레인 ${pc.length}건` })
  }

  // 휴가 대기
  if ((pendingLeave?.results || []).length > 0) {
    alerts.push({ type: 'leave', priority: 'medium', message: `승인 대기 휴가 ${pendingLeave!.results.length}건 (${(pendingLeave!.results as any[]).map(l => l.name).join(', ')})` })
  }

  // 생일 환자
  if ((birthdayPatients?.results || []).length > 0) {
    alerts.push({ type: 'birthday', priority: 'low', message: `오늘 생일 환자 ${birthdayPatients!.results.length}명 🎂 (${(birthdayPatients!.results as any[]).map(p => p.patient_name).join(', ')})` })
  }

  // 미결 칸반
  const kanbanCount = (pendingKanban as any)?.c || 0
  if (kanbanCount > 5) {
    alerts.push({ type: 'kanban', priority: 'low', message: `미완료 업무 ${kanbanCount}건 (구매/수리 요청)` })
  }

  // 전환율 낮으면 경고
  if (mcon.total >= 5 && confirmRate < 40) {
    alerts.push({ type: 'consult', priority: 'high', message: `이번 달 상담 전환율 ${confirmRate}% — 목표(60%) 미달` })
  }

  return c.json({
    date: today,
    dayOfWeek: todayDow,
    generatedAt: new Date().toISOString(),

    yesterday: {
      date: yesterday,
      revenue: yesterdayRevenue,
      nonInsurance: yr.revenue_non_insurance || 0,
      insurance: yr.revenue_insurance || 0,
      newPatients: yr.new_patients || 0,
      existingPatients: yr.existing_patients || 0,
      consultations: yr.total_consultations || 0,
      inboundCalls: yr.inbound_calls || 0,
      cancels: yr.cancel_count || 0,
      complaints: yr.complaint_count || 0,
      naverReviews: yr.naver_reviews || 0,
      hasData: !!yesterdayRecord,
    },

    monthCumulative: {
      month: thisMonth,
      days: mc.days || 0,
      totalRevenue: mc.total_revenue || 0,
      newPatients: mc.new_patients || 0,
      existingPatients: mc.existing_patients || 0,
      target: mt.target_revenue || 0,
      achieveRate: monthAchieveRate,
      totalConsult: mc.total_consult || 0,
      cancels: mc.cancels || 0,
      complaints: mc.complaints || 0,
    },

    today: {
      boardTotal: (todayBoard as any)?.total || 0,
      waiting: (todayBoard as any)?.waiting || 0,
      inTreatment: (todayBoard as any)?.in_treatment || 0,
      completed: (todayBoard as any)?.completed || 0,
    },

    attendance: {
      shouldWork,
      present: presentCount,
      rate: shouldWork > 0 ? Math.round(presentCount / shouldWork * 100) : 0,
    },

    consult: {
      monthTotal: mcon.total || 0,
      monthConfirmed: mcon.confirmed || 0,
      confirmRate,
      monthAgreed: mcon.agreed || 0,
    },

    alerts,
    pendingComplaints: pc.slice(0, 5),
    recentNewPatients: recentNewPatients?.results || [],
    pendingLeaveRequests: pendingLeave?.results || [],
    birthdayPatients: birthdayPatients?.results || [],
  })
})

export default briefing
