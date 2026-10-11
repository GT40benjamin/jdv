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
    let bombShown = -1, hyperShown = -1, hyperReadyShown = null;

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
      scale = colW / LW;
      if (LH * scale > ch) { scale = ch / LH; colW = LW * scale; }
      colH = LH * scale;
      colX = (cw - colW) / 2; colY = (ch - colH) / 2;
      K = scale * dpr;
      const nr = clamp(K, 0.6, 4);
      if (!SPR || Math.abs(nr - RES) > 0.04) { RES = nr; buildSprites(); }
      if (P && oldLH !== LH) P.y = clamp(P.y * LH / oldLH, 70, LH - 30);
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
    let secI = 0, cycle = 0, L = 0, SEC = SECTORS[0], secHue = SECTORS[0].hue, secNoHit = true, sectorsDone = 0, bossCount = 0;
    let shake = 0, flashA = 0, flashCol = '#ffffff', freezeT = 0, slowT = 0, slowK = 1, hyperTint = 0, glitch = 0;
    let scrollV = 60, warp = 0, bgDirty = true, god = false, overSent = false, deathT = 0, deadInfo = null;
    let ptCap = MAXPT;
    let B = null;                                // boss en cours
    let onFrame = null;                          // crochet de test (_debug)
    const P = {
      x: LW / 2, y: 520, px: LW / 2, py: 520, vx: 0, vy: 0, bank: 0, alive: true, vis: true, shield: 3, inv: 0, power: 1, miss: 0, opts: 0, bombs: 2,
      hyper: 0, hyperT: 0, fireT: 0, missT: 0, optT: 0, optA: 0, magT: 0, hitFlash: 0, auto: 0, ax: 0, ay: 0, volley: 0, side: 0
    };
    const OPT = [];                              // positions lissées des drones
    for (let i = 0; i < 4; i++) OPT.push({ x: LW / 2, y: 520 });
    const TRAIL = new Float32Array(2 * 16);      // traînée lumineuse (bouts d'ailes)
    let trailN = 0, trailT = 0;

    // ------------------------------------------------------------- réserves d'objets (pas d'allocation en jeu)
    function pool(n, mk) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = mk(); return a; }
    const EB = pool(MAXEB, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 4, col: 'p', sz: 0, t: 0, acc: 0, turn: 0, rot: false, spr: null, delay: 0, life: 99 }));
    const PS = pool(MAXPS, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: 3, dmg: 1, spr: null, pierce: false, h1: 0, h2: 0, h3: 0, ang: 0, kind: 0 }));
    const MS = pool(MAXMS, () => ({ x: 0, y: 0, vx: 0, vy: 0, tgt: null, tuid: 0, life: 0, smT: 0 }));
    const PT = pool(MAXPT, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s0: 1, s1: 0, img: null, add: true, drag: 0, rot: 0, vr: 0, a0: 1, spr: null }));
    const RG = pool(MAXRG, () => ({ x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 1, col: '#fff', w: 2 }));
    const TX = pool(MAXTX, () => ({ x: 0, y: 0, s: '', col: '#fff', size: 12, life: 0, max: 1, vy: 0, font: 0 }));
    const SH = pool(MAXSH, () => ({ x: 0, y: 0, vx: 0, vy: 0, t: 0, mag: false }));
    const CP = pool(MAXCP, () => ({ x: 0, y: 0, vx: 0, vy: 0, k: 'P', t: 0 }));
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
    const spdMul = () => Math.min(2.1, 0.82 + 0.1 * L + 0.1 * cycle) * (early ? 0.85 : 1);
    const fireMul = () => (early ? 0.4 : 1) * Math.min(3.6, 0.6 + 0.3 * L + 0.3 * cycle);
    // « rang » : plus le joueur est armé, plus les ennemis encaissent (et l'inverse quand il perd de la puissance)
    const rank = () => 1 + 0.09 * (P.power - 1) + 0.05 * P.miss + 0.04 * P.opts;
    const hpMul = () => (1 + 0.5 * L + 0.6 * cycle) * rank();
    const densMul = () => Math.min(2.2, 0.85 + 0.09 * L);

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
      return b;
    }
    function ebA(x, y, ang, spd, col, sz) { return eb(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, col, sz); }
    function aimAt(x, y) { return Math.atan2(P.y - y, P.x - x); }
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
      for (let i = ebN - 1; i >= 0; i--) {
        const b = EB[i];
        if (r > 0) { const dx = b.x - x, dy = b.y - y; if (dx * dx + dy * dy > r2) continue; }
        if (toShards && shN < MAXSH && (i & 1) === 0) { const s = SH[shN++]; s.x = b.x; s.y = b.y; s.vx = 0; s.vy = -20; s.t = 0; s.mag = true; }
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
      const v = Math.round(base * mult * (P.hyperT > 0 ? 2 : 1));
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
    function addHyper(v) {
      if (P.hyperT > 0) return;
      P.hyper = Math.min(1, P.hyper + v * 0.55);
    }

    // ------------------------------------------------------------- éclats et capsules
    function shards(x, y, n) {
      for (let i = 0; i < n && shN < MAXSH; i++) {
        const s = SH[shN++], a = Math.random() * TAU, v = 30 + Math.random() * 100;
        s.x = x + rnd(-4, 4); s.y = y + rnd(-4, 4); s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v - 30; s.t = 0; s.mag = false;
      }
    }
    function capsule(x, y, k) {
      if (cpN >= MAXCP) return;
      const c = CP[cpN++];
      c.x = clamp(x, 20, LW - 20); c.y = y; c.vx = rnd(-18, 18); c.vy = -50; c.k = k; c.t = 0;
    }
    function chooseCap() {
      // choisit une capsule utile (d'abord la puissance, puis le reste)
      if (P.power < 3 && chance(0.6)) return 'P';
      if (P.shield < 2 && chance(0.45)) return 'S';
      if (P.bombs < 1 && chance(0.35)) return 'B';
      const r = Math.random();
      if (r < 0.32) return P.power < 6 ? 'P' : 'M';
      if (r < 0.5) return P.miss < 3 ? 'M' : 'O';
      if (r < 0.66) return P.opts < 4 ? 'O' : 'P';
      if (r < 0.78) return P.shield < 3 ? 'S' : 'A';
      if (r < 0.89) return P.bombs < 3 ? 'B' : 'A';
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
    function shot(x, y, angDeg, spd, kind) {
      if (psN >= MAXPS) return;
      const s = PS[psN++], a = angDeg * Math.PI / 180;
      s.x = s.px = x; s.y = s.py = y; s.vx = Math.sin(a) * spd; s.vy = -Math.cos(a) * spd; s.ang = a; s.kind = kind;
      s.h1 = s.h2 = s.h3 = 0;
      if (kind === 0) { s.spr = SPR.bolt; s.dmg = angDeg === 0 ? 1 : 0.75; s.r = 3; s.pierce = false; }
      else if (kind === 1) { s.spr = SPR.heavy; s.dmg = 1.5; s.r = 4; s.pierce = false; }
      else if (kind === 2) { s.spr = SPR.laser; s.dmg = 1.1; s.r = 3; s.pierce = true; }
      else if (kind === 3) { s.spr = SPR.plasma; s.dmg = 3; s.r = 6; s.pierce = false; }
      else if (kind === 4) { s.spr = SPR.hyperB; s.dmg = 1.7; s.r = 5; s.pierce = true; }
      else { s.spr = SPR.optB; s.dmg = 0.8; s.r = 2.5; s.pierce = false; }
    }
    function fireMain() {
      const V = VOL[clamp(P.power, 1, 6) - 1], hyp = P.hyperT > 0;
      for (let i = 0; i < V.length; i++) { const v = V[i]; shot(P.x + v[0], P.y - 20, v[1], 900, hyp ? 4 : v[2]); }
      if (hyp) for (let i = -2; i <= 2; i++) if (i) shot(P.x + i * 6, P.y - 10, i * 12, 900, 4);
      part(P.x, P.y - 22, 0, 0, 0.06, 10, 16, hyp ? GL.m : GL.c, true, 0);
      P.volley++;
      if (P.volley % 3 === 0) SFX.shot();
    }
    function launchMissiles() {
      const n = P.miss * 2;
      for (let i = 0; i < n && msN < MAXMS; i++) {
        const m = MS[msN++], s = i & 1 ? 1 : -1, k = i >> 1;
        m.x = P.x + s * 9; m.y = P.y + 2; m.vx = s * (80 + 35 * k); m.vy = -40 - 30 * k; m.tgt = null; m.tuid = 0; m.life = 2.8; m.smT = 0;
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

    function updatePlayer(dt) {
      if (!P.alive) return;
      const ox = P.x, oy = P.y;
      if (P.auto > 0) {
        P.x += (LW / 2 - P.x) * Math.min(1, dt * 2.5);
        P.y += (LH - 130 - P.y) * Math.min(1, dt * 2.5);
        dragDX = dragDY = 0;
      } else {
        const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (kx || ky) { const n = kx && ky ? 0.7071 : 1; P.x += kx * n * KSPD * dt; P.y += ky * n * KSPD * dt; mouseTX = -1; }
        if (dragDX || dragDY) { P.x += dragDX; P.y += dragDY; dragDX = dragDY = 0; }
        else if (mouseTX >= 0 && !kx && !ky) {
          const dx = mouseTX - P.x, dy = mouseTY - P.y, d = Math.sqrt(dx * dx + dy * dy), m = 640 * dt;
          if (d > 0.5) { const k = Math.min(1, m / d); P.x += dx * k; P.y += dy * k; }
        }
        if (hole) {                               // le trou noir attire le vaisseau
          const dx = hole.x - P.x, dy = hole.y - P.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
          const f = Math.min(95, 5200 / Math.max(50, d)) * hole.k * dt;
          P.x += (dx / d) * f; P.y += (dy / d) * f;
        }
      }
      if (P.auto <= 0) { P.x = clamp(P.x, 14, LW - 14); P.y = clamp(P.y, 66, LH - 26); }
      P.vx = (P.x - ox) / Math.max(dt, 1e-4); P.vy = (P.y - oy) / Math.max(dt, 1e-4);
      P.bank += (clamp(P.vx / 230, -1, 1) - P.bank) * Math.min(1, dt * 9);
      if (P.inv > 0) P.inv -= dt;
      if (P.hitFlash > 0) P.hitFlash -= dt * 2;
      if (P.magT > 0) P.magT -= dt;
      if (P.hyperT > 0) { P.hyperT -= dt; if (P.hyperT <= 0) { P.hyperT = 0; ftext(P.x, P.y - 40, 'FIN DE L’HYPER', '#ffb3e6', 12, 1, -20, 0); } }
      // trainée lumineuse des bouts d'ailes (le décor défile : la traînée descend)
      trailT -= dt;
      for (let i = 0; i < trailN; i++) TRAIL[i * 2 + 1] += scrollV * 1.6 * dt;
      if (trailT <= 0) {
        trailT = 0.025;
        for (let i = Math.min(trailN, 15); i > 0; i--) { TRAIL[i * 2] = TRAIL[i * 2 - 2]; TRAIL[i * 2 + 1] = TRAIL[i * 2 - 1]; }
        TRAIL[0] = P.x; TRAIL[1] = P.y + 16;
        trailN = Math.min(16, trailN + 1);
      }
      if (state !== 'play' || P.auto > 0) return;
      // tir automatique permanent
      P.fireT -= dt;
      if (P.fireT <= 0) { P.fireT += P.hyperT > 0 ? 0.06 : 0.075; if (P.fireT < 0) P.fireT = 0; fireMain(); }
      if (P.miss > 0) { P.missT -= dt; if (P.missT <= 0) { P.missT = 0.72; launchMissiles(); } }
      if (P.opts > 0) {
        P.optA += dt * 2.4;
        for (let i = 0; i < P.opts; i++) {
          const a = P.optA + (i * TAU) / P.opts, o = OPT[i];
          const tx = P.x + Math.cos(a) * 30, ty = P.y + 6 + Math.sin(a) * 12;
          o.x += (tx - o.x) * Math.min(1, dt * 14); o.y += (ty - o.y) * Math.min(1, dt * 14);
        }
        P.optT -= dt;
        if (P.optT <= 0) { P.optT = 0.15; for (let i = 0; i < P.opts; i++) shot(OPT[i].x, OPT[i].y - 6, 0, 840, P.hyperT > 0 ? 4 : 5); }
      }
    }

    function hurtPlayer() {
      if (!P.alive || P.inv > 0 || god || state !== 'play' || P.auto > 0) return;
      P.shield--; secNoHit = false;
      if (P.shield <= 0) { killPlayer(); return; }
      P.power = Math.max(1, P.power - 1);
      if (mult > 1) { mult = Math.max(1, Math.ceil(mult / 2)); chain = MULT_AT[mult - 1]; }
      P.inv = 2.2; P.hitFlash = 1;
      cancelBullets(P.x, P.y, 110, false);
      freezeT = 0.08; shake = Math.max(shake, 10); flashA = 0.32; flashCol = '#ff3b5c';
      ring(P.x, P.y, 10, 110, 0.45, '#ff8fb0', 3);
      sparks(P.x, P.y, 18, GL.c, 220, 0.5, 8);
      SFX.shield();
      ftext(P.x, P.y - 36, P.shield === 1 ? 'BOUCLIER CRITIQUE !' : 'BOUCLIER -1', P.shield === 1 ? '#ff4d6d' : '#ffd34d', 14, 1.3, -18, 0);
    }
    function killPlayer() {
      P.alive = false; P.shield = 0; P.hyperT = 0;
      state = 'dying'; stT = 0;
      psN = 0; msN = 0;
      freezeT = 0.14; slowT = 1.5; slowK = 0.35; shake = 20; flashA = 0.9; flashCol = '#ffffff';
      explode(P.x, P.y, 4, 'c');
      debris(P.x, P.y, 18, 230);
      sparks(P.x, P.y, 46, GL.c, 330, 0.9, 10);
      ring(P.x, P.y, 8, 170, 0.7, '#9ff4ff', 4);
      ring(P.x, P.y, 4, 90, 0.5, '#ffffff', 3);
      SFX.death();
      deadInfo = { sec: secI + 1, cyc: cycle };
    }
    function useBomb() {
      if (state !== 'play' || paused || !P.alive || P.bombs <= 0 || P.auto > 0) return;
      P.bombs--; P.inv = Math.max(P.inv, 2);
      cancelBullets(0, 0, -1, true);
      for (let i = BEAMS.length - 1; i >= 0; i--) if (BEAMS[i].t < BEAMS[i].warn) BEAMS.splice(i, 1);
      const dmg = 30 + 14 * L;
      noRevenge = true;
      for (let j = 0; j < enN; j++) { const e = EN[j]; if (e.alive && e.delay <= 0 && e.y > -10 && e.y < LH + 10) hitEnemy(e, e.type === 'gardien' ? dmg * 1.5 : dmg, e.x, e.y); }
      noRevenge = false;
      if (B && B.ready && !B.dying) bossDamage(B.maxHp * 0.035, B.x, B.y, null);
      ring(P.x, P.y, 10, Math.max(LW, LH) * 1.1, 0.8, '#ffb3d0', 6);
      ring(P.x, P.y, 6, LW * 0.7, 0.55, '#ffffff', 3);
      sparks(P.x, P.y, 40, GL.m, 400, 0.8, 10);
      part(P.x, P.y, 0, 0, 0.5, 60, 420, GL.m, true, 0);
      flashA = 0.6; flashCol = '#ffc4e4'; shake = Math.max(shake, 14); freezeT = 0.05;
      SFX.bomb();
      ftext(LW / 2, LH * 0.45, 'BOMBE !', '#ff7ab8', 26, 0.9, -10, 0);
    }
    function useHyper() {
      if (state !== 'play' || paused || !P.alive || P.hyper < 1 || P.hyperT > 0 || P.auto > 0) return;
      P.hyper = 0; P.hyperT = 6; P.inv = Math.max(P.inv, 0.9);
      cancelBullets(P.x, P.y, 150, true);
      ring(P.x, P.y, 10, Math.max(LW, LH), 0.7, '#ff7ad8', 5);
      sparks(P.x, P.y, 34, GL.m, 360, 0.7, 9);
      flashA = 0.5; flashCol = '#ff6fd0'; shake = Math.max(shake, 8); hyperTint = 1;
      SFX.hyper();
      banner('HYPER !', 'Puissance maximale', '#ff5fd2', 1.6, 2);
    }
    function pickCap(k) {
      const col = CAPS[k].col;
      let msg = '';
      if (k === 'P') { if (P.power < 6) { P.power++; msg = P.power === 6 ? 'PUISSANCE MAX !' : 'PUISSANCE ' + P.power; } else { addPts(2000, 0, 0, false); msg = '+' + fmt(2000 * mult); } }
      else if (k === 'M') { if (P.miss < 3) { P.miss++; msg = 'MISSILES ' + P.miss; P.missT = 0.1; } else { addPts(2000, 0, 0, false); msg = '+' + fmt(2000 * mult); } }
      else if (k === 'O') { if (P.opts < 4) { OPT[P.opts].x = P.x; OPT[P.opts].y = P.y; P.opts++; msg = 'DRONE +1'; } else { addPts(2000, 0, 0, false); msg = '+' + fmt(2000 * mult); } }
      else if (k === 'S') { if (P.shield < 3) { P.shield++; msg = 'BOUCLIER +1'; } else { addPts(3000, 0, 0, false); msg = 'BOUCLIER PLEIN'; } }
      else if (k === 'B') { if (P.bombs < 3) { P.bombs++; msg = 'BOMBE +1'; } else { addPts(2000, 0, 0, false); msg = '+' + fmt(2000 * mult); } }
      else { P.magT = 12; msg = 'AIMANT À ÉCLATS !'; }
      ftext(P.x, P.y - 40, msg, col, 13, 1.1, -24, 0);
      ring(P.x, P.y, 8, 46, 0.35, col, 2.5);
      sparks(P.x, P.y, 10, GL.w, 140, 0.4, 6);
      SFX.pick(k);
    }

    // ------------------------------------------------------------- mise à jour : tirs, missiles, éclats, capsules, effets
    function collideShot(s) {
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
          score += 10 * mult; addHyper(0.0022); if (chainT > 0) chainT = Math.max(chainT, 1.1);
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
        if (P.alive && d2 < 26 * 26 && state === 'play') { pickCap(c.k); swapOut(CP, i, cpN); cpN--; }
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
      e.r = d.r; e.pts = d.pts; e.hyp = d.hyp; e.sh = d.sh;
      e.t = 0; e.delay = delay || 0; e.ang = 0; e.flash = 0; e.st = rnd(0.6, 1.6); e.st2 = 0; e.mv = 0;
      e.x0 = x; e.y0 = y; e.ty = 0; e.hold = 0; e.drop = ''; e.head = null; e.mini = false; e.var = 0;
      e.lead = null; e.seg = 0; e.hist = null; e.hi = 0; e.histT = 0; e.cloak = 1; e.hue = 0; e.vr = 0; e.size = ''; e.seed = 0; e.rich = false;
      e.ph = Math.random() * TAU; e.amp = 0; e.w = 1; e.spd = 0; e.k = 0; e.aim = Math.PI / 2; e.entered = false; e.fire = true;
      e.p0 = e.p1 = e.p2 = e.p3 = e.p4 = e.p5 = e.p6 = e.p7 = 0; e.dur = 1; e.beam = null; e.said = false; e.die = 0; e.tx = x; e.ty2 = y; e.s2 = 0;
      return e;
    }
    function bez(e, u) {
      const a = 1 - u, b0 = a * a * a, b1 = 3 * a * a * u, b2 = 3 * a * u * u, b3 = u * u * u;
      e.x = b0 * e.p0 + b1 * e.p2 + b2 * e.p4 + b3 * e.p6;
      e.y = b0 * e.p1 + b1 * e.p3 + b2 * e.p5 + b3 * e.p7;
    }
    function dropEvery() { return 3600 + 1400 * Math.min(6, L); }
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
      const dx = P.x - e.x, dy = P.y - e.y;
      if (dx * dx + dy * dy < 95 * 95 || e.y > P.y - 40) return;
      const ty = e.type;
      if (L >= 4 && (ty === 'swarm' || ty === 'dart' || ty === 'drone' || ty === 'rockS' || ty === 'stealth')) {
        if (cycle >= 2 || Math.random() < (cycle >= 1 ? 0.7 : 0.3)) fireAimed(e.x, e.y, 95, 'p', 0, cycle >= 2 && Math.random() < 0.5 ? 3 : 1, 0.22);
      } else if (L >= 5 && (ty === 'frigate' || ty === 'elite' || ty === 'cruiser' || ty === 'weaver' || ty === 'sentinel')) {
        fireRing(e.x, e.y, 8 + Math.min(8, cycle * 4), 80, 'p', 0, Math.random());
      }
    }
    function killEnemy(e, byPlayer) {
      if (!e.alive) return;
      e.alive = false;
      const ty = e.type;
      if (byPlayer) {
        kills++;
        addPts(e.pts, e.x, e.y - 12, e.pts >= 500 || mult >= 5);
        bumpChain(ty === 'gardien' ? 12 : ty === 'mine' || ty === 'snakeB' ? 0.5 : 1);
        addHyper(e.hyp);
        shards(e.x, e.y, e.sh);
        if (e.drop) capsule(e.x, e.y, e.drop === '?' ? chooseCap() : e.drop);
        else if (ty !== 'mine' && ty !== 'snakeB') { dropAcc += e.pts; if (dropAcc > dropEvery()) { dropAcc = 0; capsule(e.x, e.y, chooseCap()); } }
        if (e.head) { const nm = headName(e.head); addFace(e.head, e.x, e.y, SNIF(nm)); addPts(2500, e.x, e.y + 22, true); }
        if (!noRevenge && P.alive && state === 'play') revenge(e);
      }
      if (e.beam) { const i = BEAMS.indexOf(e.beam); if (i >= 0) BEAMS.splice(i, 1); e.beam = null; }
      switch (ty) {
        case 'swarm': case 'drone': explode(e.x, e.y, 1, ty === 'drone' ? 'g' : 'm'); SFX.pop(); break;
        case 'dart': explode(e.x, e.y, 1, 'o'); SFX.pop(); break;
        case 'mine':
          explode(e.x, e.y, 1, 'r'); SFX.pop();
          if (!byPlayer) fireRing(e.x, e.y, 8 + Math.min(6, L >> 1), 92, 'r', 0, Math.random());
          break;
        case 'snakeB': explode(e.x, e.y, 1, 'g'); SFX.pop(); break;
        case 'rockS': explode(e.x, e.y, 1, 'o'); debris(e.x, e.y, 3, 80); SFX.pop(); break;
        case 'rockM': case 'rockL': {
          explode(e.x, e.y, ty === 'rockL' ? 2 : 1, 'o'); debris(e.x, e.y, 6, 110); SFX.boom();
          if (byPlayer) {
            const n = ty === 'rockL' ? 3 : 2, sub = ty === 'rockL' ? 'rockM' : 'rockS';
            for (let i = 0; i < n; i++) {
              const r = spawnEnemy(sub, e.x + rnd(-8, 8), e.y + rnd(-8, 8), 0);
              if (!r) break;
              const a = -Math.PI / 2 + (i - (n - 1) / 2) * 1.1 + rnd(-0.2, 0.2), v = rnd(50, 90);
              r.mv = 5; r.vx = Math.cos(a) * v * 0.9 + e.vx * 0.3; r.vy = Math.max(30, Math.sin(a) * v * 0.3 + e.vy); r.vr = rnd(-2, 2); r.seed = rndi(0, 2);
              r.entered = true;
            }
            if (e.rich) { capsule(e.x, e.y, chooseCap()); shards(e.x, e.y, 10); }
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
          if (byPlayer) { capsule(e.x - 16, e.y, 'P'); capsule(e.x + 16, e.y, chooseCap()); shards(e.x, e.y, 16); }
          if (e === miniRef) miniRef = null;
          break;
        }
        default: explode(e.x, e.y, 2, ty === 'miner' ? 'g' : ty === 'stealth' ? 'v' : ty === 'weaver' ? 'y' : ty === 'carrier' ? 'y' : 'o'); SFX.boom();
      }
    }

    function updEnemies(dt) {
      const fm = fireMul(), canFire = state === 'play' && P.alive && P.auto <= 0;
      for (let i = 0; i < enN; i++) {
        const e = EN[i];
        if (!e.alive) continue;
        if (e.delay > 0) { e.delay -= dt; continue; }
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
              if (e.st2 <= 0) { e.k = 2; e.spd = 120; if (canPlay('dash', 0.15)) tone(300, 0.2, 'sawtooth', 0.02, 900); if (L >= 3 && e.y < P.y - 80) fireAimed(e.x, e.y, 118, 'o', 0, 3, 0.3); }
            } else {
              e.spd = Math.min(380 * spdMul(), e.spd + 700 * dt);
              e.x += Math.cos(e.aim) * e.spd * dt; e.y += Math.sin(e.aim) * e.spd * dt;
            }
            break;
          }
          case 4: case 11: {                        // vient se placer, reste un moment, repart sur le côté
            if (e.t < e.dur) { const k = ease(e.t / e.dur); e.y = lerp(e.y0, e.ty, k); }
            else if (e.t < e.dur + e.hold) {
              if (e.mv === 11) { e.tx += (clamp(P.x, 40, LW - 40) - e.tx) * Math.min(1, dt * 0.7); e.x = e.tx + Math.sin(e.t * 1.3) * 16; }
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
            const tx = P.x + Math.cos(e.t * 1.6 + e.ph) * 70, ty = Math.min(P.y - 80, 120 + e.t * 30) + Math.sin(e.t * 2.1 + e.ph) * 30;
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
        if (e.entered && canFire && e.y < LH - 40) behave(e, dt, fm);
        // sortie de l'écran
        if (e.entered && (e.y > LH + 70 || e.y < -280 || e.x < -160 || e.x > LW + 160)) { e.alive = false; if (e === miniRef) miniRef = null; continue; }
        if (!e.entered && e.t > 14) { e.alive = false; continue; }
        // collision avec le vaisseau
        if (P.alive && e.entered) {
          const dx = e.x - P.x, dy = e.y - P.y, rr = e.r * 0.72 + 8;
          if (dx * dx + dy * dy < rr * rr) {
            if (P.inv <= 0 && !god && state === 'play') { hurtPlayer(); if (e.hp < 12 && e.type !== 'gardien') killEnemy(e, true); }
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
            if (e.st <= 0) { e.st = rnd(2.2, 4); fireAimed(e.x, e.y + 7, 112, 'p', 0, L >= 9 ? 3 : L >= 4 ? 2 : 1, 0.16); }
          }
          break;
        case 'frigate': {
          e.aim += angDiff(e.aim, aimAt(e.x, e.y)) * Math.min(1, dt * 3);
          if (!e.fire) break;
          e.st -= dt * fm;
          if (e.st <= 0 && e.y > 10) { e.st = rnd(2.1, 2.9); e.k = 3 + Math.min(3, Math.floor(L / 3)); e.st2 = 0; }
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
          const dx = P.x - e.x, dy = P.y - e.y;
          if (e.k === 0 && dx * dx + dy * dy < 56 * 56) { e.k = 1; e.st2 = 0.62; if (canPlay('mine', 0.1)) tone(1200, 0.08, 'square', 0.03); }
          if (e.k === 1) { e.st2 -= dt; if (e.st2 <= 0) killEnemy(e, false); }
          break;
        }
        case 'sentinel':
          if (!e.fire) break;
          e.st -= dt * Math.min(fm, 1.6);
          if (e.st <= 0 && !e.beam && e.t > e.dur) { e.st = rnd(3.4, 4.6); e.beam = addBeam(e, aimAt(e.x, e.y + 8), 1.0, 0.75, 9, 'm', 0, 8, false); }
          if (e.beam && BEAMS.indexOf(e.beam) < 0) e.beam = null;
          break;
        case 'snakeB':
          e.st -= dt * fm;
          if (e.st <= 0 && e.y > 20) { e.st = rnd(3.2, 5.5); fireAimed(e.x, e.y, 104, 'g', 3, 1, 0); }
          break;
        case 'cruiser': {
          const want = Math.atan2(P.y - e.y, P.x - e.x) - Math.PI / 2;
          e.ang += clamp(angDiff(e.ang, want), -0.55 * dt, 0.55 * dt);
          if (!e.fire) break;
          e.st -= dt * fm;
          if (e.st <= 0 && e.y > 10) {
            e.st = rnd(2.2, 2.8);
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
            if (e.st <= 0) { e.k = 0; e.st = rnd(1.5, 2.3); e.s2 = (e.s2 || 0) + 1; e.tx = rnd(40, LW - 40); e.ty2 = rnd(70, LH * 0.45); if (e.s2 >= 4) { e.tx = e.x < LW / 2 ? -100 : LW + 100; e.ty2 = e.y + 60; } }
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
          } else if (e.st <= 0) { e.st = rnd(1.6, 2.2); e.k = 1.5; }
          break;
        }
        case 'elite':
          if (!e.fire || e.y < 10) break;
          e.st -= dt * fm;
          if (e.st <= 0) {
            e.st = 1.5; e.k++;
            if (e.k % (L >= 6 ? 2 : 3) === 0) fireRing(e.x, e.y, 12 + Math.min(8, L), 96, 'p', 0, Math.random());
            else fireAimed(e.x, e.y + 16, 138, 'p', 3, 3, 0.2);
          }
          break;
        case 'drone':
          e.st -= dt * fm;
          if (e.st <= 0) { e.st = rnd(2.4, 4); if (e.y < P.y - 60) fireAimed(e.x, e.y, 118, 'g', 0, 1, 0); }
          break;
        case 'gardien': gardienFire(e, dt, fm); break;
        default: break;
      }
    }

    // ------------------------------------------------------------- mini-boss : le Gardien (4 variantes de tirs)
    let miniRef = null;
    function spawnGardien() {
      const e = spawnEnemy('gardien', LW / 2, -70, 0);
      if (!e) return null;
      e.mv = 10; e.y0 = -70; e.ty = 128; e.r = 40; e.mini = true; e.var = secI % 4; e.hue = secHue;
      e.max = e.hp = ET.gardien.hp * (1 + 0.4 * L + 0.6 * cycle) * (1 + (rank() - 1) * 0.6);
      e.pts = 8000 + 2000 * L;
      if (heads.length && chance(0.4)) e.head = pickHead();
      e.st = 2.8;
      miniRef = e;
      return e;
    }
    function gardienFire(e, dt, fm) {
      if (e.t < 2.2) return;
      const rage = e.hp < e.max * 0.45, f = Math.min(1.9, fm) * (rage ? 1.3 : 1);
      e.st -= dt * f;
      e.st2 -= dt * f;
      const v = e.var;
      if (v === 0) {
        if (e.st <= 0) { e.st = 1.7; fireAimed(e.x, e.y + 30, 130, 'o', 3, rage ? 7 : 5, 0.17); }
        if (e.st2 <= 0) { e.st2 = 3.6; fireRing(e.x, e.y, rage ? 22 : 16, 92, 'p', 0, Math.random()); }
      } else if (v === 1) {
        if (e.st <= 0) {
          e.st = 0.1; e.aim += rage ? 0.29 : 0.24; e.k++;
          if ((e.k % 40) < 26) { const sp = 100 * spdMul(); ebA(e.x, e.y + 8, e.aim, sp, 'y', 0); ebA(e.x, e.y + 8, e.aim + Math.PI, sp, 'y', 0); if (rage) ebA(e.x, e.y + 8, -e.aim, sp, 'o', 0); }
        }
        if (e.st2 <= 0) { e.st2 = 2.6; fireAimed(e.x - 44, e.y + 30, 140, 'o', 2, 1, 0); fireAimed(e.x + 44, e.y + 30, 140, 'o', 2, 1, 0); }
      } else if (v === 2) {
        if (e.st <= 0) {
          e.st = rage ? 0.9 : 1.3;
          for (let s = -1; s <= 1; s += 2) { const m = spawnEnemy('mine', e.x + s * 44, e.y + 30, 0); if (m) { m.mv = 5; m.vx = s * rnd(10, 40); m.vy = rnd(40, 70); m.vr = 1; m.entered = true; m.pts = 20; m.sh = 0; } }
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
        if (P.alive && P.inv <= 0 && state === 'play') {
          const dx = b.x - P.x, dy = b.y - P.y + 1, rr = b.r + pr;
          if (dx * dx + dy * dy < rr * rr) { swapOut(EB, i, ebN); ebN--; hurtPlayer(); }
        }
      }
      for (let i = BEAMS.length - 1; i >= 0; i--) {
        const bm = BEAMS[i];
        bm.t += dt;
        const o = bm.owner;
        if (o && (o.alive === false || (o.uid !== undefined && o.uid !== bm.ouid))) { BEAMS.splice(i, 1); continue; }
        if (o) { bm.x = o.x + bm.ox; bm.y = o.y + bm.oy; }
        if (bm.track && bm.t < bm.warn * 0.7) bm.ang += angDiff(bm.ang, aimAt(bm.x, bm.y)) * Math.min(1, dt * 2.5);
        if (bm.t >= bm.warn && bm.t - dt < bm.warn) { SFX.laser(); shake = Math.max(shake, 3); }
        if (bm.t > bm.warn + bm.dur) { BEAMS.splice(i, 1); continue; }
        if (bm.t >= bm.warn && P.alive && P.inv <= 0 && state === 'play') {
          const ex = bm.x + Math.cos(bm.ang) * bm.len, ey = bm.y + Math.sin(bm.ang) * bm.len;
          const rr = bm.w * 0.5 + 3;
          if (segDist2(P.x, P.y, bm.x, bm.y, ex, ey) < rr * rr) hurtPlayer();
        }
      }
    }

    // ------------------------------------------------------------- bandeaux (annonces)
    const BAN = { main: '', sub: '', sub2: '', col: '#fff', t: 0, dur: 0, kind: 0 };
    function banner(main, sub, col, dur, kind, sub2) { BAN.main = main; BAN.sub = sub || ''; BAN.sub2 = sub2 || ''; BAN.col = col || '#fff'; BAN.t = 0; BAN.dur = dur || 2; BAN.kind = kind || 0; }
    let tally = [];                              // lignes du bilan de secteur

    // ------------------------------------------------------------- directeur : secteurs, vagues, événements
    const dir = { phase: 'intro', t: 0, wave: 0, nW: 5, plan: [], pi: 0, groups: [], gi: 0, wt: 0, last: 0, ev: null, evT: 0, evNext: 0, swapped: false, prevGap: LW / 2 };
    const GROUPS = [                             // [sorte, secteur d'apparition, poids]
      ['col', 0, 3], ['vee', 0, 2], ['sweepL', 0, 2], ['sweepR', 0, 2], ['loop', 0, 2], ['darts', 0, 2],
      ['frig', 1, 3], ['rocks', 1, 1.5], ['elite', 1, 0.8], ['miner', 2, 2.2], ['snake', 2, 1.6], ['sent', 3, 2.2], ['drones', 3, 1.4],
      ['stealth', 4, 2.4], ['cruiser', 5, 2.2], ['weaver', 6, 2.4]
    ];
    const NOVELTY = [null, 'frig', 'miner', 'sent', 'stealth', 'cruiser', 'weaver', 'elite'];
    function pickGroup() {
      let tot = 0;
      const lim = cycle > 0 ? 7 : secI;
      for (let i = 0; i < GROUPS.length; i++) { const g = GROUPS[i]; if (g[1] <= lim) tot += g[2] * (g[1] === secI ? 1.8 : 1); }
      let r = Math.random() * tot;
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
        if (w === 0) g.push(W(0.5, 'col', 5, X * 0.3, 40), W(2.8, 'col', 5, X * 0.7, 40), W(5.4, 'vee', 7), W(7, 'carrier', 0, 'P'), W(9.2, 'sweepL', 6), W(11.8, 'sweepR', 6), W(14.4, 'col', 6, X * 0.5, 80), W(16, 'carrier', 0, 'P'));
        else if (w === 1) g.push(W(0.5, 'sweepL', 7), W(3, 'darts', 2), W(5, 'vee', 7), W(7.5, 'darts', 2), W(9.5, 'loop', 6), W(10.5, 'carrier', 0, '?'), W(12.8, 'sweepR', 7), W(15, 'col', 6, X * 0.25, 50), W(15.4, 'col', 6, X * 0.75, 50));
        else if (w === 2) g.push(W(0.5, 'col', 6, X * 0.5, 90), W(2.2, 'loop', 6), W(4.5, 'darts', 3), W(6.5, 'vee', 9), W(8, 'carrier', 0, 'M'), W(10, 'sweepL', 8), W(10.6, 'sweepR', 8), W(13.2, 'darts', 3), W(15, 'col', 8, X * 0.5, 110));
        else if (w === 3) g.push(W(0.5, 'vee', 9), W(3, 'darts', 4), W(5, 'sweepL', 8), W(6.6, 'sweepR', 8), W(9, 'col', 7, X * 0.3, 60), W(9.4, 'col', 7, X * 0.7, 60), W(10.2, 'carrier', 0, '?'), W(12, 'loop', 8), W(14, 'darts', 4));
        else g.push(W(0.5, 'sweepL', 9), W(1.5, 'sweepR', 9), W(4.2, 'vee', 11), W(6.5, 'darts', 5), W(8.5, 'carrier', 0, 'O'), W(9, 'col', 8, X * 0.5, 120), W(11.5, 'loop', 8), W(13.5, 'sweepL', 10), W(14, 'sweepR', 10), W(16.5, 'darts', 5));
        return g;
      }
      const nG = Math.min(14, 6 + Math.floor(L * 0.45) + Math.min(2, cycle));
      const gap = clamp(2.5 - 0.09 * L, 1.1, 2.5);
      let t = 0.5;
      if (w === 0 && NOVELTY[secI] && cycle === 0) { g.push(W(t, NOVELTY[secI], 0)); t += gap * 1.7; }
      for (let i = 0; i < nG; i++) {
        const k = pickGroup();
        g.push(W(t, k, 0));
        t += gap * (k === 'frig' || k === 'cruiser' || k === 'elite' || k === 'snake' || k === 'weaver' ? 1.55 : 1) * rnd(0.85, 1.15);
      }
      g.push(W(rnd(2.5, Math.max(3, t * 0.6)), 'carrier', 0, '?'));
      if (L >= 6 && chance(0.5)) g.push(W(rnd(4, Math.max(5, t * 0.8)), 'carrier', 0, '?'));
      g.sort((a, b) => a.at - b.at);
      return g;
    }
    function sz(base, extra) { return Math.max(1, Math.round((base + Math.random() * extra) * densMul())); }
    function setFire(e) { e.fire = !(cycle === 0 && secI === 0 && dir.wave <= 1); }
    function spawnGroup(G) {
      const k = G.k, X = LW;
      switch (k) {
        case 'col': {
          const n = G.n || sz(5, 3), x = G.a >= 0 ? G.a : rnd(70, X - 70), amp = G.b >= 0 ? G.b : rnd(30, 90), spd = rnd(70, 92) * Math.min(1.35, spdMul() + 0.1);
          for (let i = 0; i < n; i++) { const e = spawnEnemy('swarm', x, -20, i * 0.34); if (!e) break; e.mv = 1; e.x0 = x; e.amp = amp; e.w = 1.7; e.ph = 0; e.spd = spd; setFire(e); }
          break;
        }
        case 'vee': {
          const n = G.n || sz(7, 4), cx = G.a >= 0 ? G.a : rnd(110, X - 110), mid = (n - 1) / 2, spd = rnd(64, 80) * Math.min(1.3, spdMul() + 0.1);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('swarm', 0, -20, Math.abs(i - mid) * 0.2); if (!e) break;
            e.mv = 1; e.x0 = clamp(cx + (i - mid) * 25, 16, X - 16); e.x = e.x0; e.amp = 10; e.w = 2; e.ph = i * 0.5; e.spd = spd; setFire(e);
          }
          break;
        }
        case 'sweepL': case 'sweepR': {
          const n = G.n || sz(6, 4), s = k === 'sweepL' ? 1 : -1, y0 = rnd(40, 110), dur = rnd(4.4, 5.2) / Math.min(1.25, spdMul() + 0.15);
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
          const n = G.n || sz(6, 3), x = rnd(60, X * 0.4), s = chance(0.5), xa = s ? x : X - x, xb = X - xa, dur = rnd(5, 5.8);
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
            const x = clamp(X / 2 + (i - (n - 1) / 2) * 62 + rnd(-20, 20), 24, X - 24);
            const e = spawnEnemy('dart', x, -24, i * 0.45); if (!e) break;
            e.mv = 3; e.x0 = x; e.ty = rnd(60, 150); e.hold = rnd(0.9, 1.4);
          }
          if (!dir.dartsSaid && secI === 0 && cycle === 0) { dir.dartsSaid = true; ftext(X / 2, 120, 'Attention : kamikazes !', '#ff9a1f', 14, 2, -6, 0); }
          break;
        }
        case 'carrier': {
          const e = spawnEnemy('carrier', rnd(50, X - 50), -24, 0); if (!e) break;
          e.mv = 1; e.x0 = e.x; e.amp = 30; e.w = 1.2; e.spd = 48; e.drop = G.a !== -1 ? G.a : '?';
          break;
        }
        case 'frig': {
          const n = G.n || (L >= 4 && chance(0.6) ? 2 : 1);
          for (let i = 0; i < n; i++) {
            const x = n === 1 ? rnd(80, X - 80) : (i === 0 ? rnd(60, X * 0.4) : rnd(X * 0.6, X - 60));
            const e = spawnEnemy('frigate', x, -40, i * 0.8); if (!e) break;
            e.mv = 4; e.y0 = -40; e.ty = rnd(90, 170); e.dur = 1.6; e.hold = rnd(8, 10.5); e.amp = 30; e.w = 0.8; e.st = 1.2;
          }
          break;
        }
        case 'rocks': {
          const n = G.n || sz(4, 3);
          for (let i = 0; i < n; i++) spawnRock(i * 0.4);
          break;
        }
        case 'miner': {
          const s = chance(0.5) ? 1 : -1;
          const e = spawnEnemy('miner', s > 0 ? -30 : X + 30, rnd(70, 150), 0); if (!e) break;
          e.mv = 6; e.vx = s * rnd(58, 72); e.ty = e.y; e.st = 0.6; e.entered = true;
          break;
        }
        case 'sent': {
          const n = G.n || (L >= 5 ? 2 : 1);
          for (let i = 0; i < n; i++) {
            const x = n === 1 ? rnd(70, X - 70) : (i === 0 ? rnd(40, 110) : rnd(X - 110, X - 40));
            const e = spawnEnemy('sentinel', x, -30, i * 0.6); if (!e) break;
            e.mv = 4; e.y0 = -30; e.ty = rnd(70, 140); e.dur = 1.5; e.hold = 10; e.amp = 12; e.w = 0.9; e.st = 0.8;
          }
          break;
        }
        case 'snake': {
          const n = G.n || sz(7, 4), x = rnd(110, X - 110);
          const h = spawnEnemy('snakeH', x, -20, 0); if (!h) break;
          h.mv = 7; h.x0 = x; h.amp = rnd(60, 100); h.w = rnd(1, 1.4); h.spd = rnd(46, 58) * Math.min(1.3, spdMul() + 0.1); h.ph = 0;
          h.hist = new Float32Array(128);
          for (let j = 0; j < 64; j++) { h.hist[j * 2] = x; h.hist[j * 2 + 1] = -20; }
          for (let i = 0; i < n; i++) { const s = spawnEnemy('snakeB', x, -30, 0); if (!s) break; s.mv = 8; s.lead = h; s.seg = i; s.st = rnd(1.5, 4) + i * 0.25; }
          break;
        }
        case 'cruiser': {
          const e = spawnEnemy('cruiser', rnd(90, X - 90), -40, 0); if (!e) break;
          e.mv = 4; e.y0 = -40; e.ty = rnd(110, 150); e.dur = 2; e.hold = 13; e.amp = 40; e.w = 0.55; e.st = 1.6;
          for (let i = 0; i < 2; i++) { const s = spawnEnemy('swarm', 0, 0, 1 + i * 0.3); if (!s) break; s.mv = 1; s.x0 = clamp(e.x + (i ? 40 : -40), 20, X - 20); s.amp = 18; s.w = 2; s.spd = 60; }
          break;
        }
        case 'stealth': {
          const n = G.n || sz(2, 2);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('stealth', rnd(40, X - 40), -20, i * 0.7); if (!e) break;
            e.mv = 12; e.cloak = 0.15; e.k = 0; e.st = rnd(1.4, 2.2); e.tx = rnd(40, X - 40); e.ty2 = rnd(70, LH * 0.42);
          }
          break;
        }
        case 'weaver': {
          const n = G.n || (L >= 9 ? 2 : 1);
          for (let i = 0; i < n; i++) {
            const e = spawnEnemy('weaver', n === 1 ? rnd(90, X - 90) : (i ? X * 0.72 : X * 0.28), -30, i * 0.5); if (!e) break;
            e.mv = 4; e.y0 = -30; e.ty = rnd(100, 160); e.dur = 1.6; e.hold = 9; e.amp = 20; e.w = 0.6; e.st = 0.5;
          }
          break;
        }
        case 'elite': {
          const e = spawnEnemy('elite', rnd(80, X - 80), -40, 0); if (!e) break;
          e.mv = 11; e.y0 = -40; e.ty = rnd(100, 140); e.dur = 1.8; e.hold = rnd(12, 14); e.tx = e.x; e.st = 1.4;
          eliteSeq++;
          if (heads.length && (eliteSeq % 3 === 1 || chance(0.2))) e.head = pickHead();
          if (eliteSeq % 2 === 0) e.drop = '?';
          break;
        }
        case 'drones': {
          const n = G.n || sz(4, 3);
          for (let i = 0; i < n; i++) {
            const s = i & 1 ? 1 : -1;
            const e = spawnEnemy('drone', s > 0 ? X + 20 : -20, rnd(40, 120), i * 0.35); if (!e) break;
            e.mv = 9; e.vx = -s * 90; e.vy = 20; e.st = rnd(1.5, 3);
          }
          break;
        }
        default: break;
      }
    }
    function spawnRock(delay) {
      const r = Math.random(), size = r < 0.3 ? 'rockL' : r < 0.72 ? 'rockM' : 'rockS';
      const e = spawnEnemy(size, rnd(20, LW - 20), -40, delay || 0);
      if (!e) return;
      e.mv = 5; e.vx = rnd(-22, 22); e.vy = rnd(48, 96) * Math.min(1.4, spdMul() + 0.15); e.vr = rnd(-1.6, 1.6); e.seed = rndi(0, 2);
      e.rich = size !== 'rockS' && chance(0.13);
      if (e.rich) { e.pts *= 2; e.sh += 4; }
    }

    // ---- événements de secteur
    const EVS = ['rocks', 'mines', 'storm', 'dark', 'lasers', 'hole'];
    function chooseEvent(w) {
      if (SEC.event === 'mix') return w === 1 || w === 3 || w === 4 ? EVS[(w * 7 + cycle * 3 + rndi(0, 5)) % 6] : null;
      if (SEC.event && (w === 1 || w === 3 || (cycle > 0 && w === 4))) return SEC.event;
      if (cycle > 0 && w === 2 && secI > 0) return EVS[rndi(0, Math.min(5, secI - 1))];
      return null;
    }
    function startEvent(ev) {
      dir.ev = ev; dir.evT = 0; dir.evNext = 1.2;
      banner(EVENT_NAMES[ev], EVENT_TIPS[ev], SEC.acc, 2.4, 1);
      SFX.warn();
      if (ev === 'hole') hole = { x: rnd(90, LW - 90), y: -100, k: 0, t: 0, leaving: false };
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
          if (ev === 'rocks') { spawnRock(0); dir.evNext = rnd(0.5, 0.85) / Math.sqrt(densMul()); }
          else if (ev === 'mines') {
            dir.evNext = 1.8;
            const gapC = rnd(50, LW - 50);
            for (let x = 22; x < LW - 10; x += 46) {
              if (Math.abs(x - gapC) < 50 || chance(0.3)) continue;
              const m = spawnEnemy('mine', x + rnd(-8, 8), -20, 0);
              if (m) { m.mv = 5; m.vx = 0; m.vy = 40; m.vr = rnd(-1, 1); m.pts = 40; }
            }
          } else if (ev === 'storm') {
            dir.evNext = rnd(1.3, 2.3) / Math.sqrt(densMul());
            BOLTS.push({ x: clamp(P.x + rnd(-70, 70), 16, LW - 16), t: 0, warn: 1.1, dur: 0.32, seed: Math.random() * 100 });
            if (chance(0.4)) glitch = 0.35;
          } else if (ev === 'lasers') {
            dir.evNext = clamp(3.8 - 0.1 * L, 2.6, 3.8);
            const two = L >= 9 && chance(0.5), gw = two ? 76 : 92;
            let c = clamp(dir.prevGap + rnd(-120, 120), gw / 2 + 10, LW - gw / 2 - 10);
            dir.prevGap = c;
            let gaps = [c - gw / 2, c + gw / 2];
            if (two) { const c2 = c < LW / 2 ? c + rnd(140, 180) : c - rnd(140, 180); if (c2 > gw / 2 && c2 < LW - gw / 2) gaps = c2 < c ? [c2 - gw / 2, c2 + gw / 2, c - gw / 2, c + gw / 2] : [c - gw / 2, c + gw / 2, c2 - gw / 2, c2 + gw / 2]; }
            GATES.push({ y: -12, t: 0, gaps });
          } else dir.evNext = 99;
        }
      }
      for (let i = BOLTS.length - 1; i >= 0; i--) {
        const b = BOLTS[i];
        b.t += dt;
        if (b.t >= b.warn && b.t - dt < b.warn) { SFX.zap(); flashA = Math.max(flashA, 0.18); flashCol = '#c9b8ff'; shake = Math.max(shake, 4); light(b.x, LH / 2, 200, 0.4); }
        if (b.t >= b.warn && b.t < b.warn + 0.18 && P.alive && Math.abs(P.x - b.x) < 15) hurtPlayer();
        if (b.t > b.warn + b.dur) BOLTS.splice(i, 1);
      }
      for (let i = GATES.length - 1; i >= 0; i--) {
        const g = GATES[i];
        g.t += dt; g.y += 62 * dt;
        if (g.t > 1.2 && P.alive && Math.abs(P.y - g.y) < 6) {
          let safe = false;
          for (let j = 0; j < g.gaps.length; j += 2) if (P.x > g.gaps[j] + 4 && P.x < g.gaps[j + 1] - 4) safe = true;
          if (!safe) hurtPlayer();
        }
        if (g.y > LH + 20) GATES.splice(i, 1);
      }
      if (hole && !hole.boss) {
        hole.t += dt;
        hole.y += (hole.leaving ? 80 : 20) * dt;
        hole.k = hole.leaving ? Math.max(0, hole.k - dt * 0.8) : Math.min(1, hole.k + dt * 0.45);
        hole.x = clamp(hole.x + Math.sin(hole.t * 0.5) * 14 * dt, 60, LW - 60);
        if (P.alive && hole.k > 0.3) { const dx = P.x - hole.x, dy = P.y - hole.y; if (dx * dx + dy * dy < 20 * 20) hurtPlayer(); }
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
      dir.groups = buildWave(dir.wave - 1);
      const ev = chooseEvent(dir.wave - 1);
      if (ev) startEvent(ev);
      else if (dir.wave > 1) banner('VAGUE ' + dir.wave + ' / ' + dir.nW, '', SEC.acc, 1.3, 5);
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
      const nb = 5000 * n;
      score += nb;
      tally.push(['Secteur terminé', nb]);
      if (secNoHit) { const v = 15000 * n; score += v; tally.push(['Sans être touché !', v]); }
      sectorsDone++;
      banner('SECTEUR TERMINÉ', SEC.name, SEC.acc, 3.6, 6);
      celebrate(CHEERS[(sectorsDone * 5 + rndi(0, 3)) % CHEERS.length]);
      SFX.friend();
    }
    function startJump() {
      dir.phase = 'jump'; dir.t = 0; dir.swapped = false;
      P.auto = 1;
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
      if (t >= 2.2 && !dir.swapped) { dir.swapped = true; flashA = 1; flashCol = '#ffffff'; nextSector(); }
      if (t > 3.9) { P.auto = 0; warp = 0; scrollV = 60; dir.phase = 'intro'; dir.t = 0; }
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
      fetchHeads();
      bgDirty = true;
      newSectorBg();
      if (withTitle) banner(cycle > 0 ? 'CYCLE ' + ROMAN[Math.min(9, cycle)] + ' · SECTEUR ' + (secI + 1) : 'SECTEUR ' + (secI + 1), SEC.name, SEC.acc, 3.2, 3, cycle > 0 && secI === 0 ? 'Tout revient… en plus coriace !' : SEC.news);
    }

    // ------------------------------------------------------------- BOSS : infrastructure
    const BINIT = {}, BUPD = {}, BDRAW = {};
    const hpB = () => (1 + 0.38 * L + 0.9 * cycle) * (1 + (rank() - 1) * 0.5);
    let forceFace = null;                        // (tests) forcer un boss avec / sans tête de copain
    function mkPart(x, y, r, mode, hp) { return { uid: uidSeq++, x, y, r, mode, hp: hp || 0, max: hp || 0, alive: true, flash: 0, hide: false, aim: Math.PI / 2, st: 0, a: 0, k: 0, depth: 0, ox: 0, oy: 0, dash: false, vx: 0, vy: 0 }; }
    function spawnBoss() {
      const kind = SEC.boss;
      bossCount++;
      fetchHeads();
      const want = forceFace === null ? (bossCount + cycle) % 2 === 1 : forceFace;
      forceFace = null;
      const face = heads.length && want ? pickHead() : null;
      B = { kind, x: LW / 2, y: -160, t: 0, hp: 0, maxHp: 0, phase: 0, nph: 3 + (cycle > 0 ? 1 : 0), ready: false, inv: 0, dying: false, dT: 0,
        parts: [], head: face, head2: null, st: 0, st2: 0, st3: 0, a: 0, a2: 0, k: 0, k2: 0, mode: 0, mT: 0, name: BOSS_NAMES[kind], flash: 0,
        enterT: 2.6, ty: 150, custom: false, bx: LW / 2, by: 150, open: 0, boomT: 0, cv: null };
      BINIT[kind](B);
      B.maxHp = B.hp;
      banner(B.name, face ? OH(headName(face)) : (cycle > 0 ? 'Version ' + ROMAN[Math.min(9, cycle)] + ' — plus féroce !' : ''), '#ff6b8a', 2.6, 8);
      if (face) SFX.friend();
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
      score += Math.round(d * 6) * mult;
      if (p) p.flash = 0.06;
      if (B.hp <= 0.001) { B.hp = 0; bossDefeated(); return; }
      if (!B.custom) {
        const ph = Math.min(B.nph - 1, Math.floor((1 - B.hp / B.maxHp) * B.nph));
        if (ph > B.phase) { B.phase = ph; onBossPhase(); }
      }
    }
    function hitBossPart(p, dmg, x, y) {
      if (!B || B.dying) return;
      if (p.mode === 'armor') dmg *= 0.25;
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
      shards(p.x, p.y, 10);
      addPts(1500, p.x, p.y - 14, true);
      bumpChain(4);
      freezeT = Math.max(freezeT, 0.05);
      if (B && B.onPart) B.onPart(B, p);
    }
    function bossDefeated() {
      const b = B;
      b.dying = true; b.dT = 0; b.boomT = 0;
      slowT = 1.8; slowK = 0.3; freezeT = 0.12; flashA = 0.6; flashCol = '#ffffff'; shake = Math.max(shake, 16);
      cancelBullets(0, 0, -1, true);
      BEAMS.length = 0;
      for (let i = 0; i < enN; i++) { const e = EN[i]; if (e.alive) killEnemy(e, true); }
      SFX.big();
      const n = secI + 1 + 8 * cycle;
      const base = 20000 * n, quick = Math.max(0, Math.round((110 - b.t) * 300 * (1 + 0.1 * n) / 100) * 100);
      score += base + quick;
      tally.push(['Boss vaincu en ' + Math.round(b.t) + ' s', base + quick]);
      if (b.head) { const v = 5000 * n; score += v; tally.push([headName(b.head) + ' pleure !', v]); }
      if (b.head2) { const v = 5000 * n; score += v; tally.push([headName(b.head2) + ' pleure aussi !', v]); }
    }
    function updBoss(dt) {
      const b = B;
      if (!b) return;
      b.t += dt;
      if (b.flash > 0) b.flash -= dt;
      for (let i = 0; i < b.parts.length; i++) if (b.parts[i].flash > 0) b.parts[i].flash -= dt;
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
          capsule(b.x - 24, b.y, 'S'); capsule(b.x + 24, b.y, chooseCap()); if (P.power < 6) capsule(b.x, b.y - 20, 'P');
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
      BUPD[b.kind](b, dt, b.ready && state === 'play' && P.alive && P.auto <= 0);
      // collision corps du boss / vaisseau
      if (P.alive && b.ready) {
        for (let i = 0; i < b.parts.length; i++) {
          const p = b.parts[i];
          if (!p.alive || p.hide) continue;
          const dx = p.x - P.x, dy = p.y - P.y, rr = p.r * 0.8 + 8;
          if (dx * dx + dy * dy < rr * rr) { hurtPlayer(); break; }
        }
      }
    }
    function hitBlink() { return ((rt * 20) | 0) % 3 === 0; }   // éclat de touche intermittent (pas de voile blanc permanent)
    function bfm() { return Math.min(2.2, fireMul()) * (B && B.phase >= B.nph - 1 ? 1.15 : 1); }

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
          fireRing(b.x, b.y, 18 + Math.min(10, L), 88, 'o', 1, Math.random());
          if (alive > 0 && chance(0.55)) {           // une lune fonce sur le joueur (avertissement : elle clignote)
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
      const off = [[-100, -5], [-52, 18], [52, 18], [100, -5]];
      b.tur = [];
      for (let i = 0; i < 4; i++) { const p = mkPart(0, 0, 14, 'sub', 95 * hpB()); p.ox = off[i][0]; p.oy = off[i][1]; p.st = 1 + i * 0.6; b.tur.push(p); b.parts.push(p); }
      b.core = mkPart(0, 0, 22, 'block', 0); b.core.ox = 0; b.core.oy = 12;
      b.parts.push(b.core);
      b.hull = mkPart(0, 0, 40, 'block', 0); b.hull.ox = 0; b.hull.oy = -18; b.parts.push(b.hull);
      for (const [ox, oy, r] of [[-78, -14, 26], [78, -14, 26], [-124, -10, 18], [124, -10, 18]]) { const w = mkPart(0, 0, r, 'block', 0); w.ox = ox; w.oy = oy; b.parts.push(w); }
      b.hp = 4 * 95 * hpB() + 640 * hpB();
      b.left = 4;
      b.onPart = (bb) => {
        bb.left--;
        if (bb.left === 2) { bb.phase = 1; onBossPhase(); }
        if (bb.left === 0) { bb.phase = 2; bb.core.mode = 'core'; onBossPhase(); banner('LE CŒUR EST À NU !', 'Vise le centre', '#ffb347', 1.8, 9); }
      };
      b.coreMax = 640 * hpB();
    };
    BUPD.vela = (b, dt, act) => {
      if (b.ready) { b.x = LW / 2 + Math.sin((b.t - b.enterT) * 0.35) * 26; b.y = b.ty + Math.sin(b.t * 0.7) * 6; }
      for (let i = 0; i < b.parts.length; i++) { const p = b.parts[i]; p.x = b.x + p.ox; p.y = b.y + p.oy; }
      if (b.left === 0 && b.phase === 2 && b.hp < b.coreMax * 0.5) { b.phase = 3; onBossPhase(); }
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
          const side = chance(0.5) ? 1 : -1;
          const bm = addBeam(b.core, Math.PI / 2 + side * 0.85, 1.1, 2.2, 14, 'o', 0, 0, false);
          bm.spin = -side * 0.78;
        }
        b.st2 -= dt * bfm();
        if (b.st2 <= 0) { b.st2 = b.phase >= 3 ? 1.2 : 1.7; fireArc(cx, cy + 10, aimAt(cx, cy), 1.1, b.phase >= 3 ? 9 : 7, 120, 'v', 2); }
        if (b.phase >= 3) {
          b.st3 -= dt * bfm();
          if (b.st3 <= 0) { b.st3 = 2.4; fireRing(cx, cy, 20, 84, 'o', 3, Math.random()); }
        }
      }
    };
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
      }
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
        if (hd.y < -90 - b.n * 18) { b.mode = 2; b.mT = 0; b.warnX = clamp(P.x + rnd(-30, 30), 40, LW - 40); hd.x = b.warnX; hd.y = -110; wormTrail(b, hd.x, hd.y); SFX.warn(); }
      } else if (b.mode === 2) {                  // avertissement : colonne rouge
        hd.y = -110;
        if (b.mT > 1.15) { b.mode = 3; b.mT = 0; shake = Math.max(shake, 5); }
      } else if (b.mode === 3) {                  // plongée
        hd.y += 440 * spdMul() * dt;
        if (act) {
          b.st3 -= dt;
          if (b.st3 <= 0) {
            b.st3 = 0.12;
            const s = b.segs[(Math.random() * b.n) | 0];
            if (s.y > 20 && s.y < LH - 40) { const v = 70 * spdMul(); eb(s.x, s.y, -v, 10, 'v', 3); eb(s.x, s.y, v, 10, 'v', 3); }
          }
        }
        if (hd.y > LH + 380) {
          b.diveN--;
          if (b.diveN > 0) { b.mode = 2; b.mT = 0; b.warnX = clamp(P.x + rnd(-30, 30), 40, LW - 40); hd.x = b.warnX; hd.y = -110; SFX.warn(); }
          else { b.mode = 0; b.mT = 0; hd.x = rnd(80, LW - 80); hd.y = -80; b.u = Math.random() * 10; }
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
        if (b.phase >= 2) fireRing(hd.x, hd.y, 14 + Math.min(8, L >> 1), 92, 'g', 0, Math.random());
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
          if (e) { e.mv = 9; e.vx = s * 120; e.vy = 60; e.st = rnd(1.5, 3); e.pts = 60; e.sh = 1; e.entered = true; part(e.x, e.y, 0, 0, 0.2, 10, 24, GL.g, true, 0); }
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
        if (b.phase >= 2) { b.st3 -= dt * f; if (b.st3 <= 0) { b.st3 = 2.2; fireRing(b.x, b.y, 20 + Math.min(8, L >> 1), 86, 'g', 1, Math.random()); } }
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
      if (both && P.alive && segDist2(P.x, P.y, b.A.x, b.A.y, b.Z.x, b.Z.y) < 7 * 7) hurtPlayer();
      const f = bfm();
      if (b.A.alive) {
        b.A.st -= dt * f * (b.rage ? 1.4 : 1);
        if (b.A.st <= 0) { b.A.st = b.phase >= 1 ? 2.1 : 2.6; fireRing(b.A.x, b.A.y, 12 + b.phase * 2 + Math.min(6, L >> 1), 84, 'v', 0, Math.random()); }
      }
      if (b.Z.alive) {
        b.Z.st -= dt * f * (b.rage ? 1.4 : 1);
        if (b.Z.st <= 0) { b.Z.st = 2.2; b.Z.k = 4; b.Z.a = 0; }
        if (b.Z.k > 0) { b.Z.a -= dt; if (b.Z.a <= 0) { b.Z.a = 0.12; b.Z.k--; fireAimed(b.Z.x, b.Z.y + 20, 140, 'o', 3, b.phase >= 1 ? 3 : 1, 0.16); } }
      }
      if (both && b.phase >= 2) {
        b.st -= dt * f;
        if (b.st <= 0) { b.st = 0.55; const k = Math.random(); eb(lerp(b.A.x, b.Z.x, k), lerp(b.A.y, b.Z.y, k), rnd(-20, 20), 70 * spdMul(), 'p', 0); }
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
        if (b.dashT <= 0 && act) { b.dashT = rnd(3.2, 5); b.dash = 0.45; b.tx = clamp(b.x + (b.x < LW / 2 ? 1 : -1) * rnd(90, 150), 60, LW - 60); }
        if (b.dash > 0) { b.dash -= dt; if (b.ghosts.length < 6 && (b.t * 30) % 1 < 0.5) b.ghosts.push({ x: b.x, y: b.y, t: 0.35 }); }
        else b.tx += (clamp(P.x, 60, LW - 60) - b.tx) * Math.min(1, dt * 0.8);
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
          if (m) { m.mv = 5; m.vx = rnd(-40, 40); m.vy = 70; m.k = 1; m.st2 = 1.3; m.entered = true; m.pts = 20; m.sh = 0; }
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
    function drawPlayer() {
      if (!P.alive) return;
      const hyp = P.hyperT > 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = 1; i < trailN; i++) {
        ctx.strokeStyle = hyp ? TRM[i] : TRC[i];
        ctx.lineWidth = 6 * (1 - i / trailN) + 0.6;
        ctx.beginPath(); ctx.moveTo(TRAIL[i * 2 - 2], TRAIL[i * 2 - 1]); ctx.lineTo(TRAIL[i * 2], TRAIL[i * 2 + 1]); ctx.stroke();
      }
      const fl = 13 + Math.sin(rt * 47) * 3 + clamp(-P.vy / 40, -4, 8) + (P.auto > 0 ? warp * 30 : 0);
      const eg = hyp ? GL.m : GL.c;
      for (let s = -1; s <= 1; s += 2) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(eg, P.x + s * 3 + P.bank * 1.5 - 4.5, P.y + 14, 9, fl + 6);
        ctx.drawImage(GL.w, P.x + s * 3 + P.bank * 1.5 - 2, P.y + 15, 4, fl * 0.5);
      }
      if (hyp) glowAt(GL.m, P.x, P.y, 90 + Math.sin(rt * 20) * 8, 0.45);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const blink = P.inv > 0 && ((rt * 14) | 0) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.35;
      const fr = clamp(Math.round((P.bank + 1) * 4), 0, 8);
      dspr(SPR.ship[fr], P.x, P.y);
      ctx.globalAlpha = 1;
      // drones
      for (let i = 0; i < P.opts; i++) {
        const o = OPT[i];
        ctx.globalCompositeOperation = 'lighter'; glowAt(hyp ? GL.m : GL.v, o.x, o.y, 22, 0.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#efe6ff'; circ(ctx, o.x, o.y, 3.6); ctx.fill();
        ctx.strokeStyle = '#b37bff'; ctx.lineWidth = 1.3; circ(ctx, o.x, o.y, 6.2); ctx.stroke();
      }
      // cœur (zone de touche) toujours visible
      ctx.globalCompositeOperation = 'lighter'; glowAt(GL.c, P.x, P.y - 1, 12, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff'; circ(ctx, P.x, P.y - 1, 2.2); ctx.fill();
      if (P.inv > 0 && P.hitFlash <= 0 && P.auto <= 0) {
        ctx.strokeStyle = 'rgba(120,240,255,' + Math.min(0.6, P.inv * 0.4).toFixed(2) + ')'; ctx.lineWidth = 1.5;
        circ(ctx, P.x, P.y, 26 + Math.sin(rt * 10) * 1.5); ctx.stroke();
      }
      if (P.shield === 1 && state === 'play') {
        ctx.strokeStyle = 'rgba(255,60,90,' + (0.35 + 0.3 * Math.sin(rt * 9)).toFixed(2) + ')'; ctx.lineWidth = 2;
        circ(ctx, P.x, P.y, 24); ctx.stroke();
      }
      if (P.magT > 0) {
        ctx.strokeStyle = 'rgba(255,211,77,0.5)'; ctx.lineWidth = 1.2; ctx.setLineDash(DASH);
        ctx.beginPath(); ctx.arc(P.x, P.y, 40, rt * 2, rt * 2 + TAU); ctx.stroke(); ctx.setLineDash(NODASH);
      }
    }
    function drawShots() {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = P.power >= 4 || P.opts >= 2 ? 0.78 : 0.92;
      let rot = false;
      for (let i = 0; i < psN; i++) {
        const s = PS[i], sp = s.spr;
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
      if (P.alive) {
        const r = (95 + Math.sin(rt * 9) * 4) / 4;
        c.drawImage(LIGHT, P.x / 4 - r, P.y / 4 - r, 2 * r, 2 * r);
        c.globalAlpha = 0.85; c.drawImage(LIGHT, P.x / 4 - r * 0.9, (P.y - 150) / 4 - r * 1.5, r * 1.8, r * 3);
        c.globalAlpha = 0.5; c.drawImage(LIGHT, P.x / 4 - r * 1.2, (P.y - 300) / 4 - r * 1.3, r * 2.4, r * 2.6);
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
      drawPlayer();
      drawParticles();
      drawDarkness();
      if (darkK >= 0.02) drawShots();
      drawPickups();
      drawBeams();
      drawBolts();
      drawEB();
      drawFacesTexts();
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
      if (P.hyperT > 0) txt('×2 HYPER', mx + 40, 23, 9, '#ff7ad8', 'left', false, 3);
      // secteur / vague
      const lk = secI + '|' + cycle + '|' + dir.wave + '|' + dir.nW + '|' + dir.phase;
      if (lk !== lineKey) {
        lineKey = lk;
        const cyc = cycle > 0 ? 'C' + ROMAN[Math.min(9, cycle)] + ' · ' : '';
        const ph = dir.phase === 'boss' || dir.phase === 'warn' || dir.phase === 'bossdead' ? 'BOSS' : dir.phase === 'mini' || dir.phase === 'mwarn' ? 'MINI-BOSS' : dir.wave > 0 ? 'VAGUE ' + dir.wave + '/' + dir.nW : '';
        lineStr = cyc + 'SECTEUR ' + (secI + 1) + (ph ? ' · ' + ph : '');
      }
      txt(lineStr, 10 + jx, 43, 10, '#a9c2d4', 'left', true, 0);
      // bouclier
      const hr = hudRight();
      for (let i = 0; i < 3; i++) {
        const x = hr - 10 - i * 19, y = 16, on = i < P.shield;
        hexPath(x, y, 8.2);
        if (on) { ctx.fillStyle = P.shield === 1 ? (((rt * 6) | 0) % 2 ? '#ff4d6d' : '#7a1020') : '#46f08a'; ctx.fill(); ctx.strokeStyle = '#eafff2'; ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(160,190,210,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }
      }
      // bombes
      for (let i = 0; i < 3; i++) {
        const x = hr - 8 - i * 15, y = 37, on = i < P.bombs;
        circ(ctx, x, y, 5); ctx.fillStyle = on ? '#ff4d6d' : 'rgba(255,255,255,0.06)'; ctx.fill();
        ctx.strokeStyle = on ? '#ffd6de' : 'rgba(160,190,210,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        if (on) { ctx.fillStyle = '#ffd34d'; circ(ctx, x + 3.5, y - 4.5, 1.6); ctx.fill(); }
      }
      // jauge HYPER
      const gx = 10, gw = hr - 10 - 66, gy = 51;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(gx, gy, gw, 4);
      const hv = P.hyperT > 0 ? P.hyperT / 6 : P.hyper;
      if (hv > 0) {
        const full = P.hyper >= 1 && P.hyperT <= 0;
        ctx.fillStyle = full ? (((rt * 8) | 0) % 2 ? '#ffffff' : '#ff3fb4') : P.hyperT > 0 ? '#ff7ad8' : '#c050ff';
        ctx.fillRect(gx, gy, gw * hv, 4);
        if (full) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.m, gx + gw, gy + 2, 26, 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      txt(P.hyper >= 1 && P.hyperT <= 0 ? 'HYPER PRÊT !' : 'HYPER', gx + gw + 6, gy + 5, 8, P.hyper >= 1 ? '#ff7ad8' : '#7f8fa0', 'left', false, 0);
      // barre du boss / mini-boss
      if (B && !B.dying) {
        const k = B.ready ? B.hp / B.maxHp : clamp(B.t / B.enterT, 0, 1);
        bossBar(B.name, k, B.nph, '#ff3b5c');
      } else if (miniRef && miniRef.alive && miniRef.t > 0.5) {
        bossBar('MINI-BOSS · ' + MINI_NAMES[secI], miniRef.hp / miniRef.max, 1, '#ffa630');
      }
      // niveaux d'armement (bas de l'écran)
      if (state === 'play' && P.alive) {
        const y = LH - 9, x0 = LW / 2 - 66;
        ctx.globalAlpha = 0.75;
        setFont(8, false); ctx.textAlign = 'left'; ctx.fillStyle = '#9fdcff'; ctx.fillText('P', x0, y + 3);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i < P.power ? '#38e1ff' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 8 + i * 6, y - 3, 4, 6); }
        ctx.fillStyle = '#ffc48a'; ctx.fillText('M', x0 + 50, y + 3);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < P.miss ? '#ff9a1f' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 60 + i * 6, y - 3, 4, 6); }
        ctx.fillStyle = '#d9c4ff'; ctx.fillText('D', x0 + 84, y + 3);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i < P.opts ? '#b37bff' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x0 + 93 + i * 6, y - 3, 4, 6); }
        ctx.globalAlpha = 1;
      }
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
    function drawOverlays() {
      S0();
      if (P.hyperT > 0 || hyperTint > 0.01) {
        if (!vigGrad || vigLH !== LH) { vigLH = LH; vigGrad = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.2, LW / 2, LH / 2, LH * 0.75); vigGrad.addColorStop(0, 'rgba(255,40,180,0)'); vigGrad.addColorStop(1, 'rgba(255,40,180,0.55)'); }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(hyperTint, P.hyperT > 0 ? 0.55 + 0.15 * Math.sin(rt * 8) : 0) * 0.7;
        ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, LW, LH);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (glitch > 0) {
        ctx.fillStyle = 'rgba(180,150,255,0.18)';
        for (let i = 0; i < 4; i++) ctx.fillRect(0, Math.random() * LH, LW, 1 + Math.random() * 5);
      }
      drawBanner();
      const cx = LW / 2;
      if (state === 'load') {
        ctx.fillStyle = 'rgba(1,3,8,0.55)'; ctx.fillRect(0, 0, LW, LH);
        txt('GALAXY WARS', cx, LH * 0.4, 30, '#38e1ff', 'center', false, 5);
        ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, LH * 0.5, 14, rt * 5, rt * 5 + 4.2); ctx.stroke();
        txt('Chargement…', cx, LH * 0.5 + 38, 13, '#cfe6f5', 'center', true, 3);
      } else if (state === 'ready') {
        const ta = stT < 0.9 ? 1 : Math.max(0, 1 - (stT - 0.9) / 0.35);
        if (ta > 0) {
          ctx.globalAlpha = ta;
          ctx.globalCompositeOperation = 'lighter'; glowAt(GL.c, cx, LH * 0.36, 260, 0.35); ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = ta;
          txt('GALAXY', cx, LH * 0.34, 34, '#38e1ff', 'center', false, 6);
          txt('WARS', cx, LH * 0.34 + 34, 34, '#ff5fd2', 'center', false, 6);
          ctx.globalAlpha = 1;
        }
        const s = stT < 0.75 ? 'PRÊT ?' : 'GO !';
        const k = stT < 0.75 ? stT / 0.75 : (stT - 0.75) / 0.5;
        const sc = 1 + (1 - Math.min(1, k * 3)) * 0.4;
        ctx.save(); ctx.translate(cx, LH * 0.55); ctx.scale(sc, sc);
        txt(s, 0, 0, s === 'GO !' ? 48 : 40, s === 'GO !' ? '#46f08a' : '#ffffff', 'center', false, 7);
        ctx.restore();
        if (stT < 0.75) txt('Glisse le doigt, la souris ou utilise les flèches', cx, LH * 0.55 + 32, 11, '#cfe6f5', 'center', true, 3);
      }
      if (state === 'dying' || state === 'over') {
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
      if (paused) {
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
      ctx.font = '600 12px ' + FB; ctx.fillStyle = '#8aa0ae'; ctx.fillText('Le Vaisseau Noir contre la galaxie', lx, 60);
      ctx.font = '13px ' + FD; ctx.fillStyle = SEC.acc;
      ctx.fillText((cycle > 0 ? 'CYCLE ' + ROMAN[Math.min(9, cycle)] + ' · ' : '') + 'SECTEUR ' + (secI + 1) + ' / 8', lx, 98);
      ctx.font = '19px ' + FD; ctx.fillStyle = '#ffffff'; ctx.fillText(SEC.name.toUpperCase(), lx, 122, pw);
      const rowH = Math.min(46, (ch - 180) / 8);
      for (let i = 0; i < 8; i++) {
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
      // droite : armement et commandes
      ctx.font = '14px ' + FD; ctx.fillStyle = '#38e1ff'; ctx.fillText('ARMEMENT', rx, 42);
      const rows = [['Tir', P.power, 6, '#38e1ff'], ['Missiles', P.miss, 3, '#ff9a1f'], ['Drones', P.opts, 4, '#b37bff'], ['Bouclier', P.shield, 3, '#46f08a'], ['Bombes', P.bombs, 3, '#ff4d6d']];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i], y = 72 + i * 30;
        ctx.font = '600 13px ' + FB; ctx.fillStyle = '#cfe6f5'; ctx.fillText(r[0], rx, y);
        for (let j = 0; j < r[2]; j++) { ctx.fillStyle = j < r[1] ? r[3] : 'rgba(255,255,255,0.1)'; rrect(ctx, rx + 78 + j * 17, y - 11, 13, 13, 3); ctx.fill(); }
      }
      const hy = 72 + 5 * 30 + 4;
      ctx.font = '600 13px ' + FB; ctx.fillStyle = '#ffb3e6'; ctx.fillText(P.hyperT > 0 ? 'HYPER EN COURS !' : P.hyper >= 1 ? 'HYPER PRÊT (Maj)' : 'Jauge HYPER', rx, hy);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(rx, hy + 8, Math.min(pw, 190), 6);
      ctx.fillStyle = '#ff3fb4'; ctx.fillRect(rx, hy + 8, Math.min(pw, 190) * (P.hyperT > 0 ? P.hyperT / 6 : P.hyper), 6);
      const help = ['Flèches / ZQSD / WASD : piloter', 'Souris : suivre ou glisser', 'Espace ou B : bombe', 'Maj ou H : HYPER', 'P ou Échap : pause'];
      ctx.font = '600 12px ' + FB; ctx.fillStyle = '#7f95a6';
      for (let i = 0; i < help.length; i++) ctx.fillText(help[i], rx, Math.max(hy + 60, ch - 200) + i * 19);
      fontKey = '';
    }

    // ------------------------------------------------------------- mise à jour
    function step(dt) {
      T += dt;
      if (state === 'play') { playT += dt; early = cycle === 0 && secI === 0 && playT < 60; }
      const es = P.hyperT > 0 ? 0.5 : 1;          // HYPER : le temps ralentit autour du vaisseau
      if (state === 'play' || state === 'dying' || state === 'over') {
        if (state === 'play') updDirector(dt);
        updEvent(dt);
        updEnemies(dt * es);
        updBoss(dt * es);
        updEB(dt * es);
      }
      updatePlayer(dt);
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
      if (hyperTint > 0 && P.hyperT <= 0) hyperTint = Math.max(0, hyperTint - dt * 1.4);
      stT += dt;
      if (state === 'load') {
        if (!loading || stT > 3) { state = 'ready'; stT = 0; SFX.ready(); }
      } else if (state === 'ready') {
        P.auto = 1;
        if (stT >= 0.75 && !goSaid) { goSaid = true; SFX.go(); }
        if (stT >= 1.25) {
          state = 'play'; stT = 0; P.auto = 0; dir.phase = 'intro'; dir.t = 0;
          banner('SECTEUR ' + (secI + 1), SEC.name, SEC.acc, 2.8, 3, SEC.news);
        }
      } else if (state === 'dying') {
        if (stT > 0.18 && stT - dt <= 0.18) { explode(P.x + 14, P.y - 12, 2, 'c'); sparks(P.x, P.y, 20, GL.c, 260, 0.7, 9); }
        if (stT > 0.35 && stT - dt <= 0.35) { explode(P.x - 18, P.y - 10, 3, 'o'); SFX.boom(); }
        if (stT > 0.52 && stT - dt <= 0.52) { explode(P.x + 6, P.y + 16, 2, 'm'); debris(P.x, P.y, 10, 180); }
        if (stT > 0.7 && stT - dt <= 0.7) {
          explode(P.x + 16, P.y + 8, 3, 'c'); explode(P.x, P.y, 4, 'w');
          ring(P.x, P.y, 10, 260, 0.9, '#9ff4ff', 5); ring(P.x, P.y, 6, 150, 0.6, '#ffffff', 3);
          sparks(P.x, P.y, 50, GL.c, 420, 1.1, 11);
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
      const ready = P.hyper >= 1 && P.hyperT <= 0 && P.alive;
      if (ready !== hyperReadyShown) {
        hyperReadyShown = ready;
        hyperBtn.style.animation = ready ? 'gwPulse 0.9s ease-in-out infinite' : 'none';
        hyperBtn.style.opacity = ready ? '1' : '0.72';
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
      if (onFrame) { try { onFrame(dt); } catch (e) { /* rien */ } }
      const t0 = performance.now();
      update(dt);
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
      if (k === 'p' || k === 'P' || k === 'Escape') { if (active) { setPaused(!paused); e.preventDefault(); } return; }
      const arrowOrSpace = k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' || k === ' ' || k === 'Spacebar' || c === 'Space';
      if (paused) { if (k === ' ' || k === 'Enter') { setPaused(false); e.preventDefault(); } return; }
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') keys.l = true;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.r = true;
      else if (k === 'ArrowUp' || k === 'z' || k === 'Z' || k === 'w' || k === 'W') keys.u = true;
      else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.d = true;
      else if (k === ' ' || k === 'Spacebar' || c === 'Space' || k === 'b' || k === 'B') { if (!e.repeat) useBomb(); }
      else if (k === 'Shift' || k === 'h' || k === 'H') useHyper();
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
      if (paused) { setPaused(false); return; }
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
        if (paused) { setPaused(false); return; }
        fn();
      };
    }
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(window, 'blur', onBlur);
    on(document, 'visibilitychange', onVis);
    on(canvas, 'pointerdown', onPointerDown);
    on(canvas, 'pointermove', onPointerMove);
    on(canvas, 'pointerup', onPointerUp);
    on(canvas, 'pointercancel', onPointerUp);
    on(canvas, 'lostpointercapture', onPointerUp);
    on(canvas, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) mouseTX = -1; });
    on(canvas, 'contextmenu', prevent);
    on(bombBtn, 'pointerdown', btn(useBomb));
    on(hyperBtn, 'pointerdown', btn(useHyper));
    on(bombBtn, 'contextmenu', prevent);
    on(hyperBtn, 'contextmenu', prevent);
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (state !== 'over') setPaused(!paused); });

    function assetsChanged() {
      nebKey = ''; buildNeb(); plCache.clear();
      if (B && B.kind === 'planete' && !B.head) B.img = planetImg(20);
    }

    // ------------------------------------------------------------- démarrage
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    else on(window, 'resize', resize);
    resize();
    applySector(false);
    P.x = LW / 2; P.y = LH + 50;
    state = loading ? 'load' : 'ready'; stT = 0;
    if (document.hidden) paused = true;
    if (paused) pauseBtn.innerHTML = ICON_PLAY;
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------------------- accès de test (invisible pour le joueur)
    function clearField() {
      for (let i = 0; i < enN; i++) EN[i].alive = false;
      enN = 0; ebN = 0; psN = 0; msN = 0; BEAMS.length = 0; BOLTS.length = 0; GATES.length = 0; BOOMQ.length = 0;
      hole = null; darkOn = false; darkK = 0; B = null; miniRef = null;
    }
    const _debug = {
      info: () => ({ state, paused, score: Math.floor(score), mult, chain, sector: secI + 1, cycle, wave: dir.wave, nW: dir.nW, phase: dir.phase, L: Math.round(L * 100) / 100,
        shield: P.shield, power: P.power, miss: P.miss, opts: P.opts, bombs: P.bombs, hyper: P.hyper, hyperT: P.hyperT, alive: P.alive, x: P.x, y: P.y, LW, LH,
        enemies: enN, bullets: ebN, particles: ptN, shots: psN, shards: shN, caps: cpN,
        boss: B ? { kind: B.kind, hp: Math.round(B.hp), max: Math.round(B.maxHp), phase: B.phase, ready: B.ready, head: !!B.head, t: Math.round(B.t) } : null,
        mini: !!(miniRef && miniRef.alive), ev: dir.ev, quality, dpr, overSent, msU: Math.round(profU * 100) / 100, msR: Math.round(profR * 100) / 100, playT: Math.round(playT), heads: heads.length, imgs: !!IMGP, nebs: !!IMGN, god, kills }),
      snap: () => {
        const b = [], e = [], bm = [];
        for (let i = 0; i < ebN; i++) { const q = EB[i]; if (q.delay <= 0) b.push(q.x, q.y, q.vx, q.vy, q.r); }
        for (let i = 0; i < enN; i++) { const q = EN[i]; if (q.alive && q.delay <= 0) e.push(q.x, q.y, q.r, q.vx, q.vy); }
        if (B && B.parts) for (let i = 0; i < B.parts.length; i++) { const q = B.parts[i]; if (q.alive && !q.hide) e.push(q.x, q.y, q.r, 0, 0); }
        for (let i = 0; i < BEAMS.length; i++) { const q = BEAMS[i]; bm.push(q.x, q.y, q.ang, q.w, q.t >= q.warn - 0.35 ? 1 : 0); }
        const bo = [];
        for (let i = 0; i < BOLTS.length; i++) bo.push(BOLTS[i].x, BOLTS[i].t >= BOLTS[i].warn - 0.6 ? 1 : 0);
        if (B && B.kind === 'ver' && (B.mode === 2 || (B.mode === 3 && B.hd.y < LH + 60))) bo.push(B.warnX, 1);
        const gt = [];
        for (let i = 0; i < GATES.length; i++) gt.push({ y: GATES[i].y, gaps: GATES[i].gaps.slice() });
        const cp = [];
        for (let i = 0; i < cpN; i++) cp.push(CP[i].x, CP[i].y);
        return { x: P.x, y: P.y, LW, LH, b, e, bm, bo, gt, cp, hole: hole ? [hole.x, hole.y, hole.k] : null, alive: P.alive, state, inv: P.inv, bombs: P.bombs, hyper: P.hyper, shield: P.shield };
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
      power: (p, m, o) => { P.power = clamp(p | 0, 1, 6); P.miss = clamp(m | 0, 0, 3); P.opts = clamp(o | 0, 0, 4); for (let i = 0; i < 4; i++) { OPT[i].x = P.x; OPT[i].y = P.y; } },
      hyperFull: () => { P.hyper = 1; },
      hyper: () => useHyper(),
      bomb: () => useBomb(),
      event: (name) => { if (EVS.indexOf(name) >= 0) startEvent(name); },
      jump: () => { clearField(); dir.phase = 'clear'; dir.t = 9; },
      shield: (n) => { P.shield = clamp(n | 0, 1, 3); },
      die: () => { god = false; P.inv = 0; P.shield = 1; state = 'play'; hurtPlayer(); },
      onFrame: (fn) => { onFrame = typeof fn === 'function' ? fn : null; },
      quality: (q, auto) => { quality = clamp(+q || 1, 0.5, 1); adaptive = !!auto; resize(); },
      spawn: (k, n) => { spawnGroup(W(0, k, n || 0)); },
      flood: (n) => { for (let i = 0; i < n; i++) eb(rnd(10, LW - 10), rnd(-10, LH * 0.5), rnd(-60, 60), rnd(40, 120), BKEYS[i % 6], i % 4); },
      parts: (n) => { for (let i = 0; i < n; i++) explode(rnd(20, LW - 20), rnd(60, LH - 60), 2, 'o'); },
      move: (x, y) => { P.x = clamp(x, 14, LW - 14); P.y = clamp(y, 66, LH - 26); }
    };

    return {
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
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES.ilo = {
    id: 'ilo',
    title: 'Galaxy Wars',
    tagline: "Fonce à travers l'espace d'ILO, pulvérise les vagues et les boss planétaires.",
    accent: ACCENT,
    scoreLabel: 'points',
    preview,
    mount
  };
})();
