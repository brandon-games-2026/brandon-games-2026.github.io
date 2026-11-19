// STORMCELLAR service worker: precache everything on install, serve cache-first, work fully offline.
const CACHE = 'stormcellar-bba76831fbc8';
const FILES = ["./","assets/index-H7kKUd7O.css","assets/index-YhuGoONb.js","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.webmanifest"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  // Do not skipWaiting automatically: an update waits until the person taps "Update library" (never mid-card).
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('stormcellar-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
// Optional videos live in their own cache ('sc-videos'), saved on purpose from the Videos page; never precached.
const VCACHE = 'sc-videos';
async function videoResponse(req) {
  const url = req.url.split('#')[0].split('?')[0];
  const c = await caches.open(VCACHE);
  const hit = await c.match(url, { ignoreVary: true });
  if (!hit) {
    try { return await fetch(req); } catch { return new Response('', { status: 504, statusText: 'Video not saved for offline' }); }
  }
  const range = req.headers.get('range');
  if (!range) return hit;
  // iOS Safari plays video only through Range requests: answer 206 with the requested slice of the saved file.
  const blob = await hit.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? Number(m[1]) : NaN, end = m && m[2] ? Number(m[2]) : NaN;
  if (isNaN(start)) { start = isNaN(end) ? 0 : Math.max(0, size - end); end = size - 1; }
  if (isNaN(end) || end >= size) end = size - 1;
  if (start >= size || start > end) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1, hit.headers.get('Content-Type') || 'video/mp4'), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': hit.headers.get('Content-Type') || 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.includes('/videos/')) { e.respondWith(videoResponse(req)); return; }
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
