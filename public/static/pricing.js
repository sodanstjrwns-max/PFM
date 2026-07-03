/* v5.9 요금제 페이지: 월간/연간 토글 (CSP 준수 — 외부 스크립트) */
(function () {
  'use strict';
  var btnM = document.getElementById('btnMonthly');
  var btnY = document.getElementById('btnYearly');
  if (!btnM || !btnY) return;

  function setMode(yearly) {
    btnM.classList.toggle('active', !yearly);
    btnY.classList.toggle('active', yearly);
    document.querySelectorAll('.plan .price b').forEach(function (el) {
      var v = yearly ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
      if (v) el.textContent = v;
    });
    document.querySelectorAll('.plan .price-note').forEach(function (el) {
      el.textContent = yearly ? (el.getAttribute('data-yearly-note') || '') : '';
    });
  }
  btnM.addEventListener('click', function () { setMode(false); });
  btnY.addEventListener('click', function () { setMode(true); });
})();
