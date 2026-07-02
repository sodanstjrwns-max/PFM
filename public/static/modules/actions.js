/* ═══ PFM Actions — CSP-safe 인라인 핸들러 대체 (v5.8) ═══
 *
 * 기존: <button onclick="PFM.closeModal()">  → CSP script-src-attr 'unsafe-inline' 필요
 * 변경: <button data-act="PFM.closeModal()"> → 이벤트 위임 + 미니 인터프리터 (eval/Function 미사용)
 *
 * 보안 설계:
 * - 임의 코드 실행 불가: 문자열/숫자 리터럴 + 등록된 루트 객체의 경로 호출만 허용
 * - 위험 API 차단: eval/fetch/XHR/WebSocket/location/innerHTML/setAttribute 등 deny-list
 * - 할당은 style.* / value / checked / textContent / display 만 허용
 * → 공격자가 data-act 속성을 주입해도 데이터 유출·코드 실행 불가
 */
(function() {
'use strict';

var DENY = { eval:1, Function:1, fetch:1, XMLHttpRequest:1, WebSocket:1, EventSource:1,
  importScripts:1, location:1, write:1, writeln:1, setTimeout:1, setInterval:1,
  sendBeacon:1, open:1, postMessage:1, cookie:1, innerHTML:1, outerHTML:1,
  insertAdjacentHTML:1, srcdoc:1, setAttribute:1, execCommand:1, constructor:1,
  __proto__:1, prototype:1, apply:1, call:1, bind:1, import:1 };

var ASSIGN_OK = { value:1, checked:1, display:1, textContent:1, background:1, color:1,
  transform:1, boxShadow:1, borderColor:1, opacity:1, visibility:1 };

/* ── 토크나이저 ── */
function tokenize(src) {
  var toks = [], i = 0, n = src.length;
  while (i < n) {
    var ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === "'") { // 문자열 리터럴 (이스케이프 \' 지원)
      var s = '', j = i + 1;
      while (j < n && src[j] !== "'") {
        if (src[j] === '\\' && j + 1 < n) { s += src[j+1]; j += 2; }
        else { s += src[j]; j++; }
      }
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (ch >= '0' && ch <= '9') {
      var num = '', k = i;
      while (k < n && /[0-9.]/.test(src[k])) { num += src[k]; k++; }
      toks.push({ t: 'num', v: parseFloat(num) }); i = k; continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      var id = '', m = i;
      while (m < n && /[A-Za-z0-9_$]/.test(src[m])) { id += src[m]; m++; }
      toks.push({ t: 'id', v: id }); i = m; continue;
    }
    if (src.substr(i, 2) === '?.') { toks.push({ t: '?.' }); i += 2; continue; }
    if (src.substr(i, 2) === '=>') { toks.push({ t: '=>' }); i += 2; continue; }
    if ('.(),;={}'.indexOf(ch) >= 0) { toks.push({ t: ch }); i++; continue; }
    throw new Error('bad char: ' + ch);
  }
  return toks;
}

/* ── 파서/평가기 (재귀 하강) ── */
function Evaluator(toks, el, ev) {
  this.toks = toks; this.p = 0; this.el = el; this.ev = ev;
}
Evaluator.prototype = {
  peek: function() { return this.toks[this.p] || { t: 'eof' }; },
  next: function() { return this.toks[this.p++] || { t: 'eof' }; },
  expect: function(t) { var tok = this.next(); if (tok.t !== t) throw new Error('expected ' + t); return tok; },

  run: function() { // stmt (; stmt)*
    while (this.peek().t !== 'eof') {
      this.statement();
      if (this.peek().t === ';') this.next();
      else break;
    }
  },

  statement: function() { this.expression(); },

  // expression := primary chain*  [ = expression ]
  expression: function() {
    var ref = this.primary(); // { obj, key } 또는 { val }
    for (;;) {
      var tok = this.peek();
      if (tok.t === '.' || tok.t === '?.') {
        this.next();
        var name = this.expect('id').v;
        if (DENY[name]) throw new Error('denied: ' + name);
        var base = this.deref(ref);
        if (tok.t === '?.' && (base === null || base === undefined)) { ref = { val: undefined, short: true }; this.skipChain(); break; }
        ref = { obj: base, key: name };
      } else if (tok.t === '(') {
        var args = this.args();
        if (ref.short) { ref = { val: undefined, short: true }; continue; }
        var fn, thisArg;
        if (ref.obj !== undefined) { fn = ref.obj == null ? undefined : ref.obj[ref.key]; thisArg = ref.obj; }
        else { fn = ref.val; thisArg = undefined; }
        if (ref.optCall && (fn === null || fn === undefined)) { ref = { val: undefined, short: true }; continue; }
        if (typeof fn !== 'function') throw new Error('not a function: ' + (ref.key || '?'));
        ref = { val: fn.apply(thisArg, args) };
      } else if (tok.t === '=') {
        this.next();
        var val = this.deref(this.expression());
        if (ref.obj === undefined || !ASSIGN_OK[ref.key]) throw new Error('assign denied: ' + ref.key);
        ref.obj[ref.key] = val;
        return { val: val };
      } else break;
      // ?.( 지원: `openPatientDetail?.(...)`
      if (this.peek().t === '?.' && this.toks[this.p + 1] && this.toks[this.p + 1].t === '(') {
        this.next(); ref.optCall = true;
      }
    }
    return ref;
  },

  skipChain: function() { // optional chaining 단락 시 나머지 체인 소비
    for (;;) {
      var t = this.peek().t;
      if (t === '.' || t === '?.') { this.next(); this.expect('id'); }
      else if (t === '(') { this.args(); }
      else break;
    }
  },

  primary: function() {
    var tok = this.next();
    if (tok.t === 'str' || tok.t === 'num') return { val: tok.v };
    if (tok.t === '(') { // ()=>{}  화살표 no-op
      this.expect(')'); this.expect('=>'); this.expect('{'); this.expect('}');
      return { val: function() {} };
    }
    if (tok.t === 'id') {
      var name = tok.v;
      if (name === 'this') return { val: this.el };
      if (name === 'event') return { val: this.ev };
      if (name === 'null') return { val: null };
      if (name === 'undefined') return { val: undefined };
      if (name === 'true') return { val: true };
      if (name === 'false') return { val: false };
      if (DENY[name]) throw new Error('denied: ' + name);
      if (name === 'document') return { val: document };
      if (name === 'window') return { val: window };
      if (name === 'localStorage') return { val: localStorage };
      // 전역 (PFM, PFMKnowledge, approveLeave …)
      return { obj: window, key: name };
    }
    throw new Error('unexpected: ' + tok.t);
  },

  args: function() {
    this.expect('(');
    var out = [];
    if (this.peek().t !== ')') {
      for (;;) {
        out.push(this.deref(this.expression()));
        if (this.peek().t === ',') { this.next(); continue; }
        break;
      }
    }
    this.expect(')');
    return out;
  },

  deref: function(ref) {
    if (ref.obj !== undefined) return ref.obj == null ? undefined : ref.obj[ref.key];
    return ref.val;
  },
};

function runAction(src, el, ev) {
  try {
    new Evaluator(tokenize(src), el, ev).run();
  } catch (e) {
    console.error('[pfm-act]', e.message, '—', src);
  }
}

/* ── 이벤트 위임 ── */
document.addEventListener('click', function(e) {
  var el = e.target.closest && e.target.closest('[data-act]');
  if (el) runAction(el.getAttribute('data-act'), el, e);
});

document.addEventListener('change', function(e) {
  var el = e.target.closest && e.target.closest('[data-act-change]');
  if (el) runAction(el.getAttribute('data-act-change'), el, e);
});

document.addEventListener('keyup', function(e) {
  if (e.key !== 'Enter') return;
  var el = e.target.closest && e.target.closest('[data-act-key-enter]');
  if (el) runAction(el.getAttribute('data-act-key-enter'), el, e);
});

// mouseenter/leave 는 버블되지 않으므로 over/out 에서 경계 판정으로 시뮬레이션
document.addEventListener('mouseover', function(e) {
  var el = e.target.closest && e.target.closest('[data-act-over]');
  if (el && !(el.contains(e.relatedTarget))) runAction(el.getAttribute('data-act-over'), el, e);
  var el2 = e.target.closest && e.target.closest('[data-act-menter]');
  if (el2 && !(el2.contains(e.relatedTarget))) runAction(el2.getAttribute('data-act-menter'), el2, e);
});
document.addEventListener('mouseout', function(e) {
  var el = e.target.closest && e.target.closest('[data-act-out]');
  if (el && !(el.contains(e.relatedTarget))) runAction(el.getAttribute('data-act-out'), el, e);
  var el2 = e.target.closest && e.target.closest('[data-act-mleave]');
  if (el2 && !(el2.contains(e.relatedTarget))) runAction(el2.getAttribute('data-act-mleave'), el2, e);
});

// 디버그/테스트용 노출 (actions.js가 app.js보다 먼저 로드되므로 전역에 직접)
window.__pfmRunAction = runAction;
if (window.PFM) window.PFM.runAction = runAction;
})();
