// =========================================================
// SERVICE WORKER — Offline cache (teklif.pro v2)
// =========================================================
const CACHE_NAME = 'teklif-pro-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/landing.html',
  '/signin.html',
  '/signup.html',
  '/view.html',
  '/styles.css',
  '/js/state.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/security.js',
  '/js/layout.js',
  '/js/helpers.js',
  '/js/dashboard.js',
  '/js/musteri.js',
  '/js/urun.js',
  '/js/toplu-urun.js',
  '/js/teklif.js',
  '/js/proforma.js',
  '/js/firma.js',
  '/js/tasarim.js',
  '/js/export.js',
  '/js/init.js',
  '/manifest.json'
];

// Install — statik dosyaları önbelleğe al
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — eski cache'leri temizle
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first, network fallback
self.addEventListener('fetch', e => {
  // Sadece kendi sitemizin GET isteklerine karış. CDN/PocketBase/font istekleri
  // tarayıcıya bırakılır (SW içinden fetch CSP connect-src'ye takılıyordu).
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Arka planda güncelle (stale-while-revalidate)
        fetch(e.request).then(res => {
          if (res && res.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, res));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => e.request.mode === 'navigate' ? caches.match('/index.html') : Response.error());
    })
  );
});
