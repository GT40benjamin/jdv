(() => {
  'use strict';

  // ===========================================================================
  // CASSE-CARREAUX — « Le tour du monde des carreaux »
  // Un casse-briques moderne en VOYAGE : on part de Lisbonne (azulejos bleus et blancs), on traverse
  // le Maroc (zelliges), les thermes de Rome (mosaïques), le Japon (fresque du mont Fuji), le Mexique
  // (talavera) et on finit au Palais de cristal, au bout du monde. Chaque pays a son décor animé, la
  // matière de ses carreaux, sa gamme musicale (les carreaux chantent dans la gamme du pays), sa
  // nouveauté de jeu et son BOSS à trois phases. Entre deux pays : le tampon du passeport, puis l'avion
  // (piloté par le joueur) survole le globe jusqu'au pays suivant. Après le Palais de cristal : le Tour II,
  // plus coriace, puis le Tour III…
  // Une seule vie (la bille tombe = fin). Têtes des copains : carreaux-portraits et boss (api.heads).
  // Contrat : source/CONTRACT.md (gameOver une fois, currentScore, currentLevel, startLevel, seed).
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // CARREAUX_WORLDS : le parcours (exposé à la bibliothèque : JDW_GAMES.carreaux.worlds, levelsPerWorld, worldOf(niveau),
  // et pour la future carte d'avancement : drawWorldIcon(ctx, n, x, y, r, t) = médaillon du pays, drawWorldStamp(ctx, n, x, y, r)
  // = tampon du passeport (pays terminé), drawBossIcon(ctx, n, x, y, r, t) = le boss du pays ; n = 1..6).
  // 3 niveaux par monde (le 3e = le BOSS du monde), 6 mondes = un TOUR de 18 niveaux. Tour k : niveaux + 18 × (k − 1).
  //   id, n (numéro du monde), name (nom affiché), short (nom court), place (ville), tiles (les carreaux du pays),
  //   emoji, levels [début, fin] au Tour I, colors { accent, accent2, sky, ground, dark, light },
  //   boss { id, name, title, line, level } (level = niveau du boss au Tour I), news (nouveautés de jeu),
  //   desc (description courte), when (moment de la journée), stages (noms des 3 niveaux), music (ambiance sonore),
  //   geo { lat, lon } (position sur le globe du voyage).
  // ---------------------------------------------------------------------------
  const CARREAUX_WORLDS = [
    { id: 'portugal', n: 1, name: 'Le Portugal', short: 'Portugal', place: 'Lisbonne', tiles: 'Les azulejos', emoji: '🐓', levels: [1, 3],
      colors: { accent: '#3b82ff', accent2: '#ffcf3a', sky: '#8fd3ff', ground: '#f3e7cf', dark: '#0a1a38', light: '#ffffff' },
      boss: { id: 'coq', name: 'Le Coq de Barcelos', title: 'Coq de Barcelos', line: 'Cocorico ! Mes œufs vont pleuvoir !', level: 3 },
      news: [{ emoji: '🚋', name: 'Le tramway', text: 'une rangée de carreaux qui roule' }, { emoji: '🧱', name: 'Carreaux solides', text: 'deux coups pour les casser' }],
      desc: 'Lisbonne au petit matin : collines, tramway jaune et carreaux bleus.', when: 'Le matin',
      stages: ['Les azulejos', 'Le tramway 28', 'Le Coq de Barcelos'], music: 'Guitare portugaise', geo: { lat: 38.7, lon: -9.1 } },
    { id: 'maroc', n: 2, name: 'Le Maroc', short: 'Maroc', place: 'Marrakech', tiles: 'Les zelliges', emoji: '🐪', levels: [4, 6],
      colors: { accent: '#19c9a3', accent2: '#ff8a3d', sky: '#ffb66e', ground: '#d98b4b', dark: '#2a1206', light: '#fff1d6' },
      boss: { id: 'theiere', name: 'La Grande Théière', title: 'Grande Théière', line: 'Un petit thé à la menthe ? Attention, ça éclabousse !', level: 6 },
      news: [{ emoji: '✴️', name: 'Les rosaces', text: 'des étoiles de zellige qui tournent' }, { emoji: '🪔', name: 'Le cuivre', text: 'des carreaux en cuivre incassables' }],
      desc: 'Un riad de Marrakech au soleil de l\'après-midi : arcades, fontaine et lanternes.', when: "L'après-midi",
      stages: ['La médina', 'Les rosaces', 'La Grande Théière'], music: 'Luth et percussions', geo: { lat: 31.6, lon: -8.0 } },
    { id: 'rome', n: 3, name: "L'Italie", short: 'Italie', place: 'Rome', tiles: 'Les mosaïques', emoji: '🏛️', levels: [7, 9],
      colors: { accent: '#ffb23e', accent2: '#2fc7d4', sky: '#ff9a72', ground: '#eadcc2', dark: '#2a1410', light: '#fff4e0' },
      boss: { id: 'neptune', name: 'Neptune', title: 'Neptune', line: 'Par ma barbe ! Qui ose casser ma mosaïque ?', level: 9 },
      news: [{ emoji: '♨️', name: 'La vapeur', text: 'les geysers soufflent la bille vers le haut' }, { emoji: '🔹', name: 'Les tesselles', text: 'des mini-carreaux par centaines' }],
      desc: 'Les thermes de Rome au coucher du soleil : colonnes, bassins fumants et mosaïques.', when: 'Le coucher du soleil',
      stages: ['Les thermes', 'Le dauphin', 'Neptune'], music: 'Trompettes romaines', geo: { lat: 41.9, lon: 12.5 } },
    { id: 'japon', n: 4, name: 'Le Japon', short: 'Japon', place: 'Kyoto', tiles: 'La fresque du bain', emoji: '🗻', levels: [10, 12],
      colors: { accent: '#ff7aa8', accent2: '#ff5a3d', sky: '#7d6cd8', ground: '#4a3a52', dark: '#140c26', light: '#ffe8f2' },
      boss: { id: 'chat', name: 'Le Chat porte-bonheur', title: 'Chat porte-bonheur', line: 'Miaou ! Ma patte porte bonheur… pas à toi !', level: 12 },
      news: [{ emoji: '🗻', name: 'La fresque', text: 'chaque carreau est un morceau du tableau' }, { emoji: '🚪', name: 'Les portes coulissantes', text: 'elles s\'ouvrent et se ferment' }],
      desc: 'Un bain en plein air au crépuscule : cerisiers en fleurs, lanternes et mont Fuji.', when: 'Le crépuscule',
      stages: ['La fresque du mont Fuji', 'Les portes coulissantes', 'Le Chat porte-bonheur'], music: 'Koto et clochettes', geo: { lat: 35.0, lon: 135.8 } },
    { id: 'mexique', n: 5, name: 'Le Mexique', short: 'Mexique', place: 'Puebla', tiles: 'La talavera', emoji: '🌵', levels: [13, 15],
      colors: { accent: '#ff4fa8', accent2: '#ffd23f', sky: '#24125e', ground: '#7a3b8f', dark: '#0c0620', light: '#fff0d0' },
      boss: { id: 'pinata', name: 'La Piñata géante', title: 'Piñata géante', line: '¡Hola! Attrape-moi si tu peux !', level: 15 },
      news: [{ emoji: '🎆', name: 'Les fusées', text: 'un carreau-fusée explose en feu d\'artifice' }, { emoji: '🌵', name: 'La descente', text: 'le carrelage descend : vite !' }],
      desc: 'La fiesta, la nuit : guirlandes de papier, maisons colorées et feux d\'artifice.', when: 'La nuit de fête',
      stages: ['La fiesta', 'Le soleil', 'La Piñata géante'], music: 'Trompettes de mariachis', geo: { lat: 19.0, lon: -98.2 } },
    { id: 'cristal', n: 6, name: 'Le Palais de cristal', short: 'Cristal', place: 'Le Grand Nord', tiles: 'Les cristaux', emoji: '💎', levels: [16, 18],
      colors: { accent: '#7ef0ff', accent2: '#c79bff', sky: '#071833', ground: '#cfe9ff', dark: '#020814', light: '#ffffff' },
      boss: { id: 'lustre', name: 'Le Grand Lustre', title: 'Grand Lustre', line: 'Mille cristaux pour t\'éblouir !', level: 18 },
      news: [{ emoji: '🔷', name: 'Les prismes', text: 'ils dédoublent la bille' }, { emoji: '🧊', name: 'La glace', text: 'des blocs de glace qui résistent' }],
      desc: 'Au bout du monde, sous les aurores boréales : le palais de glace et de cristal.', when: 'La nuit polaire',
      stages: ['Les cristaux', 'Le flocon', 'Le Grand Lustre'], music: 'Harmonica de verre', geo: { lat: 78.0, lon: -20.0 } }
  ];
  const WPL = 3, NW = CARREAUX_WORLDS.length, TOUR_LEN = WPL * NW;   // niveaux par monde, mondes, niveaux par tour
  // niveau (1, 2, …) → { w (0..5), n (1..6), tour (0 = Tour I), stage (0..2), boss (3e niveau du monde), world }
  function worldOf(level) {
    const i = Math.max(0, (Math.floor(Number(level)) || 1) - 1), wi = Math.floor(i / WPL);
    return { w: wi % NW, n: wi % NW + 1, tour: Math.floor(wi / NW), stage: i % WPL, boss: i % WPL === WPL - 1, world: CARREAUX_WORLDS[wi % NW] };
  }
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = (i) => ROMAN[i] || String(i + 1);

  // ---------------------------------------------------------------------------
  // Aire de jeu logique (unités) : mise à l'échelle uniforme, décor plein écran autour
  // ---------------------------------------------------------------------------
  const W = 384, H = 720;
  const HUD_H = 50;                     // bandeau du haut : la bille rebondit dessous
  const WALL = 9;                       // murs gauche / droite (épaisseur logique)
  const GRID_X = 16, GRID_W = 352;      // carrelage : 11 colonnes de 32 (ou 22 de 16 pour les mosaïques)
  const GRID_Y = 94;                    // haut de la première rangée (de la place au-dessus : la bille peut s'y faufiler)
  const PY = 664, PH = 15;              // dessus de la raquette, épaisseur
  const BR = 7;                         // rayon de la bille
  const DANGER_Y = 596;                 // le carrelage qui descend ne doit pas atteindre cette ligne
  const MAX_BALLS = 9;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const TUTO_KEY = 'jdw.carreaux.tuto';
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";

  // ---------------------------------------------------------------------------
  // Petits outils
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  function easeOutBack(k) { k = clamp(k, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  // PRNG à graine (api.seed : même tirage à graine égale)
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hexRgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, (c) => c + c); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function toHex(r, g, b) { return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return toHex(lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)); }
  // éclaircit (k > 0, vers le blanc) ou assombrit (k < 0, vers le noir)
  function shade(h, k) { return k >= 0 ? mix(h, '#ffffff', k) : mix(h, '#000000', -k); }
  function fmt(n) { return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); for (const s of stops) g.addColorStop(s[0], s[1]); return g; }
  function rad(c, x, y, r0, x1, y1, r1, stops) { const g = c.createRadialGradient(x, y, Math.max(0, r0), x1, y1, Math.max(0.01, r1)); for (const s of stops) g.addColorStop(s[0], s[1]); return g; }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
  function star(c, x, y, n, r0, r1, rot) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (rot || 0) + (i / (n * 2)) * TAU - Math.PI / 2, r = i % 2 ? r1 : r0; if (i) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
  }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  function imgW(im) { return im.naturalWidth || im.width || 1; }
  function imgH(im) { return im.naturalHeight || im.height || 1; }
  // dessine une tête (ratio ~0,8) dans une boîte de hauteur h centrée en (x, y)
  function drawHeadImg(c, img, x, y, h) {
    if (!imgOk(img)) return;
    const k = h / imgH(img), w = imgW(img) * k;
    c.drawImage(img, x - w / 2, y - h / 2, w, h);
  }

  // ---------------------------------------------------------------------------
  // Musique des carreaux : chaque pays a sa gamme (les carreaux cassés montent la gamme avec le combo)
  // ---------------------------------------------------------------------------
  const SCALES = {
    portugal: { notes: [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760], type: 'triangle', vol: 0.05, bend: 0.985 },
    maroc: { notes: [587, 622, 740, 784, 880, 932, 1047, 1175, 1245, 1480], type: 'square', vol: 0.03, bend: 0.97 },
    rome: { notes: [587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397], type: 'square', vol: 0.032, bend: 1.0 },
    japon: { notes: [659, 698, 880, 988, 1047, 1319, 1397, 1760, 1976, 2093], type: 'sine', vol: 0.06, bend: 0.96 },
    mexique: { notes: [784, 880, 988, 1047, 1175, 1319, 1480, 1568, 1760, 1976], type: 'square', vol: 0.032, bend: 1.01 },
    cristal: { notes: [1047, 1175, 1319, 1480, 1568, 1760, 1976, 2093, 2349, 2637], type: 'sine', vol: 0.05, bend: 1.0 }
  };
  // petite mélodie d'arrivée dans chaque pays (degrés de la gamme)
  const JINGLES = {
    portugal: [0, 2, 4, 3, 2, 4, 5], maroc: [0, 1, 2, 3, 4, 3, 2, 1], rome: [0, 4, 4, 5, 4, 7, 7],
    japon: [0, 2, 3, 5, 3, 2, 4], mexique: [0, 2, 4, 5, 7, 5, 7, 9], cristal: [0, 4, 7, 9, 7, 4, 9, 9]
  };

  // ---------------------------------------------------------------------------
  // Bonus (capsules) : bons et malus. from = premier niveau où ils peuvent tomber.
  // ---------------------------------------------------------------------------
  const POWERS = {
    multi:  { name: 'MULTI-BILLES', short: 'MULTI', color: '#3fb6ff', weight: 20, dur: 0, from: 1 },
    large:  { name: 'RAQUETTE XL', short: 'XL', color: '#4cd66a', weight: 18, dur: 15, from: 1 },
    laser:  { name: 'LASER !', short: 'LASER', color: '#ff4d6d', weight: 14, dur: 9, from: 2 },
    magnet: { name: 'AIMANT', short: 'AIMANT', color: '#b07cff', weight: 12, dur: 14, from: 1 },
    fire:   { name: 'BILLE DE FEU !', short: 'FEU', color: '#ff8a1f', weight: 9, dur: 7, from: 3 },
    slow:   { name: 'RALENTI', short: 'LENT', color: '#5ef0ff', weight: 12, dur: 10, from: 1 },
    net:    { name: 'FILET DE SÉCURITÉ', short: 'FILET', color: '#ffd34d', weight: 7, dur: 14, from: 2 },
    mini:   { name: 'MINI-RAQUETTE…', short: 'MINI', color: '#8a96a8', weight: 12, dur: 9, from: 4, bad: true },
    turbo:  { name: 'TURBO !', short: 'TURBO', color: '#8a96a8', weight: 10, dur: 7, from: 5, bad: true }
  };
  const POWER_KEYS = Object.keys(POWERS);
  const EFF_KEYS = POWER_KEYS.filter((k) => POWERS[k].dur > 0);

  // textes (toujours gentils)
  const CHEERS = [
    'Carrelage impeccable, bravo !', 'Quel coup de raquette !', 'Bravo, grand voyageur !', 'Tout est cassé, champion !',
    'Même le boss applaudit !', 'Magnifique, on continue !', 'Bien joué, en route !', 'Quel talent de carreleur !'
  ];
  const BOSS_CHEERS = ['Boss battu, bravo !', 'Quel champion du monde !', 'Le boss est en miettes !', 'Pays libéré, bravo !'];
  const COMBO_WORDS = [[8, 'SUPER !'], [15, 'GÉNIAL !'], [25, 'INCROYABLE !'], [40, 'LÉGENDAIRE !'], [60, 'DIVIN !']];

  // ===========================================================================
  // MATIÈRES DES CARREAUX — un peintre par pays. Un carreau est peint dans la boîte [0, s] × [0, s]
  // (s = 32 unités, 16 pour les tesselles de Rome), avec son vernis, son biseau et son motif.
  // Types : n (normal, 1 coup), s (solide, 2 coups), h (épais, 3 coups), m (incassable), x (pétard),
  // g (cadeau : contient un bonus), k (fusée, Mexique), z (prisme, Cristal), f (fresque, Japon : morceau du tableau).
  // ===========================================================================
  const TILE_PAL = {
    portugal: { glaze: '#f3f6fb', ink: '#1d4fb8', ink2: '#5e93e6', gold: '#f0b431', green: '#2f8a5c', grout: '#c9d6e6', dark: '#0d2a66' },
    maroc: { cols: ['#0f8a5f', '#17b5ad', '#1d4ea0', '#c4552a', '#e3a63a', '#f1e9da', '#22201d'], grout: '#efe3cc', brass: '#c9973b' },
    rome: { grout: '#d9ccb2' },
    japon: { pastel: ['#ffb6ca', '#a8e7cf', '#a9d4f4', '#fff0c4', '#cfbdf2', '#ffd0a8'], grout: '#f4efe6', wood: '#5a3622', red: '#d8402e' },
    mexique: { glaze: '#fbf7ee', blue: '#1c3f9e', yellow: '#f6c430', orange: '#f07b26', green: '#2e9a52', pink: '#ff5f9f', turq: '#20b8c4', grout: '#e8dccb' },
    cristal: { cols: ['#5ff2ff', '#b48cff', '#ff8fd6', '#eaf6ff', '#7dffc4'], grout: '#bfe7ff' }
  };
  // tesselles de Rome : couleurs des images en mosaïque (lettres des plans de niveau)
  const TESS = {
    w: '#efe6d2', k: '#2b2622', t: '#b5553a', o: '#d79b3f', y: '#e9c457', b: '#2c79a6', c: '#3aa9a2', l: '#8fcadb',
    g: '#8b8880', v: '#6e8e48', r: '#a63b2e', p: '#dc8f7d', n: '#7a4a2c', s: '#c9c2b4', d: '#1d4a72', e: '#5fb8c9'
  };
  // couleur moyenne d'un carreau (éclats, poussière) : [principale, secondaire]
  function tileColors(wid, kind, v) {
    const P = TILE_PAL[wid];
    if (kind === 'm') return wid === 'maroc' ? ['#c9973b', '#7a5420'] : wid === 'rome' ? ['#f2eee6', '#b9b2a6'] : wid === 'japon' ? ['#6b4128', '#2a1a10'] : wid === 'mexique' ? ['#c8ccd2', '#7d838c'] : wid === 'cristal' ? ['#1d3a7a', '#7fb8ff'] : ['#3a4458', '#1a2030'];
    switch (wid) {
      case 'portugal': return kind === 's' || kind === 'h' ? [P.ink, P.glaze] : [P.glaze, v === 2 ? P.gold : P.ink];
      case 'maroc': { const c = P.cols[v % 5]; return [c, P.cols[(v + 2) % 5]]; }
      case 'rome': return [TESS[v] || TESS.w, '#d9ccb2'];
      case 'japon': return kind === 's' || kind === 'h' ? ['#3c4a5e', '#8a98ac'] : [P.pastel[v % P.pastel.length], '#ffffff'];
      case 'mexique': return [v === 3 ? P.pink : v === 4 ? P.orange : v === 5 ? P.turq : P.glaze, v === 1 ? P.yellow : P.blue];
      case 'cristal': return [P.cols[v % P.cols.length], '#ffffff'];
    }
    return ['#cccccc', '#888888'];
  }

  // ---------- vernis commun : reflet, brillance, biseau ----------
  function glazeFx(g, s, r, k, matte) {
    g.save();
    rr(g, 0, 0, s, s, r); g.clip();
    g.fillStyle = lin(g, 0, 0, s * 0.75, s, [[0, 'rgba(255,255,255,' + (matte ? 0.16 : 0.42) * k + ')'], [0.42, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,' + (matte ? 0.24 : 0.2) * k + ')']]);
    g.fillRect(0, 0, s, s);
    if (!matte) {
      g.globalAlpha = 0.2 * k;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(s * 0.06, s * 0.58); g.lineTo(s * 0.58, s * 0.06); g.lineTo(s * 0.72, s * 0.06); g.lineTo(s * 0.06, s * 0.72); g.closePath(); g.fill();
      g.globalAlpha = 0.5 * k;
      ell(g, s * 0.24, s * 0.2, s * 0.13, s * 0.05, -0.7); g.fill();
    }
    g.restore();
    // biseau : bord clair en haut à gauche, sombre en bas à droite
    const lw = Math.max(0.6, s * 0.045);
    g.lineWidth = lw;
    g.strokeStyle = 'rgba(255,255,255,' + (matte ? 0.25 : 0.55) * k + ')';
    g.beginPath(); g.moveTo(r, lw / 2); g.lineTo(s - r, lw / 2); g.moveTo(lw / 2, r); g.lineTo(lw / 2, s - r); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,' + 0.3 * k + ')';
    g.beginPath(); g.moveTo(r, s - lw / 2); g.lineTo(s - r, s - lw / 2); g.moveTo(s - lw / 2, r); g.lineTo(s - lw / 2, s - r); g.stroke();
  }
  function baseTile(g, s, r, fill) { rr(g, 0, 0, s, s, r); g.fillStyle = fill; g.fill(); }
  // rivets / clous dorés aux coins
  function rivets(g, s, col, m, rv) {
    for (const [x, y] of [[m, m], [s - m, m], [m, s - m], [s - m, s - m]]) {
      g.fillStyle = shade(col, -0.35); circ(g, x, y, rv); g.fill();
      g.fillStyle = col; circ(g, x - rv * 0.15, y - rv * 0.15, rv * 0.75); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; circ(g, x - rv * 0.35, y - rv * 0.35, rv * 0.3); g.fill();
    }
  }
  function goldFrame(g, s, r, w, col) {
    g.lineWidth = w;
    g.strokeStyle = lin(g, 0, 0, s, s, [[0, shade(col, 0.45)], [0.5, col], [1, shade(col, -0.35)]]);
    rr(g, w / 2, w / 2, s - w, s - w, Math.max(0, r - w / 2)); g.stroke();
  }

  // ---------- Portugal : azulejos (bleu cobalt peint à la main sur émail blanc) ----------
  function petals(g, cx, cy, n, r0, r1, wd, rot, fill) {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.beginPath(); g.moveTo(0, -r0); g.quadraticCurveTo(wd, -(r0 + r1) / 2, 0, -r1); g.quadraticCurveTo(-wd, -(r0 + r1) / 2, 0, -r0); g.closePath();
      g.fillStyle = fill; g.fill();
      g.restore();
    }
  }
  function paintAzulejo(g, kind, v, s) {
    const P = TILE_PAL.portugal, r = s * 0.08;
    const k = s / 32;
    const ink = P.ink, ink2 = P.ink2;
    if (kind === 'm') {
      // fer forgé (balcon de Lisbonne) : métal sombre, volutes
      baseTile(g, s, r, lin(g, 0, 0, 0, s, [[0, '#4a5570'], [0.5, '#2c3448'], [1, '#1a2030']]));
      g.strokeStyle = '#7d8aa8'; g.lineWidth = 1.6 * k; g.lineCap = 'round';
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(s / 2, s * 0.15); g.bezierCurveTo(s / 2 + sx * s * 0.34, s * 0.2, s / 2 + sx * s * 0.34, s * 0.62, s / 2 + sx * s * 0.12, s * 0.55);
        g.bezierCurveTo(s / 2 - sx * s * 0.02, s * 0.5, s / 2 + sx * s * 0.08, s * 0.38, s / 2 + sx * s * 0.16, s * 0.44); g.stroke();
      }
      g.beginPath(); g.moveTo(s / 2, s * 0.12); g.lineTo(s / 2, s * 0.88); g.stroke();
      rivets(g, s, '#9aa6c0', 4.2 * k, 1.9 * k);
      glazeFx(g, s, r, 0.8, true);
      return;
    }
    const heavy = kind === 'h', solid = kind === 's';
    if (solid || heavy) {
      // azulejo « en relief » : fond cobalt, motif blanc, liseré d'or
      baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#2f66d8'], [1, '#163f9c']]));
      g.save(); rr(g, 0, 0, s, s, r); g.clip();
      g.fillStyle = '#f6f9ff';
      petals(g, s / 2, s / 2, 8, s * 0.07, s * 0.36, s * 0.085, 0, '#f6f9ff');
      g.fillStyle = P.gold; circ(g, s / 2, s / 2, s * 0.085); g.fill();
      for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.fillStyle = 'rgba(246,249,255,0.9)'; circ(g, x, y, s * 0.17); g.fill(); g.fillStyle = '#2f66d8'; circ(g, x, y, s * 0.09); g.fill(); }
      g.restore();
      if (heavy) { goldFrame(g, s, r, 2.6 * k, P.gold); rivets(g, s, P.gold, 4.6 * k, 1.6 * k); }
      glazeFx(g, s, r, 1, false);
      return;
    }
    baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#fbfdff'], [1, '#e6edf6']]));
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    switch (v % 5) {
      case 0: { // padrão : rosace centrale + quarts de cercle aux coins (des cercles se forment entre carreaux)
        for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) {
          g.strokeStyle = ink; g.lineWidth = 2.2 * k; circ(g, x, y, s * 0.3); g.stroke();
          g.strokeStyle = ink2; g.lineWidth = 1.4 * k; circ(g, x, y, s * 0.21); g.stroke();
          g.fillStyle = ink; circ(g, x, y, s * 0.1); g.fill();
        }
        petals(g, s / 2, s / 2, 8, s * 0.06, s * 0.3, s * 0.07, Math.PI / 8, ink2);
        petals(g, s / 2, s / 2, 4, s * 0.05, s * 0.32, s * 0.1, 0, ink);
        g.fillStyle = P.gold; circ(g, s / 2, s / 2, s * 0.07); g.fill();
        g.strokeStyle = ink; g.lineWidth = 0.9 * k; circ(g, s / 2, s / 2, s * 0.07); g.stroke();
        break;
      }
      case 1: { // frise : tresse en vague
        g.fillStyle = 'rgba(29,79,184,0.12)'; g.fillRect(0, 0, s, s);
        g.strokeStyle = ink; g.lineWidth = 2.4 * k;
        g.beginPath(); for (let x = -2; x <= s + 2; x += 1) { const y = s / 2 + Math.sin((x / s) * TAU) * s * 0.22; if (x === -2) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        g.strokeStyle = ink2; g.lineWidth = 1.6 * k;
        g.beginPath(); for (let x = -2; x <= s + 2; x += 1) { const y = s / 2 - Math.sin((x / s) * TAU) * s * 0.22; if (x === -2) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        g.fillStyle = ink; for (const x of [s * 0.25, s * 0.75]) { circ(g, x, s / 2, s * 0.06); g.fill(); }
        g.strokeStyle = ink; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(0, s * 0.08); g.lineTo(s, s * 0.08); g.moveTo(0, s * 0.92); g.lineTo(s, s * 0.92); g.stroke();
        break;
      }
      case 2: { // étoile jaune et bleue
        g.fillStyle = 'rgba(240,180,49,0.18)'; g.fillRect(0, 0, s, s);
        star(g, s / 2, s / 2, 8, s * 0.42, s * 0.2, Math.PI / 8); g.fillStyle = P.gold; g.fill();
        g.strokeStyle = shade(P.gold, -0.35); g.lineWidth = 1 * k; g.stroke();
        star(g, s / 2, s / 2, 4, s * 0.3, s * 0.12, 0); g.fillStyle = ink; g.fill();
        g.fillStyle = '#ffffff'; circ(g, s / 2, s / 2, s * 0.06); g.fill();
        for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.fillStyle = ink2; circ(g, x, y, s * 0.16); g.fill(); }
        break;
      }
      case 3: { // treillis en losanges
        g.strokeStyle = ink; g.lineWidth = 1.7 * k;
        g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.lineTo(0, s / 2); g.closePath(); g.stroke();
        g.strokeStyle = ink2; g.lineWidth = 1.1 * k;
        g.beginPath(); g.moveTo(s / 2, s * 0.16); g.lineTo(s * 0.84, s / 2); g.lineTo(s / 2, s * 0.84); g.lineTo(s * 0.16, s / 2); g.closePath(); g.stroke();
        petals(g, s / 2, s / 2, 4, s * 0.03, s * 0.2, s * 0.08, Math.PI / 4, ink);
        g.fillStyle = ink; for (const [x, y] of [[s / 2, 0], [s, s / 2], [s / 2, s], [0, s / 2]]) { circ(g, x, y, s * 0.06); g.fill(); }
        break;
      }
      default: { // camélia bleu, feuilles vertes
        g.fillStyle = 'rgba(94,147,230,0.16)'; g.fillRect(0, 0, s, s);
        for (const a of [0.8, 2.4, 3.9, 5.5]) { g.save(); g.translate(s / 2, s / 2); g.rotate(a); g.fillStyle = P.green; ell(g, s * 0.3, 0, s * 0.12, s * 0.05, 0); g.fill(); g.restore(); }
        petals(g, s / 2, s / 2, 6, s * 0.04, s * 0.27, s * 0.12, 0, ink2);
        petals(g, s / 2, s / 2, 6, s * 0.03, s * 0.17, s * 0.08, Math.PI / 6, ink);
        g.fillStyle = P.gold; circ(g, s / 2, s / 2, s * 0.06); g.fill();
        g.strokeStyle = ink; g.lineWidth = 1.2 * k; rr(g, s * 0.06, s * 0.06, s * 0.88, s * 0.88, s * 0.06); g.stroke();
      }
    }
    // léger « coup de pinceau » : le bleu n'est jamais parfait
    g.globalAlpha = 0.08; g.fillStyle = ink;
    for (let i = 0; i < 5; i++) { circ(g, hash(v * 13 + i) * s, hash(v * 7 + i * 3) * s, s * 0.05); g.fill(); }
    g.globalAlpha = 1;
    g.restore();
    glazeFx(g, s, r, 1, false);
  }

  // ---------- Maroc : zelliges (étoile à 8 branches, pièces d'émail taillées) ----------
  function paintZellige(g, kind, v, s) {
    const P = TILE_PAL.maroc, r = s * 0.05, k = s / 32;
    if (kind === 'm') {
      // plaque de cuivre gravée
      baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#f0c66a'], [0.35, '#c9973b'], [0.7, '#9a6a24'], [1, '#d9a94c']]));
      g.strokeStyle = 'rgba(90,52,10,0.55)'; g.lineWidth = 1 * k;
      star(g, s / 2, s / 2, 8, s * 0.36, s * 0.27, Math.PI / 8); g.stroke();
      star(g, s / 2, s / 2, 8, s * 0.2, s * 0.14, 0); g.stroke();
      circ(g, s / 2, s / 2, s * 0.06); g.stroke();
      rivets(g, s, '#ffe08a', 3.6 * k, 1.5 * k);
      glazeFx(g, s, r, 0.9, false);
      return;
    }
    const cols = P.cols;
    const main = cols[v % 5], sec = cols[(v + 2) % 5], third = cols[(v + 1) % 5];
    const heavy = kind === 'h', solid = kind === 's';
    // fond : petits carrés posés en biais (les pièces taillées), joints crème
    baseTile(g, s, r, P.grout);
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    const gap = 0.9 * k;
    // quatre coins : pièces « en cerf-volant »
    for (let q = 0; q < 4; q++) {
      g.save(); g.translate(s / 2, s / 2); g.rotate(q * Math.PI / 2);
      g.fillStyle = sec;
      poly(g, [-s / 2 + gap, -s / 2 + gap, -s * 0.12, -s / 2 + gap, -s * 0.3 + gap, -s * 0.3 + gap, -s / 2 + gap, -s * 0.12]); g.fill();
      g.fillStyle = third;
      poly(g, [-s * 0.08, -s / 2 + gap, s * 0.08, -s / 2 + gap, 0, -s * 0.36]); g.fill();
      g.restore();
    }
    // étoile à 8 branches (khatam)
    star(g, s / 2, s / 2, 8, s * 0.43, s * 0.31, Math.PI / 8);
    g.fillStyle = P.grout; g.fill();
    star(g, s / 2, s / 2, 8, s * 0.4, s * 0.285, Math.PI / 8);
    g.fillStyle = lin(g, 0, 0, s, s, [[0, shade(main, 0.18)], [1, shade(main, -0.18)]]); g.fill();
    // cœur de l'étoile
    star(g, s / 2, s / 2, 8, s * 0.17, s * 0.12, 0);
    g.fillStyle = solid || heavy ? P.brass : cols[5]; g.fill();
    g.fillStyle = cols[(v + 3) % 5]; circ(g, s / 2, s / 2, s * 0.07); g.fill();
    // irrégularité de l'émail : chaque pièce brille un peu différemment
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = 0.12 + hash(v * 31 + i) * 0.1;
      g.fillStyle = i % 2 ? '#ffffff' : '#000000';
      ell(g, hash(v * 3 + i * 5) * s, hash(v * 11 + i * 7) * s, s * 0.12, s * 0.05, hash(i) * 3);
      g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
    if (solid) { g.strokeStyle = P.brass; g.lineWidth = 1.8 * k; circ(g, s / 2, s / 2, s * 0.43); g.stroke(); }
    if (heavy) { goldFrame(g, s, r, 2.8 * k, P.brass); rivets(g, s, '#ffe08a', 4.2 * k, 1.6 * k); }
    glazeFx(g, s, r, 1.05, false);
  }

  // ---------- Rome : tesselles (petits cubes de pierre et de pâte de verre) ----------
  function paintTessera(g, kind, v, s, seed) {
    const k = s / 16, sd = seed || 0;
    if (kind === 'm') {
      // marbre blanc veiné d'or
      baseTile(g, s, s * 0.06, lin(g, 0, 0, s, s, [[0, '#ffffff'], [0.6, '#e9e4da'], [1, '#c9c1b2']]));
      g.strokeStyle = 'rgba(160,140,110,0.5)'; g.lineWidth = 0.7 * k;
      g.beginPath(); g.moveTo(0, s * (0.3 + hash(sd) * 0.3)); g.bezierCurveTo(s * 0.3, s * 0.2, s * 0.6, s * 0.8, s, s * (0.4 + hash(sd + 1) * 0.3)); g.stroke();
      g.strokeStyle = 'rgba(214,170,70,0.6)'; g.lineWidth = 0.6 * k;
      g.beginPath(); g.moveTo(s * 0.2, 0); g.bezierCurveTo(s * 0.3, s * 0.4, s * 0.7, s * 0.3, s * 0.8, s); g.stroke();
      glazeFx(g, s, s * 0.06, 0.7, true);
      return;
    }
    const col = TESS[v] || TESS.w;
    const solid = kind === 's' || kind === 'h';
    // cube un peu de travers, pas tout à fait carré
    const j = (n) => (hash(sd * 7.3 + n) - 0.5) * 1.6 * k;
    const pts = [0.6 * k + j(1), 0.6 * k + j(2), s - 0.6 * k + j(3), 0.6 * k + j(4), s - 0.6 * k + j(5), s - 0.6 * k + j(6), 0.6 * k + j(7), s - 0.6 * k + j(8)];
    poly(g, pts);
    g.fillStyle = lin(g, 0, 0, s, s, [[0, shade(col, 0.16)], [1, shade(col, -0.2)]]); g.fill();
    // grain de la pierre
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(' + (i % 2 ? '255,255,255' : '0,0,0') + ',' + (0.08 + hash(sd + i * 3.1) * 0.08) + ')';
      circ(g, s * (0.15 + hash(sd + i) * 0.7), s * (0.15 + hash(sd + i * 2.3) * 0.7), s * (0.06 + hash(sd + i * 5.7) * 0.07)); g.fill();
    }
    if (v === 'y') { // tesselle d'or (pâte de verre dorée) : elle brille
      g.fillStyle = lin(g, 0, 0, s, s, [[0, 'rgba(255,255,220,0.8)'], [0.4, 'rgba(255,240,170,0)'], [0.7, 'rgba(255,255,255,0.35)'], [1, 'rgba(160,110,20,0.3)']]);
      poly(g, pts); g.fill();
    }
    if (solid) {
      // tesselle de marbre veiné (2 coups)
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.8 * k;
      g.beginPath(); g.moveTo(pts[0], s * 0.6); g.quadraticCurveTo(s * 0.5, s * 0.3, s - 1, s * 0.5); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.beginPath(); g.moveTo(s * 0.3, pts[1]); g.quadraticCurveTo(s * 0.6, s * 0.5, s * 0.4, s - 1); g.stroke();
    }
    // bord éclairé (biseau léger, aspect mat)
    g.lineWidth = 0.7 * k;
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.beginPath(); g.moveTo(pts[6], pts[7]); g.lineTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.moveTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); g.lineTo(pts[6], pts[7]); g.stroke();
    if (kind === 'h') { g.strokeStyle = 'rgba(233,196,87,0.9)'; g.lineWidth = 1.1 * k; poly(g, pts); g.stroke(); }
  }

  // ---------- Japon : carreaux du bain (pastel vernissé), tuiles kawara, poutres de bois ----------
  function paintSento(g, kind, v, s) {
    const P = TILE_PAL.japon, r = s * 0.07, k = s / 32;
    if (kind === 'm') {
      // poutre laquée rouge vermillon, ferrures noires (comme un torii)
      baseTile(g, s, r * 0.6, lin(g, 0, 0, 0, s, [[0, '#ff6a4f'], [0.5, '#d8402e'], [1, '#8f2418']]));
      g.fillStyle = '#1c1414'; g.fillRect(0, s * 0.12, s, s * 0.14); g.fillRect(0, s * 0.74, s, s * 0.14);
      g.fillStyle = '#e6b84a'; for (const x of [s * 0.2, s * 0.5, s * 0.8]) { circ(g, x, s * 0.19, 1.6 * k); g.fill(); circ(g, x, s * 0.81, 1.6 * k); g.fill(); }
      glazeFx(g, s, r * 0.6, 0.85, false);
      return;
    }
    if (kind === 's' || kind === 'h') {
      // tuile de toit kawara (gris bleuté) — 2 ou 3 coups
      baseTile(g, s, r, lin(g, 0, 0, 0, s, [[0, '#6f7f96'], [1, '#2c3648']]));
      g.strokeStyle = 'rgba(10,16,26,0.6)'; g.lineWidth = 1.4 * k;
      for (const y of [s * 0.33, s * 0.66]) { g.beginPath(); for (let x = 0; x <= s; x += 2) { const yy = y + Math.sin((x / s) * TAU * 2) * s * 0.05; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.8 * k;
      for (const y of [s * 0.3, s * 0.63]) { g.beginPath(); for (let x = 0; x <= s; x += 2) { const yy = y + Math.sin((x / s) * TAU * 2) * s * 0.05; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
      if (kind === 'h') { g.fillStyle = '#e6b84a'; circ(g, s / 2, s / 2, s * 0.13); g.fill(); g.fillStyle = '#8a5a12'; star(g, s / 2, s / 2, 5, s * 0.1, s * 0.04, 0); g.fill(); goldFrame(g, s, r, 2.2 * k, '#e6b84a'); }
      glazeFx(g, s, r, 0.95, false);
      return;
    }
    const col = P.pastel[v % P.pastel.length];
    // carreau vernissé uni, petits craquelés du vernis, une fleur de cerisier sur certains
    baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, shade(col, 0.25)], [1, shade(col, -0.12)]]));
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.5 * k;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(hash(v + i) * s, 0); g.lineTo(hash(v + i + 0.5) * s, s * 0.4); g.lineTo(hash(v + i + 0.7) * s, s); g.stroke(); }
    if (v % 3 === 0) { // sakura
      g.fillStyle = '#ffffff'; petals(g, s * 0.5, s * 0.5, 5, s * 0.03, s * 0.24, s * 0.12, 0.3, 'rgba(255,255,255,0.9)');
      g.fillStyle = '#ff7aa8'; circ(g, s / 2, s / 2, s * 0.06); g.fill();
    }
    g.restore();
    glazeFx(g, s, r, 1, false);
  }
  // morceau de la fresque (le tableau entier est peint une fois, chaque carreau en montre un morceau)
  function paintFresco(g, s, mural, sx, sy, sw, sh) {
    const r = s * 0.06;
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    g.drawImage(mural, sx, sy, sw, sh, 0, 0, s, s);
    g.restore();
    glazeFx(g, s, r, 0.9, false);
  }
  // le tableau du mont Fuji (style estampe : ciel dégradé, soleil rouge, vagues, cerisier)
  function paintFujiMural(g, w, h) {
    g.fillStyle = lin(g, 0, 0, 0, h, [[0, '#2f5fb6'], [0.45, '#8fc3ec'], [0.62, '#ffe0c8'], [1, '#ffd4a0']]);
    g.fillRect(0, 0, w, h);
    // soleil rouge
    g.fillStyle = '#e8432f'; circ(g, w * 0.78, h * 0.22, h * 0.12); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; circ(g, w * 0.76, h * 0.2, h * 0.08); g.fill();
    // nuages en bandes
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, ww] of [[0.08, 0.16, 0.3], [0.5, 0.36, 0.34], [0.02, 0.44, 0.22]]) { rr(g, w * x, h * y, w * ww, h * 0.035, h * 0.02); g.fill(); }
    // le mont Fuji
    const bx = w * 0.42, by = h * 0.82, top = h * 0.2;
    g.fillStyle = lin(g, 0, top, 0, by, [[0, '#2a4f9a'], [1, '#1c3470']]);
    g.beginPath(); g.moveTo(bx - w * 0.5, by); g.lineTo(bx - w * 0.1, top + h * 0.02); g.quadraticCurveTo(bx, top - h * 0.01, bx + w * 0.1, top + h * 0.02); g.lineTo(bx + w * 0.55, by); g.closePath(); g.fill();
    // neige du sommet
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(bx - w * 0.1, top + h * 0.02); g.quadraticCurveTo(bx, top - h * 0.01, bx + w * 0.1, top + h * 0.02);
    g.lineTo(bx + w * 0.18, top + h * 0.17); g.lineTo(bx + w * 0.11, top + h * 0.13); g.lineTo(bx + w * 0.06, top + h * 0.2); g.lineTo(bx, top + h * 0.14); g.lineTo(bx - w * 0.06, top + h * 0.21); g.lineTo(bx - w * 0.11, top + h * 0.14); g.lineTo(bx - w * 0.18, top + h * 0.18); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(28,52,112,0.35)'; g.lineWidth = h * 0.006;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(bx + (i - 2.5) * w * 0.035, top + h * 0.05); g.lineTo(bx + (i - 2.5) * w * 0.09, by); g.stroke(); }
    // vagues (style estampe)
    for (let row = 0; row < 3; row++) {
      const yy = h * (0.78 + row * 0.08);
      g.fillStyle = row % 2 ? '#1f4b8f' : '#2c66b8';
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w + 10; x += w / 14) g.quadraticCurveTo(x + w / 28, yy - h * 0.05, x + w / 14, yy);
      g.lineTo(w, h); g.closePath(); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = h * 0.008;
      for (let x = (row * w) / 28; x <= w; x += w / 14) { g.beginPath(); g.arc(x + w / 28, yy - h * 0.015, w * 0.018, Math.PI, TAU); g.stroke(); }
    }
    // branche de cerisier en fleurs
    g.strokeStyle = '#4a2a1a'; g.lineWidth = h * 0.018; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-5, h * 0.06); g.quadraticCurveTo(w * 0.18, h * 0.1, w * 0.3, h * 0.04); g.stroke();
    g.lineWidth = h * 0.01; g.beginPath(); g.moveTo(w * 0.12, h * 0.08); g.quadraticCurveTo(w * 0.16, h * 0.18, w * 0.24, h * 0.2); g.stroke();
    for (let i = 0; i < 14; i++) {
      const x = hash(i * 3.1) * w * 0.32, y = h * (0.02 + hash(i * 5.3) * 0.2);
      petals(g, x, y, 5, 1, h * 0.022, h * 0.012, hash(i) * 3, i % 3 ? '#ffc4d6' : '#ff8fb4');
    }
  }

  // ---------- Mexique : talavera (émail blanc, cobalt, jaune, orange) ----------
  function paintTalavera(g, kind, v, s) {
    const P = TILE_PAL.mexique, r = s * 0.06, k = s / 32;
    if (kind === 'm') {
      // fer-blanc poinçonné (hojalata)
      baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#f2f4f7'], [0.45, '#b9bfc8'], [1, '#e4e8ee']]));
      g.fillStyle = 'rgba(70,78,92,0.55)';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; circ(g, s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3, 0.9 * k); g.fill(); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; circ(g, s / 2 + Math.cos(a) * s * 0.15, s / 2 + Math.sin(a) * s * 0.15, 0.9 * k); g.fill(); }
      star(g, s / 2, s / 2, 6, s * 0.08, s * 0.04, 0); g.fill();
      rivets(g, s, '#e8edf3', 3.6 * k, 1.4 * k);
      glazeFx(g, s, r, 0.9, false);
      return;
    }
    const heavy = kind === 'h', solid = kind === 's';
    const bright = [P.glaze, P.glaze, P.glaze, P.pink, P.orange, P.turq][v % 6];
    baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, shade(bright, 0.1)], [1, shade(bright, -0.08)]]));
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    const blue = P.blue;
    if (solid || heavy) {
      // talavera épaisse : grand médaillon bleu, rayons jaunes
      g.fillStyle = blue; circ(g, s / 2, s / 2, s * 0.42); g.fill();
      star(g, s / 2, s / 2, 12, s * 0.38, s * 0.22, 0); g.fillStyle = P.yellow; g.fill();
      petals(g, s / 2, s / 2, 6, s * 0.03, s * 0.2, s * 0.08, 0, P.orange);
      g.fillStyle = '#ffffff'; circ(g, s / 2, s / 2, s * 0.07); g.fill();
    } else if (v % 6 >= 3) {
      // carreau uni coloré avec une fleur blanche
      petals(g, s / 2, s / 2, 6, s * 0.04, s * 0.32, s * 0.12, 0, 'rgba(255,255,255,0.92)');
      g.fillStyle = v % 6 === 3 ? P.yellow : v % 6 === 4 ? P.blue : P.pink; circ(g, s / 2, s / 2, s * 0.09); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) { circ(g, x, y, s * 0.1); g.fill(); }
    } else if (v % 6 === 1) {
      // arcs aux coins (des cercles se forment) + fleur jaune
      for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) {
        g.fillStyle = blue; circ(g, x, y, s * 0.32); g.fill();
        g.fillStyle = P.yellow; circ(g, x, y, s * 0.22); g.fill();
        g.fillStyle = P.orange; circ(g, x, y, s * 0.1); g.fill();
      }
      petals(g, s / 2, s / 2, 4, s * 0.04, s * 0.24, s * 0.1, Math.PI / 4, blue);
      g.fillStyle = P.green; circ(g, s / 2, s / 2, s * 0.06); g.fill();
    } else if (v % 6 === 2) {
      // étoile cobalt sur losange orange
      g.fillStyle = P.orange; poly(g, [s / 2, s * 0.06, s * 0.94, s / 2, s / 2, s * 0.94, s * 0.06, s / 2]); g.fill();
      star(g, s / 2, s / 2, 8, s * 0.36, s * 0.16, 0); g.fillStyle = blue; g.fill();
      g.fillStyle = P.yellow; circ(g, s / 2, s / 2, s * 0.08); g.fill();
    } else {
      // fleur à 4 pétales cobalt, cœur jaune, points orange
      petals(g, s / 2, s / 2, 4, s * 0.05, s * 0.4, s * 0.16, 0, blue);
      petals(g, s / 2, s / 2, 4, s * 0.04, s * 0.26, s * 0.08, Math.PI / 4, P.green);
      g.fillStyle = P.yellow; circ(g, s / 2, s / 2, s * 0.1); g.fill();
      g.fillStyle = P.orange; circ(g, s / 2, s / 2, s * 0.045); g.fill();
      g.fillStyle = P.orange; for (const [x, y] of [[s * 0.15, s * 0.15], [s * 0.85, s * 0.15], [s * 0.15, s * 0.85], [s * 0.85, s * 0.85]]) { circ(g, x, y, s * 0.05); g.fill(); }
    }
    g.restore();
    if (heavy) { goldFrame(g, s, r, 2.6 * k, P.yellow); rivets(g, s, P.orange, 4.4 * k, 1.5 * k); }
    glazeFx(g, s, r, 1, false);
  }

  // ---------- Palais de cristal : pierres taillées, glace givrée, diamant ----------
  function paintCrystal(g, kind, v, s) {
    const P = TILE_PAL.cristal, r = s * 0.1, k = s / 32;
    if (kind === 'm') {
      // glace éternelle : bleu nuit, lueur intérieure
      baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#2b5aa8'], [0.5, '#132a5c'], [1, '#0a1838']]));
      g.fillStyle = rad(g, s * 0.4, s * 0.4, 0, s * 0.4, s * 0.4, s * 0.5, [[0, 'rgba(126,240,255,0.45)'], [1, 'rgba(126,240,255,0)']]); g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(190,240,255,0.55)'; g.lineWidth = 0.8 * k;
      g.beginPath(); g.moveTo(s * 0.2, s * 0.8); g.lineTo(s * 0.45, s * 0.45); g.lineTo(s * 0.8, s * 0.3); g.moveTo(s * 0.45, s * 0.45); g.lineTo(s * 0.5, s * 0.15); g.stroke();
      glazeFx(g, s, r, 1, false);
      return;
    }
    if (kind === 's') {
      // bloc de glace givrée
      baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#ffffff'], [0.5, '#cfeeff'], [1, '#9fd2f4']]));
      g.save(); rr(g, 0, 0, s, s, r); g.clip();
      for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + hash(v + i) * 0.5) + ')'; circ(g, hash(i * 1.7 + v) * s, hash(i * 2.9 + v) * s, (0.4 + hash(i * 4.1) * 1.2) * k); g.fill(); }
      g.strokeStyle = 'rgba(80,160,220,0.5)'; g.lineWidth = 0.7 * k;
      for (let i = 0; i < 3; i++) { const a = i * 1.05; g.beginPath(); g.moveTo(s / 2 - Math.cos(a) * s * 0.35, s / 2 - Math.sin(a) * s * 0.35); g.lineTo(s / 2 + Math.cos(a) * s * 0.35, s / 2 + Math.sin(a) * s * 0.35); g.stroke(); }
      g.restore();
      glazeFx(g, s, r, 1, false);
      return;
    }
    const col = kind === 'h' ? '#ffffff' : P.cols[v % P.cols.length];
    // pierre taillée : table centrale + 4 biseaux, couleurs translucides
    const m = s * 0.24;
    const facets = [
      [[0, 0], [s, 0], [s - m, m], [m, m], 0.45],
      [[s, 0], [s, s], [s - m, s - m], [s - m, m], -0.08],
      [[s, s], [0, s], [m, s - m], [s - m, s - m], -0.3],
      [[0, s], [0, 0], [m, m], [m, s - m], 0.2]
    ];
    baseTile(g, s, r, col);
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    for (const f of facets) {
      g.beginPath(); g.moveTo(f[0][0], f[0][1]); g.lineTo(f[1][0], f[1][1]); g.lineTo(f[2][0], f[2][1]); g.lineTo(f[3][0], f[3][1]); g.closePath();
      g.fillStyle = shade(col, f[4]); g.fill();
    }
    g.fillStyle = lin(g, m, m, s - m, s - m, [[0, shade(col, 0.55)], [0.5, shade(col, 0.1)], [1, shade(col, 0.35)]]);
    g.fillRect(m, m, s - 2 * m, s - 2 * m);
    if (kind === 'h') {
      // diamant : reflets arc-en-ciel
      const rb = ['#ff9ad5', '#ffe27a', '#8affc9', '#8ad8ff', '#c6a2ff'];
      for (let i = 0; i < 5; i++) { g.globalAlpha = 0.35; g.fillStyle = rb[i]; poly(g, [m + i * (s - 2 * m) / 5, m, m + (i + 1) * (s - 2 * m) / 5, m, s / 2, s / 2]); g.fill(); }
      g.globalAlpha = 1;
    }
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.7 * k;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(m, m); g.moveTo(s, 0); g.lineTo(s - m, m); g.moveTo(0, s); g.lineTo(m, s - m); g.moveTo(s, s); g.lineTo(s - m, s - m); g.stroke();
    g.restore();
    // éclat d'étoile
    g.fillStyle = '#ffffff'; star(g, s * 0.3, s * 0.3, 4, s * 0.12, s * 0.025, 0); g.fill();
    glazeFx(g, s, r, 1.1, false);
  }

  // ---------- carreaux spéciaux (communs, habillés aux couleurs du pays) ----------
  function paintBomb(g, wid, s, t) {
    const k = s / 32, r = s * 0.08;
    baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#ff8a4a'], [1, '#c2321e']]));
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    g.strokeStyle = 'rgba(255,220,120,0.45)'; g.lineWidth = 2.2 * k;
    for (let i = -2; i < 4; i++) { g.beginPath(); g.moveTo(i * s * 0.3, s); g.lineTo(i * s * 0.3 + s, 0); g.stroke(); }
    g.restore();
    g.fillStyle = '#2a1a22'; circ(g, s * 0.5, s * 0.56, s * 0.27); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; circ(g, s * 0.42, s * 0.48, s * 0.08); g.fill();
    g.fillStyle = '#5a4a52'; g.fillRect(s * 0.44, s * 0.22, s * 0.12, s * 0.1);
    g.strokeStyle = '#f2d39a'; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(s * 0.5, s * 0.22); g.quadraticCurveTo(s * 0.6, s * 0.08, s * 0.74, s * 0.12); g.stroke();
    g.fillStyle = '#ffe14d'; star(g, s * 0.76, s * 0.12, 5, s * 0.11, s * 0.04, 0); g.fill();
    goldFrame(g, s, r, 1.6 * k, '#ffd34d');
    glazeFx(g, s, r, 0.9, false);
  }
  function paintGift(g, wid, s, base) {
    // carreau-cadeau : ruban doré en croix (contient un bonus)
    const k = s / 32;
    g.fillStyle = 'rgba(255,214,90,0.92)';
    g.fillRect(s * 0.42, 0, s * 0.16, s); g.fillRect(0, s * 0.42, s, s * 0.16);
    g.strokeStyle = 'rgba(140,90,10,0.6)'; g.lineWidth = 0.8 * k;
    g.strokeRect(s * 0.42, 0, s * 0.16, s); g.strokeRect(0, s * 0.42, s, s * 0.16);
    g.fillStyle = '#ffd34d';
    ell(g, s * 0.38, s * 0.42, s * 0.12, s * 0.07, -0.5); g.fill(); ell(g, s * 0.62, s * 0.42, s * 0.12, s * 0.07, 0.5); g.fill();
    g.fillStyle = '#fff6c8'; circ(g, s * 0.5, s * 0.47, s * 0.07); g.fill();
  }
  function paintRocket(g, s) {
    // fusée de feu d'artifice (Mexique) posée sur un carreau talavera rose
    const k = s / 32, r = s * 0.06, P = TILE_PAL.mexique;
    baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#ff7ab8'], [1, '#d81f78']]));
    g.save(); g.translate(s / 2, s / 2); g.rotate(-0.6);
    g.fillStyle = '#ffffff'; rr(g, -s * 0.09, -s * 0.28, s * 0.18, s * 0.46, s * 0.04); g.fill();
    g.fillStyle = P.blue; g.fillRect(-s * 0.09, -s * 0.1, s * 0.18, s * 0.08); g.fillRect(-s * 0.09, s * 0.05, s * 0.18, s * 0.06);
    g.fillStyle = P.yellow; poly(g, [-s * 0.11, -s * 0.28, s * 0.11, -s * 0.28, 0, -s * 0.44]); g.fill();
    g.fillStyle = P.orange; poly(g, [-s * 0.09, s * 0.12, -s * 0.2, s * 0.24, -s * 0.09, s * 0.2]); g.fill(); poly(g, [s * 0.09, s * 0.12, s * 0.2, s * 0.24, s * 0.09, s * 0.2]); g.fill();
    g.strokeStyle = '#7a5020'; g.lineWidth = 1 * k; g.beginPath(); g.moveTo(0, s * 0.18); g.lineTo(0, s * 0.36); g.stroke();
    g.restore();
    g.fillStyle = '#fff3a0'; for (const [x, y] of [[0.2, 0.2], [0.82, 0.3], [0.78, 0.78], [0.22, 0.74]]) { star(g, s * x, s * y, 4, s * 0.07, s * 0.02, 0); g.fill(); }
    glazeFx(g, s, r, 1, false);
  }
  function paintPrism(g, s) {
    // prisme : triangle de verre qui décompose la lumière
    const k = s / 32, r = s * 0.1;
    baseTile(g, s, r, lin(g, 0, 0, s, s, [[0, '#2a3f7a'], [1, '#141c40']]));
    g.save(); rr(g, 0, 0, s, s, r); g.clip();
    const rb = ['#ff5f7e', '#ffa53d', '#ffe14d', '#5ef08a', '#4fc3ff', '#b48cff'];
    for (let i = 0; i < rb.length; i++) { g.fillStyle = rb[i]; poly(g, [s * 0.5, s * 0.5, s, s * (0.3 + i * 0.1), s, s * (0.4 + i * 0.1)]); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.8)'; poly(g, [0, s * 0.62, s * 0.5, s * 0.5, s * 0.5, s * 0.54, 0, s * 0.66]); g.fill();
    g.restore();
    poly(g, [s * 0.5, s * 0.12, s * 0.86, s * 0.8, s * 0.14, s * 0.8]);
    g.fillStyle = lin(g, 0, s * 0.12, 0, s * 0.8, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(180,220,255,0.55)']]); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.2 * k; g.stroke();
    glazeFx(g, s, r, 1, false);
  }
  // peintre principal d'un carreau d'un pays
  function paintTileOf(g, wid, kind, v, s, seed) {
    switch (wid) {
      case 'portugal': paintAzulejo(g, kind, v, s); break;
      case 'maroc': paintZellige(g, kind, v, s); break;
      case 'rome': paintTessera(g, kind, v, s, seed); break;
      case 'japon': paintSento(g, kind, v, s); break;
      case 'mexique': paintTalavera(g, kind, v, s); break;
      default: paintCrystal(g, kind, v, s); break;
    }
  }
  // fissures (carreaux à plusieurs coups) : lignes déterministes selon la graine du carreau
  function crackLines(seed, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let x = 0.3 + hash(seed + i * 9.1) * 0.4, y = 0.3 + hash(seed + i * 4.7) * 0.4;
      const a0 = hash(seed + i * 2.3) * TAU, pts = [[x, y]];
      for (let j = 0; j < 4; j++) {
        const a = a0 + (hash(seed + i * 3 + j) - 0.5) * 1.2, d = 0.12 + hash(seed + j * 5.5 + i) * 0.12;
        x = clamp(x + Math.cos(a) * d, 0.02, 0.98); y = clamp(y + Math.sin(a) * d, 0.02, 0.98);
        pts.push([x, y]);
      }
      out.push(pts);
    }
    return out;
  }

  // ===========================================================================
  // DÉCORS — un tableau par pays, peint une fois (deux calques : le ciel, puis le paysage devant) à la taille
  // de l'écran. F = aire de jeu en px CSS { x, y, w, h } ; la ligne d'horizon et le sol se placent par rapport
  // à elle (on voit le paysage entre les carreaux et la raquette, et en grand sur les côtés sur ordinateur).
  // Les éléments animés (oiseaux, nuages, fusées, aurores, pétales…) sont dessinés à chaque image par le jeu.
  // ===========================================================================
  // collines : profil lissé, rempli jusqu'en bas
  function hills(g, x0, x1, yb, amp, seed, freq, fill, yBottom) {
    g.beginPath(); g.moveTo(x0, yBottom);
    const n = Math.max(8, Math.round((x1 - x0) / 14));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (i / n) * (x1 - x0), u = x * freq;
      const y = yb - amp * (0.55 + 0.3 * Math.sin(u + seed) + 0.15 * Math.sin(u * 2.3 + seed * 1.7) + 0.1 * Math.sin(u * 5.1 + seed * 3.1));
      g.lineTo(x, y);
    }
    g.lineTo(x1, yBottom); g.closePath();
    g.fillStyle = fill; g.fill();
  }
  function sunDisc(g, x, y, r, col, glowCol, glowR) {
    g.fillStyle = rad(g, x, y, r * 0.5, x, y, glowR, [[0, rgba(glowCol, 0.55)], [0.4, rgba(glowCol, 0.18)], [1, rgba(glowCol, 0)]]);
    g.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
    g.fillStyle = col; circ(g, x, y, r); g.fill();
  }
  function starsField(g, x, y, w, h, n, seed, maxA) {
    for (let i = 0; i < n; i++) {
      const a = (0.25 + hash(seed + i * 1.37) * 0.75) * maxA;
      g.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      const r = 0.4 + hash(seed + i * 2.11) * 1.3;
      g.fillRect(x + hash(seed + i * 3.7) * w, y + hash(seed + i * 5.3) * h, r, r);
    }
  }
  // sol carrelé en perspective (point de fuite au centre de l'aire de jeu)
  function perspFloor(g, x0, x1, y0, y1, vx, rows, cols, cellFn) {
    const H0 = y1 - y0;
    for (let r = 0; r < rows; r++) {
      const k0 = Math.pow(r / rows, 1.6), k1 = Math.pow((r + 1) / rows, 1.6);
      const ya = y0 + H0 * k0, yb = y0 + H0 * k1;
      const spreadA = 0.35 + 0.65 * k0, spreadB = 0.35 + 0.65 * k1;
      for (let c = -cols; c <= cols; c++) {
        const xa0 = vx + (c - 0.5) * ((x1 - x0) / cols) * spreadA, xa1 = vx + (c + 0.5) * ((x1 - x0) / cols) * spreadA;
        const xb0 = vx + (c - 0.5) * ((x1 - x0) / cols) * spreadB, xb1 = vx + (c + 0.5) * ((x1 - x0) / cols) * spreadB;
        if (Math.max(xa1, xb1) < -40 || Math.min(xa0, xb0) > 100000) continue;
        cellFn(g, [xa0, ya, xa1, ya, xb1, yb, xb0, yb], r, c, k1);
      }
    }
  }
  function quadPath(g, q) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); g.lineTo(q[4], q[5]); g.lineTo(q[6], q[7]); g.closePath(); }
  function quadC(q) { return [(q[0] + q[2] + q[4] + q[6]) / 4, (q[1] + q[3] + q[5] + q[7]) / 4, (q[2] - q[0] + q[4] - q[6]) / 2, q[5] - q[1]]; }
  function floorShade(g, cw, fy, ch) {
    g.fillStyle = lin(g, 0, fy - 8, 0, fy + 10, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.22)']]); g.fillRect(0, fy - 8, cw, 18);
    g.fillStyle = lin(g, 0, fy, 0, ch, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.28)']]); g.fillRect(0, fy, cw, ch - fy);
  }
  function cypress(g, x, yb, h, col) {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x, yb - h); g.quadraticCurveTo(x + h * 0.16, yb - h * 0.55, x + h * 0.09, yb); g.lineTo(x - h * 0.09, yb); g.quadraticCurveTo(x - h * 0.16, yb - h * 0.55, x, yb - h); g.fill();
  }
  function umbrellaPine(g, x, yb, h, col, trunk) {
    g.strokeStyle = trunk; g.lineWidth = Math.max(1, h * 0.05); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, yb); g.quadraticCurveTo(x - h * 0.08, yb - h * 0.5, x + h * 0.05, yb - h * 0.8); g.stroke();
    g.fillStyle = col;
    ell(g, x + h * 0.05, yb - h * 0.86, h * 0.48, h * 0.16, 0); g.fill();
    ell(g, x - h * 0.2, yb - h * 0.8, h * 0.26, h * 0.1, 0); g.fill();
    ell(g, x + h * 0.32, yb - h * 0.8, h * 0.24, h * 0.09, 0); g.fill();
  }
  function palm(g, x, yb, h, col, trunk) {
    g.strokeStyle = trunk; g.lineWidth = Math.max(1.2, h * 0.045); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, yb); g.quadraticCurveTo(x + h * 0.12, yb - h * 0.5, x + h * 0.04, yb - h); g.stroke();
    g.fillStyle = col;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.5, L = h * (0.42 + (i % 2) * 0.08);
      g.save(); g.translate(x + h * 0.04, yb - h); g.rotate(a);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -L * 0.18, L, L * 0.18); g.quadraticCurveTo(L * 0.5, L * 0.02, 0, 0); g.fill();
      g.restore();
    }
  }
  function cloudBlob(g, x, y, w, col, a) {
    g.fillStyle = rgba(col, a);
    ell(g, x, y, w * 0.5, w * 0.16, 0); g.fill();
    circ(g, x - w * 0.18, y - w * 0.06, w * 0.17); g.fill();
    circ(g, x + w * 0.05, y - w * 0.12, w * 0.22); g.fill();
    circ(g, x + w * 0.25, y - w * 0.04, w * 0.14); g.fill();
  }
  // un panneau de carreaux (azulejos, zelliges…) peint en petit dans une bande
  function tileBand(g, x0, y0, w, h, t, painter) {
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (let y = y0, r = 0; y < y0 + h; y += t, r++) for (let x = x0, c = 0; x < x0 + w; x += t, c++) { g.save(); g.translate(x, y); g.scale(t / 32, t / 32); painter(g, c, r); g.restore(); }
    g.restore();
  }

  // ---------- 1. Lisbonne au petit matin (vue d'un belvédère) ----------
  function sceneLisbonne(back, front, cw, ch, F) {
    const hy = F.y + F.h * 0.55, fy = F.y + F.h * 0.9, s = F.w / 384;
    let g = back;
    g.fillStyle = lin(g, 0, 0, 0, hy, [[0, '#3f9fe6'], [0.5, '#8fd2ff'], [0.85, '#ffe6c4'], [1, '#ffd5a8']]);
    g.fillRect(0, 0, cw, ch);
    sunDisc(g, F.x + F.w * 0.74, hy - F.h * 0.12, F.h * 0.04, '#fff6d8', '#ffe39a', F.h * 0.28);
    for (let i = 0; i < 3; i++) cloudBlob(g, F.x + (hash(i * 3.3) * 1.3 - 0.15) * F.w, F.y + F.h * (0.16 + hash(i * 7.1) * 0.16), F.w * (0.24 + hash(i) * 0.16), '#ffffff', 0.8);
    g = front;
    // l'autre rive, le Tage et le pont rouge
    hills(g, -20, cw + 20, hy - F.h * 0.012, F.h * 0.04, 1.2, 0.012, '#9fbcd6', hy + 6);
    g.fillStyle = lin(g, 0, hy, 0, hy + F.h * 0.07, [[0, '#8ccbf0'], [1, '#4a92cc']]); g.fillRect(0, hy, cw, F.h * 0.08);
    g.fillStyle = 'rgba(255,255,255,0.65)'; for (let i = 0; i < 46; i++) g.fillRect(hash(i * 2.7) * cw, hy + 3 + hash(i * 1.9) * F.h * 0.055, (4 + hash(i) * 10) * s, 1);
    const bx0 = F.x - F.w * 0.5, bx1 = F.x + F.w * 0.48, by = hy + F.h * 0.022, ph = F.h * 0.085;
    g.fillStyle = '#c8402e';
    for (const px of [bx0 + (bx1 - bx0) * 0.3, bx0 + (bx1 - bx0) * 0.72]) g.fillRect(px - 1.6 * s, by - ph, 3.2 * s, ph + 3);
    g.strokeStyle = '#c8402e'; g.lineWidth = Math.max(1.2, 1.4 * s);
    g.beginPath(); g.moveTo(bx0, by - ph * 0.2); g.quadraticCurveTo(bx0 + (bx1 - bx0) * 0.15, by - ph * 0.15, bx0 + (bx1 - bx0) * 0.3, by - ph);
    g.quadraticCurveTo(bx0 + (bx1 - bx0) * 0.51, by - ph * 0.05, bx0 + (bx1 - bx0) * 0.72, by - ph); g.quadraticCurveTo(bx0 + (bx1 - bx0) * 0.86, by - ph * 0.2, bx1, by - ph * 0.15); g.stroke();
    g.fillStyle = '#9c3222'; g.fillRect(bx0, by - 1.5, bx1 - bx0, Math.max(2, 2.2 * s));
    // la ville qui descend vers le fleuve : trois rangées de toits
    const pastel = ['#f6d48a', '#f3a7a0', '#fff3dc', '#f2c27a', '#bfe0f2', '#f7e6b8', '#e9b3c9', '#ffe2a8'];
    const layer = (y0, hmin, hmax, wmin, wmax, sat, seed, roofCol) => {
      let x = -10, i = 0;
      while (x < cw + 10) {
        const w = (wmin + hash(seed + i * 1.3) * (wmax - wmin)) * s, h = (hmin + hash(seed + i * 2.1) * (hmax - hmin)) * s;
        const yy = y0 - h + Math.sin(x * 0.012 + seed) * 6 * s;
        g.fillStyle = mix(pastel[(i + seed) % pastel.length], '#a9c4dc', sat); g.fillRect(x, yy, w + 1, F.h);
        g.fillStyle = mix(roofCol, '#a9c4dc', sat * 0.8);
        poly(g, [x - 2 * s, yy + 1, x + w * 0.5, yy - w * 0.22, x + w + 2 * s, yy + 1]); g.fill();
        g.fillStyle = 'rgba(40,50,80,' + (0.5 - sat * 0.35) + ')';
        const ww = Math.max(1.6, 3 * s), wh = Math.max(2, 4.2 * s);
        for (let wy = yy + 5 * s; wy < yy + h - 5 * s; wy += 8 * s) for (let wx = x + 3.5 * s; wx < x + w - 4 * s; wx += 7 * s) g.fillRect(wx, wy, ww, wh);
        if (hash(seed + i * 4.7) < 0.35) { g.fillStyle = mix('#7a3a2a', '#a9c4dc', sat); g.fillRect(x + w * 0.7, yy - w * 0.3, 3 * s, w * 0.2); }
        x += w; i++;
      }
    };
    layer(hy + F.h * 0.075, 14, 28, 14, 26, 0.45, 3, '#c2552f');
    // le château et la coupole blanche
    const cx = F.x + F.w * 0.78, cy = hy + F.h * 0.05;
    g.fillStyle = '#d6c6a6'; g.fillRect(cx - 40 * s, cy - 22 * s, 80 * s, 30 * s);
    for (let i = 0; i < 9; i++) g.fillRect(cx - 40 * s + i * 9.4 * s, cy - 28 * s, 5 * s, 6 * s);
    g.fillRect(cx - 9 * s, cy - 40 * s, 18 * s, 20 * s); for (let i = 0; i < 3; i++) g.fillRect(cx - 9 * s + i * 7 * s, cy - 45 * s, 4 * s, 5 * s);
    g.fillStyle = '#4f8f4a'; for (let i = 0; i < 7; i++) { circ(g, cx - 46 * s + i * 15 * s, cy + 8 * s, 7 * s); g.fill(); }
    const dx = F.x + F.w * 0.2, dy = hy + F.h * 0.07;
    g.fillStyle = '#f4f1ea'; g.fillRect(dx - 16 * s, dy - 18 * s, 32 * s, 24 * s);
    g.beginPath(); g.arc(dx, dy - 18 * s, 14 * s, Math.PI, 0); g.fill();
    g.fillStyle = '#dcd6c8'; g.fillRect(dx - 2 * s, dy - 40 * s, 4 * s, 10 * s); g.beginPath(); g.arc(dx, dy - 30 * s, 5 * s, Math.PI, 0); g.fill();
    layer(hy + F.h * 0.17, 24, 44, 20, 34, 0.18, 7, '#c2552f');
    layer(hy + F.h * 0.29, 34, 60, 30, 48, 0.0, 11, '#b8482a');
    // arbres : cyprès et palmiers entre les toits
    for (let i = 0; i < 6; i++) cypress(g, F.x + F.w * (-0.3 + hash(i * 5.1) * 1.6), hy + F.h * (0.2 + hash(i * 2.3) * 0.08), F.h * 0.07, '#3f6f3a');
    for (let i = 0; i < 3; i++) palm(g, F.x + F.w * (0.05 + i * 0.42), hy + F.h * 0.27, F.h * 0.09, '#4f7f3a', '#7a5a3a');
    // le parapet du belvédère, couvert d'azulejos
    const py0 = fy - F.h * 0.06;
    g.fillStyle = '#ece6da'; g.fillRect(0, py0 - 5 * s, cw, 6 * s);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, py0, cw, 2 * s);
    tileBand(g, 0, py0, cw, fy - py0, Math.max(10, 18 * s), (gg, c, r) => paintAzulejo(gg, 'n', r % 2 ? 0 : (c % 3 ? 0 : 3), 32));
    g.fillStyle = 'rgba(10,30,70,0.18)'; g.fillRect(0, py0, cw, fy - py0);
    if (F.x > 6) {
      // lampadaires de Lisbonne et grands palmiers devant le panorama
      for (const lx of [F.x * 0.45, F.x + F.w + F.x * 0.55]) {
        g.strokeStyle = '#1c2230'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(lx, fy); g.lineTo(lx, fy - F.h * 0.42); g.stroke();
        g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(lx, fy - F.h * 0.4); g.quadraticCurveTo(lx + 16 * s, fy - F.h * 0.44, lx + 22 * s, fy - F.h * 0.4); g.stroke();
        g.fillStyle = '#1c2230'; poly(g, [lx + 14 * s, fy - F.h * 0.4, lx + 30 * s, fy - F.h * 0.4, lx + 26 * s, fy - F.h * 0.36, lx + 18 * s, fy - F.h * 0.36]); g.fill();
        g.fillStyle = 'rgba(255,230,160,0.9)'; g.fillRect(lx + 18 * s, fy - F.h * 0.375, 8 * s, 4 * s);
        g.fillStyle = '#1c2230'; g.fillRect(lx - 5 * s, fy - 6 * s, 10 * s, 6 * s);
      }
      palm(g, F.x * 0.18, fy, F.h * 0.5, '#3f7a3a', '#6b4a2a');
      palm(g, cw - F.x * 0.18, fy, F.h * 0.46, '#3f7a3a', '#6b4a2a');
    }
    // calçada portuguesa : petits pavés blancs, vagues noires
    g.fillStyle = '#f1ece1'; g.fillRect(0, fy, cw, ch - fy);
    g.save(); g.beginPath(); g.rect(0, fy, cw, ch - fy); g.clip();
    for (let r = 0; r < 9; r++) {
      const k = r / 8, yy = fy + (ch - fy) * Math.pow(k, 1.35) * 1.05, amp = (ch - fy) * (0.03 + k * 0.05);
      g.strokeStyle = '#3a3a44'; g.lineWidth = Math.max(1.2, (ch - fy) * (0.018 + k * 0.03));
      g.beginPath();
      for (let x = -10; x <= cw + 10; x += 5) { const y = yy + Math.sin(x * (0.035 - k * 0.014) / Math.max(0.6, s) + r * 1.3) * amp; if (x === -10) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.07)'; for (let i = 0; i < 400; i++) g.fillRect(hash(i * 1.1) * cw, fy + hash(i * 2.3) * (ch - fy), 1.6, 1.6);
    g.restore();
    floorShade(g, cw, fy, ch);
  }

  // ---------- 2. Riad de Marrakech, l'après-midi ----------
  function horseshoe(g, x, y0, w, h) {
    // arc outrepassé (en fer à cheval)
    const r = w / 2, cy = y0 + r * 1.05;
    g.beginPath(); g.moveTo(x - r * 0.86, y0 + h); g.lineTo(x - r * 0.86, cy + r * 0.5); g.arc(x, cy, r, Math.PI * 0.84, Math.PI * 2.16); g.lineTo(x + r * 0.86, y0 + h); g.closePath();
  }
  function sceneMarrakech(back, front, cw, ch, F) {
    const hy = F.y + F.h * 0.5, fy = F.y + F.h * 0.9, s = F.w / 384, wallTop = hy + F.h * 0.07;
    let g = back;
    g.fillStyle = lin(g, 0, 0, 0, hy, [[0, '#ff8a52'], [0.45, '#ffb878'], [0.85, '#ffe2aa'], [1, '#ffeec8']]);
    g.fillRect(0, 0, cw, ch);
    sunDisc(g, F.x + F.w * 0.24, hy - F.h * 0.15, F.h * 0.055, '#fff2c8', '#ffd27a', F.h * 0.34);
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,230,200,0.5)'; rr(g, F.x + (hash(i * 4.1) - 0.2) * F.w * 1.3, F.y + F.h * (0.16 + i * 0.07), F.w * (0.3 + hash(i) * 0.3), 3 * s, 2); g.fill(); }
    g = front;
    // l'Atlas enneigé, la palmeraie, la Koutoubia
    hills(g, -20, cw + 20, hy - F.h * 0.02, F.h * 0.09, 4.2, 0.009, '#b98fa6', hy + 30);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 9; i++) { const x = hash(i * 4.4) * cw, y = hy - F.h * (0.075 + hash(i * 1.3) * 0.04); poly(g, [x - 10 * s, y + 8 * s, x, y, x + 10 * s, y + 8 * s]); g.fill(); }
    hills(g, -20, cw + 20, hy + F.h * 0.02, F.h * 0.035, 2.1, 0.02, '#d99a6a', wallTop + 4);
    for (let i = 0; i < 12; i++) palm(g, hash(i * 2.2) * cw, hy + F.h * 0.05, F.h * (0.05 + hash(i * 3.3) * 0.04), '#4f6b3a', '#6b4a2a');
    const mx = F.x + F.w * 0.7, mb = wallTop, mw = 26 * s, mh = F.h * 0.25;
    g.fillStyle = lin(g, mx - mw / 2, 0, mx + mw / 2, 0, [[0, '#e8ab70'], [1, '#b8733f']]); g.fillRect(mx - mw / 2, mb - mh, mw, mh);
    g.fillStyle = '#8f5a32';
    for (let i = 0; i < 3; i++) { const yy = mb - mh + mh * (0.16 + i * 0.25); g.beginPath(); g.moveTo(mx - mw * 0.24, yy + mh * 0.12); g.lineTo(mx - mw * 0.24, yy + mh * 0.04); g.arc(mx, yy + mh * 0.04, mw * 0.24, Math.PI, 0); g.lineTo(mx + mw * 0.24, yy + mh * 0.12); g.closePath(); g.fill(); }
    g.fillStyle = '#1fae8e'; g.fillRect(mx - mw / 2, mb - mh + mh * 0.05, mw, mh * 0.035);
    for (let i = 0; i < 4; i++) g.fillRect(mx - mw / 2 + i * mw / 3.3, mb - mh - mh * 0.035, mw * 0.16, mh * 0.035);
    g.fillStyle = '#e3a46a'; g.fillRect(mx - mw * 0.22, mb - mh - mh * 0.15, mw * 0.44, mh * 0.12);
    g.fillStyle = '#ffd34d'; for (let i = 0; i < 3; i++) { circ(g, mx, mb - mh - mh * 0.19 - i * mh * 0.035, mw * (0.12 - i * 0.025)); g.fill(); }
    // le mur du riad : enduit ocre, arcades, stuc, zelliges
    g.fillStyle = lin(g, 0, wallTop, 0, fy, [[0, '#f0caa0'], [1, '#e2ab78']]); g.fillRect(0, wallTop, cw, fy - wallTop);
    // auvent de tuiles vertes
    g.fillStyle = '#1f7a52'; g.fillRect(0, wallTop - 7 * s, cw, 9 * s);
    g.fillStyle = '#2fa36d'; for (let x = 0; x < cw; x += 8 * s) { g.beginPath(); g.arc(x + 4 * s, wallTop + 2 * s, 4 * s, 0, Math.PI); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, wallTop + 6 * s, cw, 4 * s);
    // frise de stuc
    const sy = wallTop + 12 * s;
    g.fillStyle = '#f7e8d2'; g.fillRect(0, sy, cw, 12 * s);
    g.strokeStyle = 'rgba(160,110,60,0.55)'; g.lineWidth = 1;
    for (let x = 0; x < cw; x += 12 * s) { g.beginPath(); g.moveTo(x, sy + 12 * s); g.lineTo(x + 6 * s, sy + 2 * s); g.lineTo(x + 12 * s, sy + 12 * s); g.stroke(); star(g, x + 6 * s, sy + 8 * s, 4, 2.2 * s, 0.9 * s, 0); g.stroke(); }
    // arcades (une grande au centre, deux petites)
    const archs = [[F.x + F.w * 0.5, 120], [F.x + F.w * 0.14, 70], [F.x + F.w * 0.86, 70]];
    if (F.x > 30) archs.push([F.x - F.w * 0.25, 90], [F.x + F.w * 1.25, 90], [F.x - F.w * 0.65, 80], [F.x + F.w * 1.65, 80]);
    for (const [ax, aw0] of archs) {
      const aw = aw0 * s, at = sy + 22 * s, ab = fy - F.h * 0.11;
      horseshoe(g, ax, at - 6 * s, aw + 12 * s, ab - at + 6 * s); g.fillStyle = '#f7e8d2'; g.fill();
      horseshoe(g, ax, at, aw, ab - at);
      g.fillStyle = lin(g, 0, at, 0, ab, [[0, '#5a2e1c'], [0.6, '#7a3f24'], [1, '#9a5a34']]); g.fill();
      g.strokeStyle = '#c98d55'; g.lineWidth = 2 * s; g.stroke();
      // lanterne qui brille dans l'arcade
      const lx = ax, ly = at + aw * 0.55;
      g.fillStyle = rad(g, lx, ly, 0, lx, ly, aw * 0.5, [[0, 'rgba(255,190,90,0.6)'], [1, 'rgba(255,190,90,0)']]); circ(g, lx, ly, aw * 0.5); g.fill();
      g.strokeStyle = '#3a2010'; g.lineWidth = 1; g.beginPath(); g.moveTo(lx, at + 2 * s); g.lineTo(lx, ly - 8 * s); g.stroke();
      g.fillStyle = '#ffcf6a'; poly(g, [lx - 6 * s, ly - 7 * s, lx + 6 * s, ly - 7 * s, lx + 4 * s, ly + 7 * s, lx - 4 * s, ly + 7 * s]); g.fill();
      g.fillStyle = '#c9973b'; poly(g, [lx - 4 * s, ly - 7 * s, lx + 4 * s, ly - 7 * s, lx, ly - 12 * s]); g.fill();
    }
    // soubassement de zelliges
    const zt = fy - F.h * 0.11;
    tileBand(g, 0, zt, cw, fy - zt, Math.max(9, 16 * s), (gg, c, r) => paintZellige(gg, 'n', (c + r * 2) % 5, 32));
    g.fillStyle = '#b8733f'; g.fillRect(0, zt - 3 * s, cw, 3 * s);
    // orangers en pots
    for (const ox of [F.x + F.w * 0.3, F.x + F.w * 0.7, F.x - F.w * 0.05, F.x + F.w * 1.05]) {
      const oy = fy - 2 * s;
      g.fillStyle = '#c4552a'; poly(g, [ox - 12 * s, oy - 18 * s, ox + 12 * s, oy - 18 * s, ox + 8 * s, oy, ox - 8 * s, oy]); g.fill();
      g.fillStyle = '#e3a63a'; g.fillRect(ox - 13 * s, oy - 20 * s, 26 * s, 3 * s);
      g.strokeStyle = '#6b4a2a'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(ox, oy - 18 * s); g.lineTo(ox, oy - 34 * s); g.stroke();
      g.fillStyle = '#3f7a3a'; circ(g, ox, oy - 46 * s, 17 * s); g.fill(); circ(g, ox - 11 * s, oy - 40 * s, 11 * s); g.fill(); circ(g, ox + 11 * s, oy - 40 * s, 11 * s); g.fill();
      g.fillStyle = '#ff9a1f'; for (let i = 0; i < 6; i++) { circ(g, ox + (hash(i + ox) - 0.5) * 30 * s, oy - 40 * s - hash(i * 2 + ox) * 16 * s, 2.6 * s); g.fill(); }
    }
    // dallage de la cour : terre cuite et zelliges (perspective)
    g.fillStyle = '#c47a48'; g.fillRect(0, fy, cw, ch - fy);
    perspFloor(g, F.x, F.x + F.w, fy, ch + (ch - fy) * 0.3, F.x + F.w / 2, 5, 7, (gg, q, r, c) => {
      quadPath(gg, q); gg.fillStyle = (r + c) % 2 ? '#d08a56' : '#b96d3e'; gg.fill();
      if ((r + c) % 3 === 0) { const C = quadC(q); gg.fillStyle = '#17a58e'; ell(gg, C[0], C[1], C[2] * 0.22, C[3] * 0.22, 0); gg.fill(); }
      gg.strokeStyle = 'rgba(80,40,20,0.35)'; gg.lineWidth = 1; gg.stroke();
    });
    floorShade(g, cw, fy, ch);
  }

  // ---------- 3. Thermes de Rome au coucher du soleil ----------
  function sceneRome(back, front, cw, ch, F) {
    const hy = F.y + F.h * 0.53, fy = F.y + F.h * 0.9, s = F.w / 384, py = hy + F.h * 0.045;
    let g = back;
    g.fillStyle = lin(g, 0, 0, 0, hy, [[0, '#6a4a92'], [0.35, '#e0708a'], [0.7, '#ffa36e'], [1, '#ffd49a']]);
    g.fillRect(0, 0, cw, ch);
    sunDisc(g, F.x + F.w * 0.5, hy - F.h * 0.03, F.h * 0.06, '#fff0c0', '#ffb070', F.h * 0.38);
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(255,190,150,0.35)'; rr(g, hash(i * 5.5) * cw - 40, F.y + F.h * (0.18 + hash(i * 2.2) * 0.25), F.w * (0.3 + hash(i) * 0.3), 4 * s, 4); g.fill(); }
    g = front;
    // Rome au loin : Colisée, coupole, pins parasols, cyprès
    const sil = '#5a3346';
    hills(g, -20, cw + 20, hy, F.h * 0.02, 0.5, 0.01, '#7a4a5a', py);
    const colX = F.x + F.w * 0.22, colW = F.w * 0.34, colH = F.h * 0.08;
    g.fillStyle = sil;
    g.beginPath(); g.moveTo(colX - colW / 2, hy + 2); g.lineTo(colX - colW / 2, hy - colH * 0.85); g.quadraticCurveTo(colX, hy - colH * 1.15, colX + colW / 2, hy - colH); g.lineTo(colX + colW / 2, hy + 2); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,180,120,0.55)';
    for (let lv = 0; lv < 3; lv++) for (let i = 0; i < 9; i++) { const x = colX - colW / 2 + colW * (0.06 + i * 0.105), y = hy - colH * (0.28 + lv * 0.27); rr(g, x, y, colW * 0.05, colH * 0.17, colW * 0.025); g.fill(); }
    const domeX = F.x + F.w * 0.8;
    g.fillStyle = sil; g.fillRect(domeX - 22 * s, hy - 20 * s, 44 * s, 22 * s);
    g.beginPath(); g.arc(domeX, hy - 20 * s, 22 * s, Math.PI, 0); g.fill();
    g.fillRect(domeX - 3 * s, hy - 52 * s, 6 * s, 12 * s);
    for (let i = 0; i < 8; i++) umbrellaPine(g, F.x + F.w * (-0.4 + hash(i * 3.1) * 1.8), hy + 2, F.h * (0.05 + hash(i) * 0.035), '#3e2a3a', '#3e2a3a');
    for (let i = 0; i < 10; i++) cypress(g, F.x + F.w * (-0.5 + hash(i * 7.7) * 2), hy + 2, F.h * (0.05 + hash(i * 1.9) * 0.04), '#3a2638');
    // bord du fond du bassin : marbre, statues, vasques
    g.fillStyle = lin(g, 0, hy, 0, py, [[0, '#f4ead6'], [1, '#d8cbb2']]); g.fillRect(0, hy, cw, py - hy);
    for (let i = 0; i < 9; i++) {
      const x = F.x + F.w * (-0.6 + i * 0.28), y = hy + 1;
      g.fillStyle = '#e8dcc4'; g.fillRect(x - 9 * s, y - 20 * s, 18 * s, 20 * s);
      g.fillStyle = '#d6c8ae'; g.fillRect(x - 11 * s, y - 22 * s, 22 * s, 3 * s);
      if (i % 2) {
        // buste de marbre
        g.fillStyle = lin(g, x - 12 * s, 0, x + 12 * s, 0, [[0, '#d9d0c0'], [0.5, '#fbf7ee'], [1, '#cfc4b0']]);
        g.beginPath(); g.moveTo(x - 12 * s, y - 22 * s); g.quadraticCurveTo(x, y - 36 * s, x + 12 * s, y - 22 * s); g.fill();
        circ(g, x, y - 41 * s, 8 * s); g.fill(); g.fillStyle = '#8a9a5a'; for (let k = 0; k < 5; k++) { circ(g, x - 7 * s + k * 3.5 * s, y - 48 * s + Math.abs(k - 2) * 1.5 * s, 2.2 * s); g.fill(); }
      } else { g.fillStyle = '#d9cdb6'; poly(g, [x - 13 * s, y - 34 * s, x + 13 * s, y - 34 * s, x + 6 * s, y - 22 * s, x - 6 * s, y - 22 * s]); g.fill(); g.fillStyle = '#5f8f4a'; circ(g, x, y - 40 * s, 9 * s); g.fill(); circ(g, x - 7 * s, y - 36 * s, 6 * s); g.fill(); circ(g, x + 7 * s, y - 36 * s, 6 * s); g.fill(); }
    }
    // le grand bassin : eau turquoise, mosaïque au fond, reflets du soleil
    g.fillStyle = lin(g, 0, py, 0, fy, [[0, '#46c3cf'], [1, '#1b86a0']]); g.fillRect(0, py, cw, fy - py);
    g.save(); g.beginPath(); g.rect(0, py, cw, fy - py); g.clip();
    const T = Math.max(5, 9 * s);
    for (let y = py, r = 0; y < fy; y += T, r++) for (let x = (r % 2) * T * 0.5 - T, c = 0; x < cw + T; x += T, c++) {
      const u = Math.sin(c * 0.5) + Math.cos(r * 0.7), d = (c + r) % 9;
      g.fillStyle = d === 0 ? 'rgba(255,240,180,0.22)' : u > 1.1 ? 'rgba(20,70,110,0.22)' : 'rgba(255,255,255,0.06)';
      g.fillRect(x + 0.6, y + 0.6, T - 1.2, T - 1.2);
    }
    // chemin de lumière du soleil
    for (let i = 0; i < 60; i++) { const k = hash(i * 1.3), y = py + k * (fy - py), w = (6 + hash(i * 2.7) * 18) * s * (0.6 + k); g.fillStyle = 'rgba(255,236,190,' + (0.55 - k * 0.3) + ')'; g.fillRect(F.x + F.w * 0.5 - w / 2 + (hash(i * 4.4) - 0.5) * F.w * 0.18 * (0.4 + k), y, w, 1.5 * s); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 40; i++) g.fillRect(hash(i * 6.1) * cw, py + hash(i * 3.9) * (fy - py), (5 + hash(i) * 12) * s, 1.2);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,245,235,0.13)'; ell(g, F.x + F.w * (hash(i * 2.2) * 1.4 - 0.2), py + (fy - py) * (0.15 + i * 0.14), F.w * 0.32, 9 * s, 0); g.fill(); }
    g.restore();
    // margelle du bassin (devant)
    g.fillStyle = lin(g, 0, fy - 8 * s, 0, fy, [[0, '#fbf5e8'], [1, '#d6c8ae']]); g.fillRect(0, fy - 8 * s, cw, 8 * s);
    // colonnes de marbre corinthiennes (côtés)
    const column = (x, w, top, bottom) => {
      g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#cfc4b2'], [0.35, '#fffaf0'], [0.7, '#e6dccb'], [1, '#a99e8c']]);
      g.fillRect(x, top + w * 0.5, w, bottom - top - w * 0.5);
      g.strokeStyle = 'rgba(120,100,80,0.35)'; g.lineWidth = Math.max(1, w * 0.04);
      for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x + (w * i) / 6, top + w * 0.6); g.lineTo(x + (w * i) / 6, bottom - w * 0.3); g.stroke(); }
      g.fillStyle = '#e9dcc0'; rr(g, x - w * 0.2, top, w * 1.4, w * 0.55, w * 0.1); g.fill();
      g.fillStyle = '#d8b25a'; for (let i = 0; i < 3; i++) { circ(g, x + w * (0.1 + i * 0.4), top + w * 0.45, w * 0.16); g.fill(); }
      g.fillStyle = '#5f8f4a'; for (let i = 0; i < 4; i++) { ell(g, x + w * (0.05 + i * 0.3), top + w * 0.7, w * 0.16, w * 0.08, 0.6); g.fill(); }
      g.fillStyle = '#d9cdb6'; g.fillRect(x - w * 0.15, bottom - w * 0.3, w * 1.3, w * 0.3);
    };
    if (F.x > 6) {
      const side = F.x, cwid = Math.min(side * 0.36, F.w * 0.16);
      column(side * 0.12, cwid, F.y + F.h * 0.14, fy);
      column(side * 0.58, cwid * 0.8, F.y + F.h * 0.2, fy);
      column(F.x + F.w + side * 0.88 - cwid, cwid, F.y + F.h * 0.14, fy);
      column(F.x + F.w + side * 0.42 - cwid * 0.8, cwid * 0.8, F.y + F.h * 0.2, fy);
      g.fillStyle = '#e8dcc4'; g.fillRect(-5, F.y + F.h * 0.1, side + 5, F.h * 0.04); g.fillRect(F.x + F.w, F.y + F.h * 0.1, side + 5, F.h * 0.04);
      g.fillStyle = '#d8b25a'; g.fillRect(-5, F.y + F.h * 0.14, side + 5, 3); g.fillRect(F.x + F.w, F.y + F.h * 0.14, side + 5, 3);
    }
    // sol en mosaïque noir et blanc (perspective)
    g.fillStyle = '#efe6d2'; g.fillRect(0, fy, cw, ch - fy);
    perspFloor(g, F.x, F.x + F.w, fy, ch + (ch - fy) * 0.4, F.x + F.w / 2, 6, 9, (gg, q, r, c) => {
      quadPath(gg, q);
      gg.fillStyle = (r + c) % 2 ? '#efe6d2' : '#2f2a26'; gg.fill();
      if ((r + c) % 2 === 0) { const C = quadC(q); gg.fillStyle = '#c9a24a'; ell(gg, C[0], C[1], C[2] * 0.18, C[3] * 0.18, 0); gg.fill(); }
    });
    floorShade(g, cw, fy, ch);
  }

  // ---------- 4. Bain en plein air au Japon, au crépuscule ----------
  function sakuraBranch(g, x, y, len, dir, s) {
    g.strokeStyle = '#3a2420'; g.lineCap = 'round';
    g.lineWidth = 5 * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dir * len * 0.4, y + len * 0.05, x + dir * len, y + len * 0.22); g.stroke();
    g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(x + dir * len * 0.45, y + len * 0.08); g.quadraticCurveTo(x + dir * len * 0.55, y + len * 0.3, x + dir * len * 0.62, y + len * 0.42); g.stroke();
    for (let i = 0; i < 34; i++) {
      const k = hash(i * 1.7 + x), bx = x + dir * len * (0.15 + k * 0.85), by = y + len * (0.05 + k * 0.2) + (hash(i * 3.3 + x) - 0.5) * len * 0.22;
      const r = (3 + hash(i * 4.1) * 4) * s;
      g.fillStyle = i % 3 === 0 ? '#ffd2e0' : i % 3 === 1 ? '#ffa8c4' : '#ff86ae'; circ(g, bx, by, r); g.fill();
      if (i % 4 === 0) { g.fillStyle = '#ffffff'; circ(g, bx - r * 0.3, by - r * 0.3, r * 0.3); g.fill(); }
    }
  }
  function sceneJapon(back, front, cw, ch, F) {
    const hy = F.y + F.h * 0.55, fy = F.y + F.h * 0.9, s = F.w / 384, fence = hy + F.h * 0.045;
    let g = back;
    g.fillStyle = lin(g, 0, 0, 0, hy, [[0, '#2a1f5e'], [0.45, '#6b58c8'], [0.8, '#f08cb0'], [1, '#ffc1b0']]);
    g.fillRect(0, 0, cw, ch);
    starsField(g, 0, 0, cw, hy * 0.45, 80, 7, 0.75);
    g.fillStyle = rad(g, F.x + F.w * 0.2, F.y + F.h * 0.16, 0, F.x + F.w * 0.2, F.y + F.h * 0.16, F.h * 0.12, [[0, 'rgba(255,240,220,0.5)'], [1, 'rgba(255,240,220,0)']]);
    g.fillRect(0, 0, cw, hy);
    g.fillStyle = '#fff3e0'; circ(g, F.x + F.w * 0.2, F.y + F.h * 0.16, F.h * 0.024); g.fill();
    g = front;
    // le mont Fuji
    const fx = F.x + F.w * 0.56, ft = hy - F.h * 0.25;
    g.fillStyle = lin(g, 0, ft, 0, hy, [[0, '#5a5aa8'], [1, '#8a72c0']]);
    g.beginPath(); g.moveTo(fx - F.w * 1.0, hy); g.lineTo(fx - F.w * 0.12, ft + F.h * 0.01); g.quadraticCurveTo(fx, ft - F.h * 0.008, fx + F.w * 0.12, ft + F.h * 0.01); g.lineTo(fx + F.w * 1.0, hy); g.closePath(); g.fill();
    g.fillStyle = '#f4f0ff';
    g.beginPath(); g.moveTo(fx - F.w * 0.12, ft + F.h * 0.01); g.quadraticCurveTo(fx, ft - F.h * 0.008, fx + F.w * 0.12, ft + F.h * 0.01);
    g.lineTo(fx + F.w * 0.2, ft + F.h * 0.07); g.lineTo(fx + F.w * 0.12, ft + F.h * 0.055); g.lineTo(fx + F.w * 0.06, ft + F.h * 0.08); g.lineTo(fx, ft + F.h * 0.06);
    g.lineTo(fx - F.w * 0.07, ft + F.h * 0.085); g.lineTo(fx - F.w * 0.13, ft + F.h * 0.055); g.lineTo(fx - F.w * 0.2, ft + F.h * 0.075); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,200,220,0.35)'; g.fillRect(0, hy - F.h * 0.06, cw, F.h * 0.02);
    hills(g, -20, cw + 20, hy - F.h * 0.005, F.h * 0.035, 2.7, 0.015, '#4a3a78', hy + 10);
    // la pagode
    const px = F.x + F.w * 0.14, pb = hy - F.h * 0.01;
    for (let i = 0; i < 5; i++) {
      const w = F.w * (0.13 - i * 0.018), y = pb - i * F.h * 0.026;
      g.fillStyle = '#2a1e3e'; g.fillRect(px - w * 0.32, y - F.h * 0.018, w * 0.64, F.h * 0.018);
      g.beginPath(); g.moveTo(px - w * 0.62, y - F.h * 0.016); g.quadraticCurveTo(px, y - F.h * 0.03, px + w * 0.62, y - F.h * 0.016); g.lineTo(px + w * 0.4, y - F.h * 0.028); g.lineTo(px - w * 0.4, y - F.h * 0.028); g.closePath(); g.fill();
    }
    g.fillStyle = '#2a1e3e'; g.fillRect(px - 1, pb - F.h * 0.18, 2, F.h * 0.05);
    // palissade de bambous
    g.fillStyle = '#5a6b3a'; g.fillRect(0, hy + 4, cw, fence - hy - 4);
    for (let x = 0; x < cw; x += 7 * s) { g.fillStyle = (x / (7 * s)) % 2 < 1 ? '#7a8f4a' : '#6a7f3e'; g.fillRect(x, hy + 2, 6 * s, fence - hy); g.fillStyle = 'rgba(40,50,20,0.5)'; g.fillRect(x, hy + 2 + (fence - hy) * 0.3, 6 * s, 1.5); g.fillRect(x, hy + 2 + (fence - hy) * 0.7, 6 * s, 1.5); }
    g.fillStyle = '#3a2a1a'; g.fillRect(0, hy + (fence - hy) * 0.45, cw, 2.5 * s);
    // l'eau chaude du bain, reflet de la lune
    g.fillStyle = lin(g, 0, fence, 0, fy, [[0, '#5a4aa8'], [1, '#2d3a78']]); g.fillRect(0, fence, cw, fy - fence);
    g.fillStyle = 'rgba(255,240,220,0.5)';
    for (let i = 0; i < 18; i++) { const y = fence + 6 + i * (fy - fence - 10) / 18, w = (10 + hash(i * 3.3) * 14) * s * (1 - i / 30); g.fillRect(F.x + F.w * 0.2 - w / 2 + (hash(i) - 0.5) * 10 * s, y, w, 1.5); }
    g.fillStyle = 'rgba(255,190,210,0.3)'; for (let i = 0; i < 40; i++) g.fillRect(hash(i * 2.9) * cw, fence + 6 + hash(i * 1.3) * (fy - fence - 10), (6 + hash(i) * 14) * s, 1.2);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,240,250,0.12)'; ell(g, F.x + F.w * (hash(i * 3.1) * 1.4 - 0.2), fence + (fy - fence) * (0.12 + i * 0.15), F.w * 0.3, 8 * s, 0); g.fill(); }
    for (let i = 0; i < 22; i++) { g.fillStyle = i % 2 ? 'rgba(255,190,215,0.85)' : 'rgba(255,225,235,0.85)'; ell(g, hash(i * 7.3) * cw, fence + 10 + hash(i * 5.7) * (fy - fence - 20), 2.6 * s, 1.5 * s, hash(i) * 3); g.fill(); }
    // rochers autour du bain
    const rock = (x, y, w, h) => { g.fillStyle = lin(g, 0, y - h, 0, y, [[0, '#7a7090'], [1, '#3a3450']]); ell(g, x, y, w, h, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; ell(g, x - w * 0.25, y - h * 0.4, w * 0.4, h * 0.25, -0.3); g.fill(); };
    for (let i = 0; i < 14; i++) rock(F.x + F.w * (-0.6 + i * 0.17) + hash(i) * 10, fence + 4, (14 + hash(i * 3) * 10) * s, (6 + hash(i * 5) * 4) * s);
    for (let i = 0; i < 16; i++) rock(F.x + F.w * (-0.7 + i * 0.16) + hash(i * 7) * 12, fy - 2, (16 + hash(i * 2) * 14) * s, (8 + hash(i * 9) * 5) * s);
    // lanterne de pierre (tōrō)
    const tx = F.x + F.w * 0.86, tb = fy - 10 * s;
    g.fillStyle = '#8a8298'; g.fillRect(tx - 4 * s, tb - 30 * s, 8 * s, 30 * s); g.fillRect(tx - 12 * s, tb - 4 * s, 24 * s, 5 * s);
    g.fillStyle = '#9a92a8'; g.fillRect(tx - 10 * s, tb - 44 * s, 20 * s, 14 * s);
    g.fillStyle = rad(g, tx, tb - 37 * s, 0, tx, tb - 37 * s, 22 * s, [[0, 'rgba(255,200,120,0.7)'], [1, 'rgba(255,200,120,0)']]); circ(g, tx, tb - 37 * s, 22 * s); g.fill();
    g.fillStyle = '#ffd890'; g.fillRect(tx - 5 * s, tb - 41 * s, 10 * s, 8 * s);
    g.fillStyle = '#7a7290'; poly(g, [tx - 16 * s, tb - 44 * s, tx + 16 * s, tb - 44 * s, tx, tb - 56 * s]); g.fill();
    // branches de cerisier qui entrent par les coins du haut
    sakuraBranch(g, F.x - 4, F.y + F.h * 0.1, F.w * 0.42, 1, s);
    sakuraBranch(g, F.x + F.w + 4, F.y + F.h * 0.07, F.w * 0.36, -1, s);
    // arbres en fleurs (côtés, grand écran)
    if (F.x > 6) {
      for (const [x0, dir] of [[-6, 1], [cw + 6, -1]]) {
        sakuraBranch(g, x0, F.y + F.h * 0.3, F.x * 0.95, dir, s * 1.3);
        sakuraBranch(g, x0, F.y + F.h * 0.55, F.x * 0.8, dir, s * 1.15);
        sakuraBranch(g, x0, F.y + F.h * 0.06, F.x * 0.7, dir, s * 1.1);
      }
    }
    // terrasse en bois (perspective)
    g.fillStyle = '#7a5236'; g.fillRect(0, fy, cw, ch - fy);
    perspFloor(g, F.x, F.x + F.w, fy, ch + (ch - fy) * 0.3, F.x + F.w / 2, 1, 11, (gg, q, r, c) => {
      quadPath(gg, q); gg.fillStyle = c % 2 ? '#8a5e3e' : '#7a5034'; gg.fill();
      gg.strokeStyle = 'rgba(40,20,10,0.45)'; gg.lineWidth = 1; gg.stroke();
    });
    g.fillStyle = lin(g, 0, fy, 0, ch, [[0, 'rgba(255,170,200,0.12)'], [1, 'rgba(0,0,0,0.2)']]); g.fillRect(0, fy, cw, ch - fy);
    floorShade(g, cw, fy, ch);
  }

  // ---------- 5. Fiesta au Mexique, la nuit ----------
  function sceneMexique(back, front, cw, ch, F) {
    const hy = F.y + F.h * 0.55, fy = F.y + F.h * 0.9, s = F.w / 384;
    let g = back;
    g.fillStyle = lin(g, 0, 0, 0, hy, [[0, '#120a3a'], [0.5, '#2e1670'], [0.85, '#7a2a7e'], [1, '#c2457a']]);
    g.fillRect(0, 0, cw, ch);
    starsField(g, 0, 0, cw, hy * 0.75, 130, 11, 0.9);
    g.fillStyle = rad(g, F.x + F.w * 0.8, F.y + F.h * 0.17, 0, F.x + F.w * 0.8, F.y + F.h * 0.17, F.h * 0.14, [[0, 'rgba(255,240,200,0.45)'], [1, 'rgba(255,240,200,0)']]); g.fillRect(0, 0, cw, hy);
    g.fillStyle = '#fff4d6'; circ(g, F.x + F.w * 0.8, F.y + F.h * 0.17, F.h * 0.032); g.fill();
    g.fillStyle = 'rgba(200,190,170,0.35)'; circ(g, F.x + F.w * 0.79, F.y + F.h * 0.165, F.h * 0.008); g.fill(); circ(g, F.x + F.w * 0.812, F.y + F.h * 0.18, F.h * 0.006); g.fill();
    g = front;
    hills(g, -20, cw + 20, hy - F.h * 0.01, F.h * 0.045, 5.5, 0.01, '#3a1c5e', hy + 20);
    const pX = F.x + F.w * 0.3, pW = F.w * 0.4, pH = F.h * 0.08;
    g.fillStyle = '#4a2468';
    for (let i = 0; i < 5; i++) { const w = pW * (1 - i * 0.18), y = hy - (i + 1) * pH / 5; g.fillRect(pX - w / 2, y, w, pH / 5 + 1); }
    g.fillStyle = '#5a2c7a'; g.fillRect(pX - pW * 0.05, hy - pH, pW * 0.1, pH);
    const saguaro = (x, yb, h, col) => {
      g.fillStyle = col;
      rr(g, x - h * 0.07, yb - h, h * 0.14, h, h * 0.07); g.fill();
      rr(g, x - h * 0.3, yb - h * 0.62, h * 0.11, h * 0.3, h * 0.05); g.fill(); rr(g, x - h * 0.3, yb - h * 0.38, h * 0.3, h * 0.1, h * 0.05); g.fill();
      rr(g, x + h * 0.19, yb - h * 0.78, h * 0.11, h * 0.36, h * 0.05); g.fill(); rr(g, x, yb - h * 0.5, h * 0.3, h * 0.1, h * 0.05); g.fill();
    };
    for (let i = 0; i < 6; i++) saguaro(F.x + F.w * (-0.6 + hash(i * 4.4) * 2.2), hy + 4, F.h * (0.05 + hash(i) * 0.04), '#2b5a3a');
    // la place : maisons colorées, carreaux sur les façades, balcons, guirlandes d'ampoules
    const hc = ['#ff5f9f', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6', '#4cd66a'];
    const top0 = hy + F.h * 0.06;
    let x = -20, i = 0;
    const roofs = [];
    while (x < cw + 20) {
      const w = (64 + hash(i * 3.9) * 40) * s, h = fy - top0 - (hash(i * 1.3) * 40) * s, y = fy - h;
      const col = hc[i % hc.length];
      g.fillStyle = col; g.fillRect(x, y, w + 1, h);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y, w * 0.08, h);
      g.fillStyle = shade(col, -0.25); g.fillRect(x - 3, y - 6 * s, w + 7, 7 * s);
      // bande de talavera sous le toit
      tileBand(g, x + 4 * s, y + 4 * s, w - 8 * s, 10 * s, 10 * s, (gg, c) => paintTalavera(gg, 'n', c % 3, 32));
      // fenêtres à balcon
      for (const wx of [0.16, 0.6]) {
        const X = x + w * wx, Y = y + 24 * s, ww = w * 0.24;
        g.fillStyle = '#ffe9a8'; rr(g, X, Y, ww, 28 * s, ww * 0.5); g.fill();
        g.fillStyle = 'rgba(255,170,60,0.35)'; rr(g, X + 2, Y + 2, ww - 4, 26 * s, ww * 0.45); g.fill();
        g.strokeStyle = '#2a1a3a'; g.lineWidth = 1.4 * s; g.strokeRect(X - 3 * s, Y + 20 * s, ww + 6 * s, 9 * s);
        for (let k = X - 2 * s; k < X + ww + 3 * s; k += 4 * s) { g.beginPath(); g.moveTo(k, Y + 20 * s); g.lineTo(k, Y + 29 * s); g.stroke(); }
        g.fillStyle = '#e8402e'; circ(g, X + ww * 0.3, Y + 18 * s, 3 * s); g.fill(); g.fillStyle = '#ffd23f'; circ(g, X + ww * 0.7, Y + 18 * s, 3 * s); g.fill();
      }
      // porte en arc
      g.fillStyle = '#2a1a3a'; rr(g, x + w * 0.38, fy - 46 * s, w * 0.24, 46 * s, w * 0.12); g.fill();
      g.fillStyle = shade(col, 0.3); g.fillRect(x + w * 0.38, fy - 4 * s, w * 0.24, 4 * s);
      roofs.push([x + w * 0.5, y - 6 * s]);
      x += w; i++;
    }
    // guirlandes d'ampoules entre les toits
    for (let k = 0; k < roofs.length - 1; k++) {
      const [x0, y0] = roofs[k], [x1, y1] = roofs[k + 1], sag = 24 * s;
      g.strokeStyle = 'rgba(30,20,40,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); g.stroke();
      for (let j = 1; j < 8; j++) {
        const u = j / 8, bx = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * (x0 + x1) / 2 + u * u * x1, by = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (Math.max(y0, y1) + sag) + u * u * y1;
        const bc = hc[(j + k) % hc.length];
        g.fillStyle = rad(g, bx, by + 3 * s, 0, bx, by + 3 * s, 8 * s, [[0, rgba(bc, 0.55)], [1, rgba(bc, 0)]]); circ(g, bx, by + 3 * s, 8 * s); g.fill();
        g.fillStyle = mix(bc, '#ffffff', 0.5); circ(g, bx, by + 3 * s, 2.4 * s); g.fill();
      }
    }
    // cactus en pot devant
    for (const cx of [F.x + F.w * 0.08, F.x + F.w * 0.92]) {
      g.fillStyle = '#c4552a'; poly(g, [cx - 12 * s, fy - 16 * s, cx + 12 * s, fy - 16 * s, cx + 9 * s, fy, cx - 9 * s, fy]); g.fill();
      tileBand(g, cx - 11 * s, fy - 14 * s, 22 * s, 7 * s, 7 * s, (gg, c) => paintTalavera(gg, 'n', c % 2, 32));
      saguaro(cx, fy - 15 * s, 42 * s, '#3f8a4a');
      g.fillStyle = '#ff5fa0'; circ(g, cx, fy - 58 * s, 3.4 * s); g.fill();
    }
    // sol : terre cuite et talavera
    g.fillStyle = '#b9583a'; g.fillRect(0, fy, cw, ch - fy);
    perspFloor(g, F.x, F.x + F.w, fy, ch + (ch - fy) * 0.3, F.x + F.w / 2, 5, 7, (gg, q, r, c) => {
      quadPath(gg, q); gg.fillStyle = (r * 7 + c) % 4 === 0 ? '#f6f0e2' : (r + c) % 2 ? '#c4633f' : '#a94e30'; gg.fill();
      if ((r * 7 + c) % 4 === 0) { const C = quadC(q); gg.fillStyle = '#1c3f9e'; ell(gg, C[0], C[1], C[2] * 0.3, C[3] * 0.3, 0); gg.fill(); gg.fillStyle = '#f6c430'; ell(gg, C[0], C[1], C[2] * 0.12, C[3] * 0.12, 0); gg.fill(); }
      gg.strokeStyle = 'rgba(60,20,10,0.35)'; gg.lineWidth = 1; gg.stroke();
    });
    floorShade(g, cw, fy, ch);
  }

  // ---------- 6. Le Palais de cristal, sous les aurores ----------
  function penguin(g, x, y, s, flip) {
    g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
    g.fillStyle = 'rgba(0,30,60,0.2)'; ell(g, 0, 1, 10, 3, 0); g.fill();
    g.fillStyle = '#1c2230'; ell(g, 0, -12, 9, 13, 0); g.fill();
    g.fillStyle = '#ffffff'; ell(g, 1.5, -10, 6, 10, 0); g.fill();
    g.fillStyle = '#1c2230'; circ(g, 0, -24, 7); g.fill();
    g.fillStyle = '#ffffff'; circ(g, 2.5, -25, 2.4); g.fill(); g.fillStyle = '#1c2230'; circ(g, 3, -25, 1.2); g.fill();
    g.fillStyle = '#ffb02e'; poly(g, [6, -23, 11, -21.5, 6, -20]); g.fill();
    g.fillStyle = '#ffb02e'; ell(g, -3, 0, 3.4, 1.4, 0); g.fill(); ell(g, 4, 0, 3.4, 1.4, 0); g.fill();
    g.fillStyle = '#1c2230'; ell(g, -8, -12, 2.6, 7, 0.3); g.fill();
    g.fillStyle = '#ff5f7e'; g.fillRect(-6, -19, 12, 3);
    g.restore();
  }
  function sceneCristal(back, front, cw, ch, F) {
    const hy = F.y + F.h * 0.58, fy = F.y + F.h * 0.9, s = F.w / 384;
    let g = back;
    g.fillStyle = lin(g, 0, 0, 0, hy, [[0, '#020718'], [0.6, '#082a5a'], [1, '#1f5f8f']]);
    g.fillRect(0, 0, cw, ch);
    starsField(g, 0, 0, cw, hy, 170, 21, 1);
    g = front;
    hills(g, -20, cw + 20, hy - F.h * 0.05, F.h * 0.12, 3.3, 0.008, '#3d6fa8', hy + 6);
    hills(g, -20, cw + 20, hy - F.h * 0.01, F.h * 0.06, 1.1, 0.014, '#8fc2e8', hy + 6);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 12; i++) { const x = hash(i * 3.7) * cw, y = hy - F.h * (0.08 + hash(i * 2.1) * 0.06); poly(g, [x - 9 * s, y + 7 * s, x, y, x + 9 * s, y + 7 * s]); g.fill(); }
    // le palais : tours de cristal facettées
    const spire = (x, yb, w, h, col) => {
      g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, shade(col, -0.3)], [0.5, shade(col, 0.4)], [1, shade(col, -0.1)]]);
      poly(g, [x - w / 2, yb, x - w / 2, yb - h * 0.75, x, yb - h, x + w / 2, yb - h * 0.75, x + w / 2, yb]); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = Math.max(0.8, w * 0.05);
      g.beginPath(); g.moveTo(x, yb - h); g.lineTo(x, yb); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)'; star(g, x, yb - h, 4, w * 0.35, w * 0.06, 0); g.fill();
    };
    const pc = F.x + F.w * 0.5, pb = hy + 2;
    g.fillStyle = 'rgba(126,240,255,0.18)'; ell(g, pc, pb - F.h * 0.08, F.w * 0.5, F.h * 0.12, 0); g.fill();
    const towers = [[-0.34, 0.06, 0.15, '#7fb8ff'], [-0.22, 0.07, 0.21, '#a98cff'], [-0.1, 0.08, 0.27, '#7ef0ff'], [0, 0.1, 0.34, '#c9f6ff'], [0.1, 0.08, 0.27, '#7ef0ff'], [0.22, 0.07, 0.21, '#a98cff'], [0.34, 0.06, 0.15, '#7fb8ff']];
    for (const t of towers) spire(pc + t[0] * F.w, pb, t[1] * F.w, t[2] * F.h, t[3]);
    g.fillStyle = lin(g, 0, pb - F.h * 0.06, 0, pb, [[0, '#cfeeff'], [1, '#7fb0e0']]); g.fillRect(pc - F.w * 0.4, pb - F.h * 0.05, F.w * 0.8, F.h * 0.05);
    g.fillStyle = 'rgba(255,240,180,0.85)'; for (let i = 0; i < 9; i++) { rr(g, pc - F.w * 0.36 + i * F.w * 0.085, pb - F.h * 0.04, F.w * 0.03, F.h * 0.028, F.w * 0.015); g.fill(); }
    // champ de neige et lac gelé qui reflète le palais
    g.fillStyle = lin(g, 0, hy, 0, fy, [[0, '#e2f2ff'], [1, '#a8d0f0']]); g.fillRect(0, hy + 2, cw, fy - hy);
    const ly = hy + F.h * 0.06, lh = F.h * 0.16;
    g.save(); ell(g, pc, ly + lh / 2, F.w * 0.46, lh / 2, 0); g.clip();
    g.fillStyle = lin(g, 0, ly, 0, ly + lh, [[0, '#4f86c0'], [1, '#9cc8ec']]); g.fillRect(pc - F.w * 0.5, ly, F.w, lh);
    g.globalAlpha = 0.35; g.save(); g.translate(0, ly * 2 + 2); g.scale(1, -0.6);
    for (const t of towers) spire(pc + t[0] * F.w, ly, t[1] * F.w, t[2] * F.h, t[3]);
    g.restore(); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 16; i++) g.fillRect(pc - F.w * 0.4 + hash(i * 2.3) * F.w * 0.8, ly + hash(i * 3.1) * lh, (8 + hash(i) * 20) * s, 1.4);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; ell(g, pc, ly + lh / 2, F.w * 0.46, lh / 2, 0); g.stroke();
    // congères
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#f4fbff' : '#dcefff'; ell(g, F.x + F.w * (-0.4 + i * 0.3), fy - 4 * s, F.w * 0.22, 14 * s, 0); g.fill(); }
    penguin(g, F.x + F.w * 0.2, fy - 10 * s, 1.15 * s, false);
    penguin(g, F.x + F.w * 0.28, fy - 6 * s, 0.9 * s, true);
    // grappes de cristaux
    const cluster = (x, yb, h, flip) => {
      const cc = ['#7ef0ff', '#c79bff', '#ff9ad5', '#ffffff'];
      for (let i = 0; i < 7; i++) {
        const w = h * (0.14 + hash(i * 2.3 + x) * 0.1), hh = h * (0.4 + hash(i * 3.9 + x) * 0.6), cx = x + flip * h * (i * 0.09 - 0.1), a = flip * (-0.35 + i * 0.12);
        g.save(); g.translate(cx, yb); g.rotate(a);
        g.fillStyle = lin(g, -w / 2, 0, w / 2, 0, [[0, shade(cc[i % 4], -0.25)], [0.5, shade(cc[i % 4], 0.4)], [1, shade(cc[i % 4], -0.05)]]);
        poly(g, [-w / 2, 0, -w / 2, -hh * 0.8, 0, -hh, w / 2, -hh * 0.8, w / 2, 0]); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -hh); g.lineTo(0, 0); g.stroke();
        g.restore();
      }
    };
    cluster(F.x + F.w * 0.9, fy, 60 * s, -1);
    if (F.x > 6) { cluster(F.x * 0.25, fy, Math.min(F.x * 1.3, F.h * 0.4), 1); cluster(cw - F.x * 0.25, fy, Math.min(F.x * 1.3, F.h * 0.4), -1); }
    // sol de glace brillante
    g.fillStyle = lin(g, 0, fy, 0, ch, [[0, '#bfe4ff'], [1, '#6fa6d8']]); g.fillRect(0, fy, cw, ch - fy);
    perspFloor(g, F.x, F.x + F.w, fy, ch + (ch - fy) * 0.3, F.x + F.w / 2, 4, 6, (gg, q, r, c) => {
      quadPath(gg, q); gg.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(120,180,240,0.18)'; gg.fill();
      gg.strokeStyle = 'rgba(255,255,255,0.55)'; gg.lineWidth = 1; gg.stroke();
    });
    floorShade(g, cw, fy, ch);
  }

  const SCENES = { portugal: sceneLisbonne, maroc: sceneMarrakech, rome: sceneRome, japon: sceneJapon, mexique: sceneMexique, cristal: sceneCristal };
  // peint le décor d'un pays : { back, front } (deux calques à la résolution res)
  function paintScene(wid, cw, ch, F, res) {
    const back = mkCanvas(cw * res, ch * res), front = mkCanvas(cw * res, ch * res);
    const gb = back.getContext('2d'), gf = front.getContext('2d');
    gb.setTransform(res, 0, 0, res, 0, 0); gf.setTransform(res, 0, 0, res, 0, 0);
    try { (SCENES[wid] || sceneLisbonne)(gb, gf, cw, ch, F); } catch (e) { /* un décor raté ne doit jamais casser le jeu */ }
    return { back, front, wid };
  }

  // ===========================================================================
  // BOSS — un par pays, dessinés en vecteurs (centre = 0, 0 ; unités logiques). st = { t, ph (phase 0..2),
  // flash (0..1), head (image d'un copain ou null), sad (vaincu), dir (−1 / 1), anim… }.
  // Ils sont gentils et drôles : rien d'effrayant (les enfants jouent).
  // ===========================================================================
  const OUTL = 'rgba(24,14,34,0.85)';
  function outline(g, w) { g.lineWidth = w || 2.4; g.strokeStyle = OUTL; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  function gloss(g, x, y, rx, ry, a) { g.fillStyle = 'rgba(255,255,255,' + (a || 0.5) + ')'; ell(g, x, y, rx, ry, -0.5); g.fill(); }
  function cuteEyes(g, x, y, sep, r, look, sad, blink) {
    for (const s of [-1, 1]) {
      const ex = x + s * sep;
      if (blink > 0.85) { g.strokeStyle = OUTL; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ex - r, y); g.lineTo(ex + r, y); g.stroke(); continue; }
      g.fillStyle = '#ffffff'; circ(g, ex, y, r); g.fill(); outline(g, 1.8);
      g.fillStyle = '#1a1424'; circ(g, ex + (look || 0) * r * 0.3, y + (sad ? r * 0.25 : 0), r * 0.55); g.fill();
      g.fillStyle = '#ffffff'; circ(g, ex + (look || 0) * r * 0.3 - r * 0.2, y - r * 0.22, r * 0.2); g.fill();
      if (sad) { g.strokeStyle = OUTL; g.lineWidth = 2; g.beginPath(); g.moveTo(ex - r * 0.9, y - r * 1.25 + s * r * 0.3); g.lineTo(ex + r * 0.9, y - r * 1.25 - s * r * 0.3); g.stroke(); }
    }
  }
  function friendHead(g, st, x, y, h) {
    const im = st.sad ? (st.headSad || st.head) : st.head;
    if (!imgOk(im)) return false;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
    drawHeadImg(g, im, x, y, h);
    g.restore();
    return true;
  }

  // ---------- 1. Le Coq de Barcelos ----------
  function paintCoq(g, st) {
    const t = st.t, walk = Math.sin(t * 7) * (st.walking ? 1 : 0), flap = st.flap || 0;
    g.save();
    g.scale(st.dir || 1, 1);
    // pattes
    g.strokeStyle = '#f29a1f'; g.lineWidth = 5; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      const lx = 8 + s * 14, sw = walk * s * 6;
      g.beginPath(); g.moveTo(lx, 44); g.lineTo(lx + sw, 64); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.moveTo(lx + sw - 9, 67); g.lineTo(lx + sw + 6, 66); g.moveTo(lx + sw, 64); g.lineTo(lx + sw - 5, 68); g.stroke(); g.lineWidth = 5;
    }
    // queue : grandes plumes en arc, bouts peints
    const tail = [['#1c1a24', 0], ['#26222e', 1], ['#1c1a24', 2], ['#2c2836', 3], ['#1c1a24', 4]];
    for (const [col, i] of tail) {
      const a = -1.25 + i * 0.32 + Math.sin(t * 2 + i) * 0.04;
      g.save(); g.translate(38, 4); g.rotate(a);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(30, -26, 58, -8 + i * 2); g.quadraticCurveTo(34, -6, 0, 10); g.closePath();
      g.fillStyle = col; g.fill(); outline(g, 2);
      g.fillStyle = ['#e8402e', '#f6c430', '#2e9a52', '#3b82ff', '#e8402e'][i]; circ(g, 46, -9 + i * 1.6, 5); g.fill();
      g.fillStyle = '#ffffff'; circ(g, 46, -9 + i * 1.6, 2); g.fill();
      g.restore();
    }
    // corps noir verni
    g.beginPath(); g.moveTo(-34, -30); g.bezierCurveTo(-58, 0, -40, 44, 4, 46); g.bezierCurveTo(46, 48, 58, 10, 40, -6); g.bezierCurveTo(22, -20, -6, -14, -16, -36); g.closePath();
    g.fillStyle = lin(g, -40, -30, 40, 46, [[0, '#3a3446'], [0.5, '#1d1a26'], [1, '#100e16']]); g.fill(); outline(g, 2.6);
    // décor peint : cœurs, fleurs et points
    const heart = (x, y, s, c) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.9); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.stroke();
    };
    heart(-14, 14, 9, '#e8402e'); heart(14, 26, 7, '#f6c430'); heart(24, 4, 6, '#e8402e');
    for (const [x, y, c] of [[-26, -4, '#f6c430'], [-2, 32, '#2e9a52'], [2, 4, '#ffffff'], [-30, 18, '#3b82ff'], [30, 30, '#ffffff']]) { g.fillStyle = c; circ(g, x, y, 2.6); g.fill(); }
    petals(g, -2, -8, 5, 1, 7, 3.5, t * 0.3, '#f6c430'); g.fillStyle = '#e8402e'; circ(g, -2, -8, 2.4); g.fill();
    // aile (bat quand il vole)
    g.save(); g.translate(14, 4); g.rotate(-0.25 - flap * 0.6);
    g.beginPath(); g.moveTo(-14, -6); g.quadraticCurveTo(10, -22, 30, -4); g.quadraticCurveTo(20, 18, -10, 14); g.closePath();
    g.fillStyle = '#2a2634'; g.fill(); outline(g, 2);
    g.strokeStyle = '#f6c430'; g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-2 + i * 9, 6, 5, 0.2, Math.PI - 0.2); g.stroke(); }
    g.restore();
    // cou et tête (ou la tête d'un copain coiffée de la crête)
    gloss(g, -26, -8, 9, 4, 0.22);
    if (st.head) {
      const hy = -52;
      // crête-chapeau
      g.fillStyle = '#e8402e';
      for (let i = 0; i < 5; i++) { circ(g, -36 + i * 9, hy - 25 - Math.sin(i * 1.3) * 3, 7); g.fill(); }
      friendHead(g, st, -18, hy, 50);
      g.fillStyle = '#e8402e'; for (let i = 0; i < 5; i++) { circ(g, -36 + i * 9, hy - 27 - Math.sin(i * 1.3) * 3, 5.5); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; circ(g, -32, hy - 30, 2.4); g.fill();
    } else {
      // crête rouge
      g.beginPath();
      for (let i = 0; i < 5; i++) { const cx = -50 + i * 7; g.moveTo(cx + 6, -62); g.arc(cx, -62 - Math.sin(i * 1.4) * 2, 6.5, 0, TAU); }
      g.fillStyle = '#e8402e'; g.fill();
      ell(g, -30, -50, 19, 17, 0); g.fillStyle = '#1d1a26'; g.fill(); outline(g, 2.4);
      // bec et barbillon
      g.fillStyle = '#f6b21f'; poly(g, [-47, -52, -64, -46, -46, -42]); g.fill(); outline(g, 1.6);
      g.fillStyle = '#e8402e'; ell(g, -44, -34, 5, 8, 0.2); g.fill(); outline(g, 1.4);
      // œil
      const sad = st.sad;
      g.fillStyle = '#ffffff'; circ(g, -34, -54, 6); g.fill();
      g.fillStyle = '#1a1424'; circ(g, -35.5, -53 + (sad ? 1.5 : 0), 3.2); g.fill();
      g.fillStyle = '#ffffff'; circ(g, -36.6, -54.5, 1.1); g.fill();
      if (st.ph >= 1 && !sad) { g.strokeStyle = OUTL; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-42, -63); g.lineTo(-28, -59); g.stroke(); }
      if (sad) { g.fillStyle = '#5ec8ff'; ell(g, -34, -44, 2.2, 4, 0); g.fill(); }
      gloss(g, -24, -58, 5, 2.5, 0.35);
    }
    g.restore();
  }

  // ---------- 2. La Grande Théière (thé à la menthe) ----------
  function paintTheiere(g, st) {
    const t = st.t, lid = st.lid || 0, tilt = st.tilt || 0;
    g.save();
    g.rotate(tilt * (st.dir || 1));
    const silver = (x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, '#f4f6fa'], [0.3, '#c9ced8'], [0.55, '#8d95a6'], [0.75, '#dfe3ea'], [1, '#7b8294']]);
    // pieds
    g.fillStyle = '#9aa1b0';
    for (const x of [-32, -10, 12, 34]) { rr(g, x - 5, 52, 10, 12, 3); g.fill(); outline(g, 1.6); }
    // bec en S
    g.beginPath(); g.moveTo(-40, 26); g.bezierCurveTo(-64, 18, -62, -10, -78, -30); g.lineTo(-70, -36); g.bezierCurveTo(-54, -16, -48, 6, -34, 8); g.closePath();
    g.fillStyle = silver(-78, -36, -34, 26); g.fill(); outline(g, 2.2);
    g.fillStyle = '#c9973b'; ell(g, -74, -33, 6, 3, 0.7); g.fill();
    // anse
    g.lineWidth = 9; g.strokeStyle = '#7b8294'; g.beginPath(); g.moveTo(40, -14); g.bezierCurveTo(78, -20, 76, 44, 42, 36); g.stroke();
    g.lineWidth = 5; g.strokeStyle = '#d9dde5'; g.beginPath(); g.moveTo(40, -14); g.bezierCurveTo(74, -18, 72, 40, 42, 36); g.stroke();
    // panse
    g.beginPath(); g.moveTo(-26, -24); g.bezierCurveTo(-60, -10, -60, 54, 0, 56); g.bezierCurveTo(60, 54, 60, -10, 26, -24); g.closePath();
    g.fillStyle = silver(-56, -24, 56, 56); g.fill(); outline(g, 2.6);
    // gravures (arabesques) et bande dorée
    g.strokeStyle = 'rgba(70,74,90,0.55)'; g.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 18, 34, 9, Math.PI, TAU); g.stroke(); }
    g.fillStyle = '#c9973b'; g.fillRect(-52, 18, 104, 5);
    g.strokeStyle = 'rgba(255,240,180,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-50, 19); g.lineTo(50, 19); g.stroke();
    if (!st.head) {
      cuteEyes(g, 0, 0, 16, 9, Math.sin(t * 0.9) * 0.8, st.sad, (t % 4) > 3.85 ? 1 : 0);
      g.strokeStyle = OUTL; g.lineWidth = 2.4; g.beginPath();
      if (st.sad) g.arc(0, 18, 8, Math.PI + 0.5, -0.5); else g.arc(0, 8, 9, 0.3, Math.PI - 0.3);
      g.stroke();
      g.fillStyle = 'rgba(255,120,150,0.4)'; ell(g, -26, 10, 6, 3.5, 0); g.fill(); ell(g, 26, 10, 6, 3.5, 0); g.fill();
    } else {
      star(g, 0, 2, 8, 14, 10, Math.PI / 8); g.fillStyle = '#19c9a3'; g.fill(); outline(g, 1.4);
      g.fillStyle = '#c9973b'; circ(g, 0, 2, 4); g.fill();
    }
    gloss(g, -30, -2, 10, 22, 0.35);
    // col, tête du copain qui sort de la théière, couvercle-chapeau
    g.fillStyle = silver(-24, -36, 24, -22); rr(g, -24, -36, 48, 14, 5); g.fill(); outline(g, 2.2);
    const ly = st.head ? -80 - lid * 14 : -36 - lid * 34;
    if (st.head) friendHead(g, st, 0, -56 - lid * 4, 50);
    g.save(); g.translate(0, ly);
    g.beginPath(); g.moveTo(-26, 0); g.bezierCurveTo(-26, -26, 26, -26, 26, 0); g.closePath();
    g.fillStyle = silver(-26, -26, 26, 0); g.fill(); outline(g, 2.2);
    g.fillStyle = '#c9973b'; g.fillRect(-26, -4, 52, 4);
    // flèche du couvercle (comme un petit minaret)
    g.fillStyle = silver(-6, -44, 6, -18); rr(g, -5, -36, 10, 16, 3); g.fill(); outline(g, 1.6);
    g.fillStyle = '#ffd34d'; circ(g, 0, -40, 5); g.fill(); outline(g, 1.4); circ(g, 0, -48, 3); g.fill();
    gloss(g, -10, -14, 6, 3, 0.5);
    g.restore();
    g.restore();
  }

  // ---------- 3. Neptune en mosaïque (tesselles qui tombent quand on le frappe) ----------
  // grille de tesselles : construite à partir d'un petit dessin (ou de la photo d'un copain), voir buildNeptuneTiles
  const NEP_COLS = 22, NEP_ROWS = 24, NEP_T = 6;
  const NEP_PAL = ['#efe6d2', '#2b2622', '#b5553a', '#d79b3f', '#e9c457', '#2c79a6', '#3aa9a2', '#8fcadb', '#1d4a72', '#f2c8a0', '#d9a07a', '#a86c4c', '#ffffff', '#5fb8c9', '#6e8e48'];
  function nearestPal(r, g2, b) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < NEP_PAL.length; i++) { const c = hexRgb(NEP_PAL[i]), d = (c[0] - r) ** 2 + (c[1] - g2) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = i; } }
    return NEP_PAL[best];
  }
  function paintNeptuneSource(g, w, h, head) {
    // le fond : la mer en vagues bleues
    g.fillStyle = '#2c79a6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d4a72'; for (let y = 2; y < h; y += 5) for (let x = (y % 2) * 2; x < w; x += 6) g.fillRect(x, y, 3, 1);
    if (head && imgOk(head)) {
      const hh = h * 0.78, ww = hh * imgW(head) / imgH(head);
      g.drawImage(head, w / 2 - ww / 2, h * 0.2, ww, hh);
    } else {
      // visage de Neptune : peau, barbe d'écume, yeux, sourcils broussailleux
      g.fillStyle = '#f2c8a0'; ell(g, w / 2, h * 0.5, w * 0.26, h * 0.26, 0); g.fill();
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) { circ(g, w / 2 + (i - 3) * w * 0.07, h * 0.72 + Math.abs(i - 3) * -h * 0.03, w * 0.08); g.fill(); }
      ell(g, w / 2, h * 0.84, w * 0.2, h * 0.1, 0); g.fill();
      g.fillStyle = '#8fcadb'; for (let i = 0; i < 5; i++) { circ(g, w / 2 + (i - 2) * w * 0.08, h * 0.8, w * 0.03); g.fill(); }
      g.fillStyle = '#ffffff'; ell(g, w * 0.4, h * 0.46, w * 0.06, h * 0.045, 0); g.fill(); ell(g, w * 0.6, h * 0.46, w * 0.06, h * 0.045, 0); g.fill();
      g.fillStyle = '#1d4a72'; circ(g, w * 0.4, h * 0.465, w * 0.032); g.fill(); circ(g, w * 0.6, h * 0.465, w * 0.032); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(w * 0.31, h * 0.38, w * 0.15, h * 0.035); g.fillRect(w * 0.54, h * 0.38, w * 0.15, h * 0.035);
      g.fillStyle = '#d9a07a'; ell(g, w / 2, h * 0.56, w * 0.05, h * 0.05, 0); g.fill();
      g.fillStyle = '#b5553a'; ell(g, w / 2, h * 0.66, w * 0.08, h * 0.025, 0); g.fill();
      g.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { circ(g, w * (0.26 + i * 0.12), h * 0.3, w * 0.07); g.fill(); }
    }
    // couronne d'or à pointes
    g.fillStyle = '#e9c457';
    g.fillRect(w * 0.25, h * 0.14, w * 0.5, h * 0.07);
    for (let i = 0; i < 5; i++) { const x = w * (0.27 + i * 0.115); poly(g, [x, h * 0.15, x + w * 0.05, h * 0.02, x + w * 0.1, h * 0.15]); g.fill(); }
    g.fillStyle = '#2c79a6'; for (let i = 0; i < 3; i++) g.fillRect(w * (0.34 + i * 0.13), h * 0.16, w * 0.05, h * 0.03);
  }
  // → tableau de tesselles [{ c, r, col, on }]
  function buildNeptuneTiles(head) {
    const src = mkCanvas(NEP_COLS, NEP_ROWS), g = src.getContext('2d');
    try { paintNeptuneSource(g, NEP_COLS, NEP_ROWS, head); } catch (e) { /* rien */ }
    let data = null;
    try { data = g.getImageData(0, 0, NEP_COLS, NEP_ROWS).data; } catch (e) { data = null; }
    const out = [];
    const cx = (NEP_COLS - 1) / 2, cy = (NEP_ROWS - 1) / 2;
    for (let r = 0; r < NEP_ROWS; r++) for (let c = 0; c < NEP_COLS; c++) {
      const dx = (c - cx) / (NEP_COLS / 2), dy = (r - cy) / (NEP_ROWS / 2);
      if (dx * dx + dy * dy > 1.02) continue;                 // médaillon rond
      let col = '#2c79a6';
      if (data) { const i = (r * NEP_COLS + c) * 4; col = data[i + 3] < 40 ? '#2c79a6' : nearestPal(data[i], data[i + 1], data[i + 2]); }
      const rim = dx * dx + dy * dy > 0.8;
      out.push({ c, r, col: rim ? (((c + r) % 2) ? '#e9c457' : '#d79b3f') : col, on: true, rim, j: hash(r * 31 + c) });
    }
    return out;
  }
  function paintNeptuneMosaic(g, tiles) {
    const T = NEP_T, ox = -NEP_COLS * T / 2, oy = -NEP_ROWS * T / 2;
    // mortier (visible là où les tesselles sont tombées)
    g.fillStyle = '#4a3f36'; circ(g, 0, 0, NEP_COLS * T / 2 + 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; circ(g, 0, 3, NEP_COLS * T / 2 + 2); g.fill();
    for (const q of tiles) {
      if (!q.on) continue;
      const x = ox + q.c * T + (q.j - 0.5) * 0.8, y = oy + q.r * T + (hash(q.j * 7) - 0.5) * 0.8;
      g.fillStyle = q.col; g.fillRect(x + 0.5, y + 0.5, T - 1, T - 1);
      if (q.col === '#e9c457') { g.fillStyle = 'rgba(255,255,230,0.55)'; g.fillRect(x + 0.8, y + 0.8, T * 0.45, T * 0.3); }
      else { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x + 0.5, y + 0.5, T - 1, 1.2); }
    }
    // reflet du médaillon
    g.fillStyle = 'rgba(255,255,255,0.08)'; ell(g, -20, -30, 40, 22, -0.4); g.fill();
  }
  const NEP_R = NEP_COLS * NEP_T / 2 + 4;
  function paintNeptune(g, st) {
    if (st.mosaic) g.drawImage(st.mosaic, -NEP_R, -NEP_R, NEP_R * 2, NEP_R * 2);
    else paintNeptuneMosaic(g, st.tiles || []);
    if (st.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + st.flash * 0.45 + ')'; circ(g, 0, 0, NEP_COLS * NEP_T / 2); g.fill(); }
    // le trident (doré) tenu sur le côté
    if (!st.noTrident) paintTrident(g, (NEP_COLS * NEP_T / 2 + 10) * (st.dir || 1), 6 + Math.sin(st.t * 2) * 3, 0.12 * (st.dir || 1), 1);
  }
  function paintTrident(g, x, y, rot, k) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k);
    g.fillStyle = lin(g, -4, 0, 4, 0, [[0, '#b8862a'], [0.5, '#ffe7a0'], [1, '#a8781e']]);
    rr(g, -3, -40, 6, 92, 3); g.fill(); outline(g, 1.6);
    g.beginPath(); g.moveTo(-18, -38); g.quadraticCurveTo(-18, -52, -14, -64); g.lineTo(-10, -50); g.quadraticCurveTo(-8, -44, 0, -42); g.quadraticCurveTo(8, -44, 10, -50); g.lineTo(14, -64); g.quadraticCurveTo(18, -52, 18, -38); g.quadraticCurveTo(8, -32, 0, -32); g.quadraticCurveTo(-8, -32, -18, -38); g.closePath();
    g.fill(); outline(g, 1.6);
    poly(g, [-3, -42, 0, -72, 3, -42]); g.fill(); outline(g, 1.4);
    g.restore();
  }

  // ---------- 4. Le Chat porte-bonheur (maneki-neko) ----------
  function paintChat(g, st) {
    const t = st.t, wave = st.wave != null ? st.wave : Math.sin(t * 5) * 0.5 + 0.5;
    const white = (x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, '#ffffff'], [0.6, '#f1ece4'], [1, '#d9d0c4']]);
    g.save();
    // corps assis
    g.beginPath(); g.moveTo(-36, -10); g.bezierCurveTo(-62, 20, -56, 68, 0, 68); g.bezierCurveTo(56, 68, 62, 20, 36, -10); g.closePath();
    g.fillStyle = white(-50, -10, 50, 68); g.fill(); outline(g, 2.6);
    // taches (calico)
    g.save(); g.clip();
    g.fillStyle = '#ffa64a'; ell(g, 34, 30, 18, 14, 0.4); g.fill();
    g.fillStyle = '#2b2632'; ell(g, -38, 48, 14, 10, -0.3); g.fill();
    g.restore();
    // pièce d'or (koban) tenue par la patte droite
    g.save(); g.translate(22, 36);
    ell(g, 0, 0, 16, 22, 0); g.fillStyle = lin(g, -16, -22, 16, 22, [[0, '#fff0a0'], [0.5, '#e6b84a'], [1, '#b8862a']]); g.fill(); outline(g, 2);
    g.strokeStyle = 'rgba(120,80,10,0.7)'; g.lineWidth = 1.2; for (const y of [-10, 0, 10]) { g.beginPath(); g.moveTo(-9, y); g.lineTo(9, y); g.stroke(); }
    g.fillStyle = '#ffffff'; ell(g, -6, -10, 3, 6, 0.3); g.fill();
    g.restore();
    g.fillStyle = white(10, 40, 40, 60); ell(g, 18, 56, 14, 10, 0); g.fill(); outline(g, 2);
    // collier rouge et grelot
    g.fillStyle = '#e23b3b'; rr(g, -34, -14, 68, 10, 5); g.fill(); outline(g, 1.8);
    g.fillStyle = lin(g, -8, -8, 8, 10, [[0, '#fff2a0'], [1, '#d99a1a']]); circ(g, 0, 0, 8); g.fill(); outline(g, 1.6);
    g.strokeStyle = 'rgba(100,60,0,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-6, 1); g.lineTo(6, 1); g.moveTo(0, 2); g.lineTo(0, 7); g.stroke();
    // patte levée qui salue
    g.save(); g.translate(-38, -6); g.rotate(-0.25 - wave * 0.55);
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(-12, -38); g.quadraticCurveTo(0, -54, 12, -38); g.lineTo(10, 0); g.closePath();
    g.fillStyle = white(-12, -54, 12, 0); g.fill(); outline(g, 2.2);
    g.fillStyle = '#ff9fb8'; ell(g, 0, -40, 5, 4, 0); g.fill();
    for (const s of [-1, 0, 1]) { circ(g, s * 5, -47, 2); g.fill(); }
    g.restore();
    // tête
    if (st.head) {
      const hy = -42;
      // oreilles-chapeau
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * 8, hy - 18); g.lineTo(s * 24, hy - 46); g.lineTo(s * 30, hy - 12); g.closePath();
        g.fillStyle = '#ffffff'; g.fill(); outline(g, 2);
        g.beginPath(); g.moveTo(s * 13, hy - 20); g.lineTo(s * 23, hy - 38); g.lineTo(s * 26, hy - 16); g.closePath(); g.fillStyle = '#ff9fb8'; g.fill();
      }
      friendHead(g, st, 0, hy, 58);
    } else {
      const hy = -40;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * 12, hy - 26); g.lineTo(s * 30, hy - 52); g.lineTo(s * 38, hy - 14); g.closePath();
        g.fillStyle = '#ffffff'; g.fill(); outline(g, 2.2);
        g.beginPath(); g.moveTo(s * 17, hy - 27); g.lineTo(s * 29, hy - 44); g.lineTo(s * 33, hy - 20); g.closePath(); g.fillStyle = '#ff9fb8'; g.fill();
      }
      ell(g, 0, hy, 42, 34, 0); g.fillStyle = white(-42, hy - 34, 42, hy + 34); g.fill(); outline(g, 2.6);
      g.fillStyle = '#ffa64a'; ell(g, -22, hy - 20, 12, 9, 0.5); g.fill();
      // yeux plissés de bonheur (ou tristes)
      g.strokeStyle = OUTL; g.lineWidth = 3;
      for (const s of [-1, 1]) {
        g.beginPath();
        if (st.sad) g.arc(s * 15, hy + 2, 7, Math.PI + 0.3, -0.3); else if (st.ph >= 2) { g.moveTo(s * 9, hy - 6); g.lineTo(s * 22, hy - 2); } else g.arc(s * 15, hy - 2, 7, 0.2, Math.PI - 0.2);
        g.stroke();
      }
      if (st.ph >= 1 && !st.sad) { g.fillStyle = '#1a1424'; for (const s of [-1, 1]) { circ(g, s * 15, hy + 1, 4); g.fill(); } }
      g.fillStyle = '#ff7aa0'; poly(g, [-4, hy + 8, 4, hy + 8, 0, hy + 12]); g.fill();
      g.strokeStyle = OUTL; g.lineWidth = 2; g.beginPath(); g.arc(-4, hy + 13, 4, 0, Math.PI); g.arc(4, hy + 13, 4, 0, Math.PI); g.stroke();
      g.strokeStyle = 'rgba(60,50,60,0.7)'; g.lineWidth = 1.2;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 22, hy + 8 + i * 4); g.lineTo(s * 40, hy + 4 + i * 6); g.stroke(); }
      g.fillStyle = 'rgba(255,120,150,0.4)'; ell(g, -26, hy + 10, 6, 3.5, 0); g.fill(); ell(g, 26, hy + 10, 6, 3.5, 0); g.fill();
      if (st.sad) { g.fillStyle = '#5ec8ff'; ell(g, -15, hy + 12, 2.5, 5, 0); g.fill(); ell(g, 15, hy + 12, 2.5, 5, 0); g.fill(); }
      gloss(g, -18, hy - 18, 10, 5, 0.5);
    }
    gloss(g, -26, 14, 8, 16, 0.4);
    g.restore();
  }

  // ---------- 5. La Piñata géante (étoile en papier frisé) ----------
  const PIN_COLS = ['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6', '#4cd66a'];
  function fringeBand(g, x0, y0, x1, y1, w, col, t, seed) {
    // une bande de papier frisé (petites franges qui bougent)
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
    const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const k = i / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k), wob = Math.sin(t * 6 + i + seed) * 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (nx / L) * w + wob, y + (ny / L) * w); g.lineTo(x + (nx / L) * w + (x1 - x0) / n + wob, y + (ny / L) * w + (y1 - y0) / n); g.lineTo(x + (x1 - x0) / n, y + (y1 - y0) / n); g.closePath(); g.fill();
    }
  }
  const PIN_R = 116;      // rayon du corps de la piñata (image en cache)
  function paintPinataBody(g, t) {
    // cônes (5 branches) avec franges colorées et pompons
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * TAU;
      g.save(); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.moveTo(-17, -34); g.lineTo(0, -82); g.lineTo(17, -34); g.closePath();
      g.fillStyle = PIN_COLS[i % PIN_COLS.length]; g.fill();
      g.save(); g.clip();
      for (let k = 0; k < 5; k++) { const y = -38 - k * 9; fringeBand(g, -20, y, 20, y, 4, PIN_COLS[(i + k + 1) % PIN_COLS.length], t, i * 7 + k); }
      g.restore();
      g.beginPath(); g.moveTo(-17, -34); g.lineTo(0, -82); g.lineTo(17, -34); outline(g, 2.2);
      // pompon et rubans
      const sw = Math.sin(t * 3 + i) * 0.3;
      g.save(); g.translate(0, -82); g.rotate(sw);
      for (let r2 = 0; r2 < 3; r2++) { g.strokeStyle = PIN_COLS[(i + r2 + 2) % PIN_COLS.length]; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6 + r2 * 6, -14, -4 + r2 * 4, -26); g.stroke(); }
      g.fillStyle = PIN_COLS[(i + 3) % PIN_COLS.length]; circ(g, 0, 0, 6); g.fill(); outline(g, 1.6);
      g.restore();
      g.restore();
    }
    // boule centrale frisée
    g.save(); circ(g, 0, 0, 40); g.clip();
    for (let k = 0; k < 10; k++) { const y = -40 + k * 9; fringeBand(g, -42, y, 42, y, 5, PIN_COLS[k % PIN_COLS.length], t, k * 3); }
    g.restore();
    circ(g, 0, 0, 40); outline(g, 2.6);
  }
  function paintPinata(g, st) {
    const t = st.t, spin = st.spin || 0;
    g.save();
    // corde
    if (!st.noRope) { g.strokeStyle = '#c9a26a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -46); g.lineTo(0, -400); g.stroke(); g.strokeStyle = 'rgba(120,80,40,0.6)'; g.lineWidth = 1; for (let y = -50; y > -400; y -= 6) { g.beginPath(); g.moveTo(-1.5, y); g.lineTo(1.5, y - 3); g.stroke(); } }
    g.rotate(spin);
    if (st.body) g.drawImage(st.body, -PIN_R, -PIN_R, PIN_R * 2, PIN_R * 2);
    else paintPinataBody(g, t);
    g.rotate(-spin);
    if (st.head) {
      g.fillStyle = '#fff4d6'; circ(g, 0, 0, 27); g.fill(); outline(g, 2);
      friendHead(g, st, 0, -2, 46);
    } else {
      g.fillStyle = '#fff4d6'; circ(g, 0, 0, 24); g.fill(); outline(g, 2);
      cuteEyes(g, 0, -4, 9, 6, Math.sin(t) * 0.8, st.sad, (t % 3.3) > 3.15 ? 1 : 0);
      g.strokeStyle = OUTL; g.lineWidth = 2.2; g.beginPath();
      if (st.sad) g.arc(0, 14, 6, Math.PI + 0.5, -0.5); else g.arc(0, 6, 7, 0.2, Math.PI - 0.2);
      g.stroke();
      g.fillStyle = 'rgba(255,120,150,0.5)'; ell(g, -15, 6, 4, 2.5, 0); g.fill(); ell(g, 15, 6, 4, 2.5, 0); g.fill();
    }
    g.restore();
  }

  // ---------- 6. Le Grand Lustre de cristal ----------
  // pendeloques : objets à part (on les casse une à une) ; positions relatives au centre du lustre
  const LUSTRE_PENDS = (() => {
    const out = [];
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; out.push({ x: Math.cos(a) * -78, y: 22 + Math.sin(a) * 18, tier: 0 }); }
    for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; out.push({ x: Math.cos(a) * -46, y: 54 + Math.sin(a) * 12, tier: 1 }); }
    return out;
  })();
  function paintPendant(g, x, y, t, i, crack) {
    const col = ['#7ef0ff', '#c79bff', '#ff9ad5', '#eaf6ff'][i % 4];
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + i) * 0.12);
    g.strokeStyle = 'rgba(255,230,160,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, -2); g.stroke();
    g.beginPath(); g.moveTo(0, -2); g.lineTo(7, 8); g.lineTo(0, 22); g.lineTo(-7, 8); g.closePath();
    g.fillStyle = lin(g, -7, -2, 7, 22, [[0, '#ffffff'], [0.4, col], [1, shade(col, -0.35)]]); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; poly(g, [0, 0, 3, 8, 0, 12]); g.fill();
    if (crack) { g.strokeStyle = 'rgba(20,30,60,0.7)'; g.beginPath(); g.moveTo(-3, 6); g.lineTo(2, 11); g.lineTo(-1, 16); g.stroke(); }
    g.restore();
  }
  function paintLustre(g, st) {
    const t = st.t;
    const gold = (x0, y0, x1, y1) => lin(g, x0, y0, x1, y1, [[0, '#fff0b0'], [0.4, '#e6b84a'], [1, '#9a6a18']]);
    g.save();
    // chaîne
    g.strokeStyle = '#c9973b'; g.lineWidth = 2.4;
    for (let y = -60; y > (st.noChain ? -80 : -420); y -= 9) { ell(g, 0, y, 3, 5, 0); g.stroke(); }
    // couronne du haut
    g.fillStyle = gold(-30, -60, 30, -40); g.beginPath(); g.moveTo(-28, -40); g.lineTo(-20, -60); g.lineTo(20, -60); g.lineTo(28, -40); g.closePath(); g.fill(); outline(g, 2);
    // tige centrale et anneaux
    g.fillStyle = gold(-8, -40, 8, 60); rr(g, -7, -40, 14, 90, 6); g.fill(); outline(g, 1.8);
    for (const [y, w] of [[-20, 30], [6, 22], [36, 18]]) { g.fillStyle = gold(-w, y - 5, w, y + 5); ell(g, 0, y, w, 6, 0); g.fill(); outline(g, 1.6); }
    // bras courbés + bougies lumineuses
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI, ex = Math.cos(a) * -86, ey = 4 + Math.sin(a) * 16;
      g.strokeStyle = '#c9973b'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(ex * 0.5, 30, ex, ey); g.stroke();
      g.strokeStyle = '#ffe7a0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(ex * 0.5, 28, ex, ey - 1); g.stroke();
      g.fillStyle = '#fff6e0'; rr(g, ex - 3, ey - 16, 6, 14, 2); g.fill();
      const fl = 0.8 + Math.sin(t * 9 + i * 2) * 0.2;
      g.fillStyle = rad(g, ex, ey - 22, 0, ex, ey - 22, 14 * fl, [[0, 'rgba(255,240,180,0.95)'], [0.4, 'rgba(255,200,90,0.5)'], [1, 'rgba(255,180,60,0)']]); circ(g, ex, ey - 22, 14 * fl); g.fill();
      g.fillStyle = '#ffd34d'; ell(g, ex, ey - 21, 2.6, 5 * fl, 0); g.fill();
    }
    // la boule de cristal (cœur) avec une tête de copain ou une étoile
    const cy = 64, glow = 0.5 + Math.sin(t * 3) * 0.2;
    g.fillStyle = rad(g, 0, cy, 0, 0, cy, 44, [[0, 'rgba(160,240,255,' + glow + ')'], [1, 'rgba(160,240,255,0)']]); circ(g, 0, cy, 44); g.fill();
    g.fillStyle = lin(g, -26, cy - 26, 26, cy + 26, [[0, 'rgba(255,255,255,0.75)'], [0.5, 'rgba(126,240,255,0.45)'], [1, 'rgba(120,90,255,0.6)']]); circ(g, 0, cy, 26); g.fill();
    if (st.head) friendHead(g, st, 0, cy + 1, 40);
    else { g.fillStyle = '#ffffff'; star(g, 0, cy, 4, 16, 4, t * 0.6); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; star(g, 0, cy, 4, 10, 3, t * 0.6 + 0.78); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; circ(g, 0, cy, 26); g.stroke();
    gloss(g, -9, cy - 12, 8, 4, 0.7);
    if (st.cracks) { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.4; for (const c of st.cracks) { g.beginPath(); g.moveTo(c[0], cy + c[1]); g.lineTo(c[2], cy + c[3]); g.lineTo(c[4], cy + c[5]); g.stroke(); } }
    g.restore();
  }

  // table des boss : peintre, boîtes de collision (cercles), points de vie au Tour I, taille pour la carte
  const BOSS_ART = {
    coq: { paint: paintCoq, hits: [{ x: 0, y: 8, r: 46 }, { x: -30, y: -48, r: 22 }], hp: 10, w: 150, h: 150, cy: -3 },
    theiere: { paint: paintTheiere, hits: [{ x: 0, y: 16, r: 54 }, { x: 0, y: -44, r: 24 }], hp: 13, w: 160, h: 150, cy: -8 },
    neptune: { paint: paintNeptune, hits: [{ x: 0, y: 0, r: NEP_COLS * NEP_T / 2 }], hp: 15, w: 170, h: 160, cy: 0 },
    chat: { paint: paintChat, hits: [{ x: 0, y: 26, r: 50 }, { x: 0, y: -40, r: 38 }], hp: 15, w: 150, h: 170, cy: -12 },
    pinata: { paint: paintPinata, hits: [{ x: 0, y: 0, r: 50 }], hp: 15, w: 170, h: 170, cy: 0 },
    lustre: { paint: paintLustre, hits: [{ x: 0, y: 64, r: 28 }], hp: 13, w: 190, h: 170, cy: 18 }
  };

  // ===========================================================================
  // ICÔNES : médaillons des pays (carte du voyage), capsules de bonus, tampons du passeport,
  // le globe (continents simplifiés, projection orthographique) et l'avion du voyageur.
  // ===========================================================================
  // médaillon d'un pays (wi = 0..5), centré en (0, 0), rayon r ; t = temps (petite animation)
  function paintWorldIcon(g, wi, r, t) {
    const W = CARREAUX_WORLDS[((wi % NW) + NW) % NW], C = W.colors;
    t = t || 0;
    g.save();
    circ(g, 0, 0, r); g.save(); g.clip();
    switch (W.id) {
      case 'portugal': {
        g.fillStyle = lin(g, 0, -r, 0, r, [[0, '#5fb8f0'], [1, '#bfe6ff']]); g.fillRect(-r, -r, 2 * r, 2 * r);
        g.save(); g.rotate(Math.PI / 4); const s = r * 1.15; g.translate(-s / 2, -s / 2); paintAzulejo(g, 'n', 0, s); g.restore();
        break;
      }
      case 'maroc': {
        g.fillStyle = lin(g, 0, -r, 0, r, [[0, '#ff9d5c'], [1, '#ffd9a0']]); g.fillRect(-r, -r, 2 * r, 2 * r);
        star(g, 0, 0, 8, r * 0.78, r * 0.56, Math.PI / 8 + t * 0.2); g.fillStyle = '#f1e9da'; g.fill();
        star(g, 0, 0, 8, r * 0.7, r * 0.5, Math.PI / 8 + t * 0.2); g.fillStyle = '#0f8a5f'; g.fill();
        star(g, 0, 0, 8, r * 0.34, r * 0.24, t * 0.2); g.fillStyle = '#17b5ad'; g.fill();
        g.fillStyle = '#e3a63a'; circ(g, 0, 0, r * 0.13); g.fill();
        break;
      }
      case 'rome': {
        g.fillStyle = lin(g, 0, -r, 0, r, [[0, '#e0708a'], [1, '#ffd49a']]); g.fillRect(-r, -r, 2 * r, 2 * r);
        const T = r / 5;
        for (let y = -r; y < r; y += T) for (let x = -r; x < r; x += T) {
          const d = Math.hypot(x + T / 2, y + T / 2);
          g.fillStyle = d < r * 0.42 ? '#2c79a6' : d < r * 0.62 ? '#e9c457' : (((x + y) / T) | 0) % 2 ? '#efe6d2' : '#d79b3f';
          g.fillRect(x + 0.6, y + 0.6, T - 1.2, T - 1.2);
        }
        // dauphin blanc
        g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(-r * 0.32, r * 0.1); g.quadraticCurveTo(-r * 0.05, -r * 0.42, r * 0.3, -r * 0.08); g.quadraticCurveTo(r * 0.08, -r * 0.14, -r * 0.1, r * 0.12); g.closePath(); g.fill();
        poly(g, [r * 0.24, -r * 0.1, r * 0.38, -r * 0.24, r * 0.34, -r * 0.02]); g.fill();
        break;
      }
      case 'japon': {
        g.fillStyle = lin(g, 0, -r, 0, r, [[0, '#4a3a9e'], [0.6, '#f08cb0'], [1, '#ffc1b0']]); g.fillRect(-r, -r, 2 * r, 2 * r);
        g.fillStyle = '#e8432f'; circ(g, r * 0.35, -r * 0.35, r * 0.24); g.fill();
        g.fillStyle = '#2a4f9a'; g.beginPath(); g.moveTo(-r, r * 0.7); g.lineTo(-r * 0.14, -r * 0.2); g.lineTo(r * 0.14, -r * 0.2); g.lineTo(r, r * 0.7); g.lineTo(r, r); g.lineTo(-r, r); g.closePath(); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-r * 0.14, -r * 0.2); g.lineTo(r * 0.14, -r * 0.2); g.lineTo(r * 0.3, 0); g.lineTo(r * 0.1, -r * 0.04); g.lineTo(0, r * 0.06); g.lineTo(-r * 0.12, -r * 0.04); g.lineTo(-r * 0.3, 0); g.closePath(); g.fill();
        petals(g, -r * 0.5, -r * 0.5, 5, 1, r * 0.2, r * 0.1, t * 0.3, '#ffc4d6');
        break;
      }
      case 'mexique': {
        g.fillStyle = lin(g, 0, -r, 0, r, [[0, '#3a1680'], [1, '#e2458a']]); g.fillRect(-r, -r, 2 * r, 2 * r);
        const pc = ['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6'];
        g.save(); g.rotate(Math.sin(t) * 0.15);
        for (let i = 0; i < 5; i++) { g.save(); g.rotate((i / 5) * TAU); poly(g, [-r * 0.2, -r * 0.3, 0, -r * 0.82, r * 0.2, -r * 0.3]); g.fillStyle = pc[i]; g.fill(); g.restore(); }
        g.fillStyle = '#fff4d6'; circ(g, 0, 0, r * 0.36); g.fill();
        for (let i = 0; i < 3; i++) { g.strokeStyle = pc[(i + 2) % 5]; g.lineWidth = r * 0.07; circ(g, 0, 0, r * (0.36 - i * 0.07)); g.stroke(); }
        g.restore();
        break;
      }
      default: {
        g.fillStyle = lin(g, 0, -r, 0, r, [[0, '#04102a'], [1, '#14457a']]); g.fillRect(-r, -r, 2 * r, 2 * r);
        // aurore
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = ['rgba(94,255,170,0.6)', 'rgba(126,240,255,0.5)', 'rgba(199,155,255,0.5)'][i]; g.lineWidth = r * 0.12;
          g.beginPath(); for (let x = -r; x <= r; x += r / 8) { const y = -r * 0.45 + i * r * 0.12 + Math.sin(x / r * 3 + t + i) * r * 0.08; if (x === -r) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        }
        g.save(); g.translate(0, r * 0.12); g.rotate(Math.PI / 4); const s = r * 0.8; g.translate(-s / 2, -s / 2); paintCrystal(g, 'n', 0, s); g.restore();
      }
    }
    g.restore();
    // anneau doré + couleur du pays
    g.lineWidth = Math.max(1.5, r * 0.12); g.strokeStyle = C.accent; circ(g, 0, 0, r - g.lineWidth / 2); g.stroke();
    g.lineWidth = Math.max(1, r * 0.04); g.strokeStyle = 'rgba(255,255,255,0.85)'; circ(g, 0, 0, r * 0.86); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.25)'; ell(g, -r * 0.3, -r * 0.42, r * 0.38, r * 0.16, -0.5); g.fill();
    g.restore();
  }

  // icône d'un bonus (dans un rond de rayon r)
  function paintPowerIcon(g, key, r) {
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff';
    const k = r / 10;
    switch (key) {
      case 'multi': for (const [x, y] of [[-4.5, 2.5], [4.5, 2.5], [0, -4.5]]) { circ(g, x * k, y * k, 3 * k); g.fill(); } break;
      case 'large': g.lineWidth = 2.4 * k; rr(g, -7 * k, -2 * k, 14 * k, 4 * k, 2 * k); g.fill(); g.beginPath(); g.moveTo(-9 * k, -6 * k); g.lineTo(-12 * k, 0); g.lineTo(-9 * k, 6 * k); g.moveTo(9 * k, -6 * k); g.lineTo(12 * k, 0); g.lineTo(9 * k, 6 * k); g.stroke(); break;
      case 'mini': g.lineWidth = 2.4 * k; rr(g, -3.5 * k, -2 * k, 7 * k, 4 * k, 2 * k); g.fill(); g.beginPath(); g.moveTo(-11 * k, -5 * k); g.lineTo(-7 * k, 0); g.lineTo(-11 * k, 5 * k); g.moveTo(11 * k, -5 * k); g.lineTo(7 * k, 0); g.lineTo(11 * k, 5 * k); g.stroke(); break;
      case 'laser': g.lineWidth = 2.6 * k; g.beginPath(); g.moveTo(-4 * k, 7 * k); g.lineTo(-4 * k, -7 * k); g.moveTo(4 * k, 7 * k); g.lineTo(4 * k, -7 * k); g.stroke(); g.fillStyle = '#ffe14d'; circ(g, -4 * k, -7.5 * k, 2 * k); g.fill(); circ(g, 4 * k, -7.5 * k, 2 * k); g.fill(); break;
      case 'magnet': g.lineWidth = 3.4 * k; g.beginPath(); g.arc(0, -1 * k, 5.5 * k, Math.PI, 0); g.lineTo(5.5 * k, 6 * k); g.moveTo(-5.5 * k, -1 * k); g.lineTo(-5.5 * k, 6 * k); g.stroke(); g.fillStyle = '#ff5f7e'; g.fillRect(-7.2 * k, 4 * k, 3.4 * k, 3.4 * k); g.fillRect(3.8 * k, 4 * k, 3.4 * k, 3.4 * k); break;
      case 'fire': g.beginPath(); g.moveTo(0, -9 * k); g.quadraticCurveTo(8 * k, -1 * k, 5 * k, 5 * k); g.quadraticCurveTo(0, 10 * k, -5 * k, 5 * k); g.quadraticCurveTo(-7 * k, 0, -2 * k, -3 * k); g.quadraticCurveTo(-1 * k, 0, 1 * k, -2 * k); g.quadraticCurveTo(2 * k, -5 * k, 0, -9 * k); g.fill(); g.fillStyle = '#ffe14d'; ell(g, 0, 4 * k, 2.6 * k, 3.4 * k, 0); g.fill(); break;
      case 'slow': g.lineWidth = 2.2 * k; circ(g, 0, 0, 7.5 * k); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -5 * k); g.moveTo(0, 0); g.lineTo(3.5 * k, 2 * k); g.stroke(); break;
      case 'net': g.lineWidth = 1.6 * k; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 3.5 * k - 4 * k, -6 * k); g.lineTo(i * 3.5 * k + 4 * k, 6 * k); g.moveTo(i * 3.5 * k + 4 * k, -6 * k); g.lineTo(i * 3.5 * k - 4 * k, 6 * k); g.stroke(); } g.lineWidth = 2.4 * k; g.beginPath(); g.moveTo(-10 * k, 6 * k); g.lineTo(10 * k, 6 * k); g.stroke(); break;
      case 'turbo': g.beginPath(); g.moveTo(2 * k, -10 * k); g.lineTo(-6 * k, 1 * k); g.lineTo(-0.5 * k, 1 * k); g.lineTo(-3 * k, 10 * k); g.lineTo(6 * k, -2 * k); g.lineTo(0.5 * k, -2 * k); g.closePath(); g.fill(); break;
      default: star(g, 0, 0, 5, 8 * k, 3.5 * k, 0); g.fill();
    }
    g.restore();
  }
  // capsule de bonus (pilule brillante à la couleur du bonus) — largeur 2r, hauteur ~1,2r
  function paintCapsule(g, key, r) {
    const P = POWERS[key] || POWERS.multi, col = P.color, h = r * 1.15;
    g.save();
    rr(g, -r, -h / 2, 2 * r, h, h / 2);
    g.fillStyle = lin(g, 0, -h / 2, 0, h / 2, [[0, shade(col, 0.45)], [0.5, col], [1, shade(col, -0.35)]]); g.fill();
    g.lineWidth = Math.max(1, r * 0.1); g.strokeStyle = P.bad ? '#3a4050' : '#ffffff'; g.stroke();
    if (P.bad) { g.fillStyle = 'rgba(30,30,40,0.25)'; rr(g, -r, -h / 2, 2 * r, h, h / 2); g.fill(); }
    g.save(); g.translate(0, 0); g.scale(0.62, 0.62); paintPowerIcon(g, key, h * 0.8); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.55)'; rr(g, -r * 0.7, -h * 0.4, r * 1.4, h * 0.18, h * 0.09); g.fill();
    g.restore();
  }

  // tampon du passeport d'un pays (rond, encre de la couleur du pays), rayon r
  function paintStampInk(g, wi, r, ink) {
    const W = CARREAUX_WORLDS[((wi % NW) + NW) % NW];
    const col = ink || shade(W.colors.accent, -0.25);
    g.save();
    g.globalAlpha *= 0.92;
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = r * 0.07; circ(g, 0, 0, r * 0.96); g.stroke();
    g.lineWidth = r * 0.03; circ(g, 0, 0, r * 0.84); g.stroke(); circ(g, 0, 0, r * 0.56); g.stroke();
    // nom du pays en arc
    const name = W.short.toUpperCase();
    g.font = '700 ' + Math.round(r * 0.2) + 'px ' + FB0; g.textAlign = 'center'; g.textBaseline = 'middle';
    const total = name.length * r * 0.16, a0 = -Math.PI / 2 - (total / (r * 0.7)) / 2;
    for (let i = 0; i < name.length; i++) {
      const a = a0 + (i + 0.5) * (r * 0.16) / (r * 0.7);
      g.save(); g.translate(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.rotate(a + Math.PI / 2); g.fillText(name[i], 0, 0); g.restore();
    }
    g.font = '700 ' + Math.round(r * 0.14) + 'px ' + FB0;
    g.fillText('★ ' + W.place.toUpperCase() + ' ★', 0, r * 0.7);
    // le dessin du pays, à l'encre
    g.save(); g.scale(r * 0.0105, r * 0.0105);
    g.lineWidth = 5;
    switch (W.id) {
      case 'portugal': {
        // le tramway 28
        g.lineWidth = 5; rr(g, -32, -14, 64, 30, 7); g.stroke();
        for (let i = 0; i < 4; i++) g.fillRect(-25 + i * 13.5, -8, 9, 10);
        g.fillRect(-32, 9, 64, 4);
        circ(g, -18, 22, 5); g.fill(); circ(g, 18, 22, 5); g.fill();
        g.lineWidth = 3.5; g.beginPath(); g.moveTo(-6, -14); g.lineTo(14, -34); g.moveTo(8, -34); g.lineTo(22, -34); g.stroke();
        break;
      }
      case 'maroc': star(g, 0, 0, 8, 32, 23, Math.PI / 8); g.stroke(); star(g, 0, 0, 8, 14, 10, 0); g.fill(); break;
      case 'rome': for (const x of [-24, -8, 8, 24]) g.fillRect(x - 4, -18, 8, 40); g.fillRect(-34, -28, 68, 10); g.beginPath(); g.moveTo(-34, -28); g.lineTo(0, -44); g.lineTo(34, -28); g.closePath(); g.fill(); break;
      case 'japon': g.beginPath(); g.moveTo(-40, 26); g.lineTo(-8, -24); g.lineTo(8, -24); g.lineTo(40, 26); g.closePath(); g.fill(); circ(g, 26, -28, 9); g.fill(); break;
      case 'mexique': star(g, 0, 0, 5, 34, 14, 0); g.fill(); break;
      default: poly(g, [0, -36, 24, -8, 0, 34, -24, -8]); g.stroke(); g.beginPath(); g.moveTo(-24, -8); g.lineTo(24, -8); g.moveTo(0, -36); g.lineTo(-8, -8); g.lineTo(0, 34); g.lineTo(8, -8); g.lineTo(0, -36); g.stroke();
    }
    g.restore();
    g.restore();
  }
  // tampon dans son propre calque (le grain de l'encre ne troue que le tampon), mis en cache
  const stampCache = new Map();
  function stampSprite(wi, rpx) {
    const key = wi + '|' + Math.round(rpx);
    let c = stampCache.get(key);
    if (c) return c;
    c = mkCanvas(rpx * 2 + 4, rpx * 2 + 4);
    const g = c.getContext('2d');
    g.translate(rpx + 2, rpx + 2);
    paintStampInk(g, wi, rpx);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 46; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.3 + hash(i * 3.3 + wi) * 0.5) + ')'; circ(g, (hash(i * 1.7 + wi) - 0.5) * rpx * 2, (hash(i * 2.9 + wi) - 0.5) * rpx * 2, rpx * (0.01 + hash(i * 5.1) * 0.035)); g.fill(); }
    if (stampCache.size > 40) stampCache.clear();
    stampCache.set(key, c);
    return c;
  }
  // dessine le tampon centré en (0, 0), rayon r (unités du contexte) ; res = pixels par unité
  function paintStamp(g, wi, r, res) {
    const k = res || 2, sp = stampSprite(wi, r * k);
    g.drawImage(sp, -sp.width / (2 * k), -sp.height / (2 * k), sp.width / k, sp.height / k);
  }

  // ---------- le globe : continents simplifiés [lon, lat] ----------
  const LANDS = [
    // Amérique du Nord
    [-168, 66, -162, 70, -150, 71, -140, 70, -128, 70, -115, 68, -100, 68, -95, 72, -85, 70, -80, 64, -75, 62, -65, 60, -60, 55, -56, 52, -60, 47, -66, 45, -70, 42, -74, 40, -76, 35, -81, 31, -80, 26, -82, 25, -84, 30, -90, 30, -94, 29, -97, 26, -97, 21, -95, 18, -91, 17, -88, 15, -84, 11, -80, 8, -78, 8, -80, 9, -83, 9, -86, 12, -88, 13, -92, 14, -96, 16, -100, 17, -105, 20, -106, 23, -110, 24, -112, 29, -115, 31, -117, 33, -120, 34, -123, 38, -124, 42, -124, 47, -127, 50, -132, 55, -138, 59, -146, 61, -152, 59, -158, 57, -164, 55, -160, 59, -165, 62],
    // Amérique du Sud
    [-80, 9, -77, 8, -72, 12, -67, 11, -62, 11, -58, 7, -52, 5, -50, 1, -48, -1, -44, -2, -38, -4, -35, -7, -35, -10, -39, -15, -39, -19, -41, -22, -45, -23, -48, -26, -49, -29, -53, -33, -57, -36, -58, -39, -62, -39, -65, -41, -64, -44, -67, -46, -66, -48, -68, -51, -69, -53, -72, -54, -75, -51, -74, -46, -73, -42, -73, -37, -71, -30, -70, -24, -70, -18, -75, -15, -77, -12, -79, -8, -81, -5, -80, -2, -80, 1, -78, 3, -77, 7],
    // Europe et Asie
    [-9, 37, -6, 36, -2, 37, 0, 39, 3, 42, 3, 43, 7, 43.5, 9, 44.2, 10, 43.5, 12, 42, 14, 41, 15.6, 40, 16, 38.5, 15.7, 38, 16.5, 39, 17, 40.5, 18.5, 40, 16, 41.5, 13.5, 43.5, 12.3, 45.3, 13.8, 45.6, 15, 45, 19, 42, 19.5, 40, 21, 38, 22.5, 36.5, 23, 38, 24, 40.5, 26, 41, 29, 41, 28, 40, 26, 40, 27, 37, 30, 36.5, 36, 36.5, 35.5, 34, 34.5, 31.5, 34, 29, 35, 28, 37, 25, 39, 21, 42, 16, 43, 13, 45, 13, 49, 14, 52, 16, 55, 17, 57, 19, 59, 22, 57, 24, 56, 26, 51, 24, 50, 26, 48, 29, 49, 30, 51, 28, 54, 26, 57, 25.5, 61, 25, 66, 25, 67, 24, 70, 21, 73, 17, 75, 12, 77, 8, 78, 8.5, 80, 10, 80, 15, 82, 17, 87, 21, 90, 22, 92, 21, 94, 18, 95, 16, 98, 16, 98, 12, 99, 8, 100, 5, 103, 1.5, 104, 1.3, 103, 4, 103, 6, 101, 7, 100, 10, 102, 12, 105, 9, 107, 11, 109, 12, 109, 15, 106, 18, 106, 20, 108, 21, 110, 21, 113, 22, 116, 23, 119, 26, 121, 28, 122, 31, 121, 32, 119, 35, 121, 37, 122, 37.5, 120, 38, 118, 38, 119, 39.5, 121, 41, 124, 40, 126, 37, 126, 35, 129, 35, 129, 37, 128, 39, 130, 42, 133, 43, 136, 45, 140, 48, 141, 52, 138, 54, 141, 58, 150, 59, 155, 59, 156, 61, 163, 61, 160, 58, 163, 57, 162, 54, 156, 51, 159, 53, 163, 56, 165, 60, 170, 60, 177, 62, 180, 65, 178, 69, 170, 70, 160, 70, 150, 72, 140, 73, 130, 71, 120, 73, 110, 74, 105, 77, 95, 76, 90, 75, 80, 73, 70, 73, 66, 69, 60, 69, 56, 68, 50, 68, 44, 68, 40, 66, 36, 65, 33, 66, 38, 67, 41, 67.5, 35, 69, 28, 71, 24, 71, 18, 70, 14, 68, 12, 65, 8, 63, 5, 61, 5, 59, 8, 58, 10.5, 59.5, 11, 58, 12.5, 56, 12.5, 55.5, 10, 57.5, 8, 57, 8.5, 55, 8, 54, 5, 53.5, 4, 52, 2, 51, 1.5, 50, -1.5, 49.5, -4.5, 48.5, -1.5, 46.5, -1.5, 43.5, -9, 43.5, -9, 39],
    // Grande-Bretagne, Irlande, Islande
    [-5.5, 50, 1.5, 51, 1.7, 52.5, 0, 53.5, -1.5, 55, -2, 57, -3, 58.6, -5, 58.6, -6, 57, -5.5, 55.5, -3, 54.5, -4.5, 53.2, -5, 51.7],
    [-6, 52, -6, 54, -7.5, 55.3, -10, 54, -10, 52, -8, 51.5],
    [-24, 65.5, -22, 66.4, -18, 66.2, -15, 66.5, -13.5, 65, -15, 64.3, -18, 63.4, -21, 63.8, -22.5, 64, -24, 64.8],
    // Afrique, Madagascar
    [-6, 36, -1, 35.5, 3, 36.8, 10, 37, 11, 35, 10, 33.5, 13, 32.8, 15, 32, 20, 31, 20, 32.5, 25, 31.6, 29, 31, 32, 31.3, 34, 31, 32.5, 29.5, 34, 27.5, 35.5, 24, 37, 21.5, 37.5, 18.5, 39, 16, 43, 12.5, 44, 11, 51, 12, 51, 10.5, 50, 8, 47, 4, 43, -1, 40, -3.5, 39, -6, 40, -10.5, 40.5, -15, 37, -18, 35, -22, 35.5, -24, 32.5, -26, 32.8, -29, 30, -31.5, 27, -33.7, 22, -34.5, 18.5, -34.2, 18, -31, 15, -27, 14.5, -23, 12, -18, 12, -14, 13.5, -11, 13, -6, 12, -5, 9, -1, 9.5, 3.5, 8.5, 4.5, 5.5, 4.3, 2, 6.3, -2, 4.8, -7.5, 4.4, -12, 7, -13.5, 9.5, -16.5, 12, -17, 14.7, -16, 18, -16.5, 21, -15, 24, -13, 27.5, -10, 29, -9.8, 30.5, -9.5, 32.5, -6.5, 34],
    [49.5, -12, 50.5, -15.5, 49.5, -17.5, 48, -21, 47, -25, 45, -25.5, 43.5, -22, 44, -17, 46, -15.5, 48, -13.5],
    // Australie, Nouvelle-Zélande, îles d'Asie
    [113, -22, 114, -26, 115, -34, 118, -35, 123, -34, 126, -32, 131, -31.5, 135, -34.5, 138, -35, 139.5, -37.5, 143, -38.7, 146, -39, 150, -37.5, 151.5, -33, 153, -30, 153.5, -25, 150.5, -22.5, 149, -20.5, 146, -19, 145.4, -15, 143.5, -14, 142.5, -10.8, 141.5, -13, 141.5, -16.5, 140, -17.7, 137, -16, 136, -12, 132, -11.3, 130, -13, 129, -15, 126, -14, 123, -17, 122, -18.5, 119, -20, 116, -21],
    [172.5, -34.5, 174.5, -37, 178, -37.7, 176.5, -40, 175, -41.5, 174, -41, 172.8, -40.5, 171.5, -42, 170, -43.5, 168, -46.3, 166.5, -46, 168, -44, 170.5, -42.5, 172, -41, 173, -39, 174.5, -38.5],
    [130, 31.5, 131.5, 31.5, 132, 33.5, 135, 33.5, 137, 34.5, 139, 35, 140.5, 35.5, 141, 37.5, 141.5, 40, 141.5, 41.5, 140, 41, 139.8, 39.5, 139.5, 38, 138.5, 37.5, 137, 37, 136, 36, 133, 35.5, 131, 34.5, 130, 33.5],
    [140, 42, 141.5, 42.5, 143, 42, 145.5, 43.3, 144, 44, 142, 45.5, 141, 44],
    [109, 1, 110, -3, 114, -3.5, 116, -1, 118.5, 1, 117, 4.5, 116, 7, 113, 3.5],
    [95, 5.5, 98, 3.5, 101, 1, 104, -2, 106, -5.8, 104.5, -5.5, 101, -2.5, 99, 0, 97, 2.5],
    [131, -1, 135, -3, 138, -1.5, 141, -2.6, 145, -4, 147, -6, 150, -10.5, 147, -8, 143, -9, 141, -9, 138, -8, 137, -5, 133, -4],
    [-85, 21.8, -82, 23, -77, 22, -74, 20, -77.5, 19.8, -81, 21.8]
  ];
  const GREENLAND = [-73, 78, -60, 82, -40, 83.5, -22, 82.5, -18, 78, -20, 75, -22, 72, -24, 70, -30, 68, -35, 66, -40, 65, -43, 60, -46, 61, -49, 63, -52, 65, -53, 67.5, -54, 70, -56, 72, -58, 75, -66, 76];
  // projection orthographique : centre (lon0, lat0) en degrés → { x, y, vis } (unités du rayon 1)
  function orth(lon, lat, lon0, lat0) {
    const l = (lon - lon0) * DEG, p = lat * DEG, p0 = lat0 * DEG;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    const x = Math.cos(p) * Math.sin(l), y = -(Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
    if (cosc >= 0) return { x, y, vis: true, c: cosc };
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d, vis: false, c: cosc };
  }
  function landPath(g, pts, lon0, lat0, R) {
    g.beginPath();
    let any = false;
    for (let i = 0; i < pts.length; i += 2) {
      const q = orth(pts[i], pts[i + 1], lon0, lat0);
      if (q.vis) any = true;
      if (i === 0) g.moveTo(q.x * R, q.y * R); else g.lineTo(q.x * R, q.y * R);
    }
    g.closePath();
    return any;
  }
  // le globe entier, centré en (0, 0), rayon R, vue centrée sur (lon0, lat0) ; t = temps (nuages)
  function paintGlobe(g, R, lon0, lat0, t) {
    g.save();
    // halo d'atmosphère
    g.fillStyle = rad(g, 0, 0, R * 0.9, 0, 0, R * 1.18, [[0, 'rgba(120,200,255,0.55)'], [1, 'rgba(120,200,255,0)']]); circ(g, 0, 0, R * 1.18); g.fill();
    // océan
    g.fillStyle = rad(g, -R * 0.35, -R * 0.4, R * 0.1, 0, 0, R, [[0, '#5fc7f2'], [0.6, '#2a86d0'], [1, '#14468e']]);
    circ(g, 0, 0, R); g.fill();
    g.save(); circ(g, 0, 0, R); g.clip();
    // continents
    for (const L of LANDS) {
      if (!landPath(g, L, lon0, lat0, R)) continue;
      g.fillStyle = '#6cc457'; g.fill();
      g.lineWidth = Math.max(1, R * 0.012); g.strokeStyle = '#e9dca0'; g.stroke();
    }
    if (landPath(g, GREENLAND, lon0, lat0, R)) { g.fillStyle = '#f2f8ff'; g.fill(); g.strokeStyle = '#c9e2f5'; g.stroke(); }
    // déserts et montagnes (taches)
    for (const [lon, lat, rr2, col] of [[10, 24, 9, '#e8c27a'], [25, 22, 8, '#e8c27a'], [45, 23, 7, '#e3b86a'], [-110, 35, 5, '#d9b070'], [134, -25, 9, '#e0a860'], [90, 32, 7, '#b9a47a'], [-68, -20, 4, '#b9a47a']]) {
      const q = orth(lon, lat, lon0, lat0); if (!q.vis) continue;
      g.fillStyle = rgba(col, 0.75 * clamp(q.c * 2, 0, 1)); ell(g, q.x * R, q.y * R, rr2 * R / 90 * 1.4, rr2 * R / 90, 0); g.fill();
    }
    // calotte polaire
    { const q = orth(0, 90, lon0, lat0); if (q.vis) { g.fillStyle = 'rgba(245,250,255,0.9)'; ell(g, q.x * R, q.y * R, R * 0.28 * Math.max(0.2, q.c), R * 0.28 * Math.max(0.3, Math.abs(q.c)), 0); g.fill(); } }
    // nuages qui tournent
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 14; i++) {
      const lon = hash(i * 3.1) * 360 - 180 + t * 4, lat = hash(i * 7.7) * 120 - 55;
      const q = orth(lon, lat, lon0, lat0); if (!q.vis) continue;
      const s = R * (0.05 + hash(i) * 0.06) * (0.4 + q.c * 0.6);
      ell(g, q.x * R, q.y * R, s * 1.8, s * 0.7, 0); g.fill();
    }
    g.restore();
    // ombre (lumière en haut à gauche) et reflet
    g.fillStyle = rad(g, -R * 0.4, -R * 0.45, R * 0.2, 0, 0, R, [[0, 'rgba(255,255,255,0.18)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,10,40,0.45)']]);
    circ(g, 0, 0, R); g.fill();
    g.lineWidth = Math.max(1.5, R * 0.02); g.strokeStyle = 'rgba(190,235,255,0.9)'; circ(g, 0, 0, R); g.stroke();
    g.restore();
  }
  // point sur la grande route entre deux villes (interpolation sphérique), k = 0..1 → { lon, lat }
  function greatCircle(a, b, k) {
    const p1 = a.lat * DEG, l1 = a.lon * DEG, p2 = b.lat * DEG, l2 = b.lon * DEG;
    const A = [Math.cos(p1) * Math.cos(l1), Math.cos(p1) * Math.sin(l1), Math.sin(p1)];
    const B = [Math.cos(p2) * Math.cos(l2), Math.cos(p2) * Math.sin(l2), Math.sin(p2)];
    const d = Math.acos(clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1));
    if (d < 1e-6) return { lon: a.lon, lat: a.lat };
    const s1 = Math.sin((1 - k) * d) / Math.sin(d), s2 = Math.sin(k * d) / Math.sin(d);
    const x = s1 * A[0] + s2 * B[0], y = s1 * A[1] + s2 * B[1], z = s1 * A[2] + s2 * B[2];
    return { lon: Math.atan2(y, x) / DEG, lat: Math.atan2(z, Math.hypot(x, y)) / DEG };
  }
  // l'avion du voyageur (vue de côté, nez vers +x), avec la tête du pilote ; s = échelle
  function paintPlane(g, s, t, pilot) {
    g.save(); g.scale(s, s);
    // traînée
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.setLineDash([6, 6]); g.lineDashOffset = -t * 40;
    g.beginPath(); g.moveTo(-36, 2); g.lineTo(-90, 6); g.stroke(); g.setLineDash([]);
    // aile arrière
    g.fillStyle = '#d93a3a'; poly(g, [-30, -2, -40, -18, -32, -18, -20, -2]); g.fill(); outline(g, 1.6);
    // fuselage
    g.beginPath(); g.moveTo(-34, 0); g.quadraticCurveTo(-30, -10, 0, -11); g.quadraticCurveTo(26, -11, 32, 0); g.quadraticCurveTo(26, 10, 0, 10); g.quadraticCurveTo(-28, 9, -34, 0); g.closePath();
    g.fillStyle = lin(g, 0, -11, 0, 10, [[0, '#ffffff'], [0.55, '#e9eef6'], [1, '#b8c4d6']]); g.fill(); outline(g, 2);
    g.fillStyle = '#d93a3a'; g.fillRect(-26, -2, 50, 4);
    // cockpit + pilote
    if (pilot && imgOk(pilot)) { g.save(); drawHeadImg(g, pilot, 2, -16, 22); g.restore(); }
    else { g.fillStyle = '#ffd9b8'; circ(g, 2, -15, 7); g.fill(); outline(g, 1.4); g.fillStyle = '#8a4a20'; g.beginPath(); g.arc(2, -16, 7.4, Math.PI, 0); g.fill(); g.fillStyle = '#1a1424'; circ(g, 4.5, -15, 1.3); g.fill(); }
    g.fillStyle = 'rgba(140,210,255,0.55)'; g.beginPath(); g.moveTo(-8, -9); g.quadraticCurveTo(2, -26, 14, -9); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.4; g.stroke();
    // aile
    g.fillStyle = '#ff5050'; poly(g, [-8, 2, 10, 2, 0, 16, -16, 16]); g.fill(); outline(g, 1.6);
    // hélice qui tourne
    g.fillStyle = '#5a4a3a'; circ(g, 33, 0, 3.2); g.fill();
    const pr = Math.abs(Math.sin(t * 40)) * 12 + 2;
    g.fillStyle = 'rgba(80,70,60,0.6)'; ell(g, 34, 0, 2, pr, 0); g.fill();
    g.restore();
  }

  // ===========================================================================
  // NIVEAUX DU TOUR I (3 par pays ; le 3e = boss). Plans de 11 colonnes (carreaux de 32) ou 22 (tesselles de 16).
  //  '.' vide · '0'..'5' carreau (motif 0..5) · 'a'..'f' solide (2 coups) · 'A'..'F' épais (3 coups) · '#' incassable
  //  '*' pétard (casse ses voisins) · '$' cadeau (bonus garanti) · 'K' fusée (Mexique) · 'Z' prisme (Cristal)
  //  Mosaïques (mosaic: true) : lettres des tesselles (TESS), MAJUSCULE = tesselle de marbre (2 coups).
  //  Fresque (fresco: true) : 'f' = morceau du tableau.
  // Accessoires : trams (Portugal), rosaces (Maroc), vents (vapeur, Rome), shoji (Japon), descent (le carrelage descend).
  // ===========================================================================
  // grille de lettres dessinée par une fonction (c, r) → lettre (pour les images en mosaïque)
  function gridFrom(cols, rows, fn) {
    const out = [];
    for (let r = 0; r < rows; r++) { let s = ''; for (let c = 0; c < cols; c++) s += fn(c, r) || '.'; out.push(s); }
    return out;
  }
  // Rome 1 : les thermes — panneau à méandre, deux colonnes de marbre
  const MAP_THERMES = gridFrom(22, 7, (c, r) => {
    if (r === 0) return c % 2 ? 'k' : 'y';
    if (r === 1) return '.';
    if ((c === 0 || c === 21) && r >= 5) return '#';
    if (r === 6) return (c % 4 < 2) ? 't' : 'o';
    const wv = Math.round(3.4 + Math.sin(c * 0.62) * 1.1);
    if (r === wv) return 'b';
    if (r === wv + 1) return 'c';
    if (r > wv + 1) return (c + r) % 5 === 0 ? 'e' : 'l';
    return (c * 3 + r) % 7 === 0 ? 'y' : 'w';
  });
  // Rome 2 : le dauphin — un dauphin qui saute au-dessus des vagues, le soleil
  const MAP_DAUPHIN = [
    '...................yy.',
    '..........dd......yyyy',
    '.........ddd.......yy.',
    'd.....ddddddddddd.....',
    'dd..dddddddddddkdd....',
    '.dddddeeeeeeeeeeeddd..',
    'dd...eeeeeeeeeee......',
    'd..cc...cc...cc...cc..',
    'bcbbcbbcbbcbbcbbcbbcbb'
  ];
  // Japon 2 : petits carreaux du bain autour des portes
  // Cristal 2 : le flocon de neige (6 branches)
  const MAP_FLOCON = gridFrom(11, 9, (c, r) => {
    const x = c - 5, y = r - 4, ax = Math.abs(x), ay = Math.abs(y);
    if (!x && !y) return 'Z';
    const arm = (x === 0 && ay <= 4) || (y === 0 && ax <= 5) || (ax === ay && ax <= 3);
    if (arm) return ax + ay >= 5 ? 'a' : ((ax + ay) % 2 ? '3' : '0');
    // ramures : petits carreaux de part et d'autre des branches
    if ((ax === 1 && ay === 3) || (ay === 1 && ax === 3) || (ax === 1 && ay === 2 && false)) return '1';
    if ((ax === 2 && ay === 4) || (ax === 4 && ay === 2)) return ay === 2 && y < 0 ? 'Z' : '2';
    return '.';
  });
  // Mexique 2 : le soleil (cœur doré, rayons orange, ciel rose et turquoise)
  const MAP_SOLEIL = gridFrom(11, 8, (c, r) => {
    const x = c - 5, y = (r - 3.5) * 1.15, d = Math.hypot(x, y), a = Math.atan2(y, x);
    if (d < 1.3) return 'b';
    if (d < 2.4) return '1';
    if (d < 4.2 && Math.abs(Math.sin(a * 4)) < 0.38) return (c + r) % 5 === 0 ? 'K' : '4';
    return d > 4.6 && d < 5.2 && (c + r) % 4 === 0 ? 'K' : '.';
  });

  const LEVELS = [
    // ---------------- 1. Le Portugal ----------------
    { name: 'Les azulejos', tip: 'Casse tous les carreaux !', map: [
      '.111111111.',
      '...........',
      '..0$424$0..',
      '..0000000..'
    ] },
    { name: 'Le tramway 28', tip: 'Le tramway roule : vise bien !', map: [
      '.a.a.a.a.a.',
      '.000000000.',
      '...........',
      '.2020$0202.',
      '...........'
    ], trams: [{ row: 2, cars: 3, speed: 42, dir: 1, count: 1 }, { row: 4, cars: 3, speed: 50, dir: -1, count: 1 }] },
    { name: 'Le Coq de Barcelos', boss: 'coq', map: [
      '...........', '...........', '...........', '...........', '...........',
      '0.0.0$0.0.0',
      '.1.1.1.1.1.'
    ] },
    // ---------------- 2. Le Maroc ----------------
    { name: 'La médina', tip: 'Le cuivre est incassable !', map: [
      '...44444...',
      '..4222224..',
      '.42.....24.',
      '.42.....24.',
      '.42..$..24.',
      '.##.....##.'
    ] },
    { name: 'Les rosaces', tip: 'Les rosaces tournent !', map: [
      '3.3.3.3.3.3',
      '...........',
      '...........',
      '...........',
      '...........',
      '0*0.0$0.0*0'
    ], rosettes: [{ cx: 3, cy: 3, r: 1.22, n: 8, speed: 0.75, v: 0 }, { cx: 8, cy: 3, r: 1.22, n: 8, speed: -0.75, v: 1 }] },
    { name: 'La Grande Théière', boss: 'theiere', map: [
      '...........', '...........', '...........', '...........', '...........',
      '#1.1$1.1.1#',
      '.0.a.0.a.0.'
    ] },
    // ---------------- 3. L'Italie (mosaïques) ----------------
    { name: 'Les thermes', tip: 'Les tesselles s’émiettent par paquets !', mosaic: true, picture: true, map: MAP_THERMES },
    { name: 'Le dauphin', tip: 'La vapeur souffle la bille vers le haut !', mosaic: true, picture: true, map: MAP_DAUPHIN,
      vents: [{ x: 86, period: 5.2, phase: 0 }, { x: 298, period: 5.2, phase: 2.6 }] },
    { name: 'Neptune', boss: 'neptune', mosaic: true, map: (() => { const m = []; for (let r = 0; r < 14; r++) m.push('.'.repeat(22)); m.push('wwyywwyywwyywwyywwyyww'); m.push('.bb..bb..bb..bb..bb...'.slice(0, 22)); return m; })(),
      vents: [{ x: 60, period: 6.5, phase: 1 }, { x: 324, period: 6.5, phase: 4.2 }] },
    // ---------------- 4. Le Japon ----------------
    { name: 'La fresque du mont Fuji', tip: 'Chaque carreau est un morceau du tableau !', fresco: true, map: [
      '.fffffffff.',
      '.fffffffff.',
      '.fffffffff.',
      '.fffffffff.'
    ] },
    { name: 'Les portes coulissantes', tip: 'Les portes s’ouvrent et se ferment !', map: [
      '3.3.3.3.3.3',
      '.a.a.a.a.a.',
      '...........',
      '.1212$2121.',
      '...........',
      '0.5.0.5.0.5'
    ], shoji: [{ row: 2, w: 3, speed: 0.8, phase: 0 }] },
    { name: 'Le Chat porte-bonheur', boss: 'chat', map: [
      '...........', '...........', '...........', '...........', '...........',
      '3.0.3$3.0.3',
      'a.a.a.a.a.a'
    ] },
    // ---------------- 5. Le Mexique ----------------
    { name: 'La fiesta', tip: 'Les fusées font des feux d’artifice !', map: [
      '4.5.4.5.4.5',
      '...........',
      '0K0.333.0K0',
      '01111$11110',
      '...........',
      '3K3.3.3.3K3'
    ], descent: 0.9 },
    { name: 'Le soleil', tip: 'Le carrelage descend : vite !', picture: true, map: MAP_SOLEIL, descent: 1.4 },
    { name: 'La Piñata géante', boss: 'pinata', map: [
      '...........', '...........', '...........', '...........', '...........',
      '4.3.4$4.3.4',
      '.0.0.0.0.0.'
    ] },
    // ---------------- 6. Le Palais de cristal ----------------
    { name: 'Les cristaux', tip: 'Les prismes dédoublent la bille !', map: [
      '.....3.....',
      '....303....',
      '...30Z03...',
      '..301$103..',
      '.3012Z2103.',
      '..301#103..',
      '...30Z03...',
      '....303....'
    ], descent: 1.1 },
    { name: 'Le flocon', tip: 'Les prismes dédoublent la bille !', picture: true, map: MAP_FLOCON, descent: 1.5 },
    { name: 'Le Grand Lustre', boss: 'lustre', map: [
      '...........', '...........', '...........', '...........', '...........', '...........',
      '1.2.Z$Z.2.1',
      '.a.a...a.a.'
    ] }
  ];

  // le plan d'un niveau (tous tours confondus) : Tour II et suivants = même pays, plus coriaces (variante déterministe)
  function levelDef(level) {
    const i = Math.max(0, level - 1), base = LEVELS[i % TOUR_LEN], tour = Math.floor(i / TOUR_LEN);
    if (!tour) return base;
    const q = mulberry32(level * 7919 + 12345);
    const upg = Math.min(0.55, 0.22 + tour * 0.12);
    const map = base.map.map((row, r) => row.split('').map((ch, c) => {
      if (base.mosaic) {
        if (ch >= 'a' && ch <= 'z' && ch !== 'f' && q() < upg * 0.6) return ch.toUpperCase();
        return ch;
      }
      if (ch >= '0' && ch <= '5') { const u = q(); if (u < upg) return 'abcdef'[+ch]; if (u < upg + 0.05 && r > 0) return '*'; }
      if (ch >= 'a' && ch <= 'f' && q() < upg * 0.5) return ch.toUpperCase();
      return ch;
    }).join(''));
    // miroir un tour sur deux (le plan change de sens)
    const mir = tour % 2 === 1 && !base.fresco;
    const mapM = mir ? map.map((row) => row.split('').reverse().join('')) : map;
    const out = Object.assign({}, base, { map: mapM, tour });
    if (!base.boss) out.descent = Math.max(base.descent || 0, 0.8 + tour * 0.5);
    if (base.trams) out.trams = base.trams.map((t) => Object.assign({}, t, { speed: t.speed * (1 + tour * 0.3), dir: mir ? -t.dir : t.dir }));
    if (base.rosettes) out.rosettes = base.rosettes.map((ro) => Object.assign({}, ro, { speed: ro.speed * (1 + tour * 0.35), cx: mir ? 10 - ro.cx : ro.cx }));
    if (base.shoji) out.shoji = base.shoji.map((s) => Object.assign({}, s, { speed: s.speed * (1 + tour * 0.3) }));
    if (base.vents) out.vents = base.vents.map((v) => Object.assign({}, v, { period: v.period * Math.max(0.6, 1 - tour * 0.15), x: mir ? W - v.x : v.x }));
    return out;
  }

  // ===========================================================================
  // LE JEU
  // ===========================================================================
  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || FD0;
    const FB = (api.fonts && api.fonts.body) || FB0;
    // ---- niveau de départ et graine (CONTRACT.md Ajout 6 : outils de test, graine de la coop)
    const num = (v) => (v == null || v === '' ? NaN : Math.floor(Number(v)));
    const START = num(api.startLevel) >= 1 ? Math.min(999, num(api.startLevel)) : 1;
    const SEED = Number.isFinite(num(api.seed)) ? (num(api.seed) >>> 0) : null;
    // le hasard du CONTENU (bonus, boss, têtes, lancers) vient de flux re-grainés à chaque niveau :
    // avec api.seed, le niveau N est le même pour tous. Effets visuels : Math.random.
    const baseSeed = SEED !== null ? SEED : ((Math.random() * 4294967296) >>> 0);
    const RNG = {};
    function reseed(n) {
      const s = (k) => mulberry32((baseSeed ^ Math.imul(n, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0);
      RNG.lvl = s(1); RNG.pow = s(2); RNG.boss = s(3); RNG.head = s(4); RNG.serve = s(5); RNG.drop = s(6);
    }
    reseed(START);
    const cr = (k) => RNG[k]();
    const crnd = (k, a, b) => a + RNG[k]() * (b - a);
    const doc = document;
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ---------------------------------------------------------------- sons (synthèse de la bibliothèque)
    let sndBudget = 10, rtime = 0;
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.12 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(chn, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[chn] == null ? -9 : sndLast[chn];
      if (rtime - l < gap) return false;
      sndLast[chn] = rtime; sndBudget--;
      return true;
    }
    const sfxQ = [];
    function later(d, fn) { if (sfxQ.length < 90) sfxQ.push({ t: d, fn }); }
    function arp(notes, step, ty, v, d) { notes.forEach((f, i) => later(i * step, () => tone(f, d || step * 1.5, ty || 'square', v || 0.04))); }
    function scaleOf() { return SCALES[S.wid] || SCALES.portugal; }
    const SFX = {
      note(k, big) {                         // carreau cassé : la gamme du pays monte avec le combo
        if (!canPlay('note', 0.028)) return;
        const sc = scaleOf(), n = sc.notes, i = Math.min(n.length - 1, k % n.length), oct = Math.floor(k / n.length) % 2 ? 2 : 1;
        const f = n[i] * (oct === 2 && n[i] < 1600 ? 2 : 1);
        tone(f, big ? 0.22 : 0.14, sc.type, sc.vol * (big ? 1.3 : 1), f * sc.bend);
        noise(0.05, big ? 0.07 : 0.045, 4200);
      },
      crack() { if (canPlay('crack', 0.04)) { tone(240, 0.06, 'square', 0.03, 160); noise(0.05, 0.07, 2600); } },
      tink() { if (canPlay('tink', 0.05)) { tone(1500, 0.06, 'sine', 0.035, 2100); tone(2300, 0.04, 'sine', 0.018); } },
      wall() { if (canPlay('wall', 0.05)) tone(190, 0.03, 'triangle', 0.022); },
      paddle(o) { if (canPlay('pad', 0.04)) { tone(280 + Math.abs(o) * 110, 0.07, 'triangle', 0.05, 400 + Math.abs(o) * 150); noise(0.03, 0.03, 1800); } },
      launch() { tone(440, 0.08, 'triangle', 0.05, 760); },
      cap() { if (canPlay('cap', 0.15)) tone(980, 0.1, 'sine', 0.025, 1300); },
      good() { arp([660, 880, 1100, 1320, 1760], 0.05, 'square', 0.035, 0.08); },
      bad() { tone(420, 0.25, 'sawtooth', 0.035, 160); },
      laser() { if (canPlay('laser', 0.08)) tone(1800, 0.06, 'square', 0.014, 900); },
      boom() { if (canPlay('boom', 0.06)) { noise(0.32, 0.17, 1300); tone(110 + Math.random() * 30, 0.3, 'sawtooth', 0.05, 40); } },
      rocket() { if (canPlay('rocket', 0.1)) { noise(0.5, 0.06, 3000); tone(300, 0.45, 'sine', 0.025, 1400); } },
      burst() { if (canPlay('burst', 0.06)) { noise(0.4, 0.12, 5000); later(0.05, () => tone(1600 + Math.random() * 600, 0.1, 'sine', 0.025)); } },
      prism() { if (canPlay('prism', 0.08)) arp([1568, 2093, 2637], 0.04, 'sine', 0.035, 0.18); },
      combo(m) { arp([700 + m * 90, 900 + m * 110, 1200 + m * 140], 0.05, 'square', 0.03, 0.07); },
      milestone() { noise(0.4, 0.07, 6000); arp([523, 659, 784, 1047, 1319, 1568], 0.05, 'square', 0.035, 0.09); },
      portrait() { arp([784, 988, 1175, 1568], 0.07, 'triangle', 0.05); },
      sad() { arp([520, 440, 370, 330], 0.11, 'triangle', 0.045); },
      ready() { arp([523, 659, 784], 0.1, 'square', 0.03); },
      go() { tone(880, 0.14, 'square', 0.04); later(0.05, () => tone(1320, 0.2, 'triangle', 0.04)); },
      clear() { const sc = scaleOf(), J = JINGLES[S.wid] || JINGLES.portugal; noise(0.5, 0.05, 5200); J.forEach((d, i) => later(i * 0.085, () => tone(sc.notes[d % sc.notes.length], 0.16, sc.type, sc.vol * 1.2))); },
      jingle() { const sc = scaleOf(), J = JINGLES[S.wid] || JINGLES.portugal; J.forEach((d, i) => later(0.15 + i * 0.13, () => tone(sc.notes[d % sc.notes.length] / 2, 0.24, sc.type, sc.vol * 1.25))); },
      bossIntro() { tone(70, 1.1, 'sawtooth', 0.05, 50); for (let i = 0; i < 6; i++) later(i * 0.15, () => noise(0.1, 0.11 + i * 0.015, 500)); later(1.0, () => arp([196, 262, 196, 330, 392], 0.12, 'square', 0.04)); },
      bossHit() { if (canPlay('bhit', 0.06)) { tone(300 + Math.random() * 60, 0.06, 'square', 0.03, 170); noise(0.06, 0.07, 3600); } },
      bossBlock() { if (canPlay('bblock', 0.08)) tone(900, 0.05, 'sine', 0.03, 700); },
      warn() { if (canPlay('warn', 0.25)) tone(820, 0.22, 'sine', 0.025, 1250); },
      shot() { if (canPlay('bshot', 0.12)) tone(260, 0.16, 'sine', 0.03, 130); },
      phase() { noise(0.6, 0.12, 900); tone(140, 0.7, 'sawtooth', 0.05, 60); later(0.35, () => arp([330, 392, 494, 659], 0.08, 'square', 0.04)); },
      bossDown() { noise(1.2, 0.2, 900); tone(220, 1.3, 'sawtooth', 0.05, 40); later(0.5, () => arp([392, 523, 659, 784, 1047, 1319], 0.09, 'square', 0.045)); },
      stun() { tone(360, 0.3, 'sine', 0.05, 120); noise(0.12, 0.07, 1500); },
      stamp() { noise(0.25, 0.25, 700); tone(90, 0.3, 'square', 0.07, 40); },
      plane() { tone(150, 1.4, 'sawtooth', 0.012, 190); },
      lose() { noise(0.3, 0.16, 900); tone(620, 1.1, 'sine', 0.06, 90); later(0.7, () => tone(196, 0.5, 'triangle', 0.04, 98)); },
      tick() { tone(1250, 0.03, 'sine', 0.022); },
      clack() { if (canPlay('clack', 0.05)) { tone(900 + Math.random() * 300, 0.03, 'square', 0.012); noise(0.03, 0.03, 3500); } },
      candy() { if (canPlay('candy', 0.05)) tone(1300 + Math.random() * 400, 0.07, 'sine', 0.03, 1800); },
      net() { if (canPlay('net', 0.08)) tone(520, 0.12, 'triangle', 0.04, 880); },
      ambient() {
        const sc = scaleOf(), n = sc.notes;
        switch (S.wid) {
          case 'portugal': if (Math.random() < 0.6) { tone(1900, 0.18, 'sine', 0.012, 1250); later(0.24, () => tone(2000, 0.22, 'sine', 0.01, 1300)); } else { tone(1568, 0.25, 'triangle', 0.014); later(0.3, () => tone(1568, 0.3, 'triangle', 0.012)); } break;
          case 'maroc': [0, 2, 1].forEach((d, i) => later(i * 0.16, () => tone(n[d + 1] / 2, 0.22, 'triangle', 0.014, n[d + 1] / 2 * 0.98))); break;
          case 'rome': tone(1300, 0.08, 'sine', 0.016, 620); later(0.35, () => tone(1100, 0.07, 'sine', 0.012, 560)); break;
          case 'japon': tone(2637, 1.2, 'sine', 0.009); later(0.12, () => tone(3520, 0.9, 'sine', 0.006)); break;
          case 'mexique': noise(0.25, 0.03, 2400); later(0.08, () => tone(1800 + Math.random() * 500, 0.12, 'sine', 0.01)); break;
          default: tone(2349, 1.0, 'sine', 0.008); later(0.18, () => tone(3136, 0.8, 'sine', 0.006));
        }
      }
    };

    // ---------------------------------------------------------------- préférences (tutoriel vu)
    function pref(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function setPref(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* rien */ } }

    // ---------------------------------------------------------------- DOM : toile + bouton pause
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    const pauseBtn = doc.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'position:absolute;top:3px;right:4px;width:44px;height:44px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.32);background:rgba(8,14,24,0.62);padding:0;margin:0;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;box-sizing:border-box;';
    function pauseIcon(play) {
      pauseBtn.textContent = '';
      if (play) {
        const s = doc.createElement('span');
        s.style.cssText = 'display:block;width:0;height:0;border-left:14px solid #fff;border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:4px;pointer-events:none;';
        pauseBtn.appendChild(s);
      } else {
        for (let i = 0; i < 2; i++) { const b = doc.createElement('span'); b.style.cssText = 'display:block;width:5px;height:16px;border-radius:2px;background:#ffffff;pointer-events:none;'; pauseBtn.appendChild(b); }
      }
    }
    pauseIcon(false);
    root.appendChild(pauseBtn);

    // ---------------------------------------------------------------- mise en page : aire de jeu fixe, décor plein écran
    // Le jeu (unités logiques W × H : carreaux, bille, vitesses) ne change jamais ; seule sa place à l'écran change.
    // - Téléphone en hauteur : sous la raquette, une bande du décor (le pavé, la promenade du pays) où le pouce glisse
    //   sans cacher la raquette ni la bille : 13 % de la hauteur au moins (l'aire de jeu rapetisse un peu s'il le faut),
    //   jusqu'à 18 % quand l'écran est assez haut.
    // - Ordinateur et paysage (« wide ») : l'aire de jeu flotte au-dessus de la promenade (petite marge en haut, 10 % de
    //   promenade sous la raquette), entre les deux panneaux, qui s'alignent sur elle.
    let cw = 300, ch = 500, dpr = 1, quality = 1, U = 1, FX = 0, FY = 0, res = 1, wide = false, touchUI = true, lowFx = false;
    let fieldPx = { x: 0, y: 0, w: W, h: H };
    const PB = PY + PH;                   // bas de la raquette (unités)
    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      cw = Math.max(160, Math.round(r.width || root.clientWidth || 300));
      ch = Math.max(200, Math.round(r.height || root.clientHeight || 500));
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      U = Math.min(cw / W, ch * 0.87 / PB);
      FX = (cw - W * U) / 2;
      FY = Math.max(0, ch - PB * U - ch * 0.18);
      wide = FX >= 150 && ch >= 300;
      if (wide) {
        const mt = Math.max(8, Math.round(ch * 0.025));
        U = Math.min(cw / W, (ch - mt - ch * 0.1) / PB);
        FX = (cw - W * U) / 2;
        FY = mt;
      }
      fieldPx = { x: FX, y: FY, w: W * U, h: H * U };
      let fine = false;
      try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
      touchUI = !fine;
      lowFx = quality < 0.8;
      const nr = clamp(U * dpr, 0.4, 4);
      if (Math.abs(nr - res) > 0.01) { res = nr; tileCache.clear(); mural = null; }
      scene = null; nextScene = null;
    }

    // ---------------------------------------------------------------- caches : carreaux, décor, fresque
    const tileCache = new Map();
    let scene = null, nextScene = null, mural = null;
    const PAD = 3;
    function spriteCanvas(wu, hu, fn) {
      const c = mkCanvas((wu + PAD * 2) * res, (hu + PAD * 2) * res);
      const g = c.getContext('2d');
      g.setTransform(res, 0, 0, res, PAD * res, PAD * res);
      // ombre portée douce sous le carreau
      g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 3 * res; g.shadowOffsetX = 0.8 * res; g.shadowOffsetY = 1.6 * res;
      g.fillStyle = 'rgba(0,0,0,0.6)'; rr(g, 0.6, 0.6, wu - 1.2, hu - 1.2, Math.min(wu, hu) * 0.08); g.fill();
      g.restore();
      try { fn(g); } catch (e) { /* rien */ }
      return c;
    }
    function getMural() {
      if (mural) return mural;
      const mw = 9 * 32, mh = 4 * 32, k = Math.max(1, res);
      mural = mkCanvas(mw * k, mh * k);
      const g = mural.getContext('2d'); g.scale(k, k);
      try { paintFujiMural(g, mw, mh); } catch (e) { /* rien */ }
      mural._k = k;
      return mural;
    }
    function tileSprite(t) {
      const key = t.key;
      let c = tileCache.get(key);
      if (c) return c;
      const s = t.w, wid = t.wid;
      c = spriteCanvas(t.w, t.h, (g) => {
        if (t.kind === 'x') paintBomb(g, wid, s);
        else if (t.kind === 'k') paintRocket(g, s);
        else if (t.kind === 'z') paintPrism(g, s);
        else if (t.kind === 'f') { const M = getMural(), k = M._k; paintFresco(g, s, M, t.fx * 32 * k, t.fy * 32 * k, 32 * k, 32 * k); }
        else if (t.kind === 'tram') paintTramCar(g, t.w, t.h, t.part);
        else if (t.kind === 'p') paintPortraitFrame(g, wid, t.w, t.h);
        else paintTileOf(g, wid, t.kind === 'n' || t.kind === 's' || t.kind === 'h' || t.kind === 'm' ? t.kind : 'n', t.v, s, t.seed);
        if (t.gift) paintGift(g, wid, s);
      });
      if (tileCache.size > 900) tileCache.clear();
      tileCache.set(key, c);
      return c;
    }
    // voiture du tramway jaune de Lisbonne (part : 0 avant, 1 milieu, 2 arrière)
    function paintTramCar(g, w, h, part) {
      const r = 4;
      rr(g, 0, 0, w, h, r); g.fillStyle = lin(g, 0, 0, 0, h, [[0, '#ffe066'], [0.55, '#f6c430'], [1, '#d99a12']]); g.fill();
      g.fillStyle = '#fff6d8'; g.fillRect(0, h * 0.7, w, h * 0.12);
      g.fillStyle = '#2b3a55';
      if (part === 0) { rr(g, w * 0.08, h * 0.16, w * 0.5, h * 0.42, 3); g.fill(); g.fillStyle = '#ffe9a0'; circ(g, w * 0.8, h * 0.82, 2.4); g.fill(); }
      else if (part === 2) { rr(g, w * 0.42, h * 0.16, w * 0.5, h * 0.42, 3); g.fill(); g.fillStyle = '#ff6a5a'; circ(g, w * 0.2, h * 0.82, 2.2); g.fill(); }
      else { rr(g, w * 0.1, h * 0.16, w * 0.35, h * 0.42, 3); g.fill(); rr(g, w * 0.55, h * 0.16, w * 0.35, h * 0.42, 3); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(w * 0.12, h * 0.2, w * 0.1, h * 0.3);
      g.strokeStyle = 'rgba(80,50,0,0.5)'; g.lineWidth = 1; rr(g, 0.5, 0.5, w - 1, h - 1, r); g.stroke();
      glazeFx(g, w, r, 0.7, false);
    }
    // cadre d'un carreau-portrait (la tête est dessinée par-dessus, en direct)
    function paintPortraitFrame(g, wid, w, h) {
      const Wd = CARREAUX_WORLDS.find((x) => x.id === wid) || CARREAUX_WORLDS[0];
      const acc = Wd.colors.accent, r = 5;
      rr(g, 0, 0, w, h, r);
      g.fillStyle = lin(g, 0, 0, w, h, [[0, '#fff6dc'], [1, '#f2dcae']]); g.fill();
      g.lineWidth = 4; g.strokeStyle = lin(g, 0, 0, w, h, [[0, '#ffe7a0'], [0.5, '#d9a43a'], [1, '#9a6a18']]); rr(g, 2, 2, w - 4, h - 4, r); g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = acc; rr(g, 6, 6, w - 12, h - 12, 3); g.stroke();
      g.fillStyle = rgba(acc, 0.18); rr(g, 6, 6, w - 12, h - 12, 3); g.fill();
      for (const [x, y] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7]]) { g.fillStyle = acc; circ(g, x, y, 2.4); g.fill(); }
      glazeFx(g, w, r, 0.6, false);
    }
    function sceneFor(wi) {
      const wid = CARREAUX_WORLDS[wi].id, sr = Math.min(dpr, lowFx ? 1.2 : 2);
      return paintScene(wid, cw, ch, fieldPx, sr);
    }

    // ---------------------------------------------------------------- têtes des copains
    function fetchHeads() {
      try {
        const h = api.heads ? api.heads() : null;
        if (!Array.isArray(h)) return [];
        return h.filter((x) => x && imgOk(x.img));
      } catch (e) { return []; }
    }
    let heads = fetchHeads();
    // la photo du joueur (passeport, pilote de l'avion) : api.player, sinon sa tête parmi celles de la salle
    const playerImg = (() => {
      try {
        if (api.player && imgOk(api.player.img)) return api.player.img;
        const nm = String((api.player && api.player.name) || '').toUpperCase();
        const h = nm ? heads.find((x) => String(x.name || '').toUpperCase() === nm) : null;
        return h ? h.img : null;
      } catch (e) { return null; }
    })();
    function headName(h) { return String((h && h.name) || 'COPAIN').slice(0, 12); }
    function sadImg(h) { return h && imgOk(h.sad) ? h.sad : h ? h.img : null; }
    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }

    // ---------------------------------------------------------------- état
    const S = {
      state: 'intro', st: 0, clock: 0,
      level: START, wi: 0, wid: 'portugal', tour: 0, stage: 0, isBoss: false, def: null,
      score: 0, shown: 0,
      tiles: [], grid: [], cols: 11, rows: 0, cs: 32, gx: GRID_X, gy: GRID_Y, off: 0, mosaic: false,
      remaining: 0, total: 0,
      balls: [], caps: [], lasers: [], shots: [], beams: [], rockets: [], pends: [],
      parts: [], shards: [], floats: [], rings: [], faces: [], callouts: [],
      paddle: { x: W / 2, tx: W / 2, w: 88, vx: 0, flash: 0, squash: 0, stun: 0 },
      eff: {}, laserT: 0,
      combo: 0, comboT: 0, bestCombo: 0, comboShown: 0,
      levelT: 0, par: 60, lastClear: null,
      boss: null, trams: [], rosettes: [], vents: [], shoji: [], descent: 0,
      timeK: 1, slowT: 0, slowK: 1, zoom: 0, zoomX: W / 2, zoomY: H / 2,
      shake: 0, shx: 0, shy: 0, flash: 0, flashCol: '#ffffff',
      lastHead: null, lastBossHead: null, portraitsBroken: 0,
      trip: null, banner: null, introT: 0, tip: '', launchHint: 0, serveT: 0,
      danger: 0, dangerBeep: 0, lostWhy: '', overCalled: false, deadT: 0,
      stats: { tiles: 0, bosses: 0, caps: 0, maxCombo: 0, pad: 0, endT: 0 }, ambient: [], wind: 0, lastBreakT: 0
    };
    for (const k of EFF_KEYS) S.eff[k] = 0;
    const keys = { left: false, right: false };
    let paused = false, drag = null, mouseMode = false, god = false, renderErr = null, started = false;
    let tuto = null;
    if (pref(TUTO_KEY, '0') !== '1') tuto = { step: 0, t: 0 };

    // ---------------------------------------------------------------- difficulté (tout dépend du niveau)
    function lvlK() { return S.level - 1; }
    // vitesse de la bille : monte vite pendant les trois premiers pays (intense en 3 à 4 minutes), puis plus doucement
    function baseSpeed() { const k = lvlK(); return Math.min(610, 345 * (1 + Math.min(k, 8) * 0.058 + Math.max(0, k - 8) * 0.025) * (1 + S.tour * 0.06)); }
    function ballSpeed() {
      let s = baseSpeed() * (1 + (S.isBoss ? Math.min(0.09, Math.max(0, S.levelT - 10) * 0.002) : Math.min(0.18, Math.max(0, S.levelT - 8) * 0.004)));
      if (S.eff.slow > 0) s *= 0.7;
      if (S.eff.turbo > 0) s *= 1.28;
      return Math.min(s, 720);
    }
    function basePW() { return Math.max(60, 92 - lvlK() * 1.6); }
    function paddleW() { let w = basePW(); if (S.eff.large > 0) w *= 1.45; if (S.eff.mini > 0) w *= 0.66; return w; }
    function pickPower() {
      const L = S.level, good = Math.max(0.5, 1 - lvlK() * 0.02), bad = Math.min(2.4, 1 + lvlK() * 0.06);
      let tot = 0; const w = {};
      for (const k of POWER_KEYS) { const P = POWERS[k]; w[k] = L < P.from ? 0 : P.weight * (P.bad ? bad : good); tot += w[k]; }
      let v = cr('pow') * tot;
      for (const k of POWER_KEYS) { v -= w[k]; if (v <= 0) return k; }
      return 'multi';
    }
    function pts(kind) {
      const L = S.level;
      switch (kind) {
        case 's': return 80 + L * 10;
        case 'h': return 120 + L * 12;
        case 'x': case 'k': case 'z': return 70 + L * 8;
        case 't': return 18 + L * 4;
        case 'f': return 50 + L * 8;
        case 'tram': return 90 + L * 8;
        case 'p': return 500 + L * 50;
        default: return 40 + L * 8;
      }
    }
    function mult() { return Math.min(4, 1 + Math.floor(S.combo / 5) * 0.5); }
    function gain(base, noMult) { const v = Math.round(base * (noMult ? 1 : mult())); S.score += v; return v; }

    // ---------------------------------------------------------------- construction d'un niveau
    let tileId = 0;
    function makeTile(kind, v, c, r, extra) {
      const cs = S.cs;
      const t = Object.assign({
        id: ++tileId, kind, v, c, r, cw: 1, chh: 1, x: S.gx + c * cs, y0: S.gy + r * cs, w: cs, h: cs,
        hp: 1, max: 1, alive: true, flash: 0, wob: 0, born: 0, lv: S.levelSeq, seed: (c * 31 + r * 17 + S.level * 7) % 97, cracks: 0,
        gift: false, power: null, head: null, grp: null, wid: S.wid
      }, extra || {});
      if (kind === 's') { t.hp = t.max = 2; }
      if (kind === 'h') { t.hp = t.max = 3; }
      if (kind === 'z') { t.hp = t.max = 2; }
      if (kind === 'm') { t.hp = t.max = Infinity; }
      t.key = t.wid + '|' + kind + '|' + v + '|' + t.w + 'x' + t.h + (S.wid === 'rome' ? '|' + (t.seed % 6) : '') + (t.gift ? '|g' : '');
      return t;
    }
    function buildLevel(n) {
      reseed(n);
      S.levelSeq = (S.levelSeq || 0) + 1;
      const wo = worldOf(n);
      S.level = n; S.wi = wo.w; S.wid = wo.world.id; S.tour = wo.tour; S.stage = wo.stage;
      const def = levelDef(n); S.def = def;
      S.isBoss = !!def.boss;
      S.mosaic = !!def.mosaic; S.cs = S.mosaic ? 16 : 32; S.cols = S.mosaic ? 22 : 11; S.rows = def.map.length;
      S.gx = GRID_X; S.gy = GRID_Y; S.off = 0;
      S.tiles = []; S.grid = new Array(S.cols * S.rows).fill(null);
      S.trams = []; S.rosettes = []; S.vents = []; S.shoji = []; S.rockets = []; S.pends = [];
      S.balls = []; S.caps = []; S.lasers = []; S.shots = []; S.beams = [];
      S.boss = null; S.levelT = 0; S.combo = 0; S.comboT = 0; S.danger = 0; S.mercy = 0; S.lastBreakT = 0;
      S.descent = def.descent || 0;
      S.tip = def.tip || '';
      heads = fetchHeads();
      const breakables = [];
      for (let r = 0; r < S.rows; r++) {
        const row = def.map[r] || '';
        for (let c = 0; c < S.cols; c++) {
          const chr = row[c] || '.';
          if (chr === '.') continue;
          let t = null;
          if (S.mosaic) {
            if (chr === '#') t = makeTile('m', 'w', c, r);
            else if (chr === '*') t = makeTile('x', 'w', c, r);
            else if (chr === '$') t = makeTile('n', 'y', c, r, { gift: true });
            else if (chr >= 'A' && chr <= 'Z') t = makeTile('s', chr.toLowerCase(), c, r);
            else t = makeTile('t', chr, c, r);
            if (t.kind === 't') t.key = 'rome|n|' + chr + '|16x16|' + (t.seed % 6);
            if (t.kind === 's' && S.mosaic) t.key = 'rome|s|' + t.v + '|16x16|' + (t.seed % 6);
          } else if (chr === 'f') {
            t = makeTile('f', 0, c, r, { fx: c - 1, fy: r });
            t.key = 'f|' + t.fx + ',' + t.fy;
          } else if (chr >= '0' && chr <= '5') t = makeTile('n', +chr, c, r);
          else if (chr >= 'a' && chr <= 'f') t = makeTile('s', chr.charCodeAt(0) - 97, c, r);
          else if (chr >= 'A' && chr <= 'F') t = makeTile('h', chr.charCodeAt(0) - 65, c, r);
          else if (chr === '#') t = makeTile('m', 0, c, r);
          else if (chr === '*') t = makeTile('x', 0, c, r);
          else if (chr === 'K') t = makeTile('k', 0, c, r);
          else if (chr === 'Z') t = makeTile('z', 0, c, r);
          else if (chr === '$') t = makeTile('n', (c + r) % 4, c, r, { gift: true });
          if (!t) continue;
          t.born = (S.mosaic ? r * 0.035 + c * 0.012 : r * 0.06 + c * 0.028) + 0.1;
          S.tiles.push(t);
          S.grid[r * S.cols + c] = t;
          if (t.kind !== 'm') breakables.push(t);
        }
      }
      // tramways (voitures de 1 case, plusieurs voitures par tram, qui reviennent de l'autre côté)
      for (const T of def.trams || []) {
        for (let k = 0; k < (T.count || 1); k++) {
          const tram = { row: T.row, speed: T.speed, dir: T.dir, x: (k / (T.count || 1)) * (GRID_W + 140) + crnd('lvl', 0, 40), cars: [] };
          for (let i = 0; i < T.cars; i++) {
            const t = makeTile('tram', 0, 0, T.row, { part: i === 0 ? (T.dir > 0 ? 2 : 0) : i === T.cars - 1 ? (T.dir > 0 ? 0 : 2) : 1, grp: tram, gi: i });
            t.key = 'tram|' + t.part; t.born = 0.4 + i * 0.05;
            tram.cars.push(t); S.tiles.push(t); breakables.push(t);
          }
          S.trams.push(tram);
        }
      }
      // rosaces de zellige qui tournent
      for (const R of def.rosettes || []) {
        const ro = { cx: S.gx + (R.cx + 0.5) * S.cs, cy: S.gy + (R.cy + 0.5) * S.cs, rad: R.r * S.cs, a: 0, speed: R.speed, tiles: [] };
        const center = makeTile('s', R.v || 0, 0, 0, { grp: ro, gi: -1, born: 0.5 });
        ro.tiles.push(center); S.tiles.push(center); breakables.push(center);
        for (let i = 0; i < R.n; i++) {
          const t = makeTile('n', (i + (R.v || 0)) % 5, 0, 0, { grp: ro, gi: i, born: 0.55 + i * 0.04 });
          ro.tiles.push(t); S.tiles.push(t); breakables.push(t);
        }
        S.rosettes.push(ro);
      }
      for (const V of def.vents || []) S.vents.push({ x: V.x, period: V.period, phase: V.phase, k: 0, blast: 0 });
      for (const tr of S.trams) tr.cars.forEach((t, i) => { t.x = tr.x + i * S.cs; t.y = S.gy + tr.row * S.cs + 1; t.h = S.cs - 2; });
      for (const ro of S.rosettes) for (const t of ro.tiles) { const a0 = t.gi < 0 ? 0 : (t.gi / 8) * TAU; t.x = ro.cx + (t.gi < 0 ? 0 : Math.cos(a0) * ro.rad) - S.cs / 2; t.y = ro.cy + (t.gi < 0 ? 0 : Math.sin(a0) * ro.rad) - S.cs / 2; t.ang = a0 + (t.gi < 0 ? 0 : Math.PI / 4); }
      for (const J of def.shoji || []) S.shoji.push({ row: J.row, w: J.w * 32, speed: J.speed, phase: J.phase, x: W / 2, open: 0 });
      // carreaux-portraits : la tête d'un copain (2 × 2 cases), un ou deux par niveau
      if (heads.length && !S.isBoss && !def.fresco) placePortraits(breakables);
      // bonus cachés (en plus des cadeaux) : environ 1 carreau sur 9
      const pool = breakables.filter((t) => !t.gift && t.kind !== 'p' && t.kind !== 'tram' && t.kind !== 'x');
      for (let i = pool.length - 1; i > 0; i--) { const j = (cr('lvl') * (i + 1)) | 0; const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      const nPow = Math.max(1, Math.round(pool.length * (S.mosaic ? 0.045 : 0.11)));
      for (let i = 0; i < nPow && i < pool.length; i++) pool[i].power = pickPower();
      let firstGift = true;
      for (const t of breakables) if (t.gift) { t.power = firstGift ? 'multi' : pickPower(); firstGift = false; }
      S.remaining = S.tiles.filter((t) => t.alive && t.kind !== 'm').length;
      S.total = S.remaining;
      S.par = 20 + S.total * (S.mosaic ? 0.12 : 0.6);
      if (S.isBoss) makeBoss(def.boss);
    }
    function placePortraits(breakables) {
      const hs = heads.slice();
      for (let i = hs.length - 1; i > 0; i--) { const j = (cr('head') * (i + 1)) | 0; const tmp = hs[i]; hs[i] = hs[j]; hs[j] = tmp; }
      if (hs.length > 1 && headName(hs[0]) === S.lastHead) hs.push(hs.shift());
      const pic = !!(S.def && S.def.picture), want = S.level === 1 || hs.length < 2 || pic ? 1 : 2, span = S.mosaic ? 4 : 2;
      const cands = [];
      for (let r = 0; r + span <= S.rows; r++) for (let c = 0; c + span <= S.cols; c++) {
        let n = 0, ok = true;
        for (let dr = 0; dr < span && ok; dr++) for (let dc = 0; dc < span; dc++) {
          const t = S.grid[(r + dr) * S.cols + c + dc];
          if (!t) continue;
          if (t.kind !== 'n' && t.kind !== 't' && t.kind !== 's') { ok = false; break; }
          n++;
        }
        if (ok && n >= span * span * 0.75) cands.push({ r, c, k: n + cr('head') * 0.9 + (pic ? Math.abs(c + span / 2 - S.cols / 2) * 2 : 0) });
      }
      cands.sort((a, b) => b.k - a.k);
      const chosen = [];
      for (const cd of cands) {
        if (chosen.length >= want) break;
        if (chosen.some((o) => Math.abs(o.c - cd.c) < span + 1 && Math.abs(o.r - cd.r) < span + 1)) continue;
        chosen.push(cd);
      }
      chosen.forEach((cd, k) => {
        const head = hs[k % hs.length];
        for (let dr = 0; dr < span; dr++) for (let dc = 0; dc < span; dc++) {
          const t = S.grid[(cd.r + dr) * S.cols + cd.c + dc];
          if (t) { t.alive = false; const i = breakables.indexOf(t); if (i >= 0) breakables.splice(i, 1); }
        }
        const p = makeTile('p', 0, cd.c, cd.r, { cw: span, chh: span, w: S.cs * span, h: S.cs * span, head, name: headName(head), born: 0.5 + k * 0.1 });
        p.key = 'p|' + S.wid + '|' + p.w;
        for (let dr = 0; dr < span; dr++) for (let dc = 0; dc < span; dc++) S.grid[(cd.r + dr) * S.cols + cd.c + dc] = p;
        S.tiles.push(p); breakables.push(p);
      });
      S.tiles = S.tiles.filter((t) => t.alive);
      if (chosen.length) S.lastHead = headName(hs[0]);
    }

    // ===================================================================== JEU : billes, carreaux, bonus
    const PMAX_HI = 320, PMAX_LO = 130;
    function addP(p) { const cap = lowFx ? PMAX_LO : PMAX_HI; if (S.parts.length >= cap) S.parts.splice(0, S.parts.length - cap + 1); S.parts.push(p); }
    function pop(x, y, text, col, size, life, vy) { if (S.floats.length > 24) S.floats.shift(); S.floats.push({ x, y, text: String(text), col: col || '#fff', size: size || 12, life: life || 0.9, max: life || 0.9, vy: vy == null ? -38 : vy }); }
    function callout(text, sub, col, life, size) { S.callouts = [{ text, sub: sub || '', col: col || '#ffd34d', t: 0, life: life || 1.3, size: size || 34 }]; }
    function ring(x, y, r0, r1, life, col, w) { if (S.rings.length > 30) S.rings.shift(); S.rings.push({ x, y, r0, r1, life, max: life, col, w: w || 3 }); }
    function doShake(m) { S.shake = Math.min(12, Math.max(S.shake, m)); }
    function slowmo(d, k) { S.slowT = Math.max(S.slowT, d); S.slowK = Math.min(S.slowK, k || 0.3); }
    function addFace(h, x, y, hgt, life) { const img = sadImg(h); if (img) { S.faces.push({ img, x, y, h: hgt, life, max: life }); if (S.faces.length > 5) S.faces.shift(); } }

    // hauteur réelle d'un carreau : ceux de la grille ont y0 (+ la descente), les mobiles (trams, rosaces) ont y
    function tyOf(t) { return t.grp ? t.y : t.y0 + S.off; }
    // ---------- éclats et poussières aux couleurs du pays ----------
    function shatter(t, n, vx0, vy0) {
      const ty = tyOf(t), cols = tileColors(t.wid, t.kind === 't' ? 'n' : t.kind, t.v), cx = t.x + t.w / 2, cy = ty + t.h / 2;
      const spr = tileCache.get(t.key);
      // quatre morceaux du vrai carreau qui s'envolent
      if (spr && !lowFx && t.w >= 24 && t.kind !== 'p') {
        const pw = spr.width / 2, ph = spr.height / 2;
        for (let q = 0; q < 4; q++) {
          const qx = q % 2, qy = q >> 1;
          addP({ k: 'quad', spr, sx: qx * pw, sy: qy * ph, sw: pw, sh: ph, x: t.x - PAD + qx * (t.w / 2 + PAD), y: ty - PAD + qy * (t.h / 2 + PAD), w: t.w / 2 + PAD, h: t.h / 2 + PAD,
            vx: (qx ? 1 : -1) * rand(40, 110) + vx0 * 0.12, vy: (qy ? 0 : -1) * rand(60, 150) - 40 + vy0 * 0.08, g: 620, rot: 0, vr: (qx ? 1 : -1) * rand(2, 7), life: 0.95, max: 0.95 });
        }
      }
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), sp = rand(50, 210), s = rand(1.6, t.kind === 't' ? 2.6 : 4.2);
        addP({ k: 'shard', x: cx + rand(-t.w / 3, t.w / 3), y: cy + rand(-t.h / 3, t.h / 3), vx: Math.cos(a) * sp + vx0 * 0.15, vy: Math.sin(a) * sp - 70 + vy0 * 0.1, g: 560,
          rot: rand(0, TAU), vr: rand(-12, 12), s, col: Math.random() < 0.65 ? cols[0] : cols[1], life: rand(0.55, 1.05), max: 1.05, n: 3 + ((Math.random() * 2) | 0) });
      }
      worldDust(cx, cy, t.kind === 't' ? 2 : 4);
    }
    function worldDust(x, y, n) {
      switch (S.wid) {
        case 'japon': for (let i = 0; i < n; i++) addP({ k: 'petal', x, y, vx: rand(-60, 60), vy: rand(-90, -20), g: 60, rot: rand(0, TAU), vr: rand(-4, 4), s: rand(2.6, 4), col: pick(['#ffc4d6', '#ff9ec0', '#ffe0ea']), life: rand(1.2, 2), max: 2 }); break;
        case 'mexique': for (let i = 0; i < n; i++) addP({ k: 'conf', x, y, vx: rand(-110, 110), vy: rand(-170, -50), g: 260, rot: rand(0, TAU), vr: rand(-10, 10), s: rand(2, 3.4), col: pick(['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6', '#4cd66a']), life: rand(0.9, 1.6), max: 1.6 }); break;
        case 'cristal': for (let i = 0; i < n + 1; i++) addP({ k: 'star', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-60, 10), g: 30, s: rand(1.6, 3), col: pick(['#ffffff', '#c9f6ff', '#ffd6f4']), life: rand(0.5, 0.9), max: 0.9, rot: rand(0, 3) }); break;
        case 'maroc': for (let i = 0; i < n; i++) addP({ k: 'dot', x, y, vx: rand(-50, 50), vy: rand(-60, 0), g: 140, s: rand(0.8, 1.6), col: 'rgba(230,180,110,0.8)', life: rand(0.5, 0.9), max: 0.9 }); break;
        case 'rome': for (let i = 0; i < n; i++) addP({ k: 'dot', x, y, vx: rand(-40, 40), vy: rand(-50, 0), g: 120, s: rand(1, 2.2), col: 'rgba(235,220,190,0.7)', life: rand(0.5, 1), max: 1 }); break;
        default: for (let i = 0; i < n; i++) addP({ k: 'dot', x, y, vx: rand(-50, 50), vy: rand(-70, -10), g: 160, s: rand(0.9, 1.8), col: 'rgba(255,255,255,0.8)', life: rand(0.4, 0.8), max: 0.8 });
      }
    }
    function sparks(x, y, n, col, sp) {
      for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(60, sp || 220); addP({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0, life: rand(0.18, 0.38), max: 0.38, col: col || '#fff', s: rand(1, 2) }); }
    }

    // ---------- la raquette et le service ----------
    function serve() {
      const p = S.paddle;
      S.balls = [{ x: p.x, y: PY - BR - 0.5, vx: 0, vy: 0, stuck: true, off: (cr('serve') < 0.5 ? -1 : 1) * 8, stickT: 0, trail: [], sq: 0, id: 1 }];
      S.serveT = 0; S.launchHint = 1;
    }
    function launchBall(b) {
      const p = S.paddle, off = clamp(b.off / (p.w / 2), -1, 1);
      let ang = off * 52 * DEG;
      if (Math.abs(ang) < 14 * DEG) ang = (off < 0 ? -1 : 1) * crnd('serve', 14, 22) * DEG;
      ang += clamp(p.vx / 2400, -0.18, 0.18);
      const sp = ballSpeed();
      b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp; b.stuck = false; b.y = PY - BR - 1; b.sq = 0.6;
    }
    function launch() {
      if (paused || S.state !== 'play') return false;
      let any = false;
      for (const b of S.balls) if (b.stuck) { launchBall(b); any = true; }
      if (any) { SFX.launch(); S.launchHint = 0; }
      return any;
    }
    function updatePaddle(dt) {
      const p = S.paddle;
      p.w += (paddleW() - p.w) * Math.min(1, dt * 10);
      p.stun = Math.max(0, p.stun - dt);
      const lim = WALL + p.w / 2, prev = p.x;
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (dir) { p.kv = clamp((p.kv || 0) + dir * 2600 * dt, -560, 560); p.tx = p.x + p.kv * dt; mouseMode = false; }
      else p.kv = 0;
      p.tx = clamp(p.tx, lim, W - lim);
      const k = mouseMode ? Math.min(1, dt * 30) : drag ? Math.min(1, dt * 38) : 1;
      if (p.stun <= 0) p.x += (p.tx - p.x) * k;
      else { const mv = 300 * dt; p.x += clamp(p.tx - p.x, -mv, mv); }      // étourdie : elle avance au ralenti
      p.x = clamp(p.x, lim, W - lim);
      p.vx = dt > 0 ? (p.x - prev) / dt : 0;
      p.flash = Math.max(0, p.flash - dt * 4);
      p.squash = Math.max(0, p.squash - dt * 5);
    }

    // ---------- collisions ----------
    // cercle contre rectangle aligné : renvoie { nx, ny, pen } ou null
    function circRect(bx, by, r, x0, y0, x1, y1) {
      const cx = clamp(bx, x0, x1), cy = clamp(by, y0, y1), dx = bx - cx, dy = by - cy, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) return null;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: r - d, cx, cy }; }
      const L = bx - x0, R = x1 - bx, T = by - y0, B = y1 - by, m = Math.min(L, R, T, B);
      if (m === T) return { nx: 0, ny: -1, pen: r + m, cx, cy };
      if (m === B) return { nx: 0, ny: 1, pen: r + m, cx, cy };
      if (m === L) return { nx: -1, ny: 0, pen: r + m, cx, cy };
      return { nx: 1, ny: 0, pen: r + m, cx, cy };
    }
    // cercle contre carré tourné (rosaces)
    function circOBB(bx, by, r, cx, cy, half, ang) {
      const c = Math.cos(-ang), s = Math.sin(-ang), dx = bx - cx, dy = by - cy;
      const lx = dx * c - dy * s, ly = dx * s + dy * c;
      const h = circRect(lx, ly, r, -half, -half, half, half);
      if (!h) return null;
      const c2 = Math.cos(ang), s2 = Math.sin(ang);
      return { nx: h.nx * c2 - h.ny * s2, ny: h.nx * s2 + h.ny * c2, pen: h.pen, cx: cx + (h.cx * c2 - h.cy * s2), cy: cy + (h.cx * s2 + h.cy * c2) };
    }
    function bounce(b, nx, ny, pen) {
      b.x += nx * Math.min(pen, BR * 1.5); b.y += ny * Math.min(pen, BR * 1.5);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; b.sq = 1; return true; }
      return false;
    }
    function tileAt(c, r) { if (c < 0 || c >= S.cols || r < 0 || r >= S.rows) return null; const t = S.grid[r * S.cols + c]; return t && t.alive ? t : null; }
    function gridTiles(b) {
      const cs = S.cs, oy = S.gy + S.off;
      const c0 = Math.floor((b.x - BR - S.gx) / cs), c1 = Math.floor((b.x + BR - S.gx) / cs);
      const r0 = Math.floor((b.y - BR - oy) / cs), r1 = Math.floor((b.y + BR - oy) / cs);
      let best = null, bh = null;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const t = tileAt(c, r); if (!t || t.born > S.introT) continue;
        const ty = t.y0 + S.off;
        const h = circRect(b.x, b.y, BR, t.x, ty, t.x + t.w, ty + t.h);
        if (!h) continue;
        // coins internes : on préfère la face libre (rebonds propres le long d'un mur de carreaux)
        if (h.nx && h.ny) {
          const sx = h.nx < 0 ? -1 : 1, sy = h.ny < 0 ? -1 : 1;
          const nbX = tileAt(t.c + (t.cw > 1 && sx > 0 ? t.cw : sx), r), nbY = tileAt(c, t.r + (t.chh > 1 && sy > 0 ? t.chh : sy));
          if (nbX && !nbY) { h.nx = 0; h.ny = sy; } else if (nbY && !nbX) { h.nx = sx; h.ny = 0; }
        }
        if (!bh || h.pen > bh.pen) { bh = h; best = t; }
      }
      return best ? { t: best, h: bh } : null;
    }
    function rosetteTilePos(ro, t) {
      if (t.gi < 0) return { x: ro.cx, y: ro.cy + S.off, a: ro.a };
      const a = ro.a + (t.gi / 8) * TAU;
      return { x: ro.cx + Math.cos(a) * ro.rad, y: ro.cy + S.off + Math.sin(a) * ro.rad, a: a + Math.PI / 4 };
    }
    function groupHit(b) {
      for (const tr of S.trams) for (const t of tr.cars) {
        if (!t.alive || t.x + t.w < WALL || t.x > W - WALL || t.born > S.introT) continue;
        const ty = S.gy + tr.row * S.cs + S.off + 1;
        const h = circRect(b.x, b.y, BR, t.x, ty, t.x + t.w, ty + t.h - 2);
        if (h) return { t, h };
      }
      for (const ro of S.rosettes) {
        if (Math.hypot(b.x - ro.cx, b.y - ro.cy - S.off) > ro.rad + S.cs) continue;
        for (const t of ro.tiles) {
          if (!t.alive || t.born > S.introT) continue;
          const P = rosetteTilePos(ro, t);
          const h = circOBB(b.x, b.y, BR, P.x, P.y, S.cs * 0.46, P.a);
          if (h) return { t, h };
        }
      }
      return null;
    }
    function shojiRects(J) {
      const y = S.gy + J.row * S.cs + S.off + S.cs * 0.14, h = S.cs * 0.72;
      const k = 0.5 + 0.5 * Math.sin(S.clock * J.speed + J.phase), span = W / 2 - WALL - J.w;
      const lx = WALL + k * span, rx = W - WALL - J.w - k * span;
      return [[lx, y, lx + J.w, y + h], [rx, y, rx + J.w, y + h]];
    }

    // ---------- coups sur les carreaux ----------
    function hitTile(t, b, dmg, src) {
      if (!t.alive || t.lv !== S.levelSeq) return;
      t.flash = 1; t.wob = 1;
      if (t.kind === 'm') { SFX.tink(); if (b) sparks(b.x, b.y, 4, '#ffffff', 140); doShake(0.8); return; }
      if (t.kind === 'z' && b && src === 'ball') splitBall(b, t);
      t.hp -= dmg;
      if (t.hp > 0) {
        t.cracks++;
        gain(15, true);
        SFX.crack();
        shatterLite(t);
        doShake(1.2);
        return;
      }
      breakTile(t, b, src);
    }
    function shatterLite(t) {
      const cols = tileColors(t.wid, t.kind, t.v);
      for (let i = 0; i < 4; i++) { const a = rand(0, TAU), sp = rand(40, 140); addP({ k: 'shard', x: t.x + t.w / 2, y: tyOf(t) + t.h / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, g: 500, rot: rand(0, TAU), vr: rand(-10, 10), s: rand(1.4, 2.6), col: cols[0], life: 0.6, max: 0.6, n: 3 }); }
    }
    function breakTile(t, b, src) {
      if (!t.alive || t.lv !== S.levelSeq) return;
      t.alive = false;
      if (!t.grp) { for (let dr = 0; dr < t.chh; dr++) for (let dc = 0; dc < t.cw; dc++) { const i = (t.r + dr) * S.cols + t.c + dc; if (S.grid[i] === t) S.grid[i] = null; } }
      S.remaining = Math.max(0, S.remaining - 1);
      S.stats.tiles++; S.lastBreakT = S.levelT;
      if (src !== 'clean') { S.combo++; S.comboT = 1.7; }
      if (S.combo > S.bestCombo) S.bestCombo = S.combo;
      const cx = t.x + t.w / 2, cy = tyOf(t) + t.h / 2;
      const v = t.summoned ? gain(10, true) : gain(pts(t.kind));
      if (t.kind !== 't' || Math.random() < 0.35) pop(cx, cy - 4, '+' + v, mult() > 1 ? '#ffd34d' : '#ffffff', t.kind === 't' ? 9 : 11, 0.7);
      SFX.note(S.combo, t.kind === 'h' || t.kind === 'p');
      shatter(t, t.kind === 't' ? 3 : lowFx ? 5 : 8, b ? b.vx : 0, b ? b.vy : 0);
      doShake(t.kind === 'h' ? 3 : 1.8);
      if (t.kind === 'h' || t.kind === 'p') S.hitstop = Math.max(S.hitstop || 0, 0.045);
      comboMilestones();
      if (t.power) spawnCap(cx, cy, t.power);
      if (t.kind === 'x') later(0.08, () => explodeAt(cx, cy, S.cs * 1.6, 'boom'));
      if (t.kind === 'k') launchRocket(cx, cy);
      if (t.kind === 'p') portraitBroken(t);
      // mosaïque : la tesselle entraîne ses voisines (elles s'émiettent par paquets)
      if (S.mosaic && t.kind === 't' && src === 'ball') {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const n2 = tileAt(t.c + dc, t.r + dr);
          if (n2 && n2.kind === 't') later(0.02 + (Math.abs(dr) + Math.abs(dc)) * 0.03, () => breakTile(n2, null, 'crumble'));
        }
      }
      // fresque : le tableau se détache par morceaux (un voisin part avec)
      if (t.kind === 'f' && src === 'ball') {
        const nb = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dc, dr]) => tileAt(t.c + dc, t.r + dr)).filter((n2) => n2 && n2.kind === 'f');
        if (nb.length) { const n2 = nb[(cr('drop') * nb.length) | 0]; later(0.06, () => breakTile(n2, null, 'crumble')); }
      }
      checkClear(t);
    }
    function comboMilestones() {
      const c = S.combo;
      if (c >= 5 && c % 5 === 0) { const m = mult(); callout('COMBO ×' + String(m).replace('.', ','), c + ' d\'affilée', '#ffd34d', 1.0, 28); SFX.combo(Math.min(6, c / 5)); }
      for (const [n, w] of COMBO_WORDS) if (c === n) { callout(w, 'Combo ' + n, '#ff7ad9', 1.3, 38); SFX.milestone(); slowmo(0.25, 0.4); }
      if (c > S.stats.maxCombo) S.stats.maxCombo = c;
    }
    function portraitBroken(t) {
      S.portraitsBroken++;
      const cx = t.x + t.w / 2, cy = tyOf(t) + t.h / 2, nm = t.name;
      addFace(t.head, cx, cy, t.h * 0.95, 1.6);
      pop(clamp(cx, 110, W - 110), cy - t.h * 0.55, pick(['Snif ! ' + nm + ' pleure !', 'Pauvre ' + nm + ' !', 'Oh non, ' + nm + ' !']), '#ff9fd0', 13, 1.7, -22);
      SFX.portrait();
      later(0.3, () => SFX.sad());
      sparks(cx, cy, 14, '#ffd34d', 260);
      doShake(4);
    }
    function explodeAt(x, y, rad0, src) {
      ring(x, y, 4, rad0 * 1.1, 0.42, '#ffcf5a', 5);
      sparks(x, y, 14, '#ffd34d', 260);
      SFX.boom(); doShake(4.5);
      S.flash = Math.max(S.flash, 0.18); S.flashCol = '#ffb04a';
      gain(30 + S.level * 4, true);
      const hitList = [];
      for (const t of S.tiles) {
        if (!t.alive || t.kind === 'm') continue;
        const ty = t.grp ? (t.kind === 'tram' ? S.gy + t.grp.row * S.cs + S.off : t.y) : t.y0 + S.off;
        const dx = Math.max(Math.abs(x - (t.x + t.w / 2)) - t.w / 2, 0), dy = Math.max(Math.abs(y - (ty + t.h / 2)) - t.h / 2, 0);
        if (dx * dx + dy * dy <= rad0 * rad0) hitList.push(t);
      }
      for (const t of hitList) hitTile(t, null, 1, src || 'boom');
      if (S.boss && S.boss.alive) { for (const hb of bossHitboxes()) if (Math.hypot(hb.x - x, hb.y - y) < hb.r + rad0) { hitBoss(1, x, y, null); break; } }
    }
    // fusée du Mexique : elle monte en tournoyant et éclate en feu d'artifice
    function launchRocket(x, y) {
      S.rockets.push({ x, y, vx: rand(-20, 20), vy: -360, t: 0 });
      SFX.rocket();
    }
    function updateRockets(dt) {
      for (const R of S.rockets) {
        R.t += dt; R.vy -= 220 * dt; R.x += (R.vx + Math.sin(R.t * 18) * 40) * dt; R.y += R.vy * dt;
        addP({ k: 'spark', x: R.x, y: R.y + 6, vx: rand(-30, 30), vy: rand(40, 120), g: 0, life: 0.35, max: 0.35, col: pick(['#ffd34d', '#ff8a3d', '#ffffff']), s: 1.6 });
        let boom = R.y < S.gy + S.off - 6 || R.t > 1.6;
        if (!boom) {
          const c = Math.floor((R.x - S.gx) / S.cs), r = Math.floor((R.y - S.gy - S.off) / S.cs), t = tileAt(c, r);
          if (t && t.kind !== 'k') boom = true;
        }
        if (boom) { R.dead = true; firework(R.x, Math.max(R.y, S.gy + S.off + 10)); }
      }
      S.rockets = S.rockets.filter((R) => !R.dead);
    }
    function firework(x, y) {
      const cols = ['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6', '#4cd66a', '#ffffff'], col = pick(cols);
      for (let i = 0; i < (lowFx ? 18 : 34); i++) { const a = (i / 34) * TAU, sp = rand(90, 200); addP({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 90, life: rand(0.6, 1.0), max: 1, col: Math.random() < 0.7 ? col : pick(cols), s: 2.2 }); }
      SFX.burst();
      explodeAt(x, y, S.cs * 1.75, 'boom');
    }
    // prisme : la bille se dédouble
    function splitBall(b, t) {
      SFX.prism();
      for (let i = 0; i < 8; i++) addP({ k: 'spark', x: t.x + t.w / 2, y: tyOf(t) + t.h / 2, vx: rand(-160, 160), vy: rand(-160, 160), g: 0, life: 0.4, max: 0.4, col: ['#ff5f7e', '#ffa53d', '#ffe14d', '#5ef08a', '#4fc3ff', '#b48cff'][i % 6], s: 2 });
      if (S.balls.length >= 5) return;
      const sp = Math.hypot(b.vx, b.vy) || ballSpeed(), a = Math.atan2(b.vy, b.vx) + (cr('drop') < 0.5 ? 0.5 : -0.5);
      S.balls.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, stuck: false, off: 0, stickT: 0, trail: [], sq: 1, id: Math.random(), prism: 1 });
    }

    // ---------- bonus (capsules) ----------
    function spawnCap(x, y, key) { S.caps.push({ x, y, key, vy: Math.min(170, 100 + S.level * 2.4), t: 0 }); }
    function updateCaps(dt) {
      const p = S.paddle;
      for (const c of S.caps) {
        c.t += dt; c.y += c.vy * dt;
        if (c.y + 8 >= PY && c.y - 8 <= PY + PH && Math.abs(c.x - p.x) <= p.w / 2 + 14) { c.dead = true; applyPower(c.key, c.x); }
        else if (c.y > H + 20) c.dead = true;
      }
      S.caps = S.caps.filter((c) => !c.dead);
    }
    function applyPower(key, x) {
      const P = POWERS[key]; if (!P) return;
      S.stats.caps++;
      gain(50, true);
      pop(clamp(x, 60, W - 60), PY - 26, P.name, P.bad ? '#c7cfdc' : P.color, 13, 1.3, -26);
      ring(S.paddle.x, PY + 6, 6, 70, 0.45, P.bad ? '#8a96a8' : P.color, 4);
      if (P.bad) SFX.bad(); else SFX.good();
      switch (key) {
        case 'multi': {
          const src = S.balls.filter((b) => !b.stuck);
          if (!src.length && S.balls[0]) { launchBall(S.balls[0]); src.push(S.balls[0]); }
          for (const b of src.slice(0, 3)) {
            const sp = Math.hypot(b.vx, b.vy) || ballSpeed(), a = Math.atan2(b.vy, b.vx);
            for (const d of [-0.38, 0.38]) { if (S.balls.length >= MAX_BALLS) break; S.balls.push({ x: b.x, y: b.y, vx: Math.cos(a + d) * sp, vy: Math.sin(a + d) * sp, stuck: false, off: 0, stickT: 0, trail: [], sq: 1, id: Math.random() }); }
          }
          break;
        }
        case 'large': S.eff.large = P.dur; S.eff.mini = 0; break;
        case 'mini': S.eff.mini = P.dur; S.eff.large = 0; break;
        case 'slow': S.eff.slow = P.dur; S.eff.turbo = 0; break;
        case 'turbo': S.eff.turbo = P.dur; S.eff.slow = 0; break;
        default: S.eff[key] = P.dur;
      }
    }
    function updateLasers(dt) {
      if (S.eff.laser > 0 && S.state === 'play') {
        S.laserT -= dt;
        if (S.laserT <= 0) {
          S.laserT = 0.3;
          const p = S.paddle;
          for (const s of [-1, 1]) S.lasers.push({ x: p.x + s * (p.w / 2 - 7), y: PY - 4, vy: -880 });
          SFX.laser();
        }
      }
      for (const L of S.lasers) {
        L.y += L.vy * dt;
        if (L.y < HUD_H) { L.dead = true; continue; }
        const c = Math.floor((L.x - S.gx) / S.cs), r = Math.floor((L.y - S.gy - S.off) / S.cs), t = tileAt(c, r);
        if (t && t.born <= S.introT) { L.dead = true; hitTile(t, null, 1, 'laser'); sparks(L.x, L.y, 3, '#ff9ab0', 120); continue; }
        const fake = { x: L.x, y: L.y, vx: 0, vy: -1 };
        const gh = groupHit(fake);
        if (gh) { L.dead = true; hitTile(gh.t, null, 1, 'laser'); continue; }
        if (laserBoss(L)) { L.dead = true; continue; }
        for (const sh of S.shots) if (!sh.dead && Math.abs(sh.x - L.x) < sh.r + 3 && Math.abs(sh.y - L.y) < sh.r + 6) { sh.dead = true; L.dead = true; shotPop(sh); break; }
      }
      S.lasers = S.lasers.filter((L) => !L.dead);
    }

    // ---------- la bille ----------
    function fixVelocity(b, sp) {
      let m = Math.hypot(b.vx, b.vy);
      if (m < 1e-6) { b.vx = 0; b.vy = -sp; m = sp; }
      b.vx *= sp / m; b.vy *= sp / m;
      const minVy = sp * Math.sin(17 * DEG);
      if (Math.abs(b.vy) < minVy) { const sy = b.vy > 0 ? 1 : -1; b.vy = sy * minVy; b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - minVy * minVy); }
    }
    function paddleBounce(b) {
      const p = S.paddle, half = p.w / 2;
      if (b.vy <= 0 || b.y + BR < PY || b.y - BR > PY + PH || b.y > PY + PH * 0.7) return false;
      if (b.x < p.x - half - BR * 0.7 || b.x > p.x + half + BR * 0.7) return false;
      const off = clamp((b.x - p.x) / (half + BR * 0.5), -1, 1);
      let ang = off * 63 * DEG + clamp(p.vx / 2600, -0.16, 0.16);
      ang = clamp(ang, -70 * DEG, 70 * DEG);
      const sp = ballSpeed();
      b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp; b.y = PY - BR - 0.5; b.sq = 1;
      p.flash = 1; p.squash = 1;
      SFX.paddle(off);
      S.stats.pad++; S.lastPadT = S.levelT;
      for (let i = 0; i < 4; i++) addP({ k: 'dot', x: b.x + rand(-6, 6), y: PY, vx: rand(-60, 60), vy: rand(-80, -20), g: 200, s: rand(1, 2), col: rgba(CARREAUX_WORLDS[S.wi].colors.accent, 0.9), life: 0.4, max: 0.4 });
      if (S.eff.magnet > 0) { b.stuck = true; b.off = clamp(b.x - p.x, -half + 4, half - 4); b.stickT = 1.6; S.launchHint = 0.6; }
      return true;
    }
    function stepBall(b, dt) {
      const p = S.paddle;
      if (b.stuck) {
        b.x = p.x + b.off; b.y = PY - BR - 0.5;
        if (S.state === 'play' && b.stickT > 0) { b.stickT -= dt; if (b.stickT <= 0) { launchBall(b); SFX.launch(); } }
        return;
      }
      const sp = ballSpeed();
      fixVelocity(b, sp);
      const n = Math.max(1, Math.ceil((sp * dt) / (BR * 0.45))), h = dt / n;
      const fire = S.eff.fire > 0;
      for (let i = 0; i < n; i++) {
        b.x += b.vx * h; b.y += b.vy * h;
        if (b.x < WALL + BR) { b.x = WALL + BR; b.vx = Math.abs(b.vx); SFX.wall(); }
        else if (b.x > W - WALL - BR) { b.x = W - WALL - BR; b.vx = -Math.abs(b.vx); SFX.wall(); }
        if (b.y < HUD_H + BR) { b.y = HUD_H + BR; b.vy = Math.abs(b.vy); SFX.wall(); }
        // carreaux de la grille
        const gh = gridTiles(b);
        if (gh) {
          const t = gh.t;
          if (fire && t.kind !== 'm') { hitTile(t, b, 99, 'ball'); }
          else { bounce(b, gh.h.nx, gh.h.ny, gh.h.pen); hitTile(t, b, 1, 'ball'); }
        }
        const gg = groupHit(b);
        if (gg) { if (fire) hitTile(gg.t, b, 99, 'ball'); else { bounce(b, gg.h.nx, gg.h.ny, gg.h.pen); hitTile(gg.t, b, 1, 'ball'); } }
        for (const J of S.shoji) for (const R of shojiRects(J)) { const hh = circRect(b.x, b.y, BR, R[0], R[1], R[2], R[3]); if (hh) { if (bounce(b, hh.nx, hh.ny, hh.pen)) SFX.tink(); } }
        if (S.boss) ballBoss(b);
        if (b.vy > 0 && paddleBounce(b)) { if (b.stuck) { b.x = p.x + b.off; b.y = PY - BR - 0.5; return; } }
        if (S.eff.net > 0 && b.vy > 0 && b.y > PY + 26) { b.y = PY + 26; b.vy = -Math.abs(b.vy); SFX.net(); ring(b.x, b.y, 4, 30, 0.35, '#ffd34d', 3); }
        if (b.y - BR > H + 4) { b.dead = true; return; }
      }
      fixVelocity(b, sp);
      // derniers carreaux : la bille montante se courbe doucement vers eux (fini la chasse au dernier carreau)
      if (!S.isBoss && S.remaining > 0 && S.remaining <= 5 && b.vy < 0 && S.levelT - S.lastBreakT > 1.5) homing(b, dt);
      // vapeur (Rome) : souffle vers le haut
      for (const V of S.vents) if (V.blast > 0 && Math.abs(b.x - V.x) < 30 && b.y > S.gy + S.off + 40 && b.y < PY - 10) { b.vy -= 1500 * dt; }
      if (S.wind) b.vx += S.wind * dt;
      b.sq = Math.max(0, b.sq - dt * 6);
      b.trail.push(b.x, b.y);
      if (b.trail.length > 24) b.trail.splice(0, 2);
    }
    function homing(b, dt) {
      let best = null, bd = 1e9;
      for (const t of S.tiles) {
        if (!t.alive || t.kind === 'm') continue;
        const tx = t.x + t.w / 2, ty = (t.grp ? t.y : t.y0 + S.off) + t.h / 2;
        if (ty > b.y) continue;
        const d = Math.hypot(tx - b.x, ty - b.y);
        if (d < bd) { bd = d; best = { x: tx, y: ty }; }
      }
      if (!best) return;
      const a = Math.atan2(b.vy, b.vx), want = Math.atan2(best.y - b.y, best.x - b.x);
      let da = want - a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const k = clamp(da, -1, 1) * Math.min(1, (S.levelT - S.lastBreakT - 1.5) / 3) * 1.8 * dt, sp = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(a + k) * sp; b.vy = Math.sin(a + k) * sp;
      if (Math.random() < dt * 20) addP({ k: 'star', x: b.x, y: b.y, vx: 0, vy: 0, g: 0, s: 1.4, col: '#ffe9a0', life: 0.4, max: 0.4, rot: 0 });
    }
    function updateBalls(dt) {
      for (const b of S.balls) { stepBall(b, dt); if (b.dead) S.lostX = b.x; }
      const before = S.balls.length;
      S.balls = S.balls.filter((b) => !b.dead);
      if (before && !S.balls.length && S.state === 'play') {
        if (god) { serve(); return; }
        startDying('ball');
      }
    }

    // ---------- accessoires des pays ----------
    function updateProps(dt) {
      for (const tr of S.trams) {
        const L = tr.cars.length * S.cs, span = W + L + 60;
        tr.x += tr.speed * tr.dir * dt;
        if (tr.dir > 0 && tr.x > W + 30) tr.x -= span;
        if (tr.dir < 0 && tr.x + L < -30) tr.x += span;
        tr.cars.forEach((t, i) => { t.x = tr.x + i * S.cs; t.y = S.gy + tr.row * S.cs + S.off + 1; t.h = S.cs - 2; });
      }
      for (const ro of S.rosettes) {
        ro.a += ro.speed * dt;
        for (const t of ro.tiles) { const P = rosetteTilePos(ro, t); t.x = P.x - S.cs / 2; t.y = P.y - S.cs / 2; t.ang = P.a; }
      }
      for (const V of S.vents) {
        const ph = ((S.clock + V.phase) % V.period + V.period) % V.period;
        V.warn = ph > V.period - 2.6 && ph < V.period - 1.5 ? 1 : 0;
        V.blast = ph >= V.period - 1.5 ? 1 : 0;
        if (V.warn && Math.random() < dt * 14) addP({ k: 'steam', x: V.x + rand(-8, 8), y: PY - 6, vx: rand(-10, 10), vy: rand(-60, -30), g: 0, s: rand(5, 9), life: 1, max: 1 });
        if (V.blast && Math.random() < dt * (lowFx ? 26 : 50)) addP({ k: 'steam', x: V.x + rand(-14, 14), y: PY - 4, vx: rand(-16, 16), vy: rand(-420, -260), g: 0, s: rand(8, 15), life: rand(0.7, 1.1), max: 1.1 });
        if (V.blast && !V.was) SFX.rocket();
        V.was = V.blast;
      }
      // le carrelage descend (Mexique, Cristal, et tout le Tour II)
      if (S.descent > 0 && S.state === 'play' && !S.isBoss && S.levelT > 7) {
        S.off += S.descent * dt * (1 + Math.min(1.5, (S.levelT - 7) / 70));
        let low = 0;
        for (const t of S.tiles) {
          if (!t.alive) continue;
          const by = (t.grp ? t.y : t.y0 + S.off) + t.h;
          if (t.kind === 'm') { if (by > DANGER_Y - 24) { t.alive = false; if (!t.grp) S.grid[t.r * S.cols + t.c] = null; shatter(t, 6, 0, 0); SFX.tink(); } continue; }
          if (by > low) low = by;
        }
        for (const ro of S.rosettes) for (const t of ro.tiles) if (t.alive) low = Math.max(low, t.y + S.cs);
        S.danger = clamp(1 - (DANGER_Y - low) / 110, 0, 1);
        if (S.danger > 0.4) { S.dangerBeep -= dt; if (S.dangerBeep <= 0) { S.dangerBeep = 1.1 - S.danger * 0.75; tone(880, 0.06, 'square', 0.025); } }
        if (low >= DANGER_Y && !god) startDying('wall');
      } else S.danger = Math.max(0, S.danger - dt);
    }

    // ---------- fin de niveau, défaite ----------
    function checkClear(last) {
      if (S.state !== 'play' || S.isBoss) return;
      if (S.remaining > 0) return;
      // dernier carreau : ralenti et zoom sur lui
      if (last) { S.zoomX = last.x + last.w / 2; S.zoomY = (last.grp ? last.y : last.y0 + S.off) + last.h / 2; }
      slowmo(0.85, 0.22); S.zoom = 1;
      clearLevel();
    }
    function clearLevel() {
      S.state = 'clear'; S.st = 0;
      const base = 300 + 150 * S.level;
      const fast = Math.max(0, Math.round((S.par - S.levelT) * (8 + S.level) / 10) * 10);
      const friend = S.portraitsBroken ? S.portraitsBroken * 0 : 0;
      S.lastClear = { base, fast, friend, combo: S.bestCombo, time: S.levelT };
      S.score += base + fast;
      ballsPoof();
      S.caps = []; S.shots = []; S.beams = []; S.lasers = [];
      SFX.clear();
      worldParty();
      celebrate(CHEERS[(S.level + ((Math.random() * 3) | 0)) % CHEERS.length]);
    }
    function worldParty() {
      const n = lowFx ? 24 : 54, wid = S.wid;
      for (let i = 0; i < n; i++) {
        const x = rand(20, W - 20), y = rand(HUD_H + 20, 420);
        if (wid === 'mexique') { if (i < 4) later(0.15 + i * 0.22, () => { const fx = rand(60, W - 60), fy = rand(120, 300), col = pick(['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#b48cff']); for (let k = 0; k < 26; k++) { const a = (k / 26) * TAU, sp = rand(90, 190); addP({ k: 'spark', x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 90, life: rand(0.6, 1), max: 1, col, s: 2.2 }); } SFX.burst(); }); addP({ k: 'conf', x, y: HUD_H, vx: rand(-60, 60), vy: rand(40, 160), g: 120, rot: rand(0, TAU), vr: rand(-8, 8), s: rand(2, 3.4), col: pick(['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6', '#4cd66a']), life: 2, max: 2 }); }
        else if (wid === 'japon') addP({ k: 'petal', x, y: HUD_H + rand(0, 40), vx: rand(-40, 40), vy: rand(20, 90), g: 30, rot: rand(0, TAU), vr: rand(-4, 4), s: rand(3, 5), col: pick(['#ffc4d6', '#ff9ec0', '#ffe0ea']), life: 2.4, max: 2.4 });
        else if (wid === 'cristal') addP({ k: 'star', x, y, vx: rand(-30, 30), vy: rand(-30, 30), g: 0, s: rand(2, 3.5), col: pick(['#ffffff', '#c9f6ff', '#ffd6f4', '#c79bff']), life: rand(0.8, 1.6), max: 1.6, rot: rand(0, 3) });
        else if (wid === 'rome') addP({ k: 'tess', x, y: HUD_H, vx: rand(-50, 50), vy: rand(60, 200), g: 300, rot: rand(0, TAU), vr: rand(-6, 6), s: rand(2, 3), col: pick(['#e9c457', '#2c79a6', '#b5553a', '#efe6d2', '#3aa9a2']), life: 1.8, max: 1.8 });
        else if (wid === 'maroc') addP({ k: 'star', x, y, vx: rand(-20, 20), vy: rand(-60, -10), g: 0, s: rand(2, 3.4), col: pick(['#19c9a3', '#ffd34d', '#ff8a3d', '#ffffff']), life: rand(0.8, 1.5), max: 1.5, rot: rand(0, 3) });
        else addP({ k: 'feather', x, y: HUD_H, vx: rand(-60, 60), vy: rand(30, 120), g: 40, rot: rand(0, TAU), vr: rand(-5, 5), s: rand(2.5, 4), col: pick(['#ffffff', '#3b82ff', '#ffcf3a']), life: 2.2, max: 2.2 });
      }
    }
    // les billes s'envolent en étincelles (fin de niveau)
    function ballsPoof() {
      const acc = CARREAUX_WORLDS[S.wi].colors.accent;
      for (const b of S.balls) { sparks(b.x, b.y, 12, '#ffffff', 220); ring(b.x, b.y, 3, 26, 0.4, acc, 3); }
      S.balls = [];
    }
    function startDying(why) {
      if (S.state !== 'play' && S.state !== 'intro') return;
      S.stats.death = { why, stun: +S.paddle.stun.toFixed(2), turbo: +(S.eff.turbo || 0).toFixed(1), ph: S.boss ? S.boss.ph : -1, t: +S.levelT.toFixed(1), lastPad: S.lastPadT != null ? +(S.levelT - S.lastPadT).toFixed(2) : null, lastBoss: S.lastBossBounce != null ? +(S.levelT - S.lastBossBounce).toFixed(2) : null, px: Math.round(S.paddle.x), bx: Math.round(S.lostX || 0) };
      S.state = 'dying'; S.st = 0; S.lostWhy = why;
      S.callouts = [];   // « PERDU ! » seul : le dernier « COMBO » / « SUPER ! » s'efface
      bossMusicOff();
      S.caps = []; S.lasers = [];
      slowmo(0.9, 0.3);
      doShake(9);
      S.flash = 0.35; S.flashCol = '#ff4d5e';
      SFX.lose();
      if (why === 'wall') { for (let i = 0; i < 8; i++) sparks(rand(30, W - 30), DANGER_Y, 6, '#ff4d5e', 160); S.balls = []; }
      else for (let i = 0; i < 18; i++) addP({ k: 'dot', x: clamp(S.paddle.x + rand(-40, 40), 20, W - 20), y: H - 6, vx: rand(-80, 80), vy: rand(-220, -60), g: 400, s: rand(1.4, 3), col: '#ffffff', life: 0.9, max: 0.9 });
    }
    function finishGame() {
      if (S.overCalled) return;
      S.overCalled = true;
      S.state = 'over'; S.st = 0;
      try { if (typeof api.gameOver === 'function') api.gameOver(Math.max(0, Math.floor(S.score))); } catch (e) { /* rien */ }
    }

    // ===================================================================== BOSS : entrée, phases, attaques, défaite
    // attaques par phase (annoncées : bandeau + ligne de visée avant le coup)
    const BOSS_PLAN = {
      coq: { y: 150, names: ['Les œufs !', 'COCORICO !', 'Le coq s’envole !'], atk: [['eggs'], ['eggs', 'cocorico'], ['eggs2', 'shield', 'cocorico']] },
      theiere: { y: 150, names: ['Un petit thé ?', 'Les sucres !', 'Tempête de menthe !'], atk: [['tea'], ['tea', 'sugar'], ['tea2', 'sugar', 'mint']] },
      neptune: { y: 160, names: ['Les tridents !', 'Les dauphins !', 'La tempête !'], atk: [['trident'], ['trident', 'dolphins'], ['lightning', 'trident', 'dolphins']] },
      chat: { y: 158, names: ['Les pelotes !', 'Coup de patte !', 'Chat magique !'], atk: [['yarn'], ['yarn', 'paw'], ['paw2', 'yarn', 'teleport']] },
      pinata: { y: 190, names: ['Elle se balance !', 'Les pétards !', 'La corde a lâché !'], atk: [['candy'], ['petards', 'candy'], ['petards', 'candy']] },
      lustre: { y: 112, names: ['Les gouttes de cristal !', 'Les rayons !', 'Tempête de cristal !'], atk: [['icicles'], ['icicles', 'rays'], ['sweep', 'icicles', 'regrow']] }
    };
    // musique de boss de la borne (api.music) pendant le combat, puis retour à la musique du jeu
    let bossMusic = false;
    function music(name) {
      try { if (typeof api.music === 'function') { if (name) api.music(name); else api.music(); } } catch (e) { /* rien */ }
    }
    function bossMusicOn() { if (!bossMusic) { bossMusic = true; music('iloboss'); } }
    function bossMusicOff() { if (bossMusic) { bossMusic = false; music(); } }
    function makeBoss(id) {
      const A = BOSS_ART[id], P = BOSS_PLAN[id];
      let head = null;
      // le boss porte la tête d'un copain deux fois sur trois (sinon on voit le vrai visage du boss)
      const withHead = cr('head') < 0.67 || (S.wi === 0 && S.tour === 0);
      if (heads.length && withHead) {
        let c = heads.filter((h) => headName(h) !== S.lastBossHead);
        if (!c.length) c = heads;
        head = c[(cr('head') * c.length) | 0];
        S.lastBossHead = headName(head);
      }
      const W0 = CARREAUX_WORLDS[S.wi];
      const max = Math.round(A.hp * (1 + S.tour * 0.45));
      S.boss = {
        id, A, P, x: W / 2, y: -170, ty: P.y, baseY: P.y, dir: 1, hp: max, max, ph: 0, alive: true, state: 'enter', st: 0, t: 0,
        head, headSad: head ? sadImg(head) : null, name: head ? headName(head) : W0.boss.title, title: W0.boss.name,
        flash: 0, hitCd: 0, wob: 0, atkT: 2.4, atkI: 0, atk: null, anim: { flap: 0, lid: 0, tilt: 0, wave: 0.5, spin: 0, walking: true },
        tiles: null, pends: [], dolphins: [], swingA: 0, vx: 0, vy: 0, free: false, hits: 0, cracks: []
      };
      const B = S.boss;
      if (id === 'neptune') B.tiles = buildNeptuneTiles(head ? head.img : null);
      if (id === 'lustre') B.pends = LUSTRE_PENDS.map((p, i) => ({ x: p.x, y: p.y, tier: p.tier, alive: true, i, regrow: 0, hp: 1 }));
      SFX.bossIntro();
      bossMusicOn();
    }
    function bossHitboxes() {
      const B = S.boss; if (!B) return [];
      const d = B.id === 'coq' ? B.dir : 1;
      return B.A.hits.map((h) => ({ x: B.x + h.x * d, y: B.y + h.y, r: h.r }));
    }
    function bossVulnerable() {
      const B = S.boss;
      if (!B || !B.alive || B.state !== 'fight') return false;
      if (B.id === 'lustre') return B.pends.filter((p) => p.alive && p.tier === 1).length <= 1;
      return true;
    }
    function ballBoss(b) {
      const B = S.boss; if (!B || !B.alive || B.state === 'enter' || B.state === 'dying') return;
      // pendeloques du lustre
      if (B.id === 'lustre') for (const p of B.pends) {
        if (!p.alive) continue;
        const px = B.x + p.x, py = B.y + p.y + 10, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
        if (d < BR + 9) { bounce(b, dx / (d || 1), dy / (d || 1), BR + 9 - d); breakPendant(p); return; }
      }
      // dauphins de Neptune
      for (const D of B.dolphins) {
        const dx = b.x - D.x, dy = b.y - D.y, d = Math.hypot(dx, dy);
        if (d < BR + 20) { bounce(b, dx / (d || 1), dy / (d || 1), BR + 20 - d); if (D.flip <= 0) { D.flip = 1; gain(30, true); pop(D.x, D.y - 18, '+30', '#bff3ff', 11, 0.7); } SFX.tink(); return; }
      }
      for (const hb of bossHitboxes()) {
        const dx = b.x - hb.x, dy = b.y - hb.y, d = Math.hypot(dx, dy);
        if (d >= hb.r + BR) continue;
        const nx = d ? dx / d : 0, ny = d ? dy / d : 1;
        if (bounce(b, nx, ny, hb.r + BR - d)) {
          S.lastBossBounce = S.levelT;
          if (bossVulnerable()) hitBoss(S.eff.fire > 0 ? 2 : 1, hb.x + nx * hb.r, hb.y + ny * hb.r, b);
          else { SFX.bossBlock(); sparks(hb.x + nx * hb.r, hb.y + ny * hb.r, 5, '#c9f6ff', 140); if (B.id === 'lustre') pop(B.x, B.y + 110, 'Casse les pendeloques !', '#c9f6ff', 11, 1); }
        }
        return;
      }
    }
    function laserBoss(L) {
      const B = S.boss; if (!B || !B.alive || B.state !== 'fight') return false;
      if (B.id === 'lustre') for (const p of B.pends) if (p.alive && Math.abs(L.x - (B.x + p.x)) < 8 && Math.abs(L.y - (B.y + p.y + 10)) < 14) { breakPendant(p); return true; }
      for (const hb of bossHitboxes()) if (Math.hypot(L.x - hb.x, L.y - hb.y) < hb.r) { if (bossVulnerable()) hitBoss(0.25, L.x, L.y, null); else SFX.bossBlock(); return true; }
      return false;
    }
    function breakPendant(p) {
      const B = S.boss;
      p.alive = false; p.regrow = 6;
      const x = B.x + p.x, y = B.y + p.y + 10;
      for (let i = 0; i < 10; i++) addP({ k: 'shard', x, y, vx: rand(-140, 140), vy: rand(-160, 20), g: 520, rot: rand(0, TAU), vr: rand(-12, 12), s: rand(1.6, 3), col: pick(['#7ef0ff', '#c79bff', '#ff9ad5', '#ffffff']), life: 0.9, max: 0.9, n: 3 });
      sparks(x, y, 6, '#ffffff', 160);
      SFX.prism(); gain(60 + S.level * 5);
      pop(x, y - 10, '+' + (60 + S.level * 5), '#c9f6ff', 11, 0.7);
      S.combo++; S.comboT = 1.7; comboMilestones();
      if (bossVulnerable() && !B.coreOpen) { B.coreOpen = true; callout('LE CŒUR EST À NU !', 'Vise la boule de cristal', '#7ef0ff', 1.4, 26); }
    }
    function hitBoss(dmg, hx, hy, b) {
      const B = S.boss;
      if (!B || !B.alive || B.state !== 'fight') return;
      if (B.hitCd > 0 && dmg >= 1) { SFX.bossBlock(); return; }
      if (dmg >= 1) B.hitCd = 0.12;
      B.hp = Math.max(0, B.hp - dmg); B.flash = 1; B.wob = 1; B.hits++;
      S.combo++; S.comboT = 1.7; comboMilestones();
      const v = gain(Math.round((40 + S.level * 5) * Math.min(1, dmg)));
      if (dmg >= 1) pop(hx, hy, '+' + v, '#ffffff', 12, 0.7);
      SFX.bossHit(); doShake(dmg >= 1 ? 3 : 1);
      if (dmg >= 1) S.hitstop = Math.max(S.hitstop || 0, 0.04);
      sparks(hx, hy, dmg >= 1 ? 9 : 3, '#ffffff', 220);
      if (B.id === 'neptune' && B.tiles) knockTesserae(hx, hy, dmg >= 1 ? 9 : 3);
      if (B.id === 'pinata' && dmg >= 1) for (let i = 0; i < 2; i++) S.shots.push({ kind: 'candy', x: B.x + rand(-20, 20), y: B.y + 20, vx: rand(-80, 80), vy: rand(-120, -40), r: 7, rot: rand(0, TAU), vr: rand(-6, 6), reward: true, g: 380, col: pick(PIN_COLS) });
      if (B.id === 'lustre' && dmg >= 1) B.cracks.push([rand(-18, 18), rand(-18, 18), rand(-6, 6), rand(-6, 6), rand(-18, 18), rand(-18, 18)]);
      // un bonus tombe de temps en temps
      if (dmg >= 1 && B.hits % 5 === 0) spawnCap(B.x, B.y + 40, pickPower());
      const ph = B.hp / B.max > 2 / 3 ? 0 : B.hp / B.max > 1 / 3 ? 1 : 2;
      if (B.hp <= 0) { bossDefeated(); return; }
      if (ph > B.ph) {
        B.ph = ph; B.state = 'phase'; B.st = 0; B.atk = null; B.atkT = 1.6;
        S.beams = []; SFX.phase(); slowmo(0.35, 0.35); doShake(6);
        callout('PHASE ' + (ph + 1), B.P.names[ph], CARREAUX_WORLDS[S.wi].colors.accent2, 1.6, 40);
        if (B.id === 'pinata' && ph === 2) { B.free = true; B.vx = (B.x < W / 2 ? 1 : -1) * 150; B.vy = -80; for (let i = 0; i < 12; i++) addP({ k: 'dot', x: B.x, y: B.y - 50, vx: rand(-60, 60), vy: rand(-80, 40), g: 300, s: 2, col: '#c9a26a', life: 0.8, max: 0.8 }); }
      }
    }
    function knockTesserae(x, y, n) {
      const B = S.boss, T = NEP_T, ox = B.x - NEP_COLS * T / 2, oy = B.y - NEP_ROWS * T / 2;
      const cand = B.tiles.filter((q) => q.on).map((q) => ({ q, d: Math.hypot(ox + q.c * T + T / 2 - x, oy + q.r * T + T / 2 - y) })).sort((a, b) => a.d - b.d).slice(0, n);
      if (cand.length) B.dirty = true;
      for (const { q } of cand) {
        q.on = false;
        addP({ k: 'tess', x: ox + q.c * T + T / 2, y: oy + q.r * T + T / 2, vx: rand(-90, 90), vy: rand(-140, 10), g: 600, rot: rand(0, TAU), vr: rand(-8, 8), s: T * 0.45, col: q.col, life: 1.2, max: 1.2 });
      }
    }
    function bossDefeated() {
      const B = S.boss;
      B.alive = false; B.state = 'dying'; B.st = 0; B.atk = null;
      S.beams = []; S.shots = S.shots.filter((s) => s.reward);
      S.stats.bosses++;
      const v = gain(1200 + 150 * S.level, true);
      SFX.bossDown(); slowmo(1.4, 0.25); doShake(10);
      later(1.2, bossMusicOff);
      S.zoom = 1; S.zoomX = B.x; S.zoomY = B.y;
      pop(B.x, B.y + 80, '+' + fmt(v), '#ffd34d', 20, 2.2, -20);
      // la phrase triste reste SOUS la barre de vie du boss (y 52-66) même quand le boss est tout en haut
      if (B.head) later(0.7, () => { addFace(B.head, B.x, B.y - 10, 90, 2.4); pop(clamp(B.x, 120, W - 120), Math.max(B.y - 80, 52 + 44), pick(['Snif… ' + B.name + ' pleure !', 'Pauvre ' + B.name + ' !', B.name + ' a perdu !']), '#ff9fd0', 15, 2.2, -14); SFX.sad(); });
      for (const b of S.balls) { b.stuck = false; }
      S.eff.net = Math.max(S.eff.net, 8);
    }
    function bossExplode() {
      const B = S.boss, x = B.x, y = B.y;
      S.flash = 0.6; S.flashCol = '#ffffff';
      ring(x, y, 10, 260, 0.8, '#ffffff', 8); ring(x, y, 10, 180, 0.6, CARREAUX_WORLDS[S.wi].colors.accent2, 6);
      const kinds = { coq: ['feather', ['#1c1a24', '#e8402e', '#f6c430', '#2e9a52', '#3b82ff']], theiere: ['leaf', ['#3fbf5a', '#7ee08a', '#c9ced8', '#ffd34d']], neptune: ['tess', NEP_PAL],
        chat: ['petal', ['#ffc4d6', '#ff9ec0', '#ffffff', '#ffd34d']], pinata: ['conf', PIN_COLS], lustre: ['shard', ['#7ef0ff', '#c79bff', '#ff9ad5', '#ffffff']] }[B.id];
      for (let i = 0; i < (lowFx ? 40 : 90); i++) {
        const a = rand(0, TAU), sp = rand(80, 380);
        addP({ k: kinds[0], x: x + rand(-30, 30), y: y + rand(-30, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: kinds[0] === 'petal' || kinds[0] === 'feather' ? 110 : 420, rot: rand(0, TAU), vr: rand(-10, 10),
          s: kinds[0] === 'tess' ? rand(2.5, 3.5) : rand(2.5, 5), col: pick(kinds[1]), life: rand(1.2, 2.2), max: 2.2, n: 3 });
      }
      sparks(x, y, 30, '#ffffff', 360);
      if (B.id === 'pinata') for (let i = 0; i < 14; i++) S.shots.push({ kind: 'candy', x: x + rand(-30, 30), y: y + rand(-20, 20), vx: rand(-160, 160), vy: rand(-260, -60), r: 7, rot: rand(0, TAU), vr: rand(-6, 6), reward: true, g: 380, col: pick(PIN_COLS) });
      if (B.id === 'chat') for (let i = 0; i < 8; i++) S.shots.push({ kind: 'coin', x: x + rand(-30, 30), y: y + rand(-20, 20), vx: rand(-150, 150), vy: rand(-240, -60), r: 7, rot: 0, vr: 0, reward: true, g: 380 });
      SFX.boom(); later(0.12, () => SFX.boom());
      // les carreaux qui restent volent en éclats, en vague
      const rest = S.tiles.filter((t) => t.alive).sort((a, b) => Math.hypot(a.x - x, a.y0 - y) - Math.hypot(b.x - x, b.y0 - y));
      rest.forEach((t, i) => later(0.15 + i * 0.035, () => { if (t.alive) { t.alive = false; if (!t.grp) S.grid[t.r * S.cols + t.c] = null; shatter(t, 5, 0, -100); gain(10, true); SFX.clack(); } }));
    }

    // ---------- projectiles des boss ----------
    function shotPop(sh) {
      sparks(sh.x, sh.y, 6, '#ffffff', 150);
      if (!sh.reward) { gain(25, true); pop(sh.x, sh.y - 8, '+25', '#ffffff', 10, 0.6); }
      SFX.tink();
    }
    function bossShoot(kind, x, y, vx, vy, extra) { S.shots.push(Object.assign({ kind, x, y, vx, vy, r: 8, rot: 0, vr: rand(-3, 3), g: 160, t: 0 }, extra || {})); SFX.shot(); }
    // les visées des boss suivent le hasard « à graine » (api.seed : mêmes attaques à graine égale)
    function br(a, b) { return crnd('boss', a, b); }
    function aimX(spread) { return clamp(S.paddle.x + br(-spread, spread), 30, W - 30); }
    function updateShots(dt) {
      const p = S.paddle;
      for (const s of S.shots) {
        s.t = (s.t || 0) + dt;
        s.vy += (s.g || 0) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += (s.vr || 0) * dt;
        if (s.x < WALL + s.r) { s.x = WALL + s.r; s.vx = Math.abs(s.vx) * 0.8; }
        if (s.x > W - WALL - s.r) { s.x = W - WALL - s.r; s.vx = -Math.abs(s.vx) * 0.8; }
        if (s.kind === 'yarn' && s.y > PY - 40 && s.vy > 0 && !s.bounced) { s.bounced = true; s.vy = -Math.abs(s.vy) * 0.45; }
        if (s.kind === 'petard' && Math.random() < dt * 20) addP({ k: 'spark', x: s.x, y: s.y - 8, vx: rand(-40, 40), vy: rand(-60, 0), g: 0, life: 0.25, max: 0.25, col: '#ffd34d', s: 1.4 });
        // la raquette
        if (s.y + s.r >= PY && s.y - s.r <= PY + PH + 4 && Math.abs(s.x - p.x) <= p.w / 2 + s.r) {
          s.dead = true;
          if (s.reward) { const v = gain(s.kind === 'coin' ? 80 : 30, true); pop(s.x, PY - 18, '+' + v, '#ffd34d', 11, 0.7); SFX.candy(); continue; }
          stunPaddle(s.x, s.kind);
          continue;
        }
        // la bille casse les projectiles
        if (!s.reward) for (const b of S.balls) if (!b.stuck && Math.hypot(b.x - s.x, b.y - s.y) < BR + s.r) { s.dead = true; shotPop(s); break; }
        if (s.y > H + 30) s.dead = true;
      }
      S.shots = S.shots.filter((s) => !s.dead);
      // rayons (tombée de thé, rayon de lumière, coup de patte, éclair)
      for (const bm of S.beams) {
        bm.t += dt;
        if (bm.kind === 'sweep') bm.x = clamp(bm.x + bm.vx * dt, 30, W - 30);
        if (bm.t >= bm.warn && !bm.fired) { bm.fired = true; doShake(3); if (bm.kind === 'lightning') { S.flash = 0.25; S.flashCol = '#c9f6ff'; } SFX.boom(); }
        if (bm.fired && bm.t < bm.warn + bm.act && Math.abs(p.x - bm.x) < bm.w / 2 + p.w / 2 - 6 && p.stun <= 0) stunPaddle(p.x, bm.kind);
        if (bm.t > bm.warn + bm.act) bm.dead = true;
      }
      S.beams = S.beams.filter((b) => !b.dead);
    }
    function stunPaddle(x, kind) {
      const p = S.paddle;
      if (god) return;
      if (p.stun > 0.2) return;
      p.stun = 0.6;
      const word = { egg: 'PLOUF, UN ŒUF !', tea: 'OUPS, DU THÉ !', sugar: 'SUCRÉ !', trident: 'AÏE, LE TRIDENT !', lightning: 'ZAP !', yarn: 'EMMÊLÉ !', paw: 'COUP DE PATTE !', petard: 'PAF !', icicle: 'GLACÉ !', light: 'ÉBLOUI !', sweep: 'ÉBLOUI !' }[kind] || 'OUPS !';
      pop(clamp(x, 60, W - 60), PY - 30, word, '#ff9fd0', 13, 1.1, -24);
      SFX.stun(); doShake(3);
      for (let i = 0; i < 8; i++) addP({ k: 'star', x: p.x + rand(-p.w / 2, p.w / 2), y: PY - 4, vx: rand(-50, 50), vy: rand(-90, -30), g: 120, s: rand(2, 3), col: '#ffd34d', life: 0.7, max: 0.7, rot: 0 });
    }

    // ---------- mise à jour du boss ----------
    function bossAttack(name) {
      const B = S.boss, L = S.level, hard = 1 + S.tour * 0.3;
      const beam = (x, kind, w, warn, act, extra) => { S.beams.push(Object.assign({ x, kind, w, warn, act, t: 0 }, extra || {})); SFX.warn(); };
      switch (name) {
        case 'eggs': case 'eggs2': {
          const n = name === 'eggs2' ? 3 : 2;
          for (let i = 0; i < n; i++) later(i * 0.45, () => { if (S.boss && S.boss.alive) bossShoot('egg', B.x + 10 * B.dir, B.y + 40, (aimX(40) - B.x) * 0.25, 40, { r: 8, g: 260 * hard }); });
          B.anim.flap = 1; return 2.4 / hard;
        }
        case 'cocorico': {
          callout('COCORICO !', 'La bille accélère !', '#ffcf3a', 1.2, 36);
          ring(B.x, B.y - 40, 10, 220, 0.7, '#ffcf3a', 6); ring(B.x, B.y - 40, 10, 150, 0.5, '#ffffff', 4);
          S.eff.turbo = Math.max(S.eff.turbo, 3.5); doShake(5); SFX.phase();
          return 3.4 / hard;
        }
        case 'shield': {
          // le coq appelle des azulejos devant lui
          const row = 4, cols = [1, 3, 5, 7, 9].filter(() => cr('boss') < 0.8);
          for (const c of cols) if (!tileAt(c, row)) { const t = makeTile('n', (c + S.level) % 5, c, row, { born: S.introT, summoned: true }); t.key = t.wid + '|n|' + t.v + '|32x32'; S.tiles.push(t); S.grid[row * S.cols + c] = t; ring(t.x + 16, t.y0 + 16, 4, 22, 0.35, '#3b82ff', 3); }
          SFX.clack(); return 2.6;
        }
        case 'tea': case 'tea2': {
          const xs = name === 'tea2' ? [aimX(10), clamp(W - S.paddle.x + br(-30, 30), 40, W - 40)] : [aimX(20)];
          for (const x of xs) beam(x, 'tea', 34, 1.1 / Math.sqrt(hard), 0.7);
          B.anim.tilt = 1; B.pourX = xs[0];
          return 3.0 / hard;
        }
        case 'sugar': {
          for (let i = 0; i < 3; i++) later(i * 0.25, () => { if (S.boss && S.boss.alive) bossShoot('sugar', B.x - 40 * B.dir, B.y - 10, (aimX(80) - B.x) * 0.45 + br(-40, 40), -160, { r: 7, g: 420 }); });
          return 2.6 / hard;
        }
        case 'mint': {
          S.wind = (cr('boss') < 0.5 ? -1 : 1) * 210; B.windT = 2.6;
          callout('TEMPÊTE DE MENTHE !', 'Le vent pousse la bille', '#7ee08a', 1.2, 30);
          for (let i = 0; i < 20; i++) addP({ k: 'leaf', x: S.wind > 0 ? rand(10, 60) : rand(W - 60, W - 10), y: rand(120, 600), vx: S.wind * rand(0.8, 1.6), vy: rand(-20, 20), g: 0, rot: rand(0, TAU), vr: rand(-6, 6), s: rand(3, 5), col: pick(['#3fbf5a', '#7ee08a']), life: 2.4, max: 2.4 });
          return 3.6;
        }
        case 'trident': {
          const n = B.ph >= 2 ? 3 : 2;
          for (let i = 0; i < n; i++) later(i * 0.35, () => { if (S.boss && S.boss.alive) { const x = aimX(30 + i * 30); bossShoot('trident', x, B.y + 40, 0, 260 * hard, { r: 7, g: 120, vr: 0 }); } });
          return 2.5 / hard;
        }
        case 'dolphins': {
          if (B.dolphins.length < 2) for (const s of [-1, 1]) B.dolphins.push({ x: s < 0 ? -20 : W + 20, y: br(340, 460), vx: -s * br(70, 100), ph: br(0, 6), flip: 0 });
          callout('LES DAUPHINS !', 'Ils font rebondir la bille', '#5fd8ff', 1.1, 30);
          return 3.2;
        }
        case 'lightning': {
          beam(aimX(15), 'lightning', 30, 1.0 / Math.sqrt(hard), 0.5);
          return 2.2 / hard;
        }
        case 'yarn': {
          const n = B.ph >= 1 ? 2 : 1;
          for (let i = 0; i < n; i++) later(i * 0.4, () => { if (S.boss && S.boss.alive) bossShoot('yarn', B.x, B.y + 30, (aimX(60) - B.x) * 0.5, 30, { r: 10, g: 340, col: pick(['#ff7aa8', '#7ec8ff', '#ffd34d']) }); });
          return 2.4 / hard;
        }
        case 'paw': case 'paw2': {
          const xs = name === 'paw2' ? [aimX(10), aimX(90)] : [aimX(20)];
          for (const x of xs) beam(x, 'paw', 44, 1.0 / Math.sqrt(hard), 0.45);
          B.anim.wave = 1;
          return 2.8 / hard;
        }
        case 'teleport': {
          const nx = clamp(W - B.x + br(-40, 40), 90, W - 90);
          for (let i = 0; i < 16; i++) addP({ k: 'petal', x: B.x + rand(-40, 40), y: B.y + rand(-50, 50), vx: rand(-80, 80), vy: rand(-80, 40), g: 40, rot: rand(0, TAU), vr: rand(-5, 5), s: rand(3, 5), col: pick(['#ffc4d6', '#ff9ec0']), life: 1.3, max: 1.3 });
          B.x = nx; B.tx = nx; SFX.prism();
          return 2.2;
        }
        case 'candy': {
          // la piñata lâche quelques bonbons (à attraper !) et accélère
          for (let i = 0; i < 2; i++) S.shots.push({ kind: 'candy', x: B.x + rand(-20, 20), y: B.y + 30, vx: rand(-60, 60), vy: -40, r: 7, rot: rand(0, TAU), vr: rand(-6, 6), reward: true, g: 300, col: pick(PIN_COLS) });
          return 2.4;
        }
        case 'petards': {
          const n = B.ph >= 2 ? 3 : 2;
          for (let i = 0; i < n; i++) later(i * 0.3, () => { if (S.boss && S.boss.alive) bossShoot('petard', B.x, B.y + 20, (aimX(70) - B.x) * 0.55 + br(-50, 50), -120, { r: 7, g: 360 }); });
          return 2.4 / hard;
        }
        case 'icicles': {
          const n = B.ph >= 2 ? 3 : 2;
          for (let i = 0; i < n; i++) later(i * 0.3, () => { if (S.boss && S.boss.alive) { const x = clamp(B.x + br(-90, 90), 30, W - 30); bossShoot('icicle', x, B.y + 40, 0, 120, { r: 6, g: 420 * hard, vr: 0 }); } });
          return 2.3 / hard;
        }
        case 'rays': {
          beam(aimX(15), 'light', 34, 1.1 / Math.sqrt(hard), 0.5);
          if (B.ph >= 1 && cr('boss') < 0.5) beam(aimX(120), 'light', 34, 1.3, 0.5);
          return 2.8 / hard;
        }
        case 'sweep': {
          const from = S.paddle.x < W / 2 ? W - 40 : 40;
          beam(from, 'sweep', 30, 1.0, 2.2, { vx: (from < W / 2 ? 1 : -1) * 150 });
          return 3.6 / hard;
        }
        case 'regrow': {
          const dead = B.pends.filter((p) => !p.alive);
          if (dead.length) { const p = dead[(cr('boss') * dead.length) | 0]; p.alive = true; B.coreOpen = false; sparks(B.x + p.x, B.y + p.y + 10, 8, '#c9f6ff', 120); SFX.prism(); }
          return 1.6;
        }
      }
      return 2.5;
    }
    function updateBoss(dt) {
      const B = S.boss; if (!B) return;
      B.t += dt; B.st += dt;
      B.flash = Math.max(0, B.flash - dt * 5); B.wob = Math.max(0, B.wob - dt * 3); B.hitCd = Math.max(0, B.hitCd - dt);
      const an = B.anim;
      an.flap = Math.max(0, an.flap - dt * 1.5); an.tilt = Math.max(0, an.tilt - dt * 0.9); an.lid = B.id === 'theiere' ? (B.ph >= 2 ? 0.5 + Math.sin(B.t * 6) * 0.4 : B.flash * 0.6) : 0;
      if (B.windT > 0) { B.windT -= dt; if (B.windT <= 0) S.wind = 0; }
      if (B.state === 'enter') {
        B.y = lerp(-170, B.ty, easeOutBack(B.st / 1.6));
        if (B.st >= 1.6) { B.state = 'fight'; B.st = 0; }
        return;
      }
      if (B.state === 'phase') { B.x += Math.sin(B.t * 40) * 0.6; if (B.st > 1.4) { B.state = 'fight'; B.st = 0; } return; }
      if (B.state === 'dying') {
        B.x += Math.sin(B.t * 50) * 1.2;
        if (B.st > 1.0 && !B.exploded) { B.exploded = true; bossExplode(); }
        if (B.st > 3.0 && S.state === 'play') bossCleared();
        return;
      }
      // déplacements
      const ph = B.ph, sp = (1 + ph * 0.35) * (1 + S.tour * 0.2);
      switch (B.id) {
        case 'coq':
          if (ph < 2) { B.x += B.dir * 52 * sp * dt; if (B.x < 90) { B.x = 90; B.dir = 1; } if (B.x > W - 90) { B.x = W - 90; B.dir = -1; } B.y = B.baseY + Math.abs(Math.sin(B.t * 7)) * -3; an.walking = true; }
          else { const tx = W / 2 + Math.sin(B.t * 0.9) * 120, ty = B.baseY - 10 + Math.sin(B.t * 1.8) * 34; B.dir = tx > B.x ? 1 : -1; B.x += (tx - B.x) * Math.min(1, dt * 3); B.y += (ty - B.y) * Math.min(1, dt * 3); an.flap = 0.6 + Math.sin(B.t * 18) * 0.4; an.walking = false; }
          break;
        case 'theiere':
          B.x += B.dir * 44 * sp * dt; if (B.x < 100) { B.x = 100; B.dir = 1; } if (B.x > W - 100) { B.x = W - 100; B.dir = -1; }
          B.y = B.baseY + Math.sin(B.t * 2) * 5;
          break;
        case 'neptune':
          B.x = W / 2 + Math.sin(B.t * 0.55 * sp) * 82; B.y = B.baseY + Math.sin(B.t * 1.1) * 8; B.dir = Math.cos(B.t * 0.55 * sp) > 0 ? 1 : -1;
          for (const D of B.dolphins) { D.x += D.vx * dt; D.ph += dt * 3; D.y += Math.sin(D.ph) * 30 * dt; D.flip = Math.max(0, D.flip - dt * 3); if (D.x < 30 || D.x > W - 30) { D.vx = -D.vx; D.x = clamp(D.x, 30, W - 30); } }
          break;
        case 'chat':
          if (B.tx == null) B.tx = B.x;
          if (Math.abs(B.tx - B.x) < 2) { B.hopT = (B.hopT || 0) - dt; if (B.hopT <= 0) { B.tx = clamp(B.x + (cr('boss') < 0.5 ? -1 : 1) * br(60, 130), 90, W - 90); B.hopT = 1.6 / sp; } }
          { const d = B.tx - B.x, step = Math.sign(d) * Math.min(Math.abs(d), 110 * sp * dt); B.x += step; B.y = B.baseY - Math.abs(Math.sin(clamp(Math.abs(d) / 130, 0, 1) * Math.PI)) * 22; }
          an.wave = 0.5 + Math.sin(B.t * 5) * 0.5;
          break;
        case 'pinata':
          if (!B.free) { const w0 = 1.1 * sp, amp = 0.55 + ph * 0.15; B.swingA = Math.sin(B.t * w0) * amp; B.x = W / 2 + Math.sin(B.swingA) * 165; B.y = 30 + Math.cos(B.swingA) * 165; an.spin = Math.sin(B.t * 2) * 0.25; }
          else { B.vy += 260 * dt; B.x += B.vx * dt; B.y += B.vy * dt; an.spin += B.vx * dt * 0.02; if (B.x < 70) { B.x = 70; B.vx = Math.abs(B.vx); } if (B.x > W - 70) { B.x = W - 70; B.vx = -Math.abs(B.vx); } if (B.y > 360) { B.y = 360; B.vy = -Math.max(330, Math.abs(B.vy) * 0.95); SFX.wall(); doShake(2); } if (B.y < 110) { B.y = 110; B.vy = Math.abs(B.vy); } }
          break;
        case 'lustre':
          B.x = W / 2 + Math.sin(B.t * 0.7 * sp) * (30 + ph * 25); B.y = B.baseY + Math.sin(B.t * 1.4) * 4;
          for (const p of B.pends) if (!p.alive && ph < 2) p.regrow = Math.max(0, p.regrow - dt);
          break;
      }
      // attaques
      B.atkT -= dt;
      if (B.atkT <= 0 && S.state === 'play') {
        const list = B.P.atk[Math.min(2, ph)];
        const name = list[B.atkI % list.length]; B.atkI++;
        B.atkT = bossAttack(name);
      }
    }
    function bossCleared() {
      S.state = 'clear'; S.st = 0;
      const base = 300 + 150 * S.level;
      S.lastClear = { base, fast: 0, boss: 1200 + 150 * S.level, combo: S.bestCombo, time: S.levelT };
      S.score += base;
      S.caps = []; S.lasers = []; S.beams = [];
      ballsPoof();
      SFX.clear();
      celebrate(BOSS_CHEERS[(S.level + ((Math.random() * 3) | 0)) % BOSS_CHEERS.length]);
    }

    // ===================================================================== DESSIN
    function S0() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    // repère de l'aire de jeu (unités logiques), avec tremblement et zoom du ralenti
    function SF(noZoom) {
      const k = dpr * U;
      let ox = dpr * (FX + S.shx * U), oy = dpr * (FY + S.shy * U), z = noZoom ? 1 : 1 + S.zoom * 0.12;
      if (noZoom) { ox = dpr * FX; oy = dpr * FY; }
      if (z !== 1) { ox -= (z - 1) * S.zoomX * k; oy -= (z - 1) * S.zoomY * k; }
      ctx.setTransform(k * z, 0, 0, k * z, ox, oy);
    }
    function fitFont(text, size, maxW, font) {
      ctx.font = size + 'px ' + font;
      const w = ctx.measureText(text).width;
      if (w > maxW && w > 0) { size = Math.max(6, Math.floor(size * maxW / w)); ctx.font = size + 'px ' + font; }
      return size;
    }
    function bigText(text, x, y, size, col, maxW, alpha, stroke) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const s = fitFont(text, size, maxW || 1e4, FD);
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, s * 0.16); ctx.strokeStyle = stroke || 'rgba(14,8,30,0.92)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = col || '#ffffff'; ctx.fillText(text, x, y);
      ctx.restore();
    }
    function smallText(text, x, y, size, col, align, weight, alpha, maxW) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.font = (weight || 700) + ' ' + size + 'px ' + FB;
      if (maxW) { const w = ctx.measureText(text).width; if (w > maxW) ctx.font = (weight || 700) + ' ' + Math.max(7, Math.floor(size * maxW / w)) + 'px ' + FB; }
      ctx.fillStyle = col || '#fff'; ctx.fillText(text, x, y);
      ctx.restore();
    }

    // ---------- ambiance animée de chaque pays ----------
    function initAmbient() {
      S.ambient = [];
      const n = lowFx ? 10 : 22;
      for (let i = 0; i < n; i++) S.ambient.push(newAmb(true));
    }
    function newAmb(any) {
      const wid = S.wid;
      const a = { x: rand(-0.1, 1.1), y: any ? rand(0, 1) : -0.05, s: rand(0.6, 1.4), ph: rand(0, TAU), v: rand(0.6, 1.4) };
      if (wid === 'japon') a.k = 'petal';
      else if (wid === 'cristal') a.k = 'snow';
      else if (wid === 'mexique') a.k = 'spark';
      else if (wid === 'rome') { a.k = 'mote'; a.y = any ? rand(0.3, 1) : 1.05; }
      else if (wid === 'maroc') a.k = 'mote';
      else { a.k = 'gull'; a.y = rand(0.05, 0.35); }
      return a;
    }
    function updateAmbient(dt) {
      for (let i = 0; i < S.ambient.length; i++) {
        const a = S.ambient[i];
        a.ph += dt * a.v;
        switch (a.k) {
          case 'petal': a.y += dt * 0.05 * a.v; a.x += dt * (0.02 + Math.sin(a.ph) * 0.03); break;
          case 'snow': a.y += dt * 0.04 * a.v; a.x += dt * Math.sin(a.ph) * 0.015; break;
          case 'mote': a.y -= dt * 0.012 * a.v; a.x += dt * Math.sin(a.ph) * 0.01; break;
          case 'gull': a.x += dt * 0.03 * a.v; break;
          default: a.y += dt * 0.01;
        }
        if (a.y > 1.08 || a.y < -0.1 || a.x > 1.15 || a.x < -0.15) S.ambient[i] = newAmb(false);
        if (a.k === 'gull' && a.x > 1.12) { a.x = -0.1; a.y = rand(0.05, 0.35); }
      }
      // feux d'artifice du Mexique (dans le ciel)
      if (S.wid === 'mexique' && !lowFx) {
        S.fwT = (S.fwT || 0) - dt;
        if (S.fwT <= 0) { S.fwT = rand(0.9, 2.2); S.fws = S.fws || []; if (S.fws.length < 4) S.fws.push({ x: rand(0.05, 0.95), y: rand(0.06, 0.32), t: 0, col: pick(['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#b48cff', '#7dff9a']), n: 18 + ((Math.random() * 10) | 0) }); }
        if (S.fws) { for (const f of S.fws) f.t += dt; S.fws = S.fws.filter((f) => f.t < 1.6); }
      }
    }
    function drawSkyLive() {
      const t = S.clock, F = fieldPx;
      switch (S.wid) {
        case 'portugal': {
          // nuages qui passent
          for (let i = 0; i < 3; i++) {
            const x = ((hash(i * 3.3) * 1.4 + t * (0.006 + i * 0.002)) % 1.5 - 0.25) * cw, y = F.y + F.h * (0.08 + i * 0.07);
            cloudBlob(ctx, x, y, F.w * (0.22 + hash(i) * 0.12), '#ffffff', 0.55);
          }
          break;
        }
        case 'cristal': {
          // aurores boréales qui ondulent
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const cols = [[94, 255, 170], [126, 240, 255], [199, 155, 255]];
          for (let k = 0; k < 3; k++) {
            const c = cols[k], y0 = F.y + F.h * (0.12 + k * 0.07);
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) { const x = (i / 24) * cw, y = y0 + Math.sin(i * 0.5 + t * (0.4 + k * 0.15) + k) * F.h * 0.03 + Math.sin(i * 0.17 + t * 0.2) * F.h * 0.04; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
            for (let i = 24; i >= 0; i--) { const x = (i / 24) * cw, y = y0 + F.h * 0.11 + Math.sin(i * 0.5 + t * (0.4 + k * 0.15) + k + 0.8) * F.h * 0.025; ctx.lineTo(x, y); }
            ctx.closePath();
            ctx.fillStyle = lin(ctx, 0, y0 - F.h * 0.05, 0, y0 + F.h * 0.14, [[0, 'rgba(' + c + ',0)'], [0.4, 'rgba(' + c + ',' + (0.22 + 0.08 * Math.sin(t + k)) + ')'], [1, 'rgba(' + c + ',0)']]);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'mexique': {
          if (S.fws) for (const f of S.fws) {
            const k = f.t / 1.6, x = f.x * cw, y = F.y + f.y * F.h, r = easeOut(Math.min(1, f.t / 0.7)) * F.h * 0.09;
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = rgba(f.col, 0.9 * (1 - k));
            for (let i = 0; i < f.n; i++) { const a = (i / f.n) * TAU, rr2 = r * (0.85 + 0.15 * Math.sin(i * 3)); ctx.fillRect(x + Math.cos(a) * rr2 - 1.2, y + Math.sin(a) * rr2 + k * k * 18 - 1.2, 2.4, 2.4); }
            ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - k * 2)) + ')'; if (k < 0.5) { ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
            ctx.restore();
          }
          break;
        }
      }
    }
    function drawAmbientFront() {
      const t = S.clock, F = fieldPx;
      for (const a of S.ambient) {
        const x = a.x * cw, y = a.y * ch;
        switch (a.k) {
          case 'petal': ctx.save(); ctx.translate(x, y); ctx.rotate(a.ph); ctx.fillStyle = 'rgba(255,190,215,0.85)'; ell(ctx, 0, 0, 3.4 * a.s, 1.8 * a.s, 0); ctx.fill(); ctx.restore(); break;
          case 'snow': ctx.fillStyle = 'rgba(255,255,255,0.75)'; circ(ctx, x, y, 1.4 * a.s); ctx.fill(); break;
          case 'mote': ctx.fillStyle = S.wid === 'rome' ? 'rgba(255,255,255,0.18)' : 'rgba(255,230,170,0.5)'; circ(ctx, x, y, (S.wid === 'rome' ? 9 : 1.2) * a.s); ctx.fill(); break;
          case 'gull': {
            const yy = F.y + a.y * F.h, w = 7 * a.s * Math.max(0.7, U), fl = Math.sin(a.ph * 8) * 0.5;
            ctx.strokeStyle = 'rgba(40,50,70,0.7)'; ctx.lineWidth = 1.4; ctx.beginPath();
            ctx.moveTo(x - w, yy - w * (0.3 + fl * 0.4)); ctx.quadraticCurveTo(x - w * 0.4, yy - w * 0.5, x, yy); ctx.quadraticCurveTo(x + w * 0.4, yy - w * 0.5, x + w, yy - w * (0.3 + fl * 0.4)); ctx.stroke();
            break;
          }
          case 'spark': { const tw = 0.5 + 0.5 * Math.sin(t * 3 + a.ph * 5); ctx.fillStyle = 'rgba(255,240,180,' + (0.25 + tw * 0.5) + ')'; circ(ctx, x, y * 0.6, 1.2 * a.s); ctx.fill(); break; }
        }
      }
      // décorations accrochées en haut (lanternes, guirlandes) : sur tous les écrans
      if (S.wid === 'maroc') { lantern(F.x + F.w * 0.06, F.y + F.h * 0.07, t, '#ffb84a'); lantern(F.x + F.w * 0.94, F.y + F.h * 0.07, t + 1.3, '#4fe3c4'); }
      if (S.wid === 'japon') { chochin(F.x + F.w * 0.07, F.y + F.h * 0.075, t); chochin(F.x + F.w * 0.93, F.y + F.h * 0.075, t + 1.7); }
      if (S.wid === 'mexique') papelPicado(t);
    }
    function lantern(x, y, t, glow) {
      const s = Math.max(0.7, U), sw = Math.sin(t * 1.3) * 0.06;
      ctx.save(); ctx.translate(x, y - 40 * s); ctx.rotate(sw);
      ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(0, -60 * s); ctx.lineTo(0, 30 * s); ctx.stroke();
      ctx.translate(0, 40 * s);
      ctx.fillStyle = rad(ctx, 0, 6 * s, 0, 0, 6 * s, 40 * s, [[0, rgba(glow, 0.55 + 0.1 * Math.sin(t * 7))], [1, rgba(glow, 0)]]); circ(ctx, 0, 6 * s, 40 * s); ctx.fill();
      ctx.fillStyle = '#c9973b'; poly(ctx, [-9 * s, -4 * s, 9 * s, -4 * s, 4 * s, -14 * s, -4 * s, -14 * s]); ctx.fill();
      ctx.fillStyle = rgba(glow, 0.9); poly(ctx, [-11 * s, -4 * s, 11 * s, -4 * s, 8 * s, 16 * s, -8 * s, 16 * s]); ctx.fill();
      ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 1.2 * s; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -4 * s); ctx.lineTo(0, 16 * s); ctx.moveTo(-10 * s, 6 * s); ctx.lineTo(10 * s, 6 * s); ctx.stroke();
      ctx.fillStyle = '#c9973b'; poly(ctx, [-8 * s, 16 * s, 8 * s, 16 * s, 0, 24 * s]); ctx.fill();
      ctx.restore();
    }
    function chochin(x, y, t) {
      const s = Math.max(0.7, U), sw = Math.sin(t * 1.1) * 0.07;
      ctx.save(); ctx.translate(x, y - 34 * s); ctx.rotate(sw);
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(0, -60 * s); ctx.lineTo(0, 22 * s); ctx.stroke();
      ctx.translate(0, 34 * s);
      ctx.fillStyle = rad(ctx, 0, 0, 0, 0, 0, 38 * s, [[0, 'rgba(255,120,90,' + (0.45 + 0.1 * Math.sin(t * 6)) + ')'], [1, 'rgba(255,120,90,0)']]); circ(ctx, 0, 0, 38 * s); ctx.fill();
      ell(ctx, 0, 0, 13 * s, 17 * s, 0); ctx.fillStyle = lin(ctx, -13 * s, 0, 13 * s, 0, [[0, '#c8281e'], [0.5, '#ff5a3d'], [1, '#b81e16']]); ctx.fill();
      ctx.strokeStyle = 'rgba(80,10,0,0.5)'; ctx.lineWidth = 0.8 * s;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, i * 6 * s, 13 * s * Math.cos(i * 0.32), 1.5 * s, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#1c1414'; ctx.fillRect(-7 * s, -19 * s, 14 * s, 4 * s); ctx.fillRect(-7 * s, 15 * s, 14 * s, 4 * s);
      ctx.fillStyle = '#ffe9c0'; ctx.font = '700 ' + Math.round(9 * s) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('祭', 0, 1);
      ctx.restore();
    }
    const flagCache = new Map();
    function flagSprite(col, w, h) {
      const key = col + '|' + Math.round(w * dpr) + '|' + Math.round(h * dpr);
      let c = flagCache.get(key);
      if (c) return c;
      c = mkCanvas(w * dpr + 2, h * dpr + 2);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 1, 1);
      g.fillStyle = rgba(col, 0.94);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.85);
      for (let k = 4; k >= 0; k--) g.lineTo((k / 4) * w, h * (k % 2 ? 0.85 : 1));
      g.closePath(); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000'; circ(g, w / 2, h * 0.42, w * 0.16); g.fill();
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + sx * w * 0.32, h * 0.18); g.lineTo(w / 2 + sx * w * 0.22, h * 0.3); g.lineTo(w / 2 + sx * w * 0.36, h * 0.3); g.closePath(); g.fill(); }
      for (let k = 0; k < 3; k++) { circ(g, w * (0.25 + k * 0.25), h * 0.66, w * 0.05); g.fill(); }
      if (flagCache.size > 40) flagCache.clear();
      flagCache.set(key, c);
      return c;
    }
    function papelPicado(t) {
      const F = fieldPx, cols = ['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6', '#4cd66a'];
      const y0 = F.y + F.h * 0.012, n = Math.ceil(cw / (26 * Math.max(0.8, U))) + 1, step = cw / (n - 1);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 0; i < n; i++) { const x = i * step, y = y0 + Math.sin((i / (n - 1)) * Math.PI) * 10; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      for (let i = 0; i < n - 1; i++) {
        const x = i * step + step * 0.1, y = y0 + Math.sin(((i + 0.5) / (n - 1)) * Math.PI) * 10, w = step * 0.8, h = step * 0.9, sw = Math.sin(t * 2.4 + i) * 0.08;
        ctx.save(); ctx.translate(x + w / 2, y); ctx.rotate(sw);
        ctx.drawImage(flagSprite(cols[i % cols.length], w, h), -w / 2 - 1 / dpr, -1 / dpr, w + 2 / dpr, h + 2 / dpr);
        ctx.restore();
      }
      ctx.restore();
    }
    // ---------- le décor (calques peints + ambiance) ----------
    function drawBackground() {
      S0();
      if (!scene || scene.wi !== S.wi) { scene = sceneFor(S.wi); scene.wi = S.wi; initAmbient(); }
      ctx.drawImage(scene.back, 0, 0, cw, ch);
      drawSkyLive();
      ctx.drawImage(scene.front, 0, 0, cw, ch);
      drawAmbientFront();
    }
    // voile sur l'aire de jeu, murs et plafond aux couleurs du pays
    function drawFieldFrame() {
      SF();
      const Wd = CARREAUX_WORLDS[S.wi], C = Wd.colors;
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, rgba(C.dark, 0.72)], [0.07, rgba(C.dark, 0.46)], [0.45, rgba(C.dark, 0.26)], [0.82, rgba(C.dark, 0.14)], [1, rgba(C.dark, 0.05)]]);
      ctx.fillRect(0, 0, W, H);
      // murs
      for (const x0 of [0, W - WALL]) {
        ctx.fillStyle = lin(ctx, x0, 0, x0 + WALL, 0, [[0, shade(C.accent, -0.55)], [0.5, shade(C.accent, -0.15)], [1, shade(C.accent, -0.6)]]);
        ctx.fillRect(x0, HUD_H - 2, WALL, H - HUD_H + 2);
        ctx.fillStyle = rgba(C.accent2, 0.85);
        for (let y = HUD_H + 16; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(x0 + WALL / 2, y - 5); ctx.lineTo(x0 + WALL - 2, y); ctx.lineTo(x0 + WALL / 2, y + 5); ctx.lineTo(x0 + 2, y); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x0 + (x0 ? 1 : WALL - 2), HUD_H, 1, H - HUD_H);
        // pied du mur : un socle posé sur la promenade (la bande du pouce est dessous, hors de l'aire de jeu)
        const bx = x0 - 3, bw = WALL + 6, by = H - 7;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(ctx, x0 + WALL / 2, H + 4, WALL + 5, 3.2, 0); ctx.fill();
        rr(ctx, bx, by, bw, 10, 2.5); ctx.fillStyle = lin(ctx, 0, by, 0, by + 10, [[0, shade(C.accent, -0.05)], [1, shade(C.accent, -0.62)]]); ctx.fill();
        ctx.fillStyle = rgba(C.accent2, 0.95); ctx.fillRect(bx + 1, by, bw - 2, 1.6);
      }
      // plafond : frise
      ctx.fillStyle = lin(ctx, 0, HUD_H - 6, 0, HUD_H + 2, [[0, shade(C.accent, -0.5)], [1, shade(C.accent, -0.2)]]);
      ctx.fillRect(0, HUD_H - 5, W, 6);
      ctx.fillStyle = rgba(C.accent2, 0.9);
      for (let x = 8; x < W; x += 16) { circ(ctx, x, HUD_H - 2, 1.6); ctx.fill(); }
      // ligne de danger (le carrelage descend)
      if (S.descent > 0 && !S.isBoss) {
        const a = 0.25 + S.danger * 0.6 + (S.danger > 0.4 ? Math.sin(S.clock * 12) * 0.2 : 0);
        ctx.strokeStyle = 'rgba(255,77,94,' + a + ')'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -S.clock * 20;
        ctx.beginPath(); ctx.moveTo(WALL, DANGER_Y); ctx.lineTo(W - WALL, DANGER_Y); ctx.stroke(); ctx.setLineDash([]);
        if (S.danger > 0.3) smallText('⚠ LE CARRELAGE DESCEND', W / 2, DANGER_Y + 12, 10, 'rgba(255,140,150,' + Math.min(1, a + 0.2) + ')', 'center', 700);
      }
      // filet de sécurité
      if (S.eff.net > 0) {
        const a = S.eff.net < 2 ? 0.4 + 0.4 * Math.sin(S.clock * 20) : 0.85;
        ctx.strokeStyle = 'rgba(255,211,77,' + a + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(WALL, PY + 28); for (let x = WALL; x <= W - WALL; x += 12) ctx.lineTo(x, PY + 28 + Math.sin(x * 0.3 + S.clock * 6) * 1.5); ctx.stroke();
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,211,77,' + a * 0.5 + ')';
        for (let x = WALL; x <= W - WALL; x += 12) { ctx.beginPath(); ctx.moveTo(x, PY + 22); ctx.lineTo(x + 6, PY + 34); ctx.moveTo(x + 6, PY + 22); ctx.lineTo(x, PY + 34); ctx.stroke(); }
      }
    }

    // ---------- carreaux ----------
    function tileY(t) { return t.grp ? t.y : t.y0 + S.off; }
    function drawTile(t) {
      const sp = tileSprite(t), age = S.introT - t.born;
      if (age < 0) return;
      let x = t.x, y = tileY(t), sc = 1, a = 1;
      if (age < 0.45) { const k = age / 0.45; y -= (1 - easeOutBack(k)) * 50; sc = 0.6 + 0.4 * easeOutBack(k); a = Math.min(1, k * 2.5); }
      if (t.wob > 0) sc *= 1 + Math.sin(t.wob * 18) * 0.06 * t.wob;
      const cxp = x + t.w / 2, cyp = y + t.h / 2;
      if (sc !== 1 || a !== 1 || t.ang) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cxp, cyp); if (t.ang) ctx.rotate(t.ang); ctx.scale(sc, sc);
        ctx.drawImage(sp, -t.w / 2 - PAD, -t.h / 2 - PAD, t.w + PAD * 2, t.h + PAD * 2);
        if (t.kind === 'p') drawPortraitHead(t, -t.w / 2, -t.h / 2);
        if (t.flash > 0) { ctx.globalAlpha = a * t.flash * 0.55; ctx.fillStyle = '#ffffff'; ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h); }
        if (t.cracks) drawCracks(t, -t.w / 2, -t.h / 2);
        ctx.restore();
      } else {
        ctx.drawImage(sp, x - PAD, y - PAD, t.w + PAD * 2, t.h + PAD * 2);
        if (t.kind === 'p') drawPortraitHead(t, x, y);
        if (t.flash > 0) { ctx.globalAlpha = t.flash * 0.55; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, t.w, t.h); ctx.globalAlpha = 1; }
        if (t.cracks) drawCracks(t, x, y);
      }
      if (t.power && !t.gift && t.kind !== 'p' && (S.clock + t.seed) % 3.2 < 0.35) {
        const k = ((S.clock + t.seed) % 3.2) / 0.35;
        ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8; ctx.fillStyle = '#ffffff';
        star(ctx, x + t.w * (0.2 + k * 0.6), y + t.h * 0.3, 4, t.w * 0.18, t.w * 0.04, 0); ctx.fill(); ctx.restore();
      }
    }
    // un reflet diagonal passe sur les carreaux vernis (toutes les ~7 s)
    function drawSweep() {
      if (lowFx || S.wid === 'rome') return;
      const per = 7, ph = (S.clock % per) / 1.1;
      if (ph > 1) return;
      const cx = lerp(-120, W + 120, ph), wB = 26;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const t of S.tiles) {
        if (!t.alive || t.kind === 'p' || t.kind === 'm') continue;
        const ty = tileY(t);
        if (!(ty > -1e5 && t.x > -1e5)) continue;
        const d = (t.x + t.w / 2) + (ty + t.h / 2) * 0.6 - cx;
        if (Math.abs(d) > wB + t.w) continue;
        ctx.save(); ctx.beginPath(); ctx.rect(t.x, ty, t.w, t.h); ctx.clip();
        const g = ctx.createLinearGradient(cx - wB - ty * 0.6, 0, cx + wB - ty * 0.6, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.38)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(t.x, ty, t.w, t.h);
        ctx.restore();
      }
      ctx.restore();
    }
    function drawPortraitHead(t, x, y) {
      const img = t.head && t.head.img;
      if (!imgOk(img)) return;
      const bob = Math.sin(S.clock * 2 + t.id) * 1.2;
      drawHeadImg(ctx, img, x + t.w / 2, y + t.h / 2 + 1 + bob, t.h * 0.78);
      ctx.save(); ctx.font = '700 ' + Math.round(t.w * 0.16) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const nm = t.name, tw = Math.min(t.w - 6, ctx.measureText(nm).width + 8);
      ctx.fillStyle = 'rgba(20,14,40,0.75)'; rr(ctx, x + t.w / 2 - tw / 2, y + t.h - t.h * 0.2, tw, t.h * 0.17, 4); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.fillText(nm, x + t.w / 2, y + t.h - t.h * 0.115, t.w - 8);
      ctx.restore();
    }
    function drawCracks(t, x, y) {
      const L = crackLines(t.seed + 1, Math.min(3, t.cracks));
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const pass of [['rgba(255,255,255,0.75)', 1.6, 0.6], ['rgba(20,20,30,0.75)', 0.9, 0]]) {
        ctx.strokeStyle = pass[0]; ctx.lineWidth = pass[1];
        for (const pl of L) { ctx.beginPath(); pl.forEach((p, i) => { const px = x + p[0] * t.w + pass[2] * 0.5, py = y + p[1] * t.h + pass[2] * 0.5; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.stroke(); }
      }
      ctx.restore();
    }
    function drawTiles() {
      // clip : tout ce qui sort de l'aire (trams) est caché
      ctx.save(); ctx.beginPath(); ctx.rect(WALL, HUD_H, W - 2 * WALL, H - HUD_H); ctx.clip();
      for (const t of S.tiles) if (t.alive) drawTile(t);
      drawSweep();
      // portes coulissantes (shoji)
      for (const J of S.shoji) for (const R of shojiRects(J)) drawShoji(R);
      ctx.restore();
    }
    function drawShoji(R) {
      const x = R[0], y = R[1], w = R[2] - R[0], h = R[3] - R[1];
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 1.5, y + 2.5, w, h);
      ctx.fillStyle = '#5a3622'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, '#fff8e8'], [1, '#efe2c4']]); ctx.fillRect(x + 2.5, y + 2.5, w - 5, h - 5);
      ctx.strokeStyle = '#5a3622'; ctx.lineWidth = 1.4;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + (w * i) / 4, y + 2); ctx.lineTo(x + (w * i) / 4, y + h - 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x + 2, y + h / 2); ctx.lineTo(x + w - 2, y + h / 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,170,190,0.55)'; circ(ctx, x + w * 0.62, y + h * 0.3, 2.2); ctx.fill();
    }
    function drawVents() {
      for (const V of S.vents) {
        // bouche de vapeur au sol (grille de bronze)
        ctx.fillStyle = '#6b5a3a'; rr(ctx, V.x - 18, PY + 20, 36, 6, 3); ctx.fill();
        ctx.fillStyle = '#c9a24a'; for (let i = -2; i <= 2; i++) ctx.fillRect(V.x + i * 6 - 1, PY + 21, 2, 4);
        if (V.warn || V.blast) {
          const a = V.blast ? 0.32 : 0.12 + 0.08 * Math.sin(S.clock * 20);
          ctx.fillStyle = lin(ctx, 0, S.gy + S.off + 40, 0, PY, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,' + a + ')']]);
          ctx.fillRect(V.x - 26, S.gy + S.off + 40, 52, PY - S.gy - S.off - 40);
          if (V.warn) bigText('♨', V.x, PY - 18, 16, '#ffffff', 40, 0.6 + 0.4 * Math.sin(S.clock * 14));
        }
      }
    }

    // ---------- raquette, billes, tirs, capsules ----------
    function drawPaddle() {
      const p = S.paddle, wid = S.wid, w = p.w, h = PH, x = p.x - w / 2, y = PY;
      const sq = p.squash * 0.18, sy = 1 - sq, sx = 1 + sq * 0.5;
      ctx.save(); ctx.translate(p.x, y + h); ctx.scale(sx, sy); ctx.translate(-p.x, -(y + h));
      // ombre au sol
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(ctx, p.x, PY + h + 10, w * 0.5, 4, 0); ctx.fill();
      // halo (aimant, laser)
      if (S.eff.magnet > 0) { ctx.fillStyle = rad(ctx, p.x, y, 0, p.x, y, w * 0.6, [[0, 'rgba(176,124,255,0.4)'], [1, 'rgba(176,124,255,0)']]); ell(ctx, p.x, y, w * 0.6, 22, 0); ctx.fill(); }
      const stun = p.stun > 0;
      const P = {
        portugal: ['#ffffff', '#dfe8f5', '#1d4fb8', '#f0b431'], maroc: ['#f0c66a', '#9a6a24', '#17b5ad', '#ffe08a'], rome: ['#fffaf0', '#cfc4b2', '#c9a24a', '#e9c457'],
        japon: ['#ff6a4f', '#a8281a', '#1c1414', '#e6b84a'], mexique: ['#ff4fa8', '#c2186e', '#ffd23f', '#20b8c4'], cristal: ['#e8fbff', '#7fc8f0', '#c79bff', '#ffffff']
      }[wid] || ['#ffffff', '#cccccc', '#3b82ff', '#ffd34d'];
      rr(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = stun ? lin(ctx, 0, y, 0, y + h, [[0, '#9aa2b0'], [1, '#5a6270']]) : lin(ctx, 0, y, 0, y + h, [[0, P[0]], [1, P[1]]]);
      ctx.fill();
      ctx.save(); rr(ctx, x, y, w, h, h / 2); ctx.clip();
      if (!stun) {
        if (wid === 'portugal') { ctx.fillStyle = P[2]; for (let i = x + 8; i < x + w - 6; i += 9) { ctx.beginPath(); ctx.moveTo(i, y + h / 2); ctx.lineTo(i + 3, y + 3); ctx.lineTo(i + 6, y + h / 2); ctx.lineTo(i + 3, y + h - 3); ctx.closePath(); ctx.fill(); } }
        else if (wid === 'maroc') { for (let i = x + 10; i < x + w - 8; i += 12) { star(ctx, i, y + h / 2, 8, 4.4, 3, 0); ctx.fillStyle = P[2]; ctx.fill(); } }
        else if (wid === 'rome') { ctx.fillStyle = P[2]; ctx.fillRect(x, y + h * 0.4, w, h * 0.2); ctx.fillStyle = '#6e8e48'; for (let i = x + 8; i < x + w - 6; i += 7) { ell(ctx, i, y + h / 2, 2.6, 1.2, (i % 14) ? 0.6 : -0.6); ctx.fill(); } }
        else if (wid === 'japon') { ctx.fillStyle = P[3]; ctx.fillRect(x, y + 2, w, 2); ctx.fillRect(x, y + h - 4, w, 2); ctx.fillStyle = P[2]; ctx.fillRect(x, y, 10, h); ctx.fillRect(x + w - 10, y, 10, h); }
        else if (wid === 'mexique') { const cc = ['#ff4fa8', '#ffd23f', '#20b8c4', '#ff8a3d', '#8b5cf6']; for (let i = 0; i < w; i += 6) { ctx.fillStyle = cc[((i / 6) | 0) % cc.length]; ctx.fillRect(x + i, y, 6, h); } ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y + h * 0.45, w, 1.5); }
        else if (wid === 'cristal') { ctx.fillStyle = 'rgba(199,155,255,0.35)'; for (let i = x; i < x + w; i += 14) { ctx.beginPath(); ctx.moveTo(i, y + h); ctx.lineTo(i + 7, y); ctx.lineTo(i + 10, y); ctx.lineTo(i + 3, y + h); ctx.closePath(); ctx.fill(); } }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(ctx, x + 6, y + 1.5, w - 12, h * 0.28, h * 0.14); ctx.fill();
      ctx.restore();
      // embouts brillants
      for (const s of [-1, 1]) {
        const ex = p.x + s * (w / 2 - 6);
        ctx.fillStyle = stun ? '#7a828e' : lin(ctx, ex - 6, y, ex + 6, y + h, [[0, '#ffffff'], [0.5, P[3]], [1, shade(P[3], -0.4)]]);
        circ(ctx, ex, y + h / 2, h / 2 + 0.5); ctx.fill();
        if (S.eff.laser > 0) { ctx.fillStyle = '#ff4d6d'; rr(ctx, ex - 2.5, y - 6, 5, 8, 2); ctx.fill(); ctx.fillStyle = '#ffd0d8'; ctx.fillRect(ex - 1, y - 6, 2, 3); }
      }
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(10,10,20,0.6)'; rr(ctx, x, y, w, h, h / 2); ctx.stroke();
      if (p.flash > 0) { ctx.globalAlpha = p.flash * 0.6; ctx.fillStyle = '#ffffff'; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
      if (stun) { for (let i = 0; i < 3; i++) { const a = S.clock * 5 + i * 2.1; ctx.fillStyle = '#ffd34d'; star(ctx, p.x + Math.cos(a) * w * 0.3, PY - 10 + Math.sin(a) * 4, 5, 4, 1.6, a); ctx.fill(); } }
    }
    function drawBalls() {
      const fire = S.eff.fire > 0, acc = CARREAUX_WORLDS[S.wi].colors.accent;
      for (const b of S.balls) {
        // traînée
        const tr = b.trail, n = tr.length / 2;
        for (let i = 0; i < n; i++) {
          const k = (i + 1) / n;
          ctx.fillStyle = fire ? 'rgba(255,' + Math.round(120 + 100 * k) + ',40,' + (k * 0.5) + ')' : rgba(acc, k * 0.32);
          circ(ctx, tr[i * 2], tr[i * 2 + 1], BR * (0.35 + 0.6 * k)); ctx.fill();
        }
        if (fire && Math.random() < (lowFx ? 0.25 : 0.6)) addP({ k: 'spark', x: b.x + rand(-3, 3), y: b.y + rand(-3, 3), vx: rand(-40, 40), vy: rand(-60, 10), g: 0, life: 0.3, max: 0.3, col: pick(['#ffd34d', '#ff8a1f', '#ff4d2d']), s: 2 });
        const sq = b.sq * 0.22, a = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a); ctx.scale(1 + sq, 1 - sq);
        ctx.fillStyle = rad(ctx, 0, 0, 0, 0, 0, BR * 2.6, [[0, fire ? 'rgba(255,170,60,0.55)' : 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); circ(ctx, 0, 0, BR * 2.6); ctx.fill();
        ctx.rotate(-a);
        ctx.fillStyle = fire ? rad(ctx, -BR * 0.35, -BR * 0.4, 0, 0, 0, BR, [[0, '#fffbe0'], [0.5, '#ffb03a'], [1, '#e8401e']]) : rad(ctx, -BR * 0.35, -BR * 0.4, 0, 0, 0, BR, [[0, '#ffffff'], [0.55, mix(acc, '#ffffff', 0.55)], [1, shade(acc, -0.25)]]);
        circ(ctx, 0, 0, BR); ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(10,10,30,0.7)'; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; circ(ctx, -BR * 0.35, -BR * 0.38, BR * 0.28); ctx.fill();
        ctx.restore();
      }
      // flèche de visée quand la bille attend sur la raquette
      const b0 = S.balls.find((b) => b.stuck);
      if (b0 && S.state === 'play') {
        const p = S.paddle, off = clamp(b0.off / (p.w / 2), -1, 1);
        let ang = off * 52 * DEG; if (Math.abs(ang) < 14 * DEG) ang = (off < 0 ? -1 : 1) * 18 * DEG;
        ctx.save(); ctx.translate(b0.x, b0.y); ctx.rotate(ang);
        ctx.setLineDash([4, 5]); ctx.lineDashOffset = -S.clock * 30; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -BR - 4); ctx.lineTo(0, -60); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; poly(ctx, [-5, -58, 5, -58, 0, -68]); ctx.fill();
        ctx.restore();
      }
    }
    function drawLasers() {
      for (const L of S.lasers) {
        ctx.fillStyle = 'rgba(255,77,109,0.35)'; rr(ctx, L.x - 3, L.y - 8, 6, 22, 3); ctx.fill();
        ctx.fillStyle = '#ffe0e8'; rr(ctx, L.x - 1.2, L.y - 6, 2.4, 16, 1.2); ctx.fill();
      }
      for (const R of S.rockets) {
        ctx.save(); ctx.translate(R.x, R.y); ctx.rotate(Math.atan2(R.vy, R.vx) + Math.PI / 2);
        ctx.fillStyle = '#ffffff'; rr(ctx, -3, -8, 6, 14, 2); ctx.fill(); ctx.fillStyle = '#ffd23f'; poly(ctx, [-3.5, -8, 3.5, -8, 0, -13]); ctx.fill();
        ctx.fillStyle = '#ff4fa8'; ctx.fillRect(-3, -2, 6, 2);
        ctx.restore();
      }
    }
    function drawCaps() {
      for (const c of S.caps) {
        ctx.save(); ctx.translate(c.x, c.y + Math.sin(c.t * 6) * 1.5); ctx.rotate(Math.sin(c.t * 3) * 0.12);
        const P = POWERS[c.key];
        ctx.fillStyle = rad(ctx, 0, 0, 0, 0, 0, 26, [[0, rgba(P.color, 0.45)], [1, rgba(P.color, 0)]]); circ(ctx, 0, 0, 26); ctx.fill();
        paintCapsule(ctx, c.key, 15);
        ctx.restore();
      }
    }

    // ---------- boss ----------
    function drawBossLayer() {
      const B = S.boss; if (!B) return;
      // rayons (annonce puis coup)
      for (const bm of S.beams) {
        const warn = bm.t < bm.warn, k = warn ? bm.t / bm.warn : 1;
        if (warn) {
          ctx.fillStyle = 'rgba(255,77,94,' + (0.08 + 0.12 * k) + ')'; ctx.fillRect(bm.x - bm.w / 2, B.y + 30, bm.w, PY + PH - B.y - 30);
          ctx.strokeStyle = 'rgba(255,90,110,' + (0.5 + 0.4 * Math.sin(S.clock * 24)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -S.clock * 40;
          ctx.strokeRect(bm.x - bm.w / 2, B.y + 30, bm.w, PY + PH - B.y - 30); ctx.setLineDash([]);
          bigText('!', bm.x, PY - 24, 18, '#ff6a7a', 30, 0.6 + 0.4 * Math.sin(S.clock * 20));
        } else {
          const a = 1 - (bm.t - bm.warn) / bm.act;
          const col = { tea: ['#c98a3a', '#ffe0a0'], light: ['#7ef0ff', '#ffffff'], sweep: ['#c79bff', '#ffffff'], paw: ['#ffffff', '#ff9fb8'], lightning: ['#c9f6ff', '#ffffff'] }[bm.kind] || ['#ffffff', '#ffffff'];
          ctx.save(); ctx.globalAlpha = clamp(a * 1.6, 0, 1);
          if (bm.kind === 'paw') {
            const py = lerp(B.y + 40, PY - 8, easeOut(clamp((bm.t - bm.warn) / 0.15, 0, 1)));
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(bm.x - bm.w / 2, B.y + 30, bm.w, py - B.y - 30);
            ctx.fillStyle = '#ffffff'; ell(ctx, bm.x, py, bm.w * 0.5, bm.w * 0.42, 0); ctx.fill(); ctx.strokeStyle = OUTL; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#ff9fb8'; ell(ctx, bm.x, py + 4, 7, 5, 0); ctx.fill(); for (const s of [-1, 0, 1]) { circ(ctx, bm.x + s * 9, py - 8, 3.4); ctx.fill(); }
          } else if (bm.kind === 'lightning') {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); let yy = B.y + 30; ctx.moveTo(bm.x, yy);
            while (yy < PY + 10) { yy += 26; ctx.lineTo(bm.x + rand(-14, 14), yy); } ctx.stroke();
            ctx.strokeStyle = 'rgba(126,240,255,0.6)'; ctx.lineWidth = 10; ctx.stroke();
          } else {
            ctx.fillStyle = lin(ctx, bm.x - bm.w / 2, 0, bm.x + bm.w / 2, 0, [[0, rgba(col[0], 0)], [0.3, rgba(col[0], 0.75)], [0.5, rgba(col[1], 0.95)], [0.7, rgba(col[0], 0.75)], [1, rgba(col[0], 0)]]);
            ctx.fillRect(bm.x - bm.w / 2, B.y + 30, bm.w, PY + PH + 6 - B.y - 30);
          }
          ctx.restore();
        }
      }
      // le boss
      const st = { t: B.t, ph: B.ph, flash: B.flash, head: B.head ? B.head.img : null, headSad: B.headSad, sad: !B.alive, dir: B.dir, walking: B.anim.walking, flap: B.anim.flap, lid: B.anim.lid, tilt: B.anim.tilt, wave: B.anim.wave, spin: B.anim.spin, tiles: B.tiles, cracks: B.cracks, noRope: B.free,
        body: B.id === 'pinata' ? bossSprite(B, 'body', PIN_R, (g) => paintPinataBody(g, 0)) : null,
        mosaic: B.id === 'neptune' ? bossSprite(B, 'mosaic', NEP_R, (g) => paintNeptuneMosaic(g, B.tiles || [])) : null };
      if (B.exploded) return;
      ctx.save();
      ctx.translate(B.x, B.y);
      const wob = B.wob > 0 ? 1 + Math.sin(B.wob * 20) * 0.04 * B.wob : 1;
      ctx.scale(wob, 2 - wob);
      // ombre
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, 0, 90, 60, 10, 0); ctx.fill();
      // en colère (phase 3) : une aura qui pulse derrière le boss
      if (B.ph >= 2 && B.alive) {
        const pu = 0.5 + 0.5 * Math.sin(S.clock * 7), ac = CARREAUX_WORLDS[S.wi].colors.accent2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rad(ctx, 0, 0, 20, 0, 0, 110 + pu * 14, [[0, rgba(ac, 0.32 + pu * 0.14)], [0.6, rgba(ac, 0.1)], [1, rgba(ac, 0)]]);
        circ(ctx, 0, 0, 124 + pu * 14); ctx.fill(); ctx.restore();
      }
      try { B.A.paint(ctx, st); } catch (e) { /* rien */ }
      if (B.flash > 0 && B.id !== 'neptune') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,' + B.flash * 0.35 + ')'; for (const h of B.A.hits) { circ(ctx, h.x * (B.id === 'coq' ? B.dir : 1), h.y, h.r); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; }
      if (B.id === 'lustre') for (const p of B.pends) if (p.alive) paintPendant(ctx, p.x, p.y, B.t, p.i, false);
      if (B.id === 'lustre' && bossVulnerable() && B.alive) { ctx.strokeStyle = 'rgba(126,240,255,' + (0.5 + 0.4 * Math.sin(S.clock * 10)) + ')'; ctx.lineWidth = 3; circ(ctx, 0, 64, 32 + Math.sin(S.clock * 10) * 2); ctx.stroke(); }
      ctx.restore();
      for (const D of B.dolphins) drawDolphin(D);
      // la théière verse son thé
      if (B.id === 'theiere' && B.anim.tilt > 0.3 && B.pourX != null) { ctx.strokeStyle = 'rgba(201,138,58,0.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(B.x - 74 * B.dir, B.y - 30); ctx.quadraticCurveTo(B.pourX, B.y - 10, B.pourX, B.y + 40); ctx.stroke(); }
    }
    // image en cache d'une partie lourde d'un boss (refaite si la résolution change ou si B.dirty)
    function bossSprite(B, key, r, fn) {
      const c0 = B['spr_' + key];
      if (c0 && c0._res === res && !B.dirty) return c0;
      const c = mkCanvas(r * 2 * res, r * 2 * res), g = c.getContext('2d');
      g.setTransform(res, 0, 0, res, r * res, r * res);
      try { fn(g); } catch (e) { /* rien */ }
      c._res = res; B['spr_' + key] = c; B.dirty = false;
      return c;
    }
    function drawDolphin(D) {
      ctx.save(); ctx.translate(D.x, D.y); ctx.scale(D.vx > 0 ? 1 : -1, 1); ctx.rotate(Math.sin(D.ph) * 0.35);
      // éclaboussures
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 4; i++) { circ(ctx, -22 - i * 7, 6 + Math.sin(D.ph * 3 + i) * 3, 3 - i * 0.5); ctx.fill(); }
      // corps
      ctx.beginPath(); ctx.moveTo(24, 2); ctx.quadraticCurveTo(14, -12, -6, -10); ctx.quadraticCurveTo(-20, -8, -26, -2); ctx.lineTo(-34, -10); ctx.lineTo(-31, 1); ctx.lineTo(-36, 9); ctx.lineTo(-25, 4); ctx.quadraticCurveTo(-10, 12, 10, 8); ctx.quadraticCurveTo(20, 7, 24, 2); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -12, 0, 12, [[0, '#5aa8d8'], [0.6, '#8fd0f0'], [1, '#d8f2ff']]); ctx.fill(); outline(ctx, 1.8);
      // nageoire, ventre, œil, sourire
      ctx.fillStyle = '#4a92c4'; ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-10, -20); ctx.lineTo(4, -10); ctx.closePath(); ctx.fill(); outline(ctx, 1.4);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(6, 5, 12, 3.5, 0.05, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1424'; circ(ctx, 13, -3, 2); ctx.fill(); ctx.fillStyle = '#ffffff'; circ(ctx, 13.6, -3.6, 0.7); ctx.fill();
      ctx.strokeStyle = OUTL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(19, 1, 3.5, 0.2, 1.4); ctx.stroke();
      if (D.flip > 0) { ctx.globalAlpha = D.flip; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; circ(ctx, 0, 0, 26 + (1 - D.flip) * 8); ctx.stroke(); }
      ctx.restore();
    }
    function drawShots() {
      // là où ça va tomber : une ombre rouge sur la ligne de la raquette
      for (const s of S.shots) {
        if (s.reward || s.vy <= 0) continue;
        const tt = (PY - s.y) / Math.max(1, s.vy), lx = clamp(s.x + s.vx * tt, WALL, W - WALL);
        if (tt > 1.4) continue;
        const k = clamp(1 - tt / 1.4, 0, 1);
        ctx.fillStyle = 'rgba(255,60,90,' + (0.18 + k * 0.35) + ')'; ell(ctx, lx, PY + PH + 4, 8 + k * 10, 3 + k * 2, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,140,' + (0.3 + k * 0.5) + ')'; ctx.lineWidth = 1.2; ell(ctx, lx, PY + PH + 4, 10 + k * 12, 4 + k * 2.5, 0); ctx.stroke();
      }
      for (const s of S.shots) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0);
        switch (s.kind) {
          case 'egg': ell(ctx, 0, 0, s.r * 0.8, s.r, 0); ctx.fillStyle = lin(ctx, -s.r, -s.r, s.r, s.r, [[0, '#ffffff'], [1, '#e8dcc4']]); ctx.fill(); outline(ctx, 1.4); ctx.fillStyle = '#e8402e'; circ(ctx, -2, -2, 1.6); ctx.fill(); ctx.fillStyle = '#3b82ff'; circ(ctx, 2.5, 2, 1.4); ctx.fill(); break;
          case 'sugar': rr(ctx, -s.r * 0.8, -s.r * 0.8, s.r * 1.6, s.r * 1.6, 2); ctx.fillStyle = '#ffffff'; ctx.fill(); outline(ctx, 1.2); ctx.fillStyle = 'rgba(200,210,230,0.7)'; ctx.fillRect(-s.r * 0.8, s.r * 0.2, s.r * 1.6, s.r * 0.6); break;
          case 'trident': ctx.rotate(Math.PI); paintTrident(ctx, 0, 0, 0, 0.32); break;
          case 'yarn': circ(ctx, 0, 0, s.r); ctx.fillStyle = s.col || '#ff7aa8'; ctx.fill(); outline(ctx, 1.4); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * 3, 0, s.r * 0.8, -1, 1); ctx.stroke(); } break;
          case 'petard': rr(ctx, -4, -9, 8, 18, 3); ctx.fillStyle = '#e8402e'; ctx.fill(); outline(ctx, 1.2); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-4, -2, 8, 3); ctx.strokeStyle = '#7a5020'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(3, -14); ctx.stroke(); break;
          case 'icicle': poly(ctx, [-4, -10, 4, -10, 0, 12]); ctx.fillStyle = lin(ctx, 0, -10, 0, 12, [[0, '#ffffff'], [1, '#7ef0ff']]); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke(); break;
          case 'candy': ctx.fillStyle = s.col || '#ff4fa8'; ell(ctx, 0, 0, s.r * 0.9, s.r * 0.6, 0); ctx.fill(); poly(ctx, [-s.r * 0.8, 0, -s.r * 1.6, -s.r * 0.6, -s.r * 1.6, s.r * 0.6]); ctx.fill(); poly(ctx, [s.r * 0.8, 0, s.r * 1.6, -s.r * 0.6, s.r * 1.6, s.r * 0.6]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ell(ctx, -1, -2, 3, 1.4, 0); ctx.fill(); break;
          case 'coin': ell(ctx, 0, 0, s.r * 0.8, s.r, 0); ctx.fillStyle = lin(ctx, -s.r, -s.r, s.r, s.r, [[0, '#fff0a0'], [1, '#c9902a']]); ctx.fill(); outline(ctx, 1.2); break;
          default: circ(ctx, 0, 0, s.r); ctx.fillStyle = '#ffffff'; ctx.fill();
        }
        ctx.restore();
        if (s.reward) { ctx.fillStyle = 'rgba(255,230,120,0.25)'; circ(ctx, s.x, s.y, s.r * 2); ctx.fill(); }
      }
    }

    // ---------- particules, anneaux, textes flottants ----------
    function updateFx(dt, rdt) {
      for (const p of S.parts) {
        p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
        if (p.k === 'petal' || p.k === 'feather' || p.k === 'leaf') { p.vx *= 1 - dt * 1.2; p.x += Math.sin(p.life * 6 + p.rot) * 12 * dt; }
        if (p.k === 'steam') { p.vx *= 1 - dt * 0.8; p.s += dt * 14; }
      }
      S.parts = S.parts.filter((p) => p.life > 0);
      for (const r of S.rings) r.life -= dt;
      S.rings = S.rings.filter((r) => r.life > 0);
      for (const f of S.floats) { f.life -= rdt; f.y += f.vy * rdt; f.vy *= 1 - rdt * 1.5; }
      S.floats = S.floats.filter((f) => f.life > 0);
      for (const f of S.faces) f.life -= rdt;
      S.faces = S.faces.filter((f) => f.life > 0);
      for (const c of S.callouts) c.t += rdt;
      S.callouts = S.callouts.filter((c) => c.t < c.life);
    }
    function drawParticles() {
      for (const p of S.parts) {
        const a = clamp(p.life / p.max, 0, 1);
        switch (p.k) {
          case 'quad':
            ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.6); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(p.rot);
            ctx.drawImage(p.spr, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); break;
          case 'shard':
            ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * 0.9, p.s * 0.6); ctx.lineTo(-p.s * 0.8, p.s * 0.7); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-p.s * 0.2, -p.s * 0.5, p.s * 0.35, p.s * 0.35); ctx.restore(); break;
          case 'tess':
            ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.s, -p.s, p.s * 2, p.s * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-p.s, -p.s, p.s * 2, p.s * 0.5); ctx.restore(); break;
          case 'spark': ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.s || 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke(); ctx.globalAlpha = 1; break;
          case 'dot': ctx.globalAlpha = a; ctx.fillStyle = p.col; circ(ctx, p.x, p.y, p.s); ctx.fill(); ctx.globalAlpha = 1; break;
          case 'star': ctx.globalAlpha = a; ctx.fillStyle = p.col; star(ctx, p.x, p.y, 4, p.s * 1.6, p.s * 0.4, p.rot || 0); ctx.fill(); ctx.globalAlpha = 1; break;
          case 'steam': ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#ffffff'; circ(ctx, p.x, p.y, p.s); ctx.fill(); ctx.globalAlpha = 1; break;
          case 'petal': ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ell(ctx, 0, 0, p.s, p.s * 0.55, 0); ctx.fill(); ctx.restore(); break;
          case 'leaf': ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ell(ctx, 0, 0, p.s * 1.3, p.s * 0.6, 0); ctx.fill(); ctx.strokeStyle = 'rgba(20,80,30,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-p.s * 1.2, 0); ctx.lineTo(p.s * 1.2, 0); ctx.stroke(); ctx.restore(); break;
          case 'feather': ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ell(ctx, 0, 0, p.s * 1.8, p.s * 0.6, 0); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-p.s * 1.8, 0); ctx.lineTo(p.s * 1.8, 0); ctx.stroke(); ctx.restore(); break;
          case 'conf': ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9); ctx.restore(); break;
          default: break;
        }
      }
      ctx.globalAlpha = 1;
      for (const r of S.rings) {
        const k = 1 - r.life / r.max;
        ctx.strokeStyle = rgba(r.col, (1 - k) * 0.9); ctx.lineWidth = r.w * (1 - k) + 0.5;
        circ(ctx, r.x, r.y, lerp(r.r0, r.r1, easeOut(k))); ctx.stroke();
      }
      for (const f of S.faces) {
        const a = clamp(f.life / f.max * 2, 0, 1), k = 1 - f.life / f.max;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y - k * 30); const sc = 0.8 + easeOutBack(Math.min(1, k * 4)) * 0.2; ctx.scale(sc, sc);
        drawHeadImg(ctx, f.img, 0, 0, f.h); ctx.restore();
      }
    }
    function drawFloats() {
      for (const f of S.floats) {
        const a = clamp(f.life / f.max * 2.2, 0, 1), k = 1 - f.life / f.max;
        const sc = k < 0.12 ? 0.6 + (k / 0.12) * 0.5 : 1.1 - Math.min(0.1, (k - 0.12));
        bigText(f.text, f.x, f.y, f.size * sc, f.col, W - 30, a);
      }
    }

    // ===================================================================== INTERFACE
    function panel(x, y, w, h, acc, a, r) {
      ctx.save();
      ctx.globalAlpha = a == null ? 1 : a;
      rr(ctx, x, y, w, h, r || 12);
      ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, 'rgba(14,16,40,0.9)'], [1, 'rgba(8,10,26,0.94)']]); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(acc, 0.85); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; rr(ctx, x + 3, y + 3, w - 6, h - 6, Math.max(2, (r || 12) - 3)); ctx.stroke();
      ctx.restore();
    }
    function pill(x, y, w, h, acc) {
      rr(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = 'rgba(8,10,28,0.72)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(acc, 0.7); ctx.stroke();
    }
    function tourLabel() { return S.tour ? 'TOUR ' + roman(S.tour) + ' · ' : ''; }

    // ---------- bandeau du haut (dans l'aire de jeu) ----------
    function drawHUD() {
      if (FY > 0.5 && !wide) { S0(); ctx.fillStyle = 'rgba(6,8,22,0.86)'; ctx.fillRect(FX, 0, W * U, FY + 1); }
      SF(true);
      const Wd = CARREAUX_WORLDS[S.wi], acc = Wd.colors.accent;
      ctx.fillStyle = lin(ctx, 0, 0, 0, HUD_H, [[0, 'rgba(6,8,22,0.82)'], [1, 'rgba(6,8,22,0.55)']]); ctx.fillRect(0, 0, W, HUD_H - 4);
      // score
      S.shown += (S.score - S.shown) * 0.2; if (Math.abs(S.score - S.shown) < 1) S.shown = S.score;
      pill(6, 6, 104, 38, acc);
      smallText('SCORE', 17, 16, 9, rgba(acc, 0.95), 'left', 700);
      bigText(fmt(S.shown), 58, 31, 16, '#ffffff', 92);
      // pays + niveau + étapes
      const cx = W / 2 - 6;
      pill(cx - 74, 6, 148, 38, acc);
      smallText(tourLabel() + Wd.name.toUpperCase(), cx, 15.5, 9, acc, 'center', 700, 1, 136);
      bigText(S.isBoss ? 'BOSS' : 'NIVEAU ' + S.level, cx, 29, 13, S.isBoss ? Wd.colors.accent2 : '#ffffff', 120);
      for (let i = 0; i < 3; i++) {
        const dx = cx - 12 + i * 12, done = i < S.stage, cur = i === S.stage;
        if (i === 2) { ctx.fillStyle = done ? '#ffd34d' : cur ? Wd.colors.accent2 : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(dx - 4, 41); ctx.lineTo(dx - 4, 37); ctx.lineTo(dx - 2, 39); ctx.lineTo(dx, 36); ctx.lineTo(dx + 2, 39); ctx.lineTo(dx + 4, 37); ctx.lineTo(dx + 4, 41); ctx.closePath(); ctx.fill(); }
        else { ctx.fillStyle = done ? '#ffd34d' : cur ? '#ffffff' : 'rgba(255,255,255,0.3)'; circ(ctx, dx, 39, cur ? 2.6 : 2.1); ctx.fill(); }
      }
      // multiplicateur de combo
      const m = mult();
      if (S.combo >= 2) {
        const x = cx + 100, y = 25, k = clamp(S.comboT / 1.7, 0, 1);
        ctx.fillStyle = 'rgba(8,10,28,0.72)'; circ(ctx, x, y, 17); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3; circ(ctx, x, y, 15); ctx.stroke();
        ctx.strokeStyle = m > 1 ? '#ffd34d' : '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
        bigText('×' + String(m).replace('.', ','), x, y - 2, 10, m > 1 ? '#ffd34d' : '#ffffff', 28);
        smallText(String(S.combo), x, y + 9, 7, 'rgba(255,255,255,0.8)', 'center', 700);
      }
      // barre de vie du boss
      const B = S.boss;
      if (B && (B.state !== 'enter' || B.st > 0.8) && !B.exploded) {
        const y = 52, x0 = 22, w = W - 44, k = clamp(B.hp / B.max, 0, 1);
        rr(ctx, x0, y, w, 14, 7); ctx.fillStyle = 'rgba(8,10,28,0.8)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(Wd.colors.accent2, 0.9); ctx.stroke();
        if (k > 0) { rr(ctx, x0 + 2, y + 2, (w - 4) * k, 10, 5); ctx.fillStyle = lin(ctx, x0, 0, x0 + w, 0, [[0, '#ff4d6d'], [0.5, Wd.colors.accent2], [1, '#ffd34d']]); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (const f of [1 / 3, 2 / 3]) ctx.fillRect(x0 + w * f - 1, y + 2, 2, 10);
        smallText((B.head ? 'BOSS ' + B.name : B.title).toUpperCase() + '  ·  PHASE ' + (B.ph + 1), W / 2, y + 7.5, 9, '#ffffff', 'center', 700, 1, w - 16);
      }
      // bonus actifs (en bas à gauche)
      let ix = 18;
      for (const k2 of EFF_KEYS) {
        const tl = S.eff[k2]; if (!(tl > 0)) continue;
        const P = POWERS[k2], y = 703;
        ctx.save(); ctx.translate(ix, y);
        ctx.fillStyle = 'rgba(8,10,28,0.75)'; circ(ctx, 0, 0, 11); ctx.fill();
        ctx.strokeStyle = P.color; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, 10, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(tl / P.dur, 0, 1)); ctx.stroke();
        ctx.scale(0.62, 0.62); paintPowerIcon(ctx, k2, 12);
        ctx.restore();
        ix += 26;
      }
    }

    // ---------- panneaux sur les côtés (ordinateur) ----------
    function drawSidePanels() {
      if (!wide) return;
      // tout le panneau est dessiné à l'échelle k (paysage sur téléphone : plus petit, mais complet ; grand écran : plus
      // grand) : les deux panneaux ont la hauteur de l'aire de jeu, les trois colonnes sont alignées sur la promenade
      const k = clamp(Math.min(H * U / 470, (FX - 20) / 268), 0.5, clamp(ch / 650, 1.5, 2));
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      const vFX = FX / k, vch = ch / k, vFW = W * U / k, vFY = FY / k;
      const Wd = CARREAUX_WORLDS[S.wi], acc = Wd.colors.accent;
      const pw = Math.min(250, vFX - 34), lx = vFX - pw - 18, rx = vFX + vFW + 18, top = vFY;
      // gauche : le voyage (sur un panneau plus haut, les pays s'espacent un peu et restent au milieu)
      const lh = Math.min(vch - top - 8, Math.max(470, H * U / k));
      panel(lx, top, pw, lh, acc, 0.94);
      bigText('CASSE-CARREAUX', lx + pw / 2, top + 26, 17, '#ffffff', pw - 24);
      smallText('Le tour du monde des carreaux' + (S.tour ? ' · Tour ' + roman(S.tour) : ''), lx + pw / 2, top + 46, 11, rgba(acc, 0.95), 'center', 600, 1, pw - 20);
      const rowH = Math.min(62, (lh - 70) / NW), pitch = rowH + clamp((lh - 70 - NW * rowH) / NW, 0, 22);
      const y0 = top + 62 + Math.max(0, (lh - 72 - NW * pitch) / 2);
      for (let i = 0; i < NW; i++) {
        const D = CARREAUX_WORLDS[i], y = y0 + i * pitch, cur = i === S.wi, done = i < S.wi;
        if (cur) { rr(ctx, lx + 8, y, pw - 16, rowH - 6, 10); ctx.fillStyle = rgba(D.colors.accent, 0.18); ctx.fill(); ctx.strokeStyle = rgba(D.colors.accent, 0.9); ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.save(); ctx.translate(lx + 30, y + (rowH - 6) / 2); ctx.globalAlpha = done || cur ? 1 : 0.5; paintWorldIcon(ctx, i, Math.min(17, rowH * 0.32), S.clock); ctx.restore();
        smallText(D.name.toUpperCase(), lx + 54, y + rowH * 0.3, 11, cur ? '#ffffff' : done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)', 'left', 700, 1, pw - 70);
        smallText(D.place + ' · boss : ' + D.boss.title, lx + 54, y + rowH * 0.56, 9, cur ? rgba(D.colors.accent, 1) : 'rgba(255,255,255,0.4)', 'left', 600, 1, pw - 70);
        if (done) { ctx.save(); ctx.translate(lx + pw - 26, y + (rowH - 6) / 2); ctx.rotate(-0.2); paintStamp(ctx, i, 12, dpr); ctx.restore(); }
        if (cur) for (let k = 0; k < 3; k++) { ctx.fillStyle = k < S.stage ? '#ffd34d' : k === S.stage ? '#ffffff' : 'rgba(255,255,255,0.25)'; circ(ctx, lx + pw - 40 + k * 10, y + rowH * 0.62, 3); ctx.fill(); }
      }
      // droite : score, niveau, bonus, commandes
      const rh = lh;
      panel(rx, top, pw, rh, acc, 0.94);
      smallText('SCORE', rx + 18, top + 22, 11, acc, 'left', 700);
      ctx.save(); ctx.textAlign = 'left'; bigText(fmt(S.shown), rx + pw / 2, top + 48, 26, '#ffffff', pw - 30); ctx.restore();
      smallText(S.isBoss ? 'BOSS : ' + Wd.boss.name : 'NIVEAU ' + S.level + ' · ' + (S.def ? S.def.name : ''), rx + 18, top + 78, 11, '#ffffff', 'left', 700, 1, pw - 30);
      smallText('Combo : ' + S.combo + '   ·   record du niveau : ' + S.bestCombo, rx + 18, top + 98, 10, '#ffd34d', 'left', 600, 1, pw - 30);
      let y = top + 126;
      smallText('AU ' + Wd.short.toUpperCase(), rx + 18, y, 11, acc, 'left', 700); y += 18;
      for (const nw of Wd.news) {
        smallText(nw.emoji + '  ' + nw.name, rx + 18, y, 10.5, '#ffffff', 'left', 700, 1, pw - 30);
        smallText(nw.text, rx + 38, y + 14, 9.5, 'rgba(255,255,255,0.65)', 'left', 600, 1, pw - 50);
        y += 34;
      }
      smallText('👑  Boss : ' + Wd.boss.name, rx + 18, y, 10.5, Wd.colors.accent2, 'left', 700, 1, pw - 30); y += 26;
      smallText('BONUS', rx + 18, y, 11, acc, 'left', 700); y += 18;
      let any = false;
      for (const k2 of EFF_KEYS) {
        const tl = S.eff[k2]; if (!(tl > 0)) continue; any = true;
        const P = POWERS[k2];
        ctx.save(); ctx.translate(rx + 32, y); paintCapsule(ctx, k2, 11); ctx.restore();
        smallText(P.name.replace(/ !|…/g, ''), rx + 52, y - 3, 10, '#ffffff', 'left', 700, 1, pw - 120);
        rr(ctx, rx + 52, y + 5, pw - 76, 4, 2); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();
        rr(ctx, rx + 52, y + 5, (pw - 76) * clamp(tl / P.dur, 0, 1), 4, 2); ctx.fillStyle = P.color; ctx.fill();
        y += 26;
      }
      if (!any) { smallText('Attrape les capsules qui tombent !', rx + 18, y, 10, 'rgba(255,255,255,0.6)', 'left', 600, 1, pw - 30); y += 20; }
      y = Math.max(y + 10, top + rh - 132);
      smallText('COMMANDES', rx + 18, y, 11, acc, 'left', 700);
      const lines = touchUI ? [['Glisse le doigt', 'bouger'], ['Lâche', 'lancer la bille'], ['Bouton ❚❚', 'pause']] : [['Souris ou ← →', 'bouger'], ['Clic ou ESPACE', 'lancer la bille'], ['P ou Échap', 'pause']];
      lines.forEach((l, i) => { smallText(l[0], rx + 18, y + 22 + i * 20, 10, '#ffffff', 'left', 700); smallText(l[1], rx + pw - 16, y + 22 + i * 20, 10, 'rgba(255,255,255,0.65)', 'right', 600); });
    }

    // ---------- cartes : début de niveau, arrivée dans un pays, boss ----------
    function routeIcons(cx, y, w, acc, curWi, doneTo) {
      const gap = w / NW, r = Math.min(15, gap * 0.34);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx - w / 2 + gap / 2, y); ctx.lineTo(cx + w / 2 - gap / 2, y); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < NW; i++) {
        const x = cx - w / 2 + gap * (i + 0.5), cur = i === curWi, sc = cur ? 1.3 + Math.sin(S.clock * 4) * 0.05 : 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = i <= doneTo || cur ? 1 : 0.45; paintWorldIcon(ctx, i, r, S.clock); ctx.restore();
        if (i < doneTo) { ctx.fillStyle = '#4cd66a'; circ(ctx, x + r * 0.8, y - r * 0.8, 5); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + r * 0.8 - 2.5, y - r * 0.8); ctx.lineTo(x + r * 0.8 - 0.5, y - r * 0.8 + 2); ctx.lineTo(x + r * 0.8 + 3, y - r * 0.8 - 2.5); ctx.stroke(); }
        smallText(CARREAUX_WORLDS[i].short.toUpperCase(), x, y + r + 10, 7, cur ? '#ffffff' : 'rgba(255,255,255,0.55)', 'center', 700, 1, gap);
      }
    }
    function drawIntroCard() {
      if (S.state !== 'intro' || tuto) return;
      const Wd = CARREAUX_WORLDS[S.wi], acc = Wd.colors.accent, t = S.st, dur = S.introDur;
      const worldStart = S.stage === 0, a = clamp(t / 0.25, 0, 1) * clamp((dur - 0.85 - t) / 0.25, 0, 1);
      if (a <= 0) return;
      SF(true);
      const w = W - 40, h = worldStart ? 196 : S.isBoss ? 150 : 128, x = 20, y = S.isBoss ? 420 : 400;
      const slide = (1 - easeOutBack(clamp(t / 0.4, 0, 1))) * 30;
      ctx.save(); ctx.translate(0, slide);
      panel(x, y, w, h, acc, a, 16);
      ctx.globalAlpha = a;
      const kick = (S.tour ? 'TOUR ' + roman(S.tour) + ' · ' : '') + 'MONDE ' + (S.wi + 1) + ' · ' + (S.isBoss ? 'BOSS' : 'NIVEAU ' + S.level);
      smallText(kick, W / 2, y + 18, 9, acc, 'center', 700, a);
      if (worldStart) {
        bigText(Wd.name.toUpperCase(), W / 2, y + 44, 26, '#ffffff', w - 30, a);
        smallText(Wd.place + ' · ' + Wd.tiles, W / 2, y + 66, 11, rgba(Wd.colors.accent2, 1), 'center', 700, a);
        smallText(S.tour ? 'Tour ' + roman(S.tour) + ' : carreaux plus solides, le carrelage descend, boss plus coriaces !' : Wd.desc, W / 2, y + 84, 9.5, S.tour ? '#ffd34d' : 'rgba(255,255,255,0.85)', 'center', 600, a, w - 24);
        const nw = Wd.news[0];
        rr(ctx, x + 14, y + 96, w - 28, 26, 8); ctx.fillStyle = rgba(acc, 0.18); ctx.fill(); ctx.strokeStyle = rgba(acc, 0.6); ctx.lineWidth = 1; ctx.stroke();
        smallText('AU PROGRAMME : ' + Wd.news.map((n2) => n2.name.toLowerCase()).join(', ') + ' et ' + Wd.boss.name.replace(/^L([ae]) /, 'l$1 '), W / 2, y + 109, 9.5, '#ffffff', 'center', 700, a, w - 40);
        routeIcons(W / 2, y + 150, w - 30, acc, S.wi, S.wi);
      } else if (S.isBoss) {
        bigText(Wd.boss.name.toUpperCase(), W / 2, y + 46, 22, Wd.colors.accent2, w - 30, a);
        const B = S.boss;
        smallText(B && B.head ? 'Oh ! C\'est ' + B.name + ' en costume de ' + Wd.boss.title + ' !' : '« ' + Wd.boss.line + ' »', W / 2, y + 72, 11, '#ffffff', 'center', 700, a, w - 30);
        smallText('Trois phases : regarde bien les attaques annoncées !', W / 2, y + 92, 9.5, 'rgba(255,255,255,0.8)', 'center', 600, a, w - 30);
        smallText('Fais-le tomber pour gagner le tampon du pays !', W / 2, y + 116, 9.5, rgba(acc, 1), 'center', 700, a, w - 30);
      } else {
        bigText((S.def ? S.def.name : '').toUpperCase(), W / 2, y + 46, 20, '#ffffff', w - 30, a);
        if (S.tip) { rr(ctx, x + 14, y + 66, w - 28, 26, 8); ctx.fillStyle = rgba(acc, 0.18); ctx.fill(); smallText(S.tip, W / 2, y + 79, 10, '#ffffff', 'center', 700, a, w - 40); }
        smallText(Wd.name + ' · ' + Wd.stages[S.stage], W / 2, y + 106, 9.5, rgba(Wd.colors.accent2, 1), 'center', 700, a, w - 30);
      }
      ctx.restore();
    }
    function drawReadyGo() {
      if (S.state !== 'intro' && !(S.state === 'play' && S.st < 0.6)) return;
      SF(true);
      if (S.state === 'intro') { const k = clamp((S.introDur - S.st) / 0.8, 0, 1); if (k < 1) bigText('PRÊT ?', W / 2, 470, 40 + (1 - k) * 8, '#ffffff', W - 60, Math.min(1, (1 - k) * 4)); }
      else { const k = S.st / 0.6; bigText('GO !', W / 2, 470, 44 + k * 20, CARREAUX_WORLDS[S.wi].colors.accent2, W - 60, 1 - k); }
    }
    function drawLaunchHint() {
      if (S.state !== 'play' || !S.balls.some((b) => b.stuck) || S.launchHint <= 0) return;
      const a = 0.55 + 0.35 * Math.sin(S.clock * 5), band = ch - FY - PB * U;
      if (touchUI && !wide && band >= 44) {
        // téléphone : la consigne est dans la bande du pouce, sous la raquette (c'est là qu'on glisse)
        S0();
        const cx = FX + W * U / 2, cy = FY + PB * U + band * 0.48, tw = Math.min(W * U - 24, 300), th = 30;
        rr(ctx, cx - tw / 2, cy - th / 2, tw, th, th / 2); ctx.fillStyle = 'rgba(6,8,22,' + (0.42 + a * 0.2) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + a * 0.5 + ')'; ctx.lineWidth = 1.2; ctx.stroke();
        smallText('‹  Glisse ici · lâche pour lancer  ›', cx, cy + 0.5, 12, 'rgba(255,255,255,' + Math.min(1, a + 0.15) + ')', 'center', 700, 1, tw - 16);
        return;
      }
      SF(true);
      smallText(touchUI ? 'Glisse pour viser · lâche pour lancer' : 'Clic ou ESPACE pour lancer', W / 2, PY - 92, 11, 'rgba(255,255,255,' + a + ')', 'center', 700);
    }
    function drawCallouts() {
      if (S.state === 'dying' || S.state === 'over') return;   // rien par-dessus « PERDU ! »
      SF(true);
      for (const c of S.callouts) {
        const k = c.t / c.life, a = k < 0.15 ? k / 0.15 : clamp((1 - k) / 0.3, 0, 1), sc = 0.7 + easeOutBack(clamp(c.t / 0.3, 0, 1)) * 0.3;
        bigText(c.text, W / 2, 300, c.size * sc, c.col, W - 40, a);
        if (c.sub) smallText(c.sub, W / 2, 300 + c.size * 0.62, 11, '#ffffff', 'center', 700, a);
      }
    }
    function drawClearCard() {
      if (S.state !== 'clear' || S.st < 0.75) return;
      SF(true);
      const Wd = CARREAUX_WORLDS[S.wi], acc = Wd.colors.accent, L = S.lastClear || {}, t = S.st - 0.75, a = clamp(t / 0.25, 0, 1);
      const lines = [['Niveau réussi', L.base]];
      if (L.boss) lines.push(['Boss vaincu', L.boss]);
      if (L.fast) lines.push(['Rapidité', L.fast]);
      lines.push(['Meilleur combo', null, L.combo]);
      const h = 132 + lines.length * 20, y = 290 - h / 2 + (1 - easeOutBack(clamp(t / 0.4, 0, 1))) * 30;
      panel(30, y, W - 60, h, acc, a, 16);
      // médaillon du pays posé sur le cadre
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); paintWorldIcon(ctx, S.wi, 19, S.clock); ctx.restore();
      bigText(S.isBoss ? 'PAYS TERMINÉ !' : 'BRAVO !', W / 2, y + 38, 26, S.isBoss ? Wd.colors.accent2 : '#ffffff', W - 90, a);
      // étoiles : 1 pour le niveau, 2 si rapide, 3 si très rapide ou gros combo (ou boss battu)
      const nStar = 1 + (L.fast > 0 || L.boss ? 1 : 0) + ((L.fast > L.base * 0.5) || L.combo >= 15 || (L.boss && L.time < 45) ? 1 : 0);
      if (S.st > 0.8 && !S.starSnd) { S.starSnd = 1; for (let i = 0; i < nStar; i++) later(0.35 + i * 0.22, () => tone(880 * Math.pow(1.26, i), 0.18, 'triangle', 0.05, 1320 * Math.pow(1.26, i))); }
      for (let i = 0; i < 3; i++) {
        const k = clamp((t - 0.3 - i * 0.22) / 0.25, 0, 1), on = i < nStar, sx = W / 2 + (i - 1) * 34, sy = y + 70 - (i === 1 ? 5 : 0);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy); const sc = on ? easeOutBack(k) * 1 : 1; ctx.scale(sc || 0.001, sc || 0.001);
        star(ctx, 0, 0, 5, 14, 6.2, 0); ctx.fillStyle = on && k > 0 ? lin(ctx, 0, -14, 0, 14, [[0, '#fff3a0'], [1, '#ffb82e']]) : 'rgba(255,255,255,0.15)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = on && k > 0 ? '#8a5a0a' : 'rgba(255,255,255,0.3)'; ctx.stroke();
        ctx.restore();
      }
      lines.forEach((l, i) => {
        const ly = y + 100 + i * 20, show = clamp((t - 0.15 - i * 0.12) / 0.2, 0, 1) * a;
        smallText(l[0], 52, ly, 11, 'rgba(255,255,255,0.85)', 'left', 600, show);
        smallText(l[1] != null ? '+' + fmt(l[1]) : String(l[2]), W - 52, ly, 12, l[1] != null ? '#ffd34d' : '#ffffff', 'right', 700, show);
      });
      smallText('Score : ' + fmt(S.score), W / 2, y + h - 16, 12, '#ffffff', 'center', 700, a);
    }

    // ---------- le voyage : tampon du passeport, puis l'avion survole le globe ----------
    function startTrip() {
      const from = S.wi, to = (S.wi + 1) % NW, newTour = to === 0;
      S.trip = { from, to, t: 0, newTour, stampDone: false };
      S.state = 'trip'; S.st = 0;
      S.balls = []; S.caps = []; S.shots = []; S.beams = [];
      // le prochain décor est peint tout de suite (pas d'à-coup à l'arrivée)
      try { nextScene = sceneFor(to); nextScene.wi = to; } catch (e) { nextScene = null; }
    }
    const TRIP_STAMP = 1.5, TRIP_FLY = 3.2, TRIP_LAND = 1.2;
    function updateTrip(dt) {
      const T = S.trip; if (!T) return;
      T.t += dt;
      if (!T.stampDone && T.t > 0.7) { T.stampDone = true; SFX.stamp(); doShake(5); }
      if (!T.planeSnd && T.t > TRIP_STAMP + 0.1) { T.planeSnd = true; SFX.plane(); }
      if (!T.jingle && T.t > TRIP_STAMP + TRIP_FLY) { T.jingle = true; S.wid = CARREAUX_WORLDS[T.to].id; SFX.jingle(); }
      if (T.t >= TRIP_STAMP + TRIP_FLY + TRIP_LAND) finishTrip();
    }
    function finishTrip() {
      const T = S.trip; S.trip = null;
      if (nextScene) { scene = nextScene; nextScene = null; initAmbient(); }
      startLevel(S.level + 1);
      return T;
    }
    function tripAlphas(t) {
      const aP = clamp(t / 0.25, 0, 1) * clamp((TRIP_STAMP + 0.3 - t) / 0.45, 0, 1);
      const aG = clamp((t - TRIP_STAMP + 0.15) / 0.45, 0, 1) * clamp((TRIP_STAMP + TRIP_FLY + TRIP_LAND - t) / 0.5, 0, 1);
      return { aP, aG };
    }
    const playerName = (() => { try { return String((api.player && api.player.name) || '').slice(0, 14).toUpperCase() || 'VOYAGEUR'; } catch (e) { return 'VOYAGEUR'; } })();
    function drawPassport(T, t, a) {
      const D0 = CARREAUX_WORLDS[T.from];
      ctx.fillStyle = 'rgba(4,6,16,' + 0.6 * a + ')'; ctx.fillRect(0, 0, cw, ch);
      const pw = Math.min(cw * 0.9, 460, (ch - 96) / 0.68), ph = pw * 0.68, px = cw / 2 - pw / 2, py = ch / 2 - ph / 2 - 10 + (1 - easeOut(clamp(t / 0.4, 0, 1))) * ch * 0.3;
      ctx.save(); ctx.globalAlpha = a;
      // couverture bordeaux, page crème à guillochis
      rr(ctx, px - 9, py - 9, pw + 18, ph + 18, 14); ctx.fillStyle = '#7a1f2e'; ctx.fill();
      ctx.strokeStyle = '#d9a43a'; ctx.lineWidth = 1.5; rr(ctx, px - 5, py - 5, pw + 10, ph + 10, 11); ctx.stroke();
      rr(ctx, px, py, pw, ph, 8); ctx.fillStyle = lin(ctx, 0, py, 0, py + ph, [[0, '#fbf3df'], [1, '#efe1c0']]); ctx.fill();
      ctx.save(); rr(ctx, px, py, pw, ph, 8); ctx.clip();
      ctx.strokeStyle = 'rgba(160,120,80,0.16)'; ctx.lineWidth = 1;
      for (let i = 0; i < 22; i++) { ctx.beginPath(); for (let x = 0; x <= pw; x += 8) { const yy = py + (i + 0.5) * ph / 22 + Math.sin(x * 0.05 + i) * 3; if (x) ctx.lineTo(px + x, yy); else ctx.moveTo(px, yy); } ctx.stroke(); }
      ctx.globalAlpha = a * 0.08; ctx.save(); ctx.translate(px + pw * 0.62, py + ph * 0.55); paintGlobe(ctx, ph * 0.36, -10, 30, 0); ctx.restore(); ctx.globalAlpha = a;
      ctx.restore();
      smallText('PASSEPORT DU VOYAGEUR', px + pw / 2, py + 18, Math.max(10, pw * 0.032), '#7a1f2e', 'center', 700);
      ctx.strokeStyle = 'rgba(122,31,46,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 14, py + 30); ctx.lineTo(px + pw - 14, py + 30); ctx.stroke();
      // la photo du voyageur
      const fw = pw * 0.24, fh = fw * 1.22, fx = px + pw * 0.04, fy2 = py + 42;
      ctx.save(); ctx.translate(fx + fw / 2, fy2 + fh / 2); ctx.rotate(-0.04);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-fw / 2 + 2, -fh / 2 + 3, fw, fh);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
      ctx.fillStyle = lin(ctx, 0, -fh / 2, 0, fh / 2, [[0, '#cfe6ff'], [1, '#9cc4ea']]); ctx.fillRect(-fw / 2 + 4, -fh / 2 + 4, fw - 8, fh - 8);
      ctx.save(); ctx.beginPath(); ctx.rect(-fw / 2 + 4, -fh / 2 + 4, fw - 8, fh - 8); ctx.clip();
      if (playerImg) drawHeadImg(ctx, playerImg, 0, fh * 0.06, fh * 0.86);
      else { ctx.fillStyle = '#6f86a8'; circ(ctx, 0, -fh * 0.08, fw * 0.2); ctx.fill(); ell(ctx, 0, fh * 0.42, fw * 0.4, fh * 0.3, 0); ctx.fill(); }
      ctx.restore();
      ctx.restore();
      smallText(playerName, fx + fw / 2, fy2 + fh + 14, Math.max(9, pw * 0.03), '#3a2a20', 'center', 700, a, fw + 20);
      smallText(S.tour ? 'Tour du monde ' + roman(S.tour) : 'Tour du monde I', fx + fw / 2, fy2 + fh + 28, Math.max(8, pw * 0.024), '#7a1f2e', 'center', 600, a, fw + 20);
      // les tampons des pays
      const sx0 = px + pw * 0.34, sw = pw * 0.64, sr = Math.min(sw / 6.6, ph * 0.18);
      for (let i = 0; i < NW; i++) {
        const sx = sx0 + sw * ((i % 3) + 0.5) / 3, sy = py + ph * (0.36 + Math.floor(i / 3) * 0.4);
        const done = T.newTour ? true : i < T.from, isNew = i === T.from;
        if (isNew) {
          const k = clamp((t - 0.45) / 0.25, 0, 1);
          if (k > 0) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.25 + i * 0.07); const sc = 2.2 - easeOut(k) * 1.2; ctx.scale(sc, sc); ctx.globalAlpha = a * k; paintStamp(ctx, i, sr, dpr * 1.5); ctx.restore(); }
          if (k >= 1 && t < 1.1) { ctx.save(); ctx.globalAlpha = (1.1 - t) * 2 * a; ctx.strokeStyle = rgba(D0.colors.accent, 1); ctx.lineWidth = 3; circ(ctx, sx, sy, sr * (1 + (t - 0.7) * 2)); ctx.stroke(); ctx.restore(); }
        } else if (done) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.25 + i * 0.07); paintStamp(ctx, i, sr, dpr * 1.5); ctx.restore(); }
        else { ctx.strokeStyle = 'rgba(122,31,46,0.2)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; circ(ctx, sx, sy, sr); ctx.stroke(); ctx.setLineDash([]); smallText(CARREAUX_WORLDS[i].short, sx, sy, Math.max(8, sr * 0.28), 'rgba(122,31,46,0.35)', 'center', 700, a); }
      }
      ctx.restore();
      if (t > 0.75) bigText(T.newTour ? 'TOUR DU MONDE RÉUSSI !' : D0.short.toUpperCase() + ' : TAMPONNÉ !', cw / 2, py + ph + 40, Math.min(30, cw * 0.07), D0.colors.accent2, cw - 30, clamp((t - 0.75) / 0.2, 0, 1) * a);
    }
    function drawTrip() {
      const T = S.trip; if (!T) return;
      S0();
      const t = T.t, D0 = CARREAUX_WORLDS[T.from], D1 = CARREAUX_WORLDS[T.to], AL = tripAlphas(t);
      if (AL.aG > 0) drawGlobeTrip(T, t, AL.aG, D0, D1);
      if (AL.aP > 0) { S0(); ctx.globalAlpha = 1; drawPassport(T, t, AL.aP); }
    }
    function drawGlobeTrip(T, t, fade, D0, D1) {
      // 2) le globe : l'avion vole vers le pays suivant
      const k = clamp((t - TRIP_STAMP) / TRIP_FLY, 0, 1), kk = ease(k);
      const A = D0.geo, Bg = D1.geo, P = greatCircle(A, Bg, kk);
      ctx.fillStyle = lin(ctx, 0, 0, 0, ch, [[0, '#050a24'], [1, '#14214e']]); ctx.globalAlpha = fade; ctx.fillRect(0, 0, cw, ch);
      starsField(ctx, 0, 0, cw, ch, 90, 5, 0.8);
      const wideG = cw > ch * 1.3, R = (wideG ? ch * 0.42 : Math.min(cw, ch) * 0.36) * (1 + 0.1 * Math.sin(k * Math.PI)), gx = wideG ? cw * 0.64 : cw / 2, gy = ch * (wideG ? 0.5 : 0.52);
      const lon0 = P.lon, lat0 = clamp(P.lat * 0.75, -40, 60);
      ctx.save(); ctx.translate(gx, gy);
      paintGlobe(ctx, R, lon0, lat0, S.clock);
      // routes (faites, à faire) et villes
      for (let i = 0; i < NW - 1; i++) {
        const done = i < T.from;
        ctx.strokeStyle = done ? 'rgba(255,211,77,0.85)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); let st0 = true;
        for (let j = 0; j <= 24; j++) { const q0 = greatCircle(CARREAUX_WORLDS[i].geo, CARREAUX_WORLDS[i + 1].geo, j / 24), q = orth(q0.lon, q0.lat, lon0, lat0); if (!q.vis) { st0 = true; continue; } if (st0) { ctx.moveTo(q.x * R, q.y * R); st0 = false; } else ctx.lineTo(q.x * R, q.y * R); }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // trajet en cours (trait plein derrière l'avion)
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.beginPath(); let s0 = true;
      for (let j = 0; j <= 30; j++) { const q0 = greatCircle(A, Bg, (j / 30) * kk), q = orth(q0.lon, q0.lat, lon0, lat0); if (!q.vis) { s0 = true; continue; } if (s0) { ctx.moveTo(q.x * R, q.y * R); s0 = false; } else ctx.lineTo(q.x * R, q.y * R); }
      ctx.stroke();
      for (let i = 0; i < NW; i++) {
        const g0 = CARREAUX_WORLDS[i].geo, q = orth(g0.lon, g0.lat, lon0, lat0); if (!q.vis) continue;
        const isTo = i === T.to;
        ctx.fillStyle = isTo ? '#ff4fa8' : i <= T.from ? '#ffd34d' : '#ffffff';
        circ(ctx, q.x * R, q.y * R, isTo ? 5 + Math.sin(S.clock * 8) * 1.5 : 3.5); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        if (isTo || i === T.from) smallText(CARREAUX_WORLDS[i].place, q.x * R, q.y * R - 12, Math.max(9, R * 0.06), '#ffffff', 'center', 700);
      }
      // l'avion (avec la tête du joueur)
      const q = orth(P.lon, P.lat, lon0, lat0), P2 = greatCircle(A, Bg, Math.min(1, kk + 0.02)), q2 = orth(P2.lon, P2.lat, lon0, lat0);
      const ang = Math.atan2(q2.y - q.y, q2.x - q.x), alt = R * (0.08 + 0.12 * Math.sin(k * Math.PI));
      const px2 = q.x * R * (1 + alt / R), py2 = q.y * R * (1 + alt / R) - alt * 0.6;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, q.x * R, q.y * R, R * 0.06, R * 0.025, 0); ctx.fill();
      const goLeft = Math.cos(ang) < -0.05 || (Math.abs(Math.cos(ang)) <= 0.05 && T.to < T.from), tilt = clamp(Math.sin(ang) * 0.45, -0.4, 0.4) * (goLeft ? -1 : 1) + Math.sin(S.clock * 3) * 0.04;
      ctx.save(); ctx.translate(px2, py2); if (goLeft) ctx.scale(-1, 1); ctx.rotate(tilt);
      paintPlane(ctx, Math.max(0.8, R / 150), S.clock, playerImg);
      ctx.restore();
      ctx.restore();
      ctx.globalAlpha = 1;
      if (wideG) {
        const tx = (gx - R) / 2, tw = Math.max(120, gx - R - 30);
        bigText(T.newTour ? 'TOUR DU MONDE ' + roman(S.tour + 1) + ' !' : 'EN ROUTE POUR…', tx, ch * 0.38, Math.min(22, ch * 0.06), '#ffffff', tw, fade);
        bigText(D1.name.toUpperCase(), tx, ch * 0.5, Math.min(34, ch * 0.1), D1.colors.accent, tw, fade);
        smallText(D1.place + ' · ' + D1.tiles, tx, ch * 0.61, Math.min(14, ch * 0.045), '#ffffff', 'center', 700, fade, tw);
      } else {
        bigText(T.newTour ? 'TOUR DU MONDE ' + roman(S.tour + 1) + ' !' : 'EN ROUTE POUR…', cw / 2, Math.max(36, gy - R - 52), Math.min(22, cw * 0.055), '#ffffff', cw - 30, fade);
        bigText(D1.name.toUpperCase(), cw / 2, Math.max(64, gy - R - 22), Math.min(34, cw * 0.085), D1.colors.accent, cw - 30, fade);
        smallText(D1.place + ' · ' + D1.tiles, cw / 2, Math.min(ch - 20, gy + R + 30), Math.min(14, cw * 0.035), '#ffffff', 'center', 700, fade);
      }
      // 3) l'arrivée : le nouveau décor se dévoile en cercle
      const land = clamp((t - TRIP_STAMP - TRIP_FLY) / TRIP_LAND, 0, 1);
      if (land > 0 && nextScene) {
        const qd = orth(D1.geo.lon, D1.geo.lat, lon0, lat0), ox = gx + (qd.vis ? qd.x * R : 0), oy = gy + (qd.vis ? qd.y * R : 0);
        ctx.save(); ctx.beginPath(); ctx.arc(ox, oy, ease(land) * Math.hypot(cw, ch) * 1.05, 0, TAU); ctx.clip();
        ctx.drawImage(nextScene.back, 0, 0, cw, ch); ctx.drawImage(nextScene.front, 0, 0, cw, ch);
        ctx.restore();
      }
      if (t > 1.2 && t < TRIP_STAMP + TRIP_FLY) smallText(touchUI ? 'Touche pour passer' : 'Clic pour passer', cw / 2, ch - 14, 10, 'rgba(255,255,255,0.45)', 'center', 600);
    }

    // ---------- pause, défaite ----------
    function drawPause() {
      S0();
      const Wd = CARREAUX_WORLDS[S.wi], acc = Wd.colors.accent;
      ctx.fillStyle = 'rgba(4,6,18,0.74)'; ctx.fillRect(0, 0, cw, ch);
      const w = Math.min(cw - 30, 380), h = 270, x = cw / 2 - w / 2, y = ch / 2 - h / 2;
      panel(x, y, w, h, acc, 1, 18);
      bigText('PAUSE', cw / 2, y + 36, 32, '#ffffff', w - 30);
      smallText('Ton voyage', cw / 2, y + 66, 12, acc, 'center', 700);
      // la route des 6 pays
      const gap = (w - 30) / NW;
      for (let i = 0; i < NW; i++) {
        const ix = x + 15 + gap * (i + 0.5), iy = y + 112, cur = i === S.wi;
        ctx.save(); ctx.translate(ix, iy); ctx.globalAlpha = i <= S.wi ? 1 : 0.45; const sc = cur ? 1.2 : 1; ctx.scale(sc, sc); paintWorldIcon(ctx, i, Math.min(18, gap * 0.36), S.clock); ctx.restore();
        if (i < S.wi) { ctx.save(); ctx.translate(ix + 10, iy - 12); ctx.rotate(-0.3); paintStamp(ctx, i, 9, dpr); ctx.restore(); }
        smallText(CARREAUX_WORLDS[i].short, ix, iy + 30, 9, cur ? '#ffffff' : 'rgba(255,255,255,0.55)', 'center', 700, 1, gap);
      }
      smallText(Wd.name + ' · ' + (S.isBoss ? 'boss : ' + Wd.boss.name : 'niveau ' + S.level), cw / 2, y + 168, 12, '#ffffff', 'center', 700, 1, w - 30);
      smallText('Score : ' + fmt(S.score), cw / 2, y + 190, 12, '#ffd34d', 'center', 700);
      bigText(touchUI ? 'TOUCHE POUR REPRENDRE' : 'CLIC OU P POUR REPRENDRE', cw / 2, y + 232, 14, acc, w - 30, 0.75 + 0.25 * Math.sin(S.clock * 4));
    }
    function drawDying() {
      if (S.state !== 'dying' && S.state !== 'over') return;
      SF(true);
      const t = S.state === 'over' ? 9 : S.st, a = clamp((t - 0.3) / 0.3, 0, 1);
      ctx.fillStyle = 'rgba(30,4,12,' + 0.35 * a + ')'; ctx.fillRect(0, 0, W, H);
      bigText(S.lostWhy === 'wall' ? 'LE CARRELAGE !' : 'PERDU !', W / 2, 300, 44, '#ff6a7a', W - 40, a);
      smallText(S.lostWhy === 'wall' ? 'Les carreaux sont descendus trop bas…' : 'La bille est tombée…', W / 2, 336, 13, '#ffffff', 'center', 700, a);
      smallText(CARREAUX_WORLDS[S.wi].name + ' · niveau ' + S.level + ' · ' + fmt(S.score) + ' points', W / 2, 360, 11, '#ffd34d', 'center', 700, a, W - 40);
    }

    // ===================================================================== TUTORIEL (3 étapes, une seule fois)
    function tutoNext(skip) {
      if (!tuto) return;
      SFX.tick();
      if (skip || tuto.step >= 2) { tuto = null; setPref(TUTO_KEY, '1'); S.st = 0; SFX.ready(); return; }
      tuto.step++; tuto.t = 0;
    }
    function tutoCard() { const w = Math.min(cw - 24, 380), h = Math.min(ch - 24, 440); return { x: cw / 2 - w / 2, y: Math.max(8, ch / 2 - h / 2), w, h }; }
    function tutoSkipRect() { const k = tutoCard(); return { x: k.x + k.w - 104, y: k.y + 10, w: 94, h: 36 }; }
    function tutoBtnRect() { const k = tutoCard(); return { x: k.x + k.w / 2 - 110, y: k.y + k.h - 62, w: 220, h: 46 }; }
    function drawTuto() {
      S0();
      ctx.fillStyle = 'rgba(4,6,18,0.72)'; ctx.fillRect(0, 0, cw, ch);
      const k = tutoCard(), tt = tuto.t, st = tuto.step, Wd = CARREAUX_WORLDS[S.wi], acc = Wd.colors.accent;
      panel(k.x, k.y, k.w, k.h, acc, 1, 18);
      smallText('COMMENT JOUER · ' + (st + 1) + '/3', k.x + 18, k.y + 28, 11, acc, 'left', 700);
      const sk = tutoSkipRect();
      rr(ctx, sk.x, sk.y, sk.w, sk.h, sk.h / 2); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
      smallText('PASSER ✕', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1, 11, '#ffffff', 'center', 700);
      // la scène animée
      const sx = k.x + 16, sy = k.y + 56, sw = k.w - 32, sh = Math.min(200, k.h - 190);
      ctx.save(); rr(ctx, sx, sy, sw, sh, 12); ctx.clip();
      ctx.fillStyle = lin(ctx, 0, sy, 0, sy + sh, [[0, '#2a5fae'], [1, '#8fd3ff']]); ctx.fillRect(sx, sy, sw, sh);
      const s = sw / 300, ox = sx, oy = sy, mb = sh / s;
      // la promenade sous la raquette (calçada) : c'est là que se pose le pouce
      const pvY = oy + (mb - 30) * s;
      ctx.fillStyle = '#efe8da'; ctx.fillRect(sx, pvY, sw, sy + sh - pvY);
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2 * s;
      for (let r = 0; r < 2; r++) { ctx.beginPath(); for (let x = 0; x <= 300; x += 6) { const y = pvY + (9 + r * 12) * s + Math.sin(x * 0.07 + r * 1.3) * 2.2 * s; if (x) ctx.lineTo(ox + x * s, y); else ctx.moveTo(ox, y); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(sx, pvY, sw, 2 * s);
      const tileAtT = (c, r, v) => { ctx.save(); ctx.translate(ox + (20 + c * 26) * s, oy + (16 + r * 26) * s); ctx.scale(24 * s / 32, 24 * s / 32); paintAzulejo(ctx, 'n', v, 32); ctx.restore(); };
      const padX = st === 0 ? 150 + Math.sin(tt * 1.6) * 90 : st === 1 ? 150 + Math.sin(tt * 2.2) * 40 : 150 + Math.sin(tt * 1.2) * 25;
      if (st >= 1) for (let c = 0; c < 10; c++) for (let r = 0; r < 2; r++) { const gone = st === 1 && ((c === 3 && r === 1 && (tt % 2.4) > 0.9) || (c === 6 && r === 1 && (tt % 2.4) > 1.9)); if (!gone) tileAtT(c, r, (c + r) % 2 ? 0 : 3); }
      // la raquette, au-dessus de la promenade
      ctx.save(); ctx.translate(ox + padX * s, oy + (mb - 46) * s);
      rr(ctx, -34 * s, 0, 68 * s, 11 * s, 5.5 * s); ctx.fillStyle = lin(ctx, 0, 0, 0, 11 * s, [[0, '#ffffff'], [1, '#c9d6ea']]); ctx.fill(); ctx.strokeStyle = 'rgba(10,10,30,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      if (st === 0) {
        // le doigt (ou la souris) qui glisse sur la promenade, sous la raquette
        const fx = ox + (150 + Math.sin(tt * 1.6) * 90 + 10) * s, fy = oy + (mb - 15) * s;
        ctx.strokeStyle = 'rgba(40,40,60,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(ox + 50 * s, fy); ctx.lineTo(ox + 250 * s, fy); ctx.stroke(); ctx.setLineDash([]);
        if (touchUI) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; circ(ctx, fx, fy, 15 * s); ctx.fill(); ctx.fillStyle = '#ffffff'; circ(ctx, fx, fy, 9 * s); ctx.fill(); ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.stroke(); }
        else { ctx.save(); ctx.translate(fx, fy - 8 * s); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.lineTo(6, 16); ctx.lineTo(11, 26); ctx.lineTo(15, 24); ctx.lineTo(10, 14); ctx.lineTo(18, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      } else if (st === 1) {
        // la bille rebondit et casse des carreaux
        const ph = (tt % 1.2) / 1.2, bx = ox + (padX + (ph < 0.5 ? -1 : 1) * 30 * Math.sin(ph * Math.PI)) * s, by = oy + (mb - 54 - Math.sin(ph * Math.PI) * (mb - 110)) * s;
        ctx.fillStyle = rad(ctx, bx - 2, by - 2, 0, bx, by, 7 * s, [[0, '#ffffff'], [1, '#9fc4ff']]); circ(ctx, bx, by, 6 * s); ctx.fill();
        if (ph > 0.42 && ph < 0.58) sparks0(bx, by - 10 * s, s);
      } else {
        // une capsule tombe, le boss attend en haut
        const cy2 = oy + (20 + ((tt * 70) % (mb - 80))) * s;
        ctx.save(); ctx.translate(ox + 150 * s, cy2); paintCapsule(ctx, 'multi', 13 * s); ctx.restore();
        ctx.save(); ctx.translate(ox + 240 * s, oy + 50 * s); ctx.scale(0.32 * s, 0.32 * s); paintCoq(ctx, { t: tt, ph: 0, dir: -1, walking: true }); ctx.restore();
        for (let i = 0; i < NW; i++) { ctx.save(); ctx.translate(ox + (30 + i * 22) * s, oy + 30 * s); paintWorldIcon(ctx, i, 9 * s, tt); ctx.restore(); }
      }
      ctx.restore();
      const titles = [touchUI ? 'GLISSE POUR BOUGER' : 'BOUGE LA SOURIS', 'CASSE LES CARREAUX', 'FAIS LE TOUR DU MONDE'];
      const texts = [
        touchUI ? ['Pose le pouce sous la raquette et glisse :', 'elle suit ton doigt. Lâche pour lancer la bille.'] : ['La raquette suit la souris (ou les flèches ← →).', 'Clic ou ESPACE pour lancer la bille.'],
        ['Renvoie la bille sur les carreaux.', 'Une seule vie : ne la laisse pas tomber !'],
        ['Attrape les bonus, bats le boss de chaque pays', 'et collectionne les tampons du passeport !']
      ];
      const ty = sy + sh + 34;
      bigText(titles[st], cw / 2, ty, 20, Wd.colors.accent2, k.w - 30);
      smallText(texts[st][0], cw / 2, ty + 28, 12, '#ffffff', 'center', 600, 1, k.w - 30);
      smallText(texts[st][1], cw / 2, ty + 46, 12, '#ffffff', 'center', 600, 1, k.w - 30);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === st ? '#ffd34d' : 'rgba(255,255,255,0.3)'; circ(ctx, cw / 2 - 14 + i * 14, ty + 68, 4); ctx.fill(); }
      const b = tutoBtnRect();
      rr(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = lin(ctx, 0, b.y, 0, b.y + b.h, [[0, shade(acc, 0.25)], [1, shade(acc, -0.15)]]); ctx.fill();
      bigText(st < 2 ? 'SUIVANT ›' : 'C\'EST PARTI !', b.x + b.w / 2, b.y + b.h / 2 + 1, 15, '#ffffff', b.w - 20);
    }
    function sparks0(x, y, s) { ctx.fillStyle = '#ffd34d'; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.fillRect(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s, 2.4 * s, 2.4 * s); } }

    // ===================================================================== DÉROULEMENT
    function startLevel(n) {
      for (const k of EFF_KEYS) S.eff[k] = 0;
      S.wind = 0; S.zoom = 0; S.slowT = 0; S.slowK = 1; S.timeK = 1; S.bestCombo = 0; S.portraitsBroken = 0; S.starSnd = 0;
      bossMusicOff();
      buildLevel(n);
      S.paddle.x = S.paddle.tx = W / 2; S.paddle.stun = 0;
      serve();
      S.state = 'intro'; S.st = 0; S.introT = 0;
      S.introDur = S.stage === 0 ? 3.7 : S.isBoss ? 3.4 : 3.0;
      if (S.stage === 0 && n === START) SFX.jingle();
      else SFX.ready();
      // la première fois qu'un copain apparaît sur un carreau-portrait : « Oh ! C'est NOM ! »
      S.seen = S.seen || {};
      S.tiles.filter((t) => t.kind === 'p' && !S.seen[t.name]).slice(0, 2).forEach((t, i) => {
        S.seen[t.name] = 1;
        later(1.0 + i * 0.5, () => { if (t.alive && S.level === n) { pop(clamp(t.x + t.w / 2, 110, W - 110), t.y0 + S.off - 8, pick(['Oh ! C’est ' + t.name + ' !', 'Tiens, ' + t.name + ' !', 'Coucou ' + t.name + ' !']), '#ff9fd0', 12, 1.8, -12); SFX.portrait(); } });
      });
    }
    function update(dt) {
      rtime += dt; sndBudget = 10;
      S.clock += dt; S.st += dt;
      // ralenti (fin de niveau, boss, gros combos)
      let tk = 1;
      if (S.slowT > 0) { S.slowT -= dt; tk = S.slowK; if (S.slowT <= 0) S.slowK = 1; }
      S.timeK += (tk - S.timeK) * Math.min(1, dt * 14);
      let gdt = dt * S.timeK;
      if (S.hitstop > 0) { S.hitstop -= dt; gdt = 0; }
      if (S.slowT <= 0) S.zoom = Math.max(0, S.zoom - dt * 1.5);
      S.shake = Math.max(0, S.shake - dt * 24);
      S.shx = (Math.random() - 0.5) * S.shake; S.shy = (Math.random() - 0.5) * S.shake;
      S.flash = Math.max(0, S.flash - dt * 2.2);
      for (const t of S.tiles) { if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 6); if (t.wob > 0) t.wob = Math.max(0, t.wob - dt * 4); }
      updateAmbient(dt);
      if (S.state === 'play' || S.state === 'intro') { S.ambT = (S.ambT == null ? 3 : S.ambT) - dt; if (S.ambT <= 0) { S.ambT = rand(5.5, 9.5); SFX.ambient(); } }
      if (tuto) { tuto.t += dt; return; }
      switch (S.state) {
        case 'intro':
          S.introT += dt;
          updatePaddle(dt);
          for (const b of S.balls) stepBall(b, 0);
          if (S.boss) updateBoss(dt);
          if (S.st >= S.introDur) { S.state = 'play'; S.st = 0; SFX.go(); }
          break;
        case 'play': {
          S.levelT += gdt; S.introT += gdt;
          if (!S.isBoss && S.remaining <= 4) S.stats.endT += gdt;
          if (!S.isBoss && S.remaining > 0 && S.remaining <= (S.mosaic ? 10 : 5) && S.levelT - S.lastBreakT > 9) {
            S.lastBreakT = S.levelT - 7.4;
            const left = S.tiles.filter((t) => t.alive && t.kind !== 'm');
            if (left.length) { const t = left[(cr('drop') * left.length) | 0]; if (!S.mercy) { S.mercy = 1; callout('LE CARRELAGE S\'EFFRITE !', 'Les derniers carreaux tombent tout seuls', '#ffd34d', 1.4, 24); } t.hp = 1; hitTile(t, null, 1, 'clean'); }
          }
          updatePaddle(dt);
          updateProps(gdt);
          updateBalls(gdt);
          updateCaps(gdt);
          updateLasers(gdt);
          updateRockets(gdt);
          if (S.boss) { updateBoss(gdt); updateShots(gdt); }
          else if (S.shots.length) updateShots(gdt);
          for (const k of EFF_KEYS) if (S.eff[k] > 0) S.eff[k] = Math.max(0, S.eff[k] - gdt);
          if (S.combo > 0) { S.comboT -= gdt; if (S.comboT <= 0) S.combo = 0; }
          if (S.balls.some((b) => b.stuck && b.stickT <= 0)) { S.serveT += dt; if (S.serveT > 3.2 && S.state === 'play') launch(); } else S.serveT = 0;
          if (bot) botStep(dt);
          break;
        }
        case 'clear':
          updatePaddle(dt);
          if (S.boss) updateBoss(dt);
          if (S.shots.length) updateShots(dt);
          if (S.st > 2.9) advanceClear();
          break;
        case 'trip': updateTrip(dt); break;
        case 'dying':
          for (const b of S.balls) stepBall(b, gdt);
          if (S.st > 1.5) finishGame();
          break;
        default: break;
      }
      updateFx(gdt, dt);
      for (let i = sfxQ.length - 1; i >= 0; i--) { sfxQ[i].t -= dt; if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); try { f(); } catch (e) { /* rien */ } } }
    }
    function advanceClear() {
      if (S.state !== 'clear') return;
      if (S.isBoss) startTrip();
      else startLevel(S.level + 1);
    }
    function render() {
      if (S.state === 'trip' && S.trip && tripAlphas(S.trip.t).aG >= 1) { drawTrip(); return; }
      drawBackground();
      drawFieldFrame();
      SF();
      drawVents();
      drawTiles();
      drawBossLayer();
      drawShots();
      drawCaps();
      drawLasers();
      if (S.state !== 'trip') drawPaddle();
      drawBalls();
      drawParticles();
      drawFloats();
      if (S.flash > 0) { S0(); ctx.fillStyle = rgba(S.flashCol, Math.min(0.6, S.flash)); ctx.fillRect(0, 0, cw, ch); }
      drawHUD();
      drawCallouts();
      drawIntroCard();
      drawReadyGo();
      drawLaunchHint();
      drawClearCard();
      drawDying();
      drawSidePanels();
      if (S.state === 'trip') drawTrip();
      if (tuto) drawTuto();
      if (paused) drawPause();
    }

    // ===================================================================== ROBOT (tests) : suit la bille comme un joueur
    let bot = null;
    function predictX(b) {
      if (b.vy <= 0) return b.x;
      let x = b.x + b.vx * ((PY - BR - b.y) / b.vy);
      const L = WALL + BR, R = W - WALL - BR, span = R - L;
      let u = (x - L) % (2 * span); if (u < 0) u += 2 * span;
      return u > span ? L + 2 * span - u : L + u;
    }
    function reflections(b) {
      if (b.vy <= 0) return 0;
      const x = b.x + b.vx * ((PY - BR - b.y) / b.vy), L = WALL + BR, R = W - WALL - BR;
      return x < L ? Math.ceil((L - x) / (R - L)) : x > R ? Math.ceil((x - R) / (R - L)) : 0;
    }
    // robot « humain » : il réagit en retard après chaque rebond, se trompe davantage quand la bille va vite
    // ou rebondit sur les murs, et sa raquette a une vitesse limitée (doigt, souris)
    function humanStep(dt) {
      const p = S.paddle, H2 = bot;
      let tgt = null, best = 1e9;
      for (const b of S.balls) { if (b.stuck) continue; const tt = b.vy > 0 ? (PY - b.y) / b.vy : 9; if (tt < best) { best = tt; tgt = b; } }
      if (S.balls.some((b) => b.stuck)) { H2.wait = (H2.wait || 0) + dt; if (H2.wait > 0.6) { launch(); H2.wait = 0; } }
      if (tgt) {
        const dirKey = tgt.vy > 0 ? 1 : -1, sig = Math.round(tgt.vx) + ':' + dirKey;
        if (sig !== H2.lastSig) { H2.lastSig = sig; H2.seen = 0; H2.noise = null; }
        H2.seen += dt;
        if (tgt.vy > 0 && H2.seen > H2.react) {
          if (H2.noise == null) {
            const sp = Math.hypot(tgt.vx, tgt.vy), k = Math.pow(sp / 330, 1.6) * (1 + 0.7 * reflections(tgt)) * (S.balls.length > 1 ? 1.4 : 1);
            H2.noise = (Math.random() + Math.random() + Math.random() - 1.5) * 1.15 * H2.sigma * k;
          }
          H2.tx = predictX(tgt) + H2.noise;
        } else if (tgt.vy < 0 && H2.seen > H2.react) {
          const c = S.caps.find((c2) => !POWERS[c2.key].bad && c2.y > PY - 160);
          H2.tx = c ? c.x : lerp(p.x, W / 2, 0.02);
        }
      }
      if (H2.tx != null && (!tgt || tgt.vy < 0 || best > 0.55)) for (const sh of S.shots) {
        if (sh.reward || sh.vy <= 0) continue;
        const tt = (PY - sh.y) / sh.vy;
        if (tt > 0 && tt < 0.9 && Math.abs(sh.x + sh.vx * tt - H2.tx) < p.w / 2 + 12) H2.tx = sh.x + (sh.x < H2.tx ? 1 : -1) * (p.w / 2 + 22);
      }
      for (const bm of S.beams) if (bm.t > bm.warn * 0.5 && H2.tx != null && Math.abs(bm.x - H2.tx) < bm.w / 2 + p.w / 2 && (!tgt || tgt.vy < 0 || best > 0.7)) H2.tx = bm.x + (bm.x < W / 2 ? 1 : -1) * (bm.w / 2 + p.w / 2 + 8);
      if (H2.tx != null) { const d = H2.tx - p.x, mv = H2.vmax * dt; p.tx = clamp(p.x + clamp(d, -mv, mv), WALL + p.w / 2, W - WALL - p.w / 2); }
    }
    function botStep(dt) {
      if (bot.human) { humanStep(dt); return; }
      const p = S.paddle;
      bot.t -= dt;
      if (bot.t > 0) return;
      bot.t = bot.react;
      let tgt = null, best = 1e9;
      for (const b of S.balls) { if (b.stuck) continue; const tt = b.vy > 0 ? (PY - b.y) / b.vy : 5 + (PY - b.y) / 300; if (tt < best) { best = tt; tgt = b; } }
      // les capsules qui tombent (les bonnes) attirent le robot quand la bille monte
      let x = p.x;
      if (tgt) x = predictX(tgt) + (tgt.vy > 0 ? bot.aim : 0) + rand(-bot.err, bot.err);
      if (tgt && tgt.vy < 0) { const c = S.caps.find((c2) => !POWERS[c2.key].bad && c2.y > PY - 200); if (c) x = c.x; }
      // éviter les rayons annoncés
      for (const bm of S.beams) if (Math.abs(bm.x - x) < bm.w / 2 + p.w / 2 && (!tgt || tgt.vy < 0 || best > 0.6)) x = bm.x + (bm.x < W / 2 ? 1 : -1) * (bm.w / 2 + p.w / 2 + 6);
      p.tx = clamp(x, WALL + p.w / 2, W - WALL - p.w / 2);
      if (S.balls.some((b) => b.stuck)) launch();
      bot.aim = (Math.random() - 0.5) * p.w * 0.5;
    }

    // ===================================================================== ENTRÉES
    function pause() { if (paused || S.state === 'over' || destroyed) return; paused = true; keys.left = keys.right = false; drag = null; pauseIcon(true); try { render(); } catch (e) { /* rien */ } }
    function resume() { if (!paused) return; paused = false; last = performance.now(); pauseIcon(false); }
    function visibleRoot() { return root.offsetParent !== null; }
    function isTyping(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
    function fieldX(clientX) { const r = canvas.getBoundingClientRect(); return (clientX - r.left - FX) / U; }
    function primaryAction() {
      if (tuto) { tutoNext(false); return true; }
      if (paused) { resume(); return true; }
      if (S.state === 'trip' && S.trip && S.trip.t > 1.0 && S.trip.t < TRIP_STAMP + TRIP_FLY) { S.trip.t = TRIP_STAMP + TRIP_FLY; return true; }
      if (S.state === 'clear' && S.st > 1.0) { advanceClear(); return true; }
      if (S.state === 'intro' && S.st > 0.9 && S.st < S.introDur - 0.5) { S.st = S.introDur - 0.5; return true; }
      if (S.state === 'play') return launch();
      return false;
    }
    function onKeyDown(e) {
      if (!visibleRoot() || isTyping(e)) return;
      const k = e.key, code = e.code;
      if (k === 'p' || k === 'P' || k === 'Escape') {
        if (tuto && k === 'Escape') { tutoNext(true); e.preventDefault(); return; }
        if (paused) resume(); else pause();
        e.preventDefault(); return;
      }
      if (tuto) { if (k === 'Enter' || k === ' ' || code === 'Space' || k === 'ArrowRight') { tutoNext(false); e.preventDefault(); } return; }
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
      else if (k === ' ' || code === 'Space' || k === 'ArrowUp' || k === 'Enter') { primaryAction(); e.preventDefault(); }
    }
    function onKeyUp(e) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') keys.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    }
    function inRect(x, y, R) { return x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h; }
    function onPDown(e) {
      if (destroyed) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (tuto) { tutoNext(inRect(x, y, tutoSkipRect())); return; }
      if (paused) { resume(); return; }
      if (S.state === 'trip' || S.state === 'clear') { primaryAction(); return; }
      if (e.pointerType === 'mouse' && S.state === 'intro') { mouseMode = true; S.paddle.tx = fieldX(e.clientX); primaryAction(); return; }
      if (e.pointerType === 'mouse') {
        mouseMode = true; S.paddle.tx = fieldX(e.clientX);
        if (S.state === 'play') launch();
        return;
      }
      if (drag) return;
      drag = { id: e.pointerId, x: e.clientX, moved: 0, t0: performance.now() };
    }
    function onPMove(e) {
      if (destroyed || paused || tuto) return;
      if (e.pointerType === 'mouse') { mouseMode = true; S.paddle.tx = fieldX(e.clientX); return; }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
      mouseMode = false;
      S.paddle.tx = clamp(S.paddle.tx + (dx / U) * 1.3, WALL + S.paddle.w / 2, W - WALL - S.paddle.w / 2);
    }
    function onPUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const tap = drag.moved < 12;
      drag = null;
      if (S.state === 'intro' && tap) { primaryAction(); return; }
      if (S.state === 'play' && S.balls.some((b) => b.stuck)) launch();
    }
    function onBtn(e) { e.preventDefault(); e.stopPropagation(); if (tuto) return; if (paused) resume(); else pause(); }
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(pauseBtn, 'pointerdown', onBtn);
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(doc, 'visibilitychange', () => { if (doc.hidden) pause(); });
    on(window, 'blur', () => { keys.left = keys.right = false; });
    let ro = null;
    try { ro = new ResizeObserver(() => { layout(); }); ro.observe(root); } catch (e) { on(window, 'resize', layout); }
    function syncButtons() {
      const vis = tuto || S.state === 'over' || S.state === 'dying' ? 'none' : 'flex';
      if (pauseBtn.style.display !== vis) pauseBtn.style.display = vis;
      const cur = !touchUI && S.state === 'play' && !paused ? 'none' : 'default';
      if (canvas.style.cursor !== cur) canvas.style.cursor = cur;
    }

    // ===================================================================== BOUCLE
    let last = performance.now(), perfSum = 0, perfN = 0, frozen = false;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (!paused) {
        if (!frozen) update(dt);
        try { render(); } catch (e) { if (!renderErr) { renderErr = e; try { console.error('carreaux : ' + (e && e.message)); } catch (e2) { /* rien */ } } }
      }
      syncButtons();
      if (S.state === 'play' && !doc.hidden && dt > 0) {
        perfSum += dt; perfN++;
        if (perfN >= 150) {
          if (perfSum / perfN > 0.0215 && quality > 0.62) { quality = Math.max(0.6, quality - 0.2); layout(); }
          perfSum = 0; perfN = 0;
        }
      }
      if (S.state === 'over' && S.st > 4) { cancelAnimationFrame(raf); raf = 0; }
    }

    // ===================================================================== DÉPART
    layout();
    started = true;
    startLevel(START);
    try { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { /* les textes sont redessinés à chaque image */ }); } catch (e) { /* rien */ }
    if (doc.hidden) { paused = true; pauseIcon(true); }
    try { render(); } catch (e) { /* rien */ }
    raf = requestAnimationFrame(frame);
    cartePlaying++;      // (la carte d'avancement ne prépare rien pendant une partie)

    return {
      currentScore: () => Math.max(0, Math.floor(S.score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => S.level,                           // niveau en cours (musique plus énergique, carte d'avancement)
      // accès de diagnostic (tests uniquement)
      _debug: {
        info: () => ({
          state: S.state, st: S.st, clock: S.clock, level: S.level, world: S.wi, wid: S.wid, worldName: CARREAUX_WORLDS[S.wi].name, tour: S.tour, stage: S.stage, isBoss: S.isBoss,
          score: S.score, remaining: S.remaining, total: S.total, combo: S.combo, bestCombo: S.bestCombo, paused, tuto: tuto ? tuto.step : null, overCalled: S.overCalled,
          balls: S.balls.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), stuck: b.stuck })),
          paddle: { x: S.paddle.x, w: S.paddle.w, stun: S.paddle.stun }, eff: Object.assign({}, S.eff), caps: S.caps.length, shots: S.shots.length, beams: S.beams.length,
          boss: S.boss ? { id: S.boss.id, hp: S.boss.hp, max: S.boss.max, ph: S.boss.ph, state: S.boss.state, head: S.boss.head ? S.boss.name : null, x: S.boss.x, y: S.boss.y } : null,
          trip: S.trip ? { t: S.trip.t, from: S.trip.from, to: S.trip.to } : null, levelT: S.levelT, off: S.off, danger: S.danger,
          fx: S.parts.length, quality, layout: { cw, ch, U, FX, FY, wide, touchUI, dpr }, renderErr: renderErr ? String(renderErr.message) : null, stats: S.stats,
          portraits: S.tiles.filter((t) => t.kind === 'p' && t.alive).map((t) => t.name)
        }),
        sig: () => JSON.stringify({ level: S.level, tiles: S.tiles.map((t) => [t.kind, t.v, t.c, t.r, t.power || 0, t.name || 0]), boss: S.boss ? [S.boss.id, S.boss.max, S.boss.name] : 0 }),
        skipTuto: () => { if (tuto) tutoNext(true); },
        god: (v) => { god = !!v; },
        bot: (o) => { bot = o ? Object.assign({ react: 0.05, err: 6, aim: 0, t: 0, sigma: 14, vmax: 900 }, o === true ? {} : o) : null; },
        setX: (x) => { S.paddle.tx = S.paddle.x = clamp(x, WALL + S.paddle.w / 2, W - WALL - S.paddle.w / 2); },
        launch: () => launch(),
        setLevel: (n) => { S.trip = null; startLevel(Math.max(1, n | 0)); },
        play: () => { if (S.state === 'intro') { S.state = 'play'; S.st = 0; S.introT = 9; } },
        clearTiles: () => { for (const t of S.tiles.slice()) if (t.alive && t.kind !== 'm') breakTile(t, null, 'clean'); },
        bossHit: (n) => { if (S.boss) for (let i = 0; i < (n || 1); i++) { S.boss.hitCd = 0; if (S.boss.state === 'phase') { S.boss.state = 'fight'; } hitBoss(1, S.boss.x, S.boss.y, null); } },
        bossPhase: (ph) => { if (S.boss) { S.boss.state = 'fight'; S.boss.hp = Math.ceil(S.boss.max * (1 - ph / 3)) - 0.01; S.boss.hitCd = 0; hitBoss(0.01, S.boss.x, S.boss.y, null); } },
        lose: () => startDying('ball'),
        attack: (n) => { if (S.boss) { S.boss.atkT = 99; return bossAttack(n); } },
        power: (k) => applyPower(k, S.paddle.x),
        trip: () => { if (S.state === 'play' || S.state === 'clear') startTrip(); },
        tripAt: (t) => { if (S.trip) S.trip.t = t; },
        pause: () => pause(), resume: () => resume(), freeze: (v) => { frozen = !!v; },
        quality: (q) => { quality = q; layout(); },
        render: () => render(),
        state: () => S
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cartePlaying = Math.max(0, cartePlaying - 1);
        cancelAnimationFrame(raf); raf = 0;
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        listeners.length = 0;
        sfxQ.length = 0;
        S.parts = []; S.tiles = []; S.balls = []; S.shots = []; S.caps = []; S.boss = null;
        tileCache.clear(); scene = null; nextScene = null; mural = null;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  // ===========================================================================
  // VIGNETTE ANIMÉE (accueil) : les pays défilent, la bille casse leurs carreaux
  // ===========================================================================
  const PV = { key: '', scenes: {}, tiles: {}, broken: {}, parts: [], last: -1, lastHit: -1, wi: -1 };
  function pvScene(wi, w, h) {
    const key = wi + '|' + w + 'x' + h;
    if (!PV.scenes[key]) {
      if (Object.keys(PV.scenes).length >= 12) PV.scenes = {};          // la vignette a changé de taille : on oublie les anciennes
      const U2 = Math.min(w / W, h / H) * 2.2, F = { w: W * U2, h: H * U2 };
      F.x = (w - F.w) / 2; F.y = (h - F.h) * 0.62;
      const sc = paintScene(CARREAUX_WORLDS[wi].id, w, h, F, 2);
      const c = mkCanvas(w * 2, h * 2), g = c.getContext('2d');
      g.drawImage(sc.back, 0, 0); g.drawImage(sc.front, 0, 0);
      PV.scenes[key] = c;
    }
    return PV.scenes[key];
  }
  function pvTile(wi, v, s, fresco) {
    const key = wi + '|' + v + '|' + Math.round(s) + (fresco ? '|' + fresco : '');
    if (!PV.tiles[key]) {
      if (Object.keys(PV.tiles).length >= 120) PV.tiles = {};
      const c = mkCanvas(s * 2 + 6, s * 2 + 6), g = c.getContext('2d');
      g.translate(3, 3); g.scale(2, 2);
      g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 3; g.shadowOffsetY = 1.2; g.fillStyle = 'rgba(0,0,0,0.5)'; rr(g, 0.5, 0.5, s - 1, s - 1, s * 0.08); g.fill(); g.restore();
      const wid = CARREAUX_WORLDS[wi].id, vv = wid === 'rome' ? ['w', 't', 'o', 'y', 'b', 'c'][v % 6] : v;
      g.save(); g.scale(s / 32, s / 32);
      if (wid === 'japon' && fresco) { if (!PV.mural) { PV.mural = mkCanvas(9 * 64, 4 * 64); const mg = PV.mural.getContext('2d'); mg.scale(2, 2); paintFujiMural(mg, 9 * 32, 4 * 32); } paintFresco(g, 32, PV.mural, fresco[0] * 64, fresco[1] * 64, 64, 64); }
      else if (wid === 'rome') { for (let i = 0; i < 4; i++) { g.save(); g.translate((i % 2) * 16, (i >> 1) * 16); paintTessera(g, 'n', ['w', 't', 'o', 'y', 'b', 'c'][(v + i) % 6], 16, v * 4 + i); g.restore(); } }
      else paintTileOf(g, wid, 'n', vv, 32, v);
      g.restore();
      PV.tiles[key] = c;
      void vv;
    }
    return PV.tiles[key];
  }
  function preview(ctx, w, h, t) {
    try {
      const per = 5, wi = Math.floor(t / per) % NW, local = t % per;
      const Wd = CARREAUX_WORLDS[wi];
      if (wi !== PV.wi) { PV.wi = wi; PV.broken = {}; PV.parts = []; }
      ctx.drawImage(pvScene(wi, w, h), 0, 0, w, h);
      // carrelage : 2 rangées
      const cols = 9, s = Math.min(w / (cols + 1.2), h * 0.16), gx = w / 2 - (cols * s) / 2, gy = h * 0.2;
      ctx.fillStyle = rgba(Wd.colors.dark, 0.35); ctx.fillRect(0, 0, w, h);
      for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
        const k = r * cols + c, b = PV.broken[k];
        if (b != null && local - b < 3.6) continue;
        const sp = pvTile(wi, (c + r * 2) % 5, s, Wd.id === 'japon' ? [c, r + 1] : null);
        ctx.drawImage(sp, gx + c * s - 1.5, gy + r * s - 1.5, s + 3, s + 3);
      }
      // la bille : rebonds entre la raquette et les carreaux
      const ph = (local * 0.9) % 1, bounceUp = ph < 0.5, k2 = bounceUp ? ph * 2 : (1 - ph) * 2;
      const cyc = Math.floor(local * 0.9);
      const col = Math.floor(hash(cyc * 3.7 + wi) * cols), row = 1;
      const tx = gx + col * s + s / 2, padY = h * 0.86, topY = gy + (row + 1) * s + 4;
      const px = w / 2 + Math.sin(cyc * 1.9 + wi) * w * 0.26;
      const bx = lerp(px, tx, k2), by = lerp(padY - 6, topY, easeOut(k2));
      if (!bounceUp && PV.lastHit !== cyc + wi * 1000) {
        PV.lastHit = cyc + wi * 1000;
        PV.broken[row * cols + col] = local;
        const c0 = tileColors(Wd.id, 'n', col % 5);
        for (let i = 0; i < 12; i++) PV.parts.push({ x: tx, y: topY - s / 2, vx: rand(-60, 60), vy: rand(-80, 10), life: 0.8, col: i % 3 ? c0[0] : c0[1], s: rand(1.2, 2.6) });
      }
      // éclats
      const dtp = PV.last >= 0 ? clamp(t - PV.last, 0, 0.1) : 0.033; PV.last = t;
      for (const p of PV.parts) { p.life -= dtp; p.vy += 260 * dtp; p.x += p.vx * dtp; p.y += p.vy * dtp; }
      PV.parts = PV.parts.filter((p) => p.life > 0);
      for (const p of PV.parts) { ctx.globalAlpha = clamp(p.life / 0.8, 0, 1); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2); }
      ctx.globalAlpha = 1;
      // raquette
      const pw = w * 0.2, pxx = lerp(px, bx, 0.5);
      rr(ctx, pxx - pw / 2, padY, pw, h * 0.045, h * 0.0225);
      ctx.fillStyle = lin(ctx, 0, padY, 0, padY + h * 0.045, [[0, '#ffffff'], [1, shade(Wd.colors.accent, 0.3)]]); ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,30,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      // traînée + bille
      ctx.fillStyle = rgba(Wd.colors.accent, 0.3);
      for (let i = 1; i < 5; i++) { const kk = clamp(k2 - (bounceUp ? i * 0.04 : -i * 0.04), 0, 1); circ(ctx, lerp(px, tx, kk), lerp(padY - 6, topY, easeOut(kk)), h * 0.025 * (1 - i * 0.15)); ctx.fill(); }
      ctx.fillStyle = rad(ctx, bx - 2, by - 2, 0, bx, by, h * 0.035, [[0, '#ffffff'], [1, mix(Wd.colors.accent, '#ffffff', 0.4)]]);
      circ(ctx, bx, by, h * 0.03); ctx.fill();
      // médaillon du pays + nom
      ctx.save(); ctx.translate(w - h * 0.13, h * 0.86); paintWorldIcon(ctx, wi, h * 0.085, t); ctx.restore();
      ctx.save();
      ctx.font = Math.round(h * 0.07) + "px 'Bungee', Impact, sans-serif"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const nm = Wd.short.toUpperCase(), fa = clamp(local / 0.4, 0, 1) * clamp((per - local) / 0.4, 0, 1), tw = ctx.measureText(nm).width;
      ctx.globalAlpha = fa;
      rr(ctx, h * 0.04, h * 0.035, tw + h * 0.1, h * 0.11, h * 0.055); ctx.fillStyle = 'rgba(8,10,28,0.72)'; ctx.fill(); ctx.strokeStyle = rgba(Wd.colors.accent, 0.9); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = Wd.colors.accent2; ctx.fillText(nm, h * 0.09, h * 0.093);
      ctx.restore();
    } catch (e) { /* la vignette ne doit jamais lever d'erreur */ }
  }

  // ===========================================================================
  // CARTE D'AVANCEMENT (bibliothèque, shell2.js : MAP_DEFS.carreaux, thème « carreaux ») — le tour du monde des carreaux, de bas
  // en haut : Lisbonne au petit matin, Marrakech l'après-midi, Rome au coucher du soleil, Kyoto au crépuscule, Puebla la nuit de
  // fête, le Palais de cristal sous les aurores, puis le Tour II. Chaque pays est peint avec son VRAI décor (paintScene, à la taille
  // de sa bande) ; entre deux pays, l'avion du voyageur traverse les nuages, à côté du tampon du passeport du pays fini ; à chaque
  // nouveau tour, le globe et la route du voyage. Un niveau = un carreau du pays (celui du niveau) ; un boss = son vrai dessin dans
  // un médaillon en mosaïque. Rien de tout ça ne sert pendant une partie.
  // L (mise en page de la bibliothèque) : nodes [{ lv, x, y, info: { w, tour, stage, tier }, boss? }], tiers [{ t, y, yLo, yHi }], start, H.
  // ===========================================================================
  // la transition vers le pays du palier i : la mer de nuages, juste au-dessus de l'enseigne du pays (posée sur le ciel du pays d'avant)
  const CARTE_UP = 128;
  function carteSeam(L, i) { return i ? L.tiers[i].y - CARTE_UP : L.H; }
  function carteBands(L) {
    const out = [];
    for (let i = 0; i < L.tiers.length; i++) {
      const t = L.tiers[i], tt = Math.max(0, t.t | 0);
      out.push({ i, t, w: tt % NW, tour: Math.floor(tt / NW), bot: carteSeam(L, i), top: i + 1 < L.tiers.length ? carteSeam(L, i + 1) : 0, last: i + 1 >= L.tiers.length });
    }
    return out;
  }
  // où passe le chemin (courbes de la bibliothèque : M a C (a.x, mi) (b.x, mi) b) à la hauteur y → x
  function cartePathX(L, y) {
    const pts = [L.start];
    for (const n of L.nodes) { pts.push(n); if (n.boss) pts.push(n.boss); }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (y > a.y || y < b.y) continue;
      const my = (a.y + b.y) / 2;
      let lo = 0, hi = 1;
      for (let k = 0; k < 22; k++) { const t = (lo + hi) / 2, u = 1 - t, yy = a.y * u * u * u + 3 * my * u * u * t + 3 * my * u * t * t + b.y * t * t * t; if (yy > y) lo = t; else hi = t; }
      const t = (lo + hi) / 2, u = 1 - t;
      return a.x * u * u * u + 3 * a.x * u * u * t + 3 * b.x * u * t * t + b.x * t * t * t;
    }
    return L.W / 2;
  }
  // les textes d'un niveau sur la carte : nom, ligne
  function carteLevel(level) {
    const n = Math.max(1, Math.floor(Number(level)) || 1), wo = worldOf(n), D = wo.world, base = LEVELS[(n - 1) % TOUR_LEN];
    if (wo.boss) return { name: base.name, line: '☠ ' + (wo.tour ? D.boss.title + ', encore plus coriace' : D.boss.line) };
    if (!wo.tour) return { name: base.name, line: base.tip ? '✦ ' + base.tip : '' };
    return { name: base.name, line: '✦ ' + (wo.tour % 2 ? 'En miroir, carreaux plus solides' : 'Carreaux plus solides : ça descend !') };
  }
  // fond (sous les décors) : la couleur de chaque pays, pour les bords et le temps que les décors se peignent
  function carteStopsFor(L) {
    const st = [];
    for (const b of carteBands(L)) { const C = CARREAUX_WORLDS[b.w].colors; st.push([b.bot - 2, mix(C.ground, C.dark, 0.35)], [Math.max(b.top + 2, (b.top + b.bot) / 2), mix(C.sky, C.dark, 0.25)]); }
    st.push([L.H, '#f3e7cf'], [0, '#04060f']);
    return st;
  }
  // le vrai décor d'un pays à la taille de sa bande (ciel, ville, sol), gardé
  const carteScn = new Map();
  function carteScene(wi, w, h, k) {
    const key = wi + '|' + Math.round(w) + 'x' + Math.round(h) + '@' + k.toFixed(2);
    let cv = carteScn.get(key);
    if (cv) return cv;
    if (carteScn.size > 14) carteScn.delete(carteScn.keys().next().value);
    const s = Math.min(w / W, h / H), F = { x: (w - W * s) / 2, y: (h - H * s) / 2, w: W * s, h: H * s };
    const sc = paintScene(CARREAUX_WORLDS[wi].id, w, h, F, k);
    cv = sc.back;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sc.front, 0, 0);
    carteScn.set(key, cv);
    return cv;
  }
  // entre deux pays : la mer de nuages que l'avion traverse (au-dessus de l'enseigne du nouveau pays), le tampon du passeport du pays
  // fini (sous l'enseigne, sur le ciel du pays fini) ; avion et tampon de part et d'autre de la route
  function carteFlight(x, L, MW, b, prev, R, noPlane) {
    const y = b.bot, px = cartePathX(L, y), C = CARREAUX_WORLDS[b.w].colors;
    x.save();
    // la lumière du pays suivant qui descend sur les nuages
    x.fillStyle = lin(x, 0, y - 90, 0, y + 70, [[0, rgba(C.sky, 0)], [0.5, rgba(mix(C.sky, '#ffffff', 0.55), 0.55)], [1, rgba('#ffffff', 0)]]);
    x.fillRect(0, y - 90, MW, 160);
    const n = Math.ceil(MW / 64) + 3;
    for (let row = 0; row < 3; row++) for (let k = 0; k < n; k++) {
      const cw = 120 + R() * 70 - row * 16, X = k * 64 - 60 + R() * 30 + (row % 2) * 32, Y = y - 34 + row * 24 + R() * 10;
      const col = row === 2 ? mix('#ffffff', C.sky, 0.18) : row ? '#f4f8ff' : '#ffffff';
      cloudBlob(x, X, Y, cw, col, row === 2 ? 0.9 : 0.97);
    }
    x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < MW / 20; i++) { circ(x, R() * MW, y - 50 + R() * 100, 1 + R() * 2); x.fill(); }
    // l'avion, dans les nuages, du côté où la route ne passe pas
    if (!noPlane) {
      const right = px < MW / 2, ax = right ? Math.min(MW - 52, Math.max(px + 92, MW * 0.66)) : Math.max(52, Math.min(px - 92, MW * 0.34));
      x.save(); x.translate(ax, b.t.y - 112); x.scale(right ? 1 : -1, 1); x.rotate(-0.24); paintPlane(x, 0.78, 0.37, null); x.restore();      // (entre l'étiquette du niveau et l'enseigne)
    }
    // le tampon du pays qu'on vient de finir, sous l'enseigne (à moitié caché par elle, comme sur une carte postale)
    const sy = b.t.y + 72, qx = cartePathX(L, sy), sl = qx > MW / 2, sx = sl ? Math.max(40, Math.min(qx - 105, MW * 0.5 - 115)) : Math.min(MW - 40, Math.max(qx + 105, MW * 0.5 + 115));
    x.save(); x.translate(sx, sy); x.rotate(sl ? -0.22 : 0.2); paintStamp(x, prev.w, 31, 2.4); x.restore();
    x.restore();
  }
  // nouveau tour : le globe du voyage, la route de l'avion entre les six villes, et les nuages
  function carteGlobe(x, L, MW, b, R) {
    carteFlight(x, L, MW, b, { w: NW - 1 }, R, true);
    // le globe se lève derrière le grand bandeau « Tour II » (posé 92 px sous l'enseigne)
    const gx = MW / 2, Rg = Math.min(80, MW * 0.21), gy = b.t.y + 92 + Rg * 0.5;
    x.save(); x.fillStyle = rad(x, gx, gy, Rg * 0.8, gx, gy, Rg * 1.9, [[0, 'rgba(120,200,255,0.35)'], [1, 'rgba(120,200,255,0)']]); circ(x, gx, gy, Rg * 1.9); x.fill(); x.restore();
    x.save(); x.translate(gx, gy);
    paintGlobe(x, Rg, 10, 30, 0.5);
    x.strokeStyle = 'rgba(255,211,77,0.9)'; x.lineWidth = 2; x.setLineDash([4, 4]);
    for (let i = 0; i + 1 < NW; i++) {
      const a = CARREAUX_WORLDS[i].geo, c = CARREAUX_WORLDS[i + 1].geo;
      x.beginPath(); let on = false;
      for (let k = 0; k <= 16; k++) {
        const p = greatCircle(a, c, k / 16), q = orth(p.lon, p.lat, 10, 30);
        if (!q.vis) { on = false; continue; }
        if (on) x.lineTo(q.x * Rg, q.y * Rg); else { x.moveTo(q.x * Rg, q.y * Rg); on = true; }
      }
      x.stroke();
    }
    x.setLineDash([]);
    for (const Wd of CARREAUX_WORLDS) { const q = orth(Wd.geo.lon, Wd.geo.lat, 10, 30); if (!q.vis) continue; x.fillStyle = '#ff4fa8'; circ(x, q.x * Rg, q.y * Rg, 3); x.fill(); x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.stroke(); }
    x.restore();
  }
  function cartePaintChunk(x, L, MW, y0, h) {
    const B = carteBands(L), k = Math.max(1, Math.min(1.6, Math.abs(x.getTransform().a) || 1));
    x.save(); x.translate(0, -y0);
    for (const b of B) {
      if (b.top > y0 + h || b.bot < y0) continue;
      try { x.drawImage(carteScene(b.w, MW, b.bot - b.top, k), 0, b.top, MW, b.bot - b.top); } catch (e) { /* */ }
    }
    for (const b of B) {
      if (!b.i || b.bot - 140 > y0 + h || b.bot + 380 < y0) continue;
      try { if (b.w === 0) carteGlobe(x, L, MW, b, mulberry32(b.t.t * 977 + 13)); else carteFlight(x, L, MW, b, B[b.i - 1], mulberry32(b.t.t * 977 + 13)); } catch (e) { /* */ }
    }
    // tout en haut : la suite se perd dans la nuit
    const lb = B.length ? B[B.length - 1] : null, fadeTo = lb ? Math.min(lb.bot - 80, L.capY != null ? L.capY + 130 : 300) : 300;
    if (y0 < fadeTo) { x.fillStyle = lin(x, 0, 0, 0, fadeTo, [[0, 'rgba(4,6,15,0.94)'], [1, 'rgba(4,6,15,0)']]); x.fillRect(0, y0, MW, Math.min(h, fadeTo - y0)); }
    x.restore();
  }

  // ---- un niveau : LE carreau du niveau (celui qu'on y casse le plus), posé de biais, vernis brillant ----
  function carteTileOf(idx) {
    const L0 = LEVELS[idx], wo = worldOf(idx + 1), wid = wo.world.id;
    if (wo.boss) return { wid, kind: 'h', v: 0 };
    if (L0.fresco) return { wid, fresco: [4, 1] };
    const cnt = {};
    for (const row of L0.map) for (const ch of row) if (ch !== '.' && ch !== '#' && ch !== '$' && ch !== '*') cnt[ch] = (cnt[ch] || 0) + 1;
    const keys = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || (a < b ? -1 : 1));
    if (L0.mosaic) return { wid, tess: (keys.length ? keys : ['w', 't', 'o', 'y']).slice(0, 4).map((c) => c.toLowerCase()).filter((c) => TESS[c]) };
    const ch = keys.find((c) => /[0-5]/.test(c)) || keys[0] || '0';
    if (/[0-5]/.test(ch)) return { wid, kind: 'n', v: +ch };
    if (/[a-f]/.test(ch)) return { wid, kind: 's', v: (ch.charCodeAt(0) - 97) % 2 };
    return { wid, kind: 'n', v: 0 };
  }
  const carteMed = new Map();
  function carteMedImg(key, P, dpr, paint) {
    let cv = carteMed.get(key);
    if (cv) return cv;
    if (carteMed.size > 120) carteMed.delete(carteMed.keys().next().value);
    cv = mkCanvas(P * dpr, P * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    try { paint(g); } catch (e) { /* */ }
    carteMed.set(key, cv);
    return cv;
  }
  const carteNodeKey = (lv, size, P, dpr) => 'n' + ((lv - 1) % TOUR_LEN) + '|' + size + '|' + P + '|' + dpr.toFixed(2);
  function carteNode(x, info, size, P) {
    const dpr = x.canvas.width / P, lv = Math.max(1, (info && info.lv) | 0);
    x.drawImage(carteMedImg(carteNodeKey(lv, size, P, dpr), P, dpr, (g) => carteNodePaint(g, lv, size, P)), 0, 0, P, P);
  }
  function carteNodePaint(x, lv, size, P) {
    const idx = (lv - 1) % TOUR_LEN, wo = worldOf(lv), C = wo.world.colors, T = carteTileOf(idx);
    const cx = P / 2, cy = P / 2, s = size * 0.78;
    x.fillStyle = rad(x, cx, cy, s * 0.3, cx, cy, size * 0.62 + 8, [[0, rgba(C.accent, 0.6)], [1, rgba(C.accent, 0)]]);
    circ(x, cx, cy, size * 0.62 + 8); x.fill();
    x.save();
    x.translate(cx, cy); x.rotate(((idx * 37) % 9 - 4) * 0.025);
    // ombre portée, liseré à la couleur du pays, puis le carreau
    x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 6; x.shadowOffsetY = 3;
    x.fillStyle = C.accent; rr(x, -s / 2 - 3, -s / 2 - 3, s + 6, s + 6, s * 0.16); x.fill(); x.restore();
    x.fillStyle = '#ffffff'; rr(x, -s / 2 - 1.2, -s / 2 - 1.2, s + 2.4, s + 2.4, s * 0.12); x.fill();
    x.save(); x.translate(-s / 2, -s / 2);
    rr(x, 0, 0, s, s, s * 0.1); x.clip();
    if (T.fresco) {      // la fresque : tout le tableau du mont Fuji, en miniature, sur un seul carreau
      x.scale(s / 32, s / 32); paintFujiMural(x, 32, 32); glazeFx(x, 32, 32 * 0.06, 0.9, false);
    } else if (T.tess) {
      x.scale(s / 32, s / 32);
      for (let i = 0; i < 4; i++) { x.save(); x.translate((i % 2) * 16, (i >> 1) * 16); paintTessera(x, 'n', T.tess[i % T.tess.length] || 'w', 16, idx * 4 + i); x.restore(); }
    } else { x.scale(s / 32, s / 32); paintTileOf(x, T.wid, T.kind, T.v, 32, idx); }
    x.restore();
    // reflet du vernis
    x.fillStyle = lin(x, -s / 2, -s / 2, s / 2, s / 2, [[0, 'rgba(255,255,255,0.35)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.12)']]);
    rr(x, -s / 2, -s / 2, s, s, s * 0.1); x.fill();
    x.restore();
  }

  // ---- le boss : son vrai dessin, dans un médaillon cerclé de mosaïque (couronne d'or pour le dernier du tour) ----
  const carteBossKey = (bi, size, P, dpr) => 'b' + ((Math.max(1, bi.lv | 0) - 1) % TOUR_LEN) + (bi.final ? 'F' : '') + '|' + size + '|' + P + '|' + dpr.toFixed(2);
  function carteBoss(x, bi, size, P) {
    const dpr = x.canvas.width / P;
    x.drawImage(carteMedImg(carteBossKey(bi, size, P, dpr), P, dpr, (g) => carteBossPaint(g, bi, size, P)), 0, 0, P, P);
  }
  function carteBossPaint(x, bi, size, P) {
    const wo = worldOf(Math.max(1, bi.lv | 0)), C = wo.world.colors, cx = P / 2, cy = P / 2 + 2, r = size / 2;
    x.fillStyle = rad(x, cx, cy, 0, cx, cy, r + 17, [[0, bi.final ? 'rgba(255,211,77,0.6)' : rgba(C.accent, 0.55)], [1, rgba(C.accent, 0)]]);
    circ(x, cx, cy, r + 17); x.fill();
    // la couronne de mosaïque : petites tesselles aux couleurs du pays
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, col = [C.accent, C.accent2, '#ffffff'][i % 3];
      x.save(); x.translate(cx + Math.cos(a) * (r + 4.5), cy + Math.sin(a) * (r + 4.5)); x.rotate(a);
      x.fillStyle = col; rr(x, -2.6, -3.3, 5.2, 6.6, 1.2); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 0.7; x.stroke();
      x.restore();
    }
    x.fillStyle = rad(x, cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r, [[0, mix(C.sky, '#ffffff', 0.25)], [0.6, mix(C.sky, C.dark, 0.45)], [1, C.dark]]);
    circ(x, cx, cy, r); x.fill();
    x.save(); circ(x, cx, cy, r - 1.5); x.clip();
    drawBossIcon(x, wo.n, cx, cy + r * 0.08, r * 0.92, 0.6);
    x.restore();
    x.strokeStyle = bi.final ? '#ffd34d' : C.accent; x.lineWidth = 2.4; circ(x, cx, cy, r - 0.5); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = 1; circ(x, cx, cy, r - 4); x.stroke();
  }

  // ---- le départ : l'avion du voyageur, prêt à décoller ----
  function carteStart(x, P) {
    x.save(); x.translate(P * 0.5, P * 0.58);
    x.fillStyle = 'rgba(0,0,0,0.18)'; ell(x, 0, P * 0.2, P * 0.36, P * 0.05, 0); x.fill();
    paintPlane(x, P / 92, 0.3, null);
    x.restore();
  }

  // ---- au calme sur l'accueil : décors des pays et médaillons se préparent (rien pendant une partie) ----
  let cartePlaying = 0;
  function carteWarm(L, k, dpr, sizes) {
    if (!window.requestIdleCallback || !L) return;
    const idle = (f) => requestIdleCallback((dl) => { if (cartePlaying) setTimeout(() => idle(f), 3000); else if (dl.timeRemaining() < 4 && !dl.didTimeout) idle(f); else f(); }, { timeout: 2500 });
    const kk = Math.max(1, Math.min(1.6, k || 1)), jobs = [], seen = new Set();
    for (const b of carteBands(L)) { const key = b.w + '|' + Math.round(b.bot - b.top); if (!seen.has(key)) { seen.add(key); jobs.push(() => carteRaster(carteScene(b.w, L.W, b.bot - b.top, kk))); } }
    for (let w = 0; w < NW; w++) jobs.push(() => carteRaster(stampSprite(w, 31 * 2.4)));      // les tampons du passeport
    const ns = (sizes && sizes.node) || 56, bs = (sizes && sizes.boss) || 66;
    for (const nd of L.nodes) {
      const lv = nd.lv, P = ns + 24, key = carteNodeKey(lv, ns, P, dpr);
      if (!seen.has(key)) { seen.add(key); jobs.push(() => carteRaster(carteMedImg(key, P, dpr, (g) => carteNodePaint(g, lv, ns, P)))); }
      if (nd.boss) { const bi = nd.boss.bi || { lv }, P2 = bs + 34, key2 = carteBossKey(bi, bs, P2, dpr); if (!seen.has(key2)) { seen.add(key2); jobs.push(() => carteRaster(carteMedImg(key2, P2, dpr, (g) => carteBossPaint(g, bi, bs, P2)))); } }
    }
    const step = () => { const j = jobs.shift(); if (!j) return; try { j(); } catch (e) { /* */ } idle(step); };
    idle(step);
  }
  function carteRaster(cv) { try { const g = (carteRaster.x = carteRaster.x || mkCanvas(1, 1).getContext('2d')); g.clearRect(0, 0, 1, 1); g.drawImage(cv, 0, 0, 1, 1); } catch (e) { /* */ } }
  const mapArt = {
    warm: carteWarm,
    level: carteLevel,
    stops: carteStopsFor,
    paint: cartePaintChunk,
    node: carteNode,
    boss: carteBoss,
    start: carteStart
  };

  // ===========================================================================
  // ENREGISTREMENT (+ le tableau des mondes, lisible par la bibliothèque pour une carte d'avancement)
  // ===========================================================================
  // médaillon d'un pays (n = 1..6) centré en (x, y), rayon r ; t = temps (petite animation, facultatif)
  function drawWorldIcon(ctx, n, x, y, r, t) {
    try { ctx.save(); ctx.translate(x, y); paintWorldIcon(ctx, (Math.max(1, n | 0) - 1) % NW, r, t || 0); ctx.restore(); }
    catch (e) { try { ctx.restore(); } catch (e2) { /* rien */ } }
  }
  // tampon du passeport d'un pays (n = 1..6), pour la carte (pays terminé)
  function drawWorldStamp(ctx, n, x, y, r) {
    try { ctx.save(); ctx.translate(x, y); paintStamp(ctx, (Math.max(1, n | 0) - 1) % NW, r, 2); ctx.restore(); }
    catch (e) { try { ctx.restore(); } catch (e2) { /* rien */ } }
  }
  // le boss d'un pays (n = 1..6), sans tête de copain, tenant dans un cercle de rayon r centré en (x, y)
  let nepIcon = null;
  function drawBossIcon(ctx, n, x, y, r, t) {
    try {
      const W0 = CARREAUX_WORLDS[(Math.max(1, n | 0) - 1) % NW], id = W0.boss.id, A = BOSS_ART[id];
      const k = r / (Math.max(A.w, A.h) * 0.5);
      if (id === 'neptune' && !nepIcon) nepIcon = buildNeptuneTiles(null);
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(0, -A.cy);
      if (id === 'lustre') for (const p of LUSTRE_PENDS) paintPendant(ctx, p.x, p.y, t || 0, LUSTRE_PENDS.indexOf(p), false);
      A.paint(ctx, { t: t || 0, ph: 0, flash: 0, head: null, sad: false, dir: 1, walking: false, tiles: id === 'neptune' ? nepIcon : null, noRope: true, noChain: true, wave: 0.6 });
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) { /* rien */ } }
  }
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['carreaux'] = {
    id: 'carreaux',
    title: 'Casse-Carreaux',
    tagline: 'Fais le tour du monde en cassant les plus beaux carreaux, de Lisbonne au palais de cristal !',
    accent: '#1fc9a8',
    scoreLabel: 'points',
    worlds: CARREAUX_WORLDS,          // le parcours (carte d'avancement de la bibliothèque)
    levelsPerWorld: WPL,              // 3 niveaux par pays, le 3e = le boss ; un tour = 18 niveaux
    worldOf,                          // niveau → { w, n, tour, stage, boss, world }
    drawWorldIcon,                    // médaillon d'un pays : (ctx, n, x, y, r, t)
    drawIcon: drawWorldIcon,          // même signature que JDW_GAMES.mouches.worlds.drawIcon
    drawWorldStamp,                   // tampon du passeport : (ctx, n, x, y, r)
    drawBossIcon,                     // le boss du pays : (ctx, n, x, y, r, t)
    mapArt,                           // la carte d'avancement de la bibliothèque, dessinée par le jeu (p8b-carte.js)
    preview,
    mount
  };
})();
