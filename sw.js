// Service worker de la Pizarra Táctica (Academia LR).
// Estrategia: network-first. Con conexión, SIEMPRE se pide la versión más nueva al
// servidor (y de paso se actualiza la caché); solo si no hay conexión se usa lo último
// que quedó guardado. Así, cuando subís cambios a GitHub, se ven apenas los abrís de
// nuevo con internet, sin tener que recargar dos veces ni borrar caché a mano.

const CACHE_NAME = 'pizarra-lr-v2'; // subir este número en cada actualización futura obliga a limpiar la caché vieja
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
    fetch(req, {cache: 'no-store'})
      .then((resp) => {
        // con conexión: usamos la respuesta fresca del servidor, y de paso la guardamos
        // para el día que no haya internet
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return resp;
      })
      .catch(() => caches.match(req)) // sin conexión: lo último que quedó guardado
  );
});
