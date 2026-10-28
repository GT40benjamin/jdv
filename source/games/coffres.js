(() => {
'use strict';
// Coffres à Secrets — casse-tête de coffres en bois en 3D : on fait glisser les pièces du couvercle pour sortir la clé dorée par la
// fente. 6 mondes (glissières, dés, plateaux tournants, tiges de laiton, poussoirs, le Coffre du Maître) × 8 coffres.
// La position de chaque coffre est gardée (pièces, coups, annuler / refaire, chrono, caméra) sur l'appareil et, avec un compte, sur le
// serveur (api.save). Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur
// (assets/coffres.moteur.bin : three.js r180 + le jeu, gzippé, licence MIT). Une seule variable globale en plus : window.JDW_CF.
// Atelier : ~/jdv-tools/duotest/coffres (sources, générateur des niveaux, essais ; fiche REPRISE.md).
const ROOT = () => window.JDW_ROOT || '';
let ENGINE = null;
const WANT = 'cf-df846b76';   // version du moteur de CE module (posée par tools/build.js)
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
  if (window.JDW_CF && window.JDW_CF.play) return Promise.resolve(window.JDW_CF);
  if (ENGINE) return ENGINE;
  ENGINE = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const run = async (url, opt) => {
      const gz = await fetchBytes(url, onProg, 240000, signal, opt);
      const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      await new Promise((res, rej) => {
        const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
        s.src = u; document.head.appendChild(s);
      });
      if (!window.JDW_CF || !window.JDW_CF.play) throw new Error('moteur absent');
      return window.JDW_CF.v;
    };
    const got = await run(ROOT() + 'assets/coffres.moteur.bin');
    if (got !== WANT && !/__CF_ENGINE__/.test(WANT)) {
      // un vieux moteur gardé quelque part : on le jette et on va le chercher au serveur (l'adresse avec ?v= passe à côté du service worker)
      window.JDW_CF = undefined;
      const again = await run(ROOT() + 'assets/coffres.moteur.bin?v=' + WANT.slice(3) + '-' + Date.now(), { cache: 'reload' });
      try { if (window.JDW_SHELL_LOG) window.JDW_SHELL_LOG('Coffres : vieux moteur ' + got + ' remplacé par ' + again); } catch (e) { /* rien */ }
    }
    return window.JDW_CF;
  })();
  ENGINE.catch(() => { ENGINE = null; });
  return ENGINE;
}

/* ---------- vignette 2D : un couvercle vu de haut, les pièces glissent, la clé dorée sort par la fente ---------- */
const TAU = Math.PI * 2;
let BG = null;
function woodFill(x, x0, y0, w, h, a, b, seed, vertical) {
  const g = vertical ? x.createLinearGradient(x0, 0, x0 + w, 0) : x.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, a);
  x.fillStyle = g; x.fillRect(x0, y0, w, h);
  x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip();
  let sd = seed; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  x.strokeStyle = 'rgba(40,16,4,.22)'; x.lineWidth = 0.8;
  for (let i = 0; i < 7; i++) {
    x.beginPath();
    if (vertical) { const px = x0 + r() * w; for (let t = 0; t <= 1.001; t += 0.1) x.lineTo(px + Math.sin(t * 6 + i) * w * 0.06, y0 + t * h); }
    else { const py = y0 + r() * h; for (let t = 0; t <= 1.001; t += 0.1) x.lineTo(x0 + t * w, py + Math.sin(t * 6 + i) * h * 0.06); }
    x.stroke();
  }
  x.restore();
}
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const g = x.createRadialGradient(w * 0.62, h * 0.45, 10, w * 0.6, h * 0.5, w * 0.8);
  g.addColorStop(0, '#4a2a14'); g.addColorStop(0.6, '#1c0e06'); g.addColorStop(1, '#080402');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // poussière dorée dans la lumière
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 30; i++) { const px = w * 0.3 + r() * w * 0.7, py = r() * h, s = 0.6 + r() * 1.6; x.fillStyle = 'rgba(255,214,140,' + (0.15 + r() * 0.35) + ')'; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill(); }
  // le coffre
  // le coffre à droite (sous l'étiquette « Nouveau »), le titre à gauche
  const N = 6, bw0 = Math.min(h * 0.66, w * 0.46), cell = bw0 / (N + 1.1), bw = cell * N, bx = w * 0.97 - bw - cell * 0.55, by = h * 0.6 - bw / 2;
  x.fillStyle = 'rgba(0,0,0,.55)'; rr(x, bx - cell * 0.55 + 6, by - cell * 0.55 + 9, bw + cell * 1.1, bw + cell * 1.1, cell * 0.35); x.fill();
  woodFill(x, bx - cell * 0.55, by - cell * 0.55, bw + cell * 1.1, bw + cell * 1.1, '#5a3014', '#7a4520', 5);
  x.strokeStyle = '#e0aa48'; x.lineWidth = 1.5; rr(x, bx - cell * 0.5, by - cell * 0.5, bw + cell, bw + cell, cell * 0.3); x.stroke();
  woodFill(x, bx, by, bw, bw, '#d9b47a', '#ecd09a', 9);
  x.strokeStyle = 'rgba(255,240,210,.35)'; x.lineWidth = 1;
  for (let i = 1; i < N; i++) { x.beginPath(); x.moveTo(bx + i * cell, by); x.lineTo(bx + i * cell, by + bw); x.moveTo(bx, by + i * cell); x.lineTo(bx + bw, by + i * cell); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(bx, by, bw, 3);
  // la fente à droite, rangée 3
  x.fillStyle = '#120804'; x.fillRect(bx + bw - 1, by + cell * 2 + 2, cell * 0.6, cell - 4);
  x.fillStyle = '#e0aa48'; x.fillRect(bx + bw - 1, by + cell * 2, cell * 0.6, 2); x.fillRect(bx + bw - 1, by + cell * 3 - 2, cell * 0.6, 2);
  // titre à gauche (l'étiquette « Nouveau » de la borne se pose en haut à droite)
  const font = "'Bungee', Impact, sans-serif";
  x.textAlign = 'left'; x.textBaseline = 'middle'; const tx = w * 0.05, room = Math.max(40, bx - cell * 0.7 - tx);
  const fit = (t, big) => { let f = big; x.font = '400 ' + f + 'px ' + font; while (f > 9 && x.measureText(t).width > room) { f -= 1; x.font = '400 ' + f + 'px ' + font; } return f; };
  const f1 = fit('COFFRES', Math.round(h * 0.15)), f2 = fit('À SECRETS', Math.round(f1 * 0.62)), y1 = h * 0.5 - f1 * 0.45;
  x.font = '400 ' + f1 + 'px ' + font; x.lineWidth = 4; x.strokeStyle = '#2a1204'; x.strokeText('COFFRES', tx, y1);
  x.shadowColor = '#ffb64a'; x.shadowBlur = 14; x.fillStyle = '#ffe3a0'; x.fillText('COFFRES', tx, y1); x.shadowBlur = 0;
  x.font = '400 ' + f2 + 'px ' + font; x.lineWidth = 3; x.strokeText('À SECRETS', tx + 1, y1 + f1 * 0.92);
  x.shadowColor = '#ffcf6a'; x.shadowBlur = 10; x.fillStyle = '#f3c25a'; x.fillText('À SECRETS', tx + 1, y1 + f1 * 0.92); x.shadowBlur = 0;
  return { c, w, h, cell, bx, by, bw };
}
// petite énigme jouée en boucle : [x, y, w, h, couleur]
const PCS = [[0, 2, 2, 1, 'key'], [2, 2, 1, 2, '#9a4a22'], [4, 1, 1, 3, '#6a3818'], [1, 4, 2, 1, '#b8642e'], [3, 0, 2, 1, '#7a4a28'], [0, 0, 1, 2, '#a85a2a'], [5, 4, 1, 2, '#8a4420']];
const SEQ = [[3, -1, 0], [1, 0, 1], [2, 0, 2], [0, 4, 0]];   // pièce, dx, dy
function piece2d(x, B, p, px, py, t) {
  const c = B.cell, X = B.bx + px * c + 2, Y = B.by + py * c + 2, W = p[2] * c - 4, H = p[3] * c - 4;
  x.fillStyle = 'rgba(0,0,0,.4)'; rr(x, X + 2, Y + 3, W, H, c * 0.18); x.fill();
  if (p[4] === 'key') {
    const g = x.createLinearGradient(X, Y, X, Y + H); g.addColorStop(0, '#fff0b0'); g.addColorStop(0.45, '#f5c542'); g.addColorStop(1, '#b07a14');
    x.fillStyle = g; rr(x, X, Y, W, H, c * 0.18); x.fill();
    x.strokeStyle = 'rgba(90,50,8,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(X + H * 0.55, Y + H / 2, H * 0.2, 0, TAU); x.moveTo(X + H * 0.75, Y + H / 2); x.lineTo(X + W - 8, Y + H / 2); x.lineTo(X + W - 8, Y + H * 0.72); x.stroke();
    const s = 0.5 + 0.5 * Math.sin(t * 4); x.fillStyle = 'rgba(255,255,230,' + (0.25 + s * 0.35) + ')'; x.beginPath(); x.ellipse(X + W * 0.3, Y + H * 0.28, W * 0.18, H * 0.1, 0, 0, TAU); x.fill();
  } else {
    const g = x.createLinearGradient(X, Y, X + (p[2] > p[3] ? 0 : W), Y + (p[2] > p[3] ? H : 0)); g.addColorStop(0, p[4]); g.addColorStop(0.5, '#ffffff22'); g.addColorStop(1, p[4]);
    x.fillStyle = p[4]; rr(x, X, Y, W, H, c * 0.18); x.fill(); x.fillStyle = g; x.globalAlpha = 0.6; x.fill(); x.globalAlpha = 1;
    x.strokeStyle = 'rgba(255,230,190,.25)'; x.lineWidth = 1; rr(x, X + 1, Y + 1, W - 2, H - 2, c * 0.15); x.stroke();
    x.strokeStyle = 'rgba(30,12,2,.5)'; x.lineWidth = 2; x.beginPath();
    if (p[2] > p[3]) { x.moveTo(X + W * 0.3, Y + H / 2); x.lineTo(X + W * 0.7, Y + H / 2); } else { x.moveTo(X + W / 2, Y + H * 0.3); x.lineTo(X + W / 2, Y + H * 0.7); }
    x.stroke();
  }
}
function preview(ctx, w, h, t) {
  if (!BG || BG.w !== w || BG.h !== h) BG = background(w, h);
  ctx.drawImage(BG.c, 0, 0, w, h);
  const cyc = 7.5, k = t % cyc, step = 1.1;
  const pos = PCS.map(p => [p[0], p[1]]);
  let glow = 0;
  for (let i = 0; i < SEQ.length; i++) {
    const t0 = 0.6 + i * step, f = Math.max(0, Math.min(1, (k - t0) / (i === SEQ.length - 1 ? 0.9 : 0.45)));
    const e = 1 - Math.pow(1 - f, 3), [pi, dx, dy] = SEQ[i];
    pos[pi][0] += dx * e; pos[pi][1] += dy * e;
    if (i === SEQ.length - 1 && f > 0.7) glow = (f - 0.7) / 0.3;
  }
  const fade = k > cyc - 0.6 ? (cyc - k) / 0.6 : k < 0.3 ? k / 0.3 : 1;
  ctx.save(); ctx.beginPath(); ctx.rect(BG.bx, BG.by - 4, BG.bw + BG.cell * 2, BG.bw + 8); ctx.clip();
  ctx.globalAlpha = fade;
  PCS.forEach((p, i) => piece2d(ctx, BG, p, pos[i][0], pos[i][1], t));
  ctx.restore(); ctx.globalAlpha = 1;
  const after = k > 0.6 + 3 * step + 0.9 ? Math.min(1, (k - (0.6 + 3 * step + 0.9)) / 0.4) : 0;
  if (glow || after) {
    const gx = BG.bx + BG.bw + BG.cell * 0.3, gy = BG.by + BG.cell * 2.5, R = BG.cell * (1.2 + after * 1.6);
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, R); g.addColorStop(0, 'rgba(255,240,180,' + 0.8 * fade + ')'); g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, R, 0, TAU); ctx.fill();
    if (after) for (let i = 0; i < 10; i++) { const a = i * 0.63 + t, d = BG.cell * (0.6 + after * 1.4 + (i % 3) * 0.3); ctx.fillStyle = 'rgba(255,230,150,' + (1 - after * 0.6) * fade + ')'; ctx.beginPath(); ctx.arc(gx + Math.cos(a) * d, gy + Math.sin(a) * d * 0.8, 1.6, 0, TAU); ctx.fill(); }
  }
}

/* ---------- lancement : petit écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#4a2a14,#0a0503 70%);color:#f6e6c8;font-family:' + FB;
  box.innerHTML = '<div style="font:400 38px ' + FD + ';color:#ffe3a0;text-shadow:0 4px 0 #2a1204,0 0 22px rgba(255,182,74,.6)">COFFRES</div>' +
    '<div style="font:400 22px ' + FD + ';color:#f3c25a;margin-top:-2px;text-shadow:0 0 16px rgba(255,207,106,.6)">À SECRETS</div>' +
    '<div style="margin-top:16px;width:min(300px,62vw);height:14px;border-radius:7px;background:#1c0e06;box-shadow:0 0 0 1.5px rgba(224,170,72,.5);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#b07a2a,#ffd56a);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#e2c79a">On sort les coffres de l\'atelier…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const proxy = {
    destroy() { dead = true; if (ac) ac.abort(); if (inst) inst.destroy(); root.innerHTML = ''; },
    currentScore: () => (inst && inst.currentScore ? inst.currentScore() : 0),
    currentLevel: () => (inst && inst.currentLevel ? inst.currentLevel() : 1),
    pause() { if (inst && inst.pause) inst.pause(); },
    resume() { if (inst && inst.resume) inst.resume(); },
    // regarder un copain (regarder.js) : la 3D ne se redessine que quand une pièce bouge ; une image tout de suite pour le spectateur
    castRedraw() { const d = inst && inst._debug ? inst._debug() : null; if (d && d.stage) d.stage.dirty = true; },
    _debug: () => (inst && inst._debug ? inst._debug() : null)
  };
  const fail = () => {
    if (dead) return;
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#ffe3a0;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#e2c79a;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#2a1404;background:#ffd56a;border:0;border-radius:12px;padding:10px 20px;box-shadow:0 5px 0 #8a5412;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => { if (dead) return; root.innerHTML = ''; const n = mount(root, api); Object.assign(proxy, n); });
  };
  loadEngine((p) => { bar.style.width = Math.round(p * 100) + '%'; }, ac && ac.signal).then((E) => {
    if (dead) return;
    try { inst = E.play(root, api); } catch (e) { fail(); throw e; }
  }).catch((e) => { if (!dead) fail(); });
  return proxy;
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.coffres = {
  id: 'coffres',
  title: 'Coffres à Secrets',
  tagline: 'Fais glisser les pièces du couvercle et sors la clé dorée : le coffre s\'ouvre !',
  accent: '#e0aa48',
  scoreLabel: 'points',
  saves: true,                        // la partie est gardée à tout moment (api.save) : Quitter n'arrête rien, sans question
  fps: false,                         // pas de compteur d'images de la borne par-dessus le titre
  pad: { help: [['ls/dpad', 'Choisir une pièce'], ['a', 'Prendre / poser'], ['ls/dpad', 'Glisser (pièce prise)'], ['x', 'Plateau dans l\'autre sens'], ['lb', 'Annuler'], ['rb', 'Refaire']] },
  preview, mount
};
})();
