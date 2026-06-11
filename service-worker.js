const CACHE_NAME = 'fleetsys-cache-v5'; // ⚠️ مهم: قم بتغيير هذا الرقم (مثلاً إلى v3) في كل مرة تقوم فيها بتحديث الموقع
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// حدث التثبيت: تخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      // إجبار الـ Service Worker الجديد على التفعيل فوراً دون انتظار إغلاق التبويبات القديمة
      .then(() => self.skipWaiting()) 
  );
});

// حدث التفعيل: حذف أي كاش قديم من إصدارات سابقة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName); // حذف الكاش القديم
          }
        })
      );
    }).then(() => self.clients.claim()) // السيطرة على جميع الصفحات المفتوحة فوراً
  );
});

// حدث جلب البيانات: استراتيجية (الكاش أولاً، ثم الشبكة)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا كان الملف موجود في الكاش، ارجعه
        if (response) {
          return response;
        }
        // إذا لم يكن موجود، اجلبه من الشبكة
        return fetch(event.request).then(
          networkResponse => {
            // تحقق من صحة الاستجابة قبل تخزينها
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // تخزين النسخة الجلوبة من الشبكة في الكاش للاستخدام المستقبلي
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
  );
});