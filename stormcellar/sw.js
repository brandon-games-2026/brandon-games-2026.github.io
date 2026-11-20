// STORMCELLAR service worker: precache everything on install, serve cache-first, work fully offline.
const CACHE = 'stormcellar-9ebdcb8e8168';
const FILES = ["./","assets/bag-BKlyGfOV.js","assets/index-CyNIUkwz.css","assets/index-l_2vdyGF.js","assets/nwr-D9QRek84.js","assets/pack-comms-CvS1v-9Z.js","assets/pack-food-NjGVdHy6.js","assets/pack-grow-DvdX_Olm.js","assets/pack-med-DydUQTZv.js","assets/pack-nuke-BC3h8zlm.js","assets/pack-plan-CsUlvssH.js","assets/pack-repair-B4LSQVWK.js","assets/pack-san-B-u5fA1e.js","assets/pack-secure-Birxg7iB.js","assets/pack-water-DtIvxOJx.js","assets/pack-week-Bbr49MX6.js","assets/page-6B5362fk.js","assets/rolldown-runtime-DK3Fl9T5.js","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.webmanifest"];
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
// Optional map packs (pmtiles, places, fonts, and the lazy map code) live in 'sc-maps', also saved on purpose.
const MCACHE = 'sc-maps';
async function videoResponse(req, cacheName = VCACHE) {
  const url = req.url.split('#')[0].split('?')[0];
  const c = await caches.open(cacheName);
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
  const path = new URL(req.url).pathname;
  if (path.includes('/videos/')) { e.respondWith(videoResponse(req)); return; }
  if (path.includes('/maps/')) { e.respondWith(videoResponse(req, MCACHE)); return; }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      return (await c.match('./index.html', { ignoreVary: true })) || (await c.match('./')) || fetch(req);
    }
    const hit = await c.match(req, { ignoreSearch: true, ignoreVary: true }) || await (await caches.open(MCACHE)).match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('', { status: 504 }); }
  })());
});
