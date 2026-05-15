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
  body.innerHTML = `<div id="hrDash" style="max-width:1100px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

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
        <div class="dashboard-grid" class="mb-24">
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
        <div class="mb-24">
          <div class="section-title" class="mb-12">${ICONS.users}<span>팀별 현황</span></div>
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
          <div class="section-title" class="mb-12">${ICONS.users}<span>직원 출근 현황</span></div>
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
  actions.innerHTML = isAdmin ? `
    <button class="btn btn-secondary btn-sm" id="inviteListBtn">📋 초대 코드 관리</button>
    <button class="btn btn-primary btn-sm" id="inviteStaffBtn">${ICONS.plus} 직원 초대</button>
  ` : '';

  body.innerHTML = `<div id="staffMgmt" style="max-width:1000px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

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
        ${isAdmin && active.length <= 1 ? `<div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe;border-radius:16px;padding:24px;margin-bottom:20px;text-align:center">
          <div style="font-size:36px;margin-bottom:8px">👋</div>
          <div style="font-size:16px;font-weight:800;color:#1e40af;margin-bottom:8px">직원을 초대해보세요!</div>
          <div style="font-size:13px;color:#475569;line-height:1.6">위의 <strong>+ 직원 초대</strong> 버튼을 클릭하면 초대 코드가 생성됩니다.<br>직원에게 링크를 공유하면 바로 가입할 수 있습니다.</div>
        </div>` : ''}
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
          <div class="mb-20">
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
    document.getElementById('inviteStaffBtn')?.addEventListener('click', openInviteCreator);
    document.getElementById('inviteListBtn')?.addEventListener('click', openInviteList);
  }
}

/* ═══ 초대 코드 생성 모달 v2 (다인용 + 만료일 + 메모) ═══ */
function openInviteCreator() {
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '560px';
  modal.innerHTML = `
    <div class="modal-header"><h3>🔗 직원 초대 코드 생성</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body"><form class="auth-form">
      <div class="form-grid">
        <div class="form-group"><label>권한</label>
          <select class="form-input" id="invRole">
            <option value="staff">스태프 (일반 직원)</option>
            <option value="manager">매니저 (실장)</option>
          </select>
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

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin:14px 0">
        <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:10px">🎯 코드 유형 선택</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button type="button" class="inv-type-btn" data-type="single" style="flex:1;padding:10px;border:2px solid var(--primary);background:var(--primary-bg);color:var(--primary);border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
            👤 단일 사용<br><span style="font-size:11px;font-weight:500">1명만 가입</span>
          </button>
          <button type="button" class="inv-type-btn" data-type="multi" style="flex:1;padding:10px;border:2px solid var(--border);background:white;color:var(--text);border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
            👥 다인용<br><span style="font-size:11px;font-weight:500">여러 명 가입</span>
          </button>
        </div>
        <div id="invMultiField" style="display:none;margin-bottom:10px">
          <label style="font-size:11px;font-weight:600">최대 사용 인원</label>
          <input class="form-input" type="number" id="invMaxUses" min="2" max="100" value="5" style="font-size:13px">
          <div style="font-size:11px;color:#166534;margin-top:4px">💡 같은 링크로 N명까지 가입 가능 (신입 동시 채용 시 유용)</div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>유효 기간</label>
          <select class="form-input" id="invExpiresDays">
            <option value="1">1일 (당일 사용)</option>
            <option value="3">3일</option>
            <option value="7" selected>7일 (기본)</option>
            <option value="14">14일</option>
            <option value="30">30일</option>
            <option value="90">90일 (최대)</option>
          </select>
        </div>
        <div class="form-group"><label>메모 (선택)</label>
          <input class="form-input" id="invMemo" placeholder="예: 2026년 1분기 신입" maxlength="200">
        </div>
      </div>
    </form></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
      <button class="btn btn-primary" id="invSubmitBtn">🔗 코드 생성</button>
    </div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  // 단일/다인 토글
  let inviteType = 'single';
  document.querySelectorAll('.inv-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inviteType = btn.dataset.type;
      document.querySelectorAll('.inv-type-btn').forEach(b => {
        const active = b.dataset.type === inviteType;
        b.style.border = active ? '2px solid var(--primary)' : '2px solid var(--border)';
        b.style.background = active ? 'var(--primary-bg)' : 'white';
        b.style.color = active ? 'var(--primary)' : 'var(--text)';
      });
      document.getElementById('invMultiField').style.display = inviteType === 'multi' ? '' : 'none';
    });
  });

  document.getElementById('invSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('invSubmitBtn'); btn.disabled = true;
    try {
      const maxUses = inviteType === 'multi' ? parseInt(document.getElementById('invMaxUses').value) || 5 : 1;
      const result = await api('/api/protected/hr/invite', { method: 'POST', json: {
        role: document.getElementById('invRole').value,
        position: document.getElementById('invPosition').value,
        team: document.getElementById('invTeam').value,
        max_uses: maxUses,
        expires_days: parseInt(document.getElementById('invExpiresDays').value) || 7,
        memo: document.getElementById('invMemo').value.trim(),
      }});
      showInviteResult(result);
    } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
  });
}

function showInviteResult(result) {
  const inviteLink = window.location.origin + '/#join/' + result.invite_code;
  const expiresDate = result.expires_at ? new Date(result.expires_at).toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric'}) : '7일';
  const isMulti = (result.max_uses || 1) > 1;
  const modal = document.getElementById('modalContent');
  modal.innerHTML = `
    <div class="modal-header"><h3>✅ 초대 링크 생성 완료</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" style="text-align:center">
      ${isMulti ? `<div style="display:inline-block;background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;margin-bottom:12px">👥 다인용 코드 · 최대 ${result.max_uses}명</div>` : ''}
      <div style="font-size:36px;font-weight:900;letter-spacing:6px;color:var(--primary);background:var(--primary-bg);padding:20px;border-radius:12px;margin:12px 0;font-family:monospace">${esc(result.invite_code)}</div>
      <div style="margin:16px 0;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:flex;align-items:center;gap:8px">
        <input class="form-input" id="invLinkInput" value="${esc(inviteLink)}" readonly style="flex:1;font-size:12px;background:transparent;border:none;padding:0;color:var(--text)">
        <button class="btn btn-primary btn-sm" id="invLinkCopyBtn" style="white-space:nowrap">📋 링크 복사</button>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
        이 링크를 직원에게 카톡/문자로 보내주세요.<br>
        링크를 열면 <strong>바로 가입 화면</strong>으로 이동합니다.
      </p>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;font-size:12px;color:var(--text-muted)">
        <span>⏰ 만료: ${esc(expiresDate)}</span>
        ${result.memo ? `<span>📝 ${esc(result.memo)}</span>` : ''}
      </div>
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
    const text = `[${state.user.hospitalName || 'PFM'}] 직원 초대\n아래 링크로 가입해주세요:\n${inviteLink}\n(${isMulti ? '최대 ' + result.max_uses + '명, ' : ''}만료: ${expiresDate})`;
    if (navigator.share) {
      navigator.share({ title: '직원 초대', text }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text);
      toast('공유 메시지가 복사되었습니다!', 'success');
    }
  });
}

/* ═══ 초대 코드 목록/관리 모달 ═══ */
async function openInviteList() {
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '800px';
  modal.innerHTML = `
    <div class="modal-header"><h3>📋 초대 코드 관리</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body" id="invListBody"><div style="text-align:center;padding:30px"><span class="loading-spinner"></span></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">닫기</button></div>`;
  showModal();
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);

  async function loadList() {
    try {
      const invites = await api('/api/protected/hr/invites') || [];
      const body = document.getElementById('invListBody');
      if (!invites.length) {
        body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">아직 발급한 초대 코드가 없습니다</div>';
        return;
      }
      const now = new Date();
      const statusBadge = (inv) => {
        if (inv.status === 'revoked') return '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">취소됨</span>';
        if (inv.expires_at && new Date(inv.expires_at) < now) return '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">만료</span>';
        if ((inv.use_count || 0) >= (inv.max_uses || 1)) return '<span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">소진</span>';
        return '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">활성</span>';
      };
      const roleLabel = { admin: '👑 원장', manager: '🎩 매니저', staff: '👤 스태프' };
      body.innerHTML = `
        <div style="max-height:60vh;overflow-y:auto">
          ${invites.map(inv => {
            const inviteLink = window.location.origin + '/#join/' + inv.invite_code;
            const isActive = inv.status === 'active' && (!inv.expires_at || new Date(inv.expires_at) >= now) && (inv.use_count || 0) < (inv.max_uses || 1);
            const expiresDate = inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('ko-KR') : '-';
            const createdDate = inv.created_at ? new Date(inv.created_at).toLocaleDateString('ko-KR') : '-';
            return `
              <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
                  <span style="font-size:18px;font-weight:900;letter-spacing:3px;font-family:monospace;color:var(--primary)">${esc(inv.invite_code)}</span>
                  ${statusBadge(inv)}
                  <span style="font-size:11px;color:var(--text-muted)">${esc(roleLabel[inv.role] || inv.role)}</span>
                  ${(inv.max_uses || 1) > 1 ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">👥 ${inv.use_count||0}/${inv.max_uses}명</span>` : ''}
                  <div style="margin-left:auto;display:flex;gap:6px">
                    ${isActive ? `<button class="inv-copy-btn btn btn-secondary btn-sm" data-link="${esc(inviteLink)}" style="font-size:11px;padding:4px 10px">📋 링크</button>` : ''}
                    ${inv.actual_use_count > 0 ? `<button class="inv-uses-btn btn btn-secondary btn-sm" data-id="${esc(inv.id)}" data-code="${esc(inv.invite_code)}" style="font-size:11px;padding:4px 10px">👥 사용자 (${inv.actual_use_count})</button>` : ''}
                    ${isActive ? `<button class="inv-revoke-btn btn btn-secondary btn-sm" data-id="${esc(inv.id)}" data-code="${esc(inv.invite_code)}" style="font-size:11px;padding:4px 10px;color:#dc2626;border-color:#fca5a5">🚫 취소</button>` : ''}
                  </div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;gap:14px;flex-wrap:wrap">
                  <span>📅 생성: ${esc(createdDate)} (by ${esc(inv.created_by_name || '?')})</span>
                  <span>⏰ 만료: ${esc(expiresDate)}</span>
                  ${inv.memo ? `<span>📝 ${esc(inv.memo)}</span>` : ''}
                  ${inv.revoked_by_name ? `<span>🚫 취소 by ${esc(inv.revoked_by_name)}</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      body.querySelectorAll('.inv-copy-btn').forEach(btn => btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.link);
        toast('초대 링크가 복사되었습니다!', 'success');
      }));

      body.querySelectorAll('.inv-revoke-btn').forEach(btn => btn.addEventListener('click', async () => {
        if (!confirm(`초대 코드 "${btn.dataset.code}"를 취소하시겠습니까?\n취소된 코드는 더 이상 가입에 사용할 수 없습니다.`)) return;
        try {
          await api('/api/protected/hr/invites/' + btn.dataset.id, { method: 'DELETE' });
          toast('초대 코드가 취소되었습니다', 'success');
          loadList();
        } catch(e) { toast(e.message, 'error'); }
      }));

      body.querySelectorAll('.inv-uses-btn').forEach(btn => btn.addEventListener('click', async () => {
        try {
          const uses = await api('/api/protected/hr/invites/' + btn.dataset.id + '/uses') || [];
          showInviteUses(btn.dataset.code, uses);
        } catch(e) { toast(e.message, 'error'); }
      }));
    } catch(e) {
      document.getElementById('invListBody').innerHTML = `<div style="color:#ef4444;padding:20px;text-align:center">${esc(e.message)}</div>`;
    }
  }
  loadList();
}

function showInviteUses(code, uses) {
  const teamLbl = { clinical:'진료팀', front:'프론트', support:'지원팀', management:'경영지원' };
  const posLbl = { doctor:'원장/의사', director:'실장', hygienist:'위생사', desk:'데스크', sterilization:'소독팀', management:'경영지원' };
  const modal = document.getElementById('modalContent');
  modal.style.maxWidth = '560px';
  modal.innerHTML = `
    <div class="modal-header"><h3>👥 ${esc(code)} 사용 이력</h3><button class="btn-icon" id="modalClose">${ICONS.close}</button></div>
    <div class="modal-body">
      ${uses.length ? `
        <div style="max-height:50vh;overflow-y:auto">
          ${uses.map(u => `
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-bg);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700">${esc((u.user_name||'?')[0])}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:13px">${esc(u.user_name)}</div>
                <div style="font-size:11px;color:var(--text-muted)">${esc(u.user_email)}${u.position?' · '+esc(posLbl[u.position]||u.position):''}${u.team?' · '+esc(teamLbl[u.team]||u.team):''}</div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);text-align:right">${esc(new Date(u.used_at).toLocaleString('ko-KR'))}</div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="text-align:center;padding:30px;color:var(--text-muted)">아직 가입한 직원이 없습니다</div>'}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" id="modalCancelBtn">닫기</button></div>`;
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
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
            return `<div class="text-center">
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
