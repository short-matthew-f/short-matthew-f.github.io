// Gravity Well — sw.js
// Minimal, dependency-free service worker. It exists so the game installs and
// runs with no network at all; it is deliberately NOT a smart cache.
//
// Bump CACHE_VERSION whenever any shell file changes. That single change is the
// whole update mechanism: a new cache name is filled on install, the old ones
// are dropped on activate, and clients.claim() means the very next navigation is
// already served by the new worker.
//
// Strategy:
//   navigations + JS/CSS/manifest  network-first, cache fallback (updates land
//                                  promptly; offline still works)
//   icons                          cache-first (they never change without a
//                                  version bump)
//   everything else                network, falling back to whatever is cached
// Non-GET and cross-origin requests are ignored entirely.

var CACHE_VERSION = 1;
var CACHE_NAME = 'gw-v' + CACHE_VERSION;

var SHELL = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'render.js',
  'input.js',
  'sim.js',
  'levels.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll() is all-or-nothing; request each file so one missing optional
      // asset cannot wedge the whole install.
      return Promise.all(SHELL.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' }))['catch'](function () { /* skip */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME && key.indexOf('gw-v') === 0) return caches['delete'](key);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isIcon(url) {
  return url.pathname.indexOf('/icons/') !== -1;
}

function isCode(url) {
  return /\.(?:js|mjs|css|webmanifest|html)$/.test(url.pathname);
}

function putInCache(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  var copy = response.clone();
  caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
  return response;
}

function networkFirst(request) {
  return fetch(request)
    .then(function (response) { return putInCache(request, response); })
    ['catch'](function () {
      return caches.match(request).then(function (hit) {
        if (hit) return hit;
        // A navigation to any in-scope URL falls back to the app shell.
        if (request.mode === 'navigate') return caches.match('./');
        return Response.error();
      });
    });
}

function cacheFirst(request) {
  return caches.match(request).then(function (hit) {
    if (hit) return hit;
    return fetch(request).then(function (response) { return putInCache(request, response); });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || isCode(url)) {
    event.respondWith(networkFirst(request));
  } else if (isIcon(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(
      fetch(request)['catch'](function () {
        return caches.match(request).then(function (hit) { return hit || Response.error(); });
      })
    );
  }
});
