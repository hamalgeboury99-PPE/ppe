/* عامل الخدمة — التطبيق يعمل بلا إنترنت، ويلتقط التحديثات تلقائياً */
const CACHE = 'ppe-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                     // المزامنة POST تمر مباشرة
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // محرك القراءة من CDN يتولاه المتصفح

  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');

  if (isPage) {
    // الصفحة: الأحدث أولاً — فأي تحديث ترفعه يصل فوراً، والنسخة المخزنة احتياط عند انقطاع الشبكة
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then(h => h || caches.match('./')))
    );
    return;
  }
  // بقية الملفات: من المخزن أولاً
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
