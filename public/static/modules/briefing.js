/* ═══ 일일 브리핑 모듈 ═══ */
(function() {
'use strict';
const { state, api, esc, ICONS, navigate, canManage } = window.PFM;

function fmtNum(n) { return (n || 0).toLocaleString(); }
function fmtMoney(n) { return n >= 10000 ? (n/10000).toFixed(1) + '만' : fmtNum(n); }

async function renderBriefing(body, actions) {
  body.innerHTML = '<div class="card" style="padding:20px"><div class="loading-spinner">브리핑 생성 중...</div></div>';
  
  try {
    const data = await api('/api/protected/briefing');
    renderBriefingView(body, actions, data);
  } catch(e) {
    body.innerHTML = `<div class="card" style="padding:20px"><p style="color:#ef4444">${esc(e.message)}</p></div>`;
  }
}

function renderBriefingView(body, actions, d) {
  const alertColors = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
  const alertIcons = { complaint: '⚠️', leave: '🏖️', birthday: '🎂', kanban: '📋', consult: '📉' };

  actions.innerHTML = `
    <input type="date" id="briefingDate" value="${d.date}" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px">
  `;

  body.innerHTML = `
    <div class="card" style="padding:24px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;margin-bottom:16px;border-radius:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:12px;opacity:0.8">📋 일일 브리핑</div>
          <h2 style="font-size:22px;font-weight:800;margin:6px 0">${d.date} (${d.dayOfWeek})</h2>
          <div style="font-size:11px;opacity:0.7">생성: ${new Date(d.generatedAt).toLocaleTimeString('ko')}</div>
        </div>
        <div style="font-size:48px">☀️</div>
      </div>
    </div>

    ${d.alerts.length > 0 ? `
    <div class="card" style="padding:16px;margin-bottom:16px;border-left:4px solid #ef4444">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:10px">🔔 주요 알림</h3>
      ${d.alerts.map(a => `
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;padding:8px;background:${a.priority==='high'?'#fef2f2':a.priority==='medium'?'#fffbeb':'#f0f9ff'};border-radius:8px">
          <span style="font-size:16px">${alertIcons[a.type] || '📌'}</span>
          <div>
            <span style="font-size:12px;font-weight:600;color:${alertColors[a.priority]}">${a.priority==='high'?'긴급':a.priority==='medium'?'주의':'참고'}</span>
            <div style="font-size:13px;margin-top:2px">${esc(a.message)}</div>
          </div>
        </div>
      `).join('')}
    </div>` : ''}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">
      <!-- 어제 실적 -->
      <div class="card" style="padding:20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:6px">📊 어제 실적 <span style="font-size:11px;color:#94a3b8;font-weight:400">${d.yesterday.date}</span></h3>
        ${d.yesterday.hasData ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div style="padding:10px;background:#f0fdfa;border-radius:8px;text-align:center">
            <div style="font-size:10px;color:#64748b">매출</div>
            <div style="font-size:18px;font-weight:800;color:#0f766e">${fmtMoney(d.yesterday.revenue)}</div>
          </div>
          <div style="padding:10px;background:#f0f9ff;border-radius:8px;text-align:center">
            <div style="font-size:10px;color:#64748b">환자</div>
            <div style="font-size:18px;font-weight:800;color:#2563eb">${d.yesterday.newPatients + d.yesterday.existingPatients}명</div>
            <div style="font-size:10px;color:#94a3b8">신환 ${d.yesterday.newPatients} / 구환 ${d.yesterday.existingPatients}</div>
          </div>
          <div style="padding:10px;background:#fef3c7;border-radius:8px;text-align:center">
            <div style="font-size:10px;color:#64748b">상담</div>
            <div style="font-size:18px;font-weight:800;color:#d97706">${d.yesterday.consultations}</div>
          </div>
          <div style="padding:10px;background:#f5f3ff;border-radius:8px;text-align:center">
            <div style="font-size:10px;color:#64748b">인바운드콜</div>
            <div style="font-size:18px;font-weight:800;color:#7c3aed">${d.yesterday.inboundCalls}</div>
          </div>
        </div>
        ${d.yesterday.cancels > 0 || d.yesterday.complaints > 0 ? `
        <div style="margin-top:8px;display:flex;gap:8px">
          ${d.yesterday.cancels > 0 ? `<span style="font-size:11px;color:#ef4444;background:#fef2f2;padding:4px 8px;border-radius:6px">취소 ${d.yesterday.cancels}건</span>` : ''}
          ${d.yesterday.complaints > 0 ? `<span style="font-size:11px;color:#ef4444;background:#fef2f2;padding:4px 8px;border-radius:6px">컴플레인 ${d.yesterday.complaints}건</span>` : ''}
        </div>` : ''}
        ` : '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px">어제 기록이 없습니다</p>'}
      </div>

      <!-- 이번 달 누적 -->
      <div class="card" style="padding:20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px">📈 이번 달 누적 <span style="font-size:11px;color:#94a3b8;font-weight:400">${d.monthCumulative.month} (${d.monthCumulative.days}일)</span></h3>
        <div style="text-align:center;margin-bottom:12px">
          <div style="font-size:10px;color:#64748b">누적 매출</div>
          <div style="font-size:26px;font-weight:800;color:#0f766e">${fmtMoney(d.monthCumulative.totalRevenue)}</div>
          ${d.monthCumulative.target > 0 ? `
          <div style="margin-top:6px">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:3px">
              <span>달성률</span><span>${d.monthCumulative.achieveRate}%</span>
            </div>
            <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100, d.monthCumulative.achieveRate)}%;background:${d.monthCumulative.achieveRate >= 100 ? '#10b981' : d.monthCumulative.achieveRate >= 70 ? '#0f766e' : '#f59e0b'};border-radius:4px;transition:width .5s"></div>
            </div>
            <div style="font-size:10px;color:#94a3b8;margin-top:3px">목표: ${fmtMoney(d.monthCumulative.target)}</div>
          </div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
          <div style="padding:6px;background:#f8fafc;border-radius:6px;text-align:center">신환 <b>${d.monthCumulative.newPatients}</b></div>
          <div style="padding:6px;background:#f8fafc;border-radius:6px;text-align:center">구환 <b>${d.monthCumulative.existingPatients}</b></div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">
      <!-- 출근 현황 -->
      <div class="card" style="padding:20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px">👥 오늘 출근 현황</h3>
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:800;color:${d.attendance.rate >= 90 ? '#10b981' : d.attendance.rate >= 70 ? '#f59e0b' : '#ef4444'}">${d.attendance.present}/${d.attendance.shouldWork}</div>
          <div style="font-size:12px;color:#64748b">출근율 ${d.attendance.rate}%</div>
        </div>
      </div>

      <!-- 상담 전환 -->
      <div class="card" style="padding:20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px">💬 이번 달 상담 전환</h3>
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:800;color:${d.consult.confirmRate >= 60 ? '#10b981' : d.consult.confirmRate >= 40 ? '#f59e0b' : '#ef4444'}">${d.consult.confirmRate}%</div>
          <div style="font-size:12px;color:#64748b">${d.consult.monthConfirmed}건 동의 / ${d.consult.monthTotal}건 상담</div>
          ${d.consult.monthAgreed > 0 ? `<div style="font-size:12px;color:#0f766e;margin-top:4px">동의금액 ${fmtMoney(d.consult.monthAgreed)}</div>` : ''}
        </div>
      </div>
    </div>

    ${d.pendingComplaints.length > 0 ? `
    <div class="card" style="padding:20px;margin-bottom:16px;border-left:4px solid #ef4444">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">⚠️ 미해결 컴플레인</h3>
      ${d.pendingComplaints.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;margin-bottom:4px;background:#fef2f2;border-radius:8px;font-size:12px">
          <div>
            <span style="font-weight:600">${esc(c.patient_name)}</span>
            <span style="color:#94a3b8;margin-left:6px">${esc(c.part)} · ${esc(c.category)}</span>
          </div>
          <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${c.severity==='critical'?'#ef4444':c.severity==='high'?'#f59e0b':'#94a3b8'};color:#fff">${c.severity}</span>
        </div>
      `).join('')}
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      ${d.recentNewPatients.length > 0 ? `
      <div class="card" style="padding:20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">🆕 최근 7일 신환</h3>
        ${d.recentNewPatients.map(p => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:12px">
            <span style="font-weight:600">${esc(p.patient_name)}</span>
            <span style="color:#94a3b8">${esc(p.visit_source)} · ${esc(p.treatment_area)} · ${esc(p.first_visit_date)}</span>
          </div>
        `).join('')}
      </div>` : ''}

      ${d.birthdayPatients.length > 0 ? `
      <div class="card" style="padding:20px">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px">🎂 오늘 생일 환자</h3>
        ${d.birthdayPatients.map(p => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:12px">
            <span style="font-weight:600">${esc(p.patient_name)}</span>
            <span style="color:#94a3b8">${esc(p.phone)}</span>
          </div>
        `).join('')}
      </div>` : ''}
    </div>
  `;

  document.getElementById('briefingDate')?.addEventListener('change', async (e) => {
    body.innerHTML = '<div class="card" style="padding:20px"><div class="loading-spinner">브리핑 생성 중...</div></div>';
    try {
      const data = await api('/api/protected/briefing?date=' + e.target.value);
      renderBriefingView(body, actions, data);
    } catch(err) { body.innerHTML = `<div class="card" style="padding:20px"><p style="color:#ef4444">${esc(err.message)}</p></div>`; }
  });
}

window.PFM.modules.briefing = { renderBriefing };
})();
