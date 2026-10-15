(() => {
  'use strict';

  // ===========================================================================
  // Galaxy Wars (id technique « ilo ») — shoot'em up vertical à défilement.
  // Le Vaisseau Noir fonce à travers les secteurs d'ILO : vagues d'ennemis,
  // événements (astéroïdes, mines, tempête, zone sombre, lasers, trou noir),
  // mini-boss puis boss planétaire, saut hyperespace, cycles sans fin.
  // Une seule vie, bouclier de 3 cellules, jauge HYPER, combo jusqu'à x8.
  // ===========================================================================

  const LW = 360;                 // largeur logique de l'aire de jeu (la hauteur s'adapte)
  const TAU = Math.PI * 2;
  const ACCENT = '#38e1ff';
  const MAXEB = 360, MAXPS = 260, MAXPT = 500, MAXSH = 220, MAXTX = 28, MAXEN = 110, MAXMS = 28, MAXRG = 18, MAXCP = 12, MAXLT = 18;

  // ----------------------------------------------------------------- outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const chance = (p) => Math.random() < p;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const hsl = (h, s, l, a) => 'hsla(' + Math.round(((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')';
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  // générateur à graine (api.seed) — mulberry32 standard
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function fmt(n) {
    let s = String(Math.max(0, Math.floor(n))), out = '';
    while (s.length > 3) { out = ' ' + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  function segDist2(px, py, x0, y0, x1, y1) {        // distance² d'un point à un segment
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
    let k = l2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    const ex = x0 + dx * k - px, ey = y0 + dy * k - py;
    return ex * ex + ey * ey;
  }

  // ----------------------------------------------------------------- données
  // Secteurs : nom, teinte de la nébuleuse, couleurs, planètes d'ILO (index 0..31), événement, boss
  const SECTORS = [
    { name: "Ceinture d'Ilo", hue: 196, sat: 80, bg0: '#020812', bg1: '#06243a', star: '#cdefff', acc: '#38e1ff', neb: 0, planets: [10, 11, 1, 13, 3], land: 10,
      event: null, news: 'Pilote, le Vaisseau Noir est à toi !', boss: 'planete' },
    { name: 'Nébuleuse Ambre', hue: 28, sat: 85, bg0: '#0d0602', bg1: '#2e1404', star: '#ffe6c4', acc: '#ffa630', neb: 1, planets: [4, 0, 20, 29, 30], land: 29,
      event: 'rocks', news: 'Nouveau : astéroïdes et frégates', boss: 'vela' },
    { name: 'Champ de Kepra', hue: 148, sat: 75, bg0: '#020c06', bg1: '#06301c', star: '#d4ffe6', acc: '#46f08a', neb: 2, planets: [6, 8, 7, 2], land: 6,
      event: 'mines', news: 'Nouveau : poseurs de mines', boss: 'ver' },
    { name: 'Tempête Ionique', hue: 262, sat: 80, bg0: '#07031a', bg1: '#1d0b45', star: '#e6dcff', acc: '#a77bff', neb: 3, planets: [9, 31, 17, 28], land: 31,
      event: 'storm', news: 'Nouveau : sentinelles laser', boss: 'reine' },
    { name: "Abysse d'Obsidienne", hue: 222, sat: 55, bg0: '#010205', bg1: '#060b1c', star: '#b8c8ff', acc: '#7fa8ff', neb: 0, planets: [12, 21, 7, 23], land: 12,
      event: 'dark', news: 'Nouveau : éclaireurs furtifs', boss: 'gaia' },
    { name: 'Couloir Écarlate', hue: 350, sat: 85, bg0: '#0e0206', bg1: '#330818', star: '#ffd6e2', acc: '#ff4d6d', neb: 1, planets: [15, 14, 26, 19, 5], land: 15,
      event: 'lasers', news: 'Nouveau : croiseurs à bouclier', boss: 'jumelles' },
    { name: "Gouffre d'Ophis", hue: 292, sat: 75, bg0: '#08020c', bg1: '#25062e', star: '#f6d8ff', acc: '#ff5fd2', neb: 2, planets: [27, 30, 18, 24], land: 27,
      event: 'hole', news: 'Attention : trou noir !', boss: 'oeil' },
    { name: "Cœur d'ILO", hue: 46, sat: 90, bg0: '#0c0802', bg1: '#2c2108', star: '#fff6d8', acc: '#ffd34d', neb: 3, planets: [16, 25, 18, 3, 20], land: 25,
      event: 'mix', news: 'Tout à la fois… courage !', boss: 'blanc' }
  ];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const BOSS_NAMES = {
    planete: 'LA PLANÈTE VIVANTE', vela: 'CROISEUR VELA', ver: "VER DE L'HYPERESPACE", reine: "REINE DE L'ESSAIM",
    gaia: 'STATION GAÏA', jumelles: 'LES JUMELLES', oeil: "L'ŒIL DU GOUFFRE", blanc: 'LE VAISSEAU BLANC'
  };
  const MINI_NAMES = ['LE GARDIEN', 'LE BÉLIER AMBRE', 'LA MÈRE-MINE', 'LE PARATONNERRE', 'LE SPECTRE', 'LA HERSE ÉCARLATE', 'LE PÈLERIN NOIR', "LE HÉRAUT D'ILO"];
  const EVENT_NAMES = { rocks: "PLUIE D'ASTÉROÏDES !", mines: 'CHAMP DE MINES !', storm: 'TEMPÊTE IONIQUE !', dark: 'ZONE SOMBRE !', lasers: 'COULOIR DE LASERS !', hole: 'TROU NOIR !' };
  const EVENT_TIPS = { rocks: 'Certains cachent des bonus', mines: 'Tire-les avant qu’elles éclatent', storm: 'Évite les colonnes qui clignotent', dark: 'Ton vaisseau éclaire le chemin',
    lasers: 'Passe par les ouvertures', hole: 'Il attire tout… même toi !' };

  // ennemis : points de vie, rayon de collision, points, jauge hyper, éclats
  const ET = {
    swarm: { hp: 2, r: 11, pts: 100, hyp: 0.022, sh: 2 },
    dart: { hp: 3, r: 10, pts: 150, hyp: 0.028, sh: 2 },
    carrier: { hp: 7, r: 15, pts: 300, hyp: 0.04, sh: 4 },
    frigate: { hp: 42, r: 22, pts: 600, hyp: 0.07, sh: 6 },
    rockL: { hp: 24, r: 26, pts: 300, hyp: 0.03, sh: 3 },
    rockM: { hp: 9, r: 16, pts: 150, hyp: 0.02, sh: 2 },
    rockS: { hp: 3, r: 9, pts: 60, hyp: 0.01, sh: 1 },
    miner: { hp: 45, r: 19, pts: 700, hyp: 0.07, sh: 6 },
    mine: { hp: 3, r: 9, pts: 50, hyp: 0.008, sh: 1 },
    sentinel: { hp: 50, r: 17, pts: 800, hyp: 0.08, sh: 6 },
    snakeH: { hp: 36, r: 15, pts: 1500, hyp: 0.1, sh: 8 },
    snakeB: { hp: 7, r: 10, pts: 120, hyp: 0.015, sh: 1 },
    cruiser: { hp: 100, r: 27, pts: 1600, hyp: 0.12, sh: 10 },
    stealth: { hp: 9, r: 13, pts: 500, hyp: 0.05, sh: 4 },
    weaver: { hp: 60, r: 17, pts: 900, hyp: 0.08, sh: 7 },
    elite: { hp: 90, r: 25, pts: 2000, hyp: 0.14, sh: 12 },
    drone: { hp: 3, r: 8, pts: 80, hyp: 0.012, sh: 1 },
    gardien: { hp: 240, r: 40, pts: 8000, hyp: 0.3, sh: 30 }
  };
  // capsules de bonus
  const CAPS = {
    P: { col: '#38e1ff', name: 'PUISSANCE' }, M: { col: '#ff9a1f', name: 'MISSILES' }, O: { col: '#b37bff', name: 'DRONE' },
    S: { col: '#46f08a', name: 'BOUCLIER' }, B: { col: '#ff4d6d', name: 'BOMBE' }, A: { col: '#ffd34d', name: 'AIMANT' }
  };
  // boss : les coups portés remplissent la jauge HYPER (pleine tous les HYB des points de vie du boss, hors HYPER en cours)
  const HYB = 0.35;
  // Croiseur Vela : points faibles qui encaissent plus (tourelles ; cœur une fois ouvert), chaque nouvelle phase lâche une capsule ;
  // en échange, plus de blindage (tourelles, cœur) : avec l'HYPER et les capsules le combat dure ~1 min au lieu de 2 à 5, sans fin à 1 de puissance
  const VELA_WEAK_T = 1.15, VELA_WEAK_C = 1.3, VELA_HP_T = 2.2, VELA_HP_C = 1.3;
  // couleurs des balles ennemies : [teinte, cœur clair]
  const BCOL = { p: ['#ff3d9a', '#ffd3ea'], o: ['#ff8a1f', '#ffe3c0'], v: ['#a45cff', '#eadcff'], g: ['#2ff07a', '#d6ffe4'], r: ['#ff3b3b', '#ffd8d8'], y: ['#ffd21f', '#fff7c8'] };
  const BKEYS = ['p', 'o', 'v', 'g', 'r', 'y'];

  const CHEERS = ['Secteur nettoyé, pilote de légende !', 'Les planètes t’applaudissent !', 'Même ILO est jaloux !', 'Bravo, as du Vaisseau Noir !',
    'Hyperespace bien mérité !', 'Tu brilles plus qu’une étoile !', 'La galaxie te dit merci !', 'Quel pilotage, chapeau !',
    'Les aliens prennent des notes !', 'Talent à la vitesse lumière !', 'Encore un secteur libéré !', 'Champion intergalactique !',
    'Les étoiles font la ola !', 'Pilote cinq étoiles !'];
  const OH = (n) => pick(['Oh ! C’est ' + n + ' !', 'Oh ! C’est ' + n + ' !', n + ' aux commandes !', 'Tiens, voilà ' + n + ' !']);
  const SNIF = (n) => pick(['Snif…', n + ' pleure !', 'Pauvre ' + n + ' !', 'Snif… ' + n + ' boude !']);

  // palettes du vaisseau (noir = joueur, blanc = boss final)
  const PAL_NOIR = { h0: '#06080b', h1: '#2a313a', h2: '#56616f', neon: '#38e1ff', neon2: '#d6fbff', glass0: '#03101a', glass1: '#2aa6e0', wing0: '#0b0f14', wing1: '#28303a' };
  const PAL_BLANC = { h0: '#8d96a8', h1: '#dfe5ef', h2: '#ffffff', neon: '#ff3fb4', neon2: '#ffd6f0', glass0: '#2a0620', glass1: '#ff6fd0', wing0: '#a5aec0', wing1: '#f2f5fb' };

  // ----------------------------------------------------------------- peinture : outils
  function poly(c, p) {
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, st) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]);
    return g;
  }
  function rad(c, x0, y0, r0, x1, y1, r1, st) {
    const g = c.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.01, r1));
    for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]);
    return g;
  }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function rrect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  // lueur additive (taille fixe 64 px, indépendante de la résolution)
  function mkGlow(col, hard) {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, hard
      ? [0, 'rgba(255,255,255,1)', 0.25, hexA(col, 1), 0.55, hexA(col, 0.35), 1, hexA(col, 0)]
      : [0, 'rgba(255,255,255,0.9)', 0.12, hexA(col, 0.85), 0.4, hexA(col, 0.3), 1, hexA(col, 0)]);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkFire() {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(255,250,230,1)', 0.18, 'rgba(255,214,110,0.95)', 0.42, 'rgba(255,120,30,0.6)', 0.72, 'rgba(170,30,30,0.22)', 1, 'rgba(90,10,20,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkSmoke() {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(46,40,54,0.6)', 0.5, 'rgba(32,28,40,0.35)', 1, 'rgba(20,16,26,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }

  // ----------------------------------------------------------------- peinture : le Vaisseau Noir
  // pointe vers le haut ; bank ∈ [-1, 1] (roulis quand il se déplace)
  function paintShip(c, bank, P) {
    const b = clamp(bank, -1, 1), ab = Math.abs(b);
    const sq = 1 - 0.08 * ab;
    const wl = (1 - 0.46 * Math.max(0, -b)) * sq, wr = (1 - 0.46 * Math.max(0, b)) * sq;
    const fx = b * 1.5;
    c.lineJoin = 'round'; c.lineCap = 'round';
    // stabilisateurs arrière
    for (let s = -1; s <= 1; s += 2) {
      const k = s < 0 ? wl : wr;
      poly(c, [fx + s * 4, 8, fx + s * 12.5 * k, 17, fx + s * 11.5 * k, 20.5, fx + s * 4, 17]);
      c.fillStyle = P.wing0; c.fill();
      c.strokeStyle = hexA(P.neon, 0.55); c.lineWidth = 0.7; c.stroke();
    }
    // ailes principales
    for (let s = -1; s <= 1; s += 2) {
      const k = s < 0 ? wl : wr, lit = s * b < -0.05;
      const tx = fx + s * 21.5 * k;
      poly(c, [fx + s * 4.5, -8, tx, 7.5, tx - s * 1.4, 13.5, fx + s * 5.5, 11]);
      c.fillStyle = lin(c, fx, 0, tx, 0, [0, P.wing0, 0.55, P.wing1, 1, lit ? P.h2 : P.wing1]);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 0.8; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.09)'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(fx + s * 7, 3.5); c.lineTo(fx + s * 15 * k, 10.5); c.moveTo(fx + s * 6, 8); c.lineTo(fx + s * 11 * k, 11.5); c.stroke();
      c.strokeStyle = P.neon; c.lineWidth = 1.35;
      c.beginPath(); c.moveTo(fx + s * 6, -5); c.lineTo(tx - s * 0.5, 7.8); c.stroke();
      c.fillStyle = P.neon2; circ(c, tx - s * 0.7, 10.4, 1.15); c.fill();
    }
    // fuselage
    poly(c, [fx, -26, fx + 3.4, -17, fx + 5.6, -4, fx + 6.3, 9, fx + 4.7, 17.5, fx - 4.7, 17.5, fx - 6.3, 9, fx - 5.6, -4, fx - 3.4, -17]);
    const hl = clamp(0.5 - b * 0.26, 0.26, 0.74);
    c.fillStyle = lin(c, fx - 6.3, 0, fx + 6.3, 0, [0, P.h0, hl - 0.22, P.h1, hl, P.h2, hl + 0.22, P.h1, 1, P.h0]);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 0.9; c.stroke();
    c.strokeStyle = P.neon; c.lineWidth = 1.05;
    c.beginPath(); c.moveTo(fx - 4.5, -2); c.lineTo(fx - 5.2, 11.5); c.moveTo(fx + 4.5, -2); c.lineTo(fx + 5.2, 11.5); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(fx, -23.5); c.lineTo(fx, -16.5); c.moveTo(fx, 0.5); c.lineTo(fx, 15); c.stroke();
    // prises d'air
    c.fillStyle = '#020305';
    poly(c, [fx - 5.4, -1, fx - 3.2, -3, fx - 3.2, 3, fx - 5.6, 4]); c.fill();
    poly(c, [fx + 5.4, -1, fx + 3.2, -3, fx + 3.2, 3, fx + 5.6, 4]); c.fill();
    // cockpit
    ell(c, fx, -9.5, 2.9, 6.8);
    c.fillStyle = lin(c, fx, -16, fx, -3, [0, P.glass1, 0.42, P.glass0, 1, '#000']);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 0.7; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; ell(c, fx - 0.9 - b * 0.7, -12, 0.75, 2.4); c.fill();
    // tuyères
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = '#030406'; rrect(c, fx + s * 3 - 1.9, 14.6, 3.8, 3.6, 1); c.fill();
      c.fillStyle = P.neon2; c.fillRect(fx + s * 3 - 1.1, 16.4, 2.2, 1.5);
    }
  }

  // ----------------------------------------------------------------- peinture : tirs
  function paintOrb(c, r, col, light) {
    c.fillStyle = rad(c, 0, 0, r * 0.5, 0, 0, r * 2, [0, hexA(col, 0.6), 1, hexA(col, 0)]);
    circ(c, 0, 0, r * 2); c.fill();
    circ(c, 0, 0, r + 1.1); c.fillStyle = 'rgba(18,0,22,0.95)'; c.fill();
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.2, -r * 0.25, 0, 0, 0, r, [0, '#ffffff', 0.42, light, 0.72, col, 1, col]);
    c.fill();
  }
  function paintNeedle(c, col, light) {          // aiguille : pointe vers +y
    c.fillStyle = rad(c, 0, 0, 1, 0, 0, 11, [0, hexA(col, 0.5), 1, hexA(col, 0)]);
    ell(c, 0, 0, 6, 11); c.fill();
    poly(c, [0, 10.5, 3.6, 0, 0, -9.5, -3.6, 0]); c.fillStyle = 'rgba(18,0,22,0.95)'; c.fill();
    poly(c, [0, 8.6, 2.4, 0, 0, -7.6, -2.4, 0]); c.fillStyle = lin(c, 0, -8, 0, 8, [0, col, 0.5, light, 1, '#ffffff']); c.fill();
  }
  function paintRice(c, col, light) {
    c.fillStyle = rad(c, 0, 0, 1, 0, 0, 10, [0, hexA(col, 0.5), 1, hexA(col, 0)]);
    ell(c, 0, 0, 7, 10); c.fill();
    ell(c, 0, 0, 3.9, 6.6); c.fillStyle = 'rgba(18,0,22,0.95)'; c.fill();
    ell(c, 0, 0, 2.8, 5.4); c.fillStyle = rad(c, 0, 1, 0, 0, 0, 5.4, [0, '#fff', 0.5, light, 1, col]); c.fill();
  }
  // tirs du joueur (dessinés en mode additif)
  function paintBolt(c, w, h, col, core) {
    c.fillStyle = rad(c, 0, -h * 0.1, 0, 0, 0, h * 0.5, [0, hexA(col, 0.55), 1, hexA(col, 0)]);
    ell(c, 0, 0, w * 1.4, h * 0.5); c.fill();
    c.fillStyle = lin(c, 0, -h / 2, 0, h / 2, [0, core, 0.35, core, 0.75, col, 1, hexA(col, 0)]);
    ell(c, 0, 0, w * 0.5, h * 0.46); c.fill();
  }
  function paintMissile(c) {
    c.fillStyle = '#c9d2dc'; rrect(c, -1.8, -5.5, 3.6, 10, 1.5); c.fill();
    c.fillStyle = '#ff9a1f'; poly(c, [-1.8, -5.5, 0, -8.5, 1.8, -5.5]); c.fill();
    c.fillStyle = '#56606c'; poly(c, [-1.8, 2, -4, 5, -1.8, 4.5]); c.fill(); poly(c, [1.8, 2, 4, 5, 1.8, 4.5]); c.fill();
  }
  function paintShard(c) {
    c.fillStyle = rad(c, 0, 0, 0, 0, 0, 6, [0, 'rgba(120,255,240,0.55)', 1, 'rgba(60,220,255,0)']);
    circ(c, 0, 0, 6); c.fill();
    poly(c, [0, -4.6, 3, 0, 0, 4.6, -3, 0]);
    c.fillStyle = lin(c, -3, -4, 3, 4, [0, '#ffffff', 0.45, '#7ffcef', 1, '#1a9fd0']); c.fill();
    c.strokeStyle = 'rgba(0,40,60,0.8)'; c.lineWidth = 0.6; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)'; poly(c, [0, -4.6, 1, -0.6, 0, 0, -1.2, -0.4]); c.fill();
  }
  function paintCap(c, kind, font) {
    const col = CAPS[kind].col;
    const hex = (r) => { const p = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; p.push(Math.cos(a) * r, Math.sin(a) * r); } return p; };
    c.fillStyle = rad(c, 0, 0, 4, 0, 0, 15, [0, hexA(col, 0.5), 1, hexA(col, 0)]);
    circ(c, 0, 0, 15); c.fill();
    poly(c, hex(11.5)); c.fillStyle = '#05080c'; c.fill();
    poly(c, hex(10)); c.fillStyle = lin(c, 0, -10, 0, 10, [0, '#ffffff', 0.25, col, 1, hexA(col, 0.55)]); c.fill();
    poly(c, hex(7.4)); c.fillStyle = 'rgba(5,10,16,0.82)'; c.fill();
    c.font = '10px ' + font; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ffffff'; c.fillText(kind, 0, 0.8);
  }
  function paintDebris(c, v) {
    const p = v === 0 ? [-3, -2, 3, -1.5, 2, 2, -2.5, 1.5] : v === 1 ? [-2, -3, 2.5, -1, 1, 3, -2, 1] : v === 2 ? [-3.5, -1, 0, -2.5, 3.5, 0, 0, 2] : [-1.5, -3, 2, -2, 1.5, 3, -2.5, 2];
    poly(c, p); c.fillStyle = '#3a3f48'; c.fill();
    c.strokeStyle = v & 1 ? '#ffb347' : '#ff7a2f'; c.lineWidth = 0.8; c.stroke();
  }

  // ----------------------------------------------------------------- peinture : ennemis (pointent vers le bas, vers le joueur)
  function paintSwarm(c) {                       // « guêpe » des essaims
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath();
      c.moveTo(s * 3, -4);
      c.quadraticCurveTo(s * 16, -13, s * 14.5, 2.5);
      c.quadraticCurveTo(s * 9, 0.5, s * 3, 4.5);
      c.closePath();
      c.fillStyle = lin(c, 0, -10, s * 14, 2, [0, 'rgba(110,50,230,0.95)', 1, 'rgba(255,61,154,0.9)']);
      c.fill();
      c.strokeStyle = 'rgba(255,205,240,0.85)'; c.lineWidth = 0.8; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.5;
      c.beginPath(); c.moveTo(s * 4, -1); c.quadraticCurveTo(s * 10, -6, s * 13, 0); c.stroke();
    }
    ell(c, 0, 0, 5.3, 9.6);
    c.fillStyle = lin(c, -5, 0, 5, 0, [0, '#1a0930', 0.5, '#5e2ca8', 1, '#1a0930']);
    c.fill(); c.strokeStyle = '#08030f'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(255,61,154,0.6)'; c.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) { const yy = -5.5 + k * 3.4; c.beginPath(); c.moveTo(-4.6, yy); c.quadraticCurveTo(0, yy + 1.6, 4.6, yy); c.stroke(); }
    circ(c, 0, 6.6, 3.1);
    c.fillStyle = rad(c, 0, 6.6, 0, 0, 6.6, 3.1, [0, '#ffffff', 0.35, '#ffd0e8', 0.62, '#ff3d9a', 1, '#6a0038']); c.fill();
  }
  function paintDart(c) {                        // kamikaze
    poly(c, [0, 15.5, 9.5, -9, 3.5, -5, 0, -12.5, -3.5, -5, -9.5, -9]);
    c.fillStyle = lin(c, -9, 0, 9, 0, [0, '#4a060e', 0.5, '#ff4646', 1, '#4a060e']); c.fill();
    c.strokeStyle = '#160003'; c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = '#ffd21f'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-6.2, -6.6); c.lineTo(0, 9.5); c.lineTo(6.2, -6.6); c.stroke();
    ell(c, 0, 0.5, 1.9, 4.2); c.fillStyle = '#fff1b8'; c.fill();
    c.fillStyle = '#1a0004'; c.fillRect(-2.2, -12, 4.4, 2.5);
  }
  function paintCarrier(c) {                     // porteur de capsule (le conteneur lumineux est animé en direct)
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * 6, -9, s * 17, -3, s * 16, 7, s * 6, 4]);
      c.fillStyle = lin(c, 0, 0, s * 17, 0, [0, '#1d2b39', 1, '#5f7c96']); c.fill();
      c.strokeStyle = '#081018'; c.lineWidth = 0.9; c.stroke();
      c.fillStyle = '#ffd34d'; circ(c, s * 15, 4.5, 1.2); c.fill();
    }
    ell(c, 0, 0, 9.5, 14);
    c.fillStyle = lin(c, -9, 0, 9, 0, [0, '#16212c', 0.5, '#6a8aa6', 1, '#16212c']); c.fill();
    c.strokeStyle = '#081018'; c.lineWidth = 1; c.stroke();
    rrect(c, -5.5, -7, 11, 13, 3.5); c.fillStyle = '#1c1203'; c.fill();
    c.strokeStyle = '#ffd34d'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#7a8fa3'; c.fillRect(-3, 10, 6, 2.2);
  }
  function paintFrigate(c) {                     // coque de frégate (la tourelle tourne à part)
    poly(c, [0, 25, 14, 15, 22.5, -3, 16.5, -20.5, -16.5, -20.5, -22.5, -3, -14, 15]);
    c.fillStyle = lin(c, -22, 0, 22, 0, [0, '#1f1930', 0.5, '#5d5180', 1, '#1f1930']); c.fill();
    c.strokeStyle = '#0b0814'; c.lineWidth = 1.3; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(-15, -12); c.lineTo(15, -12); c.moveTo(-18, 2); c.lineTo(18, 2); c.moveTo(-10, 13); c.lineTo(10, 13); c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = '#100c1a'; rrect(c, s * 10 - 3.5, -24, 7, 6, 1.5); c.fill();
      c.fillStyle = '#ff9a1f'; c.fillRect(s * 10 - 2, -23.5, 4, 1.6);
      c.fillStyle = '#ffb347'; circ(c, s * 19, -3, 1.4); c.fill(); circ(c, s * 11, 13, 1.2); c.fill();
    }
    circ(c, 0, 0, 8.5); c.fillStyle = '#17112a'; c.fill();
    c.strokeStyle = '#ff9a1f'; c.lineWidth = 0.9; c.stroke();
  }
  function paintTurret(c, col) {                 // canon pointé vers +y
    rrect(c, -2.6, 1.5, 5.2, 13, 1.6); c.fillStyle = '#3c3458'; c.fill();
    c.strokeStyle = '#0b0814'; c.lineWidth = 0.9; c.stroke();
    circ(c, 0, 0, 6.3); c.fillStyle = rad(c, -2, -2, 0, 0, 0, 6.3, [0, '#9d8fc6', 1, '#2a2340']); c.fill(); c.stroke();
    circ(c, 0, 0, 2.3); c.fillStyle = col || '#ff9a1f'; c.fill();
  }
  function rockPts(r, seed) {
    const p = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rr = r * (0.76 + 0.24 * hash(seed * 13.7 + i * 3.1)); p.push(Math.cos(a) * rr, Math.sin(a) * rr); }
    return p;
  }
  function paintRock(c, r, seed, rich) {
    const p = rockPts(r, seed);
    c.beginPath();
    const n = p.length / 2;
    for (let i = 0; i <= n; i++) {
      const x0 = p[(i % n) * 2], y0 = p[(i % n) * 2 + 1], x1 = p[((i + 1) % n) * 2], y1 = p[((i + 1) % n) * 2 + 1];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(x0, y0, mx, my);
    }
    c.closePath();
    c.fillStyle = rad(c, -r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1, rich
      ? [0, '#a99a8a', 0.5, '#5a4d47', 1, '#1d1719'] : [0, '#a08f7e', 0.55, '#4f443c', 1, '#1a1513']);
    c.fill();
    c.strokeStyle = '#0d0a09'; c.lineWidth = 1.2; c.stroke();
    c.save(); c.clip();
    for (let k = 0; k < 4; k++) {
      const a = hash(seed + k * 7.3) * TAU, d = r * 0.55 * hash(seed * 3 + k), cr = r * (0.14 + 0.14 * hash(seed + k * 1.7));
      const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
      ell(c, cx, cy, cr, cr * 0.85); c.fillStyle = 'rgba(20,14,12,0.45)'; c.fill();
      c.strokeStyle = 'rgba(255,240,220,0.18)'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(cx, cy, cr, cr * 0.85, 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
    }
    if (rich) {
      c.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const a = hash(seed * 5 + k) * TAU;
        c.strokeStyle = k === 1 ? '#7ffcef' : '#ffd34d'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1);
        c.quadraticCurveTo(Math.cos(a + 0.6) * r * 0.5, Math.sin(a + 0.6) * r * 0.5, Math.cos(a + 0.2) * r * 0.95, Math.sin(a + 0.2) * r * 0.95); c.stroke();
      }
      c.fillStyle = '#fff6c4'; circ(c, r * 0.12, -r * 0.08, r * 0.14); c.fill();
    }
    c.restore();
  }
  function paintMiner(c) {
    ell(c, 0, 2, 20.5, 9.5);
    c.fillStyle = lin(c, -20, 0, 20, 0, [0, '#13281d', 0.5, '#4f8f6b', 1, '#13281d']); c.fill();
    c.strokeStyle = '#04110a'; c.lineWidth = 1.1; c.stroke();
    ell(c, 0, -2.5, 10.5, 7.5);
    c.fillStyle = rad(c, -3, -6, 0, 0, -2.5, 10.5, [0, '#d8ffe8', 0.35, '#3fbf80', 1, '#0b3020']); c.fill(); c.stroke();
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.1 + 0.8 * i / 5); c.fillStyle = i & 1 ? '#5dff8a' : '#d4ffe4'; circ(c, -Math.cos(a) * 17, 3.5 + Math.sin(a) * 3.5, 1.3); c.fill(); }
    c.fillStyle = '#071209'; c.fillRect(-4.5, 9.5, 9, 3);
  }
  function paintMine(c) {
    c.fillStyle = '#2a2a33';
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      poly(c, [Math.cos(a - 0.28) * 5.5, Math.sin(a - 0.28) * 5.5, Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a + 0.28) * 5.5, Math.sin(a + 0.28) * 5.5]);
      c.fill();
    }
    circ(c, 0, 0, 6.4); c.fillStyle = rad(c, -2, -2, 0, 0, 0, 6.4, [0, '#8c8c9c', 1, '#22222a']); c.fill();
    c.strokeStyle = '#0b0b10'; c.lineWidth = 0.9; c.stroke();
    circ(c, 0, 0, 2.5); c.fillStyle = '#ff3b3b'; c.fill();
  }
  function paintSentinel(c) {
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * 9, -8, s * 19, -14, s * 16, 2, s * 8, 6]);
      c.fillStyle = lin(c, 0, 0, s * 19, 0, [0, '#16222e', 1, '#43627c']); c.fill();
      c.strokeStyle = '#04080c'; c.lineWidth = 0.9; c.stroke();
      c.strokeStyle = '#ff3fb4'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(s * 10, -8.5); c.lineTo(s * 18, -13); c.stroke();
    }
    poly(c, [0, -19, 12.5, -4, 9, 12, 0, 18, -9, 12, -12.5, -4]);
    c.fillStyle = lin(c, -12, 0, 12, 0, [0, '#101a24', 0.5, '#3f5d78', 1, '#101a24']); c.fill();
    c.strokeStyle = '#04080c'; c.lineWidth = 1.1; c.stroke();
    circ(c, 0, 7.5, 6.2); c.fillStyle = '#1a0010'; c.fill();
    c.strokeStyle = '#ff3fb4'; c.lineWidth = 1.2; c.stroke();
    circ(c, 0, 7.5, 3.3); c.fillStyle = rad(c, 0, 7.5, 0, 0, 7.5, 3.3, [0, '#ffffff', 0.4, '#ff8fd2', 1, '#7a0040']); c.fill();
  }
  function paintSnakeHead(c) {
    c.strokeStyle = '#0b3a33'; c.lineWidth = 3; c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) { c.beginPath(); c.moveTo(s * 6, 9); c.quadraticCurveTo(s * 11, 17, s * 4, 20); c.stroke(); }
    c.strokeStyle = '#7dffd0'; c.lineWidth = 1;
    for (let s = -1; s <= 1; s += 2) { c.beginPath(); c.moveTo(s * 6, 9); c.quadraticCurveTo(s * 11, 17, s * 4, 20); c.stroke(); }
    ell(c, 0, 0, 13, 15);
    c.fillStyle = rad(c, -4, -5, 1, 0, 0, 15, [0, '#a6ffe0', 0.4, '#23a88d', 1, '#05352e']); c.fill();
    c.strokeStyle = '#021a16'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(0,40,34,0.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-9, -6); c.quadraticCurveTo(0, -1, 9, -6); c.moveTo(-11, 0); c.quadraticCurveTo(0, 5, 11, 0); c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      ell(c, s * 5, 6, 3, 2.2, s * 0.4); c.fillStyle = '#ffe14d'; c.fill();
      ell(c, s * 5, 6.3, 1.2, 1.5); c.fillStyle = '#331a00'; c.fill();
    }
  }
  function paintSnakeSeg(c, r) {
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.35, -r * 0.4, 0.5, 0, 0, r, [0, '#86f2d2', 0.45, '#1b8a72', 1, '#04302a']); c.fill();
    c.strokeStyle = '#021a16'; c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = 'rgba(160,255,225,0.55)'; c.lineWidth = 0.9;
    c.beginPath(); c.arc(0, 0, r * 0.68, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    circ(c, 0, 0, r * 0.28); c.fillStyle = '#e8fff6'; c.fill();
  }
  function paintCruiser(c) {
    poly(c, [0, 30, 17, 19, 30, -2, 25, -26, 9, -30, -9, -30, -25, -26, -30, -2, -17, 19]);
    c.fillStyle = lin(c, -30, 0, 30, 0, [0, '#18202c', 0.5, '#5b6f8a', 1, '#18202c']); c.fill();
    c.strokeStyle = '#060a10'; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-22, -18); c.lineTo(22, -18); c.moveTo(-26, -4); c.lineTo(26, -4); c.moveTo(-15, 12); c.lineTo(15, 12); c.stroke();
    rrect(c, -8, -24, 16, 12, 3); c.fillStyle = '#0e141c'; c.fill();
    c.fillStyle = '#ff4d5e'; c.fillRect(-6, -21, 12, 2.2);
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = '#0a0f15'; rrect(c, s * 18 - 4, -31, 8, 6, 2); c.fill();
      c.fillStyle = '#6fd6ff'; c.fillRect(s * 18 - 2.5, -30.5, 5, 1.6);
      c.fillStyle = '#ff4d5e'; circ(c, s * 26, -3, 1.6); c.fill();
    }
    circ(c, 0, 18, 4); c.fillStyle = '#6fd6ff'; c.fill();
  }
  function paintStealth(c) {
    poly(c, [0, 14, 15.5, -6.5, 6, -3, 0, -12.5, -6, -3, -15.5, -6.5]);
    c.fillStyle = lin(c, -15, 0, 15, 0, [0, '#030407', 0.5, '#1d2333', 1, '#030407']); c.fill();
    c.strokeStyle = 'rgba(150,130,255,0.9)'; c.lineWidth = 0.9; c.stroke();
    c.fillStyle = '#b9a6ff'; c.fillRect(-4, 2, 8, 1.6);
  }
  function paintWeaverBody(c) {
    circ(c, 0, 0, 9.5);
    c.fillStyle = rad(c, -3, -3, 0.5, 0, 0, 9.5, [0, '#fff3c0', 0.35, '#ffb321', 1, '#5a2600']); c.fill();
    c.strokeStyle = '#2a1000'; c.lineWidth = 1.1; c.stroke();
    circ(c, 0, 0, 3.2); c.fillStyle = '#2a1000'; c.fill();
    circ(c, 0, 0, 1.6); c.fillStyle = '#ffffff'; c.fill();
  }
  function paintWeaverBlades(c) {
    for (let i = 0; i < 3; i++) {
      c.save(); c.rotate(i * TAU / 3);
      c.beginPath(); c.moveTo(6, -3); c.quadraticCurveTo(17, -6, 19, 5); c.quadraticCurveTo(13, 0, 6, 3); c.closePath();
      c.fillStyle = lin(c, 6, 0, 19, 0, [0, '#3a1f5a', 1, '#9a5cff']); c.fill();
      c.strokeStyle = '#120720'; c.lineWidth = 0.9; c.stroke();
      c.restore();
    }
  }
  function paintElite(c) {                       // chasseur d'élite : la bulle (et le pilote) est dessinée en direct
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * 10, -14, s * 31, 6, s * 29, 13, s * 15, 9, s * 11, 18]);
      c.fillStyle = lin(c, 0, 0, s * 31, 0, [0, '#3a0820', 0.6, '#b0204e', 1, '#ff5f8a']); c.fill();
      c.strokeStyle = '#1a0010'; c.lineWidth = 1.1; c.stroke();
      c.strokeStyle = '#ffd34d'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s * 12, -11); c.lineTo(s * 29.5, 6.5); c.stroke();
      c.fillStyle = '#18060e'; rrect(c, s * 13 - 4, -22, 8, 10, 2.5); c.fill();
      c.fillStyle = '#ff9a1f'; c.fillRect(s * 13 - 2.5, -21.5, 5, 2);
    }
    poly(c, [0, 27, 13, 14, 15, -10, 7, -21, -7, -21, -15, -10, -13, 14]);
    c.fillStyle = lin(c, -15, 0, 15, 0, [0, '#22040f', 0.5, '#7a1736', 1, '#22040f']); c.fill();
    c.strokeStyle = '#120008'; c.lineWidth = 1.2; c.stroke();
    circ(c, 0, 1, 16.4); c.fillStyle = '#12040a'; c.fill();
    c.strokeStyle = '#ffd34d'; c.lineWidth = 1.8; c.stroke();
  }
  function paintBubbleGlass(c, r) {              // reflet de verre par-dessus le pilote
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, 0, 0, r * 0.55, 0, 0, r, [0, 'rgba(150,220,255,0)', 1, 'rgba(150,220,255,0.38)']); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = r * 0.09; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r * 0.78, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; circ(c, r * 0.42, -r * 0.5, r * 0.08); c.fill();
  }
  function paintPilot(c, r) {                    // pilote extraterrestre (quand il n'y a pas de tête de copain)
    circ(c, 0, 0, r); c.fillStyle = '#16060c'; c.fill();
    ell(c, 0, r * 0.15, r * 0.62, r * 0.7); c.fillStyle = rad(c, 0, 0, 0, 0, r * 0.15, r * 0.7, [0, '#c2ff9a', 1, '#2f7a1a']); c.fill();
    for (let s = -1; s <= 1; s += 2) { ell(c, s * r * 0.26, r * 0.05, r * 0.17, r * 0.24, s * -0.4); c.fillStyle = '#0a0a0a'; c.fill(); }
  }
  function paintDrone(c) {
    c.strokeStyle = '#2a4a10'; c.lineWidth = 1.4; c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 3, -4); c.lineTo(i * 6, -10); c.stroke(); }
    circ(c, 0, 0, 7.2); c.fillStyle = rad(c, -2, -2, 0.5, 0, 0, 7.2, [0, '#e2ffbc', 0.45, '#6cb52a', 1, '#1c3a08']); c.fill();
    c.strokeStyle = '#0d1c04'; c.lineWidth = 0.9; c.stroke();
    circ(c, 0, 2.6, 3.1); c.fillStyle = '#fff'; c.fill();
    circ(c, 0, 3.2, 1.6); c.fillStyle = '#d0001c'; c.fill();
  }
  function paintGardien(c, hue) {                // mini-boss (le dôme est dessiné en direct)
    const d0 = hsl(hue, 35, 12), d1 = hsl(hue, 40, 38), li = hsl(hue, 100, 62);
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * 18, -22, s * 52, -10, s * 55, 14, s * 40, 28, s * 22, 18]);
      c.fillStyle = lin(c, 0, 0, s * 55, 0, [0, d0, 0.6, d1, 1, d0]); c.fill();
      c.strokeStyle = '#05050a'; c.lineWidth = 1.4; c.stroke();
      rrect(c, s * 44 - 7, 2, 14, 30, 5); c.fillStyle = '#0d0d16'; c.fill(); c.strokeStyle = li; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = li; c.fillRect(s * 44 - 3, 28, 6, 3);
      c.strokeStyle = li; c.lineWidth = 1.3; c.beginPath(); c.moveTo(s * 22, -19); c.lineTo(s * 50, -9); c.stroke();
      c.fillStyle = '#0a0a12'; rrect(c, s * 24 - 6, -34, 12, 12, 3); c.fill();
      c.fillStyle = '#ffb347'; c.fillRect(s * 24 - 4, -33, 8, 2.5);
    }
    poly(c, [0, 42, 22, 22, 25, -16, 13, -36, -13, -36, -25, -16, -22, 22]);
    c.fillStyle = lin(c, -25, 0, 25, 0, [0, d0, 0.5, d1, 1, d0]); c.fill();
    c.strokeStyle = '#05050a'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(-20, -24); c.lineTo(20, -24); c.moveTo(-18, 26); c.lineTo(18, 26); c.stroke();
    circ(c, 0, 2, 19.5); c.fillStyle = '#0b0a12'; c.fill();
    c.strokeStyle = li; c.lineWidth = 2; c.stroke();
    c.fillStyle = li; circ(c, 0, 36, 2.4); c.fill();
  }

  // ----------------------------------------------------------------- planètes dessinées (repli sans images)
  function paintPlanetProc(c, r, seed) {
    const h = (seed * 47 + 190) % 360, h2 = (h + 35 + seed * 17) % 360;
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.35, -r * 0.4, r * 0.05, 0, 0, r, [0, hsl(h, 75, 74), 0.5, hsl(h, 62, 46), 1, hsl(h2, 55, 20)]);
    c.fill();
    c.save(); circ(c, 0, 0, r); c.clip();
    for (let i = 0; i < 7; i++) {
      const y = -r + (i + 0.5) * (2 * r / 7) + (hash(seed + i) - 0.5) * r * 0.2;
      c.strokeStyle = hsl(i & 1 ? h2 : h, 65, 38 + 34 * hash(seed * 3 + i), 0.4);
      c.lineWidth = r * (0.07 + 0.13 * hash(seed * 7 + i));
      c.beginPath(); c.moveTo(-r * 1.1, y); c.bezierCurveTo(-r * 0.3, y - r * 0.18, r * 0.3, y + r * 0.18, r * 1.1, y); c.stroke();
    }
    if (seed % 3 === 0) { ell(c, r * 0.25, r * 0.15, r * 0.22, r * 0.13, 0.2); c.fillStyle = hsl(h2 + 40, 80, 55, 0.7); c.fill(); }
    c.fillStyle = rad(c, -r * 0.45, -r * 0.5, r * 0.2, 0, 0, r * 1.05, [0, 'rgba(0,0,0,0)', 0.62, 'rgba(0,0,8,0.18)', 1, 'rgba(0,0,12,0.8)']);
    c.fillRect(-r, -r, 2 * r, 2 * r);
    c.restore();
    circ(c, 0, 0, r - 0.5); c.strokeStyle = hsl(h, 85, 78, 0.35); c.lineWidth = r * 0.035; c.stroke();
  }
  let PROC = null;                               // 12 planètes dessinées, partagées (jeu + aperçu)
  function procPlanets() {
    if (PROC) return PROC;
    PROC = [];
    for (let i = 0; i < 12; i++) {
      const cv = mkCanvas(160, 160), c = cv.getContext('2d');
      c.translate(80, 80); paintPlanetProc(c, 78, i + 1);
      PROC.push(cv);
    }
    return PROC;
  }

  // ----------------------------------------------------------------- peinture : pièces de boss
  function paintVela(c) {                        // Croiseur Vela (tourelles et cœur dessinés à part)
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * 28, -42, s * 140, -20, s * 142, 4, s * 116, 22, s * 62, 36, s * 28, 30]);
      c.fillStyle = lin(c, 0, 0, s * 142, 0, [0, '#18151f', 0.55, '#575066', 1, '#2a2533']); c.fill();
      c.strokeStyle = '#07060a'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(s * 40, -30); c.lineTo(s * 132, -12); c.moveTo(s * 40, 10); c.lineTo(s * 110, 12); c.moveTo(s * 76, -34); c.lineTo(s * 70, 30); c.stroke();
      c.strokeStyle = '#ffa630'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(s * 34, -38); c.lineTo(s * 136, -18); c.stroke();
      for (let k = 0; k < 5; k++) { c.fillStyle = k & 1 ? '#ffd34d' : '#ff8a1f'; circ(c, s * (50 + k * 18), -30 + k * 4 + 34, 1.5); c.fill(); }
      for (const [mx, my] of [[100, -5], [52, 18]]) {
        circ(c, s * mx, my, 14); c.fillStyle = '#0c0a10'; c.fill();
        c.strokeStyle = '#ffa630'; c.lineWidth = 1.2; c.stroke();
      }
      c.fillStyle = '#0c0a10'; rrect(c, s * 128 - 6, -26, 12, 9, 3); c.fill();
      c.fillStyle = '#ff8a1f'; c.fillRect(s * 128 - 4, -25.5, 8, 2.2);
    }
    poly(c, [0, 64, 34, 40, 42, -30, 22, -60, -22, -60, -42, -30, -34, 40]);
    c.fillStyle = lin(c, -42, 0, 42, 0, [0, '#1d1926', 0.5, '#6c6582', 1, '#1d1926']); c.fill();
    c.strokeStyle = '#07060a'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-36, -20); c.lineTo(36, -20); c.moveTo(-30, 36); c.lineTo(30, 36); c.stroke();
    rrect(c, -15, -52, 30, 18, 5); c.fillStyle = '#0b0910'; c.fill();
    for (let k = 0; k < 4; k++) { c.fillStyle = '#ffd34d'; c.fillRect(-11 + k * 6.5, -46, 4, 3); }
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = '#0b0910'; rrect(c, s * 16 - 7, -70, 14, 13, 3); c.fill();
      c.fillStyle = '#ff8a1f'; c.fillRect(s * 16 - 5, -69, 10, 2.5);
    }
    circ(c, 0, 12, 21); c.fillStyle = '#09070d'; c.fill();
    c.strokeStyle = '#ffa630'; c.lineWidth = 1.6; c.stroke();
  }
  function paintWormHead(c) {
    c.lineCap = 'round';
    for (let s = -1; s <= 1; s += 2) {
      c.strokeStyle = '#2a0a46'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(s * 10, 14); c.quadraticCurveTo(s * 22, 28, s * 8, 36); c.stroke();
      c.strokeStyle = '#d8a8ff'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(s * 10, 14); c.quadraticCurveTo(s * 22, 28, s * 8, 36); c.stroke();
      poly(c, [s * 12, -14, s * 30, -34, s * 20, -8]); c.fillStyle = lin(c, s * 12, -10, s * 30, -34, [0, '#3a1466', 1, '#c79bff']); c.fill();
      c.strokeStyle = '#12051f'; c.lineWidth = 1; c.stroke();
    }
    ell(c, 0, 0, 24, 27);
    c.fillStyle = rad(c, -7, -9, 2, 0, 0, 27, [0, '#c9a2ff', 0.38, '#6b2bc0', 1, '#1a0634']); c.fill();
    c.strokeStyle = '#0c0218'; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = 'rgba(80,240,255,0.65)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-15, -12); c.quadraticCurveTo(0, -4, 15, -12); c.moveTo(-19, 0); c.quadraticCurveTo(0, 9, 19, 0); c.stroke();
    ell(c, 0, 17, 10, 6); c.fillStyle = '#0a0010'; c.fill();
    ell(c, 0, 17, 7, 3.6); c.fillStyle = rad(c, 0, 17, 0, 0, 17, 7, [0, '#ffffff', 0.4, '#5ef0ff', 1, '#0a3a66']); c.fill();
  }
  function paintWormSeg(c, r) {
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.35, -r * 0.4, 0.5, 0, 0, r, [0, '#b48cff', 0.45, '#4d1d96', 1, '#14042a']); c.fill();
    c.strokeStyle = '#08010f'; c.lineWidth = 1.3; c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * r * 0.75, -r * 0.45, s * r * 1.32, -r * 0.1, s * r * 0.8, r * 0.3]);
      c.fillStyle = '#2a0a4a'; c.fill(); c.strokeStyle = '#c79bff'; c.lineWidth = 0.9; c.stroke();
    }
    c.strokeStyle = 'rgba(94,240,255,0.75)'; c.lineWidth = r * 0.12;
    c.beginPath(); c.arc(0, 0, r * 0.62, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    circ(c, 0, -r * 0.1, r * 0.22); c.fillStyle = '#e6fbff'; c.fill();
  }
  function paintQueenBody(c) {                   // Reine de l'Essaim (le dôme du visage est dessiné en direct)
    for (let i = 0; i < 4; i++) {
      const y = 22 + i * 15, w = 30 - i * 5;
      ell(c, 0, y, w, 10);
      c.fillStyle = lin(c, -w, 0, w, 0, [0, '#1a2a0a', 0.5, i & 1 ? '#7ab82c' : '#5c9a1c', 1, '#1a2a0a']); c.fill();
      c.strokeStyle = '#081004'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#ffe14d'; circ(c, 0, y + 2, 2); c.fill();
    }
    ell(c, 0, -6, 34, 26);
    c.fillStyle = rad(c, -10, -16, 2, 0, -6, 34, [0, '#b8f070', 0.4, '#4f8a18', 1, '#122204']); c.fill();
    c.strokeStyle = '#081004'; c.lineWidth = 1.5; c.stroke();
    for (let s = -1; s <= 1; s += 2) {
      c.strokeStyle = '#1a2a0a'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(s * 10, -28); c.quadraticCurveTo(s * 24, -50, s * 36, -46); c.stroke();
      c.fillStyle = '#ffe14d'; circ(c, s * 36, -46, 3); c.fill();
      rrect(c, s * 27 - 6, -2, 12, 16, 4); c.fillStyle = '#0d1606'; c.fill();
      c.strokeStyle = '#ffe14d'; c.lineWidth = 1.1; c.stroke();
    }
    circ(c, 0, -8, 21); c.fillStyle = '#0d1606'; c.fill();
    c.strokeStyle = '#ffe14d'; c.lineWidth = 2; c.stroke();
  }
  function paintQueenWing(c) {                   // aile gauche (l'autre est retournée au dessin)
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-60, -50, -112, -30);
    c.quadraticCurveTo(-96, 0, -108, 26);
    c.quadraticCurveTo(-60, 30, 0, 14);
    c.closePath();
    c.fillStyle = lin(c, 0, 0, -112, 0, [0, 'rgba(70,140,30,0.95)', 0.5, 'rgba(120,230,150,0.55)', 1, 'rgba(200,255,220,0.3)']); c.fill();
    c.strokeStyle = 'rgba(230,255,190,0.9)'; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(20,50,10,0.75)'; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-4, 4); c.quadraticCurveTo(-50, -22, -104, -24);
    c.moveTo(-4, 8); c.quadraticCurveTo(-60, 2, -100, 6);
    c.moveTo(-4, 11); c.quadraticCurveTo(-55, 22, -98, 22);
    c.moveTo(-40, -22); c.lineTo(-46, 18); c.moveTo(-72, -28); c.lineTo(-76, 22);
    c.stroke();
    rrect(c, -92, -6, 16, 12, 4); c.fillStyle = '#0d1606'; c.fill(); c.strokeStyle = '#ffe14d'; c.lineWidth = 1; c.stroke();
  }
  function paintGaiaRing(c, R) {                 // anneau de la Station Gaïa (tourné en direct)
    c.lineWidth = 13; c.strokeStyle = '#1b2430';
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    c.lineWidth = 9; c.strokeStyle = lin(c, -R, -R, R, R, [0, '#7e93ad', 0.5, '#2c3a4c', 1, '#93a9c4']);
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    c.lineWidth = 1.4; c.strokeStyle = '#46f08a';
    c.beginPath(); c.arc(0, 0, R - 5.5, 0, TAU); c.stroke();
    c.beginPath(); c.arc(0, 0, R + 5.5, 0, TAU); c.stroke();
    for (let i = 0; i < 24; i++) {
      const a = i * TAU / 24;
      c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(Math.cos(a) * (R - 4.5), Math.sin(a) * (R - 4.5)); c.lineTo(Math.cos(a) * (R + 4.5), Math.sin(a) * (R + 4.5)); c.stroke();
      if (i % 4 === 2) { c.fillStyle = '#c8ffd8'; circ(c, Math.cos(a) * R, Math.sin(a) * R, 1.6); c.fill(); }
    }
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 + 0.5;
      c.strokeStyle = '#1b2430'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6)); c.stroke();
      c.strokeStyle = 'rgba(70,240,138,0.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6)); c.stroke();
    }
  }
  function paintGaiaNode(c) {
    poly(c, [0, -13, 11, -5, 11, 7, 0, 13, -11, 7, -11, -5]);
    c.fillStyle = lin(c, -11, -11, 11, 11, [0, '#9fb3c9', 0.5, '#33465c', 1, '#141c26']); c.fill();
    c.strokeStyle = '#05080c'; c.lineWidth = 1.2; c.stroke();
    circ(c, 0, 0, 5); c.fillStyle = '#062014'; c.fill();
    c.strokeStyle = '#46f08a'; c.lineWidth = 1.3; c.stroke();
  }
  function paintGaiaCore(c) {
    circ(c, 0, 0, 30);
    c.fillStyle = rad(c, -9, -10, 2, 0, 0, 30, [0, '#e6f2ff', 0.35, '#6c85a6', 1, '#141c28']); c.fill();
    c.strokeStyle = '#05080c'; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = '#46f08a'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.stroke();
    circ(c, 0, 0, 20); c.fillStyle = '#08100c'; c.fill();
  }
  function paintDisk(c, R) {                     // disque d'accrétion (Œil du Gouffre / trou noir), dessiné en additif
    for (let i = 0; i < 3; i++) {
      c.save(); c.rotate(i * TAU / 3);
      c.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = k / 40 * Math.PI * 1.6, rr = R * (0.32 + 0.68 * k / 40);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = 'rgba(255,140,60,0.55)'; c.lineWidth = R * 0.16; c.lineCap = 'round'; c.stroke();
      c.strokeStyle = 'rgba(255,90,200,0.5)'; c.lineWidth = R * 0.07; c.stroke();
      c.strokeStyle = 'rgba(255,240,200,0.6)'; c.lineWidth = R * 0.02; c.stroke();
      c.restore();
    }
    c.fillStyle = rad(c, 0, 0, R * 0.25, 0, 0, R, [0, 'rgba(255,200,120,0.5)', 0.5, 'rgba(255,80,160,0.18)', 1, 'rgba(120,40,200,0)']);
    circ(c, 0, 0, R); c.fill();
  }

  // ----------------------------------------------------------------- (coop) le Vaisseau Ambre du coéquipier (jamais blanc / rose : c'est le boss final)
  const PAL_AMBRE = { h0: '#0b0806', h1: '#3a2c1c', h2: '#7a5d3a', neon: '#ffa630', neon2: '#fff0d0', glass0: '#1a0e03', glass1: '#e08a2a', wing0: '#120c07', wing1: '#3a2d1f' };

  // ===========================================================================
  // aperçu animé (tuile de l'accueil) — ne lève jamais d'erreur
  // ===========================================================================
  const PV = { k: 0, neb: null, nebSrc: null };
  function pvSprite(w, h, fn) {
    const cv = mkCanvas(w * 2, h * 2), c = cv.getContext('2d');
    c.setTransform(2, 0, 0, 2, w, h); fn(c);
    return cv;
  }
  function pvInit() {
    if (PV.k) return;
    PV.ship = [];
    for (let i = 0; i < 5; i++) PV.ship.push(pvSprite(50, 56, (c) => paintShip(c, (i - 2) / 2, PAL_NOIR)));
    PV.swarm = pvSprite(34, 32, paintSwarm);
    PV.elite = pvSprite(66, 60, (c) => { paintElite(c); paintPilot(c, 16); paintBubbleGlass(c, 16); });
    PV.gc = mkGlow('#38e1ff'); PV.gm = mkGlow('#ff3d9a'); PV.go = mkGlow('#ff9a1f', true); PV.gw = mkGlow('#ffffff'); PV.fire = mkFire();
    PV.bolt = pvSprite(8, 34, (c) => paintBolt(c, 3, 32, '#38e1ff', '#ffffff'));
    PV.heavy = pvSprite(12, 38, (c) => paintBolt(c, 4.6, 36, '#38e1ff', '#effdff'));
    PV.orb = pvSprite(20, 20, (c) => paintOrb(c, 4.6, BCOL.p[0], BCOL.p[1]));
    PV.shard = pvSprite(14, 14, paintShard);
    PV.stars = [];
    for (let i = 0; i < 80; i++) PV.stars.push([hash(i * 3.1), hash(i * 7.7 + 1), i % 3]);
    PV.k = 1;
  }
  function pvNebula(img) {                       // tuile miroir 2x2 recolorée : défile sans couture
    if (PV.nebSrc === img && PV.neb) return PV.neb;
    const T = 200, cv = mkCanvas(T * 2, T * 2), c = cv.getContext('2d');
    c.drawImage(img, 0, 0, T, T);
    c.save(); c.translate(2 * T, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, T, T); c.restore();
    c.save(); c.translate(0, 2 * T); c.scale(1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
    c.save(); c.translate(2 * T, 2 * T); c.scale(-1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
    c.globalCompositeOperation = 'color'; c.fillStyle = hsl(200, 70, 50); c.fillRect(0, 0, 2 * T, 2 * T);
    c.globalCompositeOperation = 'source-over';
    PV.neb = cv; PV.nebSrc = img;
    return cv;
  }
  function preview(ctx, w, h, t) {
    try {
      pvInit();
      const s = Math.min(w / 300, h / 170);
      const cache = (typeof window !== 'undefined' && window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.ilo) || null;
      const planets = cache && cache.planets && cache.planets.length ? cache.planets : null;
      const nebs = cache && cache.nebulas && cache.nebulas.length ? cache.nebulas : null;
      const pl = (i) => (planets && imgOk(planets[i % planets.length]) ? planets[i % planets.length] : procPlanets()[i % 12]);
      ctx.save();
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [0, '#02060f', 1, '#06243a']);
      ctx.fillRect(0, 0, w, h);
      const cyc = t % 10, warp = cyc > 8.4 ? ease((cyc - 8.4) / 0.9) * (cyc < 9.4 ? 1 : Math.max(0, 1 - (cyc - 9.4) / 0.6)) : 0;
      // nébuleuse
      ctx.globalCompositeOperation = 'lighter';
      if (nebs && imgOk(nebs[0])) {
        const nb = pvNebula(nebs[0]), sz = 330 * s, off = (t * 7 * s) % sz;
        ctx.globalAlpha = 0.75;
        for (let y = off - sz; y < h; y += sz) for (let x = -sz * 0.3; x < w; x += sz) ctx.drawImage(nb, x, y, sz, sz);
      } else {
        ctx.globalAlpha = 0.55; ctx.drawImage(PV.gc, -w * 0.1, h * 0.1, w * 0.75, h * 1.2);
        ctx.globalAlpha = 0.3; ctx.drawImage(PV.gm, w * 0.4, -h * 0.4, w * 0.8, h * 1.1);
      }
      // étoiles (s'étirent pendant le saut)
      ctx.fillStyle = '#d8f4ff';
      for (let i = 0; i < PV.stars.length; i++) {
        const st = PV.stars[i], sp = (st[2] + 1) * 9 * s * (1 + warp * 40);
        const x = st[0] * w, y = ((st[1] * h + t * sp) % (h + 20)) - 10, sz = (st[2] * 0.6 + 0.7) * s, len = warp * 30 * s * (st[2] + 1);
        ctx.globalAlpha = 0.35 + st[2] * 0.25;
        ctx.fillRect(x, y - len, sz, sz + len);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // planètes d'ILO
      ctx.globalAlpha = 0.8;
      const fy = ((t * 5) % 240) - 50;
      ctx.drawImage(pl(4), w * 0.06, fy * s, 30 * s, 30 * s);
      ctx.globalAlpha = 1;
      const bp = 165 * s, bx = w - bp * 0.58, by = h * 0.3 + Math.sin(t * 0.25) * 5 * s;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      ctx.drawImage(PV.gc, bx - bp * 0.18, by - bp * 0.18, bp * 1.36, bp * 1.36);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(pl(10), bx, by, bp, bp);
      ctx.fillStyle = 'rgba(2,6,16,0.25)'; circ(ctx, bx + bp / 2, by + bp / 2, bp * 0.49); ctx.fill();
      // le Vaisseau Noir
      const sx = w * 0.42 + Math.sin(t * 1.05) * w * 0.25, vx = Math.cos(t * 1.05);
      const sy = h - 34 * s + Math.sin(t * 2.1) * 4 * s;
      const fr = clamp(Math.round(2 + vx * 2), 0, 4);
      // formation qui descend et explose sous les tirs
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.3 + i * 0.143) % 1;
        const ex = w * 0.42 + Math.sin(ph * 6 + i * 0.6) * w * 0.26, ey = -14 * s + ph * h * 0.7;
        if (ph > 0.82) {
          const k = (ph - 0.82) / 0.18;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, 1 - k * 1.2);
          const fz = (14 + 46 * k) * s;
          ctx.drawImage(PV.fire, ex - fz / 2, ey - fz / 2, fz, fz);
          ctx.globalAlpha = Math.max(0, 0.9 - k);
          for (let j = 0; j < 6; j++) { const a = j * 1.05 + i, d = k * 26 * s; ctx.drawImage(PV.go, ex + Math.cos(a) * d - 4 * s, ey + Math.sin(a) * d - 4 * s, 8 * s, 8 * s); }
          ctx.strokeStyle = 'rgba(255,220,170,' + Math.max(0, 0.8 - k).toFixed(2) + ')'; ctx.lineWidth = 1.5 * s;
          circ(ctx, ex, ey, 6 * s + k * 26 * s); ctx.stroke();
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          for (let j = 0; j < 3; j++) { const a = j * 2.1 + i; ctx.drawImage(PV.shard, ex + Math.cos(a) * k * 18 * s - 4 * s, ey + Math.sin(a) * k * 18 * s - 4 * s + k * 10 * s, 8 * s, 8 * s); }
          continue;
        }
        const sz = 24 * s;
        ctx.drawImage(PV.swarm, ex - sz / 2, ey - sz / 2, sz, sz * 0.94);
      }
      // chasseur d'élite + balles roses
      const elx = w * 0.62 + Math.sin(t * 0.6) * w * 0.12, ely = 26 * s + Math.sin(t * 1.3) * 3 * s;
      for (let i = 0; i < 5; i++) {
        const k = (t * 0.42 + i * 0.2) % 1, a = Math.PI / 2 + (i - 2) * 0.28;
        ctx.drawImage(PV.orb, elx + Math.cos(a) * k * h * 1.1 - 6 * s, ely + 12 * s + Math.sin(a) * k * h * 1.1 - 6 * s, 12 * s, 12 * s);
      }
      ctx.drawImage(PV.elite, elx - 25 * s, ely - 23 * s, 50 * s, 46 * s);
      // tirs du vaisseau
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const k = (t * 2.6 + i / 6) % 1, x0 = w * 0.42 + Math.sin((t - k * 0.35) * 1.05) * w * 0.25, y0 = sy - 28 * s - k * h;
        ctx.drawImage(PV.bolt, x0 - 8 * s, y0, 6 * s, 24 * s);
        ctx.drawImage(PV.bolt, x0 + 2 * s, y0, 6 * s, 24 * s);
        ctx.drawImage(PV.heavy, x0 - 4.5 * s, y0 - 4 * s, 9 * s, 27 * s);
      }
      // traînée et réacteurs
      for (let i = 1; i < 12; i++) {
        const tt = t - i * 0.03, x0 = w * 0.42 + Math.sin(tt * 1.05) * w * 0.25, y0 = h - 34 * s + Math.sin(tt * 2.1) * 4 * s + 18 * s + i * 4 * s;
        ctx.globalAlpha = 0.5 * (1 - i / 12);
        ctx.drawImage(PV.gc, x0 - 4 * s, y0 - 4 * s, 8 * s, 8 * s);
      }
      const fl = 15 + Math.sin(t * 40) * 3;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(PV.gc, sx - 3.5 * s - 4.5 * s, sy + 14 * s, 9 * s, fl * s);
      ctx.drawImage(PV.gc, sx + 3.5 * s - 4.5 * s, sy + 14 * s, 9 * s, fl * s);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(PV.ship[fr], sx - 25 * s, sy - 28 * s, 50 * s, 56 * s);
      // flash du saut hyperespace
      if (warp > 0.85) { ctx.fillStyle = 'rgba(220,250,255,' + ((warp - 0.85) * 4).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h); }
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)']);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ----------------------------------------------------------------- (coop) vignette de la tuile « Galaxy Wars à deux » : les deux vaisseaux
  // en formation, l'Ambre devient une épave et le Noir vient la sauver (rayon tracteur), puis ils repartent ensemble — ne lève jamais d'erreur
  function previewDuo(ctx, w, h, t) {
    try {
      pvInit();
      if (!PV.shipA) {
        PV.shipA = [];
        for (let i = 0; i < 5; i++) PV.shipA.push(pvSprite(50, 56, (c) => paintShip(c, (i - 2) / 2, PAL_AMBRE)));
        PV.boltA = pvSprite(8, 34, (c) => paintBolt(c, 3, 32, '#ffb547', '#fff4dc'));
        PV.glass = pvSprite(34, 34, (c) => paintBubbleGlass(c, 16));
        PV.go2 = mkGlow('#ffa630');
      }
      const s = Math.min(w / 300, h / 170);
      const cache = (typeof window !== 'undefined' && window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.ilo) || null;
      const planets = cache && cache.planets && cache.planets.length ? cache.planets : null;
      const nebs = cache && cache.nebulas && cache.nebulas.length ? cache.nebulas : null;
      const pl = (i) => (planets && imgOk(planets[i % planets.length]) ? planets[i % planets.length] : procPlanets()[i % 12]);
      ctx.save();
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [0, '#03050f', 1, '#1a1030']);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      if (nebs && imgOk(nebs[1 % nebs.length])) {
        const nb = pvNebula(nebs[1 % nebs.length]), sz = 330 * s, off = (t * 7 * s) % sz;
        ctx.globalAlpha = 0.7;
        for (let y = off - sz; y < h; y += sz) for (let x = -sz * 0.3; x < w; x += sz) ctx.drawImage(nb, x, y, sz, sz);
      } else {
        ctx.globalAlpha = 0.5; ctx.drawImage(PV.gc, -w * 0.15, h * 0.05, w * 0.7, h * 1.2);
        ctx.globalAlpha = 0.4; ctx.drawImage(PV.go, w * 0.45, -h * 0.3, w * 0.75, h * 1.1);
      }
      ctx.fillStyle = '#e8f2ff';
      for (let i = 0; i < PV.stars.length; i++) {
        const st = PV.stars[i], sp = (st[2] + 1) * 9 * s;
        const x = st[0] * w, y = ((st[1] * h + t * sp) % (h + 20)) - 10, sz = (st[2] * 0.6 + 0.7) * s;
        ctx.globalAlpha = 0.35 + st[2] * 0.25;
        ctx.fillRect(x, y, sz, sz);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // planète d'ILO (à gauche) et une petite qui passe
      const bp = 150 * s, bx = -bp * 0.38, by = h * 0.18 + Math.sin(t * 0.25) * 5 * s;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3; ctx.drawImage(PV.go, bx - bp * 0.18, by - bp * 0.18, bp * 1.36, bp * 1.36);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(pl(4), bx, by, bp, bp);
      ctx.fillStyle = 'rgba(2,6,16,0.25)'; circ(ctx, bx + bp / 2, by + bp / 2, bp * 0.49); ctx.fill();
      ctx.globalAlpha = 0.8; ctx.drawImage(pl(13), w * 0.86, (((t * 5) % 240) - 50) * s, 26 * s, 26 * s); ctx.globalAlpha = 1;
      // le scénario (10 s) : formation, l'Ambre devient une épave (4,6 s), le Noir la rejoint, rayon tracteur, SAUVÉ (7,4 s)
      const cyc = t % 10, wreck = cyc >= 4.6 && cyc < 7.4, t0 = Math.floor(t / 10) * 10 + 4.6;
      const yb = h - 34 * s;
      const ax0 = w * 0.62 + Math.sin(t * 1.1 + 1.4) * w * 0.1, ay0 = yb + Math.sin(t * 2.3 + 1) * 4 * s;
      const pod = { x: w * 0.62 + Math.sin(t0 * 1.1 + 1.4) * w * 0.1, y: yb - 18 * s + clamp((cyc - 4.6) / 2.8, 0, 1) * 10 * s };
      const nx0 = w * 0.36 + Math.sin(t * 1.05) * w * 0.12, ny0 = yb + Math.sin(t * 2.1) * 4 * s;
      const pull = cyc < 4.6 ? 0 : cyc < 5.9 ? ease((cyc - 4.6) / 1.3) : cyc < 7.4 ? 1 : cyc < 8.4 ? 1 - ease((cyc - 7.4) / 1.0) : 0;
      const back = cyc >= 7.4 && cyc < 8.4 ? 1 - ease((cyc - 7.4) / 1.0) : 0;
      const nx = lerp(nx0, pod.x - 14 * s, pull), ny = lerp(ny0, pod.y + 22 * s, pull);
      const ax = lerp(ax0, pod.x, back), ay = lerp(ay0, pod.y, back);
      // formation qui descend et explose sous les tirs
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.3 + i * 0.143) % 1;
        const ex = w * 0.5 + Math.sin(ph * 6 + i * 0.6) * w * 0.3, ey = -14 * s + ph * h * 0.7;
        if (ph > 0.82) {
          const kk = (ph - 0.82) / 0.18;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(0, 1 - kk * 1.2);
          const fz = (14 + 46 * kk) * s;
          ctx.drawImage(PV.fire, ex - fz / 2, ey - fz / 2, fz, fz);
          ctx.globalAlpha = Math.max(0, 0.9 - kk);
          for (let j = 0; j < 6; j++) { const a = j * 1.05 + i, d = kk * 26 * s; ctx.drawImage(i & 1 ? PV.go2 : PV.go, ex + Math.cos(a) * d - 4 * s, ey + Math.sin(a) * d - 4 * s, 8 * s, 8 * s); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          continue;
        }
        const sz = 24 * s;
        ctx.drawImage(PV.swarm, ex - sz / 2, ey - sz / 2, sz, sz * 0.94);
      }
      const elx = w * 0.5 + Math.sin(t * 0.6) * w * 0.14, ely = 24 * s + Math.sin(t * 1.3) * 3 * s;
      for (let i = 0; i < 5; i++) {
        const kk = (t * 0.42 + i * 0.2) % 1, a = Math.PI / 2 + (i - 2) * 0.3;
        ctx.drawImage(PV.orb, elx + Math.cos(a) * kk * h * 1.1 - 6 * s, ely + 12 * s + Math.sin(a) * kk * h * 1.1 - 6 * s, 12 * s, 12 * s);
      }
      ctx.drawImage(PV.elite, elx - 25 * s, ely - 23 * s, 50 * s, 46 * s);
      // tirs des deux vaisseaux (cyan et ambre)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const kk = (t * 2.6 + i / 6) % 1;
        const x0 = lerp(w * 0.36 + Math.sin((t - kk * 0.35) * 1.05) * w * 0.12, nx, pull), y0 = ny - 28 * s - kk * h;
        ctx.drawImage(PV.bolt, x0 - 8 * s, y0, 6 * s, 24 * s); ctx.drawImage(PV.bolt, x0 + 2 * s, y0, 6 * s, 24 * s);
        if (!wreck) { const x1 = w * 0.62 + Math.sin((t - kk * 0.35) * 1.1 + 1.4) * w * 0.1, y1 = ay - 28 * s - ((kk + 0.5) % 1) * h; ctx.drawImage(PV.boltA, x1 - 8 * s, y1, 6 * s, 24 * s); ctx.drawImage(PV.boltA, x1 + 2 * s, y1, 6 * s, 24 * s); }
      }
      ctx.globalCompositeOperation = 'source-over';
      const drawShip = (spr, glow, x, y, vx) => {
        const fl = 15 + Math.sin(t * 40 + x) * 3;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.95;
        ctx.drawImage(glow, x - 8 * s, y + 14 * s, 9 * s, fl * s); ctx.drawImage(glow, x - 1 * s, y + 14 * s, 9 * s, fl * s);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(spr[clamp(Math.round(2 + vx * 2), 0, 4)], x - 25 * s, y - 28 * s, 50 * s, 56 * s);
      };
      if (wreck) {                                 // l'épave : capsule de verre, zone pointillée, rayon tracteur qui se remplit
        const fillK = clamp((cyc - 5.4) / 2.0, 0, 1), cx = pod.x, cy = pod.y + Math.sin(t * 2.4) * 1.5 * s;
        ctx.strokeStyle = 'rgba(56,225,255,' + (0.5 + 0.25 * Math.sin(t * 5)).toFixed(2) + ')'; ctx.lineWidth = 1.4 * s; ctx.setLineDash([6 * s, 5 * s]);
        ctx.beginPath(); ctx.arc(cx, cy, 30 * s, t, t + TAU); ctx.stroke(); ctx.setLineDash([]);
        if (fillK > 0) {
          ctx.strokeStyle = 'rgba(56,225,255,0.85)'; ctx.lineWidth = 2 * s; ctx.setLineDash([3 * s, 4 * s]);
          ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 3.2 * s; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(cx, cy, 21 * s, -Math.PI / 2, -Math.PI / 2 + TAU * fillK); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,166,48,0.35)'; circ(ctx, cx, cy, 13 * s); ctx.fill();
        ctx.fillStyle = '#fff0d0'; circ(ctx, cx - 4 * s, cy - 2 * s, 2.2 * s); circ(ctx, cx + 4 * s, cy - 2 * s, 2.2 * s); ctx.fill();
        ctx.strokeStyle = '#fff0d0'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.arc(cx, cy + 6 * s, 4 * s, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
        ctx.drawImage(PV.glass, cx - 14 * s, cy - 14 * s, 28 * s, 28 * s);
        ctx.strokeStyle = '#ffa630'; ctx.lineWidth = 1.6 * s; circ(ctx, cx, cy, 14 * s); ctx.stroke();
      } else drawShip(PV.shipA, PV.go2, ax, ay, Math.cos(t * 1.1 + 1.4));
      drawShip(PV.ship, PV.gc, nx, ny, wreck ? 0 : Math.cos(t * 1.05));
      if (cyc >= 7.4 && cyc < 8.1) {                // SAUVÉ : anneau blanc
        const kk = (cyc - 7.4) / 0.7;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - kk).toFixed(2) + ')'; ctx.lineWidth = 3 * s * (1 - kk) + 0.5;
        circ(ctx, ax, ay, (10 + 50 * kk) * s); ctx.stroke();
      }
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)']);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // le jeu
  // ===========================================================================
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const ICON_BOMB = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="11" cy="14" r="7" fill="currentColor"/><path d="M15 8 L17.5 5.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M19 2.5 l0.9 2 2 0.9 -2 0.9 -0.9 2 -0.9 -2 -2 -0.9 2 -0.9z" fill="#ffd34d"/><circle cx="8.6" cy="11.6" r="1.8" fill="rgba(255,255,255,.55)"/></svg>';

  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ------------------------------------------------------------- sons (sobres et limités)
    let rt = 0;                                  // temps réel écoulé (s)
    const sndLast = {};
    let sndBudget = 6;
    const later = [];
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.12 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rt - l < gap) return false;
      sndLast[ch] = rt; sndBudget--;
      return true;
    }
    function after(d, fn) { if (later.length < 40) later.push({ t: rt + d, fn }); }
    const SFX = {
      shot() { if (canPlay('shot', 0.12)) tone(1180 + Math.random() * 140, 0.03, 'triangle', 0.01, 820); },
      hit() { if (canPlay('hit', 0.07)) tone(380 + Math.random() * 90, 0.025, 'square', 0.011, 240); },
      clink() { if (canPlay('clink', 0.1)) tone(1900, 0.03, 'square', 0.014, 1500); },
      pop() { if (canPlay('pop', 0.045)) { noise(0.16, 0.06, 2600); tone(240, 0.11, 'triangle', 0.03, 80); } },
      boom() { if (canPlay('boom', 0.09)) { noise(0.45, 0.13, 1500); tone(110, 0.36, 'sawtooth', 0.035, 34); } },
      big() { if (canPlay('big', 0.16)) { noise(1.1, 0.22, 1100); tone(72, 0.9, 'sawtooth', 0.055, 22); tone(150, 0.5, 'square', 0.022, 40); } },
      pick(k) {
        if (!canPlay('pick', 0.05)) return;
        const b = k === 'S' ? 523 : k === 'B' ? 330 : k === 'A' ? 600 : 440;
        tone(b, 0.08, 'triangle', 0.05); after(0.07, () => tone(b * 1.26, 0.08, 'triangle', 0.05)); after(0.14, () => tone(b * 1.5, 0.13, 'triangle', 0.05));
      },
      shard(n) { if (canPlay('shard', 0.04)) tone(1300 + Math.min(30, n) * 40, 0.04, 'sine', 0.016); },
      shield() { noise(0.3, 0.16, 2200); tone(330, 0.26, 'square', 0.05, 110); },
      bomb() { noise(1.4, 0.25, 3000); tone(55, 1.1, 'sawtooth', 0.065, 25); after(0.1, () => tone(880, 0.5, 'sine', 0.035, 110)); },
      hyper() { tone(180, 0.6, 'sawtooth', 0.045, 1400); after(0.12, () => tone(660, 0.5, 'triangle', 0.05, 1320)); noise(0.6, 0.1, 4000); },
      hyReady() { tone(659, 0.09, 'triangle', 0.045); after(0.08, () => tone(988, 0.09, 'triangle', 0.045)); after(0.16, () => tone(1319, 0.28, 'triangle', 0.05, 1760)); },
      weak() { if (canPlay('weak', 0.08)) tone(760 + Math.random() * 80, 0.03, 'triangle', 0.012, 1100); },
      warn() { tone(620, 0.22, 'square', 0.035, 600); after(0.26, () => tone(460, 0.22, 'square', 0.035, 460)); },
      charge() { if (canPlay('charge', 0.25)) tone(260, 0.55, 'sawtooth', 0.02, 900); },
      laser() { if (canPlay('laser', 0.18)) { noise(0.5, 0.07, 3500); tone(150, 0.45, 'sawtooth', 0.025, 120); } },
      zap() { if (canPlay('zap', 0.12)) { noise(0.35, 0.15, 5000); tone(90, 0.3, 'square', 0.035, 40); } },
      jump() { tone(110, 2.2, 'sawtooth', 0.04, 1600); noise(2.4, 0.1, 2600); },
      ready() { tone(660, 0.12, 'triangle', 0.05); },
      go() { tone(990, 0.25, 'triangle', 0.05); tone(1320, 0.3, 'triangle', 0.035); },
      phase() { tone(240, 0.35, 'square', 0.035, 480); noise(0.3, 0.08, 2000); },
      death() { noise(1.8, 0.28, 1200); tone(90, 1.6, 'sawtooth', 0.065, 20); after(0.25, () => noise(1.2, 0.18, 700)); },
      friend() { tone(523, 0.1, 'triangle', 0.045); after(0.1, () => tone(659, 0.1, 'triangle', 0.045)); after(0.2, () => tone(784, 0.16, 'triangle', 0.045)); },
      sad() { tone(392, 0.2, 'triangle', 0.04, 370); after(0.2, () => tone(330, 0.32, 'triangle', 0.04, 300)); }
    };

    // ------------------------------------------------------------- têtes des copains (Ajouts 1 et 2)
    let heads = [], lastHead = null;
    const seenNames = new Set();
    function fetchHeads() {
      try {
        const l = typeof api.heads === 'function' ? api.heads() : [];
        heads = Array.isArray(l) ? l.filter((h) => h && imgOk(h.img)) : [];
      } catch (e) { heads = []; }
    }
    function pickHead() {
      if (!heads.length) return null;
      let h = pick(heads);
      if (heads.length > 1 && h === lastHead) h = pick(heads);
      lastHead = h;
      return h;
    }
    function headName(h) {
      const n = String((h && h.name) || 'un copain').trim().toUpperCase();
      return n.length > 12 ? n.slice(0, 11) + '.' : n;
    }
    function sadImg(h) { return h && imgOk(h.sad) ? h.sad : h ? h.img : null; }
    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }
    fetchHeads();

    // ------------------------------------------------------------- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    const style = document.createElement('style');
    style.textContent = '@keyframes gwPulse{0%,100%{box-shadow:0 0 0 2px rgba(255,63,180,.6),0 0 16px rgba(255,63,180,.55)}' +
      '50%{box-shadow:0 0 0 3px rgba(255,255,255,.95),0 0 30px rgba(255,63,180,.95)}}';
    root.appendChild(style);
    const BTN = 'position:absolute;display:flex;align-items:center;justify-content:center;padding:0;margin:0;cursor:pointer;touch-action:none;' +
      'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;z-index:3;box-sizing:border-box;';
    function mkBtn(label, css) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', label); b.style.cssText = BTN + css;
      root.appendChild(b);
      return b;
    }
    const pauseBtn = mkBtn('Pause', 'top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:1.5px solid rgba(56,225,255,.5);' +
      'background:rgba(3,10,18,.72);color:#e9f0f3;');
    pauseBtn.innerHTML = ICON_PAUSE;
    const bombBtn = mkBtn('Bombe', 'width:62px;height:62px;border-radius:50%;border:2px solid rgba(255,77,109,.9);color:#ffd6de;flex-direction:column;' +
      'background:radial-gradient(circle at 50% 38%,rgba(90,12,36,.9),rgba(12,4,10,.88));font:11px ' + FD.replace(/"/g, "'") + ';line-height:1;gap:1px;');
    const hyperBtn = mkBtn('Hyper', 'width:62px;height:62px;border-radius:50%;border:0;color:#ffe0f4;' +
      'font:10px ' + FD.replace(/"/g, "'") + ';line-height:1;');
    const hyperIn = document.createElement('span');
    hyperIn.style.cssText = 'position:absolute;inset:5px;border-radius:50%;background:radial-gradient(circle at 50% 38%,rgba(70,10,60,.95),rgba(10,3,12,.95));' +
      'display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;';
    hyperIn.innerHTML = '<span style="font-size:15px">⚡</span><span>HYPER</span>';
    hyperBtn.appendChild(hyperIn);
    let bombShown = -1, hyperShown = -1, hyperReadyShown = null, hyperGlowShown = false;

    // ------------------------------------------------------------- images d'ILO (api.assets) — repli dessiné
    let IMGP = null, IMGN = null, loading = true;
    function planetImg(i) { return IMGP ? IMGP[((i % IMGP.length) + IMGP.length) % IMGP.length] : procPlanets()[((i % 12) + 12) % 12]; }
    try {
      const pr = typeof api.assets === 'function' ? api.assets() : null;
      if (pr && typeof pr.then === 'function') {
        pr.then((a) => {
          if (destroyed) return;
          const ps = a && Array.isArray(a.planets) ? a.planets.filter(imgOk) : [];
          const ns = a && Array.isArray(a.nebulas) ? a.nebulas.filter(imgOk) : [];
          if (ps.length >= 8) IMGP = ps;
          if (ns.length) IMGN = ns;
          loading = false;
          assetsChanged();
        }, () => { loading = false; });
      } else loading = false;
    } catch (e) { loading = false; }

    // ------------------------------------------------------------- taille, échelle, sprites
    let cw = 1, ch = 1, dpr = 1, quality = 1, scale = 1, colX = 0, colY = 0, colW = 1, colH = 1, LH = 620, K = 1, RES = 0;
    let SPR = null;
    const GL = { c: mkGlow('#38e1ff'), m: mkGlow('#ff3fb4'), o: mkGlow('#ff9a1f', true), y: mkGlow('#ffd34d'), w: mkGlow('#ffffff'),
      r: mkGlow('#ff3b3b'), g: mkGlow('#46f08a'), v: mkGlow('#a45cff'), b: mkGlow('#4d7cff') };
    const FIRE = mkFire(), SMOKE = mkSmoke();
    const LIGHT = (() => {                       // lumière à profil plat (zone sombre)
      const cv = mkCanvas(64, 64), c = cv.getContext('2d');
      c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(255,255,255,1)', 0.45, 'rgba(255,255,255,0.95)', 0.75, 'rgba(255,255,255,0.45)', 1, 'rgba(255,255,255,0)']);
      c.fillRect(0, 0, 64, 64);
      return cv;
    })();
    function mkSpr(w, h, fn) {
      const cv = mkCanvas(w * RES, h * RES), c = cv.getContext('2d');
      c.setTransform(RES, 0, 0, RES, cv.width / 2, cv.height / 2);
      try { fn(c); } catch (e) { /* un sprite raté ne casse pas le jeu */ }
      return { cv, w, h };
    }
    function buildSprites() {
      const S = {};
      S.ship = [];
      for (let i = 0; i < 9; i++) S.ship.push(mkSpr(50, 56, (c) => paintShip(c, (i - 4) / 4, PAL_NOIR)));
      if (CO) coopSprites(S);
      S.eb = {};
      for (const k of BKEYS) {
        const cl = BCOL[k];
        S.eb[k] = [mkSpr(20, 20, (c) => paintOrb(c, 4.6, cl[0], cl[1])), mkSpr(34, 34, (c) => paintOrb(c, 8, cl[0], cl[1])),
          mkSpr(14, 24, (c) => paintNeedle(c, cl[0], cl[1])), mkSpr(16, 22, (c) => paintRice(c, cl[0], cl[1]))];
      }
      S.bolt = mkSpr(8, 34, (c) => paintBolt(c, 3, 32, '#38e1ff', '#ffffff'));
      S.heavy = mkSpr(12, 38, (c) => paintBolt(c, 4.6, 36, '#38e1ff', '#effdff'));
      S.laser = mkSpr(8, 42, (c) => paintBolt(c, 2.4, 40, '#7fd8ff', '#ffffff'));
      S.plasma = mkSpr(18, 30, (c) => paintBolt(c, 8, 28, '#6a8cff', '#ffffff'));
      S.hyperB = mkSpr(14, 36, (c) => paintBolt(c, 6, 34, '#ff3fb4', '#ffffff'));
      S.optB = mkSpr(7, 16, (c) => paintBolt(c, 2.6, 14, '#b37bff', '#ffffff'));
      S.missile = mkSpr(10, 18, paintMissile);
      S.shard = mkSpr(14, 14, paintShard);
      S.cap = {};
      for (const k in CAPS) S.cap[k] = mkSpr(32, 32, (c) => paintCap(c, k, FD));
      S.debris = [];
      for (let i = 0; i < 4; i++) S.debris.push(mkSpr(10, 10, (c) => paintDebris(c, i)));
      S.swarm = mkSpr(34, 32, paintSwarm);
      S.dart = mkSpr(22, 32, paintDart);
      S.carrier = mkSpr(38, 32, paintCarrier);
      S.frigate = mkSpr(50, 54, paintFrigate);
      S.turret = mkSpr(16, 32, (c) => paintTurret(c));
      S.turretV = mkSpr(20, 40, (c) => { c.scale(1.3, 1.3); paintTurret(c, '#ffd34d'); });
      S.rock = { L: [], M: [], S: [], RL: [], RM: [] };
      for (let i = 0; i < 3; i++) {
        S.rock.L.push(mkSpr(62, 62, (c) => paintRock(c, 27, i + 1, false)));
        S.rock.M.push(mkSpr(38, 38, (c) => paintRock(c, 16.5, i + 11, false)));
        S.rock.S.push(mkSpr(22, 22, (c) => paintRock(c, 9.5, i + 21, false)));
      }
      S.rock.RL.push(mkSpr(62, 62, (c) => paintRock(c, 27, 7, true)));
      S.rock.RM.push(mkSpr(38, 38, (c) => paintRock(c, 16.5, 17, true)));
      S.miner = mkSpr(46, 30, paintMiner);
      S.mine = mkSpr(22, 22, paintMine);
      S.sentinel = mkSpr(42, 40, paintSentinel);
      S.snakeH = mkSpr(32, 44, paintSnakeHead);
      S.snakeB = mkSpr(24, 24, (c) => paintSnakeSeg(c, 10));
      S.cruiser = mkSpr(64, 64, paintCruiser);
      S.stealth = mkSpr(34, 30, paintStealth);
      S.weaverB = mkSpr(22, 22, paintWeaverBody);
      S.weaverW = mkSpr(42, 42, paintWeaverBlades);
      S.elite = mkSpr(66, 60, paintElite);
      S.glass = mkSpr(34, 34, (c) => paintBubbleGlass(c, 16));
      S.pilot = mkSpr(34, 34, (c) => paintPilot(c, 16));
      S.drone = mkSpr(18, 24, paintDrone);
      S.vela = mkSpr(290, 140, paintVela);
      S.wormH = mkSpr(66, 76, paintWormHead);
      S.wormS = [mkSpr(42, 42, (c) => paintWormSeg(c, 18)), mkSpr(36, 36, (c) => paintWormSeg(c, 15)), mkSpr(30, 30, (c) => paintWormSeg(c, 12))];
      S.queen = mkSpr(80, 124, (c) => { c.translate(0, 4); paintQueenBody(c); });
      S.qwing = mkSpr(120, 72, (c) => { c.translate(58, 0); paintQueenWing(c); });
      S.gaiaRing = mkSpr(220, 220, (c) => paintGaiaRing(c, 96));
      S.gaiaNode = mkSpr(26, 30, paintGaiaNode);
      S.gaiaCore = mkSpr(64, 64, paintGaiaCore);
      S.disk = mkSpr(240, 240, (c) => paintDisk(c, 115));
      S.blanc = [];
      for (let i = 0; i < 3; i++) S.blanc.push(mkSpr(118, 132, (c) => { c.rotate(Math.PI); c.scale(2.3, 2.3); paintShip(c, (1 - i) * 0.6, PAL_BLANC); }));
      S.gard = {};
      SPR = S;
    }
    function gardSpr(hue) {
      const k = Math.round(hue);
      if (!SPR.gard[k]) SPR.gard[k] = mkSpr(116, 92, (c) => paintGardien(c, k));
      return SPR.gard[k];
    }
    // dans les polices tardives (Bungee), on redessine les capsules
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed && SPR) { for (const k in CAPS) SPR.cap[k] = mkSpr(32, 32, (c) => paintCap(c, k, FD)); } }); } catch (e) { /* rien */ }

    function resize() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      cw = Math.max(1, r.width); ch = Math.max(1, r.height);
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      const oldLH = LH;
      colW = Math.min(cw, ch * 0.64);
      LH = clamp((LW * ch) / colW, 480, 760);
      if (GUEST && NET.lh) LH = NET.lh;            // (coop en ligne : le terrain de l'hôte, à l'échelle de mon écran)
      scale = colW / LW;
      if (LH * scale > ch) { scale = ch / LH; colW = LW * scale; }
      colH = LH * scale;
      colX = (cw - colW) / 2; colY = (ch - colH) / 2;
      K = scale * dpr;
      const nr = clamp(K, 0.6, 4);
      if (!SPR || Math.abs(nr - RES) > 0.04) { RES = nr; buildSprites(); }
      if (oldLH !== LH) for (let i = 0; i < SHIPS.length; i++) SHIPS[i].y = clamp(SHIPS[i].y * LH / oldLH, 70, LH - 30);
      bgDirty = true;
      layoutButtons();
      initStars();
      if (!raf || paused) render();
    }
    function sideW() { return colX; }
    function layoutButtons() {
      const side = sideW();
      const bot = 'calc(14px + env(safe-area-inset-bottom, 0px))';
      if (side >= 96) {
        bombBtn.style.left = Math.round(colX - 62 - 18) + 'px';
        hyperBtn.style.left = Math.round(colX + colW + 18) + 'px';
      } else {
        bombBtn.style.left = Math.round(colX + 10) + 'px';
        hyperBtn.style.left = Math.round(colX + colW - 72) + 'px';
      }
      bombBtn.style.bottom = bot; hyperBtn.style.bottom = bot;
      bombBtn.style.top = 'auto'; hyperBtn.style.top = 'auto';
    }

    // ------------------------------------------------------------- état général
    let state = 'load', stT = 0, paused = false, T = 0, playT = 0;
    let score = 0, mult = 1, chain = 0, chainT = 0, multPop = 0, kills = 0, dropAcc = 0;
    const MULT_AT = [0, 8, 20, 36, 56, 82, 114, 155];
    const PDECAY = 20, ARMS_T = 20;                // la puissance perd 1 niveau toutes les 20 s sans capsule P ; missiles et drones durent 20 s
    let secI = 0, cycle = 0, L = 0, SEC = SECTORS[0], secHue = SECTORS[0].hue, secNoHit = true, sectorsDone = 0, bossCount = 0;
    let shake = 0, flashA = 0, flashCol = '#ffffff', freezeT = 0, slowT = 0, slowK = 1, hyperTint = 0, glitch = 0;
    let scrollV = 60, warp = 0, bgDirty = true, god = false, overSent = false, deathT = 0, deadInfo = null;
    let ptCap = MAXPT;
    let B = null;                                // boss en cours
    let onFrame = null;                          // crochet de test (_debug)
    // les vaisseaux : SHIPS[0] = celui du joueur (le seul en solo ; en coop : l'hôte, ou l'humain avec un robot), SHIPS[1] = le coéquipier.
    // P = MON vaisseau (entrées, HUD, caméra). Chaque vaisseau a ses drones (OPT : positions lissées) et sa traînée (TRAIL : bouts d'ailes).
    function mkShip(i) {
      const s = {
        x: LW / 2, y: 520, px: LW / 2, py: 520, vx: 0, vy: 0, bank: 0, alive: true, vis: true, shield: 0, inv: 0, power: 1, miss: 0, opts: 0, bombs: 1, pT: 0, missLeft: 0, optLeft: 0,
        hyper: 0, hyperT: 0, fireT: 0, missT: 0, optT: 0, optA: 0, magT: 0, hitFlash: 0, auto: 0, ax: 0, ay: 0, volley: 0, side: 0,
        i, OPT: [], TRAIL: new Float32Array(2 * 16), trailN: 0, trailT: 0
      };
      for (let k = 0; k < 4; k++) s.OPT.push({ x: LW / 2, y: 520 });
      return s;
    }
    const CO = api.coop && typeof api.coop === 'object' ? api.coop : null;   // mode coop (COOP-CONTRACT.md) ; null en solo : rien ne change
    const SHIPS = [mkShip(0)];
    if (CO) SHIPS.push(mkShip(1));
    const ME = CO && CO.me === 1 ? 1 : 0;          // le vaisseau de CET appareil (1 chez l'invité en ligne)
    const P = SHIPS[ME];
    let AIM = P;                                 // vaisseau visé par l'ennemi en cours (solo : toujours P)
    let HITBY = 0;                               // vaisseau dont le tir vient de toucher (abattus, éclats, jauge HYPER)

    // ------------------------------------------------------------- départ à un niveau et graine (CONTRACT.md Ajout 6)
    // api.startLevel (outil de test) : départ direct au niveau cycle * 8 + secteur (borné à 80 = cycle X secteur 8).
    // api.seed : le hasard du jeu (vagues, groupes, événements, ennemis, mini-boss, boss, capsules, éclats) vient de mulberry32,
    // re-grainé par secteur, vague, groupe, salve, ennemi et boss → même partie à graine égale, quoi que fassent les joueurs.
    // Les effets (particules, explosions, étoiles, décor, sons, tremblements) et le choix des têtes restent sur Math.random.
    // Sans graine, rng et luck restent null : exactement les mêmes appels à Math.random qu'avant.
    const START = Math.min(80, Math.max(1, Math.floor(Number(api.startLevel)) || 1));
    const SEED = typeof api.seed === 'number' && Number.isFinite(api.seed) ? api.seed >>> 0 : null;
    let lvlSeed = 0, rng = null, luck = null;      // rng : tirage du contenu en cours ; luck : capsules du secteur
    const crand = () => (rng ? rng() : Math.random());
    const crnd = (a, b) => a + crand() * (b - a);
    const crndi = (a, b) => a + Math.floor(crand() * (b - a + 1));
    const cchance = (p) => crand() < p;
    const lrand = () => (luck ? luck() : Math.random());
    function subRng(k) { return mulberry32((lvlSeed ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0); }

    // ------------------------------------------------------------- réserves d'objets (pas d'allocation en jeu)
    function pool(n, mk) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = mk(); return a; }
    const EB = pool(MAXEB, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 4, col: 'p', sz: 0, t: 0, acc: 0, turn: 0, rot: false, spr: null, delay: 0, life: 99, id: 0 }));
    const PS = pool(MAXPS, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: 3, dmg: 1, spr: null, pierce: false, h1: 0, h2: 0, h3: 0, ang: 0, kind: 0, o: 0 }));
    const MS = pool(MAXMS, () => ({ x: 0, y: 0, vx: 0, vy: 0, tgt: null, tuid: 0, life: 0, smT: 0, o: 0 }));
    const PT = pool(MAXPT, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s0: 1, s1: 0, img: null, add: true, drag: 0, rot: 0, vr: 0, a0: 1, spr: null }));
    const RG = pool(MAXRG, () => ({ x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 1, col: '#fff', w: 2 }));
    const TX = pool(MAXTX, () => ({ x: 0, y: 0, s: '', col: '#fff', size: 12, life: 0, max: 1, vy: 0, font: 0 }));
    const SH = pool(MAXSH, () => ({ x: 0, y: 0, vx: 0, vy: 0, t: 0, mag: false, o: 0 }));
    const CP = pool(MAXCP, () => ({ x: 0, y: 0, vx: 0, vy: 0, k: 'P', t: 0, pm: 0, pmT: 0, id: 0 }));
    const LT = pool(MAXLT, () => ({ x: 0, y: 0, r: 0, life: 0, max: 1 }));
    const EN = pool(MAXEN, () => ({ uid: 0, type: '', alive: false }));
    let ebN = 0, psN = 0, msN = 0, ptN = 0, rgN = 0, txN = 0, shN = 0, cpN = 0, ltN = 0, enN = 0, uidSeq = 1;
    const FACES = [];                            // têtes tristes qui s'envolent
    const BEAMS = [];                            // rayons (sentinelles, boss) : avertissement puis tir
    const BOLTS = [];                            // éclairs de la tempête
    const GATES = [];                            // portes laser
    let hole = null;                             // trou noir
    let darkOn = false, darkK = 0;

    function swapOut(arr, i, n) { const o = arr[i]; arr[i] = arr[n - 1]; arr[n - 1] = o; }

    // ------------------------------------------------------------- difficulté
    let early = true;                            // la première minute est douce
    const spdMul = () => Math.min(2.3, 0.98 + 0.11 * L + 0.2 * cycle) * (early ? 0.9 : 1);
    const fireMul = () => (early ? 0.6 : 1) * Math.min(4, 0.8 + 0.36 * L + 0.5 * cycle) * (CO ? FIREK : 1);
    // « rang » : plus le joueur est armé, plus les ennemis encaissent (et l'inverse quand il perd de la puissance)
    const rank = () => CO ? teamRank() : 1 + 0.08 * (P.power - 1) + 0.05 * P.miss + 0.03 * P.opts;
    const hpMul = () => (1 + 0.6 * L + 1.0 * cycle) * rank();
    const densMul = () => CO ? teamDens() : Math.min(2.6, 1.1 + 0.1 * L + 0.15 * cycle);

    // ------------------------------------------------------------- balles ennemies
    const BREMAP = [null, { o: 'p', y: 'v' }, { g: 'o' }, { v: 'y' }, null, { r: 'y', p: 'g' }, { p: 'y', v: 'g' }, { y: 'v', o: 'p' }];
    function eb(x, y, vx, vy, col, sz) {
      if (ebN >= MAXEB) return null;
      const rm = BREMAP[secI];
      if (rm && rm[col]) col = rm[col];
      const b = EB[ebN++];
      b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.col = col; b.sz = sz;
      b.r = sz === 1 ? 7.2 : sz === 0 ? 4.1 : 3.3;
      b.t = 0; b.acc = 0; b.turn = 0; b.delay = 0; b.life = 99;
      b.spr = SPR.eb[col][sz]; b.rot = sz >= 2;
      if (CO) { b.vx *= BSPD; b.vy *= BSPD; b.id = ++ebSeq; if (NETH) netBorn(b); }
      return b;
    }
    function ebA(x, y, ang, spd, col, sz) { return eb(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, col, sz); }
    function aimAt(x, y) { return Math.atan2(AIM.y - y, AIM.x - x); }
    function fireAimed(x, y, spd, col, sz, n, spread) {
      const a = aimAt(x, y), v = spd * spdMul();
      if (n <= 1) { ebA(x, y, a, v, col, sz); return; }
      for (let i = 0; i < n; i++) ebA(x, y, a + (i - (n - 1) / 2) * spread, v, col, sz);
    }
    function fireRing(x, y, n, spd, col, sz, off) {
      const v = spd * spdMul();
      for (let i = 0; i < n; i++) ebA(x, y, off + (i * TAU) / n, v, col, sz);
    }
    function fireArc(x, y, ang, width, n, spd, col, sz) {
      const v = spd * spdMul();
      for (let i = 0; i < n; i++) ebA(x, y, ang + (n > 1 ? (i / (n - 1) - 0.5) * width : 0), v, col, sz);
    }
    function cancelBullets(x, y, r, toShards) {
      const r2 = r * r;
      if (NETH) netEvt(['X', Math.round(x), Math.round(y), Math.round(r), toShards ? 1 : 0]);
      for (let i = ebN - 1; i >= 0; i--) {
        const b = EB[i];
        if (r > 0) { const dx = b.x - x, dy = b.y - y; if (dx * dx + dy * dy > r2) continue; }
        if (toShards && shN < MAXSH && (i & 1) === 0) { const s = SH[shN++]; s.x = b.x; s.y = b.y; s.vx = 0; s.vy = -20; s.t = 0; s.mag = true; s.o = i & 1; }
        part(b.x, b.y, 0, 0, 0.25, 8, 18, GL[b.col === 'g' ? 'g' : b.col === 'v' ? 'v' : b.col === 'y' ? 'y' : b.col === 'o' ? 'o' : 'm'], true, 0);
        swapOut(EB, i, ebN); ebN--;
      }
    }

    // ------------------------------------------------------------- effets
    function part(x, y, vx, vy, life, s0, s1, img, add, drag) {
      if (ptN >= ptCap) return null;
      const p = PT[ptN++];
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.s0 = s0; p.s1 = s1;
      p.img = img; p.add = add; p.drag = drag || 0; p.rot = 0; p.vr = 0; p.a0 = 1; p.spr = null;
      return p;
    }
    function sparks(x, y, n, g, spd, life, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        part(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.6), 0, g, true, 2.2);
      }
    }
    function debris(x, y, n, spd) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        const p = part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.7, 1, 1, null, false, 1.2);
        if (!p) return;
        p.spr = SPR.debris[i & 3]; p.rot = Math.random() * TAU; p.vr = rnd(-9, 9); p.s0 = p.s1 = 0.8 + Math.random() * 0.8;
      }
    }
    function ring(x, y, r0, r1, life, col, w) {
      if (rgN >= MAXRG) return;
      const g = RG[rgN++];
      g.x = x; g.y = y; g.r0 = r0; g.r1 = r1; g.life = life; g.max = life; g.col = col; g.w = w;
    }
    function ftext(x, y, s, col, size, life, vy, font) {
      if (txN >= MAXTX) { swapOut(TX, 0, txN); txN--; }
      const t = TX[txN++];
      t.x = x; t.y = y; t.s = s; t.col = col; t.size = size; t.life = life; t.max = life; t.vy = vy == null ? -26 : vy; t.font = font || 0;
    }
    function light(x, y, r, life) {
      if (!darkOn || ltN >= MAXLT) return;
      const l = LT[ltN++];
      l.x = x; l.y = y; l.r = r; l.life = life; l.max = life;
    }
    function glowOf(col) { return GL[col] || GL.o; }
    // explosion : taille 1 (petit), 2 (moyen), 3 (gros), 4 (énorme)
    function explode(x, y, size, col) {
      const g = glowOf(col || 'o');
      part(x, y, 0, 0, 0.14 + 0.05 * size, 22 * size, 44 * size, GL.w, true, 0);
      part(x, y, 0, 0, 0.32 + 0.12 * size, 12 * size, 38 * size, FIRE, true, 0);
      if (size >= 2) part(x + rnd(-6, 6) * size, y + rnd(-6, 6) * size, 0, 0, 0.4 + 0.1 * size, 10 * size, 30 * size, FIRE, true, 0);
      sparks(x, y, 4 + size * 4, g, 70 + size * 45, 0.5, 6 + size);
      for (let i = 0; i < size; i++) {
        const p = part(x + rnd(-8, 8), y + rnd(-8, 8), rnd(-14, 14), rnd(-14, 14) + scrollV * 0.3, 0.9 + 0.3 * size, 10 + 6 * size, 26 + 12 * size, SMOKE, false, 0.6);
        if (p) p.a0 = 0.8;
      }
      if (size >= 2) { debris(x, y, 2 + size * 2, 60 + size * 30); ring(x, y, 6, 22 + 18 * size, 0.35 + 0.08 * size, size >= 3 ? '#ffe2b0' : '#ffd08a', 2 + size * 0.6); }
      light(x, y, 50 + 30 * size, 0.35 + 0.15 * size);
      shake = Math.max(shake, size * 2.2);
    }
    function addFace(h, x, y, txt, size) {
      if (!h) return;
      if (FACES.length >= 5) FACES.shift();
      const sz = size || 54;
      FACES.push({ img: sadImg(h), x: clamp(x, sz * 0.5, LW - sz * 0.5), y: clamp(y, 90 + sz * 0.5, LH - 80), t: 0, txt, size: sz, life: sz > 60 ? 3.2 : 2.4 });
      SFX.sad();
    }

    // ------------------------------------------------------------- score et combo
    function addPts(base, x, y, show) {
      const v = Math.round(base * mult * (CO ? coopHy() * PTK : P.hyperT > 0 ? 2 : 1));
      score += v;
      if (show) ftext(x, y, '+' + fmt(v), '#fff3c4', base >= 1500 ? 15 : 12, 0.9, -30, 0);
      return v;
    }
    function bumpChain(k) {
      chain += k; chainT = 2.6;
      let m = 1;
      while (m < 8 && chain >= MULT_AT[m]) m++;
      if (m > mult) { mult = m; multPop = 1; if (canPlay('mult', 0.2)) tone(500 + m * 80, 0.12, 'triangle', 0.035, 700 + m * 90); }
    }
    function addHyper(v, s) {
      if (s.hyperT > 0) return;
      s.hyper = Math.min(1, s.hyper + v * 0.275);
    }
    // pendant un boss, chaque dégât porté recharge l'HYPER : la jauge s'illumine (hyGlow), puis « HYPER PRÊT ! » (hyCue)
    let hyGlow = 0, hyCue = -1, hyFull = false;
    function bossHyper(d, s) {
      if (s.hyperT > 0 || s.hyper >= 1 || !B || !(B.maxHp > 0) || d <= 0) return;
      const v = d / (B.maxHp * HYB);
      s.hyper = Math.min(1, s.hyper + v);
      if (s === P) hyGlow = Math.min(1, hyGlow + 0.06 + v * 8);
    }
    function hyperReadyCue() {                   // la jauge vient d'être pleine : titre bref qui file vers la jauge, anneau, carillon
      hyCue = 0; hyGlow = 1;
      ring(P.x, P.y, 12, 64, 0.5, '#ff7ad8', 2.5);
      SFX.hyReady();
    }

    // ------------------------------------------------------------- éclats et capsules
    function shards(x, y, n) {
      for (let i = 0; i < n && shN < MAXSH; i++) {
        const s = SH[shN++], a = crand() * TAU, v = 30 + crand() * 100;
        s.x = x + crnd(-4, 4); s.y = y + crnd(-4, 4); s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v - 30; s.t = 0; s.mag = false; s.o = HITBY;
      }
    }
    function capsule(x, y, k) {
      if (cpN >= MAXCP) return;
      const c = CP[cpN++];
      c.x = clamp(x, 20, LW - 20); c.y = y; c.vx = crnd(-18, 18); c.vy = -50; c.k = k; c.t = 0;
      if (CO) { c.id = ++cpSeq; promise(c); }
    }
    function chooseCap() {
      // capsule au hasard : la puissance, la bulle et les bombes sont rares
      const r = lrand(), cs = CO ? needyShip() : P;
      if (r < 0.22) return cs.power < 6 ? 'P' : 'M';
      if (r < 0.44) return 'M';
      if (r < 0.66) return 'O';
      if (r < 0.76) return cs.bombs < 2 ? 'B' : 'A';
      if (r < 0.82) return cs.shield < 1 ? 'S' : 'A';
      return 'A';
    }

    // ------------------------------------------------------------- joueur : commandes et armes
    const keys = { l: false, r: false, u: false, d: false };
    let dragDX = 0, dragDY = 0, mouseTX = -1, mouseTY = -1, shardRun = 0, shardRunT = 0;
    const KSPD = 255;
    // salves selon la puissance : [décalage x, angle (degrés), sorte] — sorte : 0 tir, 1 lourd, 2 laser latéral, 3 plasma
    const VOL = [
      [[-4.5, 0, 0], [4.5, 0, 0]],
      [[-6, 0, 0], [6, 0, 0], [0, 0, 1]],
      [[-6, 0, 0], [6, 0, 0], [0, 0, 1], [-9, -7, 0], [9, 7, 0]],
      [[-6, 0, 0], [6, 0, 0], [0, 0, 1], [-9, -7, 0], [9, 7, 0], [-11, -15, 0], [11, 15, 0]],
      [[-6, 0, 0], [6, 0, 0], [0, 0, 1], [-9, -7, 0], [9, 7, 0], [-11, -15, 0], [11, 15, 0], [-17, -2, 2], [17, 2, 2]],
      [[-6, 0, 0], [6, 0, 0], [0, 0, 3], [-9, -6, 0], [9, 6, 0], [-11, -13, 0], [11, 13, 0], [-13, -22, 0], [13, 22, 0], [-17, -2, 2], [17, 2, 2]]
    ];
    function shot(x, y, angDeg, spd, kind, o) {
      if (psN >= MAXPS) return;
      const s = PS[psN++], a = angDeg * Math.PI / 180;
      s.x = s.px = x; s.y = s.py = y; s.vx = Math.sin(a) * spd; s.vy = -Math.cos(a) * spd; s.ang = a; s.kind = kind;
      s.h1 = s.h2 = s.h3 = 0; s.o = o;
      if (kind === 0) { s.spr = SPR.bolt; s.dmg = angDeg === 0 ? 1 : 0.75; s.r = 3; s.pierce = false; }
      else if (kind === 1) { s.spr = SPR.heavy; s.dmg = 1.5; s.r = 4; s.pierce = false; }
      else if (kind === 2) { s.spr = SPR.laser; s.dmg = 1.1; s.r = 3; s.pierce = true; }
      else if (kind === 3) { s.spr = SPR.plasma; s.dmg = 3; s.r = 6; s.pierce = false; }
      else if (kind === 4) { s.spr = SPR.hyperB; s.dmg = 1.7; s.r = 5; s.pierce = true; }
      else { s.spr = SPR.optB; s.dmg = 0.8; s.r = 2.5; s.pierce = false; }
      if (CO && o === 1) s.spr = coopShotSpr(kind, s.spr);   // tirs ambrés du Vaisseau Ambre (l'HYPER reste rose)
    }
    function fireMain(s) {
      const V = VOL[clamp(s.power, 1, 6) - 1], hyp = s.hyperT > 0;
      for (let i = 0; i < V.length; i++) { const v = V[i]; shot(s.x + v[0], s.y - 20, v[1], 900, hyp ? 4 : v[2], s.i); }
      if (hyp) for (let i = -2; i <= 2; i++) if (i) shot(s.x + i * 6, s.y - 10, i * 12, 900, 4, s.i);
      part(s.x, s.y - 22, 0, 0, 0.06, 10, 16, hyp ? GL.m : GL.c, true, 0);
      s.volley++;
      if (s.volley % 3 === 0) SFX.shot();
    }
    function launchMissiles(sh) {
      const n = sh.miss * 2;
      for (let i = 0; i < n && msN < MAXMS; i++) {
        const m = MS[msN++], s = i & 1 ? 1 : -1, k = i >> 1;
        m.x = sh.x + s * 9; m.y = sh.y + 2; m.vx = s * (80 + 35 * k); m.vy = -40 - 30 * k; m.tgt = null; m.tuid = 0; m.life = 2.8; m.smT = 0; m.o = sh.i;
      }
    }
    function nearestTarget(x, y) {
      let best = null, bd = 1e9;
      for (let j = 0; j < enN; j++) {
        const e = EN[j];
        if (!e.alive || e.delay > 0 || e.y < 0 || e.y > LH || e.type === 'mine') continue;
        const dx = e.x - x, dy = (e.y - y) * 1.4, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = e; }
      }
      if (B && B.parts && B.ready) {
        for (let j = 0; j < B.parts.length; j++) {
          const p = B.parts[j];
          if (!p.alive || p.hide || p.mode === 'block' || p.y < 0) continue;
          const dx = p.x - x, dy = (p.y - y) * 1.4, d = (dx * dx + dy * dy) * (p.mode === 'armor' ? 6 : 1);
          if (d < bd) { bd = d; best = p; }
        }
      }
      return best;
    }

    function updateShip(s, dt) {
      if (!s.alive) return;
      const ox = s.x, oy = s.y;
      if (s.auto > 0) {
        s.x += ((CO ? autoX(s) : LW / 2) - s.x) * Math.min(1, dt * 2.5);
        s.y += (LH - 130 - s.y) * Math.min(1, dt * 2.5);
        if (s === P) dragDX = dragDY = 0;
      } else if (CO && s !== P) {
        if (s.ai) aiMove(s, dt); else netMove(s, dt);
      } else if (CO && s.still) {
        dragDX = dragDY = 0;
      } else {
        const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (kx || ky) { const n = kx && ky ? 0.7071 : 1; s.x += kx * n * KSPD * dt; s.y += ky * n * KSPD * dt; mouseTX = -1; }
        if (dragDX || dragDY) { s.x += dragDX; s.y += dragDY; dragDX = dragDY = 0; }
        else if (mouseTX >= 0 && !kx && !ky) {
          const dx = mouseTX - s.x, dy = mouseTY - s.y, d = Math.sqrt(dx * dx + dy * dy), m = 640 * dt;
          if (d > 0.5) { const k = Math.min(1, m / d); s.x += dx * k; s.y += dy * k; }
        }
        if (hole) {                               // le trou noir attire le vaisseau
          const dx = hole.x - s.x, dy = hole.y - s.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
          const f = Math.min(95, 5200 / Math.max(50, d)) * hole.k * dt;
          s.x += (dx / d) * f; s.y += (dy / d) * f;
        }
      }
      if (s.auto <= 0) { s.x = clamp(s.x, 14, LW - 14); s.y = clamp(s.y, 66, LH - 26); }
      s.vx = (s.x - ox) / Math.max(dt, 1e-4); s.vy = (s.y - oy) / Math.max(dt, 1e-4);
      s.bank += (clamp(s.vx / 230, -1, 1) - s.bank) * Math.min(1, dt * 9);
      if (s.inv > 0) s.inv -= dt;
      if (s.hitFlash > 0) s.hitFlash -= dt * 2;
      if (s.magT > 0) s.magT -= dt;
      if (s.hyperT > 0) { s.hyperT -= dt; if (s.hyperT <= 0 && !GUEST) { s.hyperT = 0; ftext(s.x, s.y - 40, 'FIN DE L’HYPER', '#ffb3e6', 12, 1, -20, 0); } }
      if (state === 'play' && s.auto <= 0 && !GUEST) {        // la puissance redescend, missiles et drones s'épuisent
        if (s.power > 1) {
          s.pT += dt;
          if (s.pT >= PDECAY) { s.pT = 0; s.power--; ftext(s.x, s.y - 36, 'PUISSANCE ' + s.power + '…', '#8fc9e6', 11, 1.1, -16, 0); if (canPlay('pdown', 0.3)) tone(520, 0.2, 'triangle', 0.03, 260); }
        } else s.pT = 0;
        if (s.miss > 0) { s.missLeft -= dt; if (s.missLeft <= 0) { s.miss = 0; s.missLeft = 0; ftext(s.x, s.y - 48, 'MISSILES ÉPUISÉS', '#ffb066', 11, 1.1, -16, 0); } }
        if (s.opts > 0) { s.optLeft -= dt; if (s.optLeft <= 0) { s.opts = 0; s.optLeft = 0; ftext(s.x, s.y - 48, 'DRONES PARTIS', '#c9a6ff', 11, 1.1, -16, 0); } }
      }
      // trainée lumineuse des bouts d'ailes (le décor défile : la traînée descend)
      s.trailT -= dt;
      for (let i = 0; i < s.trailN; i++) s.TRAIL[i * 2 + 1] += scrollV * 1.6 * dt;
      if (s.trailT <= 0) {
        s.trailT = 0.025;
        for (let i = Math.min(s.trailN, 15); i > 0; i--) { s.TRAIL[i * 2] = s.TRAIL[i * 2 - 2]; s.TRAIL[i * 2 + 1] = s.TRAIL[i * 2 - 1]; }
        s.TRAIL[0] = s.x; s.TRAIL[1] = s.y + 16;
        s.trailN = Math.min(16, s.trailN + 1);
      }
      if (state !== 'play' || s.auto > 0) return;
      // tir automatique permanent
      s.fireT -= dt;
      if (s.fireT <= 0) { s.fireT += s.hyperT > 0 ? 0.06 : 0.075; if (s.fireT < 0) s.fireT = 0; fireMain(s); }
      if (s.miss > 0) { s.missT -= dt; if (s.missT <= 0) { s.missT = 0.72; launchMissiles(s); } }
      if (s.opts > 0) {
        s.optA += dt * 2.4;
        for (let i = 0; i < s.opts; i++) {
          const a = s.optA + (i * TAU) / s.opts, o = s.OPT[i];
          const tx = s.x + Math.cos(a) * 30, ty = s.y + 6 + Math.sin(a) * 12;
          o.x += (tx - o.x) * Math.min(1, dt * 14); o.y += (ty - o.y) * Math.min(1, dt * 14);
        }
        s.optT -= dt;
        if (s.optT <= 0) { s.optT = 0.15; for (let i = 0; i < s.opts; i++) shot(s.OPT[i].x, s.OPT[i].y - 6, 0, 840, s.hyperT > 0 ? 4 : 5, s.i); }
      }
    }

    function hurtShip(s, force) {
      if (!s.alive || s.inv > 0 || god || s.god || state !== 'play' || s.auto > 0) return;
      if (CO && !force && !hurtOk(s)) return;
      if (GUEST) { guestHurt(s); return; }
      secNoHit = false;
      if (CO) { if (s.shield <= 0) wreckShip(s); else coopBubble(s); return; }
      if (s.shield <= 0) { killShip(s); return; }
      s.shield = 0;                               // la bulle éclate à la place du vaisseau
      s.power = Math.max(1, s.power - 2); s.pT = 0;
      if (mult > 1) { mult = Math.max(1, Math.ceil(mult / 2)); chain = MULT_AT[mult - 1]; }
      s.inv = 2.2; s.hitFlash = 1;
      cancelBullets(s.x, s.y, 110, false);
      freezeT = 0.08; shake = Math.max(shake, 10); flashA = 0.32; flashCol = '#ff3b5c';
      ring(s.x, s.y, 10, 110, 0.45, '#ff8fb0', 3);
      sparks(s.x, s.y, 18, GL.c, 220, 0.5, 8);
      SFX.shield();
      ftext(s.x, s.y - 36, 'BULLE PERDUE !', '#ff4d6d', 14, 1.3, -18, 0);
    }
    function killShip(s) {
      s.alive = false; s.shield = 0; s.hyperT = 0;
      state = 'dying'; stT = 0;
      psN = 0; msN = 0;
      freezeT = 0.14; slowT = 1.5; slowK = 0.35; shake = 20; flashA = 0.9; flashCol = '#ffffff';
      explode(s.x, s.y, 4, 'c');
      debris(s.x, s.y, 18, 230);
      sparks(s.x, s.y, 46, GL.c, 330, 0.9, 10);
      ring(s.x, s.y, 8, 170, 0.7, '#9ff4ff', 4);
      ring(s.x, s.y, 4, 90, 0.5, '#ffffff', 3);
      SFX.death();
      deadInfo = { sec: secI + 1, cyc: cycle };
    }
    function useBomb(s) {
      if (state !== 'play' || paused || !s.alive || s.bombs <= 0 || s.auto > 0) return;
      if (GUEST) { guestBomb(s); return; }
      HITBY = s.i;
      const mu = NETH && s.remote ? 1 : 0;
      s.bombs--; s.inv = Math.max(s.inv, 2);
      cancelBullets(0, 0, -1, true);
      for (let i = BEAMS.length - 1; i >= 0; i--) if (BEAMS[i].t < BEAMS[i].warn) BEAMS.splice(i, 1);
      const dmg = 30 + 14 * L;
      noRevenge = true;
      for (let j = 0; j < enN; j++) { const e = EN[j]; if (e.alive && e.delay <= 0 && e.y > -10 && e.y < LH + 10) hitEnemy(e, e.type === 'gardien' ? dmg * 1.5 : dmg, e.x, e.y); }
      noRevenge = false;
      if (B && B.ready && !B.dying) bossDamage(B.maxHp * 0.035, B.x, B.y, null);
      netMute += mu;
      ring(s.x, s.y, 10, Math.max(LW, LH) * 1.1, 0.8, '#ffb3d0', 6);
      ring(s.x, s.y, 6, LW * 0.7, 0.55, '#ffffff', 3);
      sparks(s.x, s.y, 40, GL.m, 400, 0.8, 10);
      part(s.x, s.y, 0, 0, 0.5, 60, 420, GL.m, true, 0);
      flashA = 0.6; flashCol = '#ffc4e4'; shake = Math.max(shake, 14); freezeT = 0.05;
      SFX.bomb();
      ftext(LW / 2, LH * 0.45, 'BOMBE !', '#ff7ab8', 26, 0.9, -10, 0);
      netMute -= mu; if (mu) flashOwn = true;
    }
    function useHyper(s) {
      if (state !== 'play' || paused || !s.alive || s.hyper < 1 || s.hyperT > 0 || s.auto > 0) return;
      if (GUEST) { guestHyper(s); return; }
      const mu = NETH && s.remote ? 1 : 0;
      netMute += mu;
      s.hyper = 0; s.hyperT = 6; s.inv = Math.max(s.inv, 0.9);
      cancelBullets(s.x, s.y, 150, true);
      ring(s.x, s.y, 10, Math.max(LW, LH), 0.7, '#ff7ad8', 5);
      sparks(s.x, s.y, 34, GL.m, 360, 0.7, 9);
      flashA = 0.5; flashCol = '#ff6fd0'; shake = Math.max(shake, 8); hyperTint = 1;
      SFX.hyper();
      if (CO && other(s).hyperT > 0) banner('HYPER DUO !', 'Points ×3', '#ff5fd2', 1.8, 2); else banner('HYPER !', 'Puissance maximale', '#ff5fd2', 1.6, 2);
      netMute -= mu; if (mu) flashOwn = true;
    }
    function pickCap(k, s) {
      const col = CAPS[k].col;
      let msg = '';
      if (k === 'P') { s.pT = 0; if (s.power < 6) { s.power++; msg = s.power === 6 ? 'PUISSANCE MAX !' : 'PUISSANCE ' + s.power; } else { addPts(2000, 0, 0, false); msg = 'PUISSANCE MAX +' + fmt(2000 * mult); } }
      else if (k === 'M') { s.miss = Math.min(3, s.miss + 1); s.missLeft = ARMS_T; s.missT = 0.1; msg = 'MISSILES ' + s.miss + ' (20 s)'; }
      else if (k === 'O') { const n0 = s.opts; s.opts = Math.min(4, s.opts + 2); for (let i = n0; i < s.opts; i++) { s.OPT[i].x = s.x; s.OPT[i].y = s.y; } s.optLeft = ARMS_T; msg = 'DRONES ×' + s.opts + ' (20 s)'; }
      else if (k === 'S') { if (s.shield < 1) { s.shield = 1; msg = 'BULLE DE PROTECTION !'; } else { addPts(3000, 0, 0, false); msg = 'BULLE DÉJÀ LÀ +' + fmt(3000 * mult); } }
      else if (k === 'B') { if (s.bombs < 2) { s.bombs++; msg = 'BOMBE +1'; } else { addPts(2000, 0, 0, false); msg = '+' + fmt(2000 * mult); } }
      else { s.magT = 12; msg = 'AIMANT À ÉCLATS !'; }
      ftext(s.x, s.y - 40, msg, col, 13, 1.1, -24, 0);
      ring(s.x, s.y, 8, 46, 0.35, col, 2.5);
      sparks(s.x, s.y, 10, GL.w, 140, 0.4, 6);
      SFX.pick(k);
    }

    // ------------------------------------------------------------- mise à jour : tirs, missiles, éclats, capsules, effets
    function collideShot(s) {
      HITBY = s.o;
      for (let j = 0; j < enN; j++) {
        const e = EN[j];
        if (!e.alive || e.delay > 0 || e.y < -e.r) continue;
        const rr = e.r + s.r;
        const dx = e.x - s.x;
        if (dx > rr + 24 || dx < -rr - 24) continue;
        if (s.pierce && (s.h1 === e.uid || s.h2 === e.uid || s.h3 === e.uid)) continue;
        if (segDist2(e.x, e.y, s.px, s.py, s.x, s.y) > rr * rr) continue;
        if (e.type === 'cruiser' && cruiserBlocks(e, s)) {
          sparks(s.x, s.y, 2, GL.b, 90, 0.25, 6); SFX.clink();
          if (!s.pierce) return true;
          s.h3 = s.h2; s.h2 = s.h1; s.h1 = e.uid;
          continue;
        }
        hitEnemy(e, s.dmg, s.x, s.y);
        if (!s.pierce) return true;
        s.h3 = s.h2; s.h2 = s.h1; s.h1 = e.uid;
      }
      if (B && B.ready && !B.dying) {
        const ps = B.parts;
        for (let j = 0; j < ps.length; j++) {
          const p = ps[j];
          if (!p.alive || p.hide) continue;
          if (s.pierce && (s.h1 === p.uid || s.h2 === p.uid || s.h3 === p.uid)) continue;
          const rr = p.r + s.r;
          if (segDist2(p.x, p.y, s.px, s.py, s.x, s.y) > rr * rr) continue;
          if (p.mode === 'block' || B.inv > 0) {
            sparks(s.x, s.y, 2, GL.y, 90, 0.22, 6); SFX.clink();
            if (!s.pierce) return true;
          } else {
            hitBossPart(p, s.dmg, s.x, s.y);
            if (!s.pierce) return true;
          }
          s.h3 = s.h2; s.h2 = s.h1; s.h1 = p.uid;
        }
      }
      return false;
    }
    function updShots(dt) {
      for (let i = psN - 1; i >= 0; i--) {
        const s = PS[i];
        s.px = s.x; s.py = s.y;
        if (hole) {
          const dx = hole.x - s.x, dy = hole.y - s.y, d2 = dx * dx + dy * dy + 400, f = 1.4e6 * hole.k / d2 * dt;
          const d = Math.sqrt(d2);
          s.vx += (dx / d) * f; s.vy += (dy / d) * f;
          if (d2 < 22 * 22) { swapOut(PS, i, psN); psN--; continue; }
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y < -40 || s.x < -40 || s.x > LW + 40 || s.y > LH + 40 || collideShot(s)) { swapOut(PS, i, psN); psN--; }
      }
      for (let i = msN - 1; i >= 0; i--) {
        const m = MS[i];
        m.life -= dt;
        if (!m.tgt || !m.tgt.alive || m.tgt.uid !== m.tuid) { m.tgt = nearestTarget(m.x, m.y); m.tuid = m.tgt ? m.tgt.uid : 0; }
        const tx = m.tgt ? m.tgt.x : m.x + m.vx * 0.2, ty = m.tgt ? m.tgt.y : m.y - 100;
        const cur = Math.atan2(m.vy, m.vx), want = Math.atan2(ty - m.y, tx - m.x);
        const na = cur + clamp(angDiff(cur, want), -7.5 * dt, 7.5 * dt);
        const sp = Math.min(440, Math.sqrt(m.vx * m.vx + m.vy * m.vy) + 650 * dt);
        m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp;
        m.x += m.vx * dt; m.y += m.vy * dt;
        m.smT -= dt;
        if (m.smT <= 0) { m.smT = 0.03; const p = part(m.x, m.y, rnd(-8, 8), rnd(-8, 8) + scrollV * 0.5, 0.45, 3, 9, SMOKE, false, 0.5); if (p) p.a0 = 0.7; }
        let hit = false;
        HITBY = m.o;
        if (m.tgt && m.tgt.alive) {
          const dx = m.tgt.x - m.x, dy = m.tgt.y - m.y, rr = m.tgt.r + 4;
          if (dx * dx + dy * dy < rr * rr) {
            if (m.tgt.mode) hitBossPart(m.tgt, 3.5, m.x, m.y); else hitEnemy(m.tgt, 3.5, m.x, m.y);
            hit = true;
          }
        }
        if (hit) { part(m.x, m.y, 0, 0, 0.22, 10, 26, FIRE, true, 0); sparks(m.x, m.y, 4, GL.o, 90, 0.3, 6); }
        if (hit || m.life <= 0 || m.y < -60 || m.y > LH + 60 || m.x < -60 || m.x > LW + 60) { swapOut(MS, i, msN); msN--; }
      }
    }
    function updShards(dt) {
      if (CO) { updShardsCoop(dt); return; }
      const all = P.magT > 0 || dir.phase === 'clear' || dir.phase === 'bossdead' || dir.phase === 'jump';
      if (shardRunT > 0) { shardRunT -= dt; if (shardRunT <= 0) shardRun = 0; }
      for (let i = shN - 1; i >= 0; i--) {
        const s = SH[i];
        s.t += dt;
        const dx = P.x - s.x, dy = P.y - s.y, d2 = dx * dx + dy * dy;
        if (P.alive && s.t > 0.22 && (s.mag || all || d2 < 64 * 64)) {
          s.mag = true;
          const d = Math.sqrt(d2) + 0.01, sp = 380 + s.t * 260;
          s.vx = (dx / d) * sp; s.vy = (dy / d) * sp;
        } else {
          s.vx *= 1 - Math.min(1, 2 * dt);
          s.vy += (scrollV * 0.8 - s.vy) * Math.min(1, dt * 1.4);
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (P.alive && d2 < 20 * 20) {
          score += 10 * mult; addHyper(0.0022, P); if (chainT > 0) chainT = Math.max(chainT, 1.1);
          shardRun++; shardRunT = 0.5; SFX.shard(shardRun);
          swapOut(SH, i, shN); shN--;
        } else if (s.y > LH + 20 || s.t > 10) { swapOut(SH, i, shN); shN--; }
      }
      for (let i = cpN - 1; i >= 0; i--) {
        const c = CP[i];
        c.t += dt;
        c.vy += (42 - c.vy) * Math.min(1, dt * 1.3);
        c.vx *= 1 - Math.min(1, dt);
        const dx = P.x - c.x, dy = P.y - c.y, d2 = dx * dx + dy * dy, mr = P.magT > 0 ? 150 : 74;
        if (P.alive && d2 < mr * mr && c.t > 0.3) { const d = Math.sqrt(d2) + 0.01; c.x += (dx / d) * 260 * dt; c.y += (dy / d) * 260 * dt; }
        c.x += (c.vx + Math.sin(c.t * 2.3) * 14) * dt; c.y += c.vy * dt;
        if (P.alive && d2 < 26 * 26 && state === 'play') { pickCap(c.k, P); swapOut(CP, i, cpN); cpN--; }
        else if (c.y > LH + 30) { swapOut(CP, i, cpN); cpN--; }
      }
    }
    function updFx(dt) {
      for (let i = ptN - 1; i >= 0; i--) {
        const p = PT[i];
        p.life -= dt;
        if (p.life <= 0) { swapOut(PT, i, ptN); ptN--; continue; }
        if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
      for (let i = rgN - 1; i >= 0; i--) { const g = RG[i]; g.life -= dt; if (g.life <= 0) { swapOut(RG, i, rgN); rgN--; } }
      for (let i = txN - 1; i >= 0; i--) { const t = TX[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 1 - Math.min(1, dt * 1.5); if (t.life <= 0) { swapOut(TX, i, txN); txN--; } }
      for (let i = ltN - 1; i >= 0; i--) { const l = LT[i]; l.life -= dt; if (l.life <= 0) { swapOut(LT, i, ltN); ltN--; } }
      for (let i = FACES.length - 1; i >= 0; i--) { const f = FACES[i]; f.t += dt; f.y -= 16 * dt; if (f.t > f.life) FACES.splice(i, 1); }
    }


    // =================================================================== COOP : l'équipage (COOP-CONTRACT.md, COOP-PLAN.md § 3.2)
    // Tout ce qui suit ne sert qu'avec api.coop (CO). En solo ces fonctions ne sont jamais appelées : rien ne change.
    // Une vie pour l'équipe : touché sans bulle → ÉPAVE (tête triste sous verre) que l'autre sauve en restant dessus ;
    // épave ratée → hors-jeu jusqu'au prochain saut ; plus aucun vaisseau qui vole → équipage détruit, fin de partie.
    const NETC = CO && CO.net && typeof CO.net.send === 'function' && typeof CO.net.onMessage === 'function' ? CO.net : null;
    const GUEST = !!NETC && NETC.role === 'guest';       // invité en ligne : prédit SON vaisseau, l'hôte décide du reste
    const NETH = !!NETC && !GUEST;                      // hôte en ligne
    const LVI = (() => { const i = CO ? ['facile', 'moyen', 'difficile', 'extreme'].indexOf(CO.level) : -1; return i >= 0 ? i : 1; })();
    // table de difficulté de la partie (plan § 3.2) : PV des ennemis moyens / gros, mini-boss et boss ; cadence des tirs ; groupes par
    // vague ; vitesse des balles ; temps pour sauver une épave (+3 s au secteur 1 du cycle 0) ; points
    const CT = { hp: [0.8, 1, 1.22, 1.5], fire: [0.75, 1, 1.18, 1.42], nG: [-1, 0, 1, 3], bsp: [0.9, 1, 1.07, 1.16], pod: [15, 12, 10, 8], mult: [1, 1.25, 1.6, 2] };
    const PTK = CO ? CT.mult[LVI] : 1, FIREK = CT.fire[LVI], BSPD = CT.bsp[LVI];
    const COLS = ['#38e1ff', '#ffa630'];
    let ebSeq = 0, secRescues = 0, teamRescues = 0, rescueBonus = 0, DS = P, lastProm = 1, boltK = 0, stolen = 0, flashOwn = false, resumeT = 0;
    function shortName(n, i) { n = String(n || (i ? 'COPAIN' : 'TOI')).trim().toUpperCase(); return n.length > 10 ? n.slice(0, 9) + '.' : n; }
    if (CO) {
      for (let i = 0; i < 2; i++) {
        const s = SHIPS[i], pl = (Array.isArray(CO.players) && CO.players[i]) || {};
        s.name = shortName(pl.name, i);
        s.img = imgOk(pl.img) ? pl.img : null;
        s.sad = imgOk(pl.sad) ? pl.sad : s.img;
        s.col = typeof pl.color === 'string' && /^#[0-9a-f]{6}$/i.test(pl.color) ? pl.color : COLS[i];
        s.ai = !NETC && i === 1;                           // avec un robot : le joueur 1 est piloté par l'IA ailière
        s.remote = !!NETC && i !== ME;                     // en ligne : le vaisseau de l'autre appareil
        s.st = 'fly'; s.podX = 0; s.podY = 0; s.podT = 0; s.podMax = 1; s.rk = 0; s.rt = 1.2; s.kills = 0; s.rescues = 0; s.hits = 0;
        s.nameT = 3.4; s.saveT = 0; s.helpT = 0; s.god = false; s.still = false;
      }
    }
    // ---- difficulté d'équipe : facteur kc (1 : les deux volent ; 0,5 : l'un est une épave ; 0 : l'un est hors-jeu)
    function teamK() { if (!CO) return 0; const a = SHIPS[0].st, b = SHIPS[1].st; return a === 'out' || b === 'out' ? 0 : a === 'wreck' || b === 'wreck' ? 0.5 : 1; }
    function teamRank() {
      let r = 0, n = 0;
      for (let i = 0; i < SHIPS.length; i++) { const s = SHIPS[i]; if (s.alive) { r += 1 + 0.08 * (s.power - 1) + 0.05 * s.miss + 0.03 * s.opts; n++; } }
      return n ? r / n : 1 + 0.08 * (P.power - 1) + 0.05 * P.miss + 0.03 * P.opts;
    }
    function teamDens() { return Math.min(3, Math.min(2.6, 1.1 + 0.1 * L + 0.15 * cycle) * (1 + 0.2 * teamK())); }
    function teamHp(base) { return base > 3 ? CT.hp[LVI] * (1 + 0.4 * teamK()) : 1; }     // les petits ennemis restent à 2-3 tirs
    function teamMiniHp() { return CT.hp[LVI] * (1 + 0.7 * teamK()); }
    function teamBossHp() { return CT.hp[LVI] * (1 + 0.8 * teamK()); }
    function teamNG(nG) { return clamp(nG + CT.nG[LVI] + Math.round(2 * teamK()), 4, 18); }
    function teamGap(gap) { return gap * (1 - 0.12 * teamK()); }
    function pts(v) { return CO ? v * PTK : v; }       // points × niveau (coop.mult) ; le HUD montre le vrai score
    function coopHy() { return 1 + (SHIPS[0].hyperT > 0 ? 1 : 0) + (SHIPS[1].hyperT > 0 ? 1 : 0); }   // ×2 HYPER, ×3 HYPER DUO
    function anyHyper() { return SHIPS[0].hyperT > 0 || SHIPS[1].hyperT > 0; }
    function teamCanFire() { return (SHIPS[0].alive && SHIPS[0].auto <= 0) || (SHIPS[1].alive && SHIPS[1].auto <= 0); }
    function teamFlying() { return SHIPS[0].alive || SHIPS[1].alive; }
    function other(s) { return SHIPS[s.i ^ 1]; }
    // ---- qui visent les ennemis : moitié chacun (uid pair / impair), le boss alterne ; si la cible ne vole plus, l'autre
    function aimShip(e) { const a = SHIPS[e.uid & 1]; return a.alive || !SHIPS[(e.uid & 1) ^ 1].alive ? a : SHIPS[(e.uid & 1) ^ 1]; }
    function bossAim() { if (!B) return P; const a = SHIPS[Math.floor(B.t / 2.2) & 1], o = other(a); return a.alive || !o.alive ? a : o; }
    function nearShip(x, y) {
      let best = null, bd = 1e12;
      for (let i = 0; i < SHIPS.length; i++) { const s = SHIPS[i]; if (!s.alive) continue; const dx = s.x - x, dy = s.y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = s; } }
      return best || P;
    }
    function boltShip() { boltK ^= 1; const a = SHIPS[boltK]; return a.alive ? a : SHIPS[boltK ^ 1]; }
    function autoX(s) { return LW * (s.i ? 0.64 : 0.36); }   // vol en formation (départ, saut hyperespace)
    function hurtOk(s) { return !NETC || s === P; }          // en ligne : chaque appareil décide des coups reçus par SON vaisseau
    // ---- capsules « promises » à celui qui en a le plus besoin (anneau + mini-visage) ; le robot ne prend jamais celles de l'humain
    function needOf(s, k) {
      if (!s.alive) return -1;
      return k === 'P' ? 6 - s.power : k === 'M' ? 3 - s.miss : k === 'O' ? 4 - s.opts : k === 'S' ? 3 * (1 - s.shield) : k === 'B' ? 2 - s.bombs : s.magT > 0 ? 0 : 1;
    }
    function promise(c) {
      const a = needOf(SHIPS[0], c.k), b = needOf(SHIPS[1], c.k);
      const p = a < 0 && b < 0 ? ME : a > b ? 0 : b > a ? 1 : lastProm ^ 1;
      lastProm = p; c.pm = p; c.pmT = 2.5;
    }
    function needyShip() {                       // le vaisseau le moins armé (pour choisir la sorte de capsule)
      const a = SHIPS[0], b = SHIPS[1];
      if (!a.alive) return b.alive ? b : P;
      if (!b.alive) return a;
      return a.power < b.power || (a.power === b.power && a.shield < b.shield) ? a : b.power < a.power || b.shield < a.shield ? b : SHIPS[lastProm ^ 1];
    }
    function canTake(s, c) { const o = SHIPS[c.pm]; return s.alive && (!s.ai || c.pm === s.i || !o || !o.alive || o.ai); }
    // ---- touché : avec la bulle (comme le solo), sans bulle (épave), épave sauvée / ratée, équipage détruit
    function podTime() { return CT.pod[LVI] + (cycle === 0 && secI === 0 ? 3 : 0); }
    function coopBubble(s) {
      s.shield = 0;
      s.power = Math.max(1, s.power - 2); s.pT = 0; s.hits++;
      if (mult > 1) { mult = Math.max(1, Math.ceil(mult / 2)); chain = MULT_AT[mult - 1]; }
      s.inv = 2.2; s.hitFlash = 1;
      cancelBullets(s.x, s.y, 110, false);
      muted(() => bubbleFx(s));
      if (NETH) netEvt(['h', s.i, 0]);
    }
    function bubbleFx(s) {                       // (aussi rejoué chez l'invité)
      ring(s.x, s.y, 10, 110, 0.45, '#ff8fb0', 3);
      sparks(s.x, s.y, 18, s.i ? GL.o : GL.c, 220, 0.5, 8);
      if (s === P) { freezeT = 0.08; shake = Math.max(shake, 10); flashA = 0.32; flashCol = '#ff3b5c'; flashOwn = true; }
      SFX.shield();
      ftext(s.x, s.y - 36, 'BULLE PERDUE !', '#ff4d6d', 14, 1.3, -18, 0);
    }
    function wreckShip(s) {
      const o = other(s);
      s.hits++;
      if (!o.alive) { teamDown(s); return; }
      s.alive = false; s.st = 'wreck'; s.shield = 0; s.hyperT = 0; s.inv = 0; s.hitFlash = 0;
      s.podX = clamp(s.x, 24, LW - 24); s.podY = clamp(s.y, 96, LH - 70); s.podT = s.podMax = podTime(); s.rk = 0;
      s.rt = Math.min(2.8, 1.2 + 0.4 * secRescues);
      if (mult > 1) { mult = Math.max(1, Math.ceil(mult / 2)); chain = MULT_AT[mult - 1]; }
      muted(() => wreckFx(s));
      if (NETH) netEvt(['h', s.i, 1]);
    }
    function wreckFx(s) {                        // (aussi rejoué chez l'invité)
      explode(s.x, s.y, 3, s.i ? 'o' : 'c'); debris(s.x, s.y, 10, 190); sparks(s.x, s.y, 26, s.i ? GL.o : GL.c, 280, 0.7, 9);
      ring(s.x, s.y, 8, 120, 0.6, s.col, 3);
      SFX.boom(); SFX.sad();
      const first = teamRescues === 0;              // la petite ligne d'explication : seulement tant que l'équipe n'a jamais sauvé personne
      if (s === P) { freezeT = Math.max(freezeT, 0.1); shake = Math.max(shake, 14); flashA = 0.5; flashCol = '#ff3b5c'; flashOwn = true; banner('ÉPAVE !', first ? (other(s).ai ? 'Ton robot vient te chercher' : other(s).name + ' vient te chercher') : '', s.col, 2, 9); }
      else banner('SAUVE ' + s.name + ' !', first ? 'Reste sur son épave' : '', s.col, 2.2, 9);
    }
    function updCrew(dt) {
      for (let i = 0; i < SHIPS.length; i++) {
        const s = SHIPS[i];
        if (s.nameT > 0) s.nameT -= dt;
        if (s.saveT > 0) s.saveT -= dt;
        if (s.helpT > 0) s.helpT -= dt;
        if (s.st !== 'wreck') continue;
        const o = other(s);
        s.podY = Math.min(LH - 70, s.podY + 22 * dt);
        s.x = s.podX; s.y = s.podY;
        const dx = o.x - s.podX, dy = o.y - s.podY, near = o.alive && o.auto <= 0 && state === 'play' && dx * dx + dy * dy <= 38 * 38;
        if (near) {
          s.rk += dt / s.rt; o.saveT = 0.2;
          if (s.rk >= 1) { rescueShip(s, o); continue; }
        } else {
          s.rk = Math.max(0, s.rk - 0.5 * dt);
          if (state === 'play') {
            const t0 = s.podT;
            s.podT -= dt;
            if (s.podT > 0 && s.podT < 4 && Math.ceil(s.podT) !== Math.ceil(t0)) { tone(880, 0.07, 'square', 0.03); if (NETH) netEvt(['s', 'beep']); }
          }
        }
        if (s.podT <= 0) loseShip(s);
      }
    }
    function rescueShip(s, o) {
      s.st = 'fly'; s.alive = true; s.x = s.podX; s.y = s.podY; s.px = s.x; s.py = s.y; s.inv = 2.5; s.hitFlash = 0; s.shield = 0;
      s.power = Math.max(1, s.power - 2); s.pT = 0; s.miss = 0; s.missLeft = 0; s.opts = 0; s.optLeft = 0; s.trailN = 0; s.nameT = 2.4; s.rk = 0;
      for (let k = 0; k < 4; k++) { s.OPT[k].x = s.x; s.OPT[k].y = s.y; }
      secRescues++; teamRescues++; o.rescues++;
      const v = pts(2500 * (secI + 1 + 8 * cycle));
      score += v; rescueBonus += v;
      muted(() => rescueFx(s, o, v));
      if (NETH) netEvt(['r', s.i, Math.round(v)]);
    }
    function rescueFx(s, o, v) {
      banner('SAUVETAGE !', '+' + fmt(v), o.col, 1.9, 11);
      ring(s.x, s.y, 10, 96, 0.6, o.col, 3); ring(s.x, s.y, 6, 60, 0.45, '#ffffff', 2);
      sparks(s.x, s.y, 24, GL.w, 200, 0.6, 7);
      SFX.friend();
    }
    function loseShip(s) {
      s.st = 'out'; s.alive = false; s.rk = 0;
      muted(() => loseFx(s));
      if (NETH) netEvt(['o', s.i]);
      if (!other(s).alive) teamDown(s);
    }
    function loseFx(s) {
      explode(s.podX, s.podY, 2, 'v');
      ring(s.podX, s.podY, 6, 70, 0.5, s.col, 2.5);
      if (s.sad || s.img) addFace({ img: s.img, sad: s.sad }, s.podX, s.podY, '', 62);
      if (s === P) banner('ÉPAVE PERDUE', 'Tu reviens au prochain saut', s.col, 2.4, 9);
      else banner(s.name + ' À LA BASE', 'Retour au prochain saut', s.col, 2.2, 9);
    }
    function teamDown(s) {                        // plus aucun vaisseau ne vole : la fin du solo, sur le dernier vaisseau
      DS = s;
      if (s.st === 'wreck' || s.st === 'out') { s.x = s.podX; s.y = s.podY; }
      s.st = 'dead';
      const o = other(s);                          // l'épave qui attendait s'éteint aussi
      if (o.st === 'wreck') { o.st = 'dead'; explode(o.podX, o.podY, 2, o.i ? 'o' : 'c'); ring(o.podX, o.podY, 6, 60, 0.5, o.col, 2); }
      else if (o.st !== 'dead') o.st = 'dead';
      killShip(s);
      if (NETH) netEvt(['d', s.i]);
    }
    function crewJump() {                         // le saut récupère les pilotes hors-jeu et les épaves : puissance 1 et une bulle (cadeau)
      for (let i = 0; i < SHIPS.length; i++) {
        const s = SHIPS[i];
        if (s.st === 'fly') continue;
        s.st = 'fly'; s.alive = true; s.power = 1; s.pT = 0; s.miss = 0; s.missLeft = 0; s.opts = 0; s.optLeft = 0; s.shield = 1; s.inv = 2.5;
        s.hyperT = 0; s.rk = 0; s.x = autoX(s); s.y = LH + 40; s.trailN = 0; s.nameT = 3; s.auto = 1;
        for (let k = 0; k < 4; k++) { s.OPT[k].x = s.x; s.OPT[k].y = s.y; }
      }
      secRescues = 0; rescueBonus = 0;
    }
    function coopStats() {                        // l'écran de fin : seulement de belles choses de l'équipe (jamais « qui a fait le plus »)
      const st = [{ icon: '💥', n: kills, label: 'abattus' }];
      if (teamRescues > 0) st.push({ icon: '🛟', n: teamRescues, label: teamRescues > 1 ? 'sauvetages' : 'sauvetage' });
      if (sectorsDone > 0) st.push({ icon: '🌌', n: sectorsDone, label: sectorsDone > 1 ? 'secteurs' : 'secteur' });
      return st;
    }
    let cpSeq = 0, netG = 0;          // (numéros des capsules, propriétaire d'un effet, horloge de jeu pour l'invité)
    function capFor(x, y, k, i) { const n = cpN; capsule(x, y, k); if (cpN > n) { const c = CP[cpN - 1]; c.pm = i; c.pmT = 2.5; } }
    function coopExtraGroups(g) {                 // secteur 1 du cycle 0 (vagues écrites à la main) : quelques groupes de plus à deux
      const n = CT.nG[LVI] + Math.round(2 * teamK());
      const end = g.length ? g[g.length - 1].at : 10;
      for (let i = 0; i < n; i++) g.push(W(crnd(1.5, Math.max(2, end)), pickGroup(), 0));
      g.sort((a, b) => a.at - b.at);
    }
    function updShardsCoop(dt) {                  // éclats : chacun vole vers le pilote qui a abattu (l'autre s'il ne vole plus) ; capsules promises
      const end = dir.phase === 'clear' || dir.phase === 'bossdead' || dir.phase === 'jump';
      if (shardRunT > 0) { shardRunT -= dt; if (shardRunT <= 0) shardRun = 0; }
      for (let i = shN - 1; i >= 0; i--) {
        const s = SH[i];
        s.t += dt;
        let tp = SHIPS[s.o & 1];
        if (!tp.alive) tp = other(tp);
        const dx = tp.x - s.x, dy = tp.y - s.y, d2 = dx * dx + dy * dy;
        if (tp.alive && s.t > 0.22 && (s.mag || end || tp.magT > 0 || d2 < 64 * 64)) {
          s.mag = true;
          const d = Math.sqrt(d2) + 0.01, sp = 380 + s.t * 260;
          s.vx = (dx / d) * sp; s.vy = (dy / d) * sp;
        } else {
          s.vx *= 1 - Math.min(1, 2 * dt);
          s.vy += (scrollV * 0.8 - s.vy) * Math.min(1, dt * 1.4);
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (tp.alive && d2 < 20 * 20) {
          score += pts(10 * mult); addHyper(0.0022, tp); if (chainT > 0) chainT = Math.max(chainT, 1.1);
          if (tp === P) { shardRun++; shardRunT = 0.5; SFX.shard(shardRun); }
          swapOut(SH, i, shN); shN--;
        } else if (s.y > LH + 20 || s.t > 10) { swapOut(SH, i, shN); shN--; }
      }
      for (let i = cpN - 1; i >= 0; i--) {
        const c = CP[i];
        c.t += dt;
        if (c.pmT > 0) c.pmT -= dt;
        c.vy += (42 - c.vy) * Math.min(1, dt * 1.3);
        c.vx *= 1 - Math.min(1, dt);
        let tp = null, bd = 1e12;                  // attirée par le plus proche qui peut la prendre (jamais le robot pour une capsule de l'humain)
        for (let k = 0; k < SHIPS.length; k++) { const s = SHIPS[k]; if (!canTake(s, c)) continue; const dx = s.x - c.x, dy = s.y - c.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; tp = s; } }
        if (tp) {
          const mr = tp.magT > 0 ? 150 : 74;
          if (bd < mr * mr && c.t > 0.3) { const d = Math.sqrt(bd) + 0.01; c.x += ((tp.x - c.x) / d) * 260 * dt; c.y += ((tp.y - c.y) / d) * 260 * dt; }
        }
        c.x += (c.vx + Math.sin(c.t * 2.3) * 14) * dt; c.y += c.vy * dt;
        if (tp && bd < 26 * 26 && state === 'play') {
          if (tp.ai && SHIPS[c.pm] && c.pm !== tp.i && SHIPS[c.pm].alive && !SHIPS[c.pm].ai) stolen++;   // (doit rester à 0)
          if (NETH) netEvt(['c', c.id, tp.i]);
          pickCap(c.k, tp); swapOut(CP, i, cpN); cpN--;
        } else if (c.y > LH + 30) { if (NETH) netEvt(['c', c.id, -1]); swapOut(CP, i, cpN); cpN--; }
      }
    }
    // ---- pause commune (COOP-CONTRACT.md « Pause : une seule règle ») : mon bouton, P et Échap demandent la pause à la bibliothèque
    function coopPauseReq() { try { if (CO && typeof CO.pause === 'function') CO.pause(); } catch (e) { /* rien */ } }
    function coopPause() {
      if (destroyed || paused) return;
      paused = true;
      keys.l = keys.r = keys.u = keys.d = false;
      drag = null; dragDX = dragDY = 0; mouseTX = -1;
      pauseBtn.innerHTML = ICON_PLAY; pauseBtn.setAttribute('aria-label', 'En pause');
      last = 0; prevReal = 0; pausedFrames = 0;
      render();
    }
    function coopResume() {
      if (destroyed || !paused) return;
      paused = false; resumeT = state === 'play' ? 1.5 : 0;
      pauseBtn.innerHTML = ICON_PAUSE; pauseBtn.setAttribute('aria-label', 'Pause');
      last = 0; prevReal = 0;
      if (NETC) netResync();
    }

    // =================================================================== COOP : l'IA ailière (le robot coéquipier, api.coop.ai)
    // Même vaisseau, même physique que le joueur, pilotée comme au clavier. Pas de triche : elle « voit » chaque balle telle qu'elle
    // était il y a `lag` secondes (temps de réaction), ne voit pas une balle plus jeune que ça, en rate quelques-unes (Facile),
    // ne voit dans la zone sombre que ce qu'éclairent les vaisseaux. Bon copain : flanc opposé à l'humain, jamais ses capsules,
    // vient le sauver en priorité, bombe de secours (Difficile / Extrême). Elle ne parle pas : repères visuels seulement.
    const AIL = (() => {
      const k = CO && CO.ai && typeof CO.ai.k === 'number' ? clamp(CO.ai.k, 0.25, 1) : [0.25, 0.5, 0.75, 1][LVI];
      const t = (k - 0.25) / 0.75, L4 = (a, b, c, d) => { const x = t * 3, i = Math.min(2, Math.floor(x)), f = x - i, v = [a, b, c, d]; return v[i] + (v[i + 1] - v[i]) * f; };
      return {
        k, hz: L4(10, 12, 20, 30), lag: L4(0.14, 0.13, 0.1, 0.05), nh: t < 0.15 ? 2 : t < 0.5 ? 3 : 4, far: t > 0.9, marg: L4(2, 4, 5, 7),
        spd: L4(210, 230, 255, 255), miss: L4(0.04, 0.04, 0.01, 0), distEvery: L4(7, 12, 1e9, 1e9), distDur: L4(0, 0, 0, 0),
        bomb: L4(1600, 1000, 750, 650), save: L4(0, 0, 0.5, 1), w: L4(0.035, 0.05, 0.07, 0.09), prefY: L4(110, 120, 130, 150), tw: L4(0.3, 0.7, 1, 1), hyMode: t < 0.4 ? 0 : t < 0.9 ? 1 : 2
      };
    })();
    const aiRng = CO ? mulberry32(((SEED === null ? (Math.random() * 4294967296) >>> 0 : SEED) ^ 0x5EED1A) >>> 0) : null;   // tirages du robot (jamais ceux du contenu)
    const ADIRS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]];
    const AHT = [0.06, 0.13, 0.22, 0.34, 0.5];
    const AIB = CO ? new Float32Array(5 * MAXEB) : null, AIE = CO ? new Float32Array(5 * (MAXEN + 40)) : null;
    const AI = { plans: 0, bombs: 0, hypers: 0, saveBombs: 0, hits: 0, rescues: 0, ms: 0 };   // mesures (tests)
    function aiInit(s) {
      s.aiT = 0; s.aiDx = 0; s.aiDy = 0; s.aiDist = AIL.distEvery * (0.6 + 0.8 * aiRng()); s.aiDistOn = 0; s.flankS = 1; s.saving = false; s.threatT = 0;
    }
    if (CO) for (let i = 0; i < SHIPS.length; i++) if (SHIPS[i].ai) aiInit(SHIPS[i]);
    function aiSees(x, y) {                      // zone sombre : seulement ce qu'éclairent les vaisseaux
      if (darkK < 0.5) return true;
      for (let i = 0; i < SHIPS.length; i++) { const s = SHIPS[i]; if (!s.alive) continue; const dx = s.x - x, dy = s.y - y; if (dx * dx + dy * dy < 120 * 120) return true; }
      return false;
    }
    function aiMove(s, dt) {
      if (state !== 'play') { s.aiDx = s.aiDy = 0; return; }
      if (s.aiDistOn > 0) s.aiDistOn -= dt;       // distraction : il garde sa direction sans esquiver
      else {
        s.aiDist -= dt;
        if (s.aiDist <= 0 && AIL.distDur > 0) { s.aiDist = AIL.distEvery * (0.6 + 0.8 * aiRng()); s.aiDistOn = AIL.distDur; }
        s.aiT -= dt;
        if (s.aiT <= 0) { s.aiT += 1 / AIL.hz; if (s.aiT < 0) s.aiT = 0; const t0 = performance.now(); aiPlan(s); AI.ms += (performance.now() - t0 - AI.ms) * 0.05; }
      }
      s.x += s.aiDx * AIL.spd * dt; s.y += s.aiDy * AIL.spd * dt;
      if (hole) {                                 // le trou noir l'attire comme le joueur
        const dx = hole.x - s.x, dy = hole.y - s.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
        const f = Math.min(95, 5200 / Math.max(50, d)) * hole.k * dt;
        s.x += (dx / d) * f; s.y += (dy / d) * f;
      }
    }
    function aiPlan(s) {
      AI.plans++;
      const H = other(s), lag = AIL.lag, kc = s.x, ky = s.y;
      // ---- ce qu'elle voit : balles (âgées d'au moins lag, dans un carré de ±170 px), corps des ennemis et du boss
      let nb = 0, ne = 0, nEn = 0;
      for (let i = 0; i < ebN; i++) {
        const b = EB[i];
        if (b.delay > 0 || b.t < lag) continue;
        const bx = b.x - b.vx * lag, by = b.y - b.vy * lag;
        if (bx < kc - 170 || bx > kc + 170 || by < ky - 170 || by > ky + 170) continue;
        if (AIL.miss > 0 && hash(b.id * 0.618 + 3.7) < AIL.miss) continue;   // balles « pas vues »
        if (!aiSees(b.x, b.y)) continue;
        const j = nb * 5; AIB[j] = bx; AIB[j + 1] = by; AIB[j + 2] = b.vx; AIB[j + 3] = b.vy; AIB[j + 4] = b.r; nb++;
      }
      let tx = null, tBest = -1e9;
      const side = s.flankS, mid = LW / 2;
      for (let i = 0; i < enN; i++) {
        const e = EN[i];
        if (!e.alive || e.delay > 0) continue;
        if (e.type === 'stealth' && e.cloak < 0.3) continue;
        if (!aiSees(e.x, e.y)) continue;
        nEn++;
        if (Math.abs(e.x - kc) < 200 && Math.abs(e.y - ky) < 220 && ne < MAXEN + 40) { const j = ne * 5; AIE[j] = e.x - e.vx * lag; AIE[j + 1] = e.y - e.vy * lag; AIE[j + 2] = e.r; AIE[j + 3] = e.vx; AIE[j + 4] = e.vy; ne++; }
        if (e.y > 0 && e.y < LH * 0.65 && e.type !== 'mine') {
          let sc = e.y - Math.abs(e.x - (side > 0 ? LW * 0.72 : LW * 0.28)) * 0.6;
          if (LVI >= 2 && e.type === 'dart' && e.k === 1 && H.alive && segDist2(H.x, H.y, e.x, e.y, e.x + Math.cos(e.aim) * 400, e.y + Math.sin(e.aim) * 400) < 30 * 30) sc += 900;
          if (sc > tBest) { tBest = sc; tx = e.x; }
        }
      }
      if (B && B.ready && !B.dying) {
        let bestP = null, bd = 1e9;
        for (let i = 0; i < B.parts.length; i++) {
          const p = B.parts[i];
          if (!p.alive || p.hide) continue;
          if (ne < MAXEN + 40 && Math.abs(p.x - kc) < 220 && Math.abs(p.y - ky) < 260) { const j = ne * 5; AIE[j] = p.x; AIE[j + 1] = p.y; AIE[j + 2] = p.r; AIE[j + 3] = 0; AIE[j + 4] = 0; ne++; }
          if (p.mode === 'block' || p.mode === 'armor' || p.y < 0) continue;
          const d = Math.abs(p.x - (side > 0 ? LW * 0.66 : LW * 0.34)) - (p.weak ? 30 : 0);
          if (d < bd) { bd = d; bestP = p; }
        }
        if (bestP) tx = bestP.x;
      }
      // ---- flanc : la moitié opposée à l'humain (hystérésis)
      if (H.alive) { if (H.x < mid - 22) s.flankS = 1; else if (H.x > mid + 22) s.flankS = -1; }
      const flankX = s.flankS > 0 ? LW * 0.72 : LW * 0.28;
      const rescue = H.st === 'wreck';
      s.saving = rescue;
      if (rescue) s.helpT = 0.3;
      const share = s.kills > 30 && s.kills > 1.5 * (H.kills + 10);   // il laisse le joueur briller
      const prefY = LH - AIL.prefY - (share ? 30 : 0);
      const nh = AIL.nh;
      let best = 0, bestC = 1e9, stay = 0;
      for (let d = 0; d < 9; d++) {
        let c = 0;
        for (let hi = 0; hi < nh + (AIL.far ? 1 : 0); hi++) {
          const h = AHT[hi], farOnly = hi >= nh;
          const px = clamp(kc + ADIRS[d][0] * AIL.spd * h, 14, LW - 14), py = clamp(ky + ADIRS[d][1] * AIL.spd * h, 66, LH - 26);
          const w = 1 / (1 + h * 2.5);
          if (!farOnly) {
            for (let i = 0; i < nb; i++) {
              // position vue il y a lag, projetée à h sans rattraper le retard : b.x + b.vx·(h − lag)
              const j = i * 5, ex = AIB[j] + AIB[j + 2] * h, ey = AIB[j + 1] + AIB[j + 3] * h;
              const rr = AIB[j + 4] + 4.5 + AIL.marg, ddx = ex - px, ddy = ey - py, d2 = ddx * ddx + ddy * ddy;
              if (d2 < rr * rr) c += 1000 * w; else if (d2 < (rr + 26) * (rr + 26)) c += 25 * w * (1 - (Math.sqrt(d2) - rr) / 26);
            }
            for (let i = 0; i < ne; i++) {
              const j = i * 5, ex = AIE[j] + AIE[j + 3] * h, ey = AIE[j + 1] + AIE[j + 4] * h, rr = AIE[j + 2] * 0.8 + 17;
              const ddx = ex - px, ddy = ey - py, d2 = ddx * ddx + ddy * ddy;
              if (d2 < rr * rr) c += 800 * w; else if (d2 < (rr + 22) * (rr + 22)) c += 18 * w;
            }
          }
          for (let i = 0; i < BEAMS.length; i++) {
            const q = BEAMS[i];
            if (q.t < q.warn - 0.35 - (farOnly ? 0.3 : 0)) continue;
            if (segDist2(px, py, q.x, q.y, q.x + Math.cos(q.ang) * 900, q.y + Math.sin(q.ang) * 900) < (q.w / 2 + 12) * (q.w / 2 + 12)) c += 900 * w;
          }
          for (let i = 0; i < BOLTS.length; i++) { const q = BOLTS[i]; if (q.t >= q.warn - 0.6 && Math.abs(px - q.x) < 24) c += 900 * w; }
          if (B && B.kind === 'ver' && (B.mode === 2 || (B.mode === 3 && B.hd.y < LH + 60)) && Math.abs(px - B.warnX) < 30) c += 900 * w;
          for (let i = 0; i < GATES.length; i++) {
            const g = GATES[i];
            if (Math.abs(py - (g.y + 62 * h)) < 18) {
              let safe = false;
              for (let k = 0; k < g.gaps.length; k += 2) if (px > g.gaps[k] + 9 && px < g.gaps[k + 1] - 9) safe = true;
              if (!safe) c += 900 * w;
            }
          }
          if (hole) { const dx = px - hole.x, dy = py - hole.y; if (dx * dx + dy * dy < 70 * 70) c += 300 * w; }
        }
        if (d === 0) stay = c;
        const px = kc + ADIRS[d][0] * 30, py = ky + ADIRS[d][1] * 30;
        if (rescue) {                             // le copain d'abord : vers l'épave (les dangers comptent toujours)
          const dx = px - H.podX, dy = py - H.podY;
          c += AIL.w * 10 * Math.sqrt(dx * dx + dy * dy);
        } else {
          c += Math.abs(py - prefY) * 0.035;
          c += Math.abs(px - flankX) * 0.02;
          if (tx !== null && !share) c += Math.abs(px - tx) * (B ? 0.06 : 0.03) * AIL.tw;
        }
        if (H.alive) { const dx = px - H.x, dy = py - H.y; if (dx * dx + dy * dy < 40 * 40) c += 60; }   // ne se met jamais sur l'humain
        for (let i = 0; i < cpN; i++) {
          const q = CP[i], dx = q.x - px, dy = q.y - py, dd = Math.sqrt(dx * dx + dy * dy);
          if (canTake(s, q)) c -= 25 / (1 + dd / 40);
          else if (dd < 30) c += 300;              // jamais les capsules de l'humain
        }
        for (let i = 0; i < GATES.length; i++) {
          const g = GATES[i];
          if (g.y < ky && g.y > ky - 200) { let bg = 1e9; for (let k = 0; k < g.gaps.length; k += 2) bg = Math.min(bg, Math.abs(px - (g.gaps[k] + g.gaps[k + 1]) / 2)); c += bg * 0.06; }
        }
        if (c < bestC) { bestC = c; best = d; }
      }
      s.aiDx = ADIRS[best][0]; s.aiDy = ADIRS[best][1];
      // ---- bombe quand ça chauffe trop ; bombe de secours pour l'humain sans bulle (Difficile : une fois sur deux, Extrême : toujours)
      if (bestC > AIL.bomb && stay > AIL.bomb * 0.8 && s.bombs > 0 && s.inv <= 0) { useBomb(s); AI.bombs++; }
      else if (AIL.save > 0 && s.bombs > 0 && H.alive && H.shield <= 0 && H.inv <= 0 && !H.god) {
        if (s.threatT > 0) s.threatT -= 1 / AIL.hz;
        else {
          let hit = false;
          for (let i = 0; i < ebN && !hit; i++) {
            const b = EB[i];
            if (b.delay > 0) continue;
            const bx = b.x + b.vx * 0.15, by = b.y + b.vy * 0.15, rr = b.r + 4.5;
            if (segDist2(H.x, H.y, b.x, b.y, bx, by) < rr * rr) hit = true;
          }
          if (hit) { s.threatT = 1.2; if (aiRng() < AIL.save) { useBomb(s); AI.saveBombs++; } }
        }
      }
      // ---- HYPER : Facile / Moyen dès que plein ; Difficile au boss ou dans la foule ; Extrême avec toi (HYPER DUO) ou au boss
      if (s.hyper >= 1 && s.hyperT <= 0) {
        const m = AIL.hyMode, crowd = nEn >= 12;
        if (m === 0 || (m === 1 && ((B && B.ready) || crowd)) || (m === 2 && (H.hyperT > 0 || (B && B.ready && B.phase >= 1) || nEn >= 16))) { useHyper(s); AI.hypers++; }
      }
    }
    // ------------------------------------------------------------- ennemis
    // déplacements : 1 sinus, 2 courbe de Bézier, 3 kamikaze, 4 stationnaire, 5 chute libre, 6 traversée,
    // 7 tête de serpent, 8 anneau de serpent, 9 drone, 10 gardien, 11 élite, 12 furtif
    const BOOMQ = [];                            // explosions en chaîne différées
    let eliteSeq = 0;
    function spawnEnemy(type, x, y, delay) {
      if (enN >= MAXEN) return null;
      const e = EN[enN++], d = ET[type];
      e.uid = uidSeq++; e.type = type; e.alive = true;
      e.x = x; e.y = y; e.vx = 0; e.vy = 0;
      e.max = e.hp = Math.max(1, d.hp * hpMul());
      if (CO) e.max = e.hp = Math.max(1, e.hp * teamHp(d.hp));
      e.r = d.r; e.pts = d.pts; e.hyp = d.hyp; e.sh = d.sh;
      e.t = 0; e.delay = delay || 0; e.ang = 0; e.flash = 0; e.st = crnd(0.6, 1.6); e.st2 = 0; e.mv = 0;
      e.x0 = x; e.y0 = y; e.ty = 0; e.hold = 0; e.drop = ''; e.head = null; e.mini = false; e.var = 0;
      e.lead = null; e.seg = 0; e.hist = null; e.hi = 0; e.histT = 0; e.cloak = 1; e.hue = 0; e.vr = 0; e.size = ''; e.seed = 0; e.rich = false;
      e.ph = crand() * TAU; e.amp = 0; e.w = 1; e.spd = 0; e.k = 0; e.aim = Math.PI / 2; e.entered = false; e.fire = true;
      e.p0 = e.p1 = e.p2 = e.p3 = e.p4 = e.p5 = e.p6 = e.p7 = 0; e.dur = 1; e.beam = null; e.said = false; e.die = 0; e.tx = x; e.ty2 = y; e.s2 = 0;
      e.rng = rng ? mulberry32((rng() * 4294967296) >>> 0) : null;   // graine : l'ennemi a son propre tirage (tirs, trajets, débris)
      if (NETH) netNewEnemy(e);
      return e;
    }
    function bez(e, u) {
      const a = 1 - u, b0 = a * a * a, b1 = 3 * a * a * u, b2 = 3 * a * u * u, b3 = u * u * u;
      e.x = b0 * e.p0 + b1 * e.p2 + b2 * e.p4 + b3 * e.p6;
      e.y = b0 * e.p1 + b1 * e.p3 + b2 * e.p5 + b3 * e.p7;
    }
    function dropEvery() { return CO ? (7000 + 2500 * Math.min(6, L)) * 0.75 : 7000 + 2500 * Math.min(6, L); }
    function sayFriend(e) {
      if (!e.head || e.said) return;
      e.said = true;
      const nm = headName(e.head);
      const first = !seenNames.has(nm);
      seenNames.add(nm);
      ftext(e.x, e.y + e.r + 18, first ? OH(nm) : pick(['Encore ' + nm + ' !', nm + ' revient !', 'Re-' + nm + ' !']), '#ffe9a8', 13, 1.8, -8, 0);
      SFX.friend();
    }
    function addBeam(owner, ang, warn, dur, width, col, ox, oy, track) {
      const bm = { owner, ouid: owner ? owner.uid : 0, x: owner ? owner.x : 0, y: owner ? owner.y : 0, ox: ox || 0, oy: oy || 0, ang, warn, dur, w: width, col: col || 'm', t: 0, track: !!track, len: 900 };
      BEAMS.push(bm);
      SFX.charge();
      return bm;
    }

    function hitEnemy(e, dmg, x, y) {
      if (!e.alive || e.die > 0) return;
      e.hp -= dmg; e.flash = 0.07;
      if (e.hp <= 0) { killEnemy(e, true); return; }
      if (Math.random() < 0.25) part(x, y, rnd(-30, 30), rnd(-70, -10), 0.14, 5, 0, GL.y, true, 0);
      SFX.hit();
    }
    let noRevenge = false;
    function revenge(e) {                        // aux niveaux avancés, les ennemis abattus lâchent une dernière balle
      const tp = CO ? nearShip(e.x, e.y) : P;
      if (CO) AIM = tp;
      const dx = tp.x - e.x, dy = tp.y - e.y;
      if (dx * dx + dy * dy < 95 * 95 || e.y > tp.y - 40) return;
      const ty = e.type;
      if (L >= 2 && (ty === 'swarm' || ty === 'dart' || ty === 'drone' || ty === 'rockS' || ty === 'stealth')) {
        if (cycle >= 2 || crand() < (cycle >= 1 ? 0.8 : 0.35)) fireAimed(e.x, e.y, 95, 'p', 0, cycle >= 2 && crand() < 0.5 ? 3 : 1, 0.22);
      } else if (L >= 3 && (ty === 'frigate' || ty === 'elite' || ty === 'cruiser' || ty === 'weaver' || ty === 'sentinel')) {
        fireRing(e.x, e.y, 8 + Math.min(8, cycle * 4), 80, 'p', 0, crand());
      }
    }
    function killEnemy(e, byPlayer) {
      if (!e.alive) return;
      e.alive = false;
      if (NETH) netKill(e, byPlayer);
      const ty = e.type, r0 = rng;
      rng = e.rng;                                 // graine : riposte, éclats, capsule et débris de roche suivent le tirage de l'ennemi
      if (byPlayer) {
        kills++;
        if (CO && SHIPS[HITBY]) SHIPS[HITBY].kills++;
        addPts(e.pts, e.x, e.y - 12, e.pts >= 500 || mult >= 5);
        bumpChain(ty === 'gardien' ? 12 : ty === 'mine' || ty === 'snakeB' ? 0.5 : 1);
        addHyper(e.hyp, SHIPS[HITBY] || P);
        shards(e.x, e.y, e.sh);
        if (e.drop) capsule(e.x, e.y, e.drop === '?' ? chooseCap() : e.drop);
        else if (ty !== 'mine' && ty !== 'snakeB') { dropAcc += e.pts; if (dropAcc > dropEvery()) { dropAcc = 0; capsule(e.x, e.y, chooseCap()); } }
        if (e.head) { const nm = headName(e.head); addFace(e.head, e.x, e.y, SNIF(nm)); addPts(2500, e.x, e.y + 22, true); }
        if (!noRevenge && (CO ? teamFlying() : P.alive) && state === 'play') revenge(e);
      }
      if (e.beam) { const i = BEAMS.indexOf(e.beam); if (i >= 0) BEAMS.splice(i, 1); e.beam = null; }
      switch (ty) {
        case 'swarm': case 'drone': explode(e.x, e.y, 1, ty === 'drone' ? 'g' : 'm'); SFX.pop(); break;
        case 'dart': explode(e.x, e.y, 1, 'o'); SFX.pop(); break;
        case 'mine':
          explode(e.x, e.y, 1, 'r'); SFX.pop();
          if (!byPlayer) fireRing(e.x, e.y, 8 + Math.min(6, L >> 1), 92, 'r', 0, crand());
          break;
        case 'snakeB': explode(e.x, e.y, 1, 'g'); SFX.pop(); break;
        case 'rockS': explode(e.x, e.y, 1, 'o'); debris(e.x, e.y, 3, 80); SFX.pop(); break;
        case 'rockM': case 'rockL': {
          explode(e.x, e.y, ty === 'rockL' ? 2 : 1, 'o'); debris(e.x, e.y, 6, 110); SFX.boom();
          if (byPlayer) {
            const n = ty === 'rockL' ? 3 : 2, sub = ty === 'rockL' ? 'rockM' : 'rockS';
            for (let i = 0; i < n; i++) {
              const r = spawnEnemy(sub, e.x + crnd(-8, 8), e.y + crnd(-8, 8), 0);
              if (!r) break;
              const a = -Math.PI / 2 + (i - (n - 1) / 2) * 1.1 + crnd(-0.2, 0.2), v = crnd(50, 90);
              r.mv = 5; r.vx = Math.cos(a) * v * 0.9 + e.vx * 0.3; r.vy = Math.max(30, Math.sin(a) * v * 0.3 + e.vy); r.vr = crnd(-2, 2); r.seed = crndi(0, 2);
              r.entered = true;
            }
            if (e.rich) { capsule(e.x, e.y, chooseCap()); shards(e.x, e.y, 10); }
            else if (ty === 'rockL' && lrand() < 0.25) capsule(e.x, e.y, 'P');
          }
          break;
        }
        case 'snakeH': {
          explode(e.x, e.y, 2, 'g'); SFX.boom();
          for (let j = 0; j < enN; j++) { const s = EN[j]; if (s.alive && s.type === 'snakeB' && s.lead === e) { s.die = 0.07 * (s.seg + 1); } }
          break;
        }
        case 'cruiser': case 'elite': explode(e.x, e.y, 3, ty === 'elite' ? 'm' : 'b'); SFX.big(); freezeT = Math.max(freezeT, 0.04); break;
        case 'gardien': {
          explode(e.x, e.y, 4, 'o'); SFX.big(); freezeT = Math.max(freezeT, 0.06); flashA = Math.max(flashA, 0.5); flashCol = '#fff4dc';
          for (let i = 0; i < 6; i++) BOOMQ.push({ t: 0.12 + i * 0.13, x: e.x + rnd(-45, 45), y: e.y + rnd(-30, 30), s: i === 5 ? 3 : 2, c: 'o' });
          ring(e.x, e.y, 10, 200, 0.7, '#ffe2b0', 4);
          if (byPlayer) { capsule(e.x - 16, e.y, 'P'); capsule(e.x + 16, e.y, chooseCap()); shards(e.x, e.y, 16); if (CO) capsule(e.x, e.y + 14, 'P'); }
          if (e === miniRef) miniRef = null;
          break;
        }
        default: explode(e.x, e.y, 2, ty === 'miner' ? 'g' : ty === 'stealth' ? 'v' : ty === 'weaver' ? 'y' : ty === 'carrier' ? 'y' : 'o'); SFX.boom();
      }
      rng = r0;
    }

    function updEnemies(dt) {
      const fm = fireMul(), canFire = state === 'play' && (CO ? teamCanFire() : P.alive && P.auto <= 0);
      for (let i = 0; i < enN; i++) {
        const e = EN[i];
        if (!e.alive) continue;
        if (e.delay > 0) { e.delay -= dt; continue; }
        if (CO) AIM = aimShip(e);
        if (e.die > 0) { e.die -= dt; if (e.die <= 0) { killEnemy(e, true); } continue; }
        e.t += dt;
        if (e.flash > 0) e.flash -= dt;
        const ox = e.x, oy = e.y;
        switch (e.mv) {
          case 1: e.y += e.spd * dt; e.x = e.x0 + e.amp * Math.sin(e.t * e.w + e.ph); break;
          case 2: { const u = e.t / e.dur; if (u >= 1) { e.alive = false; continue; } bez(e, u); break; }
          case 3: {                                 // kamikaze : descend, vise (ligne d'avertissement), fonce
            if (e.k === 0) {
              e.y += (e.ty - e.y) * Math.min(1, dt * 2.2); e.x += (e.x0 - e.x) * Math.min(1, dt * 2);
              e.aim = aimAt(e.x, e.y);
              if (e.t > e.hold) { e.k = 1; e.st2 = 0.42; }
            } else if (e.k === 1) {
              e.st2 -= dt;
              if (e.st2 <= 0) { e.k = 2; e.spd = 120; if (canPlay('dash', 0.15)) tone(300, 0.2, 'sawtooth', 0.02, 900); if (L >= 3 && e.y < AIM.y - 80) fireAimed(e.x, e.y, 118, 'o', 0, 3, 0.3); }
            } else {
              e.spd = Math.min(380 * spdMul(), e.spd + 700 * dt);
              e.x += Math.cos(e.aim) * e.spd * dt; e.y += Math.sin(e.aim) * e.spd * dt;
            }
            break;
          }
          case 4: case 11: {                        // vient se placer, reste un moment, repart sur le côté
            if (e.t < e.dur) { const k = ease(e.t / e.dur); e.y = lerp(e.y0, e.ty, k); }
            else if (e.t < e.dur + e.hold) {
              if (e.mv === 11) { e.tx += (clamp(AIM.x, 40, LW - 40) - e.tx) * Math.min(1, dt * 0.7); e.x = e.tx + Math.sin(e.t * 1.3) * 16; }
              else e.x = e.x0 + e.amp * Math.sin((e.t - e.dur) * e.w);
              e.y = e.ty + Math.sin(e.t * 1.7) * 5;
            } else {
              e.fire = false;
              const dirx = e.x < LW / 2 ? -1 : 1;
              e.spd = Math.min(220, e.spd + 160 * dt);
              e.x += dirx * e.spd * dt; e.y += e.spd * 0.25 * dt;
            }
            break;
          }
          case 5: e.x += e.vx * dt; e.y += e.vy * dt; e.ang += e.vr * dt; break;
          case 6: e.x += e.vx * dt; e.y = e.ty + Math.sin(e.t * 1.6) * 8 + e.t * 6; break;
          case 7: {
            e.y += e.spd * dt; e.x = e.x0 + e.amp * Math.sin(e.t * e.w + e.ph);
            e.histT -= dt;
            if (e.histT <= 0) { e.histT = 0.03; e.hi = (e.hi + 1) & 63; e.hist[e.hi * 2] = e.x; e.hist[e.hi * 2 + 1] = e.y; }
            break;
          }
          case 8: {
            const h = e.lead;
            if (h && h.alive && h.hist) { const j = ((h.hi - (e.seg + 1) * 3) & 63) * 2; e.x = h.hist[j]; e.y = h.hist[j + 1]; }
            else { e.y += 60 * dt; }
            break;
          }
          case 9: {                                 // drone de la Reine : tourne autour du joueur puis plonge
            const tx = AIM.x + Math.cos(e.t * 1.6 + e.ph) * 70, ty = Math.min(AIM.y - 80, 120 + e.t * 30) + Math.sin(e.t * 2.1 + e.ph) * 30;
            e.vx += (tx - e.x) * 2.2 * dt; e.vy += (ty - e.y) * 2.2 * dt;
            e.vx *= 1 - Math.min(1, dt * 1.2); e.vy *= 1 - Math.min(1, dt * 1.2);
            if (e.t > 7) e.vy += 200 * dt;
            e.x += e.vx * dt; e.y += e.vy * dt;
            break;
          }
          case 10: {                                // gardien (mini-boss)
            if (e.t < 2.2) e.y = lerp(e.y0, e.ty, ease(e.t / 2.2));
            else { e.x = LW / 2 + Math.sin((e.t - 2.2) * 0.55) * (LW * 0.27); e.y = e.ty + Math.sin(e.t * 1.1) * 10; }
            break;
          }
          case 12: {                                // furtif : se déplace camouflé, apparaît pour tirer
            if (e.k === 0) {
              const dx = e.tx - e.x, dy = e.ty2 - e.y, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
              const v = Math.min(d, 170 * dt); e.x += (dx / d) * v; e.y += (dy / d) * v;
              e.cloak = Math.max(0.1, e.cloak - dt * 2.5);
            }
            break;
          }
          default: break;
        }
        if (dt > 0) { e.vx = e.mv === 5 || e.mv === 9 ? e.vx : (e.x - ox) / dt; e.vy = e.mv === 5 || e.mv === 9 ? e.vy : (e.y - oy) / dt; }
        if (!e.entered && e.y > -e.r * 0.5 && e.x > -e.r && e.x < LW + e.r) { e.entered = true; if (e.head) sayFriend(e); }
        // comportement (tirs)
        if (e.entered && canFire && e.y < LH - 40) { rng = e.rng; behave(e, dt, fm); rng = null; }
        // sortie de l'écran
        if (e.entered && (e.y > LH + 70 || e.y < -280 || e.x < -160 || e.x > LW + 160)) { e.alive = false; if (e === miniRef) miniRef = null; continue; }
        if (!e.entered && e.t > 14) { e.alive = false; continue; }
        // collision avec le vaisseau
        for (let k = 0; k < SHIPS.length; k++) {
          const s = SHIPS[k];
          if (s.alive && e.entered && (k === 0 || e.alive)) {
            const dx = e.x - s.x, dy = e.y - s.y, rr = e.r * 0.72 + 8;
            if (dx * dx + dy * dy < rr * rr) {
              if (s.inv <= 0 && !god && state === 'play' && hurtOk(s)) { hurtShip(s); if (e.hp < 12 && e.type !== 'gardien') { HITBY = s.i; killEnemy(e, true); } }
            }
          }
        }
      }
      for (let i = enN - 1; i >= 0; i--) if (!EN[i].alive) { swapOut(EN, i, enN); enN--; }
      for (let i = BOOMQ.length - 1; i >= 0; i--) {
        const q = BOOMQ[i];
        q.t -= dt;
        if (q.t <= 0) { explode(q.x, q.y, q.s, q.c); if (q.s >= 3) SFX.big(); else SFX.boom(); BOOMQ.splice(i, 1); }
      }
    }

    function behave(e, dt, fm) {
      switch (e.type) {
        case 'swarm':
          if (e.fire && e.y > 8 && e.y < LH * 0.62) {
            e.st -= dt * fm;
            if (e.st <= 0) { e.st = crnd(2.2, 4); fireAimed(e.x, e.y + 7, 112, 'p', 0, L >= 9 ? 3 : L >= 4 ? 2 : 1, 0.16); }
          }
          break;
        case 'frigate': {
          e.aim += angDiff(e.aim, aimAt(e.x, e.y)) * Math.min(1, dt * 3);
          if (!e.fire) break;
          e.st -= dt * fm;
          if (e.st <= 0 && e.y > 10) { e.st = crnd(2.1, 2.9); e.k = 3 + Math.min(3, Math.floor(L / 3)); e.st2 = 0; }
          if (e.k > 0) {
            e.st2 -= dt;
            if (e.st2 <= 0) {
              e.st2 = 0.13; e.k--;
              const tx = e.x + Math.cos(e.aim) * 14, ty = e.y + Math.sin(e.aim) * 14;
              if (L >= 8) fireArc(tx, ty, e.aim, 0.5, 5, 128, 'o', 0); else if (L >= 3) fireArc(tx, ty, e.aim, 0.32, 3, 128, 'o', 0); else ebA(tx, ty, e.aim, 128 * spdMul(), 'o', 0);
              part(tx, ty, 0, 0, 0.08, 8, 14, GL.o, true, 0);
            }
          }
          break;
        }
        case 'miner':
          e.st -= dt;
          if (e.st <= 0 && e.x > 10 && e.x < LW - 10) {
            e.st = 0.95;
            const m = spawnEnemy('mine', e.x, e.y + 10, 0);
            if (m) { m.mv = 5; m.vx = 0; m.vy = 34; m.vr = rnd(-1, 1); m.entered = true; m.fire = false; }
          }
          break;
        case 'mine': {
          const tp = CO ? nearShip(e.x, e.y) : P, dx = tp.x - e.x, dy = tp.y - e.y;
          if (e.k === 0 && dx * dx + dy * dy < 56 * 56) { e.k = 1; e.st2 = 0.62; if (canPlay('mine', 0.1)) tone(1200, 0.08, 'square', 0.03); }
          if (e.k === 1) { e.st2 -= dt; if (e.st2 <= 0) killEnemy(e, false); }
          break;
        }
        case 'sentinel':
          if (!e.fire) break;
          e.st -= dt * Math.min(fm, 1.6);
          if (e.st <= 0 && !e.beam && e.t > e.dur) { e.st = crnd(3.4, 4.6); e.beam = addBeam(e, aimAt(e.x, e.y + 8), 1.0, 0.75, 9, 'm', 0, 8, false); }
          if (e.beam && BEAMS.indexOf(e.beam) < 0) e.beam = null;
          break;
        case 'snakeB':
          e.st -= dt * fm;
          if (e.st <= 0 && e.y > 20) { e.st = crnd(3.2, 5.5); fireAimed(e.x, e.y, 104, 'g', 3, 1, 0); }
          break;
        case 'cruiser': {
          const want = Math.atan2(AIM.y - e.y, AIM.x - e.x) - Math.PI / 2;
          e.ang += clamp(angDiff(e.ang, want), -0.55 * dt, 0.55 * dt);
          if (!e.fire) break;
          e.st -= dt * fm;
          if (e.st <= 0 && e.y > 10) {
            e.st = crnd(2.2, 2.8);
            const fa = e.ang + Math.PI / 2;
            fireArc(e.x + Math.cos(fa) * 26, e.y + Math.sin(fa) * 26, fa, 0.95, L >= 8 ? 7 : 5, 118, 'v', 2);
          }
          break;
        }
        case 'stealth': {
          if (e.k === 0) {
            e.st -= dt;
            if (e.st <= 0) { e.k = 1; e.st = 0.45; }
          } else if (e.k === 1) {
            e.cloak = Math.min(1, e.cloak + dt * 2.2); e.st -= dt;
            if (e.st <= 0) { e.k = 2; e.st = 0.7; fireAimed(e.x, e.y + 8, 150, 'v', 2, 3, 0.16); }
          } else if (e.k === 2) {
            e.st -= dt;
            if (e.st <= 0) { e.k = 0; e.st = crnd(1.5, 2.3); e.s2 = (e.s2 || 0) + 1; e.tx = crnd(40, LW - 40); e.ty2 = crnd(70, LH * 0.45); if (e.s2 >= 4) { e.tx = e.x < LW / 2 ? -100 : LW + 100; e.ty2 = e.y + 60; } }
          }
          break;
        }
        case 'weaver': {
          if (!e.fire || e.y < 10) break;
          e.st -= dt;
          if (e.k > 0) {
            e.st2 -= dt;
            if (e.st2 <= 0) {
              e.st2 = 0.12 / Math.min(1.6, fm);
              e.aim += 0.36;
              const v = 92 * spdMul();
              ebA(e.x, e.y, e.aim, v, 'y', 3); ebA(e.x, e.y, e.aim + Math.PI, v, 'y', 3);
              if (L >= 10) ebA(e.x, e.y, e.aim + Math.PI / 2, v, 'y', 3);
              e.k -= 0.12;
            }
          } else if (e.st <= 0) { e.st = crnd(1.6, 2.2); e.k = 1.5; }
          break;
        }
        case 'elite':
          if (!e.fire || e.y < 10) break;
          e.st -= dt * fm;
          if (e.st <= 0) {
            e.st = 1.5; e.k++;
            if (e.k % (L >= 6 ? 2 : 3) === 0) fireRing(e.x, e.y, 12 + Math.min(8, L), 96, 'p', 0, crand());
            else fireAimed(e.x, e.y + 16, 138, 'p', 3, 3, 0.2);
          }
          break;
        case 'drone':
          e.st -= dt * fm;
          if (e.st <= 0) { e.st = crnd(2.4, 4); if (e.y < AIM.y - 60) fireAimed(e.x, e.y, 118, 'g', 0, 1, 0); }
          break;
        case 'gardien': gardienFire(e, dt, fm); break;
        default: break;
      }
    }

    // ------------------------------------------------------------- mini-boss : le Gardien (4 variantes de tirs)
    let miniRef = null;
    function spawnGardien() {
      if (SEED !== null) rng = subRng(50);         // graine : tirage propre au mini-boss
      const e = spawnEnemy('gardien', LW / 2, -70, 0);
      if (!e) { rng = null; return null; }
      e.mv = 10; e.y0 = -70; e.ty = 128; e.r = 40; e.mini = true; e.var = secI % 4; e.hue = secHue;
      e.max = e.hp = ET.gardien.hp * 1.5 * (1 + 0.45 * L + 1.0 * cycle) * (1 + (rank() - 1) * 0.6);
      if (CO) e.max = e.hp = e.hp * teamMiniHp();
      e.pts = 8000 + 2000 * L;
      if (heads.length && cchance(0.4)) e.head = pickHead();
      rng = null;
      e.st = 2.8;
      miniRef = e;
      return e;
    }
    function gardienFire(e, dt, fm) {
      if (e.t < 2.2) return;
      const rage = e.hp < e.max * 0.45, f = Math.min(2.4, fm) * 1.2 * (rage ? 1.3 : 1);
      e.st -= dt * f;
      e.st2 -= dt * f;
      const v = e.var;
      if (v === 0) {
        if (e.st <= 0) { e.st = 1.7; fireAimed(e.x, e.y + 30, 130, 'o', 3, rage ? 7 : 5, 0.17); }
        if (e.st2 <= 0) { e.st2 = 3.6; fireRing(e.x, e.y, rage ? 22 : 16, 92, 'p', 0, crand()); }
      } else if (v === 1) {
        if (e.st <= 0) {
          e.st = 0.1; e.aim += rage ? 0.29 : 0.24; e.k++;
          if ((e.k % 40) < 26) { const sp = 100 * spdMul(); ebA(e.x, e.y + 8, e.aim, sp, 'y', 0); ebA(e.x, e.y + 8, e.aim + Math.PI, sp, 'y', 0); if (rage) ebA(e.x, e.y + 8, -e.aim, sp, 'o', 0); }
        }
        if (e.st2 <= 0) { e.st2 = 2.6; fireAimed(e.x - 44, e.y + 30, 140, 'o', 2, 1, 0); fireAimed(e.x + 44, e.y + 30, 140, 'o', 2, 1, 0); }
      } else if (v === 2) {
        if (e.st <= 0) {
          e.st = rage ? 0.9 : 1.3;
          for (let s = -1; s <= 1; s += 2) { const m = spawnEnemy('mine', e.x + s * 44, e.y + 30, 0); if (m) { m.mv = 5; m.vx = s * crnd(10, 40); m.vy = crnd(40, 70); m.vr = 1; m.entered = true; m.pts = 20; m.sh = 0; } }
        }
        if (e.st2 <= 0) { e.st2 = 1.9; fireAimed(e.x, e.y + 30, 135, 'g', 3, rage ? 5 : 3, 0.22); }
      } else {
        if (e.st <= 0 && !e.beam) {
          e.st = rage ? 2.6 : 3.4;
          const a = aimAt(e.x, e.y);
          e.beam = addBeam(e, a - 0.32, 1.05, 0.8, 10, 'm', -44, 30, false);
          addBeam(e, a + 0.32, 1.05, 0.8, 10, 'm', 44, 30, false);
        }
        if (e.beam && BEAMS.indexOf(e.beam) < 0) e.beam = null;
        if (e.st2 <= 0) { e.st2 = 1.5; fireAimed(e.x, e.y + 34, 150, 'v', 2, rage ? 4 : 2, 0.14); }
      }
    }
    function cruiserBlocks(e, s) {
      const fa = e.ang + Math.PI / 2, ha = Math.atan2(s.y - e.y, s.x - e.x);
      return Math.abs(angDiff(fa, ha)) < 0.98;
    }

    // ------------------------------------------------------------- balles ennemies et rayons
    function updEB(dt) {
      const pr = 4.5;
      for (let i = ebN - 1; i >= 0; i--) {
        const b = EB[i];
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.t += dt;
        if (b.acc) {
          const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) + 0.001, ns = Math.max(20, Math.min(320, sp + b.acc * dt));
          b.vx *= ns / sp; b.vy *= ns / sp;
        }
        if (b.turn) { const c = Math.cos(b.turn * dt), s = Math.sin(b.turn * dt), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
        if (hole) {
          const dx = hole.x - b.x, dy = hole.y - b.y, d2 = dx * dx + dy * dy + 400;
          if (d2 < 24 * 24) { swapOut(EB, i, ebN); ebN--; continue; }
          const d = Math.sqrt(d2), f = 5.5e5 * hole.k / d2 * dt;
          b.vx += (dx / d) * f; b.vy += (dy / d) * f;
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -24 || b.x > LW + 24 || b.y < -50 || b.y > LH + 24 || b.t > b.life) { swapOut(EB, i, ebN); ebN--; continue; }
        for (let k = 0; k < SHIPS.length; k++) {
          const s = SHIPS[k];
          if (s.alive && s.inv <= 0 && state === 'play' && hurtOk(s)) {
            const dx = b.x - s.x, dy = b.y - s.y + 1, rr = b.r + pr;
            if (dx * dx + dy * dy < rr * rr) { if (NETH) netEvt(['x', b.id]); swapOut(EB, i, ebN); ebN--; hurtShip(s); break; }
          }
        }
      }
      for (let i = BEAMS.length - 1; i >= 0; i--) {
        const bm = BEAMS[i];
        bm.t += dt;
        const o = bm.owner;
        if (o && (o.alive === false || (o.uid !== undefined && o.uid !== bm.ouid))) { BEAMS.splice(i, 1); continue; }
        if (o) { bm.x = o.x + bm.ox; bm.y = o.y + bm.oy; }
        if (CO && bm.track) AIM = nearShip(bm.x, bm.y);
        if (bm.track && bm.t < bm.warn * 0.7) bm.ang += angDiff(bm.ang, aimAt(bm.x, bm.y)) * Math.min(1, dt * 2.5);
        if (bm.t >= bm.warn && bm.t - dt < bm.warn) { SFX.laser(); shake = Math.max(shake, 3); }
        if (bm.t > bm.warn + bm.dur) { BEAMS.splice(i, 1); continue; }
        for (let k = 0; k < SHIPS.length; k++) {
          const s = SHIPS[k];
          if (bm.t >= bm.warn && s.alive && s.inv <= 0 && state === 'play' && hurtOk(s)) {
            const ex = bm.x + Math.cos(bm.ang) * bm.len, ey = bm.y + Math.sin(bm.ang) * bm.len;
            const rr = bm.w * 0.5 + 3;
            if (segDist2(s.x, s.y, bm.x, bm.y, ex, ey) < rr * rr) hurtShip(s);
          }
        }
      }
    }

    // ------------------------------------------------------------- bandeaux (annonces)
    const BAN = { main: '', sub: '', sub2: '', col: '#fff', t: 0, dur: 0, kind: 0 };
    function banner(main, sub, col, dur, kind, sub2) { BAN.main = main; BAN.sub = sub || ''; BAN.sub2 = sub2 || ''; BAN.col = col || '#fff'; BAN.t = 0; BAN.dur = dur || 2; BAN.kind = kind || 0; }
    let tally = [];                              // lignes du bilan de secteur

    // ------------------------------------------------------------- directeur : secteurs, vagues, événements
    const dir = { phase: 'intro', t: 0, wave: 0, nW: 5, plan: [], pi: 0, groups: [], gi: 0, wt: 0, last: 0, ev: null, evT: 0, evNext: 0, swapped: false, prevGap: LW / 2, evS: 0, evK: 0 };
    const GROUPS = [                             // [sorte, secteur d'apparition, poids]
      ['col', 0, 3], ['vee', 0, 2], ['sweepL', 0, 2], ['sweepR', 0, 2], ['loop', 0, 2], ['darts', 0, 2],
      ['frig', 1, 3], ['rocks', 1, 1.5], ['elite', 0, 0.9], ['miner', 2, 2.2], ['snake', 2, 1.6], ['sent', 3, 2.2], ['drones', 3, 1.4],
      ['stealth', 4, 2.4], ['cruiser', 5, 2.2], ['weaver', 6, 2.4]
    ];
    const NOVELTY = [null, 'frig', 'miner', 'sent', 'stealth', 'cruiser', 'weaver', 'elite'];
    function pickGroup() {
      let tot = 0;
      const lim = cycle > 0 ? 7 : secI;
      for (let i = 0; i < GROUPS.length; i++) { const g = GROUPS[i]; if (g[1] <= lim) tot += g[2] * (g[1] === secI ? 1.8 : 1); }
      let r = crand() * tot;
      for (let i = 0; i < GROUPS.length; i++) {
        const g = GROUPS[i];
        if (g[1] > lim) continue;
        r -= g[2] * (g[1] === secI ? 1.8 : 1);
        if (r <= 0) return g[0];
      }
      return 'col';
    }
    function W(at, k, n, a, b) { return { at, k, n: n || 0, a: a == null ? -1 : a, b: b == null ? -1 : b }; }
    function buildWave(w) {
      const g = [];
      if (cycle === 0 && secI === 0) {
        const X = LW;
        if (w === 0) g.push(W(0.5, 'col', 5, X * 0.3, 40), W(2.6, 'col', 5, X * 0.7, 40), W(4.8, 'vee', 7), W(6.5, 'carrier', 0, 'P'), W(8.5, 'sweepL', 6), W(10.8, 'sweepR', 6), W(13, 'darts', 2), W(14.5, 'col', 6, X * 0.5, 80), W(16, 'carrier', 0, '?'));
        else if (w === 1) g.push(W(0.5, 'sweepL', 8), W(2.5, 'darts', 3), W(4.2, 'frig', 1), W(5.5, 'vee', 9), W(7.5, 'darts', 3), W(9, 'loop', 7), W(10, 'carrier', 0, '?'), W(11.8, 'sweepR', 8), W(13.5, 'col', 7, X * 0.25, 50), W(13.9, 'col', 7, X * 0.75, 50));
        else if (w === 2) g.push(W(0.5, 'col', 8, X * 0.5, 90), W(2, 'loop', 7), W(3.5, 'elite'), W(5, 'darts', 4), W(6.5, 'vee', 11), W(8, 'carrier', 0, 'M'), W(9.5, 'sweepL', 9), W(10.1, 'sweepR', 9), W(12, 'frig', 2), W(14, 'darts', 4));
        else if (w === 3) g.push(W(0.5, 'vee', 11), W(2.2, 'frig', 2), W(4, 'darts', 5), W(5.5, 'sweepL', 9), W(6.6, 'sweepR', 9), W(8.5, 'elite'), W(9, 'col', 8, X * 0.3, 60), W(9.4, 'col', 8, X * 0.7, 60), W(10.2, 'carrier', 0, '?'), W(12, 'loop', 9), W(13.5, 'darts', 5));
        else g.push(W(0.5, 'sweepL', 10), W(1.5, 'sweepR', 10), W(3.5, 'elite'), W(4.2, 'vee', 13), W(6.5, 'darts', 6), W(7.5, 'frig', 2), W(8.5, 'carrier', 0, 'O'), W(9, 'col', 9, X * 0.5, 120), W(11, 'elite'), W(11.5, 'loop', 9), W(13.5, 'sweepL', 11), W(14, 'sweepR', 11), W(16, 'darts', 6));
        if (CO) coopExtraGroups(g);
        return g;
      }
      let nG = Math.min(16, 7 + Math.floor(L * 0.5) + Math.min(3, cycle));
      let gap = clamp(2.5 - 0.09 * L, 1.1, 2.5);
      if (CO) { nG = teamNG(nG); gap = teamGap(gap); }
      let t = 0.5;
      if (w === 0 && NOVELTY[secI] && cycle === 0) { g.push(W(t, NOVELTY[secI], 0)); t += gap * 1.7; }
      for (let i = 0; i < nG; i++) {
        const k = pickGroup();
        g.push(W(t, k, 0));
        t += gap * (k === 'frig' || k === 'cruiser' || k === 'elite' || k === 'snake' || k === 'weaver' ? 1.55 : 1) * crnd(0.85, 1.15);
      }
      g.push(W(crnd(2.5, Math.max(3, t * 0.6)), 'carrier', 0, '?'));
      if (CO) g.push(W(crnd(3, Math.max(4, t * 0.75)), 'carrier', 0, '?'));   // à deux : un porteur de plus par vague
      if (L >= 6 && cchance(0.5)) g.push(W(crnd(4, Math.max(5, t * 0.8)), 'carrier', 0, '?'));
      g.sort((a, b) => a.at - b.at);
      return g;
    }
    function sz(base, extra) { return Math.max(1, Math.round((base + crand() * extra) * densMul())); }
    function setFire(e) { e.fire = !(cycle === 0 && secI === 0 && dir.wave <= 1); }
    function spawnGroup(G) {
      const k = G.k, X = LW;
      if (G.s !== undefined) rng = mulberry32(G.s);   // graine : chaque groupe a son propre tirage
      switch (k) {
        case 'col': {
          const n = G.n || sz(5, 3), x = G.a >= 0 ? G.a : crnd(70, X - 70), amp = G.b >= 0 ? G.b : crnd(30, 90), spd = crnd(70, 92) * Math.min(1.35, spdMul() + 0.1);
          for (let i = 0; i < n; i++) { const e = spawnEnemy('swarm', x, -20, i * 0.34); if (!e) break; e.mv = 1; e.x0 = x; e.amp = amp; e.w = 1.7; e.ph = 0; e.spd = spd; setFire(e); }
          break;
        }
        case 'vee': {
          const n = G.n || sz(7, 4), cx = G.a >= 0 ? G.a : crnd(110, X - 110), mid = (n - 1) / 2, spd = crnd(64, 80) * Math.min(1.3, spdMul() + 0.1);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('swarm', 0, -20, Math.abs(i - mid) * 0.2); if (!e) break;
            e.mv = 1; e.x0 = clamp(cx + (i - mid) * 25, 16, X - 16); e.x = e.x0; e.amp = 10; e.w = 2; e.ph = i * 0.5; e.spd = spd; setFire(e);
          }
          break;
        }
        case 'sweepL': case 'sweepR': {
          const n = G.n || sz(6, 4), s = k === 'sweepL' ? 1 : -1, y0 = crnd(40, 110), dur = crnd(4.4, 5.2) / Math.min(1.25, spdMul() + 0.15);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('swarm', 0, 0, i * 0.24); if (!e) break;
            e.mv = 2; e.dur = dur;
            const xa = s > 0 ? -30 : X + 30, xb = s > 0 ? X + 40 : -40;
            e.p0 = xa; e.p1 = y0; e.p2 = X / 2 + s * X * 0.42; e.p3 = y0 + 50; e.p4 = X / 2 - s * X * 0.4; e.p5 = y0 + LH * 0.42; e.p6 = xb; e.p7 = y0 + LH * 0.26;
            bez(e, 0); setFire(e);
          }
          break;
        }
        case 'loop': {
          const n = G.n || sz(6, 3), x = crnd(60, X * 0.4), s = cchance(0.5), xa = s ? x : X - x, xb = X - xa, dur = crnd(5, 5.8);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('swarm', 0, 0, i * 0.26); if (!e) break;
            e.mv = 2; e.dur = dur;
            e.p0 = xa; e.p1 = -30; e.p2 = xa; e.p3 = LH * 0.78; e.p4 = xb; e.p5 = LH * 0.78; e.p6 = xb; e.p7 = -40;
            bez(e, 0); setFire(e);
          }
          break;
        }
        case 'darts': {
          const n = G.n || sz(2, 3);
          for (let i = 0; i < n; i++) {
            const x = clamp(X / 2 + (i - (n - 1) / 2) * 62 + crnd(-20, 20), 24, X - 24);
            const e = spawnEnemy('dart', x, -24, i * 0.45); if (!e) break;
            e.mv = 3; e.x0 = x; e.ty = crnd(60, 150); e.hold = crnd(0.9, 1.4);
          }
          if (!dir.dartsSaid && secI === 0 && cycle === 0) { dir.dartsSaid = true; ftext(X / 2, 120, 'Attention : kamikazes !', '#ff9a1f', 14, 2, -6, 0); }
          break;
        }
        case 'carrier': {
          const e = spawnEnemy('carrier', crnd(50, X - 50), -24, 0); if (!e) break;
          e.mv = 1; e.x0 = e.x; e.amp = 30; e.w = 1.2; e.spd = 48; e.drop = G.a !== -1 ? G.a : '?';
          break;
        }
        case 'frig': {
          const n = G.n || (L >= 4 && cchance(0.6) ? 2 : 1);
          for (let i = 0; i < n; i++) {
            const x = n === 1 ? crnd(80, X - 80) : (i === 0 ? crnd(60, X * 0.4) : crnd(X * 0.6, X - 60));
            const e = spawnEnemy('frigate', x, -40, i * 0.8); if (!e) break;
            e.mv = 4; e.y0 = -40; e.ty = crnd(90, 170); e.dur = 1.6; e.hold = crnd(8, 10.5); e.amp = 30; e.w = 0.8; e.st = 1.2;
          }
          break;
        }
        case 'rocks': {
          const n = G.n || sz(4, 3);
          for (let i = 0; i < n; i++) spawnRock(i * 0.4);
          break;
        }
        case 'miner': {
          const s = cchance(0.5) ? 1 : -1;
          const e = spawnEnemy('miner', s > 0 ? -30 : X + 30, crnd(70, 150), 0); if (!e) break;
          e.mv = 6; e.vx = s * crnd(58, 72); e.ty = e.y; e.st = 0.6; e.entered = true;
          break;
        }
        case 'sent': {
          const n = G.n || (L >= 5 ? 2 : 1);
          for (let i = 0; i < n; i++) {
            const x = n === 1 ? crnd(70, X - 70) : (i === 0 ? crnd(40, 110) : crnd(X - 110, X - 40));
            const e = spawnEnemy('sentinel', x, -30, i * 0.6); if (!e) break;
            e.mv = 4; e.y0 = -30; e.ty = crnd(70, 140); e.dur = 1.5; e.hold = 10; e.amp = 12; e.w = 0.9; e.st = 0.8;
          }
          break;
        }
        case 'snake': {
          const n = G.n || sz(7, 4), x = crnd(110, X - 110);
          const h = spawnEnemy('snakeH', x, -20, 0); if (!h) break;
          h.mv = 7; h.x0 = x; h.amp = crnd(60, 100); h.w = crnd(1, 1.4); h.spd = crnd(46, 58) * Math.min(1.3, spdMul() + 0.1); h.ph = 0;
          h.hist = new Float32Array(128);
          for (let j = 0; j < 64; j++) { h.hist[j * 2] = x; h.hist[j * 2 + 1] = -20; }
          for (let i = 0; i < n; i++) { const s = spawnEnemy('snakeB', x, -30, 0); if (!s) break; s.mv = 8; s.lead = h; s.seg = i; s.st = crnd(1.5, 4) + i * 0.25; }
          break;
        }
        case 'cruiser': {
          const e = spawnEnemy('cruiser', crnd(90, X - 90), -40, 0); if (!e) break;
          e.mv = 4; e.y0 = -40; e.ty = crnd(110, 150); e.dur = 2; e.hold = 13; e.amp = 40; e.w = 0.55; e.st = 1.6;
          for (let i = 0; i < 2; i++) { const s = spawnEnemy('swarm', 0, 0, 1 + i * 0.3); if (!s) break; s.mv = 1; s.x0 = clamp(e.x + (i ? 40 : -40), 20, X - 20); s.amp = 18; s.w = 2; s.spd = 60; }
          break;
        }
        case 'stealth': {
          const n = G.n || sz(2, 2);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('stealth', crnd(40, X - 40), -20, i * 0.7); if (!e) break;
            e.mv = 12; e.cloak = 0.15; e.k = 0; e.st = crnd(1.4, 2.2); e.tx = crnd(40, X - 40); e.ty2 = crnd(70, LH * 0.42);
          }
          break;
        }
        case 'weaver': {
          const n = G.n || (L >= 9 ? 2 : 1);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('weaver', n === 1 ? crnd(90, X - 90) : (i ? X * 0.72 : X * 0.28), -30, i * 0.5); if (!e) break;
            e.mv = 4; e.y0 = -30; e.ty = crnd(100, 160); e.dur = 1.6; e.hold = 9; e.amp = 20; e.w = 0.6; e.st = 0.5;
          }
          break;
        }
        case 'elite': {
          const e = spawnEnemy('elite', crnd(80, X - 80), -40, 0); if (!e) break;
          e.mv = 11; e.y0 = -40; e.ty = crnd(100, 140); e.dur = 1.8; e.hold = crnd(12, 14); e.tx = e.x; e.st = 1.4;
          eliteSeq++;
          if (heads.length && (eliteSeq % 3 === 1 || cchance(0.2))) e.head = pickHead();
          e.drop = 'P';
          break;
        }
        case 'drones': {
          const n = G.n || sz(4, 3);
          for (let i = 0; i < n; i++) {
            const s = i & 1 ? 1 : -1;
            const e = spawnEnemy('drone', s > 0 ? X + 20 : -20, crnd(40, 120), i * 0.35); if (!e) break;
            e.mv = 9; e.vx = -s * 90; e.vy = 20; e.st = crnd(1.5, 3);
          }
          break;
        }
        default: break;
      }
      rng = null;
    }
    function spawnRock(delay) {
      const r = crand(), size = r < 0.3 ? 'rockL' : r < 0.72 ? 'rockM' : 'rockS';
      const e = spawnEnemy(size, crnd(20, LW - 20), -40, delay || 0);
      if (!e) return;
      e.mv = 5; e.vx = crnd(-22, 22); e.vy = crnd(48, 96) * Math.min(1.4, spdMul() + 0.15); e.vr = crnd(-1.6, 1.6); e.seed = crndi(0, 2);
      e.rich = size !== 'rockS' && cchance(0.13);
      if (e.rich) { e.pts *= 2; e.sh += 4; }
    }

    // ---- événements de secteur
    const EVS = ['rocks', 'mines', 'storm', 'dark', 'lasers', 'hole'];
    function chooseEvent(w) {
      if (SEC.event === 'mix') return w === 1 || w === 3 || w === 4 ? EVS[(w * 7 + cycle * 3 + crndi(0, 5)) % 6] : null;
      if (SEC.event && (w === 1 || w === 3 || (cycle > 0 && w === 4))) return SEC.event;
      if (cycle > 0 && w === 2 && secI > 0) return EVS[crndi(0, Math.min(5, secI - 1))];
      return null;
    }
    function startEvent(ev) {
      dir.ev = ev; dir.evT = 0; dir.evNext = 1.2;
      banner(EVENT_NAMES[ev], EVENT_TIPS[ev], SEC.acc, 2.4, 1);
      SFX.warn();
      if (ev === 'hole') hole = { x: crnd(90, LW - 90), y: -100, k: 0, t: 0, leaving: false };
      if (ev === 'dark') darkOn = true;
    }
    function endEvent() {
      if (dir.ev === 'hole' && hole) hole.leaving = true;
      darkOn = false;
      dir.ev = null;
    }
    function updEvent(dt) {
      darkK += ((darkOn ? 1 : 0) - darkK) * Math.min(1, dt * 1.5);
      if (dir.ev && dir.phase === 'wave' && state === 'play') {
        dir.evT += dt; dir.evNext -= dt;
        const ev = dir.ev;
        if (dir.evNext <= 0) {
          if (SEED !== null) rng = mulberry32((dir.evS ^ Math.imul(++dir.evK, 0x9E3779B1)) >>> 0);   // graine : une par salve
          if (ev === 'rocks') { spawnRock(0); dir.evNext = crnd(0.5, 0.85) / Math.sqrt(densMul()); }
          else if (ev === 'mines') {
            dir.evNext = 1.8;
            const gapC = crnd(50, LW - 50);
            for (let x = 22; x < LW - 10; x += 46) {
              if (Math.abs(x - gapC) < 50 || cchance(0.3)) continue;
              const m = spawnEnemy('mine', x + crnd(-8, 8), -20, 0);
              if (m) { m.mv = 5; m.vx = 0; m.vy = 40; m.vr = rnd(-1, 1); m.pts = 40; }
            }
          } else if (ev === 'storm') {
            dir.evNext = crnd(1.3, 2.3) / Math.sqrt(densMul());
            BOLTS.push({ x: clamp((CO ? boltShip() : P).x + crnd(-70, 70), 16, LW - 16), t: 0, warn: 1.1, dur: 0.32, seed: Math.random() * 100 });
            if (NETH) netBolt(BOLTS[BOLTS.length - 1]);
            if (chance(0.4)) glitch = 0.35;
          } else if (ev === 'lasers') {
            dir.evNext = clamp(3.8 - 0.1 * L, 2.6, 3.8);
            const two = L >= 9 && cchance(0.5), gw = two ? 76 : 92;
            let c = clamp(dir.prevGap + crnd(-120, 120), gw / 2 + 10, LW - gw / 2 - 10);
            dir.prevGap = c;
            let gaps = [c - gw / 2, c + gw / 2];
            if (two) { const c2 = c < LW / 2 ? c + crnd(140, 180) : c - crnd(140, 180); if (c2 > gw / 2 && c2 < LW - gw / 2) gaps = c2 < c ? [c2 - gw / 2, c2 + gw / 2, c - gw / 2, c + gw / 2] : [c - gw / 2, c + gw / 2, c2 - gw / 2, c2 + gw / 2]; }
            GATES.push({ y: -12, t: 0, gaps });
            if (NETH) netGate(GATES[GATES.length - 1]);
          } else dir.evNext = 99;
          rng = null;
        }
      }
      for (let i = BOLTS.length - 1; i >= 0; i--) {
        const b = BOLTS[i];
        b.t += dt;
        if (b.t >= b.warn && b.t - dt < b.warn) { SFX.zap(); flashA = Math.max(flashA, 0.18); flashCol = '#c9b8ff'; shake = Math.max(shake, 4); light(b.x, LH / 2, 200, 0.4); }
        for (let k = 0; k < SHIPS.length; k++) { const s = SHIPS[k]; if (b.t >= b.warn && b.t < b.warn + 0.18 && s.alive && hurtOk(s) && Math.abs(s.x - b.x) < 15) hurtShip(s); }
        if (b.t > b.warn + b.dur) BOLTS.splice(i, 1);
      }
      for (let i = GATES.length - 1; i >= 0; i--) {
        const g = GATES[i];
        g.t += dt; g.y += 62 * dt;
        for (let k = 0; k < SHIPS.length; k++) {
          const s = SHIPS[k];
          if (g.t > 1.2 && s.alive && hurtOk(s) && Math.abs(s.y - g.y) < 6) {
            let safe = false;
            for (let j = 0; j < g.gaps.length; j += 2) if (s.x > g.gaps[j] + 4 && s.x < g.gaps[j + 1] - 4) safe = true;
            if (!safe) hurtShip(s);
          }
        }
        if (g.y > LH + 20) GATES.splice(i, 1);
      }
      if (hole && !hole.boss) {
        hole.t += dt;
        hole.y += (hole.leaving ? 80 : 20) * dt;
        hole.k = hole.leaving ? Math.max(0, hole.k - dt * 0.8) : Math.min(1, hole.k + dt * 0.45);
        hole.x = clamp(hole.x + Math.sin(hole.t * 0.5) * 14 * dt, 60, LW - 60);
        for (let k = 0; k < SHIPS.length; k++) { const s = SHIPS[k]; if (s.alive && hurtOk(s) && hole.k > 0.3) { const dx = s.x - hole.x, dy = s.y - hole.y; if (dx * dx + dy * dy < 20 * 20) hurtShip(s); } }
        for (let j = 0; j < enN; j++) {
          const e = EN[j];
          if (!e.alive || e.delay > 0 || e.r > 20 || e.type === 'gardien') continue;
          const dx = e.x - hole.x, dy = e.y - hole.y;
          if (dx * dx + dy * dy < 24 * 24) killEnemy(e, true);
        }
        if (hole.y > LH + 160 || (hole.leaving && hole.k <= 0)) hole = null;
      }
    }

    // ---- enchaînement
    function makePlan() {
      const nW = secI === 0 && cycle === 0 ? 5 : 5 + ((secI + cycle) % 2);
      const p = [];
      for (let i = 0; i < nW; i++) { p.push('W'); if (i === 2) p.push('M'); }
      p.push('B');
      dir.nW = nW;
      return p;
    }
    function countActive() {
      let n = 0;
      for (let i = 0; i < enN; i++) { const e = EN[i]; if (e.alive && e.type !== 'mine') n++; }
      return n;
    }
    function startWave() {
      dir.wave++; dir.phase = 'wave'; dir.t = 0; dir.wt = 0; dir.gi = 0; dir.last = 0;
      L = secI + 8 * cycle + (dir.wave - 1) * 0.12;
      if (SEED !== null) rng = subRng(dir.wave);   // graine : la vague ne dépend pas de ce qui s'est passé avant
      dir.groups = buildWave(dir.wave - 1);
      const ev = chooseEvent(dir.wave - 1);
      if (ev) startEvent(ev);
      else if (dir.wave > 1) banner('VAGUE ' + dir.wave + ' / ' + dir.nW, '', SEC.acc, 1.3, 5);
      if (rng) {                                   // … ni ses groupes, ni les salves de son événement
        for (let i = 0; i < dir.groups.length; i++) dir.groups[i].s = (rng() * 4294967296) >>> 0;
        dir.evS = (rng() * 4294967296) >>> 0; dir.evK = 0; dir.prevGap = LW / 2;
        rng = null;
      }
    }
    function nextStep() {
      if (dir.pi >= dir.plan.length) return;
      const s = dir.plan[dir.pi++];
      dir.t = 0;
      if (s === 'W') startWave();
      else if (s === 'M') { dir.phase = 'mwarn'; banner('MINI-BOSS', MINI_NAMES[secI], '#ffb347', 1.8, 4); SFX.warn(); }
      else { dir.phase = 'warn'; banner('ALERTE', BOSS_NAMES[SEC.boss], '#ff4d6d', 2.8, 4); SFX.warn(); after(0.6, () => SFX.warn()); after(1.2, () => SFX.warn()); }
    }
    function updDirector(dt) {
      dir.t += dt;
      switch (dir.phase) {
        case 'intro': if (dir.t > 2.4) nextStep(); break;
        case 'wave': {
          dir.wt += dt;
          while (dir.gi < dir.groups.length && dir.groups[dir.gi].at <= dir.wt) { spawnGroup(dir.groups[dir.gi]); dir.gi++; dir.last = dir.wt; }
          if (dir.gi >= dir.groups.length && dir.wt - dir.last > 2 && (countActive() === 0 || dir.wt - dir.last > 11)) { endEvent(); dir.phase = 'gap'; dir.t = 0; }
          break;
        }
        case 'gap': if (dir.t > 1.5) nextStep(); break;
        case 'mwarn': if (dir.t > 1.8) { spawnGardien(); dir.phase = 'mini'; dir.t = 0; } break;
        case 'mini':
          if (!miniRef || !miniRef.alive) { dir.phase = 'gap'; dir.t = -0.8; }
          else if (dir.t > 55 && miniRef.mv === 10) { miniRef.mv = 4; miniRef.dur = 0; miniRef.hold = 0; miniRef.t = 1; miniRef.fire = false; miniRef = null; }
          break;
        case 'warn': if (dir.t > 2.8) { spawnBoss(); dir.phase = 'boss'; dir.t = 0; } break;
        case 'boss': break;
        case 'bossdead': if (dir.t > 3.2) sectorClear(); break;
        case 'clear': if (dir.t > 3.8) startJump(); break;
        case 'jump': updJump(dt); break;
        default: break;
      }
    }
    function sectorClear() {
      dir.phase = 'clear'; dir.t = 0;
      const n = secI + 1 + 8 * cycle;
      const nb = pts(5000 * n);
      score += nb;
      tally.push(['Secteur terminé', nb]);
      if (secNoHit) { const v = CO ? pts(20000 * n) : 15000 * n; score += v; tally.push([CO ? 'Sans être touchés !' : 'Sans être touché !', v]); }
      if (CO && secRescues > 0) tally.push(['Sauvetages ×' + secRescues, rescueBonus]);
      sectorsDone++;
      banner('SECTEUR TERMINÉ', SEC.name, SEC.acc, 3.6, 6);
      celebrate(CHEERS[(sectorsDone * 5 + rndi(0, 3)) % CHEERS.length]);
      SFX.friend();
    }
    function startJump() {
      dir.phase = 'jump'; dir.t = 0; dir.swapped = false;
      music();
      for (let i = 0; i < SHIPS.length; i++) SHIPS[i].auto = 1;
      for (let i = 0; i < enN; i++) { const e = EN[i]; if (e.alive) { explode(e.x, e.y, 1, 'v'); e.alive = false; } }
      cancelBullets(0, 0, -1, true);
      BEAMS.length = 0; BOLTS.length = 0; GATES.length = 0;
      if (hole) hole.leaving = true;
      darkOn = false;
      SFX.jump();
      banner('SAUT HYPERESPACE', '', '#9ff4ff', 2.1, 7);
    }
    function updJump(dt) {
      const t = dir.t;
      warp = t < 0.6 ? ease(t / 0.6) * 0.2 : t < 2.2 ? 0.2 + 0.8 * ease((t - 0.6) / 1.6) : t < 2.45 ? 1 : Math.max(0, 1 - (t - 2.45) / 1.3);
      scrollV = 60 + warp * 2300;
      if (t > 0.6 && t < 2.3) shake = Math.max(shake, 1.5 + warp * 2.5);
      if (t >= 2.2 && !dir.swapped) { dir.swapped = true; flashA = 1; flashCol = '#ffffff'; nextSector(); if (CO) crewJump(); }
      if (t > 3.9) { for (let i = 0; i < SHIPS.length; i++) SHIPS[i].auto = 0; warp = 0; scrollV = 60; dir.phase = 'intro'; dir.t = 0; }
    }
    function nextSector() {
      secI++;
      if (secI >= SECTORS.length) { secI = 0; cycle++; }
      applySector(true);
    }
    function applySector(withTitle) {
      SEC = SECTORS[secI];
      secHue = (SEC.hue + cycle * 41) % 360;
      secNoHit = true; tally = [];
      dir.wave = 0; dir.plan = makePlan(); dir.pi = 0; dir.dartsSaid = false; dir.prevGap = LW / 2;
      L = secI + 8 * cycle;
      if (SEED !== null) { lvlSeed = (SEED ^ Math.imul(cycle * 8 + secI + 1, 0x9E3779B1)) >>> 0; luck = subRng(0); }   // graine du secteur
      fetchHeads();
      bgDirty = true;
      newSectorBg();
      if (withTitle) secBanner(3.2);
    }
    function secBanner(dur) {                    // titre du secteur (cycle compris)
      banner(cycle > 0 ? 'CYCLE ' + ROMAN[Math.min(9, cycle)] + ' · SECTEUR ' + (secI + 1) : 'SECTEUR ' + (secI + 1), SEC.name, SEC.acc, dur, 3, cycle > 0 && secI === 0 ? 'Tout revient… en plus coriace !' : CO && secI === 0 ? 'Deux pilotes, une seule équipe !' : SEC.news);
    }

    // ------------------------------------------------------------- BOSS : infrastructure
    const BINIT = {}, BUPD = {}, BDRAW = {};
    const hpB = () => 1.15 * (1 + 0.42 * L + 1.4 * cycle) * (1 + (rank() - 1) * 0.5) * (CO ? teamBossHp() : 1);
    let forceFace = null;                        // (tests) forcer un boss avec / sans tête de copain
    function mkPart(x, y, r, mode, hp) { return { uid: uidSeq++, x, y, r, mode, hp: hp || 0, max: hp || 0, alive: true, flash: 0, hide: false, aim: Math.PI / 2, st: 0, a: 0, k: 0, depth: 0, ox: 0, oy: 0, dash: false, vx: 0, vy: 0, weak: 0, wk: 0, wkT: 0 }; }
    function music(name) {
      try { if (typeof api.music === 'function') { if (name) api.music(name); else api.music(); } } catch (e) { /* rien */ }
    }
    function spawnBoss() {
      const kind = SEC.boss;
      bossCount++;
      music('iloboss');
      fetchHeads();
      const want = forceFace === null ? (bossCount + cycle) % 2 === 1 : forceFace;
      forceFace = null;
      const face = heads.length && want ? pickHead() : null;
      B = { kind, x: LW / 2, y: -160, t: 0, hp: 0, maxHp: 0, phase: 0, nph: 3 + (cycle > 0 ? 1 : 0), ready: false, inv: 0, dying: false, dT: 0,
        parts: [], head: face, head2: null, st: 0, st2: 0, st3: 0, a: 0, a2: 0, k: 0, k2: 0, mode: 0, mT: 0, name: BOSS_NAMES[kind], flash: 0,
        enterT: 2.6, ty: 150, custom: false, bx: LW / 2, by: 150, open: 0, boomT: 0, cv: null, rage: 0, rng: SEED === null ? null : subRng(60) };
      BINIT[kind](B);
      B.maxHp = B.hp;
      if (CO) B.hpK = teamBossHp();
      banner(B.name, face ? OH(headName(face)) : (cycle > 0 ? 'Version ' + ROMAN[Math.min(9, cycle)] + ' — plus féroce !' : ''), '#ff6b8a', 2.6, 8);
      if (face) SFX.friend();
      if (NETH) netBoss();
    }
    function onBossPhase() {
      if (!B) return;
      cancelBullets(0, 0, -1, true);
      flashA = Math.max(flashA, 0.35); flashCol = '#ffffff'; shake = Math.max(shake, 8);
      SFX.phase();
      const last = B.phase >= B.nph - 1;
      banner(last ? (B.nph > 3 ? 'FURIE !' : 'COLÈRE !') : 'PHASE ' + (B.phase + 1), B.name, '#ff6b8a', 1.6, 9);
      ring(B.x, B.y, 20, 220, 0.6, '#ffd0dc', 4);
    }
    function bossDamage(d, x, y, p) {
      if (!B || B.dying || !B.ready) return;
      d = Math.min(d, B.hp);
      B.hp -= d; B.flash = 0.06;
      score += pts(Math.round(d * 6 / (B.hpK || 1)) * mult);   // (coop : un boss plus solide ne vaut pas plus de points)
      if (p) { p.flash = 0.06; bossHyper(d, SHIPS[HITBY] || P); }   // un coup au but (pas la bombe) recharge l'HYPER
      if (B.hp <= 0.001) { B.hp = 0; bossDefeated(); return; }
      if (!B.custom) {
        const ph = Math.min(B.nph - 1, Math.floor((1 - B.hp / B.maxHp) * B.nph));
        if (ph > B.phase) { B.phase = ph; onBossPhase(); }
      }
    }
    function hitBossPart(p, dmg, x, y) {
      if (!B || B.dying) return;
      if (p.mode === 'armor') dmg *= 0.25;
      else if (p.weak) {                          // point faible : plus de dégâts, repère qui s'allume
        dmg *= p.weak; p.wk = 1;
        if (p.wkT <= 0) { p.wkT = 0.11; sparks(x, y, 2, GL.y, 130, 0.28, 6); SFX.weak(); }
      }
      if (p.mode === 'sub') {
        const d = Math.min(dmg, p.hp);
        p.hp -= d; p.flash = 0.06;
        bossDamage(d, x, y, p);
        if (p.hp <= 0.001 && p.alive && B && !B.dying) { p.alive = false; partDestroyed(p); }
      } else bossDamage(dmg, x, y, p);
      if (Math.random() < 0.3) part(x, y, rnd(-40, 40), rnd(-80, -20), 0.16, 5, 0, p.mode === 'armor' ? GL.y : GL.w, true, 0);
      SFX.hit();
    }
    function partDestroyed(p) {
      explode(p.x, p.y, p.r > 30 ? 4 : 3, 'o');
      SFX.big();
      const r0 = rng;                             // graine : éclats tirés de la pièce (la jauge HYPER en dépend aussi)
      if (SEED !== null) rng = mulberry32((lvlSeed ^ Math.imul(p.uid + 7, 0x9E3779B1)) >>> 0);
      shards(p.x, p.y, 10);
      rng = r0;
      addPts(1500, p.x, p.y - 14, true);
      bumpChain(4);
      freezeT = Math.max(freezeT, 0.05);
      if (B && B.onPart) B.onPart(B, p);
    }
    function bossDefeated() {
      const b = B;
      b.dying = true; b.dT = 0; b.boomT = 0;
      music();
      slowT = 1.8; slowK = 0.3; freezeT = 0.12; flashA = 0.6; flashCol = '#ffffff'; shake = Math.max(shake, 16);
      cancelBullets(0, 0, -1, true);
      BEAMS.length = 0;
      for (let i = 0; i < enN; i++) { const e = EN[i]; if (e.alive) killEnemy(e, true); }
      SFX.big();
      const n = secI + 1 + 8 * cycle;
      const base = 20000 * n, quick = Math.max(0, Math.round((150 - b.t) * 300 * (1 + 0.1 * n) / 100) * 100);
      const bq = pts(base + quick);
      score += bq;
      tally.push(['Boss vaincu en ' + Math.round(b.t) + ' s', bq]);
      if (b.head) { const v = pts(5000 * n); score += v; tally.push([headName(b.head) + ' pleure !', v]); }
      if (b.head2) { const v = pts(5000 * n); score += v; tally.push([headName(b.head2) + ' pleure aussi !', v]); }
    }
    function updBoss(dt) {
      const b = B;
      if (!b) return;
      b.t += dt;
      if (b.flash > 0) b.flash -= dt;
      for (let i = 0; i < b.parts.length; i++) { const p = b.parts[i]; if (p.flash > 0) p.flash -= dt; if (p.wk > 0) p.wk = Math.max(0, p.wk - dt * 5); if (p.wkT > 0) p.wkT -= dt; }
      if (b.dying) {
        b.dT += dt; b.boomT -= dt;
        if (b.boomT <= 0 && b.dT < 1.7) {
          b.boomT = 0.09;
          const p = b.parts[(Math.random() * b.parts.length) | 0];
          const x = (p ? p.x : b.x) + rnd(-30, 30), y = (p ? p.y : b.y) + rnd(-26, 26);
          explode(x, y, chance(0.3) ? 3 : 2, chance(0.5) ? 'o' : 'm');
          if (chance(0.5)) SFX.boom();
        }
        if (b.dT >= 1.7) {
          explode(b.x, b.y, 4, 'o'); explode(b.x - 30, b.y + 10, 3, 'm'); explode(b.x + 30, b.y - 10, 3, 'y');
          ring(b.x, b.y, 20, 420, 1.0, '#ffffff', 6); ring(b.x, b.y, 10, 260, 0.8, '#ffd0a0', 4);
          sparks(b.x, b.y, 60, GL.y, 420, 1.1, 11);
          debris(b.x, b.y, 24, 260);
          shards(b.x, b.y, 50);
          if (CO) { capFor(b.x - 54, b.y, 'S', 0); capFor(b.x - 20, b.y, 'P', 0); capFor(b.x + 20, b.y, 'S', 1); capFor(b.x + 54, b.y, 'P', 1); }   // à deux : S + P pour chacun
          else { capsule(b.x - 20, b.y, 'S'); capsule(b.x + 20, b.y, 'P'); }
          flashA = 1; flashCol = '#ffffff'; shake = 22; freezeT = 0.1;
          SFX.big(); after(0.15, () => SFX.big());
          if (b.head && !(b.A && b.A.sadShown)) addFace(b.head, b.x, b.y + 20, SNIF(headName(b.head)), 96);
          if (b.head2 && !(b.Z && b.Z.sadShown)) addFace(b.head2, b.x + 60, b.y + 40, SNIF(headName(b.head2)), 80);
          if (hole && hole.boss) hole = null;
          banner('BOSS VAINCU !', b.name, '#ffd34d', 2.6, 10);
          B = null;
          dir.phase = 'bossdead'; dir.t = 0;
        }
        return;
      }
      if (b.t < b.enterT) {
        const k = ease(b.t / b.enterT);
        b.y = lerp(-160, b.ty, k); b.x = LW / 2;
        b.ready = false;
      } else if (!b.ready) { b.ready = true; b.st = 1; b.st2 = 1.5; b.st3 = 2; }
      if (b.ready) {                               // un boss qui traîne s'énerve : sa cadence de tir monte peu à peu
        const r0 = b.rage;
        b.rage = clamp((b.t - 75) / 60, 0, 1);
        if (r0 <= 0 && b.rage > 0) { banner('IL S’ÉNERVE !', b.name, '#ff4d6d', 1.6, 9); SFX.phase(); }
      }
      if (CO) AIM = bossAim();
      BUPD[b.kind](b, dt, b.ready && state === 'play' && (CO ? teamCanFire() : P.alive && P.auto <= 0));
      // collision corps du boss / vaisseau
      for (let k = 0; k < SHIPS.length; k++) {
        const s = SHIPS[k];
        if (s.alive && b.ready && hurtOk(s)) {
          for (let i = 0; i < b.parts.length; i++) {
            const p = b.parts[i];
            if (!p.alive || p.hide) continue;
            const dx = p.x - s.x, dy = p.y - s.y, rr = p.r * 0.8 + 8;
            if (dx * dx + dy * dy < rr * rr) { hurtShip(s); break; }
          }
        }
      }
    }
    function hitBlink() { return ((rt * 20) | 0) % 3 === 0; }   // éclat de touche intermittent (pas de voile blanc permanent)
    function bfm() { return Math.min(2.8, fireMul() * 1.25) * (B && B.phase >= B.nph - 1 ? 1.15 : 1) * (B ? 1 + B.rage * 1.2 : 1); }

    // ------------------------------------------------------------- 1. LA PLANÈTE VIVANTE
    BINIT.planete = (b) => {
      b.ty = 165; b.R = 62;
      b.img = planetImg(pick([20, 8, 4, 6]));
      b.core = mkPart(LW / 2, -160, 56, 'core', 0);
      b.moons = [];
      for (let i = 0; i < 3; i++) { const m = mkPart(0, 0, 15, 'sub', 70 * hpB()); m.img = planetImg([12, 13, 21][i]); b.moons.push(m); }
      b.parts.push(b.moons[0], b.moons[1], b.moons[2], b.core);
      b.hp = 820 * hpB() + 3 * 70 * hpB();
      b.mouth = 0; b.rad = 98;
      if (b.head) b.cv = facePlanet(b.head.img, b.img, b.R);
      b.onPart = (bb, p) => { ftext(p.x, p.y, 'LUNE DÉTRUITE !', '#ffd34d', 12, 1.2, -16, 0); };
    };
    BUPD.planete = (b, dt, act) => {
      if (b.ready) { b.x = LW / 2 + Math.sin((b.t - b.enterT) * 0.45) * 62; b.y = b.ty + Math.sin(b.t * 0.8) * 10; }
      b.core.x = b.x; b.core.y = b.y;
      b.a += dt * (0.85 + 0.35 * b.phase);
      b.rad = 98 + Math.sin(b.t * 1.3) * 8 * b.phase;
      let alive = 0;
      for (let i = 0; i < 3; i++) {
        const m = b.moons[i];
        if (!m.alive) continue;
        alive++;
        if (m.dash) {                             // la lune fonce sur le joueur
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.y > LH + 40 || m.x < -40 || m.x > LW + 40) { m.alive = false; explode(clamp(m.x, 0, LW), clamp(m.y, 0, LH), 2, 'o'); }
          continue;
        }
        const a = b.a + (i * TAU) / 3, sa = Math.sin(a);
        m.x = b.x + Math.cos(a) * b.rad; m.y = b.y + sa * b.rad * 0.5;
        m.hide = sa < -0.35; m.depth = sa;
        if (!act) continue;
        m.st -= dt * bfm();
        if (m.st <= 0 && !m.hide) {
          m.st = b.phase >= 1 ? 2.4 : 3.2;
          fireRing(m.x, m.y, 10 + b.phase * 2 + Math.min(6, L >> 1), 78, 'v', 0, b.t);
        }
      }
      if (!act) { b.mouth = Math.max(0, b.mouth - dt * 2); return; }
      b.mouth = Math.max(0, b.mouth - dt * 2.5);
      const mx = b.x, my = b.y + b.R * 0.42;
      b.st -= dt * bfm();
      if (b.st <= 0) {
        b.st = b.phase >= 2 ? 1.5 : 2.1;
        b.mouth = 1;
        fireAimed(mx, my, 130, 'o', 3, b.phase >= 1 ? 5 : 3, 0.2);
      }
      if (b.phase >= 1) {
        b.st2 -= dt * bfm();
        if (b.st2 <= 0) {
          b.st2 = 0.11; b.a2 += 0.31; b.k++;
          if (b.k % 46 < 26) { const v = 95 * spdMul(); ebA(mx, my, b.a2, v, 'p', 0); ebA(mx, my, b.a2 + Math.PI, v, 'p', 0); b.mouth = Math.max(b.mouth, 0.6); }
        }
      }
      if (b.phase >= 2) {
        b.st3 -= dt * bfm();
        if (b.st3 <= 0) {
          b.st3 = 1.8;
          fireRing(b.x, b.y, 18 + Math.min(10, L), 88, 'o', 1, crand());
          if (alive > 0 && cchance(0.55)) {           // une lune fonce sur le joueur (avertissement : elle clignote)
            for (let i = 0; i < 3; i++) {
              const m = b.moons[i];
              if (m.alive && !m.dash && !m.hide) { m.dash = true; const a = aimAt(m.x, m.y); m.vx = Math.cos(a) * 190 * spdMul(); m.vy = Math.sin(a) * 190 * spdMul(); ftext(m.x, m.y - 20, 'Attention !', '#ffb347', 11, 1, -10, 0); break; }
            }
          }
        }
      }
      if (b.phase >= 3) { b.st3 -= dt * 0.4; }
    };
    function facePlanet(img, tex, R) {           // le visage du copain devient la planète
      const sz = Math.ceil(R * 2 * RES) + 2, cv = mkCanvas(sz, sz), c = cv.getContext('2d');
      c.setTransform(RES, 0, 0, RES, sz / 2, sz / 2);
      circ(c, 0, 0, R); c.save(); c.clip();
      c.fillStyle = '#c98d5a'; c.fillRect(-R, -R, 2 * R, 2 * R);
      try {
        const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
        const h = R * 2.35, w = (h * iw) / ih;
        c.drawImage(img, -w / 2, -h * 0.5 + R * 0.06, w, h);
        c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.45;
        c.drawImage(tex, -R * 1.05, -R * 1.05, R * 2.1, R * 2.1);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      } catch (e) { /* rien */ }
      c.fillStyle = rad(c, -R * 0.4, -R * 0.45, R * 0.2, 0, 0, R * 1.02, [0, 'rgba(255,255,255,0.12)', 0.55, 'rgba(0,0,0,0)', 0.85, 'rgba(0,0,20,0.35)', 1, 'rgba(0,0,30,0.75)']);
      c.fillRect(-R, -R, 2 * R, 2 * R);
      c.restore();
      circ(c, 0, 0, R - 0.6); c.strokeStyle = 'rgba(160,230,255,0.55)'; c.lineWidth = 2; c.stroke();
      return cv;
    }
    BDRAW.planete = (b) => {
      const drawMoon = (m) => {
        if (!m.alive) return;
        const s = 30 * (m.depth != null ? 0.85 + 0.15 * m.depth : 1);
        ctx.drawImage(m.img, m.x - s / 2, m.y - s / 2, s, s);
        if (m.dash && (b.t * 10) % 2 < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(GL.o, m.x - s, m.y - s, s * 2, s * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        if (m.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(GL.w, m.x - s * 0.6, m.y - s * 0.6, s * 1.2, s * 1.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      };
      for (let i = 0; i < 3; i++) if (b.moons[i].depth < 0 && !b.moons[i].dash) drawMoon(b.moons[i]);
      const R = b.R;
      // halo
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.1 * Math.sin(b.t * 3);
      ctx.drawImage(b.phase >= 2 ? GL.r : GL.o, b.x - R * 1.9, b.y - R * 1.9, R * 3.8, R * 3.8);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (b.cv) ctx.drawImage(b.cv, b.x - R, b.y - R, 2 * R, 2 * R);
      else {
        ctx.drawImage(b.img, b.x - R * 1.05, b.y - R * 1.05, R * 2.1, R * 2.1);
        drawPlanetFace(b, R);
      }
      if (b.cv && b.mouth > 0.05) {               // le copain « crache » : petite lueur à la bouche
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = b.mouth * 0.7;
        ctx.drawImage(GL.o, b.x - 16, b.y + R * 0.42 - 16, 32, 32);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (b.flash > 0 && hitBlink()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.21; ctx.drawImage(GL.w, b.x - R, b.y - R, 2 * R, 2 * R); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      for (let i = 0; i < 3; i++) if (b.moons[i].depth >= 0 || b.moons[i].dash) drawMoon(b.moons[i]);
    };
    function drawPlanetFace(b, R) {
      const ex = clamp((P.x - b.x) / 140, -1, 1) * 3.5, ey = clamp((P.y - b.y) / 300, -1, 1) * 3;
      const angry = b.phase >= 2 ? 1 : 0;
      for (let s = -1; s <= 1; s += 2) {
        const x = b.x + s * R * 0.34, y = b.y - R * 0.12;
        ctx.fillStyle = 'rgba(20,6,10,0.55)'; ell(ctx, x, y + 1.5, 13, 15.5); ctx.fill();
        ctx.fillStyle = '#fff6ec'; ell(ctx, x, y, 11.5, 14); ctx.fill();
        ctx.fillStyle = angry ? '#d4002a' : '#1a0a12'; circ(ctx, x + ex, y + ey + 2, 5.6); ctx.fill();
        ctx.fillStyle = '#ffffff'; circ(ctx, x + ex - 1.8, y + ey - 0.5, 1.7); ctx.fill();
        ctx.strokeStyle = '#1a0a12'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - s * 12, y - 19 + (angry ? -3 : 0)); ctx.lineTo(x + s * 9, y - 13 + (angry ? 3 : 0)); ctx.stroke();
      }
      const my = b.y + R * 0.42, mo = 3 + b.mouth * 9;
      ctx.fillStyle = '#1a0610'; ell(ctx, b.x, my, 17, mo); ctx.fill();
      if (b.mouth > 0.2) { ctx.fillStyle = '#ff5a3c'; ell(ctx, b.x, my + mo * 0.35, 9, mo * 0.4); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ell(ctx, b.x, my, 17, mo); ctx.stroke();
    }

    // ------------------------------------------------------------- 2. CROISEUR VELA
    BINIT.vela = (b) => {
      b.ty = 150; b.custom = true;
      const off = [[-100, -5], [-52, 18], [52, 18], [100, -5]], hT = 95 * VELA_HP_T * hpB(), hC = 640 * VELA_HP_C * hpB();
      b.tur = [];
      for (let i = 0; i < 4; i++) { const p = mkPart(0, 0, 14, 'sub', hT); p.ox = off[i][0]; p.oy = off[i][1]; p.st = 1 + i * 0.6; p.weak = VELA_WEAK_T; b.tur.push(p); b.parts.push(p); }
      b.core = mkPart(0, 0, 22, 'block', 0); b.core.ox = 0; b.core.oy = 12; b.core.weak = VELA_WEAK_C;   // (le cœur ne compte qu'une fois ouvert)
      b.parts.push(b.core);
      b.hull = mkPart(0, 0, 40, 'block', 0); b.hull.ox = 0; b.hull.oy = -18; b.parts.push(b.hull);
      for (const [ox, oy, r] of [[-78, -14, 26], [78, -14, 26], [-124, -10, 18], [124, -10, 18]]) { const w = mkPart(0, 0, r, 'block', 0); w.ox = ox; w.oy = oy; b.parts.push(w); }
      b.hp = 4 * hT + hC;
      b.left = 4;
      b.onPart = (bb, p) => {
        bb.left--;
        if (bb.left === 2) { bb.phase = 1; onBossPhase(); }
        if (bb.left === 0) { bb.phase = 2; bb.core.mode = 'core'; onBossPhase(); banner('LE CŒUR EST À NU !', 'Vise le centre', '#ffb347', 1.8, 9); }
        if (bb.left === 2 || bb.left === 0) velaDrop(bb, p.x, p.y + 8);
      };
      b.coreMax = hC;
    };
    BUPD.vela = (b, dt, act) => {
      if (b.ready) { b.x = LW / 2 + Math.sin((b.t - b.enterT) * 0.35) * 26; b.y = b.ty + Math.sin(b.t * 0.7) * 6; }
      for (let i = 0; i < b.parts.length; i++) { const p = b.parts[i]; p.x = b.x + p.ox; p.y = b.y + p.oy; }
      if (b.left === 0 && b.phase === 2 && b.hp < b.coreMax * 0.5) { b.phase = 3; onBossPhase(); velaDrop(b, b.core.x, b.core.y + 26); }
      b.open = b.left === 0 ? Math.min(1, b.open + dt * 1.2) : 0;
      for (let i = 0; i < 4; i++) {
        const p = b.tur[i];
        if (!p.alive) { if (chance(dt * 6)) { const s = part(p.x + rnd(-5, 5), p.y, rnd(-10, 10), rnd(-40, -20), 0.9, 6, 18, SMOKE, false, 0.3); if (s) s.a0 = 0.7; } continue; }
        p.aim += angDiff(p.aim, aimAt(p.x, p.y)) * Math.min(1, dt * 2.5);
        if (!act) continue;
        p.st -= dt * bfm() * (b.phase >= 1 ? 1.35 : 1);
        if (p.st <= 0) { p.st = 2.4; p.k = 3; p.a = 0; }
        if (p.k > 0) {
          p.a -= dt;
          if (p.a <= 0) {
            p.a = 0.14; p.k--;
            const tx = p.x + Math.cos(p.aim) * 18, ty = p.y + Math.sin(p.aim) * 18;
            if (b.phase >= 1) fireArc(tx, ty, p.aim, 0.3, 3, 138, 'o', 0); else ebA(tx, ty, p.aim, 138 * spdMul(), 'o', 0);
            part(tx, ty, 0, 0, 0.08, 9, 16, GL.o, true, 0);
          }
        }
      }
      if (!act) return;
      if (b.phase === 0) {                        // la coque tire aussi des aiguilles par les flancs
        b.st2 -= dt * bfm();
        if (b.st2 <= 0) { b.st2 = 3; fireArc(b.x - 128, b.y - 10, Math.PI / 2 + 0.25, 0.5, 3, 115, 'v', 2); fireArc(b.x + 128, b.y - 10, Math.PI / 2 - 0.25, 0.5, 3, 115, 'v', 2); }
      }
      if (b.left === 0 && b.open > 0.9) {
        const cx = b.core.x, cy = b.core.y;
        b.st -= dt * bfm();
        if (b.st <= 0) {                           // balayage laser (avertissement puis tir)
          b.st = b.phase >= 3 ? 4.2 : 5.2;
          const side = cchance(0.5) ? 1 : -1;
          const bm = addBeam(b.core, Math.PI / 2 + side * 0.85, 1.1, 2.2, 14, 'o', 0, 0, false);
          bm.spin = -side * 0.78;
        }
        b.st2 -= dt * bfm();
        if (b.st2 <= 0) { b.st2 = b.phase >= 3 ? 1.2 : 1.7; fireArc(cx, cy + 10, aimAt(cx, cy), 1.1, b.phase >= 3 ? 9 : 7, 120, 'v', 2); }
        if (b.phase >= 3) {
          b.st3 -= dt * bfm();
          if (b.st3 <= 0) { b.st3 = 2.4; fireRing(cx, cy, 20, 84, 'o', 3, crand()); }
        }
      }
    };
    function bossDrop(x, y, k) {                 // capsule lâchée par un boss : à aller chercher entre deux salves (trajet sans hasard)
      const r0 = rng, n = cpN;
      rng = null; capsule(x, y, k); rng = r0;
      if (cpN > n) { const c = CP[cpN - 1]; c.vx = x < LW / 2 ? 16 : -16; c.vy = -70; }
      ring(x, y, 6, 46, 0.45, CAPS[k].col, 2.4);
      sparks(x, y, 8, GL.w, 120, 0.4, 6);
    }
    function velaDrop(b, x, y) {                 // nouvelle phase : PUISSANCE si le tir faiblit, sinon MISSILES ; sans bulle : une BULLE (une fois par combat)
      const cs = CO ? needyShip() : P;
      let k = cs.power < 6 ? 'P' : 'M';
      if (cs.shield < 1 && !b.gaveS) { k = 'S'; b.gaveS = true; }
      bossDrop(x, y, k);
    }
    function weakMark(p, r, t) {                 // point faible : quatre coins ambrés qui tournent, blancs et serrés quand on touche
      const k = p.wk, rr = r + 5 - 2.5 * k, L = 4.5, ang = t * 0.9 + p.uid;
      ctx.globalCompositeOperation = 'lighter';
      if (k > 0.02) glowAt(GL.y, p.x, p.y, r * 2.6 + 10 * k, 0.55 * k);
      ctx.globalAlpha = Math.min(1, 0.6 + 0.2 * Math.sin(t * 4 + p.uid) + 0.4 * k);
      ctx.strokeStyle = k > 0.35 ? '#ffffff' : '#ffd34d'; ctx.lineWidth = 1.5 + k;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const c = ang + i * Math.PI / 2, cx = p.x + Math.cos(c) * rr, cy = p.y + Math.sin(c) * rr, t1 = c + Math.PI * 0.75, t2 = c - Math.PI * 0.75;
        ctx.moveTo(cx + Math.cos(t1) * L, cy + Math.sin(t1) * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + Math.cos(t2) * L, cy + Math.sin(t2) * L);
      }
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    BDRAW.vela = (b) => {
      const s = SPR.vela;
      ctx.drawImage(s.cv, b.x - s.w / 2, b.y - s.h / 2 - 4, s.w, s.h);
      // réacteurs
      ctx.globalCompositeOperation = 'lighter';
      const fl = 0.7 + Math.sin(b.t * 30) * 0.15;
      ctx.globalAlpha = fl; ctx.drawImage(GL.o, b.x - 16 - 10, b.y - 84, 20, 26); ctx.drawImage(GL.o, b.x + 16 - 10, b.y - 84, 20, 26);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // cœur : trappes qui s'ouvrent
      const cx = b.core.x, cy = b.core.y, o = b.open;
      if (o > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(b.t * 8);
        ctx.drawImage(GL.o, cx - 34, cy - 34, 68, 68);
        ctx.globalAlpha = 1;
        ctx.drawImage(GL.w, cx - 12, cy - 12, 24, 24);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#2a0c00'; circ(ctx, cx, cy, 6); ctx.fill();
      }
      ctx.fillStyle = '#2b2636';
      ctx.fillRect(cx - 21 - o * 16, cy - 20, 21, 40);
      ctx.fillRect(cx + o * 16, cy - 20, 21, 40);
      ctx.strokeStyle = '#ffa630'; ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - 21 - o * 16, cy - 20, 21, 40); ctx.strokeRect(cx + o * 16, cy - 20, 21, 40);
      if (b.head) headBubble(b.head.img, b.x, b.y - 44, 17, false);
      for (let i = 0; i < 4; i++) {
        const p = b.tur[i];
        if (!p.alive) { ctx.fillStyle = '#120a06'; circ(ctx, p.x, p.y, 10); ctx.fill(); ctx.fillStyle = 'rgba(255,120,30,0.5)'; circ(ctx, p.x, p.y, 4 + Math.sin(b.t * 9 + i) * 1.5); ctx.fill(); continue; }
        dsprR(SPR.turretV, p.x, p.y, p.aim - Math.PI / 2, 1);
        if (p.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.drawImage(GL.w, p.x - 14, p.y - 14, 28, 28); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        if (b.ready) weakMark(p, 14, b.t);
      }
      if (b.ready && o > 0.6) weakMark(b.core, 21, b.t);
      if (b.flash > 0 && hitBlink()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15; ctx.drawImage(GL.w, b.x - 120, b.y - 60, 240, 120); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    };

    // ------------------------------------------------------------- 3. VER DE L'HYPERESPACE
    BINIT.ver = (b) => {
      b.enterT = 0.001; b.n = 16;
      b.hist = new Float32Array(512); b.hi = 0;
      wormTrail(b, LW / 2, -70);
      b.hd = mkPart(LW / 2, -70, 22, 'core', 0);
      b.parts.push(b.hd);
      b.segs = [];
      for (let i = 0; i < b.n; i++) {
        const r = Math.max(11, 17.5 - i * 0.45), s = mkPart(LW / 2, -80, r, 'armor', 0);
        s.si = r > 15.5 ? 0 : r > 12.5 ? 1 : 2; s.ang = 0;
        b.segs.push(s); b.parts.push(s);
      }
      b.hp = 1300 * hpB();
      b.u = 0; b.mode = 0; b.mT = 0; b.warnX = 0; b.ang = Math.PI / 2; b.casc = -1; b.diveN = 0;
      b.x = LW / 2; b.y = -70;
    };
    function wormTrail(b, x, y) {               // corps replié au-dessus de la tête (hors écran)
      b.hi = 255;
      for (let k = 0; k < 256; k++) { const j = (255 - k) * 2; b.hist[j] = x; b.hist[j + 1] = y - k * 6; }
    }
    BUPD.ver = (b, dt, act) => {
      const hd = b.hd;
      const ox = hd.x, oy = hd.y;
      b.mT += dt;
      if (b.mode === 0) {
        b.u += dt * (0.55 + 0.12 * b.phase);
        const tx = LW / 2 + Math.sin(b.u * 0.9) * LW * 0.36, ty = LH * 0.3 + Math.sin(b.u * 1.37 + 0.5) * LH * 0.17;
        const k = Math.min(1, dt * 2.2);
        hd.x += (tx - hd.x) * k; hd.y += (ty - hd.y) * k;
        if (b.phase >= 1 && b.mT > 8.5 && act) { b.mode = 1; b.mT = 0; b.diveN = b.phase >= 2 ? 3 : 2; }
      } else if (b.mode === 1) {                  // remonte et sort par le haut
        hd.y -= 260 * dt; hd.x += (clamp(hd.x, 60, LW - 60) - hd.x) * dt;
        if (hd.y < -90 - b.n * 18) { b.mode = 2; b.mT = 0; b.warnX = clamp(AIM.x + crnd(-30, 30), 40, LW - 40); hd.x = b.warnX; hd.y = -110; wormTrail(b, hd.x, hd.y); SFX.warn(); }
      } else if (b.mode === 2) {                  // avertissement : colonne rouge
        hd.y = -110;
        if (b.mT > 1.15) { b.mode = 3; b.mT = 0; shake = Math.max(shake, 5); }
      } else if (b.mode === 3) {                  // plongée
        hd.y += 440 * spdMul() * dt;
        if (act) {
          b.st3 -= dt;
          if (b.st3 <= 0) {
            b.st3 = 0.12;
            const s = b.segs[(crand() * b.n) | 0];
            if (s.y > 20 && s.y < LH - 40) { const v = 70 * spdMul(); eb(s.x, s.y, -v, 10, 'v', 3); eb(s.x, s.y, v, 10, 'v', 3); }
          }
        }
        if (hd.y > LH + 380) {
          b.diveN--;
          if (b.diveN > 0) { b.mode = 2; b.mT = 0; b.warnX = clamp(AIM.x + crnd(-30, 30), 40, LW - 40); hd.x = b.warnX; hd.y = -110; SFX.warn(); }
          else { b.mode = 0; b.mT = 0; hd.x = crnd(80, LW - 80); hd.y = -80; b.u = crand() * 10; }
          wormTrail(b, hd.x, hd.y);
        }
      }
      if (b.mode === 2 || (b.mode === 3 && hd.y > LH + 60) || (b.mode === 1 && hd.y < -60)) { /* tête hors écran */ }
      const vx = hd.x - ox, vy = hd.y - oy;
      if (vx * vx + vy * vy > 0.01) b.ang = Math.atan2(vy, vx);
      {                                            // trace du corps : un point tous les 6 px parcourus
        let lx = b.hist[b.hi * 2], ly = b.hist[b.hi * 2 + 1], dx = hd.x - lx, dy = hd.y - ly, dd = Math.sqrt(dx * dx + dy * dy), g = 0;
        while (dd >= 6 && g++ < 60) {
          lx += (dx / dd) * 6; ly += (dy / dd) * 6;
          b.hi = (b.hi + 1) & 255; b.hist[b.hi * 2] = lx; b.hist[b.hi * 2 + 1] = ly;
          dx = hd.x - lx; dy = hd.y - ly; dd = Math.sqrt(dx * dx + dy * dy);
        }
      }
      for (let i = 0; i < b.n; i++) {
        const s = b.segs[i], j = ((b.hi - (i + 1) * 3) & 255) * 2, j2 = ((b.hi - (i + 1) * 3 + 1) & 255) * 2;
        s.x = b.hist[j]; s.y = b.hist[j + 1];
        s.ang = Math.atan2(b.hist[j2 + 1] - s.y, b.hist[j2] - s.x);
        s.hide = s.y < -30 || s.y > LH + 30;
      }
      hd.hide = hd.y < -30 || hd.y > LH + 30;
      b.x = hd.x; b.y = hd.y;
      if (!act || b.mode !== 0) return;
      // cascade de tirs le long du corps
      b.st -= dt * bfm();
      if (b.st <= 0) { b.st = b.phase >= 2 ? 2 : 2.7; b.casc = 0; }
      if (b.casc >= 0) {
        const prev = b.casc;
        b.casc += dt;
        for (let i = 0; i < b.n; i++) {
          const ti = i * 0.07;
          if (prev < ti && b.casc >= ti) { const s = b.segs[i]; if (!s.hide && s.y > 10) fireAimed(s.x, s.y, 100, 'v', 3, 1, 0); }
        }
        if (b.casc > b.n * 0.07) b.casc = -1;
      }
      b.st2 -= dt * bfm();
      if (b.st2 <= 0 && !hd.hide) {
        b.st2 = b.phase >= 2 ? 1.8 : 2.2;
        if (b.phase >= 2) fireRing(hd.x, hd.y, 14 + Math.min(8, L >> 1), 92, 'g', 0, crand());
        else fireAimed(hd.x, hd.y, 125, 'g', 0, 3, 0.22);
      }
    };
    BDRAW.ver = (b) => {
      if (b.mode === 2) {                          // colonne d'avertissement
        const a = 0.18 + 0.14 * Math.sin(b.t * 18);
        ctx.fillStyle = 'rgba(255,60,90,' + a.toFixed(3) + ')';
        ctx.fillRect(b.warnX - 24, 0, 48, LH);
        ctx.fillStyle = '#ff4d6d';
        for (let y = 90; y < LH; y += 120) { poly(ctx, [b.warnX, y + 16, b.warnX - 12, y, b.warnX + 12, y]); ctx.fill(); }
      }
      for (let i = b.n - 1; i >= 0; i--) {
        const s = b.segs[i];
        if (s.hide) continue;
        dsprR(SPR.wormS[s.si], s.x, s.y, s.ang - Math.PI / 2, 1);
        if (s.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(GL.y, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      const hd = b.hd;
      if (hd.hide) return;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
      ctx.drawImage(GL.v, hd.x - 46, hd.y - 46, 92, 92);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      dsprR(SPR.wormH, hd.x, hd.y, b.ang - Math.PI / 2, 1);
      if (b.head) headBubble(b.head.img, hd.x - Math.cos(b.ang) * 4, hd.y - Math.sin(b.ang) * 4, 15, true);
      if (b.flash > 0 && hitBlink()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.36; ctx.drawImage(GL.w, hd.x - 22, hd.y - 22, 44, 44); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    };

    // ------------------------------------------------------------- 4. REINE DE L'ESSAIM
    BINIT.reine = (b) => {
      b.ty = 135;
      b.dome = mkPart(0, 0, 22, 'core', 0); b.dome.ox = 0; b.dome.oy = -8;
      b.abd = mkPart(0, 0, 20, 'core', 0); b.abd.ox = 0; b.abd.oy = 44;
      b.parts.push(b.dome, b.abd);
      b.hp = 1400 * hpB();
      b.flap = 0; b.wo = 0;
    };
    BUPD.reine = (b, dt, act) => {
      if (b.ready) { b.x = LW / 2 + Math.sin((b.t - b.enterT) * 0.5) * 52; b.y = b.ty + Math.sin(b.t * 0.9) * 8; }
      b.wo += ((b.phase >= 1 ? 0.3 : 0) - b.wo) * Math.min(1, dt * 2);
      b.flap = Math.sin(b.t * 7) * 0.08 + b.wo;
      for (let i = 0; i < b.parts.length; i++) { const p = b.parts[i]; p.x = b.x + p.ox; p.y = b.y + p.oy; }
      if (!act) return;
      const f = bfm();
      b.st -= dt * f;
      if (b.st <= 0) {
        b.st = Math.max(1.6, 3.4 - 0.6 * b.phase);
        let n = 0;
        for (let i = 0; i < enN; i++) if (EN[i].alive && EN[i].type === 'drone') n++;
        if (n < 6 + b.phase * 2) for (let s = -1; s <= 1; s += 2) {
          const e = spawnEnemy('drone', b.x + s * 27, b.y + 8, 0);
          if (e) { e.mv = 9; e.vx = s * 120; e.vy = 60; e.st = crnd(1.5, 3); e.pts = 60; e.sh = 1; e.entered = true; part(e.x, e.y, 0, 0, 0.2, 10, 24, GL.g, true, 0); }
        }
      }
      b.st2 -= dt * f;
      if (b.st2 <= 0) { b.st2 = 2.2; fireAimed(b.dome.x, b.dome.y + 18, 128, 'g', 3, b.phase >= 2 ? 7 : 5, 0.18); }
      if (b.phase >= 1) {
        b.st3 -= dt * f;
        if (b.st3 <= 0) {
          b.st3 = 1.4; b.k = 1 - b.k;
          const s = b.k ? 1 : -1, x = b.x + s * (92 + b.wo * 20), y = b.y - 6;
          fireArc(x, y, aimAt(x, y), 1.0, 6, 112, 'y', 2);
          part(x, y, 0, 0, 0.12, 12, 22, GL.y, true, 0);
        }
      }
      if (b.phase >= 2) {
        b.k2 += dt;
        if ((b.k2 % 3.2) < 1.8) {
          b.a2 += dt * 2.4;
          b.mT -= dt;
          if (b.mT <= 0) {
            b.mT = 0.13 / Math.min(1.5, f);
            const v = 90 * spdMul();
            for (let i = 0; i < 3; i++) ebA(b.abd.x, b.abd.y + 10, b.a2 + (i * TAU) / 3, v, 'g', 3);
          }
        }
      }
    };
    BDRAW.reine = (b) => {
      const w = SPR.qwing;
      for (let s = -1; s <= 1; s += 2) dsprM(w, b.x + s * 22, b.y - 4, s * (-0.18 - b.flap), -s, 1, -58, 0);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.25 * Math.sin(b.t * 5);
      ctx.drawImage(GL.g, b.x - 34, b.y + 14, 68, 68);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const q = SPR.queen;
      ctx.drawImage(q.cv, b.x - q.w / 2, b.y - q.h / 2 + 4, q.w, q.h);
      if (b.head) headBubble(b.head.img, b.dome.x, b.dome.y, 20, false);
      else {
        const x = b.dome.x, y = b.dome.y;
        ctx.fillStyle = rad(ctx, x - 5, y - 6, 1, x, y, 20, [0, '#ffd7a0', 0.35, '#ff5a1f', 1, '#4a0800']); circ(ctx, x, y, 20); ctx.fill();
        ctx.strokeStyle = 'rgba(40,0,0,0.45)'; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x - 19, y + i * 7); ctx.quadraticCurveTo(x, y + i * 7 + 4, x + 19, y + i * 7); ctx.stroke(); }
        const ex = clamp((P.x - x) / 120, -1, 1) * 6;
        ctx.fillStyle = '#1a0000'; ell(ctx, x + ex, y + 4, 3.5, 9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; circ(ctx, x - 7, y - 9, 3); ctx.fill();
      }
      if (b.flash > 0 && hitBlink()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.21; ctx.drawImage(GL.w, b.x - 50, b.y - 50, 100, 120); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    };

    // ------------------------------------------------------------- 5. STATION GAÏA
    BINIT.gaia = (b) => {
      b.ty = 182; b.R = 96; b.rot = 0;
      b.nodes = [];
      for (let i = 0; i < 6; i++) { const p = mkPart(0, 0, 13, 'sub', 75 * hpB()); p.st = 1 + i * 0.5; p.i = i; b.nodes.push(p); b.parts.push(p); }
      b.core = mkPart(0, 0, 30, 'block', 0); b.parts.push(b.core);
      b.hp = 1000 * hpB() + 6 * 75 * hpB();
      b.left = 6;
      b.onPart = (bb) => {
        bb.left--;
        if (bb.left <= 3 && bb.core.mode === 'block') { bb.core.mode = 'core'; banner('LE NOYAU S’OUVRE !', 'Tire au centre', '#46f08a', 1.8, 9); SFX.phase(); }
      };
    };
    BUPD.gaia = (b, dt, act) => {
      if (b.ready) { b.x = LW / 2 + Math.sin((b.t - b.enterT) * 0.3) * 22; b.y = b.ty + Math.sin(b.t * 0.6) * 6; }
      const spin = 0.22 + 0.12 * b.phase;
      b.rot += spin * dt;
      for (let i = 0; i < 6; i++) {
        const p = b.nodes[i], a = b.rot + (i * TAU) / 6;
        p.x = b.x + Math.cos(a) * b.R; p.y = b.y + Math.sin(a) * b.R; p.a = a;
      }
      b.core.x = b.x; b.core.y = b.y;
      b.open = b.core.mode === 'core' ? Math.min(1, b.open + dt) : 0;
      if (!act) return;
      const f = bfm();
      for (let i = 0; i < 6; i++) {
        const p = b.nodes[i];
        if (!p.alive) continue;
        p.st -= dt * f;
        if (p.st <= 0) { p.st = 3.2; if (p.y > b.y - 20) fireAimed(p.x, p.y, 112, 'g', 0, b.phase >= 2 ? 3 : 1, 0.2); }
      }
      b.st -= dt * Math.min(1.6, f);
      if (b.st <= 0) {
        b.st = Math.max(3.4, 5.4 - 0.6 * b.phase);
        let n = 0;
        for (let i = 0; i < 6 && n < (b.phase >= 2 ? 3 : 2); i++) {
          const p = b.nodes[(i + b.k) % 6];
          if (!p.alive || Math.sin(p.a) < 0.2) continue;
          const bm = addBeam(p, p.a, 1.25, 2.4, 12, 'g', 0, 0, false);
          bm.spin = spin; n++;
        }
        b.k = (b.k + 1) % 6;
      }
      if (b.core.mode === 'core') {
        b.st2 -= dt * f;
        if (b.st2 <= 0) {
          b.st2 = 0.12; b.a2 += 0.33; b.k2++;
          if (b.k2 % 40 < 24) { const v = 92 * spdMul(); ebA(b.x, b.y, b.a2, v, 'y', 0); ebA(b.x, b.y, b.a2 + Math.PI, v, 'y', 0); }
        }
        if (b.phase >= 2) { b.st3 -= dt * f; if (b.st3 <= 0) { b.st3 = 2.2; fireRing(b.x, b.y, 20 + Math.min(8, L >> 1), 86, 'g', 1, crand()); } }
      }
    };
    BDRAW.gaia = (b) => {
      dsprR(SPR.gaiaRing, b.x, b.y, b.rot, 1);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const p = b.nodes[i];
        if (!p.alive) continue;
        let charging = 0;
        for (let j = 0; j < BEAMS.length; j++) if (BEAMS[j].owner === p) charging = 1;
        ctx.globalAlpha = 0.45 + 0.3 * Math.sin(b.t * 6 + i) + charging * 0.4;
        ctx.drawImage(GL.g, p.x - 18, p.y - 18, 36, 36);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 6; i++) {
        const p = b.nodes[i];
        if (!p.alive) { ctx.fillStyle = '#0a1210'; circ(ctx, p.x, p.y, 8); ctx.fill(); continue; }
        dsprR(SPR.gaiaNode, p.x, p.y, p.a + Math.PI / 2, 1);
        if (p.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.drawImage(GL.w, p.x - 13, p.y - 13, 26, 26); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      const g = SPR.gaiaCore;
      ctx.drawImage(g.cv, b.x - g.w / 2, b.y - g.h / 2, g.w, g.h);
      if (b.head) headBubble(b.head.img, b.x, b.y, 19, false);
      else {
        ctx.fillStyle = rad(ctx, b.x - 4, b.y - 5, 1, b.x, b.y, 19, [0, '#eaffef', 0.3, '#46f08a', 1, '#04301a']); circ(ctx, b.x, b.y, 19); ctx.fill();
        ctx.fillStyle = '#021a0c'; circ(ctx, b.x + clamp((P.x - b.x) / 100, -1, 1) * 5, b.y + 5, 6.5); ctx.fill();
      }
      if (b.core.mode === 'block') {               // volets blindés tant que le noyau est fermé
        ctx.fillStyle = b.head ? 'rgba(58,74,92,0.55)' : '#3a4a5c'; ctx.strokeStyle = '#0a0f15'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
          const a = b.t * 0.5 + (i * TAU) / 6;
          ctx.beginPath(); ctx.moveTo(b.x, b.y);
          ctx.arc(b.x, b.y, 20.5, a, a + TAU / 6 - 0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (b.flash > 0 && hitBlink()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.30; ctx.drawImage(GL.w, b.x - 30, b.y - 30, 60, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    };

    // ------------------------------------------------------------- 6. LES JUMELLES (planète double : deux boss liés)
    BINIT.jumelles = (b) => {
      b.ty = 172;
      b.A = mkPart(0, 0, 38, 'sub', 800 * hpB()); b.A.img = planetImg(9); b.A.col = 'v';
      b.Z = mkPart(0, 0, 38, 'sub', 800 * hpB()); b.Z.img = planetImg(4); b.Z.col = 'o';
      b.parts.push(b.A, b.Z);
      b.hp = 1600 * hpB();
      b.dbl = planetImg(22);
      b.orb = 0; b.rr = 0; b.rage = false;
      if (b.head) {
        b.A.face = facePlanet(b.head.img, b.A.img, 38);
        let h2 = b.head;
        if (heads.length > 1) { for (let i = 0; i < 6 && h2 === b.head; i++) h2 = pick(heads); }
        b.head2 = h2 !== b.head ? h2 : null;
        b.Z.face = facePlanet(h2.img, b.Z.img, 38);
      }
      b.onPart = (bb, p) => {
        bb.rage = true;
        const o = p === bb.A ? bb.Z : bb.A;
        if (o.alive) banner('SA JUMELLE EST FURIEUSE !', '', '#ff6b8a', 1.8, 9);
        if (bb.head && p === bb.A) { addFace(bb.head, p.x, p.y, SNIF(headName(bb.head)), 80); p.sadShown = true; }
        if (bb.head2 && p === bb.Z) { addFace(bb.head2, p.x, p.y, SNIF(headName(bb.head2)), 80); p.sadShown = true; }
      };
    };
    BUPD.jumelles = (b, dt, act) => {
      const cx = b.ready ? LW / 2 + Math.sin((b.t - b.enterT) * 0.4) * 30 : b.x, cy = b.ready ? b.ty + Math.sin(b.t * 0.7) * 8 : b.y;
      b.orb += dt * (0.7 + 0.25 * b.phase + (b.rage ? 0.5 : 0));
      const target = b.ready ? 104 + (b.phase >= 1 ? Math.sin(b.t * 0.9) * 18 : 0) : 0;
      b.rr += (target - b.rr) * Math.min(1, dt * (b.ready ? 1.6 : 8));
      const both = b.A.alive && b.Z.alive;
      if (both) {
        b.A.x = cx + Math.cos(b.orb) * b.rr; b.A.y = cy + Math.sin(b.orb) * b.rr * 0.44;
        b.Z.x = cx - Math.cos(b.orb) * b.rr; b.Z.y = cy - Math.sin(b.orb) * b.rr * 0.44;
      } else {
        const s = b.A.alive ? b.A : b.Z;
        s.x += (LW / 2 + Math.sin(b.t * 0.8) * 110 - s.x) * Math.min(1, dt * 1.5);
        s.y += (b.ty + Math.sin(b.t * 1.3) * 30 - s.y) * Math.min(1, dt * 1.5);
      }
      b.x = cx; b.y = cy;
      if (!act) return;
      // le lien d'énergie entre les jumelles est dangereux (toujours bien visible)
      for (let k = 0; k < SHIPS.length; k++) { const s = SHIPS[k]; if (both && s.alive && hurtOk(s) && segDist2(s.x, s.y, b.A.x, b.A.y, b.Z.x, b.Z.y) < 7 * 7) hurtShip(s); }
      const f = bfm();
      if (b.A.alive) {
        b.A.st -= dt * f * (b.rage ? 1.4 : 1);
        if (b.A.st <= 0) { b.A.st = b.phase >= 1 ? 2.1 : 2.6; fireRing(b.A.x, b.A.y, 12 + b.phase * 2 + Math.min(6, L >> 1), 84, 'v', 0, crand()); }
      }
      if (b.Z.alive) {
        b.Z.st -= dt * f * (b.rage ? 1.4 : 1);
        if (b.Z.st <= 0) { b.Z.st = 2.2; b.Z.k = 4; b.Z.a = 0; }
        if (b.Z.k > 0) { b.Z.a -= dt; if (b.Z.a <= 0) { b.Z.a = 0.12; b.Z.k--; fireAimed(b.Z.x, b.Z.y + 20, 140, 'o', 3, b.phase >= 1 ? 3 : 1, 0.16); } }
      }
      if (both && b.phase >= 2) {
        b.st -= dt * f;
        if (b.st <= 0) { b.st = 0.55; const k = crand(); eb(lerp(b.A.x, b.Z.x, k), lerp(b.A.y, b.Z.y, k), crnd(-20, 20), 70 * spdMul(), 'p', 0); }
      }
      if (b.rage) {
        const s = b.A.alive ? b.A : b.Z;
        b.st2 -= dt * f;
        if (b.st2 <= 0) { b.st2 = 0.13; b.a2 += 0.3; const v = 95 * spdMul(); for (let i = 0; i < 3; i++) ebA(s.x, s.y, b.a2 + (i * TAU) / 3, v, 'p', 3); }
      }
    };
    BDRAW.jumelles = (b) => {
      if (!b.ready || b.rr < 6) {
        const s = 150 + (b.ready ? 0 : 0);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
        ctx.drawImage(GL.m, b.x - s, b.y - s, s * 2, s * 2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(b.dbl, b.x - s / 2, b.y - s / 2, s, s);
        return;
      }
      const both = b.A.alive && b.Z.alive;
      if (both) {                                  // lien d'énergie (éclair)
        ctx.globalCompositeOperation = 'lighter';
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? 'rgba(255,255,255,0.95)' : 'rgba(255,80,200,0.55)';
          ctx.lineWidth = pass ? 1.6 : 7;
          ctx.beginPath(); ctx.moveTo(b.A.x, b.A.y);
          for (let i = 1; i < 10; i++) {
            const k = i / 10, nx = -(b.Z.y - b.A.y), ny = b.Z.x - b.A.x, nl = Math.sqrt(nx * nx + ny * ny) + 0.01, j = (Math.random() - 0.5) * 9;
            ctx.lineTo(lerp(b.A.x, b.Z.x, k) + (nx / nl) * j, lerp(b.A.y, b.Z.y, k) + (ny / nl) * j);
          }
          ctx.lineTo(b.Z.x, b.Z.y); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      for (const p of [b.A, b.Z]) {
        if (!p.alive) continue;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
        ctx.drawImage(glowOf(p.col), p.x - 76, p.y - 76, 152, 152);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (p.face) ctx.drawImage(p.face, p.x - 38, p.y - 38, 76, 76);
        else {
          ctx.drawImage(p.img, p.x - 40, p.y - 40, 80, 80);
          const ex = clamp((P.x - p.x) / 140, -1, 1) * 3;
          for (let s = -1; s <= 1; s += 2) {
            ctx.fillStyle = '#fff6ec'; ell(ctx, p.x + s * 12, p.y - 4, 7, 9); ctx.fill();
            ctx.fillStyle = '#1a0a12'; circ(ctx, p.x + s * 12 + ex, p.y - 2, 3.6); ctx.fill();
          }
          ctx.strokeStyle = '#1a0a12'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(p.x, p.y + 13, 8, b.rage ? 1.15 * Math.PI : 0.15 * Math.PI, b.rage ? 1.85 * Math.PI : 0.85 * Math.PI); ctx.stroke();
        }
        if (p.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.drawImage(GL.w, p.x - 38, p.y - 38, 76, 76); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
    };

    // ------------------------------------------------------------- 7. L'ŒIL DU GOUFFRE (trou noir)
    BINIT.oeil = (b) => {
      b.ty = 150;
      b.eye = mkPart(0, 0, 30, 'block', 0); b.parts.push(b.eye);
      b.hp = 1500 * hpB();
      b.open = 0; b.cyc = 0;
      hole = { x: LW / 2, y: -160, k: 0, t: 0, leaving: false, boss: true };
    };
    BUPD.oeil = (b, dt, act) => {
      if (b.ready) { b.x = LW / 2 + Math.sin((b.t - b.enterT) * 0.35) * 56; b.y = b.ty + Math.sin(b.t * 0.5) * 12; }
      b.eye.x = b.x; b.eye.y = b.y;
      if (hole) { hole.x = b.x; hole.y = b.y; hole.k = b.ready ? 0.5 + 0.08 * b.phase : 0; hole.t += dt; }
      b.a += dt * (1.2 + 0.3 * b.phase);
      const closedT = Math.max(1.6, 2.6 - 0.3 * b.phase), openT = 3.4 + 0.4 * b.phase;
      b.cyc += dt;
      const per = closedT + openT + 0.8, c = b.cyc % per;
      const want = c < closedT ? 0 : c < closedT + 0.4 ? (c - closedT) / 0.4 : c < closedT + 0.4 + openT ? 1 : 1 - (c - closedT - 0.4 - openT) / 0.4;
      b.open = clamp(want, 0, 1);
      b.eye.mode = b.open > 0.6 ? 'core' : 'block';
      if (!act) return;
      const f = bfm();
      if (b.open < 0.3) {                          // bras spiraux depuis le disque
        b.st -= dt * f;
        if (b.st <= 0) {
          b.st = 0.15;
          const n = b.phase >= 2 ? 4 : 3, v = 82 * spdMul();
          for (let i = 0; i < n; i++) { const a = b.a * 1.3 + (i * TAU) / n; ebA(b.x + Math.cos(a) * 46, b.y + Math.sin(a) * 46, a + 0.5, v, 'o', 3); }
        }
      } else if (b.open > 0.9) {
        b.st2 -= dt * f;
        if (b.st2 <= 0) { b.st2 = 1.05; const a = aimAt(b.x, b.y); ebA(b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40, a, 120 * spdMul(), 'p', 1); }
        b.st3 -= dt * f;
        if (b.st3 <= 0) { b.st3 = 2.4; for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16 + b.a; ebA(b.x + Math.cos(a) * 44, b.y + Math.sin(a) * 44, a, 86 * spdMul(), 'v', 0); } }
      }
      if (b.phase >= 2) {                          // tentacules : courants de balles qui tournent
        b.mT -= dt * f;
        if (b.mT <= 0) {
          b.mT = 0.22;
          for (let s = -1; s <= 1; s += 2) { const bb = ebA(b.x + s * 60, b.y + 10, Math.PI / 2 - s * 0.7, 100 * spdMul(), 'p', 3); if (bb) bb.turn = s * 0.55; }
        }
      }
    };
    BDRAW.oeil = (b) => {
      const d = SPR.disk;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55; dsprR(d, b.x, b.y, b.a, 0.92);
      ctx.globalAlpha = 0.3; dsprR(d, b.x, b.y, -b.a * 0.6 + 1, 0.62);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rad(ctx, b.x, b.y, 10, b.x, b.y, 46, [0, '#000000', 0.62, '#000000', 1, 'rgba(0,0,0,0)']);
      circ(ctx, b.x, b.y, 46); ctx.fill();
      const o = b.open, eh = 22 * o;
      if (o > 0.02) {
        ctx.save();
        ell(ctx, b.x, b.y, 30, Math.max(0.5, eh)); ctx.clip();
        ctx.fillStyle = rad(ctx, b.x, b.y, 4, b.x, b.y, 30, [0, '#fff5f8', 0.7, '#ffc2d6', 1, '#a0204a']); ctx.fillRect(b.x - 30, b.y - 30, 60, 60);
        const ix = b.x + clamp((P.x - b.x) / 120, -1, 1) * 8, iy = b.y + clamp((P.y - b.y) / 300, -1, 1) * 4;
        if (b.head) { headCircle(b.head.img, ix, iy, 15); ctx.strokeStyle = '#ff3fb4'; ctx.lineWidth = 2.5; circ(ctx, ix, iy, 15); ctx.stroke(); }
        else {
          ctx.fillStyle = rad(ctx, ix, iy, 2, ix, iy, 15, [0, '#ffe0f4', 0.35, '#ff3fb4', 1, '#5a0030']); circ(ctx, ix, iy, 15); ctx.fill();
          ctx.fillStyle = '#0a0006'; ell(ctx, ix, iy, 3.5, 11); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(ctx, ix - 5, iy - 6, 2.6); ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = '#1a0010'; ctx.lineWidth = 3; ell(ctx, b.x, b.y, 30, Math.max(0.5, eh)); ctx.stroke();
      } else {
        ctx.strokeStyle = '#ff5fd2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x - 28, b.y); ctx.quadraticCurveTo(b.x, b.y + 6, b.x + 28, b.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
      ctx.drawImage(GL.m, b.x - 60, b.y - 60, 120, 120);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (b.flash > 0 && o > 0.6) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(GL.w, b.x - 30, b.y - 30, 60, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    };

    // ------------------------------------------------------------- 8. LE VAISSEAU BLANC (le rival)
    BINIT.blanc = (b) => {
      b.ty = 152;
      b.body = mkPart(0, 0, 25, 'core', 0); b.body.ox = 0; b.body.oy = 8;
      b.wl = mkPart(0, 0, 18, 'armor', 0); b.wl.ox = -30; b.wl.oy = -12;
      b.wr = mkPart(0, 0, 18, 'armor', 0); b.wr.ox = 30; b.wr.oy = -12;
      b.parts.push(b.body, b.wl, b.wr);
      b.opts = [];
      for (let i = 0; i < 4; i++) { const o = mkPart(0, 0, 11, 'sub', 45 * hpB()); o.alive = false; b.opts.push(o); b.parts.push(o); }
      b.hp = 1900 * hpB() + 4 * 45 * hpB();
      b.vx = 0; b.bank = 0; b.dashT = 3.5; b.dash = 0; b.ghosts = [];
      b.tx = LW / 2;
    };
    BUPD.blanc = (b, dt, act) => {
      if (b.ready) {
        b.dashT -= dt;
        if (b.dashT <= 0 && act) { b.dashT = crnd(3.2, 5); b.dash = 0.45; b.tx = clamp(b.x + (b.x < LW / 2 ? 1 : -1) * crnd(90, 150), 60, LW - 60); }
        if (b.dash > 0) { b.dash -= dt; if (b.ghosts.length < 6 && (b.t * 30) % 1 < 0.5) b.ghosts.push({ x: b.x, y: b.y, t: 0.35 }); }
        else b.tx += (clamp(AIM.x, 60, LW - 60) - b.tx) * Math.min(1, dt * 0.8);
        const nx = b.x + (b.tx - b.x) * Math.min(1, dt * (b.dash > 0 ? 7 : 1.6));
        b.vx = (nx - b.x) / Math.max(dt, 1e-4); b.x = nx;
        b.y = b.ty + Math.sin(b.t * 1.1) * 10;
      }
      for (let i = b.ghosts.length - 1; i >= 0; i--) { b.ghosts[i].t -= dt; if (b.ghosts[i].t <= 0) b.ghosts.splice(i, 1); }
      b.bank += (clamp(b.vx / 250, -1, 1) - b.bank) * Math.min(1, dt * 6);
      b.body.x = b.x + b.body.ox; b.body.y = b.y + b.body.oy;
      b.wl.x = b.x - 30 * (1 - Math.abs(b.bank) * 0.3); b.wl.y = b.y - 12; b.wr.x = b.x + 30 * (1 - Math.abs(b.bank) * 0.3); b.wr.y = b.y - 12;
      b.a += dt * 1.6;
      for (let i = 0; i < 4; i++) { const o = b.opts[i], a = b.a + (i * TAU) / 4; o.x = b.x + Math.cos(a) * 58; o.y = b.y + 8 + Math.sin(a) * 26; }
      if (b.phase >= 1 && !b.deployed) {
        b.deployed = true;
        for (let i = 0; i < 4; i++) { b.opts[i].alive = true; b.opts[i].hp = b.opts[i].max; part(b.opts[i].x, b.opts[i].y, 0, 0, 0.3, 10, 40, GL.m, true, 0); }
        banner('HYPER BLANC !', 'Il copie tes drones…', '#ff3fb4', 1.8, 9);
        hyperTint = Math.max(hyperTint, 0.6);
      }
      if (!act) return;
      const f = bfm();
      b.st -= dt * f;
      if (b.st <= 0) { b.st = b.phase >= 2 ? 1.6 : 2; b.k = 3; b.mT = 0; }
      if (b.k > 0) { b.mT -= dt; if (b.mT <= 0) { b.mT = 0.12; b.k--; fireAimed(b.x, b.y + 52, 175, 'p', 2, 3, 0.12); } }
      b.st2 -= dt * f;
      if (b.st2 <= 0) { b.st2 = 1.25; for (let s = -1; s <= 1; s += 2) ebA(b.x + s * 34, b.y + 14, Math.PI / 2 - s * 0.12, 120 * spdMul(), 'v', 3); }
      if (b.phase >= 1) {
        for (let i = 0; i < 4; i++) {
          const o = b.opts[i];
          if (!o.alive) continue;
          o.st -= dt * f;
          if (o.st <= 0) { o.st = 0.24; o.a += 0.5; ebA(o.x, o.y, o.a + i, 88 * spdMul(), 'y', 0); }
        }
      }
      if (b.phase >= 2) {
        b.st3 -= dt * Math.min(1.5, f);
        if (b.st3 <= 0) {
          b.st3 = 5;
          addBeam(b.body, Math.PI / 2, 1.3, 1.5, 26, 'm', 0, 44, true);
          fireRing(b.x - 34, b.y + 6, 10, 80, 'p', 3, 0); fireRing(b.x + 34, b.y + 6, 10, 80, 'p', 3, 0.3);
        }
      }
      if (b.phase >= 3) {
        b.k2 -= dt * f;
        if (b.k2 <= 0) {
          b.k2 = 2.6;
          const m = spawnEnemy('mine', b.x, b.y + 30, 0);
          if (m) { m.mv = 5; m.vx = crnd(-40, 40); m.vy = 70; m.k = 1; m.st2 = 1.3; m.entered = true; m.pts = 20; m.sh = 0; }
        }
      }
    };
    BDRAW.blanc = (b) => {
      const fr = b.bank < -0.35 ? 2 : b.bank > 0.35 ? 0 : 1, s = SPR.blanc[fr];
      for (let i = 0; i < b.ghosts.length; i++) {
        const g = b.ghosts[i];
        ctx.globalAlpha = g.t * 1.2;
        ctx.drawImage(s.cv, g.x - s.w / 2, g.y - s.h / 2, s.w, s.h);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      const fl = 30 + Math.sin(b.t * 40) * 6;
      for (let k = -1; k <= 1; k += 2) { ctx.globalAlpha = 0.9; ctx.drawImage(GL.m, b.x + k * 7 - 9, b.y - 34 - fl, 18, fl); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(s.cv, b.x - s.w / 2, b.y - s.h / 2, s.w, s.h);
      if (b.head) headBubble(b.head.img, b.x - b.bank * 3, b.y + 22, 15, false);
      else { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(GL.m, b.x - 12, b.y + 10, 24, 30); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      for (let i = 0; i < 4; i++) {
        const o = b.opts[i];
        if (!o.alive) continue;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8;
        ctx.drawImage(GL.m, o.x - 16, o.y - 16, 32, 32);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffe6f6'; circ(ctx, o.x, o.y, 6); ctx.fill();
        ctx.strokeStyle = '#ff3fb4'; ctx.lineWidth = 1.6; circ(ctx, o.x, o.y, 9 + Math.sin(b.t * 6 + i) * 1.2); ctx.stroke();
      }
      if (b.flash > 0 && hitBlink()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18; ctx.drawImage(GL.w, b.x - 50, b.y - 55, 100, 110); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    };

    // ------------------------------------------------------------- dessin : outils
    let OXd = 0, OYd = 0;
    function S0() { ctx.setTransform(K, 0, 0, K, OXd, OYd); }
    function dspr(s, x, y) { ctx.drawImage(s.cv, x - s.w / 2, y - s.h / 2, s.w, s.h); }
    function dsprS(s, x, y, k) { const w = s.w * k, h = s.h * k; ctx.drawImage(s.cv, x - w / 2, y - h / 2, w, h); }
    function dsprR(s, x, y, ang, k) {
      const c = Math.cos(ang) * K * k, sn = Math.sin(ang) * K * k;
      ctx.setTransform(c, sn, -sn, c, OXd + x * K, OYd + y * K);
      ctx.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.setTransform(K, 0, 0, K, OXd, OYd);
    }
    function dsprM(s, x, y, ang, sx, sy, ox, oy) {
      const c = Math.cos(ang) * K, sn = Math.sin(ang) * K;
      ctx.setTransform(c * sx, sn * sx, -sn * sy, c * sy, OXd + x * K, OYd + y * K);
      ctx.drawImage(s.cv, ox - s.w / 2, oy - s.h / 2, s.w, s.h);
      ctx.setTransform(K, 0, 0, K, OXd, OYd);
    }
    function glowAt(g, x, y, size, a) { ctx.globalAlpha = a; ctx.drawImage(g, x - size / 2, y - size / 2, size, size); }
    function headCircle(img, x, y, r) {
      try {
        const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
        const h = r * 2.5, w = (h * iw) / ih;
        ctx.save(); circ(ctx, x, y, r); ctx.clip();
        ctx.fillStyle = '#2a1a22'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
        ctx.drawImage(img, x - w / 2, y - h * 0.47, w, h);
        ctx.restore();
      } catch (e) { /* rien */ }
    }
    function headBubble(img, x, y, r, membrane) {
      headCircle(img, x, y, r);
      dsprS(SPR.glass, x, y, r / 16);
      ctx.strokeStyle = membrane ? 'rgba(94,240,255,0.85)' : '#ffd34d'; ctx.lineWidth = membrane ? 2 : 1.7;
      circ(ctx, x, y, r + 0.8); ctx.stroke();
    }
    let fontKey = '';
    function setFont(px, body) { const k = (body ? 'b' : 'd') + px; if (k !== fontKey) { fontKey = k; ctx.font = (body ? '600 ' : '') + px + 'px ' + (body ? FB : FD); } }
    function txt(s, x, y, px, col, align, body, stroke) {
      setFont(px, body);
      ctx.textAlign = align || 'center';
      if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(2,4,10,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y);
    }

    // ------------------------------------------------------------- décor : étoiles, nébuleuse, planètes
    let SX = null, SY = null, SL = null, SP = null, starN = 0, bx0 = 0, bx1 = LW, by0 = 0, by1 = 620;
    const LSPD = [0.1, 0.28, 0.75], LSZ = [0.9, 1.25, 1.8], LAL = [0.45, 0.7, 0.95];
    function initStars() {
      bx0 = -colX / scale; bx1 = (cw - colX) / scale; by0 = -colY / scale; by1 = (ch - colY) / scale;
      const area = (bx1 - bx0) * (by1 - by0);
      starN = clamp(Math.round(area / 1600), 80, 220);
      SX = new Float32Array(starN); SY = new Float32Array(starN); SL = new Uint8Array(starN); SP = new Float32Array(starN);
      for (let i = 0; i < starN; i++) {
        SX[i] = rnd(bx0, bx1); SY[i] = rnd(by0, by1);
        const r = Math.random(); SL[i] = r < 0.55 ? 0 : r < 0.85 ? 1 : 2; SP[i] = Math.random() * TAU;
      }
    }
    const DN = 16, DX = new Float32Array(DN), DY = new Float32Array(DN), DV = new Float32Array(DN);
    for (let i = 0; i < DN; i++) { DX[i] = Math.random() * LW; DY[i] = Math.random() * 700; DV[i] = 0.6 + Math.random() * 0.8; }
    function updStars(dt) {
      for (let i = 0; i < DN; i++) {                // poussières : traînées de vitesse au premier plan
        DY[i] += (330 + scrollV * 2.2) * DV[i] * dt;
        if (DY[i] > LH + 30) { DY[i] = -30 - Math.random() * 200; DX[i] = 8 + Math.random() * (LW - 16); }
      }
      if (!SX) return;
      const h = by1 - by0 + 40;
      for (let i = 0; i < starN; i++) {
        SY[i] += scrollV * LSPD[SL[i]] * dt;
        if (SY[i] > by1 + 20) { SY[i] -= h; SX[i] = rnd(bx0, bx1); }
      }
    }
    let nebCv = null, nebKey = '', nebY = 0, nebPat = null;
    const NEBK = [0.62, 0.4, 0.36, 0.44, 0.36, 0.36, 0.38, 0.5];   // luminosité de la nébuleuse par secteur
    let nebMat = null;
    try { nebMat = typeof DOMMatrix !== 'undefined' ? new DOMMatrix() : null; } catch (e) { nebMat = null; }
    function buildNeb() {
      const key = (IMGN ? 'i' : 'p') + SEC.neb + '|' + secHue;
      if (key === nebKey && nebCv) return;
      nebKey = key; nebPat = null;
      const T = 320, cv = mkCanvas(T * 2, T * 2), c = cv.getContext('2d');
      c.fillStyle = '#000'; c.fillRect(0, 0, T * 2, T * 2);
      if (IMGN) {
        const img = IMGN[SEC.neb % IMGN.length];
        try {
          c.drawImage(img, 0, 0, T, T);
          c.save(); c.translate(2 * T, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, T, T); c.restore();
          c.save(); c.translate(0, 2 * T); c.scale(1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
          c.save(); c.translate(2 * T, 2 * T); c.scale(-1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
        } catch (e) { /* rien */ }
      } else {
        for (let i = 0; i < 16; i++) {
          const x = hash(i * 3.3 + SEC.neb) * 2 * T, y = hash(i * 5.1 + 2 + SEC.neb) * 2 * T, r = T * (0.25 + 0.45 * hash(i * 7.9 + 1));
          const l = 18 + 30 * hash(i * 1.7);
          for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
            const gx = x + ox * 2 * T, gy = y + oy * 2 * T;
            if (gx + r < 0 || gx - r > 2 * T || gy + r < 0 || gy - r > 2 * T) continue;
            c.fillStyle = rad(c, gx, gy, 0, gx, gy, r, [0, 'rgba(' + l + ',' + (l * 0.9 | 0) + ',' + (l * 0.4 | 0) + ',0.9)', 1, 'rgba(0,0,0,0)']);
            c.fillRect(gx - r, gy - r, 2 * r, 2 * r);
          }
        }
      }
      c.globalCompositeOperation = 'color';
      c.fillStyle = hsl(secHue, Math.round(SEC.sat * 0.72), 50); c.fillRect(0, 0, 2 * T, 2 * T);
      c.globalCompositeOperation = 'source-over';
      nebCv = cv;
    }
    const BGP = [];
    const plCache = new Map();
    let bgPlT = 2;
    function plVariant(idx, kind) {
      const key = idx + '|' + kind + '|' + secHue;
      let v = plCache.get(key);
      if (v) return v;
      if (plCache.size > 40) plCache.clear();
      const img = planetImg(idx);
      const S = kind === 'far' ? 96 : kind === 'near' ? 150 : 210, pad = S * 0.14, cv = mkCanvas(S + pad * 2, S + pad * 2), c = cv.getContext('2d');
      const cx = S / 2 + pad;
      c.fillStyle = rad(c, cx, cx, S * 0.42, cx, cx, S / 2 + pad, [0, hsl(secHue, 80, 60, kind === 'far' ? 0.25 : 0.35), 0.75, hsl(secHue, 80, 55, 0.08), 1, hsl(secHue, 80, 50, 0)]);
      c.fillRect(0, 0, cv.width, cv.height);
      try { c.drawImage(img, pad, pad, S, S); } catch (e) { /* rien */ }
      const dk = kind === 'far' ? 0.55 : kind === 'near' ? 0.42 : 0.26;
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(2,4,14,' + dk + ')'; c.fillRect(0, 0, cv.width, cv.height);
      c.globalCompositeOperation = 'source-over';
      v = { cv, k: (S + pad * 2) / S };
      plCache.set(key, v);
      return v;
    }
    function addBgPlanet(kind, idx, x, y, size) {
      if (BGP.length >= 6) return;
      const d = kind === 'far' ? rnd(0.12, 0.24) : kind === 'near' ? rnd(0.95, 1.25) : rnd(0.32, 0.55);
      BGP.push({ idx, kind, x, y, s: size, d, rot: rnd(-0.3, 0.3) });
      BGP.sort((a, b) => a.d - b.d);
    }
    function spawnBgPlanet() {
      const list = SEC.planets;
      let idx = list[rndi(0, list.length - 1)];
      for (let k = 0; k < 4; k++) { let used = false; for (const p of BGP) if (p.idx === idx) used = true; if (!used) break; idx = list[rndi(0, list.length - 1)]; }
      const r = Math.random(), kind = r < 0.45 ? 'far' : r < 0.85 ? 'mid' : 'near';
      const size = kind === 'far' ? rnd(28, 66) : kind === 'mid' ? rnd(90, 160) : rnd(300, 440);
      let x;
      if (kind === 'near') x = chance(0.5) ? -size * 0.22 : LW + size * 0.22;
      else x = rnd(bx0 + size * 0.4, bx1 - size * 0.4);
      addBgPlanet(kind, idx, x, by0 - size * 0.6, size);
    }
    function newSectorBg() {
      buildNeb();
      BGP.length = 0;
      plCache.clear();
      addBgPlanet('mid', SEC.land, LW * (chance(0.5) ? 0.74 : 0.26), by0 - 40, rnd(210, 260));
      addBgPlanet('far', SEC.planets[(rndi(0, 9)) % SEC.planets.length], rnd(bx0 + 30, bx1 - 30), rnd(by0 + 40, LH * 0.5), rnd(34, 56));
      bgPlT = rnd(6, 9);
    }
    function updBg(dt) {
      updStars(dt);
      if (warp > 0.02) for (let i = 0; i < WN; i++) { WD[i] += dt * WS[i] * (0.2 + warp * 1.6); if (WD[i] > 1) WD[i] -= 1; }
      nebY += scrollV * 0.07 * dt;
      for (let i = BGP.length - 1; i >= 0; i--) {
        const p = BGP[i];
        p.y += scrollV * p.d * dt;
        if (p.y - p.s * 0.7 > by1) BGP.splice(i, 1);
      }
      bgPlT -= dt * (scrollV / 60);
      if (bgPlT <= 0 && warp < 0.3) { bgPlT = rnd(6, 12); spawnBgPlanet(); }
    }
    const WN = 48, WA = new Float32Array(WN), WD = new Float32Array(WN), WS = new Float32Array(WN);
    for (let i = 0; i < WN; i++) { WA[i] = 0.12 + Math.random() * (Math.PI - 0.24); WD[i] = Math.random(); WS[i] = 0.6 + Math.random() * 0.8; }
    function drawWarp() {                        // tunnel du saut hyperespace
      if (warp < 0.04) return;
      const vx = LW / 2, vy = -LH * 0.12, R = Math.sqrt(LW * LW + LH * LH) * 1.15;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = SEC.acc;
      for (let k = 0; k < 7; k++) {
        const r = (T * 0.85 + k / 7) % 1, rr = r * r * R;
        ctx.globalAlpha = warp * 0.42 * (1 - r) * Math.min(1, r * 6);
        ctx.lineWidth = 1 + r * 12;
        ctx.beginPath(); ctx.ellipse(vx, vy, Math.max(1, rr), Math.max(1, rr * 0.62), 0, 0, Math.PI); ctx.stroke();
      }
      ctx.strokeStyle = '#eafcff'; ctx.lineCap = 'round';
      for (let i = 0; i < WN; i++) {
        const q = WD[i], d = q * q * R, len = (16 + 260 * warp) * q, c = Math.cos(WA[i]), sn = Math.sin(WA[i]);
        ctx.globalAlpha = warp * 0.85 * Math.min(1, q * 4);
        ctx.lineWidth = 0.5 + q * 2.6;
        ctx.beginPath(); ctx.moveTo(vx + c * d, vy + sn * d); ctx.lineTo(vx + c * (d + len), vy + sn * (d + len)); ctx.stroke();
      }
      ctx.globalAlpha = warp * 0.9; ctx.drawImage(GL.w, vx - 120, vy - 120, 240, 240);
      ctx.globalAlpha = warp * 0.6; ctx.drawImage(glowOf(SEC.acc === '#38e1ff' ? 'c' : 'm'), vx - 220, vy - 160, 440, 320);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    let gradCache = null, gradKey = '';
    function drawBackground() {
      const W = canvas.width, H = canvas.height;
      const key = SEC.bg0 + SEC.bg1 + H;
      if (key !== gradKey) { gradKey = key; gradCache = ctx.createLinearGradient(0, 0, 0, H); gradCache.addColorStop(0, SEC.bg0); gradCache.addColorStop(1, SEC.bg1); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = gradCache; ctx.fillRect(0, 0, W, H);
      S0();
      // nébuleuse (mosaïque miroir sans couture)
      if (nebCv) {
        // un seul remplissage par motif répété : aucune couture ; l'axe du miroir tombe hors de la colonne
        const TL = 860, oy = nebY % TL, ax = LW / 2 - TL / 4;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = NEBK[secI] * (1 - darkK * 0.6);
        if (!nebPat) { try { nebPat = ctx.createPattern(nebCv, 'repeat'); } catch (e) { nebPat = null; } }
        if (nebPat && nebMat && nebPat.setTransform) {
          const s = (TL * K) / nebCv.width;
          nebMat.a = s; nebMat.b = 0; nebMat.c = 0; nebMat.d = s; nebMat.e = OXd + ax * K; nebMat.f = OYd + oy * K;
          nebPat.setTransform(nebMat);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = nebPat; ctx.fillRect(0, 0, W, H);
          S0();
        } else {
          const ys = oy + Math.floor((by0 - 8 - oy) / TL) * TL, xs = ax + Math.floor((bx0 - 8 - ax) / TL) * TL;
          for (let y = ys; y < by1 + 8; y += TL) for (let x = xs; x < bx1 + 8; x += TL) ctx.drawImage(nebCv, x, y, TL, TL);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // étoiles
      if (SX) {
        const streak = Math.max(0, scrollV - 70) * 0.045;
        ctx.fillStyle = SEC.star;
        if (streak > 2) {
          ctx.strokeStyle = SEC.star; ctx.lineCap = 'round';
          for (let l = 0; l < 3; l++) {
            ctx.globalAlpha = LAL[l] * (0.6 + warp * 0.4); ctx.lineWidth = LSZ[l] * 0.8;
            ctx.beginPath();
            const len = streak * LSPD[l] * 2.2;
            for (let i = 0; i < starN; i++) if (SL[i] === l) { ctx.moveTo(SX[i], SY[i]); ctx.lineTo(SX[i], SY[i] - len); }
            ctx.stroke();
          }
        } else {
          for (let i = 0; i < starN; i++) {
            const l = SL[i], s = LSZ[l];
            ctx.globalAlpha = LAL[l] * (0.75 + 0.25 * Math.sin(T * 2 + SP[i]));
            ctx.fillRect(SX[i] - s / 2, SY[i] - s / 2, s, s + streak * LSPD[l]);
          }
        }
        ctx.globalAlpha = 1;
      }
      // planètes d'ILO à différentes profondeurs
      for (let i = 0; i < BGP.length; i++) {
        const p = BGP[i], v = plVariant(p.idx, p.kind), s = p.s * v.k;
        ctx.globalAlpha = p.kind === 'far' ? 0.8 : 0.96;
        ctx.drawImage(v.cv, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      // poussières (traînées de vitesse)
      ctx.strokeStyle = SEC.star; ctx.lineCap = 'round'; ctx.lineWidth = 0.9;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      for (let i = 0; i < DN; i++) { const l = 10 + DV[i] * 12 + warp * 60; ctx.moveTo(DX[i], DY[i]); ctx.lineTo(DX[i], DY[i] - l); }
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawWarp();
    }
    function drawSideShade() {
      if (colX < 2 && colY < 2) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(1,3,8,0.5)';
      const x0 = Math.round(colX * dpr), x1 = Math.round((colX + colW) * dpr), y0 = Math.round(colY * dpr), y1 = Math.round((colY + colH) * dpr);
      if (x0 > 0) { ctx.fillRect(0, 0, x0, canvas.height); ctx.fillRect(x1, 0, canvas.width - x1, canvas.height); }
      if (y0 > 0) { ctx.fillRect(x0, 0, x1 - x0, y0); ctx.fillRect(x0, y1, x1 - x0, canvas.height - y1); }
      if (x0 > 0) {
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        g.addColorStop(0, hexA(SEC.acc, 0)); g.addColorStop(0.5, hexA(SEC.acc, 0.55)); g.addColorStop(1, hexA(SEC.acc, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x0 - Math.max(1, dpr), 0, Math.max(1, dpr), canvas.height);
        ctx.fillRect(x1, 0, Math.max(1, dpr), canvas.height);
      }
    }

    // ------------------------------------------------------------- dessin du monde
    const TRC = [], TRM = [];
    for (let i = 0; i < 16; i++) { const k = 1 - i / 16; TRC.push('rgba(56,225,255,' + (0.42 * k).toFixed(3) + ')'); TRM.push('rgba(255,80,210,' + (0.5 * k).toFixed(3) + ')'); }
    const DASH = [7, 6], NODASH = [];
    const ELIGHT = { swarm: 'm', dart: 'o', carrier: 'y', frigate: 'o', rockL: 'o', rockM: 'o', rockS: 'o', miner: 'g', mine: 'r', sentinel: 'm', snakeH: 'g', snakeB: 'g', cruiser: 'b', stealth: 'v', weaver: 'y', elite: 'm', drone: 'g', gardien: 'o' };
    function flashOver(x, y, r, a) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.w, x, y, r * 2.2, a); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    function drawEnemies() {
      for (let i = 0; i < enN; i++) {
        const e = EN[i];
        if (!e.alive || e.delay > 0 || e.y < -70 || e.y > LH + 70 || e.x < -70 || e.x > LW + 70) continue;
        switch (e.type) {
          case 'swarm': dsprR(SPR.swarm, e.x, e.y, Math.atan2(-e.vx, e.vy + 1), 1 + Math.sin(e.t * 28) * 0.04); break;
          case 'drone': dsprR(SPR.drone, e.x, e.y, Math.atan2(-e.vx, e.vy + 1) * 0.5, 1); break;
          case 'dart': {
            const a = e.k === 2 ? Math.atan2(-Math.cos(e.aim), Math.sin(e.aim)) : Math.atan2(-Math.cos(e.aim), Math.sin(e.aim)) * 0.6;
            if (e.k === 1 || (e.k === 0 && e.t > e.hold - 0.6)) {
              const blink = e.k === 1 ? ((T * 16) | 0) % 2 : 0;
              ctx.strokeStyle = e.k === 1 ? (blink ? 'rgba(255,220,120,0.95)' : 'rgba(255,90,60,0.85)') : 'rgba(255,140,60,0.35)';
              ctx.lineWidth = e.k === 1 ? 2 : 1.2; ctx.setLineDash(DASH);
              ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.aim) * 230, e.y + Math.sin(e.aim) * 230); ctx.stroke();
              ctx.setLineDash(NODASH);
            }
            dsprR(SPR.dart, e.x, e.y, a, 1);
            if (e.k === 2) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.o, e.x - Math.cos(e.aim) * 12, e.y - Math.sin(e.aim) * 12, 22, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
            break;
          }
          case 'carrier':
            dspr(SPR.carrier, e.x, e.y);
            ctx.globalCompositeOperation = 'lighter'; glowAt(GL.y, e.x, e.y, 30, 0.55 + 0.3 * Math.sin(T * 7)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            break;
          case 'frigate':
            dspr(SPR.frigate, e.x, e.y);
            dsprR(SPR.turret, e.x, e.y, e.aim - Math.PI / 2, 1);
            break;
          case 'rockL': case 'rockM': case 'rockS': {
            const set = e.type === 'rockL' ? (e.rich ? SPR.rock.RL : SPR.rock.L) : e.type === 'rockM' ? (e.rich ? SPR.rock.RM : SPR.rock.M) : SPR.rock.S;
            dsprR(set[e.seed % set.length], e.x, e.y, e.ang, 1);
            if (e.rich) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.y, e.x, e.y, e.r * 2.2, 0.25 + 0.15 * Math.sin(T * 5)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
            break;
          }
          case 'miner': dspr(SPR.miner, e.x, e.y); break;
          case 'mine': {
            dsprR(SPR.mine, e.x, e.y, e.ang, 1);
            const arm = e.k === 1;
            ctx.globalCompositeOperation = 'lighter';
            glowAt(GL.r, e.x, e.y, arm ? 30 + (0.62 - e.st2) * 40 : 16, arm ? (((T * 18) | 0) % 2 ? 1 : 0.4) : 0.4 + 0.3 * Math.sin(T * 4 + e.uid));
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            if (arm) { ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 1.2; circ(ctx, e.x, e.y, 56 * (1 - e.st2 / 0.62) + 8); ctx.stroke(); }
            break;
          }
          case 'sentinel': {
            dspr(SPR.sentinel, e.x, e.y);
            if (e.beam) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.m, e.x, e.y + 8, 26 + Math.sin(T * 30) * 4, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
            break;
          }
          case 'snakeH': dsprR(SPR.snakeH, e.x, e.y, Math.atan2(-e.vx, e.vy + 1), 1); break;
          case 'snakeB': dsprR(SPR.snakeB, e.x, e.y, e.t * 2, 1); break;
          case 'cruiser': {
            dsprR(SPR.cruiser, e.x, e.y, e.ang, 1);
            const fa = e.ang + Math.PI / 2;
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(90,170,255,0.75)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(e.x, e.y, 34, fa - 0.98, fa + 0.98); ctx.stroke();
            ctx.strokeStyle = 'rgba(200,235,255,0.9)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(e.x, e.y, 34, fa - 0.98, fa + 0.98); ctx.stroke();
            ctx.strokeStyle = 'rgba(90,170,255,0.3)'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(e.x, e.y, 37, fa - 0.9, fa + 0.9); ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
            break;
          }
          case 'stealth': {
            const a = Math.max(0.1, e.cloak);
            ctx.globalAlpha = a; dspr(SPR.stealth, e.x, e.y); ctx.globalAlpha = 1;
            if (a < 0.6) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.v, e.x + Math.sin(T * 13) * 2, e.y, 30, 0.22); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
            break;
          }
          case 'weaver': dsprR(SPR.weaverW, e.x, e.y, e.t * 3.2, 1); dspr(SPR.weaverB, e.x, e.y); break;
          case 'elite':
            dspr(SPR.elite, e.x, e.y);
            if (e.head) headBubble(e.head.img, e.x, e.y + 1, 15.5, false);
            else { dsprS(SPR.pilot, e.x, e.y + 1, 15.5 / 16); dsprS(SPR.glass, e.x, e.y + 1, 15.5 / 16); }
            break;
          case 'gardien': {
            const g = gardSpr(e.hue);
            dspr(g, e.x, e.y);
            if (e.head) headBubble(e.head.img, e.x, e.y + 2, 18.5, false);
            else {
              ctx.fillStyle = rad(ctx, e.x - 5, e.y - 4, 1, e.x, e.y + 2, 18.5, [0, hsl(e.hue, 100, 85), 0.4, hsl(e.hue, 90, 55), 1, hsl(e.hue, 80, 18)]);
              circ(ctx, e.x, e.y + 2, 18.5); ctx.fill();
              ctx.fillStyle = '#05050a'; ell(ctx, e.x + clamp((P.x - e.x) / 100, -1, 1) * 6, e.y + 5, 4, 10); ctx.fill();
            }
            ctx.globalCompositeOperation = 'lighter';
            glowAt(GL.o, e.x - 44, e.y + 34, 22 + Math.sin(T * 20) * 3, 0.8); glowAt(GL.o, e.x + 44, e.y + 34, 22 + Math.sin(T * 20 + 1) * 3, 0.8);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            break;
          }
          default: break;
        }
        if (e.flash > 0) flashOver(e.x, e.y, e.r, 0.55);
      }
    }
    function drawShip(s) {
      if (!s.alive) return;
      const hyp = s.hyperT > 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 1; i < s.trailN; i++) {
        ctx.strokeStyle = hyp ? TRM[i] : CO && s.i ? TRA[i] : TRC[i];
        ctx.lineWidth = 6 * (1 - i / s.trailN) + 0.6;
        ctx.beginPath(); ctx.moveTo(s.TRAIL[i * 2 - 2], s.TRAIL[i * 2 - 1]); ctx.lineTo(s.TRAIL[i * 2], s.TRAIL[i * 2 + 1]); ctx.stroke();
      }
      const fl = 13 + Math.sin(rt * 47) * 3 + clamp(-s.vy / 40, -4, 8) + (s.auto > 0 ? warp * 30 : 0);
      const eg = hyp ? GL.m : CO && s.i ? GL.o : GL.c;
      for (let s = -1; s <= 1; s += 2) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(eg, s.x + s * 3 + s.bank * 1.5 - 4.5, s.y + 14, 9, fl + 6);
        ctx.drawImage(GL.w, s.x + s * 3 + s.bank * 1.5 - 2, s.y + 15, 4, fl * 0.5);
      }
      if (hyp) glowAt(GL.m, s.x, s.y, 90 + Math.sin(rt * 20) * 8, 0.45);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const blink = s.inv > 0 && ((rt * 14) | 0) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.35;
      const fr = clamp(Math.round((s.bank + 1) * 4), 0, 8);
      dspr((CO && s.i ? SPR.shipA : SPR.ship)[fr], s.x, s.y);
      ctx.globalAlpha = 1;
      // drones
      for (let i = 0; i < s.opts; i++) {
        const o = s.OPT[i];
        ctx.globalCompositeOperation = 'lighter'; glowAt(hyp ? GL.m : GL.v, o.x, o.y, 22, 0.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#efe6ff'; circ(ctx, o.x, o.y, 3.6); ctx.fill();
        ctx.strokeStyle = CO && s.i ? '#ffb547' : '#b37bff'; ctx.lineWidth = 1.3; circ(ctx, o.x, o.y, 6.2); ctx.stroke();
      }
      // cœur (zone de touche) toujours visible
      ctx.globalCompositeOperation = 'lighter'; glowAt(GL.c, s.x, s.y - 1, 12, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff'; circ(ctx, s.x, s.y - 1, CO && s !== P ? 1.6 : 2.2); ctx.fill();
      if (s.inv > 0 && s.hitFlash <= 0 && s.auto <= 0) {
        ctx.strokeStyle = (CO && s.i ? 'rgba(255,196,120,' : 'rgba(120,240,255,') + Math.min(0.6, s.inv * 0.4).toFixed(2) + ')'; ctx.lineWidth = 1.5;
        circ(ctx, s.x, s.y, 26 + Math.sin(rt * 10) * 1.5); ctx.stroke();
      }
      if (s.shield > 0) {                         // bulle de protection
        const r = 27 + Math.sin(rt * 4) * 1.2;
        ctx.fillStyle = CO && s.i ? 'rgba(255,200,120,0.08)' : 'rgba(120,230,255,0.08)'; circ(ctx, s.x, s.y + 1, r); ctx.fill();
        ctx.strokeStyle = (CO && s.i ? 'rgba(255,214,150,' : 'rgba(160,245,255,') + (0.45 + 0.15 * Math.sin(rt * 5)).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(s.x, s.y + 1, r - 4, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
      }
      if (s.magT > 0) {
        ctx.strokeStyle = 'rgba(255,211,77,0.5)'; ctx.lineWidth = 1.2; ctx.setLineDash(DASH);
        ctx.beginPath(); ctx.arc(s.x, s.y, 40, rt * 2, rt * 2 + TAU); ctx.stroke(); ctx.setLineDash(NODASH);
      }
      if (CO) drawShipCoop(s);
    }
    function drawShots() {
      ctx.globalCompositeOperation = 'lighter';
      const a0 = P.power >= 4 || P.opts >= 2 ? 0.78 : 0.92;
      ctx.globalAlpha = a0;
      let rot = false;
      for (let i = 0; i < psN; i++) {
        const s = PS[i], sp = s.spr;
        if (CO) ctx.globalAlpha = s.o === ME ? a0 : 0.6;   // les tirs du coéquipier, plus discrets
        if (s.ang === 0) {
          if (rot) { S0(); rot = false; }
          ctx.drawImage(sp.cv, s.x - sp.w / 2, s.y - sp.h / 2, sp.w, sp.h);
        } else {
          const c = Math.cos(s.ang) * K, sn = Math.sin(s.ang) * K;
          ctx.setTransform(c, sn, -sn, c, OXd + s.x * K, OYd + s.y * K);
          ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
          rot = true;
        }
      }
      if (rot) S0();
      for (let i = 0; i < msN; i++) { const m = MS[i]; glowAt(GL.o, m.x - m.vx * 0.02, m.y - m.vy * 0.02, 14, 0.85); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < msN; i++) { const m = MS[i]; dsprR(SPR.missile, m.x, m.y, Math.atan2(m.vy, m.vx) + Math.PI / 2, 1); }
    }
    function drawParticles() {
      for (let i = 0; i < ptN; i++) {
        const p = PT[i];
        if (p.add) continue;
        const k = p.life / p.max;
        if (p.spr) {
          ctx.globalAlpha = Math.min(1, k * 2);
          const c = Math.cos(p.rot) * K * p.s0, s = Math.sin(p.rot) * K * p.s0;
          ctx.setTransform(c, s, -s, c, OXd + p.x * K, OYd + p.y * K);
          ctx.drawImage(p.spr.cv, -p.spr.w / 2, -p.spr.h / 2, p.spr.w, p.spr.h);
        } else {
          S0();
          const sz = p.s1 + (p.s0 - p.s1) * k;
          ctx.globalAlpha = k * p.a0;
          ctx.drawImage(p.img, p.x - sz / 2, p.y - sz / 2, sz, sz);
        }
      }
      S0();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ptN; i++) {
        const p = PT[i];
        if (!p.add) continue;
        const k = p.life / p.max, sz = p.s1 + (p.s0 - p.s1) * k;
        ctx.globalAlpha = k > 0.7 ? 1 : k / 0.7;
        ctx.drawImage(p.img, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < rgN; i++) {
        const g = RG[i], k = g.life / g.max, r = g.r1 + (g.r0 - g.r1) * k;
        ctx.globalAlpha = k;
        ctx.strokeStyle = g.col; ctx.lineWidth = g.w * (0.4 + k);
        circ(ctx, g.x, g.y, r); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawPickups() {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < shN; i++) { const s = SH[i]; dsprS(SPR.shard, s.x, s.y, 0.9 + 0.15 * Math.sin(T * 9 + i)); }
      for (let i = 0; i < cpN; i++) { const c = CP[i]; glowAt(glowOf(c.k === 'P' ? 'c' : c.k === 'M' ? 'o' : c.k === 'O' ? 'v' : c.k === 'S' ? 'g' : c.k === 'B' ? 'r' : 'y'), c.x, c.y, 54 + Math.sin(T * 6) * 6, 0.55); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < cpN; i++) { const c = CP[i]; dsprR(SPR.cap[c.k], c.x, c.y, Math.sin(c.t * 2.5) * 0.25, 1 + Math.sin(T * 6) * 0.05); }
      if (CO) drawPromises();
    }
    function drawEB() {                          // transformations groupées : une seule remise à zéro par série
      let rot = false;
      for (let i = 0; i < ebN; i++) {
        const b = EB[i];
        if (b.delay > 0) continue;
        const sp = b.spr;
        if (b.rot) {
          const a = Math.atan2(-b.vx, b.vy), c = Math.cos(a) * K, sn = Math.sin(a) * K;
          ctx.setTransform(c, sn, -sn, c, OXd + b.x * K, OYd + b.y * K);
          ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
          rot = true;
        } else {
          if (rot) { S0(); rot = false; }
          ctx.drawImage(sp.cv, b.x - sp.w / 2, b.y - sp.h / 2, sp.w, sp.h);
        }
      }
      if (rot) S0();
    }
    const BEAMCOL = { m: ['rgba(255,63,180,', GL.m], g: ['rgba(70,240,138,', GL.g], o: ['rgba(255,154,31,', GL.o] };
    function drawBeams() {
      for (let i = 0; i < BEAMS.length; i++) {
        const bm = BEAMS[i], bc = BEAMCOL[bm.col] || BEAMCOL.m;
        const ex = bm.x + Math.cos(bm.ang) * bm.len, ey = bm.y + Math.sin(bm.ang) * bm.len;
        if (bm.t < bm.warn) {
          const k = bm.t / bm.warn, bl = ((bm.t * 14) | 0) % 2;
          ctx.strokeStyle = bc[0] + (0.35 + 0.45 * bl * k).toFixed(2) + ')'; ctx.lineWidth = 1 + k * 2;
          ctx.setLineDash(DASH);
          ctx.beginPath(); ctx.moveTo(bm.x, bm.y); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.setLineDash(NODASH);
          ctx.strokeStyle = bc[0] + (0.12 * k).toFixed(2) + ')'; ctx.lineWidth = bm.w;
          ctx.beginPath(); ctx.moveTo(bm.x, bm.y); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter'; glowAt(bc[1], bm.x, bm.y, 14 + k * 26, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        } else {
          const k = Math.min(1, (bm.t - bm.warn) / 0.08) * Math.min(1, (bm.warn + bm.dur - bm.t) / 0.15);
          const wj = bm.w * (1 + Math.sin(T * 50) * 0.08);
          ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          ctx.strokeStyle = bc[0] + (0.35 * k).toFixed(2) + ')'; ctx.lineWidth = wj * 2.2;
          ctx.beginPath(); ctx.moveTo(bm.x, bm.y); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = bc[0] + (0.85 * k).toFixed(2) + ')'; ctx.lineWidth = wj;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * k).toFixed(2) + ')'; ctx.lineWidth = wj * 0.38;
          ctx.stroke();
          glowAt(bc[1], bm.x, bm.y, bm.w * 4, k);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
    function drawEventsUnder() {
      if (hole && !hole.boss) {
        const k = hole.k;
        ctx.globalCompositeOperation = 'lighter';
        dsprR(SPR.disk, hole.x, hole.y, -hole.t * 1.6, 0.42 + 0.08 * k);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = rad(ctx, hole.x, hole.y, 4, hole.x, hole.y, 30, [0, '#000', 0.6, '#000', 1, 'rgba(0,0,0,0)']);
        circ(ctx, hole.x, hole.y, 30); ctx.fill();
        ctx.strokeStyle = 'rgba(255,170,90,' + (0.5 * k).toFixed(2) + ')'; ctx.lineWidth = 1.4;
        circ(ctx, hole.x, hole.y, 21 + Math.sin(hole.t * 6) * 1.5); ctx.stroke();
      }
      for (let i = 0; i < GATES.length; i++) {
        const g = GATES[i], on = g.t > 1.2, gp = g.gaps;
        let x0 = 0;
        for (let j = 0; j <= gp.length; j += 2) {
          const x1 = j < gp.length ? gp[j] : LW;
          if (x1 > x0) {
            if (on) {
              ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
              ctx.strokeStyle = 'rgba(255,60,90,0.35)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0, g.y); ctx.lineTo(x1, g.y); ctx.stroke();
              ctx.strokeStyle = 'rgba(255,90,120,0.9)'; ctx.lineWidth = 4; ctx.stroke();
              ctx.strokeStyle = 'rgba(255,240,245,0.95)'; ctx.lineWidth = 1.5; ctx.stroke();
              ctx.globalCompositeOperation = 'source-over';
            } else {
              ctx.strokeStyle = 'rgba(255,90,120,' + (0.25 + 0.25 * (((g.t * 10) | 0) % 2)) + ')'; ctx.lineWidth = 1.5; ctx.setLineDash(DASH);
              ctx.beginPath(); ctx.moveTo(x0, g.y); ctx.lineTo(x1, g.y); ctx.stroke(); ctx.setLineDash(NODASH);
            }
          }
          if (j < gp.length) {
            ctx.fillStyle = '#2a0a12'; ctx.strokeStyle = '#ff5a7a'; ctx.lineWidth = 1.2;
            for (const px of [gp[j], gp[j + 1]]) { rrect(ctx, px - 4, g.y - 6, 8, 12, 2); ctx.fill(); ctx.stroke(); }
            x0 = gp[j + 1];
          }
        }
      }
      for (let i = 0; i < BOLTS.length; i++) {
        const b = BOLTS[i];
        if (b.t < b.warn) {
          const bl = ((b.t * 12) | 0) % 2, k = b.t / b.warn;
          ctx.fillStyle = 'rgba(170,140,255,' + (0.07 + 0.1 * k + 0.06 * bl).toFixed(3) + ')';
          ctx.fillRect(b.x - 15, 0, 30, LH);
          ctx.strokeStyle = 'rgba(200,180,255,' + (0.3 + 0.4 * bl) + ')'; ctx.lineWidth = 1; ctx.setLineDash(DASH);
          ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, LH); ctx.stroke(); ctx.setLineDash(NODASH);
          ctx.fillStyle = '#e8ddff'; poly(ctx, [b.x, 64, b.x - 9, 80, b.x + 9, 80]); ctx.fill();
          ctx.fillStyle = '#2a1060'; ctx.fillRect(b.x - 1, 69, 2, 6);
        }
      }
    }
    function drawBolts() {
      for (let i = 0; i < BOLTS.length; i++) {
        const b = BOLTS[i];
        if (b.t < b.warn) continue;
        const k = 1 - (b.t - b.warn) / b.dur;
        ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? 'rgba(255,255,255,' + k.toFixed(2) + ')' : 'rgba(160,120,255,' + (0.6 * k).toFixed(2) + ')';
          ctx.lineWidth = pass ? 2.2 : 12;
          ctx.beginPath(); ctx.moveTo(b.x, -10);
          for (let y = 0; y <= LH; y += LH / 12) ctx.lineTo(b.x + (hash(b.seed + y * 0.37 + ((T * 20) | 0)) - 0.5) * 18, y);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    let darkCv = null, darkC = null;
    function drawDarkness() {
      if (darkK < 0.02) return;
      const dw = Math.ceil(LW / 4), dh = Math.ceil(LH / 4);
      if (!darkCv || darkCv.width !== dw || darkCv.height !== dh) { darkCv = mkCanvas(dw, dh); darkC = darkCv.getContext('2d'); }
      const c = darkC;
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.clearRect(0, 0, dw, dh);
      c.fillStyle = 'rgba(0,0,6,' + (0.94 * darkK).toFixed(3) + ')'; c.fillRect(0, 0, dw, dh);
      c.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < SHIPS.length; k++) {
        const s = SHIPS[k];
        if (!s.alive) continue;
        const r = (95 + Math.sin(rt * 9) * 4) / 4;
        c.drawImage(LIGHT, s.x / 4 - r, s.y / 4 - r, 2 * r, 2 * r);
        c.globalAlpha = 0.85; c.drawImage(LIGHT, s.x / 4 - r * 0.9, (s.y - 150) / 4 - r * 1.5, r * 1.8, r * 3);
        c.globalAlpha = 0.5; c.drawImage(LIGHT, s.x / 4 - r * 1.2, (s.y - 300) / 4 - r * 1.3, r * 2.4, r * 2.6);
        c.globalAlpha = 1;
      }
      for (let i = 0; i < ltN; i++) { const l = LT[i], r = l.r / 4; c.globalAlpha = l.life / l.max; c.drawImage(LIGHT, l.x / 4 - r, l.y / 4 - r, 2 * r, 2 * r); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      ctx.drawImage(darkCv, 0, 0, LW, LH);
      // les ennemis restent repérables : leurs yeux brillent dans le noir
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < enN; i++) { const e = EN[i]; if (!e.alive || e.delay > 0) continue; glowAt(glowOf(ELIGHT[e.type] || 'm'), e.x, e.y, Math.max(16, e.r * 1.6), 0.6 * darkK * (e.type === 'stealth' ? e.cloak : 1)); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawFacesTexts() {
      for (let i = 0; i < FACES.length; i++) {
        const f = FACES[i], a = f.t < 0.25 ? f.t / 0.25 : f.t > f.life - 0.5 ? Math.max(0, (f.life - f.t) / 0.5) : 1;
        if (!f.img) continue;
        ctx.globalAlpha = a;
        try {
          const iw = f.img.naturalWidth || f.img.width || 1, ih = f.img.naturalHeight || f.img.height || 1, h = f.size * (0.8 + 0.2 * Math.min(1, f.t * 4)), w = (h * iw) / ih;
          ctx.drawImage(f.img, f.x - w / 2, f.y - h / 2 + Math.sin(f.t * 6) * 2, w, h);
        } catch (e) { /* rien */ }
        txt(f.txt, f.x, f.y - f.size * 0.62, f.size > 60 ? 16 : 13, '#bfe6ff', 'center', false, 3.5);
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < txN; i++) {
        const t = TX[i], k = t.life / t.max;
        ctx.globalAlpha = Math.min(1, k * 2.5);
        txt(t.s, t.x, t.y, t.size, t.col, 'center', t.font === 1, 3);
      }
      ctx.globalAlpha = 1;
    }
    function drawWorld() {
      S0();
      drawEventsUnder();
      drawEnemies();
      if (B) BDRAW[B.kind](B);
      if (darkK < 0.02) drawShots();
      if (CO) { drawCrew(); drawShip(other(P)); drawShip(P); }   // mon vaisseau par-dessus
      else for (let i = 0; i < SHIPS.length; i++) drawShip(SHIPS[i]);
      drawParticles();
      drawDarkness();
      if (darkK >= 0.02) drawShots();
      drawPickups();
      drawBeams();
      drawBolts();
      drawEB();
      drawFacesTexts();
    }


    // =================================================================== COOP : dessin de l'équipage
    // Vaisseau Ambre du coéquipier (tirs ambrés, un peu plus discrets), sa tête dans une bulle sous lui, « TOI » sur le mien au départ ;
    // épave = capsule de verre avec la tête TRISTE, zone de sauvetage pulsante, compte à rebours, rayon tracteur pointillé ;
    // « ! » au-dessus du robot qui fonce sauver ; capsules promises (anneau + mini-visage). Aucune bulle de texte.
    const TRA = [];
    for (let i = 0; i < 16; i++) { const k = 1 - i / 16; TRA.push('rgba(255,166,48,' + (0.42 * k).toFixed(3) + ')'); }
    function coopSprites(S) {
      S.shipA = [];
      for (let i = 0; i < 9; i++) S.shipA.push(mkSpr(50, 56, (c) => paintShip(c, (i - 4) / 4, PAL_AMBRE)));
      S.boltA = mkSpr(8, 34, (c) => paintBolt(c, 3, 32, '#ffb547', '#fff4dc'));
      S.heavyA = mkSpr(12, 38, (c) => paintBolt(c, 4.6, 36, '#ffb547', '#fff4dc'));
      S.laserA = mkSpr(8, 42, (c) => paintBolt(c, 2.4, 40, '#ffd08a', '#ffffff'));
      S.plasmaA = mkSpr(18, 30, (c) => paintBolt(c, 8, 28, '#ff8a3a', '#ffffff'));
      S.optBA = mkSpr(7, 16, (c) => paintBolt(c, 2.6, 14, '#ffc06a', '#ffffff'));
    }
    function coopShotSpr(kind, spr) { return kind === 0 ? SPR.boltA : kind === 1 ? SPR.heavyA : kind === 2 ? SPR.laserA : kind === 3 ? SPR.plasmaA : kind === 5 ? SPR.optBA : spr; }
    function pilotHead(s, x, y, r, sad) {          // tête du pilote (ou rond de sa couleur + initiale, pour un invité sans tête)
      const im = sad ? s.sad || s.img : s.img;
      if (im) headCircle(im, x, y, r);
      else {                                     // (sans tête : rond de sa couleur, l'initiale seulement en grand)
        ctx.fillStyle = hexA(s.col, r < 8 ? 0.85 : 0.35); circ(ctx, x, y, r); ctx.fill();
        if (r >= 8) txt((s.name || '?').charAt(0), x, y + r * 0.42, Math.max(7, Math.round(r * 1.15)), '#ffffff', 'center', false, 0);
      }
    }
    function drawCrew() {                          // sous les vaisseaux : épaves, zones de sauvetage, rayons tracteurs
      for (let i = 0; i < SHIPS.length; i++) {
        const s = SHIPS[i];
        if (s.st !== 'wreck') continue;
        const o = other(s), x = s.podX, y = s.podY, left = s.podT / Math.max(1, s.podMax), urgent = s.podT < 4;
        const blink = urgent && ((rt * 6) | 0) % 2 === 0;
        // zone de sauvetage (38 px) : anneau pointillé qui respire, à la couleur du sauveteur
        ctx.globalCompositeOperation = 'lighter';
        glowAt(o.col === COLS[0] ? GL.c : GL.o, x, y, 70 + Math.sin(rt * 5) * 6, 0.35 + (s.rk > 0 ? 0.25 : 0));
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.strokeStyle = hexA(o.col, 0.55 + 0.25 * Math.sin(rt * 5)); ctx.lineWidth = 1.6; ctx.setLineDash(DASH);
        ctx.beginPath(); ctx.arc(x, y, 38, rt * 0.8, rt * 0.8 + TAU); ctx.stroke(); ctx.setLineDash(NODASH);
        // rayon tracteur quand le sauveteur est dessus
        if (s.rk > 0 && o.alive) {
          ctx.strokeStyle = hexA(o.col, 0.85); ctx.lineWidth = 2.2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -rt * 40;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash(NODASH); ctx.lineDashOffset = 0;
          ctx.strokeStyle = o.col; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(x, y, 27, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s.rk, 0, 1)); ctx.stroke();
        }
        // compte à rebours (arc qui se vide, rouge et clignotant à la fin)
        ctx.strokeStyle = urgent ? (blink ? '#ffffff' : '#ff4d6d') : 'rgba(233,240,243,0.75)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y, 21.5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(left, 0, 1)); ctx.stroke();
        // la capsule de verre et la tête triste
        const bob = Math.sin(rt * 2.4 + i) * 1.5;
        ctx.globalCompositeOperation = 'lighter'; glowAt(GL.w, x, y + bob, 46, 0.18); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        pilotHead(s, x, y + bob, 15, true);
        dsprS(SPR.glass, x, y + bob, 15 / 16);
        ctx.strokeStyle = s.col; ctx.lineWidth = 2; circ(ctx, x, y + bob, 16); ctx.stroke();
        if (urgent) txt(String(Math.max(1, Math.ceil(s.podT))), x, y - 25, 12, blink ? '#ffffff' : '#ff8fa3', 'center', false, 3);
      }
    }
    function drawShipCoop(s) {                     // par-dessus un vaisseau qui vole : tête du coéquipier, « TOI », « ! » du robot
      if (!s.alive) return;
      if (s !== P) {
        const y = s.y + 41;
        ctx.globalCompositeOperation = 'lighter'; glowAt(s.i ? GL.o : GL.c, s.x, y, 30, 0.35); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        pilotHead(s, s.x, y, 10.5, false);
        dsprS(SPR.glass, s.x, y, 10.5 / 16);
        ctx.strokeStyle = s.col; ctx.lineWidth = 1.6; circ(ctx, s.x, y, 11.2); ctx.stroke();
        if (s.nameT > 0) { ctx.globalAlpha = Math.min(1, s.nameT * 2); txt(s.name, s.x, y + 24, 10, s.col, 'center', false, 3); ctx.globalAlpha = 1; }
        if (s.helpT > 0) {                         // le robot fonce sauver : petit « ! » qui saute
          const hy = s.y - 34 - Math.abs(Math.sin(rt * 7)) * 4;
          ctx.fillStyle = '#ffd34d'; circ(ctx, s.x, hy, 7); ctx.fill();
          ctx.strokeStyle = '#3a2400'; ctx.lineWidth = 1.2; ctx.stroke();
          txt('!', s.x, hy + 4.5, 11, '#3a2400', 'center', false, 0);
        }
      } else if (s.nameT > 1.2 && state !== 'over') {
        const a = Math.min(1, (s.nameT - 1.2) * 1.6), y = s.y - 40 - Math.sin(rt * 5) * 2;
        ctx.globalAlpha = a;
        txt('TOI', s.x, y - 7, 11, s.col, 'center', false, 3);
        ctx.fillStyle = s.col; poly(ctx, [s.x - 6, y, s.x + 6, y, s.x, y + 7]); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    function drawPromises() {                      // capsule promise : anneau fin + mini-visage à la couleur de celui qui en a besoin
      for (let i = 0; i < cpN; i++) {
        const c = CP[i];
        if (!(c.pmT > 0)) continue;
        const s = SHIPS[c.pm];
        if (!s) continue;
        const a = Math.min(1, c.pmT * 1.5);
        ctx.globalAlpha = a;
        ctx.strokeStyle = s.col; ctx.lineWidth = 1.4; circ(ctx, c.x, c.y, 19 + Math.sin(T * 6) * 1.2); ctx.stroke();
        pilotHead(s, c.x + 15, c.y - 15, 6, false);
        ctx.strokeStyle = s.col; ctx.lineWidth = 1.2; circ(ctx, c.x + 15, c.y - 15, 6.6); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // ------------------------------------------------------------- HUD
    let scoreStr = '0', scoreShown = -1, scoreW = 10, lineStr = '', lineKey = '';
    const MULT_COL = ['#8aa0ae', '#38e1ff', '#46f08a', '#c6f04a', '#ffd34d', '#ffa630', '#ff5f8a', '#ff3fb4'];
    let hudGrad = null, hudGradLH = 0, vigGrad = null, vigLH = 0;
    function hudRight() { return colX >= 60 ? LW - 8 : LW - 56 / scale; }
    function hexPath(x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.closePath();
    }
    function drawHUD() {
      S0();
      if (!hudGrad || hudGradLH !== LH) { hudGradLH = LH; hudGrad = ctx.createLinearGradient(0, 0, 0, 60); hudGrad.addColorStop(0, 'rgba(1,4,10,0.86)'); hudGrad.addColorStop(0.7, 'rgba(1,4,10,0.5)'); hudGrad.addColorStop(1, 'rgba(1,4,10,0)'); }
      ctx.fillStyle = hudGrad; ctx.fillRect(0, 0, LW, 60);
      const jx = glitch > 0 ? (Math.random() - 0.5) * 4 : 0;
      const sc = Math.floor(score);
      if (sc !== scoreShown) { scoreShown = sc; scoreStr = fmt(sc); setFont(19, false); scoreW = ctx.measureText(scoreStr).width; }
      txt(scoreStr, 10 + jx, 25, 19, '#ffffff', 'left', false, 4);
      // multiplicateur
      const mx = 10 + scoreW + 9 + jx, mc = MULT_COL[mult - 1], pop = 1 + multPop * 0.35;
      ctx.save(); ctx.translate(mx + 17, 18); ctx.scale(pop, pop);
      rrect(ctx, -17, -9, 34, 18, 9); ctx.fillStyle = mult > 1 ? hexA(mc, 0.22) : 'rgba(255,255,255,0.06)'; ctx.fill();
      ctx.strokeStyle = mc; ctx.lineWidth = 1.4; ctx.stroke();
      txt('×' + mult, 0, 5.5, 13, mc, 'center', false, 0);
      ctx.restore();
      if (mult > 1 || chain > 0) { ctx.fillStyle = mc; ctx.fillRect(mx, 30, 34 * clamp(chainT / 2.6, 0, 1), 2); }
      if (CO) { const hm = coopHy(); if (hm > 1) txt(hm > 2 ? '×3 HYPER DUO' : '×2 HYPER', mx + 40, 23, 9, '#ff7ad8', 'left', false, 3); }
      else if (P.hyperT > 0) txt('×2 HYPER', mx + 40, 23, 9, '#ff7ad8', 'left', false, 3);
      // secteur / vague
      const lk = secI + '|' + cycle + '|' + dir.wave + '|' + dir.nW + '|' + dir.phase;
      if (lk !== lineKey) {
        lineKey = lk;
        const cyc = cycle > 0 ? 'C' + ROMAN[Math.min(9, cycle)] + ' · ' : '';
        const ph = dir.phase === 'boss' || dir.phase === 'warn' || dir.phase === 'bossdead' ? 'BOSS' : dir.phase === 'mini' || dir.phase === 'mwarn' ? 'MINI-BOSS' : dir.wave > 0 ? 'VAGUE ' + dir.wave + '/' + dir.nW : '';
        lineStr = cyc + 'SECTEUR ' + (secI + 1) + (ph ? ' · ' + ph : '');
      }
      txt(lineStr, 10 + jx, 43, 10, '#a9c2d4', 'left', true, 0);
      // bulle de protection (une seule : sans elle, un coup = mort)
      const hr = hudRight();
      if (CO) hudCrew(hr); else {
      {
        const x = hr - 12, y = 16, on = P.shield > 0;
        circ(ctx, x, y, 9.5);
        if (on) {
          ctx.fillStyle = 'rgba(120,240,255,0.3)'; ctx.fill(); ctx.strokeStyle = '#9ff4ff'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; circ(ctx, x - 3, y - 3.5, 2.2); ctx.fill();
          txt('BULLE', x - 14, y + 4, 8, '#9ff4ff', 'right', false, 0);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,210,0.35)'; ctx.lineWidth = 1;
          ctx.setLineDash(DASH); ctx.stroke(); ctx.setLineDash(NODASH);
        }
      }
      // bombes
      for (let i = 0; i < 2; i++) {
        const x = hr - 8 - i * 15, y = 37, on = i < P.bombs;
        circ(ctx, x, y, 5); ctx.fillStyle = on ? '#ff4d6d' : 'rgba(255,255,255,0.06)'; ctx.fill();
        ctx.strokeStyle = on ? '#ffd6de' : 'rgba(160,190,210,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        if (on) { ctx.fillStyle = '#ffd34d'; circ(ctx, x + 3.5, y - 4.5, 1.6); ctx.fill(); }
      }
      }
      // jauge HYPER
      const gx = 10, gw = hr - 10 - 66, gy = 51;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(gx, gy, gw, 4);
      const hv = P.hyperT > 0 ? P.hyperT / 6 : P.hyper;
      if (hv > 0) {
        const full = P.hyper >= 1 && P.hyperT <= 0;
        ctx.fillStyle = full ? (((rt * 8) | 0) % 2 ? '#ffffff' : '#ff3fb4') : P.hyperT > 0 ? '#ff7ad8' : '#c050ff';
        ctx.fillRect(gx, gy, gw * hv, 4);
        if (hyGlow > 0.02 && !full && P.hyperT <= 0) {   // coups au boss : la jauge s'illumine (halo, liseré, reflet qui court, étincelle au bout)
          const fw = gw * hv, ex = gx + fw;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.45 * hyGlow; ctx.fillStyle = '#ff9be8'; ctx.fillRect(gx, gy - 1, fw, 6);
          ctx.globalAlpha = 0.85 * hyGlow; ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy, fw, 1.2);
          if (fw > 12) ctx.drawImage(GL.w, gx + (rt * 240) % fw - 9, gy - 4, 18, 12);
          glowAt(GL.m, ex, gy + 2, 16 + 20 * hyGlow, 0.95 * hyGlow); glowAt(GL.w, ex, gy + 2, 6 + 8 * hyGlow, 0.9 * hyGlow);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        if (full) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.m, gx + gw, gy + 2, 26, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      txt(P.hyper >= 1 && P.hyperT <= 0 ? 'HYPER PRÊT !' : 'HYPER', gx + gw + 6, gy + 5, 8, P.hyper >= 1 ? '#ff7ad8' : hyGlow > 0.1 ? '#f0b8ff' : '#7f8fa0', 'left', false, 0);
      // barre du boss / mini-boss
      if (B && !B.dying) {
        const k = B.ready ? B.hp / B.maxHp : clamp(B.t / B.enterT, 0, 1);
        bossBar(B.name, k, B.nph, '#ff3b5c');
      } else if (miniRef && miniRef.alive && miniRef.t > 0.5) {
        bossBar('MINI-BOSS · ' + MINI_NAMES[secI], miniRef.hp / miniRef.max, 1, '#ffa630');
      }
      // niveaux d'armement (bas de l'écran) : la petite jauge sous chaque niveau se vide (puissance qui redescend, armes temporaires)
      if (state === 'play' && P.alive) {
        const y = LH - 14, x0 = LW / 2 - 70;
        ctx.globalAlpha = 0.9;
        setFont(8, false); ctx.textAlign = 'left'; ctx.fillStyle = '#9fdcff'; ctx.fillText('P' + P.power, x0, y + 3);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i < P.power ? '#38e1ff' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 16 + i * 6, y - 3, 4, 6); }
        if (P.power > 1) {
          const k = 1 - P.pT / PDECAY;
          ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x0 + 16, y + 5, 34, 2.5);
          ctx.fillStyle = k < 0.25 ? (((rt * 6) | 0) % 2 ? '#ff4d6d' : '#ffd34d') : '#38e1ff'; ctx.fillRect(x0 + 16, y + 5, 34 * k, 2.5);
        }
        ctx.fillStyle = P.miss ? '#ffc48a' : 'rgba(255,196,138,0.35)'; ctx.fillText('M', x0 + 60, y + 3);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < P.miss ? '#ff9a1f' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 70 + i * 6, y - 3, 4, 6); }
        if (P.miss > 0) { ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x0 + 70, y + 5, 16, 2.5); ctx.fillStyle = '#ff9a1f'; ctx.fillRect(x0 + 70, y + 5, 16 * P.missLeft / ARMS_T, 2.5); }
        ctx.fillStyle = P.opts ? '#d9c4ff' : 'rgba(217,196,255,0.35)'; ctx.fillText('D', x0 + 96, y + 3);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i < P.opts ? '#b37bff' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 105 + i * 6, y - 3, 4, 6); }
        if (P.opts > 0) { ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x0 + 105, y + 5, 22, 2.5); ctx.fillStyle = '#b37bff'; ctx.fillRect(x0 + 105, y + 5, 22 * P.optLeft / ARMS_T, 2.5); }
        ctx.globalAlpha = 1;
      } else if (CO && state === 'play' && (P.st === 'wreck' || P.st === 'out')) hudMeDown();
    }
    function bossBar(name, k, nph, col) {
      const x = 22, w = LW - 44, y = 69;
      txt(name, LW / 2, y - 4, 10, '#ffd6de', 'center', false, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1.5, y - 1.5, w + 3, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), 5);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x, y, w * clamp(k, 0, 1), 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      for (let i = 1; i < nph; i++) ctx.fillRect(x + w * (1 - i / nph) - 1, y - 1.5, 2, 8);
    }

    // ------------------------------------------------------------- annonces et écrans
    function envelope(t, dur) { return t < 0.18 ? t / 0.18 : t > dur - 0.4 ? Math.max(0, (dur - t) / 0.4) : 1; }
    function drawBanner() {
      if (BAN.t >= BAN.dur || !BAN.main) return;
      const a = envelope(BAN.t, BAN.dur), k = BAN.kind, cx = LW / 2;
      ctx.globalAlpha = a;
      if (k === 11) { bannerRescue(a); ctx.globalAlpha = 1; return; }
      if (k === 4) {                              // alerte : bandes rouges
        const y = LH * 0.36;
        ctx.fillStyle = 'rgba(40,0,8,0.75)'; ctx.fillRect(0, y - 34, LW, 64);
        ctx.save(); ctx.beginPath(); ctx.rect(0, y - 34, LW, 64); ctx.clip();
        ctx.fillStyle = hexA(BAN.col, 0.25);
        const off = (BAN.t * 60) % 28;
        for (let x = -40 + off; x < LW + 40; x += 28) { poly(ctx, [x, y - 34, x + 14, y - 34, x - 6, y + 30, x - 20, y + 30]); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = BAN.col; ctx.fillRect(0, y - 34, LW, 2); ctx.fillRect(0, y + 28, LW, 2);
        if (((BAN.t * 5) | 0) % 2 === 0 || BAN.t > 1.2) txt(BAN.main, cx, y - 2, 26, BAN.col, 'center', false, 5);
        txt(BAN.sub, cx, y + 20, 13, '#ffffff', 'center', false, 3);
      } else if (k === 3) {                       // titre de secteur
        const y = LH * 0.3, sl = Math.min(1, BAN.t * 3);
        ctx.fillStyle = 'rgba(2,6,14,0.55)'; ctx.fillRect(0, y - 40, LW, 96);
        ctx.fillStyle = BAN.col; ctx.fillRect(cx - 120 * sl, y - 40, 240 * sl, 2); ctx.fillRect(cx - 120 * sl, y + 54, 240 * sl, 2);
        txt(BAN.main, cx, y - 16, 14, BAN.col, 'center', false, 3);
        txt(BAN.sub.toUpperCase(), cx, y + 15, BAN.sub.length > 16 ? 22 : 27, '#ffffff', 'center', false, 5);
        if (BAN.sub2) txt(BAN.sub2, cx, y + 39, 12, '#cfe6f5', 'center', true, 3);
      } else if (k === 2) {                       // HYPER
        const s = 1 + Math.max(0, 0.4 - BAN.t) * 1.5;
        ctx.save(); ctx.translate(cx, LH * 0.42); ctx.scale(s, s);
        txt(BAN.main, 0, 0, 46, BAN.col, 'center', false, 7);
        txt(BAN.sub, 0, 26, 13, '#ffe0f4', 'center', true, 3);
        ctx.restore();
      } else if (k === 5) {
        txt(BAN.main, cx, LH * 0.3, 17, BAN.col, 'center', false, 4);
      } else if (k === 6) {                       // secteur terminé + bilan
        const y = LH * 0.3;
        ctx.fillStyle = 'rgba(2,6,14,0.6)'; ctx.fillRect(0, y - 36, LW, 70 + tally.length * 22);
        txt(BAN.main, cx, y - 6, 24, BAN.col, 'center', false, 5);
        txt(BAN.sub, cx, y + 16, 12, '#cfe6f5', 'center', true, 3);
        for (let i = 0; i < tally.length; i++) {
          const ly = y + 42 + i * 22, show = BAN.t > 0.35 + i * 0.3;
          if (!show) continue;
          txt(tally[i][0], 30, ly, 12, '#e9f0f3', 'left', true, 3);
          txt('+' + fmt(tally[i][1]), LW - 30, ly, 13, '#ffd34d', 'right', false, 3);
        }
      } else if (k === 7) {                       // saut hyperespace
        txt(BAN.main, cx, LH * 0.4, 22 + warp * 6, BAN.col, 'center', false, 5);
      } else if (k === 8) {                       // entrée du boss
        const y = LH * 0.5;
        txt(BAN.main, cx, y, BAN.main.length > 18 ? 19 : 23, '#ffffff', 'center', false, 5);
        if (BAN.sub) txt(BAN.sub, cx, y + 24, 15, '#ffe9a8', 'center', false, 4);
      } else if (k === 1) {                       // événement
        const y = 112;
        ctx.fillStyle = 'rgba(2,6,14,0.55)'; ctx.fillRect(0, y - 22, LW, 46);
        txt(BAN.main, cx, y, 18, BAN.col, 'center', false, 4);
        txt(BAN.sub, cx, y + 17, 11, '#e9f0f3', 'center', true, 3);
      } else if (k === 10) {
        txt(BAN.main, cx, LH * 0.47, 28, BAN.col, 'center', false, 6);
        txt(BAN.sub, cx, LH * 0.47 + 22, 12, '#fff3c4', 'center', true, 3);
      } else {
        const y = k === 9 ? LH * 0.4 : LH * 0.36;
        txt(BAN.main, cx, y, k === 9 ? 26 : 22, BAN.col, 'center', false, 5);
        if (BAN.sub) txt(BAN.sub, cx, y + 20, 12, '#e9f0f3', 'center', true, 3);
      }
      ctx.globalAlpha = 1;
    }
    function drawHyCue() {                       // « HYPER PRÊT ! » : grand titre bref qui file se ranger dans la jauge
      if (hyCue < 0) return;
      const t = hyCue, D = 1.2, hr = hudRight(), lx = hr - 34, ly = 54;
      const y0 = BAN.t < BAN.dur && BAN.kind === 1 ? 170 : 126;   // sous le bandeau d'un événement s'il y en a un
      const k = t < 0.6 ? 0 : ease((t - 0.6) / (D - 0.6));
      const s = (t < 0.14 ? 1.6 - 0.6 * (t / 0.14) : 1) * lerp(1, 0.3, k), a = (t < 0.07 ? t / 0.07 : 1) * (1 - 0.85 * k);
      ctx.save(); ctx.translate(lerp(LW / 2, lx, k), lerp(y0, ly, k)); ctx.scale(s, s);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * a; ctx.drawImage(GL.m, -150, -44, 300, 72); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a; txt('HYPER PRÊT !', 0, 0, 30, '#ff7ad8', 'center', false, 6);
      if (t < 0.25) { ctx.globalAlpha = a * (1 - t / 0.25); txt('HYPER PRÊT !', 0, 0, 30, '#ffffff', 'center', false, 0); }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    function drawOverlays() {
      S0();
      if ((CO ? anyHyper() : P.hyperT > 0) || hyperTint > 0.01) {
        if (!vigGrad || vigLH !== LH) { vigLH = LH; vigGrad = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.2, LW / 2, LH / 2, LH * 0.75); vigGrad.addColorStop(0, 'rgba(255,40,180,0)'); vigGrad.addColorStop(1, 'rgba(255,40,180,0.55)'); }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(hyperTint, (CO ? anyHyper() : P.hyperT > 0) ? 0.55 + 0.15 * Math.sin(rt * 8) : 0) * 0.7;
        ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, LW, LH);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (glitch > 0) {
        ctx.fillStyle = 'rgba(180,150,255,0.18)';
        for (let i = 0; i < 4; i++) ctx.fillRect(0, Math.random() * LH, LW, 1 + Math.random() * 5);
      }
      drawBanner();
      drawHyCue();
      const cx = LW / 2;
      if (state === 'load') {
        ctx.fillStyle = 'rgba(1,3,8,0.55)'; ctx.fillRect(0, 0, LW, LH);
        txt('GALAXY WARS', cx, LH * 0.4, 30, '#38e1ff', 'center', false, 5);
        ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, LH * 0.5, 14, rt * 5, rt * 5 + 4.2); ctx.stroke();
        txt('Chargement…', cx, LH * 0.5 + 38, 13, '#cfe6f5', 'center', true, 3);
      } else if (state === 'ready') {
        const ta = stT < 0.9 ? 1 : Math.max(0, 1 - (stT - 0.9) / 0.35);
        if (CO) drawReadyCoop(cx);
        else if (ta > 0) {
          ctx.globalAlpha = ta;
          ctx.globalCompositeOperation = 'lighter'; glowAt(GL.c, cx, LH * 0.36, 260, 0.35); ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = ta;
          txt('GALAXY', cx, LH * 0.34, 34, '#38e1ff', 'center', false, 6);
          txt('WARS', cx, LH * 0.34 + 34, 34, '#ff5fd2', 'center', false, 6);
          ctx.globalAlpha = 1;
        }
        const s = stT < 0.75 ? (CO ? 'PRÊTS ?' : 'PRÊT ?') : 'GO !';
        const k = stT < 0.75 ? stT / 0.75 : (stT - 0.75) / 0.5;
        const sc = 1 + (1 - Math.min(1, k * 3)) * 0.4;
        ctx.save(); ctx.translate(cx, LH * 0.55); ctx.scale(sc, sc);
        txt(s, 0, 0, s === 'GO !' ? 48 : 40, s === 'GO !' ? '#46f08a' : '#ffffff', 'center', false, 7);
        ctx.restore();
        if (stT < 0.75 && !CO) txt('Glisse le doigt, la souris ou utilise les flèches', cx, LH * 0.55 + 32, 11, '#cfe6f5', 'center', true, 3);
      }
      if (CO && (state === 'dying' || state === 'over')) drawOverCoop(cx);
      else if (state === 'dying' || state === 'over') {
        const a = clamp((stT - 0.6) / 0.6, 0, 1);
        if (a > 0) {
          ctx.globalAlpha = a;
          ctx.fillStyle = 'rgba(2,0,6,0.45)'; ctx.fillRect(0, LH * 0.36, LW, 110);
          txt('VAISSEAU DÉTRUIT', cx, LH * 0.36 + 36, 25, '#ff4d6d', 'center', false, 5);
          txt(fmt(score) + ' points', cx, LH * 0.36 + 66, 18, '#ffffff', 'center', false, 4);
          txt((deadInfo && deadInfo.cyc > 0 ? 'Cycle ' + ROMAN[Math.min(9, deadInfo.cyc)] + ' · ' : '') + 'Secteur ' + (deadInfo ? deadInfo.sec : secI + 1) + ' atteint', cx, LH * 0.36 + 90, 12, '#cfe6f5', 'center', true, 3);
          ctx.globalAlpha = 1;
        }
      }
      if (CO) drawResumeCoop(cx);
      if (paused && !CO) {
        ctx.fillStyle = 'rgba(2,5,10,0.74)'; ctx.fillRect(0, 0, LW, LH);
        txt('PAUSE', cx, LH * 0.38, 40, '#38e1ff', 'center', false, 6);
        txt('Touche pour reprendre', cx, LH * 0.38 + 30, 14, '#ffffff', 'center', true, 3);
        const lines = ['Doigt / souris : glisse pour piloter', 'Flèches, ZQSD ou WASD : piloter', 'Espace ou B : bombe', 'Maj ou H : HYPER (jauge pleine)', 'P ou Échap : pause'];
        for (let i = 0; i < lines.length; i++) txt(lines[i], cx, LH * 0.38 + 70 + i * 19, 11.5, '#a9c2d4', 'center', true, 0);
      }
    }
    // ------------------------------------------------------------- panneaux latéraux (PC paysage)
    function drawSidePanels() {
      if (colX < 150) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pw = Math.min(250, colX - 44), lx = colX - 22 - pw, rx = colX + colW + 22;
      ctx.textBaseline = 'alphabetic';
      // gauche : titre, secteur, carte des secteurs
      fontKey = '';
      ctx.font = '22px ' + FD; ctx.textAlign = 'left'; ctx.fillStyle = '#38e1ff'; ctx.fillText('GALAXY WARS', lx, 42);
      ctx.font = '600 12px ' + FB; ctx.fillStyle = '#8aa0ae'; ctx.fillText(CO ? 'À deux contre la galaxie' : 'Le Vaisseau Noir contre la galaxie', lx, 60);
      ctx.font = '13px ' + FD; ctx.fillStyle = SEC.acc;
      ctx.fillText((cycle > 0 ? 'CYCLE ' + ROMAN[Math.min(9, cycle)] + ' · ' : '') + 'SECTEUR ' + (secI + 1) + ' / 8', lx, 98);
      ctx.font = '19px ' + FD; ctx.fillStyle = '#ffffff'; ctx.fillText(SEC.name.toUpperCase(), lx, 122, pw);
      const rowH = Math.min(46, (ch - (CO ? 300 : 180)) / 8), list = !CO || rowH >= 20;   // (coop, écran bas : l'équipage à la place de la carte)
      for (let i = 0; i < 8 && list; i++) {
        const y = 150 + i * rowH, cur = i === secI, done = i < secI || cycle > 0, S = SECTORS[i];
        const ps = Math.min(30, rowH - 8);
        if (cur) { ctx.fillStyle = hexA(S.acc, 0.16); rrect(ctx, lx - 6, y - 4, pw + 6, ps + 8, 8); ctx.fill(); ctx.strokeStyle = S.acc; ctx.lineWidth = 1.2; ctx.stroke(); }
        ctx.globalAlpha = cur ? 1 : done ? 0.55 : 0.32;
        try { ctx.drawImage(planetImg(S.land), lx, y, ps, ps); } catch (e) { /* rien */ }
        ctx.font = (cur ? '13px ' : '12px ') + FD; ctx.fillStyle = cur ? '#ffffff' : '#a9c2d4';
        ctx.fillText((i + 1) + '. ' + S.name, lx + ps + 10, y + ps * 0.5 + 1, pw - ps - 30);
        if (done && !cur) { ctx.fillStyle = '#46f08a'; ctx.fillText('✓', lx + pw - 14, y + ps * 0.5 + 1); }
        ctx.globalAlpha = 1;
      }
      if (CO) drawSideCoop(lx, pw, list ? 150 + 8 * rowH + 28 : 160);
      // droite : armement et commandes
      ctx.font = '14px ' + FD; ctx.fillStyle = '#38e1ff'; ctx.fillText('ARMEMENT', rx, 42);
      const rows = [['Tir', P.power, 6, '#38e1ff', P.power > 1 ? 1 - P.pT / PDECAY : -1], ['Missiles', P.miss, 3, '#ff9a1f', P.miss ? P.missLeft / ARMS_T : -1],
        ['Drones', P.opts, 4, '#b37bff', P.opts ? P.optLeft / ARMS_T : -1], ['Bulle', P.shield, 1, '#9ff4ff', -1], ['Bombes', P.bombs, 2, '#ff4d6d', -1]];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], y = 72 + i * 30;
        ctx.font = '600 13px ' + FB; ctx.fillStyle = '#cfe6f5'; ctx.fillText(r[0], rx, y);
        for (let j = 0; j < r[2]; j++) { ctx.fillStyle = j < r[1] ? r[3] : 'rgba(255,255,255,0.1)'; rrect(ctx, rx + 78 + j * 17, y - 11, 13, 13, 3); ctx.fill(); }
        if (r[4] >= 0) { ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(rx + 78, y + 5, r[2] * 17 - 4, 3); ctx.fillStyle = r[3]; ctx.fillRect(rx + 78, y + 5, (r[2] * 17 - 4) * r[4], 3); }
      }
      const hy = 72 + 5 * 30 + 4;
      ctx.font = '600 13px ' + FB; ctx.fillStyle = '#ffb3e6'; ctx.fillText(P.hyperT > 0 ? 'HYPER EN COURS !' : P.hyper >= 1 ? 'HYPER PRÊT (Maj)' : 'Jauge HYPER', rx, hy);
      if (P.shield <= 0) { ctx.font = '600 12px ' + FB; ctx.fillStyle = '#ff8fa3'; ctx.fillText(CO ? 'Sans bulle : un coup = épave' : 'Sans bulle : un coup = détruit', rx, hy + 36); }
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(rx, hy + 8, Math.min(pw, 190), 6);
      ctx.fillStyle = '#ff3fb4'; ctx.fillRect(rx, hy + 8, Math.min(pw, 190) * (P.hyperT > 0 ? P.hyperT / 6 : P.hyper), 6);
      const help = ['Flèches / ZQSD / WASD : piloter', 'Souris : suivre ou glisser', 'Espace ou B : bombe', 'Maj ou H : HYPER', 'P ou Échap : pause'];
      ctx.font = '600 12px ' + FB; ctx.fillStyle = '#7f95a6';
      for (let i = 0; i < help.length && (!CO || ch >= 520); i++) ctx.fillText(help[i], rx, Math.max(hy + 60, ch - 200) + i * 19);
      fontKey = '';
    }


    // =================================================================== COOP : HUD à deux lignes, titres et écrans de l'équipage
    function hudBubble(x, y, r, on, col) {
      circ(ctx, x, y, r);
      if (on) { ctx.fillStyle = hexA(col, 0.3); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; circ(ctx, x - r * 0.32, y - r * 0.36, r * 0.23); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,210,0.35)'; ctx.lineWidth = 1; ctx.setLineDash(DASH); ctx.stroke(); ctx.setLineDash(NODASH); }
    }
    function hudBomb(x, y, r, on) {
      circ(ctx, x, y, r); ctx.fillStyle = on ? '#ff4d6d' : 'rgba(255,255,255,0.06)'; ctx.fill();
      ctx.strokeStyle = on ? '#ffd6de' : 'rgba(160,190,210,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      if (on) { ctx.fillStyle = '#ffd34d'; circ(ctx, x + r * 0.7, y - r * 0.9, r * 0.32); ctx.fill(); }
    }
    function hudCrew(hr) {                         // haut droite : ligne 1 = MOI (bulle + bombes), ligne 2 = le coéquipier (tête, bulle, bombes, HYPER)
      hudBubble(hr - 12, 16, 9.5, P.shield > 0 && P.alive, '#9ff4ff');
      for (let i = 0; i < 2; i++) hudBomb(hr - 30 - i * 13, 16, 5, i < P.bombs && P.alive);
      const o = other(P), y = 37, down = !o.alive, urgent = o.st === 'wreck' && o.podT < 4, blink = ((rt * 6) | 0) % 2 === 0;
      if (o.st === 'wreck') { ctx.fillStyle = hexA('#ff3b5c', urgent && blink ? 0.45 : 0.22); rrect(ctx, hr - 58, y - 10, 58, 20, 10); ctx.fill(); }
      ctx.globalAlpha = o.st === 'out' ? 0.45 : 1;
      pilotHead(o, hr - 10, y, 8, down);
      ctx.strokeStyle = o.col; ctx.lineWidth = 1.5; circ(ctx, hr - 10, y, 8.6); ctx.stroke();
      if (o.st === 'wreck') txt(String(Math.max(0, Math.ceil(o.podT))), hr - 30, y + 4.5, 12, urgent && blink ? '#ffffff' : '#ff8fa3', 'center', false, 3);
      else if (o.st === 'out') {
        ctx.strokeStyle = '#a9c2d4'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hr - 30, y, 5, -0.6, 4.2); ctx.stroke();
        ctx.fillStyle = '#a9c2d4'; poly(ctx, [hr - 30 + 5 * Math.cos(4.2) - 3, y + 5 * Math.sin(4.2), hr - 30 + 5 * Math.cos(4.2) + 3, y + 5 * Math.sin(4.2) - 1, hr - 30 + 5 * Math.cos(4.2), y + 5 * Math.sin(4.2) + 4]); ctx.fill();
      } else {
        hudBubble(hr - 27, y, 6, o.shield > 0, o.i ? '#ffd08a' : '#9ff4ff');
        for (let i = 0; i < 2; i++) hudBomb(hr - 39 - i * 8.5, y, 3.5, i < o.bombs);
        const hv = o.hyperT > 0 ? o.hyperT / 6 : o.hyper;
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(hr - 50, y + 11, 48, 2);
        if (hv > 0) { ctx.fillStyle = o.hyper >= 1 && o.hyperT <= 0 ? (((rt * 8) | 0) % 2 ? '#ffffff' : '#ff3fb4') : '#ff7ad8'; ctx.fillRect(hr - 50, y + 11, 48 * hv, 2); }
      }
      ctx.globalAlpha = 1;
    }
    function hudMeDown() {                         // en bas, quand MON vaisseau ne vole plus : ma tête triste et ce qui se passe
      const y = LH - 22, cx = LW / 2, s = P;
      ctx.fillStyle = 'rgba(2,6,14,0.62)'; rrect(ctx, cx - 92, y - 15, 184, 28, 14); ctx.fill();
      ctx.strokeStyle = hexA(s.col, 0.6); ctx.lineWidth = 1.2; ctx.stroke();
      pilotHead(s, cx - 76, y - 1, 10, true);
      ctx.strokeStyle = s.col; ctx.lineWidth = 1.4; circ(ctx, cx - 76, y - 1, 10.6); ctx.stroke();
      if (s.st === 'wreck') txt(s.rk > 0 ? 'SAUVETAGE…' : 'ÉPAVE · ' + Math.max(1, Math.ceil(s.podT)) + ' s', cx + 8, y + 4, 12, s.rk > 0 ? other(s).col : '#ff8fa3', 'center', false, 3);
      else txt('RETOUR AU PROCHAIN SAUT', cx + 8, y + 3.5, 9.5, '#cfe6f5', 'center', false, 3);
    }
    function bannerRescue(a) {                     // « SAUVETAGE ! » : les deux têtes qui sourient de chaque côté
      const y = LH * 0.4, cx = LW / 2, s = 1 + Math.max(0, 0.3 - BAN.t) * 1.2;
      ctx.save(); ctx.translate(cx, y); ctx.scale(s, s);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * a; ctx.drawImage(BAN.col === COLS[0] ? GL.c : GL.o, -150, -46, 300, 80); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      txt(BAN.main, 0, 0, 28, BAN.col, 'center', false, 6);
      if (BAN.sub) txt(BAN.sub, 0, 22, 14, '#fff3c4', 'center', false, 4);
      for (let i = 0; i < 2; i++) {
        const sh = SHIPS[i], x = (i ? 1 : -1) * 128, hy = -6 + Math.sin(rt * 6 + i * 2) * 2;
        pilotHead(sh, x, hy, 14, false);
        ctx.strokeStyle = sh.col; ctx.lineWidth = 2; circ(ctx, x, hy, 14.8); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = a;
    }
    function drawReadyCoop(cx) {                   // écran PRÊT : « GALAXY WARS À DEUX » + les deux pilotes côte à côte
      const ta = stT < 0.9 ? 1 : Math.max(0, 1 - (stT - 0.9) / 0.35);
      if (ta > 0) {
        ctx.globalAlpha = ta;
        ctx.globalCompositeOperation = 'lighter'; glowAt(GL.c, cx - 50, LH * 0.33, 230, 0.3); glowAt(GL.o, cx + 50, LH * 0.33, 230, 0.26); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = ta;
        txt('GALAXY', cx, LH * 0.25, 32, '#38e1ff', 'center', false, 6);
        txt('WARS', cx, LH * 0.25 + 32, 32, '#ff5fd2', 'center', false, 6);
        txt('À DEUX', cx, LH * 0.25 + 58, 17, '#ffa630', 'center', false, 4);
        const hy = LH * 0.25 + 100;
        for (let i = 0; i < 2; i++) {
          const s = SHIPS[i], x = cx + (i ? 46 : -46);
          pilotHead(s, x, hy, 20, false);
          ctx.strokeStyle = s.col; ctx.lineWidth = 2.5; circ(ctx, x, hy, 21); ctx.stroke();
          txt(s.name, x, hy + 38, 11, s.col, 'center', false, 3);
        }
        txt('+', cx, hy + 7, 20, '#ffffff', 'center', false, 4);
        ctx.globalAlpha = 1;
      }
    }
    function drawOverCoop(cx) {                    // ÉQUIPAGE DÉTRUIT : les deux têtes tristes
      const a = clamp((stT - 0.6) / 0.6, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const y0 = LH * 0.33;
      ctx.fillStyle = 'rgba(2,0,6,0.5)'; ctx.fillRect(0, y0, LW, 150);
      txt('ÉQUIPAGE DÉTRUIT', cx, y0 + 34, 23, '#ff4d6d', 'center', false, 5);
      for (let i = 0; i < 2; i++) {
        const s = SHIPS[i], x = cx + (i ? 36 : -36), y = y0 + 74;
        pilotHead(s, x, y, 18, true);
        ctx.strokeStyle = s.col; ctx.lineWidth = 2; circ(ctx, x, y, 18.8); ctx.stroke();
      }
      txt(fmt(score) + ' points', cx, y0 + 118, 17, '#ffffff', 'center', false, 4);
      txt((deadInfo && deadInfo.cyc > 0 ? 'Cycle ' + ROMAN[Math.min(9, deadInfo.cyc)] + ' · ' : '') + 'Secteur ' + (deadInfo ? deadInfo.sec : secI + 1) + ' atteint ensemble', cx, y0 + 140, 11.5, '#cfe6f5', 'center', true, 3);
      ctx.globalAlpha = 1;
    }
    function drawResumeCoop(cx) {                  // reprise après la pause : petit « 3, 2, 1 »
      if (resumeT <= 0) return;
      const n = Math.max(1, Math.ceil(resumeT / 0.5)), k = (resumeT % 0.5) / 0.5;
      ctx.fillStyle = 'rgba(2,5,10,0.35)'; ctx.fillRect(0, 0, LW, LH);
      ctx.save(); ctx.translate(cx, LH * 0.45); ctx.scale(1 + k * 0.4, 1 + k * 0.4);
      ctx.globalAlpha = 0.4 + 0.6 * (1 - k);
      txt(String(n), 0, 0, 54, '#ffffff', 'center', false, 7);
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function drawSideCoop(lx, pw, top) {           // PC paysage, panneau gauche : l'ÉQUIPAGE sous la carte des secteurs
      ctx.font = '14px ' + FD; ctx.textAlign = 'left'; ctx.fillStyle = '#ffa630'; ctx.fillText('ÉQUIPAGE', lx, top);
      for (let i = 0; i < 2; i++) {
        const s = SHIPS[i], y = top + 32 + i * 50, x = lx + 20;
        ctx.globalAlpha = s.st === 'out' ? 0.5 : 1;
        pilotHead(s, x, y, 18, !s.alive);
        ctx.strokeStyle = s.col; ctx.lineWidth = 2.2; circ(ctx, x, y, 19); ctx.stroke();
        ctx.textAlign = 'left'; ctx.font = '13px ' + FD; ctx.fillStyle = s.col; ctx.fillText(s.name + (s === P ? ' (toi)' : ''), lx + 48, y - 3, pw - 50);
        ctx.font = '600 12px ' + FB; ctx.fillStyle = '#cfe6f5';
        const st = s.st === 'wreck' ? 'ÉPAVE · ' + Math.max(0, Math.ceil(s.podT)) + ' s' : s.st === 'out' ? 'retour au prochain saut' : '💥 ' + s.kills + (s.rescues ? '   🛟 ' + s.rescues : '');
        ctx.fillText(st, lx + 48, y + 14, pw - 50);
        ctx.globalAlpha = 1;
      }
      fontKey = '';
    }
    // ------------------------------------------------------------- mise à jour
    function step(dt) {
      T += dt;
      if (GUEST) { guestStep(dt); return; }
      if (state === 'play') { playT += dt; early = cycle === 0 && secI === 0 && playT < 20; }
      const es = (CO ? anyHyper() : P.hyperT > 0) ? 0.5 : 1;          // HYPER : le temps ralentit autour du vaisseau
      if (state === 'play' || state === 'dying' || state === 'over') {
        if (state === 'play') updDirector(dt);
        updEvent(dt);
        updEnemies(dt * es);
        rng = B ? B.rng : null; updBoss(dt * es); rng = null;   // graine : le boss suit son propre tirage
        updEB(dt * es);
        if (NETH) netG += dt * es;
      }
      for (let i = 0; i < SHIPS.length; i++) updateShip(SHIPS[i], dt);
      if (CO) updCrew(dt);
      updShots(dt);
      updShards(dt);
      updFx(dt);
      updBg(dt);
      if (chainT > 0) {
        chainT -= dt;
        if (chainT <= 0) { if (mult > 1) { mult--; chain = MULT_AT[mult - 1]; chainT = 1.3; } else chain = 0; }
      }
      if (multPop > 0) multPop = Math.max(0, multPop - dt * 3);
    }
    let goSaid = false;
    function update(dt) {
      rt += dt;
      sndBudget = 6;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= rt) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      BAN.t += dt;
      if (shake > 0) shake = Math.max(0, shake - dt * (8 + shake * 3));
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.6);
      if (glitch > 0) glitch -= dt;
      if (hyperTint > 0 && (CO ? !anyHyper() : P.hyperT <= 0)) hyperTint = Math.max(0, hyperTint - dt * 1.4);
      if (hyGlow > 0) hyGlow = Math.max(0, hyGlow - dt * 1.6);
      if (hyCue >= 0) { hyCue += dt; if (hyCue > 1.2) hyCue = -1; }
      { const f = P.hyper >= 1 && P.hyperT <= 0; if (f && !hyFull && state === 'play' && P.alive) hyperReadyCue(); hyFull = f; }
      stT += dt;
      if (GUEST) guestStates(dt);
      else if (state === 'load') {
        if ((!loading || stT > 3) && (!NETH || netGo())) { state = 'ready'; stT = 0; SFX.ready(); }
      } else if (state === 'ready') {
        for (let i = 0; i < SHIPS.length; i++) SHIPS[i].auto = 1;
        if (stT >= 0.75 && !goSaid) { goSaid = true; SFX.go(); }
        if (stT >= 1.25) {
          state = 'play'; stT = 0; for (let i = 0; i < SHIPS.length; i++) SHIPS[i].auto = 0; dir.phase = 'intro'; dir.t = 0;
          secBanner(2.8);
        }
      } else if (state === 'dying') {
        if (stT > 0.18 && stT - dt <= 0.18) { explode(DS.x + 14, DS.y - 12, 2, 'c'); sparks(DS.x, DS.y, 20, GL.c, 260, 0.7, 9); }
        if (stT > 0.35 && stT - dt <= 0.35) { explode(DS.x - 18, DS.y - 10, 3, 'o'); SFX.boom(); }
        if (stT > 0.52 && stT - dt <= 0.52) { explode(DS.x + 6, DS.y + 16, 2, 'm'); debris(DS.x, DS.y, 10, 180); }
        if (stT > 0.7 && stT - dt <= 0.7) {
          explode(DS.x + 16, DS.y + 8, 3, 'c'); explode(DS.x, DS.y, 4, 'w');
          ring(DS.x, DS.y, 10, 260, 0.9, '#9ff4ff', 5); ring(DS.x, DS.y, 6, 150, 0.6, '#ffffff', 3);
          sparks(DS.x, DS.y, 50, GL.c, 420, 1.1, 11);
          flashA = Math.max(flashA, 0.7); flashCol = '#d8fbff'; shake = Math.max(shake, 16); SFX.big();
        }
        if (stT > 1.45 && !overSent) {
          overSent = true; state = 'over';
          try { if (typeof api.gameOver === 'function') api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ }
        }
      }
      if (freezeT > 0) { freezeT -= dt; return; }
      let k = 1;
      if (slowT > 0) { slowT -= dt; k = slowT > 0.4 ? slowK : lerp(1, slowK, Math.max(0, slowT) / 0.4); }
      const d = dt * k;
      if (d <= 0) return;
      const n = Math.max(1, Math.ceil(d / 0.0167 - 1e-6)), h = d / n;
      for (let i = 0; i < n; i++) step(h);
    }

    // ------------------------------------------------------------- rendu
    function render() {
      if (destroyed || !SPR) return;
      let sx = 0, sy = 0;
      if (shake > 0.05 && !paused) { sx = (Math.random() * 2 - 1) * shake; sy = (Math.random() * 2 - 1) * shake; }
      OXd = (colX + sx * scale) * dpr; OYd = (colY + sy * scale) * dpr;
      fontKey = '';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.textBaseline = 'alphabetic';
      drawBackground();
      ctx.save(); S0(); ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.clip();
      if (state !== 'load') drawWorld();
      ctx.restore();
      drawSideShade();
      drawSidePanels();
      ctx.save(); S0(); ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.clip();
      if (state !== 'load') drawHUD();
      drawOverlays();
      ctx.restore();
      if (flashA > 0.01) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      updateButtons();
    }
    function updateButtons() {
      if (P.bombs !== bombShown) {
        bombShown = P.bombs;
        bombBtn.innerHTML = ICON_BOMB + '<span>×' + P.bombs + '</span>';
        bombBtn.style.opacity = P.bombs > 0 ? '1' : '0.45';
      }
      const hv = Math.round((P.hyperT > 0 ? P.hyperT / 6 : P.hyper) * 40) / 40;
      if (hv !== hyperShown) { hyperShown = hv; hyperBtn.style.background = 'conic-gradient(#ff3fb4 ' + Math.round(hv * 100) + '%, rgba(255,255,255,0.16) 0)'; }
      const ready = P.hyper >= 1 && P.hyperT <= 0 && P.alive, glow = !ready && hyGlow > 0.2 && P.alive;   // halo pendant qu'on charge sur un boss
      if (ready !== hyperReadyShown || glow !== hyperGlowShown) {
        hyperReadyShown = ready; hyperGlowShown = glow;
        hyperBtn.style.animation = ready ? 'gwPulse 0.9s ease-in-out infinite' : 'none';
        hyperBtn.style.boxShadow = glow ? '0 0 0 2px rgba(255,122,216,.5),0 0 16px rgba(255,63,180,.6)' : '';
        hyperBtn.style.opacity = ready || glow ? '1' : '0.72';
      }
    }

    // ------------------------------------------------------------- boucle et qualité adaptative
    let last = 0, prevReal = 0, perfSum = 0, perfN = 0, adaptive = true, pausedFrames = 0, profU = 0, profR = 0;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) { if ((pausedFrames++ % 12) === 0) render(); return; }
      if (CO && resumeT > 0) { resumeT -= dt; render(); return; }   // « 3, 2, 1 » après la pause commune
      if (onFrame) { try { onFrame(dt); } catch (e) { /* rien */ } }
      const t0 = performance.now();
      update(dt);
      if (NETH) netHostFrame();
      const t1 = performance.now();
      render();
      const r = performance.now();
      profU += (t1 - t0 - profU) * 0.05; profR += (r - t1 - profR) * 0.05;
      if (prevReal && adaptive && !document.hidden && state === 'play') {
        const iv = r - prevReal;
        if (iv < 100) { perfSum += iv; perfN++; }
        if (perfN >= 150) {
          if (perfSum / perfN > 22 && quality > 0.6) { quality = Math.max(0.6, quality - 0.2); ptCap = Math.max(300, ptCap - 100); resize(); }
          perfSum = 0; perfN = 0;
        }
      }
      prevReal = r;
      if (state === 'over' && stT > 5) { cancelAnimationFrame(raf); raf = 0; }
    }

    // ------------------------------------------------------------- pause et entrées
    function setPaused(p) {
      if (state === 'over') p = false;
      paused = p;
      keys.l = keys.r = keys.u = keys.d = false;
      drag = null; dragDX = dragDY = 0; mouseTX = -1;
      pauseBtn.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
      pauseBtn.setAttribute('aria-label', paused ? 'Reprendre' : 'Pause');
      last = 0; prevReal = 0; pausedFrames = 0;
      render();
    }
    function isTyping(e) { const t = e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null || isTyping(e)) return;
      const k = e.key, c = e.code;
      const active = state !== 'over' && state !== 'dying';
      if (k === 'p' || k === 'P' || k === 'Escape') { if (active) { if (CO) coopPauseReq(); else setPaused(!paused); e.preventDefault(); } return; }
      const arrowOrSpace = k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' || k === ' ' || k === 'Spacebar' || c === 'Space';
      if (paused) { if (!CO && (k === ' ' || k === 'Enter')) { setPaused(false); e.preventDefault(); } return; }
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') keys.l = true;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.r = true;
      else if (k === 'ArrowUp' || k === 'z' || k === 'Z' || k === 'w' || k === 'W') keys.u = true;
      else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.d = true;
      else if (k === ' ' || k === 'Spacebar' || c === 'Space' || k === 'b' || k === 'B') { if (!e.repeat) useBomb(P); }
      else if (k === 'Shift' || k === 'h' || k === 'H') useHyper(P);
      if (arrowOrSpace && active) e.preventDefault();
    }
    function onKeyUp(e) {
      if (destroyed) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') keys.l = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.r = false;
      else if (k === 'ArrowUp' || k === 'z' || k === 'Z' || k === 'w' || k === 'W') keys.u = false;
      else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.d = false;
    }
    let drag = null;
    function onPointerDown(e) {
      if (destroyed) return;
      e.preventDefault();
      if (paused) { if (!CO) setPaused(false); return; }
      if (state === 'over' || state === 'dying') return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' };
      mouseTX = -1;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    }
    function onPointerMove(e) {
      if (destroyed) return;
      if (drag && e.pointerId === drag.id) {
        e.preventDefault();
        if (paused || state === 'over' || state === 'dying') return;
        const sens = drag.mouse ? 1 : 1.3;      // le vaisseau suit le glissé (relatif) : le doigt ne le cache jamais
        dragDX += ((e.clientX - drag.x) / scale) * sens; dragDY += ((e.clientY - drag.y) / scale) * sens;
        drag.x = e.clientX; drag.y = e.clientY;
        return;
      }
      if (e.pointerType === 'mouse' && !paused && state !== 'over' && state !== 'dying') {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left - colX) / scale, y = (e.clientY - r.top - colY) / scale;
        if (x < -30 || x > LW + 30 || y < 0 || y > LH) { mouseTX = -1; return; }
        mouseTX = x; mouseTY = y;
      }
    }
    function onPointerUp(e) { if (drag && e.pointerId === drag.id) drag = null; }
    function prevent(e) { e.preventDefault(); }
    function onBlur() { keys.l = keys.r = keys.u = keys.d = false; drag = null; mouseTX = -1; }
    function onVis() { if (document.hidden && state !== 'over') setPaused(true); }
    function btn(fn) {
      return (e) => {
        e.preventDefault(); e.stopPropagation();
        if (paused) { if (!CO) setPaused(false); return; }
        fn();
      };
    }
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(window, 'blur', onBlur);
    if (!CO) on(document, 'visibilitychange', onVis);   // en coop, c'est la bibliothèque qui met la pause (les deux appareils)
    on(canvas, 'pointerdown', onPointerDown);
    on(canvas, 'pointermove', onPointerMove);
    on(canvas, 'pointerup', onPointerUp);
    on(canvas, 'pointercancel', onPointerUp);
    on(canvas, 'lostpointercapture', onPointerUp);
    on(canvas, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) mouseTX = -1; });
    on(canvas, 'contextmenu', prevent);
    on(bombBtn, 'pointerdown', btn(() => useBomb(P)));
    on(hyperBtn, 'pointerdown', btn(() => useHyper(P)));
    on(bombBtn, 'contextmenu', prevent);
    on(hyperBtn, 'contextmenu', prevent);
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (state !== 'over') { if (CO) coopPauseReq(); else setPaused(!paused); } });

    function assetsChanged() {
      nebKey = ''; buildNeb(); plCache.clear();
      if (B && B.kind === 'planete' && !B.head) B.img = planetImg(20);
    }


    // =================================================================== COOP EN LIGNE (api.coop.net) : l'hôte décide, l'invité prédit son vaisseau
    // Hôte (P0) : toute la simulation ; il reçoit la position de l'invité (~60/s) et fait tirer son vaisseau ; il diffuse un instantané
    // ~25 fois par seconde (« s » : vaisseaux, ennemis visibles, capsules, trou noir, boss) et, en fiable, un lot d'événements par image
    // (« e » : naissances de balles et d'ennemis, morts, explosions, textes, bandeaux, sons, équipage…). Chaque appareil décide des coups
    // reçus par SON vaisseau (permis par le contrat) : l'invité envoie « hurt », l'hôte ne le met pas en doute.
    // Invité (P1) : un « théâtre » à l'heure de l'hôte moins ~0,1 s (interpolation) ; les balles vivent chez lui depuis leur naissance
    // (déterministes, au temps de jeu G de l'hôte) ; son vaisseau répond au doigt tout de suite ; tirs, éclats, particules : cosmétiques.
    // Messages courts (unités du terrain ×2 ou ×4, entiers) ; jamais dans le canal rapide ce qui doit arriver.
    const NQ = (v) => Math.round(v * 2);           // positions en demi-pixels
    const GLK = [];                                // lueurs ⇄ clés (pour les étincelles)
    for (const k in GL) GLK.push([GL[k], k]);
    function glKey(g) { for (let i = 0; i < GLK.length; i++) if (GLK[i][0] === g) return GLK[i][1]; return g === FIRE ? 'F' : g === SMOKE ? 'S' : 'w'; }
    function glOf(k) { return k === 'F' ? FIRE : k === 'S' ? SMOKE : GL[k] || GL.w; }
    const NET = { sent: 0, bytes: 0, recv: 0, lost: 0, snaps: 0, ev: 0, resync: 0, late: 0, hurts: 0, start: 0, goAt: 0, ready: false, rdyT: 0, helloT: 0, waitT: 0, I: 0.1, jit: 0, lh: 0 };
    let netMute = 0, netDepth = 0, EVQ = [], snapT = 0, bListT = 0, flLast = 0, netDestroyed = false;
    function nnow() { try { const v = Number(NETC.now()); if (isFinite(v)) return v; } catch (e) { /* rien */ } return performance.now(); }
    function nsend(m, rel) {
      if (destroyed || !NETC) return;
      try { NETC.send(m, { reliable: !!rel }); NET.sent++; NET.bytes += JSON.stringify(m).length; } catch (e) { /* rien */ }
    }
    function netEvt(ev) { if (NETH && netMute === 0) EVQ.push(ev); }
    function muted(fn) { netMute++; try { fn(); } finally { netMute--; } }
    // ---------------------------------------------------------------- HÔTE
    function netBorn(b) { EVQ.push(['b', b, b.id]); }          // (les champs sont lus à la fin de l'image : réglages faits après eb())
    function netNewEnemy(e) { EVQ.push(['n', e, e.uid]); }
    function netKill(e) { EVQ.push(['k', e.uid]); }
    function netBoss() {
      if (!B) return;
      const k = B.kind, pi = k === 'planete' && B.img && IMGP ? IMGP.indexOf(B.img) : -1;
      EVQ.push(['B', k, B.head ? B.head.name || '' : '', B.head2 ? B.head2.name || '' : '', pi, B.nph]);
    }
    function netBolt(b) { EVQ.push(['L', NQ(b.x), b.warn, b.dur, Math.round(b.seed)]); }
    function netGate(g) { EVQ.push(['G', g.gaps.map(NQ)]); }
    function netBeam(bm) {
      let ow = 0, oi = -1;
      const o = bm.owner;
      if (o && B && B.parts.indexOf(o) >= 0) { ow = 2; oi = B.parts.indexOf(o); } else if (o && o.type) { ow = 1; oi = o.uid; }
      EVQ.push(['M', ow, oi, Math.round(bm.ang * 1000), bm.warn, bm.dur, bm.w, bm.col, bm.ox, bm.oy, bm.track ? 1 : 0, Math.round((bm.spin || 0) * 1000)]);
    }
    if (NETH) {                                    // les effets de l'hôte partent aussi chez l'invité (un seul niveau : pas les effets internes)
      const wrap = (fn, enc) => function () {
        const a = arguments;
        if (netMute === 0 && netDepth === 0) EVQ.push(enc(a));
        netDepth++;
        try { return fn.apply(null, a); } finally { netDepth--; }
      };
      explode = wrap(explode, (a) => ['E', NQ(a[0]), NQ(a[1]), a[2], a[3] || 'o']);
      ring = wrap(ring, (a) => ['R', NQ(a[0]), NQ(a[1]), Math.round(a[2]), Math.round(a[3]), Math.round(a[4] * 100), a[5], a[6]]);
      sparks = wrap(sparks, (a) => ['K', NQ(a[0]), NQ(a[1]), a[2], glKey(a[3]), Math.round(a[4]), Math.round(a[5] * 100), a[6]]);
      debris = wrap(debris, (a) => ['D', NQ(a[0]), NQ(a[1]), a[2], Math.round(a[3])]);
      ftext = wrap(ftext, (a) => ['T', NQ(a[0]), NQ(a[1]), String(a[2]), a[3], a[4], Math.round(a[5] * 100), a[6] == null ? null : Math.round(a[6]), a[7] || 0]);
      banner = wrap(banner, (a) => ['N', a[0], a[1] || '', a[2] || '#fff', a[3] || 2, a[4] || 0, a[5] || '']);
      addFace = wrap(addFace, (a) => ['A', a[0] && a[0].name ? a[0].name : '', NQ(a[1]), NQ(a[2]), a[3] || '', a[4] || 0]);
      light = wrap(light, (a) => ['l', NQ(a[0]), NQ(a[1]), Math.round(a[2]), Math.round(a[3] * 100)]);
      shards = wrap(shards, (a) => ['H', NQ(a[0]), NQ(a[1]), a[2], HITBY]);
      music = wrap(music, (a) => ['m', a[0] || '']);
      addBeam = ((f) => function () { const bm = f.apply(null, arguments); if (netMute === 0) netBeam(bm); return bm; })(addBeam);
      for (const k in SFX) {
        if (k === 'shot' || k === 'shard') continue;   // (l'invité fait ses tirs et ses éclats lui-même)
        const f = SFX[k];
        SFX[k] = function (x) { if (netMute === 0 && netDepth === 0) EVQ.push(['S', k, x === undefined ? null : x]); netDepth++; try { f(x); } finally { netDepth--; } };
      }
    }
    function netMove(s, dt) {                      // le vaisseau de l'AUTRE appareil
      if (GUEST) { guestShip0(s, dt); return; }
      if (s.rx == null) return;                    // (hôte) la position annoncée par l'invité, bornée au terrain
      s.x = clamp(s.rx, 14, LW - 14); s.y = clamp(s.ry, 66, LH - 26);
    }
    function netGo() {                             // (hôte) départ commun : « go » à now() + 1,5 s quand l'invité est prêt
      const now = nnow();
      if (!NET.goAt) {
        if (!NET.ready) { if (!NET.waitT) NET.waitT = now; if (now - NET.waitT > 20000) netAbort('Ton copain ne répond pas'); return false; }
        NET.goAt = now + 1500;
        nsend({ t: 'go', at: NET.goAt, lh: Math.round(LH) }, true);
      }
      return now >= NET.goAt - 1250;
    }
    function netAbort(msg) { if (NET.aborted) return; NET.aborted = true; try { if (CO && typeof CO.abort === 'function') CO.abort(msg); } catch (e) { /* rien */ } }
    function packShips() {
      const a = [];
      for (let i = 0; i < SHIPS.length; i++) {
        const s = SHIPS[i], st = s.st === 'fly' ? 0 : s.st === 'wreck' ? 1 : s.st === 'out' ? 2 : 3;
        a.push(NQ(s.x), NQ(s.y), Math.round(s.bank * 100), (s.alive ? 1 : 0) | (s.shield > 0 ? 2 : 0) | (s.auto > 0 ? 4 : 0) | (s.magT > 0 ? 8 : 0) | (s.hitFlash > 0 ? 16 : 0),
          s.power, s.miss, s.opts, s.bombs, Math.round(s.hyper * 1000), Math.round(s.hyperT * 100), Math.round(s.inv * 100), st, NQ(s.podX), NQ(s.podY),
          Math.round(s.podT * 10), Math.round(s.rk * 100), s.kills, s.rescues, Math.round(s.missLeft * 10), Math.round(s.optLeft * 10), Math.round(s.pT * 10), s.helpT > 0 ? 1 : 0);
      }
      return a;
    }
    const SHN = 22;                                // nombres par vaisseau dans l'instantané
    const BK = ['planete', 'vela', 'ver', 'reine', 'gaia', 'jumelles', 'oeil', 'blanc'];
    function partAux(k, p) { return k === 'vela' ? p.aim : k === 'gaia' ? p.a : k === 'ver' ? p.ang || 0 : k === 'planete' ? (p.depth || 0) : 0; }
    function packBoss() {
      const b = B, k = b.kind, ex = k === 'planete' ? [b.mouth, b.a, b.rad] : k === 'vela' ? [b.open, b.left, 0] : k === 'ver' ? [b.mode, NQ(b.warnX), b.ang] : k === 'reine' ? [b.flap, b.wo, 0]
        : k === 'gaia' ? [b.rot, b.open, b.left] : k === 'jumelles' ? [b.rr, b.rage ? 1 : 0, b.orb] : k === 'oeil' ? [b.a, b.open, 0] : [b.bank, b.dash > 0 ? 1 : 0, b.a];
      const a = [BK.indexOf(k), b.parts.length, Math.round(b.t * 100), NQ(b.x), NQ(b.y), b.phase, Math.round(b.hp), Math.round(b.maxHp), (b.ready ? 1 : 0) | (b.dying ? 2 : 0) | (b.flash > 0 ? 4 : 0) | (b.deployed ? 8 : 0),
        Math.round(ex[0] * 1000), Math.round(ex[1] * 1000), Math.round(ex[2] * 1000), Math.round(b.rage * 100)];
      for (let i = 0; i < b.parts.length; i++) {
        const p = b.parts[i], md = p.mode === 'block' ? 0 : p.mode === 'core' ? 1 : p.mode === 'sub' ? 2 : 3;
        a.push(NQ(p.x), NQ(p.y), (p.alive ? 1 : 0) | (p.hide ? 2 : 0) | (p.flash > 0 ? 4 : 0) | (md << 3) | (p.dash ? 32 : 0) | (p.wk > 0.05 ? 64 : 0), Math.round(partAux(k, p) * 1000));
      }
      return a;
    }
    function netHostFrame() {                      // (hôte) une fois par image : naissances + événements (fiable), instantané (rapide)
      if (!NET.goAt) return;
      const now = nnow();
      // flash d'écran « commun » (bombe, boss, saut…) : jamais celui de MON vaisseau touché
      if (flashA > flLast + 0.04 && !flashOwn) EVQ.push(['F', Math.round(flashA * 100), flashCol, Math.round(shake)]);
      flLast = flashA; flashOwn = false;
      if (EVQ.length) {
        const v = [];
        for (let i = 0; i < EVQ.length; i++) {
          const q = EVQ[i];
          if (q[0] === 'b') { const b = q[1]; if (b.id !== q[2]) continue; v.push(['b', b.id, Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.vx * 10), Math.round(b.vy * 10), b.col, b.sz, Math.round(b.acc * 10), Math.round(b.turn * 1000), Math.round(b.delay * 1000), Math.round(b.life * 100), Math.round(b.t * 1000)]); }
          else if (q[0] === 'n') { const e = q[1]; if (e.uid !== q[2]) continue; v.push(['n', e.uid, e.type, e.head ? e.head.name || '' : '', Math.round(e.hue), e.rich ? 1 : 0, e.seed | 0, e.var | 0, e.mini ? 1 : 0, e.lead ? e.lead.uid : 0, e.seg | 0, Math.round(e.r), Math.round(e.vr * 100), Math.round(e.ang * 100), Math.round(e.max)]); }
          else v.push(q);
        }
        EVQ = [];
        if (v.length) { nsend({ t: 'e', g: Math.round(netG * 1000), v }, true); NET.ev += v.length; }
      }
      // liste des balles vivantes, une fois par seconde (l'invité retire ses balles fantômes)
      if (now - bListT > 1000) { bListT = now; let ids = ''; for (let i = 0; i < ebN; i++) ids += EB[i].id.toString(36) + ','; nsend({ t: 'bl', g: Math.round(netG * 1000), ids }, true); }
      // instantané : 25 / s (20 / s s'il est gros)
      if (now - snapT < (NET.big ? 50 : 40)) return;
      snapT = now;
      const e = [], ea = [];
      for (let i = 0; i < enN; i++) {
        const q = EN[i];
        if (!q.alive || q.delay > 0) continue;
        e.push(q.uid, NQ(q.x), NQ(q.y));
        const fl = q.flash > 0 ? 1 : 0;
        if (q.type === 'dart' || q.type === 'cruiser' || q.type === 'mine' || q.type === 'stealth' || q.type === 'gardien' || q.type === 'frigate' || fl) {
          ea.push(q.uid, Math.round((q.type === 'cruiser' ? q.ang : q.aim) * 100), fl | ((q.k & 3) << 1) | (Math.round(clamp(q.cloak, 0, 1) * 10) << 3) | ((q.type === 'gardien' ? Math.round(100 * q.hp / Math.max(1, q.max)) : 0) << 7), q.type === 'mine' ? Math.round(q.st2 * 100) : Math.round(q.t * 10));
        }
      }
      const c = [];
      for (let i = 0; i < cpN; i++) { const q = CP[i]; c.push(q.id, NQ(q.x), NQ(q.y), q.k, q.pm, Math.round(q.pmT * 10)); }
      const ph = dir.phase;
      const m = { t: 's', T: Math.round(now), G: Math.round(netG * 1000), st: state, sc: Math.floor(score), m: mult, ct: Math.round(chainT * 10), ph, w: dir.wave, nW: dir.nW, sec: secI, cyc: cycle,
        wp: Math.round(warp * 1000), sv: Math.round(scrollV), dk: darkOn ? 1 : 0, lh: Math.round(LH), pt: Math.round(playT), k: kills, sh: packShips(), e, ea, c,
        h: hole ? [NQ(hole.x), NQ(hole.y), Math.round(hole.k * 100), hole.boss ? 1 : 0] : 0, bo: B ? packBoss() : 0, mi: miniRef && miniRef.alive ? miniRef.uid : 0,
        di: deadInfo ? [deadInfo.sec, deadInfo.cyc] : 0, ds: DS.i };
      const before = NET.bytes;
      nsend(m, false);
      NET.snaps++;
      NET.big = NET.bytes - before > 1100;
    }
    function netHostMsg(m) {
      if (!m || typeof m !== 'object') return;
      const g = SHIPS[1];
      if (m.t === 'i') { if (typeof m.x === 'number' && typeof m.y === 'number') { g.rx = m.x / 4; g.ry = m.y / 4; } }
      else if (m.t === 'rdy') { NET.ready = true; if (NET.goAt) nsend({ t: 'go', at: NET.goAt, lh: Math.round(LH) }, true); }
      else if (m.t === 'hurt') {
        NET.hurts++;
        if (m.b) for (let i = ebN - 1; i >= 0; i--) if (EB[i].id === m.b) { swapOut(EB, i, ebN); ebN--; break; }
        hurtShip(g, true);
      }
      else if (m.t === 'bomb') useBomb(g);
      else if (m.t === 'hyper') useHyper(g);
      else if (m.t === 'full') netFull();
    }
    function netFull() {                           // (hôte) toutes les balles d'un coup (reprise après la pause, écart persistant)
      const v = [];
      for (let i = 0; i < ebN; i++) { const b = EB[i]; v.push(['b', b.id, Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.vx * 10), Math.round(b.vy * 10), b.col, b.sz, Math.round(b.acc * 10), Math.round(b.turn * 1000), Math.round(b.delay * 1000), Math.round(b.life * 100), Math.round(b.t * 1000)]); }
      nsend({ t: 'e', g: Math.round(netG * 1000), full: 1, v }, true);
      NET.resync++;
    }
    function netResync() { if (GUEST) { GQ.length = 0; nsend({ t: 'full' }, true); } else if (NETH) netFull(); }
    // ---------------------------------------------------------------- INVITÉ
    const SNAP = [], GQ = [];                      // instantanés reçus (8 au plus) ; lots d'événements en attente (à l'heure de jeu affichée)
    const MIR = new Map(), CPM = new Map();         // ennemis et capsules de l'hôte (uid → objet du jeu)
    let Gd = 0, GdPrev = -1, guestT0 = 0, pred = { bombs: 0, bombsT: 0, inv: 0, wreckT: 0, hyT: 0 }, lastSentI = 0, gBlist = null;
    function guestStates(dt) {                      // l'état du jeu suit l'hôte ; départ commun à « go »
      const now = nnow();
      if (state === 'load') {
        if (!NET.goAt) {
          if (!NET.helloT || now - NET.helloT > 500) { NET.helloT = now; nsend({ t: 'rdy' }, true); }
          if (!NET.waitT) NET.waitT = now;
          if (now - NET.waitT > 20000) netAbort("La partie n'a pas pu démarrer");
          return;
        }
        if (now >= NET.goAt - 1250) { state = 'ready'; stT = (now - (NET.goAt - 1250)) / 1000; SFX.ready(); }
        return;
      }
      if (state === 'ready') {
        for (let i = 0; i < SHIPS.length; i++) SHIPS[i].auto = 1;
        if (stT >= 0.75 && !goSaid) { goSaid = true; SFX.go(); }
        if (now >= NET.goAt) { state = 'play'; stT = 0; for (let i = 0; i < SHIPS.length; i++) SHIPS[i].auto = 0; }
        return;
      }
      const s = SNAP.length ? SNAP[SNAP.length - 1] : null;
      if (s && (s.st === 'dying' || s.st === 'over') && state === 'play') {
        state = 'dying'; stT = 0; DS = SHIPS[s.ds] || P; if (s.di) deadInfo = { sec: s.di[0], cyc: s.di[1] };
      }
      if (state === 'dying' && stT > 1.45) state = 'over';
    }
    function sAt(td) {                             // les deux instantanés qui encadrent l'heure affichée
      let a = null, b = null;
      for (let i = SNAP.length - 1; i >= 0; i--) { if (SNAP[i].T <= td) { a = SNAP[i]; b = SNAP[i + 1] || null; break; } }
      if (!a) { a = SNAP[0]; b = SNAP[1] || null; }
      let k = 0;
      if (a && b && b.T > a.T) k = clamp((td - a.T) / (b.T - a.T), 0, 1);
      return { a, b: b || a, k };
    }
    function lerpA(a, b, k) { return a + angDiff(a, b) * k; }
    function guestWorld(dt) {
      if (!SNAP.length) return;
      const now = nnow(), td = now - NET.I * 1000, sp = sAt(td), a = sp.a, b = sp.b, k = sp.k;
      const gNew = (a.G + (b.G - a.G) * k) / 1000;
      if (GdPrev < 0) GdPrev = gNew;
      Gd = Math.max(GdPrev, gNew);
      // lots d'événements dont l'heure est venue
      while (GQ.length && GQ[0].g / 1000 <= Gd + 1e-6) { const q = GQ.shift(); try { guestEvents(q); } catch (e) { NET.err = (NET.err || 0) + 1; } }
      // le monde à l'heure affichée
      guestApply(a, b, k);
      // balles (et rayons) : au temps de jeu de l'hôte
      let dG = Gd - GdPrev;
      GdPrev = Gd;
      if (dG > 0.5) dG = 0.5;
      const n = Math.max(1, Math.ceil(dG / 0.0167 - 1e-6)), h = dG / n;
      if (dG > 0) for (let i = 0; i < n; i++) updEB(h);
      guestEventsUpd(dG);
      guestHits();
    }
    function guestApply(a, b, k) {
      const L2 = (i, arrA, arrB) => (arrA[i] + (arrB[i] - arrA[i]) * k) / 2;
      // état général : le plus récent
      score = b.sc; if (b.m > mult) { multPop = 1; tone(500 + b.m * 80, 0.12, 'triangle', 0.035, 700 + b.m * 90); } mult = b.m; chainT = b.ct / 10;
      dir.phase = b.ph; dir.wave = b.w; dir.nW = b.nW; kills = b.k; playT = b.pt;
      if (b.sec !== secI || b.cyc !== cycle) { secI = b.sec; cycle = b.cyc; SEC = SECTORS[secI]; secHue = (SEC.hue + cycle * 41) % 360; L = secI + 8 * cycle; bgDirty = true; newSectorBg(); fetchHeads(); }
      warp = (a.wp + (b.wp - a.wp) * k) / 1000; scrollV = a.sv + (b.sv - a.sv) * k; darkOn = !!b.dk;
      if (b.lh && Math.abs(b.lh - LH) > 0.5) { NET.lh = b.lh; resize(); }
      // vaisseaux : statistiques de l'hôte ; position interpolée pour le sien (le mien colle à mon doigt)
      for (let i = 0; i < SHIPS.length; i++) {
        const s = SHIPS[i], o = i * SHN, A2 = a.sh, B2 = b.sh, st = ['fly', 'wreck', 'out', 'dead'][B2[o + 11]] || 'fly', fl = B2[o + 3];
        const wasSt = s.st;
        s.power = B2[o + 4]; s.miss = B2[o + 5]; s.opts = B2[o + 6]; s.hyper = B2[o + 8] / 1000; s.kills = B2[o + 16]; s.rescues = B2[o + 17];
        s.missLeft = B2[o + 18] / 10; s.optLeft = B2[o + 19] / 10; s.pT = B2[o + 20] / 10; s.helpT = B2[o + 21] ? 0.3 : 0;
        s.magT = fl & 8 ? 1 : 0; s.auto = fl & 4 ? 1 : 0;
        s.podX = L2(o + 12, A2, B2); s.podY = L2(o + 13, A2, B2); s.podT = B2[o + 14] / 10; s.rk = B2[o + 15] / 100;
        if (s === P) {
          const now = nnow();
          s.bombs = now < pred.bombsT ? Math.min(pred.bombs, B2[o + 7]) : B2[o + 7];
          s.hyperT = now < pred.hyT ? Math.max(s.hyperT, B2[o + 9] / 100) : B2[o + 9] / 100;
          s.inv = Math.max(B2[o + 10] / 100, now < pred.inv ? (pred.inv - now) / 1000 : 0);
          const hs0 = s.hostSt; s.hostSt = st;
          if (now < pred.wreckT && st === 'fly') { /* épave prédite : on attend la confirmation de l'hôte */ }
          else {
            if (st === 'fly' && hs0 && hs0 !== 'fly') {                   // sauvé (sur l'épave) ou revenu au saut (en formation)
              if (hs0 === 'wreck') { s.x = s.podX; s.y = s.podY; } else { s.x = autoX(s); s.y = LH + 40; }
              s.trailN = 0; s.nameT = 2.4;
            }
            s.st = st; s.alive = st === 'fly' && !!(fl & 1);
            s.shield = now < pred.inv ? Math.min(s.shield, fl & 2 ? 1 : 0) : fl & 2 ? 1 : 0;
          }
          if (!s.alive && st !== 'fly') { s.x = s.podX; s.y = s.podY; }
        } else {
          s.bombs = B2[o + 7]; s.hyperT = B2[o + 9] / 100; s.inv = B2[o + 10] / 100; s.shield = fl & 2 ? 1 : 0; s.hitFlash = fl & 16 ? 1 : 0;
          if (st === 'fly' && wasSt && wasSt !== 'fly') { s.trailN = 0; s.nameT = 2.4; }
          s.st = st; s.alive = st === 'fly' && !!(fl & 1);
          s.nx = L2(o, A2, B2); s.ny = L2(o + 1, A2, B2); s.nbank = (A2[o + 2] + (B2[o + 2] - A2[o + 2]) * k) / 100;
          if (!s.alive) { s.x = st === 'fly' ? s.nx : s.podX; s.y = st === 'fly' ? s.ny : s.podY; }
        }
      }
      // ennemis : positions interpolées (ceux qui ne sont plus dans l'instantané : partis)
      const ma = a.map, mb = b.map;
      for (let i = 0; i < enN; i++) {
        const e = EN[i];
        if (!e.alive || !e.nid) continue;
        const ib = mb.get(e.nid);
        if (ib === undefined) { if (e.placed ? b.T - e.seenT > 450 : b.T - e.bornT > 16000) e.alive = false; continue; }   // (né en attente chez l'hôte : patience)
        e.seenT = b.T;
        const ia = ma.get(e.nid), xb = b.e[ib + 1] / 2, yb = b.e[ib + 2] / 2;
        const xa = ia === undefined ? xb : a.e[ia + 1] / 2, ya = ia === undefined ? yb : a.e[ia + 2] / 2;
        const nx = xa + (xb - xa) * k, ny = ya + (yb - ya) * k;
        e.vx = (nx - e.x) / Math.max(1 / 120, NET.fdt || 1 / 60); e.vy = (ny - e.y) / Math.max(1 / 120, NET.fdt || 1 / 60);
        if (!e.placed) { e.vx = 0; e.vy = 0; e.placed = true; }
        e.x = nx; e.y = ny; e.entered = true; e.delay = 0; e.t += NET.fdt || 0;
        if (e.flash > 0) e.flash -= NET.fdt || 0;
        if (e.vr) e.ang += e.vr * (NET.fdt || 0);
        const xb2 = b.amap.get(e.nid);
        if (xb2 !== undefined) {
          const v = b.ea[xb2 + 2], ang = b.ea[xb2 + 1] / 100;
          e.flash = v & 1 ? 0.06 : e.flash; e.k = (v >> 1) & 3; e.cloak = ((v >> 3) & 15) / 10;
          if (e.type === 'cruiser') e.ang = ang; else e.aim = ang;
          if (e.type === 'gardien') e.hp = e.max * ((v >> 7) / 100);
          if (e.type === 'mine') e.st2 = b.ea[xb2 + 3] / 100; else e.t = Math.max(e.t, b.ea[xb2 + 3] / 10);
        }
      }
      for (let i = enN - 1; i >= 0; i--) if (!EN[i].alive) { if (EN[i].nid) MIR.delete(EN[i].nid); swapOut(EN, i, enN); enN--; }
      miniRef = b.mi ? MIR.get(b.mi) || null : null;
      // capsules
      const seen = new Set();
      for (let j = 0; j < b.c.length; j += 6) {
        const id = b.c[j];
        seen.add(id);
        let c = CPM.get(id);
        if (!c) { if (cpN >= MAXCP) continue; c = CP[cpN++]; c.id = id; c.t = 0; c.vx = 0; c.vy = 0; CPM.set(id, c); }
        let xa = b.c[j + 1] / 2, ya = b.c[j + 2] / 2;
        for (let q = 0; q < a.c.length; q += 6) if (a.c[q] === id) { xa = a.c[q + 1] / 2 + (xa - a.c[q + 1] / 2) * k; ya = a.c[q + 2] / 2 + (ya - a.c[q + 2] / 2) * k; break; }
        c.x = xa; c.y = ya; c.k = b.c[j + 3]; c.pm = b.c[j + 4]; c.pmT = b.c[j + 5] / 10;
      }
      for (let i = cpN - 1; i >= 0; i--) if (!seen.has(CP[i].id)) { CPM.delete(CP[i].id); swapOut(CP, i, cpN); cpN--; }
      // trou noir
      if (b.h) { if (!hole) hole = { x: 0, y: 0, k: 0, t: 0, leaving: false, boss: false }; hole.x = L2(0, a.h || b.h, b.h); hole.y = L2(1, a.h || b.h, b.h); hole.k = b.h[2] / 100; hole.boss = !!b.h[3]; hole.t += NET.fdt || 0; }
      else hole = null;
      // boss
      if (b.bo && B && BK[b.bo[0]] === B.kind) guestBoss(a.bo && a.bo[0] === b.bo[0] && a.bo[1] === b.bo[1] ? a.bo : b.bo, b.bo, k);
      else if (!b.bo && B) B = null;
    }
    function guestBoss(A2, B2, k) {
      const b = B, kd = b.kind, L = (i) => A2[i] + (B2[i] - A2[i]) * k;
      b.t = L(2) / 100; b.x = L(3) / 2; b.y = L(4) / 2; b.phase = B2[5]; b.hp = B2[6]; b.maxHp = B2[7];
      const f = B2[8]; b.ready = !!(f & 1); b.dying = !!(f & 2); b.flash = f & 4 ? 0.06 : 0; b.deployed = !!(f & 8); b.rage = B2[12] / 100;
      const e0 = L(9) / 1000, e1 = B2[10] / 1000, e2 = L(11) / 1000, a0 = lerpA(A2[9] / 1000, B2[9] / 1000, k), a2 = lerpA(A2[11] / 1000, B2[11] / 1000, k);
      if (kd === 'planete') { b.mouth = e0; b.a = e1; b.rad = e2; }
      else if (kd === 'vela') { b.open = e0; b.left = B2[10] / 1000; }
      else if (kd === 'ver') { b.mode = Math.round(B2[9] / 1000); b.warnX = B2[10] / 2000; b.ang = a2; }
      else if (kd === 'reine') { b.flap = e0; b.wo = e1; }
      else if (kd === 'gaia') { b.rot = a0; b.open = e1; }
      else if (kd === 'jumelles') { b.rr = e0; b.rage = !!Math.round(e1); b.orb = e2; }
      else if (kd === 'oeil') { b.a = a0; b.open = e1; }
      else {
        b.bank = e0; const d = Math.round(e1);
        for (let i = b.ghosts.length - 1; i >= 0; i--) { b.ghosts[i].t -= NET.fdt || 0; if (b.ghosts[i].t <= 0) b.ghosts.splice(i, 1); }
        if (d && b.ghosts.length < 6 && (b.t * 30) % 1 < 0.5) b.ghosts.push({ x: b.x, y: b.y, t: 0.35 });
      }
      const n = Math.min(b.parts.length, B2[1]);
      for (let i = 0; i < n; i++) {
        const p = b.parts[i], o = 13 + i * 4, pf = B2[o + 2];
        p.x = L(o) / 2; p.y = L(o + 1) / 2;
        p.alive = !!(pf & 1); p.hide = !!(pf & 2); p.flash = pf & 4 ? 0.06 : 0; p.dash = !!(pf & 32); p.wk = pf & 64 ? 1 : Math.max(0, (p.wk || 0) - 0.1);
        p.mode = ['block', 'core', 'sub', 'armor'][(pf >> 3) & 3];
        const ax = lerpA(A2[o + 3] / 1000, B2[o + 3] / 1000, k);
        if (kd === 'vela') p.aim = ax; else if (kd === 'gaia') p.a = ax; else if (kd === 'ver') p.ang = ax; else if (kd === 'planete') p.depth = L(o + 3) / 1000;
      }
    }
    function guestBossSpawn(ev) {                   // (invité) le même boss, construit chez lui (images, visage du copain)
      const kind = ev[1];
      if (!BINIT[kind]) return;
      const face = ev[2] ? heads.find((h) => headName(h) === headName({ name: ev[2] })) || null : null;
      const r0 = rng; rng = null;
      const hole0 = hole;
      B = { kind, x: LW / 2, y: -160, t: 0, hp: 1, maxHp: 1, phase: 0, nph: ev[5] || 3, ready: false, inv: 0, dying: false, dT: 0, parts: [], head: face, head2: null, st: 0, st2: 0, st3: 0, a: 0, a2: 0,
        k: 0, k2: 0, mode: 0, mT: 0, name: BOSS_NAMES[kind], flash: 0, enterT: 2.6, ty: 150, custom: false, bx: LW / 2, by: 150, open: 0, boomT: 0, cv: null, rage: 0, rng: null };
      muted(() => BINIT[kind](B));
      if (kind === 'planete' && ev[4] >= 0 && IMGP && IMGP[ev[4]]) { B.img = IMGP[ev[4]]; if (B.head) B.cv = facePlanet(B.head.img, B.img, B.R); }
      if (kind === 'jumelles' && ev[3]) { const h2 = heads.find((h) => headName(h) === headName({ name: ev[3] })); if (h2 && B.Z) { B.head2 = h2; B.Z.face = facePlanet(h2.img, B.Z.img, 38); } }
      hole = kind === 'oeil' ? hole : hole0;
      rng = r0;
    }
    function guestEnemy(ev) {                       // naissance d'un ennemi de l'hôte (son allure ; ses positions viennent des instantanés)
      if (enN >= MAXEN || MIR.has(ev[1])) return;
      const r0 = rng; rng = null;
      const e = spawnEnemy(ev[2], -999, -999, 0);
      rng = r0;
      if (!e) return;
      e.nid = ev[1]; e.head = ev[3] ? heads.find((h) => headName(h) === headName({ name: ev[3] })) || null : null; e.said = true;
      e.hue = ev[4]; e.rich = !!ev[5]; e.seed = ev[6]; e.var = ev[7]; e.mini = !!ev[8]; e.seg = ev[10]; e.r = ev[11]; e.vr = ev[12] / 100; e.ang = ev[13] / 100; e.max = e.hp = ev[14] || 1;
      e.bornT = SNAP.length ? SNAP[SNAP.length - 1].T : nnow(); e.seenT = e.bornT;
      e.lead = ev[9] ? MIR.get(ev[9]) || null : null; e.placed = false; e.entered = false; e.mv = 0; e.fire = false; e.rng = null; e.hold = 99;
      MIR.set(e.nid, e);
    }
    function guestBullet(v, g) {                    // naissance d'une balle : elle vit chez moi au temps de jeu de l'hôte
      if (ebN >= MAXEB) return;
      const b = EB[ebN++];
      b.id = v[1]; b.x = v[2] / 10; b.y = v[3] / 10; b.vx = v[4] / 10; b.vy = v[5] / 10; b.col = v[6]; b.sz = v[7]; b.acc = v[8] / 10; b.turn = v[9] / 1000; b.delay = v[10] / 1000; b.life = v[11] / 100; b.t = v[12] / 1000;
      b.r = b.sz === 1 ? 7.2 : b.sz === 0 ? 4.1 : 3.3; b.spr = SPR.eb[b.col] ? SPR.eb[b.col][b.sz] : SPR.eb.p[0]; b.rot = b.sz >= 2; b.born = nnow();
      const late = Gd - g;                          // (déjà en retard : on la fait avancer jusqu'à l'heure affichée)
      if (late > 0.004) { const r = ebN - 1; stepOne(b, late); if (EB[r] !== b) { /* sortie */ } }
    }
    function stepOne(b, t) {                        // avance une seule balle (même calcul que updEB, sans touche)
      let n = Math.min(60, Math.ceil(t / 0.0167)), h = t / Math.max(1, n);
      for (let i = 0; i < n; i++) {
        if (b.delay > 0) { b.delay -= h; continue; }
        b.t += h;
        if (b.acc) { const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) + 0.001, ns = Math.max(20, Math.min(320, sp + b.acc * h)); b.vx *= ns / sp; b.vy *= ns / sp; }
        if (b.turn) { const c = Math.cos(b.turn * h), s = Math.sin(b.turn * h), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
        b.x += b.vx * h; b.y += b.vy * h;
      }
    }
    function guestEvents(q) {
      const v = q.v;
      if (q.full) {                                 // toutes les balles de l'hôte : on repart de là
        ebN = 0;
        for (let i = 0; i < v.length; i++) guestBullet(v[i], q.g / 1000);
        return;
      }
      for (let i = 0; i < v.length; i++) {
        const e = v[i], t = e[0];
        if (t === 'b') guestBullet(e, q.g / 1000);
        else if (t === 'x') { for (let j = ebN - 1; j >= 0; j--) if (EB[j].id === e[1]) { swapOut(EB, j, ebN); ebN--; break; } }
        else if (t === 'X') cancelBullets(e[1] / 2, e[2] / 2, e[3], !!e[4]);
        else if (t === 'n') guestEnemy(e);
        else if (t === 'k') { const m = MIR.get(e[1]); if (m) { m.alive = false; if (m.beam) { const j = BEAMS.indexOf(m.beam); if (j >= 0) BEAMS.splice(j, 1); } } }
        else if (t === 'E') explode(e[1] / 2, e[2] / 2, e[3], e[4]);
        else if (t === 'R') ring(e[1] / 2, e[2] / 2, e[3], e[4], e[5] / 100, e[6], e[7]);
        else if (t === 'K') sparks(e[1] / 2, e[2] / 2, e[3], glOf(e[4]), e[5], e[6] / 100, e[7]);
        else if (t === 'D') debris(e[1] / 2, e[2] / 2, e[3], e[4]);
        else if (t === 'T') ftext(e[1] / 2, e[2] / 2, e[3], e[4], e[5], e[6] / 100, e[7] == null ? undefined : e[7], e[8]);
        else if (t === 'N') banner(e[1], e[2], e[3], e[4], e[5], e[6]);
        else if (t === 'A') { const h = heads.find((x) => headName(x) === headName({ name: e[1] })); if (h) addFace(h, e[2] / 2, e[3] / 2, e[4], e[5] || undefined); }
        else if (t === 'l') light(e[1] / 2, e[2] / 2, e[3], e[4] / 100);
        else if (t === 'H') { const h0 = HITBY; HITBY = e[4]; shards(e[1] / 2, e[2] / 2, e[3]); HITBY = h0; }
        else if (t === 'S') { if (e[1] === 'beep') tone(880, 0.07, 'square', 0.03); else if (SFX[e[1]]) SFX[e[1]](e[2] == null ? undefined : e[2]); }
        else if (t === 'm') music(e[1] || undefined);
        else if (t === 'F') { flashA = Math.max(flashA, e[1] / 100); flashCol = e[2]; shake = Math.max(shake, e[3]); }
        else if (t === 'B') guestBossSpawn(e);
        else if (t === 'L') BOLTS.push({ x: e[1] / 2, t: 0, warn: e[2], dur: e[3], seed: e[4] });
        else if (t === 'G') GATES.push({ y: -12, t: 0, gaps: e[1].map((x) => x / 2) });
        else if (t === 'M') {
          const ow = e[1] === 1 ? MIR.get(e[2]) || null : e[1] === 2 && B ? B.parts[e[2]] || null : null;
          if (e[1] && !ow) continue;
          const bm = { owner: ow, ouid: ow ? ow.uid : 0, x: ow ? ow.x : 0, y: ow ? ow.y : 0, ox: e[8] || 0, oy: e[9] || 0, ang: e[3] / 1000, warn: e[4], dur: e[5], w: e[6], col: e[7] || 'm', t: 0, track: !!e[10], len: 900 };
          if (e[11]) bm.spin = e[11] / 1000;
          BEAMS.push(bm); if (ow && ow.type) ow.beam = bm;
          SFX.charge();
        }
        else if (t === 'h') {                       // touché : bulle perdue (0) ou épave (1) — mes coups à moi sont déjà joués
          const s = SHIPS[e[1]];
          if (s && s !== P) { if (e[2]) wreckFx(s); else bubbleFx(s); }
        }
        else if (t === 'r') { const s = SHIPS[e[1]]; if (s) { s.x = s.podX; s.y = s.podY; rescueFx(s, other(s), e[2]); } }
        else if (t === 'o') { const s = SHIPS[e[1]]; if (s) loseFx(s); }
        else if (t === 'd') { DS = SHIPS[e[1]] || P; }
        else if (t === 'c') { const c = CPM.get(e[1]); if (c) { const j = CP.indexOf(c); if (j >= 0 && j < cpN) { swapOut(CP, j, cpN); cpN--; } CPM.delete(e[1]); } }
      }
    }
    function guestEventsUpd(dG) {                   // éclairs, portes laser, zone sombre (sans le directeur de l'hôte)
      darkK += ((darkOn ? 1 : 0) - darkK) * Math.min(1, NET.fdt * 1.5);
      for (let i = BOLTS.length - 1; i >= 0; i--) {
        const b = BOLTS[i];
        b.t += dG;
        if (b.t >= b.warn && b.t - dG < b.warn) { SFX.zap(); flashA = Math.max(flashA, 0.18); flashCol = '#c9b8ff'; shake = Math.max(shake, 4); }
        if (b.t >= b.warn && b.t < b.warn + 0.18 && P.alive && Math.abs(P.x - b.x) < 15) hurtShip(P);
        if (b.t > b.warn + b.dur) BOLTS.splice(i, 1);
      }
      for (let i = GATES.length - 1; i >= 0; i--) {
        const g = GATES[i];
        g.t += dG; g.y += 62 * dG;
        if (g.t > 1.2 && P.alive && Math.abs(P.y - g.y) < 6) {
          let safe = false;
          for (let j = 0; j < g.gaps.length; j += 2) if (P.x > g.gaps[j] + 4 && P.x < g.gaps[j + 1] - 4) safe = true;
          if (!safe) hurtShip(P);
        }
        if (g.y > LH + 20) GATES.splice(i, 1);
      }
    }
    function guestHits() {                          // ce qui touche MON vaisseau (corps des ennemis et du boss, lien des Jumelles, cœur du trou noir)
      if (!P.alive || P.inv > 0 || state !== 'play') return;
      for (let i = 0; i < enN; i++) {
        const e = EN[i];
        if (!e.alive || !e.placed) continue;
        const dx = e.x - P.x, dy = e.y - P.y, rr = e.r * 0.72 + 8;
        if (dx * dx + dy * dy < rr * rr) { hurtShip(P); return; }
      }
      if (B && B.ready && !B.dying) {
        for (let i = 0; i < B.parts.length; i++) {
          const p = B.parts[i];
          if (!p.alive || p.hide) continue;
          const dx = p.x - P.x, dy = p.y - P.y, rr = p.r * 0.8 + 8;
          if (dx * dx + dy * dy < rr * rr) { hurtShip(P); return; }
        }
        if (B.kind === 'jumelles' && B.A && B.Z && B.A.alive && B.Z.alive && B.rr >= 6 && segDist2(P.x, P.y, B.A.x, B.A.y, B.Z.x, B.Z.y) < 49) { hurtShip(P); return; }
      }
      if (hole && hole.k > 0.3 && !hole.boss) { const dx = P.x - hole.x, dy = P.y - hole.y; if (dx * dx + dy * dy < 400) hurtShip(P); }
    }
    function guestShip0(s, dt) {                    // le vaisseau de l'hôte, chez l'invité : lissé (positions interpolées)
      if (s.nx == null) return;
      s.x = s.nx; s.y = s.ny; s.bank = s.nbank != null ? s.nbank : s.bank;
    }
    function guestHurt(s) {                         // je suis touché (je le décide) : je joue l'effet tout de suite, l'hôte applique
      if (s !== P) return;
      const now = nnow();
      if (now < pred.inv) return;
      let bid = 0;
      for (let i = 0; i < ebN; i++) { const b = EB[i]; const dx = b.x - P.x, dy = b.y - P.y + 1, rr = b.r + 6; if (dx * dx + dy * dy < rr * rr) { bid = b.id; break; } }
      nsend({ t: 'hurt', b: bid }, true);
      NET.hurts++;
      if (P.shield > 0) { pred.inv = now + 2200; P.inv = 2.2; P.shield = 0; P.hitFlash = 1; cancelBullets(P.x, P.y, 110, false); bubbleFx(P); }
      else { pred.inv = now + 1500; pred.wreckT = now + 1200 + 2 * (NETC.rtt ? NETC.rtt() : 200); P.podX = P.x; P.podY = P.y; wreckFx(P); P.alive = false; P.st = 'wreck'; P.podT = podTime(); P.podMax = P.podT; }
    }
    function guestBomb(s) {
      if (s !== P) return;
      const now = nnow();
      pred.bombs = s.bombs - 1; pred.bombsT = now + 600 + (NETC.rtt ? NETC.rtt() : 200);
      s.bombs--; s.inv = Math.max(s.inv, 2); pred.inv = Math.max(pred.inv, now + 2000);
      nsend({ t: 'bomb' }, true);
      cancelBullets(0, 0, -1, true);
      ring(s.x, s.y, 10, Math.max(LW, LH) * 1.1, 0.8, '#ffb3d0', 6); ring(s.x, s.y, 6, LW * 0.7, 0.55, '#ffffff', 3);
      sparks(s.x, s.y, 40, GL.m, 400, 0.8, 10); part(s.x, s.y, 0, 0, 0.5, 60, 420, GL.m, true, 0);
      flashA = 0.6; flashCol = '#ffc4e4'; shake = Math.max(shake, 14);
      SFX.bomb();
      ftext(LW / 2, LH * 0.45, 'BOMBE !', '#ff7ab8', 26, 0.9, -10, 0);
    }
    function guestHyper(s) {
      if (s !== P) return;
      const now = nnow();
      s.hyper = 0; s.hyperT = 6; pred.hyT = now + 600 + (NETC.rtt ? NETC.rtt() : 200);
      nsend({ t: 'hyper' }, true);
      cancelBullets(s.x, s.y, 150, true);
      ring(s.x, s.y, 10, Math.max(LW, LH), 0.7, '#ff7ad8', 5); sparks(s.x, s.y, 34, GL.m, 360, 0.7, 9);
      flashA = 0.5; flashCol = '#ff6fd0'; shake = Math.max(shake, 8); hyperTint = 1;
      SFX.hyper();
      if (other(s).hyperT > 0) banner('HYPER DUO !', 'Points ×3', '#ff5fd2', 1.8, 2); else banner('HYPER !', 'Puissance maximale', '#ff5fd2', 1.6, 2);
    }
    function updShotsGuest(dt) {                    // (invité) mes tirs et ceux de l'hôte : seulement pour les yeux (les dégâts sont chez l'hôte)
      for (let i = psN - 1; i >= 0; i--) {
        const s = PS[i];
        s.px = s.x; s.py = s.y;
        s.x += s.vx * dt; s.y += s.vy * dt;
        let hit = s.y < -40 || s.x < -40 || s.x > LW + 40 || s.y > LH + 40;
        if (!hit) {
          for (let j = 0; j < enN && !hit; j++) {
            const e = EN[j];
            if (!e.alive || !e.placed || e.y < -e.r) continue;
            const rr = e.r + s.r;
            if (segDist2(e.x, e.y, s.px, s.py, s.x, s.y) <= rr * rr) { hit = !s.pierce; if (Math.random() < 0.25) part(s.x, s.y, rnd(-30, 30), rnd(-70, -10), 0.14, 5, 0, GL.y, true, 0); }
          }
          if (!hit && B && B.ready && !B.dying) for (let j = 0; j < B.parts.length && !hit; j++) {
            const p = B.parts[j];
            if (!p.alive || p.hide) continue;
            const rr = p.r + s.r;
            if (segDist2(p.x, p.y, s.px, s.py, s.x, s.y) <= rr * rr) { hit = !s.pierce || p.mode === 'block'; if (p.mode === 'block' && Math.random() < 0.3) sparks(s.x, s.y, 2, GL.y, 90, 0.22, 6); }
          }
        }
        if (hit) { swapOut(PS, i, psN); psN--; }
      }
      for (let i = msN - 1; i >= 0; i--) {
        const m = MS[i];
        m.life -= dt;
        if (!m.tgt || !m.tgt.alive) m.tgt = nearestTarget(m.x, m.y);
        const tx = m.tgt ? m.tgt.x : m.x + m.vx * 0.2, ty = m.tgt ? m.tgt.y : m.y - 100;
        const cur = Math.atan2(m.vy, m.vx), want = Math.atan2(ty - m.y, tx - m.x);
        const na = cur + clamp(angDiff(cur, want), -7.5 * dt, 7.5 * dt), sp = Math.min(440, Math.sqrt(m.vx * m.vx + m.vy * m.vy) + 650 * dt);
        m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp; m.x += m.vx * dt; m.y += m.vy * dt;
        m.smT -= dt;
        if (m.smT <= 0) { m.smT = 0.03; const p = part(m.x, m.y, rnd(-8, 8), rnd(-8, 8) + scrollV * 0.5, 0.45, 3, 9, SMOKE, false, 0.5); if (p) p.a0 = 0.7; }
        let hit = false;
        if (m.tgt && m.tgt.alive) { const dx = m.tgt.x - m.x, dy = m.tgt.y - m.y, rr = m.tgt.r + 4; if (dx * dx + dy * dy < rr * rr) hit = true; }
        if (hit) { part(m.x, m.y, 0, 0, 0.22, 10, 26, FIRE, true, 0); sparks(m.x, m.y, 4, GL.o, 90, 0.3, 6); }
        if (hit || m.life <= 0 || m.y < -60 || m.y > LH + 60 || m.x < -60 || m.x > LW + 60) { swapOut(MS, i, msN); msN--; }
      }
    }
    function updShardsGuest(dt) {                   // (invité) éclats pour les yeux : ils filent vers leur pilote ; capsules : de l'hôte
      for (let i = shN - 1; i >= 0; i--) {
        const s = SH[i];
        s.t += dt;
        let tp = SHIPS[s.o & 1];
        if (!tp.alive) tp = other(tp);
        const dx = tp.x - s.x, dy = tp.y - s.y, d2 = dx * dx + dy * dy;
        if (tp.alive && s.t > 0.22 && (s.mag || d2 < 64 * 64 || dir.phase === 'clear' || dir.phase === 'bossdead' || dir.phase === 'jump')) {
          s.mag = true; const d = Math.sqrt(d2) + 0.01, sp = 380 + s.t * 260; s.vx = (dx / d) * sp; s.vy = (dy / d) * sp;
        } else { s.vx *= 1 - Math.min(1, 2 * dt); s.vy += (scrollV * 0.8 - s.vy) * Math.min(1, dt * 1.4); }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (tp.alive && d2 < 20 * 20) { if (tp === P) { shardRun++; shardRunT = 0.5; SFX.shard(shardRun); } swapOut(SH, i, shN); shN--; }
        else if (s.y > LH + 20 || s.t > 10) { swapOut(SH, i, shN); shN--; }
      }
      if (shardRunT > 0) { shardRunT -= dt; if (shardRunT <= 0) shardRun = 0; }
      for (let i = 0; i < cpN; i++) CP[i].t += dt;
    }
    function guestStep(dt) {                        // (invité) une image : le théâtre de l'hôte + mon vaisseau
      NET.fdt = dt;
      if (state === 'play' || state === 'dying' || state === 'over') guestWorld(dt);
      for (let i = 0; i < SHIPS.length; i++) updateShip(SHIPS[i], dt);
      for (let i = 0; i < SHIPS.length; i++) { const s = SHIPS[i]; if (s.nameT > 0) s.nameT -= dt; if (s.saveT > 0) s.saveT -= dt; }
      updShotsGuest(dt);
      updShardsGuest(dt);
      updFx(dt);
      updBg(dt);
      if (multPop > 0) multPop = Math.max(0, multPop - dt * 3);
      // ma position pour l'hôte (≤ 60 / s, rapide)
      const now = nnow();
      if (state === 'play' && now - lastSentI >= 15) { lastSentI = now; nsend({ t: 'i', x: Math.round(P.x * 4), y: Math.round(P.y * 4) }, false); }
    }
    function netGuestMsg(m) {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'go') { if (!NET.goAt) { NET.goAt = m.at; NET.lh = m.lh || 0; if (NET.lh) resize(); } return; }
      if (m.t === 's') {
        if (!Array.isArray(m.e) || !Array.isArray(m.sh)) return;
        const last = SNAP.length ? SNAP[SNAP.length - 1] : null;
        if (last && m.T <= last.T) { NET.late++; return; }   // (dans le désordre : trop vieux)
        m.map = new Map(); for (let i = 0; i < m.e.length; i += 3) m.map.set(m.e[i], i);
        m.amap = new Map(); for (let i = 0; i < m.ea.length; i += 4) m.amap.set(m.ea[i], i);
        const age = nnow() - m.T;                   // âge à l'arrivée (≈ la latence) et ses à-coups
        if (!NET.snaps) NET.age = age;
        NET.age += (age - NET.age) * 0.08; NET.jit += (Math.abs(age - NET.age) - NET.jit) * 0.08;
        SNAP.push(m); if (SNAP.length > 12) SNAP.shift();
        NET.snaps++;
        NET.I = clamp((NET.age + 50 + 2.5 * NET.jit) / 1000, 0.06, 0.6);   // affichage : un instantané de retard en plus de la latence
        return;
      }
      if (m.t === 'e') { GQ.push(m); NET.ev += m.v.length; if (m.full) { GQ.length = 0; GQ.push(m); } return; }
      if (m.t === 'bl') { gBlist = m; guestReconcile(); return; }
    }
    function guestReconcile() {                     // les balles qui n'existent plus chez l'hôte s'en vont (à l'heure de la liste)
      const m = gBlist;
      if (!m || m.g / 1000 > Gd + 0.2) return;
      const set = new Set(m.ids.split(',').filter(Boolean).map((x) => parseInt(x, 36)));
      let ghosts = 0, missing = 0;
      for (let i = ebN - 1; i >= 0; i--) if (!set.has(EB[i].id) && nnow() - (EB[i].born || 0) > 1500) { swapOut(EB, i, ebN); ebN--; ghosts++; }
      const mine = new Set(); for (let i = 0; i < ebN; i++) mine.add(EB[i].id);
      set.forEach((id) => { if (!mine.has(id)) missing++; });
      NET.ghosts = (NET.ghosts || 0) + ghosts;
      if (missing > 12) { NET.missN = (NET.missN || 0) + 1; if (NET.missN >= 2) { NET.missN = 0; nsend({ t: 'full' }, true); } } else NET.missN = 0;
      gBlist = null;
    }
    function netStart() {
      NET.start = nnow();
      try {
        NETC.onMessage((m) => {
          if (destroyed) return;
          NET.recv++;
          try { if (GUEST) netGuestMsg(m); else netHostMsg(m); } catch (e) { NET.err = (NET.err || 0) + 1; }
        });
      } catch (e) { /* rien */ }
    }
    function netStats() { return { role: GUEST ? 'guest' : 'host', sent: NET.sent, bytes: NET.bytes, recv: NET.recv, snaps: NET.snaps, ev: NET.ev, resync: NET.resync, late: NET.late, hurts: NET.hurts, I: Math.round(NET.I * 1000), ghosts: NET.ghosts || 0, err: NET.err || 0, Gd: Math.round(Gd * 10) / 10, G: Math.round(netG * 10) / 10, eb: ebN, en: enN, snapQ: SNAP.length, gq: GQ.length }; }
    // ------------------------------------------------------------- démarrage
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    else on(window, 'resize', resize);
    resize();
    if (START > 1) {                             // ?start= : on démarre au niveau START, comme si les précédents étaient réussis
      secI = (START - 1) % SECTORS.length; cycle = Math.floor((START - 1) / SECTORS.length);
      sectorsDone = bossCount = START - 1;         // (sans leurs points ni leurs félicitations)
      P.shield = 1; P.power = 2;                   // butin du dernier boss battu : capsules S et P
    }
    applySector(false);
    if (CO) { for (let i = 0; i < SHIPS.length; i++) { SHIPS[i].x = autoX(SHIPS[i]); SHIPS[i].y = LH + 50; } }   // départ en formation
    else { P.x = LW / 2; P.y = LH + 50; }
    state = loading || NETC ? 'load' : 'ready'; stT = 0;
    if (!CO && document.hidden) paused = true;
    if (NETC) netStart();
    if (paused) pauseBtn.innerHTML = ICON_PLAY;
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------------------- accès de test (invisible pour le joueur)
    function clearField() {
      if (B) music();
      for (let i = 0; i < enN; i++) EN[i].alive = false;
      enN = 0; ebN = 0; psN = 0; msN = 0; BEAMS.length = 0; BOLTS.length = 0; GATES.length = 0; BOOMQ.length = 0;
      hole = null; darkOn = false; darkK = 0; B = null; miniRef = null;
    }
    const _debug = {
      info: () => ({ state, paused, score: Math.floor(score), mult, chain, sector: secI + 1, cycle, wave: dir.wave, nW: dir.nW, phase: dir.phase, L: Math.round(L * 100) / 100,
        shield: P.shield, power: P.power, miss: P.miss, opts: P.opts, bombs: P.bombs, hyper: P.hyper, hyperT: P.hyperT, alive: P.alive, x: P.x, y: P.y, LW, LH,
        enemies: enN, bullets: ebN, particles: ptN, shots: psN, shards: shN, caps: cpN,
        boss: B ? { kind: B.kind, hp: Math.round(B.hp), max: Math.round(B.maxHp), phase: B.phase, ready: B.ready, head: !!B.head, t: Math.round(B.t) } : null,
        mini: !!(miniRef && miniRef.alive), ev: dir.ev, quality, dpr, overSent, msU: Math.round(profU * 100) / 100, msR: Math.round(profR * 100) / 100, playT: Math.round(playT), heads: heads.length, imgs: !!IMGP, nebs: !!IMGN, god, kills, rt: Math.round(rt * 1000) / 1000 }),
      snap: () => {
        const b = [], e = [], bm = [];
        for (let i = 0; i < ebN; i++) { const q = EB[i]; if (q.delay <= 0) b.push(q.x, q.y, q.vx, q.vy, q.r); }
        for (let i = 0; i < enN; i++) { const q = EN[i]; if (q.alive && q.delay <= 0) e.push(q.x, q.y, q.r, q.vx, q.vy); }
        const tg = [];
        for (let i = 0; i < enN; i++) { const q = EN[i]; if (q.alive && q.delay <= 0) tg.push(q.x, q.y); }
        if (B && B.parts) for (let i = 0; i < B.parts.length; i++) { const q = B.parts[i]; if (q.alive && !q.hide) { e.push(q.x, q.y, q.r, 0, 0); if (q.mode !== 'block') tg.push(q.x, q.y); } }
        for (let i = 0; i < BEAMS.length; i++) { const q = BEAMS[i]; bm.push(q.x, q.y, q.ang, q.w, q.t >= q.warn - 0.35 ? 1 : 0); }
        const bo = [];
        for (let i = 0; i < BOLTS.length; i++) bo.push(BOLTS[i].x, BOLTS[i].t >= BOLTS[i].warn - 0.6 ? 1 : 0);
        if (B && B.kind === 'ver' && (B.mode === 2 || (B.mode === 3 && B.hd.y < LH + 60))) bo.push(B.warnX, 1);
        const gt = [];
        for (let i = 0; i < GATES.length; i++) gt.push({ y: GATES[i].y, gaps: GATES[i].gaps.slice() });
        const cp = [];
        for (let i = 0; i < cpN; i++) cp.push(CP[i].x, CP[i].y);
        return { x: P.x, y: P.y, LW, LH, b, e, tg, bm, bo, gt, cp, hole: hole ? [hole.x, hole.y, hole.k] : null, alive: P.alive, state, inv: P.inv, bombs: P.bombs, hyper: P.hyper, shield: P.shield };
      },
      sector: (n, cyc) => {
        clearField();
        secI = clamp((n | 0) - 1, 0, 7); cycle = Math.max(0, cyc | 0);
        applySector(true);
        dir.phase = 'intro'; dir.t = 0;
        if (state === 'ready' || state === 'load') { state = 'play'; stT = 0; P.auto = 0; P.y = LH - 120; }
        playT = Math.max(playT, 61);
      },
      boss: (face) => { clearField(); if (face === true || face === false) forceFace = face; dir.pi = dir.plan.length - 1; dir.wave = dir.nW; nextStep(); },
      mini: () => { clearField(); spawnGardien(); dir.phase = 'mini'; dir.t = 0; dir.pi = Math.max(dir.pi, 4); },
      killBoss: () => { if (B && B.ready) bossDamage(B.hp + 1, B.x, B.y, null); },
      hurtBoss: (f) => { if (B && B.ready) bossDamage(B.maxHp * f, B.x, B.y, null); },
      god: (on) => { god = !!on; },
      power: (p, m, o) => { P.power = clamp(p | 0, 1, 6); P.miss = clamp(m | 0, 0, 3); P.opts = clamp(o | 0, 0, 4); P.pT = 0; P.missLeft = ARMS_T; P.optLeft = ARMS_T; for (let i = 0; i < 4; i++) { P.OPT[i].x = P.x; P.OPT[i].y = P.y; } },
      hyperFull: () => { P.hyper = 1; },
      hyper: () => useHyper(P),
      bomb: () => useBomb(P),
      event: (name) => { if (EVS.indexOf(name) >= 0) startEvent(name); },
      jump: () => { clearField(); dir.phase = 'clear'; dir.t = 9; },
      shield: (n) => { P.shield = clamp(n | 0, 0, 1); },
      die: () => { god = false; P.inv = 0; P.shield = 0; state = 'play'; hurtShip(P); },
      onFrame: (fn) => { onFrame = typeof fn === 'function' ? fn : null; },
      quality: (q, auto) => { quality = clamp(+q || 1, 0.5, 1); adaptive = !!auto; resize(); },
      spawn: (k, n) => { spawnGroup(W(0, k, n || 0)); },
      flood: (n) => { for (let i = 0; i < n; i++) eb(rnd(10, LW - 10), rnd(-10, LH * 0.5), rnd(-60, 60), rnd(40, 120), BKEYS[i % 6], i % 4); },
      parts: (n) => { for (let i = 0; i < n; i++) explode(rnd(20, LW - 20), rnd(60, LH - 60), 2, 'o'); },
      move: (x, y) => { P.x = clamp(x, 14, LW - 14); P.y = clamp(y, 66, LH - 26); },
      // (coop) l'équipage, les mesures du robot, et de quoi forcer une épave
      crew: () => CO ? SHIPS.map((s) => ({ i: s.i, st: s.st, x: Math.round(s.x), y: Math.round(s.y), sh: s.shield, pw: s.power, b: s.bombs, hy: Math.round(s.hyper * 100) / 100, hyT: Math.round(s.hyperT * 10) / 10,
        kills: s.kills, rescues: s.rescues, hits: s.hits, podT: Math.round(s.podT * 10) / 10, rk: Math.round(s.rk * 100) / 100, ai: !!s.ai, inv: Math.round(s.inv * 10) / 10 })) : null,
      coop: () => CO ? { lvl: LVI, kc: teamK(), stolen, rescues: teamRescues, ai: Object.assign({}, AI), stats: coopStats(), caps: cpN, mult: PTK } : null,
      wreck: (i) => { const s = SHIPS[i | 0]; if (s && s.alive && state === 'play') { s.shield = 0; s.inv = 0; s.auto = 0; hurtShip(s, true); } },
      net: () => NETC ? netStats() : null,
      armAll: (p, m, o) => { for (let i = 0; i < SHIPS.length; i++) { const s = SHIPS[i]; s.power = clamp(p | 0, 1, 6); s.miss = clamp(m | 0, 0, 3); s.opts = clamp(o | 0, 0, 4); s.pT = 0; s.missLeft = ARMS_T; s.optLeft = ARMS_T; for (let k = 0; k < 4; k++) { s.OPT[k].x = s.x; s.OPT[k].y = s.y; } } },
      hyperAll: () => { for (let i = 0; i < SHIPS.length; i++) { SHIPS[i].hyper = 1; useHyper(SHIPS[i]); } },
      godShip: (i, on) => { const s = SHIPS[i | 0]; if (s) s.god = !!on; },
      revive: (i) => { const s = SHIPS[i | 0]; if (s && (s.st === 'wreck' || s.st === 'out')) { s.st = 'fly'; s.alive = true; s.x = s.podX; s.y = s.podY; s.inv = 1.5; s.shield = 0; s.rk = 0; } },
      still: (on, x, y) => { P.still = !!on; if (on && x != null) { P.x = x; P.y = y; } }
    };

    const inst = {
      currentScore: () => Math.max(0, Math.floor(score)),     // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => cycle * 8 + secI + 1,                // secteur en cours, cycles compris (cycle II secteur 1 = 9)
      _debug,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        try { if (ro) ro.disconnect(); } catch (e) { /* rien */ }
        for (let i = 0; i < listeners.length; i++) { const l = listeners[i]; try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* rien */ } }
        listeners.length = 0; later.length = 0; BOOMQ.length = 0; FACES.length = 0;
        enN = 0; ebN = 0; ptN = 0; B = null; onFrame = null;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
    if (CO) { inst.pause = coopPause; inst.resume = coopResume; inst.coopStats = coopStats; }
    return inst;
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES.ilo = {
    id: 'ilo',
    title: 'Galaxy Wars',
    tagline: "Fonce à travers l'espace d'ILO, pulvérise les vagues et les boss planétaires.",
    accent: ACCENT,
    scoreLabel: 'points',
    preview,
    mount,
    // mode Coop (COOP-CONTRACT.md) : « Galaxy Wars à deux », avec le robot ailier ou un copain en ligne
    coop: {
      ai: true, online: true, title: 'Galaxy Wars à deux', short: 'Galaxy Wars', emoji: '🚀',
      tagline: 'Deux vaisseaux, une équipe : sauve ton coéquipier et pulvérise les boss !',
      levelHint: "Plus d'ennemis et plus solides… et ton robot pilote mieux",
      mult: [1, 1.25, 1.6, 2], colors: ['#38e1ff', '#ffa630'], landscape: false, scoreLabel: 'points', preview: previewDuo
    }
  };
})();
