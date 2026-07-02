/* Boot loader hide — 앱 렌더 완료 시 스켈레톤 제거 (v5.7: CSP 대응 외부화) */
(function(){
  var hide = function() {
    var el = document.getElementById('boot-loader');
    if (el) { el.classList.add('hide'); setTimeout(function(){ el.remove(); }, 400); }
  };
  var appEl = document.getElementById('app');
  if (appEl) {
    var observer = new MutationObserver(function(){
      if (document.querySelector('#app > *')) { hide(); observer.disconnect(); }
    });
    observer.observe(appEl, { childList: true });
  }
  // Safety fallback: hide after 8s regardless
  setTimeout(hide, 8000);
})();
