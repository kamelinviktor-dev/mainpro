/**
 * MainPro Jobs — offline cache for app shell.
 * Bump CACHE after changing precached files so clients refresh.
 */
const CACHE = "mainpro-jobs-v2-3";
const PRECACHE = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(PRECACHE);
      })
      .catch(function () {
        /* precache failed (offline build, 404) — app still works without SW */
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            if (k !== CACHE) {
              return caches.delete(k);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request)
        .then(function (res) {
          if (!res || res.status !== 200 || res.type === "error") {
            return res;
          }
          const copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            try {
              cache.put(e.request, copy);
            } catch (err) {
              /* ignore quota / opaque */
            }
          });
          return res;
        })
        .catch(function () {
          return caches.match("./index.html");
        });
    })
  );
});
