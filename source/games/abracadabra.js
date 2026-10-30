(() => {
'use strict';
// Abracadabra — on appuie sur GO et on DIT des noms (« vache », « piano », « tonneau »…) : un éclair part du bâton magique et l'objet tombe
// dans le Grand Fleuve, en vrai objet 3D (physique). But : traverser le fleuve à plusieurs sur ce qui flotte et s'empile.
// La voix est reconnue SUR L'APPAREIL (Vosk, le même moteur et le même modèle français que les mots du hub de Pégase ; rien n'est envoyé).
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur (assets/abracadabra.moteur.bin :
// three.js r180 + Rapier + le jeu, gzippé) et les objets (assets/abra.fleuve.bin : modèles de l'Asset Store EMBALLÉS avec la clé du site,
// jamais en clair). Une seule variable globale en plus : window.JDW_ABRA. Atelier : ~/jdv-tools/duotest/abracadabra (REPRISE.md).
const NOM = 'Abracadabra', ID = 'abracadabra';
const ROOT = () => window.JDW_ROOT || '';
const STORE = { engine: null, pack: null };
async function fetchBytes(url, onProg, guess, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(url.split('/').pop() + ' ' + r.status);
  const total = +(r.headers.get('content-length') || 0) || guess;
  if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); onProg(1); return b; }
  const rd = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg(Math.min(1, got / Math.max(total, got))); }
  const out = new Uint8Array(got); let k = 0; for (const p of parts) { out.set(p, k); k += p.length; }
  return out;
}
function loadEngine(onProg, signal) {
  if (window.JDW_ABRA && window.JDW_ABRA.game) return Promise.resolve(window.JDW_ABRA);
  if (STORE.engine) return STORE.engine;
  STORE.engine = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/abracadabra.moteur.bin', onProg, 900000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_ABRA || !window.JDW_ABRA.game) throw new Error('moteur absent');
    return window.JDW_ABRA;
  })();
  STORE.engine.catch(() => { STORE.engine = null; });
  return STORE.engine;
}
// paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; en-tête { v, e: { 'type:nom': { o, l, t } } }
function loadPack(onProg, signal, nom = 'fleuve') {
  const K = 'pack_' + nom;
  if (STORE[K]) return STORE[K];
  STORE[K] = (async () => {
    const buf = await fetchBytes(ROOT() + 'assets/abra.' + nom + '.bin', onProg, nom === 'fleuve' ? 1400000 : 2500000, signal);
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
    const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl;
    const glb = {}, img = {}, json = {};
    await Promise.all(Object.keys(head.e).map(async (k) => {
      const e = head.e[k], raw = plain.slice(base + e.o, base + e.o + e.l), nom = k.slice(k.indexOf(':') + 1);
      if (e.t === 'glb') glb[nom] = raw.buffer;
      else if (e.t === 'json') { try { json[nom] = JSON.parse(new TextDecoder().decode(raw)); } catch (er) { /* rien */ } }
      else if (e.t === 'webp') img[nom] = await new Promise((res) => { const im = new Image(), u = URL.createObjectURL(new Blob([raw], { type: 'image/webp' })); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
    }));
    return { glb, img, json };
  })();
  STORE[K].catch(() => { STORE[K] = null; });
  return STORE[K];
}

/* ---------- vignette 2D : le fleuve, un pont de bric et de broc, le mage qui fait apparaître une vache dans les étoiles ---------- */
const TAU = Math.PI * 2;
let BG = null;
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const sky = x.createLinearGradient(0, 0, 0, h * 0.5); sky.addColorStop(0, '#4f9ef2'); sky.addColorStop(1, '#ffe7c4'); x.fillStyle = sky; x.fillRect(0, 0, w, h);
  let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,255,255,.85)'; const cx = r() * w, cy = 10 + r() * h * 0.2; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + k * 9, cy + (k % 2) * 3, 8 + r() * 6, 0, TAU); x.fill(); } }
  x.fillStyle = '#86b84a'; x.beginPath(); x.moveTo(0, h * 0.42); for (let i = 0; i <= 10; i++) x.lineTo(w * i / 10, h * 0.4 - Math.sin(i * 1.3) * 8); x.lineTo(w, h); x.lineTo(0, h); x.fill();
  // le fleuve (en biais) et ses rives
  x.fillStyle = '#7a5a3a'; x.beginPath(); x.moveTo(w * 0.36, h * 0.4); x.lineTo(w * 0.56, h * 0.4); x.lineTo(w * 0.78, h); x.lineTo(w * 0.2, h); x.fill();
  const ri = x.createLinearGradient(0, h * 0.4, 0, h); ri.addColorStop(0, '#5fc4cf'); ri.addColorStop(1, '#1f6f86');
  x.fillStyle = ri; x.beginPath(); x.moveTo(w * 0.38, h * 0.4); x.lineTo(w * 0.54, h * 0.4); x.lineTo(w * 0.74, h); x.lineTo(w * 0.24, h); x.fill();
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,110,30,${0.4 + r() * 0.4})`; const gx = r() * w, gy = h * 0.45 + r() * h * 0.55; if (gx > w * 0.2 && gx < w * 0.78) continue; x.fillRect(gx, gy, 2, -6 - r() * 6); }
  return { c };
}
function preview(ctx, w, h, t) {
  try {
    if (!BG || BG.w !== w || BG.h !== h) BG = Object.assign(background(w, h), { w, h });
    ctx.drawImage(BG.c, 0, 0, w, h);
    // le pont : une planche sur un tonneau et un rocher
    ctx.fillStyle = '#5a5a60'; ctx.beginPath(); ctx.ellipse(w * 0.44, h * 0.73, w * 0.05, h * 0.06, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a4424'; ctx.fillRect(w * 0.57, h * 0.62, w * 0.05, h * 0.12); ctx.fillStyle = '#333'; ctx.fillRect(w * 0.57, h * 0.65, w * 0.05, 2); ctx.fillRect(w * 0.57, h * 0.71, w * 0.05, 2);
    ctx.save(); ctx.translate(w * 0.5, h * 0.64); ctx.rotate(-0.06 + Math.sin(t * 2) * 0.02); ctx.fillStyle = '#9a6a3a'; ctx.fillRect(-w * 0.22, -4, w * 0.44, 8); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-w * 0.22, 2, w * 0.44, 2); ctx.restore();
    // la vache qui apparaît dans les étoiles, au-dessus du mage
    const vy = h * 0.3 + Math.sin(t * 2.4) * 4;
    ctx.save(); ctx.translate(w * 0.26, vy); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.ellipse(-5, -2, 6, 4, 0, 0, TAU); ctx.ellipse(8, 3, 4, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(19, -5, 7, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffb0b0'; ctx.beginPath(); ctx.ellipse(24, -3, 3, 2.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; for (const lx of [-12, -5, 6, 12]) ctx.fillRect(lx, 7, 3, 7); ctx.restore();
    for (let i = 0; i < 14; i++) { const a = t * 1.5 + i * 0.45, rr = 22 + (i % 3) * 6; ctx.fillStyle = i % 2 ? '#ffe28a' : '#c79bff'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i); ctx.fillRect(w * 0.26 + Math.cos(a) * rr * 1.3, vy + Math.sin(a) * rr * 0.6, 3, 3); }
    ctx.globalAlpha = 1;
    // le mage (chapeau pointu violet), bras levés
    const mx = w * 0.14, my = h * 0.86;
    ctx.fillStyle = '#c0306a'; ctx.fillRect(mx - 7, my - 22, 14, 22); ctx.fillStyle = '#f2c8a0'; ctx.beginPath(); ctx.arc(mx, my - 27, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a3a8a'; ctx.beginPath(); ctx.moveTo(mx - 13, my - 30); ctx.lineTo(mx + 13, my - 30); ctx.lineTo(mx + 3, my - 52); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx + 9, my - 14); ctx.lineTo(mx + 20, my - 40); ctx.stroke(); ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.arc(mx + 21, my - 42, 3 + Math.sin(t * 6), 0, TAU); ctx.fill();
    // le mot magique
    const words = ['« une vache ! »', '« un tonneau »', '« une planche »', '« un rocher »'];
    ctx.font = '400 15px Bungee, Impact, sans-serif'; ctx.textAlign = 'left'; const wd = words[Math.floor(t / 2.2) % words.length];
    ctx.fillStyle = 'rgba(30,18,40,.7)'; const tw = ctx.measureText(wd).width; ctx.fillRect(mx + 22, my - 78, tw + 14, 24); ctx.fillStyle = '#ffe08a'; ctx.fillText(wd, mx + 29, my - 60);
  } catch (e) { /* une vignette ne casse jamais la borne */ }
}

/* ---------- lancement : écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#3a1a5a,#0b0616 72%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<div style="font-size:54px;filter:drop-shadow(0 0 14px rgba(200,120,255,.7))">🪄</div>' +
    '<div style="font:400 34px ' + FD + ';color:#ffe08a;margin-top:6px;text-shadow:0 4px 0 #2a0c3a,0 0 22px rgba(200,120,255,.7)">' + NOM.toUpperCase() + '</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#c79bff,#ffe08a);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#e8d8ff">Le bâton magique se réveille…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const prog = { e: 0, p: 0 }, upd = () => { bar.style.width = Math.round((prog.e * 0.4 + prog.p * 0.6) * 100) + '%'; };
  const fail = (e) => {
    if (dead) return;
    try { if (api.reportError) api.reportError(NOM + ' : chargement raté (' + (e && e.message) + ')'); } catch (er) { /* rien */ }
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#ffb8b8;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#e8d8ff;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:10px 18px;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => {
      if (dead) return;
      root.innerHTML = ''; const n = mount(root, api);
      for (const k of ['destroy', 'pause', 'resume', 'currentScore', 'currentLevel', 'endInfo']) proxy[k] = n[k];
      Object.defineProperty(proxy, '_d', { get: () => n._d, configurable: true });
    });
  };
  Promise.all([loadEngine((k) => { prog.e = k; upd(); }, ac && ac.signal), loadPack((k) => { prog.p = k; upd(); }, ac && ac.signal)]).then(([AB, pack]) => {
    if (dead) return;
    root.innerHTML = '';
    // le 2e paquet (les autres objets) arrive pendant qu'on joue
    const packPlus = loadPack(() => {}, ac && ac.signal, 'objets').catch(() => null);
    // les autres paquets (« m1_maison », « m1_meuble »…) : chargés au 1er mot qui en a besoin
    const chargePack = (nom) => loadPack(() => {}, ac && ac.signal, nom);
    inst = AB.game(root, api, { pack, packPlus, chargePack });
    if (paused && inst.pause) inst.pause();
  }).catch(fail);
  const proxy = {
    destroy() { dead = true; if (ac) try { ac.abort(); } catch (e) { /* rien */ } if (inst) inst.destroy(); root.innerHTML = ''; },
    pause() { paused = true; if (inst) inst.pause(); },
    resume() { paused = false; if (inst) inst.resume(); },
    currentScore() { return inst ? inst.currentScore() : 0; },
    currentLevel() { return inst ? inst.currentLevel() : 1; },
    endInfo() { return inst && inst.endInfo ? inst.endInfo() : null; },
  };
  Object.defineProperty(proxy, '_d', { get: () => inst && inst._d, configurable: true });   // essais (harnais)
  proxy._dire = (t) => inst && inst._dire && inst._dire(t);
  return proxy;
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES[ID] = {
  id: ID,
  title: NOM,
  tagline: 'Appuie sur GO et dis des noms : vache, piano, tonneau… L\'éclair de ton bâton les fait tomber dans le Grand Fleuve. Traversez-le à plusieurs !',
  accent: '#c79bff',
  scoreLabel: 'points',
  live: true,   // les autres joueurs de la salle en direct (api.live, Ajout 17)
  fps: false,
  pad: { help: [['ls', 'Marcher'], ['rs', 'Regarder'], ['rb', 'GO / STOP (micro)'], ['a', 'Sauter']] },
  preview,
  mount,
};
})();
