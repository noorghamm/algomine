// Offline cache for AlgoMine. Bump VERSION when files change.
const VERSION = 'algomine-v3';
const CORE = ['./', './index.html', './style.css', './app.js', './icon.svg', './manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches
          .open(VERSION)
          .then(cache => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
  );
});
