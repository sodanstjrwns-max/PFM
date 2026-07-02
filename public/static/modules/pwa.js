/**
 * PWA Module - 설치 프롬프트 + Service Worker 등록 + Web Push
 * v3.2 Retention Edition
 */

(function () {
  const { apiCall, showToast } = window.PFM = window.PFM || {};
  let deferredPrompt = null;

  // ═════════════════════════════════════════════
  // Service Worker 등록
  // ═════════════════════════════════════════════
  async function registerSW() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] SW registered:', reg.scope);
      return reg;
    } catch (e) {
      console.warn('[PWA] SW register failed:', e);
      return null;
    }
  }

  // ═════════════════════════════════════════════
  // 설치 프롬프트
  // ═════════════════════════════════════════════
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallBanner();
    showToast && showToast('🎉 홈 화면에 설치됐습니다!', 'success');
    localStorage.setItem('pfm_pwa_installed', '1');
  });

  function showInstallBanner() {
    // 사용자가 스킵했거나 이미 설치된 경우 스킵
    if (localStorage.getItem('pfm_pwa_skip') === '1') return;
    if (localStorage.getItem('pfm_pwa_installed') === '1') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // 로그인 후에만 표시 (v5.7: 토큰은 httpOnly 쿠키 — pfm_user로 로그인 상태 판단)
    if (!localStorage.getItem('pfm_user')) return;

    if (document.getElementById('pfmInstallBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'pfmInstallBanner';
    banner.className = 'pfm-install-banner';
    banner.innerHTML = `
      <div class="pfm-install-icon">📱</div>
      <div class="pfm-install-text">
        <strong>홈 화면에 설치하기</strong>
        <span>클릭 한 번으로 앱처럼 사용하세요 (2초만에 접속)</span>
      </div>
      <div class="pfm-install-actions">
        <button class="btn btn-sm btn-primary" id="pfmInstallYes">설치</button>
        <button class="btn btn-sm btn-ghost" id="pfmInstallNo">나중에</button>
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById('pfmInstallYes').onclick = async () => {
      if (!deferredPrompt) return hideInstallBanner();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pfm_pwa_installed', '1');
      }
      deferredPrompt = null;
      hideInstallBanner();
    };
    document.getElementById('pfmInstallNo').onclick = () => {
      localStorage.setItem('pfm_pwa_skip', '1');
      hideInstallBanner();
    };
  }

  function hideInstallBanner() {
    document.getElementById('pfmInstallBanner')?.remove();
  }

  // ═════════════════════════════════════════════
  // Web Push 구독 (브라우저 알림)
  // ═════════════════════════════════════════════
  async function enablePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast && showToast('이 브라우저는 알림을 지원하지 않습니다', 'error');
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      showToast && showToast('알림 권한이 거부되었습니다', 'warning');
      return false;
    }
    // VAPID 키 없이도 테스트용 로컬 알림 작동 가능
    // 프로덕션에서는 서버에서 VAPID_PUBLIC_KEY 받아서 subscribe
    try {
      const reg = await navigator.serviceWorker.ready;
      // VAPID 키가 있으면 사용, 없으면 로컬 알림만
      const vapidKey = window.PFM_VAPID_PUBLIC_KEY;
      if (vapidKey) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        const body = sub.toJSON();
        await apiCall('/push/subscribe', { method: 'POST', body });
        showToast && showToast('🔔 푸시 알림이 켜졌습니다', 'success');
      } else {
        // VAPID 없어도 로컬 알림은 동작
        showToast && showToast('🔔 브라우저 알림이 켜졌습니다 (로컬 알림만)', 'success');
        localStorage.setItem('pfm_push_local_enabled', '1');
      }
      return true;
    } catch (e) {
      console.error('[PWA] push subscribe failed:', e);
      showToast && showToast('알림 설정 실패: ' + (e.message || ''), 'error');
      return false;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  /** 로컬 알림 헬퍼 - 서비스워커 없이도 브라우저 알림 쏘기 */
  function localNotify(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            icon: '/static/icon-192.png',
            badge: '/static/icon-192.png',
            vibrate: [120, 60, 120],
            ...options,
          });
        });
      } else {
        new Notification(title, options);
      }
    } catch (e) { console.warn(e); }
  }

  // ═════════════════════════════════════════════
  // 일일 브리핑 자동 알림 (9시 리마인더)
  // ═════════════════════════════════════════════
  function setupDailyBriefingReminder() {
    if (Notification?.permission !== 'granted') return;
    // 매 분마다 체크 (9시 정각에 알림)
    const lastNotified = localStorage.getItem('pfm_last_briefing_notified') || '';
    const todayKey = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 10 && lastNotified !== todayKey) {
      localNotify('📊 일일 브리핑 준비됐어요', {
        body: '오늘의 리콜 대상자와 예약 현황을 확인하세요',
        tag: 'daily-briefing',
        data: { url: '/#dashboard' },
      });
      localStorage.setItem('pfm_last_briefing_notified', todayKey);
    }
  }

  // 초기화
  async function init() {
    await registerSW();
    setTimeout(() => {
      if (localStorage.getItem('pfm_user')) showInstallBanner();
    }, 3000);
    // 로그인 후 브리핑 리마인더
    setInterval(setupDailyBriefingReminder, 60 * 1000);
    setupDailyBriefingReminder();
  }

  // 전역 노출
  window.PFM_PWA = { enablePush, localNotify, showInstallBanner, registerSW };

  // 문서 준비되면 자동 실행
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
