// Bumping this version string is what makes the browser notice this file
// changed at all and install a fresh service worker — do this on any future
// change to this file, even a small one.
const CACHE_NAME = 'wholesale-tracker-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/andrew-profile.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // Take over immediately rather than waiting for all tabs to close, so a
  // fresh deploy applies on next reload instead of needing every tab closed
  // first.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version first, and only
// fall back to the cached copy if the network request fails (offline, or
// the server is unreachable). This is the opposite of the previous
// cache-first-forever strategy, which kept serving an old deploy
// indefinitely once something was cached, with no way for a new deploy to
// ever "win" without the user manually clearing site data. Freshness matters
// far more than offline support for an app that already depends on a live
// connection for shared sync.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          return Response.error();
        });
      })
  );
});
