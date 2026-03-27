/* ═══ Module: Settings ═══ */
(function(PFM) {
'use strict';
const { ICONS, state, esc, logout } = PFM;

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

PFM.modules.settings = { renderSettings };
})(window.PFM);
