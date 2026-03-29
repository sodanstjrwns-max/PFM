/* ═══ Module: Community & Kanban ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, timeAgo, initKanbanDnD } = PFM;

async function renderCommunity(body, actions, boardType) {
  const labels = { notice:'공지사항', free:'자유게시판', praise:'칭찬하기', mistake:'실수노트 (이실직고)' };
  const emojis = { notice:'📢', free:'💬', praise:'💛', mistake:'📝' };
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addPostBtn">${ICONS.plus} 글쓰기</button>`;

  body.innerHTML = `<div id="postList" style="max-width:800px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

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
            <span class="mod-muted-sm">${p.is_anonymous ? '익명' : esc(p.author_name)}</span>
            <span class="mod-muted-sm">${timeAgo(p.created_at)}</span>
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
  modal.innerHTML = `<div class="modal-body" class="mod-empty"><span class="loading-spinner"></span></div>`;
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
          <input class="form-input" id="commentInput" placeholder="댓글을 입력하세요" class="flex-1">
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
  const deptLabels = { clinical:'🏥 진료실', desk:'💻 데스크', general:'🏢 기타' };

  let currentDept = '';

  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap" id="deptTabs">
      <button class="btn btn-sm dept-tab active" data-dept="" style="border-radius:20px">전체</button>
      <button class="btn btn-sm dept-tab" data-dept="clinical" style="border-radius:20px">🏥 진료실</button>
      <button class="btn btn-sm dept-tab" data-dept="desk" style="border-radius:20px">💻 데스크</button>
      <button class="btn btn-sm dept-tab" data-dept="general" style="border-radius:20px">🏢 기타</button>
    </div>
    <div class="kb-hint">💡 카드를 드래그하여 상태를 변경할 수 있습니다</div>
    <div class="kb-board" id="kanbanBoard"></div>`;

  async function loadBoard() {
    const container = document.getElementById('kanbanBoard');
    try {
      let url = '/api/protected/kanban/' + boardType;
      if (currentDept) url += '?department=' + currentDept;
      const data = await api(url);
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
                  ${card.department && card.department !== 'general' ? `<span class="kb-card-badge" style="--badge-color:#6b7280;font-weight:500">${deptLabels[card.department]||card.department}</span>` : ''}
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

  // Department tab events
  document.querySelectorAll('.dept-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dept-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentDept = tab.dataset.dept;
      loadBoard();
    });
  });

  document.getElementById('addCardBtn').addEventListener('click', () => {
    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header"><h3>${boardType==='purchase'?'🛒 물품 구매 요청':'🔧 수리/정비 요청'}</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-group"><label>요청 항목</label><input class="form-input" id="cardTitle" placeholder="${boardType==='purchase'?'예: 글러브 L사이즈 2박스':'예: 3번 유닛 체어 수리'}"></div>
        <div class="form-group"><label>상세 설명</label><textarea class="form-input" id="cardDesc" rows="3" placeholder="수량, 사양, 상세 내용"></textarea></div>
        <div class="form-grid">
          <div class="form-group"><label>부서</label><select class="form-input" id="cardDept"><option value="clinical">🏥 진료실</option><option value="desk">💻 데스크</option><option value="general">🏢 기타</option></select></div>
          <div class="form-group"><label>우선순위</label><select class="form-input" id="cardPriority"><option value="normal">보통</option><option value="urgent">긴급</option><option value="high">높음</option><option value="low">낮음</option></select></div>
        </div>
        <div class="form-group"><label>예상 비용 (만원)</label><input class="form-input" type="number" id="cardCost" placeholder="0"></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="cardSubmitBtn">요청</button></div>`;
    showModal();
    // 현재 선택된 부서 기본값 설정
    if (currentDept) document.getElementById('cardDept').value = currentDept;
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
          department: document.getElementById('cardDept').value,
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


PFM.modules.community = { renderCommunity, renderKanban };
})(window.PFM);
