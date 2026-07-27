/* ═══════════════════════════════════════════════════════════════
   PF Manager · Polish Module v5.6 "Super Upgrade"
   ───────────────────────────────────────────────────────────────
   1. Cmd+K / Ctrl+K 커맨드 팔레트 — 63개 페이지 즉시 이동
      · 초성 검색 지원 (ㅎㅈ → 환자)
      · 최근 방문 5개 기억 (localStorage)
   2. 사이드바 그룹 접힘 상태 localStorage 기억
   3. 스켈레톤 로딩 헬퍼 (window.PFMPolish.skeleton)
   코어 번들에 포함 — 로그인 직후부터 동작.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── 페이지 카탈로그 (nav 구조와 동기) ─── */
  const PAGES = [
    ['dashboard', '🏠', '대시보드', '메인'],
    ['clinical_board', '📡', '진료보드', '메인'],
    ['patients', '👥', '환자 DB', '환자 관리'],
    ['patients_stats', '📊', '환자 통계', '환자 관리'],
    ['ltv_ranking', '👑', 'LTV 랭킹', '환자 관리'],
    ['funnel', '🎯', '환자 퍼널', '환자 관리'],
    ['recall', '🔁', '리콜 자동화', '환자 관리'],
    ['consult_records', '📝', '상담 기록', '환자 관리'],
    ['consult_dashboard', '📈', '상담 분석', '환자 관리'],
    ['complaints', '⚠️', '컴플레인 기록', '환자 관리'],
    ['complaints_stats', '📉', '컴플레인 통계', '환자 관리'],
    ['reservations', '📅', '예약 관리', '환자 관리'],
    ['reservation_stats', '🗓️', '예약 통계', '환자 관리'],
    ['wait_times', '⏱️', '대기시간 관리', '환자 관리'],
    ['wait_time_stats', '⏳', '대기시간 통계', '환자 관리'],
    ['calls_inbound', '📞', '인바운드 콜', '콜 관리'],
    ['calls_outbound', '📲', '아웃바운드 콜', '콜 관리'],
    ['calls_stats', '📊', '콜 통계', '콜 관리'],
    ['fee_schedule', '💰', '수가표', '진료 관리'],
    ['materials', '📄', '설명자료', '진료 관리'],
    ['pricing', '💵', '비용 안내', '진료 관리'],
    ['cases', '📸', '케이스 사진', '진료 관리'],
    ['scripts', '🎬', '상담 스크립트', '진료 관리'],
    ['hr_dashboard', '💼', 'HR 대시보드', 'HR'],
    ['hr_staff', '🧑‍⚕️', '직원 관리', 'HR'],
    ['hire_applicants', '🙋', '지원자 관리', 'HR'],
    ['hire_interviews', '🗓️', '면접 캘린더', 'HR'],
    ['hire_onboarding', '🚀', '온보딩', 'HR'],
    ['leave_management', '🏖️', '연차 관리', 'HR'],
    ['notice', '📢', '공지사항', '병원 운영'],
    ['calendar', '📆', '일정 관리', '병원 운영'],
    ['meetings', '📝', '회의록', '병원 운영'],
    ['checklists', '✅', '체크리스트', '병원 운영'],
    ['kanban_purchase', '🛒', '물품 구매', '병원 운영'],
    ['kanban_repair', '🔧', '수리/정비', '병원 운영'],
    ['free', '💬', '자유게시판', '커뮤니티'],
    ['praise', '💖', '칭찬하기', '커뮤니티'],
    ['mistake', '🛡️', '실수노트', '커뮤니티'],
    ['feedback_notes', '📚', '피드백 노트', '커뮤니티'],
    ['pf_index', '📊', '페이션트 인덱스', '시그니처'],
    ['manuals', '📖', '우리 병원 매뉴얼', '시그니처'],
    ['referrals', '🌌', '소개 갤럭시', '시그니처'],
    ['settings', '⚙️', '설정', '시스템'],
  ];

  const LS_RECENT = 'pfm_cmdk_recent';
  const LS_GROUPS = 'pfm_nav_groups';

  /* ─── 한글 초성 추출 ─── */
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  function toChoseong(str) {
    let out = '';
    for (const ch of str) {
      const code = ch.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) out += CHO[Math.floor((code - 0xac00) / 588)];
      else out += ch;
    }
    return out;
  }

  /* ─── 퍼지 매칭: 부분 문자열 + 초성 ─── */
  function match(query, label, group) {
    const q = query.toLowerCase().trim();
    if (!q) return { hit: true, score: 0 };
    const l = label.toLowerCase();
    const g = (group || '').toLowerCase();
    let idx = l.indexOf(q);
    if (idx >= 0) return { hit: true, score: 100 - idx, hl: [idx, idx + q.length] };
    if (g.indexOf(q) >= 0) return { hit: true, score: 40 };
    // 초성 검색
    const cho = toChoseong(label);
    idx = cho.indexOf(q);
    if (idx >= 0) return { hit: true, score: 70 - idx, hl: [idx, idx + q.length] };
    return { hit: false };
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(LS_RECENT) || '[]'); } catch { return []; }
  }
  function pushRecent(pageId) {
    try {
      let r = getRecent().filter((p) => p !== pageId);
      r.unshift(pageId);
      localStorage.setItem(LS_RECENT, JSON.stringify(r.slice(0, 5)));
    } catch {}
  }

  /* ─── 커맨드 팔레트 ─── */
  let overlay = null, input = null, listEl = null;
  let selIdx = 0, currentItems = [];

  function ensurePalette() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'cmdk-overlay';
    overlay.id = 'cmdkOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', '빠른 이동');
    overlay.innerHTML = `
      <div class="cmdk-panel">
        <div class="cmdk-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="cmdk-input" id="cmdkInput" type="text" placeholder="메뉴 검색... (초성도 OK: ㅎㅈ → 환자)" autocomplete="off" spellcheck="false" />
          <span class="cmdk-esc">ESC</span>
        </div>
        <div class="cmdk-list" id="cmdkList" role="listbox"></div>
        <div class="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 이동</span>
          <span><kbd>Enter</kbd> 열기</span>
          <span><kbd>ESC</kbd> 닫기</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector('#cmdkInput');
    listEl = overlay.querySelector('#cmdkList');

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    input.addEventListener('input', () => { selIdx = 0; renderList(input.value); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(selIdx); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  function highlight(label, hl) {
    if (!hl) return label;
    return label.slice(0, hl[0]) + '<mark>' + label.slice(hl[0], hl[1]) + '</mark>' + label.slice(hl[1]);
  }

  function renderList(query) {
    const q = (query || '').trim();
    let html = '';
    currentItems = [];

    if (!q) {
      const recent = getRecent()
        .map((id) => PAGES.find((p) => p[0] === id))
        .filter(Boolean);
      if (recent.length) {
        html += '<div class="cmdk-section-label">최근 방문</div>';
        for (const p of recent) { currentItems.push(p); }
        html += recent.map((p, i) =>
          itemHtml(p, i, null)).join('');
      }
      html += '<div class="cmdk-section-label">전체 메뉴</div>';
      const rest = PAGES.filter((p) => !recent.includes(p));
      const base = currentItems.length;
      rest.forEach((p, i) => { currentItems.push(p); });
      html += rest.map((p, i) => itemHtml(p, base + i, null)).join('');
    } else {
      const scored = [];
      for (const p of PAGES) {
        const m = match(q, p[2], p[3]);
        if (m.hit) scored.push({ p, score: m.score, hl: m.hl });
      }
      scored.sort((a, b) => b.score - a.score);
      if (!scored.length) {
        listEl.innerHTML = '<div class="cmdk-empty">「' + escapeHtml(q) + '」 검색 결과가 없습니다</div>';
        return;
      }
      scored.forEach((s, i) => { currentItems.push(s.p); });
      html = scored.map((s, i) => itemHtml(s.p, i, s.hl)).join('');
    }
    listEl.innerHTML = html;
    bindItems();
    applySel();
  }

  function itemHtml(p, idx, hl) {
    return '<button class="cmdk-item" data-idx="' + idx + '" role="option">' +
      '<span class="cmdk-item-emoji">' + p[1] + '</span>' +
      '<span>' + highlight(escapeHtml(p[2]), hl) + '</span>' +
      '<span class="cmdk-item-group">' + p[3] + '</span></button>';
  }

  function bindItems() {
    listEl.querySelectorAll('.cmdk-item').forEach((el) => {
      el.addEventListener('click', () => go(parseInt(el.dataset.idx, 10)));
      el.addEventListener('mousemove', () => { selIdx = parseInt(el.dataset.idx, 10); applySel(false); });
    });
  }

  function applySel(scroll = true) {
    listEl.querySelectorAll('.cmdk-item').forEach((el) => {
      const on = parseInt(el.dataset.idx, 10) === selIdx;
      el.classList.toggle('selected', on);
      if (on && scroll) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function move(d) {
    if (!currentItems.length) return;
    selIdx = (selIdx + d + currentItems.length) % currentItems.length;
    applySel();
  }

  function go(idx) {
    const p = currentItems[idx];
    if (!p) return;
    pushRecent(p[0]);
    close();
    if (typeof window.PFM?.navigate === 'function') window.PFM.navigate(p[0]);
    else if (typeof window.navigate === 'function') window.navigate(p[0]);
  }

  function open() {
    ensurePalette();
    overlay.classList.add('open');
    input.value = '';
    selIdx = 0;
    renderList('');
    setTimeout(() => input.focus(), 30);
  }
  function close() { if (overlay) overlay.classList.remove('open'); }
  function toggle() { overlay && overlay.classList.contains('open') ? close() : open(); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ─── 전역 키 바인딩 ─── */
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      // 로그인 전엔 무시
      if (!localStorage.getItem('pfm_user')) return;
      toggle();
    }
  });

  /* ─── 사이드바 그룹 접힘 기억 ─── */
  function loadGroups() {
    try { return JSON.parse(localStorage.getItem(LS_GROUPS) || 'null'); } catch { return null; }
  }
  function saveGroups(groups) {
    try { localStorage.setItem(LS_GROUPS, JSON.stringify(groups)); } catch {}
  }

  /* ─── 스켈레톤 로딩 헬퍼 ─── */
  function skeleton(kind) {
    if (kind === 'stats') {
      return '<div class="skeleton-page">' +
        '<div class="skeleton-row"><div class="skeleton skeleton-stat"></div><div class="skeleton skeleton-stat"></div><div class="skeleton skeleton-stat"></div><div class="skeleton skeleton-stat"></div></div>' +
        '<div class="skeleton skeleton-block"></div>' +
        '<div class="skeleton-row"><div class="skeleton skeleton-block" style="flex:1"></div><div class="skeleton skeleton-block" style="flex:1"></div></div></div>';
    }
    if (kind === 'list') {
      let rows = '';
      for (let i = 0; i < 8; i++) rows += '<div class="skeleton skeleton-line" style="width:' + (55 + Math.random() * 40) + '%"></div>';
      return '<div class="skeleton-page"><div class="skeleton skeleton-line" style="width:30%;height:24px"></div>' + rows + '</div>';
    }
    return '<div class="skeleton-page"><div class="skeleton skeleton-block"></div></div>';
  }

  /* ─── 공개 API ─── */
  window.PFMPolish = { openPalette: open, closePalette: close, loadGroups, saveGroups, skeleton, pushRecent };
})();
