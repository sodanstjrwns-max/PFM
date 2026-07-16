/* ═══ Module: 대기시간 관리 (Wait Time Management) ═══ */
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

// ═══ 대기시간 기록 목록 ═══
async function renderWaitTimes(body, actions) {
  var filters = {from:'',to:''};
  var sortKey = 'record_date', sortDir = -1;
  var currentPage = 1, pageSize = 50, allData = [];

  actions.innerHTML = '<button class="btn btn-primary" id="addWt"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> 기록 추가</button>';
  document.getElementById('addWt').onclick = function() { showForm(null); };

  async function load() {
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';
    var p = new URLSearchParams();
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    var data = await api('/api/protected/wait-times?' + p);
    allData = (data.data||[]).filter(function(r){return r.avg_wait_minutes>0;});
    renderTable();
  }

  function sortTh(key,label) {
    var arrow = sortKey===key?(sortDir===1?' ▲':' ▼'):'';
    return '<th class="wt-sort" data-sort="'+key+'" style="padding:10px 8px;text-align:left;cursor:pointer;user-select:none;white-space:nowrap;font-weight:700;font-size:11px;color:var(--text-muted)">'+label+arrow+'</th>';
  }

  function renderTable() {
    var sorted = allData.slice().sort(function(a,b){
      var va=a[sortKey]||0,vb=b[sortKey]||0;
      if(typeof va==='string'){if(va<vb)return -1*sortDir;if(va>vb)return 1*sortDir;return 0;}
      return (va-vb)*sortDir;
    });
    var totalPages = Math.ceil(sorted.length/pageSize);
    var start = (currentPage-1)*pageSize;
    var pg = sorted.slice(start, start+pageSize);

    var html = '<div class="mb-16">';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">';
    html += '<input type="date" id="wtFrom" value="'+esc(filters.from)+'" class="input-sm">';
    html += '<span class="text-muted">~</span>';
    html += '<input type="date" id="wtTo" value="'+esc(filters.to)+'" class="input-sm">';
    html += '<button class="btn btn-primary btn-sm" id="wtApply">조회</button></div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px">';
    html += '<span>총 <strong style="color:var(--text)">'+fmt(allData.length)+'</strong>건</span>';
    html += '<span>페이지 '+currentPage+'/'+Math.max(totalPages,1)+'</span></div></div>';

    html += '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:600px">';
    html += '<thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)">';
    html += sortTh('record_date','날짜');
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">요일</th>';
    html += sortTh('total_wait_minutes','총 대기시간');
    html += sortTh('avg_wait_minutes','평균 대기시간');
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">상태</th>';
    html += '<th style="padding:10px 8px;font-weight:700;font-size:11px;color:var(--text-muted)">메모</th>';
    html += '</tr></thead><tbody>';

    if(pg.length===0) html += '<tr><td colspan="6" style="padding:40px;text-align:center;color:var(--text-muted)">기록이 없습니다</td></tr>';
    pg.forEach(function(r){
      var dowLabel = DOW[r.day_of_week]||'-';
      var avgColor = r.avg_wait_minutes<=15?'#0f7a3d':r.avg_wait_minutes<=20?'#92400e':'#b91c1c';
      var statusLabel = r.avg_wait_minutes<=15?'양호':r.avg_wait_minutes<=20?'주의':'위험';
      var statusBg = r.avg_wait_minutes<=15?'#0f7a3d':r.avg_wait_minutes<=20?'#92400e':'#b91c1c';
      html += '<tr class="wt-row" data-id="'+esc(r.id)+'" style="cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" data-act-over="this.style.background=\'var(--bg-hover)\'" data-act-out="this.style.background=\'\'">';
      html += '<td style="padding:10px 12px;font-size:11px;white-space:nowrap">'+esc(r.record_date||'-')+'</td>';
      html += '<td style="padding:10px 8px;font-size:11px;font-weight:600">'+esc(dowLabel)+'</td>';
      html += '<td style="padding:10px 8px;text-align:center;font-size:11px">'+fmt(Math.round(r.total_wait_minutes))+'분</td>';
      html += '<td style="padding:10px 8px;text-align:center;font-weight:700;color:'+avgColor+'">'+Number(r.avg_wait_minutes).toFixed(1)+'분</td>';
      html += '<td style="padding:10px 8px"><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+statusBg+'20;color:'+statusBg+'">'+statusLabel+'</span></td>';
      html += '<td style="padding:10px 8px;font-size:11px;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.memo||'-')+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if(totalPages>1){
      html += '<div style="display:flex;justify-content:center;gap:4px;margin-top:16px">';
      html += '<button class="btn btn-sm wt-pn" data-d="prev" '+(currentPage<=1?'disabled':'')+'>◀</button>';
      for(var p=Math.max(1,currentPage-4);p<=Math.min(totalPages,currentPage+5);p++)
        html += '<button class="btn btn-sm wt-pg" data-p="'+p+'" style="min-width:36px;'+(p===currentPage?'background:var(--primary);color:#fff;font-weight:700':'')+'">'+p+'</button>';
      html += '<button class="btn btn-sm wt-pn" data-d="next" '+(currentPage>=totalPages?'disabled':'')+'>▶</button></div>';
    }
    body.innerHTML = html;
    bindEv();
  }

  function bindEv() {
    var ab=document.getElementById('wtApply');
    if(ab) ab.onclick=function(){filters.from=document.getElementById('wtFrom').value;filters.to=document.getElementById('wtTo').value;currentPage=1;load();};
    document.querySelectorAll('.wt-sort').forEach(function(th){th.onclick=function(){var k=th.dataset.sort;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=-1;}renderTable();};});
    document.querySelectorAll('.wt-row').forEach(function(tr){tr.onclick=function(){showForm(tr.dataset.id);};});
    document.querySelectorAll('.wt-pg').forEach(function(b){b.onclick=function(){currentPage=parseInt(b.dataset.p);renderTable();};});
    document.querySelectorAll('.wt-pn').forEach(function(b){b.onclick=function(){if(b.dataset.d==='prev'&&currentPage>1)currentPage--;else if(b.dataset.d==='next')currentPage++;renderTable();};});
  }

  async function showForm(id) {
    var rec = id ? allData.find(function(r){return r.id===id;}) : null;
    var isEdit = !!rec;
    var today = new Date().toISOString().slice(0,10);
    var html = '<div style="max-width:500px;margin:0 auto">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h3 style="margin:0;font-size:18px;font-weight:900">'+(isEdit?'대기시간 수정':'대기시간 등록')+'</h3><button class="btn btn-sm" id="wtBack">← 목록</button></div>';
    html += '<form id="wtForm" style="display:flex;flex-direction:column;gap:14px">';
    html += '<div><label class="mod-label">날짜 *</label><input type="date" name="record_date" value="'+esc(rec?rec.record_date:today)+'" required class="input-md"></div>';
    html += '<div class="grid-2">';
    html += '<div><label class="mod-label">총 대기시간 (분)</label><input type="number" name="total_wait_minutes" value="'+(rec?rec.total_wait_minutes:0)+'" min="0" class="input-md"></div>';
    html += '<div><label class="mod-label">평균 대기시간 (분)</label><input type="number" name="avg_wait_minutes" value="'+(rec?rec.avg_wait_minutes:0)+'" min="0" step="0.1" class="input-md"></div>';
    html += '</div>';
    html += '<div><label class="mod-label">메모</label><input type="text" name="memo" value="'+esc(rec?rec.memo:'')+'" placeholder="메모" class="input-md"></div>';
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">';
    if(isEdit) html += '<button type="button" class="btn" id="wtDel" class="text-danger">삭제</button>';
    html += '<button type="submit" class="btn btn-primary" style="padding:10px 24px;font-weight:700">'+(isEdit?'수정':'등록')+'</button></div>';
    html += '</form></div>';
    body.innerHTML = html;
    document.getElementById('wtBack').onclick = function(){load();};
    document.getElementById('wtForm').onsubmit = async function(e) {
      e.preventDefault();
      var fd=new FormData(this),obj={};fd.forEach(function(v,k){obj[k]=v;});
      obj.day_of_week = getDow(obj.record_date);
      obj.total_wait_minutes = parseFloat(obj.total_wait_minutes)||0;
      obj.avg_wait_minutes = parseFloat(obj.avg_wait_minutes)||0;
      try{
        if(isEdit)await api('/api/protected/wait-times/'+id,{method:'PUT',json:obj});
        else await api('/api/protected/wait-times',{method:'POST',json:obj});
        PFM.toast(isEdit?'수정 완료':'등록 완료','success');load();
      }catch(err){PFM.toast('저장 실패','error');}
    };
    if(isEdit) document.getElementById('wtDel').onclick=async function(){if(!confirm('삭제?'))return;await api('/api/protected/wait-times/'+id,{method:'DELETE'});PFM.toast('삭제','success');load();};
  }

  await load();
}

// ═══ 대기시간 통계 ═══
async function renderWaitTimeStats(body, actions) {
  actions.innerHTML = '';
  var now=new Date(),cFrom='',cTo='',cPreset='all';
  async function loadStats(){
    body.innerHTML='<div class="mod-empty"><span class="loading-spinner"></span></div>';
    var p=new URLSearchParams();if(cFrom)p.set('from',cFrom);if(cTo)p.set('to',cTo);
    var data=await api('/api/protected/wait-times/stats?'+p);render(data);
  }
  function render(d){
    var html='<div class="mb-20"><h3 style="margin:0 0 16px;font-size:20px;font-weight:900">대기시간 통계</h3>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">';
    [{id:'this_month',l:'이번 달'},{id:'last_month',l:'지난 달'},{id:'this_year',l:'올해'},{id:'last_year',l:'작년'},{id:'all',l:'전체'},{id:'custom',l:'직접 선택'}].forEach(function(pr){
      html += '<button class="btn btn-sm ws-pre" data-pre="'+pr.id+'" style="'+(cPreset===pr.id?'background:var(--primary);color:#fff;font-weight:700;':'')+'border-radius:20px;padding:6px 14px;font-size:12px">'+pr.l+'</button>';
    });
    html += '</div>';
    html += '<div id="wsCustom" style="display:'+(cPreset==='custom'?'flex':'none')+';gap:8px;align-items:center;margin-bottom:12px">';
    html += '<input type="date" id="wsFrom" value="'+cFrom+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)"><span>~</span>';
    html += '<input type="date" id="wsTo" value="'+cTo+'" style="padding:8px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-card)">';
    html += '<button class="btn btn-primary btn-sm" id="wsApply">조회</button></div></div>';

    var t=d.total||{};
    var avgColor=(t.overall_avg||0)<=15?'#0f7a3d':(t.overall_avg||0)<=20?'#92400e':'#b91c1c';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:16px">';
    html += '<div style="'+cardS()+';text-align:center"><div class="mod-muted-xs-bold">전체 평균</div><div style="font-size:28px;font-weight:900;color:'+avgColor+'">'+(t.overall_avg||0)+'<span style="font-size:14px">분</span></div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div class="mod-muted-xs-bold">최대 평균</div><div style="font-size:28px;font-weight:900;color:#b91c1c">'+(t.max_avg||0)+'<span style="font-size:14px">분</span></div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div class="mod-muted-xs-bold">최소 평균</div><div style="font-size:28px;font-weight:900;color:#0f7a3d">'+(t.min_avg||0)+'<span style="font-size:14px">분</span></div></div>';
    html += '<div style="'+cardS()+';text-align:center"><div class="mod-muted-xs-bold">데이터 일수</div><div style="font-size:28px;font-weight:900;color:var(--text)">'+fmt(t.cnt)+'</div></div>';
    html += '</div>';

    // 요일별
    if(d.byDow&&d.byDow.length>0){
      html += '<div style="'+cardS()+'"><h4 class="mod-title">요일별 평균 대기시간</h4>';
      var maxW=Math.max.apply(null,d.byDow.map(function(r){return r.avg_wait;}));
      var dowMap={};d.byDow.forEach(function(r){dowMap[r.dow]=r;});
      DOW_ORDER.forEach(function(dw){
        var r=dowMap[dw]; if(!r)return;
        var barColor=r.avg_wait<=15?'#22c55e':r.avg_wait<=20?'#f59e0b':'#ef4444';
        var c=r.avg_wait<=15?'#0f7a3d':r.avg_wait<=20?'#92400e':'#b91c1c';
        var w=maxW>0?Math.max(Math.round(r.avg_wait/maxW*100),3):3;
        html += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px">';
        html += '<span style="min-width:30px;font-weight:600;color:'+DOW_COLORS[dw]+'">'+DOW[dw]+'</span>';
        html += '<div style="flex:1;background:var(--bg);border-radius:4px;height:20px;overflow:hidden"><div style="height:100%;background:'+barColor+';border-radius:4px;width:'+w+'%"></div></div>';
        html += '<span style="min-width:60px;text-align:right;font-weight:700;color:'+c+'">'+r.avg_wait+'분</span></div>';
      });
      html += '</div>';
    }

    // 월별 트렌드
    if(d.monthlyTrend&&d.monthlyTrend.length>1){
      html += '<div style="'+cardS()+'"><h4 class="mod-title">월별 평균 대기시간 추이</h4>';
      var maxM=Math.max.apply(null,d.monthlyTrend.map(function(m){return m.avg_wait;}));
      html += '<div style="display:flex;gap:2px;align-items:flex-end;min-height:140px;padding-bottom:28px">';
      d.monthlyTrend.forEach(function(m){
        var h=maxM>0?Math.max(Math.round(m.avg_wait/maxM*120),5):5;
        var barColor=m.avg_wait<=15?'#22c55e':m.avg_wait<=20?'#f59e0b':'#ef4444';
        var c=m.avg_wait<=15?'#0f7a3d':m.avg_wait<=20?'#92400e':'#b91c1c';
        var lb=m.month.length>=7?m.month.slice(2):m.month;
        html += '<div style="flex:1;min-width:10px;display:flex;flex-direction:column;align-items:center;gap:2px">';
        html += '<span style="font-size:8px;font-weight:700;color:'+c+'">'+m.avg_wait+'</span>';
        html += '<div style="width:100%;max-width:32px;height:'+h+'px;background:'+barColor+';border-radius:3px 3px 0 0;opacity:.85"></div>';
        html += '<span style="font-size:7px;color:var(--text-muted);white-space:nowrap;transform:rotate(-45deg);transform-origin:top left;margin-top:2px">'+esc(lb)+'</span></div>';
      });
      html += '</div></div>';
    }

    body.innerHTML=html;
    document.querySelectorAll('.ws-pre').forEach(function(btn){
      btn.onclick=function(){
        var pr=btn.dataset.pre,y=now.getFullYear(),m=now.getMonth();
        if(pr==='this_month'){cFrom=y+'-'+String(m+1).padStart(2,'0')+'-01';cTo=y+'-'+String(m+1).padStart(2,'0')+'-'+String(new Date(y,m+1,0).getDate()).padStart(2,'0');}
        else if(pr==='last_month'){var lm=m===0?11:m-1,ly=m===0?y-1:y;cFrom=ly+'-'+String(lm+1).padStart(2,'0')+'-01';cTo=ly+'-'+String(lm+1).padStart(2,'0')+'-'+String(new Date(ly,lm+1,0).getDate()).padStart(2,'0');}
        else if(pr==='this_year'){cFrom=y+'-01-01';cTo=y+'-12-31';}
        else if(pr==='last_year'){cFrom=(y-1)+'-01-01';cTo=(y-1)+'-12-31';}
        else if(pr==='all'){cFrom='';cTo='';}
        else if(pr==='custom'){cPreset='custom';document.getElementById('wsCustom').style.display='flex';return;}
        cPreset=pr;loadStats();
      };
    });
    var wsA=document.getElementById('wsApply');
    if(wsA)wsA.onclick=function(){cFrom=document.getElementById('wsFrom').value;cTo=document.getElementById('wsTo').value;cPreset='custom';loadStats();};
  }
  await loadStats();
}

PFM.modules.waitTimes = { renderWaitTimes: renderWaitTimes, renderWaitTimeStats: renderWaitTimeStats };
})(window.PFM);
