// Service worker de la borne (publié dans jouer/sw.js, portée jouer/) : la borne s'ouvre et se joue SANS RÉSEAU.
// build2.py (write_sw) remplit BUILD (numéro de version du site, = site.json), ASSETS, PRE et FONT_CSS ci-dessous :
// un nouveau build = un nouveau fichier = nouveau service worker, qui remplace l'ancien cache (jdw-core-<build>).
//  - la page (navigation dans jouer/) : réseau d'abord avec un délai court (3,5 s ; 10 s pour une adresse ?v=<build> de mise à jour), puis le cache ;
//  - assets/ (images et musiques emballées) : cache d'abord (jdw-media, gardé d'un build à l'autre ; chaque fichier porte son empreinte
//    x-jdw-h : un fichier changé est retéléchargé, un fichier disparu est retiré du cache) ; musiques gardées à l'usage ;
//  - polices Google : cache d'abord (repli sur les polices du système si rien) ; icônes et manifeste : cache d'abord ;
//  - JAMAIS : Supabase (/rest, /auth, realtime), site.json, telecharger/version.json, MediaPipe… (le service worker ne s'en mêle pas).
'use strict';
const BUILD = '__BUILD__';
const ASSETS = __ASSETS__;            // { 'assets/ilo.bin': 'empreinte', 'assets/music/accueil-2.mp3': '…', … } (chemins depuis la racine du site)
const PRE = __PRE__;                  // assets gardés dès l'installation (images de Galaxy Wars, jingles, une musique de l'accueil)
const FONT_CSS = __FONT_CSS__;
const CORE = 'jdw-core-' + BUILD, MEDIA = 'jdw-media', FONTS = 'jdw-fonts';
const SCOPE = self.registration.scope;                 // https://…/jdv/jouer/
const ROOT = new URL('../', SCOPE).href;               // https://…/jdv/
const ROOT_PATH = new URL(ROOT).pathname;
const SHELL = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function putMedia(cache, rel, resp) {
  // copie de la réponse avec son empreinte (pour savoir plus tard si le fichier a changé)
  const blob = await resp.blob(), h = new Headers(resp.headers); h.set('x-jdw-h', ASSETS[rel] || '');
  const out = new Response(blob, { status: 200, statusText: 'OK', headers: h });
  await cache.put(ROOT + rel, out.clone());
  return out;
}
const fresh = (hit, rel) => !!hit && (!ASSETS[rel] || hit.headers.get('x-jdw-h') === ASSETS[rel]);
async function cacheAsset(rel) {
  const c = await caches.open(MEDIA);
  if (fresh(await c.match(ROOT + rel), rel)) return;
  const r = await fetch(ROOT + rel, { cache: 'no-cache' });
  if (r.ok) await putMedia(c, rel, r);
}
async function cacheFonts() {
  if (!FONT_CSS) return;
  const c = await caches.open(FONTS);
  const r = await fetch(FONT_CSS, { mode: 'cors', credentials: 'omit' });
  if (!r.ok) return;
  const css = await r.clone().text();
  await c.put(FONT_CSS, r);
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
  await Promise.all(urls.map(async u => { if (await c.match(u)) return; const f = await fetch(u, { mode: 'cors', credentials: 'omit' }); if (f.ok) await c.put(u, f); }));
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    // la page de CE build (?v= : contourne le cache de GitHub), rangée sous l'adresse de la borne
    const p = await fetch(SCOPE + '?v=' + encodeURIComponent(BUILD), { cache: 'reload' });
    if (!p.ok) throw new Error('page ' + p.status);
    await c.put(SCOPE, p);
    await Promise.allSettled(SHELL.map(async f => { const r = await fetch(ROOT + f, { cache: 'no-cache' }); if (r.ok) await c.put(ROOT + f, r); }));
    await Promise.allSettled([cacheFonts(), ...PRE.map(cacheAsset)]);
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // anciens builds : partis ; médias dont le fichier a changé ou n'existe plus : retirés
    for (const k of await caches.keys()) if (k.startsWith('jdw-core-') && k !== CORE) await caches.delete(k);
    try {
      const c = await caches.open(MEDIA);
      for (const req of await c.keys()) {
        const rel = req.url.startsWith(ROOT) ? req.url.slice(ROOT.length) : '';
        const hit = await c.match(req);
        if (!rel || !(rel in ASSETS) || !fresh(hit, rel)) await c.delete(req);
      }
    } catch (x) {}
    await self.clients.claim();
  })());
});

// la borne demande de garder quelques musiques (une par jeu) quand elle est au calme et en ligne
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.t === 'warm' && Array.isArray(d.list)) {
    e.waitUntil((async () => { for (const rel of d.list.slice(0, 40)) { if (typeof rel !== 'string' || !/^assets\/[a-z0-9/_.-]+$/.test(rel)) continue; try { await cacheAsset(rel); } catch (x) { return; } await sleep(150); } })());
  }
});

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b141c"><title>Pas de connexion</title><link rel="stylesheet" href="${FONT_CSS}"><style>
html,body{margin:0;height:100%;background:#0b141c;color:#e9f0f3;font:16px/1.45 'Chakra Petch',system-ui,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}
.orb{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#22394a,#111d27);box-shadow:0 0 0 2px #22394a,0 0 40px #ffa63033;font-size:42px}
h1{font:400 26px/1.15 Bungee,Impact,system-ui,sans-serif;letter-spacing:.02em;margin:22px 0 8px;color:#ffd34d;text-transform:uppercase}
p{margin:0 0 22px;color:#8aa0ae;max-width:320px}
button{font:400 17px Bungee,system-ui,sans-serif;color:#0b141c;background:#ffa630;border:0;border-radius:14px;padding:14px 30px;box-shadow:0 6px 0 #b86d10}
button:active{transform:translateY(3px);box-shadow:0 3px 0 #b86d10}
</style></head><body><main><div class="orb">📡</div><h1>Pas de connexion</h1>
<p>La borne a besoin d'internet la première fois. Vérifie le Wi-Fi ou les données mobiles, puis réessaie.</p>
<button onclick="location.reload()">Réessayer</button></main>
<script>addEventListener('online',()=>setTimeout(()=>location.reload(),800))</script></body></html>`;

async function page(e) {
  const u = new URL(e.request.url);
  const net = fetch(e.request).then(async r => {
    if (r && r.ok && r.type === 'basic') { const c = await caches.open(CORE); await c.put(SCOPE, r.clone()); }
    return r;
  });
  const wait = u.searchParams.has('v') ? 10000 : 3500;
  try {
    const r = await Promise.race([net, sleep(wait).then(() => null)]);
    if (r && (r.ok || r.status < 500)) return r;
  } catch (x) {}
  const hit = (await caches.match(SCOPE, { cacheName: CORE })) || (await caches.match(SCOPE));
  if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
  try { return await net; } catch (x) {}
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function asset(req, rel) {
  const c = await caches.open(MEDIA), hit = await c.match(ROOT + rel);
  if (fresh(hit, rel)) return hit;
  try {
    const r = await fetch(req);
    if (r.ok && r.status === 200) return await putMedia(c, rel, r);
    return hit || r;
  } catch (x) { if (hit) return hit; throw x; }
}
async function shell(req, key) {
  const hit = await caches.match(key);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) { const c = await caches.open(CORE); await c.put(key, r.clone()); }
  return r;
}
async function fonts(req) {
  const c = await caches.open(FONTS), css = req.url.startsWith('https://fonts.googleapis.com/');
  const hit = await c.match(req.url);
  if (hit) {
    if (css) fetch(req.url, { mode: 'cors', credentials: 'omit' }).then(r => r.ok && c.put(req.url, r)).catch(() => {});   // à jour pour la prochaine fois
    return hit;
  }
  try { const r = await fetch(req); if (r.ok && (r.type === 'cors' || r.type === 'basic')) await c.put(req.url, r.clone()); return r; }
  catch (x) { return css ? new Response('/* hors ligne : polices du système */', { headers: { 'Content-Type': 'text/css' } }) : Response.error(); }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (req.mode === 'navigate') { if (u.href.startsWith(SCOPE)) e.respondWith(page(e)); return; }
    if (!u.pathname.startsWith(ROOT_PATH)) return;
    const rel = decodeURIComponent(u.pathname.slice(ROOT_PATH.length));
    if ((/^assets\/[a-z0-9/_.-]+\.(bin|mp3)$/.test(rel) || /^assets\/pegase\/[a-z0-9_.-]+\.(jpg|webp|json)$/.test(rel)) && !u.search) { e.respondWith(asset(req, rel)); return; }   // pegase/ : affiches, carte, île 3D, decor.json
    if (SHELL.includes(rel)) { e.respondWith(shell(req, ROOT + rel)); return; }
    return;                                  // site.json, telecharger/version.json… : toujours le réseau
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(fonts(req));
  // tout le reste (Supabase : /rest, /auth, realtime ; jsDelivr ; …) : pas touché, jamais mis en cache
});
