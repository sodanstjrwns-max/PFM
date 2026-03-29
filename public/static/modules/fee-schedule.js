/* ═══ Module: Fee Schedule (수가표) ═══ */
(function(PFM) {
'use strict';
const { api, ICONS, state, esc, toast, showModal, closeModal, formatPrice } = PFM;

const CAT_ICONS = ['🦷','💎','🔧','✨','🩺','💉','🔬','🌟','📐','🧪'];
const CAT_COLORS = ['#3b82f6','#8b5cf6','#ef4444','#f59e0b','#22c55e','#06b6d4','#ec4899','#0ea5e9','#f97316','#6366f1'];

async function renderFeeSchedule(body, actions) {
  const isManager = ['admin','manager'].includes(state.user.role);

  if (isManager) {
    actions.innerHTML = `<button class="btn btn-primary btn-sm" id="addCatBtn">➕ 카테고리 추가</button>`;
  }

  body.innerHTML = `<div id="feeContent" style="max-width:900px"><div class="mod-empty"><span class="loading-spinner"></span></div></div>`;

  const [categories, items] = await Promise.all([
    api('/api/protected/fee/categories'),
    api('/api/protected/fee/items'),
  ]);

  renderFeeContent(body, categories, items, isManager);

  // 카테고리 추가
  document.getElementById('addCatBtn')?.addEventListener('click', () => {
    showModal('➕ 진료 카테고리 추가', `
      <div class="form-group"><label>카테고리명</label><input class="form-input" id="catName" placeholder="예: 임플란트, 교정, 보존"></div>
      <div class="form-grid">
        <div class="form-group"><label>아이콘</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap" id="catIconPick">
            ${CAT_ICONS.map((ic, i) => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="width:36px;height:36px;border-radius:8px;border:2px solid ${i===0?'var(--primary)':'var(--border)'};background:var(--bg);font-size:18px;cursor:pointer">${ic}</button>`).join('')}
          </div>
        </div>
        <div class="form-group"><label>색상</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap" id="catColorPick">
            ${CAT_COLORS.map((c, i) => `<button type="button" class="color-pick-btn" data-color="${c}" style="width:36px;height:36px;border-radius:8px;border:2px solid ${i===0?'#000':'transparent'};background:${c};cursor:pointer"></button>`).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" id="catSubmit" style="width:100%;margin-top:12px">추가</button>
    `);
    let selIcon = CAT_ICONS[0], selColor = CAT_COLORS[0];
    document.querySelectorAll('.icon-pick-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.icon-pick-btn').forEach(x => x.style.borderColor = 'var(--border)');
      b.style.borderColor = 'var(--primary)'; selIcon = b.dataset.icon;
    }));
    document.querySelectorAll('.color-pick-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.color-pick-btn').forEach(x => x.style.borderColor = 'transparent');
      b.style.borderColor = '#000'; selColor = b.dataset.color;
    }));
    document.getElementById('catSubmit').addEventListener('click', async () => {
      const name = document.getElementById('catName')?.value?.trim();
      if (!name) { toast('카테고리명을 입력해주세요', 'error'); return; }
      try {
        await api('/api/protected/fee/categories', { method: 'POST', json: { name, icon: selIcon, color: selColor }});
        toast('카테고리가 추가되었습니다', 'success');
        closeModal();
        renderFeeSchedule(body, actions);
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

function renderFeeContent(body, categories, items, isManager) {
  const content = document.getElementById('feeContent');

  if (!categories.length) {
    content.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:48px;margin-bottom:16px">💰</div>
        <h3 style="font-size:18px;font-weight:800;margin-bottom:8px">수가표를 시작하세요</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">먼저 진료 카테고리 (임플란트, 교정, 보존 등)를 추가하고<br>각 카테고리에 세부 항목과 비용을 등록하세요.</p>
        ${isManager ? `<button class="btn btn-primary" id="startFeeBtn">➕ 첫 카테고리 만들기</button>` : ''}
      </div>`;
    document.getElementById('startFeeBtn')?.addEventListener('click', () => document.getElementById('addCatBtn')?.click());
    return;
  }

  // 카테고리별 항목 그룹핑
  const grouped = {};
  categories.forEach(c => { grouped[c.id] = { ...c, items: [] }; });
  items.forEach(item => { if (grouped[item.category_id]) grouped[item.category_id].items.push(item); });

  // 전체 통계
  const totalItems = items.length;
  const avgPrice = totalItems ? Math.round(items.reduce((s, i) => s + (i.base_price||0), 0) / totalItems) : 0;

  content.innerHTML = `
    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div class="mod-muted-sm">카테고리</div>
        <div style="font-size:24px;font-weight:800;color:var(--primary)">${categories.length}</div>
      </div>
      <div style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div class="mod-muted-sm">총 항목</div>
        <div style="font-size:24px;font-weight:800;color:#8b5cf6">${totalItems}</div>
      </div>
      <div style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div class="mod-muted-sm">평균 수가</div>
        <div style="font-size:24px;font-weight:800;color:#f59e0b">${formatPrice(avgPrice)}</div>
      </div>
    </div>

    ${Object.values(grouped).map(cat => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;margin-bottom:16px;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:${cat.color}08;border-bottom:1px solid var(--border-light)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">${cat.icon}</span>
            <div>
              <div style="font-weight:800;font-size:15px;color:${cat.color}">${esc(cat.name)}</div>
              <div class="mod-muted-sm">${cat.items.length}개 항목</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            ${isManager ? `<button class="btn btn-primary btn-sm fee-add-item" data-cat-id="${cat.id}" data-cat-name="${esc(cat.name)}">+ 항목</button>
            <button class="btn-icon fee-del-cat" data-cat-id="${cat.id}" data-cat-name="${esc(cat.name)}" title="카테고리 삭제">${ICONS.trash}</button>` : ''}
          </div>
        </div>
        ${cat.items.length ? `
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="font-size:11px;color:var(--text-muted);text-align:left;border-bottom:1px solid var(--border-light)">
              <th style="padding:10px 20px;font-weight:600">항목명</th>
              <th style="padding:10px;font-weight:600;text-align:right">기본 수가</th>
              <th style="padding:10px;font-weight:600;text-align:right">할인가</th>
              <th style="padding:10px;font-weight:600;text-align:center">소요시간</th>
              ${isManager ? '<th style="padding:10px;width:60px"></th>' : ''}
            </tr></thead>
            <tbody>
              ${cat.items.map(item => `
                <tr style="border-bottom:1px solid var(--border-light);transition:background .1s" onmouseenter="this.style.background='var(--bg)'" onmouseleave="this.style.background=''">
                  <td style="padding:12px 20px">
                    <div style="font-weight:600;font-size:13px">${esc(item.name)}</div>
                    ${item.description ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${esc(item.description)}</div>` : ''}
                  </td>
                  <td style="padding:12px 10px;text-align:right;font-weight:700;font-size:14px;color:${cat.color}">${formatPrice(item.base_price)}</td>
                  <td style="padding:12px 10px;text-align:right;font-size:13px;color:${item.discount_price ? '#ef4444' : 'var(--text-muted)'}">${item.discount_price ? formatPrice(item.discount_price) : '-'}</td>
                  <td style="padding:12px 10px;text-align:center;font-size:12px;color:var(--text-muted)">${item.duration_min}분</td>
                  ${isManager ? `<td style="padding:12px 10px;text-align:center"><button class="btn-icon fee-del-item" data-item-id="${item.id}" title="삭제">${ICONS.trash}</button></td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">등록된 항목이 없습니다</div>`}
      </div>
    `).join('')}`;

  // 항목 추가 이벤트
  content.querySelectorAll('.fee-add-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.dataset.catId;
      const catName = btn.dataset.catName;
      showModal(`➕ ${catName} - 수가 항목 추가`, `
        <div class="form-group"><label>항목명 <span style="color:var(--danger)">*</span></label><input class="form-input" id="fiName" placeholder="예: 임플란트 1개, 레진 충전"></div>
        <div class="form-grid">
          <div class="form-group"><label>기본 수가 (원)</label><input class="form-input" type="number" id="fiPrice" placeholder="1000000"></div>
          <div class="form-group"><label>할인가 (원, 선택)</label><input class="form-input" type="number" id="fiDiscount" placeholder="800000"></div>
        </div>
        <div class="form-grid">
          <div class="form-group"><label>소요시간 (분)</label><input class="form-input" type="number" id="fiDuration" value="30"></div>
          <div class="form-group"><label>단위</label><input class="form-input" id="fiUnit" value="개" placeholder="개, 악, 치아"></div>
        </div>
        <div class="form-group"><label>설명 (선택)</label><input class="form-input" id="fiDesc" placeholder="간단한 설명"></div>
        <button class="btn btn-primary" id="fiSubmit" style="width:100%;margin-top:12px">추가</button>
      `);
      document.getElementById('fiSubmit').addEventListener('click', async () => {
        const name = document.getElementById('fiName')?.value?.trim();
        if (!name) { toast('항목명을 입력해주세요', 'error'); return; }
        try {
          await api('/api/protected/fee/items', { method: 'POST', json: {
            category_id: catId, name,
            base_price: parseInt(document.getElementById('fiPrice')?.value)||0,
            discount_price: parseInt(document.getElementById('fiDiscount')?.value)||null,
            duration_min: parseInt(document.getElementById('fiDuration')?.value)||30,
            unit: document.getElementById('fiUnit')?.value||'개',
            description: document.getElementById('fiDesc')?.value?.trim()||'',
          }});
          toast('항목이 추가되었습니다', 'success');
          closeModal();
          renderFeeSchedule(body, document.getElementById('headerActions'));
        } catch(e) { toast(e.message, 'error'); }
      });
    });
  });

  // 카테고리 삭제
  content.querySelectorAll('.fee-del-cat').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`"${btn.dataset.catName}" 카테고리와 모든 항목을 삭제하시겠습니까?`)) return;
      try {
        await api('/api/protected/fee/categories/' + btn.dataset.catId, { method: 'DELETE' });
        toast('삭제되었습니다', 'success');
        renderFeeSchedule(body, document.getElementById('headerActions'));
      } catch(e) { toast(e.message, 'error'); }
    });
  });

  // 항목 삭제
  content.querySelectorAll('.fee-del-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 항목을 삭제하시겠습니까?')) return;
      try {
        await api('/api/protected/fee/items/' + btn.dataset.itemId, { method: 'DELETE' });
        toast('삭제되었습니다', 'success');
        renderFeeSchedule(body, document.getElementById('headerActions'));
      } catch(e) { toast(e.message, 'error'); }
    });
  });
}

PFM.modules.feeSchedule = { renderFeeSchedule };
})(window.PFM);
