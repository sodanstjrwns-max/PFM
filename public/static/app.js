/* ═══════════════════════════════════════════════════
   Patient Funnel Manager - Core Application
   모듈 분리 v3.0 - 코어 (State, API, Router, Auth, Utils)
   ═══════════════════════════════════════════════════ */
(function() {
'use strict';

/* ═══ XSS Defense: HTML Escape Utility ═══ */
const _escMap = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => _escMap[c]);
}
// Alias for template use
const h = escapeHtml;
// Make globally available for modules
window.escapeHtml = escapeHtml;
window.h = h;

/* ─── Icons (SVG inline) ─── */
const ICONS = {
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  materials: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  pricing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  cases: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 12,15 18,9"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15,18 9,12 15,6"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,18 15,12 9,6"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21 5,3"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  checklist: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/></svg>`,
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
};

const ICONS_HIRE = {
  briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  userPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/></svg>`,
  userCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>`,
};

/* ─── State ─── */
let state = {
  user: null,
  token: null,
  currentPage: 'dashboard',
  categories: {},
  sidebarOpen: true,
  openGroups: { management: true },
};

/* ─── API Helper ─── */
async function api(path, opts = {}) {
  const headers = {};
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  if (opts.json) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); delete opts.json; }
  let res;
  try {
    res = await fetch(path, { ...opts, headers: { ...headers, ...opts.headers } });
  } catch(e) {
    throw new Error('네트워크 오류: 서버에 연결할 수 없습니다');
  }
  if (res.status === 401) { logout(); throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.'); }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch(e) { throw new Error('서버 응답 파싱 오류'); }
  if (!res.ok) throw new Error(data?.error || `오류 (${res.status})`);
  return data;
}

async function apiForm(path, formData) {
  const headers = {};
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  let res;
  try {
    res = await fetch(path, { method: 'POST', headers, body: formData });
  } catch(e) {
    throw new Error('네트워크 오류: 서버에 연결할 수 없습니다');
  }
  if (res.status === 401) { logout(); throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.'); }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch(e) { throw new Error('서버 응답 파싱 오류'); }
  if (!res.ok) throw new Error(data?.error || `오류 (${res.status})`);
  return data;
}

/* ─── Toast ─── */
function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ─── Router ─── */
function navigate(page) {
  state.currentPage = page;
  // Stop any active polling when navigating
  if (window._pfmStopPolling) window._pfmStopPolling();
  // Re-render sidebar to show active state, then load page
  const nav = getNavConfig();
  const navEl = document.getElementById('sidebarNav');
  if (navEl) renderSidebar(nav);
  renderPage(); // async - loads chunk if needed then renders
  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

/* ─── Auth ─── */
function getStoredAuth() {
  try {
    const t = localStorage.getItem('pfm_token');
    const u = localStorage.getItem('pfm_user');
    if (t && u) { state.token = t; state.user = JSON.parse(u); return true; }
  } catch(e) {}
  return false;
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('pfm_token', token);
  localStorage.setItem('pfm_user', JSON.stringify(user));
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('pfm_token');
  localStorage.removeItem('pfm_user');
  renderApp();
}

/* ─── Render Auth Screen ─── */
function renderAuth() {
  document.body.classList.remove('app-loaded');
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-icon">${ICONS.logo}</div>
        <h1>Patient Funnel Manager</h1>
        <p>병의원 통합 관리 플랫폼</p>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">로그인</button>
        <button class="auth-tab" data-tab="register">병원 등록</button>
      </div>
      <div class="auth-error" id="authError"></div>
      <form id="authForm" class="auth-form">
        <div class="form-group hidden" id="regHospitalField">
          <label>병원명 <span style="color:var(--danger)">*</span></label>
          <input class="form-input" type="text" id="regHospital" placeholder="예: 서울비디치과">
        </div>
        <div class="form-group hidden" id="regBusinessField">
          <label>사업자등록번호</label>
          <input class="form-input" type="text" id="regBusinessNumber" placeholder="000-00-00000" maxlength="12">
        </div>
        <div class="form-group hidden" id="regHospitalPhoneField">
          <label>병원 전화번호</label>
          <input class="form-input" type="tel" id="regHospitalPhone" placeholder="02-000-0000">
        </div>
        <div class="form-group hidden" id="regAddressField">
          <label>병원 주소</label>
          <input class="form-input" type="text" id="regAddress" placeholder="예: 서울시 강남구 테헤란로 123">
        </div>
        <div class="form-group hidden" id="regNameField">
          <label>이름 <span style="color:var(--danger)">*</span></label>
          <input class="form-input" type="text" id="regName" placeholder="대표원장 성함">
        </div>
        <div class="form-group hidden" id="regPhoneField">
          <label>원장 연락처</label>
          <input class="form-input" type="tel" id="regPhone" placeholder="010-0000-0000">
        </div>
        <div class="form-group hidden" id="inviteCodeField">
          <label>초대 코드</label>
          <input class="form-input" type="text" id="inviteCode" placeholder="관리자에게 받은 코드" style="text-transform:uppercase">
          <div id="inviteInfo" style="font-size:12px;color:var(--primary);margin-top:4px"></div>
        </div>

        <div class="form-group">
          <label>이메일</label>
          <input class="form-input" type="email" id="authEmail" placeholder="admin@hospital.com" required>
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input class="form-input" type="password" id="authPassword" placeholder="••••••••" required>
        </div>
        <div class="form-group hidden" id="joinPhoneField">
          <label>연락처</label>
          <input class="form-input" type="tel" id="joinPhone" placeholder="010-0000-0000">
        </div>
        <div id="joinPositionTeam" class="hidden form-grid">
          <div class="form-group">
            <label>직급</label>
            <select class="form-input" id="joinPosition">
              <option value="">선택</option>
              <option value="doctor">원장/의사</option>
              <option value="director">실장단</option>
              <option value="hygienist">치과위생사</option>
              <option value="desk">데스크</option>
              <option value="sterilization">소독팀</option>
              <option value="management">경영지원실</option>
            </select>
          </div>
          <div class="form-group">
            <label>소속팀</label>
            <select class="form-input" id="joinTeam">
              <option value="">선택</option>
              <option value="clinical">진료팀</option>
              <option value="front">프론트</option>
              <option value="support">지원팀</option>
              <option value="management">경영지원</option>
            </select>
          </div>
        </div>
        <div id="joinScheduleField" class="hidden">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">근무 스케줄</label>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:11px" id="scheduleGrid">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-full" id="authSubmitBtn">로그인</button>
      </form>
    </div>
  </div>`;

  // 초대 링크로 진입했는지 확인
  const joinMatch = window.location.hash.match(/^#join\/(.+)$/);
  let mode = joinMatch ? 'join' : 'login';
  const tabs = app.querySelectorAll('.auth-tab');
  const dayLabels = ['월','화','수','목','금','토','일'];
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];

  // 초대 링크로 진입 시 직원가입 화면 자동 표시
  if (joinMatch) {
    ['inviteCodeField','regNameField','joinPhoneField','joinPositionTeam','joinScheduleField'].forEach(id => {
      const el = document.getElementById(id); if(el) el.classList.remove('hidden');
    });
    document.getElementById('authSubmitBtn').textContent = '직원 가입';
    document.getElementById('inviteCode').value = joinMatch[1].toUpperCase();
    // 탭 숨기고 헤더 변경
    document.querySelector('.auth-tabs').innerHTML = `
      <div style="text-align:center;padding:8px 0">
        <span style="font-size:14px;font-weight:700;color:var(--primary)">🤝 직원 초대 가입</span>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">초대받은 병원에 직원으로 가입합니다</div>
      </div>`;
    buildScheduleGrid();
    // 자동으로 초대코드 검증
    setTimeout(async () => {
      try {
        const info = await api('/api/auth/invite/' + joinMatch[1].toUpperCase());
        document.getElementById('inviteInfo').innerHTML = `<span style="color:var(--success)">✅ <strong>${info.hospital_name}</strong> 초대 확인됨</span>`;
        if (info.position) document.getElementById('joinPosition').value = info.position;
        if (info.team) document.getElementById('joinTeam').value = info.team;
      } catch(err) {
        document.getElementById('inviteInfo').innerHTML = `<span style="color:var(--danger)">❌ ${err.message}</span>`;
      }
    }, 300);
  }

  function buildScheduleGrid() {
    const grid = document.getElementById('scheduleGrid');
    if (!grid) return;
    grid.innerHTML = dayLabels.map((d, i) => `
      <div class="text-center">
        <label style="display:flex;align-items:center;gap:2px;margin-bottom:4px;justify-content:center;cursor:pointer">
          <input type="checkbox" class="sched-day" data-day="${dayKeys[i]}" ${i < 5 ? 'checked' : ''}>
          <span style="font-weight:600">${d}</span>
        </label>
        <div class="sched-times" data-day-times="${dayKeys[i]}" style="${i >= 5 ? 'display:none' : ''}">
          <input type="time" class="sched-start" value="${i < 5 ? '09:00' : '09:00'}" style="width:100%;font-size:10px;padding:2px;border:1px solid var(--border);border-radius:4px;margin-bottom:2px">
          <input type="time" class="sched-end" value="${i < 5 ? '18:00' : '14:00'}" style="width:100%;font-size:10px;padding:2px;border:1px solid var(--border);border-radius:4px">
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('.sched-day').forEach(cb => {
      cb.addEventListener('change', () => {
        const times = grid.querySelector(`[data-day-times="${cb.dataset.day}"]`);
        if (times) times.style.display = cb.checked ? '' : 'none';
      });
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      const toggle = (id, show) => { const el = document.getElementById(id); if(el) { if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); } };
      toggle('regHospitalField', mode === 'register');
      toggle('regBusinessField', mode === 'register');
      toggle('regHospitalPhoneField', mode === 'register');
      toggle('regAddressField', mode === 'register');
      toggle('regNameField', mode !== 'login');
      toggle('regPhoneField', mode === 'register');
      toggle('inviteCodeField', mode === 'join');
      toggle('joinPhoneField', mode === 'join');
      toggle('joinPositionTeam', mode === 'join');
      toggle('joinScheduleField', mode === 'join');
      document.getElementById('authSubmitBtn').textContent = mode === 'login' ? '로그인' : '🏥 병원 등록하기';
      document.getElementById('authError').classList.remove('show');
      if (mode === 'join') buildScheduleGrid();
    });
  });

  // 사업자등록번호 자동 포맷 (000-00-00000)
  document.getElementById('regBusinessNumber')?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    if (v.length > 5) v = v.slice(0,3) + '-' + v.slice(3,5) + '-' + v.slice(5);
    else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
    e.target.value = v;
  });

  // Invite code validation
  let inviteDebounce;
  document.getElementById('inviteCode')?.addEventListener('input', (e) => {
    clearTimeout(inviteDebounce);
    const code = e.target.value.trim();
    if (code.length < 4) { document.getElementById('inviteInfo').textContent = ''; return; }
    inviteDebounce = setTimeout(async () => {
      try {
        const info = await api('/api/auth/invite/' + code);
        document.getElementById('inviteInfo').textContent = '✅ ' + info.hospital_name + ' 초대 확인';
        if (info.position) document.getElementById('joinPosition').value = info.position;
        if (info.team) document.getElementById('joinTeam').value = info.team;
      } catch(err) {
        document.getElementById('inviteInfo').innerHTML = '<span style="color:var(--danger)">❌ ' + err.message + '</span>';
      }
    }, 500);
  });

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('authError');
    const btn = document.getElementById('authSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" style="width:18px;height:18px;border-width:2px"></span>';
    try {
      if (mode === 'login') {
        const data = await api('/api/auth/login', { method: 'POST', json: {
          email: document.getElementById('authEmail').value,
          password: document.getElementById('authPassword').value,
        }});
        saveAuth(data.token, data.user);
      } else if (mode === 'join') {
        // Build work_schedule from grid
        const schedule = {};
        const grid = document.getElementById('scheduleGrid');
        if (grid) {
          grid.querySelectorAll('.sched-day').forEach(cb => {
            const day = cb.dataset.day;
            if (cb.checked) {
              const times = grid.querySelector(`[data-day-times="${day}"]`);
              const start = times?.querySelector('.sched-start')?.value || '09:00';
              const end = times?.querySelector('.sched-end')?.value || '18:00';
              schedule[day] = { start, end };
            } else {
              schedule[day] = null;
            }
          });
        }
        const data = await api('/api/auth/join', { method: 'POST', json: {
          invite_code: document.getElementById('inviteCode').value.trim().toUpperCase(),
          email: document.getElementById('authEmail').value,
          password: document.getElementById('authPassword').value,
          name: document.getElementById('regName').value,
          phone: document.getElementById('joinPhone').value,
          position: document.getElementById('joinPosition').value,
          team: document.getElementById('joinTeam').value,
          work_schedule: schedule,
        }});
        saveAuth(data.token, data.user);
      } else {
        const data = await api('/api/auth/register', { method: 'POST', json: {
          hospitalName: document.getElementById('regHospital').value,
          email: document.getElementById('authEmail').value,
          password: document.getElementById('authPassword').value,
          name: document.getElementById('regName').value,
          phone: document.getElementById('regPhone').value,
          hospitalPhone: document.getElementById('regHospitalPhone').value,
          hospitalAddress: document.getElementById('regAddress').value,
          businessNumber: document.getElementById('regBusinessNumber').value.trim(),
        }});
        saveAuth(data.token, data.user);
      }
      // 가입 후 해시 초기화
      if (window.location.hash.startsWith('#join/')) window.location.hash = '';
      renderApp();
    } catch(err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = mode === 'login' ? '로그인' : mode === 'join' ? '직원 가입' : '🏥 병원 등록하기';
    }
  });
}

/* ─── Nav Config ─── */
function getNavConfig() {
  const isManager = ['admin','manager'].includes(state.user?.role);
  const nav = [
    { id: 'dashboard', label: '대시보드', icon: ICONS.dashboard },
    { id: 'clinical_board', label: '📡 진료보드', icon: ICONS.monitor || ICONS.dashboard },
    {
      id: 'patient_group', label: '👥 환자 관리', icon: ICONS.users,
      children: [
        { id: 'patients', label: '환자 DB', icon: ICONS.users },
        { id: 'patients_stats', label: '환자 통계', icon: ICONS.chart },
        { id: 'funnel', label: '환자 퍼널', icon: ICONS.chart },
        { id: 'consult_records', label: '상담 기록', icon: ICONS.edit },
        { id: 'consult_dashboard', label: '상담 분석', icon: ICONS.chart },
        { id: 'complaints', label: '컴플레인 기록', icon: ICONS.edit },
        { id: 'complaints_stats', label: '컴플레인 통계', icon: ICONS.chart },
        { id: 'reservations', label: '📅 예약 관리', icon: ICONS.calendar },
        { id: 'reservation_stats', label: '📅 예약 통계', icon: ICONS.chart },
        { id: 'wait_times', label: '⏱️ 대기시간 관리', icon: ICONS.clock || ICONS.calendar },
        { id: 'wait_time_stats', label: '⏱️ 대기시간 통계', icon: ICONS.chart },
      ]
    },
    {
      id: 'calls_group', label: '📞 콜 관리', icon: ICONS.phone || ICONS.message,
      children: [
        { id: 'calls_inbound', label: '인바운드', icon: ICONS.phone || ICONS.message },
        { id: 'calls_outbound', label: '아웃바운드', icon: ICONS.phone || ICONS.message },
        { id: 'calls_stats', label: '콜 통계', icon: ICONS.chart },
      ]
    },
    {
      id: 'management', label: '🏥 진료 관리', icon: ICONS.folder,
      children: [
        ...(isManager ? [{ id: 'fee_schedule', label: '수가표', icon: ICONS.pricing }] : []),
        { id: 'materials', label: '설명자료', icon: ICONS.materials },
        { id: 'pricing', label: '비용 안내', icon: ICONS.pricing },
        { id: 'cases', label: '케이스 사진', icon: ICONS.cases },
        { id: 'scripts', label: '상담 스크립트', icon: ICONS.play },
      ]
    },
    {
      id: 'kpi_group', label: '📊 분석/KPI', icon: ICONS.chart,
      children: [
        { id: 'kpi_dashboard', label: 'KPI 대시보드', icon: ICONS.dashboard },
        { id: 'kpi_stats', label: 'KPI 통계', icon: ICONS.chart },
        { id: 'kpi_benchmark', label: '🏆 벤치마킹', icon: ICONS.chart },
        { id: 'kpi_daily', label: '일간 기록', icon: ICONS.edit },
        ...(isManager ? [{ id: 'kpi_targets', label: '목표 설정', icon: ICONS.star }] : []),
      ]
    },
    {
      id: 'marketing_group', label: '📈 마케팅', icon: ICONS.chart,
      children: [
        { id: 'marketing', label: '유입 분석', icon: ICONS.chart },
        { id: 'heatmap', label: '🗺️ 유입 히트맵', icon: ICONS.chart },
        { id: 'review_mgmt', label: '⭐ 리뷰 관리', icon: ICONS.star },
        { id: 'reviews', label: '후기 관리', icon: ICONS.star },
        ...(isManager ? [{ id: 'surveys', label: '만족도 설문', icon: ICONS.star }] : []),
      ]
    },
    {
      id: 'hr', label: '💼 HR', icon: ICONS_HIRE.briefcase,
      children: [
        { id: 'hr_dashboard', label: 'HR 대시보드', icon: ICONS.dashboard },
        { id: 'hr_staff', label: '직원 관리', icon: ICONS.users },
        { id: 'gamification', label: '🏆 성과 게이미피케이션', icon: ICONS.star },
        { id: 'hire_postings', label: '채용 공고', icon: ICONS_HIRE.briefcase },
        { id: 'hire_applicants', label: '지원자 관리', icon: ICONS_HIRE.userPlus },
        { id: 'hire_interviews', label: '인터뷰', icon: ICONS.message },
        { id: 'hire_onboarding', label: '온보딩', icon: ICONS_HIRE.userCheck },
        { id: 'leave_management', label: '연차 관리', icon: ICONS.calendar },
      ]
    },
    {
      id: 'operations', label: '🏢 병원 운영', icon: ICONS.settings,
      children: [
        { id: 'notice', label: '공지사항', icon: ICONS.folder },
        { id: 'calendar', label: '일정 관리', icon: ICONS.calendar },
        { id: 'meetings', label: '회의록', icon: ICONS.edit },
        { id: 'checklists', label: '체크리스트', icon: ICONS.checklist },
        { id: 'kanban_purchase', label: '물품 구매', icon: ICONS.cart },
        { id: 'kanban_repair', label: '수리/정비', icon: ICONS.wrench },
        { id: 'parking', label: '🅿️ 주차권 관리', icon: ICONS.cart },
        { id: 'parking_stats', label: '🅿️ 주차권 통계', icon: ICONS.chart },
      ]
    },
    {
      id: 'community', label: '💬 커뮤니티', icon: ICONS.users,
      children: [
        { id: 'free', label: '자유게시판', icon: ICONS.edit },
        { id: 'praise', label: '칭찬하기', icon: ICONS.heart },
        { id: 'mistake', label: '실수노트', icon: ICONS.shield },
      ]
    },
    { id: 'messenger', label: '💬 메신저', icon: ICONS.message, hidden: true },
    { id: 'settings', label: '⚙️ 설정', icon: ICONS.settings },
  ];
  return nav;
}

/* ─── Render Main App ─── */
function renderApp() {
  if (!state.user) { renderAuth(); return; }
  
  // Check onboarding for admin users
  if (state.user.role === 'admin' && state.user.onboardingCompleted === false) {
    renderOnboardingScreen();
    return;
  }
  
  document.body.classList.add('app-loaded');
  const app = document.getElementById('app');
  const nav = getNavConfig();

  app.innerHTML = `
  <div class="app-layout">
    <aside class="sidebar ${state.sidebarOpen ? '' : ''}" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">${ICONS.logo}</div>
        <div class="sidebar-title">
          <h2>PF Manager</h2>
          <small>${state.user.hospitalName || '병원명'}</small>
        </div>
      </div>
      <nav class="sidebar-nav" id="sidebarNav"></nav>
      <div class="sidebar-footer" style="position:relative">
        <div class="sidebar-user" id="sidebarUser" style="cursor:pointer">
          <div class="sidebar-user-avatar">${(state.user.name || 'U')[0]}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${state.user.name || '사용자'}</div>
            <div class="sidebar-user-role">${state.user.role === 'admin' ? '관리자' : state.user.role === 'manager' ? '실장' : '스태프'}</div>
          </div>
          <span class="text-muted" id="userMenuChevron">${ICONS.chevronDown}</span>
        </div>
        <div class="user-popup-menu" id="userPopupMenu">
          <button class="user-popup-item" id="menuProfile">
            ${ICONS.users}<span>내 정보 수정</span>
          </button>
          <button class="user-popup-item" id="menuPassword">
            ${ICONS.shield}<span>비밀번호 변경</span>
          </button>
          <div class="user-popup-divider"></div>
          <button class="user-popup-item user-popup-danger" id="menuLogout">
            ${ICONS.logout}<span>로그아웃</span>
          </button>
        </div>
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <div class="main-content">
      <header class="main-header">
        <button class="btn-icon" id="menuToggle">${ICONS.menu}</button>
        <div class="main-header-title" id="headerTitle"></div>
        <div class="main-header-actions" id="headerActions"></div>
        <button class="chat-header-btn" id="chatHeaderBtn" title="원내 메신저">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="chat-header-badge" id="chatUnreadBadge" style="display:none">0</span>
        </button>
      </header>
      <div class="main-body" id="mainBody"></div>
    </div>
  </div>
  <div class="modal-overlay" id="modalOverlay"><div class="modal" id="modalContent"></div></div>
  <div id="toastContainer" class="toast-container"></div>
  <div id="presentationOverlay"></div>`;

  renderSidebar(nav);
  renderPage(); // async but fire-and-forget is OK here

  // Chat header button
  document.getElementById('chatHeaderBtn')?.addEventListener('click', () => {
    if (window.PFM.modules.chat) window.PFM.modules.chat.openChatPanel();
  });
  // Init chat (unread badge polling)
  setTimeout(() => { if (window.PFM.modules.chat) window.PFM.modules.chat.initChat(); }, 1000);

  // User popup menu
  const userEl = document.getElementById('sidebarUser');
  const popupMenu = document.getElementById('userPopupMenu');
  userEl.addEventListener('click', (e) => {
    e.stopPropagation();
    popupMenu.classList.toggle('open');
    document.getElementById('userMenuChevron').style.transform = popupMenu.classList.contains('open') ? 'rotate(180deg)' : '';
  });
  document.addEventListener('click', () => {
    popupMenu.classList.remove('open');
    document.getElementById('userMenuChevron').style.transform = '';
  });
  popupMenu.addEventListener('click', (e) => e.stopPropagation());
  document.getElementById('menuProfile').addEventListener('click', () => { popupMenu.classList.remove('open'); navigate('settings'); });
  document.getElementById('menuPassword').addEventListener('click', () => { popupMenu.classList.remove('open'); navigate('settings'); setTimeout(() => { const pwBtn = document.querySelector('[data-action="change-password"]'); if (pwBtn) pwBtn.click(); }, 300); });
  document.getElementById('menuLogout').addEventListener('click', logout);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });
  const menuToggle = document.getElementById('menuToggle');
  if (window.innerWidth <= 768) menuToggle.style.display = '';
  menuToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

function renderSidebar(nav) {
  const container = document.getElementById('sidebarNav');
  let html = '<div class="nav-section"><div class="nav-section-title">메인</div>';
  for (const item of nav) {
    if (item.hidden) continue;
    if (item.children) {
      const isOpen = state.openGroups[item.id];
      const isChildActive = item.children.some(c => c.id === state.currentPage);
      html += `<button class="nav-item ${isChildActive ? 'active' : ''}" data-group="${item.id}">
        ${item.icon}<span>${item.label}</span>
        <span class="nav-group-toggle ${isOpen ? 'open' : ''}">${ICONS.chevronDown}</span>
      </button>
      <div class="nav-group-children ${isOpen ? 'open' : ''}" data-group-children="${item.id}">`;
      for (const child of item.children) {
        html += `<button class="nav-item ${child.id === state.currentPage ? 'active' : ''}" data-page="${child.id}">
          ${child.icon}<span>${child.label}</span>
        </button>`;
      }
      html += '</div>';
    } else {
      html += `<button class="nav-item ${item.id === state.currentPage ? 'active' : ''}" data-page="${item.id}">
        ${item.icon}<span>${item.label}</span>
      </button>`;
    }
  }
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  container.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gid = btn.dataset.group;
      state.openGroups[gid] = !state.openGroups[gid];
      const children = container.querySelector(`[data-group-children="${gid}"]`);
      const toggle = btn.querySelector('.nav-group-toggle');
      if (children) children.classList.toggle('open');
      if (toggle) toggle.classList.toggle('open');
    });
  });
}

/* ─── Drag & Drop Kanban Engine ─── */
let _dragData = null;
function initKanbanDnD(container, onDrop) {
  container.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[draggable="true"]');
    if (!card) return;
    _dragData = { id: card.dataset.id, fromCol: card.closest('.kb-col')?.dataset.status };
    card.classList.add('kb-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });
  container.addEventListener('dragend', (e) => {
    const card = e.target.closest('[draggable="true"]');
    if (card) card.classList.remove('kb-dragging');
    container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
    _dragData = null;
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const col = e.target.closest('.kb-col');
    container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
    if (col && _dragData && col.dataset.status !== _dragData.fromCol) col.classList.add('kb-drag-over');
  });
  container.addEventListener('dragleave', (e) => {
    const col = e.target.closest('.kb-col');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('kb-drag-over');
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const col = e.target.closest('.kb-col');
    container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
    if (!col || !_dragData) return;
    const newStatus = col.dataset.status;
    if (newStatus === _dragData.fromCol) return;
    onDrop(_dragData.id, newStatus);
    _dragData = null;
  });
}

/* ─── Shared Helpers ─── */
function renderCatTabs(containerId, cats, selectedId, onSelect) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<button class="category-tab ${!selectedId ? 'active' : ''}" data-cat="">전체</button>
    ${cats.map(c => `<button class="category-tab ${c.id === selectedId ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${h(c.name)}</button>`).join('')}`;
  el.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      onSelect(tab.dataset.cat);
    });
  });
}

function showModal(title, content) {
  if (title || content) {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      ${title ? `<div class="modal-header"><h3>${title}</h3><button class="modal-close-btn" onclick="PFM.closeModal()">✕</button></div>` : ''}
      <div class="modal-body">${content || ''}</div>`;
  }
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  const modal = document.getElementById('modalContent');
  if (modal) { modal.style.maxWidth = ''; modal.style.padding = ''; }
}

function formatPrice(min, max) {
  if (min && max && min !== max) return `${min}~${max}만원`;
  if (min) return `${min}만원`;
  if (max) return `${max}만원`;
  return '상담 후 결정';
}

// esc → escapeHtml alias (DOM 방식 제거, 순수 문자열 방식 사용)
function esc(s) { return escapeHtml(s); }

function debounce(fn, ms) {
  let timer;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return Math.floor(diff/60) + '분 전';
  if (diff < 86400) return Math.floor(diff/3600) + '시간 전';
  if (diff < 604800) return Math.floor(diff/86400) + '일 전';
  return d.toLocaleDateString('ko-KR');
}

/* ─── Presentation Mode ─── */
function openPresentation(urls, startIdx) {
  let idx = startIdx || 0;
  const overlay = document.getElementById('presentationOverlay');
  
  function render() {
    overlay.innerHTML = `
      <div class="presentation-overlay">
        <button class="presentation-close" id="presClose">${ICONS.close}</button>
        <button class="presentation-nav prev" id="presPrev">${ICONS.chevronLeft}</button>
        <div class="presentation-content"><img src="${urls[idx]}" alt=""></div>
        <button class="presentation-nav next" id="presNext">${ICONS.chevronRight}</button>
        <div class="presentation-counter">${idx + 1} / ${urls.length}</div>
      </div>`;
    
    document.getElementById('presClose').addEventListener('click', () => { overlay.innerHTML = ''; });
    document.getElementById('presPrev').addEventListener('click', () => { idx = (idx - 1 + urls.length) % urls.length; render(); });
    document.getElementById('presNext').addEventListener('click', () => { idx = (idx + 1) % urls.length; render(); });
  }
  render();

  function onKey(e) {
    if (e.key === 'Escape') { overlay.innerHTML = ''; document.removeEventListener('keydown', onKey); }
    if (e.key === 'ArrowLeft') { idx = (idx - 1 + urls.length) % urls.length; render(); }
    if (e.key === 'ArrowRight') { idx = (idx + 1) % urls.length; render(); }
  }
  document.addEventListener('keydown', onKey);
}

/* ─── Lazy Module Loader ─── */
const _chunkLoaded = {};
const _chunkLoading = {};
const PAGE_CHUNK_MAP = {};  // Will be populated by build script via window._PAGE_CHUNK_MAP

async function loadModuleForPage(page) {
  const map = window._PAGE_CHUNK_MAP || PAGE_CHUNK_MAP;
  const chunk = map[page];
  if (!chunk || _chunkLoaded[chunk]) return;
  if (_chunkLoading[chunk]) return _chunkLoading[chunk];
  _chunkLoading[chunk] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/static/dist/chunks/' + chunk + '.js';
    script.onload = () => { _chunkLoaded[chunk] = true; delete _chunkLoading[chunk]; resolve(); };
    script.onerror = () => { delete _chunkLoading[chunk]; reject(new Error('모듈 로드 실패: ' + chunk)); };
    document.head.appendChild(script);
  });
  return _chunkLoading[chunk];
}

/* ─── Page Router (모듈 기반) ─── */
async function renderPage() {
  const page = state.currentPage;
  const body = document.getElementById('mainBody');
  const actions = document.getElementById('headerActions');

  // Lazy load module if needed
  const map = window._PAGE_CHUNK_MAP || {};
  if (page !== 'dashboard' && map[page] && !_chunkLoaded[map[page]]) {
    if (body) body.innerHTML = '<div style="padding:24px"><div class="skeleton skeleton-stat" style="margin-bottom:16px"></div><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div></div>';
    try {
      await loadModuleForPage(page);
    } catch(e) {
      if (body) body.innerHTML = '<div class="error-boundary"><div class="error-boundary-icon">⚠️</div><div class="error-boundary-title">모듈 로드 실패</div><div class="error-boundary-msg">' + esc(e.message) + '</div><button class="error-boundary-btn" onclick="PFM.renderPage()">🔄 다시 시도</button></div>';
      return;
    }
  }

  const M = window.PFM.modules;
  const titles = {
    dashboard: ['대시보드', ICONS.dashboard],
    materials: ['설명자료 관리', ICONS.materials],
    pricing: ['비용 안내', ICONS.pricing],
    cases: ['케이스 사진', ICONS.cases],
    scripts: ['상담 스크립트', ICONS.play],
    notice: ['공지사항', ICONS.folder],
    free: ['자유게시판', ICONS.edit],
    praise: ['칭찬하기 💛', ICONS.heart],
    mistake: ['실수노트 (이실직고)', ICONS.shield],
    kanban_purchase: ['물품 구매 요청', ICONS.cart],
    kanban_repair: ['수리/정비 요청', ICONS.wrench],
    staff_supplies: ['👔 직원용품 주문', ICONS.users],
    hr_dashboard: ['📊 HR 대시보드', ICONS.dashboard],
    hr_staff: ['👥 직원 관리', ICONS.users],
    checklists: ['체크리스트', ICONS.checklist],
    calendar: ['일정 관리', ICONS.calendar],
    marketing: ['마케팅 유입 분석', ICONS.chart],
    reviews: ['후기 관리', ICONS.star],
    hire_postings: ['채용 공고', ICONS_HIRE.briefcase],
    hire_applicants: ['지원자 관리', ICONS_HIRE.userPlus],
    hire_interviews: ['인터뷰', ICONS.message],
    hire_onboarding: ['온보딩', ICONS_HIRE.userCheck],
    clinical_board: ['📡 오늘의 진료보드', ICONS.dashboard],
    consult_records: ['📋 상담 기록', ICONS.edit],
    consult_dashboard: ['📊 상담 분석', ICONS.chart],
    fee_schedule: ['💰 수가표', ICONS.pricing],
    funnel: ['🔄 Patient Funnel', ICONS.chart],
    patients: ['👥 환자 DB', ICONS.users],
    patients_stats: ['📊 환자 통계', ICONS.chart],
    complaints: ['⚠️ 컴플레인 기록', ICONS.edit],
    complaints_stats: ['📊 컴플레인 통계', ICONS.chart],
    calls_inbound: ['📞 인바운드 콜', ICONS.phone || ICONS.message],
    calls_outbound: ['📱 아웃바운드 콜', ICONS.phone || ICONS.message],
    calls_stats: ['📊 콜 통계', ICONS.chart],
    kpi_dashboard: ['📊 KPI 대시보드', ICONS.chart],
    kpi_stats: ['📊 KPI 통계', ICONS.chart],
    kpi_benchmark: ['🏆 병원 벤치마킹', ICONS.chart],
    kpi_daily: ['📝 일간 기록', ICONS.edit],
    kpi_targets: ['🎯 목표 설정', ICONS.star],
    reservations: ['📅 예약 관리', ICONS.calendar],
    reservation_stats: ['📅 예약 통계', ICONS.chart],
    wait_times: ['⏱️ 대기시간 관리', ICONS.clock || ICONS.calendar],
    wait_time_stats: ['⏱️ 대기시간 통계', ICONS.chart],
    parking: ['🅿️ 주차권 관리', ICONS.cart],
    parking_stats: ['🅿️ 주차권 통계', ICONS.chart],
    leave_management: ['🏖️ 연차 관리', ICONS.calendar],
    meetings: ['📝 회의록', ICONS.edit],
    surveys: ['📋 만족도 설문', ICONS.star],
    heatmap: ['🗺️ 환자 유입 히트맵', ICONS.chart],
    briefing: ['📋 일일 브리핑', ICONS.dashboard],
    gamification: ['🏆 성과 게이미피케이션', ICONS.star],
    review_mgmt: ['⭐ 리뷰 통합 관리', ICONS.star],
    messenger: ['💬 원내 메신저', ICONS.message],
    settings: ['설정', ICONS.settings],
  };
  const [title, icon] = titles[state.currentPage] || ['페이지', ''];
  document.getElementById('headerTitle').innerHTML = `${icon}<span>${title}</span>`;
  actions.innerHTML = '';

  switch (state.currentPage) {
    case 'dashboard': M.dashboard.renderDashboard(body); break;
    case 'materials': M.management.renderMaterials(body, actions); break;
    case 'pricing': M.management.renderPricing(body, actions); break;
    case 'cases': M.management.renderCases(body, actions); break;
    case 'scripts': M.scripts.renderScripts(body, actions); break;
    case 'notice': case 'free': case 'praise': case 'mistake':
      M.community.renderCommunity(body, actions, state.currentPage); break;
    case 'kanban_purchase': M.community.renderKanban(body, actions, 'purchase'); break;
    case 'kanban_repair': M.community.renderKanban(body, actions, 'repair'); break;
    case 'staff_supplies': M.operations.renderStaffSupplies(body, actions); break;
    case 'hr_dashboard': M.hr.renderHRDashboard(body, actions); break;
    case 'hr_staff': M.hr.renderStaffManagement(body, actions); break;
    case 'checklists': M.operations.renderChecklists(body, actions); break;
    case 'calendar': M.operations.renderCalendar(body, actions); break;
    case 'marketing': M.operations.renderMarketing(body, actions); break;
    case 'reviews': M.operations.renderReviews(body, actions); break;
    case 'hire_postings': M.hire.renderHirePostings(body, actions); break;
    case 'hire_applicants': M.hire.renderHireApplicants(body, actions); break;
    case 'hire_interviews': M.hire.renderHireInterviews(body, actions); break;
    case 'hire_onboarding': M.hire.renderHireOnboarding(body, actions); break;
    case 'clinical_board': M.clinical.renderTreatmentBoard(body, actions); break;
    case 'consult_records': M.consult.renderConsultRecords(body, actions); break;
    case 'consult_dashboard': M.consult.renderConsultDashboard(body, actions); break;
    case 'leave_management': M.leave.renderLeaveManagement(body, actions); break;
    case 'meetings': M.meetings.renderMeetings(body, actions); break;
    case 'fee_schedule': M.feeSchedule.renderFeeSchedule(body, actions); break;
    case 'funnel': M.funnel.renderFunnel(body, actions); break;
    case 'patients': M.patients.renderPatients(body, actions); break;
    case 'patients_stats': M.patientsStats.renderPatientsStats(body, actions); break;
    case 'complaints': M.complaints.renderComplaints(body, actions); break;
    case 'complaints_stats': M.complaints.renderComplaintsStats(body, actions); break;
    case 'calls_inbound': M.callsInbound.renderCallsInbound(body, actions); break;
    case 'calls_outbound': M.callsOutbound.renderCallsOutbound(body, actions); break;
    case 'calls_stats': M.callsStats.renderCallsStats(body, actions); break;
    case 'kpi_dashboard': M.kpi.renderKpiDashboard(body, actions); break;
    case 'kpi_stats': M.kpiStats.renderKpiStats(body, actions); break;
    case 'kpi_benchmark': M.kpiStats.renderBenchmark(body, actions); break;
    case 'kpi_daily': M.kpi.renderKpiDaily(body, actions); break;
    case 'kpi_targets': M.kpi.renderKpiTargets(body, actions); break;
    case 'reservations': M.reservations.renderReservations(body, actions); break;
    case 'reservation_stats': M.reservations.renderReservationStats(body, actions); break;
    case 'wait_times': M.waitTimes.renderWaitTimes(body, actions); break;
    case 'wait_time_stats': M.waitTimes.renderWaitTimeStats(body, actions); break;
    case 'parking': M.parking.renderParking(body, actions); break;
    case 'parking_stats': M.parking.renderParkingStats(body, actions); break;
    case 'surveys': M.surveys.renderSurveys(body, actions); break;
    case 'heatmap': M.heatmap.renderHeatmap(body, actions); break;
    case 'briefing': M.briefing.renderBriefing(body, actions); break;
    case 'gamification': M.gamification.renderGamification(body, actions); break;
    case 'review_mgmt': M.reviewMgmt.renderReviewMgmt(body, actions); break;
    case 'messenger': M.chat.renderMessenger(body, actions); break;
    case 'settings': M.settings.renderSettings(body); break;
    default: body.innerHTML = '<div class="empty-state"><h3>준비 중인 페이지입니다</h3></div>';
  }
}

/* ─── Permission Helpers ─── */
function canManage() { return state.user && (state.user.role === 'admin' || state.user.role === 'manager'); }
function isAdmin() { return state.user && state.user.role === 'admin'; }
function canSeeFinancials() { return canManage(); }

/* ─── Skeleton UI Factory ─── */
function showSkeleton(container, type) {
  const templates = {
    dashboard: `<div style="padding:4px">
      <div class="funnel-summary-grid" style="margin-bottom:20px">
        <div class="skeleton skeleton-stat"></div><div class="skeleton skeleton-stat"></div>
        <div class="skeleton skeleton-stat"></div><div class="skeleton skeleton-stat"></div>
      </div>
      <div class="skeleton skeleton-card" style="height:200px"></div>
      <div class="skeleton skeleton-card" style="height:120px;margin-top:12px"></div>
    </div>`,
    list: `<div style="padding:4px">
      <div class="skeleton" style="height:36px;width:200px;margin-bottom:16px"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>`,
    table: `<div style="padding:4px">
      <div class="skeleton" style="height:36px;margin-bottom:12px"></div>
      <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
    </div>`,
    default: `<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>`,
  };
  if (container) container.innerHTML = templates[type] || templates.default;
}

/* ─── Error Boundary Wrapper ─── */
async function withErrorBoundary(container, asyncFn, skeletonType) {
  if (skeletonType) showSkeleton(container, skeletonType);
  try {
    await asyncFn();
  } catch(e) {
    console.error('[ErrorBoundary]', e);
    if (container) {
      container.innerHTML = `
        <div class="error-boundary">
          <div class="error-boundary-icon">⚠️</div>
          <div class="error-boundary-title">데이터를 불러올 수 없습니다</div>
          <div class="error-boundary-msg">${esc(e.message || '알 수 없는 오류')}</div>
          <button class="error-boundary-btn" onclick="PFM.renderPage()">🔄 다시 시도</button>
        </div>
      `;
    }
  }
}

/* ─── PFM Global Namespace (모듈 간 공유) ─── */
/* ─── Onboarding Screen ─── */
async function renderOnboardingScreen() {
  document.body.classList.remove('app-loaded');
  const app = document.getElementById('app');
  app.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:linear-gradient(135deg,#f0fdfa,#e0f2fe,#faf5ff)"><span class="loading-spinner"></span></div>';
  
  // Load onboarding chunk
  const chunkPath = '/static/dist/chunks/onboarding.js';
  try {
    if (!window.PFM?.onboarding) {
      const script = document.createElement('script');
      script.src = chunkPath;
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    if (window.PFM?.onboarding?.renderOnboarding) {
      window.PFM.onboarding.renderOnboarding(app);
    } else {
      console.error('Onboarding module not loaded');
      state.user.onboardingCompleted = true;
      localStorage.setItem('pfm_user', JSON.stringify(state.user));
      renderApp();
    }
  } catch(e) {
    console.error('Failed to load onboarding:', e);
    state.user.onboardingCompleted = true;
    localStorage.setItem('pfm_user', JSON.stringify(state.user));
    renderApp();
  }
}

window.PFM = {
  // State & Core
  state, api, apiForm, toast, showToast: toast, navigate, logout,
  // Icons
  ICONS, ICONS_HIRE,
  // UI Helpers
  showModal, closeModal, renderCatTabs, formatPrice,
  esc, debounce, timeAgo, openPresentation, initKanbanDnD,
  // Skeleton & Error Boundary
  showSkeleton, withErrorBoundary,
  // Permission helpers
  canManage, isAdmin, canSeeFinancials,
  // Page rendering (모듈이 다른 모듈 호출 시 필요)
  renderPage, renderApp,
  // Module registry
  modules: {},
};

/* ─── Init ─── */
// 모듈 로드 완료 후 실행 (DOMContentLoaded에서 호출)
function boot() {
  getStoredAuth();
  // 해시 변경 감지 (초대 링크 등)
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#join/') && !state.user) {
      renderAuth();
    }
  });
  renderApp();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// 모듈 로드 완료 대기
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  // 모듈이 아직 로드 안됐을 수 있으므로 약간 지연
  setTimeout(boot, 10);
}

})();
