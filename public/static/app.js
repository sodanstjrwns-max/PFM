/* ═══════════════════════════════════════════════════
   Patient Funnel Manager - Frontend Application
   ═══════════════════════════════════════════════════ */
(function() {
'use strict';

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
  if (opts.json) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.json);
    delete opts.json;
  }
  const res = await fetch(path, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API 오류');
  return data;
}

async function apiForm(path, formData) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + state.token },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '업로드 오류');
  return data;
}

/* ─── Toast ─── */
function toast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ─── Router ─── */
function navigate(page) {
  state.currentPage = page;
  renderApp();
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
        <div class="form-group" id="regHospitalField" style="display:none">
          <label>병원명</label>
          <input class="form-input" type="text" id="regHospital" placeholder="예: 서울비디치과">
        </div>
        <div class="form-group" id="regNameField" style="display:none">
          <label>이름</label>
          <input class="form-input" type="text" id="regName" placeholder="관리자 이름">
        </div>
        <div class="form-group">
          <label>이메일</label>
          <input class="form-input" type="email" id="authEmail" placeholder="admin@hospital.com" required>
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input class="form-input" type="password" id="authPassword" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-full" id="authSubmitBtn">로그인</button>
      </form>
    </div>
  </div>`;

  let mode = 'login';
  const tabs = app.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      document.getElementById('regHospitalField').style.display = mode === 'register' ? '' : 'none';
      document.getElementById('regNameField').style.display = mode === 'register' ? '' : 'none';
      document.getElementById('authSubmitBtn').textContent = mode === 'login' ? '로그인' : '병원 등록하기';
      document.getElementById('authError').classList.remove('show');
    });
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
      } else {
        const data = await api('/api/auth/register', { method: 'POST', json: {
          hospitalName: document.getElementById('regHospital').value,
          email: document.getElementById('authEmail').value,
          password: document.getElementById('authPassword').value,
          name: document.getElementById('regName').value,
        }});
        saveAuth(data.token, data.user);
      }
      renderApp();
    } catch(err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = mode === 'login' ? '로그인' : '병원 등록하기';
    }
  });
}

/* ─── Nav Config ─── */
/* ─── Icons (additional) ─── */
const ICONS_HIRE = {
  briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  userPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/></svg>`,
  userCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>`,
};

function getNavConfig() {
  return [
    { id: 'dashboard', label: '대시보드', icon: ICONS.dashboard },
    { id: 'treatment_board', label: '📡 진료보드', icon: ICONS.monitor || ICONS.dashboard },
    {
      id: 'consultation_group',
      label: '상담관리',
      icon: ICONS.message,
      children: [
        { id: 'consultation_pipeline', label: '상담 파이프라인', icon: ICONS.users },
        { id: 'consultation_stats', label: '전환율 분석', icon: ICONS.chart },
      ]
    },
    {
      id: 'management',
      label: '진료 관리',
      icon: ICONS.folder,
      children: [
        { id: 'materials', label: '설명자료', icon: ICONS.materials },
        { id: 'pricing', label: '비용 안내', icon: ICONS.pricing },
        { id: 'cases', label: '케이스 사진', icon: ICONS.cases },
        { id: 'scripts', label: '상담 스크립트', icon: ICONS.play },
      ]
    },
    {
      id: 'community',
      label: '커뮤니티',
      icon: ICONS.users,
      children: [
        { id: 'notice', label: '공지사항', icon: ICONS.folder },
        { id: 'free', label: '자유게시판', icon: ICONS.edit },
        { id: 'praise', label: '칭찬하기', icon: ICONS.heart },
        { id: 'mistake', label: '실수노트', icon: ICONS.shield },
      ]
    },
    {
      id: 'hr',
      label: 'HR',
      icon: ICONS_HIRE.briefcase,
      children: [
        { id: 'hire_postings', label: '채용 공고', icon: ICONS_HIRE.briefcase },
        { id: 'hire_applicants', label: '지원자 관리', icon: ICONS_HIRE.userPlus },
        { id: 'hire_interviews', label: '인터뷰', icon: ICONS.message },
        { id: 'hire_onboarding', label: '온보딩', icon: ICONS_HIRE.userCheck },
        { id: 'leave_management', label: '연차 관리', icon: ICONS.calendar },
      ]
    },
    {
      id: 'operations',
      label: '병원 운영',
      icon: ICONS.settings,
      children: [
        { id: 'kanban_purchase', label: '물품 구매', icon: ICONS.cart },
        { id: 'kanban_repair', label: '수리/정비', icon: ICONS.wrench },
        { id: 'checklists', label: '체크리스트', icon: ICONS.checklist },
        { id: 'calendar', label: '일정 관리', icon: ICONS.calendar },
      ]
    },
    {
      id: 'marketing_group',
      label: '마케팅',
      icon: ICONS.chart,
      children: [
        { id: 'marketing', label: '유입 분석', icon: ICONS.chart },
        { id: 'reviews', label: '후기 관리', icon: ICONS.star },
      ]
    },
    { id: 'settings', label: '설정', icon: ICONS.settings },
  ];
}

/* ─── Render Main App ─── */
function renderApp() {
  if (!state.user) { renderAuth(); return; }
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
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebarUser">
          <div class="sidebar-user-avatar">${(state.user.name || 'U')[0]}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${state.user.name || '사용자'}</div>
            <div class="sidebar-user-role">${state.user.role === 'admin' ? '관리자' : '스태프'}</div>
          </div>
          <span style="color:var(--text-muted);cursor:pointer" id="logoutBtn">${ICONS.logout}</span>
        </div>
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    <div class="main-content">
      <header class="main-header">
        <button class="btn-icon" id="menuToggle" style="display:none">${ICONS.menu}</button>
        <div class="main-header-title" id="headerTitle"></div>
        <div class="main-header-actions" id="headerActions"></div>
      </header>
      <div class="main-body" id="mainBody"></div>
    </div>
  </div>
  <div class="modal-overlay" id="modalOverlay"><div class="modal" id="modalContent"></div></div>
  <div id="toastContainer" class="toast-container"></div>
  <div id="presentationOverlay"></div>`;

  renderSidebar(nav);
  renderPage();

  // Events
  document.getElementById('logoutBtn').addEventListener('click', logout);
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

/* ─── Page Router ─── */
function renderPage() {
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
    checklists: ['체크리스트', ICONS.checklist],
    calendar: ['일정 관리', ICONS.calendar],
    marketing: ['마케팅 유입 분석', ICONS.chart],
    reviews: ['후기 관리', ICONS.star],
    hire_postings: ['채용 공고', ICONS_HIRE.briefcase],
    hire_applicants: ['지원자 관리', ICONS_HIRE.userPlus],
    hire_interviews: ['인터뷰', ICONS.message],
    hire_onboarding: ['온보딩', ICONS_HIRE.userCheck],
    treatment_board: ['📡 오늘의 진료보드', ICONS.dashboard],
    consultation_pipeline: ['💬 상담 파이프라인', ICONS.message],
    consultation_stats: ['📊 전환율 분석', ICONS.chart],
    leave_management: ['🏖️ 연차 관리', ICONS.calendar],
    settings: ['설정', ICONS.settings],
  };
  const [title, icon] = titles[state.currentPage] || ['페이지', ''];
  document.getElementById('headerTitle').innerHTML = `${icon}<span>${title}</span>`;

  const body = document.getElementById('mainBody');
  const actions = document.getElementById('headerActions');
  actions.innerHTML = '';

  switch (state.currentPage) {
    case 'dashboard': renderDashboard(body); break;
    case 'materials': renderMaterials(body, actions); break;
    case 'pricing': renderPricing(body, actions); break;
    case 'cases': renderCases(body, actions); break;
    case 'scripts': renderScripts(body, actions); break;
    case 'notice': case 'free': case 'praise': case 'mistake':
      renderCommunity(body, actions, state.currentPage); break;
    case 'kanban_purchase': renderKanban(body, actions, 'purchase'); break;
    case 'kanban_repair': renderKanban(body, actions, 'repair'); break;
    case 'checklists': renderChecklists(body, actions); break;
    case 'calendar': renderCalendar(body, actions); break;
    case 'marketing': renderMarketing(body, actions); break;
    case 'reviews': renderReviews(body, actions); break;
    case 'hire_postings': renderHirePostings(body, actions); break;
    case 'hire_applicants': renderHireApplicants(body, actions); break;
    case 'hire_interviews': renderHireInterviews(body, actions); break;
    case 'hire_onboarding': renderHireOnboarding(body, actions); break;
    case 'treatment_board': renderTreatmentBoard(body, actions); break;
    case 'consultation_pipeline': renderConsultationPipeline(body, actions); break;
    case 'consultation_stats': renderConsultationStats(body, actions); break;
    case 'leave_management': renderLeaveManagement(body, actions); break;
    case 'settings': renderSettings(body); break;
    default: body.innerHTML = '<div class="empty-state"><h3>준비 중인 페이지입니다</h3></div>';
  }
}

/* ─── Dashboard ─── */
async function renderDashboard(body) {
  body.innerHTML = `
    <div class="dashboard-grid" id="dashStats">
      ${[1,2,3,4].map(() => `<div class="stat-card" style="opacity:0.5"><div class="stat-card-icon teal"><span class="loading-spinner"></span></div><div class="stat-card-body"><div class="stat-card-label">로딩중...</div></div></div>`).join('')}
    </div>
    <div class="section-title">${ICONS.folder}<span>빠른 메뉴</span></div>
    <div class="quick-links">
      <div class="quick-link-card" data-goto="materials">
        <div class="quick-link-icon teal-bg">📖</div>
        <div class="quick-link-text"><h3>설명자료</h3><p>환자 교육 자료 관리</p></div>
      </div>
      <div class="quick-link-card" data-goto="pricing">
        <div class="quick-link-icon blue-bg">💰</div>
        <div class="quick-link-text"><h3>비용 안내</h3><p>시술별 비용 관리</p></div>
      </div>
      <div class="quick-link-card" data-goto="cases">
        <div class="quick-link-icon amber-bg">📸</div>
        <div class="quick-link-text"><h3>케이스 사진</h3><p>Before/After 포트폴리오</p></div>
      </div>
      <div class="quick-link-card" data-goto="settings">
        <div class="quick-link-icon purple-bg">⚙️</div>
        <div class="quick-link-text"><h3>설정</h3><p>병원 정보 및 계정</p></div>
      </div>
      <div class="quick-link-card" data-goto="praise">
        <div class="quick-link-icon" style="background:#fce7f3">💛</div>
        <div class="quick-link-text"><h3>칭찬하기</h3><p>동료에게 감사 전하기</p></div>
      </div>
      <div class="quick-link-card" data-goto="kanban_purchase">
        <div class="quick-link-icon" style="background:#ecfdf5">🛒</div>
        <div class="quick-link-text"><h3>물품 구매</h3><p>필요 물품 요청</p></div>
      </div>
      <div class="quick-link-card" data-goto="checklists">
        <div class="quick-link-icon" style="background:#f0fdf4">✅</div>
        <div class="quick-link-text"><h3>체크리스트</h3><p>일일 점검 체크</p></div>
      </div>
      <div class="quick-link-card" data-goto="scripts">
        <div class="quick-link-icon" style="background:#eff6ff">🎯</div>
        <div class="quick-link-text"><h3>상담 스크립트</h3><p>시술별 상담 가이드</p></div>
      </div>
      <div class="quick-link-card" data-goto="hire_postings">
        <div class="quick-link-icon" style="background:#f0fdf4">💼</div>
        <div class="quick-link-text"><h3>채용 관리</h3><p>PF Hire 채용 모듈</p></div>
      </div>
    </div>`;

  body.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.goto));
  });

  try {
    const stats = await api('/api/protected/dashboard');
    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon teal">${ICONS.materials}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">설명자료</div>
          <div class="stat-card-value">${stats.materials}</div>
          <div class="stat-card-sub">등록된 자료</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon blue">${ICONS.pricing}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">비용 항목</div>
          <div class="stat-card-value">${stats.pricing}</div>
          <div class="stat-card-sub">시술 항목</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon amber">${ICONS.cases}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">케이스</div>
          <div class="stat-card-value">${stats.cases}</div>
          <div class="stat-card-sub">등록된 케이스</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon purple">${ICONS.eye}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">케이스 사진</div>
          <div class="stat-card-value">${stats.caseImages}</div>
          <div class="stat-card-sub">총 이미지</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#ec4899">${ICONS.heart}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">커뮤니티</div>
          <div class="stat-card-value">${stats.posts}</div>
          <div class="stat-card-sub">게시글</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706">${ICONS.cart}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">진행중 요청</div>
          <div class="stat-card-value">${stats.pendingTasks}</div>
          <div class="stat-card-sub">물품/수리</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#059669">${ICONS_HIRE.briefcase}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">채용 공고</div>
          <div class="stat-card-value">${stats.openJobs}</div>
          <div class="stat-card-sub">진행중</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:linear-gradient(135deg,#ede9fe,#c4b5fd);color:#7c3aed">${ICONS_HIRE.userPlus}</div>
        <div class="stat-card-body">
          <div class="stat-card-label">지원자</div>
          <div class="stat-card-value">${stats.activeApplicants}</div>
          <div class="stat-card-sub">검토 대기</div>
        </div>
      </div>`;
  } catch(e) { console.error('Dashboard load error:', e); }
}

/* ─── Materials ─── */
async function renderMaterials(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addMaterialBtn">${ICONS.plus} 자료 추가</button>`;
  
  body.innerHTML = `
    <div class="module-header">
      <div class="search-input">${ICONS.search}<input type="text" id="matSearch" placeholder="자료 검색..."></div>
    </div>
    <div class="category-tabs" id="matCatTabs"></div>
    <div id="matContent"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  let cats = [];
  let selectedCat = '';
  let searchTerm = '';

  try { cats = await api('/api/protected/categories/materials'); } catch(e) {}
  renderCatTabs('matCatTabs', cats, selectedCat, (id) => { selectedCat = id; loadMats(); });

  async function loadMats() {
    const container = document.getElementById('matContent');
    container.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    try {
      let url = '/api/protected/materials?';
      if (selectedCat) url += 'category=' + selectedCat + '&';
      if (searchTerm) url += 'search=' + encodeURIComponent(searchTerm);
      const materials = await api(url);
      if (!materials.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.materials}<h3>등록된 설명자료가 없습니다</h3><p>위의 "자료 추가" 버튼으로 시작해보세요</p></div>`;
        return;
      }
      container.innerHTML = `<div class="cards-grid">${materials.map(m => `
        <div class="content-card" data-id="${m.id}">
          <div class="content-card-img">${m.file_type === 'image'
            ? `<img src="${m.file_url}" alt="${m.title}" loading="lazy">`
            : m.file_type === 'video' ? '🎬' : '📄'}</div>
          <div class="content-card-body">
            <div class="content-card-title">${esc(m.title)}</div>
            <div class="content-card-meta">
              <span class="content-card-badge">${esc(m.category_name || '')}</span>
              <span>${m.file_type}</span>
            </div>
          </div>
        </div>`).join('')}</div>`;
      
      container.querySelectorAll('.content-card').forEach(card => {
        card.addEventListener('click', () => {
          const m = materials.find(x => x.id === card.dataset.id);
          if (m && m.file_type === 'image') openPresentation([m.file_url], 0);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }

  loadMats();

  document.getElementById('matSearch').addEventListener('input', debounce((e) => {
    searchTerm = e.target.value;
    loadMats();
  }, 300));

  document.getElementById('addMaterialBtn').addEventListener('click', () => {
    openAddMaterialModal(cats, () => loadMats());
  });
}

function openAddMaterialModal(cats, onSuccess) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>설명자료 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      <form id="addMatForm" class="auth-form">
        <div class="form-group">
          <label>카테고리</label>
          <select class="form-input" id="matCat">
            <option value="">카테고리 선택</option>
            ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>자료 제목</label>
          <input class="form-input" type="text" id="matTitle" placeholder="예: 임플란트 시술 과정">
        </div>
        <div class="form-group">
          <label>설명</label>
          <input class="form-input" type="text" id="matDesc" placeholder="간단한 설명 (선택)">
        </div>
        <div class="form-group">
          <label>파일</label>
          <div class="upload-area" id="matUploadArea">
            ${ICONS.upload}
            <p>클릭하거나 파일을 드래그하세요</p>
            <p style="font-size:11px;color:var(--text-muted)">이미지, PDF, 동영상</p>
          </div>
          <input type="file" id="matFile" accept="image/*,video/*,.pdf" style="display:none">
          <img id="matPreview" class="upload-preview" style="display:none">
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="matSubmitBtn">추가</button>
    </div>`;
  showModal();

  const fileInput = document.getElementById('matFile');
  const uploadArea = document.getElementById('matUploadArea');
  const preview = document.getElementById('matPreview');
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file && file.type.startsWith('image/')) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    }
    uploadArea.querySelector('p').textContent = file ? file.name : '클릭하거나 파일을 드래그하세요';
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('matSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('matSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px"></span> 업로드 중...';
    try {
      const fd = new FormData();
      fd.append('category_id', document.getElementById('matCat').value);
      fd.append('title', document.getElementById('matTitle').value);
      fd.append('description', document.getElementById('matDesc').value);
      fd.append('file', fileInput.files[0]);
      await apiForm('/api/protected/materials', fd);
      toast('자료가 추가되었습니다', 'success');
      closeModal();
      onSuccess();
    } catch(e) {
      toast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = '추가';
    }
  });
}

/* ─── Pricing ─── */
async function renderPricing(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addPricingBtn">${ICONS.plus} 항목 추가</button>`;

  body.innerHTML = `
    <div class="category-tabs" id="prcCatTabs"></div>
    <div id="prcContent"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  let cats = [];
  let selectedCat = '';

  try { cats = await api('/api/protected/categories/pricing'); } catch(e) {}
  renderCatTabs('prcCatTabs', cats, selectedCat, (id) => { selectedCat = id; loadPrc(); });

  async function loadPrc() {
    const container = document.getElementById('prcContent');
    container.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    try {
      let url = '/api/protected/pricing?';
      if (selectedCat) url += 'category=' + selectedCat;
      const items = await api(url);
      if (!items.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.pricing}<h3>등록된 비용 항목이 없습니다</h3><p>"항목 추가" 버튼으로 시술별 비용을 등록하세요</p></div>`;
        return;
      }
      container.innerHTML = `<table class="pricing-table">
        <thead><tr><th>카테고리</th><th>시술명</th><th>비용</th><th>설명</th><th style="width:80px">관리</th></tr></thead>
        <tbody>${items.map(p => `<tr data-id="${p.id}">
          <td><span class="content-card-badge">${esc(p.category_name || '')}</span></td>
          <td style="font-weight:600">${esc(p.procedure_name)}</td>
          <td><span class="price-value">${formatPrice(p.price_min, p.price_max)}</span></td>
          <td style="color:var(--text-secondary);font-size:12px">${esc(p.description || '-')}</td>
          <td>
            <button class="btn-icon edit-prc" data-id="${p.id}" title="수정">${ICONS.edit}</button>
            <button class="btn-icon del-prc" data-id="${p.id}" title="삭제">${ICONS.trash}</button>
          </td>
        </tr>`).join('')}</tbody></table>`;

      container.querySelectorAll('.del-prc').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('삭제하시겠습니까?')) return;
          try {
            await api('/api/protected/pricing/' + btn.dataset.id, { method: 'DELETE' });
            toast('삭제되었습니다', 'success');
            loadPrc();
          } catch(e) { toast(e.message, 'error'); }
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }

  loadPrc();

  document.getElementById('addPricingBtn').addEventListener('click', () => {
    openAddPricingModal(cats, () => loadPrc());
  });
}

function openAddPricingModal(cats, onSuccess) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>비용 항목 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      <form id="addPrcForm" class="auth-form">
        <div class="form-grid">
          <div class="form-group full">
            <label>카테고리</label>
            <select class="form-input" id="prcCat">
              <option value="">카테고리 선택</option>
              ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full">
            <label>시술명</label>
            <input class="form-input" type="text" id="prcName" placeholder="예: 세라믹 인레이">
          </div>
          <div class="form-group">
            <label>최소 비용 (만원)</label>
            <input class="form-input" type="number" id="prcMin" placeholder="30">
          </div>
          <div class="form-group">
            <label>최대 비용 (만원)</label>
            <input class="form-input" type="number" id="prcMax" placeholder="50">
          </div>
          <div class="form-group full">
            <label>설명</label>
            <input class="form-input" type="text" id="prcDesc" placeholder="간단한 설명 (선택)">
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="prcSubmitBtn">추가</button>
    </div>`;
  showModal();

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('prcSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('prcSubmitBtn');
    btn.disabled = true;
    try {
      await api('/api/protected/pricing', { method: 'POST', json: {
        category_id: document.getElementById('prcCat').value,
        procedure_name: document.getElementById('prcName').value,
        price_min: parseFloat(document.getElementById('prcMin').value) || null,
        price_max: parseFloat(document.getElementById('prcMax').value) || null,
        description: document.getElementById('prcDesc').value,
      }});
      toast('비용 항목이 추가되었습니다', 'success');
      closeModal();
      onSuccess();
    } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
  });
}

/* ─── Cases ─── */
async function renderCases(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addCaseBtn">${ICONS.plus} 케이스 등록</button>`;

  body.innerHTML = `
    <div class="category-tabs" id="caseCatTabs"></div>
    <div id="caseContent"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  let cats = [];
  let selectedCat = '';

  try { cats = await api('/api/protected/categories/cases'); } catch(e) {}
  renderCatTabs('caseCatTabs', cats, selectedCat, (id) => { selectedCat = id; loadCases(); });

  async function loadCases() {
    const container = document.getElementById('caseContent');
    container.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    try {
      let url = '/api/protected/cases?';
      if (selectedCat) url += 'category=' + selectedCat;
      const cases = await api(url);
      if (!cases.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.cases}<h3>등록된 케이스가 없습니다</h3><p>"케이스 등록" 버튼으로 치료 사진을 등록하세요</p></div>`;
        return;
      }
      container.innerHTML = `<div class="cards-grid">${cases.map(cs => `
        <div class="content-card" data-id="${cs.id}">
          <div class="content-card-img">📸</div>
          <div class="content-card-body">
            <div class="content-card-title">${esc(cs.title)}</div>
            <div class="content-card-meta">
              <span class="content-card-badge">${esc(cs.category_name || '')}</span>
              <span>사진 ${cs.image_count || 0}장</span>
              ${cs.patient_gender ? `<span>${cs.patient_gender}</span>` : ''}
              ${cs.patient_age ? `<span>${cs.patient_age}</span>` : ''}
            </div>
          </div>
        </div>`).join('')}</div>`;

      container.querySelectorAll('.content-card').forEach(card => {
        card.addEventListener('click', () => openCaseDetail(card.dataset.id));
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }

  loadCases();

  document.getElementById('addCaseBtn').addEventListener('click', () => {
    openAddCaseModal(cats, () => loadCases());
  });
}

function openAddCaseModal(cats, onSuccess) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>케이스 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      <form class="auth-form">
        <div class="form-grid">
          <div class="form-group full">
            <label>카테고리</label>
            <select class="form-input" id="caseCat">
              <option value="">선택</option>
              ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full">
            <label>케이스 제목</label>
            <input class="form-input" type="text" id="caseTitle" placeholder="예: 상악 전치부 임플란트">
          </div>
          <div class="form-group">
            <label>환자 나이</label>
            <input class="form-input" type="text" id="caseAge" placeholder="예: 40대">
          </div>
          <div class="form-group">
            <label>성별</label>
            <select class="form-input" id="caseGender"><option value="">선택</option><option>남</option><option>여</option></select>
          </div>
          <div class="form-group full">
            <label>치료 기간</label>
            <input class="form-input" type="text" id="casePeriod" placeholder="예: 3개월">
          </div>
          <div class="form-group full">
            <label>설명</label>
            <textarea class="form-input" id="caseDesc" rows="3" placeholder="케이스 설명"></textarea>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="caseSubmitBtn">등록</button>
    </div>`;
  showModal();

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('caseSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('caseSubmitBtn');
    btn.disabled = true;
    try {
      await api('/api/protected/cases', { method: 'POST', json: {
        category_id: document.getElementById('caseCat').value,
        title: document.getElementById('caseTitle').value,
        description: document.getElementById('caseDesc').value,
        patient_age: document.getElementById('caseAge').value,
        patient_gender: document.getElementById('caseGender').value,
        treatment_period: document.getElementById('casePeriod').value,
      }});
      toast('케이스가 등록되었습니다', 'success');
      closeModal();
      onSuccess();
    } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
  });
}

async function openCaseDetail(caseId) {
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '720px';
  modal.innerHTML = `<div class="modal-body" style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>`;
  showModal();

  try {
    const cs = await api('/api/protected/cases/' + caseId);
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${esc(cs.title)}</h3>
        <div style="display:flex;gap:8px">
          <button class="btn-icon" id="caseDeleteBtn" title="삭제">${ICONS.trash}</button>
          <button class="btn-icon" id="modalClose">${ICONS.close}</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="case-detail-header">
          <div class="case-meta-pills">
            <span class="meta-pill">📂 ${esc(cs.category_name || '')}</span>
            ${cs.patient_age ? `<span class="meta-pill">🎂 ${esc(cs.patient_age)}</span>` : ''}
            ${cs.patient_gender ? `<span class="meta-pill">👤 ${esc(cs.patient_gender)}</span>` : ''}
            ${cs.treatment_period ? `<span class="meta-pill">⏱️ ${esc(cs.treatment_period)}</span>` : ''}
          </div>
          ${cs.description ? `<p style="margin-top:12px;color:var(--text-secondary);font-size:13px">${esc(cs.description)}</p>` : ''}
        </div>
        
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="section-title" style="margin-bottom:0">${ICONS.cases}<span>케이스 사진</span></div>
          <button class="btn btn-primary btn-sm" id="addCaseImgBtn">${ICONS.plus} 사진 추가</button>
        </div>
        
        ${cs.images && cs.images.length ? `
          <div class="case-images-grid">${cs.images.map((img, i) => `
            <div class="case-image-card">
              <img src="${img.image_url}" alt="${img.caption || ''}" loading="lazy" data-idx="${i}">
              <span class="case-image-type ${img.image_type}">${img.image_type === 'before' ? 'Before' : img.image_type === 'after' ? 'After' : 'During'}</span>
            </div>`).join('')}</div>
        ` : `<div class="empty-state" style="padding:30px">${ICONS.upload}<h3>사진을 추가해주세요</h3></div>`}
      </div>`;
    
    document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth = ''; closeModal(); });
    document.getElementById('caseDeleteBtn').addEventListener('click', async () => {
      if (!confirm('이 케이스를 삭제하시겠습니까?')) return;
      try {
        await api('/api/protected/cases/' + caseId, { method: 'DELETE' });
        toast('삭제되었습니다', 'success');
        modal.style.maxWidth = '';
        closeModal();
        renderPage();
      } catch(e) { toast(e.message, 'error'); }
    });

    // Photo click -> presentation mode
    if (cs.images && cs.images.length) {
      const urls = cs.images.map(img => img.image_url);
      modal.querySelectorAll('.case-image-card img').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => openPresentation(urls, parseInt(img.dataset.idx)));
      });
    }

    document.getElementById('addCaseImgBtn').addEventListener('click', () => {
      openAddCaseImageModal(caseId, () => openCaseDetail(caseId));
    });
  } catch(e) { modal.innerHTML = `<div class="modal-body"><h3>로딩 실패</h3></div>`; }
}

function openAddCaseImageModal(caseId, onSuccess) {
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '';
  modal.innerHTML = `
    <div class="modal-header"><h3>케이스 사진 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      <form class="auth-form">
        <div class="form-group">
          <label>사진 유형</label>
          <select class="form-input" id="imgType">
            <option value="before">Before (치료 전)</option>
            <option value="during">During (치료 중)</option>
            <option value="after">After (치료 후)</option>
          </select>
        </div>
        <div class="form-group">
          <label>캡션</label>
          <input class="form-input" type="text" id="imgCaption" placeholder="사진 설명 (선택)">
        </div>
        <div class="form-group">
          <label>사진</label>
          <div class="upload-area" id="imgUploadArea">${ICONS.upload}<p>사진을 선택해주세요</p></div>
          <input type="file" id="imgFile" accept="image/*" style="display:none">
          <img id="imgPreview" class="upload-preview" style="display:none">
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="imgSubmitBtn">업로드</button>
    </div>`;
  showModal();

  const fileInput = document.getElementById('imgFile');
  document.getElementById('imgUploadArea').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      document.getElementById('imgPreview').src = URL.createObjectURL(file);
      document.getElementById('imgPreview').style.display = 'block';
      document.getElementById('imgUploadArea').querySelector('p').textContent = file.name;
    }
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  document.getElementById('imgSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('imgSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px"></span>';
    try {
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('image_type', document.getElementById('imgType').value);
      fd.append('caption', document.getElementById('imgCaption').value);
      await apiForm('/api/protected/cases/' + caseId + '/images', fd);
      toast('사진이 추가되었습니다', 'success');
      closeModal();
      onSuccess();
    } catch(e) { toast(e.message, 'error'); btn.disabled = false; btn.textContent = '업로드'; }
  });
}

/* ─── Community (공지, 자유, 칭찬, 실수노트) ─── */
async function renderCommunity(body, actions, boardType) {
  const labels = { notice:'공지사항', free:'자유게시판', praise:'칭찬하기', mistake:'실수노트 (이실직고)' };
  const emojis = { notice:'📢', free:'💬', praise:'💛', mistake:'📝' };
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addPostBtn">${ICONS.plus} 글쓰기</button>`;

  body.innerHTML = `<div id="postList" style="max-width:800px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadPosts() {
    const container = document.getElementById('postList');
    try {
      const posts = await api('/api/protected/posts?board=' + boardType);
      if (!posts.length) {
        container.innerHTML = `<div class="empty-state">${emojis[boardType]||'📋'}<h3>${labels[boardType]}이 비어있습니다</h3><p>첫 글을 작성해보세요!</p></div>`;
        return;
      }
      container.innerHTML = posts.map(p => `
        <div class="post-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:10px;cursor:pointer" data-id="${p.id}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            ${p.is_pinned ? '<span style="color:var(--danger);font-size:11px;font-weight:700">📌 고정</span>' : ''}
            ${boardType==='praise' && p.target_name ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">To. ${esc(p.target_name)}</span>` : ''}
            <span style="font-size:11px;color:var(--text-muted)">${p.is_anonymous ? '익명' : esc(p.author_name)}</span>
            <span style="font-size:11px;color:var(--text-muted)">${timeAgo(p.created_at)}</span>
          </div>
          <div style="font-weight:600;font-size:15px;color:var(--text)">${esc(p.title)}</div>
          ${p.content ? `<div style="font-size:13px;color:var(--text-secondary);margin-top:4px;white-space:pre-line;max-height:60px;overflow:hidden">${esc(p.content)}</div>` : ''}
          <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:var(--text-muted)">
            <span>❤️ ${p.like_count||0}</span>
            <span>👁️ ${p.view_count||0}</span>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', () => openPostDetail(card.dataset.id, boardType, loadPosts));
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadPosts();

  document.getElementById('addPostBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>${emojis[boardType]} ${labels[boardType]} 글쓰기</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body">
        <form class="auth-form">
          ${boardType==='praise' ? `<div class="form-group"><label>칭찬 대상</label><input class="form-input" id="postTarget" placeholder="칭찬할 동료 이름"></div>` : ''}
          <div class="form-group"><label>제목</label><input class="form-input" id="postTitle" placeholder="${boardType==='praise'?'어떤 점이 좋았나요?':boardType==='mistake'?'어떤 실수가 있었나요?':'제목'}"></div>
          <div class="form-group"><label>내용</label><textarea class="form-input" id="postContent" rows="5" placeholder="${boardType==='mistake'?'실수 내용과 개선 방안을 적어주세요. 솔직한 이실직고가 팀을 성장시킵니다!':'내용을 입력하세요'}"></textarea></div>
          ${boardType==='mistake' ? `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);cursor:pointer"><input type="checkbox" id="postAnon"> 익명으로 작성</label>` : ''}
        </form>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="postSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('postSubmitBtn').addEventListener('click', async () => {
      const title = document.getElementById('postTitle').value.trim();
      if (!title) { toast('제목을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('postSubmitBtn');
      btn.disabled = true;
      try {
        await api('/api/protected/posts', { method:'POST', json:{
          board_type: boardType,
          title: title,
          content: document.getElementById('postContent').value,
          target_name: document.getElementById('postTarget')?.value || '',
          is_anonymous: document.getElementById('postAnon')?.checked || false,
        }});
        toast('등록되었습니다!', 'success');
        closeModal(); loadPosts();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

async function openPostDetail(postId, boardType, reload) {
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `<div class="modal-body" style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>`;
  showModal();
  try {
    const posts = await api('/api/protected/posts?board=' + boardType);
    const post = posts.find(p => p.id === postId);
    if (!post) throw new Error('Not found');
    const comments = await api('/api/protected/posts/' + postId + '/comments');
    modal.innerHTML = `
      <div class="modal-header"><h3>${esc(post.title)}</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:12px;font-size:12px;color:var(--text-muted)">
          <span>${post.is_anonymous ? '익명' : esc(post.author_name)}</span>
          <span>${timeAgo(post.created_at)}</span>
          ${post.target_name ? `<span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;font-size:11px">To. ${esc(post.target_name)}</span>` : ''}
        </div>
        <div style="white-space:pre-line;font-size:14px;line-height:1.8;min-height:60px">${esc(post.content)}</div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" id="likeBtn">❤️ 좋아요 (${post.like_count||0})</button>
          <button class="btn btn-danger btn-sm" id="delPostBtn" style="margin-left:auto">${ICONS.trash} 삭제</button>
        </div>
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
        <div class="section-title" style="font-size:14px">${ICONS.message}<span>댓글 (${comments.length})</span></div>
        <div id="commentList">${comments.map(cm => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border-light);font-size:13px">
            <span style="font-weight:600">${esc(cm.author_name)}</span>
            <span style="color:var(--text-muted);font-size:11px;margin-left:6px">${timeAgo(cm.created_at)}</span>
            <div style="margin-top:2px;color:var(--text-secondary)">${esc(cm.content)}</div>
          </div>
        `).join('')}</div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <input class="form-input" id="commentInput" placeholder="댓글을 입력하세요" style="flex:1">
          <button class="btn btn-primary btn-sm" id="commentBtn">등록</button>
        </div>
      </div>`;
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('likeBtn').addEventListener('click', async () => {
      await api('/api/protected/posts/' + postId + '/like', { method: 'POST' });
      openPostDetail(postId, boardType, reload);
    });
    document.getElementById('delPostBtn').addEventListener('click', async () => {
      if (!confirm('삭제하시겠습니까?')) return;
      await api('/api/protected/posts/' + postId, { method: 'DELETE' });
      toast('삭제됨', 'success'); closeModal(); reload();
    });
    document.getElementById('commentBtn').addEventListener('click', async () => {
      const input = document.getElementById('commentInput');
      if (!input.value.trim()) return;
      await api('/api/protected/posts/' + postId + '/comments', { method:'POST', json:{ content: input.value }});
      openPostDetail(postId, boardType, reload);
    });
    document.getElementById('commentInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('commentBtn').click();
    });
  } catch(e) { modal.innerHTML = `<div class="modal-body"><h3>로딩 실패</h3></div>`; }
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

/* ─── Kanban Board (물품구매 / 수리정비) ─── */
async function renderKanban(body, actions, boardType) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addCardBtn">${ICONS.plus} ${boardType==='purchase'?'구매 요청':'수리 요청'}</button>`;

  const statusCols = [
    { id: 'requested', label: '요청됨', color: '#6366f1', emoji: '📋' },
    { id: 'approved', label: '승인됨', color: '#3b82f6', emoji: '✅' },
    { id: 'in_progress', label: '진행중', color: '#f59e0b', emoji: '🔧' },
    { id: 'completed', label: '완료', color: '#22c55e', emoji: '🎉' },
  ];
  const priorityColors = { urgent:'#ef4444', high:'#f59e0b', normal:'#6366f1', low:'#94a3b8' };
  const priorityLabels = { urgent:'긴급', high:'높음', normal:'보통', low:'낮음' };

  body.innerHTML = `<div class="kb-hint">💡 카드를 드래그하여 상태를 변경할 수 있습니다</div><div class="kb-board" id="kanbanBoard"></div>`;

  async function loadBoard() {
    const container = document.getElementById('kanbanBoard');
    try {
      const data = await api('/api/protected/kanban/' + boardType);
      const cards = data.cards || [];

      container.innerHTML = statusCols.map(col => {
        const colCards = cards.filter(c => c.status === col.id);
        return `<div class="kb-col" data-status="${col.id}">
          <div class="kb-col-header" style="--col-color:${col.color}">
            <span>${col.emoji} ${col.label}</span>
            <span class="kb-col-count" style="background:${col.color}">${colCards.length}</span>
          </div>
          <div class="kb-col-body">
            ${colCards.length ? colCards.map(card => `
              <div class="kb-card" draggable="true" data-id="${card.id}" style="--accent:${priorityColors[card.priority]||'#6366f1'}">
                <div class="kb-card-title">${esc(card.title)}</div>
                ${card.description ? `<div class="kb-card-desc">${esc(card.description)}</div>` : ''}
                <div class="kb-card-meta">
                  <span class="kb-card-badge" style="--badge-color:${priorityColors[card.priority]}">${priorityLabels[card.priority]}</span>
                  ${card.estimated_cost ? `<span class="kb-card-info">💰 ${card.estimated_cost}만</span>` : ''}
                  <span class="kb-card-info" style="margin-left:auto">${esc(card.requested_by_name)}</span>
                </div>
              </div>
            `).join('') : '<div class="kb-col-empty">카드 없음</div>'}
          </div>
        </div>`;
      }).join('');

      // Drag & Drop
      initKanbanDnD(container, async (cardId, newStatus) => {
        try {
          await api('/api/protected/kanban/cards/' + cardId, { method:'PUT', json:{ status: newStatus }});
          toast('상태 변경됨!', 'success');
          loadBoard();
        } catch(e) { toast(e.message, 'error'); }
      });

      // Click to open detail
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openKanbanCardModal(el.dataset.id, cards, boardType, loadBoard);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadBoard();

  document.getElementById('addCardBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>${boardType==='purchase'?'🛒 물품 구매 요청':'🔧 수리/정비 요청'}</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>요청 항목</label><input class="form-input" id="cardTitle" placeholder="${boardType==='purchase'?'예: 글러브 L사이즈 2박스':'예: 3번 유닛 체어 수리'}"></div>
        <div class="form-group"><label>상세 설명</label><textarea class="form-input" id="cardDesc" rows="3" placeholder="수량, 사양, 상세 내용"></textarea></div>
        <div class="form-grid">
          <div class="form-group"><label>우선순위</label><select class="form-input" id="cardPriority"><option value="normal">보통</option><option value="urgent">긴급</option><option value="high">높음</option><option value="low">낮음</option></select></div>
          <div class="form-group"><label>예상 비용 (만원)</label><input class="form-input" type="number" id="cardCost" placeholder="0"></div>
        </div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="cardSubmitBtn">요청</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('cardSubmitBtn').addEventListener('click', async () => {
      const title = document.getElementById('cardTitle').value.trim();
      if (!title) { toast('요청 항목을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('cardSubmitBtn');
      btn.disabled = true;
      try {
        await api('/api/protected/kanban/' + boardType + '/cards', { method:'POST', json:{
          title: document.getElementById('cardTitle').value,
          description: document.getElementById('cardDesc').value,
          priority: document.getElementById('cardPriority').value,
          estimated_cost: parseFloat(document.getElementById('cardCost').value) || null,
        }});
        toast('요청이 등록되었습니다!', 'success'); closeModal(); loadBoard();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

function openKanbanCardModal(cardId, cards, boardType, reload) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;
  const statuses = ['requested','approved','in_progress','completed'];
  const statusLabels = { requested:'요청됨', approved:'승인됨', in_progress:'진행중', completed:'완료' };
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>${esc(card.title)}</h3><div style="display:flex;gap:8px"><button class="btn-icon" id="delCardBtn" title="삭제">${ICONS.trash}</button><button class="btn-icon" id="modalClose">${ICONS.close}</button></div></div>
    <div class="modal-body">
      ${card.description ? `<p style="color:var(--text-secondary);margin-bottom:16px;white-space:pre-line">${esc(card.description)}</p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${card.estimated_cost ? `<span class="meta-pill">💰 예상 ${card.estimated_cost}만원</span>` : ''}
        <span class="meta-pill">👤 ${esc(card.requested_by_name)}</span>
        <span class="meta-pill">📅 ${card.created_at?.split('T')[0] || ''}</span>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">상태 변경</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${statuses.map(s => `
        <button class="btn ${card.status===s?'btn-primary':'btn-secondary'} btn-sm status-btn" data-status="${s}">${statusLabels[s]}</button>
      `).join('')}</div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('delCardBtn').addEventListener('click', async () => {
    if (!confirm('삭제?')) return;
    await api('/api/protected/kanban/cards/' + cardId, { method:'DELETE' });
    toast('삭제됨', 'success'); closeModal(); reload();
  });
  modal.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/kanban/cards/' + cardId, { method:'PUT', json:{ status: btn.dataset.status }});
      toast('상태가 변경되었습니다', 'success'); closeModal(); reload();
    });
  });
}

/* ─── Scripts (상담 스크립트) ─── */
async function renderScripts(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addScriptBtn">${ICONS.plus} 스크립트 추가</button>`;
  body.innerHTML = `
    <div class="category-tabs" id="scrCatTabs"></div>
    <div id="scrContent"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  let cats = [];
  let selectedCat = '';
  try { cats = await api('/api/protected/categories/scripts'); } catch(e) {}
  renderCatTabs('scrCatTabs', cats, selectedCat, (id) => { selectedCat = id; loadScr(); });

  async function loadScr() {
    const container = document.getElementById('scrContent');
    try {
      let url = '/api/protected/scripts?';
      if (selectedCat) url += 'category=' + selectedCat;
      const scripts = await api(url);
      if (!scripts.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.play}<h3>등록된 스크립트가 없습니다</h3></div>`;
        return;
      }
      container.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;max-width:800px">${scripts.map(s => `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${s.category_name ? `<span class="content-card-badge">${esc(s.category_name)}</span>` : ''}
            <span style="font-weight:700;font-size:15px">${esc(s.title)}</span>
          </div>
          ${s.situation ? `<div style="background:var(--primary-bg);padding:8px 12px;border-radius:var(--radius-sm);font-size:12px;color:var(--primary-dark);margin-bottom:8px">📌 상황: ${esc(s.situation)}</div>` : ''}
          ${s.script_text ? `<div style="font-size:13px;line-height:1.8;white-space:pre-line;padding:12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:8px">💬 ${esc(s.script_text)}</div>` : ''}
          ${s.objection ? `<div style="margin-top:8px;padding:10px 12px;background:#fef2f2;border-radius:var(--radius-sm)">
            <div style="font-size:11px;font-weight:700;color:var(--danger);margin-bottom:4px">🤔 환자 반론</div>
            <div style="font-size:13px;color:#7f1d1d">"${esc(s.objection)}"</div>
          </div>` : ''}
          ${s.response ? `<div style="margin-top:6px;padding:10px 12px;background:#f0fdf4;border-radius:var(--radius-sm)">
            <div style="font-size:11px;font-weight:700;color:var(--success);margin-bottom:4px">💡 대응 멘트</div>
            <div style="font-size:13px;color:#14532d">${esc(s.response)}</div>
          </div>` : ''}
        </div>
      `).join('')}</div>`;
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadScr();

  document.getElementById('addScriptBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>🎯 상담 스크립트 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>카테고리</label><select class="form-input" id="scrCat"><option value="">선택</option>${cats.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>제목</label><input class="form-input" id="scrTitle" required placeholder="예: 임플란트 비용 상담"></div>
        <div class="form-group"><label>상황 설명</label><input class="form-input" id="scrSituation" placeholder="어떤 상황에서 사용?"></div>
        <div class="form-group"><label>상담 멘트</label><textarea class="form-input" id="scrText" rows="4" placeholder="실제 사용할 상담 멘트"></textarea></div>
        <div class="form-group"><label>환자 반론 예시</label><input class="form-input" id="scrObjection" placeholder="예: 너무 비싸요"></div>
        <div class="form-group"><label>반론 대응 멘트</label><textarea class="form-input" id="scrResponse" rows="3" placeholder="반론에 대한 대응"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="scrSubmitBtn">추가</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('scrSubmitBtn').addEventListener('click', async () => {
      const title = document.getElementById('scrTitle').value.trim();
      if (!title) { toast('제목을 입력해주세요', 'error'); return; }
      try {
        await api('/api/protected/scripts', { method:'POST', json:{
          category_id: document.getElementById('scrCat').value || null,
          title: document.getElementById('scrTitle').value,
          situation: document.getElementById('scrSituation').value,
          script_text: document.getElementById('scrText').value,
          objection: document.getElementById('scrObjection').value,
          response: document.getElementById('scrResponse').value,
        }});
        toast('스크립트 추가 완료!', 'success'); closeModal(); loadScr();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

/* ─── Checklists ─── */
async function renderChecklists(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addChecklistBtn">${ICONS.plus} 체크리스트 추가</button>`;
  body.innerHTML = `<div id="checkContent" style="max-width:800px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadChecks() {
    const container = document.getElementById('checkContent');
    try {
      const lists = await api('/api/protected/checklists');
      if (!lists.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.checklist}<h3>체크리스트가 없습니다</h3></div>`;
        return;
      }
      container.innerHTML = lists.map(cl => {
        const items = JSON.parse(cl.items || '[]');
        const typeLabels = { daily_open:'🌅 개원 전', daily_close:'🌙 마감', weekly:'📅 주간', infection:'🛡️ 감염관리', onboarding:'👋 온보딩', custom:'📋 커스텀' };
        return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-weight:700;font-size:15px">${esc(cl.title)}</span>
            <span class="content-card-badge">${typeLabels[cl.checklist_type]||cl.checklist_type}</span>
            <button class="btn btn-primary btn-sm" style="margin-left:auto" data-check-id="${cl.id}">✅ 오늘 체크하기</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${items.map((item,i) => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);padding:4px 0;cursor:pointer">
              <input type="checkbox" class="check-item" data-cl="${cl.id}" data-idx="${i}"> ${esc(item)}
            </label>
          `).join('')}</div>
        </div>`;
      }).join('');

      container.querySelectorAll('[data-check-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const clId = btn.dataset.checkId;
          const checked = [...container.querySelectorAll(`.check-item[data-cl="${clId}"]:checked`)].map(el => parseInt(el.dataset.idx));
          await api('/api/protected/checklists/' + clId + '/complete', { method:'POST', json:{ completed_items: checked, log_date: new Date().toISOString().split('T')[0] }});
          toast(`${checked.length}개 항목 체크 완료!`, 'success');
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadChecks();

  document.getElementById('addChecklistBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>✅ 체크리스트 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>제목</label><input class="form-input" id="clTitle" required placeholder="예: 주간 장비 점검"></div>
        <div class="form-group"><label>유형</label><select class="form-input" id="clType"><option value="custom">커스텀</option><option value="daily_open">개원 전</option><option value="daily_close">마감</option><option value="weekly">주간</option><option value="infection">감염관리</option><option value="onboarding">온보딩</option></select></div>
        <div class="form-group"><label>항목 (한 줄에 하나씩)</label><textarea class="form-input" id="clItems" rows="8" placeholder="항목1\n항목2\n항목3"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="clSubmitBtn">추가</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('clSubmitBtn').addEventListener('click', async () => {
      const items = document.getElementById('clItems').value.split('\n').filter(s=>s.trim());
      try {
        await api('/api/protected/checklists', { method:'POST', json:{ title: document.getElementById('clTitle').value, checklist_type: document.getElementById('clType').value, items }});
        toast('체크리스트 추가!', 'success'); closeModal(); loadChecks();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

/* ─── Calendar ─── */
async function renderCalendar(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addEventBtn">${ICONS.plus} 일정 추가</button>`;
  const now = new Date();
  let curYear = now.getFullYear(), curMonth = now.getMonth();

  body.innerHTML = `<div id="calendarContainer" style="max-width:900px"></div>`;

  async function loadCal() {
    const container = document.getElementById('calendarContainer');
    const monthStr = `${curYear}-${String(curMonth+1).padStart(2,'0')}`;
    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    let events = [];
    try { events = await api('/api/protected/events?month=' + monthStr); } catch(e) {}

    const firstDay = new Date(curYear, curMonth, 1).getDay();
    const daysInMonth = new Date(curYear, curMonth+1, 0).getDate();
    const today = new Date();

    let calHtml = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" id="calPrev">${ICONS.chevronLeft}</button>
      <span style="font-weight:700;font-size:18px">${curYear}년 ${monthNames[curMonth]}</span>
      <button class="btn btn-secondary btn-sm" id="calNext">${ICONS.chevronRight}</button>
    </div>`;
    calHtml += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border-radius:var(--radius);overflow:hidden">`;
    ['일','월','화','수','목','금','토'].forEach((d,i) => {
      calHtml += `<div style="background:var(--bg);padding:8px;text-align:center;font-size:12px;font-weight:600;color:${i===0?'var(--danger)':i===6?'var(--info)':'var(--text-secondary)'}">${d}</div>`;
    });
    for (let i = 0; i < firstDay; i++) calHtml += `<div style="background:var(--bg-card);padding:8px;min-height:80px"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.start_date && e.start_date.startsWith(dateStr));
      const isToday = today.getFullYear()===curYear && today.getMonth()===curMonth && today.getDate()===d;
      const dow = (firstDay + d - 1) % 7;
      calHtml += `<div style="background:var(--bg-card);padding:6px;min-height:80px;${isToday?'outline:2px solid var(--primary);outline-offset:-2px;border-radius:2px':''}">
        <div style="font-size:12px;font-weight:${isToday?'700':'500'};color:${dow===0?'var(--danger)':dow===6?'var(--info)':'var(--text)'};margin-bottom:4px">${d}</div>
        ${dayEvents.slice(0,3).map(e => `<div style="font-size:10px;padding:1px 4px;border-radius:3px;background:${e.color||'#0f766e'}22;color:${e.color||'#0f766e'};margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" title="${esc(e.title)}">${esc(e.title)}</div>`).join('')}
        ${dayEvents.length>3?`<div style="font-size:9px;color:var(--text-muted)">+${dayEvents.length-3}개</div>`:''}
      </div>`;
    }
    calHtml += '</div>';
    container.innerHTML = calHtml;
    document.getElementById('calPrev').addEventListener('click', () => { curMonth--; if(curMonth<0){curMonth=11;curYear--;} loadCal(); });
    document.getElementById('calNext').addEventListener('click', () => { curMonth++; if(curMonth>11){curMonth=0;curYear++;} loadCal(); });
  }
  loadCal();

  document.getElementById('addEventBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    const typeColors = { meeting:'#0f766e', vacation:'#6366f1', maintenance:'#f59e0b', education:'#3b82f6', other:'#64748b' };
    modal.innerHTML = `
      <div class="modal-header"><h3>📅 일정 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>제목</label><input class="form-input" id="evTitle" required placeholder="일정 제목"></div>
        <div class="form-grid">
          <div class="form-group"><label>유형</label><select class="form-input" id="evType"><option value="meeting">회의</option><option value="vacation">휴가</option><option value="maintenance">장비점검</option><option value="education">교육</option><option value="other">기타</option></select></div>
          <div class="form-group"><label>날짜</label><input class="form-input" type="date" id="evDate"></div>
        </div>
        <div class="form-group"><label>메모</label><input class="form-input" id="evDesc" placeholder="추가 설명"></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="evSubmitBtn">추가</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('evSubmitBtn').addEventListener('click', async () => {
      const evType = document.getElementById('evType').value;
      try {
        await api('/api/protected/events', { method:'POST', json:{
          title: document.getElementById('evTitle').value,
          description: document.getElementById('evDesc').value,
          event_type: evType,
          start_date: document.getElementById('evDate').value,
          color: typeColors[evType] || '#0f766e',
        }});
        toast('일정 추가!', 'success'); closeModal(); loadCal();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

/* ─── Marketing ─── */
async function renderMarketing(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addRecordBtn">${ICONS.plus} 실적 입력</button>`;
  body.innerHTML = `<div id="mktContent" style="max-width:900px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadMkt() {
    const container = document.getElementById('mktContent');
    try {
      const channels = await api('/api/protected/marketing/channels');
      const records = await api('/api/protected/marketing/records');
      const totalNewPatients = records.reduce((s,r)=>s+(r.new_patients||0),0);
      const totalAdSpend = records.reduce((s,r)=>s+(r.ad_spend||0),0);
      const totalRevenue = records.reduce((s,r)=>s+(r.revenue||0),0);

      container.innerHTML = `
        <div class="dashboard-grid" style="margin-bottom:24px">
          <div class="stat-card"><div class="stat-card-icon teal">${ICONS.users}</div><div class="stat-card-body"><div class="stat-card-label">총 신환</div><div class="stat-card-value">${totalNewPatients}</div></div></div>
          <div class="stat-card"><div class="stat-card-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706">${ICONS.chart}</div><div class="stat-card-body"><div class="stat-card-label">총 광고비</div><div class="stat-card-value">${totalAdSpend}만</div></div></div>
          <div class="stat-card"><div class="stat-card-icon" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#16a34a">${ICONS.pricing}</div><div class="stat-card-body"><div class="stat-card-label">총 매출</div><div class="stat-card-value">${totalRevenue}만</div></div></div>
          <div class="stat-card"><div class="stat-card-icon purple">${ICONS.star}</div><div class="stat-card-body"><div class="stat-card-label">ROI</div><div class="stat-card-value">${totalAdSpend?((totalRevenue/totalAdSpend)*100).toFixed(0)+'%':'N/A'}</div></div></div>
        </div>
        <div class="section-title">${ICONS.chart}<span>채널별 실적</span></div>
        ${records.length ? `<table class="pricing-table"><thead><tr><th>월</th><th>채널</th><th>신환</th><th>재진</th><th>광고비</th><th>매출</th></tr></thead><tbody>${records.map(r=>`<tr>
          <td>${esc(r.record_month)}</td><td><span class="content-card-badge">${esc(r.channel_name)}</span></td>
          <td style="font-weight:700">${r.new_patients}</td><td>${r.revisit_patients}</td>
          <td>${r.ad_spend}만</td><td class="price-value">${r.revenue}만</td>
        </tr>`).join('')}</tbody></table>` : `<div class="empty-state">${ICONS.chart}<h3>실적 데이터가 없습니다</h3><p>"실적 입력" 버튼으로 월별 실적을 기록하세요</p></div>`}
        <div class="section-title" style="margin-top:24px">${ICONS.folder}<span>등록된 채널</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${channels.map(ch => `<span class="meta-pill">${esc(ch.name)} ${ch.monthly_cost?'(월 '+ch.monthly_cost+'만)':''}</span>`).join('')}
          <button class="btn btn-secondary btn-sm" id="addChannelBtn">${ICONS.plus} 채널 추가</button>
        </div>`;

      document.getElementById('addChannelBtn')?.addEventListener('click', () => {
        const name = prompt('마케팅 채널 이름 (예: 유튜브)');
        if (!name) return;
        const cost = prompt('월 고정 비용 (만원, 없으면 0)') || '0';
        api('/api/protected/marketing/channels', { method:'POST', json:{ name, monthly_cost: parseFloat(cost) }}).then(()=>{ toast('채널 추가!','success'); loadMkt(); });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadMkt();

  document.getElementById('addRecordBtn').addEventListener('click', async () => {
    const channels = await api('/api/protected/marketing/channels').catch(()=>[]);
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>📊 월별 실적 입력</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-grid">
          <div class="form-group"><label>채널</label><select class="form-input" id="recChannel">${channels.map(ch=>`<option value="${ch.id}">${ch.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>월</label><input class="form-input" type="month" id="recMonth"></div>
          <div class="form-group"><label>신환 수</label><input class="form-input" type="number" id="recNew" placeholder="0"></div>
          <div class="form-group"><label>재진 수</label><input class="form-input" type="number" id="recRevisit" placeholder="0"></div>
          <div class="form-group"><label>광고비 (만원)</label><input class="form-input" type="number" id="recSpend" placeholder="0"></div>
          <div class="form-group"><label>매출 (만원)</label><input class="form-input" type="number" id="recRevenue" placeholder="0"></div>
        </div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="recSubmitBtn">저장</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('recSubmitBtn').addEventListener('click', async () => {
      try {
        await api('/api/protected/marketing/records', { method:'POST', json:{
          channel_id: document.getElementById('recChannel').value,
          record_month: document.getElementById('recMonth').value,
          new_patients: parseInt(document.getElementById('recNew').value)||0,
          revisit_patients: parseInt(document.getElementById('recRevisit').value)||0,
          ad_spend: parseFloat(document.getElementById('recSpend').value)||0,
          revenue: parseFloat(document.getElementById('recRevenue').value)||0,
        }});
        toast('실적 저장!', 'success'); closeModal(); loadMkt();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

/* ─── Reviews (후기 관리) ─── */
async function renderReviews(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addReviewBtn">${ICONS.plus} 후기 등록</button>`;
  body.innerHTML = `<div id="reviewContent" style="max-width:800px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadReviews() {
    const container = document.getElementById('reviewContent');
    try {
      const reviews = await api('/api/protected/reviews');
      const avgRating = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : '0.0';
      const platformIcons = { naver:'🟢', google:'🔵', kakao:'🟡', manual:'⚪' };

      container.innerHTML = `
        <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
          <div class="stat-card" style="flex:1;min-width:200px"><div class="stat-card-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706">${ICONS.star}</div><div class="stat-card-body"><div class="stat-card-label">평균 별점</div><div class="stat-card-value">${avgRating} ⭐</div></div></div>
          <div class="stat-card" style="flex:1;min-width:200px"><div class="stat-card-icon blue">${ICONS.message}</div><div class="stat-card-body"><div class="stat-card-label">총 후기</div><div class="stat-card-value">${reviews.length}</div></div></div>
        </div>
        ${reviews.length ? reviews.map(r => `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span>${platformIcons[r.platform]||'⚪'}</span>
              <span style="font-weight:600">${esc(r.reviewer_name||'익명')}</span>
              <span style="color:var(--accent)">${'⭐'.repeat(r.rating)}</span>
              <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${r.review_date||''}</span>
            </div>
            <div style="font-size:13px;color:var(--text-secondary)">${esc(r.content)}</div>
            ${r.reply ? `<div style="margin-top:8px;padding:8px 12px;background:var(--primary-bg);border-radius:var(--radius-sm);font-size:12px"><strong>답글:</strong> ${esc(r.reply)}</div>` : ''}
          </div>
        `).join('') : `<div class="empty-state">${ICONS.star}<h3>등록된 후기가 없습니다</h3></div>`}`;
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadReviews();

  document.getElementById('addReviewBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>⭐ 후기 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-grid">
          <div class="form-group"><label>플랫폼</label><select class="form-input" id="rvPlatform"><option value="naver">네이버</option><option value="google">구글</option><option value="kakao">카카오</option><option value="manual">직접입력</option></select></div>
          <div class="form-group"><label>별점</label><select class="form-input" id="rvRating"><option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3">⭐⭐⭐</option><option value="2">⭐⭐</option><option value="1">⭐</option></select></div>
        </div>
        <div class="form-group"><label>작성자</label><input class="form-input" id="rvName" placeholder="닉네임 또는 이름"></div>
        <div class="form-group"><label>후기 내용</label><textarea class="form-input" id="rvContent" rows="3" placeholder="후기 내용"></textarea></div>
        <div class="form-group"><label>답글</label><textarea class="form-input" id="rvReply" rows="2" placeholder="답글 (선택)"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="rvSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('rvSubmitBtn').addEventListener('click', async () => {
      try {
        await api('/api/protected/reviews', { method:'POST', json:{
          platform: document.getElementById('rvPlatform').value,
          rating: parseInt(document.getElementById('rvRating').value),
          reviewer_name: document.getElementById('rvName').value,
          content: document.getElementById('rvContent').value,
          reply: document.getElementById('rvReply').value,
        }});
        toast('후기 등록 완료!', 'success'); closeModal(); loadReviews();
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

/* ─── PF Hire: 채용 공고 ─── */
async function renderHirePostings(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addPostingBtn">${ICONS.plus} 공고 등록</button>`;

  const statusLabels = { draft:'임시저장', open:'진행중', closed:'마감', paused:'일시중단' };
  const statusColors = { draft:'#94a3b8', open:'#22c55e', closed:'#ef4444', paused:'#f59e0b' };
  const positionLabels = { dentist:'치과의사', hygienist:'치과위생사', assistant:'치과조무사', coordinator:'상담실장', receptionist:'접수/수납', manager:'사무/관리직', other:'기타' };
  const empLabels = { full_time:'정규직', part_time:'파트타임', contract:'계약직', intern:'인턴' };

  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap" id="hireStatusFilter">
      <button class="btn btn-secondary btn-sm active" data-status="">전체</button>
      <button class="btn btn-secondary btn-sm" data-status="open">진행중</button>
      <button class="btn btn-secondary btn-sm" data-status="draft">임시저장</button>
      <button class="btn btn-secondary btn-sm" data-status="closed">마감</button>
    </div>
    <div id="postingContent"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  let filterStatus = '';

  async function loadPostings() {
    const container = document.getElementById('postingContent');
    container.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    try {
      let url = '/api/protected/hire/postings';
      if (filterStatus) url += '?status=' + filterStatus;
      const postings = await api(url);
      if (!postings.length) {
        container.innerHTML = `<div class="empty-state">${ICONS_HIRE.briefcase}<h3>등록된 채용 공고가 없습니다</h3><p>"공고 등록" 버튼으로 시작하세요</p></div>`;
        return;
      }
      container.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">${postings.map(jp => `
        <div class="hire-posting-card" data-id="${jp.id}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;cursor:pointer;transition:var(--transition);border-left:4px solid ${statusColors[jp.status]||'#94a3b8'}">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:16px;flex:1">${esc(jp.title)}</span>
            <span style="font-size:11px;padding:3px 10px;border-radius:12px;background:${statusColors[jp.status]}22;color:${statusColors[jp.status]};font-weight:600">${statusLabels[jp.status]||jp.status}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">
            <span class="meta-pill">👤 ${positionLabels[jp.position_type]||jp.position_type}</span>
            <span class="meta-pill">📋 ${empLabels[jp.employment_type]||jp.employment_type}</span>
            ${jp.salary_min||jp.salary_max ? `<span class="meta-pill">💰 ${formatPrice(jp.salary_min,jp.salary_max)}</span>` : ''}
            ${jp.deadline ? `<span class="meta-pill">📅 ~${jp.deadline}</span>` : ''}
            <span style="margin-left:auto;font-size:12px;color:var(--text-muted)">지원자 <strong style="color:var(--primary)">${jp.applicant_count||0}</strong>명</span>
          </div>
        </div>
      `).join('')}</div>`;

      container.querySelectorAll('.hire-posting-card').forEach(card => {
        card.addEventListener('click', () => openPostingDetail(card.dataset.id, postings, loadPostings));
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadPostings();

  document.getElementById('hireStatusFilter').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('hireStatusFilter').querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterStatus = btn.dataset.status;
      loadPostings();
    });
  });

  document.getElementById('addPostingBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '640px';
    modal.innerHTML = `
      <div class="modal-header"><h3>💼 채용 공고 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>공고 제목</label><input class="form-input" id="jpTitle" placeholder="예: 치과위생사 정규직 채용"></div>
        <div class="form-grid">
          <div class="form-group"><label>직군</label><select class="form-input" id="jpPosition">
            ${Object.entries(positionLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>고용형태</label><select class="form-input" id="jpEmployment">
            ${Object.entries(empLabels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select></div>
        </div>
        <div class="form-group"><label>직무 설명</label><textarea class="form-input" id="jpDesc" rows="4" placeholder="업무 내용, 근무 환경 등"></textarea></div>
        <div class="form-group"><label>자격 요건</label><textarea class="form-input" id="jpReq" rows="3" placeholder="필수/우대 조건"></textarea></div>
        <div class="form-group"><label>복리후생</label><textarea class="form-input" id="jpBenefits" rows="2" placeholder="4대보험, 점심 제공 등"></textarea></div>
        <div class="form-grid">
          <div class="form-group"><label>최소 급여 (만원/월)</label><input class="form-input" type="number" id="jpSalaryMin" placeholder="280"></div>
          <div class="form-group"><label>최대 급여 (만원/월)</label><input class="form-input" type="number" id="jpSalaryMax" placeholder="350"></div>
        </div>
        <div class="form-group"><label>마감일</label><input class="form-input" type="date" id="jpDeadline"></div>
      </form></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
        <button class="btn btn-primary" id="jpSubmitBtn">등록</button>
      </div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('jpSubmitBtn').addEventListener('click', async () => {
      const title = document.getElementById('jpTitle').value.trim();
      if (!title) { toast('공고 제목을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('jpSubmitBtn');
      btn.disabled = true;
      try {
        await api('/api/protected/hire/postings', { method:'POST', json:{
          title, position_type: document.getElementById('jpPosition').value,
          employment_type: document.getElementById('jpEmployment').value,
          description: document.getElementById('jpDesc').value,
          requirements: document.getElementById('jpReq').value,
          benefits: document.getElementById('jpBenefits').value,
          salary_min: parseFloat(document.getElementById('jpSalaryMin').value)||null,
          salary_max: parseFloat(document.getElementById('jpSalaryMax').value)||null,
          deadline: document.getElementById('jpDeadline').value || null,
        }});
        toast('채용 공고가 등록되었습니다!', 'success'); modal.style.maxWidth=''; closeModal(); loadPostings();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

function openPostingDetail(postingId, postings, reload) {
  const jp = postings.find(p => p.id === postingId);
  if (!jp) return;
  const statusLabels = { draft:'임시저장', open:'진행중', closed:'마감', paused:'일시중단' };
  const positionLabels = { dentist:'치과의사', hygienist:'치과위생사', assistant:'치과조무사', coordinator:'상담실장', receptionist:'접수/수납', manager:'사무/관리직', other:'기타' };
  const empLabels = { full_time:'정규직', part_time:'파트타임', contract:'계약직', intern:'인턴' };
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '680px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>${esc(jp.title)}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" id="jpDeleteBtn" title="삭제">${ICONS.trash}</button>
        <button class="btn-icon" id="modalClose">${ICONS.close}</button>
      </div>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="meta-pill">👤 ${positionLabels[jp.position_type]||jp.position_type}</span>
        <span class="meta-pill">📋 ${empLabels[jp.employment_type]||jp.employment_type}</span>
        ${jp.salary_min||jp.salary_max ? `<span class="meta-pill">💰 ${formatPrice(jp.salary_min,jp.salary_max)}</span>` : ''}
        ${jp.deadline ? `<span class="meta-pill">📅 마감 ${jp.deadline}</span>` : ''}
        <span class="meta-pill">📝 지원자 ${jp.applicant_count||0}명</span>
      </div>
      ${jp.description ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">직무 설명</div><div style="font-size:13px;white-space:pre-line;line-height:1.8;background:var(--bg);padding:12px;border-radius:var(--radius-sm)">${esc(jp.description)}</div></div>` : ''}
      ${jp.requirements ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">자격 요건</div><div style="font-size:13px;white-space:pre-line;line-height:1.8;background:#eff6ff;padding:12px;border-radius:var(--radius-sm)">${esc(jp.requirements)}</div></div>` : ''}
      ${jp.benefits ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">복리후생</div><div style="font-size:13px;white-space:pre-line;line-height:1.8;background:#f0fdf4;padding:12px;border-radius:var(--radius-sm)">${esc(jp.benefits)}</div></div>` : ''}
      <div style="margin-top:16px"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">공고 상태 변경</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="jpStatusBtns">
          ${['draft','open','paused','closed'].map(s => `<button class="btn ${jp.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}">${statusLabels[s]}</button>`).join('')}
        </div>
      </div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
  document.getElementById('jpDeleteBtn').addEventListener('click', async () => {
    if (!confirm('이 공고를 삭제하시겠습니까?')) return;
    await api('/api/protected/hire/postings/'+postingId, { method:'DELETE' });
    toast('삭제되었습니다','success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  document.getElementById('jpStatusBtns').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/hire/postings/'+postingId, { method:'PUT', json:{ status:btn.dataset.status }});
      toast('상태가 변경되었습니다','success'); modal.style.maxWidth=''; closeModal(); reload();
    });
  });
}

/* ─── PF Hire: 지원자 관리 (칸반보드 파이프라인) ─── */
async function renderHireApplicants(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addApplicantBtn">${ICONS.plus} 지원자 등록</button>`;

  const statusCols = [
    { id: 'applied', label: '지원', color: '#6366f1', emoji: '📥' },
    { id: 'screening', label: '서류검토', color: '#3b82f6', emoji: '📄' },
    { id: 'interview', label: '면접', color: '#8b5cf6', emoji: '🎤' },
    { id: 'evaluation', label: '평가', color: '#f59e0b', emoji: '📊' },
    { id: 'offer', label: '제안', color: '#14b8a6', emoji: '🤝' },
    { id: 'hired', label: '채용', color: '#22c55e', emoji: '🎉' },
  ];
  const statusLabels = { applied:'지원', screening:'서류검토', interview:'면접', evaluation:'평가', offer:'제안', hired:'채용', rejected:'불합격', withdrawn:'철회' };
  const statusColors = { applied:'#6366f1', screening:'#3b82f6', interview:'#8b5cf6', evaluation:'#f59e0b', offer:'#14b8a6', hired:'#22c55e', rejected:'#ef4444', withdrawn:'#94a3b8' };

  body.innerHTML = `<div class="kb-hint">💡 카드를 드래그하여 채용 단계를 변경할 수 있습니다</div><div class="kb-board" id="applicantBoard"></div>`;

  async function loadApplicants() {
    const container = document.getElementById('applicantBoard');
    try {
      const applicants = await api('/api/protected/hire/applicants');
      if (!applicants.length) {
        container.innerHTML = `<div class="empty-state" style="width:100%">${ICONS_HIRE.userPlus}<h3>지원자가 없습니다</h3><p>"지원자 등록" 버튼으로 추가하세요</p></div>`;
        return;
      }

      container.innerHTML = statusCols.map(col => {
        const colApps = applicants.filter(a => a.status === col.id);
        return `<div class="kb-col" data-status="${col.id}">
          <div class="kb-col-header" style="--col-color:${col.color}">
            <span>${col.emoji} ${col.label}</span>
            <span class="kb-col-count" style="background:${col.color}">${colApps.length}</span>
          </div>
          <div class="kb-col-body">
            ${colApps.length ? colApps.map(a => `
              <div class="kb-card" draggable="true" data-id="${a.id}" style="--accent:${col.color}">
                <div class="kb-card-title">${esc(a.name)}</div>
                <div class="kb-card-desc">${esc(a.job_title||'')}</div>
                <div class="kb-card-meta">
                  ${a.rating ? `<span style="font-size:11px;color:#f59e0b">${'⭐'.repeat(a.rating)}</span>` : ''}
                  ${a.email ? `<span class="kb-card-info">✉️ ${esc(a.email)}</span>` : ''}
                  <span class="kb-card-info" style="margin-left:auto">${timeAgo(a.applied_at)}</span>
                </div>
              </div>
            `).join('') : '<div class="kb-col-empty">지원자 없음</div>'}
          </div>
        </div>`;
      }).join('');

      // 탈락/철회 지원자 별도 표시
      const droppedApps = applicants.filter(a => ['rejected','withdrawn'].includes(a.status));
      if (droppedApps.length) {
        container.insertAdjacentHTML('beforeend', `
          <div class="kb-col" style="opacity:0.6">
            <div class="kb-col-header" style="--col-color:#94a3b8">
              <span>🚫 탈락/철회</span>
              <span class="kb-col-count" style="background:#94a3b8">${droppedApps.length}</span>
            </div>
            <div class="kb-col-body">
              ${droppedApps.map(a => `
                <div class="kb-card" data-id="${a.id}" style="--accent:#94a3b8;cursor:pointer">
                  <div class="kb-card-title" style="text-decoration:line-through;opacity:0.7">${esc(a.name)}</div>
                  <div class="kb-card-meta">
                    <span class="kb-card-badge" style="--badge-color:${statusColors[a.status]}">${statusLabels[a.status]}</span>
                    <span class="kb-card-info">${esc(a.job_title||'')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>`);
      }

      // Drag & Drop
      initKanbanDnD(container, async (appId, newStatus) => {
        try {
          await api('/api/protected/hire/applicants/' + appId, { method:'PUT', json:{ status: newStatus }});
          toast('단계 변경: ' + (statusLabels[newStatus]||newStatus), 'success');
          loadApplicants();
        } catch(e) { toast(e.message, 'error'); loadApplicants(); }
      });

      // Click to open detail
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openApplicantDetail(el.dataset.id, applicants, loadApplicants);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadApplicants();

  document.getElementById('addApplicantBtn').addEventListener('click', async () => {
    let postings = [];
    try { postings = await api('/api/protected/hire/postings?status=open'); } catch(e) {}
    if (!postings.length) { toast('진행 중인 채용 공고가 없습니다. 공고를 먼저 등록해주세요.', 'error'); return; }
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>👤 지원자 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>채용 공고</label><select class="form-input" id="apJob">${postings.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></div>
        <div class="form-group"><label>이름 *</label><input class="form-input" id="apName" placeholder="지원자 이름"></div>
        <div class="form-grid">
          <div class="form-group"><label>이메일</label><input class="form-input" type="email" id="apEmail" placeholder="email@example.com"></div>
          <div class="form-group"><label>연락처</label><input class="form-input" id="apPhone" placeholder="010-1234-5678"></div>
        </div>
        <div class="form-group"><label>자기소개 / 메모</label><textarea class="form-input" id="apCoverLetter" rows="3" placeholder="지원자 관련 메모"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="apSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('apSubmitBtn').addEventListener('click', async () => {
      const name = document.getElementById('apName').value.trim();
      if (!name) { toast('이름을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('apSubmitBtn');
      btn.disabled = true;
      try {
        await api('/api/protected/hire/applicants', { method:'POST', json:{
          job_posting_id: document.getElementById('apJob').value,
          name, email: document.getElementById('apEmail').value,
          phone: document.getElementById('apPhone').value,
          cover_letter: document.getElementById('apCoverLetter').value,
        }});
        toast('지원자가 등록되었습니다!', 'success'); closeModal(); loadApplicants();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

function openApplicantDetail(applicantId, applicants, reload) {
  const a = applicants.find(x => x.id === applicantId);
  if (!a) return;
  const statusLabels = { applied:'지원', screening:'서류검토', interview:'면접', evaluation:'평가', offer:'제안', hired:'채용', rejected:'불합격', withdrawn:'철회' };
  const statusColors = { applied:'#6366f1', screening:'#3b82f6', interview:'#8b5cf6', evaluation:'#f59e0b', offer:'#14b8a6', hired:'#22c55e', rejected:'#ef4444', withdrawn:'#94a3b8' };
  const statusOrder = ['applied','screening','interview','evaluation','offer','hired'];

  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '640px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>👤 ${esc(a.name)}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" id="apDeleteBtn" title="삭제">${ICONS.trash}</button>
        <button class="btn-icon" id="modalClose">${ICONS.close}</button>
      </div>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="meta-pill">📋 ${esc(a.job_title||'')}</span>
        ${a.email ? `<span class="meta-pill">✉️ ${esc(a.email)}</span>` : ''}
        ${a.phone ? `<span class="meta-pill">📱 ${esc(a.phone)}</span>` : ''}
        <span class="meta-pill">📅 지원 ${a.applied_at?.split('T')[0]||''}</span>
      </div>
      ${a.cover_letter ? `<div style="background:var(--bg);padding:12px;border-radius:var(--radius-sm);font-size:13px;white-space:pre-line;line-height:1.7;margin-bottom:16px">${esc(a.cover_letter)}</div>` : ''}
      ${a.notes ? `<div style="background:#eff6ff;padding:10px 12px;border-radius:var(--radius-sm);font-size:12px;margin-bottom:16px"><strong>메모:</strong> ${esc(a.notes)}</div>` : ''}

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">채용 파이프라인</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap" id="apPipeline">
          ${statusOrder.map(s => `<button class="btn ${a.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}" style="flex:1;min-width:60px;font-size:11px">${statusLabels[s]}</button>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">평점</div>
        <div style="display:flex;gap:4px" id="apRating">
          ${[1,2,3,4,5].map(r => `<button style="font-size:20px;background:none;border:none;cursor:pointer;opacity:${r<=a.rating?'1':'0.3'}" data-rating="${r}">⭐</button>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label style="font-size:12px;font-weight:700;color:var(--text-muted)">메모 업데이트</label>
        <textarea class="form-input" id="apNotesInput" rows="2" placeholder="메모 추가...">${esc(a.notes||'')}</textarea>
        <button class="btn btn-secondary btn-sm" id="apNotesBtn" style="margin-top:6px">메모 저장</button>
      </div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
  document.getElementById('apDeleteBtn').addEventListener('click', async () => {
    if (!confirm('이 지원자를 삭제하시겠습니까?')) return;
    await api('/api/protected/hire/applicants/'+applicantId, { method:'DELETE' });
    toast('삭제됨','success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  document.getElementById('apPipeline').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/hire/applicants/'+applicantId, { method:'PUT', json:{ status:btn.dataset.status }});
      toast('상태 변경: '+statusLabels[btn.dataset.status], 'success'); modal.style.maxWidth=''; closeModal(); reload();
    });
  });
  document.getElementById('apRating').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/hire/applicants/'+applicantId, { method:'PUT', json:{ rating:parseInt(btn.dataset.rating) }});
      toast('평점 업데이트', 'success'); modal.style.maxWidth=''; closeModal(); reload();
    });
  });
  document.getElementById('apNotesBtn').addEventListener('click', async () => {
    await api('/api/protected/hire/applicants/'+applicantId, { method:'PUT', json:{ notes:document.getElementById('apNotesInput').value }});
    toast('메모 저장됨', 'success');
  });
}

/* ─── PF Hire: 인터뷰 관리 ─── */
async function renderHireInterviews(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addInterviewBtn">${ICONS.plus} 인터뷰 일정</button>`;

  const statusLabels = { scheduled:'예정', completed:'완료', cancelled:'취소', no_show:'불참' };
  const statusColors = { scheduled:'#3b82f6', completed:'#22c55e', cancelled:'#94a3b8', no_show:'#ef4444' };
  const typeLabels = { onsite:'대면', phone:'전화', video:'화상' };

  body.innerHTML = `<div id="interviewContent" style="max-width:900px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadInterviews() {
    const container = document.getElementById('interviewContent');
    container.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    try {
      // 모든 지원자의 인터뷰를 수집
      const applicants = await api('/api/protected/hire/applicants');
      let allInterviews = [];
      for (const a of applicants) {
        try {
          const interviews = await api('/api/protected/hire/applicants/'+a.id+'/interviews');
          interviews.forEach(i => { i._applicant_name = a.name; i._job_title = a.job_title; });
          allInterviews = allInterviews.concat(interviews);
        } catch(e) {}
      }
      allInterviews.sort((a,b) => (b.scheduled_at||'').localeCompare(a.scheduled_at||''));

      if (!allInterviews.length) {
        container.innerHTML = `<div class="empty-state">${ICONS.message}<h3>등록된 인터뷰가 없습니다</h3><p>"인터뷰 일정" 버튼으로 추가하세요</p></div>`;
        return;
      }
      container.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">${allInterviews.map(iv => `
        <div class="hire-interview-card" data-id="${iv.id}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;cursor:pointer;border-left:4px solid ${statusColors[iv.status]||'#3b82f6'}">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-weight:700;font-size:15px">${esc(iv._applicant_name||'')}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${statusColors[iv.status]}22;color:${statusColors[iv.status]};font-weight:600">${statusLabels[iv.status]||iv.status}</span>
            <span class="meta-pill">${typeLabels[iv.interview_type]||iv.interview_type}</span>
            ${iv.score!=null ? `<span style="font-size:12px;font-weight:700;color:var(--primary)">점수: ${iv.score}/100</span>` : ''}
          </div>
          <div style="display:flex;gap:12px;margin-top:6px;font-size:12px;color:var(--text-muted);flex-wrap:wrap">
            <span>📋 ${esc(iv._job_title||'')}</span>
            <span>📅 ${iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString('ko-KR') : ''}</span>
            <span>⏱ ${iv.duration_min||30}분</span>
            ${iv.location ? `<span>📍 ${esc(iv.location)}</span>` : ''}
            ${iv.interviewer_name ? `<span>👤 ${esc(iv.interviewer_name)}</span>` : ''}
          </div>
          ${iv.feedback ? `<div style="margin-top:8px;font-size:12px;color:var(--text-secondary);background:var(--bg);padding:8px;border-radius:var(--radius-sm)">${esc(iv.feedback)}</div>` : ''}
        </div>
      `).join('')}</div>`;

      container.querySelectorAll('.hire-interview-card').forEach(card => {
        card.addEventListener('click', () => {
          const iv = allInterviews.find(x => x.id === card.dataset.id);
          if (iv) openInterviewDetail(iv, loadInterviews);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadInterviews();

  document.getElementById('addInterviewBtn').addEventListener('click', async () => {
    let applicants = [];
    try { applicants = await api('/api/protected/hire/applicants'); } catch(e) {}
    const activeApps = applicants.filter(a => !['hired','rejected','withdrawn'].includes(a.status));
    if (!activeApps.length) { toast('진행 중인 지원자가 없습니다', 'error'); return; }
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>📅 인터뷰 일정 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>지원자</label><select class="form-input" id="ivApplicant">${activeApps.map(a=>`<option value="${a.id}">${esc(a.name)} (${esc(a.job_title||'')})</option>`).join('')}</select></div>
        <div class="form-grid">
          <div class="form-group"><label>일시</label><input class="form-input" type="datetime-local" id="ivDate"></div>
          <div class="form-group"><label>소요시간 (분)</label><input class="form-input" type="number" id="ivDuration" value="30"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>유형</label><select class="form-input" id="ivType"><option value="onsite">대면</option><option value="phone">전화</option><option value="video">화상</option></select></div>
          <div class="form-group"><label>장소</label><input class="form-input" id="ivLocation" placeholder="면접 장소"></div>
        </div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="ivSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('ivSubmitBtn').addEventListener('click', async () => {
      const scheduled = document.getElementById('ivDate').value;
      if (!scheduled) { toast('일시를 입력해주세요', 'error'); return; }
      const btn = document.getElementById('ivSubmitBtn');
      btn.disabled = true;
      try {
        await api('/api/protected/hire/interviews', { method:'POST', json:{
          applicant_id: document.getElementById('ivApplicant').value,
          scheduled_at: scheduled,
          duration_min: parseInt(document.getElementById('ivDuration').value)||30,
          interview_type: document.getElementById('ivType').value,
          location: document.getElementById('ivLocation').value,
        }});
        toast('인터뷰 일정이 등록되었습니다!', 'success'); closeModal(); loadInterviews();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

function openInterviewDetail(iv, reload) {
  const statusLabels = { scheduled:'예정', completed:'완료', cancelled:'취소', no_show:'불참' };
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>🎤 인터뷰 상세</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="meta-pill">👤 ${esc(iv._applicant_name||'')}</span>
        <span class="meta-pill">📋 ${esc(iv._job_title||'')}</span>
        <span class="meta-pill">📅 ${iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString('ko-KR') : ''}</span>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">상태 변경</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="ivStatusBtns">
          ${['scheduled','completed','cancelled','no_show'].map(s => `<button class="btn ${iv.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}">${statusLabels[s]}</button>`).join('')}
        </div>
      </div>
      <div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--text-muted)">면접 피드백</label><textarea class="form-input" id="ivFeedback" rows="3" placeholder="면접 결과, 인상 등">${esc(iv.feedback||'')}</textarea></div>
      <div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--text-muted)">점수 (0-100)</label><input class="form-input" type="number" id="ivScore" min="0" max="100" value="${iv.score||''}"></div>
      <button class="btn btn-primary btn-sm" id="ivSaveBtn" style="margin-top:8px">피드백 저장</button>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('ivStatusBtns').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/hire/interviews/'+iv.id, { method:'PUT', json:{ status:btn.dataset.status }});
      toast('상태 변경됨','success'); closeModal(); reload();
    });
  });
  document.getElementById('ivSaveBtn').addEventListener('click', async () => {
    const feedback = document.getElementById('ivFeedback').value;
    const score = parseInt(document.getElementById('ivScore').value);
    await api('/api/protected/hire/interviews/'+iv.id, { method:'PUT', json:{ feedback, score:isNaN(score)?null:score }});
    toast('피드백 저장됨','success');
  });
}

/* ─── PF Hire: 온보딩 관리 ─── */
async function renderHireOnboarding(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addOnboardBtn">${ICONS.plus} 온보딩 태스크</button>`;

  const statusLabels = { pending:'대기', in_progress:'진행중', completed:'완료' };
  const statusColors = { pending:'#6366f1', in_progress:'#f59e0b', completed:'#22c55e' };
  const catLabels = { documents:'📄 서류', training:'📚 교육', equipment:'🖥️ 장비', access:'🔑 계정/권한', general:'📋 일반' };

  body.innerHTML = `<div id="onboardContent" style="max-width:900px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadOnboarding() {
    const container = document.getElementById('onboardContent');
    container.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    try {
      const tasks = await api('/api/protected/hire/onboarding');
      if (!tasks.length) {
        container.innerHTML = `<div class="empty-state">${ICONS_HIRE.userCheck}<h3>온보딩 태스크가 없습니다</h3><p>새 직원의 온보딩 체크리스트를 만들어보세요</p></div>`;
        return;
      }

      // 지원자별로 그룹핑
      const groups = {};
      tasks.forEach(t => {
        const key = t.applicant_name || '일반';
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      container.innerHTML = Object.entries(groups).map(([name, items]) => {
        const done = items.filter(t=>t.status==='completed').length;
        const total = items.length;
        const pct = total ? Math.round(done/total*100) : 0;
        return `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div style="font-weight:700;font-size:16px">👋 ${esc(name)}</div>
              <div style="flex:1;height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:var(--success);border-radius:4px;transition:width 0.3s"></div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${pct===100?'var(--success)':'var(--text-muted)'}">${done}/${total} (${pct}%)</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${items.map(t => `
                <div class="onboard-task" data-id="${t.id}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg);border-radius:var(--radius-sm);cursor:pointer;border-left:3px solid ${statusColors[t.status]||'#6366f1'}">
                  <span style="font-size:16px">${t.status==='completed'?'✅':t.status==='in_progress'?'🔄':'⬜'}</span>
                  <div style="flex:1">
                    <div style="font-weight:600;font-size:13px;${t.status==='completed'?'text-decoration:line-through;opacity:0.6':''}">${esc(t.title)}</div>
                    <div style="font-size:11px;color:var(--text-muted);display:flex;gap:8px;margin-top:2px">
                      <span>${catLabels[t.category]||t.category}</span>
                      ${t.assigned_to_name ? `<span>→ ${esc(t.assigned_to_name)}</span>` : ''}
                      ${t.due_date ? `<span>📅 ${t.due_date}</span>` : ''}
                    </div>
                  </div>
                  <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:${statusColors[t.status]}22;color:${statusColors[t.status]};font-weight:600">${statusLabels[t.status]}</span>
                </div>
              `).join('')}
            </div>
          </div>`;
      }).join('');

      container.querySelectorAll('.onboard-task').forEach(el => {
        el.addEventListener('click', async () => {
          const task = tasks.find(t => t.id === el.dataset.id);
          if (!task) return;
          const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
          await api('/api/protected/hire/onboarding/'+task.id, { method:'PUT', json:{ status:nextStatus }});
          toast(statusLabels[nextStatus]+' 처리됨','success'); loadOnboarding();
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadOnboarding();

  document.getElementById('addOnboardBtn').addEventListener('click', async () => {
    let hiredApps = [];
    try {
      const all = await api('/api/protected/hire/applicants');
      hiredApps = all.filter(a => ['offer','hired'].includes(a.status));
    } catch(e) {}
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>✅ 온보딩 태스크 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        ${hiredApps.length ? `<div class="form-group"><label>대상 인원</label><select class="form-input" id="obApplicant"><option value="">선택 (선택사항)</option>${hiredApps.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>` : ''}
        <div class="form-group"><label>태스크 제목</label><input class="form-input" id="obTitle" placeholder="예: 근로계약서 작성"></div>
        <div class="form-group"><label>설명</label><textarea class="form-input" id="obDesc" rows="2" placeholder="상세 설명"></textarea></div>
        <div class="form-grid">
          <div class="form-group"><label>카테고리</label><select class="form-input" id="obCategory"><option value="general">일반</option><option value="documents">서류</option><option value="training">교육</option><option value="equipment">장비</option><option value="access">계정/권한</option></select></div>
          <div class="form-group"><label>마감일</label><input class="form-input" type="date" id="obDueDate"></div>
        </div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="obSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('obSubmitBtn').addEventListener('click', async () => {
      const title = document.getElementById('obTitle').value.trim();
      if (!title) { toast('제목을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('obSubmitBtn');
      btn.disabled = true;
      try {
        await api('/api/protected/hire/onboarding', { method:'POST', json:{
          applicant_id: document.getElementById('obApplicant')?.value || null,
          title, description: document.getElementById('obDesc').value,
          category: document.getElementById('obCategory').value,
          due_date: document.getElementById('obDueDate').value || null,
        }});
        toast('온보딩 태스크가 등록되었습니다!', 'success'); closeModal(); loadOnboarding();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

/* ═══ 진료보드 (Treatment Board) — 원장별 컬럼 + 대기 ═══ */
async function renderTreatmentBoard(body, actions) {
  const today = new Date().toISOString().split('T')[0];
  actions.innerHTML = `
    <input type="date" class="form-input" id="tbDatePicker" value="${today}" style="padding:4px 10px;font-size:12px;width:auto">
    <button class="btn btn-primary btn-sm" id="addTreatmentBtn">${ICONS.plus} 환자 등록</button>`;

  const statusLabels = { waiting:'대기', arrived:'도착', seating:'자리안내', in_treatment:'진료중', doctor_needed:'원장호출', completed:'완료', cancelled:'취소', no_show:'노쇼' };
  const statusEmojis = { waiting:'🕐', arrived:'🚶', seating:'💺', in_treatment:'🦷', doctor_needed:'🔔', completed:'✅', cancelled:'❌', no_show:'🚫' };
  const statusColors = { waiting:'#94a3b8', arrived:'#6366f1', seating:'#3b82f6', in_treatment:'#f59e0b', doctor_needed:'#ef4444', completed:'#22c55e', cancelled:'#94a3b8', no_show:'#94a3b8' };
  const patientTypeLabels = { new:'신환', existing:'구환', emergency:'응급', referral:'소개' };
  const patientTypeColors = { new:'#ef4444', existing:'#3b82f6', emergency:'#f59e0b', referral:'#8b5cf6' };
  const treatmentTypeLabels = { general:'일반진료', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경치료', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', emergency:'응급', checkup:'검진', other:'기타' };

  body.innerHTML = `
    <div class="tb-summary" id="tbSummary"></div>
    <div class="kb-board" id="treatmentBoard" style="min-height:500px"></div>`;

  let boardDate = today;
  let chairs = [];
  let doctors = [];
  let allItems = [];

  async function loadBoard() {
    const container = document.getElementById('treatmentBoard');
    const summary = document.getElementById('tbSummary');
    try {
      const [items, chairList, doctorList] = await Promise.all([
        api('/api/protected/treatment-board?date=' + boardDate),
        api('/api/protected/chairs'),
        api('/api/protected/doctors')
      ]);
      chairs = chairList;
      doctors = doctorList;
      allItems = items;

      // 원장별 환자 분류
      const waitingItems = items.filter(i => !i.assigned_doctor && !['completed','cancelled','no_show'].includes(i.status));
      const completedItems = items.filter(i => ['completed','cancelled','no_show'].includes(i.status));
      const doctorNeeded = items.filter(i => i.status === 'doctor_needed');

      // 전체 요약 바
      const activeCount = items.filter(i => !['completed','cancelled','no_show'].includes(i.status)).length;
      const statusCounts = {};
      items.forEach(i => { statusCounts[i.status] = (statusCounts[i.status]||0) + 1; });

      summary.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
          <div style="font-size:18px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px">
            📡 <span>${boardDate === today ? '오늘의 진료보드' : boardDate}</span>
            <span style="font-size:14px;font-weight:600;color:var(--text-muted)">총 ${items.length}명 (진행 ${activeCount})</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">
            ${Object.entries(statusCounts).filter(([k])=>!['cancelled','no_show'].includes(k)).map(([k,v]) => `<div style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;background:${statusColors[k]||'#94a3b8'}15;font-size:11px;font-weight:600;color:${statusColors[k]||'#94a3b8'}">${statusEmojis[k]||''} ${statusLabels[k]||k} ${v}</div>`).join('')}
          </div>
        </div>
        ${doctorNeeded.length ? `<div style="background:#fef2f2;border:2px solid #fecaca;border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;animation:pulse 1.5s infinite">
          <span style="font-size:20px">🔔</span>
          <span style="font-weight:700;color:#ef4444">원장님 호출!</span>
          ${doctorNeeded.map(d => `<span style="background:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid #fecaca">${d.chair_number ? d.chair_number+'번 체어 ' : ''}${esc(d.patient_name)} - ${esc(d.treatment_desc||treatmentTypeLabels[d.treatment_type]||'')}</span>`).join('')}
        </div>` : ''}`;

      // ── 컬럼 빌드: [📋 대기] + [원장별] + [✅ 완료] ──
      function renderCard(item) {
        const sc = statusColors[item.status] || '#94a3b8';
        const ptColor = patientTypeColors[item.patient_type] || '#3b82f6';
        const isDoctorNeeded = item.status === 'doctor_needed';
        const isCompleted = ['completed','cancelled','no_show'].includes(item.status);
        return `<div class="kb-card" draggable="${isCompleted?'false':'true'}" data-id="${item.id}" style="--accent:${isDoctorNeeded?'#ef4444':sc};${isDoctorNeeded?'animation:pulse 2s infinite;':''}${isCompleted?'opacity:0.55;':''}cursor:pointer">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
            <span style="font-size:11px">${statusEmojis[item.status]||''}</span>
            <span class="kb-card-badge" style="--badge-color:${ptColor};font-size:9px">${patientTypeLabels[item.patient_type]||'구환'}</span>
            <strong style="font-size:13px">${esc(item.patient_name)}</strong>
            ${item.chart_number ? `<span style="font-size:9px;color:var(--text-muted)">#${esc(item.chart_number)}</span>` : ''}
          </div>
          <div class="kb-card-desc">${esc(item.treatment_desc || treatmentTypeLabels[item.treatment_type] || '')}</div>
          <div class="kb-card-meta">
            ${item.chair_number ? `<span class="kb-card-info">💺 ${item.chair_number}번</span>` : ''}
            ${item.staff_name ? `<span class="kb-card-info">👩‍⚕️ ${esc(item.staff_name)}</span>` : ''}
            ${item.appointment_time ? `<span class="kb-card-info" style="margin-left:auto">⏰ ${item.appointment_time}</span>` : ''}
          </div>
        </div>`;
      }

      let html = '';

      // 1) 📋 대기 컬럼 (원장 미배정)
      html += `<div class="kb-col" data-doctor-id="" style="min-width:240px">
        <div class="kb-col-header" style="--col-color:#94a3b8">
          <span>📋 진료실 대기</span>
          <span class="kb-col-count" style="background:#94a3b8">${waitingItems.length}</span>
        </div>
        <div class="kb-col-body">
          ${waitingItems.length ? waitingItems.map(renderCard).join('') : '<div class="kb-col-empty">대기 환자 없음 👍</div>'}
        </div>
      </div>`;

      // 2) 원장별 컬럼
      const docColors = ['#0f766e', '#6366f1', '#c026d3', '#ea580c', '#0284c7', '#b91c1c'];
      doctors.forEach((doc, idx) => {
        const docItems = items.filter(i => i.assigned_doctor === doc.id && !['completed','cancelled','no_show'].includes(i.status));
        const docColor = docColors[idx % docColors.length];
        const hasUrgent = docItems.some(i => i.status === 'doctor_needed');
        html += `<div class="kb-col" data-doctor-id="${doc.id}" style="min-width:260px;${hasUrgent?'border:2px solid #ef4444;':''}">
          <div class="kb-col-header" style="--col-color:${docColor}">
            <span>👨‍⚕️ ${esc(doc.name)} ${doc.role==='admin'?'원장':'선생'}</span>
            <span class="kb-col-count" style="background:${docColor}">${docItems.length}</span>
          </div>
          <div class="kb-col-body">
            ${docItems.length ? docItems.map(renderCard).join('') : '<div class="kb-col-empty">배정된 환자 없음</div>'}
          </div>
        </div>`;
      });

      // 3) ✅ 완료 컬럼
      if (completedItems.length) {
        html += `<div class="kb-col" data-doctor-id="__completed__" style="min-width:200px;opacity:0.6">
          <div class="kb-col-header" style="--col-color:#22c55e">
            <span>✅ 완료</span>
            <span class="kb-col-count" style="background:#22c55e">${completedItems.length}</span>
          </div>
          <div class="kb-col-body">${completedItems.map(renderCard).join('')}</div>
        </div>`;
      }

      container.innerHTML = html;

      // ── 드래그 & 드롭: 원장 컬럼 간 이동 ──
      let _tbDrag = null;
      container.addEventListener('dragstart', (e) => {
        const card = e.target.closest('[draggable="true"]');
        if (!card) return;
        _tbDrag = { id: card.dataset.id, fromCol: card.closest('.kb-col')?.dataset.doctorId };
        card.classList.add('kb-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      container.addEventListener('dragend', (e) => {
        const card = e.target.closest('[draggable="true"]');
        if (card) card.classList.remove('kb-dragging');
        container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
        _tbDrag = null;
      });
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const col = e.target.closest('.kb-col');
        container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
        if (col && _tbDrag && col.dataset.doctorId !== '__completed__' && col.dataset.doctorId !== _tbDrag.fromCol) col.classList.add('kb-drag-over');
      });
      container.addEventListener('dragleave', (e) => {
        const col = e.target.closest('.kb-col');
        if (col && !col.contains(e.relatedTarget)) col.classList.remove('kb-drag-over');
      });
      container.addEventListener('drop', async (e) => {
        e.preventDefault();
        const col = e.target.closest('.kb-col');
        container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
        if (!col || !_tbDrag || col.dataset.doctorId === '__completed__') return;
        const newDocId = col.dataset.doctorId; // '' = 대기, 'u-xxx' = 원장
        if (newDocId === _tbDrag.fromCol) return;

        // 이동한 카드를 새 컬럼의 맨 위(sort_order=0)에 넣고, 기존 카드들 순서 재정렬
        const draggedId = _tbDrag.id;
        _tbDrag = null;

        // 새 컬럼의 기존 카드들
        const existingInCol = allItems.filter(i =>
          (newDocId === '' ? !i.assigned_doctor : i.assigned_doctor === newDocId) &&
          !['completed','cancelled','no_show'].includes(i.status) &&
          i.id !== draggedId
        );
        const reorderItems = [
          { id: draggedId, assigned_doctor: newDocId || null, sort_order: 1 },
          ...existingInCol.map((item, idx) => ({
            id: item.id, assigned_doctor: newDocId || null, sort_order: idx + 2
          }))
        ];
        try {
          await api('/api/protected/treatment-board-reorder', { method:'PUT', json:{ items: reorderItems }});
          const docName = newDocId ? doctors.find(d=>d.id===newDocId)?.name||'' : '대기';
          toast(`${docName}${newDocId?'에게':''} 배정됨 (맨 위)`, 'success');
          loadBoard();
        } catch(err) { toast(err.message, 'error'); loadBoard(); }
      });

      // 카드 클릭 → 상세
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openTreatmentDetail(el.dataset.id, allItems, loadBoard, doctors, chairs);
        });
      });

    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadBoard();

  document.getElementById('tbDatePicker').addEventListener('change', (e) => {
    boardDate = e.target.value;
    loadBoard();
  });

  document.getElementById('addTreatmentBtn').addEventListener('click', async () => {
    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '600px';
    modal.innerHTML = `
      <div class="modal-header"><h3>🦷 환자 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-grid">
          <div class="form-group"><label>환자명 *</label><input class="form-input" id="tbPatient" placeholder="환자 이름"></div>
          <div class="form-group"><label>차트번호</label><input class="form-input" id="tbChart" placeholder="000000"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>환자 유형</label><select class="form-input" id="tbType"><option value="existing">구환</option><option value="new">신환</option><option value="emergency">응급</option><option value="referral">소개</option></select></div>
          <div class="form-group"><label>예약 시간</label><input class="form-input" type="time" id="tbTime"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>진료 유형</label><select class="form-input" id="tbTreatType">
            ${Object.entries(treatmentTypeLabels).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>체어</label><select class="form-input" id="tbChair"><option value="">미배정</option>${chairs.map(c => `<option value="${c.id}">${c.chair_number}번 ${c.room_name?'('+esc(c.room_name)+')':''}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label>담당 원장</label><select class="form-input" id="tbDoctor">
          <option value="">📋 대기 (미배정)</option>
          ${doctors.map(d => `<option value="${d.id}">👨‍⚕️ ${esc(d.name)} ${d.role==='admin'?'원장':'선생'}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>진료 내용</label><input class="form-input" id="tbDesc" placeholder="예: 임플란트 2차 수술, 크라운 세팅 등"></div>
        <div class="form-group"><label>메모</label><textarea class="form-input" id="tbNotes" rows="2" placeholder="특이사항, 주의사항"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="tbSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('tbSubmitBtn').addEventListener('click', async () => {
      const name = document.getElementById('tbPatient').value.trim();
      if (!name) { toast('환자명을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('tbSubmitBtn'); btn.disabled = true;
      try {
        await api('/api/protected/treatment-board', { method:'POST', json:{
          patient_name: name,
          patient_type: document.getElementById('tbType').value,
          chart_number: document.getElementById('tbChart').value,
          chair_id: document.getElementById('tbChair').value || null,
          assigned_doctor: document.getElementById('tbDoctor').value || null,
          treatment_type: document.getElementById('tbTreatType').value,
          treatment_desc: document.getElementById('tbDesc').value,
          appointment_time: document.getElementById('tbTime').value || null,
          notes: document.getElementById('tbNotes').value,
          board_date: boardDate,
        }});
        toast('환자가 등록되었습니다!', 'success'); modal.style.maxWidth=''; closeModal(); loadBoard();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

function openTreatmentDetail(itemId, items, reload, doctors, chairs) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  const statusFlow = [
    { id: 'waiting', label: '대기', emoji: '🕐' },
    { id: 'arrived', label: '도착', emoji: '🚶' },
    { id: 'seating', label: '자리안내', emoji: '💺' },
    { id: 'in_treatment', label: '진료중', emoji: '🦷' },
    { id: 'doctor_needed', label: '원장호출', emoji: '🔔' },
    { id: 'completed', label: '완료', emoji: '✅' },
  ];
  const treatmentTypeLabels = { general:'일반진료', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경치료', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', emergency:'응급', checkup:'검진', other:'기타' };
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '560px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>🦷 ${esc(item.patient_name)}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" id="tbDelBtn" title="삭제">${ICONS.trash}</button>
        <button class="btn-icon" id="modalClose">${ICONS.close}</button>
      </div>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${item.chart_number ? `<span class="meta-pill">📋 #${esc(item.chart_number)}</span>` : ''}
        <span class="meta-pill">🦷 ${treatmentTypeLabels[item.treatment_type]||item.treatment_type}</span>
        ${item.chair_number ? `<span class="meta-pill">💺 ${item.chair_number}번 체어</span>` : ''}
        ${item.doctor_name ? `<span class="meta-pill">👨‍⚕️ ${esc(item.doctor_name)}</span>` : '<span class="meta-pill" style="background:#fef2f2;color:#ef4444">📋 대기 (미배정)</span>'}
        ${item.staff_name ? `<span class="meta-pill">👩‍⚕️ ${esc(item.staff_name)}</span>` : ''}
        ${item.appointment_time ? `<span class="meta-pill">⏰ ${item.appointment_time}</span>` : ''}
      </div>
      ${item.treatment_desc ? `<div style="background:var(--bg);padding:12px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:16px">${esc(item.treatment_desc)}</div>` : ''}
      ${item.notes ? `<div style="background:#eff6ff;padding:10px 12px;border-radius:var(--radius-sm);font-size:12px;margin-bottom:16px"><strong>메모:</strong> ${esc(item.notes)}</div>` : ''}

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">담당 원장 변경</div>
      <select class="form-input" id="tbDocSelect" style="margin-bottom:16px;font-size:13px">
        <option value="" ${!item.assigned_doctor?'selected':''}>📋 대기 (미배정)</option>
        ${(doctors||[]).map(d => `<option value="${d.id}" ${item.assigned_doctor===d.id?'selected':''}}>👨‍⚕️ ${esc(d.name)}</option>`).join('')}
      </select>

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">진료 상태</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap" id="tbStatusBtns">
        ${statusFlow.map(s => `<button class="btn ${item.status===s.id?'btn-primary':'btn-secondary'} btn-sm" data-status="${s.id}" style="flex:1;min-width:70px;font-size:11px">${s.emoji} ${s.label}</button>`).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-secondary btn-sm" data-status="cancelled" style="font-size:11px;opacity:0.7">❌ 취소</button>
        <button class="btn btn-secondary btn-sm" data-status="no_show" style="font-size:11px;opacity:0.7">🚫 노쇼</button>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">
        ${item.arrived_at ? `<span>🚶 도착: ${new Date(item.arrived_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
        ${item.treatment_started_at ? `<span>🦷 시작: ${new Date(item.treatment_started_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
        ${item.completed_at ? `<span>✅ 완료: ${new Date(item.completed_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
      </div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
  document.getElementById('tbDelBtn').addEventListener('click', async () => {
    if (!confirm('이 환자를 목록에서 삭제하시겠습니까?')) return;
    await api('/api/protected/treatment-board/' + itemId, { method:'DELETE' });
    toast('삭제됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // 원장 변경
  document.getElementById('tbDocSelect').addEventListener('change', async (e) => {
    const newDoc = e.target.value || null;
    await api('/api/protected/treatment-board/' + itemId, { method:'PUT', json:{ assigned_doctor: newDoc }});
    toast('원장 변경됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // 상태 변경
  modal.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/treatment-board/' + itemId, { method:'PUT', json:{ status: btn.dataset.status }});
      toast((statusFlow.find(s=>s.id===btn.dataset.status)?.label||btn.dataset.status) + ' 처리됨', 'success');
      modal.style.maxWidth=''; closeModal(); reload();
    });
  });
}

/* ═══ 상담관리: 파이프라인 (Consultation Pipeline) ═══ */
async function renderConsultationPipeline(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addConsultBtn">${ICONS.plus} 상담 등록</button>`;

  const statusCols = [
    { id: 'inquiry', label: '문의', color: '#94a3b8', emoji: '📞' },
    { id: 'reserved', label: '예약', color: '#6366f1', emoji: '📅' },
    { id: 'visited', label: '내원', color: '#3b82f6', emoji: '🚶' },
    { id: 'consulting', label: '상담중', color: '#8b5cf6', emoji: '💬' },
    { id: 'agreed', label: '동의', color: '#14b8a6', emoji: '🤝' },
    { id: 'payment', label: '수납', color: '#f59e0b', emoji: '💳' },
    { id: 'treatment', label: '진료', color: '#22c55e', emoji: '🦷' },
    { id: 'completed', label: '완료', color: '#10b981', emoji: '🎉' },
  ];
  const sourceLabels = { walk_in:'도보', phone:'전화', naver:'네이버', instagram:'인스타', youtube:'유튜브', blog:'블로그', referral:'소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
  const sourceColors = { walk_in:'#94a3b8', phone:'#3b82f6', naver:'#22c55e', instagram:'#e11d48', youtube:'#ef4444', blog:'#14b8a6', referral:'#8b5cf6', kakao:'#f59e0b', homepage:'#6366f1', other:'#94a3b8' };
  const treatLabels = { general:'일반', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };

  body.innerHTML = `<div class="kb-hint">💡 카드를 드래그하여 상담 단계를 변경할 수 있습니다. 카드 클릭 시 상담 기록을 확인/추가할 수 있습니다.</div><div class="kb-board" id="consultBoard" style="min-height:500px"></div>`;

  async function loadPipeline() {
    const container = document.getElementById('consultBoard');
    try {
      const consultations = await api('/api/protected/consultations');

      container.innerHTML = statusCols.map(col => {
        const colItems = consultations.filter(c => c.status === col.id);
        const colAmount = colItems.reduce((s, c) => s + (c.estimated_amount||0), 0);
        return `<div class="kb-col" data-status="${col.id}" style="min-width:220px">
          <div class="kb-col-header" style="--col-color:${col.color}">
            <span>${col.emoji} ${col.label}</span>
            <span class="kb-col-count" style="background:${col.color}">${colItems.length}</span>
          </div>
          ${colAmount ? `<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:4px 0;background:${col.color}08;border-bottom:1px solid var(--border-light)">💰 ${colAmount.toLocaleString()}만원</div>` : ''}
          <div class="kb-col-body">
            ${colItems.length ? colItems.map(c => `
              <div class="kb-card" draggable="true" data-id="${c.id}" style="--accent:${sourceColors[c.source_channel]||'#6366f1'}">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <strong style="font-size:13px">${esc(c.patient_name)}</strong>
                  <span class="kb-card-badge" style="--badge-color:${sourceColors[c.source_channel]||'#94a3b8'};font-size:9px">${sourceLabels[c.source_channel]||c.source_channel}</span>
                </div>
                <div class="kb-card-desc">${treatLabels[c.treatment_type]||c.treatment_type}${c.estimated_amount ? ' · '+c.estimated_amount+'만원' : ''}</div>
                <div class="kb-card-meta">
                  ${c.counselor_name ? `<span class="kb-card-info">👤 ${esc(c.counselor_name)}</span>` : ''}
                  ${c.patient_phone ? `<span class="kb-card-info">📱</span>` : ''}
                  <span class="kb-card-info" style="margin-left:auto">${c.consultation_date||''}</span>
                </div>
              </div>
            `).join('') : '<div class="kb-col-empty">없음</div>'}
          </div>
        </div>`;
      }).join('');

      // Lost/cancelled
      const lost = consultations.filter(c => ['lost','cancelled'].includes(c.status));
      if (lost.length) {
        container.insertAdjacentHTML('beforeend', `
          <div class="kb-col" style="min-width:200px;opacity:0.6">
            <div class="kb-col-header" style="--col-color:#ef4444"><span>💔 이탈/취소</span><span class="kb-col-count" style="background:#ef4444">${lost.length}</span></div>
            <div class="kb-col-body">${lost.map(c => `
              <div class="kb-card" data-id="${c.id}" style="--accent:#94a3b8;cursor:pointer">
                <div class="kb-card-title" style="opacity:0.7">${esc(c.patient_name)}</div>
                <div class="kb-card-meta">
                  <span class="kb-card-badge" style="--badge-color:#ef4444">${c.status==='lost'?'이탈':'취소'}</span>
                  ${c.lost_reason ? `<span class="kb-card-info">${esc(c.lost_reason)}</span>` : ''}
                </div>
              </div>`).join('')}</div>
          </div>`);
      }

      // Drag & Drop
      initKanbanDnD(container, async (cId, newStatus) => {
        try {
          if (newStatus === 'lost') {
            const reason = prompt('이탈 사유를 입력해주세요:');
            await api('/api/protected/consultations/' + cId, { method:'PUT', json:{ status: newStatus, lost_reason: reason||'' }});
          } else {
            await api('/api/protected/consultations/' + cId, { method:'PUT', json:{ status: newStatus }});
          }
          toast('상태 변경됨', 'success');
          loadPipeline();
        } catch(e) { toast(e.message, 'error'); loadPipeline(); }
      });

      // Click card
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openConsultDetail(el.dataset.id, consultations, loadPipeline);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadPipeline();

  document.getElementById('addConsultBtn').addEventListener('click', () => {
    const sourceLabels2 = { walk_in:'도보 내원', phone:'전화 문의', naver:'네이버', instagram:'인스타그램', youtube:'유튜브', blog:'블로그', referral:'지인 소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
    const treatLabels2 = { general:'일반진료', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경치료', perio:'치주치료', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };
    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '600px';
    modal.innerHTML = `
      <div class="modal-header"><h3>💬 상담 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-grid">
          <div class="form-group"><label>환자명 *</label><input class="form-input" id="csName" placeholder="환자 이름"></div>
          <div class="form-group"><label>연락처</label><input class="form-input" id="csPhone" placeholder="010-1234-5678"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>유입 경로</label><select class="form-input" id="csSource">${Object.entries(sourceLabels2).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="form-group"><label>진료 유형</label><select class="form-input" id="csTreatment">${Object.entries(treatLabels2).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>예상 금액 (만원)</label><input class="form-input" type="number" id="csAmount" placeholder="0"></div>
          <div class="form-group"><label>상담일</label><input class="form-input" type="date" id="csDate" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-group"><label>상담 메모</label><textarea class="form-input" id="csNotes" rows="3" placeholder="상담 내용, 환자 반응, 특이사항 등"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="csSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('csSubmitBtn').addEventListener('click', async () => {
      const name = document.getElementById('csName').value.trim();
      if (!name) { toast('환자명을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('csSubmitBtn'); btn.disabled = true;
      try {
        await api('/api/protected/consultations', { method:'POST', json:{
          patient_name: name,
          patient_phone: document.getElementById('csPhone').value,
          source_channel: document.getElementById('csSource').value,
          treatment_type: document.getElementById('csTreatment').value,
          estimated_amount: parseFloat(document.getElementById('csAmount').value) || null,
          consultation_date: document.getElementById('csDate').value,
          notes: document.getElementById('csNotes').value,
        }});
        toast('상담이 등록되었습니다!', 'success'); modal.style.maxWidth=''; closeModal(); loadPipeline();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

async function openConsultDetail(consultId, consultations, reload) {
  const c = consultations.find(x => x.id === consultId);
  if (!c) return;
  const statusLabels = { inquiry:'문의', reserved:'예약', visited:'내원', consulting:'상담중', agreed:'동의', payment:'수납', treatment:'진료', completed:'완료', lost:'이탈', cancelled:'취소' };
  const statusOrder = ['inquiry','reserved','visited','consulting','agreed','payment','treatment','completed'];
  const sourceLabels = { walk_in:'도보', phone:'전화', naver:'네이버', instagram:'인스타', youtube:'유튜브', blog:'블로그', referral:'소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
  const treatLabels = { general:'일반', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };

  let notes = [];
  try { notes = await api('/api/protected/consultations/' + consultId + '/notes'); } catch(e) {}

  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '680px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>💬 ${esc(c.patient_name)}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" id="csDelBtn" title="삭제">${ICONS.trash}</button>
        <button class="btn-icon" id="modalClose">${ICONS.close}</button>
      </div>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="meta-pill">📞 ${sourceLabels[c.source_channel]||c.source_channel}</span>
        <span class="meta-pill">🦷 ${treatLabels[c.treatment_type]||c.treatment_type}</span>
        ${c.patient_phone ? `<span class="meta-pill">📱 ${esc(c.patient_phone)}</span>` : ''}
        ${c.estimated_amount ? `<span class="meta-pill">💰 예상 ${c.estimated_amount}만원</span>` : ''}
        ${c.agreed_amount ? `<span class="meta-pill">🤝 동의 ${c.agreed_amount}만원</span>` : ''}
        ${c.paid_amount ? `<span class="meta-pill">💳 수납 ${c.paid_amount}만원</span>` : ''}
        ${c.counselor_name ? `<span class="meta-pill">👤 ${esc(c.counselor_name)}</span>` : ''}
        ${c.consultation_date ? `<span class="meta-pill">📅 ${c.consultation_date}</span>` : ''}
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">상담 파이프라인</div>
        <div style="display:flex;gap:3px;flex-wrap:wrap" id="csPipeline">
          ${statusOrder.map(s => `<button class="btn ${c.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}" style="flex:1;min-width:56px;font-size:10px;padding:5px 4px">${statusLabels[s]}</button>`).join('')}
        </div>
        <div style="display:flex;gap:4px;margin-top:6px">
          <button class="btn btn-secondary btn-sm" data-status="lost" style="font-size:10px;opacity:0.7">💔 이탈</button>
          <button class="btn btn-secondary btn-sm" data-status="cancelled" style="font-size:10px;opacity:0.7">❌ 취소</button>
        </div>
      </div>

      <div class="form-grid" style="margin-bottom:16px">
        <div class="form-group"><label style="font-size:11px;font-weight:700;color:var(--text-muted)">동의 금액 (만원)</label><input class="form-input" type="number" id="csAgreedAmt" value="${c.agreed_amount||''}" placeholder="0"></div>
        <div class="form-group"><label style="font-size:11px;font-weight:700;color:var(--text-muted)">수납 금액 (만원)</label><input class="form-input" type="number" id="csPaidAmt" value="${c.paid_amount||''}" placeholder="0"></div>
      </div>
      <button class="btn btn-secondary btn-sm" id="csAmountSaveBtn" style="margin-bottom:16px">금액 저장</button>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">📝 상담 기록 (${notes.length}건)</div>
        <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px" id="csNotesArea">
          ${notes.length ? notes.map(n => {
            const typeLabels = { general:'메모', objection:'반론', follow_up:'F/U', treatment_plan:'치료계획', payment:'수납', phone_call:'전화' };
            const typeColors = { general:'#6366f1', objection:'#ef4444', follow_up:'#f59e0b', treatment_plan:'#14b8a6', payment:'#22c55e', phone_call:'#3b82f6' };
            return `<div style="background:var(--bg);padding:10px 12px;border-radius:var(--radius-sm);border-left:3px solid ${typeColors[n.note_type]||'#6366f1'}">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
                <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${typeColors[n.note_type]||'#6366f1'}22;color:${typeColors[n.note_type]||'#6366f1'};font-weight:600">${typeLabels[n.note_type]||n.note_type}</span>
                <span style="font-size:11px;color:var(--text-muted)">${esc(n.author_name||'')} · ${timeAgo(n.created_at)}</span>
              </div>
              <div style="font-size:13px;line-height:1.6;white-space:pre-line">${esc(n.content)}</div>
            </div>`;
          }).join('') : '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">기록이 없습니다</div>'}
        </div>
        <div style="display:flex;gap:6px;align-items:flex-end">
          <select class="form-input" id="csNoteType" style="width:auto;padding:6px 10px;font-size:11px">
            <option value="general">메모</option><option value="objection">반론</option><option value="follow_up">F/U</option><option value="treatment_plan">치료계획</option><option value="payment">수납</option><option value="phone_call">전화</option>
          </select>
          <textarea class="form-input" id="csNewNote" rows="2" placeholder="상담 내용을 입력하세요..." style="flex:1"></textarea>
          <button class="btn btn-primary btn-sm" id="csAddNoteBtn" style="white-space:nowrap">기록 추가</button>
        </div>
      </div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
  document.getElementById('csDelBtn').addEventListener('click', async () => {
    if (!confirm('이 상담을 삭제하시겠습니까?')) return;
    await api('/api/protected/consultations/' + consultId, { method:'DELETE' });
    toast('삭제됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // Pipeline buttons
  modal.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      const json = { status: newStatus };
      if (newStatus === 'lost') {
        const reason = prompt('이탈 사유:');
        if (reason !== null) json.lost_reason = reason;
      }
      await api('/api/protected/consultations/' + consultId, { method:'PUT', json });
      toast(statusLabels[newStatus]+' 처리됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
    });
  });
  // Amount save
  document.getElementById('csAmountSaveBtn').addEventListener('click', async () => {
    const agreed = parseFloat(document.getElementById('csAgreedAmt').value) || null;
    const paid = parseFloat(document.getElementById('csPaidAmt').value) || null;
    await api('/api/protected/consultations/' + consultId, { method:'PUT', json:{ agreed_amount: agreed, paid_amount: paid }});
    toast('금액 저장됨', 'success');
  });
  // Add note
  document.getElementById('csAddNoteBtn').addEventListener('click', async () => {
    const content = document.getElementById('csNewNote').value.trim();
    if (!content) { toast('내용을 입력해주세요', 'error'); return; }
    await api('/api/protected/consultations/' + consultId + '/notes', { method:'POST', json:{ content, note_type: document.getElementById('csNoteType').value }});
    toast('기록 추가됨', 'success');
    // Reload notes
    const newNotes = await api('/api/protected/consultations/' + consultId + '/notes');
    const typeLabels = { general:'메모', objection:'반론', follow_up:'F/U', treatment_plan:'치료계획', payment:'수납', phone_call:'전화' };
    const typeColors = { general:'#6366f1', objection:'#ef4444', follow_up:'#f59e0b', treatment_plan:'#14b8a6', payment:'#22c55e', phone_call:'#3b82f6' };
    document.getElementById('csNotesArea').innerHTML = newNotes.map(n => `<div style="background:var(--bg);padding:10px 12px;border-radius:var(--radius-sm);border-left:3px solid ${typeColors[n.note_type]||'#6366f1'}">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${typeColors[n.note_type]||'#6366f1'}22;color:${typeColors[n.note_type]||'#6366f1'};font-weight:600">${typeLabels[n.note_type]||n.note_type}</span>
        <span style="font-size:11px;color:var(--text-muted)">${esc(n.author_name||'')} · ${timeAgo(n.created_at)}</span>
      </div>
      <div style="font-size:13px;line-height:1.6;white-space:pre-line">${esc(n.content)}</div>
    </div>`).join('');
    document.getElementById('csNewNote').value = '';
  });
}

/* ═══ 상담관리: 전환율 분석 ═══ */
async function renderConsultationStats(body, actions) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0,7);
  actions.innerHTML = `<input type="month" class="form-input" id="csStatsPeriod" value="${currentMonth}" style="padding:4px 10px;font-size:12px;width:auto">`;

  body.innerHTML = `<div id="csStatsContent"><div style="text-align:center;padding:60px"><span class="loading-spinner"></span></div></div>`;

  async function loadStats() {
    const period = document.getElementById('csStatsPeriod').value;
    const container = document.getElementById('csStatsContent');
    container.innerHTML = '<div style="text-align:center;padding:60px"><span class="loading-spinner"></span></div>';
    try {
      const stats = await api('/api/protected/consultations/stats/conversion?period=' + period);
      const sourceLabels = { walk_in:'도보', phone:'전화', naver:'네이버', instagram:'인스타', youtube:'유튜브', blog:'블로그', referral:'소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
      const treatLabels = { general:'일반', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };

      container.innerHTML = `
        <div style="max-width:1000px">
          <div style="margin-bottom:24px">
            <div class="section-title">📊 <span>${period} 상담 전환율</span></div>
          </div>

          <div class="dashboard-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:24px">
            <div class="stat-card"><div class="stat-card-icon blue"><span style="font-size:22px">📞</span></div><div class="stat-card-body"><div class="stat-card-label">총 상담</div><div class="stat-card-value">${stats.total}</div></div></div>
            <div class="stat-card"><div class="stat-card-icon teal"><span style="font-size:22px">🤝</span></div><div class="stat-card-body"><div class="stat-card-label">동의</div><div class="stat-card-value">${stats.agreed}</div><div class="stat-card-sub">${stats.conversionRate}% 전환율</div></div></div>
            <div class="stat-card"><div class="stat-card-icon amber"><span style="font-size:22px">💳</span></div><div class="stat-card-body"><div class="stat-card-label">수납</div><div class="stat-card-value">${stats.paid}</div><div class="stat-card-sub">${stats.paymentRate}% 수납률</div></div></div>
            <div class="stat-card"><div class="stat-card-icon purple"><span style="font-size:22px">💔</span></div><div class="stat-card-body"><div class="stat-card-label">이탈</div><div class="stat-card-value">${stats.lost}</div><div class="stat-card-sub">${stats.total ? Math.round(stats.lost/stats.total*100) : 0}%</div></div></div>
          </div>

          <div class="dashboard-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:24px">
            <div class="stat-card"><div class="stat-card-body"><div class="stat-card-label">💰 예상 총액</div><div class="stat-card-value" style="font-size:20px">${stats.totalEstimated.toLocaleString()}<span style="font-size:13px;font-weight:500">만원</span></div></div></div>
            <div class="stat-card"><div class="stat-card-body"><div class="stat-card-label">🤝 동의 총액</div><div class="stat-card-value" style="font-size:20px;color:var(--primary)">${stats.totalAgreed.toLocaleString()}<span style="font-size:13px;font-weight:500">만원</span></div></div></div>
            <div class="stat-card"><div class="stat-card-body"><div class="stat-card-label">💳 수납 총액</div><div class="stat-card-value" style="font-size:20px;color:var(--success)">${stats.totalPaid.toLocaleString()}<span style="font-size:13px;font-weight:500">만원</span></div></div></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
              <div style="font-weight:700;margin-bottom:12px">📢 유입 경로별 전환율</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${Object.entries(stats.bySource).sort((a,b) => b[1].total - a[1].total).map(([src, data]) => {
                  const rate = data.total ? Math.round(data.agreed/data.total*100) : 0;
                  return `<div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:12px;width:60px;font-weight:600">${sourceLabels[src]||src}</span>
                    <div style="flex:1;height:20px;background:var(--bg);border-radius:10px;overflow:hidden;position:relative">
                      <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,var(--primary),var(--primary-light));border-radius:10px;transition:width 0.5s"></div>
                      <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700">${data.total}건 / ${rate}%</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>

            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
              <div style="font-weight:700;margin-bottom:12px">🦷 진료 유형별 실적</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${Object.entries(stats.byTreatment).sort((a,b) => b[1].amount - a[1].amount).map(([treat, data]) => {
                  const rate = data.total ? Math.round(data.agreed/data.total*100) : 0;
                  return `<div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:12px;width:70px;font-weight:600">${treatLabels[treat]||treat}</span>
                    <div style="flex:1;height:20px;background:var(--bg);border-radius:10px;overflow:hidden;position:relative">
                      <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:10px;transition:width 0.5s"></div>
                      <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700">${data.agreed}/${data.total}건 · ${data.amount.toLocaleString()}만</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div style="margin-top:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
            <div style="font-weight:700;margin-bottom:12px">📈 전환 퍼널</div>
            <div style="display:flex;align-items:center;gap:4px;justify-content:center;flex-wrap:wrap">
              ${[
                { label:'총 상담', value:stats.total, color:'#94a3b8' },
                { label:'내원', value:stats.visited, color:'#3b82f6' },
                { label:'동의', value:stats.agreed, color:'#14b8a6' },
                { label:'수납', value:stats.paid, color:'#f59e0b' },
                { label:'완료', value:stats.completed, color:'#22c55e' },
              ].map((step, i, arr) => {
                const pct = arr[0].value ? Math.round(step.value/arr[0].value*100) : 0;
                const w = Math.max(60, 160 * (pct/100));
                return `${i>0?'<span style="font-size:16px;color:var(--text-muted)">→</span>':''}
                  <div style="text-align:center;padding:12px 8px;background:${step.color}15;border-radius:var(--radius);min-width:${w}px;border:2px solid ${step.color}33">
                    <div style="font-size:22px;font-weight:800;color:${step.color}">${step.value}</div>
                    <div style="font-size:11px;font-weight:600;color:var(--text-secondary)">${step.label}</div>
                    <div style="font-size:10px;color:var(--text-muted)">${pct}%</div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>`;
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${e.message}</p></div>`; }
  }
  loadStats();

  document.getElementById('csStatsPeriod').addEventListener('change', loadStats);
}

/* ─── Leave Management (연차 관리) ─── */
async function renderLeaveManagement(body, actions) {
  const isAdmin = state.user.role === 'admin' || state.user.role === 'manager';
  const today = new Date();
  let currentMonth = today.toISOString().slice(0,7);
  const currentYear = today.getFullYear();

  const leaveTypeMap = {
    annual: { label: '연차', color: '#3b82f6', emoji: '🏖️' },
    sick: { label: '병가', color: '#ef4444', emoji: '🤒' },
    half_am: { label: '오전반차', color: '#8b5cf6', emoji: '🌅' },
    half_pm: { label: '오후반차', color: '#a855f7', emoji: '🌇' },
    special: { label: '특별휴가', color: '#f59e0b', emoji: '🎉' },
    compensation: { label: '대체휴무', color: '#22c55e', emoji: '🔄' },
  };
  const statusMap = {
    pending: { label: '대기', color: '#f59e0b', bg: '#fef3c7' },
    approved: { label: '승인', color: '#22c55e', bg: '#dcfce7' },
    rejected: { label: '반려', color: '#ef4444', bg: '#fee2e2' },
    cancelled: { label: '취소', color: '#94a3b8', bg: '#f1f5f9' },
  };

  actions.innerHTML = `<button class="btn btn-primary" id="leaveRequestBtn">🏖️ 연차 신청</button>`;

  body.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-sm" id="prevMonth">◀</button>
        <span id="monthLabel" style="font-weight:700;font-size:16px;min-width:100px;text-align:center">${currentMonth}</span>
        <button class="btn btn-sm" id="nextMonth">▶</button>
      </div>
      ${isAdmin ? '<button class="btn btn-sm" id="pendingFilter" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d">⏳ 승인 대기</button>' : ''}
      ${isAdmin ? '<button class="btn btn-sm" id="balanceSettingBtn" style="background:var(--primary-light);color:white">⚙️ 연차 설정</button>' : ''}
    </div>
    <div id="leaveBalanceCards" style="margin-bottom:24px"></div>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start" id="leaveLayout">
      <div id="leaveCalendar" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;min-height:400px"></div>
      <div id="leaveList" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;max-height:600px;overflow-y:auto"></div>
    </div>
  `;

  async function loadBalances() {
    const bals = await api('/api/protected/leave/balances?year=' + currentYear);
    const container = document.getElementById('leaveBalanceCards');
    if (!bals || bals.length === 0) {
      container.innerHTML = '<div style="color:var(--text-secondary);font-size:13px;padding:8px">연차 잔여 정보가 없습니다. 관리자에게 설정을 요청하세요.</div>';
      return;
    }
    // Group by user
    const byUser = {};
    bals.forEach(b => {
      if (!byUser[b.user_id]) byUser[b.user_id] = { name: b.user_name, role: b.user_role, items: [] };
      byUser[b.user_id].items.push(b);
    });
    
    container.innerHTML = Object.entries(byUser).map(([uid, u]) => {
      const annualBal = u.items.find(i => i.leave_type === 'annual');
      const sickBal = u.items.find(i => i.leave_type === 'sick');
      const annualRemain = annualBal ? (annualBal.total_days - annualBal.used_days) : 0;
      const sickRemain = sickBal ? (sickBal.total_days - sickBal.used_days) : 0;
      const annualTotal = annualBal ? annualBal.total_days : 0;
      const sickTotal = sickBal ? sickBal.total_days : 0;
      const pct = annualTotal > 0 ? Math.round((annualBal.used_days / annualTotal) * 100) : 0;
      const roleLabel = u.role === 'admin' ? '원장' : u.role === 'manager' ? '관리자' : '스태프';
      return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:inline-flex;flex-direction:column;gap:8px;min-width:200px;margin-right:12px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:14px">${esc(u.name)}</span>
          <span style="font-size:11px;color:var(--text-secondary);background:var(--bg-main);padding:2px 8px;border-radius:10px">${roleLabel}</span>
        </div>
        <div style="display:flex;gap:16px;font-size:13px">
          <div>🏖️ 연차 <strong style="color:#3b82f6">${annualRemain}</strong>/<span style="color:var(--text-secondary)">${annualTotal}일</span></div>
          <div>🤒 병가 <strong style="color:#ef4444">${sickRemain}</strong>/<span style="color:var(--text-secondary)">${sickTotal}일</span></div>
        </div>
        <div style="background:#e2e8f0;border-radius:4px;height:6px;overflow:hidden">
          <div style="background:${pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6'};height:100%;width:${pct}%;transition:width 0.3s"></div>
        </div>
        <div style="font-size:11px;color:var(--text-secondary)">연차 사용률 ${pct}%</div>
      </div>`;
    }).join('');
  }

  async function loadCalendar() {
    const requests = await api('/api/protected/leave/requests?month=' + currentMonth);
    const cal = document.getElementById('leaveCalendar');
    document.getElementById('monthLabel').textContent = currentMonth;
    
    const [yr, mo] = currentMonth.split('-').map(Number);
    const firstDay = new Date(yr, mo - 1, 1).getDay();
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const todayStr = today.toISOString().slice(0, 10);
    
    // Build request map
    const dayMap = {};
    (requests || []).forEach(r => {
      if (r.status === 'cancelled') return;
      const s = new Date(r.start_date);
      const e = new Date(r.end_date);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().slice(0, 10);
        if (ds.startsWith(currentMonth)) {
          const day = d.getDate();
          if (!dayMap[day]) dayMap[day] = [];
          dayMap[day].push(r);
        }
      }
    });

    const days = ['일','월','화','수','목','금','토'];
    let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">`;
    html += days.map((d,i) => `<div style="font-size:12px;font-weight:700;color:${i===0?'#ef4444':i===6?'#3b82f6':'var(--text-secondary)'};padding:8px 0">${d}</div>`).join('');
    
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth}-${String(day).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const dow = (firstDay + day - 1) % 7;
      const events = dayMap[day] || [];
      const hasEvents = events.length > 0;
      
      html += `<div class="leave-cal-day" data-day="${day}" style="min-height:60px;border:1px solid ${isToday ? 'var(--primary)' : 'var(--border)'};border-radius:6px;padding:4px;cursor:${hasEvents?'pointer':'default'};background:${isToday?'rgba(20,184,166,0.08)':'transparent'};transition:all 0.15s;position:relative">
        <div style="font-size:12px;font-weight:${isToday?'800':'500'};color:${dow===0?'#ef4444':dow===6?'#3b82f6':'var(--text-primary)'};margin-bottom:2px">${day}</div>
        ${events.slice(0,3).map(e => `<div style="font-size:9px;padding:1px 3px;margin-bottom:1px;border-radius:3px;background:${statusMap[e.status]?.bg || '#f1f5f9'};color:${statusMap[e.status]?.color || '#666'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(e.user_name)} ${leaveTypeMap[e.leave_type]?.label||''}">${leaveTypeMap[e.leave_type]?.emoji||''} ${esc(e.user_name)}</div>`).join('')}
        ${events.length > 3 ? `<div style="font-size:9px;color:var(--text-secondary)">+${events.length-3}</div>` : ''}
      </div>`;
    }
    html += '</div>';
    cal.innerHTML = html;
    
    // Add click handlers for days with events
    cal.querySelectorAll('.leave-cal-day').forEach(el => {
      const day = parseInt(el.dataset.day);
      const events = dayMap[day];
      if (!events || events.length === 0) return;
      el.addEventListener('click', function(e) {
        document.querySelectorAll('.leave-day-detail').forEach(d => d.remove());
        const detail = document.createElement('div');
        detail.className = 'leave-day-detail';
        detail.style.cssText = 'position:absolute;top:100%;left:0;z-index:100;background:white;border:1px solid var(--border);border-radius:8px;padding:12px;box-shadow:var(--shadow-md);min-width:220px;font-size:12px';
        detail.innerHTML = events.map(ev => {
          const lt = leaveTypeMap[ev.leave_type] || { label: ev.leave_type, color: '#666' };
          const st = statusMap[ev.status] || { label: ev.status, color: '#666', bg: '#f1f5f9' };
          return '<div style="margin-bottom:6px"><strong>' + esc(ev.user_name) + '</strong> · <span style="color:' + lt.color + '">' + lt.label + '</span> · <span style="background:' + st.bg + ';color:' + st.color + ';padding:1px 6px;border-radius:4px;font-size:10px">' + st.label + '</span></div>';
        }).join('');
        el.appendChild(detail);
        e.stopPropagation();
      });
    });
    
    // Close day detail on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.leave-day-detail')) {
        document.querySelectorAll('.leave-day-detail').forEach(el => el.remove());
      }
    });
  }

  async function loadList(filterStatus) {
    let url = '/api/protected/leave/requests?month=' + currentMonth;
    if (filterStatus) url += '&status=' + filterStatus;
    const requests = await api(url);
    const list = document.getElementById('leaveList');
    
    if (!requests || requests.length === 0) {
      list.innerHTML = `<div style="text-align:center;color:var(--text-secondary);padding:40px 0"><div style="font-size:32px;margin-bottom:8px">📋</div><div>이번 달 ${filterStatus === 'pending' ? '승인 대기 중인 ' : ''}신청 내역이 없습니다</div></div>`;
      return;
    }
    
    list.innerHTML = `<div style="font-weight:700;font-size:14px;margin-bottom:12px">${filterStatus === 'pending' ? '⏳ 승인 대기' : '📋 신청 내역'} (${requests.length}건)</div>` +
    requests.map(r => {
      const lt = leaveTypeMap[r.leave_type] || { label: r.leave_type, color: '#666', emoji: '📅' };
      const st = statusMap[r.status] || { label: r.status, color: '#666', bg: '#f1f5f9' };
      const dateRange = r.start_date === r.end_date ? r.start_date : `${r.start_date} ~ ${r.end_date}`;
      return `<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px;border-left:3px solid ${lt.color}" class="leave-item" data-id="${r.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:700;font-size:13px">${lt.emoji} ${esc(r.user_name)}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${st.bg};color:${st.color};font-weight:600">${st.label}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">${lt.label} · ${r.days}일 · ${dateRange}</div>
        ${r.reason ? `<div style="font-size:12px;color:var(--text-secondary)">💬 ${esc(r.reason)}</div>` : ''}
        ${r.reject_reason ? `<div style="font-size:12px;color:#ef4444;margin-top:4px">❌ 반려 사유: ${esc(r.reject_reason)}</div>` : ''}
        ${r.status === 'pending' && isAdmin ? `<div style="display:flex;gap:6px;margin-top:8px">
          <button class="btn btn-sm" style="background:#22c55e;color:white;font-size:11px" onclick="approveLeave('${r.id}')">✅ 승인</button>
          <button class="btn btn-sm" style="background:#ef4444;color:white;font-size:11px" onclick="rejectLeave('${r.id}')">❌ 반려</button>
        </div>` : ''}
        ${r.status === 'pending' && r.user_id === state.user.id ? `<div style="margin-top:8px"><button class="btn btn-sm" style="font-size:11px" onclick="cancelLeave('${r.id}')">취소</button></div>` : ''}
        ${r.status === 'approved' && (r.user_id === state.user.id || state.user.role === 'admin') ? `<div style="margin-top:8px"><button class="btn btn-sm" style="font-size:11px;color:#ef4444" onclick="cancelLeave('${r.id}')">연차 취소 (잔여 복구)</button></div>` : ''}
      </div>`;
    }).join('');
  }

  // Approve
  window.approveLeave = async function(id) {
    if (!confirm('승인하시겠습니까?')) return;
    const res = await api('/api/protected/leave/requests/' + id, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) });
    if (res.success) { toast('승인 완료! ✅', 'success'); loadAll(); }
    else toast(res.error || '오류 발생', 'error');
  };
  window.rejectLeave = async function(id) {
    const reason = prompt('반려 사유를 입력하세요:');
    if (reason === null) return;
    const res = await api('/api/protected/leave/requests/' + id, { method: 'PUT', body: JSON.stringify({ status: 'rejected', reject_reason: reason }) });
    if (res.success) { toast('반려 처리되었습니다', 'info'); loadAll(); }
    else toast(res.error || '오류 발생', 'error');
  };
  window.cancelLeave = async function(id) {
    if (!confirm('연차 신청을 취소하시겠습니까?')) return;
    const res = await api('/api/protected/leave/requests/' + id, { method: 'DELETE' });
    if (res.success) { toast('취소 완료! 잔여일수가 복구됩니다', 'info'); loadAll(); }
    else toast(res.error || '오류 발생', 'error');
  };

  async function loadAll(filterStatus) {
    await Promise.all([loadBalances(), loadCalendar(), loadList(filterStatus)]);
  }

  loadAll();

  // Month nav
  document.getElementById('prevMonth').onclick = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    currentMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    loadAll();
  };
  document.getElementById('nextMonth').onclick = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    currentMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
    loadAll();
  };

  if (isAdmin) {
    document.getElementById('pendingFilter').onclick = function() {
      this.classList.toggle('active');
      loadAll(this.classList.contains('active') ? 'pending' : null);
    };
  }

  // 연차 신청 모달
  document.getElementById('leaveRequestBtn').onclick = async () => {
    // 잔여일수 조회
    const myBals = await api('/api/protected/leave/balances?year=' + currentYear + '&user_id=' + state.user.id);
    const annualBal = (myBals||[]).find(b => b.leave_type === 'annual');
    const sickBal = (myBals||[]).find(b => b.leave_type === 'sick');
    const annualRemain = annualBal ? (annualBal.total_days - annualBal.used_days) : 0;
    const sickRemain = sickBal ? (sickBal.total_days - sickBal.used_days) : 0;

    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '480px';
    modal.innerHTML = `
      <div style="text-align:center;padding:8px 0 20px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#06b6d4);margin-bottom:12px">
          <span style="font-size:28px">🏖️</span>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:800">연차 신청</h2>
        <p style="margin:6px 0 0;font-size:13px;color:var(--text-secondary)">휴가 유형을 선택하고 날짜를 지정하세요</p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px">
        <div style="flex:1;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;color:#3b82f6;font-weight:600;margin-bottom:4px">🏖️ 연차 잔여</div>
          <div style="font-size:22px;font-weight:800;color:#1d4ed8">${annualRemain}<span style="font-size:12px;font-weight:500;color:#64748b"> / ${annualBal ? annualBal.total_days : 0}일</span></div>
        </div>
        <div style="flex:1;background:linear-gradient(135deg,#fef2f2,#fee2e2);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:11px;color:#ef4444;font-weight:600;margin-bottom:4px">🤒 병가 잔여</div>
          <div style="font-size:22px;font-weight:800;color:#dc2626">${sickRemain}<span style="font-size:12px;font-weight:500;color:#64748b"> / ${sickBal ? sickBal.total_days : 0}일</span></div>
        </div>
      </div>

      <form id="leaveForm">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">휴가 유형</label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px" id="leaveTypeGrid">
            <label class="leave-type-option selected" data-value="annual" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:2px solid var(--primary);border-radius:10px;cursor:pointer;transition:all 0.15s;background:rgba(20,184,166,0.06)">
              <span style="font-size:20px">🏖️</span><span style="font-size:11px;font-weight:600">연차</span>
            </label>
            <label class="leave-type-option" data-value="half_am" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s">
              <span style="font-size:20px">🌅</span><span style="font-size:11px;font-weight:600">오전반차</span>
            </label>
            <label class="leave-type-option" data-value="half_pm" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s">
              <span style="font-size:20px">🌇</span><span style="font-size:11px;font-weight:600">오후반차</span>
            </label>
            <label class="leave-type-option" data-value="sick" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s">
              <span style="font-size:20px">🤒</span><span style="font-size:11px;font-weight:600">병가</span>
            </label>
            <label class="leave-type-option" data-value="special" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s">
              <span style="font-size:20px">🎉</span><span style="font-size:11px;font-weight:600">특별휴가</span>
            </label>
            <label class="leave-type-option" data-value="compensation" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all 0.15s">
              <span style="font-size:20px">🔄</span><span style="font-size:11px;font-weight:600">대체휴무</span>
            </label>
          </div>
          <input type="hidden" name="leave_type" value="annual">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">시작일</label>
            <input type="date" name="start_date" required value="${today.toISOString().slice(0,10)}" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px">
          </div>
          <div id="endDateField">
            <label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">종료일</label>
            <input type="date" name="end_date" required value="${today.toISOString().slice(0,10)}" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px">
          </div>
        </div>

        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">사유</label>
          <textarea name="reason" rows="2" placeholder="사유를 입력하세요 (선택사항)" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;resize:vertical;font-family:inherit"></textarea>
        </div>

        <div id="daysPreview" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);padding:14px;border-radius:10px;text-align:center;margin-bottom:20px;border:1px solid #bbf7d0">
          <span style="font-size:24px">📅</span>
          <div style="font-size:18px;font-weight:800;color:#15803d;margin-top:4px">1일 신청</div>
        </div>

        <div style="display:flex;gap:10px">
          <button type="button" class="btn" onclick="closeModal()" style="flex:1;padding:12px;font-size:14px;font-weight:600;border-radius:10px">취소</button>
          <button type="submit" class="btn btn-primary" style="flex:2;padding:12px;font-size:14px;font-weight:700;border-radius:10px">🏖️ 신청하기</button>
        </div>
      </form>
    `;
    showModal();

    const form = document.getElementById('leaveForm');
    const endField = document.getElementById('endDateField');
    const preview = document.getElementById('daysPreview');
    let selectedType = 'annual';

    // Type selection grid
    document.querySelectorAll('.leave-type-option').forEach(opt => {
      opt.addEventListener('click', function() {
        document.querySelectorAll('.leave-type-option').forEach(o => { o.style.border = '2px solid var(--border)'; o.style.background = 'transparent'; o.classList.remove('selected'); });
        this.style.border = '2px solid var(--primary)';
        this.style.background = 'rgba(20,184,166,0.06)';
        this.classList.add('selected');
        selectedType = this.dataset.value;
        form.leave_type.value = selectedType;
        updatePreview();
      });
    });

    function updatePreview() {
      if (selectedType === 'half_am' || selectedType === 'half_pm') {
        endField.style.display = 'none';
        form.end_date.value = form.start_date.value;
        preview.innerHTML = '<span style="font-size:24px">🌤️</span><div style="font-size:18px;font-weight:800;color:#15803d;margin-top:4px">0.5일 (반차) 신청</div>';
      } else {
        endField.style.display = '';
        const s = new Date(form.start_date.value);
        const e = new Date(form.end_date.value);
        const d = Math.max(1, Math.round((e - s) / 86400000) + 1);
        preview.innerHTML = '<span style="font-size:24px">📅</span><div style="font-size:18px;font-weight:800;color:#15803d;margin-top:4px">' + d + '일 신청</div>';
      }
    }
    form.start_date.onchange = () => { if (form.end_date.value < form.start_date.value) form.end_date.value = form.start_date.value; updatePreview(); };
    form.end_date.onchange = updatePreview;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        leave_type: form.leave_type.value,
        start_date: form.start_date.value,
        end_date: form.end_date.value || form.start_date.value,
        reason: form.reason.value,
      };
      const res = await api('/api/protected/leave/requests', { method: 'POST', body: JSON.stringify(data) });
      if (res.error) { toast(res.error, 'error'); return; }
      toast(`연차 신청 완료! (${res.days}일)`, 'success');
      closeModal();
      loadAll();
    };
  };

  // 연차 설정 모달 (admin only)
  if (isAdmin && document.getElementById('balanceSettingBtn')) {
    document.getElementById('balanceSettingBtn').onclick = async () => {
      const users = await api('/api/protected/leave/users');
      const balances = await api('/api/protected/leave/balances?year=' + currentYear);
      
      const modal = document.getElementById('modalContent');
      modal.innerHTML = `
        <h2 style="margin-bottom:20px">⚙️ ${currentYear}년 연차 설정</h2>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">직원별 연차/병가 총 일수를 설정합니다. 변경 시 자동 저장됩니다.</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:var(--bg-main)">
              <th style="padding:10px;text-align:left;border-bottom:2px solid var(--border)">직원</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border)">🏖️ 연차 (일)</th>
              <th style="padding:10px;text-align:center;border-bottom:2px solid var(--border)">🤒 병가 (일)</th>
            </tr>
          </thead>
          <tbody>
            ${(users||[]).map(u => {
              const ab = (balances||[]).find(b => b.user_id === u.id && b.leave_type === 'annual');
              const sb = (balances||[]).find(b => b.user_id === u.id && b.leave_type === 'sick');
              return `<tr>
                <td style="padding:10px;border-bottom:1px solid var(--border)"><strong>${esc(u.name)}</strong> <span style="font-size:11px;color:var(--text-secondary)">${u.role}</span></td>
                <td style="padding:10px;text-align:center;border-bottom:1px solid var(--border)">
                  <input type="number" min="0" max="30" step="0.5" value="${ab ? ab.total_days : 0}" 
                    style="width:60px;text-align:center;padding:4px;border:1px solid var(--border);border-radius:4px"
                    onchange="saveBalance('${u.id}','annual',this.value)">
                  ${ab ? `<span style="font-size:11px;color:var(--text-secondary)">(사용 ${ab.used_days})</span>` : ''}
                </td>
                <td style="padding:10px;text-align:center;border-bottom:1px solid var(--border)">
                  <input type="number" min="0" max="30" step="0.5" value="${sb ? sb.total_days : 0}" 
                    style="width:60px;text-align:center;padding:4px;border:1px solid var(--border);border-radius:4px"
                    onchange="saveBalance('${u.id}','sick',this.value)">
                  ${sb ? `<span style="font-size:11px;color:var(--text-secondary)">(사용 ${sb.used_days})</span>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div style="text-align:right;margin-top:16px"><button class="btn" onclick="closeModal()">닫기</button></div>
      `;
      showModal();

      window.saveBalance = async function(userId, leaveType, totalDays) {
        await api('/api/protected/leave/balances', { method: 'POST', body: JSON.stringify({ user_id: userId, year: currentYear, leave_type: leaveType, total_days: parseFloat(totalDays) }) });
        toast('저장 완료!', 'success');
      };
    };
  }
}

/* ─── Settings ─── */
function renderSettings(body) {
  body.innerHTML = `
    <div style="max-width:600px">
      <div class="section-title">${ICONS.settings}<span>병원 정보</span></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
        <div class="form-grid">
          <div class="form-group full">
            <label>병원명</label>
            <input class="form-input" type="text" value="${esc(state.user.hospitalName || '')}" disabled>
          </div>
          <div class="form-group full">
            <label>관리자 이메일</label>
            <input class="form-input" type="email" value="${esc(state.user.email || '')}" disabled>
          </div>
          <div class="form-group full">
            <label>관리자 이름</label>
            <input class="form-input" type="text" value="${esc(state.user.name || '')}" disabled>
          </div>
        </div>
      </div>
      <div class="section-title">${ICONS.users}<span>계정</span></div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px">
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">로그아웃하면 다시 로그인해야 합니다.</p>
        <button class="btn btn-danger" id="settingsLogout">${ICONS.logout} 로그아웃</button>
      </div>
    </div>`;
  document.getElementById('settingsLogout').addEventListener('click', logout);
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

  // Keyboard navigation
  function onKey(e) {
    if (e.key === 'Escape') { overlay.innerHTML = ''; document.removeEventListener('keydown', onKey); }
    if (e.key === 'ArrowLeft') { idx = (idx - 1 + urls.length) % urls.length; render(); }
    if (e.key === 'ArrowRight') { idx = (idx + 1) % urls.length; render(); }
  }
  document.addEventListener('keydown', onKey);
}

/* ─── Shared Helpers ─── */
function renderCatTabs(containerId, cats, selectedId, onSelect) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<button class="category-tab ${!selectedId ? 'active' : ''}" data-cat="">전체</button>
    ${cats.map(c => `<button class="category-tab ${c.id === selectedId ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('')}`;
  el.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      onSelect(tab.dataset.cat);
    });
  });
}

function showModal() { document.getElementById('modalOverlay').classList.add('show'); }
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  const modal = document.getElementById('modalContent');
  if (modal) modal.style.maxWidth = '';
}

function formatPrice(min, max) {
  if (min && max && min !== max) return `${min}~${max}만원`;
  if (min) return `${min}만원`;
  if (max) return `${max}만원`;
  return '상담 후 결정';
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

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

/* ─── Init ─── */
getStoredAuth();
renderApp();

// ESC to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

})();
