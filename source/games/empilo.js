(() => {
  'use strict';

  // ===========================================================================
  // EMPILO — un VOYAGE en empilant : on part de la Plaine, on plonge dans l'Océan,
  // on remonte dans le Ciel, on décolle vers l'Espace, puis Au-delà (cœur de la galaxie).
  // Règles modernes (SRS, sac de 7, réserve, 5 suivantes, délai de pose, T-spins,
  // combos, B2B, plateau vide), gestes tactiles sans ambiguïté, casses spectaculaires.
  // Chaque monde a son décor animé en profondeur, sa matière de blocs, son explosion,
  // ses couleurs, ses événements et une petite particularité de jeu.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // EMPILO_WORLDS : le parcours (aussi exposé à la bibliothèque : JDW_GAMES.empilo.worlds,
  // pour la carte d'avancement). Un niveau toutes les 10 lignes, 3 niveaux par monde,
  // 5 mondes = un TOUR de 15 niveaux. Après « Au-delà », le Tour II repart de la Plaine
  // (même ordre, vitesse du niveau atteint) : Tour k → niveaux + 15 × (k − 1).
  //   id, n (numéro du monde), name (nom affiché), short (nom court), emoji,
  //   levels [début, fin] au Tour I, colors { accent, accent2, sky, ground, dark, light },
  //   blocks (matière des blocs), burst (explosion des lignes), special (particularité de jeu),
  //   bonus (pièce bonus du monde), desc (description courte), stages (une ambiance par niveau).
  // Pour un niveau quelconque : JDW_GAMES.empilo.worldOf(niveau) → { w, n, tour, stage, world }.
  // ---------------------------------------------------------------------------
  const EMPILO_WORLDS = [
    { id: 'plaine', n: 1, name: 'La Plaine', short: 'Plaine', emoji: '🌼', levels: [1, 3],
      colors: { accent: '#86e35a', accent2: '#ffd23a', sky: '#5ec8ff', ground: '#3f9e44', dark: '#0b2416', light: '#fff6c8' },
      blocks: 'Pierre fleurie, herbe et fleurs', burst: 'Pétales, feuilles et papillons',
      special: { emoji: '🐞', name: 'Coccinelle', text: 'Dès le niveau 2, elle croque les blocs sous elle' },
      bonus: { emoji: '🐞', name: 'Coccinelle', text: 'Elle croque les blocs sous elle' },
      desc: 'Prairie, collines, soleil, fleurs et papillons.',
      stages: ['Le matin', 'Plein soleil', 'Après-midi doré'] },
    { id: 'ocean', n: 2, name: "L'Océan", short: 'Océan', emoji: '🐠', levels: [4, 6],
      colors: { accent: '#2ee6ff', accent2: '#ff7aa8', sky: '#1fb6e8', ground: '#e9d39a', dark: '#021631', light: '#c8fbff' },
      blocks: 'Verre de mer et corail', burst: 'Bulles, gouttes et poissons',
      special: { emoji: '🫧', name: 'Bulles bonus', text: 'Casse les lignes qui gardent une bulle d’air' },
      bonus: { emoji: '🫧', name: 'Grosse bulle', text: 'Elle dissout les blocs sous elle' },
      desc: 'On plonge : lumière qui ondule, bulles, poissons, coraux.',
      stages: ['Le lagon', 'Le récif', 'Les abysses'] },
    { id: 'ciel', n: 3, name: 'Le Ciel', short: 'Ciel', emoji: '☁️', levels: [7, 9],
      colors: { accent: '#ffcf4a', accent2: '#ff8f7a', sky: '#5aaeff', ground: '#ffffff', dark: '#0d1d46', light: '#fff4d6' },
      blocks: 'Cristal de glace et nuages', burst: 'Plumes, nuages et oiseaux',
      special: { emoji: '⚡', name: 'Éclair', text: "L'éclair foudroie toute sa colonne" },
      bonus: { emoji: '⚡', name: 'Éclair', text: 'Il foudroie toute sa colonne' },
      desc: 'On remonte : nuages, oiseaux, soleil couchant.',
      stages: ["L'envol", 'La mer de nuages', 'Le crépuscule'] },
    { id: 'espace', n: 4, name: "L'Espace", short: 'Espace', emoji: '🪐', levels: [10, 12],
      colors: { accent: '#b48cff', accent2: '#5ef0ff', sky: '#0a1240', ground: '#2a2f45', dark: '#03040c', light: '#e6dcff' },
      blocks: "Métal lumineux et cristal d'étoile", burst: "Poussière d'étoiles",
      special: { emoji: '🧑‍🚀', name: 'Apesanteur', text: 'Les pièces flottent un peu avant de se poser' },
      bonus: { emoji: '☄️', name: 'Comète', text: 'Elle creuse un cratère sous elle' },
      desc: 'Étoiles, planètes et nébuleuses.',
      stages: ["L'orbite", 'Les planètes', 'La nébuleuse'] },
    { id: 'audela', n: 5, name: 'Au-delà', short: 'Au-delà', emoji: '🌈', levels: [13, 15],
      colors: { accent: '#ff6ec7', accent2: '#fff27a', sky: '#1a0838', ground: '#ffd9f2', dark: '#0a0418', light: '#fff6ff' },
      blocks: 'Prisme arc-en-ciel', burst: "Confettis arc-en-ciel et étoiles",
      special: { emoji: '🌈', name: 'Tout à la fois', text: 'Bulles bonus, apesanteur et étoile magique' },
      bonus: { emoji: '🌟', name: 'Étoile magique', text: 'Elle dissout les blocs et double le score' },
      desc: 'Le cœur arc-en-ciel de la galaxie.',
      stages: ['La spirale', "L'arc-en-ciel", 'Le cœur'] }
  ];
  const WPL = 3, NW = EMPILO_WORLDS.length;      // niveaux par monde, nombre de mondes (un tour = 15 niveaux)
  function worldOf(level) {
    const i = Math.max(0, (Math.floor(level) || 1) - 1), wi = Math.floor(i / WPL);
    return { w: wi % NW, n: wi % NW + 1, tour: Math.floor(wi / NW), stage: i % WPL, world: EMPILO_WORLDS[wi % NW] };
  }
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = (i) => ROMAN[i] || String(i + 1);

  const TAU = Math.PI * 2;
  const COLS = 10, ROWS = 22, HID = 2, VIS = 20;
  const MAX_RESETS = 15, DAS = 0.16, ARR = 0.033, NEXT_N = 5;
  const TUTO_KEY = 'jdw.empilo.tuto', BTN_KEY = 'jdw.empilo.btns';

  const SHAPES = {
    I: { m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], c: '#22d3ff' },
    O: { m: [[1, 1], [1, 1]], c: '#ffc928' },
    T: { m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], c: '#b65cff' },
    S: { m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], c: '#3ee26a' },
    Z: { m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], c: '#ff4467' },
    J: { m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], c: '#3f73ff' },
    L: { m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], c: '#ff8d2a' },
    B: { m: [[1]], c: '#c8f4ff' },   // pièce bonus du monde (coccinelle, bulle, éclair, comète, étoile)
    G: { m: [[1]], c: '#857a6c' }    // carreau sale (ligne du saboteur)
  };
  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const GREY = '#4f5a66';
  const GOLD = '#ffcf3a';

  // Couleurs de chaque monde, une ambiance par niveau du monde (le décor évolue d'un niveau à l'autre)
  //   a : accent (cadre néon, puces), k : 3 couleurs vives (étincelles, bannières), s : couleur douce,
  //   glass : teinte du puits de verre [r, g, b, opacité], panel : fond des panneaux, b1/b2 : fond uni de secours
  const WPAL = [
    [ { a: '#86e35a', k: ['#ffb37a', '#ff8fc4', '#8fd8ff'], s: '#fff1d6' },
      { a: '#86e35a', k: ['#ffd23a', '#ff7ab0', '#5ec8ff'], s: '#fff6c8' },
      { a: '#a6e64a', k: ['#ffc23a', '#ff8a5a', '#ffe680'], s: '#ffe9b0' } ],
    [ { a: '#2ee6ff', k: ['#2ee6ff', '#ffe17a', '#7dffcf'], s: '#c8fbff' },
      { a: '#2ee6ff', k: ['#2ee6ff', '#ff7aa8', '#ffa64d'], s: '#b0f4ff' },
      { a: '#4fd8ff', k: ['#5ef0ff', '#ff5fd2', '#8f9cff'], s: '#9fe8ff' } ],
    [ { a: '#ffcf4a', k: ['#ffffff', '#7fd0ff', '#ffcf4a'], s: '#ffffff' },
      { a: '#ffcf4a', k: ['#ffe6a0', '#ffffff', '#ff9a6a'], s: '#fff4d6' },
      { a: '#ffab6a', k: ['#ff9a8a', '#ffcf7a', '#b48cff'], s: '#ffd9c8' } ],
    [ { a: '#b48cff', k: ['#5ef0ff', '#b48cff', '#ffffff'], s: '#dcd0ff' },
      { a: '#b48cff', k: ['#ffb84d', '#b48cff', '#5ef0ff'], s: '#ffe0c0' },
      { a: '#c77dff', k: ['#ff5fd2', '#5ef0ff', '#b48cff'], s: '#ffc8f0' } ],
    [ { a: '#ff6ec7', k: ['#fff27a', '#5ef0ff', '#ff6ec7'], s: '#ffe0f4' },
      { a: '#ff6ec7', k: ['#7dff8a', '#ffb84d', '#5ef0ff'], s: '#fff6ff' },
      { a: '#ffd36a', k: ['#fff27a', '#ff6ec7', '#ffffff'], s: '#fffbe6' } ]
  ];
  // verre du puits : une teinte « multiplier » (garde les couleurs du décor, comme un verre teinté) + un voile sombre léger
  const WMUL = ['#6c9cbc', '#5a8ab2', '#86a2dc', '#a0a0c8', '#9278b4'];
  const WGLASS = [[4, 26, 30, 0.32], [2, 18, 44, 0.3], [8, 20, 70, 0.32], [4, 5, 20, 0.38], [14, 6, 34, 0.42]];
  const WPANEL = ['rgba(8,38,42,0.74)', 'rgba(4,26,58,0.72)', 'rgba(14,28,80,0.72)', 'rgba(10,8,34,0.74)', 'rgba(30,8,58,0.74)'];
  function palFor(l) {
    const W = worldOf(l), p = WPAL[W.w][W.stage], d = EMPILO_WORLDS[W.w];
    return { n: d.stages[W.stage].toUpperCase(), a: p.a, k: p.k, s: p.s, b1: d.colors.dark, b2: d.colors.sky, w: W.w };
  }

  // Événements (au hasard, de plus en plus fréquents) : mêmes règles partout, nom et dessin propres au monde
  const EVDEF = {
    buee: { from: 5, dur: 12 },
    mousse: { from: 6, dur: 10 },
    essorage: { from: 9, dur: 10 },
    panne: { from: 12, dur: 10 }
  };
  const EVW = {
    buee: [['BRUME DU MATIN', 'LES SUIVANTES SONT CACHÉES', '#e8f6ff'], ['ENCRE DE PIEUVRE !', 'LES SUIVANTES SONT CACHÉES', '#c9a3ff'],
      ['DANS LES NUAGES', 'LES SUIVANTES SONT CACHÉES', '#ffffff'], ['NÉBULEUSE !', 'LES SUIVANTES SONT CACHÉES', '#ff9ad5'],
      ['MIRAGE !', 'LES SUIVANTES SONT CACHÉES', '#fff27a']],
    mousse: [['SIESTE AU SOLEIL', 'TOUT RALENTIT, PROFITES-EN !', '#ffd27a'], ['EAU CALME', 'TOUT RALENTIT, PROFITES-EN !', '#7dffcf'],
      ['VOL PLANÉ', 'TOUT RALENTIT, PROFITES-EN !', '#ffffff'], ['DÉRIVE LENTE', 'TOUT RALENTIT, PROFITES-EN !', '#5ef0ff'],
      ['TEMPS SUSPENDU', 'TOUT RALENTIT, PROFITES-EN !', '#ffe0f4']],
    essorage: [['COUP DE VENT !', 'ÇA TOMBE PLUS VITE', '#ffa630'], ['COURANT !', 'ÇA TOMBE PLUS VITE', '#2ee6ff'],
      ['RAFALE !', 'ÇA TOMBE PLUS VITE', '#ffcf4a'], ['PLUIE DE MÉTÉORES !', 'ÇA TOMBE PLUS VITE', '#ffa630'],
      ['HYPERESPACE !', 'ÇA TOMBE PLUS VITE', '#ff6ec7']],
    panne: [['LA NUIT TOMBE', 'SEULE TA PIÈCE ÉCLAIRE', '#ffe680'], ['LES ABYSSES', 'SEULE TA PIÈCE ÉCLAIRE', '#5ef0ff'],
      ['ORAGE !', 'LES ÉCLAIRS T’AIDENT À VOIR', '#ffe680'], ['ÉCLIPSE !', 'SEULE TA PIÈCE ÉCLAIRE', '#ffd36a'],
      ['TROU NOIR !', 'SEULE TA PIÈCE ÉCLAIRE', '#ff9ad5']]
  };
  function evName(k, w) { const e = EVW[k][w] || EVW[k][0]; return { name: e[0], sub: e[1], col: e[2] }; }
  const GOLD_NAME = ["FLEUR D'OR", 'PERLE', "SOLEIL D'OR", "ÉTOILE D'OR", 'DIAMANT'];
  const QUAD_SUB = ['QUELLE RÉCOLTE !', 'RAZ-DE-MARÉE !', 'COUP DE TONNERRE !', 'SUPERNOVA !', 'BIG BANG !'];
  // l'intrus qui fait monter des lignes quand il n'y a pas de têtes de copains (une créature par monde)
  const SAB_W = [
    { name: 'UNE TAUPE !', who: 'LA TAUPE', hi: 'Je creuse !', rise: ['Et hop, de la terre !', 'Ça pousse !', 'Coucou d’en bas !'], bye: 'Je retourne sous terre.', sad: 'Zut, repérée !', end: 'Tout est retourné !' },
    { name: 'UN CRABE !', who: 'LE CRABE', hi: 'Clac clac !', rise: ['Du sable !', 'Clac, une ligne !', 'La marée monte !'], bye: 'Je file !', sad: 'Pince alors…', end: 'Tout est ensablé !' },
    { name: 'UN ORAGE !', who: "L'ORAGE", hi: 'Grrrondement…', rise: ['Plic, ploc !', 'Ça gronde !', 'Une ligne de grêle !'], bye: 'Éclaircie !', sad: 'Pfff, dissipé…', end: 'Quel déluge !' },
    { name: 'UNE SOUCOUPE !', who: 'LA SOUCOUPE', hi: 'Bip bip !', rise: ['Zap, une ligne !', 'Bip, cadeau !', 'Rayon tracteur !'], bye: 'Retour à la base !', sad: 'Bip… bouh…', end: 'Invasion réussie !' },
    { name: 'UN TROU NOIR !', who: 'LE TROU NOIR', hi: 'Slurp…', rise: ['Ça aspire !', 'Slurp, une ligne !', 'Tout tourne !'], bye: 'Il s’éloigne…', sad: 'Il rétrécit !', end: 'Tout est aspiré !' }
  ];
  // Nouveautés annoncées en arrivant à un niveau (les arrivées dans un monde ont leur carte de voyage)
  function newsFor(l) {
    const w = worldOf(l).w;
    if (l === 3) return [GOLD_NAME[w], 'LIGNE AVEC ' + (w === 0 ? 'UNE FLEUR' : 'UN BLOC') + " D'OR = SCORE ×2"];
    if (l === 5) return [evName('buee', w).name.replace(' !', ''), 'PARFOIS ON NE VOIT RIEN VENIR'];
    if (l === 6) return [evName('mousse', w).name, 'UNE PAUSE DOUCEUR DE TEMPS EN TEMPS'];
    if (l === 8) return ['ASTUCE : T-SPIN', 'GLISSE LE T EN TOURNANT = GROS POINTS'];
    if (l === 9) return [evName('essorage', w).name.replace(' !', ''), 'ÇA VA TOMBER VITE…'];
    if (l === 12) return [evName('panne', w).name.replace(' !', ''), 'GARDE TON SANG-FROID'];
    if (l === 17) return ['EN CONTINU', 'UN INTRUS À CHAQUE NIVEAU'];
    if (l === 20) return ['POSE ÉCLAIR', 'LES PIÈCES SE FIXENT PLUS VITE'];
    return null;
  }

  // ---------- Rotations (SRS : états = rotations de la boîte englobante) ----------
  function rotCW(m) {
    const n = m.length, r = [];
    for (let y = 0; y < n; y++) { r.push([]); for (let x = 0; x < n; x++) r[y][x] = m[n - 1 - x][y]; }
    return r;
  }
  const ROT = {};
  for (const t of Object.keys(SHAPES)) {
    let m = SHAPES[t].m;
    ROT[t] = [];
    for (let i = 0; i < 4; i++) {
      const cells = [];
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) if (m[y][x]) cells.push([x, y]);
      ROT[t].push(cells);
      m = rotCW(m);
    }
  }
  // tables de « wall kicks » SRS (x vers la droite, y vers le HAUT comme dans la référence ; converties à l'usage)
  const K_JLSTZ = {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };
  const K_I = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  // ---------- Petits outils ----------
  const rgbCache = new Map();
  function hexRgb(h) {
    let v = rgbCache.get(h);
    if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(h, v); }
    return v;
  }
  function toHex(r, g, b) { return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1); }
  function shade(h, a) {
    const c = hexRgb(h), f = a < 0 ? 0 : 255, k = Math.abs(a);
    return 'rgb(' + c.map(v => Math.round(v + (f - v) * k)).join(',') + ')';
  }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mixHex(a, b, k) {
    if (k <= 0) return a; if (k >= 1) return b;
    const x = hexRgb(a), y = hexRgb(b);
    return toHex(x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k);
  }
  function rr(x, X, Y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    x.beginPath();
    x.moveTo(X + r, Y);
    x.lineTo(X + w - r, Y); x.quadraticCurveTo(X + w, Y, X + w, Y + r);
    x.lineTo(X + w, Y + h - r); x.quadraticCurveTo(X + w, Y + h, X + w - r, Y + h);
    x.lineTo(X + r, Y + h); x.quadraticCurveTo(X, Y + h, X, Y + h - r);
    x.lineTo(X, Y + r); x.quadraticCurveTo(X, Y, X + r, Y);
    x.closePath();
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmt(n) { return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
  function easeOutBack(k) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
  function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
  // PRNG à graine (mode compétition : le même contenu pour tous les concurrents)
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- Petits dessins réutilisés (fleur, feuille, étoile) ----------
  function flower5(x, cx, cy, r, petal, heart) {
    x.fillStyle = petal;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      x.beginPath(); x.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.5, r * 0.32, a, 0, TAU); x.fill();
    }
    x.fillStyle = heart; x.beginPath(); x.arc(cx, cy, r * 0.36, 0, TAU); x.fill();
  }
  function leafShape(x, cx, cy, len, ang, col) {
    x.save(); x.translate(cx, cy); x.rotate(ang);
    x.fillStyle = col;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0); x.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0); x.fill();
    x.restore();
  }
  function star4(x, cx, cy, r, col) {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(cx, cy - r); x.quadraticCurveTo(cx + r * 0.14, cy - r * 0.14, cx + r, cy);
    x.quadraticCurveTo(cx + r * 0.14, cy + r * 0.14, cx, cy + r); x.quadraticCurveTo(cx - r * 0.14, cy + r * 0.14, cx - r, cy);
    x.quadraticCurveTo(cx - r * 0.14, cy - r * 0.14, cx, cy - r); x.fill();
  }
  function star5(x, cx, cy, R, ri) {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r2 = i % 2 ? ri : R; x.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); }
    x.closePath();
  }

  // ---------- Matières des blocs (une par monde), sprites en cache ----------
  // 0 pierre fleurie (Plaine), 1 verre de mer (Océan), 2 cristal de glace (Ciel), 3 métal lumineux (Espace), 4 prisme (Au-delà).
  // Les couleurs des 7 pièces ne changent jamais (lisibilité) : seule la matière change.
  const tileCache = new Map();
  function cacheGet(key, px, draw, ph) {
    let cv = tileCache.get(key);
    if (cv) return cv;
    if (tileCache.size > 640) { let n = 0; for (const k of tileCache.keys()) { tileCache.delete(k); if (++n >= 200) break; } }
    cv = document.createElement('canvas');
    cv.width = px; cv.height = ph || px;
    draw(cv.getContext('2d'), px, ph || px);
    tileCache.set(key, cv);
    return cv;
  }
  function tGarden(x, s, col, v) {
    const g = Math.max(0.5, s * 0.035), w = s - 2 * g, r = s * 0.2;
    const gr = x.createLinearGradient(0, g, s * 0.25, s - g);
    gr.addColorStop(0, shade(col, 0.3)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.3));
    x.fillStyle = gr; rr(x, g, g, w, w, r); x.fill();
    x.save(); rr(x, g, g, w, w, r); x.clip();
    for (let i = 0; i < 9; i++) {      // grain de la pierre
      const px = g + hash(v * 31 + i * 7.31) * w, py = g + hash(v * 17 + i * 3.17) * w, pr = s * (0.018 + hash(i * 5.5 + v) * 0.028);
      x.fillStyle = i % 3 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)';
      x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill();
    }
    const sh = x.createLinearGradient(0, s * 0.55, 0, s);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.2)');
    x.fillStyle = sh; x.fillRect(0, s * 0.55, s, s * 0.45);
    if (v === 1) flower5(x, s * 0.7, s * 0.7, s * 0.13, 'rgba(255,255,255,0.92)', '#ffd23a');
    else if (v === 2) { leafShape(x, s * 0.22, s * 0.8, s * 0.24, -0.7, 'rgba(255,255,255,0.42)'); leafShape(x, s * 0.24, s * 0.8, s * 0.17, -1.9, 'rgba(255,255,255,0.32)'); }
    else if (v === 3) flower5(x, s * 0.3, s * 0.72, s * 0.09, 'rgba(255,255,255,0.7)', 'rgba(255,240,180,0.95)');
    x.restore();
    const gl = x.createLinearGradient(0, g + s * 0.05, 0, g + s * 0.42);
    gl.addColorStop(0, 'rgba(255,255,255,0.62)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gl; rr(x, g + s * 0.12, g + s * 0.07, w - s * 0.24, s * 0.3, s * 0.13); x.fill();
    x.lineWidth = Math.max(1, s * 0.05); x.strokeStyle = shade(col, -0.55);
    rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
    x.lineWidth = Math.max(0.8, s * 0.035); x.strokeStyle = 'rgba(255,255,255,0.32)';
    rr(x, g + s * 0.075, g + s * 0.075, w - s * 0.15, w - s * 0.15, r * 0.7); x.stroke();
  }
  function tSea(x, s, col, v) {
    const g = Math.max(0.5, s * 0.04), w = s - 2 * g, r = s * 0.3;
    const rg = x.createRadialGradient(s * 0.42, s * 0.36, s * 0.04, s * 0.5, s * 0.5, s * 0.64);
    rg.addColorStop(0, mixHex(col, '#ffffff', 0.42)); rg.addColorStop(0.55, col); rg.addColorStop(1, shade(col, -0.42));
    x.fillStyle = rg; rr(x, g, g, w, w, r); x.fill();
    x.save(); rr(x, g, g, w, w, r); x.clip();
    x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = Math.max(1, s * 0.05); x.lineCap = 'round';
    x.beginPath();
    for (let i = 0; i <= 12; i++) { const px = g + w * 0.14 + i / 12 * w * 0.72, py = s * 0.3 + Math.sin(i / 12 * TAU * 1.2 + v) * s * 0.035; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
    x.stroke();
    for (let i = 0; i < 3; i++) {
      const bx = g + w * (0.22 + hash(v * 7 + i * 2.3) * 0.56), by = g + w * (0.48 + hash(v * 3 + i * 5.1) * 0.36), br = s * (0.028 + hash(v + i * 9.7) * 0.04);
      x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = Math.max(0.7, s * 0.024);
      x.beginPath(); x.arc(bx, by, br, 0, TAU); x.stroke();
    }
    x.restore();
    x.lineWidth = Math.max(1, s * 0.07); x.strokeStyle = rgba(mixHex(col, '#ffffff', 0.65), 0.42);
    rr(x, g + s * 0.06, g + s * 0.06, w - s * 0.12, w - s * 0.12, r * 0.8); x.stroke();
    x.lineWidth = Math.max(1, s * 0.045); x.strokeStyle = shade(col, -0.6);
    rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(s * 0.3, s * 0.25, Math.max(0.6, s * 0.05), 0, TAU); x.fill();
  }
  function tIce(x, s, col, v) {
    const g = Math.max(0.5, s * 0.035), w = s - 2 * g, b = s * 0.19, r = s * 0.13;
    const A = g, B = g + w, i0 = g + b, i1 = g + w - b;
    x.save(); rr(x, g, g, w, w, r); x.clip();
    x.fillStyle = col; x.fillRect(0, 0, s, s);
    const face = (pts, fill) => { x.fillStyle = fill; x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fill(); };
    face([A, A, B, A, i1, i0, i0, i0], mixHex(col, '#ffffff', 0.58));
    face([A, A, i0, i0, i0, i1, A, B], mixHex(col, '#ffffff', 0.3));
    face([B, A, B, B, i1, i1, i1, i0], shade(col, -0.16));
    face([A, B, i0, i1, i1, i1, B, B], shade(col, -0.36));
    const cg = x.createLinearGradient(i0, i0, i1, i1);
    cg.addColorStop(0, mixHex(col, '#ffffff', 0.42)); cg.addColorStop(1, col);
    x.fillStyle = cg; x.fillRect(i0, i0, i1 - i0, i1 - i0);
    x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = Math.max(0.6, s * 0.022);
    x.beginPath(); x.moveTo(A, A); x.lineTo(i0, i0); x.moveTo(B, A); x.lineTo(i1, i0); x.moveTo(A, B); x.lineTo(i0, i1); x.moveTo(B, B); x.lineTo(i1, i1); x.stroke();
    x.strokeRect(i0, i0, i1 - i0, i1 - i0);
    if (v & 1) {      // givre dans la facette
      x.strokeStyle = 'rgba(255,255,255,0.42)'; x.lineWidth = Math.max(0.5, s * 0.018);
      const cx = s * (0.5 + (v === 3 ? 0.06 : -0.04)), cy = s * 0.55;
      x.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; x.moveTo(cx - Math.cos(a) * s * 0.13, cy - Math.sin(a) * s * 0.13); x.lineTo(cx + Math.cos(a) * s * 0.13, cy + Math.sin(a) * s * 0.13); } x.stroke();
    }
    x.restore();
    x.lineWidth = Math.max(1, s * 0.045); x.strokeStyle = shade(col, -0.52);
    rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
    star4(x, s * 0.27, s * 0.26, s * 0.13, 'rgba(255,255,255,0.95)');
  }
  function tNeon(x, s, col, v) {
    const g = Math.max(0.5, s * 0.03), w = s - 2 * g, r = s * 0.15, ins = s * 0.1, pw = s - 2 * ins;
    const mg = x.createLinearGradient(0, g, 0, s - g);
    mg.addColorStop(0, '#6a74a0'); mg.addColorStop(0.4, '#2c3254'); mg.addColorStop(1, '#10132a');
    x.fillStyle = mg; rr(x, g, g, w, w, r); x.fill();
    x.lineWidth = Math.max(1, s * 0.035); x.strokeStyle = rgba(col, 0.75);
    rr(x, g + s * 0.035, g + s * 0.035, w - s * 0.07, w - s * 0.07, r * 0.85); x.stroke();
    const pg = x.createLinearGradient(0, ins, 0, s - ins);
    pg.addColorStop(0, mixHex(col, '#ffffff', 0.3)); pg.addColorStop(0.5, col); pg.addColorStop(1, shade(col, -0.32));
    x.fillStyle = pg; rr(x, ins, ins, pw, pw, s * 0.07); x.fill();
    x.save(); rr(x, ins, ins, pw, pw, s * 0.07); x.clip();
    const rg = x.createRadialGradient(s * 0.5, s * 0.62, 0, s * 0.5, s * 0.62, pw * 0.55);
    rg.addColorStop(0, 'rgba(255,255,255,0.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(255,255,255,0.32)';      // reflet en biais
    x.beginPath(); x.moveTo(ins, ins + pw * 0.38); x.lineTo(ins + pw * 0.38, ins); x.lineTo(ins + pw * 0.6, ins); x.lineTo(ins, ins + pw * 0.6); x.closePath(); x.fill();
    x.strokeStyle = rgba(shade(col, -0.45), 0.55); x.lineWidth = Math.max(0.6, s * 0.022);      // circuit gravé
    x.beginPath(); const cy = ins + pw * (v % 2 ? 0.72 : 0.78); x.moveTo(ins + pw * 0.12, cy); x.lineTo(ins + pw * 0.5, cy); x.lineTo(ins + pw * 0.62, cy - pw * 0.12); x.lineTo(ins + pw * 0.88, cy - pw * 0.12); x.stroke();
    x.restore();
    x.lineWidth = Math.max(0.8, s * 0.028); x.strokeStyle = rgba(mixHex(col, '#ffffff', 0.7), 0.8);
    rr(x, ins + 0.5, ins + 0.5, pw - 1, pw - 1, s * 0.07); x.stroke();
    x.fillStyle = 'rgba(225,232,255,0.75)';
    const q = g + s * 0.055, q2 = s - g - s * 0.055, rv = Math.max(0.5, s * 0.02);
    for (const [rx, ry] of [[q, q], [q2, q], [q, q2], [q2, q2]]) { x.beginPath(); x.arc(rx, ry, rv, 0, TAU); x.fill(); }
    x.lineWidth = Math.max(1, s * 0.04); x.strokeStyle = 'rgba(0,0,0,0.7)';
    rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
    star4(x, s * 0.3, s * 0.27, s * 0.1, 'rgba(255,255,255,0.9)');
  }
  const IRIS = ['#ff5a7a', '#ffd23a', '#7dff8a', '#3fd2ff', '#b07bff', '#ff6ec7'];
  function tPrism(x, s, col, v) {
    const g = Math.max(0.5, s * 0.035), w = s - 2 * g, r = s * 0.2;
    const gr = x.createLinearGradient(0, g, 0, s - g);
    gr.addColorStop(0, mixHex(col, '#ffffff', 0.38)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.36));
    x.fillStyle = gr; rr(x, g, g, w, w, r); x.fill();
    x.save(); rr(x, g, g, w, w, r); x.clip();
    x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = Math.max(0.6, s * 0.024);
    x.beginPath(); x.moveTo(g, g); x.lineTo(s / 2, s * 0.42); x.lineTo(s - g, g); x.moveTo(s / 2, s * 0.42); x.lineTo(s / 2, s - g);
    x.moveTo(g, s - g); x.lineTo(s / 2, s * 0.42); x.lineTo(s - g, s - g); x.stroke();
    const off = (v % 4) / 4 * 2.2 - 0.6;
    const band = x.createLinearGradient(s * (off - 0.7), 0, s * (off + 0.3), s);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    IRIS.forEach((c2, i) => band.addColorStop(0.28 + i * 0.08, rgba(c2, 0.3)));
    band.addColorStop(0.95, 'rgba(255,255,255,0)');
    x.fillStyle = band; x.fillRect(0, 0, s, s);
    x.restore();
    const gl = x.createLinearGradient(0, g + s * 0.05, 0, g + s * 0.4);
    gl.addColorStop(0, 'rgba(255,255,255,0.75)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gl; rr(x, g + s * 0.14, g + s * 0.08, w - s * 0.28, s * 0.28, s * 0.13); x.fill();
    x.lineWidth = Math.max(1, s * 0.05); x.strokeStyle = shade(col, -0.55);
    rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
    x.lineWidth = Math.max(0.8, s * 0.032); x.strokeStyle = 'rgba(255,255,255,0.5)';
    rr(x, g + s * 0.07, g + s * 0.07, w - s * 0.14, w - s * 0.14, r * 0.7); x.stroke();
    star4(x, s * 0.26, s * 0.25, s * 0.12, 'rgba(255,255,255,0.95)');
  }
  const TILE_PAINT = [tGarden, tSea, tIce, tNeon, tPrism];
  // lignes de l'intrus (blocs « sales ») : terre, sable, nuage d'orage, roche d'astéroïde, obsidienne
  const GARB = ['#8a5a36', '#c9a46a', '#5d6782', '#706a76', '#3a2456'];
  function tGarb(x, s, w0, v) {
    const col = GARB[w0], g = Math.max(0.5, s * 0.035), w = s - 2 * g, r = s * (w0 === 2 ? 0.32 : 0.16);
    const gr = x.createLinearGradient(0, g, 0, s - g);
    gr.addColorStop(0, shade(col, 0.18)); gr.addColorStop(1, shade(col, -0.32));
    x.fillStyle = gr; rr(x, g, g, w, w, r); x.fill();
    x.save(); rr(x, g, g, w, w, r); x.clip();
    for (let i = 0; i < 6; i++) {
      const px = g + hash(v * 13 + i * 4.7) * w, py = g + hash(v * 29 + i * 2.9) * w, pr = s * (0.05 + hash(i * 3.3 + v) * 0.07);
      if (w0 === 0) { x.fillStyle = i % 2 ? 'rgba(60,36,20,0.55)' : 'rgba(170,160,150,0.8)'; x.beginPath(); x.ellipse(px, py, pr, pr * 0.7, i, 0, TAU); x.fill(); }
      else if (w0 === 1) { x.strokeStyle = 'rgba(120,90,50,0.45)'; x.lineWidth = s * 0.025; x.beginPath(); x.arc(px, py + s * 0.2, s * 0.25, 3.6, 5.8); x.stroke(); }
      else if (w0 === 2) { x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.arc(px, py * 0.5, pr * 1.6, 0, TAU); x.fill(); }
      else if (w0 === 3) { x.fillStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.arc(px, py, pr, 0, TAU); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = s * 0.02; x.beginPath(); x.arc(px, py, pr, 3.4, 5.6); x.stroke(); }
      else { x.strokeStyle = 'rgba(200,120,255,0.55)'; x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(px - pr * 2, py); x.lineTo(px, py - pr); x.lineTo(px + pr * 2, py + pr * 0.5); x.stroke(); }
    }
    if (w0 === 1) { x.fillStyle = '#ffd9e0'; x.beginPath(); x.arc(s * 0.66, s * 0.66, s * 0.11, Math.PI, TAU); x.lineTo(s * 0.66, s * 0.74); x.fill(); }
    if (w0 === 2) { x.fillStyle = 'rgba(160,220,255,0.75)'; x.beginPath(); x.ellipse(s * 0.35, s * 0.72, s * 0.04, s * 0.08, 0.3, 0, TAU); x.fill(); x.beginPath(); x.ellipse(s * 0.62, s * 0.8, s * 0.04, s * 0.08, 0.3, 0, TAU); x.fill(); }
    x.restore();
    x.lineWidth = Math.max(1, s * 0.05); x.strokeStyle = shade(col, -0.6);
    rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
  }
  // tuile : couleur, taille (px réels), matière (monde), variante (0-3), sorte ('' normale, 'g' ligne de l'intrus)
  function tileImg(color, px, mat, v, kind) {
    px = Math.max(3, Math.round(px)); mat = mat | 0; v = v | 0;
    return cacheGet('t' + mat + (kind || '') + color + px + '.' + v, px, (x, s) => {
      if (kind === 'g') tGarb(x, s, mat, v);
      else TILE_PAINT[mat](x, s, color, v);
    });
  }
  // décor posé sur les blocs dont le dessus est libre : touffe d'herbe, corail, petit nuage (hauteur = moitié de case)
  function capImg(mat, px, v) {
    px = Math.max(6, Math.round(px)); v = v | 0;
    const ph = Math.round(px * 0.55);
    return cacheGet('cap' + mat + '.' + px + '.' + v, px, (x, s, h) => {
      x.lineCap = 'round';
      if (mat === 0) {
        const greens = ['#2f8f3a', '#45b545', '#78d85a', '#9be86a'];
        for (let i = 0; i < 13; i++) {
          const bx = s * (0.04 + i / 12 * 0.92) + (hash(v * 9 + i) - 0.5) * s * 0.06, bh = h * (0.45 + hash(v * 5 + i * 1.7) * 0.5);
          const lean = (hash(i * 3.3 + v) - 0.5) * s * 0.22;
          x.fillStyle = greens[(i + v) % 4];
          x.beginPath(); x.moveTo(bx - s * 0.035, h); x.quadraticCurveTo(bx + lean * 0.3, h - bh * 0.6, bx + lean, h - bh); x.quadraticCurveTo(bx + lean * 0.2, h - bh * 0.5, bx + s * 0.04, h); x.closePath(); x.fill();
        }
        if (v === 1) flower5(x, s * 0.7, h * 0.32, s * 0.12, '#ffffff', '#ffd23a');
        else if (v === 2) flower5(x, s * 0.3, h * 0.36, s * 0.1, '#ffd23a', '#ff9a3a');
        else if (v === 3) flower5(x, s * 0.58, h * 0.3, s * 0.11, '#ff8fc4', '#fff1a0');
      } else if (mat === 1) {
        if (v === 0) {      // petit corail branchu (bouts ronds plus clairs)
          const br = (bx, by, len, ang, wd, d) => {
            const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
            x.strokeStyle = '#ff6f9a'; x.lineWidth = wd; x.lineCap = 'round';
            x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
            if (d > 0) { br(ex, ey, len * 0.72, ang - 0.55, wd * 0.72, d - 1); br(ex, ey, len * 0.72, ang + 0.5, wd * 0.72, d - 1); }
            else { x.fillStyle = '#ffc6dc'; x.beginPath(); x.arc(ex, ey, wd * 0.75, 0, TAU); x.fill(); }
          };
          br(s * 0.36, h * 1.02, h * 0.42, -Math.PI / 2 - 0.12, s * 0.085, 2);
        } else if (v === 1) {      // anémone
          x.strokeStyle = '#ffa64d'; x.lineWidth = s * 0.05;
          for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.18 + i / 5 * 0.64); x.beginPath(); x.moveTo(s * 0.66, h); x.quadraticCurveTo(s * 0.66 + Math.cos(a) * s * 0.12, h + Math.sin(a) * h * 0.5, s * 0.66 + Math.cos(a) * s * 0.2, h + Math.sin(a) * h * 0.85); x.stroke(); }
        } else if (v === 2) {      // herbes marines
          x.strokeStyle = '#3fd08a'; x.lineWidth = s * 0.05;
          for (let i = 0; i < 3; i++) { const bx = s * (0.42 + i * 0.1); x.beginPath(); x.moveTo(bx, h); x.quadraticCurveTo(bx - s * 0.08, h * 0.5, bx + s * 0.03, h * 0.05); x.stroke(); }
        }
      } else if (mat === 2 && v % 2 === 0) {      // petit nuage posé
        const cx = s * (v === 0 ? 0.36 : 0.62), cy = h * 0.7;
        x.fillStyle = '#c9dcf2';
        x.beginPath(); x.arc(cx - s * 0.12, cy + h * 0.06, s * 0.11, 0, TAU); x.arc(cx + s * 0.13, cy + h * 0.06, s * 0.1, 0, TAU); x.arc(cx, cy - h * 0.05, s * 0.15, 0, TAU); x.fill();
        x.fillStyle = '#ffffff';
        x.beginPath(); x.arc(cx - s * 0.12, cy, s * 0.1, 0, TAU); x.arc(cx + s * 0.12, cy, s * 0.09, 0, TAU); x.arc(cx, cy - h * 0.1, s * 0.13, 0, TAU); x.fill();
      }
    }, ph);
  }
  // pièce bonus de chaque monde (coccinelle, grosse bulle, éclair, comète, étoile), dessinée dans sa case
  function bonusImg(w, px) {
    px = Math.max(6, Math.round(px));
    return cacheGet('bonus' + w + '.' + px, px, (x, s) => {
      const cx = s / 2, cy = s / 2;
      if (w === 0) {      // coccinelle
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(cx, cy + s * 0.32, s * 0.32, s * 0.08, 0, 0, TAU); x.fill();
        x.strokeStyle = '#1a1010'; x.lineWidth = s * 0.035; x.lineCap = 'round';
        for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx + k * s * 0.2, cy + s * (0.02 + i * 0.12)); x.lineTo(cx + k * s * 0.42, cy + s * (-0.04 + i * 0.16)); x.stroke(); }
        x.fillStyle = '#1a1010'; x.beginPath(); x.arc(cx, cy - s * 0.26, s * 0.16, 0, TAU); x.fill();
        x.beginPath(); x.moveTo(cx - s * 0.06, cy - s * 0.38); x.lineTo(cx - s * 0.16, cy - s * 0.47); x.moveTo(cx + s * 0.06, cy - s * 0.38); x.lineTo(cx + s * 0.16, cy - s * 0.47); x.stroke();
        const bg = x.createRadialGradient(cx - s * 0.1, cy - s * 0.08, s * 0.03, cx, cy + s * 0.04, s * 0.38);
        bg.addColorStop(0, '#ff7a6a'); bg.addColorStop(0.6, '#e8242c'); bg.addColorStop(1, '#a50f1a');
        x.fillStyle = bg; x.beginPath(); x.ellipse(cx, cy + s * 0.05, s * 0.33, s * 0.31, 0, 0, TAU); x.fill();
        x.strokeStyle = '#1a1010'; x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(cx, cy - s * 0.25); x.lineTo(cx, cy + s * 0.36); x.stroke();
        x.fillStyle = '#1a1010';
        for (const [dx, dy, dr] of [[-0.17, -0.06, 0.07], [0.17, -0.06, 0.07], [-0.2, 0.15, 0.065], [0.2, 0.15, 0.065], [-0.08, 0.27, 0.05], [0.08, 0.27, 0.05]]) { x.beginPath(); x.arc(cx + dx * s, cy + dy * s, dr * s, 0, TAU); x.fill(); }
        x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx - s * 0.065, cy - s * 0.3, s * 0.04, 0, TAU); x.arc(cx + s * 0.065, cy - s * 0.3, s * 0.04, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(cx - s * 0.12, cy - s * 0.08, s * 0.08, s * 0.04, -0.6, 0, TAU); x.fill();
      } else if (w === 1) {      // grosse bulle
        const R = s * 0.42;
        const bg = x.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
        bg.addColorStop(0, 'rgba(255,255,255,0.55)'); bg.addColorStop(0.55, 'rgba(160,240,255,0.25)'); bg.addColorStop(0.9, 'rgba(120,220,255,0.45)'); bg.addColorStop(1, 'rgba(255,255,255,0.9)');
        x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
        const ir = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        IRIS.forEach((c2, i) => ir.addColorStop(i / 5, rgba(c2, 0.75)));
        x.strokeStyle = ir; x.lineWidth = s * 0.05; x.beginPath(); x.arc(cx, cy, R * 0.95, 0, TAU); x.stroke();
        x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - R * 0.38, cy - R * 0.42, R * 0.2, R * 0.12, -0.7, 0, TAU); x.fill();
        x.beginPath(); x.arc(cx + R * 0.42, cy + R * 0.36, R * 0.07, 0, TAU); x.fill();
      } else if (w === 2) {      // éclair
        const bg = x.createLinearGradient(0, 0, 0, s);
        bg.addColorStop(0, '#3a4a8a'); bg.addColorStop(1, '#141c46');
        x.fillStyle = bg; rr(x, s * 0.05, s * 0.05, s * 0.9, s * 0.9, s * 0.22); x.fill();
        x.strokeStyle = 'rgba(255,230,120,0.8)'; x.lineWidth = s * 0.04; x.stroke();
        x.fillStyle = '#ffe14a'; x.strokeStyle = '#7a4a00'; x.lineWidth = s * 0.035; x.lineJoin = 'round';
        x.beginPath(); x.moveTo(s * 0.58, s * 0.1); x.lineTo(s * 0.26, s * 0.55); x.lineTo(s * 0.48, s * 0.55); x.lineTo(s * 0.36, s * 0.92); x.lineTo(s * 0.76, s * 0.4); x.lineTo(s * 0.54, s * 0.4); x.lineTo(s * 0.68, s * 0.1); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.moveTo(s * 0.58, s * 0.14); x.lineTo(s * 0.4, s * 0.42); x.lineTo(s * 0.47, s * 0.42); x.closePath(); x.fill();
      } else if (w === 3) {      // comète
        const tg = x.createLinearGradient(s * 0.95, s * 0.05, s * 0.45, s * 0.55);
        tg.addColorStop(0, 'rgba(120,220,255,0)'); tg.addColorStop(1, 'rgba(200,245,255,0.95)');
        x.fillStyle = tg; x.beginPath(); x.moveTo(s * 0.98, s * 0.0); x.lineTo(s * 0.62, s * 0.68); x.lineTo(s * 0.3, s * 0.38); x.closePath(); x.fill();
        const cg = x.createRadialGradient(s * 0.4, s * 0.58, 0, s * 0.42, s * 0.6, s * 0.3);
        cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.35, '#ffe9b0'); cg.addColorStop(1, '#a0603a');
        x.fillStyle = cg; x.beginPath(); x.arc(s * 0.42, s * 0.6, s * 0.27, 0, TAU); x.fill();
        x.fillStyle = 'rgba(90,50,30,0.5)'; x.beginPath(); x.arc(s * 0.5, s * 0.68, s * 0.06, 0, TAU); x.arc(s * 0.32, s * 0.66, s * 0.04, 0, TAU); x.fill();
      } else {      // étoile magique
        const gg = x.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
        gg.addColorStop(0, 'rgba(255,240,160,0.9)'); gg.addColorStop(1, 'rgba(255,110,199,0)');
        x.fillStyle = gg; x.fillRect(0, 0, s, s);
        const sg = x.createLinearGradient(0, s * 0.1, 0, s * 0.9);
        sg.addColorStop(0, '#fffbe0'); sg.addColorStop(0.5, '#ffd84a'); sg.addColorStop(1, '#ff9a3a');
        x.fillStyle = sg; star5(x, cx, cy + s * 0.03, s * 0.44, s * 0.2); x.fill();
        x.strokeStyle = '#a0500a'; x.lineWidth = s * 0.035; x.lineJoin = 'round'; x.stroke();
        x.fillStyle = '#5a2a00'; x.beginPath(); x.arc(cx - s * 0.08, cy + s * 0.02, s * 0.035, 0, TAU); x.arc(cx + s * 0.08, cy + s * 0.02, s * 0.035, 0, TAU); x.fill();
        x.strokeStyle = '#5a2a00'; x.lineWidth = s * 0.03; x.beginPath(); x.arc(cx, cy + s * 0.08, s * 0.06, 0.3, Math.PI - 0.3); x.stroke();
      }
    });
  }
  // emblème du bloc doré de chaque monde : fleur, perle, soleil, étoile, diamant
  function goldIconImg(w, px) {
    px = Math.max(6, Math.round(px));
    return cacheGet('gold' + w + '.' + px, px, (x, s) => {
      const cx = s / 2, cy = s / 2;
      if (w === 0) flower5(x, cx, cy, s * 0.36, '#fffbe6', '#ff9a1a');
      else if (w === 1) {
        x.fillStyle = 'rgba(120,80,40,0.5)'; x.beginPath(); x.ellipse(cx, cy + s * 0.2, s * 0.36, s * 0.14, 0, 0, TAU); x.fill();
        const pg = x.createRadialGradient(cx - s * 0.08, cy - s * 0.1, 0, cx, cy, s * 0.26);
        pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.7, '#f4ece0'); pg.addColorStop(1, '#c8b8a8');
        x.fillStyle = pg; x.beginPath(); x.arc(cx, cy, s * 0.24, 0, TAU); x.fill();
      } else if (w === 2) {
        x.strokeStyle = '#fffbe6'; x.lineWidth = s * 0.06; x.lineCap = 'round';
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; x.beginPath(); x.moveTo(cx + Math.cos(a) * s * 0.26, cy + Math.sin(a) * s * 0.26); x.lineTo(cx + Math.cos(a) * s * 0.4, cy + Math.sin(a) * s * 0.4); x.stroke(); }
        x.fillStyle = '#fffbe6'; x.beginPath(); x.arc(cx, cy, s * 0.19, 0, TAU); x.fill();
      } else if (w === 3) { x.fillStyle = '#fffbe6'; star5(x, cx, cy, s * 0.38, s * 0.16); x.fill(); }
      else {
        x.fillStyle = '#fffbe6';
        x.beginPath(); x.moveTo(cx, cy + s * 0.36); x.lineTo(cx - s * 0.34, cy - s * 0.06); x.lineTo(cx - s * 0.18, cy - s * 0.3); x.lineTo(cx + s * 0.18, cy - s * 0.3); x.lineTo(cx + s * 0.34, cy - s * 0.06); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(200,140,0,0.6)'; x.lineWidth = s * 0.03;
        x.beginPath(); x.moveTo(cx - s * 0.34, cy - s * 0.06); x.lineTo(cx + s * 0.34, cy - s * 0.06); x.moveTo(cx, cy + s * 0.36); x.lineTo(cx - s * 0.1, cy - s * 0.06); x.lineTo(cx, cy - s * 0.3); x.lineTo(cx + s * 0.1, cy - s * 0.06); x.closePath(); x.stroke();
      }
    });
  }
  function fishImg(k, px) { px = Math.max(8, Math.round(px)); return cacheGet('fish' + k + '.' + px, px, (x, w, h) => fishPaint(x, w, h, k), Math.round(px * 0.6)); }
  // bulle d'air prise dans un bloc (Océan, Au-delà)
  function airImg(px) {
    px = Math.max(6, Math.round(px));
    return cacheGet('air' + px, px, (x, s) => {
      const cx = s / 2, cy = s / 2, R = s * 0.3;
      const g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.6, 'rgba(200,250,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(20,80,120,0.55)'; x.lineWidth = Math.max(1, s * 0.04); x.stroke();
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - R * 0.35, cy - R * 0.38, R * 0.24, R * 0.14, -0.7, 0, TAU); x.fill();
    });
  }
  function ghostImg(color, px) {
    px = Math.max(3, Math.round(px));
    return cacheGet('g' + color + px, px, (x, s) => {
      const ins = s * 0.1, w = s - 2 * ins;
      x.fillStyle = rgba(color, 0.16);
      rr(x, ins, ins, w, w, s * 0.2); x.fill();
      x.lineWidth = Math.max(1, s * 0.07);
      x.strokeStyle = rgba(color, 0.85);
      rr(x, ins, ins, w, w, s * 0.2); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.18)';
      rr(x, ins * 2, ins * 2, w - ins * 2, s * 0.18, s * 0.08); x.fill();
    });
  }
  function glowImg(color, px) {
    px = Math.max(6, Math.round(px));
    return cacheGet('h' + color + px, px, (x, s) => {
      const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, rgba(color, 0.55));
      g.addColorStop(0.45, rgba(color, 0.22));
      g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g;
      x.fillRect(0, 0, s, s);
    });
  }

  // ===========================================================================
  // DÉCORS DES MONDES — couches dessinées une fois par taille d'écran, qui défilent en
  // parallaxe, + éléments animés (papillons, poissons, oiseaux, étoiles…).
  // makeScene(monde, W, H, q) → décor ; drawScene(S, ctx, t, st, ox, oy, mx) :
  // st = ambiance continue 0..2 (le décor évolue d'un niveau à l'autre du monde),
  // ox / oy = décalage de caméra (voyages), mx = parallaxe horizontale (−1..1).
  // ===========================================================================
  function mkCv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function stCol(arr, st) { const i = Math.min(arr.length - 2, Math.max(0, Math.floor(st))); return mixHex(arr[i], arr[i + 1], clamp(st - i, 0, 1)); }
  function stNum(arr, st) { const i = Math.min(arr.length - 2, Math.max(0, Math.floor(st))); return lerp(arr[i], arr[i + 1], clamp(st - i, 0, 1)); }
  function stW(st, i) { return clamp(1 - Math.abs(st - i), 0, 1); }
  function ridge(u, seed, oct) {
    let v = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < (oct || 4); o++) { v += a * Math.sin(u * f * TAU + hash(seed * 7.1 + o * 3.3) * TAU); n += a; a *= 0.5; f *= 2.07; }
    return v / n;
  }
  // k < 1 : sprite flou (halo, rayons, nébuleuse) dessiné en basse définition (moins de mémoire, envoi au GPU plus rapide)
  function sprite(S, w, h, paint, k) {
    const q = S.q * (k || 1), cv = mkCv(w * q, h * q), x = cv.getContext('2d');
    x.setTransform(q, 0, 0, q, 0, 0);
    paint(x, w, h);
    cv._w = w; cv._h = h;
    return cv;
  }
  function strip(S, h, paint) { return sprite(S, S.W + 2 * S.m, h, paint); }
  function glowSp(S, r, col, a) {
    return sprite(S, r * 2, r * 2, (x) => {
      const g = x.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, rgba(col, a)); g.addColorStop(0.3, rgba(col, a * 0.42)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
    }, Math.min(1, 256 / (r * 2 * S.q)));
  }
  // pose une bande en parallaxe (profondeur d : 0 = au loin, 1 = devant)
  function band(ctx, S, cv, y, d, ox, oy, mx, a) {
    if (a !== undefined) { if (a <= 0.01) return; ctx.globalAlpha = a; }
    ctx.drawImage(cv, -S.m + mx * 0.5 * d * S.m + ox * d, y + oy * (0.55 + 0.45 * d), cv._w, cv._h);
    if (a !== undefined) ctx.globalAlpha = 1;
  }
  function skyFill(ctx, W, H, cols, oy) {
    const g = ctx.createLinearGradient(0, oy * 0.55, 0, H + oy * 0.55);
    for (let i = 0; i < cols.length; i++) g.addColorStop(i / (cols.length - 1), cols[i]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function cloudPaint(x, w, h, seed, lit, shadow, rim) {
    const n = 5 + Math.floor(hash(seed * 1.3) * 3), blobs = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, r = h * (0.2 + 0.24 * Math.sin(u * Math.PI) + hash(seed * 3.7 + i) * 0.1);
      blobs.push([w * (0.13 + u * 0.74) + (hash(seed + i * 1.9) - 0.5) * w * 0.05, h * 0.68 - r * 0.62, r]);
    }
    const path = (dx, dy, k) => {
      x.beginPath();
      for (const [bx, by, r] of blobs) { x.moveTo(bx + dx + r * k, by + dy); x.arc(bx + dx, by + dy, r * k, 0, TAU); }
      x.moveTo(w * 0.88 + dx, h * 0.7 + dy); x.ellipse(w * 0.5 + dx, h * 0.7 + dy, w * 0.38, h * 0.15 * k, 0, 0, TAU);
    };
    x.fillStyle = shadow; path(0, 0, 1); x.fill();
    const g = x.createLinearGradient(0, h * 0.05, 0, h * 0.85);
    g.addColorStop(0, lit); g.addColorStop(0.6, lit); g.addColorStop(1, mixHex(lit, shadow, 0.6));
    x.fillStyle = g; path(-w * 0.01, -h * 0.06, 0.9); x.fill();
    if (rim) { x.fillStyle = rim; path(-w * 0.025, -h * 0.12, 0.6); x.fill(); }
  }
  function treePaint(x, X, y, r, dark, light) {
    x.fillStyle = '#6b4a2a'; x.fillRect(X - r * 0.12, y - r * 0.3, r * 0.24, r * 0.75);
    x.fillStyle = dark;
    x.beginPath(); x.arc(X, y - r * 0.85, r * 0.78, 0, TAU); x.arc(X - r * 0.42, y - r * 0.5, r * 0.55, 0, TAU); x.arc(X + r * 0.45, y - r * 0.52, r * 0.56, 0, TAU); x.fill();
    x.fillStyle = light; x.beginPath(); x.arc(X - r * 0.22, y - r * 1.05, r * 0.38, 0, TAU); x.fill();
  }
  function fishPaint(x, w, h, kind) {
    const C = [['#ff8a2a', '#ffd6a8'], ['#3a6bff', '#a8c4ff'], ['#ffd23a', '#fff4b0'], ['#ff6ad0', '#ffd0f0']][kind % 4];
    const bx = w * 0.45, by = h / 2, rx = w * 0.34, ry = h * 0.34;
    x.fillStyle = kind === 1 ? '#ffd23a' : shade(C[0], -0.12);
    x.beginPath(); x.moveTo(bx - rx * 0.75, by); x.lineTo(bx - rx * 1.3, by - ry * 1.05); x.quadraticCurveTo(bx - rx * 1.08, by, bx - rx * 1.3, by + ry * 1.05); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(bx - rx * 0.45, by - ry * 0.75); x.quadraticCurveTo(bx - rx * 0.05, by - ry * 1.75, bx + rx * 0.4, by - ry * 0.8); x.closePath(); x.fill();
    const g = x.createLinearGradient(0, by - ry, 0, by + ry);
    g.addColorStop(0, shade(C[0], -0.12)); g.addColorStop(0.55, C[0]); g.addColorStop(1, C[1]);
    x.fillStyle = g; x.beginPath(); x.ellipse(bx, by, rx, ry, 0, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.ellipse(bx, by, rx, ry, 0, 0, TAU); x.clip();
    if (kind === 0) { x.fillStyle = '#ffffff'; for (const k of [-0.42, 0.22]) { x.beginPath(); x.ellipse(bx + rx * k, by, rx * 0.12, ry * 1.2, 0, 0, TAU); x.fill(); } }
    if (kind === 1) { x.fillStyle = '#10183a'; x.beginPath(); x.ellipse(bx - rx * 0.1, by - ry * 0.35, rx * 0.55, ry * 0.3, 0.2, 0, TAU); x.fill(); }
    if (kind === 3) { x.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(bx - rx * 0.4 + i * rx * 0.25, by + ry * 0.2, ry * 0.12, 0, TAU); x.fill(); } }
    x.restore();
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(bx + rx * 0.55, by - ry * 0.12, ry * 0.28, 0, TAU); x.fill();
    x.fillStyle = '#10141c'; x.beginPath(); x.arc(bx + rx * 0.6, by - ry * 0.12, ry * 0.15, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = Math.max(0.8, h * 0.04); x.beginPath(); x.ellipse(bx, by, rx, ry, 0, 0, TAU); x.stroke();
  }
  function birdPath(ctx, x, y, s, flap) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.25 * flap); ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.55 * flap, x, y);
    ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.55 * flap, x + s, y - s * 0.25 * flap);
    ctx.stroke();
  }
  function butterfly(ctx, x, y, s, k, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const kx = 0.2 + 0.8 * k;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(-s * 0.42 * kx, -s * 0.2, s * 0.46 * kx, s * 0.36, -0.35, 0, TAU); ctx.ellipse(s * 0.42 * kx, -s * 0.2, s * 0.46 * kx, s * 0.36, 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(col, -0.25);
    ctx.beginPath(); ctx.ellipse(-s * 0.3 * kx, s * 0.22, s * 0.3 * kx, s * 0.24, 0.4, 0, TAU); ctx.ellipse(s * 0.3 * kx, s * 0.22, s * 0.3 * kx, s * 0.24, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-s * 0.45 * kx, -s * 0.25, s * 0.09, 0, TAU); ctx.arc(s * 0.45 * kx, -s * 0.25, s * 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.07, s * 0.36, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function starsPaint(x, w, h, n, seed, rMin, rMax, cols) {
    for (let i = 0; i < n; i++) {
      const px = hash(seed + i * 1.37) * w, py = hash(seed * 2 + i * 2.71) * h, r = rMin + Math.pow(hash(seed * 3 + i * 0.77), 3) * (rMax - rMin);
      x.globalAlpha = 0.35 + hash(i * 5.3 + seed) * 0.65;
      x.fillStyle = cols[i % cols.length];
      x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
    x.globalAlpha = 1;
  }
  function planetPaint(x, cx, cy, r, c0, c1, c2, bands, seed) {
    const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
    for (let i = 0; i < bands; i++) {
      const yy = cy - r + (i + 0.5) / bands * 2 * r + (hash(seed + i) - 0.5) * r * 0.1;
      x.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(80,30,0,0.12)';
      x.beginPath(); x.ellipse(cx, yy, r * 1.1, r * (0.05 + hash(seed * 2 + i) * 0.06), 0.08, 0, TAU); x.fill();
    }
    const sh = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.55, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, 'rgba(0,0,10,0.72)');
    x.fillStyle = sh; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.restore();
  }

  const PAINT = [];
  // ---- 1. LA PLAINE : ciel, soleil, nuages, montagnes, collines, prairie qui ondule, papillons ----
  PAINT[0] = {
    *init(S) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      sp.sun = glowSp(S, U * 0.4, '#fff0b0', 0.9);
      yield;
      sp.rays = sprite(S, U * 1.1, U * 1.1, (x, w) => {
        x.translate(w / 2, w / 2);
        for (let i = 0; i < 16; i++) {
          x.rotate(TAU / 16);
          const g = x.createLinearGradient(0, 0, w * 0.5, 0);
          g.addColorStop(0, 'rgba(255,248,210,0.4)'); g.addColorStop(1, 'rgba(255,248,210,0)');
          x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(w * 0.5, -w * (i % 2 ? 0.03 : 0.05)); x.lineTo(w * 0.5, w * (i % 2 ? 0.03 : 0.05)); x.closePath(); x.fill();
        }
      }, 0.5);
      const cw = U * 0.46, ch = cw * 0.44;
      yield;
      sp.clouds = [1, 2, 3].map(sd => sprite(S, cw, ch, (x, w, h) => cloudPaint(x, w, h, sd, '#ffffff', '#c6d6ee', 'rgba(255,255,255,0.55)')));
      S.clouds = [];
      for (let i = 0; i < 6; i++) S.clouds.push({ i: i % 3, u: hash(i * 4.1 + 0.3), y: 0.04 + hash(i * 2.7) * 0.3, s: 0.5 + hash(i * 9.3) * 0.6, v: 0.004 + hash(i * 5.9) * 0.007, d: 0.08 + (i % 3) * 0.1 });
      yield;
      sp.mount = strip(S, H * 0.3, (x, w, h) => {
        for (let L = 0; L < 2; L++) {
          x.beginPath(); x.moveTo(0, h);
          for (let X = 0; X <= w + 3; X += 3) {
            const r = 1 - Math.abs(ridge(X / w * (1.7 + L * 0.8), 11 + L * 5, 4));
            x.lineTo(X, h * (0.36 + L * 0.24) - r * r * h * (0.34 - L * 0.08));
          }
          x.lineTo(w, h); x.closePath();
          const g = x.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, L ? '#88a8cc' : '#a8bede'); g.addColorStop(1, L ? '#b4c9de' : '#cddcec');
          x.fillStyle = g; x.fill();
        }
      });
      yield;
      sp.sea = strip(S, H * 0.07, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5ab8e8'); g.addColorStop(1, '#2a86c8');
        x.fillStyle = g; x.fillRect(0, h * 0.3, w, h * 0.7);
        x.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < w / 9; i++) x.fillRect(hash(i * 3.3) * w, h * (0.35 + hash(i * 1.7) * 0.6), 3 + hash(i) * 6, 1);
      });
      const hillTop = (X, w, h, seed, base, amp) => h * base - ridge(X / w * 1.25, seed, 2) * h * amp;
      yield;
      sp.hill1 = strip(S, H * 0.36, (x, w, h) => {
        x.beginPath(); x.moveTo(0, h);
        for (let X = 0; X <= w + 4; X += 4) x.lineTo(X, hillTop(X, w, h, 21, 0.3, 0.16));
        x.lineTo(w, h); x.closePath();
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a6dc84'); g.addColorStop(1, '#5ea85a');
        x.fillStyle = g; x.fill();
        x.fillStyle = 'rgba(70,130,60,0.25)';
        for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(hash(i * 3.9) * w, h * (0.55 + hash(i * 1.3) * 0.3), w * 0.12, h * 0.05, 0.1, 0, TAU); x.fill(); }
        for (let i = 0; i < Math.round(w / 34); i++) {
          const X = hash(i * 7.7 + 1) * w, y = hillTop(X, w, h, 21, 0.3, 0.16) + h * (0.05 + hash(i * 3.1) * 0.12), r = h * (0.03 + hash(i * 2.2) * 0.025);
          treePaint(x, X, y, r, '#3f8a46', '#6fbf62');
        }
      });
      yield;
      sp.hill2 = strip(S, H * 0.34, (x, w, h) => {
        x.beginPath(); x.moveTo(0, h);
        for (let X = 0; X <= w + 4; X += 4) x.lineTo(X, hillTop(X, w, h, 37, 0.28, 0.14));
        x.lineTo(w, h); x.closePath();
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7cc95e'); g.addColorStop(1, '#3e8f42');
        x.fillStyle = g; x.fill();
        // chemin de terre qui serpente
        x.strokeStyle = 'rgba(236,214,160,0.75)'; x.lineWidth = h * 0.05; x.lineCap = 'round';
        x.beginPath(); x.moveTo(w * 0.62, hillTop(w * 0.62, w, h, 37, 0.28, 0.14) + h * 0.06);
        x.bezierCurveTo(w * 0.5, h * 0.55, w * 0.78, h * 0.7, w * 0.6, h * 1.02); x.stroke();
        // petite maison
        const hx = w * 0.2, hy = hillTop(hx, w, h, 37, 0.28, 0.14) + h * 0.07, hs = h * 0.07;
        x.fillStyle = '#f4ead8'; x.fillRect(hx - hs, hy - hs, hs * 2, hs * 1.1);
        x.fillStyle = '#d4483a'; x.beginPath(); x.moveTo(hx - hs * 1.25, hy - hs); x.lineTo(hx, hy - hs * 2); x.lineTo(hx + hs * 1.25, hy - hs); x.closePath(); x.fill();
        x.fillStyle = '#6b4a2a'; x.fillRect(hx - hs * 0.25, hy - hs * 0.55, hs * 0.5, hs * 0.65);
        for (let i = 0; i < Math.round(w / 52); i++) {
          const X = hash(i * 5.3 + 7) * w; if (Math.abs(X - hx) < hs * 3) continue;
          const y = hillTop(X, w, h, 37, 0.28, 0.14) + h * (0.05 + hash(i * 2.9) * 0.1), r = h * (0.045 + hash(i * 1.1) * 0.03);
          treePaint(x, X, y, r, '#2f7a3c', '#5cb054');
        }
        for (let i = 0; i < w / 14; i++) {
          const X = hash(i * 1.9 + 3) * w, Y = hillTop(X, w, h, 37, 0.28, 0.14) + h * (0.12 + hash(i * 4.4) * 0.7);
          x.fillStyle = ['#ffffff', '#ffd23a', '#ff8fc4'][i % 3]; x.beginPath(); x.arc(X, Y, 1.2 + hash(i) * 1.2, 0, TAU); x.fill();
        }
      });
      yield;
      sp.meadow = strip(S, H * 0.2, (x, w, h) => {
        const top = (X) => h * 0.36 - ridge(X / w * 2.2, 31, 2) * h * 0.1;
        x.beginPath(); x.moveTo(0, h); for (let X = 0; X <= w + 6; X += 6) x.lineTo(X, top(X)); x.lineTo(w, h); x.closePath();
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#58b84e'); g.addColorStop(1, '#23702f');
        x.fillStyle = g; x.fill();
        const greens = ['#2f8a3a', '#3fa846', '#6cc85a', '#8fe070'];
        const nb = Math.round(w / 2.4);
        for (let i = 0; i < nb; i++) {
          const X = hash(i * 0.913 + 2) * w, y0 = top(X) + h * (0.05 + hash(i * 3.71) * 0.55), bh = h * (0.12 + hash(i * 1.37) * 0.22), lean = (hash(i * 7.3) - 0.5) * bh * 0.6;
          x.fillStyle = greens[i % 4];
          x.beginPath(); x.moveTo(X - 1.6, y0); x.quadraticCurveTo(X + lean * 0.3, y0 - bh * 0.6, X + lean, y0 - bh); x.quadraticCurveTo(X + lean * 0.2, y0 - bh * 0.5, X + 1.8, y0); x.closePath(); x.fill();
        }
        const fl = [['#ffffff', '#ffd23a'], ['#ffd23a', '#ff8a2a'], ['#ff8fc4', '#fff1a0'], ['#c9a3ff', '#ffffff'], ['#ff5a5a', '#2a1a10']];
        for (let i = 0; i < w / 19; i++) {
          const X = hash(i * 2.31 + 9) * w, Y = top(X) + h * (0.08 + hash(i * 6.1) * 0.5), r = h * (0.035 + hash(i * 3.9) * 0.03);
          x.strokeStyle = '#2f7a34'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + r * 0.3, Y + r * 3); x.stroke();
          const f = fl[i % fl.length]; flower5(x, X, Y, r, f[0], f[1]);
        }
      });
      S.fly = [];
      const FC = ['#ffb13a', '#ffe25a', '#ffffff', '#7fc8ff', '#ff8fc4', '#c9a3ff'];
      for (let i = 0; i < 7; i++) S.fly.push({ u: hash(i * 3.3 + 1), y: 0.3 + hash(i * 5.1) * 0.55, v: (0.012 + hash(i * 7.7) * 0.02) * (i % 2 ? 1 : -1), ph: hash(i * 2.2) * TAU, col: FC[i % FC.length], s: U * (0.016 + hash(i * 1.9) * 0.01) });
      S.motes = [];
      for (let i = 0; i < 18; i++) S.motes.push({ u: hash(i * 1.7 + 4), y: hash(i * 8.3), v: 0.01 + hash(i * 4.9) * 0.02, ph: hash(i) * TAU });
    },
    draw(S, ctx, t, st, ox, oy, mx) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      skyFill(ctx, W, H, [stCol(['#86bfea', '#3ea6f4', '#4c94dc'], st), stCol(['#cbc6ea', '#97d4ff', '#ffc485'], st), stCol(['#ffdcb0', '#e4f7ff', '#ffe2a0'], st)], oy);
      const sx = stNum([0.18, 0.74, 0.84], st) * W + mx * 3, sy = stNum([0.4, 0.13, 0.3], st) * H + oy * 0.55;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.translate(sx, sy); ctx.rotate(t * 0.025);
      ctx.drawImage(sp.rays, -sp.rays._w / 2, -sp.rays._h / 2, sp.rays._w, sp.rays._h);
      ctx.rotate(-t * 0.025); ctx.translate(-sx, -sy);
      ctx.globalAlpha = 1;
      ctx.drawImage(sp.sun, sx - sp.sun._w / 2, sy - sp.sun._h / 2, sp.sun._w, sp.sun._h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stCol(['#ffe9c0', '#fffdf0', '#fff0b0'], st);
      ctx.beginPath(); ctx.arc(sx, sy, U * 0.05, 0, TAU); ctx.fill();
      for (const c of S.clouds) {
        const cv = sp.clouds[c.i], w = cv._w * c.s, h = cv._h * c.s;
        const u = ((c.u + t * c.v) % 1.35) - 0.2;
        ctx.drawImage(cv, u * W + mx * c.d * S.m * 0.5, c.y * H + oy * (0.55 + 0.45 * c.d), w, h);
      }
      ctx.strokeStyle = 'rgba(40,50,70,0.55)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const u = ((hash(i * 4.4) + t * (0.012 + i * 0.003)) % 1.3) - 0.15;
        birdPath(ctx, u * W, H * (0.16 + i * 0.05) + Math.sin(t + i) * 6 + oy * 0.6, U * 0.012, Math.sin(t * 9 + i * 2));
      }
      band(ctx, S, sp.mount, H * 0.4, 0.2, ox, oy, mx);
      band(ctx, S, sp.sea, H * 0.6, 0.3, ox, oy, mx, clamp(st - 1, 0, 1));
      const w0 = stW(st, 0);
      if (w0 > 0.01) {
        const my = H * 0.6 + oy * 0.7;
        const g = ctx.createLinearGradient(0, my - H * 0.05, 0, my + H * 0.06);
        g.addColorStop(0, 'rgba(255,240,236,0)'); g.addColorStop(0.5, 'rgba(255,240,236,' + (0.55 * w0) + ')'); g.addColorStop(1, 'rgba(255,240,236,0)');
        ctx.fillStyle = g; ctx.fillRect(0, my - H * 0.05, W, H * 0.11);
      }
      band(ctx, S, sp.hill1, H * 0.54, 0.42, ox, oy, mx);
      band(ctx, S, sp.hill2, H * 0.67, 0.68, ox, oy, mx);
      const myb = H * 0.82 + sp.meadow._h + oy;
      const sk = Math.sin(t * 1.2) * 0.04 + Math.sin(t * 2.7 + 1) * 0.015;
      ctx.save();
      ctx.translate(0, myb); ctx.transform(1, 0, sk, 1, 0, 0); ctx.translate(0, -myb);
      band(ctx, S, sp.meadow, H * 0.82, 1, ox, oy, mx);
      ctx.restore();
      for (const f of S.fly) {
        const u = (((f.u + t * f.v) % 1.2) + 1.2) % 1.2 - 0.1;
        const x = u * W + Math.sin(t * 1.7 + f.ph) * U * 0.03, y = f.y * H + Math.sin(t * 1.1 + f.ph) * H * 0.05 + Math.sin(t * 3.3 + f.ph) * H * 0.012 + oy * 0.9;
        butterfly(ctx, x, y, f.s, Math.abs(Math.sin(t * 13 + f.ph)), f.col, (f.v > 0 ? 0.25 : -0.25) + Math.sin(t * 2 + f.ph) * 0.15);
      }
      ctx.fillStyle = '#fffbe0';
      for (const p of S.motes) {
        const x = ((p.u + Math.sin(t * 0.3 + p.ph) * 0.03 + t * p.v * 0.3) % 1) * W, y = ((p.y - t * p.v + 10) % 1) * H + oy * 0.8;
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + p.ph);
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
      const w2 = clamp(st - 1, 0, 1);
      if (w2 > 0.01) { ctx.fillStyle = 'rgba(255,150,40,' + (0.13 * w2) + ')'; ctx.fillRect(0, 0, W, H); }
      if (w0 > 0.01) { ctx.fillStyle = 'rgba(255,170,190,' + (0.08 * w0) + ')'; ctx.fillRect(0, 0, W, H); }
    }
  };

  // ---- 2. L'OCÉAN : lumière qui ondule, rayons, coraux, algues, poissons, tortue, méduses, bulles ----
  PAINT[1] = {
    *init(S) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      sp.ray = sprite(S, U * 0.16, H * 1.05, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(220,255,255,0)'); g.addColorStop(0.5, 'rgba(220,255,255,0.42)'); g.addColorStop(1, 'rgba(220,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        const f = x.createLinearGradient(0, 0, 0, h);
        f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(1, 'rgba(0,0,0,1)');
        x.globalCompositeOperation = 'destination-out'; x.fillStyle = f; x.fillRect(0, 0, w, h);
      }, 0.5);
      yield;
      sp.caus = strip(S, H * 0.3, (x, w, h) => {
        x.lineCap = 'round';
        for (let k = 0; k < 2; k++) for (let i = 0; i < 16; i++) {
          x.strokeStyle = 'rgba(230,255,255,' + (0.1 + hash(i * 3.1 + k) * 0.14) + ')'; x.lineWidth = 1.2 + hash(i * 1.7 + k) * 2.4;
          x.beginPath();
          const y0 = h * (i / 16), f1 = 0.012 + hash(i + k * 9) * 0.01, f2 = 0.031 + hash(i * 2 + k) * 0.02;
          for (let X = 0; X <= w; X += 6) { const y = y0 + Math.sin(X * f1 + i * 1.3 + k * 2) * h * 0.06 + Math.sin(X * f2 + i) * h * 0.025; if (X) x.lineTo(X, y); else x.moveTo(X, y); }
          x.stroke();
        }
        const f = x.createLinearGradient(0, 0, 0, h);
        f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(0.35, 'rgba(0,0,0,0.2)'); f.addColorStop(1, 'rgba(0,0,0,1)');
        x.globalCompositeOperation = 'destination-out'; x.fillStyle = f; x.fillRect(0, 0, w, h);
      });
      yield;
      sp.sand = strip(S, H * 0.2, (x, w, h) => {
        x.beginPath(); x.moveTo(0, h); for (let X = 0; X <= w + 6; X += 6) x.lineTo(X, h * 0.35 - ridge(X / w * 1.5, 41, 2) * h * 0.12); x.lineTo(w, h); x.closePath();
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f2dfa8'); g.addColorStop(1, '#c9a86a');
        x.fillStyle = g; x.fill();
        x.strokeStyle = 'rgba(170,130,70,0.35)'; x.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) { const y = h * (0.5 + i * 0.055); x.beginPath(); for (let X = 0; X <= w; X += 8) { const yy = y + Math.sin(X * 0.05 + i) * 2; if (X) x.lineTo(X, yy); else x.moveTo(X, yy); } x.stroke(); }
        for (let i = 0; i < w / 60; i++) { const X = hash(i * 9.1) * w, Y = h * (0.55 + hash(i * 2.3) * 0.35); x.fillStyle = ['#ffd9e0', '#fff4d0', '#ffb08a'][i % 3]; x.beginPath(); x.arc(X, Y, h * 0.03, Math.PI, TAU); x.lineTo(X, Y + h * 0.02); x.fill(); }
      });
      yield;
      sp.rocks = strip(S, H * 0.34, (x, w, h) => {
        x.fillStyle = 'rgba(6,40,86,0.42)';
        x.beginPath(); x.moveTo(0, h);
        for (let X = 0; X <= w + 5; X += 5) { const r = Math.abs(ridge(X / w * 2.3, 53, 3)); x.lineTo(X, h * 0.42 + (1 - r) * h * 0.3 - r * h * 0.2); }
        x.lineTo(w, h); x.closePath(); x.fill();
        x.fillStyle = 'rgba(6,40,86,0.3)';
        for (let i = 0; i < w / 70; i++) { const X = hash(i * 3.7 + 1) * w, hh = h * (0.25 + hash(i * 1.3) * 0.3); x.beginPath(); x.moveTo(X - hh * 0.2, h); x.quadraticCurveTo(X - hh * 0.3, h - hh * 0.7, X, h - hh); x.quadraticCurveTo(X + hh * 0.3, h - hh * 0.6, X + hh * 0.25, h); x.fill(); }
      });
      yield;
      sp.reef = strip(S, H * 0.3, (x, w, h) => {
        x.fillStyle = '#2a4a6a';
        x.beginPath(); x.moveTo(0, h); for (let X = 0; X <= w + 6; X += 6) x.lineTo(X, h * 0.72 - Math.abs(ridge(X / w * 3, 61, 3)) * h * 0.22); x.lineTo(w, h); x.closePath(); x.fill();
        const n = Math.round(w / 26);
        for (let i = 0; i < n; i++) {
          const X = (i + hash(i * 1.3)) / n * w, base = h * (0.66 + hash(i * 2.7) * 0.2), kind = i % 5, s = h * (0.16 + hash(i * 4.1) * 0.14);
          const col = ['#ff6f9a', '#ff9a4a', '#b47cff', '#ffd25a', '#4fe0b0'][(i * 3) % 5];
          if (kind === 0 || kind === 3) {      // corail branchu
            x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = s * 0.14;
            const br = (bx, by, len, ang, d) => { const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke(); if (d > 0) { br(ex, ey, len * 0.7, ang - 0.5, d - 1); br(ex, ey, len * 0.7, ang + 0.45, d - 1); } };
            x.lineWidth = s * 0.12; br(X, base, s * 0.45, -Math.PI / 2 + (hash(i) - 0.5) * 0.4, 2);
          } else if (kind === 1) {      // éventail
            x.fillStyle = col;
            x.beginPath(); x.moveTo(X, base); for (let a = -2.6; a <= -0.5; a += 0.15) x.lineTo(X + Math.cos(a) * s, base + Math.sin(a) * s * 1.1 + Math.sin(a * 9) * s * 0.05); x.closePath(); x.fill();
            x.strokeStyle = shade(col, -0.3); x.lineWidth = 1; for (let a = -2.5; a <= -0.6; a += 0.3) { x.beginPath(); x.moveTo(X, base); x.lineTo(X + Math.cos(a) * s * 0.9, base + Math.sin(a) * s); x.stroke(); }
          } else if (kind === 2) {      // corail cerveau
            const g = x.createRadialGradient(X - s * 0.2, base - s * 0.45, s * 0.05, X, base - s * 0.3, s * 0.6);
            g.addColorStop(0, mixHex(col, '#ffffff', 0.4)); g.addColorStop(1, shade(col, -0.25));
            x.fillStyle = g; x.beginPath(); x.ellipse(X, base - s * 0.25, s * 0.55, s * 0.42, 0, Math.PI, TAU); x.lineTo(X + s * 0.55, base); x.lineTo(X - s * 0.55, base); x.fill();
            x.strokeStyle = shade(col, -0.35); x.lineWidth = 1.2;
            for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(X, base - s * 0.2, s * (0.45 - k * 0.12), s * (0.32 - k * 0.09), 0, Math.PI + 0.3, TAU - 0.3); x.stroke(); }
          } else {      // anémone
            x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = s * 0.07;
            for (let k = 0; k < 9; k++) { const a = -Math.PI * (0.12 + k / 8 * 0.76); x.beginPath(); x.moveTo(X, base); x.quadraticCurveTo(X + Math.cos(a) * s * 0.4, base + Math.sin(a) * s * 0.5, X + Math.cos(a) * s * 0.62, base + Math.sin(a) * s * 0.72); x.stroke(); }
            x.fillStyle = shade(col, -0.2); x.beginPath(); x.ellipse(X, base, s * 0.22, s * 0.1, 0, 0, TAU); x.fill();
          }
        }
      });
      const fw = U * 0.085;
      yield;
      sp.fish = [0, 1, 2, 3].map(k => sprite(S, fw, fw * 0.6, (x, w, h) => fishPaint(x, w, h, k)));
      yield;
      sp.turtle = sprite(S, U * 0.17, U * 0.12, (x, w, h) => {
        const sk = '#7cc08a', skd = '#4f8f62';
        x.fillStyle = skd;
        for (const [fx, fy, a, k] of [[0.3, 0.2, -0.5, 1.2], [0.66, 0.16, -0.25, 1.3], [0.28, 0.82, 0.5, 0.9], [0.62, 0.86, 0.3, 0.9]]) { x.beginPath(); x.ellipse(w * fx, h * fy, w * 0.13 * k, h * 0.07 * k, a, 0, TAU); x.fill(); }
        x.fillStyle = sk; x.beginPath(); x.ellipse(w * 0.88, h * 0.5, w * 0.1, h * 0.13, 0, 0, TAU); x.fill();
        x.fillStyle = '#10141c'; x.beginPath(); x.arc(w * 0.92, h * 0.44, h * 0.03, 0, TAU); x.fill();
        x.strokeStyle = '#10141c'; x.lineWidth = 1; x.beginPath(); x.arc(w * 0.9, h * 0.53, h * 0.04, 0.2, 1.4); x.stroke();
        const g = x.createRadialGradient(w * 0.45, h * 0.35, 0, w * 0.5, h * 0.5, w * 0.36);
        g.addColorStop(0, '#a8c860'); g.addColorStop(0.7, '#5e8a3a'); g.addColorStop(1, '#3c5e26');
        x.fillStyle = g; x.beginPath(); x.ellipse(w * 0.5, h * 0.5, w * 0.34, h * 0.36, 0, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(230,240,180,0.6)'; x.lineWidth = Math.max(1, w * 0.012);
        const hex = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9); } x.closePath(); x.stroke(); };
        hex(w * 0.5, h * 0.5, w * 0.09); hex(w * 0.33, h * 0.42, w * 0.07); hex(w * 0.67, h * 0.42, w * 0.07); hex(w * 0.36, h * 0.66, w * 0.065); hex(w * 0.64, h * 0.66, w * 0.065);
        x.strokeStyle = '#2e4a1c'; x.lineWidth = Math.max(1, w * 0.014); x.beginPath(); x.ellipse(w * 0.5, h * 0.5, w * 0.34, h * 0.36, 0, 0, TAU); x.stroke();
      });
      yield;
      sp.jelly = ['#ff7ad8', '#5ef0ff'].map(col => sprite(S, U * 0.13, U * 0.22, (x, w, h) => {
        const g0 = x.createRadialGradient(w / 2, h * 0.28, 0, w / 2, h * 0.28, w * 0.55);
        g0.addColorStop(0, rgba(col, 0.5)); g0.addColorStop(1, rgba(col, 0));
        x.fillStyle = g0; x.fillRect(0, 0, w, h * 0.7);
        x.strokeStyle = rgba(col, 0.7); x.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) { const bx = w * (0.28 + i * 0.11); x.beginPath(); x.moveTo(bx, h * 0.32); for (let k = 1; k <= 6; k++) x.lineTo(bx + Math.sin(k * 1.4 + i) * w * 0.05, h * (0.32 + k * 0.1)); x.stroke(); }
        const g = x.createLinearGradient(0, h * 0.08, 0, h * 0.36);
        g.addColorStop(0, rgba(mixHex(col, '#ffffff', 0.5), 0.95)); g.addColorStop(1, rgba(col, 0.55));
        x.fillStyle = g; x.beginPath(); x.ellipse(w / 2, h * 0.3, w * 0.34, h * 0.22, 0, Math.PI, TAU);
        for (let i = 0; i <= 6; i++) x.lineTo(w * (0.84 - i * 0.113), h * (0.3 + (i % 2) * 0.04));
        x.fill();
      }));
      S.fishes = [];
      for (let i = 0; i < 10; i++) S.fishes.push({ k: i % 4, u: hash(i * 2.9 + 1), y: 0.18 + hash(i * 6.1) * 0.68, v: (0.02 + hash(i * 3.3) * 0.035) * (i % 3 ? 1 : -1), s: i < 4 ? 0.55 + hash(i) * 0.2 : 0.85 + hash(i * 1.7) * 0.5, d: i < 4 ? 0.3 : 0.85, ph: hash(i * 8.8) * TAU });
      S.kelp = [];
      for (let i = 0; i < 7; i++) S.kelp.push({ u: (i + hash(i * 4.4)) / 7, h: 0.22 + hash(i * 2.2) * 0.22, ph: hash(i * 6.6) * TAU, w: U * (0.012 + hash(i) * 0.01) });
      S.bub = [];
      for (let i = 0; i < 16; i++) S.bub.push({ u: hash(i * 3.71 + 2), y: hash(i * 1.37), v: 0.04 + hash(i * 9.1) * 0.06, r: U * (0.004 + hash(i * 4.3) * 0.01), ph: hash(i) * TAU });
      S.snow = [];
      for (let i = 0; i < 40; i++) S.snow.push({ u: hash(i * 2.13 + 5), y: hash(i * 7.31), v: 0.006 + hash(i * 3.9) * 0.012, ph: hash(i * 1.1) * TAU });
    },
    draw(S, ctx, t, st, ox, oy, mx) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      skyFill(ctx, W, H, [stCol(['#6ff0ff', '#2cc4ee', '#0f5a96'], st), stCol(['#1fb8e0', '#0b72b8', '#062a5a'], st), stCol(['#0a7fb8', '#063b73', '#010818'], st)], oy);
      const w0 = stW(st, 0), w1 = stW(st, 1), w2 = clamp(st - 1, 0, 1);
      const ca = stNum([0.85, 0.55, 0.14], st);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = ca;
      const cw = sp.caus._w, cy = oy * 0.6;
      const o1 = ((t * 9) % cw), o2 = ((t * 14) % cw);
      ctx.drawImage(sp.caus, -o1, cy, cw, sp.caus._h); ctx.drawImage(sp.caus, cw - o1, cy, cw, sp.caus._h);
      ctx.globalAlpha = ca * 0.7;
      ctx.save(); ctx.scale(-1, 1);
      ctx.drawImage(sp.caus, -W - o2 * 0.5, cy + H * 0.02, cw, sp.caus._h);
      ctx.restore();
      const ra = stNum([0.75, 0.5, 0.16], st);
      for (let i = 0; i < 5; i++) {
        const x = W * (0.08 + i * 0.22) + Math.sin(t * 0.3 + i * 1.7) * W * 0.04 + mx * 6;
        ctx.globalAlpha = ra * (0.55 + 0.45 * Math.sin(t * 0.7 + i * 2.1));
        ctx.save(); ctx.translate(x, -H * 0.02 + oy * 0.55); ctx.rotate(0.22 + Math.sin(t * 0.2 + i) * 0.04);
        ctx.drawImage(sp.ray, -sp.ray._w / 2, 0, sp.ray._w * (0.7 + (i % 3) * 0.35), sp.ray._h);
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      band(ctx, S, sp.rocks, H * 0.5, 0.25, ox, oy, mx);
      for (let i = 0; i < 4; i++) {
        const f = S.fishes[i], cv = sp.fish[f.k], u = (((f.u + t * f.v) % 1.3) + 1.3) % 1.3 - 0.15;
        const x = u * W, y = f.y * H + Math.sin(t * 1.3 + f.ph) * H * 0.012 + oy * 0.7, w = cv._w * f.s, h = cv._h * f.s;
        ctx.globalAlpha = 0.5;
        if (f.v < 0) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(cv, -w / 2, -h / 2, w, h); ctx.restore(); }
        else ctx.drawImage(cv, x - w / 2, y - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
      band(ctx, S, sp.sand, H * 0.82, 0.6, ox, oy, mx, w0 + w1 * 0.5);
      if (w1 > 0.01) {
        const u = ((0.3 + t * 0.012) % 1.4) - 0.2, tw = sp.turtle;
        ctx.globalAlpha = w1;
        ctx.drawImage(tw, u * W, H * 0.34 + Math.sin(t * 0.6) * H * 0.02 + oy * 0.7, tw._w, tw._h);
        ctx.globalAlpha = 1;
      }
      band(ctx, S, sp.reef, H * 0.72, 0.75, ox, oy, mx);
      ctx.lineCap = 'round';
      // algues : rubans qui s'affinent et ondulent, avec de petites feuilles
      const kc = w2 > 0.5 ? ['#1d6a4a', '#2a8a5e'] : ['#2fae6e', '#5fd890'];
      for (const k of S.kelp) {
        const bx = k.u * W + mx * 0.4 * S.m, by = H + 4 + oy, hh = k.h * H, L2 = [], R2 = [];
        for (let j = 0; j <= 10; j++) {
          const q = j / 10, cx = bx + Math.sin(t * 1.1 + k.ph + q * 3) * hh * 0.09 * q, cy = by - hh * q, wd = k.w * 1.6 * (1 - q * 0.85);
          L2.push([cx - wd, cy]); R2.push([cx + wd, cy]);
          if (j > 1 && j < 10 && j % 2 === 0) { ctx.fillStyle = kc[1]; ctx.beginPath(); ctx.ellipse(cx + (j % 4 ? 1 : -1) * k.w * 1.8, cy, k.w * 1.6, k.w * 0.55, (j % 4 ? -0.6 : 0.6) + Math.sin(t * 1.5 + j) * 0.2, 0, TAU); ctx.fill(); }
        }
        ctx.fillStyle = kc[0]; ctx.beginPath();
        L2.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        for (let i = R2.length - 1; i >= 0; i--) ctx.lineTo(R2[i][0], R2[i][1]);
        ctx.closePath(); ctx.fill();
      }
      for (let i = 4; i < S.fishes.length; i++) {
        const f = S.fishes[i], cv = sp.fish[f.k], u = (((f.u + t * f.v) % 1.3) + 1.3) % 1.3 - 0.15;
        const x = u * W, y = f.y * H + Math.sin(t * 1.6 + f.ph) * H * 0.015 + oy * 0.9, w = cv._w * f.s, h = cv._h * f.s;
        const wob = 1 + Math.sin(t * 9 + f.ph) * 0.05;
        ctx.save(); ctx.translate(x, y); ctx.scale(f.v < 0 ? -wob : wob, 1);
        ctx.drawImage(cv, -w / 2, -h / 2, w, h); ctx.restore();
      }
      if (w2 > 0.01) {
        ctx.fillStyle = 'rgba(1,6,20,' + (0.45 * w2) + ')'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const cv = sp.jelly[i % 2], y = ((0.9 - t * 0.02 - i * 0.27) % 1.3 + 1.3) % 1.3 - 0.2, p = 1 + Math.sin(t * 2.2 + i * 1.7) * 0.08;
          ctx.globalAlpha = w2 * 0.9;
          ctx.drawImage(cv, W * (0.12 + i * 0.25) + Math.sin(t * 0.4 + i) * W * 0.03 - cv._w / 2, y * H + oy * 0.8, cv._w, cv._h * p);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#cfefff';
        for (const p of S.snow) { ctx.globalAlpha = w2 * (0.3 + 0.3 * Math.sin(t + p.ph)); ctx.fillRect(((p.u + Math.sin(t * 0.2 + p.ph) * 0.02) % 1) * W, ((p.y + t * p.v) % 1) * H, 1.6, 1.6); }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(220,250,255,0.55)'; ctx.lineWidth = 1.1;
      for (const b of S.bub) {
        const y = ((b.y - t * b.v) % 1 + 1) % 1, x = b.u * W + Math.sin(t * 2 + b.ph + y * 8) * U * 0.01;
        ctx.beginPath(); ctx.arc(x, y * H * 1.05 + oy * 0.85, b.r, 0, TAU); ctx.stroke();
      }
    }
  };

  // ---- 3. LE CIEL : nuages en profondeur, oiseaux, mer puis mer de nuages, montgolfière, crépuscule ----
  PAINT[2] = {
    *init(S) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      sp.sun = glowSp(S, U * 0.45, '#fff2c0', 0.85);
      const cw = U * 0.5, ch = cw * 0.46;
      yield;
      sp.day = [1, 2, 3, 4].map(sd => sprite(S, cw, ch, (x, w, h) => cloudPaint(x, w, h, sd + 10, '#ffffff', '#93b0dc', 'rgba(255,255,255,0.75)')));
      yield;
      sp.dusk = [1, 2, 3, 4].map(sd => sprite(S, cw, ch, (x, w, h) => cloudPaint(x, w, h, sd + 10, '#ffd2b0', '#8a5aa8', 'rgba(255,236,200,0.55)')));
      const floor = (lit, shadow, rim) => (x, w, h) => {
        const n = Math.round(w / (h * 0.55));
        for (let i = 0; i < n; i++) {
          const cx = (i + hash(i * 3.3)) / n * w, r = h * (0.26 + hash(i * 7.1) * 0.2), cy = h * 0.45 + hash(i * 1.9) * h * 0.18;
          x.fillStyle = shadow; x.beginPath(); x.arc(cx, cy + r * 0.25, r, 0, TAU); x.fill();
        }
        x.fillRect(0, h * 0.62, w, h * 0.38);
        for (let i = 0; i < n; i++) {
          const cx = (i + hash(i * 3.3)) / n * w, r = h * (0.26 + hash(i * 7.1) * 0.2), cy = h * 0.45 + hash(i * 1.9) * h * 0.18;
          const g = x.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, lit); g.addColorStop(1, mixHex(lit, shadow, 0.55));
          x.fillStyle = g; x.beginPath(); x.arc(cx - r * 0.08, cy, r * 0.86, 0, TAU); x.fill();
          x.fillStyle = rim; x.beginPath(); x.arc(cx - r * 0.2, cy - r * 0.2, r * 0.5, 0, TAU); x.fill();
        }
      };
      yield;
      sp.floorDay = strip(S, H * 0.3, floor('#ffffff', '#9ab4de', 'rgba(255,255,255,0.55)'));
      yield;
      sp.floorDusk = strip(S, H * 0.3, floor('#ffcfa8', '#7a4f9a', 'rgba(255,230,200,0.4)'));
      yield;
      sp.sea = strip(S, H * 0.24, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5aa6e0'); g.addColorStop(0.15, '#2f7cc6'); g.addColorStop(1, '#0d3f86');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < w / 5; i++) { const y = Math.pow(hash(i * 1.3), 1.6) * h; x.globalAlpha = 0.25 + hash(i * 7.7) * 0.5; x.fillRect(hash(i * 3.7) * w, y, 3 + (y / h) * 12 * hash(i), 1 + y / h); }
        x.globalAlpha = 1;
        const hz = x.createLinearGradient(0, 0, 0, h * 0.12); hz.addColorStop(0, 'rgba(230,245,255,0.9)'); hz.addColorStop(1, 'rgba(230,245,255,0)');
        x.fillStyle = hz; x.fillRect(0, 0, w, h * 0.12);
      });
      yield;
      sp.balloon = sprite(S, U * 0.13, U * 0.2, (x, w, h) => {
        const cx = w / 2, R = w * 0.45;
        x.strokeStyle = '#6b4a2a'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(cx - R * 0.5, h * 0.62); x.lineTo(cx - w * 0.1, h * 0.86); x.moveTo(cx + R * 0.5, h * 0.62); x.lineTo(cx + w * 0.1, h * 0.86); x.stroke();
        x.fillStyle = '#9a6a3a'; x.fillRect(cx - w * 0.11, h * 0.85, w * 0.22, h * 0.12);
        const cols = ['#ff5a5a', '#ffd23a', '#3fd2ff', '#ffffff'];
        for (let i = 0; i < 6; i++) {
          x.fillStyle = cols[i % 4];
          x.beginPath(); x.moveTo(cx, h * 0.02);
          x.bezierCurveTo(cx + (i - 3) * R * 0.45, h * 0.0, cx + (i - 3) * R * 0.5, h * 0.5, cx + (i - 3) * R * 0.18, h * 0.66);
          x.lineTo(cx + (i - 2) * R * 0.18, h * 0.66);
          x.bezierCurveTo(cx + (i - 2) * R * 0.5, h * 0.5, cx + (i - 2) * R * 0.45, h * 0.0, cx, h * 0.02);
          x.fill();
        }
        const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,40,0.3)');
        x.fillStyle = g; x.beginPath(); x.ellipse(cx, h * 0.33, R, h * 0.33, 0, 0, TAU); x.fill();
      });
      yield;
      sp.moon = sprite(S, U * 0.12, U * 0.12, (x, w) => {
        const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,250,230,0.5)'); g.addColorStop(1, 'rgba(255,250,230,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, w);
        x.fillStyle = '#fff6dc'; x.beginPath(); x.arc(w / 2, w / 2, w * 0.24, 0, TAU); x.fill();
        x.fillStyle = 'rgba(200,190,170,0.5)'; x.beginPath(); x.arc(w * 0.44, w * 0.46, w * 0.05, 0, TAU); x.arc(w * 0.56, w * 0.58, w * 0.035, 0, TAU); x.fill();
      });
      yield;
      sp.stars = sprite(S, W, H * 0.6, (x, w, h) => starsPaint(x, w, h, Math.round(w * h / 2600), 7, 0.5, 1.6, ['#ffffff', '#ffe6c8', '#d8e4ff']));
      S.cl = [];
      for (let i = 0; i < 14; i++) {
        const d = i < 6 ? 0.12 : i < 11 ? 0.45 : 0.95;
        S.cl.push({ i: i % 4, d, u: hash(i * 5.7 + 2), y: d < 0.2 ? 0.04 + hash(i * 2.3) * 0.34 : d < 0.5 ? 0.1 + hash(i * 3.1) * 0.55 : 0.35 + hash(i * 9.4) * 0.5, s: d < 0.2 ? 0.28 + hash(i) * 0.2 : d < 0.5 ? 0.5 + hash(i * 1.4) * 0.3 : 0.95 + hash(i * 2.6) * 0.4, v: d * (0.012 + hash(i * 4.2) * 0.01) });
      }
      S.flock = [];
      for (let i = 0; i < 2; i++) S.flock.push({ u: hash(i * 6.6), y: 0.18 + i * 0.22, v: 0.025 + i * 0.01, n: 4 + i, ph: i * 2 });
    },
    draw(S, ctx, t, st, ox, oy, mx) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      const w0 = stW(st, 0), w1 = stW(st, 1), w2 = clamp(st - 1, 0, 1);
      skyFill(ctx, W, H, [stCol(['#2f8ef2', '#2c6fd8', '#202462'], st), stCol(['#6cbcff', '#7cc0ff', '#b4508a'], st), stCol(['#d8f0ff', '#fff0d0', '#ffae6a'], st)], oy);
      if (w2 > 0.01) { ctx.globalAlpha = w2; ctx.drawImage(sp.stars, 0, oy * 0.55, sp.stars._w, sp.stars._h); ctx.globalAlpha = 1; }
      const sx = stNum([0.76, 0.24, 0.14], st) * W, sy = stNum([0.18, 0.3, 0.6], st) * H + oy * 0.55;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sp.sun, sx - sp.sun._w / 2, sy - sp.sun._h / 2, sp.sun._w, sp.sun._h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = stCol(['#fffdf0', '#fff4c8', '#ff9a4a'], st);
      ctx.beginPath(); ctx.arc(sx, sy, U * stNum([0.05, 0.055, 0.085], st), 0, TAU); ctx.fill();
      if (w2 > 0.01) { ctx.globalAlpha = w2; ctx.drawImage(sp.moon, W * 0.16 - sp.moon._w / 2, H * 0.14 + oy * 0.55, sp.moon._w, sp.moon._h); ctx.globalAlpha = 1; }
      const drawCl = (c) => {
        const u = ((c.u + t * c.v) % 1.5) - 0.3, x = u * W + mx * 0.5 * c.d * S.m, y = c.y * H + oy * (0.55 + 0.45 * c.d);
        const a = c.d > 0.9 ? 0.62 : c.d > 0.4 ? 0.92 : 0.85;
        if (w2 < 0.99) { const cv = sp.day[c.i]; ctx.globalAlpha = a * (1 - w2); ctx.drawImage(cv, x, y, cv._w * c.s, cv._h * c.s); }
        if (w2 > 0.01) { const cv = sp.dusk[c.i]; ctx.globalAlpha = a * w2; ctx.drawImage(cv, x, y, cv._w * c.s, cv._h * c.s); }
        ctx.globalAlpha = 1;
      };
      for (let i = 0; i < 6; i++) drawCl(S.cl[i]);
      band(ctx, S, sp.sea, H * 0.78, 0.5, ox, oy, mx, w0);
      band(ctx, S, sp.floorDay, H * 0.72, 0.6, ox, oy, mx, w1 * (1 - w2) + (st > 1 ? 0 : 0));
      band(ctx, S, sp.floorDusk, H * 0.72, 0.6, ox, oy, mx, w2);
      for (let i = 6; i < 11; i++) drawCl(S.cl[i]);
      if (w1 > 0.01) {
        const b = sp.balloon, u = ((0.62 + t * 0.006) % 1.3) - 0.15;
        ctx.globalAlpha = w1; ctx.drawImage(b, u * W, H * (0.3 + Math.sin(t * 0.5) * 0.02) + oy * 0.75, b._w, b._h); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = w2 > 0.5 ? 'rgba(40,20,50,0.75)' : 'rgba(50,60,80,0.7)'; ctx.lineWidth = Math.max(1.2, U * 0.004); ctx.lineCap = 'round';
      for (const f of S.flock) {
        const u = ((f.u + t * f.v) % 1.4) - 0.2;
        for (let k = 0; k < f.n; k++) {
          const off = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
          birdPath(ctx, u * W - Math.abs(off) * U * 0.035, f.y * H + off * U * 0.025 + Math.sin(t * 1.3 + f.ph) * 6 + oy * 0.8, U * 0.016, Math.sin(t * 8 + k * 0.8 + f.ph));
        }
      }
      for (let i = 11; i < S.cl.length; i++) drawCl(S.cl[i]);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const u = ((hash(i * 3.9) + t * (0.15 + hash(i) * 0.1)) % 1.4) - 0.2, y = H * (0.15 + hash(i * 7.1) * 0.7) + oy * 0.9;
        ctx.beginPath(); ctx.moveTo(u * W, y); ctx.lineTo(u * W + U * 0.12, y); ctx.stroke();
      }
    }
  };

  // ---- 4. L'ESPACE : étoiles en profondeur, Terre vue d'orbite, planètes, nébuleuse, astronaute ----
  PAINT[3] = {
    *init(S) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      sp.far = sprite(S, W + 2 * S.m, H, (x, w, h) => starsPaint(x, w, h, Math.round(w * h / 1500), 3, 0.4, 1.1, ['#ffffff', '#cfe0ff', '#ffe6d0']));
      yield;
      sp.near = sprite(S, W + 2 * S.m, H, (x, w, h) => starsPaint(x, w, h, Math.round(w * h / 9000), 5, 0.8, 2.1, ['#ffffff', '#bfe0ff', '#fff0c8']));
      yield;
      sp.flare = sprite(S, U * 0.08, U * 0.08, (x, w) => {
        const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.2, 'rgba(200,220,255,0.35)'); g.addColorStop(1, 'rgba(200,220,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, w); star4(x, w / 2, w / 2, w * 0.48, 'rgba(255,255,255,0.9)');
      });
      yield;
      sp.earth = strip(S, H * 0.36, (x, w, h) => {
        const R = Math.max(w, h * 3) * 0.9, cx = w * 0.5, cy = h * 0.3 + R;
        const at = x.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.08);
        at.addColorStop(0, 'rgba(120,200,255,0.9)'); at.addColorStop(0.4, 'rgba(80,170,255,0.35)'); at.addColorStop(1, 'rgba(80,170,255,0)');
        x.fillStyle = at; x.beginPath(); x.arc(cx, cy, R * 1.08, 0, TAU); x.fill();
        x.save(); x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.clip();
        const g = x.createLinearGradient(0, h * 0.3, 0, h); g.addColorStop(0, '#2a7ad8'); g.addColorStop(1, '#0a2a6a');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) {
          const lx = hash(i * 5.1) * w, ly = h * (0.38 + hash(i * 2.2) * 0.5), lr = w * (0.05 + hash(i * 3.3) * 0.08);
          x.fillStyle = i % 3 ? '#4f9a4a' : '#b89a5a'; x.beginPath();
          for (let a = 0; a <= TAU + 0.01; a += 0.4) { const rr2 = lr * (0.7 + 0.3 * Math.sin(a * 3 + i)); x.lineTo(lx + Math.cos(a) * rr2, ly + Math.sin(a) * rr2 * 0.45); }
          x.fill();
        }
        x.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(hash(i * 1.7) * w, h * (0.34 + hash(i * 4.1) * 0.6), w * (0.02 + hash(i * 2.9) * 0.05), h * 0.012, 0.05, 0, TAU); x.fill(); }
        const rim = x.createLinearGradient(0, h * 0.28, 0, h * 0.42); rim.addColorStop(0, 'rgba(200,240,255,0.65)'); rim.addColorStop(1, 'rgba(200,240,255,0)');
        x.fillStyle = rim; x.fillRect(0, 0, w, h);
        x.restore();
      });
      yield;
      sp.moon = sprite(S, U * 0.16, U * 0.16, (x, w) => {
        planetPaint(x, w / 2, w / 2, w * 0.42, '#f4f2ee', '#b8b4ae', '#4a4846', 0, 3);
        x.fillStyle = 'rgba(80,76,72,0.4)';
        for (const [a, b, r] of [[0.4, 0.4, 0.08], [0.6, 0.55, 0.06], [0.45, 0.65, 0.05], [0.62, 0.32, 0.04]]) { x.beginPath(); x.arc(w * a, w * b, w * r, 0, TAU); x.fill(); }
      });
      yield;
      sp.ringed = sprite(S, U * 0.62, U * 0.4, (x, w, h) => {
        const cx = w / 2, cy = h / 2, r = h * 0.3;
        const ring = (front) => {
          x.save(); x.translate(cx, cy); x.rotate(-0.32);
          x.beginPath(); if (front) x.rect(-w, 0, w * 2, h); else x.rect(-w, -h, w * 2, h); x.clip();
          for (let k = 0; k < 3; k++) { x.strokeStyle = ['rgba(240,210,160,0.75)', 'rgba(200,160,110,0.6)', 'rgba(255,230,190,0.5)'][k]; x.lineWidth = r * (0.12 - k * 0.025); x.beginPath(); x.ellipse(0, 0, r * (1.55 + k * 0.22), r * (0.38 + k * 0.05), 0, 0, TAU); x.stroke(); }
          x.restore();
        };
        ring(false);
        planetPaint(x, cx, cy, r, '#ffe0a8', '#e0a058', '#5a2a10', 7, 13);
        ring(true);
      });
      yield;
      sp.red = sprite(S, U * 0.16, U * 0.16, (x, w) => planetPaint(x, w / 2, w / 2, w * 0.4, '#ffb08a', '#d0503a', '#3a0a08', 4, 21));
      yield;
      sp.neb = sprite(S, W * 0.6, H * 0.6, (x, w, h) => {
        const cols = ['#ff4fd8', '#3fe0ff', '#7a5cff', '#ff7a8a', '#5a8cff'];
        for (let i = 0; i < 26; i++) {
          const px = w * (0.15 + hash(i * 3.3) * 0.7), py = h * (0.2 + hash(i * 5.7) * 0.6), r = Math.min(w, h) * (0.12 + hash(i * 1.9) * 0.22);
          const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, rgba(cols[i % 5], 0.22)); g.addColorStop(1, rgba(cols[i % 5], 0));
          x.fillStyle = g; x.fillRect(0, 0, w, h);
        }
      }, 0.5);
      yield;
      sp.gal = sprite(S, U * 0.26, U * 0.26, (x, w) => {
        const cx = w / 2;
        const g = x.createRadialGradient(cx, cx, 0, cx, cx, w * 0.5); g.addColorStop(0, 'rgba(255,240,220,0.9)'); g.addColorStop(0.15, 'rgba(255,180,230,0.35)'); g.addColorStop(1, 'rgba(160,120,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, w);
        for (let i = 0; i < 500; i++) { const arm = i % 2, k = hash(i * 1.31), a = arm * Math.PI + k * 5.5, r = k * w * 0.46; x.fillStyle = rgba(['#ffd9f2', '#bfe0ff'][arm], 0.6 * (1 - k)); x.fillRect(cx + Math.cos(a) * r + (hash(i * 7.7) - 0.5) * w * 0.05, cx + Math.sin(a) * r * 0.55 + (hash(i * 3.9) - 0.5) * w * 0.04, 1.2, 1.2); }
      });
      yield;
      sp.astro = sprite(S, U * 0.09, U * 0.11, (x, w, h) => {
        x.fillStyle = '#e8ecf4'; x.strokeStyle = '#8a94a8'; x.lineWidth = 1;
        rr(x, w * 0.28, h * 0.42, w * 0.44, h * 0.36, w * 0.12); x.fill(); x.stroke();
        rr(x, w * 0.08, h * 0.44, w * 0.2, h * 0.12, w * 0.06); x.fill(); rr(x, w * 0.72, h * 0.38, w * 0.2, h * 0.12, w * 0.06); x.fill();
        rr(x, w * 0.3, h * 0.76, w * 0.16, h * 0.2, w * 0.06); x.fill(); rr(x, w * 0.54, h * 0.76, w * 0.16, h * 0.2, w * 0.06); x.fill();
        x.beginPath(); x.arc(w * 0.5, h * 0.28, w * 0.26, 0, TAU); x.fill(); x.stroke();
        const v = x.createLinearGradient(0, h * 0.18, 0, h * 0.38); v.addColorStop(0, '#5ab8ff'); v.addColorStop(1, '#14306a');
        x.fillStyle = v; rr(x, w * 0.32, h * 0.2, w * 0.36, h * 0.15, h * 0.07); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(w * 0.37, h * 0.22, w * 0.08, h * 0.03);
        x.fillStyle = '#ff6a6a'; x.fillRect(w * 0.42, h * 0.5, w * 0.16, h * 0.08);
      });
      S.tw = [];
      for (let i = 0; i < 12; i++) S.tw.push({ u: hash(i * 4.7 + 3), y: hash(i * 8.1 + 1), ph: hash(i) * TAU, s: 0.25 + hash(i * 2.2) * 0.45 });
    },
    draw(S, ctx, t, st, ox, oy, mx) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      const w0 = stW(st, 0), w1 = stW(st, 1), w2 = clamp(st - 1, 0, 1);
      skyFill(ctx, W, H, [stCol(['#01020a', '#03020c', '#06020f'], st), stCol(['#040a20', '#0a0820', '#170830'], st), stCol(['#0a2050', '#140a2a', '#220a3a'], st)], oy);
      const dr = (t * 3) % S.m;
      ctx.drawImage(sp.far, -S.m + mx * 0.1 * S.m - dr * 0.3, oy * 0.6, sp.far._w, sp.far._h);
      if (w2 > 0.01) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = w2;
        const nw = W * 1.25, nh = H * 1.1;
        ctx.drawImage(sp.neb, W * 0.5 - nw / 2 + Math.sin(t * 0.05) * 20, H * 0.42 - nh / 2 + oy * 0.6, nw, nh);
        ctx.globalAlpha = w2 * 0.8; ctx.drawImage(sp.gal, W * 0.2 - sp.gal._w / 2, H * 0.22 + oy * 0.6, sp.gal._w, sp.gal._h);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(sp.near, -S.m + mx * 0.3 * S.m - dr, oy * 0.7, sp.near._w, sp.near._h);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of S.tw) {
        const k = 0.5 + 0.5 * Math.sin(t * 2.3 + s.ph), z = sp.flare._w * s.s * (0.6 + 0.6 * k);
        ctx.globalAlpha = 0.4 + 0.6 * k; ctx.drawImage(sp.flare, s.u * W - z / 2, s.y * H - z / 2 + oy * 0.65, z, z);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (w1 > 0.01) {
        ctx.globalAlpha = w1;
        const r = sp.ringed, rx = W * (W > H * 1.3 ? 0.87 : 0.74) - r._w / 2 + mx * 0.5 * 0.5 * S.m, ry = H * 0.24 - r._h / 2 + Math.sin(t * 0.2) * 4 + oy * 0.75;
        ctx.drawImage(r, rx, ry, r._w, r._h);
        ctx.drawImage(sp.red, W * 0.12 - sp.red._w / 2 + mx * 0.3 * S.m, H * 0.6 + oy * 0.7, sp.red._w, sp.red._h);
        ctx.globalAlpha = 1;
      }
      if (w0 > 0.01) {
        ctx.globalAlpha = w0;
        ctx.drawImage(sp.moon, W * 0.8 - sp.moon._w / 2 + mx * 0.4 * S.m, H * 0.16 + oy * 0.7, sp.moon._w, sp.moon._h);
        ctx.globalAlpha = 1;
        band(ctx, S, sp.earth, H * 0.66, 0.55, ox, oy, mx, w0);
      }
      if (st < 1.6) {
        const a = sp.astro, u = ((0.15 + t * 0.008) % 1.3) - 0.15;
        ctx.save(); ctx.globalAlpha = clamp(1.6 - st, 0, 1);
        ctx.translate(u * W, H * (0.44 + Math.sin(t * 0.4) * 0.05) + oy * 0.8); ctx.rotate(t * 0.25);
        ctx.drawImage(a, -a._w / 2, -a._h / 2, a._w, a._h); ctx.restore();
      }
      const sh = (t % 5.5) / 5.5;
      if (sh < 0.16) {
        const k = sh / 0.16, x0 = W * (0.2 + hash(Math.floor(t / 5.5)) * 0.6), y0 = H * 0.1;
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0 + k * U * 0.5, y0 + k * U * 0.3); ctx.lineTo(x0 + k * U * 0.5 - U * 0.12, y0 + k * U * 0.3 - U * 0.07); ctx.stroke();
      }
    }
  };

  // ---- 5. AU-DELÀ : spirale galactique qui tourne (on s'en approche à chaque niveau), rubans arc-en-ciel, cœur ----
  PAINT[4] = {
    *init(S) {
      const W = S.W, H = S.H, U = Math.min(W, H), M = Math.max(W, H), sp = S.sp;
      sp.far = sprite(S, W + 2 * S.m, H, (x, w, h) => starsPaint(x, w, h, Math.round(w * h / 1800), 9, 0.4, 1.3, ['#ffffff', '#ffd9f2', '#d8f0ff', '#fff2b0']));
      // galaxie spirale : bras de nuées colorées (or au centre, rose, violet, bleu au bord), poussière sombre, étoiles
      yield;
      const G = M * 1.2, gq = Math.min(S.q, 820 / G), gal = mkCv(G * gq, G * gq), x = gal.getContext('2d');
      x.setTransform(gq, 0, 0, gq, 0, 0);
      const blob = (col) => { const b = mkCv(64, 64), bx = b.getContext('2d'), g = bx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, rgba(col, 1)); g.addColorStop(0.4, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0)); bx.fillStyle = g; bx.fillRect(0, 0, 64, 64); return b; };
      const BL = IRIS.concat(['#ffe2a8', '#ffffff']).map(blob);
      const cx = G / 2, b2 = Math.log(12) / (3.3 * Math.PI);
      x.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 2; arm++) for (let th = 1.1; th < 3.3 * Math.PI; th += 0.045) {
        if (Math.floor(th / 2.6) !== Math.floor((th - 0.045) / 2.6)) { x.globalAlpha = 1; yield; x.globalCompositeOperation = 'lighter'; }
        const r = G * 0.04 * Math.exp(b2 * th), a = th + arm * Math.PI, k = r / (G * 0.5);
        for (let j = 0; j < 2; j++) {
          const jr = (hash(th * 13.1 + arm * 7 + j) - 0.5) * G * 0.05 * (0.4 + k), ja = (hash(th * 5.7 + j * 3 + arm) - 0.5) * 0.25;
          const px = cx + Math.cos(a + ja) * (r + jr), py = cx + Math.sin(a + ja) * (r + jr), z = G * (0.028 + k * 0.05) * (0.7 + hash(th * 3.3 + j) * 0.6);
          x.globalAlpha = (0.13 + 0.1 * k) * (j ? 0.7 : 1);
          // bras arc-en-ciel : or au centre, puis les couleurs défilent le long du bras
          x.drawImage(k < 0.16 ? BL[6] : BL[Math.floor(th / (3.3 * Math.PI) * 6 + arm * 3) % 6], px - z / 2, py - z / 2, z, z);
        }
      }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      yield;
      x.strokeStyle = 'rgba(16,2,26,0.35)'; x.lineWidth = G * 0.008; x.lineCap = 'round';
      for (let arm = 0; arm < 2; arm++) { x.beginPath(); for (let th = 0.6; th < 3.1 * Math.PI; th += 0.05) { const r = G * 0.04 * Math.exp(b2 * th) * 0.94, a = th + arm * Math.PI - 0.12; if (th === 0.6) x.moveTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r); else x.lineTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r); } x.stroke(); }
      x.globalCompositeOperation = 'lighter';
      const core = x.createRadialGradient(cx, cx, 0, cx, cx, G * 0.13);
      core.addColorStop(0, 'rgba(255,252,236,0.8)'); core.addColorStop(0.12, 'rgba(255,226,170,0.5)'); core.addColorStop(0.45, 'rgba(255,120,200,0.14)'); core.addColorStop(1, 'rgba(160,90,255,0)');
      x.fillStyle = core; x.beginPath(); x.arc(cx, cx, G * 0.13, 0, TAU); x.fill();
      yield;
      const SC = ['#ffffff', '#ffe0f4', '#d8ecff', '#fff0c0'];
      for (let i = 0; i < 2600; i++) {
        if (i === 1300) { yield; x.globalCompositeOperation = 'lighter'; }
        const arm = i % 2, th = hash(i * 1.71) * 3.3 * Math.PI, r = G * 0.04 * Math.exp(b2 * th), sp2 = G * 0.06 * (0.3 + r / G);
        const px = cx + Math.cos(th + arm * Math.PI) * r + (hash(i * 3.9) - 0.5) * sp2, py = cx + Math.sin(th + arm * Math.PI) * r + (hash(i * 6.3) - 0.5) * sp2;
        x.globalAlpha = 0.35 + hash(i * 2.2) * 0.65; x.fillStyle = SC[i % 4];
        const z = 0.7 + hash(i * 8.8) * 1.5; x.fillRect(px, py, z, z);
      }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      gal._w = G; gal._h = G; sp.gal = gal;
      yield;
      sp.core = glowSp(S, U * 0.55, '#fff4d0', 0.95);
      yield;
      sp.rays = sprite(S, M * 1.2, M * 1.2, (x, w) => {
        x.translate(w / 2, w / 2);
        for (let i = 0; i < 18; i++) {
          x.rotate(TAU / 18);
          const g = x.createLinearGradient(0, 0, w * 0.5, 0); g.addColorStop(0, 'rgba(255,240,200,0.32)'); g.addColorStop(1, 'rgba(255,200,240,0)');
          x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(w * 0.5, -w * 0.04); x.lineTo(w * 0.5, w * 0.04); x.closePath(); x.fill();
        }
      }, Math.min(1, 600 / (M * 1.2 * S.q)));
      yield;
      sp.spark = sprite(S, U * 0.06, U * 0.06, (x, w) => {
        const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,200,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, w, w); star4(x, w / 2, w / 2, w * 0.5, '#ffffff');
      });
      S.sp2 = [];
      for (let i = 0; i < 22; i++) S.sp2.push({ u: hash(i * 3.1 + 7), y: hash(i * 6.7 + 2), ph: hash(i * 1.9) * TAU, s: 0.22 + hash(i * 5.5) * 0.5 });
    },
    draw(S, ctx, t, st, ox, oy, mx) {
      const W = S.W, H = S.H, U = Math.min(W, H), sp = S.sp;
      const w1 = stW(st, 1), w2 = clamp(st - 1, 0, 1);
      skyFill(ctx, W, H, [stCol(['#06021a', '#0c0424', '#160830'], st), stCol(['#12062e', '#1e0840', '#3a1050'], st), stCol(['#1c0838', '#2a0a4a', '#4a1a5a'], st)], oy);
      ctx.drawImage(sp.far, -S.m + mx * 0.15 * S.m, oy * 0.6, sp.far._w, sp.far._h);
      const gs = stNum([0.72, 1.0, 1.55], st), gx = W * 0.5 + mx * 0.2 * S.m, gy = H * 0.42 + oy * 0.6, g = sp.gal;
      ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.035); ctx.scale(gs, gs * 0.82);
      ctx.drawImage(g, -g._w / 2, -g._h / 2, g._w, g._h); ctx.restore();
      if (w2 < 0.99) {      // le cœur brille déjà au loin
        const cr = sp.core._w * (0.28 + 0.18 * st) * (1 + Math.sin(t * 1.5) * 0.04);
        ctx.globalAlpha = 0.45 * (1 - w2); ctx.drawImage(sp.core, gx - cr / 2, gy - cr / 2, cr, cr); ctx.globalAlpha = 1;
      }
      if (st > 0.4) {
        const ra = clamp(st - 0.4, 0, 1) * (st > 1.8 ? 0.7 : 1);
        for (let i = 0; i < 3; i++) {
          const y0 = H * (0.25 + i * 0.22) + oy * 0.7, amp = H * 0.06, th = H * 0.05;
          const rg = ctx.createLinearGradient(0, 0, W, 0);
          for (let k = 0; k < 6; k++) rg.addColorStop(k / 5, rgba(IRIS[(k + i * 2) % 6], 0.2 * ra));
          ctx.fillStyle = rg; ctx.beginPath();
          for (let k = 0; k <= 24; k++) { const x = k / 24 * W, y = y0 + Math.sin(k * 0.45 + t * 0.6 + i * 2) * amp; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          for (let k = 24; k >= 0; k--) { const x = k / 24 * W, y = y0 + Math.sin(k * 0.45 + t * 0.6 + i * 2 + 0.6) * amp + th * (0.6 + 0.4 * Math.sin(k * 0.3 + t)); ctx.lineTo(x, y); }
          ctx.closePath(); ctx.fill();
        }
      }
      if (w2 > 0.01) {
        ctx.globalAlpha = w2 * 0.8;
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(-t * 0.05);
        ctx.drawImage(sp.rays, -sp.rays._w / 2, -sp.rays._h / 2, sp.rays._w, sp.rays._h); ctx.restore();
        ctx.globalAlpha = w2 * 0.55;
        const cr = sp.core._w * 0.85 * (1 + Math.sin(t * 1.5) * 0.04);
        ctx.drawImage(sp.core, gx - cr / 2, gy - cr / 2, cr, cr);
      }
      for (const s of S.sp2) {
        const k = 0.5 + 0.5 * Math.sin(t * 2.6 + s.ph), z = sp.spark._w * s.s * (0.5 + k);
        ctx.globalAlpha = 0.3 + 0.7 * k;
        ctx.drawImage(sp.spark, s.u * W - z / 2, s.y * H - z / 2 + oy * 0.7, z, z);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  };
  // un décor se construit d'un coup, ou par petites étapes (lazy) pendant les images calmes avant le voyage
  function makeScene(w, W, H, q, lazy) {
    const S = { w, W: Math.max(50, W), H: Math.max(50, H), q: q || 1, m: Math.round(Math.max(50, W) * 0.05) + 8, sp: {} };
    try { S.gen = PAINT[w].init(S); } catch (e) { S.bad = true; }
    if (!lazy) buildScene(S);
    return S;
  }
  function buildScene(S, budget) {      // budget en ms (absent : tout de suite) ; vrai quand le décor est prêt
    if (!S.gen || S.bad) return true;
    const t0 = performance.now();
    try {
      for (;;) {
        if (S.gen.next().done) { S.gen = null; return true; }
        if (budget !== undefined && performance.now() - t0 >= budget) return false;
      }
    } catch (e) { S.bad = true; S.gen = null; return true; }
  }
  function drawScene(S, ctx, t, st, ox, oy, mx) {
    if (!S) return;
    if (S.gen) buildScene(S);
    if (S.bad) { ctx.fillStyle = EMPILO_WORLDS[S.w].colors.dark; ctx.fillRect(0, 0, S.W, S.H); return; }
    PAINT[S.w].draw(S, ctx, t, st, ox || 0, oy || 0, mx || 0);
  }

  // ---------- Médaillon d'un monde (carte du voyage, HUD) : petite scène ronde dessinée en code ----------
  function worldIconImg(w, px) {
    px = Math.max(8, Math.round(px));
    return cacheGet('wico' + w + '.' + px, px, (x, s) => {
      const c = s / 2, R = s * 0.46;
      x.save(); x.beginPath(); x.arc(c, c, R, 0, TAU); x.clip();
      const sky = (a, b) => { const g = x.createLinearGradient(0, c - R, 0, c + R); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, s, s); };
      if (w === 0) {
        sky('#4fb3ff', '#d8f2ff');
        x.fillStyle = '#fff2b0'; x.beginPath(); x.arc(c + R * 0.42, c - R * 0.4, R * 0.22, 0, TAU); x.fill();
        x.fillStyle = '#7cc95e'; x.beginPath(); x.ellipse(c - R * 0.3, c + R * 0.75, R * 1.1, R * 0.62, 0, 0, TAU); x.fill();
        x.fillStyle = '#4fa848'; x.beginPath(); x.ellipse(c + R * 0.6, c + R * 0.9, R * 1, R * 0.55, 0, 0, TAU); x.fill();
        flower5(x, c - R * 0.2, c + R * 0.32, R * 0.24, '#ffffff', '#ffd23a');
        flower5(x, c + R * 0.4, c + R * 0.5, R * 0.16, '#ff8fc4', '#fff1a0');
      } else if (w === 1) {
        sky('#3fdcff', '#05306a');
        x.fillStyle = 'rgba(255,255,255,0.25)';
        for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(c - R + i * R * 0.7, c - R); x.lineTo(c - R + i * R * 0.7 + R * 0.25, c - R); x.lineTo(c - R * 0.6 + i * R * 0.7, c + R); x.lineTo(c - R * 0.85 + i * R * 0.7, c + R); x.fill(); }
        const fw = R * 1.15, fh = fw * 0.6; x.save(); x.translate(c - fw * 0.5, c - fh * 0.45); fishPaint(x, fw, fh, 0); x.restore();
        x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = Math.max(1, s * 0.03);
        for (const [a, b, r] of [[0.55, -0.45, 0.1], [0.68, -0.15, 0.07], [0.5, 0.1, 0.05]]) { x.beginPath(); x.arc(c + R * a, c + R * b, R * r, 0, TAU); x.stroke(); }
        x.fillStyle = '#ff7aa8'; x.beginPath(); x.ellipse(c - R * 0.55, c + R * 0.95, R * 0.4, R * 0.35, 0, 0, TAU); x.fill();
      } else if (w === 2) {
        sky('#3a8ef0', '#ffe0b0');
        x.fillStyle = '#fff4c8'; x.beginPath(); x.arc(c - R * 0.42, c - R * 0.35, R * 0.26, 0, TAU); x.fill();
        const cw = R * 1.7, ch = cw * 0.5; x.save(); x.translate(c - cw * 0.45, c - ch * 0.15); cloudPaint(x, cw, ch, 3, '#ffffff', '#c3d6ee', 'rgba(255,255,255,0.6)'); x.restore();
        x.strokeStyle = '#2a3a5a'; x.lineWidth = Math.max(1, s * 0.03); x.lineCap = 'round'; birdPath(x, c + R * 0.45, c - R * 0.45, R * 0.16, 0.8);
      } else if (w === 3) {
        sky('#05061a', '#1a1050');
        x.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) x.fillRect(c - R + hash(i * 3.3) * R * 2, c - R + hash(i * 7.1) * R * 2, 1 + (i % 3 === 0), 1 + (i % 3 === 0));
        x.save(); x.translate(c, c); x.rotate(-0.35);
        x.strokeStyle = 'rgba(240,210,160,0.85)'; x.lineWidth = R * 0.09;
        x.beginPath(); x.ellipse(0, 0, R * 0.78, R * 0.2, 0, Math.PI, TAU); x.stroke();
        x.restore();
        planetPaint(x, c, c, R * 0.44, '#ffe0a8', '#e0a058', '#5a2a10', 5, 13);
        x.save(); x.translate(c, c); x.rotate(-0.35); x.strokeStyle = 'rgba(240,210,160,0.9)'; x.lineWidth = R * 0.09;
        x.beginPath(); x.ellipse(0, 0, R * 0.78, R * 0.2, 0, 0, Math.PI); x.stroke(); x.restore();
      } else {
        sky('#12052a', '#3a0a4a');
        const g = x.createRadialGradient(c, c, 0, c, c, R); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.18, 'rgba(255,200,120,0.8)'); g.addColorStop(1, 'rgba(255,110,199,0)');
        x.fillStyle = g; x.fillRect(0, 0, s, s);
        x.lineCap = 'round';
        for (let arm = 0; arm < 3; arm++) for (let k = 0; k < 14; k++) {
          const q = k / 14, a = arm * TAU / 3 + q * 4.2, r = R * (0.12 + q * 0.85);
          x.fillStyle = IRIS[(k + arm * 2) % 6]; x.beginPath(); x.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, Math.max(0.8, s * 0.035 * (1 - q * 0.5)), 0, TAU); x.fill();
        }
      }
      x.restore();
      x.lineWidth = Math.max(1.5, s * 0.055); x.strokeStyle = '#ffffff';
      x.beginPath(); x.arc(c, c, R, 0, TAU); x.stroke();
    });
  }

  // ---------- Preview (attract mode) ----------
  const PV_BASE = [
    '..........', '..........', '..........', '..........', '..........', '..........', '..........',
    'Z......S.L',
    'JTTT..SSZL',
    'JJIT..SZZL'
  ];
  const PV_AFTER = ['..........', '..........'].concat(PV_BASE.slice(0, 8));
  const pvShards = [];
  for (let i = 0; i < 46; i++) pvShards.push([hash(i * 3 + 1) - 0.5, hash(i * 7 + 2), hash(i * 5.3), hash(i * 1.7)]);
  // la vignette fait le VOYAGE : un monde après l'autre (décor, matière des blocs, casse propre au monde),
  // et le passage au monde suivant comme la caméra (plongeon, remontée, décollage…)
  const PV = new Map();      // décors de la vignette, par taille (plusieurs vignettes peuvent coexister)
  const PV_ST = [1, 1, 1.45, 1, 1.35];
  const PV_G = [420, 70, 140, 0, 90];      // pesanteur des éclats selon le monde
  function pvScene(wi, W, H, q) {
    const key = Math.round(W) + 'x' + Math.round(H) + '@' + q.toFixed(2);
    let sc = PV.get(key);
    if (!sc) { if (PV.size >= 3) PV.delete(PV.keys().next().value); sc = []; PV.set(key, sc); }
    return sc[wi] || (sc[wi] = makeScene(wi, W, H, q));
  }
  function pvParticle(ctx, wi, x, y, s, k, i) {
    if (wi === 0) { ctx.fillStyle = ['#ffffff', '#ff9ad5', '#ffd23a', '#7cd860'][i % 4]; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.55, k * 6 + i, 0, TAU); ctx.fill(); }
    else if (wi === 1) { ctx.strokeStyle = 'rgba(230,252,255,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.stroke(); }
    else if (wi === 2) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(x, y, s * 1.2, s * 0.4, Math.sin(k * 7 + i) * 0.8, 0, TAU); ctx.fill(); }
    else if (wi === 3) { ctx.fillStyle = ['#ffffff', '#b48cff', '#5ef0ff'][i % 3]; ctx.fillRect(x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8); }
    else { ctx.fillStyle = IRIS[i % 6]; ctx.fillRect(x - s * 0.6, y - s * 0.3 * Math.abs(Math.cos(k * 9 + i)), s * 1.2, s * 0.6 * Math.abs(Math.cos(k * 9 + i)) + 0.5); }
  }
  function preview(ctx, w, h, t) {
    try {
      const P = 4.8, cyc = Math.floor(t / P), wi = ((cyc % NW) + NW) % NW, lt = t - cyc * P, nx = (wi + 1) % NW;
      const sc = (ctx.getTransform ? ctx.getTransform().a : 1) || 1, q = clamp(sc, 1, 2);
      const A = WPAL[wi][1].a, G = WGLASS[wi];
      ctx.save();
      drawScene(pvScene(wi, w, h, q), ctx, t, PV_ST[wi], 0, 0, 0);
      const s = Math.max(6, Math.floor((h - 18) / 10));
      const gw = s * 10, gh = s * 10;
      const gx = Math.round(w / 2 - gw / 2 + Math.min(w * 0.1, s * 2.2)), gy = Math.round((h - gh) / 2) + 2;
      const tpx = s * sc;
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = WMUL[wi]; ctx.fillRect(gx, gy, gw, gh); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(' + G[0] + ',' + G[1] + ',' + G[2] + ',' + (G[3] + 0.1) + ')';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.save();
      ctx.shadowColor = A; ctx.shadowBlur = 10;
      ctx.strokeStyle = A; ctx.lineWidth = 2;
      rr(ctx, gx - 3, gy - 3, gw + 6, gh + 6, 6); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (let r = 0; r < 10; r++) for (let q2 = 0; q2 < 10; q2++) ctx.fillRect(gx + q2 * s + s / 2 - 0.75, gy + r * s + s / 2 - 0.75, 1.5, 1.5);
      const drawCell = (cx, r, col, v) => { if (r >= 0) ctx.drawImage(tileImg(col, tpx, wi, v), gx + cx * s, gy + r * s, s, s); };
      const drawRows = (rows, skip) => {
        for (let r = 0; r < 10; r++) {
          if (skip && skip.indexOf(r) >= 0) continue;
          for (let q2 = 0; q2 < 10; q2++) { const ch = rows[r][q2]; if (ch !== '.') drawCell(q2, r, SHAPES[ch].c, (q2 * 7 + r * 3) % 4); }
        }
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      if (lt < 1.8) {
        drawRows(PV_BASE);
        const y = Math.min(8, -2 + Math.floor(lt / 0.145));
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ctx.drawImage(ghostImg(SHAPES.O.c, tpx), gx + (4 + dx) * s, gy + (8 + dy) * s, s, s);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) drawCell(4 + dx, y + dy, SHAPES.O.c, dx + dy * 2);
      } else if (lt < 2.3) {
        const p = (lt - 1.8) / 0.5;
        drawRows(PV_BASE, [8, 9]);
        if (p < 0.2) for (const r of [8, 9]) for (let q2 = 0; q2 < 10; q2++) {
          const ch = PV_BASE[r][q2];
          drawCell(q2, r, ch === '.' ? SHAPES.O.c : SHAPES[ch].c, q2 % 4);
        }
      } else {
        drawRows(PV_AFTER);
        const y = Math.min(8, -1 + Math.floor((lt - 2.3) / 0.17));
        for (const [cx, cy] of [[2, 0], [1, 1], [2, 1], [3, 1]]) drawCell(cx, y + cy, SHAPES.T.c, cx % 4);
      }
      ctx.restore();
      // la casse : faisceau, éclats de la matière du monde (pesanteur du monde) + particules du monde
      const pt = lt - 1.8;
      if (pt > 0 && pt < 1.4) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ba = Math.max(0, 1 - pt / 0.5);
        if (ba > 0) {
          const bgr = ctx.createLinearGradient(0, gy + 8 * s, 0, gy + 10 * s);
          bgr.addColorStop(0, rgba(A, 0)); bgr.addColorStop(0.5, 'rgba(255,255,255,' + ba + ')'); bgr.addColorStop(1, rgba(A, 0));
          ctx.fillStyle = bgr;
          ctx.fillRect(gx - s * 2 * (1 - ba), gy + 8 * s - s * 0.4, gw + s * 4 * (1 - ba), 2 * s + s * 0.8);
        }
        ctx.restore();
        const g = PV_G[wi], ft = pt, a = Math.max(0, 1 - ft / 1.4), drag = wi === 1 || wi === 3 ? 0.45 : 1;
        for (let i = 0; i < pvShards.length; i++) {
          const q3 = pvShards[i];
          const r = 8 + (i % 2), cx = Math.floor(i / 2) % 10;
          const ch = PV_BASE[r][cx];
          const col = ch === '.' ? SHAPES.O.c : SHAPES[ch].c;
          const px = gx + cx * s + s / 2 + q3[0] * 190 * ft * drag;
          const py = gy + r * s + s / 2 - (70 + q3[1] * 150) * ft * drag + 0.5 * g * ft * ft;
          ctx.globalAlpha = a;
          ctx.save(); ctx.translate(px, py); ctx.rotate(ft * (q3[2] * 12 - 6) * (wi === 3 ? 0.3 : 1));
          const z = s * (0.3 + q3[3] * 0.25);
          ctx.drawImage(tileImg(col, tpx, wi, i % 4), -z / 2, -z / 2, z, z);
          ctx.restore();
        }
        for (let i = 0; i < 26; i++) {
          const q3 = pvShards[i], x0 = gx + (i / 26) * gw, y0 = gy + 9 * s;
          let x = x0 + q3[0] * 120 * ft, y = y0 - (40 + q3[1] * 120) * ft;
          if (wi === 0) { y += 60 * ft * ft; x += Math.sin(ft * 6 + i) * 6; }
          else if (wi === 1) { y = y0 - (30 + q3[1] * 90) * ft - 40 * ft * ft; x += Math.sin(ft * 9 + i) * 4; }
          else if (wi === 2) { y += 40 * ft * ft; x += Math.sin(ft * 4 + i) * 10; }
          else if (wi === 4) y += 50 * ft * ft;
          ctx.globalAlpha = a;
          pvParticle(ctx, wi, x, y, s * (0.16 + q3[3] * 0.14), ft, i);
        }
        ctx.globalAlpha = 1;
        if (ft < 0.6) {
          ctx.strokeStyle = rgba(A, 1 - ft / 0.6); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(gx + gw / 2, gy + 9 * s, 10 + ft * gw * 1.4, 4 + ft * s * 5, 0, 0, TAU); ctx.stroke();
        }
        if (pt < 1.1) {
          ctx.save();
          const sz = Math.round(s * 1.2);
          ctx.font = sz + "px 'Bungee', Impact, sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = Math.min(1, (1.1 - pt) * 3);
          const k = pt < 0.2 ? easeOutBack(pt / 0.2) : 1;
          ctx.translate(gx + gw / 2, gy + gh * 0.4 - pt * 8); ctx.scale(k, k);
          ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#120620';
          ctx.strokeText('DOUBLE !', 0, 0);
          ctx.fillStyle = '#fff27a';
          ctx.fillText('DOUBLE !', 0, 0);
          ctx.restore();
        }
      }
      // nom du monde (médaillon + nom)
      const ic = Math.round(clamp(h * 0.17, 18, 34));
      ctx.drawImage(worldIconImg(wi, ic * sc), 7, 7, ic, ic);
      const lx = 7 + ic + 5, lw = gx - 10 - lx;
      if (lw > 30) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        let fs = Math.round(clamp(h * 0.055, 8, 12));
        ctx.font = '700 ' + fs + "px 'Chakra Petch', system-ui, sans-serif";
        ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,6,20,0.85)';
        ctx.strokeText('MONDE ' + (wi + 1), lx, 7 + ic * 0.3); ctx.fillStyle = A; ctx.fillText('MONDE ' + (wi + 1), lx, 7 + ic * 0.3);
        const nm = EMPILO_WORLDS[wi].short.toUpperCase();
        fs = Math.round(clamp(h * 0.07, 9, 15));
        ctx.font = fs + "px 'Bungee', Impact, sans-serif";
        const tw = ctx.measureText(nm).width;
        if (tw > lw) { fs = Math.max(7, Math.floor(fs * lw / tw)); ctx.font = fs + "px 'Bungee', Impact, sans-serif"; }
        ctx.strokeText(nm, lx, 7 + ic * 0.74); ctx.fillStyle = '#ffffff'; ctx.fillText(nm, lx, 7 + ic * 0.74);
      }
      // en route vers le monde suivant : le décor suivant entre comme la caméra qui voyage
      const tk = clamp((lt - (P - 0.7)) / 0.7, 0, 1);
      if (tk > 0) {
        const e = tk * tk * (3 - 2 * tk);
        const up = wi === 0 || wi === 4;       // plongeon (et retour) : la ligne monte ; sinon elle descend
        const ly = up ? h * (1 - e) : h * e;
        ctx.save(); ctx.beginPath();
        if (up) ctx.rect(0, ly, w, h - ly); else ctx.rect(0, 0, w, ly);
        ctx.clip();
        drawScene(pvScene(nx, w, h, q), ctx, t, PV_ST[nx], 0, up ? ly * 0.6 : (ly - h) * 0.6, 0);
        ctx.restore();
        ctx.fillStyle = wi === 0 || wi === 1 ? 'rgba(235,252,255,0.95)' : 'rgba(255,255,255,0.85)';
        ctx.fillRect(0, ly - 1.5, w, 3);
        if (wi === 3) {      // hyperespace : traînées d'étoiles
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - Math.abs(e - 0.5) * 2)) + ')'; ctx.lineWidth = 1.4;
          for (let i = 0; i < 24; i++) { const a = i * 2.4, r0 = (hash(i) * 0.4 + e * 0.6) * w * 0.6; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0); ctx.lineTo(w / 2 + Math.cos(a) * (r0 + w * 0.12 * e), h / 2 + Math.sin(a) * (r0 + w * 0.12 * e)); ctx.stroke(); }
        }
      }
      let fade = 0;
      if (lt < 0.3) fade = 1 - lt / 0.3;
      if (fade > 0) {
        // le plateau apparaît dans le nouveau monde
        ctx.globalAlpha = fade;
        drawScene(pvScene(wi, w, h, q), ctx, t, PV_ST[wi], 0, 0, 0);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    } catch (e) { /* ne jamais lever */ }
  }

  // ---------- Icônes ----------
  const ICONS = {
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M16 4 L6 12 L16 20 Z" fill="currentColor"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 4 L18 12 L8 20 Z" fill="currentColor"/></svg>',
    cw: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M20.5 3.5 L20.5 9.5 L14.5 9.5 Z" fill="currentColor"/></svg>',
    soft: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 8 L12 17 L20 8 Z" fill="currentColor"/></svg>',
    hard: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 3 V14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M6 11 L12 17.5 L18 11 Z" fill="currentColor"/><rect x="4" y="19" width="16" height="2.8" rx="1.2" fill="currentColor"/></svg>'
  };

  // ===========================================================================
  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const COL = Object.assign({
      night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
      amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a'
    }, api.colors || {});

    // ---------- Mode compétition (CONTRACT.md, Ajout 6) ----------
    const num = (v) => (v == null || v === '' ? NaN : Math.floor(Number(v)));
    const lvl0 = num(api.startLevel) >= 1 ? Math.min(99, num(api.startLevel)) : 1;
    const COMPET = api.mode === 'compet';
    // hasard du contenu : Math.random sans api.seed ; avec une graine, un flux mulberry32 par sorte de contenu
    // (flux décalés de 2^28 tirages). Les effets (particules, sons, textes, têtes) restent sur Math.random.
    const SEED = Number.isFinite(num(api.seed)) ? num(api.seed) | 0 : null;
    const rng = (k) => (SEED === null ? () => Math.random() : mulberry32(SEED + k * 0x50000000));
    const rBag = rng(1), rB = rng(3), rTile = rng(4), rEv = rng(5), rGarb = rng(6), rAir = rng(7);

    // ---------- Têtes des copains ----------
    function imgOk(im) {
      if (!im) return false;
      const w = im.naturalWidth || im.width || 0, h = im.naturalHeight || im.height || 0;
      if (im.complete === false) return false;
      return w > 0 && h > 0;
    }
    function getHeads() {
      try {
        const l = typeof api.heads === 'function' ? api.heads() : [];
        return Array.isArray(l) ? l.filter(h => h && h.img) : [];
      } catch (e) { return []; }
    }
    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* */ } }
    function drawHead(im, cx, cy, h, rot, sx, sy, shadow) {
      if (!imgOk(im)) return false;
      const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      const w = h * iw / ih;
      ctx.save();
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      ctx.scale(sx || 1, sy || 1);
      if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
      return true;
    }
    let heads = getHeads();
    let mascot = -1, mascotPrev = -1;
    const react = { t: 9, kind: 0, text: '' };
    function pickMascot() {
      heads = getHeads();
      if (!heads.length) { mascot = -1; return; }
      let i = Math.floor(Math.random() * heads.length);
      if (heads.length > 1 && i === mascotPrev) i = (i + 1 + Math.floor(Math.random() * (heads.length - 1))) % heads.length;
      mascot = i; mascotPrev = i;
    }
    pickMascot();
    function mascotSay(kind, list) {
      if (mascot < 0) return;
      react.t = 0; react.kind = kind;
      react.text = list[Math.floor(Math.random() * list.length)];
    }
    const LVL_TXT = ['Niveau {n}, quel artiste !', 'Ça empile sec !', 'Niveau {n}, on accélère !', 'Quel voyageur !',
      'Ça glisse tout seul !', 'Trop fort, niveau {n} !', 'Quelle vitesse !', 'On avance, on avance !'];
    const QUAD_TXT = ['Quatre lignes, la classe !', 'Tout est parti, bravo !', 'QUADRA de génie !', 'Quel voyage !'];
    const ARRIVE_TXT = [['Nouveau tour, on repart !', 'Retour à la plaine !'], ['On plonge !', 'Cap sous la mer !'],
      ['On remonte vers le ciel !', 'Envolée !'], ['Décollage !', 'Cap sur les étoiles !'], ['Au-delà des étoiles !', 'Vers le cœur de la galaxie !']];

    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ---------- Sons (synthèse de la bibliothèque, budget par image) ----------
    let rtime = 0, sndBudget = 8;
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.06 : v, fe); } catch (e) { /* */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.15 : v, lp || 900); } catch (e) { /* */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rtime - l < gap) return false;
      sndLast[ch] = rtime; sndBudget--;
      return true;
    }
    const sfxQ = [];
    function later(d, fn) { if (sfxQ.length < 80) sfxQ.push({ t: d, fn }); }
    const SFX = {
      move() { if (canPlay('move', 0.03)) tone(320, 0.025, 'square', 0.016, 290); },
      rot() { if (canPlay('rot', 0.03)) tone(540, 0.05, 'triangle', 0.04, 760); },
      rotFail() { if (canPlay('rf', 0.1)) tone(140, 0.04, 'square', 0.018); },
      soft() { if (canPlay('soft', 0.06)) tone(230, 0.02, 'sine', 0.018); },
      hard() { noise(0.12, 0.16, 1700); tone(170, 0.16, 'sine', 0.13, 42); },
      lock() { if (canPlay('lock', 0.05)) { tone(150, 0.06, 'triangle', 0.05, 90); noise(0.05, 0.05, 900); } },
      hold() { tone(420, 0.07, 'sine', 0.05, 840); later(0.05, () => tone(630, 0.06, 'sine', 0.035, 1000)); },
      holdNo() { if (canPlay('hn', 0.15)) tone(130, 0.06, 'square', 0.02); },
      clear(n, tier, cmb) {
        const up = Math.pow(2, Math.min(12, Math.max(0, cmb)) / 12);
        noise(0.2 + 0.08 * n, 0.15 + 0.03 * n, 2600 + 900 * n);           // verre qui éclate
        tone(118, 0.24 + 0.05 * n, 'sine', 0.11 + 0.01 * n, 40);            // coup sourd
        const notes = [523, 659, 784, 1047, 1319];
        for (let i = 0; i <= Math.min(4, n); i++) later(0.035 * i, () => tone(notes[i] * up, 0.13, 'triangle', 0.05));
        if (tier >= 3) {
          tone(62, 1.0, 'sawtooth', 0.06, 26);
          later(0.05, () => noise(1.2, 0.24, 1900));
          [1047, 1319, 1568, 2093].forEach((f, i) => later(0.22 + i * 0.06, () => tone(f * up, 0.22, 'square', 0.035)));
          for (let i = 0; i < 6; i++) later(0.45 + i * 0.07, () => tone(1800 + Math.random() * 1600, 0.05, 'sine', 0.025));
        }
        // la couleur sonore du monde : chant d'oiseau, bulles, souffle du vent, nappe spatiale, carillon
        const w = WI;
        if (w === 0) for (let i = 0; i < 2 + n; i++) later(0.12 + i * 0.07, () => tone(2200 + Math.random() * 900, 0.05, 'sine', 0.02, 3200));
        else if (w === 1) for (let i = 0; i < 3 + n; i++) later(0.06 + i * 0.06, () => tone(380 + Math.random() * 300, 0.07, 'sine', 0.035, 900 + Math.random() * 500));
        else if (w === 2) { later(0.05, () => noise(0.5 + n * 0.1, 0.06, 2400)); later(0.1, () => tone(660, 0.3, 'triangle', 0.02, 990)); }
        else if (w === 3) later(0.05, () => tone(220, 0.5, 'sawtooth', 0.025, 880));
        else [1568, 1976, 2349].forEach((f, i) => later(0.15 + i * 0.07, () => tone(f, 0.18, 'sine', 0.025)));
      },
      // voyages : plongeon, remontée, décollage, hyperespace, retour
      trip(k) {
        if (k === 'dive') {
          noise(0.7, 0.22, 1100); tone(420, 0.5, 'sine', 0.08, 90);
          for (let i = 0; i < 10; i++) later(0.35 + i * 0.09, () => tone(300 + Math.random() * 500, 0.06, 'sine', 0.035, 900 + Math.random() * 600));
        } else if (k === 'rise') {
          tone(160, 1.1, 'sine', 0.06, 520); later(0.7, () => { noise(0.5, 0.2, 1600); tone(600, 0.3, 'sine', 0.05, 1200); });
          for (let i = 0; i < 6; i++) later(i * 0.1, () => tone(500 + i * 90, 0.05, 'sine', 0.03, 1000));
        } else if (k === 'launch') {
          tone(48, 1.8, 'sawtooth', 0.06, 30); noise(1.6, 0.13, 420); later(0.4, () => tone(200, 1.2, 'triangle', 0.035, 900));
        } else if (k === 'warp') {
          tone(160, 0.9, 'sawtooth', 0.045, 2400); later(0.85, () => { noise(0.6, 0.2, 6000); tone(2400, 0.5, 'sine', 0.04, 300); });
        } else {
          [523, 659, 784, 1047, 1319].forEach((f, i) => later(i * 0.1, () => tone(f, 0.3, 'triangle', 0.04)));
          later(0.6, () => noise(0.8, 0.08, 6000));
        }
      },
      arrive() { [784, 988, 1175, 1568].forEach((f, i) => later(i * 0.07, () => tone(f, 0.16, 'triangle', 0.045))); },
      tspin() { tone(200, 0.3, 'sawtooth', 0.04, 1100); noise(0.3, 0.08, 4200); },
      combo(k) { const f = 660 * Math.pow(2, Math.min(14, k) / 12); later(0.08, () => { tone(f, 0.09, 'square', 0.035); later(0.06, () => tone(f * 1.5, 0.12, 'square', 0.03)); }); },
      b2b() { later(0.12, () => { tone(880, 0.08, 'triangle', 0.045); later(0.07, () => tone(1175, 0.14, 'triangle', 0.045)); }); },
      pc() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => later(0.3 + i * 0.07, () => tone(f, 0.16, 'triangle', 0.05))); },
      level() { noise(0.9, 0.07, 5000); tone(200, 0.8, 'sawtooth', 0.035, 1200); [523, 659, 784, 1047].forEach((f, i) => later(0.15 + i * 0.08, () => tone(f, 0.14, 'square', 0.04))); },
      heart() { tone(68, 0.12, 'sine', 0.12, 50); later(0.16, () => tone(60, 0.14, 'sine', 0.09, 45)); },
      ready() { tone(660, 0.1, 'square', 0.04); },
      go() { tone(880, 0.16, 'square', 0.05); later(0.05, () => tone(1320, 0.2, 'triangle', 0.04)); },
      over() { noise(0.8, 0.2, 800); tone(330, 0.3, 'square', 0.05, 160); later(0.28, () => tone(220, 0.5, 'square', 0.05, 70)); },
      tick() { tone(1250, 0.03, 'sine', 0.025); }
    };

    // ---------- Préférences de l'appareil (tutoriel vu, boutons à l'écran) ----------
    function pref(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function setPref(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* */ } }
    let showBtns = pref(BTN_KEY, '0') === '1';

    // ---------- DOM ----------
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');

    const BTNCSS = 'position:absolute;display:flex;align-items:center;justify-content:center;padding:0;margin:0;cursor:pointer;touch-action:none;' +
      'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box;';
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = ICONS.pause;
    pauseBtn.style.cssText = BTNCSS + 'top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.28);background:rgba(10,8,26,0.72);color:#fff;z-index:4;';
    root.appendChild(pauseBtn);
    // bouton RÉSERVE : zone transparente posée sur la case réserve dessinée dans le canvas
    const holdBtn = document.createElement('button');
    holdBtn.type = 'button';
    holdBtn.setAttribute('aria-label', 'Réserve');
    holdBtn.style.cssText = BTNCSS + 'border:0;background:transparent;z-index:3;border-radius:14px;';
    root.appendChild(holdBtn);
    let holdPress = 0;
    // barre de boutons (optionnelle, compacte)
    const bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:6px;right:6px;bottom:6px;display:none;gap:6px;z-index:3;touch-action:none;user-select:none;-webkit-user-select:none;';
    root.appendChild(bar);
    const BAR_DEFS = ['left', 'right', 'cw', 'soft', 'hard'];
    const barBtns = {}, barDown = {};
    for (const name of BAR_DEFS) {
      const b = document.createElement('button');
      b.type = 'button'; b.innerHTML = ICONS[name]; b.setAttribute('aria-label', name);
      b.style.cssText = 'flex:1 1 0;min-width:0;height:48px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.22);background:rgba(16,10,36,0.72);color:#fff;' +
        'display:flex;align-items:center;justify-content:center;padding:0;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;cursor:pointer;';
      bar.appendChild(b); barBtns[name] = b; barDown[name] = false;
      const press = (e) => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch (_) { /* */ }
        if (barDown[name]) return;
        barDown[name] = true; b.style.background = 'rgba(80,50,140,0.85)';
        if (paused) { togglePause(); return; }
        barAction(name, true);
      };
      const release = (e) => {
        if (e) e.preventDefault();
        if (!barDown[name]) return;
        barDown[name] = false; b.style.background = 'rgba(16,10,36,0.72)';
        barAction(name, false);
      };
      on(b, 'pointerdown', press); on(b, 'pointerup', release); on(b, 'pointercancel', release); on(b, 'lostpointercapture', release);
      on(b, 'contextmenu', (e) => e.preventDefault());
    }

    // ---------- Mise en page ----------
    let W = 300, H = 300, dpr = 1, touchUI = true, portrait = true;
    let c = 20, gx = 0, gy = 0, gridW = 200, gridH = 400, hudH = 0, barH = 0;
    const L = { hold: { x: 0, y: 0, w: 60, h: 50 }, stats: { x: 0, y: 0, w: 100, h: 50 }, next: [], mascot: null, keys: null, voyage: null, pause: { x: 0, y: 0, s: 46 } };
    let wells = [], frameCache = new Map();
    let scenes = [], sceneQ = 1, sceneKey = '', warmQ = [];

    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(200, r.width || root.clientWidth || 300);
      H = Math.max(240, r.height || root.clientHeight || 300);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      let fine = false;
      try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
      touchUI = !fine;
      portrait = W < H * 0.9;
      barH = showBtns && touchUI ? 54 : 0;
      bar.style.display = barH ? 'flex' : 'none';
      L.voyage = null;
      if (portrait) {
        hudH = Math.round(clamp(H * 0.084, 56, 76));
        const avH = H - hudH - 12 - barH;
        c = Math.max(8, Math.floor(Math.min((W - 12) / COLS, avH / VIS)));
        gridW = c * COLS; gridH = c * VIS;
        gx = Math.round((W - gridW) / 2);
        gy = Math.round(hudH + 6 + Math.max(0, (avH - gridH) * 0.4));
        const ps = 44;
        L.pause = { x: W - ps - 6, y: Math.round((hudH - ps) / 2), s: ps };
        const bh = hudH - 10;
        L.hold = { x: 6, y: 5, w: Math.round(bh * 1.12), h: bh };
        const nbw = Math.round(bh * 1.02), gw2 = Math.round(bh * 0.92);
        const nx = L.pause.x - 6 - gw2 - 4 - nbw;
        L.next = [{ x: nx, y: 5, w: nbw, h: bh }];
        const sw = (gw2 - 3) / 2, sh = (bh - 3) / 2;
        for (let i = 0; i < 4; i++) L.next.push({ x: nx + nbw + 4 + (i % 2) * (sw + 3), y: 5 + Math.floor(i / 2) * (sh + 3), w: sw, h: sh, small: true });
        const sx0 = L.hold.x + L.hold.w + 8;
        L.stats = { x: sx0, y: 4, w: nx - 8 - sx0, h: hudH - 8 };
        L.mascot = null; L.keys = null;
      } else {
        hudH = 0;
        const sideMin = touchUI ? 96 : 130;
        c = Math.max(8, Math.floor(Math.min((H - 16 - barH) / VIS, (W - 2 * (sideMin + 24)) / COLS)));
        gridW = c * COLS; gridH = c * VIS;
        gx = Math.round((W - gridW) / 2);
        gy = Math.round((H - barH - gridH) / 2);
        const pw = Math.round(clamp(c * 5.4, 96, 230));
        const gap = Math.round(clamp(c * 0.7, 10, 26));
        const lx = gx - gap - pw, rx = gx + gridW + gap;
        L.pause = { x: W - 52, y: 6, s: 46 };
        L.hold = { x: lx, y: gy, w: pw, h: Math.round(clamp(pw * 0.6, 56, 120)) };
        const sy = L.hold.y + L.hold.h + Math.round(gap * 0.6);
        L.stats = { x: lx, y: sy, w: pw, h: Math.min(Math.round(clamp(c * 5.6, 92, 210)), gy + gridH - sy) };
        // panneau VOYAGE (les 5 mondes, où l'on est) sous le score, s'il y a la place
        const vy = L.stats.y + L.stats.h + Math.round(gap * 0.6), vh = Math.round(clamp(pw * 0.62, 84, 132));
        if (gy + gridH - vy >= vh) L.voyage = { x: lx, y: vy, w: pw, h: vh };
        const ky = L.voyage ? vy + vh + Math.round(gap * 0.6) : vy;
        const kh = gy + gridH - ky;
        L.keys = kh >= 110 && !touchUI ? { x: lx, y: ky, w: pw, h: kh } : null;
        const big = Math.round(clamp(pw * 0.6, 56, 120)), sm = Math.round(big * 0.66);
        L.next = [{ x: rx, y: gy, w: pw, h: big }];
        let yy = gy + big + 4;
        for (let i = 0; i < 4; i++) { L.next.push({ x: rx, y: yy, w: pw, h: sm, small: true }); yy += sm + 4; }
        const my = yy + Math.round(gap * 0.5), mh = gy + gridH - my;
        L.mascot = mh >= 70 ? { x: rx, y: my, w: pw, h: Math.min(mh, pw * 1.25) } : null;
      }
      pauseBtn.style.left = L.pause.x + 'px'; pauseBtn.style.top = L.pause.y + 'px'; pauseBtn.style.right = 'auto';
      pauseBtn.style.width = pauseBtn.style.height = L.pause.s + 'px';
      holdBtn.style.left = L.hold.x + 'px'; holdBtn.style.top = L.hold.y + 'px';
      holdBtn.style.width = L.hold.w + 'px'; holdBtn.style.height = L.hold.h + 'px';
      frameCache = new Map();
      wells = [];
      // décors : redessinés seulement si la taille change (couches à 1–1,5 px par px CSS : elles sont douces et derrière le verre)
      const q = clamp(dpr, 1, 1.5) * (W * H > 1100000 ? 0.8 : 1), key = Math.round(W) + 'x' + Math.round(H) + '@' + q.toFixed(2);
      if (key !== sceneKey) { sceneKey = key; sceneQ = q; scenes = []; warmQ = []; if (trip) { trip.sf = sceneFor(trip.from); trip.sto = sceneFor(trip.to); } }
    }
    function sceneFor(w) { return scenes[w] || (scenes[w] = makeScene(w, W, H, sceneQ)); }

    // puits de verre teinté (un par monde) : on voit le décor à travers, les blocs restent nets
    function wellFor(w) {
      if (wells[w]) return wells[w];
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(gridW * dpr)); cv.height = Math.max(1, Math.round(gridH * dpr));
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const G = WGLASS[w], rgb = G[0] + ',' + G[1] + ',' + G[2], rgb2 = Math.round(G[0] * 0.5) + ',' + Math.round(G[1] * 0.5) + ',' + Math.round(G[2] * 0.5);
      const g = x.createLinearGradient(0, 0, 0, gridH);
      g.addColorStop(0, 'rgba(' + rgb + ',' + (G[3] - 0.05) + ')');
      g.addColorStop(1, 'rgba(' + rgb2 + ',' + Math.min(0.92, G[3] + 0.1) + ')');
      x.fillStyle = g;
      x.fillRect(0, 0, gridW, gridH);
      for (let r2 = 0; r2 < VIS; r2++) for (let q = 0; q < COLS; q++) {
        const X = q * c, Y = r2 * c;
        x.fillStyle = 'rgba(255,255,255,0.032)';
        rr(x, X + c * 0.08, Y + c * 0.08, c * 0.84, c * 0.84, c * 0.2); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.09)';
        x.fillRect(X + c / 2 - 0.75, Y + c / 2 - 0.75, 1.5, 1.5);
      }
      const sh = x.createLinearGradient(0, 0, gridW, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0.07)'); sh.addColorStop(0.16, 'rgba(255,255,255,0)');
      sh.addColorStop(0.84, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,0.05)');
      x.fillStyle = sh; x.fillRect(0, 0, gridW, gridH);
      // reflet en biais du verre
      x.fillStyle = 'rgba(255,255,255,0.035)';
      x.beginPath(); x.moveTo(gridW * 0.55, 0); x.lineTo(gridW * 0.75, 0); x.lineTo(gridW * 0.25, gridH); x.lineTo(gridW * 0.05, gridH); x.closePath(); x.fill();
      const ts = x.createLinearGradient(0, 0, 0, c * 1.4);
      ts.addColorStop(0, 'rgba(0,0,0,0.42)'); ts.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = ts; x.fillRect(0, 0, gridW, c * 1.4);
      wells[w] = cv;
      return cv;
    }
    // cadre néon du monde, avec ses petites décorations (feuilles et fleurs, coquillages, nuages, rivets, gemmes)
    function frameImg(w) {
      let cv = frameCache.get(w);
      if (cv) return cv;
      const acc = WPAL[w][1].a;
      const pad = Math.round(c * 0.9) + 10;
      cv = document.createElement('canvas');
      cv.width = Math.round((gridW + pad * 2) * dpr); cv.height = Math.round((gridH + pad * 2) * dpr);
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const R = Math.max(6, c * 0.35), X0 = pad - 4, Y0 = pad - 4, FW = gridW + 8, FH = gridH + 8;
      x.save();
      x.shadowColor = acc; x.shadowBlur = Math.max(10, c * 0.9);
      x.strokeStyle = rgba(acc, 0.9); x.lineWidth = 3;
      rr(x, X0, Y0, FW, FH, R); x.stroke();
      x.restore();
      let g;
      if (w === 4) { g = x.createLinearGradient(X0, Y0, X0 + FW, Y0 + FH); IRIS.forEach((c2, i) => g.addColorStop(i / 5, c2)); }
      else { g = x.createLinearGradient(0, pad, 0, pad + gridH); g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, acc); g.addColorStop(0.85, acc); g.addColorStop(1, shade(acc, -0.3)); }
      x.strokeStyle = g; x.lineWidth = 2.5;
      rr(x, X0, Y0, FW, FH, R); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.2)'; x.lineWidth = 1;
      rr(x, pad - 1, pad - 1, gridW + 2, gridH + 2, R * 0.7); x.stroke();
      const s = clamp(c * 0.5, 7, 18), B = Y0 + FH, Rr = X0 + FW;
      // décorations posées autour du cadre (jamais sur les cases du jeu)
      const XL = X0 - s * 0.55, XR = Rr + s * 0.55, YB = B + s * 0.35, YT = Y0 - s * 0.3;
      if (w === 0) {
        for (const [cx, cy, sg] of [[XL, YB, 1], [XR, YB, -1]]) {
          leafShape(x, cx, cy, s * 1.5, sg > 0 ? -2.4 : -0.75, '#4fb84a'); leafShape(x, cx, cy, s * 1.2, sg > 0 ? -1.7 : -1.45, '#78d85a');
          flower5(x, cx + sg * s * 0.5, cy - s * 0.4, s * 0.55, sg > 0 ? '#ffffff' : '#ff8fc4', '#ffd23a');
        }
        flower5(x, XL + s * 0.2, YT + s * 0.2, s * 0.42, '#ffd23a', '#ff8a2a');
        leafShape(x, XR, YT, s * 1.1, -2.6, '#78d85a'); flower5(x, XR - s * 0.1, YT + s * 0.2, s * 0.4, '#ffffff', '#ffd23a');
      } else if (w === 1) {
        x.fillStyle = '#ff8a5a'; star5(x, XL - s * 0.1, YB - s * 0.1, s * 0.85, s * 0.38); x.fill();
        x.strokeStyle = '#c0502a'; x.lineWidth = 1; x.stroke();
        x.fillStyle = '#ffe0d0'; x.beginPath(); x.arc(XR + s * 0.1, YB - s * 0.1, s * 0.7, Math.PI, TAU); x.lineTo(XR + s * 0.1, YB + s * 0.3); x.closePath(); x.fill();
        x.strokeStyle = '#d0907a'; x.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(XR + s * 0.1, YB + s * 0.25); x.lineTo(XR + s * 0.1 + i * s * 0.28, YB - s * 0.7); x.stroke(); }
        x.strokeStyle = 'rgba(220,250,255,0.85)'; x.lineWidth = 1.3;
        for (const [a2, b2, r2] of [[0.2, 0.5, 0.32], [0.55, 1.1, 0.22], [0.1, 1.6, 0.16]]) { x.beginPath(); x.arc(XL - s * a2 + s * 0.5, YT + s * b2, s * r2, 0, TAU); x.stroke(); x.beginPath(); x.arc(XR + s * a2 - s * 0.4, YT + s * b2 + s * 0.6, s * r2 * 0.8, 0, TAU); x.stroke(); }
      } else if (w === 2) {
        for (const [cx, cy, k] of [[XL - s * 0.3, YT, 1], [XR + s * 0.3, YT + s * 0.1, 0.8], [XL - s * 0.3, YB - s * 0.1, 0.9], [XR + s * 0.3, YB, 1.1]]) {
          x.save(); x.translate(cx - s * 1.3 * k, cy - s * 0.7 * k); cloudPaint(x, s * 2.6 * k, s * 1.3 * k, 5 + k * 3, '#ffffff', '#c3d6ee', 'rgba(255,255,255,0.6)'); x.restore();
        }
      } else if (w === 3) {
        x.fillStyle = 'rgba(220,226,255,0.75)';
        for (let i = 0; i <= 8; i++) { const yy = Y0 + FH * (i / 8); x.beginPath(); x.arc(X0, yy, 1.6, 0, TAU); x.arc(Rr, yy, 1.6, 0, TAU); x.fill(); }
        for (const cx of [X0 + s * 0.6, Rr - s * 0.6]) {
          x.strokeStyle = '#9aa4c8'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx, Y0); x.lineTo(cx, Y0 - s * 0.9); x.stroke();
          x.fillStyle = '#ff5f7a'; x.beginPath(); x.arc(cx, Y0 - s * 0.95, s * 0.18, 0, TAU); x.fill();
        }
      } else {
        for (const [cx, cy, col] of [[XL, YT, '#5ef0ff'], [XR, YT, '#ff6ec7'], [XL, YB, '#fff27a'], [XR, YB, '#7dff8a']]) {
          x.fillStyle = col; x.beginPath(); x.moveTo(cx, cy - s * 0.55); x.lineTo(cx + s * 0.4, cy); x.lineTo(cx, cy + s * 0.55); x.lineTo(cx - s * 0.4, cy); x.closePath(); x.fill();
          x.strokeStyle = '#ffffff'; x.lineWidth = 1.2; x.stroke();
        }
      }
      cv._pad = pad;
      frameCache.set(w, cv);
      return cv;
    }

    // ---------- État du jeu ----------
    // board : type de pièce ; headBoard : tête de copain ; goldBoard : bloc doré ; airBoard : bulle d'air (Océan) ;
    // varBoard : variante de dessin du bloc (fleur, givre…), purement décorative
    const board = [], headBoard = [], goldBoard = [], airBoard = [], varBoard = [];
    const newRow = (v) => new Array(COLS).fill(v);
    for (let y = 0; y < ROWS; y++) { board.push(newRow(null)); headBoard.push(newRow(-1)); goldBoard.push(newRow(0)); airBoard.push(newRow(0)); varBoard.push(newRow(0)); }
    const rowOff = new Array(ROWS).fill(null);   // chute des lignes après une casse (rebond)
    let bag = [];
    const nextQ = [];
    let cur = null, hold = null, holdUsed = false, holdSp = null, piecesSinceSpecial = 0;
    let score = 0, lines = 0, level = lvl0, dispScore = 0, scorePulse = 0;
    let state = 'ready', stateT = 0, paused = false, time = 0;
    let fallT = 0, lockT = 0, lockResets = 0, lowestY = 0;
    let lastAct = '', lastKick = 0;
    let clearing = null;
    let overT = 0, overCalled = false;
    let combo = -1, b2b = -1, mult = 1, multT = 0;
    let piecesSinceB = 0, nextB = 12 + Math.floor(rB() * 6);
    let ev = null, evNext = -1, evLast = '';
    let darkCv = null;
    let lastClear = null, tspins = 0, quads = 0, pcs = 0, maxCombo = 0, airs = 0;
    function evOn(k) { return !!(ev && ev.k === k); }
    // effets
    const shards = [], sparks = [], rings = [], beams = [], floaters = [], pops = [], trails = [], lockFlash = [], wfx = [], tfx = [];
    let callout = null, banner = null;
    let shakeT = 0, shakeMag = 0, kickY = 0, kickV = 0, punch = 0, flash = 0, flashCol = '#ffffff', slowT = 0;
    let palFrom = palFor(level), palTo = palFrom, palK = 1, transT = -1, ACC = palTo.a;
    let heartT = 0, levelFlash = 0;
    // ---------- Le voyage : monde, tour, ambiance du décor ----------
    const W0 = worldOf(level);
    let WI = W0.w, TOUR = W0.tour;              // monde en cours (0..4), tour (0 = Tour I)
    let stNow = W0.stage, stFrom = W0.stage, stTo = W0.stage, stT = 9;    // ambiance du décor (fondu d'un niveau à l'autre)
    let trip = null, tripPend = null;            // voyage vers le monde suivant (caméra + carte), en attente après la casse
    let camX = 0, camXT = 0;                     // parallaxe horizontale (suit doucement la pièce)
    const bonusSeen = {};                        // pièce bonus déjà présentée dans ce monde
    const AIR_W = (w) => w === 1 || w === 4;     // bulles bonus : Océan et Au-delà
    const FLOAT_W = (w) => w === 3 || w === 4;   // apesanteur : Espace et Au-delà

    // ---------- Tutoriel (premier lancement, mémorisé sur l'appareil) ----------
    const tutoSeen = pref(TUTO_KEY, '0') === '1';
    let tuto = null;
    if (!COMPET && !tutoSeen) { state = 'tuto'; tuto = { step: 0, t: 0 }; }
    function tutoNext(skip) {
      if (!tuto) return;
      SFX.tick();
      if (skip || tuto.step >= 2) { tuto = null; setPref(TUTO_KEY, '1'); state = 'ready'; stateT = 0; return; }
      tuto.step++; tuto.t = 0;
    }

    // ---------- Copain saboteur (ou, sans têtes, la créature du monde : taupe, crabe, orage, soucoupe, trou noir) ----------
    function sabRise() { return Math.max(7, 20 - (level - 2) * 0.5); }
    function sabMaxRises() { return 3 + Math.floor(level / 7); }
    let sab = null, sabPending = -1, sabLast = -1;
    function summonSab() {
      heads = getHeads();
      if (state !== 'play' || sab || trip) return;
      const rm = sabRise();
      if (!heads.length) {
        const SW = SAB_W[WI];
        sab = { idx: -1, w: WI, phase: 'in', t: 0, riseT: rm, riseMax: rm, rises: 0, maxRises: sabMaxRises(), say: SW.hi, sayT: 0 };
        addPop(SW.name, "2 LIGNES D'UN COUP POUR " + (WI === 0 || WI === 3 ? 'LA' : 'LE') + ' CHASSER', COL.volt, 2.4);
        shake(0.2, 3);
        tone(700, 0.1, 'sine', 0.05, 300); later(0.18, () => tone(640, 0.1, 'sine', 0.05, 280));
        return;
      }
      let idx = Math.floor(Math.random() * heads.length);
      if (heads.length > 1 && (idx === mascot || idx === sabLast)) {
        for (let k = 1; k < heads.length; k++) { const j = (idx + k) % heads.length; if (j !== mascot && j !== sabLast) { idx = j; break; } }
        if (idx === mascot && heads.length > 1) idx = (mascot + 1) % heads.length;
      }
      sabLast = idx;
      const nm = String(heads[idx].name || 'un copain').toUpperCase();
      sab = { idx, w: WI, phase: 'in', t: 0, riseT: rm, riseMax: rm, rises: 0, maxRises: sabMaxRises(), say: 'Hé hé hé !', sayT: 0 };
      const T = ["OH ! C'EST " + nm + ' !', nm + ' DÉBARQUE !', 'ATTENTION, ' + nm + ' !'];
      addPop(T[Math.floor(Math.random() * T.length)], "2 LIGNES D'UN COUP POUR LE CHASSER", COL.spray, 2.4);
      shake(0.2, 3);
      tone(200, 0.15, 'sawtooth', 0.05, 420); later(0.15, () => tone(300, 0.15, 'sawtooth', 0.05, 160)); later(0.35, () => tone(520, 0.08, 'square', 0.04));
    }
    function sabSay(txt) { if (sab) { sab.say = txt; sab.sayT = 0; } }
    function riseGarbage() {
      if (board[0].some(v => v) || board[1].some(v => v)) { endGame(); return; }
      board.shift(); headBoard.shift(); goldBoard.shift(); airBoard.shift(); varBoard.shift();
      const row = newRow('G');
      row[Math.floor(rGarb() * COLS)] = null;
      board.push(row); headBoard.push(newRow(-1)); goldBoard.push(newRow(0)); airBoard.push(newRow(0));
      varBoard.push(row.map(() => Math.floor(Math.random() * 4)));
      if (cur) { if (collide(cur.x, cur.y, cur.r)) cur.y--; lowestY = Math.min(lowestY, cur.y); }
      for (let x = 0; x < COLS; x++) {
        if (!row[x]) continue;
        addShard(gx + x * c + c / 2, gy + gridH, (Math.random() - 0.5) * c * 4, -c * (2 + Math.random() * 4), GARB[WI], c * 0.3, 0.7, null);
      }
      shake(0.22, 4);
      noise(0.25, 0.14, 300); tone(110, 0.2, 'square', 0.05, 70);
      if (sab && sab.idx < 0) { const R2 = SAB_W[sab.w].rise; sabSay(R2[Math.floor(Math.random() * R2.length)]); }
      else sabSay(['Et hop, une ligne !', 'Surprise !', 'Hé hé, ça monte !', 'Tiens, une ligne !'][Math.floor(Math.random() * 4)]);
    }
    function chaseSab() {
      if (!sab || sab.phase !== 'on') return;
      const bonus = 500 * level * mult;
      score += bonus;
      if (sab.idx < 0) {
        const SW = SAB_W[sab.w];
        sab.phase = 'sad'; sab.t = 0; sabSay(SW.sad);
        const gone = SW.who + ' EST PARTI' + (sab.w === 0 || sab.w === 3 ? 'E' : '') + ' !';
        later(0.6, () => addPop('+' + fmt(bonus), gone, COL.leaf, 1.6, true));
        [523, 659, 784].forEach((f, i) => later(0.3 + i * 0.1, () => tone(f, 0.12, 'triangle', 0.045)));
        mascotSay(1, ['Bien joué !', 'Ouste !', 'Bravo !']);
        return;
      }
      const nm = String(heads[sab.idx] ? heads[sab.idx].name : 'COPAIN').toUpperCase();
      sab.phase = 'sad'; sab.t = 0;
      sabSay(['Snif…', 'Bouhouhou…', 'Pas juste…', 'Snif, snif…'][Math.floor(Math.random() * 4)]);
      const T = [nm + ' PLEURE !', 'PAUVRE ' + nm + ' !', nm + ' EST CHASSÉ !'];
      later(0.6, () => addPop('+' + fmt(bonus), T[Math.floor(Math.random() * T.length)], COL.leaf, 1.6, true));
      [660, 520, 440, 330].forEach((f, i) => later(0.3 + i * 0.12, () => tone(f, 0.14, 'triangle', 0.045, f * 0.9)));
      mascotSay(1, ['Bien joué !', 'Ouste !', 'Bravo !']);
    }
    function updateSab(dt) {
      if (sabPending >= 0 && state === 'play' && !clearing && !trip) {
        sabPending -= dt;
        if (sabPending <= 0) { sabPending = -1; summonSab(); }
      }
      if (!sab) return;
      sab.t += dt; sab.sayT += dt;
      if (sab.phase === 'in' && sab.t > 0.6) { sab.phase = 'on'; sab.t = 0; }
      else if (sab.phase === 'on' && state === 'play' && !clearing && !trip) {
        const before = sab.riseT;
        sab.riseT -= dt;
        if (before > 2 && sab.riseT <= 2) tone(880, 0.06, 'square', 0.03);
        if (before > 1 && sab.riseT <= 1) tone(880, 0.06, 'square', 0.03);
        if (sab.riseT <= 0) {
          riseGarbage();
          if (!sab) return;
          sab.rises++;
          sab.riseT = sab.riseMax;
          if (sab.rises >= sab.maxRises && state === 'play') { sab.phase = 'bye'; sab.t = 0; sabSay(sab.idx < 0 ? SAB_W[sab.w].bye : "Bon, j'y vais !"); }
        }
      } else if ((sab.phase === 'sad' && sab.t > 2.4) || (sab.phase === 'bye' && sab.t > 1.6)) {
        sab = null;
      }
    }

    // ---------- Événements (mêmes règles partout, nom et dessin propres au monde) ----------
    function evGap() { return Math.max(14, 38 - level * 1.1) + rEv() * 10; }
    function startEvent(k) {
      const d = EVDEF[k];
      if (!d) return;
      ev = { k, t: 0, dur: d.dur, w: WI };
      evLast = k;
      const N = evName(k, WI);
      addPop(N.name, N.sub, N.col, 2.2);
      if (k === 'mousse') { [392, 523, 659].forEach((f, i) => later(i * 0.1, () => tone(f, 0.18, 'sine', 0.045, f * 1.02))); mascotSay(1, ['Tranquille…', 'Quel bonheur !', 'On souffle un peu !']); }
      else if (k === 'essorage') { tone(120, 0.8, 'sawtooth', 0.04, 480); noise(0.8, 0.08, 1200); mascotSay(2, ['Ça file !', 'Accroche-toi !', 'Waouh !']); }
      else if (k === 'panne') { tone(220, 0.08, 'square', 0.05); later(0.12, () => tone(160, 0.25, 'square', 0.05, 60)); mascotSay(2, ['Qui a éteint ?', 'Il fait noir !', 'Au secours !']); }
      else { noise(0.9, 0.1, 500); mascotSay(1, ['On voit rien !', 'Tout est flou !', 'Pfff !']); }
    }
    function endEvent(quiet) {
      if (!ev) return;
      const k = ev.k;
      ev = null;
      evNext = evGap();
      if (quiet) return;
      addPop(k === 'mousse' ? 'ÇA REPART' : k === 'panne' ? 'LUMIÈRE !' : k === 'buee' ? 'ÇA SE DÉGAGE' : 'ÇA SE CALME', '', COL.muted, 1.1);
      tone(660, 0.08, 'triangle', 0.04); later(0.08, () => tone(880, 0.1, 'triangle', 0.04));
    }
    function updateEvents(dt) {
      if (state !== 'play' || clearing || trip) return;
      if (mult > 1) {
        multT -= dt;
        if (multT <= 0) { mult = 1; multT = 0; addPop('FIN DU BONUS', 'SCORE ×1', COL.muted, 1.1); tone(400, 0.12, 'triangle', 0.04, 260); }
      }
      if (ev) { ev.t += dt; if (ev.t >= ev.dur) endEvent(); return; }
      const avail = Object.keys(EVDEF).filter(k => level >= EVDEF[k].from);
      if (!avail.length) return;
      if (evNext < 0) evNext = 16 + rEv() * 8;
      evNext -= dt;
      if (evNext <= 0) {
        let pool = avail.filter(k => k !== evLast);
        if (!pool.length) pool = avail;
        if (level >= 15 && pool.length > 1 && rEv() < 0.4) pool = pool.filter(k => k !== 'mousse');
        startEvent(pool[Math.floor(rEv() * pool.length)]);
      }
    }

    // ---------- Pièces ----------
    function refill() {
      const b = TYPES.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rBag() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
      bag = bag.concat(b);
    }
    function fillQ() {
      while (nextQ.length < NEXT_N + 1) {
        if (!bag.length) refill();
        const t = bag.shift();
        if (level >= 2) {
          piecesSinceB++;
          if (piecesSinceB >= nextB) { piecesSinceB = 0; nextB = 14 + Math.floor(rB() * 8) + Math.min(8, Math.floor(level / 4)); nextQ.push('B'); }
        }
        nextQ.push(t);
      }
    }
    fillQ();
    if (lvl0 > 1) planLevel(3.5);

    // Gravité façon jeux modernes : (0,8 − (n−1)×0,007)^(n−1) s par ligne → 1 s au niv. 1, 0,19 s au 7, quasi instantané dès 15
    function baseGravity(l) { const n = Math.min(Math.max(1, l), 20); return Math.max(1 / 1200, Math.pow(0.8 - (n - 1) * 0.007, n - 1)); }
    function gravity() {
      let g = baseGravity(level);
      if (evOn('essorage')) g *= 0.6;
      else if (evOn('mousse')) g = Math.min(1.1, g * 2.6);
      return g;
    }
    // délai de pose ; en apesanteur (Espace, Au-delà) les pièces flottent 50 % plus longtemps avant de se poser
    function lockDelay() { const d = level < 20 ? 0.5 : Math.max(0.28, 0.5 - (level - 19) * 0.02); return FLOAT_W(WI) ? d * 1.5 : d; }

    function collide(x, y, r, t) {
      const cells = ROT[t || cur.t][r];
      for (let i = 0; i < cells.length; i++) {
        const bx = x + cells[i][0], by = y + cells[i][1];
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && board[by][bx]) return true;
      }
      return false;
    }
    function grounded() { return cur && collide(cur.x, cur.y + 1, cur.r); }
    function dropDist() { let d = 0; if (!cur) return 0; while (!collide(cur.x, cur.y + d + 1, cur.r)) d++; return d; }

    function spawn(t, sp) {
      const n = SHAPES[t].m.length;
      cur = { t, r: 0, x: Math.floor((COLS - n) / 2), y: 0, head: null, gold: -1, air: -1, vv: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 4)), born: time };
      if (sp) { cur.head = sp.head || null; cur.gold = sp.gold == null ? -1 : sp.gold; cur.air = sp.air == null ? -1 : sp.air; if (sp.vv) cur.vv = sp.vv; }
      else if (t !== 'B') {
        const nc = ROT[t][0].length;
        if (heads.length) {
          piecesSinceSpecial++;
          if (piecesSinceSpecial > 4 && rTile() < 0.09) { piecesSinceSpecial = 0; cur.head = { k: Math.floor(rTile() * nc), idx: Math.floor(rTile() * heads.length) }; }
        }
        if (!cur.head && level >= 3 && rTile() < 0.05) cur.gold = Math.floor(rTile() * nc);
        // Océan / Au-delà : une bulle d'air prise dans un bloc (tirage à part : la graine reste la même pour tous)
        const ra = rAir(), rk = rAir();
        if (AIR_W(WI) && !cur.head && cur.gold < 0 && ra < 0.2) cur.air = Math.floor(rk * nc);
      } else if (!bonusSeen[WI]) {
        bonusSeen[WI] = true;
        const B = EMPILO_WORLDS[WI].bonus;
        addPop(B.name.toUpperCase() + ' !', B.text.toUpperCase(), WPAL[WI][1].a, 2.4);
      }
      lastAct = ''; lastKick = 0;
      if (collide(cur.x, cur.y, cur.r)) { endGame(); return false; }
      if (!collide(cur.x, cur.y + 1, cur.r)) cur.y++;
      fallT = 0; lockT = 0; lockResets = 0; lowestY = cur.y;
      if (gest) gest.done = true;      // le geste en cours ne touche pas la nouvelle pièce
      return true;
    }
    function spawnNext() { fillQ(); const t = nextQ.shift(); fillQ(); return spawn(t); }

    function moveReset() {
      if ((lockT > 0 || grounded()) && lockResets < MAX_RESETS) { lockT = 0; lockResets++; }
    }
    function tryMove(dx) {
      if (!cur || collide(cur.x + dx, cur.y, cur.r)) return false;
      cur.x += dx;
      lastAct = 'move';
      moveReset();
      SFX.move();
      return true;
    }
    function stepDown(soft) {
      if (!cur || collide(cur.x, cur.y + 1, cur.r)) return false;
      cur.y++;
      lastAct = 'down';
      if (soft) score += 1;
      if (cur.y > lowestY) { lowestY = cur.y; lockResets = 0; lockT = 0; }
      return true;
    }
    function rotate(dir) {
      if (!cur) return;
      const from = cur.r, nr = (cur.r + dir + 4) % 4;
      if (cur.t === 'O' || cur.t === 'B') { SFX.rot(); return; }
      const tbl = (cur.t === 'I' ? K_I : K_JLSTZ)[from + '>' + nr];
      for (let i = 0; i < tbl.length; i++) {
        const kx = tbl[i][0], ky = -tbl[i][1];
        if (!collide(cur.x + kx, cur.y + ky, nr)) {
          cur.x += kx; cur.y += ky; cur.r = nr;
          lastAct = 'rot'; lastKick = i;
          moveReset();
          if (cur.y > lowestY) { lowestY = cur.y; lockResets = 0; }
          SFX.rot();
          return;
        }
      }
      SFX.rotFail();
    }
    function hardDrop() {
      if (!cur) return;
      const d = dropDist();
      const cells = ROT[cur.t][cur.r];
      const cols = {};
      for (const [cx, cy] of cells) {
        const bx = cur.x + cx, top = cur.y + cy, bot = cur.y + cy + d;
        if (!cols[bx]) cols[bx] = [top, bot];
        else { cols[bx][0] = Math.min(cols[bx][0], top); cols[bx][1] = Math.max(cols[bx][1], bot); }
      }
      trails.push({ cols, color: SHAPES[cur.t].c, t: 0 });
      if (d > 0) lastAct = 'drop';
      cur.y += d;
      score += 2 * d;
      kickV = Math.min(9, 2.5 + d * 0.35) * 30;
      // poussière à l'impact (terre, sable, flocons, poussière d'étoiles…)
      for (const [cx, cy] of cells) {
        if (cells.some(q => q[0] === cx && q[1] === cy + 1)) continue;
        const by = cur.y + cy;
        const px = gx + (cur.x + cx) * c + c / 2, py = gy + (by - HID + 1) * c;
        for (let k = 0; k < 2; k++) addSpark(px + (Math.random() - 0.5) * c, py, (Math.random() - 0.5) * c * 5, -c * (1 + Math.random() * 2.5), SHAPES[cur.t].c, 0.35);
        if (WI === 0 && Math.random() < 0.6) addW('leaf', px, py, (Math.random() - 0.5) * c * 4, -c * (2 + Math.random() * 3), c * 0.22, 0.9);
        else if (WI === 1 && Math.random() < 0.7) addW('bub', px, py, (Math.random() - 0.5) * c, -c * 2, c * (0.08 + Math.random() * 0.1), 1.0);
        else if (WI === 2 && Math.random() < 0.5) addW('puff', px, py, (Math.random() - 0.5) * c * 2, -c * 0.6, c * 0.3, 0.6);
        else if (WI >= 3 && Math.random() < 0.7) addW('dust', px, py, (Math.random() - 0.5) * c * 3, -c * (1 + Math.random() * 2), c * 0.1, 0.8);
      }
      SFX.hard();
      lockPiece(true);
    }
    function holdPiece() {
      if (!cur || holdUsed) { if (holdUsed) SFX.holdNo(); return; }
      const t = cur.t, ts = { head: cur.head, gold: cur.gold, air: cur.air, vv: cur.vv };
      SFX.hold();
      holdPress = 1;
      if (hold) { const h = hold, hs = holdSp; hold = t; holdSp = ts; spawn(h, hs); }
      else { hold = t; holdSp = ts; spawnNext(); }
      holdUsed = true;
    }

    function addMult(why) {
      mult = Math.min(4, mult + 1);
      multT = 20;
      later(0.3, () => addPop('SCORE ×' + mult, (why || GOLD_NAME[WI]) + ' ! 20 SECONDES', GOLD, 1.6, true));
      [784, 988, 1175, 1568].forEach((f, i) => later(0.15 + i * 0.06, () => tone(f, 0.08, 'triangle', 0.045)));
    }
    function clearCell(x, y) { board[y][x] = null; headBoard[y][x] = -1; goldBoard[y][x] = 0; airBoard[y][x] = 0; }

    // pièce bonus du monde : coccinelle (croque 3×3), grosse bulle (3×3), éclair (toute sa colonne), comète (cratère), étoile (3×3 + score ×2)
    function bonusPiece() {
      const bx = cur.x, by = cur.y, w = WI;
      cur = null; holdUsed = false;
      const cells = [];
      if (w === 2) { for (let y = by; y < ROWS; y++) cells.push([bx, y]); }
      else if (w === 3) { for (let y = by; y <= by + 2; y++) { const r2 = y === by + 1 ? 2 : 1; for (let x = bx - r2; x <= bx + r2; x++) cells.push([x, y]); } }
      else for (let y = by; y <= by + 2; y++) for (let x = bx - 1; x <= bx + 1; x++) cells.push([x, y]);
      let n = 0, freed = -1, gold = 0, air = 0;
      for (const [x, y] of cells) {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS || !board[y][x]) continue;
        n++;
        const col = goldBoard[y][x] ? GOLD : board[y][x] === 'G' ? GARB[WI] : SHAPES[board[y][x]].c;
        if (headBoard[y][x] >= 0 && heads[headBoard[y][x]]) freed = headBoard[y][x];
        if (goldBoard[y][x]) gold++;
        if (airBoard[y][x]) air++;
        const v = varBoard[y][x], kind = board[y][x] === 'G' ? 'g' : '';
        clearCell(x, y);
        if (y >= HID) shatterCell(x, y, col, 1, v, kind);
      }
      const X = gx + bx * c + c / 2, Y = gy + (by - HID + 0.5) * c;
      const pts = (60 + 40 * n) * level * mult + air * 150 * level * mult;
      score += pts; scorePulse = 1;
      const A = WPAL[w][1].a;
      addFloater('+' + fmt(pts), X, Y - c * 0.5, '#ffffff');
      const SH = [['CROC !', 'LA COCCINELLE CROQUE '], ['PLOP !', 'LA BULLE DISSOUT '], ['ZAP !', "L'ÉCLAIR FOUDROIE "], ['BOUM !', 'LA COMÈTE PULVÉRISE '], ['MAGIE !', "L'ÉTOILE FAIT FONDRE "]][w];
      addPop(SH[0], n ? SH[1] + n + ' BLOC' + (n > 1 ? 'S' : '') : 'RIEN À CROQUER… LA PROCHAINE FOIS !', A, 1.4);
      if (w === 2) {
        beams.push({ x: X, col: '#fff27a', t: 0, max: 0.45, tier: 2, v: true, y0: gy, y1: gy + gridH });
        flash = 0.35; flashCol = '#fff6c0';
        noise(0.5, 0.22, 4800); tone(90, 0.5, 'sawtooth', 0.07, 40);
        for (let i = 0; i < 14; i++) addSpark(X, Y + Math.random() * (gy + gridH - Y), (Math.random() - 0.5) * c * 10, (Math.random() - 0.5) * c * 8, '#fff27a', 0.5);
      } else {
        rings.push({ x: X, y: Y + c * 0.5, r: c * 0.5, v: c * 9, t: 0, max: 0.45, col: A, w: 3, sy: 1 });
        noise(0.6, 0.16, w === 3 ? 900 : 3200);
        if (w === 3) tone(70, 0.5, 'sine', 0.12, 30);
        for (let i = 0; i < 6; i++) later(i * 0.05, () => tone(900 + Math.random() * 900, 0.04, 'sine', 0.03));
      }
      burstW(w, X, Y + c, 14, 1.1);
      shake(0.2, w === 3 ? 6 : 4);
      if (freed >= 0) { score += 200 * level * mult; celebrate("Merci de m'avoir libéré !", heads[freed].name); }
      if (gold) addMult();
      if (w === 4) addMult('ÉTOILE MAGIQUE');
      mascotSay(1, [['Croc !', 'Miam !', 'Bravo la coccinelle !'], ['Plop !', 'Pschhh !', 'Tout fondu !'], ['Zap !', 'Quel éclair !', 'Foudroyé !'], ['Boum !', 'Quel cratère !', 'Waouh !'], ['Magique !', 'Quelle étoile !', 'Waouh !']][w]);
      spawnNext();
    }

    // T-spin : règle des 3 coins (mini si un seul coin « avant » est pris, sauf rotation par le 5e décalage)
    function detectSpin() {
      if (!cur || cur.t !== 'T' || lastAct !== 'rot') return 0;
      const occ = (x, y) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && !!board[y][x]);
      const x = cur.x, y = cur.y;
      const TL = occ(x, y), TR = occ(x + 2, y), BL = occ(x, y + 2), BR = occ(x + 2, y + 2);
      const n = TL + TR + BL + BR;
      if (n < 3) return 0;
      const front = [[TL, TR], [TR, BR], [BL, BR], [TL, BL]][cur.r];
      if ((front[0] && front[1]) || lastKick === 4) return 2;
      return 1;
    }

    function lockPiece(fromHard) {
      if (!cur) return;
      if (cur.t === 'B') { bonusPiece(); return; }
      const spin = detectSpin();
      const cells = ROT[cur.t][cur.r];
      let above = true;
      const lf = [];
      for (let k = 0; k < cells.length; k++) {
        const bx = cur.x + cells[k][0], by = cur.y + cells[k][1];
        if (by >= 0) {
          board[by][bx] = cur.t;
          headBoard[by][bx] = cur.head && cur.head.k === k ? cur.head.idx : -1;
          goldBoard[by][bx] = cur.gold === k ? 1 : 0;
          airBoard[by][bx] = cur.air === k ? 1 : 0;
          varBoard[by][bx] = cur.vv[k] | 0;
        }
        if (by >= HID) above = false;
        lf.push([bx, by]);
      }
      lockFlash.push({ cells: lf, t: 0 });
      if (!fromHard) SFX.lock();
      const lockedT = cur.t, lockedX = cur.x, lockedY = cur.y;
      cur = null;
      holdUsed = false;
      const full = [];
      for (let y = 0; y < ROWS; y++) if (board[y].every(v => v)) full.push(y);
      if (full.length || spin) resolveClear(full, spin, lockedT, lockedX, lockedY);
      if (!full.length) {
        combo = -1;
        if (above) endGame();
        else if (state === 'play') spawnNext();
      }
    }

    // points, textes et effets d'une pose qui casse des lignes (ou d'un T-spin sans ligne)
    function resolveClear(rows, spin, pt, px, py) {
      const n = rows.length;
      const oldLevel = level;
      let base = spin === 2 ? [400, 800, 1200, 1600][n] : spin === 1 ? [100, 200, 400, 400][n] : [0, 100, 300, 500, 800][n];
      const difficult = n > 0 && (n >= 4 || spin > 0);
      let b2bOn = false;
      if (n > 0) {
        if (difficult) { b2b++; b2bOn = b2b >= 1; } else b2b = -1;
        combo++;
        maxCombo = Math.max(maxCombo, combo);
      }
      let pts = base * level;
      if (b2bOn) pts = Math.round(pts * 1.5);
      pts *= mult;
      const comboPts = n > 0 && combo >= 1 ? 50 * combo * level * mult : 0;
      let pc = false, pcPts = 0;
      if (n > 0) pc = board.every((row, y) => rows.indexOf(y) >= 0 || row.every(v => !v));
      if (pc) { pcPts = (n === 4 && b2bOn ? 3200 : [0, 800, 1200, 1800, 2000][n]) * level * mult; pcs++; }
      score += pts + comboPts + pcPts;
      if (spin) tspins++;
      if (n >= 4) quads++;
      lines += n;
      level = lvl0 + Math.floor(lines / 10);
      scorePulse = 1;
      lastClear = { n, spin, b2b: b2bOn, combo, pc, pts: pts + comboPts + pcPts };
      const tier = pc || n >= 4 || (spin === 2 && n >= 2) ? 3 : (n === 3 || (spin && n > 0)) ? 2 : n === 2 ? 1 : 0;

      // --- textes
      const Ls = [];
      if (b2bOn) Ls.push({ text: 'B2B ×' + b2b, col: GOLD, s: 0.62 });
      let main = '', sub = '', mcol = ACC;
      if (spin === 2) { main = 'T-SPIN' + (n ? ' ' + ['', 'SIMPLE', 'DOUBLE', 'TRIPLE'][n] : ''); mcol = '#d58bff'; if (!n) sub = 'BIEN TOURNÉ !'; }
      else if (spin === 1) { main = 'MINI T-SPIN' + (n ? ' ' + ['', 'SIMPLE', 'DOUBLE', 'DOUBLE'][n] : ''); mcol = '#c9a3ff'; }
      else if (n === 2) { main = 'DOUBLE'; mcol = '#7df9ff'; }
      else if (n === 3) { main = 'TRIPLE !'; mcol = '#ffd23f'; }
      else if (n >= 4) { main = 'QUADRA !'; sub = QUAD_SUB[WI]; mcol = '#ff6ec7'; }
      if (main) Ls.push({ text: main, col: mcol, s: tier >= 3 ? 1.75 : tier === 2 ? 1.35 : 1.15, main: true });
      if (sub) Ls.push({ text: sub, col: '#ffffff', s: 0.62 });
      if (pc) Ls.push({ text: 'TOUT PROPRE !', col: '#7dff6a', s: 1.0, main: true });
      if (n > 0 && combo >= 1) Ls.push({ text: 'COMBO ×' + (combo + 1), col: COL.amber, s: 0.72 + Math.min(0.5, combo * 0.06) });
      if (Ls.length) callout = { lines: Ls, t: 0, life: 1.3 + tier * 0.25, tier };
      const cyRows = n ? gy + ((rows[0] + rows[n - 1]) / 2 - HID + 0.5) * c : gy + (py - HID + 1) * c;
      if (pts + comboPts + pcPts > 0) addFloater('+' + fmt(pts + comboPts + pcPts), gx + gridW / 2, cyRows, tier >= 2 ? GOLD : '#ffffff', tier >= 2);

      // --- sons
      if (spin) SFX.tspin();
      if (n > 0) SFX.clear(n, tier, combo);
      if (n > 0 && combo >= 1) SFX.combo(combo);
      if (b2bOn) SFX.b2b();
      if (pc) { SFX.pc(); celebrate('Tout propre, incroyable !'); }

      if (!n) {
        // T-spin sans ligne : petit éclat violet autour du T
        rings.push({ x: gx + (px + 1.5) * c, y: gy + (py - HID + 1.5) * c, r: c, v: c * 8, t: 0, max: 0.4, col: '#d58bff', w: 3, sy: 1 });
        shake(0.12, 2);
        return;
      }

      // --- têtes libérées, blocs dorés, bulles d'air, intrus chassé
      let freed = -1, gold = 0, air = 0;
      for (const y of rows) for (let x = 0; x < COLS; x++) {
        const hi = headBoard[y][x];
        if (hi >= 0 && heads[hi]) {
          freed = hi;
          const fb = 200 * level * mult;
          score += fb;
          addPop('+' + fmt(fb), 'COPAIN LIBÉRÉ !', COL.leaf, 1.4, true);
        }
        if (goldBoard[y][x]) gold++;
        if (airBoard[y][x] && y >= HID) {
          air++;
          addW('air', gx + x * c + c / 2, gy + (y - HID + 0.5) * c, (Math.random() - 0.5) * c, -c * 3, c * 0.7, 1.5);
        }
      }
      if (air) {
        const ab = 150 * air * level * mult;
        score += ab; airs += air;
        later(0.25, () => addFloater('+' + fmt(ab) + (air > 1 ? ' BULLES !' : ' BULLE !'), gx + gridW / 2, cyRows - c * 1.2, '#c8fbff', true));
        for (let i = 0; i < air; i++) later(0.1 + i * 0.12, () => { tone(600 + i * 200, 0.08, 'sine', 0.05, 1400 + i * 200); });
      }
      if (gold) addMult();
      const chased = n >= 2 && sab && sab.phase === 'on';
      if (tier >= 3) mascotSay(2, ['WAOUH !', 'GÉANT !', 'INCROYABLE !']);
      else mascotSay(1, ['Joli !', 'Propre !', 'Bien vu !', 'Yes !', 'Super !', 'Bravo !']);
      const newW = worldOf(level), worldChange = level > oldLevel && (newW.w !== WI || newW.tour !== TOUR);
      if (level > oldLevel && !worldChange) {
        celebrate(LVL_TXT[Math.floor(Math.random() * LVL_TXT.length)].replace('{n}', level));
        later(0.8, () => { pickMascot(); mascotSay(4, ['Salut !', 'Coucou !', 'À moi !', 'Me voilà !']); });
      } else if (worldChange) {
        const T = ARRIVE_TXT[newW.w]; celebrate(T[Math.floor(Math.random() * T.length)]);
      } else if (n >= 4) celebrate(QUAD_TXT[Math.floor(Math.random() * QUAD_TXT.length)]);
      else if (freed >= 0) celebrate("Merci de m'avoir libéré !", heads[freed].name);
      if (chased) chaseSab();

      // --- effets
      clearing = { rows: rows.slice(), t: 0, dur: tier >= 3 ? 0.5 : tier === 2 ? 0.38 : 0.3, ex: false, tier, n, cy: cyRows };
      for (const y of rows) if (y >= HID) beams.push({ y: gy + (y - HID + 0.5) * c, t: 0, max: 0.42 + tier * 0.08, col: mcol, tier });
      shake(0.18 + tier * 0.08, [2, 3, 5, 9][tier]);
      punch = [0.25, 0.4, 0.6, 1][tier];
      if (tier >= 3) { flash = 0.55; flashCol = mcol; slowT = 0.55; }
      else if (tier === 2) flash = 0.22;
      if (level > oldLevel) levelUp(oldLevel);
    }

    // les blocs d'une ligne éclatent : 4 quartiers dans la matière du monde + éclats lumineux + particules du monde
    function shatterCell(x, y, col, power, v, kind) {
      const cx = gx + x * c + c / 2, cy = gy + (y - HID) * c + c / 2;
      const spread = (x - 4.5) / 4.5;
      const img = tileImg(col, c * dpr, WI, v, kind);
      for (let q = 0; q < 4; q++) {
        const qx = q % 2, qy = q >> 1;
        const ox = (qx - 0.5) * c * 0.5, oy = (qy - 0.5) * c * 0.5;
        addShard(cx + ox, cy + oy,
          (qx - 0.5) * c * (4 + Math.random() * 5) * power + spread * c * 4 * power + (Math.random() - 0.5) * c * 3,
          -c * (3 + Math.random() * 7) * power + (qy - 0.5) * c * 2,
          col, c * 0.5, 0.9 + Math.random() * 0.6, img, qx, qy);
      }
      if (sparks.length < 90) addSpark(cx, cy, (Math.random() - 0.5) * c * 12 * power, -c * (2 + Math.random() * 9) * power, col, 0.5 + Math.random() * 0.4);
      if (Math.random() < 0.55) burstW(WI, cx, cy, 1, power);
    }
    function addShard(x, y, vx, vy, col, s, max, img, qx, qy) {
      if (shards.length >= 240) shards.splice(0, shards.length - 239);
      shards.push({ x, y, vx, vy, r: 0, vr: (Math.random() - 0.5) * 16, s, col, life: 0, max, img, qx: qx || 0, qy: qy || 0, b: 1, w: WI });
    }
    function addSpark(x, y, vx, vy, col, max) {
      if (sparks.length >= 110) sparks.shift();
      const q = hexRgb(col);
      sparks.push({ x, y, vx, vy, col: 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',', life: 0, max, w: WI });
    }
    // particules propres au monde : pétales, feuilles, papillons / bulles, gouttes, poissons / plumes, nuages, oiseaux /
    // poussière d'étoiles, scintillements / confettis arc-en-ciel
    function addW(k, x, y, vx, vy, s, max, col) {
      if (wfx.length >= 150) wfx.shift();
      wfx.push({ k, x, y, vx, vy, s, max, life: 0, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, ph: Math.random() * TAU, col: col || '' });
    }
    const PETALS = ['#ffffff', '#ffd6ec', '#ff9ad5', '#ffe680', '#ffffff'];
    function burstW(w, x, y, n, p) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, sp = c * (3 + Math.random() * 7) * p;
        const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
        if (w === 0) addW(Math.random() < 0.7 ? 'petal' : 'leaf', x, y, vx, vy, c * (0.14 + Math.random() * 0.1), 1.4 + Math.random() * 0.6, PETALS[i % PETALS.length]);
        else if (w === 1) addW(Math.random() < 0.75 ? 'bub' : 'drop', x, y, vx * 0.5, vy * 0.6, c * (0.06 + Math.random() * 0.12), 1.2 + Math.random() * 0.8);
        else if (w === 2) { if (Math.random() < 0.75) addW('feather', x, y, vx * 0.6, vy * 0.6, c * (0.2 + Math.random() * 0.14), 1.6 + Math.random() * 0.8); else addW('puff', x, y, vx * 0.5, vy * 0.5, c * (0.14 + Math.random() * 0.08), 0.8 + Math.random() * 0.3); }
        else if (w === 3) addW(Math.random() < 0.7 ? 'dust' : 'star', x, y, vx * 0.6, vy * 0.6, c * (0.08 + Math.random() * 0.1), 1.3 + Math.random() * 0.8, ['#ffffff', '#b48cff', '#5ef0ff', '#ffd36a'][i % 4]);
        else addW(Math.random() < 0.7 ? 'conf' : 'star', x, y, vx * 0.8, vy * 0.8, c * (0.12 + Math.random() * 0.08), 1.6 + Math.random() * 0.6, IRIS[i % 6]);
      }
    }
    function addFloater(text, x, y, col, big) { floaters.push({ text, x, y, col, t: 0, life: 0.95, big: !!big }); if (floaters.length > 4) floaters.shift(); }
    function addPop(text, sub, color, life, lane) { pops.push({ text, sub, color, t: 0, life: life || 1.4, lvl: !!lane }); if (pops.length > 8) pops.shift(); }
    function shake(t, m) { if (m >= shakeMag * Math.max(0, shakeT / 0.3)) { shakeT = t; shakeMag = m; } }

    function explodeRows() {
      const cl = clearing;
      cl.ex = true;
      const power = [0.8, 0.95, 1.1, 1.35][cl.tier];
      for (const y of cl.rows) {
        if (y < HID) continue;
        for (let x = 0; x < COLS; x++) {
          const t = board[y][x];
          if (!t) continue;
          shatterCell(x, y, goldBoard[y][x] ? GOLD : t === 'G' ? GARB[WI] : SHAPES[t].c, power, varBoard[y][x], t === 'G' ? 'g' : '');
        }
      }
      const cx = gx + gridW / 2;
      rings.push({ x: cx, y: cl.cy, r: c * 0.6, v: c * (12 + cl.tier * 5), t: 0, max: 0.5 + cl.tier * 0.1, col: ACC, w: 3 + cl.tier, sy: 0.55 });
      if (cl.tier >= 2) rings.push({ x: cx, y: cl.cy, r: c * 0.3, v: c * (8 + cl.tier * 3), t: -0.06, max: 0.55, col: '#ffffff', w: 2, sy: 0.9 });
      if (cl.tier >= 3) {
        const K = palTo.k;
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * TAU, sp = c * (8 + Math.random() * 14);
          addSpark(cx, cl.cy, Math.cos(a) * sp, Math.sin(a) * sp - c * 3, K[i % 3], 0.7 + Math.random() * 0.5);
        }
      }
      // les grosses casses libèrent les habitants du monde : papillons, poissons, oiseaux, étoiles, arc-en-ciel
      const nb = cl.n >= 4 ? 4 : cl.n >= 2 ? 2 : cl.tier >= 2 ? 1 : 0;
      for (let i = 0; i < nb; i++) {
        const sx = gx + gridW * (0.2 + Math.random() * 0.6), dir = Math.random() < 0.5 ? -1 : 1;
        if (WI === 0) addW('fly', sx, cl.cy, dir * c * (2 + Math.random() * 3), -c * (4 + Math.random() * 3), c * (0.45 + Math.random() * 0.2), 2.6, ['#ffb13a', '#ffe25a', '#7fc8ff', '#ff8fc4'][i % 4]);
        else if (WI === 1) addW('fish', sx, cl.cy, dir * c * (9 + Math.random() * 5), -c * (1 + Math.random() * 2), c * 0.9, 2.2, String(i % 4));
        else if (WI === 2) addW('bird', sx, cl.cy, dir * c * (5 + Math.random() * 3), -c * (6 + Math.random() * 3), c * 0.5, 2.4);
        else if (WI === 3) addW('comet', sx, cl.cy, dir * c * (10 + Math.random() * 6), -c * (6 + Math.random() * 6), c * 0.3, 1.6);
        else addW('rainbow', cx, cl.cy, 0, 0, c * (2 + i), 1.2);
      }
    }

    function finishClear() {
      const rows = clearing.rows.slice().sort((a, b) => a - b);
      // décalage visuel des lignes qui tombent (elles partent de leur ancienne place et rebondissent)
      const moved = [];
      for (let y = 0; y < ROWS; y++) {
        if (rows.indexOf(y) >= 0) continue;
        let k = 0;
        for (const ry of rows) if (ry > y) k++;
        moved.push([y + k, k]);
      }
      for (const y of rows) {
        board.splice(y, 1); board.unshift(newRow(null));
        headBoard.splice(y, 1); headBoard.unshift(newRow(-1));
        goldBoard.splice(y, 1); goldBoard.unshift(newRow(0));
        airBoard.splice(y, 1); airBoard.unshift(newRow(0));
        varBoard.splice(y, 1); varBoard.unshift(newRow(0));
      }
      for (let y = 0; y < ROWS; y++) rowOff[y] = null;
      for (const [ny, k] of moved) if (k > 0 && board[ny].some(v => v)) rowOff[ny] = { p: k, v: 0 };
      clearing = null;
      if (state !== 'play') return;
      if (tripPend) startTrip(tripPend);
      else spawnNext();
    }

    // ---------- Niveaux et voyage ----------
    function levelUp(oldLevel) {
      const nw = worldOf(level);
      if (nw.w !== WI || nw.tour !== TOUR) {
        // nouveau monde : le voyage (caméra + carte) démarre dès que la casse est finie
        tripPend = { from: WI, to: nw.w, tour: nw.tour, old: oldLevel };
        return;
      }
      // même monde : le décor évolue (lumière, éléments), bannière juste après les textes de la casse
      stFrom = stNow; stTo = nw.stage; stT = 0;
      palFrom = currentPal(); palTo = palFor(level); palK = 0; transT = 0;
      levelFlash = 1;
      later(0.75, () => {
        if (destroyed) return;
        const speed = baseGravity(oldLevel) / baseGravity(level);
        banner = { text: 'NIVEAU ' + level, sub: palTo.n + (speed > 1.05 ? '  ·  VITESSE ×' + speed.toFixed(1).replace('.', ',') : ''), t: 0, life: 1.6 };
        SFX.level();
        for (let i = 0; i < 30; i++) {
          const side = i % 2 ? 1 : -1;
          addSpark(side < 0 ? gx : gx + gridW, gy + gridH * (0.3 + Math.random() * 0.4), -side * c * (4 + Math.random() * 12), -c * (2 + Math.random() * 10), palTo.k[i % 3], 0.9 + Math.random() * 0.5);
        }
      });
      const news = newsFor(level), nw0 = WI;
      // (pas d'annonce d'un monde qu'on vient de quitter)
      if (news) later(2.6, () => { if (trip || tripPend || WI !== nw0) return; addPop('NOUVEAU : ' + news[0], news[1], COL.volt, 2.2, true); tone(988, 0.08, 'square', 0.04); later(0.1, () => tone(1319, 0.12, 'square', 0.04)); });
      planLevel(news ? 5 : 3.5);
      if (nw.stage === 2) later(1.3, prefetchNext);      // le décor du monde suivant se prépare au calme
    }
    function planLevel(sabDelay) {
      const sabLvl = level >= 16 || (level % 2 === 0 && (heads.length || level >= 4));
      if (sabLvl && !sab) sabPending = sabDelay;
      if (!ev && evNext < 0 && Object.keys(EVDEF).some(k => level >= EVDEF[k].from)) evNext = 14;
    }
    function currentPal() {
      if (palK >= 1) return palTo;
      return { n: palTo.n, a: mixHex(palFrom.a, palTo.a, palK), b1: mixHex(palFrom.b1, palTo.b1, palK), b2: mixHex(palFrom.b2, palTo.b2, palK),
        k: palTo.k.map((h, i) => mixHex(palFrom.k[i], h, palK)), s: mixHex(palFrom.s, palTo.s, palK), w: palTo.w };
    }
    // Voyage d'un monde au suivant : plongeon (Océan), remontée (Ciel), décollage (Espace), hyperespace (Au-delà),
    // retour à la Plaine pour le tour suivant. La caméra voyage (2,3 s), la carte du voyage montre le chemin parcouru.
    const TRIP_KIND = ['return', 'dive', 'rise', 'launch', 'warp'];
    const TRIP_DUR = 3.4, TRIP_CAM = 2.3;
    function startTrip(p) {
      tripPend = null;
      trip = { from: p.from, to: p.to, tour: p.tour, kind: TRIP_KIND[p.to], t: 0, stA: stNow, sf: sceneFor(p.from), sto: sceneFor(p.to), lv: level };
      WI = p.to; TOUR = p.tour;
      stNow = stFrom = stTo = 0; stT = 9;
      palFrom = currentPal(); palTo = palFor(level); palK = 0; transT = 0;
      if (ev) endEvent(true);
      if (sab && (sab.phase === 'on' || sab.phase === 'in')) { sab.phase = 'bye'; sab.t = 0; sabSay(sab.idx < 0 ? SAB_W[sab.w].bye : 'Bon voyage !'); }
      sabPending = -1;
      SFX.trip(trip.kind);
      later(1.85, () => SFX.arrive());
      shake(0.25, 3);
    }
    function endTrip() {
      if (!trip) return;
      if (trip.from !== trip.to) { scenes[trip.from] = null; wells[trip.from] = null; }
      trip = null;
      levelFlash = 1;
      if (state === 'play' && !cur && !clearing) { spawnNext(); SFX.go(); }
      const news = newsFor(level);
      const nw0 = WI;
      if (news) later(1.2, () => { if (trip || tripPend || WI !== nw0) return; addPop('NOUVEAU : ' + news[0], news[1], COL.volt, 2.2, true); });
      planLevel(news ? 5 : 3.5);
      later(0.4, () => { pickMascot(); mascotSay(4, ['Salut !', 'Coucou !', 'Quel voyage !', 'Me voilà !']); });
    }
    function tripSkip() { if (trip && trip.t > 0.8 && trip.t < TRIP_DUR - 0.55) { trip.t = TRIP_DUR - 0.55; SFX.tick(); } }

    function endGame() {
      if (state === 'over') return;
      state = 'over';
      overT = 0;
      cur = null; ev = null;
      clearHeld();
      pauseBtn.style.display = 'none';
      holdBtn.style.display = 'none';
      mascotSay(3, ['Oups !', 'Pas grave !', 'Presque !']);
      if (sab && sab.phase !== 'sad') sabSay(sab.idx < 0 ? SAB_W[sab.w].end : 'Oups, pardon !');
      shake(0.4, 7);
      SFX.over();
    }

    // ---------- Entrées ----------
    let kbL = false, kbR = false, kbD = false, btL = false, btR = false, btD = false;
    let dir = 0, dasT = 0, arrT = 0;
    let gest = null, gest2 = null;
    function canAct() { return state === 'play' && !paused && cur && !clearing && !trip; }
    function clearHeld() { kbL = kbR = kbD = btL = btR = btD = false; dir = 0; dasT = 0; arrT = 0; gest = null; gest2 = null; }
    function pressDir(d) { dir = d; dasT = 0; arrT = 0; if (canAct()) tryMove(d); }
    function refreshDir() {
      const l = kbL || btL, r = kbR || btR;
      if (dir < 0 && !l) { dir = r ? 1 : 0; dasT = 0; arrT = 0; }
      else if (dir > 0 && !r) { dir = l ? -1 : 0; dasT = 0; arrT = 0; }
      else if (!dir && (l || r)) dir = l ? -1 : 1;
    }
    function act(a) {
      if (!canAct()) return false;
      if (a === 'left') return tryMove(-1);
      if (a === 'right') return tryMove(1);
      if (a === 'cw') rotate(1);
      else if (a === 'ccw') rotate(-1);
      else if (a === 'hard') hardDrop();
      else if (a === 'hold') holdPiece();
      else if (a === 'softstep') { if (stepDown(true)) { fallT = 0; SFX.soft(); return true; } return false; }
      return true;
    }
    function barAction(name, down) {
      if (name === 'left') { btL = down; if (down) pressDir(-1); else refreshDir(); }
      else if (name === 'right') { btR = down; if (down) pressDir(1); else refreshDir(); }
      else if (name === 'soft') { btD = down; if (down) act('softstep'); }
      else if (down) act(name);
    }
    function togglePause() {
      if (state === 'over' || state === 'tuto' || destroyed) return;
      paused = !paused;
      clearHeld();
      for (const k in barDown) { if (barDown[k]) { barDown[k] = false; barBtns[k].style.background = 'rgba(16,10,36,0.72)'; } }
      pauseBtn.innerHTML = paused ? ICONS.play : ICONS.pause;
      tone(paused ? 440 : 660, 0.06, 'sine', 0.04);
    }
    // bouton « boutons à l'écran » (dans la pause, tactile)
    function btnToggleRect() {
      const w = Math.min(W - 40, 260), h = 44;
      return { x: W / 2 - w / 2, y: H - barH - h - 18, w, h };
    }

    function onKey(e) {
      if (destroyed) return;
      if (root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key || '';
      const kl = k.length === 1 ? k.toLowerCase() : k;
      const isArrowSpace = k.indexOf('Arrow') === 0 || k === ' ' || e.code === 'Space';
      if (isArrowSpace && state !== 'over') e.preventDefault();
      const down = e.type === 'keydown';
      if (state === 'tuto') {
        if (down && !e.repeat) {
          if (k === 'Escape') tutoNext(true);
          else if (k === 'Enter' || k === ' ' || k === 'ArrowRight' || e.code === 'Space') tutoNext(false);
        }
        return;
      }
      if (down) {
        if (kl === 'p' || k === 'Escape') { if (!e.repeat) togglePause(); return; }
        if (paused || e.repeat) return;
        if (trip) { if (k === ' ' || e.code === 'Space' || k === 'Enter' || k === 'ArrowDown') tripSkip(); return; }
        if (k === 'ArrowLeft') { kbL = true; pressDir(-1); }
        else if (k === 'ArrowRight') { kbR = true; pressDir(1); }
        else if (k === 'ArrowDown') { kbD = true; act('softstep'); }
        else if (k === 'ArrowUp' || kl === 'x') act('cw');
        else if (kl === 'z' || e.code === 'KeyZ' || kl === 'w') act('ccw');
        else if (k === ' ' || e.code === 'Space') act('hard');
        else if (kl === 'c' || k === 'Shift') act('hold');
      } else {
        if (k === 'ArrowLeft') { kbL = false; refreshDir(); }
        else if (k === 'ArrowRight') { kbR = false; refreshDir(); }
        else if (k === 'ArrowDown') kbD = false;
      }
    }
    on(window, 'keydown', onKey);
    on(window, 'keyup', onKey);
    on(window, 'blur', () => { clearHeld(); });

    // ---- gestes tactiles (sur tout l'écran) ----
    // glisser horizontal = la pièce suit le doigt case par case ; toucher bref = tourner ;
    // glisser vers le bas = descente qui suit le doigt ; geste vif vers le bas = chute ; geste vif vers le haut = réserve.
    // Un geste choisit UN axe au départ et ne fait jamais autre chose.
    function stepPx() { return clamp(c * 0.9, 16, 40); }
    function localXY(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function onPDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (state === 'tuto') {
        const [x, y] = localXY(e);
        const sk = tutoSkipRect();
        tutoNext(x >= sk.x && x <= sk.x + sk.w && y >= sk.y && y <= sk.y + sk.h);
        return;
      }
      if (paused) {
        if (touchUI) {
          const [x, y] = localXY(e), b = btnToggleRect();
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            showBtns = !showBtns; setPref(BTN_KEY, showBtns ? '1' : '0'); layout(); SFX.tick(); return;
          }
        }
        togglePause(); return;
      }
      if (state !== 'play' && state !== 'ready') return;
      if (trip) { tripSkip(); return; }
      const n = performance.now();
      if (gest && gest.id !== e.pointerId) { gest2 = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: n, maxD: 0 }; return; }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      gest = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: n, rx: e.clientX, ry: e.clientY, mode: '', maxD: 0, done: false, hist: [[n, e.clientX, e.clientY]] };
    }
    function onPMove(e) {
      if (gest2 && e.pointerId === gest2.id) { gest2.maxD = Math.max(gest2.maxD, Math.hypot(e.clientX - gest2.x0, e.clientY - gest2.y0)); return; }
      if (!gest || e.pointerId !== gest.id || gest.done) return;
      e.preventDefault();
      const n = performance.now();
      const x = e.clientX, y = e.clientY;
      const dx = x - gest.x0, dy = y - gest.y0;
      gest.maxD = Math.max(gest.maxD, Math.hypot(dx, dy));
      gest.hist.push([n, x, y]);
      while (gest.hist.length > 2 && n - gest.hist[0][0] > 90) gest.hist.shift();
      const S = stepPx();
      if (!gest.mode) {
        if (Math.abs(dx) >= 10 && Math.abs(dx) >= Math.abs(dy)) { gest.mode = 'h'; gest.rx = gest.x0 - Math.sign(dx) * S * 0.45; }
        else if (dy >= 12 && dy > Math.abs(dx) * 1.2) { gest.mode = 'v'; gest.ry = gest.y0 - S * 0.4; }
        else if (dy <= -14 && -dy > Math.abs(dx) * 1.2) gest.mode = 'u';
        else return;
      }
      if (gest.mode === 'h') {
        if (!canAct()) { gest.rx = x; return; }
        while (x - gest.rx >= S) { act('right'); gest.rx += S; }
        while (x - gest.rx <= -S) { act('left'); gest.rx -= S; }
      } else if (gest.mode === 'v') {
        if (!canAct()) { gest.ry = y; return; }
        const h0 = gest.hist[0];
        const v = (y - h0[2]) / Math.max(1, n - h0[0]);
        if (n - gest.t0 < 240 && dy > 46 && v > 1.5 && Math.abs(dx) < dy * 0.6) { act('hard'); gest.done = true; return; }
        const SV = S * 0.85;
        while (y - gest.ry >= SV) { act('softstep'); gest.ry += SV; if (!gest || gest.done) return; }
        if (y - gest.ry < -SV) gest.ry = y - SV * 0.2;
      }
    }
    function onPUp(e) {
      if (gest2 && e.pointerId === gest2.id) {
        const g2 = gest2; gest2 = null;
        if (e.type !== 'pointercancel' && g2.maxD < 14 && performance.now() - g2.t0 < 320) act('cw');
        return;
      }
      if (!gest || e.pointerId !== gest.id) return;
      const g = gest; gest = null;
      if (g.done || e.type === 'pointercancel') return;
      const n = performance.now();
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0, dt = n - g.t0;
      if (!g.mode && g.maxD < 12 && dt < 320) act('cw');
      else if (g.mode === 'v' && dt < 300 && dy > 42 && dy / dt > 0.55 && Math.abs(dx) < dy * 0.7) act('hard');
      else if (g.mode === 'u' && dt < 360 && -dy > 48 && -dy / dt > 0.35 && Math.abs(dx) < -dy * 0.7) act('hold');
    }
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); togglePause(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(holdBtn, 'pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (state === 'tuto') { tutoNext(false); return; }
      if (paused) { togglePause(); return; }
      if (trip) { tripSkip(); return; }
      holdPress = 1;
      act('hold');
    });
    on(holdBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(holdBtn, 'contextmenu', (e) => e.preventDefault());
    on(document, 'visibilitychange', () => { if (document.hidden && state !== 'over' && state !== 'tuto' && !paused) togglePause(); });

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    layout();

    // ---------- Décor du monde (parallaxe) et voyage de la caméra ----------
    function ease(k) { return k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k); }
    function tripCam() { return trip ? ease(trip.t / TRIP_CAM) : 1; }
    // ligne du voyage en px écran : surface de l'eau (plongeon : elle monte ; remontée : elle descend), haut du ciel (décollage)
    function tripLineY() {
      if (!trip) return -1;
      const k = tripCam();
      return trip.kind === 'dive' ? H * (1 - k) : (trip.kind === 'rise' || trip.kind === 'launch') ? H * k : -1;
    }
    // un point de l'écran est-il déjà dans le nouveau monde ? (sert au changement de matière des blocs et du verre)
    function newSide(y) {
      if (!trip) return true;
      const k = tripCam();
      if (trip.kind === 'dive') return y > H * (1 - k);
      if (trip.kind === 'rise' || trip.kind === 'launch') return y < H * k;
      return k >= 0.5;      // hyperespace / retour : tout bascule pendant l'éclair
    }
    function drawWorld() {
      if (!trip) { drawScene(sceneFor(WI), ctx, time, stNow, 0, 0, camX); return; }
      const k = tripCam(), A = trip.sf, B = trip.sto, kind = trip.kind;
      if (kind === 'dive' || kind === 'rise' || kind === 'launch') {
        const ly = tripLineY(), dive = kind === 'dive';
        ctx.save(); ctx.beginPath();
        if (dive) ctx.rect(0, 0, W, ly + 1); else ctx.rect(0, ly - 1, W, H - ly + 1);
        ctx.clip();
        drawScene(A, ctx, time, trip.stA, 0, dive ? ly - H : ly, camX);
        ctx.restore();
        ctx.save(); ctx.beginPath();
        if (dive) ctx.rect(0, ly, W, H - ly); else ctx.rect(0, 0, W, ly);
        ctx.clip();
        drawScene(B, ctx, time, 0, 0, dive ? ly : ly - H, camX);
        ctx.restore();
        if (kind === 'launch') {
          // l'atmosphère s'efface dans le noir de l'espace
          const g = ctx.createLinearGradient(0, ly - H * 0.22, 0, ly + H * 0.04);
          g.addColorStop(0, 'rgba(32,36,98,0)'); g.addColorStop(0.8, 'rgba(60,70,160,0.55)'); g.addColorStop(1, 'rgba(120,150,230,0.5)');
          ctx.fillStyle = g; ctx.fillRect(0, ly - H * 0.22, W, H * 0.26);
        } else {
          // surface de l'eau : reflet côté air, lumière côté eau, écume qui ondule
          const ga = ctx.createLinearGradient(0, ly - H * 0.05, 0, ly);
          ga.addColorStop(0, 'rgba(255,255,255,0)'); ga.addColorStop(1, 'rgba(225,250,255,0.45)');
          ctx.fillStyle = ga; ctx.fillRect(0, ly - H * 0.05, W, H * 0.05);
          const gw = ctx.createLinearGradient(0, ly, 0, ly + H * 0.12);
          gw.addColorStop(0, 'rgba(170,240,255,0.6)'); gw.addColorStop(1, 'rgba(120,220,255,0)');
          ctx.fillStyle = gw; ctx.fillRect(0, ly, W, H * 0.12);
          ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
          for (let L2 = 0; L2 < 2; L2++) {
            ctx.beginPath();
            for (let x = 0; x <= W + 8; x += 8) {
              const y = ly + Math.sin(x * 0.03 + time * 5 + L2 * 2) * (5 + L2 * 3) + Math.sin(x * 0.011 - time * 3) * 4 + L2 * 6;
              if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
            }
            ctx.globalAlpha = L2 ? 0.45 : 1; ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      } else {
        // hyperespace / retour : l'ancien monde, l'éclair, puis le nouveau qui arrive en zoomant
        if (k < 0.5) {
          const z = 1 + k * 0.5;
          ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.45);
          drawScene(A, ctx, time, trip.stA, 0, 0, camX);
          ctx.restore();
        } else {
          const z = 1 + (1 - (k - 0.5) * 2) * 0.4;
          ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.45);
          drawScene(B, ctx, time, 0, 0, 0, camX);
          ctx.restore();
        }
      }
    }
    // effets du voyage par-dessus tout le jeu (gouttes, bulles, traînées d'étoiles, éclair, anneaux arc-en-ciel)
    function tripFxSpawn(dt) {
      if (!trip || tfx.length > 90) return;
      const k = tripCam(), kind = trip.kind, ly = tripLineY();
      if (kind === 'dive') {
        if (trip.t < 0.35) for (let i = 0; i < 4; i++) tfx.push({ k: 'drop', x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 120, vy: -(380 + Math.random() * 520), s: 2 + Math.random() * 4, life: 0, max: 1.1 });
        if (k > 0.2 && k < 0.95 && Math.random() < dt * 40) tfx.push({ k: 'bub', x: Math.random() * W, y: H + 10, vx: 0, vy: -(160 + Math.random() * 260), s: 3 + Math.random() * 9, life: 0, max: 2.6, ph: Math.random() * TAU });
      } else if (kind === 'rise') {
        if (k > 0.04 && k < 0.6 && Math.random() < dt * 60) tfx.push({ k: 'drop', x: Math.random() * W, y: ly, vx: (Math.random() - 0.5) * 100, vy: -(200 + Math.random() * 300), s: 2 + Math.random() * 3.5, life: 0, max: 1.2 });
        if (k < 0.5 && Math.random() < dt * 25) tfx.push({ k: 'bub', x: Math.random() * W, y: H + 10, vx: 0, vy: -(300 + Math.random() * 300), s: 3 + Math.random() * 6, life: 0, max: 1.6, ph: Math.random() * TAU });
      } else if (kind === 'return' && trip.t > TRIP_CAM * 0.5 && trip.t < TRIP_CAM * 0.9 && Math.random() < dt * 30) {
        const a = Math.random() * TAU, sp = 120 + Math.random() * 260;
        tfx.push({ k: 'petal', x: W / 2, y: H * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 3 + Math.random() * 4, life: 0, max: 1.6, col: PETALS[Math.floor(Math.random() * 5)], ph: Math.random() * TAU });
      }
    }
    function drawTripFx() {
      if (tfx.length) {
        for (const p of tfx) {
          const a = 1 - p.life / p.max;
          ctx.globalAlpha = Math.min(1, a * 1.5);
          if (p.k === 'drop') { ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.6, p.s, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, TAU); ctx.fill(); }
          else if (p.k === 'bub') { ctx.strokeStyle = 'rgba(230,252,255,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x + Math.sin(p.life * 6 + p.ph) * 4, p.y, p.s, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(p.x - p.s * 0.4, p.y - p.s * 0.5, Math.max(1, p.s * 0.3), Math.max(1, p.s * 0.3)); }
          else { ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.55, p.life * 5 + p.ph, 0, TAU); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
      }
      if (!trip) return;
      const k = tripCam(), kind = trip.kind, bell = Math.sin(Math.min(1, k) * Math.PI);
      if (kind === 'launch' && bell > 0.02) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * bell) + ')'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 26; i++) {
          const x = hash(i * 3.7) * W, y = ((hash(i * 1.3) + time * (1.6 + hash(i) * 1.4)) % 1.3) * H - H * 0.15;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + H * 0.1 * bell); ctx.stroke();
        }
      } else if (kind === 'warp' || kind === 'return') {
        const cx = W / 2, cy = H * 0.45, M = Math.hypot(W, H) * 0.6;
        if (kind === 'warp') {
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          for (let i = 0; i < 48; i++) {
            const a = hash(i * 2.9) * TAU, r0 = (0.08 + hash(i * 5.3) * 0.5 + k * 0.8) * M % M, len = M * 0.25 * bell;
            ctx.strokeStyle = 'rgba(' + (i % 3 ? '220,235,255' : '255,200,255') + ',' + (0.75 * bell) + ')';
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); ctx.stroke();
          }
        } else {
          for (let i = 0; i < 6; i++) {
            const r = ((k * 1.6 + i * 0.12) % 1) * M;
            ctx.strokeStyle = rgba(IRIS[i], 0.55 * bell); ctx.lineWidth = 10 + 18 * bell;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
          }
        }
        const fl = clamp(1 - Math.abs(k - 0.5) / 0.14, 0, 1);
        if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * fl) + ')'; ctx.fillRect(0, 0, W, H); }
      }
    }

    // ---------- Mise à jour ----------
    // puis ses images sont envoyées une à une à la carte graphique (dessinées en 1 px sous le décor), pour un voyage sans à-coup
    function sceneSprites(S) { const out = []; for (const k in S.sp) { const v = S.sp[k]; if (Array.isArray(v)) out.push(...v); else if (v && v.getContext) out.push(v); } return out; }
    // le décor du monde suivant se construit en arrière-plan, par petites étapes (≈ 2 ms par image)
    function prefetchNext() { const nx = (WI + 1) % NW; if (!destroyed && !trip && !scenes[nx]) scenes[nx] = makeScene(nx, W, H, sceneQ, true); }
    if (W0.stage === 2) later(2.5, prefetchNext);
    function update(dt) {
      time += dt;
      for (let i = sfxQ.length - 1; i >= 0; i--) {
        sfxQ[i].t -= dt;
        if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); }
      }
      for (const S of scenes) if (S && S.gen) { if (buildScene(S, 2)) warmQ = sceneSprites(S); break; }
      if (paused) return;
      // le décor évolue doucement d'un niveau à l'autre ; la caméra suit un peu la pièce (parallaxe)
      if (stT < 2.2) { stT += dt; stNow = stFrom + (stTo - stFrom) * ease(stT / 2.2); }
      camXT = cur ? clamp(((cur.x + 1.5) - 5) / 5, -1, 1) : camXT * 0.99;
      camX += (camXT - camX) * Math.min(1, dt * 1.6);
      if (state === 'tuto') { tuto.t += dt; return; }
      stateT += dt;
      if (state === 'ready') {
        if (stateT >= 1.2) { state = 'play'; stateT = 0; spawnNext(); SFX.go(); }
        else if (stateT - dt < 0.6 && stateT >= 0.6) SFX.ready();
      }
      if (state === 'play') {
        if (clearing) {
          clearing.t += dt;
          if (!clearing.ex && clearing.t >= 0.07) explodeRows();
          if (clearing.t >= clearing.dur) finishClear();
        }
        if (trip) {
          trip.t += dt;
          tripFxSpawn(dt);
          if (trip.t >= TRIP_DUR) endTrip();
        }
        // répétition gauche/droite (aussi chargée pendant une casse)
        if (dir) {
          const prev = dasT;
          dasT += dt;
          if (dasT >= DAS && canAct()) {
            if (prev < DAS) arrT = ARR; else arrT += dt;
            while (arrT >= ARR) { arrT -= ARR; if (!tryMove(dir)) { arrT = 0; break; } }
          }
        }
        if (cur && !clearing && !trip) {
          const soft = kbD || btD;
          const g = gravity();
          const iv = soft ? Math.min(g, 0.03) : g;
          fallT += dt;
          while (cur && fallT >= iv) {
            fallT -= iv;
            if (!stepDown(soft)) { fallT = 0; break; }
          }
          if (cur && grounded()) {
            lockT += dt;
            if (lockT >= lockDelay()) lockPiece(false);
          }
        }
        // danger : battement de cœur
        let top = VIS;
        for (let yy = HID; yy < ROWS; yy++) if (board[yy].some(v => v)) { top = yy - HID; break; }
        if (top < 4 && !trip) { heartT -= dt; if (heartT <= 0) { heartT = 0.55 + top * 0.12; SFX.heart(); } } else heartT = 0;
      }
      if (state === 'over') {
        overT += dt;
        if (overT >= 1.0 && !overCalled) {
          overCalled = true;
          try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* */ }
        }
      }
      updateFx(dt);
      if (state === 'play' || state === 'over') { updateSab(dt); updateEvents(dt); }
    }

    // pesanteur et freinage des éclats selon le monde : normale, sous l'eau, légère, apesanteur, flottante
    const SH_G = [30, 6, 12, 0, 8], SH_D = [0.8, 2.6, 1.4, 0.3, 1.0], SP_G = [14, 3, 6, 0, 4];
    function updateFx(dt) {
      // ralenti bref sur les grosses casses
      let fdt = dt;
      if (slowT > 0) { slowT -= dt; fdt = dt * 0.32; }
      dispScore += (score - dispScore) * Math.min(1, dt * 10);
      if (Math.abs(score - dispScore) < 0.5) dispScore = score;
      scorePulse = Math.max(0, scorePulse - dt * 2.5);
      levelFlash = Math.max(0, levelFlash - dt * 1.2);
      holdPress = Math.max(0, holdPress - dt * 4);
      react.t += dt;
      if (shakeT > 0) shakeT -= dt;
      punch = Math.max(0, punch - dt * 3.2);
      flash = Math.max(0, flash - dt * 2.2);
      // ressort du coup de chute
      kickV -= kickY * 900 * dt; kickV *= Math.exp(-14 * dt); kickY += kickV * dt;
      if (Math.abs(kickY) < 0.05 && Math.abs(kickV) < 0.5) { kickY = 0; kickV = 0; }
      if (transT >= 0) {
        transT += dt;
        const dur = trip ? TRIP_CAM : 1.2;
        palK = Math.min(1, transT / dur);
        if (transT > dur + 0.4) { transT = -1; palK = 1; palFrom = palTo; }
      }
      ACC = palK >= 1 ? palTo.a : mixHex(palFrom.a, palTo.a, palK);
      // lignes qui tombent avec rebond
      for (let y = 0; y < ROWS; y++) {
        const o = rowOff[y];
        if (!o) continue;
        o.v += 150 * dt;
        o.p -= o.v * dt;
        if (o.p <= 0) {
          o.p = 0;
          if (o.v > 7) o.v = -o.v * 0.28;
          else rowOff[y] = null;
        }
      }
      const floorY = gy + gridH;
      for (let i = shards.length - 1; i >= 0; i--) {
        const p = shards[i];
        p.life += fdt;
        if (p.life >= p.max) { shards.splice(i, 1); continue; }
        const w = p.w | 0;
        p.vy += c * SH_G[w] * fdt;
        p.vx *= Math.exp(-SH_D[w] * fdt);
        if (w) p.vy *= Math.exp(-SH_D[w] * 0.7 * fdt);
        if (w === 3) p.vr *= Math.exp(-0.6 * fdt);
        p.x += p.vx * fdt; p.y += p.vy * fdt; p.r += p.vr * fdt;
        if (w !== 3 && p.b > 0 && p.y > floorY - p.s * 0.3 && p.vy > 0 && p.x > gx - c && p.x < gx + gridW + c) { p.y = floorY - p.s * 0.3; p.vy *= -0.38; p.vx *= 0.7; p.vr *= 0.6; p.b--; }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += fdt;
        if (p.life >= p.max) { sparks.splice(i, 1); continue; }
        p.vy += c * SP_G[p.w | 0] * fdt;
        p.vx *= Math.exp(-1.6 * fdt); p.vy *= Math.exp(-0.6 * fdt);
        p.x += p.vx * fdt; p.y += p.vy * fdt;
      }
      for (let i = wfx.length - 1; i >= 0; i--) {
        const p = wfx[i];
        p.life += fdt;
        if (p.life >= p.max) { wfx.splice(i, 1); continue; }
        const k = p.k, sw = Math.sin(p.life * 5 + p.ph);
        if (k === 'petal' || k === 'leaf') { p.vy += c * 5 * fdt; p.vx *= Math.exp(-1.8 * fdt); p.vy *= Math.exp(-1.4 * fdt); p.x += (p.vx + sw * c * 1.3) * fdt; p.y += p.vy * fdt; p.r += p.vr * fdt; }
        else if (k === 'fly') { p.vy = Math.max(-c * 5, p.vy - c * 2 * fdt); p.x += (p.vx + Math.sin(p.life * 3 + p.ph) * c * 2.5) * fdt; p.y += (p.vy + Math.sin(p.life * 9 + p.ph) * c * 1.2) * fdt; }
        else if (k === 'bub' || k === 'air') { p.vy -= c * (k === 'air' ? 7 : 4) * fdt; p.vx *= Math.exp(-2 * fdt); p.x += (p.vx + Math.sin(p.life * 7 + p.ph) * c * 0.9) * fdt; p.y += p.vy * fdt; }
        else if (k === 'drop') { p.vy += c * 26 * fdt; p.x += p.vx * fdt; p.y += p.vy * fdt; }
        else if (k === 'fish') { p.vy *= Math.exp(-1.5 * fdt); p.x += p.vx * fdt; p.y += (p.vy + Math.sin(p.life * 8) * c) * fdt; }
        else if (k === 'feather') { p.vy += c * 2.2 * fdt; p.vx *= Math.exp(-2 * fdt); p.vy *= Math.exp(-2.2 * fdt); p.x += (p.vx + Math.sin(p.life * 2.6 + p.ph) * c * 1.8) * fdt; p.y += p.vy * fdt; p.r = Math.sin(p.life * 2.6 + p.ph) * 0.9; }
        else if (k === 'puff') { p.s += c * 0.35 * fdt; p.vx *= Math.exp(-2 * fdt); p.vy *= Math.exp(-2 * fdt); p.x += p.vx * fdt; p.y += p.vy * fdt; }
        else if (k === 'bird') { p.vy = Math.min(-c * 2.5, p.vy + c * 1.5 * fdt); p.x += p.vx * fdt; p.y += p.vy * fdt; }
        else if (k === 'dust' || k === 'star') { p.vx *= Math.exp(-0.9 * fdt); p.vy *= Math.exp(-0.9 * fdt); p.x += p.vx * fdt; p.y += p.vy * fdt; }
        else if (k === 'comet') { p.x += p.vx * fdt; p.y += p.vy * fdt; }
        else if (k === 'conf') { p.vy += c * 4 * fdt; p.vx *= Math.exp(-1.6 * fdt); p.vy *= Math.exp(-1.2 * fdt); p.x += (p.vx + sw * c) * fdt; p.y += p.vy * fdt; p.r += p.vr * fdt; }
      }
      for (let i = tfx.length - 1; i >= 0; i--) {
        const p = tfx[i];
        p.life += dt;
        if (p.life >= p.max || p.y < -60 || p.y > H + 80) { tfx.splice(i, 1); continue; }
        if (p.k === 'drop') p.vy += 900 * dt;
        else if (p.k === 'bub') p.vy -= 80 * dt;
        else { p.vx *= Math.exp(-1.5 * dt); p.vy *= Math.exp(-1.5 * dt); }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += fdt; if (r.t > 0) r.r += r.v * fdt * Math.max(0.15, 1 - r.t / r.max); if (r.t >= r.max) rings.splice(i, 1); }
      for (let i = beams.length - 1; i >= 0; i--) { beams[i].t += fdt; if (beams[i].t >= beams[i].max) beams.splice(i, 1); }
      for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].t += dt; if (floaters[i].t >= floaters[i].life) floaters.splice(i, 1); }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t >= pops[i].life) pops.splice(i, 1); }
      for (let i = trails.length - 1; i >= 0; i--) { trails[i].t += dt; if (trails[i].t > 0.25) trails.splice(i, 1); }
      for (let i = lockFlash.length - 1; i >= 0; i--) { lockFlash[i].t += dt; if (lockFlash[i].t > 0.2) lockFlash.splice(i, 1); }
      if (callout) { callout.t += dt; if (callout.t >= callout.life) callout = null; }
      if (banner) { banner.t += dt; if (banner.t >= banner.life) banner = null; }
    }

    // ---------- Rendu ----------
    function drawTileHead(idx, X, Y, s, minH, alpha) {
      const hd = heads[idx];
      if (!hd || !imgOk(hd.img)) return;
      const cx = X + s / 2, cy = Y + s / 2;
      ctx.save();
      if (alpha != null) ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = GOLD; ctx.lineWidth = Math.max(1, s * 0.07); ctx.stroke();
      ctx.restore();
      if (alpha != null) ctx.globalAlpha = alpha;
      drawHead(hd.img, cx, cy, Math.max(minH || 0, s * 0.95), 0, 1, 1, false);
      ctx.globalAlpha = 1;
    }
    // emblème du bloc doré (fleur, perle, soleil, étoile, diamant) qui palpite
    function drawGoldIcon(w, X, Y, s2) {
      const z = s2 * 0.64 * (1 + Math.sin(time * 6) * 0.08);
      ctx.drawImage(goldIconImg(w, s2 * 0.7 * dpr), X + s2 / 2 - z / 2, Y + s2 / 2 - z / 2, z, z);
    }
    // bulle d'air prise dans un bloc (bonus de l'Océan)
    function drawAir(X, Y, s2) {
      const k = 1 + Math.sin(time * 4 + X * 0.1) * 0.06, z = s2 * k;
      ctx.drawImage(airImg(s2 * dpr), X + s2 / 2 - z / 2, Y + s2 / 2 - z / 2 + Math.sin(time * 3 + Y) * s2 * 0.03, z, z);
    }
    // pièce bonus : coccinelle qui se dandine, bulle qui palpite, éclair qui crépite, comète, étoile qui tourne
    function drawBonusCell(w, X, Y, s2, alpha) {
      const im = bonusImg(w, s2 * dpr);
      ctx.save(); ctx.translate(X + s2 / 2, Y + s2 / 2);
      if (alpha != null) ctx.globalAlpha = alpha;
      if (w === 0) ctx.rotate(Math.sin(time * 7) * 0.12);
      else if (w === 1) { const k = 1 + Math.sin(time * 5) * 0.06; ctx.scale(k, 1 / k); }
      else if (w === 2) ctx.globalAlpha *= 0.82 + 0.18 * Math.sin(time * 23);
      else if (w === 3) ctx.rotate(Math.sin(time * 3) * 0.08);
      else ctx.rotate(Math.sin(time * 2) * 0.25);
      ctx.drawImage(im, -s2 / 2, -s2 / 2, s2, s2);
      ctx.restore();
    }
    // variante animée du prisme : un reflet arc-en-ciel parcourt la pile en diagonale
    function prismV(v, x, y) { return (v + Math.floor(time * 5 - (x + y) * 0.7)) & 3; }
    function drawPieceCells(t, r, px, py, head, gold, glow, air, vv) {
      const col = SHAPES[t].c, mat = WI;
      const cells = ROT[t][r];
      if (glow) {
        ctx.globalCompositeOperation = 'lighter';
        const gi = glowImg(t === 'B' ? WPAL[mat][1].a : col, c * 2.2 * dpr);
        for (let k = 0; k < cells.length; k++) {
          const by = py + cells[k][1];
          if (by < HID) continue;
          ctx.drawImage(gi, gx + (px + cells[k][0]) * c - c * 0.6, gy + (by - HID) * c - c * 0.6, c * 2.2, c * 2.2);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      for (let k = 0; k < cells.length; k++) {
        const by = py + cells[k][1];
        if (by < HID - 1) continue;
        const X = gx + (px + cells[k][0]) * c, Y = gy + (by - HID) * c;
        if (t === 'B') { drawBonusCell(mat, X, Y, c); continue; }
        let v = vv ? vv[k] | 0 : k & 3;
        if (mat === 4) v = prismV(v, px + cells[k][0], by);
        ctx.drawImage(tileImg(k === gold ? GOLD : col, c * dpr, mat, v), X, Y, c, c);
        if (k === gold) drawGoldIcon(mat, X, Y, c);
        else if (k === air) drawAir(X, Y, c);
      }
      if (head && cells[head.k]) {
        const by = py + cells[head.k][1];
        if (by >= HID - 1) drawTileHead(head.idx, gx + (px + cells[head.k][0]) * c, gy + (by - HID) * c, c, 26);
      }
    }
    function drawMini(t, cx, cy, m, alpha, head, gold, air) {
      const cells = ROT[t][0];
      let minx = 9, maxx = 0, miny = 9, maxy = 0;
      for (const [x, y] of cells) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      const ox = cx - (maxx - minx + 1) * m / 2, oy = cy - (maxy - miny + 1) * m / 2;
      if (t === 'B') { drawBonusCell(WI, ox, oy, m * 1.25, alpha); return; }
      ctx.globalAlpha = alpha;
      cells.forEach(([x, y], k) => {
        const X = ox + (x - minx) * m, Y = oy + (y - miny) * m;
        const v = WI === 4 ? prismV(k, x, y) : k & 3;
        ctx.drawImage(tileImg(alpha < 1 ? GREY : k === gold ? GOLD : SHAPES[t].c, m * dpr, WI, v), X, Y, m, m);
        if (alpha === 1 && m > 9) { if (k === gold) drawGoldIcon(WI, X, Y, m); else if (k === air) drawAir(X, Y, m); }
      });
      ctx.globalAlpha = 1;
      if (head && cells[head.k] && m >= 10) drawTileHead(head.idx, ox + (cells[head.k][0] - minx) * m, oy + (cells[head.k][1] - miny) * m, m, 0, alpha);
    }
    function fitFont(text, maxW, size, font) {
      ctx.font = size + 'px ' + font;
      const w = ctx.measureText(text).width;
      if (w > maxW) { size = Math.max(7, Math.floor(size * maxW / w)); ctx.font = size + 'px ' + font; }
      return size;
    }
    function glassPanel(x, y, w, h, title, hot) {
      const R = Math.min(14, h * 0.22, w * 0.2);
      ctx.fillStyle = WPANEL[WI];
      rr(ctx, x, y, w, h, R); ctx.fill();
      ctx.lineWidth = hot ? 2 : 1.2;
      ctx.strokeStyle = hot ? rgba(ACC, 0.9) : 'rgba(255,255,255,0.18)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      rr(ctx, x + 2, y + 2, w - 4, Math.min(h * 0.4, 18), R * 0.8); ctx.fill();
      if (title) {
        const fs = Math.round(clamp(Math.min(h * 0.17, w * 0.13), 8, 13));
        ctx.font = '700 ' + fs + 'px ' + FB;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.66)';
        ctx.fillText(title, x + w / 2, y + Math.max(2, fs * 0.3));
        return fs * 1.35;
      }
      return 0;
    }
    function pieceM(box) { return Math.min(box.w * 0.84 / 4, (box.h - (box.small ? 2 : box.h * 0.16)) * 0.72 / 2, c * (box.small ? 0.62 : 0.9)); }

    function drawHold() {
      const b = L.hold;
      const sc = 1 - holdPress * 0.06;
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(sc, sc); ctx.translate(-b.x - b.w / 2, -b.y - b.h / 2);
      const th = glassPanel(b.x, b.y, b.w, b.h, 'RÉSERVE', true);
      if (hold) drawMini(hold, b.x + b.w / 2, b.y + th + (b.h - th) / 2, pieceM(b), holdUsed ? 0.45 : 1, holdSp && holdSp.head, holdSp ? holdSp.gold : -1, holdSp ? holdSp.air : -1);
      else {
        // petite icône « échange »
        const cx = b.x + b.w / 2, cy = b.y + th + (b.h - th) / 2, s = Math.min(b.w, b.h - th) * 0.22;
        ctx.strokeStyle = rgba(ACC, 0.7); ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, s, -2.6, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s * 0.62, cy + s * 0.78); ctx.lineTo(cx + s * 0.62 + s * 0.5, cy + s * 0.78 - s * 0.05); ctx.lineTo(cx + s * 0.62 + s * 0.1, cy + s * 0.78 - s * 0.5); ctx.stroke();
      }
      ctx.restore();
    }
    function drawNext() {
      const hidden = evOn('buee');
      const fog = hidden ? (ev.w === 1 ? '120,70,170' : ev.w === 3 ? '255,150,215' : '225,240,250') : '';
      for (let i = 0; i < L.next.length; i++) {
        const b = L.next[i];
        const th = glassPanel(b.x, b.y, b.w, b.h, i === 0 ? (b.w > 60 ? 'SUIVANTE' : 'APRÈS') : '', false);
        const t = nextQ[i];
        if (!t) continue;
        const cx = b.x + b.w / 2, cy = b.y + th + (b.h - th) / 2;
        if (hidden) {
          ctx.fillStyle = 'rgba(' + fog + ',' + (0.3 + 0.08 * Math.sin(time * 2 + i)) + ')';
          ctx.beginPath(); ctx.arc(cx, cy, Math.min(b.w, b.h) * 0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = Math.round(Math.min(b.w, b.h) * 0.4) + 'px ' + FD;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', cx, cy + 1);
        } else drawMini(t, cx, cy, pieceM(b), 1);
      }
    }
    function chip(x, y, text, col, fs, fill) {
      ctx.font = fs + 'px ' + FD;
      const w = ctx.measureText(text).width + fs * 0.9, h = fs * 1.55;
      ctx.fillStyle = fill ? col : 'rgba(0,0,0,0.35)';
      rr(ctx, x, y, w, h, h / 2); ctx.fill();
      if (!fill) { ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.fillStyle = fill ? '#120620' : col;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + fs * 0.45, y + h / 2 + 1);
      return w;
    }
    // médaillon du monde (+ pastille du tour : II, III…)
    function worldBadge(w, cx, cy, d, tour) {
      ctx.drawImage(worldIconImg(w, d * dpr), cx - d / 2, cy - d / 2, d, d);
      if (tour > 0) {
        const r = Math.max(6, d * 0.27), bx = cx + d * 0.38, by = cy - d * 0.36;
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#120620'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#120620'; ctx.font = Math.round(r * 1.1) + 'px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(roman(tour), bx, by + 1);
      }
    }
    function fitBold(text, maxW, size) {
      ctx.font = '700 ' + size + 'px ' + FB;
      const w = ctx.measureText(text).width;
      if (w > maxW) { size = Math.max(7, Math.floor(size * maxW / w)); ctx.font = '700 ' + size + 'px ' + FB; }
      return size;
    }
    function specialText(w, lv) { return w === 0 && lv >= 2 ? EMPILO_WORLDS[0].bonus.text : EMPILO_WORLDS[w].special.text; }
    function linesToNextWorld() { const st = worldOf(level).stage; return (WPL - 1 - st) * 10 + (10 - lines % 10); }
    function drawStats() {
      const s = L.stats;
      const prog = (lines % 10) / 10, st = worldOf(level).stage;
      if (portrait) {
        let mw = 0;
        if (mascot >= 0 && heads[mascot] && imgOk(heads[mascot].img) && s.w > 120) mw = Math.min(s.h, 46);
        const tw = s.w - mw;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        const lab = Math.round(clamp(s.h * 0.16, 8, 11));
        ctx.font = '700 ' + lab + 'px ' + FB;
        ctx.fillStyle = mult > 1 ? GOLD : 'rgba(255,255,255,0.66)';
        ctx.fillText(mult > 1 ? 'SCORE ×' + mult + ' · ' + Math.ceil(multT) + ' s' : 'SCORE', s.x, s.y + lab + 1);
        const vs = fitFont(fmt(dispScore), tw - 2, Math.round(s.h * 0.4 * (1 + scorePulse * 0.12)), FD);
        ctx.fillStyle = scorePulse > 0.2 || mult > 1 ? GOLD : '#ffffff';
        ctx.fillText(fmt(dispScore), s.x, s.y + lab + 2 + vs * 0.92);
        const fs = Math.round(clamp(s.h * 0.17, 9, 12));
        const ly = s.y + s.h - fs * 1.55 - 5;
        let x = s.x;
        const d = fs * 1.75;
        worldBadge(WI, x + d / 2, ly + fs * 0.78, d, TOUR);
        x += d + 3;
        x += chip(x, ly, 'NIV ' + level, levelFlash > 0.3 ? '#ffffff' : ACC, fs, true) + 4;
        ctx.font = '700 ' + fs + 'px ' + FB;
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const lt = lines + (lines > 1 ? ' lignes' : ' ligne');
        if (x + ctx.measureText(lt).width < s.x + tw) ctx.fillText(lt, x, ly + fs * 0.8);
        // trois segments : les niveaux du monde (le dernier mène au monde suivant)
        const bw = tw - 4, sw = (bw - 4) / 3;
        for (let i = 0; i < 3; i++) {
          const k = i < st ? 1 : i === st ? prog : 0, xx = s.x + i * (sw + 2);
          ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(ctx, xx, s.y + s.h - 3, sw, 3, 1.5); ctx.fill();
          if (k > 0) { ctx.fillStyle = ACC; rr(ctx, xx, s.y + s.h - 3, sw * k, 3, 1.5); ctx.fill(); }
        }
        if (mw) drawMascotHead(s.x + s.w - mw / 2, s.y + s.h / 2 + 1, mw * 0.98, true);
        return;
      }
      glassPanel(s.x, s.y, s.w, s.h, '', false);
      const pad = Math.max(8, s.w * 0.08);
      const lab = Math.round(clamp(s.w * 0.075, 9, 13));
      let y = s.y + pad;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = '700 ' + lab + 'px ' + FB;
      ctx.fillStyle = mult > 1 ? GOLD : 'rgba(255,255,255,0.66)';
      ctx.fillText(mult > 1 ? 'SCORE ×' + mult + ' (' + Math.ceil(multT) + ' s)' : 'SCORE', s.x + pad, y);
      if (!L.voyage) worldBadge(WI, s.x + s.w - pad - lab, y + lab * 0.7, lab * 2.2, TOUR);
      y += lab * 1.3;
      const vs = fitFont(fmt(dispScore), s.w - pad * 2, Math.round(clamp(s.w * 0.17, 16, 34) * (1 + scorePulse * 0.12)), FD);
      ctx.fillStyle = scorePulse > 0.2 || mult > 1 ? GOLD : '#ffffff';
      ctx.fillText(fmt(dispScore), s.x + pad, y);
      y += vs * 1.25;
      if (y + lab * 3.5 > s.y + s.h) return;
      ctx.font = '700 ' + lab + 'px ' + FB;
      ctx.fillStyle = 'rgba(255,255,255,0.66)';
      ctx.fillText('NIVEAU', s.x + pad, y);
      ctx.textAlign = 'right';
      ctx.fillText('LIGNES', s.x + s.w - pad, y);
      y += lab * 1.25;
      const ls = Math.round(clamp(s.w * 0.15, 14, 28));
      ctx.font = ls + 'px ' + FD;
      ctx.textAlign = 'left';
      ctx.fillStyle = levelFlash > 0.3 ? '#ffffff' : ACC;
      ctx.fillText(String(level), s.x + pad, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff';
      ctx.fillText(String(lines), s.x + s.w - pad, y);
      y += ls * 1.15;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      rr(ctx, s.x + pad, y, s.w - pad * 2, 5, 2.5); ctx.fill();
      if (prog > 0) { ctx.fillStyle = ACC; rr(ctx, s.x + pad, y, (s.w - pad * 2) * prog, 5, 2.5); ctx.fill(); }
      y += 12;
      const fs = Math.round(clamp(s.w * 0.07, 9, 12));
      let x = s.x + pad;
      if (y + fs * 1.6 < s.y + s.h - 4) {
        if (combo >= 1) x += chip(x, y, 'COMBO ' + (combo + 1), COL.amber, fs, false) + 5;
        if (b2b >= 1 && x + fs * 5 < s.x + s.w) chip(x, y, 'B2B ' + b2b, GOLD, fs, false);
      }
    }

    // ---------- Carte du voyage : 5 mondes reliés par un chemin, le marqueur du joueur ----------
    function mapNodes(x, y, w, h, names) {
      const P = [];
      for (let i = 0; i < NW; i++) P.push([x + w * (0.1 + 0.2 * i), y + h * (names ? 0.42 : 0.5) + (i % 2 ? -1 : 1) * h * (names ? 0.05 : 0.14)]);
      return P;
    }
    function mapPoint(P, u) {      // point du chemin (u de 0 à 4)
      u = clamp(u, 0, NW - 1);
      const i = Math.min(NW - 2, Math.floor(u)), k = u - i, a = P[i], b = P[i + 1], dx = (b[0] - a[0]) * 0.5;
      const mt = 1 - k;
      return [mt * mt * mt * a[0] + 3 * mt * mt * k * (a[0] + dx) + 3 * mt * k * k * (b[0] - dx) + k * k * k * b[0],
        mt * mt * mt * a[1] + 3 * mt * mt * k * a[1] + 3 * mt * k * k * b[1] + k * k * k * b[1]];
    }
    function playerMarker(x, y, s, bob) {
      const im = api.player && imgOk(api.player.img) ? api.player.img : null;
      const yy = y - s * 0.95 + Math.sin(time * 4) * s * 0.08 * bob;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 1, s * 0.35, s * 0.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x - s * 0.22, yy + s * 0.32); ctx.lineTo(x + s * 0.22, yy + s * 0.32); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x, yy, s * 0.48, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(x, yy, s * 0.4, 0, TAU); ctx.clip();
      if (im) { ctx.fillStyle = rgba(ACC, 0.5); ctx.fillRect(x - s, yy - s, s * 2, s * 2); drawHead(im, x, yy + s * 0.04, s * 0.86, 0, 1, 1, false); }
      else {
        const g = ctx.createLinearGradient(0, yy - s * 0.4, 0, yy + s * 0.4); g.addColorStop(0, shade(ACC, 0.3)); g.addColorStop(1, shade(ACC, -0.3));
        ctx.fillStyle = g; ctx.fillRect(x - s, yy - s, s * 2, s * 2);
        ctx.fillStyle = '#ffffff'; star5(ctx, x, yy + s * 0.03, s * 0.28, s * 0.12); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = ACC; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.beginPath(); ctx.arc(x, yy, s * 0.46, 0, TAU); ctx.stroke();
    }
    // o : { cur (monde atteint), prog (position du marqueur 0..4), names, tour, alphaMark, pulse (monde mis en avant) }
    function drawMap(x, y, w, h, o) {
      const names = !!o.names, P = mapNodes(x, y, w, h, names);
      const r = Math.min(w * 0.072, h * (names ? 0.22 : 0.36));
      const pts = [];
      for (let k = 0; k <= (NW - 1) * 14; k++) pts.push(mapPoint(P, k / 14));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.setLineDash([Math.max(2, r * 0.18), Math.max(4, r * 0.32)]);
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.setLineDash([]);
      const done = clamp(o.prog, 0, NW - 1), nd = Math.round(done * 14);
      if (nd > 0) {
        ctx.beginPath(); for (let i = 0; i <= nd; i++) { const p = pts[i]; if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = rgba(ACC, 0.3); ctx.lineWidth = Math.max(6, r * 0.55); ctx.stroke();      // halo (sans flou : plus léger)
        ctx.strokeStyle = ACC; ctx.lineWidth = Math.max(2.5, r * 0.2); ctx.stroke();
      }
      for (let i = 0; i < NW; i++) {
        const [nx, ny] = P[i], visited = i < o.cur, here = i === o.cur;
        let rr2 = r * (here ? 1.16 : 1);
        if (o.pulse === i) rr2 *= 1 + 0.12 * Math.max(0, Math.sin(time * 6));
        if (here) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(glowImg(WPAL[i][1].a, rr2 * 4 * dpr), nx - rr2 * 2, ny - rr2 * 2, rr2 * 4, rr2 * 4);
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = rgba(WPAL[i][1].a, 0.5 + 0.5 * Math.sin(time * 4)); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(nx, ny, rr2 * 1.22, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = visited || here ? 1 : 0.5;
        ctx.drawImage(worldIconImg(i, rr2 * 2 * dpr), nx - rr2, ny - rr2, rr2 * 2, rr2 * 2);
        if (!visited && !here) { ctx.fillStyle = 'rgba(8,6,24,0.35)'; ctx.beginPath(); ctx.arc(nx, ny, rr2 * 0.92, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        if (visited) {
          const cr = Math.max(5, rr2 * 0.32), cx2 = nx + rr2 * 0.72, cy2 = ny + rr2 * 0.68;
          ctx.fillStyle = '#3fd27a'; ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.4, cr * 0.28);
          ctx.beginPath(); ctx.moveTo(cx2 - cr * 0.45, cy2); ctx.lineTo(cx2 - cr * 0.1, cy2 + cr * 0.38); ctx.lineTo(cx2 + cr * 0.48, cy2 - cr * 0.35); ctx.stroke();
        }
        if (names) {
          const fs = Math.round(clamp(r * 0.5, 8, 13));
          ctx.font = (here ? '' : '700 ') + fs + 'px ' + (here ? FD : FB);
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,6,20,0.8)'; ctx.lineJoin = 'round';
          const nm = EMPILO_WORLDS[i].short.toUpperCase(), ty = ny + rr2 + Math.max(4, r * 0.2);
          ctx.strokeText(nm, nx, ty);
          ctx.fillStyle = here ? '#ffffff' : visited ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.5)';
          ctx.fillText(nm, nx, ty);
          const lv = EMPILO_WORLDS[i].levels, off = (o.tour || 0) * WPL * NW;
          ctx.font = '700 ' + Math.max(7, fs - 2) + 'px ' + FB;
          ctx.fillStyle = here ? rgba(WPAL[i][1].a, 1) : 'rgba(255,255,255,0.42)';
          ctx.fillText('NIV ' + (lv[0] + off) + '-' + (lv[1] + off), nx, ty + fs * 1.15);
        }
      }
      if (o.alphaMark > 0) {
        const [mx2, my2] = mapPoint(P, done);
        ctx.globalAlpha = o.alphaMark;
        playerMarker(mx2, my2 - r * 0.62, r * 1.05, 1);
        ctx.globalAlpha = 1;
      }
    }
    // panneau VOYAGE (PC et paysage) : les 5 mondes, le marqueur, le monde en cours et ce qu'il reste à faire
    function drawVoyagePanel() {
      const v = L.voyage;
      if (!v) return;
      const th = glassPanel(v.x, v.y, v.w, v.h, 'VOYAGE' + (TOUR ? ' · TOUR ' + roman(TOUR) : ''), false);
      const st = worldOf(level).stage, prog = WI + (st + (lines % 10) / 10) / WPL;
      const mh = (v.h - th) * 0.62;
      drawMap(v.x + 2, v.y + th + 2, v.w - 4, mh, { cur: WI, prog: Math.min(prog, NW - 1), names: false, tour: TOUR, alphaMark: 1 });
      const fs = Math.round(clamp(v.w * 0.07, 9, 13)), ty = v.y + th + mh + 2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = fs + 'px ' + FD; ctx.fillStyle = '#ffffff';
      const nm = EMPILO_WORLDS[WI].name.toUpperCase() + ' · ' + (st + 1) + '/' + WPL;
      fitFont(nm, v.w - 12, fs, FD); ctx.fillText(nm, v.x + v.w / 2, ty);
      const n2 = linesToNextWorld(), nx = (WI + 1) % NW;
      const sub = (nx === 0 ? 'Tour ' + roman(TOUR + 1) : EMPILO_WORLDS[nx].name) + ' dans ' + n2 + ' ligne' + (n2 > 1 ? 's' : '');
      fitBold(sub, v.w - 12, Math.max(8, fs - 2)); ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(sub, v.x + v.w / 2, ty + fs * 1.3);
    }
    // icône de la particularité du monde (coccinelle, bulle, éclair, pièce qui flotte, étoile)
    function specialIcon(w, X, Y, s) {
      if (w === 1) { ctx.drawImage(airImg(s * dpr), X, Y, s, s); return; }
      if (w !== 3) { ctx.drawImage(bonusImg(w === 4 ? 4 : w, s * dpr), X, Y, s, s); return; }
      const f = Math.sin(time * 2.5) * s * 0.08;
      ctx.drawImage(tileImg(SHAPES.T.c, s * 0.62 * dpr, 3, 0), X + s * 0.19, Y + s * 0.12 + f, s * 0.62, s * 0.62);
      ctx.strokeStyle = 'rgba(200,220,255,0.8)'; ctx.lineWidth = Math.max(1, s * 0.06); ctx.lineCap = 'round';
      for (const dx of [0.28, 0.5, 0.72]) { ctx.beginPath(); ctx.moveTo(X + s * dx, Y + s * 0.84 + f); ctx.lineTo(X + s * dx, Y + s * 0.98 + f * 0.5); ctx.stroke(); }
    }
    // carte d'arrivée dans un nouveau monde (pendant le voyage) : nom, description, particularité, carte animée
    function wrapLines(text, maxW, maxN) {
      const words = text.split(' '), out = [];
      let line = '';
      for (const wd of words) {
        const tst = line ? line + ' ' + wd : wd;
        if (line && ctx.measureText(tst).width > maxW) { out.push(line); line = wd; if (out.length >= maxN) return out; }
        else line = tst;
      }
      if (line && out.length < maxN) out.push(line);
      return out;
    }
    function drawTripCard() {
      if (!trip) return;
      const t = trip.t, kin = clamp((t - 0.55) / 0.4, 0, 1), kout = clamp((t - (TRIP_DUR - 0.5)) / 0.35, 0, 1);
      if (kin <= 0 || kout >= 1) return;
      const a = easeOutCubic(kin) * (1 - kout);
      const D = EMPILO_WORLDS[trip.to], A2 = WPAL[trip.to][0].a, ret = trip.to === 0;
      const cw = Math.min(W - 20, Math.max(gridW + 24, 300), 460);
      // mise en page calculée d'avance : en-tête, description (2 lignes au plus), particularité, carte
      let ts = clamp(cw * 0.1, 24, 40), mapH = clamp(cw * 0.35, 104, 136);
      const fsd = Math.round(clamp(cw * 0.036, 12, 15)), sfs = Math.round(clamp(cw * 0.032, 10, 13)), sh2 = sfs * 2.6;
      const desc = ret ? 'Nouveau tour : les mondes reviennent, encore plus vite !' : D.desc;
      ctx.font = '700 ' + fsd + 'px ' + FB;
      let dl = wrapLines(desc, cw - 34, 2);
      let ch = 34 + ts * 1.3 + dl.length * fsd * 1.25 + 6 + sh2 + 8 + mapH + 6;
      if (ch > H - 16) { dl = dl.slice(0, 1); ts = Math.max(20, ts * 0.85); ch = 34 + ts * 1.3 + fsd * 1.25 + 6 + sh2 + 8 + mapH + 6; if (ch > H - 16) { mapH = Math.max(72, mapH - (ch - (H - 16))); ch = Math.min(ch, H - 16); } }
      const cx = clamp(gx + gridW / 2, cw / 2 + 10, W - cw / 2 - 10), x0 = cx - cw / 2;
      const y0 = clamp(gy + gridH * 0.08, 8, H - ch - 8) - (1 - easeOutBack(kin)) * 40 - kout * 30;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x0 + 4, y0 + 8, cw, ch, 22); ctx.fill();
      const bgc = ctx.createLinearGradient(0, y0, 0, y0 + ch);
      bgc.addColorStop(0, rgba(D.colors.dark, 0.95)); bgc.addColorStop(1, 'rgba(8,6,22,0.95)');
      ctx.fillStyle = bgc; rr(ctx, x0, y0, cw, ch, 22); ctx.fill();
      rr(ctx, x0, y0, cw, ch, 22); ctx.strokeStyle = rgba(A2, 0.25); ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = A2; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, x0 + 3, y0 + 3, cw - 6, 26, 18); ctx.fill();
      const kick = ret ? 'TOUR ' + roman(trip.tour) + ' · NIVEAU ' + trip.lv : 'MONDE ' + D.n + ' · NIVEAU ' + trip.lv;
      ctx.font = '700 ' + Math.round(clamp(cw * 0.035, 11, 14)) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = A2; ctx.fillText(kick, cx, y0 + 12);
      const sIn = t < 1.1 ? easeOutBack(clamp((t - 0.6) / 0.4, 0, 1)) : 1;
      bigText(D.name.toUpperCase(), cx, y0 + 32 + ts * 0.62, ts, A2, cw - 30, a, sIn, 0, true);
      let y = y0 + 34 + ts * 1.3;
      ctx.globalAlpha = a;
      ctx.font = '700 ' + fsd + 'px ' + FB; ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      dl.forEach((l, i) => ctx.fillText(l, cx, y + i * fsd * 1.25));
      y += dl.length * fsd * 1.25 + 6;
      // particularité du monde
      const sp = D.special, lab = sp.name.toUpperCase(), txt = specialText(trip.to, trip.lv);
      ctx.font = sfs + 'px ' + FD; const labW = ctx.measureText(lab).width;
      ctx.font = '700 ' + sfs + 'px ' + FB; const txtW = ctx.measureText(txt).width;
      const lw = Math.min(cw - 30, sh2 + 16 + Math.max(labW, txtW) + 12);
      const sx = cx - lw / 2;
      ctx.fillStyle = rgba(A2, 0.16); rr(ctx, sx, y, lw, sh2, sh2 / 2); ctx.fill();
      ctx.strokeStyle = rgba(A2, 0.7); ctx.lineWidth = 1.2; ctx.stroke();
      specialIcon(trip.to, sx + 6, y + sh2 * 0.12, sh2 * 0.76);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = sfs + 'px ' + FD; ctx.fillStyle = A2;
      ctx.fillText(lab, sx + sh2 + 6, y + sh2 * 0.32);
      ctx.font = '700 ' + sfs + 'px ' + FB; ctx.fillStyle = '#ffffff';
      const maxT = lw - sh2 - 16;
      let tt = txt; while (tt.length > 4 && ctx.measureText(tt).width > maxT) tt = tt.slice(0, -2);
      ctx.fillText(tt === txt ? txt : tt + '…', sx + sh2 + 6, y + sh2 * 0.7);
      y += sh2 + 8;
      // carte : le marqueur file de l'ancien monde au nouveau (retour à la Plaine pour le tour suivant)
      const mk = ease(clamp((t - 1.0) / 0.9, 0, 1));
      const prog = ret ? (mk < 0.5 ? NW - 1 : 0) : trip.from + (trip.to - trip.from) * mk;
      drawMap(x0 + 8, y, cw - 16, mapH, { cur: ret ? (mk < 0.5 ? NW - 1 : 0) : (mk > 0.85 ? trip.to : trip.from), prog, names: true, tour: ret && mk < 0.5 ? trip.tour - 1 : trip.tour, alphaMark: ret ? Math.abs(1 - mk * 2) : 1, pulse: trip.to });
      ctx.restore();
    }
    // carte des commandes (PC : touches dessinées ; tactile : gestes)
    function keycap(x, y, w, h, label, fs) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      rr(ctx, x, y + 2, w, h, h * 0.25); ctx.fill();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9cde6');
      ctx.fillStyle = g;
      rr(ctx, x, y, w, h, h * 0.25); ctx.fill();
      ctx.fillStyle = '#1a1235';
      ctx.font = fs + 'px ' + FD;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    }
    function controlsRows(touch) {
      return touch
        ? [['↔', 'Glisse : la pièce suit'], ['•', 'Touche : tourner'], ['↓', 'Glisse en bas : descendre'], ['⇊', 'Geste vif en bas : chute'], ['R', 'Bouton RÉSERVE / vif en haut']]
        : [[['←', '→'], 'Déplacer'], [['↓'], 'Descendre'], [['ESPACE'], 'Chute'], [['↑', 'X'], 'Tourner'], [['Z'], 'Anti-horaire'], [['C', 'MAJ'], 'Réserve'], [['P', 'ÉCHAP'], 'Pause']];
    }
    function drawControls(x, y, w, h, touch, title) {
      const th = title ? glassPanel(x, y, w, h, title, false) : 0;
      const rows = controlsRows(touch);
      const pad = Math.max(8, w * 0.06);
      const rh = Math.min(36, (h - th - pad * 1.2) / rows.length);
      if (rh < 15) return;
      const fs = Math.round(clamp(rh * 0.42, 8, 15));
      let yy = y + th + pad * 0.6;
      for (const [k, txt] of rows) {
        const kh = rh * 0.74;
        let kx = x + pad;
        if (touch) {
          ctx.fillStyle = rgba(ACC, 0.22);
          ctx.beginPath(); ctx.arc(kx + kh / 2, yy + rh / 2, kh / 2, 0, TAU); ctx.fill();
          ctx.fillStyle = ACC; ctx.font = Math.round(kh * 0.6) + 'px ' + FD;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(k, kx + kh / 2, yy + rh / 2 + 1);
          kx += kh + 8;
        } else {
          for (const lab of k) {
            ctx.font = fs + 'px ' + FD;
            const kw = Math.max(kh, ctx.measureText(lab).width + fs * 0.9);
            keycap(kx, yy + (rh - kh) / 2 - 1, kw, kh, lab, fs);
            kx += kw + 4;
          }
          kx += 4;
        }
        ctx.font = '700 ' + Math.round(fs * 1.05) + 'px ' + FB;
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const tw = x + w - pad - kx;
        if (tw > 20) {
          let f2 = Math.round(fs * 1.05);
          while (f2 > 7 && ctx.measureText(txt).width > tw) { f2--; ctx.font = '700 ' + f2 + 'px ' + FB; }
          ctx.fillText(txt, kx, yy + rh / 2 + 1);
        }
        yy += rh;
      }
    }
    function mascotPose(headH) {
      let rot = 0, sx = 1, sy = 1, dy = Math.sin(time * 2.2) * 1.5;
      if (cur && state === 'play') rot = ((cur.x + 1.5) - 4.5) * 0.035;
      let top = VIS;
      for (let yy = HID; yy < ROWS; yy++) if (board[yy].some(v => v)) { top = yy - HID; break; }
      const worried = state === 'play' && top < 6;
      if (worried) rot += Math.sin(time * 22) * 0.06;
      const t = react.t;
      if (react.kind === 1 && t < 0.6) { const q = Math.sin(t / 0.6 * Math.PI); dy -= q * headH * 0.22; sy = 1 + q * 0.08; sx = 1 - q * 0.05; }
      else if (react.kind === 2 && t < 1.2) { const q = Math.abs(Math.sin(t / 0.6 * Math.PI)); dy -= q * headH * 0.3; rot += Math.sin(t * 18) * 0.15; }
      else if (react.kind === 3) { rot = 0.3 * Math.min(1, t / 0.4); dy += Math.min(1, t / 0.4) * headH * 0.06; }
      else if (react.kind === 4 && t < 0.45) { const k = t / 0.45; const s2 = k < 0.7 ? k / 0.7 * 1.15 : 1.15 - (k - 0.7) / 0.3 * 0.15; sx = sy = Math.max(0.05, s2); }
      return { rot, sx, sy, dy, worried };
    }
    function drawMascotHead(cx, cy, headH, bubbleBelow) {
      const hd = heads[mascot];
      if (!hd || !imgOk(hd.img)) return;
      const P = mascotPose(headH);
      drawHead(state === 'over' && imgOk(hd.sad) ? hd.sad : hd.img, cx, cy + P.dy, headH, P.rot, P.sx, P.sy, true);
      if (P.worried) {
        const dpos = (time * 1.4) % 1;
        ctx.fillStyle = 'rgba(120,200,255,' + (1 - dpos) + ')';
        const dx0 = cx + headH * 0.38, dy0 = cy + P.dy - headH * 0.25 + dpos * headH * 0.3, r0 = Math.max(2.5, headH * 0.06);
        ctx.beginPath(); ctx.arc(dx0, dy0, r0, 0, Math.PI); ctx.lineTo(dx0, dy0 - r0 * 2.2); ctx.closePath(); ctx.fill();
      }
      const t = react.t;
      if (react.text && (react.kind === 3 || t < 1.3)) {
        const fs = Math.round(clamp(c * 0.45, 10, 15));
        ctx.font = '700 ' + fs + 'px ' + FB;
        const tw = ctx.measureText(react.text).width;
        const bw = tw + fs * 1.1, bh = fs * 1.8;
        const bx = clamp(cx - bw / 2, 4, W - 4 - bw);
        const by = bubbleBelow ? cy + headH * 0.5 + 8 : cy + P.dy - headH * 0.5 - bh - 6;
        ctx.globalAlpha = react.kind === 3 ? 1 : Math.min(1, (1.3 - t) / 0.25);
        ctx.fillStyle = '#ffffff';
        rr(ctx, bx, by, bw, bh, bh * 0.4); ctx.fill();
        const tx = clamp(cx, bx + 8, bx + bw - 8);
        ctx.beginPath();
        if (bubbleBelow) { ctx.moveTo(tx - 5, by + 1); ctx.lineTo(tx + 5, by + 1); ctx.lineTo(tx + 1, by - 6); }
        else { ctx.moveTo(tx - 5, by + bh - 1); ctx.lineTo(tx + 5, by + bh - 1); ctx.lineTo(tx + 1, by + bh + 6); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a0f2e';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(react.text, bx + bw / 2, by + bh / 2 + 1);
        ctx.globalAlpha = 1;
      }
    }
    function drawMascotPanel() {
      const m = L.mascot;
      if (!m || mascot < 0 || !heads[mascot] || !imgOk(heads[mascot].img)) return;
      const th = glassPanel(m.x, m.y, m.w, m.h, String(heads[mascot].name || 'COPAIN').toUpperCase().slice(0, 12), false);
      const headH = Math.min(m.h - th - 14, m.w * 0.85 / 0.8, 130);
      if (headH < 26) return;
      const cx = m.x + m.w / 2, cy = m.y + th + 6 + (m.h - th - 6) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, cy + headH * 0.5, headH * 0.3, headH * 0.06, 0, 0, TAU); ctx.fill();
      drawMascotHead(cx, cy, headH, false);
    }
    // l'intrus du monde quand il n'y a pas de têtes : taupe, crabe, orage, soucoupe, trou noir (dessinés en code)
    function drawCreature(w, cx, cy, S, rot, sc, sad) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
      const eye = (x, y, r) => {
        if (sad) { ctx.strokeStyle = '#1a1010'; ctx.lineWidth = Math.max(1.5, r * 0.5); ctx.beginPath(); ctx.arc(x, y + r * 0.3, r * 0.8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); return; }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(x + r * 0.15, y + r * 0.1, r * 0.55, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.2, r * 0.2, 0, TAU); ctx.fill();
      };
      const tear = (x, y) => { if (!sad) return; const ph = (time * 1.4) % 1; ctx.fillStyle = 'rgba(120,200,255,' + (1 - ph) + ')'; ctx.beginPath(); ctx.arc(x, y + ph * S * 0.25, S * 0.05, 0, Math.PI); ctx.lineTo(x, y + ph * S * 0.25 - S * 0.11); ctx.closePath(); ctx.fill(); };
      if (w === 0) {      // taupe dans sa motte de terre
        const g = ctx.createRadialGradient(-S * 0.1, -S * 0.15, S * 0.05, 0, 0, S * 0.42);
        g.addColorStop(0, '#7a6a72'); g.addColorStop(1, '#3a2e36');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -S * 0.02, S * 0.34, S * 0.36, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d8b8c0'; ctx.beginPath(); ctx.ellipse(0, S * 0.1, S * 0.17, S * 0.12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff8fb0'; ctx.beginPath(); ctx.ellipse(0, S * 0.04, S * 0.08, S * 0.06, 0, 0, TAU); ctx.fill();
        eye(-S * 0.13, -S * 0.12, S * 0.055); eye(S * 0.13, -S * 0.12, S * 0.055);
        ctx.fillStyle = '#8a5a36'; ctx.beginPath(); ctx.ellipse(0, S * 0.36, S * 0.52, S * 0.2, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#6b4226'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-S * 0.36 + i * S * 0.18, S * 0.3 - (i % 2) * S * 0.06, S * 0.05, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffb0c8';
        for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(k * S * (0.2 + i * 0.05), S * 0.24, S * 0.025, S * 0.06, k * 0.4, 0, TAU); ctx.fill(); }
        tear(-S * 0.13, -S * 0.04);
      } else if (w === 1) {      // crabe
        const snap = sad ? 0.1 : 0.25 + 0.25 * Math.max(0, Math.sin(time * 6));
        ctx.strokeStyle = '#c0283a'; ctx.lineWidth = S * 0.05; ctx.lineCap = 'round';
        for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(k * S * 0.2, S * 0.08 + i * S * 0.06); ctx.lineTo(k * S * 0.42, S * 0.16 + i * S * 0.08); ctx.lineTo(k * S * 0.48, S * 0.3 + i * S * 0.06); ctx.stroke(); }
        for (const k of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(k * S * 0.22, -S * 0.02); ctx.lineTo(k * S * 0.38, -S * 0.22); ctx.stroke();
          ctx.save(); ctx.translate(k * S * 0.4, -S * 0.3); ctx.fillStyle = '#ff4a5a';
          ctx.beginPath(); ctx.ellipse(0, 0, S * 0.13, S * 0.1, k * 0.5, Math.PI * 0.1 + snap, Math.PI * 1.9 - snap); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        const g = ctx.createRadialGradient(-S * 0.08, -S * 0.08, S * 0.04, 0, 0, S * 0.34);
        g.addColorStop(0, '#ff7a6a'); g.addColorStop(1, '#c8202e');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, S * 0.06, S * 0.3, S * 0.21, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c0283a'; ctx.lineWidth = S * 0.035;
        ctx.beginPath(); ctx.moveTo(-S * 0.08, -S * 0.08); ctx.lineTo(-S * 0.1, -S * 0.2); ctx.moveTo(S * 0.08, -S * 0.08); ctx.lineTo(S * 0.1, -S * 0.2); ctx.stroke();
        eye(-S * 0.1, -S * 0.23, S * 0.055); eye(S * 0.1, -S * 0.23, S * 0.055);
        ctx.strokeStyle = '#7a1018'; ctx.lineWidth = S * 0.03; ctx.beginPath(); ctx.arc(0, S * 0.08, S * 0.08, sad ? Math.PI + 0.4 : 0.4, sad ? TAU - 0.4 : Math.PI - 0.4); ctx.stroke();
        tear(-S * 0.1, -S * 0.15);
      } else if (w === 2) {      // nuage d'orage
        if (!sad && Math.floor(time * 3) % 3 === 0) {
          ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(S * 0.02, S * 0.12); ctx.lineTo(-S * 0.1, S * 0.36); ctx.lineTo(S * 0.0, S * 0.36); ctx.lineTo(-S * 0.06, S * 0.56); ctx.lineTo(S * 0.14, S * 0.28); ctx.lineTo(S * 0.04, S * 0.28); ctx.lineTo(S * 0.12, S * 0.12); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = 'rgba(150,200,255,0.8)';
        for (let i = 0; i < 4; i++) { const ph = (time * 1.6 + i * 0.27) % 1; ctx.fillRect(-S * 0.24 + i * S * 0.16, S * 0.16 + ph * S * 0.3, 1.5, S * 0.07); }
        ctx.save(); ctx.translate(-S * 0.5, -S * 0.42); cloudPaint(ctx, S, S * 0.6, 7, sad ? '#9aa6bc' : '#6a7490', '#3a4258', 'rgba(255,255,255,0.15)'); ctx.restore();
        eye(-S * 0.12, -S * 0.04, S * 0.06); eye(S * 0.12, -S * 0.04, S * 0.06);
        if (!sad) { ctx.strokeStyle = '#1a1a2a'; ctx.lineWidth = S * 0.035; ctx.beginPath(); ctx.moveTo(-S * 0.2, -S * 0.14); ctx.lineTo(-S * 0.06, -S * 0.1); ctx.moveTo(S * 0.2, -S * 0.14); ctx.lineTo(S * 0.06, -S * 0.1); ctx.stroke(); }
        tear(-S * 0.12, S * 0.03);
      } else if (w === 3) {      // soucoupe volante
        if (!sad) {
          const bg = ctx.createLinearGradient(0, S * 0.1, 0, S * 0.6);
          bg.addColorStop(0, 'rgba(160,255,200,0.45)'); bg.addColorStop(1, 'rgba(160,255,200,0)');
          ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-S * 0.14, S * 0.1); ctx.lineTo(S * 0.14, S * 0.1); ctx.lineTo(S * 0.34, S * 0.6); ctx.lineTo(-S * 0.34, S * 0.6); ctx.closePath(); ctx.fill();
        }
        const dg = ctx.createLinearGradient(0, -S * 0.36, 0, S * 0.02);
        dg.addColorStop(0, 'rgba(200,250,255,0.9)'); dg.addColorStop(1, 'rgba(90,180,230,0.6)');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, -S * 0.04, S * 0.2, S * 0.24, 0, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#7ce06a'; ctx.beginPath(); ctx.ellipse(0, -S * 0.1, S * 0.1, S * 0.11, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#7ce06a'; ctx.lineWidth = S * 0.02; ctx.beginPath(); ctx.moveTo(0, -S * 0.2); ctx.lineTo(0, -S * 0.27); ctx.stroke();
        ctx.fillStyle = '#ff5f7a'; ctx.beginPath(); ctx.arc(0, -S * 0.28, S * 0.025, 0, TAU); ctx.fill();
        eye(-S * 0.04, -S * 0.11, S * 0.032); eye(S * 0.04, -S * 0.11, S * 0.032);
        const mg = ctx.createLinearGradient(0, -S * 0.08, 0, S * 0.12);
        mg.addColorStop(0, '#e8ecf4'); mg.addColorStop(1, '#6a7290');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(0, S * 0.02, S * 0.44, S * 0.12, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = Math.floor(time * 6 + i) % 2 ? '#ffe14a' : '#5ef0ff'; ctx.beginPath(); ctx.arc(-S * 0.3 + i * S * 0.15, S * 0.05, S * 0.03, 0, TAU); ctx.fill(); }
      } else {      // petit trou noir
        ctx.rotate(time * 1.5);
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = rgba(IRIS[(i * 2) % 6], 0.7 - i * 0.12); ctx.lineWidth = S * (0.07 - i * 0.01);
          ctx.beginPath(); ctx.ellipse(0, 0, S * (0.42 - i * 0.07), S * (0.18 - i * 0.025), 0, i * 0.8, i * 0.8 + 4.5); ctx.stroke();
        }
        ctx.rotate(-time * 1.5);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.24);
        g.addColorStop(0, '#000000'); g.addColorStop(0.7, '#0a0418'); g.addColorStop(1, 'rgba(120,60,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, S * 0.24, 0, TAU); ctx.fill();
        eye(-S * 0.07, -S * 0.02, S * 0.045); eye(S * 0.07, -S * 0.02, S * 0.045);
        tear(-S * 0.07, S * 0.04);
      }
      ctx.restore();
    }
    function drawSab() {
      if (!sab) return;
      const leak = sab.idx < 0;
      const hd = leak ? null : heads[sab.idx];
      if (!leak && !hd) return;
      const sad = sab.phase === 'sad';
      const im = leak ? null : sad && imgOk(hd.sad) ? hd.sad : hd.img;
      if (!leak && !imgOk(im)) return;
      const HH = clamp(c * 2.2, 34, 88);
      let cx = gx + gridW - HH * 0.5, cy = gy + HH * 0.42;
      let sc = 1, rot = 0, alpha = 1;
      const t = sab.t;
      if (sab.phase === 'in') { const k = Math.min(1, t / 0.6); cy += (1 - k) * (-HH * 1.2); sc = 0.6 + 0.4 * k + Math.sin(k * Math.PI) * 0.25; rot = (1 - k) * 0.8; }
      else if (sab.phase === 'on') { cy += Math.sin(time * 3) * 2; rot = Math.sin(time * 1.7) * 0.08; if (sab.riseT < 2) { rot += Math.sin(time * 30) * 0.08; sc = 1 + (2 - sab.riseT) * 0.04; } }
      else if (sad) { rot = -0.15 + Math.sin(time * 6) * 0.03; if (t > 1.8) { const k = (t - 1.8) / 0.6; cy -= k * HH * 1.2; alpha = Math.max(0, 1 - k); } }
      else if (sab.phase === 'bye') { if (t > 1) { const k = (t - 1) / 0.6; cy -= k * HH * 1.2; alpha = Math.max(0, 1 - k); } }
      // la tête s'efface un peu quand la pièce passe dessous
      if (cur && state === 'play' && cur.x + 3 >= COLS - 3 && cur.y - HID < 4) alpha *= 0.45;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (sab.phase === 'on') {
        const k = 1 - sab.riseT / sab.riseMax;
        const R = HH * 0.6;
        ctx.lineWidth = Math.max(3, HH * 0.07);
        ctx.strokeStyle = 'rgba(11,6,20,0.75)';
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = sab.riseT < 3 ? (Math.floor(time * 8) % 2 ? COL.alarm : COL.amber) : COL.spray;
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      }
      if (leak) drawCreature(sab.w, cx, cy, HH * 0.95, rot, sc, sad);
      else drawHead(im, cx, cy, HH, rot, sc, sc, true);
      if (sab.say && (sab.sayT < 1.8 || sad)) {
        const fs = Math.round(clamp(c * 0.46, 10, 15));
        ctx.font = '700 ' + fs + 'px ' + FB;
        const tw = ctx.measureText(sab.say).width;
        const bw = tw + fs * 1.1, bh = fs * 1.8;
        const bx = clamp(cx - HH * 0.55 - bw, 4, W - 4 - bw);
        const by = clamp(cy + HH * 0.2, 2, H - bh - 2);
        ctx.fillStyle = sad ? '#dff1ff' : '#ffffff';
        rr(ctx, bx, by, bw, bh, bh * 0.4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + bw - 10, by + 2); ctx.lineTo(bx + bw + 6, by - 4); ctx.lineTo(bx + bw - 2, by + bh * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a0f2e';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sab.say, bx + bw / 2, by + bh / 2 + 1);
      }
      ctx.restore();
    }

    // événements dessinés à la manière du monde (brume, encre, nuages, nébuleuse… ; graines, bulles, plumes… ; vent, courant, météores…)
    function drawEventLayer() {
      if (!ev) return;
      const fade = Math.min(1, ev.t / 0.5, (ev.dur - ev.t) / 0.5), w = ev.w | 0;
      if (ev.k === 'buee') {
        const FOG = ['235,244,250', '60,24,90', '255,255,255', '255,140,210', '255,230,150'][w];
        for (let i = 0; i < 7; i++) {
          const ph = hash(i * 4.1);
          const bx = gx + ((ph * gridW + time * c * (0.4 + hash(i) * 0.6)) % (gridW + c * 4)) - c * 2;
          const by = gy + gridH * (0.08 + hash(i * 2.3) * 0.55);
          const rad = c * (2.2 + hash(i * 7.7) * 2);
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
          g.addColorStop(0, 'rgba(' + FOG + ',' + ((w === 1 ? 0.75 : 0.5) * fade) + ')');
          g.addColorStop(1, 'rgba(' + FOG + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
        }
      } else if (ev.k === 'mousse') {
        for (let i = 0; i < 18; i++) {
          const sp = 0.3 + hash(i * 3.3) * 0.5;
          const bx = gx + hash(i * 5.7) * gridW + Math.sin(time * 1.5 + i) * c * 0.5;
          const up = w === 1 || w === 3 || w === 4;
          const prog = (time * sp * c * 1.6 + hash(i) * gridH) % (gridH + c);
          const by = up ? gy + gridH - prog : gy + prog - c * 0.5;
          const rad = c * (0.12 + hash(i * 9.1) * 0.22);
          ctx.globalAlpha = 0.75 * fade;
          if (w === 0) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + time; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * rad, by + Math.sin(a) * rad); ctx.stroke(); } }
          else if (w === 1) { ctx.strokeStyle = 'rgba(200,250,255,0.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.stroke(); }
          else if (w === 2) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(bx, by, rad * 1.4, rad * 0.45, Math.sin(time * 2 + i) * 0.6, 0, TAU); ctx.fill(); }
          else { ctx.fillStyle = w === 3 ? '#bfe8ff' : IRIS[i % 6]; star4(ctx, bx, by, rad * 0.9, ctx.fillStyle); }
        }
        ctx.globalAlpha = 1;
      } else if (ev.k === 'essorage') {
        const SC = ['255,255,255', '120,240,255', '255,255,255', '255,170,80', '255,120,210'][w];
        ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gridW, gridH); ctx.clip();
        ctx.lineCap = 'round';
        for (let i = 0; i < 14; i++) {
          const sp = 1.2 + hash(i * 2.2) * 1.4, len = c * (1.5 + hash(i * 3.3) * 2.5);
          const u = (hash(i * 5.1) + time * sp * 0.6) % 1.4 - 0.2, y0 = gy + hash(i * 7.3) * gridH;
          ctx.strokeStyle = 'rgba(' + SC + ',' + (0.4 * fade) + ')'; ctx.lineWidth = Math.max(1.5, c * (w === 3 ? 0.14 : 0.07));
          const x0 = gx + u * gridW;
          ctx.beginPath();
          if (w === 3) { ctx.moveTo(x0, y0 + u * c * 3); ctx.lineTo(x0 - len * 0.7, y0 + u * c * 3 - len * 0.7); }
          else { ctx.moveTo(x0, y0); ctx.lineTo(x0 - len, y0 + (w === 1 ? len * 0.25 : 0)); }
          ctx.stroke();
        }
        ctx.restore();
      } else if (ev.k === 'panne') {
        const pw = Math.max(1, Math.round(gridW * dpr)), ph = Math.max(1, Math.round(gridH * dpr));
        if (!darkCv) darkCv = document.createElement('canvas');
        if (darkCv.width !== pw || darkCv.height !== ph) { darkCv.width = pw; darkCv.height = ph; }
        const d = darkCv.getContext('2d');
        d.setTransform(dpr, 0, 0, dpr, 0, 0);
        d.globalCompositeOperation = 'copy';
        let a = 0.93 * fade;
        if (ev.t < 0.8 && Math.floor(ev.t * 14) % 3 === 0) a *= 0.3;
        if (w === 2) { const fl = (ev.t % 2.3) / 2.3; if (fl < 0.06 || (fl > 0.1 && fl < 0.13)) a *= 0.25; }      // les éclairs de l'orage
        const D = ['2,2,10', '0,8,24', '6,8,22', '2,1,8', '6,0,12'][w];
        d.fillStyle = 'rgba(' + D + ',' + a + ')';
        d.fillRect(0, 0, gridW, gridH);
        d.globalCompositeOperation = 'destination-out';
        const hole = (x, y, r) => {
          const g = d.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2);
        };
        if (cur) {
          const cells = ROT[cur.t][cur.r];
          let mx = 0, my = 0;
          for (const [x, y] of cells) { mx += x; my += y; }
          mx = mx / cells.length + 0.5; my = my / cells.length + 0.5;
          const dd = dropDist();
          hole((cur.x + mx) * c, (cur.y + my - HID) * c, c * 3.4);
          hole((cur.x + mx) * c, (cur.y + dd + my - HID) * c, c * 2.6);
        }
        d.globalCompositeOperation = 'source-over';
        ctx.drawImage(darkCv, gx, gy, gridW, gridH);
      }
    }
    function drawBadge() {
      if (!ev || state !== 'play') return;
      const d = evName(ev.k, ev.w | 0);
      const fs = Math.round(clamp(c * 0.45, 9, 14));
      const bw = Math.min(gridW * 0.62, fs * 12), bh = fs * 2;
      const bx = gx + 5, by = gy + 5;
      ctx.fillStyle = 'rgba(10,6,24,0.82)';
      rr(ctx, bx, by, bw, bh, bh * 0.35); ctx.fill();
      ctx.strokeStyle = d.col; ctx.lineWidth = 1.5; ctx.stroke();
      const k = Math.max(0, 1 - ev.t / ev.dur);
      ctx.fillStyle = d.col;
      rr(ctx, bx + 4, by + bh - 5, (bw - 8) * k, 2.5, 1.2); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tx = d.name.replace(' !', '');
      fitBold(tx, bw - 10, fs);
      ctx.fillStyle = d.col;
      ctx.fillText(tx, bx + bw / 2, by + bh / 2 - 1);
    }

    function topRow() { for (let yy = HID; yy < ROWS; yy++) if (board[yy].some(v => v)) return yy - HID; return VIS; }

    // verre du puits (pendant un voyage : l'ancien et le nouveau de chaque côté de la ligne, plus clair pour voir la caméra voyager)
    function wellPart(w, isNew, a) {
      const ly = tripLineY();
      ctx.save(); ctx.beginPath();
      if (ly < 0) { if ((tripCam() >= 0.5) !== isNew) { ctx.restore(); return; } ctx.rect(gx, gy, gridW, gridH); }
      else if (trip.kind === 'dive') { if (isNew) ctx.rect(gx, ly, gridW, gy + gridH - ly); else ctx.rect(gx, gy, gridW, ly - gy); }
      else if (isNew) ctx.rect(gx, gy, gridW, ly - gy); else ctx.rect(gx, ly, gridW, gy + gridH - ly);
      ctx.clip();
      glassTint(w, a);
      ctx.globalAlpha = a; ctx.drawImage(wellFor(w), gx, gy, gridW, gridH);
      ctx.restore();
    }
    function glassTint(w, a) {
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a;
      ctx.fillStyle = WMUL[w]; ctx.fillRect(gx, gy, gridW, gridH);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    function drawBoard() {
      const bell = trip ? Math.sin(tripCam() * Math.PI) : 0, ga = 1 - 0.5 * bell;
      if (trip && trip.from !== trip.to) { wellPart(trip.from, false, ga); wellPart(trip.to, true, ga); }
      else { glassTint(WI, ga); ctx.globalAlpha = ga; ctx.drawImage(wellFor(WI), gx, gy, gridW, gridH); ctx.globalAlpha = 1; }
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gridW, gridH); ctx.clip();
      // danger : la pile approche du haut
      if (state === 'play' && !trip) {
        const top = topRow();
        if (top < 6) {
          const a = (6 - top) / 6 * (0.28 + 0.18 * Math.sin(time * 9));
          const dg = ctx.createLinearGradient(0, gy, 0, gy + c * 5);
          dg.addColorStop(0, 'rgba(255,40,80,' + a + ')'); dg.addColorStop(1, 'rgba(255,40,80,0)');
          ctx.fillStyle = dg; ctx.fillRect(gx, gy, gridW, c * 5);
        }
      }
      const clr = clearing;
      const greyRows = state === 'over' ? Math.floor(overT / 0.03) : -1;
      const capH = Math.round(c * 0.55), capY = capH * 0.62;
      for (let y = HID; y < ROWS; y++) {
        const vr = y - HID;
        const isClr = clr && clr.rows.indexOf(y) >= 0;
        if (isClr && clr.ex) continue;
        const off = rowOff[y] ? rowOff[y].p : 0;
        const Y = gy + (vr - off) * c;
        const grey = greyRows >= 0 && (VIS - 1 - vr) < greyRows;
        const mat = trip ? (newSide(Y + c / 2) ? trip.to : trip.from) : WI;
        for (let x = 0; x < COLS; x++) {
          const t = board[y][x];
          if (!t) continue;
          const X = gx + x * c;
          const gd = goldBoard[y][x] && !grey;
          let v = varBoard[y][x] | 0;
          if (mat === 4) v = prismV(v, x, y);
          ctx.drawImage(t === 'G' && !grey ? tileImg(GARB[mat], c * dpr, mat, v, 'g') : tileImg(grey ? GREY : gd ? GOLD : SHAPES[t].c, c * dpr, mat, v), X, Y, c, c);
          if (gd) drawGoldIcon(mat, X, Y, c);
          else if (airBoard[y][x] && !grey) drawAir(X, Y, c);
          const hi = headBoard[y][x];
          if (hi >= 0) drawTileHead(hi, X, Y, c, 26, grey ? 0.75 : 1);
          // décor posé sur le dessus libre des blocs : herbe et fleurs, coraux, petits nuages, voyants, scintillements
          if (!grey && !isClr && (y === 0 || !board[y - 1][x])) {
            const cv2 = varBoard[y][x] | 0;
            if (mat <= 2) {
              if (mat === 0 || cv2 !== 3) ctx.drawImage(capImg(mat, c * dpr, cv2), X, Y - capY, c, capH);
            } else if (mat === 3) {
              const k = 0.5 + 0.5 * Math.sin(time * 3 + x * 1.7 + y);
              ctx.fillStyle = rgba(SHAPES[t] ? SHAPES[t].c : '#ffffff', 0.35 + 0.4 * k);
              ctx.fillRect(X + c * 0.18, Y + c * 0.04, c * 0.64, Math.max(1.5, c * 0.06));
              if (cv2 === 1) { ctx.fillStyle = 'rgba(255,90,120,' + (0.4 + 0.6 * k) + ')'; ctx.beginPath(); ctx.arc(X + c * 0.5, Y - c * 0.08, Math.max(1.5, c * 0.07), 0, TAU); ctx.fill(); }
            } else if (cv2 === 2) {
              const k = Math.max(0, Math.sin(time * 2.5 + x * 2.1 + y * 1.3));
              if (k > 0.05) star4(ctx, X + c * (0.3 + 0.4 * hash(x + y * 3)), Y - c * 0.05, c * 0.2 * k, 'rgba(255,255,255,' + k + ')');
            }
          }
        }
        if (isClr) {
          // flash blanc avant l'éclatement
          ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, 0.55 + clr.t * 6) + ')';
          ctx.fillRect(gx, Y, gridW, c);
        }
      }
      // vague de lumière du changement de niveau
      if (levelFlash > 0) {
        const wy = gy + gridH * (levelFlash);
        const lg = ctx.createLinearGradient(0, wy - c * 2, 0, wy + c * 2);
        lg.addColorStop(0, rgba(palTo.a, 0)); lg.addColorStop(0.5, rgba(palTo.a, 0.35)); lg.addColorStop(1, rgba(palTo.a, 0));
        ctx.fillStyle = lg; ctx.fillRect(gx, wy - c * 2, gridW, c * 4);
      }
      // pendant le voyage : la ligne qui change la matière des blocs scintille
      if (trip) {
        const ly = tripLineY(), k = tripCam();
        if (ly >= gy && ly <= gy + gridH && k > 0 && k < 1) {
          const g = ctx.createLinearGradient(0, ly - c * 0.6, 0, ly + c * 0.6);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(gx, ly - c * 0.6, gridW, c * 1.2);
        }
      }
      for (const f of lockFlash) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - f.t / 0.2)) + ')';
        for (const [x, y] of f.cells) if (y >= HID) { rr(ctx, gx + x * c + 1, gy + (y - HID) * c + 1, c - 2, c - 2, c * 0.22); ctx.fill(); }
      }
      for (const tr of trails) {
        const a = 1 - tr.t / 0.25;
        for (const k in tr.cols) {
          const x = +k, top = Math.max(HID, tr.cols[k][0]), bot = tr.cols[k][1];
          const y0 = gy + (top - HID) * c, y1 = gy + (bot - HID + 1) * c;
          if (y1 <= y0) continue;
          const g = ctx.createLinearGradient(0, y0, 0, y1);
          g.addColorStop(0, rgba(tr.color, 0)); g.addColorStop(1, rgba(tr.color, 0.5 * a));
          ctx.fillStyle = g;
          ctx.fillRect(gx + x * c + c * 0.1, y0, c * 0.8, y1 - y0);
        }
      }
      drawEventLayer();
      if (cur && state === 'play' && !trip) {
        const d = dropDist();
        const col = cur.t === 'B' ? WPAL[WI][1].a : SHAPES[cur.t].c;
        const cells = ROT[cur.t][cur.r];
        if (d > 0) {
          // guide de chute (colonnes de la pièce jusqu'à l'ombre)
          const gimg = ghostImg(col, c * dpr);
          ctx.fillStyle = rgba(col, 0.08);
          const seen = {};
          for (const [cx, cy] of cells) {
            const bx = cur.x + cx;
            let lo = -1;
            for (const [cx2, cy2] of cells) if (cx2 === cx) lo = Math.max(lo, cy2);
            if (seen[bx]) continue; seen[bx] = 1;
            const y0 = Math.max(HID, cur.y + lo + 1), y1 = cur.y + lo + d;
            if (y1 >= y0) ctx.fillRect(gx + bx * c + c * 0.2, gy + (y0 - HID) * c, c * 0.6, (y1 - y0 + 1) * c);
          }
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(time * 6);
          for (const [cx, cy] of cells) {
            const by = cur.y + cy + d;
            if (by < HID) continue;
            ctx.drawImage(gimg, gx + (cur.x + cx) * c, gy + (by - HID) * c, c, c);
          }
          ctx.globalAlpha = 1;
        }
        drawPieceCells(cur.t, cur.r, cur.x, cur.y, cur.head, cur.gold, true, cur.air, cur.vv);
        if (lockT > 0 && grounded()) {
          const a = 0.35 * Math.min(1, lockT / lockDelay());
          ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
          for (const [cx, cy] of cells) {
            const by = cur.y + cy;
            if (by >= HID) { rr(ctx, gx + (cur.x + cx) * c + 1, gy + (by - HID) * c + 1, c - 2, c - 2, c * 0.22); ctx.fill(); }
          }
        }
      }
      ctx.restore();
    }

    function drawFrame() {
      const fa = frameImg(WI);
      const pad = fa._pad;
      const W2 = gridW + pad * 2, H2 = gridH + pad * 2;
      const fromW = trip ? trip.from : palFrom.w;
      if (palK < 1 && fromW !== undefined && fromW !== WI) {
        const fb = frameImg(fromW);
        ctx.globalAlpha = 1 - palK; ctx.drawImage(fb, gx - pad, gy - pad, W2, H2);
        ctx.globalAlpha = palK; ctx.drawImage(fa, gx - pad, gy - pad, W2, H2);
        ctx.globalAlpha = 1;
      } else ctx.drawImage(fa, gx - pad, gy - pad, W2, H2);
      // battement néon du cadre pendant les gros moments
      const glow = Math.max(punch, levelFlash * 0.8);
      if (glow > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glow * 0.8;
        ctx.drawImage(fa, gx - pad, gy - pad, W2, H2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (WI === 4) {      // Au-delà : une étincelle fait le tour du cadre
        const per = 2 * (gridW + gridH), u = (time * 260) % per;
        let px, py;
        if (u < gridW) { px = gx + u; py = gy - 4; } else if (u < gridW + gridH) { px = gx + gridW + 4; py = gy + u - gridW; }
        else if (u < 2 * gridW + gridH) { px = gx + gridW - (u - gridW - gridH); py = gy + gridH + 4; } else { px = gx - 4; py = gy + gridH - (u - 2 * gridW - gridH); }
        star4(ctx, px, py, c * 0.35, '#ffffff');
      }
    }

    function drawW(p) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a < 0.3 ? a / 0.3 : 1;
      switch (p.k) {
        case 'petal': ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.55, p.r, 0, TAU); ctx.fill(); break;
        case 'leaf': leafShape(ctx, p.x, p.y, p.s * 2.2, p.r, '#5cc24e'); break;
        case 'fly': butterfly(ctx, p.x, p.y, p.s, Math.abs(Math.sin(p.life * 16 + p.ph)), p.col, p.vx > 0 ? 0.3 : -0.3); break;
        case 'bub':
          ctx.strokeStyle = 'rgba(220,250,255,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(p.x - p.s * 0.45, p.y - p.s * 0.5, Math.max(1, p.s * 0.35), Math.max(1, p.s * 0.35)); break;
        case 'air': {
          if (a < 0.12) { ctx.strokeStyle = 'rgba(230,252,255,' + (a / 0.12) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1.4 - a * 3), 0, TAU); ctx.stroke(); break; }
          const z = p.s * (1 + Math.sin(p.life * 9) * 0.08); ctx.drawImage(airImg(p.s * dpr), p.x - z / 2, p.y - z / 2, z, z); break;
        }
        case 'drop': ctx.fillStyle = '#d8f8ff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break;
        case 'fish': {
          const im = fishImg(+p.col || 0, p.s * dpr), h = p.s * 0.6;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.vx < 0 ? -1 : 1, 1); ctx.drawImage(im, -p.s / 2, -h / 2, p.s, h); ctx.restore(); break;
        }
        case 'feather':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(0, 0, p.s * 0.32, p.s, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(150,170,200,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(0, p.s * 1.3); ctx.stroke();
          ctx.restore(); break;
        case 'puff': ctx.globalAlpha *= 0.45 * (1 - p.life / p.max); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.arc(p.x + p.s * 0.7, p.y + p.s * 0.2, p.s * 0.7, 0, TAU); ctx.arc(p.x - p.s * 0.7, p.y + p.s * 0.25, p.s * 0.6, 0, TAU); ctx.fill(); break;
        case 'bird': ctx.strokeStyle = '#2a3a5a'; ctx.lineWidth = Math.max(1.5, p.s * 0.18); ctx.lineCap = 'round'; birdPath(ctx, p.x, p.y, p.s, Math.sin(p.life * 14)); break;
        case 'dust': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col || '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.7 + 0.3 * Math.sin(p.life * 12 + p.ph)), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        case 'star': star4(ctx, p.x, p.y, p.s * 1.6 * (0.6 + 0.4 * Math.sin(p.life * 10 + p.ph)), p.col || '#ffffff'); break;
        case 'comet':
          ctx.strokeStyle = 'rgba(200,240,255,0.8)'; ctx.lineWidth = p.s; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.8, 0, TAU); ctx.fill(); break;
        case 'conf': {
          const f = Math.cos(p.life * 9 + p.ph);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.abs(f) + 0.1);
          ctx.fillStyle = p.col; ctx.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s); ctx.restore(); break;
        }
        case 'rainbow': {
          const r = p.s + (p.life / p.max) * gridW * 0.9;
          ctx.lineWidth = Math.max(2, c * 0.18);
          for (let i = 0; i < 6; i++) { ctx.strokeStyle = rgba(IRIS[i], 0.8 * a); ctx.beginPath(); ctx.arc(p.x, p.y, r + i * ctx.lineWidth, Math.PI, TAU); ctx.stroke(); }
          break;
        }
      }
      ctx.globalAlpha = 1;
    }
    function drawFx() {
      // faisceaux des lignes cassées (et l'éclair vertical du Ciel)
      if (beams.length) {
        ctx.globalCompositeOperation = 'lighter';
        for (const b of beams) {
          const k = b.t / b.max;
          const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
          if (b.v) {
            ctx.strokeStyle = 'rgba(255,240,150,' + a + ')'; ctx.lineWidth = Math.max(3, c * 0.22); ctx.lineJoin = 'round';
            ctx.beginPath(); let yy = b.y0, xx = b.x; ctx.moveTo(xx, yy);
            while (yy < b.y1) { yy += c * (0.6 + hash(yy * 0.37 + b.t) * 0.7); xx = b.x + (hash(yy * 1.7 + Math.floor(b.t * 30)) - 0.5) * c * 0.9; ctx.lineTo(xx, Math.min(b.y1, yy)); }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = Math.max(1.5, c * 0.08); ctx.stroke();
            continue;
          }
          const hh = c * (0.6 + 1.6 * easeOutCubic(Math.min(1, k * 2)) * (1 - k) + (b.tier >= 3 ? 0.6 : 0));
          const ext = (1 - Math.pow(1 - Math.min(1, k * 3), 3)) * Math.min(W * 0.5 + gridW, gridW * 1.2);
          const g = ctx.createLinearGradient(0, b.y - hh, 0, b.y + hh);
          g.addColorStop(0, rgba(b.col, 0)); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.95 * a) + ')'); g.addColorStop(1, rgba(b.col, 0));
          ctx.fillStyle = g;
          ctx.fillRect(gx - ext / 2, b.y - hh, gridW + ext, hh * 2);
          ctx.fillStyle = rgba(b.col, 0.35 * a);
          ctx.fillRect(gx - ext / 2, b.y - hh * 0.18, gridW + ext, hh * 0.36);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // ondes de choc
      for (const r of rings) {
        if (r.t < 0) continue;
        const a = 1 - r.t / r.max;
        ctx.globalAlpha = Math.max(0, a);
        ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (0.5 + a);
        ctx.beginPath(); ctx.ellipse(r.x, r.y, Math.max(1, r.r), Math.max(1, r.r * r.sy), 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // éclats des blocs (dans la matière du monde)
      for (const p of shards) {
        const a = 1 - p.life / p.max;
        ctx.globalAlpha = a < 0.3 ? a / 0.3 : 1;
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        if (p.img) {
          const sw = p.img.width / 2;
          ctx.drawImage(p.img, p.qx * sw, p.qy * sw, sw, sw, -p.s / 2, -p.s / 2, p.s, p.s);
        } else { ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); }
        ctx.rotate(-p.r); ctx.translate(-p.x, -p.y);
      }
      ctx.globalAlpha = 1;
      // pétales, bulles, plumes, poussière d'étoiles, confettis…
      for (const p of wfx) drawW(p);
      // étincelles (additives, avec traînée)
      if (sparks.length) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (const p of sparks) {
          const a = 1 - p.life / p.max;
          ctx.strokeStyle = p.col + a.toFixed(2) + ')';
          ctx.lineWidth = Math.max(1.5, c * 0.14 * a + 1);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // gros textes : dessinés une fois dans un petit canvas (contour + dégradé + halo), puis simplement posés
    const textCache = new Map();
    function textSprite(text, sz, color, glow) {
      const key = text + '|' + sz + '|' + color + '|' + (glow ? 1 : 0) + '|' + dpr;
      let cv = textCache.get(key);
      if (cv) return cv;
      if (textCache.size > 48) textCache.clear();
      ctx.font = sz + 'px ' + FD;
      const tw = ctx.measureText(text).width;
      const pad = Math.ceil(sz * (glow ? 0.32 : 0.16)) + 2;
      cv = document.createElement('canvas');
      cv.width = Math.ceil((tw + pad * 2) * dpr); cv.height = Math.ceil((sz * 1.3 + pad * 2) * dpr);
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.font = sz + 'px ' + FD;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      const cx = tw / 2 + pad, cy = sz * 0.65 + pad;
      if (glow) { x.lineWidth = sz * 0.5; x.strokeStyle = rgba(color, 0.25); x.strokeText(text, cx, cy); }
      x.lineWidth = Math.max(3, sz * 0.22); x.strokeStyle = '#12061f'; x.strokeText(text, cx, cy);
      const g = x.createLinearGradient(0, cy - sz * 0.5, 0, cy + sz * 0.5);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, color); g.addColorStop(1, shade(color, -0.2));
      x.fillStyle = g; x.fillText(text, cx, cy);
      cv._w = tw + pad * 2; cv._h = sz * 1.3 + pad * 2; cv._cy = cy;
      textCache.set(key, cv);
      return cv;
    }
    function bigText(text, x, y, size, color, maxW, alpha, scale, rot, glow) {
      if (alpha <= 0.01 || !text) return 0;
      const sz = fitFont(text, maxW, Math.max(8, Math.round(size)), FD);
      const cv = textSprite(text, sz, color, glow);
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.drawImage(cv, -cv._w / 2, -cv._cy, cv._w, cv._h);
      ctx.restore();
      return sz;
    }
    function drawCallout() {
      if (!callout) return;
      const co = callout, t = co.t;
      const fade = Math.min(1, (co.life - t) / 0.3);
      let y = gy + gridH * 0.34 - Math.min(t, 1) * c * 0.4;
      const total = co.lines.reduce((s, l) => s + l.s * c * 1.15, 0);
      y -= total / 2;
      co.lines.forEach((l, i) => {
        const delay = i * 0.06;
        const k = clamp((t - delay) / 0.26, 0, 1);
        if (k <= 0) { y += l.s * c * 1.15; return; }
        let sc = easeOutBack(k);
        if (l.main && co.tier >= 3) sc *= 1 + Math.max(0, 0.3 - t) * 0.7;
        const rot = l.main ? Math.sin(t * 9) * 0.05 * Math.max(0, 1 - t * 1.5) : 0;
        const wob = l.main && co.tier >= 3 ? 1 + Math.sin(t * 16) * 0.02 : 1;
        y += l.s * c * 0.575;
        bigText(l.text, gx + gridW / 2, y, l.s * c, l.col, Math.min(W - 16, gridW) * 0.86, fade * k * 1.4, sc * wob, rot, l.main);
        y += l.s * c * 0.575;
      });
    }
    function drawBanner() {
      if (!banner) return;
      const t = banner.t, life = banner.life;
      const kin = Math.min(1, t / 0.35), kout = Math.max(0, (t - (life - 0.35)) / 0.35);
      const cy = gy + gridH * 0.56;
      const bh = c * 2.6;
      const x0 = -W * (1 - easeOutCubic(kin)) + W * easeOutCubic(kout);
      ctx.save();
      ctx.translate(x0, 0);
      const g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
      g.addColorStop(0, rgba(palTo.k[0], 0.9)); g.addColorStop(1, rgba(palTo.k[2], 0.9));
      ctx.fillStyle = 'rgba(8,4,20,0.5)';
      ctx.fillRect(0, cy - bh / 2 - 4, W, bh + 8);
      ctx.fillStyle = g;
      ctx.fillRect(0, cy - bh / 2, W, 3); ctx.fillRect(0, cy + bh / 2 - 3, W, 3);
      // reflets qui défilent
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 6; i++) { const xx = ((t * 600 + i * 140) % (W + 200)) - 100; ctx.fillRect(xx, cy - bh / 2, 30, bh); }
      ctx.restore();
      const a = 1 - kout;
      const s = t < 0.5 ? easeOutBack(Math.min(1, t / 0.4)) : 1;
      bigText(banner.text, W / 2 + x0, cy - c * 0.3, c * 1.45, palTo.a, W - 24, a, s, 0, true);
      ctx.font = '700 ' + Math.round(clamp(c * 0.5, 10, 16)) + 'px ' + FB;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(banner.sub, W / 2 + x0, cy + c * 0.75);
      ctx.globalAlpha = 1;
    }
    function drawFloaters() {
      // les points apparaissent sur la ligne cassée puis s'envolent dans le score
      const tx = portrait ? L.stats.x + 46 : L.stats.x + L.stats.w * 0.35, ty = portrait ? L.stats.y + L.stats.h * 0.45 : L.stats.y + 40;
      for (const f of floaters) {
        const t = f.t;
        let x = f.x, y = f.y - Math.min(t, 0.4) * c * 1.5, sc = t < 0.15 ? easeOutBack(t / 0.15) : 1, a = 1;
        if (t > 0.45) {
          const k = easeOutCubic(Math.min(1, (t - 0.45) / 0.45));
          x = x + (tx - x) * k; y = y + (ty - y) * k; sc *= 1 - k * 0.5; a = 1 - Math.max(0, (t - 0.8) / 0.15);
          if (k >= 1 && !f.hit) { f.hit = true; scorePulse = 1; }
        }
        bigText(f.text, x, y, c * (f.big ? 0.9 : 0.7), f.col, gridW, a, sc, 0, false);
      }
    }
    function drawPops() {
      const off = [0, 0], cnt = [0, 0];
      const fadeOver = state === 'over' ? Math.max(0, 1 - overT * 3) : 1;
      if (fadeOver <= 0) return;
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        const gI = p.lvl ? 1 : 0;
        if (cnt[gI] >= 2) continue;
        cnt[gI]++;
        const k = p.t / p.life;
        const sIn = p.t < 0.2 ? easeOutBack(p.t / 0.2) : 1;
        const a = (k > 0.75 ? (1 - k) / 0.25 : 1) * fadeOver;
        const cy = gy + gridH * (p.lvl ? 0.72 : 0.6) + off[gI];
        const size = Math.round(c * 0.78);
        off[gI] += size * (p.sub ? 2.0 : 1.25);
        bigText(p.text, gx + gridW / 2, cy, size, p.color, gridW * 0.96, a, sIn, 0, false);
        if (p.sub) {
          ctx.globalAlpha = a;
          ctx.font = '700 ' + Math.round(clamp(size * 0.52, 9, 15)) + 'px ' + FB;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = '#12061f'; ctx.lineJoin = 'round';
          ctx.strokeText(p.sub, gx + gridW / 2, cy + size * 0.9);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(p.sub, gx + gridW / 2, cy + size * 0.9);
          ctx.globalAlpha = 1;
        }
      }
    }
    function drawCompetBadge() {
      if (!COMPET) return;
      const fs = Math.round(clamp(c * 0.36, 8, 11));
      ctx.font = fs + 'px ' + FD;
      const tx = 'COMPÉTITION', bw = Math.round(ctx.measureText(tx).width + fs * 1.4), bh = Math.round(fs * 1.7);
      const bx = Math.round(gx + gridW / 2 - bw / 2), by = Math.round(gy - bh / 2 - 3);
      ctx.fillStyle = 'rgba(14,6,26,0.92)';
      rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.8); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = GOLD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tx, bx + bw / 2, by + bh / 2 + 1);
    }

    // ---------- Tutoriel animé (3 étapes) ----------
    function tutoCard() {
      const w = Math.min(W - 24, 380), h = Math.min(H - 40, 440);
      return { x: W / 2 - w / 2, y: Math.max(10, H / 2 - h / 2), w, h };
    }
    function tutoSkipRect() { const k = tutoCard(); return { x: k.x + k.w - 96, y: k.y + 8, w: 88, h: 36 }; }
    function drawFinger(x, y, press) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + press * 0.35) + ')';
      ctx.beginPath(); ctx.arc(x, y, 18 + press * 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = ACC; ctx.lineWidth = 3; ctx.stroke();
    }
    function drawTuto() {
      ctx.fillStyle = 'rgba(8,4,20,0.72)';
      ctx.fillRect(0, 0, W, H);
      const k = tutoCard(), tt = tuto.t, st = tuto.step;
      const touch = touchUI;
      glassPanel(k.x, k.y, k.w, k.h, '', true);
      ctx.fillStyle = 'rgba(10,6,28,0.6)'; rr(ctx, k.x, k.y, k.w, k.h, 14); ctx.fill();
      // passer
      const sk = tutoSkipRect();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, sk.x, sk.y, sk.w, sk.h, 18); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '700 13px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PASSER ✕', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1);
      ctx.textAlign = 'left'; ctx.font = '700 12px ' + FB; ctx.fillStyle = rgba(ACC, 1);
      ctx.fillText('COMMENT JOUER · ' + (st + 1) + '/3', k.x + 16, k.y + 26);
      // scène : mini-plateau
      const ms = Math.floor(Math.min((k.w - 60) / 7, (k.h * 0.48) / 6));
      const sw = ms * 7, sh = ms * 6;
      const sx = Math.round(k.x + k.w / 2 - sw / 2), sy = Math.round(k.y + 48);
      ctx.fillStyle = 'rgba(4,3,12,0.85)'; rr(ctx, sx - 4, sy - 4, sw + 8, sh + 8, 10); ctx.fill();
      ctx.strokeStyle = rgba(ACC, 0.7); ctx.lineWidth = 2; ctx.stroke();
      const floor = ['LL...ZZ', 'L..SZZI', 'JJSS.TI'];
      for (let r = 0; r < 3; r++) for (let q = 0; q < 7; q++) { const ch = floor[r][q]; if (ch !== '.') ctx.drawImage(tileImg(SHAPES[ch].c, ms * dpr, WI, (q + r) & 3), sx + q * ms, sy + (3 + r) * ms, ms, ms); }
      const piece = (px, py, rot, alpha) => {
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        for (const [cx, cy] of ROT.T[rot]) ctx.drawImage(tileImg(SHAPES.T.c, ms * dpr, WI, cx & 3), sx + (px + cx) * ms, sy + (py + cy) * ms, ms, ms);
        ctx.globalAlpha = 1;
      };
      let title = '', l1 = '', l2 = '';
      const cyc = tt % 3;
      if (st === 0) {
        const col = [2, 3, 4, 3][Math.floor(tt / 0.6) % 4];
        piece(col - 1, 0, 0);
        if (touch) {
          const fx = sx + sw / 2 + Math.sin(tt * Math.PI / 1.2) * ms * 1.6;
          drawFinger(fx, sy + sh * 0.8, 0.6);
          title = 'GLISSE ↔'; l1 = 'Glisse le doigt n’importe où :'; l2 = 'la pièce suit, case par case.';
        } else {
          const kk = Math.floor(tt / 0.6) % 4;
          keycap(sx + sw / 2 - 52, sy + sh + 2 - 40, 44, 32, '←', 15); keycap(sx + sw / 2 + 8, sy + sh + 2 - 40, 44, 32, '→', 15);
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, kk === 0 || kk === 3 ? sx + sw / 2 + 8 : sx + sw / 2 - 52, sy + sh - 38, 44, 32, 8); ctx.fill();
          title = '← → DÉPLACER'; l1 = 'Flèches gauche / droite.'; l2 = '↓ pour descendre plus vite.';
        }
      } else if (st === 1) {
        const rot = Math.floor(tt / 0.7) % 4;
        piece(2, 0, rot);
        if (touch) {
          const ph = (tt % 0.7) / 0.7;
          drawFinger(sx + sw * 0.75, sy + sh * 0.35, ph < 0.25 ? 1 - ph * 4 : 0);
          if (ph < 0.4) { ctx.strokeStyle = 'rgba(255,255,255,' + (1 - ph / 0.4) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + sw * 0.75, sy + sh * 0.35, 18 + ph * 60, 0, TAU); ctx.stroke(); }
          title = 'TOUCHE = TOURNE'; l1 = 'Une touche brève tourne la pièce.'; l2 = 'Elle se cale contre les murs.';
        } else {
          keycap(sx + sw / 2 - 52, sy + sh - 40, 44, 32, '↑', 15); keycap(sx + sw / 2 + 8, sy + sh - 40, 44, 32, 'X', 15);
          title = '↑ / X TOURNER'; l1 = 'Z tourne dans l’autre sens.'; l2 = 'Elle se cale contre les murs.';
        }
      } else {
        piece(3, cyc < 0.9 ? Math.floor(cyc / 0.3) : 3, 2);
        if (touch) {
          const fy = cyc < 0.9 ? sy + ms * 0.5 + cyc * ms * 1.2 : cyc < 1.15 ? sy + ms * 1.6 + (cyc - 0.9) * ms * 12 : sy + sh;
          drawFinger(sx + sw * 0.2, fy, cyc > 0.9 && cyc < 1.15 ? 1 : 0.4);
          title = 'GLISSE ↓ / GESTE VIF'; l1 = 'Glisse vers le bas : descend.'; l2 = 'Geste vif : chute. RÉSERVE : le bouton.';
          // anneau sur le bouton réserve
          const hb = L.hold;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(tt * 8)) + ')'; ctx.lineWidth = 3;
          rr(ctx, hb.x - 3, hb.y - 3, hb.w + 6, hb.h + 6, 14); ctx.stroke();
        } else {
          keycap(sx + sw / 2 - 70, sy + sh - 40, 90, 32, 'ESPACE', 13); keycap(sx + sw / 2 + 28, sy + sh - 40, 44, 32, 'C', 15);
          title = 'ESPACE = CHUTE'; l1 = 'C ou Maj : mettre en réserve.'; l2 = 'P ou Échap : pause.';
        }
      }
      const ty = sy + sh + 16;
      bigText(title, W / 2, ty + 18, Math.min(28, k.w * 0.075), ACC, k.w - 24, 1, 1, 0, true);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.font = '700 ' + Math.round(clamp(k.w * 0.042, 12, 16)) + 'px ' + FB;
      ctx.fillText(l1, W / 2, ty + 48);
      ctx.fillText(l2, W / 2, ty + 70);
      // points + bouton suivant
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === st ? ACC : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(W / 2 + (i - 1) * 16, k.y + k.h - 66, 5, 0, TAU); ctx.fill(); }
      const bw = Math.min(k.w - 40, 240), bx = W / 2 - bw / 2, by = k.y + k.h - 52;
      const bg = ctx.createLinearGradient(0, by, 0, by + 40);
      bg.addColorStop(0, shade(ACC, 0.25)); bg.addColorStop(1, shade(ACC, -0.2));
      ctx.fillStyle = bg; rr(ctx, bx, by, bw, 40, 20); ctx.fill();
      ctx.fillStyle = '#12061f'; ctx.font = '15px ' + FD; ctx.textAlign = 'center';
      ctx.fillText(st < 2 ? 'SUIVANT ›' : "C'EST PARTI !", W / 2, by + 21);
    }

    // carte du voyage dans l'écran de pause : chemin parcouru, monde en cours, sa particularité, le prochain monde
    function drawPauseMap(x, y, w, h) {
      const th = glassPanel(x, y, w, h, 'TON VOYAGE' + (TOUR ? ' · TOUR ' + roman(TOUR) : ''), true);
      const st = worldOf(level).stage, prog = WI + (st + (lines % 10) / 10) / WPL;
      const mapH = Math.max(60, (h - th) * 0.56);
      drawMap(x + 6, y + th + 6, w - 12, mapH, { cur: WI, prog: Math.min(prog, NW - 1), names: true, tour: TOUR, alphaMark: 1 });
      const D = EMPILO_WORLDS[WI], A2 = WPAL[WI][1].a;
      let yy = y + th + 8 + mapH;
      const fs = Math.round(clamp(w * 0.04, 11, 15));
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = A2;
      const t1 = 'MONDE ' + D.n + ' · ' + D.name.toUpperCase() + ' · NIVEAU ' + level;
      fitFont(t1, w - 20, fs, FD); ctx.fillText(t1, x + w / 2, yy);
      yy += fs * 1.45;
      if (yy + fs * 2.6 > y + h) return;
      const ic = fs * 1.5, t2 = D.special.name + ' : ' + specialText(WI, level).replace(/^./, (ch) => ch.toLowerCase());
      fitBold(t2, w - 30 - ic, Math.round(fs * 0.92));
      const tw = ctx.measureText(t2).width, sx = x + w / 2 - (tw + ic + 6) / 2;
      specialIcon(WI, sx, yy - ic * 0.2, ic);
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(t2, sx + ic + 6, yy);
      yy += fs * 1.4;
      if (yy + fs > y + h) return;
      const n2 = linesToNextWorld(), nx = (WI + 1) % NW;
      const t3 = (nx === 0 ? 'Ensuite : le Tour ' + roman(TOUR + 1) : 'Prochain monde : ' + EMPILO_WORLDS[nx].name) + ' dans ' + n2 + ' ligne' + (n2 > 1 ? 's' : '');
      fitBold(t3, w - 20, Math.round(fs * 0.85)); ctx.fillStyle = 'rgba(255,255,255,0.66)'; ctx.textAlign = 'center';
      ctx.fillText(t3, x + w / 2, yy);
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (warmQ.length) { const cv = warmQ.shift(); try { ctx.drawImage(cv, 0, 0, 1, 1); } catch (e) { /* */ } }
      drawWorld();
      let sx = 0, sy = 0;
      if (shakeT > 0 && !paused) {
        const m = shakeMag * Math.min(1, shakeT / 0.15);
        sx = (Math.random() - 0.5) * 2 * m; sy = (Math.random() - 0.5) * 2 * m;
      }
      sy += kickY;
      ctx.save();
      ctx.translate(sx, sy);
      if (punch > 0) {
        const z = 1 + punch * punch * 0.03;
        const cx = gx + gridW / 2, cy = gy + gridH / 2;
        ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
      }
      drawBoard();
      drawFrame();
      drawBadge();
      drawCompetBadge();
      drawFx();
      ctx.restore();
      // panneaux (immobiles) ; en portrait, un voile sous la bande du haut garde le score lisible sur un ciel clair
      if (portrait) {
        const hb = ctx.createLinearGradient(0, 0, 0, hudH + 6);
        hb.addColorStop(0, 'rgba(6,8,24,0.5)'); hb.addColorStop(1, 'rgba(6,8,24,0.18)');
        ctx.fillStyle = hb; ctx.fillRect(0, 0, W, hudH + 6);
      }
      drawHold();
      drawNext();
      drawStats();
      drawVoyagePanel();
      if (L.keys) drawControls(L.keys.x, L.keys.y, L.keys.w, L.keys.h, touchUI, 'COMMANDES');
      drawMascotPanel();
      if (portrait) {
        // fine ligne sous la bande du haut
        ctx.fillStyle = rgba(ACC, 0.35);
        ctx.fillRect(0, hudH, W, 1);
      }
      drawSab();
      drawFloaters();
      drawPops();
      drawCallout();
      drawBanner();
      drawTripFx();
      drawTripCard();
      if (flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(flashCol, flash * 0.5);
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (state === 'ready') {
        ctx.fillStyle = 'rgba(8,4,20,0.35)'; ctx.fillRect(gx, gy, gridW, gridH);
        const isGo = stateT >= 0.6;
        const lt = isGo ? stateT - 0.6 : stateT;
        const sc = easeOutBack(Math.min(1, lt / 0.25));
        const cy = gy + gridH * 0.42, D = EMPILO_WORLDS[WI];
        worldBadge(WI, gx + gridW / 2, cy - c * 2.6, c * 2.3, TOUR);
        bigText(isGo ? 'GO !' : 'PRÊT ?', gx + gridW / 2, cy, c * 2, isGo ? '#7dff6a' : '#ffd23f', gridW * 0.9, 1, sc, 0, true);
        bigText((TOUR ? 'TOUR ' + roman(TOUR) + ' · ' : '') + 'MONDE ' + D.n + ' · ' + D.name.toUpperCase(), gx + gridW / 2, cy + c * 1.75, c * 0.72, ACC, gridW * 0.92, 1, 1, 0, false);
        if (lvl0 > 1) bigText('NIVEAU ' + level, gx + gridW / 2, cy + c * 2.75, c * 0.62, '#ffffff', gridW * 0.9, 1, 1, 0, false);
      }
      if (state === 'over') {
        const a = Math.min(1, overT / 0.6);
        ctx.fillStyle = 'rgba(8,4,20,' + (0.5 * a) + ')'; ctx.fillRect(gx, gy, gridW, gridH);
        bigText('TERMINUS !', gx + gridW / 2, gy + gridH * 0.4, c * 1.7, '#ff4467', gridW * 0.92, a, 1 + (1 - a) * 0.4, 0, true);
        bigText(EMPILO_WORLDS[WI].name.toUpperCase() + ' · NIVEAU ' + level, gx + gridW / 2, gy + gridH * 0.4 + c * 1.6, c * 0.66, '#ffffff', gridW * 0.9, a, 1, 0, false);
      }
      if (state === 'tuto') drawTuto();
      if (paused) {
        ctx.fillStyle = 'rgba(8,4,20,0.82)';
        ctx.fillRect(0, 0, W, H);
        const ph = Math.min(H * 0.1, 56), ty = Math.max(ph * 0.85, H * 0.075);
        bigText('PAUSE', W / 2, ty, ph, ACC, W * 0.9, 1, 1, 0, true);
        const two = W >= 640 && W > H * 1.1;
        const top = ty + ph * 0.75, reserve = touchUI ? 44 + 18 + 36 : 44;
        let mx, my, mw, mh, kx, ky, kw, kh;
        if (two) {
          const colW = Math.min((W - 60) / 2, 430), avail = H - top - reserve;
          mw = colW; mh = Math.min(avail, 250); mx = W / 2 - colW - 10; my = top;
          kw = colW; kh = Math.min(avail, touchUI ? 260 : 330); kx = W / 2 + 10; ky = top;
        } else {
          mw = Math.min(W - 24, 430); mx = W / 2 - mw / 2; my = top; mh = clamp(H * 0.27, 170, 236);
          kw = Math.min(W - 32, 360); kx = W / 2 - kw / 2; ky = my + mh + 12; kh = Math.min(H - ky - reserve - 8, touchUI ? 236 : 320);
        }
        drawPauseMap(mx, my, mw, mh);
        if (kh > 96) drawControls(kx, ky, kw, kh, touchUI, touchUI ? 'GESTES' : 'TOUCHES');
        const ry = Math.max(my + mh, kh > 96 ? ky + kh : 0) + 22;
        ctx.font = '700 ' + Math.round(clamp(W * 0.04, 13, 18)) + 'px ' + FB;
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (!touchUI || ry < btnToggleRect().y - 8) ctx.fillText('Touche pour reprendre', W / 2, ry);
        if (touchUI) {
          const b = btnToggleRect();
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, b.x, b.y, b.w, b.h, 22); ctx.fill();
          ctx.strokeStyle = rgba(ACC, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.font = '700 14px ' + FB;
          ctx.fillText('Boutons à l’écran : ' + (showBtns ? 'OUI' : 'NON'), W / 2, b.y + b.h / 2 + 1);
        }
      }
    }

    let last = performance.now();
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      rtime += dt; sndBudget = 8;
      update(dt);
      render();
    }
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),
      currentLevel: () => level,
      // accès de diagnostic (harnais de test uniquement)
      _debug: {
        info: () => ({ score, lines, level, state, paused, tuto: tuto ? tuto.step : null,
          cur: cur ? { t: cur.t, x: cur.x, y: cur.y, r: cur.r, gold: cur.gold } : null, hold, holdUsed, next: nextQ.slice(0, NEXT_N),
          board: board.map(r => r.map(v => v || '.').join('')), clearing: !!clearing, mult, combo, b2b, lastClear, tspins, quads, pcs, maxCombo,
          ev: ev ? ev.k : null, gravity: gravity(), lockDelay: lockDelay(), sab: sab ? sab.idx : null, fx: shards.length + sparks.length + wfx.length + tfx.length,
          world: WI, tour: TOUR, stage: worldOf(level).stage, st: stNow, trip: trip ? { kind: trip.kind, t: trip.t, from: trip.from, to: trip.to } : null, tripPend: !!tripPend, airs,
          scenes: scenes.filter(Boolean).length,
          layout: { W, H, c, gx, gy, gridW, gridH, hold: L.hold, portrait, touchUI, showBtns, voyage: L.voyage } }),
        act: (a) => act(a),
        skipTuto: () => { if (state === 'tuto') tutoNext(true); },
        setLevel: (n) => { const old = level; level = Math.max(lvl0, n | 0); lines = (level - lvl0) * 10; if (level > old) { levelUp(old); if (tripPend && !clearing && state === 'play') startTrip(tripPend); } },
        // saut direct à un niveau (décor et monde du niveau, sans voyage) : pour les captures
        goto: (n) => { level = Math.max(1, n | 0); lines = Math.max(0, (level - lvl0) * 10); const Wd = worldOf(level); WI = Wd.w; TOUR = Wd.tour; stNow = stFrom = stTo = Wd.stage; stT = 9; trip = null; tripPend = null; palFrom = palTo = palFor(level); palK = 1; transT = -1; ACC = palTo.a; },
        skipTrip: () => tripSkip(),
        sceneSteps: (w) => { const S = makeScene(w, W, H, sceneQ, true), t = []; while (S.gen) { const a = performance.now(); buildScene(S, 0); t.push(+(performance.now() - a).toFixed(1)); } return t; },
        tripAt: (t) => { if (trip) trip.t = t; },
        air: () => { if (cur && cur.t !== 'B') cur.air = 0; },
        event: (k) => { if (state === 'play') startEvent(k); },
        setBoard: (rows) => {
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { board[y][x] = null; headBoard[y][x] = -1; goldBoard[y][x] = 0; airBoard[y][x] = 0; varBoard[y][x] = (x * 7 + y * 3) & 3; }
          const off = ROWS - rows.length;
          rows.forEach((s, i) => { for (let x = 0; x < COLS; x++) if (s[x] && s[x] !== '.') { const ch = s[x]; if (ch === '*') { board[off + i][x] = 'J'; goldBoard[off + i][x] = 1; } else if (ch === 'o') { board[off + i][x] = 'I'; airBoard[off + i][x] = 1; } else board[off + i][x] = ch; } });
        },
        setCur: (t, x, y, r) => { cur = { t, r: r || 0, x, y, head: null, gold: -1, air: -1, vv: [0, 1, 2, 3], born: time }; lastAct = ''; lockT = 0; lockResets = 0; fallT = 0; lowestY = y; },
        queue: (t) => { nextQ.unshift(t); },
        gold: () => { if (cur && cur.t !== 'B') cur.gold = 0; },
        special: () => { if (cur && heads.length) cur.head = { k: 0, idx: 0 }; },
        summon: () => summonSab(),
        sabFast: () => { if (sab) sab.riseT = Math.min(sab.riseT, 0.5); },
        forceClear: (n) => {
          if (clearing || state !== 'play') return;
          for (let k = 0; k < n; k++) { const y = ROWS - 1 - k; for (let x = 0; x < COLS; x++) { board[y][x] = TYPES[(x + k) % 7]; headBoard[y][x] = -1; goldBoard[y][x] = 0; airBoard[y][x] = 0; varBoard[y][x] = (x + k) & 3; } }
          const rows = []; for (let k = 0; k < n; k++) rows.push(ROWS - 1 - k);
          cur = null;
          resolveClear(rows, 0, 'I', 0, ROWS - 2);
        }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        try { ro.disconnect(); } catch (e) { /* */ }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* */ } }
        listeners.length = 0;
        sfxQ.length = 0;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['empilo'] = {
    id: 'empilo',
    title: 'Empilo',
    tagline: 'Empile, casse des lignes et voyage de la plaine jusqu’au cœur de la galaxie !',
    accent: '#a98bff',
    scoreLabel: 'points',
    worlds: EMPILO_WORLDS,          // le parcours (carte d'avancement de la bibliothèque)
    levelsPerWorld: WPL,
    worldOf,                        // niveau → { w, n, tour, stage, world }
    preview,
    mount
  };
})();
