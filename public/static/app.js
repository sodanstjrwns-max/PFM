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

/* ─── Init ─── */
getStoredAuth();
renderApp();

// ESC to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

})();
