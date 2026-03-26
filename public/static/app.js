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
function getNavConfig() {
  return [
    { id: 'dashboard', label: '대시보드', icon: ICONS.dashboard },
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
          <select class="form-input" id="matCat" required>
            <option value="">카테고리 선택</option>
            ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>자료 제목</label>
          <input class="form-input" type="text" id="matTitle" placeholder="예: 임플란트 시술 과정" required>
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
          <input type="file" id="matFile" accept="image/*,video/*,.pdf" style="display:none" required>
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
            <select class="form-input" id="prcCat" required>
              <option value="">카테고리 선택</option>
              ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full">
            <label>시술명</label>
            <input class="form-input" type="text" id="prcName" placeholder="예: 세라믹 인레이" required>
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
            <select class="form-input" id="caseCat" required>
              <option value="">선택</option>
              ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group full">
            <label>케이스 제목</label>
            <input class="form-input" type="text" id="caseTitle" placeholder="예: 상악 전치부 임플란트" required>
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
          <input type="file" id="imgFile" accept="image/*" style="display:none" required>
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
          <div class="form-group"><label>제목</label><input class="form-input" id="postTitle" placeholder="${boardType==='praise'?'어떤 점이 좋았나요?':boardType==='mistake'?'어떤 실수가 있었나요?':'제목'}" required></div>
          <div class="form-group"><label>내용</label><textarea class="form-input" id="postContent" rows="5" placeholder="${boardType==='mistake'?'실수 내용과 개선 방안을 적어주세요. 솔직한 이실직고가 팀을 성장시킵니다!':'내용을 입력하세요'}"></textarea></div>
          ${boardType==='mistake' ? `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);cursor:pointer"><input type="checkbox" id="postAnon"> 익명으로 작성</label>` : ''}
        </form>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="postSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('postSubmitBtn').addEventListener('click', async () => {
      try {
        await api('/api/protected/posts', { method:'POST', json:{
          board_type: boardType,
          title: document.getElementById('postTitle').value,
          content: document.getElementById('postContent').value,
          target_name: document.getElementById('postTarget')?.value || '',
          is_anonymous: document.getElementById('postAnon')?.checked || false,
        }});
        toast('등록되었습니다!', 'success');
        closeModal(); loadPosts();
      } catch(e) { toast(e.message, 'error'); }
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

  body.innerHTML = `<div id="kanbanBoard" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;min-height:500px"></div>`;

  async function loadBoard() {
    const container = document.getElementById('kanbanBoard');
    try {
      const data = await api('/api/protected/kanban/' + boardType);
      const cards = data.cards || [];

      container.innerHTML = statusCols.map(col => {
        const colCards = cards.filter(c => c.status === col.id);
        return `<div class="kanban-col" style="min-width:240px;flex:1;background:var(--bg);border-radius:var(--radius);padding:12px">
          <div style="font-weight:700;font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <span>${col.emoji}</span>
            <span>${col.label}</span>
            <span style="background:${col.color};color:white;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:auto">${colCards.length}</span>
          </div>
          ${colCards.map(card => `
            <div class="kanban-card" data-id="${card.id}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px;cursor:pointer;border-left:3px solid ${priorityColors[card.priority]||'#6366f1'}">
              <div style="font-weight:600;font-size:13px">${esc(card.title)}</div>
              ${card.description ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;max-height:32px;overflow:hidden">${esc(card.description)}</div>` : ''}
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${priorityColors[card.priority]}22;color:${priorityColors[card.priority]}">${priorityLabels[card.priority]}</span>
                ${card.estimated_cost ? `<span style="font-size:10px;color:var(--text-muted)">💰 ${card.estimated_cost}만원</span>` : ''}
                <span style="font-size:10px;color:var(--text-muted);margin-left:auto">by ${esc(card.requested_by_name)}</span>
              </div>
            </div>
          `).join('')}
        </div>`;
      }).join('');

      container.querySelectorAll('.kanban-card').forEach(el => {
        el.addEventListener('click', () => openKanbanCardModal(el.dataset.id, cards, boardType, loadBoard));
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3></div>`; }
  }
  loadBoard();

  document.getElementById('addCardBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>${boardType==='purchase'?'🛒 물품 구매 요청':'🔧 수리/정비 요청'}</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>요청 항목</label><input class="form-input" id="cardTitle" placeholder="${boardType==='purchase'?'예: 글러브 L사이즈 2박스':'예: 3번 유닛 체어 수리'}" required></div>
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
    <div class="modal-header"><h3>${esc(card.title)}</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      ${card.description ? `<p style="color:var(--text-secondary);margin-bottom:16px;white-space:pre-line">${esc(card.description)}</p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${card.estimated_cost ? `<span class="meta-pill">💰 예상 ${card.estimated_cost}만원</span>` : ''}
        <span class="meta-pill">👤 ${esc(card.requested_by_name)}</span>
        <span class="meta-pill">📅 ${card.created_at?.split('T')[0] || ''}</span>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label>상태 변경</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${statuses.map(s => `
          <button class="btn ${card.status===s?'btn-primary':'btn-secondary'} btn-sm status-btn" data-status="${s}">${statusLabels[s]}</button>
        `).join('')}</div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-danger btn-sm" id="delCardBtn">${ICONS.trash} 삭제</button></div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/kanban/cards/' + cardId, { method:'PUT', json:{ status: btn.dataset.status }});
      toast('상태가 변경되었습니다', 'success'); closeModal(); reload();
    });
  });
  document.getElementById('delCardBtn').addEventListener('click', async () => {
    if (!confirm('삭제?')) return;
    await api('/api/protected/kanban/cards/' + cardId, { method:'DELETE' });
    toast('삭제됨', 'success'); closeModal(); reload();
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
          <div class="form-group"><label>날짜</label><input class="form-input" type="date" id="evDate" required></div>
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
          <div class="form-group"><label>월</label><input class="form-input" type="month" id="recMonth" required></div>
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
