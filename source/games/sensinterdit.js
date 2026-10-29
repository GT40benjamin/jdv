(() => {
'use strict';
// Sens Interdit — course de 10 km à CONTRESENS en 3D, au milieu de la circulation, sur 5 routes (la Corniche, le Col des Neiges,
// Néon City, le Volcan, la Route des Étoiles). Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur
// (assets/sensinterdit.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT) et les voitures (assets/sensinterdit.voitures.bin :
// modèles et textures de l'Asset Store, EMBALLÉS avec la clé intégrée au site, jamais en clair). Score = vitesse moyenne (km/h).
// 5 routes de plus en plus incroyables, accidents en vraie physique (la voiture se casse en morceaux), carambolages.
// Une seule variable globale en plus : window.JDW_SI. Atelier : ~/jdv-tools/duotest/sensinterdit (sources, outils, essais ; REPRISE.md).
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
  if (window.JDW_SI && window.JDW_SI.game) return Promise.resolve(window.JDW_SI);
  if (STORE.engine) return STORE.engine;
  STORE.engine = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/sensinterdit.moteur.bin', onProg, 280000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_SI || !window.JDW_SI.game) throw new Error('moteur absent');
    return window.JDW_SI;
  })();
  STORE.engine.catch(() => { STORE.engine = null; });
  return STORE.engine;
}
// paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; en-tête { v, e: { nom: { o, l, t } } }
function loadPack(onProg, signal) {
  if (STORE.pack) return STORE.pack;
  STORE.pack = (async () => {
    const buf = await fetchBytes(ROOT() + 'assets/sensinterdit.voitures.bin', onProg, 1000000, signal);
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
    const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl;
    const glb = {}, img = {};
    await Promise.all(Object.keys(head.e).map(async (k) => {
      const e = head.e[k], raw = plain.slice(base + e.o, base + e.o + e.l);
      if (e.t === 'glb') glb[k] = raw.buffer;
      else if (e.t === 'webp') img[k.replace(/^fx\./, '')] = await new Promise((res) => { const im = new Image(), u = URL.createObjectURL(new Blob([raw], { type: 'image/webp' })); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
    }));
    return { glb, img };
  })();
  STORE.pack.catch(() => { STORE.pack = null; });
  return STORE.pack;
}

/* ---------- vignette 2D : autoroute de nuit, phares qui arrivent en face, la voiture orange de dos, des explosions cartoon ---------- */
const TAU = Math.PI * 2;
let BG = null;
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const hz = h * 0.44;
  const sky = x.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#0d0828'); sky.addColorStop(0.55, '#4a1a5e'); sky.addColorStop(1, '#ff7a4a'); x.fillStyle = sky; x.fillRect(0, 0, w, hz + 1);
  let sd = 9; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`; x.fillRect(r() * w, r() * hz * 0.6, 1, 1); }
  const sun = x.createRadialGradient(w * 0.5, hz, 2, w * 0.5, hz, h * 0.5); sun.addColorStop(0, 'rgba(255,220,150,.95)'); sun.addColorStop(0.12, 'rgba(255,140,80,.6)'); sun.addColorStop(1, 'rgba(255,80,80,0)'); x.fillStyle = sun; x.fillRect(0, 0, w, hz);
  // immeubles en silhouette, fenêtres
  for (let i = 0; i < 26; i++) {
    const bw = 8 + r() * 18, bh = 10 + r() * 46, bx = i < 13 ? r() * w * 0.38 : w * 0.62 + r() * w * 0.38;
    x.fillStyle = '#1a1030'; x.fillRect(bx, hz - bh, bw, bh);
    for (let yy = hz - bh + 3; yy < hz - 2; yy += 5) for (let xx = bx + 2; xx < bx + bw - 2; xx += 4) if (r() < 0.35) { x.fillStyle = ['#ffd88a', '#ff7ad8', '#7ff0ff'][Math.floor(r() * 3)]; x.fillRect(xx, yy, 2, 2); }
  }
  const gr = x.createLinearGradient(0, hz, 0, h); gr.addColorStop(0, '#1a1426'); gr.addColorStop(1, '#2a2236'); x.fillStyle = gr; x.fillRect(0, hz, w, h - hz);
  return { c, hz };
}
const roadAt = (w, h, hz, z) => { const k = 1 - z, y = hz + (h - hz) * Math.pow(k, 2.1); return [w * 0.5, y, w * 0.46 * Math.pow(k, 2.1) + 1.2]; };
function ourCar(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.7, s * 0.13, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(-s * 0.62, -s * 0.05, s * 0.2, s * 0.26); ctx.fillRect(s * 0.42, -s * 0.05, s * 0.2, s * 0.26);
  const g = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.2); g.addColorStop(0, '#ffa040'); g.addColorStop(1, '#d84800');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.16); ctx.quadraticCurveTo(-s * 0.62, -s * 0.12, -s * 0.38, -s * 0.18); ctx.lineTo(-s * 0.2, -s * 0.38); ctx.lineTo(s * 0.2, -s * 0.38); ctx.lineTo(s * 0.38, -s * 0.18); ctx.quadraticCurveTo(s * 0.62, -s * 0.12, s * 0.6, s * 0.16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#141820'; ctx.beginPath(); ctx.moveTo(-s * 0.17, -s * 0.35); ctx.lineTo(s * 0.17, -s * 0.35); ctx.lineTo(s * 0.3, -s * 0.2); ctx.lineTo(-s * 0.3, -s * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff2a20'; ctx.shadowColor = '#ff2a20'; ctx.shadowBlur = 8; ctx.fillRect(-s * 0.52, -s * 0.08, s * 0.24, s * 0.05); ctx.fillRect(s * 0.28, -s * 0.08, s * 0.24, s * 0.05); ctx.shadowBlur = 0;
  ctx.fillStyle = '#222'; ctx.fillRect(-s * 0.3, s * 0.04, s * 0.6, s * 0.08);
  ctx.fillStyle = '#9a9aa2'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-s * 0.15 + i * s * 0.1, s * 0.08, s * 0.025, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function boom(ctx, x, y, s, k, word) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.max(0, 1 - k * 0.9);
  const r = s * (0.4 + k * 1.1);
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + k, rr = r * (0.5 + (i % 3) * 0.18); ctx.fillStyle = i % 2 ? '#ffb02a' : '#ffe680'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.3 - k * s * 0.4, rr * 0.55, 0, TAU); ctx.fill(); }
  if (k < 0.7) { ctx.fillStyle = '#ffe24a'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, q = i % 2 ? r * 0.75 : r * 1.25; ctx.lineTo(Math.cos(a) * q * 1.4, Math.sin(a) * q * 0.7 - s * 0.9); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d8241e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `900 ${Math.round(s * 0.55)}px Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a0c08'; ctx.strokeText(word, 0, -s * 0.88); ctx.fillStyle = '#ff3b1f'; ctx.fillText(word, 0, -s * 0.88); }
  ctx.restore();
}
function preview(ctx, w, h, t) {
  try {
    if (!BG || BG.w !== w || BG.h !== h) BG = Object.assign(background(w, h), { w, h });
    ctx.drawImage(BG.c, 0, 0, w, h);
    const hz = BG.hz, N = 40, sp = t * 3.2;
    for (let i = N - 1; i >= 0; i--) {
      const z0 = i / N, z1 = (i + 1) / N, [a, ya, wa] = roadAt(w, h, hz, z0), [, yb, wb] = roadAt(w, h, hz, z1);
      const band = Math.floor(z0 * 26 + sp * 3) % 2;
      ctx.fillStyle = band ? '#34343e' : '#3a3a46'; ctx.beginPath(); ctx.moveTo(a - wa, ya); ctx.lineTo(a - wb, yb); ctx.lineTo(a + wb, yb); ctx.lineTo(a + wa, ya); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(a - wa * 0.012, yb, wa * 0.024, ya - yb);
      if (band) { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const k of [-0.5, 0.5]) ctx.fillRect(a + wa * k - wa * 0.008, yb, wa * 0.016, ya - yb); }
      ctx.fillStyle = band ? '#5ef0ff' : '#2a8aa0'; ctx.fillRect(a - wa * 1.04, yb, wa * 0.04, ya - yb); ctx.fillRect(a + wa, yb, wa * 0.04, ya - yb);
    }
    // voitures en face : leurs phares grossissent en arrivant
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.42 + i * 0.23) % 1, z = 1 - ph, [cx, cy, cw] = roadAt(w, h, hz, z), lane = [-0.75, -0.25, 0.25, 0.75, -0.25][i];
      if (z < 0.12) continue; const s = cw * 0.38, x = cx + cw * lane;
      ctx.fillStyle = ['#d8242e', '#2f6fe0', '#ffffff', '#ffd02a', '#2fae5a'][i]; ctx.fillRect(x - s * 0.5, cy - s * 0.42, s, s * 0.42);
      ctx.fillStyle = '#111'; ctx.fillRect(x - s * 0.36, cy - s * 0.38, s * 0.72, s * 0.14);
      ctx.fillStyle = '#fff8e0'; ctx.shadowColor = '#fff2c0'; ctx.shadowBlur = 10; for (const d of [-0.32, 0.32]) { ctx.beginPath(); ctx.arc(x + s * d, cy - s * 0.12, s * 0.09, 0, TAU); ctx.fill(); } ctx.shadowBlur = 0;
    }
    // explosion cartoon de temps en temps
    const bk = (t * 0.55) % 1, bx = w * (0.3 + 0.4 * ((Math.floor(t * 0.55) * 0.37) % 1));
    if (bk < 0.75) boom(ctx, bx, hz + h * 0.14, h * 0.18, bk / 0.75, ['BOUM !', 'KABOUM !', 'VLAN !'][Math.floor(t * 0.55) % 3]);
    ourCar(ctx, w * 0.5 + Math.sin(t * 1.3) * w * 0.12, h * 0.86, h * 0.34);
    // traits de vitesse
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const a = i * 2.1 + 0.5, ph = (t * 2 + i * 0.29) % 1, rr = 0.25 + ph * 0.8, cx = w / 2 + Math.cos(a) * w * 0.55 * rr, cy = h * 0.46 + Math.sin(a) * h * 0.6 * rr; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12); ctx.stroke(); }
    // panneau sens interdit + compteur
    ctx.fillStyle = '#d8162a'; ctx.beginPath(); ctx.arc(w - 22, 22, 14, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(w - 31, 19, 18, 6);
    const v = 280 + Math.round(Math.sin(t * 0.9) * 60 + 60);
    ctx.font = '400 17px Bungee, Impact, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(v + ' km/h', 11, 26); ctx.fillStyle = '#fff'; ctx.fillText(v + ' km/h', 10, 24);
  } catch (e) { /* une vignette ne casse jamais la borne */ }
}

/* ---------- lancement : écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#4a1a3a,#07070f 72%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<svg width="74" height="74" viewBox="0 0 74 74" style="filter:drop-shadow(0 0 14px rgba(255,60,60,.6))"><circle cx="37" cy="37" r="33" fill="#d8162a" stroke="#fff" stroke-width="4"/><rect x="13" y="30" width="48" height="14" rx="2" fill="#fff"/></svg>' +
    '<div style="font:400 36px ' + FD + ';color:#ffe9a0;margin-top:10px;text-shadow:0 4px 0 #3a1408,0 0 22px rgba(255,120,48,.7)">SENS INTERDIT</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ff4d5e,#ffd34d);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#e8c8d8">On fait le plein…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const prog = { e: 0, p: 0 }, upd = () => { bar.style.width = Math.round((prog.e * 0.2 + prog.p * 0.8) * 100) + '%'; };
  const fail = (e) => {
    if (dead) return;
    try { if (api.reportError) api.reportError('Sens Interdit : chargement raté (' + (e && e.message) + ')'); } catch (er) { /* rien */ }
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#ffb8b8;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#e8c8d8;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:10px 18px;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => {
      if (dead) return;
      root.innerHTML = ''; const n = mount(root, api);
      for (const k of ['destroy', 'pause', 'resume', 'currentScore', 'currentLevel']) proxy[k] = n[k];
      Object.defineProperty(proxy, '_d', { get: () => n._d, configurable: true });
    });
  };
  Promise.all([loadEngine((k) => { prog.e = k; upd(); }, ac && ac.signal), loadPack((k) => { prog.p = k; upd(); }, ac && ac.signal)]).then(([SI, pack]) => {
    if (dead) return;
    root.innerHTML = '';
    inst = SI.game(root, api, { pack });
    if (paused && inst.pause) inst.pause();
  }).catch(fail);
  const proxy = {
    destroy() { dead = true; if (ac) try { ac.abort(); } catch (e) { /* rien */ } if (inst) inst.destroy(); root.innerHTML = ''; },
    pause() { paused = true; if (inst) inst.pause(); },
    resume() { paused = false; if (inst) inst.resume(); },
    currentScore() { return inst ? inst.currentScore() : 0; },
    currentLevel() { return inst ? inst.currentLevel() : 1; },
  };
  Object.defineProperty(proxy, '_d', { get: () => inst && inst._d, configurable: true });   // essais (harnais)
  return proxy;
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.sensinterdit = {
  id: 'sensinterdit',
  title: 'Sens Interdit',
  tagline: '10 km à contresens au milieu des voitures : le plus rapide à l\'arrivée gagne, et à chaque choc tout explose !',
  accent: '#ff3b3b',
  scoreLabel: 'km/h',
  fps: false,
  pad: { help: [['ls/dpad', 'Changer de voie'], ['a/rt', 'Gaz'], ['b/lt', 'Frein'], ['x/rb', 'Nitro']] },
  preview,
  mount,
};
})();
