/* ═══════════════════════════════════════════════════════════
 * Referrals Module - 3D 소개 갤럭시 + 팬 등급 관리
 * ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict'

  const api = window.PFM?.api || (async () => ({}))
  const ICONS = window.PFM?.ICONS || {}

  // 등급 메타
  const LEVEL_META = {
    evangelist: { label: '전도사', emoji: '🌟', color: '#fbbf24', bg: 'from-yellow-400 to-orange-500' },
    fan:        { label: '팬',     emoji: '💎', color: '#06b6d4', bg: 'from-cyan-400 to-blue-500' },
    loyal:      { label: '충성',   emoji: '💗', color: '#ec4899', bg: 'from-pink-400 to-rose-500' },
    satisfied:  { label: '만족',   emoji: '😊', color: '#10b981', bg: 'from-emerald-400 to-green-500' },
    general:    { label: '일반',   emoji: '👤', color: '#94a3b8', bg: 'from-slate-300 to-slate-400' }
  }

  let graphInstance = null
  let currentMode = 'galaxy'  // galaxy / list / stats
  let cachedGraph = null

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
          width: 100%; height: 70vh; min-height: 500px;
          background: radial-gradient(ellipse at center, #0f172a 0%, #020617 100%);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
        }
        .rfx-tooltip {
          position: absolute; pointer-events: none;
          background: rgba(15,23,42,0.95); backdrop-filter: blur(10px);
          border: 1px solid rgba(99,102,241,0.4);
          color: white; padding: 0.75rem 1rem; border-radius: 0.75rem;
          font-size: 13px; z-index: 100; max-width: 280px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          opacity: 0; transition: opacity 0.15s;
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
          <div id="rfx-graph">
            <div class="absolute inset-0 flex items-center justify-center text-white/60">
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
      if (window.ForceGraph3D) return resolve()
      const s1 = document.createElement('script')
      s1.src = 'https://unpkg.com/three@0.149.0/build/three.min.js'
      s1.onload = () => {
        const s2 = document.createElement('script')
        s2.src = 'https://unpkg.com/3d-force-graph@1.73.4/dist/3d-force-graph.min.js'
        s2.onload = resolve
        s2.onerror = reject
        document.head.appendChild(s2)
      }
      s1.onerror = reject
      document.head.appendChild(s1)
    })
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
    if (!data.ok) {
      container.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-white/60">로딩 실패</div>`
      return
    }

    container.innerHTML = ''

    if (!window.ForceGraph3D) {
      container.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-white">3D 라이브러리 로드 실패</div>`
      return
    }

    // 그래프 초기화
    graphInstance = window.ForceGraph3D()(container)
      .backgroundColor('rgba(0,0,0,0)')
      .nodeLabel(node => `
        <div style="background:rgba(15,23,42,0.95);padding:8px 12px;border-radius:8px;
                    border:1px solid ${node.color};color:white;font-size:12px;">
          <strong>${node.levelEmoji} ${node.name}</strong><br>
          ${node.levelLabel} · 영향력 ${node.score}점<br>
          소개 ${node.referralCount}명 · 매출 ${(node.referralRevenue/10000).toFixed(0)}만원
        </div>
      `)
      .nodeColor(node => node.color)
      .nodeVal('val')
      .nodeOpacity(0.95)
      .linkColor(() => 'rgba(99,102,241,0.4)')
      .linkWidth('width')
      .linkDirectionalArrowLength(3.5)
      .linkDirectionalArrowRelPos(0.95)
      .linkDirectionalParticles(link => link.revenue > 3000000 ? 2 : 0)
      .linkDirectionalParticleSpeed(0.005)
      .linkDirectionalParticleColor(() => '#fde68a')
      .linkDirectionalParticleWidth(2)
      .onNodeClick(node => {
        graphInstance.cameraPosition(
          { x: node.x * 1.4, y: node.y * 1.4, z: node.z * 1.4 },
          node, 800
        )
        showPatientDetail(node)
      })
      .graphData({
        nodes: data.nodes,
        links: data.links
      })

    // 노드 크기 조정 (전도사는 더 크게)
    setTimeout(() => {
      if (graphInstance) {
        graphInstance.cameraPosition({ x: 0, y: 0, z: 380 })
      }
    }, 300)

    // 통계 카드
    renderGraphStats(data.stats)
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
            <button onclick="document.getElementById('rfx-detail-modal').remove()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30">✕</button>
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
