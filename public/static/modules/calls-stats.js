/* ═══ Module: 콜 통계 대시보드 (Call Statistics Dashboard) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc } = PFM;

// ═══ 공유 데이터 참조 ═══
function getShared() { return PFM._callShared || {}; }

const CALL_PURPOSES_INBOUND = [
  { key: 'reservation', label: '예약', icon: '📅', color: '#3b82f6' },
  { key: 'reservation_change', label: '예약변경', icon: '🔄', color: '#8b5cf6' },
  { key: 'complaint', label: '컴플레인', icon: '⚠️', color: '#ef4444' },
  { key: 'general_inquiry', label: '기타 문의', icon: '💬', color: '#6b7280' },
];

const CALL_PURPOSES_OUTBOUND = [
  { key: 'rebooking', label: '재예약', icon: '🔄', color: '#3b82f6' },
  { key: 'recall', label: '리콜', icon: '📞', color: '#22c55e' },
  { key: 'checkup', label: '정기검진 안내', icon: '🩺', color: '#06b6d4' },
  { key: 'post_surgery', label: '수술후 F/U', icon: '💊', color: '#f59e0b' },
  { key: 'post_consult', label: '상담후 F/U', icon: '💬', color: '#8b5cf6' },
  { key: 'new_patient_fu', label: '신환 F/U', icon: '🔵', color: '#6366f1' },
  { key: 'no_show', label: '부도/노쇼', icon: '⚠️', color: '#ef4444' },
  { key: 'outstanding', label: '미수금 안내', icon: '💰', color: '#ec4899' },
  { key: 'booking_confirm', label: '예약확인', icon: '✅', color: '#10b981' },
  { key: 'treatment_hold', label: '치료중단', icon: '⏸️', color: '#f97316' },
  { key: 'etc', label: '기타', icon: '📝', color: '#94a3b8' },
];

const RESERVATION_STATUS = [
  { key: 'reserved', label: '예약', icon: '✅', color: '#22c55e' },
  { key: 'not_reserved', label: '미예약', icon: '❌', color: '#ef4444' },
  { key: 'no_answer', label: '부재중', icon: '📵', color: '#f59e0b' },
];

function getResStatus(key) {
  return RESERVATION_STATUS.find(r => r.key === key) || { key, label: key || '-', icon: '—', color: '#94a3b8' };
}

function getPurposeIn(key) {
  return CALL_PURPOSES_INBOUND.find(p => p.key === key) || { key, label: key || '-', icon: '📝', color: '#94a3b8' };
}

function getPurposeOut(key) {
  return CALL_PURPOSES_OUTBOUND.find(p => p.key === key) || { key, label: key || '-', icon: '📝', color: '#94a3b8' };
}

// ═══ 바 차트 헬퍼 ═══
function renderBar(label, count, total, color) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:4px">' +
    '<span style="width:80px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(label) + '</span>' +
    '<div style="flex:1;background:var(--bg);border-radius:4px;height:18px;overflow:hidden">' +
      '<div style="height:100%;background:' + color + ';border-radius:4px;width:' + Math.max(pct, 3) + '%;transition:width 0.3s"></div>' +
    '</div>' +
    '<span style="width:45px;text-align:right;font-weight:700">' + count + '건</span>' +
    '<span style="width:35px;text-align:right;color:var(--text-muted);font-size:11px">' + pct + '%</span>' +
  '</div>';
}

// ═══ 메인 렌더링 ═══
async function renderCallsStats(body, actions) {
  const now = new Date();
  let currentMonth = now.toISOString().slice(0, 7);

  actions.innerHTML = '';
  body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

  async function loadStats(month) {
    currentMonth = month;
    body.innerHTML = '<div class="mod-empty"><span class="loading-spinner"></span></div>';

    try {
      const [inStats, outStats] = await Promise.all([
        api('/api/protected/calls/stats?type=inbound&month=' + month),
        api('/api/protected/calls/stats?type=outbound&month=' + month),
      ]);
      renderDashboard(inStats, outStats, month);
    } catch (e) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444">통계를 불러올 수 없습니다</div>';
    }
  }

  function renderDashboard(inStats, outStats, month) {
    const [y, m] = month.split('-').map(Number);
    const prevMonth = m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
    const nextMonth = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');

    const totalAll = inStats.total + outStats.total;

    // 인바운드 예약률
    const inReserved = (inStats.byReservation || []).find(function(r) { return r.reservation_status === 'reserved'; });
    const inReservedCount = inReserved ? inReserved.c : 0;
    const inResRate = inStats.total > 0 ? Math.round(inReservedCount / inStats.total * 100) : 0;

    // 아웃바운드 예약률
    const outReserved = (outStats.byReservation || []).find(function(r) { return r.reservation_status === 'reserved'; });
    const outReservedCount = outReserved ? outReserved.c : 0;
    const outResRate = outStats.total > 0 ? Math.round(outReservedCount / outStats.total * 100) : 0;

    // 전체 예약률
    const totalReserved = inReservedCount + outReservedCount;
    const overallResRate = totalAll > 0 ? Math.round(totalReserved / totalAll * 100) : 0;

    body.innerHTML = `
      <!-- 월 네비게이션 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <button class="btn btn-sm" id="csPrevMonth">◀ ${prevMonth.split('-')[1]}월</button>
        <h3 style="margin:0;font-size:20px;font-weight:900">📊 ${y}년 ${m}월 콜 통계</h3>
        <button class="btn btn-sm" id="csNextMonth">${nextMonth.split('-')[1]}월 ▶</button>
      </div>

      <!-- 전체 요약 카드 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:24px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">📞 전체 콜</div>
          <div style="font-size:30px;font-weight:900;color:var(--primary)">${totalAll}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">📞 인바운드</div>
          <div style="font-size:30px;font-weight:900;color:#3b82f6">${inStats.total}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">📱 아웃바운드</div>
          <div style="font-size:30px;font-weight:900;color:#8b5cf6">${outStats.total}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">✅ 전체 예약률</div>
          <div style="font-size:30px;font-weight:900;color:${overallResRate >= 50 ? '#22c55e' : '#ef4444'}">${overallResRate}%</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">📞 인바운드 예약률</div>
          <div style="font-size:30px;font-weight:900;color:${inResRate >= 50 ? '#22c55e' : '#ef4444'}">${inResRate}%</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:center">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">📱 아웃바운드 예약률</div>
          <div style="font-size:30px;font-weight:900;color:${outResRate >= 30 ? '#22c55e' : '#ef4444'}">${outResRate}%</div>
        </div>
      </div>

      <!-- 2열 레이아웃: 인바운드 vs 아웃바운드 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

        <!-- ═══ 인바운드 섹션 ═══ -->
        <div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">
            <h4 style="margin:0 0 14px;font-size:14px;font-weight:800;display:flex;align-items:center;gap:6px">
              <span style="background:#3b82f6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">IN</span> 인바운드 예약 현황
            </h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${(inStats.byReservation || []).map(function(r) {
                var rs = getResStatus(r.reservation_status);
                var pct = inStats.total > 0 ? Math.round(r.c / inStats.total * 100) : 0;
                return '<div style="flex:1;min-width:70px;background:' + rs.color + '10;border:1px solid ' + rs.color + '30;border-radius:10px;padding:10px;text-align:center">' +
                  '<div style="font-size:16px">' + rs.icon + '</div>' +
                  '<div style="font-size:20px;font-weight:900;color:' + rs.color + '">' + r.c + '</div>' +
                  '<div class="mod-muted-xs">' + rs.label + ' (' + pct + '%)</div>' +
                '</div>';
              }).join('')}
            </div>
          </div>

          <!-- 인바운드 콜 목적별 -->
          ${(inStats.byPurpose && inStats.byPurpose.length > 0) ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">' +
            '<h4 class="mod-title">📅 인바운드 콜 목적별</h4>' +
            '<div>' + inStats.byPurpose.map(function(p) {
              var purp = getPurposeIn(p.call_purpose);
              return renderBar(purp.icon + ' ' + purp.label, p.c, inStats.total, purp.color);
            }).join('') + '</div>' +
          '</div>' : ''}

          <!-- 인바운드 상담원별 -->
          ${(inStats.byStaff && inStats.byStaff.length > 0) ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">' +
            '<h4 class="mod-title">👤 인바운드 상담원별</h4>' +
            '<div>' + inStats.byStaff.slice(0, 15).map(function(s) {
              return renderBar(s.staff_name, s.c, inStats.total, '#3b82f6');
            }).join('') + '</div>' +
          '</div>' : ''}

          <!-- 인바운드 관심진료별 -->
          ${(inStats.byTreatment && inStats.byTreatment.length > 0) ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">' +
            '<h4 class="mod-title">🏥 인바운드 관심 진료별</h4>' +
            '<div>' + inStats.byTreatment.map(function(t) {
              var shared = getShared();
              var treat = (shared.getTreatment ? shared.getTreatment(t.treatment_interest) : { label: t.treatment_interest, color: '#6b7280' });
              return renderBar(treat.label, t.c, inStats.total, treat.color);
            }).join('') + '</div>' +
          '</div>' : ''}
        </div>

        <!-- ═══ 아웃바운드 섹션 ═══ -->
        <div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">
            <h4 style="margin:0 0 14px;font-size:14px;font-weight:800;display:flex;align-items:center;gap:6px">
              <span style="background:#8b5cf6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">OUT</span> 아웃바운드 예약 현황
            </h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${(outStats.byReservation || []).map(function(r) {
                var rs = getResStatus(r.reservation_status);
                var pct = outStats.total > 0 ? Math.round(r.c / outStats.total * 100) : 0;
                return '<div style="flex:1;min-width:70px;background:' + rs.color + '10;border:1px solid ' + rs.color + '30;border-radius:10px;padding:10px;text-align:center">' +
                  '<div style="font-size:16px">' + rs.icon + '</div>' +
                  '<div style="font-size:20px;font-weight:900;color:' + rs.color + '">' + r.c + '</div>' +
                  '<div class="mod-muted-xs">' + rs.label + ' (' + pct + '%)</div>' +
                '</div>';
              }).join('')}
            </div>
          </div>

          <!-- 아웃바운드 통화목적별 -->
          ${(outStats.byPurpose && outStats.byPurpose.length > 0) ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">' +
            '<h4 class="mod-title">📱 아웃바운드 통화 목적별</h4>' +
            '<div>' + outStats.byPurpose.map(function(p) {
              var purp = getPurposeOut(p.call_purpose);
              return renderBar(purp.icon + ' ' + purp.label, p.c, outStats.total, purp.color);
            }).join('') + '</div>' +
          '</div>' : ''}

          <!-- 아웃바운드 응대자별 -->
          ${(outStats.byStaff && outStats.byStaff.length > 0) ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">' +
            '<h4 class="mod-title">👤 아웃바운드 응대자별</h4>' +
            '<div>' + outStats.byStaff.slice(0, 15).map(function(s) {
              return renderBar(s.staff_name, s.c, outStats.total, '#8b5cf6');
            }).join('') + '</div>' +
          '</div>' : ''}

          <!-- 아웃바운드 관심진료별 -->
          ${(outStats.byTreatment && outStats.byTreatment.length > 0) ? '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:16px">' +
            '<h4 class="mod-title">🏥 아웃바운드 관심 진료별</h4>' +
            '<div>' + outStats.byTreatment.map(function(t) {
              var shared = getShared();
              var treat = (shared.getTreatment ? shared.getTreatment(t.treatment_interest) : { label: t.treatment_interest, color: '#6b7280' });
              return renderBar(treat.label, t.c, outStats.total, treat.color);
            }).join('') + '</div>' +
          '</div>' : ''}
        </div>

      </div>

      <!-- 신/구환 비율 (인바운드 + 아웃바운드 합산) -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-top:16px">
        <h4 class="mod-title">🏷️ 신/구환 분포</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:700">📞 인바운드</div>
            ${(inStats.byPatientType || []).map(function(pt) {
              var color = pt.patient_type === 'new' ? '#3b82f6' : '#22c55e';
              var label = pt.patient_type === 'new' ? '🔵 신환' : '🟢 구환';
              return renderBar(label, pt.c, inStats.total, color);
            }).join('')}
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:700">📱 아웃바운드</div>
            ${(outStats.byPatientType || []).map(function(pt) {
              var color = pt.patient_type === 'new' ? '#3b82f6' : '#22c55e';
              var label = pt.patient_type === 'new' ? '🔵 신환' : '🟢 구환';
              return renderBar(label, pt.c, outStats.total, color);
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // 이벤트
    document.getElementById('csPrevMonth').addEventListener('click', function() { loadStats(prevMonth); });
    document.getElementById('csNextMonth').addEventListener('click', function() { loadStats(nextMonth); });
  }

  await loadStats(currentMonth);
}

// ═══ 모듈 등록 ═══
PFM.modules.callsStats = { renderCallsStats: renderCallsStats };

})(window.PFM);
