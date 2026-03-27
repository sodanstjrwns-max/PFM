/* ═══ Module: Scripts ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, renderCatTabs } = PFM;

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


PFM.modules.scripts = { renderScripts };
})(window.PFM);
