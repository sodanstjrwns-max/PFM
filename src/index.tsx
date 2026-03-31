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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ═══ Global Error Handler ═══ */
app.onError((err, c) => {
  const isDbError = err.message?.includes('D1_ERROR') || err.message?.includes('SQLITE')
  const status = isDbError ? 503 : 500
  const label = isDbError ? 'DB_ERROR' : 'SERVER_ERROR'
  console.error(`[${label}] ${c.req.method} ${c.req.path}:`, err.message)
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
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return origin // Server-to-server requests (no CORS needed)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
    if (origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) return origin
    if (origin.includes('patient-funnel-manager')) return origin
    return origin
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

/* ═══ Temporary password reset endpoint (remove in production) ═══ */
app.post('/api/reset-pw', async (c) => {
  const { email, newPassword, secret } = await c.req.json()
  if (secret !== 'pfm-reset-2026') return c.json({ error: 'Unauthorized' }, 403)
  const hash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE email = ?').bind(hash, email).run()
  return c.json({ success: true, message: 'Password updated' })
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
<title>Patient Funnel Manager</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="/static/style.css" rel="stylesheet">
</head>
<body>
<div id="app"></div>
<script src="/static/dist/core.js"><` + `/script>
</body>
</html>`
}

function getSurveyHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>진료 만족도 설문</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f766e'/><text x='16' y='22' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='Arial'>PF</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans KR',sans-serif;background:#f0fdf4;min-height:100vh;color:#1e293b}
.survey-container{max-width:480px;margin:0 auto;padding:20px}
.survey-header{background:linear-gradient(135deg,#0f766e,#14b8a6);border-radius:16px;padding:28px;color:white;text-align:center;margin-bottom:24px}
.survey-header h1{font-size:20px;font-weight:800;margin:8px 0}
.survey-header p{font-size:13px;opacity:0.9}
.survey-card{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:16px}
.q-label{font-size:14px;font-weight:700;margin-bottom:12px;line-height:1.5}
.q-sub{font-size:11px;color:#64748b;margin-bottom:12px}
.nps-grid{display:grid;grid-template-columns:repeat(11,1fr);gap:4px}
.nps-btn{width:100%;aspect-ratio:1;border-radius:8px;border:2px solid #e2e8f0;background:white;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s}
.nps-btn:hover{border-color:#14b8a6;background:#f0fdfa}
.nps-btn.selected{background:#0f766e;color:white;border-color:#0f766e}
.nps-labels{display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:6px}
.rating-stars{display:flex;gap:6px}
.star-btn{font-size:32px;cursor:pointer;transition:transform .15s;filter:grayscale(1);opacity:0.3}
.star-btn:hover,.star-btn.active{filter:grayscale(0);opacity:1;transform:scale(1.1)}
.choice-list{display:flex;flex-direction:column;gap:8px}
.choice-btn{padding:12px 16px;border-radius:10px;border:2px solid #e2e8f0;background:white;font-size:13px;text-align:left;cursor:pointer;transition:all .15s}
.choice-btn:hover{border-color:#14b8a6}
.choice-btn.selected{background:#f0fdfa;border-color:#0f766e;color:#0f766e;font-weight:600}
.text-input{width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;resize:vertical;min-height:80px;transition:border-color .15s}
.text-input:focus{outline:none;border-color:#14b8a6}
.submit-btn{width:100%;padding:16px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .15s;font-family:inherit}
.submit-btn:hover{opacity:0.9}
.submit-btn:disabled{opacity:0.5;cursor:not-allowed}
.success-msg{text-align:center;padding:40px 20px}
.success-msg h2{font-size:24px;font-weight:800;color:#0f766e;margin:16px 0 8px}
.success-msg p{font-size:14px;color:#64748b}
.error-msg{text-align:center;padding:40px 20px;color:#ef4444}
.loading{text-align:center;padding:60px 20px;color:#64748b}
</style>
</head>
<body>
<div class="survey-container" id="surveyApp">
  <div class="loading">설문을 불러오는 중...</div>
</div>
<script>
(function(){
  const token = window.location.pathname.split('/survey/')[1];
  if (!token) { show('error', '잘못된 링크입니다'); return; }
  const app = document.getElementById('surveyApp');
  let surveyData = null;
  let answers = {};

  async function load() {
    try {
      const r = await fetch('/api/survey/' + token);
      const d = await r.json();
      if (!r.ok) { show(d.completed ? 'done' : d.expired ? 'expired' : 'error', d.error); return; }
      surveyData = d;
      renderSurvey();
    } catch(e) { show('error', '설문을 불러올 수 없습니다'); }
  }

  function show(type, msg) {
    if (type === 'done') {
      app.innerHTML = '<div class="survey-card success-msg"><div style="font-size:48px">✅</div><h2>이미 응답 완료</h2><p>소중한 의견 감사합니다!</p></div>';
    } else if (type === 'expired') {
      app.innerHTML = '<div class="survey-card error-msg"><div style="font-size:48px">⏰</div><h2>설문 기간 만료</h2><p>' + esc(msg) + '</p></div>';
    } else if (type === 'success') {
      app.innerHTML = '<div class="survey-card success-msg"><div style="font-size:48px">🙏</div><h2>감사합니다!</h2><p>소중한 의견이 병원 서비스 개선에 큰 도움이 됩니다.</p></div>';
    } else {
      app.innerHTML = '<div class="survey-card error-msg"><div style="font-size:48px">😢</div><h2>오류</h2><p>' + esc(msg) + '</p></div>';
    }
  }

  function esc(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c)); }

  function renderSurvey() {
    const d = surveyData;
    const nameStr = d.patientName ? d.patientName + '님' : '';
    app.innerHTML = \`
      <div class="survey-header">
        <div style="font-size:13px;opacity:0.85">\${esc(d.hospitalName)}</div>
        <h1>\${esc(d.title)}</h1>
        \${d.description ? '<p>' + esc(d.description) + '</p>' : ''}
        \${nameStr ? '<div style="margin-top:10px;font-size:12px;opacity:0.8">' + esc(nameStr) + ', 설문에 참여해 주셔서 감사합니다</div>' : ''}
      </div>
      <div id="questions"></div>
      <button class="submit-btn" id="submitBtn" disabled>설문 제출하기</button>
      <div style="text-align:center;margin-top:16px;font-size:11px;color:#94a3b8">Patient Funnel Manager</div>
    \`;

    const qEl = document.getElementById('questions');
    (d.questions || []).forEach(q => {
      const card = document.createElement('div');
      card.className = 'survey-card';
      card.innerHTML = renderQuestion(q);
      qEl.appendChild(card);
      bindQuestion(card, q);
    });

    document.getElementById('submitBtn').addEventListener('click', submitSurvey);
    checkRequired();
  }

  function renderQuestion(q) {
    let html = '<div class="q-label">' + esc(q.label) + '</div>';
    switch(q.type) {
      case 'nps':
        html += '<div class="q-sub">0: 전혀 추천하지 않음 ~ 10: 매우 적극 추천</div>';
        html += '<div class="nps-grid">' + Array.from({length:11},(_, i) => '<button class="nps-btn" data-val="'+i+'">'+i+'</button>').join('') + '</div>';
        html += '<div class="nps-labels"><span>전혀 아님</span><span>매우 추천</span></div>';
        break;
      case 'rating':
        html += '<div class="rating-stars">' + [1,2,3,4,5].map(i => '<span class="star-btn" data-val="'+i+'">⭐</span>').join('') + '</div>';
        break;
      case 'choice':
        html += '<div class="choice-list">' + (q.options||[]).map(o => '<button class="choice-btn" data-val="'+esc(o)+'">'+esc(o)+'</button>').join('') + '</div>';
        break;
      case 'text':
        html += '<textarea class="text-input" placeholder="자유롭게 의견을 작성해주세요" data-qid="'+q.id+'"></textarea>';
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
          answers[q.id] = parseInt(btn.dataset.val);
          checkRequired();
        });
      });
    } else if (q.type === 'rating') {
      card.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.dataset.val);
          answers[q.id] = val;
          card.querySelectorAll('.star-btn').forEach((b,i) => b.classList.toggle('active', i < val));
          checkRequired();
        });
      });
    } else if (q.type === 'choice') {
      card.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers[q.id] = btn.dataset.val;
          checkRequired();
        });
      });
    } else if (q.type === 'text') {
      const ta = card.querySelector('.text-input');
      ta.addEventListener('input', () => { answers[q.id] = ta.value; checkRequired(); });
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
    btn.textContent = '제출중...';
    try {
      const r = await fetch('/api/survey/' + token + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '제출 실패');
      show('success');
    } catch(e) {
      btn.disabled = false;
      btn.textContent = '설문 제출하기';
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
