// Offline cache for the app. Bump the version here and APP_VERSION in emu.js whenever any file changes
// (semantic versioning: patch = fixes, minor = features, major = big changes).
var VERSION = 'cramboy-v0.7.0';
var FILES = ['./', './index.html', './tw.css', './app.css', './kv.js', './icons.js', './emu.js', './manifest.json', './icon-180.png', './icon-512.png', './icons/cheeselab-logo-512.png',
  './build/nds.js', './build/nds.wasm',
  './kr/ui.css', './kr/table.js', './kr/reader.js', './kr/lookup.js', './kr/ja-lookup.js', './kr/ui.js', './kr/dict.json'];
// Downloaded only when first needed (Japanese games), then kept for offline use.
var ON_DEMAND = ['kr/ja-dict.json'];

self.addEventListener('install', function (e) {
  // cache: 'reload' bypasses the browser's HTTP cache, and the ?v= query bypasses GitHub Pages' own
  // server cache (it keeps files for ~10 minutes, so quick releases could otherwise mix in an older
  // file). The file is stored under its plain name.
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      var url = f + (f.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(VERSION);
      var get = function () {
        return fetch(new Request(url, { cache: 'reload' })).then(function (r) { if (!r.ok) throw new Error(f + ' ' + r.status); return r; });
      };
      // One retry per file: on a phone a single dropped request shouldn't throw the whole update away.
      return get().catch(function () { return new Promise(function (ok) { setTimeout(ok, 1500); }).then(get); })
        .then(function (r) { return c.put(f, r); });
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    if (r) return r;
    return fetch(e.request).then(function (res) {
      var path = new URL(e.request.url).pathname;
      if (res.ok && ON_DEMAND.some(function (f) { return path.slice(-f.length) === f; })) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    });
  }));
});
