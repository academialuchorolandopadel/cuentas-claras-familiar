/* Service worker mínimo.
   Estrategia elegida a propósito: RED PRIMERO para la navegación.
   Motivo: que tu familia nunca quede pegada a una versión vieja de la app
   cuando vos subís una actualización al repo. Si no hay conexión, cae al
   caché para que igual abra. Los íconos y fuentes se sirven desde caché. */
const CACHE = "cuentas-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navegación (abrir la app) → red primero, caché de respaldo
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put("./index.html", res.clone()));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Resto (íconos, fuentes) → caché primero, y si no, red
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (req.url.startsWith(self.location.origin) || req.url.includes("gstatic"))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
