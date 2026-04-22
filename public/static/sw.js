/**
 * Patient Funnel Manager - Service Worker
 * v4.2.2 Spatial Edition
 * 
 * - 기본 자산 오프라인 캐시
 * - Web Push 알림 수신
 * - 알림 클릭 시 해당 페이지로 이동
 */

const CACHE_VERSION = 'pfm-v4.2.9';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// 설치 시 핵심 자산 프리캐시 (오프라인 로그인 화면용)
const PRECACHE_URLS = [
  '/',
  '/static/style.css',
  '/static/dist/core.js',
  '/static/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((e) => console.warn('[SW] precache fail:', e))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/**
 * Fetch strategy:
 * - /api/* → Network-first (항상 최신 데이터)
 * - /static/* → Cache-first + background update
 * - 그 외 → Network-first with cache fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // API는 항상 네트워크 우선 (캐시 금지)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // JS 번들(/static/dist/*): 네트워크 우선 (배포 즉시 반영, 오프라인 시 캐시 폴백)
  if (url.pathname.startsWith('/static/dist/')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 그 외 정적 자산(CSS/이미지/폰트): 캐시 우선 (성능 최적화)
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML: 네트워크 우선, 실패시 캐시
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/')))
  );
});

// ═══════════════════════════════════════════════════
// Web Push 알림 수신
// ═══════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Patient Funnel Manager', body: event.data?.text() || '새 알림' };
  }
  const title = data.title || 'Patient Funnel Manager';
  const options = {
    body: data.body || '',
    icon: data.icon || '/static/icon-192.png',
    badge: '/static/icon-192.png',
    tag: data.tag || 'pfm-default',
    data: { url: data.url || '/', ...data.data },
    actions: data.actions || [],
    vibrate: [120, 60, 120],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// 메시지 수신 (앱에서 SW 제어)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
});
