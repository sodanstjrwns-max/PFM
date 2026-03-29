/* ═══ 환자 유입 히트맵 (지역 분석) 모듈 ═══ */
(function() {
'use strict';
const { state, api, esc, ICONS, navigate } = window.PFM;

async function renderHeatmap(body, actions) {
  const month = new Date().toISOString().slice(0,7);
  body.innerHTML = `<div class="card" class="p-20"><div class="loading-spinner">데이터 로딩 중...</div></div>`;
  
  try {
    const data = await api('/api/protected/patients/stats/detailed?period=monthly&from=' + month + '-01&to=' + month + '-31');
    renderHeatmapView(body, actions, data, month);
  } catch(e) {
    body.innerHTML = `<div class="card" class="p-20"><p class="text-danger">${esc(e.message)}</p></div>`;
  }
}

function renderHeatmapView(body, actions, data, month) {
  const bySido = data.bySido || [];
  const bySigungu = data.bySigungu || [];
  const bySource = data.bySource || [];
  const byDoctor = data.byDoctor || [];
  const total = data.total || 0;

  // 색상 매핑 (환자 수에 따라)
  const maxSido = bySido.length > 0 ? bySido[0].c : 1;
  function getHeatColor(count) {
    const ratio = count / maxSido;
    if (ratio >= 0.8) return { bg: '#065f46', text: '#fff' };
    if (ratio >= 0.5) return { bg: '#0d9488', text: '#fff' };
    if (ratio >= 0.3) return { bg: '#5eead4', text: '#115e59' };
    if (ratio >= 0.1) return { bg: '#99f6e4', text: '#115e59' };
    return { bg: '#f0fdfa', text: '#115e59' };
  }

  // 플랫폼별 색상
  const sourceColors = { '네이버': '#03c75a', '구글': '#4285f4', '소개': '#f59e0b', '인스타그램': '#e1306c', '지인': '#8b5cf6', '블로그': '#06b6d4', '카카오': '#fee500' };
  function getSourceColor(src) { return sourceColors[src] || '#94a3b8'; }

  actions.innerHTML = `
    <input type="month" id="heatmapMonth" value="${month}" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px">
  `;

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">총 환자</div>
        <div style="font-size:28px;font-weight:800;color:#0f766e">${total.toLocaleString()}</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">분포 지역 수</div>
        <div style="font-size:28px;font-weight:800;color:#0f766e">${bySido.length}</div>
        <div style="font-size:11px;color:#94a3b8">시/도</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">상세 지역 수</div>
        <div style="font-size:28px;font-weight:800;color:#0f766e">${bySigungu.length}</div>
        <div style="font-size:11px;color:#94a3b8">시/군/구</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">유입 경로 수</div>
        <div style="font-size:28px;font-weight:800;color:#0f766e">${bySource.length}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <!-- 시/도별 히트맵 -->
      <div class="card" class="p-20">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">🗺️ 지역별 환자 분포 (시/도)</h3>
        <div id="sidoHeatmap" style="display:flex;flex-wrap:wrap;gap:8px">
          ${bySido.length === 0 ? '<p style="color:#94a3b8;font-size:13px">데이터가 없습니다. 환자 등록 시 주소를 입력해주세요.</p>' : 
          bySido.map(s => {
            const colors = getHeatColor(s.c);
            const pct = total > 0 ? Math.round(s.c / total * 1000)/10 : 0;
            return `<div style="background:${colors.bg};color:${colors.text};padding:10px 14px;border-radius:10px;min-width:80px;text-align:center;cursor:pointer" class="sido-chip" data-sido="${esc(s.addr_sido)}">
              <div style="font-size:14px;font-weight:700">${esc(s.addr_sido || '미입력')}</div>
              <div style="font-size:18px;font-weight:800">${s.c}</div>
              <div style="font-size:10px;opacity:0.8">${pct}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- 시/군/구 상세 -->
      <div class="card" class="p-20">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📍 상세 지역 Top 20 (시/군/구)</h3>
        <div style="max-height:300px;overflow-y:auto">
          ${bySigungu.length === 0 ? '<p style="color:#94a3b8;font-size:13px">데이터가 없습니다.</p>' :
          bySigungu.map((s, i) => {
            const pct = total > 0 ? Math.round(s.c / total * 1000)/10 : 0;
            const barW = bySigungu[0].c > 0 ? Math.round(s.c / bySigungu[0].c * 100) : 0;
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:11px;color:#94a3b8;width:18px;text-align:right">${i+1}</span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">
                  <span style="font-weight:600">${esc(s.addr_sido)} ${esc(s.addr_sigungu)}</span>
                  <span style="color:#0f766e;font-weight:700">${s.c}명 (${pct}%)</span>
                </div>
                <div style="height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${barW}%;background:linear-gradient(90deg,#14b8a6,#0f766e);border-radius:3px"></div>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- 내원경로별 -->
      <div class="card" class="p-20">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📊 내원경로별 분포</h3>
        ${bySource.length === 0 ? '<p style="color:#94a3b8;font-size:13px">데이터가 없습니다.</p>' :
        bySource.map(s => {
          const pct = total > 0 ? Math.round(s.c / total * 1000)/10 : 0;
          const color = getSourceColor(s.visit_source);
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <div style="flex:1;display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;font-weight:600">${esc(s.visit_source || '미입력')}</span>
              <span style="font-size:13px;font-weight:700;color:${color}">${s.c}명 (${pct}%)</span>
            </div>
          </div>`;
        }).join('')}
        ${bySource.length > 0 ? `
        <div style="margin-top:12px;height:20px;border-radius:10px;overflow:hidden;display:flex">
          ${bySource.map(s => {
            const pct = total > 0 ? s.c / total * 100 : 0;
            return `<div style="width:${pct}%;background:${getSourceColor(s.visit_source)};min-width:${pct > 3 ? '0' : '2px'}" title="${esc(s.visit_source)}: ${s.c}명"></div>`;
          }).join('')}
        </div>` : ''}
      </div>

      <!-- 담당 원장별 -->
      <div class="card" class="p-20">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">👨‍⚕️ 담당 원장별 환자 수</h3>
        ${byDoctor.length === 0 ? '<p style="color:#94a3b8;font-size:13px">데이터가 없습니다.</p>' :
        byDoctor.map((d, i) => {
          const pct = total > 0 ? Math.round(d.c / total * 1000)/10 : 0;
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:8px;background:#f8fafc;border-radius:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${i+1}</div>
            <div class="flex-1">
              <div style="font-size:13px;font-weight:600">${esc(d.primary_doctor || '미배정')}</div>
            </div>
            <div class="text-right">
              <div style="font-size:15px;font-weight:800;color:#0f766e">${d.c}</div>
              <div style="font-size:10px;color:#94a3b8">${pct}%</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;

  // 월 변경 이벤트
  document.getElementById('heatmapMonth')?.addEventListener('change', async (e) => {
    const m = e.target.value;
    body.innerHTML = '<div class="card" class="p-20"><div class="loading-spinner">로딩 중...</div></div>';
    try {
      const d = await api('/api/protected/patients/stats/detailed?period=monthly&from=' + m + '-01&to=' + m + '-31');
      renderHeatmapView(body, actions, d, m);
    } catch(err) { body.innerHTML = `<div class="card" class="p-20"><p class="text-danger">${esc(err.message)}</p></div>`; }
  });
}

window.PFM.modules.heatmap = { renderHeatmap };
})();
