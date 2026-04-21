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

/* ═══ Route Registration ═══ */
// Auth (public)
app.route('/api/auth', auth)

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
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="/static/style.css" rel="stylesheet">
<link href="/static/design-system.css" rel="stylesheet">
<link href="/static/glassmorphism.css" rel="stylesheet">
<script>
  /* Theme init: light/dark/system - 깜빡임 방지 위해 head에서 즉시 실행 */
  (function(){
    try {
      var t = localStorage.getItem('pfm_theme') || 'system';
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var applied = t === 'system' ? (prefersDark ? 'dark' : 'light') : t;
      document.documentElement.setAttribute('data-theme', applied);
      window.__pfmTheme = { pref: t, applied: applied };
    } catch(e) {}
  })();
</script>
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
<script>
(function(){
  // Hide boot loader once app is rendered
  const hide = () => {
    const el = document.getElementById('boot-loader');
    if (el) { el.classList.add('hide'); setTimeout(() => el.remove(), 400); }
  };
  const observer = new MutationObserver(() => {
    if (document.querySelector('#app > *')) { hide(); observer.disconnect(); }
  });
  observer.observe(document.getElementById('app'), { childList: true });
  // Safety fallback: hide after 8s regardless
  setTimeout(hide, 8000);
})();
</script>
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
<script>
(function(){
  const token = window.location.pathname.split('/survey/')[1];
  if (!token) { showStatus('error', '잘못된 링크입니다'); return; }
  const app = document.getElementById('surveyApp');
  const progressFill = document.getElementById('progressFill');
  let surveyData = null;
  let answers = {};
  let totalRequired = 0;

  async function load() {
    try {
      const r = await fetch('/api/survey/' + token);
      const d = await r.json();
      if (!r.ok) { showStatus(d.completed?'done':d.expired?'expired':'error', d.error); return; }
      surveyData = d;
      renderSurvey();
    } catch(e) { showStatus('error', '설문을 불러올 수 없습니다'); }
  }

  function showStatus(type, msg) {
    progressFill.style.width = type==='done'||type==='success'?'100%':'0%';
    const icons = {done:'\\u2705',expired:'\\u23F0',success:'\\uD83C\\uDF89',error:'\\uD83D\\uDE22'};
    const titles = {done:'\\uC774\\uBBF8 \\uC751\\uB2F5 \\uC644\\uB8CC',expired:'\\uC124\\uBB38 \\uAE30\\uAC04 \\uB9CC\\uB8CC',success:'\\uAC10\\uC0AC\\uD569\\uB2C8\\uB2E4!',error:'\\uC624\\uB958'};
    const descs = {done:'\\uC18C\\uC911\\uD55C \\uC758\\uACAC \\uAC10\\uC0AC\\uD569\\uB2C8\\uB2E4!',expired:msg||'',success:'\\uC18C\\uC911\\uD55C \\uC758\\uACAC\\uC774 \\uBCD1\\uC6D0 \\uC11C\\uBE44\\uC2A4 \\uAC1C\\uC120\\uC5D0\\n\\uD070 \\uB3C4\\uC6C0\\uC774 \\uB429\\uB2C8\\uB2E4.',error:msg||''};
    app.innerHTML = '<div class="survey-card status-page '+type+'"><span class="status-icon">'+(icons[type]||'')+'</span><h2>'+esc(titles[type]||'')+'</h2><p style="white-space:pre-line">'+esc(descs[type]||'')+'</p></div><div class="footer">Patient Funnel Manager</div>';
    if (type === 'success') showConfetti();
  }

  function showConfetti() {
    const colors = ['#22c55e','#14b8a6','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
    const container = document.createElement('div');
    container.className = 'confetti';
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('span');
      s.style.cssText = 'left:'+Math.random()*100+'%;background:'+colors[i%colors.length]+';animation-delay:'+Math.random()*1.5+'s;animation-duration:'+(2+Math.random()*2)+'s;width:'+(6+Math.random()*6)+'px;height:'+(6+Math.random()*6)+'px';
      container.appendChild(s);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4000);
  }

  function esc(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c)); }

  function updateProgress() {
    if (!totalRequired) return;
    const answered = Object.keys(answers).filter(k => {
      const q = surveyData.questions.find(q2 => q2.id === k);
      return q && q.type !== 'text';
    }).length;
    progressFill.style.width = Math.round(answered / totalRequired * 100) + '%';
  }

  function renderSurvey() {
    const d = surveyData;
    totalRequired = (d.questions||[]).filter(q => q.type !== 'text').length;
    const nameStr = d.patientName ? d.patientName + '\\uB2D8' : '';

    app.innerHTML = '<div class="survey-header">'
      +'<div class="hospital-badge">\\uD83C\\uDFE5 '+esc(d.hospitalName)+'</div>'
      +'<h1>'+esc(d.title)+'</h1>'
      +(d.description ? '<div class="desc">'+esc(d.description)+'</div>' : '')
      +(nameStr ? '<div class="patient-greeting">'+esc(nameStr)+', \\uC124\\uBB38\\uC5D0 \\uCC38\\uC5EC\\uD574 \\uC8FC\\uC154\\uC11C \\uAC10\\uC0AC\\uD569\\uB2C8\\uB2E4</div>' : '')
      +'</div>'
      +'<div id="questions"></div>'
      +'<div class="submit-area"><button class="submit-btn" id="submitBtn" disabled>\\uC124\\uBB38 \\uC81C\\uCD9C\\uD558\\uAE30 <span class="arrow">\\u2192</span></button></div>'
      +'<div class="footer">Powered by Patient Funnel Manager</div>';

    const qEl = document.getElementById('questions');
    (d.questions || []).forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'survey-card';
      card.style.animationDelay = (idx * 0.06) + 's';
      card.innerHTML = renderQuestion(q, idx);
      qEl.appendChild(card);
      bindQuestion(card, q);
    });

    document.getElementById('submitBtn').addEventListener('click', submitSurvey);
    checkRequired();
  }

  const ratingLabels = ['','\\uBCC4\\uB85C\\uC608\\uC694','\\uBD80\\uC871\\uD574\\uC694','\\uBCF4\\uD1B5\\uC774\\uC5D0\\uC694','\\uB9CC\\uC871\\uD574\\uC694','\\uB9E4\\uC6B0 \\uB9CC\\uC871!'];
  const npsFeedbacks = ['\\uD83D\\uDE1E \\uC544\\uC27D\\uB124\\uC694...','\\uD83D\\uDE1E','\\uD83D\\uDE1E','\\uD83D\\uDE10','\\uD83D\\uDE10','\\uD83D\\uDE42','\\uD83D\\uDE42','\\uD83D\\uDE04','\\uD83D\\uDE04','\\uD83E\\uDD29 \\uACE0\\uB9C8\\uC6CC\\uC694!','\\uD83E\\uDD29 \\uCD5C\\uACE0\\uC608\\uC694!'];

  function renderQuestion(q, idx) {
    const isRequired = q.type !== 'text';
    let html = '<div class="q-label"><span class="question-number">'+(idx+1)+'</span><span class="q-label-text">'+esc(q.label)+(isRequired?'<span class="q-required"></span>':'')+'</span></div>';

    switch(q.type) {
      case 'nps':
        html += '<div class="q-sub" style="padding-left:32px">0: \\uC804\\uD600 \\uCD94\\uCC9C\\uD558\\uC9C0 \\uC54A\\uC74C ~ 10: \\uB9E4\\uC6B0 \\uC801\\uADF9 \\uCD94\\uCC9C</div>';
        html += '<div class="nps-grid">'+Array.from({length:11},(_,i)=>'<button class="nps-btn" data-val="'+i+'">'+i+'</button>').join('')+'</div>';
        html += '<div class="nps-labels"><span>\\uC804\\uD600 \\uC544\\uB2D8</span><span>\\uB9E4\\uC6B0 \\uCD94\\uCC9C</span></div>';
        html += '<div class="nps-feedback" id="npsFeedback"></div>';
        break;
      case 'rating':
        html += '<div class="rating-stars">'+[1,2,3,4,5].map(i=>'<span class="star-btn" data-val="'+i+'">\\u2B50</span>').join('')+'</div>';
        html += '<div class="rating-text" id="ratingText_'+q.id+'"></div>';
        break;
      case 'choice':
        if (q.multiple) html += '<div class="choice-hint">\\uBCF5\\uC218 \\uC120\\uD0DD \\uAC00\\uB2A5</div>';
        html += '<div class="choice-list">'+(q.options||[]).map(o=>'<button class="choice-btn" data-val="'+esc(o)+'"><span class="check">\\u2713</span><span>'+esc(o)+'</span></button>').join('')+'</div>';
        break;
      case 'text':
        html += '<textarea class="text-input" placeholder="\\uC790\\uC720\\uB86D\\uAC8C \\uC758\\uACAC\\uC744 \\uC791\\uC131\\uD574\\uC8FC\\uC138\\uC694" data-qid="'+q.id+'" maxlength="500"></textarea>';
        html += '<div class="text-count"><span id="tc_'+q.id+'">0</span>/500</div>';
        break;
    }
    return html;
  }

  function bindQuestion(card, q) {
    if (q.type === 'nps') {
      card.querySelectorAll('.nps-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('.nps-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const v = parseInt(btn.dataset.val);
          answers[q.id] = v;
          const fb = document.getElementById('npsFeedback');
          if (fb) { fb.textContent = npsFeedbacks[v] || ''; fb.style.color = v >= 9 ? 'var(--green)' : v >= 7 ? 'var(--yellow)' : 'var(--red)'; }
          checkRequired(); updateProgress();
        });
      });
    } else if (q.type === 'rating') {
      card.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.dataset.val);
          answers[q.id] = val;
          card.querySelectorAll('.star-btn').forEach((b,i) => b.classList.toggle('active', i < val));
          const rt = document.getElementById('ratingText_'+q.id);
          if (rt) { rt.textContent = ratingLabels[val] || ''; rt.style.color = val >= 4 ? 'var(--teal)' : val >= 3 ? 'var(--gray600)' : 'var(--red)'; }
          checkRequired(); updateProgress();
        });
      });
    } else if (q.type === 'choice') {
      card.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (q.multiple) {
            btn.classList.toggle('selected');
            const selected = Array.from(card.querySelectorAll('.choice-btn.selected')).map(b=>b.dataset.val);
            answers[q.id] = selected.length ? selected : undefined;
          } else {
            card.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            answers[q.id] = btn.dataset.val;
          }
          checkRequired(); updateProgress();
        });
      });
    } else if (q.type === 'text') {
      const ta = card.querySelector('.text-input');
      ta.addEventListener('input', () => {
        answers[q.id] = ta.value;
        const tc = document.getElementById('tc_'+q.id);
        if (tc) tc.textContent = ta.value.length;
        checkRequired();
      });
    }
  }

  function checkRequired() {
    const required = (surveyData.questions || []).filter(q => q.type !== 'text');
    const allAnswered = required.every(q => answers[q.id] !== undefined);
    document.getElementById('submitBtn').disabled = !allAnswered;
  }

  async function submitSurvey() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;display:inline-block"></span>\\uC81C\\uCD9C\\uC911...</span>';
    try {
      const r = await fetch('/api/survey/' + token + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '\\uC81C\\uCD9C \\uC2E4\\uD328');
      showStatus('success');
    } catch(e) {
      btn.disabled = false;
      btn.innerHTML = '\\uC124\\uBB38 \\uC81C\\uCD9C\\uD558\\uAE30 <span class="arrow">\\u2192</span>';
      alert(e.message);
    }
  }

  load();
})();
<\/script>
</body>
</html>`
}

export default app
