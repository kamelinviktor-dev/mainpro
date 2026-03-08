/* MainPro Service Worker – Push, Notifications, Offline cache for JS modules
 * STABILITY LOCK: preserve push/message/notificationclick handlers.
 */

var CACHE_NAME = 'mainpro-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll([
        './',
        './index.html',
        './mainpro-storage-engine.js',
        './mainpro-event-logic.js',
        './mainpro-modal-controller.js',
        './mainpro-addtask-ui-v74.js',
        './mainpro-addtask-v74.js',
        './mainpro-app.js',
        './mainpro-taskmodal-v70.js',
        './mainpro-simple-docs.js',
        './mainpro-console-fix.js',
        './mainpro-base.css',
        './mainpro-addtask-v74.css',
        './manifest.json'
      ]).catch(function () {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
      })
    ])
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data.type === 'SHOW_NOTIFICATION' && event.data.title) {
    event.waitUntil(showNotification(event.data.title, event.data.options || {}));
  }
});

/** Smart Notifications: show local notification (used when app asks SW to show). */
function showNotification(title, options) {
  var opts = Object.assign({
    icon: '/manifest.json',
    badge: '/manifest.json',
    tag: options && options.tag || 'mainpro-' + Date.now(),
    requireInteraction: false
  }, options || {});
  return self.registration.showNotification(title, opts);
}

self.addEventListener('push', (event) => {
  var data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (_) {
    try { data = { title: event.data ? event.data.text() : 'MainPro' }; } catch (_) {}
  }
  var title = data.title || 'MainPro';
  var opts = { body: data.body || '', tag: data.tag || 'mainpro-push', icon: data.icon };
  event.waitUntil(showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length) clientList[0].focus();
      else if (self.clients.openWindow) self.clients.openWindow('/');
    })
  );
});

// Offline: serve cached JS/CSS/HTML when offline; otherwise network-first and cache on success
self.addEventListener('fetch', (event) => {
  var u = new URL(event.request.url);
  if (event.request.method !== 'GET' || u.origin !== self.location.origin) return;
  var path = u.pathname || '';
  var isStatic = /\.(js|css|json)$/.test(path) || path === '/' || path === '/index.html' || path.endsWith('/');
  if (!isStatic) return;
  event.respondWith(
    fetch(event.request).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { try { cache.put(event.request, clone); } catch (_) {} });
      }
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) { return cached || new Response('', { status: 503, statusText: 'Offline' }); });
    })
  );
});

