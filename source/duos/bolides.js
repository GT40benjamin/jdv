(() => {
'use strict';
// Bolides RC — course de petites voitures radiocommandées, circuit vu de dessus en 3/4, FACE À FACE (téléphone à plat) : à deux, contre l'IA ou en ligne.
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur
// (assets/bolides.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT ; circuits et voitures photographiés une fois, tout le reste en 2D).
// Une seule variable globale en plus : window.JDW_BR.
// Atelier : ~/jdv-tools/duotest/bolides (sources, outils, essais ; fiche REPRISE.md).
const ROOT = () => window.JDW_ROOT || '';
let ENGINE = null;
async function fetchBytes(url, onProg, guess, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('moteur ' + r.status);
  const total = +(r.headers.get('content-length') || 0) || guess;
  if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); onProg(1); return b; }
  const rd = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg(Math.min(1, got / Math.max(total, got))); }
  const out = new Uint8Array(got); let k = 0; for (const p of parts) { out.set(p, k); k += p.length; }
  return out;
}
function loadEngine(onProg, signal) {
  if (window.JDW_BR && window.JDW_BR.duel) return Promise.resolve(window.JDW_BR);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/bolides.moteur.bin', onProg, 260000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_BR || !window.JDW_BR.duel) throw new Error('moteur absent');
    return window.JDW_BR;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D (tuile et accueil) : un petit circuit dans le jardin vu de dessus, deux bolides qui se doublent ---------- */
let BG = null;
const TAU = Math.PI * 2;
function loopPt(w, h, u) { const a = u * TAU; return [w * 0.62 + Math.cos(a) * w * 0.3 + Math.cos(a * 2) * w * 0.04, h * 0.55 + Math.sin(a) * h * 0.33 - Math.sin(a * 2) * h * 0.06]; }
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  x.fillStyle = '#4f9a3c'; x.fillRect(0, 0, w, h);
  let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(110,190,80,.5)' : 'rgba(40,100,30,.5)'; x.fillRect(r() * w, r() * h, 1.5, 2.5); }
  const path = () => { x.beginPath(); for (let i = 0; i <= 80; i++) { const [px, py] = loopPt(w, h, i / 80); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  path(); x.lineWidth = h * 0.2; x.strokeStyle = '#c8402a'; x.setLineDash([6, 6]); x.stroke(); x.setLineDash([]);
  path(); x.lineWidth = h * 0.17; x.strokeStyle = '#9a7a52'; x.stroke();
  path(); x.lineWidth = h * 0.04; x.strokeStyle = 'rgba(70,50,30,.25)'; x.stroke();
  for (let i = 0; i < 40; i++) { const [px, py] = loopPt(w, h, i / 40); const nx = px - w * 0.62, ny = py - h * 0.55, d = Math.hypot(nx, ny) || 1; x.fillStyle = '#16161a'; x.beginPath(); x.arc(px + nx / d * h * 0.13, py + ny / d * h * 0.13, 2.6, 0, TAU); x.fill(); }
  for (let i = 0; i < 6; i++) { x.fillStyle = '#2f7a2a'; x.beginPath(); x.arc(w * (0.05 + r() * 0.2), h * (0.5 + r() * 0.45), 8 + r() * 6, 0, TAU); x.fill(); }
  const font = "'Bungee', Impact, sans-serif"; x.textAlign = 'left'; x.lineJoin = 'round';
  x.font = '400 ' + Math.round(h * 0.15) + 'px ' + font; x.lineWidth = 5; x.strokeStyle = '#102a10'; x.strokeText('BOLIDES', w * 0.04, h * 0.2);
  x.fillStyle = '#ffe9a0'; x.fillText('BOLIDES', w * 0.04, h * 0.2);
  x.font = '400 ' + Math.round(h * 0.11) + 'px ' + font; x.lineWidth = 4; x.strokeText('RC', w * 0.05, h * 0.33); x.fillStyle = '#5ef0ff'; x.fillText('RC', w * 0.05, h * 0.33);
  return { c, w, h };
}
function car(ctx, x, y, a, col, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-s * 0.5 + 2, -s * 0.28 + 3, s, s * 0.56);
  ctx.fillStyle = '#141416'; for (const [px, py] of [[0.3, -0.32], [0.3, 0.32], [-0.3, -0.32], [-0.3, 0.32]]) ctx.fillRect(px * s - s * 0.12, py * s - s * 0.08, s * 0.24, s * 0.16);
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-s * 0.48, -s * 0.24, s * 0.96, s * 0.48, s * 0.16); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 0.4, -s * 0.04, s * 0.8, s * 0.08);
  ctx.fillStyle = '#10141c'; ctx.beginPath(); ctx.ellipse(s * 0.05, 0, s * 0.14, s * 0.12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = col; ctx.fillRect(-s * 0.56, -s * 0.3, s * 0.1, s * 0.6);
  ctx.restore();
}
function preview(ctx, w, h, t) {
  if (!BG || BG.w !== w || BG.h !== h) BG = background(w, h);
  ctx.drawImage(BG.c, 0, 0, w, h);
  const s = h * 0.13;
  for (const [u0, col, sp] of [[0, '#5ef0ff', 0.21], [0.04, '#ffa630', 0.205]]) {
    const u = (u0 + t * sp + Math.sin(t * 0.9 + u0 * 20) * 0.015) % 1, [x, y] = loopPt(w, h, u), [x2, y2] = loopPt(w, h, (u + 0.01) % 1);
    car(ctx, x, y, Math.atan2(y2 - y, x2 - x), col, s);
  }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#1e4a24,#05090a 70%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<div style="font:400 40px ' + FD + ';color:#ffe9a0;text-shadow:0 4px 0 #102a10,0 0 22px rgba(255,166,48,.7)">BOLIDES</div>' +
    '<div style="font:400 24px ' + FD + ';color:#dffcff;margin-top:-4px;text-shadow:0 0 16px rgba(94,240,255,.7)">RC</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ffa630,#ffd34d 60%,#5ef0ff);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#d9c8f0">Chargement de l\'arène…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#d7b8ff;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#d9c8f0;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:10px 20px;box-shadow:0 5px 0 #a8661c;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => {
      if (dead) return;
      root.innerHTML = ''; const n = mount(root, api);
      proxy.destroy = n.destroy; proxy.pause = n.pause; proxy.resume = n.resume; Object.defineProperty(proxy, '_d', { get: () => n._d, configurable: true });
    });
  };
  loadEngine((k) => { bar.style.width = Math.round(k * 100) + '%'; }, ac && ac.signal).then((TP) => {
    if (dead) return;
    root.innerHTML = '';
    inst = TP.duel(root, api, {});
    if (paused && inst.pause) inst.pause();
  }).catch(() => fail());
  const proxy = {
    destroy() { dead = true; if (ac) try { ac.abort(); } catch (e) { /* rien */ } if (inst) inst.destroy(); root.innerHTML = ''; },
    pause() { paused = true; if (inst) inst.pause(); },
    resume() { paused = false; if (inst) inst.resume(); },
  };
  Object.defineProperty(proxy, '_d', { get: () => inst && inst._d, configurable: true });   // essais (harnais)
  return proxy;
}

window.JDW_DUOS = window.JDW_DUOS || {};
window.JDW_DUOS.bolides = {
  id: 'bolides',
  title: 'Bolides RC',
  emoji: '🏎️',
  tagline: 'Course de petites voitures téléguidées : pointe du doigt, fonce, dérape… double tout le monde !',
  accent: '#ffa630',
  target: 2,
  layout: 'shared',
  ai: true,
  net: true,
  netAnywhere: true,          // en ligne : on touche partout (chacun ne pilote que SA voiture)
  // manette (CONTRACT.md « Ajout 10 ») : le stick = la direction où va la voiture (elle accélère toute seule)
  pad: { help: [['ls/dpad', 'Direction (la voiture y va)'], ['a', 'Déraper · mini-turbo']] },
  preview,
  mount,
};
})();
