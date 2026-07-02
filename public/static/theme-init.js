/* Theme init: light/dark/system — 깜빡임 방지 위해 head에서 동기 실행 (v5.7: CSP 대응 외부화) */
(function(){
  try {
    var t = localStorage.getItem('pfm_theme') || 'system';
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var applied = t === 'system' ? (prefersDark ? 'dark' : 'light') : t;
    document.documentElement.setAttribute('data-theme', applied);
    window.__pfmTheme = { pref: t, applied: applied };
  } catch(e) {}
})();
