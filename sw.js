/* Service Worker: Grundgeruest wird sofort gecacht, die Bilder auf Wunsch (Nachricht "download").
   Wird von tools/build-sw.py aus sw.template.js erzeugt. */
const VERSION = '00efc6d610';
const CACHE = 'notsan-' + VERSION;
const SHELL = ["./", "index.html", "anleitung.html", "algorithmen.html", "p-algorithmen.html", "medikamente.html", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
const IMAGES = ["img/algorithmen/BA.webp?v=add16d85", "img/algorithmen/K1.webp?v=577b6099", "img/algorithmen/K10.webp?v=6865484d", "img/algorithmen/K11.webp?v=5eb04939", "img/algorithmen/K12.webp?v=7c84e2b3", "img/algorithmen/K13.webp?v=c49141cd", "img/algorithmen/K14.webp?v=8cd1fae9", "img/algorithmen/K15.webp?v=f9445827", "img/algorithmen/K16.webp?v=1756b768", "img/algorithmen/K16a.webp?v=f06f6e1c", "img/algorithmen/K16b.webp?v=ab6cfeff", "img/algorithmen/K16c.webp?v=346eb50e", "img/algorithmen/K17.webp?v=4555b904", "img/algorithmen/K18.webp?v=10db3d94", "img/algorithmen/K19.webp?v=0fbc1adc", "img/algorithmen/K2.webp?v=2a5765cd", "img/algorithmen/K3.webp?v=c6aca725", "img/algorithmen/K4.webp?v=0453930a", "img/algorithmen/K5.webp?v=d9f654d5", "img/algorithmen/K6.webp?v=353ad984", "img/algorithmen/K7.webp?v=826a6724", "img/algorithmen/K8.webp?v=259ee618", "img/algorithmen/K9.webp?v=b6a80fe6", "img/medikamente/M1.webp?v=dc04dc41", "img/medikamente/M10.webp?v=b648e103", "img/medikamente/M10A.webp?v=7eb6a6bd", "img/medikamente/M11.webp?v=a567c33b", "img/medikamente/M12.webp?v=864fc081", "img/medikamente/M13.webp?v=56cbb1c1", "img/medikamente/M14.webp?v=c66ad33b", "img/medikamente/M15.webp?v=d4772d19", "img/medikamente/M16.webp?v=a3de1b93", "img/medikamente/M17.webp?v=40d68132", "img/medikamente/M17A.webp?v=03a00f76", "img/medikamente/M18.webp?v=913d9901", "img/medikamente/M18A.webp?v=d05dcfeb", "img/medikamente/M19.webp?v=43f0f5c6", "img/medikamente/M2.webp?v=d74abdc5", "img/medikamente/M20.webp?v=b35aee21", "img/medikamente/M20A.webp?v=f2323db3", "img/medikamente/M21.webp?v=3beb7c80", "img/medikamente/M21A.webp?v=9ac9c5a0", "img/medikamente/M22.webp?v=81d71f1c", "img/medikamente/M23.webp?v=6304a38a", "img/medikamente/M24.webp?v=1e3d8775", "img/medikamente/M25.webp?v=76bc9679", "img/medikamente/M26.webp?v=75889684", "img/medikamente/M27.webp?v=ca688253", "img/medikamente/M28.webp?v=006ddcb3", "img/medikamente/M3.webp?v=c97f2e3f", "img/medikamente/M4.webp?v=df176f91", "img/medikamente/M5.webp?v=e91068a8", "img/medikamente/M6.webp?v=c8c130e0", "img/medikamente/M7.webp?v=442db451", "img/medikamente/M8.webp?v=999819be", "img/medikamente/M9.webp?v=63d0acd8", "img/medikamente/M9A.webp?v=9ec15149", "img/p-algorithmen/P1.webp?v=476e0b92", "img/p-algorithmen/P2.webp?v=dcf57e9a", "img/p-algorithmen/P3.webp?v=26629183", "img/p-algorithmen/P4.webp?v=8ad5ba76", "img/p-algorithmen/P5.webp?v=070b4bcf"];
const BYTES = 6230920;
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
