/* ═══ Module: 환자 통계 대시보드 (Patient Statistics Dashboard) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc } = PFM;

// ═══ 라벨 데이터 ═══
const VISIT_SOURCES = {
  ref_patient: '환자 소개', ref_acquaintance: '지인 소개',
  ref_staff: '직원 소개', ref_doctor: '원장 소개',
  online_search: '검색', online_naver: '네이버',
  online_blog: '블로그', online_insta: '인스타그램',
  online_youtube: '유튜브', online_homepage: '홈페이지',
  online_homepage_db: '홈페이지(DB)', online_cafe: '네이버카페',
  online_daangn: '당근마켓', online_ad: '광고', online_etc: '기타 온라인',
  walk_sign: '간판보고', walk_near: '가까워서'
};
const SOURCE_GROUPS = {
  ref_patient:'소개', ref_acquaintance:'소개', ref_staff:'소개', ref_doctor:'소개',
  online_search:'온라인', online_naver:'온라인', online_blog:'온라인', online_insta:'온라인',
  online_youtube:'온라인', online_homepage:'온라인', online_homepage_db:'온라인',
  online_cafe:'온라인', online_daangn:'온라인', online_ad:'온라인', online_etc:'온라인',
  walk_sign:'그냥', walk_near:'그냥'
};
var SOURCE_GROUP_COLORS = { '\uc18c\uac1c':'#22c55e', '\uc628\ub77c\uc778':'#3b82f6', '\uadf8\ub0e5':'#f59e0b', '\ubbf8\uc785\ub825':'#cbd5e1' };

var TREATMENT_AREAS = {
  implant: '임플란트', orthodontics: '치아교정', cosmetic: '심미치료',
  general: '일반진료', pediatric: '소아치료', scaling: '스케일링',
  denture: '틀니', etc: '기타'
};
var AREA_COLORS = {
  implant: '#3b82f6', orthodontics: '#8b5cf6', cosmetic: '#ec4899',
  general: '#6b7280', pediatric: '#f59e0b', scaling: '#22c55e',
  denture: '#0ea5e9', etc: '#94a3b8'
};

// ═══ 헬퍼 ═══
function renderBar(label, count, total, color, maxCount) {
  var pct = total > 0 ? Math.round(count / total * 100) : 0;
  var barW = maxCount > 0 ? Math.max(Math.round(count / maxCount * 100), 3) : 3;
  return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:5px">' +
    '<span style="width:90px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(label) + '">' + esc(label) + '</span>' +
    '<div style="flex:1;background:var(--bg);border-radius:4px;height:20px;overflow:hidden">' +
      '<div style="height:100%;background:' + color + ';border-radius:4px;width:' + barW + '%;transition:width 0.3s"></div>' +
    '</div>' +
    '<span style="width:45px;text-align:right;font-weight:700">' + count + '</span>' +
    '<span style="width:40px;text-align:right;color:var(--text-muted);font-size:11px">' + pct + '%</span>' +
  '</div>';
}

function cardS() {
  return 'background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px';
}

// ═══ 기간 프리셋 ═══
function getPeriodDates(preset) {
  var now = new Date();
  var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  var from = '', to = '', period = 'daily';

  if (preset === 'today') {
    var ds = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    from = ds; to = ds; period = 'daily';
  } else if (preset === 'this_week') {
    var day = now.getDay() || 7;
    var mon = new Date(y, m, d - day + 1);
    var sun = new Date(y, m, d - day + 7);
    from = mon.toISOString().slice(0,10); to = sun.toISOString().slice(0,10); period = 'daily';
  } else if (preset === 'this_month') {
    from = y + '-' + String(m+1).padStart(2,'0') + '-01';
    to = y + '-' + String(m+1).padStart(2,'0') + '-' + String(new Date(y, m+1, 0).getDate()).padStart(2,'0');
    period = 'daily';
  } else if (preset === 'this_year') {
    from = y + '-01-01'; to = y + '-12-31'; period = 'monthly';
  } else if (preset === 'last_month') {
    var lm = m === 0 ? 11 : m - 1;
    var ly = m === 0 ? y - 1 : y;
    from = ly + '-' + String(lm+1).padStart(2,'0') + '-01';
    to = ly + '-' + String(lm+1).padStart(2,'0') + '-' + String(new Date(ly, lm+1, 0).getDate()).padStart(2,'0');
    period = 'daily';
  } else if (preset === 'last_year') {
    from = (y-1) + '-01-01'; to = (y-1) + '-12-31'; period = 'monthly';
  } else if (preset === 'all') {
    from = ''; to = ''; period = 'yearly';
  } else if (preset === 'custom') {
    return null; // 사용자 입력
  }
  return { from: from, to: to, period: period, preset: preset };
}

// ═══ 메인 렌더링 ═══
async function renderPatientsStats(body, actions) {
  actions.innerHTML = '';

  var currentPreset = 'this_month';
  var currentFrom = '', currentTo = '', currentPeriod = 'daily';

  // 초기값 세팅
  var init = getPeriodDates(currentPreset);
  currentFrom = init.from; currentTo = init.to; currentPeriod = init.period;

  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

  async function loadStats() {
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    try {
      var params = new URLSearchParams({ period: currentPeriod });
      if (currentFrom) params.set('from', currentFrom);
      if (currentTo) params.set('to', currentTo);
      var data = await api('/api/protected/patients/stats/detailed?' + params);
      renderDashboard(data);
    } catch(e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444">통계를 불러올 수 없습니다</div>';
    }
  }

  function renderDashboard(data) {
    var maxSource = data.bySource.length > 0 ? data.bySource[0].c : 0;
    var maxArea = data.byTreatmentArea.length > 0 ? data.byTreatmentArea[0].c : 0;
    var maxSido = data.bySido.length > 0 ? data.bySido[0].c : 0;
    var maxSigungu = data.bySigungu.length > 0 ? data.bySigungu[0].c : 0;
    var maxDoctor = data.byDoctor.length > 0 ? data.byDoctor[0].c : 0;
    var maxCounselor = data.byCounselor.length > 0 ? data.byCounselor[0].c : 0;

    // 내원 경로 그룹별 집계
    var sourceGroupTotals = {};
    data.bySource.forEach(function(s) {
      var g = SOURCE_GROUPS[s.visit_source] || '미입력';
      sourceGroupTotals[g] = (sourceGroupTotals[g] || 0) + s.c;
    });

    // 기간 표시
    var periodLabel = '';
    if (currentPreset === 'today') periodLabel = currentFrom;
    else if (currentPreset === 'this_week') periodLabel = currentFrom + ' ~ ' + currentTo;
    else if (currentPreset === 'this_month') periodLabel = currentFrom.slice(0,7);
    else if (currentPreset === 'this_year') periodLabel = currentFrom.slice(0,4) + '년';
    else if (currentPreset === 'last_month') periodLabel = currentFrom.slice(0,7);
    else if (currentPreset === 'last_year') periodLabel = currentFrom.slice(0,4) + '년';
    else if (currentPreset === 'all') periodLabel = '전체 기간';
    else periodLabel = (currentFrom || '~') + ' ~ ' + (currentTo || '~');

    body.innerHTML =
      '<div class="mb-20">' +
        '<h3 style="margin:0 0 16px;font-size:20px;font-weight:900">📊 환자 통계</h3>' +

        // 기간 선택
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
          ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'last_year', 'all', 'custom'].map(function(p) {
            var labels = { today:'오늘', this_week:'이번 주', this_month:'이번 달', last_month:'지난 달', this_year:'올해', last_year:'작년', all:'전체', custom:'직접 선택' };
            var active = currentPreset === p;
            return '<button class="btn btn-sm ps-preset" data-preset="' + p + '" style="' +
              (active ? 'background:var(--primary);color:#fff;font-weight:700;' : '') +
              'border-radius:20px;padding:6px 14px;font-size:12px">' + labels[p] + '</button>';
          }).join('') +
        '</div>' +

        // 직접 선택 (custom일 때)
        '<div id="psCustomRange" style="display:' + (currentPreset === 'custom' ? 'flex' : 'none') + ';gap:8px;align-items:center;margin-bottom:12px">' +
          '<input type="date" id="psFrom" value="' + currentFrom + '" class="input-sm">' +
          '<span class="text-muted">~</span>' +
          '<input type="date" id="psTo" value="' + currentTo + '" class="input-sm">' +
          '<select id="psPeriod" class="input-sm">' +
            '<option value="daily"' + (currentPeriod==='daily'?' selected':'') + '>일간</option>' +
            '<option value="weekly"' + (currentPeriod==='weekly'?' selected':'') + '>주간</option>' +
            '<option value="monthly"' + (currentPeriod==='monthly'?' selected':'') + '>월간</option>' +
            '<option value="yearly"' + (currentPeriod==='yearly'?' selected':'') + '>연간</option>' +
          '</select>' +
          '<button class="btn btn-primary btn-sm" id="psApplyCustom" style="border-radius:8px">조회</button>' +
        '</div>' +

        '<div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">📅 ' + esc(periodLabel) + ' 기준</div>' +
      '</div>' +

      // ═══ 요약 카드 ═══
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:24px">' +
        '<div style="' + cardS() + ';text-align:center">' +
          '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">총 환자</div>' +
          '<div style="font-size:30px;font-weight:900;color:var(--primary)">' + data.total.toLocaleString() + '</div>' +
        '</div>' +
        (data.byPatientType || []).map(function(pt) {
          var isNew = pt.patient_type === 'new';
          return '<div style="' + cardS() + ';text-align:center">' +
            '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">' + (isNew ? '🔵 신환' : '🟢 구환') + '</div>' +
            '<div style="font-size:30px;font-weight:900;color:' + (isNew ? '#3b82f6' : '#22c55e') + '">' + pt.c.toLocaleString() + '</div>' +
          '</div>';
        }).join('') +
        (data.byGender || []).map(function(g) {
          var isMale = g.gender === 'male';
          return '<div style="' + cardS() + ';text-align:center">' +
            '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">' + (isMale ? '👨 남성' : '👩 여성') + '</div>' +
            '<div style="font-size:30px;font-weight:900;color:' + (isMale ? '#3b82f6' : '#ec4899') + '">' + g.c.toLocaleString() + '</div>' +
          '</div>';
        }).join('') +
        // 소개/온라인/그냥 요약
        Object.entries(sourceGroupTotals).map(function(entry) {
          var color = SOURCE_GROUP_COLORS[entry[0]] || '#94a3b8';
          return '<div style="' + cardS() + ';text-align:center">' +
            '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">' + esc(entry[0]) + '</div>' +
            '<div style="font-size:30px;font-weight:900;color:' + color + '">' + entry[1] + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      // ═══ 트렌드 차트 (텍스트 기반 미니 바) ═══
      (data.trend && data.trend.length > 1 ? '<div style="' + cardS() + '">' +
        '<h4 class="mod-title">📈 기간별 추이</h4>' +
        '<div style="overflow-x:auto">' +
          '<div style="display:flex;gap:2px;align-items:flex-end;min-height:120px;padding-bottom:24px;position:relative">' +
            data.trend.map(function(t) {
              var maxT = Math.max.apply(null, data.trend.map(function(x){ return x.c; }));
              var h = maxT > 0 ? Math.max(Math.round(t.c / maxT * 100), 5) : 5;
              var newH = maxT > 0 ? Math.round((t.new_count || 0) / maxT * 100) : 0;
              var w = Math.max(Math.floor(100 / Math.max(data.trend.length, 1)), 8);
              var label = t.period_key || '';
              // 간략 표시
              if (label.length === 10) label = label.slice(5); // MM-DD
              else if (label.length === 7) label = label.slice(2); // YY-MM
              return '<div style="flex:1;min-width:' + w + 'px;display:flex;flex-direction:column;align-items:center;gap:2px">' +
                '<span style="font-size:9px;font-weight:700;color:var(--text)">' + t.c + '</span>' +
                '<div style="width:100%;max-width:40px;position:relative">' +
                  '<div style="height:' + h + 'px;background:#3b82f620;border-radius:3px 3px 0 0;position:relative">' +
                    '<div style="position:absolute;bottom:0;left:0;right:0;height:' + newH + 'px;background:#3b82f6;border-radius:3px 3px 0 0"></div>' +
                  '</div>' +
                '</div>' +
                '<span style="font-size:8px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">' + esc(label) + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div style="display:flex;gap:12px;font-size:10px;color:var(--text-muted);margin-top:8px">' +
            '<span>■ <span style="color:#3b82f6">신환</span></span>' +
            '<span>□ <span style="color:#3b82f620">전체</span></span>' +
          '</div>' +
        '</div>' +
      '</div>' : '') +

      // ═══ 2열 레이아웃 ═══
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +

        // 내원경로별
        '<div style="' + cardS() + '">' +
          '<h4 class="mod-title">🚪 내원 경로별</h4>' +
          (data.bySource.length > 0 ?
            data.bySource.map(function(s) {
              var label = VISIT_SOURCES[s.visit_source] || s.visit_source || '미입력';
              var group = SOURCE_GROUPS[s.visit_source] || '미입력';
              var color = SOURCE_GROUP_COLORS[group] || '#94a3b8';
              return renderBar(label, s.c, data.total, color, maxSource);
            }).join('') :
            '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>'
          ) +
        '</div>' +

        // 진료과목별
        '<div style="' + cardS() + '">' +
          '<h4 class="mod-title">🏥 진료 과목별</h4>' +
          (data.byTreatmentArea.length > 0 ?
            data.byTreatmentArea.map(function(a) {
              var label = TREATMENT_AREAS[a.treatment_area] || a.treatment_area || '미입력';
              var color = AREA_COLORS[a.treatment_area] || '#94a3b8';
              return renderBar(label, a.c, data.total, color, maxArea);
            }).join('') :
            '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>'
          ) +
        '</div>' +

        // 지역별 (시/도)
        '<div style="' + cardS() + '">' +
          '<h4 class="mod-title">📍 내원 지역별 (시/도)</h4>' +
          (data.bySido.length > 0 ?
            data.bySido.map(function(s) {
              return renderBar(s.addr_sido, s.c, data.total, '#06b6d4', maxSido);
            }).join('') :
            '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>'
          ) +
        '</div>' +

        // 지역별 (시/군/구) Top 20
        '<div style="' + cardS() + '">' +
          '<h4 class="mod-title">📍 내원 지역별 (시/군/구)</h4>' +
          (data.bySigungu.length > 0 ?
            data.bySigungu.map(function(s) {
              var label = (s.addr_sido || '').replace(/특별시|광역시|특별자치시|특별자치도/g, '').slice(0,2) + ' ' + s.addr_sigungu;
              return renderBar(label, s.c, data.total, '#8b5cf6', maxSigungu);
            }).join('') :
            '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>'
          ) +
        '</div>' +

        // 담당 원장별
        '<div style="' + cardS() + '">' +
          '<h4 class="mod-title">👨‍⚕️ 담당 원장별</h4>' +
          (data.byDoctor.length > 0 ?
            data.byDoctor.map(function(d) {
              return renderBar(d.primary_doctor, d.c, data.total, '#f59e0b', maxDoctor);
            }).join('') :
            '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>'
          ) +
        '</div>' +

        // 담당 상담사별
        '<div style="' + cardS() + '">' +
          '<h4 class="mod-title">👩‍💼 담당 상담사별</h4>' +
          (data.byCounselor.length > 0 ?
            data.byCounselor.map(function(c) {
              return renderBar(c.assigned_counselor, c.c, data.total, '#ec4899', maxCounselor);
            }).join('') :
            '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>'
          ) +
        '</div>' +

      '</div>';

    // ═══ 이벤트 바인딩 ═══
    document.querySelectorAll('.ps-preset').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var preset = btn.dataset.preset;
        if (preset === 'custom') {
          currentPreset = 'custom';
          document.getElementById('psCustomRange').style.display = 'flex';
          // 기존 값 유지, 리로드 안함
          // 프리셋 버튼 스타일만 업데이트
          document.querySelectorAll('.ps-preset').forEach(function(b) {
            if (b.dataset.preset === 'custom') {
              b.style.background = 'var(--primary)'; b.style.color = '#fff'; b.style.fontWeight = '700';
            } else {
              b.style.background = ''; b.style.color = ''; b.style.fontWeight = '';
            }
          });
          return;
        }
        var dates = getPeriodDates(preset);
        if (dates) {
          currentPreset = preset;
          currentFrom = dates.from;
          currentTo = dates.to;
          currentPeriod = dates.period;
          loadStats();
        }
      });
    });

    var applyBtn = document.getElementById('psApplyCustom');
    if (applyBtn) {
      applyBtn.addEventListener('click', function() {
        currentFrom = document.getElementById('psFrom').value || '';
        currentTo = document.getElementById('psTo').value || '';
        currentPeriod = document.getElementById('psPeriod').value || 'daily';
        currentPreset = 'custom';
        loadStats();
      });
    }
  }

  await loadStats();
}

/* ════════════════════════════════════════════════
   👑 LTV 랭킹 (C-3: 통계 기반, AI 호출 없음)
   ════════════════════════════════════════════════ */
const LTV_TIER_COLORS = {
  VIP:     { bg:'#f5f3ff', color:'#7c3aed', border:'#c4b5fd', icon:'👑' },
  GOLD:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'🏆' },
  SILVER:  { bg:'#f0f9ff', color:'#0369a1', border:'#bae6fd', icon:'🥈' },
  REGULAR: { bg:'#f8fafc', color:'#475569', border:'#cbd5e1', icon:'👤' },
};

async function renderLtvRanking(body, actions) {
  actions.innerHTML = '<button class="btn btn-sm" onclick="PFM.navigate(\'patients_stats\')">📊 환자 통계</button>';
  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

  try {
    const data = await api('/api/protected/ai/ltv-ranking?limit=50');
    const ranking = data.ranking || [];

    if (ranking.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:16px">👑</div><h3>LTV 데이터가 충분하지 않습니다</h3><p style="font-size:13px">상담 기록이 누적되면 자동으로 랭킹이 생성됩니다.</p></div>';
      return;
    }

    // 등급별 카운트
    const tierCount = { VIP:0, GOLD:0, SILVER:0, REGULAR:0 };
    ranking.forEach(r => { tierCount[r.tier] = (tierCount[r.tier]||0) + 1; });

    body.innerHTML = `
      <div style="margin-bottom:16px">
        <h2 style="margin:0 0 6px;font-size:20px;font-weight:900">👑 환자 LTV 랭킹 TOP ${ranking.length}</h2>
        <div style="font-size:12px;color:var(--text-muted)">누적 동의금액 + 내원횟수 + 소개 기여도 종합 (개별 환자 → AI 상세분석은 환자 상세에서)</div>
      </div>

      <!-- 등급 요약 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:16px">
        ${['VIP','GOLD','SILVER','REGULAR'].map(t => {
          const m = LTV_TIER_COLORS[t];
          return `<div style="background:${m.bg};border:1px solid ${m.border};border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:20px">${m.icon}</div>
            <div style="font-weight:900;font-size:18px;color:${m.color}">${tierCount[t]||0}</div>
            <div style="font-size:11px;color:${m.color};font-weight:700">${t}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- 랭킹 테이블 -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--bg-hover)">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">#</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">등급</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">환자명</th>
              <th class="tbl-cell">차트번호</th>
              <th class="tbl-cell">내원</th>
              <th class="tbl-cell">누적 동의</th>
              <th class="tbl-cell">소개</th>
              <th class="tbl-cell">유입</th>
              <th class="tbl-cell">최근내원</th>
            </tr>
          </thead>
          <tbody>
            ${ranking.map(r => {
              const m = LTV_TIER_COLORS[r.tier] || LTV_TIER_COLORS.REGULAR;
              return `<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="PFM.modules.patients?.openPatientDetail?.('${r.id}', null, ()=>{})">
                <td style="padding:8px 12px;font-weight:900;color:#64748b">${r.rank}</td>
                <td style="padding:8px 12px"><span style="background:${m.bg};color:${m.color};border:1px solid ${m.border};padding:3px 8px;border-radius:6px;font-weight:700;font-size:11px">${m.icon} ${r.tier}</span></td>
                <td style="padding:8px 12px;font-weight:700">${esc(r.patient_name)}</td>
                <td class="tbl-cell">${r.chart_number || '-'}</td>
                <td class="tbl-cell">${r.visit_count || 1}회</td>
                <td class="tbl-cell" style="font-weight:700;color:${m.color}">${((r.total_agreed||0)/10000).toLocaleString()}만</td>
                <td class="tbl-cell">${r.referral_count > 0 ? `<span style="color:#16a34a;font-weight:700">${r.referral_count}명</span>` : '-'}</td>
                <td class="tbl-cell">${r.visit_source || '-'}</td>
                <td class="tbl-cell">${r.last_visit_date ? r.last_visit_date.slice(0,10) : '-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top:12px;font-size:11px;color:var(--text-muted);text-align:center">💡 환자 행 클릭 → 상세 모달 → AI LTV 분석 가능</div>
    `;
  } catch(e) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">LTV 랭킹을 불러올 수 없습니다: ${esc(e.message || '')}</div>`;
  }
}

// ═══ 모듈 등록 ═══
PFM.modules.patientsStats = { renderPatientsStats: renderPatientsStats, renderLtvRanking: renderLtvRanking };

})(window.PFM);
