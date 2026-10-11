/* Service Worker: Grundgeruest wird sofort gecacht, die Bilder auf Wunsch (Nachricht "download").
   Wird von tools/build-sw.py aus sw.template.js erzeugt. */
const VERSION = '__VERSION__';
const CACHE = 'notsan-' + VERSION;
const SHELL = __SHELL__;
const IMAGES = __IMAGES__;
const BYTES = __BYTES__;
const SCOPE = self.registration.scope;
const abs = u => new URL(u, SCOPE).href;
const MARK = abs('__offline-optin');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(abs))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    let optin = false;
    const c = await caches.open(CACHE);
    for (const k of await caches.keys()) {
      if (!k.startsWith('notsan-') || k === CACHE) continue;
      const old = await caches.open(k);
      if (await old.match(MARK)) optin = true;
      // unveraenderte Bilder (gleicher Hash) uebernehmen statt neu laden
      for (const u of IMAGES) {
        const hit = await old.match(abs(u));
        if (hit && !(await c.match(abs(u)))) await c.put(abs(u), hit);
      }
      await caches.delete(k);
    }
    await self.clients.claim();
    if (optin) await downloadAll();
  })());
});

async function status() {
  const c = await caches.open(CACHE);
  let cached = 0;
  for (const u of IMAGES) if (await c.match(abs(u))) cached++;
  return { cached, total: IMAGES.length, bytes: BYTES, optin: !!(await c.match(MARK)), version: VERSION };
}

async function broadcast(msg) {
  for (const cl of await self.clients.matchAll({ includeUncontrolled: true })) cl.postMessage(msg);
}

let running = null;
function downloadAll() {
  if (running) return running;
  running = (async () => {
    const c = await caches.open(CACHE);
    await c.put(MARK, new Response('1'));
    const queue = [];
    let done = 0;
    for (const u of IMAGES) { if (await c.match(abs(u))) done++; else queue.push(u); }
    await broadcast({ type: 'progress', done, total: IMAGES.length });
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift();
        try {
          const r = await fetch(abs(u), { cache: 'reload' });
          if (r.ok) { await c.put(abs(u), r); done++; await broadcast({ type: 'progress', done, total: IMAGES.length }); }
        } catch (_) { /* offline: bleibt offen, Fortsetzen moeglich */ }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    await broadcast({ type: 'status', ...(await status()) });
  })().finally(() => { running = null; });
  return running;
}

async function clearOffline() {
  const c = await caches.open(CACHE);
  await c.delete(MARK);
  for (const u of IMAGES) await c.delete(abs(u));
  await broadcast({ type: 'status', ...(await status()) });
}

self.addEventListener('message', e => {
  const t = (e.data || {}).type;
  if (t === 'status') e.waitUntil(status().then(s => e.source && e.source.postMessage({ type: 'status', ...s })));
  else if (t === 'download') e.waitUntil(downloadAll());
  else if (t === 'clear') e.waitUntil(clearOffline());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(SCOPE)) return;
  const isImg = new URL(r.url).pathname.includes('/img/');
  e.respondWith(isImg ? cacheFirst(r) : staleWhileRevalidate(e, r));
});

async function cacheFirst(r) {
  const c = await caches.open(CACHE);
  const hit = await c.match(r, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(r);
  if (res.ok) c.put(r, res.clone());
  return res;
}

async function staleWhileRevalidate(e, r) {
  const c = await caches.open(CACHE);
  const hit = await c.match(r, { ignoreSearch: true });
  const net = fetch(r, { cache: 'no-cache' })
    .then(res => { if (res.ok) c.put(r, res.clone()); return res; })
    .catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || new Response('Offline und noch nicht geladen.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
