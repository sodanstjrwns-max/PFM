/* ═══ Module: Kakao Alimtalk Settings (v3.3) ═══ */
(function(PFM) {
'use strict';
const { api, state, esc, toast, showModal, closeModal, canManage } = PFM;

async function renderKakao(body, actions) {
  body.innerHTML = `
    <div class="kakao-page">
      <div class="kakao-header">
        <h2 style="margin:0 0 4px 0">💛 카카오 알림톡</h2>
        <p style="color:#64748b;font-size:13px;margin:0">SMS 대비 5배 열람률. 정기 검진/예약확인/리콜을 카톡으로 발송하세요</p>
      </div>

      <div class="kakao-intro-card">
        <div style="display:flex;gap:16px;align-items:start">
          <div style="font-size:40px">💛</div>
          <div style="flex:1">
            <h3 style="margin:0 0 6px">알림톡이란?</h3>
            <p style="font-size:13px;color:#475569;line-height:1.6;margin:0">
              카카오 비즈니스 채널을 통해 사전 승인된 템플릿을 발송하는 서비스입니다.
              <b>수신자의 카톡으로 직접 전달</b>되며, 카톡 미설치/차단 시 자동 SMS 폴백.<br>
              평균 <b>열람률 95%</b> (SMS 18% 대비 5배), 건당 ~10원 수준.
            </p>
            <div class="kakao-steps">
              <span>1️⃣ 카카오 비즈니스 채널 개설</span>
              <span>2️⃣ 템플릿 사전 승인</span>
              <span>3️⃣ 알리고 연동</span>
              <span>4️⃣ 발송 시작</span>
            </div>
          </div>
        </div>
      </div>

      <div id="kakaoConfigCard" class="kakao-section"></div>
      <div id="kakaoTemplatesCard" class="kakao-section"></div>
      <div id="kakaoLogsCard" class="kakao-section"></div>
    </div>
  `;

  await loadConfigCard();
  await loadTemplatesCard();
  await loadLogsCard();
}

async function loadConfigCard() {
  const el = document.getElementById('kakaoConfigCard');
  if (!el) return;
  try {
    const data = await api('/api/protected/kakao/config');
    el.innerHTML = `
      <div class="kakao-card">
        <div class="kakao-card-head">
          <h3>⚙️ API 설정</h3>
          <span class="kakao-status ${data.configured ? 'ok' : 'warn'}">
            ${data.configured ? '✅ 연동됨' : '⚠️ 미설정'}
          </span>
        </div>
        <form id="kakaoConfigForm" class="kakao-form">
          <div class="form-group">
            <label>Aligo API Key ${data.has_api_key ? '<small style="color:#059669">(저장됨)</small>' : ''}</label>
            <input type="password" class="form-input" name="api_key" placeholder="${data.has_api_key ? '변경 시에만 입력' : 'xxxxxxxx'}" autocomplete="off">
          </div>
          <div class="form-group">
            <label>User ID</label>
            <input class="form-input" name="user_id" value="${esc(data.user_id || '')}" placeholder="aligo 로그인 아이디">
          </div>
          <div class="form-group">
            <label>발신 프로필 Sender Key ${data.sender_key_last4 ? `<small style="color:#059669">(…${data.sender_key_last4})</small>` : ''}</label>
            <input type="password" class="form-input" name="sender_key" placeholder="${data.sender_key_last4 ? '변경 시에만 입력' : '카카오 비즈니스 채널 키'}" autocomplete="off">
          </div>
          <div class="form-group">
            <label>플러스친구 ID (선택)</label>
            <input class="form-input" name="plus_friend_id" value="${esc(data.plus_friend_id || '')}" placeholder="@우리치과">
          </div>
          ${canManage() ? '<button type="submit" class="btn btn-primary">저장</button>' : '<div style="color:#94a3b8;font-size:12px">설정 변경은 관리자만 가능합니다</div>'}
        </form>
      </div>
    `;
    if (canManage()) {
      document.getElementById('kakaoConfigForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const json = Object.fromEntries(fd.entries());
        // Don't send empty fields to preserve existing values
        Object.keys(json).forEach(k => { if (!json[k]) delete json[k]; });
        try {
          await api('/api/protected/kakao/config', { method: 'POST', json });
          toast('✅ 설정 저장됨', 'success');
          await loadConfigCard();
        } catch (e) {
          toast('실패: ' + e.message, 'error');
        }
      });
    }
  } catch (e) {
    el.innerHTML = `<div class="kakao-empty">설정 불러오기 실패: ${esc(e.message)}</div>`;
  }
}

async function loadTemplatesCard() {
  const el = document.getElementById('kakaoTemplatesCard');
  if (!el) return;
  try {
    const data = await api('/api/protected/kakao/templates');
    const templates = data.templates || [];
    el.innerHTML = `
      <div class="kakao-card">
        <div class="kakao-card-head">
          <h3>📝 템플릿 (${templates.length})</h3>
          ${canManage() ? '<button class="btn btn-sm btn-outline" id="kkEditTplBtn">✏️ 편집</button>' : ''}
        </div>
        <div class="kakao-templates">
          ${templates.map(t => `
            <div class="kakao-template">
              <div class="kakao-tpl-head">
                <span class="kakao-tpl-code">${esc(t.code)}</span>
                <strong>${esc(t.name)}</strong>
                <button class="btn btn-xs btn-ghost" data-preview="${esc(t.code)}">🔍 미리보기</button>
              </div>
              <div class="kakao-tpl-body">${esc(t.content).replace(/\n/g, '<br>')}</div>
              ${(t.buttons || []).length ? `
                <div class="kakao-tpl-buttons">
                  ${(t.buttons || []).map(b => `<span class="kakao-tpl-btn">${esc(b.name)} (${esc(b.type)})</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('') || '<div class="kakao-empty">등록된 템플릿이 없습니다</div>'}
        </div>
      </div>
    `;
    el.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', () => previewTemplate(btn.dataset.preview));
    });
    if (canManage()) {
      document.getElementById('kkEditTplBtn')?.addEventListener('click', editTemplates);
    }
  } catch (e) {
    el.innerHTML = `<div class="kakao-empty">불러오기 실패: ${esc(e.message)}</div>`;
  }
}

async function previewTemplate(code) {
  try {
    const res = await api('/api/protected/kakao/test', {
      method: 'POST',
      json: {
        template_code: code,
        variables: {
          patient_name: '홍길동',
          appointment_date: '2026-04-25 (목) 14:00',
          doctor_name: '김원장',
        },
      },
    });
    const body = `
      <div class="kakao-preview">
        <div class="kakao-preview-header">
          <div class="kakao-preview-ch">💛 알림톡 미리보기</div>
          <div style="font-size:12px;color:#64748b">${esc(res.template_name || code)}</div>
        </div>
        <div class="kakao-preview-bubble">${esc(res.preview).replace(/\n/g, '<br>')}</div>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#64748b">
        💡 실제 발송 시 변수 ({patient_name}, {hospital_name} 등)는 환자 데이터로 자동 치환됩니다.
      </div>
    `;
    showModal(`미리보기: ${res.template_name}`, body);
  } catch (e) {
    toast('실패: ' + e.message, 'error');
  }
}

async function editTemplates() {
  try {
    const data = await api('/api/protected/kakao/templates');
    const templates = data.templates || [];
    const body = `
      <div style="font-size:13px;color:#64748b;margin-bottom:12px">
        ⚠️ 템플릿은 <b>카카오 비즈니스 채널에서 먼저 승인</b>받아야 실제 발송됩니다.
        여기 등록하는 코드는 카카오에 등록된 템플릿 코드와 일치해야 해요.
      </div>
      <div id="kkTplEditList" style="max-height:60vh;overflow-y:auto">
        ${templates.map((t, i) => tplEditRow(t, i)).join('')}
      </div>
      <button class="btn btn-sm btn-outline" id="kkTplAddBtn" style="margin-top:8px">+ 템플릿 추가</button>
      <div style="margin-top:14px;text-align:right">
        <button class="btn btn-primary" id="kkTplSaveBtn">저장</button>
      </div>
    `;
    showModal('📝 템플릿 편집', body);
    let list = [...templates];
    const renderList = () => {
      document.getElementById('kkTplEditList').innerHTML = list.map((t, i) => tplEditRow(t, i)).join('');
      bindTplRowHandlers();
    };
    const bindTplRowHandlers = () => {
      document.querySelectorAll('[data-tpl-del]').forEach(b => {
        b.onclick = () => { list.splice(parseInt(b.dataset.tplDel), 1); renderList(); };
      });
    };
    bindTplRowHandlers();
    document.getElementById('kkTplAddBtn').onclick = () => {
      list.push({ code: 'NEW_TPL_' + Date.now(), name: '새 템플릿', content: '', buttons: [] });
      renderList();
    };
    document.getElementById('kkTplSaveBtn').onclick = async () => {
      // Collect inputs
      const rows = document.querySelectorAll('[data-tpl-idx]');
      const collected = Array.from(rows).map(row => {
        const idx = parseInt(row.dataset.tplIdx);
        return {
          code: row.querySelector('[name=code]').value.trim(),
          name: row.querySelector('[name=name]').value.trim(),
          content: row.querySelector('[name=content]').value,
          buttons: list[idx]?.buttons || [],
        };
      }).filter(t => t.code && t.name);
      try {
        await api('/api/protected/kakao/templates', {
          method: 'POST',
          json: { templates: collected },
        });
        toast('✅ 저장됨', 'success');
        closeModal && closeModal();
        await loadTemplatesCard();
      } catch (e) { toast('실패: ' + e.message, 'error'); }
    };
  } catch (e) { toast('실패: ' + e.message, 'error'); }
}

function tplEditRow(t, idx) {
  return `
    <div class="kakao-tpl-edit" data-tpl-idx="${idx}">
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <input class="form-input" name="code" value="${esc(t.code)}" placeholder="템플릿 코드 (카카오 승인 코드)" style="max-width:180px">
        <input class="form-input" name="name" value="${esc(t.name)}" placeholder="템플릿 이름" style="flex:1">
        <button class="btn btn-xs btn-ghost" data-tpl-del="${idx}">삭제</button>
      </div>
      <textarea class="form-input" name="content" rows="4" placeholder="안녕하세요, {patient_name}님..." style="font-family:inherit">${esc(t.content || '')}</textarea>
    </div>
  `;
}

async function loadLogsCard() {
  const el = document.getElementById('kakaoLogsCard');
  if (!el) return;
  try {
    const data = await api('/api/protected/kakao/logs');
    const logs = data.logs || [];
    const stats = data.stats || {};
    el.innerHTML = `
      <div class="kakao-card">
        <div class="kakao-card-head">
          <h3>📜 발송 이력 (최근 100건)</h3>
          <div style="font-size:13px;color:#64748b">
            성공 ${stats.sent || 0} · 실패 ${stats.failed || 0}
          </div>
        </div>
        ${logs.length === 0 ? `
          <div class="kakao-empty">아직 발송 이력이 없습니다</div>
        ` : `
          <table class="kakao-logs-table">
            <thead>
              <tr><th>일시</th><th>템플릿</th><th>수신</th><th>상태</th><th>비고</th></tr>
            </thead>
            <tbody>
              ${logs.slice(0, 30).map(l => `
                <tr>
                  <td>${esc((l.sent_at || '').replace('T', ' ').slice(0, 19))}</td>
                  <td>${esc(l.template_code || '')}</td>
                  <td>${esc(l.receiver || '')}</td>
                  <td><span class="kakao-log-status ${l.status}">${l.status === 'sent' ? '✓ 발송' : '✗ 실패'}</span></td>
                  <td>${esc(l.error || l.msg_type || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="kakao-empty">불러오기 실패: ${esc(e.message)}</div>`;
  }
}

PFM.modules.kakao = { renderKakao };
})(window.PFM = window.PFM || { modules: {} });
