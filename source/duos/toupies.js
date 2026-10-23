(() => {
'use strict';
// Turbo Toupies — duel de toupies en 3D, FACE À FACE (téléphone à plat, vue de dessus) : contre l'IA, à deux sur le même téléphone ou en ligne.
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur
// (assets/toupies.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT). Une seule variable globale en plus : window.JDW_TP.
// Atelier : ~/jdv-tools/duotest/toupies (sources, outils, essais ; fiche REPRISE.md).
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
  if (window.JDW_TP && window.JDW_TP.duel) return Promise.resolve(window.JDW_TP);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/toupies.moteur.bin', onProg, 260000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_TP || !window.JDW_TP.duel) throw new Error('moteur absent');
    return window.JDW_TP;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D (tuile et accueil) : l'arène en cuvette vue de 3/4, deux toupies qui tournent et se percutent ---------- */
let BG = null;
const TAU = Math.PI * 2;
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const g = x.createRadialGradient(w / 2, h * 0.62, 10, w / 2, h * 0.55, w * 0.75);
  g.addColorStop(0, '#2a1458'); g.addColorStop(0.55, '#0e0a24'); g.addColorStop(1, '#04040b');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const cols = ['255,122,200', '94,240,255', '255,184,94', '176,107,255'], gx = r() * w, gy = r() * h * 0.42, rr = 3 + r() * 9;
    const b = x.createRadialGradient(gx, gy, 0, gx, gy, rr); b.addColorStop(0, 'rgba(' + cols[i % 4] + ',.45)'); b.addColorStop(1, 'rgba(' + cols[i % 4] + ',0)');
    x.fillStyle = b; x.beginPath(); x.arc(gx, gy, rr, 0, TAU); x.fill();
  }
  const cx = w / 2, cy = h * 0.66, R = w * 0.34, k = 0.42;
  // socle et rebord
  x.fillStyle = '#141829'; x.beginPath(); x.ellipse(cx, cy + h * 0.05, R * 1.22, R * k * 1.22, 0, 0, TAU); x.fill();
  x.fillStyle = '#3a4270'; x.beginPath(); x.ellipse(cx, cy, R * 1.08, R * k * 1.08, 0, 0, TAU); x.fill();
  x.strokeStyle = '#dfe6f5'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(cx, cy - 1, R * 1.06, R * k * 1.06, 0, Math.PI * 1.02, Math.PI * 1.98); x.stroke();
  // cuvette
  const bg = x.createRadialGradient(cx, cy + R * k * 0.2, 2, cx, cy, R);
  bg.addColorStop(0, '#2c3150'); bg.addColorStop(0.6, '#171a2e'); bg.addColorStop(1, '#0c0e1b');
  x.fillStyle = bg; x.beginPath(); x.ellipse(cx, cy, R, R * k, 0, 0, TAU); x.fill();
  const ring = (rr, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.ellipse(cx, cy, R * rr, R * k * rr, 0, 0, TAU); x.stroke(); };
  x.shadowBlur = 8; x.shadowColor = '#7a5cff'; ring(0.5, '#8a6bff', 1.4); x.shadowColor = '#5ef0ff'; ring(0.24, '#5ef0ff', 1.1); x.shadowBlur = 0;
  for (const a of [Math.PI / 2, Math.PI / 2 + TAU / 3, Math.PI / 2 + 2 * TAU / 3]) {
    x.strokeStyle = '#ff5a2e'; x.lineWidth = 2.4; x.shadowBlur = 8; x.shadowColor = '#ff5a2e';
    x.beginPath(); x.ellipse(cx, cy, R * 0.98, R * k * 0.98, 0, a - 0.22, a + 0.22); x.stroke(); x.shadowBlur = 0;
  }
  // titre
  const font = "'Bungee', Impact, sans-serif";
  // titre à gauche (l'étiquette « Nouveau » de la borne se pose en haut à droite)
  x.textAlign = 'left'; x.textBaseline = 'middle'; const tx = w * 0.06;
  x.font = '400 ' + Math.round(h * 0.15) + 'px ' + font; x.lineWidth = 4; x.strokeStyle = '#2a0a4a'; x.strokeText('TURBO', tx, h * 0.14);
  x.shadowColor = '#b06bff'; x.shadowBlur = 14; x.fillStyle = '#f3e9ff'; x.fillText('TURBO', tx, h * 0.14); x.shadowBlur = 0;
  x.font = '400 ' + Math.round(h * 0.1) + 'px ' + font; x.lineWidth = 3; x.strokeText('TOUPIES', tx + 2, h * 0.28);
  x.shadowColor = '#ff5fae'; x.shadowBlur = 12; x.fillStyle = '#ffd0ee'; x.fillText('TOUPIES', tx + 2, h * 0.28); x.shadowBlur = 0;
  return { c, w, h, cx, cy, R, k };
}
// une toupie vue de 3/4 : ombre, halo, disque de métal, anneau à lames, médaillon ; a = angle de rotation, s = taille
function top2d(x, px, py, s, a, c1, c3, c2, blades, glow) {
  x.save(); x.translate(px, py);
  x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(0, s * 0.18, s * 1.05, s * 0.36, 0, 0, TAU); x.fill();
  const g = x.createRadialGradient(0, s * 0.1, 1, 0, s * 0.1, s * 1.3); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalAlpha = 0.5; x.fillStyle = g; x.beginPath(); x.ellipse(0, s * 0.15, s * 1.3, s * 0.48, 0, 0, TAU); x.fill(); x.globalAlpha = 1;
  x.scale(1, 0.46);
  x.fillStyle = '#9aa3b6'; x.beginPath(); x.arc(0, s * 0.22, s * 0.92, 0, TAU); x.fill();
  x.fillStyle = '#e9eef8'; x.beginPath(); x.arc(0, 0, s * 0.88, 0, TAU); x.fill();
  x.fillStyle = c1; x.beginPath();
  for (let i = 0; i <= 96; i++) { const t = i / 96 * TAU, u = (((t + a) * blades / TAU) % 1 + 1) % 1, rr = s * (0.7 + 0.32 * Math.pow(u, 1.4) * (u < 0.85 ? 1 : 0)); x.lineTo(Math.cos(t) * rr, Math.sin(t) * rr - s * 0.18); }
  x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.stroke();
  x.fillStyle = c3; x.beginPath(); x.arc(0, -s * 0.2, s * 0.5, 0, TAU); x.fill();
  x.fillStyle = '#1a1c24'; x.beginPath(); x.arc(0, -s * 0.24, s * 0.36, 0, TAU); x.fill();
  x.fillStyle = c2; x.beginPath(); x.arc(0, -s * 0.3, s * 0.28, 0, TAU); x.fill();
  x.strokeStyle = '#ffffff'; x.lineWidth = 1.4; x.beginPath(); x.arc(0, -s * 0.3, s * 0.3, 0, TAU); x.stroke();
  x.restore();
}
function preview(ctx, w, h, t) {
  if (!BG || BG.w !== w || BG.h !== h) BG = background(w, h);
  ctx.drawImage(BG.c, 0, 0, w, h);
  const { cx, cy, R, k } = BG;
  // deux toupies qui tournent autour du centre et se percutent toutes les 2,4 s
  const cyc = (t % 2.4) / 2.4, clash = cyc > 0.44 && cyc < 0.6 ? Math.sin((cyc - 0.44) / 0.16 * Math.PI) : 0;
  const d = 0.62 - 0.42 * Math.sin(cyc * Math.PI), ang = t * 1.4, s = h * 0.135;
  const ax = cx + Math.cos(ang) * R * d * 0.6, ay = cy + Math.sin(ang) * R * k * d * 0.6 - s * 0.2;
  const bx = cx - Math.cos(ang) * R * d * 0.6, by = cy - Math.sin(ang) * R * k * d * 0.6 - s * 0.2;
  const order = ay < by ? [[ax, ay, 0], [bx, by, 1]] : [[bx, by, 1], [ax, ay, 0]];
  for (const [px, py, i] of order) {
    if (i === 0) top2d(ctx, px, py + Math.sin(t * 9) * 0.6, s, t * 14, '#ffcc1a', '#ff8a00', '#18245e', 3, 'rgba(255,166,48,.8)');
    else top2d(ctx, px, py + Math.cos(t * 9) * 0.6, s, t * 13, '#ff3b2f', '#ffb52e', '#2a0c0c', 4, 'rgba(94,240,255,.8)');
  }
  if (clash > 0.05) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, s * 1.6 * clash); g.addColorStop(0, 'rgba(255,255,240,' + clash + ')'); g.addColorStop(0.4, 'rgba(255,200,120,' + clash * 0.5 + ')'); g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, s * 1.6 * clash, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,160,' + clash + ')'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 3, l = s * (0.6 + 1.2 * clash); ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * s * 0.3, my + Math.sin(a) * s * 0.2); ctx.lineTo(mx + Math.cos(a) * l, my + Math.sin(a) * l * 0.6 - l * 0.2); ctx.stroke(); }
  }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#2a1458,#05040c 70%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<div style="font:400 40px ' + FD + ';color:#f3e9ff;text-shadow:0 4px 0 #2a0a4a,0 0 22px rgba(176,107,255,.7)">TURBO</div>' +
    '<div style="font:400 24px ' + FD + ';color:#ffd0ee;margin-top:-4px;text-shadow:0 0 16px rgba(255,95,174,.7)">TOUPIES</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#b06bff,#ff5fae 60%,#ffd34d);transition:width .2s"></u></div>' +
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
window.JDW_DUOS.toupies = {
  id: 'toupies',
  title: 'Turbo Toupies',
  emoji: '🌀',
  tagline: 'Lance, file sur le rail et fais-la éclater !',
  accent: '#b06bff',
  target: 2,
  layout: 'shared',
  ai: true,
  net: true,
  // manette (CONTRACT.md « Ajout 10 »)
  pad: { help: [['ls/dpad', 'Piloter ta toupie (rail des bords, bouclier au centre) · choisir'], ['a', 'Valider · lancer automatique']] },
  preview,
  mount,
};
})();
