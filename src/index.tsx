import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings, Variables } from './lib/types'
import { authMiddleware, securityHeaders, sanitizeString, safeJsonParse } from './lib/middleware'

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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ Global Error Handler ═══ */
app.onError((err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message)
  return c.json({
    error: '서버 오류가 발생했습니다',
    ...(c.env.JWT_SECRET ? {} : { detail: err.message }) // Show detail only in dev (when JWT_SECRET not set)
  }, 500)
})

/* ═══ Security Headers ═══ */
securityHeaders(app as any)

/* ═══ CORS Configuration ═══ */
app.use('/api/*', cors({
  origin: (origin) => {
    // Allow local development
    if (!origin) return '*'
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
    // Allow Cloudflare Pages domains
    if (origin.includes('.pages.dev') || origin.includes('.workers.dev')) return origin
    // Allow custom production domains (add your domain here)
    if (origin.includes('patient-funnel-manager')) return origin
    return origin // In production, restrict to specific domains
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}))

/* ═══ Auth Middleware ═══ */
authMiddleware(app as any)

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

/* ═══ SPA Fallback ═══ */
app.get('*', (c) => {
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Patient Funnel Manager</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/style.css" rel="stylesheet">
</head>
<body>
<div id="app"></div>
<script src="/static/dist/bundle.js"><` + `/script>
</body>
</html>`
}

export default app
