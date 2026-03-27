/* ═══ Module: 상담 기록 + 상담 분석 대시보드 (실장노트 기반) ═══ */
(function(PFM) {
'use strict';
const { api, state, toast, esc, showModal, closeModal, navigate } = PFM;

const CATEGORIES = {
  implant: '임플란트', orthodontics: '교정', complex: '복합', general: '일반진료'
};
const CAT_COLORS = {
  implant: '#3b82f6', orthodontics: '#8b5cf6', complex: '#f59e0b', general: '#6b7280'
};
const VISIT_SOURCES = {
  referral: '👥 소개',
  online_naver: '🟢 네이버',
  online_google: '🔵 구글',
  online_youtube: '🔴 유튜브',
  online_insta: '📸 인스타그램',
  online_etc: '🌐 기타 온라인',
  walk_in: '🚶 통행',
  hospital_referral: '🏥 타병원 의뢰',
  recall: '📞 리콜',
  etc: '📋 기타'
};
const SOURCE_COLORS = {
  referral: '#22c55e', online_naver: '#2db400', online_google: '#4285f4',
  online_youtube: '#ff0000', online_insta: '#e1306c', online_etc: '#0ea5e9',
  walk_in: '#f59e0b', hospital_referral: '#8b5cf6', recall: '#06b6d4', etc: '#94a3b8'
};

function fmtWon(n) {
  if (!n && n !== 0) return '-';
  if (n >= 10000) return Math.round(n/10000).toLocaleString() + '만';
  return n.toLocaleString() + '원';
}
function fmtMan(n) {
  if (!n && n !== 0) return '-';
  return Math.round(n / 10000).toLocaleString() + '만';
}

// ═══ 상담 기록 목록/입력 화면 ═══
async function renderConsultRecords(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = `
    ${isManager ? '<button class="btn btn-primary btn-sm" id="addConsultBtn">➕ 상담 기록</button>' : ''}
    <button class="btn btn-sm" onclick="PFM.navigate('consult_dashboard')" style="margin-left:6px">📊 분석</button>
  `;
  
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  let staffData = null;
  try { staffData = await api('/api/protected/consult-records/staff'); } catch(e) {}
  
  async function loadRecords(month) {
    currentMonth = month;
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    const records = await api(`/api/protected/consult-records?month=${month}`);
    renderRecordsList(body, records, month, loadRecords, staffData, isManager);
  }
  
  await loadRecords(currentMonth);
  
  document.getElementById('addConsultBtn')?.addEventListener('click', () => {
    openRecordForm(null, staffData, async () => { await loadRecords(currentMonth); });
  });
}

function renderRecordsList(body, records, month, reload, staffData, isManager) {
  const prevMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const nextMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7); })();
  const displayMonth = month.replace('-', '년 ') + '월';
  
  // 요약 통계
  const total = records.length;
  const confirmed = records.filter(r => r.treatment_confirmed === 'O').length;
  const rejected = records.filter(r => r.treatment_confirmed === 'X').length;
  const pending = total - confirmed - rejected;
  const rate = (confirmed + rejected) > 0 ? Math.round(confirmed / (confirmed + rejected) * 1000) / 10 : 0;
  const totalPlanned = records.reduce((s,r) => s + (r.planned_amount||0), 0);
  const totalAgreed = records.reduce((s,r) => s + (r.agreed_amount||0), 0);
  const newP = records.filter(r => r.patient_type === 'new').length;
  
  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
      <button class="btn btn-sm" id="crPrev">◀</button>
      <h2 style="margin:0;font-size:20px;font-weight:800">📋 ${displayMonth} 상담 기록</h2>
      <button class="btn btn-sm" id="crNext">▶</button>
    </div>
    
    <!-- 요약 카드 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:16px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">총 상담</div>
        <div style="font-size:24px;font-weight:900;color:#3b82f6">${total}건</div>
        <div style="font-size:10px;color:var(--text-muted)">신환 ${newP} / 구환 ${total - newP}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">확정률</div>
        <div style="font-size:24px;font-weight:900;color:${rate >= 80 ? '#22c55e' : rate >= 70 ? '#f59e0b' : '#ef4444'}">${rate}%</div>
        <div style="font-size:10px;color:var(--text-muted)">✅${confirmed} ❌${rejected} ⏳${pending}</div>
      </div>
      ${isManager ? `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">비용계획</div>
        <div style="font-size:20px;font-weight:900;color:#8b5cf6">${fmtMan(totalPlanned)}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">동의금액</div>
        <div style="font-size:20px;font-weight:900;color:#3b82f6">${fmtMan(totalAgreed)}</div>
      </div>` : ''}
    </div>
    
    <!-- 테이블 -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 8px;text-align:left;font-weight:700;border-bottom:2px solid var(--border);white-space:nowrap">날짜</th>
            <th style="padding:10px 8px;text-align:left;border-bottom:2px solid var(--border)">성함</th>
            <th style="padding:10px 8px;text-align:left;border-bottom:2px solid var(--border)">상담의</th>
            <th style="padding:10px 8px;text-align:left;border-bottom:2px solid var(--border)">상담사</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">비용계획</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">동의금액</th>
            <th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border)">구분</th>
            <th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border)">카테고리</th>
            <th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border)">확정</th>
            <th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border)">예약</th>
            <th style="padding:10px 6px;border-bottom:2px solid var(--border)">할인/메모</th>
          </tr>
        </thead>
        <tbody>
          ${records.length === 0 ? `<tr><td colspan="11" style="padding:40px;text-align:center;color:var(--text-muted)">이달 기록이 없습니다</td></tr>` : ''}
          ${records.map(r => {
            const dateStr = r.record_date?.slice(5) || '';
            const catLabel = CATEGORIES[r.treatment_category] || r.treatment_category;
            const catColor = CAT_COLORS[r.treatment_category] || '#6b7280';
            const ptBadge = r.patient_type === 'new'
              ? '<span style="background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700">신</span>'
              : '<span style="background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700">구</span>';
            const confBadge = r.treatment_confirmed === 'O'
              ? '<span style="color:#22c55e;font-weight:800">✅</span>'
              : r.treatment_confirmed === 'X'
              ? '<span style="color:#ef4444;font-weight:800">❌</span>'
              : '<span style="color:#94a3b8">-</span>';
            const apptBadge = r.appointment_made === 'O' ? '✅' : r.appointment_made === 'X' ? '❌' : '-';
            const memo = r.discount_note || r.notes || '';
            return `<tr style="border-bottom:1px solid var(--border-light);cursor:pointer" data-id="${r.id}" class="cr-row">
              <td style="padding:7px 8px;font-weight:600;white-space:nowrap">${dateStr}</td>
              <td style="padding:7px 8px;font-weight:700">${esc(r.patient_name)}</td>
              <td style="padding:7px 8px">${esc(r.doctor_name)}</td>
              <td style="padding:7px 8px">${esc(r.counselor_name)}</td>
              <td style="padding:7px 8px;text-align:right;color:var(--text-muted)">${r.planned_amount ? fmtWon(r.planned_amount) : '-'}</td>
              <td style="padding:7px 8px;text-align:right;font-weight:700;color:#3b82f6">${r.agreed_amount ? fmtWon(r.agreed_amount) : '-'}</td>
              <td style="padding:7px 8px;text-align:center">${ptBadge}</td>
              <td style="padding:7px 8px;text-align:center"><span style="background:${catColor}18;color:${catColor};padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">${catLabel}</span></td>
              <td style="padding:7px 8px;text-align:center">${confBadge}</td>
              <td style="padding:7px 8px;text-align:center">${apptBadge}</td>
              <td style="padding:7px 6px;font-size:11px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(memo)}">${esc(memo.slice(0,30))}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted)">총 ${records.length}건</div>
  `;
  
  // 이벤트
  document.getElementById('crPrev')?.addEventListener('click', () => reload(prevMonth));
  document.getElementById('crNext')?.addEventListener('click', () => reload(nextMonth));
  
  // 행 클릭 → 수정 모달 (매니저만)
  if (isManager) {
    body.querySelectorAll('.cr-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        const rec = records.find(r => r.id === id);
        if (rec) openRecordForm(rec, staffData, async () => { await reload(currentMonth); });
      });
    });
  }
}

// ═══ 상담 기록 입력/수정 모달 ═══
function openRecordForm(record, staffData, onSave) {
  const r = record || {};
  const isEdit = !!record;
  const counselors = staffData?.counselors || [];
  const doctors = staffData?.doctors || [];
  
  function opt(list, selected) {
    return list.map(name => `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('');
  }
  
  const cardStyle = `background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 16px;margin-bottom:12px`;
  const labelStyle = `font-size:11px;font-weight:700;display:block;margin-bottom:5px;color:var(--text-muted);letter-spacing:0.3px`;
  const inputStyle = `width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);transition:border-color 0.2s;outline:none`;
  const selectStyle = inputStyle + `;appearance:auto`;
  
  showModal();
  const mc = document.getElementById('modalContent');
  mc.style.maxWidth = '560px';
  mc.innerHTML = `
    <div style="padding:4px 2px">
      <h3 style="margin:0 0 20px;font-size:20px;font-weight:900;display:flex;align-items:center;gap:8px">
        ${isEdit ? '<span style="font-size:24px">✏️</span> 상담 기록 수정' : '<span style="font-size:24px">➕</span> 새 상담 기록'}
      </h3>
      <form id="crForm" style="display:flex;flex-direction:column;gap:0">
        
        <!-- 기본 정보 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#3b82f6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">기본</span> 환자 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${labelStyle}">📅 날짜</label>
              <input type="date" name="record_date" value="${r.record_date || new Date().toISOString().slice(0,10)}" required style="${inputStyle}">
            </div>
            <div>
              <label style="${labelStyle}">📋 챠트번호</label>
              <input type="text" name="chart_number" value="${esc(r.chart_number||'')}" placeholder="예: 741003" style="${inputStyle}">
            </div>
          </div>
          <div>
            <label style="${labelStyle}">👤 환자 성함 <span style="color:#ef4444">*</span></label>
            <input type="text" name="patient_name" value="${esc(r.patient_name||'')}" required placeholder="환자명 입력" style="${inputStyle};font-weight:700">
          </div>
        </div>
        
        <!-- 상담 담당 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#8b5cf6;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">담당</span> 상담 배정
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="${labelStyle}">🩺 상담의</label>
              <select name="doctor_name" style="${selectStyle}">
                <option value="">선택</option>${opt(doctors, r.doctor_name)}
              </select>
            </div>
            <div>
              <label style="${labelStyle}">👩‍⚕️ 상담사</label>
              <select name="counselor_name" style="${selectStyle}">
                <option value="">선택</option>${opt(counselors, r.counselor_name)}
              </select>
            </div>
          </div>
        </div>
        
        <!-- 금액 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#f59e0b;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">금액</span> 비용 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label style="${labelStyle}">💰 비용계획 (원)</label>
              <input type="number" name="planned_amount" value="${r.planned_amount||''}" placeholder="0" style="${inputStyle}">
            </div>
            <div>
              <label style="${labelStyle}">✅ 동의금액 (원)</label>
              <input type="number" name="agreed_amount" value="${r.agreed_amount||''}" placeholder="0" style="${inputStyle}">
            </div>
          </div>
          <div>
            <label style="${labelStyle}">🏷️ 할인 내역</label>
            <input type="text" name="discount_note" value="${esc(r.discount_note||'')}" placeholder="예: 소개10%+당일완납5%" style="${inputStyle}">
          </div>
        </div>
        
        <!-- 진료 분류 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#22c55e;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">분류</span> 진료 정보
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <label style="${labelStyle}">구/신환</label>
              <select name="patient_type" style="${selectStyle}">
                <option value="new" ${r.patient_type==='new'?'selected':''}>신환</option>
                <option value="existing" ${r.patient_type==='existing'?'selected':''}>구환</option>
              </select>
            </div>
            <div>
              <label style="${labelStyle}">진료 카테고리</label>
              <select name="treatment_category" style="${selectStyle}">
                ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}" ${r.treatment_category===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="${labelStyle}">치료확정</label>
              <select name="treatment_confirmed" style="${selectStyle}">
                <option value="" ${!r.treatment_confirmed?'selected':''}>미정</option>
                <option value="O" ${r.treatment_confirmed==='O'?'selected':''}>O 확정</option>
                <option value="X" ${r.treatment_confirmed==='X'?'selected':''}>X 미확정</option>
              </select>
            </div>
          </div>
          
          <!-- 내원 경로 (필수!) -->
          <div>
            <label style="${labelStyle}">🛤️ 내원 경로 <span style="color:#ef4444">*</span></label>
            <select name="visit_source" required style="${selectStyle};border-color:${r.visit_source ? 'var(--border)' : '#f59e0b'};font-weight:600">
              <option value="" ${!r.visit_source?'selected':''} disabled>-- 내원 경로를 선택하세요 --</option>
              ${Object.entries(VISIT_SOURCES).map(([k,v]) => `<option value="${k}" ${r.visit_source===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <!-- 후속 관리 카드 -->
        <div style="${cardStyle}">
          <div style="font-size:13px;font-weight:800;margin-bottom:14px;color:var(--text);display:flex;align-items:center;gap:6px">
            <span style="background:#06b6d4;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px">관리</span> 후속 조치
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <label style="${labelStyle}">📅 예약</label>
              <select name="appointment_made" style="${selectStyle}">
                <option value="" ${!r.appointment_made?'selected':''}>-</option>
                <option value="O" ${r.appointment_made==='O'?'selected':''}>O</option>
                <option value="X" ${r.appointment_made==='X'?'selected':''}>X</option>
              </select>
            </div>
            <div>
              <label style="${labelStyle}">📞 리콜</label>
              <select name="recall_done" style="${selectStyle}">
                <option value="" ${!r.recall_done?'selected':''}>-</option>
                <option value="O" ${r.recall_done==='O'?'selected':''}>O</option>
                <option value="X" ${r.recall_done==='X'?'selected':''}>X</option>
              </select>
            </div>
            <div>
              <label style="${labelStyle}">💛 카카오 등록</label>
              <select name="kakao_registered" style="${selectStyle}">
                <option value="" ${!r.kakao_registered?'selected':''}>-</option>
                <option value="O" ${r.kakao_registered==='O'?'selected':''}>O</option>
                <option value="X" ${r.kakao_registered==='X'?'selected':''}>X</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- 메모 카드 -->
        <div style="${cardStyle}">
          <label style="${labelStyle}">📝 메모</label>
          <textarea name="notes" rows="2" placeholder="비고 사항" style="${inputStyle};resize:vertical">${esc(r.notes||'')}</textarea>
        </div>
        
        <!-- 버튼 -->
        <div style="display:flex;gap:8px;margin-top:4px;padding:0 2px">
          <button type="submit" class="btn btn-primary" style="flex:1;padding:14px;font-weight:800;font-size:15px;border-radius:12px">${isEdit ? '수정 저장' : '기록 저장'}</button>
          ${isEdit ? '<button type="button" id="crDelete" class="btn" style="padding:14px;color:#ef4444;font-weight:700;border-radius:12px;border:1px solid #fecaca">삭제</button>' : ''}
          <button type="button" onclick="PFM.closeModal()" class="btn" style="padding:14px;border-radius:12px">취소</button>
        </div>
      </form>
    </div>
  `;
  
  const form = document.getElementById('crForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k,v] of fd.entries()) {
      if (k === 'planned_amount' || k === 'agreed_amount') {
        data[k] = v ? parseInt(v) : 0;
      } else {
        data[k] = v;
      }
    }
    try {
      if (isEdit) {
        await api(`/api/protected/consult-records/${r.id}`, { method: 'PUT', body: JSON.stringify(data) });
        toast('✅ 수정 완료');
      } else {
        await api('/api/protected/consult-records', { method: 'POST', body: JSON.stringify(data) });
        toast('✅ 기록 저장 완료');
      }
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 저장 실패: ' + e.message, 'error'); }
  });
  
  document.getElementById('crDelete')?.addEventListener('click', async () => {
    if (!confirm('이 상담 기록을 삭제하시겠습니까?')) return;
    try {
      await api(`/api/protected/consult-records/${r.id}`, { method: 'DELETE' });
      toast('🗑️ 삭제 완료');
      closeModal();
      if (onSave) onSave();
    } catch(e) { toast('❌ 삭제 실패', 'error'); }
  });
}

// ═══ 상담 분석 대시보드 ═══
async function renderConsultDashboard(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);
  const now = new Date();
  let currentMonth = now.toISOString().slice(0,7);
  
  actions.innerHTML = `<button class="btn btn-sm" onclick="PFM.navigate('consult_records')">📋 기록</button>`;
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
  
  async function loadDashboard(month) {
    currentMonth = month;
    body.innerHTML = '<div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div>';
    const data = await api(`/api/protected/consult-records/dashboard?month=${month}`);
    renderDashboardContent(body, data, month, isManager, loadDashboard);
  }
  
  await loadDashboard(currentMonth);
}

function renderDashboardContent(body, data, month, isManager, reload) {
  const { summary: s, byCounselor, byDoctor, byCategory, byDate, byVisitSource } = data;
  const prevMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const nextMonth = (() => { const d = new Date(month + '-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,7); })();
  const displayMonth = month.replace('-', '년 ') + '월';
  
  const rateColor = s.confirmRate >= 80 ? '#22c55e' : s.confirmRate >= 70 ? '#f59e0b' : '#ef4444';
  
  // 상담사 데이터 정렬 (건수 순)
  const counselorArr = Object.entries(byCounselor).sort((a,b) => b[1].total - a[1].total);
  const doctorArr = Object.entries(byDoctor).sort((a,b) => b[1].total - a[1].total);
  const categoryArr = Object.entries(byCategory).sort((a,b) => b[1].total - a[1].total);
  
  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
      <button class="btn btn-sm" id="cdPrev">◀</button>
      <h2 style="margin:0;font-size:20px;font-weight:800">📊 ${displayMonth} 상담 분석</h2>
      <button class="btn btn-sm" id="cdNext">▶</button>
    </div>
    
    ${s.total === 0 ? '<div style="text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:16px">📊</div><h3>이달 상담 기록이 없습니다</h3></div>' : `
    
    <!-- 핵심 지표 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">총 상담</div>
        <div style="font-size:28px;font-weight:900;color:#3b82f6">${s.total}</div>
        <div style="font-size:10px;color:var(--text-muted)">신환 ${s.newPatients} / 구환 ${s.existingPatients}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">확정률</div>
        <div style="font-size:28px;font-weight:900;color:${rateColor}">${s.confirmRate}%</div>
        <div style="font-size:10px;color:var(--text-muted)">✅${s.confirmed} ❌${s.rejected} ⏳${s.pending}</div>
      </div>
      ${isManager && s.totalPlanned !== null ? `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">비용계획</div>
        <div style="font-size:22px;font-weight:900;color:#8b5cf6">${fmtMan(s.totalPlanned)}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">동의금액</div>
        <div style="font-size:22px;font-weight:900;color:#3b82f6">${fmtMan(s.totalAgreed)}</div>
        <div style="font-size:10px;color:var(--text-muted)">할인율 ${s.discountRate}%</div>
      </div>` : ''}
    </div>
    
    <!-- 상담사별 분석 -->
    <div class="section-title">👩‍⚕️ <span>상담사별 분석</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">상담사</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">상담</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">미확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정률</th>
            ${isManager ? '<th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">비용계획</th><th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">동의금액</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${counselorArr.map(([name, v]) => {
            const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
            const rc = r >= 80 ? '#22c55e' : r >= 70 ? '#f59e0b' : '#ef4444';
            const barW = s.total > 0 ? Math.round(v.total / counselorArr[0][1].total * 100) : 0;
            return `<tr style="border-bottom:1px solid var(--border-light)">
              <td style="padding:8px 12px;font-weight:700">${esc(name)}
                <div style="background:var(--border-light);border-radius:4px;height:4px;margin-top:4px;overflow:hidden"><div style="background:#3b82f6;height:100%;width:${barW}%;border-radius:4px"></div></div>
              </td>
              <td style="padding:8px;text-align:right;font-weight:800">${v.total}</td>
              <td style="padding:8px;text-align:right;color:#22c55e;font-weight:700">${v.confirmed}</td>
              <td style="padding:8px;text-align:right;color:#ef4444">${v.rejected}</td>
              <td style="padding:8px;text-align:right;font-weight:800;color:${rc}">${r}%</td>
              ${isManager && v.planned !== null ? `<td style="padding:8px;text-align:right;color:var(--text-muted)">${fmtMan(v.planned)}</td><td style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${fmtMan(v.agreed)}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 상담의별 분석 -->
    <div class="section-title">🩺 <span>상담의별 분석</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg-hover)">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border)">상담의</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">상담</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">미확정</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">확정률</th>
            ${isManager ? '<th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">비용계획</th><th style="padding:10px 8px;text-align:right;border-bottom:2px solid var(--border)">동의금액</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${doctorArr.map(([name, v]) => {
            const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
            const rc = r >= 80 ? '#22c55e' : r >= 70 ? '#f59e0b' : '#ef4444';
            return `<tr style="border-bottom:1px solid var(--border-light)">
              <td style="padding:8px 12px;font-weight:700">${esc(name)}</td>
              <td style="padding:8px;text-align:right;font-weight:800">${v.total}</td>
              <td style="padding:8px;text-align:right;color:#22c55e;font-weight:700">${v.confirmed}</td>
              <td style="padding:8px;text-align:right;color:#ef4444">${v.rejected}</td>
              <td style="padding:8px;text-align:right;font-weight:800;color:${rc}">${r}%</td>
              ${isManager && v.planned !== null ? `<td style="padding:8px;text-align:right;color:var(--text-muted)">${fmtMan(v.planned)}</td><td style="padding:8px;text-align:right;font-weight:700;color:#3b82f6">${fmtMan(v.agreed)}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 카테고리별 분석 -->
    <div class="section-title">🦷 <span>진료 카테고리별</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:20px">
      ${categoryArr.map(([cat, v]) => {
        const label = CATEGORIES[cat] || cat;
        const color = CAT_COLORS[cat] || '#6b7280';
        const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
        const pct = s.total > 0 ? Math.round(v.total / s.total * 100) : 0;
        return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;border-left:4px solid ${color}">
          <div style="font-size:14px;font-weight:800;color:${color};margin-bottom:8px">${label}</div>
          <div style="font-size:22px;font-weight:900">${v.total}건 <span style="font-size:12px;color:var(--text-muted)">(${pct}%)</span></div>
          <div style="font-size:12px;margin-top:6px;color:var(--text-muted)">확정 ${v.confirmed} / 미확 ${v.rejected} = <strong style="color:${r >= 80 ? '#22c55e' : '#f59e0b'}">${r}%</strong></div>
          ${isManager && v.planned ? `<div style="font-size:11px;margin-top:4px;color:var(--text-muted)">계획 ${fmtMan(v.planned)} → 동의 ${fmtMan(v.agreed)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    
    <!-- 내원 경로별 분석 -->
    ${byVisitSource && Object.keys(byVisitSource).filter(k => k !== '미기록').length > 0 ? `
    <div class="section-title">🛤️ <span>내원 경로별 분석</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px">
      ${Object.entries(byVisitSource).sort((a,b) => b[1].total - a[1].total).map(([src, v]) => {
        const label = VISIT_SOURCES[src] || src;
        const color = SOURCE_COLORS[src] || '#94a3b8';
        const r = (v.confirmed + v.rejected) > 0 ? Math.round(v.confirmed / (v.confirmed + v.rejected) * 1000) / 10 : 0;
        const pct = s.total > 0 ? Math.round(v.total / s.total * 100) : 0;
        return '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;border-top:3px solid ' + color + '">' +
          '<div style="font-size:12px;font-weight:800;color:' + color + ';margin-bottom:6px">' + label + '</div>' +
          '<div style="font-size:20px;font-weight:900">' + v.total + '건 <span style="font-size:11px;color:var(--text-muted)">(' + pct + '%)</span></div>' +
          '<div style="font-size:11px;margin-top:4px;color:var(--text-muted)">확정률 <strong style="color:' + (r >= 80 ? '#22c55e' : '#f59e0b') + '">' + r + '%</strong></div>' +
        '</div>';
      }).join('')}
    </div>` : ''}
    
    <!-- 일별 상담 건수 차트 -->
    <div class="section-title">📈 <span>일별 상담 건수</span></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px;overflow-x:auto">
      <div id="consultChart" style="position:relative"></div>
    </div>
    `}
  `;
  
  // 일별 차트 렌더
  if (s.total > 0) {
    renderDailyChart(byDate, month);
  }
  
  document.getElementById('cdPrev')?.addEventListener('click', () => reload(prevMonth));
  document.getElementById('cdNext')?.addEventListener('click', () => reload(nextMonth));
}

function renderDailyChart(byDate, month) {
  const chartEl = document.getElementById('consultChart');
  if (!chartEl) return;
  
  const [yr, mn] = month.split('-').map(Number);
  const daysInMonth = new Date(yr, mn, 0).getDate();
  const jsKeys = ['일','월','화','수','목','금','토'];
  
  const allDays = [];
  let maxVal = 1;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yr}-${String(mn).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = jsKeys[new Date(yr, mn-1, d).getDay()];
    const info = byDate[dateStr] || null;
    const total = info ? info.total : 0;
    const confirmed = info ? info.confirmed : 0;
    if (total > maxVal) maxVal = total;
    allDays.push({ day: d, dateStr, dow, total, confirmed });
  }
  
  const colW = Math.max(20, Math.min(32, Math.floor((chartEl.parentElement.clientWidth - 20) / daysInMonth) - 2));
  const gap = 2;
  const chartH = 100;
  const topH = 16;
  const bottomH = 26;
  const totalH = chartH + topH + bottomH;
  const totalW = daysInMonth * (colW + gap) + gap;
  
  let svg = `<svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="display:block;min-width:${totalW}px">`;
  
  allDays.forEach((d, i) => {
    const x = i * (colW + gap) + gap;
    const isSun = d.dow === '일';
    const isSat = d.dow === '토';
    
    if (d.total > 0) {
      const barH = Math.max(3, (d.total / maxVal) * chartH);
      const confH = d.confirmed > 0 ? Math.max(1, (d.confirmed / maxVal) * chartH) : 0;
      const rejH = barH - confH;
      
      // 확정 부분 (아래)
      if (confH > 0) {
        svg += `<rect x="${x}" y="${topH + chartH - confH}" width="${colW}" height="${confH}" fill="#3b82f6" rx="2" opacity="0.8"><title>${d.dateStr} 확정 ${d.confirmed}건</title></rect>`;
      }
      // 미확정 부분 (위)
      if (rejH > 0) {
        svg += `<rect x="${x}" y="${topH + chartH - barH}" width="${colW}" height="${rejH}" fill="#fbbf24" rx="2" opacity="0.6"><title>${d.dateStr} 전체 ${d.total}건</title></rect>`;
      }
      
      // 숫자
      if (colW >= 22) {
        svg += `<text x="${x + colW/2}" y="${topH + chartH - barH - 2}" text-anchor="middle" fill="#334155" font-size="9" font-weight="700">${d.total}</text>`;
      }
    }
    
    // 날짜
    const dowColor = isSun ? '#dc2626' : isSat ? '#1d4ed8' : '#64748b';
    svg += `<text x="${x + colW/2}" y="${topH + chartH + 12}" text-anchor="middle" fill="${d.total > 0 ? '#334155' : '#cbd5e1'}" font-size="9" font-weight="600">${d.day}</text>`;
    svg += `<text x="${x + colW/2}" y="${topH + chartH + 22}" text-anchor="middle" fill="${dowColor}" font-size="7">${d.dow}</text>`;
  });
  
  svg += '</svg>';
  chartEl.innerHTML = svg;
}

PFM.modules.consult = { renderConsultRecords, renderConsultDashboard };
PFM.consultData = { CATEGORIES, CAT_COLORS, VISIT_SOURCES, SOURCE_COLORS };
})(window.PFM);
