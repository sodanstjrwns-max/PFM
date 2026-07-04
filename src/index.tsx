import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, Variables } from './lib/types'
import { authMiddleware, securityHeaders, sanitizeString, safeJsonParse } from './lib/middleware'
import { apiCacheMiddleware } from './lib/middleware'
import { hashPassword, verifyPassword } from './lib/crypto'

// Route imports
import auth from './routes/auth'
import hr from './routes/hr'
import materials from './routes/materials'
import community from './routes/community'
import clinical from './routes/clinical'
import consult from './routes/consult'
import leave from './routes/leave'
import meetings from './routes/meetings'
import fee from './routes/fee'
import funnel from './routes/funnel'
import kpi from './routes/kpi'
import calls from './routes/calls'
import patients from './routes/patients'
import hire from './routes/hire'
import hospital from './routes/hospital'
import complaints from './routes/complaints'
import operations from './routes/operations'
import dashboard from './routes/dashboard'
import surveys from './routes/surveys'
import briefing from './routes/briefing'
import gamification from './routes/gamification'
import reviewMgmt from './routes/review-management'
import chat from './routes/chat'
import onboarding from './routes/onboarding'
import admin from './routes/admin'
import recall from './routes/recall'
import push from './routes/push'
import kakao from './routes/kakao'
import reports from './routes/reports'
import feedbackRoute from './routes/feedback'
import insightsRoute from './routes/insights'
import pfIndexRoute from './routes/pf-index'
import knowledgeRoute from './routes/knowledge'
import referralsRoute from './routes/referrals'
import aiRoute from './routes/ai'
import billing, { billingPublic } from './routes/billing'
import { getPricingHTML, getLegalHTML } from './pages/pricing'
// ─── Patient Chat 통합 v5.5.0 Phase B ───
import messengerChannelsRoute from './routes/messenger/channels'
import messengerMessagesRoute from './routes/messenger/messages'
import messengerPollRoute from './routes/messenger/poll'
import messengerInitRoute from './routes/messenger/init'
import messengerPatientThreadsRoute from './routes/messenger/patient-threads'
import messengerUrgentRoute from './routes/messenger/urgent'
import messengerEscalationsRoute from './routes/messenger/escalations'
import messengerAttachmentsRoute from './routes/messenger/attachments'
import messengerThreadAIRoute from './routes/messenger/thread-ai'
import messengerDirectoryRoute from './routes/messenger/directory'
import messengerNotificationsRoute from './routes/messenger/notifications'
import messengerQuickRepliesRoute from './routes/messenger/quick-replies'
import messengerScheduledRoute from './routes/messenger/scheduled'
import messengerOpsRoute from './routes/messenger/ops'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ Global Error Handler with DB Logging (#19) ═══ */
app.onError(async (err, c) => {
  const isDbError = err.message?.includes('D1_ERROR') || err.message?.includes('SQLITE')
  const status = isDbError ? 503 : 500
  const label = isDbError ? 'DB_ERROR' : 'SERVER_ERROR'
  console.error(`[${label}] ${c.req.method} ${c.req.path}:`, err.message)
  
  // Async error logging to D1 (fire-and-forget)
  try {
    const user = (c as any).get?.('user')
    c.env.DB.prepare(
      'INSERT INTO error_logs (hospital_id, user_id, level, source, message, stack, path, method, user_agent, ip) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      user?.hospitalId || null, user?.id || null, 'error', label,
      (err.message || '').slice(0, 2000), (err.stack || '').slice(0, 5000),
      c.req.path.slice(0, 500), c.req.method,
      (c.req.header('user-agent') || '').slice(0, 500),
      c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || ''
    ).run().catch(() => {}) // Silently fail
  } catch {}
  
  return c.json({
    error: isDbError ? '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : '서버 오류가 발생했습니다',
    ...(c.env.JWT_SECRET ? {} : { detail: err.message })
  }, status)
})

/* ═══ 404 Handler ═══ */
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: '요청하신 API를 찾을 수 없습니다', path: c.req.path }, 404)
  }
  return c.html(getHTML())
})

/* ═══ Security Headers ═══ */
securityHeaders(app as any)

/* ═══ CORS Configuration ═══ */
const ALLOWED_ORIGINS = [
  'https://patient-funnel-manager.pages.dev',
  /^https:\/\/[a-z0-9-]+\.patient-funnel-manager\.pages\.dev$/,  // Preview deployments
]
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return origin // Server-to-server
    // Dev environments
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
    if (origin.includes('sandbox.novita.ai') || origin.includes('.e2b.dev')) return origin
    // Production whitelist
    for (const allowed of ALLOWED_ORIGINS) {
      if (typeof allowed === 'string' && origin === allowed) return origin
      if (allowed instanceof RegExp && allowed.test(origin)) return origin
    }
    console.warn(`[CORS] Blocked origin: ${origin}`)
    return undefined as any // Block
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
  credentials: true,
}))

/* ═══ Auth Middleware ═══ */
authMiddleware(app as any)

/* ═══ API Cache Middleware ═══ */
apiCacheMiddleware(app as any)

/* ═══ Admin-only password reset (JWT protected) ═══ */
app.post('/api/protected/admin/reset-pw', async (c) => {
  const user = (c as any).get('user')!
  if (user.role !== 'admin') return c.json({ error: '관리자만 사용할 수 있습니다' }, 403)
  const { email, newPassword } = await c.req.json()
  if (!email || !newPassword || newPassword.length < 6) return c.json({ error: '이메일과 비밀번호(6자 이상)를 입력하세요' }, 400)
  const hash = await hashPassword(newPassword)
  const result = await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE email = ? AND hospital_id = ?').bind(hash, email, user.hospitalId).run()
  if (!result.meta.changes) return c.json({ error: '해당 이메일의 사용자를 찾을 수 없습니다' }, 404)
  return c.json({ success: true, message: '비밀번호가 변경되었습니다' })
})

/* ═══ Cron Endpoint (v5.5.1) ═══
 * 외부 스케줄러(전용 cron Worker 또는 GitHub Actions 등)가 5분마다 호출.
 * 접속자가 없어도 예약 발송 + 에스컬레이션 스캔이 보장됨.
 * 인증: Authorization: Bearer <CRON_SECRET>  (secret 미설정 시 503 — 실수로 열리지 않음)
 */
app.post('/api/cron/tick', async (c) => {
  const secret = c.env.CRON_SECRET
  if (!secret) return c.json({ error: 'CRON_SECRET 미설정 — wrangler pages secret put CRON_SECRET' }, 503)
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${secret}`) return c.json({ error: 'unauthorized' }, 401)

  const results: Record<string, any> = {}

  // 1) 예약 메시지 전체 발송 (접속자 무관)
  try {
    const { dispatchAllDue } = await import('./routes/messenger/scheduled')
    results.scheduled = await dispatchAllDue(c.env.DB)
  } catch (e: any) {
    results.scheduled = { error: (e?.message || 'unknown').slice(0, 200) }
  }

  // 2) 전 병원 에스컬레이션 스캔 (활성 병원만 — 최근 24h 내 confirm-required 메시지 존재)
  try {
    const { scanAndEscalate } = await import('./lib/escalation-engine')
    const hospitals = await c.env.DB.prepare(`
      SELECT DISTINCT ch.hospital_id
      FROM messages m JOIN channels ch ON ch.id = m.channel_id
      WHERE m.confirm_required = 1 AND m.is_deleted = 0
        AND m.created_at > datetime('now', '-24 hours')
      LIMIT 100
    `).all<{ hospital_id: string }>()
    let totalTriggered = 0
    for (const h of hospitals.results || []) {
      const t = await scanAndEscalate(c.env.DB, h.hospital_id)
      totalTriggered += t.length
    }
    results.escalations = { hospitals_scanned: (hospitals.results || []).length, triggered: totalTriggered }
  } catch (e: any) {
    results.escalations = { error: (e?.message || 'unknown').slice(0, 200) }
  }

  // 3) 오래된 레이트리밋 행 정리 (하루 1회 수준으로 가볍게)
  try {
    await c.env.DB.prepare(
      `DELETE FROM login_rate_limits WHERE first_attempt_at < datetime('now', '-1 day')`
    ).run()
  } catch { /* 테이블 미존재 무시 */ }

  // 3.5) v5.11 로그 테이블 보존 정책 — 무한 증식 방지 (수백 병원 스케일 대비)
  //      error_logs 90일 / audit_logs 1년 / message_reads 는 메시지 CASCADE 로 자체 관리.
  //      배치당 상한을 둬 단일 tick 이 무거워지지 않게 (다음 tick 이 이어서 처리).
  try {
    const r1 = await c.env.DB.prepare(
      `DELETE FROM error_logs WHERE id IN (SELECT id FROM error_logs WHERE created_at < datetime('now', '-90 days') LIMIT 500)`
    ).run()
    const r2 = await c.env.DB.prepare(
      `DELETE FROM audit_logs WHERE id IN (SELECT id FROM audit_logs WHERE created_at < datetime('now', '-365 days') LIMIT 500)`
    ).run()
    results.log_retention = { error_logs: r1.meta.changes || 0, audit_logs: r2.meta.changes || 0 }
  } catch { /* 테이블 미존재 무시 */ }

  // 4) v5.10: 월 구독 자동 갱신 청구 (TOSS 준비된 경우에만)
  if (c.env.TOSS_SECRET_KEY) {
    try {
      const { chargeRenewals } = await import('./lib/billing')
      results.renewals = await chargeRenewals(c.env.DB, c.env.TOSS_SECRET_KEY)
    } catch (e: any) {
      results.renewals = { error: (e?.message || 'unknown').slice(0, 200) }
    }
  } else {
    results.renewals = { skipped: 'toss_not_configured' }
  }

  // 5) v5.10: 만료된 비밀번호 재설정 토큰 정리
  try {
    await c.env.DB.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < datetime('now', '-1 day')`).run()
  } catch { /* 테이블 미존재 무시 */ }

  return c.json({ success: true, at: new Date().toISOString(), ...results })
})

/* ═══ Route Registration ═══ */
// Auth (public)
app.route('/api/auth', auth)
app.route('/api/billing', billingPublic)  // v5.9 공개 요금제 카탈로그

// Protected routes
app.route('/api/protected/hr', hr)
app.route('/api/protected', materials)       // categories, materials, pricing, cases, files, scripts
app.route('/api/protected', community)       // posts, kanban, staff-supplies, marketing, reviews, checklists, events
app.route('/api/protected', clinical)        // chairs, doctors, treatment-board
app.route('/api/protected/consult-records', consult)
app.route('/api/protected/leave', leave)
app.route('/api/protected/meetings', meetings)
app.route('/api/protected/fee', fee)
app.route('/api/protected/funnel', funnel)
app.route('/api/protected/kpi', kpi)
app.route('/api/protected/calls', calls)
app.route('/api/protected/patients', patients)
app.route('/api/protected/hire', hire)
app.route('/api/protected/hospital', hospital)
app.route('/api/protected/complaints', complaints)
app.route('/api/protected', operations)      // reservations, wait-times, parking
app.route('/api/protected', dashboard)       // dashboard stats
app.route('/api/protected/surveys', surveys) // 설문 CRUD + 발송 + 분석
app.route('/api/protected/briefing', briefing)       // 일일 브리핑
app.route('/api/protected/gamification', gamification) // 게이미피케이션
app.route('/api/protected/review-mgmt', reviewMgmt)   // 리뷰 통합 관리
app.route('/api/protected/chat', chat)               // 원내 메신저
app.route('/api/protected/onboarding', onboarding)  // 온보딩 위저드
app.route('/api/protected/admin', admin)             // 관리자 콘솔/에러로그/데이터내보내기
app.route('/api/protected/recall', recall)           // v3.2 환자 리콜 자동화
app.route('/api/protected/push', push)               // v3.2 Web Push 알림
app.route('/api/protected/kakao', kakao)             // v3.3 카카오 알림톡
app.route('/api/protected/reports', reports)         // v3.3 월간 보고서 내보내기
app.route('/api/protected/feedback', feedbackRoute)   // v3.5 피드백 노트 (상급자↔하급자)
app.route('/api/protected/insights', insightsRoute)   // v3.5 주간 인사이트 브리핑
app.route('/api/protected/pf-index', pfIndexRoute)     // 페이션트 인덱스 (매주 월요일 설문)
app.route('/api/protected/knowledge', knowledgeRoute)  // PF 지식베이스 (원장님 6권 노하우 카드)
app.route('/api/protected/referrals', referralsRoute)  // 소개 트리 시스템 + 팬 등급 자동 분류
app.route('/api/protected/ai', aiRoute)                // v5.4 AI 인사이트 (상담 분석/환자 LTV/벤치마크)
app.route('/api/protected/billing', billing)           // v5.9 구독/결제 (토스페이먼츠)

// ─── Patient Chat 통합 v5.5.0 Phase B — Messenger Core ───
// 모든 메신저 라우트는 `/api/protected/messenger` 한 베이스 아래에 마운트.
// 각 라우트 파일이 자체적으로 sub-path 를 정의 (/init, /me, /poll, /channels/... 등).
//
//   init.ts     → /init, /me, /settings, /me/notifications
//   poll.ts     → /poll, /poll/badge, /poll/presence  (※ 라우트 내부에서 /poll prefix 명시)
//   channels.ts → /channels, /channels/:id, /channels/:id/members,
//                  /channels/:id/typing, /channels/:id/read, /channels/dm,
//                  /channels/users/directory
//   messages.ts → /channels/:id/messages, /messages/:id, /messages/:id/{pin,read,confirm,
//                  reaction,thread,forward,remind,reads}, /search
//
// 등록 순서가 곧 매칭 우선순위 (Hono 는 first-match-wins).
// init/poll/channels 를 messages 보다 먼저 마운트해서 specific path 가 우선되게 함.
app.route('/api/protected/messenger', messengerInitRoute)
app.route('/api/protected/messenger', messengerPollRoute)
app.route('/api/protected/messenger', messengerChannelsRoute)
app.route('/api/protected/messenger', messengerMessagesRoute)
app.route('/api/protected/messenger', messengerPatientThreadsRoute)
app.route('/api/protected/messenger', messengerUrgentRoute)
app.route('/api/protected/messenger', messengerEscalationsRoute)
app.route('/api/protected/messenger', messengerAttachmentsRoute)
app.route('/api/protected/messenger', messengerThreadAIRoute)
app.route('/api/protected/messenger', messengerDirectoryRoute)
app.route('/api/protected/messenger', messengerNotificationsRoute)
app.route('/api/protected/messenger', messengerQuickRepliesRoute)
app.route('/api/protected/messenger', messengerScheduledRoute)
app.route('/api/protected/messenger', messengerOpsRoute)

/* ═══ API Version Alias (#20) ═══ */
// /api/v1/* → /api/* alias for future versioning readiness
app.all('/api/v1/*', async (c) => {
  const newPath = c.req.path.replace('/api/v1/', '/api/')
  const newUrl = new URL(c.req.url)
  newUrl.pathname = newPath
  return fetch(new Request(newUrl.toString(), c.req.raw))
})

/* ═══ Me routes (moved from HR for cleaner API) ═══ */
app.get('/api/protected/me', async (c) => {
  const user = (c as any).get('user')!
  const row: any = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.position, u.team, u.phone, u.hire_date, u.work_schedule, u.work_status, u.is_doctor, u.created_at, h.name as hospital_name FROM users u JOIN hospitals h ON u.hospital_id=h.id WHERE u.id=?`
  ).bind(user.id).first()
  if (!row) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)
  let schedule: any = {}
  try { schedule = JSON.parse(row.work_schedule || '{}') } catch(e) {}
  return c.json({ ...row, work_schedule: schedule })
})

app.put('/api/protected/me', async (c) => {
  const user = (c as any).get('user')!
  const body = await safeJsonParse(c)
  if (!body) return c.json({ error: '잘못된 요청 형식입니다' }, 400)
  const allowed = ['name','phone','work_schedule']
  const fields: string[] = []; const vals: any[] = []
  for (const k of allowed) {
    if (body[k] !== undefined) {
      const v = k === 'work_schedule' && typeof body[k] === 'object' ? JSON.stringify(body[k]) : sanitizeString(String(body[k]), 200)
      fields.push(`${k} = ?`); vals.push(v)
    }
  }
  if (fields.length === 0) return c.json({ error: '변경 사항이 없습니다' }, 400)
  fields.push('updated_at = CURRENT_TIMESTAMP'); vals.push(user.id)
  await c.env.DB.prepare(`UPDATE users SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

app.put('/api/protected/me/password', async (c) => {
  const user = (c as any).get('user')!
  const body = await safeJsonParse(c)
  if (!body) return c.json({ error: '잘못된 요청 형식입니다' }, 400)
  const { currentPassword, newPassword } = body
  if (!currentPassword || !newPassword) return c.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' }, 400)
  if (newPassword.length < 6) return c.json({ error: '새 비밀번호는 6자 이상이어야 합니다' }, 400)
  if (currentPassword === newPassword) return c.json({ error: '현재 비밀번호와 동일합니다' }, 400)
  const row: any = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first()
  if (!row) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)
  const valid = await verifyPassword(currentPassword, row.password_hash)
  if (!valid) return c.json({ error: '현재 비밀번호가 올바르지 않습니다' }, 401)
  const newHash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(newHash, user.id).run()
  return c.json({ success: true, message: '비밀번호가 변경되었습니다' })
})

/* ═══ 공개 설문 API (인증 불필요) ═══ */
app.get('/api/survey/:token', async (c) => {
  const { token } = c.req.param()
  const sanitizedToken = (token || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
  const send: any = await c.env.DB.prepare(
    'SELECT ss.id, ss.survey_id, ss.hospital_id, ss.patient_name, ss.doctor_name, ss.treatment_type, ss.visit_date, ss.status, ss.token, s.title, s.description, s.questions, s.expire_days, ss.created_at FROM survey_sends ss JOIN surveys s ON ss.survey_id=s.id WHERE ss.token=? AND s.is_active=1'
  ).bind(sanitizedToken).first()
  if (!send) return c.json({ error: '유효하지 않은 설문 링크입니다' }, 404)
  if (send.status === 'completed') return c.json({ error: '이미 응답한 설문입니다', completed: true }, 400)
  const createdAt = new Date(send.created_at)
  const expireDate = new Date(createdAt.getTime() + (send.expire_days || 7) * 86400000)
  if (new Date() > expireDate) {
    await c.env.DB.prepare("UPDATE survey_sends SET status='expired', expired_at=? WHERE id=?").bind(new Date().toISOString(), send.id).run()
    return c.json({ error: '설문 기간이 만료되었습니다', expired: true }, 400)
  }
  if (send.status === 'sent' || send.status === 'pending') {
    await c.env.DB.prepare("UPDATE survey_sends SET status='opened', opened_at=? WHERE id=?").bind(new Date().toISOString(), send.id).run()
  }
  const hospital: any = await c.env.DB.prepare('SELECT name FROM hospitals WHERE id=?').bind(send.hospital_id).first()
  let questions: any = []
  try { questions = JSON.parse(send.questions || '[]') } catch(e) {}
  return c.json({
    sendId: send.id, surveyId: send.survey_id, title: send.title, description: send.description,
    questions, patientName: send.patient_name, doctorName: send.doctor_name,
    treatmentType: send.treatment_type, visitDate: send.visit_date,
    hospitalName: hospital?.name || '',
  })
})

app.get('/survey/:token', (c) => {
  return c.html(getSurveyHTML())
})

/* ═══ v5.9 공개 페이지: 요금제 랜딩 + 약관/방침/SLA ═══ */
app.get('/pricing', (c) => c.html(getPricingHTML()))
app.get('/legal/:doc', (c) => {
  const doc = c.req.param('doc')
  if (!['privacy', 'terms', 'sla'].includes(doc)) return c.notFound()
  return c.html(getLegalHTML(doc as 'privacy' | 'terms' | 'sla'))
})

app.post('/api/survey/:token/submit', async (c) => {
  const { token } = c.req.param()
  const sanitizedToken = (token || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
  const send: any = await c.env.DB.prepare(
    'SELECT ss.id, ss.survey_id, ss.hospital_id, ss.status, ss.created_at, s.questions, s.expire_days FROM survey_sends ss JOIN surveys s ON ss.survey_id=s.id WHERE ss.token=?'
  ).bind(sanitizedToken).first()
  if (!send) return c.json({ error: '유효하지 않은 설문 링크입니다' }, 404)
  if (send.status === 'completed') return c.json({ error: '이미 응답한 설문입니다' }, 400)
  const createdAt = new Date(send.created_at)
  const expireDate = new Date(createdAt.getTime() + (send.expire_days || 7) * 86400000)
  if (new Date() > expireDate) return c.json({ error: '설문 기간이 만료되었습니다' }, 400)
  const raw = await c.req.json()
  const answers = raw.answers
  if (!answers || typeof answers !== 'object') return c.json({ error: '응답 데이터가 올바르지 않습니다' }, 400)
  let questions: any[] = []; try { questions = JSON.parse(send.questions || '[]') } catch(e) {}
  const npsQuestion = questions.find((q: any) => q.type === 'nps')
  const npsScore = npsQuestion && answers[npsQuestion.id] !== undefined ? Math.min(10, Math.max(0, parseInt(answers[npsQuestion.id]) || 0)) : null
  const respId = 'sr-' + crypto.randomUUID().slice(0, 8)
  const ua = c.req.header('user-agent') || ''
  await c.env.DB.prepare(
    'INSERT INTO survey_responses (id, send_id, survey_id, hospital_id, answers, nps_score, user_agent) VALUES (?,?,?,?,?,?,?)'
  ).bind(respId, send.id, send.survey_id, send.hospital_id, JSON.stringify(answers), npsScore, ua.slice(0, 500)).run()
  await c.env.DB.prepare("UPDATE survey_sends SET status='completed', completed_at=? WHERE id=?").bind(new Date().toISOString(), send.id).run()
  const statsRow: any = await c.env.DB.prepare('SELECT COUNT(*) as cnt, ROUND(AVG(nps_score),1) as avg FROM survey_responses WHERE survey_id=?').bind(send.survey_id).first()
  await c.env.DB.prepare('UPDATE surveys SET response_count=?, avg_nps=?, updated_at=? WHERE id=?').bind(statsRow?.cnt || 0, statsRow?.avg || 0, new Date().toISOString(), send.survey_id).run()
  return c.json({ success: true, message: '소중한 의견 감사합니다!' })
})

/* ═══ PWA Service Worker root-scope serve (v3.4 fix) ═══ */
app.get('/sw.js', async (c) => {
  try {
    // 내부 fetch로 /static/sw.js 콘텐츠 가져와서 루트 스코프로 재서빙
    const url = new URL(c.req.url)
    url.pathname = '/static/sw.js'
    const res = await fetch(url.toString())
    if (!res.ok) return c.text('// sw not found', 404)
    const body = await res.text()
    return new Response(body, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e) {
    return c.text('// sw error', 500)
  }
})

/* ═══ SPA Fallback ═══ */
app.get('*', (c) => {
  // API 경로는 SPA 폴백하지 않음 (notFound 핸들러가 처리)
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: '요청하신 API를 찾을 수 없습니다', path: c.req.path }, 404)
  }
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="theme-color" content="#0f766e">
<meta name="description" content="서울비디치과 원장이 만든 병원경영 시스템. 환자를 팬으로 만드는 10단계 퍼널. 6,000명 대표원장이 검증.">
<meta property="og:title" content="Patient Funnel Manager - 병원경영 통합 시스템">
<meta property="og:description" content="월 6천만에서 연 120억까지, 그 여정을 담은 도구. 환자를 팬으로 만드는 10단계 퍼널.">
<meta property="og:type" content="website">
<title>Patient Funnel Manager - 환자를 팬으로 만드는 병원경영 시스템</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link rel="manifest" href="/static/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="PF Manager">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="/static/dist/core.js" as="script">
<link rel="preload" href="/static/style.css" as="style">
<link rel="preload" href="/static/design-system.css" as="style">
<link rel="preload" href="/static/glassmorphism.css" as="style">
<link rel="preload" href="/static/bento.css" as="style">
<link rel="preload" href="/static/polish.css" as="style">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="/static/style.css" rel="stylesheet">
<link href="/static/design-system.css" rel="stylesheet">
<link href="/static/glassmorphism.css" rel="stylesheet">
<link href="/static/bento.css" rel="stylesheet">
<link href="/static/polish.css" rel="stylesheet">
<link href="/static/tailwind.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="/static/theme-init.js"><` + `/script>
<style>
/* Instant loading skeleton (inline for zero extra request) */
#boot-loader{position:fixed;inset:0;background:linear-gradient(135deg,#0f766e 0%,#0d5f59 50%,#134e4a 100%);display:flex;align-items:center;justify-content:center;z-index:9999;transition:opacity .3s ease,visibility .3s ease}
#boot-loader.hide{opacity:0;visibility:hidden;pointer-events:none}
.boot-inner{text-align:center;color:white}
.boot-logo{width:64px;height:64px;background:white;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#0f766e;margin:0 auto 18px;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:pulse 1.6s ease-in-out infinite;letter-spacing:-1px}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:0.85}}
.boot-title{font-size:15px;font-weight:700;letter-spacing:-.3px;margin-bottom:6px;font-family:'Noto Sans KR',system-ui,sans-serif}
.boot-subtitle{font-size:12px;opacity:0.7;font-family:'Noto Sans KR',system-ui,sans-serif;letter-spacing:-.2px}
.boot-dots{margin-top:16px;display:inline-flex;gap:6px}
.boot-dots span{width:6px;height:6px;border-radius:50%;background:#5eead4;animation:dot 1.4s ease-in-out infinite}
.boot-dots span:nth-child(2){animation-delay:.2s}.boot-dots span:nth-child(3){animation-delay:.4s}
@keyframes dot{0%,60%,100%{transform:scale(.7);opacity:.4}30%{transform:scale(1.2);opacity:1}}
</style>
</head>
<body>
<div id="boot-loader">
  <div class="boot-inner">
    <div class="boot-logo">PF</div>
    <div class="boot-title">Patient Funnel Manager</div>
    <div class="boot-subtitle">환자를 팬으로 만드는 병원경영 시스템</div>
    <div class="boot-dots"><span></span><span></span><span></span></div>
  </div>
</div>
<div id="app"></div>
<script src="/static/dist/core.js"><` + `/script>
<script src="/static/spatial.js"><` + `/script>
<script src="/static/boot-loader.js"><` + `/script>
</body>
</html>`
}

function getSurveyHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#0f766e">
<title>진료 만족도 설문</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--teal:#0f766e;--teal-light:#14b8a6;--teal-bg:#f0fdfa;--red:#ef4444;--yellow:#f59e0b;--green:#22c55e;--gray50:#f8fafc;--gray100:#f1f5f9;--gray200:#e2e8f0;--gray400:#94a3b8;--gray600:#475569;--gray800:#1e293b;--shadow:0 4px 24px rgba(0,0,0,0.06);--radius:16px}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans KR',system-ui,sans-serif;background:linear-gradient(180deg,#ecfdf5 0%,#f0fdf4 40%,#f8fafc 100%);min-height:100vh;color:var(--gray800);-webkit-font-smoothing:antialiased}
.survey-wrap{max-width:500px;margin:0 auto;padding:16px 16px 40px}
.progress-bar{position:fixed;top:0;left:0;right:0;height:4px;background:var(--gray200);z-index:100}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--teal),var(--teal-light));border-radius:0 4px 4px 0;transition:width .4s ease}
.survey-header{background:linear-gradient(135deg,#0d6b64 0%,var(--teal) 30%,var(--teal-light) 100%);border-radius:0 0 28px 28px;padding:36px 24px 32px;color:white;text-align:center;margin:-16px -16px 24px;position:relative;overflow:hidden}
.survey-header::before{content:'';position:absolute;top:-40px;right:-40px;width:120px;height:120px;background:rgba(255,255,255,0.06);border-radius:50%}
.survey-header::after{content:'';position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;background:rgba(255,255,255,0.04);border-radius:50%}
.hospital-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:-.2px;margin-bottom:12px}
.survey-header h1{font-size:22px;font-weight:900;letter-spacing:-.5px;line-height:1.3;margin:4px 0 8px}
.survey-header .desc{font-size:13px;opacity:0.85;line-height:1.5}
.patient-greeting{margin-top:14px;font-size:12px;background:rgba(255,255,255,0.12);display:inline-block;padding:6px 16px;border-radius:20px}
.question-number{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--teal);color:white;font-size:11px;font-weight:800;margin-right:8px;flex-shrink:0}
.survey-card{background:white;border-radius:var(--radius);padding:24px;box-shadow:var(--shadow);margin-bottom:16px;border:1px solid rgba(0,0,0,0.04);animation:fadeUp .4s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.survey-card:nth-child(1){animation-delay:.05s}.survey-card:nth-child(2){animation-delay:.1s}.survey-card:nth-child(3){animation-delay:.15s}.survey-card:nth-child(4){animation-delay:.2s}.survey-card:nth-child(5){animation-delay:.25s}
.q-label{font-size:15px;font-weight:700;margin-bottom:4px;line-height:1.5;display:flex;align-items:flex-start}
.q-label-text{flex:1}
.q-sub{font-size:11px;color:var(--gray400);margin-bottom:14px;padding-left:32px}
.q-required{display:inline-block;width:6px;height:6px;background:var(--red);border-radius:50%;margin-left:4px;vertical-align:super}
.nps-grid{display:grid;grid-template-columns:repeat(11,1fr);gap:5px}
.nps-btn{width:100%;aspect-ratio:1;border-radius:10px;border:2px solid var(--gray200);background:white;font-size:14px;font-weight:800;cursor:pointer;transition:all .2s ease;position:relative}
.nps-btn:active{transform:scale(.92)}
.nps-btn.selected{color:white;border-color:transparent;transform:scale(1.05);box-shadow:0 4px 12px rgba(15,118,110,0.3)}
.nps-btn[data-val="0"].selected,.nps-btn[data-val="1"].selected,.nps-btn[data-val="2"].selected{background:#ef4444}
.nps-btn[data-val="3"].selected,.nps-btn[data-val="4"].selected{background:#f97316}
.nps-btn[data-val="5"].selected,.nps-btn[data-val="6"].selected{background:#eab308}
.nps-btn[data-val="7"].selected,.nps-btn[data-val="8"].selected{background:#84cc16}
.nps-btn[data-val="9"].selected,.nps-btn[data-val="10"].selected{background:#22c55e}
.nps-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--gray400);margin-top:8px;padding:0 2px}
.nps-feedback{text-align:center;margin-top:10px;font-size:13px;font-weight:600;min-height:20px;transition:all .2s}
.rating-stars{display:flex;gap:8px;justify-content:center;padding:8px 0}
.star-btn{font-size:36px;cursor:pointer;transition:all .2s ease;filter:grayscale(1);opacity:0.25;user-select:none;-webkit-tap-highlight-color:transparent}
.star-btn:active{transform:scale(.85)}
.star-btn.active{filter:grayscale(0);opacity:1;transform:scale(1.08)}
.rating-text{text-align:center;font-size:12px;color:var(--gray400);margin-top:4px;min-height:18px}
.choice-list{display:flex;flex-direction:column;gap:8px}
.choice-btn{padding:14px 16px;border-radius:12px;border:2px solid var(--gray200);background:white;font-size:13px;font-weight:500;text-align:left;cursor:pointer;transition:all .2s ease;display:flex;align-items:center;gap:10px;-webkit-tap-highlight-color:transparent}
.choice-btn:active{transform:scale(.98)}
.choice-btn .check{width:20px;height:20px;border-radius:50%;border:2px solid var(--gray200);display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;font-size:11px}
.choice-btn.selected{background:var(--teal-bg);border-color:var(--teal);color:var(--teal);font-weight:600}
.choice-btn.selected .check{background:var(--teal);border-color:var(--teal);color:white}
.choice-hint{font-size:11px;color:var(--gray400);margin-bottom:8px;padding-left:32px}
.text-input{width:100%;padding:14px 16px;border:2px solid var(--gray200);border-radius:12px;font-size:14px;font-family:inherit;resize:vertical;min-height:100px;transition:all .2s;line-height:1.6;background:var(--gray50)}
.text-input:focus{outline:none;border-color:var(--teal);background:white;box-shadow:0 0 0 3px rgba(20,184,166,0.1)}
.text-input::placeholder{color:var(--gray400)}
.text-count{text-align:right;font-size:10px;color:var(--gray400);margin-top:4px}
.submit-area{position:sticky;bottom:0;padding:16px 0;background:linear-gradient(0deg,#f0fdf4 60%,transparent);z-index:10}
.submit-btn{width:100%;padding:18px;background:linear-gradient(135deg,var(--teal),var(--teal-light));color:white;border:none;border-radius:14px;font-size:17px;font-weight:800;cursor:pointer;transition:all .2s;font-family:inherit;letter-spacing:-.3px;box-shadow:0 4px 20px rgba(15,118,110,0.25)}
.submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(15,118,110,0.35)}
.submit-btn:active:not(:disabled){transform:scale(.98)}
.submit-btn:disabled{opacity:0.4;cursor:not-allowed;box-shadow:none}
.submit-btn .arrow{display:inline-block;margin-left:6px;transition:transform .2s}
.submit-btn:not(:disabled):hover .arrow{transform:translateX(3px)}
.status-page{text-align:center;padding:60px 24px;animation:fadeUp .5s ease}
.status-icon{font-size:64px;margin-bottom:20px;display:block}
.status-page h2{font-size:24px;font-weight:900;margin-bottom:8px;letter-spacing:-.5px}
.status-page p{font-size:14px;color:var(--gray600);line-height:1.6}
.status-page.success h2{color:var(--teal)}
.status-page.error h2{color:var(--red)}
.status-page.expired h2{color:var(--yellow)}
.confetti{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:999;overflow:hidden}
.confetti span{position:absolute;width:8px;height:8px;border-radius:2px;animation:fall 2.5s ease-in forwards}
@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
.footer{text-align:center;padding:24px 0 8px;font-size:11px;color:var(--gray400);letter-spacing:-.2px}
@media(max-width:380px){.nps-btn{font-size:12px;border-radius:6px}.nps-grid{gap:3px}.star-btn{font-size:28px}}
</style>
</head>
<body>
<div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
<div class="survey-wrap" id="surveyApp">
  <div style="text-align:center;padding:80px 20px;color:var(--gray400)">
    <div style="width:40px;height:40px;border:3px solid var(--gray200);border-top-color:var(--teal);border-radius:50%;margin:0 auto 16px;animation:spin 1s linear infinite"></div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    설문을 불러오는 중...
  </div>
</div>
<script src="/static/survey-page.js"><` + `/script>
</body>
</html>`
}

export default app
