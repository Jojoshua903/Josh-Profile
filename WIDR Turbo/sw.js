// WIDR Turbo offline support. The game files are network-first (so a new upload shows up straight away when online) with the
// cached copy as a fallback; three.js from the CDN is cache-first. Firebase (online races, rankings) always goes to the network.
const CACHE = 'widr-turbo-v1';
const THREE_URL = 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
const FILES = ['./', 'index.html', 'characters.js', 'pad.html', 'favicon.svg', 'icon.svg', 'icon-maskable.svg', 'manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(FILES.map(f => c.add(new Request(f, {cache: 'reload'})).catch(() => {})));
    try { await c.add(new Request(THREE_URL, {mode: 'cors'})); } catch (err) {}
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.href === THREE_URL){
    e.respondWith(caches.match(THREE_URL).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(THREE_URL, copy)); return res; })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      // query strings (?track=, ?app=) are ignored for the cache key so share links work offline too
      if (res.ok) c.put(req.mode === 'navigate' ? 'index.html' : url.pathname.split('/').pop() || 'index.html', res.clone());
      return res;
    } catch (err) {
      return (await c.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
    }
  })());
});
