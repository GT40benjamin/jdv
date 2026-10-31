(() => {
'use strict';
// Tête de Cible — fléchettes sur une cible en bois où l'on met la photo qu'on veut (l'œil vaut le plus, la bouche, le nez…).
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur
// (assets/flechettes.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT). Le détecteur de visage (MediaPipe, Apache-2.0,
// assets/flechettes.visage*.bin) ne se charge que si l'on choisit une photo : tout se passe sur l'appareil, la photo n'est jamais envoyée.
// Une seule variable globale en plus : window.JDW_FL (et window.JDW_FLV pour le détecteur). Atelier : ~/jdv-tools/duotest/flechettes (REPRISE.md).
const ROOT = () => window.JDW_ROOT || '';
const WANT = "25198e67";   // version du moteur de CE module (posée par tools/build.js)
let ENGINE = null;
async function fetchBytes(url, onProg, guess, signal, opt) {
  const r = await fetch(url, Object.assign({ signal }, opt || {}));
  if (!r.ok) throw new Error('moteur ' + r.status);
  const total = +(r.headers.get('content-length') || 0) || guess;
  if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); onProg(1); return b; }
  const rd = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg(Math.min(1, got / Math.max(total, got))); }
  const out = new Uint8Array(got); let k = 0; for (const p of parts) { out.set(p, k); k += p.length; }
  return out;
}
function loadEngine(onProg, signal) {
  const fresh = () => window.JDW_FL && window.JDW_FL.game && (window.JDW_FL.build === WANT || /__FL_ENGINE__/.test(WANT));
  if (fresh()) return Promise.resolve(window.JDW_FL);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const run = async (url, opt) => {
      window.JDW_FL = undefined;
      const gz = await fetchBytes(url, onProg, 200000, signal, opt);
      const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      await new Promise((res, rej) => {
        const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
        s.src = u; document.head.appendChild(s);
      });
      if (!window.JDW_FL || !window.JDW_FL.game) throw new Error('moteur absent');
      return window.JDW_FL.build;
    };
    const got = await run(ROOT() + 'assets/flechettes.moteur.bin');
    // un vieux moteur gardé quelque part (cache du navigateur) : on le jette et on va chercher le bon au serveur (?v= passe à côté des caches)
    if (!fresh()) {
      const again = await run(ROOT() + 'assets/flechettes.moteur.bin?v=' + WANT + '-' + Date.now(), { cache: 'reload' });
      try { if (window.JDW_SHELL_LOG) window.JDW_SHELL_LOG('Tête de Cible : vieux moteur ' + got + ' remplacé par ' + again); } catch (e) { /* rien */ }
    }
    return window.JDW_FL;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D : la cible en bois sous la lampe, la photo de Monsieur Grognon, les fléchettes qui arrivent ---------- */
const TAU = Math.PI * 2;
let BG = null;
function wood(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  // mur de planches
  x.fillStyle = '#3a2416'; x.fillRect(0, 0, w, h);
  const pw = w / 7;
  for (let i = 0; i < 7; i++) { const g = x.createLinearGradient(i * pw, 0, (i + 1) * pw, 0); const t = 0.85 + ((i * 37) % 10) / 40; g.addColorStop(0, `rgb(${70 * t},${44 * t},${26 * t})`); g.addColorStop(1, `rgb(${86 * t},${54 * t},${32 * t})`); x.fillStyle = g; x.fillRect(i * pw + 1, 0, pw - 2, h); }
  for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(30,16,8,0.25)'; x.lineWidth = 0.6; const px = ((i * 53) % 100) / 100 * w; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 3, h * 0.3, px - 3, h * 0.6, px + 2, h); x.stroke(); }
  const L = x.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.48, w * 0.6); L.addColorStop(0, 'rgba(255,214,150,0.38)'); L.addColorStop(1, 'rgba(0,0,0,0.6)'); x.fillStyle = L; x.fillRect(0, 0, w, h);
  // la cible : bois de bout
  const cx = w * 0.5, cy = h * 0.52, R = h * 0.43;
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(cx + 3, cy + 7, R * 1.04, R * 1.02, 0, 0, TAU); x.fill();
  x.fillStyle = '#9aa2ab'; x.beginPath(); x.arc(cx, cy, R + 3, 0, TAU); x.fill();
  const g = x.createRadialGradient(cx - R * 0.2, cy - R * 0.25, 2, cx, cy, R); g.addColorStop(0, '#d8a46a'); g.addColorStop(0.7, '#c08850'); g.addColorStop(1, '#8a5a30'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
  for (let r = 4; r < R; r += 2.6 + Math.sin(r) * 0.8) { x.strokeStyle = `rgba(90,50,20,${0.18 + 0.12 * Math.sin(r * 1.7)})`; x.lineWidth = 0.8; x.beginPath(); x.ellipse(cx + 1, cy - 1, r * 1.02, r, 0.2, 0, TAU); x.stroke(); }
  x.strokeStyle = 'rgba(40,20,8,0.6)'; x.lineWidth = 1; for (const a of [0.6, 2.4, 4.1]) { x.beginPath(); x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.lineTo(cx + Math.cos(a + 0.05) * R * 0.62, cy + Math.sin(a + 0.05) * R * 0.62); x.stroke(); }
  x.fillStyle = 'rgba(20,10,4,0.7)'; for (let i = 0; i < 60; i++) { const a = i * 2.39, rr = ((i * 0.618) % 1) * R * 0.85; x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.8, 0, TAU); x.fill(); }
  // le tirage : bord blanc et visage
  const pw2 = R * 1.05, ph = R * 1.3;
  x.save(); x.translate(cx, cy - R * 0.02); x.rotate(-0.04);
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-pw2 / 2 + 3, -ph / 2 + 4, pw2, ph);
  x.fillStyle = '#f3efe6'; x.fillRect(-pw2 / 2, -ph / 2, pw2, ph);
  const ix = -pw2 / 2 + 4, iy = -ph / 2 + 4, iw = pw2 - 8, ih = ph * 0.84;
  const bg = x.createLinearGradient(0, iy, 0, iy + ih); bg.addColorStop(0, '#5a7fa8'); bg.addColorStop(1, '#2b4566'); x.fillStyle = bg; x.fillRect(ix, iy, iw, ih);
  x.fillStyle = '#e9e4da'; x.beginPath(); x.ellipse(0, iy + ih, iw * 0.46, ih * 0.2, 0, Math.PI, TAU); x.fill();
  x.fillStyle = '#f0ad86'; x.beginPath(); x.ellipse(0, iy + ih * 0.45, iw * 0.29, ih * 0.31, 0, 0, TAU); x.fill();
  x.fillStyle = '#8c8a86'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * iw * 0.26, iy + ih * 0.36, iw * 0.05, ih * 0.1, 0, 0, TAU); x.fill(); }
  x.fillStyle = '#4a3a30'; for (const s of [-1, 1]) { x.save(); x.translate(s * iw * 0.12, iy + ih * 0.35); x.rotate(s * 0.35); x.fillRect(-iw * 0.08, -1.5, iw * 0.16, 3); x.restore(); }
  x.fillStyle = '#d67a58'; x.beginPath(); x.ellipse(0, iy + ih * 0.53, iw * 0.06, ih * 0.05, 0, 0, TAU); x.fill();
  x.fillStyle = '#5a4a40'; x.beginPath(); x.ellipse(0, iy + ih * 0.6, iw * 0.14, ih * 0.025, 0, 0, TAU); x.fill();
  x.fillStyle = '#7a2a2a'; x.beginPath(); x.ellipse(0, iy + ih * 0.66, iw * 0.08, ih * 0.018, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(20,24,60,0.8)'; x.font = `400 ${Math.max(6, ph * 0.08)}px Bungee, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CIBLE DU JOUR', 0, iy + ih + (ph - ih - 8) / 2 + 2);
  for (const [px, py, col] of [[-1, -1, '#e8343c'], [1, -1, '#ffc93a'], [-1, 1, '#2f8cff'], [1, 1, '#3cc46a']]) { x.fillStyle = col; x.beginPath(); x.arc(px * (pw2 / 2 - 5), py * (ph / 2 - 5), 3, 0, TAU); x.fill(); }
  x.restore();
  const eyes = [-1, 1].map((s) => ({ x: cx + s * pw2 * 0.12 - 1, y: cy - R * 0.02 - ph / 2 + 4 + ih * 0.42 }));
  return { c, cx, cy, R, eyes, nose: { x: cx, y: cy - R * 0.02 - ph / 2 + 4 + ih * 0.53 } };
}
function eye(ctx, x, y, r, hit, t) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, 0, 0, TAU); ctx.fill();
  if (hit) { ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 0.9; ctx.beginPath(); for (let a = 0; a < 12; a += 0.3) { const rr = (a / 12) * r * 0.95; ctx.lineTo(x + Math.cos(a + t * 6) * rr, y + Math.sin(a + t * 6) * rr); } ctx.stroke(); }
  else { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y + 0.5, r * 0.5, 0, TAU); ctx.fill(); }
}
function dart(ctx, x, y, s, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 2, s * 1.0, s * 0.08);
  ctx.fillStyle = '#d8dde2'; ctx.fillRect(-s * 0.05, -s * 0.02, s * 0.25, s * 0.04);
  ctx.fillStyle = '#7d848c'; ctx.fillRect(s * 0.2, -s * 0.05, s * 0.32, s * 0.1);
  ctx.fillStyle = '#1b1b22'; ctx.fillRect(s * 0.52, -s * 0.03, s * 0.25, s * 0.06);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s * 0.68, 0); ctx.lineTo(s * 1.0, -s * 0.16); ctx.lineTo(s * 1.04, -s * 0.02); ctx.lineTo(s * 1.04, s * 0.02); ctx.lineTo(s * 1.0, s * 0.16); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = 1; ctx.stroke(); }
function preview(ctx, w, h, t) {
  try {
    if (!BG || BG.w !== w || BG.h !== h) BG = Object.assign(wood(w, h), { w, h });
    ctx.drawImage(BG.c, 0, 0, w, h);
    const cyc = t % 6, er = BG.R * 0.075;
    // trois fléchettes par cycle : la joue, le nez, puis l'œil
    const T0 = [[0.6, BG.cx + BG.R * 0.32, BG.cy + BG.R * 0.15, '#ff3b4e'], [1.8, BG.nose.x + 1, BG.nose.y, '#ff3b4e'], [3.0, BG.eyes[1].x, BG.eyes[1].y, '#ffcf4a']];
    const eyeHit = cyc > 3.0 + 0.32;
    eye(ctx, BG.eyes[0].x, BG.eyes[0].y, er, cyc > 4.6, t); eye(ctx, BG.eyes[1].x, BG.eyes[1].y, er, eyeHit, t);
    if (cyc > 1.8 + 0.32) { ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(BG.nose.x, BG.nose.y, er * 1.1, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(BG.nose.x - er * 0.4, BG.nose.y - er * 0.4, er * 0.3, 0, TAU); ctx.fill(); }
    for (const [t0, x, y, col] of T0) {
      const u = (cyc - t0) / 0.32;
      if (u < 0) continue;
      const k = Math.min(1, u), sx = w * 0.85 + (x - w * 0.85) * k, sy = h * 1.05 + (y - h * 1.05) * k - Math.sin(k * Math.PI) * h * 0.12;
      const wob = u > 1 ? Math.sin((u - 1) * 18) * Math.exp(-(u - 1) * 3) * 0.12 : 0;
      dart(ctx, sx, sy, BG.R * 0.42, 0.42 + wob, col);
      if (u > 1 && u < 3.5) { const p = Math.min(1, (u - 1) / 2.5); ctx.globalAlpha = 1 - p; ctx.font = `400 ${Math.round(h * 0.11)}px Bungee, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#1a0a00'; const pts = t0 > 2.9 ? '+50' : t0 > 1.7 ? '+25' : '+5'; ctx.fillText(pts, x + 1, y - h * 0.08 - p * h * 0.1 + 2); ctx.fillStyle = t0 > 2.9 ? '#ff3b4e' : '#ffd34d'; ctx.fillText(pts, x, y - h * 0.08 - p * h * 0.1); ctx.globalAlpha = 1; }
    }
    if (cyc > 4.6) for (let i = 0; i < 4; i++) { const a = t * 2.4 + (i * TAU) / 4; star(ctx, BG.cx + Math.cos(a) * BG.R * 0.45, BG.cy - BG.R * 0.62 + Math.sin(a) * BG.R * 0.08, BG.R * 0.07); }
    if (cyc > 4.6) { ctx.font = `400 ${Math.round(h * 0.16)}px Bungee, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#1a0a00'; ctx.fillText('K.O. !', w * 0.82 + 2, h * 0.3 + 3); ctx.fillStyle = '#ffd34d'; ctx.fillText('K.O. !', w * 0.82, h * 0.3); }
  } catch (e) { /* une vignette ne casse jamais la borne */ }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#5a3418,#120804 72%);color:#fff3e0;font-family:' + FB;
  box.innerHTML = '<div style="font:400 15px ' + FD + ';color:#ffb070;letter-spacing:4px">FLÉCHETTES</div>' +
    '<div style="font:400 34px ' + FD + ';color:#ffe08a;text-shadow:0 4px 0 #3a1406,0 0 22px rgba(255,150,40,.6)">TÊTE DE CIBLE</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#1a0c04;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ff3b4e,#ffd34d);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#e8c8a0">On accroche la cible…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#ffd34d;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#e8c8a0;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#3a1404;background:#ffc94d;border:0;border-radius:12px;padding:10px 18px;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => {
      if (dead) return;
      root.innerHTML = ''; const n = mount(root, api);
      for (const k of ['destroy', 'pause', 'resume', 'currentScore', 'currentLevel']) proxy[k] = n[k];
      Object.defineProperty(proxy, '_d', { get: () => n._d, configurable: true });
    });
  };
  loadEngine((k) => { bar.style.width = Math.round(k * 100) + '%'; }, ac && ac.signal).then((FL) => {
    if (dead) return;
    root.innerHTML = '';
    inst = FL.game(root, api, {});
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
window.JDW_GAMES.flechettes = {
  id: 'flechettes',
  title: 'Tête de Cible',
  tagline: 'Fabrique ta cible avec ta photo, pose les cibles et leurs points, et lance tes fléchettes !',
  accent: '#ff8a2a',
  scoreLabel: 'points',
  fps: false,
  live: true,   // partie de salle : api.live (CONTRACT.md Ajout 17) ; les cibles : api.cibles (Ajout 19)
  pad: { help: [['ls/dpad', 'Viser'], ['a/rt', 'Tenir pour la force, lâcher pour lancer']] },
  preview,
  mount,
};
})();
