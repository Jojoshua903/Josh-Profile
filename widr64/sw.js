/* WIDR 64 app helper: loads the menu from the internet when it can, and from a saved copy when you're offline */
const CACHE = "widr64-v1";
const FILES = ["./", "manifest.webmanifest", "icon.svg"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  /* only the menu's own files; games and Firebase always go straight to the internet */
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (!FILES.some(f => new URL(f, self.registration.scope).href === req.url) && req.mode !== "navigate") return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./")))
  );
});
