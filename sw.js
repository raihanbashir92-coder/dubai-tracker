// Offline support: the page is fetched fresh when online (so updates show
// straight away) and served from the cache when there's no signal.
var CACHE = 'dubai-tracker-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Pages: network first, cached copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
      return res;
    }).catch(function(){ return caches.match('./index.html'); }));
    return;
  }

  // Icons, manifest and Google Fonts: cache first, fill the cache as they load
  var sameOrigin = url.origin === self.location.origin;
  var fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;
  e.respondWith(caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(res){
      if (res.ok || res.type === 'opaque') {
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    });
  }));
});
