/* ═══ Module: 예약 관리 (Reservation Management) ═══ */
(function(PFM) {
'use strict';
var api = PFM.api, esc = PFM.esc;

var DOW = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
var DOW_ORDER = ['mon','tue','wed','thu','fri','sat','sun'];
var DOW_COLORS = {mon:'#3b82f6',tue:'#22c55e',wed:'#f59e0b',thu:'#8b5cf6',fri:'#ec4899',sat:'#06b6d4',sun:'#ef4444'};
function fmt(n) { return n != null ? Number(n).toLocaleString() : '-'; }
function fmtDate(d) { return d ? d.slice(5,7)+'/'+d.slice(8,10) : '-'; }
function cardS() { return 'background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px'; }
function barH(label,val,max,color) {
  var w = max>0?Math.max(Math.round(val/max*100),3):3;
  return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px">'+
    '<span style="min-width:30px;font-weight:600">'+esc(label)+'</span>'+
    '<div style="flex:1;background:var(--bg);border-radius:4px;height:20px;overflow:hidden">'+
      '<div style="height:100%;background:'+color+';border-radius:4px;width:'+w+'%;transition:width .3s"></div>'+
    '</div><span style="min-width:50px;text-align:right;font-weight:700">'+fmt(val)+'</span></div>';
}
function getDow(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  return ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()] || '';
}

// ═══ 예약 기록 목록 ═══
async function renderReservations(body, actions) {
  var filters = {from:'',to:'',search:''};
  var sortKey = 'record_date', sortDir = -1;
  var currentPage = 1, pageSize = 50, allData = [];

  actions.innerHTML = '<button class="btn btn-primary" id="addRes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> 기록 추가</button>';
  document.getElementById('addRes').onclick = function() { showForm(null); };

  async function load() {
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    var p = new URLSearchParams();
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    if (filters.search) p.set('search', filters.search);
    var data = await api('/api/protected/reservations?' + p);
    allData = (data.data||[]).filter(function(r){return r.cancel_count>0||r.dentweb_cancel_count>0||r.fulfillment_rate>0;});
    renderTable();
  }

  function sortTh(key,label) {
    var arrow = sortKey===key?(sortDir===1?' ▲':' ▼'):'';
    return '<th class="res-sort" data-sort="'+key+'" style="padding:10px 8px;text-align:left;cursor:pointer;user-select:none;white-space:nowrap;font-weight:700;font-size:11px;color:var(--text-muted)">'+label+arrow+'</th>';
  }

  function renderTable() {
    var sorted = allData.slice().sort(function(a,b){
      var va=a[sortKey]||'',vb=b[sortKey]||'';
      if(va<vb)return -1*sortDir;if(va>vb)return 1*sortDir;return 0;
    });
    var totalPages = Math.ceil(sorted.length/pageSize);
    var start = (currentPage-1)*pageSize;
    var pg = sorted.slice(start, start+pageSize);

    var html = '<div style="margin-bottom:16px">';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">';
    html += '<input type="date" id="resFrom" value="'+esc(filters.from)+'" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<span style="color:var(--text-muted)">~</span>';
    html += '<input type="date" id="resTo" value="'+esc(filters.to)+'" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="resApply">조회</button>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px">';
    html += '<span>총 <strong style="color:var(--text)">'+fmt(allData.length)+'</strong>건</span>';
    html += '<span>페이지 '+currentPage+'/'+Math.max(totalPages,1)+'</span></div></div>';

    html += '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">';
    html += '<thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">';
    html += sortTh('record_date','날짜');
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">요일</th>';
    html += sortTh('cancel_count','예약 취소');
    html += sortTh('dentweb_cancel_count','덴트웹 취소');
    html += sortTh('fulfillment_rate','예약이행율');
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">메모</th>';
    html += '</tr></thead><tbody>';

    if (pg.length===0) html += '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text-muted)">기록이 없습니다</td></tr>';
    pg.forEach(function(r) {
      var dowLabel = DOW[r.day_of_week]||r.day_of_week||'-';
      var fulfillColor = r.fulfillment_rate>=75?'#22c55e':r.fulfillment_rate>=70?'#f59e0b':'#ef4444';
      html += '<tr class="res-row" data-id="'+esc(r.id)+'" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'\'">';
      html += '<td style="padding:10px 12px;font-size:11px;white-space:nowrap">'+esc(r.record_date||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px;font-weight:600">'+esc(dowLabel)+'</td>';
      html += '<td style="padding:10px 8px;text-align:center;font-weight:700;color:#ef4444">'+fmt(r.cancel_count)+'</td>';
      html += '<td style="padding:10px 8px;text-align:center;font-weight:700;color:#f59e0b">'+fmt(r.dentweb_cancel_count)+'</td>';
      html += '<td style="padding:10px 8px;text-align:center"><span style="font-weight:700;color:'+fulfillColor+'">'+Number(r.fulfillment_rate).toFixed(1)+'%</span></td>';
      html += '<td style="padding:10px 8px;font-size:11px;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.memo||'-')+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages>1) {
      html += '<div style="display:flex;justify-content:center;gap:4px;margin-top:16px">';
      html += '<button class="btn btn-sm res-pn" data-d="prev" '+(currentPage<=1?'disabled':'')+'>◀</button>';
      for(var p=Math.max(1,currentPage-4);p<=Math.min(totalPages,currentPage+5);p++)
        html += '<button class="btn btn-sm res-pg" data-p="'+p+'" style="min-width:36px;'+(p===currentPage?'background:var(--primary);color:#fff;font-weight:700':'')+'">'+p+'</button>';
      html += '<button class="btn btn-sm res-pn" data-d="next" '+(currentPage>=totalPages?'disabled':'')+'>▶</button></div>';
    }
    body.innerHTML = html;
    bindEv();
  }

  function bindEv() {
    var ab = document.getElementById('resApply');
    if(ab) ab.onclick = function(){ filters.from=document.getElementById('resFrom').value; filters.to=document.getElementById('resTo').value; currentPage=1; load(); };
    document.querySelectorAll('.res-sort').forEach(function(th){ th.onclick=function(){ var k=th.dataset.sort; if(sortKey===k) sortDir*=-1; else{sortKey=k;sortDir=-1;} renderTable(); }; });
    document.querySelectorAll('.res-row').forEach(function(tr){ tr.onclick=function(){ showForm(tr.dataset.id); }; });
    document.querySelectorAll('.res-pg').forEach(function(b){ b.onclick=function(){ currentPage=parseInt(b.dataset.p); renderTable(); }; });
    document.querySelectorAll('.res-pn').forEach(function(b){ b.onclick=function(){ if(b.dataset.d==='prev'&&currentPage>1)currentPage--; else if(b.dataset.d==='next')currentPage++; renderTable(); }; });
  }

  async function showForm(id) {
    var rec = id ? allData.find(function(r){return r.id===id;}) : null;
    var isEdit = !!rec;
    var today = new Date().toISOString().slice(0,10);
    var html = '<div style="max-width:500px;margin:0 auto">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0;font-size:18px;font-weight:900">'+(isEdit?'예약 기록 수정':'예약 기록 등록')+'</h3><button class="btn btn-sm" id="resBack">← 목록</button></div>';
    html += '<form id="resForm" style="display:flex;flex-direction:column;gap:14px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">날짜 *</label><input type="date" name="record_date" value="'+esc(rec?rec.record_date:today)+'" required style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">예약 취소</label><input type="number" name="cancel_count" value="'+(rec?rec.cancel_count:0)+'" min="0" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">덴트웹 취소</label><input type="number" name="dentweb_cancel_count" value="'+(rec?rec.dentweb_cancel_count:0)+'" min="0" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">이행율 (%)</label><input type="number" name="fulfillment_rate" value="'+(rec?rec.fulfillment_rate:0)+'" min="0" max="200" step="0.1" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '</div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">메모</label><input type="text" name="memo" value="'+esc(rec?rec.memo:'')+'" placeholder="메모" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">';
    if(isEdit) html += '<button type="button" class="btn" id="resDel" style="color:#ef4444">삭제</button>';
    html += '<button type="submit" class="btn btn-primary" style="padding:10px 24px;font-weight:700">'+(isEdit?'수정':'등록')+'</button></div>';
    html += '</form></div>';
    body.innerHTML = html;
    document.getElementById('resBack').onclick = function(){ load(); };
    document.getElementById('resForm').onsubmit = async function(e) {
      e.preventDefault();
      var fd = new FormData(this); var obj = {};
      fd.forEach(function(v,k){obj[k]=v;});
      obj.day_of_week = getDow(obj.record_date);
      obj.cancel_count = parseInt(obj.cancel_count)||0;
      obj.dentweb_cancel_count = parseInt(obj.dentweb_cancel_count)||0;
      obj.fulfillment_rate = parseFloat(obj.fulfillment_rate)||0;
      try {
        if(isEdit) await api('/api/protected/reservations/'+id,{method:'PUT',json:obj});
        else await api('/api/protected/reservations',{method:'POST',json:obj});
        PFM.toast(isEdit?'수정 완료':'등록 완료','success'); load();
      } catch(err){PFM.toast('저장 실패','error');}
    };
    if(isEdit) document.getElementById('resDel').onclick = async function(){ if(!confirm('삭제?'))return; await api('/api/protected/reservations/'+id,{method:'DELETE'}); PFM.toast('삭제','success'); load(); };
  }

  await load();
}

// ═══ 예약 통계 ═══
async function renderReservationStats(body, actions) {
  actions.innerHTML = '';
  var now = new Date(), cFrom='', cTo='', cPreset='all';
  async function loadStats() {
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    var p = new URLSearchParams();
    if(cFrom) p.set('from',cFrom); if(cTo) p.set('to',cTo);
    var data = await api('/api/protected/reservations/stats?'+p);
    render(data);
  }
  function render(d) {
    var html = '<div style="margin-bottom:20px"><h3 style="margin:0 0 16px;font-size:20px;font-weight:900">예약 관리 통계</h3>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
    [{id:'this_month',l:'이번 달'},{id:'last_month',l:'지난 달'},{id:'this_year',l:'올해'},{id:'last_year',l:'작년'},{id:'all',l:'전체'},{id:'custom',l:'직접 선택'}].forEach(function(pr){
      html += '<button class="btn btn-sm rs-pre" data-pre="'+pr.id+'" style="'+(cPreset===pr.id?'background:var(--primary);color:#fff;font-weight:700;':'')+'border-radius:20px;padding:6px 14px;font-size:12px">'+pr.l+'</button>';
    });
    html += '</div>';
    html += '<div id="rsCustom" style="display:'+(cPreset==='custom'?'flex':'none')+';gap:8px;align-items:center;margin-bottom:12px">';
    html += '<input type="date" id="rsFrom" value="'+cFrom+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<span>~</span><input type="date" id="rsTo" value="'+cTo+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="rsApply">조회</button></div></div>';

    // 카드
    var t = d.total||{};
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:16px">';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">총 예약 취소</div><div style="font-size:28px;font-weight:900;color:#ef4444">'+fmt(t.total_cancel)+'</div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">총 덴트웹 취소</div><div style="font-size:28px;font-weight:900;color:#f59e0b">'+fmt(t.total_dentweb)+'</div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">평균 이행율</div><div style="font-size:28px;font-weight:900;color:#3b82f6">'+(t.avg_fulfill||0)+'%</div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">데이터 일수</div><div style="font-size:28px;font-weight:900;color:var(--text)">'+fmt(t.cnt)+'</div></div>';
    html += '</div>';

    // 요일별
    if(d.byDow&&d.byDow.length>0){
      html += '<div style="'+cardS()+'"><h4 style="margin:0 0 14px;font-size:14px;font-weight:800">요일별 평균</h4>';
      html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">';
      html += '<th style="padding:8px;text-align:left">요일</th><th style="padding:8px;text-align:center">예약취소</th><th style="padding:8px;text-align:center">덴트웹취소</th><th style="padding:8px;text-align:center">이행율</th></tr></thead><tbody>';
      var dowMap={}; d.byDow.forEach(function(r){dowMap[r.dow]=r;});
      DOW_ORDER.forEach(function(dw){var r=dowMap[dw]; if(!r)return;
        var fc=r.avg_fulfill>=75?'#22c55e':r.avg_fulfill>=70?'#f59e0b':'#ef4444';
        html += '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px;font-weight:600;color:'+DOW_COLORS[dw]+'">'+DOW[dw]+'</td>';
        html += '<td style="padding:8px;text-align:center;font-weight:700;color:#ef4444">'+r.avg_cancel+'</td>';
        html += '<td style="padding:8px;text-align:center;font-weight:700;color:#f59e0b">'+r.avg_dentweb+'</td>';
        html += '<td style="padding:8px;text-align:center;font-weight:700;color:'+fc+'">'+r.avg_fulfill+'%</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }

    // 월별 트렌드
    if(d.monthlyTrend&&d.monthlyTrend.length>1){
      html += '<div style="'+cardS()+'"><h4 style="margin:0 0 14px;font-size:14px;font-weight:800">월별 이행율 추이</h4>';
      var maxF = Math.max.apply(null, d.monthlyTrend.map(function(m){return m.fulfill||0;}));
      html += '<div style="display:flex;gap:2px;align-items:flex-end;min-height:140px;padding-bottom:28px">';
      d.monthlyTrend.forEach(function(m){
        var h=maxF>0?Math.max(Math.round(m.fulfill/maxF*120),5):5;
        var c=m.fulfill>=75?'#22c55e':m.fulfill>=70?'#f59e0b':'#ef4444';
        var lb=m.month.length>=7?m.month.slice(2):m.month;
        html += '<div style="flex:1;min-width:10px;display:flex;flex-direction:column;align-items:center;gap:2px">';
        html += '<span style="font-size:8px;font-weight:700">'+m.fulfill+'%</span>';
        html += '<div style="width:100%;max-width:32px;height:'+h+'px;background:'+c+';border-radius:3px 3px 0 0;opacity:.85"></div>';
        html += '<span style="font-size:7px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">'+esc(lb)+'</span></div>';
      });
      html += '</div></div>';
    }

    body.innerHTML = html;
    // 프리셋 이벤트
    document.querySelectorAll('.rs-pre').forEach(function(btn){
      btn.onclick = function(){
        var pr=btn.dataset.pre, y=now.getFullYear(), m=now.getMonth();
        if(pr==='this_month'){cFrom=y+'-'+String(m+1).padStart(2,'0')+'-01';cTo=y+'-'+String(m+1).padStart(2,'0')+'-'+String(new Date(y,m+1,0).getDate()).padStart(2,'0');}
        else if(pr==='last_month'){var lm=m===0?11:m-1,ly=m===0?y-1:y;cFrom=ly+'-'+String(lm+1).padStart(2,'0')+'-01';cTo=ly+'-'+String(lm+1).padStart(2,'0')+'-'+String(new Date(ly,lm+1,0).getDate()).padStart(2,'0');}
        else if(pr==='this_year'){cFrom=y+'-01-01';cTo=y+'-12-31';}
        else if(pr==='last_year'){cFrom=(y-1)+'-01-01';cTo=(y-1)+'-12-31';}
        else if(pr==='all'){cFrom='';cTo='';}
        else if(pr==='custom'){cPreset='custom';document.getElementById('rsCustom').style.display='flex';return;}
        cPreset=pr; loadStats();
      };
    });
    var rsA=document.getElementById('rsApply');
    if(rsA) rsA.onclick=function(){cFrom=document.getElementById('rsFrom').value;cTo=document.getElementById('rsTo').value;cPreset='custom';loadStats();};
  }
  await loadStats();
}

PFM.modules.reservations = { renderReservations: renderReservations, renderReservationStats: renderReservationStats };
})(window.PFM);
