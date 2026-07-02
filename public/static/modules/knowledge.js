/* ═══════════════════════════════════════════════════════════════
 * PF 지식베이스 모듈 (📚 원장님 6권 노하우 카드)
 *  - 카테고리 탭, 검색, 책 필터, 카드 그리드
 *  - 상세 모달 + 즐겨찾기 + 조회수 트래킹
 *  - 대시보드 위젯 (오늘의 노하우 카드)
 *  - 상담분석 연동 (전환율 낮을 때 자동 추천)
 * ═══════════════════════════════════════════════════════════════ */
(function () {
  const { api, esc, showModal, closeModal, toast } = window.PFM;

  /* 상태 */
  let _state = {
    q: '',
    category: '',
    book: '',
    scope: 'all',
    sort: 'priority',
    cards: [],
    categories: [],
    books: [],
    total: 0,
    onlyFavorites: false,
  };

  /* ─── 메인 페이지 렌더 ─── */
  async function renderKnowledge(body, actions) {
    actions.innerHTML = `
      <button class="btn btn-secondary btn-sm" data-act="PFMKnowledge.openMyFavorites()">
        <i class="fas fa-star"></i> 내 즐겨찾기
      </button>
    `;

    body.innerHTML = `
      <div style="padding:20px;max-width:1280px;margin:0 auto">
        <!-- 헤더 -->
        <div style="background:linear-gradient(135deg,#0f766e 0%,#0e7490 100%);color:#fff;padding:20px 24px;border-radius:14px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="margin:0;font-size:22px;font-weight:700">📚 PF 지식베이스</h2>
              <div style="margin-top:6px;font-size:13px;opacity:0.9">
                원장님 6권 전자책 + 페이션트 퍼널 시스템 노하우 카드
              </div>
            </div>
            <div id="kbStatsBox" style="display:flex;gap:14px;font-size:13px"></div>
          </div>
        </div>

        <!-- 검색 + 필터 -->
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:14px">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:240px;position:relative">
              <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8"></i>
              <input id="kbSearch" type="text" placeholder="검색: 제목, 내용, 태그 (예: 임플란트, SPIN, 노쇼)"
                style="width:100%;padding:10px 12px 10px 36px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"
                data-act-key-enter="PFMKnowledge.search()" />
            </div>
            <select id="kbSort" data-act-change="PFMKnowledge.changeSort()" style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px">
              <option value="priority">⭐ 추천순</option>
              <option value="popular">🔥 조회순</option>
              <option value="recent">🕒 최신순</option>
            </select>
            <button class="btn btn-primary btn-sm" data-act="PFMKnowledge.search()">
              <i class="fas fa-search"></i> 검색
            </button>
          </div>
        </div>

        <!-- 카테고리 탭 -->
        <div id="kbCategoryTabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>

        <!-- 책 필터 -->
        <div id="kbBookFilter" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px"></div>

        <!-- 결과 헤더 -->
        <div id="kbResultHeader" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;color:#64748b"></div>

        <!-- 카드 그리드 -->
        <div id="kbCardGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>
    `;

    await loadAndRender();
  }

  /* ─── 데이터 로드 + 렌더 ─── */
  async function loadAndRender() {
    try {
      const params = new URLSearchParams({
        scope: _state.scope,
        sort: _state.sort,
        limit: '100',
      });
      if (_state.q) params.set('q', _state.q);
      if (_state.category) params.set('category', _state.category);
      if (_state.book) params.set('book', _state.book);

      const data = await api('/api/protected/knowledge?' + params.toString());
      _state.cards = data.cards || [];
      _state.categories = data.categories || [];
      _state.books = data.books || [];
      _state.total = data.total || 0;

      renderStats();
      renderCategoryTabs();
      renderBookFilter();
      renderResultHeader();
      renderCardGrid();
    } catch (e) {
      const grid = document.getElementById('kbCardGrid');
      if (grid) grid.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:#ef4444">
        ⚠️ 카드를 불러올 수 없습니다: ${esc(e.message || '오류')}
      </div>`;
    }
  }

  /* ─── 상단 통계 ─── */
  function renderStats() {
    const el = document.getElementById('kbStatsBox');
    if (!el) return;
    const totalAll = _state.categories.reduce((s, c) => s + c.count, 0);
    el.innerHTML = `
      <div><b>${totalAll}</b>개 카드</div>
      <div>·</div>
      <div><b>${_state.books.length}</b>권 출처</div>
      <div>·</div>
      <div><b>${_state.categories.length}</b>개 카테고리</div>
    `;
  }

  /* ─── 카테고리 탭 ─── */
  function renderCategoryTabs() {
    const el = document.getElementById('kbCategoryTabs');
    if (!el) return;
    const totalAll = _state.categories.reduce((s, c) => s + c.count, 0);
    const items = [{ key: '', label: '전체', icon: '📋', count: totalAll }, ..._state.categories];
    el.innerHTML = items.map(c => {
      const active = _state.category === c.key;
      return `
        <button data-act="PFMKnowledge.setCategory('${esc(c.key)}')"
          style="padding:8px 14px;border-radius:20px;border:1.5px solid ${active ? '#0f766e' : '#e5e7eb'};
                 background:${active ? '#0f766e' : '#fff'};color:${active ? '#fff' : '#475569'};
                 font-size:13px;font-weight:${active ? '700' : '500'};cursor:pointer;transition:all 0.15s">
          ${c.icon} ${esc(c.label)} <span style="opacity:0.7">(${c.count})</span>
        </button>
      `;
    }).join('');
  }

  /* ─── 책 필터 ─── */
  function renderBookFilter() {
    const el = document.getElementById('kbBookFilter');
    if (!el || !_state.books.length) { if (el) el.innerHTML = ''; return; }
    const items = [{ name: '', count: 0 }, ..._state.books];
    el.innerHTML = '<span style="font-size:12px;color:#94a3b8;align-self:center;margin-right:4px">📖 출처:</span>' +
      items.map(b => {
        const active = _state.book === b.name;
        const label = b.name || '전체';
        const cnt = b.count ? ` (${b.count})` : '';
        return `
          <button data-act="PFMKnowledge.setBook('${esc(b.name)}')"
            style="padding:5px 12px;border-radius:14px;border:1px solid ${active ? '#0e7490' : '#e5e7eb'};
                   background:${active ? '#cffafe' : '#fff'};color:${active ? '#0e7490' : '#64748b'};
                   font-size:12px;font-weight:${active ? '600' : '400'};cursor:pointer">
            ${esc(label)}${cnt}
          </button>
        `;
      }).join('');
  }

  /* ─── 결과 헤더 ─── */
  function renderResultHeader() {
    const el = document.getElementById('kbResultHeader');
    if (!el) return;
    const filterDesc = [];
    if (_state.q) filterDesc.push(`"${esc(_state.q)}"`);
    if (_state.category) {
      const cat = _state.categories.find(c => c.key === _state.category);
      if (cat) filterDesc.push(`${cat.icon} ${cat.label}`);
    }
    if (_state.book) filterDesc.push(`📖 ${esc(_state.book)}`);
    el.innerHTML = `
      <div><b>${_state.total}</b>개 카드 ${filterDesc.length ? `· ${filterDesc.join(' · ')}` : ''}</div>
      ${(_state.q || _state.category || _state.book)
        ? `<button data-act="PFMKnowledge.resetFilters()" style="background:none;border:none;color:#0f766e;cursor:pointer;font-size:12px"><i class="fas fa-times"></i> 필터 초기화</button>`
        : ''}
    `;
  }

  /* ─── 카드 그리드 ─── */
  function renderCardGrid() {
    const el = document.getElementById('kbCardGrid');
    if (!el) return;
    if (!_state.cards.length) {
      el.innerHTML = `
        <div style="grid-column:1/-1;padding:60px;text-align:center;color:#94a3b8">
          <div style="font-size:48px;margin-bottom:12px">📭</div>
          <div style="font-size:15px">검색 결과가 없습니다</div>
        </div>
      `;
      return;
    }
    el.innerHTML = _state.cards.map(c => cardHTML(c)).join('');
  }

  function cardHTML(c) {
    const tags = (c.tags || []).slice(0, 4).map(t =>
      `<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:10px;font-size:11px">#${esc(t)}</span>`
    ).join(' ');
    const preview = String(c.content || '').replace(/^['"]/, '').slice(0, 120);
    return `
      <div data-act="PFMKnowledge.openCard('${c.id}')"
        style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;
               transition:all 0.15s;position:relative"
        data-act-over="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)';this.style.borderColor='#0f766e'"
        data-act-out="this.style.boxShadow='';this.style.borderColor='#e5e7eb'">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <span style="background:#ecfdf5;color:#065f46;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600">
              ${c.categoryMeta?.icon || '📁'} ${esc(c.categoryMeta?.label || c.category)}
            </span>
            ${c.book_source
              ? `<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:10px;font-size:11px">📖 ${esc(c.book_source)}</span>`
              : ''}
          </div>
          <button data-act="event.stopPropagation();PFMKnowledge.toggleFavorite('${c.id}')"
            style="background:none;border:none;cursor:pointer;font-size:18px;color:${c.is_favorite ? '#f59e0b' : '#cbd5e1'};padding:0">
            ${c.is_favorite ? '★' : '☆'}
          </button>
        </div>
        <h3 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#1e293b;line-height:1.4">
          ${esc(c.title)}
        </h3>
        <div style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:10px;
                    display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">
          ${esc(preview)}${preview.length >= 120 ? '...' : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
          <div style="display:flex;gap:4px;flex-wrap:wrap">${tags}</div>
          <div style="font-size:11px;color:#94a3b8"><i class="fas fa-eye"></i> ${c.view_count || 0}</div>
        </div>
      </div>
    `;
  }

  /* ─── 카드 상세 모달 ─── */
  async function openCard(id) {
    try {
      const card = await api('/api/protected/knowledge/' + id);
      const tagHTML = (card.tags || []).map(t =>
        `<span style="background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:12px;font-size:12px">#${esc(t)}</span>`
      ).join(' ');
      // 줄바꿈 보존
      const contentHTML = esc(card.content || '').replace(/\n/g, '<br>');

      showModal(
        `${card.categoryMeta?.icon || '📁'} ${esc(card.title)}`,
        `
          <div style="max-width:680px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
              <span style="background:#ecfdf5;color:#065f46;padding:4px 12px;border-radius:10px;font-size:12px;font-weight:600">
                ${esc(card.categoryMeta?.label || card.category)}
              </span>
              ${card.book_source
                ? `<span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:10px;font-size:12px">📖 ${esc(card.book_source)}</span>`
                : ''}
              <span style="background:${card.is_global ? '#dbeafe' : '#fef3c7'};color:${card.is_global ? '#1e40af' : '#92400e'};padding:4px 12px;border-radius:10px;font-size:12px">
                ${card.is_global ? '🌐 전역 자산' : '🏥 우리 병원'}
              </span>
              <span style="margin-left:auto;color:#94a3b8;font-size:12px"><i class="fas fa-eye"></i> ${card.view_count || 0}</span>
            </div>
            <div style="background:#f8fafc;border-left:4px solid #0f766e;padding:18px 20px;border-radius:8px;
                        font-size:14px;line-height:1.7;color:#1e293b;white-space:pre-wrap">
              ${contentHTML}
            </div>
            ${tagHTML ? `<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap">${tagHTML}</div>` : ''}
            <div style="margin-top:18px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #e5e7eb;padding-top:14px">
              <button class="btn btn-secondary" data-act="PFMKnowledge.toggleFavorite('${card.id}', true)">
                ${card.is_favorite ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기'}
              </button>
              <button class="btn btn-primary" data-act="PFMKnowledge.copyContent('${card.id}')">
                <i class="fas fa-copy"></i> 본문 복사
              </button>
              <button class="btn btn-default" data-act="PFM.closeModal()">닫기</button>
            </div>
          </div>
        `
      );
      // 복사용 임시 저장
      window._kbCurrentContent = card.content;
    } catch (e) {
      toast('카드를 불러올 수 없습니다', 'error');
    }
  }

  /* ─── 즐겨찾기 토글 ─── */
  async function toggleFavorite(id, fromModal) {
    try {
      const res = await api('/api/protected/knowledge/' + id + '/favorite', { method: 'POST', body: '{}' });
      toast(res.favorited ? '⭐ 즐겨찾기에 추가했습니다' : '즐겨찾기에서 제거했습니다', 'success');
      // 카드 그리드의 별 아이콘 업데이트
      const card = _state.cards.find(c => c.id === id);
      if (card) card.is_favorite = res.favorited;
      renderCardGrid();
      if (fromModal) {
        closeModal();
        openCard(id);
      }
    } catch (e) {
      toast('즐겨찾기 처리 실패', 'error');
    }
  }

  /* ─── 본문 복사 ─── */
  function copyContent() {
    if (!window._kbCurrentContent) return;
    navigator.clipboard.writeText(window._kbCurrentContent).then(
      () => toast('📋 본문을 복사했습니다', 'success'),
      () => toast('복사 실패', 'error')
    );
  }

  /* ─── 즐겨찾기만 보기 ─── */
  async function openMyFavorites() {
    try {
      const meta = await api('/api/protected/knowledge/_meta/info');
      if (!meta.favorites || !meta.favorites.length) {
        showModal(
          '⭐ 내 즐겨찾기',
          `<div style="padding:20px;text-align:center;color:#94a3b8">아직 즐겨찾기한 카드가 없습니다.<br>마음에 드는 카드의 ☆ 버튼을 눌러 추가해보세요.</div>
           <div style="margin-top:14px;text-align:right"><button class="btn btn-primary" data-act="PFM.closeModal()">확인</button></div>`
        );
        return;
      }
      const list = meta.favorites.map(f => `
        <div data-act="PFM.closeModal();PFMKnowledge.openCard('${f.id}')"
          style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;margin-bottom:8px"
          data-act-over="this.style.background='#f8fafc'" data-act-out="this.style.background='#fff'">
          <div style="font-weight:600;color:#1e293b;font-size:14px">${esc(f.title)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">
            ${esc(f.category)} ${f.book_source ? '· 📖 ' + esc(f.book_source) : ''}
          </div>
        </div>
      `).join('');
      showModal(
        `⭐ 내 즐겨찾기 (${meta.favorites.length}개)`,
        `<div style="max-width:520px">${list}</div>
         <div style="margin-top:14px;text-align:right;border-top:1px solid #e5e7eb;padding-top:12px">
           <button class="btn btn-default" data-act="PFM.closeModal()">닫기</button>
         </div>`
      );
    } catch (e) { toast('불러오기 실패', 'error'); }
  }

  /* ─── 필터 액션 ─── */
  function setCategory(key) { _state.category = key; loadAndRender(); }
  function setBook(name) { _state.book = name; loadAndRender(); }
  function changeSort() {
    const el = document.getElementById('kbSort');
    if (el) { _state.sort = el.value; loadAndRender(); }
  }
  function search() {
    const el = document.getElementById('kbSearch');
    if (el) { _state.q = el.value.trim(); loadAndRender(); }
  }
  function resetFilters() {
    _state.q = ''; _state.category = ''; _state.book = '';
    const s = document.getElementById('kbSearch'); if (s) s.value = '';
    loadAndRender();
  }

  /* ─── 다른 페이지로 이동 (예: 대시보드 위젯에서 클릭) ─── */
  function gotoKnowledge(category) {
    window.PFM.state.currentPage = 'knowledge';
    if (category) _state.category = category;
    window.PFM.renderApp();
  }

  /* ─── 외부 노출 ─── */
  window.PFMKnowledge = {
    openCard, toggleFavorite, copyContent, openMyFavorites,
    setCategory, setBook, changeSort, search, resetFilters,
    gotoKnowledge,
  };

  /* PFM 모듈 등록 */
  window.PFM.modules.knowledge = { renderKnowledge };
})();
