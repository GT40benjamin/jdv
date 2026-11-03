(() => {
'use strict';
// La Maison des Licornes — premier jeu né à l'Atelier des jeux (projet a5badecc, auteur PATOU), version alpha (2 nov. 2026).
// Un tapis magique défile avec des œufs, des accessoires et des biberons à acheter avec les PIÈCES DU JEU (jamais d'argent réel) ;
// les œufs éclosent dans la couveuse, les bébés grandissent (biberon), on habille, on revend au panneau VENDRE, et deux adultes
// dans le nid d'amour donnent un nouvel œuf. V3 (demandes de PATOU, 3 nov.) : la partie se joue en MANCHES — des enfants viennent à la
// fenêtre de droite, une bulle montre la licorne qu'ils veulent (âge, couleur, accessoire, scintillante) ; livre-leur assez de licornes
// avant la fin du temps, puis la manche suivante en demande une de plus, en un peu moins de temps. Score = la valeur de toute ta Maison.
// Images : planches dessinées pour l'Atelier, découpées et emballées dans assets/licornes.bin (~/jdv-tools/licornes/emballer.py).
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
// manche n : livrer n + 1 licornes, en 120 s pour la 1re puis 10 % de moins à chaque manche (55 s au moins)
const objectifDe = n => n + 1, tempsDe = n => Math.max(55, Math.round(120 * Math.pow(0.9, n - 1)));
const ENFANTS = ['lila', 'tom', 'nina'];
const POT_PRIX = 10;
const FOULEE = 70, FOULEE_BEBE = 46;   // pixels parcourus par pas complet (8 images de marche)

/* ---------- images (paquet LIC1 : en-tête JSON + WebP à la suite) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/licornes.bin');
    if (!r.ok) throw new Error('images ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'LIC1') throw new Error('paquet illisible');
    const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
    await Promise.all(idx.map(([nom, o, l]) => new Promise(res => {
      const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
      im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
    })));
    LOADED = true;
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}

/* ---------- le catalogue ---------- */
const OEUFS = {
  commun: { img: 'oeuf-commun', prix: 20, eclot: 7, bebe: 'bebe-rose', valBebe: 30, nom: 'Œuf commun' },
  rare: { img: 'oeuf-rare', prix: 70, eclot: 9, bebe: 'bebe-arc', valBebe: 95, nom: 'Œuf rare' },
  leg: { img: 'oeuf-legendaire', prix: 200, eclot: 12, bebe: 'bebe-arc', valBebe: 270, nom: 'Œuf légendaire' }
};
const ADULTES = {
  blanche: { img: 'adulte-blanche', val: 80, rang: 0, nom: 'Licorne blanche' },
  arc: { img: 'adulte-arc', val: 220, rang: 1, nom: 'Licorne arc-en-ciel' },
  nuit: { img: 'adulte-nuit', val: 450, rang: 2, nom: 'Licorne nuit étoilée' },
  doree: { img: 'adulte-doree', val: 900, rang: 3, nom: 'Licorne dorée' }
};
// ax, ay : place sur la licorne (fraction de la boîte du dessin, tournée vers la droite) ; s : taille (fraction de la hauteur) ; b : dessiné derrière
const ACC = {
  couronne: { prix: 40, nom: 'Couronne', a: { ax: 0.74, ay: 0.06, s: 0.26 }, k: { ax: 0.66, ay: 0.06, s: 0.3 } },
  noeud: { prix: 15, nom: 'Nœud rose', a: { ax: 0.58, ay: 0.26, s: 0.2 }, k: { ax: 0.42, ay: 0.24, s: 0.24 } },
  lunettes: { prix: 20, nom: 'Lunettes cœur', a: { ax: 0.84, ay: 0.2, s: 0.16 }, k: { ax: 0.74, ay: 0.36, s: 0.2 } },
  ailes: { prix: 60, nom: 'Ailes d’ange', a: { ax: 0.4, ay: 0.3, s: 0.46, b: 1 }, k: { ax: 0.34, ay: 0.42, s: 0.46, b: 1 } },
  cape: { prix: 45, nom: 'Cape étoilée', a: { ax: 0.38, ay: 0.46, s: 0.42, b: 1 }, k: { ax: 0.32, ay: 0.6, s: 0.4, b: 1 } },
  chapeau: { prix: 30, nom: 'Chapeau de fée', a: { ax: 0.7, ay: 0.02, s: 0.3 }, k: { ax: 0.6, ay: 0.02, s: 0.34 } },
  collier: { prix: 25, nom: 'Collier de perles', a: { ax: 0.68, ay: 0.36, s: 0.17 }, k: { ax: 0.6, ay: 0.56, s: 0.2 } },
  fers: { prix: 35, nom: 'Fers dorés', a: { ax: 0.5, ay: 0.9, s: 0.16 }, k: { ax: 0.5, ay: 0.92, s: 0.16 } },
  tiare: { prix: 80, nom: 'Tiare arc-en-ciel', a: { ax: 0.74, ay: 0.08, s: 0.24 }, k: { ax: 0.64, ay: 0.08, s: 0.28 } }
};
const ACC_IDS = Object.keys(ACC);
const BIB_PRIX = 5;
const GCOUV_PRIX = 120;   // la grande couveuse (4 œufs à la fois) passe de temps en temps sur le tapis (demande de PATOU, 3 nov.)
// la couleur choisie pour l'œuf qui couve : l'œuf et le bébé prennent cette couleur (demande de PATOU, 3 nov.)
const COULEURS = [{ n: 'Rose', h: 330, c: '#ff8cc6' }, { n: 'Violet', h: 272, c: '#b48cff' }, { n: 'Bleu', h: 205, c: '#6fc2ff' },
  { n: 'Vert', h: 125, c: '#7fdc8a' }, { n: 'Jaune', h: 50, c: '#ffd84d' }, { n: 'Orange', h: 25, c: '#ffa25a' }];
// une image recolorée (teinte choisie, ombres et reflets gardés) : les traits sombres et les blancs restent tels quels ; gardée en cache
const TEINTES = {};
function teinte(nom, h) {
  const im = IMG[nom]; if (!im || h == null) return im;
  const k = nom + '|' + h; if (TEINTES[k]) return TEINTES[k];
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try {
    const d = x.getImageData(0, 0, c.width, c.height), a = d.data, H = h / 360;
    const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 8) continue;
      const R = a[i] / 255, G = a[i + 1] / 255, B = a[i + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, dd = mx - mn;
      if (l < 0.26 || dd < 0.06) continue;   // traits, yeux et blancs : intacts
      let sa = dd / (1 - Math.abs(2 * l - 1)); sa = Math.max(0.5, Math.min(1, sa));
      const q = l < 0.5 ? l * (1 + sa) : l + sa - l * sa, p2 = 2 * l - q;
      a[i] = f(p2, q, H + 1 / 3) * 255; a[i + 1] = f(p2, q, H) * 255; a[i + 2] = f(p2, q, H - 1 / 3) * 255;
    }
    x.putImageData(d, 0, 0);
  } catch (e) { return im; }
  return (TEINTES[k] = c);
}
const EMOJI = { 'oeuf-commun': '🥚', 'oeuf-rare': '🥚', 'oeuf-legendaire': '🥚', biberon: '🍼', piece: '🪙', vendre: '💰', couveuse: '🫧', nid: '💞', etoile: '⭐' };

function drawImg(ctx, nom, x, y, w, h, hue) {
  const im = hue == null ? IMG[nom] : teinte(nom, hue);
  if (im) { ctx.drawImage(im, x, y, w, h); return; }
  ctx.save(); ctx.font = Math.round(h * 0.8) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(EMOJI[nom] || (ADULTES[nom] || nom.startsWith('bebe') || nom.startsWith('adulte') ? '🦄' : '🎀'), x + w / 2, y + h / 2); ctx.restore();
}
// un pot de peinture : bocal en verre, peinture de la couleur, couvercle, une coulure
function drawPot(ctx, x, y, w, h, hue) {
  const c = (COULEURS.find(k => k.h === hue) || COULEURS[0]).c, cx = x + w / 2, bw = w * 0.62, bh = h * 0.62, by = y + h * 0.3;
  ctx.save();
  ctx.fillStyle = 'rgba(90,50,110,0.18)'; ctx.beginPath(); ctx.ellipse(cx, y + h * 0.95, bw * 0.5, h * 0.05, 0, 0, TAU); ctx.fill();
  pill(ctx, cx - bw / 2, by, bw, bh, bw * 0.22); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  pill(ctx, cx - bw / 2 + 3, by + bh * 0.28, bw - 6, bh * 0.72 - 3, bw * 0.2); ctx.fillStyle = c; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(cx - bw * 0.32, by + bh * 0.36, bw * 0.1, bh * 0.45);
  pill(ctx, cx - bw / 2, by, bw, bh, bw * 0.22); ctx.strokeStyle = '#b07aa8'; ctx.lineWidth = 2; ctx.stroke();
  pill(ctx, cx - bw * 0.42, by - h * 0.13, bw * 0.84, h * 0.15, 5); ctx.fillStyle = '#f2a8cf'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + bw * 0.28, by + 2, bw * 0.12, h * 0.07, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + bw * 0.3, by + h * 0.09, bw * 0.06, h * 0.06, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawObjet(ctx, nom, x, y, w, h) { if (typeof nom === 'string' && nom.startsWith('pot:')) drawPot(ctx, x, y, w, h, +nom.slice(4)); else drawImg(ctx, nom, x, y, w, h); }
const ratio = nom => { if (typeof nom === 'string' && nom.startsWith('pot:')) return 0.8; const im = IMG[nom]; return im && im.height ? im.width / im.height : 1; };
function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function heart(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.4, y - s, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.3, x, y + s * 0.35); ctx.fill();
}
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ---------- la tuile vivante (aperçu de la borne et de l'Atelier) : un ciel pastel, un arc-en-ciel, des nuages qui glissent, des étoiles
   qui scintillent, des collines en barbe à papa, et trois licornes du jeu qui respirent et sautillent (demande de PATOU, 3 nov.) ---------- */
function nuage(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(190,150,210,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.42, s * 0.95, s * 0.16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath();
  ctx.arc(x - s * 0.55, y + s * 0.08, s * 0.32, 0, TAU); ctx.arc(x - s * 0.12, y - s * 0.12, s * 0.44, 0, TAU); ctx.arc(x + s * 0.38, y, s * 0.36, 0, TAU); ctx.arc(x + s * 0.72, y + s * 0.14, s * 0.24, 0, TAU);
  ctx.rect(x - s * 0.8, y + s * 0.08, s * 1.6, s * 0.3); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,236,0.55)'; ctx.beginPath(); ctx.ellipse(x - s * 0.25, y + s * 0.3, s * 0.5, s * 0.08, 0, 0, TAU); ctx.fill();
}
function etoile4(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const k = Math.min(w / 400, h / 300);
  // le ciel
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe9ff'); g.addColorStop(0.5, '#f1dcff'); g.addColorStop(1, '#ffe0ef');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // l'arc-en-ciel, qui brille doucement
  const ax = w * 0.5, ay = h * 0.86, R = h * 0.66, bands = ['#ffb3c8', '#ffd2a8', '#fff0a8', '#c8f2b8', '#b8e2ff', '#d2c2ff'];
  ctx.save(); ctx.globalAlpha = 0.62 + Math.sin(t * 1.5) * 0.08; ctx.lineCap = 'round';
  bands.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = h * 0.034; ctx.beginPath(); ctx.arc(ax, ay, R - i * h * 0.032, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); });
  ctx.restore();
  // des étoiles qui scintillent
  for (let i = 0; i < 12; i++) {
    const sx = ((i * 0.618 + 0.07) % 1) * w, sy = ((i * 0.371 + 0.05) % 0.55) * h, a = Math.max(0, Math.sin(t * 2.2 + i * 1.7));
    ctx.globalAlpha = 0.35 + a * 0.65; ctx.fillStyle = ['#fff7b0', '#ffffff', '#ffd6ec', '#d8ccff'][i % 4]; etoile4(ctx, sx, sy, (2.5 + a * 3.5) * k);
  }
  ctx.globalAlpha = 1;
  // des nuages qui glissent (ils reviennent de l'autre côté)
  for (let i = 0; i < 3; i++) { const s = (32 + i * 9) * k, x = ((t * (7 + i * 3) * k + i * w * 0.42) % (w + s * 3)) - s * 1.5, y = h * (0.16 + i * 0.13); nuage(ctx, x, y, s); }
  // les collines en barbe à papa
  ctx.fillStyle = '#ffd3e6'; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 1.02, w * 0.48, h * 0.26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d4f5e4'; ctx.beginPath(); ctx.ellipse(w * 0.85, h * 1.04, w * 0.5, h * 0.27, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffe4f0'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 1.1, w * 0.62, h * 0.24, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 16; i++) { ctx.fillStyle = ['#ff9fc8', '#9fdcff', '#ffe27a', '#b9a4ff'][i % 4]; ctx.beginPath(); ctx.arc(((i * 0.414) % 1) * w, h * (0.9 + ((i * 0.27) % 0.08)), 1.8 * k, 0, TAU); ctx.fill(); }
  // les licornes : la grande arc-en-ciel, le bébé rose qui sautille, la dorée ; elles respirent (images de repos du jeu)
  const L3 = [{ n: 'adulte-arc', x: 0.25, hh: 0.42, f: 1, ph: 0 }, { n: 'adulte-doree', x: 0.77, hh: 0.42, f: -1, ph: 0.9 }, { n: 'bebe-rose', x: 0.52, hh: 0.3, f: 1, ph: 0.4, saute: 1 }];
  const sol = h * 0.9;
  for (const o of L3) {
    const im = IMG[o.n + '-r' + (Math.floor(t / 0.55 + o.ph * 4) % 4)] || IMG[o.n]; if (!im) continue;
    const per = o.saute ? 1.3 : 3.4, p = ((t + o.ph * per) % per) / per, hop = p < 0.32 ? Math.sin(p / 0.32 * Math.PI) : 0;
    const hh = h * o.hh, ww = hh * im.width / im.height, y = sol - hop * h * (o.saute ? 0.12 : 0.05), sq = p < 0.04 || (p > 0.3 && p < 0.36) ? 0.94 : 1;
    ctx.fillStyle = 'rgba(160,90,150,' + (0.2 - hop * 0.08) + ')'; ctx.beginPath(); ctx.ellipse(w * o.x, sol, ww * (0.3 - hop * 0.06), h * 0.025, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(w * o.x, y); ctx.scale(o.f / sq * (sq < 1 ? 0.97 : 1), sq); ctx.drawImage(im, -ww / 2, -hh, ww, hh); ctx.restore();
  }
  // des cœurs qui montent et des étincelles autour du bébé
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.35 + i / 4) % 1), x = w * (0.36 + i * 0.09) + Math.sin(t * 2 + i) * 6 * k, y = sol - h * 0.25 - p * h * 0.35;
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9; ctx.fillStyle = ['#ff8cc6', '#ffa8d4', '#ff7eb6', '#ffb3c7'][i]; heart(ctx, x, y, (5 + p * 3) * k);
  }
  for (let i = 0; i < 5; i++) { const a = t * 1.4 + i * 1.26, r = Math.max(0, Math.sin(t * 3 + i * 2)); ctx.globalAlpha = r; ctx.fillStyle = '#fff3a6'; star(ctx, w * 0.52 + Math.cos(a) * w * 0.11, sol - h * 0.16 + Math.sin(a) * h * 0.09, (2 + r * 3.5) * k, t + i); }
  ctx.globalAlpha = 1;
  // le titre
  const lg = IMG.logo, by = Math.sin(t * 2) * 2 * k;
  if (lg) { const lw = w * 0.64, lh = lw * lg.height / lg.width; ctx.fillStyle = 'rgba(255,255,255,0.62)'; pill(ctx, (w - lw) / 2 - 8 * k, h * 0.03 + by - 4 * k, lw + 16 * k, lh + 8 * k, 16 * k); ctx.fill(); ctx.drawImage(lg, (w - lw) / 2, h * 0.03 + by, lw, lh); }
  else { ctx.fillStyle = '#9b5fc0'; ctx.font = 'bold ' + Math.round(h * 0.11) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('La Maison des Licornes', w / 2, h * 0.05 + by); }
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  const FONT = api.fonts || { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const audio = api.audio || { tone() {}, noise() {} };
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, overSent = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.8);background:rgba(190,120,200,0.75);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);

  // ---------- mise en page : coordonnées logiques (paysage = le décor 1344 × 768 ; portrait = 720 de large) ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1344, LH = 768, sc = 1, ox = 0, oy = 0, L = null;
  function layout() {
    portrait = H > W * 1.12;
    if (!portrait) {
      LW = 1344; LH = 768; sc = Math.min(W / LW, H / LH);
      L = {
        hud: { y: 4, h: 46 },
        belt: { x0: 210, x1: 1185, y: 128, sz: 74 },
        trous: { g: { x: 214, bas: 135, w: 108, h: 84 }, d: { x: 1176, bas: 135, w: 108, h: 84 } },
        couv: { x: 236, y: 318, w: 156, h: 150 }, nid: { x: 470, y: 346, w: 176, h: 124 },
        enclos: { x: 770, y: 548, w: 530, h: 66 },   // le sol carrelé à droite (l'aquarium est retiré du fond : demande de PATOU, 2 nov. 23 h)
        fen: { x: 1034, y: 196, w: 184, h: 206 }, bulle: { x: 856, y: 186, w: 160, h: 150 },   // la fenêtre des clients (à droite) et la bulle de l'enfant
        tray: { x: 196, y: 636, w: 566, h: 116 },
        act: { x: 790, y: 630, w: 520, h: 120 },
        msgY: 300
      };
    } else {
      // portrait (2 h 10, Benjamin : « il faut absolument le détecter ») : de haut en bas, le tapis, la scène (mur à sa taille naturelle +
      // sol carrelé qui prend toute la hauteur en plus), puis la rangée couveuse · nid (sur le comptoir) · fenêtre du client, l'inventaire
      // et les boutons collés en bas : rien d'étiré, rien qui se chevauche, pas de vide
      LW = 720; LH = Math.max(1150, 720 * H / W); sc = Math.min(W / LW, H / LH); LH = Math.max(1150, H / sc);
      const actY = LH - 16 - 116, trayY = actY - 10 - 112, rowY = trayY - 12 - 300, sceneY = 206, sceneH = rowY - 20 - sceneY;
      const wallH = Math.min(218, sceneH * 0.42), floorH = sceneH - wallH;
      L = {
        hud: { y: 8, h: 56 },
        belt: { x0: 18, x1: 702, y: 150, sz: 74, draw: { x: 0, y: 116, w: 720 } },
        trous: { g: { x: 34, bas: 156, w: 88, h: 90 }, d: { x: 686, bas: 156, w: 88, h: 90 } },
        scene: { x: 8, y: sceneY, w: 704, h: sceneH, wallH },
        enclos: { x: 70, y: sceneY + wallH + floorH * 0.28, w: 580, h: floorH * 0.6 },   // les pieds sur le carrelage
        counterDraw: { x: 8, y: rowY + 128, w: 470 },
        couv: { x: 40, y: rowY, w: 160, h: 150 }, nid: { x: 236, y: rowY + 28, w: 190, h: 130 },
        fen: { x: 494, y: rowY + 40, w: 212, h: 206 }, bulle: { x: 512, y: rowY - 138, w: 178, h: 150 },
        tray: { x: 16, y: trayY, w: 688, h: 112 },
        act: { x: 16, y: actY, w: 688, h: 116 },
        msgY: sceneY + sceneH * 0.45
      };
    }
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
  }
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout();
  }
  resize();
  const ro = new ResizeObserver(() => { if (!dead) resize(); });
  ro.observe(root);

  // ---------- état ----------
  let state = LOADED ? 'title' : 'load', stT = 0, timeLeft = tempsDe(1), coins = 60, best = 0;
  let manche = 1, vendues = 0, gagne = 0, client = null, clientT = 1.2, dernier = '';
  let belt = [], beltT = 0.3, beltN = 0, couv = [], queue = [], tray = [], bib = 1, unis = [], nid = [null, null], nidT = 0, nidEgg = null;
  let sel = null, parts = [], texts = [], flyers = [], msg = null, drag = null, down = null, uid = 1, hover = null, tick = -1, loadErr = '';
  const NID_DUREE = 8, MAX_UNIS = 8, MAX_TRAY = 8, MAX_QUEUE = 3;
  let grande = false, grandeT = 30;   // la grande couveuse : achetée ? prochaine apparition sur le tapis
  const cap = () => grande ? 4 : 2;

  const estPot = a => typeof a === 'string' && a.startsWith('pot:'), hueDe = a => +a.slice(4);
  const prixTray = a => estPot(a) ? POT_PRIX : ACC[a].prix;
  function valeur(u) {
    let v = u.bebe ? OEUFS[u.ligne].valBebe : ADULTES[u.adulte].val;
    for (const a of u.accs) v += Math.round(ACC[a].prix * 1.5);
    return u.brille ? v * 2 : v;   // une licorne scintillante vaut le double
  }
  function score() {
    let s = coins + bib * BIB_PRIX;
    for (const u of unis) s += valeur(u);
    for (const u of nid) if (u) s += valeur(u);
    for (const c of couv) s += OEUFS[c.t].prix;
    for (const t of queue) s += OEUFS[t].prix;
    for (const a of tray) s += prixTray(a);
    if (nidEgg) s += OEUFS[nidEgg].prix;
    if (grande) s += GCOUV_PRIX;
    return Math.max(0, Math.round(s));
  }

  // ---------- sons (fabriqués par le programme) ----------
  // ---------- les vrais bruitages (assets/licornes.sons.bin, sons créés pour le jeu, joués par la borne : « son coupé » respecté) ----------
  // quand un son est là, il remplace le petit bip ; la musique, elle, est jouée en boucle par la borne (assets/music/licornes-1.mp3)
  const SONS = {}, SVOL = { acheter: 0.8, eclosion: 0.9, contente: 0.8, vendre: 0.75, accessoire: 0.7, nid: 0.8 };   // sons déjà mis au même niveau (~/jdv-tools/licornes/sons.py)
  (async () => {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/licornes.sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  const vrai = (nom, rate) => { if (!SONS[nom]) return false; try { return api.audio.sample.play(SONS[nom], SVOL[nom] || 1, rate || 1) !== false; } catch (e) { return false; } };
  const snd = {
    buy() { if (vrai('acheter', 0.97 + Math.random() * 0.06)) return; audio.tone(880, 0.08, 'sine', 0.07, 1320); setTimeout(() => !dead && audio.tone(1320, 0.1, 'sine', 0.05, 1760), 70); },
    no() { audio.tone(260, 0.12, 'triangle', 0.07, 200); },
    hatch() { if (vrai('eclosion')) return; [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.12, 'sine', 0.06), i * 70)); },
    grow() { audio.tone(520, 0.25, 'sine', 0.06, 1040); },
    adult() { if (vrai('contente')) return; [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.16, 'triangle', 0.05), i * 80)); },
    dress() { if (vrai('accessoire', 0.95 + Math.random() * 0.1)) return; audio.tone(1500, 0.06, 'sine', 0.05, 2200); setTimeout(() => !dead && audio.tone(1900, 0.08, 'sine', 0.04, 2600), 60); },
    sell() { if (vrai('vendre')) return; [1568, 2093, 1568, 2637].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.07, 'square', 0.03), i * 60)); },
    love() { if (vrai('nid')) return; audio.tone(440, 0.3, 'sine', 0.05, 660); setTimeout(() => !dead && audio.tone(554, 0.35, 'sine', 0.05, 830), 160); },
    pick() { audio.tone(700, 0.05, 'sine', 0.04, 900); },
    tick() { audio.tone(1200, 0.04, 'square', 0.03); },
    go() { audio.tone(660, 0.12, 'sine', 0.07); setTimeout(() => !dead && audio.tone(990, 0.2, 'sine', 0.07), 120); }
  };

  // ---------- effets ----------
  function sparkle(x, y, n, col, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (0.4 + Math.random()) * (spread || 120);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, d: 0.6 + Math.random() * 0.6, r: 5 + Math.random() * 7, c: col || ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff'][i % 4], k: 'star', rot: Math.random() * 3 });
    }
  }
  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, t: 0, d: 1.2, r: 10 + Math.random() * 8, c: ['#ff7eb6', '#ff9fd0', '#ffb3c7'][i % 3], k: 'heart' });
  }
  function floatText(x, y, s, col) { texts.push({ x, y, s, c: col || '#7a3fa0', t: 0 }); }
  function say(s) { msg = { s, t: 0 }; }

  // ---------- licornes ----------
  function newUni(ligne, x, y) {
    const r = Math.random();
    const adulte = ligne === 'commun' ? (r < 0.85 ? 'blanche' : 'arc') : ligne === 'rare' ? (r < 0.72 ? 'arc' : 'nuit') : (r < 0.45 ? 'nuit' : 'doree');
    const u = { id: uid++, ligne, adulte, bebe: true, brille: ligne === 'leg', col: null, lait: 0, laitT: 0, accs: [], u: Math.random(), v: Math.random(), tu: Math.random(), tv: Math.random(), wait: 1 + Math.random() * 2, face: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 6, hop: 0, pop: 0.6 };
    if (x != null) { u.u = Math.min(1, Math.max(0, (x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (y - L.enclos.y) / L.enclos.h)); }
    return u;
  }
  function uniImg(u) { return u.bebe ? OEUFS[u.ligne].bebe : ADULTES[u.adulte].img; }
  // la pose du moment : marche (8 images, au rythme des pas) ou repos (4 images de respiration) ; ailleurs (nid, glissé) : debout
  function uniPose(u) {
    const nm = uniImg(u);
    if (u.nid == null && !(drag && drag.u === u) && u.marche && IMG[nm + '-m0']) return nm + '-m' + (Math.floor(u.step || 0) % 8);
    if (IMG[nm + '-r0']) return nm + '-r' + (Math.floor(((u.repos || 0) + u.id * 0.37) / 0.6) % 4);
    return nm;
  }
  function uniH(u) { const base = portrait ? 190 : 150; return base * (u.bebe ? 0.74 : 1); }
  function uniPos(u) {   // pied de la licorne (logique)
    if (u.nid != null) { const n = L.nid; return { x: n.x + n.w * (u.nid ? 0.72 : 0.28), y: n.y + n.h * 0.62 }; }
    return { x: L.enclos.x + u.u * L.enclos.w, y: L.enclos.y + u.v * L.enclos.h };
  }
  function uniBox(u) {
    const p = drag && drag.u === u ? { x: drag.x, y: drag.y + uniH(u) * 0.45 } : uniPos(u);
    const h = uniH(u) * (u.nid != null ? 0.72 : 1), w = h * ratio(uniImg(u));
    return { x: p.x - w / 2, y: p.y - h, w, h, fx: p.x, fy: p.y };
  }
  function grow(u, n) {
    if (!u.bebe) return;
    u.lait += n; const b = uniBox(u);
    if (u.lait >= 3) {
      u.bebe = false; u.pop = 0.8; snd.adult(); sparkle(b.x + b.w / 2, b.y + b.h / 2, 26, null, 200);
      floatText(b.x + b.w / 2, b.y, ADULTES[u.adulte].nom + ' !', '#9a4fd0');
      if (u.adulte === 'doree' || u.adulte === 'nuit') { try { api.celebrate && api.celebrate(u.adulte === 'doree' ? 'Une licorne dorée !' : 'Une licorne étoilée !'); } catch (e) { /* rien */ } }
    } else { u.pop = 0.4; snd.grow(); sparkle(b.x + b.w / 2, b.y + b.h * 0.4, 8); }
  }

  // ---------- tapis ----------
  function spawnItem() {
    beltN++;
    const prog = Math.min(1, (manche - 1) / 8), r = Math.random();
    let it;
    if (!grande && grandeT <= 0 && !belt.some(i => i.k === 'gcouv')) { grandeT = 40 + Math.random() * 20; it = { k: 'gcouv', prix: GCOUV_PRIX, img: 'couveuse', x: L.trous.d.x + 6, bob: 0, shake: 0 }; belt.push(it); return; }
    const pRare = 0.12 + prog * 0.06, pLeg = 0.035 + prog * 0.04;
    if (beltN % 6 === 1 || r < 0.26) it = { k: 'egg', t: 'commun' };
    else if (r < 0.26 + pRare) it = { k: 'egg', t: 'rare' };
    else if (r < 0.26 + pRare + pLeg) it = { k: 'egg', t: 'leg' };
    else if (r < 0.55) it = { k: 'acc', t: client && client.want.acc && Math.random() < 0.4 ? client.want.acc : ACC_IDS[Math.floor(Math.random() * ACC_IDS.length)] };
    else if (r < 0.77) it = { k: 'pot', t: client && Math.random() < 0.5 ? client.want.col : COULEURS[Math.floor(Math.random() * COULEURS.length)].h };   // un pot de couleur
    else it = { k: 'bib' };
    it.prix = it.k === 'egg' ? OEUFS[it.t].prix : it.k === 'acc' ? ACC[it.t].prix : it.k === 'pot' ? POT_PRIX : BIB_PRIX;
    it.img = it.k === 'egg' ? OEUFS[it.t].img : it.k === 'acc' ? it.t : it.k === 'pot' ? 'pot:' + it.t : 'biberon';
    it.x = L.trous.d.x + 6; it.bob = Math.random() * 6; it.shake = 0;
    belt.push(it);
  }
  const visible = it => it.x > L.trous.g.x + 18 && it.x < L.trous.d.x - 18;
  // les pastilles de couleur, au-dessus de la couveuse, pour le premier œuf qui n'a pas encore sa couleur
  function palette() {
    const o = couv.find(e => e.col == null && !e.done); if (!o || state !== 'play') return [];
    const c = L.couv, r0 = portrait ? 19 : 16, gap = portrait ? 44 : 38, n = COULEURS.length, x0 = Math.max(18 + r0, Math.min(LW - 18 - r0 - gap * (n - 1), c.x + c.w / 2 - gap * (n - 1) / 2)), y = c.y - (portrait ? 14 : 22);
    return COULEURS.map((k, i) => ({ o, hue: k.h, c: k.c, n: k.n, x: x0 + i * gap - r0, y: y - r0, w: r0 * 2, h: r0 * 2 }));
  }
  function itemBox(it) { const s = L.belt.sz * (it.k === 'gcouv' ? 1.25 : 1), w = s * Math.min(1.3, ratio(it.img)), h = w / ratio(it.img); const hh = Math.min(h, s * 1.05), ww = hh * ratio(it.img); return { x: it.x - ww / 2, y: L.belt.y - hh - Math.abs(Math.sin(it.bob)) * 3, w: ww, h: hh }; }
  function buy(it) {
    const b = itemBox(it);
    if (coins < it.prix) { it.shake = 0.4; snd.no(); say('Pas assez de pièces : vends une licorne au panneau VENDRE'); return; }
    let to;
    if (it.k === 'gcouv') {
      coins -= it.prix; belt.splice(belt.indexOf(it), 1); snd.buy(); grande = true;
      floatText(b.x + b.w / 2, b.y, '-' + it.prix, '#c0507a'); sparkle(b.x + b.w / 2, b.y + b.h / 2, 16, '#ffd34d', 160);
      flyers.push({ img: 'couveuse', x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: L.couv.x + L.couv.w / 2, y1: L.couv.y + L.couv.h / 2, t: 0, s: b.h });
      say('Grande couveuse : 4 œufs à la fois !');
      return;
    }
    if (it.k === 'egg') {
      if (couv.length < cap()) to = 'couv'; else if (queue.length < MAX_QUEUE) to = 'queue';
      else { it.shake = 0.4; snd.no(); say('La couveuse est pleine !'); return; }
    } else if (it.k === 'acc' || it.k === 'pot') {
      if (tray.length >= MAX_TRAY) { it.shake = 0.4; snd.no(); say('Ton coffre à accessoires est plein : habille tes licornes !'); return; }
      to = 'tray';
    } else to = 'bib';
    coins -= it.prix; belt.splice(belt.indexOf(it), 1); snd.buy();
    floatText(b.x + b.w / 2, b.y, '-' + it.prix, '#c0507a'); sparkle(b.x + b.w / 2, b.y + b.h / 2, 8);
    if (to === 'couv') couv.push({ t: it.t, p: 0, done: false, wob: 0, col: null });
    if (to === 'queue') queue.push(it.t);
    if (to === 'tray') tray.push(it.k === 'pot' ? 'pot:' + it.t : it.t);
    if (to === 'bib') bib = Math.min(99, bib + 1);
    const dest = to === 'couv' || to === 'queue' ? { x: L.couv.x + L.couv.w / 2, y: L.couv.y + L.couv.h * 0.4 } : { x: L.tray.x + 40, y: L.tray.y + L.tray.h / 2 };
    flyers.push({ img: it.img, x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: dest.x, y1: dest.y, t: 0, s: Math.max(b.w, b.h) });
  }

  // ---------- actions ----------
  function retirer(u) { if (u.nid != null) nid[u.nid] = null; else unis.splice(unis.indexOf(u), 1); if (sel === u) sel = null; nidT = 0; }
  // revendre au marchand (pour faire de la place) : la moitié de sa valeur, ne compte pas pour la manche
  function sell(u) {
    const v = Math.round(valeur(u) / 2), b = uniBox(u);
    coins += v; snd.sell(); sparkle(b.x + b.w / 2, b.y + b.h / 2, 10, '#ffd34d', 140); floatText(b.x + b.w / 2, b.y, '+' + v + ' pièces', '#c08a10');
    retirer(u);
  }
  // ---------- les clients (des enfants à la fenêtre de droite) ----------
  function nouveauClient() {
    let k; do { k = ENFANTS[Math.floor(Math.random() * ENFANTS.length)]; } while (k === dernier && ENFANTS.length > 1);
    dernier = k;
    const R = Math.random;
    const want = { adulte: manche >= 3 && R() < 0.4, col: COULEURS[Math.floor(R() * COULEURS.length)].h,
      acc: manche >= 4 && R() < 0.45 ? ACC_IDS[Math.floor(R() * ACC_IDS.length)] : null, brille: manche >= 5 && R() < 0.15 };
    const patMax = Math.max(25, 55 - (manche - 1) * 3);
    client = { k, want, etat: 'arrive', et: 0, pat: patMax, patMax, ph: Math.random() * 6 };
  }
  // la couleur d'une licorne : celle qu'on lui a donnée (œuf ou pot), sinon sa couleur de naissance quand elle en a une franche
  // (bug signalé par Benjamin : un bébé rose de naissance était refusé pour « bébé rose » tant qu'on ne repassait pas le pot)
  const couleur = u => u.col != null ? u.col : uniImg(u) === 'bebe-rose' ? 330 : uniImg(u) === 'adulte-doree' ? 50 : null;
  const convient = (u, w) => !u.bebe === w.adulte && couleur(u) === w.col && (!w.acc || u.accs.includes(w.acc)) && (!w.brille || u.brille);
  function livrer(u) {
    if (!client || client.etat !== 'attend') { snd.no(); say('Attends qu’un enfant arrive à la fenêtre'); return; }
    if (!convient(u, client.want)) {
      client.etat = 'decu'; client.et = 0; client.pat = Math.max(0, client.pat - 6); snd.no();
      const w = client.want, manque = [];
      if (!u.bebe !== w.adulte) manque.push(w.adulte ? 'une grande licorne' : 'un bébé');
      if (couleur(u) !== w.col) manque.push('la couleur ' + COULEURS.find(c => c.h === w.col).n.toLowerCase());
      if (w.acc && !u.accs.includes(w.acc)) manque.push(ACC[w.acc].nom.toLowerCase());
      if (w.brille && !u.brille) manque.push('qu’elle scintille');
      say('Ce n’est pas celle-là : il manque ' + manque.join(', '));
      return;
    }
    const v = valeur(u) + 15, b = uniBox(u), f = L.fen;
    coins += v; gagne += v; vendues++; snd.sell(); retirer(u);
    flyers.push({ img: uniImg(u), hue: u.col, x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: f.x + f.w / 2, y1: f.y + f.h * 0.6, t: 0, s: b.h });
    sparkle(f.x + f.w / 2, f.y + f.h / 2, 18, '#ffd34d', 170); hearts(f.x + f.w / 2, f.y + 20, 4); floatText(f.x + f.w / 2, f.y, '+' + v + ' pièces', '#c08a10');
    client.etat = 'joie'; client.et = 0; client.servi = true;
    if (vendues >= objectifDe(manche)) mancheGagnee();
  }
  function mancheGagnee() {
    const bonus = 10 * manche; coins += bonus;
    try { api.celebrate && manche % 3 === 0 && api.celebrate('Manche ' + manche + ' réussie !'); } catch (e) { /* rien */ }
    manche++; vendues = 0; timeLeft = tempsDe(manche); tick = -1; snd.adult();
    floatText(LW / 2, L.msgY - 60, 'Manche réussie ! +' + bonus, '#c08a10');
    state = 'ready'; stT = 0;
  }
  function toNid(u) {
    if (u.bebe) { snd.no(); say('Seules les licornes adultes vont au nid d’amour'); return false; }
    if (u.nid != null) return false;
    const k = nid[0] ? (nid[1] ? -1 : 1) : 0;
    if (k < 0) { snd.no(); say('Le nid est déjà occupé'); return false; }
    unis.splice(unis.indexOf(u), 1); u.nid = k; nid[k] = u; snd.pick(); nidT = 0;
    const b = uniBox(u); hearts(b.x + b.w / 2, b.y + 10, 3);
    if (nid[0] && nid[1]) { snd.love(); say('Deux licornes au nid d’amour… un œuf arrive !'); }
    return true;
  }
  function fromNid(u, x, y) {
    if (u.nid == null) return;
    if (unis.length >= MAX_UNIS) { snd.no(); say('La maison est pleine'); return; }
    nid[u.nid] = null; u.nid = null; nidT = 0;
    if (x != null) { u.u = Math.min(1, Math.max(0, (x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (y - L.enclos.y) / L.enclos.h)); }
    else { u.u = Math.random() * 0.4; u.v = 0.5; }
    u.tu = u.u; u.tv = u.v; unis.push(u);
  }
  function feed(u) {
    if (!u.bebe) return;
    if (bib <= 0) { snd.no(); say('Plus de biberon : achète-en sur le tapis 🍼'); return; }
    bib--; grow(u, 1);
  }
  function dress(u, k) {
    const a = tray[k]; if (a == null || !u) return false;
    if (estPot(a)) {   // un pot de couleur : la licorne prend cette couleur (même dessin, recoloré)
      if (couleur(u) === hueDe(a)) { snd.no(); say('Elle est déjà de cette couleur'); return false; }
      tray.splice(k, 1); u.col = hueDe(a); u.pop = 0.5; snd.dress();
      const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.5, 16, COULEURS.find(c => c.h === u.col).c, 150);
      return true;
    }
    if (u.accs.includes(a)) { snd.no(); say('Elle porte déjà ' + ACC[a].nom.toLowerCase()); return false; }
    if (u.accs.length >= 3) { snd.no(); say('3 accessoires au plus par licorne'); return false; }
    tray.splice(k, 1); u.accs.push(a); u.pop = 0.4; snd.dress();
    const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.3, 12); floatText(b.x + b.w / 2, b.y, '+' + Math.round(ACC[a].prix * 1.5), '#9a4fd0');
    return true;
  }
  function nidOeuf() {   // rareté selon les parents
    const s = ADULTES[nid[0].adulte].rang + ADULTES[nid[1].adulte].rang;
    const pl = [0.03, 0.08, 0.18, 0.3, 0.45, 0.6, 0.75][s], pr = [0.3, 0.45, 0.5, 0.5, 0.45, 0.35, 0.25][s], r = Math.random();
    return r < pl ? 'leg' : r < pl + pr ? 'rare' : 'commun';
  }

  // ---------- boutons d'action (selon la licorne choisie) ----------
  const appui = {};
  function actions() {
    const u = sel, out = [];
    if (!u) return out;
    // chaque bouton : une icône, son mot en entier, parfois un petit détail dessous ; une couleur pastel par action
    if (u.bebe) out.push({ id: 'feed', ic: '🍼', t: 'Biberon', sub: '× ' + bib, c: ['#ffd3ea', '#ff9fcf'], tc: '#8a2560', on: bib > 0 });
    else if (u.nid != null) out.push({ id: 'out', ic: '↩️', t: 'Sortir du nid', c: ['#e6dcff', '#bfa8ff'], tc: '#4f2d8f', on: true });
    else out.push({ id: 'nid', ic: '💞', t: 'Au nid', c: ['#e6dcff', '#bfa8ff'], tc: '#4f2d8f', on: !(nid[0] && nid[1]) });
    out.push({ id: 'give', ic: '🎁', t: 'Donner', c: ['#d4f7e4', '#8fe0b5'], tc: '#1f6b46', on: !!(client && client.etat === 'attend') });
    out.push({ id: 'sell', ic: '💰', t: 'Revendre', sub: '🪙 ' + Math.round(valeur(u) / 2), c: ['#fff1b8', '#ffd25e'], tc: '#7a4a00', on: true });
    const a = L.act, n = out.length, gap = 14, x0 = a.x + 136, bw = (a.x + a.w - 12 - x0 - gap * (n - 1)) / n;
    out.forEach((o, i) => { o.x = x0 + i * (bw + gap); o.y = a.y + 28; o.w = bw; o.h = a.h - 36; });
    return out;
  }
  function trayBoxes() {
    const t = L.tray, n = MAX_TRAY + 1, s = Math.min((t.w - 16) / n, t.h - 26);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: t.x + 8 + i * (t.w - 16) / n + ((t.w - 16) / n - s) / 2, y: t.y + 20 + (t.h - 26 - s) / 2, w: s, h: s });
    return out;
  }
  const inBox = (p, b, m) => p.x >= b.x - (m || 0) && p.x <= b.x + b.w + (m || 0) && p.y >= b.y - (m || 0) && p.y <= b.y + b.h + (m || 0);
  function uniAt(p) {
    const all = unis.concat(nid.filter(Boolean)).map(u => ({ u, b: uniBox(u) })).sort((a, b) => b.b.fy - a.b.fy);
    for (const o of all) { const b = o.b; if (inBox(p, { x: b.x + b.w * 0.12, y: b.y + b.h * 0.08, w: b.w * 0.76, h: b.h * 0.92 }, 6)) return o.u; }
    return null;
  }

  // ---------- entrées ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  function onDown(e) {
    if (dead) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e);
    if (paused) { setPaused(false); return; }
    if (state === 'title') { if (LOADED || loadErr) startGame(); return; }
    if (state !== 'play') return;
    down = { p, u: null, acc: -1, moved: false };
    const u = uniAt(p);
    if (u) { down.u = u; return; }
    const tb = trayBoxes();
    for (let i = 1; i < tb.length; i++) if (tray[i - 1] != null && inBox(p, tb[i])) { down.acc = i - 1; return; }
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e); hover = p;
    if (!down || state !== 'play') return;
    if (!down.moved && Math.hypot(p.x - down.p.x, p.y - down.p.y) * sc > 10) {
      down.moved = true;
      if (down.u) { drag = { u: down.u, x: p.x, y: p.y }; sel = down.u; snd.pick(); }
      else if (down.acc >= 0) drag = { acc: down.acc, x: p.x, y: p.y };
    }
    if (drag) { drag.x = p.x; drag.y = p.y; }
  }
  function onUp(e) {
    if (dead) return;
    const p = toLogic(e), d = down; down = null;
    if (state !== 'play' || !d) { drag = null; return; }
    if (drag) {
      const dr = drag; drag = null;
      if (dr.u) {
        const u = dr.u;
        if (inBox(p, L.fen, 14)) livrer(u);
        else if (inBox(p, L.nid, 20)) { if (u.nid == null) toNid(u); }
        else if (inBox(p, { x: L.enclos.x - 30, y: L.enclos.y - uniH(u), w: L.enclos.w + 60, h: L.enclos.h + uniH(u) + 40 })) {
          const fy = p.y + uniH(u) * 0.45;
          if (u.nid != null) fromNid(u, p.x, fy);
          else { u.u = Math.min(1, Math.max(0, (p.x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (fy - L.enclos.y) / L.enclos.h)); u.tu = u.u; u.tv = u.v; u.wait = 1.5; u.hop = 0.3; }
        }
      } else if (dr.acc != null) {
        const u = uniAt(p);
        if (u) dress(u, dr.acc); else say(estPot(tray[dr.acc]) ? 'Pose le pot de couleur sur une licorne' : 'Pose l’accessoire sur une licorne');
      }
      return;
    }
    tap(p, d);
  }
  function tap(p, d) {
    // tapis
    for (let i = belt.length - 1; i >= 0; i--) if (visible(belt[i]) && inBox(p, itemBox(belt[i]), 8)) { buy(belt[i]); return; }
    // la couleur de l'œuf qui couve
    for (const d2 of palette()) if (inBox(p, d2, 6)) { d2.o.col = d2.hue; snd.dress(); sparkle(d2.x + d2.w / 2, d2.y + d2.h / 2, 10, d2.c, 120); return; }
    // boutons d'action
    for (const a of actions()) if (inBox(p, a)) {
      if (!a.on && a.id !== 'feed' && a.id !== 'give') { snd.no(); if (a.id === 'nid') say('Le nid est déjà occupé'); return; }
      appui[a.id] = performance.now();   // le petit rebond du bouton
      if (a.id === 'feed') feed(sel); else if (a.id === 'give') livrer(sel); else if (a.id === 'sell') sell(sel); else if (a.id === 'nid') toNid(sel); else if (a.id === 'out') fromNid(sel);
      return;
    }
    // accessoires du coffre
    if (d.acc >= 0) { if (sel) dress(sel, d.acc); else { snd.no(); say('Touche d’abord une licorne, puis l’accessoire'); } return; }
    if (inBox(p, trayBoxes()[0])) { if (sel && sel.bebe) feed(sel); else say(bib + ' biberon' + (bib > 1 ? 's' : '') + ' : touche un bébé puis 🍼'); return; }
    if (d.u) { sel = sel === d.u ? null : d.u; if (sel) { sel.hop = 0.35; snd.pick(); } return; }
    if (inBox(p, L.fen)) { if (sel) livrer(sel); else say('Donne à l’enfant la licorne de sa bulle : fais-la glisser jusqu’à la fenêtre'); return; }
    if (inBox(p, L.nid)) { if (sel && sel.nid == null) toNid(sel); else say('Mets deux licornes adultes dans le nid d’amour'); return; }
    if (inBox(p, L.couv)) { say('La couveuse fait éclore tes œufs'); return; }
    sel = null;
  }
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.type !== 'keydown') return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (state === 'play' || state === 'ready') setPaused(!paused); return; }
    if ((e.key === 'Enter' || e.key === ' ') && state === 'title') { e.preventDefault(); if (LOADED || loadErr) startGame(); }
    if (paused && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPaused(false); }
  }
  function onVis() { if (document.hidden && (state === 'play' || state === 'ready')) setPaused(true); }
  function setPaused(p) { if (dead || state === 'end') return; paused = p; pauseBtn.innerHTML = p ? PB_PLAY : PB_PAUSE; last = 0; drag = null; down = null; }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play' || state === 'ready') setPaused(!paused); }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  function startGame() {
    state = 'ready'; stT = 0; snd.go(); manche = 1; vendues = 0; gagne = 0; timeLeft = tempsDe(1); client = null; clientT = 1.6;
    for (let i = 0; i < 4; i++) { spawnItem(); belt[belt.length - 1].x = L.belt.x0 + 120 + i * (L.belt.x1 - L.belt.x0 - 120) / 4; }
    couv.push({ t: 'commun', p: 0.15, done: false, wob: 0, col: null });   // un premier œuf déjà au chaud
  }
  if (!LOADED) loadImages().then(() => { if (!dead && state === 'load') state = 'title'; }).catch(e => { loadErr = String(e && e.message || e); if (!dead) state = 'title'; });

  // ---------- boucle ----------
  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'star') p.vy += 160 * dt; else p.vx *= 0.98; }
    parts = parts.filter(p => p.t < p.d);
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.3);
    for (const f of flyers) f.t += dt * 2.2; flyers = flyers.filter(f => f.t < 1);
    if (msg) { msg.t += dt; if (msg.t > 2.6) msg = null; }
    if (state === 'ready') { if (stT > 2.2) { state = 'play'; stT = 0; } return; }
    if (state === 'end') { if (stT > 2.4 && !overSent) { overSent = true; try { api.gameOver(score()); } catch (e) { /* rien */ } } return; }
    if (state !== 'play') return;
    timeLeft -= dt;
    const s = Math.ceil(timeLeft);
    if (s <= 10 && s !== tick && s > 0) { tick = s; snd.tick(); }
    if (timeLeft <= 0) { timeLeft = 0; state = 'end'; stT = 0; sel = null; drag = null; snd.no(); best = score(); return; }
    // le client : il arrive, attend (sa patience baisse), se réjouit ou est déçu, puis repart
    if (!client) { clientT -= dt; if (clientT <= 0) nouveauClient(); }
    else {
      const c = client; c.et += dt; c.ph += dt;
      if (c.etat === 'arrive' && c.et > 0.8) { c.etat = 'attend'; c.et = 0; }
      else if (c.etat === 'attend') { c.pat -= dt; if (c.pat <= 0) { c.etat = 'decu'; c.et = 0; c.partir = true; say('L’enfant n’a pas eu sa licorne… un autre arrive'); } }
      else if (c.etat === 'decu' && c.et > 1.3) { if (c.partir || c.pat <= 0) { c.etat = 'part'; c.et = 0; } else { c.etat = 'attend'; c.et = 0; } }
      else if (c.etat === 'joie' && c.et > 1.5) { c.etat = 'part'; c.et = 0; }
      else if (c.etat === 'part' && c.et > 0.8) { client = null; clientT = 1.2; }
    }
    // tapis
    // le tapis, plus doux (demande de PATOU, 3 nov.) : les objets sortent du trou de droite et rentrent dans celui de gauche
    beltT -= dt; if (!grande) grandeT -= dt; if (beltT <= 0) { spawnItem(); beltT = 3.0 + Math.random() * 1.2; }
    const spd = portrait ? 30 : 38;   // nettement plus lent (2e demande de PATOU)
    for (const it of belt) { it.x -= spd * dt; it.bob += dt * 4; if (it.shake > 0) it.shake -= dt; }
    belt = belt.filter(it => it.x > L.trous.g.x - 30);
    // couveuse
    for (const c of couv) {
      if (!c.done) { c.p += dt / OEUFS[c.t].eclot; if (c.p >= 1) { c.p = 1; c.done = true; } }
      c.wob += dt * (c.done ? 14 : 3 + c.p * 8);
    }
    for (let i = 0; i < couv.length; i++) {
      const c = couv[i];
      if (c.done && unis.length < MAX_UNIS) {
        couv.splice(i, 1); i--;
        const u = newUni(c.t); u.col = c.col; u.u = 0.1 + Math.random() * 0.3; u.v = Math.random(); unis.push(u);   // la couleur choisie : elle la garde en grandissant
        const x = L.couv.x + L.couv.w / 2, y = L.couv.y + L.couv.h * 0.45;
        snd.hatch(); sparkle(x, y, 20, null, 180); floatText(x, L.couv.y, 'Un bébé !', '#d0569a');
        flyers.push({ img: OEUFS[c.t].bebe, hue: c.col, x0: x, y0: y, x1: uniPos(u).x, y1: uniPos(u).y - uniH(u) / 2, t: 0, s: uniH(u) });
        u.pop = 0.9;
        if (c.t === 'leg') { try { api.celebrate && api.celebrate('Un bébé légendaire !'); } catch (e) { /* rien */ } }
      } else if (c.done && unis.length >= MAX_UNIS && Math.random() < dt * 0.4) say('La maison est pleine : vends ou mets des licornes au nid');
    }
    while (couv.length < cap() && queue.length) couv.push({ t: queue.shift(), p: 0, done: false, wob: 0, col: null });
    // nid d'amour
    if (nid[0] && nid[1] && !nidEgg) {
      nidT += dt;
      if (Math.random() < dt * 3) hearts(L.nid.x + L.nid.w / 2, L.nid.y + 20, 1);
      if (nidT >= NID_DUREE) { nidT = 0; nidEgg = nidOeuf(); snd.hatch(); sparkle(L.nid.x + L.nid.w / 2, L.nid.y + L.nid.h / 2, 20, '#ff9fd0'); floatText(L.nid.x + L.nid.w / 2, L.nid.y, OEUFS[nidEgg].nom + ' !', '#d0569a'); }
    }
    if (nidEgg) {
      if (couv.length < cap()) { couv.push({ t: nidEgg, p: 0, done: false, wob: 0, col: null }); flyers.push({ img: OEUFS[nidEgg].img, x0: L.nid.x + L.nid.w / 2, y0: L.nid.y + L.nid.h / 2, x1: L.couv.x + L.couv.w / 2, y1: L.couv.y + L.couv.h * 0.4, t: 0, s: 60 }); nidEgg = null; }
      else if (queue.length < MAX_QUEUE) { queue.push(nidEgg); nidEgg = null; }
    }
    // les licornes se promènent ; les bébés boivent un peu de lait tout seuls (très lentement)
    for (const u of unis.concat(nid.filter(Boolean))) {
      u.ph += dt; if (u.pop > 0) u.pop = Math.max(0, u.pop - dt); if (u.hop > 0) u.hop = Math.max(0, u.hop - dt);
      if (u.bebe) { u.laitT += dt; if (u.laitT > 32) { u.laitT = 0; grow(u, 1); } }
      if (u.nid != null || (drag && drag.u === u)) continue;
      const dx = u.tu - u.u, dy = u.tv - u.v, d = Math.hypot(dx * L.enclos.w, dy * L.enclos.h);
      if (d < 4) { u.marche = false; u.repos = (u.repos || 0) + dt; u.wait -= dt; if (u.wait <= 0) { u.tu = Math.random(); u.tv = Math.random(); u.wait = 1 + Math.random() * 3; } }
      else {
        const pas = (u.bebe ? 28 : 38) * dt, v = pas / d; u.u += dx * Math.min(1, v); u.v += dy * Math.min(1, v);
        // un tour de marche (8 images) tous les FOULEE pixels : les sabots ne glissent pas
        if (!u.marche) { u.marche = true; u.step = 0; } u.step = (u.step || 0) + Math.min(pas, d) / ((u.bebe ? FOULEE_BEBE : FOULEE) / 8); u.repos = 0;
        if (Math.abs(dx * L.enclos.w) > 6) u.face = dx > 0 ? 1 : -1;
      }
    }
    // manette : A = acheter l'objet le plus à gauche qu'on peut payer (aide simple pour l'alpha)
    if (pad && pad.pressed && pad.pressed('a')) { const it = belt.filter(i => visible(i) && coins >= i.prix).sort((a, b) => a.x - b.x)[0]; if (it) buy(it); }
  }

  // ---------- dessin ----------
  // un carrelage d'hexagones pastel (les mêmes couleurs que le sol du décor), mis en cache par mise en page
  let carC = null;
  function carrelage(y0, h) {
    const k = LW + '|' + Math.round(y0) + '|' + Math.round(h);
    if (!carC || carC.k !== k) {
      const r0 = 36, dx = r0 * Math.sqrt(3), dy = r0 * 1.5, cols = ['#d9d3f2', '#cfe3f3', '#d7efe8', '#ecdcef'], P = cols.map(() => new Path2D());
      for (let j = -1, y = y0 - dy; y < y0 + h + dy; j++, y += dy) for (let i = -1, x = (j & 1) * dx / 2 - dx; x < LW + dx; i++, x += dx) {
        const pp = P[((i * 3 + j * 5) % 4 + 4) % 4]; pp.moveTo(x + r0 * Math.cos(Math.PI / 6), y + r0 * Math.sin(Math.PI / 6));
        for (let a = 1; a <= 6; a++) pp.lineTo(x + r0 * Math.cos(Math.PI / 6 + a * Math.PI / 3), y + r0 * Math.sin(Math.PI / 6 + a * Math.PI / 3));
      }
      carC = { k, P, cols };
    }
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, LW, h); ctx.clip();
    ctx.fillStyle = '#f4f0fb'; ctx.fillRect(0, y0, LW, h);
    carC.P.forEach((pp, i) => { ctx.fillStyle = carC.cols[i]; ctx.fill(pp); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.stroke(pp); });
    const om = ctx.createLinearGradient(0, y0, 0, y0 + 40); om.addColorStop(0, 'rgba(150,110,160,0.22)'); om.addColorStop(1, 'rgba(150,110,160,0)'); ctx.fillStyle = om; ctx.fillRect(0, y0, LW, 40);   // l'ombre au pied du mur
    ctx.restore();
  }
  function drawBg() {
    const f = IMG.fond;
    if (!portrait) {
      if (f) ctx.drawImage(f, 0, 0, LW, LH); else { ctx.fillStyle = '#f7d6e2'; ctx.fillRect(0, 0, LW, LH); }
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#f8dbe5'); g.addColorStop(1, '#f3cfdc'); ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    // le carrelage de la boutique, sous la scène et jusqu'en bas (dessiné : il prend n'importe quelle hauteur sans s'étirer)
    const S = L.scene, fy0 = S.y + S.wallH;
    carrelage(fy0, LH - fy0);
    if (!f) return;
    ctx.drawImage(f, 360, 28, 140, 70, 60, 60, 140, 70); ctx.drawImage(f, 960, 28, 140, 70, 520, 60, 140, 70);   // arcs-en-ciel
    const b = L.belt.draw; ctx.drawImage(f, 175, 88, 1037, 112, b.x, b.y, b.w, b.w * 112 / 1037);
    // le mur de la scène (dessiné, comme celui du décor) : rose doux, un petit arc-en-ciel, un nuage, des étoiles, la plinthe
    const wy = S.y, wh = S.wallH, gw = ctx.createLinearGradient(0, wy, 0, wy + wh); gw.addColorStop(0, '#f9e1ea'); gw.addColorStop(1, '#f4d2e0');
    ctx.fillStyle = gw; ctx.fillRect(0, wy, LW, wh);
    ctx.save(); ctx.globalAlpha = 0.7; ctx.lineCap = 'round';
    ['#ffc2d4', '#ffe0b8', '#fff3b8', '#d4f2c8', '#c8e6ff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(LW * 0.74, wy + wh * 0.78, wh * 0.42 - i * 9, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); });
    ctx.restore();
    nuage(ctx, LW * 0.66, wy + wh * 0.7, 30); nuage(ctx, LW * 0.84, wy + wh * 0.74, 24); nuage(ctx, LW * 0.2, wy + wh * 0.42, 34);
    ctx.fillStyle = '#fff3b0'; [[0.08, 0.2], [0.36, 0.3], [0.5, 0.16], [0.94, 0.3], [0.3, 0.68]].forEach(([x, y], i) => etoile4(ctx, LW * x, wy + wh * y, 7 + (i % 2) * 3));
    ctx.fillStyle = '#fff6fa'; ctx.fillRect(0, wy + wh - 16, LW, 16); ctx.fillStyle = '#e8b9cf'; ctx.fillRect(0, wy + wh - 16, LW, 2); ctx.fillRect(0, wy + wh - 2, LW, 2);
    const c = L.counterDraw; ctx.drawImage(f, 195, 416, 536, 196, c.x, c.y, c.w, c.w * 196 / 536);
  }
  function drawHud() {
    const y = L.hud.y, h = L.hud.h, fs = Math.round(h * 0.5);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textBaseline = 'middle';
    // pièces
    pill(ctx, 14, y, portrait ? 196 : 210, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.strokeStyle = '#e8b6d8'; ctx.lineWidth = 3; ctx.stroke();
    drawImg(ctx, 'piece', 18, y + 4, h - 8, h - 8);
    ctx.fillStyle = '#b07a00'; ctx.textAlign = 'left'; ctx.fillText(String(coins), 18 + h, y + h / 2 + 1);
    // temps
    const s = Math.max(0, Math.ceil(timeLeft)), ts = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const tx = portrait ? 220 : LW / 2 - 150, tw = portrait ? 164 : 300, chaud = s <= 10 && state === 'play';
    pill(ctx, tx, y, tw, h, h / 2); ctx.fillStyle = chaud ? 'rgba(255,120,150,0.92)' : 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = chaud ? '#fff' : '#8a4fb0'; ctx.textAlign = 'center';
    const ligne1 = 'Manche ' + manche + ' · ' + vendues + '/' + objectifDe(manche) + ' 🦄';
    if (portrait) { ctx.font = 'bold ' + Math.round(fs * 0.6) + 'px ' + RF; ctx.fillText(ligne1, tx + tw / 2, y + h * 0.3); ctx.font = 'bold ' + Math.round(fs * 0.75) + 'px ' + RF; ctx.fillText('⏱ ' + ts, tx + tw / 2, y + h * 0.72); ctx.font = 'bold ' + fs + 'px ' + RF; }
    else { ctx.font = 'bold ' + Math.round(fs * 0.78) + 'px ' + RF; ctx.fillText(ligne1 + '  ·  ⏱ ' + ts, tx + tw / 2, y + h / 2 + 1, tw - 16); ctx.font = 'bold ' + fs + 'px ' + RF; }
    // valeur
    const vx = portrait ? 396 : LW - 330, vw = portrait ? 210 : 250;
    pill(ctx, vx, y, vw, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.font = 'bold ' + Math.round(fs * 0.55) + 'px ' + RF; ctx.fillText('VALEUR', vx + 16, y + h / 2 + 1);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'right'; ctx.fillText('⭐ ' + score(), vx + vw - 14, y + h / 2 + 1);
  }
  // un trou sombre dans le mur, au bout du tapis : la voûte (arrondie en haut), le noir du fond, le bord crème comme la porte du mur
  function voute(t) { const r0 = t.w / 2, top = t.bas - t.h; ctx.beginPath(); ctx.moveTo(t.x - r0, t.bas); ctx.lineTo(t.x - r0, top + r0); ctx.arc(t.x, top + r0, r0, Math.PI, 0); ctx.lineTo(t.x + r0, t.bas); ctx.closePath(); }
  function trouFond(t) {
    voute(t); const g = ctx.createRadialGradient(t.x, t.bas - t.h * 0.42, 4, t.x, t.bas - t.h * 0.42, t.h * 0.75);
    g.addColorStop(0, '#1d0b26'); g.addColorStop(0.7, '#3a1a48'); g.addColorStop(1, '#5c2f6c'); ctx.fillStyle = g; ctx.fill();
  }
  function trouDevant(t, versDroite) {
    // l'ombre qui avale les objets : noire au fond du trou, transparente au bord
    ctx.save(); voute(t); ctx.clip();
    const x0 = versDroite ? t.x - t.w / 2 : t.x + t.w / 2, g = ctx.createLinearGradient(x0, 0, t.x, 0);
    g.addColorStop(0, 'rgba(29,11,38,0)'); g.addColorStop(0.5, 'rgba(29,11,38,0.9)'); g.addColorStop(0.8, 'rgba(29,11,38,1)');
    ctx.fillStyle = g; ctx.fillRect(t.x - t.w / 2, t.bas - t.h, t.w, t.h); ctx.restore();
    // le bord de la voûte
    voute(t); ctx.lineJoin = 'round'; ctx.lineWidth = t.w * 0.13; ctx.strokeStyle = '#fbe9f1'; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#d99bbd'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.55; ctx.lineWidth = t.w * 0.05; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(t.x, t.bas - t.h + t.w / 2, t.w / 2 - t.w * 0.03, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke(); ctx.restore();
  }
  function drawBelt() {
    const T = L.trous;
    trouFond(T.g); trouFond(T.d);
    // les objets n'existent qu'entre le milieu des deux trous (ils y entrent et en sortent)
    ctx.save(); ctx.beginPath();
    const rg = T.g.w / 2, rd = T.d.w / 2, yg = T.g.bas - T.g.h + rg, yd = T.d.bas - T.d.h + rd, bas = L.belt.y + 60;
    ctx.moveTo(T.g.x, bas); ctx.lineTo(T.g.x, yg - rg); ctx.arc(T.g.x, yg, rg, -Math.PI / 2, 0); ctx.lineTo(T.g.x + rg, 0);
    ctx.lineTo(T.d.x - rd, 0); ctx.lineTo(T.d.x - rd, yd); ctx.arc(T.d.x, yd, rd, Math.PI, Math.PI * 1.5); ctx.lineTo(T.d.x, bas); ctx.closePath(); ctx.clip();
    for (const it of belt) {
      const b = itemBox(it), sh = it.shake > 0 ? Math.sin(it.shake * 60) * 4 : 0;
      const ok = coins >= it.prix;
      ctx.save(); if (!ok) ctx.globalAlpha = 0.6;
      if (it.k === 'gcouv') {   // la grande couveuse : un halo doré et « ×4 »
        const gl = ctx.createRadialGradient(it.x, b.y + b.h / 2, 4, it.x, b.y + b.h / 2, b.w * 0.75); gl.addColorStop(0, 'rgba(255,224,110,0.75)'); gl.addColorStop(1, 'rgba(255,224,110,0)');
        ctx.fillStyle = gl; ctx.fillRect(b.x - b.w * 0.3, b.y - b.h * 0.3, b.w * 1.6, b.h * 1.6);
      }
      drawObjet(ctx, it.img, b.x + sh, b.y, b.w, b.h);
      if (it.k === 'gcouv') { ctx.font = 'bold 20px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText('×4', b.x + b.w - 8, b.y + 10); ctx.fillStyle = '#c0408a'; ctx.fillText('×4', b.x + b.w - 8, b.y + 10); }
      ctx.restore();
      // étiquette de prix
      const pw = it.k === 'gcouv' ? 74 : 64, ph = 26, px = it.x - pw / 2, py = L.belt.y + 4;
      ctx.globalAlpha = Math.max(0, Math.min(1, (T.d.x - T.d.w / 2 - it.x + 10) / 40, (it.x - T.g.x - T.g.w / 2 + 10) / 40));   // l'étiquette s'efface au bord des trous
      pill(ctx, px, py, pw, ph, 13); ctx.fillStyle = ok ? '#fff6c8' : '#f1e3ea'; ctx.fill(); ctx.strokeStyle = ok ? '#e2b33c' : '#d7b5c7'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = 'bold 17px ' + RF; ctx.fillStyle = ok ? '#9a6a00' : '#a08a96'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🪙' + it.prix, it.x, py + ph / 2 + 1); ctx.globalAlpha = 1;
    }
    ctx.restore();
    trouDevant(T.g, false); trouDevant(T.d, true);
  }
  // la couveuse : jamais vide à l'intérieur (un coussin de paille), les œufs posés dessus ; la grande couveuse en prend 4
  function drawCouv() {
    const c0 = L.couv, k = grande ? 1.28 : 1, c = { x: c0.x + c0.w * (1 - k) / 2, y: c0.y + c0.h * (1 - k), w: c0.w * k, h: c0.h * k };
    if (grande) { const gl = ctx.createRadialGradient(c.x + c.w / 2, c.y + c.h * 0.5, 6, c.x + c.w / 2, c.y + c.h * 0.5, c.w * 0.7); gl.addColorStop(0, 'rgba(255,224,110,0.35)'); gl.addColorStop(1, 'rgba(255,224,110,0)'); ctx.fillStyle = gl; ctx.fillRect(c.x - 30, c.y - 30, c.w + 60, c.h + 60); }
    drawImg(ctx, 'couveuse', c.x, c.y, c.w, c.h);
    // le coussin de paille
    const nx = c.x + c.w / 2, ny = c.y + c.h * 0.63, nrx = c.w * (grande ? 0.31 : 0.26), nry = c.h * 0.075;
    ctx.fillStyle = 'rgba(120,70,40,0.25)'; ctx.beginPath(); ctx.ellipse(nx, ny + nry * 0.5, nrx * 1.05, nry * 1.1, 0, 0, TAU); ctx.fill();
    const gp = ctx.createLinearGradient(0, ny - nry, 0, ny + nry); gp.addColorStop(0, '#f6dd8a'); gp.addColorStop(1, '#d7a94a');
    ctx.fillStyle = gp; ctx.beginPath(); ctx.ellipse(nx, ny, nrx, nry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,110,40,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x1 = nx + Math.cos(a) * nrx * 0.95, y1 = ny + Math.sin(a) * nry * 0.9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(a + 1.2) * nrx * 0.28, y1 + Math.sin(a + 1.2) * nry * 0.5 - 2); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // les œufs, posés sur la paille
    const n = couv.length, s = n > 2 ? 0.3 : n > 1 ? 0.36 : 0.44, eh = c0.h * s;
    couv.forEach((o, i) => {
      const ew = eh * ratio(OEUFS[o.t].img), cx = nx + (n > 1 ? (i - (n - 1) / 2) * Math.min(ew * 1.02, nrx * 2 / n) : 0), cy = ny + nry * 0.25;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(o.wob) * (o.done ? 0.2 : 0.06));
      drawImg(ctx, OEUFS[o.t].img, -ew / 2, -eh, ew, eh, o.col); ctx.restore();
      // jauge
      const jw = n > 2 ? 34 : 52; ctx.fillStyle = 'rgba(255,255,255,0.8)'; pill(ctx, cx - jw / 2, c.y + c.h - 6, jw, 9, 4); ctx.fill();
      ctx.fillStyle = '#ff8cc6'; pill(ctx, cx - jw / 2, c.y + c.h - 6, jw * o.p, 9, 4); ctx.fill();
    });
    // un reflet sur la cloche, par-dessus les œufs (ils sont dedans)
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = c.w * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(c.x + c.w * 0.5, c.y + c.h * 0.5, c.w * 0.33, Math.PI * 1.12, Math.PI * 1.36); ctx.stroke(); ctx.restore();
    queue.forEach((t, i) => drawImg(ctx, OEUFS[t].img, c0.x + c0.w - 6 + i * 26 - 0, c0.y + c0.h - 36 - i * 4, 24, 32));
    // le choix de la couleur
    const P = palette();
    if (P.length) {
      const a = P[0], z = P[P.length - 1], pul = 1 + Math.sin(stT * 5) * 0.06;
      pill(ctx, a.x - 10, a.y - 24, z.x + z.w - a.x + 20, a.h + 32, 18); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.strokeStyle = '#efb3d6'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = 'bold 14px ' + RF; ctx.fillStyle = '#9a4fb8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Choisis la couleur de l’œuf', (a.x + z.x + z.w) / 2, a.y - 11);
      for (const d of P) { ctx.beginPath(); ctx.arc(d.x + d.w / 2, d.y + d.h / 2, d.w / 2 * pul, 0, TAU); ctx.fillStyle = d.c; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    }
  }
  function label(s, x, y) {
    ctx.font = 'bold 18px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s).width + 20; pill(ctx, x - w / 2, y - 13, w, 26, 13); ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fill();
    ctx.fillStyle = '#9a4fb8'; ctx.fillText(s, x, y + 1);
  }
  function drawNid() {
    const n = L.nid;
    drawImg(ctx, 'nid', n.x, n.y, n.w, n.h);
    if (nid[0] && nid[1] && !nidEgg) {
      const p = nidT / NID_DUREE; ctx.fillStyle = 'rgba(255,255,255,0.8)'; pill(ctx, n.x + n.w / 2 - 40, n.y + n.h - 2, 80, 10, 5); ctx.fill();
      ctx.fillStyle = '#ff6fae'; pill(ctx, n.x + n.w / 2 - 40, n.y + n.h - 2, 80 * p, 10, 5); ctx.fill();
    }
    if (nidEgg) drawImg(ctx, OEUFS[nidEgg].img, n.x + n.w / 2 - 18, n.y + n.h * 0.3, 36, 46);
  }
  // la fenêtre des clients (à droite) : un enfant y arrive, attend, se réjouit ou est déçu, puis repart
  function drawFenetre() {
    const f = L.fen, hot = drag && drag.u && inBox(drag, f, 14);
    // le cadre
    ctx.save();
    ctx.fillStyle = 'rgba(90,50,110,0.16)'; pill(ctx, f.x + 6, f.y + 8, f.w, f.h, 26); ctx.fill();
    pill(ctx, f.x, f.y, f.w, f.h, 26); ctx.fillStyle = '#fff4f8'; ctx.fill();
    const ix = f.x + 12, iy = f.y + 12, iw = f.w - 24, ih = f.h - 36;
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#e8f6ff');
    pill(ctx, ix, iy, iw, ih, 18); ctx.fillStyle = g; ctx.fill();
    // dehors : un peu d'herbe et un nuage
    ctx.save(); pill(ctx, ix, iy, iw, ih, 18); ctx.clip();
    ctx.fillStyle = '#bfe8a8'; ctx.fillRect(ix, iy + ih * 0.78, iw, ih * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ix + iw * 0.22, iy + ih * 0.2, 12, 0, TAU); ctx.arc(ix + iw * 0.34, iy + ih * 0.17, 15, 0, TAU); ctx.arc(ix + iw * 0.46, iy + ih * 0.21, 11, 0, TAU); ctx.fill();
    // l'enfant (on le voit jusqu'à la taille, derrière le rebord)
    const c = client;
    if (c) {
      const pose = c.etat === 'joie' || (c.etat === 'part' && c.servi) ? 'j' : c.etat === 'decu' || (c.etat === 'part' && !c.servi) ? 'd' : 'a';
      const nm = 'enfant-' + c.k + '-' + pose, hh = ih * 1.32, ww = hh * (IMG[nm] ? ratio(nm) : 0.6);
      let dx = 0, dy = 0, sy = 1;
      if (c.etat === 'arrive') { const k = 1 - Math.min(1, c.et / 0.8); dx = k * k * iw * 0.9; dy = Math.abs(Math.sin(c.et * 9)) * -5; }
      else if (c.etat === 'part') { const k = Math.min(1, c.et / 0.8); dx = k * k * iw * 0.9; dy = Math.abs(Math.sin(c.et * 9)) * -5; }
      else if (c.etat === 'attend') { sy = 1 + Math.sin(c.ph * 2.4) * 0.012; dy = Math.sin(c.ph * 2.4) * 1.2; }
      else if (c.etat === 'joie') dy = -Math.abs(Math.sin(c.et * 7)) * 12;
      else if (c.etat === 'decu') dx = Math.sin(c.et * 30) * 3 * Math.max(0, 1 - c.et);
      const fx = ix + iw / 2 + dx, fy = iy + ih + hh * 0.42 + dy;
      ctx.translate(fx, fy); ctx.scale(1, sy);
      if (IMG[nm]) ctx.drawImage(IMG[nm], -ww / 2, -hh, ww, hh);
      else { ctx.font = Math.round(hh * 0.5) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(pose === 'j' ? '😄' : pose === 'd' ? '😢' : '🙂', 0, -hh * 0.3); }
    }
    ctx.restore();
    // le rebord et le contour
    pill(ctx, ix - 6, iy + ih - 4, iw + 12, 22, 10); const gr = ctx.createLinearGradient(0, iy + ih - 4, 0, iy + ih + 18); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#f1c9dc'); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#d99bbd'; ctx.lineWidth = 2.5; ctx.stroke();
    pill(ctx, f.x, f.y, f.w, f.h, 26); ctx.lineWidth = hot ? 6 : 3; ctx.strokeStyle = hot ? '#ffd34d' : '#e6a9c9'; ctx.stroke();
    ctx.restore();
  }
  // la bulle de l'enfant : la licorne qu'il veut (âge, couleur, accessoire, scintillante) et sa patience
  function drawBulle() {
    const c = client; if (!c || c.etat === 'arrive' || c.etat === 'part' || c.etat === 'joie') return;
    const B = L.bulle, w = c.want, f = L.fen, pop = c.etat === 'attend' && c.et < 0.3 ? 0.7 + c.et : 1;
    ctx.save(); ctx.translate(B.x + B.w / 2, B.y + B.h / 2); ctx.scale(pop, pop); ctx.translate(-(B.x + B.w / 2), -(B.y + B.h / 2));
    // la bulle et sa pointe vers l'enfant
    ctx.fillStyle = 'rgba(90,50,110,0.14)'; pill(ctx, B.x + 4, B.y + 6, B.w, B.h, 24); ctx.fill();
    ctx.fillStyle = '#ffffff'; pill(ctx, B.x, B.y, B.w, B.h, 24); ctx.fill();
    ctx.beginPath();
    if (portrait) { ctx.moveTo(B.x + B.w * 0.42, B.y + B.h - 2); ctx.lineTo(B.x + B.w * 0.5, B.y + B.h + 22); ctx.lineTo(B.x + B.w * 0.62, B.y + B.h - 2); }
    else { ctx.moveTo(B.x + B.w - 2, B.y + B.h * 0.48); ctx.lineTo(f.x + 22, B.y + B.h * 0.66); ctx.lineTo(B.x + B.w - 2, B.y + B.h * 0.7); }
    ctx.fill(); ctx.strokeStyle = c.etat === 'decu' ? '#ff8aa8' : '#efb3d6'; ctx.lineWidth = 3; pill(ctx, B.x, B.y, B.w, B.h, 24); ctx.stroke();
    // la licorne voulue
    const nm = w.adulte ? 'adulte-blanche' : 'bebe-rose', h = B.h * (w.adulte ? 0.62 : 0.54), lw = h * ratio(nm), lx = B.x + B.w / 2 - lw / 2, ly = B.y + B.h * 0.7 - h;
    ctx.save(); ctx.translate(lx, ly);
    if (w.brille) { ctx.shadowColor = 'hsl(' + Math.round((stT * 140) % 360) + ',100%,72%)'; ctx.shadowBlur = 18; }
    const d = w.acc ? ACC[w.acc][w.adulte ? 'a' : 'k'] : null;
    if (d && d.b) accDraw({ a: w.acc, d }, { w: lw, h });
    drawImg(ctx, nm, 0, 0, lw, h, w.col); ctx.shadowBlur = 0;
    if (d && !d.b) accDraw({ a: w.acc, d }, { w: lw, h });
    ctx.restore();
    if (w.brille) for (let i = 0; i < 4; i++) { const k = (stT * 1.6 + i / 4) % 1, a = i * 1.6; ctx.fillStyle = ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff'][i]; star(ctx, B.x + B.w / 2 + Math.cos(a) * lw * 0.55, ly + h * 0.5 + Math.sin(a) * h * 0.5, 2 + Math.sin(k * Math.PI) * 6, stT * 3 + i); }
    // en mots, pour les grands
    const coul = COULEURS.find(k => k.h === w.col);
    ctx.font = 'bold 14px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a4fb0';
    ctx.fillText((w.adulte ? 'Grande' : 'Bébé') + ' ' + coul.n.toLowerCase() + (w.acc ? ' + ' + ACC[w.acc].nom.toLowerCase() : '') + (w.brille ? ' ✨' : ''), B.x + B.w / 2, B.y + B.h * 0.8, B.w - 14);
    // la patience
    const k = Math.max(0, c.pat / c.patMax), bw = B.w - 36;
    ctx.fillStyle = 'rgba(230,200,220,0.9)'; pill(ctx, B.x + 18, B.y + B.h - 16, bw, 8, 4); ctx.fill();
    ctx.fillStyle = k > 0.5 ? '#7fd38a' : k > 0.25 ? '#ffc04a' : '#ff6f8f'; pill(ctx, B.x + 18, B.y + B.h - 16, bw * k, 8, 4); ctx.fill();
    ctx.restore();
  }
  function drawUni(u) {
    const b = uniBox(u), nm = uniImg(u), dragging = drag && drag.u === u;
    const hop = u.hop > 0 ? Math.sin(u.hop / 0.35 * Math.PI) * 18 : 0;   // le petit saut quand on la pose (la marche, elle, est dans les images)
    const pop = u.pop > 0 ? 1 + Math.sin(u.pop * 12) * 0.06 * u.pop : 1;
    // ombre
    ctx.fillStyle = 'rgba(90,50,110,0.18)'; ctx.beginPath(); ctx.ellipse(b.fx, b.fy - 2, b.w * 0.34, b.h * 0.06, 0, 0, TAU); ctx.fill();
    if (sel === u) { ctx.fillStyle = 'rgba(255,240,140,0.55)'; ctx.beginPath(); ctx.ellipse(b.fx, b.fy - 2, b.w * 0.46, b.h * 0.1, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(b.fx, b.fy - hop); ctx.scale(u.face * pop, pop); ctx.translate(-b.w / 2, -b.h);
    if (u.brille) { ctx.shadowColor = 'hsl(' + Math.round((stT * 140 + u.id * 40) % 360) + ',100%,72%)'; ctx.shadowBlur = 24; }   // reflet arc-en-ciel qui tourne
    const accs = u.accs.map(a => ({ a, d: ACC[a][u.bebe ? 'k' : 'a'] }));
    for (const o of accs) if (o.d.b) accDraw(o, b);
    drawImg(ctx, uniPose(u), 0, 0, b.w, b.h, u.col); ctx.shadowBlur = 0;
    for (const o of accs) if (!o.d.b) accDraw(o, b);
    ctx.restore();
    if (u.bebe) {   // le lait bu (3 = adulte)
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < u.lait ? '#ff8cc6' : 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(b.fx - 16 + i * 16, b.y - 6 - hop, 5.5, 0, TAU); ctx.fill(); }
    }
    if (u.brille) {   // des étincelles qui s'allument tour à tour autour d'elle
      for (let i = 0; i < 5; i++) { const k = (stT * 1.6 + i / 5 + u.id * 0.13) % 1, a = i * 1.7 + u.id, rr = Math.sin(k * Math.PI);
        ctx.fillStyle = ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff', '#ffe08a'][i]; star(ctx, b.fx + Math.cos(a) * b.w * 0.45, b.y + b.h * 0.5 + Math.sin(a) * b.h * 0.42 - hop, 3 + rr * 6, stT * 3 + i); }
    }
    if (sel === u) { ctx.fillStyle = '#fff3a0'; star(ctx, b.fx, b.y - 22 - hop + Math.sin(stT * 5) * 3, 10, stT * 2); }
  }
  function accDraw(o, b) {
    const h = b.h * o.d.s, w = h * ratio(o.a);
    drawImg(ctx, o.a, b.w * o.d.ax - w / 2, b.h * o.d.ay - h / 2 + (o.a === 'fers' ? 0 : 0), w, h);
  }
  function drawTray() {
    const t = L.tray;
    pill(ctx, t.x, t.y, t.w, t.h, 22); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.strokeStyle = '#e6b8dc'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = 'bold 16px ' + RF; ctx.fillStyle = '#9a4fb8'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Biberons, couleurs et accessoires', t.x + 18, t.y + 13);
    const tb = trayBoxes();
    tb.forEach((b, i) => {
      pill(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = i ? 'rgba(244,226,250,0.9)' : 'rgba(255,236,246,0.95)'; ctx.fill();
      if (i === 0) {
        drawImg(ctx, 'biberon', b.x + b.w * 0.25, b.y + 4, b.w * 0.5 * ratio('biberon') * 2, b.h - 8);
        ctx.font = 'bold 20px ' + RF; ctx.textAlign = 'right'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('×' + bib, b.x + b.w - 2, b.y + b.h - 11); ctx.fillStyle = '#c0408a'; ctx.fillText('×' + bib, b.x + b.w - 2, b.y + b.h - 11);
      } else if (tray[i - 1] != null && !(drag && drag.acc === i - 1)) {
        const a = tray[i - 1], r = ratio(a), s = b.w - 10; const w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s;
        drawObjet(ctx, a, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
      }
    });
  }
  function drawAct() {
    const a = L.act;
    pill(ctx, a.x, a.y, a.w, a.h, 22); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.strokeStyle = '#e6b8dc'; ctx.lineWidth = 3; ctx.stroke();
    const u = sel;
    if (!u) {
      ctx.font = 'bold 20px ' + RF; ctx.fillStyle = '#9a6ab8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Touche une licorne pour t’en occuper', a.x + a.w / 2, a.y + a.h / 2 - 12);
      ctx.font = '16px ' + RF; ctx.fillText('ou fais-la glisser vers le nid ou la fenêtre', a.x + a.w / 2, a.y + a.h / 2 + 16);
      return;
    }
    const nm = uniImg(u), ih = 86, iw = ih * ratio(nm);
    ctx.save(); ctx.translate(a.x + 70, a.y + a.h / 2 + ih / 2 - 4); ctx.scale(Math.min(1, 120 / iw), Math.min(1, 120 / iw)); drawImg(ctx, nm, -iw / 2, -ih, iw, ih, u.col); ctx.restore();
    ctx.font = 'bold 15px ' + RF; ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText((u.bebe ? 'Bébé · ' + ['', 'rare', 'légendaire'][['commun', 'rare', 'leg'].indexOf(u.ligne)] : ADULTES[u.adulte].nom).replace(/ · $/, '') + (u.accs.length ? ' · ' + u.accs.length + ' accessoire' + (u.accs.length > 1 ? 's' : '') : ''), a.x + 138, a.y + 15);
    for (const b of actions()) drawBouton(b);
  }
  // un bouton mignon : arrondi pastel, ombre douce, reflet, icône au-dessus et mot entier dessous (plus petit ou sur deux lignes s'il le faut)
  function drawBouton(b) {
    const t = appui[b.id] ? (performance.now() - appui[b.id]) / 1000 : 9, k = t < 0.35 ? 1 - Math.sin(t / 0.35 * Math.PI) * 0.09 : 1;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(22, b.h * 0.32);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); ctx.globalAlpha = b.on ? 1 : 0.5;
    ctx.fillStyle = 'rgba(150,80,140,0.22)'; pill(ctx, b.x, b.y + 4, b.w, b.h, r); ctx.fill();
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, b.c[0]); g.addColorStop(1, b.c[1]);
    pill(ctx, b.x, b.y, b.w, b.h, r); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; pill(ctx, b.x + 8, b.y + 5, b.w - 16, b.h * 0.26, r * 0.6); ctx.fill();
    // l'icône
    const big = portrait ? 1.15 : 1, icS = Math.round(Math.min(26 * big, b.h * 0.32));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = icS + 'px system-ui, sans-serif';
    ctx.fillText(b.ic, cx, b.y + b.h * (b.sub ? 0.26 : 0.32));
    // le mot : jamais coupé (on réduit, puis on passe à la ligne)
    const maxW = b.w - 14; let fs = Math.round(18 * big), lignes = [b.t];
    ctx.font = 'bold ' + fs + 'px ' + RF;
    while (ctx.measureText(b.t).width > maxW && fs > 13) { fs--; ctx.font = 'bold ' + fs + 'px ' + RF; }
    if (ctx.measureText(b.t).width > maxW && b.t.includes(' ')) { const m = b.t.split(' '); lignes = [m.slice(0, Math.ceil(m.length / 2)).join(' '), m.slice(Math.ceil(m.length / 2)).join(' ')]; }
    while (lignes.some(l => ctx.measureText(l).width > maxW) && fs > 9) { fs--; ctx.font = 'bold ' + fs + 'px ' + RF; }
    ctx.fillStyle = b.tc; const ly = b.y + b.h * (b.sub ? 0.58 : 0.7) - (lignes.length - 1) * fs * 0.55;
    lignes.forEach((l, i) => ctx.fillText(l, cx, ly + i * fs * 1.1));
    if (b.sub) { ctx.font = 'bold ' + Math.max(11, Math.round(fs * 0.82)) + 'px ' + RF; ctx.globalAlpha *= 0.85; ctx.fillText(b.sub, cx, b.y + b.h * 0.84); }
    ctx.restore();
  }
  function drawFx() {
    for (const f of flyers) {
      const e = 1 - Math.pow(1 - f.t, 3), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(f.t * Math.PI) * 80, s = f.s * (1 - f.t * 0.4);
      ctx.globalAlpha = 1 - f.t * 0.3; drawImg(ctx, f.img, x - s * ratio(f.img) / 2, y - s / 2, s * ratio(f.img), s, f.hue); ctx.globalAlpha = 1;
    }
    for (const p of parts) {
      const a = 1 - p.t / p.d; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.c;
      if (p.k === 'heart') heart(ctx, p.x, p.y, p.r); else star(ctx, p.x, p.y, p.r * (0.5 + a * 0.5), p.rot + p.t * 4);
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, 2 * (1.3 - t.t)); ctx.font = 'bold 26px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(t.s, t.x, t.y - t.t * 50); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y - t.t * 50);
    }
    ctx.globalAlpha = 1;
    if (msg) {
      ctx.globalAlpha = Math.min(1, (2.6 - msg.t) * 3); ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = Math.min(LW - 40, ctx.measureText(msg.s).width + 40), x = LW / 2, y = L.msgY;
      pill(ctx, x - w / 2, y - 22, w, 44, 22); ctx.fillStyle = 'rgba(122,63,160,0.9)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, x, y + 1, LW - 60);
      ctx.globalAlpha = 1;
    }
  }
  function drawTitle() {
    const ti = IMG.titre;
    if (ti) { const s = Math.max(LW / ti.width, LH / ti.height); ctx.drawImage(ti, (LW - ti.width * s) / 2, portrait ? 0 : (LH - ti.height * s) / 2, ti.width * s, ti.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#ffe3ef'); g.addColorStop(1, '#d9ccff'); ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH); }
    if (portrait && IMG.logo) { const lw = LW * 0.9, lh = lw / ratio('logo'); ctx.fillStyle = 'rgba(255,255,255,0.86)'; pill(ctx, 20, 70, LW - 40, lh + 30, 30); ctx.fill(); ctx.drawImage(IMG.logo, (LW - lw) / 2, 85, lw, lh); }
    // la carte « comment jouer »
    const cw = portrait ? 640 : 560, chh = portrait ? 330 : 270, cx = (LW - cw) / 2, cy = portrait ? LH - chh - 210 : LH - chh - 158;
    pill(ctx, cx, cy, cw, chh, 30); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.strokeStyle = '#f0b6dc'; ctx.lineWidth = 4; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7a3fa0';
    const lines = ['🥚 Achète des œufs et choisis leur couleur', '👧 Donne aux enfants la licorne de leur bulle', '🎨 Pots de couleur et 🎀 accessoires sur le tapis', '🍼 Biberon = elle grandit · ✨ les rares scintillent', '⏱ Chaque manche : une de plus, un peu plus vite !'];
    const fs = portrait ? 25 : 21; ctx.font = 'bold ' + fs + 'px ' + RF;
    lines.forEach((l, i) => ctx.fillText(l, cx + 26, cy + 34 + i * (chh - 100) / 4.4, cw - 40));
    ctx.textAlign = 'center'; ctx.font = (portrait ? 20 : 17) + 'px ' + RF; ctx.fillStyle = '#a066c0';
    ctx.fillText('Combien de manches tiendras-tu ?', LW / 2, cy + chh - 34, cw - 30);
    // bouton jouer
    const bw = portrait ? 340 : 300, bh = portrait ? 92 : 78, bx = (LW - bw) / 2, by = cy + chh + (portrait ? 28 : 14), k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(LW / 2, by + bh / 2); ctx.scale(k, k);
    pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#ff9fd2'); g.addColorStop(1, '#c46ee8'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF;
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    ctx.font = '15px ' + RF; ctx.fillStyle = 'rgba(110,60,140,0.85)'; ctx.fillText('Créé avec l’aide de l’IA', LW / 2, LH - 22);
    if (loadErr) { ctx.fillStyle = '#c03060'; ctx.font = 'bold 16px ' + RF; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', LW / 2, LH - 48, LW - 30); }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f3cfe0'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    if (state === 'load' || state === 'title') { drawTitle(); if (paused) drawPause(); return; }
    drawBg();
    drawBelt(); drawCouv(); drawNid(); drawFenetre();
    const list = unis.slice().sort((a, b) => uniPos(a).y - uniPos(b).y);
    for (const u of nid) if (u && !(drag && drag.u === u)) drawUni(u);
    for (const u of list) if (!(drag && drag.u === u)) drawUni(u);
    label('Couveuse', L.couv.x + L.couv.w / 2, L.couv.y + L.couv.h + 26); label('Nid d’amour', L.nid.x + L.nid.w / 2, L.nid.y + L.nid.h + 28);
    drawTray(); drawAct(); drawBulle();
    if (drag && drag.u) drawUni(drag.u);
    if (drag && drag.acc != null && tray[drag.acc] != null) { const a = tray[drag.acc], s = 70; drawObjet(ctx, a, drag.x - s * ratio(a) / 2, drag.y - s / 2, s * ratio(a), s); }
    drawFx(); drawHud();
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, LW, LH);
      big('Manche ' + manche, LH / 2 - 30);
      big('Livre ' + objectifDe(manche) + ' licornes en ' + Math.floor(tempsDe(manche) / 60) + ':' + String(tempsDe(manche) % 60).padStart(2, '0'), LH / 2 + 46, 0.42);
    }
    if (state === 'end') { ctx.fillStyle = 'rgba(255,240,250,0.6)'; ctx.fillRect(0, 0, LW, LH); big('Temps écoulé !', LH / 2 - 60); big('Tu as tenu jusqu’à la manche ' + manche, LH / 2 + 20, 0.42); big('Valeur de ta Maison : ' + best, LH / 2 + 80, 0.42); }
    if (paused) drawPause();
  }
  function big(s, y, k) {
    const fs = Math.round((portrait ? 76 : 84) * (k || 1)); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText(s, LW / 2, y); ctx.fillStyle = '#b35bd6'; ctx.fillText(s, LW / 2, y);
  }
  function drawPause() { ctx.fillStyle = 'rgba(90,40,110,0.45)'; ctx.fillRect(0, 0, LW, LH); big('PAUSE', LH / 2 - 30); big('Touche pour reprendre', LH / 2 + 40, 0.4); }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try {
      if (!paused) update(dt * FAST); else if (state === 'title' || state === 'load') stT += dt;
      if (state === 'title' && pad && pad.pressed && pad.pressed('a') && (LOADED || loadErr)) startGame();
      draw();
    } catch (e) { /* une image ratée ne doit pas arrêter le jeu */ }
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
      pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return state === 'play' || state === 'end' ? score() : 0; },
    currentLevel() { return manche; },
    pause() { if (state === 'play' || state === 'ready') setPaused(true); },
    resume() { setPaused(false); },
    // essais (harnais) : avancer le temps, état
    _test: {
      spawn(ligne, adulte, accs) { const u = newUni(ligne || 'commun'); if (adulte) { u.bebe = false; u.adulte = adulte; } if (accs) u.accs = accs; u.tu = u.u; u.tv = u.v; unis.push(u); return u.id; },
      uni: id => { const u = unis.find(v => v.id === id); if (!u) return null; const b = uniBox(u); return { x: ox + b.fx * sc, y: oy + b.fy * sc, h: b.h * sc, pose: uniPose(u), face: u.face }; },
      go(id, tu, tv) { const u = unis.find(v => v.id === id); if (u) { u.tu = tu; u.tv = tv; u.wait = 99; } },
      manche: () => ({ manche, vendues, objectif: objectifDe(manche), temps: Math.round(timeLeft) }), client: () => client && { k: client.k, etat: client.etat, want: client.want, pat: Math.round(client.pat) },
      prepare(id, w) { const u = unis.find(v => v.id === id); if (u) { u.bebe = !w.adulte; u.col = w.col; if (w.acc) u.accs = [w.acc]; u.brille = !!w.brille; } },
      fen: () => ({ x: ox + (L.fen.x + L.fen.w / 2) * sc, y: oy + (L.fen.y + L.fen.h / 2) * sc }), ids: () => unis.map(u => u.id), uniEcran(id) { const u = unis.find(v => v.id === id); if (!u) return null; const b = uniBox(u); return { x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.55) * sc }; },
      state: () => state, coins: () => coins, n: () => unis.length, score, skip(s) { timeLeft = Math.max(0.1, timeLeft - s); }, give(c) { coins += c; }, fast(k) { FAST = k; },
      css: (x, y) => ({ x: ox + x * sc, y: oy + y * sc }),
      items: () => belt.map(it => { const b = itemBox(it); return Object.assign({ k: it.k, t: it.t }, { x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc }); }),
      unis: () => unis.concat(nid.filter(Boolean)).map(u => { const b = uniBox(u); return { bebe: u.bebe, nid: u.nid, x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.55) * sc }; }),
      acts: () => actions().map(a => ({ id: a.id, x: ox + (a.x + a.w / 2) * sc, y: oy + (a.y + a.h / 2) * sc })),
      tray: () => trayBoxes().map(b => ({ x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc })),
      couv: () => couv.map(o => ({ t: o.t, p: +o.p.toFixed(2), col: o.col })), grande: () => grande, viens(k) { if (k === 'gcouv') grandeT = 0; },
      palette: () => palette().map(d => ({ hue: d.hue, x: ox + (d.x + d.w / 2) * sc, y: oy + (d.y + d.h / 2) * sc })),
      bebes: () => unis.filter(u => u.bebe).map(u => u.col),
      zone: k => ({ x: ox + (L[k].x + L[k].w / 2) * sc, y: oy + (L[k].y + L[k].h / 2) * sc })
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.licornes = {
  id: 'licornes',
  title: 'La Maison des Licornes',
  tagline: 'Fais éclore, grandir et briller la plus belle écurie de licornes !',
  accent: '#e48ad0',
  scoreLabel: 'pièces',
  orientation: 'les2',   // vérifié en portrait (mise en page à part) et en paysage
  preview,
  mount,
  pad: { help: [['a', 'Commencer · acheter sur le tapis']], intro: false }
};
})();
