const cacheName = 'mahmoud-law-v4'; // غيّر الرقم مع كل تحديث
const assets = [
  'index.html',
  'logo.png',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/dexie@3.2.3/dist/dexie.js'
];

// تثبيت الـ SW وتخزين الملفات
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(assets))
      .then(() => self.skipWaiting())
  );
});

// تفعيل الـ SW وتنظيف الكاش القديم
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== cacheName).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// استراتيجية fetch ذكية
self.addEventListener('fetch', e => {
  // تجاهل طلبات Supabase وطلبات POST
  if (e.request.url.includes('supabase.co') || e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // إذا وجدنا الملف في الكاش، نعيده فوراً
      if (cachedResponse) {
        // ثم نحدث الكاش في الخلفية (اختياري)
        fetch(e.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(cacheName).then(cache => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // إذا لم يكن في الكاش، نحاول تحميله من الشبكة
      return fetch(e.request).then(networkResponse => {
        // نخزن النسخة الجديدة في الكاش
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(cacheName).then(cache => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // إذا فشل كل شيء (لا إنترنت ولا كاش)، نعيد صفحة index.html للملاحة
        if (e.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('index.html');
        }
        // يمكن إضافة fallback لصور أو أي موارد أخرى إذا أردت
      });
    })
  );
});
