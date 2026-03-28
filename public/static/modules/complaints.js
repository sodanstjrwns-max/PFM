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

function bar(label, value, max, color) {
  var w = max > 0 ? Math.max(Math.round(value / max * 100), 3) : 3;
  return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px">' +
    '<span style="min-width:100px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(label) + '</span>' +
    '<div style="flex:1;background:var(--bg);border-radius:4px;height:22px;overflow:hidden">' +
      '<div style="height:100%;background:' + color + ';border-radius:4px;width:' + w + '%;transition:width 0.3s"></div>' +
    '</div>' +
    '<span style="min-width:40px;text-align:right;font-weight:700">' + fmt(value) + '</span>' +
  '</div>';
}

// ═══ 컴플레인 기록 목록 ═══
async function renderComplaints(body, actions) {
  var currentPage = 1, filterPart = '', filterFrom = '', filterTo = '', searchQ = '';

  // 현재 월 기본값
  var now = new Date();
  filterFrom = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
  filterTo = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0');

  actions.innerHTML = '<button class="btn btn-primary" id="addComplaint"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> 기록 추가</button>';
  document.getElementById('addComplaint').onclick = function() { showComplaintForm(); };

  async function loadList() {
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    var params = new URLSearchParams({ page: currentPage, limit: 50 });
    if (filterPart) params.set('part', filterPart);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    if (searchQ) params.set('search', searchQ);
    var data = await api('/api/protected/complaints?' + params);
    renderList(data);
  }

  function renderList(data) {
    var html = '';
    // 필터 바
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px">';
    html += '<input type="date" id="cmpFrom" value="'+esc(filterFrom)+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<span style="color:var(--text-muted)">~</span>';
    html += '<input type="date" id="cmpTo" value="'+esc(filterTo)+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<select id="cmpPart" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)"><option value="">전체 파트</option>';
    Object.keys(PARTS).forEach(function(k) { html += '<option value="'+k+'"'+(filterPart===k?' selected':'')+'>'+PARTS[k]+'</option>'; });
    html += '</select>';
    html += '<input type="text" id="cmpSearch" value="'+esc(searchQ)+'" placeholder="검색 (환자명, 내용...)" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card);min-width:160px">';
    html += '<button class="btn btn-primary btn-sm" id="cmpApply" style="border-radius:8px">조회</button>';
    html += '</div>';

    // 요약
    html += '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">총 <strong style="color:var(--primary)">'+fmt(data.total)+'</strong>건</div>';

    // 목록
    if (data.data && data.data.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:10px">';
      data.data.forEach(function(c) {
        var partLabel = PARTS[c.part] || c.part;
        var partColor = PART_COLORS[c.part] || '#94a3b8';
        var partIcon = PART_ICONS[c.part] || '📋';
        var statusLabel = STATUSES[c.status] || c.status;
        var statusColor = STATUS_COLORS[c.status] || '#94a3b8';
        var sevLabel = SEVERITIES[c.severity] || c.severity;
        var sevColor = SEV_COLORS[c.severity] || '#3b82f6';

        html += '<div class="cmp-card" data-id="'+esc(c.id)+'" style="'+cardS()+';cursor:pointer;transition:all 0.2s" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.08)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">';
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">';
        html += '<div style="flex:1">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
        html += '<span style="font-size:16px">'+partIcon+'</span>';
        html += badge(partLabel, partColor);
        html += '<span style="font-size:11px;color:var(--text-muted)">'+esc(c.category||'')+'</span>';
        html += badge(statusLabel, statusColor);
        if (c.severity !== 'normal') html += badge(sevLabel, sevColor);
        html += '</div>';
        html += '<div style="font-size:13px;font-weight:700;margin-bottom:4px">';
        if (c.patient_name) html += esc(c.patient_name) + ' · ';
        html += '<span style="color:var(--text-muted);font-weight:400">'+esc(c.complaint_date)+'</span>';
        html += '</div>';
        if (c.description) html += '<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+esc(c.description)+'</div>';
        html += '</div>';
        html += '<div style="text-align:right;min-width:60px;font-size:11px;color:var(--text-muted)">';
        if (c.responder) html += '<div>응대: <strong>'+esc(c.responder)+'</strong></div>';
        if (c.resolver) html += '<div>해결: <strong>'+esc(c.resolver)+'</strong></div>';
        html += '</div>';
        html += '</div></div>';
      });
      html += '</div>';

      // 페이징
      var totalPages = Math.ceil(data.total / data.limit);
      if (totalPages > 1) {
        html += '<div style="display:flex;justify-content:center;gap:8px;margin-top:16px">';
        for (var p = 1; p <= totalPages && p <= 10; p++) {
          html += '<button class="btn btn-sm cmp-page" data-page="'+p+'" style="border-radius:8px;min-width:36px;'+(p===currentPage?'background:var(--primary);color:#fff;font-weight:700;':'')+'">'+p+'</button>';
        }
        html += '</div>';
      }
    } else {
      html += '<div style="text-align:center;padding:40px;color:var(--text-muted)">조건에 맞는 컴플레인 기록이 없습니다</div>';
    }

    body.innerHTML = html;

    // 이벤트 바인딩
    document.getElementById('cmpApply').onclick = function() {
      filterFrom = document.getElementById('cmpFrom').value;
      filterTo = document.getElementById('cmpTo').value;
      filterPart = document.getElementById('cmpPart').value;
      searchQ = document.getElementById('cmpSearch').value;
      currentPage = 1;
      loadList();
    };
    document.querySelectorAll('.cmp-card').forEach(function(el) {
      el.onclick = function() { showComplaintForm(el.dataset.id); };
    });
    document.querySelectorAll('.cmp-page').forEach(function(el) {
      el.onclick = function() { currentPage = parseInt(el.dataset.page); loadList(); };
    });
  }

  // ═══ 컴플레인 등록/수정 폼 ═══
  async function showComplaintForm(id) {
    var record = null;
    if (id) {
      // 기존 레코드 로드 (목록에서 찾기)
      var params = new URLSearchParams({ page: 1, limit: 1, search: id });
      // 직접 목록에서 가져오기
      var listData = await api('/api/protected/complaints?limit=999&from='+filterFrom+'&to='+filterTo);
      record = listData.data.find(function(c) { return c.id === id; });
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
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">📅 발생일 *</label>';
    html += '<input type="date" name="complaint_date" value="'+esc(record?record.complaint_date:today)+'" required style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">👤 환자 성함</label>';
    html += '<input type="text" name="patient_name" value="'+esc(record?record.patient_name:'')+'" placeholder="환자명" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '</div>';

    // 파트 + 세부분류
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">📍 파트 *</label>';
    html += '<select name="part" required style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"><option value="">선택</option>';
    Object.keys(PARTS).forEach(function(k) { html += '<option value="'+k+'"'+((record&&record.part===k)?' selected':'')+'>'+PART_ICONS[k]+' '+PARTS[k]+'</option>'; });
    html += '</select></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">🏷️ 세부분류</label>';
    html += '<select name="category" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"><option value="">선택</option>';
    CATEGORIES.forEach(function(cat) { html += '<option value="'+esc(cat)+'"'+((record&&record.category===cat)?' selected':'')+'>'+esc(cat)+'</option>'; });
    html += '</select></div>';
    html += '</div>';

    // 응대자 + 해결자
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">👤 응대자</label>';
    html += '<input type="text" name="responder" value="'+esc(record?record.responder:'')+'" placeholder="최초 접수 직원" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">🛠️ 해결자</label>';
    html += '<input type="text" name="resolver" value="'+esc(record?record.resolver:'')+'" placeholder="해결한 직원" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '</div>';

    // 상태 + 심각도
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">📊 상태</label>';
    html += '<select name="status" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)">';
    Object.keys(STATUSES).forEach(function(k) { html += '<option value="'+k+'"'+((record&&record.status===k)?' selected':'')+'>'+STATUSES[k]+'</option>'; });
    html += '</select></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">🔥 심각도</label>';
    html += '<select name="severity" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)">';
    Object.keys(SEVERITIES).forEach(function(k) { html += '<option value="'+k+'"'+((record&&record.severity===k)?' selected':(k==='normal'&&!record?' selected':''))+'>'+SEVERITIES[k]+'</option>'; });
    html += '</select></div>';
    html += '</div>';

    // 내용 정리
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">📝 내용 정리</label>';
    html += '<textarea name="description" rows="3" placeholder="컴플레인 상세 내용" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card);resize:vertical">'+esc(record?record.description:'')+'</textarea></div>';

    // 해결 내용
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">✅ 해결 내용</label>';
    html += '<textarea name="resolution" rows="3" placeholder="어떻게 해결했는지" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card);resize:vertical">'+esc(record?record.resolution:'')+'</textarea></div>';

    // 버튼
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">';
    if (isEdit) html += '<button type="button" class="btn" id="cmpDelete" style="border-radius:8px;color:#ef4444">🗑 삭제</button>';
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
          await api('/api/protected/complaints/'+id, { method: 'PUT', body: JSON.stringify(obj) });
          PFM.showToast('수정 완료', 'success');
        } else {
          await api('/api/protected/complaints', { method: 'POST', body: JSON.stringify(obj) });
          PFM.showToast('등록 완료', 'success');
        }
        loadList();
      } catch(err) { PFM.showToast('저장 실패', 'error'); }
    };
    if (isEdit) {
      document.getElementById('cmpDelete').onclick = async function() {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await api('/api/protected/complaints/'+id, { method: 'DELETE' });
        PFM.showToast('삭제 완료', 'success');
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

  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';

  async function loadStats() {
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    var params = new URLSearchParams();
    if (currentFrom) params.set('from', currentFrom);
    if (currentTo) params.set('to', currentTo);
    var data = await api('/api/protected/complaints/stats?' + params);
    renderDashboard(data);
  }

  function renderDashboard(data) {
    var html = '';

    // 제목 + 기간 프리셋
    html += '<div style="margin-bottom:20px">';
    html += '<h3 style="margin:0 0 16px;font-size:20px;font-weight:900">⚠️ 컴플레인 통계</h3>';
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
    html += '<span style="color:var(--text-muted)">~</span>';
    html += '<input type="date" id="csTo" value="'+currentTo+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="csApply" style="border-radius:8px">조회</button>';
    html += '</div>';
    html += '</div>';

    // ═══ 총건수 카드 ═══
    html += '<div style="'+cardS()+';text-align:center;background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b40">';
    html += '<div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px">⚠️ 총 컴플레인</div>';
    html += '<div style="font-size:48px;font-weight:900;color:#d97706">'+fmt(data.total)+'<span style="font-size:18px;font-weight:400">건</span></div>';
    html += '</div>';

    // ═══ 파트별 분포 ═══
    if (data.byPart && data.byPart.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 style="margin:0 0 14px;font-size:14px;font-weight:800">📍 파트별 분포</h4>';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">';
      data.byPart.forEach(function(item) {
        var label = PARTS[item.part] || item.part;
        var icon = PART_ICONS[item.part] || '📋';
        var color = PART_COLORS[item.part] || '#94a3b8';
        var pct = data.total > 0 ? Math.round(item.c / data.total * 100) : 0;
        html += '<div style="background:var(--bg);border-radius:10px;padding:14px;text-align:center;border-left:3px solid '+color+'">';
        html += '<div style="font-size:22px;margin-bottom:4px">'+icon+'</div>';
        html += '<div style="font-size:10px;color:var(--text-muted);font-weight:600">'+esc(label)+'</div>';
        html += '<div style="font-size:24px;font-weight:900;color:'+color+'">'+item.c+'</div>';
        html += '<div style="font-size:10px;color:var(--text-muted)">'+pct+'%</div>';
        html += '</div>';
      });
      html += '</div>';

      // 바차트
      var maxPart = Math.max.apply(null, data.byPart.map(function(i){ return i.c; }));
      data.byPart.forEach(function(item) {
        var label = (PART_ICONS[item.part]||'')+' '+(PARTS[item.part]||item.part);
        html += bar(label, item.c, maxPart, PART_COLORS[item.part]||'#94a3b8');
      });
      html += '</div>';
    }

    // ═══ 세부분류별 ═══
    if (data.byCategory && data.byCategory.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 style="margin:0 0 14px;font-size:14px;font-weight:800">🏷️ 세부분류별</h4>';
      var maxCat = Math.max.apply(null, data.byCategory.map(function(i){ return i.c; }));
      data.byCategory.forEach(function(item) {
        var catColor = '#3b82f6';
        if (item.category.startsWith('데)')) catColor = PART_COLORS.desk;
        else if (item.category.startsWith('진)')) catColor = PART_COLORS.clinic;
        else if (item.category.startsWith('상)')) catColor = PART_COLORS.consult;
        else if (item.category.startsWith('전)')) catColor = PART_COLORS.phone;
        html += bar(item.category, item.c, maxCat, catColor);
      });
      html += '</div>';
    }

    // ═══ 요일별 분포 ═══
    if (data.byDayOfWeek && data.byDayOfWeek.length > 0) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 style="margin:0 0 14px;font-size:14px;font-weight:800">📅 요일별 분포</h4>';
      var dowMap = {};
      data.byDayOfWeek.forEach(function(d) { dowMap[d.dow] = d.c; });
      var maxDow = Math.max.apply(null, data.byDayOfWeek.map(function(i){ return i.c; }));
      var DAY_COLORS = { mon:'#3b82f6', tue:'#22c55e', wed:'#f59e0b', thu:'#8b5cf6', fri:'#ec4899', sat:'#06b6d4', sun:'#ef4444' };
      DAY_ORDER.forEach(function(d) {
        if (dowMap[d]) html += bar(DAY_LABELS[d], dowMap[d], maxDow, DAY_COLORS[d]);
      });
      html += '</div>';
    }

    // ═══ 월별 트렌드 ═══
    if (data.monthlyTrend && data.monthlyTrend.length > 1) {
      html += '<div style="'+cardS()+'">';
      html += '<h4 style="margin:0 0 14px;font-size:14px;font-weight:800">📈 월별 추이</h4>';
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

    // ═══ 응대자 TOP 10 ═══
    if (data.byResponder && data.byResponder.length > 0) {
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
      html += '<div style="'+cardS()+'">';
      html += '<h4 style="margin:0 0 14px;font-size:14px;font-weight:800">👤 응대자 TOP</h4>';
      var maxResp = data.byResponder[0].c;
      data.byResponder.slice(0,10).forEach(function(item) {
        html += bar(item.responder, item.c, maxResp, '#3b82f6');
      });
      html += '</div>';

      // ═══ 해결자 TOP 10 ═══
      html += '<div style="'+cardS()+'">';
      html += '<h4 style="margin:0 0 14px;font-size:14px;font-weight:800">🛠️ 해결자 TOP</h4>';
      if (data.byResolver && data.byResolver.length > 0) {
        var maxRes = data.byResolver[0].c;
        data.byResolver.slice(0,10).forEach(function(item) {
          html += bar(item.resolver, item.c, maxRes, '#22c55e');
        });
      } else {
        html += '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">데이터 없음</div>';
      }
      html += '</div></div>';
    }

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
          var lm = m === 0 ? 11 : m-1; var ly = m === 0 ? y-1 : y;
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

    var applyBtn = document.getElementById('csApply');
    if (applyBtn) {
      applyBtn.onclick = function() {
        currentFrom = document.getElementById('csFrom').value;
        currentTo = document.getElementById('csTo').value;
        currentPreset = 'custom';
        loadStats();
      };
    }
  }

  await loadStats();
}

// ═══ 모듈 등록 ═══
PFM.modules.complaints = { renderComplaints: renderComplaints, renderComplaintsStats: renderComplaintsStats };

})(window.PFM);
