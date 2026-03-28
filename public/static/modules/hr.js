/* ═══ Module: HR Dashboard & Staff Management ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, ICONS_HIRE, state, toast, esc, showModal, closeModal, timeAgo } = PFM;

const positionLabels = {
  doctor:'원장/의사', director:'실장단', hygienist:'치과위생사',
  desk:'데스크', sterilization:'소독팀', management:'경영지원실', '':'미지정'
};
const positionEmoji = {
  doctor:'🩺', director:'👑', hygienist:'🦷', desk:'💻', sterilization:'🧹', management:'📊', '':'👤'
};
const teamLabels = {
  clinical:'진료팀', front:'프론트', support:'지원팀', management:'경영지원', '':'미지정', etc:'기타'
};
const teamColors = {
  clinical:'#3b82f6', front:'#8b5cf6', support:'#f59e0b', management:'#22c55e', '':'#94a3b8', etc:'#94a3b8'
};
const statusEmoji = {
  present:'🟢', late:'🟡', vacation:'🏖️', day_off:'⚪', not_yet:'🔴', half_day:'🟠'
};
const statusLabel = {
  present:'출근', late:'지각', vacation:'휴가', day_off:'휴무', not_yet:'미출근', half_day:'반차'
};

/* ─── HR Dashboard ─── */
async function renderHRDashboard(body, actions) {
  actions.innerHTML = `<button class="btn btn-primary btn-sm" id="hrCheckBtn">⏰ 출퇴근 체크</button>`;
  body.innerHTML = `<div id="hrDash" style="max-width:1100px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadDashboard() {
    const container = document.getElementById('hrDash');
    try {
      const data = await api('/api/protected/hr/dashboard');
      const s = data.summary;
      const scheduledWorkers = s.total - s.day_off;

      container.innerHTML = `
        <div style="margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <h2 style="margin:0;font-size:20px;font-weight:800">📊 오늘의 인원 현황</h2>
          <span style="font-size:13px;color:var(--text-muted)">${data.date} (${['일','월','화','수','목','금','토'][new Date(data.date+'T00:00:00').getDay()]}요일)</span>
        </div>

        <!-- 전체 요약 카드 -->
        <div class="dashboard-grid" style="margin-bottom:24px">
          <div class="stat-card">
            <div class="stat-card-icon teal">${ICONS.users}</div>
            <div class="stat-card-body">
              <div class="stat-card-label">전체 직원</div>
              <div class="stat-card-value">${s.total}명</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#16a34a">🟢</div>
            <div class="stat-card-body">
              <div class="stat-card-label">출근</div>
              <div class="stat-card-value" style="color:#16a34a">${s.present}명</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706">🏖️</div>
            <div class="stat-card-body">
              <div class="stat-card-label">휴가</div>
              <div class="stat-card-value" style="color:#d97706">${s.vacation}명</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:linear-gradient(135deg,#f3f4f6,#e5e7eb);color:#6b7280">⚪</div>
            <div class="stat-card-body">
              <div class="stat-card-label">정기 휴무</div>
              <div class="stat-card-value" style="color:#6b7280">${s.day_off}명</div>
            </div>
          </div>
        </div>

        <!-- 실인원 요약 바 -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-weight:700;font-size:15px">오늘 실인원</span>
            <span style="font-size:24px;font-weight:800;color:var(--primary)">${s.present} / ${scheduledWorkers}명</span>
          </div>
          <div style="height:12px;background:var(--border-light);border-radius:6px;overflow:hidden">
            <div style="height:100%;width:${scheduledWorkers > 0 ? Math.round(s.present/scheduledWorkers*100) : 0}%;background:linear-gradient(90deg,#22c55e,#16a34a);border-radius:6px;transition:width 0.5s"></div>
          </div>
          <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:var(--text-muted)">
            <span>근무 예정: ${scheduledWorkers}명</span>
            <span>출근: ${s.present}명</span>
            ${s.late > 0 ? `<span style="color:#f59e0b">지각: ${s.late}명</span>` : ''}
            <span>미출근: ${scheduledWorkers - s.present - s.vacation}명</span>
          </div>
        </div>

        <!-- 팀별 현황 -->
        <div style="margin-bottom:24px">
          <div class="section-title" style="margin-bottom:12px">${ICONS.users}<span>팀별 현황</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px" id="teamCards">
            ${Object.entries(data.teams).map(([team, t]) => {
              const tl = teamLabels[team] || team;
              const tc = teamColors[team] || '#6b7280';
              const scheduled = t.total - t.day_off;
              return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;border-left:4px solid ${tc}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                  <span style="font-weight:700;font-size:14px;color:${tc}">${tl}</span>
                  <span style="font-size:18px;font-weight:800">${t.present}/${scheduled}</span>
                </div>
                <div style="height:6px;background:var(--border-light);border-radius:3px;overflow:hidden;margin-bottom:8px">
                  <div style="height:100%;width:${scheduled > 0 ? Math.round(t.present/scheduled*100) : 0}%;background:${tc};border-radius:3px"></div>
                </div>
                <div style="display:flex;gap:8px;font-size:11px;color:var(--text-muted)">
                  <span>총 ${t.total}</span>
                  <span>🟢 ${t.present}</span>
                  ${t.vacation > 0 ? `<span>🏖️ ${t.vacation}</span>` : ''}
                  ${t.day_off > 0 ? `<span>⚪ ${t.day_off}</span>` : ''}
                  ${t.late > 0 ? `<span>🟡 ${t.late}</span>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 직원 리스트 -->
        <div>
          <div class="section-title" style="margin-bottom:12px">${ICONS.users}<span>직원 출근 현황</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px" id="memberCards">
            ${data.members.map(m => {
              const pe = positionEmoji[m.position] || '👤';
              const pl = positionLabels[m.position] || m.position || '미지정';
              const se = statusEmoji[m.today_status] || '❓';
              const sl = statusLabel[m.today_status] || m.today_status;
              const tc = teamColors[m.team] || '#6b7280';
              return `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;display:flex;align-items:center;gap:12px">
                <div style="width:40px;height:40px;border-radius:50%;background:${tc}15;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${pe}</div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-weight:700;font-size:14px">${esc(m.name)}</span>
                    <span style="font-size:10px;padding:2px 6px;border-radius:8px;background:${tc}15;color:${tc};font-weight:600">${pl}</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                    ${teamLabels[m.team]||''} ${m.check_in ? '· 출근 '+m.check_in : ''}
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600">
                  <span>${se}</span><span style="color:var(--text-secondary)">${sl}</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
  }
  loadDashboard();

  // 출퇴근 체크
  document.getElementById('hrCheckBtn').addEventListener('click', async () => {
    try {
      const result = await api('/api/protected/hr/attendance/check', { method: 'POST' });
      if (result.action === 'check_in') toast('출근 체크 완료! ' + result.time, 'success');
      else if (result.action === 'check_out') toast('퇴근 체크 완료! ' + result.time, 'success');
      else toast('이미 출퇴근 처리 완료 (' + result.check_in + ' ~ ' + result.check_out + ')', 'info');
      loadDashboard();
    } catch(e) { toast(e.message, 'error'); }
  });
}

/* ─── Staff Management ─── */
async function renderStaffManagement(body, actions) {
  const isAdmin = PFM.canManage();
  actions.innerHTML = isAdmin ? `<button class="btn btn-primary btn-sm" id="inviteStaffBtn">${ICONS.plus} 직원 초대</button>` : '';

  body.innerHTML = `<div id="staffMgmt" style="max-width:1000px"><div style="text-align:center;padding:40px"><span class="loading-spinner"></span></div></div>`;

  async function loadStaff() {
    const container = document.getElementById('staffMgmt');
    try {
      const staff = await api('/api/protected/hr/staff');
      const active = staff.filter(s => s.work_status !== 'resigned');
      const resigned = staff.filter(s => s.work_status === 'resigned');

      // 팀별 그룹핑
      const byTeam = {};
      active.forEach(s => {
        const t = s.team || 'etc';
        if (!byTeam[t]) byTeam[t] = [];
        byTeam[t].push(s);
      });

      container.innerHTML = `
        ${isAdmin ? '<div style="margin-bottom:12px;font-size:12px;color:var(--text-muted)">💡 직원 카드를 클릭하면 인적사항, 근무시간, 근무요일 등을 편집할 수 있습니다.</div>' : ''}
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;flex:1;min-width:120px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:var(--primary)">${active.length}</div>
            <div style="font-size:12px;color:var(--text-muted)">재직 중</div>
          </div>
          ${Object.entries(byTeam).map(([t,members]) => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;flex:1;min-width:120px;text-align:center;border-top:3px solid ${teamColors[t]||'#6b7280'}">
              <div style="font-size:24px;font-weight:800;color:${teamColors[t]||'#6b7280'}">${members.length}</div>
              <div style="font-size:12px;color:var(--text-muted)">${teamLabels[t]||t}</div>
            </div>
          `).join('')}
        </div>

        ${Object.entries(byTeam).map(([t, members]) => `
          <div style="margin-bottom:20px">
            <div style="font-weight:700;font-size:14px;color:${teamColors[t]||'#6b7280'};margin-bottom:8px;padding-left:4px;border-left:3px solid ${teamColors[t]||'#6b7280'}">&nbsp;${teamLabels[t]||t} (${members.length}명)</div>
            <div style="display:grid;gap:6px">
              ${members.map(m => {
                const pe = positionEmoji[m.position] || '👤';
                const pl = positionLabels[m.position] || m.position || '미지정';
                const roleLabel = m.role === 'admin' ? '관리자' : m.role === 'manager' ? '매니저' : '';
                let schedule = {};
                try { schedule = JSON.parse(m.work_schedule || '{}'); } catch(e) {}
                const dayLabels = ['월','화','수','목','금','토','일'];
                const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
                const workDays = dayKeys.filter(d => schedule[d]).length;

                return `<div class="staff-row" data-id="${m.id}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;cursor:pointer;transition:box-shadow 0.15s" onmouseenter="this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.boxShadow='none'">
                  <div style="display:flex;align-items:center;gap:12px">
                    <div style="width:42px;height:42px;border-radius:50%;background:${teamColors[t]||'#6b7280'}15;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${pe}</div>
                    <div style="flex:1;min-width:0">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <span style="font-weight:700;font-size:14px">${esc(m.name)}</span>
                        <span style="font-size:10px;padding:2px 8px;border-radius:8px;background:${teamColors[t]||'#6b7280'}15;color:${teamColors[t]||'#6b7280'};font-weight:600">${pl}</span>
                        ${roleLabel ? `<span style="font-size:10px;padding:2px 6px;border-radius:8px;background:#fef3c7;color:#92400e;font-weight:600">${roleLabel}</span>` : ''}
                        ${m.is_doctor ? '<span style="font-size:10px;padding:2px 6px;border-radius:8px;background:#dbeafe;color:#1d4ed8;font-weight:600">Dr.</span>' : ''}
                      </div>
                      <div style="font-size:11px;color:var(--text-muted);margin-top:3px;display:flex;gap:10px;flex-wrap:wrap">
                        ${m.email ? `<span>✉️ ${esc(m.email)}</span>` : ''}
                        ${m.phone ? `<span>📱 ${esc(m.phone)}</span>` : ''}
                        ${m.hire_date ? `<span>📅 ${m.hire_date} 입사</span>` : ''}
                      </div>
                    </div>
                    <div style="text-align:right;font-size:11px;color:var(--text-muted);flex-shrink:0">
                      <div style="display:flex;gap:2px;margin-bottom:4px">${dayKeys.map((d,i) => {
                        const on = !!schedule[d];
                        return `<span style="width:18px;height:18px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;${on ? 'background:'+teamColors[t]+'20;color:'+teamColors[t] : 'background:var(--border-light);color:var(--text-muted)'}">${dayLabels[i]}</span>`;
                      }).join('')}</div>
                      <div>주 ${workDays}일 근무</div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}

        ${resigned.length > 0 ? `
          <details style="margin-top:20px">
            <summary style="cursor:pointer;font-size:13px;color:var(--text-muted);margin-bottom:8px">퇴사자 (${resigned.length}명)</summary>
            ${resigned.map(m => `<div style="padding:8px 16px;font-size:12px;color:var(--text-muted)">${esc(m.name)} (${esc(m.email)}) - ${m.hire_date||''}</div>`).join('')}
          </details>
        ` : ''}
      `;

      // Click to edit
      if (isAdmin) {
        container.querySelectorAll('.staff-row').forEach(row => {
          row.addEventListener('click', () => openStaffEditor(row.dataset.id, staff, loadStaff));
        });
      }
    } catch(e) { container.innerHTML = `<div class="empty-state"><h3>로딩 실패</h3><p>${esc(e.message)}</p></div>`; }
  }
  loadStaff();

  // Invite staff
  if (isAdmin) {
    document.getElementById('inviteStaffBtn')?.addEventListener('click', async () => {
      const modal = document.getElementById('modalContent');
      modal.innerHTML = `
        <div class="modal-header"><h3>🔗 직원 초대 코드 생성</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
        <div class="modal-body"><form class="auth-form">
          <div class="form-grid">
            <div class="form-group"><label>권한</label>
              <select class="form-input" id="invRole"><option value="staff">스태프</option><option value="manager">매니저</option></select>
            </div>
            <div class="form-group"><label>직급 (선택)</label>
              <select class="form-input" id="invPosition"><option value="">미지정</option>
                ${Object.entries(positionLabels).filter(([k])=>k).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group"><label>소속팀 (선택)</label>
            <select class="form-input" id="invTeam"><option value="">미지정</option>
              ${Object.entries(teamLabels).filter(([k])=>k&&k!=='etc').map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
        </form></div>
        <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="invSubmitBtn">🔗 코드 생성</button></div>`;
      showModal();
      document.getElementById('modalClose').addEventListener('click', closeModal);
      document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
      document.getElementById('invSubmitBtn').addEventListener('click', async () => {
        try {
          const result = await api('/api/protected/hr/invite', { method: 'POST', json: {
            role: document.getElementById('invRole').value,
            position: document.getElementById('invPosition').value,
            team: document.getElementById('invTeam').value,
          }});
          const inviteLink = window.location.origin + '/#join/' + result.invite_code;
          const modal2 = document.getElementById('modalContent');
          modal2.innerHTML = `
            <div class="modal-header"><h3>✅ 초대 링크 생성 완료</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
            <div class="modal-body" style="text-align:center">
              <div style="font-size:36px;font-weight:900;letter-spacing:6px;color:var(--primary);background:var(--primary-bg);padding:20px;border-radius:12px;margin:20px 0;font-family:monospace">${result.invite_code}</div>
              <div style="margin:16px 0;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:flex;align-items:center;gap:8px">
                <input class="form-input" id="invLinkInput" value="${inviteLink}" readonly style="flex:1;font-size:12px;background:transparent;border:none;padding:0;color:var(--text)">
                <button class="btn btn-primary btn-sm" id="invLinkCopyBtn" style="white-space:nowrap">📋 링크 복사</button>
              </div>
              <p style="font-size:13px;color:var(--text-secondary)">이 링크를 직원에게 카톡/문자로 보내주세요.<br>링크를 열면 <strong>바로 가입 화면</strong>으로 이동합니다.</p>
              <p style="font-size:11px;color:var(--text-muted);margin-top:8px">유효기간: ${result.expires_at ? result.expires_at.slice(0,10) : '7일'}</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="invCodeCopyBtn">코드만 복사</button>
              <button class="btn btn-primary" id="invShareBtn">📤 공유하기</button>
            </div>`;
          document.getElementById('modalClose').addEventListener('click', closeModal);
          document.getElementById('invLinkCopyBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(inviteLink);
            toast('초대 링크가 복사되었습니다!', 'success');
            document.getElementById('invLinkCopyBtn').textContent = '✅ 복사됨';
          });
          document.getElementById('invCodeCopyBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(result.invite_code);
            toast('코드가 복사되었습니다!', 'success');
          });
          document.getElementById('invShareBtn').addEventListener('click', () => {
            const text = `[${state.user.hospitalName || 'PFM'}] 직원 초대\n아래 링크로 가입해주세요:\n${inviteLink}`;
            if (navigator.share) {
              navigator.share({ title: '직원 초대', text }).catch(()=>{});
            } else {
              navigator.clipboard.writeText(text);
              toast('공유 메시지가 복사되었습니다!', 'success');
            }
          });
        } catch(e) { toast(e.message, 'error'); }
      });
    });
  }
}

// Staff editor modal
function openStaffEditor(staffId, allStaff, reload) {
  const m = allStaff.find(s => s.id === staffId);
  if (!m) return;
  let schedule = {};
  try { schedule = JSON.parse(m.work_schedule || '{}'); } catch(e) {}
  const dayLabels = ['월','화','수','목','금','토','일'];
  const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];

  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>${positionEmoji[m.position]||'👤'} ${esc(m.name)} 정보 수정</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body"><form id="staffEditForm" class="auth-form">
      <div class="form-grid">
        <div class="form-group"><label>이름</label><input class="form-input" name="name" value="${esc(m.name)}"></div>
        <div class="form-group"><label>권한</label>
          <select class="form-input" name="role">
            <option value="staff" ${m.role==='staff'?'selected':''}>스태프</option>
            <option value="manager" ${m.role==='manager'?'selected':''}>매니저</option>
            <option value="admin" ${m.role==='admin'?'selected':''}>관리자</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>직급</label>
          <select class="form-input" name="position">
            <option value="">미지정</option>
            ${Object.entries(positionLabels).filter(([k])=>k).map(([k,v]) => `<option value="${k}" ${m.position===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>소속팀</label>
          <select class="form-input" name="team">
            <option value="">미지정</option>
            ${Object.entries(teamLabels).filter(([k])=>k&&k!=='etc').map(([k,v]) => `<option value="${k}" ${m.team===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>연락처</label><input class="form-input" name="phone" value="${esc(m.phone||'')}"></div>
        <div class="form-group"><label>입사일</label><input class="form-input" type="date" name="hire_date" value="${m.hire_date||''}"></div>
      </div>
      <div class="form-group"><label>근무 상태</label>
        <select class="form-input" name="work_status">
          <option value="active" ${m.work_status==='active'?'selected':''}>재직</option>
          <option value="on_leave" ${m.work_status==='on_leave'?'selected':''}>휴직</option>
          <option value="resigned" ${m.work_status==='resigned'?'selected':''}>퇴사</option>
        </select>
      </div>
      <div class="form-group">
        <label>근무 스케줄</label>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:6px" id="editSchedGrid">
          ${dayKeys.map((d, i) => {
            const on = !!schedule[d];
            const s = schedule[d] || {start:'09:00',end:'18:00'};
            return `<div style="text-align:center">
              <label style="display:flex;align-items:center;gap:2px;margin-bottom:4px;justify-content:center;cursor:pointer">
                <input type="checkbox" class="ed-sched-day" data-day="${d}" ${on?'checked':''}>
                <span style="font-weight:600;font-size:12px">${dayLabels[i]}</span>
              </label>
              <div class="ed-sched-times" data-day-times="${d}" style="${on?'':'display:none'}">
                <input type="time" class="ed-sched-start" value="${s.start||'09:00'}" style="width:100%;font-size:10px;padding:2px;border:1px solid var(--border);border-radius:4px;margin-bottom:2px">
                <input type="time" class="ed-sched-end" value="${s.end||'18:00'}" style="width:100%;font-size:10px;padding:2px;border:1px solid var(--border);border-radius:4px">
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </form></div>
    <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="staffSaveBtn">💾 저장</button></div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  const grid = document.getElementById('editSchedGrid');
  grid.querySelectorAll('.ed-sched-day').forEach(cb => {
    cb.addEventListener('change', () => {
      const times = grid.querySelector(`[data-day-times="${cb.dataset.day}"]`);
      if (times) times.style.display = cb.checked ? '' : 'none';
    });
  });

  document.getElementById('staffSaveBtn').addEventListener('click', async () => {
    const form = document.getElementById('staffEditForm');
    const ws = {};
    grid.querySelectorAll('.ed-sched-day').forEach(cb => {
      const d = cb.dataset.day;
      if (cb.checked) {
        const times = grid.querySelector(`[data-day-times="${d}"]`);
        ws[d] = { start: times.querySelector('.ed-sched-start').value, end: times.querySelector('.ed-sched-end').value };
      } else { ws[d] = null; }
    });
    try {
      await api('/api/protected/hr/staff/' + staffId, { method: 'PUT', json: {
        name: form.name.value,
        role: form.role.value,
        position: form.position.value,
        team: form.team.value,
        phone: form.phone.value,
        hire_date: form.hire_date.value,
        work_status: form.work_status.value,
        work_schedule: ws,
      }});
      toast('저장 완료!', 'success'); closeModal(); reload();
    } catch(e) { toast(e.message, 'error'); }
  });
}

PFM.modules.hr = { renderHRDashboard, renderStaffManagement };
})(window.PFM);
