/* ═══ Module: PF Hire ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, ICONS_HIRE, state, toast, esc, showModal, closeModal, timeAgo, initKanbanDnD } = PFM;

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
    <div id="postingContent"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  let filterStatus = '';

  async function loadPostings() {
    const container = document.getElementById('postingContent');
    container.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
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
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
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
      ${jp.description ? `<div class="mb-12"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">직무 설명</div><div style="font-size:13px;white-space:pre-line;line-height:1.8;background:var(--bg);padding:12px;border-radius:var(--radius-sm)">${esc(jp.description)}</div></div>` : ''}
      ${jp.requirements ? `<div class="mb-12"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">자격 요건</div><div style="font-size:13px;white-space:pre-line;line-height:1.8;background:#eff6ff;padding:12px;border-radius:var(--radius-sm)">${esc(jp.requirements)}</div></div>` : ''}
      ${jp.benefits ? `<div class="mb-12"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:4px">복리후생</div><div style="font-size:13px;white-space:pre-line;line-height:1.8;background:#f0fdf4;padding:12px;border-radius:var(--radius-sm)">${esc(jp.benefits)}</div></div>` : ''}
      <div class="mt-16"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">공고 상태 변경</div>
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
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
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

      <div class="mb-16">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">채용 파이프라인</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap" id="apPipeline">
          ${statusOrder.map(s => `<button class="btn ${a.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}" style="flex:1;min-width:60px;font-size:11px">${statusLabels[s]}</button>`).join('')}
        </div>
      </div>

      <div class="mb-16">
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

  body.innerHTML = `<div id="interviewContent" style="max-width:900px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  async function loadInterviews() {
    const container = document.getElementById('interviewContent');
    container.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    try {
      // 통합 엔드포인트 한 번으로 전체 인터뷰 조회 (N+1 제거)
      const allInterviews = await api('/api/protected/hire/interviews');
      allInterviews.forEach(i => { i._applicant_name = i.applicant_name; i._job_title = i.job_title; });

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
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
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
      <div class="mb-16">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">상태 변경</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="ivStatusBtns">
          ${['scheduled','completed','cancelled','no_show'].map(s => `<button class="btn ${iv.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}">${statusLabels[s]}</button>`).join('')}
        </div>
      </div>
      <div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--text-muted)">면접 피드백</label><textarea class="form-input" id="ivFeedback" rows="3" placeholder="면접 결과, 인상 등">${esc(iv.feedback||'')}</textarea></div>
      <div class="form-group"><label style="font-size:12px;font-weight:700;color:var(--text-muted)">점수 (0-100)</label><input class="form-input" type="number" id="ivScore" min="0" max="100" value="${iv.score||''}"></div>
      <button class="btn btn-primary btn-sm" id="ivSaveBtn" class="mt-8">피드백 저장</button>
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

  body.innerHTML = `<div id="onboardContent" style="max-width:900px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  async function loadOnboarding() {
    const container = document.getElementById('onboardContent');
    container.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
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
                  <div class="flex-1">
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
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
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

PFM.modules.hire = { renderHirePostings, renderHireApplicants, renderHireInterviews, renderHireOnboarding };
})(window.PFM);
