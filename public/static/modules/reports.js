/* ═══ Module: Reports & Export (v3.3) — 월간 보고서 & 데이터 내보내기 ═══ */
(function(PFM) {
'use strict';
const { api, state, esc, toast } = PFM;

function monthStr(d) {
  const dt = d || new Date();
  return dt.toISOString().slice(0, 7);
}

async function renderReports(body, actions) {
  const thisMonth = monthStr();
  const lastMonth = monthStr(new Date(Date.now() - 30 * 86400 * 1000));

  body.innerHTML = `
    <div class="reports-page">
      <div class="reports-header">
        <h2 style="margin:0 0 4px 0">📄 월간 보고서 & 내보내기</h2>
        <p style="color:#64748b;font-size:13px;margin:0">한 달치 데이터를 Excel(CSV)·PDF로 한 번에 뽑아내세요</p>
      </div>

      <div class="reports-month-picker">
        <label for="reportsMonth"><b>조회 월:</b></label>
        <input type="month" id="reportsMonth" value="${thisMonth}" class="form-input" style="max-width:180px">
        <button class="btn btn-sm btn-outline" id="reportsLastMonthBtn">지난달</button>
        <button class="btn btn-sm btn-outline" id="reportsThisMonthBtn">이번달</button>
      </div>

      <div class="reports-hero">
        <div class="reports-hero-card">
          <div class="reports-hero-icon">📊</div>
          <div class="reports-hero-content">
            <h3>종합 월간 보고서 (PDF)</h3>
            <p>월 매출·신환/구환·전환율·일별 실적·컴플레인 요약까지 한 장에 정리된 경영 보고서. <b>브라우저 인쇄 → PDF 저장</b>으로 사용하세요.</p>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button class="btn btn-primary" id="btnViewReport">📄 미리보기</button>
              <button class="btn btn-outline" id="btnPrintReport">🖨️ 인쇄 → PDF 저장</button>
            </div>
          </div>
        </div>
      </div>

      <h3 style="margin:20px 0 8px 0">📥 개별 데이터 CSV 내보내기</h3>
      <p style="color:#64748b;font-size:13px;margin:0 0 14px 0">엑셀(CSV)로 다운로드. 한글 깨짐 방지 UTF-8 BOM 포함</p>

      <div class="reports-grid">
        <button class="reports-tile" data-csv="patients" data-icon="👥">
          <div class="reports-tile-icon">👥</div>
          <div class="reports-tile-title">환자 DB</div>
          <div class="reports-tile-desc">차트번호, 방문이력, 담당의, 유입경로</div>
        </button>
        <button class="reports-tile" data-csv="consult" data-icon="💬">
          <div class="reports-tile-icon">💬</div>
          <div class="reports-tile-title">상담 기록</div>
          <div class="reports-tile-desc">견적/동의 금액, 치료확정, 예약, 리콜</div>
        </button>
        <button class="reports-tile" data-csv="daily" data-icon="📅">
          <div class="reports-tile-icon">📅</div>
          <div class="reports-tile-title">일일 KPI</div>
          <div class="reports-tile-desc">매출, 신환, 콜, 상담, 취소, 컴플</div>
        </button>
        <button class="reports-tile" data-csv="calls" data-icon="📞">
          <div class="reports-tile-icon">📞</div>
          <div class="reports-tile-title">콜 기록</div>
          <div class="reports-tile-desc">인/아웃바운드, 유입경로, 예약전환</div>
        </button>
        <button class="reports-tile" data-csv="complaints" data-icon="⚠️">
          <div class="reports-tile-icon">⚠️</div>
          <div class="reports-tile-title">컴플레인</div>
          <div class="reports-tile-desc">발생일, 분류, 심각도, 해결상태</div>
        </button>
      </div>

      <div class="reports-tip">
        💡 <b>TIP</b>: CSV 파일은 엑셀로 열기 전에 <b>더블클릭</b> 대신
        엑셀에서 <b>파일 → 가져오기</b>로 UTF-8을 선택하면 가장 깔끔하게 열립니다.
      </div>
    </div>
  `;

  const getMonth = () => document.getElementById('reportsMonth').value || thisMonth;

  document.getElementById('reportsThisMonthBtn').onclick = () => {
    document.getElementById('reportsMonth').value = thisMonth;
  };
  document.getElementById('reportsLastMonthBtn').onclick = () => {
    document.getElementById('reportsMonth').value = lastMonth;
  };

  document.getElementById('btnViewReport').onclick = () => {
    const m = getMonth();
    const token = state.token;
    // Use fetch to get HTML with token, then open in new window
    fetchReport(m, false);
  };
  document.getElementById('btnPrintReport').onclick = () => {
    const m = getMonth();
    fetchReport(m, true);
  };

  // CSV tiles
  body.querySelectorAll('[data-csv]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.csv;
      const m = getMonth();
      await downloadCSV(type, m, btn);
    });
  });
}

async function fetchReport(month, autoprint) {
  try {
    toast('보고서 생성 중...', 'info');
    const resp = await fetch(`/api/protected/reports/monthly-report?month=${month}${autoprint ? '&autoprint=1' : ''}`, {
      headers: { 'Authorization': 'Bearer ' + state.token },
    });
    if (!resp.ok) throw new Error('보고서 생성 실패 (' + resp.status + ')');
    const html = await resp.text();
    const w = window.open('', '_blank', 'width=1000,height=900');
    if (!w) {
      toast('팝업이 차단되었습니다. 팝업을 허용해주세요.', 'error');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (e) {
    toast('실패: ' + e.message, 'error');
  }
}

async function downloadCSV(type, month, btn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.style.opacity = '0.6';
  try {
    const resp = await fetch(`/api/protected/reports/csv/${type}?month=${month}`, {
      headers: { 'Authorization': 'Bearer ' + state.token },
    });
    if (!resp.ok) throw new Error('다운로드 실패');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`✓ ${type}_${month}.csv 다운로드 완료`, 'success');
  } catch (e) {
    toast('실패: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = orig;
  }
}

PFM.modules.reports = { renderReports };
})(window.PFM = window.PFM || { modules: {} });
