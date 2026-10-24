(() => {
'use strict';
// Tirs au But — duel de tirsaubut en 3D, FACE À FACE (téléphone à plat, vue de dessus) : contre l'IA, à deux sur le même téléphone ou en ligne.
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur
// (assets/tirsaubut.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT ; le stade est photographié une fois puis tout est en 2D). Une seule variable globale en plus : window.JDW_TB.
// Atelier : ~/jdv-tools/duotest/foot (sources, outils, essais ; fiche REPRISE.md).
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
  if (window.JDW_TB && window.JDW_TB.duel) return Promise.resolve(window.JDW_TB);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/tirsaubut.moteur.bin', onProg, 260000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_TB || !window.JDW_TB.duel) throw new Error('moteur absent');
    return window.JDW_TB;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D (tuile et accueil) : stade de nuit, cage, gardien qui plonge, ballon qui file ---------- */
let BG = null;
const TAU = Math.PI * 2;
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0c0a24'); g.addColorStop(0.45, '#22164a'); g.addColorStop(0.62, '#1b2a36'); g.addColorStop(1, '#0d2414');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  // tribunes : des centaines de petits supporters colorés
  const cols = ['#ffa630', '#5ef0ff', '#ffffff', '#ff5fae', '#b06bff', '#4cc36a', '#ffd34d'];
  for (let yy = h * 0.12; yy < h * 0.5; yy += 3.2) for (let xx = 0; xx < w; xx += 3.4) { if (r() < 0.12) continue; x.fillStyle = cols[(r() * cols.length) | 0]; x.globalAlpha = 0.55 + r() * 0.35; x.fillRect(xx + r(), yy + r(), 2.2, 2.2); }
  x.globalAlpha = 1;
  // projecteurs
  for (const lx of [w * 0.2, w * 0.8]) { const lg = x.createRadialGradient(lx, h * 0.07, 0, lx, h * 0.07, w * 0.25); lg.addColorStop(0, 'rgba(255,255,255,.9)'); lg.addColorStop(0.15, 'rgba(200,220,255,.3)'); lg.addColorStop(1, 'rgba(200,220,255,0)'); x.fillStyle = lg; x.fillRect(0, 0, w, h); }
  // panneaux lumineux
  x.fillStyle = '#120a28'; x.fillRect(0, h * 0.5, w, h * 0.06);
  x.font = '400 ' + Math.round(h * 0.045) + "px 'Bungee', Impact, sans-serif"; x.textBaseline = 'middle'; x.fillStyle = '#ffd34d'; x.fillText('TIRS AU BUT  ★  TURBO FOOT  ★', 4, h * 0.53);
  // pelouse en bandes
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#2f7d36' : '#3a9142'; x.fillRect(0, h * 0.56 + i * h * 0.06, w, h * 0.06); }
  // cage et filet
  const gx = w * 0.22, gw = w * 0.56, gy = h * 0.3, gh = h * 0.27;
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 0.7;
  for (let i = 0; i <= 18; i++) { x.beginPath(); x.moveTo(gx + gw * i / 18, gy); x.lineTo(gx + gw * i / 18, gy + gh); x.stroke(); }
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(gx, gy + gh * i / 8); x.lineTo(gx + gw, gy + gh * i / 8); x.stroke(); }
  x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.beginPath(); x.moveTo(gx, gy + gh); x.lineTo(gx, gy); x.lineTo(gx + gw, gy); x.lineTo(gx + gw, gy + gh); x.stroke();
  // titre à gauche (l'étiquette « Nouveau » de la borne se pose en haut à droite)
  const font = "'Bungee', Impact, sans-serif";
  x.textAlign = 'left'; const tx = w * 0.05;
  x.font = '400 ' + Math.round(h * 0.13) + 'px ' + font; x.lineWidth = 4; x.strokeStyle = '#0a1a10'; x.strokeText('TIRS', tx, h * 0.12);
  x.shadowColor = '#3ddc6a'; x.shadowBlur = 14; x.fillStyle = '#eafff0'; x.fillText('TIRS', tx, h * 0.12); x.shadowBlur = 0;
  x.font = '400 ' + Math.round(h * 0.085) + 'px ' + font; x.lineWidth = 3; x.strokeText('AU BUT', tx + 2, h * 0.235);
  x.shadowColor = '#ffd34d'; x.shadowBlur = 12; x.fillStyle = '#fff6c8'; x.fillText('AU BUT', tx + 2, h * 0.235); x.shadowBlur = 0;
  return { c, w, h, gx, gw, gy, gh };
}
function keeper(x, cx, cy, s, ang, col) {
  x.save(); x.translate(cx, cy); x.rotate(ang);
  x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = s * 0.2;
  x.beginPath(); x.moveTo(0, -s * 0.2); x.lineTo(-s * 0.15, s * 0.45); x.moveTo(0, -s * 0.2); x.lineTo(s * 0.15, s * 0.45); x.stroke();
  x.lineWidth = s * 0.32; x.beginPath(); x.moveTo(0, -s * 0.55); x.lineTo(0, -s * 0.15); x.stroke();
  x.lineWidth = s * 0.14; x.beginPath(); x.moveTo(-s * 0.4, -s * 1.05); x.lineTo(0, -s * 0.55); x.lineTo(s * 0.4, -s * 1.05); x.stroke();
  x.fillStyle = '#fff'; for (const sx of [-0.4, 0.4]) { x.beginPath(); x.arc(sx * s, -s * 1.08, s * 0.12, 0, TAU); x.fill(); }
  x.fillStyle = '#f2c7a5'; x.beginPath(); x.arc(0, -s * 0.78, s * 0.17, 0, TAU); x.fill();
  x.restore();
}
function preview(ctx, w, h, t) {
  if (!BG || BG.w !== w || BG.h !== h) BG = background(w, h);
  ctx.drawImage(BG.c, 0, 0, w, h);
  const { gx, gw, gy, gh } = BG, cyc = (t % 3) / 3;
  // le ballon part du point de penalty vers la lucarne ; le gardien plonge de l'autre côté
  const left = Math.floor(t / 3) % 2 === 0, u = Math.min(1, Math.max(0, (cyc - 0.25) / 0.35));
  const tx = left ? gx + gw * 0.12 : gx + gw * 0.86, ty = gy + gh * 0.2;
  const bx = w / 2 + (tx - w / 2) * u + Math.sin(u * Math.PI) * w * 0.05, by = h * 0.86 + (ty - h * 0.86) * u - Math.sin(u * Math.PI) * h * 0.08;
  const dk = Math.min(1, Math.max(0, (cyc - 0.3) / 0.3)), dir = left ? 1 : -1;
  keeper(ctx, w / 2 + dir * dk * gw * 0.3, gy + gh * 0.95 - Math.sin(dk * Math.PI) * gh * 0.25, h * 0.2, dir * dk * 1.2, '#ff5fae');
  const r = h * (0.045 - 0.02 * u);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx, h * 0.86 + (gy + gh - h * 0.86) * u, r, r * 0.35, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, 1, bx, by, r); g.addColorStop(0, '#fff'); g.addColorStop(1, '#9aa0b4');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b1e2b'; ctx.beginPath(); ctx.arc(bx + Math.cos(t * 12) * r * 0.4, by + Math.sin(t * 12) * r * 0.4, r * 0.3, 0, TAU); ctx.fill();
  // ballons du score
  ['#2ecc5a', '#ff3b3b', '#2ecc5a'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(w * 0.62 + i * h * 0.075, h * 0.14, h * 0.028, 0, TAU); ctx.fill(); });
  if (u >= 1 && cyc < 0.85) { ctx.font = '400 ' + Math.round(h * 0.16) + "px 'Bungee', Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#0a1a10'; ctx.strokeText('BUT !', w / 2, h * 0.68); ctx.fillStyle = '#fff6c8'; ctx.fillText('BUT !', w / 2, h * 0.68); }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#123a22,#03080a 70%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<div style="font:400 40px ' + FD + ';color:#eafff0;text-shadow:0 4px 0 #0a1a10,0 0 22px rgba(61,220,106,.7)">TIRS</div>' +
    '<div style="font:400 24px ' + FD + ';color:#fff6c8;margin-top:-4px;text-shadow:0 0 16px rgba(255,211,77,.7)">AU BUT</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#2ecc5a,#ffd34d 60%,#ffffff);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#d9c8f0">Chargement du stade…</div>';
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
window.JDW_DUOS.tirsaubut = {
  id: 'tirsaubut',
  title: 'Tirs au But',
  emoji: '⚽',
  tagline: 'Tire, plonge… et fais trembler les filets !',
  accent: '#2ecc5a',
  target: 1,
  layout: 'shared',
  local: false,              // chacun son écran : contre l'IA ou en ligne
  ai: true,
  net: true,
  pad: { help: [['a', 'Choisir tout de suite (tir ou plongeon)']] },
  preview,
  mount,
};
})();
