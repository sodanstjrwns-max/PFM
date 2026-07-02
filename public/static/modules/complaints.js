/* ═══ Module: 컴플레인 기록 & 통계 (Complaint Records & Stats) ═══ */
(function(PFM) {
'use strict';
var api = PFM.api, esc = PFM.esc;

// ═══ 상수 ═══
var PARTS = { desk:'데스크', clinic:'진료실', consult:'상담실', phone:'전화', etc:'기타' };
var PART_COLORS = { desk:'#3b82f6', clinic:'#8b5cf6', consult:'#f59e0b', phone:'#06b6d4', etc:'#94a3b8' };
var PART_ICONS = { desk:'🖥️', clinic:'🏥', consult:'💬', phone:'📞', etc:'📋' };
var SEVERITIES = { low:'경미', normal:'보통', high:'심각', critical:'매우심각' };
var SEV_COLORS = { low:'#22c55e', normal:'#3b82f6', high:'#f59e0b', critical:'#ef4444' };
var STATUSES = { open:'미해결', resolved:'해결', escalated:'에스컬레이션' };
var STATUS_COLORS = { open:'#ef4444', resolved:'#22c55e', escalated:'#f59e0b' };
var CATEGORIES = [
  '데)수납 관련','데)예약 관련','데)대기 시간','데)응대 관련','데)기타',
  '진)통증 관련','진)보철 관련','진)안내 미흡','진)기타',
  '상)가격 관련','상)기타',
  '전)응대 관련','전)기타',
  '기타'
];
var DAY_LABELS = { mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일' };
var DAY_ORDER = ['mon','tue','wed','thu','fri','sat','sun'];

function fmt(n) { return n != null ? Number(n).toLocaleString() : '-'; }
function badge(text, bg) { return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+bg+'20;color:'+bg+'">'+esc(text)+'</span>'; }
function cardS() { return 'background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px'; }
function barH(label, value, max, color) {
  var w = max > 0 ? Math.max(Math.round(value / max * 100), 3) : 3;
  return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px">' +
    '<span style="min-width:100px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(label) + '</span>' +
    '<div style="flex:1;background:var(--bg);border-radius:4px;height:22px;overflow:hidden">' +
      '<div style="height:100%;background:' + color + ';border-radius:4px;width:' + w + '%;transition:width 0.3s"></div>' +
    '</div>' +
    '<span style="min-width:40px;text-align:right;font-weight:700">' + fmt(value) + '</span>' +
  '</div>';
}
function fmtDate(d) { if (!d) return '-'; return d.length >= 10 ? d.slice(5,7)+'/'+d.slice(8,10) : d; }
function filterLabel(key, val) {
  if (key === 'search') return '검색: "'+esc(val)+'"';
  if (key === 'part') return PARTS[val] || val;
  if (key === 'status') return STATUSES[val] || val;
  if (key === 'severity') return SEVERITIES[val] || val;
  if (key === 'category') return val;
  return val;
}

// ═══ 컴플레인 기록 목록 (테이블 형식) ═══
async function renderComplaints(body, actions) {
  var filters = { search:'', part:'', status:'', severity:'', category:'', from:'', to:'' };
  var sortKey = 'complaint_date', sortDir = -1;
  var currentPage = 1, pageSize = 50;
  var allData = [];
  var showFilterPanel = false;

  actions.innerHTML = '<button class="btn btn-primary" id="addComplaint"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> 기록 추가</button>';
  document.getElementById('addComplaint').onclick = function() { showComplaintForm(null); };
  // 빈 상태 액션 버튼 위임 (테이블이 비어있을 때만 표시)
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'emptyAddComplaintBtn') showComplaintForm(null);
  });

  async function loadList() {
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    var params = new URLSearchParams({ page: 1, limit: 9999 });
    if (filters.part) params.set('part', filters.part);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.search) params.set('search', filters.search);
    var data = await api('/api/protected/complaints?' + params);
    allData = data.data || [];
    renderTable();
  }

  function renderSortTh(key, label) {
    var arrow = sortKey === key ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
    return '<th class="cmp-sort" data-sort="'+key+'" style="padding:10px 8px;text-align:left;cursor:pointer;user-select:none;white-space:nowrap;font-weight:700;font-size:11px;color:var(--text-muted)">'+label+arrow+'</th>';
  }

  function renderTable() {
    // 클라이언트 필터링 (카테고리, 심각도)
    var filtered = allData.slice();
    if (filters.category) filtered = filtered.filter(function(c) { return c.category === filters.category; });
    if (filters.severity) filtered = filtered.filter(function(c) { return c.severity === filters.severity; });

    // 정렬
    filtered.sort(function(a, b) {
      var va = a[sortKey] || '', vb = b[sortKey] || '';
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });

    // 페이징
    var totalPages = Math.ceil(filtered.length / pageSize);
    var start = (currentPage - 1) * pageSize;
    var pageData = filtered.slice(start, start + pageSize);

    // 활성 필터 계산 (from/to 제외)
    var activeFilters = [];
    Object.keys(filters).forEach(function(k) {
      if (filters[k] && k !== 'from' && k !== 'to') activeFilters.push([k, filters[k]]);
    });

    var html = '';

    // ═══ 검색 + 필터 바 (환자 DB 스타일) ═══
    html += '<div class="mb-16">';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">';
    // 검색바
    html += '<div style="flex:1;min-width:200px;position:relative">';
    html += '<input type="text" id="cmpSearch" placeholder="검색 (환자명, 내용, 응대자, 해결자...)" value="'+esc(filters.search)+'" style="width:100%;padding:10px 12px 10px 36px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg-card)">';
    html += '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:0.4;font-size:14px">🔍</span>';
    html += '</div>';
    // 필터 토글 버튼
    html += '<button class="btn btn-sm" id="cmpFilterToggle" style="white-space:nowrap">';
    html += '🎛️ 필터 ';
    if (activeFilters.length > 0) html += '<span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">'+activeFilters.length+'</span>';
    html += '</button>';
    // 기간 선택
    html += '<input type="date" id="cmpFrom" value="'+esc(filters.from)+'" class="input-sm">';
    html += '<span style="color:var(--text-muted);font-size:12px">~</span>';
    html += '<input type="date" id="cmpTo" value="'+esc(filters.to)+'" class="input-sm">';
    html += '<button class="btn btn-primary btn-sm" id="cmpApply" style="border-radius:8px">조회</button>';
    html += '</div>';

    // ═══ 필터 패널 (접이식) ═══
    html += '<div id="cmpFilterPanel" style="display:'+(showFilterPanel?'block':'none')+';background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">';
    // 파트 필터
    html += '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">📍 파트</label>';
    html += '<select id="cmpFilterPart" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px"><option value="">전체</option>';
    Object.keys(PARTS).forEach(function(k) { html += '<option value="'+k+'"'+(filters.part===k?' selected':'')+'>'+PART_ICONS[k]+' '+PARTS[k]+'</option>'; });
    html += '</select></div>';
    // 세부분류 필터
    html += '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">🏷️ 세부분류</label>';
    html += '<select id="cmpFilterCategory" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px"><option value="">전체</option>';
    CATEGORIES.forEach(function(cat) { html += '<option value="'+esc(cat)+'"'+(filters.category===cat?' selected':'')+'>'+esc(cat)+'</option>'; });
    html += '</select></div>';
    // 상태 필터
    html += '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">📊 상태</label>';
    html += '<select id="cmpFilterStatus" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px"><option value="">전체</option>';
    Object.keys(STATUSES).forEach(function(k) { html += '<option value="'+k+'"'+(filters.status===k?' selected':'')+'>'+STATUSES[k]+'</option>'; });
    html += '</select></div>';
    // 심각도 필터
    html += '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:4px">🔥 심각도</label>';
    html += '<select id="cmpFilterSeverity" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:8px;font-size:12px"><option value="">전체</option>';
    Object.keys(SEVERITIES).forEach(function(k) { html += '<option value="'+k+'"'+(filters.severity===k?' selected':'')+'>'+SEVERITIES[k]+'</option>'; });
    html += '</select></div>';
    html += '</div>';
    // 필터 버튼
    html += '<div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">';
    html += '<button class="btn btn-sm" id="cmpFilterClear">초기화</button>';
    html += '<button class="btn btn-primary btn-sm" id="cmpFilterApply">적용</button>';
    html += '</div>';
    html += '</div>';

    // ═══ 활성 필터 칩 ═══
    if (activeFilters.length > 0) {
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
      activeFilters.forEach(function(pair) {
        html += '<span class="cmp-filter-chip" data-clear="'+pair[0]+'" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:11px;background:var(--primary-light,#eff6ff);color:var(--primary);cursor:pointer">';
        html += filterLabel(pair[0], pair[1]) + ' <span style="font-weight:700">&times;</span>';
        html += '</span>';
      });
      html += '</div>';
    }

    // ═══ 요약 바 ═══
    html += '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px">';
    html += '<span>총 <strong style="color:var(--text)">'+fmt(filtered.length)+'</strong>건';
    if (filtered.length !== allData.length) html += ' <span style="opacity:0.6">(전체 '+fmt(allData.length)+'건 중)</span>';
    html += '</span>';
    html += '<span>페이지 '+currentPage+'/'+Math.max(totalPages,1)+'</span>';
    html += '</div>';
    html += '</div>';

    // ═══ 테이블 ═══
    html += '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px">';
    html += '<thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">';
    html += renderSortTh('complaint_date', '날짜');
    html += renderSortTh('patient_name', '환자명');
    html += renderSortTh('part', '파트');
    html += renderSortTh('category', '세부분류');
    html += '<th class="tbl-header">내용</th>';
    html += renderSortTh('responder', '응대자');
    html += renderSortTh('resolver', '해결자');
    html += '<th class="tbl-header">해결 내용</th>';
    html += renderSortTh('status', '상태');
    html += renderSortTh('severity', '심각도');
    html += '</tr></thead>';

    html += '<tbody>';
    if (pageData.length === 0) {
      html += '<tr><td colspan="10" style="padding:0">' + emptyState({ icon:'⚠️', title:'컴플레인 기록이 없습니다', description:'좋은 신호이지만, 발생한 컴플레인은 반드시 기록하세요. 같은 실수가 반복되지 않도록 모든 컴플레인은 분석되어 KPI에 반영됩니다.', actionLabel:'+ 컴플레인 등록', actionId:'emptyAddComplaintBtn' }) + '</td></tr>';
    }
    pageData.forEach(function(c) {
      var partLabel = PARTS[c.part] || c.part || '-';
      var partColor = PART_COLORS[c.part] || '#94a3b8';
      var partIcon = PART_ICONS[c.part] || '';
      var statusLabel = STATUSES[c.status] || c.status || '-';
      var statusColor = STATUS_COLORS[c.status] || '#94a3b8';
      var sevLabel = SEVERITIES[c.severity] || c.severity || '-';
      var sevColor = SEV_COLORS[c.severity] || '#3b82f6';
      var desc = c.description || '-';
      if (desc.length > 50) desc = desc.substring(0, 50) + '...';
      var resol = c.resolution || '-';
      if (resol.length > 40) resol = resol.substring(0, 40) + '...';

      html += '<tr class="cmp-row" data-id="'+esc(c.id)+'" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s" data-act-over="this.style.background=\'var(--bg-hover)\'" data-act-out="this.style.background=\'\'">';
      html += '<td style="padding:10px 12px;font-size:11px;color:var(--text-muted);white-space:nowrap">'+esc(c.complaint_date||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-weight:700">'+esc(c.patient_name||'-')+'</td>';
      html += '<td style="padding:10px 8px"><span style="background:'+partColor+'15;color:'+partColor+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">'+partIcon+' '+esc(partLabel)+'</span></td>';
      html += '<td style="padding:10px 8px;font-size:11px">'+esc(c.category||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px;color:var(--text-secondary);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(c.description||'')+'">'+esc(desc)+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px">'+esc(c.responder||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px">'+esc(c.resolver||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(c.resolution||'')+'">'+esc(resol)+'</td>';
      html += '<td style="padding:10px 8px">'+badge(statusLabel, statusColor)+'</td>';
      html += '<td style="padding:10px 8px">';
      if (c.severity === 'critical') html += badge(sevLabel, sevColor);
      else if (c.severity === 'high') html += badge(sevLabel, sevColor);
      else if (c.severity === 'low') html += '<span style="font-size:10px;color:#22c55e">'+esc(sevLabel)+'</span>';
      else html += '<span class="mod-muted-xs">'+esc(sevLabel)+'</span>';
      html += '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    // ═══ 페이지네이션 ═══
    if (totalPages > 1) {
      html += '<div style="display:flex;justify-content:center;gap:4px;margin-top:16px;flex-wrap:wrap">';
      html += '<button class="btn btn-sm cmp-page-nav" data-dir="prev" '+(currentPage<=1?'disabled':'')+' class="text-base">◀ 이전</button>';
      var startP = Math.max(1, Math.min(currentPage - 4, totalPages - 9));
      var endP = Math.min(totalPages, startP + 9);
      for (var p = startP; p <= endP; p++) {
        html += '<button class="btn btn-sm cmp-page-btn" data-page="'+p+'" style="font-size:12px;min-width:36px;'+(p===currentPage?'background:var(--primary);color:#fff;font-weight:700':'')+'">'+p+'</button>';
      }
      html += '<button class="btn btn-sm cmp-page-nav" data-dir="next" '+(currentPage>=totalPages?'disabled':'')+' class="text-base">다음 ▶</button>';
      html += '</div>';
    }

    body.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    // 필터 토글
    var toggleBtn = document.getElementById('cmpFilterToggle');
    if (toggleBtn) toggleBtn.onclick = function() {
      showFilterPanel = !showFilterPanel;
      var panel = document.getElementById('cmpFilterPanel');
      if (panel) panel.style.display = showFilterPanel ? 'block' : 'none';
    };

    // 조회 버튼
    var applyBtn = document.getElementById('cmpApply');
    if (applyBtn) applyBtn.onclick = function() {
      filters.search = document.getElementById('cmpSearch').value;
      filters.from = document.getElementById('cmpFrom').value;
      filters.to = document.getElementById('cmpTo').value;
      currentPage = 1;
      loadList();
    };

    // 검색 엔터키
    var searchEl = document.getElementById('cmpSearch');
    if (searchEl) searchEl.onkeydown = function(e) {
      if (e.key === 'Enter') {
        filters.search = searchEl.value;
        filters.from = document.getElementById('cmpFrom').value;
        filters.to = document.getElementById('cmpTo').value;
        currentPage = 1;
        loadList();
      }
    };

    // 필터 패널 적용 버튼
    var filterApply = document.getElementById('cmpFilterApply');
    if (filterApply) filterApply.onclick = function() {
      filters.part = document.getElementById('cmpFilterPart').value;
      filters.category = document.getElementById('cmpFilterCategory').value;
      filters.status = document.getElementById('cmpFilterStatus').value;
      filters.severity = document.getElementById('cmpFilterSeverity').value;
      filters.search = document.getElementById('cmpSearch').value;
      filters.from = document.getElementById('cmpFrom').value;
      filters.to = document.getElementById('cmpTo').value;
      currentPage = 1;
      loadList();
    };

    // 필터 초기화
    var filterClear = document.getElementById('cmpFilterClear');
    if (filterClear) filterClear.onclick = function() {
      filters = { search:'', part:'', status:'', severity:'', category:'', from:'', to:'' };
      currentPage = 1;
      loadList();
    };

    // 필터 칩 클릭 → 해당 필터 해제
    document.querySelectorAll('.cmp-filter-chip').forEach(function(chip) {
      chip.onclick = function() {
        var key = chip.dataset.clear;
        if (key) { filters[key] = ''; currentPage = 1; loadList(); }
      };
    });

    // 정렬 헤더
    document.querySelectorAll('.cmp-sort').forEach(function(th) {
      th.onclick = function() {
        var key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = -1; }
        renderTable();
      };
    });

    // 행 클릭 → 상세/수정
    document.querySelectorAll('.cmp-row').forEach(function(tr) {
      tr.onclick = function() { showComplaintForm(tr.dataset.id); };
    });

    // 페이지 버튼
    document.querySelectorAll('.cmp-page-btn').forEach(function(btn) {
      btn.onclick = function() { currentPage = parseInt(btn.dataset.page); renderTable(); };
    });
    document.querySelectorAll('.cmp-page-nav').forEach(function(btn) {
      btn.onclick = function() {
        var totalPages = Math.ceil(allData.length / pageSize);
        if (btn.dataset.dir === 'prev' && currentPage > 1) currentPage--;
        else if (btn.dataset.dir === 'next' && currentPage < totalPages) currentPage++;
        renderTable();
      };
    });
  }

  // ═══ 컴플레인 등록/수정 폼 ═══
  async function showComplaintForm(id) {
    var record = null;
    if (id) {
      record = allData.find(function(c) { return c.id === id; });
    }
    var isEdit = !!record;
    var today = new Date().toISOString().slice(0,10);

    var html = '<div style="max-width:640px;margin:0 auto">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">';
    html += '<h3 style="margin:0;font-size:18px;font-weight:900">'+(isEdit ? '⚠️ 컴플레인 수정' : '⚠️ 컴플레인 등록')+'</h3>';
    html += '<button class="btn btn-sm" id="cmpBack" style="border-radius:8px">← 목록</button>';
    html += '</div>';

    html += '<form id="cmpForm" style="display:flex;flex-direction:column;gap:14px">';
    
    // 날짜 + 환자명
    html += '<div class="grid-2">';
    html += '<div><label class="mod-label">발생일 *</label>';
    html += '<input type="date" name="complaint_date" value="'+esc(record?record.complaint_date:today)+'" required class="input-md"></div>';
    html += '<div><label class="mod-label">환자 성함</label>';
    html += '<input type="text" name="patient_name" value="'+esc(record?record.patient_name:'')+'" placeholder="환자명" class="input-md"></div>';
    html += '</div>';

    // 파트 + 세부분류
    html += '<div class="grid-2">';
    html += '<div><label class="mod-label">파트 *</label>';
    html += '<select name="part" required class="input-md"><option value="">선택</option>';
    Object.keys(PARTS).forEach(function(k) { html += '<option value="'+k+'"'+((record&&record.part===k)?' selected':'')+'>'+PART_ICONS[k]+' '+PARTS[k]+'</option>'; });
    html += '</select></div>';
    html += '<div><label class="mod-label">세부분류</label>';
    html += '<select name="category" class="input-md"><option value="">선택</option>';
    CATEGORIES.forEach(function(cat) { html += '<option value="'+esc(cat)+'"'+((record&&record.category===cat)?' selected':'')+'>'+esc(cat)+'</option>'; });
    html += '</select></div>';
    html += '</div>';

    // 응대자 + 해결자
    html += '<div class="grid-2">';
    html += '<div><label class="mod-label">응대자</label>';
    html += '<input type="text" name="responder" value="'+esc(record?record.responder:'')+'" placeholder="최초 접수 직원" class="input-md"></div>';
    html += '<div><label class="mod-label">해결자</label>';
    html += '<input type="text" name="resolver" value="'+esc(record?record.resolver:'')+'" placeholder="해결한 직원" class="input-md"></div>';
    html += '</div>';

    // 상태 + 심각도
    html += '<div class="grid-2">';
    html += '<div><label class="mod-label">상태</label>';
    html += '<select name="status" class="input-md">';
    Object.keys(STATUSES).forEach(function(k) { html += '<option value="'+k+'"'+((record&&record.status===k)?' selected':'')+'>'+STATUSES[k]+'</option>'; });
    html += '</select></div>';
    html += '<div><label class="mod-label">심각도</label>';
    html += '<select name="severity" class="input-md">';
    Object.keys(SEVERITIES).forEach(function(k) { html += '<option value="'+k+'"'+((record&&record.severity===k)?' selected':(k==='normal'&&!record?' selected':''))+'>'+SEVERITIES[k]+'</option>'; });
    html += '</select></div>';
    html += '</div>';

    // 내용 정리
    html += '<div><label class="mod-label">내용 정리</label>';
    html += '<textarea name="description" rows="3" placeholder="컴플레인 상세 내용" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card);resize:vertical">'+esc(record?record.description:'')+'</textarea></div>';

    // 해결 내용
    html += '<div><label class="mod-label">해결 내용</label>';
    html += '<textarea name="resolution" rows="3" placeholder="어떻게 해결했는지" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card);resize:vertical">'+esc(record?record.resolution:'')+'</textarea></div>';

    // 버튼
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">';
    if (isEdit) html += '<button type="button" class="btn" id="cmpDelete" style="border-radius:8px;color:#ef4444">삭제</button>';
    html += '<button type="submit" class="btn btn-primary" style="border-radius:8px;padding:10px 24px;font-weight:700">'+(isEdit?'수정':'등록')+'</button>';
    html += '</div>';
    html += '</form></div>';

    body.innerHTML = html;

    document.getElementById('cmpBack').onclick = function() { loadList(); };
    document.getElementById('cmpForm').onsubmit = async function(e) {
      e.preventDefault();
      var fd = new FormData(this);
      var obj = {};
      fd.forEach(function(v,k) { obj[k] = v; });
      try {
        if (isEdit) {
          await api('/api/protected/complaints/'+id, { method: 'PUT', json: obj });
          PFM.toast('수정 완료', 'success');
        } else {
          await api('/api/protected/complaints', { method: 'POST', json: obj });
          PFM.toast('등록 완료', 'success');
        }
        loadList();
      } catch(err) { PFM.toast('저장 실패', 'error'); }
    };
    if (isEdit) {
      document.getElementById('cmpDelete').onclick = async function() {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await api('/api/protected/complaints/'+id, { method: 'DELETE' });
        PFM.toast('삭제 완료', 'success');
        loadList();
      };
    }
  }

  await loadList();
}

// ═══ 컴플레인 통계 대시보드 ═══
async function renderComplaintsStats(body, actions) {
  actions.innerHTML = '';
  var now = new Date();
  var currentFrom = '', currentTo = '', currentPreset = 'all';

  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

  async function loadStats() {
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    var params = new URLSearchParams();
    if (currentFrom) params.set('from', currentFrom);
    if (currentTo) params.set('to', currentTo);
    var data = await api('/api/protected/complaints/stats?' + params);
    renderDashboard(data);
  }

  function renderDashboard(data) {
    var html = '';

    // 제목 + 기간 프리셋
    html += '<div class="mb-20">';
    html += '<h3 style="margin:0 0 16px;font-size:20px;font-weight:900">컴플레인 통계</h3>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">';
    var presets = [
      { id:'this_month', label:'이번 달' },
      { id:'last_month', label:'지난 달' },
      { id:'this_year', label:'올해' },
      { id:'last_year', label:'작년' },
      { id:'all', label:'전체' },
      { id:'custom', label:'직접 선택' },
    ];
    presets.forEach(function(p) {
      var active = currentPreset === p.id;
      html += '<button class="btn btn-sm cs-preset" data-preset="'+p.id+'" style="'+(active?'background:var(--primary);color:#fff;font-weight:700;':'')+'border-radius:20px;padding:6px 14px;font-size:12px">'+p.label+'</button>';
    });
    html += '</div>';

    // 커스텀
    html += '<div id="csCustom" style="display:'+(currentPreset==='custom'?'flex':'none')+';gap:8px;align-items:center;margin-bottom:12px">';
    html += '<input type="date" id="csFrom" value="'+currentFrom+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<span class="text-muted">~</span>';
    html += '<input type="date" id="csTo" value="'+currentTo+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="csApply" style="border-radius:8px">조회</button>';
    html += '</div>';
    html += '</div>';

    // ═══ 총건수 카드 ═══
    html += '<div style="'+cardS()+';text-align:center;background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b40">';
    html += '<div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px">총 컴플레인</div>';
    html += '<div style="font-size:48px;font-weight:900;color:#d97706">'+fmt(data.total)+'<span style="font-size:18px;font-weight:400">건</span></div>';
    html += '</div>';

    // ═══ 파트별 분포 ═══
    if (data.byPart && data.byPart.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 class="mod-title">파트별 분포</h4>';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">';
      data.byPart.forEach(function(item) {
        var label = PARTS[item.part] || item.part;
        var icon = PART_ICONS[item.part] || '';
        var color = PART_COLORS[item.part] || '#94a3b8';
        var pct = data.total > 0 ? Math.round(item.c / data.total * 100) : 0;
        html += '<div style="background:var(--bg);border-radius:10px;padding:14px;text-align:center;border-left:3px solid '+color+'">';
        html += '<div style="font-size:22px;margin-bottom:4px">'+icon+'</div>';
        html += '<div class="mod-muted-xs-bold">'+esc(label)+'</div>';
        html += '<div style="font-size:24px;font-weight:900;color:'+color+'">'+item.c+'</div>';
        html += '<div class="mod-muted-xs">'+pct+'%</div>';
        html += '</div>';
      });
      html += '</div>';
      var maxPart = Math.max.apply(null, data.byPart.map(function(i){ return i.c; }));
      data.byPart.forEach(function(item) {
        var label = (PART_ICONS[item.part]||'')+' '+(PARTS[item.part]||item.part);
        html += barH(label, item.c, maxPart, PART_COLORS[item.part]||'#94a3b8');
      });
      html += '</div>';
    }

    // ═══ 세부분류별 ═══
    if (data.byCategory && data.byCategory.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 class="mod-title">세부분류별</h4>';
      var maxCat = Math.max.apply(null, data.byCategory.map(function(i){ return i.c; }));
      data.byCategory.forEach(function(item) {
        var catColor = '#3b82f6';
        if (item.category.startsWith('데)')) catColor = PART_COLORS.desk;
        else if (item.category.startsWith('진)')) catColor = PART_COLORS.clinic;
        else if (item.category.startsWith('상)')) catColor = PART_COLORS.consult;
        else if (item.category.startsWith('전)')) catColor = PART_COLORS.phone;
        html += barH(item.category, item.c, maxCat, catColor);
      });
      html += '</div>';
    }

    // ═══ 요일별 ═══
    if (data.byDayOfWeek && data.byDayOfWeek.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 class="mod-title">요일별 분포</h4>';
      var dowMap = {};
      data.byDayOfWeek.forEach(function(d) { dowMap[d.dow] = d.c; });
      var maxDow = Math.max.apply(null, data.byDayOfWeek.map(function(i){ return i.c; }));
      var DC = { mon:'#3b82f6', tue:'#22c55e', wed:'#f59e0b', thu:'#8b5cf6', fri:'#ec4899', sat:'#06b6d4', sun:'#ef4444' };
      DAY_ORDER.forEach(function(d) {
        if (dowMap[d]) html += barH(DAY_LABELS[d], dowMap[d], maxDow, DC[d]);
      });
      html += '</div>';
    }

    // ═══ 월별 트렌드 ═══
    if (data.monthlyTrend && data.monthlyTrend.length > 1) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 class="mod-title">월별 추이</h4>';
      var maxMonth = Math.max.apply(null, data.monthlyTrend.map(function(m){ return m.c; }));
      html += '<div style="display:flex;gap:2px;align-items:flex-end;min-height:160px;padding-bottom:28px">';
      data.monthlyTrend.forEach(function(m) {
        var h = maxMonth > 0 ? Math.max(Math.round(m.c / maxMonth * 130), 5) : 5;
        var label = m.month.length >= 7 ? m.month.slice(2) : m.month;
        var color = m.c >= maxMonth * 0.8 ? '#ef4444' : m.c >= maxMonth * 0.5 ? '#f59e0b' : '#3b82f6';
        html += '<div style="flex:1;min-width:10px;display:flex;flex-direction:column;align-items:center;gap:2px">';
        html += '<span style="font-size:9px;font-weight:700;color:var(--text)">'+m.c+'</span>';
        html += '<div style="width:100%;max-width:36px;height:'+h+'px;background:'+color+';border-radius:3px 3px 0 0;opacity:0.85"></div>';
        html += '<span style="font-size:7px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">'+esc(label)+'</span>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // ═══ 응대자 / 해결자 TOP ═══
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    if (data.byResponder && data.byResponder.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 class="mod-title">응대자 TOP</h4>';
      var maxResp = data.byResponder[0].c;
      data.byResponder.slice(0,10).forEach(function(item) { html += barH(item.responder, item.c, maxResp, '#3b82f6'); });
      html += '</div>';
    }
    if (data.byResolver && data.byResolver.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 class="mod-title">해결자 TOP</h4>';
      var maxRes = data.byResolver[0].c;
      data.byResolver.slice(0,10).forEach(function(item) { html += barH(item.resolver, item.c, maxRes, '#22c55e'); });
      html += '</div>';
    }
    html += '</div>';

    body.innerHTML = html;

    // 이벤트
    document.querySelectorAll('.cs-preset').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var preset = btn.dataset.preset;
        var y = now.getFullYear(), m = now.getMonth();
        if (preset === 'this_month') {
          currentFrom = y+'-'+String(m+1).padStart(2,'0')+'-01';
          currentTo = y+'-'+String(m+1).padStart(2,'0')+'-'+String(new Date(y,m+1,0).getDate()).padStart(2,'0');
        } else if (preset === 'last_month') {
          var lm = m === 0 ? 11 : m-1, ly = m === 0 ? y-1 : y;
          currentFrom = ly+'-'+String(lm+1).padStart(2,'0')+'-01';
          currentTo = ly+'-'+String(lm+1).padStart(2,'0')+'-'+String(new Date(ly,lm+1,0).getDate()).padStart(2,'0');
        } else if (preset === 'this_year') {
          currentFrom = y+'-01-01'; currentTo = y+'-12-31';
        } else if (preset === 'last_year') {
          currentFrom = (y-1)+'-01-01'; currentTo = (y-1)+'-12-31';
        } else if (preset === 'all') {
          currentFrom = ''; currentTo = '';
        } else if (preset === 'custom') {
          currentPreset = 'custom';
          document.getElementById('csCustom').style.display = 'flex';
          document.querySelectorAll('.cs-preset').forEach(function(b) {
            b.style.background = b.dataset.preset==='custom'?'var(--primary)':'';
            b.style.color = b.dataset.preset==='custom'?'#fff':'';
            b.style.fontWeight = b.dataset.preset==='custom'?'700':'';
          });
          return;
        }
        currentPreset = preset;
        loadStats();
      });
    });
    var csApply = document.getElementById('csApply');
    if (csApply) csApply.onclick = function() {
      currentFrom = document.getElementById('csFrom').value;
      currentTo = document.getElementById('csTo').value;
      currentPreset = 'custom';
      loadStats();
    };
  }

  await loadStats();
}

// ═══ 모듈 등록 ═══
PFM.modules.complaints = { renderComplaints: renderComplaints, renderComplaintsStats: renderComplaintsStats };

})(window.PFM);
