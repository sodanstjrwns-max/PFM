import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/*
 * ═══ Dashboard (Optimized) ═══
 * BEFORE: 21 separate DB queries per request
 * AFTER:  8 batched queries (down from 21)
 * Reduces D1 read units by ~62%
 */
dashboard.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0,7)
  const dayOfWeek = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]

  const [
    contentCounts,     // Q1: materials, pricing, cases, images, posts (5→1)
    hireCounts,        // Q2: kanban, jobs, applicants (3→1)
    tbResult,          // Q3: Treatment board all stats (4→1)
    csResult,          // Q4: Consultation all stats (4→1)
    staffAll,          // Q5: Staff list
    attendanceAndChairs, // Q6: Attendance + chairs + busy chairs
    funnelCounts,      // Q7: Funnel stage counts
    imgCountResult,    // Q8: Case images (JOIN 서브쿼리라 별도)
  ] = await Promise.all([
    // Q1: Content counts (5→1 using UNION ALL)
    c.env.DB.prepare(`
      SELECT 'materials' as k, COUNT(*) as v FROM materials WHERE hospital_id=? OR hospital_id IS NULL
      UNION ALL SELECT 'pricing', COUNT(*) FROM fee_items WHERE hospital_id=?
      UNION ALL SELECT 'cases', COUNT(*) FROM cases WHERE hospital_id=?
      UNION ALL SELECT 'posts', COUNT(*) FROM posts WHERE hospital_id=?
    `).bind(hid, hid, hid, hid).all(),

    // Q2: Hire/kanban counts (3→1 using UNION ALL)
    c.env.DB.prepare(`
      SELECT 'pendingTasks' as k, COUNT(*) as v FROM kanban_cards WHERE hospital_id=? AND status!='completed'
      UNION ALL SELECT 'upcomingInterviews', COUNT(*) FROM interviews WHERE hospital_id=? AND status='scheduled' AND scheduled_at >= datetime('now')
      UNION ALL SELECT 'activeApplicants', COUNT(*) FROM applicants WHERE hospital_id=? AND status NOT IN ('hired','rejected','withdrawn')
    `).bind(hid, hid, hid).all(),

    // Q3: Treatment board — single query with conditional aggregation (4→1)
    // total = 전체 환자 수 (모든 상태 포함)
    // waiting = 대기(waiting) + 도착(arrived) + 체어착석(seating) 통합
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('waiting','arrived','seating') THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status='doctor_needed' THEN 1 ELSE 0 END) as doctor_needed,
        SUM(CASE WHEN status='in_treatment' THEN 1 ELSE 0 END) as in_treatment,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
      FROM treatment_board WHERE hospital_id=? AND board_date=?
    `).bind(hid, today).first(),

    // Q4: Consultation stats — single query with conditional aggregation (4→1)
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('agreed','payment','treatment','completed') THEN 1 ELSE 0 END) as agreed,
        COALESCE(SUM(CASE WHEN paid_amount IS NOT NULL THEN paid_amount ELSE 0 END),0) as paid,
        SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END) as lost
      FROM consultations WHERE hospital_id=? AND consultation_date LIKE ?
    `).bind(hid, thisMonth+'%').first(),

    // Q5: Staff (needed for attendance processing)
    c.env.DB.prepare("SELECT id, name, role, position, team, is_doctor, work_schedule FROM users WHERE hospital_id=? AND is_active=1").bind(hid).all(),

    // Q6: Attendance + chairs + busy chairs
    Promise.all([
      c.env.DB.prepare("SELECT user_id, check_in FROM attendance WHERE hospital_id=? AND date=?").bind(hid, today).all(),
      c.env.DB.prepare("SELECT id, chair_number FROM chairs WHERE hospital_id=? AND is_active=1").bind(hid).all(),
      c.env.DB.prepare("SELECT chair_id FROM treatment_board WHERE hospital_id=? AND board_date=? AND status IN ('in_treatment','doctor_needed','waiting')").bind(hid, today).all(),
    ]),

    // Q7: Funnel stage counts
    c.env.DB.prepare("SELECT current_stage, COUNT(*) as c FROM patient_funnel WHERE hospital_id=? GROUP BY current_stage").bind(hid).all(),

    // Q8: Case images count (JOIN 서브쿼리 — v5.6.1: 직렬 await 제거, 병렬로 통합)
    c.env.DB.prepare('SELECT COUNT(*) as c FROM case_images ci JOIN cases cs ON ci.case_id=cs.id WHERE cs.hospital_id=?').bind(hid).first<{ c: number }>(),
  ])

  // Parse content counts
  const cm: Record<string, number> = {}
  for (const r of (contentCounts?.results || []) as any[]) { cm[r.k] = r.v }
  // Parse hire counts
  for (const r of (hireCounts?.results || []) as any[]) { cm[r.k] = r.v }

  const tb = (tbResult || {}) as any
  const cs = (csResult || {}) as any
  const [attendanceToday, chairAll, tbWaiting] = attendanceAndChairs

  // Process staff attendance
  const attendMap: Record<string, boolean> = {}
  for (const a of (attendanceToday?.results||[]) as any[]) { if (a.check_in) attendMap[a.user_id] = true }
  const staffSummary = { total: 0, present: 0, doctors: 0, doctorsPresent: 0 }
  for (const s of (staffAll?.results||[]) as any[]) {
    let ws: any = {}; try { ws = JSON.parse(s.work_schedule||'{}') } catch(e) {}
    if (!ws[dayOfWeek]) continue
    staffSummary.total++
    if (s.is_doctor) staffSummary.doctors++
    if (attendMap[s.id]) { staffSummary.present++; if (s.is_doctor) staffSummary.doctorsPresent++ }
  }

  // Process chair usage
  const busyChairs = new Set((tbWaiting?.results||[]).map((r: any) => r.chair_id))
  const totalChairs = (chairAll?.results||[]).length
  const chairSummary = { total: totalChairs, busy: busyChairs.size, available: totalChairs - busyChairs.size }

  // Process funnel
  const funnelMap: any = {}
  for (const r of (funnelCounts?.results||[]) as any[]) { funnelMap[r.current_stage] = r.c }

  return c.json({
    materials: cm.materials||0, pricing: cm.pricing||0, cases: cm.cases||0, caseImages: imgCountResult?.c||0,
    posts: cm.posts||0, pendingTasks: cm.pendingTasks||0,
    upcomingInterviews: cm.upcomingInterviews||0, activeApplicants: cm.activeApplicants||0,
    todayPatients: tb.total||0,
    waiting: tb.waiting||0,  // waiting + arrived + seating 통합
    doctorNeeded: tb.doctor_needed||0,
    inTreatment: tb.in_treatment||0,
    completedToday: tb.completed||0,
    monthConsultations: cs.total||0, monthAgreed: cs.agreed||0,
    monthPaid: cs.paid||0, monthLost: cs.lost||0,
    conversionRate: (cs.total||0) > 0 ? Math.round((cs.agreed||0)/(cs.total||0)*100) : 0,
    staff: staffSummary, chairs: chairSummary, funnel: funnelMap,
  })
})

/*
 * ═══ Weekly/Monthly Management Report ═══
 * Aggregates KPI, consult, patient, call, complaint data into a single report
 * ?period=week|month  &date=2026-03-28 (anchor date)
 */
dashboard.get('/dashboard/report', async (c) => {
  const user = c.get('user')!
  if (user.role !== 'admin' && user.role !== 'manager') return c.json({ error: '권한이 없습니다' }, 403)
  const hid = user.hospitalId
  const period = (c.req.query('period') || 'week') === 'month' ? 'month' : 'week'
  const anchorDate = c.req.query('date') || new Date().toISOString().slice(0, 10)

  // Calculate date range
  let fromDate: string, toDate: string, label: string
  if (period === 'month') {
    const ym = anchorDate.slice(0, 7)
    fromDate = ym + '-01'
    const y = parseInt(ym.slice(0, 4)), m = parseInt(ym.slice(5, 7))
    toDate = ym + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0')
    label = ym
  } else {
    // ISO week: mon-sun containing anchorDate
    const d = new Date(anchorDate + 'T00:00:00')
    const day = d.getDay() || 7 // mon=1 ... sun=7
    const mon = new Date(d); mon.setDate(d.getDate() - day + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    fromDate = mon.toISOString().slice(0, 10)
    toDate = sun.toISOString().slice(0, 10)
    label = fromDate + ' ~ ' + toDate
  }

  // Previous period for comparison
  let prevFrom: string, prevTo: string
  if (period === 'month') {
    const y = parseInt(fromDate.slice(0, 4)), m = parseInt(fromDate.slice(5, 7))
    const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y
    const pym = `${py}-${String(pm).padStart(2, '0')}`
    prevFrom = pym + '-01'
    prevTo = pym + '-' + String(new Date(py, pm, 0).getDate()).padStart(2, '0')
  } else {
    const d = new Date(fromDate + 'T00:00:00')
    d.setDate(d.getDate() - 7)
    prevFrom = d.toISOString().slice(0, 10)
    const d2 = new Date(prevFrom); d2.setDate(d2.getDate() + 6)
    prevTo = d2.toISOString().slice(0, 10)
  }

  const [
    revenueResult,     // KPI: revenue, patients
    prevRevenueResult,
    consultResult,     // Consult: confirm rate
    prevConsultResult,
    newPatientsResult, // Patient stats
    prevNewPatientsResult,
    callResult,        // Call stats
    complaintResult,   // Complaint stats
    funnelResult,      // Funnel stage changes
    topDoctors,        // Doctor performance
    topCounselors,     // Counselor performance
    staffCount,
  ] = await Promise.all([
    // Current period revenue
    c.env.DB.prepare(`SELECT
      COALESCE(SUM(revenue_non_insurance),0) as non_ins,
      COALESCE(SUM(revenue_insurance),0) as ins,
      COALESCE(SUM(new_patients),0) as new_pat,
      COALESCE(SUM(existing_patients),0) as existing_pat,
      COUNT(*) as days_recorded
    FROM daily_records WHERE hospital_id=? AND record_date>=? AND record_date<=?`).bind(hid, fromDate, toDate).first(),
    // Previous period revenue
    c.env.DB.prepare(`SELECT
      COALESCE(SUM(revenue_non_insurance),0) as non_ins,
      COALESCE(SUM(revenue_insurance),0) as ins,
      COALESCE(SUM(new_patients),0) as new_pat,
      COALESCE(SUM(existing_patients),0) as existing_pat
    FROM daily_records WHERE hospital_id=? AND record_date>=? AND record_date<=?`).bind(hid, prevFrom, prevTo).first(),
    // Current consult stats
    c.env.DB.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed,
      COALESCE(SUM(planned_amount),0) as planned,
      COALESCE(SUM(agreed_amount),0) as agreed
    FROM consult_records WHERE hospital_id=? AND record_date>=? AND record_date<=?`).bind(hid, fromDate, toDate).first(),
    // Previous consult stats
    c.env.DB.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed,
      COALESCE(SUM(agreed_amount),0) as agreed
    FROM consult_records WHERE hospital_id=? AND record_date>=? AND record_date<=?`).bind(hid, prevFrom, prevTo).first(),
    // Current new patients registered
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active' AND created_at>=? AND created_at<=?`).bind(hid, fromDate, toDate + ' 23:59:59').first(),
    // Previous new patients
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM patients WHERE hospital_id=? AND status='active' AND created_at>=? AND created_at<=?`).bind(hid, prevFrom, prevTo + ' 23:59:59').first(),
    // Calls
    c.env.DB.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN call_type='inbound' THEN 1 ELSE 0 END) as inbound,
      SUM(CASE WHEN call_type='outbound' THEN 1 ELSE 0 END) as outbound,
      SUM(CASE WHEN reservation_status='reserved' THEN 1 ELSE 0 END) as reserved
    FROM call_records WHERE hospital_id=? AND call_date>=? AND call_date<=?`).bind(hid, fromDate, toDate).first(),
    // Complaints
    c.env.DB.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN severity IN ('high','critical') THEN 1 ELSE 0 END) as severe
    FROM complaints WHERE hospital_id=? AND complaint_date>=? AND complaint_date<=?`).bind(hid, fromDate, toDate).first(),
    // Funnel
    c.env.DB.prepare(`SELECT current_stage, COUNT(*) as c FROM patient_funnel WHERE hospital_id=? GROUP BY current_stage`).bind(hid).first() === null ? c.env.DB.prepare(`SELECT current_stage, COUNT(*) as c FROM patient_funnel WHERE hospital_id=? GROUP BY current_stage`).bind(hid).all() : c.env.DB.prepare(`SELECT current_stage, COUNT(*) as c FROM patient_funnel WHERE hospital_id=? GROUP BY current_stage`).bind(hid).all(),
    // Top doctors by consult volume
    c.env.DB.prepare(`SELECT doctor_name as name, COUNT(*) as total,
      SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed,
      COALESCE(SUM(agreed_amount),0) as agreed
    FROM consult_records WHERE hospital_id=? AND record_date>=? AND record_date<=? AND doctor_name!=''
    GROUP BY doctor_name ORDER BY total DESC LIMIT 5`).bind(hid, fromDate, toDate).all(),
    // Top counselors
    c.env.DB.prepare(`SELECT counselor_name as name, COUNT(*) as total,
      SUM(CASE WHEN treatment_confirmed='O' THEN 1 ELSE 0 END) as confirmed,
      COALESCE(SUM(agreed_amount),0) as agreed
    FROM consult_records WHERE hospital_id=? AND record_date>=? AND record_date<=? AND counselor_name!=''
    GROUP BY counselor_name ORDER BY total DESC LIMIT 5`).bind(hid, fromDate, toDate).all(),
    // Staff count
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM users WHERE hospital_id=? AND is_active=1`).bind(hid).first(),
  ])

  const rev = (revenueResult || {}) as any
  const prevRev = (prevRevenueResult || {}) as any
  const con = (consultResult || {}) as any
  const prevCon = (prevConsultResult || {}) as any
  const call = (callResult || {}) as any
  const comp = (complaintResult || {}) as any

  const totalRevenue = (rev.non_ins || 0) + (rev.ins || 0)
  const prevTotalRevenue = (prevRev.non_ins || 0) + (prevRev.ins || 0)
  const confirmRate = con.total > 0 ? Math.round((con.confirmed || 0) / con.total * 1000) / 10 : 0
  const prevConfirmRate = prevCon.total > 0 ? Math.round((prevCon.confirmed || 0) / prevCon.total * 1000) / 10 : 0

  const pctChange = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round((cur - prev) / prev * 1000) / 10

  // Funnel map
  const funnelMap: Record<string, number> = {}
  for (const r of ((funnelResult as any)?.results || []) as any[]) { funnelMap[r.current_stage] = r.c }

  return c.json({
    period, label, fromDate, toDate,
    prevLabel: prevFrom + ' ~ ' + prevTo,

    // 매출
    revenue: {
      total: totalRevenue,
      nonInsurance: rev.non_ins || 0,
      insurance: rev.ins || 0,
      change: pctChange(totalRevenue, prevTotalRevenue),
      prevTotal: prevTotalRevenue,
    },

    // 환자
    patients: {
      newFromKPI: rev.new_pat || 0,
      existing: rev.existing_pat || 0,
      totalVisits: (rev.new_pat || 0) + (rev.existing_pat || 0),
      registered: (newPatientsResult as any)?.c || 0,
      prevRegistered: (prevNewPatientsResult as any)?.c || 0,
      daysRecorded: rev.days_recorded || 0,
    },

    // 상담
    consult: {
      total: con.total || 0,
      confirmed: con.confirmed || 0,
      confirmRate,
      planned: con.planned || 0,
      agreed: con.agreed || 0,
      discountRate: con.planned > 0 ? Math.round((1 - (con.agreed || 0) / con.planned) * 1000) / 10 : 0,
      prevTotal: prevCon.total || 0,
      prevConfirmRate,
      change: pctChange(con.total || 0, prevCon.total || 0),
    },

    // 콜
    calls: {
      total: call.total || 0,
      inbound: call.inbound || 0,
      outbound: call.outbound || 0,
      reservationRate: call.total > 0 ? Math.round((call.reserved || 0) / call.total * 1000) / 10 : 0,
    },

    // 컴플레인
    complaints: {
      total: comp.total || 0,
      resolved: comp.resolved || 0,
      severe: comp.severe || 0,
      resolveRate: comp.total > 0 ? Math.round((comp.resolved || 0) / comp.total * 1000) / 10 : 0,
    },

    // 퍼널
    funnel: funnelMap,

    // 성과 TOP
    topDoctors: (topDoctors?.results || []).map((d: any) => ({
      name: d.name,
      total: d.total,
      confirmed: d.confirmed,
      rate: d.total > 0 ? Math.round(d.confirmed / d.total * 1000) / 10 : 0,
      agreed: d.agreed,
    })),
    topCounselors: (topCounselors?.results || []).map((d: any) => ({
      name: d.name,
      total: d.total,
      confirmed: d.confirmed,
      rate: d.total > 0 ? Math.round(d.confirmed / d.total * 1000) / 10 : 0,
      agreed: d.agreed,
    })),

    staffTotal: (staffCount as any)?.c || 0,
    generatedAt: new Date().toISOString(),
  })
})

export default dashboard
