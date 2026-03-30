/* ═══ Module: Clinical (Treatment Board, Consultations) ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, toast, esc, showModal, closeModal, timeAgo, formatPrice, initKanbanDnD } = PFM;

/* ─── Smart Polling Engine ─── */
let _pollTimer = null;
let _pollHash = '';
let _pollActive = false;

function startPolling(loadFn, intervalMs) {
  stopPolling();
  _pollActive = true;
  _pollTimer = setInterval(async () => {
    if (!_pollActive || document.hidden) return; // Don't poll when tab is hidden
    try { await loadFn(true); } catch(e) { /* silent */ }
  }, intervalMs || 15000);
  // Also listen for visibility change
  document.addEventListener('visibilitychange', _onVisChange);
  // Expose stop function globally for navigation
  window._pfmStopPolling = stopPolling;
}

function stopPolling() {
  _pollActive = false;
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  document.removeEventListener('visibilitychange', _onVisChange);
}

function _onVisChange() {
  // Resume polling when tab becomes visible
  if (!document.hidden && _pollActive) {
    // Immediate refresh
  }
}

// Generate a simple hash for change detection
function hashData(data) {
  return JSON.stringify(data).length + ':' + (data?.length || 0);
}

async function renderTreatmentBoard(body, actions) {
  const today = new Date().toISOString().split('T')[0];
  actions.innerHTML = `
    <span id="liveIndicator" style="font-size:10px;color:#22c55e;display:flex;align-items:center;gap:4px;margin-right:8px"><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite"></span>LIVE</span>
    <input type="date" class="form-input" id="tbDatePicker" value="${today}" style="padding:4px 10px;font-size:12px;width:auto">
    <button class="btn btn-primary btn-sm" id="addTreatmentBtn">${ICONS.plus} 환자 등록</button>`;

  const statusLabels = { waiting:'대기', arrived:'도착', seating:'자리안내', in_treatment:'진료중', doctor_needed:'원장호출', completed:'완료', cancelled:'취소', no_show:'노쇼' };
  const statusEmojis = { waiting:'🕐', arrived:'🚶', seating:'💺', in_treatment:'🦷', doctor_needed:'🔔', completed:'✅', cancelled:'❌', no_show:'🚫' };
  const statusColors = { waiting:'#94a3b8', arrived:'#6366f1', seating:'#3b82f6', in_treatment:'#f59e0b', doctor_needed:'#ef4444', completed:'#22c55e', cancelled:'#94a3b8', no_show:'#94a3b8' };
  const patientTypeLabels = { new:'신환', existing:'구환', emergency:'응급', referral:'소개' };
  const patientTypeColors = { new:'#ef4444', existing:'#3b82f6', emergency:'#f59e0b', referral:'#8b5cf6' };
  const treatmentTypeLabels = { general:'일반진료', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경치료', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', emergency:'응급', checkup:'검진', other:'기타' };

  body.innerHTML = `
    <div class="tb-doctor-bar" id="tbDoctorBar"></div>
    <div class="tb-staff-bar" id="tbStaffBar"></div>
    <div class="tb-summary" id="tbSummary"></div>
    <div class="kb-board" id="treatmentBoard" style="min-height:500px"></div>`;

  let boardDate = today;
  let chairs = [];
  let doctors = [];
  let allItems = [];
  let onDutyDoctors = [];
  let T = { chair:'체어', room:'진료실', floor:'층', surgery_room:'수술실', waiting_room:'대기실', consult_room:'상담실', xray_room:'촬영실', sterilization:'소독실' };

  async function loadBoard(isPolling) {
    const container = document.getElementById('treatmentBoard');
    const summary = document.getElementById('tbSummary');
    const doctorBar = document.getElementById('tbDoctorBar');
    const staffBar = document.getElementById('tbStaffBar');
    if (!container) { stopPolling(); return; } // Page changed, stop polling
    try {
      const [items, chairList, doctorList, dutyList, settings, staffList] = await Promise.all([
        api('/api/protected/treatment-board?date=' + boardDate),
        api('/api/protected/chairs'),
        api('/api/protected/doctors'),
        api('/api/protected/doctors/on-duty?date=' + boardDate),
        api('/api/protected/hospital/settings'),
        api('/api/protected/staff/on-duty?date=' + boardDate),
      ]);
      
      // Change detection: skip render if nothing changed (during polling only)
      if (isPolling) {
        const newHash = hashData(items);
        if (newHash === _pollHash) return; // No changes
        _pollHash = newHash;
      }
      
      chairs = chairList;
      doctors = doctorList;
      allItems = items;
      onDutyDoctors = dutyList;
      if (settings.location_terms) T = { ...T, ...settings.location_terms };

      // ── 상단: 오늘 출근한 원장님 표시 ──
      const statusConfig = {
        on_duty: { label: '진료중', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', icon: '🟢' },
        scheduled: { label: '근무예정', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '🔵' },
        day_off: { label: '휴무', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0', icon: '⚪' },
        vacation: { label: '휴가', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '🟡' },
      };
      const onDutyCount = dutyList.filter(d => d.status === 'on_duty' || d.status === 'scheduled').length;

      doctorBar.innerHTML = `
        <div style="background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:18px">👨‍⚕️</span>
            <span style="font-size:14px;font-weight:800;color:var(--text)">오늘의 진료 원장</span>
            <span style="font-size:12px;font-weight:600;color:var(--primary);background:var(--primary)12;padding:2px 8px;border-radius:12px">${onDutyCount}명 근무</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${boardDate === today ? new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'}) : boardDate}</span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            ${dutyList.map(d => {
              const cfg = statusConfig[d.status] || statusConfig.scheduled;
              const patientCount = items.filter(i => i.assigned_doctor === d.id && !['completed','cancelled','no_show'].includes(i.status)).length;
              const scheduleStr = d.today_schedule ? d.today_schedule.start + '~' + d.today_schedule.end : '';
              const isOffDuty = d.status === 'day_off' || d.status === 'vacation';
              return `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;background:${cfg.bg};border:1.5px solid ${cfg.border};min-width:140px;transition:all 0.2s;position:relative" title="${h(d.name)} ${d.role==='admin'?'원장':'선생'} · ${cfg.label}${scheduleStr?' · '+scheduleStr:''}">
                <div style="width:36px;height:36px;border-radius:50%;background:${cfg.color}22;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:${cfg.color};border:2px solid ${cfg.color}44">
                  ${d.name.charAt(0)}
                </div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--text);line-height:1.3">${esc(d.name)} <span style="font-size:10px;color:var(--text-muted);font-weight:500">${d.role==='admin'?'원장':'선생'}</span></div>
                  <div style="display:flex;align-items:center;gap:4px;margin-top:1px">
                    <span style="font-size:10px">${cfg.icon}</span>
                    <span style="font-size:10px;font-weight:600;color:${cfg.color}">${cfg.label}</span>
                    ${d.check_in ? `<span style="font-size:9px;color:var(--text-muted);margin-left:2px">${d.check_in.slice(11,16)} 출근</span>` : ''}
                    ${patientCount > 0 ? `<span style="font-size:9px;background:${cfg.color}22;color:${cfg.color};padding:0 5px;border-radius:8px;font-weight:700;margin-left:2px">${patientCount}명</span>` : ''}
                  </div>
                </div>
                ${isOffDuty ? `<button class="tb-add-duty-btn" data-doctor-id="${d.id}" data-action="add-duty" title="오늘 출근 처리" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:#22c55e;color:white;border:2px solid white;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.2)">+</button>` : ''}
              </div>`;
            }).join('')}
            <button id="tbAddDoctorBtn" style="display:flex;align-items:center;gap:6px;padding:10px 16px;border-radius:12px;background:white;border:2px dashed var(--primary);color:var(--primary);font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;min-width:120px;justify-content:center" onmouseover="this.style.background='var(--primary)';this.style.color='white'" onmouseout="this.style.background='white';this.style.color='var(--primary)'">
              <span style="font-size:16px">+</span> 원장 추가
            </button>
            ${dutyList.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);padding:8px">등록된 원장이 없습니다</div>' : ''}
          </div>
        </div>`;

      // ── 직원 현황 바 ──
      const positionLabels = { doctor:'원장', director:'실장', hygienist:'위생사', desk:'데스크', sterilization:'소독', management:'경영지원', temp:'알바/임시' };
      const positionColors = { doctor:'#0f766e', director:'#6366f1', hygienist:'#3b82f6', desk:'#f59e0b', sterilization:'#8b5cf6', management:'#94a3b8', temp:'#ef4444' };
      const teamLabels = { clinical:'진료팀', front:'프론트', support:'지원팀', management:'경영지원' };
      const presentStaff = staffList.filter(s => s.status === 'present' || s.status === 'scheduled');
      const tempStaff = staffList.filter(s => s.is_temp);
      const totalPresent = presentStaff.length + tempStaff.filter(t => !presentStaff.some(p => p.id === t.id)).length;

      if (staffBar) {
        staffBar.innerHTML = `
        <div style="background:linear-gradient(135deg,#f8fafc,#fef3c7);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-size:18px">👥</span>
            <span style="font-size:14px;font-weight:800;color:var(--text)">오늘 출근 직원</span>
            <span style="font-size:12px;font-weight:600;color:#f59e0b;background:#f59e0b12;padding:2px 8px;border-radius:12px">${totalPresent}명</span>
            ${tempStaff.length > 0 ? `<span style="font-size:11px;font-weight:600;color:#ef4444;background:#ef444412;padding:2px 8px;border-radius:12px">알바 ${tempStaff.length}명</span>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${presentStaff.map(s => {
              const posColor = positionColors[s.position] || '#94a3b8';
              const statusIcon = s.status === 'present' ? '🟢' : s.status === 'vacation' ? '🟡' : s.status === 'day_off' ? '⚪' : '🔵';
              return `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:white;border:1px solid ${posColor}33;font-size:12px;transition:all 0.2s" title="${positionLabels[s.position]||s.position} · ${teamLabels[s.team]||s.team||''}${s.check_in ? ' · '+s.check_in.slice(11,16)+' 출근':''}">
                <span style="font-size:10px">${statusIcon}</span>
                <span style="font-weight:700;color:var(--text)">${esc(s.name)}</span>
                <span style="font-size:10px;padding:1px 6px;border-radius:6px;background:${posColor}15;color:${posColor};font-weight:600">${positionLabels[s.position]||s.position||''}</span>
              </div>`;
            }).join('')}
            ${tempStaff.map(t => `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;position:relative">
              <span style="font-size:10px">⭐</span>
              <span style="font-weight:700;color:var(--text)">${esc(t.name)}</span>
              <span style="font-size:10px;padding:1px 6px;border-radius:6px;background:#ef444415;color:#ef4444;font-weight:600">${esc(t.position||'알바')}</span>
              <button data-remove-temp="${t.id}" style="width:16px;height:16px;border-radius:50%;background:#ef4444;color:white;border:none;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:2px" title="제거">✕</button>
            </div>`).join('')}
            <button id="tbAddTempStaffBtn" style="display:flex;align-items:center;gap:4px;padding:6px 14px;border-radius:10px;background:white;border:2px dashed #f59e0b;color:#f59e0b;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='#f59e0b';this.style.color='white'" onmouseout="this.style.background='white';this.style.color='#f59e0b'">
              <span style="font-size:14px">+</span> 알바/직원 추가
            </button>
            ${presentStaff.length === 0 && tempStaff.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);padding:4px">출근한 직원이 없습니다</div>' : ''}
          </div>
        </div>`;

        // ── 직원 추가 이벤트 ──
        staffBar.querySelectorAll('[data-remove-temp]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const tempId = btn.getAttribute('data-remove-temp');
            try {
              await api('/api/protected/staff/temp/' + tempId, { method:'DELETE' });
              toast('임시 직원 제거됨', 'success'); loadBoard();
            } catch(err) { toast(err.message, 'error'); }
          });
        });

        const addTempBtn = document.getElementById('tbAddTempStaffBtn');
        if (addTempBtn) {
          addTempBtn.addEventListener('click', () => {
            const modal = document.getElementById('modalContent');
            modal.style.maxWidth = '420px';
            modal.innerHTML = `
              <div class="modal-header"><h3>👥 알바/임시 직원 추가</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
              <div class="modal-body">
                <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">오늘 하루 임시로 근무하는 직원을 추가합니다.</p>
                <div class="form-group"><label>이름 *</label><input class="form-input" id="tempName" placeholder="예: 김알바"></div>
                <div class="form-grid">
                  <div class="form-group"><label>직급</label>
                    <select class="form-input" id="tempPosition">
                      <option value="알바">알바</option>
                      <option value="hygienist">치과위생사</option>
                      <option value="desk">데스크</option>
                      <option value="sterilization">소독</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div class="form-group"><label>소속팀</label>
                    <select class="form-input" id="tempTeam">
                      <option value="">미지정</option>
                      <option value="clinical">진료팀</option>
                      <option value="front">프론트</option>
                      <option value="support">지원팀</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="tempSubmitBtn">추가</button></div>`;
            showModal();
            document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
            document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
            document.getElementById('tempSubmitBtn').addEventListener('click', async () => {
              const name = document.getElementById('tempName').value.trim();
              if (!name) { toast('이름을 입력해주세요', 'error'); return; }
              try {
                await api('/api/protected/staff/temp', { method:'POST', json:{
                  name,
                  position: document.getElementById('tempPosition').value,
                  team: document.getElementById('tempTeam').value,
                  date: boardDate,
                }});
                toast(name + ' 추가됨!', 'success'); modal.style.maxWidth=''; closeModal(); loadBoard();
              } catch(err) { toast(err.message, 'error'); }
            });
          });
        }
      }

      // ── 원장 추가 버튼 이벤트 ──
      const addDocBtn = document.getElementById('tbAddDoctorBtn');
      if (addDocBtn) {
        addDocBtn.addEventListener('click', () => {
          // 현재 근무중이 아닌 원장 목록 (휴무/휴가 + 등록된 의사 중 on-duty 목록에 없는)
          const offDutyDoctors = dutyList.filter(d => d.status === 'day_off' || d.status === 'vacation');
          const allDocIds = new Set(dutyList.map(d => d.id));
          const unlistedDoctors = doctorList.filter(d => !allDocIds.has(d.id));

          const modal = document.getElementById('modalContent');
          modal.style.maxWidth = '420px';
          modal.innerHTML = `
            <div class="modal-header"><h3>👨‍⚕️ 원장 추가 (임시 출근)</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
            <div class="modal-body">
              <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">오늘 추가로 출근하는 원장을 선택해주세요. 근무스케줄과 별개로 오늘 하루 출근 처리됩니다.</p>
              ${offDutyDoctors.length > 0 ? `
                <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">📋 휴무/휴가 중인 원장</div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
                  ${offDutyDoctors.map(d => `<button class="btn btn-secondary" data-add-doctor="${d.id}" style="display:flex;align-items:center;gap:8px;justify-content:flex-start;padding:12px 16px;font-size:13px">
                    <span style="width:32px;height:32px;border-radius:50%;background:var(--primary)15;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--primary)">${d.name.charAt(0)}</span>
                    <span style="font-weight:700">${esc(d.name)}</span>
                    <span style="font-size:10px;color:var(--text-muted)">${d.role==='admin'?'원장':'선생'}</span>
                    <span style="font-size:10px;padding:2px 6px;border-radius:8px;background:${d.status==='vacation'?'#fef3c7':'#f1f5f9'};color:${d.status==='vacation'?'#f59e0b':'#94a3b8'};margin-left:auto">${d.status==='vacation'?'휴가':'휴무'}</span>
                  </button>`).join('')}
                </div>` : ''}
              ${unlistedDoctors.length > 0 ? `
                <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">📋 기타 등록된 원장</div>
                <div style="display:flex;flex-direction:column;gap:8px">
                  ${unlistedDoctors.map(d => `<button class="btn btn-secondary" data-add-doctor="${d.id}" style="display:flex;align-items:center;gap:8px;justify-content:flex-start;padding:12px 16px;font-size:13px">
                    <span style="width:32px;height:32px;border-radius:50%;background:#6366f115;display:flex;align-items:center;justify-content:center;font-weight:800;color:#6366f1">${d.name.charAt(0)}</span>
                    <span style="font-weight:700">${esc(d.name)}</span>
                    <span style="font-size:10px;color:var(--text-muted)">${d.role==='admin'?'원장':'선생'}</span>
                  </button>`).join('')}
                </div>` : ''}
              ${offDutyDoctors.length === 0 && unlistedDoctors.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">추가할 수 있는 원장이 없습니다.<br>모든 원장이 이미 출근 상태입니다.</div>' : ''}
            </div>`;
          showModal();
          document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
          modal.querySelectorAll('[data-add-doctor]').forEach(btn => {
            btn.addEventListener('click', async () => {
              const docId = btn.getAttribute('data-add-doctor');
              try {
                await api('/api/protected/doctors/on-duty/add', { method:'POST', json:{ doctor_id: docId, date: boardDate }});
                toast('원장 출근 처리 완료!', 'success'); modal.style.maxWidth=''; closeModal(); loadBoard();
              } catch(err) { toast(err.message, 'error'); }
            });
          });
        });
      }

      // 휴무 원장 출근 처리 버튼 (인라인)
      doctorBar.querySelectorAll('[data-action="add-duty"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const docId = btn.getAttribute('data-doctor-id');
          try {
            await api('/api/protected/doctors/on-duty/add', { method:'POST', json:{ doctor_id: docId, date: boardDate }});
            toast('출근 처리 완료!', 'success'); loadBoard();
          } catch(err) { toast(err.message, 'error'); }
        });
      });

      // 원장별 환자 분류
      const waitingItems = items.filter(i => !i.assigned_doctor && !['completed','cancelled','no_show'].includes(i.status));
      const completedItems = items.filter(i => ['completed','cancelled','no_show'].includes(i.status));
      const doctorNeeded = items.filter(i => i.status === 'doctor_needed');

      // 전체 요약 바
      const activeCount = items.filter(i => !['completed','cancelled','no_show'].includes(i.status)).length;
      const statusCounts = {};
      items.forEach(i => { statusCounts[i.status] = (statusCounts[i.status]||0) + 1; });

      summary.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
          <div style="font-size:18px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px">
            📡 <span>${boardDate === today ? '오늘의 진료보드' : boardDate}</span>
            <span style="font-size:14px;font-weight:600;color:var(--text-muted)">총 ${items.length}명 (진행 ${activeCount})</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">
            ${Object.entries(statusCounts).filter(([k])=>!['cancelled','no_show'].includes(k)).map(([k,v]) => `<div style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;background:${statusColors[k]||'#94a3b8'}15;font-size:11px;font-weight:600;color:${statusColors[k]||'#94a3b8'}">${statusEmojis[k]||''} ${statusLabels[k]||k} ${v}</div>`).join('')}
          </div>
        </div>
        ${doctorNeeded.length ? `<div style="background:#fef2f2;border:2px solid #fecaca;border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:8px;animation:pulse 1.5s infinite">
          <span style="font-size:20px">🔔</span>
          <span style="font-weight:700;color:#ef4444">원장님 호출!</span>
          ${doctorNeeded.map(d => `<span style="background:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid #fecaca">${d.chair_number ? d.chair_number+'번 '+T.chair+' ' : ''}${esc(d.patient_name)} - ${esc(d.treatment_desc||treatmentTypeLabels[d.treatment_type]||'')}</span>`).join('')}
        </div>` : ''}`;

      // ── 컬럼 빌드: [📋 대기] + [원장별] + [✅ 완료] ──
      function renderCard(item) {
        const sc = statusColors[item.status] || '#94a3b8';
        const ptColor = patientTypeColors[item.patient_type] || '#3b82f6';
        const isDoctorNeeded = item.status === 'doctor_needed';
        const isCompleted = ['completed','cancelled','no_show'].includes(item.status);
        const locationInfo = [];
        if (item.chair_number) locationInfo.push(`💺 ${item.chair_number}번 ${T.chair}`);
        if (item.room_name) locationInfo.push(`🚪 ${esc(item.room_name)}`);
        if (item.floor) locationInfo.push(`${esc(item.floor)}`);
        return `<div class="kb-card" draggable="${isCompleted?'false':'true'}" data-id="${item.id}" style="--accent:${isDoctorNeeded?'#ef4444':sc};${isDoctorNeeded?'animation:pulse 2s infinite;':''}${isCompleted?'opacity:0.55;':''}cursor:pointer">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
            <span style="font-size:11px">${statusEmojis[item.status]||''}</span>
            <span class="kb-card-badge" style="--badge-color:${ptColor};font-size:9px">${patientTypeLabels[item.patient_type]||'구환'}</span>
            <strong style="font-size:13px">${esc(item.patient_name)}</strong>
            ${item.chart_number ? `<span style="font-size:9px;color:var(--text-muted)">#${esc(item.chart_number)}</span>` : ''}
          </div>
          <div class="kb-card-desc">${esc(item.treatment_desc || treatmentTypeLabels[item.treatment_type] || '')}</div>
          <div class="kb-card-meta">
            ${locationInfo.length ? `<span class="kb-card-info" style="background:#e0f2fe;color:#0369a1;font-weight:600">${locationInfo.join(' · ')}</span>` : ''}
            ${item.staff_name ? `<span class="kb-card-info">👩‍⚕️ ${esc(item.staff_name)}</span>` : ''}
            ${item.appointment_time ? `<span class="kb-card-info" style="margin-left:auto">⏰ ${item.appointment_time}</span>` : ''}
          </div>
        </div>`;
      }

      let html = '';

      // 1) 📋 대기 컬럼 (원장 미배정)
      html += `<div class="kb-col" data-doctor-id="" style="min-width:240px">
        <div class="kb-col-header" style="--col-color:#94a3b8">
          <span>📋 진료실 대기</span>
          <span class="kb-col-count" style="background:#94a3b8">${waitingItems.length}</span>
        </div>
        <div class="kb-col-body">
          ${waitingItems.length ? waitingItems.map(renderCard).join('') : '<div class="kb-col-empty">대기 환자 없음 👍</div>'}
        </div>
      </div>`;

      // 2) 원장별 컬럼
      const docColors = ['#0f766e', '#6366f1', '#c026d3', '#ea580c', '#0284c7', '#b91c1c'];
      doctors.forEach((doc, idx) => {
        const docItems = items.filter(i => i.assigned_doctor === doc.id && !['completed','cancelled','no_show'].includes(i.status));
        const docColor = docColors[idx % docColors.length];
        const hasUrgent = docItems.some(i => i.status === 'doctor_needed');
        html += `<div class="kb-col" data-doctor-id="${doc.id}" style="min-width:260px;${hasUrgent?'border:2px solid #ef4444;':''}">
          <div class="kb-col-header" style="--col-color:${docColor}">
            <span>👨‍⚕️ ${esc(doc.name)} ${doc.role==='admin'?'원장':'선생'}</span>
            <span class="kb-col-count" style="background:${docColor}">${docItems.length}</span>
          </div>
          <div class="kb-col-body">
            ${docItems.length ? docItems.map(renderCard).join('') : '<div class="kb-col-empty">배정된 환자 없음</div>'}
          </div>
        </div>`;
      });

      // 3) ✅ 완료 컬럼
      if (completedItems.length) {
        html += `<div class="kb-col" data-doctor-id="__completed__" style="min-width:200px;opacity:0.6">
          <div class="kb-col-header" style="--col-color:#22c55e">
            <span>✅ 완료</span>
            <span class="kb-col-count" style="background:#22c55e">${completedItems.length}</span>
          </div>
          <div class="kb-col-body">${completedItems.map(renderCard).join('')}</div>
        </div>`;
      }

      container.innerHTML = html;

      // ── 드래그 & 드롭: 원장 컬럼 간 이동 ──
      let _tbDrag = null;
      container.addEventListener('dragstart', (e) => {
        const card = e.target.closest('[draggable="true"]');
        if (!card) return;
        _tbDrag = { id: card.dataset.id, fromCol: card.closest('.kb-col')?.dataset.doctorId };
        card.classList.add('kb-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      container.addEventListener('dragend', (e) => {
        const card = e.target.closest('[draggable="true"]');
        if (card) card.classList.remove('kb-dragging');
        container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
        _tbDrag = null;
      });
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const col = e.target.closest('.kb-col');
        container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
        if (col && _tbDrag && col.dataset.doctorId !== '__completed__' && col.dataset.doctorId !== _tbDrag.fromCol) col.classList.add('kb-drag-over');
      });
      container.addEventListener('dragleave', (e) => {
        const col = e.target.closest('.kb-col');
        if (col && !col.contains(e.relatedTarget)) col.classList.remove('kb-drag-over');
      });
      container.addEventListener('drop', async (e) => {
        e.preventDefault();
        const col = e.target.closest('.kb-col');
        container.querySelectorAll('.kb-col').forEach(c => c.classList.remove('kb-drag-over'));
        if (!col || !_tbDrag || col.dataset.doctorId === '__completed__') return;
        const newDocId = col.dataset.doctorId; // '' = 대기, 'u-xxx' = 원장
        if (newDocId === _tbDrag.fromCol) return;

        // 이동한 카드를 새 컬럼의 맨 위(sort_order=0)에 넣고, 기존 카드들 순서 재정렬
        const draggedId = _tbDrag.id;
        _tbDrag = null;

        // 새 컬럼의 기존 카드들
        const existingInCol = allItems.filter(i =>
          (newDocId === '' ? !i.assigned_doctor : i.assigned_doctor === newDocId) &&
          !['completed','cancelled','no_show'].includes(i.status) &&
          i.id !== draggedId
        );
        const reorderItems = [
          { id: draggedId, assigned_doctor: newDocId || null, sort_order: 1 },
          ...existingInCol.map((item, idx) => ({
            id: item.id, assigned_doctor: newDocId || null, sort_order: idx + 2
          }))
        ];
        try {
          await api('/api/protected/treatment-board-reorder', { method:'PUT', json:{ items: reorderItems }});
          const docName = newDocId ? doctors.find(d=>d.id===newDocId)?.name||'' : '대기';
          toast(`${docName}${newDocId?'에게':''} 배정됨 (맨 위)`, 'success');
          loadBoard();
        } catch(err) { toast(err.message, 'error'); loadBoard(); }
      });

      // 카드 클릭 → 상세
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openTreatmentDetail(el.dataset.id, allItems, loadBoard, doctors, chairs, T);
        });
      });

    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
  }
  loadBoard();
  // Start smart polling (every 15 seconds)
  startPolling(loadBoard, 15000);

  document.getElementById('tbDatePicker').addEventListener('change', (e) => {
    boardDate = e.target.value;
    loadBoard();
  });

  document.getElementById('addTreatmentBtn').addEventListener('click', async () => {
    // 체어를 층/방 기준으로 그룹핑
    const chairsByLocation = {};
    chairs.forEach(c => {
      const key = (c.floor ? c.floor + ' ' : '') + (c.room_name || '기타');
      if (!chairsByLocation[key]) chairsByLocation[key] = [];
      chairsByLocation[key].push(c);
    });
    const chairSelectHtml = Object.entries(chairsByLocation).length > 0
      ? Object.entries(chairsByLocation).map(([loc, chs]) =>
          `<optgroup label="📍 ${esc(loc)}">${chs.map(c =>
            `<option value="${c.id}">${c.chair_number}번 ${T.chair}${c.room_name?' ('+esc(c.room_name)+')':''}${c.floor?' · '+esc(c.floor):''}</option>`
          ).join('')}</optgroup>`
        ).join('')
      : '<option value="" disabled>등록된 ' + T.chair + '가 없습니다</option>';

    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '640px';
    modal.innerHTML = `
      <div class="modal-header"><h3>🦷 환자 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-grid">
          <div class="form-group"><label>환자명 *</label><input class="form-input" id="tbPatient" placeholder="환자 이름"></div>
          <div class="form-group"><label>차트번호</label><input class="form-input" id="tbChart" placeholder="000000"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>환자 유형</label><select class="form-input" id="tbType"><option value="existing">구환</option><option value="new">신환</option><option value="emergency">응급</option><option value="referral">소개</option></select></div>
          <div class="form-group"><label>예약 시간</label><input class="form-input" type="time" id="tbTime"></div>
        </div>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:var(--radius);padding:14px;margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:10px;display:flex;align-items:center;gap:6px">📍 위치 배정</div>
          <div class="form-grid">
            <div class="form-group" style="margin-bottom:0"><label style="font-size:11px">${T.chair} / ${T.room}</label>
              <select class="form-input" id="tbChair" style="font-size:13px">
                <option value="">미배정</option>
                ${chairSelectHtml}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0"><label style="font-size:11px">위치 메모 <span style="color:var(--text-muted);font-weight:400">(선택)</span></label>
              <input class="form-input" id="tbLocationNote" placeholder="예: ${T.surgery_room}, VIP${T.room} 등" style="font-size:13px">
            </div>
          </div>
          <div id="tbChairInfo" style="margin-top:8px;font-size:11px;color:#0369a1;display:none"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>진료 유형</label><select class="form-input" id="tbTreatType">
            ${Object.entries(treatmentTypeLabels).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>담당 원장</label><select class="form-input" id="tbDoctor">
            <option value="">📋 대기 (미배정)</option>
            ${onDutyDoctors.filter(d => d.status === 'on_duty' || d.status === 'scheduled').length > 0
              ? `<optgroup label="🟢 오늘 근무중">${onDutyDoctors.filter(d => d.status === 'on_duty' || d.status === 'scheduled').map(d => `<option value="${d.id}">👨‍⚕️ ${esc(d.name)} ${d.role==='admin'?'원장':'선생'}${d.status==='on_duty'?' ✓ 출근':''}</option>`).join('')}</optgroup>` : ''}
            ${doctors.filter(d => !onDutyDoctors.some(od => od.id === d.id && (od.status === 'on_duty' || od.status === 'scheduled'))).length > 0
              ? `<optgroup label="⚪ 기타">${doctors.filter(d => !onDutyDoctors.some(od => od.id === d.id && (od.status === 'on_duty' || od.status === 'scheduled'))).map(d => `<option value="${d.id}">👨‍⚕️ ${esc(d.name)} ${d.role==='admin'?'원장':'선생'}</option>`).join('')}</optgroup>` : ''}
          </select></div>
        </div>
        <div class="form-group"><label>진료 내용</label><input class="form-input" id="tbDesc" placeholder="예: 임플란트 2차 수술, 크라운 세팅 등"></div>
        <div class="form-group"><label>메모</label><textarea class="form-input" id="tbNotes" rows="2" placeholder="특이사항, 주의사항"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="tbSubmitBtn">등록</button></div>`;
    showModal();

    // 체어 선택 시 상세정보 표시
    document.getElementById('tbChair').addEventListener('change', (e) => {
      const chairId = e.target.value;
      const infoEl = document.getElementById('tbChairInfo');
      if (chairId) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair) {
          infoEl.style.display = 'block';
          infoEl.innerHTML = `💺 <strong>${chair.chair_number}번 ${T.chair}</strong>${chair.room_name?' · 🚪 '+esc(chair.room_name):''}${chair.floor?' · 🏢 '+esc(chair.floor):''}`;
        }
      } else {
        infoEl.style.display = 'none';
      }
    });

    document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('tbSubmitBtn').addEventListener('click', async () => {
      const name = document.getElementById('tbPatient').value.trim();
      if (!name) { toast('환자명을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('tbSubmitBtn'); btn.disabled = true;
      const locationNote = document.getElementById('tbLocationNote').value.trim();
      const notesVal = document.getElementById('tbNotes').value;
      const combinedNotes = locationNote ? (notesVal ? locationNote + ' | ' + notesVal : locationNote) : notesVal;
      try {
        await api('/api/protected/treatment-board', { method:'POST', json:{
          patient_name: name,
          patient_type: document.getElementById('tbType').value,
          chart_number: document.getElementById('tbChart').value,
          chair_id: document.getElementById('tbChair').value || null,
          assigned_doctor: document.getElementById('tbDoctor').value || null,
          treatment_type: document.getElementById('tbTreatType').value,
          treatment_desc: document.getElementById('tbDesc').value,
          appointment_time: document.getElementById('tbTime').value || null,
          notes: combinedNotes,
          board_date: boardDate,
        }});
        toast('환자가 등록되었습니다!', 'success'); modal.style.maxWidth=''; closeModal(); loadBoard();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

function openTreatmentDetail(itemId, items, reload, doctors, chairs, T) {
  T = T || { chair:'체어', room:'진료실', floor:'층', surgery_room:'수술실' };
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  const statusFlow = [
    { id: 'waiting', label: '대기', emoji: '🕐' },
    { id: 'arrived', label: '도착', emoji: '🚶' },
    { id: 'seating', label: '자리안내', emoji: '💺' },
    { id: 'in_treatment', label: '진료중', emoji: '🦷' },
    { id: 'doctor_needed', label: '원장호출', emoji: '🔔' },
    { id: 'completed', label: '완료', emoji: '✅' },
  ];
  const treatmentTypeLabels = { general:'일반진료', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경치료', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', emergency:'응급', checkup:'검진', other:'기타' };
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '560px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>🦷 ${esc(item.patient_name)}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" id="tbDelBtn" title="삭제">${ICONS.trash}</button>
        <button class="btn-icon" id="modalClose">${ICONS.close}</button>
      </div>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${item.chart_number ? `<span class="meta-pill">📋 #${esc(item.chart_number)}</span>` : ''}
        <span class="meta-pill">🦷 ${treatmentTypeLabels[item.treatment_type]||item.treatment_type}</span>
        ${item.chair_number ? `<span class="meta-pill" style="background:#e0f2fe;color:#0369a1">💺 ${item.chair_number}번 ${T.chair}</span>` : ''}
        ${item.room_name ? `<span class="meta-pill" style="background:#e0f2fe;color:#0369a1">🚪 ${esc(item.room_name)}</span>` : ''}
        ${item.floor ? `<span class="meta-pill" style="background:#e0f2fe;color:#0369a1">🏢 ${esc(item.floor)}</span>` : ''}
        ${item.doctor_name ? `<span class="meta-pill">👨‍⚕️ ${esc(item.doctor_name)}</span>` : '<span class="meta-pill" style="background:#fef2f2;color:#ef4444">📋 대기 (미배정)</span>'}
        ${item.staff_name ? `<span class="meta-pill">👩‍⚕️ ${esc(item.staff_name)}</span>` : ''}
        ${item.appointment_time ? `<span class="meta-pill">⏰ ${item.appointment_time}</span>` : ''}
      </div>
      ${item.treatment_desc ? `<div style="background:var(--bg);padding:12px;border-radius:var(--radius-sm);font-size:13px;margin-bottom:16px">${esc(item.treatment_desc)}</div>` : ''}
      ${item.notes ? `<div style="background:#eff6ff;padding:10px 12px;border-radius:var(--radius-sm);font-size:12px;margin-bottom:16px"><strong>메모:</strong> ${esc(item.notes)}</div>` : ''}

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">담당 원장 변경</div>
      <select class="form-input" id="tbDocSelect" style="margin-bottom:12px;font-size:13px">
        <option value="" ${!item.assigned_doctor?'selected':''}>📋 대기 (미배정)</option>
        ${(doctors||[]).map(d => `<option value="${d.id}" ${item.assigned_doctor===d.id?'selected':''}}>👨‍⚕️ ${esc(d.name)}</option>`).join('')}
      </select>

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">${T.chair} / 위치 변경</div>
      <select class="form-input" id="tbChairSelect" style="margin-bottom:16px;font-size:13px">
        <option value="" ${!item.chair_id?'selected':''}>미배정</option>
        ${(chairs||[]).map(ch => `<option value="${ch.id}" ${item.chair_id===ch.id?'selected':''}}>💺 ${ch.chair_number}번 ${T.chair}${ch.room_name?' · '+esc(ch.room_name):''}${ch.floor?' · '+esc(ch.floor):''}</option>`).join('')}
      </select>

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">진료 상태</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap" id="tbStatusBtns">
        ${statusFlow.map(s => `<button class="btn ${item.status===s.id?'btn-primary':'btn-secondary'} btn-sm" data-status="${s.id}" style="flex:1;min-width:70px;font-size:11px">${s.emoji} ${s.label}</button>`).join('')}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-secondary btn-sm" data-status="cancelled" style="font-size:11px;opacity:0.7">❌ 취소</button>
        <button class="btn btn-secondary btn-sm" data-status="no_show" style="font-size:11px;opacity:0.7">🚫 노쇼</button>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">
        ${item.arrived_at ? `<span>🚶 도착: ${new Date(item.arrived_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
        ${item.treatment_started_at ? `<span>🦷 시작: ${new Date(item.treatment_started_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
        ${item.completed_at ? `<span>✅ 완료: ${new Date(item.completed_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>` : ''}
      </div>

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">💬 빠른 메시지</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="tbQuickMsgBtns">
          ${(doctors||[]).map(d => `<button class="btn btn-secondary btn-sm" data-doctor-id="${d.id}" style="font-size:11px">💬 ${esc(d.name)}에게</button>`).join('')}
          <button class="btn btn-secondary btn-sm" id="tbOpenChatBtn" style="font-size:11px;border-color:#0f766e;color:#0f766e">💬 메신저 열기</button>
        </div>
      </div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
  document.getElementById('tbDelBtn').addEventListener('click', async () => {
    if (!confirm('이 환자를 목록에서 삭제하시겠습니까?')) return;
    await api('/api/protected/treatment-board/' + itemId, { method:'DELETE' });
    toast('삭제됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // 원장 변경
  document.getElementById('tbDocSelect').addEventListener('change', async (e) => {
    const newDoc = e.target.value || null;
    await api('/api/protected/treatment-board/' + itemId, { method:'PUT', json:{ assigned_doctor: newDoc }});
    toast('원장 변경됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // 체어 변경
  document.getElementById('tbChairSelect').addEventListener('change', async (e) => {
    const newChair = e.target.value || null;
    await api('/api/protected/treatment-board/' + itemId, { method:'PUT', json:{ chair_id: newChair }});
    const chair = (chairs||[]).find(c => c.id === newChair);
    toast(chair ? `${chair.chair_number}번 ${T.chair}(으)로 이동` : `${T.chair} 해제됨`, 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // 상태 변경
  modal.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/api/protected/treatment-board/' + itemId, { method:'PUT', json:{ status: btn.dataset.status }});
      toast((statusFlow.find(s=>s.id===btn.dataset.status)?.label||btn.dataset.status) + ' 처리됨', 'success');
      modal.style.maxWidth=''; closeModal(); reload();
    });
  });
  // 퀵 메시지 → 원장에게 DM
  modal.querySelectorAll('#tbQuickMsgBtns [data-doctor-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (PFM.modules.chat) {
        await PFM.modules.chat.sendBoardMessage(btn.dataset.doctorId, item);
        modal.style.maxWidth=''; closeModal();
      }
    });
  });
  // 메신저 열기
  document.getElementById('tbOpenChatBtn')?.addEventListener('click', () => {
    modal.style.maxWidth=''; closeModal();
    if (PFM.modules.chat) PFM.modules.chat.openChatPanel();
  });
}

/* ═══ 상담관리: 파이프라인 (Consultation Pipeline) ═══ */
async function renderConsultationPipeline(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addConsultBtn">${ICONS.plus} 상담 등록</button>`;

  const statusCols = [
    { id: 'inquiry', label: '문의', color: '#94a3b8', emoji: '📞' },
    { id: 'reserved', label: '예약', color: '#6366f1', emoji: '📅' },
    { id: 'visited', label: '내원', color: '#3b82f6', emoji: '🚶' },
    { id: 'consulting', label: '상담중', color: '#8b5cf6', emoji: '💬' },
    { id: 'agreed', label: '동의', color: '#14b8a6', emoji: '🤝' },
    { id: 'payment', label: '수납', color: '#f59e0b', emoji: '💳' },
    { id: 'treatment', label: '진료', color: '#22c55e', emoji: '🦷' },
    { id: 'completed', label: '완료', color: '#10b981', emoji: '🎉' },
  ];
  const sourceLabels = { walk_in:'도보', phone:'전화', naver:'네이버', instagram:'인스타', youtube:'유튜브', blog:'블로그', referral:'소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
  const sourceColors = { walk_in:'#94a3b8', phone:'#3b82f6', naver:'#22c55e', instagram:'#e11d48', youtube:'#ef4444', blog:'#14b8a6', referral:'#8b5cf6', kakao:'#f59e0b', homepage:'#6366f1', other:'#94a3b8' };
  const treatLabels = { general:'일반', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };

  body.innerHTML = `<div class="kb-hint">💡 카드를 드래그하여 상담 단계를 변경할 수 있습니다. 카드 클릭 시 상담 기록을 확인/추가할 수 있습니다.</div><div class="kb-board" id="consultBoard" style="min-height:500px"></div>`;

  async function loadPipeline() {
    const container = document.getElementById('consultBoard');
    try {
      const consultations = await api('/api/protected/consultations');

      container.innerHTML = statusCols.map(col => {
        const colItems = consultations.filter(c => c.status === col.id);
        const colAmount = colItems.reduce((s, c) => s + (c.estimated_amount||0), 0);
        return `<div class="kb-col" data-status="${col.id}" style="min-width:220px">
          <div class="kb-col-header" style="--col-color:${col.color}">
            <span>${col.emoji} ${col.label}</span>
            <span class="kb-col-count" style="background:${col.color}">${colItems.length}</span>
          </div>
          ${colAmount ? `<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:4px 0;background:${col.color}08;border-bottom:1px solid var(--border-light)">💰 ${colAmount.toLocaleString()}만원</div>` : ''}
          <div class="kb-col-body">
            ${colItems.length ? colItems.map(c => `
              <div class="kb-card" draggable="true" data-id="${c.id}" style="--accent:${sourceColors[c.source_channel]||'#6366f1'}">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <strong style="font-size:13px">${esc(c.patient_name)}</strong>
                  <span class="kb-card-badge" style="--badge-color:${sourceColors[c.source_channel]||'#94a3b8'};font-size:9px">${sourceLabels[c.source_channel]||c.source_channel}</span>
                </div>
                <div class="kb-card-desc">${treatLabels[c.treatment_type]||c.treatment_type}${c.estimated_amount ? ' · '+c.estimated_amount+'만원' : ''}</div>
                <div class="kb-card-meta">
                  ${c.counselor_name ? `<span class="kb-card-info">👤 ${esc(c.counselor_name)}</span>` : ''}
                  ${c.patient_phone ? `<span class="kb-card-info">📱</span>` : ''}
                  <span class="kb-card-info" style="margin-left:auto">${c.consultation_date||''}</span>
                </div>
              </div>
            `).join('') : '<div class="kb-col-empty">없음</div>'}
          </div>
        </div>`;
      }).join('');

      // Lost/cancelled
      const lost = consultations.filter(c => ['lost','cancelled'].includes(c.status));
      if (lost.length) {
        container.insertAdjacentHTML('beforeend', `
          <div class="kb-col" style="min-width:200px;opacity:0.6">
            <div class="kb-col-header" style="--col-color:#ef4444"><span>💔 이탈/취소</span><span class="kb-col-count" style="background:#ef4444">${lost.length}</span></div>
            <div class="kb-col-body">${lost.map(c => `
              <div class="kb-card" data-id="${c.id}" style="--accent:#94a3b8;cursor:pointer">
                <div class="kb-card-title" style="opacity:0.7">${esc(c.patient_name)}</div>
                <div class="kb-card-meta">
                  <span class="kb-card-badge" style="--badge-color:#ef4444">${c.status==='lost'?'이탈':'취소'}</span>
                  ${c.lost_reason ? `<span class="kb-card-info">${esc(c.lost_reason)}</span>` : ''}
                </div>
              </div>`).join('')}</div>
          </div>`);
      }

      // Drag & Drop
      initKanbanDnD(container, async (cId, newStatus) => {
        try {
          if (newStatus === 'lost') {
            const reason = prompt('이탈 사유를 입력해주세요:');
            await api('/api/protected/consultations/' + cId, { method:'PUT', json:{ status: newStatus, lost_reason: reason||'' }});
          } else {
            await api('/api/protected/consultations/' + cId, { method:'PUT', json:{ status: newStatus }});
          }
          toast('상태 변경됨', 'success');
          loadPipeline();
        } catch(e) { toast(e.message, 'error'); loadPipeline(); }
      });

      // Click card
      container.querySelectorAll('.kb-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (el.classList.contains('kb-dragging')) return;
          openConsultDetail(el.dataset.id, consultations, loadPipeline);
        });
      });
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
  }
  loadPipeline();

  document.getElementById('addConsultBtn').addEventListener('click', () => {
    const sourceLabels2 = { walk_in:'도보 내원', phone:'전화 문의', naver:'네이버', instagram:'인스타그램', youtube:'유튜브', blog:'블로그', referral:'지인 소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
    const treatLabels2 = { general:'일반진료', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경치료', perio:'치주치료', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };
    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '600px';
    modal.innerHTML = `
      <div class="modal-header"><h3>💬 상담 등록</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
      <div class="modal-body"><form class="auth-form">
        <div class="form-grid">
          <div class="form-group"><label>환자명 *</label><input class="form-input" id="csName" placeholder="환자 이름"></div>
          <div class="form-group"><label>연락처</label><input class="form-input" id="csPhone" placeholder="010-1234-5678"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>유입 경로</label><select class="form-input" id="csSource">${Object.entries(sourceLabels2).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="form-group"><label>진료 유형</label><select class="form-input" id="csTreatment">${Object.entries(treatLabels2).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>예상 금액 (만원)</label><input class="form-input" type="number" id="csAmount" placeholder="0"></div>
          <div class="form-group"><label>상담일</label><input class="form-input" type="date" id="csDate" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-group"><label>상담 메모</label><textarea class="form-input" id="csNotes" rows="3" placeholder="상담 내용, 환자 반응, 특이사항 등"></textarea></div>
      </form></div>
      <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="csSubmitBtn">등록</button></div>`;
    showModal();
    document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('modalCancelBtn').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
    document.getElementById('csSubmitBtn').addEventListener('click', async () => {
      const name = document.getElementById('csName').value.trim();
      if (!name) { toast('환자명을 입력해주세요', 'error'); return; }
      const btn = document.getElementById('csSubmitBtn'); btn.disabled = true;
      try {
        await api('/api/protected/consultations', { method:'POST', json:{
          patient_name: name,
          patient_phone: document.getElementById('csPhone').value,
          source_channel: document.getElementById('csSource').value,
          treatment_type: document.getElementById('csTreatment').value,
          estimated_amount: parseFloat(document.getElementById('csAmount').value) || null,
          consultation_date: document.getElementById('csDate').value,
          notes: document.getElementById('csNotes').value,
        }});
        toast('상담이 등록되었습니다!', 'success'); modal.style.maxWidth=''; closeModal(); loadPipeline();
      } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
    });
  });
}

async function openConsultDetail(consultId, consultations, reload) {
  const c = consultations.find(x => x.id === consultId);
  if (!c) return;
  const statusLabels = { inquiry:'문의', reserved:'예약', visited:'내원', consulting:'상담중', agreed:'동의', payment:'수납', treatment:'진료', completed:'완료', lost:'이탈', cancelled:'취소' };
  const statusOrder = ['inquiry','reserved','visited','consulting','agreed','payment','treatment','completed'];
  const sourceLabels = { walk_in:'도보', phone:'전화', naver:'네이버', instagram:'인스타', youtube:'유튜브', blog:'블로그', referral:'소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
  const treatLabels = { general:'일반', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };

  let notes = [];
  try { notes = await api('/api/protected/consultations/' + consultId + '/notes'); } catch(e) {}

  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '680px';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>💬 ${esc(c.patient_name)}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-icon" id="csDelBtn" title="삭제">${ICONS.trash}</button>
        <button class="btn-icon" id="modalClose">${ICONS.close}</button>
      </div>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <span class="meta-pill">📞 ${sourceLabels[c.source_channel]||c.source_channel}</span>
        <span class="meta-pill">🦷 ${treatLabels[c.treatment_type]||c.treatment_type}</span>
        ${c.patient_phone ? `<span class="meta-pill">📱 ${esc(c.patient_phone)}</span>` : ''}
        ${c.estimated_amount ? `<span class="meta-pill">💰 예상 ${c.estimated_amount}만원</span>` : ''}
        ${c.agreed_amount ? `<span class="meta-pill">🤝 동의 ${c.agreed_amount}만원</span>` : ''}
        ${c.paid_amount ? `<span class="meta-pill">💳 수납 ${c.paid_amount}만원</span>` : ''}
        ${c.counselor_name ? `<span class="meta-pill">👤 ${esc(c.counselor_name)}</span>` : ''}
        ${c.consultation_date ? `<span class="meta-pill">📅 ${c.consultation_date}</span>` : ''}
      </div>

      <div class="mb-16">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">상담 파이프라인</div>
        <div style="display:flex;gap:3px;flex-wrap:wrap" id="csPipeline">
          ${statusOrder.map(s => `<button class="btn ${c.status===s?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}" style="flex:1;min-width:56px;font-size:10px;padding:5px 4px">${statusLabels[s]}</button>`).join('')}
        </div>
        <div style="display:flex;gap:4px;margin-top:6px">
          <button class="btn btn-secondary btn-sm" data-status="lost" style="font-size:10px;opacity:0.7">💔 이탈</button>
          <button class="btn btn-secondary btn-sm" data-status="cancelled" style="font-size:10px;opacity:0.7">❌ 취소</button>
        </div>
      </div>

      <div class="form-grid" class="mb-16">
        <div class="form-group"><label style="font-size:11px;font-weight:700;color:var(--text-muted)">동의 금액 (만원)</label><input class="form-input" type="number" id="csAgreedAmt" value="${c.agreed_amount||''}" placeholder="0"></div>
        <div class="form-group"><label style="font-size:11px;font-weight:700;color:var(--text-muted)">수납 금액 (만원)</label><input class="form-input" type="number" id="csPaidAmt" value="${c.paid_amount||''}" placeholder="0"></div>
      </div>
      <button class="btn btn-secondary btn-sm" id="csAmountSaveBtn" class="mb-16">금액 저장</button>

      <div class="mb-16">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">📝 상담 기록 (${notes.length}건)</div>
        <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px" id="csNotesArea">
          ${notes.length ? notes.map(n => {
            const typeLabels = { general:'메모', objection:'반론', follow_up:'F/U', treatment_plan:'치료계획', payment:'수납', phone_call:'전화' };
            const typeColors = { general:'#6366f1', objection:'#ef4444', follow_up:'#f59e0b', treatment_plan:'#14b8a6', payment:'#22c55e', phone_call:'#3b82f6' };
            return `<div style="background:var(--bg);padding:10px 12px;border-radius:var(--radius-sm);border-left:3px solid ${typeColors[n.note_type]||'#6366f1'}">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
                <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${typeColors[n.note_type]||'#6366f1'}22;color:${typeColors[n.note_type]||'#6366f1'};font-weight:600">${typeLabels[n.note_type]||n.note_type}</span>
                <span class="mod-muted-sm">${esc(n.author_name||'')} · ${timeAgo(n.created_at)}</span>
              </div>
              <div style="font-size:13px;line-height:1.6;white-space:pre-line">${esc(n.content)}</div>
            </div>`;
          }).join('') : '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">기록이 없습니다</div>'}
        </div>
        <div style="display:flex;gap:6px;align-items:flex-end">
          <select class="form-input" id="csNoteType" style="width:auto;padding:6px 10px;font-size:11px">
            <option value="general">메모</option><option value="objection">반론</option><option value="follow_up">F/U</option><option value="treatment_plan">치료계획</option><option value="payment">수납</option><option value="phone_call">전화</option>
          </select>
          <textarea class="form-input" id="csNewNote" rows="2" placeholder="상담 내용을 입력하세요..." class="flex-1"></textarea>
          <button class="btn btn-primary btn-sm" id="csAddNoteBtn" style="white-space:nowrap">기록 추가</button>
        </div>
      </div>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', () => { modal.style.maxWidth=''; closeModal(); });
  document.getElementById('csDelBtn').addEventListener('click', async () => {
    if (!confirm('이 상담을 삭제하시겠습니까?')) return;
    await api('/api/protected/consultations/' + consultId, { method:'DELETE' });
    toast('삭제됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
  });
  // Pipeline buttons
  modal.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.status;
      const json = { status: newStatus };
      if (newStatus === 'lost') {
        const reason = prompt('이탈 사유:');
        if (reason !== null) json.lost_reason = reason;
      }
      await api('/api/protected/consultations/' + consultId, { method:'PUT', json });
      toast(statusLabels[newStatus]+' 처리됨', 'success'); modal.style.maxWidth=''; closeModal(); reload();
    });
  });
  // Amount save
  document.getElementById('csAmountSaveBtn').addEventListener('click', async () => {
    const agreed = parseFloat(document.getElementById('csAgreedAmt').value) || null;
    const paid = parseFloat(document.getElementById('csPaidAmt').value) || null;
    await api('/api/protected/consultations/' + consultId, { method:'PUT', json:{ agreed_amount: agreed, paid_amount: paid }});
    toast('금액 저장됨', 'success');
  });
  // Add note
  document.getElementById('csAddNoteBtn').addEventListener('click', async () => {
    const content = document.getElementById('csNewNote').value.trim();
    if (!content) { toast('내용을 입력해주세요', 'error'); return; }
    await api('/api/protected/consultations/' + consultId + '/notes', { method:'POST', json:{ content, note_type: document.getElementById('csNoteType').value }});
    toast('기록 추가됨', 'success');
    // Reload notes
    const newNotes = await api('/api/protected/consultations/' + consultId + '/notes');
    const typeLabels = { general:'메모', objection:'반론', follow_up:'F/U', treatment_plan:'치료계획', payment:'수납', phone_call:'전화' };
    const typeColors = { general:'#6366f1', objection:'#ef4444', follow_up:'#f59e0b', treatment_plan:'#14b8a6', payment:'#22c55e', phone_call:'#3b82f6' };
    document.getElementById('csNotesArea').innerHTML = newNotes.map(n => `<div style="background:var(--bg);padding:10px 12px;border-radius:var(--radius-sm);border-left:3px solid ${typeColors[n.note_type]||'#6366f1'}">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${typeColors[n.note_type]||'#6366f1'}22;color:${typeColors[n.note_type]||'#6366f1'};font-weight:600">${typeLabels[n.note_type]||n.note_type}</span>
        <span class="mod-muted-sm">${esc(n.author_name||'')} · ${timeAgo(n.created_at)}</span>
      </div>
      <div style="font-size:13px;line-height:1.6;white-space:pre-line">${esc(n.content)}</div>
    </div>`).join('');
    document.getElementById('csNewNote').value = '';
  });
}

/* ═══ 상담관리: 전환율 분석 ═══ */
async function renderConsultationStats(body, actions) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0,7);
  actions.innerHTML = `<input type="month" class="form-input" id="csStatsPeriod" value="${currentMonth}" style="padding:4px 10px;font-size:12px;width:auto">`;

  body.innerHTML = `<div id="csStatsContent"><div style="text-align:center;padding:60px"><span class="loading-spinner"></span></div></div>`;

  async function loadStats() {
    const period = document.getElementById('csStatsPeriod').value;
    const container = document.getElementById('csStatsContent');
    container.innerHTML = '<div style="text-align:center;padding:60px"><span class="loading-spinner"></span></div>';
    try {
      const stats = await api('/api/protected/consultations/stats/conversion?period=' + period);
      const sourceLabels = { walk_in:'도보', phone:'전화', naver:'네이버', instagram:'인스타', youtube:'유튜브', blog:'블로그', referral:'소개', kakao:'카카오', homepage:'홈페이지', other:'기타' };
      const treatLabels = { general:'일반', implant:'임플란트', ortho:'교정', prosth:'보철', endo:'신경', perio:'치주', extraction:'발치', esthetic:'심미', pedo:'소아', checkup:'검진', other:'기타' };

      container.innerHTML = `
        <div style="max-width:1000px">
          <div class="mb-24">
            <div class="section-title">📊 <span>${period} 상담 전환율</span></div>
          </div>

          <div class="dashboard-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:24px">
            <div class="stat-card"><div class="stat-card-icon blue"><span style="font-size:22px">📞</span></div><div class="stat-card-body"><div class="stat-card-label">총 상담</div><div class="stat-card-value">${stats.total}</div></div></div>
            <div class="stat-card"><div class="stat-card-icon teal"><span style="font-size:22px">🤝</span></div><div class="stat-card-body"><div class="stat-card-label">동의</div><div class="stat-card-value">${stats.agreed}</div><div class="stat-card-sub">${stats.conversionRate}% 전환율</div></div></div>
            <div class="stat-card"><div class="stat-card-icon amber"><span style="font-size:22px">💳</span></div><div class="stat-card-body"><div class="stat-card-label">수납</div><div class="stat-card-value">${stats.paid}</div><div class="stat-card-sub">${stats.paymentRate}% 수납률</div></div></div>
            <div class="stat-card"><div class="stat-card-icon purple"><span style="font-size:22px">💔</span></div><div class="stat-card-body"><div class="stat-card-label">이탈</div><div class="stat-card-value">${stats.lost}</div><div class="stat-card-sub">${stats.total ? Math.round(stats.lost/stats.total*100) : 0}%</div></div></div>
          </div>

          <div class="dashboard-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:24px">
            <div class="stat-card"><div class="stat-card-body"><div class="stat-card-label">💰 예상 총액</div><div class="stat-card-value" style="font-size:20px">${stats.totalEstimated.toLocaleString()}<span style="font-size:13px;font-weight:500">만원</span></div></div></div>
            <div class="stat-card"><div class="stat-card-body"><div class="stat-card-label">🤝 동의 총액</div><div class="stat-card-value" style="font-size:20px;color:var(--primary)">${stats.totalAgreed.toLocaleString()}<span style="font-size:13px;font-weight:500">만원</span></div></div></div>
            <div class="stat-card"><div class="stat-card-body"><div class="stat-card-label">💳 수납 총액</div><div class="stat-card-value" style="font-size:20px;color:var(--success)">${stats.totalPaid.toLocaleString()}<span style="font-size:13px;font-weight:500">만원</span></div></div></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
              <div style="font-weight:700;margin-bottom:12px">📢 유입 경로별 전환율</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${Object.entries(stats.bySource).sort((a,b) => b[1].total - a[1].total).map(([src, data]) => {
                  const rate = data.total ? Math.round(data.agreed/data.total*100) : 0;
                  return `<div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:12px;width:60px;font-weight:600">${sourceLabels[src]||src}</span>
                    <div style="flex:1;height:20px;background:var(--bg);border-radius:10px;overflow:hidden;position:relative">
                      <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,var(--primary),var(--primary-light));border-radius:10px;transition:width 0.5s"></div>
                      <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700">${data.total}건 / ${rate}%</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>

            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
              <div style="font-weight:700;margin-bottom:12px">🦷 진료 유형별 실적</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${Object.entries(stats.byTreatment).sort((a,b) => b[1].amount - a[1].amount).map(([treat, data]) => {
                  const rate = data.total ? Math.round(data.agreed/data.total*100) : 0;
                  return `<div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:12px;width:70px;font-weight:600">${treatLabels[treat]||treat}</span>
                    <div style="flex:1;height:20px;background:var(--bg);border-radius:10px;overflow:hidden;position:relative">
                      <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:10px;transition:width 0.5s"></div>
                      <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700">${data.agreed}/${data.total}건 · ${data.amount.toLocaleString()}만</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>

          <div style="margin-top:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
            <div style="font-weight:700;margin-bottom:12px">📈 전환 퍼널</div>
            <div style="display:flex;align-items:center;gap:4px;justify-content:center;flex-wrap:wrap">
              ${[
                { label:'총 상담', value:stats.total, color:'#94a3b8' },
                { label:'내원', value:stats.visited, color:'#3b82f6' },
                { label:'동의', value:stats.agreed, color:'#14b8a6' },
                { label:'수납', value:stats.paid, color:'#f59e0b' },
                { label:'완료', value:stats.completed, color:'#22c55e' },
              ].map((step, i, arr) => {
                const pct = arr[0].value ? Math.round(step.value/arr[0].value*100) : 0;
                const w = Math.max(60, 160 * (pct/100));
                return `${i>0?'<span style="font-size:16px;color:var(--text-muted)">→</span>':''}
                  <div style="text-align:center;padding:12px 8px;background:${step.color}15;border-radius:var(--radius);min-width:${w}px;border:2px solid ${step.color}33">
                    <div style="font-size:22px;font-weight:800;color:${step.color}">${step.value}</div>
                    <div style="font-size:11px;font-weight:600;color:var(--text-secondary)">${step.label}</div>
                    <div class="mod-muted-xs">${pct}%</div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>`;
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
  }
  loadStats();

  document.getElementById('csStatsPeriod').addEventListener('change', loadStats);
}


PFM.modules.clinical = { renderTreatmentBoard, renderConsultationPipeline, renderConsultationStats };
})(window.PFM);
