/* ═══ Module: Management (Materials, Pricing, Cases, Scripts) ═══ */
(function(PFM) {
'use strict';
const { api, apiForm, ICONS, state, toast, esc, showModal, closeModal, renderCatTabs, formatPrice, openPresentation, debounce, renderPage } = PFM;

async function renderMaterials(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addMaterialBtn">${ICONS.plus} 자료 추가</button>`;
  
  body.innerHTML = `
    <div class="module-header">
      <div class="search-input">${ICONS.search}<input type="text" id="matSearch" placeholder="자료 검색..."></div>
    </div>
    <div class="category-tabs" id="matCatTabs"></div>
    <div id="matContent"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  let cats = [];
  let selectedCat = '';
  let searchTerm = '';

  try { cats = await api('/api/protected/categories/materials'); } catch(e) {}
  renderCatTabs('matCatTabs', cats, selectedCat, (id) => { selectedCat = id; loadMats(); });

  async function loadMats() {
    const container = document.getElementById('matContent');
    container.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
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
            ? `<img src="${esc(m.file_url)}" alt="${esc(m.title)}" loading="lazy">`
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
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
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
            ${cats.map(c => `<option value="${c.id}">${c.icon} ${h(c.name)}</option>`).join('')}
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
            <p class="mod-muted-sm">이미지, PDF, 동영상</p>
          </div>
          <input type="file" id="matFile" accept="image/*,video/*,.pdf" class="hidden">
          <img id="matPreview" class="upload-preview" class="hidden">
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

/* ─── Cases ─── */
async function renderCases(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addCaseBtn">${ICONS.plus} 케이스 등록</button>`;

  body.innerHTML = `
    <div class="category-tabs" id="caseCatTabs"></div>
    <div id="caseContent"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  let cats = [];
  let selectedCat = '';

  try { cats = await api('/api/protected/categories/cases'); } catch(e) {}
  renderCatTabs('caseCatTabs', cats, selectedCat, (id) => { selectedCat = id; loadCases(); });

  async function loadCases() {
    const container = document.getElementById('caseContent');
    container.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
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
              ${cats.map(c => `<option value="${c.id}">${c.icon} ${h(c.name)}</option>`).join('')}
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
  modal.innerHTML = `<div class="modal-body" class="mod-empty"><span class="loading-spinner"></span></div>`;
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
              <img src="${esc(img.image_url)}" alt="${esc(img.caption || '')}" loading="lazy" data-idx="${i}">
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
          <input type="file" id="imgFile" accept="image/*" class="hidden">
          <img id="imgPreview" class="upload-preview" class="hidden">
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

PFM.modules.management = { renderMaterials, renderCases };
})(window.PFM);
