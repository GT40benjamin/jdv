(() => {
'use strict';
// Remparts ! — tower defense arcade : des squelettes descendent la route vers ton château ; pose des tours (Archers, Catapulte, Givre,
// Éclair) sur les cases au bord de la route, améliore-les, tiens 10 vagues jusqu'au Roi Squelette. Score arcade, meilleur score par monde.
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement il charge le moteur (assets/remparts.moteur.bin :
// le jeu peint en canvas 2D, gzippé, sans bibliothèque) et le paquet EMBALLÉ des bruitages (assets/remparts.sons.bin : sons CC0 de Kenney).
// Une seule variable globale en plus : window.JDW_TD. Atelier : ~/jdv-tools/duotest/towerdefense (fiche REPRISE.md).
const ID = 'remparts', NOM = 'Remparts !';
const ROOT = () => window.JDW_ROOT || '';
const WANT = 'td-5cfb3b62';
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
      const gz = await fetchBytes(url, onProg, 40000, signal, opt);
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
    const buf = await fetchBytes(ROOT() + 'assets/remparts.' + nom + '.bin', onProg, 60000, signal);
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

/* ---------- vignette 2D : une route pavée en lacets sur la prairie, des squelettes qui marchent vers le château, des tours qui tirent ---------- */
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
function preview(ctx, w, h, t) {
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
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px;background:rgba(20,30,20,.8);border-radius:16px;color:#fff"><div style="font:400 22px ' + FD + ';color:#ffd34d;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#2a1404;background:#ffd34d;border:0;border-radius:12px;padding:10px 20px;box-shadow:0 5px 0 #8a5412;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => { if (dead) return; root.innerHTML = ''; const n = mount(root, api); Object.assign(proxy, n); });
  };
  Promise.all([loadEngine((p) => { pe = p; prog(); }, ac && ac.signal), loadPack((p) => { pp = p; prog(); }, ac && ac.signal, 'sons')]).then(([E, pack]) => {
    if (dead) return;
    try { inst = E.play(root, api, pack); } catch (e) { fail(); throw e; }
  }).catch(() => { if (!dead) fail(); });
  return proxy;
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES[ID] = {
  id: ID,
  title: NOM,
  tagline: 'Pose tes tours au bord de la route et repousse les squelettes jusqu\'au Roi !',
  accent: '#ffd34d',
  scoreLabel: 'points',
  saves: true,                        // meilleur score par monde gardé (api.save) ; le total part au classement par api.save.score
  fps: false,
  pad: { intro: 'ready', help: [['ls/dpad', 'Choisir une case'], ['a', 'Construire / valider'], ['b', 'Fermer'], ['lb', 'Tour précédente'], ['rb', 'Tour suivante'], ['x', 'Appeler la vague'], ['y', 'Vitesse ×2']] },
  preview, mount
};
})();
