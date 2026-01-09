
const CACHE_NAME = 'parkiq-core-v8';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/manifest.json',
  '/components/MapView.tsx',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Parking_icon.svg/512px-Parking_icon.svg.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use individual add to ensure the cache is as full as possible even if one link breaks
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
  
  // Cache-First for core assets and common CDNs
  if (
    OFFLINE_ASSETS.some(asset => url.includes(asset)) || 
    url.includes('esm.sh') || 
    url.includes('unpkg.com') ||
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
    // Network-First for everything else
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
