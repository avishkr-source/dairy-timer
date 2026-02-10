const CACHE_NAME = 'meat-dairy-timer-v1';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// ======= האזנה להודעות מהאפליקציה (מה שעובד עם app.js) =======
self.addEventListener('message', event => {
  const data = event.data;

  if (data?.type === 'TIMER_FINISHED') {
    self.registration.showNotification('⏰ הטיימר הסתיים!', {
      body: 'אתה חלבי עכשיו 🙂',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'meat-dairy-timer',
      renotify: true
    });
  }
});
