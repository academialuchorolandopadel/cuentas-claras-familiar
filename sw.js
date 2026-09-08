// Service worker de la Pizarra Táctica (Academia LR).
// Estrategia: cache-first para lo esencial de la app (arranca instantáneo y funciona sin
// conexión), con revalidación en segundo plano (stale-while-revalidate) para mantenerlo
// al día en cada visita con internet.

const CACHE_NAME = 'pizarra-lr-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './privacy.html',
  './icon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((resp) => {
          // solo cacheamos respuestas válidas del propio origen (evita cachear errores o CORS opacos raros)
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => cached); // sin conexión: si había algo en caché, listo; si no, se propaga el error

      // cache-first: si ya lo teníamos, lo servimos al toque y actualizamos atrás;
      // si no, esperamos la red (y de paso queda cacheado para la próxima)
      return cached || networkFetch;
    })
  );
});
