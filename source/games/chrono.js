(() => {
'use strict';
// Turbo Chrono — contre-la-montre en 3D sur des circuits de stade (loopings, tremplins, virages relevés, turbos) contre les
// FANTÔMES de ses copains. Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le
// moteur (assets/chrono.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT ; tout est dessiné en code, aucun fichier en plus).
// Une seule variable globale en plus : window.JDW_TC. Atelier : ~/jdv-tools/duotest/chrono (sources, outils, essais ; fiche REPRISE.md).
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
  if (window.JDW_TC && window.JDW_TC.game) return Promise.resolve(window.JDW_TC);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/chrono.moteur.bin', onProg, 240000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_TC || !window.JDW_TC.game) throw new Error('moteur absent');
    return window.JDW_TC;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D : vue derrière la voiture, route qui serpente vers l'horizon au coucher du soleil, un fantôme devant ---------- */
const TAU = Math.PI * 2;
let BG = null;
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const hz = h * 0.42;
  const sky = x.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#1d2468'); sky.addColorStop(0.6, '#a24a7a'); sky.addColorStop(1, '#ff9a56'); x.fillStyle = sky; x.fillRect(0, 0, w, hz + 1);
  const sun = x.createRadialGradient(w * 0.7, hz - 4, 2, w * 0.7, hz - 4, h * 0.45); sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(0.08, 'rgba(255,200,130,.9)'); sun.addColorStop(1, 'rgba(255,140,80,0)'); x.fillStyle = sun; x.fillRect(0, 0, w, hz + 1);
  // tribunes et pylônes en silhouette
  x.fillStyle = '#2a1f3c'; x.beginPath(); x.moveTo(0, hz); x.lineTo(0, hz - h * 0.08); x.lineTo(w * 0.32, hz - h * 0.05); x.lineTo(w * 0.32, hz); x.fill();
  x.beginPath(); x.moveTo(w, hz); x.lineTo(w, hz - h * 0.1); x.lineTo(w * 0.78, hz - h * 0.06); x.lineTo(w * 0.78, hz); x.fill();
  let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 140; i++) { x.fillStyle = ['#ff4d5e', '#ffd34d', '#5ef0ff', '#fff'][i % 4]; const px = r() < 0.5 ? r() * w * 0.32 : w * 0.78 + r() * w * 0.22; x.globalAlpha = 0.5; x.fillRect(px, hz - r() * h * 0.06, 1, 1); }
  x.globalAlpha = 1;
  for (const px of [w * 0.12, w * 0.9]) { x.fillStyle = '#20172e'; x.fillRect(px, hz - h * 0.3, 2, h * 0.3); x.fillStyle = '#fff4d0'; x.fillRect(px - 6, hz - h * 0.33, 14, 5); const g = x.createRadialGradient(px + 1, hz - h * 0.31, 0, px + 1, hz - h * 0.31, 26); g.addColorStop(0, 'rgba(255,240,200,.7)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.fillRect(px - 26, hz - h * 0.31 - 26, 52, 52); }
  // herbe
  const gr = x.createLinearGradient(0, hz, 0, h); gr.addColorStop(0, '#2c4a35'); gr.addColorStop(1, '#4d8a44'); x.fillStyle = gr; x.fillRect(0, hz, w, h - hz);
  return { c, hz };
}
// la route : centre et largeur à la profondeur z (0 = devant, 1 = horizon)
function roadAt(w, h, hz, z, t) { const k = 1 - z, y = hz + (h - hz) * Math.pow(k, 2.2), cx = w * 0.5 + Math.sin(t * 0.7 + z * 3.2) * w * 0.32 * z * z + Math.sin(t * 0.33) * w * 0.05 * z, hw = w * 0.42 * Math.pow(k, 2.2) + 1.5; return [cx, y, hw]; }
function car(ctx, x, y, s, col, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, s * 0.18, s * 0.62, s * 0.12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#16181e'; ctx.fillRect(-s * 0.6, -s * 0.12, s * 0.2, s * 0.3); ctx.fillRect(s * 0.4, -s * 0.12, s * 0.2, s * 0.3);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-s * 0.42, s * 0.14); ctx.lineTo(-s * 0.36, -s * 0.12); ctx.lineTo(-s * 0.16, -s * 0.24); ctx.lineTo(s * 0.16, -s * 0.24); ctx.lineTo(s * 0.36, -s * 0.12); ctx.lineTo(s * 0.42, s * 0.14); ctx.fill();
  ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.16, s * 0.08, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.52, -s * 0.36, s * 1.04, s * 0.07);
  ctx.fillStyle = '#15181e'; ctx.fillRect(-s * 0.3, -s * 0.3, s * 0.05, s * 0.1); ctx.fillRect(s * 0.25, -s * 0.3, s * 0.05, s * 0.1);
  ctx.fillStyle = '#ff2a3a'; ctx.fillRect(-s * 0.36, -s * 0.02, s * 0.14, s * 0.05); ctx.fillRect(s * 0.22, -s * 0.02, s * 0.14, s * 0.05);
  ctx.restore();
}
function preview(ctx, w, h, t) {
  try {
    if (!BG || BG.w !== w || BG.h !== h) BG = Object.assign(background(w, h), { w, h });
    ctx.drawImage(BG.c, 0, 0, w, h);
    const hz = BG.hz, N = 46, sp = t * 2.6;
    // bandes de la route du fond vers l'avant
    for (let i = N - 1; i >= 0; i--) {
      const z0 = i / N, z1 = (i + 1) / N;
      const [a, ya, wa] = roadAt(w, h, hz, z0, t), [b, yb, wb] = roadAt(w, h, hz, z1, t);
      const band = Math.floor(z0 * 30 + sp * 3) % 2;
      ctx.fillStyle = band ? '#e2262f' : '#f4f4f4'; ctx.beginPath(); ctx.moveTo(a - wa * 1.12, ya); ctx.lineTo(b - wb * 1.12, yb); ctx.lineTo(b + wb * 1.12, yb); ctx.lineTo(a + wa * 1.12, ya); ctx.fill();
      ctx.fillStyle = band ? '#4d525b' : '#555a63'; ctx.beginPath(); ctx.moveTo(a - wa, ya); ctx.lineTo(b - wb, yb); ctx.lineTo(b + wb, yb); ctx.lineTo(a + wa, ya); ctx.fill();
      if (band && i % 2) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(a - wa * 0.02, yb, wa * 0.04, ya - yb); }
      if (Math.floor(z0 * 6 + sp * 0.6) % 6 === 0 && i < 30) { ctx.fillStyle = 'rgba(255,140,40,.55)'; ctx.beginPath(); ctx.moveTo(a - wa * 0.5, ya); ctx.lineTo(b - wb * 0.5, yb); ctx.lineTo(b + wb * 0.5, yb); ctx.lineTo(a + wa * 0.5, ya); ctx.fill(); }
    }
    // fantôme devant, translucide, avec son nom
    const gz = 0.32 + Math.sin(t * 0.8) * 0.05, [gx, gy, gw] = roadAt(w, h, hz, gz, t);
    car(ctx, gx + gw * 0.25, gy, gw * 0.95, '#5ef0ff', 0.45);
    ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(6,10,18,.7)'; ctx.beginPath(); ctx.roundRect(gx + gw * 0.25 - 22, gy - gw * 0.95 * 0.6 - 16, 44, 13, 6); ctx.fill();
    ctx.fillStyle = '#5ef0ff'; ctx.font = '700 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PATOU', gx + gw * 0.25, gy - gw * 0.95 * 0.6 - 6.5); ctx.globalAlpha = 1;
    // ma voiture
    const [mx, my] = roadAt(w, h, hz, 0.08, t);
    car(ctx, w * 0.5 + (mx - w * 0.5) * 0.3, h * 0.86, h * 0.34, '#14a43c', 1);
    // traits de vitesse
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) { const a = i * 2.4 + 1, ph = (t * 1.8 + i * 0.37) % 1, rr = 0.25 + ph * 0.75; const cx = w / 2 + Math.cos(a) * w * 0.55 * rr, cy = h * 0.45 + Math.sin(a) * h * 0.6 * rr; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 12 * rr, cy + Math.sin(a) * 12 * rr); ctx.stroke(); }
    // chrono et écart
    ctx.font = '400 17px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.5)';
    const sec = (t * 1000 % 60000) / 1000, txt = '0:' + String(Math.floor(sec)).padStart(2, '0') + '.' + String(Math.floor(sec * 1000) % 1000).padStart(3, '0');
    ctx.fillText(txt, w / 2, 23); ctx.fillStyle = '#fff'; ctx.fillText(txt, w / 2, 21);
    const neg = Math.sin(t * 0.5) < 0;
    ctx.fillStyle = neg ? '#2f8cff' : '#ff4d5e'; ctx.beginPath(); ctx.roundRect(w / 2 - 28, 28, 56, 16, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px sans-serif'; ctx.fillText((neg ? '−' : '+') + '0.' + String(Math.floor(Math.abs(Math.sin(t * 0.5)) * 900) + 100).slice(0, 3), w / 2, 40);
  } catch (e) { /* une vignette ne casse jamais la borne */ }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#3a1f4a,#07070f 72%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<div style="font:400 40px ' + FD + ';color:#ffe9a0;text-shadow:0 4px 0 #3a1408,0 0 22px rgba(255,166,48,.7)">TURBO</div>' +
    '<div style="font:400 26px ' + FD + ';color:#dffcff;margin-top:-4px;text-shadow:0 0 16px rgba(94,240,255,.7)">CHRONO</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ff4d5e,#ffd34d 60%,#5ef0ff);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#d9c8f0">On prépare le stade…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#d7b8ff;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#d9c8f0;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:10px 18px;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => {
      if (dead) return;
      root.innerHTML = ''; const n = mount(root, api);
      for (const k of ['destroy', 'pause', 'resume', 'currentScore', 'currentLevel']) proxy[k] = n[k];
      Object.defineProperty(proxy, '_d', { get: () => n._d, configurable: true });
    });
  };
  loadEngine((k) => { bar.style.width = Math.round(k * 100) + '%'; }, ac && ac.signal).then((TC) => {
    if (dead) return;
    root.innerHTML = '';
    inst = TC.game(root, api, {});
    if (paused && inst.pause) inst.pause();
  }).catch(() => fail());
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
window.JDW_GAMES.chrono = {
  id: 'chrono',
  title: 'Turbo Chrono',
  tagline: 'Contre la montre en 3D : loopings, tremplins… et les fantômes de tes copains à battre !',
  accent: '#ff4d5e',
  scoreLabel: 'points',
  // manette (CONTRACT.md « Ajout 10 ») : la voiture accélère toute seule
  fps: false,   // pas de compteur d'images de la borne par-dessus le chrono
  pad: { help: [['ls/dpad', 'Tourner'], ['a/rt', 'Accélérer'], ['b/lt', 'Freiner · reculer · déraper (avec le stick)'], ['x', 'Recommencer'], ['y', 'Revenir au dernier passage']] },
  preview,
  mount,
};
})();
