/* ═══════════════════════════════════════════════════════════════
   Spatial Interactions v4.2
   - Number Flow (카운트업 애니메이션)
   - 3D Tilt (마우스 따라 기울기)
   ───────────────────────────────────────────────────────────────
   전역 함수 제공:
     PFM.numberFlow(el, targetValue, options)
     PFM.bindTilt(container)
     PFM.applyBentoAnimations(container)   // 한 번에 numberFlow + tilt 적용
   ═══════════════════════════════════════════════════════════════ */

(function(PFM) {
  'use strict';

  if (!PFM) return;

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia && window.matchMedia('(hover: none)').matches;

  /* ═══ 1. Easing 함수 ═══ */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /* ═══ 2. 숫자 포맷터 (억/만원 단위 + 쉼표) ═══ */
  function formatNumber(n, fmt) {
    n = Math.round(n);
    if (fmt === 'money_kr') {
      if (n >= 100000000) {
        const eok = n / 100000000;
        return (eok >= 10 ? eok.toFixed(0) : eok.toFixed(1).replace(/\.0$/, '')) + '억';
      }
      if (n >= 10000) return (n / 10000).toFixed(0) + '만';
      return n.toLocaleString('ko-KR');
    }
    if (fmt === 'money_won') {
      return n.toLocaleString('ko-KR');
    }
    if (fmt === 'percent') {
      return n.toFixed(0) + '%';
    }
    return n.toLocaleString('ko-KR');
  }

  /* ═══ 3. Number Flow · 카운트업 ═══ */
  function numberFlow(el, target, opts) {
    if (!el) return;
    opts = opts || {};
    const duration = opts.duration || 1400;
    const format = opts.format || 'default';
    const suffix = opts.suffix || '';
    const prefix = opts.prefix || '';

    // 모션 감소 사용자: 즉시 표시
    if (prefersReducedMotion) {
      el.textContent = prefix + formatNumber(target, format) + suffix;
      return;
    }

    const start = parseFloat(el.dataset.currentValue || '0') || 0;
    const startTime = performance.now();
    el.classList.add('num-flow', 'animating');

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(t);
      const current = start + (target - start) * eased;
      el.textContent = prefix + formatNumber(current, format) + suffix;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.dataset.currentValue = target;
        setTimeout(() => el.classList.remove('animating'), 300);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ═══ 4. IntersectionObserver 기반 자동 트리거 ═══ */
  const flowObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseFloat(el.dataset.flowTarget);
            const format = el.dataset.flowFormat || 'default';
            const suffix = el.dataset.flowSuffix || '';
            const prefix = el.dataset.flowPrefix || '';
            const delay = parseInt(el.dataset.flowDelay || '0', 10);
            if (!isNaN(target)) {
              setTimeout(() => numberFlow(el, target, { format, suffix, prefix }), delay);
            }
            flowObserver.unobserve(el);
          }
        });
      }, { threshold: 0.2 })
    : null;

  function scanAndAnimate(container) {
    container = container || document;
    const targets = container.querySelectorAll('[data-flow-target]:not([data-flow-done])');
    targets.forEach((el, idx) => {
      el.dataset.flowDone = '1';
      el.dataset.currentValue = '0';
      // Stagger 적용 (인접 카드 순서대로)
      if (!el.dataset.flowDelay) {
        el.dataset.flowDelay = String(idx * 80);
      }
      // 초기값 표시
      const prefix = el.dataset.flowPrefix || '';
      const suffix = el.dataset.flowSuffix || '';
      const format = el.dataset.flowFormat || 'default';
      el.textContent = prefix + formatNumber(0, format) + suffix;

      if (flowObserver) {
        flowObserver.observe(el);
      } else {
        // IO 미지원 → 즉시 애니
        const target = parseFloat(el.dataset.flowTarget);
        if (!isNaN(target)) numberFlow(el, target, { format, suffix, prefix });
      }
    });
  }

  /* ═══ 5. 3D Tilt 인터랙션 ═══ */
  const MAX_TILT_DEG = 7;

  function bindTilt(container) {
    container = container || document;
    if (prefersReducedMotion || isTouchDevice) return;

    const tiles = container.querySelectorAll('.bento-tile:not([data-tilt-bound])');
    tiles.forEach(tile => {
      tile.dataset.tiltBound = '1';
      tile.classList.add('tilt-enabled');

      let rafId = null;
      let targetRX = 0, targetRY = 0, currentRX = 0, currentRY = 0;
      let targetX = 50, targetY = 50, currentX = 50, currentY = 50;

      function animate() {
        // 부드러운 보간 (lerp)
        currentRX += (targetRX - currentRX) * 0.18;
        currentRY += (targetRY - currentRY) * 0.18;
        currentX  += (targetX  - currentX)  * 0.25;
        currentY  += (targetY  - currentY)  * 0.25;

        tile.style.setProperty('--tilt-rx', currentRX.toFixed(2) + 'deg');
        tile.style.setProperty('--tilt-ry', currentRY.toFixed(2) + 'deg');
        tile.style.setProperty('--tilt-x', currentX.toFixed(1) + '%');
        tile.style.setProperty('--tilt-y', currentY.toFixed(1) + '%');

        // 움직임 임계치 넘지 않으면 RAF 종료
        const dist = Math.abs(targetRX - currentRX) + Math.abs(targetRY - currentRY);
        if (dist > 0.02) {
          rafId = requestAnimationFrame(animate);
        } else {
          rafId = null;
        }
      }

      function onMove(e) {
        const rect = tile.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1 ~ 1
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;   // -1 ~ 1
        targetRY =  x * MAX_TILT_DEG;
        targetRX = -y * MAX_TILT_DEG;
        targetX = ((e.clientX - rect.left) / rect.width) * 100;
        targetY = ((e.clientY - rect.top) / rect.height) * 100;
        if (!rafId) rafId = requestAnimationFrame(animate);
      }

      function onLeave() {
        targetRX = 0; targetRY = 0;
        targetX = 50; targetY = 50;
        if (!rafId) rafId = requestAnimationFrame(animate);
      }

      tile.addEventListener('mousemove', onMove);
      tile.addEventListener('mouseleave', onLeave);
    });
  }

  /* ═══ 6. 통합 적용 함수 ═══ */
  function applyBentoAnimations(container) {
    bindTilt(container);
    scanAndAnimate(container);
  }

  /* ═══ 7. PFM 네임스페이스에 노출 ═══ */
  PFM.numberFlow = numberFlow;
  PFM.bindTilt = bindTilt;
  PFM.scanAndAnimate = scanAndAnimate;
  PFM.applyBentoAnimations = applyBentoAnimations;
  PFM.formatFlowNumber = formatNumber;

  /* ═══ 8. 전역 MutationObserver (동적 삽입 카드 자동 감지) ═══ */
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((mutations) => {
      let scheduled = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches && (node.matches('.bento-tile') || node.querySelector('.bento-tile, [data-flow-target]'))) {
            if (!scheduled) {
              scheduled = true;
              requestAnimationFrame(() => {
                applyBentoAnimations(document.body);
              });
            }
            break;
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

})(window.PFM);
