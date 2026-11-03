(() => {
'use strict';
// Noisette et ses amis — jeu né à l'Atelier des jeux (projet 25d20008, auteur SAMBA), V1 (2 nov. 2026).
// Plateforme 2D de côté, à niveaux, rapide : Noisette l'écureuil court, saute de branche en branche, roule en boule dans les pentes
// et ramasse des noisettes dorées. Dangers : ronces, trous (et la rivière), corbeaux chapardeurs : touché, il lâche ses noisettes.
// À la fin de chaque niveau il retrouve un ami (Pompon, Piquant, Hulotte, Roussette) qui le suit ; au grand chêne, tout le monde rentre.
// Bonus : gland magique (vitesse), feuille-ressort (super saut), champignons rebondissants. Score = des points.
// Images : planches de l'Atelier découpées, emballées dans assets/noisette.bin (~/jdv-tools/noisette/emballer.py) ;
// sons : assets/noisette.sons.bin (sons créés pour le jeu) ; musique : assets/music/noisette-1.mp3 (jouée en boucle par la borne).
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const GRAV = 2300, SAUT = 900, SAUT_RESSORT = 1480, SAUT_CHAMPI = 1240;
const VMAX = 430, VMAX_GLAND = 640, VMAX_BOULE = 820, ACC = 1500, FREIN = 2300;
const H_NOI = 70;                       // hauteur de Noisette debout (unités du monde)
const NIVEAUX = [
  { nom: 'La forêt du matin', fond: 'fond1', ami: 'pompon', amiNom: 'Pompon le lapin', sol: ['#7a5233', '#5c3b22'], herbe: ['#7fd35a', '#4fa43a'], eau: false },
  { nom: 'Le sous-bois aux champignons', fond: 'fond2', ami: 'piquant', amiNom: 'Piquant le hérisson', sol: ['#5b4032', '#3d2a20'], herbe: ['#5fb06a', '#3c7f4c'], eau: false },
  { nom: 'La rivière et ses rondins', fond: 'fond3', ami: 'hulotte', amiNom: 'Hulotte la chouette', sol: ['#80603d', '#5d4329'], herbe: ['#86d462', '#55a83f'], eau: true },
  { nom: 'Le grand chêne', fond: 'fond4', ami: 'roussette', amiNom: 'Roussette la renarde', sol: ['#7d5530', '#58391e'], herbe: ['#9bd65a', '#62a63a'], eau: false }
];
// les amis : leurs images (repos, respire, cycle de déplacement), leur façon de bouger, leur taille
const AMIS = {
  pompon: { nom: 'Pompon', h: 58, cycle: ['pompon-s1', 'pompon-s2', 'pompon-s2', 'pompon-s1'], saute: 1, repos: ['pompon-r1', 'pompon-r2', 'pompon-r1', 'pompon-r4', 'pompon-r1', 'pompon-r3'] },   // il bondit : accroupi, étiré ; au repos : respire, bouge les oreilles et le nez
  piquant: { nom: 'Piquant', h: 50, cycle: ['piquant-m1', 'piquant-m2', 'piquant-m3', 'piquant-m4'], boule: 'piquant-boule' },
  hulotte: { nom: 'Hulotte', h: 54, cycle: ['hulotte-w1', 'hulotte-w2', 'hulotte-w3', 'hulotte-w4'], vole: 1 },   // battement complet : ailes en haut, à plat, en bas, à mi-hauteur
  roussette: { nom: 'Roussette', h: 56, cycle: ['roussette-c1', 'roussette-c2', 'roussette-c3', 'roussette-c4'] }
};

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, ancre_x, hauteur_relative] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/noisette.bin');
    if (!r.ok) throw new Error('images ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NOI1') throw new Error('paquet illisible');
    const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
    await Promise.all(idx.map(([nom, o, l, ax, hr]) => new Promise(res => {
      const im = new Image(); im.onload = () => { if (ax != null) { im.ax = ax; im.hr = hr; } IMG[nom] = im; res(); }; im.onerror = () => res();
      im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
    })));
    LOADED = true;
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
// dessine une image posée au sol : (x, y) = le pied ; h = hauteur de la pose de référence ; ancre im.ax, taille relative im.hr
function drawFoot(ctx, nom, x, y, h, flip, rot) {
  const im = IMG[nom];
  if (!im) { ctx.save(); ctx.fillStyle = '#c9762f'; ctx.beginPath(); ctx.ellipse(x, y - h / 2, h * 0.35, h / 2, 0, 0, TAU); ctx.fill(); ctx.restore(); return; }
  const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5;
  ctx.save(); ctx.translate(x, y);
  if (rot) { ctx.translate(0, -hh / 2); ctx.rotate(rot); ctx.translate(0, hh / 2); }
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(reduite(im, hh), -w * ax, -hh, w, hh); ctx.restore();
}
// l'image déjà réduite à la taille où on la dessine (réduire une grande image à chaque image coûte cher sur téléphone)
function reduite(im, hh) {
  const ph = Math.ceil(hh * Math.min(2, window.devicePixelRatio || 1) / 16) * 16;
  if (ph >= im.height * 0.75 || ph < 16) return im;
  const c = im._c || (im._c = {});
  if (!c[ph]) { if (Object.keys(c).length > 6) im._c = {}; const cv = document.createElement('canvas'); cv.height = ph; cv.width = Math.max(1, Math.round(im.width * ph / im.height)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, ph); (im._c[ph] = cv); }
  return im._c[ph];
}
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function star(ctx, x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- les niveaux : une suite de motifs (pente, trou, branches, ronces, corbeau…) ; le même niveau à chaque partie ---------- */
function construire(n) {
  const r = rng(1234 + n * 97), N = NIVEAUX[n];
  const L = { sol: [], plats: [], ronces: [], corbeaux: [], noix: [], bonus: [], champis: [], deco: [], eau: N.eau };
  let x = 0, y = 420;
  const plat = (w) => { L.sol.push({ x0: x, x1: x + w, y0: y, y1: y }); x += w; };
  const pente = (w, dy) => { L.sol.push({ x0: x, x1: x + w, y0: y, y1: y + dy }); x += w; y += dy; };
  const rangee = (x0, y0, k, dx, arc) => { for (let i = 0; i < k; i++) L.noix.push({ x: x0 + i * dx, y: y0 - (arc ? Math.sin(i / (k - 1 || 1) * Math.PI) * arc : 0) }); };
  const deco = (x0, x1) => { for (let k = 0; k < 2; k++) if (r() < 0.7) L.deco.push({ k: ['buisson', 'fougeres', 'fleurs', 'rocher', 'champis-deco'][Math.floor(r() * 5)], x: x0 + r() * (x1 - x0), s: 0.8 + r() * 0.5 }); };
  plat(700); deco(80, 650);
  const LONG = 7200 + n * 900;
  const motifs = n === 2 ? ['trou', 'trou', 'rondins', 'pente', 'branches', 'corbeau', 'ronce', 'champi', 'ressort', 'plat'] :
    n === 1 ? ['champi', 'champi', 'pente', 'branches', 'ronce', 'corbeau', 'trou', 'ressort', 'plat', 'montee'] :
    n === 3 ? ['pente', 'trou', 'branches', 'corbeau', 'corbeau', 'ronce', 'champi', 'ressort', 'montee', 'rondins'] :
    ['pente', 'plat', 'trou', 'branches', 'ronce', 'corbeau', 'gland', 'montee', 'champi', 'ressort'];
  let dernier = '';
  while (x < LONG) {
    let m = motifs[Math.floor(r() * motifs.length)];
    if (m === dernier) m = 'plat';
    dernier = m;
    if (m === 'plat') { const w = 300 + r() * 300; rangee(x + 60, y - 50, 5, 46, 0); deco(x, x + w); plat(w); }
    else if (m === 'pente') {   // une longue descente : idéale pour rouler en boule
      if (y > 520) { pente(380, -110); continue; }
      plat(160); const dy = 120 + r() * 70; rangee(x + 40, y - 60, 6, 70, 0);
      for (let i = 0; i < 6; i++) L.noix[L.noix.length - 6 + i].y += dy * (40 + i * 70) / 520;
      pente(520, dy); plat(220); if (r() < 0.5) L.bonus.push({ k: 'gland', x: x - 120, y: y - 60 });
    }
    else if (m === 'montee') { if (y < 300) { plat(200); continue; } plat(140); pente(420, -(80 + r() * 60)); plat(160); }
    else if (m === 'trou') {     // un trou (ou la rivière) à sauter, des noisettes en arc au-dessus
      plat(180); const w = 150 + r() * 70; rangee(x - 10, y - 70, 5, (w + 20) / 4, 70); x += w; plat(200);
    }
    else if (m === 'rondins') {  // une large rivière (ou un grand trou) avec des rondins qui flottent
      plat(160); const k = 2 + Math.floor(r() * 2);
      // rondins larges et rapprochés : qu'on saute court ou à pleine vitesse depuis le bord, on retombe sur un rondin
      for (let i = 0; i < k; i++) { L.plats.push({ x: x + 90 + i * 240, y: y + 10, w: 200, k: 'rondin', ph: r() * TAU }); rangee(x + 130 + i * 240, y - 40, 3, 50, 0); }
      x += 90 + k * 240 + 30; plat(200);
    }
    else if (m === 'branches') { // des branches en escalier au-dessus du sol, des noisettes dessus
      const w = 760; const x0 = x; plat(w); deco(x0, x0 + w);
      for (let i = 0; i < 3; i++) { const bx = x0 + 80 + i * 220, by = y - 120 - i * 70; L.plats.push({ x: bx, y: by, w: 180, k: 'branche' }); rangee(bx + 30, by - 40, 3, 55, 0); }
      if (r() < 0.6) L.ronces.push({ x: x0 + 330, y, w: 140 });
    }
    else if (m === 'ronce') { plat(150); L.ronces.push({ x: x + 10, y, w: 110 + r() * 40 }); rangee(x - 10, y - 130, 4, 50, 50); plat(260); }
    else if (m === 'corbeau') { const x0 = x; plat(560); L.corbeaux.push({ x0: x0 + 280, y: y - 120 - r() * 40, amp: 160, ph: r() * TAU }); rangee(x0 + 60, y - 50, 8, 60, 0); deco(x0, x0 + 560); }
    else if (m === 'champi') {   // un champignon rebondissant devant une haute marche
      plat(220); L.champis.push({ x: x - 90, y }); const dy = 115 + r() * 30;   // marche sautable même sans le champignon (élément désactivable) rangee(x - 90, y - 260, 3, 0.01, 0);
      L.noix.splice(-3, 3, { x: x - 90, y: y - 200 }, { x: x - 40, y: y - 280 }, { x: x + 20, y: y - 300 });
      y -= dy; plat(320); deco(x - 320, x);
    }
    else if (m === 'ressort') {  // une feuille-ressort qui envoie très haut vers une branche chargée de noisettes
      plat(200); L.bonus.push({ k: 'ressort', x: x - 80, y }); L.plats.push({ x: x - 40, y: y - 300, w: 260, k: 'branche' }); rangee(x - 10, y - 340, 5, 48, 0); plat(320);
    }
    else if (m === 'gland') { plat(160); L.bonus.push({ k: 'gland', x: x - 60, y: y - 50 }); plat(160); }
  }
  plat(260);
  L.panneau = { x: x + 60, y }; L.ami = { k: N.ami, x: x + 230, y };
  plat(700); deco(x - 600, x - 100);
  L.fin = x - 300; L.long = x;
  return L;
}

/* ---------- vignette : une image FIXE (règle des tuiles de l'Atelier) ---------- */
function preview(ctx, w, h) {
  try { loadImages(); } catch (e) { /* rien */ }
  const f = IMG.fond1;
  if (f) { const s = Math.max(w / f.width, h / f.height); ctx.drawImage(f, (w - f.width * s) / 2, (h - f.height * s) / 2, f.width * s, f.height * s); }
  else { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#8fd46a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  const gy = h * 0.86;
  ctx.fillStyle = '#6b4a2d'; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = '#6cc44c'; ctx.fillRect(0, gy - h * 0.025, w, h * 0.05);
  drawFoot(ctx, 'pompon-repos', w * 0.18, gy, h * 0.24); drawFoot(ctx, 'piquant-repos', w * 0.33, gy, h * 0.2);
  drawFoot(ctx, 'n-c1', w * 0.55, gy - h * 0.06, h * 0.36); drawFoot(ctx, 'hulotte-w1', w * 0.78, gy - h * 0.36, h * 0.22); drawFoot(ctx, 'roussette-repos', w * 0.86, gy, h * 0.24);
  for (let i = 0; i < 5; i++) drawFoot(ctx, 'noix', w * (0.36 + i * 0.07), gy - h * (0.3 + Math.sin(i) * 0.03), h * 0.08);
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
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
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.8);background:rgba(120,80,40,0.7);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);

  // ---------- taille : Z = zoom du monde (on voit ~560 unités de haut, au moins ~460 de large) ; U = unité de l'interface ----------
  let W = 1, H = 1, dpr = 1, Z = 1, U = 1, portrait = false, tactile = false;
  try { tactile = matchMedia('(pointer: coarse)').matches; } catch (e) { /* rien */ }
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(tactile ? 1.5 : 2, window.devicePixelRatio || 1);   // téléphone : 1,5 suffit et garde 30 i/s
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1; Z = Math.min(H / 560, W / 460); U = portrait ? Math.min(W / 470, H / 880) : Math.max(0.72, Math.min(W, H) / 720);
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  // ---------- éléments désactivés (noms exacts de at_fiches.assets) : window.JDW_ATL_OFF ou postMessage {type:'atl-off', noms} ----------
  const ELEM = {
    corbeau: 'Les corbeaux chapardeurs', ronce: 'Ronces', gland: 'Gland magique (vitesse)', ressort: 'Feuille-ressort (super saut)', champi: 'Champignon rebondissant',
    deco: 'Décorations de la forêt', fond: 'Décors des niveaux',
    fond1: 'Décors des niveaux — la forêt du matin', fond2: 'Décors des niveaux — le sous-bois aux champignons', fond3: 'Décors des niveaux — la rivière et ses rondins', fond4: 'Décors des niveaux — le grand chêne',
    saut: 'Saut', roulade: 'Roulade', noix_son: 'Ramasser une noisette', ami_son: 'Retrouver un ami', aie: 'Touché par une ronce', bonus_son: 'Bonus'
  };
  let OFF = new Set();
  function lireOff(noms) { OFF = new Set((Array.isArray(noms) ? noms : []).filter(n => typeof n === 'string').map(n => n.trim())); }
  try { lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ }
  // un nom de famille (« Les corbeaux chapardeurs », « Décorations de la forêt », « Décors des niveaux ») coupe aussi chacune de ses entrées « … — pose »
  const off = k => { const n = ELEM[k] || k; for (const o of OFF) if (o === n || o.startsWith(n + ' —')) return true; return false; };

  // ---------- les bruitages (assets/noisette.sons.bin) : joués par la borne (son coupé respecté) ; la musique, par la borne ----------
  const SONS = {}, SVOL = { saut: 0.6, noix: 0.55, roulade: 0.6, aie: 0.8, ami: 0.9, bonus: 0.75 }, SON_ELEM = { noix: 'noix_son', ami: 'ami_son', bonus: 'bonus_son' };
  let gele = false, guideA = '';
  async function chargerSons() {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/noisette.sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  }
  let noixRate = 1, noixT = 0;
  function son(nom, vol, rate) { if (gele || !SONS[nom] || off(SON_ELEM[nom] || nom)) return; try { api.audio.sample.play(SONS[nom], (SVOL[nom] || 1) * (vol == null ? 1 : vol), rate || 1); } catch (e) { /* rien */ } }

  // ---------- état ----------
  let state = 'load', stT = 0, loadErr = false;
  let niv = 0, L = null, P = null, cam = { x: 0, y: 0 }, sac = 0, score = 0, amis = [], trace = [], parts = [], texts = [], msg = null, tNiv = 0, glandT = 0, sauve = { x: 100, y: 420 }, finT = 0, shake = 0, chute = [];
  const keys = {};
  function nouveauNiveau(n) {
    niv = n; L = construire(n); tNiv = 0; finT = 0; chute = [];
    L.corbeaux.forEach(c => { c.vivant = true; c.t = c.ph; });
    P = { x: 120, y: L.sol[0].y0, vx: 0, vy: 0, sol: true, flip: false, boule: false, rot: 0, step: 0, repos: 0, touche: 0, invul: 0, joie: 0, coyote: 0, tampon: 0, plat: null };
    cam.x = P.x - 160; cam.y = P.y - 330; sauve = { x: P.x, y: P.y };
    trace = []; for (let i = 0; i < 200; i++) trace.push({ x: P.x - 4 * i, y: P.y, sol: true, boule: false, flip: false, vx: 0 });
    amis.forEach((a, i) => { a.x = P.x - 60 * (i + 1); a.y = P.y; });
    msg = { s: NIVEAUX[n].nom, t: 0, d: 2.4, grand: 1 };
  }
  function reset() { score = 0; sac = 0; amis = []; parts = []; texts = []; overSent = false; nouveauNiveau(0); }
  function startGame() { try { if (Array.isArray(window.JDW_ATL_OFF)) lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ } reset(); state = 'play'; stT = 0; }
  loadImages().then(() => { if (state === 'load') state = 'title'; chargerSons(); }, () => { loadErr = true; if (state === 'load') state = 'title'; });

  // ---------- le sol ----------
  function solA(x) {   // hauteur du sol en x (null = trou)
    for (const s of L.sol) if (x >= s.x0 && x <= s.x1) return s.y0 + (s.y1 - s.y0) * (x - s.x0) / (s.x1 - s.x0 || 1);
    return null;
  }
  function penteA(x) { for (const s of L.sol) if (x >= s.x0 && x <= s.x1) return Math.atan2(s.y1 - s.y0, s.x1 - s.x0); return 0; }
  const platY = p => p.k === 'rondin' ? p.y + Math.sin(tNiv * 1.6 + p.ph) * 6 : p.y;

  // ---------- entrées : clavier, manette, tactile ----------
  const touches = new Map();   // pointeurs du tactile -> bouton
  function boutons() {
    const s = Math.min(W, H) * (portrait ? 0.2 : 0.15), m = s * 0.25, y = H - s - m;
    return [{ id: 'g', x: m, y, w: s, h: s, t: '◀' }, { id: 'd', x: m * 2 + s, y, w: s, h: s, t: '▶' },
      { id: 'b', x: W - 2 * s - m * 2, y: y + s * 0.15, w: s * 0.85, h: s * 0.85, t: '⟳' }, { id: 's', x: W - s * 1.15 - m, y: y - s * 0.15, w: s * 1.15, h: s * 1.15, t: '⤒' }];
  }
  function btnSous(x, y) { for (const b of boutons()) if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8) return b.id; return null; }
  function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e) {
    e.preventDefault(); if (gele) return;
    if (paused) { setPaused(false); return; }
    const p = toLocal(e);
    if (state === 'title') { if (LOADED || loadErr) { startGame(); suivreDoigt(e, p); } return; }
    if (state === 'end') { if (stT > 1.4) { const b = againBtn(); if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { startGame(); suivreDoigt(e, p); } } return; }
    if (state === 'play') { if (e.pointerType !== 'mouse') tactile = true; const id = btnSous(p.x, p.y); touches.set(e.pointerId, id || 's'); if (!id || id === 's') P.tampon = 0.12; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
  }
  // le doigt qui lance la partie : s'il est (ou glisse) sur ◀ ▶, il compte dès le début, sans relâcher ; ailleurs il ne fait pas sauter
  function suivreDoigt(e, p) { const id = btnSous(p.x, p.y); touches.set(e.pointerId, id === 'g' || id === 'd' ? id : null); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
  function onMove(e) { if (!touches.has(e.pointerId)) return; const p = toLocal(e), id = btnSous(p.x, p.y); if (id && id !== touches.get(e.pointerId) && (id === 'g' || id === 'd')) touches.set(e.pointerId, id); }
  function onUp(e) { touches.delete(e.pointerId); }
  function onKey(e) {
    const k = e.key, down = e.type === 'keydown';
    if (gele) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    const lk = k.toLowerCase();
    if (down && !keys[lk] && (k === ' ' || k === 'ArrowUp' || lk === 'z' || lk === 'w') && P) P.tampon = 0.12;
    keys[lk] = down;
    if (!down) return;
    if ((k === 'p' || k === 'P') && (DANS_CADRE || window.JDW_ATL_JEU === true)) return;
    if (k === 'p' || k === 'Escape') { if (state === 'play') setPaused(!paused); return; }
    if (paused) { setPaused(false); return; }
    if (k === 'Enter' || k === ' ') { if (state === 'title' && (LOADED || loadErr)) startGame(); else if (state === 'end' && stT > 1.4) startGame(); }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function setPaused(v) { paused = v; pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; if (v) { touches.clear(); for (const k in keys) keys[k] = false; } }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (!gele && state === 'play') setPaused(!paused); }
  function onVis() { if (document.hidden && state === 'play') setPaused(true); }
  const DANS_CADRE = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin && /[?&]cadre=/.test(location.search); } catch (e) { return false; } })();
  function onMsg(e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'atl-guide' && typeof e.data.a === 'string') guideA = e.data.a.replace(/[<>]/g, '').slice(0, 40);
    else if (e.data.type === 'atl-off') { lireOff(e.data.noms); if (L && off('corbeau')) L.corbeaux.forEach(c => { c.vivant = false; }); }
    else if (e.data.type === 'atl-pause') { gele = true; touches.clear(); for (const k in keys) keys[k] = false; }
    else if (e.data.type === 'atl-reprendre') { gele = false; last = 0; }
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis);
  // dans un cadre (l'Atelier) : une touche tenue alors que la page autour a le focus compte aussi (sinon il fallait relâcher et réappuyer),
  // sauf quand on écrit dans un champ de la page
  const PARENT = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin ? window.parent : null; } catch (e) { return null; } })();
  const champ = () => { try { const a = PARENT.document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); } catch (e) { return true; } };
  const onKeyP = e => { if (!champ() && state === 'play') onKey(e); }, onKeyUpP = e => onKeyUp(e);
  if (PARENT) { try { PARENT.addEventListener('keydown', onKeyP); PARENT.addEventListener('keyup', onKeyUpP); } catch (e) { /* rien */ } }
  window.addEventListener('message', onMsg); pauseBtn.addEventListener('pointerdown', onPauseBtn);
  function commandes() {
    let x = 0, saut = false, bas = false;
    if (keys.arrowleft || keys.q || keys.a) x -= 1;
    if (keys.arrowright || keys.d) x += 1;
    if (keys.arrowdown || keys.s) bas = true;
    if (keys[' '] || keys.arrowup || keys.z || keys.w) saut = true;
    for (const id of touches.values()) { if (id === 'g') x -= 1; if (id === 'd') x += 1; if (id === 'b') bas = true; if (id === 's') saut = true; }
    if (pad) { try { const g = pad.get(0); if (g && g.on) { if (Math.abs(g.lx) > 0.25) x += g.lx; const h = g.held || {}; if (h.left) x -= 1; if (h.right) x += 1; if (h.down || h.b || g.ly > 0.6) bas = true; if (h.a) { if (!P.padA) P.tampon = 0.12; saut = true; } P.padA = !!h.a; } } catch (e) { /* rien */ } }
    return { x: Math.max(-1, Math.min(1, x)), saut, bas };
  }

  // ---------- la boucle ----------
  function update(dt) {
    stT += dt;
    if (msg) { msg.t += dt; if (msg.t > msg.d) msg = null; }
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.1);
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; } parts = parts.filter(p => p.t < p.d);
    shake = Math.max(0, shake - dt * 30);
    if (state === 'end') { if (stT > 2.5 && !overSent) { overSent = true; try { api.gameOver(score); } catch (e) { /* rien */ } } return; }
    if (state !== 'play') return;
    tNiv += dt; glandT = Math.max(0, glandT - dt);
    if (finT > 0) { finT += dt; finScene(dt); return; }
    const c = commandes(); P.cx = c.x;
    P.touche = Math.max(0, P.touche - dt); P.invul = Math.max(0, P.invul - dt); P.tampon = Math.max(0, P.tampon - dt);
    // rouler en boule : bas quand on court (au sol), on reste en boule tant qu'on va vite
    if (P.sol && c.bas && Math.abs(P.vx) > 90 && !P.boule) { P.boule = true; son('roulade'); }
    if (P.boule && P.sol && Math.abs(P.vx) < 60 && !c.bas) P.boule = false;
    if (P.boule && P.sol && Math.abs(P.vx) < 25) P.boule = false;
    // vitesse
    const vmax = P.boule ? VMAX_BOULE : glandT > 0 ? VMAX_GLAND : VMAX;
    if (P.touche > 0.55) { /* recul */ }
    else if (P.boule) {
      // en boule : on ne pousse pas, la pente fait tout (et un peu de frottement)
      const a = P.sol ? penteA(P.x) : 0; P.vx += Math.sin(a) * GRAV * 0.9 * dt;
      P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), 110 * dt);
    } else if (c.x) {
      if (Math.sign(c.x) !== Math.sign(P.vx) && Math.abs(P.vx) > 30) P.vx += c.x * FREIN * dt; else P.vx += c.x * ACC * (P.sol ? 1 : 0.7) * dt;
      P.flip = c.x < 0;
    } else if (P.sol) P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), 1800 * dt);
    if (P.sol && !P.boule) { const a = penteA(P.x); P.vx += Math.sin(a) * GRAV * 0.25 * dt; }
    P.vx = Math.max(-vmax, Math.min(vmax, P.vx));
    // saut (tampon de 0,12 s et « coyote » de 0,1 s : un appui un peu tôt ou un peu tard marche quand même)
    P.coyote = P.sol ? 0.1 : Math.max(0, P.coyote - dt);
    // contre une marche, même un saut tapoté va jusqu'en haut (au doigt on tapote : sinon on restait coincé)
    if (P.tampon > 0 && P.coyote > 0 && P.touche < 0.5) { P.vy = -SAUT; P.sol = false; P.coyote = 0; P.tampon = 0; P.plat = null; if (P.mur > 0) P.ressort = true; son('saut', 1, 0.95 + Math.random() * 0.1); poussiere(P.x, P.y, 5); }
    if (!c.saut && P.vy < -480 && !P.ressort) P.vy = -480;   // saut court quand on lâche tôt
    // mouvement
    P.vy += GRAV * dt; if (P.vy > 1300) P.vy = 1300;
    const ox = P.x, oy = P.y;
    // 1) le pas de côté : contre une marche plus haute que les pieds (plus de 26), on s'arrête net (on ne rentre JAMAIS dans le sol) ;
    //    si on pousse contre elle un instant, Noisette saute tout seul (aide : une marche ne bloque jamais un enfant)
    let nx = P.x + P.vx * dt;
    const gN = solA(nx);
    if (gN != null && P.y > gN + 26) { nx = P.x; P.vx = 0; }
    const gD = c.x ? solA(P.x + c.x * 8) : null;   // une marche juste devant, dans le sens où l'on pousse
    P.mur = gD != null && P.y > gD + 26 ? (P.mur || 0) + dt : 0;
    P.x = nx;
    if (P.x < 30) { P.x = 30; P.vx = 0; }
    if (P.mur > 0.3 && P.sol) { P.vy = -SAUT; P.sol = false; P.ressort = true; P.mur = 0; P.coyote = 0; son('saut', 1, 0.95); poussiere(P.x, P.y, 4); }
    // 2) la chute : on atterrit sur le sol à l'endroit où l'on est (les pieds ne passent jamais sous le sol)
    P.y += P.vy * dt;
    const g = solA(P.x); let surSol = false;
    // dans une descente, on reste collé au sol (sinon on « décolle » à chaque image)
    if (g != null && P.sol && P.vy >= 0 && P.y < g && g - P.y < 8 + Math.abs(P.vx * dt) * 1.6) P.y = g;
    if (g != null && P.y >= g - 2 && (P.vy >= 0 || P.sol) && oy <= g + 30) { P.y = g; if (!P.sol && P.vy > 500) poussiere(P.x, P.y, 6); P.vy = 0; surSol = true; P.plat = null; }
    if (!surSol && P.vy >= 0) for (const p of L.plats) {
      const py = platY(p);
      if (P.x > p.x - 6 && P.x < p.x + p.w + 6 && oy <= py + 4 && P.y >= py) { P.y = py; P.vy = 0; surSol = true; P.plat = p; break; }
    }
    const etaitSol = P.sol; P.sol = surSol; P.ressort = P.ressort && !surSol;
    if (P.sol && !etaitSol && P.boule && !c.bas && Math.abs(P.vx) < 200) P.boule = false;
    // le point de reprise : seulement sur un sol sûr (du sol devant et derrière, pas près des ronces) : on ne réapparaît jamais au bord d'un trou
    if (P.sol && P.plat == null && g != null && solA(P.x - 90) != null && solA(P.x + 140) != null && !L.ronces.some(r => P.x > r.x - 120 && P.x < r.x + r.w + 120)) sauve = { x: P.x - 40, y: solA(P.x - 40) };
    // animation : la course suit la distance (une foulée complète tous les 120 unités) ; le repos compte le temps à l'arrêt
    if (P.sol && (Math.abs(P.vx) > 20 || c.x)) { P.step += Math.max(Math.abs(P.vx), 120) * dt / 30; P.repos = 0; } else P.repos += dt;
    if (P.boule) P.rot += P.vx * dt / 26;
    // tomber dans un trou ou la rivière
    if (P.y > 760) { chute.push({ x: P.x, t: 0 }); perdre(true); P.x = sauve.x; P.y = sauve.y - 40; P.vx = 0; P.vy = 0; P.boule = false; P.invul = 1.6; shake = 10; }
    // ramasser les noisettes
    for (const n of L.noix) if (!n.pris && Math.abs(n.x - P.x) < 34 && Math.abs(n.y - (P.y - 30)) < 44) {
      n.pris = true; sac++; score += 10;
      noixRate = noixT > 0 ? Math.min(1.5, noixRate + 0.04) : 1; noixT = 0.6; son('noix', 1, noixRate);
      etincelles(n.x, n.y, '#ffd34d', 6);
    }
    noixT = Math.max(0, noixT - dt);
    // les noisettes lâchées (on peut en rattraper quelques-unes)
    for (const n of L.noix) if (n.lache) { n.vy += 1400 * dt; n.x += n.vx * dt; n.y += n.vy * dt; const gy = solA(n.x); if (gy != null && n.y > gy - 10 && n.vy > 0) { n.y = gy - 10; n.vy *= -0.5; n.vx *= 0.8; } n.vie -= dt; if (n.vie <= 0) n.pris = true; }
    // bonus
    for (const b of L.bonus) {
      if (b.pris || off(b.k)) continue;
      if (b.k === 'gland' && Math.abs(b.x - P.x) < 34 && Math.abs(b.y - (P.y - 30)) < 44) { b.pris = true; glandT = 5; son('bonus', 1, 1.2); dire('Gland magique : à toute vitesse !'); etincelles(b.x, b.y, '#8fd8ff', 14); score += 50; }
      if (b.k === 'ressort' && Math.abs(b.x - P.x) < 40 && Math.abs(b.y - P.y) < 16 && P.vy >= 0) { P.vy = -SAUT_RESSORT; P.sol = false; P.ressort = true; b.boing = 0.35; son('saut', 1, 0.7); etincelles(b.x, b.y - 10, '#9fe870', 10); }
    }
    if (!off('champi')) for (const m of L.champis) if (Math.abs(m.x - P.x) < 46 && P.y > m.y - 62 && P.y < m.y - 24 && P.vy >= 0) { P.y = m.y - 60; P.vy = -SAUT_CHAMPI; P.sol = false; P.ressort = true; m.boing = 0.35; son('saut', 1, 0.8); }
    for (const b of L.bonus) if (b.boing) b.boing = Math.max(0, b.boing - dt);
    for (const m of L.champis) if (m.boing) m.boing = Math.max(0, m.boing - dt);
    // dangers
    if (P.invul <= 0 && !off('ronce')) for (const r of L.ronces) if (P.x > r.x + 10 && P.x < r.x + r.w - 10 && P.y > r.y - 34) { blesse(r.x + r.w / 2); break; }
    if (!off('corbeau')) for (const cb of L.corbeaux) {
      if (!cb.vivant) continue;
      cb.t += dt; cb.x = cb.x0 + Math.sin(cb.t * 0.9) * cb.amp; cb.vx = Math.cos(cb.t * 0.9);
      const cy = cb.y + Math.sin(cb.t * 2.3) * 14;
      if (Math.abs(cb.x - P.x) < 40 && Math.abs(cy - (P.y - 34)) < 40) {
        if (P.boule || (P.vy > 150 && P.y - 34 < cy)) { cb.vivant = false; score += 100; P.vy = P.boule ? P.vy : -620; etincelles(cb.x, cy, '#333', 12); plume(cb.x, cy); texte('+100', cb.x, cy - 30, '#fff'); son('bonus', 0.8, 1.5); }
        else if (P.invul <= 0) blesse(cb.x);
      }
    }
    // la trace (les amis suivent les pas de Noisette)
    trace.unshift({ x: P.x, y: P.y, sol: P.sol, boule: P.boule, flip: P.flip, vx: P.vx }); if (trace.length > 220) trace.pop();
    for (let i = 0; i < amis.length; i++) suivre(amis[i], place(i), dt);
    // la caméra : un peu d'avance dans le sens de la course
    const tx = P.x - W / Z * 0.35 + P.vx * 0.25, ty = Math.min(P.y - (H / Z) * 0.62, 760 - H / Z);
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    // fin du niveau : le panneau
    if (P.x > L.panneau.x) { finT = 0.001; P.vx = Math.min(P.vx, 300); P.boule = false; }
  }
  function perdre(tout) {
    if (sac <= 0) return;
    const n = tout ? sac : Math.min(sac, 12);
    for (let i = 0; i < Math.min(n, 12); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; L.noix.push({ x: P.x, y: P.y - 40, vx: Math.cos(a) * 340, vy: Math.sin(a) * 520, lache: true, vie: 2.2 }); }
    sac = 0;
  }
  function blesse(dex) { if (P.invul > 0) return; P.touche = 0.8; P.invul = 1.6; P.boule = false; P.vx = (P.x < dex ? -1 : 1) * 320; P.vy = -480; P.sol = false; shake = 9; son('aie'); perdre(false); }
  // la place d'un ami : les pas de Noisette d'il y a un moment, mais jamais plus près que sa place dans la file (sinon, quand Noisette
  // s'arrête, tout le monde lui rentre dedans) ; la file se range derrière lui, du côté opposé à son regard
  function place(i) {
    const t = trace[Math.min(trace.length - 1, 16 * (i + 1))]; if (!t) return t;
    const ecart = 60 * (i + 1), der = P.flip ? 1 : -1;
    if (Math.abs(t.x - P.x) >= ecart) return t;
    const x = P.x + der * ecart, g = solA(x);
    return Object.assign({}, t, { x, y: g != null && Math.abs(g - P.y) < 80 ? g : t.y, sol: true, boule: false });
  }
  function suivre(a, t, dt) {
    if (!t) return;
    const ox = a.x; a.x += (t.x - a.x) * Math.min(1, dt * 12); a.y += (t.y - a.y) * Math.min(1, dt * 12);
    const d = a.x - ox; a.flip = Math.abs(d) > 0.3 ? d < 0 : a.flip; a.vx = d / Math.max(dt, 1e-3); a.sol = t.sol; a.boule = t.boule;
    if (Math.abs(a.vx) > 25) { a.step = (a.step || 0) + Math.abs(d) / (a.k === 'pompon' ? 40 : 28); a.repos = 0; } else a.repos = (a.repos || 0) + dt;
  }
  // la scène de fin de niveau : Noisette rejoint son ami, tous deux sautent de joie, puis le niveau suivant
  function finScene(dt) {
    const A = L.ami, cible = A.x - 70;
    if (P.x < cible) { P.vx = Math.min(300, P.vx + 900 * dt); P.x += P.vx * dt; P.step += P.vx * dt / 30; P.flip = false; }
    else { P.vx = 0; if (!A.trouve) { A.trouve = true; P.joie = 0.001; score += 500 + sac * 10; texte('+' + (500 + sac * 10), P.x, P.y - 110, '#ffd34d'); son('ami'); dire(NIVEAUX[niv].amiNom + ' te rejoint !', 3.2); etincelles(A.x, A.y - 40, '#fff6a0', 24); try { api.celebrate && api.celebrate(AMIS[A.k].nom + ' est retrouvé !'); } catch (e) { /* rien */ } } }
    const g = solA(P.x); if (g != null) P.y = g;
    if (P.joie > 0) P.joie += dt;
    trace.unshift({ x: P.x, y: P.y, sol: true, boule: false, flip: P.flip, vx: P.vx }); if (trace.length > 220) trace.pop();
    for (let i = 0; i < amis.length; i++) suivre(amis[i], place(i), dt);
    const tx = P.x - W / Z * 0.45; cam.x += (tx - cam.x) * Math.min(1, dt * 3);
    if (P.joie > 3) {
      amis.push({ k: A.k, x: A.x, y: A.y, flip: true, step: 0, repos: 0 });
      sac = 0;
      if (niv + 1 < NIVEAUX.length) nouveauNiveau(niv + 1);
      else { state = 'end'; stT = 0; }
    }
  }
  function dire(s, d) { msg = { s, t: 0, d: d || 2.4 }; }
  function texte(s, x, y, c) { texts.push({ s, x, y, c, t: 0 }); }
  function etincelles(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 180; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, d: 0.5 + Math.random() * 0.4, c, r: 2.5 + Math.random() * 3, etoile: 1 }); } }
  function poussiere(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 30, y: y - 4, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, t: 0, d: 0.45, c: 'rgba(230,215,180,0.8)', r: 4 + Math.random() * 5 }); }
  function plume(x, y) { for (let i = 0; i < 5; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -120 - Math.random() * 100, t: 0, d: 1.1, c: '#2b2b38', r: 3 + Math.random() * 3 }); }

  // ---------- dessin ----------
  const sx = x => (x - cam.x) * Z, sy = y => (y - cam.y) * Z;
  let fondC = null;   // le décor déjà mis à la taille de l'écran (le redimensionner à chaque image coûtait cher sur téléphone)
  function drawFond() {
    const k = NIVEAUX[niv].fond, f = OFF.has(ELEM.fond) || off(k) ? null : IMG[k];   // chaque décor de fond se retire séparément (« Décors des niveaux » seul : tous)
    if (!f) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#d8f2c4'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
    const ch = Math.round(H * dpr);
    if (!fondC || fondC.k !== k || fondC.height !== ch) { fondC = document.createElement('canvas'); fondC.k = k; fondC.height = ch; fondC.width = Math.round(f.width * ch / f.height); fondC.getContext('2d').drawImage(f, 0, 0, fondC.width, ch); }
    const s = H / f.height, w = f.width * s, off0 = ((cam.x * Z * 0.25) % (2 * w) + 2 * w) % (2 * w);
    for (let i = -1, x = -off0; x < W; i++, x += w) {
      if (((i % 2) + 2) % 2) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(fondC, 0, 0, w + 1, H); ctx.restore(); } else ctx.drawImage(fondC, x, 0, w + 1, H);
    }
  }
  function drawSol() {
    const N = NIVEAUX[niv], bas = H + 10;
    // l'eau (rivière) ou le vide (trous) sous le niveau du sol
    if (L.eau) { const wy = sy(520); const g = ctx.createLinearGradient(0, wy, 0, H); g.addColorStop(0, 'rgba(90,180,235,0.92)'); g.addColorStop(1, 'rgba(40,110,190,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2 * Z; ctx.beginPath(); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, wy + Math.sin(x * 0.04 + tNiv * 3) * 3 * Z); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, sy(260), 0, bas); g.addColorStop(0, N.sol[0]); g.addColorStop(1, N.sol[1]);   // un seul dégradé par image
    // le sol est dessiné d'un seul tenant par portion continue (blocs plats, pentes et marches jointifs) : une seule forme de terre et
    // une seule ligne d'herbe, sans raccord entre les blocs ; les cailloux sont placés en coordonnées du monde (le motif ne recommence pas)
    const vis = L.sol.filter(s => sx(s.x1) >= -20 && sx(s.x0) <= W + 20), chaines = [];
    for (const s of vis) { const c = chaines[chaines.length - 1], d = c && c[c.length - 1]; if (d && Math.abs(s.x0 - d.x1) < 1) c.push(s); else chaines.push([s]); }
    // une portion = des morceaux sans marche ; chaque morceau = ses points (coins plat ↔ pente arrondis sur 26 unités, sans cassure)
    const morceaux = (c, herbe) => { const M = []; c.forEach((s, i) => { if (i === 0 || Math.abs(s.y0 - c[i - 1].y1) > 1) M.push([[s.x0, s.y0]]); M[M.length - 1].push([s.x1, s.y1]); });
      // au pied d'une marche, l'herbe du bas s'arrête contre la paroi (son bout rond ne déborde pas dessus)
      if (herbe) for (let i = 0; i < M.length; i++) { const m = M[i], A = M[i - 1], B = M[i + 1];
        if (B && B[0][1] < m[m.length - 1][1]) m[m.length - 1] = [m[m.length - 1][0] - 8, m[m.length - 1][1]];
        if (A && A[A.length - 1][1] < m[0][1]) m[0] = [m[0][0] + 8, m[0][1]]; }
      return M; };
    const tracer = (pts, dy, debut) => {
      const P0 = pts[0]; if (debut) ctx.moveTo(sx(P0[0]), sy(P0[1]) + dy); else ctx.lineTo(sx(P0[0]), sy(P0[1]) + dy);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i], n = pts[i + 1];
        if (!n) { ctx.lineTo(sx(p[0]), sy(p[1]) + dy); break; }
        const a = pts[i - 1], la = Math.hypot(p[0] - a[0], p[1] - a[1]), lb = Math.hypot(n[0] - p[0], n[1] - p[1]), r = Math.min(26, la / 2, lb / 2);
        const A = [p[0] - (p[0] - a[0]) * r / la, p[1] - (p[1] - a[1]) * r / la], B = [p[0] + (n[0] - p[0]) * r / lb, p[1] + (n[1] - p[1]) * r / lb];
        ctx.lineTo(sx(A[0]), sy(A[1]) + dy); ctx.quadraticCurveTo(sx(p[0]), sy(p[1]) + dy, sx(B[0]), sy(B[1]) + dy);
      }
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const c of chaines) {
      const M = morceaux(c);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx(c[0].x0), bas);
      for (const m of M) tracer(m, 0, false);
      ctx.lineTo(sx(c[c.length - 1].x1), bas); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (const s of c) for (let k = Math.ceil(s.x0 / 70) * 70; k < s.x1; k += 70) { const yy = s.y0 + (s.y1 - s.y0) * (k - s.x0) / (s.x1 - s.x0) + 40 + ((k * 37) % 50); ctx.beginPath(); ctx.ellipse(sx(k), sy(yy), 7 * Z, 4 * Z, 0, 0, TAU); ctx.fill(); }
      // l'herbe : une ligne continue, coupée seulement aux marches (là où le sol saute d'un coup)
      for (const [col, lw, dy] of [[N.herbe[1], 16, 4], [N.herbe[0], 10, 1]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw * Z; ctx.beginPath();
        for (const m of morceaux(c, true)) tracer(m, dy * Z, true);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  function drawObjets() {
    if (!off('deco')) for (const d of L.deco) { const g = solA(d.x); if (g == null || sx(d.x) < -100 || sx(d.x) > W + 100) continue; drawFoot(ctx, d.k, sx(d.x), sy(g) + 4 * Z, 46 * d.s * Z); }
    for (const p of L.plats) { if (sx(p.x + p.w) < -40 || sx(p.x) > W + 40) continue; const im = IMG[p.k], py = sy(platY(p));
      if (im) { const w = p.w * Z * 1.12, h = w * im.height / im.width; ctx.drawImage(im, sx(p.x) - p.w * Z * 0.06, py - h * (p.k === 'rondin' ? 0.3 : 0.45), w, h); }
      else { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(sx(p.x), py, p.w * Z, 12 * Z); } }
    if (!off('ronce')) for (const r of L.ronces) { if (sx(r.x + r.w) < -40 || sx(r.x) > W + 40) continue; drawFoot(ctx, 'ronces', sx(r.x + r.w / 2), sy(r.y) + 6 * Z, 54 * Z); }
    if (!off('champi')) for (const m of L.champis) { if (sx(m.x) < -80 || sx(m.x) > W + 80) continue; const sq = m.boing ? 1 - Math.sin(m.boing / 0.35 * Math.PI) * 0.25 : 1; ctx.save(); ctx.translate(sx(m.x), sy(m.y)); ctx.scale(1 / sq, sq); drawFoot(ctx, 'champignon', 0, 2 * Z, 64 * Z); ctx.restore(); }
    for (const b of L.bonus) { if (b.pris || off(b.k)) continue;
      if (b.k === 'ressort') { const sq = b.boing ? 1 - Math.sin(b.boing / 0.35 * Math.PI) * 0.35 : 1; ctx.save(); ctx.translate(sx(b.x), sy(b.y)); ctx.scale(1 / sq, sq); drawFoot(ctx, 'ressort', 0, 4 * Z, 40 * Z); ctx.restore(); }
      else { const bob = Math.sin(tNiv * 3 + b.x) * 5 * Z; ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tNiv * 5); ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.arc(sx(b.x), sy(b.y) - 18 * Z + bob, 24 * Z, 0, TAU); ctx.fill(); ctx.restore(); drawFoot(ctx, 'gland', sx(b.x), sy(b.y) + bob, 38 * Z); } }
    // les noisettes : elles tournent sur elles-mêmes (on les voit de face puis de profil)
    for (const n of L.noix) { if (n.pris || sx(n.x) < -30 || sx(n.x) > W + 30) continue; const k = Math.abs(Math.cos(tNiv * 3 + n.x * 0.02)) * 0.7 + 0.3;
      if (n.lache && n.vie < 0.8 && Math.floor(n.vie * 10) % 2) continue;
      ctx.save(); ctx.translate(sx(n.x), sy(n.y)); ctx.scale(k, 1); drawFoot(ctx, 'noix', 0, 14 * Z, 28 * Z); ctx.restore(); }
    // le panneau et l'ami qui attend
    drawFoot(ctx, 'panneau', sx(L.panneau.x), sy(L.panneau.y) + 4 * Z, 92 * Z);
    const A = L.ami; if (!A.trouve || finT > 0) { const a = AMIS[A.k], fl = true;
      // l'ami qui attend : son cycle de repos dessiné (Pompon), sinon ses deux poses de repos ; puis sa joie
      const nm = A.trouve ? (IMG[A.k + '-joie'] ? A.k + '-joie' : A.k + '-repos') : a.repos ? a.repos[Math.floor(tNiv / 0.38) % a.repos.length] : (Math.sin(tNiv * 2.2) > 0.3 && IMG[A.k + '-respire'] ? A.k + '-respire' : A.k + '-repos');
      const hop = A.trouve ? Math.abs(Math.sin(P.joie * 6)) * 22 * Z : 0;
      drawFoot(ctx, nm, sx(A.x), sy(A.y) - hop, a.h * Z, fl);
      if (!A.trouve) { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(22 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText('?', sx(A.x), sy(A.y) - (a.h + 16) * Z + Math.sin(tNiv * 4) * 4 * Z); } }
  }
  function drawCorbeaux() {
    if (off('corbeau')) return;
    for (const c of L.corbeaux) { if (!c.vivant || c.x == null) continue; const x = sx(c.x), y = sy(c.y + Math.sin(c.t * 2.3) * 14); if (x < -80 || x > W + 80) continue;
      const f = ['corbeau1', 'corbeau2', 'corbeau3', 'corbeau2'][Math.floor(c.t * 9) % 4];
      drawFoot(ctx, f, x, y + 26 * Z, 52 * Z, c.vx > 0); }
  }
  // Noisette : repos qui respire, course de 4 images au rythme des pas, saut / retombée, boule qui roule, touché, joie
  function poseNoisette() {
    if (P.joie > 0) return { n: 'n-joie', hop: Math.abs(Math.sin(P.joie * 6)) * 20 };
    if (P.touche > 0.4) return { n: 'n-touche' };
    if (P.boule) return { n: 'n-boule', rot: P.rot };
    if (!P.sol) return { n: P.vy < 0 ? 'n-saut' : 'n-chute' };
    if (Math.abs(P.vx) > 20 || P.cx) return { n: 'n-c' + (1 + Math.floor(P.step) % 4) };   // pendant un demi-tour (vitesse qui passe par zéro), il reste en course
    return { n: 'n-repos', souffle: 1 };
  }
  function drawNoisette() {
    const ps = poseNoisette(), x = sx(P.x), y = sy(P.y), h = H_NOI * Z;
    ctx.fillStyle = 'rgba(40,30,20,0.25)'; const g = solA(P.x); if (g != null) { const d = Math.max(0, g - P.y); ctx.beginPath(); ctx.ellipse(x, sy(g) + 2 * Z, h * 0.32 / (1 + d / 200), h * 0.07 / (1 + d / 200), 0, 0, TAU); ctx.fill(); }
    if (P.invul > 0 && P.touche <= 0.4 && Math.floor(P.invul * 12) % 2) ctx.globalAlpha = 0.45;
    if (glandT > 0) { ctx.save(); ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(tNiv * 20); ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, h * 0.6, h * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (ps.souffle) souffle(ps.n, x, y, h, P.flip, P.repos);
    else if (ps.rot != null) drawFoot(ctx, ps.n, x, y, h, P.flip, ps.rot);
    else drawFoot(ctx, ps.n, x, y - (ps.hop || 0) * Z, h, P.flip);
    ctx.globalAlpha = 1;
    // traits de vitesse quand il fonce
    if (Math.abs(P.vx) > 470) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * Z; for (let i = 0; i < 3; i++) { const yy = y - h * (0.25 + i * 0.22), dir = P.vx > 0 ? -1 : 1, l = (30 + i * 12) * Z; ctx.beginPath(); ctx.moveTo(x + dir * h * 0.4, yy); ctx.lineTo(x + dir * (h * 0.4 + l), yy); ctx.stroke(); } }
  }
  // la respiration au repos : le haut du dessin s'étire très légèrement (les pieds ne bougent pas), en alternant les deux poses dessinées
  function souffle(nom, x, y, h, flip, t) {
    const n2 = nom.replace('-repos', '-respire'), use = IMG[n2] && Math.sin(t * 2.1) > 0.55 ? n2 : nom;
    const im = IMG[use]; if (!im) { drawFoot(ctx, use, x, y, h, flip); return; }
    const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5, cut = 0.55, sh = im.height * cut;
    const k = 1 + 0.03 * (0.5 - 0.5 * Math.cos(t * 2.1)), yb = y - hh * (1 - cut), top = hh * cut * k;
    ctx.save(); ctx.translate(x, 0); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, 0, sh - 1, im.width, im.height - sh + 1, -w * ax, yb - 1, w, hh * (1 - cut) + 1);
    ctx.drawImage(im, 0, 0, im.width, sh, -w * ax, yb - top, w, top + 0.6);
    ctx.restore();
  }
  function drawAmis() {
    for (let i = amis.length - 1; i >= 0; i--) { const a = amis[i], d = AMIS[a.k], x = sx(a.x), h = d.h * Z; let y = sy(a.y), nm, rot = null;
      if (d.vole) { y -= (34 + Math.sin(tNiv * 3 + i) * 6) * Z; nm = Math.abs(a.vx) > 25 ? d.cycle[Math.floor(tNiv * 10) % 4] : d.cycle[Math.floor(tNiv * 5) % 4]; }
      else if (d.boule && a.boule) { nm = d.boule; rot = (a.x / 20) * (a.flip ? -1 : 1); }
      else if (Math.abs(a.vx) > 25) nm = d.cycle[Math.floor(a.step || 0) % 4];
      else nm = 'souffle';
      ctx.fillStyle = 'rgba(40,30,20,0.22)'; ctx.beginPath(); ctx.ellipse(x, sy(a.y) + 2 * Z, h * 0.3, h * 0.07, 0, 0, TAU); ctx.fill();
      if (nm === 'souffle' && d.repos && IMG[d.repos[0]]) drawFoot(ctx, d.repos[Math.floor(((a.repos || 0) + i * 0.3) / 0.38) % d.repos.length], x, y, h, a.flip);   // un vrai cycle de repos dessiné
      else if (nm === 'souffle') souffle(a.k + '-repos', x, y, h, a.flip, (a.repos || 0) + i);
      else if (rot != null) drawFoot(ctx, nm, x, y, h * 0.8, a.flip, rot);
      else drawFoot(ctx, nm, x, y - (d.saute && Math.abs(a.vx) > 25 ? Math.abs(Math.sin((a.step || 0) * Math.PI / 2)) * 14 * Z : 0), h, a.flip); }
  }
  function drawFx() {
    for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; if (p.etoile) star(ctx, sx(p.x), sy(p.y), p.r * Z, p.t * 6); else { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    for (const t of texts) { ctx.globalAlpha = Math.min(1, 2 * (1.1 - t.t)); ctx.font = 'bold ' + Math.round(22 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(80,40,10,0.8)'; ctx.strokeText(t.s, sx(t.x), sy(t.y) - t.t * 50 * Z); ctx.fillStyle = t.c; ctx.fillText(t.s, sx(t.x), sy(t.y) - t.t * 50 * Z); }
    ctx.globalAlpha = 1;
  }
  function drawHud() {
    const m = 10 * U;
    pill(ctx, m, m, 150 * U, 40 * U, 20 * U); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();
    drawFoot(ctx, 'noix', m + 22 * U, m + 34 * U, 30 * U);
    ctx.font = 'bold ' + Math.round(22 * U) + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('' + sac, m + 44 * U, m + 21 * U);
    // les amis retrouvés (petites têtes)
    let x = m + 160 * U;
    for (const k of ['pompon', 'piquant', 'hulotte', 'roussette']) { const ok = amis.some(a => a.k === k); ctx.globalAlpha = ok ? 1 : 0.28; drawFoot(ctx, k + '-repos', x + 16 * U, m + 40 * U, 34 * U); ctx.globalAlpha = 1; x += 36 * U; }
    ctx.textAlign = 'right'; ctx.font = 'bold ' + Math.round(24 * U) + 'px ' + RF; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(70,40,15,0.7)';
    ctx.strokeText('' + score, W - 62, m + 20 * U); ctx.fillStyle = '#fff'; ctx.fillText('' + score, W - 62, m + 20 * U);
    ctx.font = Math.round(13 * U) + 'px ' + RF; ctx.fillText('Niveau ' + (niv + 1) + ' / 4', W - 62, m + 42 * U);
    if (glandT > 0) { ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(16 * U) + 'px ' + RF; ctx.fillStyle = '#bfefff'; ctx.fillText('⚡ ' + Math.ceil(glandT), W / 2, m + 20 * U); }
    // la progression dans le niveau
    const bw = Math.min(W * 0.4, 260 * U), bx = (W - bw) / 2, by = H - 14 * U;
    if (!tactile) { pill(ctx, bx, by - 4 * U, bw, 8 * U, 4 * U); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); pill(ctx, bx, by - 4 * U, bw * Math.min(1, P.x / L.panneau.x), 8 * U, 4 * U); ctx.fillStyle = '#ffd34d'; ctx.fill(); }
  }
  function drawBoutons() {
    if (!tactile || state !== 'play') return;
    const act = new Set(touches.values());
    for (const b of boutons()) { pill(ctx, b.x, b.y, b.w, b.h, b.w / 2); ctx.fillStyle = act.has(b.id) ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold ' + Math.round(b.h * 0.45) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 2); }
  }
  function drawMsg() {
    if (!msg) return;
    ctx.globalAlpha = Math.max(0, Math.min(1, (msg.d - msg.t) * 3, msg.t * 6));
    if (msg.grand) { big(msg.s, H * 0.3, 0.8); ctx.globalAlpha = 1; return; }
    ctx.font = 'bold ' + Math.round(19 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.min(W - 20, ctx.measureText(msg.s).width + 40 * U), y = H * 0.22;
    pill(ctx, W / 2 - w / 2, y - 22 * U, w, 44 * U, 22 * U); ctx.fillStyle = 'rgba(90,50,15,0.85)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, W / 2, y + 1, W - 40);
    ctx.globalAlpha = 1;
  }
  function big(s, y, k, c) {
    const fs = Math.round(Math.min(W * 0.9 / (0.55 * Math.max(6, s.length)), 70 * U * (k || 1))); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, fs * 0.16); ctx.strokeStyle = 'rgba(90,45,10,0.85)'; ctx.strokeText(s, W / 2, y); ctx.fillStyle = c || '#fff'; ctx.fillText(s, W / 2, y);
  }
  function drawTitle() {
    const f = OFF.has(ELEM.fond) || off('fond1') ? null : IMG.fond1;
    if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) / 2, f.width * s, f.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#8fd46a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const gy = H * (portrait ? 0.62 : 0.8), u = U;
    ctx.fillStyle = '#6b4a2d'; ctx.fillRect(0, gy, W, H - gy); ctx.fillStyle = '#6cc44c'; ctx.fillRect(0, gy - 8 * u, W, 16 * u);
    const order = [['pompon', 0.16], ['piquant', 0.3], ['hulotte', 0.7], ['roussette', 0.84]];
    for (const [k, fx] of order) { const d = AMIS[k], hop = Math.abs(Math.sin(stT * 2 + fx * 9)) * 6 * u; drawFoot(ctx, d.vole ? d.cycle[Math.floor(stT * 8) % 4] : k + '-repos', W * fx, gy - (d.vole ? 70 * u : 0) - (d.vole ? 0 : hop), d.h * 1.9 * u, fx > 0.5); }
    drawFoot(ctx, 'n-c' + (1 + Math.floor(stT * 9) % 4), W * 0.5, gy - Math.abs(Math.sin(stT * 4)) * 4 * u, 150 * u);
    big('Noisette et ses amis', H * 0.13, 1, '#ffe7a0');
    const lines = ['🐿️ Cours, saute de branche en branche', '⬇️ Roule en boule pour foncer dans les pentes', '🌰 Ramasse les noisettes dorées', '🌿 Attention aux ronces, aux trous et aux corbeaux', '🐰 Retrouve tes 4 amis jusqu’au grand chêne'];
    const cw = Math.min(W - 24, 560 * u), lh = 28 * u, chh = lines.length * lh + 22 * u, cx = (W - cw) / 2, cy = portrait ? H * 0.68 : H * 0.22;
    pill(ctx, cx, cy, cw, chh, 18 * u); ctx.fillStyle = 'rgba(80,45,15,0.72)'; ctx.fill();
    ctx.font = 'bold ' + Math.round(17 * u) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, cx + 18 * u, cy + 11 * u + lh * (i + 0.5), cw - 30 * u));
    const bw = 250 * u, bh = 62 * u, by = cy + chh + 14 * u, k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(k, k); pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    const gg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); gg.addColorStop(0, '#ffb14d'); gg.addColorStop(1, '#e0702a'); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF; ctx.textAlign = 'center';
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    // l'aide des commandes, dans un bandeau sombre (lisible sur le ciel clair)
    const aide = tactile ? 'Boutons à l’écran · ⤒ sauter · ⟳ rouler' : 'Flèches · Espace pour sauter · ↓ pour rouler';
    ctx.font = 'bold ' + Math.round(15 * u) + 'px ' + RF; const aw = Math.min(W - 24, ctx.measureText(aide).width + 28 * u), ay = by + bh + 12 * u;
    pill(ctx, (W - aw) / 2, ay, aw, 28 * u, 14 * u); ctx.fillStyle = 'rgba(70,38,12,0.82)'; ctx.fill();
    ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(aide, W / 2, ay + 14 * u + 1, W - 40);
    ctx.font = Math.round(14 * u) + 'px ' + RF; ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Créé avec l’aide de l’IA', W / 2, H - 14 * u);
    if (loadErr) { ctx.fillStyle = '#ffb3b3'; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', W / 2, H - 36 * u, W - 30); }
  }
  function againBtn() { const bw = 250 * U, bh = 60 * U; return { x: (W - bw) / 2, y: H * 0.74, w: bw, h: bh }; }
  function drawEnd() {
    // tous les amis devant le grand chêne
    ctx.fillStyle = 'rgba(40,20,5,' + Math.min(0.55, stT * 0.5) + ')'; ctx.fillRect(0, 0, W, H);
    const gy = H * 0.66, u = U;
    const L5 = [['pompon', 0.2], ['piquant', 0.33], ['n', 0.5], ['hulotte', 0.67], ['roussette', 0.8]];
    for (const [k, fx] of L5) { const hop = Math.abs(Math.sin(stT * 5 + fx * 7)) * 18 * u;
      if (k === 'n') drawFoot(ctx, 'n-joie', W * fx, gy - hop, 120 * u); else drawFoot(ctx, IMG[k + '-joie'] ? k + '-joie' : k + '-repos', W * fx, gy - hop, AMIS[k].h * 1.7 * u, fx > 0.5); }
    big('Tous au grand chêne !', H * 0.18, 0.85, '#ffe7a0');
    big('Score : ' + score, H * 0.3, 0.8);
    if (stT > 1.4) { const b = againBtn(); pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = '#e0702a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.4) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↺ Rejouer', W / 2, b.y + b.h / 2 + 1); }
  }
  function drawPause() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(30,15,5,0.55)'; ctx.fillRect(0, 0, W, H); big('PAUSE', H / 2 - 30 * U); big(gele ? 'Parle ' + (guideA || 'à ton guide') + ', ton jeu t’attend' : 'Touche pour reprendre', H / 2 + 40 * U, 0.4); }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state === 'load' || state === 'title') { drawTitle(); if (paused || gele) drawPause(); return; }
    const kx = shake ? (Math.random() - 0.5) * shake : 0, ky = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(dpr, 0, 0, dpr, dpr * kx, dpr * ky);
    drawFond(); drawSol(); drawObjets(); drawAmis(); drawNoisette(); drawCorbeaux(); drawFx();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHud(); drawMsg(); drawBoutons();
    if (state === 'end') drawEnd();
    if (paused || gele) drawPause();
  }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.033, (now - last) / 1000) : 0; last = now;
    try {
      if (gele) { draw(); return; }
      if (!paused) { const n = FAST > 1 ? FAST : 1; for (let i = 0; i < n; i++) update(dt); } else if (state === 'title' || state === 'load') stT += dt;
      if (state === 'title' && pad && pad.pressed && pad.pressed('a') && (LOADED || loadErr)) startGame();
      if (state === 'end' && stT > 1.4 && pad && pad.pressed && pad.pressed('a')) startGame();
      draw();
    } catch (e) { if (!mount.err) { mount.err = 1; try { console.error('noisette', e); } catch (er) { /* rien */ } } }   // une erreur ne doit pas arrêter le jeu (signalée une fois)
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis);
      if (PARENT) { try { PARENT.removeEventListener('keydown', onKeyP); PARENT.removeEventListener('keyup', onKeyUpP); } catch (e) { /* rien */ } }
      window.removeEventListener('message', onMsg); pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return state === 'play' || state === 'end' ? score : 0; },
    currentLevel() { return state === 'end' ? NIVEAUX.length + 1 : niv + 1; },   // 5 = les 4 amis retrouvés (la carte de la borne : MAP_DEFS.noisette)
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, score: () => score, niv: () => niv, P: () => P, L: () => L, amis: () => amis.map(a => a.k), fast(k) { FAST = k; },
      play() { startGame(); }, aller(n) { nouveauNiveau(n); }, tousLesAmis() { amis = ['pompon', 'piquant', 'hulotte', 'roussette'].map((k, i) => ({ k, x: P.x - 60 * (i + 1), y: P.y, flip: false, step: 0, repos: 0 })); },
      pente() { const s = L.sol.find(s => s.y1 - s.y0 > 100); return s ? s.x0 - 200 : null; }, corbeau() { const c = L.corbeaux[0]; return c ? c.x0 - 300 : null; }, tp(x) { P.x = x; const g = solA(x); P.y = g != null ? g : P.y; P.vy = 0; cam.x = P.x - 200; trace = trace.map((e, i) => ({ x: P.x - 4 * i, y: P.y, sol: true, boule: false, flip: false, vx: 0 })); amis.forEach((a, i) => { a.x = P.x - 64 * (i + 1); a.y = P.y; }); },
      dessin(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) draw(); return (performance.now() - t0) / n; }, boutonsEcran: () => boutons(),
      ecran: () => ({ x: sx(P.x), y: sy(P.y), z: Z }), pose: () => poseNoisette().n
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.noisette = {
  id: 'noisette',
  title: 'Noisette et ses amis',
  tagline: 'Cours, roule et saute à travers la forêt pour retrouver tes amis !',
  accent: '#e88a3a',
  scoreLabel: 'points',
  orientation: 'les2',   // vérifié en portrait (boutons à l'écran) et en paysage
  preview,
  mount,
  heros(x, P) { try { loadImages(); } catch (e) { /* rien */ } if (!IMG['n-repos'] || !x) return false; drawFoot(x, 'n-repos', P / 2, P * 0.9, P * 0.72); return true; },   // Noisette au départ de la carte
  pad: { help: [['ls/dpad', 'Courir'], ['a', 'Sauter'], ['b', 'Rouler en boule']], intro: false }
};
})();
