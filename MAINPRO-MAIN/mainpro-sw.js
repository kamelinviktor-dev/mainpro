/* MainPro Service Worker (minimal, no HTML caching)
 * Purpose:
 * - Avoid "Invalid scope ... base URL blob:" errors by using a real SW file.
 * - Keep updates simple and prevent stale HTML caching during development.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network passthrough (no caching). This avoids serving stale app bundles.
self.addEventListener('fetch', (event) => {
  // Let the browser handle it normally.
});

