
const CACHE_NAME = 'parkiq-v9-stable';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Parking_icon.svg/512px-Parking_icon.svg.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        OFFLINE_ASSETS.map(asset => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // For .tsx and .ts files, always try network first to avoid the "Unexpected token <" caching issue
  if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For core assets and CDNs, use cache-first
  if (
    OFFLINE_ASSETS.some(asset => event.request.url.includes(asset)) || 
    event.request.url.includes('esm.sh') || 
    event.request.url.includes('unpkg.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        });
      })
    );
  } else {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
