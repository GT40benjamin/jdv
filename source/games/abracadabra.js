(() => {
'use strict';
// Abracadabra — on appuie sur GO et on DIT des noms (« vache », « piano », « tonneau »…) : un éclair part du bâton magique et l'objet tombe
// dans le Grand Fleuve, en vrai objet 3D (physique). But : traverser le fleuve à plusieurs sur ce qui flotte et s'empile.
// La voix est reconnue SUR L'APPAREIL (Vosk, le même moteur et le même modèle français que les mots du hub de Pégase ; rien n'est envoyé).
// Ce petit module s'enregistre dans la borne et dessine la vignette en 2D ; au lancement, il charge le moteur (assets/abracadabra.moteur.bin :
// three.js r180 + Rapier + le jeu, gzippé) et les objets (assets/abra.fleuve.bin : modèles de l'Asset Store EMBALLÉS avec la clé du site,
// jamais en clair). Une seule variable globale en plus : window.JDW_ABRA. Atelier : ~/jdv-tools/duotest/abracadabra (REPRISE.md).
const NOM = 'Abracadabra', ID = 'abracadabra';
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
  if (window.JDW_ABRA && window.JDW_ABRA.game) return Promise.resolve(window.JDW_ABRA);
  if (STORE.engine) return STORE.engine;
  STORE.engine = (async () => {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien');
    const gz = await fetchBytes(ROOT() + 'assets/abracadabra.moteur.bin', onProg, 900000, signal);
    const code = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    await new Promise((res, rej) => {
      const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      s.onload = () => { URL.revokeObjectURL(u); res(); }; s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur illisible')); };
      s.src = u; document.head.appendChild(s);
    });
    if (!window.JDW_ABRA || !window.JDW_ABRA.game) throw new Error('moteur absent');
    return window.JDW_ABRA;
  })();
  STORE.engine.catch(() => { STORE.engine = null; });
  return STORE.engine;
}
// paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; en-tête { v, e: { 'type:nom': { o, l, t } } }
function loadPack(onProg, signal, nom = 'fleuve') {
  const K = 'pack_' + nom;
  if (STORE[K]) return STORE[K];
  STORE[K] = (async () => {
    const buf = await fetchBytes(ROOT() + 'assets/abra.' + nom + '.bin', onProg, nom === 'fleuve' ? 1900000 : 2500000, signal);
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
    const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl;
    const glb = {}, img = {}, json = {};
    await Promise.all(Object.keys(head.e).map(async (k) => {
      const e = head.e[k], raw = plain.slice(base + e.o, base + e.o + e.l), nom = k.slice(k.indexOf(':') + 1);
      if (e.t === 'glb') glb[nom] = raw.buffer;
      else if (e.t === 'json') { try { json[nom] = JSON.parse(new TextDecoder().decode(raw)); } catch (er) { /* rien */ } }
      else if (e.t === 'webp') img[nom] = await new Promise((res) => { const im = new Image(), u = URL.createObjectURL(new Blob([raw], { type: 'image/webp' })); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
    }));
    return { glb, img, json };
  })();
  STORE[K].catch(() => { STORE[K] = null; });
  return STORE[K];
}

/* ---------- vignette 2D (« plus folle, plus abracadabresque ») : un ciel violet et or, un nuage d'étincelles d'où PLEUVENT des objets
   absurdes (vache, tonneau, piano, zombie rigolo, poisson, canard, rocher) qui tournoient vers le Grand Fleuve ; un pont branlant de bric et
   de broc ; un sorcier foufou au chapeau étoilé qui danse dessus ; le grand BÂTON (sucre d'orge, cristal rose, deux yeux) qui lance l'ÉCLAIR ;
   le titre en lettres magiques qui sautillent. Tout est dessiné ici (aucun modèle ni image de l'Asset Store). ---------- */
const TAU = Math.PI * 2;
let BG = null;
const OUT = '#2a0c3a';
function background(w, h) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 2); c.height = Math.round(h * 2);
  const x = c.getContext('2d'); x.scale(2, 2);
  const sky = x.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#2b0f5e'); sky.addColorStop(0.45, '#7b2fb0'); sky.addColorStop(0.8, '#ff7ab6'); sky.addColorStop(1, '#ffd36a');
  x.fillStyle = sky; x.fillRect(0, 0, w, h);
  let sd = 7; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  // collines violettes au loin
  for (const [y0, col, a] of [[0.5, '#8a3fc4', 9], [0.56, '#5b2a9a', 12]]) {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
    for (let i = 0; i <= 24; i++) x.lineTo(w * i / 24, h * y0 - Math.abs(Math.sin(i * 0.9 + a)) * h * 0.07 - Math.sin(i * 2.3) * h * 0.012);
    x.lineTo(w, h); x.fill();
  }
  // les rives (herbe) et la plage du fleuve en perspective
  const rive = x.createLinearGradient(0, h * 0.58, 0, h); rive.addColorStop(0, '#3fae6a'); rive.addColorStop(1, '#1f7a4c');
  x.fillStyle = rive; x.fillRect(0, h * 0.6, w, h * 0.4);
  x.fillStyle = '#e8c98a'; x.beginPath(); x.moveTo(w * 0.40, h * 0.6); x.lineTo(w * 0.60, h * 0.6); x.lineTo(w * 1.02, h); x.lineTo(w * -0.02, h); x.fill();
  for (let i = 0; i < 60; i++) { const gx = r() * w, gy = h * 0.62 + r() * h * 0.38, k = (gy - h * 0.6) / (h * 0.4); if (gx > w * (0.39 - 0.4 * k) && gx < w * (0.61 + 0.4 * k)) continue; x.fillStyle = r() < 0.5 ? '#7be08f' : '#2c8f57'; x.fillRect(gx, gy, 1.6, -4 - r() * 5); }
  return { c };
}
function etoile(x, cx, cy, R, rot) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
function trait(x, s) { x.lineWidth = Math.max(1.2, s * 0.07); x.strokeStyle = OUT; x.lineJoin = 'round'; x.lineCap = 'round'; }
// les objets qui pleuvent (dessinés autour de 0,0, taille s)
const OBJETS = {
  vache(x, s) {
    trait(x, s);
    for (const lx of [-0.32, -0.12, 0.14, 0.32]) { x.fillStyle = '#fff'; x.beginPath(); x.rect(lx * s - s * 0.05, s * 0.12, s * 0.1, s * 0.26); x.fill(); x.stroke(); }
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, s * 0.45, s * 0.26, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#4a2a1a'; x.beginPath(); x.ellipse(-s * 0.15, -s * 0.05, s * 0.12, s * 0.09, 0.4, 0, TAU); x.ellipse(s * 0.18, s * 0.08, s * 0.08, s * 0.06, 0, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(s * 0.48, -s * 0.16, s * 0.17, s * 0.15, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#ffb3c8'; x.beginPath(); x.ellipse(s * 0.6, -s * 0.1, s * 0.09, s * 0.07, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = OUT; x.beginPath(); x.arc(s * 0.46, -s * 0.2, s * 0.03, 0, TAU); x.fill();
    x.fillStyle = '#ffe08a'; x.beginPath(); x.moveTo(s * 0.4, -s * 0.28); x.lineTo(s * 0.36, -s * 0.4); x.lineTo(s * 0.46, -s * 0.3); x.fill(); x.stroke();
  },
  tonneau(x, s) {
    trait(x, s); const g = x.createLinearGradient(-s * 0.3, 0, s * 0.3, 0); g.addColorStop(0, '#7a4520'); g.addColorStop(0.5, '#c9803e'); g.addColorStop(1, '#6a3a18');
    x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.26, -s * 0.38); x.quadraticCurveTo(-s * 0.38, 0, -s * 0.26, s * 0.38); x.lineTo(s * 0.26, s * 0.38); x.quadraticCurveTo(s * 0.38, 0, s * 0.26, -s * 0.38); x.closePath(); x.fill(); x.stroke();
    x.strokeStyle = '#3a3a44'; x.lineWidth = s * 0.06; for (const y of [-0.24, 0.24]) { x.beginPath(); x.moveTo(-s * 0.32, y * s); x.lineTo(s * 0.32, y * s); x.stroke(); }
  },
  piano(x, s) {
    trait(x, s); x.fillStyle = '#1c1426'; x.beginPath(); x.moveTo(-s * 0.45, -s * 0.05); x.lineTo(s * 0.1, -s * 0.05); x.bezierCurveTo(s * 0.35, -s * 0.05, s * 0.3, -s * 0.38, s * 0.5, -s * 0.36); x.lineTo(s * 0.5, s * 0.12); x.lineTo(-s * 0.45, s * 0.12); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.fillRect(-s * 0.42, s * 0.12, s * 0.6, s * 0.1); x.fillStyle = OUT; for (let i = 0; i < 7; i++) x.fillRect(-s * 0.38 + i * s * 0.085, s * 0.12, s * 0.035, s * 0.06);
    x.strokeRect(-s * 0.42, s * 0.12, s * 0.6, s * 0.1);
    x.fillStyle = '#1c1426'; for (const lx of [-0.38, 0.1, 0.42]) x.fillRect(lx * s, s * 0.22, s * 0.05, s * 0.2);
  },
  zombie(x, s) {   // une bonne tête verte toute ronde : yeux qui louchent, langue tirée, une couture (rigolo, jamais effrayant)
    trait(x, s); x.fillStyle = '#8fe07a'; x.beginPath(); x.arc(0, 0, s * 0.38, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-s * 0.13, -s * 0.06, s * 0.12, 0, TAU); x.fill(); x.stroke(); x.beginPath(); x.arc(s * 0.15, -s * 0.08, s * 0.09, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = OUT; x.beginPath(); x.arc(-s * 0.09, -s * 0.03, s * 0.05, 0, TAU); x.fill(); x.beginPath(); x.arc(s * 0.12, -s * 0.11, s * 0.04, 0, TAU); x.fill();
    x.fillStyle = '#ff7aa8'; x.beginPath(); x.ellipse(s * 0.04, s * 0.22, s * 0.07, s * 0.1, 0.2, 0, TAU); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-s * 0.12, s * 0.15); x.quadraticCurveTo(0, s * 0.2, s * 0.14, s * 0.12); x.stroke();
    x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(-s * 0.3, -s * 0.22); x.lineTo(-s * 0.1, -s * 0.3); for (let i = 0; i < 3; i++) { x.moveTo(-s * (0.26 - i * 0.07), -s * 0.3); x.lineTo(-s * (0.24 - i * 0.07), -s * 0.2); } x.stroke();
  },
  poisson(x, s) {
    trait(x, s); x.fillStyle = '#ff9a30'; x.beginPath(); x.moveTo(s * 0.45, 0); x.quadraticCurveTo(s * 0.1, -s * 0.32, -s * 0.25, 0); x.quadraticCurveTo(s * 0.1, s * 0.32, s * 0.45, 0); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-s * 0.22, 0); x.lineTo(-s * 0.46, -s * 0.2); x.lineTo(-s * 0.42, s * 0.2); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(s * 0.25, -s * 0.05, s * 0.07, 0, TAU); x.fill(); x.stroke(); x.fillStyle = OUT; x.beginPath(); x.arc(s * 0.27, -s * 0.05, s * 0.03, 0, TAU); x.fill();
  },
  canard(x, s) {
    trait(x, s); x.fillStyle = '#ffd640'; x.beginPath(); x.ellipse(0, s * 0.1, s * 0.36, s * 0.22, 0, 0, TAU); x.fill(); x.stroke();
    x.beginPath(); x.arc(s * 0.18, -s * 0.18, s * 0.17, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#ff8a2a'; x.beginPath(); x.ellipse(s * 0.38, -s * 0.14, s * 0.1, s * 0.05, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = OUT; x.beginPath(); x.arc(s * 0.22, -s * 0.22, s * 0.03, 0, TAU); x.fill();
  },
  rocher(x, s) {
    trait(x, s); const g = x.createLinearGradient(0, -s * 0.3, 0, s * 0.3); g.addColorStop(0, '#b7b0c8'); g.addColorStop(1, '#6d6680');
    x.fillStyle = g; x.beginPath(); x.moveTo(-s * 0.4, s * 0.25); x.lineTo(-s * 0.32, -s * 0.12); x.lineTo(-s * 0.08, -s * 0.3); x.lineTo(s * 0.26, -s * 0.22); x.lineTo(s * 0.42, s * 0.05); x.lineTo(s * 0.3, s * 0.28); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(-s * 0.25, -s * 0.08); x.lineTo(-s * 0.06, -s * 0.22); x.lineTo(s * 0.05, -s * 0.12); x.closePath(); x.fill();
  },
};
const PLUIE = ['vache', 'tonneau', 'piano', 'zombie', 'poisson', 'canard', 'rocher'];
// le grand bâton : sucre d'orge violet / turquoise / or, spirale dorée, cristal rose et deux yeux qui regardent l'éclair
function baton(x, bx, by, s, t, lance) {
  x.save(); x.translate(bx, by); x.rotate(-0.42 - lance * 0.12);
  const L = s * 2.1, W = s * 0.13;
  x.save(); x.beginPath(); x.rect(-W / 2, 0, W, L); x.clip();
  x.fillStyle = '#7b3cff'; x.fillRect(-W, 0, W * 2, L);
  for (let i = -2; i < 16; i++) { x.fillStyle = i % 2 ? '#33e0d0' : '#ffd23a'; x.beginPath(); x.moveTo(-W, i * W * 1.6); x.lineTo(W, i * W * 1.6 - W * 1.4); x.lineTo(W, i * W * 1.6 - W * 0.9); x.lineTo(-W, i * W * 1.6 + W * 0.5); x.fill(); }
  x.restore(); trait(x, s * 0.6); x.strokeRect(-W / 2, 0, W, L);
  // spirale dorée
  x.strokeStyle = '#ffcf4a'; x.lineWidth = s * 0.045; x.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 1.5; x.lineTo(Math.cos(a) * s * 0.13, -s * 0.05 - i / 30 * s * 0.2); } x.stroke();
  // cristal rose et sa lueur
  const cy = -s * 0.32, R = s * (0.55 + lance * 0.4), gl = x.createRadialGradient(0, cy, 0, 0, cy, R); gl.addColorStop(0, 'rgba(255,170,240,.9)'); gl.addColorStop(1, 'rgba(255,120,220,0)');
  x.fillStyle = gl; x.beginPath(); x.arc(0, cy, R, 0, TAU); x.fill();
  x.fillStyle = '#ff7ad8'; trait(x, s * 0.6); x.beginPath(); x.moveTo(0, cy - s * 0.2); x.lineTo(s * 0.13, cy); x.lineTo(0, cy + s * 0.14); x.lineTo(-s * 0.13, cy); x.closePath(); x.fill(); x.stroke();
  // les yeux (ils regardent vers le nuage)
  for (const ex of [-0.09, 0.09]) { x.fillStyle = '#fff'; x.beginPath(); x.arc(ex * s, -s * 0.06, s * 0.075, 0, TAU); x.fill(); x.stroke(); x.fillStyle = OUT; x.beginPath(); x.arc(ex * s - s * 0.02 + Math.sin(t * 7 + ex * 40) * s * 0.012, -s * 0.09, s * 0.035, 0, TAU); x.fill(); }
  x.restore();
}
// le sorcier foufou (petit, sur le pont) : robe étoilée, chapeau tordu, bras en l'air
function sorcier(x, cx, cy, s, t) {
  x.save(); x.translate(cx, cy - Math.abs(Math.sin(t * 6)) * s * 0.12); x.rotate(Math.sin(t * 6) * 0.12);
  trait(x, s);
  x.fillStyle = '#33c0e0'; x.beginPath(); x.moveTo(-s * 0.32, 0); x.lineTo(s * 0.32, 0); x.lineTo(s * 0.16, -s * 0.62); x.lineTo(-s * 0.16, -s * 0.62); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#ffe08a'; for (const [sx, sy] of [[-0.1, -0.2], [0.12, -0.38], [0.02, -0.1]]) { etoile(x, sx * s, sy * s, s * 0.06, t); x.fill(); }
  x.strokeStyle = OUT; x.lineWidth = s * 0.08; x.beginPath(); x.moveTo(-s * 0.14, -s * 0.5); x.lineTo(-s * 0.36, -s * 0.85 - Math.sin(t * 6) * s * 0.08); x.moveTo(s * 0.14, -s * 0.5); x.lineTo(s * 0.38, -s * 0.82 + Math.sin(t * 6) * s * 0.08); x.stroke();
  x.fillStyle = '#ffd2a8'; trait(x, s); x.beginPath(); x.arc(0, -s * 0.76, s * 0.17, 0, TAU); x.fill(); x.stroke();
  x.fillStyle = OUT; x.beginPath(); x.arc(-s * 0.06, -s * 0.78, s * 0.025, 0, TAU); x.fill(); x.beginPath(); x.arc(s * 0.06, -s * 0.78, s * 0.025, 0, TAU); x.fill();
  x.beginPath(); x.arc(0, -s * 0.72, s * 0.07, 0.2, Math.PI - 0.2); x.stroke();
  // le chapeau qui se tord
  x.fillStyle = '#9b4dff'; x.beginPath(); x.moveTo(-s * 0.26, -s * 0.86); x.lineTo(s * 0.26, -s * 0.86);
  x.quadraticCurveTo(s * 0.12, -s * 1.2, s * 0.32 + Math.sin(t * 4) * s * 0.06, -s * 1.42); x.quadraticCurveTo(-s * 0.02, -s * 1.22, -s * 0.26, -s * 0.86); x.fill(); x.stroke();
  x.fillStyle = '#ffe08a'; etoile(x, s * 0.32 + Math.sin(t * 4) * s * 0.06, -s * 1.44, s * 0.09, t * 2); x.fill(); x.stroke();
  x.restore();
}
function eclair(x, ax, ay, bx, by, t, s) {
  let sd = Math.floor(t * 14) * 977 + 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647) - 0.5;
  const P = [[ax, ay]]; const N = 9;
  for (let i = 1; i < N; i++) { const u = i / N; P.push([ax + (bx - ax) * u + r() * s * 0.5, ay + (by - ay) * u + r() * s * 0.5]); }
  P.push([bx, by]);
  x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
  for (const [lw, c, b] of [[s * 0.34, 'rgba(199,155,255,.45)', s * 0.6], [s * 0.14, '#ffb0f0', s * 0.3], [s * 0.05, '#ffffff', 0]]) {
    x.strokeStyle = c; x.lineWidth = lw; x.shadowColor = '#ff7ad8'; x.shadowBlur = b; x.beginPath(); P.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
  }
  x.restore();
}
function preview(ctx, w, h, t) {
  try {
    if (!BG || BG.w !== w || BG.h !== h) BG = Object.assign(background(w, h), { w, h });
    const x = ctx, s = Math.min(w, h * 1.15) * 0.16;
    x.drawImage(BG.c, 0, 0, w, h);
    // étoiles qui scintillent
    for (let i = 0; i < 26; i++) { const sx = ((i * 97) % 101) / 101 * w, sy = ((i * 53) % 47) / 47 * h * 0.42, a = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i)); x.globalAlpha = a; x.fillStyle = i % 3 ? '#fff' : '#ffe08a'; etoile(x, sx, sy, 1 + (i % 3) * 0.9, t + i); x.fill(); }
    x.globalAlpha = 1;
    // le fleuve : turquoise, avec des vaguelettes qui filent
    const ri = x.createLinearGradient(0, h * 0.6, 0, h); ri.addColorStop(0, '#7ef0e8'); ri.addColorStop(1, '#1a8fb0');
    x.fillStyle = ri; x.beginPath(); x.moveTo(w * 0.42, h * 0.6); x.lineTo(w * 0.58, h * 0.6); x.lineTo(w * 0.94, h); x.lineTo(w * 0.06, h); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) { const u = ((i / 9 + t * 0.12) % 1), y = h * 0.6 + u * u * h * 0.4, half = w * (0.08 + 0.36 * u * u), cx = w * 0.5 + Math.sin(i * 2.1) * half * 0.6; x.globalAlpha = 0.25 + 0.6 * u; x.beginPath(); x.moveTo(cx - 6 - 10 * u, y); x.quadraticCurveTo(cx, y - 2, cx + 6 + 10 * u, y); x.stroke(); }
    x.globalAlpha = 1;
    // le nuage magique (tourbillon d'étincelles) d'où tombent les objets
    const nx = w * 0.5, ny = h * 0.36;
    const ng = x.createRadialGradient(nx, ny, 0, nx, ny, s * 1.6); ng.addColorStop(0, 'rgba(255,240,200,.95)'); ng.addColorStop(0.35, 'rgba(255,140,220,.55)'); ng.addColorStop(1, 'rgba(160,80,255,0)');
    x.fillStyle = ng; x.beginPath(); x.ellipse(nx, ny, s * 1.9, s * 1.05, 0, 0, TAU); x.fill();
    for (let i = 0; i < 22; i++) { const a = t * (1.5 + (i % 4) * 0.3) + i * 0.8, rr = s * (0.4 + (i % 5) * 0.22); x.fillStyle = ['#ffe08a', '#7ef0e8', '#ffb0f0', '#fff'][i % 4]; etoile(x, nx + Math.cos(a) * rr * 1.5, ny + Math.sin(a) * rr * 0.6, 1.4 + (i % 3), a); x.fill(); }
    // le pont de bric et de broc (il branle)
    const py = h * 0.8, sw = Math.sin(t * 2.2) * 0.05;
    x.save(); x.translate(w * 0.5, py); x.rotate(sw);
    trait(x, s);
    x.fillStyle = '#c9803e'; x.save(); x.rotate(-0.08); x.fillRect(-w * 0.42, -s * 0.1, w * 0.4, s * 0.2); x.strokeRect(-w * 0.42, -s * 0.1, w * 0.4, s * 0.2); x.restore();
    x.fillStyle = '#b06f30'; x.save(); x.rotate(0.12); x.fillRect(-w * 0.04, -s * 0.08, w * 0.44, s * 0.18); x.strokeRect(-w * 0.04, -s * 0.08, w * 0.44, s * 0.18); x.restore();
    x.save(); x.translate(-w * 0.12, s * 0.28); x.rotate(0.3); OBJETS.tonneau(x, s * 0.7); x.restore();
    x.save(); x.translate(w * 0.18, s * 0.3); x.rotate(-0.2); x.fillStyle = '#d9a05a'; trait(x, s); x.fillRect(-s * 0.26, -s * 0.22, s * 0.52, s * 0.44); x.strokeRect(-s * 0.26, -s * 0.22, s * 0.52, s * 0.44); x.beginPath(); x.moveTo(-s * 0.26, -s * 0.22); x.lineTo(s * 0.26, s * 0.22); x.stroke(); x.restore();
    x.restore();
    sorcier(x, w * 0.47, py - s * 0.1, s * 0.8, t);
    // la pluie d'objets absurdes : chacun jaillit du nuage, tournoie et file vers le fleuve
    const per = 2.6;
    for (let i = 0; i < PLUIE.length; i++) {
      const u = ((t / per) + i / PLUIE.length) % 1, k = PLUIE[i];
      const dir = (i % 2 ? 1 : -1) * (0.16 + (i % 3) * 0.11);
      const ox = nx + dir * w * u * 1.25, oy = ny + (h * 0.48) * u * u + s * 0.2 * u;
      const sc = s * (0.35 + 0.55 * Math.min(1, u * 4)) * (k === 'piano' || k === 'vache' ? 1.2 : 0.95);
      x.save(); x.globalAlpha = Math.min(1, u * 6, (1 - u) * 5); x.translate(ox, oy); x.rotate((i % 2 ? 1 : -1) * (t * 2.2 + i)); OBJETS[k](x, sc); x.restore();
    }
    x.globalAlpha = 1;
    // le BÂTON et son éclair (qui claque par moments)
    const ph = (t * 0.9) % 1, lance = ph < 0.3 ? 1 - ph / 0.3 : 0;
    const bx = w * 0.8, by = h * 0.64, tipx = bx + Math.sin(0.42 + lance * 0.12) * s * 0.46, tipy = by - Math.cos(0.42 + lance * 0.12) * s * 0.46;
    if (lance > 0) eclair(x, tipx, tipy, nx + s * 0.4, ny + s * 0.2, t, s);
    baton(x, bx, by, s * 1.45, t, lance);
    if (lance > 0.6) { x.fillStyle = 'rgba(255,255,255,' + ((lance - 0.6) * 0.6).toFixed(2) + ')'; x.fillRect(0, 0, w, h); }
    // le titre en lettres magiques qui sautillent
    const TXT = 'ABRACADABRA', fs = Math.min(w / 10.2, h / 6.2);
    x.font = '400 ' + fs + 'px Bungee, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const larg = x.measureText(TXT).width, x0 = w / 2 - larg / 2, y0 = (w < 260 ? h * 0.26 : h * 0.13) + fs * 0.5;   // petite tuile (téléphone) : sous l'étiquette « NOUVEAU »
    let cx = x0;
    for (let i = 0; i < TXT.length; i++) {
      const L = TXT[i], lw = x.measureText(L).width, yy = y0 + Math.sin(t * 4 + i * 0.7) * fs * 0.1, rot = Math.sin(t * 3 + i) * 0.08;
      x.save(); x.translate(cx + lw / 2, yy); x.rotate(rot);
      x.lineWidth = fs * 0.2; x.strokeStyle = OUT; x.strokeText(L, 0, 0);
      const g = x.createLinearGradient(0, -fs * 0.5, 0, fs * 0.5); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#ff8a2a');
      x.fillStyle = g; x.fillText(L, 0, 0); x.restore();
      cx += lw;
    }
    for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.6; x.fillStyle = i % 2 ? '#7ef0e8' : '#fff'; x.globalAlpha = 0.5 + 0.5 * Math.sin(a * 2); etoile(x, x0 + (i / 3) * larg, y0 + Math.sin(a) * fs * 0.7, fs * 0.16, a); x.fill(); }
    x.globalAlpha = 1;
  } catch (e) { /* une vignette ne casse jamais la borne */ }
}

/* ---------- lancement : écran de chargement tout de suite, puis le moteur prend la main ---------- */
function mount(root, api) {
  let inst = null, dead = false, paused = false;
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const FD = (api.fonts && api.fonts.display) || 'Impact', FB = (api.fonts && api.fonts.body) || 'sans-serif';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#3a1a5a,#0b0616 72%);color:#f4eefc;font-family:' + FB;
  box.innerHTML = '<div style="font-size:54px;filter:drop-shadow(0 0 14px rgba(200,120,255,.7))">🪄</div>' +
    '<div style="font:400 34px ' + FD + ';color:#ffe08a;margin-top:6px;text-shadow:0 4px 0 #2a0c3a,0 0 22px rgba(200,120,255,.7)">' + NOM.toUpperCase() + '</div>' +
    '<div style="margin-top:16px;width:min(320px,62vw);height:14px;border-radius:7px;background:#140b22;box-shadow:0 0 0 1.5px rgba(255,255,255,.2);overflow:hidden"><u style="display:block;height:100%;width:0;background:linear-gradient(90deg,#c79bff,#ffe08a);transition:width .2s"></u></div>' +
    '<div style="margin-top:10px;font:600 14px ' + FB + ';color:#e8d8ff">Le bâton magique se réveille…</div>';
  root.appendChild(box);
  const bar = box.querySelector('u');
  const prog = { e: 0, p: 0 }, upd = () => { bar.style.width = Math.round((prog.e * 0.4 + prog.p * 0.6) * 100) + '%'; };
  const fail = (e) => {
    if (dead) return;
    try { if (api.reportError) api.reportError(NOM + ' : chargement raté (' + (e && e.message) + ')'); } catch (er) { /* rien */ }
    box.innerHTML = '<div style="max-width:340px;text-align:center;padding:20px"><div style="font:400 22px ' + FD + ';color:#ffb8b8;margin-bottom:8px">Oups !</div>' +
      '<div style="font:600 14px ' + FB + ';color:#e8d8ff;margin-bottom:14px">Ton appareil n\'arrive pas à charger ce jeu 3D.</div><button type="button" style="font:400 15px ' + FD + ';color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:10px 18px;cursor:pointer">Réessayer</button></div>';
    box.querySelector('button').addEventListener('click', () => {
      if (dead) return;
      root.innerHTML = ''; const n = mount(root, api);
      for (const k of ['destroy', 'pause', 'resume', 'currentScore', 'currentLevel', 'endInfo']) proxy[k] = n[k];
      Object.defineProperty(proxy, '_d', { get: () => n._d, configurable: true });
    });
  };
  Promise.all([loadEngine((k) => { prog.e = k; upd(); }, ac && ac.signal), loadPack((k) => { prog.p = k; upd(); }, ac && ac.signal)]).then(([AB, pack]) => {
    if (dead) return;
    root.innerHTML = '';
    // le 2e paquet (les autres objets) arrive pendant qu'on joue
    const packPlus = loadPack(() => {}, ac && ac.signal, 'objets').catch(() => null);
    // les autres paquets (« m1_maison », « m1_meuble »…) : chargés au 1er mot qui en a besoin
    const chargePack = (nom) => loadPack(() => {}, ac && ac.signal, nom);
    inst = AB.game(root, api, { pack, packPlus, chargePack });
    if (paused && inst.pause) inst.pause();
  }).catch(fail);
  const proxy = {
    destroy() { dead = true; if (ac) try { ac.abort(); } catch (e) { /* rien */ } if (inst) inst.destroy(); root.innerHTML = ''; },
    pause() { paused = true; if (inst) inst.pause(); },
    resume() { paused = false; if (inst) inst.resume(); },
    currentScore() { return inst ? inst.currentScore() : 0; },
    currentLevel() { return inst ? inst.currentLevel() : 1; },
    endInfo() { return inst && inst.endInfo ? inst.endInfo() : null; },
  };
  Object.defineProperty(proxy, '_d', { get: () => inst && inst._d, configurable: true });   // essais (harnais)
  proxy._dire = (t) => inst && inst._dire && inst._dire(t);
  return proxy;
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES[ID] = {
  id: ID,
  title: NOM,
  tagline: 'Appuie sur GO et dis des noms : vache, piano, tonneau… L\'éclair de ton bâton les fait tomber dans le Grand Fleuve. Traversez-le à plusieurs !',
  accent: '#c79bff',
  scoreLabel: 'points',
  live: true,   // les autres joueurs de la salle en direct (api.live, Ajout 17)
  fps: false,
  pad: { help: [['ls', 'Marcher'], ['rs', 'Regarder'], ['rb', 'GO / STOP (micro)'], ['a', 'Sauter']] },
  preview,
  mount,
};
})();
