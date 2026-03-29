/* ═══ Module: Meetings ═══ */
(function(PFM) {
'use strict';
const { api, apiForm, ICONS, state, toast, esc, showModal, closeModal, timeAgo } = PFM;

async function renderMeetings(body, actions) {
  const isAdmin = state.user.role === 'admin' || state.user.role === 'manager';
  let currentMonth = new Date().toISOString().slice(0,7);
  let viewMode = 'list'; // list or detail

  const statusMap = {
    scheduled: { label: '예정', color: '#3b82f6', bg: '#dbeafe', emoji: '📅' },
    in_progress: { label: '진행중', color: '#f59e0b', bg: '#fef3c7', emoji: '🔴' },
    completed: { label: '완료', color: '#22c55e', bg: '#dcfce7', emoji: '✅' },
    cancelled: { label: '취소', color: '#94a3b8', bg: '#f1f5f9', emoji: '❌' },
  };
  const visibilityMap = {
    all: { label: '전체 공개', emoji: '🌐' },
    participants: { label: '참가자만', emoji: '👥' },
    admin: { label: '관리자만', emoji: '🔒' },
  };
  const attendanceMap = {
    pending: { label: '미정', color: '#94a3b8' },
    attended: { label: '참석', color: '#22c55e' },
    absent: { label: '불참', color: '#ef4444' },
    late: { label: '지각', color: '#f59e0b' },
  };
  const roleMap = { organizer: '주최', presenter: '발표', attendee: '참석' };

  actions.innerHTML = `<button class="btn btn-primary" id="addMeetingBtn">📝 회의 등록</button>`;

  body.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:20px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-sm" id="prevMonth2">◀</button>
      <span id="monthLabel2" style="font-weight:700;font-size:16px;min-width:100px;text-align:center">${currentMonth}</span>
      <button class="btn btn-sm" id="nextMonth2">▶</button>
      <div style="display:flex;gap:6px;margin-left:auto">
        <button class="btn btn-sm meeting-filter active" data-status="">전체</button>
        <button class="btn btn-sm meeting-filter" data-status="scheduled" style="color:#3b82f6">📅 예정</button>
        <button class="btn btn-sm meeting-filter" data-status="completed" style="color:#22c55e">✅ 완료</button>
      </div>
    </div>
    <div id="meetingList"></div>
  `;

  let filterStatus = '';

  async function loadList() {
    let url = '/api/protected/meetings?month=' + currentMonth;
    if (filterStatus) url += '&status=' + filterStatus;
    const meetings = await api(url);
    const list = document.getElementById('meetingList');
    document.getElementById('monthLabel2').textContent = currentMonth;

    if (!meetings || meetings.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--text-secondary)"><div style="font-size:48px;margin-bottom:12px">📋</div><div style="font-size:15px">이번 달 등록된 회의가 없습니다</div></div>';
      return;
    }

    list.innerHTML = meetings.map(m => {
      const st = statusMap[m.status] || statusMap.scheduled;
      const vis = visibilityMap[m.visibility] || visibilityMap.all;
      return `<div class="meeting-card" data-id="${m.id}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:12px;cursor:pointer;transition:all 0.15s;border-left:4px solid ${st.color}" onmouseenter="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-1px)'" onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:700">${st.emoji} ${esc(m.title)}</h3>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
              📅 ${m.meeting_date} · ⏰ ${m.start_time}${m.end_time ? ' ~ ' + m.end_time : ''} ${m.location ? '· 📍 ' + esc(m.location) : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:10px;padding:3px 8px;border-radius:10px;background:${st.bg};color:${st.color};font-weight:600">${st.label}</span>
            <span style="font-size:10px;padding:3px 8px;border-radius:10px;background:#f1f5f9;color:#64748b" title="${vis.label}">${vis.emoji}</span>
          </div>
        </div>
        ${m.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(m.description)}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px;color:var(--text-secondary)">👤 ${m.participant_count}명 · 작성: ${esc(m.creator_name)}</div>
          ${m.has_minutes > 0 ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#dcfce7;color:#15803d;font-weight:600">📄 회의록 있음</span>' : m.status === 'completed' ? '<span style="font-size:11px;padding:2px 8px;border-radius:8px;background:#fef3c7;color:#92400e;font-weight:600">⚠️ 회의록 미작성</span>' : ''}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.meeting-card').forEach(card => {
      card.addEventListener('click', () => openMeetingDetail(card.dataset.id));
    });
  }

  async function openMeetingDetail(meetingId) {
    const data = await api('/api/protected/meetings/' + meetingId);
    if (data.error) { toast(data.error, 'error'); return; }
    
    const st = statusMap[data.status] || statusMap.scheduled;
    const vis = visibilityMap[data.visibility] || visibilityMap.all;
    const canEdit = data.created_by === state.user.id || state.user.role === 'admin';
    const isCompleted = data.status === 'completed';
    const isPast = new Date(data.meeting_date) < new Date(new Date().toISOString().slice(0,10));
    const mins = data.minutes && data.minutes.length > 0 ? data.minutes[0] : null;

    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '640px';
    modal.style.padding = '28px 32px';
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span style="font-size:12px;padding:3px 10px;border-radius:10px;background:${st.bg};color:${st.color};font-weight:700">${st.emoji} ${st.label}</span>
            <span style="font-size:12px;padding:3px 10px;border-radius:10px;background:#f1f5f9;color:#64748b">${vis.emoji} ${vis.label}</span>
          </div>
          <h2 style="margin:0;font-size:18px;font-weight:800">${esc(data.title)}</h2>
        </div>
        ${canEdit ? '<button class="btn btn-sm" class="text-danger" id="deleteMeetingBtn">🗑️</button>' : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
        <div style="background:var(--bg-main);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px">📅 날짜</div>
          <div style="font-size:13px;font-weight:700">${data.meeting_date}</div>
        </div>
        <div style="background:var(--bg-main);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px">⏰ 시간</div>
          <div style="font-size:13px;font-weight:700">${data.start_time}${data.end_time ? ' ~ ' + data.end_time : ''}</div>
        </div>
        <div style="background:var(--bg-main);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px">📍 장소</div>
          <div style="font-size:13px;font-weight:700">${esc(data.location || '-')}</div>
        </div>
      </div>

      ${data.description ? `<div style="background:var(--bg-main);border-radius:10px;padding:14px;margin-bottom:20px;font-size:13px;color:var(--text-secondary);line-height:1.6">${esc(data.description).replace(/\\n/g, '<br>')}</div>` : ''}

      <div class="mb-20">
        <div style="font-weight:700;font-size:14px;margin-bottom:10px">👥 참가자 (${data.participants.length}명)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${data.participants.map(p => {
            const att = attendanceMap[p.attendance] || attendanceMap.pending;
            return `<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;background:var(--bg-main);border:1px solid var(--border);font-size:12px">
              <span style="width:8px;height:8px;border-radius:50%;background:${att.color}"></span>
              <strong>${esc(p.user_name)}</strong>
              <span style="color:var(--text-secondary);font-size:10px">${roleMap[p.role] || ''}</span>
              ${isCompleted && canEdit ? `<select style="font-size:10px;border:none;background:transparent;cursor:pointer" onchange="updateAttendance('${meetingId}','${p.user_id}',this.value)">
                <option value="attended" ${p.attendance==='attended'?'selected':''}>참석</option>
                <option value="absent" ${p.attendance==='absent'?'selected':''}>불참</option>
                <option value="late" ${p.attendance==='late'?'selected':''}>지각</option>
                <option value="pending" ${p.attendance==='pending'?'selected':''}>미정</option>
              </select>` : `<span style="font-size:10px;color:${att.color}">${att.label}</span>`}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:20px">
        <div style="font-weight:700;font-size:14px;margin-bottom:12px">📄 회의록</div>
        ${mins ? `
          <div style="background:var(--bg-main);border-radius:10px;padding:16px;margin-bottom:12px">
            <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:var(--primary)">📝 회의 내용</div>
            <div style="font-size:13px;line-height:1.8;white-space:pre-wrap">${esc(mins.content)}</div>
          </div>
          ${mins.decisions ? `<div style="background:#eff6ff;border-radius:10px;padding:16px;margin-bottom:12px">
            <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#1d4ed8">✅ 결정사항</div>
            <div style="font-size:13px;line-height:1.8;white-space:pre-wrap">${esc(mins.decisions)}</div>
          </div>` : ''}
          ${mins.action_items ? `<div style="background:#fef3c7;border-radius:10px;padding:16px;margin-bottom:12px">
            <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#92400e">📋 액션 아이템</div>
            <div style="font-size:13px;line-height:1.8;white-space:pre-wrap">${esc(mins.action_items)}</div>
          </div>` : ''}
          ${mins.file_url ? `<div class="mb-12"><a href="/api/protected/files/${mins.file_url}" target="_blank" style="color:var(--primary);font-size:13px">📎 ${esc(mins.file_name || '첨부파일')}</a></div>` : ''}
          <div style="font-size:11px;color:var(--text-secondary)">작성: ${esc(mins.writer_name)} · ${mins.updated_at || mins.created_at}</div>
        ` : `<div style="text-align:center;color:var(--text-secondary);padding:20px;font-size:13px">${isPast || isCompleted ? '아직 회의록이 작성되지 않았습니다' : '회의 종료 후 작성할 수 있습니다'}</div>`}
        ${(isPast || isCompleted) && canEdit ? `<button class="btn btn-primary" id="writeMinutesBtn" style="width:100%;margin-top:12px;padding:10px;font-size:13px;border-radius:10px">${mins ? '📝 회의록 수정' : '📝 회의록 작성'}</button>` : ''}
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        ${canEdit && data.status === 'scheduled' ? '<button class="btn btn-sm" id="completeMeetingBtn" style="background:#22c55e;color:white">✅ 회의 완료</button>' : ''}
        <button class="btn" onclick="closeModal()">닫기</button>
      </div>
    `;
    showModal();

    window.updateAttendance = async function(mId, uId, val) {
      await api('/api/protected/meetings/' + mId + '/participants', { method: 'PUT', json: { user_id: uId, attendance: val } });
      toast('출석 변경!', 'success');
    };

    if (document.getElementById('deleteMeetingBtn')) {
      document.getElementById('deleteMeetingBtn').onclick = async () => {
        if (!confirm('이 회의를 삭제하시겠습니까?')) return;
        await api('/api/protected/meetings/' + meetingId, { method: 'DELETE' });
        toast('삭제 완료', 'info'); closeModal(); loadList();
      };
    }
    if (document.getElementById('completeMeetingBtn')) {
      document.getElementById('completeMeetingBtn').onclick = async () => {
        await api('/api/protected/meetings/' + meetingId, { method: 'PUT', json: { status: 'completed' } });
        toast('회의 완료 처리!', 'success'); closeModal(); loadList();
      };
    }
    if (document.getElementById('writeMinutesBtn')) {
      document.getElementById('writeMinutesBtn').onclick = () => {
        openMinutesEditor(meetingId, mins);
      };
    }
  }

  function openMinutesEditor(meetingId, existing) {
    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '600px';
    modal.style.padding = '28px 32px';
    modal.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);margin-bottom:8px">
          <span style="font-size:24px;filter:brightness(0) invert(1)">📝</span>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:800">${existing ? '회의록 수정' : '회의록 작성'}</h2>
      </div>
      <form id="minutesForm">
        <div class="mb-16">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">📝 회의 내용 *</label>
          <textarea name="content" rows="6" required placeholder="회의에서 논의된 내용을 작성하세요..." style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical">${existing ? esc(existing.content) : ''}</textarea>
        </div>
        <div class="mb-16">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">✅ 결정사항</label>
          <textarea name="decisions" rows="3" placeholder="회의에서 결정된 사항을 작성하세요..." style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical">${existing && existing.decisions ? esc(existing.decisions) : ''}</textarea>
        </div>
        <div class="mb-20">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">📋 액션 아이템 (담당자: 내용)</label>
          <textarea name="action_items" rows="3" placeholder="담당자별 할 일을 작성하세요..." style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical">${existing && existing.action_items ? esc(existing.action_items) : ''}</textarea>
        </div>
        <div style="display:flex;gap:10px">
          <button type="button" class="btn" onclick="openMeetingDetail('${meetingId}')" style="flex:1;padding:10px;border-radius:10px">← 돌아가기</button>
          <button type="submit" class="btn btn-primary" style="flex:2;padding:10px;border-radius:10px">💾 저장</button>
        </div>
      </form>
    `;

    document.getElementById('minutesForm').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const res = await api('/api/protected/meetings/' + meetingId + '/minutes', {
        method: 'POST',
        json: {
          content: form.content.value,
          decisions: form.decisions.value,
          action_items: form.action_items.value,
        }
      });
      if (res.error) { toast(res.error, 'error'); return; }
      toast(res.updated ? '회의록 수정 완료!' : '회의록 저장 완료!', 'success');
      openMeetingDetail(meetingId);
    };
  }

  // Make openMeetingDetail accessible
  window.openMeetingDetail = openMeetingDetail;

  loadList();

  document.getElementById('prevMonth2').onclick = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    currentMonth = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`;
    loadList();
  };
  document.getElementById('nextMonth2').onclick = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    currentMonth = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
    loadList();
  };

  document.querySelectorAll('.meeting-filter').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.meeting-filter').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      filterStatus = this.dataset.status;
      loadList();
    });
  });

  // 회의 등록
  document.getElementById('addMeetingBtn').onclick = async () => {
    const users = await api('/api/protected/leave/users');
    const modal = document.getElementById('modalContent');
    modal.style.maxWidth = '520px';
    modal.style.padding = '28px 32px';
    modal.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#3b82f6,#2563eb);margin-bottom:8px">
          <span style="font-size:24px;filter:brightness(0) invert(1)">📝</span>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:800">회의 등록</h2>
      </div>
      <form id="meetingForm">
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">제목 *</label>
          <input type="text" name="title" required placeholder="회의 제목" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">📅 날짜 *</label>
            <input type="date" name="meeting_date" required style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">⏰ 시작 *</label>
            <input type="time" name="start_time" required style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">⏰ 종료</label>
            <input type="time" name="end_time" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">📍 장소</label>
            <input type="text" name="location" placeholder="회의 장소" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px">
          </div>
          <div>
            <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">🔒 공개범위</label>
            <select name="visibility" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
              <option value="all">🌐 전체 공개</option>
              <option value="participants">👥 참가자만</option>
              <option value="admin">🔒 관리자만</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">설명</label>
          <textarea name="description" rows="2" placeholder="회의 안건 및 설명" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
        </div>
        <div class="mb-20">
          <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">👥 참가자</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(users||[]).filter(u => u.id !== state.user.id).map(u => `<label style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;background:var(--bg-main);border:1px solid var(--border);cursor:pointer;font-size:12px;transition:all 0.15s">
              <input type="checkbox" name="participants" value="${u.id}" checked style="accent-color:var(--primary)"> ${esc(u.name)}
            </label>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <button type="button" class="btn" onclick="closeModal()" style="flex:1;padding:10px;border-radius:10px">취소</button>
          <button type="submit" class="btn btn-primary" style="flex:2;padding:10px;border-radius:10px">📝 등록</button>
        </div>
      </form>
    `;
    showModal();

    document.getElementById('meetingForm').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const checked = Array.from(form.querySelectorAll('input[name="participants"]:checked')).map(c => ({ user_id: c.value }));
      const res = await api('/api/protected/meetings', {
        method: 'POST',
        json: {
          title: form.title.value,
          description: form.description.value,
          meeting_date: form.meeting_date.value,
          start_time: form.start_time.value,
          end_time: form.end_time.value,
          location: form.location.value,
          visibility: form.visibility.value,
          participants: checked,
        }
      });
      if (res.error) { toast(res.error, 'error'); return; }
      toast('회의 등록 완료!', 'success');
      closeModal(); loadList();
    };
  };
}


PFM.modules.meetings = { renderMeetings };
})(window.PFM);
