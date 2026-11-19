// STORMCELLAR service worker: precache everything on install, serve cache-first, work fully offline.
const CACHE = 'stormcellar-7f7d304f1baf';
const FILES = ["./","assets/index-CZtbeHPQ.js","assets/index-Ds2YN7in.css","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.webmanifest"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  // Do not skipWaiting automatically: an update waits until the person taps "Update library" (never mid-card).
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('stormcellar-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      return (await c.match('./index.html', { ignoreVary: true })) || (await c.match('./')) || fetch(req);
    }
    const hit = await c.match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('', { status: 504 }); }
  })());
});
