(function(){
  const token = window.location.pathname.split('/survey/')[1];
  if (!token) { showStatus('error', '잘못된 링크입니다'); return; }
  const app = document.getElementById('surveyApp');
  const progressFill = document.getElementById('progressFill');
  let surveyData = null;
  let answers = {};
  let totalRequired = 0;

  async function load() {
    try {
      const r = await fetch('/api/survey/' + token);
      const d = await r.json();
      if (!r.ok) { showStatus(d.completed?'done':d.expired?'expired':'error', d.error); return; }
      surveyData = d;
      renderSurvey();
    } catch(e) { showStatus('error', '설문을 불러올 수 없습니다'); }
  }

  function showStatus(type, msg) {
    progressFill.style.width = type==='done'||type==='success'?'100%':'0%';
    const icons = {done:'\u2705',expired:'\u23F0',success:'\uD83C\uDF89',error:'\uD83D\uDE22'};
    const titles = {done:'\uC774\uBBF8 \uC751\uB2F5 \uC644\uB8CC',expired:'\uC124\uBB38 \uAE30\uAC04 \uB9CC\uB8CC',success:'\uAC10\uC0AC\uD569\uB2C8\uB2E4!',error:'\uC624\uB958'};
    const descs = {done:'\uC18C\uC911\uD55C \uC758\uACAC \uAC10\uC0AC\uD569\uB2C8\uB2E4!',expired:msg||'',success:'\uC18C\uC911\uD55C \uC758\uACAC\uC774 \uBCD1\uC6D0 \uC11C\uBE44\uC2A4 \uAC1C\uC120\uC5D0\n\uD070 \uB3C4\uC6C0\uC774 \uB429\uB2C8\uB2E4.',error:msg||''};
    app.innerHTML = '<div class="survey-card status-page '+type+'"><span class="status-icon">'+(icons[type]||'')+'</span><h2>'+esc(titles[type]||'')+'</h2><p style="white-space:pre-line">'+esc(descs[type]||'')+'</p></div><div class="footer">Patient Funnel Manager</div>';
    if (type === 'success') showConfetti();
  }

  function showConfetti() {
    const colors = ['#22c55e','#14b8a6','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
    const container = document.createElement('div');
    container.className = 'confetti';
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('span');
      s.style.cssText = 'left:'+Math.random()*100+'%;background:'+colors[i%colors.length]+';animation-delay:'+Math.random()*1.5+'s;animation-duration:'+(2+Math.random()*2)+'s;width:'+(6+Math.random()*6)+'px;height:'+(6+Math.random()*6)+'px';
      container.appendChild(s);
    }
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4000);
  }

  function esc(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c)); }

  function updateProgress() {
    if (!totalRequired) return;
    const answered = Object.keys(answers).filter(k => {
      const q = surveyData.questions.find(q2 => q2.id === k);
      return q && q.type !== 'text';
    }).length;
    progressFill.style.width = Math.round(answered / totalRequired * 100) + '%';
  }

  function renderSurvey() {
    const d = surveyData;
    totalRequired = (d.questions||[]).filter(q => q.type !== 'text').length;
    const nameStr = d.patientName ? d.patientName + '\uB2D8' : '';

    app.innerHTML = '<div class="survey-header">'
      +'<div class="hospital-badge">\uD83C\uDFE5 '+esc(d.hospitalName)+'</div>'
      +'<h1>'+esc(d.title)+'</h1>'
      +(d.description ? '<div class="desc">'+esc(d.description)+'</div>' : '')
      +(nameStr ? '<div class="patient-greeting">'+esc(nameStr)+', \uC124\uBB38\uC5D0 \uCC38\uC5EC\uD574 \uC8FC\uC154\uC11C \uAC10\uC0AC\uD569\uB2C8\uB2E4</div>' : '')
      +'</div>'
      +'<div id="questions"></div>'
      +'<div class="submit-area"><button class="submit-btn" id="submitBtn" disabled>\uC124\uBB38 \uC81C\uCD9C\uD558\uAE30 <span class="arrow">\u2192</span></button></div>'
      +'<div class="footer">Powered by Patient Funnel Manager</div>';

    const qEl = document.getElementById('questions');
    (d.questions || []).forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'survey-card';
      card.style.animationDelay = (idx * 0.06) + 's';
      card.innerHTML = renderQuestion(q, idx);
      qEl.appendChild(card);
      bindQuestion(card, q);
    });

    document.getElementById('submitBtn').addEventListener('click', submitSurvey);
    checkRequired();
  }

  const ratingLabels = ['','\uBCC4\uB85C\uC608\uC694','\uBD80\uC871\uD574\uC694','\uBCF4\uD1B5\uC774\uC5D0\uC694','\uB9CC\uC871\uD574\uC694','\uB9E4\uC6B0 \uB9CC\uC871!'];
  const npsFeedbacks = ['\uD83D\uDE1E \uC544\uC27D\uB124\uC694...','\uD83D\uDE1E','\uD83D\uDE1E','\uD83D\uDE10','\uD83D\uDE10','\uD83D\uDE42','\uD83D\uDE42','\uD83D\uDE04','\uD83D\uDE04','\uD83E\uDD29 \uACE0\uB9C8\uC6CC\uC694!','\uD83E\uDD29 \uCD5C\uACE0\uC608\uC694!'];

  function renderQuestion(q, idx) {
    const isRequired = q.type !== 'text';
    let html = '<div class="q-label"><span class="question-number">'+(idx+1)+'</span><span class="q-label-text">'+esc(q.label)+(isRequired?'<span class="q-required"></span>':'')+'</span></div>';

    switch(q.type) {
      case 'nps':
        html += '<div class="q-sub" style="padding-left:32px">0: \uC804\uD600 \uCD94\uCC9C\uD558\uC9C0 \uC54A\uC74C ~ 10: \uB9E4\uC6B0 \uC801\uADF9 \uCD94\uCC9C</div>';
        html += '<div class="nps-grid">'+Array.from({length:11},(_,i)=>'<button class="nps-btn" data-val="'+i+'">'+i+'</button>').join('')+'</div>';
        html += '<div class="nps-labels"><span>\uC804\uD600 \uC544\uB2D8</span><span>\uB9E4\uC6B0 \uCD94\uCC9C</span></div>';
        html += '<div class="nps-feedback" id="npsFeedback"></div>';
        break;
      case 'rating':
        html += '<div class="rating-stars">'+[1,2,3,4,5].map(i=>'<span class="star-btn" data-val="'+i+'">\u2B50</span>').join('')+'</div>';
        html += '<div class="rating-text" id="ratingText_'+q.id+'"></div>';
        break;
      case 'choice':
        if (q.multiple) html += '<div class="choice-hint">\uBCF5\uC218 \uC120\uD0DD \uAC00\uB2A5</div>';
        html += '<div class="choice-list">'+(q.options||[]).map(o=>'<button class="choice-btn" data-val="'+esc(o)+'"><span class="check">\u2713</span><span>'+esc(o)+'</span></button>').join('')+'</div>';
        break;
      case 'text':
        html += '<textarea class="text-input" placeholder="\uC790\uC720\uB86D\uAC8C \uC758\uACAC\uC744 \uC791\uC131\uD574\uC8FC\uC138\uC694" data-qid="'+q.id+'" maxlength="500"></textarea>';
        html += '<div class="text-count"><span id="tc_'+q.id+'">0</span>/500</div>';
        break;
    }
    return html;
  }

  function bindQuestion(card, q) {
    if (q.type === 'nps') {
      card.querySelectorAll('.nps-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('.nps-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const v = parseInt(btn.dataset.val);
          answers[q.id] = v;
          const fb = document.getElementById('npsFeedback');
          if (fb) { fb.textContent = npsFeedbacks[v] || ''; fb.style.color = v >= 9 ? 'var(--green)' : v >= 7 ? 'var(--yellow)' : 'var(--red)'; }
          checkRequired(); updateProgress();
        });
      });
    } else if (q.type === 'rating') {
      card.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.dataset.val);
          answers[q.id] = val;
          card.querySelectorAll('.star-btn').forEach((b,i) => b.classList.toggle('active', i < val));
          const rt = document.getElementById('ratingText_'+q.id);
          if (rt) { rt.textContent = ratingLabels[val] || ''; rt.style.color = val >= 4 ? 'var(--teal)' : val >= 3 ? 'var(--gray600)' : 'var(--red)'; }
          checkRequired(); updateProgress();
        });
      });
    } else if (q.type === 'choice') {
      card.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (q.multiple) {
            btn.classList.toggle('selected');
            const selected = Array.from(card.querySelectorAll('.choice-btn.selected')).map(b=>b.dataset.val);
            answers[q.id] = selected.length ? selected : undefined;
          } else {
            card.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            answers[q.id] = btn.dataset.val;
          }
          checkRequired(); updateProgress();
        });
      });
    } else if (q.type === 'text') {
      const ta = card.querySelector('.text-input');
      ta.addEventListener('input', () => {
        answers[q.id] = ta.value;
        const tc = document.getElementById('tc_'+q.id);
        if (tc) tc.textContent = ta.value.length;
        checkRequired();
      });
    }
  }

  function checkRequired() {
    const required = (surveyData.questions || []).filter(q => q.type !== 'text');
    const allAnswered = required.every(q => answers[q.id] !== undefined);
    document.getElementById('submitBtn').disabled = !allAnswered;
  }

  async function submitSurvey() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;display:inline-block"></span>\uC81C\uCD9C\uC911...</span>';
    try {
      const r = await fetch('/api/survey/' + token + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '\uC81C\uCD9C \uC2E4\uD328');
      showStatus('success');
    } catch(e) {
      btn.disabled = false;
      btn.innerHTML = '\uC124\uBB38 \uC81C\uCD9C\uD558\uAE30 <span class="arrow">\u2192</span>';
      alert(e.message);
    }
  }

  load();
})();
