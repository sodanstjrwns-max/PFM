/* ═══ Module: KPI System - 월간 목표 + 일간 기록 ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, navigate } = PFM;

const DAY_NAMES = { mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일' };

// KPI 전용 숫자 포맷 (0도 "0"으로 표시, 천단위 콤마)
function fmtNum(n) {
  if (n === null || n === undefined) return '-';
  const num = Math.round(n);
  return num.toLocaleString('ko-KR');
}

// 병원 핵심진료/지역 설정 가져오기
async function getHospitalConfig() {
  try {
    const s = await api('/api/protected/hospital/settings');
    return {
      treatments: (s.core_treatments || []).map((t,i) => ({ ...t, key: t.key || `core${i+1}` })),
      regions: (s.core_regions || []).map((r,i) => ({ ...r, key: r.key || `region_${i}` })),
    };
  } catch(e) {
    return {
      treatments: [{ key:'core1', label:'핵심진료 1', name:'' },{ key:'core2', label:'핵심진료 2', name:'' },{ key:'core3', label:'핵심진료 3', name:'' }],
      regions: [{ key:'region_core', label:'핵심 지역', name:'' },{ key:'region_expand', label:'확장 지역', name:'' },{ key:'region_adjacent', label:'인접 지역', name:'' },{ key:'region_other', label:'그 외 지역', name:'그외' }],
    };
  }
}

/* ═══ KPI 대시보드 ═══ */
async function renderKpiDashboard(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = isManager ? `
    <button class="btn btn-sm" onclick="PFM.navigate('kpi_daily')" style="margin-right:6px">📝 일간 기록</button>
    <button class="btn btn-primary btn-sm" onclick="PFM.navigate('kpi_targets')">🎯 목표 설정</button>
  ` : `<button class="btn btn-primary btn-sm" onclick="PFM.navigate('kpi_daily')">📝 일간 기록</button>`;
  
  body.innerHTML = `<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>`;
  
  async function loadDashboard(month) {
    currentMonth = month;
    const cfg = await getHospitalConfig();
    const data = await api(`/api/protected/kpi/dashboard?month=${month}`);
    renderKpiDashboardContent(body, data, cfg, month, isManager, loadDashboard);
  }
  
  try { await loadDashboard(currentMonth); } catch(e) {
    body.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:16px">📊</div>
      <h3>KPI 데이터가 없습니다</h3>
      <p style="margin:8px 0 20px">먼저 월간 목표를 설정하고, 일간 기록을 입력해주세요.</p>
      ${isManager ? '<button class="btn btn-primary" onclick="PFM.navigate(\'kpi_targets\')">🎯 목표 설정하기</button>' : ''}
    </div>`;
  }
}

function renderKpiDashboardContent(body, data, cfg, month, isManager, reload) {
  const { target, daily, summary, dowInfo, totalMonthHours } = data;
  const t = target || {};
  const s = summary || {};
  
  // 월 네비게이션
  const prevMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const nextMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7); })();
  const displayMonth = month.replace('-', '년 ') + '월';
  
  // 치료명 라벨
  const tNames = cfg.treatments.map(t => t.name || t.label);
  const rNames = cfg.regions.map(r => r.name || r.label);
  
  // 달성률 색상
  const rateColor = s.achieve_rate >= 100 ? '#22c55e' : s.achieve_rate >= 80 ? '#f59e0b' : '#ef4444';
  
  body.innerHTML = `
    <!-- 월 선택 -->
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:20px">
      <button class="btn btn-sm" id="kpiPrev">◀</button>
      <h2 style="margin:0;font-size:20px;font-weight:800">📊 ${displayMonth} KPI</h2>
      <button class="btn btn-sm" id="kpiNext">▶</button>
    </div>

    ${!target ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;font-size:13px;color:#92400e">
      ⚠️ 이달 목표가 설정되지 않았습니다. ${isManager ? '<a href="#" id="goSetTarget" style="color:#1d4ed8;text-decoration:underline">목표 설정하기 →</a>' : '관리자에게 문의하세요.'}
    </div>` : ''}

    <!-- 핵심 지표 카드 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;position:relative;overflow:hidden">
        <div style="position:absolute;right:8px;top:8px;font-size:24px;opacity:0.15">💰</div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">누적 매출</div>
        <div style="font-size:24px;font-weight:900;color:#3b82f6;margin:4px 0">${fmtNum(s.cum_revenue||0)}만</div>
        <div style="font-size:11px;color:var(--text-muted)">목표 ${fmtNum(t.target_revenue||0)}만</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;position:relative;overflow:hidden">
        <div style="position:absolute;right:8px;top:8px;font-size:24px;opacity:0.15">🎯</div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">달성률</div>
        <div style="font-size:24px;font-weight:900;color:${rateColor};margin:4px 0">${s.achieve_rate||0}%</div>
        <div style="font-size:11px;color:var(--text-muted)">${s.days_recorded||0}일 기록</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;position:relative;overflow:hidden">
        <div style="position:absolute;right:8px;top:8px;font-size:24px;opacity:0.15">${s.cum_diff >= 0 ? '📈' : '📉'}</div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">목표 대비</div>
        <div style="font-size:24px;font-weight:900;color:${s.cum_diff >= 0 ? '#22c55e' : '#ef4444'};margin:4px 0">${s.cum_diff >= 0 ? '+' : ''}${fmtNum(s.cum_diff||0)}만</div>
        <div style="font-size:11px;color:var(--text-muted)">차이 누계</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;position:relative;overflow:hidden">
        <div style="position:absolute;right:8px;top:8px;font-size:24px;opacity:0.15">👥</div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">누적 신환</div>
        <div style="font-size:24px;font-weight:900;color:#8b5cf6;margin:4px 0">${s.cum_new_patients||0}명</div>
        <div style="font-size:11px;color:var(--text-muted)">비급여 ${fmtNum(s.cum_non_insurance||0)}만</div>
      </div>
    </div>

    ${(dowInfo && dowInfo.length > 0 && target) ? `
    <!-- 요일별 목표 (진료시간 비례) -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:24px">
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:10px">🕐 요일별 목표 <span style="font-weight:500">(진료시간 ${totalMonthHours||0}h 비례)</span></div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
        ${(() => {
          const dowNames = {mon:'월',tue:'화',wed:'수',thu:'목',fri:'금',sat:'토',sun:'일'};
          const order = ['mon','tue','wed','thu','fri','sat','sun'];
          return order.map(d => {
            const info = (dowInfo||[]).find(i => i.dow === d) || {hours:0,days:0,dayTarget:0};
            const isOff = info.hours <= 0;
            return `<div style="text-align:center;padding:8px 2px;background:${isOff ? 'var(--bg-hover)' : d==='sat'?'#dbeafe22':d==='sun'?'#fee2e222':'#f0fdf422'};border-radius:8px;border:1px solid var(--border-light)">
              <div style="font-size:11px;font-weight:800;color:${isOff?'#94a3b8':d==='sat'?'#1d4ed8':d==='sun'?'#dc2626':'var(--text)'}">${dowNames[d]}</div>
              <div style="font-size:13px;font-weight:900;color:${isOff?'#cbd5e1':'#3b82f6'};margin:2px 0">${isOff?'휴':fmtNum(info.dayTarget)}</div>
              <div style="font-size:9px;color:var(--text-muted)">${isOff?'휴진':info.hours+'h'}</div>
            </div>`;
          }).join('');
        })()}
      </div>
    </div>
    ` : ''}

    ${daily.length > 0 ? `
    <!-- 일별 매출 차트 (전체 월간 캘린더형) -->
    <div class="section-title">📈 <span>일별 매출 추이</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:24px">
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px">
        <div id="kpiChart" style="position:relative"></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border-light);font-size:11px;color:var(--text-muted)">
        <span><span style="display:inline-block;width:10px;height:10px;background:#3b82f6;border-radius:2px;vertical-align:middle;margin-right:3px"></span>목표 달성</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#f87171;border-radius:2px;vertical-align:middle;margin-right:3px"></span>목표 미달</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#a5b4fc;border-radius:2px;vertical-align:middle;margin-right:3px"></span>휴진일 매출(보너스)</span>
        <span><span style="display:inline-block;width:10px;height:2px;background:#f59e0b;vertical-align:middle;margin-right:3px"></span>목표선</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:2px;vertical-align:middle;margin-right:3px"></span>기록 없음</span>
      </div>
    </div>

    <!-- 누적 매출 진행률 바 -->
    <div class="section-title">🏃 <span>달성 진행률</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px">
        <span style="font-weight:700">${fmtNum(s.cum_revenue||0)}만</span>
        <span style="color:var(--text-muted)">목표 ${fmtNum(t.target_revenue||0)}만</span>
      </div>
      <div style="background:var(--border-light);border-radius:8px;height:24px;overflow:hidden;position:relative">
        <div style="background:linear-gradient(90deg,#3b82f6,#8b5cf6);height:100%;border-radius:8px;width:${Math.min(100, s.achieve_rate||0)}%;transition:width .5s"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${(s.achieve_rate||0) > 50 ? 'white' : 'var(--text)'}">${s.achieve_rate||0}%</div>
      </div>
    </div>

    <!-- 일별 상세 테이블 -->
    <div class="section-title">📋 <span>일별 상세 기록</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 12px;text-align:left;font-weight:700;border-bottom:2px solid var(--border)">날짜</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">목표</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">실제</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">차이</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">누적</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">신환</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">상담</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">리뷰</th>
          </tr>
        </thead>
        <tbody>
          ${daily.map(d => {
            const dateStr = d.record_date.slice(5);
            const dow = DAY_NAMES[d.day_of_week] || '';
            const isWeekend = ['sat','sun'].includes(d.day_of_week);
            const isOff = d.day_target === 0;
            const diffColor = d.diff >= 0 ? '#22c55e' : '#ef4444';
            return `<tr style="border-bottom:1px solid var(--border-light)${isWeekend ? ';background:rgba(99,102,241,0.03)' : ''}">
              <td style="padding:8px 12px;font-weight:600">${dateStr} ${dow}${isOff ? ' <span style="font-size:9px;background:#f1f5f9;color:#94a3b8;padding:1px 5px;border-radius:4px">휴</span>' : ''}</td>
              <td style="padding:8px;text-align:right;color:var(--text-muted)">${isOff ? '<span style="color:#cbd5e1">-</span>' : fmtNum(d.day_target)}</td>
              <td style="padding:8px;text-align:right;font-weight:700">${fmtNum(d.total_revenue)}</td>
              <td style="padding:8px;text-align:right;color:${isOff ? '#8b5cf6' : diffColor};font-weight:600">${isOff ? '+' + fmtNum(d.total_revenue) + ' ★' : (d.diff >= 0 ? '+' : '') + fmtNum(d.diff)}</td>
              <td style="padding:8px;text-align:right;color:${d.cum_diff >= 0 ? '#22c55e' : '#ef4444'}">${d.cum_diff >= 0 ? '+' : ''}${fmtNum(d.cum_diff)}</td>
              <td style="padding:8px;text-align:right">${d.new_patients||0}</td>
              <td style="padding:8px;text-align:right">${d.total_consultations||0}</td>
              <td style="padding:8px;text-align:right">${d.naver_reviews||0}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : `<div style="text-align:center;padding:40px;color:var(--text-muted)"><p>아직 기록된 데이터가 없습니다.<br>일간 기록을 입력해주세요.</p></div>`}
  `;

  // ════ 차트 렌더 (전체 월간 캘린더형 차트) ════
  if (daily.length > 0) {
    const chartEl = document.getElementById('kpiChart');
    if (!chartEl) return;
    
    // 해당 월의 전체 날짜 생성
    const [yr, mn] = month.split('-').map(Number);
    const daysInMonth = new Date(yr, mn, 0).getDate();
    const jsKeys = ['sun','mon','tue','wed','thu','fri','sat'];
    const dailyMap = {};
    daily.forEach(d => { dailyMap[d.record_date] = d; });
    
    // dowInfo에서 요일별 목표 가져오기
    const dowTargetMap = {};
    (dowInfo || []).forEach(d => { dowTargetMap[d.dow] = d; });
    
    // 전체 날짜 배열 생성
    const allDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(yr, mn - 1, day);
      const dateStr = `${yr}-${String(mn).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dowKey = jsKeys[dateObj.getDay()];
      const dowLabel = DAY_NAMES[dowKey] || '';
      const info = dowTargetMap[dowKey] || { hours: 0, dayTarget: 0 };
      const record = dailyMap[dateStr];
      allDays.push({
        day, dateStr, dowKey, dowLabel,
        isOff: info.hours <= 0,
        hours: info.hours || 0,
        dayTarget: info.dayTarget || 0,
        record: record || null,
        revenue: record ? record.total_revenue : null,
        diff: record ? record.diff : null,
      });
    }
    
    // 차트 사이즈 설정 (모바일 대응)
    const containerW = chartEl.parentElement.clientWidth - 8;
    const colW = Math.max(24, Math.min(38, Math.floor((containerW - 10) / daysInMonth) - 2));
    const gap = 2;
    const chartH = 160;
    const topLabelH = 18;
    const bottomLabelH = 30;
    const totalH = chartH + topLabelH + bottomLabelH;
    const totalW = daysInMonth * (colW + gap) + gap;
    
    // 최대값 계산 (기록된 매출 + 목표 중 최대)
    const maxVal = Math.max(
      1,
      ...allDays.map(d => Math.max(d.revenue || 0, d.dayTarget || 0))
    );
    
    // 주 구분선 위치 (월요일 시작)
    const weekStarts = allDays.filter((d,i) => d.dowKey === 'mon' && i > 0).map(d => d.day);
    
    let html = `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="display:block;min-width:${totalW}px" xmlns="http://www.w3.org/2000/svg">`;
    
    // 배경 + 주 구분선
    html += `<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="transparent"/>`;
    weekStarts.forEach(d => {
      const x = (d - 1) * (colW + gap) + gap / 2;
      html += `<line x1="${x}" y1="${topLabelH}" x2="${x}" y2="${topLabelH + chartH}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>`;
    });
    
    // 눈금선 (25%, 50%, 75%)
    [0.25, 0.5, 0.75].forEach(pct => {
      const y = topLabelH + chartH - (chartH * pct);
      html += `<line x1="0" y1="${y}" x2="${totalW}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
      html += `<text x="2" y="${y - 2}" fill="#94a3b8" font-size="8" font-family="sans-serif">${fmtNum(Math.round(maxVal * pct))}</text>`;
    });
    
    // 목표선 (SVG polyline으로 연결)
    let targetPoints = [];
    allDays.forEach((d, i) => {
      if (d.dayTarget > 0) {
        const cx = i * (colW + gap) + gap + colW / 2;
        const cy = topLabelH + chartH - (d.dayTarget / maxVal * chartH);
        targetPoints.push(`${cx},${cy}`);
      }
    });
    if (targetPoints.length > 1) {
      html += `<polyline points="${targetPoints.join(' ')}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,2" opacity="0.7"/>`;
    }
    // 목표 점
    allDays.forEach((d, i) => {
      if (d.dayTarget > 0) {
        const cx = i * (colW + gap) + gap + colW / 2;
        const cy = topLabelH + chartH - (d.dayTarget / maxVal * chartH);
        html += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="#f59e0b" opacity="0.6"/>`;
      }
    });
    
    // 바 렌더링
    allDays.forEach((d, i) => {
      const x = i * (colW + gap) + gap;
      const barBase = topLabelH + chartH;
      
      // 배경 스트라이프 (주말/휴진)
      if (d.isOff) {
        html += `<rect x="${x - 1}" y="${topLabelH}" width="${colW + 2}" height="${chartH}" fill="#f8fafc" rx="2"/>`;
      } else if (d.dowKey === 'sat') {
        html += `<rect x="${x - 1}" y="${topLabelH}" width="${colW + 2}" height="${chartH}" fill="#eff6ff" rx="2" opacity="0.5"/>`;
      }
      
      if (d.revenue !== null) {
        // 기록 있음 → 바 그리기
        const barH = Math.max(2, (d.revenue / maxVal) * chartH);
        let barColor;
        if (d.isOff) barColor = '#a5b4fc'; // 휴진일 보너스
        else if (d.diff >= 0) barColor = '#3b82f6'; // 목표 달성
        else barColor = '#f87171'; // 미달
        
        const barY = barBase - barH;
        html += `<rect x="${x}" y="${barY}" width="${colW}" height="${barH}" fill="${barColor}" rx="3" opacity="0.85">`;
        html += `<title>${d.dateStr} (${d.dowLabel}) | 실적: ${fmtNum(d.revenue)}만 | 목표: ${d.isOff ? '휴진' : fmtNum(d.dayTarget) + '만'}</title>`;
        html += `</rect>`;
        
        // 바 위 숫자 (공간이 충분할 때만)
        if (colW >= 28) {
          const numColor = d.isOff ? '#6366f1' : d.diff >= 0 ? '#16a34a' : '#dc2626';
          const numY = barY - 3;
          if (numY > topLabelH + 5) {
            html += `<text x="${x + colW/2}" y="${numY}" text-anchor="middle" fill="${numColor}" font-size="8" font-weight="700" font-family="sans-serif">${Math.round(d.revenue / 100) / 10}</text>`;
          }
        }
      } else {
        // 기록 없음 → 빈 칸 표시 (오늘 이전만)
        const today = new Date().toISOString().slice(0,10);
        if (d.dateStr <= today && !d.isOff) {
          html += `<rect x="${x}" y="${barBase - 3}" width="${colW}" height="3" fill="#e2e8f0" rx="1"/>`;
        }
      }
      
      // 하단 라벨 (날짜)
      const labelY = barBase + 12;
      const dowColor = d.dowKey === 'sun' ? '#dc2626' : d.dowKey === 'sat' ? '#1d4ed8' : '#64748b';
      const dayFontW = d.day === new Date().getDate() && month === new Date().toISOString().slice(0,7) ? '800' : '600';
      html += `<text x="${x + colW/2}" y="${labelY}" text-anchor="middle" fill="${d.isOff ? '#94a3b8' : 'var(--text)'}" font-size="10" font-weight="${dayFontW}" font-family="sans-serif">${d.day}</text>`;
      html += `<text x="${x + colW/2}" y="${labelY + 11}" text-anchor="middle" fill="${dowColor}" font-size="8" font-weight="500" font-family="sans-serif">${d.dowLabel}</text>`;
      
      // 오늘 표시
      if (d.dateStr === new Date().toISOString().slice(0,10)) {
        html += `<circle cx="${x + colW/2}" cy="${labelY + 16}" r="2" fill="#3b82f6"/>`;
      }
    });
    
    html += `</svg>`;
    chartEl.innerHTML = html;
  }

  // 이벤트
  document.getElementById('kpiPrev')?.addEventListener('click', () => reload(prevMonth));
  document.getElementById('kpiNext')?.addEventListener('click', () => reload(nextMonth));
  document.getElementById('goSetTarget')?.addEventListener('click', (e) => { e.preventDefault(); navigate('kpi_targets'); });
}

/* ═══ 일간 기록 입력 ═══ */
async function renderKpiDaily(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  actions.innerHTML = `<button class="btn btn-sm" onclick="PFM.navigate('kpi_dashboard')">📊 대시보드</button>`;
  
  const cfg = await getHospitalConfig();
  const today = new Date().toISOString().slice(0,10);
  let selectedDate = today;
  
  body.innerHTML = `<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>`;
  
  async function loadRecord(date) {
    selectedDate = date;
    const record = await api(`/api/protected/kpi/daily?date=${date}`);
    renderDailyForm(body, record, cfg, date, loadRecord, isManager);
  }
  
  await loadRecord(today);
}

function renderDailyForm(body, record, cfg, date, reload, isManager) {
  const r = record || {};
  const tNames = cfg.treatments.map(t => t.name || t.label);
  const rNames = cfg.regions.map(r => r.name || r.label);
  const dow = ['일','월','화','수','목','금','토'][new Date(date + 'T00:00:00').getDay()];
  const dateDisplay = `${date.slice(5).replace('-','/')} (${dow})`;
  
  function inp(name, val, placeholder, w) {
    return `<input type="number" name="${name}" value="${val||''}" placeholder="${placeholder||'0'}" style="width:${w||'70px'};padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:13px;text-align:right;background:var(--bg-card)" min="0" step="any">`;
  }

  function row(label, name, val, unit) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light)">
      <span style="font-size:13px;color:var(--text)">${label}</span>
      <div style="display:flex;align-items:center;gap:4px">${inp(name, val, '0', '80px')}<span style="font-size:11px;color:var(--text-muted);width:20px">${unit||''}</span></div>
    </div>`;
  }
  
  function section(title, icon) {
    return `<div style="font-size:14px;font-weight:800;color:var(--primary);margin:20px 0 8px;display:flex;align-items:center;gap:6px">${icon} ${title}</div>`;
  }

  body.innerHTML = `
    <!-- 날짜 선택 -->
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:20px">
      <button class="btn btn-sm" id="drPrev">◀</button>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="date" id="drDate" value="${date}" style="padding:8px 12px;border:1px solid var(--border);border-radius:10px;font-size:14px;font-weight:700">
        <span style="font-size:14px;font-weight:600;color:var(--text-muted)">${dow}요일</span>
      </div>
      <button class="btn btn-sm" id="drNext">▶</button>
    </div>
    ${record ? `<div style="text-align:center;margin-bottom:12px"><span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600">✅ 기록됨</span></div>` : ''}

    <form id="dailyForm" style="max-width:500px;margin:0 auto">
      ${section('매출 관련', '💰')}
      ${row('비급여 매출', 'revenue_non_insurance', r.revenue_non_insurance, '만')}
      ${row('공단청구(급여)', 'revenue_insurance', r.revenue_insurance, '만')}
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;background:var(--bg-hover);border-radius:8px;padding:8px 12px;margin-top:4px">
        <span style="font-size:13px;font-weight:700">전체 매출</span>
        <span style="font-size:16px;font-weight:900;color:#3b82f6" id="totalRevenue">${fmtNum((r.revenue_non_insurance||0)+(r.revenue_insurance||0))}만</span>
      </div>

      ${section('환자수 관련', '👥')}
      ${row('구환수', 'existing_patients', r.existing_patients, '명')}
      ${row('신환수', 'new_patients', r.new_patients, '명')}

      ${section('신환 진료별', '🦷')}
      ${row(`${tNames[0]} 신환`, 'core_treatment_1_new', r.core_treatment_1_new, '명')}
      ${row(`${tNames[1]} 신환`, 'core_treatment_2_new', r.core_treatment_2_new, '명')}
      ${row(`${tNames[2]} 신환`, 'core_treatment_3_new', r.core_treatment_3_new, '명')}

      ${section('신환 지역별', '📍')}
      ${row(`${rNames[0]}`, 'region_core_new', r.region_core_new, '명')}
      ${row(`${rNames[1]}`, 'region_expand_new', r.region_expand_new, '명')}
      ${row(`${rNames[2]}`, 'region_adjacent_new', r.region_adjacent_new, '명')}
      ${row(`${rNames[3]}`, 'region_other_new', r.region_other_new, '명')}

      ${section('신환 유입별', '🔗')}
      ${row('소개 신환', 'referral_new', r.referral_new, '명')}
      ${row('온라인 신환', 'online_new', r.online_new, '명')}
      ${row('기타 신환', 'etc_new', r.etc_new, '명')}

      ${section('진료 관련', '⚕️')}
      ${row(`${tNames[0]} 진행수`, 'core_treatment_1_count', r.core_treatment_1_count, '건')}
      ${row(`${tNames[1]} 진행수`, 'core_treatment_2_count', r.core_treatment_2_count, '건')}
      ${row(`${tNames[2]} 진행수`, 'core_treatment_3_count', r.core_treatment_3_count, '건')}

      ${section('상담 관련', '💬')}
      ${row('전체 상담수', 'total_consultations', r.total_consultations, '건')}
      ${row(`${tNames[0]} 상담`, 'core_treat_1_consult', r.core_treat_1_consult, '건')}
      ${row(`${tNames[0]} 동의`, 'core_treat_1_agree', r.core_treat_1_agree, '건')}
      ${row(`${tNames[1]} 상담`, 'core_treat_2_consult', r.core_treat_2_consult, '건')}
      ${row(`${tNames[1]} 동의`, 'core_treat_2_agree', r.core_treat_2_agree, '건')}
      ${row(`${tNames[2]} 상담`, 'core_treat_3_consult', r.core_treat_3_consult, '건')}
      ${row(`${tNames[2]} 동의`, 'core_treat_3_agree', r.core_treat_3_agree, '건')}
      ${row('소개 감사 연락', 'referral_thanks', r.referral_thanks, '건')}

      ${section('기타 사항', '📞')}
      ${row('인바운드콜', 'inbound_calls', r.inbound_calls, '건')}
      ${row('아웃바운드콜', 'outbound_calls', r.outbound_calls, '건')}
      ${row('예약 취소 수', 'cancel_count', r.cancel_count, '건')}
      ${row('컴플레인', 'complaint_count', r.complaint_count, '건')}
      ${row('평균 대기시간', 'avg_wait_time', r.avg_wait_time, '분')}
      ${row('네이버 리뷰', 'naver_reviews', r.naver_reviews, '건')}

      <div style="margin-top:24px;display:flex;gap:10px">
        <button type="submit" class="btn btn-primary" style="flex:1;padding:14px;font-size:15px;font-weight:800">
          💾 ${record ? '수정 저장' : '기록 저장'}
        </button>
      </div>
    </form>
  `;

  // 전체 매출 자동 계산
  const form = document.getElementById('dailyForm');
  ['revenue_non_insurance','revenue_insurance'].forEach(n => {
    form.querySelector(`[name="${n}"]`)?.addEventListener('input', () => {
      const ni = parseFloat(form.querySelector('[name="revenue_non_insurance"]').value) || 0;
      const ins = parseFloat(form.querySelector('[name="revenue_insurance"]').value) || 0;
      document.getElementById('totalRevenue').textContent = fmtNum(ni + ins) + '만';
    });
  });

  // 날짜 이동
  const shift = (days) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    reload(d.toISOString().slice(0,10));
  };
  document.getElementById('drPrev')?.addEventListener('click', () => shift(-1));
  document.getElementById('drNext')?.addEventListener('click', () => shift(1));
  document.getElementById('drDate')?.addEventListener('change', (e) => reload(e.target.value));

  // 저장
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = { record_date: selectedDate };
    for (const [k,v] of fd.entries()) {
      data[k] = v === '' || v === 'x' ? 0 : parseFloat(v) || 0;
    }
    try {
      await api('/api/protected/kpi/daily', { method:'POST', json: data }) ;
      toast(record ? '✅ 기록이 수정되었습니다' : '✅ 기록이 저장되었습니다');
      reload(selectedDate);
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
}

/* ═══ 월간 목표 설정 ═══ */
async function renderKpiTargets(body, actions) {
  actions.innerHTML = `<button class="btn btn-sm" onclick="PFM.navigate('kpi_dashboard')">📊 대시보드</button>`;
  
  const now = new Date();
  let selectedMonth = now.toISOString().slice(0,7);
  let hospitalConfig = null;
  
  body.innerHTML = `<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>`;
  
  try {
    hospitalConfig = await api('/api/protected/hospital/settings');
  } catch(e) {}
  
  async function loadTarget(month) {
    selectedMonth = month;
    const [target, targets] = await Promise.all([
      api(`/api/protected/kpi/targets?month=${month}`),
      api('/api/protected/kpi/targets/list'),
    ]);
    renderTargetForm(body, target, targets, month, loadTarget, hospitalConfig);
  }
  
  await loadTarget(selectedMonth);
}

// 진료시간 계산 헬퍼
function calcDayHours(dayConfig, lunchConfig) {
  if (!dayConfig || !dayConfig.enabled || !dayConfig.start || !dayConfig.end) return 0;
  const [sh, sm] = dayConfig.start.split(':').map(Number);
  const [eh, em] = dayConfig.end.split(':').map(Number);
  let hours = (eh + em/60) - (sh + sm/60);
  if (lunchConfig && lunchConfig.enabled && lunchConfig.start && lunchConfig.end) {
    const [lsh, lsm] = lunchConfig.start.split(':').map(Number);
    const [leh, lem] = lunchConfig.end.split(':').map(Number);
    if ((lsh + lsm/60) >= (sh + sm/60) && (leh + lem/60) <= (eh + em/60)) {
      hours -= (leh + lem/60) - (lsh + lsm/60);
    }
  }
  return Math.max(0, hours);
}

function getMonthDowInfo(month, oh) {
  const lunch = oh.lunch || null;
  const holidays = oh.regular_holidays || [];
  const dowNames = { mon:'월', tue:'화', wed:'수', thu:'목', fri:'금', sat:'토', sun:'일' };
  const dowKeys = ['mon','tue','wed','thu','fri','sat','sun'];
  
  // 요일별 진료시간
  const dayHoursMap = {};
  dowKeys.forEach(d => {
    if (holidays.includes(d)) { dayHoursMap[d] = 0; return; }
    if (['mon','tue','wed','thu','fri'].includes(d)) dayHoursMap[d] = calcDayHours(oh.weekday, lunch);
    else if (d === 'sat') dayHoursMap[d] = calcDayHours(oh.saturday, lunch);
    else dayHoursMap[d] = calcDayHours(oh.sunday, lunch);
  });
  
  // 해당 월의 요일별 일수
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const jsKeys = ['sun','mon','tue','wed','thu','fri','sat'];
  const dowDayCount = { sun:0, mon:0, tue:0, wed:0, thu:0, fri:0, sat:0 };
  for (let d = 1; d <= daysInMonth; d++) {
    dowDayCount[jsKeys[new Date(year, mon-1, d).getDay()]]++;
  }
  
  let totalHours = 0;
  const info = dowKeys.map(d => {
    const h = dayHoursMap[d];
    const days = dowDayCount[d];
    totalHours += h * days;
    return { dow: d, label: dowNames[d], hours: h, days, totalH: h * days };
  });
  
  return { info, totalHours };
}

function renderTargetForm(body, target, targetList, month, reload, hospitalConfig) {
  const t = target || {};
  const displayMonth = month.replace('-', '년 ') + '월';
  const oh = (hospitalConfig && hospitalConfig.operating_hours) || {
    weekday: { start:'09:00', end:'18:00', enabled:true },
    saturday: { start:'09:00', end:'14:00', enabled:true },
    sunday: { start:'', end:'', enabled:false },
    lunch: { start:'13:00', end:'14:00', enabled:true },
    regular_holidays: ['sun'],
  };
  
  const { info: dowInfo, totalHours } = getMonthDowInfo(month, oh);
  const workingDays = dowInfo.reduce((s, d) => s + (d.hours > 0 ? d.days : 0), 0);
  
  body.innerHTML = `
    <div style="max-width:540px;margin:0 auto">
      <h2 style="text-align:center;font-size:20px;font-weight:800;margin-bottom:20px">🎯 ${displayMonth} 목표 설정</h2>
      
      <!-- 진료시간 현황 -->
      <div style="background:linear-gradient(135deg,#f0f9ff,#ede9fe);border:1px solid #c7d2fe;border-radius:14px;padding:18px;margin-bottom:16px">
        <div style="font-weight:800;font-size:13px;color:#3730a3;margin-bottom:12px">🕐 ${displayMonth} 진료시간 현황 <span style="font-size:11px;font-weight:500;color:#6366f1">(설정 > 진료시간에서 변경)</span></div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:12px">
          ${dowInfo.map(d => {
            const isOff = d.hours === 0;
            const bg = isOff ? '#f1f5f9' : d.dow === 'sat' ? '#dbeafe' : d.dow === 'sun' ? '#fee2e2' : '#f0fdf4';
            const color = isOff ? '#94a3b8' : d.dow === 'sat' ? '#1d4ed8' : d.dow === 'sun' ? '#dc2626' : '#166534';
            return `<div style="text-align:center;padding:10px 4px;background:${bg};border-radius:10px;border:1px solid ${isOff ? '#e2e8f0' : color}22">
              <div style="font-size:13px;font-weight:800;color:${color}">${d.label}</div>
              <div style="font-size:16px;font-weight:900;color:${color};margin:2px 0">${isOff ? '휴' : d.hours + 'h'}</div>
              <div style="font-size:10px;color:${color}88">${isOff ? '휴진' : d.days + '일'}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;padding:8px 12px;background:white;border-radius:8px">
          <span>총 진료일: <strong>${workingDays}일</strong></span>
          <span>총 진료시간: <strong>${totalHours}시간</strong></span>
        </div>
      </div>

      <form id="targetForm">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px">
          <label style="font-size:13px;font-weight:700;display:block;margin-bottom:4px">📅 목표 월</label>
          <input type="month" name="year_month" value="${month}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:16px">
          
          <label style="font-size:13px;font-weight:700;display:block;margin-bottom:4px">💰 목표 매출 (만원)</label>
          <input type="number" name="target_revenue" value="${t.target_revenue||''}" placeholder="예: 125000 (12.5억)" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:16px">
          
          <label style="font-size:13px;font-weight:700;display:block;margin-bottom:4px">🏥 보험 매출 비중 (%)</label>
          <input type="number" name="insurance_ratio" value="${t.insurance_ratio||13}" step="0.1" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:16px">
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div>
              <label style="font-size:13px;font-weight:700;display:block;margin-bottom:4px">👥 평일 신환 목표</label>
              <input type="number" name="target_new_patients_weekday" value="${t.target_new_patients_weekday||25}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px">
            </div>
            <div>
              <label style="font-size:13px;font-weight:700;display:block;margin-bottom:4px">👥 주말 신환 목표</label>
              <input type="number" name="target_new_patients_weekend" value="${t.target_new_patients_weekend||20}" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px">
            </div>
          </div>
          
          <!-- 숨김 필드: 진료시간에서 자동 계산 -->
          <input type="hidden" name="total_hours" value="${totalHours}">
          <input type="hidden" name="weekdays" value="${dowInfo.filter(d => ['mon','tue','wed','thu','fri'].includes(d.dow) && d.hours > 0).reduce((s,d) => s+d.days, 0)}">
          <input type="hidden" name="weekend_days" value="${dowInfo.filter(d => ['sat','sun'].includes(d.dow) && d.hours > 0).reduce((s,d) => s+d.days, 0)}">
        </div>

        <!-- 요일별 목표 미리보기 -->
        <div id="calcPreview" style="background:linear-gradient(135deg,#dbeafe,#ede9fe);border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin-bottom:16px;font-size:12px"></div>

        <button type="submit" class="btn btn-primary" style="width:100%;padding:14px;font-size:15px;font-weight:800">
          💾 ${target ? '목표 수정' : '목표 저장'}
        </button>
      </form>

      ${targetList.length > 0 ? `
      <div style="margin-top:32px">
        <div class="section-title">📅 <span>최근 목표 이력</span></div>
        ${targetList.map(t => `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" data-month="${t.year_month}">
            <div>
              <span style="font-weight:700">${t.year_month.replace('-','년 ')}월</span>
            </div>
            <div style="font-weight:800;color:#3b82f6">${fmtNum(t.target_revenue)}만</div>
          </div>
        `).join('')}
      </div>` : ''}
    </div>
  `;

  const form = document.getElementById('targetForm');
  
  // 자동 계산 (진료시간 비례)
  function updateCalc() {
    const rev = parseFloat(form.querySelector('[name="target_revenue"]').value) || 0;
    const insRatio = parseFloat(form.querySelector('[name="insurance_ratio"]').value) || 13;
    
    if (rev <= 0 || totalHours <= 0) { document.getElementById('calcPreview').innerHTML = ''; return; }
    
    const insTarget = rev * insRatio / 100;
    const hourlyTarget = rev / totalHours;
    
    document.getElementById('calcPreview').innerHTML = `
      <div style="font-weight:800;margin-bottom:10px;font-size:13px;color:#3730a3">📐 진료시간 비례 일별 목표</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:12px">
        ${dowInfo.map(d => {
          const dayTarget = totalHours > 0 ? Math.round(rev * d.hours / totalHours) : 0;
          const isOff = d.hours === 0;
          return `<div style="text-align:center;padding:8px 2px;background:${isOff ? '#f8fafc' : 'white'};border-radius:8px;border:1px solid ${isOff ? '#e2e8f0' : '#c7d2fe'}">
            <div style="font-size:12px;font-weight:800;color:${isOff ? '#94a3b8' : '#3730a3'}">${d.label}</div>
            <div style="font-size:14px;font-weight:900;color:${isOff ? '#cbd5e1' : '#3b82f6'};margin:2px 0">${isOff ? '-' : fmtNum(dayTarget)+'만'}</div>
            <div style="font-size:9px;color:#64748b">${isOff ? '휴진' : d.hours + 'h × ' + d.days + '일'}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px;background:white;border-radius:8px">
        <div>시간당 목표: <strong style="color:#3b82f6">${fmtNum(Math.round(hourlyTarget))}만</strong></div>
        <div>보험 목표: <strong style="color:#3b82f6">${fmtNum(Math.round(insTarget))}만</strong></div>
        <div>비급여 목표: <strong style="color:#8b5cf6">${fmtNum(Math.round(rev - insTarget))}만</strong></div>
        <div>총 진료: <strong>${totalHours}시간 / ${workingDays}일</strong></div>
      </div>
    `;
  }
  form.querySelectorAll('input[type="number"]').forEach(el => el.addEventListener('input', updateCalc));
  updateCalc();

  // 월 변경
  form.querySelector('[name="year_month"]').addEventListener('change', (e) => reload(e.target.value));

  // 이력 클릭
  body.querySelectorAll('[data-month]').forEach(el => {
    el.addEventListener('click', () => reload(el.dataset.month));
  });

  // 저장
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k,v] of fd.entries()) data[k] = k === 'year_month' || k === 'notes' ? v : (parseFloat(v) || 0);
    try {
      await api('/api/protected/kpi/targets', { method:'POST', json: data }) ;
      toast('✅ 목표가 저장되었습니다');
      reload(data.year_month);
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
}

PFM.modules.kpi = { renderKpiDashboard, renderKpiDaily, renderKpiTargets };
})(window.PFM);
