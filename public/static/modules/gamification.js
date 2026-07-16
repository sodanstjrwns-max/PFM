/* ═══ 직원 성과 게이미피케이션 모듈 ═══ */
(function() {
'use strict';
const { state, api, esc, ICONS, toast, showModal, closeModal, canManage } = window.PFM;

let gamState = { period: 'weekly', tab: 'my-progress' };

async function renderGamification(body, actions) {
  actions.innerHTML = `
    <select id="gamPeriod" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px">
      <option value="daily" ${gamState.period==='daily'?'selected':''}>일간</option>
      <option value="weekly" ${gamState.period==='weekly'?'selected':''}>주간</option>
      <option value="monthly" ${gamState.period==='monthly'?'selected':''}>월간</option>
    </select>
  `;

  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="gam-tab ${gamState.tab==='my-progress'?'active':''}" data-tab="my-progress" style="padding:8px 16px;border-radius:20px;border:1px solid #d1d5db;cursor:pointer;font-size:13px;font-weight:600;background:${gamState.tab==='my-progress'?'#0f766e':'#fff'};color:${gamState.tab==='my-progress'?'#fff':'#374151'}">🎯 내 미션</button>
      <button class="gam-tab ${gamState.tab==='ranking'?'active':''}" data-tab="ranking" style="padding:8px 16px;border-radius:20px;border:1px solid #d1d5db;cursor:pointer;font-size:13px;font-weight:600;background:${gamState.tab==='ranking'?'#0f766e':'#fff'};color:${gamState.tab==='ranking'?'#fff':'#374151'}">🏆 랭킹</button>
      ${canManage() ? `<button class="gam-tab ${gamState.tab==='missions'?'active':''}" data-tab="missions" style="padding:8px 16px;border-radius:20px;border:1px solid #d1d5db;cursor:pointer;font-size:13px;font-weight:600;background:${gamState.tab==='missions'?'#0f766e':'#fff'};color:${gamState.tab==='missions'?'#fff':'#374151'}">⚙️ 미션 관리</button>
      <button class="gam-tab ${gamState.tab==='update'?'active':''}" data-tab="update" style="padding:8px 16px;border-radius:20px;border:1px solid #d1d5db;cursor:pointer;font-size:13px;font-weight:600;background:${gamState.tab==='update'?'#0f766e':'#fff'};color:${gamState.tab==='update'?'#fff':'#374151'}">📝 포인트 부여</button>` : ''}
    </div>
    <div id="gamContent"><div class="loading-spinner" style="padding:40px;text-align:center">로딩 중...</div></div>
  `;

  body.querySelectorAll('.gam-tab').forEach(b => b.addEventListener('click', () => {
    gamState.tab = b.dataset.tab;
    renderGamification(body, actions);
  }));

  document.getElementById('gamPeriod').addEventListener('change', (e) => {
    gamState.period = e.target.value;
    renderGamification(body, actions);
  });

  const content = document.getElementById('gamContent');
  try {
    switch(gamState.tab) {
      case 'my-progress': await renderMyProgress(content); break;
      case 'ranking': await renderRanking(content); break;
      case 'missions': await renderMissions(content); break;
      case 'update': await renderUpdateProgress(content); break;
    }
  } catch(e) {
    content.innerHTML = `<div class="card" class="p-20"><p class="text-danger">${esc(e.message)}</p></div>`;
  }
}

async function renderMyProgress(el) {
  const data = await api('/api/protected/gamification/my-progress?period=' + gamState.period);
  const missions = data.missions || [];
  const totalPoints = data.totalPoints || 0;

  // 배지 계산
  const badge = totalPoints >= 5000 ? '💎' : totalPoints >= 2000 ? '🥇' : totalPoints >= 1000 ? '🥈' : totalPoints >= 500 ? '🥉' : totalPoints > 0 ? '⭐' : '🌱';
  const level = totalPoints >= 5000 ? '다이아몬드' : totalPoints >= 2000 ? '골드' : totalPoints >= 1000 ? '실버' : totalPoints >= 500 ? '브론즈' : '뉴비';
  const nextLevel = totalPoints >= 5000 ? null : totalPoints >= 2000 ? { name: '다이아몬드', points: 5000 } : totalPoints >= 1000 ? { name: '골드', points: 2000 } : totalPoints >= 500 ? { name: '실버', points: 1000 } : { name: '브론즈', points: 500 };

  const completedCount = missions.filter(m => m.completed).length;

  el.innerHTML = `
    <div class="card" style="padding:24px;background:linear-gradient(135deg,#0f766e,#0d9488,#14b8a6) !important;color:#fff !important;border-radius:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:11px;opacity:0.8">나의 등급</div>
          <div style="font-size:36px;margin:4px 0">${badge}</div>
          <div style="font-size:18px;font-weight:800">${level}</div>
          <div style="font-size:13px;opacity:0.8;margin-top:4px">누적 ${totalPoints.toLocaleString()} P</div>
        </div>
        <div class="text-right">
          <div style="font-size:48px;font-weight:800">${completedCount}<span style="font-size:18px;opacity:0.6">/${missions.length}</span></div>
          <div style="font-size:12px;opacity:0.8">미션 완료</div>
        </div>
      </div>
      ${nextLevel ? `
      <div style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.9;margin-bottom:4px">
          <span>다음: ${nextLevel.name}</span>
          <span>${totalPoints} / ${nextLevel.points} P</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,0.2);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,totalPoints/nextLevel.points*100)}%;background:#fff;border-radius:4px;transition:width .5s"></div>
        </div>
      </div>` : '<div style="margin-top:8px;font-size:12px;opacity:0.9">🎉 최고 등급 달성!</div>'}
    </div>

    ${missions.length === 0 ? `
    <div class="card" style="padding:40px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🎯</div>
      <h3 style="font-size:16px;font-weight:700;color:#374151;margin-bottom:6px">아직 등록된 미션이 없어요</h3>
      <p style="font-size:13px;color:#94a3b8">${canManage() ? '미션 관리 탭에서 미션을 추가해주세요!' : '관리자가 미션을 등록하면 여기에 표시됩니다.'}</p>
    </div>` : `
    <div style="display:grid;gap:12px">
      ${missions.map(m => {
        const prog = m.progress || 0;
        const barColor = m.completed ? '#10b981' : prog >= 70 ? '#0f766e' : prog >= 40 ? '#f59e0b' : '#e2e8f0';
        return `
        <div class="card" style="padding:16px;border-left:4px solid ${m.completed ? '#10b981' : '#e2e8f0'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <span style="font-size:20px;margin-right:6px">${m.badge_icon || '🎯'}</span>
              <span style="font-size:14px;font-weight:700">${esc(m.title)}</span>
              ${m.completed ? '<span style="font-size:10px;background:#10b981;color:#fff;padding:2px 8px;border-radius:10px;margin-left:8px;font-weight:600">완료!</span>' : ''}
            </div>
            <span style="font-size:14px;font-weight:800;color:#0f766e">${m.points}P</span>
          </div>
          ${m.description ? `<p style="font-size:12px;color:#64748b;margin-bottom:8px">${esc(m.description)}</p>` : ''}
          <div style="display:flex;align-items:center;gap:10px">
            <div style="flex:1;height:10px;background:#f0f0f0;border-radius:5px;overflow:hidden">
              <div style="height:100%;width:${prog}%;background:${barColor};border-radius:5px;transition:width .5s"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${m.completed?'#10b981':'#64748b'};min-width:80px;text-align:right">${m.currentValue} / ${m.target_value}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  `;
}

async function renderRanking(el) {
  const data = await api('/api/protected/gamification/ranking?period=' + gamState.period);
  const ranking = data.ranking || [];
  const periodLabel = gamState.period === 'daily' ? '오늘' : gamState.period === 'weekly' ? '이번 주' : gamState.period === 'monthly' ? '이번 달' : '전체';

  el.innerHTML = `
    <div class="card" style="padding:20px;margin-bottom:16px;background:linear-gradient(135deg,#fef3c7,#fbbf24);border-radius:16px">
      <h3 style="font-size:16px;font-weight:800;color:#78350f;margin-bottom:4px">🏆 ${periodLabel} 랭킹</h3>
      <p style="font-size:12px;color:#92400e">미션을 완료하고 포인트를 모아 1위에 도전하세요!</p>
    </div>
    ${ranking.length === 0 ? '<div class="card" style="padding:40px;text-align:center"><p style="color:#94a3b8">아직 포인트 기록이 없습니다</p></div>' : ''}
    <div style="display:grid;gap:8px">
      ${ranking.map((r, i) => {
        const isMe = r.id === state.user?.id;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const posLabel = { doctor:'원장', director:'실장', hygienist:'위생사', desk:'데스크', sterilization:'소독', management:'경영지원' }[r.position] || r.position || '';
        return `
        <div class="card" style="padding:14px;display:flex;align-items:center;gap:12px;${isMe ? 'background:#f0fdfa;border:2px solid #14b8a6' : ''};${i < 3 ? 'box-shadow:0 2px 8px rgba(0,0,0,0.08)' : ''}">
          <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${medal?'20px':'14px'};font-weight:800;${!medal?'background:#f1f5f9;color:#64748b':''}">${medal || r.rank}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)} ${isMe ? '<span style="font-size:10px;color:#0f766e">(나)</span>' : ''}</div>
            <div style="font-size:11px;color:#94a3b8">${esc(posLabel)} · ${esc(r.team || '')} · ${r.badge} ${r.level}</div>
          </div>
          <div class="text-right">
            <div style="font-size:18px;font-weight:800;color:#0f766e">${(r.total_points || 0).toLocaleString()}<span style="font-size:11px;color:#94a3b8">P</span></div>
            <div style="font-size:10px;color:#64748b">미션 ${r.missions_completed || 0}개 완료</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

async function renderMissions(el) {
  const missions = await api('/api/protected/gamification/missions?period=' + gamState.period);
  const typeLabel = { consult_conversion:'상담전환', review_collect:'리뷰수집', patient_recall:'리콜', call_target:'콜목표', nps_score:'NPS', attendance:'출석', custom:'사용자정의' };

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:15px;font-weight:700">미션 목록 (${gamState.period === 'daily' ? '일간' : gamState.period === 'weekly' ? '주간' : '월간'})</h3>
      <button id="addMissionBtn" class="btn btn-primary" style="padding:8px 16px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">+ 미션 추가</button>
    </div>
    ${(missions || []).length === 0 ? '<div class="card" style="padding:40px;text-align:center"><p style="color:#94a3b8">등록된 미션이 없습니다</p></div>' : `
    <div style="display:grid;gap:10px">
      ${(missions || []).map(m => `
        <div class="card" style="padding:14px;display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">${m.badge_icon || '🎯'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700">${esc(m.title)}</div>
            <div style="font-size:11px;color:#94a3b8">${typeLabel[m.mission_type] || m.mission_type} · 목표: ${m.target_value} · ${m.points}P</div>
            ${m.description ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${esc(m.description)}</div>` : ''}
          </div>
          <button class="del-mission-btn" data-id="${m.id}" style="padding:6px 12px;background:#fee2e2;color:#ef4444;border:none;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600">삭제</button>
        </div>
      `).join('')}
    </div>`}
  `;

  document.getElementById('addMissionBtn')?.addEventListener('click', () => showAddMissionModal());
  el.querySelectorAll('.del-mission-btn').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('이 미션을 삭제할까요?')) return;
    try {
      await api('/api/protected/gamification/missions/' + b.dataset.id, { method: 'DELETE' });
      toast('삭제 완료', 'success');
      renderMissions(el);
    } catch(e) { toast(e.message, 'error'); }
  }));
}

function showAddMissionModal() {
  showModal('미션 추가', `
    <div style="display:grid;gap:12px">
      <div class="form-group">
        <label class="mod-label-sm">미션 이름 *</label>
        <input id="mTitle" class="form-input" placeholder="예: 주간 상담 전환 5건 달성" class="input-outline">
      </div>
      <div class="form-group">
        <label class="mod-label-sm">설명</label>
        <input id="mDesc" class="form-input" placeholder="미션에 대한 설명" class="input-outline">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="mod-label-sm">미션 유형</label>
          <select id="mType" class="form-input" class="input-outline">
            <option value="custom">사용자 정의</option>
            <option value="consult_conversion">상담 전환</option>
            <option value="review_collect">리뷰 수집</option>
            <option value="patient_recall">환자 리콜</option>
            <option value="call_target">콜 목표</option>
            <option value="nps_score">NPS 점수</option>
            <option value="attendance">출석</option>
          </select>
        </div>
        <div class="form-group">
          <label class="mod-label-sm">기간</label>
          <select id="mPeriod" class="form-input" class="input-outline">
            <option value="daily">일간</option>
            <option value="weekly" selected>주간</option>
            <option value="monthly">월간</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="mod-label-sm">목표값 *</label>
          <input id="mTarget" class="form-input" type="number" min="1" value="5" class="input-outline">
        </div>
        <div class="form-group">
          <label class="mod-label-sm">포인트</label>
          <input id="mPoints" class="form-input" type="number" min="1" value="100" class="input-outline">
        </div>
        <div class="form-group">
          <label class="mod-label-sm">아이콘</label>
          <input id="mIcon" class="form-input" value="🎯" class="input-outline">
        </div>
      </div>
      <button id="saveMissionBtn" style="padding:12px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;width:100%">미션 등록</button>
    </div>
  `);

  document.getElementById('saveMissionBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('mTitle').value.trim();
    const target_value = parseInt(document.getElementById('mTarget').value) || 1;
    if (!title) { toast('미션 이름을 입력해주세요', 'error'); return; }
    try {
      await api('/api/protected/gamification/missions', { method: 'POST', json: {
        title,
        description: document.getElementById('mDesc').value.trim(),
        mission_type: document.getElementById('mType').value,
        period: document.getElementById('mPeriod').value,
        target_value,
        points: parseInt(document.getElementById('mPoints').value) || 100,
        badge_icon: document.getElementById('mIcon').value || '🎯',
      }});
      toast('미션이 등록되었습니다!', 'success');
      closeModal();
      gamState.tab = 'missions';
      gamState.period = document.getElementById('mPeriod').value;
      const body = document.getElementById('gamContent');
      if (body) await renderMissions(body);
    } catch(e) { toast(e.message, 'error'); }
  });
}

async function renderUpdateProgress(el) {
  const [missions, staffRes] = await Promise.all([
    api('/api/protected/gamification/missions?period=' + gamState.period),
    api('/api/protected/hr/staff'),
  ]);
  const staff = (staffRes || []).filter(s => s.is_active);

  el.innerHTML = `
    <div class="card" class="p-20">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📝 포인트 부여 / 진행상황 업데이트</h3>
      ${(missions || []).length === 0 ? '<p style="color:#94a3b8">등록된 미션이 없습니다. 먼저 미션을 추가해주세요.</p>' : `
      <div style="display:grid;gap:12px">
        <div class="form-group">
          <label class="mod-label-sm">직원 선택</label>
          <select id="upUser" class="form-input" class="input-outline">
            <option value="">직원을 선택하세요</option>
            ${staff.map(s => `<option value="${s.id}">${esc(s.name)} (${s.position})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="mod-label-sm">미션 선택</label>
          <select id="upMission" class="form-input" class="input-outline">
            <option value="">미션을 선택하세요</option>
            ${(missions||[]).map(m => `<option value="${m.id}" data-target="${m.target_value}">${m.badge_icon} ${esc(m.title)} (목표: ${m.target_value})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="mod-label-sm">달성값</label>
          <input id="upValue" class="form-input" type="number" min="0" value="0" class="input-outline">
        </div>
        <button id="submitUpdateBtn" style="padding:12px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">포인트 부여</button>
      </div>`}
    </div>
  `;

  document.getElementById('submitUpdateBtn')?.addEventListener('click', async () => {
    const user_id = document.getElementById('upUser').value;
    const mission_id = document.getElementById('upMission').value;
    const value = parseInt(document.getElementById('upValue').value) || 0;
    if (!user_id || !mission_id) { toast('직원과 미션을 선택해주세요', 'error'); return; }
    try {
      const res = await api('/api/protected/gamification/update-progress', { method: 'POST', json: { user_id, mission_id, value } });
      toast(res.completed ? `미션 완료! ${res.pointsEarned}P 지급 🎉` : '진행상황 업데이트 완료', 'success');
    } catch(e) { toast(e.message, 'error'); }
  });
}

window.PFM.modules.gamification = { renderGamification };
})();
