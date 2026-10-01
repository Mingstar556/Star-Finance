/* Star Finance — service worker
   Network-first with offline cache fallback: the app always uses
   the freshest copy when online, and keeps working offline. */
const CACHE = "starfin-cache-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && new URL(req.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      if (cached) return cached;
      if (req.mode === "navigate") {
        const shell = await caches.match("./index.html");
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
