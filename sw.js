/* Timely offline shell — caches app assets; live practice data stays in-memory. */
const CACHE = 'timely-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './src/app/main.js',
  './src/app/screens.js',
  './src/app/console.js',
  './src/app/state.js',
  './src/app/notify.js',
  './src/app/pwa.js',
  './src/api/practiceApi.js',
  './src/mocks/practiceDay.js',
  './src/domain/types.js',
  './src/domain/triage.js',
  './src/domain/time.js',
  './src/domain/status.js',
  './src/domain/notifications.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() =>
      self.clients.claim(),
    ),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok && new URL(request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

/** Push preparation: show payload when a real push subscription is wired later. */
self.addEventListener('push', event => {
  let data = { title: 'Timely', body: 'You have an appointment update.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Timely', {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
