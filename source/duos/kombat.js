(() => {
'use strict';
// Mandale Kombat — duel en 3D contre l'IA (bientôt en ligne). Ce petit module s'enregistre dans la borne, dessine la vignette
// en 2D (jamais de tête), puis, au lancement, charge le moteur (assets/mandale.moteur.bin : three.js r180 réduit + le jeu,
// gzippé, licences libres) et les paquets chiffrés assets/mandale.*.bin. Une seule variable globale en plus : window.JDW_MK.
// Atelier : ~/jdv-tools/duotest/mandale (sources, outils, tests ; fiche REPRISE.md).
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
  if (window.JDW_MK && window.JDW_MK.duel) return Promise.resolve(window.JDW_MK);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/mandale.moteur.bin', onProg, 330000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_MK || !window.JDW_MK.duel) throw new Error('moteur absent');
    return window.JDW_MK;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D (tuile et accueil) : toit la nuit, enseigne néon, deux silhouettes qui se mettent des mandales ---------- */
let BG = null;
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0620'); g.addColorStop(0.55, '#3a1652'); g.addColorStop(0.8, '#a2386e'); g.addColorStop(1, '#ff8a5a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 50; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.6) + ')'; x.fillRect(r() * w, r() * h * 0.45, 1, 1); }
  x.fillStyle = '#fff1f6'; x.beginPath(); x.arc(w * 0.1, h * 0.14, 8, 0, 7); x.fill();
  for (let layer = 0; layer < 2; layer++) {
    let bx = -6;
    while (bx < w) {
      const bw = 14 + r() * 26, bh = h * (layer ? 0.3 : 0.42) + r() * h * 0.22;
      x.fillStyle = layer ? '#120822' : '#26113c'; x.fillRect(bx, h * 0.78 - bh, bw, bh + h);
      for (let wy = h * 0.78 - bh + 4; wy < h * 0.76; wy += 5) for (let wx = bx + 3; wx < bx + bw - 3; wx += 4) if (r() < 0.25) { x.fillStyle = r() < 0.7 ? 'rgba(255,200,120,.85)' : 'rgba(120,230,255,.85)'; x.fillRect(wx, wy, 2, 2); }
      bx += bw + 1 + r() * 4;
    }
  }
  // sol du toit
  const fg = x.createLinearGradient(0, h * 0.72, 0, h); fg.addColorStop(0, '#2c2238'); fg.addColorStop(1, '#120c1c');
  x.fillStyle = fg; x.fillRect(0, h * 0.74, w, h);
  x.fillStyle = 'rgba(255,60,170,.22)'; x.beginPath(); x.ellipse(w * 0.32, h * 0.8, w * 0.22, h * 0.05, 0, 0, 7); x.fill();
  x.fillStyle = 'rgba(60,220,255,.2)'; x.beginPath(); x.ellipse(w * 0.7, h * 0.82, w * 0.2, h * 0.05, 0, 0, 7); x.fill();
  // enseigne néon
  const font = "'Bungee', Impact, sans-serif";
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '400 ' + Math.round(h * 0.2) + 'px ' + font; x.shadowColor = '#ff2fae'; x.shadowBlur = 14; x.lineWidth = 2; x.strokeStyle = '#ff3fa8'; x.strokeText('MANDALE', w / 2, h * 0.17);
  x.fillStyle = '#ffe0f4'; x.fillText('MANDALE', w / 2, h * 0.17);
  x.font = '400 ' + Math.round(h * 0.11) + 'px ' + font; x.shadowColor = '#21d8ff'; x.fillStyle = '#d8fbff'; x.fillText('★ KOMBAT ★', w / 2, h * 0.31);
  x.shadowBlur = 0;
  return { c, w, h };
}
function fighter(x, cx, cy, s, face, rim, punch, hit, kind) {
  // silhouette de combattant en garde (corps sombre, contour néon de la couleur du joueur) ; kind 0 = ninja (capuche), 1 = catcheur (masque)
  x.save(); x.translate(cx, cy); x.scale(face * s, s);
  if (hit) { x.translate(-4 * hit, 0); x.rotate(-0.16 * hit); }
  x.lineJoin = 'round'; x.lineCap = 'round';
  const out = (path, w) => { path(); x.strokeStyle = rim; x.lineWidth = w + 3.2; x.stroke(); x.strokeStyle = '#120a1c'; x.lineWidth = w; x.stroke(); };
  // jambes fléchies (garde)
  out(() => { x.beginPath(); x.moveTo(-3, -30); x.lineTo(-12, -16); x.lineTo(-10, 0); }, 6.5);
  out(() => { x.beginPath(); x.moveTo(4, -30); x.lineTo(13, -16); x.lineTo(17, 0); }, 6.5);
  // buste (épaules larges, taille fine)
  x.beginPath(); x.moveTo(-11, -56); x.quadraticCurveTo(0, -60, 12, -56); x.lineTo(7, -30); x.lineTo(-5, -30); x.closePath();
  x.fillStyle = '#120a1c'; x.strokeStyle = rim; x.lineWidth = 1.8; x.fill(); x.stroke();
  // bras arrière en garde
  out(() => { x.beginPath(); x.moveTo(-9, -53); x.lineTo(-4, -42); x.lineTo(4, -51); }, 4.6);
  // bras avant : garde, ou gifle tendue
  if (punch > 0) out(() => { x.beginPath(); x.moveTo(10, -54); x.lineTo(22 + 6 * punch, -54); x.lineTo(31 + 9 * punch, -57); }, 4.6);
  else out(() => { x.beginPath(); x.moveTo(10, -54); x.lineTo(15, -44); x.lineTo(14, -56); }, 4.6);
  // tête : capuche (ninja) ou masque (catcheur)
  x.beginPath(); x.ellipse(2, -66, 6.6, 7.6, 0, 0, Math.PI * 2); x.fillStyle = '#120a1c'; x.fill(); x.strokeStyle = rim; x.lineWidth = 1.8; x.stroke();
  x.fillStyle = rim; x.globalAlpha = 0.85;
  if (kind) { x.beginPath(); x.ellipse(5, -67, 3.2, 1.6, 0, 0, Math.PI * 2); x.fill(); }
  else { x.fillRect(-4, -70, 13, 2); }
  x.globalAlpha = 1;
  x.restore();
}
function preview(ctx, w, h, t) {
  if (!BG || BG.w !== w || BG.h !== h) BG = background(w, h);
  ctx.drawImage(BG.c, 0, 0, w, h);
  const cyc = t % 2, slap = cyc > 1.1 && cyc < 1.45 ? Math.sin((cyc - 1.1) / 0.35 * Math.PI) : 0, hit = cyc > 1.25 && cyc < 1.7 ? 1 - (cyc - 1.25) / 0.45 : 0;
  const bob = Math.sin(t * 5) * 1.2;
  const s = h / 122, gy = h * 0.91;
  fighter(ctx, w * 0.38 + slap * 5 * s, gy + bob, s, 1, '#ffa630', slap, 0, 0);
  fighter(ctx, w * 0.64 + hit * 5 * s, gy - bob, s, -1, '#5ef0ff', 0, hit, 1);
  if (hit > 0) {
    // onde de la gifle + « PAF ! »
    const k = 1 - hit, cx = w * 0.56, cy = gy - 52 * s;
    ctx.strokeStyle = 'rgba(255,255,255,' + (hit * 0.9) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 6 + k * 34 * s, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(cx + 6 * s, cy - 18 * s); ctx.rotate(-0.15); const sc = 0.8 + 0.4 * Math.min(1, k * 4); ctx.scale(sc, sc);
    ctx.font = "400 " + Math.round(h * 0.16) + "px 'Bungee', Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = '#1a0f2a'; ctx.strokeText('PAF !', 0, 0); ctx.fillStyle = '#fff3a8'; ctx.fillText('PAF !', 0, 0); ctx.restore();
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; ctx.fillStyle = 'rgba(255,240,170,' + hit + ')'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (10 + k * 26) * s, cy + Math.sin(a) * (10 + k * 26) * s, 2.2, 0, 7); ctx.fill(); }
  }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#2c1240,#07050f 70%);color:#f4eefc;font-family:' + ((api.fonts && api.fonts.body) || 'sans-serif');
  box.innerHTML = '<div style="font:400 40px ' + ((api.fonts && api.fonts.display) || 'Impact') + ';color:#ff9ad8;text-shadow:0 4px 0 #3c0028,0 0 22px rgba(255,60,170,.5)">MANDALE</div>' +
    '<div style="font:400 24px ' + ((api.fonts && api.fonts.display) || 'Impact') + ';color:#8fe9ff;margin-top:-4px">KOMBAT</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:4px;transform:skewX(-14deg);background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(180deg,#fff2b8,#ffc23a 50%,#ff8a1e);transition:width .2s"></u></div>' +
    '<div class="m" style="margin-top:10px;font:600 14px inherit;color:#d9c8f0">Chargement du moteur…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + ((api.fonts && api.fonts.display) || 'Impact') + ';color:#ff9ad8;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px inherit;color:#d9c8f0;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px inherit;color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:10px 20px;box-shadow:0 5px 0 #a8661c;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => { if (!dead) { root.innerHTML = ''; const n = mount(root, api); proxy.destroy = n.destroy; proxy.pause = n.pause; proxy.resume = n.resume; } });
  };
  loadEngine((k) => { bar.style.width = Math.round(k * 100) + '%'; }, ac && ac.signal).then((MK) => {
    if (dead) return;
    inst = MK.duel(root, api, {});
    if (paused && inst.pause) inst.pause();
  }).catch(() => fail());
  const proxy = {
    destroy() { dead = true; if (ac) try { ac.abort(); } catch (e) { /* rien */ } if (inst) inst.destroy(); root.innerHTML = ''; },
    pause() { paused = true; if (inst) inst.pause(); },
    resume() { paused = false; if (inst) inst.resume(); },
    get _d() { return inst && inst._d; },   // essais (harnais)
  };
  return proxy;
}

window.JDW_DUOS = window.JDW_DUOS || {};
window.JDW_DUOS.kombat = {
  id: 'kombat',
  title: 'Mandale Kombat',
  emoji: '👋',
  tagline: 'Mets-lui une mandale… avec ta vraie tête !',
  accent: '#ff3d5a',
  target: 2,
  layout: 'landscape',
  local: false,
  ai: true,
  net: false,
  preview,
  mount,
};
})();
