(() => {
  'use strict';

  // ===========================================================================
  // CHASSE AUX MOUCHES — « L'été en Provence »
  // La bombe de lavande défend la maison de vacances contre les insectes, du matin à la nuit :
  // 6 MONDES de 3 vagues (2 vagues, puis le boss du monde), puis le jour suivant, plus coriace.
  // Tir automatique, une seule vie, combo jusqu'à x5, tapette géante (jauge), bulles de bonus.
  // L'aire de jeu logique est FIXE (400 x 760) : même partie sur tous les écrans (compétition) ;
  // le décor du monde remplit tout l'écran autour (téléphone en hauteur comme ordinateur).
  // ===========================================================================
  const W = 400, H = 760;
  const TAU = Math.PI * 2;
  const PY = H - 36;                 // dessus de l'étagère : base de la bombe
  const P_TOP = PY - 50;             // haut de la zone sensible de la bombe
  const SHY = PY - 148;              // haut des boucliers
  const SW = 50, SH = 40;            // boîte d'un bouclier (une cellule du masque = une unité)
  const COLS = 9, CW = 38, RH = 34;  // grille de la formation
  const SPR = 76;                    // boîte d'un sprite d'insecte (unités)
  const FRAMES = 6;                  // images du battement d'ailes
  const PER_WORLD = 3;               // vagues par monde (la 3e = le boss)
  const TUTO_KEY = 'jdw.mouches.tuto';
  const PMAX = 240, CMAX = 26;       // plafonds : particules, cadavres qui tombent
  const SPEED = 270;                 // vitesse de la bombe au clavier (unités / s)

  // ---------------------------------------------------------------------------
  // LES MONDES (lus aussi par la bibliothèque : window.JDW_GAMES.mouches.worlds)
  // name : nom affiché à l'arrivée ; hour : heure du jour ; acc/acc2 : couleurs ; bg0/bg1 : fond (carte) ;
  // boss : clé + nom du boss de fin de monde ; intro : insectes présentés à la 1re et 2e vague ;
  // waves : type des deux premières vagues ; shield : objet qui protège ; amb : vie du décor.
  // ---------------------------------------------------------------------------
  const WORLDS = [
    { id: 'bain', name: 'La salle de bain', hour: '8 h', when: 'Le matin', acc: '#4fc3f7', acc2: '#ff9ec7', bg0: '#0f2f4a', bg1: '#7fb8e8',
      boss: 'reine', intro: [['gnat', 'green'], ['blue']], waves: ['form', 'form'], shield: 'roll', amb: 'bubbles',
      news: 'Les mouches entrent par la fenêtre !', icon: 'bain' },
    { id: 'cuisine', name: 'La cuisine', hour: '10 h', when: 'La matinée', acc: '#ff9a3c', acc2: '#ffd34d', bg0: '#3a1d0c', bg1: '#e9b77a',
      boss: 'taon', intro: [['mosq'], ['fat']], waves: ['form', 'form'], shield: 'towel', amb: 'dust',
      news: 'Elles en veulent à la corbeille de fruits !', icon: 'cuisine' },
    { id: 'terrasse', name: 'La terrasse', hour: 'Midi', when: 'Midi pile', acc: '#ffd34d', acc2: '#7ccf4a', bg0: '#0b3a6e', bg1: '#5fb0ff',
      boss: 'frelon', intro: [['wasp'], []], waves: ['form', 'swarm'], shield: 'pot', amb: 'leaves',
      news: 'Les guêpes attaquent le pique-nique !', icon: 'terrasse' },
    { id: 'lavande', name: 'Le champ de lavande', hour: '15 h', when: "L'après-midi", acc: '#b98cff', acc2: '#ffb84d', bg0: '#2a1b52', bg1: '#b9a2f0',
      boss: 'bourdon', intro: [['taon'], []], waves: ['form', 'feast'], shield: 'bale', amb: 'petals', wind: true,
      news: 'Le mistral souffle : les gouttes dérivent !', icon: 'lavande' },
    { id: 'piscine', name: 'La piscine', hour: '19 h', when: 'Le coucher du soleil', acc: '#2fe0d0', acc2: '#ff7a59', bg0: '#3a1f4a', bg1: '#ff9f7a',
      boss: 'moustique', intro: [['dragon'], ['red']], waves: ['form', 'form'], shield: 'ring', amb: 'sparkles',
      news: 'Les libellules rasent l’eau !', icon: 'piscine' },
    { id: 'nuit', name: "La nuit d'été", hour: '23 h', when: 'La nuit', acc: '#c6f36b', acc2: '#ffd34d', bg0: '#050a1c', bg1: '#24365e',
      boss: 'sphinx', intro: [['moth'], []], waves: ['form', 'swarm'], shield: 'lantern', amb: 'fireflies', dark: true,
      news: 'Les guirlandes clignotent…', icon: 'nuit' }
  ];
  const NW = WORLDS.length;

  // ---------------------------------------------------------------------------
  // Insectes : points, taille, demi-boîte de collision, points de vie, nom (présentation), info
  // ---------------------------------------------------------------------------
  const TYPES = {
    gnat: { pts: 10, s: 0.87, hw: 11, hh: 10, hp: 1, name: 'Le moucheron', info: 'petit, mais pressé' },
    green: { pts: 20, s: 1.12, hw: 13, hh: 12, hp: 1, name: 'La mouche verte', info: 'elle lâche des gouttes' },
    blue: { pts: 30, s: 1.25, hw: 14, hh: 13, hp: 1, name: 'La mouche bleue', info: 'elle tire plus souvent' },
    mosq: { pts: 40, s: 1.12, hw: 12, hh: 13, hp: 1, name: 'Le moustique', info: 'il pique droit sur toi !' },
    fat: { pts: 50, s: 1.43, hw: 16, hh: 15, hp: 2, name: 'La dodue', info: 'deux coups… et elle se divise !' },
    wasp: { pts: 50, s: 1.19, hw: 13, hh: 13, hp: 1, name: 'La guêpe', info: 'elle zigzague et lance son dard' },
    taon: { pts: 60, s: 1.3, hw: 15, hh: 13, hp: 2, name: 'Le taon casqué', info: 'il faut deux coups' },
    taon0: { pts: 60, s: 1.3, hw: 15, hh: 13, hp: 1, name: 'Le taon', info: '' },
    dragon: { pts: 80, s: 1.21, hw: 24, hh: 11, hp: 1, name: 'La libellule', info: 'elle file d’un bord à l’autre' },
    red: { pts: 40, s: 1.16, hw: 13, hh: 12, hp: 1, name: 'La viseuse', info: 'elle vise ta bombe' },
    moth: { pts: 40, s: 1.25, hw: 16, hh: 12, hp: 1, name: 'Le papillon de nuit', info: 'attiré par ta lumière' }
  };
  // vague où chaque insecte entre dans la partie (1er tour) ; ensuite tout le monde est là
  const TYPE_AT = { gnat: 1, green: 1, blue: 2, mosq: 4, fat: 5, wasp: 7, taon: 10, dragon: 13, red: 14, moth: 16 };
  const PAL = {
    gnat: { hi: '#f2efe8', body: '#8d8478', dark: '#3b352e', head: '#2b2722', leg: '#2a241f', wing: [214, 226, 236] },
    green: { hi: '#d8ffb8', body: '#2fbf4f', dark: '#0b5a2a', head: '#123a22', leg: '#10261a', wing: [210, 255, 236] },
    blue: { hi: '#c8dcff', body: '#2f62e6', dark: '#0c1c64', head: '#0d1846', leg: '#0a1230', wing: [215, 230, 255] },
    mosq: { hi: '#e8edf2', body: '#4a525a', dark: '#14181c', head: '#1a1d21', leg: '#2a2f34', wing: [225, 238, 250] },
    fat: { hi: '#f4d2ff', body: '#a259ff', dark: '#3e1170', head: '#2a0b48', leg: '#1f0736', wing: [242, 228, 255] },
    wasp: { hi: '#fff4a0', body: '#ffcc1a', dark: '#7a5200', head: '#2a2008', leg: '#1d1606', wing: [235, 240, 255] },
    taon: { hi: '#ffe0b0', body: '#c97a2e', dark: '#4a2408', head: '#2d1606', leg: '#1d0e04', wing: [255, 240, 214] },
    taon0: { hi: '#ffe0b0', body: '#c97a2e', dark: '#4a2408', head: '#2d1606', leg: '#1d0e04', wing: [255, 240, 214] },
    dragon: { hi: '#c4fff4', body: '#18c6b4', dark: '#065a5a', head: '#0a3b46', leg: '#0b2a2e', wing: [200, 245, 255] },
    red: { hi: '#ffd0c4', body: '#ec3f2c', dark: '#640c06', head: '#3c0704', leg: '#2c0805', wing: [255, 226, 216] },
    moth: { hi: '#fff0d6', body: '#b89a74', dark: '#5a4630', head: '#4a3a28', leg: '#3a2c1e', wing: [228, 210, 182] }
  };
  // yeux (repère du sprite avant mise à l'échelle) : centre (±x, y), rayon
  const EYE = {
    gnat: [3.4, 8.6, 3.1], green: [3.8, 9.0, 3.4], blue: [3.9, 9.2, 3.5], mosq: [3.0, 8.4, 2.9], fat: [4.0, 9.6, 3.5],
    wasp: [3.6, 9.0, 3.3], taon: [3.9, 9.2, 3.4], taon0: [3.9, 9.2, 3.4], dragon: [4.2, 9.6, 3.9], red: [3.8, 9.0, 3.4], moth: [3.2, 8.4, 2.8]
  };

  // ---------------------------------------------------------------------------
  // Boss de fin de monde
  // ---------------------------------------------------------------------------
  const BOSSES = {
    reine: { name: 'LA REINE DES MOUCHES', line: 'Elle règne sur la salle de bain', hp: 56, hw: 71, hh: 62, oy: 6, y0: 212, sz: 240,
      cols: ['#2f62e6', '#b4d0ff', '#ffd34d'], as: 'en Reine des mouches', title: 'La Reine des mouches' },
    taon: { name: 'LE GROS TAON', line: 'Il fonce tête baissée !', hp: 66, hw: 78, hh: 62, oy: 3, y0: 204, sz: 250,
      cols: ['#c97a2e', '#ffe0b0', '#ff4d5e'], as: 'en Gros Taon', title: 'Le Gros Taon' },
    frelon: { name: 'LE FRELON GÉANT', line: 'Attention à ses dards !', hp: 74, hw: 71, hh: 68, oy: 0, y0: 202, sz: 250,
      cols: ['#ff8a1f', '#ffd27a', '#3a1c08'], as: 'en Frelon géant', title: 'Le Frelon géant' },
    bourdon: { name: 'LE BOURDON GÉANT', line: 'Il tourbillonne dans la lavande', hp: 82, hw: 90, hh: 59, oy: 0, y0: 194, sz: 272,
      cols: ['#ffc93a', '#fff2a0', '#1d1a14'], as: 'en Bourdon géant', title: 'Le Bourdon géant' },
    moustique: { name: 'LE MOUSTIQUE TIGRE', line: 'Il vise… et il pique !', hp: 86, hw: 62, hh: 71, oy: 6, y0: 216, sz: 256,
      cols: ['#3d444b', '#ffffff', '#ff4d5e'], as: 'en Moustique tigre', title: 'Le Moustique tigre' },
    sphinx: { name: 'LE SPHINX DE MINUIT', line: 'Il éteint les lumières…', hp: 96, hw: 102, hh: 62, oy: 0, y0: 206, sz: 304,
      cols: ['#6a4fa8', '#ffd27a', '#7af0ff'], as: 'en Sphinx de minuit', title: 'Le Sphinx de minuit' }
  };

  // bulles de bonus
  const CAPS = {
    double: { name: 'DOUBLE JET !', col: '#5ef0ff', dur: 10 },
    rapid: { name: 'TURBO PSCHITT !', col: '#ffd34d', dur: 9 },
    pierce: { name: 'SUPER JET !', col: '#ffa630', dur: 8 },
    slow: { name: 'RALENTI !', col: '#a9b8ff', dur: 7 },
    rolls: { name: 'BOUCLIERS NEUFS !', col: '#ffffff', dur: 0 },
    swat: { name: 'TAPETTE CHARGÉE !', col: '#ff5fae', dur: 0 }
  };
  const CAP_KINDS = ['double', 'rapid', 'pierce', 'slow', 'rolls', 'swat'];

  // formations (r = rangée, c = colonne 0..8, R = nombre de rangées)
  const SHAPES = {
    rect: () => true,
    V: (r, c) => Math.abs(c - 4) >= r,
    diamond: (r, c, R) => Math.abs(c - 4) + Math.abs(r - (R - 1) / 2) * 1.6 <= 4.6,
    wings: (r, c) => c !== 4 && !(r === 0 && (c === 3 || c === 5)),
    checker: (r, c) => (r + c) % 2 === 0,
    arrow: (r, c) => Math.abs(c - 4) <= r + 0.5,
    columns: (r, c) => c % 2 === 0,
    ring: (r, c, R) => r === 0 || r === R - 1 || c === 0 || c === 8 || (r === Math.floor((R - 1) / 2) && c === 4)
  };
  const SHAPE_LIST = ['rect', 'V', 'diamond', 'wings', 'checker', 'arrow', 'columns', 'ring'];
  const SHAPE_NAMES = { rect: 'Escadrille au complet', V: 'Formation en V', diamond: 'Formation losange', wings: 'Grandes ailes',
    checker: 'Damier volant', arrow: 'Pointe de flèche', columns: 'En colonnes', ring: 'L’anneau infernal' };
  const PAT_LIST = ['sway', 'march', 'ripple', 'breathe'];

  // vague n → monde, étape dans le monde (0, 1, puis 2 = boss), tour (jour) et type de vague
  function waveMeta(n) {
    const i = Math.max(0, (n | 0) - 1), per = PER_WORLD * NW;
    const cyc = Math.floor(i / per), wi = Math.floor(i / PER_WORLD) % NW, st = i % PER_WORLD;
    const Wd = WORLDS[wi];
    const kind = st === PER_WORLD - 1 ? 'boss' : Wd.waves[st];
    return { n, cyc, wi, st, W: Wd, kind, L: cyc + 1, boss: kind === 'boss' ? Wd.boss : null };
  }

  const CHEERS = {
    bain: ['Salle de bain impeccable !', 'Ça sent la lavande !', 'Même pas une mouche !'],
    cuisine: ['Cuisine nickel !', 'Les fruits sont sauvés !', 'Chef de la chasse !'],
    terrasse: ['Pique-nique sauvé !', 'À table, sans mouches !', 'Quel tireur d’élite !'],
    lavande: ['Le champ est à toi !', 'Mistral gagnant !', 'Parfum de victoire !'],
    piscine: ['Plouf, quel champion !', 'La piscine est libre !', 'Baignade autorisée !'],
    nuit: ['Dodo bien mérité !', 'Nuit tranquille !', 'Plus un seul bzzz !']
  };
  const BOSS_CHEERS = ['Boss écrasé, bravo !', 'Quelle tapette !', 'Le boss a fui !', 'Monde libéré !'];
  const KILL_WORDS = ['PSCHITT !', 'PSHHT !', 'FSSST !', 'SPLATCH !', 'PSCHITT !'];
  const COMBO_TXT = [[10, 'COMBO x10 !'], [25, 'MOUCHICIDE !'], [50, 'DÉMOUCHAGE TOTAL !'], [100, 'LÉGENDE DU PSCHITT !']];

  // ---------------------------------------------------------------------------
  // Petits outils
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const easeBack = (k) => { k = clamp(k, 0, 1); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hexRgb(h) { const n = parseInt(String(h).slice(1), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + Math.round(lerp(A[0], B[0], k)) + ',' + Math.round(lerp(A[1], B[1], k)) + ',' + Math.round(lerp(A[2], B[2], k)) + ')'; }
  function fmt(n) { return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function rrect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
    return g;
  }
  function rad(c, x, y, r0, x1, y1, r1, stops) {
    const g = c.createRadialGradient(x, y, r0, x1, y1, r1);
    for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]);
    return g;
  }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  // tête d'un copain centrée en (x, y), hauteur hgt
  function drawHead(c, img, x, y, hgt, rot, shadow) {
    try {
      const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
      const w = (hgt * iw) / ih;
      c.save();
      c.translate(x, y);
      if (rot) c.rotate(rot);
      if (shadow) { c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 4; c.shadowOffsetY = 1.5; }
      c.drawImage(img, -w / 2, -hgt / 2, w, hgt);
      c.restore();
    } catch (e) { /* rien */ }
  }

  // ===========================================================================
  // DESSINS (tout est dessiné au canvas, mis en cache dans mount)
  // ===========================================================================

  // ----------------------------------------------------------- insectes : ailes et pattes
  function wings(c, P, ph, len, wid, spread, dead, smoky) {
    const flap = dead ? 0 : Math.sin(ph) * 0.5 + 0.5;
    const ang = dead ? 0.22 : spread + 0.72 * flap;
    const L = len * (dead ? 0.92 : 0.84 + 0.16 * Math.cos(ph));
    const w = P.wing;
    for (let sx = -1; sx <= 1; sx += 2) {
      c.save();
      c.translate(sx * 2.4, -1.4);
      c.rotate(sx * ang);
      const g = c.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, 'rgba(' + w[0] + ',' + w[1] + ',' + w[2] + ',' + (smoky ? 0.7 : 0.6) + ')');
      g.addColorStop(0.5, smoky ? 'rgba(120,110,90,0.45)' : 'rgba(255,255,255,0.3)');
      g.addColorStop(1, 'rgba(185,215,255,0.5)');
      c.fillStyle = g;
      ell(c, 0, -L * 0.52, wid, L * 0.56);
      c.fill();
      c.fillStyle = 'rgba(255,160,230,0.2)';
      ell(c, -sx * wid * 0.2, -L * 0.66, wid * 0.42, L * 0.26);
      c.fill();
      c.fillStyle = 'rgba(140,255,220,0.16)';
      ell(c, sx * wid * 0.25, -L * 0.36, wid * 0.4, L * 0.2);
      c.fill();
      c.strokeStyle = 'rgba(30,40,60,0.6)';
      c.lineWidth = 0.6;
      ell(c, 0, -L * 0.52, wid, L * 0.56);
      c.stroke();
      c.strokeStyle = 'rgba(30,40,60,0.3)';
      c.lineWidth = 0.45;
      c.beginPath();
      c.moveTo(0, -0.6); c.lineTo(sx * 0.6, -L * 1.0);
      c.moveTo(0, -L * 0.25); c.lineTo(-sx * wid * 0.62, -L * 0.82);
      c.moveTo(0, -L * 0.38); c.lineTo(sx * wid * 0.7, -L * 0.78);
      c.stroke();
      c.restore();
    }
  }
  function legs(c, col, k, ph, dead) {
    c.strokeStyle = col;
    c.lineWidth = 1.05;
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let i = 0; i < 3; i++) {
        const ly = 0.4 + i * 2.6;
        c.beginPath();
        c.moveTo(sx * 3.3, ly);
        if (dead) {
          c.quadraticCurveTo(sx * 7.5, ly - 0.5, sx * 6, ly - 4);
        } else {
          const wig = Math.sin(ph * 0.5 + i * 1.7) * 0.5;
          c.lineTo(sx * 7.6 * k, ly + (i - 1) * 2.6 * k + wig);
          c.lineTo(sx * 9.6 * k, ly + ((i - 1) * 4 + 2.6) * k + wig);
        }
        c.stroke();
      }
    }
  }
  // pattes de moustique : longues, fines, rejetées vers l'arrière
  function legsThin(c, col, ph, dead) {
    c.strokeStyle = col;
    c.lineWidth = col.charAt(0) === 'r' ? 0.5 : 0.75;
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let i = 0; i < 3; i++) {
        const ly = 0.8 + i * 1.8, wig = dead ? 0 : Math.sin(ph * 0.5 + i * 1.7) * 0.6;
        c.beginPath();
        c.moveTo(sx * 2.6, ly);
        if (dead) c.quadraticCurveTo(sx * 7, ly - 1, sx * 6, ly - 5);
        else {
          const ang = [-0.9, -0.15, 0.55][i];
          const kx = sx * (5.5 + i), ky = ly + Math.sin(ang) * 5;
          c.lineTo(kx, ky + wig);
          c.lineTo(kx + sx * 4.5, ky + [-7, 2, 9][i] + wig);
        }
        c.stroke();
      }
    }
  }
  // yeux de dessin animé (le blanc ; les pupilles sont posées en direct pour regarder la bombe)
  function eyeWhites(c, type, dead, lids) {
    const e = EYE[type], ex = e[0], ey = e[1], r = e[2];
    for (let sx = -1; sx <= 1; sx += 2) {
      const x = sx * ex;
      c.fillStyle = '#120e0b';
      ell(c, x, ey, r + 0.8, r * 1.1 + 0.8);
      c.fill();
      c.fillStyle = rad(c, x - r * 0.35, ey - r * 0.45, 0.2, x, ey, r * 1.15, [0, '#ffffff', 0.68, '#f3f0e8', 1, '#bdb6aa']);
      ell(c, x, ey, r, r * 1.1);
      c.fill();
      if (dead) {
        c.strokeStyle = '#2a1712';
        c.lineWidth = 1;
        const k = r * 0.55;
        c.beginPath();
        c.moveTo(x - k, ey - k); c.lineTo(x + k, ey + k);
        c.moveTo(x + k, ey - k); c.lineTo(x - k, ey + k);
        c.stroke();
      } else if (lids) {
        // paupières lourdes (papillon de nuit : il a sommeil) + pupilles fixes
        c.fillStyle = '#120e0b';
        circ(c, x, ey + r * 0.28, r * 0.52);
        c.fill();
        c.fillStyle = '#ffffff';
        circ(c, x - r * 0.18, ey + r * 0.08, r * 0.16);
        c.fill();
        c.fillStyle = lids;
        c.beginPath();
        c.ellipse(x, ey, r + 0.4, r * 1.1 + 0.4, 0, Math.PI * 1.02, Math.PI * 1.98);
        c.lineTo(x + r, ey - r * 0.05);
        c.quadraticCurveTo(x, ey + r * 0.15, x - r, ey - r * 0.05);
        c.fill();
      }
    }
  }
  function brows(c, type, k) {
    const e = EYE[type], ex = e[0], ey = e[1], r = e[2];
    c.strokeStyle = '#120e0b';
    c.lineWidth = 1.3;
    c.beginPath();
    for (let sx = -1; sx <= 1; sx += 2) {
      c.moveTo(sx * (ex + r * 0.95), ey - r * (1.15 + k * 0.15));
      c.lineTo(sx * (ex - r * 0.55), ey - r * 0.7);
    }
    c.stroke();
  }

  // ----------------------------------------------------------- insectes : corps
  function paintFly(c, type, P, ph, dead) {
    const fat = type === 'fat', gnat = type === 'gnat';
    c.fillStyle = 'rgba(8,14,24,0.16)';
    ell(c, 2.5, 4.5, fat ? 12 : 9.5, fat ? 15 : 12.5);
    c.fill();
    legs(c, P.leg, 1, ph, dead);
    const arx = fat ? 8.8 : gnat ? 4.8 : 6.1, ary = fat ? 10 : gnat ? 6.6 : 7.8, acy = fat ? -6 : -5;
    c.fillStyle = rad(c, -2.2, acy - 3.8, 0.4, 0, acy, arx + 3, [0, P.hi, 0.4, P.body, 1, P.dark]);
    ell(c, 0, acy, arx, ary);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 0.8;
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.26)';
    c.lineWidth = 0.7;
    for (const k of [-0.52, -0.12, 0.28]) {
      c.beginPath();
      c.ellipse(0, acy + k * ary, Math.max(0.5, arx - 1), 1.9, 0, 0.2, Math.PI - 0.2);
      c.stroke();
    }
    if (type === 'green' || type === 'blue') {
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.ellipse(-1.8, acy - 1.5, 2.2, 4.6, 0.25, Math.PI * 0.9, Math.PI * 1.5);
      c.stroke();
      c.fillStyle = type === 'green' ? 'rgba(120,200,255,0.25)' : 'rgba(180,120,255,0.25)';
      ell(c, 2.4, acy + 1.5, 2, 3.6, -0.3);
      c.fill();
    } else if (type === 'red') {
      c.strokeStyle = 'rgba(255,255,255,0.92)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.arc(0, acy, 3, 0, TAU);
      c.moveTo(-4.6, acy); c.lineTo(4.6, acy);
      c.moveTo(0, acy - 4.6); c.lineTo(0, acy + 4.6);
      c.stroke();
    } else if (fat) {
      c.fillStyle = 'rgba(255,225,255,0.55)';
      for (const p of [[-3, -10], [3.2, -7], [-1.8, -3.4], [3.4, -12.5], [-4.4, -6.2]]) { circ(c, p[0], p[1], 1.3); c.fill(); }
    } else if (type === 'taon' || type === 'taon0') {
      c.strokeStyle = 'rgba(60,24,0,0.6)';
      c.lineWidth = 1.6;
      for (const k of [-0.55, -0.15, 0.25]) {
        c.beginPath();
        c.ellipse(0, acy + k * ary, arx - 0.6, 1.8, 0, 0.15, Math.PI - 0.15);
        c.stroke();
      }
    }
    wings(c, P, ph, gnat ? 13.5 : fat ? 9.5 : 12.5, gnat ? 3.6 : fat ? 4.2 : 4.8, fat ? 0.75 : 0.45, dead, false);
    // thorax
    c.fillStyle = rad(c, -1.4, 0.6, 0.3, 0, 2, 5.8, [0, P.hi, 0.5, P.body, 1, P.dark]);
    ell(c, 0, 2.2, fat ? 5.6 : 5.1, 4.4);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 0.7;
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 0.5;
    c.beginPath();
    for (let i = -2; i <= 2; i++) { c.moveTo(i * 1.6, -1.6); c.lineTo(i * 1.9, -2.8); }
    c.stroke();
    // tête
    c.fillStyle = P.head;
    ell(c, 0, 8.6, 5.6, 4.3);
    c.fill();
    eyeWhites(c, type, dead);
    // trompe
    c.strokeStyle = P.leg;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 12.2); c.lineTo(0, 14.2);
    if (gnat) {
      c.moveTo(-1.4, 11.6); c.quadraticCurveTo(-3.2, 14, -5.2, 15.6);
      c.moveTo(1.4, 11.6); c.quadraticCurveTo(3.2, 14, 5.2, 15.6);
    }
    c.stroke();
    // casque du taon (part au premier coup)
    if (type === 'taon') {
      c.fillStyle = lin(c, -6, 0, 6, 0, [0, '#a5141f', 0.35, '#ff5b5b', 0.7, '#e8262f', 1, '#7a0a12']);
      c.beginPath();
      c.ellipse(0, 7.4, 6.4, 5.2, 0, Math.PI * 0.98, Math.PI * 2.02);
      c.quadraticCurveTo(0, 9.6, -6.4, 7.6);
      c.fill();
      c.strokeStyle = 'rgba(60,0,4,0.7)';
      c.lineWidth = 0.6;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-2.2, 2.6); c.quadraticCurveTo(-2.6, 5.5, -2.2, 8);
      c.moveTo(2.2, 2.6); c.quadraticCurveTo(2.6, 5.5, 2.2, 8);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      ell(c, -3.4, 4.6, 1, 1.8, 0.3);
      c.fill();
    }
  }
  function paintMosq(c, P, ph, dead) {
    c.fillStyle = 'rgba(8,14,24,0.14)';
    ell(c, 2.5, 3, 7, 13);
    c.fill();
    c.save();
    c.lineWidth = 0.7;
    legsThin(c, P.leg, ph, dead);
    c.restore();
    // abdomen long et rayé
    c.fillStyle = rad(c, -1, -10, 0.3, 0, -8, 9, [0, P.hi, 0.45, P.body, 1, P.dark]);
    ell(c, 0, -8, 2.9, 10);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.lineWidth = 0.6;
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.88)';
    for (const k of [-15, -11, -7, -3]) { ell(c, 0, k, 2.6, 0.9); c.fill(); }
    wings(c, P, ph, 13, 2.8, 0.35, dead, false);
    c.fillStyle = rad(c, -1, 1, 0.3, 0, 2, 4.6, [0, P.hi, 0.5, P.body, 1, P.dark]);
    ell(c, 0, 2, 4, 3.6);
    c.fill();
    c.fillStyle = '#ffffff';
    ell(c, 0, 1.2, 0.9, 2.2);
    c.fill();
    c.fillStyle = P.head;
    ell(c, 0, 7.6, 4.6, 3.6);
    c.fill();
    eyeWhites(c, 'mosq', dead);
    // aiguille
    c.strokeStyle = '#1a1d21';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(0, 10.8); c.lineTo(0, 21);
    c.stroke();
    c.strokeStyle = '#ff4d5e';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 19); c.lineTo(0, 21.6);
    c.stroke();
    c.strokeStyle = '#1a1d21';
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(-1.4, 10.4); c.quadraticCurveTo(-3.4, 13.5, -5.6, 14.6);
    c.moveTo(1.4, 10.4); c.quadraticCurveTo(3.4, 13.5, 5.6, 14.6);
    c.stroke();
  }
  function paintWasp(c, P, ph, dead) {
    c.fillStyle = 'rgba(8,14,24,0.15)';
    ell(c, 2.5, 3, 9, 14);
    c.fill();
    legs(c, P.leg, 1.1, ph, dead);
    // abdomen rayé jaune / noir + dard
    c.save();
    ell(c, 0, -9, 6.2, 8.6);
    c.fillStyle = rad(c, -2, -12, 0.4, 0, -9, 9, [0, P.hi, 0.45, P.body, 1, '#c78a00']);
    c.fill();
    c.clip();
    c.fillStyle = '#1d1606';
    for (const y of [-15.5, -10.5, -5.5]) c.fillRect(-8, y, 16, 2.6);
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = 0.8;
    ell(c, 0, -9, 6.2, 8.6);
    c.stroke();
    c.fillStyle = '#1d1606';
    c.beginPath();
    c.moveTo(-1.4, -17); c.lineTo(0, -21.5); c.lineTo(1.4, -17);
    c.fill();
    // taille de guêpe
    c.fillStyle = '#1d1606';
    ell(c, 0, -1, 1.6, 1.8);
    c.fill();
    wings(c, P, ph, 13, 3.4, 0.38, dead, true);
    c.fillStyle = rad(c, -1.3, 1.4, 0.3, 0, 2.6, 5, [0, '#5a4a20', 0.6, '#2a2008', 1, '#120d02']);
    ell(c, 0, 2.6, 4.6, 3.8);
    c.fill();
    c.fillStyle = P.body;
    ell(c, -2, 2.2, 1, 1.6, 0.4); c.fill();
    ell(c, 2, 2.2, 1, 1.6, -0.4); c.fill();
    c.fillStyle = rad(c, -1, 7, 0.3, 0, 8.6, 5.6, [0, '#fff3a0', 0.6, P.body, 1, '#b07800']);
    ell(c, 0, 8.6, 5.4, 4.2);
    c.fill();
    eyeWhites(c, 'wasp', dead);
    if (!dead) brows(c, 'wasp', 0);
    c.strokeStyle = '#1d1606';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-1.6, 12.4); c.lineTo(-1, 13.6); c.moveTo(1.6, 12.4); c.lineTo(1, 13.6);
    c.moveTo(-2, 11.6); c.quadraticCurveTo(-4.4, 14.4, -6, 15.2);
    c.moveTo(2, 11.6); c.quadraticCurveTo(4.4, 14.4, 6, 15.2);
    c.stroke();
  }
  function paintDragon(c, P, ph, dead) {
    c.fillStyle = 'rgba(8,14,24,0.12)';
    ell(c, 2, 0, 6, 22);
    c.fill();
    // 4 longues ailes à plat (battement rapide)
    const flap = dead ? 0 : Math.sin(ph);
    for (let pair = 0; pair < 2; pair++) {
      for (let sx = -1; sx <= 1; sx += 2) {
        c.save();
        c.translate(sx * 2, pair ? -1.5 : 2.2);
        c.rotate(sx * (Math.PI / 2 + (pair ? 0.22 : -0.16) + flap * 0.13));
        const L = 21 - pair * 1.5;
        const g = c.createLinearGradient(0, 0, 0, -L);
        g.addColorStop(0, 'rgba(160,240,255,0.6)');
        g.addColorStop(0.7, 'rgba(255,255,255,0.3)');
        g.addColorStop(1, 'rgba(120,200,255,0.5)');
        c.fillStyle = g;
        ell(c, 0, -L * 0.52, 3.4, L * 0.54);
        c.fill();
        c.strokeStyle = 'rgba(20,70,90,0.55)';
        c.lineWidth = 0.55;
        c.stroke();
        c.fillStyle = 'rgba(30,80,100,0.6)';
        ell(c, 0, -L * 0.86, 1.2, 1.6);
        c.fill();
        c.restore();
      }
    }
    // abdomen très long (segments)
    for (let i = 0; i < 7; i++) {
      const y = -4 - i * 3.6;
      c.fillStyle = i % 2 ? P.dark : P.body;
      ell(c, 0, y, 2.2 - i * 0.12, 2.1);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(-0.6, -27, 0.9, 22);
    c.fillStyle = rad(c, -1, 1, 0.3, 0, 2, 4.6, [0, P.hi, 0.5, P.body, 1, P.dark]);
    ell(c, 0, 1.6, 3.6, 4.2);
    c.fill();
    c.fillStyle = P.head;
    ell(c, 0, 8.4, 5.6, 4.2);
    c.fill();
    eyeWhites(c, 'dragon', dead);
  }
  function paintMoth(c, P, ph, dead, deco) {
    c.fillStyle = 'rgba(8,14,24,0.15)';
    ell(c, 2.5, 3, 15, 11);
    c.fill();
    const flap = dead ? 0.1 : 0.5 + 0.5 * Math.sin(ph);
    for (let sx = -1; sx <= 1; sx += 2) {
      c.save();
      c.scale(sx, 1);
      c.scale(0.55 + 0.45 * (1 - flap * 0.6), 1);
      // aile du haut (vers l'arrière) et aile du bas
      c.fillStyle = deco ? rad(c, 6, -4, 1, 8, -2, 15, [0, '#8a74c8', 0.55, '#4a3878', 1, '#1a1030'])
        : rad(c, 6, -4, 1, 8, -2, 15, [0, '#efe0c6', 0.55, '#c8a97e', 1, '#7a5e3e']);
      c.beginPath();
      c.moveTo(1.5, 1);
      c.quadraticCurveTo(10, -14, 17.5, -10);
      c.quadraticCurveTo(19, -2, 14, 3);
      c.quadraticCurveTo(8, 5, 1.5, 3);
      c.fill();
      c.strokeStyle = 'rgba(60,40,20,0.55)';
      c.lineWidth = 0.7;
      c.stroke();
      c.fillStyle = deco ? rad(c, 6, 6, 1, 6, 6, 9, [0, '#6a58a8', 1, '#24183e']) : rad(c, 6, 6, 1, 6, 6, 9, [0, '#e6d2b0', 1, '#8e7050']);
      c.beginPath();
      c.moveTo(1.5, 3);
      c.quadraticCurveTo(12, 4, 11, 10);
      c.quadraticCurveTo(6, 12, 1.5, 6);
      c.fill();
      c.stroke();
      if (deco) {
        // motifs dorés du Sphinx
        c.fillStyle = 'rgba(255,210,122,0.75)';
        c.beginPath();
        c.moveTo(3.5, -1.5); c.quadraticCurveTo(10, -9, 16, -8.5);
        c.quadraticCurveTo(10, -6.5, 3.5, 0.5);
        c.fill();
        c.beginPath();
        c.moveTo(3, 5); c.quadraticCurveTo(8, 6, 9.5, 9.5);
        c.quadraticCurveTo(6.5, 7.6, 3, 6.4);
        c.fill();
      }
      // ocelle (œil sur l'aile ; celles du Sphinx brillent)
      c.fillStyle = deco ? '#0e2a3a' : '#5a3a20';
      circ(c, 11, -4.5, 2.6);
      c.fill();
      c.fillStyle = deco ? '#7af0ff' : '#ffcf6b';
      circ(c, 11, -4.5, 1.6);
      c.fill();
      c.fillStyle = deco ? '#ffffff' : '#2a1608';
      circ(c, 11.2, -4.3, 0.8);
      c.fill();
      c.strokeStyle = 'rgba(90,60,30,0.35)';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(3, 0); c.quadraticCurveTo(9, -7, 15, -8);
      c.moveTo(3, 2); c.quadraticCurveTo(10, 0, 15, -1);
      c.stroke();
      c.restore();
    }
    // corps duveteux
    c.fillStyle = rad(c, -1, -2, 0.4, 0, 0, 6, [0, '#fff3dc', 0.5, P.body, 1, P.dark]);
    ell(c, 0, -2, 3.4, 8);
    c.fill();
    c.strokeStyle = 'rgba(80,60,40,0.4)';
    c.lineWidth = 0.6;
    for (const y of [-7, -4, -1, 2]) { c.beginPath(); c.moveTo(-3, y); c.lineTo(3, y); c.stroke(); }
    c.fillStyle = P.head;
    ell(c, 0, 7.2, 4.2, 3.4);
    c.fill();
    eyeWhites(c, 'moth', dead, dead ? null : P.dark);
    // antennes plumeuses
    c.strokeStyle = '#5a4630';
    c.lineWidth = 0.8;
    for (let sx = -1; sx <= 1; sx += 2) {
      c.beginPath();
      c.moveTo(sx * 1.4, 10); c.quadraticCurveTo(sx * 4, 14, sx * 6.6, 15);
      c.stroke();
      c.lineWidth = 0.45;
      c.beginPath();
      for (let k = 0; k < 5; k++) {
        const t = k / 4, x = sx * (1.6 + t * 4.8), y = 10.6 + t * 4.2;
        c.moveTo(x, y); c.lineTo(x + sx * 1.4, y - 1.1);
        c.moveTo(x, y); c.lineTo(x - sx * 0.3, y + 1.5);
      }
      c.stroke();
      c.lineWidth = 0.8;
    }
  }
  function paintInsect(c, type, ph, dead) {
    const P = PAL[type];
    c.save();
    c.scale(TYPES[type].s, TYPES[type].s);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (type === 'mosq') paintMosq(c, P, ph, dead);
    else if (type === 'wasp') paintWasp(c, P, ph, dead);
    else if (type === 'dragon') paintDragon(c, P, ph, dead);
    else if (type === 'moth') paintMoth(c, P, ph, dead);
    else paintFly(c, type, P, ph, dead);
    c.restore();
  }

  // ----------------------------------------------------------- bourdon bonus (vu de profil)
  function paintBee(c, t, big) {
    const buzz = Math.sin(t * 70);
    for (let k = 0; k < 2; k++) {
      c.save();
      c.translate(-2 + k * 5, -9);
      c.rotate(-0.5 + k * 0.35 + buzz * 0.25);
      c.fillStyle = 'rgba(225,242,255,0.5)';
      ell(c, 0, -7, 5.5, 9 * (0.75 + 0.25 * Math.abs(buzz)));
      c.fill();
      c.strokeStyle = 'rgba(40,50,70,0.5)';
      c.lineWidth = 0.6;
      c.stroke();
      c.restore();
    }
    c.save();
    ell(c, -3, 1, 16, 11.5);
    c.fillStyle = rad(c, -8, -5, 1, -3, 1, 17, [0, '#fff4a6', 0.5, '#ffc93a', 1, '#c98200']);
    c.fill();
    c.clip();
    c.fillStyle = '#1d1a14';
    for (const bx of [-14, -6, 2]) c.fillRect(bx, -13, 4.4, 26);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    ell(c, -5, -6, 9, 2.6, -0.1);
    c.fill();
    c.restore();
    c.strokeStyle = 'rgba(40,24,0,0.75)';
    c.lineWidth = 0.9;
    ell(c, -3, 1, 16, 11.5);
    c.stroke();
    c.strokeStyle = 'rgba(70,45,0,0.5)';
    c.lineWidth = 0.7;
    c.beginPath();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU, px = -3 + Math.cos(a) * 16, py = 1 + Math.sin(a) * 11.5;
      c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 1.9, py + Math.sin(a) * 1.9);
    }
    c.stroke();
    c.fillStyle = '#1d1a14';
    c.beginPath();
    c.moveTo(-19, 1); c.lineTo(-24, 2.2); c.lineTo(-19, 3.6);
    c.fill();
    c.fillStyle = '#1d1a14';
    ell(c, 13, 2, 7.8, 7.2);
    c.fill();
    if (!big) {
      c.fillStyle = '#ffffff';
      ell(c, 15.6, 0.6, 3.8, 4.4);
      c.fill();
      c.fillStyle = '#120e0b';
      circ(c, 16.8, 1.4, 2);
      c.fill();
      c.fillStyle = '#ffffff';
      circ(c, 17.4, 0.6, 0.7);
      c.fill();
    }
    c.strokeStyle = '#1d1a14';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(16, -4); c.quadraticCurveTo(20, -10, 23, -10.5);
    c.moveTo(13, -4.5); c.quadraticCurveTo(15, -11, 18, -12.4);
    c.stroke();
    c.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-6 + i * 6, 10.5);
      c.lineTo(-8 + i * 6 + Math.sin(t * 8 + i) * 1.2, 15.5);
      c.stroke();
    }
  }

  // ----------------------------------------------------------- la bombe de lavande (origine : centre bas)
  function paintCan(c) {
    c.fillStyle = 'rgba(0,0,0,0.32)';
    ell(c, 0, 1, 17, 3.2);
    c.fill();
    const body = lin(c, -14, 0, 14, 0, [0, '#4f5c66', 0.18, '#c9d3da', 0.32, '#ffffff', 0.5, '#d4dde3', 0.82, '#7d8b95', 1, '#3e4a53']);
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(-14, -38);
    c.quadraticCurveTo(-13.4, -47, -5.4, -48.2);
    c.lineTo(5.4, -48.2);
    c.quadraticCurveTo(13.4, -47, 14, -38);
    c.closePath();
    c.fill();
    rrect(c, -14, -39, 28, 39, 3.2);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-14, -4.6, 28, 1.4);
    c.fillRect(-14, -39, 28, 1.1);
    // étiquette lavande
    c.fillStyle = lin(c, 0, -32, 0, -9, [0, '#b07cff', 0.55, '#8a4fe0', 1, '#5b2aa8']);
    c.fillRect(-14, -32, 28, 23);
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.beginPath();
    c.moveTo(-14, -12.5);
    c.quadraticCurveTo(-6, -16.5, 0, -13);
    c.quadraticCurveTo(6, -9.6, 14, -13.6);
    c.lineTo(14, -12);
    c.quadraticCurveTo(6, -8, 0, -11.4);
    c.quadraticCurveTo(-6, -14.8, -14, -10.8);
    c.closePath();
    c.fill();
    // brin de lavande
    c.strokeStyle = '#3f7a3a';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-6.5, -15.5); c.quadraticCurveTo(-7.5, -22, -6, -29);
    c.stroke();
    c.fillStyle = '#e3c8ff';
    for (let i = 0; i < 6; i++) { ell(c, -6.2 + (i % 2 ? 1 : -1) * 1.1, -28.5 + i * 1.8, 1.1, 1.4); c.fill(); }
    c.fillStyle = '#ffffff';
    c.font = 'bold 5.4px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('FRAIS', 4.2, -25);
    c.font = 'bold 3.8px sans-serif';
    c.fillText('lavande', 4.2, -20.3);
    c.fillStyle = lin(c, -14, 0, 14, 0, [0, 'rgba(0,0,0,0.38)', 0.27, 'rgba(255,255,255,0.3)', 0.55, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.42)']);
    c.fillRect(-14, -32, 28, 23);
    c.fillStyle = '#9aa6ae';
    c.fillRect(-6.2, -50.6, 12.4, 2.6);
    c.fillStyle = lin(c, -5, 0, 5, 0, [0, '#c23d84', 0.35, '#ffd0e7', 1, '#a32a6e']);
    rrect(c, -5.2, -57.2, 10.4, 7, 1.8);
    c.fill();
    c.fillStyle = '#3a2030';
    ell(c, 0, -57.1, 1.7, 0.9);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillRect(-9.6, -36, 2.2, 31);
  }

  // ----------------------------------------------------------- boucliers (repère SW x SH, coin haut-gauche)
  function paintShield(c, kind) {
    if (kind === 'roll') {
      const cx = 25, x0 = 3, x1 = 47, rx = 22;
      c.fillStyle = lin(c, x0, 0, x1, 0, [0, '#a9b4bc', 0.3, '#ffffff', 0.62, '#eef2f5', 1, '#9aa6af']);
      c.beginPath();
      c.moveTo(x0, 9); c.lineTo(x0, 33);
      c.ellipse(cx, 33, rx, 5.5, 0, Math.PI, 0, true);
      c.lineTo(x1, 9);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(120,140,160,0.22)';
      for (let yy = 13; yy < 36; yy += 4) for (let xx = 6 + ((yy / 4) & 1) * 2; xx < 46; xx += 4) { circ(c, xx, yy, 0.7); c.fill(); }
      c.fillStyle = '#fbfcfd';
      c.beginPath();
      c.moveTo(28, 13.5); c.lineTo(41, 12); c.lineTo(41, 31);
      c.quadraticCurveTo(38, 33, 35, 31.5); c.quadraticCurveTo(31.5, 30, 28, 32);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(110,130,150,0.45)';
      c.lineWidth = 0.6;
      c.stroke();
      c.fillStyle = 'rgba(185,124,255,0.6)';
      for (let i = 0; i < 5; i++) { const a = i * (TAU / 5); circ(c, 34.5 + Math.cos(a) * 1.5, 18 + Math.sin(a) * 1.5, 1); c.fill(); }
      c.fillStyle = '#ffffff';
      ell(c, cx, 9, rx, 6.2);
      c.fill();
      c.strokeStyle = 'rgba(150,165,180,0.55)';
      c.lineWidth = 0.5;
      for (const k of [0.75, 0.55]) { ell(c, cx, 9, rx * k, 6.2 * k); c.stroke(); }
      c.fillStyle = '#b08455';
      ell(c, cx, 9, 7.5, 2.6);
      c.fill();
      c.fillStyle = '#4a3420';
      ell(c, cx, 9.4, 6.2, 1.9);
      c.fill();
    } else if (kind === 'towel') {
      // pile de torchons provençaux pliés
      const cols = [['#fbf6ec', '#d6342c'], ['#f5efe0', '#1f6fb8'], ['#fbf6ec', '#e8a21a']];
      for (let i = 0; i < 3; i++) {
        const y = 26 - i * 11, x = 4 + (i === 1 ? 2 : 0), w = 42 - (i === 1 ? 2 : 0);
        c.fillStyle = cols[i][0];
        rrect(c, x, y, w, 12, 3.5);
        c.fill();
        c.strokeStyle = 'rgba(90,70,50,0.35)';
        c.lineWidth = 0.7;
        c.stroke();
        c.fillStyle = cols[i][1];
        c.fillRect(x + 5, y + 1, 3, 10);
        c.fillRect(x + 11, y + 1, 1.4, 10);
        c.fillRect(x + w - 9, y + 1, 3, 10);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fillRect(x + 2, y + 1.6, w - 4, 1.4);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(x + 2, y + 9.4, w - 4, 1.6);
      }
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(6, 38, 38, 1.5);
    } else if (kind === 'pot') {
      // pot en terre cuite + basilic
      c.fillStyle = lin(c, 9, 0, 41, 0, [0, '#9a4a22', 0.3, '#e8874a', 0.6, '#d26a32', 1, '#8a3c18']);
      c.beginPath();
      c.moveTo(11, 20); c.lineTo(39, 20); c.lineTo(35.5, 39); c.lineTo(14.5, 39);
      c.closePath();
      c.fill();
      c.fillStyle = lin(c, 8, 0, 42, 0, [0, '#a8522a', 0.35, '#f29a5c', 1, '#93421c']);
      rrect(c, 8.5, 16.5, 33, 6.5, 2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(14, 25, 3, 12);
      // feuillage
      const leaves = [[25, 9, 11, 8], [15, 11, 7, 6], [35, 11, 7, 6], [20, 5, 6, 5], [31, 5, 6, 5], [25, 2, 5, 4]];
      for (const l of leaves) {
        c.fillStyle = rad(c, l[0] - 2, l[1] - 2, 0.5, l[0], l[1], l[2], [0, '#9be06a', 0.6, '#4ea83a', 1, '#2c6a24']);
        ell(c, l[0], l[1], l[2], l[3]);
        c.fill();
      }
      c.strokeStyle = 'rgba(30,70,20,0.5)';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(25, 14); c.lineTo(25, 5); c.moveTo(18, 12); c.lineTo(22, 8); c.moveTo(32, 12); c.lineTo(28, 8);
      c.stroke();
      c.fillStyle = '#ffffff';
      for (const p of [[18, 6], [31, 4], [26, 1.5]]) { circ(c, p[0], p[1], 1.2); c.fill(); }
    } else if (kind === 'bale') {
      // botte de foin ronde
      c.fillStyle = lin(c, 3, 0, 47, 0, [0, '#b8862a', 0.4, '#f2cd6a', 1, '#a8781e']);
      rrect(c, 3, 4, 44, 35, 14);
      c.fill();
      c.strokeStyle = 'rgba(120,80,10,0.55)';
      c.lineWidth = 0.8;
      c.beginPath();
      for (let r = 4; r <= 15; r += 3.6) c.ellipse(25, 21.5, r * 1.25, r, 0, 0.3, TAU - 0.2);
      c.stroke();
      c.strokeStyle = 'rgba(255,240,180,0.6)';
      c.lineWidth = 0.6;
      c.beginPath();
      for (let i = 0; i < 26; i++) {
        const a = hash(i) * TAU, r = 4 + hash(i + 9) * 14;
        const x = 25 + Math.cos(a) * r * 1.25, y = 21.5 + Math.sin(a) * r;
        c.moveTo(x, y); c.lineTo(x + Math.cos(a + 1.6) * 3, y + Math.sin(a + 1.6) * 3);
      }
      c.stroke();
      c.strokeStyle = '#c0392b';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(14, 4.5); c.lineTo(14, 38.5); c.moveTo(36, 4.5); c.lineTo(36, 38.5);
      c.stroke();
    } else if (kind === 'ring') {
      // bouée rayée
      c.save();
      c.beginPath();
      c.ellipse(25, 21, 22.5, 17.5, 0, 0, TAU);
      c.ellipse(25, 20.5, 9, 6.5, 0, 0, TAU, true);
      c.clip('evenodd');
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#ffffff' : '#ff4d5e';
        c.beginPath();
        c.moveTo(25, 21);
        c.arc(25, 21, 30, (i / 8) * TAU - 0.2, ((i + 1) / 8) * TAU - 0.2);
        c.closePath();
        c.fill();
      }
      c.fillStyle = rad(c, 18, 12, 2, 25, 21, 26, [0, 'rgba(255,255,255,0.55)', 0.5, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.35)']);
      c.fillRect(0, 0, 50, 40);
      c.restore();
      c.strokeStyle = 'rgba(120,0,20,0.45)';
      c.lineWidth = 0.8;
      ell(c, 25, 21, 22.5, 17.5);
      c.stroke();
      ell(c, 25, 20.5, 9, 6.5);
      c.stroke();
    } else {
      // lampion en papier (il éclaire la nuit)
      c.fillStyle = 'rgba(255,190,90,0.28)';
      ell(c, 25, 22, 24, 19);
      c.fill();
      c.fillStyle = '#3a2a1c';
      c.fillRect(19, 2, 12, 4);
      c.fillRect(19, 35, 12, 4);
      c.fillStyle = rad(c, 21, 15, 1, 25, 21, 19, [0, '#fff6c8', 0.45, '#ffb04a', 1, '#d2462a']);
      ell(c, 25, 21, 17, 15.5);
      c.fill();
      c.strokeStyle = 'rgba(140,40,20,0.55)';
      c.lineWidth = 0.7;
      c.beginPath();
      for (const k of [-11, -6, 0, 6, 11]) c.ellipse(25, 21 + k, Math.sqrt(Math.max(0, 1 - (k * k) / 240)) * 17, 1.4, 0, 0, Math.PI);
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)';
      ell(c, 19.5, 14, 3, 5, 0.4);
      c.fill();
    }
  }

  // ----------------------------------------------------------- tapette géante (repère : bout du manche en (0,0), tête vers -y)
  const SWAT_W = 210, SWAT_H = 236, SWAT_HANDLE = 250;
  function paintSwatter(c) {
    // manche
    c.fillStyle = lin(c, -7, 0, 7, 0, [0, '#7a4a1e', 0.4, '#e2a35a', 1, '#6a3a12']);
    rrect(c, -7, -SWAT_HANDLE, 14, SWAT_HANDLE, 6);
    c.fill();
    c.fillStyle = '#ff5fae';
    rrect(c, -9, -46, 18, 46, 8);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-5, -42, 3, 38);
    // tête : grille en plastique
    const x0 = -SWAT_W / 2, y0 = -SWAT_HANDLE - SWAT_H + 8;
    c.fillStyle = '#a24bff';
    rrect(c, x0, y0, SWAT_W, SWAT_H, 34);
    c.fill();
    c.save();
    rrect(c, x0 + 9, y0 + 9, SWAT_W - 18, SWAT_H - 18, 28);
    c.clip();
    c.fillStyle = 'rgba(40,10,70,0.55)';
    for (let y = y0 + 9; y < y0 + SWAT_H; y += 11) for (let x = x0 + 9 + ((y / 11) & 1) * 5.5; x < x0 + SWAT_W; x += 11) { rrect(c, x, y, 7, 7, 2); c.fill(); }
    c.restore();
    c.strokeStyle = '#d9a6ff';
    c.lineWidth = 4;
    rrect(c, x0 + 3, y0 + 3, SWAT_W - 6, SWAT_H - 6, 31);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.28)';
    rrect(c, x0 + 16, y0 + 12, SWAT_W * 0.4, 10, 5);
    c.fill();
    c.fillStyle = '#7a2fd0';
    rrect(c, -16, y0 + SWAT_H - 14, 32, 22, 6);
    c.fill();
  }

  // ----------------------------------------------------------- projectiles ennemis (sprites)
  const DROP_KINDS = ['goutte', 'visee', 'dard', 'sirop', 'boue', 'pollen', 'aiguille', 'ecaille'];
  function paintDrop(c, kind) {
    if (kind === 'goutte') {
      c.fillStyle = lin(c, -3.4, 0, 3.4, 0, [0, '#f4ffa8', 0.5, '#c6d43a', 1, '#7d8a10']);
      c.beginPath();
      c.moveTo(0, -7);
      c.bezierCurveTo(1.6, -3.4, 3.6, -1, 3.6, 1.4);
      c.arc(0, 1.4, 3.6, 0, Math.PI, false);
      c.bezierCurveTo(-3.6, -1, -1.6, -3.4, 0, -7);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(60,60,0,0.7)';
      c.lineWidth = 0.7;
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      ell(c, -1.2, 0.4, 0.9, 1.6);
      c.fill();
    } else if (kind === 'visee') {
      c.fillStyle = rad(c, -1.2, -1.4, 0.3, 0, 0, 5, [0, '#fff0d8', 0.45, '#ff8a3d', 1, '#a3360c']);
      circ(c, 0, 0, 4.2);
      c.fill();
      c.strokeStyle = 'rgba(80,20,0,0.7)';
      c.lineWidth = 0.8;
      c.stroke();
    } else if (kind === 'dard') {
      c.fillStyle = '#1d1606';
      c.beginPath();
      c.moveTo(-1.6, -7); c.lineTo(1.6, -7); c.lineTo(0, 8);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffcc1a';
      c.fillRect(-1.6, -8.5, 3.2, 2.4);
    } else if (kind === 'sirop') {
      c.fillStyle = rad(c, -1.4, -1.6, 0.4, 0, 0, 6.2, [0, '#f5e0ff', 0.45, '#b45cff', 1, '#4b1488']);
      circ(c, 0, 0, 5.2);
      c.fill();
      c.strokeStyle = 'rgba(255,230,255,0.75)';
      c.lineWidth = 0.9;
      c.stroke();
    } else if (kind === 'boue') {
      c.fillStyle = rad(c, -1.4, -1.6, 0.4, 0, 0, 6.4, [0, '#d9a066', 0.5, '#8a5224', 1, '#4a2808']);
      c.beginPath();
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU, r = 5 + (i % 2 ? 0.9 : -0.3); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(40,20,0,0.7)';
      c.lineWidth = 0.8;
      c.stroke();
    } else if (kind === 'pollen') {
      c.fillStyle = rad(c, -1.2, -1.4, 0.4, 0, 0, 6, [0, '#fffbd0', 0.5, '#ffd23a', 1, '#c98a00']);
      circ(c, 0, 0, 4.8);
      c.fill();
      c.strokeStyle = '#a86e00';
      c.lineWidth = 0.7;
      c.beginPath();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.moveTo(Math.cos(a) * 4.4, Math.sin(a) * 4.4); c.lineTo(Math.cos(a) * 6.2, Math.sin(a) * 6.2); }
      c.stroke();
    } else if (kind === 'aiguille') {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(-1.5, -8); c.lineTo(1.5, -8); c.lineTo(0.6, 7); c.lineTo(-0.6, 7);
      c.closePath();
      c.fill();
      c.fillStyle = '#ff2f45';
      c.beginPath();
      c.moveTo(-0.8, 3); c.lineTo(0.8, 3); c.lineTo(0, 9);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(40,40,50,0.8)';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(-1.5, -8); c.lineTo(0, 9); c.lineTo(1.5, -8);
      c.stroke();
    } else {
      c.fillStyle = 'rgba(122,240,255,0.35)';
      circ(c, 0, 0, 6.5);
      c.fill();
      c.fillStyle = lin(c, 0, -6, 0, 6, [0, '#ffffff', 0.5, '#7af0ff', 1, '#2a8cff']);
      c.beginPath();
      c.moveTo(0, -6); c.lineTo(3.6, 0); c.lineTo(0, 6); c.lineTo(-3.6, 0);
      c.closePath();
      c.fill();
    }
  }

  // ----------------------------------------------------------- bulle de bonus (icône vectorielle)
  function paintCapIcon(c, kind, col) {
    c.fillStyle = col;
    c.strokeStyle = 'rgba(20,6,30,0.85)';
    c.lineWidth = 1.6;
    c.lineJoin = 'round';
    const path = (fn) => { c.beginPath(); fn(); c.stroke(); c.fill(); };
    if (kind === 'double') {
      path(() => { rrect(c, -5.5, -6, 3.6, 12, 1.6); });
      path(() => { rrect(c, 1.9, -6, 3.6, 12, 1.6); });
    } else if (kind === 'rapid') {
      path(() => { c.moveTo(-6, -5); c.lineTo(-1, 0); c.lineTo(-6, 5); c.lineTo(-3.6, 5); c.lineTo(1.4, 0); c.lineTo(-3.6, -5); c.closePath(); });
      path(() => { c.moveTo(0, -5); c.lineTo(5, 0); c.lineTo(0, 5); c.lineTo(2.4, 5); c.lineTo(7.4, 0); c.lineTo(2.4, -5); c.closePath(); });
    } else if (kind === 'pierce') {
      path(() => { c.moveTo(0, -7); c.lineTo(5.5, -1); c.lineTo(2, -1); c.lineTo(2, 6.5); c.lineTo(-2, 6.5); c.lineTo(-2, -1); c.lineTo(-5.5, -1); c.closePath(); });
    } else if (kind === 'slow') {
      path(() => { c.moveTo(-5, -6.5); c.lineTo(5, -6.5); c.lineTo(0.8, 0); c.lineTo(5, 6.5); c.lineTo(-5, 6.5); c.lineTo(-0.8, 0); c.closePath(); });
    } else if (kind === 'rolls') {
      path(() => { c.ellipse(0, 1, 6, 5.5, 0, 0, TAU); });
      c.fillStyle = 'rgba(20,6,30,0.85)';
      circ(c, 0, 1, 1.8);
      c.fill();
    } else {
      c.save();
      c.rotate(-0.5);
      path(() => { rrect(c, -4.6, -7.5, 9.2, 9, 2.4); });
      path(() => { c.rect(-1.1, 1.5, 2.2, 7); });
      c.restore();
    }
  }
  function paintCap(c, kind) {
    const r = 12, col = CAPS[kind].col;
    c.fillStyle = rad(c, -4, -5, 1, 0, 0, r, [0, 'rgba(255,255,255,0.75)', 0.55, 'rgba(170,225,255,0.22)', 1, 'rgba(255,140,220,0.5)']);
    circ(c, 0, 0, r);
    c.fill();
    c.strokeStyle = col;
    c.lineWidth = 1.8;
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1.3;
    c.beginPath();
    c.arc(0, 0, r - 3, Math.PI * 1.1, Math.PI * 1.45);
    c.stroke();
    paintCapIcon(c, kind, col);
  }

  // ----------------------------------------------------------- jet de lavande (tir)
  function paintPuff(c, gold) {
    const cols = gold ? ['#ffa51e', '#ffd34d', '#ffe98a'] : ['#e8379a', '#9b4bff', '#ff7fc8'];
    const pos = [[-3, 2, 5], [3.2, 1.4, 4.6], [0, -2.8, 5.2]];
    c.fillStyle = gold ? 'rgba(110,50,0,0.9)' : 'rgba(64,8,84,0.9)';
    for (const p of pos) { circ(c, p[0], p[1], p[2] + 1.3); c.fill(); }
    for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; circ(c, pos[i][0], pos[i][1], pos[i][2]); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.95)';
    circ(c, -1.4, -3.8, 2.3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    circ(c, 2.8, 0.2, 1.3);
    c.fill();
  }

  // ----------------------------------------------------------- médaillons des mondes (carte du voyage)
  function paintWorldIcon(c, id, r) {
    const Wd = WORLDS.find((w) => w.id === id) || WORLDS[0];
    c.fillStyle = rad(c, -r * 0.3, -r * 0.4, r * 0.1, 0, 0, r, [0, mix(Wd.bg1, '#ffffff', 0.35), 0.7, Wd.bg1, 1, Wd.bg0]);
    circ(c, 0, 0, r);
    c.fill();
    c.lineWidth = r * 0.12;
    c.strokeStyle = Wd.acc;
    c.stroke();
    c.save();
    c.scale(r / 16, r / 16);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (id === 'bain') {
      c.strokeStyle = '#f4f8fb'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(-7, 8); c.lineTo(-7, -4); c.quadraticCurveTo(-7, -9, -1, -9); c.lineTo(3, -9); c.stroke();
      c.fillStyle = '#f4f8fb'; rrect(c, 1, -10.5, 8, 4, 1.5); c.fill();
      c.fillStyle = '#4fc3f7'; for (const p of [[3, -3], [6, 0], [3.4, 3.6], [6.6, 6]]) { ell(c, p[0], p[1], 1.1, 1.6); c.fill(); }
    } else if (id === 'cuisine') {
      c.fillStyle = '#2a2420'; circ(c, -2, 1, 8); c.fill();
      c.fillStyle = '#4a3f38'; circ(c, -2, 1, 6.4); c.fill();
      c.strokeStyle = '#7a4a1e'; c.lineWidth = 3; c.beginPath(); c.moveTo(5, -2); c.lineTo(11, -7); c.stroke();
      c.fillStyle = '#fff6d8'; ell(c, -2, 1, 3.2, 2.6); c.fill();
      c.fillStyle = '#ffb61e'; circ(c, -1.4, 1.3, 1.5); c.fill();
    } else if (id === 'terrasse') {
      c.fillStyle = '#ffd34d'; circ(c, 0, -1, 5); c.fill();
      c.strokeStyle = '#ffd34d'; c.lineWidth = 1.8;
      c.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.moveTo(Math.cos(a) * 7, -1 + Math.sin(a) * 7); c.lineTo(Math.cos(a) * 10, -1 + Math.sin(a) * 10); } c.stroke();
      c.fillStyle = '#7a3fa0'; for (const p of [[-6, 7], [-3, 7.5], [-4.5, 10]]) { circ(c, p[0], p[1], 1.8); c.fill(); }
    } else if (id === 'lavande') {
      c.strokeStyle = '#3f7a3a'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(0, 11); c.lineTo(0, -2); c.moveTo(-5, 11); c.lineTo(-4, 0); c.moveTo(5, 11); c.lineTo(4, 0); c.stroke();
      c.fillStyle = '#c9a6ff';
      for (const x of [-4.4, 0, 4.4]) for (let i = 0; i < 5; i++) { ell(c, x + (i % 2 ? 1 : -1) * 1.1, -10 + i * 2.6 + (x === 0 ? -2 : 0), 1.5, 1.9); c.fill(); }
    } else if (id === 'piscine') {
      c.lineWidth = 3.4;
      for (let i = 0; i < 4; i++) { c.strokeStyle = i % 2 ? '#ffffff' : '#ff4d5e'; c.beginPath(); c.arc(0, -1, 7, (i / 4) * TAU, ((i + 1) / 4) * TAU); c.stroke(); }
      c.strokeStyle = '#7ff0ff'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-11, 9); c.quadraticCurveTo(-7, 6.5, -3.5, 9); c.quadraticCurveTo(0, 11.5, 3.5, 9); c.quadraticCurveTo(7, 6.5, 11, 9); c.stroke();
    } else {
      c.fillStyle = '#fdf6d8';
      c.beginPath(); c.arc(-1, 0, 8, 0, TAU); c.arc(3, -3, 7, 0, TAU, true); c.fill('evenodd');
      c.fillStyle = '#c6f36b'; circ(c, 7, 6, 1.6); c.fill();
      c.fillStyle = '#ffffff'; circ(c, 6, -8, 1); c.fill();
    }
    c.restore();
  }

  // ----------------------------------------------------------- boss (vus de dessus, tête vers la bombe)
  // Chaque boss reprend le dessin de son petit cousin, en grand, avec ses accessoires.
  // Les pupilles (et la tête d'un copain) sont posées en direct. BEYE = yeux dans le repère du boss.
  const BPAL = {
    reine: { hi: '#d4e4ff', body: '#3f6cf0', dark: '#101c66', head: '#0d1846', leg: '#0a1230', wing: [215, 232, 255] },
    taon: { hi: '#ffe4b8', body: '#d0802f', dark: '#4a2408', head: '#2d1606', leg: '#1d0e04', wing: [255, 238, 210] },
    frelon: { hi: '#ffe7a8', body: '#ff9a1f', dark: '#7a3000', head: '#3a1c08', leg: '#2a1404', wing: [255, 226, 180] },
    moustique: { hi: '#f4f6f8', body: '#3a4148', dark: '#0c0f12', head: '#14171a', leg: '#1c2024', wing: [225, 238, 250] },
    sphinx: { hi: '#e8d8ff', body: '#4a3878', dark: '#140c2a', head: '#1c1236', leg: '#120a22', wing: [200, 190, 240] }
  };
  const BSCALE = { reine: 5.3, taon: 5.3, frelon: 5.4, bourdon: 4.3, moustique: 5.6, sphinx: 5.9 };
  function bossEye(kind) {
    const S = BSCALE[kind];
    if (kind === 'bourdon') return null;
    const base = kind === 'reine' ? EYE.blue : kind === 'taon' ? EYE.taon : kind === 'frelon' ? EYE.wasp : kind === 'moustique' ? EYE.mosq : EYE.moth;
    return [base[0] * S, base[1] * S, base[2] * S];
  }
  function crown(c, x, y, w) {
    const h = w * 0.55;
    c.fillStyle = lin(c, 0, y - h, 0, y, [0, '#fff6b0', 0.5, '#ffd34d', 1, '#c98a00']);
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x - w / 2, y - h * 0.55);
    c.lineTo(x - w / 4, y - h * 0.22);
    c.lineTo(x, y - h);
    c.lineTo(x + w / 4, y - h * 0.22);
    c.lineTo(x + w / 2, y - h * 0.55);
    c.lineTo(x + w / 2, y);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,50,0,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = '#ff4d5e';
    circ(c, x, y - h * 0.36, w * 0.075);
    c.fill();
    c.fillStyle = '#5ef0ff';
    circ(c, x - w * 0.3, y - h * 0.16, w * 0.055); c.fill();
    circ(c, x + w * 0.3, y - h * 0.16, w * 0.055); c.fill();
    c.fillStyle = '#ffffff';
    for (const k of [-0.5, 0, 0.5]) { circ(c, x + k * w * (k ? 1 : 0), y - (k ? h * 0.55 : h), w * 0.045); c.fill(); }
  }
  function paintBoss(c, kind, ph, dead) {
    const S = BSCALE[kind];
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (kind === 'bourdon') {
      c.fillStyle = 'rgba(8,14,24,0.18)';
      ell(c, 6, 24, 60, 18);
      c.fill();
      c.scale(S, S);
      paintBee(c, ph / 70 * 3, true);
      // gros yeux (de profil)
      c.fillStyle = '#ffffff';
      ell(c, 15.4, 0.2, 4.6, 5.2);
      c.fill();
      c.strokeStyle = '#120e0b';
      c.lineWidth = 0.7;
      c.stroke();
      // couronne de fleurs de lavande
      c.fillStyle = '#c9a6ff';
      for (let i = 0; i < 6; i++) { circ(c, 8 + i * 2.3, -6.8 + Math.abs(i - 2.5) * 0.7, 1.5); c.fill(); }
      c.restore();
      return;
    }
    c.scale(S, S);
    const P = BPAL[kind];
    if (kind === 'reine') {
      paintFly(c, 'blue', P, ph, dead);
      // petite cape royale sur les épaules (le dos bleu métallisé reste visible)
      c.fillStyle = lin(c, -8, 0, 8, 0, [0, '#7a0a1e', 0.45, '#e0253f', 1, '#6a0816']);
      c.beginPath();
      c.moveTo(-5.6, 5);
      c.quadraticCurveTo(-9.6, 0, -7.6, -5.4);
      c.quadraticCurveTo(0, -3.2, 7.6, -5.4);
      c.quadraticCurveTo(9.6, 0, 5.6, 5);
      c.closePath();
      c.fill();
      c.strokeStyle = '#ffd34d';
      c.lineWidth = 0.6;
      c.stroke();
      // plis de la cape et fermoir doré
      c.strokeStyle = 'rgba(70,0,12,0.55)';
      c.lineWidth = 0.7;
      c.beginPath();
      for (const x of [-4.2, -1.4, 1.4, 4.2]) { c.moveTo(x * 0.8, 3.6); c.quadraticCurveTo(x * 1.05, -0.5, x * 1.1, -4.4 + Math.abs(x) * -0.15); }
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.22)';
      ell(c, -3.6, -1.4, 1.1, 3, 0.15);
      c.fill();
      c.fillStyle = '#fbf8f0';
      ell(c, 0, 4.6, 6.6, 1.9);
      c.fill();
      c.fillStyle = '#1a1a1a';
      for (const x of [-4, -1.4, 1.4, 4]) { ell(c, x, 4.6, 0.35, 0.7); c.fill(); }
      c.fillStyle = '#ffd34d';
      circ(c, 0, 3.4, 1.1);
      c.fill();
      // cils
      const e = EYE.blue;
      c.strokeStyle = '#120e0b';
      c.lineWidth = 0.6;
      c.beginPath();
      for (let sx = -1; sx <= 1; sx += 2) for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 - sx * (0.35 + i * 0.35);
        const x = sx * e[0] + Math.cos(a) * e[2] * 1.05, y = e[1] + Math.sin(a) * e[2] * 1.12;
        c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4);
      }
      c.stroke();
      crown(c, 0, 6, 11);
    } else if (kind === 'taon') {
      paintFly(c, 'taon0', P, ph, dead);
      // gros casque de vélo + lunettes
      c.fillStyle = lin(c, -7, 0, 7, 0, [0, '#a5141f', 0.35, '#ff5b5b', 0.7, '#e8262f', 1, '#7a0a12']);
      c.beginPath();
      c.ellipse(0, 7, 7.4, 6, 0, Math.PI * 0.98, Math.PI * 2.02);
      c.quadraticCurveTo(0, 9.2, -7.4, 7.2);
      c.fill();
      c.strokeStyle = 'rgba(60,0,4,0.8)';
      c.lineWidth = 0.5;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(-2.6, 1.4); c.quadraticCurveTo(-3, 4.5, -2.6, 7.6);
      c.moveTo(2.6, 1.4); c.quadraticCurveTo(3, 4.5, 2.6, 7.6);
      c.moveTo(0, 1); c.lineTo(0, 7.8);
      c.stroke();
      c.fillStyle = '#1b1b22';
      c.fillRect(-6.4, 6.6, 12.8, 1.2);
      c.fillStyle = 'rgba(120,200,255,0.75)';
      ell(c, -2.6, 6.8, 2.1, 1.3); c.fill();
      ell(c, 2.6, 6.8, 2.1, 1.3); c.fill();
      if (!dead) brows(c, 'taon0', 0.4);
      // muscles (pattes avant)
      c.fillStyle = P.dark;
      ell(c, -7.4, 4, 2.1, 1.4, 0.4); c.fill();
      ell(c, 7.4, 4, 2.1, 1.4, -0.4); c.fill();
    } else if (kind === 'frelon') {
      paintWasp(c, P, ph, dead);
      // mandibles
      c.fillStyle = '#ffb21e';
      c.strokeStyle = '#3a1c08';
      c.lineWidth = 0.5;
      for (let sx = -1; sx <= 1; sx += 2) {
        c.beginPath();
        c.moveTo(sx * 1.2, 12);
        c.quadraticCurveTo(sx * 4.4, 13.6, sx * 2.4, 16.4);
        c.quadraticCurveTo(sx * 1.6, 14.4, sx * 0.4, 13.4);
        c.closePath();
        c.fill();
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,0.35)';
      ell(c, -2.4, -12, 1.4, 3, 0.3);
      c.fill();
    } else if (kind === 'moustique') {
      paintMosq(c, P, ph, dead);
      // rayures tigrées sur les pattes (mêmes pattes, en pointillés blancs)
      c.save();
      c.setLineDash([0.8, 1.1]);
      legsThin(c, 'rgba(255,255,255,0.9)', ph, dead);
      c.restore();
      if (!dead) brows(c, 'mosq', 0.2);
    } else {
      paintMoth(c, P, ph, dead, true);
      // collier doré
      c.strokeStyle = 'rgba(255,210,122,0.85)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(0, 3.6, 3.2, 1.2, 0, 0, Math.PI);
      c.stroke();
    }
    c.restore();
  }

  // ===========================================================================
  // DÉCORS DES MONDES — peints une fois par monde (et à chaque changement de taille) dans deux calques
  // plein écran : « sky » (ciel + paysage lointain) et « fg » (murs, fenêtres découpées, étagère).
  // Repère : pixels CSS de l'écran ; F = aire de jeu à l'écran { x, y, w, h, s } (s = pixels par unité).
  // ===========================================================================
  function hillPath(g, x0, x1, yb, amp, seed, freq, yBottom) {
    g.beginPath();
    g.moveTo(x0, yBottom);
    const n = Math.max(8, Math.ceil((x1 - x0) / 7));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, t = x * freq;
      g.lineTo(x, yb - amp * (0.55 * Math.sin(t + seed) + 0.3 * Math.sin(t * 2.3 + seed * 1.7) + 0.15 * Math.sin(t * 5.1 + seed * 2.9)));
    }
    g.lineTo(x1, yBottom);
    g.closePath();
  }
  function cypress(g, x, yb, h, col, light) {
    const w = h * 0.15;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, yb - h);
    g.bezierCurveTo(x + w * 0.9, yb - h * 0.72, x + w * 1.15, yb - h * 0.25, x + w * 0.35, yb);
    g.lineTo(x - w * 0.35, yb);
    g.bezierCurveTo(x - w * 1.15, yb - h * 0.25, x - w * 0.9, yb - h * 0.72, x, yb - h);
    g.fill();
    if (light) {
      g.fillStyle = light;
      g.beginPath();
      g.moveTo(x, yb - h * 0.96);
      g.bezierCurveTo(x - w * 0.8, yb - h * 0.7, x - w * 1.0, yb - h * 0.3, x - w * 0.3, yb - h * 0.04);
      g.bezierCurveTo(x - w * 0.5, yb - h * 0.4, x - w * 0.4, yb - h * 0.7, x, yb - h * 0.96);
      g.fill();
    }
  }
  function oliveTree(g, x, yb, r, col, col2, trunk) {
    g.strokeStyle = trunk;
    g.lineWidth = r * 0.16;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, yb); g.quadraticCurveTo(x - r * 0.15, yb - r * 0.6, x + r * 0.05, yb - r * 1.0);
    g.moveTo(x, yb - r * 0.5); g.quadraticCurveTo(x + r * 0.3, yb - r * 0.7, x + r * 0.45, yb - r * 0.95);
    g.stroke();
    const blobs = [[0, -1.25, 0.62], [-0.55, -1.0, 0.5], [0.55, -1.05, 0.52], [-0.2, -1.6, 0.45], [0.35, -1.5, 0.42]];
    for (const b of blobs) { g.fillStyle = col; ell(g, x + b[0] * r, yb + b[1] * r, b[2] * r * 1.15, b[2] * r * 0.85); g.fill(); }
    g.fillStyle = col2;
    for (const b of blobs) { ell(g, x + b[0] * r - b[2] * r * 0.25, yb + b[1] * r - b[2] * r * 0.25, b[2] * r * 0.55, b[2] * r * 0.38); g.fill(); }
  }
  function sunDisc(g, x, y, r, col, glow, glowR, a) {
    g.fillStyle = rad(g, x, y, r * 0.5, x, y, glowR, [0, rgba(glow, 0.75 * (a || 1)), 0.25, rgba(glow, 0.32 * (a || 1)), 1, rgba(glow, 0)]);
    g.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
    g.fillStyle = rad(g, x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r, [0, '#ffffff', 0.6, col, 1, mix(col, glow, 0.5)]);
    circ(g, x, y, r);
    g.fill();
  }
  function stars(g, x0, y0, w, h, n, seed, maxA) {
    for (let i = 0; i < n; i++) {
      const x = x0 + hash(seed + i * 3.1) * w, y = y0 + Math.pow(hash(seed + i * 7.7), 1.4) * h;
      const s = 0.5 + hash(seed + i * 1.3) * 1.3, a = (0.25 + hash(seed + i * 5.9) * 0.75) * (maxA || 1);
      g.fillStyle = 'rgba(255,250,235,' + a.toFixed(3) + ')';
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  // fenêtre : ouverture (Path2D) à cintre surbaissé
  function winPath(x, y, w, h, sag) {
    const p = new Path2D();
    p.moveTo(x, y + h);
    p.lineTo(x, y + sag);
    p.quadraticCurveTo(x + w / 2, y - sag, x + w, y + sag);
    p.lineTo(x + w, y + h);
    p.closePath();
    return p;
  }
  function cutOut(g, path) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    g.fill(path);
    g.restore();
  }
  function shutter(g, x, y, w, h, col, dark, U) {
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x + 4 * U, y + 5 * U, w, h);
    g.fillStyle = lin(g, x, 0, x + w, 0, [0, mix(col, '#ffffff', 0.12), 1, mix(col, '#000000', 0.12)]);
    g.fillRect(x, y, w, h);
    g.strokeStyle = dark;
    g.lineWidth = Math.max(1, 1.4 * U);
    g.strokeRect(x + 3 * U, y + 3 * U, w - 6 * U, h - 6 * U);
    g.beginPath();
    for (let yy = y + 9 * U; yy < y + h - 6 * U; yy += 7 * U) { g.moveTo(x + 5 * U, yy); g.lineTo(x + w - 5 * U, yy); }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = Math.max(0.6, 0.8 * U);
    g.beginPath();
    for (let yy = y + 10.5 * U; yy < y + h - 6 * U; yy += 7 * U) { g.moveTo(x + 5 * U, yy); g.lineTo(x + w - 5 * U, yy); }
    g.stroke();
    g.fillStyle = '#3a3a3a';
    g.fillRect(x + w * 0.5 - 2 * U, y + h * 0.48, 4 * U, 9 * U);
  }
  function windowFrame(g, x, y, w, h, sag, U, col, mullion) {
    const p = winPath(x, y, w, h, sag);
    g.save();
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 16 * U;
    g.translate(2 * U, 3 * U);
    g.stroke(p);
    g.restore();
    g.strokeStyle = col;
    g.lineWidth = 12 * U;
    g.stroke(p);
    g.strokeStyle = 'rgba(0,0,0,0.18)';
    g.lineWidth = 2 * U;
    g.stroke(p);
    if (mullion) {
      g.save();
      g.clip(p);
      g.fillStyle = col;
      g.fillRect(x + w / 2 - 2.6 * U, y - sag, 5.2 * U, h + sag);
      g.fillRect(x, y + h * 0.44, w, 4.6 * U);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(x + w / 2 + 2.6 * U, y - sag, 1.2 * U, h + sag);
      // reflets sur les vitres
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.beginPath();
      g.moveTo(x + w * 0.08, y + h); g.lineTo(x + w * 0.3, y - sag); g.lineTo(x + w * 0.42, y - sag); g.lineTo(x + w * 0.2, y + h);
      g.fill();
      g.restore();
    }
    return p;
  }
  function photoFrame(g, x, y, w, h, img, U, gold) {
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(x + 3 * U, y + 4 * U, w, h);
    g.fillStyle = gold ? lin(g, x, y, x + w, y + h, [0, '#ffe08a', 0.5, '#c8922a', 1, '#8a5a12']) : lin(g, x, y, x + w, y + h, [0, '#a8743e', 1, '#5a3412']);
    g.fillRect(x, y, w, h);
    const m = 5 * U;
    g.fillStyle = '#f4ead8';
    g.fillRect(x + m, y + m, w - 2 * m, h - 2 * m);
    if (img) {
      g.save();
      g.beginPath();
      g.rect(x + m + 2 * U, y + m + 2 * U, w - 2 * m - 4 * U, h - 2 * m - 4 * U);
      g.clip();
      g.fillStyle = lin(g, 0, y, 0, y + h, [0, '#bfe3ff', 1, '#ffe6c8']);
      g.fill();
      drawHead(g, img, x + w / 2, y + h * 0.56, h * 0.78, 0, false);
      g.restore();
    } else {
      // tableau neutre : un champ de lavande au soleil
      const ix = x + m + 2 * U, iy = y + m + 2 * U, iw = w - 2 * m - 4 * U, ih = h - 2 * m - 4 * U;
      g.fillStyle = lin(g, 0, iy, 0, iy + ih, [0, '#7fb8ff', 0.6, '#ffe2b0', 1, '#ffe2b0']);
      g.fillRect(ix, iy, iw, ih);
      g.fillStyle = '#ffd34d';
      circ(g, ix + iw * 0.7, iy + ih * 0.3, ih * 0.12);
      g.fill();
      g.fillStyle = '#8f6ae0';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(ix + iw * 0.5, iy + ih * 0.55);
        g.lineTo(ix + iw * (i / 4) - iw * 0.08, iy + ih);
        g.lineTo(ix + iw * (i / 4) + iw * 0.08, iy + ih);
        g.closePath();
        g.fill();
      }
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = Math.max(0.8, U);
    g.strokeRect(x + 1.5 * U, y + 1.5 * U, w - 3 * U, h - 3 * U);
  }
  function beamPoly(x0, x1, y0, x2, x3, y1, col, a) { return { pts: [x0, y0, x1, y0, x3, y1, x2, y1], col, a }; }

  // ---------------------------------------------------------------- 1. LA SALLE DE BAIN (le matin)
  function paintBain(gs, gf, cw, ch, F, out, heads) {
    const U = F.s, cx = F.x + F.w / 2, shelfY = F.y + PY * U;
    const wideScr = F.x > 150;
    const ww = wideScr ? F.w * 1.28 : Math.min(cw - 16 * U, F.w * 0.8), wh = 290 * U;
    const wx = cx - ww / 2, wy = F.y + 52 * U, sag = ww * 0.09;
    // ciel du matin
    gs.fillStyle = lin(gs, 0, wy - sag, 0, wy + wh, [0, '#86bff8', 0.55, '#ffcbb8', 1, '#ffe5c4']);
    gs.fillRect(0, 0, cw, ch);
    const sx = wx + ww * 0.24, sy = wy + wh * 0.64;
    sunDisc(gs, sx, sy, 17 * U, '#fff4d6', '#ffb38a', 150 * U);
    out.sun = { x: sx, y: sy, r: 17 * U, col: '#ffcfa0' };
    hillPath(gs, wx - 40, wx + ww + 40, wy + wh * 0.8, 22 * U, 1.3, 0.012 / U, wy + wh + 10);
    gs.fillStyle = '#b8a8d8';
    gs.fill();
    hillPath(gs, wx - 40, wx + ww + 40, wy + wh * 0.9, 16 * U, 4.1, 0.018 / U, wy + wh + 10);
    gs.fillStyle = '#8fb388';
    gs.fill();
    for (const k of [0.12, 0.2, 0.74, 0.86]) cypress(gs, wx + ww * k, wy + wh * 0.93, (34 + hash(k * 9) * 16) * U, '#3f6b4c', 'rgba(255,220,180,0.25)');
    // carreaux de faïence (azulejos), doux pour laisser ressortir le jeu
    const T = Math.max(34, 34 * U);
    const tile = mkCanvas(Math.ceil(T * 2), Math.ceil(T * 2));
    {
      const t = tile.getContext('2d');
      t.scale(2, 2);
      t.fillStyle = '#f5f0e5';
      t.fillRect(0, 0, T, T);
      t.strokeStyle = '#86acd8';
      t.lineWidth = T * 0.07;
      for (const p of [[0, 0], [T, 0], [0, T], [T, T]]) { circ(t, p[0], p[1], T * 0.24); t.stroke(); }
      t.fillStyle = '#c3d8ee';
      for (const p of [[0, 0], [T, 0], [0, T], [T, T]]) { circ(t, p[0], p[1], T * 0.09); t.fill(); }
      t.save();
      t.translate(T / 2, T / 2);
      t.fillStyle = '#6f9ccf';
      for (let i = 0; i < 4; i++) { t.rotate(Math.PI / 2); ell(t, 0, -T * 0.15, T * 0.06, T * 0.13); t.fill(); }
      t.fillStyle = '#b9d2ec';
      t.rotate(Math.PI / 4);
      for (let i = 0; i < 4; i++) { t.rotate(Math.PI / 2); ell(t, 0, -T * 0.17, T * 0.03, T * 0.07); t.fill(); }
      t.fillStyle = '#f2c94c';
      circ(t, 0, 0, T * 0.05);
      t.fill();
      t.restore();
      t.strokeStyle = 'rgba(140,150,165,0.35)';
      t.lineWidth = 1;
      t.strokeRect(0.5, 0.5, T - 1, T - 1);
      t.fillStyle = 'rgba(255,255,255,0.3)';
      t.beginPath(); t.moveTo(2, 2); t.lineTo(T * 0.42, 2); t.lineTo(2, T * 0.42); t.fill();
    }
    const ox = ((cx % T) + T) % T - T;
    for (let y = -((F.y % T) + T) % T; y < ch; y += T) for (let x = ox; x < cw; x += T) gf.drawImage(tile, x, y, T, T);
    // ombre douce du plafond
    gf.fillStyle = lin(gf, 0, 0, 0, F.y + 120 * U, [0, 'rgba(20,40,70,0.35)', 1, 'rgba(20,40,70,0)']);
    gf.fillRect(0, 0, cw, F.y + 120 * U);
    // soubassement de faïence bleue
    const wy2 = shelfY - 92 * U;
    gf.fillStyle = '#2c6fb0';
    gf.fillRect(0, wy2, cw, ch - wy2);
    const T2 = 22 * U;
    for (let y = wy2 + 8 * U; y < ch; y += T2) for (let x = ((cx % T2) + T2) % T2 - T2; x < cw; x += T2) {
      gf.fillStyle = hash(x * 0.37 + y * 0.11) > 0.5 ? '#3b84c8' : '#3478bc';
      gf.fillRect(x + 1, y + 1, T2 - 2, T2 - 2);
      gf.fillStyle = 'rgba(255,255,255,0.18)';
      gf.fillRect(x + 2, y + 2, T2 * 0.5, 1.5);
    }
    gf.fillStyle = '#f6f1e4';
    gf.fillRect(0, wy2, cw, 4 * U);
    gf.fillStyle = '#1d4f8f';
    gf.fillRect(0, wy2 + 4 * U, cw, 4 * U);
    // fenêtre + volets bleus
    const p = winPath(wx, wy, ww, wh, sag);
    cutOut(gf, p);
    const shw = ww * 0.46;
    shutter(gf, wx - shw - 9 * U, wy - sag * 0.2, shw, wh + sag * 0.2, '#3d7fb8', '#244f78', U);
    shutter(gf, wx + ww + 9 * U, wy - sag * 0.2, shw, wh + sag * 0.2, '#3d7fb8', '#244f78', U);
    windowFrame(gf, wx, wy, ww, wh, sag, U, '#fbfbf6', true);
    // rebord (avec une plante grasse et un savon)
    gf.fillStyle = 'rgba(0,0,0,0.25)';
    gf.fillRect(wx - 16 * U, wy + wh + 8 * U, ww + 32 * U, 6 * U);
    gf.fillStyle = lin(gf, 0, wy + wh, 0, wy + wh + 10 * U, [0, '#ffffff', 1, '#cfd8de']);
    gf.fillRect(wx - 18 * U, wy + wh, ww + 36 * U, 10 * U);
    const px = wx + ww * 0.8, py = wy + wh;
    gf.fillStyle = '#d9773f';
    gf.beginPath(); gf.moveTo(px - 9 * U, py - 13 * U); gf.lineTo(px + 9 * U, py - 13 * U); gf.lineTo(px + 7 * U, py); gf.lineTo(px - 7 * U, py); gf.fill();
    gf.fillStyle = '#4ea85a';
    for (let i = 0; i < 5; i++) { ell(gf, px + (i - 2) * 3.4 * U, py - 17 * U - Math.abs(i - 2) * -1.5 * U, 2.6 * U, 6.5 * U, (i - 2) * 0.35); gf.fill(); }
    gf.fillStyle = '#ffb3d6';
    rrect(gf, wx + ww * 0.12, py - 6 * U, 16 * U, 6 * U, 3 * U);
    gf.fill();
    // porte-serviette et serviette rayée
    const tx = wideScr ? wx - shw * 0.55 - 25 * U : F.x + 14 * U;
    const ty = wy + wh + 70 * U;
    gf.fillStyle = '#c9ced3';
    gf.fillRect(tx, ty, 50 * U, 3.4 * U);
    gf.fillStyle = 'rgba(0,0,0,0.18)';
    rrect(gf, tx + 7 * U, ty + 4 * U, 42 * U, 62 * U, 4 * U);
    gf.fill();
    gf.fillStyle = lin(gf, tx, 0, tx + 44 * U, 0, [0, '#f28bbb', 0.45, '#ffd3e6', 1, '#e86fa8']);
    rrect(gf, tx + 4 * U, ty + 1 * U, 42 * U, 62 * U, 4 * U);
    gf.fill();
    gf.fillStyle = 'rgba(255,255,255,0.9)';
    gf.fillRect(tx + 4 * U, ty + 42 * U, 42 * U, 4 * U);
    gf.fillRect(tx + 4 * U, ty + 49 * U, 42 * U, 2 * U);
    gf.fillStyle = 'rgba(160,40,100,0.35)';
    gf.fillRect(tx + 4 * U, ty + 12 * U, 42 * U, 1.5 * U);
    gf.strokeStyle = '#f7b8d6';
    gf.lineWidth = Math.max(1, 1.1 * U);
    gf.beginPath();
    for (let x = tx + 6 * U; x < tx + 45 * U; x += 3.2 * U) { gf.moveTo(x, ty + 63 * U); gf.lineTo(x + 0.6 * U, ty + 68 * U); }
    gf.stroke();
    gf.fillStyle = 'rgba(255,255,255,0.35)';
    gf.fillRect(tx + 8 * U, ty + 3 * U, 6 * U, 36 * U);
    // cadre photo (un copain, sinon un tableau)
    const fw = 50 * U, fh = 62 * U;
    const fx = wideScr ? wx + ww + shw * 0.55 - fw / 2 : cx + F.w * 0.24;
    photoFrame(gf, Math.min(cw - fw - 8 * U, fx), wy + wh + 64 * U, fw, fh, heads[0] ? heads[0].img : null, U, true);
    // étagère en faïence blanche
    gf.fillStyle = 'rgba(0,0,0,0.3)';
    gf.fillRect(0, shelfY + 4 * U, cw, 6 * U);
    gf.fillStyle = lin(gf, 0, shelfY - 3 * U, 0, shelfY + 7 * U, [0, '#ffffff', 1, '#d7dde2']);
    gf.fillRect(0, shelfY - 3 * U, cw, 10 * U);
    gf.fillStyle = lin(gf, 0, shelfY + 7 * U, 0, ch, [0, '#e9edf0', 1, '#b7c0c8']);
    gf.fillRect(0, shelfY + 7 * U, cw, ch - shelfY);
    gf.fillStyle = '#2f6fb3';
    gf.fillRect(0, shelfY + 13 * U, cw, 3 * U);
    out.win = p;
    out.beams = [beamPoly(wx + ww * 0.08, wx + ww * 0.62, wy + wh * 0.25, wx + ww * 0.42, wx + ww * 1.18, shelfY, '#ffd9b8', 0.13),
      beamPoly(wx + ww * 0.6, wx + ww * 0.9, wy + wh * 0.3, wx + ww * 1.05, wx + ww * 1.45, shelfY, '#ffe8c8', 0.08)];
    out.indoor = true;
  }

  // ---------------------------------------------------------------- 2. LA CUISINE (la matinée)
  function paintCuisine(gs, gf, cw, ch, F, out, heads) {
    const U = F.s, cx = F.x + F.w / 2, shelfY = F.y + PY * U;
    const wideScr = F.x > 150;
    const ww = wideScr ? F.w * 1.26 : Math.min(cw - 16 * U, F.w * 0.78), wh = 270 * U;
    const wx = cx - ww / 2, wy = F.y + 64 * U;
    gs.fillStyle = lin(gs, 0, wy, 0, wy + wh, [0, '#2f8ff8', 0.6, '#9ed4ff', 1, '#e8f6ff']);
    gs.fillRect(0, 0, cw, ch);
    const sx = wx + ww * 0.2, sy = wy + wh * 0.2;
    sunDisc(gs, sx, sy, 14 * U, '#fffbe8', '#fff1b0', 120 * U);
    out.sun = { x: sx, y: sy, r: 14 * U, col: '#fff3c0' };
    hillPath(gs, wx - 40, wx + ww + 40, wy + wh * 0.7, 18 * U, 2.2, 0.014 / U, wy + wh + 10);
    gs.fillStyle = '#9fc0d8';
    gs.fill();
    hillPath(gs, wx - 40, wx + ww + 40, wy + wh * 0.8, 14 * U, 0.4, 0.02 / U, wy + wh + 10);
    gs.fillStyle = '#86b25c';
    gs.fill();
    // un mas au loin
    const mx = wx + ww * 0.62, my = wy + wh * 0.78;
    gs.fillStyle = '#efdcb4';
    gs.fillRect(mx, my - 16 * U, 34 * U, 16 * U);
    gs.fillStyle = '#c8643c';
    gs.beginPath(); gs.moveTo(mx - 3 * U, my - 16 * U); gs.lineTo(mx + 17 * U, my - 25 * U); gs.lineTo(mx + 37 * U, my - 16 * U); gs.fill();
    gs.fillStyle = '#6a8fb0';
    gs.fillRect(mx + 6 * U, my - 11 * U, 5 * U, 6 * U);
    gs.fillRect(mx + 22 * U, my - 11 * U, 5 * U, 6 * U);
    oliveTree(gs, wx + ww * 0.18, wy + wh * 0.94, 34 * U, '#9fb08a', 'rgba(230,240,220,0.5)', '#6a5640');
    // mur crépi
    gf.fillStyle = lin(gf, 0, 0, 0, ch, [0, '#e8d2ad', 0.4, '#f3e3c6', 1, '#ecd7b2']);
    gf.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 260; i++) {
      gf.fillStyle = hash(i * 1.7) > 0.5 ? 'rgba(120,80,40,0.05)' : 'rgba(255,255,255,0.08)';
      ell(gf, hash(i * 3.3) * cw, hash(i * 5.1) * ch, (6 + hash(i) * 18) * U, (4 + hash(i * 2.2) * 10) * U);
      gf.fill();
    }
    // poutre
    const by = F.y + 6 * U;
    gf.fillStyle = 'rgba(0,0,0,0.25)';
    gf.fillRect(0, by + 26 * U, cw, 6 * U);
    gf.fillStyle = lin(gf, 0, by - 30 * U, 0, by + 26 * U, [0, '#4a2c16', 0.6, '#7a4a26', 1, '#5a361a']);
    gf.fillRect(0, 0, cw, by + 26 * U);
    gf.strokeStyle = 'rgba(30,15,5,0.35)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let i = 0; i < 6; i++) { const yy = by - 14 * U + i * 6 * U; gf.moveTo(0, yy); for (let x = 0; x <= cw; x += 40) gf.lineTo(x, yy + Math.sin(x * 0.02 + i) * 1.5 * U); }
    gf.stroke();
    // fenêtre, volets verts, rideau vichy
    const p = winPath(wx, wy, ww, wh, 0.01);
    cutOut(gf, p);
    const shw = ww * 0.46;
    shutter(gf, wx - shw - 9 * U, wy, shw, wh, '#5f9a54', '#3a6a32', U);
    shutter(gf, wx + ww + 9 * U, wy, shw, wh, '#5f9a54', '#3a6a32', U);
    windowFrame(gf, wx, wy, ww, wh, 0.01, U, '#fbf8f0', true);
    const cy0 = wy + wh * 0.6;
    gf.save();
    gf.beginPath();
    gf.rect(wx, cy0, ww, wh * 0.4);
    gf.clip();
    const sq = 9 * U;
    gf.fillStyle = '#fbf6ee';
    gf.fillRect(wx, cy0, ww, wh * 0.4);
    gf.fillStyle = 'rgba(214,52,44,0.55)';
    for (let x = wx; x < wx + ww; x += sq * 2) gf.fillRect(x, cy0, sq, wh * 0.4);
    for (let y = cy0; y < wy + wh; y += sq * 2) gf.fillRect(wx, y, ww, sq);
    gf.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = wx; x < wx + ww; x += 22 * U) gf.fillRect(x, cy0, 6 * U, wh * 0.4);
    gf.restore();
    gf.fillStyle = '#8a8f94';
    gf.fillRect(wx - 6 * U, cy0 - 3 * U, ww + 12 * U, 4 * U);
    // casseroles en cuivre
    const pans = [];
    const room = cw - (wx + ww + shw + 9 * U);
    if (room > 150 * U) { pans.push(wx + ww + shw + 40 * U, wx + ww + shw + 95 * U); pans.push(wx - shw - 60 * U, wx - shw - 120 * U); }
    pans.forEach((x, i) => {
      if (x < -30 * U || x > cw + 30 * U) return;
      const r = (17 + (i % 2) * 6) * U, y = by + 40 * U + r;
      gf.strokeStyle = '#3a3a3a';
      gf.lineWidth = 1.5 * U;
      gf.beginPath(); gf.moveTo(x, by + 26 * U); gf.lineTo(x, y - r - 30 * U); gf.stroke();
      gf.fillStyle = lin(gf, x - 3 * U, 0, x + 3 * U, 0, [0, '#8a4a20', 0.5, '#e8975a', 1, '#8a4a20']);
      gf.fillRect(x - 3 * U, y - r - 32 * U, 6 * U, 32 * U);
      gf.fillStyle = rad(gf, x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r, [0, '#ffd0a0', 0.4, '#e8874a', 1, '#8a3c18']);
      circ(gf, x, y, r);
      gf.fill();
      gf.strokeStyle = 'rgba(80,30,10,0.6)';
      gf.lineWidth = 1.2 * U;
      gf.stroke();
    });
    // tresse d'ail et bouquet de lavande
    const gx = wx + ww + shw + 18 * U;
    if (gx < cw - 10 * U) {
      gf.strokeStyle = '#c8a46a';
      gf.lineWidth = 2 * U;
      gf.beginPath(); gf.moveTo(gx, by + 26 * U); gf.lineTo(gx, by + 120 * U); gf.stroke();
      for (let i = 0; i < 5; i++) { gf.fillStyle = i % 2 ? '#f6efe0' : '#efe4cc'; ell(gf, gx + (i % 2 ? 4 : -4) * U, by + 44 * U + i * 15 * U, 8 * U, 9 * U); gf.fill(); gf.strokeStyle = 'rgba(150,120,80,0.6)'; gf.lineWidth = 0.8 * U; gf.stroke(); }
    }
    // crédence en zellige
    const zy = shelfY - 84 * U, Z = 21 * U;
    const zc = ['#4aa89a', '#6dbcae', '#f2e8d2', '#f2e8d2', '#e8cf96', '#4aa89a', '#f2e8d2', '#e3a866'];
    for (let y = zy; y < shelfY; y += Z) for (let x = ((cx % Z) + Z) % Z - Z; x < cw; x += Z) {
      const h = hash(Math.round(x / Z) * 13.1 + Math.round(y / Z) * 7.7);
      gf.fillStyle = zc[(h * zc.length) | 0];
      gf.fillRect(x + 1, y + 1, Z - 2, Z - 2);
      gf.fillStyle = 'rgba(255,255,255,0.25)';
      gf.fillRect(x + 2, y + 2, Z * 0.6, Z * 0.18);
      gf.fillStyle = 'rgba(0,0,0,0.1)';
      gf.fillRect(x + 1, y + Z * 0.7, Z - 2, Z * 0.3 - 1);
    }
    // horloge de cuisine : 10 h
    {
      const kx = wideScr ? wx + ww + shw * 0.55 : cx + F.w * 0.3, ky = wy + wh + 58 * U, kr = 24 * U;
      gf.fillStyle = 'rgba(0,0,0,0.22)';
      circ(gf, kx + 3 * U, ky + 4 * U, kr + 3 * U);
      gf.fill();
      gf.fillStyle = lin(gf, kx - kr, 0, kx + kr, 0, [0, '#c25a2a', 0.5, '#f08a4a', 1, '#a84a1e']);
      circ(gf, kx, ky, kr + 3.5 * U);
      gf.fill();
      gf.fillStyle = rad(gf, kx - kr * 0.3, ky - kr * 0.3, 1, kx, ky, kr, [0, '#ffffff', 1, '#efe6d6']);
      circ(gf, kx, ky, kr);
      gf.fill();
      gf.strokeStyle = '#3a2a1c';
      gf.lineWidth = Math.max(1, 1.4 * U);
      gf.beginPath();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, r0 = kr * (i % 3 ? 0.84 : 0.74); gf.moveTo(kx + Math.cos(a) * r0, ky + Math.sin(a) * r0); gf.lineTo(kx + Math.cos(a) * kr * 0.92, ky + Math.sin(a) * kr * 0.92); }
      gf.stroke();
      gf.lineCap = 'round';
      gf.lineWidth = 2.6 * U;
      gf.beginPath(); gf.moveTo(kx, ky); gf.lineTo(kx + Math.cos(-Math.PI / 2 - Math.PI / 3) * kr * 0.5, ky + Math.sin(-Math.PI / 2 - Math.PI / 3) * kr * 0.5); gf.stroke();
      gf.lineWidth = 1.8 * U;
      gf.beginPath(); gf.moveTo(kx, ky); gf.lineTo(kx, ky - kr * 0.74); gf.stroke();
      gf.fillStyle = '#c25a2a';
      circ(gf, kx, ky, 2.2 * U);
      gf.fill();
    }
    // cadre photo
    const fw = 46 * U, fh = 56 * U;
    const fx = wideScr ? wx - shw * 0.55 - fw / 2 : F.x + 12 * U;
    photoFrame(gf, Math.max(8 * U, fx), wy + wh + 30 * U, fw, fh, heads[0] ? heads[0].img : null, U, false);
    // plan de travail en bois + corbeille de fruits
    gf.fillStyle = 'rgba(0,0,0,0.3)';
    gf.fillRect(0, shelfY + 6 * U, cw, 6 * U);
    gf.fillStyle = lin(gf, 0, shelfY - 4 * U, 0, shelfY + 10 * U, [0, '#d49a62', 1, '#8a5428']);
    gf.fillRect(0, shelfY - 4 * U, cw, 14 * U);
    gf.fillStyle = lin(gf, 0, shelfY + 10 * U, 0, ch, [0, '#9a6438', 1, '#5a3418']);
    gf.fillRect(0, shelfY + 10 * U, cw, ch - shelfY);
    gf.strokeStyle = 'rgba(60,30,10,0.35)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let x = ((cx % (70 * U)) + 70 * U) % (70 * U); x < cw; x += 70 * U) { gf.moveTo(x, shelfY + 14 * U); gf.lineTo(x, ch); }
    gf.stroke();
    const bx = Math.min(cw - 34 * U, F.x + F.w + 70 * U);
    if (bx > F.x + F.w + 10 * U) {
      gf.fillStyle = '#c8643c';
      gf.beginPath(); gf.ellipse(bx, shelfY - 6 * U, 30 * U, 12 * U, 0, 0, Math.PI); gf.fill();
      for (const f of [[-14, -14, '#ffb61e'], [0, -18, '#ff7a3c'], [14, -13, '#7cc04f'], [-6, -26, '#ffcf3a'], [8, -27, '#e8473a']]) {
        gf.fillStyle = rad(gf, bx + f[0] * U - 3 * U, shelfY + f[1] * U - 3 * U, U, bx + f[0] * U, shelfY + f[1] * U, 10 * U, [0, '#ffffff', 0.25, f[2], 1, mix(f[2], '#000000', 0.3)]);
        circ(gf, bx + f[0] * U, shelfY + f[1] * U, 9 * U);
        gf.fill();
      }
    }
    out.win = p;
    out.beams = [beamPoly(wx + ww * 0.05, wx + ww * 0.55, wy + wh * 0.2, wx + ww * 0.35, wx + ww * 1.1, shelfY, '#fff6d8', 0.12),
      beamPoly(wx + ww * 0.55, wx + ww * 0.95, wy + wh * 0.2, wx + ww * 1.0, wx + ww * 1.5, shelfY, '#fff6d8', 0.07)];
    out.indoor = true;
  }

  // ---------------------------------------------------------------- 3. LA TERRASSE (midi)
  function paintTerrasse(gs, gf, cw, ch, F, out) {
    const U = F.s, cx = F.x + F.w / 2, shelfY = F.y + PY * U, hz = F.y + 420 * U;
    gs.fillStyle = lin(gs, 0, 0, 0, hz, [0, '#1560d6', 0.5, '#3f9cff', 0.88, '#a8dcff', 1, '#e2f5ff']);
    gs.fillRect(0, 0, cw, ch);
    sunDisc(gs, cx, F.y + 30 * U, 26 * U, '#ffffff', '#fff3b0', 220 * U);
    out.sun = { x: cx, y: F.y + 30 * U, r: 26 * U, col: '#fff6c8' };
    hillPath(gs, -20, cw + 20, hz - 16 * U, 26 * U, 0.7, 0.009 / U, ch);
    gs.fillStyle = '#9ab8d8';
    gs.fill();
    // village perché
    const vx = cx - F.w * 0.42, vy = hz - 34 * U;
    for (let i = 0; i < 9; i++) {
      const hx = vx + (i - 4) * 14 * U + hash(i) * 6 * U, hh = (12 + hash(i * 3) * 12) * U, hy = vy + Math.abs(i - 4) * 4 * U;
      gs.fillStyle = mix('#e9d8b8', '#c9b48e', hash(i * 7));
      gs.fillRect(hx, hy - hh, 13 * U, hh + 30 * U);
      gs.fillStyle = '#c8643c';
      gs.fillRect(hx - 1 * U, hy - hh - 3 * U, 15 * U, 4 * U);
    }
    gs.fillStyle = '#e2cfa8';
    gs.fillRect(vx - 2 * U, vy - 42 * U, 8 * U, 30 * U);
    gs.fillStyle = '#c8643c';
    gs.beginPath(); gs.moveTo(vx - 4 * U, vy - 42 * U); gs.lineTo(vx + 2 * U, vy - 52 * U); gs.lineTo(vx + 8 * U, vy - 42 * U); gs.fill();
    hillPath(gs, -20, cw + 20, hz + 4 * U, 18 * U, 3.3, 0.016 / U, ch);
    gs.fillStyle = '#7fae55';
    gs.fill();
    for (let i = 0; i < 12; i++) {
      const x = (hash(i * 4.4) * 1.2 - 0.1) * cw;
      if (Math.abs(x - vx) < 70 * U) continue;
      cypress(gs, x, hz + 6 * U, (30 + hash(i) * 26) * U, '#2f5a3a', 'rgba(255,255,220,0.25)');
    }
    // parapet en pierre avec des pots de géraniums
    const py0 = hz + 6 * U, py1 = py0 + 46 * U;
    gf.fillStyle = lin(gf, 0, py0, 0, py1, [0, '#f1e3c4', 1, '#cdb48a']);
    gf.fillRect(0, py0 + 8 * U, cw, py1 - py0 - 8 * U);
    gf.strokeStyle = 'rgba(120,90,50,0.35)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let r = 0; r < 3; r++) {
      const yy = py0 + 8 * U + r * 13 * U;
      gf.moveTo(0, yy); gf.lineTo(cw, yy);
      for (let x = (r % 2) * 18 * U; x < cw; x += 36 * U) { gf.moveTo(x, yy); gf.lineTo(x, yy + 13 * U); }
    }
    gf.stroke();
    gf.fillStyle = lin(gf, 0, py0, 0, py0 + 9 * U, [0, '#fff6e0', 1, '#d8c39a']);
    gf.fillRect(0, py0, cw, 9 * U);
    const potN = Math.max(2, Math.round(cw / (150 * U)));
    for (let i = 0; i < potN; i++) {
      const x = ((i + 0.5) / potN) * cw + (i % 2 ? 10 : -10) * U;
      gf.fillStyle = lin(gf, x - 12 * U, 0, x + 12 * U, 0, [0, '#a4502a', 0.4, '#e8874a', 1, '#8a3c18']);
      gf.beginPath(); gf.moveTo(x - 12 * U, py0 - 18 * U); gf.lineTo(x + 12 * U, py0 - 18 * U); gf.lineTo(x + 9 * U, py0); gf.lineTo(x - 9 * U, py0); gf.fill();
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI + (k / 6) * Math.PI;
        gf.fillStyle = '#4ea83a';
        ell(gf, x + Math.cos(a) * 12 * U, py0 - 22 * U + Math.sin(a) * 9 * U, 6 * U, 4.5 * U, a);
        gf.fill();
      }
      gf.fillStyle = '#ff3b4a';
      for (let k = 0; k < 6; k++) { circ(gf, x + (hash(i * 9 + k) - 0.5) * 22 * U, py0 - 26 * U - hash(i + k * 3) * 10 * U, 3.4 * U); gf.fill(); }
      gf.fillStyle = '#ffd0d4';
      for (let k = 0; k < 3; k++) { circ(gf, x + (hash(i * 5 + k) - 0.5) * 18 * U, py0 - 28 * U - hash(i * 2 + k) * 6 * U, 1.4 * U); gf.fill(); }
    }
    // sol de la terrasse (tomettes en perspective)
    gf.fillStyle = lin(gf, 0, py1, 0, shelfY, [0, '#c8743f', 1, '#a65a2c']);
    gf.fillRect(0, py1, cw, shelfY - py1 + 2 * U);
    gf.strokeStyle = 'rgba(80,40,15,0.28)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let i = -16; i <= 16; i++) { gf.moveTo(cx + i * 30 * U, py1); gf.lineTo(cx + i * 90 * U, shelfY); }
    for (let k = 1; k < 8; k++) { const yy = py1 + (shelfY - py1) * Math.pow(k / 8, 1.5); gf.moveTo(0, yy); gf.lineTo(cw, yy); }
    gf.stroke();
    gf.fillStyle = lin(gf, 0, py1, 0, py1 + 40 * U, [0, 'rgba(60,30,10,0.35)', 1, 'rgba(60,30,10,0)']);
    gf.fillRect(0, py1, cw, 40 * U);
    // ombres de la vigne et taches de soleil sur les tomettes
    for (let i = 0; i < Math.round(cw * (shelfY - py1) / (900 * U * U)); i++) {
      const x = hash(i * 3.17) * cw, y = py1 + 20 * U + hash(i * 7.31) * (shelfY - py1 - 30 * U), r = (10 + hash(i * 1.7) * 26) * U;
      gf.fillStyle = hash(i * 9.9) < 0.6 ? 'rgba(70,30,8,0.16)' : 'rgba(255,230,170,0.16)';
      ell(gf, x, y, r * 1.6, r * 0.55, (hash(i) - 0.5) * 0.4);
      gf.fill();
    }
    // pergola : poutre, poteaux, vigne et raisins
    const by = F.y + 4 * U;
    gf.fillStyle = 'rgba(0,0,0,0.22)';
    gf.fillRect(0, by + 20 * U, cw, 5 * U);
    gf.fillStyle = lin(gf, 0, 0, 0, by + 20 * U, [0, '#5a3618', 1, '#8a5a2b']);
    gf.fillRect(0, 0, cw, by + 20 * U);
    for (const x of [6 * U, cw - 6 * U]) {
      gf.fillStyle = lin(gf, x - 9 * U, 0, x + 9 * U, 0, [0, '#6a4220', 0.5, '#9a6a38', 1, '#5a3618']);
      gf.fillRect(x - 9 * U, 0, 18 * U, shelfY);
    }
    const leaf = (x, y, r, a, col) => {
      gf.save();
      gf.translate(x, y);
      gf.rotate(a);
      gf.fillStyle = col;
      gf.beginPath();
      gf.moveTo(0, r);
      for (let k = 0; k < 5; k++) {
        const aa = -Math.PI / 2 + (k - 2) * 0.62, rr = k % 2 ? r * 0.75 : r;
        gf.quadraticCurveTo(Math.cos(aa - 0.3) * rr * 0.7, Math.sin(aa - 0.3) * rr * 0.7 + r * 0.2, Math.cos(aa) * rr, Math.sin(aa) * rr);
      }
      gf.closePath();
      gf.fill();
      gf.strokeStyle = 'rgba(20,60,10,0.4)';
      gf.lineWidth = 0.8 * U;
      gf.beginPath(); gf.moveTo(0, r * 0.8); gf.lineTo(0, -r * 0.6); gf.stroke();
      gf.restore();
    };
    for (let i = 0; i < Math.ceil(cw / (13 * U)); i++) {
      const x = i * 13 * U + hash(i) * 8 * U, y = by + 16 * U + hash(i * 2.1) * 26 * U * (0.4 + 0.6 * hash(i * 0.7));
      leaf(x, y, (9 + hash(i * 1.9) * 6) * U, (hash(i * 3.7) - 0.5) * 1.2, ['#3f8f32', '#5aa83c', '#7cc04f', '#2f7a2a'][(hash(i * 5.3) * 4) | 0]);
    }
    for (let i = 0; i < Math.max(2, Math.round(cw / (170 * U))); i++) {
      const gx = ((i + 0.3 + hash(i) * 0.4) / Math.max(2, Math.round(cw / (170 * U)))) * cw, gy = by + 34 * U;
      for (let k = 0; k < 10; k++) {
        const row = Math.floor(Math.sqrt(k * 2)), xx = gx + (k - row * row * 0.5) * 2.4 * U - row * 2 * U, yy = gy + row * 5.6 * U;
        gf.fillStyle = rad(gf, xx - 1.4 * U, yy - 1.4 * U, 0.3 * U, xx, yy, 4 * U, [0, '#c9a6ff', 0.4, '#7a3fa0', 1, '#3e1a5e']);
        circ(gf, xx, yy, 3.6 * U);
        gf.fill();
      }
    }
    // table et nappe provençale jaune
    gf.fillStyle = 'rgba(0,0,0,0.3)';
    gf.fillRect(0, shelfY + 4 * U, cw, 6 * U);
    gf.fillStyle = lin(gf, 0, shelfY - 4 * U, 0, shelfY + 8 * U, [0, '#ffe27a', 1, '#e8b420']);
    gf.fillRect(0, shelfY - 4 * U, cw, 12 * U);
    gf.fillStyle = lin(gf, 0, shelfY + 8 * U, 0, ch, [0, '#f2c230', 1, '#c99a14']);
    gf.fillRect(0, shelfY + 8 * U, cw, ch - shelfY);
    gf.fillStyle = '#1d5fae';
    gf.fillRect(0, shelfY + 14 * U, cw, 9 * U);
    gf.fillStyle = '#ffffff';
    for (let x = ((cx % (16 * U)) + 16 * U) % (16 * U); x < cw; x += 16 * U) { circ(gf, x, shelfY + 18.5 * U, 2.2 * U); gf.fill(); }
    gf.fillStyle = 'rgba(140,90,0,0.25)';
    for (let x = ((cx % (34 * U)) + 34 * U) % (34 * U); x < cw; x += 34 * U) gf.fillRect(x, shelfY + 23 * U, 5 * U, ch);
    out.win = null;
    out.beams = [];
    out.indoor = false;
    out.glare = true;
  }

  // ---------------------------------------------------------------- 4. LE CHAMP DE LAVANDE (l'après-midi)
  function paintLavande(gs, gf, cw, ch, F, out) {
    const U = F.s, cx = F.x + F.w / 2, shelfY = F.y + PY * U, hz = F.y + 300 * U;
    gs.fillStyle = lin(gs, 0, 0, 0, hz, [0, '#2a70dc', 0.55, '#8cc0f2', 0.9, '#ffe2ae', 1, '#ffd68f']);
    gs.fillRect(0, 0, cw, ch);
    const sx = cx + F.w * 0.3, sy = F.y + 96 * U;
    sunDisc(gs, sx, sy, 20 * U, '#fff8dc', '#ffd27a', 190 * U);
    out.sun = { x: sx, y: sy, r: 20 * U, col: '#ffe0a0' };
    hillPath(gs, -20, cw + 20, hz - 10 * U, 30 * U, 2.6, 0.008 / U, ch);
    gs.fillStyle = '#9aa8dc';
    gs.fill();
    hillPath(gs, -20, cw + 20, hz + 2 * U, 16 * U, 5.2, 0.014 / U, ch);
    gs.fillStyle = '#8a9a6a';
    gs.fill();
    // le mas, les cyprès et un grand arbre
    const mx = cx - F.w * 0.36, my = hz;
    gs.fillStyle = '#ead6ae';
    gs.fillRect(mx - 30 * U, my - 26 * U, 60 * U, 26 * U);
    gs.fillRect(mx + 30 * U, my - 18 * U, 26 * U, 18 * U);
    gs.fillStyle = '#c45a34';
    gs.beginPath(); gs.moveTo(mx - 34 * U, my - 26 * U); gs.lineTo(mx, my - 40 * U); gs.lineTo(mx + 34 * U, my - 26 * U); gs.fill();
    gs.beginPath(); gs.moveTo(mx + 28 * U, my - 18 * U); gs.lineTo(mx + 58 * U, my - 22 * U); gs.lineTo(mx + 58 * U, my - 18 * U); gs.fill();
    gs.fillStyle = '#5f86a8';
    for (const k of [-20, -6, 8]) gs.fillRect(mx + k * U, my - 18 * U, 6 * U, 8 * U);
    gs.fillStyle = '#8a5a2b';
    gs.fillRect(mx - 3 * U, my - 10 * U, 7 * U, 10 * U);
    for (const k of [-1.9, -1.6, 1.6, 2.1]) cypress(gs, mx + k * 40 * U, my + 2 * U, (40 + hash(k) * 14) * U, '#2c4f35', 'rgba(255,230,180,0.3)');
    oliveTree(gs, cx + F.w * 0.42, hz + 4 * U, 30 * U, '#6f8f52', 'rgba(255,240,200,0.35)', '#5a4630');
    // rangées de lavande qui filent vers l'horizon
    gf.fillStyle = lin(gf, 0, hz, 0, shelfY, [0, '#8f9a5a', 1, '#6a5a32']);
    gf.fillRect(0, hz, cw, shelfY - hz + 4 * U);
    const vpx = cx, n = 13;
    for (let j = -n; j <= n; j++) {
      const xb = cx + j * 64 * U, half = 21 * U;
      gf.fillStyle = lin(gf, 0, hz, 0, shelfY, [0, '#9d8ae0', 0.25, '#8566d8', 1, '#6a3fc0']);
      gf.beginPath();
      gf.moveTo(vpx + j * 2.2 * U - 0.8 * U, hz);
      gf.lineTo(vpx + j * 2.2 * U + 0.8 * U, hz);
      gf.lineTo(xb + half, shelfY + 4 * U);
      gf.lineTo(xb - half, shelfY + 4 * U);
      gf.closePath();
      gf.fill();
      // touffes (plus grosses devant)
      for (let k = 0; k < 16; k++) {
        const t = Math.pow((k + 0.5) / 16, 1.6), y = hz + (shelfY - hz) * t, x = lerp(vpx + j * 2.2 * U, xb, t), r = lerp(1.2 * U, 20 * U, t);
        gf.fillStyle = k % 2 ? 'rgba(200,170,255,0.35)' : 'rgba(80,40,150,0.25)';
        ell(gf, x + (k % 2 ? r * 0.3 : -r * 0.3), y - r * 0.2, r * 0.9, r * 0.45);
        gf.fill();
      }
    }
    gf.fillStyle = lin(gf, 0, hz, 0, hz + 90 * U, [0, 'rgba(255,226,170,0.75)', 1, 'rgba(255,226,170,0)']);
    gf.fillRect(0, hz, cw, 90 * U);
    // coquelicots
    for (let i = 0; i < 26; i++) {
      const t = 0.55 + hash(i * 2.7) * 0.45, x = hash(i * 6.1) * cw, y = hz + (shelfY - hz) * t;
      gf.fillStyle = '#ff3b3b';
      circ(gf, x, y, (1 + 3 * t) * U);
      gf.fill();
    }
    // muret de pierres sèches (l'étagère de la bombe)
    gf.fillStyle = '#9a8460';
    gf.fillRect(0, shelfY - 6 * U, cw, ch - shelfY + 6 * U);
    let row = 0;
    for (let y = shelfY - 6 * U; y < ch; y += 13 * U, row++) {
      for (let x = -((row * 17) % 40) * U; x < cw; ) {
        const w = (26 + hash(x * 0.13 + row) * 22) * U;
        gf.fillStyle = mix('#d8c49a', '#b8a078', hash(x * 0.31 + row * 3.1));
        rrect(gf, x + 1.5 * U, y + 1.5 * U, w - 3 * U, 11 * U, 4 * U);
        gf.fill();
        gf.fillStyle = 'rgba(255,255,255,0.25)';
        gf.fillRect(x + 4 * U, y + 3 * U, w * 0.5, 1.6 * U);
        x += w;
      }
    }
    gf.fillStyle = 'rgba(0,0,0,0.18)';
    gf.fillRect(0, shelfY - 6 * U, cw, 2 * U);
    out.win = null;
    out.beams = [];
    out.indoor = false;
  }

  // ---------------------------------------------------------------- 5. LA PISCINE (le coucher du soleil)
  function paintPiscine(gs, gf, cw, ch, F, out) {
    const U = F.s, cx = F.x + F.w / 2, shelfY = F.y + PY * U, hz = F.y + 340 * U;
    gs.fillStyle = lin(gs, 0, 0, 0, hz, [0, '#28296e', 0.38, '#9a4486', 0.72, '#ff7a5a', 1, '#ffcf7a']);
    gs.fillRect(0, 0, cw, ch);
    stars(gs, 0, 0, cw, hz * 0.3, 40, 7.7, 0.6);
    const sx = cx - F.w * 0.12, sy = hz - 6 * U;
    sunDisc(gs, sx, sy, 34 * U, '#ffe8a8', '#ff8a4c', 260 * U);
    out.sun = { x: sx, y: sy, r: 34 * U, col: '#ffb070' };
    hillPath(gs, -20, cw + 20, hz + 2 * U, 26 * U, 1.1, 0.01 / U, ch);
    gs.fillStyle = '#5a3a78';
    gs.fill();
    hillPath(gs, -20, cw + 20, hz + 10 * U, 14 * U, 4.4, 0.02 / U, ch);
    gs.fillStyle = '#3e2a5e';
    gs.fill();
    // palmiers
    const palm = (x, yb, h, s) => {
      gs.strokeStyle = '#24163a';
      gs.lineWidth = 5 * U;
      gs.lineCap = 'round';
      gs.beginPath(); gs.moveTo(x, yb); gs.quadraticCurveTo(x + s * 12 * U, yb - h * 0.6, x + s * 6 * U, yb - h); gs.stroke();
      gs.fillStyle = '#24163a';
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.48;
        gs.beginPath();
        gs.moveTo(x + s * 6 * U, yb - h);
        gs.quadraticCurveTo(x + s * 6 * U + Math.cos(a - 0.3) * 30 * U, yb - h + Math.sin(a - 0.3) * 18 * U, x + s * 6 * U + Math.cos(a) * 40 * U, yb - h + Math.sin(a) * 26 * U + 14 * U);
        gs.quadraticCurveTo(x + s * 6 * U + Math.cos(a) * 18 * U, yb - h + Math.sin(a) * 10 * U + 2 * U, x + s * 6 * U, yb - h);
        gs.fill();
      }
    };
    palm(cx - F.w * 0.46, hz + 34 * U, 110 * U, 1);
    palm(cx + F.w * 0.5, hz + 34 * U, 96 * U, -1);
    // pool house éclairé par le couchant
    const hx = cx + F.w * 0.22, hy = hz + 30 * U;
    gs.fillStyle = '#ffd7b8';
    gs.fillRect(hx, hy - 40 * U, 70 * U, 40 * U);
    gs.fillStyle = '#e8a87a';
    gs.fillRect(hx + 50 * U, hy - 40 * U, 20 * U, 40 * U);
    gs.fillStyle = '#5a3a5e';
    gs.beginPath(); gs.arc(hx + 18 * U, hy - 12 * U, 10 * U, Math.PI, 0); gs.lineTo(hx + 28 * U, hy); gs.lineTo(hx + 8 * U, hy); gs.fill();
    gs.fillStyle = '#c45a34';
    gs.fillRect(hx - 4 * U, hy - 44 * U, 78 * U, 5 * U);
    // plage de la piscine (au loin)
    const d0 = hz + 30 * U, d1 = hz + 46 * U;
    gf.fillStyle = lin(gf, 0, d0, 0, d1, [0, '#ffd2b0', 1, '#e8a888']);
    gf.fillRect(0, d0, cw, d1 - d0);
    gf.fillStyle = '#2a7ad0';
    gf.fillRect(0, d1, cw, 5 * U);
    gf.fillStyle = 'rgba(255,255,255,0.4)';
    for (let x = 0; x < cw; x += 8 * U) gf.fillRect(x, d1 + 1 * U, 4 * U, 1.4 * U);
    // l'eau
    const w0 = d1 + 5 * U;
    gf.fillStyle = lin(gf, 0, w0, 0, shelfY, [0, '#5a8ed8', 0.35, '#2fb8d0', 1, '#0b78a8']);
    gf.fillRect(0, w0, cw, shelfY - w0 + 4 * U);
    // reflet du soleil
    for (let k = 0; k < 22; k++) {
      const t = k / 22, y = w0 + (shelfY - w0) * Math.pow(t, 1.2), ww = (14 + t * 70) * U * (0.5 + hash(k) * 0.8);
      gf.fillStyle = 'rgba(255,' + Math.round(200 + 40 * (1 - t)) + ',120,' + (0.55 - t * 0.35).toFixed(2) + ')';
      rrect(gf, sx - ww / 2 + (hash(k * 3) - 0.5) * 20 * U, y, ww, (2 + t * 3) * U, 2 * U);
      gf.fill();
    }
    gf.strokeStyle = 'rgba(255,255,255,0.22)';
    gf.lineWidth = Math.max(1, 1.2 * U);
    for (let k = 1; k < 10; k++) {
      const y = w0 + (shelfY - w0) * Math.pow(k / 10, 1.4);
      gf.beginPath();
      for (let x = 0; x <= cw; x += 12) gf.lineTo(x, y + Math.sin(x * 0.03 / U + k * 1.7) * (1 + k * 0.5) * U);
      gf.stroke();
    }
    // flamant rose gonflable
    const fx = Math.min(cw - 50 * U, cx + F.w * 0.38), fy = w0 + (shelfY - w0) * 0.42;
    gf.fillStyle = 'rgba(0,40,80,0.25)';
    ell(gf, fx, fy + 10 * U, 34 * U, 8 * U);
    gf.fill();
    gf.fillStyle = rad(gf, fx - 8 * U, fy - 6 * U, 2 * U, fx, fy, 30 * U, [0, '#ffd0e4', 0.5, '#ff7ab0', 1, '#d64a88']);
    ell(gf, fx, fy, 30 * U, 12 * U);
    gf.fill();
    gf.strokeStyle = '#ff7ab0';
    gf.lineWidth = 7 * U;
    gf.lineCap = 'round';
    gf.beginPath(); gf.moveTo(fx + 20 * U, fy - 4 * U); gf.quadraticCurveTo(fx + 34 * U, fy - 30 * U, fx + 20 * U, fy - 44 * U); gf.stroke();
    gf.fillStyle = '#ff7ab0';
    circ(gf, fx + 18 * U, fy - 46 * U, 7 * U);
    gf.fill();
    gf.fillStyle = '#2a1a2a';
    gf.beginPath(); gf.moveTo(fx + 12 * U, fy - 47 * U); gf.lineTo(fx + 6 * U, fy - 42 * U); gf.lineTo(fx + 13 * U, fy - 43 * U); gf.fill();
    gf.fillStyle = '#ffffff';
    circ(gf, fx + 19 * U, fy - 48 * U, 1.6 * U);
    gf.fill();
    // margelle (l'étagère de la bombe)
    gf.fillStyle = 'rgba(0,30,60,0.35)';
    gf.fillRect(0, shelfY + 4 * U, cw, 6 * U);
    gf.fillStyle = lin(gf, 0, shelfY - 5 * U, 0, shelfY + 9 * U, [0, '#fff3e6', 1, '#d9c2ac']);
    gf.fillRect(0, shelfY - 5 * U, cw, 14 * U);
    gf.fillStyle = lin(gf, 0, shelfY + 9 * U, 0, ch, [0, '#e8d4c0', 1, '#b89a80']);
    gf.fillRect(0, shelfY + 9 * U, cw, ch - shelfY);
    gf.strokeStyle = 'rgba(120,80,60,0.3)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let x = ((cx % (44 * U)) + 44 * U) % (44 * U); x < cw; x += 44 * U) { gf.moveTo(x, shelfY - 5 * U); gf.lineTo(x, shelfY + 9 * U); }
    gf.stroke();
    out.win = null;
    out.beams = [];
    out.indoor = false;
    out.water = { y0: w0, y1: shelfY };
  }

  // ---------------------------------------------------------------- 6. LA NUIT D'ÉTÉ
  function paintNuit(gs, gf, cw, ch, F, out) {
    const U = F.s, cx = F.x + F.w / 2, shelfY = F.y + PY * U, hz = F.y + 380 * U;
    gs.fillStyle = lin(gs, 0, 0, 0, hz, [0, '#030716', 0.5, '#0b1638', 1, '#22345e']);
    gs.fillRect(0, 0, cw, ch);
    // voie lactée
    gs.save();
    gs.translate(cx, hz * 0.45);
    gs.rotate(-0.5);
    gs.fillStyle = rad(gs, 0, 0, 10, 0, 0, Math.max(cw, ch) * 0.6, [0, 'rgba(160,170,255,0.16)', 1, 'rgba(160,170,255,0)']);
    gs.scale(1, 0.22);
    circ(gs, 0, 0, Math.max(cw, ch) * 0.6);
    gs.fill();
    gs.restore();
    stars(gs, 0, 0, cw, hz, Math.round(cw * hz / 900), 3.3, 1);
    const mx = cx + F.w * 0.3, my = F.y + 120 * U;
    sunDisc(gs, mx, my, 24 * U, '#fdf6d8', '#9fb8ff', 200 * U, 0.7);
    gs.fillStyle = 'rgba(180,170,140,0.35)';
    for (const c of [[-7, -5, 5], [6, 4, 4], [-3, 9, 3], [9, -8, 2.5]]) { circ(gs, mx + c[0] * U, my + c[1] * U, c[2] * U); gs.fill(); }
    out.sun = { x: mx, y: my, r: 24 * U, col: '#c8d6ff' };
    hillPath(gs, -20, cw + 20, hz - 6 * U, 26 * U, 3.1, 0.009 / U, ch);
    gs.fillStyle = '#101d3a';
    gs.fill();
    // le mas et ses fenêtres allumées
    const hx = cx - F.w * 0.3, hy = hz + 8 * U;
    gs.fillStyle = '#16223e';
    gs.fillRect(hx - 44 * U, hy - 34 * U, 88 * U, 34 * U);
    gs.beginPath(); gs.moveTo(hx - 50 * U, hy - 34 * U); gs.lineTo(hx, hy - 54 * U); gs.lineTo(hx + 50 * U, hy - 34 * U); gs.fill();
    for (const k of [-30, -10, 10, 30]) {
      const lit = hash(k + 1) > 0.25;
      if (lit) { gs.fillStyle = rad(gs, hx + k * U, hy - 20 * U, 1, hx + k * U, hy - 20 * U, 26 * U, [0, 'rgba(255,200,100,0.35)', 1, 'rgba(255,200,100,0)']); gs.fillRect(hx + k * U - 26 * U, hy - 46 * U, 52 * U, 52 * U); }
      gs.fillStyle = lit ? '#ffcf6b' : '#26324e';
      gs.fillRect(hx + k * U - 4 * U, hy - 26 * U, 8 * U, 10 * U);
    }
    hillPath(gs, -20, cw + 20, hz + 12 * U, 12 * U, 0.9, 0.02 / U, ch);
    gs.fillStyle = '#0a1428';
    gs.fill();
    for (let i = 0; i < 9; i++) {
      const x = (hash(i * 3.9) * 1.2 - 0.1) * cw;
      if (Math.abs(x - hx) < 60 * U) continue;
      cypress(gs, x, hz + 14 * U, (40 + hash(i) * 30) * U, '#060d1c', 'rgba(150,170,255,0.12)');
    }
    // jardin : pelouse, buissons de lavande dans l'ombre
    gf.fillStyle = lin(gf, 0, hz + 10 * U, 0, shelfY, [0, '#16283a', 0.35, '#0f2028', 1, '#132a29']);
    gf.fillRect(0, hz + 10 * U, cw, shelfY - hz);
    // sentier de dalles éclairé par la lune, jusqu'au mas
    const top = hz + 14 * U, hx2 = cx - F.w * 0.3;
    for (let k = 0; k < 22; k++) {
      const t = k / 21, y = top + (shelfY - top) * Math.pow(t, 1.5), half = lerp(6, 70, t) * U;
      const xm = lerp(hx2, cx + F.w * 0.08, t) + Math.sin(t * 3.2) * 18 * U;
      for (let j = -1; j <= 1; j++) {
        const sx = xm + j * half * 0.62 + (hash(k * 3 + j) - 0.5) * half * 0.2, sw = half * 0.5, sh = lerp(1.6, 11, t) * U;
        gf.fillStyle = mix('#3a4a63', '#6d7f9e', 0.3 + hash(k + j * 7) * 0.4);
        ell(gf, sx, y, sw, sh);
        gf.fill();
        gf.fillStyle = 'rgba(200,215,255,0.12)';
        ell(gf, sx - sw * 0.2, y - sh * 0.3, sw * 0.6, sh * 0.4);
        gf.fill();
      }
    }
    // herbes et petites fleurs qui luisent
    gf.strokeStyle = 'rgba(40,80,60,0.55)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let i = 0; i < Math.round(cw / (5 * U)); i++) {
      const x = hash(i * 1.37) * cw, y = hz + 30 * U + hash(i * 2.91) * (shelfY - hz - 40 * U), h = (3 + hash(i) * 6) * U * (0.5 + (y - hz) / (shelfY - hz));
      gf.moveTo(x, y); gf.lineTo(x - 1.5 * U, y - h); gf.moveTo(x, y); gf.lineTo(x + 1.8 * U, y - h * 0.8);
    }
    gf.stroke();
    for (let i = 0; i < Math.round(cw / (16 * U)); i++) {
      const x = hash(i * 5.13) * cw, y = hz + 40 * U + hash(i * 8.17) * (shelfY - hz - 60 * U), r = (1.2 + hash(i * 3.3) * 1.6) * U;
      gf.fillStyle = 'rgba(230,240,255,0.12)';
      circ(gf, x, y, r * 4);
      gf.fill();
      gf.fillStyle = hash(i) < 0.5 ? '#f4f0ff' : '#ffe9a8';
      circ(gf, x, y, r);
      gf.fill();
    }
    for (let i = 0; i < Math.ceil(cw / (34 * U)) + 1; i++) {
      const x = i * 34 * U + hash(i) * 10 * U, y = shelfY - 14 * U - hash(i * 1.3) * 18 * U;
      gf.fillStyle = '#2a2350';
      ell(gf, x, y, 22 * U, 14 * U);
      gf.fill();
      gf.fillStyle = 'rgba(160,140,255,0.25)';
      for (let k = 0; k < 6; k++) { ell(gf, x + (k - 2.5) * 6 * U, y - 6 * U - hash(i + k) * 6 * U, 1.6 * U, 4 * U); gf.fill(); }
    }
    // guirlande guinguette (les ampoules brillent en direct)
    const bulbs = [];
    const rows = [[F.y + 26 * U, 70 * U]];
    if (cw > F.w + 200) rows.push([F.y + 120 * U, 60 * U]);
    for (const [y0, sag] of rows) {
      gf.strokeStyle = '#05070c';
      gf.lineWidth = 1.6 * U;
      gf.beginPath();
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const t = i / N, x = t * cw, y = y0 + Math.sin(t * Math.PI) * sag * 0.6 + Math.sin(t * Math.PI * 3) * sag * 0.25;
        if (i) gf.lineTo(x, y); else gf.moveTo(x, y);
      }
      gf.stroke();
      const nb = Math.max(6, Math.round(cw / (34 * U)));
      for (let i = 0; i < nb; i++) {
        const t = (i + 0.5) / nb, x = t * cw, y = y0 + Math.sin(t * Math.PI) * sag * 0.6 + Math.sin(t * Math.PI * 3) * sag * 0.25;
        gf.fillStyle = '#222';
        gf.fillRect(x - 2 * U, y, 4 * U, 4 * U);
        bulbs.push({ x, y: y + 9 * U, c: ['#ffd34d', '#ff7ab0', '#7af0ff', '#c6f36b', '#ffa64d'][i % 5], p: hash(i * 2.3) * TAU });
      }
    }
    // terrasse en bois (l'étagère de la bombe)
    gf.fillStyle = 'rgba(0,0,0,0.4)';
    gf.fillRect(0, shelfY + 4 * U, cw, 6 * U);
    gf.fillStyle = lin(gf, 0, shelfY - 4 * U, 0, shelfY + 8 * U, [0, '#8a6038', 1, '#4a301a']);
    gf.fillRect(0, shelfY - 4 * U, cw, 12 * U);
    gf.fillStyle = lin(gf, 0, shelfY + 8 * U, 0, ch, [0, '#3e2816', 1, '#24160a']);
    gf.fillRect(0, shelfY + 8 * U, cw, ch - shelfY);
    gf.strokeStyle = 'rgba(0,0,0,0.4)';
    gf.lineWidth = Math.max(1, U);
    gf.beginPath();
    for (let x = ((cx % (60 * U)) + 60 * U) % (60 * U); x < cw; x += 60 * U) { gf.moveTo(x, shelfY - 4 * U); gf.lineTo(x, ch); }
    gf.stroke();
    out.win = null;
    out.beams = [];
    out.indoor = false;
    out.bulbs = bulbs;
    out.night = true;
  }
  const PAINTERS = { bain: paintBain, cuisine: paintCuisine, terrasse: paintTerrasse, lavande: paintLavande, piscine: paintPiscine, nuit: paintNuit };
  function paintScene(wi, cw, ch, F, k, heads) {
    const sky = mkCanvas(cw * k, ch * k), fg = mkCanvas(cw * k, ch * k);
    const gs = sky.getContext('2d'), gf = fg.getContext('2d');
    gs.setTransform(k, 0, 0, k, 0, 0);
    gf.setTransform(k, 0, 0, k, 0, 0);
    const out = { sky, fg, win: null, sun: null, beams: [], indoor: false, bulbs: null, night: false, glare: false, water: null, wi };
    try { PAINTERS[WORLDS[wi].id](gs, gf, cw, ch, F, out, heads || []); } catch (e) { /* un décor ne doit jamais casser le jeu */ }
    return out;
  }

  // ===========================================================================
  // MOUNT
  // ===========================================================================
  function mount(root, api) {
    mapPlaying++;      // (la carte d'avancement ne prépare rien pendant une partie)
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    // ---- mode compétition (CONTRACT.md Ajout 6) : vague de départ, badge, graine
    const num = (v) => (v == null || v === '' ? NaN : Math.floor(Number(v)));
    const START = num(api.startLevel) >= 1 ? Math.min(99, num(api.startLevel)) : 1;
    const COMPET = api.mode === 'compet';
    const SEED = Number.isFinite(num(api.seed)) ? (num(api.seed) >>> 0) : null;
    // le hasard du CONTENU (formations, plongeons, gouttes, bonus, boss, têtes) vient de flux mulberry32
    // re-grainés à chaque vague : avec api.seed, la vague N est la même pour tous. Effets : Math.random.
    const baseSeed = SEED !== null ? SEED : ((Math.random() * 4294967296) >>> 0);
    const RNG = {};
    function reseed(n) {
      const s = (k) => mulberry32((baseSeed ^ Math.imul(n, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0);
      RNG.form = s(1); RNG.dive = s(2); RNG.drop = s(3); RNG.luck = s(4); RNG.boss = s(5); RNG.head = s(6); RNG.swarm = s(7); RNG.raid = s(8);
    }
    const cr = (k) => RNG[k]();
    const crnd = (k, a, b) => a + RNG[k]() * (b - a);
    const cpick = (k, arr) => arr[(RNG[k]() * arr.length) | 0];
    const doc = document;
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ---------------------------------------------------------------- sons (synthèse de la bibliothèque, budget par image)
    let sndBudget = 8, rtime = 0;
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.12 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rtime - l < gap) return false;
      sndLast[ch] = rtime;
      sndBudget--;
      return true;
    }
    const sfxQ = [];
    function later(d, fn) { if (sfxQ.length < 80) sfxQ.push({ t: d, fn }); }
    function arp(notes, step, ty, v, d) { notes.forEach((f, i) => later(i * step, () => tone(f, d || step * 1.5, ty || 'square', v || 0.04))); }
    const SFX = {
      shot() { if (canPlay('shot', 0.075)) { noise(0.05, 0.03, 5200); tone(1500 + Math.random() * 300, 0.04, 'sine', 0.012, 1900); } },
      kill(k) {
        if (!canPlay('kill', 0.03)) return;
        const up = Math.pow(2, Math.min(k, 12) / 12);
        noise(0.13, 0.11, 2600);
        tone(460 * up, 0.09, 'square', 0.035, 150);
        later(0.04, () => tone(880 * up, 0.07, 'triangle', 0.03));
      },
      big() { noise(0.45, 0.18, 1600); tone(140, 0.45, 'sawtooth', 0.06, 40); later(0.06, () => noise(0.3, 0.1, 4200)); },
      clonk() { if (canPlay('clonk', 0.05)) { tone(1500, 0.06, 'square', 0.03, 900); tone(2400, 0.05, 'sine', 0.02); } },
      blop() { if (canPlay('blop', 0.05)) tone(360, 0.08, 'triangle', 0.04, 190); },
      head() { arp([660, 880, 660, 990], 0.07, 'square', 0.035); },
      sad() { arp([520, 440, 370, 330], 0.11, 'triangle', 0.045); },
      drop() { if (canPlay('drop', 0.09)) tone(520 + Math.random() * 80, 0.06, 'sine', 0.016, 300); },
      dropHit() { if (canPlay('dhit', 0.05)) { tone(900, 0.05, 'triangle', 0.028, 600); noise(0.04, 0.03, 3000); } },
      shield() { if (canPlay('shield', 0.05)) noise(0.06, 0.04, 900); },
      warn() { if (canPlay('warn', 0.2)) tone(820, 0.2, 'sine', 0.022, 1250); },
      dive() { if (canPlay('dive', 0.15)) tone(1100, 0.35, 'sine', 0.02, 380); },
      buzz() { if (canPlay('buzz', 0.24)) tone(130 + Math.random() * 20, 0.22, 'sawtooth', 0.014, 115); },
      whine() { if (canPlay('whine', 0.3)) tone(1700, 0.3, 'sine', 0.012, 1500); },
      cap() { if (canPlay('cap', 0.2)) tone(980, 0.12, 'sine', 0.03, 1400); },
      power() { arp([660, 880, 1100, 1320, 1760], 0.05, 'square', 0.035, 0.08); },
      combo(m) { arp([700 + m * 100, 900 + m * 120, 1200 + m * 150], 0.05, 'square', 0.035, 0.07); },
      milestone() { noise(0.4, 0.08, 6000); arp([523, 659, 784, 1047, 1319, 1568], 0.05, 'square', 0.04, 0.09); },
      lose() { tone(300, 0.18, 'triangle', 0.025, 200); },
      gaugeFull() { arp([784, 988, 1175, 1568], 0.07, 'triangle', 0.05, 0.12); },
      swatUp() { noise(0.35, 0.09, 1400); tone(200, 0.3, 'sawtooth', 0.03, 600); },
      clac() { noise(0.35, 0.32, 3200); tone(110, 0.4, 'square', 0.08, 36); later(0.03, () => noise(0.25, 0.12, 900)); later(0.08, () => tone(1600, 0.08, 'square', 0.03, 800)); },
      clear() { noise(0.6, 0.06, 5200); arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.075, 'square', 0.04); },
      wind() { noise(1.6, 0.12, 900); later(0.3, () => noise(1.2, 0.08, 2600)); tone(180, 1.2, 'sine', 0.03, 520); },
      chime() { arp([1047, 1319, 1568, 2093], 0.09, 'triangle', 0.045, 0.3); },
      ready() { arp([523, 659, 784], 0.1, 'square', 0.035); },
      go() { tone(880, 0.14, 'square', 0.045); later(0.05, () => tone(1320, 0.2, 'triangle', 0.04)); },
      bossIntro() {
        tone(70, 1.2, 'sawtooth', 0.06, 50);
        for (let i = 0; i < 6; i++) later(i * 0.16, () => noise(0.1, 0.12 + i * 0.015, 500));
        later(1.0, () => arp([196, 262, 196, 330, 392], 0.12, 'square', 0.045));
      },
      bossHit() { if (canPlay('bhit', 0.06)) { tone(300 + Math.random() * 60, 0.05, 'square', 0.025, 180); } },
      bossShot() { if (canPlay('bshot', 0.12)) tone(240, 0.16, 'sine', 0.03, 120); },
      boom() { if (canPlay('boom', 0.08)) { noise(0.35, 0.16, 1200); tone(90 + Math.random() * 30, 0.3, 'sawtooth', 0.05, 40); } },
      bossDown() { noise(1.2, 0.22, 900); tone(220, 1.4, 'sawtooth', 0.06, 40); later(0.5, () => arp([392, 523, 659, 784, 1047, 1319], 0.09, 'square', 0.045)); },
      die() { noise(0.3, 0.2, 900); tone(900, 1.3, 'sawtooth', 0.06, 60); later(0.15, () => noise(1.0, 0.12, 1600)); later(0.8, () => tone(196, 0.6, 'square', 0.04, 90)); },
      dark() { tone(120, 0.5, 'sawtooth', 0.04, 60); },
      light() { tone(440, 0.12, 'triangle', 0.03, 880); },
      tick() { tone(1250, 0.03, 'sine', 0.025); }
    };

    // ---------------------------------------------------------------- préférences (tutoriel vu)
    function pref(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function setPref(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* rien */ } }

    // ---------------------------------------------------------------- DOM
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    const style = doc.createElement('style');
    style.textContent = '@keyframes jdwMoPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,95,174,0.7)}50%{transform:scale(1.08);box-shadow:0 0 22px 8px rgba(255,95,174,0.55)}}';
    root.appendChild(style);
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
        for (let i = 0; i < 2; i++) {
          const b = doc.createElement('span');
          b.style.cssText = 'display:block;width:5px;height:16px;border-radius:2px;background:#ffffff;pointer-events:none;';
          pauseBtn.appendChild(b);
        }
      }
    }
    pauseIcon(false);
    root.appendChild(pauseBtn);
    // bouton TAPETTE (jauge circulaire)
    const swatBtn = doc.createElement('button');
    swatBtn.type = 'button';
    swatBtn.setAttribute('aria-label', 'Tapette géante');
    swatBtn.style.cssText = 'position:absolute;width:66px;height:66px;border-radius:50%;border:none;padding:4px;margin:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;box-sizing:border-box;background:conic-gradient(#ff5fae 0%, rgba(255,255,255,0.16) 0);display:none;';
    swatBtn.innerHTML = '<span style="display:flex;width:100%;height:100%;border-radius:50%;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#3a2a5a,#120a22);pointer-events:none">' +
      '<svg width="40" height="40" viewBox="0 0 40 40" style="pointer-events:none"><g transform="rotate(-35 20 20)">' +
      '<rect x="12" y="2" width="16" height="18" rx="4" fill="#b06cff" stroke="#e9d4ff" stroke-width="1.6"/>' +
      '<path d="M15 6h10M15 10h10M15 14h10M17 4v14M20 4v14M23 4v14" stroke="#4a1f80" stroke-width="1.1"/>' +
      '<rect x="18.4" y="19" width="3.2" height="18" rx="1.6" fill="#e2a35a"/><rect x="17.6" y="31" width="4.8" height="7" rx="2" fill="#ff5fae"/></g></svg></span>';
    root.appendChild(swatBtn);
    const swatLbl = doc.createElement('div');
    swatLbl.style.cssText = 'position:absolute;width:86px;text-align:center;font:700 10px ' + FB + ';color:#fff;text-shadow:0 1px 2px #000;pointer-events:none;z-index:3;display:none;letter-spacing:0.5px;';
    swatLbl.textContent = 'ESPACE';
    root.appendChild(swatLbl);

    // ---------------------------------------------------------------- mise en page : aire de jeu fixe, décor plein écran
    let cw = 300, ch = 500, dpr = 1, quality = 1, U = 1, FX = 0, FY = 0, FW = W, FH = H, res = 0, wide = false, touchUI = true, hudY = 0;
    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      cw = Math.max(160, Math.round(r.width || root.clientWidth || 300));
      ch = Math.max(200, Math.round(r.height || root.clientHeight || 500));
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      U = Math.min(cw / W, ch / H);
      FW = W * U; FH = H * U;
      FX = (cw - FW) / 2;
      FY = ch - FH;
      wide = FX >= 220 && ch >= 520;
      let fine = false;
      try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
      touchUI = !fine;
      hudY = 0;
      const nr = clamp(U * dpr, 0.5, 4);
      if (!SPRITES || Math.abs(nr - res) > 0.02) { res = nr; buildSprites(); if (started && boss) buildBossSprites(boss.kind); if (started) { buildShieldArt(WORLDS[worldIdx].shield); shields.forEach((sh, i) => { sh.art = i === rollIdx && rollHead ? stickerArt(rollHead) : shieldArt; sh.dirty = true; }); } }
      if (started) { scene = null; nextScene = null; buildScene(); }
      layoutButtons();
      initAmbient();
    }
    function layoutButtons() {
      const size = wide ? 72 : 66;
      swatBtn.style.width = swatBtn.style.height = size + 'px';
      if (wide) {
        swatBtn.style.left = Math.round(FX + FW + 34) + 'px';
        swatBtn.style.right = 'auto';
        swatBtn.style.bottom = Math.round(ch * 0.2) + 'px';
      } else {
        swatBtn.style.left = 'auto';
        swatBtn.style.right = 'calc(10px + env(safe-area-inset-right, 0px))';
        swatBtn.style.bottom = 'calc(' + Math.round(Math.max(14, (H - PY) * U + 8)) + 'px + env(safe-area-inset-bottom, 0px))';
      }
      swatLbl.style.left = wide ? Math.round(FX + FW + 34 + size / 2 - 43) + 'px' : 'auto';
      swatLbl.style.right = wide ? 'auto' : 'calc(' + (10 + size / 2 - 43) + 'px + env(safe-area-inset-right, 0px))';
      swatLbl.style.bottom = wide ? Math.round(ch * 0.2 - 18) + 'px' : 'calc(' + Math.round(Math.max(14, (H - PY) * U + 8) - 16) + 'px + env(safe-area-inset-bottom, 0px))';
      swatLbl.textContent = touchUI ? '' : 'ESPACE';
    }

    // ---------------------------------------------------------------- sprites (mis en cache à la bonne résolution)
    let SPRITES = null;
    function spr(wu, hu, ox, oy, fn) {
      const cv = mkCanvas(wu * res, hu * res);
      const g = cv.getContext('2d');
      g.setTransform(res, 0, 0, res, ox * res, oy * res);
      try { fn(g); } catch (e) { /* rien */ }
      cv._w = wu; cv._h = hu; cv._ox = ox; cv._oy = oy;
      return cv;
    }
    function buildSprites() {
      const S = { fly: {}, dead: {}, drop: {}, cap: {}, icon: {} };
      for (const ty of Object.keys(TYPES)) {
        const arr = [];
        for (let i = 0; i < FRAMES; i++) arr.push(spr(SPR, SPR, SPR / 2, SPR / 2, (g) => paintInsect(g, ty, (i / FRAMES) * TAU, false)));
        S.fly[ty] = arr;
        S.dead[ty] = spr(SPR, SPR, SPR / 2, SPR / 2, (g) => paintInsect(g, ty, 0, true));
      }
      S.pupil = spr(8, 8, 4, 4, (g) => { g.fillStyle = '#120e0b'; circ(g, 0, 0, 3.2); g.fill(); g.fillStyle = '#ffffff'; circ(g, -1.1, -1.2, 1.05); g.fill(); });
      S.can = spr(40, 64, 20, 60, paintCan);
      S.bee = spr(56, 40, 28, 18, (g) => paintBee(g, 0.3, false));
      S.bee2 = spr(56, 40, 28, 18, (g) => paintBee(g, 0.33, false));
      for (const k of DROP_KINDS) S.drop[k] = spr(18, 20, 9, 10, (g) => paintDrop(g, k));
      for (const k of CAP_KINDS) S.cap[k] = spr(30, 30, 15, 15, (g) => paintCap(g, k));
      S.puff = spr(28, 28, 14, 14, (g) => paintPuff(g, false));
      S.puffG = spr(28, 28, 14, 14, (g) => paintPuff(g, true));
      S.glow = spr(64, 64, 32, 32, (g) => { g.fillStyle = rad(g, 0, 0, 0, 0, 0, 32, [0, 'rgba(255,255,255,1)', 0.3, 'rgba(255,255,255,0.45)', 1, 'rgba(255,255,255,0)']); g.fillRect(-32, -32, 64, 64); });
      S.soft = spr(32, 32, 16, 16, (g) => { g.fillStyle = rad(g, 0, 0, 0, 0, 0, 16, [0, 'rgba(255,255,255,0.95)', 0.55, 'rgba(255,255,255,0.5)', 1, 'rgba(255,255,255,0)']); g.fillRect(-16, -16, 32, 32); });
      S.petal = spr(10, 10, 5, 5, (g) => { g.fillStyle = '#b98cff'; ell(g, 0, 0, 2.2, 4.2, 0.4); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; ell(g, -0.6, -1, 0.8, 1.6, 0.4); g.fill(); });
      S.leaf = spr(14, 14, 7, 7, (g) => { g.fillStyle = '#6fb84a'; ell(g, 0, 0, 3, 6, 0.3); g.fill(); g.strokeStyle = 'rgba(20,60,10,0.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-1.8, 5); g.lineTo(1.8, -5); g.stroke(); });
      S.star = spr(14, 14, 7, 7, (g) => { g.fillStyle = '#ffd34d'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 2.6 : 6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(90,50,0,0.7)'; g.lineWidth = 0.8; g.stroke(); });
      S.swat = spr(SWAT_W + 20, SWAT_HANDLE + SWAT_H + 12, SWAT_W / 2 + 10, SWAT_HANDLE + SWAT_H + 2, paintSwatter);
      for (const w of WORLDS) S.icon[w.id] = spr(40, 40, 20, 20, (g) => paintWorldIcon(g, w.id, 18));
      S.cloud = spr(150, 70, 75, 40, (g) => {
        const blobs = [[-40, 6, 26], [-14, -8, 30], [18, -4, 28], [44, 8, 22], [0, 12, 30], [-28, 14, 20], [30, 16, 20]];
        for (const b of blobs) { g.fillStyle = rad(g, b[0] - b[2] * 0.3, b[1] - b[2] * 0.5, b[2] * 0.1, b[0], b[1], b[2], [0, 'rgba(255,255,255,1)', 0.7, 'rgba(255,255,255,0.95)', 1, 'rgba(225,232,245,0.9)']); circ(g, b[0], b[1], b[2]); g.fill(); }
        g.fillStyle = 'rgba(160,175,205,0.35)';
        ell(g, 0, 22, 66, 9);
        g.fill();
      });
      S.ko = spr(30, 14, 15, 7, (g) => { for (let i = 0; i < 3; i++) { g.save(); g.translate(-9 + i * 9, Math.sin(i * 2) * 2); g.fillStyle = '#ffe36a'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 1.6 : 3.8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); } });
      SPRITES = S;
      tintCache.clear();
      textCache.clear();
      bossSpr = null;
      bossBuild = null;
      shieldArt = null;
    }
    // halo teinté (mis en cache par couleur)
    const tintCache = new Map();
    function tinted(col) {
      let c = tintCache.get(col);
      if (c) return c;
      const src = SPRITES.glow;
      c = mkCanvas(src.width, src.height);
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = col;
      g.fillRect(0, 0, c.width, c.height);
      c._w = src._w; c._h = src._h; c._ox = src._ox; c._oy = src._oy;
      if (tintCache.size > 40) tintCache.clear();
      tintCache.set(col, c);
      return c;
    }
    let tintedSoft = new Map();
    function softOf(col) {
      let c = tintedSoft.get(col);
      if (c) return c;
      const src = SPRITES.soft;
      c = mkCanvas(src.width, src.height);
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = col;
      g.fillRect(0, 0, c.width, c.height);
      c._w = src._w; c._h = src._h; c._ox = src._ox; c._oy = src._oy;
      if (tintedSoft.size > 40) tintedSoft = new Map();
      tintedSoft.set(col, c);
      return c;
    }
    // sprites du boss en cours (images du battement d'ailes, version « touché » blanche)
    // préparé petit à petit (une image par appel) pendant la fin de la vague d'avant : pas d'à-coup à l'arrivée du boss
    let bossSpr = null, bossBuild = null;
    function bossBuildStep(kind) {
      if (!bossBuild || bossBuild.kind !== kind || bossBuild.res !== res) bossBuild = { kind, res, fr: [], dead: null, white: null };
      const B = bossBuild, sz = BOSSES[kind].sz + 40;
      if (B.fr.length < 6) { const i = B.fr.length; B.fr.push(spr(sz, sz, sz / 2, sz / 2, (g) => paintBoss(g, kind, (i / 6) * TAU, false))); return false; }
      if (!B.dead) { B.dead = spr(sz, sz, sz / 2, sz / 2, (g) => paintBoss(g, kind, 0, true)); return false; }
      if (!B.white) {
        const f0 = B.fr[0], white = mkCanvas(f0.width, f0.height), wg = white.getContext('2d');
        wg.drawImage(f0, 0, 0);
        wg.globalCompositeOperation = 'source-in';
        wg.fillStyle = '#ffffff';
        wg.fillRect(0, 0, white.width, white.height);
        white._w = f0._w; white._h = f0._h; white._ox = f0._ox; white._oy = f0._oy;
        B.white = white;
      }
      return true;
    }
    function buildBossSprites(kind) {
      while (!bossBuildStep(kind)) { /* tout de suite */ }
      bossSpr = { kind, fr: bossBuild.fr, dead: bossBuild.dead, white: bossBuild.white };
    }
    // ---------------------------------------------------------------- décor du monde (deux calques plein écran)
    let scene = null, nextScene = null, sceneWi = -1, decoHeads = [];
    function sceneRes() { return Math.min(dpr, 2); }
    function buildScene() {
      if (!SPRITES) return;
      scene = paintScene(worldIdx, cw, ch, { x: FX, y: FY, w: FW, h: FH, s: U }, sceneRes(), decoHeads);
      sceneWi = worldIdx;
    }
    function prepareNextScene(wi) {
      if (nextScene && nextScene.wi === wi) return;
      nextScene = paintScene(wi, cw, ch, { x: FX, y: FY, w: FW, h: FH, s: U }, sceneRes(), decoHeads);
    }

    // ---------------------------------------------------------------- état de la partie (UNE SEULE VIE)
    let state = 'intro', stateT = 0, paused = false, overCalled = false, god = false, godHits = 0;
    let wave = START, meta = waveMeta(START), worldIdx = meta.wi, D = diff(START);
    let score = 0, dispScore = 0, scorePulse = 0, gT = 0, playT = 0;
    let flies = [], shots = [], drops = [], caps = [], corpses = [], parts = [], pops = [], rings = [], faces = [], callouts = [];
    let boss = null, bee = null, beeT = 12, swarm = null, feastT = 0, raidT = 9;
    const form = { x: 0, y: 0, dir: 1, desc: 0, ph: 0, pat: 'sway', total: 0, mult: 1, rows: 5, shape: 'rect' };
    const player = { x: W / 2, alive: true, flash: 0, tilt: 0, fireT: 0.3, recoil: 0, dead: null, vx: 0 };
    let chain = 0, chainT = 0, multPop = 0, bestChain = 0, mileIdx = 0;
    let gauge = 0.35, swat = null, gaugePulse = 0;   // la jauge démarre au tiers : première tapette dès la fin de la vague 1
    const pw = { kind: null, t: 0, max: 1 };
    let shake = 0, flash = 0, flashCol = '#ffffff', slowT = 0, slowK = 1, stopT = 0, vign = 0;
    let windV = 0, darkK = 0, darkT = 9, darkOn = false, dropT = 2, diveT = 4;
    let banner = null, trans = null, bossDeath = null, clearKind = '', lastKill = null;
    let heads = [], beeHead = null, rollHead = null, rollIdx = -1;
    const seenNames = new Set(), introduced = new Set();
    const stats = { kills: 0, bosses: 0 };
    const CHAIN_WIN = 2.6;
    const mult = () => Math.min(5, 1 + Math.floor(chain / 8));
    const pwOn = (k) => pw.kind === k && pw.t > 0;

    // ---------------------------------------------------------------- têtes des copains
    function fetchHeads() {
      let list = [];
      try { list = (typeof api.heads === 'function' ? api.heads() : []) || []; } catch (e) { list = []; }
      heads = Array.isArray(list) ? list.filter((h) => h && imgOk(h.img)) : [];
    }
    function hpick(arr) { return arr[(cr('head') * arr.length) | 0]; }
    function headName(h) {
      const n = String((h && h.name) || 'un copain').trim().toUpperCase();
      return n.length > 12 ? n.slice(0, 11) + '.' : n;
    }
    function sadImg(h) { return h && imgOk(h.sad) ? h.sad : h ? h.img : null; }
    function snifText(h) {
      const n = headName(h);
      const o = ['Snif…', n + ' pleure !', 'Pauvre ' + n + ' !', 'Ouille, ' + n + ' !', n + ' a le nez qui coule !'];
      return o[(Math.random() * o.length) | 0];
    }
    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }

    // ---------------------------------------------------------------- effets (plafonnés)
    function addP(p) { if (parts.length >= PMAX) parts.splice(0, parts.length - PMAX + 1); parts.push(p); }
    function burst(x, y, n, cols, sp, life, r, g, kind) {
      n = Math.min(n, 40);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.9), l = life * (0.6 + Math.random() * 0.6);
        addP({ k: kind || 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, r: r * (0.6 + Math.random() * 0.8), col: cols[(Math.random() * cols.length) | 0], g: g || 0, a: Math.random() * TAU, va: (Math.random() - 0.5) * 10 });
      }
    }
    function puffs(x, y, n, cols, sp, life, r) {
      n = Math.min(n, 16);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = sp * (0.2 + Math.random() * 0.8), l = life * (0.7 + Math.random() * 0.5);
        addP({ k: 'puff', x: x + Math.cos(a) * 3, y: y + Math.sin(a) * 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: l, max: l, r: r * (0.7 + Math.random() * 0.6), col: cols[(Math.random() * cols.length) | 0], g: -12 });
      }
    }
    function ring(x, y, r0, r1, life, col, w) { if (rings.length > 30) rings.shift(); rings.push({ x, y, r0, r1, life, max: life, col, w: w || 3 }); }
    function pop(x, y, text, col, size, life, vy) {
      if (pops.length > 26) pops.shift();
      const hw = Math.min(W / 2 - 4, text.length * size * 0.36 + 4);
      pops.push({ x: clamp(x, hw, W - hw), y, text, col, size, life: life || 0.9, max: life || 0.9, vy: vy == null ? 30 : vy });
    }
    function callout(text, sub, col, life, size, y) { callouts = [{ text, sub, col, t: 0, life: life || 1.4, size: size || 40, y: y || 0.36 }]; }
    function doShake(m) { shake = Math.min(14, Math.max(shake, m)); }
    function slowmo(d, k) { slowT = Math.max(slowT, d); slowK = k || 0.3; }
    function addFace(h, x, y, hgt, life) { const img = sadImg(h); if (img) faces.push({ img, x, y, h: hgt, life, max: life }); if (faces.length > 6) faces.shift(); }
    function addScore(p) { score += Math.max(0, Math.round(p)); }
    // mouche touchée : elle saute en l'air et sort de l'écran par le côté le plus proche (elle ne retombe jamais vers la bombe)
    function ejectVel(x, kick) {
      const dir = x < W / 2 ? -1 : 1;
      return { vx: dir * (330 + Math.random() * 130) + (kick || 0), vy: -170 - Math.random() * 90, va: dir * (9 + Math.random() * 6) };
    }
    function addCorpse(f, kick) {
      if (corpses.length >= CMAX) corpses.shift();
      const v = ejectVel(f.x, kick);
      corpses.push({ x: f.x, y: f.y, vx: v.vx, vy: v.vy, ang: f.ang || 0, va: v.va, type: f.type, t: 0, flip: 0, head: f.head || null, bounced: false });
    }

    // ---------------------------------------------------------------- boucliers (masques grignotés)
    const shields = [];
    let shieldArt = null, baseMask = null, baseCount = 1, shieldKind = '';
    function buildShieldArt(kind) {
      shieldKind = kind;
      const c0 = mkCanvas(SW, SH);
      const g0 = c0.getContext('2d');
      paintShield(g0, kind);
      const d = g0.getImageData(0, 0, SW, SH).data;
      baseMask = new Uint8Array(SW * SH);
      baseCount = 0;
      for (let i = 0; i < SW * SH; i++) { baseMask[i] = d[i * 4 + 3] > 110 ? 1 : 0; baseCount += baseMask[i]; }
      shieldArt = spr(SW, SH, 0, 0, (g) => paintShield(g, kind));
    }
    function stickerArt(h) {
      return spr(SW, SH, 0, 0, (g) => {
        paintShield(g, shieldKind);
        g.save();
        g.beginPath();
        g.rect(8, 6, 34, 30);
        g.clip();
        drawHead(g, h.img, 25, 23, 28, -0.06, false);
        g.restore();
        g.fillStyle = 'rgba(255,240,200,0.6)';
        g.save(); g.translate(25, 7); g.rotate(0.12); g.fillRect(-6, -2, 12, 4); g.restore();
      });
    }
    function resetShields(drop) {
      const kind = WORLDS[worldIdx].shield;
      if (!shieldArt || shieldKind !== kind || !baseMask) buildShieldArt(kind);
      for (let i = 0; i < 4; i++) {
        let sh = shields[i];
        if (!sh) {
          const mc = mkCanvas(SW, SH);
          sh = { mask: new Uint8Array(SW * SH), mc, mctx: mc.getContext('2d'), img: null, cv: null, dirty: true };
          sh.img = sh.mctx.createImageData(SW, SH);
          shields[i] = sh;
        }
        sh.x = Math.round((W * (i + 1)) / 5 - SW / 2);
        sh.y = SHY;
        sh.mask.set(baseMask);
        sh.art = i === rollIdx && rollHead ? stickerArt(rollHead) : shieldArt;
        sh.cv = null;
        sh.dirty = true;
        sh.drop = drop ? 0.55 + i * 0.09 : 0;
        sh.gone = 0;
      }
    }
    function refreshShield(sh) {
      const art = sh.art || shieldArt;
      if (!art) return;
      if (!sh.cv || sh.cv.width !== art.width) sh.cv = mkCanvas(art.width, art.height);
      const d = sh.img.data;
      for (let i = 0; i < SW * SH; i++) { const v = sh.mask[i] ? 255 : 0; d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; d[i * 4 + 3] = v; }
      sh.mctx.putImageData(sh.img, 0, 0);
      const c = sh.cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, sh.cv.width, sh.cv.height);
      c.drawImage(art, 0, 0);
      c.globalCompositeOperation = 'destination-in';
      c.imageSmoothingEnabled = false;
      c.drawImage(sh.mc, 0, 0, sh.cv.width, sh.cv.height);
      c.globalCompositeOperation = 'source-over';
      sh.dirty = false;
    }
    function shieldAt(x, y) {
      for (const sh of shields) {
        if (sh.drop > 0 || sh.gone) continue;
        const lx = Math.floor(x - sh.x), ly = Math.floor(y - sh.y);
        if (lx >= 0 && ly >= 0 && lx < SW && ly < SH && sh.mask[ly * SW + lx]) return { sh, lx, ly };
      }
      return null;
    }
    function damageShield(sh, cx, cy, radius) {
      const Rr = Math.ceil(radius + 2);
      for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= radius * (0.65 + Math.random() * 0.55) || (d <= radius + 2 && Math.random() < 0.18)) sh.mask[y * SW + x] = 0;
      }
      sh.dirty = true;
    }
    function carveShields(fx, fy, hw, hh) {
      if (fy + hh <= SHY || fy - hh >= SHY + SH) return;
      for (const sh of shields) {
        if (sh.drop > 0 || sh.gone) continue;
        const x0 = Math.max(0, Math.floor(fx - hw - sh.x)), x1 = Math.min(SW - 1, Math.ceil(fx + hw - sh.x));
        if (x1 < 0 || x0 > SW - 1 || x0 > x1) continue;
        const y0 = Math.max(0, Math.floor(fy - hh - sh.y)), y1 = Math.min(SH - 1, Math.ceil(fy + hh - sh.y));
        let changed = false;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (sh.mask[y * SW + x]) { sh.mask[y * SW + x] = 0; changed = true; }
        if (changed) sh.dirty = true;
      }
    }
    function shieldLoss() {
      let left = 0;
      for (const sh of shields) for (let i = 0; i < SW * SH; i++) left += sh.mask[i];
      return 1 - left / Math.max(1, baseCount * shields.length);
    }

    // ---------------------------------------------------------------- composition des vagues
    const RANK = { gnat: 0, green: 1, blue: 2, moth: 2, mosq: 3, red: 3, wasp: 4, fat: 4, taon: 5 };
    function typePool() {
      const pool = [];
      for (const ty in TYPE_AT) if (ty !== 'dragon' && (meta.cyc > 0 || TYPE_AT[ty] <= wave)) pool.push(ty);
      pool.sort((a, b) => RANK[a] - RANK[b]);
      return pool;
    }
    function rowTypes(R) {
      if (meta.cyc === 0 && wave === 1) return ['green', 'green', 'gnat'].slice(0, R);
      if (meta.cyc === 0 && wave === 2) return ['blue', 'green', 'green', 'gnat'].slice(0, R);
      const pool = typePool();
      const sig = WORLDS[worldIdx].intro.flat().filter((t) => pool.indexOf(t) >= 0 && t !== 'dragon');
      const cnt = {}, out = [];
      const bad = (ty) => (ty === 'fat' && cnt.fat >= 1) || ((ty === 'taon' || ty === 'mosq' || ty === 'wasp' || ty === 'moth') && cnt[ty] >= 2) || (ty === 'red' && cnt.red >= 1);
      for (let r = 0; r < R; r++) {
        const fr = R > 1 ? r / (R - 1) : 0;
        let ty, tries = 0;
        do {
          if (sig.length && cr('form') < 0.34) ty = cpick('form', sig);
          else ty = pool[clamp(Math.round((1 - fr) * (pool.length - 1) + crnd('form', -1.4, 0.6)), 0, pool.length - 1)];
        } while (++tries < 12 && bad(ty));
        if (bad(ty)) ty = 'green';
        cnt[ty] = (cnt[ty] || 0) + 1;
        out.push(ty);
      }
      return out;
    }
    function newFly(type, extra) {
      const f = { type, hp: TYPES[type].hp, alive: true, mode: 'form', slot: false, r: 0, c: 0, x: 0, y: 0, sx: 0, sy: 0, ang: 0, ph: Math.random() * FRAMES,
        hitT: 0, warn: 0, vx: 0, vy: 0, t0: 0, dropped: false, jump: false, head: null, px: 0, py: 1, en: null, dart: false };
      if (extra) Object.assign(f, extra);
      return f;
    }
    function buildFormation(feast) {
      flies = [];
      const R = feast ? 5 : D.rows;
      const types = feast ? ['blue', 'green', 'green', 'gnat', 'gnat'] : rowTypes(R);
      const early = { 1: ['rect', 'sway'], 2: ['V', 'march'], 4: ['diamond', 'ripple'], 5: ['wings', 'breathe'], 7: ['checker', 'sway'], 10: ['arrow', 'march'] };
      const e = meta.cyc === 0 ? early[wave] : null;
      const shapeKey = e ? e[0] : cpick('form', SHAPE_LIST);
      form.shape = shapeKey;
      form.pat = e ? e[1] : cpick('form', PAT_LIST);
      if (feast) form.pat = 'sway';
      const shape = SHAPES[shapeKey];
      form.rows = R;
      form.dir = 1; form.desc = 0; form.ph = 0;
      form.x = (W - (COLS - 1) * CW) / 2;
      form.y = 106 + Math.min(wave - 1, 8) * 6 - (R - 5) * 12;
      for (let r = 0; r < R; r++) {
        const style = (r + wave) % 3, side = (r % 2 ? 1 : -1) * (wave % 2 ? -1 : 1);
        let k = 0;
        for (let c = 0; c < COLS; c++) {
          if (!shape(r, c, R)) continue;
          const f = newFly(types[r], { r, c, slot: true, mode: 'enter' });
          f.en = { style, side, delay: 0.2 + r * 0.42 + k * 0.08, dur: 1.25 + r * 0.04 };
          k++;
          const p0 = entryStart(f);
          f.x = p0[0]; f.y = p0[1];
          flies.push(f);
        }
      }
      form.total = flies.length;
      if (heads.length) {
        const n = Math.min(heads.length >= 2 ? 3 : 2, 2 + ((cr('head') * 2) | 0));
        const pool = flies.filter((f) => f.r <= 2 && f.type !== 'fat');
        const used = [];
        let guard = 0;
        while (used.length < n && pool.length && guard++ < 40) {
          const f = pool.splice((cr('head') * pool.length) | 0, 1)[0];
          if (used.some((u) => Math.abs(u.c - f.c) <= 1 && Math.abs(u.r - f.r) <= 1)) continue;
          let h = hpick(heads);
          for (let j = 0; j < 6 && heads.length > used.length && used.some((u) => u.head === h); j++) h = hpick(heads);
          f.head = h;
          used.push(f);
        }
      }
    }
    function entryStart(f) {
      const e = f.en, s = e.side;
      if (e.style === 0) return [s < 0 ? -40 : W + 40, 150 + f.r * 12];
      if (e.style === 1) return [W / 2 + s * 70, -40];
      return [s < 0 ? -40 : W + 40, 330];
    }
    // trajectoire d'entrée (Bézier cubique vers la place, qui suit la formation)
    function entryPos(f, u) {
      const e = f.en, s = e.side;
      let p0, p1, p2;
      if (e.style === 0) { p0 = [s < 0 ? -40 : W + 40, 150 + f.r * 12]; p1 = [s < 0 ? W * 0.64 : W * 0.36, 480]; p2 = [s < 0 ? W * 0.1 : W * 0.9, 250]; }
      else if (e.style === 1) { p0 = [W / 2 + s * 70, -40]; p1 = [W / 2 - s * 175, 440]; p2 = [f.sx, f.sy + 170]; }
      else { p0 = [s < 0 ? -40 : W + 40, 330]; p1 = [s < 0 ? W * 0.46 : W * 0.54, 370]; p2 = [f.sx, f.sy + 90]; }
      const a = 1 - u;
      return [a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * f.sx,
        a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * f.sy];
    }
    function slotPos(f) {
      let x = form.x + f.c * CW, y = form.y + f.r * RH;
      if (form.pat === 'breathe') x += (f.c - 4) * CW * 0.2 * Math.sin(form.ph * 1.3);
      else if (form.pat === 'ripple') y += Math.sin(form.ph * 2.2 + f.c * 0.75) * 10;
      y += Math.sin(gT * 3 + f.c * 0.7 + f.r * 1.3) * 1.6;
      if (f.type === 'moth') { x += Math.sin(gT * 2.6 + f.c) * 3; y += Math.cos(gT * 3.1 + f.r) * 2.5; }
      f.sx = x;
      f.sy = y;
    }

    // ---------------------------------------------------------------- difficulté (monte vraiment : intense dès la 5e-6e vague)
    function diff(n) {
      const k = Math.min(n - 1, 17), x = Math.max(0, n - 18);
      return {
        dropRate: 0.45 + 0.13 * k + 0.05 * x,
        maxDrops: Math.min(1 + Math.floor(n / 2), 8) + Math.floor(x / 5),
        dropSpeed: Math.min(330, 115 + 10 * k + 3 * x),
        march: Math.min(78, 16 + 4.2 * Math.min(n - 1, 10) + 0.8 * x),
        desc: Math.min(7.5, 1.5 + 0.22 * (n - 1)),
        divers: n < 2 ? 0 : Math.min(6, 1 + Math.floor((n - 2) / 3) + (x > 0 ? 1 : 0)),
        diveGap: Math.max(0.75, 5.2 - 0.28 * (n - 2)),
        diveSpeed: Math.min(360, 152 + 7 * n),
        rows: n <= 1 ? 3 : n <= 2 ? 4 : n < 10 ? 5 : 6,
        swarmSp: Math.min(210, 98 + 4 * n)
      };
    }

    // ---------------------------------------------------------------- départ d'une vague
    function startWave(n) {
      wave = n;
      meta = waveMeta(n);
      const prevWorld = worldIdx;
      worldIdx = meta.wi;
      D = diff(n);
      reseed(n);
      fetchHeads();
      beeHead = rollHead = null; rollIdx = -1;
      if (heads.length) {
        beeHead = hpick(heads);
        rollHead = beeHead;
        if (heads.length > 1) for (let k = 0; k < 8 && rollHead === beeHead; k++) rollHead = hpick(heads);
        rollIdx = (cr('head') * 4) | 0;
      }
      const newWorld = prevWorld !== worldIdx || !scene || scene.wi !== worldIdx;
      if (newWorld) {
        decoHeads = heads.length ? [heads[(cr('head') * heads.length) | 0]] : [];
        if (nextScene && nextScene.wi === worldIdx) { scene = nextScene; nextScene = null; } else buildScene();
        initAmbient();
      }
      boss = null; swarm = null; bee = null; flies = []; drops = []; shots = []; caps = []; callouts = [];
      bossSpr = bossSpr && meta.boss && bossSpr.kind === meta.boss ? bossSpr : null;
      form.total = 0;
      if (newWorld || meta.st === 0 || !shields.length) resetShields(true);
      darkOn = false; darkT = 7 + cr('raid') * 4;
      feastT = 15;
      raidT = 7 + cr('raid') * 4;
      beeT = 11 + cr('luck') * 9;
      dropT = 1.6;
      diveT = D.diveGap * crnd('dive', 0.8, 1.2) + 1.8;
      const Wd = WORLDS[worldIdx];
      const kick = 'MONDE ' + (worldIdx + 1) + (meta.cyc ? ' · JOUR ' + (meta.cyc + 1) : '') + ' · ' + Wd.name.toUpperCase();
      banner = { kick, title: 'VAGUE ' + n, sub: null, sub2: null, col: Wd.acc, types: null, boss: false };
      if (meta.kind === 'boss') {
        startBoss(meta.boss, meta.L);
        const B = BOSSES[meta.boss];
        banner.kick = 'BOSS DU MONDE ' + (worldIdx + 1);
        banner.title = B.name + (meta.cyc ? ' ' + ['', 'II', 'III', 'IV', 'V', 'VI'][Math.min(5, meta.cyc)] : '');
        banner.col = '#ff4d5e';
        banner.boss = true;
        if (boss.head) { banner.sub = 'Oh ! C’est ' + headName(boss.head) + ' !'; banner.sub2 = B.as; }
        else { banner.sub = B.line; banner.sub2 = 'Vague ' + n; }
        SFX.bossIntro();
      } else if (meta.kind === 'swarm') {
        const pool = worldIdx === 2 ? ['wasp', 'wasp', 'green', 'gnat', 'blue'] : worldIdx === 5 ? ['moth', 'moth', 'mosq', 'gnat', 'green'] : ['gnat', 'gnat', 'green', 'mosq', 'blue'];
        if (meta.cyc > 0) pool.push('red', 'wasp');
        swarm = { quota: Math.min(60, 24 + 2 * n), killed: 0, spawnT: 0.6, maxAlive: Math.min(16, 8 + Math.floor(n / 3)), pool };
        banner.sub = 'ESSAIM ! Arrose-en ' + swarm.quota + ' !';
        banner.sub2 = worldIdx === 2 ? 'Elles foncent sur le pique-nique' : 'Elles traversent dans tous les sens';
      } else if (meta.kind === 'feast') {
        buildFormation(true);
        banner.sub = 'LE FESTIN : elles ne piquent pas !';
        banner.sub2 = '15 secondes pour tout arroser';
      } else {
        buildFormation(false);
        const news = meta.cyc === 0 ? (Wd.intro[meta.st] || []).filter((t) => !introduced.has(t)) : [];
        news.forEach((t) => introduced.add(t));
        if (n === 1) banner.sub = Wd.news;
        else if (news.length) banner.types = news;
        else banner.sub = meta.st === 0 ? Wd.news : (SHAPE_NAMES[form.shape] || 'Escadrille au complet');
        if (Wd.wind && !banner.sub2) banner.sub2 = 'Mistral : les gouttes dérivent !';
        if (Wd.dark && !banner.sub2) banner.sub2 = 'Les guirlandes clignotent…';
      }
      if (n === START && n === 1) { banner.title = 'PRÊT ?'; }
      state = 'intro';
      stateT = 0;
      introDur = meta.kind === 'boss' ? 3.0 : banner.types ? 2.8 : 2.2;
      if (meta.kind !== 'boss') SFX.ready();
    }
    let introDur = 2.2;

    // ---------------------------------------------------------------- la bombe : déplacement + tir automatique
    const keys = { left: false, right: false };
    let dragDX = 0, mouseX = -1;
    function updatePlayer(dt) {
      if (!player.alive) return;
      const ox = player.x;
      const mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (mv) { player.x += mv * SPEED * dt; mouseX = -1; }
      else if (mouseX >= 0) { const d = mouseX - player.x, st = 1100 * dt; player.x += clamp(d, -st, st); }
      if (dragDX) { player.x += dragDX; dragDX = 0; }
      player.x = clamp(player.x, 18, W - 18);
      player.vx = (player.x - ox) / Math.max(dt, 1e-4);
      player.tilt += (clamp(player.vx / 420, -1, 1) - player.tilt) * Math.min(1, dt * 10);
      if (player.flash > 0) player.flash -= dt;
      if (player.recoil > 0) player.recoil = Math.max(0, player.recoil - dt * 9);
    }
    function autoFire(dt) {
      player.fireT -= dt;
      if (player.fireT > 0 || !player.alive) return;
      const rapid = pwOn('rapid'), dbl = pwOn('double'), pierce = pwOn('pierce');
      const maxS = (rapid ? 7 : 4) * (dbl ? 2 : 1);
      if (shots.length >= maxS) { player.fireT = 0.025; return; }
      const xs = dbl ? [player.x - 8, player.x + 8] : [player.x];
      for (const x of xs) shots.push({ x, y: PY - 62, t: 0, pierce: pierce ? 3 : 0, hits: 0, last: null });
      player.fireT = rapid ? 0.11 : 0.2;
      player.flash = 0.08;
      player.recoil = 1;
      if (parts.length < PMAX - 20) addP({ k: 'puff', x: player.x + rnd(-2, 2), y: PY - 60, vx: rnd(-25, 25), vy: rnd(-70, -30), life: 0.28, max: 0.28, r: rnd(2.5, 4), col: Math.random() < 0.5 ? '#ff9fd0' : '#c9a0ff', g: 0 });
      SFX.shot();
    }

    // ---------------------------------------------------------------- formation
    function updateFormation(dt) {
      let n = 0, minC = 99, maxC = -1;
      for (const f of flies) {
        if (!f.alive || !f.slot) continue;
        n++;
        if (f.c < minC) minC = f.c;
        if (f.c > maxC) maxC = f.c;
      }
      if (!n) return;
      const frac = 1 - n / Math.max(1, form.total);
      let m = 1 + 2.3 * frac * frac;
      if (n <= 4) m += 0.5;
      if (n === 1) m += 0.8;
      form.mult = m;
      const playing = state === 'play' && meta.kind !== 'feast';
      if (form.pat === 'march') {
        const sp = D.march * m;
        if (form.desc > 0) { const d = Math.min(form.desc, 80 * dt); form.y += d; form.desc -= d; }
        else {
          form.x += form.dir * sp * dt;
          const minX = form.x + minC * CW - 14, maxX = form.x + maxC * CW + 14;
          if (form.dir > 0 && maxX > W - 8) { form.x -= maxX - (W - 8); form.dir = -1; form.desc = playing ? 10 : 0; }
          else if (form.dir < 0 && minX < 8) { form.x += 8 - minX; form.dir = 1; form.desc = playing ? 10 : 0; }
        }
      } else {
        form.ph += dt * (0.55 + 0.02 * Math.min(wave, 20)) * (0.75 + 0.25 * m) * (WORLDS[worldIdx].wind ? 1.25 : 1);
        const spread = form.pat === 'breathe' ? 1.2 : 1;
        const span = (maxC - minC) * CW * spread + 34;
        const A = Math.max(0, (W - 16 - span) / 2);
        const cx = W / 2 + A * Math.sin(form.ph);
        const target = cx - ((minC + maxC) / 2) * CW;
        form.x += (target - form.x) * Math.min(1, dt * 3);
        if (playing) form.y += D.desc * m * dt;
      }
      let lo = 1e9, hi = -1e9;
      for (const f of flies) {
        if (!f.alive || !f.slot) continue;
        slotPos(f);
        if (f.sx < lo) lo = f.sx;
        if (f.sx > hi) hi = f.sx;
      }
      if (hi + 14 > W - 4) form.x -= hi + 14 - (W - 4);
      else if (lo - 14 < 4) form.x += 4 - (lo - 14);
    }
    function startDive(f) {
      f.mode = 'dive';
      f.t0 = 0;
      f.dropped = false;
      f.dart = false;
      f.vx = (f.x < W / 2 ? -1 : 1) * 70;
      f.vy = -110;
      f.swoop = f.type !== 'mosq' && f.type !== 'moth' && f.type !== 'wasp' && f.slot && cr('dive') < (wave < 6 ? 1 : wave < 10 ? 0.5 : 0.2);
      f.turn = false;
      SFX.dive();
      if (f.type === 'mosq') SFX.whine();
    }
    function updateDiver(f, dt) {
      f.t0 += dt;
      const sp = D.diveSpeed, ty = f.type;
      if (ty === 'mosq') {
        f.vy += (sp * 1.15 - f.vy) * Math.min(1, dt * 2);
        if (f.y < PY - 150) f.vx += (clamp((player.x - f.x) * 2.6, -sp * 0.7, sp * 0.7) - f.vx) * Math.min(1, dt * 2.6);
      } else if (ty === 'wasp') {
        f.vy += (sp * 0.9 - f.vy) * Math.min(1, dt * 1.8);
        f.vx = Math.sin(f.t0 * 6 + f.ph) * 165 + clamp((player.x - f.x) * 0.6, -60, 60);
        if (!f.dart && f.y > 280 && f.y < 430 && state === 'play') { f.dart = true; shootDrop(f.x, f.y + 12, 0, 360, 'dard'); }
      } else if (ty === 'moth') {
        f.vy += (sp * 0.55 - f.vy) * Math.min(1, dt * 1.5) + Math.sin(f.t0 * 5 + f.ph) * 140 * dt;
        f.vx += (clamp((player.x - f.x) * 1.4, -150, 150) + Math.sin(f.t0 * 7 + f.ph) * 90 - f.vx) * Math.min(1, dt * 3);
      } else {
        if (f.swoop && f.y > 400 && f.vy > 0) f.turn = true;
        if (f.turn) {
          f.vy = Math.max(-sp * 0.8, f.vy - 700 * dt);
          f.vx *= 1 - Math.min(1, dt * 2);
          if (f.vy < 0 && f.y < 340) { f.mode = 'return'; f.turn = false; f.swoop = false; }
        } else f.vy += ((ty === 'fat' ? sp * 0.7 : sp) - f.vy) * Math.min(1, dt * 1.8);
        if (f.y < PY - 170) {
          const tx = player.x + Math.sin(f.t0 * 3 + f.ph) * 36;
          f.vx += (clamp((tx - f.x) * 1.5 * Math.min(1, 0.5 + 0.05 * wave), -sp * 0.6, sp * 0.6) - f.vx) * Math.min(1, dt * 2.2);
        }
        if (!f.dropped && wave >= 4 && f.y > 240 && f.y < 340 && state === 'play' && meta.kind === 'form') {
          f.dropped = true;
          shootDrop(f.x, f.y + 10, f.vx * 0.3, D.dropSpeed, ty === 'red' ? 'visee' : 'goutte');
        }
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y > H + 30 || f.x < -70 || f.x > W + 70) {
        f.jump = true;
        if (f.slot) { f.mode = 'return'; f.x = f.sx; f.y = -30; }
        else { f.x = crnd('dive', 40, W - 40); f.y = -30; f.vx = 0; f.vy = sp * 0.5; f.dropped = true; f.t0 = 0; }
      }
    }
    function updateStreamer(f, dt) {
      f.x += f.dir * f.sp * dt;
      f.y = f.by + Math.sin(gT * 2.6 + f.ph) * 24;
      if ((f.dir > 0 && f.x > W + 30) || (f.dir < 0 && f.x < -30)) {
        f.passes++;
        f.jump = true;
        if (f.passes >= 2) { f.mode = 'dive'; f.x = crnd('swarm', 40, W - 40); f.y = -30; f.vx = 0; f.vy = 80; f.t0 = 0; f.dropped = true; }
        else { f.x = f.dir > 0 ? -30 : W + 30; f.by = Math.min(f.by + 36, 340); }
      }
    }
    function spawnRaider() {
      const dir = cr('raid') < 0.5 ? 1 : -1;
      const y = crnd('raid', 330, 470);
      const marks = [crnd('raid', 0.2, 0.34), crnd('raid', 0.45, 0.58), crnd('raid', 0.7, 0.82)].map((k) => (dir > 0 ? k * W : (1 - k) * W));
      flies.push(newFly('dragon', { mode: 'raid', dir, x: dir > 0 ? -40 : W + 40, y, by: y, sp: Math.min(300, 196 + 5 * wave), marks, ang: -dir * Math.PI / 2 }));
      SFX.whine();
    }
    function updateRaider(f, dt) {
      f.x += f.dir * f.sp * dt;
      f.y = f.by + Math.sin(gT * 3 + f.ph) * 10;
      for (let i = f.marks.length - 1; i >= 0; i--) {
        if ((f.dir > 0 && f.x >= f.marks[i]) || (f.dir < 0 && f.x <= f.marks[i])) { f.marks.splice(i, 1); if (state === 'play') shootDrop(f.x, f.y + 8, f.dir * 18, D.dropSpeed * 0.95, 'goutte'); }
      }
      if (f.x < -60 || f.x > W + 60) f.alive = false;
    }
    function spawnSwarm(dt) {
      swarm.spawnT -= dt;
      if (swarm.spawnT > 0) return;
      let alive = 0;
      for (const f of flies) if (f.alive) alive++;
      const remaining = swarm.quota - swarm.killed - alive;
      if (remaining <= 0 || alive >= swarm.maxAlive) { swarm.spawnT = 0.3; return; }
      const n = Math.min(5, remaining, swarm.maxAlive - alive);
      const ty = cpick('swarm', swarm.pool);
      const dir = cr('swarm') < 0.5 ? 1 : -1;
      const by = crnd('swarm', 96, 240);
      const hasHead = heads.length && cr('head') < 0.35;
      for (let k = 0; k < n; k++) {
        const f = newFly(ty, { mode: 'stream', dir, by, sp: D.swarmSp, passes: 0, ph: k * 0.7 });
        f.x = dir > 0 ? -24 - k * 30 : W + 24 + k * 30;
        f.y = by;
        if (hasHead && k === 0) {
          f.head = hpick(heads);
          if (!seenNames.has(f.head.name)) { seenNames.add(f.head.name); pop(W / 2, by + 44, 'Oh ! C’est ' + headName(f.head) + ' !', '#ffe6f2', 15, 2.0, 6); SFX.head(); }
        }
        flies.push(f);
      }
      swarm.spawnT = Math.max(0.9, 2.4 - wave * 0.05);
    }
    function updateFlies(dt) {
      if (form.total) updateFormation(dt);
      let bottom = 0;
      for (const f of flies) {
        if (!f.alive) continue;
        if (f.hitT > 0) f.hitT -= dt;
        if (f.slot) slotPos(f);
        const px = f.x, py = f.y;
        f.jump = false;
        switch (f.mode) {
          case 'enter': {
            f.en.t = (f.en.t || 0) + dt;
            const k = (f.en.t - f.en.delay) / f.en.dur;
            if (k <= 0) { const p = entryStart(f); f.x = p[0]; f.y = p[1]; f.jump = true; break; }
            if (k >= 1) { f.mode = 'form'; f.x = f.sx; f.y = f.sy; break; }
            const p = entryPos(f, ease(k));
            f.x = p[0]; f.y = p[1];
            break;
          }
          case 'form':
            f.x = f.sx; f.y = f.sy;
            if (f.warn > 0) { f.warn -= dt; f.x += Math.sin(gT * 70) * 1.8; if (f.warn <= 0 && state === 'play') startDive(f); }
            break;
          case 'dive': updateDiver(f, dt); break;
          case 'return': {
            const dx = f.sx - f.x, dy = f.sy - f.y, d = Math.hypot(dx, dy), st = 240 * dt;
            if (d <= st + 1) { f.mode = 'form'; f.x = f.sx; f.y = f.sy; } else { f.x += (dx / d) * st; f.y += (dy / d) * st; }
            break;
          }
          case 'stream': updateStreamer(f, dt); break;
          case 'raid': updateRaider(f, dt); break;
          case 'flee':
            f.y -= 280 * dt;
            f.x += (f.x < W / 2 ? -1 : 1) * 70 * dt;
            if (f.y < -50) f.alive = false;
            break;
          default: break;
        }
        if (f.mode !== 'raid') {
          let target = 0;
          if (!f.jump && dt > 0 && f.mode !== 'form') {
            const vx = (f.x - px) / dt, vy = (f.y - py) / dt;
            target = vx * vx + vy * vy > 900 ? Math.atan2(-vx, vy) : f.ang;
          }
          if (f.jump) f.ang = target;
          else { let d = target - f.ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; f.ang += d * Math.min(1, dt * 9); }
        }
        if (state !== 'play' || f.mode === 'flee' || f.mode === 'enter') continue;
        const ty = TYPES[f.type];
        if (f.mode !== 'raid') carveShields(f.x, f.y, ty.hw, ty.hh);
        if (f.mode === 'form') { if (f.y + ty.hh > bottom) bottom = f.y + ty.hh; }
        else if (player.alive && Math.abs(f.x - player.x) < 10 + ty.hw * 0.6 && f.y + ty.hh * 0.7 > P_TOP + 8 && f.y - ty.hh < PY) hitPlayer(f.type === 'mosq' ? 'PIQUÉ !' : 'AÏE !');
      }
      if (state === 'play' && bottom >= P_TOP - 6) { callout('ENVAHI !', 'Elles ont atteint l’étagère', '#ff4d5e', 1.6, 40); hitPlayer('ENVAHI !'); }
      if (flies.length > 90) flies = flies.filter((f) => f.alive);
    }
    function updateDives(dt) {
      if (meta.kind !== 'form' || D.divers <= 0) return;
      diveT -= dt;
      if (diveT > 0) return;
      diveT = D.diveGap * crnd('dive', 0.7, 1.3);
      let nd = 0;
      const cands = [];
      for (const f of flies) {
        if (!f.alive) continue;
        if (f.mode === 'dive' || f.mode === 'return' || f.warn > 0) nd++;
        else if (f.mode === 'form') cands.push(f);
      }
      if (nd >= D.divers || !cands.length) return;
      const keen = cands.filter((f) => f.type === 'mosq' || f.type === 'wasp' || f.type === 'moth');
      const f = keen.length && cr('dive') < 0.6 ? cpick('dive', keen) : cpick('dive', cands);
      f.warn = 0.5;
      SFX.warn();
      if (wave >= 9 && cr('dive') < 0.4 && nd + 1 < D.divers) {
        const mate = cands.find((g) => g !== f && g.r === f.r && Math.abs(g.c - f.c) === 1);
        if (mate) mate.warn = 0.5;
      }
    }

    // ---------------------------------------------------------------- gouttes ennemies
    let nearT = -9;
    const DROP_R = { goutte: 4, visee: 4.2, dard: 3.2, sirop: 5, boue: 5.2, pollen: 5, aiguille: 3.2, ecaille: 4.4 };
    const HARD = { sirop: 1, boue: 1, pollen: 1, aiguille: 1, ecaille: 1 };
    function shootDrop(x, y, vx, vy, k) {
      if (drops.length > 140) return;
      drops.push({ x, y, vx, vy, k, r: DROP_R[k] || 4, ph: Math.random() * 6, born: gT });
      if (!HARD[k]) SFX.drop();
    }
    function spawnFlyDrop() {
      let shooter = null;
      if (swarm) {
        const c = flies.filter((f) => f.alive && f.mode === 'stream' && f.x > 16 && f.x < W - 16);
        if (c.length) shooter = cpick('drop', c);
      } else {
        const inForm = flies.filter((f) => f.alive && f.mode === 'form' && !(f.warn > 0) && f.type !== 'moth');
        const reds = inForm.filter((f) => f.type === 'red');
        if (reds.length && cr('drop') < 0.35) shooter = cpick('drop', reds);
        else {
          const byCol = {};
          for (const f of inForm) if (!byCol[f.c] || f.r > byCol[f.c].r) byCol[f.c] = f;
          const cands = Object.keys(byCol).map((k) => byCol[k]);
          const blues = cands.filter((f) => f.type === 'blue');
          if (blues.length && cr('drop') < 0.3) shooter = cpick('drop', blues);
          else if (cands.length) {
            if (cr('drop') < 0.4) { let best = 1e9; for (const f of cands) { const d = Math.abs(f.x - player.x); if (d < best) { best = d; shooter = f; } } }
            else shooter = cpick('drop', cands);
          }
        }
      }
      if (!shooter) return;
      const v = D.dropSpeed;
      if (shooter.type === 'red') {
        const dx = player.x - shooter.x, dy = PY - shooter.y, L = Math.hypot(dx, dy) || 1;
        shootDrop(shooter.x, shooter.y + 10, (dx / L) * v * 0.9, Math.max(v * 0.5, (dy / L) * v * 0.9), 'visee');
      } else if (shooter.type === 'wasp') shootDrop(shooter.x, shooter.y + 12, 0, v * 1.5, 'dard');
      else shootDrop(shooter.x, shooter.y + TYPES[shooter.type].hh, 0, v, 'goutte');
    }
    function updateDrops(dt) {
      const shooting = (meta.kind === 'form' || meta.kind === 'swarm') && state === 'play';
      if (shooting && playT > 1.2) {
        dropT -= dt;
        if (dropT <= 0) {
          dropT = (1 / D.dropRate) * crnd('drop', 0.55, 1.45);
          let n = 0;
          for (const d of drops) if (!HARD[d.k]) n++;
          if (n < D.maxDrops) spawnFlyDrop();
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        const vx = d.vx + (HARD[d.k] ? 0 : windV), vy = d.vy;
        const sp = Math.hypot(vx, vy) || 1;
        let travel = sp * dt, dead = false;
        d.ph += dt * 10;
        while (travel > 0 && !dead) {
          const st = Math.min(3, travel);
          travel -= st;
          d.x += (vx / sp) * st;
          d.y += (vy / sp) * st;
          if (d.x < -14 || d.x > W + 14 || d.y < -40) { dead = true; break; }
          const hit = shieldAt(d.x, d.y + d.r) || shieldAt(d.x - 1.5, d.y + d.r - 1) || shieldAt(d.x + 1.5, d.y + d.r - 1);
          if (hit) {
            damageShield(hit.sh, hit.lx, hit.ly, HARD[d.k] ? 4.2 : 3.4);
            burst(d.x, d.y + 3, 6, HARD[d.k] ? ['#d9b0ff', '#ffffff'] : ['#e6e04f', '#ffffff', '#cdd6dc'], 45, 0.35, 1.6, 60);
            SFX.shield();
            dead = true;
            break;
          }
          if (player.alive && state === 'play' && d.y + d.r > P_TOP + 6 && d.y - d.r < PY) { const ax = Math.abs(d.x - player.x) - (11 + d.r * 0.5); if (d.near == null || ax < d.near) d.near = ax; }
          if (player.alive && state === 'play' && Math.abs(d.x - player.x) < 11 + d.r * 0.5 && d.y + d.r > P_TOP + 6 && d.y - d.r < PY) {
            hitPlayer(d.k === 'dard' || d.k === 'aiguille' ? 'PIQUÉ !' : 'SPLATCH !');
            if (!player.alive) return;
            dead = true;
            break;
          }
          if (d.y > PY + 4) {
            burst(d.x, PY + 2, 6, HARD[d.k] ? ['#b45cff', '#f3dcff'] : ['#e6e04f', '#fff6a0'], 55, 0.35, 1.5, 160);
            dead = true;
            if (d.near != null && d.near >= 0 && d.near < 6 && player.alive && state === 'play' && gT - nearT > 0.5) {
              nearT = gT;
              const pts = 25 * mult();
              addScore(pts);
              pop(player.x, PY - 78, 'FRÔLÉ ! +' + pts, '#7af0ff', 13, 0.9, 30);
              tone(1320, 0.07, 'sine', 0.035, 1760);
            }
          }
        }
        if (dead) drops.splice(i, 1);
      }
    }

    // ---------------------------------------------------------------- bulles de bonus
    function maybeDropCap(x, y, chance) {
      if (caps.length || state !== 'play' || cr('luck') >= chance) return;
      const w = [['double', 3], ['rapid', 3], ['pierce', 2], ['slow', 2], ['swat', 1.5]];
      if (shieldLoss() > 0.3) w.push(['rolls', 3]);
      let tot = 0;
      for (const e of w) tot += e[1];
      let r = cr('luck') * tot, kind = 'double';
      for (const e of w) { r -= e[1]; if (r <= 0) { kind = e[0]; break; } }
      caps.push({ x: clamp(x, 20, W - 20), y, kind, t: 0 });
      SFX.cap();
    }
    function applyCap(kind) {
      SFX.power();
      pop(player.x, PY - 96, CAPS[kind].name, CAPS[kind].col, 17, 1.4, 20);
      ring(player.x, PY - 26, 8, 56, 0.45, CAPS[kind].col, 3);
      if (kind === 'rolls') { resetShields(false); return; }
      if (kind === 'swat') { gauge = 1; return; }
      pw.kind = kind;
      pw.t = pw.max = CAPS[kind].dur || 8;
    }
    function updateCaps(dt) {
      for (let i = caps.length - 1; i >= 0; i--) {
        const c = caps[i];
        c.t += dt;
        c.y += 74 * dt;
        c.x = clamp(c.x + Math.sin(c.t * 3) * 14 * dt, 14, W - 14);
        if (player.alive && (state === 'play' || state === 'clear') && Math.abs(c.x - player.x) < 24 && c.y > P_TOP - 10 && c.y < PY + 4) { caps.splice(i, 1); applyCap(c.kind); continue; }
        if (c.y > PY + 8) { burst(c.x, PY, 8, ['#ffffff', '#bfe6ff', '#ffc0e0'], 50, 0.4, 1.6, 0); caps.splice(i, 1); }
      }
    }

    // ---------------------------------------------------------------- bourdon bonus
    function updateBee(dt) {
      if (meta.kind === 'boss' || meta.kind === 'swarm') return;
      if (!bee) {
        beeT -= dt;
        let n = 0;
        for (const f of flies) if (f.alive && f.mode !== 'raid') n++;
        if (beeT <= 0 && n >= 6) {
          const dir = cr('luck') < 0.5 ? 1 : -1;
          bee = { x: dir > 0 ? -40 : W + 40, y: 74, dir, sp: 72 + Math.min(wave, 12) * 6, head: beeHead };
          beeT = 18 + cr('luck') * 12;
        } else if (beeT <= 0) beeT = 4;
        return;
      }
      bee.x += bee.dir * bee.sp * dt;
      bee.y = (bee.head ? 78 : 72) + Math.sin(gT * 4) * 3;
      SFX.buzz();
      if ((bee.dir > 0 && bee.x > W + 44) || (bee.dir < 0 && bee.x < -44)) bee = null;
    }

    // ---------------------------------------------------------------- tirs de la bombe
    const MULTCOL = ['#8aa0ae', '#ffffff', '#5ef0ff', '#7cff8a', '#ffd34d', '#ff5fae'];
    function updateShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        if (state !== 'play') break;
        const s = shots[i];
        if (!s) continue;
        s.t += dt;
        let travel = 580 * dt, dead = false;
        while (travel > 0 && !dead) {
          const st = Math.min(4, travel);
          travel -= st;
          s.y -= st;
          for (let j = drops.length - 1; j >= 0; j--) {
            const d = drops[j];
            if (HARD[d.k]) continue;
            if (Math.abs(d.x - s.x) < 7 && Math.abs(d.y - s.y) < 9) {
              drops.splice(j, 1);
              burst(d.x, d.y, 7, ['#e6e04f', '#fff6a0', '#ff9fd0'], 70, 0.4, 1.8, 50);
              ring(d.x, d.y, 2, 14, 0.25, '#ffe27a', 2);
              addScore(5);
              SFX.dropHit();
              if (!s.pierce) { dead = true; break; }
            }
          }
          if (dead) break;
          if (bee && Math.abs(bee.x - s.x) < (bee.head ? 26 : 21) && Math.abs(bee.y - s.y) < (bee.head ? 18 : 14)) { hitBee(); s.hits++; dead = true; break; }
          if (boss && boss.hp > 0 && boss.enter <= 0.02) {
            const B = BOSSES[boss.kind];
            const dx = (s.x - boss.x) / B.hw, dy = (s.y - (boss.y + B.oy)) / B.hh;
            if (dx * dx + dy * dy < 1) { s.hits++; hitBoss(s.x, s.y, 1); dead = true; break; }
          }
          for (const f of flies) {
            if (!f.alive || f.mode === 'flee' || f === s.last || f.y < 6) continue;
            const ty = TYPES[f.type];
            const hw = f.head ? 16 : ty.hw, hh = f.head ? 16 : ty.hh + 2;
            if (Math.abs(f.x - s.x) < hw && Math.abs(f.y + (f.head ? 3 : 0) - s.y) < hh) {
              damageFly(f, false);
              s.hits++;
              s.last = f;
              if (s.pierce && s.hits < 3) continue;
              dead = true;
              break;
            }
          }
          if (dead || state !== 'play') break;
          if (s.y < -20) dead = true;
        }
        if (dead) { const k = shots.indexOf(s); if (k >= 0) shots.splice(k, 1); }
      }
    }
    function hitBee() {
      const pts = cpick('luck', [50, 100, 150, 200, 250, 300]) * mult();
      addScore(pts);
      gauge = Math.min(1, gauge + 1 / 6);
      burst(bee.x, bee.y, 22, ['#ffc93a', '#1d1a14', '#fff2a0'], 150, 0.8, 2.6, 100);
      puffs(bee.x, bee.y, 8, ['#ff7fc0', '#c58bff', '#ffd0e8'], 60, 0.7, 6);
      ring(bee.x, bee.y, 6, 48, 0.45, '#ffd34d', 4);
      if (bee.head) {
        addFace(bee.head, bee.x, bee.y + 8, 38, 1.8);
        pop(bee.x, bee.y + 42, snifText(bee.head), '#cfeaff', 15, 2.0, 8);
        pop(bee.x, bee.y + 64, '+' + pts, '#ffd34d', 20, 2.0, 8);
      } else {
        pop(bee.x, bee.y + 4, '+' + pts, '#ffd34d', 22, 1.3, 18);
        pop(bee.x, bee.y - 20, 'BZZ… PSCHITT !', '#ffe6f2', 12, 0.9, 26);
      }
      doShake(4);
      SFX.power();
      maybeDropCap(bee.x, bee.y + 10, 1);
      if (corpses.length < CMAX) { const v = ejectVel(bee.x); corpses.push({ x: bee.x, y: bee.y, vx: v.vx, vy: v.vy, ang: 0, va: v.va, type: 'bee', t: 0, flip: 0, head: null, bounced: false }); }
      bee = null;
    }

    // ---------------------------------------------------------------- touché, éliminé
    function damageFly(f, viaSwat) {
      if (!f.alive) return false;
      f.hp--;
      f.hitT = 0.12;
      if (f.hp > 0) {
        if (f.type === 'taon') {
          f.type = 'taon0';
          addP({ k: 'helmet', x: f.x, y: f.y + 6, vx: (Math.random() - 0.5) * 140, vy: -170, life: 1.0, max: 1.0, r: 7, col: '#e8262f', g: 520, a: 0, va: 12 });
          pop(f.x, f.y - 10, 'CLONK !', '#ffe0e0', 12, 0.6, 30);
          SFX.clonk();
        } else {
          burst(f.x, f.y, 6, ['#f4d2ff', '#a259ff', '#ffffff'], 80, 0.35, 1.8, 40);
          pop(f.x, f.y - 10, 'BLOP !', '#f4d2ff', 12, 0.6, 30);
          SFX.blop();
        }
        doShake(1);
        return false;
      }
      killFly(f, viaSwat);
      return true;
    }
    function killFly(f, viaSwat) {
      f.alive = false;
      stats.kills++;
      const before = mult();
      chain++;
      chainT = CHAIN_WIN;
      if (chain > bestChain) bestChain = chain;
      const m = mult();
      if (m > before) { multPop = 0.7; pop(W / 2, 100, 'COMBO x' + m + ' !', MULTCOL[m], 17, 1.1, 14); SFX.combo(m); }
      if (mileIdx < COMBO_TXT.length && chain >= COMBO_TXT[mileIdx][0]) {
        callout(COMBO_TXT[mileIdx][1], chain + ' d’affilée !', '#ffd34d', 1.5, 36, 0.3);
        mileIdx++;
        SFX.milestone();
        slowmo(0.35, 0.4);
        flash = Math.max(flash, 0.22); flashCol = '#fff0c0';
      }
      const diving = f.mode === 'dive' || f.mode === 'return' || f.mode === 'enter' || f.mode === 'raid';
      const pts = (TYPES[f.type].pts + (f.head ? 100 : 0)) * (diving ? 2 : 1) * m;
      addScore(pts);
      gauge = Math.min(1, gauge + (f.head ? 1 / 14 : 1 / 38));
      const P = PAL[f.type] || PAL.green;
      const fx = f.x, fy = f.y;
      puffs(fx, fy, viaSwat ? 3 : 6, ['#ff9fd0', '#c9a0ff', '#ffd0e8', '#ffffff'], 55, 0.6, 7);
      burst(fx, fy, viaSwat ? 4 : 9, [P.body, P.hi, P.dark], 120, 0.5, 2.2, 140);
      ring(fx, fy, 4, 26, 0.32, '#ff8fca', 3);
      if (viaSwat) {
        if (f.head) addFace(f.head, fx, fy, 36, 1.7);
      } else if (f.head) {
        addFace(f.head, fx, fy, 36, 1.7);
        pop(fx, fy + 30, snifText(f.head), '#cfeaff', 12, 1.6, 12);
        pop(fx, fy + 46, '+' + pts, '#ffd34d', 13, 1.6, 12);
        SFX.sad();
        doShake(2.5);
      } else {
        if (Math.random() < 0.3) pop(fx, fy - 8, diving ? 'EN VOL !' : KILL_WORDS[(Math.random() * KILL_WORDS.length) | 0], diving ? '#5ef0ff' : '#ffe6f2', 12, 0.6, 34);
        if (pts >= 40 || chain % 5 === 0) pop(fx, fy + 10, '+' + pts, '#ffd34d', 10, 0.75, 24);
        doShake(1.4);
      }
      SFX.kill(chain);
      if (!viaSwat) addCorpse(f);
      if (f.type === 'fat') {
        for (let k = -1; k <= 1; k += 2) flies.push(newFly('gnat', { mode: 'dive', x: fx + k * 9, y: fy, vx: k * 90, vy: -70, dropped: true }));
        pop(fx, fy - 26, 'ELLE SE DIVISE !', '#f4d2ff', 11, 0.9, 20);
      }
      if (swarm) swarm.killed++;
      if (!viaSwat) maybeDropCap(fx, fy, f.head ? 0.3 : 0.035);
      else SFX.kill(chain);
      lastKill = { x: fx, y: fy };
      checkClear();
    }
    function loseCombo() {
      if (chain >= 8) { pop(W / 2, 100, 'COMBO PERDU', '#9fb0bc', 12, 0.9, 10); SFX.lose(); }
      chain = 0;
      mileIdx = 0;
    }
    let lastHit = null;
    const godLog = [];
    function hitPlayer(msg) {
      if (!player.alive || state !== 'play') return;
      lastHit = { msg, wave, t: +gT.toFixed(1), x: Math.round(player.x), drops: drops.filter((d) => d.y > P_TOP - 30).map((d) => [d.k, Math.round(d.x), Math.round(d.y)]), divers: flies.filter((f) => f.alive && f.mode !== 'form' && f.y > P_TOP - 40).map((f) => [f.type, f.mode, Math.round(f.x), Math.round(f.y)]) };
      if (god) { godHits++; flash = 0.15; flashCol = '#ff4d5e'; if (godLog.length < 400) godLog.push(lastHit); return; }
      player.alive = false;
      const x = player.x, y = PY - 26;
      player.dead = { x, y, vx: (x < W / 2 ? 1 : -1) * 120, vy: -430, ang: 0, va: (x < W / 2 ? 1 : -1) * 11, t: 0, boom: false };
      puffs(x, y, 10, ['#ff5fae', '#c58bff', '#ffd0e8'], 120, 1.0, 9);
      burst(x, y, 20, ['#e9f0f3', '#b9c4cc', '#7d8a94'], 170, 0.9, 2.6, 160);
      ring(x, y, 6, 70, 0.5, '#ff5fae', 4);
      pop(x, y - 34, msg || 'PFFUIT !', '#ff8fca', 20, 1.1, 26);
      doShake(10);
      flash = 0.35; flashCol = '#ffffff';
      stopT = 0.12;
      slowmo(0.9, 0.35);
      SFX.die();
      drops = [];
      shots = [];
      state = 'dying';
      stateT = 0;
      if (swat) swat.cancel = true;
    }
    function checkClear() {
      if (state !== 'play' || boss) return;
      if (swarm) { if (swarm.killed >= swarm.quota) waveClear('swarm'); return; }
      for (const f of flies) if (f.alive && f.mode !== 'raid') return;
      waveClear(meta.kind === 'feast' ? 'perfect' : 'normal');
    }
    function waveClear(how) {
      clearKind = how;
      state = 'clear';
      stateT = 0;
      for (const f of flies) if (f.alive) f.mode = 'flee';
      callouts = [];
      for (const d of drops) burst(d.x, d.y, 2, ['#fff6a0', '#ff9fd0'], 30, 0.3, 1.4, 0);
      drops = [];
      shots = [];
      bee = null;
      let bonus = 200 * wave;
      if (how === 'perfect') bonus += 1500 + 100 * wave;
      addScore(bonus);
      clearBonus = bonus;
      if (lastKill && how !== 'feastEnd') { slowmo(0.55, 0.3); ring(lastKill.x, lastKill.y, 6, 90, 0.6, '#ffffff', 4); }
      const Wd = WORLDS[worldIdx];
      const lines = CHEERS[Wd.id];
      celebrate(lines[(wave + ((Math.random() * 3) | 0)) % lines.length]);
      SFX.clear();
      for (let i = 0; i < 18; i++) addP({ k: 'petal', x: Math.random() * W, y: -10 - Math.random() * 60, vx: rnd(-30, 30), vy: rnd(60, 140), life: 2.2, max: 2.2, r: 1, col: '#b98cff', g: 20, a: Math.random() * TAU, va: rnd(-4, 4) });
    }
    let clearBonus = 0;

    // ---------------------------------------------------------------- boss
    function startBoss(kind, L) {
      const B = BOSSES[kind];
      const hp = Math.round(B.hp * (1 + 0.45 * (L - 1)));
      boss = { kind, L, hp, max: hp, x: W / 2, y: -170, y0: B.y0, t: 0, hitT: 0, enter: 1, mode: 'idle', mt: 0, a: 1.8, b: 1.3, c: 6, d: 7,
        angry: false, dir: 1, aimX: W / 2, tx: W / 2, ty: B.y0, vy: 0, head: heads.length ? (beeHead || heads[0]) : null, stun: 0, cols: [], eclipse: 0, rainT: 0 };
      if (boss.head) seenNames.add(boss.head.name);
      if (!bossSpr || bossSpr.kind !== kind) buildBossSprites(kind);
      vign = 1;
    }
    function aimAng(x, y) { return Math.atan2(player.x - x, PY - 20 - y); }
    function bossShot(x, y, ang, spd, k) { shootDrop(x, y, Math.sin(ang) * spd, Math.cos(ang) * spd, k); }
    function summon(n, type) {
      let loose = 0;
      for (const f of flies) if (f.alive && !f.slot) loose++;
      const cap = 2 + Math.floor(boss.L / 2) + (boss.angry ? 1 : 0);
      for (let k = 0; k < n && loose + k < cap; k++) {
        const s = k ? 1 : -1;
        flies.push(newFly(type, { mode: 'dive', x: boss.x + s * 42, y: boss.y + 40, vx: s * 90, vy: -60, dropped: true }));
      }
      SFX.dive();
    }
    function hitBoss(x, y, dmg) {
      const b = boss;
      if (!b || b.hp <= 0) return;
      if (chain > 0) chainT = CHAIN_WIN;
      b.hp -= dmg;
      b.hitT = 0.1;
      addScore(10 * mult() * dmg);
      gauge = Math.min(1, gauge + 0.004 * dmg);
      burst(x, y, 5, ['#ff7fc0', '#c58bff', '#ffffff'], 80, 0.3, 2, 30);
      SFX.bossHit();
      doShake(0.7);
      if (!b.angry && b.hp <= b.max / 2 && b.hp > 0) {
        b.angry = true;
        callout('EN COLÈRE !', 'Il accélère…', '#ff4d5e', 1.3, 36, 0.3);
        flash = 0.25; flashCol = '#ff4d5e';
        doShake(6);
        tone(140, 0.45, 'sawtooth', 0.05, 80);
      }
      if (b.hp <= 0) bossDefeated();
    }
    function bossDefeated() {
      const b = boss;
      stats.bosses++;
      const bonus = 1000 + 500 * Math.max(1, Math.floor(wave / PER_WORLD));
      addScore(bonus);
      bossDeath = { t: 0, x: b.x, y: b.y, bonus, final: false, boomT: 0 };
      state = 'bossdeath';
      stateT = 0;
      stopT = 0.16;
      flash = 0.6; flashCol = '#ffffff';
      doShake(9);
      slowmo(1.2, 0.35);
      SFX.bossDown();
      for (const d of drops) burst(d.x, d.y, 2, ['#ffffff', '#ffd0e8'], 40, 0.3, 1.4, 0);
      drops = [];
      shots = [];
      for (const f of flies) if (f.alive) { puffs(f.x, f.y, 3, ['#ff9fd0', '#ffffff'], 40, 0.5, 5); addCorpse(f); f.alive = false; }
      // le décor du monde suivant est peint pendant l'arrêt sur image (pas d'à-coup visible ensuite)
      try { prepareNextScene(waveMeta(wave + 1).wi); } catch (e) { /* rien */ }
      celebrate(BOSS_CHEERS[(Math.random() * BOSS_CHEERS.length) | 0]);
    }
    function updateBoss(dt) {
      const b = boss, L = b.L, ph2 = b.angry;
      b.t += dt;
      if (b.hitT > 0) b.hitT -= dt;
      if (b.stun > 0) { b.stun -= dt; b.x += Math.sin(b.t * 40) * 0.6; return; }
      const my = b.y + 80;
      if (b.kind === 'reine') {
        const sp = 0.55 + Math.min(L, 6) * 0.07 + (ph2 ? 0.15 : 0);
        b.x = W / 2 + Math.sin(b.t * sp) * (W / 2 - 92) + Math.sin(b.t * 1.7) * 10;
        b.y = b.y0 + Math.sin(b.t * 1.3) * 16;
        b.a -= dt;
        if (b.a <= 0) {
          b.a = Math.max(1.0, 2.7 - 0.18 * (L - 1)) * (ph2 ? 0.78 : 1) * crnd('boss', 0.85, 1.15);
          const n = Math.min(5 + Math.floor(L / 2) + (ph2 ? 2 : 0), 12), spread = Math.min(0.9 + 0.08 * L, 1.5), spd = Math.min(108 + 10 * L, 220);
          const base = ph2 ? aimAng(b.x, my) * 0.5 : 0;
          for (let i = 0; i < n; i++) bossShot(b.x, my, base - spread / 2 + (spread * i) / (n - 1), spd, 'sirop');
          SFX.bossShot();
          ring(b.x, my, 4, 24, 0.3, '#d9a0ff', 2);
        }
        b.b -= dt;
        if (b.b <= 0) {
          b.b = Math.max(0.9, 2.1 - 0.12 * L) * crnd('boss', 0.85, 1.2);
          const k = Math.min(1 + Math.floor(L / 2) + (ph2 ? 1 : 0), 4), a0 = aimAng(b.x, my);
          for (let j = 0; j < k; j++) bossShot(b.x, my, a0 + (j - (k - 1) / 2) * 0.14, Math.min(150 + 8 * L, 250), 'sirop');
        }
        if (ph2 || L >= 2) { b.d -= dt; if (b.d <= 0) { b.d = Math.max(5, 8.5 - 0.5 * L); summon(2, 'gnat'); } }
      } else if (b.kind === 'taon') {
        if (b.mode === 'idle') { b.mode = 'hover'; b.mt = 2.4; }
        if (b.mode === 'hover') {
          b.mt -= dt;
          b.x += (clamp(player.x, 90, W - 90) - b.x) * Math.min(1, dt * (0.7 + 0.1 * L));
          b.y += (b.y0 + Math.sin(b.t * 2) * 10 - b.y) * Math.min(1, dt * 3);
          b.b -= dt;
          if (b.b <= 0) {
            b.b = (ph2 ? 0.95 : 1.45) * crnd('boss', 0.85, 1.15);
            const a0 = aimAng(b.x, b.y + 64), n = ph2 ? 5 : 3;
            for (let i = 0; i < n; i++) bossShot(b.x, b.y + 64, a0 + (i - (n - 1) / 2) * 0.22, Math.min(140 + 10 * L, 240), 'boue');
            SFX.bossShot();
          }
          if (b.mt <= 0) { b.mode = 'windup'; b.mt = 0.9; b.aimX = clamp(player.x, 60, W - 60); pop(b.x, b.y + 104, 'IL VA CHARGER !', '#ffd34d', 14, 1.0, 8); SFX.warn(); }
        } else if (b.mode === 'windup') {
          b.mt -= dt;
          b.x += (b.aimX - b.x) * Math.min(1, dt * 6);
          b.y -= 26 * dt;
          if (b.mt <= 0) { b.mode = 'charge'; b.vy = 0; SFX.dive(); }
        } else if (b.mode === 'charge') {
          b.vy = Math.min(b.vy + 1500 * dt, 640 + 30 * L);
          b.y += b.vy * dt;
          carveShields(b.x, b.y + 24, 64, 50);
          if (player.alive && Math.abs(b.x - player.x) < 56 && b.y + 48 > P_TOP) hitPlayer('ÉCRASÉ !');
          if (b.y >= PY - 96) {
            b.y = PY - 96;
            b.mode = 'recover';
            b.mt = 0.55;
            doShake(8);
            ring(b.x, PY - 30, 10, 120, 0.5, '#e0b080', 5);
            burst(b.x, PY - 20, 18, ['#c9a070', '#8a6a40', '#ffffff'], 160, 0.6, 2.4, 300);
            SFX.big();
          }
        } else if (b.mode === 'recover') {
          b.mt -= dt;
          if (b.mt <= 0) {
            b.y -= (220 + 20 * L) * dt;
            b.c -= dt;
            if (b.c <= 0) { b.c = 0.5; const a0 = aimAng(b.x, b.y); bossShot(b.x - 46, b.y, a0 - 0.5, 160 + 8 * L, 'boue'); bossShot(b.x + 46, b.y, a0 + 0.5, 160 + 8 * L, 'boue'); }
            if (b.y <= b.y0) { b.y = b.y0; b.mode = ph2 && b.mt > -5 && !b.again ? 'windup' : 'hover'; b.again = b.mode === 'windup'; b.mt = b.mode === 'windup' ? 0.75 : (ph2 ? 1.6 : 2.6); if (b.mode === 'windup') { b.aimX = clamp(player.x, 60, W - 60); pop(b.x, b.y + 104, 'ENCORE !', '#ffd34d', 14, 0.9, 8); SFX.warn(); } }
          }
        }
        if (b.mode === 'hover') b.again = false;
      } else if (b.kind === 'frelon') {
        const sp = 0.7 + 0.06 * L + (ph2 ? 0.2 : 0);
        b.x = W / 2 + Math.sin(b.t * sp) * (W / 2 - 96);
        b.y = b.y0 + Math.sin(b.t * sp * 2) * 32;
        b.b -= dt;
        const raining = b.cols.length > 0 && !ph2 && L < 2;
        if (b.b <= 0 && !raining) {
          b.b = (ph2 ? 1.0 : 1.5) * crnd('boss', 0.85, 1.15);
          const a0 = aimAng(b.x, b.y + 72), n = ph2 ? 3 : 2;
          for (let i = 0; i < n; i++) bossShot(b.x, b.y + 72, a0 + (i - (n - 1) / 2) * 0.13, Math.min(250 + 12 * L, 360), 'dard');
          SFX.bossShot();
        }
        b.a -= dt;
        if (b.a <= 0 && !b.cols.length) {
          b.a = (ph2 ? 4.8 : 6.2) * crnd('boss', 0.9, 1.1);
          const n = Math.min(4, 2 + (ph2 ? 1 : 0) + (L >= 3 ? 1 : 0)), lanes = [];
          for (let k = 0; k < 20 && lanes.length < n; k++) { const ln = (cr('boss') * 8) | 0; if (lanes.indexOf(ln) < 0) lanes.push(ln); }
          b.cols = lanes.map((ln) => ({ x: 25 + ln * 50, t: 0, sp: 0 }));
          pop(W / 2, 330, 'PLUIE DE DARDS !', '#ffd34d', 15, 1.1, 6);
          SFX.warn();
        }
        for (let i = b.cols.length - 1; i >= 0; i--) {
          const c = b.cols[i];
          c.t += dt;
          if (c.t > 1.1 && c.t < 1.65) { c.sp -= dt; if (c.sp <= 0) { c.sp = 0.1; shootDrop(c.x + crnd('boss', -14, 14), -12, 0, Math.min(370 + 15 * L, 440), 'dard'); } }
          if (c.t >= 3.5) b.cols.splice(i, 1);
        }
        if (ph2 || L >= 2) { b.d -= dt; if (b.d <= 0) { b.d = 6.5; summon(2, 'wasp'); } }
      } else if (b.kind === 'bourdon') {
        if (b.mode === 'idle') { b.mode = 'sweep'; b.mt = 2.4; b.next = 'charge'; }
        b.mt -= dt;
        if (b.mode === 'sweep') {
          const nx = W / 2 + Math.sin(b.t * (0.8 + 0.06 * Math.min(L, 8))) * (W / 2 - 96);
          if (Math.abs(nx - b.x) > 0.5) b.dir = nx >= b.x ? 1 : -1;
          b.x += (nx - b.x) * Math.min(1, dt * 4);
          b.y += (b.y0 + Math.sin(b.t * 2) * 10 - b.y) * Math.min(1, dt * 3);
          b.b -= dt;
          if (b.b <= 0) {
            b.b = Math.max(0.8, 1.6 - 0.08 * L) * (ph2 ? 0.75 : 1);
            const a0 = aimAng(b.x, b.y + 46), spd = Math.min(150 + 8 * L, 240);
            bossShot(b.x, b.y + 46, a0, spd, 'pollen');
            if (L >= 2 || ph2) { bossShot(b.x, b.y + 46, a0 - 0.25, spd, 'pollen'); bossShot(b.x, b.y + 46, a0 + 0.25, spd, 'pollen'); }
          }
          if (b.mt <= 0) {
            b.mode = b.next;
            b.mt = b.mode === 'charge' ? 2.0 : Math.min(3, 1.6 + 0.2 * L);
            b.next = b.mode === 'charge' ? 'spiral' : 'charge';
            b.c = 0;
            b.sy = b.y;
            pop(b.x, b.y + 84, b.mode === 'charge' ? 'BZZZ ! IL PLONGE !' : 'TOURBILLON !', '#ffd34d', 14, 1.0, 10);
            tone(b.mode === 'charge' ? 160 : 220, 0.5, 'sawtooth', 0.04, b.mode === 'charge' ? 90 : 440);
          }
        } else if (b.mode === 'charge') {
          const k = clamp(1 - b.mt / 2.0, 0, 1);
          b.y = b.sy + Math.sin(Math.PI * k) * (200 + Math.min(L, 6) * 12);
          const dx = player.x - b.x, st = (70 + 8 * Math.min(L, 8)) * dt;
          b.x += clamp(dx, -st, st);
          if (Math.abs(dx) > 2) b.dir = dx > 0 ? 1 : -1;
          b.c -= dt;
          if (b.c <= 0 && k > 0.15 && k < 0.85) { b.c = Math.max(0.14, 0.24 - 0.01 * L); bossShot(b.x - 50, b.y + 40, 0, 170 + 6 * L, 'pollen'); bossShot(b.x + 50, b.y + 40, 0, 170 + 6 * L, 'pollen'); }
          if (b.mt <= 0) { b.mode = 'sweep'; b.mt = Math.max(1.4, 3.2 - 0.2 * L); }
        } else if (b.mode === 'spiral') {
          b.y += (b.y0 + 14 - b.y) * Math.min(1, dt * 3);
          b.x += (W / 2 - b.x) * Math.min(1, dt * 1.5);
          b.c -= dt;
          if (b.c <= 0) {
            b.c = Math.max(0.07, 0.14 - 0.008 * L);
            b.a += 0.42;
            for (const arm of [0, Math.PI]) { const ang = b.a + arm; if (Math.cos(ang) > 0.2) bossShot(b.x, b.y + 10, ang, Math.min(100 + 8 * L, 190), 'pollen'); }
          }
          if (b.mt <= 0) { b.mode = 'sweep'; b.mt = Math.max(1.4, 3.2 - 0.2 * L); }
        }
      } else if (b.kind === 'moustique') {
        if (b.mode === 'idle') { b.mode = 'hover'; b.mt = 0.4; }
        if (b.mode === 'dash') {
          const k = Math.min(1, dt * (4 + 0.3 * Math.min(L, 8)));
          b.x += (b.tx - b.x) * k;
          b.y += (b.ty - b.y) * k;
          if (Math.hypot(b.tx - b.x, b.ty - b.y) < 6) { b.mode = 'aim'; b.c = Math.min(3 + Math.floor((L - 1) / 2) + (ph2 ? 1 : 0), 7); b.b = 0.4; b.aimX = player.x; }
        } else if (b.mode === 'aim') {
          b.b -= dt;
          b.aimX += (player.x - b.aimX) * Math.min(1, dt * 6);
          if (b.b <= 0) {
            b.c--;
            b.b = 0.11;
            bossShot(b.x, b.y + 112, Math.atan2(b.aimX - b.x, PY - 20 - (b.y + 112)), Math.min(180 + 10 * L, 290), 'aiguille');
            tone(980, 0.04, 'square', 0.025, 700);
            if (b.c <= 0) {
              if (ph2) for (let i = 0; i < 5; i++) bossShot(b.x, b.y + 112, -0.6 + i * 0.3, Math.min(110 + 6 * L, 180), 'aiguille');
              b.mode = 'hover';
              b.mt = Math.max(0.3, 0.9 - 0.08 * L);
            }
          }
        } else {
          b.x += Math.sin(b.t * 9) * 20 * dt;
          b.mt -= dt;
          if (b.mt <= 0) {
            let tx, ty, k = 0;
            do { tx = crnd('boss', 80, W - 80); ty = crnd('boss', 150, 260); } while (++k < 10 && Math.hypot(tx - b.x, ty - b.y) < 90);
            b.tx = tx; b.ty = ty;
            b.mode = 'dash';
            tone(1400, 0.12, 'sine', 0.02, 2000);
          }
        }
        if (Math.abs(b.tx - b.x) > 2) b.dir = b.tx > b.x ? 1 : -1;
        b.d -= dt;
        if (b.d <= 0) { b.d = Math.max(5, 9 - 0.5 * L); summon(2, 'mosq'); }
      } else {
        // le Sphinx de minuit : attiré par la lumière de la bombe, anneaux d'écailles, éclipses
        b.x += (clamp(player.x, 100, W - 100) - b.x) * Math.min(1, dt * (0.45 + 0.05 * L));
        b.y = b.y0 + Math.sin(b.t * 1.6) * 18;
        b.a -= dt;
        if (b.a <= 0) {
          b.a = (ph2 ? 1.6 : 2.3) * crnd('boss', 0.9, 1.1);
          const n = Math.min(12 + 2 * L + (ph2 ? 4 : 0), 24), off = b.t * 0.7, spd = Math.min(105 + 8 * L, 190);
          for (let i = 0; i < n; i++) bossShot(b.x, b.y + 20, off + (i / n) * TAU, spd, 'ecaille');
          SFX.bossShot();
          ring(b.x, b.y + 20, 8, 60, 0.4, '#7af0ff', 3);
        }
        b.c -= dt;
        if (b.c <= 0 && b.eclipse <= 0) { b.c = (ph2 ? 8 : 10.5) * crnd('boss', 0.9, 1.1); b.eclipse = 3.6; callout('ÉCLIPSE !', 'Il éteint les lumières…', '#7af0ff', 1.4, 36, 0.3); SFX.dark(); }
        if (b.eclipse > 0) {
          b.eclipse -= dt;
          b.b -= dt;
          if (b.b <= 0) { b.b = 0.6; bossShot(b.x, b.y + 30, aimAng(b.x, b.y + 30), Math.min(150 + 8 * L, 220), 'ecaille'); }
          if (b.eclipse <= 0) SFX.light();
        }
        if (ph2) { b.d -= dt; if (b.d <= 0) { b.d = 6.5; summon(2, 'moth'); } }
      }
      b.x = clamp(b.x, 50, W - 50);
    }

    // ---------------------------------------------------------------- tapette géante
    function trySwat() {
      if (gauge < 1 || state !== 'play' || swat || !player.alive) return false;
      gauge = 0;
      let tx = player.x, ty = 260;
      if (boss) ty = clamp(boss.y, 150, 430);
      else {
        let sy = 0, n = 0;
        for (const f of flies) if (f.alive && f.mode !== 'flee' && Math.abs(f.x - tx) < 120 && f.y > 40 && f.y < 560) { sy += f.y; n++; }
        ty = n ? clamp(sy / n, 150, 470) : 260;
      }
      swat = { t: 0, x: clamp(tx, SWAT_W / 2 - 16, W - SWAT_W / 2 + 16), y: ty, hit: false, stuck: [], n: 0 };
      SFX.swatUp();
      return true;
    }
    function swatImpact() {
      const s = swat, hw = SWAT_W / 2 - 4, hh = SWAT_H / 2 - 4, sc0 = score;
      let n = 0;
      for (const f of flies.slice()) {
        if (!f.alive || f.mode === 'flee') continue;
        if (Math.abs(f.x - s.x) < hw && Math.abs(f.y - s.y) < hh) {
          f.hp = 1;
          s.stuck.push({ dx: f.x - s.x, dy: f.y - s.y, type: f.type, ang: f.ang || 0, head: f.head });
          damageFly(f, true);
          n++;
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; if (Math.abs(d.x - s.x) < hw && Math.abs(d.y - s.y) < hh) drops.splice(i, 1); }
      if (bee && Math.abs(bee.x - s.x) < hw && Math.abs(bee.y - s.y) < hh) hitBee();
      if (boss && boss.hp > 0 && Math.abs(boss.x - s.x) < hw + 30 && Math.abs(boss.y - s.y) < hh + 30) { hitBoss(boss.x, boss.y, Math.max(6, Math.round(boss.max * 0.12))); if (boss) boss.stun = 1.1; }
      s.n = n;
      if (score > sc0) pop(s.x, s.y + 40, '+' + fmt(score - sc0), '#ffd34d', 22, 1.6, 14);
      if (state === 'play') callout('CLAC !', n >= 2 ? n + ' insectes écrasés !' : n === 1 ? 'Écrasé !' : null, '#ff5fae', 1.15, 60, 0.3);
      flash = 0.45; flashCol = '#ffffff';
      doShake(10);
      stopT = Math.max(stopT, 0.07);
      slowmo(0.55, 0.3);
      ring(s.x, s.y, 20, 250, 0.6, '#ffffff', 6);
      ring(s.x, s.y, 10, 170, 0.45, '#ff8fca', 4);
      puffs(s.x, s.y, 12, ['#ffffff', '#ffd0e8', '#e9d4ff'], 160, 0.8, 10);
      SFX.clac();
    }
    function updateSwat(dt) {
      swat.t += dt;
      if (!swat.hit && swat.t >= 0.24) { swat.hit = true; swatImpact(); }
      if (swat && swat.t >= 1.2) swat = null;
    }

    // ---------------------------------------------------------------- décor vivant (repère écran)
    let amb = [];
    function initAmbient() {
      amb = [];
      const kind = WORLDS[worldIdx].amb;
      const n = kind === 'petals' ? 26 : kind === 'fireflies' ? 16 : kind === 'sparkles' ? 18 : kind === 'leaves' ? 8 : 14;
      for (let i = 0; i < n; i++) amb.push(newAmb(kind, true));
    }
    function newAmb(kind, any) {
      const a = { x: Math.random() * cw, y: any ? Math.random() * ch : 0, s: 0.6 + Math.random() * 0.8, p: Math.random() * TAU, vx: 0, vy: 0 };
      if (kind === 'bubbles') { a.vy = -(10 + Math.random() * 18); if (!any) a.y = ch + 20; }
      else if (kind === 'dust') { a.vy = -(3 + Math.random() * 6); a.vx = 4 + Math.random() * 6; if (!any) a.y = ch * Math.random(); }
      else if (kind === 'leaves') { a.vy = 18 + Math.random() * 20; a.vx = -10 + Math.random() * 20; if (!any) a.y = -20; }
      else if (kind === 'petals') { a.vy = 12 + Math.random() * 18; a.vx = 40 + Math.random() * 60; if (!any) { a.x = -20; a.y = Math.random() * ch; } }
      else if (kind === 'sparkles') { const w = scene && scene.water; a.y = w ? w.y0 + Math.random() * (w.y1 - w.y0) : ch * (0.5 + Math.random() * 0.4); }
      else if (kind === 'fireflies') { a.vx = (Math.random() - 0.5) * 16; a.vy = (Math.random() - 0.5) * 12; }
      return a;
    }
    function updateAmbient(dt) {
      const kind = WORLDS[worldIdx].amb;
      for (let i = 0; i < amb.length; i++) {
        const a = amb[i];
        a.p += dt;
        if (kind === 'sparkles') { if (a.p > 2.5 + a.s * 2) amb[i] = newAmb(kind, true); continue; }
        if (kind === 'fireflies') {
          a.vx += (Math.random() - 0.5) * 30 * dt; a.vy += (Math.random() - 0.5) * 30 * dt;
          a.vx = clamp(a.vx, -18, 18); a.vy = clamp(a.vy, -14, 14);
        }
        a.x += (a.vx + (kind === 'petals' ? windV * 0.9 * U : 0)) * dt;
        a.y += a.vy * dt;
        if (kind === 'bubbles' || kind === 'leaves') a.x += Math.sin(a.p * 1.4) * 8 * dt;
        if (a.y < -30 || a.y > ch + 30 || a.x < -40 || a.x > cw + 40) amb[i] = newAmb(kind, false);
      }
    }

    // ---------------------------------------------------------------- effets : mise à jour
    function updateFx(dt, rdt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        if (p.k === 'petal' || p.k === 'leaf') { p.vx += (windV * 0.6 - p.vx) * Math.min(1, dt * 0.8); p.x += Math.sin(p.life * 3 + p.a) * 14 * dt; }
        else { p.vx *= 1 - 1.8 * dt; p.vy *= 1 - 1.1 * dt; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += p.va * dt;
      }
      for (let i = corpses.length - 1; i >= 0; i--) {
        const c = corpses[i];
        c.t += dt;
        c.vy += 430 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.ang += c.va * dt;
        // sortie par le côté ; filet de sécurité : elle s'efface avant d'arriver à la hauteur de la bombe
        if (c.y > PY - 90) c.rest = (c.rest || 0) + dt * 4;
        if (c.x < -60 || c.x > W + 60 || c.y < -80 || (c.rest || 0) > 0.9) corpses.splice(i, 1);
      }
      for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life -= rdt; p.y -= p.vy * rdt; if (p.life <= 0) pops.splice(i, 1); }
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
      for (let i = faces.length - 1; i >= 0; i--) { const f = faces[i]; f.life -= rdt; f.y -= 6 * rdt; if (f.life <= 0) faces.splice(i, 1); }
      for (let i = callouts.length - 1; i >= 0; i--) { callouts[i].t += rdt; if (callouts[i].t >= callouts[i].life) callouts.splice(i, 1); }
      // boucliers emportés par le mistral
      for (const sh of shields) {
        if (sh.drop > 0) sh.drop = Math.max(0, sh.drop - rdt);
        if (sh.gone) { sh.gone += rdt; sh.gx += sh.vx * rdt; sh.gy += sh.vy * rdt; sh.vy += 300 * rdt; sh.ang += sh.va * rdt; }
      }
    }

    // ---------------------------------------------------------------- nuit : coupures de courant ; lavande : mistral
    function updateWorldFx(dt) {
      const Wd = WORLDS[worldIdx];
      let want = 0;
      if (Wd.dark && state === 'play' && meta.kind !== 'boss') {
        darkT -= dt;
        if (darkT <= 0) {
          darkOn = !darkOn;
          darkT = darkOn ? crnd('raid', 4, 6) : crnd('raid', 7, 11);
          if (darkOn) { SFX.dark(); pop(W / 2, 128, 'COUPURE DE COURANT !', '#c6f36b', 15, 1.4, 6); } else SFX.light();
        }
        want = darkOn ? 1 : 0;
      }
      if (boss && boss.kind === 'sphinx' && boss.eclipse > 0) want = 1;
      if (state !== 'play') want = 0;
      darkK += clamp(want - darkK, -dt * 2.2, dt * 2.2);
      if (Wd.wind && state !== 'trans') windV = 62 * Math.sin(gT * 0.45 + 1) + 24 * Math.sin(gT * 1.3);
      else windV *= Math.max(0, 1 - dt * 2);
      if (vign > 0 && !(boss && state === 'intro')) vign = Math.max(0, vign - dt * 0.6);
    }

    // ---------------------------------------------------------------- transition d'un monde au suivant (le mistral)
    function startTrans() {
      const nm = waveMeta(wave + 1);
      prepareNextScene(nm.wi);
      trans = { t: 0, from: worldIdx, to: nm.wi, nm };
      state = 'trans';
      stateT = 0;
      bossDeath = null;
      SFX.wind();
      later(1.35, () => SFX.chime());
      for (let i = 0; i < 4 && i < shields.length; i++) { const sh = shields[i]; sh.gx = sh.x; sh.gy = sh.y; sh.vx = 0; sh.vy = 0; sh.va = 0; sh.ang = 0; sh.gone = 0; sh.blow = true; }
    }
    function transEdge(t) { return lerp(-0.3 * cw, 1.3 * cw, easeOut(clamp((t - 0.15) / 1.25, 0, 1)) * 0.6 + clamp((t - 0.15) / 1.25, 0, 1) * 0.4); }
    function updateTrans(dt) {
      trans.t += dt;
      const ex = transEdge(trans.t);
      for (const sh of shields) {
        if (sh.blow && !sh.gone && FX + (sh.x + SW / 2) * U < ex) { sh.gone = 0.001; sh.vx = 300 + Math.random() * 120; sh.vy = -140 - Math.random() * 100; sh.va = 5 + Math.random() * 4; }
      }
      if (trans.t < 1.5 && Math.random() < dt * 40) {
        const y = Math.random() * H;
        addP({ k: Math.random() < 0.7 ? 'petal' : 'leaf', x: (ex - FX) / U - 20, y, vx: 380 + Math.random() * 260, vy: rnd(-60, 60), life: 1.4, max: 1.4, r: 1, col: '#b98cff', g: 0, a: Math.random() * TAU, va: rnd(-8, 8) });
      }
    }

    // ===========================================================================
    // RENDU
    // ===========================================================================
    function S0() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    let shX = 0, shY = 0;
    function SF() { const k = dpr * U; ctx.setTransform(k, 0, 0, k, dpr * (FX + shX * U), dpr * (FY + shY * U)); }
    const toX = (x) => FX + x * U, toY = (y) => FY + y * U;

    // ---------------------------------------------------------------- textes pré-rendus (contour + dégradé + halo)
    const textCache = new Map();
    function textSprite(text, sz, color, glow) {
      sz = Math.max(8, Math.round(sz));
      const key = text + '|' + sz + '|' + color + '|' + (glow ? 1 : 0) + '|' + dpr;
      let cv = textCache.get(key);
      if (cv) return cv;
      if (textCache.size > 90) textCache.clear();
      ctx.font = sz + 'px ' + FD;
      const tw = ctx.measureText(text).width;
      const pad = Math.ceil(sz * (glow ? 0.36 : 0.18)) + 2;
      cv = mkCanvas((tw + pad * 2) * dpr, (sz * 1.3 + pad * 2) * dpr);
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.font = sz + 'px ' + FD;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      const cx = tw / 2 + pad, cy = sz * 0.65 + pad;
      if (glow) {
        x.save();
        x.shadowColor = color;
        x.shadowBlur = sz * 0.42 * dpr;
        x.lineWidth = Math.max(3, sz * 0.22);
        x.strokeStyle = '#140818';
        x.strokeText(text, cx, cy);
        x.strokeText(text, cx, cy);
        x.restore();
      }
      x.lineWidth = Math.max(3, sz * 0.22);
      x.strokeStyle = '#140818';
      x.strokeText(text, cx, cy);
      x.fillStyle = lin(x, 0, cy - sz * 0.5, 0, cy + sz * 0.5, [0, '#ffffff', 0.42, color, 1, color]);
      x.fillText(text, cx, cy);
      cv._w = tw + pad * 2; cv._h = sz * 1.3 + pad * 2; cv._cy = cy;
      textCache.set(key, cv);
      return cv;
    }
    function fitSize(text, maxW, size) {
      ctx.font = Math.round(size) + 'px ' + FD;
      const w = ctx.measureText(text).width;
      return w > maxW ? Math.max(8, Math.floor((size * maxW) / w)) : Math.round(size);
    }
    // gros texte en repère écran
    function bigText(text, x, y, size, color, maxW, alpha, scale, glow, rot) {
      if (!text || alpha <= 0.01) return;
      const sz = maxW ? fitSize(text, maxW, size) : Math.round(size);
      const cv = textSprite(text, sz, color, glow);
      ctx.globalAlpha = Math.min(1, alpha);
      if (scale !== 1 || rot) {
        ctx.save();
        ctx.translate(x, y);
        if (rot) ctx.rotate(rot);
        ctx.scale(scale, scale);
        ctx.drawImage(cv, -cv._w / 2, -cv._cy, cv._w, cv._h);
        ctx.restore();
      } else ctx.drawImage(cv, x - cv._w / 2, y - cv._cy, cv._w, cv._h);
      ctx.globalAlpha = 1;
    }
    function smallText(txt, x, y, size, fill, align, weight, alpha) {
      ctx.font = (weight || '700') + ' ' + Math.round(size) + 'px ' + FB;
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      if (alpha != null) ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(2.5, size * 0.26);
      ctx.strokeStyle = 'rgba(10,6,18,0.88)';
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(txt, x, y);
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- décor
    const gradCache = new Map();
    function beamGrad(b) {
      const key = b.pts.join(',') + b.col;
      let g = gradCache.get(key);
      if (!g) {
        g = ctx.createLinearGradient(0, b.pts[1], 0, b.pts[5]);
        g.addColorStop(0, rgba(b.col, 1));
        g.addColorStop(1, rgba(b.col, 0));
        if (gradCache.size > 20) gradCache.clear();
        gradCache.set(key, g);
      }
      return g;
    }
    function drawSkyLive(sc, k) {
      const Wd = WORLDS[sc.wi];
      // nuages qui dérivent
      if (Wd.id !== 'nuit') {
        const cl = SPRITES.cloud, a = Wd.id === 'piscine' ? 0.55 : 0.92;
        for (let i = 0; i < 3; i++) {
          const span = cw + 260 * U, x = ((rtime * (6 + i * 3) * U + i * span / 3) % span) - 130 * U;
          const y = (sc.indoor ? FY + (80 + i * 46) * U : FY + (40 + i * 52) * U);
          ctx.globalAlpha = a * (0.75 + 0.25 * (i % 2));
          const s = U * (0.7 + 0.25 * i);
          ctx.drawImage(cl, x - cl._ox * s, y - cl._oy * s, cl._w * s, cl._h * s);
        }
        ctx.globalAlpha = 1;
        // oiseaux au loin
        ctx.strokeStyle = 'rgba(40,40,60,0.55)';
        ctx.lineWidth = Math.max(1, 1.2 * U);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const x = ((rtime * 16 * U + i * 37 * U) % (cw + 80)) - 40, y = FY + (60 + i * 9 + Math.sin(rtime * 0.6 + i) * 6) * U, f = Math.sin(rtime * 7 + i * 2) * 2.4 * U;
          ctx.moveTo(x - 5 * U, y - f); ctx.quadraticCurveTo(x - 2 * U, y - 1.5 * U, x, y); ctx.quadraticCurveTo(x + 2 * U, y - 1.5 * U, x + 5 * U, y - f);
        }
        ctx.stroke();
      } else {
        // étoiles qui scintillent
        for (let i = 0; i < 22; i++) {
          const x = hash(i * 9.1) * cw, y = hash(i * 4.7) * (FY + 330 * U), tw = Math.max(0, Math.sin(rtime * (1.5 + hash(i) * 2) + i * 2));
          const r = (1 + tw * 2.2) * U;
          ctx.fillStyle = 'rgba(255,250,230,' + (0.3 + tw * 0.7).toFixed(2) + ')';
          ctx.fillRect(x - r, y - 0.5, r * 2, 1);
          ctx.fillRect(x - 0.5, y - r, 1, r * 2);
        }
      }
      // le soleil (ou la lune) respire
      if (sc.sun) {
        ctx.globalCompositeOperation = 'lighter';
        const g = tinted(sc.sun.col), s = sc.sun.r * (5 + Math.sin(rtime * 1.3) * 0.4);
        ctx.globalAlpha = 0.22 * k;
        ctx.drawImage(g, sc.sun.x - s / 2, sc.sun.y - s / 2, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawScene(sc, live) {
      const k = sceneRes();
      if (sc.indoor && sc.win) {
        ctx.save();
        ctx.clip(sc.win);
        ctx.drawImage(sc.sky, 0, 0, cw, ch);
        if (live) drawSkyLive(sc, 1);
        ctx.restore();
      } else {
        ctx.drawImage(sc.sky, 0, 0, cw, ch);
        if (live) drawSkyLive(sc, 1);
      }
      ctx.drawImage(sc.fg, 0, 0, cw, ch);
      if (sc.beams.length) {
        ctx.globalCompositeOperation = 'lighter';
        for (const b of sc.beams) {
          ctx.globalAlpha = b.a * (0.8 + 0.2 * Math.sin(rtime * 0.8 + b.pts[0]));
          ctx.fillStyle = beamGrad(b);
          ctx.beginPath();
          ctx.moveTo(b.pts[0], b.pts[1]); ctx.lineTo(b.pts[2], b.pts[3]); ctx.lineTo(b.pts[4], b.pts[5]); ctx.lineTo(b.pts[6], b.pts[7]);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (sc.glare && sc.sun) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18;
        const g = tinted('#fff3c0'), s = sc.sun.r * 12;
        ctx.drawImage(g, sc.sun.x - s / 2, sc.sun.y - s / 2, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      return k;
    }
    function drawAmbient() {
      const kind = WORLDS[worldIdx].amb;
      if (kind === 'bubbles') {
        ctx.lineWidth = Math.max(1, 1.1 * U);
        for (const a of amb) {
          const r = 4.5 * a.s * U;
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.stroke();
          ctx.fillStyle = 'rgba(255,190,240,0.5)';
          ctx.fillRect(a.x - r * 0.5, a.y - r * 0.55, r * 0.35, r * 0.35);
        }
      } else if (kind === 'dust') {
        ctx.fillStyle = '#fff6dc';
        for (const a of amb) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(a.p * 2); ctx.fillRect(a.x, a.y, 1.6 * U, 1.6 * U); }
      } else if (kind === 'leaves') {
        for (const a of amb) { ctx.globalAlpha = 0.85; dsprScreen(SPRITES.leaf, a.x, a.y, U * a.s, a.p * 1.5); }
      } else if (kind === 'petals') {
        for (const a of amb) { ctx.globalAlpha = 0.85; dsprScreen(SPRITES.petal, a.x, a.y, U * a.s * 1.2, a.p * 3); }
      } else if (kind === 'sparkles') {
        ctx.fillStyle = '#ffffff';
        for (const a of amb) {
          const k = Math.max(0, Math.sin(a.p * 2.4));
          ctx.globalAlpha = k * 0.9;
          const r = (1 + 3 * k) * U;
          ctx.fillRect(a.x - r, a.y - 0.6, r * 2, 1.2);
          ctx.fillRect(a.x - 0.6, a.y - r * 0.6, 1.2, r * 1.2);
        }
      } else if (kind === 'fireflies') {
        ctx.globalCompositeOperation = 'lighter';
        const g = tinted('#c6f36b');
        for (const a of amb) {
          const k = 0.35 + 0.65 * Math.max(0, Math.sin(a.p * 1.7 + a.s * 3));
          ctx.globalAlpha = k * 0.75;
          const s = 18 * U;
          ctx.drawImage(g, a.x - s / 2, a.y - s / 2, s, s);
          ctx.fillStyle = '#f4ffd0';
          ctx.fillRect(a.x - U, a.y - U, 2 * U, 2 * U);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    function dsprScreen(c, x, y, k, rot) {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(c, -c._ox * k, -c._oy * k, c._w * k, c._h * k);
      ctx.restore();
    }
    function drawBulbs(sc, dim) {
      if (!sc.bulbs) return;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of sc.bulbs) {
        const on = (1 - dim) * (0.75 + 0.25 * Math.sin(rtime * 3 + b.p));
        if (on > 0.02) {
          const g = tinted(b.c), s = 46 * U;
          ctx.globalAlpha = on * 0.55;
          ctx.drawImage(g, b.x - s / 2, b.y - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      for (const b of sc.bulbs) {
        ctx.fillStyle = dim > 0.5 ? '#3a3a44' : b.c;
        ell(ctx, b.x, b.y, 3.6 * U, 4.6 * U);
        ctx.fill();
        if (dim < 0.5) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(b.x - 1.2 * U, b.y - 2.6 * U, 1.4 * U, 2 * U); }
      }
    }

    // ---------------------------------------------------------------- jeu (repère de l'aire de jeu)
    function drawFly(f) {
      const arr = SPRITES.fly[f.type];
      if (!arr) return;
      const sp = arr[Math.floor(gT * 34 + f.ph) % FRAMES];
      const k = f.head ? 1.16 : 1;
      let rot = f.ang || 0;
      if (f.warn > 0) rot += Math.sin(gT * 50) * 0.25;
      ctx.save();
      ctx.translate(f.x, f.y);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(sp, -sp._ox * k, -sp._oy * k, sp._w * k, sp._h * k);
      if (f.hitT > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(sp, -sp._ox * k, -sp._oy * k, sp._w * k, sp._h * k);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      if (!f.head && f.type !== 'moth') {
        const e = EYE[f.type], s = TYPES[f.type].s * k;
        let dx = player.x - f.x, dy = PY - 30 - f.y;
        const L = Math.hypot(dx, dy) || 1;
        dx /= L; dy /= L;
        const ca = Math.cos(-rot), sa = Math.sin(-rot), lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
        const r = e[2] * s, off = r * 0.42, ps = (r * 0.62) / 3.2, pu = SPRITES.pupil;
        for (let sx = -1; sx <= 1; sx += 2) ctx.drawImage(pu, sx * e[0] * s + lx * off - pu._ox * ps, e[1] * s + ly * off - pu._oy * ps, pu._w * ps, pu._h * ps);
        if (f.mode === 'dive' && f.type !== 'wasp') {
          ctx.strokeStyle = '#120e0b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let sx = -1; sx <= 1; sx += 2) { ctx.moveTo(sx * (e[0] * s + r * 0.95), e[1] * s - r * 1.22); ctx.lineTo(sx * (e[0] * s - r * 0.55), e[1] * s - r * 0.7); }
          ctx.stroke();
        }
      }
      ctx.restore();
      if (f.head) drawHead(ctx, f.head.img, f.x, f.y + 5, 36, Math.sin(gT * 3 + (f.c || 0)) * 0.08, false);
      if (f.warn > 0) bigFieldText('!', f.x, f.y - 22, 16, '#ff4d5e');
    }
    function bigFieldText(text, x, y, size, col) {
      const cv = textSprite(text, size * U, col, false), k = 1 / U;
      ctx.drawImage(cv, x - (cv._w * k) / 2, y - cv._cy * k, cv._w * k, cv._h * k);
    }
    function drawCorpses() {
      for (const c of corpses) {
        const a = c.rest ? clamp(1 - c.rest / 0.9, 0, 1) : 1;
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        if (c.type === 'bee') {
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang); ctx.scale(1, -1);
          const b = SPRITES.bee;
          ctx.drawImage(b, -b._ox, -b._oy, b._w, b._h);
          ctx.restore();
        } else {
          const sp = SPRITES.dead[c.type];
          if (sp) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.ang);
            ctx.scale(1, c.bounced ? -0.85 : -1);
            ctx.drawImage(sp, -sp._ox, -sp._oy, sp._w, sp._h);
            ctx.restore();
          }
          if (c.bounced) { const ko = SPRITES.ko; ctx.save(); ctx.translate(c.x, c.y - 12); ctx.rotate(rtime * 4); ctx.drawImage(ko, -ko._ox * 0.8, -ko._oy * 0.8, ko._w * 0.8, ko._h * 0.8); ctx.restore(); }
        }
      }
      ctx.globalAlpha = 1;
    }
    function drawShields() {
      for (const sh of shields) {
        if (sh.dirty) refreshShield(sh);
        if (!sh.cv) continue;
        if (sh.gone) {
          if (sh.gone > 2) continue;
          ctx.save();
          ctx.translate(sh.gx + SW / 2, sh.gy + SH / 2);
          ctx.rotate(sh.ang);
          ctx.drawImage(sh.cv, -SW / 2, -SH / 2, SW, SH);
          ctx.restore();
          continue;
        }
        let y = sh.y;
        if (sh.drop > 0) { const k = clamp(1 - sh.drop / 0.55, 0, 1); y = sh.y - (1 - easeBack(k)) * 120; if (k <= 0) continue; }
        ctx.drawImage(sh.cv, sh.x, y, SW, SH);
      }
    }
    function drawBossWarnings() {
      const b = boss;
      if (!b) return;
      if (b.kind === 'frelon') {
        for (const c of b.cols) {
          const warn = c.t < 1.1;
          const a = warn ? 0.18 + 0.16 * Math.sin(c.t * 30) : 0.16 * clamp((3.5 - c.t) / 0.6, 0, 1);
          ctx.fillStyle = warn ? 'rgba(255,77,94,' + a.toFixed(3) + ')' : 'rgba(255,211,77,' + a.toFixed(3) + ')';
          ctx.fillRect(c.x - 22, 0, 44, PY);
          if (warn) { ctx.fillStyle = 'rgba(255,77,94,0.75)'; ctx.fillRect(c.x - 22, 0, 2, PY); ctx.fillRect(c.x + 20, 0, 2, PY); }
        }
      } else if (b.kind === 'taon' && b.mode === 'windup') {
        ctx.fillStyle = 'rgba(255,77,94,' + (0.12 + 0.12 * Math.sin(b.t * 30)).toFixed(3) + ')';
        ctx.fillRect(b.aimX - 60, b.y, 120, PY - b.y);
      } else if (b.kind === 'moustique' && b.mode === 'aim' && state === 'play') {
        ctx.strokeStyle = 'rgba(255,77,94,0.5)';
        ctx.setLineDash([5, 7]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 112);
        ctx.lineTo(b.aimX, PY - 20);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    const FACE_Y = { reine: 50, taon: 50, frelon: 50, moustique: 48, sphinx: 50 };
    function drawBoss() {
      const b = boss, S = bossSpr;
      if (!S) return;
      const B = BOSSES[b.kind];
      const img = S.fr[Math.floor(gT * 22) % S.fr.length];
      let jx = 0;
      if (b.hitT > 0) jx = (Math.random() * 2 - 1) * 2;
      ctx.save();
      ctx.translate(b.x + jx, b.y);
      if (b.angry || state === 'bossdeath') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(gT * 10);
        const g = tinted('#ff4d5e'), s = B.sz * 1.3;
        ctx.drawImage(g, -s / 2, -s / 2, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (b.kind === 'sphinx' && darkK > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.4 * darkK;
        const g = tinted('#7af0ff'), s = 44;
        for (const sx of [-1, 1]) ctx.drawImage(g, sx * 64 - s / 2, -27 - s / 2, s, s);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      const flip = b.kind === 'bourdon' && b.dir < 0;
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(img, -img._ox, -img._oy, img._w, img._h);
      if (b.hitT > 0 && ((rtime * 30) | 0) % 2 === 0) { ctx.globalAlpha = 0.6; ctx.drawImage(S.white, -img._ox, -img._oy, img._w, img._h); ctx.globalAlpha = 1; }
      const pu = SPRITES.pupil;
      if (b.kind === 'bourdon') {
        const ex = 15.4 * BSCALE.bourdon, ey = 0.2 * BSCALE.bourdon, ps = 3.7;
        const dx = (player.x - b.x) * (flip ? -1 : 1), dy = PY - b.y;
        const L = Math.hypot(dx, dy) || 1;
        if (!b.head) ctx.drawImage(pu, ex + (dx / L) * 6.5 - pu._ox * ps, ey + (dy / L) * 8 - pu._oy * ps, pu._w * ps, pu._h * ps);
        if (flip) ctx.scale(-1, 1);
        if (b.head) drawHead(ctx, b.head.img, (flip ? -1 : 1) * 60, 12, 88, Math.sin(gT * 5) * 0.1, true);
      } else if (b.head) {
        const fy = FACE_Y[b.kind] || 48, hh = 96;
        drawHead(ctx, b.head.img, 0, fy + 4, hh, Math.sin(gT * 2.2) * 0.07, true);
        if (b.kind === 'reine') crown(ctx, 0, fy - hh * 0.38, 56);
        if (b.kind === 'taon') {
          ctx.fillStyle = lin(ctx, -28, 0, 28, 0, [0, '#a5141f', 0.35, '#ff5b5b', 0.7, '#e8262f', 1, '#7a0a12']);
          ctx.beginPath();
          ctx.ellipse(0, fy - hh * 0.28, 44, 27, 0, Math.PI, TAU);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-13, fy - hh * 0.28 - 24); ctx.lineTo(-13, fy - hh * 0.28); ctx.moveTo(13, fy - hh * 0.28 - 24); ctx.lineTo(13, fy - hh * 0.28); ctx.stroke();
        }
      } else {
        const e = bossEye(b.kind);
        if (e) {
          let dx = player.x - b.x, dy = PY - 30 - b.y;
          const L = Math.hypot(dx, dy) || 1;
          dx /= L; dy /= L;
          const r = e[2], ps = (r * 0.6) / 3.2;
          for (let sx = -1; sx <= 1; sx += 2) ctx.drawImage(pu, sx * e[0] + dx * r * 0.4 - pu._ox * ps, e[1] + dy * r * 0.4 - pu._oy * ps, pu._w * ps, pu._h * ps);
        }
      }
      ctx.restore();
    }
    function drawBossDead() {
      if (!bossDeath || !bossSpr || !bossDeath.final) return;
      const d = bossDeath;
      ctx.save();
      ctx.translate(d.cx, d.cy);
      ctx.rotate(d.ang);
      ctx.scale(1, -1);
      const img = bossSpr.dead;
      ctx.drawImage(img, -img._ox, -img._oy, img._w, img._h);
      ctx.restore();
    }
    function drawPlayer() {
      const c = SPRITES.can;
      if (player.alive) {
        ctx.save();
        ctx.translate(player.x, PY);
        if (pw.t > 0 && pw.kind) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = pw.t < 2 && Math.floor(gT * 8) % 2 ? 0.12 : 0.4 + 0.12 * Math.sin(gT * 8);
          const g = tinted(CAPS[pw.kind].col), s = 90;
          ctx.drawImage(g, -s / 2, -30 - s / 2, s, s);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.rotate(player.tilt * 0.12);
        const sq = 1 - player.recoil * 0.05;
        ctx.scale(1 + player.recoil * 0.03, sq);
        ctx.drawImage(c, -c._ox, -c._oy, c._w, c._h);
        if (player.flash > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = clamp(player.flash / 0.08, 0, 1) * 0.8;
          const g = tinted(pwOn('pierce') ? '#ffd34d' : '#ff8fca'), s = 26;
          ctx.drawImage(g, -s / 2, -60 - s / 2, s, s);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
      } else if (player.dead && !player.dead.boom) {
        const d = player.dead;
        ctx.save();
        ctx.translate(d.x, d.y + 26);
        ctx.rotate(d.ang);
        ctx.drawImage(c, -c._ox, -c._oy + 26, c._w, c._h);
        ctx.restore();
      }
    }
    function drawShots() {
      const tail = softOf('#ff8fd0'), tailG = softOf('#ffd34d');
      for (const s of shots) {
        const sp = s.pierce ? SPRITES.puffG : SPRITES.puff;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(s.pierce ? tailG : tail, s.x - 5, s.y + 2, 10, 30);
        ctx.globalAlpha = 0.45;
        ctx.drawImage(sp, s.x - 6, s.y + 14, 12, 12);
        ctx.globalAlpha = 1;
        const w = 24 + Math.sin(s.t * 30) * 1.5;
        ctx.drawImage(sp, s.x - w / 2, s.y - w / 2, w, w);
      }
    }
    function drawDrops() {
      for (const d of drops) {
        const sp = SPRITES.drop[d.k];
        if (!sp) continue;
        if (d.k === 'dard' || d.k === 'aiguille') {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(Math.atan2(-(d.vx + windV * 0), d.vy));
          ctx.drawImage(sp, -sp._ox, -sp._oy, sp._w, sp._h);
          ctx.restore();
        } else if (d.k === 'ecaille') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5;
          const g = tinted('#7af0ff');
          ctx.drawImage(g, d.x - 11, d.y - 11, 22, 22);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(sp, d.x - sp._ox, d.y - sp._oy, sp._w, sp._h);
        } else ctx.drawImage(sp, d.x + Math.sin(d.ph) * 0.6 - sp._ox, d.y - sp._oy, sp._w, sp._h);
      }
    }
    function drawCaps() {
      for (const c of caps) {
        const sp = SPRITES.cap[c.kind], s = 1 + Math.sin(c.t * 5) * 0.05;
        ctx.drawImage(sp, c.x - sp._ox * s, c.y - sp._oy * s, sp._w * s, sp._h * s);
      }
    }
    function drawBee() {
      if (!bee) return;
      const b = Math.floor(gT * 30) % 2 ? SPRITES.bee : SPRITES.bee2;
      ctx.save();
      ctx.translate(bee.x, bee.y);
      ctx.scale(bee.dir, 1);
      ctx.drawImage(b, -b._ox, -b._oy, b._w, b._h);
      ctx.restore();
      if (bee.head) drawHead(ctx, bee.head.img, bee.x + bee.dir * 15, bee.y - 1, 32, Math.sin(gT * 6) * 0.12, true);
    }
    function drawParticles() {
      for (const p of parts) {
        const a = clamp(p.life / p.max, 0, 1);
        if (p.k === 'dot') {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        } else if (p.k === 'puff') {
          ctx.globalAlpha = a * 0.85;
          const g = softOf(p.col), s = p.r * 2 * (1.6 - a * 0.6);
          ctx.drawImage(g, p.x - s, p.y - s, s * 2, s * 2);
        } else if (p.k === 'petal' || p.k === 'leaf') {
          ctx.globalAlpha = Math.min(1, a * 2);
          const sp = p.k === 'petal' ? SPRITES.petal : SPRITES.leaf;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.drawImage(sp, -sp._ox, -sp._oy, sp._w, sp._h); ctx.restore();
        } else if (p.k === 'helmet') {
          ctx.globalAlpha = a;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
          ctx.fillStyle = '#e8262f';
          ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, Math.PI, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -6, 1.5, 6); ctx.fillRect(2, -6, 1.5, 6);
          ctx.restore();
        } else if (p.k === 'star') {
          ctx.globalAlpha = a;
          const sp = SPRITES.star;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.drawImage(sp, -sp._ox, -sp._oy, sp._w, sp._h); ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      for (const r of rings) {
        const k = 1 - r.life / r.max;
        ctx.strokeStyle = r.col;
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.lineWidth = r.w * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * easeOut(k), 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const f of faces) {
        const k = f.life / f.max, pp = k > 0.9 ? 1 + (k - 0.9) * 3 : 1;
        ctx.globalAlpha = clamp(k * 3, 0, 1);
        drawHead(ctx, f.img, f.x, f.y, f.h * pp, Math.sin(f.life * 9) * 0.06, true);
      }
      ctx.globalAlpha = 1;
    }
    function drawSwat() {
      if (!swat) return;
      const s = swat, t = s.t, sp = SPRITES.swat;
      let sc = 1, al = 1, th = -0.6, ox = 0, oy = 0;
      if (t < 0.24) { const k = t / 0.24, e = k * k; sc = lerp(1.9, 1, e); al = lerp(0.25, 1, k); th = lerp(-1.15, -0.6, e); ox = (1 - e) * 120; oy = -(1 - e) * 90; }
      else if (t < 0.78) { th = -0.6 + Math.sin((t - 0.24) * 30) * 0.02 * (1 - (t - 0.24) / 0.54); }
      else { const k = (t - 0.78) / 0.42; sc = lerp(1, 1.45, k); al = 1 - k; th = lerp(-0.6, -1.0, k); ox = k * 140; oy = -k * 160; }
      ctx.save();
      ctx.globalAlpha = clamp(al, 0, 1);
      ctx.translate(s.x + ox, s.y + oy);
      ctx.rotate(th);
      ctx.scale(sc, sc);
      ctx.save();
      ctx.translate(0, SWAT_HANDLE + SWAT_H / 2 - 8);
      ctx.drawImage(sp, -sp._ox, -sp._oy, sp._w, sp._h);
      ctx.restore();
      if (s.hit) {
        ctx.rotate(0.6);
        for (const q of s.stuck) {
          const d = SPRITES.dead[q.type];
          if (!d) continue;
          ctx.save();
          ctx.translate(q.dx, q.dy);
          ctx.rotate(q.ang);
          ctx.scale(1.35, 0.5);
          ctx.drawImage(d, -d._ox, -d._oy, d._w, d._h);
          ctx.restore();
          if (q.head) drawHead(ctx, sadImg(q.head), q.dx, q.dy, 30, 0, false);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawWind() {
      if (Math.abs(windV) < 6) return;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const dir = Math.sign(windV);
      for (let i = 0; i < 14; i++) {
        const y = 60 + hash(i * 3.7) * (PY - 100), len = 20 + hash(i) * 40, sp = 120 + hash(i * 1.9) * 160;
        const x = (((gT * sp * dir + hash(i * 5.3) * (W + 200)) % (W + 200)) + W + 200) % (W + 200) - 100;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - dir * len * 0.5, y - 3, x - dir * len, y + 1);
      }
      ctx.stroke();
    }
    // nuit : coupure de courant (seules la bombe, les tirs et les yeux brillent)
    let darkCv = null;
    function drawDark() {
      if (darkK <= 0.02) return;
      const k = 0.5;
      const dw = Math.max(1, Math.ceil(cw * k)), dh = Math.max(1, Math.ceil(ch * k));
      if (!darkCv || darkCv.width !== dw || darkCv.height !== dh) darkCv = mkCanvas(dw, dh);
      const c = darkCv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, dw, dh);
      c.fillStyle = 'rgba(2,4,12,' + (0.88 * darkK).toFixed(3) + ')';
      c.fillRect(0, 0, dw, dh);
      c.globalCompositeOperation = 'destination-out';
      const g = SPRITES.glow;
      const hole = (x, y, r) => { const X = toX(x) * k, Y = toY(y) * k, R = r * U * k; c.drawImage(g, X - R, Y - R, R * 2, R * 2); };
      if (player.alive) {
        hole(player.x, PY - 30, 90);
        c.globalAlpha = 0.55;
        c.beginPath();
        const px = toX(player.x) * k, py = toY(PY - 60) * k;
        c.moveTo(px - 10 * U * k, py); c.lineTo(px - 80 * U * k, toY(60) * k); c.lineTo(px + 80 * U * k, toY(60) * k); c.lineTo(px + 10 * U * k, py);
        c.fill();
        c.globalAlpha = 1;
      }
      for (const s of shots) hole(s.x, s.y, 30);
      for (const r of rings) hole(r.x, r.y, 46);
      for (const sh of shields) if (shieldKind === 'lantern' && !sh.gone) hole(sh.x + SW / 2, sh.y + SH / 2, 46);
      c.globalCompositeOperation = 'source-over';
      S0();
      ctx.drawImage(darkCv, 0, 0, cw, ch);
      // dans le noir : on ne voit que leurs yeux !
      SF();
      ctx.globalCompositeOperation = 'lighter';
      const eg = tinted('#fff4b0');
      ctx.globalAlpha = 0.7 * darkK;
      for (const f of flies) {
        if (!f.alive) continue;
        const e = EYE[f.type], s = TYPES[f.type].s, ca = Math.cos(f.ang || 0), sa = Math.sin(f.ang || 0);
        for (let sx = -1; sx <= 1; sx += 2) {
          const lx = sx * e[0] * s, ly = e[1] * s;
          const x = f.x + lx * ca - ly * sa, y = f.y + lx * sa + ly * ca;
          ctx.drawImage(eg, x - 6, y - 6, 12, 12);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---------------------------------------------------------------- HUD (repère écran)
    function pill(x, y, w, h, col) {
      ctx.fillStyle = 'rgba(8,12,24,0.66)';
      rrect(ctx, x, y, w, h, h / 2);
      ctx.fill();
      ctx.strokeStyle = col || 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    function drawHUD() {
      const x0 = wide ? FX : 0, x1 = wide ? FX + FW : cw, wd = x1 - x0;
      const Wd = WORLDS[state === 'trans' && trans && trans.t > 1.1 ? trans.to : worldIdx];
      const g = ctx.createLinearGradient(0, 0, 0, 74);
      g.addColorStop(0, 'rgba(6,10,22,0.62)');
      g.addColorStop(1, 'rgba(6,10,22,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, wd, 74);
      // score
      const sx = x0 + 10;
      ctx.font = '19px ' + FD;
      const scoreW = Math.max(84, ctx.measureText(fmt(dispScore)).width + 26);
      pill(sx - 2, 5, scoreW, 40, 'rgba(255,255,255,0.16)');
      smallText('SCORE', sx + 12, 15, 10, 'rgba(210,228,240,0.9)', 'left', '700');
      const sc = 1 + scorePulse * 0.1;
      ctx.save();
      ctx.translate(sx + 12, 33);
      ctx.scale(sc, sc);
      ctx.font = '19px ' + FD;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(10,6,18,0.9)';
      ctx.strokeText(fmt(dispScore), 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(fmt(dispScore), 0, 0);
      ctx.restore();
      if (COMPET) {
        ctx.font = '700 9px ' + FB;
        const bw = ctx.measureText('COMPÉTITION').width + 12, bx = sx;
        ctx.fillStyle = 'rgba(60,34,6,0.92)';
        rrect(ctx, bx, 49, bw, 14, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,166,48,0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ffd34d';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('COMPÉTITION', bx + 6, 56.5);
      }
      // centre : monde, vague, avancée dans le monde
      const cW = Math.min(172, wd - scoreW - (wide ? 40 : 120));
      const cx = clamp(x0 + wd / 2 + (wide ? 0 : -6), sx + scoreW + 6 + cW / 2, x1 - (wide ? 60 : 104) - cW / 2);
      pill(cx - cW / 2, 3, cW, 50, rgba(Wd.acc, 0.4));
      const nextW = state === 'trans' && trans && trans.t > 1.1;
      ctx.font = '700 10px ' + FB;
      const wname = Wd.name.toUpperCase() + (meta.cyc ? ' · JOUR ' + (meta.cyc + 1) : '');
      smallText(wname, cx, 11, ctx.measureText(wname).width > cW - 14 ? 8.5 : 10, Wd.acc, 'center', '700');
      bigText(nextW ? 'VAGUE ' + (wave + 1) : meta.kind === 'boss' ? 'BOSS' : 'VAGUE ' + wave, cx, 29, 17, !nextW && meta.kind === 'boss' ? '#ff6b7a' : '#ffffff', cW - 16, 1, 1, false);
      for (let i = 0; i < PER_WORLD; i++) {
        const px = cx + (i - 1) * 16, py = 45, done = i < meta.st || (i === meta.st && (state === 'clear' || state === 'bossdeath' || state === 'trans'));
        const cur = i === meta.st;
        if (i === PER_WORLD - 1) {
          ctx.fillStyle = done ? '#ff4d5e' : cur ? '#ff4d5e' : 'rgba(255,255,255,0.22)';
          ctx.beginPath();
          ctx.moveTo(px - 5, py + 3); ctx.lineTo(px - 5, py - 2); ctx.lineTo(px - 2.5, py); ctx.lineTo(px, py - 4.5); ctx.lineTo(px + 2.5, py); ctx.lineTo(px + 5, py - 2); ctx.lineTo(px + 5, py + 3);
          ctx.closePath();
          ctx.fill();
          if (cur) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); }
        } else {
          ctx.fillStyle = done ? Wd.acc : cur ? '#ffffff' : 'rgba(255,255,255,0.22)';
          circ(ctx, px, py, cur ? 4 : 3.2);
          ctx.fill();
        }
      }
      // droite : combo + bonus en cours (à gauche du bouton pause)
      let rx = x1 - (wide ? 14 : 58);
      const m = mult();
      if (chain >= 2 && state === 'play') {
        const r = 17 * (1 + multPop * 0.25);
        ctx.fillStyle = 'rgba(8,12,24,0.7)';
        circ(ctx, rx - 17, 25, 19);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = MULTCOL[m];
        ctx.beginPath();
        ctx.arc(rx - 17, 25, 19, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(chainT / CHAIN_WIN, 0, 1));
        ctx.stroke();
        bigText('x' + m, rx - 17, 23, r, MULTCOL[m], 34, 1, 1, false);
        smallText(chain + '', rx - 17, 37, 9, '#ffffff', 'center', '700');
        rx -= 44;
      }
      if (pw.t > 0 && pw.kind) {
        const sp = SPRITES.cap[pw.kind], s = 0.95 * 1.0;
        ctx.drawImage(sp, rx - 16 - sp._w * s / 2, 21 - sp._h * s / 2, sp._w * s, sp._h * s);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(rx - 30, 38, 28, 4);
        ctx.fillStyle = CAPS[pw.kind].col;
        ctx.fillRect(rx - 30, 38, 28 * clamp(pw.t / pw.max, 0, 1), 4);
      }
    }
    // sous le HUD : barre de vie du boss, ou ligne d'info (essaim, festin, mistral)
    function drawSubHud() {
      const x0 = wide ? FX : 0, x1 = wide ? FX + FW : cw, cx = (x0 + x1) / 2, y = COMPET ? 70 : 62;
      if (boss && state !== 'over' && state !== 'dying' && state !== 'bossdeath') {
        const B = BOSSES[boss.kind], w = Math.min(x1 - x0 - 24, 340), bx = cx - w / 2;
        const k = clamp(boss.hp / boss.max, 0, 1), a = state === 'intro' ? clamp((stateT - 0.6) * 3, 0, 1) : 1;
        if (a <= 0) return;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(10,8,24,0.78)';
        rrect(ctx, bx - 8, y - 4, w + 16, 30, 12);
        ctx.fill();
        ctx.strokeStyle = boss.angry ? 'rgba(255,77,94,0.9)' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        smallText(boss.head ? 'BOSS ' + headName(boss.head) : B.name, bx, y + 6, 10, boss.angry ? '#ff8f9a' : '#ffe6f2', 'left', '700');
        smallText('MONDE ' + (worldIdx + 1), bx + w, y + 6, 10, '#9fb0bc', 'right', '700');
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        rrect(ctx, bx, y + 14, w, 7, 3.5);
        ctx.fill();
        ctx.fillStyle = lin(ctx, bx, 0, bx + w, 0, [0, '#ff4d5e', 1, '#ff5fae']);
        if (k > 0) { rrect(ctx, bx, y + 14, Math.max(7, w * k), 7, 3.5); ctx.fill(); }
        ctx.fillStyle = 'rgba(10,8,24,0.7)';
        ctx.fillRect(bx + w / 2 - 0.75, y + 14, 1.5, 7);
        ctx.globalAlpha = 1;
        return;
      }
      if (state !== 'play' && state !== 'intro') return;
      let txt = '', col = '#ffe6f2';
      if (swarm) txt = 'ESSAIM · RESTE ' + Math.max(0, swarm.quota - swarm.killed);
      else if (meta.kind === 'feast' && state === 'play') { txt = 'FESTIN · ' + Math.ceil(Math.max(0, feastT)) + ' s'; if (feastT < 4) col = '#ff6b7a'; }
      if (WORLDS[worldIdx].wind && Math.abs(windV) > 10) txt = (txt ? txt + '  ·  ' : '') + 'MISTRAL ' + (windV > 0 ? '→' : '←');
      if (!txt) return;
      ctx.font = '700 11px ' + FB;
      const w = ctx.measureText(txt).width + 22;
      ctx.fillStyle = 'rgba(10,8,24,0.72)';
      rrect(ctx, cx - w / 2, y - 2, w, 20, 10);
      ctx.fill();
      smallText(txt, cx, y + 8, 11, col, 'center', '700');
    }

    // panneaux latéraux (grand écran) : le voyage à gauche, la tapette et les commandes à droite
    function panelBox(x, y, w, h, col) {
      ctx.fillStyle = 'rgba(10,12,28,0.8)';
      rrect(ctx, x, y, w, h, 18);
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    function drawPanels() {
      if (!wide) return;
      const pwid = Math.min(236, FX - 90);
      const lx = 18, rx = cw - 18 - pwid;
      const shownW = state === 'trans' && trans && trans.t > 1.1 ? trans.to : worldIdx;
      const Wd = WORLDS[shownW];
      // gauche : le voyage à travers les mondes
      const rowH = clamp((ch - 150) / NW, 40, 58);
      const lh = 120 + rowH * NW;
      panelBox(lx, 14, pwid, Math.min(ch - 28, lh), Wd.acc);
      bigText('CHASSE AUX', lx + pwid / 2, 40, 18, '#ffffff', pwid - 20, 1, 1, false);
      bigText('MOUCHES', lx + pwid / 2, 64, 25, '#c9a6ff', pwid - 20, 1, 1, true);
      smallText('L’été en Provence · Jour ' + (meta.cyc + 1), lx + pwid / 2, 89, 12, '#d6e2ec', 'center', '600');
      const ix = lx + 30, y0 = 110;
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ix, y0 + rowH / 2); ctx.lineTo(ix, y0 + rowH * (NW - 0.5)); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < NW; i++) {
        const w = WORLDS[i], y = y0 + i * rowH, cur = i === shownW, done = i < shownW || meta.cyc > 0 || (shownW === 0 && state === 'trans');
        if (cur) { ctx.fillStyle = rgba(w.acc, 0.18); rrect(ctx, lx + 8, y + 3, pwid - 16, rowH - 6, 12); ctx.fill(); ctx.strokeStyle = w.acc; ctx.lineWidth = 1.4; ctx.stroke(); }
        const ic = SPRITES.icon[w.id], is = (cur ? 0.95 : 0.78) * Math.min(1, (rowH - 8) / 40);
        ctx.globalAlpha = cur ? 1 : done ? 0.85 : 0.5;
        ctx.drawImage(ic, ix - 20 * is, y + rowH / 2 - 20 * is, 40 * is, 40 * is);
        ctx.font = (cur ? '13px ' : '12px ') + FD;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = cur ? '#ffffff' : '#c8d6e2';
        ctx.fillText(w.name, ix + 26, y + rowH * 0.36, pwid - 76);
        ctx.font = '600 11px ' + FB;
        ctx.fillStyle = cur ? w.acc : '#93a8b8';
        ctx.fillText(w.hour + ' · boss : ' + BOSSES[w.boss].name.toLowerCase(), ix + 26, y + rowH * 0.66, pwid - 64);
        if (done && !cur) { ctx.fillStyle = '#7cff8a'; ctx.font = '13px ' + FD; ctx.fillText('✓', lx + pwid - 24, y + rowH * 0.36); }
        ctx.globalAlpha = 1;
      }
      // droite : tapette, bonus, combo, commandes
      panelBox(rx, 14, pwid, Math.min(ch - 28, 316), Wd.acc);
      const tx = rx + 16, tw = pwid - 32;
      smallText('TAPETTE GÉANTE', tx, 38, 13, '#ff8fca', 'left', '700');
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      rrect(ctx, tx, 52, tw, 12, 6);
      ctx.fill();
      ctx.fillStyle = gauge >= 1 ? (Math.floor(rtime * 4) % 2 ? '#ff5fae' : '#ffd0e8') : '#ff5fae';
      rrect(ctx, tx, 52, Math.max(12, tw * gauge), 12, 6);
      ctx.fill();
      smallText(gauge >= 1 ? 'PRÊTE ! Appuie sur ESPACE' : 'Se remplit en arrosant', tx, 78, 12, gauge >= 1 ? '#ffd34d' : '#b8c8d6', 'left', '600');
      smallText('BONUS', tx, 108, 13, '#5ef0ff', 'left', '700');
      if (pw.t > 0 && pw.kind) {
        const sp = SPRITES.cap[pw.kind];
        ctx.drawImage(sp, tx, 118, 26, 26);
        smallText(CAPS[pw.kind].name, tx + 34, 131, 12, CAPS[pw.kind].col, 'left', '700');
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(tx + 34, 142, tw - 34, 4);
        ctx.fillStyle = CAPS[pw.kind].col;
        ctx.fillRect(tx + 34, 142, (tw - 34) * clamp(pw.t / pw.max, 0, 1), 4);
      } else smallText('Attrape les bulles de savon', tx, 131, 12, '#93a8b8', 'left', '600');
      smallText('COMBO x' + mult() + (bestChain ? '  ·  record ' + bestChain : ''), tx, 170, 13, '#ffd34d', 'left', '700');
      const help = ['← → ou la souris : bouger', 'Le tir est automatique', 'ESPACE : tapette géante', 'P ou Échap : pause'];
      for (let i = 0; i < help.length; i++) smallText(help[i], tx, 208 + i * 24, 13, '#d6e2ec', 'left', '600');
    }

    // ---------------------------------------------------------------- bannières, gros textes, transitions
    function card(cx, cy, w, h, col, a) {
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,10,26,0.88)';
      rrect(ctx, cx - w / 2, cy - h / 2, w, h, 18);
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.35);
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawBanner() {
      if (state !== 'intro' || !banner) return;
      const t = stateT, goT = introDur - 0.55;
      const cx = FX + FW / 2, cy = FY + FH * (banner.boss ? 0.5 : 0.4);
      if (t < goT) {
        const a = Math.min(1, t * 4, (goT - t) * 5);
        const k = easeBack(Math.min(1, t / 0.32));
        const types = banner.types || [];
        const w = Math.min(FW - 16, 372), h = 102 + (banner.sub ? 22 : 0) + (banner.sub2 ? 20 : 0) + types.length * 50;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(k, k);
        ctx.translate(-cx, -cy);
        card(cx, cy, w, h, banner.col, a);
        let y = cy - h / 2 + 22;
        smallText(banner.kick, cx, y, 11, banner.col, 'center', '700', a);
        y += 30;
        bigText(banner.title, cx, y, banner.boss ? 30 : 36, banner.boss ? '#ff6b7a' : '#ffffff', w - 30, a, 1, true);
        y += 34;
        if (banner.sub) { smallText(banner.sub, cx, y, 15, '#ffffff', 'center', '700', a); y += 22; }
        if (banner.sub2) { smallText(banner.sub2, cx, y, 13, '#ffd34d', 'center', '600', a); y += 20; }
        for (const ty of types) {
          const sp = SPRITES.fly[ty][Math.floor(rtime * 20) % FRAMES], s = 1.55;
          ctx.globalAlpha = a;
          ctx.drawImage(sp, cx - w / 2 + 42 - sp._ox * s, y + 16 - sp._oy * s, sp._w * s, sp._h * s);
          ctx.globalAlpha = 1;
          smallText('NOUVEAU : ' + TYPES[ty].name.toUpperCase(), cx - w / 2 + 82, y + 6, 14, banner.col, 'left', '700', a);
          smallText(TYPES[ty].info, cx - w / 2 + 82, y + 26, 13, '#e6eef4', 'left', '600', a);
          y += 50;
        }
        ctx.restore();
      } else {
        const k = (t - goT) / 0.55;
        bigText(wave === 1 && banner.title === 'PRÊT ?' ? 'GO !' : 'GO !', cx, FY + FH * 0.42, 66 * (0.75 + 0.35 * easeOut(k * 2)), '#ffd34d', null, 1 - Math.max(0, k - 0.55) / 0.45, 1, true);
      }
    }
    function drawCallouts() {
      for (const c of callouts) {
        const a = Math.min(1, c.t * 7, (c.life - c.t) * 4);
        const s = c.t < 0.26 ? easeBack(c.t / 0.26) : 1;
        const y = FY + FH * c.y;
        bigText(c.text, FX + FW / 2, y, c.size * Math.min(1, U * 1.05), c.col, FW * 0.94, a, s, true);
        if (c.sub) smallText(c.sub, FX + FW / 2, y + c.size * 0.72, 15, '#ffffff', 'center', '700', a);
      }
    }
    function drawPops() {
      for (const p of pops) {
        const k = p.life / p.max, s = k > 0.85 ? 1 + (k - 0.85) * 2.5 : 1;
        bigText(p.text, toX(p.x) + shX * U, toY(p.y) + shY * U, p.size * U, p.col, null, clamp(k * 1.7, 0, 1), s, false);
      }
    }
    function drawStateTexts() {
      const cx = FX + FW / 2;
      if (state === 'clear') {
        const a = Math.min(1, stateT * 5, (1.75 - stateT) * 4);
        const y = FY + FH * 0.4;
        if (clearKind === 'perfect') bigText('FESTIN PARFAIT !', cx, y, 38 * U, '#ffd34d', FW * 0.92, a, 1, true);
        else if (clearKind === 'feastEnd') bigText('FIN DU FESTIN', cx, y, 36 * U, '#ffd34d', FW * 0.92, a, 1, true);
        else if (clearKind === 'swarm') bigText('ESSAIM DISPERSÉ !', cx, y, 34 * U, '#5ef0ff', FW * 0.92, a, 1, true);
        else { bigText('VAGUE ' + wave, cx, y - 22 * U, 34 * U, '#ffffff', FW * 0.92, a, 1, true); bigText('NETTOYÉE !', cx, y + 18 * U, 38 * U, WORLDS[worldIdx].acc, FW * 0.92, a, 1, true); }
        smallText('Bonus air frais +' + fmt(Math.min(clearBonus, clearBonus * clamp(stateT / 0.8, 0, 1))), cx, y + 58 * U, 16, '#ffd34d', 'center', '700', a);
      } else if (state === 'bossdeath' && bossDeath && bossDeath.final) {
        const t = stateT - 1.3, a = Math.min(1, t * 5);
        const y = FY + FH * 0.36;
        bigText('BOSS VAINCU !', cx, y, 42 * U, '#5ef0ff', FW * 0.94, a, t < 0.25 ? easeBack(t / 0.25) : 1, true);
        smallText('BONUS +' + fmt(bossDeath.bonus), cx, y + 40 * U, 17, '#ffd34d', 'center', '700', a);
        smallText('Monde ' + (worldIdx + 1) + ' libéré : ' + WORLDS[worldIdx].name, cx, y + 64 * U, 14, '#ffffff', 'center', '600', a);
      } else if (state === 'over' || (state === 'dying' && stateT > 1.25)) {
        const a = Math.min(1, (state === 'over' ? 1 : (stateT - 1.25) * 3));
        const y = FY + FH * 0.42;
        bigText('FIN DE PARTIE', cx, y, 36 * U, '#ff6b7a', FW * 0.94, a, 1, true);
        smallText('Vague ' + wave + ' · ' + fmt(score) + ' points', cx, y + 36 * U, 16, '#ffffff', 'center', '700', a);
      }
    }
    // le voyage : l'arrivée dans un nouveau monde
    function drawTransScenes() {
      drawScene(scene, true);
      const ex = transEdge(trans.t);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      for (let y = -10; y <= ch + 24; y += 24) ctx.lineTo(ex + Math.sin(y * 0.02 + rtime * 6) * 26 + Math.sin(y * 0.05 - rtime * 4) * 12, y);
      ctx.lineTo(-10, ch + 24);
      ctx.closePath();
      ctx.clip();
      drawScene(nextScene, true);
      ctx.restore();
      // bande de vent
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const y = hash(i * 2.3) * ch, x = ex - 30 - hash(i * 7.1) * 150 + Math.sin(rtime * 8 + i) * 10, len = 40 + hash(i) * 90;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - len * 0.5, y - 6, x - len, y + 2);
      }
      ctx.stroke();
      const g = ctx.createLinearGradient(ex - 120, 0, ex + 30, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.28)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ex - 120, 0, 150, ch);
    }
    function drawTransTitle() {
      if (!trans) return;
      const t = trans.t;
      if (t < 0.5) return;
      const to = WORLDS[trans.to], nm = trans.nm;
      const a = Math.min(1, (t - 0.5) * 3, (2.75 - t) * 3);
      if (a <= 0) return;
      const cx = FX + FW / 2, cy = FY + FH * 0.36;
      const slide = (1 - easeOut((t - 0.5) / 0.5)) * 60;
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = 'rgba(6,8,20,1)';
      ctx.fillRect(0, cy - 74, cw, 210);
      ctx.globalAlpha = 1;
      smallText('MONDE ' + (trans.to + 1) + (nm.cyc ? ' · JOUR ' + (nm.cyc + 1) : '') + ' · ' + to.when.toUpperCase() + ' · ' + to.hour, cx - slide, cy - 50, 13, to.acc, 'center', '700', a);
      bigText(to.name.toUpperCase(), cx + slide, cy - 8, 44, to.acc, Math.min(cw - 24, 560), a, 1, true);
      smallText(to.news, cx - slide * 0.5, cy + 34, 15, '#ffffff', 'center', '700', a);
      // le voyage : les six mondes sur la route
      const n = NW, gap = Math.min(64, (Math.min(cw, 560) - 40) / (n - 1)), y = cy + 86, x0 = cx - (gap * (n - 1)) / 2;
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + gap * (n - 1), y); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < n; i++) {
        const ic = SPRITES.icon[WORLDS[i].id], cur = i === trans.to, s = cur ? 1.15 + 0.08 * Math.sin(rtime * 6) : 0.78;
        ctx.globalAlpha = a * (cur ? 1 : i < trans.to || nm.cyc > 0 ? 0.85 : 0.4);
        ctx.drawImage(ic, x0 + i * gap - 20 * s, y - 20 * s, 40 * s, 40 * s);
      }
      // la bombe qui avance sur la route
      const kk = easeOut(clamp((t - 0.7) / 0.9, 0, 1));
      const fromI = trans.to === 0 && trans.from === n - 1 ? -0.7 : trans.from;
      const mx = x0 + lerp(fromI, trans.to, kk) * gap;
      const c = SPRITES.can, s = 0.5;
      ctx.globalAlpha = Math.min(a, kk > 0 || fromI >= 0 ? 1 : 0);
      ctx.drawImage(c, mx - c._ox * s, y - 26 - c._oy * s + 30 * s - Math.abs(Math.sin(kk * Math.PI * 3)) * 8, c._w * s, c._h * s);
      ctx.globalAlpha = 1;
    }
    let vignG = null, vignKey = '';
    function drawVignette() {
      const boss = state === 'intro' && meta.kind === 'boss';
      const a = boss ? 0.45 + 0.2 * Math.sin(rtime * 7) : vign * 0.3;
      if (a <= 0.01) return;
      const key = cw + 'x' + ch;
      if (vignKey !== key) {
        vignKey = key;
        vignG = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
        vignG.addColorStop(0, 'rgba(255,40,60,0)');
        vignG.addColorStop(1, 'rgba(255,40,60,0.85)');
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = vignG;
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }
    function drawPause() {
      ctx.fillStyle = 'rgba(6,8,20,0.8)';
      ctx.fillRect(0, 0, cw, ch);
      const cx = cw / 2, y0 = Math.max(110, ch * 0.32);
      bigText('PAUSE', cx, y0, 56, '#b98cff', cw - 30, 1, 1, true);
      const lines = touchUI
        ? ['Glisse le doigt pour bouger la bombe', 'Le tir est automatique', 'Jauge pleine : touche la tapette']
        : ['← → ou la souris : bouger', 'Le tir est automatique', 'ESPACE : tapette géante', 'P ou Échap : pause'];
      lines.forEach((l, i) => smallText(l, cx, y0 + 52 + i * 26, 15, '#e9f0f3', 'center', '600'));
      smallText(touchUI ? 'Touche pour reprendre' : 'Clic ou P pour reprendre', cx, y0 + 64 + lines.length * 26, 17, '#ffd34d', 'center', '700');
    }

    // ---------------------------------------------------------------- image complète
    function render() {
      if (destroyed || !SPRITES || !scene) return;
      shX = shY = 0;
      if (shake > 0.05 && !paused) { shX = (Math.random() * 2 - 1) * shake * 0.55; shY = (Math.random() * 2 - 1) * shake * 0.55; }
      S0();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (state === 'trans' && trans && nextScene) drawTransScenes(); else drawScene(scene, true);
      if (scene.bulbs && state !== 'trans') drawBulbs(scene, darkK);
      if (state !== 'trans') drawAmbient();
      SF();
      if (WORLDS[worldIdx].wind && state !== 'trans') drawWind();
      drawShields();
      if (state === 'play' || state === 'intro') drawBossWarnings();
      drawCorpses();
      for (const f of flies) if (f.alive && !f.head) drawFly(f);
      for (const f of flies) if (f.alive && f.head) drawFly(f);
      drawBee();
      if (boss && !(bossDeath && bossDeath.final)) drawBoss();
      drawBossDead();
      drawDrops();
      drawCaps();
      drawShots();
      drawPlayer();
      drawParticles();
      drawSwat();
      drawDark();
      S0();
      drawPops();
      drawVignette();
      drawHUD();
      drawSubHud();
      drawPanels();
      drawBanner();
      drawStateTexts();
      drawCallouts();
      if (state === 'trans') drawTransTitle();
      if (flash > 0.01) {
        ctx.globalAlpha = Math.min(1, flash);
        ctx.fillStyle = flashCol;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = 1;
      }
      if (state === 'tuto') drawTuto();
      if (paused) drawPause();
    }

    // ---------------------------------------------------------------- tutoriel animé (3 étapes, premier lancement, jamais en compétition)
    let tuto = null;
    if (!COMPET && pref(TUTO_KEY, '0') !== '1') tuto = { step: 0, t: 0 };
    function tutoNext(skip) {
      if (!tuto) return;
      SFX.tick();
      if (skip || tuto.step >= 2) {
        tuto = null;
        setPref(TUTO_KEY, '1');
        state = 'intro';
        stateT = 0;
        SFX.ready();
        return;
      }
      tuto.step++;
      tuto.t = 0;
    }
    function tutoCard() { const w = Math.min(cw - 24, 384), h = Math.min(ch - 24, 460); return { x: cw / 2 - w / 2, y: Math.max(8, ch / 2 - h / 2), w, h }; }
    function tutoSkipRect() { const k = tutoCard(); return { x: k.x + k.w - 106, y: k.y + 9, w: 96, h: 38 }; }
    function drawFinger(x, y, press) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.22 + press * 0.3) + ')';
      circ(ctx, x, y, 20 + press * 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circ(ctx, x, y, 11);
      ctx.fill();
      ctx.strokeStyle = '#ff5fae';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    function keycap(x, y, w, h, label, lit) {
      ctx.fillStyle = lit ? '#ffd34d' : 'rgba(255,255,255,0.14)';
      rrect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = lit ? '#2a1a00' : '#ffffff';
      ctx.font = '14px ' + FD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    }
    function miniSprite(c, x, y, s, rot) {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      ctx.drawImage(c, -c._ox * s, -c._oy * s, c._w * s, c._h * s);
      ctx.restore();
    }
    function drawTuto() {
      ctx.fillStyle = 'rgba(6,8,20,0.74)';
      ctx.fillRect(0, 0, cw, ch);
      const k = tutoCard(), tt = tuto.t, st = tuto.step, acc = '#b98cff';
      ctx.fillStyle = 'rgba(12,12,30,0.96)';
      rrect(ctx, k.x, k.y, k.w, k.h, 20);
      ctx.fill();
      ctx.strokeStyle = rgba(acc, 0.35);
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = acc;
      ctx.lineWidth = 2;
      ctx.stroke();
      const sk = tutoSkipRect();
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      rrect(ctx, sk.x, sk.y, sk.w, sk.h, 19);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px ' + FB;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PASSER ✕', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1);
      ctx.textAlign = 'left';
      ctx.font = '700 12px ' + FB;
      ctx.fillStyle = acc;
      ctx.fillText('COMMENT JOUER · ' + (st + 1) + '/3', k.x + 16, k.y + 28);
      // petite scène
      const sx = k.x + 16, sy = k.y + 56, sw = k.w - 32, shh = Math.min(200, k.h * 0.44);
      ctx.save();
      rrect(ctx, sx, sy, sw, shh, 14);
      ctx.clip();
      ctx.fillStyle = lin(ctx, 0, sy, 0, sy + shh, [0, '#86bff8', 0.65, '#ffd6c2', 1, '#ffe8c8']);
      ctx.fillRect(sx, sy, sw, shh);
      ctx.fillStyle = '#f6f1e4';
      ctx.fillRect(sx, sy + shh - 22, sw, 22);
      ctx.fillStyle = '#2f6fb3';
      ctx.fillRect(sx, sy + shh - 16, sw, 3);
      const sc = Math.min(1.25, shh / 170), baseY = sy + shh - 22, cx = sx + sw / 2;
      const fly = (ty, x, y, ph) => { const arr = SPRITES.fly[ty]; miniSprite(arr[Math.floor(ph) % FRAMES], x, y, sc); };
      let title = '', l1 = '', l2 = '';
      if (st === 0) {
        const cyc = tt % 3.2, canX = cx + Math.sin(cyc / 3.2 * TAU) * sw * 0.32;
        for (let i = 0; i < 5; i++) fly(i % 2 ? 'green' : 'blue', cx + (i - 2) * 44 * sc + Math.sin(tt * 1.2) * 10, sy + 34 * sc, tt * 30 + i);
        for (let i = 0; i < 5; i++) {
          const age = (tt + i * 0.2) % 1, px = cx + Math.sin(((tt + i * 0.2 - age) % 3.2) / 3.2 * TAU) * sw * 0.32;
          const y = baseY - 58 * sc - age * (shh - 60 * sc);
          ctx.globalAlpha = 1 - age * 0.6;
          miniSprite(SPRITES.puff, px, y, sc * 0.9);
        }
        ctx.globalAlpha = 1;
        miniSprite(SPRITES.can, canX, baseY, sc);
        if (touchUI) {
          drawFinger(canX, baseY - shh * 0.42 + 26, 1);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.moveTo(cx - sw * 0.32, baseY - shh * 0.42 + 26); ctx.lineTo(cx + sw * 0.32, baseY - shh * 0.42 + 26); ctx.stroke();
          ctx.setLineDash([]);
          title = 'GLISSE ↔ POUR BOUGER'; l1 = 'Glisse le doigt n’importe où :'; l2 = 'la bombe suit, et tire toute seule !';
        } else {
          const dir = Math.cos(cyc / 3.2 * TAU);
          keycap(cx - 50, sy + shh * 0.45, 44, 32, '←', dir < -0.2);
          keycap(cx + 6, sy + shh * 0.45, 44, 32, '→', dir > 0.2);
          title = '← → OU LA SOURIS'; l1 = 'pour bouger la bombe.'; l2 = 'Le tir est automatique !';
        }
      } else if (st === 1) {
        const cyc = tt % 2.6;
        fly('green', cx - 60 * sc, sy + 30 * sc, tt * 30);
        fly('red', cx + 50 * sc, sy + 34 * sc, tt * 30 + 2);
        const dodge = cyc > 0.9 ? Math.min(1, (cyc - 0.9) * 4) : 0;
        const canX = cx + 50 * sc - dodge * 96 * sc;
        const dy1 = sy + 44 * sc + cyc * (shh * 0.62);
        if (dy1 < baseY - 10) miniSprite(SPRITES.drop.goutte, cx + 50 * sc, dy1, sc * 1.4);
        const rollY = baseY - 70 * sc, dy2 = sy + 44 * sc + ((tt + 1.1) % 2.6) * (shh * 0.62);
        if (shieldArt) ctx.drawImage(shieldArt, cx - 60 * sc - 25 * sc, rollY, 50 * sc, 40 * sc);
        if (dy2 < rollY + 6) miniSprite(SPRITES.drop.goutte, cx - 60 * sc, dy2, sc * 1.4);
        else if (dy2 < rollY + 30) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(ctx, cx - 60 * sc, rollY + 4, 8 * sc); ctx.fill(); }
        miniSprite(SPRITES.can, canX, baseY, sc);
        title = 'ÉVITE LES GOUTTES'; l1 = 'Une seule touche et c’est fini !'; l2 = 'Les objets devant toi te protègent.';
      } else {
        const cyc = tt % 3.4, hit = cyc > 1.55;
        const bx = sx + sw - 46, by = sy + shh - 46;
        if (!hit) for (let i = 0; i < 4; i++) fly(i % 2 ? 'wasp' : 'green', cx - 40 * sc + (i % 2) * 70 * sc - 20 * sc, sy + 40 * sc + ((i / 2) | 0) * 40 * sc, tt * 30 + i);
        miniSprite(SPRITES.can, cx - 40 * sc, baseY, sc);
        const fill = clamp(cyc / 1.1, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        circ(ctx, bx, by, 26);
        ctx.fill();
        ctx.strokeStyle = '#ff5fae';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(bx, by, 26, -Math.PI / 2, -Math.PI / 2 + TAU * fill); ctx.stroke();
        ctx.fillStyle = '#1a1030';
        circ(ctx, bx, by, 21);
        ctx.fill();
        ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.6); ctx.fillStyle = '#b06cff'; rrect(ctx, -7, -14, 14, 15, 3); ctx.fill(); ctx.fillStyle = '#e2a35a'; ctx.fillRect(-1.5, 1, 3, 13); ctx.restore();
        if (cyc > 1.1 && cyc < 1.55) { if (touchUI) drawFinger(bx, by, 1); else keycap(bx - 46, by - 16, 72, 32, 'ESPACE', true); }
        if (cyc > 1.25 && cyc < 2.6) {
          const t2 = cyc - 1.25, e = Math.min(1, t2 / 0.3), sw2 = SPRITES.swat, s2 = sc * 0.42 * lerp(1.7, 1, e * e);
          ctx.save();
          ctx.globalAlpha = Math.min(1, e * 1.5) * (cyc > 2.3 ? (2.6 - cyc) / 0.3 : 1);
          ctx.translate(cx - 10 * sc, sy + 60 * sc);
          ctx.rotate(lerp(-1.1, -0.6, e * e));
          ctx.scale(s2, s2);
          ctx.translate(0, SWAT_HANDLE + SWAT_H / 2 - 8);
          ctx.drawImage(sw2, -sw2._ox, -sw2._oy, sw2._w, sw2._h);
          ctx.restore();
          ctx.globalAlpha = 1;
          if (t2 > 0.3 && t2 < 1.2) bigText('CLAC !', cx, sy + shh * 0.42, 34, '#ff5fae', sw - 20, Math.min(1, (1.2 - t2) * 3), 1, true);
        }
        title = 'TAPETTE GÉANTE'; l1 = touchUI ? 'Jauge pleine ? Touche le bouton :' : 'Jauge pleine ? Appuie sur ESPACE :'; l2 = 'CLAC ! Tout est écrasé !';
      }
      ctx.restore();
      const ty = sy + shh + 30;
      bigText(title, cw / 2, ty, Math.min(26, k.w * 0.068), '#ffd34d', k.w - 24, 1, 1, true);
      smallText(l1, cw / 2, ty + 34, clamp(k.w * 0.042, 13, 16), '#ffffff', 'center', '600');
      smallText(l2, cw / 2, ty + 56, clamp(k.w * 0.042, 13, 16), '#ffffff', 'center', '600');
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === st ? '#ffd34d' : 'rgba(255,255,255,0.3)'; circ(ctx, cw / 2 + (i - 1) * 16, k.y + k.h - 72, 5); ctx.fill(); }
      const bw = Math.min(k.w - 40, 240), bx = cw / 2 - bw / 2, by = k.y + k.h - 56;
      ctx.fillStyle = lin(ctx, 0, by, 0, by + 42, [0, '#d7b8ff', 1, '#9a5cf0']);
      rrect(ctx, bx, by, bw, 42, 21);
      ctx.fill();
      ctx.fillStyle = '#1c0838';
      ctx.font = '15px ' + FD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st < 2 ? 'SUIVANT ›' : 'C’EST PARTI !', cw / 2, by + 22);
    }

    // ---------------------------------------------------------------- mise à jour
    let started = false;
    function announceHeads() {
      let k = 0, low = 0;
      for (const f of flies) if (f.alive && f.slot && f.sy > low) low = f.sy;
      low = Math.min(low + 36, SHY - 40);
      for (const f of flies) {
        if (!f.alive || !f.head || seenNames.has(f.head.name)) continue;
        seenNames.add(f.head.name);
        pop(f.sx, low + k * 22, 'Oh ! C’est ' + headName(f.head) + ' !', '#ffe6f2', 15, 2.2, 6);
        if (++k >= 2) break;
      }
      if (k) SFX.head();
    }
    function raidOn() { return meta.kind === 'form' && (WORLDS[worldIdx].id === 'piscine' || meta.cyc > 0); }
    function update(dt) {
      rtime += dt;
      sndBudget = 8;
      if (shake > 0) shake = Math.max(0, shake - dt * (10 + shake * 2));
      if (flash > 0) flash = Math.max(0, flash - dt * 2.6);
      if (multPop > 0) multPop = Math.max(0, multPop - dt * 3);
      scorePulse = Math.max(0, scorePulse - dt * 3);
      if (dispScore < score) { const d = score - dispScore; dispScore = d < 3 ? score : dispScore + Math.max(1, d * Math.min(1, dt * 9)); scorePulse = Math.min(1, scorePulse + dt * 5); }
      else dispScore = score;
      updateAmbient(dt);
      if (state === 'tuto') { tuto.t += dt; return; }
      if (stopT > 0) { stopT -= dt; updateFx(0, dt); return; }
      let k = 1;
      if (slowT > 0) { slowT -= dt; k = slowT > 0.25 ? slowK : lerp(1, slowK, Math.max(0, slowT) / 0.25); }
      const g = dt * k;
      gT += g;
      updateFx(g, dt);
      updateWorldFx(g);
      if (gauge >= 1 && gaugePulse === 0 && state === 'play') { gaugePulse = 1; SFX.gaugeFull(); pop(player.x, PY - 110, 'TAPETTE PRÊTE !', '#ff8fca', 15, 1.4, 16); }
      if (gauge < 1) gaugePulse = 0;
      switch (state) {
        case 'intro':
          stateT += dt;
          updatePlayer(g);
          updateFlies(g);
          if (boss) {
            boss.enter = Math.max(0, 1 - stateT / Math.max(0.5, introDur - 0.7));
            boss.y = boss.y0 - boss.enter * boss.enter * 340;
            boss.t += g * 0.3;
          }
          if (stateT >= introDur - 0.55 && stateT - dt < introDur - 0.55) SFX.go();
          if (stateT >= introDur) { state = 'play'; stateT = 0; playT = 0; if (boss) boss.enter = 0; announceHeads(); }
          break;
        case 'play': {
          playT += g;
          if (chainT > 0) { chainT -= g; if (chainT <= 0) loseCombo(); }
          if (pw.t > 0) { pw.t -= g; if (pw.t <= 0) { pw.kind = null; tone(500, 0.15, 'triangle', 0.03, 300); } }
          const eg = pwOn('slow') ? g * 0.5 : g;
          updatePlayer(g);
          autoFire(g);
          if (boss) updateBoss(eg);
          if (state === 'play' && swarm) spawnSwarm(eg);
          if (state === 'play') updateFlies(eg);
          if (state === 'play') updateDives(eg);
          if (state === 'play' && raidOn()) { raidT -= eg; if (raidT <= 0) { raidT = meta.cyc > 0 && WORLDS[worldIdx].id !== 'piscine' ? crnd('raid', 10, 14) : crnd('raid', 6, 9.5); spawnRaider(); } }
          if (state === 'play') updateShots(g);
          if (state === 'play') updateDrops(eg);
          if (state === 'play') updateBee(g);
          if (state === 'play') updateCaps(g);
          if (swat) updateSwat(g);
          if (state === 'play' && meta.kind === 'feast') { feastT -= g; if (feastT <= 0) waveClear('feastEnd'); }
          break;
        }
        case 'clear': {
          stateT += dt;
          const nb = waveMeta(wave + 1);
          if (nb.boss && stateT > 0.25 && !(bossSpr && bossSpr.kind === nb.boss)) bossBuildStep(nb.boss);
          updatePlayer(g);
          updateFlies(g);
          updateCaps(g);
          if (swat) updateSwat(g);
          if (stateT >= 1.75) {
            const nm = waveMeta(wave + 1);
            if (nm.wi === worldIdx && nm.cyc === meta.cyc) startWave(wave + 1); else startTrans();
          }
          break;
        }
        case 'bossdeath': {
          stateT += dt;
          updatePlayer(g);
          if (swat) updateSwat(g);
          const d = bossDeath;
          if (!d.final) {
            d.boomT -= dt;
            if (d.boomT <= 0 && boss) {
              d.boomT = 0.12;
              const x = boss.x + rnd(-80, 80), y = boss.y + rnd(-60, 60), B = BOSSES[boss.kind];
              puffs(x, y, 5, [B.cols[0], B.cols[1], '#ffd0e8'], 90, 0.6, 9);
              burst(x, y, 8, ['#ffffff', '#ffd34d', '#ff8fca'], 160, 0.5, 2.4, 60);
              ring(x, y, 4, 54, 0.35, '#ffffff', 3);
              doShake(3);
              SFX.boom();
            }
            if (boss) boss.hitT = 0.05;
            if (stateT >= 1.3 && boss) {
              d.final = true;
              d.cx = boss.x; d.cy = boss.y; d.vx = rnd(-60, 60); d.vy = -240; d.ang = 0; d.va = (Math.random() < 0.5 ? -1 : 1) * 3.5;
              const B = BOSSES[boss.kind];
              puffs(boss.x, boss.y, 14, [B.cols[0], B.cols[1], '#ffffff', '#ff9fd0'], 200, 1.0, 14);
              burst(boss.x, boss.y, 36, [B.cols[0], B.cols[2], '#ffffff', '#ffd34d'], 260, 1.1, 3.2, 120);
              ring(boss.x, boss.y, 10, 230, 0.8, '#ffffff', 6);
              ring(boss.x, boss.y, 6, 140, 0.6, '#ffd34d', 4);
              for (let i = 0; i < 16; i++) addP({ k: 'star', x: boss.x, y: boss.y, vx: rnd(-220, 220), vy: rnd(-260, 40), life: 1.2, max: 1.2, r: 1, col: '#ffd34d', g: 300, a: Math.random() * TAU, va: rnd(-6, 6) });
              flash = 0.7; flashCol = '#ffffff';
              doShake(13);
              SFX.big();
              if (boss.head) { addFace(boss.head, W / 2, 210, 84, 3.2); pop(W / 2, 266, snifText(boss.head), '#cfeaff', 20, 3.0, 5); SFX.sad(); }
              boss = null;
            }
          } else {
            d.vy += 520 * g; d.cx += d.vx * g; d.cy += d.vy * g; d.ang += d.va * g;
          }
          if (stateT >= 3.0) startTrans();
          break;
        }
        case 'trans':
          stateT += dt;
          updatePlayer(g);
          updateTrans(dt);
          if (stateT >= 2.85) { trans = null; startWave(wave + 1); }
          break;
        case 'dying': {
          stateT += dt;
          const d = player.dead;
          if (d && !d.boom) {
            d.t += g;
            d.vy += 900 * g; d.x += d.vx * g; d.y += d.vy * g; d.ang += d.va * g;
            if (d.x < 22 || d.x > W - 22) { d.vx = -d.vx * 0.7; d.x = clamp(d.x, 22, W - 22); }
            if (d.y < 60) { d.y = 60; d.vy = Math.abs(d.vy) * 0.5; }
            if (Math.random() < 0.7) addP({ k: 'puff', x: d.x + rnd(-4, 4), y: d.y + 6, vx: rnd(-40, 40), vy: rnd(-30, 30), life: 0.6, max: 0.6, r: rnd(4, 8), col: Math.random() < 0.5 ? '#ff9fd0' : '#c9a0ff', g: -20 });
            if ((d.y > PY - 30 && d.vy > 0 && d.t > 0.4) || d.t > 1.2) {
              d.boom = true;
              puffs(d.x, d.y, 16, ['#ff5fae', '#c58bff', '#ffd0e8', '#ffffff'], 220, 1.2, 16);
              burst(d.x, d.y, 30, ['#e9f0f3', '#b9c4cc', '#ff8fca'], 260, 1.0, 3, 200);
              ring(d.x, d.y, 8, 160, 0.7, '#ff5fae', 5);
              flash = 0.5; flashCol = '#ffd0e8';
              doShake(12);
              SFX.big();
              pop(d.x, d.y - 30, 'PSCHHHT…', '#ff8fca', 22, 1.4, 20);
            }
          }
          if (stateT >= 2.1 && !overCalled) {
            overCalled = true;
            state = 'over';
            stateT = 0;
            try { if (typeof api.gameOver === 'function') api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ }
          }
          break;
        }
        default:
          stateT += dt;
      }
    }

    // ---------------------------------------------------------------- entrées
    function pause() { if (paused || state === 'over' || state === 'tuto' || destroyed) return; paused = true; keys.left = keys.right = false; drag = null; pauseIcon(true); render(); }
    function resume() { if (!paused) return; paused = false; last = performance.now(); pauseIcon(false); }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      const k = e.key, code = e.code;
      const gameKey = k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' || k === ' ' || code === 'Space';
      if (gameKey && state !== 'over') e.preventDefault();
      if (state === 'tuto') {
        if (k === 'Escape') tutoNext(true);
        else if (k === 'Enter' || k === ' ' || code === 'Space' || k === 'ArrowRight') tutoNext(false);
        return;
      }
      if (k === 'p' || k === 'P' || k === 'Escape' || code === 'KeyP') { if (state === 'over') return; if (paused) resume(); else pause(); return; }
      if (paused) return;
      const lk = typeof k === 'string' ? k.toLowerCase() : '';
      if (k === 'ArrowLeft' || lk === 'a' || lk === 'q' || code === 'KeyA') { keys.left = true; mouseX = -1; }
      else if (k === 'ArrowRight' || lk === 'd' || code === 'KeyD') { keys.right = true; mouseX = -1; }
      else if (k === ' ' || code === 'Space' || lk === 'b' || k === 'Enter') trySwat();
    }
    function onKeyUp(e) {
      if (destroyed) return;
      const k = e.key, code = e.code, lk = typeof k === 'string' ? k.toLowerCase() : '';
      if (k === 'ArrowLeft' || lk === 'a' || lk === 'q' || code === 'KeyA') keys.left = false;
      else if (k === 'ArrowRight' || lk === 'd' || code === 'KeyD') keys.right = false;
    }
    let drag = null;
    function onPDown(e) {
      if (destroyed) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (state === 'tuto') {
        const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, sk = tutoSkipRect();
        tutoNext(x >= sk.x && x <= sk.x + sk.w && y >= sk.y && y <= sk.y + sk.h);
        return;
      }
      if (paused) { e.preventDefault(); resume(); return; }
      if (state === 'over' || state === 'dying') return;
      if (drag && drag.id !== e.pointerId) return;   // un second doigt ne vole pas la bombe au premier
      drag = { id: e.pointerId, x: e.clientX, mouse: e.pointerType === 'mouse' };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    }
    function onPMove(e) {
      if (destroyed) return;
      if (drag && e.pointerId === drag.id) {
        if (paused || state === 'over' || state === 'tuto') return;
        dragDX += ((e.clientX - drag.x) / U) * (drag.mouse ? 1 : 1.25);
        drag.x = e.clientX;
        mouseX = -1;
        return;
      }
      if (e.pointerType === 'mouse' && !paused && state !== 'tuto') {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left - FX) / U;
        mouseX = x > -60 && x < W + 60 ? clamp(x, 18, W - 18) : -1;
      }
    }
    function onPUp(e) { if (drag && e.pointerId === drag.id) drag = null; }
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(window, 'blur', () => { keys.left = keys.right = false; drag = null; });
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) mouseX = -1; });
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(doc, 'visibilitychange', () => { if (doc.hidden) pause(); });
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => {
      e.preventDefault();
      if (state === 'over') return;
      if (state === 'tuto') { tutoNext(true); return; }
      if (paused) resume(); else pause();
    });
    on(swatBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (paused) { resume(); return; } trySwat(); });
    on(swatBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { if (!destroyed) { layout(); if (trans) prepareNextScene(trans.to); } }); ro.observe(root); }
    else on(window, 'resize', () => { if (!destroyed) layout(); });

    // bouton de la tapette : jauge et visibilité (mis à jour seulement quand ça change)
    let shownGauge = -1, shownVis = '', shownReady = null;
    function syncButtons() {
      const vis = state === 'tuto' || state === 'over' || state === 'dying' ? 'none' : 'flex';
      if (vis !== shownVis) { shownVis = vis; swatBtn.style.display = vis; swatLbl.style.display = vis === 'flex' && !touchUI ? 'block' : 'none'; }
      const gv = Math.round(gauge * 50) / 50;
      if (gv !== shownGauge) { shownGauge = gv; swatBtn.style.background = 'conic-gradient(#ff5fae ' + Math.round(gv * 100) + '%, rgba(255,255,255,0.18) 0)'; }
      const ready = gauge >= 1 && state === 'play';
      if (ready !== shownReady) { shownReady = ready; swatBtn.style.animation = ready ? 'jdwMoPulse 0.9s ease-in-out infinite' : 'none'; swatBtn.style.opacity = ready ? '1' : '0.82'; }
    }

    // ---------------------------------------------------------------- boucle (et qualité adaptative)
    let last = performance.now(), perfSum = 0, perfN = 0, renderErr = null;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (!paused) {
        update(dt);
        for (let i = sfxQ.length - 1; i >= 0; i--) { sfxQ[i].t -= dt; if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); } }
        try { render(); } catch (e) { if (!renderErr) { renderErr = e; try { console.error('mouches : ' + (e && e.message)); } catch (e2) { /* rien */ } } }
      }
      syncButtons();
      if (state === 'play' && !doc.hidden && dt > 0) {
        perfSum += dt; perfN++;
        if (perfN >= 150) {
          if (perfSum / perfN > 0.0215 && quality > 0.62) { quality = Math.max(0.6, quality - 0.2); layout(); }
          perfSum = 0; perfN = 0;
        }
      }
      if (state === 'over' && stateT > 4) { cancelAnimationFrame(raf); raf = 0; }
    }

    // ---------------------------------------------------------------- départ
    // départ direct à une vague avancée (compétition) : les insectes des vagues sautées sont déjà connus
    for (let w = 1; w < START; w++) { const m = waveMeta(w); if (m.cyc === 0 && m.kind !== 'boss') for (const ty of m.W.intro[m.st] || []) introduced.add(ty); }
    layout();
    started = true;
    startWave(START);
    // la police d'affichage arrive parfois après le premier dessin : on refait alors les textes pré-rendus
    try { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { if (!destroyed) textCache.clear(); }); } catch (e) { /* rien */ }
    if (tuto) state = 'tuto';
    if (doc.hidden) { paused = true; pauseIcon(true); }
    try { render(); } catch (e) { /* rien */ }
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => wave,                             // vague en cours (musique plus énergique aux vagues difficiles)
      // accès de diagnostic (tests uniquement)
      _debug: {
        info: () => ({ state, wave, world: worldIdx, worldName: WORLDS[worldIdx].name, kind: meta.kind, cyc: meta.cyc, score, paused, tuto: tuto ? tuto.step : null,
          player: { x: player.x, alive: player.alive }, gauge, chain, mult: mult(), godHits, overCalled, fx: parts.length, corpses: corpses.length,
          flies: flies.filter((f) => f.alive).map((f) => ({ x: Math.round(f.x * 10) / 10, y: Math.round(f.y * 10) / 10, vx: f.mode === 'raid' ? f.dir * f.sp : f.vx || 0, vy: f.mode === 'raid' ? 0 : f.vy || 0, hw: TYPES[f.type].hw, type: f.type, mode: f.mode, head: f.head ? f.head.name : null, hp: f.hp, warn: f.warn > 0 })),
          drops: drops.map((d) => ({ x: d.x, y: d.y, vx: d.vx + (HARD[d.k] ? 0 : windV), vy: d.vy, k: d.k, r: d.r, age: gT - (d.born || 0) })),
          boss: boss ? { kind: boss.kind, hp: boss.hp, max: boss.max, x: boss.x, y: boss.y, mode: boss.mode, mt: boss.mt, aimX: boss.aimX, cols: boss.cols.map((c) => ({ x: c.x, t: c.t })) } : null,
          caps: caps.map((c) => ({ x: c.x, y: c.y, kind: c.kind })), bee: bee ? { x: bee.x, y: bee.y } : null, swat: !!swat, darkK, windV, quality,
          layout: { cw, ch, U, FX, FY, FW, FH, wide, touchUI, dpr }, stats, lastHit, godLog: godLog.slice(-400), gT, renderErr: renderErr ? String(renderErr.message) : null }),
        sig: () => JSON.stringify(swarm ? { wave, kind: meta.kind, swarm: [swarm.quota, swarm.pool] } : { wave, kind: meta.kind, shape: form.shape, pat: form.pat, flies: flies.filter((f) => f.slot).map((f) => [f.type, f.r, f.c, f.head ? f.head.name : 0]), boss: boss ? [boss.kind, boss.max, boss.head ? boss.head.name : 0] : 0 }),
        skipTuto: () => { if (state === 'tuto') tutoNext(true); },
        god: (v) => { god = !!v; },
        setX: (x) => { player.x = clamp(x, 18, W - 18); },
        keys: (l, r) => { keys.left = !!l; keys.right = !!r; },
        swat: () => { gauge = 1; return trySwat(); },
        fill: () => { gauge = 1; },
        killAll: () => { for (const f of flies.slice()) if (f.alive && f.mode !== 'flee') { f.hp = 1; damageFly(f, false); } },
        bossHit: (n) => { if (boss) hitBoss(boss.x, boss.y, n || 5); },
        setWave: (n) => { trans = null; bossDeath = null; startWave(Math.max(1, n | 0)); },
        kill: () => { if (state === 'play') hitPlayer('TEST'); },
        dark: (v) => { darkOn = !!v; darkT = 99; },
        quality: (q) => { quality = q; layout(); },
        render: () => render(),
        art: { paintInsect, paintBoss, paintShield, paintCan, paintSwatter, paintWorldIcon, paintCap, paintDrop, paintPuff, paintBee, TYPES, BOSSES, BSCALE, WORLDS, CAP_KINDS, DROP_KINDS }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        mapPlaying = Math.max(0, mapPlaying - 1);
        cancelAnimationFrame(raf);
        raf = 0;
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        listeners.length = 0;
        sfxQ.length = 0;
        parts = []; flies = []; shots = []; drops = []; caps = []; corpses = []; pops = []; rings = []; faces = []; callouts = [];
        boss = null; bee = null; swat = null; scene = null; nextScene = null; SPRITES = null; bossSpr = null;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  // ===========================================================================
  // VIGNETTE ANIMÉE (attract mode) — ne dépend que de t, sprites mis en cache
  // ===========================================================================
  const PV = { key: '', bg: null, fly: null, dead: null, can: null, puff: null, roll: null, pupil: null, k: 1, s: 1 };
  function pvSprite(w, h, ox, oy, k, fn) {
    const cv = mkCanvas(w * k, h * k);
    const g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, ox * k, oy * k);
    try { fn(g); } catch (e) { /* rien */ }
    cv._w = w; cv._h = h; cv._ox = ox; cv._oy = oy;
    return cv;
  }
  function pvInit(w, h, k) {
    const key = Math.round(w) + 'x' + Math.round(h) + '@' + k.toFixed(2);
    if (PV.key === key) return;
    PV.key = key;
    const s = Math.min(w / 300, h / 170) * 0.9;
    PV.s = s;
    const bg = mkCanvas(w * k, h * k);
    const g = bg.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    // fenêtre du matin dans la salle de bain
    const T = 22 * s;
    g.fillStyle = '#f6f1e4';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(47,111,179,0.55)';
    g.lineWidth = 1;
    for (let y = 0; y < h; y += T) for (let x = 0; x < w; x += T) {
      g.fillStyle = '#2f6fb3';
      circ(g, x, y, T * 0.28); g.fill();
      g.fillStyle = '#f6f1e4';
      circ(g, x, y, T * 0.17); g.fill();
      g.fillStyle = '#7fb2e5';
      circ(g, x + T / 2, y + T / 2, T * 0.12); g.fill();
      g.strokeRect(x + 0.5, y + 0.5, T, T);
    }
    const ww = w * 0.62, wh = h * 0.62, wx = w / 2 - ww / 2, wy = h * 0.06, sag = ww * 0.08;
    const p = winPath(wx, wy, ww, wh, sag);
    g.save();
    g.clip(p);
    g.fillStyle = lin(g, 0, wy, 0, wy + wh, [0, '#86bff8', 0.6, '#ffcbb8', 1, '#ffe5c4']);
    g.fillRect(wx, wy - sag, ww, wh + sag);
    sunDisc(g, wx + ww * 0.25, wy + wh * 0.62, 9 * s, '#fff4d6', '#ffb38a', 70 * s);
    hillPath(g, wx - 10, wx + ww + 10, wy + wh * 0.82, 10 * s, 1.3, 0.03 / s, wy + wh + 4);
    g.fillStyle = '#b8a8d8';
    g.fill();
    hillPath(g, wx - 10, wx + ww + 10, wy + wh * 0.92, 7 * s, 4.1, 0.05 / s, wy + wh + 4);
    g.fillStyle = '#8fb388';
    g.fill();
    for (const kk of [0.14, 0.8, 0.88]) cypress(g, wx + ww * kk, wy + wh * 0.95, 20 * s, '#3f6b4c');
    g.restore();
    shutter(g, wx - ww * 0.3 - 4 * s, wy, ww * 0.28, wh, '#3d7fb8', '#244f78', s * 0.6);
    shutter(g, wx + ww + 4 * s, wy, ww * 0.28, wh, '#3d7fb8', '#244f78', s * 0.6);
    windowFrame(g, wx, wy, ww, wh, sag, s * 0.55, '#fbfbf6', true);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = lin(g, 0, wy + wh * 0.3, 0, h, [0, 'rgba(255,217,184,0.16)', 1, 'rgba(255,217,184,0)']);
    g.beginPath(); g.moveTo(wx + ww * 0.1, wy + wh * 0.3); g.lineTo(wx + ww * 0.6, wy + wh * 0.3); g.lineTo(wx + ww * 1.2, h); g.lineTo(wx + ww * 0.45, h); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = lin(g, 0, h - 14 * s, 0, h, [0, '#ffffff', 1, '#c9d2d9']);
    g.fillRect(0, h - 14 * s, w, 14 * s);
    g.fillStyle = '#2f6fb3';
    g.fillRect(0, h - 8 * s, w, 2 * s);
    PV.bg = bg;
    const fs = 0.8 * s;
    PV.fly = {};
    for (const ty of ['blue', 'green', 'gnat', 'wasp', 'mosq']) { PV.fly[ty] = []; for (let i = 0; i < FRAMES; i++) PV.fly[ty].push(pvSprite(SPR * fs, SPR * fs, SPR * fs / 2, SPR * fs / 2, k, (c) => { c.scale(fs, fs); paintInsect(c, ty, (i / FRAMES) * TAU, false); })); }
    PV.dead = pvSprite(SPR * fs, SPR * fs, SPR * fs / 2, SPR * fs / 2, k, (c) => { c.scale(fs, fs); paintInsect(c, 'green', 0, true); });
    PV.can = pvSprite(40 * 0.62 * s, 64 * 0.62 * s, 20 * 0.62 * s, 60 * 0.62 * s, k, (c) => { c.scale(0.62 * s, 0.62 * s); paintCan(c); });
    PV.puff = pvSprite(24 * 0.7 * s, 24 * 0.7 * s, 12 * 0.7 * s, 12 * 0.7 * s, k, (c) => { c.scale(0.7 * s, 0.7 * s); paintPuff(c, false); });
    PV.roll = pvSprite(SW * 0.6 * s, SH * 0.6 * s, 0, 0, k, (c) => { c.scale(0.6 * s, 0.6 * s); paintShield(c, 'roll'); });
    PV.pupil = pvSprite(8 * fs, 8 * fs, 4 * fs, 4 * fs, k, (c) => { c.scale(fs, fs); c.fillStyle = '#120e0b'; circ(c, 0, 0, 3.2); c.fill(); c.fillStyle = '#ffffff'; circ(c, -1.1, -1.2, 1.05); c.fill(); });
  }
  function pvDraw(ctx, c, x, y, rot) {
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(c, -c._ox, -c._oy, c._w, c._h); ctx.restore(); }
    else ctx.drawImage(c, x - c._ox, y - c._oy, c._w, c._h);
  }
  function preview(ctx, w, h, t) {
    try {
      let k = 1;
      try { const m = ctx.getTransform(); k = Math.max(1, Math.min(3, Math.abs(m.a) || 1)); } catch (e) { k = 2; }
      pvInit(w, h, k);
      ctx.save();
      ctx.drawImage(PV.bg, 0, 0, w, h);
      const s = PV.s, fs = 0.8 * s;
      const canX = (tt) => w / 2 + Math.sin(tt * 1.1) * w * 0.3;
      const baseY = h - 14 * s;
      // formation en V qui ondule
      const types = ['wasp', 'blue', 'green'], cols = 7, sp = 30 * s;
      const sway = Math.sin(t * 0.9) * 26 * s;
      const x0 = w / 2 - ((cols - 1) * sp) / 2 + sway;
      const cyc = t % 3.2, victimGone = cyc > 1.2;
      for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) {
        if (Math.abs(c - 3) < r) continue;
        if (r === 1 && c === 2 && victimGone) continue;
        const fx = x0 + c * sp, fy = (34 + r * 23) * s + Math.sin(t * 3 + c * 0.8 + r) * 2.5 * s;
        const arr = PV.fly[types[r]];
        pvDraw(ctx, arr[Math.floor(t * 30 + c * 1.3 + r * 2) % FRAMES], fx, fy, 0);
        const e = EYE[types[r]], ts = TYPES[types[r]].s * fs;
        const cx = canX(t), dx = cx - fx, dy = baseY - fy, L = Math.hypot(dx, dy) || 1;
        for (let sx = -1; sx <= 1; sx += 2) pvDraw(ctx, PV.pupil, fx + sx * e[0] * ts + (dx / L) * e[2] * ts * 0.4, fy + e[1] * ts + (dy / L) * e[2] * ts * 0.4, 0);
      }
      // une mouche arrosée qui tombe les pattes en l'air
      if (victimGone) {
        const k2 = (cyc - 1.2) / 2, vx = x0 + 2 * sp, vy = 57 * s;
        const y = vy + k2 * k2 * (baseY - vy) * 1.3 - Math.sin(k2 * Math.PI) * 20 * s;
        if (y < baseY) { ctx.save(); ctx.translate(vx + k2 * 30 * s, y); ctx.rotate(k2 * 9); ctx.scale(1, -1); ctx.drawImage(PV.dead, -PV.dead._ox, -PV.dead._oy, PV.dead._w, PV.dead._h); ctx.restore(); }
        if (cyc < 1.6) {
          const a = 1 - (cyc - 1.2) / 0.4;
          ctx.globalAlpha = a;
          ctx.fillStyle = '#ff9fd0';
          for (let i = 0; i < 6; i++) { const an = i * 1.05; circ(ctx, vx + Math.cos(an) * (cyc - 1.2) * 60 * s, vy + Math.sin(an) * (cyc - 1.2) * 60 * s, 4 * s * a + 1); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
      }
      // rouleaux
      for (let i = 0; i < 3; i++) ctx.drawImage(PV.roll, w * (i + 1) / 4 - PV.roll._w / 2, h - 56 * s, PV.roll._w, PV.roll._h);
      // jets de lavande + la bombe
      const period = 0.36, n = Math.floor(t / period);
      for (let i = 0; i < 7; i++) {
        const ts = (n - i) * period, age = t - ts;
        if (age < 0) continue;
        const y = baseY - 36 * s - age * 220 * s;
        if (y < 6 * s) continue;
        pvDraw(ctx, PV.puff, canX(ts), y, 0);
      }
      pvDraw(ctx, PV.can, canX(t), baseY, Math.cos(t * 1.1) * 0.08);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // CARTE D'AVANCEMENT (bibliothèque, shell2.js : MAP_DEFS.mouches, thème « mouches ») — une journée d'été en Provence,
  // de bas en haut : la maison et ses pièces le matin (salle de bain, cuisine), puis dehors (la terrasse à midi, la lavande
  // l'après-midi, la piscine au coucher du soleil, la nuit étoilée et ses lampions) ; le jour 2 repart au petit matin.
  // Chaque monde est peint avec son VRAI décor (paintScene, à la taille de sa bande sur la carte) ; une vague = un médaillon
  // du monde et l'insecte qu'on y rencontre ; un boss = l'étape « BOSS » avec son vrai dessin.
  // L (mise en page de la bibliothèque) : nodes [{ lv, x, y, info: { w, cycle, stage, tier }, boss? }], tiers [{ t, y, yLo, yHi }], start, H.
  // ===========================================================================
  // la transition vers le monde du palier i : un peu au-dessus du boss du monde d'avant (le bandeau du monde est posé juste dessus)
  function mapSeam(L, i) { if (!i) return L.H; const t = L.tiers[i], gap = t.yLo - t.yHi; return t.yLo - Math.min(96, gap * 0.32); }
  function mapBands(L) {
    const out = [];
    for (let i = 0; i < L.tiers.length; i++) {
      const t = L.tiers[i], w = t.t % NW, ns = L.nodes.filter((n) => n.info.tier === t.t);
      out.push({ i, t, w, cycle: Math.floor(t.t / NW) + 1, ns, bot: mapSeam(L, i), top: i + 1 < L.tiers.length ? mapSeam(L, i + 1) : 0, last: i + 1 >= L.tiers.length });
    }
    return out;
  }
  // fond (sous les décors) : la couleur du monde, pour les bords et le temps que les décors se peignent
  function mapStopsFor(L) {
    const st = [];
    for (const b of mapBands(L)) { const Wd = WORLDS[b.w]; st.push([b.bot - 2, Wd.bg1], [Math.max(b.top + 2, (b.top + b.bot) / 2), Wd.bg0]); }
    st.push([L.H, WORLDS[0].bg1], [0, '#050a1c']);
    return st;
  }
  // le décor d'un monde à la taille de sa bande (le même que dans le jeu : ciel, paysage, murs, fenêtre, étagère), gardé
  const mapScn = new Map();
  function mapScene(wi, w, h, k) {
    const key = wi + '|' + Math.round(w) + 'x' + Math.round(h) + '@' + k.toFixed(2);
    let cv = mapScn.get(key);
    if (cv) return cv;
    if (mapScn.size > 14) mapScn.delete(mapScn.keys().next().value);
    const s = Math.min(w / W, h / H), F = { x: (w - W * s) / 2, y: (h - H * s) / 2, w: W * s, h: H * s, s };
    const out = paintScene(wi, w, h, F, k, []);
    cv = out.sky;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(out.fg, 0, 0);
    g.setTransform(k, 0, 0, k, 0, 0);
    for (const b of out.beams || []) {      // les rayons du matin, posés une fois pour toutes
      g.fillStyle = rgba(b.col, b.a);
      g.beginPath(); g.moveTo(b.pts[0], b.pts[1]); for (let i = 2; i < 8; i += 2) g.lineTo(b.pts[i], b.pts[i + 1]); g.closePath(); g.fill();
    }
    cv._w = w; cv._h = h;
    mapScn.set(key, cv);
    return cv;
  }
  // entre deux mondes : le « plancher » du monde du dessus (poutre, rebord de terre cuite, terre et herbe, margelle, planches,
  // carrelage du matin), avec son ombre sur le ciel du monde d'en dessous ; au jour suivant, l'aube derrière
  function mapSlab(x, MW, to, m, R, dawn) {
    if (dawn) {
      x.fillStyle = lin(x, 0, m - 6, 0, m + 150, [0, 'rgba(255,200,140,0.85)', 0.35, 'rgba(255,150,120,0.45)', 1, 'rgba(120,90,160,0)']);
      x.fillRect(0, m - 6, MW, 156);
      sunDisc(x, MW * 0.5, m + 26, 30, '#fff1c8', '#ffb070', 210, 0.9);
    }
    x.fillStyle = lin(x, 0, m + 14, 0, m + 40, [0, 'rgba(10,12,30,0.4)', 1, 'rgba(10,12,30,0)']);
    x.fillRect(0, m + 14, MW, 26);
    const top = m - 6, hh = 20;
    if (to === 1 || to === 0) {      // poutre de bois (cuisine) ; au matin du jour suivant, le carrelage de la salle de bain
      const c0 = to === 1 ? '#a8723c' : '#2f6fb3', c1 = to === 1 ? '#6b4320' : '#1d4f8f';
      x.fillStyle = lin(x, 0, top, 0, top + hh, [0, c0, 1, c1]); x.fillRect(0, top, MW, hh);
      x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(0, top, MW, 2);
      if (to === 1) { x.fillStyle = 'rgba(40,20,6,0.35)'; for (let X = 30 + R() * 40; X < MW; X += 70 + R() * 60) { x.fillRect(X, top + 3, 1.5, hh - 6); circ(x, X + 10, top + hh / 2, 1.6); x.fill(); } }
      else { x.fillStyle = 'rgba(255,255,255,0.25)'; for (let X = 0; X < MW; X += 22) x.fillRect(X + 1, top + 3, 20, 1.5); x.fillStyle = '#f6f1e4'; x.fillRect(0, top, MW, 3); }
    } else if (to === 2) {      // rebord de la terrasse : pierre claire et terre cuite
      x.fillStyle = lin(x, 0, top, 0, top + hh, [0, '#d98a5a', 1, '#9a4f2a']); x.fillRect(0, top, MW, hh);
      x.fillStyle = 'rgba(80,30,10,0.35)'; for (let X = R() * 30; X < MW; X += 30) x.fillRect(X, top + 6, 1.4, hh - 6);
      x.fillStyle = lin(x, 0, top - 2, 0, top + 6, [0, '#fbf3e2', 1, '#d8c8a8']); x.fillRect(0, top - 2, MW, 8);
    } else if (to === 3) {      // la terre du champ, herbes et brins de lavande
      x.fillStyle = lin(x, 0, top, 0, top + hh, [0, '#8a6a3a', 1, '#5a4024']); x.fillRect(0, top, MW, hh);
      x.fillStyle = 'rgba(40,24,10,0.35)'; for (let i = 0; i < MW / 9; i++) { circ(x, R() * MW, top + 6 + R() * (hh - 8), 1 + R() * 1.6); x.fill(); }
      x.strokeStyle = '#5f8a3a'; x.lineWidth = 1.6; x.lineCap = 'round';
      x.beginPath(); for (let i = 0; i < MW / 6; i++) { const X = R() * MW; x.moveTo(X, top + 2); x.lineTo(X + (R() - 0.5) * 6, top - 5 - R() * 6); } x.stroke();
      x.fillStyle = '#9b7be8'; for (let i = 0; i < MW / 14; i++) { const X = R() * MW; ell(x, X, top - 8 - R() * 5, 1.6, 2.6); x.fill(); }
    } else if (to === 4) {      // margelle blanche de la piscine et sa frise de mosaïque
      x.fillStyle = lin(x, 0, top, 0, top + hh, [0, '#f7f3ea', 1, '#cfc6b6']); x.fillRect(0, top, MW, hh);
      for (let X = 0, i = 0; X < MW; X += 10, i++) { x.fillStyle = i % 2 ? '#2fb9d8' : '#1f7fb8'; x.fillRect(X, top + hh - 7, 10, 5); }
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(0, top, MW, 2);
    } else if (to === 5) {      // planches de la terrasse du soir
      x.fillStyle = lin(x, 0, top, 0, top + hh, [0, '#4a3524', 1, '#24180f']); x.fillRect(0, top, MW, hh);
      x.fillStyle = 'rgba(0,0,0,0.35)'; for (let X = R() * 40; X < MW; X += 46 + R() * 20) x.fillRect(X, top, 1.5, hh);
      x.fillStyle = 'rgba(255,220,160,0.18)'; x.fillRect(0, top, MW, 2);
    }
  }
  function mapPaintChunk(x, L, MW, y0, h) {
    const B = mapBands(L), k = Math.max(1, Math.min(1.6, Math.abs(x.getTransform().a) || 1));
    x.save(); x.translate(0, -y0);
    for (const b of B) {
      if (b.top > y0 + h || b.bot < y0) continue;
      try { x.drawImage(mapScene(b.w, MW, b.bot - b.top, k), 0, b.top, MW, b.bot - b.top); } catch (e) { /* */ }
    }
    for (const b of B) {
      if (!b.i || b.bot - 60 > y0 + h || b.bot + 170 < y0) continue;
      try { mapSlab(x, MW, b.w, b.bot, mulberry32(b.t.t * 977 + 13), b.w === 0); } catch (e) { /* */ }
    }
    x.restore();
  }
  // ---- une vague : le médaillon du monde et l'insecte de la vague ----
  function mapWaveInsect(info) {
    const Wd = WORLDS[info.w], st = info.stage - 1;
    if (info.cycle === 1) return (Wd.intro[st] && Wd.intro[st][0]) || Wd.intro[0][0] || 'gnat';
    const all = WORLDS.slice(0, info.w + 1).flatMap((x) => x.intro.flat());
    return all[(info.lv * 7) % all.length] || 'gnat';
  }
  // une vague : l'insecte qu'on y rencontre, en grand, sur le ciel de son monde (la vague du boss : le médaillon du monde)
  const mapMed = new Map();
  function mapMedImg(key, P, dpr, paint) {
    let cv = mapMed.get(key);
    if (cv) return cv;
    if (mapMed.size > 160) mapMed.delete(mapMed.keys().next().value);
    cv = mkCanvas(P * dpr, P * dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    try { paint(g); } catch (e) { /* */ }
    mapMed.set(key, cv);
    return cv;
  }
  function mapNode(x, info, size, P) {
    const dpr = x.canvas.width / P, key = 'n' + info.w + (info.boss ? 'B' : mapWaveInsect(info)) + '|' + size + '|' + P + '|' + dpr.toFixed(2);
    x.drawImage(mapMedImg(key, P, dpr, (g) => mapNodePaint(g, info, size, P)), 0, 0, P, P);
  }
  function mapNodePaint(x, info, size, P) {
    const Wd = WORLDS[info.w], cx = P / 2, cy = P / 2, r = size / 2;
    x.fillStyle = rad(x, cx, cy, r * 0.7, cx, cy, r + 11, [0, rgba(Wd.acc, 0.5), 1, rgba(Wd.acc, 0)]);
    circ(x, cx, cy, r + 11); x.fill();
    if (info.boss) { x.save(); x.translate(cx, cy); paintWorldIcon(x, Wd.id, r); x.restore(); return; }
    x.fillStyle = rad(x, cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r, [0, mix(Wd.bg1, '#ffffff', 0.45), 0.7, Wd.bg1, 1, Wd.bg0]);
    circ(x, cx, cy, r); x.fill();
    x.save(); circ(x, cx, cy, r - 1); x.clip();
    const ty = mapWaveInsect(info), sc = (r * 2.15) / SPR;
    x.translate(cx, cy - r * 0.1); x.scale(sc, sc); paintInsect(x, ty, 1.1, false);
    x.restore();
    x.lineWidth = r * 0.12; x.strokeStyle = Wd.acc; circ(x, cx, cy, r); x.stroke();
    x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.55)'; circ(x, cx, cy, r - r * 0.12); x.stroke();
  }
  // ---- un boss : son vrai dessin dans un médaillon menaçant (couronne d'or pour le dernier de la journée) ----
  function mapBoss(x, bi, size, P) {
    const dpr = x.canvas.width / P, key = 'b' + bi.bk + (bi.final ? 'F' : '') + '|' + size + '|' + P + '|' + dpr.toFixed(2);
    x.drawImage(mapMedImg(key, P, dpr, (g) => mapBossPaint(g, bi, size, P)), 0, 0, P, P);
  }
  function mapBossPaint(x, bi, size, P) {
    const B = BOSSES[bi.bk] || BOSSES.reine, cx = P / 2, cy = P / 2 + (bi.final ? 3 : 0), r = size / 2;
    x.fillStyle = rad(x, cx, cy, 0, cx, cy, r + 17, [0, bi.final ? 'rgba(255,178,46,0.55)' : 'rgba(255,36,72,0.5)', 1, 'rgba(255,36,72,0)']);
    circ(x, cx, cy, r + 17); x.fill();
    const n = 24;
    for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#14090c' : (bi.final ? '#ffd34d' : '#ff3b55'); x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r + 5, (i / n) * TAU, ((i + 1) / n) * TAU); x.closePath(); x.fill(); }
    x.fillStyle = rad(x, cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r, [0, mix(B.cols[0], '#ffffff', 0.25), 0.55, mix(B.cols[0], '#000000', 0.55), 1, '#0a0410']);
    circ(x, cx, cy, r); x.fill();
    x.save(); circ(x, cx, cy, r - 1.5); x.clip();
    x.translate(cx, cy + r * 0.06); const sc = (r * 2.05) / B.sz; x.scale(sc, sc);
    try { paintBoss(x, bi.bk, 0.8, false); } catch (e) { /* */ }
    x.restore();
    x.strokeStyle = bi.final ? '#ffd34d' : '#ff3b55'; x.lineWidth = 2.4; circ(x, cx, cy, r - 0.5); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.2)'; x.lineWidth = 1; circ(x, cx, cy, r - 4.5); x.stroke();
    if (bi.final) crown(x, cx, cy - r + 2, r * 0.62);
  }
  // les textes de la carte (une vague, un boss, un monde)
  function mapWave(lv) {
    const m = waveMeta(lv), Wd = m.W;
    if (m.kind === 'boss') return { name: 'Le boss !', line: '☠ ' + BOSSES[Wd.boss].title + ' arrive' };
    if (m.cyc === 0) { const t = Wd.intro[m.st] || []; if (t.length) return { name: t.map((k, i) => (i ? TYPES[k].name.replace(/^L/, 'l') : TYPES[k].name)).join(' et '), line: m.st === 0 ? '✦ ' + Wd.news : '' }; }
    return { name: m.kind === 'swarm' ? 'L’essaim' : m.kind === 'feast' ? 'Le festin' : 'En formation', line: '' };
  }
  let mapPlaying = 0;
  function mapWarm(L, k, dpr, sizes) {
    if (!window.requestIdleCallback || !L) return;
    const idle = (f) => requestIdleCallback((dl) => { if (mapPlaying) setTimeout(() => idle(f), 3000); else if (dl.timeRemaining() < 4 && !dl.didTimeout) idle(f); else f(); }, { timeout: 2500 });
    const kk = Math.max(1, Math.min(1.6, k || 1)), jobs = [], seen = new Set();
    for (const b of mapBands(L)) { const key = b.w + '|' + Math.round(b.bot - b.top); if (!seen.has(key)) { seen.add(key); jobs.push(() => rasterNow(mapScene(b.w, L.W, b.bot - b.top, kk))); } }
    const ns = (sizes && sizes.node) || 56, bs = (sizes && sizes.boss) || 64;
    for (const nd of L.nodes) {
      const info = nd.info, P = ns + 24, key = 'n' + info.w + (info.boss ? 'B' : mapWaveInsect(info)) + '|' + ns + '|' + P + '|' + dpr.toFixed(2);
      if (!seen.has(key)) { seen.add(key); jobs.push(() => rasterNow(mapMedImg(key, P, dpr, (g) => mapNodePaint(g, info, ns, P)))); }
      if (nd.boss) { const bi = nd.boss.bi, P2 = bs + 34, key2 = 'b' + bi.bk + (bi.final ? 'F' : '') + '|' + bs + '|' + P2 + '|' + dpr.toFixed(2); if (!seen.has(key2)) { seen.add(key2); jobs.push(() => rasterNow(mapMedImg(key2, P2, dpr, (g) => mapBossPaint(g, bi, bs, P2)))); } }
    }
    const step = () => { const j = jobs.shift(); if (!j) return; try { j(); } catch (e) { /* */ } idle(step); };
    idle(step);
  }
  function rasterNow(cv) { try { const g = (rasterNow.x = rasterNow.x || mkCanvas(1, 1).getContext('2d')); g.clearRect(0, 0, 1, 1); g.drawImage(cv, 0, 0, 1, 1); } catch (e) { /* */ } }
  const mapArt = {
    warm: mapWarm,
    wave: mapWave,
    stops: mapStopsFor,
    paint: mapPaintChunk,
    node: mapNode,
    boss: mapBoss
  };

  // ===========================================================================
  // ENREGISTREMENT (+ le tableau des mondes, lisible par la bibliothèque pour une carte d'avancement)
  // ===========================================================================
  const WORLD_INFO = {
    perWorld: PER_WORLD,                 // vagues par monde (la dernière = le boss du monde)
    word: 'Vague',                       // unité de currentLevel()
    cycleWord: 'Jour',                   // après le 6e monde, le jour suivant recommence (plus coriace)
    list: WORLDS.map((w, i) => ({
      n: i + 1, id: w.id, name: w.name, hour: w.hour, when: w.when, news: w.news,
      colors: { acc: w.acc, acc2: w.acc2, bg0: w.bg0, bg1: w.bg1 },
      levels: [i * PER_WORLD + 1, i * PER_WORLD + 2, i * PER_WORLD + 3],
      boss: { key: w.boss, name: BOSSES[w.boss].name, title: BOSSES[w.boss].title, line: BOSSES[w.boss].line, level: (i + 1) * PER_WORLD },
      enemies: w.intro.flat().map((t) => TYPES[t].name)
    })),
    // vague (1, 2, 3…) → monde, jour, étape ; jamais d'erreur
    at(level) {
      const m = waveMeta(Math.max(1, Math.floor(Number(level)) || 1));
      return { level: m.n, world: m.wi + 1, cycle: m.cyc + 1, stage: m.st + 1, boss: m.kind === 'boss', kind: m.kind, name: m.W.name, bossName: BOSSES[m.W.boss].title };
    },
    // médaillon d'un monde (n = 1..6) centré en (x, y), rayon r — pour une carte d'avancement
    drawIcon(ctx, n, x, y, r) {
      try { const w = WORLDS[(Math.max(1, n | 0) - 1) % NW]; ctx.save(); ctx.translate(x, y); paintWorldIcon(ctx, w.id, r); ctx.restore(); } catch (e) { try { ctx.restore(); } catch (e2) { /* rien */ } }
    }
  };
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['mouches'] = {
    id: 'mouches',
    title: 'Chasse aux mouches',
    tagline: 'Arrose les insectes de la maison de vacances, du matin à la nuit, monde après monde !',
    accent: '#ff5fae',
    scoreLabel: 'points',
    worlds: WORLD_INFO,
    mapArt,                              // la carte d'avancement de la bibliothèque, dessinée par le jeu
    preview,
    mount
  };
})();
