import { Hono } from 'hono'
import type { Bindings, Variables } from '../lib/types'
const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>()

dashboard.get('/dashboard', async (c) => {
  const user = c.get('user')!
  const hid = user.hospitalId
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0,7)
  const dayOfWeek = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
  const [matCount, prcCount, caseCount, imgCount, postCount, kanbanCount, hireCount, applicantCount, tbTotal, tbDoctorNeeded, tbInTreatment, tbCompleted, csTotal, csAgreed, csPaid, csLost, staffAll, attendanceToday, chairAll, tbWaiting, funnelCounts] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM materials WHERE hospital_id=? OR hospital_id IS NULL').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM pricing WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM cases WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM case_images ci JOIN cases cs ON ci.case_id=cs.id WHERE cs.hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM posts WHERE hospital_id=?').bind(hid).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM kanban_cards WHERE hospital_id=? AND status!='completed'").bind(hid).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM job_postings WHERE hospital_id=? AND status='open'").bind(hid).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM applicants WHERE hospital_id=? AND status NOT IN ('hired','rejected','withdrawn')").bind(hid).first<{ c: number }>(),
    // 진료보드
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=?").bind(hid, today).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=? AND status='doctor_needed'").bind(hid, today).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=? AND status='in_treatment'").bind(hid, today).first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM treatment_board WHERE hospital_id=? AND board_date=? AND status='completed'").bind(hid, today).first<{ c: number }>(),
    // 상담관리 (이번 달)
    c.env.DB.prepare("SELECT COUNT(*) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ?").bind(hid, thisMonth+'%').first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ? AND status IN ('agreed','payment','treatment','completed')").bind(hid, thisMonth+'%').first<{ c: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(paid_amount),0) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ? AND paid_amount IS NOT NULL").bind(hid, thisMonth+'%').first<{ c: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as c FROM consultations WHERE hospital_id=? AND consultation_date LIKE ? AND status='lost'").bind(hid, thisMonth+'%').first<{ c: number }>(),
    // 직원 현황
    c.env.DB.prepare("SELECT id, name, role, position, team, is_doctor, work_schedule FROM users WHERE hospital_id=? AND is_active=1").bind(hid).all(),
    c.env.DB.prepare("SELECT user_id, check_in, check_out FROM attendance WHERE hospital_id=? AND date=?").bind(hid, today).all(),
    // 체어 현황
    c.env.DB.prepare("SELECT id, chair_number, floor, room_name FROM chairs WHERE hospital_id=? AND is_active=1 ORDER BY sort_order, chair_number").bind(hid).all(),
    c.env.DB.prepare("SELECT chair_id FROM treatment_board WHERE hospital_id=? AND board_date=? AND status IN ('in_treatment','doctor_needed','waiting')").bind(hid, today).all(),
    // 퍼널 현황
    c.env.DB.prepare("SELECT current_stage, COUNT(*) as c FROM patient_funnel WHERE hospital_id=? GROUP BY current_stage").bind(hid).all(),
  ])

  // 직원 출근 현황 가공
  const attendMap: any = {}
  ;(attendanceToday?.results||[]).forEach((a: any) => { attendMap[a.user_id] = a })
  const staffSummary = { total: 0, present: 0, doctors: 0, doctorsPresent: 0 }
  ;(staffAll?.results||[]).forEach((s: any) => {
    let ws: any = {}; try { ws = JSON.parse(s.work_schedule||'{}') } catch(e) {}
    const scheduledToday = !!ws[dayOfWeek]
    if (!scheduledToday) return
    staffSummary.total++
    if (s.is_doctor) staffSummary.doctors++
    if (attendMap[s.id]?.check_in) { staffSummary.present++; if (s.is_doctor) staffSummary.doctorsPresent++ }
  })

  // 체어 사용 현황
  const busyChairs = new Set((tbWaiting?.results||[]).map((r: any) => r.chair_id))
  const chairSummary = { total: (chairAll?.results||[]).length, busy: busyChairs.size, available: (chairAll?.results||[]).length - busyChairs.size }

  // 퍼널 현황
  const funnelMap: any = {}
  ;(funnelCounts?.results||[]).forEach((r: any) => { funnelMap[r.current_stage] = r.c })

  return c.json({
    materials: matCount?.c||0, pricing: prcCount?.c||0, cases: caseCount?.c||0, caseImages: imgCount?.c||0,
    posts: postCount?.c||0, pendingTasks: kanbanCount?.c||0,
    openJobs: hireCount?.c||0, activeApplicants: applicantCount?.c||0,
    todayPatients: tbTotal?.c||0, doctorNeeded: tbDoctorNeeded?.c||0,
    inTreatment: tbInTreatment?.c||0, completedToday: tbCompleted?.c||0,
    monthConsultations: csTotal?.c||0, monthAgreed: csAgreed?.c||0,
    monthPaid: csPaid?.c||0, monthLost: csLost?.c||0,
    conversionRate: (csTotal?.c||0) > 0 ? Math.round((csAgreed?.c||0)/(csTotal?.c||0)*100) : 0,
    staff: staffSummary, chairs: chairSummary, funnel: funnelMap,
  })
})


export default dashboard
