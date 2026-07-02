/* 월간 보고서 자동 인쇄 (v5.7: CSP 대응 외부화) */
if (window.location.search.includes('autoprint')) {
  window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 500); });
}
