
const CACHE_NAME = 'parkiq-core-v7';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/types.ts',
  '/App.tsx',
  '/manifest.json',
  '/components/MapView.tsx',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://raw.githubusercontent.com/google/material-design-icons/master/png/maps/local_parking/materialicons/512dp/2x/baseline_local_parking_black_48dp.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual add for each asset to avoid complete failure if one 404s
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
  const url = event.request.url;
  
  if (
    OFFLINE_ASSETS.some(asset => url.includes(asset)) || 
    url.includes('esm.sh') || 
    url.includes('openstreetmap.org')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => null);
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
