/* ═══ Module: KPI 통계 대시보드 (KPI Statistics Dashboard) ═══ */
(function(PFM) {
'use strict';
var api = PFM.api, esc = PFM.esc;

// ═══ 요일 라벨 ═══
var DAY_LABELS = { mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일' };
var DAY_ORDER = ['mon','tue','wed','thu','fri','sat','sun'];
var DAY_COLORS = { mon:'#3b82f6', tue:'#22c55e', wed:'#f59e0b', thu:'#8b5cf6', fri:'#ec4899', sat:'#06b6d4', sun:'#ef4444' };

// ═══ 숫자 포맷 ═══
function fmt(n) { return n != null ? Number(n).toLocaleString() : '-'; }
function fmtM(n) {
  if (n == null) return '-';
  var v = Number(n);
  if (v >= 10000) return (v/10000).toFixed(1).replace(/\.0$/,'') + '억';
  return Math.round(v).toLocaleString() + '만';
}
function fmtPct(a, b) { return b > 0 ? Math.round(a / b * 100) + '%' : '-'; }

// ═══ 바 차트 헬퍼 ═══
function bar(label, value, max, color, suffix) {
  var w = max > 0 ? Math.max(Math.round(value / max * 100), 3) : 3;
  return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:5px">' +
    '<span style="width:36px;font-weight:700;text-align:center">' + esc(label) + '</span>' +
    '<div style="flex:1;background:var(--bg);border-radius:4px;height:22px;overflow:hidden">' +
      '<div style="height:100%;background:' + color + ';border-radius:4px;width:' + w + '%;transition:width 0.3s"></div>' +
    '</div>' +
    '<span style="width:70px;text-align:right;font-weight:700">' + (suffix || fmt(value)) + '</span>' +
  '</div>';
}

function cardS() { return 'background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px'; }

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
    from = ''; to = ''; period = 'monthly';
  } else if (preset === 'custom') {
    return null;
  }
  return { from: from, to: to, period: period, preset: preset };
}

// ═══ 메인 렌더링 ═══
async function renderKpiStats(body, actions) {
  actions.innerHTML = '';
  var currentPreset = 'this_month';
  var init = getPeriodDates(currentPreset);
  var currentFrom = init.from, currentTo = init.to, currentPeriod = init.period;

  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

  async function loadStats() {
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    try {
      var params = new URLSearchParams({ period: currentPeriod });
      if (currentFrom) params.set('from', currentFrom);
      if (currentTo) params.set('to', currentTo);
      var data = await api('/api/protected/kpi/stats?' + params);
      renderDashboard(data);
    } catch(e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444">통계를 불러올 수 없습니다</div>';
    }
  }

  function renderDashboard(data) {
    var s = data.summary || {};
    var dow = data.byDayOfWeek || [];
    var trend = data.trend || [];

    // 기간 라벨
    var periodLabel = '';
    if (currentPreset === 'today') periodLabel = currentFrom;
    else if (currentPreset === 'this_week') periodLabel = currentFrom + ' ~ ' + currentTo;
    else if (currentPreset === 'this_month') periodLabel = currentFrom.slice(0,7);
    else if (currentPreset === 'this_year') periodLabel = currentFrom.slice(0,4) + '년';
    else if (currentPreset === 'last_month') periodLabel = currentFrom.slice(0,7);
    else if (currentPreset === 'last_year') periodLabel = currentFrom.slice(0,4) + '년';
    else if (currentPreset === 'all') periodLabel = '전체 기간';
    else periodLabel = (currentFrom || '~') + ' ~ ' + (currentTo || '~');

    var totalRev = (s.total_revenue || 0);
    var revNI = (s.revenue_ni || 0);
    var revI = (s.revenue_i || 0);
    var totalPat = (s.total_patients || 0);
    var newPat = (s.new_patients || 0);
    var existPat = (s.existing_patients || 0);
    var days = (s.days || 0);

    // ═══ HTML 빌드 ═══
    var html = '';

    // 제목 + 기간선택
    html += '<div class="mb-20">' +
      '<h3 style="margin:0 0 16px;font-size:20px;font-weight:900">📊 KPI 통계</h3>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">';
    ['today','this_week','this_month','last_month','this_year','last_year','all','custom'].forEach(function(p) {
      var labels = { today:'오늘', this_week:'이번 주', this_month:'이번 달', last_month:'지난 달', this_year:'올해', last_year:'작년', all:'전체', custom:'직접 선택' };
      var active = currentPreset === p;
      html += '<button class="btn btn-sm ks-preset" data-preset="' + p + '" style="' +
        (active ? 'background:var(--primary);color:#fff;font-weight:700;' : '') +
        'border-radius:20px;padding:6px 14px;font-size:12px">' + labels[p] + '</button>';
    });
    html += '</div>';

    // 커스텀 날짜
    html += '<div id="ksCustomRange" style="display:' + (currentPreset === 'custom' ? 'flex' : 'none') + ';gap:8px;align-items:center;margin-bottom:12px">' +
      '<input type="date" id="ksFrom" value="' + currentFrom + '" class="input-sm">' +
      '<span class="text-muted">~</span>' +
      '<input type="date" id="ksTo" value="' + currentTo + '" class="input-sm">' +
      '<select id="ksPeriod" class="input-sm">' +
        '<option value="daily"' + (currentPeriod==='daily'?' selected':'') + '>일간</option>' +
        '<option value="weekly"' + (currentPeriod==='weekly'?' selected':'') + '>주간</option>' +
        '<option value="monthly"' + (currentPeriod==='monthly'?' selected':'') + '>월간</option>' +
        '<option value="yearly"' + (currentPeriod==='yearly'?' selected':'') + '>연간</option>' +
      '</select>' +
      '<button class="btn btn-primary btn-sm" id="ksApplyCustom" style="border-radius:8px">조회</button>' +
    '</div>';
    html += '<div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">📅 ' + esc(periodLabel) + ' 기준 (' + days + '일)</div>';
    html += '</div>';

    // ═══ 요약 카드 ═══
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px">';
    var cards = [
      { label: '💰 총 매출', value: fmtM(totalRev), color: 'var(--primary)' },
      { label: '🔵 비급여', value: fmtM(revNI), color: '#3b82f6' },
      { label: '🟢 급여', value: fmtM(revI), color: '#22c55e' },
      { label: '👥 총 환자', value: fmt(totalPat), color: '#8b5cf6' },
      { label: '🔵 신환', value: fmt(newPat), color: '#3b82f6' },
      { label: '🟢 구환', value: fmt(existPat), color: '#22c55e' },
      { label: '📞 인바운드', value: fmt(s.inbound_calls || 0), color: '#f59e0b' },
      { label: '📱 아웃바운드', value: fmt(s.outbound_calls || 0), color: '#06b6d4' },
      { label: '❌ 취소', value: fmt(s.cancel_count || 0), color: '#ef4444' },
      { label: '⚠️ 컴플레인', value: fmt(s.complaint_count || 0), color: '#f97316' },
      { label: '⏱️ 평균대기', value: (s.avg_wait_time || 0) + '분', color: '#6b7280' },
      { label: '⭐ 네이버리뷰', value: fmt(s.naver_reviews || 0), color: '#22c55e' },
    ];
    cards.forEach(function(c) {
      html += '<div style="' + cardS() + ';text-align:center">' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">' + c.label + '</div>' +
        '<div style="font-size:26px;font-weight:900;color:' + c.color + '">' + c.value + '</div>' +
      '</div>';
    });
    html += '</div>';

    // ═══ 상담 & 동의율 카드 ═══
    var t1c = s.t1_consult || 0, t1a = s.t1_agree || 0;
    var t2c = s.t2_consult || 0, t2a = s.t2_agree || 0;
    var t3c = s.t3_consult || 0, t3a = s.t3_agree || 0;
    var totalConsult = s.total_consult || 0;
    html += '<div style="' + cardS() + '">';
    html += '<h4 class="mod-title">🤝 상담 & 동의율</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">';
    html += '<div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center"><div class="mod-muted-xs">총 상담</div><div style="font-size:24px;font-weight:900">' + fmt(totalConsult) + '</div></div>';
    [['핵심진료1', t1c, t1a, '#3b82f6'], ['핵심진료2', t2c, t2a, '#8b5cf6'], ['핵심진료3', t3c, t3a, '#ec4899']].forEach(function(item) {
      html += '<div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center">' +
        '<div class="mod-muted-xs">' + item[0] + '</div>' +
        '<div style="font-size:20px;font-weight:900;color:' + item[3] + '">' + item[1] + ' → ' + item[2] + '</div>' +
        '<div class="mod-muted-sm">동의율 ' + fmtPct(item[2], item[1]) + '</div>' +
      '</div>';
    });
    html += '</div></div>';

    // ═══ 신환 유입경로 ═══
    var refNew = s.referral_new || 0, onNew = s.online_new || 0, etcNew = s.etc_new || 0;
    var sourceTotal = refNew + onNew + etcNew;
    if (sourceTotal > 0) {
      html += '<div style="' + cardS() + '">';
      html += '<h4 class="mod-title">🚪 신환 유입경로</h4>';
      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';
      [['소개', refNew, '#22c55e'], ['온라인', onNew, '#3b82f6'], ['기타', etcNew, '#f59e0b']].forEach(function(item) {
        html += '<div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center">' +
          '<div class="mod-muted-xs">' + item[0] + '</div>' +
          '<div style="font-size:24px;font-weight:900;color:' + item[2] + '">' + fmt(item[1]) + '</div>' +
          '<div class="mod-muted-sm">' + fmtPct(item[1], sourceTotal) + '</div>' +
        '</div>';
      });
      html += '</div></div>';
    }

    // ═══ 신환 지역분포 ═══
    var rc = s.region_core || 0, re = s.region_expand || 0, ra = s.region_adjacent || 0, ro = s.region_other || 0;
    var regionTotal = rc + re + ra + ro;
    if (regionTotal > 0) {
      html += '<div style="' + cardS() + '">';
      html += '<h4 class="mod-title">📍 신환 지역분포</h4>';
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
      [['핵심지역', rc, '#3b82f6'], ['확장지역', re, '#8b5cf6'], ['인접지역', ra, '#06b6d4'], ['기타지역', ro, '#94a3b8']].forEach(function(item) {
        html += '<div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center">' +
          '<div class="mod-muted-xs">' + item[0] + '</div>' +
          '<div style="font-size:24px;font-weight:900;color:' + item[2] + '">' + fmt(item[1]) + '</div>' +
          '<div class="mod-muted-sm">' + fmtPct(item[1], regionTotal) + '</div>' +
        '</div>';
      });
      html += '</div></div>';
    }

    // ═══ 요일별 통계 ═══
    html += '<div style="' + cardS() + '">';
    html += '<h4 class="mod-title">📅 요일별 평균</h4>';

    if (dow.length > 0) {
      // 요일 정렬
      var dowMap = {};
      dow.forEach(function(d) { dowMap[d.day_of_week] = d; });
      var maxRev = Math.max.apply(null, dow.map(function(d) { return d.avg_revenue || 0; }));
      var maxPat = Math.max.apply(null, dow.map(function(d) { return d.avg_total_patients || 0; }));

      // 매출 바 차트
      html += '<div class="mb-16"><div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">💰 평균 매출</div>';
      DAY_ORDER.forEach(function(d) {
        var v = dowMap[d];
        if (v) html += bar(DAY_LABELS[d], v.avg_revenue || 0, maxRev, DAY_COLORS[d], fmtM(v.avg_revenue || 0));
      });
      html += '</div>';

      // 환자수 바 차트
      html += '<div class="mb-16"><div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">👥 평균 환자수</div>';
      DAY_ORDER.forEach(function(d) {
        var v = dowMap[d];
        if (v) html += bar(DAY_LABELS[d], v.avg_total_patients || 0, maxPat, DAY_COLORS[d]);
      });
      html += '</div>';

      // 요일별 테이블
      html += '<div style="overflow-x:auto"><table style="width:100%;font-size:11px;border-collapse:collapse">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)">' +
        '<th style="padding:8px 4px;text-align:left">항목</th>';
      DAY_ORDER.forEach(function(d) {
        if (dowMap[d]) html += '<th style="padding:8px 4px;text-align:right;color:' + DAY_COLORS[d] + '">' + DAY_LABELS[d] + '</th>';
      });
      html += '</tr></thead><tbody>';

      var tableRows = [
        { label: '평균 매출', key: 'avg_revenue', fn: fmtM },
        { label: '평균 신환', key: 'avg_new', fn: fmt },
        { label: '평균 구환', key: 'avg_existing', fn: fmt },
        { label: '평균 총환자', key: 'avg_total_patients', fn: fmt },
        { label: '인바운드', key: 'avg_inbound', fn: fmt },
        { label: '아웃바운드', key: 'avg_outbound', fn: fmt },
        { label: '취소', key: 'avg_cancel', fn: fmt },
        { label: '컴플레인', key: 'avg_complaint', fn: fmt },
        { label: '평균대기(분)', key: 'avg_wait', fn: fmt },
        { label: '상담', key: 'avg_consult', fn: fmt },
        { label: '리뷰', key: 'avg_reviews', fn: fmt },
        { label: '데이터 일수', key: 'days', fn: fmt },
      ];
      tableRows.forEach(function(tr, idx) {
        html += '<tr style="border-bottom:1px solid var(--border);' + (idx % 2 === 0 ? 'background:var(--bg)' : '') + '">';
        html += '<td style="padding:6px 4px;font-weight:600">' + tr.label + '</td>';
        DAY_ORDER.forEach(function(d) {
          var v = dowMap[d];
          if (v) html += '<td style="padding:6px 4px;text-align:right">' + (tr.fn)(v[tr.key] || 0) + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>';
    }
    html += '</div>';

    // ═══ 기간별 트렌드 ═══
    if (trend.length > 1) {
      html += '<div style="' + cardS() + '">';
      html += '<h4 class="mod-title">📈 기간별 추이</h4>';

      // 매출 트렌드 바
      var maxTrendRev = Math.max.apply(null, trend.map(function(t) { return t.total_revenue || 0; }));
      html += '<div class="mb-20"><div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">💰 매출 추이</div>';
      html += '<div style="display:flex;gap:2px;align-items:flex-end;min-height:140px;padding-bottom:28px;position:relative">';
      trend.forEach(function(t) {
        var h = maxTrendRev > 0 ? Math.max(Math.round((t.total_revenue || 0) / maxTrendRev * 120), 5) : 5;
        var label = t.period_key || '';
        if (label.length === 10) label = label.slice(5);
        else if (label.length === 7) label = label.slice(2);
        html += '<div style="flex:1;min-width:8px;display:flex;flex-direction:column;align-items:center;gap:2px">' +
          '<span style="font-size:8px;font-weight:700;color:var(--text)">' + fmtM(t.total_revenue || 0) + '</span>' +
          '<div style="width:100%;max-width:40px;height:' + h + 'px;background:linear-gradient(to top,#3b82f6,#60a5fa);border-radius:3px 3px 0 0"></div>' +
          '<span style="font-size:7px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">' + esc(label) + '</span>' +
        '</div>';
      });
      html += '</div></div>';

      // 환자 트렌드 바
      var maxTrendPat = Math.max.apply(null, trend.map(function(t) { return (t.new_patients||0) + (t.existing_patients||0); }));
      html += '<div class="mb-20"><div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">👥 환자수 추이 (신환 + 구환)</div>';
      html += '<div style="display:flex;gap:2px;align-items:flex-end;min-height:140px;padding-bottom:28px;position:relative">';
      trend.forEach(function(t) {
        var total = (t.new_patients||0) + (t.existing_patients||0);
        var h = maxTrendPat > 0 ? Math.max(Math.round(total / maxTrendPat * 120), 5) : 5;
        var newH = maxTrendPat > 0 ? Math.round((t.new_patients||0) / maxTrendPat * 120) : 0;
        var label = t.period_key || '';
        if (label.length === 10) label = label.slice(5);
        else if (label.length === 7) label = label.slice(2);
        html += '<div style="flex:1;min-width:8px;display:flex;flex-direction:column;align-items:center;gap:2px">' +
          '<span style="font-size:8px;font-weight:700;color:var(--text)">' + total + '</span>' +
          '<div style="width:100%;max-width:40px;position:relative">' +
            '<div style="height:' + h + 'px;background:#22c55e30;border-radius:3px 3px 0 0;position:relative">' +
              '<div style="position:absolute;bottom:0;left:0;right:0;height:' + newH + 'px;background:#22c55e;border-radius:3px 3px 0 0"></div>' +
            '</div>' +
          '</div>' +
          '<span style="font-size:7px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">' + esc(label) + '</span>' +
        '</div>';
      });
      html += '</div>';
      html += '<div style="display:flex;gap:12px;font-size:10px;color:var(--text-muted)">' +
        '<span>■ <span style="color:#22c55e">신환</span></span>' +
        '<span>□ <span style="color:#22c55e30">전체</span></span>' +
      '</div>';
      html += '</div>';

      // 트렌드 테이블
      html += '<div style="overflow-x:auto;margin-top:16px"><table style="width:100%;font-size:10px;border-collapse:collapse">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)">' +
        '<th style="padding:6px 4px;text-align:left;position:sticky;left:0;background:var(--bg-card)">기간</th>' +
        '<th style="padding:6px 4px;text-align:right">매출</th>' +
        '<th style="padding:6px 4px;text-align:right">신환</th>' +
        '<th style="padding:6px 4px;text-align:right">구환</th>' +
        '<th style="padding:6px 4px;text-align:right">인콜</th>' +
        '<th style="padding:6px 4px;text-align:right">아웃콜</th>' +
        '<th style="padding:6px 4px;text-align:right">취소</th>' +
        '<th style="padding:6px 4px;text-align:right">컴플레인</th>' +
        '<th style="padding:6px 4px;text-align:right">리뷰</th>' +
      '</tr></thead><tbody>';
      trend.forEach(function(t, idx) {
        var label = t.period_key || '';
        html += '<tr style="border-bottom:1px solid var(--border);' + (idx % 2 === 0 ? 'background:var(--bg)' : '') + '">' +
          '<td style="padding:5px 4px;font-weight:600;position:sticky;left:0;background:' + (idx%2===0?'var(--bg)':'var(--bg-card)') + '">' + esc(label) + '</td>' +
          '<td style="padding:5px 4px;text-align:right">' + fmtM(t.total_revenue||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right;color:#3b82f6;font-weight:700">' + fmt(t.new_patients||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right">' + fmt(t.existing_patients||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right">' + fmt(t.inbound_calls||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right">' + fmt(t.outbound_calls||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right;color:#ef4444">' + fmt(t.cancel_count||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right;color:#f97316">' + fmt(t.complaint_count||0) + '</td>' +
          '<td style="padding:5px 4px;text-align:right">' + fmt(t.naver_reviews||0) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
      html += '</div>';
    }

    // ═══ 핵심진료 치료건수 ═══
    var t1cnt = s.core_t1_cnt || 0, t2cnt = s.core_t2_cnt || 0, t3cnt = s.core_t3_cnt || 0;
    var tTotal = t1cnt + t2cnt + t3cnt;
    if (tTotal > 0) {
      html += '<div style="' + cardS() + '">';
      html += '<h4 class="mod-title">🏥 핵심진료 치료건수</h4>';
      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';
      [['핵심진료1', t1cnt, '#3b82f6'], ['핵심진료2', t2cnt, '#8b5cf6'], ['핵심진료3', t3cnt, '#ec4899']].forEach(function(item) {
        html += '<div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center">' +
          '<div class="mod-muted-xs">' + item[0] + '</div>' +
          '<div style="font-size:24px;font-weight:900;color:' + item[2] + '">' + fmt(item[1]) + '건</div>' +
          '<div class="mod-muted-sm">' + fmtPct(item[1], tTotal) + '</div>' +
        '</div>';
      });
      html += '</div></div>';
    }

    // ═══ 소개감사장 + 핵심진료 신규 ═══
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    // 소개감사장
    html += '<div style="' + cardS() + '">';
    html += '<h4 class="mod-title">💌 소개감사장</h4>';
    html += '<div style="text-align:center;font-size:36px;font-weight:900;color:#f59e0b">' + fmt(s.referral_thanks || 0) + '</div>';
    html += '<div style="text-align:center;font-size:11px;color:var(--text-muted)">발송 건수</div>';
    html += '</div>';
    // 핵심진료 신규
    var t1n = s.core_t1_new || 0, t2n = s.core_t2_new || 0, t3n = s.core_t3_new || 0;
    html += '<div style="' + cardS() + '">';
    html += '<h4 class="mod-title">✨ 핵심진료 신규접수</h4>';
    html += '<div style="display:flex;gap:8px;justify-content:center">';
    [['T1', t1n, '#3b82f6'], ['T2', t2n, '#8b5cf6'], ['T3', t3n, '#ec4899']].forEach(function(item) {
      html += '<div style="text-align:center;padding:8px 16px;background:var(--bg);border-radius:10px">' +
        '<div class="mod-muted-xs">' + item[0] + '</div>' +
        '<div style="font-size:24px;font-weight:900;color:' + item[2] + '">' + fmt(item[1]) + '</div>' +
      '</div>';
    });
    html += '</div></div>';
    html += '</div>';

    body.innerHTML = html;

    // ═══ 이벤트 바인딩 ═══
    document.querySelectorAll('.ks-preset').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var preset = btn.dataset.preset;
        if (preset === 'custom') {
          currentPreset = 'custom';
          document.getElementById('ksCustomRange').style.display = 'flex';
          document.querySelectorAll('.ks-preset').forEach(function(b) {
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

    var applyBtn = document.getElementById('ksApplyCustom');
    if (applyBtn) {
      applyBtn.addEventListener('click', function() {
        currentFrom = document.getElementById('ksFrom').value || '';
        currentTo = document.getElementById('ksTo').value || '';
        currentPeriod = document.getElementById('ksPeriod').value || 'daily';
        currentPreset = 'custom';
        loadStats();
      });
    }
  }

  await loadStats();
}

/* ══════════════════════════════════════
   🏆 병원 벤치마킹 대시보드
   ══════════════════════════════════════ */
async function renderBenchmark(body, actions) {
  var now = new Date();
  var currentMonth = now.toISOString().slice(0, 7);

  actions.innerHTML = '';
  body.innerHTML = '';

  await PFM.withErrorBoundary(body, async function() {
    var data = await api('/api/protected/kpi/benchmark?month=' + currentMonth);
    renderBenchmarkContent(body, data, currentMonth);
  }, 'dashboard');
}

function renderBenchmarkContent(body, data, month) {
  var ind = data.indicators || [];
  var goodCount = ind.filter(function(i) { return i.isGood; }).length;
  var totalCount = ind.length;
  var score = totalCount > 0 ? Math.round(goodCount / totalCount * 100) : 0;
  var grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  var gradeColor = score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
  var gradeEmoji = score >= 80 ? '🏆' : score >= 60 ? '👍' : score >= 40 ? '📈' : '💪';

  body.innerHTML = '<div class="card-lg mb-20">' +
    '<div class="flex-between mb-16">' +
      '<div>' +
        '<div class="text-2xl font-800">🏆 병원 벤치마킹</div>' +
        '<div class="mod-muted-sm mt-4">전체 ' + data.hospitalCount + '개 병원 대비 성과 비교 · ' + month + '</div>' +
      '</div>' +
      '<div class="text-center">' +
        '<div style="width:80px;height:80px;border-radius:50%;background:' + gradeColor + '15;display:flex;align-items:center;justify-content:center;margin:0 auto">' +
          '<span style="font-size:32px;font-weight:900;color:' + gradeColor + '">' + grade + '</span>' +
        '</div>' +
        '<div class="mod-muted-sm mt-4">종합 등급</div>' +
      '</div>' +
    '</div>' +
    '<div class="flex gap-16" style="flex-wrap:wrap">' +
      buildBenchSummary('📊', '종합 점수', score + '점', '상위 ' + data.percentile + '%', gradeColor) +
      buildBenchSummary('✅', '우수 항목', goodCount + '개', '/' + totalCount + '개 중', '#22c55e') +
      buildBenchSummary('📅', '기록일', data.daysRecorded + '일', month, '#3b82f6') +
      buildBenchSummary(gradeEmoji, '전체 순위', '상위 ' + data.percentile + '%', data.hospitalCount + '개 병원 중', gradeColor) +
    '</div>' +
  '</div>' +

  '<div class="card-lg mb-20">' +
    '<div class="mod-title">📊 항목별 비교</div>' +
    '<div style="display:grid;gap:12px">' +
      ind.map(function(item) {
        return buildBenchItem(item);
      }).join('') +
    '</div>' +
  '</div>' +

  '<div class="card-lg">' +
    '<div class="mod-title">💡 개선 포인트</div>' +
    '<div style="display:grid;gap:8px">' +
      ind.filter(function(i) { return !i.isGood; }).map(function(item) {
        var tips = {
          revenue: '매출 증대를 위해 핵심 진료 상담 전환율 개선, 신환 유입 채널 확대를 고려해보세요.',
          new_patients: '신환 유입을 위한 마케팅 채널 최적화, 소개 프로그램 강화가 필요합니다.',
          total_patients: '기존 환자 재방문율 개선을 위한 정기검진 알림 시스템을 활용해보세요.',
          conv_rate: '상담 스크립트 고도화, 비용 투명성 강화, 상담사 교육이 효과적입니다.',
          wait_time: '예약 시스템 최적화, 대기 환경 개선, 실시간 대기 안내를 도입해보세요.',
          cancel: '예약 리마인더 강화, 노쇼 패널티 정책, 대기 환자 자동 연결을 검토해보세요.',
          complaint: '환자 동선 개선, 직원 응대 교육, 불만 사전 감지 시스템이 도움됩니다.',
          referral: '소개 인센티브 프로그램 도입, 진료 만족도 개선에 집중해보세요.',
          reviews: '진료 후 리뷰 요청 시스템 도입, 네이버 플레이스 관리를 강화해보세요.',
        };
        return '<div class="funnel-action-item priority-high">' +
          '<div class="funnel-action-priority">📌</div>' +
          '<div class="funnel-action-body">' +
            '<div class="funnel-action-title-text">' + esc(item.label) + ' 개선 필요</div>' +
            '<div class="funnel-action-desc">' + esc(tips[item.key] || '데이터 분석을 통한 개선 포인트를 찾아보세요.') + '</div>' +
            '<div class="funnel-action-impact">현재: ' + fmtBenchVal(item.myValue, item.format) + ' / 평균: ' + fmtBenchVal(item.avgValue, item.format) + ' (차이: ' + item.diff + '%)</div>' +
          '</div>' +
        '</div>';
      }).join('') +
      (ind.every(function(i) { return i.isGood; }) ? '<div class="mod-empty">🏆 모든 항목이 평균 이상입니다! 훌륭합니다!</div>' : '') +
    '</div>' +
  '</div>';
}

function buildBenchSummary(icon, label, value, sub, color) {
  return '<div class="flex-1" style="min-width:140px;text-align:center;padding:16px;background:' + color + '08;border-radius:12px">' +
    '<div style="font-size:24px">' + icon + '</div>' +
    '<div class="mod-muted-sm mt-4">' + label + '</div>' +
    '<div style="font-size:20px;font-weight:800;color:' + color + ';margin-top:4px">' + value + '</div>' +
    '<div class="mod-muted-xs mt-4">' + sub + '</div>' +
  '</div>';
}

function buildBenchItem(item) {
  var myVal = fmtBenchVal(item.myValue, item.format);
  var avgVal = fmtBenchVal(item.avgValue, item.format);
  var diffColor = item.isGood ? '#22c55e' : '#ef4444';
  var diffIcon = item.isGood ? '✅' : '⚠️';
  var myPct = item.avgValue > 0 ? Math.min(100, Math.max(5, item.myValue / item.avgValue * 50)) : 50;
  var avgPct = 50;

  return '<div class="card" style="padding:14px 18px;border-left:4px solid ' + diffColor + '">' +
    '<div class="flex-between mb-8">' +
      '<div class="flex items-center gap-8">' +
        '<span>' + diffIcon + '</span>' +
        '<span class="font-700 text-lg">' + esc(item.label) + '</span>' +
      '</div>' +
      '<span class="pill" style="background:' + diffColor + '15;color:' + diffColor + '">' +
        (item.diff > 0 ? '+' : '') + item.diff + '%' +
      '</span>' +
    '</div>' +
    '<div class="flex gap-8 items-center">' +
      '<div style="flex:1">' +
        '<div class="flex-between mb-4">' +
          '<span class="mod-muted-xs">우리 병원</span>' +
          '<span class="text-md font-700" style="color:' + diffColor + '">' + myVal + '</span>' +
        '</div>' +
        '<div style="height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">' +
          '<div style="height:100%;width:' + myPct + '%;background:' + diffColor + ';border-radius:4px;transition:width .4s"></div>' +
        '</div>' +
      '</div>' +
      '<div style="width:1px;height:40px;background:var(--border)"></div>' +
      '<div style="flex:1">' +
        '<div class="flex-between mb-4">' +
          '<span class="mod-muted-xs">전체 평균</span>' +
          '<span class="text-md font-700 text-secondary">' + avgVal + '</span>' +
        '</div>' +
        '<div style="height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">' +
          '<div style="height:100%;width:' + avgPct + '%;background:var(--text-muted);border-radius:4px"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function fmtBenchVal(val, format) {
  if (val == null) return '-';
  switch (format) {
    case 'money':
      if (val >= 100000000) return (val / 100000000).toFixed(1) + '억';
      if (val >= 10000) return Math.round(val / 10000).toLocaleString() + '만원';
      return val.toLocaleString() + '원';
    case 'percent': return val + '%';
    case 'minutes': return val + '분';
    default: return Number(val).toLocaleString();
  }
}

// ═══ 모듈 등록 ═══
PFM.modules.kpiStats = { renderKpiStats: renderKpiStats, renderBenchmark: renderBenchmark };

})(window.PFM);
