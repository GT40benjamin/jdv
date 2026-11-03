(() => {
'use strict';
// Seul sur la Lune — jeu né à l'Atelier des jeux (projet cc4d84c0, auteur PATOU), version alpha (2 nov. 2026).
// V7 (3 nov.) : écran titre en paysage : la liste passe sur 2 colonnes pour ne plus cacher l'astronaute. Rien d'autre ne change.
// V8 (correction de l'Atelier, 3 nov.) : écran de départ : le texte « Ton vaisseau a percuté… » passe AU-DESSUS de l'explorateur et la
// consigne en bas ; le voile sombre s'ouvre autour de lui (avant, la dernière ligne cachait sa tête) ; et l'explorateur au repos a de
// nouveau son buste et son casque avant son premier pas (le temps de repos n'était pas encore compté). Rien d'autre ne change.
// 2D vue de dessus : le vaisseau s'est écrasé, tu es le seul survivant ; tu explores librement la Lune (la caméra te suit),
// tu ramasses les 5 pièces du vaisseau, l'oxygène et les cristaux, tu répares la navette de secours et tu décolles.
// Dangers : l'oxygène qui baisse, les pluies de météorites (leur ombre grandit avant l'impact), les cratères.
// Score = ce que tu possèdes (pièces + cristaux, bonus au décollage). Images : dessins et poses animées de l'Atelier,
// découpés, emballés dans assets/lune.bin (~/jdv-tools/lune/emballer.py). Pas de sons pour l'instant.
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const R_MONDE = 1700;          // rayon de la zone explorable autour de la navette (unités du monde = pixels à l'échelle 1)
const NB_PIECES = 5;
const PIECES = ['le moteur', 'l’aile', 'l’antenne', 'le réservoir', 'le panneau solaire'];
const VAL_PIECE = 100, VAL_CRISTAL = 25;
const VITESSE = 200;
const FOULEE = 26;   // unités parcourues par image de marche : la cadence suit la vitesse (les pieds ne glissent pas)
// après le décollage (demande de PATOU, 3 nov.) : une carte des étoiles, un vrai vol en navette, et 3 planètes à explorer
// (même moteur que la Lune : on cherche 3 trésors, on évite le danger de la planète, on revient à la navette et on redécolle)
const NB_TRESORS = 3, VAL_TRESOR = 150, VAL_POUSSIERE = 10, BONUS_PLANETE = 200;
const PLANETES = {
  glace: { nom: 'Glacia', titre: 'Glacia, la planète de glace', tresor: 'fleur-givre', nomT: 'fleur de givre', nomTs: 'fleurs de givre', deco: 'glace-bloc', coul: '#9fd8ff',
    sol: ['#d9e9f5', 'rgba(255,255,255,0.45)', 'rgba(150,185,215,0.35)', 'rgba(250,253,255,0.6)', 'rgba(120,160,200,0.55)'], trou: ['#5f8fbf', '#a9d4f2'], danger: 'glacons',
    alerte: '⚠️ Des glaçons tombent ! Évite les ombres bleues !', dir: [0.42, 0.22], desc: 'Fleurs de givre · glaçons qui tombent' },
  volcan: { nom: 'Pyra', titre: 'Pyra, la planète volcan', tresor: 'pierre-feu', nomT: 'pierre de feu', nomTs: 'pierres de feu', deco: 'roche-feu', coul: '#ff8a4a',
    sol: ['#5a3a34', 'rgba(255,140,80,0.18)', 'rgba(30,18,16,0.4)', 'rgba(255,170,110,0.35)', 'rgba(25,14,12,0.6)'], trou: ['#c8401a', '#ffb347'], danger: 'lave',
    alerte: '⚠️ Le volcan crache de la lave ! Évite les ombres rouges !', dir: [0.76, 0.5], desc: 'Pierres de feu · bombes de lave · mares de lave' },
  jungle: { nom: 'Verdia', titre: 'Verdia, la planète jungle', tresor: 'fruit-etoile', nomT: 'fruit étoile', nomTs: 'fruits étoiles', deco: 'champi-geant', coul: '#6fdc8a',
    sol: ['#4f8a4a', 'rgba(170,240,140,0.22)', 'rgba(20,60,30,0.35)', 'rgba(200,255,170,0.3)', 'rgba(25,70,35,0.55)'], trou: ['#2f6f5f', '#7fd8c0'], danger: 'plantes',
    alerte: '', dir: [0.5, 0.8], desc: 'Fruits étoiles · plantes carnivores' }
};
const CARTE = { lune: [0.16, 0.6], terre: [0.86, 0.2] };   // les autres : PLANETES[id].dir (positions sur la carte, de 0 à 1)

/* ---------- images (paquet LUN1 : en-tête JSON + WebP à la suite) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/lune.bin');
    if (!r.ok) throw new Error('images ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'LUN1') throw new Error('paquet illisible');
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
// position de la boule rouge de l'antenne dans chaque pose du robot (fraction de la largeur), mesurée sur les dessins
const ANTENNE = { robot1: 0.301, robot2: 0.56, 'robot-montre': 0.571, 'robot-content': 0.5 };
const EMOJI = { 'fleur-givre': '❄️', 'pierre-feu': '🔥', 'fruit-etoile': '⭐', 'glace-bloc': '🧊', 'roche-feu': '🪨', 'champi-geant': '🍄', plante: '🌿', 'plante-croque': '🌿', oxygene: '🧯', cristal: '💎', piece: '⚙️', navette: '🚀', epave: '🛸', base: '🏠', trousse: '🧰', lampe: '🔦', meteorite: '☄️', astronaute: '👨‍🚀', robot1: '🤖' };
// les poses (survivant, robot) sont emballées à la même hauteur, avec leur point d'ancrage (im.ax = centre du casque) et leur hauteur relative (im.hr)
// dessine l'image posée au sol : (x, y) = le pied, h = hauteur (de la pose de référence)
function drawFoot(ctx, nom, x, y, h, flip) {
  const im = IMG[nom];
  if (!im) { ctx.save(); ctx.font = Math.round(h * 0.8) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(EMOJI[nom] || (nom.startsWith('robot') ? '🤖' : /^(face|dos|droite|gauche|touche|joie)/.test(nom) ? '👨‍🚀' : '❔'), x, y); ctx.restore(); return; }
  const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5;
  if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w * ax, y - hh, w, hh); ctx.restore(); } else ctx.drawImage(im, x - w * ax, y - hh, w, hh);
}
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// le sol lunaire : une tuile de poussière grise (taches, petits cailloux, micro-cratères), répétée
// les planètes : la même tuile, dans leurs couleurs (fond, taches claires, taches sombres, cailloux clairs, cailloux sombres)
const SOL = {};
function solTile(k) {
  k = k || 'lune'; if (SOL[k]) return SOL[k];
  const C = k === 'lune' ? ['#a9aaae', 'rgba(200,201,206,0.35)', 'rgba(120,121,128,0.3)', 'rgba(235,236,240,0.55)', 'rgba(95,96,104,0.55)'] : PLANETES[k].sol;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = rng(42);
  g.fillStyle = C[0]; g.fillRect(0, 0, N, N);
  const wrap = (f) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) f(dx, dy); };
  for (let i = 0; i < 70; i++) { const x = r() * N, y = r() * N, rr = 20 + r() * 70, l = r() < 0.5; wrap((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr); gr.addColorStop(0, l ? C[1] : C[2]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rr, y + dy - rr, rr * 2, rr * 2); }); }
  for (let i = 0; i < 26; i++) { const x = r() * N, y = r() * N, rr = 4 + r() * 12; wrap((dx, dy) => { g.fillStyle = C[3]; g.beginPath(); g.ellipse(x + dx, y + dy + 1, rr * 1.1, rr * 0.75, 0, 0, TAU); g.fill(); g.fillStyle = C[4]; g.beginPath(); g.ellipse(x + dx, y + dy, rr, rr * 0.65, 0, 0, TAU); g.fill(); }); }
  for (let i = 0; i < 900; i++) { const x = r() * N, y = r() * N, s2 = 0.6 + r() * 2; g.fillStyle = r() < 0.5 ? C[4] : C[3]; g.fillRect(x, y, s2, s2); }
  SOL[k] = c; return c;
}
// les planètes et les nébuleuses de Galaxy Wars (assets/ilo.bin, chiffré, ouvert par la borne) : la Lune, la Terre et les 3 planètes
// les prennent sur la carte et en vol (V5) ; tant qu'elles ne sont pas chargées (ou hors de la borne), le dessin de secours ci-dessous
let ILO = null;
function iloCharger() { try { if (!ILO && window.JDW_ASSETS && window.JDW_ASSETS.load) window.JDW_ASSETS.load('ilo').then(a => { if (a && Array.isArray(a.planets) && a.planets.length >= 32) ILO = a; }, () => {}); } catch (e) { /* rien */ } }
const ILO_PLANETE = { lune: 12, terre: 10, glace: 11, volcan: 30, jungle: 6 };
const ILO_TEINTE = { lune: 220, terre: 205, glace: 195, volcan: 18, jungle: 135, carte: 255 };
const NEB = {};
function nebuleuse(k) {   // la nébuleuse en mosaïque miroir (sans couture), teintée comme dans Galaxy Wars
  if (!ILO || !ILO.nebulas || !ILO.nebulas.length) return null;
  if (NEB[k]) return NEB[k];
  const T = 320, cv = document.createElement('canvas'); cv.width = cv.height = T * 2; const c = cv.getContext('2d'), img = ILO.nebulas[{ glace: 0, volcan: 1, jungle: 2, terre: 3 }[k] || 0];
  c.fillStyle = '#000'; c.fillRect(0, 0, T * 2, T * 2);
  const Q = T + 2;   // chaque quart déborde un peu sur son voisin : pas de trait à la jointure
  try { c.drawImage(img, 0, 0, Q, Q); c.save(); c.translate(2 * T, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, Q, Q); c.restore(); c.save(); c.translate(0, 2 * T); c.scale(1, -1); c.drawImage(img, 0, 0, Q, Q); c.restore(); c.save(); c.translate(2 * T, 2 * T); c.scale(-1, -1); c.drawImage(img, 0, 0, Q, Q); c.restore(); } catch (e) { return null; }
  c.globalCompositeOperation = 'color'; c.fillStyle = 'hsl(' + (ILO_TEINTE[k] || 255) + ',58%,50%)'; c.fillRect(0, 0, T * 2, T * 2);
  return (NEB[k] = cv);
}
// une planète vue de l'espace (carte et vol) : celle de Galaxy Wars, avec son halo ; sinon dessinée, avec son atmosphère et ses reliefs
function planeteDisque(ctx, k, x, y, R, t) {
  const im = ILO && ILO.planets[ILO_PLANETE[k]];
  if (im) {
    const at = ctx.createRadialGradient(x, y, R * 0.92, x, y, R * 1.3); at.addColorStop(0, k === 'volcan' ? 'rgba(255,120,60,0.4)' : k === 'lune' ? 'rgba(220,225,240,0.18)' : k === 'jungle' ? 'rgba(170,255,140,0.32)' : 'rgba(160,220,255,0.38)'); at.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = at; ctx.beginPath(); ctx.arc(x, y, R * 1.3, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.03); ctx.drawImage(im, -R * 1.04, -R * 1.04, R * 2.08, R * 2.08); ctx.restore();   // elle tourne très lentement sur elle-même
    return;
  }
  const P0 = { lune: ['#d6d7dc', '#8d8f97', '#5c5e66'], terre: ['#7fd0ff', '#2f7fd8', '#1b4a9a'], glace: ['#f4fbff', '#a9d8f5', '#5f9fd0'], volcan: ['#ffb36b', '#d0502a', '#5a1d14'], jungle: ['#b9f59a', '#4fb35a', '#1f6a3a'] }[k];
  const at = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.25); at.addColorStop(0, k === 'volcan' ? 'rgba(255,120,60,0.35)' : k === 'lune' ? 'rgba(220,225,240,0.15)' : 'rgba(160,220,255,0.35)'); at.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = at; ctx.beginPath(); ctx.arc(x, y, R * 1.25, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R); g.addColorStop(0, P0[0]); g.addColorStop(0.55, P0[1]); g.addColorStop(1, P0[2]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
  const rr = rng(k.length * 31 + 7);
  if (k === 'lune' || k === 'volcan') for (let i = 0; i < 9; i++) { const a = rr() * TAU, d = rr() * R * 0.8, cr = R * (0.06 + rr() * 0.12); ctx.fillStyle = k === 'volcan' ? 'rgba(40,10,6,0.45)' : 'rgba(70,72,80,0.35)'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, TAU); ctx.fill(); if (k === 'volcan') { ctx.fillStyle = 'rgba(255,170,60,' + (0.4 + 0.3 * Math.sin(t * 3 + i)) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr * 0.4, 0, TAU); ctx.fill(); } }
  else for (let i = 0; i < 5; i++) { const yy = y - R + (i + 0.5) * R * 0.4 + Math.sin(t * 0.4 + i) * R * 0.03; ctx.strokeStyle = k === 'glace' ? 'rgba(255,255,255,0.55)' : k === 'terre' ? 'rgba(90,190,90,0.7)' : 'rgba(20,90,50,0.45)'; ctx.lineWidth = R * 0.09; ctx.beginPath(); ctx.moveTo(x - R, yy); ctx.bezierCurveTo(x - R * 0.3, yy - R * 0.15, x + R * 0.3, yy + R * 0.15, x + R, yy); ctx.stroke(); }
  const sh = ctx.createLinearGradient(x - R, y - R, x + R, y + R); sh.addColorStop(0.45, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,0.55)'); ctx.fillStyle = sh; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
}
// le ciel étoilé (carte et vol) : trois plans d'étoiles qui défilent plus ou moins vite
let CIEL = null;
function cielTile() {
  if (CIEL) return CIEL;
  CIEL = [0, 1, 2].map(n => { const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = rng(9 + n * 17);
    for (let i = 0; i < [140, 60, 22][n]; i++) { const x = r() * N, y = r() * N, s2 = [0.8, 1.4, 2.2][n] * (0.6 + r() * 0.8); g.fillStyle = ['rgba(200,210,255,0.7)', 'rgba(230,235,255,0.85)', '#ffffff'][n]; g.beginPath(); g.arc(x, y, s2, 0, TAU); g.fill(); }
    if (n === 0) for (let i = 0; i < 5; i++) { const x = r() * N, y = r() * N, rr = 60 + r() * 120, col = ['rgba(120,90,200,0.18)', 'rgba(60,120,200,0.16)', 'rgba(200,90,160,0.14)'][i % 3]; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rr, y + dy - rr, rr * 2, rr * 2); } }   // les nuages bouclent d'une tuile à l'autre (pas de trait)
    return c; });
  return CIEL;
}

/* ---------- vignette ---------- */
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, w, h);
  const f = IMG.fond;
  if (f) { const s = Math.max(w / f.width, h / f.height); ctx.drawImage(f, (w - f.width * s) / 2, (h - f.height * s) / 2, f.width * s, f.height * s); }
  else { ctx.fillStyle = '#8e9199'; ctx.fillRect(0, h * 0.62, w, h); }
  drawFoot(ctx, 'navette', w * 0.75, h * 0.86, h * 0.34);
  drawFoot(ctx, 'face' + (1 + Math.floor(t * 6) % 4), w * 0.42, h * 0.96, h * 0.5);
  drawFoot(ctx, Math.floor(t * 4) % 2 ? 'robot1' : 'robot2', w * 0.58, h * 0.95, h * 0.24);
  if (!f) { ctx.fillStyle = '#dfe8ff'; ctx.font = 'bold ' + Math.round(h * 0.12) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Seul sur la Lune', w / 2, h * 0.18); }
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  iloCharger();
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
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.7);background:rgba(40,52,80,0.75);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);

  // ---------- taille : on dessine en pixels CSS ; Z = le zoom du monde, U = l'unité de l'interface ----------
  let W = 1, H = 1, dpr = 1, U = 1, Z = 1, portrait = false;
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1; U = portrait ? Math.min(W / 470, H / 880) : Math.max(0.72, Math.min(W, H) / 720);
    Z = portrait ? Math.min(W / 520, H / 900) : Math.min(W, H) / 820;   // on voit environ 820 unités sur le petit côté (520 de large en portrait)
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  // ---------- état ----------
  let state = 'load', stT = 0, loadErr = false;
  // ---------- les éléments que le joueur a désactivés dans l'Atelier (noms exacts de at_fiches.assets) ----------
  // window.JDW_ATL_OFF (au lancement) ou postMessage {type:'atl-off', noms} ; le survivant, la navette et les pièces sont obligatoires.
  // Chaque élément coupé disparaît proprement (plus d'apparition, plus de son) et le jeu reste gagnable.
  const ELEM = {
    oxygene: "Bouteille d'oxygène", cristal: 'Cristal lunaire bleu', trousse: 'Trousse de secours', lampe: 'Lampe torche',
    meteorite: 'Météorite qui tombe', epave: "L'épave du vaisseau fumante", base: "La vieille base lunaire (plein d'oxygène)", fond: 'Paysage lunaire (écran titre)',
    impact1: 'Impact de météorite 1 (éclair)', impact2: 'Impact de météorite 2 (boule de feu)', impact3: 'Impact de météorite 3 (nuage de poussière)', impact4: 'Impact de météorite 4 (poussière qui retombe)',
    ramasser: 'Ramasser un objet', piece_son: 'Pièce posée sur la navette', alerte: 'Alerte météorites', impact_son: 'Impact de météorite', oxygene_son: 'Oxygène presque vide', decollage: 'Décollage de la navette'
  };
  let OFF = new Set();
  function lireOff(noms) { OFF = new Set((Array.isArray(noms) ? noms : []).filter(n => typeof n === 'string').map(n => n.trim())); }
  try { lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ }
  // le robot : coupé si le joueur coupe « Le robot de bord » (ou une de ses poses)
  const off = k => k === 'robot' ? [...OFF].some(n => n.startsWith('Le robot de bord')) : OFF.has(ELEM[k] || k);
  const SON_ELEM = { piece: 'piece_son', impact: 'impact_son', oxygene: 'oxygene_son' };
  let P, objs, craters, meteors, impacts, puffs, flyers, prises, robot, oxy, pieces, cristaux, posees, lampe, trousses, shake, flash, msg, texts, parts, showerT, showerOn, showerLeft, tJeu, endWhy, baseUsed, crT, bonusFin, liftT, camX, camY, repT;
  // l'espace : le monde où l'on est (lune ou une planète), les planètes déjà visitées, les trésors, la carte, le vol, l'atterrissage
  let monde = 'lune', visites = [], tresors = 0, totTresors = 0, poussiere = 0, bonusPl = 0, dest = null, ship = null, asts = [], dusts = [], carteSel = 0, landT = 0, depart = 'lune';
  const keys = {};
  const joy = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };

  function newWorld() {
    if (monde !== 'lune') { newPlanete(monde); return; }
    const r = rng((Date.now() / 1000) | 0);
    const libre = (x, y, m) => !objs.some(o => Math.hypot(o.x - x, o.y - y) < m) && !craters.some(c => Math.hypot(c.x - x, c.y - y) < c.r + m * 0.6);
    const at = (dmin, dmax, m) => { let x = 0, y = 0; for (let k = 0; k < 50; k++) { const a = r() * TAU, d = dmin + r() * (dmax - dmin); x = Math.cos(a) * d; y = Math.sin(a) * d; if (libre(x, y, m || 110)) break; } return { x, y }; };
    objs = []; craters = [];
    objs.push({ k: 'navette', x: 0, y: 0, h: 210, solide: 85 });
    if (!off('epave')) objs.push({ k: 'epave', x: -330, y: 60, h: 230, solide: 95, fume: 1 });
    for (let i = 0; i < 46; i++) { const p = at(330, R_MONDE, 60); craters.push({ x: p.x, y: p.y, r: 45 + r() * 80 }); }
    if (!off('base')) { const b = at(900, 1300, 200); objs.push({ k: 'base', x: b.x, y: b.y, h: 250, solide: 100 }); }
    const a0 = r() * TAU;
    for (let i = 0; i < NB_PIECES; i++) { const a = a0 + i * TAU / NB_PIECES + (r() - 0.5) * 0.5, d = 480 + i * 230 + r() * 140; let x = Math.cos(a) * d, y = Math.sin(a) * d; craters = craters.filter(c => Math.hypot(c.x - x, c.y - y) > c.r + 50); objs.push({ k: 'piece', x, y, h: 70, n: i }); }
    for (let i = 0; i < (off('cristal') ? 0 : 32); i++) { const p = at(160, R_MONDE - 60, 90); objs.push({ k: 'cristal', x: p.x, y: p.y, h: 58 }); }
    for (let i = 0; i < (off('oxygene') ? 0 : 10); i++) { const p = at(260, R_MONDE - 60, 110); objs.push({ k: 'oxygene', x: p.x, y: p.y, h: 70 }); }
    for (let i = 0; i < (off('trousse') ? 0 : 2); i++) { const p = at(500, R_MONDE - 100, 120); objs.push({ k: 'trousse', x: p.x, y: p.y, h: 52 }); }
    if (!off('lampe')) { const p = at(300, 650, 120); objs.push({ k: 'lampe', x: p.x, y: p.y, h: 44 }); }
  }
  // une planète : la navette posée au milieu, son décor, 3 trésors, l'oxygène, et son danger (mares, chutes, plantes carnivores)
  function newPlanete(k) {
    const PL = PLANETES[k], r = rng(((Date.now() / 1000) | 0) + k.length * 101);
    const libre = (x, y, m) => !objs.some(o => Math.hypot(o.x - x, o.y - y) < m) && !craters.some(c => Math.hypot(c.x - x, c.y - y) < c.r + m * 0.6);
    const at = (dmin, dmax, m) => { let x = 0, y = 0; for (let n = 0; n < 50; n++) { const a = r() * TAU, d = dmin + r() * (dmax - dmin); x = Math.cos(a) * d; y = Math.sin(a) * d; if (libre(x, y, m || 110)) break; } return { x, y }; };
    objs = []; craters = [];
    objs.push({ k: 'navette', x: 0, y: 0, h: 210, solide: 85 });
    for (let i = 0; i < 30; i++) { const p = at(380, R_MONDE, 70); craters.push({ x: p.x, y: p.y, r: 45 + r() * 70 }); }
    const a0 = r() * TAU;
    for (let i = 0; i < NB_TRESORS; i++) { const a = a0 + i * TAU / NB_TRESORS + (r() - 0.5) * 0.6, d = 520 + i * 330 + r() * 120; const x = Math.cos(a) * d, y = Math.sin(a) * d; craters = craters.filter(c => Math.hypot(c.x - x, c.y - y) > c.r + 60); objs.push({ k: 'tresor', img: PL.tresor, x, y, h: 74 }); }
    const DECO_NOM = { 'glace-bloc': 'Bloc de glace (décor de Glacia)', 'roche-feu': 'Rocher de feu (décor de Pyra)', 'champi-geant': 'Champignon géant (décor de Verdia)' };   // noms de at_fiches.assets : le joueur peut les retirer
    for (let i = 0; i < (OFF.has(DECO_NOM[PL.deco]) ? 0 : 16); i++) { const p = at(300, R_MONDE - 40, 150); objs.push({ k: 'deco', img: PL.deco, x: p.x, y: p.y, h: 150 + r() * 70, solide: 55, ph: r() * 6 }); }
    for (let i = 0; i < (off('oxygene') ? 0 : 8); i++) { const p = at(260, R_MONDE - 60, 110); objs.push({ k: 'oxygene', x: p.x, y: p.y, h: 70 }); }
    for (let i = 0; i < (off('trousse') ? 0 : 2); i++) { const p = at(500, R_MONDE - 100, 120); objs.push({ k: 'trousse', x: p.x, y: p.y, h: 52 }); }
    if (PL.danger === 'plantes') for (let i = 0; i < 10; i++) { const p = at(330, R_MONDE - 80, 160); objs.push({ k: 'plante', x: p.x, y: p.y, h: 125, solide: 38, snap: 0, cool: 0, ph: r() * 6 }); }
  }
  // l'arrivée sur une planète : nouveau monde, plein d'oxygène, la navette se pose (le survivant et le robot sortent ensuite)
  function arriverSur(k) {
    monde = k; tresors = 0; newWorld();
    P = { x: 0, y: -10, dir: 'face', v: 0, vx: 0, vy: 0, step: 0, flip: false, stun: 0, moving: false, repos: 0 };
    robot = { x: 0, y: -10, joie: 0 };
    oxy = 100; meteors = []; impacts = []; puffs = []; flyers = []; prises = []; texts = []; parts = []; msg = null; crT = null; baseUsed = true;
    showerT = 26; showerOn = false; showerLeft = 0; camX = 0; camY = -90 - 900;
    state = 'atterro'; landT = 0; stT = 0;
  }
  function reset() {
    monde = 'lune'; visites = []; tresors = 0; totTresors = 0; poussiere = 0; bonusPl = 0; dest = null; ship = null; asts = []; dusts = []; depart = 'lune';
    objs = []; craters = []; newWorld();
    P = { x: -200, y: 170, dir: 'face', v: 0, vx: 0, vy: 0, step: 0, flip: false, stun: 0, moving: false, repos: 0 };
    robot = { x: -110, y: 190, joie: 0 };
    camX = P.x; camY = P.y - 40;
    oxy = 100; pieces = 0; cristaux = 0; posees = 0; lampe = false; trousses = 0; shake = 0; flash = 0; msg = null; texts = []; parts = []; meteors = []; impacts = []; puffs = []; flyers = []; prises = [];
    showerT = 24; showerOn = false; showerLeft = 0; tJeu = 0; endWhy = ''; baseUsed = false; crT = null; bonusFin = 0; liftT = 0; repT = 0;
  }
  reset();
  const liftW = () => { const e = Math.max(0, Math.min(state === 'liftoff' ? liftT : 5, 5) - 1.4); return e * e * 170; };   // hauteur de la navette au décollage
  const score = () => posees * VAL_PIECE + pieces * VAL_PIECE + cristaux * VAL_CRISTAL + bonusFin + totTresors * VAL_TRESOR + poussiere * VAL_POUSSIERE + bonusPl;
  function say(s, d) { msg = { s, t: 0, d: d || 2.6 }; }
  // textes / étincelles : posés dans le MONDE (ils suivent le sol)
  function pop(s, c, x, y) { texts.push({ s, c: c || '#fff', x, y, t: 0 }); }
  function burst(x, y, c, n, sp, up) { for (let i = 0; i < (n || 12); i++) { const a = Math.random() * TAU, v = (sp || 160) * (0.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - (up || 60), t: 0, d: 0.7 + Math.random() * 0.5, c, r: 2 + Math.random() * 3, g: 1 }); } }
  function bulles(x, y) { for (let i = 0; i < 14; i++) parts.push({ x: x + (Math.random() - 0.5) * 50, y: y - Math.random() * 30, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 60, t: 0, d: 1 + Math.random() * 0.6, c: 'rgba(190,255,215,0.9)', r: 3 + Math.random() * 5, bulle: 1 }); }

  function startGame() { try { if (Array.isArray(window.JDW_ATL_OFF)) lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ } reset(); state = 'intro'; stT = 0; }
  // la liste des éléments coupés change en cours de partie (arrêt sur image) : ce qui est coupé disparaît tout de suite, proprement
  function purger() {
    if (!objs) return;
    objs = objs.filter(o => !off(o.k)); prises = prises.filter(q => !off(q.k));
    if (off('meteorite')) { meteors = []; showerOn = false; }
    try { window.__lune_off = [...OFF]; } catch (e) { /* rien */ }
  }
  loadImages().then(() => { if (state === 'load') state = 'title'; chargerSons(); }, () => { loadErr = true; if (state === 'load') state = 'title'; });

  // ---------- les bruitages (assets/lune.sons.bin, sons créés pour le jeu) : joués par la borne (api.audio.sample : « son coupé » respecté) ----------
  // la musique, elle, est jouée en boucle par la borne (assets/music/lune-1.mp3)
  const SONS = {};
  const VOL = { ramasser: 1.2, piece: 0.9, alerte: 0.55, impact: 1.1, oxygene: 0.6, decollage: 0.55 };
  async function chargerSons() {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/lune.sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* un son illisible : le jeu reste muet pour lui */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  }
  // joue un bruitage (vol : multiplié par le réglage du son, rate : hauteur, pour varier sans fichier en double)
  function son(nom, vol, rate) { if (gele || !SONS[nom] || off(SON_ELEM[nom] || nom)) return; try { api.audio.sample.play(SONS[nom], (VOL[nom] || 1) * (vol == null ? 1 : vol), rate || 1); } catch (e) { /* rien */ } }

  // monde → écran
  const sx = x => W / 2 + (x - camX) * Z, sy = y => H / 2 + (y - camY) * Z;

  // ---------- entrées ----------
  function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e) {
    e.preventDefault();
    if (gele) return;
    if (paused) { setPaused(false); return; }
    const p = toLocal(e);
    if (state === 'title') { if (LOADED || loadErr) startGame(); return; }
    if (state === 'end') { if (stT > (endWhy === 'oxy' ? 2.5 : 1.2)) { const b = againBtn(); if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) startGame(); } return; }
    if (state === 'intro') { if (stT > 0.6) { state = 'play'; stT = 0; } return; }
    if (state === 'carte') { carteTap(p); return; }
    if ((state === 'play' || state === 'vol') && !joy.on) { joy.on = true; joy.id = e.pointerId; joy.x0 = joy.x = p.x; joy.y0 = joy.y = p.y; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
  }
  function onMove(e) { if (joy.on && e.pointerId === joy.id) { const p = toLocal(e); joy.x = p.x; joy.y = p.y; const R = 80 * U, dx = joy.x - joy.x0, dy = joy.y - joy.y0, l = Math.hypot(dx, dy); if (l > R) { joy.x0 += dx * (1 - R / l); joy.y0 += dy * (1 - R / l); } } }
  function onUp(e) { if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.id = -1; } }
  function onKey(e) {
    const k = e.key, down = e.type === 'keydown';
    if (gele) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    keys[k.toLowerCase()] = down;
    if (!down) return;
    // lancé depuis l'Atelier (dans le cadre, ou en plein écran : window.JDW_ATL_JEU), P appartient à l'Atelier (arrêt sur image + atl-pause) :
    // le jeu n'ajoute pas sa propre pause
    if ((k === 'p' || k === 'P') && (DANS_CADRE || window.JDW_ATL_JEU === true)) return;
    if (k === 'p' || k === 'Escape') { if (state === 'play' || state === 'vol' || state === 'carte') setPaused(!paused); return; }
    if (paused) { setPaused(false); return; }
    if (state === 'carte') { if (k === 'ArrowLeft' || k === 'ArrowUp') carteBouger(-1); else if (k === 'ArrowRight' || k === 'ArrowDown') carteBouger(1); else if (k === 'Enter' || k === ' ') partir(carteChoix()[carteSel]); return; }
    if (k === 'Enter' || k === ' ') {
      if (state === 'title' && (LOADED || loadErr)) startGame();
      else if (state === 'intro' && stT > 0.6) { state = 'play'; stT = 0; }
      else if (state === 'end' && stT > (endWhy === 'oxy' ? 2.5 : 1.2)) startGame();
    }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function setPaused(v) { paused = v; pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; if (v) { joy.on = false; for (const k in keys) keys[k] = false; } }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (!gele && (state === 'play' || state === 'vol' || state === 'carte')) setPaused(!paused); }
  function onVis() { if (document.hidden && (state === 'play' || state === 'vol')) setPaused(true); }
  // pause de l'Atelier (bouton ⏸ au-dessus du cadre : le joueur parle à son guide) : tout est gelé jusqu'à « atl-reprendre »
  let gele = false, guideA = '';
  const DANS_CADRE = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin && /[?&]cadre=/.test(location.search); } catch (e) { return false; } })();
  function onMsg(e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    // le nom du guide vient de la page du projet (jamais écrit ici) : « Parle à … »
    if (e.data.type === 'atl-guide' && typeof e.data.a === 'string') guideA = e.data.a.replace(/[<>]/g, '').slice(0, 40);
    else if (e.data.type === 'atl-off') { lireOff(e.data.noms); purger(); }
    else if (e.data.type === 'atl-pause') { gele = true; joy.on = false; for (const k in keys) keys[k] = false; }
    else if (e.data.type === 'atl-reprendre') { gele = false; last = 0; }
  }
  window.addEventListener('message', onMsg);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis);
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  // ---------- la carte des étoiles : on choisit sa destination (les planètes pas encore visitées, ou la Terre pour rentrer) ----------
  function versCarte() {
    if (monde !== 'lune' && !visites.includes(monde)) { visites.push(monde); bonusPl += BONUS_PLANETE; }
    depart = monde; state = 'carte'; stT = 0; msg = null; texts = [];
    const ch = carteChoix(); carteSel = Math.max(0, ch.findIndex(k => k !== 'terre')); if (carteSel < 0) carteSel = 0;
    if (visites.length >= 3) carteSel = ch.indexOf('terre');
  }
  const carteChoix = () => ['glace', 'volcan', 'jungle'].filter(k => !visites.includes(k) && k !== monde).concat(['terre']);
  function carteZone() { const top = (portrait ? 100 : 70) * U, bas = (portrait ? 220 : 150) * U; return { x: 20 * U, y: top, w: W - 40 * U, h: H - top - bas }; }
  function carteXY(k) { const z = carteZone(), d = CARTE[k] || PLANETES[k].dir; return { x: z.x + d[0] * z.w, y: z.y + d[1] * z.h }; }
  const carteR = k => Math.min(W, H) * (k === 'terre' ? 0.075 : k === 'lune' ? 0.055 : 0.07);
  function carteBouton() { const bw = Math.min(W - 40 * U, 300 * U), bh = 56 * U; return { x: (W - bw) / 2, y: H - bh - (portrait ? 30 : 16) * U, w: bw, h: bh }; }
  function carteTap(p) {
    const ch = carteChoix(), b = carteBouton();
    if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { partir(ch[carteSel]); return; }
    for (let i = 0; i < ch.length; i++) { const c = carteXY(ch[i]); if (Math.hypot(p.x - c.x, p.y - c.y) < carteR(ch[i]) * 1.4 + 14) { if (i === carteSel && stT > 0.4) partir(ch[i]); else { carteSel = i; son('ramasser', 0.5, 1.3); } return; } }
  }
  function carteBouger(d) { const ch = carteChoix(); carteSel = (carteSel + d + ch.length) % ch.length; son('ramasser', 0.4, 1.4); }
  // ---------- le vol : la navette se pilote (elle tourne en douceur vers la direction poussée et accélère) ----------
  const D_VOL = 5200, R_ASTRE = 320;
  function partir(k) {
    if (stT < 0.4) return;
    dest = k; const a = carteXY(depart), b = carteXY(k), dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    ship = { x: ux * (R_ASTRE + 140), y: uy * (R_ASTRE + 140), vx: ux * 90, vy: uy * 90, a: Math.atan2(ux, -uy), pousse: 0, hit: 0, ux, uy, dx: ux * D_VOL, dy: uy * D_VOL };
    camX = ship.x; camY = ship.y;
    const r = rng((Date.now() / 1000) | 0);
    asts = []; dusts = [];
    for (let i = 0; i < 38; i++) { const t = 0.2 + r() * 0.66, off2 = (r() - 0.5) * 1700; asts.push({ x: ux * D_VOL * t - uy * off2, y: uy * D_VOL * t + ux * off2, r: 34 + r() * 60, a: r() * TAU, va: (r() - 0.5) * 0.8, vx: (r() - 0.5) * 30, vy: (r() - 0.5) * 30, f: r() }); }
    for (let i = 0; i < 34; i++) { const t = 0.08 + r() * 0.84, off2 = (r() - 0.5) * 900; dusts.push({ x: ux * D_VOL * t - uy * off2, y: uy * D_VOL * t + ux * off2, ph: r() * 6 }); }
    state = 'vol'; stT = 0; son('decollage', 0.6, 1.1);
    say(k === 'terre' ? 'Cap sur la Terre ! Évite les astéroïdes.' : 'Cap sur ' + PLANETES[k].nom + ' ! Évite les astéroïdes, ramasse la poussière d’étoiles.', 3.2);
  }
  function updVol(dt) {
    const s2 = ship, inp = input(), l = Math.hypot(inp.x, inp.y);
    if (l > 0.15) {
      const ta = Math.atan2(inp.x, -inp.y); let da = ((ta - s2.a + Math.PI) % TAU + TAU) % TAU - Math.PI;
      s2.a += Math.max(-1, Math.min(1, da)) * Math.min(Math.abs(da), dt * 5.5);   // il tourne en douceur, sans dépasser
      s2.pousse += (Math.min(1, l) * Math.max(0, Math.cos(da)) - s2.pousse) * Math.min(1, dt * 6);
    } else s2.pousse += (0 - s2.pousse) * Math.min(1, dt * 5);
    const ACC = 560, VMAX = 470;
    s2.vx += Math.sin(s2.a) * ACC * s2.pousse * dt; s2.vy -= Math.cos(s2.a) * ACC * s2.pousse * dt;
    const fr = Math.pow(0.55, dt); s2.vx *= fr; s2.vy *= fr;   // un frein doux : la navette ne part jamais toute seule
    const v = Math.hypot(s2.vx, s2.vy); if (v > VMAX) { s2.vx *= VMAX / v; s2.vy *= VMAX / v; }
    s2.x += s2.vx * dt; s2.y += s2.vy * dt; s2.hit = Math.max(0, s2.hit - dt);
    if (s2.pousse > 0.2 && Math.random() < dt * 30) parts.push({ x: s2.x - Math.sin(s2.a) * 80, y: s2.y + Math.cos(s2.a) * 80, vx: -Math.sin(s2.a) * 90 + (Math.random() - 0.5) * 40, vy: Math.cos(s2.a) * 90 + (Math.random() - 0.5) * 40, t: 0, d: 0.5, c: 'rgba(255,190,110,0.8)', r: 3 + Math.random() * 3 });
    // on ne s'éloigne pas trop du chemin : un courant doux ramène vers la route
    const px = s2.x * s2.ux + s2.y * s2.uy, ex = s2.x - s2.ux * px, ey = s2.y - s2.uy * px, eo = Math.hypot(ex, ey);
    if (eo > 1300) { s2.vx -= ex / eo * 260 * dt; s2.vy -= ey / eo * 260 * dt; if (!msg) say('Ton robot te remet sur la bonne route.'); }
    for (const a of asts) {
      a.a += a.va * dt; a.x += a.vx * dt; a.y += a.vy * dt;
      const dx = s2.x - a.x, dy = s2.y - a.y, d = Math.hypot(dx, dy), m = a.r + 38;
      if (d < m) {
        const nx = dx / (d || 1), ny = dy / (d || 1); s2.x = a.x + nx * m; s2.y = a.y + ny * m;
        const vn = s2.vx * nx + s2.vy * ny; if (vn < 0) { s2.vx -= 1.7 * vn * nx; s2.vy -= 1.7 * vn * ny; }
        if (s2.hit <= 0) { s2.hit = 1; shake = 12; poussiere = Math.max(0, poussiere - 2); pop('Boum !', '#ff9c9c', s2.x, s2.y - 60); son('impact', 0.7, 1.2); burst(a.x + nx * a.r, a.y + ny * a.r, '#a9a39a', 14, 160, 0); if (!msg) say('Aïe, un astéroïde ! Tourne pour l’éviter.'); }
      }
    }
    for (const d of dusts) if (!d.pris && Math.hypot(d.x - s2.x, d.y - s2.y) < 70) { d.pris = true; poussiere++; pop('+' + VAL_POUSSIERE, '#fff3a0', d.x, d.y - 30); burst(d.x, d.y, '#fff3a0', 8, 120, 0); son('ramasser', 0.5, 1.3); }
    camX += (s2.x + s2.vx * 0.4 - camX) * Math.min(1, dt * 3); camY += (s2.y + s2.vy * 0.4 - camY) * Math.min(1, dt * 3);
    if (Math.hypot(s2.dx - s2.x, s2.dy - s2.y) < R_ASTRE + 80) {
      if (dest === 'terre') { state = 'end'; stT = 0; endWhy = 'terre'; try { api.celebrate && api.celebrate('Bienvenue sur Terre !'); } catch (e) { /* rien */ } }
      else arriverSur(dest);
    }
  }
  // ---------- l'atterrissage : la navette descend en douceur, flamme allumée ; le survivant et le robot sortent ----------
  const ALT = () => { const e = Math.max(0, 2.2 - landT); return e * e * 190; };
  function updAtterro(dt) {
    landT += dt;
    camX += (0 - camX) * Math.min(1, dt * 4); camY += (-90 - ALT() * 0.6 - camY) * Math.min(1, dt * 4);
    if (landT > 2.2 && landT - dt <= 2.2) { shake = 6; for (let i = 0; i < 10; i++) puffs.push({ x: (Math.random() - 0.5) * 160, y: (Math.random() - 0.5) * 30, t: -i * 0.04 }); }
    if (landT > 2.3) { const k = Math.min(1, (landT - 2.3) / 0.7); P.x = -150 * k; P.y = -10 + 180 * k; robot.x = -60 * k; robot.y = -10 + 200 * k; P.moving = k < 1; P.step += dt * 6; P.dir = 'face'; }
    if (landT > 3.1) { state = 'play'; stT = 0; P.moving = false; const PL = PLANETES[monde]; say('Bienvenue sur ' + PL.nom + ' ! Trouve les ' + NB_TRESORS + ' ' + PL.nomTs + '.', 3.5); }
  }
  // ---------- dessin : la carte ----------
  function drawCiel(px, py, teinte) {
    ctx.fillStyle = '#04050d'; ctx.fillRect(0, 0, W, H);
    const nb = nebuleuse(teinte || 'carte');
    if (nb) { const ts = 640 * Math.max(1, Math.min(W, H) / 640), ox = ((-px * 0.06) % ts + ts) % ts - ts, oy = ((-py * 0.06) % ts + ts) % ts - ts; for (let x = ox; x < W; x += ts) for (let y = oy; y < H; y += ts) ctx.drawImage(nb, Math.floor(x), Math.floor(y), Math.ceil(ts) + 2, Math.ceil(ts) + 2); ctx.fillStyle = 'rgba(4,5,13,0.45)'; ctx.fillRect(0, 0, W, H); }   // tuiles opaques puis un seul voile : les recouvrements ne se voient pas
    const C = cielTile();
    C.forEach((t, i) => { const k = [0.15, 0.35, 0.7][i], ts = 512, ox = ((-px * k) % ts + ts) % ts - ts, oy = ((-py * k) % ts + ts) % ts - ts; for (let x = ox; x < W; x += ts) for (let y = oy; y < H; y += ts) ctx.drawImage(t, x, y); });
  }
  function drawCarte() {
    drawCiel(stT * 6, stT * 2);
    const ch = carteChoix(), all = ['lune', 'glace', 'volcan', 'jungle', 'terre'];
    // les routes : en pointillés, depuis l'endroit où l'on est
    const a = carteXY(depart);
    for (let i = 0; i < ch.length; i++) { const b = carteXY(ch[i]); ctx.strokeStyle = i === carteSel ? 'rgba(255,211,107,0.9)' : 'rgba(180,200,255,0.3)'; ctx.lineWidth = (i === carteSel ? 3 : 2) * U; ctx.setLineDash([8 * U, 8 * U]); ctx.lineDashOffset = -stT * 30 * U; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const k of all) {
      const c = carteXY(k), R = carteR(k), choisi = ch[carteSel] === k, fait = visites.includes(k), ici = k === depart;
      if (choisi) { ctx.strokeStyle = 'rgba(255,211,107,' + (0.6 + 0.4 * Math.sin(stT * 5)) + ')'; ctx.lineWidth = 4 * U; ctx.beginPath(); ctx.arc(c.x, c.y, R * (1.35 + 0.05 * Math.sin(stT * 5)), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = fait && !ici ? 0.55 : 1; planeteDisque(ctx, k, c.x, c.y, R, stT); ctx.globalAlpha = 1;
      const nom = k === 'lune' ? 'La Lune' : k === 'terre' ? 'La Terre' : PLANETES[k].nom;
      label(nom + (fait ? ' ✓' : ''), c.x, c.y + R + 24 * U, choisi ? '#ffd36b' : '#e8eeff');
      if (ici) { ctx.save(); ctx.translate(c.x + R * 0.9, c.y - R * 0.9 + Math.sin(stT * 3) * 4 * U); ctx.rotate(0.6); drawFoot(ctx, navImg(), 0, 22 * U, 44 * U); ctx.restore(); }
    }
    big('Carte des étoiles', (portrait ? 72 : 36) * U, 0.6, '#e8eeff');
    // le panneau du bas : la destination choisie, et « Partir »
    const k = ch[carteSel], b = carteBouton(), t = k === 'terre' ? 'Rentrer sur la Terre' : PLANETES[k].titre, d = k === 'terre' ? (visites.length ? visites.length + ' planète' + (visites.length > 1 ? 's' : '') + ' visitée' + (visites.length > 1 ? 's' : '') + ' : la partie se termine' : 'Rentrer tout de suite : la partie se termine') : PLANETES[k].desc;
    ctx.font = 'bold ' + Math.round(20 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd36b'; ctx.fillText(t, W / 2, b.y - 46 * U, W - 30);
    ctx.font = Math.round(15 * U) + 'px ' + RF; ctx.fillStyle = '#cfd8ff'; ctx.fillText(d, W / 2, b.y - 20 * U, W - 30);
    const kk = 1 + Math.sin(stT * 4) * 0.03; ctx.save(); ctx.translate(W / 2, b.y + b.h / 2); ctx.scale(kk, kk);
    pill(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2); const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2); g.addColorStop(0, '#ffd36b'); g.addColorStop(1, '#f08a2a'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#3a1d00'; ctx.font = 'bold ' + Math.round(b.h * 0.42) + 'px ' + RF; ctx.fillText('🚀 Partir', 0, 2); ctx.restore();
    ctx.font = Math.round(13 * U) + 'px ' + RF; ctx.fillStyle = 'rgba(220,228,255,0.7)'; ctx.textAlign = 'left'; ctx.fillText('Score ' + score(), 14 * U, H - 14 * U);
  }
  // ---------- dessin : le vol ----------
  function drawAst(a, x, y, R) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a.a);
    const rr = rng(Math.round(a.f * 1e6)), n = 9; ctx.beginPath();
    for (let i = 0; i < n; i++) { const an = i / n * TAU, k = 0.78 + rr() * 0.3; ctx.lineTo(Math.cos(an) * R * k, Math.sin(an) * R * k); }
    ctx.closePath(); const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R); g.addColorStop(0, '#a9a49b'); g.addColorStop(1, '#4f4b46'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(30,28,26,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 3; i++) { const an = rr() * TAU, d = rr() * R * 0.45; ctx.fillStyle = 'rgba(40,38,35,0.45)'; ctx.beginPath(); ctx.arc(Math.cos(an) * d, Math.sin(an) * d, R * (0.12 + rr() * 0.1), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawVol() {
    drawCiel(camX * Z, camY * Z, dest);
    const s2 = ship, sxv = x => W / 2 + (x - camX) * Z, syv = y => H / 2 + (y - camY) * Z;
    planeteDisque(ctx, depart, sxv(0), syv(0), R_ASTRE * Z, stT);
    planeteDisque(ctx, dest, sxv(s2.dx), syv(s2.dy), R_ASTRE * Z, stT);
    for (const d of dusts) { if (d.pris) continue; const x = sxv(d.x), y = syv(d.y); if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue; const k = 0.7 + 0.3 * Math.sin(stT * 5 + d.ph); ctx.fillStyle = 'rgba(255,240,150,0.25)'; ctx.beginPath(); ctx.arc(x, y, 18 * Z * k, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff3a0'; star(ctx, x, y, 11 * Z * k, stT * 2 + d.ph); }
    for (const a of asts) { const x = sxv(a.x), y = syv(a.y), R = a.r * Z; if (x < -R || x > W + R || y < -R || y > H + R) continue; drawAst(a, x, y, R); }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(sxv(p.x), syv(p.y), p.r * Z, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // la navette : la flamme suit la poussée ; au repos, elle flotte doucement
    const x = sxv(s2.x), y = syv(s2.y), h = (navImg() === 'navette-neuve' ? 110 : 150) * Z, flot = s2.pousse < 0.1 ? Math.sin(stT * 2.2) * 3 * Z : 0;
    // le dessin de la navette a le nez à gauche et le réacteur à droite : on la tourne d'un quart de tour, la flamme sort du réacteur
    // vers la droite, on la retourne en miroir (sinon elle volerait la tête en bas) ; une petite marge évite qu'elle se retourne sans cesse
    const sa = Math.sin(s2.a); if (sa > 0.25) s2.est = true; else if (sa < -0.25) s2.est = false;
    const bal = s2.pousse < 0.1 ? Math.sin(stT * 1.6) * 0.04 : 0;
    ctx.save(); ctx.translate(x, y + flot); ctx.rotate(s2.est ? s2.a - Math.PI / 2 + bal : s2.a + Math.PI / 2 + bal); if (s2.est) ctx.scale(-1, 1);
    if (s2.hit > 0 && Math.floor(s2.hit * 10) % 2) ctx.globalAlpha = 0.5;
    const im = IMG[navImg()], wN = im ? h * im.width / im.height : h;
    const neuve = navImg() === 'navette-neuve'; ctx.save(); ctx.translate(wN * (neuve ? 0.47 : 0.44), h * (neuve ? 0.06 : -0.06)); ctx.rotate(-Math.PI / 2);   // le réacteur (à droite du dessin)
    const fl = h * (0.1 + s2.pousse * 0.5 + 0.04 * Math.sin(stT * 31)), fw = h * 0.09;
    for (const [k, c0, c1] of [[1, 'rgba(255,140,40,0.85)', 'rgba(255,80,20,0)'], [0.6, 'rgba(255,230,120,0.95)', 'rgba(255,170,60,0)'], [0.3, 'rgba(255,255,240,1)', 'rgba(255,240,180,0)']]) {
      const g = ctx.createLinearGradient(0, 0, 0, fl * k); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-fw * k, 0); ctx.quadraticCurveTo(-fw * k * 0.8, fl * k * 0.5, Math.sin(stT * 23) * fw * 0.2, fl * k); ctx.quadraticCurveTo(fw * k * 0.8, fl * k * 0.5, fw * k, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    drawFoot(ctx, navImg(), 0, h * 0.5, h); ctx.restore(); ctx.globalAlpha = 1;
    drawFx2(sxv, syv);
    // la direction de la destination (flèche au bord) et la distance
    const tx = sxv(s2.dx), ty = syv(s2.dy), dist = Math.max(0, Math.round((Math.hypot(s2.dx - s2.x, s2.dy - s2.y) - R_ASTRE) / 2));
    if (tx < 40 || tx > W - 40 || ty < 100 * U || ty > H - 40) {
      const a = Math.atan2(ty - H / 2, tx - W / 2), rr = Math.min(W / 2 - 34 * U, H / 2 - 70 * U), ex = W / 2 + Math.cos(a) * rr, ey = H / 2 + Math.sin(a) * rr;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#ffd36b'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(24 * U, 0); ctx.lineTo(-10 * U, -15 * U); ctx.lineTo(-4 * U, 0); ctx.lineTo(-10 * U, 15 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    const nomD = dest === 'terre' ? 'la Terre' : PLANETES[dest].nom;
    ctx.font = 'bold ' + Math.round(18 * U) + 'px ' + RF; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    pill(ctx, 10 * U, 10 * U, Math.min(W * 0.62, 320 * U), 34 * U, 17 * U); ctx.fillStyle = 'rgba(10,14,26,0.7)'; ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.fillText('🚀 Vers ' + nomD + ' · ' + dist.toLocaleString('fr-FR') + ' km', 22 * U, 28 * U, Math.min(W * 0.62, 320 * U) - 20 * U);
    pill(ctx, 10 * U, 50 * U, 120 * U, 30 * U, 15 * U); ctx.fillStyle = 'rgba(10,14,26,0.6)'; ctx.fill(); ctx.fillStyle = '#fff3a0'; ctx.fillText('✨ ' + poussiere, 22 * U, 66 * U);
    ctx.textAlign = 'right'; ctx.font = 'bold ' + Math.round(24 * U) + 'px ' + RF; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText('' + score(), W - 62, 32 * U); ctx.fillStyle = '#fff'; ctx.fillText('' + score(), W - 62, 32 * U);
  }
  function drawFx2(fx, fy) {
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, 2 * (1.3 - t.t)); ctx.font = 'bold ' + Math.round(24 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const x = fx(t.x), y = fy(t.y) - t.t * 60 * U; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t.s, x, y); ctx.fillStyle = t.c; ctx.fillText(t.s, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- la boucle de jeu ----------
  function input() {
    let x = 0, y = 0;
    if (keys.arrowleft || keys.q || keys.a) x -= 1;
    if (keys.arrowright || keys.d) x += 1;
    if (keys.arrowup || keys.z || keys.w) y -= 1;
    if (keys.arrowdown || keys.s) y += 1;
    if (joy.on) { const R = 80 * U, dx = (joy.x - joy.x0) / R, dy = (joy.y - joy.y0) / R; if (Math.hypot(dx, dy) > 0.15) { x += dx; y += dy; } }
    if (pad) { try { const g = pad.get(0); if (g && g.on) { if (Math.hypot(g.lx, g.ly) > 0.2) { x += g.lx; y += g.ly; } const h = g.held || {}; if (h.left) x -= 1; if (h.right) x += 1; if (h.up) y -= 1; if (h.down) y += 1; } } catch (e) { /* rien */ } }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function update(dt) {
    stT += dt;
    if (msg) { msg.t += dt; if (msg.t > msg.d) msg = null; }
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.3);
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 240 * dt; } parts = parts.filter(p => p.t < p.d);
    for (const p of puffs) p.t += dt; puffs = puffs.filter(p => p.t < 0.6);
    for (const f of flyers) f.t += dt * 1.6; flyers = flyers.filter(f => { if (f.t >= 1) { burst(0, -80, '#ffd36b', 10, 120); son('piece'); return false; } return true; });
    for (const im of impacts) im.t += dt; impacts = impacts.filter(im => im.t < 1.1);
    for (const q of prises) q.t += dt / 0.35; prises = prises.filter(q => q.t < 1);
    shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt * 2); robot.joie = Math.max(0, robot.joie - dt); repT = Math.max(0, repT - dt);
    if (state === 'carte') { if (pad && pad.pressed) { if (pad.pressed('left') || pad.pressed('up')) carteBouger(-1); if (pad.pressed('right') || pad.pressed('down')) carteBouger(1); } return; }
    if (state === 'vol') { updVol(dt); return; }
    if (state === 'atterro') { updAtterro(dt); return; }
    if (state === 'end' && endWhy === 'terre') { if (stT > 3.4 && !overSent) { overSent = true; try { api.gameOver(score()); } catch (e) { /* rien */ } } return; }
    // la caméra suit en douceur (un peu en avance dans le sens de la marche)
    let tx = P.x + P.vx * 0.35, ty = P.y - 40 + P.vy * 0.35;
    if (state === 'liftoff' || (state === 'end' && endWhy === 'win')) { tx = 0; ty = -90 - liftW(); }   // la caméra accompagne la navette qui monte (elle reste au milieu)
    // pendant la montée à bord (1 s) la caméra rejoint doucement la navette, puis elle la suit exactement (aucun à-coup : l'écart est déjà nul)
    const kc = state === 'liftoff' ? (liftT > 1.4 ? 1 : Math.min(1, dt * 7)) : state === 'end' && endWhy === 'win' ? 1 : Math.min(1, dt * 3);
    camX += (tx - camX) * kc; camY += (ty - camY) * kc;
    if (state === 'liftoff') {
      if (liftT < 1.1 && liftT + dt >= 1.1) son('decollage');   // l'allumage du réacteur
      liftT += dt;
      // le survivant et le robot montent à bord (ils marchent jusqu'à la porte et y entrent)
      if (liftT > 0.6 && liftT < 1.4) { for (const o of [P, robot]) { o.x += (0 - o.x) * Math.min(1, dt * 4); o.y += (-20 - o.y) * Math.min(1, dt * 4); } P.step += dt * 6; P.moving = true; P.dir = 'dos'; }
      if (liftT > 5) versCarte();   // la navette est dans l'espace : on choisit où aller
      return;
    }
    if (state === 'end') {
      // défaite : le robot accourt près de toi (il roule) pendant que l'écran s'assombrit
      if (endWhy === 'oxy') { const ox = robot.x, oy = robot.y; robot.x += (P.x + 60 - robot.x) * Math.min(1, dt * 2); robot.y += (P.y - 10 - robot.y) * Math.min(1, dt * 2); const d = Math.hypot(robot.x - ox, robot.y - oy); robot.roule = d > 15 * dt; robot.step = (robot.step || 0) + d / 20; }
      if (stT > 3.4 && !overSent) { overSent = true; try { api.gameOver(score()); } catch (e) { /* rien */ } }
      return;
    }
    if (state !== 'play') return;
    tJeu += dt;
    // déplacement (8 directions)
    const inp = input();
    P.stun = Math.max(0, P.stun - dt);
    const inCr = craters.find(c => Math.hypot((c.x - P.x) / c.r, (c.y - P.y) / (c.r * 0.62)) < 0.8);
    let vMax = VITESSE; if (inCr) vMax = 95; if (P.stun > 0) vMax = 0;
    P.vx += (inp.x * vMax - P.vx) * Math.min(1, dt * 8); P.vy += (inp.y * vMax - P.vy) * Math.min(1, dt * 8);
    const sp = Math.hypot(P.vx, P.vy);
    P.moving = sp > 25;
    if (Math.hypot(inp.x, inp.y) > 0.3) {
      // la pose ne change que si la nouvelle direction l'emporte nettement (pas de clignotement en diagonale)
      const ax = Math.abs(inp.x), ay = Math.abs(inp.y), k = P.dir === 'cote' ? 0.75 : 1.35;
      if (ax > ay * k) { if (P.dir !== 'cote' || P.flip !== inp.x > 0) P.step = 0; P.dir = 'cote'; P.flip = inp.x > 0; }
      else { const d = inp.y < 0 ? 'dos' : 'face'; if (d !== P.dir) P.step = 0; P.dir = d; }
    }
    let nx = P.x + P.vx * dt, ny = P.y + P.vy * dt;
    for (const o of objs) if (o.solide) { const dx = nx - o.x, dy = (ny - o.y) / 0.6, d = Math.hypot(dx, dy); if (d < o.solide) { const k = o.solide / Math.max(1, d); nx = o.x + dx * k; ny = o.y + dy * k * 0.6; } }
    P.x = nx; P.y = ny;
    const dC = Math.hypot(P.x, P.y);
    if (dC > R_MONDE) { P.x *= R_MONDE / dC; P.y *= R_MONDE / dC; if (!msg) say('Trop loin ! Ton robot te conseille de revenir.'); }
    // la cadence suit la distance parcourue ; un nuage de poussière à chaque pied posé (images 1 et 3)
    if (P.moving) { const before = Math.floor(P.step); P.step += dt * sp / FOULEE; const now = Math.floor(P.step); if (now !== before && now % 2 === 0) puffs.push({ x: P.x + (now % 4 ? 8 : -8), y: P.y, t: 0 }); }
    else P.step = 0;
    P.repos = P.moving ? 0 : (P.repos || 0) + dt;
    // le cratère : on glisse dedans, ça coûte de l'oxygène (une fois par cratère)
    if (inCr && inCr !== crT) { crT = inCr; const lave = monde === 'volcan'; oxy -= lave ? 10 : 5; shake = lave ? 9 : 5; say(monde === 'glace' ? 'Tu glisses dans une crevasse de glace ! −5 % d’oxygène' : lave ? 'Aïe, une mare de lave ! −10 % d’oxygène' : monde === 'jungle' ? 'Splash ! Une mare de boue ! −5 % d’oxygène' : 'Tu glisses dans un cratère ! −5 % d’oxygène'); if (lave) burst(P.x, P.y - 10, '#ffb347', 14, 140); for (let i = 0; i < 4; i++) puffs.push({ x: P.x + (Math.random() - 0.5) * 40, y: P.y, t: -i * 0.1 }); }
    if (!inCr) crT = null;
    // l'oxygène baisse (un peu plus vite en marchant)
    oxy -= dt * (0.85 + sp / VITESSE * 0.55) * (off('oxygene') ? (off('base') ? 0.45 : 0.55) : 1);   // sans bouteilles : il baisse moins vite (toujours gagnable)
    if (oxy < 20 && Math.floor(tJeu * 2) !== Math.floor((tJeu - dt) * 2)) { flash = Math.max(flash, 0.35); if (Math.floor(tJeu * 2) % 2 === 0) son('oxygene'); }   // un bip par seconde
    // le robot suit (à côté, un peu derrière)
    // le robot reste un peu derrière toi et du côté d'où tu viens : il ne te cache jamais
    // de profil, il se met du côté d'où tu viens ; sinon il garde son côté ; un peu plus haut que toi : s'il change de côté, il passe DERRIÈRE toi
    if (P.dir === 'cote') robot.cote = P.flip ? -1 : 1;
    const rx = P.x + (robot.cote || 1) * (P.dir === 'cote' ? 125 : 105), ry = P.y - 30;
    const rox = robot.x, roy = robot.y;
    // il se range d'abord sur le côté (vite), puis monte ou descend (doucement) : il ne roule jamais sur tes pieds
    robot.x += (rx - robot.x) * Math.min(1, dt * 4.5); robot.y += (ry - robot.y) * Math.min(1, dt * (Math.abs(robot.x - P.x) > 70 ? 2.4 : 0.6));
    const rd = Math.hypot(robot.x - rox, robot.y - roy); robot.roule = rd > 15 * dt; robot.step = (robot.step || 0) + rd / 20;
    // ramasser
    for (const o of objs) {
      if (o.pris || !/^(piece|cristal|oxygene|trousse|lampe|tresor)$/.test(o.k)) continue;
      if (Math.hypot(o.x - P.x, (o.y - P.y) / 0.7) > 60) continue;
      o.pris = true; robot.joie = 1.2; prises.push({ k: o.k, x: o.x, y: o.y, h: o.h, t: 0 });
      son('ramasser', 1, { cristal: 1.15, piece: 0.8, oxygene: 0.95, trousse: 1, lampe: 1.05, tresor: 0.85 }[o.k] * (0.97 + Math.random() * 0.06));
      if (o.k === 'tresor') { const PL = PLANETES[monde]; tresors++; totTresors++; pop('+' + VAL_TRESOR + ' · ' + PL.nomT, PL.coul, o.x, o.y - 50); burst(o.x, o.y - 30, PL.coul, 22); say(tresors >= NB_TRESORS ? 'Tu as les ' + NB_TRESORS + ' ' + PL.nomTs + ' ! Retourne à la navette.' : 'Une ' + PL.nomT + ' ! Encore ' + (NB_TRESORS - tresors) + ' à trouver.'); try { api.celebrate && tresors >= NB_TRESORS && api.celebrate('Les ' + NB_TRESORS + ' ' + PL.nomTs + ' !'); } catch (e) { /* rien */ } }
      const px = o.x, py = o.y - 50;
      if (o.k === 'piece') { pieces++; pop('+' + VAL_PIECE + ' · ' + PIECES[o.n], '#ffd36b', px, py); burst(o.x, o.y - 30, '#ffd36b', 20); say('Tu as trouvé ' + PIECES[o.n] + ' ! Ramène-la à la navette.'); try { api.celebrate && api.celebrate('Une pièce du vaisseau !'); } catch (e) { /* rien */ } }
      else if (o.k === 'cristal') { cristaux++; pop('+' + VAL_CRISTAL, '#7fe3ff', px, py); burst(o.x, o.y - 25, '#7fe3ff', 14); }
      else if (o.k === 'oxygene') { oxy = Math.min(100, oxy + 35); pop('+35 % O₂', '#b8ffcf', px, py); bulles(o.x, o.y - 30); respawnOxy(); }
      else if (o.k === 'trousse') { trousses++; pop('Trousse de secours', '#ff9c9c', px, py); say('La trousse te protégera d’une météorite.'); }
      else if (o.k === 'lampe') { lampe = true; pop('Lampe torche', '#fff2a0', px, py); say('Avec la lampe, ton radar voit deux fois plus loin !'); }
    }
    objs = objs.filter(o => !o.pris);
    // la base abandonnée : un plein d'oxygène, une fois
    const base = objs.find(o => o.k === 'base');
    if (base && !baseUsed && Math.hypot(base.x - P.x, base.y - P.y) < 170) { baseUsed = true; oxy = 100; say('La vieille base avait encore de l’oxygène : plein fait !', 3); bulles(P.x, P.y - 40); bulles(base.x, base.y - 80); }
    // sur une planète : une fois les trésors trouvés, la navette repart
    if (monde !== 'lune') {
      if (Math.hypot(P.x, P.y / 0.7) < 230 && tresors >= NB_TRESORS) { state = 'liftoff'; liftT = 0; robot.joie = 9; texts = []; msg = null; try { api.celebrate && api.celebrate('En route pour les étoiles !'); } catch (e) { /* rien */ } return; }
      if (Math.hypot(P.x, P.y / 0.7) < 230 && tresors < NB_TRESORS && !msg) say('Il te manque encore ' + (NB_TRESORS - tresors) + ' ' + PLANETES[monde].nomTs + '.');
      plantes(dt);
    }
    // la navette : les pièces s'envolent dedans, puis on décolle
    else if (Math.hypot(P.x, P.y / 0.7) < 230) {
      if (pieces > 0) {
        for (let i = 0; i < pieces; i++) flyers.push({ x0: P.x, y0: P.y - 60, t: -i * 0.25 });
        posees += pieces; pieces = 0; repT = 1.4;
        pop('Réparée : ' + posees + ' / ' + NB_PIECES, '#ffd36b', 0, -230);
        if (posees < NB_PIECES) say('La navette est réparée à ' + posees + ' / ' + NB_PIECES + '. Trouve les autres pièces !');
      }
      if (posees >= NB_PIECES && !flyers.length) { bonusFin = Math.round(oxy) * 5 + 300; state = 'liftoff'; liftT = 0; endWhy = 'win'; robot.joie = 9; texts = []; msg = null; try { api.celebrate && api.celebrate('Décollage ! Retour vers la Terre !'); } catch (e) { /* rien */ } return; }
    }
    // pluies de météorites
    showerT -= dt;
    if (off('meteorite') || monde === 'jungle') { showerOn = false; showerT = 30; }   // sans météorites (ou dans la jungle) : plus de pluie
    if (!showerOn && showerT < 3 && showerT + dt >= 3) { say(monde === 'lune' ? '⚠️ Pluie de météorites ! Évite les ombres rouges !' : PLANETES[monde].alerte, 3); son('alerte'); }
    if (!showerOn && showerT <= 0) { showerOn = true; showerLeft = 6 + Math.min(8, Math.floor(tJeu / 40)); showerT = 0.2; }
    if (showerOn && showerT <= 0) {
      if (showerLeft-- > 0) {
        const lead = 1, mx = P.x + P.vx * lead + (Math.random() - 0.5) * 300, my = P.y + P.vy * lead + (Math.random() - 0.5) * 220;
        meteors.push({ x: mx, y: my, t: 0, d: 1.7, type: monde === 'lune' ? 'meteorite' : PLANETES[monde].danger });
        showerT = 0.5 + Math.random() * 0.4;
      } else { showerOn = false; showerT = 20 + Math.random() * 12 - Math.min(8, tJeu / 30); }
    }
    for (const m of meteors) {
      m.t += dt;
      if (m.t >= m.d && !m.done) {
        m.done = true; shake = Math.max(shake, 9); impacts.push({ x: m.x, y: m.y, t: 0, type: m.type });
        son('impact', Math.max(0.25, 1 - Math.hypot(m.x - P.x, m.y - P.y) / 700), 0.9 + Math.random() * 0.2);   // plus faible quand elle tombe loin
        if (monde === 'lune' && !craters.some(c => Math.hypot(c.x - m.x, c.y - m.y) < c.r) && Math.hypot(m.x, m.y) > 200) craters.push({ x: m.x, y: m.y, r: 42, neuf: 1 });
        burst(m.x, m.y - 10, '#9a9ba2', 16, 220, 120);
        if (Math.hypot(m.x - P.x, (m.y - P.y) / 0.7) < 75) {
          if (trousses > 0) { trousses--; say('Ouf ! La trousse de secours t’a protégé.'); }
          else { oxy -= 18; P.stun = 1.1; shake = 18; say(m.type === 'glacons' ? 'Aïe ! Un glaçon ! −18 % d’oxygène' : m.type === 'lave' ? 'Aïe ! Une bombe de lave ! −18 % d’oxygène' : 'Aïe ! Une météorite ! −18 % d’oxygène'); }
        }
      }
    }
    meteors = meteors.filter(m => !m.done);
    if (oxy <= 0) { oxy = 0; state = 'end'; stT = 0; endWhy = 'oxy'; P.stun = 99; }
  }
  // les plantes carnivores de Verdia : elles se balancent au repos, se penchent quand tu approches, puis croquent (on a le temps de s'écarter)
  function plantes(dt) {
    for (const o of objs) {
      if (o.k !== 'plante') continue;
      o.cool = Math.max(0, o.cool - dt); const d = Math.hypot(o.x - P.x, (o.y - P.y) / 0.7);
      if (o.snap > 0) {
        const t0 = o.snap; o.snap = Math.max(0, o.snap - dt);
        if (t0 > 0.25 && o.snap <= 0.25) { shake = Math.max(shake, 4); if (d < 100 && P.stun <= 0) { if (trousses > 0) { trousses--; say('Ouf ! La trousse de secours t’a protégé.'); } else { oxy -= 10; P.stun = 0.8; shake = 12; say('Croc ! La plante t’a pincé ! −10 % d’oxygène'); } } }
        if (o.snap <= 0) o.cool = 1.8;
      } else if (d < 125 && o.cool <= 0) o.snap = 0.6;
    }
  }
  function respawnOxy() {
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * TAU, d = 400 + Math.random() * 600, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
      if (Math.hypot(x, y) < R_MONDE - 60 && !craters.some(c => Math.hypot(c.x - x, c.y - y) < c.r + 40)) { objs.push({ k: 'oxygene', x, y, h: 70 }); return; }
    }
  }

  // ---------- dessin ----------
  function drawGround() {
    const t = solTile(monde), ts = 512 * Z, TR = monde === 'lune' ? null : PLANETES[monde].trou;
    const ox = ((W / 2 - camX * Z) % ts + ts) % ts - ts, oy = ((H / 2 - camY * Z) % ts + ts) % ts - ts;
    for (let x = ox; x < W; x += ts) for (let y = oy; y < H; y += ts) ctx.drawImage(t, x, y, ts + 1, ts + 1);
    // le bord du monde : une ombre qui s'épaissit (on ne va pas plus loin)
    const cx = sx(0), cy = sy(0), R = R_MONDE * Z;
    const g = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.25); g.addColorStop(0, 'rgba(10,12,20,0)'); g.addColorStop(1, 'rgba(10,12,20,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // les cratères (vus de dessus, un peu penchés)
    for (const c of craters) {
      const x = sx(c.x), y = sy(c.y), rx = c.r * Z, ry = rx * 0.62;
      if (x + rx < -10 || x - rx > W + 10 || y + ry < -10 || y - ry > H + 10) continue;
      ctx.fillStyle = 'rgba(240,241,245,0.7)'; ctx.beginPath(); ctx.ellipse(x, y + ry * 0.12, rx * 1.12, ry * 1.18, 0, 0, TAU); ctx.fill();
      const gg = ctx.createLinearGradient(0, y - ry, 0, y + ry); gg.addColorStop(0, TR ? TR[0] : c.neuf ? '#4a3a32' : '#55575f'); gg.addColorStop(1, TR ? TR[1] : c.neuf ? '#7a6656' : '#9a9ca3');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      if (monde === 'volcan') { ctx.fillStyle = 'rgba(255,220,120,' + (0.25 + 0.2 * Math.sin(stT * 3 + c.x)) + ')'; ctx.beginPath(); ctx.ellipse(x + Math.sin(stT + c.y) * rx * 0.2, y, rx * 0.35, ry * 0.3, 0, 0, TAU); ctx.fill(); }   // la lave bouillonne
      if (monde === 'glace') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.3, y - ry * 0.2, rx * 0.25, ry * 0.12, -0.3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y - ry * 0.25, rx * 0.85, ry * 0.55, 0, Math.PI, TAU); ctx.fill();
    }
    // la poussière des pas
    for (const p of puffs) { if (p.t < 0) continue; const k = p.t / 0.6; ctx.fillStyle = 'rgba(225,226,232,' + (0.7 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), (6 + k * 16) * Z, (3 + k * 7) * Z, 0, 0, TAU); ctx.fill(); }
    // l'ombre rouge des météorites qui arrivent
    for (const m of meteors) {
      const e = m.t / m.d, x = sx(m.x), y = sy(m.y), r = 70 * Z;
      const bleu = m.type === 'glacons';
      ctx.fillStyle = (bleu ? 'rgba(60,140,255,' : 'rgba(255,50,30,') + (0.12 + e * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = bleu ? 'rgba(120,190,255,0.9)' : 'rgba(255,90,60,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, r * (1.6 - e * 1.1), r * 0.6 * (1.6 - e * 1.1), 0, 0, TAU); ctx.stroke();
    }
  }
  // tous les objets debout, triés par leur pied (le plus haut à l'écran d'abord)
  function drawWorld() {
    const L = [];
    const parti = endWhy === 'win' && state === 'end';   // la navette est partie avec toi
    for (const o of objs) if (!(parti && o.k === 'navette')) L.push(o);
    const dehors = (state !== 'liftoff' || liftT < 1.4) && !parti && !(state === 'atterro' && landT < 2.3);
    if (dehors) L.push({ k: '_joueur', x: P.x, y: P.y });
    if (dehors) L.push({ k: '_robot', x: robot.x, y: robot.y });
    for (const im of impacts) L.push({ k: '_impact', x: im.x, y: im.y + 1, im });
    // règle stricte : le robot ne passe jamais devant toi (quand il est à ta hauteur, il est dessiné derrière) ; en vol, la navette passe au-dessus de tout
    const prof = o => o.k === 'navette' && ((state === 'liftoff' && liftT > 1.4) || (state === 'atterro' && landT < 2.2)) ? 1e9 : o.k === '_robot' && Math.abs(o.x - P.x) < 100 ? Math.min(o.y, P.y - 0.5) : o.y;
    L.sort((a, b) => prof(a) - prof(b));
    for (const o of L) {
      const x = sx(o.x), y = sy(o.y);
      if (x < -300 || x > W + 300 || y < -60 || y > H + 400) { if (!(o.k === 'navette' && (state === 'liftoff' || state === 'atterro'))) continue; }   // la navette qui monte est dessinée plus haut que son pied au sol
      if (o.k === '_joueur') { drawPlayer(x, y); continue; }
      if (o.k === '_robot') { if (!off('robot')) drawRobot(x, y); continue; }
      if (o.k === '_impact') { drawImpact(x, y, o.im.t, o.im.type); continue; }
      const h = o.h * Z;
      ctx.fillStyle = 'rgba(30,32,40,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.42, h * 0.1, 0, 0, TAU); ctx.fill();
      if (o.k === 'plante') { drawPlante(o, x, y); continue; }
      if (o.k === 'deco') { drawDeco(o, x, y); continue; }
      const bob = /^(piece|cristal|oxygene|trousse|lampe|tresor)$/.test(o.k) ? (0.5 + 0.5 * Math.sin(stT * 3 + o.x)) * h * 0.12 : 0;
      if (o.k === 'piece') { ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(stT * 5); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y - h * 0.5 - bob, h * 0.75, 0, TAU); ctx.fill(); ctx.restore(); }
      if (o.k === 'oxygene') { ctx.save(); ctx.globalAlpha = 0.18 + 0.12 * Math.sin(stT * 4 + o.y); ctx.fillStyle = '#9dffbf'; ctx.beginPath(); ctx.arc(x, y - h * 0.5 - bob, h * 0.6, 0, TAU); ctx.fill(); ctx.restore(); }
      if (o.k === 'navette') { drawNavette(x, y, h); continue; }
      if (o.k === 'tresor') { ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(stT * 5 + o.x); ctx.fillStyle = PLANETES[monde].coul; ctx.beginPath(); ctx.arc(x, y - h * 0.5 - bob, h * 0.8, 0, TAU); ctx.fill(); ctx.restore(); }
      drawFoot(ctx, o.img || o.k, x, y - bob, h);
      if (o.k === 'tresor') { ctx.fillStyle = '#fffbe0'; for (let i = 0; i < 3; i++) { const t = (stT * 0.8 + i / 3 + (o.y % 5) * 0.1) % 1, s2 = Math.sin(t * Math.PI) * 8 * Z; if (s2 > 0.5) star(ctx, x + Math.cos(i * 2.1 + o.x) * h * 0.45, y - bob - h * (0.25 + 0.6 * i / 3), s2, t * 3); } }
      if (o.k === 'cristal') { ctx.fillStyle = '#e8fbff'; for (let i = 0; i < 2; i++) { const t = (stT * 0.9 + i * 0.5 + (o.x % 7) * 0.13) % 1, s = Math.sin(t * Math.PI) * 7 * Z; if (s > 0.5) star(ctx, x + Math.cos(i * 2.4 + o.y) * h * 0.3, y - bob - h * (0.3 + 0.5 * ((i + o.x) % 3) / 3), s, t * 3); } }
      if (o.fume) smoke(x - h * 0.18, y - h * 0.75, h);
      if (o.k === 'base' && !baseUsed) label('O₂', x, y - h - 6 * Z, '#b8ffcf');
    }
  }
  // le décor d'une planète : il « vit » (les cristaux de glace scintillent, le rocher fume, le champignon respire)
  function drawDeco(o, x, y) {
    const h = o.h * Z;
    ctx.fillStyle = 'rgba(30,32,40,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.42, h * 0.1, 0, 0, TAU); ctx.fill();
    if (o.img === 'champi-geant') { const k = 1 + 0.025 * Math.sin(stT * 1.8 + o.ph); ctx.save(); ctx.translate(x, y); ctx.scale(1 / Math.sqrt(k), k); drawFoot(ctx, o.img, 0, 0, h); ctx.restore(); for (let i = 0; i < 2; i++) { const t = (stT * 0.5 + i / 2 + o.ph) % 1; ctx.fillStyle = 'rgba(150,255,220,' + (0.7 * (1 - t)) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(o.ph + i * 3) * h * 0.3, y - h * (0.7 + t * 0.5), 3 * Z, 0, TAU); ctx.fill(); } return; }
    drawFoot(ctx, o.img, x, y, h);
    if (o.img === 'roche-feu') smoke(x + h * 0.05, y - h * 0.7, h * 0.8);
    if (o.img === 'glace-bloc') { ctx.fillStyle = '#ffffff'; const t = (stT * 0.7 + o.ph) % 1, s2 = Math.sin(t * Math.PI) * 9 * Z; if (s2 > 0.5) star(ctx, x + Math.cos(o.ph * 3) * h * 0.25, y - h * (0.4 + 0.3 * Math.sin(o.ph)), s2, t * 3); }
  }
  // la plante carnivore : se balance au repos, se penche vers toi quand tu approches, ouvre grand la bouche et croque
  function drawPlante(o, x, y) {
    const h = o.h * Z, d = Math.hypot(o.x - P.x, o.y - P.y), vers = Math.sign(P.x - o.x) || 1;
    const penche = o.snap > 0 ? vers * 0.25 * Math.sin(Math.min(1, (0.6 - o.snap) / 0.35) * Math.PI / 2) : d < 260 ? vers * 0.1 : Math.sin(stT * 1.4 + o.ph) * 0.06;
    const k = o.snap > 0 ? 1.08 : 1 + 0.03 * Math.sin(stT * 2 + o.ph);
    ctx.fillStyle = 'rgba(30,32,40,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.35, h * 0.09, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(penche); ctx.scale(1, k);
    drawFoot(ctx, o.snap > 0 && o.snap < 0.45 ? 'plante-croque' : 'plante', 0, 0, h, vers < 0);
    ctx.restore();
    if (o.snap > 0.25) { ctx.fillStyle = '#ff5a8a'; ctx.font = 'bold ' + Math.round(26 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText('!', x, y - h * 1.15); }
  }
  // la navette, une fois réparée (5 pièces posées, et ensuite partout : carte, vol, planètes) : l'image neuve, capot fermé, sans fils
  const navImg = () => (monde !== 'lune' || posees >= NB_PIECES) && IMG['navette-neuve'] ? 'navette-neuve' : 'navette';
  function drawNavette(x, y, h) {
    let lift = 0;
    if (state === 'liftoff') lift = liftW() * Z;
    if (state === 'atterro') lift = ALT() * Z;
    // la flamme pendant la descente (atterrissage)
    if (state === 'atterro' && landT < 2.3) {
      const fy = y - lift - h * 0.12, fl = h * (0.3 + 0.08 * Math.sin(stT * 31)), fw = h * 0.12;
      for (const [k, c0, c1] of [[1, 'rgba(255,140,40,0.85)', 'rgba(255,80,20,0)'], [0.5, 'rgba(255,255,230,1)', 'rgba(255,220,150,0)']]) {
        const g = ctx.createLinearGradient(0, fy, 0, fy + fl * k); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - fw * k, fy); ctx.quadraticCurveTo(x, fy + fl * k * 1.2, x + fw * k, fy); ctx.closePath(); ctx.fill();
      }
    }
    // flammes et fumée au décollage
    if (state === 'liftoff' && liftT > 1.1) {
      for (let i = 0; i < 18; i++) { const t = (stT * 2.4 + i / 18) % 1; ctx.fillStyle = 'rgba(200,202,210,' + (0.5 * (1 - t)) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(i * 2.1) * t * h * 0.9, y + Math.sin(i * 1.7) * t * h * 0.15, h * (0.08 + t * 0.2), 0, TAU); ctx.fill(); }
      // la flamme du réacteur : effilée, cœur blanc, bords orange, elle vacille
      const fy = y - lift - h * 0.12, fl = h * (0.45 + 0.08 * Math.sin(stT * 31) + Math.min(0.35, liftT * 0.12)), fw = h * 0.13;
      for (const [k, c0, c1] of [[1, 'rgba(255,140,40,0.85)', 'rgba(255,80,20,0)'], [0.6, 'rgba(255,230,120,0.95)', 'rgba(255,170,60,0)'], [0.3, 'rgba(255,255,240,1)', 'rgba(255,240,180,0)']]) {
        const g = ctx.createLinearGradient(0, fy, 0, fy + fl * k); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - fw * k, fy); ctx.quadraticCurveTo(x - fw * k * 0.8, fy + fl * k * 0.5, x + Math.sin(stT * 23) * fw * 0.2, fy + fl * k); ctx.quadraticCurveTo(x + fw * k * 0.8, fy + fl * k * 0.5, x + fw * k, fy); ctx.closePath(); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(30,32,40,' + (0.3 / (1 + lift / 100)) + ')'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.5, h * 0.12, 0, 0, TAU); ctx.fill();
    const wob = state === 'liftoff' && liftT > 1.1 && liftT < 1.7 ? Math.sin(stT * 60) * 2 : 0;
    drawFoot(ctx, navImg(), x + wob, y - lift, navImg() === 'navette-neuve' ? h * 0.72 : h);   // la neuve est plus allongée : même largeur au sol
    // les étincelles de la réparation
    if (repT > 0) { ctx.fillStyle = '#fff3a0'; for (let i = 0; i < 5; i++) star(ctx, x + Math.sin(stT * 13 + i * 2) * h * 0.35, y - h * (0.3 + 0.1 * Math.cos(stT * 9 + i)), (4 + 3 * Math.sin(stT * 20 + i)) * Z, stT * 6 + i); }
    if (state !== 'liftoff' && state !== 'atterro' && monde === 'lune') {
      const w = Math.min(h * 0.75, 170 * Z), bh = 11 * Z, bx = x - w / 2, by = y - h - 14 * Z;
      pill(ctx, bx, by, w, bh, bh / 2); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      if (posees) { pill(ctx, bx, by, w * posees / NB_PIECES, bh, bh / 2); ctx.fillStyle = '#ffd36b'; ctx.fill(); }
      label('Navette ' + posees + '/' + NB_PIECES, x, by - 3 * Z, '#ffd36b');
    }
  }
  function smoke(x, y, h) {
    for (let i = 0; i < 6; i++) {
      const t = (stT * 0.3 + i / 6) % 1, r = h * (0.05 + t * 0.12);
      ctx.fillStyle = 'rgba(70,72,80,' + (0.45 * (1 - t)) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(t * 4 + i) * h * 0.08 + t * h * 0.15, y - t * h * 0.6, r, 0, TAU); ctx.fill();
    }
  }
  function label(s, x, y, c) {
    ctx.font = 'bold ' + Math.round(Math.max(13, 17 * Z)) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(s, x, y); ctx.fillStyle = c || '#fff'; ctx.fillText(s, x, y);
  }
  // le survivant : la bonne pose selon la direction ; marche = cycle de 4 images (pied posé, passage, autre pied, passage), sans faux sauts ;
  // repos = cycle de respiration (le buste se soulève, le casque se balance, les pieds ne bougent pas), dans chaque direction
  function playerPose() {
    // victoire : un saut de joie (0,6 s) avant de monter à bord ; défaite : à bout d'oxygène ; dégâts : renversé par la météorite
    if (state === 'liftoff' && liftT < 0.6) return { n: 'joie', f: false, hop: Math.sin(liftT / 0.6 * Math.PI) * 26 };
    if (endWhy === 'oxy') return { n: stT < 0.35 ? 'touche' : 'epuise', f: false, hop: 0 };   // il chancelle, puis s'affaisse
    if (P.stun > 0) return { n: 'touche', f: false, hop: 0 };
    const st = Math.floor(P.step) % 4;
    if (P.dir === 'cote') {
      // dessinés vers la droite (retournés pour la gauche) : grand pas bras en arrière, jambes réunies, grand pas bras devant, jambes réunies
      if (P.moving) return { n: 'cote' + (st + 1), f: !P.flip, hop: 0 };
      return { n: 'cote-repos', f: !P.flip, hop: 0, souffle: 1 };
    }
    const n = P.dir === 'dos' ? 'dos' : 'face';
    return P.moving ? { n: n + (st + 1), f: false, hop: 0 } : { n: n === 'face' ? 'face-repos' : 'dos2', f: false, hop: 0, souffle: 1 };
  }
  // la respiration au repos : la partie haute du dessin (buste, casque) s'étire très légèrement et se balance, la partie basse ne bouge pas
  function drawSouffle(nom, x, y, h, flip, t) {
    t = t || 0;   // V8 : avant le 1er pas (écran de départ), t n'existait pas → buste et casque disparaissaient (NaN)
    const im = IMG[nom]; if (!im) { drawFoot(ctx, nom, x, y, h, flip); return; }
    const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5;
    const cut = 0.56, sh = im.height * cut, k = 1 + 0.035 * (0.5 - 0.5 * Math.cos(t * 2.1)), sway = Math.sin(t * 1.05) * 0.02 * hh;
    const dw = w, top = hh * cut * k, yb = y - hh * (1 - cut);
    ctx.save(); ctx.translate(x, 0); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, 0, sh - 1, im.width, im.height - sh + 1, -dw * ax, yb - 1, dw, hh * (1 - cut) + 1);   // jambes : fixes
    ctx.transform(1, 0, sway / top, 1, 0, 0);
    ctx.drawImage(im, 0, 0, im.width, sh, -dw * ax - sway * (yb - top) / top, yb - top, dw, top + 0.6);  // buste et casque : respirent
    ctx.restore();
  }
  function drawPlayer(x, y) {
    const h = 130 * Z, ps = playerPose();
    ctx.fillStyle = 'rgba(30,32,40,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.07, 0, 0, TAU); ctx.fill();
    if (state === 'liftoff') ctx.globalAlpha = Math.max(0, Math.min(1, (1.4 - liftT) / 0.8));
    if (ps.souffle) drawSouffle(ps.n, x, y, h, ps.f, P.repos);
    else drawFoot(ctx, ps.n, x, y - ps.hop * Z, h, ps.f);
    if (P.stun > 0 && endWhy !== 'oxy' && state === 'play') { ctx.fillStyle = '#ffe36b'; for (let i = 0; i < 3; i++) { const a = stT * 5 + i * TAU / 3; star(ctx, x + Math.cos(a) * h * 0.3, y - h * 1.02 + Math.sin(a) * h * 0.08, 6 * Z, stT * 4); } }
    ctx.globalAlpha = 1;
    // la lampe torche : un halo devant toi
    if (lampe && state === 'play') { const d = P.dir === 'dos' ? [0, -1] : P.dir === 'face' ? [0, 1] : [P.flip ? 1 : -1, 0]; const lx = x + d[0] * h * 0.9, ly = y - h * 0.3 + d[1] * h * 0.6; const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, h * 0.9); g.addColorStop(0, 'rgba(255,250,200,0.28)'); g.addColorStop(1, 'rgba(255,250,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, h * 0.9, 0, TAU); ctx.fill(); }
  }
  // le robot : il roule (2 poses), montre le chemin quand tu t'arrêtes, est content quand tu ramasses
  function drawRobot(x, y) {
    const h = 70 * Z, moving = robot.roule;
    const t = cible();
    let n = robot.roule ? (Math.floor(robot.step || 0) % 2 ? 'robot1' : 'robot2') : 'robot-montre';
    if (robot.joie > 0) n = 'robot-content';
    ctx.fillStyle = 'rgba(30,32,40,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.4, h * 0.1, 0, 0, TAU); ctx.fill();
    const hop = robot.joie > 0 ? Math.abs(Math.sin(stT * 10)) * 8 * Z : 0;
    if (state === 'liftoff') ctx.globalAlpha = Math.max(0, Math.min(1, (1.4 - liftT) / 0.8));
    // au repos : il se balance doucement sur ses chenilles (pivot au sol)
    const bal = !moving && robot.joie <= 0 ? Math.sin(stT * 1.7) * 0.045 : 0;
    ctx.save(); ctx.translate(x, y - hop); ctx.rotate(bal);
    drawFoot(ctx, n, 0, 0, h, n === 'robot-montre' && t && t.x > robot.x);
    // la boule de l'antenne s'allume et s'éteint
    const im = IMG[n], fl = n === 'robot-montre' && t && t.x > robot.x;
    if (im) {
      const lum = 0.35 + 0.65 * Math.max(0, Math.sin(stT * 3.2)), w = h * im.width / im.height, ax = ((ANTENNE[n] || 0.5) - 0.5) * w * (fl ? -1 : 1), ay = -h * 0.947;
      const gl = ctx.createRadialGradient(ax, ay, 0, ax, ay, h * 0.14); gl.addColorStop(0, 'rgba(255,90,70,' + (0.85 * lum) + ')'); gl.addColorStop(1, 'rgba(255,90,70,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ax, ay, h * 0.14, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // la flèche du robot vers la cible
    if (t && state === 'play') {
      const a = Math.atan2(t.y - robot.y, t.x - robot.x), cx = x, cy = y - h * 1.35, k = 1 + 0.12 * Math.sin(stT * 6);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.scale(k, k); ctx.fillStyle = t.k === 'navette' ? '#ffd36b' : '#7fe3ff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18 * Z, 0); ctx.lineTo(-8 * Z, -11 * Z); ctx.lineTo(-3 * Z, 0); ctx.lineTo(-8 * Z, 11 * Z); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  function drawImpact(x, y, t, type) {
    if (type === 'glacons') {   // le glaçon éclate : des éclats bleus qui volent et s'effacent
      const k = Math.min(1, t / 1.1); ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, d = (20 + k * 90) * Z; ctx.fillStyle = i % 2 ? '#e8f6ff' : '#8fc8f0'; ctx.save(); ctx.translate(x + Math.cos(a) * d, y - 20 * Z + Math.sin(a) * d * 0.5 - Math.sin(k * Math.PI) * 30 * Z); ctx.rotate(a + k * 4); ctx.fillRect(-4 * Z, -9 * Z, 8 * Z, 18 * Z); ctx.restore(); }
      ctx.globalAlpha = 1; return;
    }
    // éclair, boule de feu, nuage de poussière, poussière qui retombe
    const n = t < 0.12 ? 'impact1' : t < 0.4 ? 'impact2' : t < 0.75 ? 'impact3' : 'impact4', h = (n === 'impact1' ? 80 : n === 'impact2' ? 170 : 150) * Z;
    ctx.globalAlpha = n === 'impact4' ? Math.max(0, 1 - (t - 0.75) / 0.35) : 1;
    if (!off(n)) drawFoot(ctx, n, x, y + h * 0.15, h);   // une étape coupée : on ne la dessine pas (les autres restent)
    ctx.globalAlpha = 1;
  }
  // la météorite en l'air : elle tombe en biais vers son ombre
  function drawFalling() {
    for (const m of meteors) {
      const e = m.t / m.d, x = sx(m.x) + (1 - e) * 260 * Z, y = sy(m.y) - (1 - e) * (H * 0.9), h = 120 * Z;
      if (m.type === 'glacons') {   // un glaçon pointu qui tombe, avec un reflet
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.45); const g = ctx.createLinearGradient(-h * 0.12, 0, h * 0.12, 0); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#6faee0'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(-h * 0.13, -h * 0.25); ctx.lineTo(0, -h * 0.4); ctx.lineTo(h * 0.13, -h * 0.25); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-h * 0.03, -h * 0.25, h * 0.03, h * 0.5); ctx.restore(); continue;
      }
      if (m.type === 'lave') {   // une bombe de lave : boule orange, cœur jaune, traînée
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,' + (120 + i * 20) + ',40,' + (0.5 - i * 0.08) + ')'; ctx.beginPath(); ctx.arc(x + i * 18 * Z, y - i * 60 * Z, h * (0.22 - i * 0.03), 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(x, y, h * 0.12, 0, TAU); ctx.fill(); continue;
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.45); drawFoot(ctx, 'meteorite', 0, h * 0.45, h); ctx.restore();
    }
  }
  function drawFlyers() {
    for (const q of prises) {
      const e = q.t * q.t, x = q.x + (P.x - q.x) * e, y = q.y + (P.y - 70 - q.y) * e - Math.sin(q.t * Math.PI) * 40;
      ctx.globalAlpha = 1 - q.t * 0.6; drawFoot(ctx, q.k, sx(x), sy(y), q.h * Z * (1 - q.t * 0.7)); ctx.globalAlpha = 1;
    }
    for (const f of flyers) {
      if (f.t < 0) continue;
      const e = 1 - Math.pow(1 - f.t, 2), x = f.x0 + (0 - f.x0) * e, y = f.y0 + (-90 - f.y0) * e - Math.sin(f.t * Math.PI) * 140;
      drawFoot(ctx, 'piece', sx(x), sy(y), 60 * Z * (1 - f.t * 0.4));
    }
  }
  function cible() {
    if (monde !== 'lune' ? tresors >= NB_TRESORS : (pieces > 0 || posees + pieces >= NB_PIECES)) return { x: 0, y: 0, k: 'navette' };
    let best = null, bd = 1e9;
    for (const o of objs) if (o.k === (monde !== 'lune' ? 'tresor' : 'piece')) { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  function drawHud() {
    const m = 10 * U, fs = Math.round(20 * U);
    const bw = Math.min(W * 0.44, 300 * U), bh = 26 * U, x = m, y = m;
    pill(ctx, x, y, bw, bh, bh / 2); ctx.fillStyle = 'rgba(10,14,26,0.7)'; ctx.fill();
    const c = oxy > 50 ? '#5fe08a' : oxy > 25 ? '#ffc94d' : '#ff5a4a';
    pill(ctx, x + 3, y + 3, Math.max(0, (bw - 6) * oxy / 100), bh - 6, (bh - 6) / 2); ctx.fillStyle = c; ctx.fill();
    ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('O₂ ' + Math.ceil(oxy) + ' %', x + 12 * U, y + bh / 2 + 1);
    const y2 = y + bh + 8 * U;
    pill(ctx, x, y2, bw, 34 * U, 12 * U); ctx.fillStyle = 'rgba(10,14,26,0.6)'; ctx.fill();
    const ic = 26 * U;
    if (monde !== 'lune') { const PL = PLANETES[monde]; drawFoot(ctx, PL.tresor, x + 22 * U, y2 + 31 * U, ic); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = PL.coul; ctx.fillText(tresors + '/' + NB_TRESORS, x + 42 * U, y2 + 18 * U); }
    else { drawFoot(ctx, 'piece', x + 22 * U, y2 + 30 * U, ic * 0.9);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = '#ffd36b'; ctx.fillText((posees + pieces) + '/' + NB_PIECES, x + 40 * U, y2 + 18 * U); }
    if (!off('cristal') && monde === 'lune') { drawFoot(ctx, 'cristal', x + 110 * U, y2 + 30 * U, ic); ctx.fillStyle = '#7fe3ff'; ctx.fillText('' + cristaux, x + 126 * U, y2 + 18 * U); }
    if (trousses) { drawFoot(ctx, 'trousse', x + 176 * U, y2 + 30 * U, ic * 0.85); ctx.fillStyle = '#ff9c9c'; ctx.fillText('' + trousses, x + 192 * U, y2 + 18 * U); }
    ctx.textAlign = 'right'; ctx.font = 'bold ' + Math.round(24 * U) + 'px ' + RF; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText('' + score(), W - 62, m + 22 * U); ctx.fillStyle = '#fff'; ctx.fillText('' + score(), W - 62, m + 22 * U);
    ctx.font = Math.round(13 * U) + 'px ' + RF; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('ce que tu possèdes', W - 62, m + 42 * U);
    // la cible du robot, si elle est hors de l'écran : une flèche au bord
    const t = state === 'play' ? cible() : null;
    if (t) {
      const tx = sx(t.x), ty = sy(t.y), d = Math.round(Math.hypot(t.x - P.x, t.y - P.y) / 10);
      if (tx < 30 || tx > W - 30 || ty < 90 * U || ty > H - 30) {
        const a = Math.atan2(ty - H / 2, tx - W / 2), r = Math.min(W / 2 - 34 * U, H / 2 - 60 * U) , ex = W / 2 + Math.cos(a) * r, ey = H / 2 + Math.sin(a) * r * 1.0;
        const col = t.k === 'navette' ? '#ffd36b' : '#7fe3ff';
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(22 * U, 0); ctx.lineTo(-10 * U, -14 * U); ctx.lineTo(-4 * U, 0); ctx.lineTo(-10 * U, 14 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.font = 'bold ' + Math.round(13 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        const s = (t.k === 'navette' ? 'Navette ' : monde !== 'lune' ? 'Trésor ' : 'Pièce ') + d + ' m', lx = ex - Math.cos(a) * 34 * U, ly = ey - Math.sin(a) * 26 * U;
        ctx.strokeText(s, lx, ly); ctx.fillStyle = '#fff'; ctx.fillText(s, lx, ly);
      }
    }
    // le radar : la lampe double sa portée
    const rr = 54 * U, rcx = W - rr - 12 * U, rcy = H - rr - 12 * U, rng2 = lampe ? 1400 : 700;
    ctx.fillStyle = 'rgba(10,14,26,0.6)'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.clip();
    const dot = (wx, wy, col, r, toujours) => { const k = rr / rng2; let px = (wx - P.x) * k, py = (wy - P.y) * k; const l = Math.hypot(px, py); if (l > rr - 3) { if (!toujours) return; px *= (rr - 3) / l; py *= (rr - 3) / l; } ctx.fillStyle = col; ctx.beginPath(); ctx.arc(rcx + px, rcy + py, r * U, 0, TAU); ctx.fill(); };
    for (const o of objs) { const col = { piece: '#ffd36b', tresor: '#ffd36b', cristal: '#7fe3ff', oxygene: '#5fe08a', trousse: '#ff9c9c', lampe: '#fff2a0', base: '#c9b6ff', navette: '#fff', plante: '#ff5a8a' }[o.k]; if (col) dot(o.x, o.y, col, o.k === 'navette' || o.k === 'piece' || o.k === 'tresor' ? 3.5 : 2.2, o.k === 'navette' || o.k === 'piece' || o.k === 'tresor'); }
    for (const mm of meteors) dot(mm.x, mm.y, '#ff5a4a', 3);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rcx, rcy, 3.5 * U, 0, TAU); ctx.fill();
  }
  function drawJoy() {
    if (!joy.on) return;
    const R = 80 * U, dx = joy.x - joy.x0, dy = joy.y - joy.y0;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(joy.x0 + dx, joy.y0 + dy, R * 0.42, 0, TAU); ctx.fill();
  }
  function drawFx() {
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.d);
      if (p.bulle) { ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z, 0, TAU); ctx.stroke(); }
      else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, 2 * (1.3 - t.t)); ctx.font = 'bold ' + Math.round(24 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const x = sx(t.x), y = sy(t.y) - t.t * 60 * U;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t.s, x, y); ctx.fillStyle = t.c; ctx.fillText(t.s, x, y);
    }
    ctx.globalAlpha = 1;
  }
  function drawMsg() {
    if (msg) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (msg.d - msg.t) * 3, msg.t * 6)); ctx.font = 'bold ' + Math.round(18 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = Math.min(W - 20, ctx.measureText(msg.s).width + 40 * U), y = H - (portrait ? 150 : 100) * U;
      pill(ctx, W / 2 - w / 2, y - 22 * U, w, 44 * U, 22 * U); ctx.fillStyle = 'rgba(16,22,40,0.85)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, W / 2, y + 1, W - 40);
      ctx.globalAlpha = 1;
    }
    if (flash > 0) { ctx.fillStyle = 'rgba(255,40,30,' + flash * 0.5 + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function big(s, y, k, c) {
    const fs = Math.round(Math.min(W * 0.9 / (0.55 * Math.max(6, s.length)), 70 * U * (k || 1))); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, fs * 0.14); ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(s, W / 2, y); ctx.fillStyle = c || '#fff'; ctx.fillText(s, W / 2, y);
  }
  function drawTitle() {
    const f = off('fond') ? null : IMG.fond;
    ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
    if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) / 2, f.width * s, f.height * s); }
    else { ctx.fillStyle = '#8e9199'; ctx.fillRect(0, H * 0.6, W, H); }
    // V7 : en paysage (téléphone couché, PC), la liste et le bouton Jouer cachaient l'astronaute : la liste passe sur 2 colonnes
    // et, s'il le faut encore, les personnages descendent un peu. Le portrait ne change pas.
    const lines = [off('robot') ? '🧭 Explore la Lune : la flèche montre le chemin' : '🧭 Explore la Lune : ton robot montre le chemin', '⚙️ Trouve les 5 pièces et ramène-les à la navette', '🚀 Puis pilote ta navette vers 3 planètes', off('oxygene') ? '🫧 Ton oxygène baisse : fais vite !' : '🫧 Ramasse l’oxygène : il baisse sans arrêt !', off('cristal') ? null : '💎 Les cristaux, c’est ton trésor', off('meteorite') ? null : '☄️ Fuis les ombres rouges des météorites'].filter(Boolean);
    const lh = 30 * U, cy = portrait ? H * 0.66 : H * 0.2, bh = 66 * U, hr = (IMG.face1 && IMG.face1.hr) || 1;
    let gy = H * (portrait ? 0.6 : 0.74), cols = 1, cw = Math.min(W - 24, 560 * U);
    let rows = lines.length, chh = rows * lh + 22 * U;
    const hautHeros = g => g + 40 * U - 200 * U * hr;
    if (!portrait && cy + chh + 16 * U + bh + 6 * U > hautHeros(gy)) {
      cols = 2; cw = Math.min(W - 24, 1000 * U); rows = Math.ceil(lines.length / 2); chh = rows * lh + 22 * U;
      const bas = cy + chh + 16 * U + bh + 8 * U;
      if (bas > hautHeros(gy)) gy = Math.min(H - 44 * U, gy + (bas - hautHeros(gy)));
    }
    if (!off('epave')) { drawFoot(ctx, 'epave', W * 0.18, gy + 10 * U, 150 * U); smoke(W * 0.18 - 25 * U, gy - 100 * U, 150 * U); }
    drawFoot(ctx, 'navette', W * 0.82, gy + 20 * U, 140 * U);
    drawFoot(ctx, 'face' + (1 + Math.floor(stT * 6) % 4), W * 0.47, gy + 40 * U, 200 * U);
    if (!off('robot')) drawFoot(ctx, Math.floor(stT * 5) % 2 ? 'robot1' : 'robot2', W * 0.47 + 120 * U, gy + 40 * U, 90 * U);
    big('SEUL SUR LA LUNE', H * 0.12, 1, '#e8eeff');
    // les lignes des éléments que le joueur a coupés disparaissent
    const cx = (W - cw) / 2, colW = (cw - 30 * U) / cols;
    pill(ctx, cx, cy, cw, chh, 18 * U); ctx.fillStyle = 'rgba(10,14,30,0.72)'; ctx.fill();
    ctx.font = 'bold ' + Math.round(18 * U) + 'px ' + RF; ctx.fillStyle = '#e8eeff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => { const c = Math.floor(i / rows), r = i % rows; ctx.fillText(l, cx + 18 * U + c * colW, cy + 11 * U + lh * (r + 0.5), colW - 12 * U); });
    const bw = 260 * U, by = cy + chh + 16 * U, k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(k, k);
    pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#7fb6ff'); g.addColorStop(1, '#3b6fd8'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF; ctx.textAlign = 'center';
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    ctx.font = Math.round(14 * U) + 'px ' + RF; ctx.fillStyle = 'rgba(230,236,255,0.85)'; ctx.textAlign = 'center'; /* (mention retirée) */
    if (loadErr) { ctx.fillStyle = '#ff9c9c'; ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', W / 2, H - 40 * U, W - 30); }
  }
  function drawIntro() {
    // V8 : l'explorateur reste visible (le voile s'ouvre autour de lui), le texte au-dessus de sa tête, la consigne en bas de l'écran
    const hx = sx(P.x), hy = sy(P.y), hh = 130 * Z, cy = hy - hh * 0.5, a = Math.max(0.5, 1 - stT * 0.5), r0 = hh * 0.75, r1 = hh * 1.6;
    const vg = ctx.createRadialGradient(hx, cy, r0, hx, cy, r1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + a + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const lines = ['Ton vaisseau a percuté un astéroïde…', 'Tu es le seul survivant.', 'Répare la navette de secours', 'et rentre sur Terre !'];
    const fin = hy - hh - 34 * U, gap = Math.max(26 * U, Math.min(52 * U, (fin - H * 0.07) / 3.3)), k = Math.min(0.55, gap / (70 * U * 1.3));
    lines.forEach((l, i) => { ctx.globalAlpha = Math.max(0, Math.min(1, stT * 1.5 - i * 0.6)); big(l, fin - (3 - i) * gap, k, i >= 2 ? '#ffd36b' : '#fff'); });
    ctx.globalAlpha = Math.max(0, Math.min(1, stT - 2)) * (0.6 + 0.4 * Math.sin(stT * 4));
    big(joyHint(), Math.max(hy + 60 * U, H - 44 * U), 0.42, '#bcd0ff'); ctx.globalAlpha = 1;
  }
  const joyHint = () => { try { return matchMedia('(pointer: coarse)').matches ? 'Glisse ton doigt pour marcher · touche pour commencer' : 'Flèches pour marcher · Entrée pour commencer'; } catch (e) { return 'Touche pour commencer'; } };
  function againBtn() { const bw = 260 * U, bh = 62 * U; return { x: (W - bw) / 2, y: H * 0.72, w: bw, h: bh }; }
  function drawEnd() {
    // défaite : on voit d'abord le survivant s'effondrer (1,3 s), puis l'écran s'assombrit et le résultat arrive
    const t0 = endWhy === 'oxy' ? 1.3 : 0, e = stT - t0;
    ctx.fillStyle = 'rgba(4,6,14,' + Math.max(0, Math.min(0.75, endWhy === 'oxy' ? stT * 0.25 + Math.max(0, e) * 0.6 : stT)) + ')'; ctx.fillRect(0, 0, W, H);
    if (e < 0) return;
    ctx.globalAlpha = Math.min(1, e * 2.5);
    if (endWhy === 'terre') { big('Bienvenue sur Terre !', H * 0.22, 0.8, '#7fd0ff'); big(visites.length + ' planète' + (visites.length > 1 ? 's' : '') + ' visitée' + (visites.length > 1 ? 's' : '') + ' · ' + totTresors + ' trésor' + (totTresors > 1 ? 's' : '') + ' · ✨ ' + poussiere, H * 0.33, 0.5); }
    else if (endWhy === 'win') { big('Retour vers la Terre !', H * 0.22, 0.8, '#ffd36b'); big('Tu as décollé avec ' + Math.ceil(oxy) + ' % d’oxygène', H * 0.33, 0.55); }
    else { big('Plus d’oxygène…', H * 0.22, 0.8, '#ff9c9c'); big(monde !== 'lune' ? 'Sur ' + PLANETES[monde].nom + ' : ' + tresors + ' / ' + NB_TRESORS + ' ' + PLANETES[monde].nomTs : 'La navette était réparée à ' + posees + ' / ' + NB_PIECES, H * 0.33, 0.55); }
    if (endWhy !== 'terre') big((off('cristal') ? '' : cristaux + ' cristaux · ') + (posees + pieces) + ' pièces', H * 0.43, 0.55, '#7fe3ff');
    else big((off('cristal') ? '' : cristaux + ' cristaux · ') + 'navette réparée', H * 0.43, 0.55, '#7fe3ff');
    big('Score : ' + score(), H * 0.56, 0.9);
    if (e > 1.2) {
      const b = againBtn(); pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = '#3b6fd8'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.4) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↺ Rejouer', W / 2, b.y + b.h / 2 + 1);
    }
    ctx.globalAlpha = 1;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state === 'load' || state === 'title') { drawTitle(); if (paused && !gele) drawPause(); if (gele) drawGele(); return; }
    const kx = shake ? (Math.random() - 0.5) * shake : 0, ky = shake ? (Math.random() - 0.5) * shake : 0;
    if (state === 'carte') { drawCarte(); drawMsg(); if (paused && !gele) drawPause(); if (gele) drawGele(); return; }
    if (state === 'vol' || (state === 'end' && endWhy === 'terre')) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * kx, dpr * ky); drawVol(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMsg(); drawJoy(); if (state === 'end') drawEnd(); if (paused && !gele) drawPause(); if (gele) drawGele(); return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, dpr * kx, dpr * ky);
    drawGround(); drawWorld(); drawFlyers(); drawFalling(); drawFx();
    if (state === 'liftoff') big('Décollage !', H * 0.2, 0.9, '#ffd36b');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state === 'play' || state === 'liftoff') drawHud();
    if (state === 'atterro' && landT < 2.4) big(PLANETES[monde].titre, H * 0.2, 0.7, PLANETES[monde].coul);
    drawMsg(); drawJoy();
    if (state === 'intro') drawIntro();
    if (state === 'end') drawEnd();
    if (paused && !gele) drawPause();   // pendant l'arrêt sur image de l'Atelier, un seul écran : le sien
    if (gele) drawGele();
  }
  function drawGele() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(4,6,20,0.6)'; ctx.fillRect(0, 0, W, H); big('PAUSE', H / 2 - 30 * U); big('Parle ' + (guideA || 'à ton guide') + ', ton jeu t’attend', H / 2 + 40 * U, 0.4); }
  function drawPause() { ctx.fillStyle = 'rgba(4,6,20,0.6)'; ctx.fillRect(0, 0, W, H); big('PAUSE', H / 2 - 30 * U); big('Touche pour reprendre', H / 2 + 40 * U, 0.4); }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try {
      if (gele) { draw(); return; }
      if (!paused) update(dt * FAST); else if (state === 'title' || state === 'load') stT += dt;
      if (state === 'title' || state === 'load') stT += paused ? 0 : 0;
      if ((state === 'title' || state === 'intro' || state === 'end' || state === 'carte') && pad && pad.pressed && pad.pressed('a')) {
        if (state === 'carte') partir(carteChoix()[carteSel]);
        else if (state === 'title' && (LOADED || loadErr)) startGame(); else if (state === 'intro' && stT > 0.6) { state = 'play'; stT = 0; } else if (state === 'end' && stT > (endWhy === 'oxy' ? 2.5 : 1.2)) startGame();
      }
      draw();
    } catch (e) { /* une image ratée ne doit pas arrêter le jeu */ }
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('message', onMsg);
      pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return state === 'title' || state === 'load' || state === 'intro' ? 0 : score(); },
    currentLevel() { return 1 + posees + visites.length; },
    pause() { if (state === 'play' || state === 'intro') setPaused(true); },
    resume() { setPaused(false); },
    // essais (harnais)
    _test: {
      state: () => state, oxy: () => oxy, score, fast(k) { FAST = k; }, setOxy(v) { oxy = v; },
      P: () => P, objs: () => objs, ecran: () => ({ x: sx(P.x), y: sy(P.y), z: Z }), robotEcran: () => ({ x: sx(robot.x), y: sy(robot.y) }), posees: () => posees, pieces: () => pieces,
      tp(x, y) { P.x = x; P.y = y; camX = x; camY = y - 40; }, meteor() { meteors.push({ x: P.x + 60, y: P.y, t: 0, d: 1.7, type: monde === 'lune' ? 'meteorite' : PLANETES[monde].danger }); },
      play() { if (state === 'title') startGame(); state = 'play'; stT = 0; },
      monde: () => monde, ship: () => ship, carte: () => ({ choix: carteChoix(), sel: carteSel, visites }), tresors: () => tresors,
      decoller() { posees = NB_PIECES; pieces = 0; state = 'liftoff'; liftT = 0; endWhy = 'win'; }, versCarte() { versCarte(); stT = 1; }, partir(k) { stT = 1; partir(k); },
      arriver(k) { arriverSur(k); }, trouver() { objs.filter(o => o.k === 'tresor').forEach(o => { o.x = P.x + 10; o.y = P.y; }); },
      carteXY: k => carteXY(k), bouton: () => carteBouton()
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.lune = {
  id: 'lune',
  title: 'Seul sur la Lune',
  tagline: 'Seul survivant : répare la navette avant de manquer d’oxygène !',
  accent: '#7fb6ff',
  scoreLabel: 'points',
  orientation: 'les2',   // vérifié en portrait (vue de dessus, joystick au doigt) et en paysage
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Marcher'], ['a', 'Commencer']], intro: false }
};
})();
