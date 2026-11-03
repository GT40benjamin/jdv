(() => {
'use strict';
// Seul sur la Lune — jeu né à l'Atelier des jeux (projet cc4d84c0, auteur PATOU), version alpha (2 nov. 2026).
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
const EMOJI = { oxygene: '🧯', cristal: '💎', piece: '⚙️', navette: '🚀', epave: '🛸', base: '🏠', trousse: '🧰', lampe: '🔦', meteorite: '☄️', astronaute: '👨‍🚀', robot1: '🤖' };
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
let SOL = null;
function solTile() {
  if (SOL) return SOL;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), r = rng(42);
  g.fillStyle = '#a9aaae'; g.fillRect(0, 0, N, N);
  const wrap = (f) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) f(dx, dy); };
  for (let i = 0; i < 70; i++) { const x = r() * N, y = r() * N, rr = 20 + r() * 70, l = r() < 0.5; wrap((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr); gr.addColorStop(0, l ? 'rgba(200,201,206,0.35)' : 'rgba(120,121,128,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rr, y + dy - rr, rr * 2, rr * 2); }); }
  for (let i = 0; i < 26; i++) { const x = r() * N, y = r() * N, rr = 4 + r() * 12; wrap((dx, dy) => { g.fillStyle = 'rgba(235,236,240,0.55)'; g.beginPath(); g.ellipse(x + dx, y + dy + 1, rr * 1.1, rr * 0.75, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(95,96,104,0.55)'; g.beginPath(); g.ellipse(x + dx, y + dy, rr, rr * 0.65, 0, 0, TAU); g.fill(); }); }
  for (let i = 0; i < 900; i++) { const x = r() * N, y = r() * N, s = 0.6 + r() * 2; g.fillStyle = r() < 0.5 ? 'rgba(80,82,90,0.5)' : 'rgba(225,226,230,0.5)'; g.fillRect(x, y, s, s); }
  SOL = c; return c;
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
  const keys = {};
  const joy = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };

  function newWorld() {
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
  function reset() {
    objs = []; craters = []; newWorld();
    P = { x: -200, y: 170, dir: 'face', v: 0, vx: 0, vy: 0, step: 0, flip: false, stun: 0, moving: false };
    robot = { x: -110, y: 190, joie: 0 };
    camX = P.x; camY = P.y - 40;
    oxy = 100; pieces = 0; cristaux = 0; posees = 0; lampe = false; trousses = 0; shake = 0; flash = 0; msg = null; texts = []; parts = []; meteors = []; impacts = []; puffs = []; flyers = []; prises = [];
    showerT = 24; showerOn = false; showerLeft = 0; tJeu = 0; endWhy = ''; baseUsed = false; crT = null; bonusFin = 0; liftT = 0; repT = 0;
  }
  reset();
  const liftW = () => { const e = Math.max(0, Math.min(state === 'liftoff' ? liftT : 5, 5) - 1.4); return e * e * 170; };   // hauteur de la navette au décollage
  const score = () => posees * VAL_PIECE + pieces * VAL_PIECE + cristaux * VAL_CRISTAL + bonusFin;
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
    if (state === 'play' && !joy.on) { joy.on = true; joy.id = e.pointerId; joy.x0 = joy.x = p.x; joy.y0 = joy.y = p.y; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
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
    if (k === 'p' || k === 'Escape') { if (state === 'play') setPaused(!paused); return; }
    if (paused) { setPaused(false); return; }
    if (k === 'Enter' || k === ' ') {
      if (state === 'title' && (LOADED || loadErr)) startGame();
      else if (state === 'intro' && stT > 0.6) { state = 'play'; stT = 0; }
      else if (state === 'end' && stT > (endWhy === 'oxy' ? 2.5 : 1.2)) startGame();
    }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function setPaused(v) { paused = v; pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; if (v) { joy.on = false; for (const k in keys) keys[k] = false; } }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (!gele && state === 'play') setPaused(!paused); }
  function onVis() { if (document.hidden && state === 'play') setPaused(true); }
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
      if (liftT > 5) { state = 'end'; stT = 0; }
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
    if (inCr && inCr !== crT) { crT = inCr; oxy -= 5; shake = 5; say('Tu glisses dans un cratère ! −5 % d’oxygène'); for (let i = 0; i < 4; i++) puffs.push({ x: P.x + (Math.random() - 0.5) * 40, y: P.y, t: -i * 0.1 }); }
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
      if (o.pris || !/^(piece|cristal|oxygene|trousse|lampe)$/.test(o.k)) continue;
      if (Math.hypot(o.x - P.x, (o.y - P.y) / 0.7) > 60) continue;
      o.pris = true; robot.joie = 1.2; prises.push({ k: o.k, x: o.x, y: o.y, h: o.h, t: 0 });
      son('ramasser', 1, { cristal: 1.15, piece: 0.8, oxygene: 0.95, trousse: 1, lampe: 1.05 }[o.k] * (0.97 + Math.random() * 0.06));
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
    // la navette : les pièces s'envolent dedans, puis on décolle
    if (Math.hypot(P.x, P.y / 0.7) < 230) {
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
    if (off('meteorite')) { showerOn = false; showerT = 30; }   // sans météorites : plus de pluie
    if (!showerOn && showerT < 3 && showerT + dt >= 3) { say('⚠️ Pluie de météorites ! Évite les ombres rouges !', 3); son('alerte'); }
    if (!showerOn && showerT <= 0) { showerOn = true; showerLeft = 6 + Math.min(8, Math.floor(tJeu / 40)); showerT = 0.2; }
    if (showerOn && showerT <= 0) {
      if (showerLeft-- > 0) {
        const lead = 1, mx = P.x + P.vx * lead + (Math.random() - 0.5) * 300, my = P.y + P.vy * lead + (Math.random() - 0.5) * 220;
        meteors.push({ x: mx, y: my, t: 0, d: 1.7 });
        showerT = 0.5 + Math.random() * 0.4;
      } else { showerOn = false; showerT = 20 + Math.random() * 12 - Math.min(8, tJeu / 30); }
    }
    for (const m of meteors) {
      m.t += dt;
      if (m.t >= m.d && !m.done) {
        m.done = true; shake = Math.max(shake, 9); impacts.push({ x: m.x, y: m.y, t: 0 });
        son('impact', Math.max(0.25, 1 - Math.hypot(m.x - P.x, m.y - P.y) / 700), 0.9 + Math.random() * 0.2);   // plus faible quand elle tombe loin
        if (!craters.some(c => Math.hypot(c.x - m.x, c.y - m.y) < c.r) && Math.hypot(m.x, m.y) > 200) craters.push({ x: m.x, y: m.y, r: 42, neuf: 1 });
        burst(m.x, m.y - 10, '#9a9ba2', 16, 220, 120);
        if (Math.hypot(m.x - P.x, (m.y - P.y) / 0.7) < 75) {
          if (trousses > 0) { trousses--; say('Ouf ! La trousse de secours t’a protégé.'); }
          else { oxy -= 18; P.stun = 1.1; shake = 18; say('Aïe ! Une météorite ! −18 % d’oxygène'); }
        }
      }
    }
    meteors = meteors.filter(m => !m.done);
    if (oxy <= 0) { oxy = 0; state = 'end'; stT = 0; endWhy = 'oxy'; P.stun = 99; }
  }
  function respawnOxy() {
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * TAU, d = 400 + Math.random() * 600, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
      if (Math.hypot(x, y) < R_MONDE - 60 && !craters.some(c => Math.hypot(c.x - x, c.y - y) < c.r + 40)) { objs.push({ k: 'oxygene', x, y, h: 70 }); return; }
    }
  }

  // ---------- dessin ----------
  function drawGround() {
    const t = solTile(), ts = 512 * Z;
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
      const gg = ctx.createLinearGradient(0, y - ry, 0, y + ry); gg.addColorStop(0, c.neuf ? '#4a3a32' : '#55575f'); gg.addColorStop(1, c.neuf ? '#7a6656' : '#9a9ca3');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y - ry * 0.25, rx * 0.85, ry * 0.55, 0, Math.PI, TAU); ctx.fill();
    }
    // la poussière des pas
    for (const p of puffs) { if (p.t < 0) continue; const k = p.t / 0.6; ctx.fillStyle = 'rgba(225,226,232,' + (0.7 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), (6 + k * 16) * Z, (3 + k * 7) * Z, 0, 0, TAU); ctx.fill(); }
    // l'ombre rouge des météorites qui arrivent
    for (const m of meteors) {
      const e = m.t / m.d, x = sx(m.x), y = sy(m.y), r = 70 * Z;
      ctx.fillStyle = 'rgba(255,50,30,' + (0.12 + e * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,60,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, r * (1.6 - e * 1.1), r * 0.6 * (1.6 - e * 1.1), 0, 0, TAU); ctx.stroke();
    }
  }
  // tous les objets debout, triés par leur pied (le plus haut à l'écran d'abord)
  function drawWorld() {
    const L = [];
    const parti = endWhy === 'win' && state === 'end';   // la navette est partie avec toi
    for (const o of objs) if (!(parti && o.k === 'navette')) L.push(o);
    if ((state !== 'liftoff' || liftT < 1.4) && !parti) L.push({ k: '_joueur', x: P.x, y: P.y });
    if ((state !== 'liftoff' || liftT < 1.4) && !parti) L.push({ k: '_robot', x: robot.x, y: robot.y });
    for (const im of impacts) L.push({ k: '_impact', x: im.x, y: im.y + 1, im });
    // règle stricte : le robot ne passe jamais devant toi (quand il est à ta hauteur, il est dessiné derrière) ; en vol, la navette passe au-dessus de tout
    const prof = o => o.k === 'navette' && state === 'liftoff' && liftT > 1.4 ? 1e9 : o.k === '_robot' && Math.abs(o.x - P.x) < 100 ? Math.min(o.y, P.y - 0.5) : o.y;
    L.sort((a, b) => prof(a) - prof(b));
    for (const o of L) {
      const x = sx(o.x), y = sy(o.y);
      if (x < -300 || x > W + 300 || y < -60 || y > H + 400) { if (!(o.k === 'navette' && state === 'liftoff')) continue; }   // la navette qui monte est dessinée plus haut que son pied au sol
      if (o.k === '_joueur') { drawPlayer(x, y); continue; }
      if (o.k === '_robot') { if (!off('robot')) drawRobot(x, y); continue; }
      if (o.k === '_impact') { drawImpact(x, y, o.im.t); continue; }
      const h = o.h * Z;
      ctx.fillStyle = 'rgba(30,32,40,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.42, h * 0.1, 0, 0, TAU); ctx.fill();
      const bob = /^(piece|cristal|oxygene|trousse|lampe)$/.test(o.k) ? (0.5 + 0.5 * Math.sin(stT * 3 + o.x)) * h * 0.12 : 0;
      if (o.k === 'piece') { ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(stT * 5); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y - h * 0.5 - bob, h * 0.75, 0, TAU); ctx.fill(); ctx.restore(); }
      if (o.k === 'oxygene') { ctx.save(); ctx.globalAlpha = 0.18 + 0.12 * Math.sin(stT * 4 + o.y); ctx.fillStyle = '#9dffbf'; ctx.beginPath(); ctx.arc(x, y - h * 0.5 - bob, h * 0.6, 0, TAU); ctx.fill(); ctx.restore(); }
      if (o.k === 'navette') { drawNavette(x, y, h); continue; }
      drawFoot(ctx, o.k, x, y - bob, h);
      if (o.k === 'cristal') { ctx.fillStyle = '#e8fbff'; for (let i = 0; i < 2; i++) { const t = (stT * 0.9 + i * 0.5 + (o.x % 7) * 0.13) % 1, s = Math.sin(t * Math.PI) * 7 * Z; if (s > 0.5) star(ctx, x + Math.cos(i * 2.4 + o.y) * h * 0.3, y - bob - h * (0.3 + 0.5 * ((i + o.x) % 3) / 3), s, t * 3); } }
      if (o.fume) smoke(x - h * 0.18, y - h * 0.75, h);
      if (o.k === 'base' && !baseUsed) label('O₂', x, y - h - 6 * Z, '#b8ffcf');
    }
  }
  function drawNavette(x, y, h) {
    let lift = 0;
    if (state === 'liftoff') lift = liftW() * Z;
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
    drawFoot(ctx, 'navette', x + wob, y - lift, h);
    // les étincelles de la réparation
    if (repT > 0) { ctx.fillStyle = '#fff3a0'; for (let i = 0; i < 5; i++) star(ctx, x + Math.sin(stT * 13 + i * 2) * h * 0.35, y - h * (0.3 + 0.1 * Math.cos(stT * 9 + i)), (4 + 3 * Math.sin(stT * 20 + i)) * Z, stT * 6 + i); }
    if (state !== 'liftoff') {
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
  function drawImpact(x, y, t) {
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
    if (pieces > 0 || posees + pieces >= NB_PIECES) return { x: 0, y: 0, k: 'navette' };
    let best = null, bd = 1e9;
    for (const o of objs) if (o.k === 'piece') { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; best = o; } }
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
    drawFoot(ctx, 'piece', x + 22 * U, y2 + 30 * U, ic * 0.9);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = '#ffd36b'; ctx.fillText((posees + pieces) + '/' + NB_PIECES, x + 40 * U, y2 + 18 * U);
    if (!off('cristal')) { drawFoot(ctx, 'cristal', x + 110 * U, y2 + 30 * U, ic); ctx.fillStyle = '#7fe3ff'; ctx.fillText('' + cristaux, x + 126 * U, y2 + 18 * U); }
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
        const s = (t.k === 'navette' ? 'Navette ' : 'Pièce ') + d + ' m', lx = ex - Math.cos(a) * 34 * U, ly = ey - Math.sin(a) * 26 * U;
        ctx.strokeText(s, lx, ly); ctx.fillStyle = '#fff'; ctx.fillText(s, lx, ly);
      }
    }
    // le radar : la lampe double sa portée
    const rr = 54 * U, rcx = W - rr - 12 * U, rcy = H - rr - 12 * U, rng2 = lampe ? 1400 : 700;
    ctx.fillStyle = 'rgba(10,14,26,0.6)'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.clip();
    const dot = (wx, wy, col, r, toujours) => { const k = rr / rng2; let px = (wx - P.x) * k, py = (wy - P.y) * k; const l = Math.hypot(px, py); if (l > rr - 3) { if (!toujours) return; px *= (rr - 3) / l; py *= (rr - 3) / l; } ctx.fillStyle = col; ctx.beginPath(); ctx.arc(rcx + px, rcy + py, r * U, 0, TAU); ctx.fill(); };
    for (const o of objs) { const col = { piece: '#ffd36b', cristal: '#7fe3ff', oxygene: '#5fe08a', trousse: '#ff9c9c', lampe: '#fff2a0', base: '#c9b6ff', navette: '#fff' }[o.k]; if (col) dot(o.x, o.y, col, o.k === 'navette' || o.k === 'piece' ? 3.5 : 2.2, o.k === 'navette' || o.k === 'piece'); }
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
    const gy = H * (portrait ? 0.6 : 0.74);
    if (!off('epave')) { drawFoot(ctx, 'epave', W * 0.18, gy + 10 * U, 150 * U); smoke(W * 0.18 - 25 * U, gy - 100 * U, 150 * U); }
    drawFoot(ctx, 'navette', W * 0.82, gy + 20 * U, 140 * U);
    drawFoot(ctx, 'face' + (1 + Math.floor(stT * 6) % 4), W * 0.47, gy + 40 * U, 200 * U);
    if (!off('robot')) drawFoot(ctx, Math.floor(stT * 5) % 2 ? 'robot1' : 'robot2', W * 0.47 + 120 * U, gy + 40 * U, 90 * U);
    big('SEUL SUR LA LUNE', H * 0.12, 1, '#e8eeff');
    // les lignes des éléments que le joueur a coupés disparaissent
    const lines = [off('robot') ? '🧭 Explore la Lune : la flèche montre le chemin' : '🧭 Explore la Lune : ton robot montre le chemin', '⚙️ Trouve les 5 pièces et ramène-les à la navette', off('oxygene') ? '🫧 Ton oxygène baisse : fais vite !' : '🫧 Ramasse l’oxygène : il baisse sans arrêt !', off('cristal') ? null : '💎 Les cristaux, c’est ton trésor', off('meteorite') ? null : '☄️ Fuis les ombres rouges des météorites'].filter(Boolean);
    const cw = Math.min(W - 24, 560 * U), lh = 30 * U, chh = lines.length * lh + 22 * U, cx = (W - cw) / 2, cy = portrait ? H * 0.66 : H * 0.2;
    pill(ctx, cx, cy, cw, chh, 18 * U); ctx.fillStyle = 'rgba(10,14,30,0.72)'; ctx.fill();
    ctx.font = 'bold ' + Math.round(18 * U) + 'px ' + RF; ctx.fillStyle = '#e8eeff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, cx + 18 * U, cy + 11 * U + lh * (i + 0.5), cw - 30 * U));
    const bw = 260 * U, bh = 66 * U, by = cy + chh + 16 * U, k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(k, k);
    pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#7fb6ff'); g.addColorStop(1, '#3b6fd8'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF; ctx.textAlign = 'center';
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    ctx.font = Math.round(14 * U) + 'px ' + RF; ctx.fillStyle = 'rgba(230,236,255,0.85)'; ctx.textAlign = 'center'; ctx.fillText('Créé avec l’aide de l’IA', W / 2, H - 16 * U);
    if (loadErr) { ctx.fillStyle = '#ff9c9c'; ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', W / 2, H - 40 * U, W - 30); }
  }
  function drawIntro() {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0.5, 1 - stT * 0.5) + ')'; ctx.fillRect(0, 0, W, H);
    const lines = ['Ton vaisseau a percuté un astéroïde…', 'Tu es le seul survivant.', 'Répare la navette de secours', 'et rentre sur Terre !'];
    lines.forEach((l, i) => { ctx.globalAlpha = Math.max(0, Math.min(1, stT * 1.5 - i * 0.6)); big(l, H * 0.28 + i * 52 * U, 0.55, i >= 2 ? '#ffd36b' : '#fff'); });
    ctx.globalAlpha = Math.max(0, Math.min(1, stT - 2)) * (0.6 + 0.4 * Math.sin(stT * 4));
    big(joyHint(), H * 0.28 + 4.6 * 52 * U, 0.42, '#bcd0ff'); ctx.globalAlpha = 1;
  }
  const joyHint = () => { try { return matchMedia('(pointer: coarse)').matches ? 'Glisse ton doigt pour marcher · touche pour commencer' : 'Flèches pour marcher · Entrée pour commencer'; } catch (e) { return 'Touche pour commencer'; } };
  function againBtn() { const bw = 260 * U, bh = 62 * U; return { x: (W - bw) / 2, y: H * 0.72, w: bw, h: bh }; }
  function drawEnd() {
    // défaite : on voit d'abord le survivant s'effondrer (1,3 s), puis l'écran s'assombrit et le résultat arrive
    const t0 = endWhy === 'oxy' ? 1.3 : 0, e = stT - t0;
    ctx.fillStyle = 'rgba(4,6,14,' + Math.max(0, Math.min(0.75, endWhy === 'oxy' ? stT * 0.25 + Math.max(0, e) * 0.6 : stT)) + ')'; ctx.fillRect(0, 0, W, H);
    if (e < 0) return;
    ctx.globalAlpha = Math.min(1, e * 2.5);
    if (endWhy === 'win') { big('Retour vers la Terre !', H * 0.22, 0.8, '#ffd36b'); big('Tu as décollé avec ' + Math.ceil(oxy) + ' % d’oxygène', H * 0.33, 0.55); }
    else { big('Plus d’oxygène…', H * 0.22, 0.8, '#ff9c9c'); big('La navette était réparée à ' + posees + ' / ' + NB_PIECES, H * 0.33, 0.55); }
    big((off('cristal') ? '' : cristaux + ' cristaux · ') + (posees + pieces) + ' pièces', H * 0.43, 0.55, '#7fe3ff');
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
    ctx.setTransform(dpr, 0, 0, dpr, dpr * kx, dpr * ky);
    drawGround(); drawWorld(); drawFlyers(); drawFalling(); drawFx();
    if (state === 'liftoff') big('Décollage !', H * 0.2, 0.9, '#ffd36b');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state === 'play' || state === 'liftoff') drawHud();
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
      if ((state === 'title' || state === 'intro' || state === 'end') && pad && pad.pressed && pad.pressed('a')) {
        if (state === 'title' && (LOADED || loadErr)) startGame(); else if (state === 'intro' && stT > 0.6) { state = 'play'; stT = 0; } else if (state === 'end' && stT > (endWhy === 'oxy' ? 2.5 : 1.2)) startGame();
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
    currentScore() { return state === 'play' || state === 'liftoff' || state === 'end' ? score() : 0; },
    currentLevel() { return 1 + posees; },
    pause() { if (state === 'play' || state === 'intro') setPaused(true); },
    resume() { setPaused(false); },
    // essais (harnais)
    _test: {
      state: () => state, oxy: () => oxy, score, fast(k) { FAST = k; }, setOxy(v) { oxy = v; },
      P: () => P, objs: () => objs, ecran: () => ({ x: sx(P.x), y: sy(P.y), z: Z }), robotEcran: () => ({ x: sx(robot.x), y: sy(robot.y) }), posees: () => posees, pieces: () => pieces,
      tp(x, y) { P.x = x; P.y = y; camX = x; camY = y - 40; }, meteor() { meteors.push({ x: P.x + 60, y: P.y, t: 0, d: 1.7 }); },
      play() { if (state === 'title') startGame(); state = 'play'; stT = 0; }
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
