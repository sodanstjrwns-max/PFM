/* ═══ Module: 주차권 관리 (Parking Management) ═══ */
(function(PFM) {
'use strict';
var api = PFM.api, esc = PFM.esc;

var DOW = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
var DOW_ORDER = ['mon','tue','wed','thu','fri','sat','sun'];
var DOW_COLORS = {mon:'#3b82f6',tue:'#22c55e',wed:'#f59e0b',thu:'#8b5cf6',fri:'#ec4899',sat:'#06b6d4',sun:'#ef4444'};
function fmt(n) { return n != null ? Number(n).toLocaleString() : '-'; }
function cardS() { return 'background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px'; }
function getDow(dateStr) {
  if (!dateStr) return '';
  return ['sun','mon','tue','wed','thu','fri','sat'][new Date(dateStr).getDay()] || '';
}

// ═══ 주차권 기록 목록 ═══
async function renderParking(body, actions) {
  var filters = {from:'',to:''};
  var sortKey = 'record_date', sortDir = -1;
  var currentPage = 1, pageSize = 50, allData = [];

  actions.innerHTML = '<button class="btn btn-primary" id="addPk"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> 기록 추가</button>';
  document.getElementById('addPk').onclick = function() { showForm(null); };

  async function load() {
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    var p = new URLSearchParams();
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    var data = await api('/api/protected/parking?' + p);
    allData = (data.data||[]).filter(function(r){return r.ticket_count>0;});
    renderTable();
  }

  function sortTh(key,label) {
    var arrow = sortKey===key?(sortDir===1?' ▲':' ▼'):'';
    return '<th class="pk-sort" data-sort="'+key+'" style="padding:10px 8px;text-align:left;cursor:pointer;user-select:none;white-space:nowrap;font-weight:700;font-size:11px;color:var(--text-muted)">'+label+arrow+'</th>';
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
    html += '<input type="date" id="pkFrom" value="'+esc(filters.from)+'" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<span style="color:var(--text-muted)">~</span>';
    html += '<input type="date" id="pkTo" value="'+esc(filters.to)+'" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="pkApply">조회</button></div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px">';
    html += '<span>총 <strong style="color:var(--text)">'+fmt(allData.length)+'</strong>건</span>';
    html += '<span>페이지 '+currentPage+'/'+Math.max(totalPages,1)+'</span></div></div>';

    html += '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:500px">';
    html += '<thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">';
    html += sortTh('record_date','날짜');
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">요일</th>';
    html += sortTh('ticket_count','주차권 수');
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">수준</th>';
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">메모</th>';
    html += '</tr></thead><tbody>';

    if(pg.length===0) html += '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--text-muted)">기록이 없습니다</td></tr>';
    pg.forEach(function(r){
      var dowLabel = DOW[r.day_of_week]||'-';
      var level, levelColor;
      if(r.ticket_count>=40) { level='많음'; levelColor='#ef4444'; }
      else if(r.ticket_count>=20) { level='보통'; levelColor='#f59e0b'; }
      else { level='적음'; levelColor='#22c55e'; }

      html += '<tr class="pk-row" data-id="'+esc(r.id)+'" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'\'">';
      html += '<td style="padding:10px 12px;font-size:11px;white-space:nowrap">'+esc(r.record_date||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px;font-weight:600">'+esc(dowLabel)+'</td>';
      html += '<td style="padding:10px 8px;text-align:center;font-size:16px;font-weight:900;color:#8b5cf6">'+fmt(r.ticket_count)+'</td>';
      html += '<td style="padding:10px 8px"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+levelColor+'20;color:'+levelColor+'">'+level+'</span></td>';
      html += '<td style="padding:10px 8px;font-size:11px;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.memo||'-')+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if(totalPages>1){
      html += '<div style="display:flex;justify-content:center;gap:4px;margin-top:16px">';
      html += '<button class="btn btn-sm pk-pn" data-d="prev" '+(currentPage<=1?'disabled':'')+'>◀</button>';
      for(var p=Math.max(1,currentPage-4);p<=Math.min(totalPages,currentPage+5);p++)
        html += '<button class="btn btn-sm pk-pg" data-p="'+p+'" style="min-width:36px;'+(p===currentPage?'background:var(--primary);color:#fff;font-weight:700':'')+'">'+p+'</button>';
      html += '<button class="btn btn-sm pk-pn" data-d="next" '+(currentPage>=totalPages?'disabled':'')+'>▶</button></div>';
    }
    body.innerHTML = html;
    bindEv();
  }

  function bindEv() {
    var ab=document.getElementById('pkApply');
    if(ab) ab.onclick=function(){filters.from=document.getElementById('pkFrom').value;filters.to=document.getElementById('pkTo').value;currentPage=1;load();};
    document.querySelectorAll('.pk-sort').forEach(function(th){th.onclick=function(){var k=th.dataset.sort;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderTable();};});
    document.querySelectorAll('.pk-row').forEach(function(tr){tr.onclick=function(){showForm(tr.dataset.id);};});
    document.querySelectorAll('.pk-pg').forEach(function(b){b.onclick=function(){currentPage=parseInt(b.dataset.p);renderTable();};});
    document.querySelectorAll('.pk-pn').forEach(function(b){b.onclick=function(){if(b.dataset.d==='prev'&&currentPage>1)currentPage--;else if(b.dataset.d==='next')currentPage++;renderTable();};});
  }

  async function showForm(id) {
    var rec = id ? allData.find(function(r){return r.id===id;}) : null;
    var isEdit = !!rec;
    var today = new Date().toISOString().slice(0,10);
    var html = '<div style="max-width:500px;margin:0 auto">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0;font-size:18px;font-weight:900">'+(isEdit?'주차권 기록 수정':'주차권 기록 등록')+'</h3><button class="btn btn-sm" id="pkBack">← 목록</button></div>';
    html += '<form id="pkForm" style="display:flex;flex-direction:column;gap:14px">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">날짜 *</label><input type="date" name="record_date" value="'+esc(rec?rec.record_date:today)+'" required style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">주차권 수</label><input type="number" name="ticket_count" value="'+(rec?rec.ticket_count:0)+'" min="0" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '</div>';
    html += '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">메모</label><input type="text" name="memo" value="'+esc(rec?rec.memo:'')+'" placeholder="메모" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-card)"></div>';
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">';
    if(isEdit) html += '<button type="button" class="btn" id="pkDel" style="color:#ef4444">삭제</button>';
    html += '<button type="submit" class="btn btn-primary" style="padding:10px 24px;font-weight:700">'+(isEdit?'수정':'등록')+'</button></div>';
    html += '</form></div>';
    body.innerHTML = html;
    document.getElementById('pkBack').onclick=function(){load();};
    document.getElementById('pkForm').onsubmit=async function(e){
      e.preventDefault();
      var fd=new FormData(this),obj={};fd.forEach(function(v,k){obj[k]=v;});
      obj.day_of_week=getDow(obj.record_date);
      obj.ticket_count=parseInt(obj.ticket_count)||0;
      try{
        if(isEdit)await api('/api/protected/parking/'+id,{method:'PUT',body:JSON.stringify(obj)});
        else await api('/api/protected/parking',{method:'POST',body:JSON.stringify(obj)});
        PFM.showToast(isEdit?'수정 완료':'등록 완료','success');load();
      }catch(err){PFM.showToast('저장 실패','error');}
    };
    if(isEdit) document.getElementById('pkDel').onclick=async function(){if(!confirm('삭제?'))return;await api('/api/protected/parking/'+id,{method:'DELETE'});PFM.showToast('삭제','success');load();};
  }

  await load();
}

// ═══ 주차권 통계 ═══
async function renderParkingStats(body, actions) {
  actions.innerHTML='';
  var now=new Date(),cFrom='',cTo='',cPreset='all';
  async function loadStats(){
    body.innerHTML='<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    var p=new URLSearchParams();if(cFrom)p.set('from',cFrom);if(cTo)p.set('to',cTo);
    var data=await api('/api/protected/parking/stats?'+p);render(data);
  }
  function render(d){
    var html='<div style="margin-bottom:20px"><h3 style="margin:0 0 16px;font-size:20px;font-weight:900">주차권 통계</h3>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
    [{id:'this_month',l:'이번 달'},{id:'last_month',l:'지난 달'},{id:'this_year',l:'올해'},{id:'last_year',l:'작년'},{id:'all',l:'전체'},{id:'custom',l:'직접 선택'}].forEach(function(pr){
      html += '<button class="btn btn-sm ps-pre" data-pre="'+pr.id+'" style="'+(cPreset===pr.id?'background:var(--primary);color:#fff;font-weight:700;':'')+'border-radius:20px;padding:6px 14px;font-size:12px">'+pr.l+'</button>';
    });
    html += '</div>';
    html += '<div id="psCustom" style="display:'+(cPreset==='custom'?'flex':'none')+';gap:8px;align-items:center;margin-bottom:12px">';
    html += '<input type="date" id="psFrom" value="'+cFrom+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)"><span>~</span>';
    html += '<input type="date" id="psTo" value="'+cTo+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="psApply">조회</button></div></div>';

    var t=d.total||{};
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:16px">';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">총 발급</div><div style="font-size:28px;font-weight:900;color:#8b5cf6">'+fmt(t.total_tickets)+'<span style="font-size:14px">장</span></div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">일 평균</div><div style="font-size:28px;font-weight:900;color:#3b82f6">'+(t.avg_tickets||0)+'<span style="font-size:14px">장</span></div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">최대 발급일</div><div style="font-size:28px;font-weight:900;color:#ef4444">'+fmt(t.max_tickets)+'<span style="font-size:14px">장</span></div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div style="font-size:10px;color:var(--text-muted);font-weight:600">데이터 일수</div><div style="font-size:28px;font-weight:900;color:var(--text)">'+fmt(t.cnt)+'</div></div>';
    html += '</div>';

    // 요일별
    if(d.byDow&&d.byDow.length>0){
      html += '<div style="'+cardS()+'"><h4 style="margin:0 0 14px;font-size:14px;font-weight:800">요일별 평균 주차권</h4>';
      var maxW=Math.max.apply(null,d.byDow.map(function(r){return r.avg_tickets;}));
      var dowMap={};d.byDow.forEach(function(r){dowMap[r.dow]=r;});
      DOW_ORDER.forEach(function(dw){
        var r=dowMap[dw]; if(!r)return;
        var w=maxW>0?Math.max(Math.round(r.avg_tickets/maxW*100),3):3;
        html += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px">';
        html += '<span style="min-width:30px;font-weight:600;color:'+DOW_COLORS[dw]+'">'+DOW[dw]+'</span>';
        html += '<div style="flex:1;background:var(--bg);border-radius:4px;height:20px;overflow:hidden"><div style="height:100%;background:#8b5cf6;border-radius:4px;width:'+w+'%"></div></div>';
        html += '<span style="min-width:50px;text-align:right;font-weight:700">'+r.avg_tickets+'장</span></div>';
      });
      html += '</div>';
    }

    // 월별 트렌드
    if(d.monthlyTrend&&d.monthlyTrend.length>1){
      html += '<div style="'+cardS()+'"><h4 style="margin:0 0 14px;font-size:14px;font-weight:800">월별 주차권 추이</h4>';
      var maxM=Math.max.apply(null,d.monthlyTrend.map(function(m){return m.total;}));
      html += '<div style="display:flex;gap:2px;align-items:flex-end;min-height:140px;padding-bottom:28px">';
      d.monthlyTrend.forEach(function(m){
        var h=maxM>0?Math.max(Math.round(m.total/maxM*120),5):5;
        var lb=m.month.length>=7?m.month.slice(2):m.month;
        html += '<div style="flex:1;min-width:10px;display:flex;flex-direction:column;align-items:center;gap:2px">';
        html += '<span style="font-size:8px;font-weight:700">'+fmt(m.total)+'</span>';
        html += '<div style="width:100%;max-width:32px;height:'+h+'px;background:#8b5cf6;border-radius:3px 3px 0 0;opacity:.85"></div>';
        html += '<span style="font-size:7px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">'+esc(lb)+'</span></div>';
      });
      html += '</div></div>';
    }

    body.innerHTML=html;
    document.querySelectorAll('.ps-pre').forEach(function(btn){
      btn.onclick=function(){
        var pr=btn.dataset.pre,y=now.getFullYear(),m=now.getMonth();
        if(pr==='this_month'){cFrom=y+'-'+String(m+1).padStart(2,'0')+'-01';cTo=y+'-'+String(m+1).padStart(2,'0')+'-'+String(new Date(y,m+1,0).getDate()).padStart(2,'0');}
        else if(pr==='last_month'){var lm=m===0?11:m-1,ly=m===0?y-1:y;cFrom=ly+'-'+String(lm+1).padStart(2,'0')+'-01';cTo=ly+'-'+String(lm+1).padStart(2,'0')+'-'+String(new Date(ly,lm+1,0).getDate()).padStart(2,'0');}
        else if(pr==='this_year'){cFrom=y+'-01-01';cTo=y+'-12-31';}
        else if(pr==='last_year'){cFrom=(y-1)+'-01-01';cTo=(y-1)+'-12-31';}
        else if(pr==='all'){cFrom='';cTo='';}
        else if(pr==='custom'){cPreset='custom';document.getElementById('psCustom').style.display='flex';return;}
        cPreset=pr;loadStats();
      };
    });
    var psA=document.getElementById('psApply');
    if(psA)psA.onclick=function(){cFrom=document.getElementById('psFrom').value;cTo=document.getElementById('psTo').value;cPreset='custom';loadStats();};
  }
  await loadStats();
}

PFM.modules.parking = { renderParking: renderParking, renderParkingStats: renderParkingStats };
})(window.PFM);
