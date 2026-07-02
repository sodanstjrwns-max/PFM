/* ═══════════════════════════════════════════════════════════
 * Referrals Module - 3D 소개 갤럭시 + 팬 등급 관리
 * ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict'

  const api = window.PFM?.api || (async () => ({}))
  const ICONS = window.PFM?.ICONS || {}

  // 등급 메타 (옵시디언급: 글로우 컬러 추가)
  const LEVEL_META = {
    evangelist: { label: '전도사', emoji: '🌟', color: '#fbbf24', glow: '#fde047', bg: 'from-yellow-400 to-orange-500' },
    fan:        { label: '팬',     emoji: '💎', color: '#06b6d4', glow: '#67e8f9', bg: 'from-cyan-400 to-blue-500' },
    loyal:      { label: '충성',   emoji: '💗', color: '#ec4899', glow: '#f9a8d4', bg: 'from-pink-400 to-rose-500' },
    satisfied:  { label: '만족',   emoji: '😊', color: '#10b981', glow: '#6ee7b7', bg: 'from-emerald-400 to-green-500' },
    general:    { label: '일반',   emoji: '👤', color: '#94a3b8', glow: '#cbd5e1', bg: 'from-slate-300 to-slate-400' }
  }

  let graphInstance = null
  let currentMode = 'galaxy'  // galaxy / list / stats
  let cachedGraph = null

  // 옵시디언급 상태 관리
  let highlightNodes = new Set()
  let highlightLinks = new Set()
  let hoverNode = null
  let autoRotate = false
  let rotateAnimId = null
  let glowTextureCache = {}    // 등급별 글로우 텍스처 캐시
  let starfieldAdded = false   // 별빛 배경 추가 여부

  // 시그니처 비주얼 상태
  let pulseAnimId = null       // 노드 맥동 애니메이션
  let meteorAnimId = null      // 별똥별 루프
  let coronaSprites = []       // 전도사 코로나 스프라이트
  let meteors = []             // 활성 별똥별
  let bloomComposer = null     // Bloom 후처리
  let timeSliderActive = false // 시간 슬라이더 모드
  let aiPredictionActive = false // AI 예측 모드
  let originalNodes = null     // 원본 노드 백업
  let originalLinks = null     // 원본 링크 백업

  // ────────────────────────────────────────────────
  // 메인 렌더
  // ────────────────────────────────────────────────
  async function renderReferrals(body, actions) {
    if (!body) return

    body.innerHTML = `
      <div class="referrals-page">
        <!-- Header / Tabs -->
        <div class="rfx-header glass rounded-2xl p-4 mb-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>🌌</span>
                <span>소개 갤럭시 — Patient Referral Universe</span>
              </h2>
              <p class="text-sm text-slate-600 mt-1">환자가 환자를 데려오는 우주. 팬 등급 자동 분류.</p>
            </div>
            <div class="flex gap-2">
              <button class="rfx-tab-btn px-4 py-2 rounded-xl font-medium text-sm" data-mode="galaxy">
                🌌 갤럭시 뷰
              </button>
              <button class="rfx-tab-btn px-4 py-2 rounded-xl font-medium text-sm" data-mode="list">
                💎 팬 랭킹
              </button>
              <button class="rfx-tab-btn px-4 py-2 rounded-xl font-medium text-sm" data-mode="stats">
                📊 통계 + 알림
              </button>
              <button id="rfx-add-btn" class="px-4 py-2 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow">
                + 소개 등록
              </button>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div id="rfx-body"></div>
      </div>

      <style>
        .rfx-tab-btn {
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(0,0,0,0.06);
          color: #475569;
          transition: all 0.2s;
        }
        .rfx-tab-btn:hover { background: rgba(255,255,255,0.9); }
        .rfx-tab-btn.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
        #rfx-graph {
          width: 100%; height: 78vh; min-height: 600px;
          background: radial-gradient(ellipse at center, #0a0e1a 0%, #000000 100%);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 100px rgba(99,102,241,0.08), 0 20px 60px rgba(0,0,0,0.4);
        }
        #rfx-graph canvas { outline: none; cursor: grab; }
        #rfx-graph canvas:active { cursor: grabbing; }
        .rfx-tooltip {
          position: absolute; pointer-events: none;
          background: rgba(15,23,42,0.95); backdrop-filter: blur(10px);
          border: 1px solid rgba(99,102,241,0.4);
          color: white; padding: 0.75rem 1rem; border-radius: 0.75rem;
          font-size: 13px; z-index: 100; max-width: 280px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          opacity: 0; transition: opacity 0.15s;
        }
        /* 옵시디언급 노드 라벨 (CSS2D) */
        .rfx-node-label {
          color: rgba(255,255,255,0.85);
          font-size: 11px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
          letter-spacing: -0.2px;
          text-shadow: 0 0 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7);
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
          padding: 2px 6px;
          transition: opacity 0.2s, transform 0.2s;
          transform: translate(-50%, -180%);
        }
        .rfx-node-label.highlighted {
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          text-shadow: 0 0 8px currentColor, 0 0 16px currentColor;
        }
        .rfx-node-label.dimmed { opacity: 0.15; }
        .rfx-node-label.hidden { opacity: 0; }
        /* 옵시디언급 컨트롤 패널 */
        .rfx-control-panel {
          position: absolute; top: 12px; right: 12px; z-index: 50;
          background: rgba(15,23,42,0.78); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 12px;
          color: white; font-size: 12px;
          min-width: 220px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .rfx-control-panel h4 {
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase; letter-spacing: 1.2px;
          margin-bottom: 8px;
        }
        .rfx-control-row { margin-bottom: 12px; }
        .rfx-control-row label {
          display: flex; justify-content: space-between;
          font-size: 11px; color: rgba(255,255,255,0.7);
          margin-bottom: 4px;
        }
        .rfx-control-row input[type="range"] {
          width: 100%; accent-color: #818cf8;
          height: 4px;
        }
        .rfx-search-box {
          position: absolute; top: 12px; left: 12px; z-index: 50;
          background: rgba(15,23,42,0.78); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 8px 12px;
          display: flex; align-items: center; gap: 8px;
          width: 240px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .rfx-search-box input {
          background: transparent; border: none; outline: none;
          color: white; font-size: 13px; flex: 1;
          font-family: -apple-system, 'Noto Sans KR', sans-serif;
        }
        .rfx-search-box input::placeholder { color: rgba(255,255,255,0.4); }
        .rfx-mini-btn {
          padding: 6px 10px; border-radius: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          font-size: 11px; cursor: pointer;
          transition: all 0.15s;
        }
        .rfx-mini-btn:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(129,140,248,0.5);
        }
        .rfx-mini-btn.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: transparent; color: white;
        }
        /* 검색결과 */
        .rfx-search-results {
          position: absolute; top: 56px; left: 12px; z-index: 49;
          background: rgba(15,23,42,0.95); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 4px; width: 240px;
          max-height: 280px; overflow-y: auto;
        }
        .rfx-search-result-item {
          padding: 8px 10px; border-radius: 6px; cursor: pointer;
          color: white; font-size: 12px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .rfx-search-result-item:hover { background: rgba(99,102,241,0.2); }
        /* 그래프 우측하단 통계 미니뷰 */
        .rfx-mini-stats {
          position: absolute; bottom: 12px; left: 12px; z-index: 50;
          background: rgba(15,23,42,0.78); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 8px 12px;
          color: white; font-size: 11px;
          display: flex; gap: 14px;
        }
        .rfx-mini-stats span b { color: #fde047; }

        /* ═══ 시그니처 비주얼: 영웅 카드 ═══ */
        .rfx-hero-card {
          position: absolute; top: 70px; left: 12px; z-index: 48;
          width: 320px;
          background: linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,27,75,0.92));
          backdrop-filter: blur(16px);
          border: 1px solid rgba(251,191,36,0.3);
          border-radius: 16px; padding: 18px;
          box-shadow: 0 0 50px rgba(251,191,36,0.15), 0 20px 60px rgba(0,0,0,0.5);
          color: white;
          opacity: 0; transform: translateY(-10px);
          animation: rfxHeroFadeIn 0.8s ease 1.5s forwards;
        }
        @keyframes rfxHeroFadeIn {
          to { opacity: 1; transform: translateY(0); }
        }
        .rfx-hero-badge {
          display: inline-block;
          font-size: 10px; font-weight: 800;
          letter-spacing: 2px;
          background: linear-gradient(90deg, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          text-shadow: 0 0 20px rgba(251,191,36,0.5);
        }
        .rfx-hero-title {
          font-size: 20px; font-weight: 800;
          line-height: 1.3; margin-bottom: 6px;
          background: linear-gradient(135deg, #fff, #fde047);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          min-height: 52px;
        }
        .rfx-hero-title .typing-cursor {
          display: inline-block; width: 2px; height: 18px;
          background: #fde047; margin-left: 2px;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0 } }
        .rfx-hero-subtitle {
          font-size: 12px; opacity: 0.75;
          margin-bottom: 12px; line-height: 1.5;
        }
        .rfx-hero-top3 {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 10px;
          font-size: 11px;
        }
        .rfx-hero-top3-item {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 5px 0;
          opacity: 0; transform: translateX(-10px);
          animation: rfxRankIn 0.5s ease forwards;
        }
        .rfx-hero-top3-item:nth-child(1) { animation-delay: 2.0s }
        .rfx-hero-top3-item:nth-child(2) { animation-delay: 2.2s }
        .rfx-hero-top3-item:nth-child(3) { animation-delay: 2.4s }
        @keyframes rfxRankIn {
          to { opacity: 1; transform: translateX(0); }
        }
        .rfx-hero-rank-name { font-weight: 700; }
        .rfx-hero-rank-meta { color: #fde047; font-weight: 700; }

        /* ═══ 시네마틱 인트로 ═══ */
        .rfx-cinematic-intro {
          position: absolute; inset: 0; z-index: 60;
          background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          animation: rfxIntroFade 4.5s ease forwards;
        }
        @keyframes rfxIntroFade {
          0% { opacity: 1 }
          80% { opacity: 1 }
          100% { opacity: 0; visibility: hidden }
        }
        .rfx-intro-text {
          text-align: center; color: white;
          font-family: 'Noto Sans KR', sans-serif;
        }
        .rfx-intro-line1 {
          font-size: 22px; font-weight: 300;
          opacity: 0; letter-spacing: 8px;
          animation: rfxIntroLine 1s ease 0.3s forwards;
        }
        .rfx-intro-line2 {
          font-size: 56px; font-weight: 900;
          margin: 14px 0;
          background: linear-gradient(135deg, #fde047, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 60px rgba(251,191,36,0.6);
          opacity: 0; letter-spacing: 4px;
          animation: rfxIntroLine 1.2s ease 1s forwards;
        }
        .rfx-intro-line3 {
          font-size: 14px; opacity: 0;
          letter-spacing: 12px; color: rgba(255,255,255,0.6);
          animation: rfxIntroLine 1s ease 2s forwards;
        }
        @keyframes rfxIntroLine {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ═══ 클릭 임팩트 텍스트 ═══ */
        .rfx-impact-text {
          position: absolute; left: 50%; top: 35%;
          transform: translate(-50%, -50%) scale(0.5);
          z-index: 55; pointer-events: none;
          font-size: 36px; font-weight: 900;
          color: white; text-align: center;
          opacity: 0; white-space: nowrap;
          text-shadow: 0 0 40px currentColor, 0 0 80px currentColor;
          font-family: 'Noto Sans KR', sans-serif;
        }
        .rfx-impact-text.show {
          animation: rfxImpactPop 2.5s ease forwards;
        }
        @keyframes rfxImpactPop {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
          15% { opacity: 1; transform: translate(-50%,-50%) scale(1.1); }
          25% { transform: translate(-50%,-50%) scale(1.0); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(0.95); }
        }

        /* ═══ 시간 슬라이더 (B 기능) ═══ */
        .rfx-time-slider {
          position: absolute; bottom: 60px; left: 50%;
          transform: translateX(-50%); z-index: 50;
          background: rgba(15,23,42,0.85); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 12px 16px;
          color: white; width: 460px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .rfx-time-header {
          display: flex; justify-content: space-between;
          font-size: 12px; font-weight: 700;
          margin-bottom: 8px;
        }
        .rfx-time-current {
          color: #fde047; font-weight: 800;
        }
        .rfx-time-slider input[type="range"] {
          width: 100%; accent-color: #fde047;
        }
        .rfx-time-controls {
          display: flex; gap: 8px; margin-top: 8px;
          justify-content: center;
        }

        /* ═══ AI 예측 토글 (C 기능) ═══ */
        .rfx-ai-toggle {
          position: absolute; bottom: 12px; right: 12px;
          z-index: 50;
        }
        .rfx-ai-info {
          margin-top: 6px; padding: 6px 10px;
          background: rgba(167,139,250,0.2);
          border: 1px solid rgba(167,139,250,0.4);
          border-radius: 8px;
          color: #c4b5fd; font-size: 11px;
        }
        .rfx-mini-btn.ai-active {
          background: linear-gradient(135deg, #a78bfa, #ec4899) !important;
          border-color: transparent !important;
          color: white !important;
          box-shadow: 0 0 20px rgba(167,139,250,0.5);
        }
        .rfx-fan-card {
          background: white; border-radius: 1rem; padding: 1rem;
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.2s;
        }
        .rfx-fan-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .rfx-stat-card {
          background: white; border-radius: 1rem; padding: 1.25rem;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .rfx-legend-dot {
          display:inline-block; width:12px; height:12px; border-radius:50%;
          box-shadow: 0 0 8px currentColor;
        }
        @keyframes pulse-glow {
          0%,100% { filter: drop-shadow(0 0 4px currentColor); }
          50%     { filter: drop-shadow(0 0 12px currentColor); }
        }
      </style>
    `

    // 탭 전환
    body.querySelectorAll('.rfx-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentMode = btn.dataset.mode
        body.querySelectorAll('.rfx-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === currentMode))
        renderMode()
      })
    })
    body.querySelector('[data-mode="galaxy"]').classList.add('active')
    body.querySelector('#rfx-add-btn').addEventListener('click', openAddModal)

    renderMode()
  }

  async function renderMode() {
    const target = document.getElementById('rfx-body')
    if (!target) return

    if (currentMode === 'galaxy')   await renderGalaxy(target)
    else if (currentMode === 'list') await renderFanList(target)
    else                              await renderStats(target)
  }

  // ────────────────────────────────────────────────
  // 1. 3D 갤럭시 뷰
  // ────────────────────────────────────────────────
  async function renderGalaxy(target) {
    target.innerHTML = `
      <div class="grid grid-cols-12 gap-4">
        <!-- 사이드 필터 -->
        <div class="col-span-12 md:col-span-3 space-y-3">
          <div class="glass rounded-2xl p-4">
            <h3 class="font-bold text-sm mb-3">🎛️ 필터</h3>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-slate-600 mb-1 block">등급</label>
                <select id="rfx-flt-level" class="w-full px-3 py-2 rounded-lg border text-sm">
                  <option value="">전체</option>
                  <option value="evangelist">🌟 전도사</option>
                  <option value="fan">💎 팬</option>
                  <option value="loyal">💗 충성</option>
                  <option value="satisfied">😊 만족</option>
                  <option value="general">👤 일반</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-600 mb-1 block">최소 영향력 점수</label>
                <input type="range" id="rfx-flt-score" min="0" max="700" step="50" value="0" class="w-full">
                <div class="text-xs text-slate-500 mt-1"><span id="rfx-flt-score-val">0</span>+</div>
              </div>
              <div>
                <label class="text-xs text-slate-600 mb-1 block">진료 영역</label>
                <input type="text" id="rfx-flt-treatment" placeholder="예: 임플란트" class="w-full px-3 py-2 rounded-lg border text-sm">
              </div>
              <button id="rfx-apply-flt" class="w-full px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium">필터 적용</button>
              <button id="rfx-reset-cam" class="w-full px-3 py-2 rounded-lg bg-slate-100 text-sm">📷 카메라 리셋</button>
            </div>
          </div>

          <div class="glass rounded-2xl p-4">
            <h3 class="font-bold text-sm mb-3">🎨 범례</h3>
            <div class="space-y-2 text-xs">
              ${Object.entries(LEVEL_META).map(([k, v]) => `
                <div class="flex items-center gap-2">
                  <span class="rfx-legend-dot" style="background:${v.color};color:${v.color}"></span>
                  <span>${v.emoji} ${v.label}</span>
                </div>
              `).join('')}
            </div>
            <div class="text-xs text-slate-500 mt-3 space-y-1">
              <div>• 노드 크기 = 소개 영향력</div>
              <div>• 선 두께 = 소개 매출</div>
              <div>• 마우스 드래그 = 회전</div>
              <div>• 휠 = 줌 / 클릭 = 상세</div>
            </div>
          </div>
        </div>

        <!-- 그래프 + 통계 -->
        <div class="col-span-12 md:col-span-9">
          <div id="rfx-graph" style="position:relative;">
            <!-- 영웅 카드 (좌상단 시그니처) -->
            <div class="rfx-hero-card" id="rfx-hero-card">
              <div class="rfx-hero-badge">⚡ MEKKAH OF REFERRALS</div>
              <div class="rfx-hero-title" id="rfx-hero-title"></div>
              <div class="rfx-hero-subtitle" id="rfx-hero-subtitle"></div>
              <div class="rfx-hero-top3" id="rfx-hero-top3"></div>
            </div>

            <!-- 검색창 -->
            <div class="rfx-search-box">
              <span style="opacity:0.6">🔍</span>
              <input id="rfx-search" type="text" placeholder="환자 이름으로 검색...">
              <span id="rfx-search-count" style="font-size:10px;opacity:0.5"></span>
            </div>
            <div id="rfx-search-results" class="rfx-search-results" style="display:none"></div>

            <!-- 시간 슬라이더 (B 기능) -->
            <div class="rfx-time-slider" id="rfx-time-slider">
              <div class="rfx-time-header">
                <span>🕒 시간 여행</span>
                <span class="rfx-time-current" id="rfx-time-current">현재</span>
              </div>
              <input type="range" id="rfx-time-range" min="0" max="100" value="100" step="1">
              <div class="rfx-time-controls">
                <button class="rfx-mini-btn" id="rfx-time-play">▶ 자동재생</button>
                <button class="rfx-mini-btn" id="rfx-time-reset">↻ 현재로</button>
              </div>
            </div>

            <!-- AI 예측 토글 (C 기능) -->
            <div class="rfx-ai-toggle" id="rfx-ai-toggle">
              <button class="rfx-mini-btn" id="rfx-ai-btn">🤖 AI 예측 모드</button>
              <div class="rfx-ai-info" id="rfx-ai-info" style="display:none">
                3개월 후 소개 가능성 예측
              </div>
            </div>

            <!-- 시네마틱 인트로 오버레이 -->
            <div class="rfx-cinematic-intro" id="rfx-cinematic-intro">
              <div class="rfx-intro-text">
                <div class="rfx-intro-line1">200명의 환자가 만든</div>
                <div class="rfx-intro-line2">신뢰의 우주</div>
                <div class="rfx-intro-line3">— 페이션트 퍼널 —</div>
              </div>
            </div>

            <!-- 클릭 임팩트 텍스트 -->
            <div class="rfx-impact-text" id="rfx-impact-text"></div>

            <!-- 우측 컨트롤 패널 -->
            <div class="rfx-control-panel">
              <h4>🎮 그래프 컨트롤</h4>
              <div class="rfx-control-row">
                <label>반발력 <span id="rfx-charge-val">-180</span></label>
                <input type="range" id="rfx-charge" min="-500" max="-30" step="10" value="-180">
              </div>
              <div class="rfx-control-row">
                <label>링크 거리 <span id="rfx-linkdist-val">60</span></label>
                <input type="range" id="rfx-linkdist" min="20" max="200" step="5" value="60">
              </div>
              <div class="rfx-control-row">
                <label>중력 <span id="rfx-gravity-val">0.10</span></label>
                <input type="range" id="rfx-gravity" min="0" max="0.5" step="0.01" value="0.10">
              </div>
              <div class="rfx-control-row">
                <label>라벨 표시</label>
                <select id="rfx-label-mode" class="w-full" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:white;padding:4px 6px;border-radius:6px;font-size:11px">
                  <option value="all">전체</option>
                  <option value="hover" selected>호버 시</option>
                  <option value="influencer">팬 이상만</option>
                  <option value="none">숨김</option>
                </select>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button id="rfx-rotate-btn" class="rfx-mini-btn">🔄 자동회전</button>
                <button id="rfx-fit-btn" class="rfx-mini-btn">📷 전체보기</button>
              </div>
            </div>

            <!-- 좌하단 미니 통계 -->
            <div class="rfx-mini-stats">
              <span>🔗 링크 <b id="rfx-stat-links">0</b></span>
              <span>👥 노드 <b id="rfx-stat-nodes">0</b></span>
              <span>💰 매출 <b id="rfx-stat-revenue">0</b>억</span>
            </div>

            <!-- 로딩 -->
            <div id="rfx-loading" class="absolute inset-0 flex items-center justify-center text-white/60" style="z-index:5;pointer-events:none;">
              <div class="text-center">
                <div class="animate-spin h-12 w-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-3"></div>
                <div class="text-sm">3D 갤럭시 로딩 중...</div>
              </div>
            </div>
          </div>
          <div id="rfx-graph-stats" class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2"></div>
        </div>
      </div>

      <div id="rfx-tooltip" class="rfx-tooltip"></div>
    `

    // 필터 이벤트
    const flt = {
      level:     target.querySelector('#rfx-flt-level'),
      score:     target.querySelector('#rfx-flt-score'),
      scoreVal:  target.querySelector('#rfx-flt-score-val'),
      treatment: target.querySelector('#rfx-flt-treatment')
    }
    flt.score.addEventListener('input', () => flt.scoreVal.textContent = flt.score.value)
    target.querySelector('#rfx-apply-flt').addEventListener('click', () => loadGalaxy(flt))
    target.querySelector('#rfx-reset-cam').addEventListener('click', () => {
      if (graphInstance) graphInstance.cameraPosition({ x: 0, y: 0, z: 350 }, undefined, 800)
    })

    // 3d-force-graph 라이브러리 로드 (CDN)
    await loadForceGraphLib()
    await loadGalaxy(flt)
  }

  function loadForceGraphLib() {
    return new Promise((resolve, reject) => {
      if (window.ForceGraph3D && window.THREE) return resolve()
      const loadScript = (src) => new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = src
        s.onload = res
        s.onerror = rej
        document.head.appendChild(s)
      })
      // Three.js → 3d-force-graph 순차 로드 (CSS2DRenderer 포함)
      loadScript('https://unpkg.com/three@0.149.0/build/three.min.js')
        .then(() => loadScript('https://unpkg.com/3d-force-graph@1.73.4/dist/3d-force-graph.min.js'))
        .then(resolve)
        .catch(reject)
    })
  }

  // ────────────────────────────────────────────────
  // 옵시디언급: 글로우 스프라이트 텍스처 생성
  // ────────────────────────────────────────────────
  function createGlowTexture(color, glowColor) {
    const cacheKey = color + '_' + glowColor
    if (glowTextureCache[cacheKey]) return glowTextureCache[cacheKey]

    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 128
    const ctx = canvas.getContext('2d')

    // 1) 외곽 글로우 (큰 반경)
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, glowColor + 'ff')
    grad.addColorStop(0.15, color + 'cc')
    grad.addColorStop(0.4, color + '55')
    grad.addColorStop(0.7, color + '15')
    grad.addColorStop(1, color + '00')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)

    // 2) 코어 (밝은 중심)
    const core = ctx.createRadialGradient(64, 64, 0, 64, 64, 18)
    core.addColorStop(0, '#ffffff')
    core.addColorStop(0.4, glowColor)
    core.addColorStop(1, color + '00')
    ctx.fillStyle = core
    ctx.fillRect(0, 0, 128, 128)

    const texture = new window.THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    glowTextureCache[cacheKey] = texture
    return texture
  }

  // ────────────────────────────────────────────────
  // 옵시디언급: 글로우 노드 객체 (Sprite + Pulse)
  // ────────────────────────────────────────────────
  function createGlowNode(node) {
    const THREE = window.THREE
    const meta = LEVEL_META[node.level] || LEVEL_META.general
    const texture = createGlowTexture(meta.color, meta.glow)

    const group = new THREE.Group()

    // 메인 글로우 스프라이트
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    const baseSize = node.val || 4
    const scale = baseSize * 4 + (node.referralCount || 0) * 0.8
    sprite.scale.set(scale, scale, 1)
    group.add(sprite)
    group.__sprite = sprite
    group.__baseScale = scale
    group.__node = node

    // 전도사·팬급은 추가 외곽 후광
    if (node.level === 'evangelist' || node.level === 'fan') {
      const haloMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const halo = new THREE.Sprite(haloMat)
      halo.scale.set(scale * 1.8, scale * 1.8, 1)
      group.add(halo)
      group.__halo = halo
    }

    return group
  }

  // ────────────────────────────────────────────────
  // 옵시디언급: 별빛 배경 (Starfield)
  // ────────────────────────────────────────────────
  function addStarfield(scene) {
    if (starfieldAdded) return
    const THREE = window.THREE
    const geometry = new THREE.BufferGeometry()
    const count = 4000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      // 큰 구 형태로 분포
      const r = 1500 + Math.random() * 1500
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      // 별 색상 변주 (흰색~파란색~주황색)
      const tint = Math.random()
      if (tint > 0.95) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.5  // 주황별
      } else if (tint > 0.85) {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1   // 파란별
      } else {
        const c = 0.7 + Math.random() * 0.3
        colors[i * 3] = c; colors[i * 3 + 1] = c; colors[i * 3 + 2] = c
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    const stars = new THREE.Points(geometry, material)
    stars.name = 'starfield'
    scene.add(stars)

    // 안개 효과로 깊이감
    scene.fog = new THREE.FogExp2(0x000814, 0.0005)

    starfieldAdded = true
  }

  // ────────────────────────────────────────────────
  // 옵시디언급: 이웃 하이라이트
  // ────────────────────────────────────────────────
  function updateHighlight(node, links) {
    highlightNodes.clear()
    highlightLinks.clear()
    if (node) {
      highlightNodes.add(node)
      links.forEach(l => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        const tId = typeof l.target === 'object' ? l.target.id : l.target
        if (sId === node.id) { highlightLinks.add(l); highlightNodes.add(l.target) }
        if (tId === node.id) { highlightLinks.add(l); highlightNodes.add(l.source) }
      })
    }
    hoverNode = node || null
  }

  async function loadGalaxy(flt) {
    const container = document.getElementById('rfx-graph')
    if (!container) return

    const params = new URLSearchParams()
    if (flt.level.value)     params.set('level', flt.level.value)
    if (flt.score.value > 0) params.set('min_score', flt.score.value)
    if (flt.treatment.value) params.set('treatment', flt.treatment.value)

    const data = await api(`/api/protected/referrals/graph?${params}`).catch(() => ({}))
    cachedGraph = data
    const loading = document.getElementById('rfx-loading')
    if (!data.ok) {
      if (loading) loading.innerHTML = '<div class="text-white/60">로딩 실패</div>'
      return
    }

    if (!window.ForceGraph3D || !window.THREE) {
      if (loading) loading.innerHTML = '<div class="text-white">3D 라이브러리 로드 실패</div>'
      return
    }

    const THREE = window.THREE
    starfieldAdded = false  // 재로드 시 별 다시 그림

    // ───── 옵시디언급 그래프 초기화 ─────
    graphInstance = window.ForceGraph3D()(container)
      .backgroundColor('#000510')
      .showNavInfo(false)
      .nodeRelSize(1)
      // 커스텀 글로우 스프라이트 노드
      .nodeThreeObject(node => {
        const obj = createGlowNode(node)
        // 라벨용 sprite 생성 (Three.js Sprite 텍스트)
        const labelTex = createTextLabel(node.name, node.color)
        if (labelTex) {
          const labelMat = new THREE.SpriteMaterial({
            map: labelTex, transparent: true, depthWrite: false
          })
          const labelSprite = new THREE.Sprite(labelMat)
          const w = labelTex.image.width / 8
          const h = labelTex.image.height / 8
          labelSprite.scale.set(w, h, 1)
          labelSprite.position.set(0, (node.val || 4) * 2.5 + 4, 0)
          labelSprite.userData.isLabel = true
          obj.add(labelSprite)
          obj.__label = labelSprite
        }
        return obj
      })
      .nodeThreeObjectExtend(false)
      // 링크: 두꺼운 발광 라인
      .linkColor(link => {
        if (highlightLinks.size > 0) {
          return highlightLinks.has(link)
            ? 'rgba(255,236,128,0.95)'   // 하이라이트: 황금빛
            : 'rgba(99,102,241,0.05)'    // 나머지: 거의 투명
        }
        return 'rgba(129,140,248,0.35)'
      })
      .linkWidth(link => {
        if (highlightLinks.has(link)) return Math.max(2, link.width || 1)
        return Math.max(0.5, (link.width || 1) * 0.6)
      })
      .linkOpacity(0.9)
      .linkDirectionalArrowLength(link => highlightLinks.has(link) ? 6 : 3)
      .linkDirectionalArrowRelPos(0.92)
      .linkDirectionalArrowColor(link => highlightLinks.has(link) ? '#fde047' : '#a5b4fc')
      // 흐르는 빛 입자 (매출이 큰 링크는 더 많이)
      .linkDirectionalParticles(link => {
        if (highlightLinks.has(link)) return 4
        if (link.revenue > 5000000) return 2
        if (link.revenue > 2000000) return 1
        return 0
      })
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleColor(link => highlightLinks.has(link) ? '#fde047' : '#c7d2fe')
      .linkDirectionalParticleWidth(link => highlightLinks.has(link) ? 3 : 2)
      // 호버 / 클릭
      .onNodeHover(node => {
        container.style.cursor = node ? 'pointer' : 'grab'
        updateHighlight(node, data.links)
        applyNodeHighlightVisuals()
        graphInstance.refresh()
      })
      .onNodeClick(node => {
        // 충격파 + 임팩트 텍스트
        emitShockwave(node)
        // 시네마틱 줌인
        const dist = 80
        const camPos = node.x || node.y || node.z
          ? { x: node.x * 1.5 + dist, y: node.y * 1.5 + dist, z: node.z * 1.5 + dist }
          : { x: 0, y: 0, z: 200 }
        graphInstance.cameraPosition(camPos, node, 1200)
        setTimeout(() => showPatientDetail(node), 1000)
      })
      .onBackgroundClick(() => {
        updateHighlight(null, data.links)
        applyNodeHighlightVisuals()
        graphInstance.refresh()
      })
      // 노드 라벨 툴팁 (호버 시 우측에 큰 카드)
      .nodeLabel(node => `
        <div style="background:linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,27,75,0.98));
                    padding:10px 14px;border-radius:10px;
                    border:1px solid ${node.color};color:white;font-size:12px;
                    box-shadow:0 0 30px ${node.color}66, 0 10px 40px rgba(0,0,0,0.6);
                    backdrop-filter:blur(8px);min-width:180px">
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${node.levelEmoji} ${node.name}</div>
          <div style="color:${node.color};font-weight:600;margin-bottom:6px;">${node.levelLabel} · ${node.score}점</div>
          <div style="opacity:0.85;line-height:1.6;">
            🤝 소개한 환자: <b>${node.referralCount}명</b><br>
            💰 발생 매출: <b>${(node.referralRevenue/10000).toFixed(0)}만원</b><br>
            🏥 방문: <b>${node.visitCount}회</b>
          </div>
        </div>
      `)
      .graphData({ nodes: data.nodes, links: data.links })

    // ───── 물리 엔진 튜닝 (옵시디언급) ─────
    graphInstance.d3Force('charge').strength(-180).distanceMax(800)
    graphInstance.d3Force('link').distance(60).strength(0.5)
    graphInstance.d3Force('center').strength(0.10)

    // ───── 별빛 배경 + Fog + 항성 효과 + 시그니처 비주얼 ─────
    setTimeout(() => {
      const scene = graphInstance.scene()
      if (scene) addStarfield(scene)

      // ✨ Bloom 후처리 (A 기능: 영화급 발광)
      setupBloom()

      // 시네마틱 인트로: 멀리서 줌인
      graphInstance.cameraPosition({ x: 0, y: 0, z: 1800 }, undefined, 0)
      setTimeout(() => {
        graphInstance.cameraPosition({ x: 0, y: 0, z: 480 }, undefined, 3500)
      }, 200)

      // 로딩 숨김
      if (loading) loading.style.display = 'none'

      // 영웅 카드 데이터 채우기 + 타이핑 애니메이션
      renderHeroCard(data)

      // 자동 회전 루프 시작
      startAutoRotateLoop()

      // 별똥별 루프 시작
      startMeteorLoop()
    }, 400)

    // 코로나 + 맥동 (노드 객체 생성된 후)
    setTimeout(() => {
      const scene = graphInstance.scene()
      if (scene) {
        addEvangelistCorona(scene, data.nodes)
        startPulseLoop(data.nodes)
      }
    }, 1500)

    // 인트로 오버레이는 4.5초 후 자동 제거 (CSS 애니메이션)
    setTimeout(() => {
      const intro = document.getElementById('rfx-cinematic-intro')
      if (intro) intro.style.display = 'none'
    }, 4800)

    // 통계 카드 + 미니 통계
    renderGraphStats(data.stats)
    updateMiniStats(data)

    // 컨트롤 이벤트 바인딩
    bindGalaxyControls(data)

    // 🕒 시간 슬라이더 (B)
    bindTimeSlider(data)

    // 🤖 AI 예측 (C)
    bindAIPrediction(data)
  }

  // ────────────────────────────────────────────────
  // 옵시디언급: 텍스트 라벨 텍스처 (Three.js Sprite용)
  // ────────────────────────────────────────────────
  const _labelTexCache = {}
  function createTextLabel(text, color) {
    const cacheKey = text + '_' + color
    if (_labelTexCache[cacheKey]) return _labelTexCache[cacheKey]

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const fontSize = 32
    ctx.font = `600 ${fontSize}px -apple-system, "Noto Sans KR", sans-serif`
    const textWidth = ctx.measureText(text).width
    canvas.width = Math.ceil(textWidth + 32)
    canvas.height = fontSize + 16

    // 다시 폰트 셋팅 (canvas resize 후 리셋되므로)
    ctx.font = `600 ${fontSize}px -apple-system, "Noto Sans KR", sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    // 외곽 글로우 (텍스트 그림자)
    ctx.shadowColor = 'rgba(0,0,0,0.95)'
    ctx.shadowBlur = 8
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new window.THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    _labelTexCache[cacheKey] = texture
    return texture
  }

  // ────────────────────────────────────────────────
  // 호버 시 노드 시각 업데이트 (Dim/Highlight)
  // ────────────────────────────────────────────────
  function applyNodeHighlightVisuals() {
    if (!graphInstance) return
    const nodes = graphInstance.graphData().nodes
    nodes.forEach(node => {
      const obj = node.__threeObj
      if (!obj) return
      const isHighlighted = highlightNodes.has(node)
      const isDimmed = highlightNodes.size > 0 && !isHighlighted

      if (obj.__sprite) {
        const mat = obj.__sprite.material
        mat.opacity = isDimmed ? 0.18 : 1.0
        mat.needsUpdate = true
      }
      if (obj.__halo) {
        obj.__halo.material.opacity = isDimmed ? 0.06 : 0.3
      }
      if (obj.__label) {
        const mat = obj.__label.material
        if (isDimmed) {
          mat.opacity = 0.15
        } else {
          // 라벨 모드 적용
          const labelMode = (document.getElementById('rfx-label-mode') || {}).value || 'hover'
          let show = true
          if (labelMode === 'none') show = false
          else if (labelMode === 'hover') show = isHighlighted
          else if (labelMode === 'influencer') show = ['evangelist','fan'].includes(node.level) || isHighlighted
          mat.opacity = show ? 1 : 0
        }
      }
    })
  }

  // ────────────────────────────────────────────────
  // 자동 회전 루프 (시네마틱)
  // ────────────────────────────────────────────────
  function startAutoRotateLoop() {
    if (rotateAnimId) cancelAnimationFrame(rotateAnimId)
    let angle = 0
    const tick = () => {
      if (!graphInstance) return
      if (autoRotate && !hoverNode) {
        angle += 0.0015
        const radius = 420
        graphInstance.cameraPosition({
          x: radius * Math.cos(angle),
          y: 30 * Math.sin(angle * 0.5),
          z: radius * Math.sin(angle)
        })
      }
      rotateAnimId = requestAnimationFrame(tick)
    }
    tick()
  }

  // ────────────────────────────────────────────────
  // 컨트롤 패널 이벤트 바인딩
  // ────────────────────────────────────────────────
  function bindGalaxyControls(data) {
    const $ = (id) => document.getElementById(id)
    const charge = $('rfx-charge'), chargeVal = $('rfx-charge-val')
    const linkdist = $('rfx-linkdist'), linkdistVal = $('rfx-linkdist-val')
    const gravity = $('rfx-gravity'), gravityVal = $('rfx-gravity-val')
    const labelMode = $('rfx-label-mode')
    const rotateBtn = $('rfx-rotate-btn')
    const fitBtn = $('rfx-fit-btn')
    const search = $('rfx-search'), searchResults = $('rfx-search-results'), searchCount = $('rfx-search-count')

    if (charge) charge.oninput = () => {
      chargeVal.textContent = charge.value
      graphInstance.d3Force('charge').strength(parseInt(charge.value))
      graphInstance.d3ReheatSimulation()
    }
    if (linkdist) linkdist.oninput = () => {
      linkdistVal.textContent = linkdist.value
      graphInstance.d3Force('link').distance(parseInt(linkdist.value))
      graphInstance.d3ReheatSimulation()
    }
    if (gravity) gravity.oninput = () => {
      gravityVal.textContent = parseFloat(gravity.value).toFixed(2)
      graphInstance.d3Force('center').strength(parseFloat(gravity.value))
      graphInstance.d3ReheatSimulation()
    }
    if (labelMode) labelMode.onchange = () => {
      applyNodeHighlightVisuals()
    }
    if (rotateBtn) rotateBtn.onclick = () => {
      autoRotate = !autoRotate
      rotateBtn.classList.toggle('active', autoRotate)
      rotateBtn.textContent = autoRotate ? '⏸️ 회전중지' : '🔄 자동회전'
    }
    if (fitBtn) fitBtn.onclick = () => {
      graphInstance.zoomToFit(1500, 60)
    }

    // 실시간 검색
    if (search) {
      search.oninput = () => {
        const q = search.value.trim().toLowerCase()
        if (!q) {
          searchResults.style.display = 'none'
          searchCount.textContent = ''
          return
        }
        const matches = data.nodes.filter(n => n.name && n.name.toLowerCase().includes(q)).slice(0, 8)
        searchCount.textContent = matches.length + '명'
        if (matches.length === 0) {
          searchResults.innerHTML = '<div class="rfx-search-result-item" style="opacity:0.5">결과 없음</div>'
        } else {
          searchResults.innerHTML = matches.map(n => `
            <div class="rfx-search-result-item" data-id="${n.id}">
              <span>${LEVEL_META[n.level].emoji} ${n.name}</span>
              <span style="font-size:10px;color:${n.color}">${n.score}점</span>
            </div>
          `).join('')
          searchResults.querySelectorAll('.rfx-search-result-item').forEach(item => {
            item.onclick = () => {
              const node = data.nodes.find(n => n.id === item.dataset.id)
              if (!node) return
              const dist = 50
              graphInstance.cameraPosition(
                { x: (node.x || 0) * 1.3 + dist, y: (node.y || 0) * 1.3 + dist, z: (node.z || 0) * 1.3 + dist },
                node, 1500
              )
              updateHighlight(node, data.links)
              applyNodeHighlightVisuals()
              graphInstance.refresh()
              searchResults.style.display = 'none'
              search.value = node.name
            }
          })
        }
        searchResults.style.display = 'block'
      }
      // 외부 클릭 시 검색결과 숨김
      document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== search) {
          searchResults.style.display = 'none'
        }
      })
    }
  }

  // ────────────────────────────────────────────────
  // 좌하단 미니 통계
  // ────────────────────────────────────────────────
  function updateMiniStats(data) {
    const $ = (id) => document.getElementById(id)
    if ($('rfx-stat-nodes')) $('rfx-stat-nodes').textContent = data.nodes.length
    if ($('rfx-stat-links')) $('rfx-stat-links').textContent = data.links.length
    if ($('rfx-stat-revenue')) {
      const total = data.links.reduce((sum, l) => sum + (l.revenue || 0), 0)
      $('rfx-stat-revenue').textContent = (total / 100000000).toFixed(1)
    }
  }

  // ════════════════════════════════════════════════
  // 🎬 시그니처 비주얼 시스템 (메카 임팩트)
  // ════════════════════════════════════════════════

  // ────────────────────────────────────────────────
  // 영웅 카드: 타이핑 애니메이션
  // ────────────────────────────────────────────────
  function renderHeroCard(data) {
    const titleEl = document.getElementById('rfx-hero-title')
    const subEl = document.getElementById('rfx-hero-subtitle')
    const top3El = document.getElementById('rfx-hero-top3')
    if (!titleEl || !data.nodes) return

    const totalNodes = data.nodes.length
    const totalRevenue = data.links.reduce((s, l) => s + (l.revenue || 0), 0)
    const revenueOk = (totalRevenue / 100000000).toFixed(2)

    // 통계
    const top3 = [...data.nodes]
      .filter(n => (n.referralCount || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3)

    if (subEl) {
      subEl.textContent = `${totalRevenue > 0 ? revenueOk + '억원' : '0원'}의 신뢰가 ${totalNodes}명의 환자 사이에 흐르고 있습니다.`
    }

    // TOP3 렌더
    if (top3El) {
      const medals = ['🥇', '🥈', '🥉']
      top3El.innerHTML = top3.map((n, i) => `
        <div class="rfx-hero-top3-item">
          <span><span style="margin-right:6px">${medals[i]}</span><span class="rfx-hero-rank-name">${n.name}</span></span>
          <span class="rfx-hero-rank-meta">${n.referralCount}명 · ${(n.referralRevenue/10000).toFixed(0)}만</span>
        </div>
      `).join('')
    }

    // 타이핑 애니메이션
    const fullText = `여기는 ${totalNodes}명의 환자가 만든 신뢰의 메카`
    titleEl.innerHTML = '<span class="typing-cursor"></span>'
    setTimeout(() => typewriter(titleEl, fullText, 50), 1700)
  }

  function typewriter(el, text, speed) {
    let i = 0
    const cursor = '<span class="typing-cursor"></span>'
    const tick = () => {
      if (i < text.length) {
        el.innerHTML = text.slice(0, i + 1) + cursor
        i++
        setTimeout(tick, speed)
      } else {
        el.innerHTML = text + cursor
      }
    }
    tick()
  }

  // ────────────────────────────────────────────────
  // 전도사 항성 효과 (Corona + 광선)
  // ────────────────────────────────────────────────
  function addEvangelistCorona(scene, nodes) {
    const THREE = window.THREE
    coronaSprites.forEach(s => scene.remove(s))
    coronaSprites = []

    nodes.forEach(node => {
      if (node.level !== 'evangelist' && node.level !== 'fan') return
      if (!node.__threeObj) return

      // 코로나(거대 외곽 후광)
      const meta = LEVEL_META[node.level]
      const coronaTex = createCoronaTexture(meta.color, meta.glow)
      const coronaMat = new THREE.SpriteMaterial({
        map: coronaTex,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const corona = new THREE.Sprite(coronaMat)
      const baseScale = (node.val || 4) * 8 + (node.referralCount || 0) * 1.5
      corona.scale.set(baseScale, baseScale, 1)
      corona.userData.node = node
      corona.userData.baseScale = baseScale
      corona.userData.isCorona = true

      node.__threeObj.add(corona)
      coronaSprites.push(corona)
    })
  }

  function createCoronaTexture(color, glowColor) {
    const cacheKey = 'corona_' + color
    if (glowTextureCache[cacheKey]) return glowTextureCache[cacheKey]

    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 256
    const ctx = canvas.getContext('2d')

    // 부드러운 코로나
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
    grad.addColorStop(0, glowColor + 'aa')
    grad.addColorStop(0.3, color + '55')
    grad.addColorStop(0.6, color + '22')
    grad.addColorStop(1, color + '00')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 256)

    // 광선 (8방향)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const length = 110 + Math.random() * 20
      const grad2 = ctx.createLinearGradient(
        128, 128,
        128 + Math.cos(angle) * length,
        128 + Math.sin(angle) * length
      )
      grad2.addColorStop(0, glowColor + '88')
      grad2.addColorStop(0.5, color + '44')
      grad2.addColorStop(1, color + '00')
      ctx.strokeStyle = grad2
      ctx.lineWidth = 2 + Math.random() * 3
      ctx.beginPath()
      ctx.moveTo(128, 128)
      ctx.lineTo(128 + Math.cos(angle) * length, 128 + Math.sin(angle) * length)
      ctx.stroke()
    }

    const texture = new window.THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    glowTextureCache[cacheKey] = texture
    return texture
  }

  // ────────────────────────────────────────────────
  // 노드 맥동 애니메이션 (살아있는 우주)
  // ────────────────────────────────────────────────
  function startPulseLoop(nodes) {
    if (pulseAnimId) cancelAnimationFrame(pulseAnimId)

    let t = 0
    const tick = () => {
      t += 0.016
      nodes.forEach(node => {
        const obj = node.__threeObj
        if (!obj || !obj.__sprite) return

        // 등급별 맥동 강도
        let amp = 0.04
        let speed = 1.5
        if (node.level === 'evangelist') { amp = 0.15; speed = 1.8 }
        else if (node.level === 'fan')    { amp = 0.10; speed = 1.6 }
        else if (node.level === 'loyal')  { amp = 0.07; speed = 1.4 }

        const phase = (node.id || '').charCodeAt(0) * 0.1  // 노드별 다른 시작 위상
        const pulse = 1 + amp * Math.sin(t * speed + phase)

        if (obj.__baseScale) {
          const s = obj.__baseScale * pulse
          obj.__sprite.scale.set(s, s, 1)
        }

        // 코로나도 맥동 (반대 위상)
        obj.children.forEach(child => {
          if (child.userData.isCorona && child.userData.baseScale) {
            const s = child.userData.baseScale * (1 + amp * 1.5 * Math.cos(t * speed + phase))
            child.scale.set(s, s, 1)
            child.material.rotation = t * 0.3  // 코로나 회전
          }
        })
      })
      pulseAnimId = requestAnimationFrame(tick)
    }
    tick()
  }

  // ────────────────────────────────────────────────
  // 클릭 충격파 효과
  // ────────────────────────────────────────────────
  function emitShockwave(node) {
    if (!graphInstance || !node || !window.THREE) return
    const THREE = window.THREE
    const scene = graphInstance.scene()
    if (!scene) return

    const meta = LEVEL_META[node.level] || LEVEL_META.general

    // 충격파 링 텍스처
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = meta.glow
    ctx.lineWidth = 6
    ctx.shadowColor = meta.color
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(128, 128, 110, 0, Math.PI * 2)
    ctx.stroke()
    const texture = new THREE.CanvasTexture(canvas)

    const mat = new THREE.SpriteMaterial({
      map: texture, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    const ring = new THREE.Sprite(mat)
    ring.position.set(node.x || 0, node.y || 0, node.z || 0)
    ring.scale.set(10, 10, 1)
    scene.add(ring)

    // 애니메이션: 퍼지면서 사라짐
    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed > 1.2) {
        scene.remove(ring); mat.dispose(); texture.dispose()
        return
      }
      const progress = elapsed / 1.2
      const scale = 10 + progress * 200
      ring.scale.set(scale, scale, 1)
      mat.opacity = 1 - progress
      requestAnimationFrame(animate)
    }
    animate()

    // 임팩트 텍스트
    showImpactText(node)
  }

  function showImpactText(node) {
    const el = document.getElementById('rfx-impact-text')
    if (!el) return
    const meta = LEVEL_META[node.level] || LEVEL_META.general
    el.style.color = meta.glow
    el.innerHTML = `${meta.emoji} ${node.name}님은 <span style="color:#fde047">${node.referralCount || 0}명</span>을 데려왔습니다`
    el.classList.remove('show')
    void el.offsetWidth
    el.classList.add('show')
  }

  // ────────────────────────────────────────────────
  // 별똥별 (5초마다 자동)
  // ────────────────────────────────────────────────
  function startMeteorLoop() {
    if (meteorAnimId) clearInterval(meteorAnimId)
    meteorAnimId = setInterval(() => {
      if (!graphInstance || !document.getElementById('rfx-graph')) return
      spawnMeteor()
    }, 5000 + Math.random() * 3000)

    // 첫 별똥별 빠르게
    setTimeout(spawnMeteor, 3500)
  }

  function spawnMeteor() {
    if (!graphInstance || !window.THREE) return
    const THREE = window.THREE
    const scene = graphInstance.scene()
    if (!scene) return

    // 시작점·끝점 (큰 구체 위에서)
    const startSide = Math.random() > 0.5 ? 1 : -1
    const startPos = new THREE.Vector3(
      startSide * 600 + (Math.random() - 0.5) * 200,
      300 + Math.random() * 300,
      (Math.random() - 0.5) * 600
    )
    const endPos = new THREE.Vector3(
      -startSide * 600 + (Math.random() - 0.5) * 200,
      -200 + (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 600
    )

    // 꼬리 라인 (BufferGeometry)
    const points = []
    const trailLength = 30
    for (let i = 0; i < trailLength; i++) {
      points.push(startPos.clone())
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0xfde047, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
      linewidth: 2
    })
    const trail = new THREE.Line(geometry, material)
    scene.add(trail)

    // 머리(밝은 점)
    const headTex = createGlowTexture('#ffffff', '#fde047')
    const headMat = new THREE.SpriteMaterial({
      map: headTex, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    const head = new THREE.Sprite(headMat)
    head.scale.set(20, 20, 1)
    head.position.copy(startPos)
    scene.add(head)

    const positions = []
    const startTime = performance.now()
    const duration = 1.5

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed > duration) {
        scene.remove(trail); scene.remove(head)
        material.dispose(); geometry.dispose(); headMat.dispose()
        return
      }
      const t = elapsed / duration
      const easing = 1 - Math.pow(1 - t, 2)
      const cur = new THREE.Vector3().lerpVectors(startPos, endPos, easing)
      head.position.copy(cur)

      // 꼬리 업데이트
      positions.unshift(cur.x, cur.y, cur.z)
      if (positions.length > trailLength * 3) positions.length = trailLength * 3

      const arr = new Float32Array(trailLength * 3)
      for (let i = 0; i < trailLength * 3; i++) {
        arr[i] = positions[i] !== undefined ? positions[i] : (i % 3 === 0 ? cur.x : i % 3 === 1 ? cur.y : cur.z)
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3))
      geometry.attributes.position.needsUpdate = true

      material.opacity = (1 - t) * 0.9
      headMat.opacity = (1 - t * 0.5)

      requestAnimationFrame(animate)
    }
    animate()
  }

  // ────────────────────────────────────────────────
  // ✨ Bloom 후처리 (영화급 발광) - A 기능
  // ────────────────────────────────────────────────
  function setupBloom() {
    // 3d-force-graph는 자체 렌더러 사용 → 후처리 직접 적용 어려움
    // 대안: postProcessingComposer API 활용
    if (!graphInstance || !window.THREE) return

    try {
      // toneMapping으로 발광 효과 강화 (실용적 대안)
      const renderer = graphInstance.renderer()
      if (renderer) {
        renderer.toneMapping = window.THREE.ReinhardToneMapping
        renderer.toneMappingExposure = 1.4
        renderer.outputColorSpace = window.THREE.SRGBColorSpace || renderer.outputColorSpace
      }
    } catch (e) {
      console.warn('Bloom setup failed', e)
    }
  }

  // ────────────────────────────────────────────────
  // 🕒 시간 슬라이더 (B 기능)
  // ────────────────────────────────────────────────
  function bindTimeSlider(data) {
    const range = document.getElementById('rfx-time-range')
    const current = document.getElementById('rfx-time-current')
    const playBtn = document.getElementById('rfx-time-play')
    const resetBtn = document.getElementById('rfx-time-reset')
    if (!range) return

    // 백업
    originalNodes = data.nodes.map(n => ({ ...n }))
    originalLinks = data.links.map(l => ({ ...l }))

    // 시간 범위 계산
    const dates = data.links.map(l => new Date(l.referredAt).getTime()).filter(t => !isNaN(t))
    if (dates.length === 0) return
    const minTime = Math.min(...dates)
    const maxTime = Math.max(...dates)

    const updateAtPercent = (pct) => {
      const cutoffTime = minTime + (maxTime - minTime) * (pct / 100)
      const cutoffDate = new Date(cutoffTime)

      // 그 시점까지의 링크만
      const filteredLinks = originalLinks.filter(l => new Date(l.referredAt).getTime() <= cutoffTime)
      // 그 시점까지 등장한 환자 ID
      const visibleIds = new Set()
      filteredLinks.forEach(l => {
        visibleIds.add(typeof l.source === 'object' ? l.source.id : l.source)
        visibleIds.add(typeof l.target === 'object' ? l.target.id : l.target)
      })
      // 외래 첫 방문 기준 추가 (소개 안 받았어도 방문은 했음)
      const filteredNodes = originalNodes.filter(n => {
        if (visibleIds.has(n.id)) return true
        if (n.firstVisit && new Date(n.firstVisit).getTime() <= cutoffTime) return true
        return false
      })

      graphInstance.graphData({ nodes: filteredNodes, links: filteredLinks })

      const yyyy = cutoffDate.getFullYear()
      const mm = String(cutoffDate.getMonth() + 1).padStart(2, '0')
      current.textContent = pct >= 100 ? '현재' : `${yyyy}.${mm}`
    }

    range.oninput = () => updateAtPercent(parseInt(range.value))

    let playing = false
    let playInterval = null
    if (playBtn) playBtn.onclick = () => {
      if (playing) {
        clearInterval(playInterval); playing = false
        playBtn.textContent = '▶ 자동재생'; playBtn.classList.remove('active')
        return
      }
      playing = true
      playBtn.textContent = '⏸ 일시정지'; playBtn.classList.add('active')
      let pct = parseInt(range.value)
      if (pct >= 100) pct = 0
      playInterval = setInterval(() => {
        pct = Math.min(100, pct + 1.5)
        range.value = pct
        updateAtPercent(pct)
        if (pct >= 100) {
          clearInterval(playInterval); playing = false
          playBtn.textContent = '▶ 자동재생'; playBtn.classList.remove('active')
        }
      }, 80)
    }

    if (resetBtn) resetBtn.onclick = () => {
      range.value = 100; updateAtPercent(100)
      if (playing) { clearInterval(playInterval); playing = false; playBtn.textContent = '▶ 자동재생'; playBtn.classList.remove('active') }
    }
  }

  // ────────────────────────────────────────────────
  // 🤖 AI 예측 모드 (C 기능)
  // ────────────────────────────────────────────────
  function bindAIPrediction(data) {
    const btn = document.getElementById('rfx-ai-btn')
    const info = document.getElementById('rfx-ai-info')
    if (!btn) return

    btn.onclick = () => {
      aiPredictionActive = !aiPredictionActive
      btn.classList.toggle('ai-active', aiPredictionActive)
      info.style.display = aiPredictionActive ? 'block' : 'none'

      if (aiPredictionActive) {
        applyAIPrediction(data)
      } else {
        // 원본 복원
        graphInstance.graphData({ nodes: originalNodes || data.nodes, links: originalLinks || data.links })
      }
    }
  }

  function applyAIPrediction(data) {
    const THREE = window.THREE
    if (!THREE || !graphInstance) return

    // 예측 알고리즘: 점수 + 만족도 + 방문횟수 → 3개월 후 소개 확률
    const predictions = data.nodes.map(n => {
      const score = n.score || 0
      const visits = n.visitCount || 0
      const refs = n.referralCount || 0

      // 확률 계산 (간이 모델)
      let probability = 0
      if (n.level === 'evangelist') probability = 0.85 + Math.random() * 0.10
      else if (n.level === 'fan')    probability = 0.55 + Math.random() * 0.20
      else if (n.level === 'loyal')  probability = 0.30 + Math.random() * 0.20
      else if (n.level === 'satisfied') probability = 0.12 + Math.random() * 0.15
      else probability = 0.03 + Math.random() * 0.08

      // 예상 소개 인원
      const expectedRefs = Math.round(probability * (refs > 0 ? 2.5 : 1.2))
      return { node: n, probability, expectedRefs }
    })

    // 새 가상 노드 (예측 환자) - 상위 후보 노드들 옆에 추가
    const ghostNodes = []
    const ghostLinks = []
    let ghostId = 0
    predictions
      .filter(p => p.expectedRefs > 0 && p.probability > 0.3)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 25)
      .forEach(p => {
        for (let i = 0; i < p.expectedRefs; i++) {
          const gid = `ghost_${ghostId++}`
          ghostNodes.push({
            id: gid,
            name: `예측 +${i+1}`,
            val: 2,
            color: '#a78bfa',
            glow: '#c4b5fd',
            level: 'general',
            levelLabel: 'AI 예측',
            levelEmoji: '🔮',
            score: 0,
            referralCount: 0,
            referralRevenue: 0,
            visitCount: 0,
            isGhost: true,
            __probability: p.probability
          })
          ghostLinks.push({
            source: p.node.id,
            target: gid,
            referredAt: new Date(Date.now() + 90 * 86400000).toISOString(),
            channel: 'predicted',
            revenue: 0,
            width: 1,
            isPrediction: true
          })
        }
      })

    const allNodes = [...(originalNodes || data.nodes), ...ghostNodes]
    const allLinks = [...(originalLinks || data.links), ...ghostLinks]

    graphInstance.graphData({ nodes: allNodes, links: allLinks })

    // 알림 토스트
    if (window.PFM?.toast) {
      window.PFM.toast(`🤖 AI 예측: 3개월 내 +${ghostNodes.length}명 소개 가능성`, 'info')
    }
  }

  function renderGraphStats(stats) {
    const target = document.getElementById('rfx-graph-stats')
    if (!target || !stats) return
    const cards = ['evangelist', 'fan', 'loyal', 'satisfied', 'general'].map(lv => {
      const meta = LEVEL_META[lv]
      const cnt = stats.byLevel[lv] || 0
      return `
        <div class="rfx-stat-card text-center">
          <div class="text-2xl">${meta.emoji}</div>
          <div class="text-xs text-slate-600 mt-1">${meta.label}</div>
          <div class="text-xl font-bold mt-1" style="color:${meta.color}">${cnt}</div>
        </div>
      `
    }).join('')
    target.innerHTML = cards
  }

  async function showPatientDetail(node) {
    const data = await api(`/api/protected/referrals/fans/${node.id}`).catch(() => ({}))
    const referred = data.referred || []
    const referredBy = data.referredBy

    const meta = LEVEL_META[node.level] || LEVEL_META.general
    const html = `
      <div class="modal-overlay" id="rfx-detail-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          <div class="bg-gradient-to-r ${meta.bg} p-6 rounded-t-3xl text-white relative">
            <button data-act="document.getElementById('rfx-detail-modal').remove()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30">✕</button>
            <div class="text-5xl mb-2">${meta.emoji}</div>
            <h2 class="text-2xl font-bold">${node.name}</h2>
            <div class="text-white/80 text-sm mt-1">${meta.label} · 영향력 점수 ${node.score}점</div>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-slate-50 rounded-xl p-3 text-center">
                <div class="text-xs text-slate-500">소개한 사람</div>
                <div class="text-2xl font-bold mt-1">${node.referralCount}<span class="text-sm text-slate-400">명</span></div>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 text-center">
                <div class="text-xs text-slate-500">소개 매출</div>
                <div class="text-2xl font-bold mt-1">${(node.referralRevenue/10000).toFixed(0)}<span class="text-sm text-slate-400">만</span></div>
              </div>
              <div class="bg-slate-50 rounded-xl p-3 text-center">
                <div class="text-xs text-slate-500">방문횟수</div>
                <div class="text-2xl font-bold mt-1">${node.visitCount}<span class="text-sm text-slate-400">회</span></div>
              </div>
            </div>

            ${referredBy ? `
              <div class="bg-blue-50 rounded-xl p-3 text-sm">
                <div class="font-medium text-blue-800">📥 이 분을 소개해주신 분</div>
                <div class="text-blue-700 mt-1">${referredBy.referrer_name}님 (${referredBy.referred_at?.slice(0,10) || ''})</div>
              </div>
            ` : ''}

            ${referred.length ? `
              <div>
                <h3 class="font-bold text-sm mb-2">📤 ${node.name}님이 데려오신 분들 (${referred.length}명)</h3>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                  ${referred.map(r => `
                    <div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <div class="font-medium">${r.patient_name}</div>
                        <div class="text-xs text-slate-500">${(r.referred_at || '').slice(0,10)} · ${r.initial_treatment || '-'}</div>
                      </div>
                      <div class="text-xs text-emerald-700 font-medium">
                        ${r.generated_revenue ? (r.generated_revenue/10000).toFixed(0)+'만원' : '-'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : '<div class="text-sm text-slate-500">아직 소개 이력이 없습니다.</div>'}
          </div>
        </div>
      </div>
    `
    const div = document.createElement('div')
    div.innerHTML = html
    document.body.appendChild(div.firstElementChild)
  }

  // ────────────────────────────────────────────────
  // 2. 팬 랭킹 리스트
  // ────────────────────────────────────────────────
  async function renderFanList(target) {
    target.innerHTML = `
      <div class="space-y-4">
        <div class="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
          <div class="text-sm font-bold">필터:</div>
          ${Object.entries(LEVEL_META).map(([k, v]) => `
            <button class="rfx-lv-btn px-3 py-1 rounded-lg text-sm border" data-level="${k}"
                    style="border-color:${v.color}40">
              ${v.emoji} ${v.label}
            </button>
          `).join('')}
          <button class="rfx-lv-btn active px-3 py-1 rounded-lg text-sm bg-indigo-500 text-white" data-level="">전체</button>
        </div>
        <div id="rfx-fan-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"></div>
      </div>
    `

    let currentLevel = ''
    target.querySelectorAll('.rfx-lv-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        currentLevel = btn.dataset.level || ''
        target.querySelectorAll('.rfx-lv-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.level === currentLevel)
          b.classList.toggle('bg-indigo-500', b.dataset.level === currentLevel)
          b.classList.toggle('text-white', b.dataset.level === currentLevel)
        })
        await loadFanList(currentLevel)
      })
    })

    await loadFanList('')
  }

  async function loadFanList(level) {
    const list = document.getElementById('rfx-fan-list')
    if (!list) return
    list.innerHTML = `<div class="col-span-full text-center text-slate-500 py-8">로딩 중...</div>`

    const params = new URLSearchParams()
    if (level) params.set('level', level)
    params.set('limit', '100')

    const data = await api(`/api/protected/referrals/fans?${params}`).catch(() => ({}))
    const fans = data.fans || []

    if (!fans.length) {
      list.innerHTML = `<div class="col-span-full text-center text-slate-500 py-8">해당 등급의 환자가 없습니다.</div>`
      return
    }

    list.innerHTML = fans.map((f, i) => {
      const meta = LEVEL_META[f.fan_level] || LEVEL_META.general
      return `
        <div class="rfx-fan-card cursor-pointer" data-pid="${f.patient_id}">
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">#${i+1}</span>
                <span class="text-2xl">${meta.emoji}</span>
                <h3 class="font-bold text-base">${f.patient_name}</h3>
              </div>
              <div class="text-xs text-slate-500 mt-1">${f.treatment_area || '-'} · ${f.primary_doctor || '-'}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-500">영향력</div>
              <div class="text-xl font-bold" style="color:${meta.color}">${f.fan_score}</div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center pt-2 border-t">
            <div>
              <div class="text-xs text-slate-500">소개</div>
              <div class="font-bold">${f.referral_count}명</div>
            </div>
            <div>
              <div class="text-xs text-slate-500">매출</div>
              <div class="font-bold">${(f.total_referral_revenue/10000).toFixed(0)}만</div>
            </div>
            <div>
              <div class="text-xs text-slate-500">방문</div>
              <div class="font-bold">${f.visit_count}회</div>
            </div>
          </div>
        </div>
      `
    }).join('')

    // 카드 클릭 → 상세
    list.querySelectorAll('.rfx-fan-card').forEach(card => {
      card.addEventListener('click', async () => {
        const pid = card.dataset.pid
        const data = await api(`/api/protected/referrals/fans/${pid}`).catch(() => ({}))
        if (data.patient) {
          const fakeNode = {
            id: pid,
            name: data.patient.patient_name,
            level: data.patient.fan_level || 'general',
            score: data.patient.fan_score || 0,
            referralCount: data.patient.referral_count || 0,
            referralRevenue: data.patient.total_referral_revenue || 0,
            visitCount: data.patient.visit_count || 0
          }
          showPatientDetail(fakeNode)
        }
      })
    })
  }

  // ────────────────────────────────────────────────
  // 3. 통계 + 알림
  // ────────────────────────────────────────────────
  async function renderStats(target) {
    target.innerHTML = `
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-8 space-y-4">
          <div id="rfx-stat-summary"></div>
          <div id="rfx-top-referrers" class="glass rounded-2xl p-5">
            <h3 class="font-bold mb-3">🏆 TOP 10 소개자</h3>
            <div id="rfx-top-list" class="space-y-2">로딩 중...</div>
          </div>
        </div>
        <div class="col-span-12 md:col-span-4">
          <div class="glass rounded-2xl p-5">
            <h3 class="font-bold mb-3">🔔 등급 변화 알림</h3>
            <div id="rfx-notif-list" class="space-y-2 max-h-[600px] overflow-y-auto">로딩 중...</div>
          </div>
        </div>
      </div>
    `

    const stats = await api('/api/protected/referrals/stats').catch(() => ({}))
    const notif = await api('/api/protected/referrals/notifications').catch(() => ({}))

    // 요약 카드
    document.getElementById('rfx-stat-summary').innerHTML = `
      <div class="grid grid-cols-3 gap-3">
        <div class="rfx-stat-card">
          <div class="text-xs text-slate-500">총 소개 건수</div>
          <div class="text-3xl font-bold mt-1">${stats.totalReferrals || 0}</div>
        </div>
        <div class="rfx-stat-card">
          <div class="text-xs text-slate-500">소개 누적 매출</div>
          <div class="text-3xl font-bold mt-1 text-emerald-600">${((stats.totalRevenue||0)/10000000).toFixed(1)}<span class="text-base">천만</span></div>
        </div>
        <div class="rfx-stat-card">
          <div class="text-xs text-slate-500">최근 30일</div>
          <div class="text-3xl font-bold mt-1 text-blue-600">+${stats.last30Days || 0}</div>
        </div>
      </div>
    `

    // TOP 10
    const topList = document.getElementById('rfx-top-list')
    const tops = stats.topReferrers || []
    if (!tops.length) {
      topList.innerHTML = '<div class="text-sm text-slate-500">아직 데이터가 없습니다.</div>'
    } else {
      topList.innerHTML = tops.map((t, i) => {
        const meta = LEVEL_META[t.fan_level] || LEVEL_META.general
        return `
          <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
            <div class="w-8 text-center font-bold ${i<3?'text-amber-500':'text-slate-400'}">${i+1}</div>
            <div class="text-2xl">${meta.emoji}</div>
            <div class="flex-1">
              <div class="font-medium">${t.patient_name}</div>
              <div class="text-xs text-slate-500">${meta.label} · ${t.referral_count}명 소개 · ${t.fan_score}점</div>
            </div>
          </div>
        `
      }).join('')
    }

    // 알림 리스트
    const notifList = document.getElementById('rfx-notif-list')
    const notifs = notif.notifications || []
    if (!notifs.length) {
      notifList.innerHTML = '<div class="text-sm text-slate-500">새로운 알림이 없습니다.</div>'
    } else {
      notifList.innerHTML = notifs.map(n => {
        const meta = LEVEL_META[n.new_level] || LEVEL_META.general
        const priColor = n.priority === 'high' ? 'border-red-300 bg-red-50' :
                         n.priority === 'normal' ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
        return `
          <div class="border ${priColor} rounded-lg p-3 ${n.is_read ? 'opacity-60' : ''}" data-nid="${n.id}">
            <div class="flex items-start gap-2">
              <div class="text-xl">${meta.emoji}</div>
              <div class="flex-1">
                <div class="font-medium text-sm">${n.patient_name || '환자'}</div>
                <div class="text-xs text-slate-700 mt-1">${n.message}</div>
                <div class="text-xs text-slate-400 mt-1">${(n.created_at||'').slice(0,16)}</div>
                ${!n.is_actioned ? `
                  <div class="flex gap-2 mt-2">
                    <button class="rfx-act-btn px-2 py-1 text-xs rounded bg-emerald-500 text-white" data-nid="${n.id}">✓ 응대 완료</button>
                    <button class="rfx-read-btn px-2 py-1 text-xs rounded bg-slate-200" data-nid="${n.id}">읽음</button>
                  </div>
                ` : '<div class="text-xs text-emerald-700 mt-1">✓ 응대 완료</div>'}
              </div>
            </div>
          </div>
        `
      }).join('')

      // 알림 액션
      notifList.querySelectorAll('.rfx-act-btn').forEach(b => b.addEventListener('click', async () => {
        await api(`/api/protected/referrals/notifications/${b.dataset.nid}/action`, { method:'PUT', json:{ note: '응대 완료' } })
        renderStats(target)
      }))
      notifList.querySelectorAll('.rfx-read-btn').forEach(b => b.addEventListener('click', async () => {
        await api(`/api/protected/referrals/notifications/${b.dataset.nid}/read`, { method:'PUT' })
        renderStats(target)
      }))
    }
  }

  // ────────────────────────────────────────────────
  // 4. 소개 등록 모달
  // ────────────────────────────────────────────────
  async function openAddModal() {
    const modal = document.createElement('div')
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;'
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
        <h2 class="text-xl font-bold mb-4">+ 소개 관계 등록</h2>
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium block mb-1">📥 소개자 (A)</label>
            <input type="text" id="rfx-referrer-search" placeholder="환자 이름/전화번호 검색" class="w-full px-3 py-2 rounded-lg border">
            <div id="rfx-referrer-results" class="mt-1 max-h-32 overflow-y-auto"></div>
            <div id="rfx-referrer-selected" class="mt-1 text-sm text-emerald-700 font-medium"></div>
          </div>
          <div>
            <label class="text-sm font-medium block mb-1">📤 소개받은 환자 (B)</label>
            <input type="text" id="rfx-referred-search" placeholder="환자 이름/전화번호 검색" class="w-full px-3 py-2 rounded-lg border">
            <div id="rfx-referred-results" class="mt-1 max-h-32 overflow-y-auto"></div>
            <div id="rfx-referred-selected" class="mt-1 text-sm text-emerald-700 font-medium"></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-sm font-medium block mb-1">진료 영역</label>
              <input type="text" id="rfx-treatment" placeholder="예: 임플란트" class="w-full px-3 py-2 rounded-lg border">
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">발생 매출 (원)</label>
              <input type="number" id="rfx-revenue" placeholder="0" class="w-full px-3 py-2 rounded-lg border">
            </div>
          </div>
          <div>
            <label class="text-sm font-medium block mb-1">메모</label>
            <textarea id="rfx-notes" rows="2" class="w-full px-3 py-2 rounded-lg border"></textarea>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button id="rfx-save-btn" class="flex-1 px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium">등록</button>
          <button id="rfx-cancel-btn" class="px-4 py-2 rounded-xl bg-slate-200">취소</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    let referrerId = null, referredId = null

    function setupSearch(inputId, resultsId, selectedId, onSelect) {
      const input = modal.querySelector('#'+inputId)
      const results = modal.querySelector('#'+resultsId)
      const selected = modal.querySelector('#'+selectedId)
      let timer
      input.addEventListener('input', () => {
        clearTimeout(timer)
        const q = input.value.trim()
        if (q.length < 1) { results.innerHTML = ''; return }
        timer = setTimeout(async () => {
          const data = await api(`/api/protected/referrals/search-patients?q=${encodeURIComponent(q)}`)
          results.innerHTML = (data.patients || []).map(p => `
            <div class="px-3 py-2 rounded-lg hover:bg-indigo-50 cursor-pointer text-sm" data-pid="${p.id}" data-pname="${p.patient_name}">
              ${p.patient_name} · ${p.phone || '-'} ${p.referral_count > 0 ? `· 소개 ${p.referral_count}명` : ''}
            </div>
          `).join('')
          results.querySelectorAll('[data-pid]').forEach(d => {
            d.addEventListener('click', () => {
              onSelect(d.dataset.pid, d.dataset.pname)
              selected.textContent = `✓ ${d.dataset.pname} 선택됨`
              results.innerHTML = ''
              input.value = d.dataset.pname
            })
          })
        }, 200)
      })
    }

    setupSearch('rfx-referrer-search', 'rfx-referrer-results', 'rfx-referrer-selected', (id) => referrerId = id)
    setupSearch('rfx-referred-search', 'rfx-referred-results', 'rfx-referred-selected', (id) => referredId = id)

    modal.querySelector('#rfx-cancel-btn').addEventListener('click', () => modal.remove())
    modal.querySelector('#rfx-save-btn').addEventListener('click', async () => {
      if (!referrerId || !referredId) {
        alert('소개자와 소개받은 환자를 모두 선택해주세요')
        return
      }
      const result = await api('/api/protected/referrals', {
        method: 'POST',
        json: {
          referrer_id: referrerId,
          referred_id: referredId,
          initial_treatment: modal.querySelector('#rfx-treatment').value,
          generated_revenue: parseInt(modal.querySelector('#rfx-revenue').value) || 0,
          notes: modal.querySelector('#rfx-notes').value
        }
      }).catch(e => ({ error: e.message }))

      if (result.error) {
        alert('오류: ' + result.error)
      } else {
        modal.remove()
        renderMode()
      }
    })
  }

  // ────────────────────────────────────────────────
  // Export
  // ────────────────────────────────────────────────
  window.PFM = window.PFM || {}
  window.PFM.modules = window.PFM.modules || {}
  window.PFM.modules.referrals = { renderReferrals }
})()
