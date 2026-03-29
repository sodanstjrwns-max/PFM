/* ═══ 리뷰 통합 관리 모듈 ═══ */
(function() {
'use strict';
const { state, api, esc, ICONS, toast, showModal, closeModal, canManage } = window.PFM;

let rvState = { tab: 'dashboard', page: 1, filters: {} };

const platformInfo = {
  naver: { name: '네이버', color: '#03c75a', icon: 'N' },
  google: { name: '구글', color: '#4285f4', icon: 'G' },
  kakao: { name: '카카오', color: '#fee500', icon: 'K', textColor: '#3c1e1e' },
  modoo: { name: '모두닥', color: '#ff6b35', icon: 'M' },
  instagram: { name: '인스타', color: '#e1306c', icon: 'I' },
  other: { name: '기타', color: '#94a3b8', icon: '?' },
};

const sentimentInfo = {
  positive: { label: '긍정', color: '#10b981', icon: '😊', bg: '#ecfdf5' },
  neutral: { label: '중립', color: '#f59e0b', icon: '😐', bg: '#fffbeb' },
  negative: { label: '부정', color: '#ef4444', icon: '😠', bg: '#fef2f2' },
};

function fmtNum(n) { return (n||0).toLocaleString(); }

async function renderReviewMgmt(body, actions) {
  actions.innerHTML = '';

  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="rv-tab ${rvState.tab==='dashboard'?'active':''}" data-tab="dashboard" style="padding:8px 16px;border-radius:20px;border:1px solid #d1d5db;cursor:pointer;font-size:13px;font-weight:600;background:${rvState.tab==='dashboard'?'#0f766e':'#fff'};color:${rvState.tab==='dashboard'?'#fff':'#374151'}">📊 대시보드</button>
      <button class="rv-tab ${rvState.tab==='list'?'active':''}" data-tab="list" style="padding:8px 16px;border-radius:20px;border:1px solid #d1d5db;cursor:pointer;font-size:13px;font-weight:600;background:${rvState.tab==='list'?'#0f766e':'#fff'};color:${rvState.tab==='list'?'#fff':'#374151'}">📝 리뷰 목록</button>
    </div>
    <div id="rvContent"><div class="loading-spinner" style="padding:40px;text-align:center">로딩 중...</div></div>
  `;

  body.querySelectorAll('.rv-tab').forEach(b => b.addEventListener('click', () => {
    rvState.tab = b.dataset.tab;
    renderReviewMgmt(body, actions);
  }));

  const content = document.getElementById('rvContent');
  try {
    if (rvState.tab === 'dashboard') await renderRvDashboard(content);
    else await renderRvList(content);
  } catch(e) {
    content.innerHTML = `<div class="card" class="p-20"><p class="text-danger">${esc(e.message)}</p></div>`;
  }
}

async function renderRvDashboard(el) {
  const data = await api('/api/protected/review-mgmt/dashboard');
  const ov = data.overview || {};
  const platforms = data.byPlatform || [];
  const monthly = data.monthlyTrend || [];
  const negatives = data.recentNegative || [];
  const keywords = data.keywords || [];

  // 별점 표시
  function stars(rating) {
    return '★'.repeat(Math.round(rating||0)) + '☆'.repeat(5-Math.round(rating||0));
  }

  el.innerHTML = `
    <!-- 개요 카드 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">총 리뷰</div>
        <div style="font-size:28px;font-weight:800;color:#0f766e">${fmtNum(ov.total)}</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">평균 별점</div>
        <div style="font-size:24px;font-weight:800;color:#f59e0b">${ov.avgRating || '-'}</div>
        <div style="font-size:12px;color:#fbbf24">${stars(ov.avgRating)}</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">긍정률</div>
        <div style="font-size:28px;font-weight:800;color:#10b981">${ov.positiveRate || 0}%</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">답변 대기</div>
        <div style="font-size:28px;font-weight:800;color:${ov.pendingResponse > 0 ? '#ef4444' : '#94a3b8'}">${fmtNum(ov.pendingResponse)}</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:11px;color:#64748b">부정 리뷰</div>
        <div style="font-size:28px;font-weight:800;color:#ef4444">${fmtNum(ov.negative)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <!-- 플랫폼별 -->
      <div class="card" class="p-20">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📱 플랫폼별 현황</h3>
        ${platforms.length === 0 ? '<p style="color:#94a3b8;font-size:13px">리뷰 데이터가 없습니다</p>' :
        platforms.map(p => {
          const info = platformInfo[p.platform] || platformInfo.other;
          return `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:10px;background:#f8fafc;border-radius:10px">
            <div style="width:32px;height:32px;border-radius:8px;background:${info.color};color:${info.textColor||'#fff'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">${info.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between">
                <span style="font-size:13px;font-weight:600">${info.name}</span>
                <span style="font-size:13px;font-weight:700;color:#0f766e">${p.count}건</span>
              </div>
              <div style="display:flex;gap:8px;font-size:11px;color:#94a3b8;margin-top:2px">
                <span style="color:#f59e0b">★ ${p.avg_rating || '-'}</span>
                <span style="color:#10b981">긍정 ${p.positive||0}</span>
                <span class="text-danger">부정 ${p.negative||0}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- 감성 분포 -->
      <div class="card" class="p-20">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">💭 감성 분포</h3>
        ${ov.total > 0 ? `
        <div style="display:flex;gap:12px;margin-bottom:16px">
          ${['positive','neutral','negative'].map(s => {
            const info = sentimentInfo[s];
            const count = ov[s] || 0;
            const pct = ov.total > 0 ? Math.round(count/ov.total*100) : 0;
            return `<div style="flex:1;text-align:center;padding:14px;background:${info.bg};border-radius:12px">
              <div style="font-size:24px">${info.icon}</div>
              <div style="font-size:18px;font-weight:800;color:${info.color}">${count}</div>
              <div style="font-size:11px;color:${info.color}">${info.label} ${pct}%</div>
            </div>`;
          }).join('')}
        </div>
        <div style="height:16px;border-radius:8px;overflow:hidden;display:flex">
          <div style="width:${ov.total>0?(ov.positive||0)/ov.total*100:0}%;background:#10b981"></div>
          <div style="width:${ov.total>0?(ov.neutral||0)/ov.total*100:0}%;background:#f59e0b"></div>
          <div style="width:${ov.total>0?(ov.negative||0)/ov.total*100:0}%;background:#ef4444"></div>
        </div>` : '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px">리뷰 데이터가 없습니다</p>'}

        ${keywords.length > 0 ? `
        <h4 style="font-size:14px;font-weight:700;margin:20px 0 10px">🏷️ 키워드 Top 10</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${keywords.slice(0,10).map((k,i) => `<span style="padding:4px 10px;background:${i<3?'#0f766e':'#f1f5f9'};color:${i<3?'#fff':'#374151'};border-radius:12px;font-size:12px;font-weight:500">${esc(k.word)} (${k.count})</span>`).join('')}
        </div>` : ''}
      </div>
    </div>

    <!-- 월별 트렌드 -->
    ${monthly.length > 0 ? `
    <div class="card" style="padding:20px;margin-bottom:20px">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">📈 월별 트렌드</h3>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0">
              <th style="padding:8px;text-align:left">월</th>
              <th class="tbl-cell-center">건수</th>
              <th class="tbl-cell-center">평균별점</th>
              <th class="tbl-cell-center">긍정</th>
              <th class="tbl-cell-center">부정</th>
            </tr>
          </thead>
          <tbody>
            ${monthly.map(m => `
            <tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:8px;font-weight:600">${m.month}</td>
              <td class="tbl-cell-center">${m.count}</td>
              <td style="padding:8px;text-align:center;color:#f59e0b;font-weight:700">★ ${m.avg_rating||'-'}</td>
              <td style="padding:8px;text-align:center;color:#10b981">${m.positive||0}</td>
              <td style="padding:8px;text-align:center;color:#ef4444">${m.negative||0}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <!-- 최근 부정 리뷰 -->
    ${negatives.length > 0 ? `
    <div class="card" style="padding:20px;border-left:4px solid #ef4444">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">⚠️ 최근 부정 리뷰 (관리 필요)</h3>
      ${negatives.map(r => {
        const pInfo = platformInfo[r.platform] || platformInfo.other;
        return `
        <div style="padding:12px;margin-bottom:8px;background:#fef2f2;border-radius:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${pInfo.color};color:${pInfo.textColor||'#fff'};text-align:center;line-height:20px;font-size:10px;font-weight:800">${pInfo.icon}</span>
              <span style="font-size:13px;font-weight:600">${esc(r.reviewer_name)}</span>
              <span style="font-size:11px;color:#f59e0b">${'★'.repeat(r.rating||0)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;color:#94a3b8">${r.review_date}</span>
              <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${r.response_status==='completed'?'#dcfce7':'#fef3c7'};color:${r.response_status==='completed'?'#16a34a':'#d97706'}">${r.response_status==='completed'?'답변완료':'대기'}</span>
            </div>
          </div>
          <p style="font-size:12px;color:#374151;line-height:1.5">${esc((r.review_text||'').slice(0,200))}</p>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;
}

async function renderRvList(el) {
  const f = rvState.filters;
  let url = '/api/protected/review-mgmt?page=' + rvState.page;
  if (f.platform) url += '&platform=' + f.platform;
  if (f.sentiment) url += '&sentiment=' + f.sentiment;
  if (f.status) url += '&status=' + f.status;

  const data = await api(url);
  const reviews = data.data || [];
  const total = data.total || 0;
  const totalPages = Math.ceil(total / 30);

  el.innerHTML = `
    <!-- 필터 + 추가 버튼 -->
    <div class="card" style="padding:14px;margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <select id="rvFltPlatform" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px">
        <option value="">전체 플랫폼</option>
        ${Object.entries(platformInfo).map(([k,v]) => `<option value="${k}" ${f.platform===k?'selected':''}>${v.name}</option>`).join('')}
      </select>
      <select id="rvFltSentiment" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px">
        <option value="">전체 감성</option>
        ${Object.entries(sentimentInfo).map(([k,v]) => `<option value="${k}" ${f.sentiment===k?'selected':''}>${v.label}</option>`).join('')}
      </select>
      <select id="rvFltStatus" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px">
        <option value="">전체 상태</option>
        <option value="pending" ${f.status==='pending'?'selected':''}>답변 대기</option>
        <option value="completed" ${f.status==='completed'?'selected':''}>답변 완료</option>
      </select>
      <span style="font-size:12px;color:#94a3b8;flex:1;text-align:right">총 ${fmtNum(total)}건</span>
      <button id="addReviewBtn" style="padding:8px 14px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600">+ 리뷰 등록</button>
    </div>

    ${reviews.length === 0 ? `
    <div class="card" style="padding:40px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">⭐</div>
      <h3 style="font-size:16px;font-weight:700;color:#374151;margin-bottom:6px">등록된 리뷰가 없습니다</h3>
      <p style="font-size:13px;color:#94a3b8">네이버, 구글 등의 리뷰를 수동으로 등록하여 관리하세요</p>
    </div>` : `
    <div style="display:grid;gap:10px">
      ${reviews.map(r => {
        const pInfo = platformInfo[r.platform] || platformInfo.other;
        const sInfo = sentimentInfo[r.sentiment] || sentimentInfo.neutral;
        return `
        <div class="card" style="padding:16px;${r.is_pinned?'border-left:4px solid #f59e0b':''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:28px;height:28px;border-radius:6px;background:${pInfo.color};color:${pInfo.textColor||'#fff'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">${pInfo.icon}</div>
              <div>
                <div style="font-size:13px;font-weight:600">${esc(r.reviewer_name)} ${r.is_pinned?'📌':''}</div>
                <div style="font-size:11px;color:#94a3b8">${pInfo.name} · ${r.review_date} · <span style="color:${sInfo.color}">${sInfo.icon} ${sInfo.label}</span></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="color:#fbbf24;font-size:13px">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</span>
              <button class="rv-action-btn" data-id="${r.id}" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;background:#fff;font-size:11px;cursor:pointer">⋯</button>
            </div>
          </div>
          <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:6px">${esc((r.review_text||'').slice(0,300))}${(r.review_text||'').length > 300 ? '...' : ''}</p>
          ${r.tags ? `<div style="margin-bottom:6px">${r.tags.split(',').filter(t=>t.trim()).map(t => `<span style="display:inline-block;padding:2px 8px;margin:2px;background:#f1f5f9;border-radius:8px;font-size:10px;color:#64748b">${esc(t.trim())}</span>`).join('')}</div>` : ''}
          ${r.response_text ? `
          <div style="padding:10px;background:#f0fdf4;border-radius:8px;border-left:3px solid #10b981">
            <div style="font-size:10px;color:#16a34a;margin-bottom:4px;font-weight:600">답변 완료</div>
            <p style="font-size:12px;color:#374151">${esc(r.response_text)}</p>
          </div>` : r.response_status === 'pending' ? `<div style="font-size:11px;color:#f59e0b;padding:4px 8px;background:#fffbeb;border-radius:6px;display:inline-block">💬 답변 대기중</div>` : ''}
        </div>`;
      }).join('')}
    </div>

    ${totalPages > 1 ? `
    <div style="display:flex;justify-content:center;gap:6px;margin-top:16px">
      ${Array.from({length: Math.min(totalPages, 10)}, (_, i) => i+1).map(p => 
        `<button class="rv-page-btn" data-page="${p}" style="padding:6px 12px;border:1px solid ${p===rvState.page?'#0f766e':'#d1d5db'};border-radius:6px;background:${p===rvState.page?'#0f766e':'#fff'};color:${p===rvState.page?'#fff':'#374151'};font-size:12px;cursor:pointer">${p}</button>`
      ).join('')}
    </div>` : ''}`}
  `;

  // 필터 이벤트
  ['rvFltPlatform','rvFltSentiment','rvFltStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      rvState.filters.platform = document.getElementById('rvFltPlatform').value;
      rvState.filters.sentiment = document.getElementById('rvFltSentiment').value;
      rvState.filters.status = document.getElementById('rvFltStatus').value;
      rvState.page = 1;
      renderRvList(el);
    });
  });

  // 페이징
  el.querySelectorAll('.rv-page-btn').forEach(b => b.addEventListener('click', () => {
    rvState.page = parseInt(b.dataset.page);
    renderRvList(el);
  }));

  // 리뷰 추가
  document.getElementById('addReviewBtn')?.addEventListener('click', () => showAddReviewModal(el));

  // 리뷰 액션
  el.querySelectorAll('.rv-action-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    const review = reviews.find(r => r.id === id);
    if (review) showReviewActionModal(review, el);
  }));
}

function showAddReviewModal(el) {
  showModal('리뷰 등록', `
    <div style="display:grid;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="mod-label-sm">플랫폼 *</label>
          <select id="rvPlatform" class="form-input" class="input-outline">
            ${Object.entries(platformInfo).map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="mod-label-sm">별점</label>
          <select id="rvRating" class="form-input" class="input-outline">
            <option value="5">★★★★★ (5점)</option>
            <option value="4">★★★★☆ (4점)</option>
            <option value="3">★★★☆☆ (3점)</option>
            <option value="2">★★☆☆☆ (2점)</option>
            <option value="1">★☆☆☆☆ (1점)</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="mod-label-sm">작성자</label>
          <input id="rvName" class="form-input" placeholder="닉네임 또는 이름" class="input-outline">
        </div>
        <div class="form-group">
          <label class="mod-label-sm">날짜</label>
          <input id="rvDate" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}" class="input-outline">
        </div>
      </div>
      <div class="form-group">
        <label class="mod-label-sm">리뷰 내용 *</label>
        <textarea id="rvText" class="form-input" rows="4" placeholder="리뷰 내용을 복사하여 붙여넣기 해주세요" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;resize:vertical;font-family:inherit"></textarea>
      </div>
      <div class="form-group">
        <label class="mod-label-sm">리뷰 URL</label>
        <input id="rvUrl" class="form-input" placeholder="https://..." class="input-outline">
      </div>
      <div class="form-group">
        <label class="mod-label-sm">태그 (쉼표 구분)</label>
        <input id="rvTags" class="form-input" placeholder="친절, 임플란트, 교정" class="input-outline">
      </div>
      <button id="saveReviewBtn" style="padding:12px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;width:100%">리뷰 등록</button>
    </div>
  `);

  document.getElementById('saveReviewBtn')?.addEventListener('click', async () => {
    const review_text = document.getElementById('rvText').value.trim();
    if (!review_text) { toast('리뷰 내용을 입력해주세요', 'error'); return; }
    try {
      const res = await api('/api/protected/review-mgmt', { method: 'POST', json: {
        platform: document.getElementById('rvPlatform').value,
        rating: parseInt(document.getElementById('rvRating').value),
        reviewer_name: document.getElementById('rvName').value.trim(),
        review_text,
        review_date: document.getElementById('rvDate').value,
        review_url: document.getElementById('rvUrl').value.trim(),
        tags: document.getElementById('rvTags').value.trim(),
      }});
      const sLabel = sentimentInfo[res.sentiment]?.label || '분석중';
      toast(`리뷰 등록 완료 (감성: ${sLabel})`, 'success');
      closeModal();
      rvState.page = 1;
      await renderRvList(el);
    } catch(e) { toast(e.message, 'error'); }
  });
}

function showReviewActionModal(review, el) {
  const sInfo = sentimentInfo[review.sentiment] || sentimentInfo.neutral;
  showModal('리뷰 상세', `
    <div style="padding:4px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="color:#fbbf24;font-size:16px">${'★'.repeat(review.rating||0)}</span>
        <span style="font-size:14px;font-weight:600">${esc(review.reviewer_name)}</span>
        <span style="padding:2px 8px;background:${sInfo.bg};color:${sInfo.color};border-radius:10px;font-size:11px">${sInfo.icon} ${sInfo.label}</span>
      </div>
      <div style="padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:12px">
        <p style="font-size:13px;line-height:1.6">${esc(review.review_text)}</p>
      </div>
      <div style="display:grid;gap:10px">
        <div class="form-group">
          <label class="mod-label-sm">답변 작성</label>
          <textarea id="rvResponse" rows="3" placeholder="답변 내용을 입력하세요..." style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;resize:vertical;font-family:inherit">${esc(review.response_text || '')}</textarea>
        </div>
        <div style="display:flex;gap:8px">
          <select id="rvSentimentEdit" style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:12px">
            <option value="positive" ${review.sentiment==='positive'?'selected':''}>😊 긍정</option>
            <option value="neutral" ${review.sentiment==='neutral'?'selected':''}>😐 중립</option>
            <option value="negative" ${review.sentiment==='negative'?'selected':''}>😠 부정</option>
          </select>
          <button id="pinReviewBtn" style="padding:8px 14px;border:1px solid #d1d5db;border-radius:8px;background:${review.is_pinned?'#fef3c7':'#fff'};font-size:12px;cursor:pointer">${review.is_pinned ? '📌 고정 해제' : '📌 고정'}</button>
        </div>
        <div style="display:flex;gap:8px">
          <button id="updateReviewBtn" style="flex:1;padding:10px;background:#0f766e;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">저장</button>
          <button id="deleteReviewBtn" style="padding:10px 16px;background:#fef2f2;color:#ef4444;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">삭제</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('updateReviewBtn')?.addEventListener('click', async () => {
    try {
      const response_text = document.getElementById('rvResponse').value.trim();
      await api('/api/protected/review-mgmt/' + review.id, { method: 'PUT', json: {
        response_text,
        response_status: response_text ? 'completed' : 'pending',
        sentiment: document.getElementById('rvSentimentEdit').value,
      }});
      toast('저장 완료', 'success');
      closeModal();
      await renderRvList(el);
    } catch(e) { toast(e.message, 'error'); }
  });

  document.getElementById('pinReviewBtn')?.addEventListener('click', async () => {
    try {
      await api('/api/protected/review-mgmt/' + review.id, { method: 'PUT', json: { is_pinned: !review.is_pinned } });
      toast(review.is_pinned ? '고정 해제' : '고정됨', 'success');
      closeModal();
      await renderRvList(el);
    } catch(e) { toast(e.message, 'error'); }
  });

  document.getElementById('deleteReviewBtn')?.addEventListener('click', async () => {
    if (!confirm('이 리뷰를 삭제할까요?')) return;
    try {
      await api('/api/protected/review-mgmt/' + review.id, { method: 'DELETE' });
      toast('삭제 완료', 'success');
      closeModal();
      await renderRvList(el);
    } catch(e) { toast(e.message, 'error'); }
  });
}

window.PFM.modules.reviewMgmt = { renderReviewMgmt };
})();
