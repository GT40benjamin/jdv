(() => {
'use strict';
// Remparts ! — tower defense arcade : des squelettes descendent la route vers ton château ; pose des tours (Archers, Catapulte, Givre,
// Éclair) sur les cases au bord de la route, améliore-les, tiens 10 vagues jusqu'au Roi Squelette. Score arcade, meilleur score par monde.
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement il charge le moteur (assets/remparts.moteur.bin :
// three.js r180 + le jeu, gzippé, licence MIT) et le paquet EMBALLÉ (assets/remparts.magie.bin : modèles CC0 Kenney / Quaternius / KayKit et sons).
// Une seule variable globale en plus : window.JDW_TD. Atelier : ~/jdv-tools/duotest/towerdefense (fiche REPRISE.md).
const ID = 'remparts', NOM = 'Remparts !';
const ROOT = () => window.JDW_ROOT || '';
const WANT = 'td-1d7bffd6';
const STORE = {};
async function fetchBytes(url, onProg, guess, signal, opt) {
  const r = await fetch(url, Object.assign({ signal }, opt || {}));
  if (!r.ok) throw new Error(url + ' ' + r.status);
  const total = +(r.headers.get('content-length') || 0) || guess;
  if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); onProg(1); return b; }
  const rd = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg(Math.min(1, got / Math.max(total, got))); }
  const out = new Uint8Array(got); let k = 0; for (const p of parts) { out.set(p, k); k += p.length; }
  return out;
}
function loadEngine(onProg, signal) {
  if (window.JDW_TD && window.JDW_TD.play && (window.JDW_TD.v === WANT || /__TD_ENGINE__/.test(WANT))) return Promise.resolve(window.JDW_TD);
  if (STORE.engine) return STORE.engine;
  STORE.engine = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const run = async (url, opt) => {
      const gz = await fetchBytes(url, onProg, 200000, signal, opt);
      const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      await new Promise((res, rej) => {
        const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
        s.src = u; document.head.appendChild(s);
      });
      if (!window.JDW_TD || !window.JDW_TD.play) throw new Error('moteur absent');
      return window.JDW_TD.v;
    };
    const got = await run(ROOT() + 'assets/remparts.moteur.bin');
    if (got !== WANT && !/__TD_ENGINE__/.test(WANT)) {   // un vieux moteur gardé quelque part : on va chercher le bon au serveur
      window.JDW_TD = undefined;
      await run(ROOT() + 'assets/remparts.moteur.bin?v=' + WANT.slice(3) + '-' + Date.now(), { cache: 'reload' });
    }
    return window.JDW_TD;
  })();
  STORE.engine.catch(() => { STORE.engine = null; });
  return STORE.engine;
}
// paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; en-tête { v, e: { 'type:nom': { o, l, t } } }
function loadPack(onProg, signal, nom) {
  const K = 'pack_' + nom;
  if (STORE[K]) return STORE[K];
  STORE[K] = (async () => {
    const buf = await fetchBytes(ROOT() + 'assets/remparts.' + nom + '.bin', onProg, 3200000, signal);
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
    const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl, glb = {}, son = {};
    for (const k of Object.keys(head.e)) { const e = head.e[k], raw = plain.slice(base + e.o, base + e.o + e.l).buffer, nm = k.slice(k.indexOf(':') + 1); if (e.t === 'glb') glb[nm] = raw; else if (e.t === 'son') son[nm] = raw; }
    return { glb, son };
  })();
  STORE[K].catch(() => { STORE[K] = null; });
  return STORE[K];
}

/* ---------- vignette 2D (secours tant que l'image n'est pas chargée) : une route pavée en lacets sur la prairie, des squelettes qui marchent vers le château, des tours qui tirent ---------- */
const TAU = Math.PI * 2;
let BG = null;
function hexPath(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.62); } x.closePath(); }
function routeOf(w, h) { return [[-0.05, 0.36], [0.22, 0.36], [0.33, 0.5], [0.22, 0.66], [0.1, 0.8], [0.3, 0.92], [0.55, 0.86], [0.66, 0.66], [0.6, 0.48], [0.7, 0.3], [0.86, 0.36]].map(([a, b]) => [a * w, b * h]); }
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7cc8ff'); g.addColorStop(0.22, '#bfe6ff'); g.addColorStop(0.24, '#8ccf4a'); g.addColorStop(1, '#5ea832');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // hexagones d'herbe
  const r = Math.max(9, w * 0.042);
  for (let row = 0; row * r * 0.95 < h * 0.8; row++) for (let col = -1; col * r * 1.75 < w + r; col++) {
    const cx = col * r * 1.75 + (row % 2) * r * 0.87, cy = h * 0.27 + row * r * 0.95;
    hexPath(x, cx, cy, r * 0.98); x.fillStyle = (row + col) % 3 ? '#9ad655' : '#a6dd5e'; x.fill(); x.strokeStyle = 'rgba(40,90,20,.25)'; x.lineWidth = 1; x.stroke();
  }
  // collines au fond
  x.fillStyle = '#6aaa3a'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(w * (i / 5), h * 0.27, w * 0.14, h * 0.07, 0, Math.PI, 0); x.fill(); }
  // route
  const R = routeOf(w, h);
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#b88a52'; x.lineWidth = r * 1.15; x.beginPath(); R.forEach((p, i) => (i ? x.lineTo(...p) : x.moveTo(...p))); x.stroke();
  x.strokeStyle = '#f2cf98'; x.lineWidth = r * 0.85; x.stroke();
  // arbres
  let sd = 5; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 16; i++) { const tx = rn() * w, ty = h * 0.3 + rn() * h * 0.66; if (R.some(([a, b]) => Math.hypot(a - tx, b - ty) < r * 1.3)) continue; x.fillStyle = '#2e7a2a'; x.beginPath(); x.moveTo(tx, ty - r * 1.1); x.lineTo(tx + r * 0.45, ty); x.lineTo(tx - r * 0.45, ty); x.fill(); x.fillStyle = '#3e9a34'; x.beginPath(); x.moveTo(tx, ty - r * 1.4); x.lineTo(tx + r * 0.35, ty - r * 0.5); x.lineTo(tx - r * 0.35, ty - r * 0.5); x.fill(); }
  // château (au bout de la route)
  const [kx, ky] = R[R.length - 1];
  x.fillStyle = '#d8d2c8'; x.fillRect(kx - r * 0.9, ky - r * 2.2, r * 1.8, r * 2.2); x.fillStyle = '#b8b0a4'; for (let i = 0; i < 4; i++) x.fillRect(kx - r * 0.9 + i * r * 0.5, ky - r * 2.5, r * 0.3, r * 0.35);
  x.fillStyle = '#4a7ad8'; x.beginPath(); x.moveTo(kx - r * 1.2, ky - r * 2.2); x.lineTo(kx - r * 0.75, ky - r * 3.4); x.lineTo(kx - r * 0.3, ky - r * 2.2); x.fill(); x.beginPath(); x.moveTo(kx + r * 0.3, ky - r * 2.2); x.lineTo(kx + r * 0.75, ky - r * 3.4); x.lineTo(kx + r * 1.2, ky - r * 2.2); x.fill();
  x.fillStyle = '#5a3a1a'; x.beginPath(); x.arc(kx, ky - r * 0.5, r * 0.4, Math.PI, 0); x.fillRect(kx - r * 0.4, ky - r * 0.5, r * 0.8, r * 0.5); x.fill();
  // titre
  const font = "'Bungee', Impact, sans-serif"; let f = Math.round(h * 0.17); x.font = '400 ' + f + 'px ' + font; while (f > 10 && x.measureText('REMPARTS !').width > w * 0.62) { f--; x.font = '400 ' + f + 'px ' + font; }
  x.textAlign = 'left'; x.textBaseline = 'top'; x.lineWidth = 5; x.strokeStyle = '#2a1a08'; x.strokeText('REMPARTS !', w * 0.04, h * 0.05);
  x.fillStyle = '#ffd34d'; x.shadowColor = 'rgba(255,180,40,.8)'; x.shadowBlur = 10; x.fillText('REMPARTS !', w * 0.04, h * 0.05); x.shadowBlur = 0;
  return { c, w, h, r, R };
}
// tours de la vignette : position (fraction), couleur
const TW = [[0.4, 0.62, '#5cc94a', 'a'], [0.16, 0.5, '#ff9a2e', 'c'], [0.45, 0.94, '#5ec8ff', 'f'], [0.8, 0.52, '#c27bff', 'b']];
function along(R, d) { // d en px le long de la route
  for (let i = 1; i < R.length; i++) { const [a, b] = R[i - 1], [c, e] = R[i], L = Math.hypot(c - a, e - b); if (d <= L) return [a + (c - a) * d / L, b + (e - b) * d / L]; d -= L; }
  return R[R.length - 1];
}
function routeLen(R) { let L = 0; for (let i = 1; i < R.length; i++) L += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]); return L; }
function skull(x, px, py, s, t) {
  const bob = Math.abs(Math.sin(t * 9)) * s * 0.15;
  x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(px, py + s * 0.1, s * 0.5, s * 0.18, 0, 0, TAU); x.fill();
  x.fillStyle = '#efe8d6'; x.fillRect(px - s * 0.22, py - s * 0.9 - bob, s * 0.44, s * 0.6);
  x.strokeStyle = '#efe8d6'; x.lineWidth = s * 0.14; x.beginPath(); x.moveTo(px - s * 0.12, py - s * 0.35 - bob); x.lineTo(px - s * 0.18 + Math.sin(t * 9) * s * 0.15, py); x.moveTo(px + s * 0.12, py - s * 0.35 - bob); x.lineTo(px + s * 0.18 - Math.sin(t * 9) * s * 0.15, py); x.stroke();
  x.beginPath(); x.arc(px, py - s * 1.15 - bob, s * 0.34, 0, TAU); x.fill();
  x.fillStyle = '#2a1a2a'; x.beginPath(); x.arc(px - s * 0.12, py - s * 1.17 - bob, s * 0.08, 0, TAU); x.arc(px + s * 0.12, py - s * 1.17 - bob, s * 0.08, 0, TAU); x.fill();
}
function preview2d(ctx, w, h, t) {
  if (!BG || BG.w !== w || BG.h !== h) BG = background(w, h);
  ctx.drawImage(BG.c, 0, 0, w, h);
  const { r, R } = BG, L = routeLen(R), sp = r * 2.2, n = 6, cyc = (L + n * sp) / (r * 1.6);
  const foes = [];
  for (let i = 0; i < n; i++) { const d = ((t * r * 1.6 + i * sp) % (L + sp)) - sp * 0.5; if (d < 0 || d > L - r) continue; const [px, py] = along(R, d); foes.push([px, py, i, d]); }
  // tours
  TW.forEach(([fx, fy, c, k], j) => {
    const px = fx * w, py = fy * h;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(px, py + 2, r * 0.6, r * 0.25, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#cfc6b6'; ctx.fillRect(px - r * 0.4, py - r * 1.5, r * 0.8, r * 1.5); ctx.fillStyle = '#b4aa98'; ctx.fillRect(px - r * 0.5, py - r * 1.7, r, r * 0.3);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(px - r * 0.55, py - r * 1.7); ctx.lineTo(px, py - r * 2.5); ctx.lineTo(px + r * 0.55, py - r * 1.7); ctx.fill();
    // tir vers l'ennemi le plus proche
    let best = null, bd = r * 6; for (const f of foes) { const d = Math.hypot(f[0] - px, f[1] - py); if (d < bd) { bd = d; best = f; } }
    if (best) {
      const ph = (t * (k === 'c' ? 0.8 : 1.6) + j * 0.3) % 1, sx = px, sy = py - r * 1.8, ex = best[0], ey = best[1] - r * 0.6;
      if (k === 'b') { if (ph < 0.25) { ctx.strokeStyle = '#e8c8ff'; ctx.lineWidth = 2; ctx.shadowColor = '#a860ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(sx, sy); for (let s = 1; s <= 5; s++) ctx.lineTo(sx + (ex - sx) * s / 5 + (s < 5 ? (Math.sin(t * 50 + s) * r * 0.3) : 0), sy + (ey - sy) * s / 5); ctx.stroke(); ctx.shadowBlur = 0; } }
      else { const qx = sx + (ex - sx) * ph, qy = sy + (ey - sy) * ph - (k === 'c' ? Math.sin(ph * Math.PI) * r * 1.5 : 0); ctx.fillStyle = k === 'f' ? '#bff0ff' : k === 'c' ? '#7a6a5a' : '#5a3a1a'; ctx.beginPath(); ctx.arc(qx, qy, k === 'c' ? r * 0.22 : r * 0.12, 0, TAU); ctx.fill(); }
    }
  });
  // squelettes (du plus loin au plus près)
  foes.sort((a, b) => a[1] - b[1]).forEach(([px, py, i]) => skull(ctx, px, py, r * 0.75, t + i * 0.37));
}

/* ---------- lancement ---------- */
function mount(root, api) {
  let inst = null, dead = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(#7cc8ff,#bfe6ff 40%,#6aaa3a);color:#1a2a10;font-family:' + FB;
  box.innerHTML = '<div style="font:400 40px ' + FD + ';color:#ffd34d;text-shadow:0 4px 0 #2a1a08,0 0 20px rgba(255,180,40,.6)">REMPARTS !</div>' +
    '<div style="margin-top:16px;width:min(300px,62vw);height:14px;border-radius:7px;background:#1a3a10;box-shadow:0 0 0 2px rgba(255,255,255,.6);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#5cc94a,#ffd34d);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:700 14px ' + FB + ';color:#1a3a10">Les squelettes se réveillent…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  let pe = 0, pp = 0; const prog = () => { bar.style.width = Math.round((pe * 0.2 + pp * 0.8) * 100) + '%'; };
  const proxy = {
    destroy() { dead = true; if (ac) ac.abort(); if (inst) inst.destroy(); root.innerHTML = ''; },
    currentScore: () => (inst && inst.currentScore ? inst.currentScore() : 0),
    currentLevel: () => (inst && inst.currentLevel ? inst.currentLevel() : 1),
    pause() { if (inst && inst.pause) inst.pause(); },
    resume() { if (inst && inst.resume) inst.resume(); },
    _debug: () => (inst && inst._debug ? inst._debug() : null)
  };
  const fail = (e) => {
    if (dead) return;
    // la cause part au journal de la borne (appareil, mémoire, 3D possible ?) : un « Oups » qu'on peut enfin expliquer
    try {
      const f = api.report || api.reportError; let gl = '?';
      try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') ? 'webgl2' : c.getContext('webgl') ? 'webgl1' : 'AUCUN'; } catch (x) { gl = 'erreur'; }
      if (f) f(NOM + ' : chargement raté (' + ((e && e.message) || e || 'inconnu') + ')', String((e && e.stack) || '').slice(0, 1500) + ' | 3D : ' + gl + ' · mémoire ' + (navigator.deviceMemory || '?') + ' Go · cœurs ' + (navigator.hardwareConcurrency || '?') + ' · DecompressionStream ' + (typeof DecompressionStream !== 'undefined') + ' · moteur ' + Math.round(pe * 100) + ' % · paquet ' + Math.round(pp * 100) + ' %');
    } catch (x) { /* rien */ }
    if (inst && inst.destroy) { try { inst.destroy(); } catch (x) { /* rien */ } inst = null; }
    if (!box.isConnected) { root.innerHTML = ''; root.appendChild(box); }   // le jeu a pu vider la page en démarrant : on remet le message
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px;background:rgba(20,30,20,.8);border-radius:16px;color:#fff"><div style="font:400 22px ' + FD + ';color:#ffd34d;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#2a1404;background:#ffd34d;border:0;border-radius:12px;padding:10px 20px;box-shadow:0 5px 0 #8a5412;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => { if (dead) return; root.innerHTML = ''; const n = mount(root, api); Object.assign(proxy, n); });
  };
  Promise.all([loadEngine((p) => { pe = p; prog(); }, ac && ac.signal), loadPack((p) => { pp = p; prog(); }, ac && ac.signal, 'magie')]).then(([E, pack]) => {
    if (dead) return;
    // pack.more('crypte', progression) : le paquet de la Crypte oubliée, chargé seulement quand on y entre
    const more = (nom, onP) => loadPack(onP || (() => {}), ac && ac.signal, nom);
    try { inst = E.play(root, api, Object.assign({ more }, pack)); } catch (e) { fail(e); return; }
    if (inst && inst.ready && inst.ready.catch) inst.ready.catch((e) => fail(e));
  }).catch((e) => { if (!dead) fail(e); });
  return proxy;
}

/* ---------- vignette : une vraie image du jeu (tests/vignette.js, Forêt enchantée en pleine vague), zoom lent, lueurs des cristaux,
   étincelles magiques et le titre ; l'ancien dessin 2D sert tant que l'image n'est pas chargée ---------- */
let VIMG = null, VOK = false;
const VGLOW = [[0.731, 0.26, '200,120,255'], [0.68, 0.584, '140,220,255'], [0.782, 0.752, '220,120,255'], [0.95, 0.768, '140,220,255'], [0.99, 0.62, '255,190,120'], [0.029, 0.352, '230,150,255']];
let VT = null;
function vTitle(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const g = x.createLinearGradient(0, 0, 0, h * 0.28); g.addColorStop(0, 'rgba(20,8,40,.6)'); g.addColorStop(1, 'rgba(20,8,40,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h * 0.28);
  const font = "'Bungee', Impact, sans-serif"; let f = Math.round(h * 0.17); x.font = '400 ' + f + 'px ' + font; while (f > 10 && x.measureText('REMPARTS !').width > w * 0.8) { f--; x.font = '400 ' + f + 'px ' + font; }
  x.textAlign = 'left'; x.textBaseline = 'top'; x.lineJoin = 'round'; x.lineWidth = Math.max(4, f * 0.2); x.strokeStyle = '#2a0c4a'; x.strokeText('REMPARTS !', w * 0.045, h * 0.05);
  x.fillStyle = '#ffd34d'; x.shadowColor = 'rgba(200,120,255,.9)'; x.shadowBlur = 12; x.fillText('REMPARTS !', w * 0.045, h * 0.05); x.shadowBlur = 0;
  return { c, w, h };
}
function preview(ctx, w, h, t) {
  if (!VIMG) { VIMG = new Image(); VIMG.onload = () => { VOK = true; }; VIMG.src = ROOT() + 'assets/remparts.vignette.webp'; }
  if (!VOK) return preview2d(ctx, w, h, t);
  // zoom lent qui respire (vers la catapulte et les monstres)
  const z = 1.04 + 0.04 * Math.sin(t * 0.35), iw = VIMG.width / z, ih = VIMG.height / z, ox = (VIMG.width - iw) * (0.4 + 0.1 * Math.sin(t * 0.21)), oy = (VIMG.height - ih) * 0.35;
  ctx.drawImage(VIMG, ox, oy, iw, ih, 0, 0, w, h);
  const P = (fx, fy) => [(fx * VIMG.width - ox) / iw * w, (fy * VIMG.height - oy) / ih * h];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  VGLOW.forEach(([fx, fy, c], i) => {
    const [px, py] = P(fx, fy), r = w * (0.07 + 0.02 * Math.sin(t * 2.2 + i * 1.7)), a = 0.32 + 0.18 * Math.sin(t * 2.2 + i * 1.7);
    const g = ctx.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(' + c + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
    // étincelles qui montent des cristaux
    for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3 + i * 0.13) % 1, sx = px + Math.sin(i * 3 + k * 2.1 + t) * w * 0.025, sy = py - ph * h * 0.14, s = w * 0.006 * (1 - ph);
      ctx.fillStyle = 'rgba(' + c + ',' + (0.9 * (1 - ph)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(sx, sy, s + 0.6, 0, TAU); ctx.fill(); }
  });
  ctx.restore();
  if (!VT || VT.w !== w || VT.h !== h) VT = vTitle(w, h);
  ctx.drawImage(VT.c, 0, 0, w, h);
  carte(ctx, w, h, t);
}
// LA CARTE SUR LA TUILE (4 nov. 2026) : en bas de la vignette, les 4 mondes (allumés quand gagnés) puis les 4 portes de la Crypte oubliée
// (ouvertes / fermées, et combien de niveaux gagnés derrière chacune). Le jeu écrit le résumé dans localStorage « jdw.remparts.carte.<joueur> ».
const CW = ['#a78bfa', '#5ad08a', '#9ad8ff', '#ff7a3a'], CD = [['#ff9a3a', '🎃'], ['#e8b04a', '🕯️'], ['#3ad0c8', '🌊'], ['#ff9ad8', '☁️']];
let CARTE = null, CARTE_T = 0;
function carteData() {
  const now = Date.now(); if (now - CARTE_T < 2000) return CARTE; CARTE_T = now;
  try { const pr = JSON.parse(localStorage.getItem('jdw.profile') || 'null'), nm = pr && pr.name; CARTE = nm ? JSON.parse(localStorage.getItem('jdw.remparts.carte.' + nm) || 'null') : null; } catch (e) { CARTE = null; }
  return CARTE;
}
function carte(ctx, w, h, t) {
  const D = carteData() || { m: [0, 0, 0, 0], c: [[], [], [], []], o: 0 };
  const r = Math.max(5, Math.min(h * 0.075, w * 0.03)), y = h - r * 1.9, gap = r * 2.5, x0 = w / 2 - gap * 4.5;
  ctx.save();
  ctx.fillStyle = 'rgba(12,6,24,.62)'; const bx = x0 - r * 1.4, bw = gap * 9 + r * 0.8, by = y - r * 1.45, bh = r * 2.9;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, r); else ctx.rect(bx, by, bw, bh); ctx.fill();
  ctx.strokeStyle = 'rgba(216,180,106,.7)'; ctx.lineWidth = Math.max(1, r * 0.16); ctx.stroke();
  // les 4 mondes : rond plein et lumineux quand gagné, creux sinon
  D.m.forEach((st, i) => { const x = x0 + i * gap; ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU);
    if (st > 0) { ctx.shadowColor = CW[i]; ctx.shadowBlur = r; ctx.fillStyle = CW[i]; ctx.fill(); ctx.shadowBlur = 0; } else { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = r * 0.18; ctx.stroke(); } });
  // la crypte : un crâne, puis 4 portes en arc (ouverte = couleur du monde + son emblème ; fermée = grise) et leurs niveaux gagnés (5 points)
  ctx.font = Math.round(r * 1.5) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = D.o ? 1 : 0.45; ctx.fillText('💀', x0 + 4 * gap, y); ctx.globalAlpha = 1;
  D.c.forEach((L, k) => {
    const x = x0 + (5 + k) * gap, open = D.o && (k === 0 || (D.c[k - 1] || [])[4] > 0), won = (L || []).filter((s) => s > 0).length;
    const pw = r * 0.95, ph = r * 1.25; ctx.beginPath(); ctx.moveTo(x - pw, y + ph * 0.75); ctx.lineTo(x - pw, y - ph * 0.15); ctx.arc(x, y - ph * 0.15, pw, Math.PI, 0); ctx.lineTo(x + pw, y + ph * 0.75); ctx.closePath();
    if (open) { const pulse = 0.75 + 0.25 * Math.sin(t * 2 + k); ctx.shadowColor = CD[k][0]; ctx.shadowBlur = r * 1.2 * pulse; ctx.fillStyle = CD[k][0]; ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = Math.round(r * 1.05) + 'px sans-serif'; ctx.fillText(CD[k][1], x, y - ph * 0.05); }
    else { ctx.fillStyle = 'rgba(90,80,110,.85)'; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - r * 0.28, y - r * 0.1, r * 0.56, r * 0.45); }
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - pw * 0.8 + i * pw * 0.4, y + ph * 0.75 + r * 0.32, r * 0.13, 0, TAU); ctx.fillStyle = i < won ? '#ffd34d' : 'rgba(255,255,255,.25)'; ctx.fill(); }
  });
  ctx.restore();
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES[ID] = {
  id: ID,
  title: NOM,
  tagline: 'Pose tes tours magiques au bord du chemin et défends la tour du sorcier contre les monstres !',
  accent: '#ffd34d',
  scoreLabel: 'points',
  saves: true,                        // meilleur score par monde gardé (api.save) ; le total part au classement par api.save.score
  fps: false,
  pad: { intro: 'ready', help: [['ls/dpad', 'Choisir une case'], ['a', 'Construire / valider'], ['b', 'Fermer'], ['lb', 'Tour précédente'], ['rb', 'Tour suivante'], ['x', 'Appeler la vague'], ['y', 'Vitesse ×2']] },
  preview, mount
};
})();
