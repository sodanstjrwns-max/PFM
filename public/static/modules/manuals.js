/* ═══════════════════════════════════════════════════════════════════
 * 📖 우리 병원 매뉴얼 (구 PF 지식베이스 대체)
 *
 * 예전 지식베이스는 "카드를 손으로 쓰는" 도구였다. 이건 반대다.
 * 이미 갖고 있는 매뉴얼 파일을 올리면 AI가 그걸 학습해 답변 근거로 쓴다.
 *
 * ⚠️ PDF 처리 위치에 대한 메모 (이거 서버로 옮기려다 두 번 실패했다)
 *   PDF 파서를 Cloudflare Workers 번들에 넣으면 vite 빌드가 240초 넘겨 죽는다.
 *   그래서 PDF만 여기 브라우저에서 pdf.js 로 텍스트를 뽑아 서버로 보낸다.
 *   docx / md / txt 는 서버가 처리한다 (fflate, 6ms).
 *   pdf.js 는 CDN이 아니라 /static/vendor 에 자가호스팅한다 —
 *   CSP 가 default-src 'self' 라 CDN worker 스크립트는 어차피 차단된다.
 * ═══════════════════════════════════════════════════════════════════ */
(function () {
  const { api, apiForm, esc, showModal, closeModal, toast, canManage } = window.PFM;

  let _state = {
    q: '',
    category: '',
    items: [],
    stats: { manuals: 0, chunks: 0, chars: 0, ai_on: 0 },
    categories: {},
    // 업로드 대기열: [{file, title, category, status, text, error}]
    queue: [],
    uploading: false,
  };

  const CAT_FALLBACK = {
    consultation: { label: '상담', icon: '💬' },
    clinical: { label: '진료', icon: '🦷' },
    reception: { label: '데스크/응대', icon: '🛎️' },
    sterilization: { label: '소독/감염관리', icon: '🧴' },
    insurance: { label: '보험/청구', icon: '📋' },
    marketing: { label: '마케팅', icon: '📈' },
    hr: { label: '인사/교육', icon: '👥' },
    emergency: { label: '응급대응', icon: '🚨' },
    policy: { label: '원내 규정', icon: '🏥' },
    other: { label: '기타', icon: '📁' },
  };

  /* ═══ pdf.js 지연 로딩 ═══
   * 1.7MB 짜리를 첫 화면에서 받게 하면 안 된다. PDF를 실제로 올릴 때만 로드. */
  let _pdfjs = null;
  async function loadPdfJs() {
    if (_pdfjs) return _pdfjs;
    const mod = await import('/static/vendor/pdf.min.mjs');
    mod.GlobalWorkerOptions.workerSrc = '/static/vendor/pdf.worker.min.mjs';
    _pdfjs = mod;
    return mod;
  }

  /** 브라우저에서 PDF → 텍스트. 한글은 cMap 이 있어야 깨지지 않는다. */
  async function extractPdfText(file, onProgress) {
    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({
      data: buf,
      cMapUrl: '/static/vendor/cmaps/',
      cMapPacked: true,
      // 폰트 렌더링은 필요 없다 — 텍스트만 뽑는다
      disableFontFace: true,
      isEvalSupported: false,
    }).promise;

    const lines = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      // PDF는 줄 개념이 없고 조각(item)만 있다. y좌표가 바뀌면 줄바꿈으로 본다.
      let lastY = null;
      let cur = '';
      for (const it of tc.items) {
        const y = it.transform ? Math.round(it.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          if (cur.trim()) lines.push(cur.trim());
          cur = '';
        }
        cur += it.str;
        if (it.hasEOL) { if (cur.trim()) lines.push(cur.trim()); cur = ''; }
        lastY = y;
      }
      if (cur.trim()) lines.push(cur.trim());
      page.cleanup();
      if (onProgress) onProgress(p, doc.numPages);
    }
    doc.destroy();
    return lines.join('\n');
  }

  /* ═══ 메인 렌더 ═══ */
  async function renderManuals(body, actions) {
    const mgr = canManage && canManage();
    actions.innerHTML = mgr ? `
      <button class="btn btn-primary btn-sm" data-act="PFMManuals.openUpload()">
        <i class="fas fa-cloud-upload-alt"></i> 매뉴얼 업로드
      </button>` : '';

    body.innerHTML = `
      <div style="padding:20px;max-width:1280px;margin:0 auto">
        <section id="manuals-hero" style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%);color:#fff;padding:20px 24px;border-radius:14px;margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="margin:0;font-size:22px;font-weight:700">📖 우리 병원 매뉴얼</h2>
              <div style="margin-top:6px;font-size:13px;opacity:.9">
                매뉴얼을 올려두면 AI가 그 내용을 근거로 답변합니다 — 일반론 대신 <strong>우리 병원 방식</strong>으로
              </div>
            </div>
            <div id="manualStats" style="display:flex;gap:16px;font-size:13px"></div>
          </div>
        </section>

        <section id="manuals-filter" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:14px">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:240px;position:relative">
              <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8"></i>
              <input id="manualSearch" type="text" placeholder="매뉴얼 제목/설명 검색"
                style="width:100%;padding:10px 12px 10px 36px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"
                data-act-key-enter="PFMManuals.search()" />
            </div>
            <button class="btn btn-secondary btn-sm" data-act="PFMManuals.openAsk()">
              <i class="fas fa-magnifying-glass-chart"></i> 매뉴얼에 물어보기
            </button>
          </div>
          <div id="manualCatTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"></div>
        </section>

        <section id="manualList"></section>
      </div>`;

    await loadAndRender();
  }

  async function loadAndRender() {
    const list = document.getElementById('manualList');
    if (list) list.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">불러오는 중…</div>';
    try {
      const qs = new URLSearchParams();
      if (_state.q) qs.set('q', _state.q);
      if (_state.category) qs.set('category', _state.category);
      const r = await api('/api/protected/manuals?' + qs.toString());
      _state.items = r.data || [];
      _state.stats = r.stats || _state.stats;
      _state.categories = r.categories || CAT_FALLBACK;
    } catch (e) {
      if (list) list.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">불러오지 못했습니다: ${esc(e.message)}</div>`;
      return;
    }
    renderStats();
    renderCatTabs();
    renderList();
  }

  function renderStats() {
    const el = document.getElementById('manualStats');
    if (!el) return;
    const s = _state.stats;
    const kb = Math.round((s.chars || 0) / 1000);
    el.innerHTML = `
      <div><strong style="font-size:19px">${s.manuals || 0}</strong> <span style="opacity:.85">권</span></div>
      <div><strong style="font-size:19px">${s.chunks || 0}</strong> <span style="opacity:.85">학습 조각</span></div>
      <div><strong style="font-size:19px">${kb.toLocaleString()}K</strong> <span style="opacity:.85">글자</span></div>`;
  }

  function renderCatTabs() {
    const el = document.getElementById('manualCatTabs');
    if (!el) return;
    const cats = _state.categories || CAT_FALLBACK;
    const counts = {};
    for (const m of _state.items) counts[m.category] = (counts[m.category] || 0) + 1;
    const btn = (key, label, icon, active) =>
      `<button class="btn btn-sm ${active ? 'btn-primary' : 'btn-default'}" data-act="PFMManuals.setCategory('${key}')">${icon} ${esc(label)}</button>`;
    el.innerHTML = btn('', '전체', '📚', !_state.category) +
      Object.entries(cats).map(([k, v]) =>
        btn(k, v.label + (counts[k] ? ` ${counts[k]}` : ''), v.icon, _state.category === k)).join('');
  }

  function renderList() {
    const el = document.getElementById('manualList');
    if (!el) return;
    if (!_state.items.length) {
      const mgr = canManage && canManage();
      el.innerHTML = `
        <div style="background:#fff;border:2px dashed #cbd5e1;border-radius:14px;padding:56px 24px;text-align:center">
          <div style="font-size:46px;margin-bottom:12px">📤</div>
          <h3 style="margin:0 0 8px;font-size:17px;color:#0f172a">아직 등록된 매뉴얼이 없습니다</h3>
          <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.7">
            신환 응대 매뉴얼, 상담 스크립트, 소독 프로토콜…<br>
            이미 쓰고 계신 문서를 올려두면 AI가 그 기준으로 답변합니다.<br>
            <span style="font-size:12px;color:#94a3b8">지원 형식: .docx · .pdf · .md · .txt (최대 15MB)</span>
          </p>
          ${mgr ? '<button class="btn btn-primary" data-act="PFMManuals.openUpload()"><i class="fas fa-cloud-upload-alt"></i> 첫 매뉴얼 올리기</button>'
                : '<div style="font-size:13px;color:#94a3b8">업로드는 관리자/실장만 가능합니다</div>'}
        </div>`;
      return;
    }

    const cats = _state.categories || CAT_FALLBACK;
    const mgr = canManage && canManage();
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">` +
      _state.items.map((m) => {
        const cat = cats[m.category] || CAT_FALLBACK.other;
        const sizeKB = Math.round((m.file_size || 0) / 1024);
        const aiOn = m.ai_enabled ? 1 : 0;
        return `
        <article class="manual-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="font-size:12px;color:#475569;background:#f1f5f9;padding:3px 9px;border-radius:20px">${cat.icon} ${esc(cat.label)}</div>
            <div style="font-size:11px;padding:3px 8px;border-radius:20px;${aiOn
              ? 'background:#dcfce7;color:#166534'
              : 'background:#f1f5f9;color:#94a3b8'}">${aiOn ? '🤖 AI 학습중' : '⏸ AI 제외'}</div>
          </div>
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;line-height:1.45">${esc(m.title)}</h3>
          ${m.description ? `<p style="margin:0;font-size:12.5px;color:#64748b;line-height:1.6">${esc(m.description)}</p>` : ''}
          <div style="font-size:11.5px;color:#94a3b8;display:flex;gap:10px;flex-wrap:wrap">
            <span>📄 ${esc((m.file_type || '').toUpperCase())}</span>
            <span>🧩 ${m.chunk_count || 0}조각</span>
            <span>✍️ ${(m.char_count || 0).toLocaleString()}자</span>
            ${sizeKB ? `<span>💾 ${sizeKB}KB</span>` : ''}
          </div>
          <div style="font-size:11.5px;color:#94a3b8">
            ${esc(m.uploaded_by_name || '알 수 없음')} · ${String(m.created_at || '').slice(0, 10)}
          </div>
          <div style="display:flex;gap:6px;margin-top:auto;padding-top:8px;flex-wrap:wrap">
            <button class="btn btn-sm btn-default" data-act="PFMManuals.openDetail('${m.id}')">
              <i class="fas fa-eye"></i> 내용보기
            </button>
            ${mgr ? `
              <button class="btn btn-sm btn-default" data-act="PFMManuals.toggleAI('${m.id}',${aiOn ? 0 : 1})">
                ${aiOn ? '⏸ AI 제외' : '🤖 AI 포함'}
              </button>
              <button class="btn btn-sm btn-danger" data-act="PFMManuals.remove('${m.id}')">
                <i class="fas fa-trash"></i>
              </button>` : ''}
          </div>
        </article>`;
      }).join('') + '</div>';
  }

  /* ═══ 업로드 모달 ═══ */
  function openUpload() {
    const cats = _state.categories || CAT_FALLBACK;
    showModal('📤 매뉴얼 업로드', `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div id="manualDrop" style="border:2px dashed #93c5fd;background:#eff6ff;border-radius:12px;padding:30px 20px;text-align:center;cursor:pointer"
             data-act="PFMManuals.pickFile()">
          <div style="font-size:38px;margin-bottom:8px">📎</div>
          <div style="font-size:14px;color:#1e40af;font-weight:600">파일을 여기로 끌어놓거나 클릭해서 선택</div>
          <div style="font-size:12px;color:#64748b;margin-top:6px">.docx · .pdf · .md · .txt (최대 15MB, 여러 개 가능)</div>
        </div>
        <input type="file" id="manualFileInput" accept=".docx,.pdf,.md,.txt" multiple style="display:none" />

        <div id="manualQueue"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:12px;color:#475569;display:block;margin-bottom:4px">카테고리 (일괄 적용)</label>
            <select id="manualCatSelect" class="form-input" style="width:100%">
              ${Object.entries(cats).map(([k, v]) => `<option value="${k}"${k === 'other' ? ' selected' : ''}>${v.icon} ${esc(v.label)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:#475569;display:block;margin-bottom:4px">설명 (선택)</label>
            <input type="text" id="manualDesc" class="form-input" style="width:100%" placeholder="예: 2026년 개정판" maxlength="200" />
          </div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400e;line-height:1.6">
          💡 <strong>스캔 이미지 PDF는 텍스트가 없어 인식되지 않습니다.</strong>
          텍스트가 선택되는 PDF인지 확인해주세요. 워드(.docx)가 가장 정확합니다.
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-default" data-act="PFM.closeModal()">취소</button>
          <button class="btn btn-primary" id="manualUploadBtn" data-act="PFMManuals.doUpload()" disabled>
            <i class="fas fa-cloud-upload-alt"></i> 업로드 & 학습
          </button>
        </div>
      </div>
    `);

    _state.queue = [];
    setTimeout(() => {
      const input = document.getElementById('manualFileInput');
      const drop = document.getElementById('manualDrop');
      if (input) input.addEventListener('change', (e) => addFiles(e.target.files));
      if (drop) {
        drop.addEventListener('dragover', (e) => {
          e.preventDefault();
          drop.style.background = '#dbeafe';
        });
        drop.addEventListener('dragleave', () => { drop.style.background = '#eff6ff'; });
        drop.addEventListener('drop', (e) => {
          e.preventDefault();
          drop.style.background = '#eff6ff';
          addFiles(e.dataTransfer.files);
        });
      }
    }, 50);
  }

  function pickFile() {
    const el = document.getElementById('manualFileInput');
    if (el) el.click();
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const f of files) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!['docx', 'pdf', 'md', 'txt'].includes(ext)) {
        toast(`${f.name}: 지원하지 않는 형식입니다`, 'error');
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast(`${f.name}: 15MB를 초과합니다`, 'error');
        continue;
      }
      if (_state.queue.some((q) => q.file.name === f.name && q.file.size === f.size)) continue;
      _state.queue.push({
        file: f, ext,
        title: f.name.replace(/\.[^.]+$/, ''),
        status: 'ready', text: '', error: '',
      });
    }
    renderQueue();
  }

  function renderQueue() {
    const el = document.getElementById('manualQueue');
    if (!el) return;
    const btn = document.getElementById('manualUploadBtn');
    if (btn) btn.disabled = _state.queue.length === 0 || _state.uploading;

    if (!_state.queue.length) { el.innerHTML = ''; return; }
    el.innerHTML = _state.queue.map((q, i) => {
      const badge = {
        ready: '<span style="color:#64748b">대기</span>',
        parsing: '<span style="color:#2563eb">텍스트 추출중…</span>',
        uploading: '<span style="color:#2563eb">업로드중…</span>',
        done: '<span style="color:#16a34a">✅ 완료</span>',
        error: `<span style="color:#ef4444">❌ ${esc(q.error || '실패')}</span>`,
      }[q.status] || '';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px">
          <span style="font-size:18px">${q.ext === 'pdf' ? '📕' : q.ext === 'docx' ? '📘' : '📄'}</span>
          <div style="flex:1;min-width:0">
            <input type="text" value="${esc(q.title)}" data-qidx="${i}" class="manual-title-input"
              style="width:100%;border:none;background:transparent;font-size:13.5px;font-weight:600;color:#0f172a;padding:0" />
            <div style="font-size:11px;color:#94a3b8">${Math.round(q.file.size / 1024)}KB · ${badge}</div>
          </div>
          ${q.status === 'ready' ? `<button class="btn btn-sm btn-default" data-act="PFMManuals.removeFromQueue(${i})">✕</button>` : ''}
        </div>`;
    }).join('');

    // 제목 편집 반영
    el.querySelectorAll('.manual-title-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.qidx, 10);
        if (_state.queue[idx]) _state.queue[idx].title = e.target.value;
      });
    });
  }

  function removeFromQueue(i) {
    _state.queue.splice(i, 1);
    renderQueue();
  }

  async function doUpload() {
    if (_state.uploading || !_state.queue.length) return;
    _state.uploading = true;
    const category = document.getElementById('manualCatSelect')?.value || 'other';
    const description = document.getElementById('manualDesc')?.value || '';
    let ok = 0, fail = 0;

    for (const q of _state.queue) {
      if (q.status === 'done') continue;
      try {
        // PDF만 브라우저에서 먼저 텍스트를 뽑는다
        if (q.ext === 'pdf') {
          q.status = 'parsing'; renderQueue();
          q.text = await extractPdfText(q.file, (p, total) => {
            q.error = ''; // 진행 표기는 생략 — 페이지 수가 많아도 배지가 요동치지 않게
          });
          if (!q.text.trim()) throw new Error('텍스트가 없는 PDF입니다 (스캔본?)');
        }
        q.status = 'uploading'; renderQueue();

        const fd = new FormData();
        fd.append('file', q.file);
        fd.append('title', q.title || q.file.name);
        fd.append('category', category);
        fd.append('description', description);
        if (q.ext === 'pdf') fd.append('extracted_text', q.text);

        await apiForm('/api/protected/manuals/upload', fd);
        q.status = 'done'; ok++;
      } catch (e) {
        q.status = 'error';
        q.error = e.message || '실패';
        fail++;
      }
      renderQueue();
    }

    _state.uploading = false;
    renderQueue();
    if (ok) toast(`${ok}개 매뉴얼을 학습시켰습니다`, 'success');
    if (fail) toast(`${fail}개 실패 — 목록에서 사유를 확인하세요`, 'error');
    if (ok && !fail) { closeModal(); await loadAndRender(); }
    else if (ok) await loadAndRender();
  }

  /* ═══ 상세 ═══ */
  async function openDetail(id) {
    try {
      const m = await api('/api/protected/manuals/' + id);
      const cats = _state.categories || CAT_FALLBACK;
      const cat = cats[m.category] || CAT_FALLBACK.other;
      const headings = (m.chunks || []).filter((ch) => ch.heading).slice(0, 40);
      showModal(`${cat.icon} ${esc(m.title)}`, `
        <div style="display:flex;flex-direction:column;gap:14px;max-height:70vh">
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#64748b">
            <span>📄 ${esc((m.file_type || '').toUpperCase())}</span>
            <span>🧩 ${m.chunk_count || 0}조각</span>
            <span>✍️ ${(m.char_count || 0).toLocaleString()}자</span>
            <span>${m.ai_enabled ? '🤖 AI 학습중' : '⏸ AI 제외'}</span>
            ${m.r2_key ? `<a href="/api/protected/manuals/${m.id}/download" style="color:#2563eb">⬇️ 원본 받기</a>` : ''}
          </div>
          ${headings.length ? `
            <details>
              <summary style="cursor:pointer;font-size:13px;font-weight:600;color:#334155">목차 (${headings.length})</summary>
              <ul style="margin:8px 0 0;padding-left:20px;font-size:12.5px;color:#475569;line-height:1.8;max-height:180px;overflow:auto">
                ${headings.map((h) => `<li>${esc(h.heading)}</li>`).join('')}
              </ul>
            </details>` : ''}
          <div style="flex:1;overflow:auto;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px;white-space:pre-wrap;font-size:13px;line-height:1.8;color:#1e293b;max-height:44vh">${esc(m.content || '')}</div>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-default" data-act="PFM.closeModal()">닫기</button>
          </div>
        </div>`);
    } catch (e) { toast('불러오기 실패: ' + e.message, 'error'); }
  }

  /* ═══ 매뉴얼에 물어보기 (청크 검색) ═══ */
  function openAsk() {
    showModal('🔎 매뉴얼에 물어보기', `
      <div style="display:flex;flex-direction:column;gap:12px">
        <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">
          궁금한 상황을 입력하면 관련된 매뉴얼 대목을 찾아드립니다.<br>
          <span style="font-size:12px;color:#94a3b8">예: "노쇼 환자 응대", "임플란트 상담 순서", "소독기 점검 주기"</span>
        </p>
        <div style="display:flex;gap:8px">
          <input type="text" id="manualAskInput" class="form-input" style="flex:1" placeholder="상황을 입력하세요"
            data-act-key-enter="PFMManuals.doAsk()" />
          <button class="btn btn-primary" data-act="PFMManuals.doAsk()">찾기</button>
        </div>
        <div id="manualAskResult" style="max-height:50vh;overflow:auto"></div>
      </div>`);
    setTimeout(() => document.getElementById('manualAskInput')?.focus(), 80);
  }

  async function doAsk() {
    const q = (document.getElementById('manualAskInput')?.value || '').trim();
    const box = document.getElementById('manualAskResult');
    if (!q || !box) return;
    box.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8">찾는 중…</div>';
    try {
      const r = await api('/api/protected/manuals/_search/chunks?k=6&q=' + encodeURIComponent(q));
      if (!r.results?.length) {
        box.innerHTML = `<div style="padding:24px;text-align:center;color:#64748b;font-size:13px">
          관련 내용을 찾지 못했습니다.<br>
          <span style="font-size:12px;color:#94a3b8">해당 주제의 매뉴얼이 아직 올라오지 않았을 수 있습니다.</span>
        </div>`;
        return;
      }
      box.innerHTML = r.results.map((x) => `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px;margin-bottom:9px">
          <div style="font-size:12px;color:#2563eb;font-weight:600;margin-bottom:6px">
            📖 ${esc(x.manual_title || '')}${x.heading ? ' › ' + esc(x.heading) : ''}
          </div>
          <div style="font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap">${esc(x.snippet)}</div>
        </div>`).join('');
    } catch (e) {
      box.innerHTML = `<div style="padding:20px;color:#ef4444;font-size:13px">${esc(e.message)}</div>`;
    }
  }

  /* ═══ 관리 액션 ═══ */
  async function toggleAI(id, enable) {
    try {
      await api('/api/protected/manuals/' + id, { method: 'PUT', json: { ai_enabled: !!enable } });
      toast(enable ? 'AI 학습에 포함했습니다' : 'AI 학습에서 제외했습니다', 'success');
      await loadAndRender();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(id) {
    const m = _state.items.find((x) => x.id === id);
    if (!confirm(`"${m ? m.title : '이 매뉴얼'}"을(를) 삭제할까요?\n학습된 내용도 함께 사라집니다.`)) return;
    try {
      await api('/api/protected/manuals/' + id, { method: 'DELETE' });
      toast('삭제했습니다', 'success');
      await loadAndRender();
    } catch (e) { toast(e.message, 'error'); }
  }

  function setCategory(k) { _state.category = k; loadAndRender(); }
  function search() {
    const el = document.getElementById('manualSearch');
    if (el) { _state.q = el.value.trim(); loadAndRender(); }
  }

  window.PFMManuals = {
    openUpload, pickFile, removeFromQueue, doUpload,
    openDetail, openAsk, doAsk, toggleAI, remove,
    setCategory, search,
  };
  window.PFM.modules.manuals = { renderManuals };
})();
