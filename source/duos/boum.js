(() => {
  'use strict';

  // ===========================================================================
  // BOUM ! (id « boum ») — duel de bombes dans une arène quadrillée.
  // Deux joueurs sur le même téléphone, face à face : P0 en bas (à l'endroit),
  // P1 en haut (tout ce qui le concerne est dessiné tourné de 180°).
  // Le terrain est à symétrie centrale parfaite : la case (x, y) et la case
  // (cols-1-x, rows-1-y) sont toujours identiques (même caisse, même bonus caché).
  //
  // Organisation :
  //   1. outils, constantes, PRNG à graine, génération du terrain (pur)
  //   2. simulation pure : newRound(cfg) → état S ; step(S, dt, inputs) ; S.events
  //   2 bis. jeu en ligne : outils purs (bombe posée pour l'invité, explosion reçue, état complet, lissage des positions)
  //   3. peinture (sprites pré-rendus : sol, piliers, caisses, bombes, flammes, bonus, personnages)
  //   4. vignette (preview)
  //   5. mount() : mise en page, entrées multi-touch / clavier, boucle, sons, particules, manches, réseau (api.net)
  // En ligne (api.net) : chacun sur son téléphone, même arène logique 11x15 partout ; l'hôte (P0) simule tout et arbitre,
  // l'invité (P1) bouge sans attendre et prédit le reste (mèches, explosions, caisses, bonus) ; voir « jeu en ligne » dans mount().
  // ===========================================================================

  const TAU = Math.PI * 2;
  const ACCENT = '#ff4d5e';
  const BG = '#0b141c';
  // couleurs des acteurs : 0 et 1 = les joueurs (duel : P0 / P1 ; 2 contre 2 : moi / mon coéquipier) ; 2 BIP, 3 BOP (robots d'en face)
  const PCOL = ['#ffa630', '#5ef0ff', '#ff4d5e', '#b48cff'];
  const PDARK = ['#8a4300', '#08708a', '#8a1020', '#4a2a8a'];
  const PLIGHT = ['#ffe2ad', '#dcfcff', '#ffd0d5', '#ece2ff'];
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];        // 0 droite, 1 bas, 2 gauche, 3 haut (repère écran)
  const BIT = [1, 2, 4, 8];                              // liaisons des flammes (même ordre)

  // contenu des cases
  const EMPTY = 0, PILLAR = 1, CRATE = 2, SOLID = 3, BREAKING = 4;
  // bonus
  const IT_BOMB = 0, IT_RANGE = 1, IT_SPEED = 2, IT_PUSH = 3, IT_SHIELD = 4, IT_BUOY = 5;   // IT_BUOY : 2 contre 2 seulement
  const ITEMS = [
    { label: '+1 BOMBE', col: '#ffd34d', dark: '#8a5a00' },
    { label: '+1 PORTÉE', col: '#ff7a3c', dark: '#8a2a00' },
    { label: 'VITESSE !', col: '#4cff8a', dark: '#0d6b33' },
    { label: 'POUSSE-BOMBE !', col: '#ff5fd2', dark: '#7a1468' },
    { label: 'BOUCLIER !', col: '#7fc4ff', dark: '#1d3f8a' },
    { label: 'BOUÉE !', col: '#4cc36a', dark: '#14602a' }        // redonne une relève (bulle SOS) : jamais dans le duel
  ];

  const FLAME_DUR = 0.62;    // durée d'une flamme (s)
  const FLAME_SAFE = 0.1;    // les dernières 0,1 s de la flamme ne brûlent plus (fondu)
  const BREAK_DUR = 0.42;    // une caisse touchée part en miettes en 0,42 s
  const DRAW_WIN = 0.35;     // deux joueurs touchés à moins de 0,35 s d'écart : égalité
  const SLIDE_SPEED = 9;     // bombe poussée (cases / s)
  const BASE_SPEED = 3.7;    // vitesse de départ (cases / s)
  const SPEED_STEP = 0.6;
  const DROP_EVERY = 0.3;    // mort subite : un bloc (et son symétrique) toutes les 0,3 s
  const DROP_WARN = 0.9;     // ombre annonciatrice avant l'impact
  const MAX_BOMBS = 6, MAX_RANGE = 7, MAX_SPEED = 3;
  const PATTERNS = ['La réserve', 'Les allées', 'Le rempart', 'Le damier'];

  // ----------------------------------------------------------------- outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const backOut = (k) => { k = clamp(k, 0, 1) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
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
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function poly(c, p) {
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
  }

  // ===========================================================================
  // 1. Terrain
  // ===========================================================================
  // difficulté de la manche r (1, 2, 3…)
  function roundParams(r) {
    const k = clamp((r | 0) - 1, 0, 6);
    return {
      fuse: Math.max(1.5, 2.2 - 0.16 * k),          // mèche plus courte
      dropRate: Math.min(0.56, 0.3 + 0.065 * k),     // plus de bonus
      sdStart: Math.max(28, 60 - 8 * k),             // mort subite plus tôt
      density: Math.min(0.7, 0.56 + 0.03 * k)        // un peu plus de caisses
    };
  }

  // grille : piliers aux cases (impair, impair) ; en portrait, deux « consoles » fixes au milieu des bords
  // (sous le bouton menu et les pastilles de score de la bibliothèque)
  function makeMap(cols, rows, notch, rng, P) {
    const N = cols * rows;
    const cells = new Uint8Array(N), kind = new Uint8Array(N), loot = new Int8Array(N).fill(-1), face = new Int8Array(N).fill(-1);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (x % 2 === 1 && y % 2 === 1) cells[y * cols + x] = PILLAR;
    if (notch) {
      const my = (rows - 1) >> 1;
      for (let y = my - 1; y <= my + 1; y++) for (const x of [0, 1, cols - 2, cols - 1]) cells[y * cols + x] = SOLID;
    }
    // départs : un L de 5 cases libres dans chaque coin (P0 en bas à gauche, P1 en haut à droite)
    const safe = new Uint8Array(N);
    for (const [x, y] of [[0, rows - 1], [1, rows - 1], [2, rows - 1], [0, rows - 2], [0, rows - 3]]) {
      const i = y * cols + x; safe[i] = 1; safe[N - 1 - i] = 1;
    }
    const pattern = Math.floor(rng() * PATTERNS.length);
    const mx = (cols - 1) / 2, my = (rows - 1) / 2;
    const pairs = [];
    for (let i = 0; i < N; i++) {
      const j = N - 1 - i;
      if (i >= j) break;
      if (cells[i] !== EMPTY || safe[i]) continue;
      const x = i % cols, y = (i / cols) | 0;
      let p = P.density;
      if (pattern === 1) p = (y === Math.round(my) || x === Math.round(mx)) ? p * 0.22 : Math.min(0.9, p + 0.07);       // grandes allées en croix
      else if (pattern === 2) p = Math.min(0.93, p * (0.62 + 0.62 * (1 - Math.abs(y - my) / my)));                    // rempart au milieu
      else if (pattern === 3) p = ((x + y) % 4 === 0) ? Math.min(0.96, p + 0.22) : Math.max(0.36, p - 0.14);          // damier
      if (rng() < p) { cells[i] = cells[j] = CRATE; pairs.push(i); }
    }
    for (const i of pairs) {
      const v = rng() < 0.42 ? 0 : rng() < 0.55 ? 1 : 2;
      kind[i] = kind[N - 1 - i] = v;
      if (v === 1 && rng() < 0.45) face[i] = face[N - 1 - i] = (rng() * 64) | 0;     // carton à l'effigie d'un copain
    }
    // butin caché (même bonus dans les deux caisses symétriques)
    const order = pairs.slice();
    for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); const t = order[k]; order[k] = order[r]; order[r] = t; }
    const nLoot = Math.min(order.length, Math.round(order.length * P.dropRate));
    const deck = [IT_BOMB, IT_RANGE, IT_BOMB, IT_RANGE];
    const POOL = [IT_SPEED, IT_SHIELD, IT_PUSH, IT_BOMB, IT_RANGE, IT_SPEED, IT_SHIELD, IT_BOMB, IT_RANGE, IT_PUSH, IT_SPEED, IT_RANGE];
    for (let q = 0; deck.length < nLoot; q++) deck.push(POOL[q % POOL.length]);
    for (let k = deck.length - 1; k > 4; k--) { const r = 4 + Math.floor(rng() * (k - 3)); const t = deck[k]; deck[k] = deck[r]; deck[r] = t; }
    for (let k = 0; k < nLoot; k++) { loot[order[k]] = deck[k]; loot[N - 1 - order[k]] = deck[k]; }
    return { cells, kind, loot, face, pattern };
  }

  // mort subite : anneaux en spirale depuis le coin haut-gauche ; chaque bloc tombe en même temps que son symétrique
  function spiralOrder(cols, rows) {
    const out = [];
    for (let k = 0; ; k++) {
      const x0 = k, y0 = k, x1 = cols - 1 - k, y1 = rows - 1 - k;
      if (x0 > x1 || y0 > y1) break;
      const ring = [];
      if (x0 === x1) { for (let y = y0; y <= y1; y++) ring.push(y * cols + x0); }
      else if (y0 === y1) { for (let x = x0; x <= x1; x++) ring.push(y0 * cols + x); }
      else {
        for (let x = x0; x <= x1; x++) ring.push(y0 * cols + x);
        for (let y = y0 + 1; y <= y1; y++) ring.push(y * cols + x1);
        for (let x = x1 - 1; x >= x0; x--) ring.push(y1 * cols + x);
        for (let y = y1 - 1; y > y0; y--) ring.push(y * cols + x0);
      }
      const half = Math.ceil(ring.length / 2);
      for (let j = 0; j < half; j++) out.push(ring[j]);
    }
    return out;
  }

  // ===========================================================================
  // 1 bis. Terrain du 2 contre 2 (« Boum 2 contre 2 », mode Coop) — jamais appelé par le duel
  // Arène 11 x 13 SANS consoles, 4 coins de départ, symétrie miroir DOUBLE : les cases (x, y), (cols-1-x, y), (x, rows-1-y)
  // et (cols-1-x, rows-1-y) sont toujours identiques (même caisse, même sorte, même bonus caché) → chacun des 4 joueurs a
  // exactement les mêmes alentours. Équipe « joueurs » en bas (0 bas-gauche, 1 bas-droite), robots en haut (2 BIP haut-droite,
  // 3 BOP haut-gauche).
  // ===========================================================================
  const COOP_COLS = 11, COOP_ROWS = 13;
  // difficulté de la manche r : comme le duel, avec un peu plus de bonus (4 joueurs se les partagent) et une mort subite plus tardive
  // (manches de 60 à 90 s : 74 s à la manche 1, puis 6 s plus tôt à chaque manche, 44 s au plus tôt)
  function roundParamsCoop(r) {
    const k = clamp((r | 0) - 1, 0, 6);
    return {
      fuse: Math.max(1.5, 2.2 - 0.16 * k),
      dropRate: Math.min(0.61, 0.35 + 0.065 * k),
      sdStart: Math.max(44, 74 - 6 * k),
      density: Math.min(0.76, 0.62 + 0.03 * k)                        // un peu plus de caisses que le duel : manches plus longues
    };
  }
  // les cases miroirs de (x, y) (4, ou 2 sur la colonne / la ligne du milieu, ou 1 au centre)
  function mirrorCells(cols, rows, x, y) {
    const out = [];
    for (const [a, b] of [[x, y], [cols - 1 - x, y], [x, rows - 1 - y], [cols - 1 - x, rows - 1 - y]]) {
      const i = b * cols + a;
      if (out.indexOf(i) < 0) out.push(i);
    }
    return out;
  }
  function makeMapCoop(cols, rows, rng, P, round) {
    const N = cols * rows;
    const cells = new Uint8Array(N), kind = new Uint8Array(N), loot = new Int8Array(N).fill(-1), face = new Int8Array(N).fill(-1);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (x % 2 === 1 && y % 2 === 1) cells[y * cols + x] = PILLAR;
    // départs : un L de 5 cases libres dans chaque coin
    const safe = new Uint8Array(N);
    for (const [x, y] of [[0, rows - 1], [1, rows - 1], [2, rows - 1], [0, rows - 2], [0, rows - 3]]) for (const i of mirrorCells(cols, rows, x, y)) safe[i] = 1;
    const pattern = Math.floor(rng() * PATTERNS.length);
    const mx = (cols - 1) / 2, my = (rows - 1) / 2;
    const groups = [];
    // le quart haut-gauche (colonne et ligne du milieu comprises) décide pour tout son groupe de miroirs
    for (let y = 0; y <= my; y++) for (let x = 0; x <= mx; x++) {
      const i = y * cols + x;
      if (cells[i] !== EMPTY || safe[i]) continue;
      let p = P.density;
      if (pattern === 1) p = (y === Math.round(my) || x === Math.round(mx)) ? p * 0.22 : Math.min(0.9, p + 0.07);       // grandes allées en croix
      else if (pattern === 2) p = Math.min(0.93, p * (0.62 + 0.62 * (1 - Math.abs(y - my) / my)));                    // rempart entre les camps
      else if (pattern === 3) p = ((x + y) % 4 === 0) ? Math.min(0.96, p + 0.22) : Math.max(0.36, p - 0.14);          // damier
      if (rng() < p) { const g = mirrorCells(cols, rows, x, y); for (const j of g) cells[j] = CRATE; groups.push(g); }
    }
    for (const g of groups) {
      const v = rng() < 0.42 ? 0 : rng() < 0.55 ? 1 : 2;
      const f = v === 1 && rng() < 0.45 ? (rng() * 64) | 0 : -1;    // carton à l'effigie d'un copain
      for (const j of g) { kind[j] = v; face[j] = f; }
    }
    // butin caché : le même bonus dans tout le groupe ; 1 bombe + 1 portée garanties par quart ; la Bouée à partir de la manche 2
    const order = groups.slice();
    for (let k = order.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); const t = order[k]; order[k] = order[r]; order[r] = t; }
    const nLoot = Math.min(order.length, Math.round(order.length * P.dropRate));
    const deck = [IT_BOMB, IT_RANGE];
    const POOL = [IT_SPEED, IT_SHIELD, (round | 0) >= 2 ? IT_BUOY : IT_PUSH, IT_BOMB, IT_RANGE, IT_PUSH, IT_SPEED, IT_SHIELD, IT_BOMB, IT_RANGE, IT_SPEED, IT_RANGE];
    for (let q = 0; deck.length < nLoot; q++) deck.push(POOL[q % POOL.length]);
    for (let k = deck.length - 1; k > 2; k--) { const r = 2 + Math.floor(rng() * (k - 1)); const t = deck[k]; deck[k] = deck[r]; deck[r] = t; }
    for (let k = 0; k < nLoot; k++) for (const j of order[k]) loot[j] = deck[k];
    return { cells, kind, loot, face, pattern, groups: groups.length };
  }

  // ===========================================================================
  // 2. Simulation pure (aucun accès au DOM, au temps réel ni au son)
  // ===========================================================================
  const NOIN = { mx: 0, my: 0, bomb: false };
  function mkActor(p, x, y, dir) {
    return { p, x, y, dir, moving: false, alive: true, win: false, bombsMax: 1, active: 0, range: 2, speedLvl: 0, push: false,
      shield: false, invul: 0, walk: 0, deadT: 0, why: '', picks: 0 };
  }
  // cfg = { cols, rows, notch, seed, round }
  function newRound(cfg) {
    const cols = cfg.cols, rows = cfg.rows, N = cols * rows;
    const rng = mulberry32(cfg.seed >>> 0);
    const P = roundParams(cfg.round);
    const m = makeMap(cols, rows, !!cfg.notch, rng, P);
    return {
      cols, rows, N, P, round: cfg.round, seed: cfg.seed >>> 0, notch: !!cfg.notch,
      cells: m.cells, kind: m.kind, loot: m.loot, face: m.face, pattern: m.pattern,
      items: new Int8Array(N).fill(-1), itemT: new Float32Array(N),
      breakT: new Float32Array(N), fallen: new Uint8Array(N),
      flameT: new Float32Array(N), flameM: new Uint8Array(N), flameO: new Int8Array(N),
      bombs: [], nextId: 1,
      actors: [mkActor(0, 0, rows - 1, 3), mkActor(1, cols - 1, 0, 1)],
      hitAt: [-1, -1],
      sd: { on: false, order: null, idx: 0, timer: 0, falling: [] },
      t: 0, result: null, endT: 0,
      events: []
    };
  }
  function cellAt(S, x, y) { return (x < 0 || y < 0 || x >= S.cols || y >= S.rows) ? -1 : y * S.cols + x; }
  function bombAtCell(S, i) { for (const b of S.bombs) if (b.cell === i) return b; return null; }
  function blocked(S, x, y, a) {
    const i = cellAt(S, x, y);
    if (i < 0 || S.cells[i] !== EMPTY) return true;
    for (const b of S.bombs) if (b.cell === i && !b.pass[a.p]) return true;
    return false;
  }
  function speedOf(a) { return BASE_SPEED + SPEED_STEP * a.speedLvl; }

  // avance le long de la direction d si l'acteur est aligné sur ce couloir ; renvoie la distance parcourue
  function tryAxis(S, a, d, dist) {
    const horiz = DX[d] !== 0, s = horiz ? DX[d] : DY[d];
    const perp = horiz ? a.y : a.x;
    if (Math.abs(perp - Math.round(perp)) > 1e-4) return 0;
    const lane = Math.round(perp);
    if (horiz) a.y = lane; else a.x = lane;
    const u = horiz ? a.x : a.y, ru = Math.round(u);
    const atC = Math.abs(u - ru) < 1e-4;
    const next = atC ? ru + s : (s > 0 ? Math.ceil(u) : Math.floor(u));
    const nx = horiz ? next : lane, ny = horiz ? lane : next;
    if (blocked(S, nx, ny, a)) {
      if (atC) { if (horiz) a.x = ru; else a.y = ru; if (a.push) tryPush(S, a, nx, ny, d); }
      return 0;
    }
    const room = Math.abs(next - u), st = Math.min(dist, room);
    const nu = room - st < 1e-4 ? next : u + s * st;
    if (horiz) a.x = nu; else a.y = nu;
    return st;
  }
  // alignement automatique : l'acteur veut aller vers d mais n'est pas dans le bon couloir ; on le glisse vers
  // le couloir (parmi les deux qu'il chevauche) qui permet d'y aller — jamais coincé sur un coin
  function assist(S, a, d, dist, sd) {
    const horiz = DX[d] !== 0, s = horiz ? DX[d] : DY[d];
    const perp = horiz ? a.y : a.x, along = horiz ? a.x : a.y;
    const fl = Math.floor(perp), ce = Math.ceil(perp);
    if (ce - fl < 1 || Math.abs(along - Math.round(along)) > 1e-4) return 0;
    const ua = Math.round(along);
    const near = (perp - fl) <= (ce - perp) ? fl : ce, far = near === fl ? ce : fl;
    const cands = [near];
    // le couloir le plus loin seulement s'il va dans le sens secondaire demandé (ou s'il n'y en a pas)
    if (sd < 0 || Math.sign(far - perp) === (horiz ? DY[sd] : DX[sd])) cands.push(far);
    for (const L of cands) {
      const tx = horiz ? ua + s : L, ty = horiz ? L : ua + s;
      const mx = horiz ? ua : L, my = horiz ? L : ua;
      if (blocked(S, tx, ty, a) || blocked(S, mx, my, a)) continue;
      const room = Math.abs(L - perp), st = Math.min(dist, room);
      const np = room - st < 1e-4 ? L : perp + Math.sign(L - perp) * st;
      if (horiz) a.y = np; else a.x = np;
      return st;
    }
    return 0;
  }
  function moveActor(S, a, mx, my, dt) {
    const mag = Math.hypot(mx, my);
    if (mag < 0.25) { a.moving = false; return; }
    let pd, sd = -1;
    if (Math.abs(mx) >= Math.abs(my)) { pd = mx > 0 ? 0 : 2; if (Math.abs(my) > 0.3 * mag) sd = my > 0 ? 1 : 3; }
    else { pd = my > 0 ? 1 : 3; if (Math.abs(mx) > 0.3 * mag) sd = mx > 0 ? 0 : 2; }
    let dist = speedOf(a) * dt, moved = 0, face = pd;
    for (let g = 0; g < 6 && dist > 1e-6; g++) {
      let st = tryAxis(S, a, pd, dist);
      if (!st) st = assist(S, a, pd, dist, sd);
      if (!st && sd >= 0) { st = tryAxis(S, a, sd, dist); if (!st) st = assist(S, a, sd, dist, pd); if (st) face = sd; }
      if (!st) break;
      dist -= st; moved += st;
    }
    a.dir = face;
    a.moving = moved > 1e-5;
    a.walk += moved;
  }

  // ---- bombes
  function bombCanEnter(S, x, y, b) {
    const i = cellAt(S, x, y);
    if (i < 0 || S.cells[i] !== EMPTY) return false;
    for (const o of S.bombs) if (o !== b && o.cell === i) return false;
    for (const a of S.actors) if (a.alive && Math.abs(a.x - x) < 0.9 && Math.abs(a.y - y) < 0.9) return false;
    return true;
  }
  function tryPush(S, a, nx, ny, d) {
    const i = cellAt(S, nx, ny);
    if (i < 0) return;
    const b = bombAtCell(S, i);
    if (!b || b.slide >= 0 || b.pass[a.p]) return;
    if (!bombCanEnter(S, nx + DX[d], ny + DY[d], b)) return;
    b.slide = d;
    S.events.push({ type: 'push', p: a.p, x: nx, y: ny, d, id: b.id });
  }
  function placeBomb(S, a) {
    if (!a.alive || a.active >= a.bombsMax) return false;
    const cx = Math.round(a.x), cy = Math.round(a.y), i = cellAt(S, cx, cy);
    if (i < 0 || S.cells[i] !== EMPTY || bombAtCell(S, i) || S.flameT[i] > 0) return false;
    const b = { id: S.nextId++, owner: a.p, x: cx, y: cy, cell: i, fuse: S.P.fuse, fuse0: S.P.fuse, range: a.range, slide: -1, pass: S.coop ? [false, false, false, false] : [false, false], t: 0 };
    for (const o of S.actors) if (o.alive && Math.abs(o.x - cx) < 0.98 && Math.abs(o.y - cy) < 0.98) b.pass[o.p] = true;
    S.bombs.push(b);
    a.active++;
    S.events.push({ type: 'drop', p: a.p, x: cx, y: cy, id: b.id });
    return true;
  }
  function slideBomb(S, b, dt) {
    let dist = SLIDE_SPEED * dt;
    const d = b.slide;
    for (let g = 0; g < 4 && dist > 1e-6 && b.slide >= 0; g++) {
      const rx = Math.round(b.x), ry = Math.round(b.y);
      const atC = Math.abs(b.x - rx) < 1e-4 && Math.abs(b.y - ry) < 1e-4;
      let tx, ty;
      if (atC) {
        b.x = rx; b.y = ry;
        tx = rx + DX[d]; ty = ry + DY[d];
        if (!bombCanEnter(S, tx, ty, b)) { b.slide = -1; S.events.push({ type: 'stop', x: rx, y: ry, id: b.id }); break; }
      } else {
        tx = DX[d] > 0 ? Math.ceil(b.x) : DX[d] < 0 ? Math.floor(b.x) : rx;
        ty = DY[d] > 0 ? Math.ceil(b.y) : DY[d] < 0 ? Math.floor(b.y) : ry;
        const ti = cellAt(S, tx, ty);
        if (ti < 0 || S.cells[ti] !== EMPTY) { b.x = tx - DX[d]; b.y = ty - DY[d]; b.slide = -1; S.events.push({ type: 'stop', x: b.x, y: b.y, id: b.id }); break; }
      }
      const room = Math.abs(tx - b.x) + Math.abs(ty - b.y), st = Math.min(dist, room);
      if (room - st < 1e-4) { b.x = tx; b.y = ty; } else { b.x += DX[d] * st; b.y += DY[d] * st; }
      dist -= st;
    }
    const nc = cellAt(S, Math.round(b.x), Math.round(b.y));
    if (nc !== b.cell) {
      b.cell = nc;
      for (const o of S.actors) if (o.alive && Math.abs(o.x - b.x) < 0.98 && Math.abs(o.y - b.y) < 0.98) b.pass[o.p] = true;
    }
  }
  function addFlame(S, i, bits, owner) {
    S.flameT[i] = FLAME_DUR; S.flameM[i] |= bits; S.flameO[i] = owner;
    if (S.fown) S.fown[i * NA + owner] = FLAME_DUR;             // 2 contre 2 : durée restante de la flamme de CHAQUE poseur
    if (S.burnLog) S.burnLog.push({ i, a: S.t, b: S.t + FLAME_DUR - FLAME_SAFE, o: owner });   // en ligne (hôte) : historique pour juger l'invité
  }
  function explode(S, b) {
    const k = S.bombs.indexOf(b);
    if (k >= 0) S.bombs.splice(k, 1);
    const own = S.actors[b.owner];
    own.active = Math.max(0, own.active - 1);
    const cx = Math.round(b.x), cy = Math.round(b.y), ci = cellAt(S, cx, cy);
    if (ci < 0) return;
    addFlame(S, ci, 16, b.owner);
    const reach = [0, 0, 0, 0], ends = [0, 0, 0, 0];
    for (let d = 0; d < 4; d++) {
      let prev = ci;
      for (let r = 1; r <= b.range; r++) {
        const x = cx + DX[d] * r, y = cy + DY[d] * r, i = cellAt(S, x, y);
        if (i < 0) break;
        const c = S.cells[i];
        if (c === PILLAR || c === SOLID || c === BREAKING) break;
        S.flameM[prev] |= BIT[d];
        addFlame(S, i, BIT[(d + 2) % 4], b.owner);
        reach[d] = r;
        if (c === CRATE) {
          S.cells[i] = BREAKING; S.breakT[i] = BREAK_DUR; ends[d] = 1;
          if (S.coop) S.coop.crates[S.coop.team[b.owner]]++;
          S.events.push({ type: 'crate', i, x, y, kind: S.kind[i], face: S.face[i], d });
          break;
        }
        const ob = bombAtCell(S, i);
        if (ob) { if (ob.fuse > 0.08) ob.fuse = 0.08; ends[d] = 2; break; }
        if (S.items[i] >= 0) { S.events.push({ type: 'burn', i, x, y, it: S.items[i] }); S.items[i] = -1; ends[d] = 3; break; }
        prev = i;
      }
    }
    S.events.push({ type: 'boom', x: cx, y: cy, owner: b.owner, range: b.range, reach, ends, id: b.id });
  }
  function updateBombs(S, dt, live) {
    for (const b of S.bombs) {
      b.t += dt;
      if (b.slide >= 0) slideBomb(S, b, dt);
      if (live) {
        b.fuse -= dt;
        if (b.cell >= 0 && S.flameT[b.cell] > FLAME_SAFE && b.fuse > 0.05) b.fuse = 0.05;   // glissée dans les flammes
      }
    }
    if (!live) return;
    for (let guard = 0; guard < 64; guard++) {
      let b = null;
      for (const o of S.bombs) if (o.fuse <= 0) { b = o; break; }
      if (!b) break;
      explode(S, b);
    }
    for (const b of S.bombs) for (const a of S.actors) {
      if (b.pass[a.p] && !(Math.abs(a.x - b.x) < 0.98 && Math.abs(a.y - b.y) < 0.98)) b.pass[a.p] = false;
    }
  }

  // ---- bonus, touches, mort subite, verdict
  function pickItem(S, a, i) {
    const it = S.items[i];
    S.items[i] = -1;
    if (it === IT_BOMB) a.bombsMax = Math.min(MAX_BOMBS, a.bombsMax + 1);
    else if (it === IT_RANGE) a.range = Math.min(MAX_RANGE, a.range + 1);
    else if (it === IT_SPEED) a.speedLvl = Math.min(MAX_SPEED, a.speedLvl + 1);
    else if (it === IT_PUSH) a.push = true;
    else if (it === IT_SHIELD) a.shield = true;
    else if (it === IT_BUOY) a.saves = 0;                         // 2 contre 2 : une relève de plus
    a.picks++;
    S.events.push({ type: 'pick', p: a.p, it, i, x: i % S.cols, y: (i / S.cols) | 0 });
  }
  function hitActor(S, a, why) {
    if (!a.alive || S.result) return;
    if (why !== 'crush') {
      if (a.invul > 0) return;
      if (a.shield) { a.shield = false; a.invul = 1.3; S.events.push({ type: 'shield', p: a.p, x: a.x, y: a.y }); return; }
    }
    if (S.coop) { coopHit(S, a, why); return; }                 // 2 contre 2 : bulle SOS (ou KO)
    a.alive = false; a.deadT = 0; a.why = why; a.moving = false;
    S.hitAt[a.p] = S.t;
    S.events.push({ type: 'ko', p: a.p, why, x: a.x, y: a.y });
  }
  function landBlock(S, i, live) {
    if (S.cells[i] === PILLAR || S.cells[i] === SOLID) return;
    S.cells[i] = SOLID; S.fallen[i] = 1; S.items[i] = -1; S.flameT[i] = 0; S.flameM[i] = 0;
    for (let k = S.bombs.length - 1; k >= 0; k--) {
      const b = S.bombs[k];
      if (b.cell !== i) continue;
      S.bombs.splice(k, 1);
      S.actors[b.owner].active = Math.max(0, S.actors[b.owner].active - 1);
      S.events.push({ type: 'squash', i, x: i % S.cols, y: (i / S.cols) | 0, id: b.id });
    }
    const x = i % S.cols, y = (i / S.cols) | 0;
    if (S.landLog) S.landLog.push({ i, t: S.t });                 // en ligne (hôte) : l'invité est jugé quand ses positions arrivent
    for (const a of S.actors) if (a.alive && live && !a.lagc && Math.round(a.x) === x && Math.round(a.y) === y) hitActor(S, a, 'crush');
    if (S.coop) coopLand(S, i, x, y, live);                       // 2 contre 2 : une bulle sous le bloc crève
    S.events.push({ type: 'land', i, x, y });
  }
  function suddenDeath(S, dt) {
    const sd = S.sd;
    if (!sd.on) {
      if (S.t < S.P.sdStart) return;
      sd.on = true; sd.order = spiralOrder(S.cols, S.rows); sd.idx = 0; sd.timer = 0;
      S.events.push({ type: 'sd' });
    }
    sd.timer -= dt;
    while (sd.timer <= 0 && sd.idx < sd.order.length) {
      const i = sd.order[sd.idx++];
      if (S.cells[i] === PILLAR || S.cells[i] === SOLID) continue;
      sd.falling.push({ i, t: DROP_WARN });
      const m = S.N - 1 - i;
      if (m !== i) sd.falling.push({ i: m, t: DROP_WARN });
      sd.timer += DROP_EVERY;
    }
  }
  function decide(S) {
    if (S.result) return;
    if (S.coop) { decideCoop(S); return; }                        // 2 contre 2 : verdict par équipes
    const d0 = !S.actors[0].alive, d1 = !S.actors[1].alive;
    if (!d0 && !d1) return;
    if (d0 && d1) S.result = { winner: -1, loser: -1, why: 'draw' };
    else {
      const loser = d0 ? 0 : 1;
      if (S.t - S.hitAt[loser] < DRAW_WIN) return;
      if (S.waitLag && S.waitLag(loser)) return;                 // en ligne : on attend de savoir si l'invité a aussi été touché
      S.result = { winner: 1 - loser, loser, why: S.actors[loser].why };
      S.actors[1 - loser].win = true;
    }
    S.sd.falling.length = 0;
    S.events.push({ type: 'result', winner: S.result.winner, loser: S.result.loser, why: S.result.why });
  }

  // un pas de simulation ; inputs = [entréesP0, entréesP1], chacune { mx, my (manette -1..1), bomb (appui à consommer) }
  function step(S, dt, inputs) {
    S.t += dt;
    const live = !S.result;
    if (!live) S.endT += dt;
    if (S.fown) { const fo = S.fown; for (let q = 0; q < fo.length; q++) if (fo[q] > 0) { fo[q] -= dt; if (fo[q] < 0) fo[q] = 0; } }
    for (let i = 0; i < S.N; i++) {
      if (S.flameT[i] > 0) { S.flameT[i] -= dt; if (S.flameT[i] <= 0) { S.flameT[i] = 0; S.flameM[i] = 0; } }
      if (S.cells[i] === BREAKING) {
        S.breakT[i] -= dt;
        if (S.breakT[i] <= 0) {
          S.cells[i] = EMPTY;
          if (S.loot[i] >= 0) { S.items[i] = S.loot[i]; S.itemT[i] = 0; S.events.push({ type: 'item', i, it: S.loot[i], x: i % S.cols, y: (i / S.cols) | 0 }); }
        }
      }
      if (S.items[i] >= 0) S.itemT[i] += dt;
    }
    for (const a of S.actors) {
      if (a.invul > 0) a.invul = Math.max(0, a.invul - dt);
      if (!a.alive) { a.deadT += dt; continue; }
      if (!live) { a.moving = false; continue; }
      const inp = (inputs && inputs[a.p]) || NOIN;
      if (inp.remote) { a.x = inp.x; a.y = inp.y; a.dir = inp.dir; a.moving = inp.moving; }   // en ligne (hôte) : position envoyée par l'invité
      else {
        moveActor(S, a, inp.mx || 0, inp.my || 0, dt);
        if (inp.bomb) placeBomb(S, a);
      }
      const ci = cellAt(S, Math.round(a.x), Math.round(a.y));
      if (ci >= 0 && S.items[ci] >= 0) pickItem(S, a, ci);
    }
    updateBombs(S, dt, live);
    if (live) {
      for (const a of S.actors) {
        if (!a.alive || a.lagc) continue;                          // a.lagc : l'invité est jugé à l'arrivée de ses positions
        const ci = cellAt(S, Math.round(a.x), Math.round(a.y));
        if (ci >= 0 && S.flameT[ci] > FLAME_SAFE) {
          if (S.coop) coopBurn(S, a, ci);                         // 2 contre 2 : seules MES flammes et celles d'en face brûlent
          else hitActor(S, a, S.flameO[ci] === a.p ? 'self' : 'flame');
        }
      }
      if (S.coop) coopBubbles(S, dt);                             // bulles SOS : crevées, sauvées, temps écoulé
      suddenDeath(S, dt);
    }
    const fall = S.sd.falling;
    for (let k = fall.length - 1; k >= 0; k--) {
      const f = fall[k];
      f.t -= dt;
      if (f.t <= 0) { fall.splice(k, 1); landBlock(S, f.i, live); }
    }
    if (live) decide(S);
  }

  // cases qui vont brûler (pour l'indice de danger) : explosion simulée sans effet
  function blastCells(S, b, out) {
    const cx = Math.round(b.x), cy = Math.round(b.y);
    out.push(cy * S.cols + cx);
    for (let d = 0; d < 4; d++) {
      for (let r = 1; r <= b.range; r++) {
        const i = cellAt(S, cx + DX[d] * r, cy + DY[d] * r);
        if (i < 0) break;
        const c = S.cells[i];
        if (c === PILLAR || c === SOLID || c === BREAKING) break;
        out.push(i);
        if (c === CRATE || bombAtCell(S, i) || S.items[i] >= 0) break;
      }
    }
  }

  // ===========================================================================
  // 2 bis (coop). Simulation du 2 contre 2 : 4 acteurs, 2 équipes, flammes PAR POSEUR, bulles SOS. Le duel n'y passe jamais
  // (S.coop absent) : newRound / step / hitActor / decide n'appellent ces fonctions que si S.coop existe.
  // Règles : les flammes de ton équipe ne te font rien… sauf les tiennes (« Auto-boum ! ») ; touché (flamme ennemie ou ta
  // bombe) → BULLE SOS (8 s, 10 s en Facile) sur place ; un coéquipier debout qui la touche → « SAUVÉ ! » (debout, 2 s
  // d'invincibilité, bouclier perdu) ; une relève par joueur et par manche (la Bouée en redonne une) ; flamme ENNEMIE ou bloc de
  // mort subite sur la bulle → crevée (KO) ; plus personne debout dans une équipe → elle perd la manche (égalité à 0,35 s près).
  // Événements : 'bulle' {p, why, x, y, t, by}, 'sauve' {p, by, x, y}, 'crevee' {p, why, x, y, by}, 'ko' {p, why, x, y, by},
  // 'libre' {p} (bulle de l'équipe gagnante à la fin), 'result' {winner, loser (équipes), why, team: 1}.
  // ===========================================================================
  const NA = 4;                                      // acteurs du 2 contre 2 : 0 moi (bas-gauche), 1 coéquipier (bas-droite), 2 BIP, 3 BOP
  const TEAM2 = [0, 0, 1, 1];
  const BUB_DUR = 8, BUB_EASY = 10, SAVE_INVUL = 2, SAVE_DIST = 0.6;
  // égalité : seulement si les deux équipes tombent presque ENSEMBLE (même explosion en chaîne) ; la spirale de la mort subite
  // (un bloc toutes les 0,3 s) départage donc la dernière équipe debout (sinon les fins à 4 écrasés seraient presque toutes nulles)
  const DRAW_WIN_COOP = 0.2;
  function teamOf(S, p) { return S.coop ? S.coop.team[p] : p; }
  function foeOf(S, p, q) { return teamOf(S, p) !== teamOf(S, q); }
  // cfg = { seed, round, bub: [durée de bulle de chaque acteur, 0 = pas de bulle (KO direct)], maxSaves (1) }
  function newCoopRound(cfg) {
    const cols = cfg.cols || COOP_COLS, rows = cfg.rows || COOP_ROWS, N = cols * rows;   // 11 x 13 ; 13 x 11 en paysage sur un seul appareil
    const rng = mulberry32(cfg.seed >>> 0);
    const P = roundParamsCoop(cfg.round);
    const m = makeMapCoop(cols, rows, rng, P, cfg.round);
    const actors = [mkActor(0, 0, rows - 1, 3), mkActor(1, cols - 1, rows - 1, 3), mkActor(2, cols - 1, 0, 1), mkActor(3, 0, 0, 1)];
    const bub = cfg.bub || [BUB_DUR, BUB_DUR, 0, 0];
    for (const a of actors) { a.team = TEAM2[a.p]; a.state = 'ok'; a.bubT = 0; a.bubAt = -9; a.bub0 = +bub[a.p] || 0; a.saves = 0; a.by = -1; }
    return {
      cols, rows, N, P, round: cfg.round, seed: cfg.seed >>> 0, notch: false,
      cells: m.cells, kind: m.kind, loot: m.loot, face: m.face, pattern: m.pattern,
      items: new Int8Array(N).fill(-1), itemT: new Float32Array(N),
      breakT: new Float32Array(N), fallen: new Uint8Array(N),
      flameT: new Float32Array(N), flameM: new Uint8Array(N), flameO: new Int8Array(N), fown: new Float32Array(N * NA),
      bombs: [], nextId: 1,
      actors,
      hitAt: [-1, -1, -1, -1],
      sd: { on: false, order: null, idx: 0, timer: 0, falling: [] },
      t: 0, result: null, endT: 0, resT: -1,
      events: [],
      // compteurs de la manche par équipe : caisses cassées, relèves, joueurs touchés (bulle ou KO), bulles crevées
      coop: { team: TEAM2, maxSaves: cfg.maxSaves == null ? 1 : cfg.maxSaves, crates: [0, 0], saves: [0, 0], hurt: [0, 0], pops: [0, 0] }
    };
  }
  // flamme sur la case de l'acteur a (debout) : celle d'un ennemi l'emporte (le KO lui revient), sinon la sienne
  function coopBurn(S, a, ci) {
    const fo = S.fown, o = ci * NA;
    let by = -1, best = FLAME_SAFE;
    for (let q = 0; q < NA; q++) if (fo[o + q] > best && foeOf(S, a.p, q)) { best = fo[o + q]; by = q; }
    if (by >= 0) { a.by = by; hitActor(S, a, 'flame'); return; }
    if (fo[o + a.p] > FLAME_SAFE) { a.by = a.p; hitActor(S, a, 'self'); }
  }
  function coopHit(S, a, why) {
    const C = S.coop;
    a.alive = false; a.deadT = 0; a.why = why; a.moving = false;
    S.hitAt[a.p] = S.t;
    C.hurt[a.team]++;
    if (why !== 'crush' && a.bub0 > 0 && a.saves < C.maxSaves) {
      a.state = 'bulle'; a.bubT = a.bub0; a.bubAt = S.t;
      S.events.push({ type: 'bulle', p: a.p, why, x: a.x, y: a.y, t: a.bub0, by: a.by });
    } else {
      a.state = 'ko'; a.bubT = 0;
      S.events.push({ type: 'ko', p: a.p, why, x: a.x, y: a.y, by: a.by });
    }
  }
  function popBubble(S, a, why) {
    a.state = 'ko'; a.bubT = 0; a.deadT = 0;
    if (why !== 'fin') a.why = why === 'temps' ? a.why : why;
    S.coop.pops[a.team]++;
    S.events.push({ type: 'crevee', p: a.p, why, x: a.x, y: a.y, by: a.by });
  }
  function coopSave(S, a, by) {
    a.state = 'ok'; a.alive = true; a.bubT = 0; a.invul = SAVE_INVUL; a.shield = false; a.saves++; a.deadT = 0; a.why = ''; a.moving = false; a.by = -1;
    S.coop.saves[a.team]++;
    S.events.push({ type: 'sauve', p: a.p, by, x: a.x, y: a.y });
  }
  function coopBubbles(S, dt) {
    const fo = S.fown;
    for (const a of S.actors) {
      if (a.state !== 'bulle' || S.result) continue;
      a.bubT -= dt;
      const ci = cellAt(S, Math.round(a.x), Math.round(a.y));
      let by = -1;
      // (la flamme qui l'a faite, et celles qui la suivent de près, ne la crèvent pas : FLAME_DUR de répit)
      if (ci >= 0 && S.flameT[ci] > FLAME_SAFE && S.t - a.bubAt >= FLAME_DUR) for (let q = 0; q < NA; q++) if (foeOf(S, a.p, q) && fo[ci * NA + q] > FLAME_SAFE) { by = q; break; }
      if (by >= 0) { a.by = by; popBubble(S, a, 'flame'); continue; }
      let sv = -1;
      for (const o of S.actors) if (o !== a && o.alive && o.team === a.team && Math.abs(o.x - a.x) + Math.abs(o.y - a.y) < SAVE_DIST) { sv = o.p; break; }
      if (sv >= 0) { coopSave(S, a, sv); continue; }
      if (a.bubT <= 0) popBubble(S, a, 'temps');
    }
  }
  function coopLand(S, i, x, y, live) {
    for (let q = 0; q < NA; q++) S.fown[i * NA + q] = 0;
    if (!live) return;
    for (const a of S.actors) if (a.state === 'bulle' && Math.round(a.x) === x && Math.round(a.y) === y) popBubble(S, a, 'crush');
  }
  // verdict : une équipe dont plus personne n'est debout perd la manche. Les deux à 0,2 s près : l'équipe qui avait le plus de
  // joueurs encore debout jusqu'au bout gagne (fin de mort subite : « ils étaient plus nombreux ») ; autant : égalité, on rejoue.
  function decideCoop(S) {
    const up = [false, false], downT = [-1, -1], lastP = [-1, -1];
    for (const a of S.actors) {
      if (a.alive) up[a.team] = true;
      else if (S.hitAt[a.p] >= downT[a.team]) { downT[a.team] = S.hitAt[a.p]; lastP[a.team] = a.p; }
    }
    if (up[0] && up[1]) return;
    let R;
    if (!up[0] && !up[1]) {
      const T = Math.max(downT[0], downT[1]), last = [0, 0];
      for (const a of S.actors) if (S.hitAt[a.p] >= T - DRAW_WIN_COOP - 1e-6) last[a.team]++;
      if (last[0] === last[1]) R = { winner: -1, loser: -1, why: 'draw', team: 1 };
      else { const w = last[0] > last[1] ? 0 : 1; R = { winner: w, loser: 1 - w, why: lastP[1 - w] >= 0 ? S.actors[lastP[1 - w]].why : 'crush', team: 1, more: 1 }; }
    } else {
      const loser = up[0] ? 1 : 0;
      if (S.t - downT[loser] < DRAW_WIN_COOP) return;
      if (S.waitLag && S.waitLag(loser)) return;
      R = { winner: 1 - loser, loser, why: lastP[loser] >= 0 ? S.actors[lastP[loser]].why : 'flame', team: 1 };
    }
    S.result = R; S.resT = S.t;
    for (const a of S.actors) {
      if (a.state === 'bulle') {
        if (a.team === R.winner) { a.state = 'ok'; a.alive = true; a.bubT = 0; a.why = ''; S.events.push({ type: 'libre', p: a.p }); }
        else popBubble(S, a, 'fin');
      }
      if (a.team === R.winner && a.alive) a.win = true;
    }
    S.sd.falling.length = 0;
    S.events.push({ type: 'result', winner: R.winner, loser: R.loser, why: R.why, team: 1 });
  }

  // ===========================================================================
  // 2 quater. La partie coop « Le tournoi des robots » (pur, sans affichage) : 3 cœurs d'équipe partagés, manches enchaînées
  // qui durcissent (roundParamsCoop), et à partir de la manche 6, tous les 3 manches, BIP et BOP montent d'un cran (jusqu'à
  // Extrême ; le robot coéquipier garde le niveau choisi). Manche gagnée → points ; perdue → −1 cœur ; égalité → on rejoue
  // (même manche, pas de cœur perdu) ; 0 cœur → fin de partie (api.gameOver(score)). Points × multiplicateur du niveau choisi.
  // Score d'une manche GAGNÉE : 1000 × (1 + 0,1 × (r − 1)) + 200 par robot KO + 10 par caisse cassée + 300 par relève
  // + 500 « Sans bobo ! » (personne de l'équipe touché) + 10 par seconde d'avance sur la mort subite ; manche perdue ou nulle :
  // seulement robots KO, caisses et relèves.
  // ===========================================================================
  const COOP_LV = ['facile', 'moyen', 'difficile', 'extreme'];
  const COOP_K = [0.25, 0.5, 0.75, 1];
  // (BOUM.coop.mult) calé par les tournois de l'atelier (tests/tourney2.js mode=games, 40 parties par niveau) : scores médians
  // ~14 500 / 15 300 / 15 000 / 15 600 de Facile à Extrême (rapports ×1,06 / ×0,98 / ×1,04 : règle du contrat entre ×0,9 et ×1,5)
  const COOP_MULT = [1, 2, 4, 8];
  const COOP_HEARTS = 3;
  function coopNew(level) {
    const lv = Math.max(0, COOP_LV.indexOf(level));
    return { lv, level: COOP_LV[lv], hearts: COOP_HEARTS, round: 1, played: 0, won: 0, lost: 0, draws: 0, score: 0, kos: 0, saves: 0, crates: 0, clean: 0, last: null };
  }
  // niveau de BIP et BOP à la manche r (indice dans COOP_LV)
  function coopFoeLevel(M, r) {
    r = r == null ? M.round : r;
    return Math.min(3, M.lv + (r >= 6 ? 1 + Math.floor((r - 6) / 3) : 0));
  }
  // durée des bulles : la nôtre (10 s en Facile, sinon 8 s) ; BIP et BOP n'en ont qu'à partir de Difficile (en Facile et Moyen,
  // un robot touché est KO pour la manche)
  function coopBubbleDur(M, r) {
    const f = coopFoeLevel(M, r), ours = M.lv === 0 ? BUB_EASY : BUB_DUR, theirs = f >= 2 ? BUB_DUR : 0;
    return [ours, ours, theirs, theirs];
  }
  // la manche suivante (graine tirée par l'appelant : api.seed + numéro de manche, la même sur les deux appareils en ligne)
  function coopRoundCfg(M, seed, land) { return { seed: seed >>> 0, round: M.round, bub: coopBubbleDur(M), foe: COOP_LV[coopFoeLevel(M)], cols: land ? COOP_ROWS : COOP_COLS, rows: land ? COOP_COLS : COOP_ROWS }; }
  function coopScoreRound(M, S) {
    const C = S.coop, R = S.result;
    let ko = 0;
    for (const a of S.actors) if (a.team === 1 && a.state === 'ko') ko++;
    let pts = 200 * ko + 10 * C.crates[0] + 300 * C.saves[0];
    const won = !!R && R.winner === 0;
    if (won) {
      pts += Math.round(1000 * (1 + 0.1 * (M.round - 1)));
      if (!C.hurt[0]) pts += 500;
      const tEnd = S.resT >= 0 ? S.resT : S.t;
      pts += 10 * Math.max(0, Math.floor(S.P.sdStart - tEnd));
    }
    return { pts: Math.round(pts * COOP_MULT[M.lv]), ko, won, clean: won && !C.hurt[0] };
  }
  // fin de manche : met la partie à jour ; renvoie { pts, over, won, draw, foeUp (les robots montent d'un cran), heart (cœur perdu) }
  function coopRoundEnd(M, S) {
    const R = S.result || { winner: -1 };
    const sc = coopScoreRound(M, S), f0 = coopFoeLevel(M);
    M.score += sc.pts; M.played++;
    M.kos += sc.ko; M.saves += S.coop.saves[0]; M.crates += S.coop.crates[0]; if (sc.clean) M.clean++;
    const out = { pts: sc.pts, won: R.winner === 0, draw: R.winner < 0, heart: false, over: false, foeUp: false };
    if (R.winner === 0) { M.won++; M.round++; }
    else if (R.winner === 1) { M.lost++; M.hearts--; M.round++; out.heart = true; }
    else M.draws++;
    out.over = M.hearts <= 0;
    out.foeUp = !out.over && coopFoeLevel(M) > f0;
    M.last = out;
    return out;
  }

  // ===========================================================================
  // 2 bis. Jeu en ligne — outils purs. L'hôte fait toute la simulation (arbitre) ; l'invité tient un « miroir »
  // de la manche (même graine) qu'il fait avancer en prédiction, corrigé par les événements fiables de l'hôte.
  // ===========================================================================
  const NET_COLS = 11, NET_ROWS = 15;           // arène commune en ligne : la grande arène « portrait » (avec ses consoles), sur tout écran
  const PFIELD = ['bombsMax', 'range', 'speedLvl', 'push', 'shield'];   // pouvoir modifié par chaque bonus
  const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
  const r3 = (v) => Math.round(v * 1000) / 1000;
  function powerVal(a, it) { const f = PFIELD[it]; return f ? +a[f] : 0; }   // valeur du pouvoir touché par ce bonus (envoyée telle quelle : idempotent)
  function setPower(a, it, v) { const f = PFIELD[it]; if (f) a[f] = (it === IT_PUSH || it === IT_SHIELD) ? !!v : (v | 0); }
  // hôte : bombe de l'invité, posée à la case qu'il annonce (mèche raccourcie du retard du réseau : elle part à la même heure des deux côtés)
  function placeBombAt(S, a, cx, cy, fuse, g) {
    if (!a.alive || a.active >= a.bombsMax) return false;
    const i = cellAt(S, cx, cy);
    if (i < 0 || S.cells[i] !== EMPTY || bombAtCell(S, i)) return false;
    const b = { id: S.nextId++, owner: a.p, x: cx, y: cy, cell: i, fuse: clamp(fuse, 0.05, S.P.fuse), fuse0: S.P.fuse, range: a.range, slide: -1, pass: [false, false], t: 0, g };
    for (const o of S.actors) if (o.alive && Math.abs(o.x - cx) < 0.98 && Math.abs(o.y - cy) < 0.98) b.pass[o.p] = true;
    S.bombs.push(b);
    a.active++;
    S.events.push({ type: 'drop', p: a.p, x: cx, y: cy, id: b.id, g });
    return true;
  }
  function boomCells(S, x, y, reach) {            // cases d'une explosion connue (centre + bras)
    const out = new Set(), ci = cellAt(S, x, y);
    if (ci < 0) return out;
    out.add(ci);
    for (let d = 0; d < 4; d++) for (let r = 1; r <= reach[d]; r++) { const i = cellAt(S, x + DX[d] * r, y + DY[d] * r); if (i < 0) break; out.add(i); }
    return out;
  }
  // invité : allume les flammes d'une explosion décidée par l'hôte (age = temps déjà écoulé depuis)
  function applyBoom(S, x, y, owner, reach, ends, age) {
    const ci = cellAt(S, x, y);
    if (ci < 0) return;
    const dur = FLAME_DUR - Math.max(0, age);
    if (dur > 0) {
      const lit = (i, bits) => { if (S.flameT[i] < dur) S.flameT[i] = dur; S.flameM[i] |= bits; S.flameO[i] = owner; };
      lit(ci, 16);
      for (let d = 0; d < 4; d++) {
        let prev = ci;
        for (let r = 1; r <= reach[d]; r++) {
          const i = cellAt(S, x + DX[d] * r, y + DY[d] * r);
          if (i < 0) break;
          S.flameM[prev] |= BIT[d];
          lit(i, BIT[(d + 2) % 4]);
          prev = i;
        }
      }
    }
    for (let d = 0; d < 4; d++) {                 // bombe prise dans le souffle : elle part aussi (son explosion suivra)
      if (ends[d] !== 2) continue;
      const i = cellAt(S, x + DX[d] * reach[d], y + DY[d] * reach[d]);
      const ob = i >= 0 ? bombAtCell(S, i) : null;
      if (ob && ob.fuse > 0.08) ob.fuse = 0.08;
    }
  }
  // état complet compact (~0,5 Ko) : pour un invité qui arrive en cours de manche
  function encodeState(S) {
    let g = '';
    for (let i = 0; i < S.N; i++) g += B36[S.cells[i] * 6 + S.items[i] + 1];
    const bk = [], fl = [], fa = [];
    for (let i = 0; i < S.N; i++) {
      if (S.cells[i] === BREAKING) bk.push(i, r3(S.breakT[i]));
      if (S.flameT[i] > 0) fl.push(i, r3(S.flameT[i]), S.flameM[i], S.flameO[i]);
      if (S.fallen[i]) fa.push(i);
    }
    return {
      t: r3(S.t), g, bk, fl, fa, id: S.nextId,
      bo: S.bombs.map((b) => [b.id, b.owner, r3(b.x), r3(b.y), r3(b.fuse), b.range, b.slide]),
      ac: S.actors.map((a) => [r3(a.x), r3(a.y), a.dir, a.alive ? 1 : 0, a.bombsMax, a.active, a.range, a.speedLvl, a.push ? 1 : 0, a.shield ? 1 : 0, r3(a.invul), a.why || '', r3(a.deadT)]),
      sd: [S.sd.on ? 1 : 0, S.sd.idx, r3(S.sd.timer), S.sd.falling.map((f) => [f.i, r3(f.t)])],
      re: S.result ? [S.result.winner, S.result.loser, S.result.why] : null, ht: S.hitAt.map(r3)
    };
  }
  function applyState(S, z) {
    if (!z || typeof z.g !== 'string' || z.g.length !== S.N) return false;
    for (let i = 0; i < S.N; i++) {
      const v = B36.indexOf(z.g[i]);
      if (v < 0) continue;
      S.cells[i] = (v / 6) | 0; S.items[i] = (v % 6) - 1; S.breakT[i] = 0; S.flameT[i] = 0; S.flameM[i] = 0; S.fallen[i] = 0; S.itemT[i] = 1;
    }
    const bk = z.bk || [], fl = z.fl || [];
    for (let k = 0; k + 1 < bk.length; k += 2) if (bk[k] >= 0 && bk[k] < S.N) S.breakT[bk[k]] = +bk[k + 1] || 0;
    for (let k = 0; k + 3 < fl.length; k += 4) { const i = fl[k]; if (i >= 0 && i < S.N) { S.flameT[i] = +fl[k + 1] || 0; S.flameM[i] = fl[k + 2] | 0; S.flameO[i] = fl[k + 3] | 0; } }
    for (const i of z.fa || []) if (i >= 0 && i < S.N) S.fallen[i] = 1;
    S.t = +z.t || 0; S.nextId = (z.id | 0) || S.nextId;
    S.bombs = (z.bo || []).map((q) => {
      const x = +q[2], y = +q[3];
      return { id: q[0], owner: q[1] ? 1 : 0, x, y, cell: cellAt(S, Math.round(x), Math.round(y)), fuse: +q[4], fuse0: S.P.fuse, range: q[5] | 0, slide: q[6] | 0, pass: [false, false], t: 1 };
    });
    (z.ac || []).forEach((q, p) => {
      const a = S.actors[p];
      if (!a || !q) return;
      a.x = +q[0]; a.y = +q[1]; a.dir = q[2] | 0; a.alive = !!q[3]; a.bombsMax = q[4] | 0; a.active = q[5] | 0; a.range = q[6] | 0; a.speedLvl = q[7] | 0;
      a.push = !!q[8]; a.shield = !!q[9]; a.invul = +q[10] || 0; a.why = q[11] || ''; a.deadT = +q[12] || 0;
    });
    if (z.sd) {
      S.sd.on = !!z.sd[0]; S.sd.idx = z.sd[1] | 0; S.sd.timer = +z.sd[2] || 0;
      S.sd.order = S.sd.on ? spiralOrder(S.cols, S.rows) : null;
      S.sd.falling = (z.sd[3] || []).map((f) => ({ i: f[0], t: +f[1] }));
    }
    if (z.re) { S.result = { winner: z.re[0], loser: z.re[1], why: z.re[2] }; if (z.re[0] >= 0) S.actors[z.re[0]].win = true; }
    if (z.ht) S.hitAt = z.ht.slice(0, 2).map(Number);
    for (const b of S.bombs) for (const a of S.actors) if (a.alive && Math.abs(a.x - b.x) < 0.98 && Math.abs(a.y - b.y) < 0.98) b.pass[a.p] = true;
    return true;
  }
  // trajectoire lissée d'un objet distant : tampon d'états horodatés (horloge commune), lu avec un léger retard adaptatif
  function mkIp(every) { return { b: [], lat: -1, dev: 0.004, D: -1, every }; }
  function ipAdd(I, s, now) {
    const b = I.b;
    if (b.length && s.c <= b[b.length - 1].c) {             // arrivé dans le désordre : on l'insère à sa place (ou on l'oublie)
      if (s.c <= b[0].c) return;
      let k = b.length - 1;
      while (k > 0 && b[k - 1].c >= s.c) k--;
      if (b[k].c === s.c) return;
      b.splice(k, 0, s);
    } else b.push(s);
    if (b.length > 48) b.splice(0, b.length - 48);
    const l = now - s.c;
    if (I.lat < 0) { I.lat = l; I.dev = 0.004; } else { I.dev += (Math.abs(l - I.lat) - I.dev) * 0.08; I.lat += (l - I.lat) * 0.08; }
  }
  function ipTarget(I) { return clamp(I.lat + I.every * 1.25 + I.dev * 2.2 + 0.006, 0.02, 0.8); }
  function ipAt(I, rt) {                            // position à l'instant rt (interpolation ; courte extrapolation si le tampon est vide)
    const b = I.b, n = b.length;
    if (!n) return null;
    if (rt <= b[0].c || n === 1) return b[0];
    for (let k = n - 1; k > 0; k--) {
      const a = b[k - 1], c = b[k];
      if (rt >= a.c) {
        if (rt > c.c) break;
        const f = (rt - a.c) / Math.max(1e-6, c.c - a.c);
        return { c: rt, x: a.x + (c.x - a.x) * f, y: a.y + (c.y - a.y) * f, d: c.d, m: c.m || a.m };
      }
    }
    const a = b[n - 2], c = b[n - 1], ex = Math.min(rt - c.c, 0.1), dtc = Math.max(1e-3, c.c - a.c);
    if (!c.m || ex <= 0) return c;
    return { c: rt, x: c.x + (c.x - a.x) / dtc * ex, y: c.y + (c.y - a.y) / dtc * ex, d: c.d, m: c.m };
  }

  // ===========================================================================
  // 2 bis (coop). En ligne à 4 acteurs — outils purs, PROPRES au coop (les formats du duel ne changent pas).
  // L'hôte (place 0) fait tourner la simulation, BIP et BOP ; l'invité (place 1) tient un miroir de la manche (même graine).
  // ===========================================================================
  // invité : flammes d'une explosion décidée par l'hôte, avec leur poseur (tir ami : seules les siennes et celles d'en face brûlent)
  function applyBoomCoop(S, x, y, owner, reach, ends, age) {
    const ci = cellAt(S, x, y);
    if (ci < 0) return;
    const dur = FLAME_DUR - Math.max(0, age);
    if (dur > 0) {
      const lit = (i, bits) => { if (S.flameT[i] < dur) S.flameT[i] = dur; S.flameM[i] |= bits; S.flameO[i] = owner; if (S.fown[i * NA + owner] < dur) S.fown[i * NA + owner] = dur; };
      lit(ci, 16);
      for (let d = 0; d < 4; d++) {
        let prev = ci;
        for (let r = 1; r <= reach[d]; r++) {
          const i = cellAt(S, x + DX[d] * r, y + DY[d] * r);
          if (i < 0) break;
          S.flameM[prev] |= BIT[d];
          lit(i, BIT[(d + 2) % 4]);
          prev = i;
        }
      }
    }
    for (let d = 0; d < 4; d++) {
      if (ends[d] !== 2) continue;
      const i = cellAt(S, x + DX[d] * reach[d], y + DY[d] * reach[d]);
      const ob = i >= 0 ? bombAtCell(S, i) : null;
      if (ob && ob.fuse > 0.08) ob.fuse = 0.08;
    }
  }
  // état complet (~0,8 Ko) : un invité qui se recale en cours de manche
  function encodeStateCoop(S) {
    let g = '';
    for (let i = 0; i < S.N; i++) g += B36[S.cells[i] * 7 + S.items[i] + 1];
    const bk = [], fl = [], fa = [];
    for (let i = 0; i < S.N; i++) {
      if (S.cells[i] === BREAKING) bk.push(i, r3(S.breakT[i]));
      if (S.flameT[i] > 0) { fl.push(i, r3(S.flameT[i]), S.flameM[i]); for (let q = 0; q < NA; q++) fl.push(r3(S.fown[i * NA + q])); }
      if (S.fallen[i]) fa.push(i);
    }
    return {
      t: r3(S.t), g, bk, fl, fa, id: S.nextId,
      bo: S.bombs.map((b) => [b.id, b.owner, r3(b.x), r3(b.y), r3(b.fuse), b.range, b.slide]),
      ac: S.actors.map((a) => [r3(a.x), r3(a.y), a.dir, a.alive ? 1 : 0, a.state, r3(a.bubT), a.bombsMax, a.active, a.range, a.speedLvl, a.push ? 1 : 0, a.shield ? 1 : 0, r3(a.invul), a.saves, a.why || '', r3(a.deadT), r3(a.bubAt)]),
      sd: [S.sd.on ? 1 : 0, S.sd.idx, r3(S.sd.timer), S.sd.falling.map((f) => [f.i, r3(f.t)])],
      re: S.result ? [S.result.winner, S.result.loser, S.result.why] : null, ht: S.hitAt.map(r3),
      co: [S.coop.crates, S.coop.saves, S.coop.hurt, S.coop.pops]
    };
  }
  function applyStateCoop(S, z) {
    if (!z || typeof z.g !== 'string' || z.g.length !== S.N) return false;
    for (let i = 0; i < S.N; i++) {
      const v = B36.indexOf(z.g[i]);
      if (v < 0) continue;
      S.cells[i] = (v / 7) | 0; S.items[i] = (v % 7) - 1; S.breakT[i] = 0; S.flameT[i] = 0; S.flameM[i] = 0; S.fallen[i] = 0; S.itemT[i] = 1;
    }
    S.fown.fill(0);
    const bk = z.bk || [], fl = z.fl || [];
    for (let k = 0; k + 1 < bk.length; k += 2) if (bk[k] >= 0 && bk[k] < S.N) S.breakT[bk[k]] = +bk[k + 1] || 0;
    for (let k = 0; k + 3 + NA <= fl.length; k += 3 + NA) {
      const i = fl[k];
      if (!(i >= 0 && i < S.N)) continue;
      S.flameT[i] = +fl[k + 1] || 0; S.flameM[i] = fl[k + 2] | 0;
      for (let q = 0; q < NA; q++) S.fown[i * NA + q] = +fl[k + 3 + q] || 0;
    }
    for (const i of z.fa || []) if (i >= 0 && i < S.N) S.fallen[i] = 1;
    S.t = +z.t || 0; S.nextId = (z.id | 0) || S.nextId;
    S.bombs = (z.bo || []).map((q) => {
      const x = +q[2], y = +q[3];
      return { id: q[0], owner: q[1] | 0, x, y, cell: cellAt(S, Math.round(x), Math.round(y)), fuse: +q[4], fuse0: S.P.fuse, range: q[5] | 0, slide: q[6] | 0, pass: [false, false, false, false], t: 1 };
    });
    (z.ac || []).forEach((q, p) => {
      const a = S.actors[p];
      if (!a || !q) return;
      a.x = +q[0]; a.y = +q[1]; a.dir = q[2] | 0; a.alive = !!q[3]; a.state = q[4] || 'ok'; a.bubT = +q[5] || 0; a.bombsMax = q[6] | 0; a.active = q[7] | 0;
      a.range = q[8] | 0; a.speedLvl = q[9] | 0; a.push = !!q[10]; a.shield = !!q[11]; a.invul = +q[12] || 0; a.saves = q[13] | 0; a.why = q[14] || ''; a.deadT = +q[15] || 0; a.bubAt = +q[16] || -9;
    });
    if (z.sd) {
      S.sd.on = !!z.sd[0]; S.sd.idx = z.sd[1] | 0; S.sd.timer = +z.sd[2] || 0;
      S.sd.order = S.sd.on ? spiralOrder(S.cols, S.rows) : null;
      S.sd.falling = (z.sd[3] || []).map((f) => ({ i: f[0], t: +f[1] }));
    }
    if (z.re) { S.result = { winner: z.re[0], loser: z.re[1], why: z.re[2], team: 1 }; for (const a of S.actors) if (a.team === z.re[0] && a.alive) a.win = true; }
    if (z.ht) S.hitAt = z.ht.slice(0, NA).map(Number);
    if (z.co) { S.coop.crates = z.co[0].slice(); S.coop.saves = z.co[1].slice(); S.coop.hurt = z.co[2].slice(); S.coop.pops = z.co[3].slice(); }
    for (const b of S.bombs) for (const a of S.actors) if (a.alive && Math.abs(a.x - b.x) < 0.98 && Math.abs(a.y - b.y) < 0.98) b.pass[a.p] = true;
    return true;
  }

  // ===========================================================================
  // 2 ter. IA (api.ai : le joueur du haut est piloté par le jeu). Mêmes règles et mêmes vitesses qu'un joueur, sans tricher :
  // elle ne voit que ce qu'un joueur voit (les bonus cachés dans les caisses lui sont inconnus) et réagit avec un délai humain.
  // Carte des dangers dans le temps (mèches, réactions en chaîne, flammes, blocs qui tombent, spirale de la mort subite)
  // → trajets sûrs (avec l'heure de passage dans chaque case) → buts : fuir, bonus, caisses, chasse, pièges, poussées.
  // ===========================================================================
  const AI_LV = {
    // react : délai avant de remarquer une bombe / de voir où est l'autre ; period : temps de réflexion ; margin : marge de sécurité (s)
    // forget : bombes « pas vues » ; risky : bombe posée sans vérifier la sortie ; wander : buts au hasard ; hesit : hésitations
    // aggro : envie d'attaquer ; trap : goût des pièges (cases de fuite de l'autre) ; push : pousse les bombes ; mob : garde des sorties ;
    // sd : connaît la spirale de la mort subite ; depth : nombre de buts « bombe » vérifiés à fond (sortie + piège)
    facile:    { react: 0.6, period: 0.36, margin: 0.05, forget: 0.7, notice: 0.22, risky: 0.1, wander: 0.45, hesit: 0.2, aggro: 0.12, trap: 0, push: 0, mob: 0, sd: 0, shadow: 0.7, counter: 0, depth: 2 },
    moyen:     { react: 0.45, period: 0.3, margin: 0.07, forget: 0.5, notice: 0.3, risky: 0.05, wander: 0.3, hesit: 0.15, aggro: 0.3, trap: 0.25, push: 0, mob: 0.2, sd: 0, shadow: 0.62, counter: 0, depth: 2 },
    difficile: { react: 0.25, period: 0.15, margin: 0.11, forget: 0.05, notice: 0.5, risky: 0, wander: 0, hesit: 0, aggro: 0.8, trap: 1, push: 1, mob: 0.8, sd: 1, shadow: 0.25, counter: 0, depth: 5 },
    extreme:   { react: 0.15, period: 0.08, margin: 0.16, forget: 0, notice: 0.5, risky: 0, wander: 0, hesit: 0, aggro: 1, trap: 1.6, push: 1, mob: 1.2, sd: 1, shadow: 0.12, counter: 2, depth: 8 }
  };
  const AI_SPIRAL = new Map();
  function aiNew(level, seed) {
    return { L: AI_LV[level] || AI_LV.moyen, level: AI_LV[level] ? level : 'moyen', rng: mulberry32(seed >>> 0), t: 0, next: 0,
      path: [], pdep: [], goal: -1, act: '', pushD: -1, pushT: 0, wantBomb: false, hesit: 0, hist: [], forgot: new Map(), nbSeen: -1,
      stuckT: 0, lastX: -9, lastY: -9, noBomb: new Map(), out: { mx: 0, my: 0, bomb: false }, opp: null, why: '',
      st: { crate: 0, hit: 0, trap: 0, push: 0, flee: 0 } };
  }
  function aiOpp(ai, S, me) {                      // où elle « voit » l'autre : avec son temps de réaction
    const O = S.actors[1 - me], h = ai.hist;
    h.push([S.t, O.x, O.y]);
    while (h.length > 2 && h[1][0] <= S.t - ai.L.react) h.shift();
    const e = h[0], x = Math.round(e[1]), y = Math.round(e[2]);
    return { x: e[1], y: e[2], cx: x, cy: y, cell: cellAt(S, x, y), alive: O.alive, speed: speedOf(O) };
  }
  function aiBombs(ai, S, me) {                    // les bombes qu'elle a remarquées (et où s'arrêtera une bombe qui glisse)
    const L = ai.L, out = [];
    for (const b of S.bombs) {
      const mine = b.owner === me;
      if (!mine && b.t < L.react) continue;
      if (!mine && L.forget) {
        if (!ai.forgot.has(b.id)) ai.forgot.set(b.id, ai.rng() < L.forget);
        if (ai.forgot.get(b.id) && b.fuse > (L.notice || 0.45)) continue;
      }
      let x = Math.round(b.x), y = Math.round(b.y);
      if (b.slide >= 0) {
        for (let k = 0; k < 20; k++) {
          const i = cellAt(S, x + DX[b.slide], y + DY[b.slide]);
          if (i < 0 || S.cells[i] !== EMPTY || bombAtCell(S, i)) break;
          x += DX[b.slide]; y += DY[b.slide];
        }
      }
      out.push({ x, y, ci: cellAt(S, x, y), te: Math.max(0, b.fuse), range: b.range, owner: b.owner });
    }
    return out;
  }
  // cases d'une explosion (gone : heure à laquelle une caisse / un bonus a disparu, s'il disparaît avant cette explosion)
  function aiBlast(S, x, y, range, bl, te, gone) {
    const out = [], ci = cellAt(S, x, y);
    if (ci < 0) return out;
    out.push(ci);
    for (let d = 0; d < 4; d++) {
      for (let r = 1; r <= range; r++) {
        const i = cellAt(S, x + DX[d] * r, y + DY[d] * r);
        if (i < 0) break;
        const c = S.cells[i], g = gone ? gone.get(i) : undefined, cleared = g !== undefined && g <= te;
        if (c === PILLAR || c === SOLID) break;
        if (c === BREAKING && !cleared) break;
        out.push(i);
        if (c === CRATE && !cleared) break;
        if (S.items[i] >= 0 && !cleared) break;
        let hit = false;
        for (const o of bl) if (o.ci === i && o.te >= te) { hit = true; break; }
        if (hit) break;
      }
    }
    return out;
  }
  // carte des dangers : pour chaque case, intervalles [début, fin] (s, à partir de maintenant) où elle tue
  // forP (2 contre 2 seulement) : POUR QUI ? ses flammes, ses bombes et celles d'en face tuent ; celles de son équipe passent
  // (mais comptent dans les réactions en chaîne et cassent les caisses). Duel : forP absent, tout tue.
  function aiDanger(ai, S, bl, forP) {
    const N = S.N, L = ai.L, dz = new Array(N).fill(null);
    const add = (i, a, b) => { (dz[i] || (dz[i] = [])).push(a, b); };
    const co = forP != null && !!S.coop;
    if (co) {
      const fo = S.fown;
      for (let i = 0; i < N; i++) {
        if (!(S.flameT[i] > FLAME_SAFE)) continue;
        let m = 0;
        for (let q = 0; q < NA; q++) if ((q === forP || foeOf(S, q, forP)) && fo[i * NA + q] > m) m = fo[i * NA + q];
        if (m > FLAME_SAFE) add(i, -1, m - FLAME_SAFE);
      }
    } else for (let i = 0; i < N; i++) if (S.flameT[i] > FLAME_SAFE) add(i, -1, S.flameT[i] - FLAME_SAFE);
    const list = bl.map((b) => ({ x: b.x, y: b.y, ci: b.ci, te: b.te, range: b.range, harm: !co || b.owner === forP || foeOf(S, b.owner, forP) }));
    for (let pass = 0; pass < 6; pass++) {         // réactions en chaîne : une bombe dans un souffle part 0,08 s après
      list.sort((a, b) => a.te - b.te);
      let ch = false;
      for (const A of list) {
        const cells = aiBlast(S, A.x, A.y, A.range, list, A.te, null);
        for (const B of list) if (B !== A && B.te > A.te + 0.08 && cells.indexOf(B.ci) >= 0) { B.te = A.te + 0.08; ch = true; }
      }
      if (!ch) break;
    }
    const gone = new Map();                        // caisses brisées / bonus brûlés par les explosions précédentes
    for (let i = 0; i < N; i++) if (S.cells[i] === BREAKING) gone.set(i, S.breakT[i]);
    list.sort((a, b) => a.te - b.te);
    for (const A of list) {
      const cells = aiBlast(S, A.x, A.y, A.range, list, A.te, gone);
      for (const i of cells) {
        if (A.harm) add(i, A.te, A.te + FLAME_DUR - FLAME_SAFE);
        if (!gone.has(i)) { if (S.cells[i] === CRATE) gone.set(i, A.te + BREAK_DUR); else if (S.items[i] >= 0) gone.set(i, A.te); }
      }
    }
    for (const f of S.sd.falling) if (DROP_WARN - f.t >= L.shadow) add(f.i, f.t - 0.08, 1e9);   // ombres des blocs qui tombent (remarquées après shadow s)
    if (L.sd) {                                    // la spirale qui se referme (le motif se voit) : les prochaines cases à tomber
      const sd = S.sd;
      let order = sd.order, idx = sd.idx, timer = sd.timer, t = 0;
      if (!sd.on) {
        const w = S.P.sdStart - S.t;
        if (w > 3.5) order = null;
        else {
          const key = S.cols + 'x' + S.rows;
          if (!AI_SPIRAL.has(key)) AI_SPIRAL.set(key, spiralOrder(S.cols, S.rows));
          order = AI_SPIRAL.get(key); idx = 0; timer = 0; t = Math.max(0, w);
        }
      }
      for (let g = 0; order && g < 400 && t < 3.2 && idx < order.length; g++) {
        if (timer > 0) { t += timer; timer = 0; continue; }
        const i = order[idx++];
        if (S.cells[i] === PILLAR || S.cells[i] === SOLID) continue;
        add(i, t + DROP_WARN - 0.1, 1e9);
        if (N - 1 - i !== i) add(N - 1 - i, t + DROP_WARN - 0.1, 1e9);
        timer += DROP_EVERY;
      }
    }
    return dz;
  }
  function dzHit(dz, i, a, b) { const z = dz[i]; if (!z) return false; for (let k = 0; k < z.length; k += 2) if (z[k] < b && z[k + 1] > a) return true; return false; }
  function dzFree(dz, i, a) { const z = dz[i]; if (!z) return true; for (let k = 0; k < z.length; k += 2) if (z[k + 1] > a) return false; return true; }
  function dzNext(dz, i, a) { let m = 1e9; const z = dz[i]; if (z) for (let k = 0; k < z.length; k += 2) if (z[k + 1] > a && z[k] < m) m = z[k]; return m; }
  // départ au plus tôt de la case i (où l'on est arrivé à l'heure ti) vers la case j, sans brûler : on peut ATTENDRE dans i
  // qu'une flamme s'éteigne dans j (i doit rester sûre pendant l'attente). e0 / e1 : délais entrée / centre de j après le départ ;
  // on est dans j de l'entrée jusqu'à une demi-case après son centre.
  function aiDepart(dz, i, j, ti, e0, e1, half, margin) {
    let dep = ti;
    for (let k = 0; k < 4; k++) {
      const a = dep + e0 - margin, b = dep + e1 + half + margin, z = dz[j];
      let end = -1;
      if (z) for (let q = 0; q < z.length; q += 2) if (z[q] < b && z[q + 1] > a && z[q + 1] > end) end = z[q + 1];
      if (end < 0) break;
      if (end > 1e8) return -1;                    // bloc tombé : plus jamais
      dep = end + margin - e0 + 1e-3;
    }
    if (dep > ti + 2.5) return -1;
    if (i >= 0 && dep > ti + 1e-4 && dzHit(dz, i, ti, dep + e0 + margin)) return -1;   // attendre dans i doit être sûr
    return dep;
  }
  // trajets sûrs depuis (x, y) à l'heure t0 : heure d'arrivée au centre de chaque case (avec attentes éventuelles)
  function aiPaths(S, x, y, t0, v, dz, margin, bl) {
    const N = S.N, at = new Float32Array(N).fill(1e9), dep = new Float32Array(N).fill(0), from = new Int16Array(N).fill(-1);
    const rx = Math.round(x), ry = Math.round(y), c0 = cellAt(S, rx, ry), half = 0.5 / v, step = 1 / v;
    const P = { at, dep, from, c0, half };
    if (c0 < 0) return P;
    at[c0] = t0;                                   // on y est déjà
    const bomb = new Uint8Array(N);
    for (const b of S.bombs) if (b.cell >= 0) bomb[b.cell] = 1;
    for (const b of bl) if (b.ci >= 0) bomb[b.ci] = 1;
    const q = [];
    // premier pas depuis la position EXACTE (souvent déjà à mi-chemin d'une case voisine) : entrée dans la case voisine =
    // rejoindre le couloir + atteindre la frontière ; centre = + une demi-case
    for (let d = 0; d < 4; d++) {
      const j = cellAt(S, rx + DX[d], ry + DY[d]);
      if (j < 0 || S.cells[j] !== EMPTY || bomb[j]) continue;
      const along = (x - rx) * DX[d] + (y - ry) * DY[d], perp = Math.abs((x - rx) * DY[d]) + Math.abs((y - ry) * DX[d]);
      const e0 = (perp + Math.max(0, 0.5 - along)) / v, e1 = (perp + 1 - along) / v;
      const t = aiDepart(dz, c0, j, t0, e0, e1, half, margin);
      if (t < 0) continue;
      at[j] = t + e1; dep[j] = t; from[j] = c0; q.push(j);
    }
    q.sort((a, b) => at[a] - at[b]);
    for (let h = 0; h < q.length && h < 4000; h++) {   // (une case atteinte plus tôt par un autre chemin est reprise)
      const i = q[h], cx = i % S.cols, cy = (i / S.cols) | 0;
      for (let d = 0; d < 4; d++) {
        const j = cellAt(S, cx + DX[d], cy + DY[d]);
        if (j < 0 || j === c0 || S.cells[j] !== EMPTY || bomb[j]) continue;
        if (at[i] + step >= at[j] - 1e-6) continue;
        const t = aiDepart(dz, i, j, at[i], half, step, half, margin);
        if (t < 0 || t + step >= at[j] - 1e-6) continue;
        at[j] = t + step; dep[j] = t; from[j] = i; q.push(j);
      }
    }
    return P;
  }
  function aiRoute(P, j) { const r = []; for (let k = j; k >= 0 && k !== P.c0 && r.length < 300; k = P.from[k]) r.push(k); return r.reverse(); }
  function aiGo(ai, P, j) {                        // suivre le trajet vers j (avec l'heure de départ de chaque étape : attentes)
    ai.path = j >= 0 && j !== P.c0 ? aiRoute(P, j) : [];
    ai.pdep = ai.path.map((k) => ai.t + P.dep[k]);
  }
  function aiHaven(dz, P, j, margin) { return P.at[j] < 1e9 && dzFree(dz, j, P.at[j] - P.half - margin); }
  function aiOpen(S, i) {                          // sorties autour d'une case (pour ne pas se faire coincer)
    let n = 0;
    const x = i % S.cols, y = (i / S.cols) | 0;
    for (let d = 0; d < 4; d++) { const j = cellAt(S, x + DX[d], y + DY[d]); if (j >= 0 && S.cells[j] === EMPTY && !bombAtCell(S, j)) n++; }
    return n;
  }
  function aiHunt(S, cell) {                       // distance jusqu'à l'autre (une caisse « coûte » 3 cases : il faudra la casser)
    const D = new Float32Array(S.N).fill(1e9);
    if (cell < 0) return D;
    D[cell] = 0;
    const q = [cell];
    for (let h = 0; h < q.length && h < 3000; h++) {
      const i = q[h], x = i % S.cols, y = (i / S.cols) | 0;
      for (let d = 0; d < 4; d++) {
        const j = cellAt(S, x + DX[d], y + DY[d]);
        if (j < 0) continue;
        const c = S.cells[j];
        if (c === PILLAR || c === SOLID) continue;
        const w = c === CRATE || c === BREAKING ? 3 : 1;
        if (D[i] + w < D[j]) { D[j] = D[i] + w; q.push(j); }
      }
    }
    return D;
  }
  // menace : l'autre peut-il, en moins de ~0,8 s, atteindre une case d'où sa bombe couvrirait la case j ?
  // (2 contre 2 : les deux ennemis debout qui ont encore une bombe ; ai.oThreat = le premier, ai.oThreat2 = le second)
  function aiThreatMap(ai, S, me, bl) {
    if (ai.co) {
      ai.oThreat = null; ai.oThreat2 = null;
      for (const f of ai.foes) {
        if (!f.alive) continue;
        const T = aiThreatOf(ai, S, S.actors[f.p], f);
        if (!T) continue;
        if (!ai.oThreat) ai.oThreat = T; else ai.oThreat2 = T;
      }
      return;
    }
    ai.oThreat = aiThreatOf(ai, S, S.actors[1 - me], ai.opp);
  }
  function aiThreatOf(ai, S, O, op) {
    if (!O.alive || !op || op.cell < 0 || O.active >= O.bombsMax || !ai.L.mob) return null;
    const reach = new Uint8Array(S.N), D = new Float32Array(S.N).fill(1e9), lim = 0.85 * op.speed;
    D[op.cell] = 0;
    const q = [op.cell];
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % S.cols, y = (i / S.cols) | 0;
      reach[i] = 1;
      for (let d = 0; d < 4; d++) {
        const j = cellAt(S, x + DX[d], y + DY[d]);
        if (j < 0 || D[j] < 1e9 || S.cells[j] !== EMPTY || bombAtCell(S, j) || D[i] + 1 > lim) continue;
        D[j] = D[i] + 1; q.push(j);
      }
    }
    return { reach, range: O.range };
  }
  function aiThreat(ai, S, bl, j) {                // pénalité d'une case exposée (cul-de-sac, couloir) à une bombe de l'autre
    const T = ai.oThreat;
    if (!T) return 0;
    if (ai.thrC) {                                 // (2 contre 2) une seule fois par case et par réflexion (aiThink remet le cache à zéro)
      const C = ai.thrC;
      if (C[j] < 9e8) return C[j];
      ai.thrC = null; const v = aiThreat(ai, S, bl, j); ai.thrC = C;
      C[j] = v;
      return v;
    }
    let hit = false;
    for (const k of aiBlast(S, j % S.cols, (j / S.cols) | 0, T.range, bl, 9, null)) if (T.reach[k]) { hit = true; break; }
    const T2 = ai.oThreat2;                        // (2 contre 2) le second ennemi
    if (!hit && T2) for (const k of aiBlast(S, j % S.cols, (j / S.cols) | 0, T2.range, bl, 9, null)) if (T2.reach[k]) { hit = true; break; }
    if (!hit) return 0;
    const o = aiOpen(S, j);
    return o <= 1 ? -12 * ai.L.mob : o === 2 ? -4 * ai.L.mob : -1 * ai.L.mob;
  }
  function aiItemValue(A, it) {
    if (it === IT_BOMB) return A.bombsMax < 3 ? 1 : A.bombsMax < 5 ? 0.6 : 0.2;
    if (it === IT_RANGE) return A.range < 4 ? 1 : A.range < 6 ? 0.5 : 0.15;
    if (it === IT_SPEED) return A.speedLvl < 2 ? 0.9 : A.speedLvl < 3 ? 0.4 : 0.05;
    if (it === IT_PUSH) return A.push ? 0.05 : 0.6;
    if (it === IT_SHIELD) return A.shield ? 0.1 : 1;
    return 0;
  }
  // une bombe posée en (cx, cy) à l'heure tc : existe-t-il une sortie sûre ? (renvoie l'abri choisi)
  function aiEscape(ai, S, me, bl, cx, cy, tc) {
    const A = S.actors[me], v = speedOf(A), ci = cellAt(S, cx, cy), L = ai.L;
    const bl2 = bl.concat([{ x: cx, y: cy, ci, te: tc + S.P.fuse, range: A.range, owner: me }]);
    const best = aiOut(ai, S, me, bl2, cx, cy, tc, v, false);
    if (!best) return null;
    // (extrême) et si l'autre répond tout de suite par une bombe là où il est (ou à un pas) ? Elle part avec la nôtre
    // (réaction en chaîne) : pas question de se retrouver prise en sandwich entre les deux
    // (2 contre 2 : l'ennemi debout le plus proche, ai.cop ; vérification sautée quand le budget de la réflexion est épuisé)
    const op = ai.co ? ai.cop : ai.opp, O = ai.co ? (op ? S.actors[op.p] : null) : S.actors[1 - me];
    if (ai.co && ai.bud <= 0) return best;
    if (L.counter && op && op.alive && op.cell >= 0 && O.active < O.bombsMax && Math.abs(op.cx - cx) + Math.abs(op.cy - cy) <= A.range + O.range + 2) {
      const cells = [[op.cell, 0]];
      if (L.counter > 1) {
        for (let d = 0; d < 4; d++) {
          const j = cellAt(S, op.cx + DX[d], op.cy + DY[d]);
          if (j >= 0 && S.cells[j] === EMPTY) cells.push([j, 1 / op.speed]);
        }
      }
      for (const [oc, dt] of cells) {
        if (oc === ci || bombAtCell(S, oc) || bl2.some((b) => b.ci === oc)) continue;
        if (ai.co && ai.bud <= 0) break;           // (2 contre 2) budget épuisé : on garde ce qui est vérifié
        const bl3 = bl2.concat([{ x: oc % S.cols, y: (oc / S.cols) | 0, ci: oc, te: tc + dt + S.P.fuse, range: O.range, owner: ai.co ? op.p : 1 - me }]);
        if (!aiOut(ai, S, me, bl3, cx, cy, tc, v, true)) return null;
      }
    }
    return best;
  }
  // l'abri où fuir après une bombe (bl2 la contient) ; (extrême) en écartant les fuites que l'autre peut boucher
  function aiOut(ai, S, me, bl2, cx, cy, tc, v, quick) {
    const dz2 = aiDanger(ai, S, bl2, ai.co ? me : undefined);
    if (ai.co) ai.bud--;                           // (2 contre 2) budget compté de la réflexion
    const P2 = aiPaths(S, cx, cy, tc, v, dz2, ai.L.margin, bl2);
    const hv = [];
    for (let j = 0; j < S.N; j++) if (j !== P2.c0 && aiHaven(dz2, P2, j, ai.L.margin)) hv.push([j, -P2.at[j] * 6 + aiThreat(ai, S, bl2, j)]);
    hv.sort((a, b) => b[1] - a[1]);
    const lim = ai.oT && !quick ? 3 : 1;
    for (let n = 0; n < hv.length && n < lim; n++) {
      const j = hv[n][0];
      if (ai.L.mob >= 0.8 && aiThreat(ai, S, bl2, j) <= -12 * ai.L.mob) continue;   // un cul-de-sac à sa portée
      if (lim > 1 && !aiRobust(ai, S, me, bl2, P2, j, v)) continue;
      return { cell: j, P: P2, bl: bl2 };
    }
    return null;
  }
  // l'autre peut-il arriver AVANT elle sur la case k du chemin (et la boucher d'une bombe) ? (il est vu avec du retard)
  function aiCutAt(ai, P, k) { return ai.oT[k] < P.at[k] - P.half + ai.L.react + 0.1; }
  // (extrême) la fuite vers j tient-elle si l'autre pose une bombe sur le chemin, là où il arrive avant elle ?
  // Elle ne s'en apercevrait qu'avec son temps de réaction : il lui faut alors encore un abri depuis là où elle serait.
  function aiRobust(ai, S, me, bl, P, j, v) {
    const O = ai.co ? (ai.cop ? S.actors[ai.cop.p] : null) : S.actors[1 - me];
    if (!ai.oT || !O || O.active >= O.bombsMax) return true;
    const route = aiRoute(P, j);
    let n = 0;
    for (const k of route) {
      if (!aiCutAt(ai, P, k)) continue;
      if (++n > 3) return false;
      if (ai.co) { if (ai.bud <= 0) return true; ai.bud--; }   // (2 contre 2) budget épuisé : on garde ce qu'on a vérifié
      const tb = Math.max(0, ai.oT[k]), tn = tb + ai.L.react;
      let r = P.c0;
      for (const q of route) { if (q === k || P.at[q] > tn) break; r = q; }
      const bl3 = bl.concat([{ x: k % S.cols, y: (k / S.cols) | 0, ci: k, te: tb + S.P.fuse, range: O.range, owner: ai.co ? O.p : 1 - me }]);
      const dz3 = aiDanger(ai, S, bl3, ai.co ? me : undefined);
      const P3 = aiPaths(S, r % S.cols, (r / S.cols) | 0, Math.max(tn, P.at[r]), v, dz3, ai.L.margin, bl3);
      let ok = false;
      for (let q = 0; q < S.N && !ok; q++) if (aiHaven(dz3, P3, q, ai.L.margin)) ok = true;
      if (!ok) return false;
    }
    return true;
  }
  // heure d'arrivée de l'autre dans chaque case (d'où il est vu)
  function aiReach(S, op, bl) {
    const T = new Float32Array(S.N).fill(1e9);
    if (!op || op.cell < 0) return T;
    const bomb = new Uint8Array(S.N);
    for (const b of S.bombs) if (b.cell >= 0) bomb[b.cell] = 1;
    for (const b of bl) if (b.ci >= 0) bomb[b.ci] = 1;
    T[op.cell] = 0;
    const q = [op.cell];
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % S.cols, y = (i / S.cols) | 0;
      for (let d = 0; d < 4; d++) {
        const j = cellAt(S, x + DX[d], y + DY[d]);
        if (j < 0 || T[j] < 1e9 || S.cells[j] !== EMPTY || bomb[j]) continue;
        T[j] = T[i] + 1 / op.speed; q.push(j);
      }
    }
    return T;
  }
  // combien d'abris l'autre peut-il encore atteindre (avec cette bombe en plus) ? 0 = il est piégé
  function aiHavens(ai, S, opp, bl, extra) {
    const bl2 = extra ? bl.concat([extra]) : bl;
    const dz2 = aiDanger(ai, S, bl2, ai.co ? opp.p : undefined);   // (2 contre 2) les dangers POUR LUI
    if (ai.co) ai.bud--;
    const P = aiPaths(S, opp.x, opp.y, 0, opp.speed, dz2, 0, bl2);
    let n = 0;
    for (let j = 0; j < S.N; j++) if (aiHaven(dz2, P, j, 0)) n++;
    return n;
  }
  // réflexion : où aller, et que faire en arrivant (poser une bombe, pousser)
  function aiThink(ai, S, me) {
    // 2 contre 2 (ai.co) : la cible est choisie ici (aiCoopTarget), dangers « pour moi », budget compté de vérifications,
    // repères de l'équipe (aiCoopPrep : coéquipier, bulle à sauver, autres ennemis) ; sans ai.co tout est comme avant.
    const co = ai.co;
    if (co) { aiCoopTarget(ai, S, me); ai.bud = ai.L.budget; }
    const L = ai.L, A = S.actors[me], v = speedOf(A), op = ai.opp, rng = ai.rng;
    const bl = aiBombs(ai, S, me), dz = aiDanger(ai, S, bl, co ? me : undefined), P = aiPaths(S, A.x, A.y, 0, v, dz, L.margin, bl);
    const c0 = P.c0, half = P.half, cols = S.cols;
    aiThreatMap(ai, S, me, bl);
    if (co) (ai.thrC || (ai.thrC = new Float32Array(S.N))).fill(1e9);
    ai.dz = dz; ai.dzT = ai.t;
    if (co) ai.oT = L.counter && ai.cop && ai.cop.alive && S.actors[ai.cop.p].alive ? aiReach(S, ai.cop, bl) : null;
    else ai.oT = L.counter && ai.opp && ai.opp.alive && S.actors[1 - me].alive ? aiReach(S, ai.opp, bl) : null;
    ai.act = ''; ai.pushD = -1;
    if (c0 < 0) { ai.path = []; return; }
    // Buts possibles = cases ABRIS (sûres pour toujours une fois atteintes) joignables par des passages sûrs dans le temps.
    // Si sa case va brûler, on choisit parmi eux en privilégiant le plus proche (on peut traverser une case qui brûlera
    // plus tard : pas de va-et-vient). Aucun abri joignable : fuite « au mieux » (voir plus bas).
    const danger0 = !dzFree(dz, c0, -0.5);
    if (L.hesit && !danger0 && rng() < L.hesit) ai.hesit = ai.t + 0.2 + 0.4 * rng();   // (facile) hésite parfois — jamais en danger
    const O = co ? (op ? S.actors[op.p] : null) : S.actors[1 - me], oAlive = !!O && O.alive && op && op.alive && op.cell >= 0;
    const canBomb = A.active < A.bombsMax;
    const sdNear = S.sd.on || S.P.sdStart - S.t < 6, mx = (cols - 1) / 2, my = (S.rows - 1) / 2;
    const HD = oAlive && L.aggro ? aiHunt(S, op.cell) : null;   // chasse : se rapprocher de l'autre, en cassant les caisses du chemin
    const oSh = O && O.shield ? 0.35 : 1;          // un bouclier encaisse une explosion : le piège ne fait que le lui enlever
    const mdir = A.moving && !danger0 ? A.dir : -1; // élan : faire demi-tour doit en valoir la peine (pas de volte-face pour rien)
    const K = co ? aiCoopPrep(ai, S, me, P, dz, bl) : null;
    const cands = [];
    for (let j = 0; j < S.N; j++) {
      const tj = P.at[j];
      if (tj >= 1e9 || !aiHaven(dz, P, j, L.margin)) continue;
      const jx = j % cols, jy = (j / cols) | 0;
      let s = -tj * 2, bombV = 0, hitOpp = false;
      if (S.items[j] >= 0) s += 9 * aiItemValue(A, S.items[j]);
      if (canBomb && S.cells[j] === EMPTY && !(ai.noBomb.get(j) > S.t)) {
        let cr = 0, route = 0, hit2 = 0;
        for (const i of aiBlast(S, jx, jy, A.range, bl, 9, null)) {
          if (S.cells[i] === CRATE) { cr++; if (HD && HD[i] < HD[j]) route++; }   // caisse qui barre le chemin vers l'autre
          if (oAlive && i === op.cell) hitOpp = true;
          if (K && K.hit) hit2 += K.hit[i];        // (2 contre 2) l'autre ennemi, ou (extrême) une bulle d'en face
        }
        if (cr) bombV += (3.2 * cr + 2.5 * L.aggro * route) * (S.sd.on ? 0.3 : 1);
        if (hitOpp) bombV += L.aggro * 12 * oSh;
        if (hit2) bombV += hit2;
      }
      if (HD && HD[j] < 1e9) s -= L.aggro * 0.9 * HD[j];
      if (sdNear && L.sd) s -= 1.6 * (Math.abs(jx - mx) + Math.abs(jy - my));
      if (L.mob) s += L.mob * 0.6 * aiOpen(S, j) + aiThreat(ai, S, bl, j);
      if (mdir >= 0) {
        let k = j;
        while (k !== c0 && P.from[k] >= 0 && P.from[k] !== c0) k = P.from[k];
        if ((k % cols - A.x) * DX[mdir] + (((k / cols) | 0) - A.y) * DY[mdir] < -0.3) s -= 2.5;
      }
      if (K) s += aiCoopTerm(ai, S, K, A, j, jx, jy, danger0);   // (2 contre 2) sauver, ne pas gêner, partager, politesse
      cands.push({ j, s, bombV, hitOpp, tj });
    }
    // (2 contre 2) la bulle à sauver n'est pas un abri (on en repart tout de suite) : but quand même, si on y arrive à temps
    if (K && K.resc >= 0 && !cands.some((c) => c.j === K.resc)) cands.push({ j: K.resc, s: K.rescV - P.at[K.resc] * 2, bombV: 0, hitOpp: false, tj: P.at[K.resc] });
    if (!cands.length) {                           // aucun abri joignable : on tente au mieux (marges réduites, sinon là où le danger arrive le plus tard)
      let best = -1, bs = -1e9, PP = P;
      for (const m of [L.margin, Math.min(L.margin, 0.05), 0]) {
        if (m !== L.margin) PP = aiPaths(S, A.x, A.y, 0, v, dz, m, bl);
        best = -1; bs = -1e9;
        let haven = false;
        for (let j = 0; j < S.N; j++) {
          if (PP.at[j] >= 1e9) continue;
          const h = aiHaven(dz, PP, j, m);
          const sc = h ? 100 - PP.at[j] * 10 + aiThreat(ai, S, bl, j) : dzNext(dz, j, PP.at[j]) - PP.at[j] - 50;
          if (sc > bs) { bs = sc; best = j; haven = h; }
        }
        if (haven || m === 0) break;
      }
      aiGo(ai, PP, best);
      ai.goal = best; ai.mode = 'fuite'; ai.act = '';
      return;
    }
    for (const c of cands) c.tot = c.s + c.bombV;
    cands.sort((a, b) => b.tot - a.tot);
    // buts « bombe » : il faut une sortie sûre une fois là-bas ; le piège se mesure aux abris qu'il reste à l'autre
    // (avec les bombes déjà posées et les réactions en chaîne, qui raccourcissent les mèches)
    const h0 = L.trap && oAlive ? aiHavens(ai, S, op, bl, null) : 99;
    const evalBomb = (c) => {
      c.done = true;
      if (co && ai.bud <= 0) { c.tot -= c.bombV; c.bombV = 0; return; }   // (2 contre 2) budget épuisé : pas de bombe non vérifiée
      const jx = c.j % cols, jy = (c.j / cols) | 0;
      const risky = L.risky && rng() < L.risky;
      if (!risky && !aiEscape(ai, S, me, bl, jx, jy, c.tj)) { c.tot -= c.bombV; c.bombV = 0; return; }
      if (K && !aiCoopBombOK(ai, S, K, me, bl, c.j, c.tj)) { c.tot -= c.bombV; c.bombV = 0; return; }   // (coéquipier) jamais coincer mon copain
      if (L.trap && oAlive && Math.abs(jx - op.cx) + Math.abs(jy - op.cy) <= A.range + 4 && (!co || ai.bud > 0)) {
        const h = aiHavens(ai, S, op, bl, { x: jx, y: jy, ci: c.j, te: c.tj + S.P.fuse, range: A.range, owner: me });
        c.trap = h === 0 && !O.shield;
        const v = (h === 0 ? 30 : Math.max(0, Math.min(h0, 12) - h) * 1.5 + Math.max(0, 5 - h) * 1.5) * L.trap * oSh;
        c.bombV += v; c.tot += v;
      }
    };
    let checked = 0;
    for (const c of cands) {
      if (checked >= L.depth) break;
      if (!c.bombV) continue;
      checked++;
      evalBomb(c);
    }
    if (L.trap >= 1 && oAlive && canBomb) {        // (difficile, extrême) les cases au plus près de l'autre : de quoi lui couper la route ?
      const dist = (c) => Math.abs(c.j % cols - op.cx) + Math.abs(((c.j / cols) | 0) - op.cy);
      const near = cands.filter((c) => !c.done && S.cells[c.j] === EMPTY && !(ai.noBomb.get(c.j) > S.t) && dist(c) <= A.range + 3);
      near.sort((a, b) => dist(a) - dist(b));
      for (const c of near.slice(0, co ? L.near : L.trap > 1.2 ? 6 : 3)) evalBomb(c);
    }
    cands.sort((a, b) => b.tot - a.tot);
    if (danger0 && ai.oT) {                        // (extrême) en danger : pas de fuite que l'autre pourrait boucher d'une bombe
      for (let n = 0; n < cands.length && n < (co ? L.robN : 6); n++) if (!aiRobust(ai, S, me, bl, P, cands[n].j, v)) cands[n].tot -= 60;
      cands.sort((a, b) => b.tot - a.tot);
    }
    let pick = cands[0];
    // constance : on garde son but tant qu'il tient (pas de va-et-vient entre deux idées qui se valent)
    if (pick && ai.goal >= 0 && ai.goal !== c0 && ai.goal !== pick.j) {
      const prev = cands.find((c) => c.j === ai.goal);
      if (prev && (prev.bombV > 0) === (ai.act === 'bomb') && pick.tot - prev.tot < 3) pick = prev;
    }
    if (L.wander && cands.length > 3 && rng() < L.wander * 0.35) pick = cands[(rng() * Math.min(cands.length, 12)) | 0];
    if (!pick) { ai.path = []; return; }
    // 3) pousser une bombe vers l'autre (avec le gant), si c'est mieux
    if (L.push && A.push && oAlive) {
      const cx = c0 % cols, cy = (c0 / cols) | 0;
      for (let d = 0; d < 4; d++) {
        const b = bombAtCell(S, cellAt(S, cx + DX[d], cy + DY[d]));
        if (!b || b.slide >= 0 || b.pass[me] || b.fuse < 0.5) continue;
        let x = cx + DX[d], y = cy + DY[d];
        for (let k = 0; k < 20; k++) {
          const i = cellAt(S, x + DX[d], y + DY[d]);
          if (i < 0 || S.cells[i] !== EMPTY || bombAtCell(S, i) || i === op.cell) break;
          x += DX[d]; y += DY[d];
        }
        if (x === cx + DX[d] && y === cy + DY[d]) continue;            // elle ne bougerait pas
        const blast = aiBlast(S, x, y, b.range, bl, 9, null);
        if (blast.indexOf(op.cell) < 0 || blast.indexOf(c0) >= 0) continue;
        const h = aiHavens(ai, S, op, bl.filter((o) => o.ci !== b.cell), { x, y, ci: cellAt(S, x, y), te: b.fuse, range: b.range, owner: b.owner });
        if (12 * L.aggro + (h === 0 ? 20 : Math.max(0, 6 - h)) > pick.tot) { ai.pushD = d; ai.pushT = ai.t + 0.35; ai.path = []; ai.st.push++; return; }
      }
    }
    ai.goal = pick.j; ai.mode = danger0 ? 'fuite' : 'but';
    if (K && pick.j === K.resc) ai.mode = 'sauve';  // (2 contre 2) repère visuel : la ligne robot → bulle pulse
    ai.act = pick.bombV > 0 ? 'bomb' : '';
    aiGo(ai, P, pick.j);
    // déjà sur place : poser la bombe maintenant
    if (ai.act === 'bomb' && pick.j === c0 && canBomb && !bombAtCell(S, c0) && S.flameT[c0] <= 0) {
      const cx = c0 % cols, cy = (c0 / cols) | 0;
      if (co) ai.bud = Math.max(ai.bud, 6);        // (2 contre 2) la vérification finale a toujours de quoi se faire
      if ((L.risky && rng() < L.risky) || (aiEscape(ai, S, me, bl, cx, cy, 0) && (!K || aiCoopBombOK(ai, S, K, me, bl, c0, 0)))) { ai.wantBomb = true; ai.st[pick.trap ? 'trap' : pick.hitOpp ? 'hit' : 'crate']++; }
      else ai.noBomb.set(c0, S.t + 1.5);
    }
  }
  // une image : l'entrée { mx, my, bomb } du joueur me (comme une manette)
  function aiTick(ai, S, me, dt) {
    const L = ai.L, A = S.actors[me], out = ai.out;
    out.mx = 0; out.my = 0; out.bomb = false;
    ai.t += dt;
    ai.opp = aiOpp(ai, S, me);
    if (!A.alive || S.result) return out;
    let nb = 0;
    for (const b of S.bombs) if (b.owner === me || b.t >= L.react) nb++;
    if (nb !== ai.nbSeen) { ai.nbSeen = nb; ai.next = Math.min(ai.next, ai.t); }   // une bombe de plus (ou de moins) remarquée
    // bloquée (une bombe, un bloc…) : on repense
    if (Math.abs(A.x - ai.lastX) + Math.abs(A.y - ai.lastY) > 0.02) { ai.lastX = A.x; ai.lastY = A.y; ai.stuckT = 0; }
    else if ((ai.path.length && !(ai.pdep[0] > ai.t) || ai.pushD >= 0) && (ai.stuckT += dt) > 0.4) { ai.stuckT = 0; ai.next = ai.t; ai.path = []; }
    let thought = false;
    if (ai.t >= ai.next) { aiThink(ai, S, me); ai.next = ai.t + L.period * (0.75 + 0.5 * ai.rng()); thought = true; }
    if (ai.hesit > ai.t) return out;
    if (ai.wantBomb) { out.bomb = true; ai.wantBomb = false; }
    if (ai.pushD >= 0) {
      if (ai.t > ai.pushT) { ai.pushD = -1; ai.next = ai.t; }
      else { out.mx = DX[ai.pushD]; out.my = DY[ai.pushD]; return out; }
    }
    const cols = S.cols;
    while (ai.path.length) {                       // case suivante du trajet (on passe à la suivante près de son centre)
      const k = ai.path[0], kx = k % cols, ky = (k / cols) | 0;
      if (Math.abs(A.x - kx) + Math.abs(A.y - ky) < (ai.path.length > 1 ? 0.3 : 0.1)) {
        ai.path.shift(); ai.pdep.shift();
        if (!ai.path.length) {                     // arrivée : on repense tout de suite, sans marquer d'arrêt
          if (thought) { ai.next = ai.t; break; }
          thought = true;
          aiThink(ai, S, me); ai.next = ai.t + L.period * (0.75 + 0.5 * ai.rng());
          if (ai.wantBomb) { out.bomb = true; ai.wantBomb = false; }
          if (ai.pushD >= 0 || ai.hesit > ai.t) break;
        }
        continue;
      }
      if (ai.pdep[0] > ai.t + 0.01 && ai.dz) {     // en avance sur le plan : on n'attend que si entrer maintenant serait dangereux
        const tt = ai.t - ai.dzT, dd = Math.abs(A.x - kx) + Math.abs(A.y - ky), v = speedOf(A);
        if (dzHit(ai.dz, k, tt + Math.max(0, dd - 0.5) / v - L.margin, tt + (dd + 0.5) / v + L.margin)) break;
      }
      // réflexe : ne jamais mettre le pied dans une flamme qui brûle encore, ni sous un bloc qui tombe
      if (Math.abs(A.x - kx) + Math.abs(A.y - ky) < 0.66) {
        let bad = S.flameT[k] > FLAME_SAFE - 0.02;
        for (const f of S.sd.falling) if (f.i === k && f.t < 0.2) bad = true;
        if (bad) break;
      }
      const dx = kx - A.x, dy = ky - A.y, l = Math.hypot(dx, dy) || 1;
      out.mx = dx / l; out.my = dy / l;
      break;
    }
    return out;
  }

  // ===========================================================================
  // 2 ter bis. IA du 2 contre 2 : le robot COÉQUIPIER (place 1) et les robots d'en face BIP (2) et BOP (3), avec le même moteur
  // que le duel (aiThink, généralisé : ai.co). Mêmes règles et mêmes vitesses qu'un joueur, sans tricher (bonus cachés inconnus,
  // temps de réaction). Ordonnanceur OBLIGATOIRE : au plus UNE réflexion par image pour toutes les IA (les urgences d'abord :
  // bombe remarquée, coincé, arrivé au but), budget COMPTÉ de vérifications par réflexion (appels aiPaths : reproductible),
  // garde-fou chronométré (réflexion > 6 ms → période de cette IA × 1,25 pendant 5 s ; seulement si l'ordonnanceur est « timed »).
  // ===========================================================================
  // niveaux de BIP et BOP. tgt : choix de la cible — 'vv' son vis-à-vis seulement (BOP → moi, BIP → mon coéquipier), 'vv2' son
  // vis-à-vis puis l'autre, 'spread' cibles réparties, 'pince' les deux sur le joueur qui a le moins d'abris ;
  // rescue : sauve son coéquipier ; pop : vise les bulles ; budget : appels aiPaths de vérification par réflexion ;
  // near / robN : pièges « au plus près » et fuites vérifiées contre une bombe de l'autre (extrême)
  // Calés par les tournois de l'atelier (tests/tourney2.js, P0 = robot « enfant » maladroit + robot coéquipier, 200 manches par
  // niveau, 15 oct. 2026) : manches gagnées par l'équipe Facile ~82 %, Moyen ~47-51 %, Difficile ~26 %, Extrême ~6 %.
  const AI_LV2 = {
    facile:    Object.assign({}, AI_LV.facile, { react: 0.75, aggro: 0.06, forget: 0.8, notice: 0.18, wander: 0.5, risky: 0.12, trap: 0,
      period: 0.36, budget: 6, near: 3, robN: 3, rescue: 0, pop: 0, tgt: 'vv' }),
    moyen:     Object.assign({}, AI_LV.moyen, { react: 0.42, forget: 0.36, wander: 0.2, hesit: 0.08, risky: 0.04, aggro: 0.4, trap: 0.4, mob: 0.33,
      period: 0.3, budget: 6, near: 3, robN: 3, rescue: 0, pop: 0, tgt: 'vv2' }),
    difficile: Object.assign({}, AI_LV.difficile, { react: 0.4, forget: 0.2, wander: 0.05, hesit: 0.03, risky: 0.02, aggro: 0.45, trap: 0.5, mob: 0.4,
      push: 0.5, depth: 4, shadow: 0.4, period: 0.18, budget: 8, near: 3, robN: 3, rescue: 1, pop: 0, tgt: 'spread' }),
    extreme:   Object.assign({}, AI_LV.extreme, { period: 0.12, depth: 5, budget: 12, near: 4, robN: 3, rescue: 1, pop: 1, tgt: 'pince' })
  };
  // le robot coéquipier : agressivité, pièges et vitesse de réflexion du niveau choisi, mais jamais plus maladroit que « Moyen »
  // pour survivre (un équipier qui se jette dans les flammes, c'est la frustration assurée)
  function aiMateLv(level) {
    const b = AI_LV[level] || AI_LV.moyen, q = AI_LV2[level] || AI_LV2.moyen;
    return Object.assign({}, b, { forget: Math.min(0.3, b.forget), risky: 0, wander: Math.min(0.15, b.wander), hesit: 0,
      period: q.period, budget: q.budget, depth: Math.min(b.depth, q.depth), near: q.near, robN: q.robN, rescue: 1, pop: 0, tgt: 'mate' });
  }
  // une IA du 2 contre 2 pour l'acteur me : role 'mate' (coéquipier de human) ou 'foe' ; shared : objet commun aux deux robots
  // d'en face (cibles, pince)
  function aiNew2(level, seed, o) {
    const ai = aiNew(level, seed);
    const me = o.me, team = TEAM2[me];
    ai.L = o.role === 'mate' ? aiMateLv(ai.level) : AI_LV2[ai.level];
    ai.co = { role: o.role, me, team, human: o.human == null ? 0 : o.human, vv: me === 2 ? 1 : 0, right: me === 1 || me === 2, shared: o.shared || { tgt: {}, pin: -1, pinT: -9 } };
    ai.hs = [[], [], [], []]; ai.foes = []; ai.mates = []; ai.cop = null; ai.urg = 0; ai.bud = 0; ai.bubSeen = [false, false, false, false];
    return ai;
  }
  // ce qu'elle « voit » des autres (positions avec son temps de réaction, comme aiOpp), chaque image
  function aiSee(ai, S, me) {
    const R = ai.L.react;
    ai.foes.length = 0; ai.mates.length = 0;
    for (const O of S.actors) {
      if (O.p === me) continue;
      const h = ai.hs[O.p];
      h.push([S.t, O.x, O.y]);
      while (h.length > 2 && h[1][0] <= S.t - R) h.shift();
      const e = h[0], x = Math.round(e[1]), y = Math.round(e[2]);
      const f = { p: O.p, x: e[1], y: e[2], cx: x, cy: y, cell: cellAt(S, x, y), alive: O.alive, bub: O.state === 'bulle', bubT: O.bubT, speed: speedOf(O) };
      if (f.bub && !ai.bubSeen[O.p]) { ai.bubSeen[O.p] = true; ai.next = Math.min(ai.next, ai.t + R); }   // une bulle vient d'apparaître
      if (!f.bub) ai.bubSeen[O.p] = false;
      (O.team === ai.co.team ? ai.mates : ai.foes).push(f);
    }
    // l'ennemi debout le plus proche (contre-attaque et fuites « robustes » de l'extrême)
    const A = S.actors[me], ax = Math.round(A.x), ay = Math.round(A.y);
    let best = null, bd = 1e9;
    for (const f of ai.foes) if (f.alive && f.cell >= 0) { const d = Math.abs(f.cx - ax) + Math.abs(f.cy - ay); if (d < bd) { bd = d; best = f; } }
    ai.cop = best;
  }
  // la cible de la réflexion (ai.opp) parmi les ennemis debout
  function aiCoopTarget(ai, S, me) {
    const co = ai.co, L = ai.L, F = ai.foes, sh = co.shared;
    const up = F.filter((f) => f.alive && f.cell >= 0);
    let pick = null;
    if (up.length) {
      const A = S.actors[me], ax = Math.round(A.x), ay = Math.round(A.y);
      const md = (f, x, y) => Math.abs(f.cx - x) + Math.abs(f.cy - y);
      if (L.tgt === 'vv' || L.tgt === 'vv2') {
        pick = up.find((f) => f.p === co.vv) || (L.tgt === 'vv2' ? up[0] : null);
      } else if (L.tgt === 'mate') {
        const H = ai.mates.find((m) => m.p === co.human);
        const hx = H ? H.cx : ax, hy = H ? H.cy : ay;
        pick = up.slice().sort((a, b) => md(a, hx, hy) - md(b, hx, hy))[0];   // le robot le plus proche de mon copain
      } else {
        const HD = aiHunt(S, cellAt(S, ax, ay));
        const hd = (f) => (HD[f.cell] < 1e9 ? HD[f.cell] : 99);
        up.sort((a, b) => hd(a) - hd(b));
        pick = up[0];
        if (L.tgt === 'pince' && up.length > 1) {
          if (S.t - sh.pinT > 0.5 || !up.some((f) => f.p === sh.pin)) {   // les deux robots visent le joueur qui a le moins d'abris
            const bl = aiBombs(ai, S, me);
            let bp = -1, bh = 1e9;
            for (const f of up) { const h = aiHavens(ai, S, f, bl, null); if (h < bh) { bh = h; bp = f.p; } }
            sh.pin = bp; sh.pinT = S.t;
          }
          pick = up.find((f) => f.p === sh.pin) || pick;
        } else if (L.tgt === 'spread' && up.length > 1) {          // cibles réparties : si l'autre robot vise déjà le plus proche
          const other = me === 2 ? 3 : 2;
          if (sh.tgt[other] === up[0].p && hd(up[1]) <= hd(up[0]) + 4) pick = up[1];
        }
      }
    }
    sh.tgt[me] = pick ? pick.p : -1;
    ai.opp = pick;
  }
  // repères de l'équipe pour la réflexion : K = { hum (mon copain, s'il est debout), hd (distance), h0 (ses abris sans ma bombe),
  // resc (case d'une bulle de mon équipe à sauver, atteinte à temps), rescV, hit (valeur des autres ennemis sous une bombe) }
  function aiCoopPrep(ai, S, me, P, dz, bl) {
    const co = ai.co, L = ai.L, A = S.actors[me], ax = Math.round(A.x), ay = Math.round(A.y);
    const K = { hum: null, hd: 99, h0: 99, far: false, resc: -1, rescT: 1e9, rescV: 0, hit: null };
    if (co.role === 'mate') {
      const H = ai.mates.find((m) => m.p === co.human);
      if (H && H.alive && H.cell >= 0) {
        K.hum = H; K.hd = Math.abs(H.cx - ax) + Math.abs(H.cy - ay); K.far = K.hd > 8;
        if (K.hd <= A.range + 6) K.h0 = aiHavens(ai, S, H, bl, null);
      }
    }
    if (L.rescue) {
      for (const m of ai.mates) {
        if (!m.bub || m.cell < 0) continue;
        const t = P.at[m.cell];
        if (t >= 1e9 || t + 0.3 > m.bubT) continue;                 // trop loin : la bulle crèverait avant
        if (dzNext(dz, m.cell, t - P.half) < t + 0.6) continue;      // la case va brûler : on n'y court pas
        if (m.bubT < K.rescT) { K.resc = m.cell; K.rescT = m.bubT; K.rescV = co.role === 'mate' ? 40 : 30; }
      }
    }
    for (const f of ai.foes) {
      if (f.cell < 0 || (ai.opp && f.p === ai.opp.p)) continue;
      let v = 0;
      if (f.alive) v = L.aggro * 8 * (S.actors[f.p].shield ? 0.35 : 1);
      else if (f.bub && L.pop) v = L.aggro * 10;
      if (!v) continue;
      (K.hit || (K.hit = new Float32Array(S.N)))[f.cell] += v;
    }
    return K;
  }
  // termes d'équipe d'un but j
  function aiCoopTerm(ai, S, K, A, j, jx, jy, danger0) {
    const co = ai.co;
    let s = 0;
    if (j === K.resc) s += K.rescV;                                  // sauver d'abord (plus fort que tout, sauf sa propre fuite)
    if (S.t < 15 && (jx >= (S.cols - 1) / 2) === co.right) s += 0.8; // au début, chacun casse les caisses de son côté
    const H = K.hum;
    if (co.role === 'mate' && H) {
      const d = Math.abs(jx - H.cx) + Math.abs(jy - H.cy);
      if (!danger0) { if (d <= 1) s -= 6; else if (d <= 2) s -= 2; } // ne pas gêner (pas dans ses pattes)
      if (K.far) s -= 0.5 * Math.max(0, d - 5);                     // trop loin de lui : on revient à 3-5 cases
      if (S.items[j] >= 0) {                                         // politesse : le bonus près de lui est pour lui
        const dm = Math.abs(jx - Math.round(A.x)) + Math.abs(jy - Math.round(A.y));
        if (d <= 4 && d < dm) s -= 9 * aiItemValue(A, S.items[j]) * 0.7;
      }
    }
    return s;
  }
  // (coéquipier) une bombe en j ne doit jamais coincer mon copain (même sans tir ami, elle peut lui couper la fuite)
  function aiCoopBombOK(ai, S, K, me, bl, j, tj) {
    if (ai.co.role !== 'mate' || !K.hum) return true;
    const H = K.hum, A = S.actors[me], jx = j % S.cols, jy = (j / S.cols) | 0;
    const d = Math.abs(jx - H.cx) + Math.abs(jy - H.cy);
    if (d <= 2 && aiOpen(S, j) <= 2) return false;                   // pas de bombe dans un couloir juste à côté de lui
    if (d > A.range + 6 || K.h0 === 0) return true;                  // loin de lui (ou déjà coincé sans elle)
    if (ai.bud <= 0) return false;                                   // pas de quoi vérifier : on s'abstient
    return aiHavens(ai, S, H, bl, { x: jx, y: jy, ci: j, te: tj + S.P.fuse, range: A.range, owner: me }) > 0;
  }
  // ---- ordonnanceur
  function aiSchedNew(timed) { return { list: [], timed: !!timed, frames: 0, thinks: 0, last: 0 }; }
  function aiSchedAdd(sc, ai, p) { sc.list.push({ ai, p, slowUntil: -1 }); return ai; }
  // une image pour toutes les IA : perception, UNE réflexion au plus, puis chacune suit son plan. Les sorties sont dans ai.out.
  function aiTickN(sc, S, dt) {
    sc.frames++;
    let best = null, bw = -1;
    for (const e of sc.list) {
      const ai = e.ai, A = S.actors[e.p], L = ai.L, out = ai.out;
      out.mx = 0; out.my = 0; out.bomb = false;
      ai.t += dt;
      aiSee(ai, S, e.p);
      if (!A.alive || S.result) { ai.path = []; continue; }
      let nb = 0;
      for (const b of S.bombs) if (b.owner === e.p || b.t >= L.react) nb++;
      if (nb !== ai.nbSeen) { ai.nbSeen = nb; ai.next = Math.min(ai.next, ai.t); ai.urg = 2; }   // une bombe de plus (ou de moins) remarquée
      if (Math.abs(A.x - ai.lastX) + Math.abs(A.y - ai.lastY) > 0.02) { ai.lastX = A.x; ai.lastY = A.y; ai.stuckT = 0; }
      else if ((ai.path.length && !(ai.pdep[0] > ai.t) || ai.pushD >= 0) && (ai.stuckT += dt) > 0.4) { ai.stuckT = 0; ai.next = ai.t; ai.path = []; ai.urg = 2; }
      if (ai.t >= ai.next) {
        const w = ai.urg * 100 + (ai.t - ai.next);
        if (w > bw) { bw = w; best = e; }
      }
    }
    if (best) {
      const ai = best.ai;
      const t0 = sc.timed ? performance.now() : 0;
      aiThink(ai, S, best.p);
      let per = ai.L.period * (0.75 + 0.5 * ai.rng());
      if (sc.timed) { const ms = performance.now() - t0; sc.last = ms; if (ms > 6) best.slowUntil = ai.t + 5; }
      if (best.slowUntil > ai.t) per *= 1.25;
      ai.next = ai.t + per; ai.urg = 0;
      sc.thinks++;
    }
    for (const e of sc.list) if (S.actors[e.p].alive && !S.result) aiFollow(e.ai, S, e.p);
  }
  // suivre le plan (comme la fin d'aiTick) ; arrivé au but : on repense à l'image suivante (urgence)
  function aiFollow(ai, S, me) {
    const L = ai.L, A = S.actors[me], out = ai.out;
    if (ai.hesit > ai.t) return;
    if (ai.wantBomb) { out.bomb = true; ai.wantBomb = false; }
    if (ai.pushD >= 0) {
      if (ai.t > ai.pushT) { ai.pushD = -1; ai.next = ai.t; ai.urg = Math.max(ai.urg, 1); }
      else { out.mx = DX[ai.pushD]; out.my = DY[ai.pushD]; return; }
    }
    const cols = S.cols;
    while (ai.path.length) {
      const k = ai.path[0], kx = k % cols, ky = (k / cols) | 0;
      if (Math.abs(A.x - kx) + Math.abs(A.y - ky) < (ai.path.length > 1 ? 0.3 : 0.1)) {
        ai.path.shift(); ai.pdep.shift();
        if (!ai.path.length) { ai.next = Math.min(ai.next, ai.t); ai.urg = Math.max(ai.urg, 1); break; }
        continue;
      }
      if (ai.pdep[0] > ai.t + 0.01 && ai.dz) {
        const tt = ai.t - ai.dzT, dd = Math.abs(A.x - kx) + Math.abs(A.y - ky), v = speedOf(A);
        if (dzHit(ai.dz, k, tt + Math.max(0, dd - 0.5) / v - L.margin, tt + (dd + 0.5) / v + L.margin)) break;
      }
      if (Math.abs(A.x - kx) + Math.abs(A.y - ky) < 0.66) {          // réflexe : jamais le pied dans une flamme qui ME brûle
        let bad = false;
        if (S.flameT[k] > FLAME_SAFE - 0.02) for (let q = 0; q < NA; q++) if ((q === me || foeOf(S, q, me)) && S.fown[k * NA + q] > FLAME_SAFE - 0.02) { bad = true; break; }
        for (const f of S.sd.falling) if (f.i === k && f.t < 0.2) bad = true;
        if (bad) break;
      }
      const dx = kx - A.x, dy = ky - A.y, l = Math.hypot(dx, dy) || 1;
      out.mx = dx / l; out.my = dy / l;
      break;
    }
  }

  // ===========================================================================
  // 3. Peinture — sprites pré-rendus (repère « unité = une case », origine au centre)
  // ===========================================================================
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
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(255,252,236,1)', 0.16, 'rgba(255,226,130,0.98)', 0.4, 'rgba(255,132,36,0.7)', 0.7, 'rgba(190,40,20,0.25)', 1, 'rgba(90,10,20,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkScorch() {                           // trace de brûlé : tache de suie en étoile (dessinée tournée)
    const cv = mkCanvas(96, 96), c = cv.getContext('2d');
    c.fillStyle = rad(c, 48, 48, 0, 48, 48, 48, [0, 'rgba(10,5,2,0.75)', 0.45, 'rgba(14,8,4,0.45)', 1, 'rgba(14,8,4,0)']);
    c.fillRect(0, 0, 96, 96);
    c.strokeStyle = 'rgba(18,9,4,0.6)'; c.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + hash(k * 2.3) * 0.5, l = 26 + 18 * hash(k * 3.1);
      c.lineWidth = 3 + 3 * hash(k * 1.7);
      c.beginPath(); c.moveTo(48 + Math.cos(a) * 8, 48 + Math.sin(a) * 8); c.lineTo(48 + Math.cos(a) * l, 48 + Math.sin(a) * l); c.stroke();
    }
    return cv;
  }
  function mkShade() {                            // ombre douce (occlusion) sous les objets
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(0,0,0,0.62)', 0.55, 'rgba(0,0,0,0.38)', 1, 'rgba(0,0,0,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkSmokeLight() {                       // fumée claire (visible sur le sol sombre)
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(176,170,182,0.7)', 0.45, 'rgba(136,130,146,0.4)', 1, 'rgba(100,94,110,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkBand() {                             // bras de flamme : bande horizontale, dégradé dans l'épaisseur
    const cv = mkCanvas(32, 64), c = cv.getContext('2d');
    c.fillStyle = lin(c, 0, 0, 0, 64, [0, 'rgba(170,24,10,0)', 0.1, 'rgba(220,58,18,0.45)', 0.26, 'rgba(255,118,30,0.85)', 0.4, 'rgba(255,190,80,0.95)',
      0.5, 'rgba(255,236,170,1)', 0.6, 'rgba(255,190,80,0.95)', 0.74, 'rgba(255,118,30,0.85)', 0.9, 'rgba(220,58,18,0.45)', 1, 'rgba(170,24,10,0)']);
    c.fillRect(0, 0, 32, 64);
    return cv;
  }
  function mkFlameBall() {                        // boule de feu orangée (le blanc n'apparaît que là où le feu s'empile)
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(255,236,170,1)', 0.22, 'rgba(255,196,80,0.95)', 0.5, 'rgba(255,120,28,0.62)', 0.78, 'rgba(200,44,16,0.24)', 1, 'rgba(120,16,10,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkFireStrip() {                        // texture de feu turbulente, répétable en x (défile le long des bras)
    const cv = mkCanvas(256, 64), c = cv.getContext('2d');
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * 256, y = 32 + (Math.random() + Math.random() - 1) * 13, r = 7 + Math.random() * 15;
      const hot = Math.random() < 0.4;
      for (const ox of [-256, 0, 256]) {
        c.fillStyle = rad(c, x + ox, y, 0, x + ox, y, r, hot
          ? [0, 'rgba(255,240,190,0.9)', 0.5, 'rgba(255,170,60,0.5)', 1, 'rgba(255,90,20,0)']
          : [0, 'rgba(255,150,40,0.8)', 0.55, 'rgba(230,70,20,0.35)', 1, 'rgba(160,20,10,0)']);
        c.fillRect(x + ox - r, y - r, r * 2, r * 2);
      }
    }
    return cv;
  }
  // sprite carré de « u » cases, net à « px » pixels par case
  function mkSpr(u, px, fn) {
    const n = Math.max(2, Math.round(u * px));
    const cv = mkCanvas(n, n), c = cv.getContext('2d');
    c.setTransform(n / u, 0, 0, n / u, n / 2, n / 2);
    c.lineJoin = 'round'; c.lineCap = 'round';
    try { fn(c); } catch (e) { /* un sprite raté ne casse pas le jeu */ }
    return { cv, u };
  }

  // ---- pilier : bloc de faïence indestructible (éclairage centré : beau des deux côtés)
  function paintPillar(c) {
    rrect(c, -0.48, -0.48, 0.96, 0.96, 0.15); c.fillStyle = '#081118'; c.fill();
    rrect(c, -0.45, -0.45, 0.9, 0.9, 0.13);
    c.fillStyle = rad(c, 0, 0, 0.05, 0, 0, 0.66, [0, '#7aa2bd', 0.55, '#4b7290', 1, '#25425a']); c.fill();
    c.strokeStyle = 'rgba(210,240,255,0.55)'; c.lineWidth = 0.028;
    rrect(c, -0.4, -0.4, 0.8, 0.8, 0.1); c.stroke();
    // 4 carreaux, joints, reflets tournés vers le centre du bloc
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx * 0.19, y = sy * 0.19;
      rrect(c, x - 0.16, y - 0.16, 0.32, 0.32, 0.05);
      c.fillStyle = rad(c, x - sx * 0.04, y - sy * 0.04, 0.01, x, y, 0.24, [0, '#9cc4dc', 0.6, '#5f87a3', 1, '#3d6079']); c.fill();
      ell(c, x - sx * 0.05, y - sy * 0.05, 0.07, 0.035, sx * sy > 0 ? -0.78 : 0.78); c.fillStyle = 'rgba(255,255,255,0.45)'; c.fill();
    }
    c.strokeStyle = 'rgba(6,16,24,0.75)'; c.lineWidth = 0.035;
    c.beginPath(); c.moveTo(-0.36, 0); c.lineTo(0.36, 0); c.moveTo(0, -0.36); c.lineTo(0, 0.36); c.stroke();
  }

  // ---- caisses : 0 pack de rouleaux de papier toilette, 1 carton de savons, 2 panier de serviettes roulées
  function paintRolls(c) {
    rrect(c, -0.46, -0.46, 0.92, 0.92, 0.17); c.fillStyle = 'rgba(10,22,32,0.9)'; c.fill();
    rrect(c, -0.44, -0.44, 0.88, 0.88, 0.16); c.fillStyle = 'rgba(215,236,255,0.2)'; c.fill();
    for (const [x, y] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) {
      circ(c, x, y, 0.2);
      c.fillStyle = rad(c, x, y, 0.06, x, y, 0.2, [0, '#ffffff', 0.55, '#f3f7fa', 0.82, '#d6e0e8', 1, '#a9b9c6']); c.fill();
      c.strokeStyle = 'rgba(90,110,130,0.7)'; c.lineWidth = 0.014; c.stroke();
      c.strokeStyle = 'rgba(140,160,180,0.45)'; c.lineWidth = 0.011;
      c.beginPath(); c.arc(x, y, 0.15, 0.4, 2.5); c.stroke();
      c.beginPath(); c.arc(x, y, 0.12, 3.5, 5.7); c.stroke();
      circ(c, x, y, 0.074); c.fillStyle = '#d4a46c'; c.fill();
      circ(c, x, y, 0.05); c.fillStyle = '#3f2a16'; c.fill();
    }
    // bande rose de l'emballage + petits cœurs
    c.fillStyle = 'rgba(255,95,174,0.92)'; c.fillRect(-0.44, -0.06, 0.88, 0.12);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (const x of [-0.25, 0, 0.25]) { circ(c, x - 0.017, -0.006, 0.02); c.fill(); circ(c, x + 0.017, -0.006, 0.02); c.fill(); poly(c, [x - 0.036, 0.0, x + 0.036, 0.0, x, 0.04]); c.fill(); }
    // reflets du film plastique (symétriques)
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.03;
    c.beginPath(); c.moveTo(-0.37, -0.12); c.lineTo(-0.12, -0.37); c.moveTo(0.37, 0.12); c.lineTo(0.12, 0.37); c.stroke();
    rrect(c, -0.44, -0.44, 0.88, 0.88, 0.16); c.strokeStyle = 'rgba(200,232,255,0.7)'; c.lineWidth = 0.022; c.stroke();
  }
  function paintBox(c, faceImg) {
    rrect(c, -0.47, -0.47, 0.94, 0.94, 0.08); c.fillStyle = '#2e1606'; c.fill();
    rrect(c, -0.44, -0.44, 0.88, 0.88, 0.06);
    c.fillStyle = rad(c, 0, 0, 0.05, 0, 0, 0.64, [0, '#e2ab70', 0.65, '#bf8147', 1, '#8c5629']); c.fill();
    c.strokeStyle = 'rgba(255,230,190,0.35)'; c.lineWidth = 0.02; rrect(c, -0.4, -0.4, 0.8, 0.8, 0.04); c.stroke();
    // rabats et coins renforcés
    c.strokeStyle = 'rgba(70,38,12,0.55)'; c.lineWidth = 0.022;
    c.beginPath(); c.moveTo(-0.44, 0); c.lineTo(0.44, 0); c.stroke();
    c.fillStyle = 'rgba(80,44,14,0.45)';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { poly(c, [sx * 0.44, sy * 0.44, sx * 0.3, sy * 0.44, sx * 0.44, sy * 0.3]); c.fill(); }
    // ruban adhésif
    c.fillStyle = 'rgba(250,232,185,0.62)'; c.fillRect(-0.44, -0.075, 0.88, 0.15);
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 0.01;
    c.beginPath(); c.moveTo(-0.44, -0.075); c.lineTo(0.44, -0.075); c.moveTo(-0.44, 0.075); c.lineTo(0.44, 0.075); c.stroke();
    if (faceImg && imgOk(faceImg)) {
      // étiquette ronde à l'effigie d'un copain
      circ(c, 0, 0, 0.22); c.fillStyle = 'rgba(60,30,10,0.6)'; c.fill();
      circ(c, 0, 0, 0.2); c.fillStyle = '#fff6e6'; c.fill();
      c.save(); circ(c, 0, 0, 0.18); c.clip();
      c.fillStyle = '#ffd9ec'; c.fillRect(-0.2, -0.2, 0.4, 0.4);
      const iw = faceImg.naturalWidth || faceImg.width || 1, ih = faceImg.naturalHeight || faceImg.height || 1;
      const h = 0.42, w = h * iw / ih;
      try { c.drawImage(faceImg, -w / 2, -h * 0.46, w, h); } catch (e) { /* rien */ }
      c.restore();
      c.strokeStyle = '#ff5fae'; c.lineWidth = 0.025; circ(c, 0, 0, 0.19); c.stroke();
    } else {
      // étiquette : savonnette rose et bulles
      rrect(c, -0.21, -0.15, 0.42, 0.3, 0.06); c.fillStyle = 'rgba(70,36,10,0.45)'; c.fill();
      rrect(c, -0.19, -0.13, 0.38, 0.26, 0.05); c.fillStyle = '#fff8ee'; c.fill();
      rrect(c, -0.12, -0.07, 0.24, 0.14, 0.06); c.fillStyle = lin(c, 0, -0.07, 0, 0.07, [0, '#ffd6ec', 1, '#ff5fae']); c.fill();
      ell(c, -0.04, -0.035, 0.06, 0.017); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fill();
      c.strokeStyle = '#59c7f0'; c.lineWidth = 0.014;
      circ(c, 0.12, -0.08, 0.025); c.stroke(); circ(c, -0.13, 0.08, 0.02); c.stroke(); circ(c, 0.15, 0.07, 0.015); c.stroke();
    }
  }
  function paintBasket(c) {
    rrect(c, -0.47, -0.47, 0.94, 0.94, 0.14); c.fillStyle = '#2a1405'; c.fill();
    rrect(c, -0.44, -0.44, 0.88, 0.88, 0.12);
    c.fillStyle = rad(c, 0, 0, 0.05, 0, 0, 0.64, [0, '#cf9a58', 0.7, '#a8723a', 1, '#7a4c22']); c.fill();
    // osier tressé
    c.strokeStyle = 'rgba(70,40,14,0.5)'; c.lineWidth = 0.02;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      const x = i * 0.12, y = j * 0.12;
      if (Math.abs(x) > 0.38 || Math.abs(y) > 0.38) continue;
      c.beginPath();
      if ((i + j) & 1) { c.moveTo(x - 0.045, y); c.lineTo(x + 0.045, y); } else { c.moveTo(x, y - 0.045); c.lineTo(x, y + 0.045); }
      c.stroke();
    }
    rrect(c, -0.44, -0.44, 0.88, 0.88, 0.12); c.strokeStyle = '#5c3510'; c.lineWidth = 0.05; c.stroke();
    // serviettes roulées (paires en diagonale : symétrique)
    const COL = [['#86e3d0', '#3c9c88'], ['#ffb8cb', '#c86784'], ['#ffb8cb', '#c86784'], ['#86e3d0', '#3c9c88']];
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach(([x, y], k) => {
      circ(c, x, y, 0.175); c.fillStyle = rad(c, x, y, 0.02, x, y, 0.175, [0, '#ffffff', 0.35, COL[k][0], 1, COL[k][1]]); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.014; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.02;
      c.beginPath();
      for (let a = 0; a < 4.6 * Math.PI; a += 0.25) { const r = 0.02 + a * 0.0105; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (a === 0) c.moveTo(px, py); else c.lineTo(px, py); }
      c.stroke();
    });
  }
  // ---- bloc de la mort subite
  function paintFallen(c) {
    rrect(c, -0.49, -0.49, 0.98, 0.98, 0.1); c.fillStyle = '#12080c'; c.fill();
    c.save();
    rrect(c, -0.46, -0.46, 0.92, 0.92, 0.08); c.clip();
    c.fillStyle = '#ffc93d'; c.fillRect(-0.5, -0.5, 1, 1);
    c.fillStyle = '#1a1014';
    for (let k = -6; k <= 6; k++) { const o = k * 0.18; poly(c, [o - 0.5, -0.5, o - 0.41, -0.5, o + 0.5, 0.41, o + 0.5, 0.5]); c.fill(); }
    c.restore();
    rrect(c, -0.32, -0.32, 0.64, 0.64, 0.06); c.fillStyle = '#12080c'; c.fill();
    rrect(c, -0.29, -0.29, 0.58, 0.58, 0.05);
    c.fillStyle = rad(c, 0, 0, 0.02, 0, 0, 0.42, [0, '#8a4c5c', 0.6, '#5b2d3a', 1, '#33161f']); c.fill();
    c.fillStyle = '#c3ccd8';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { circ(c, sx * 0.2, sy * 0.2, 0.035); c.fill(); }
    c.strokeStyle = 'rgba(255,77,94,0.9)'; c.lineWidth = 0.03; rrect(c, -0.29, -0.29, 0.58, 0.58, 0.05); c.stroke();
    c.strokeStyle = 'rgba(20,6,10,0.8)'; c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(-0.1, -0.1); c.lineTo(0.1, 0.1); c.moveTo(0.1, -0.1); c.lineTo(-0.1, 0.1); c.stroke();
  }
  // ---- bombe posée (vue 3/4, comme les personnages) : corps + bande à la couleur du joueur + col ; la mèche est dessinée en direct
  // origine = centre du sprite ; le corps (rayon 0.33) repose sur le sol en y = 0.38
  function paintBombSide(c, col) {
    const r = 0.33, by = 0.05;
    circ(c, 0, by, r + 0.032); c.fillStyle = '#020306'; c.fill();
    circ(c, 0, by, r);
    c.fillStyle = rad(c, -0.12, by - 0.13, 0.02, 0, by, r, [0, '#97a9c6', 0.27, '#36425c', 0.74, '#121824', 1, '#05070b']); c.fill();
    c.save();
    circ(c, 0, by, r); c.clip();
    c.strokeStyle = col; c.lineWidth = 0.085;
    c.beginPath(); c.ellipse(0, by + 0.05, r * 1.04, r * 0.4, 0, 0.04 * Math.PI, 0.96 * Math.PI); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.018;
    c.beginPath(); c.ellipse(0, by + 0.012, r * 1.04, r * 0.4, 0, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    c.restore();
    c.save();
    c.translate(0.17, by - 0.255); c.rotate(0.62);
    rrect(c, -0.078, -0.07, 0.156, 0.12, 0.026);
    c.fillStyle = lin(c, -0.078, 0, 0.078, 0, [0, '#4d5867', 0.5, '#dbe3ec', 1, '#4d5867']); c.fill();
    c.strokeStyle = '#020306'; c.lineWidth = 0.026; c.stroke();
    c.restore();
    ell(c, -0.13, by - 0.15, 0.095, 0.052, -0.7); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
    ell(c, 0.16, by + 0.17, 0.05, 0.025, -0.7); c.fillStyle = 'rgba(160,190,230,0.35)'; c.fill();
  }
  // ---- bombe de dessin animé vue de côté (icône du bouton)
  function paintBombIcon(c) {
    const r = 0.29, bx = -0.05, by = 0.07;
    circ(c, bx, by, r + 0.035); c.fillStyle = '#020306'; c.fill();
    circ(c, bx, by, r);
    c.fillStyle = rad(c, bx - 0.11, by - 0.12, 0.02, bx, by, r, [0, '#93a5c2', 0.28, '#34405a', 0.75, '#121824', 1, '#05070b']); c.fill();
    c.save();
    c.translate(0.14, -0.15); c.rotate(0.78);
    rrect(c, -0.075, -0.07, 0.15, 0.12, 0.025); c.fillStyle = lin(c, -0.075, 0, 0.075, 0, [0, '#5b6676', 0.5, '#d9e1ea', 1, '#5b6676']); c.fill();
    c.strokeStyle = '#020306'; c.lineWidth = 0.028; c.stroke();
    c.restore();
    c.strokeStyle = '#020306'; c.lineWidth = 0.075;
    c.beginPath(); c.moveTo(0.19, -0.21); c.quadraticCurveTo(0.24, -0.34, 0.33, -0.31); c.stroke();
    c.strokeStyle = '#ecd9ab'; c.lineWidth = 0.042; c.stroke();
    c.fillStyle = 'rgba(255,211,77,0.55)'; circ(c, 0.345, -0.315, 0.12); c.fill();
    c.fillStyle = '#ffd34d';
    const sx = 0.345, sy = -0.315, R = 0.11, q = 0.04;
    poly(c, [sx, sy - R, sx + q, sy - q, sx + R, sy, sx + q, sy + q, sx, sy + R, sx - q, sy + q, sx - R, sy, sx - q, sy - q]); c.fill();
    c.fillStyle = '#ffffff'; circ(c, sx, sy, 0.035); c.fill();
    ell(c, bx - 0.13, by - 0.13, 0.085, 0.05, -0.7); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
  }
  // ---- bonus : gemme carrée, icône claire
  function paintPlus(c, x, y) {
    circ(c, x, y, 0.075); c.fillStyle = '#ffffff'; c.fill();
    c.strokeStyle = '#05080c'; c.lineWidth = 0.028;
    c.beginPath(); c.moveTo(x - 0.04, y); c.lineTo(x + 0.04, y); c.moveTo(x, y - 0.04); c.lineTo(x, y + 0.04); c.stroke();
  }
  function paintItem(c, it) {
    const I = ITEMS[it], col = I.col;
    rrect(c, -0.37, -0.37, 0.74, 0.74, 0.17); c.fillStyle = '#04070b'; c.fill();
    rrect(c, -0.335, -0.335, 0.67, 0.67, 0.14); c.fillStyle = lin(c, 0, -0.34, 0, 0.34, [0, '#ffffff', 0.2, col, 1, I.dark]); c.fill();
    rrect(c, -0.255, -0.255, 0.51, 0.51, 0.1); c.fillStyle = 'rgba(6,10,16,0.86)'; c.fill();
    c.strokeStyle = hexA(col, 0.9); c.lineWidth = 0.018; c.stroke();
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (it === IT_BOMB) {
      circ(c, 0.01, 0.035, 0.135); c.fillStyle = rad(c, -0.03, -0.01, 0.01, 0.01, 0.035, 0.135, [0, '#8193ad', 0.5, '#2a3446', 1, '#0a0e15']); c.fill();
      c.strokeStyle = '#e8d6aa'; c.lineWidth = 0.032; c.beginPath(); c.moveTo(0.08, -0.06); c.quadraticCurveTo(0.12, -0.14, 0.16, -0.15); c.stroke();
      c.fillStyle = '#ffd34d'; poly(c, [0.17, -0.22, 0.19, -0.17, 0.24, -0.16, 0.19, -0.14, 0.17, -0.09, 0.15, -0.14, 0.1, -0.16, 0.15, -0.17]); c.fill();
      paintPlus(c, -0.15, -0.15);
    } else if (it === IT_RANGE) {
      c.beginPath(); c.moveTo(0, -0.21);
      c.bezierCurveTo(0.12, -0.08, 0.18, 0.0, 0.14, 0.1); c.bezierCurveTo(0.1, 0.2, -0.1, 0.2, -0.14, 0.1); c.bezierCurveTo(-0.18, 0.0, -0.06, -0.04, 0, -0.21);
      c.fillStyle = lin(c, 0, -0.21, 0, 0.19, [0, '#fff6b0', 0.5, '#ff8a3c', 1, '#d8301f']); c.fill();
      c.beginPath(); c.moveTo(0, -0.05); c.bezierCurveTo(0.06, 0.02, 0.09, 0.07, 0.06, 0.12); c.bezierCurveTo(0.03, 0.17, -0.06, 0.16, -0.07, 0.11); c.bezierCurveTo(-0.08, 0.05, -0.02, 0.02, 0, -0.05);
      c.fillStyle = '#fffbe0'; c.fill();
      paintPlus(c, -0.15, -0.15);
    } else if (it === IT_SPEED) {
      poly(c, [0.06, -0.22, -0.13, 0.03, -0.01, 0.03, -0.06, 0.22, 0.13, -0.04, 0.01, -0.04]);
      c.fillStyle = lin(c, 0, -0.22, 0, 0.22, [0, '#f2ffe0', 0.5, '#7dff9f', 1, '#22c45a']); c.fill();
      c.strokeStyle = '#04110a'; c.lineWidth = 0.02; c.stroke();
    } else if (it === IT_PUSH) {
      // gant qui pousse + traits de vitesse
      c.strokeStyle = 'rgba(255,190,240,0.9)'; c.lineWidth = 0.026;
      c.beginPath(); c.moveTo(-0.08, 0.17); c.lineTo(-0.08, 0.23); c.moveTo(0, 0.18); c.lineTo(0, 0.24); c.moveTo(0.08, 0.17); c.lineTo(0.08, 0.23); c.stroke();
      rrect(c, -0.12, -0.17, 0.24, 0.24, 0.09); c.fillStyle = lin(c, 0, -0.17, 0, 0.07, [0, '#ffd6f4', 0.4, '#ff5fd2', 1, '#b1248f']); c.fill();
      c.strokeStyle = '#2a0622'; c.lineWidth = 0.018; c.stroke();
      ell(c, -0.125, 0.0, 0.045, 0.075, 0.3); c.fillStyle = '#e83fbd'; c.fill(); c.stroke();
      rrect(c, -0.1, 0.06, 0.2, 0.08, 0.025); c.fillStyle = '#ffffff'; c.fill(); c.stroke();
      c.strokeStyle = 'rgba(42,6,34,0.6)'; c.lineWidth = 0.014;
      c.beginPath(); c.moveTo(-0.04, -0.15); c.lineTo(-0.04, -0.07); c.moveTo(0.03, -0.15); c.lineTo(0.03, -0.07); c.stroke();
    } else if (it === IT_BUOY) {
      paintBuoy(c);                                 // 2 contre 2 : bouée (redonne une relève)
    } else {
      c.beginPath(); c.moveTo(0, -0.21); c.lineTo(0.165, -0.145); c.lineTo(0.155, 0.03); c.quadraticCurveTo(0.12, 0.15, 0, 0.215);
      c.quadraticCurveTo(-0.12, 0.15, -0.155, 0.03); c.lineTo(-0.165, -0.145); c.closePath();
      c.fillStyle = lin(c, 0, -0.21, 0, 0.21, [0, '#eef6ff', 0.45, '#7fc4ff', 1, '#2a5fd0']); c.fill();
      c.strokeStyle = '#06122a'; c.lineWidth = 0.02; c.stroke();
      c.fillStyle = '#ffffff';
      poly(c, [0, -0.11, 0.028, -0.04, 0.1, -0.04, 0.043, 0.005, 0.064, 0.08, 0, 0.035, -0.064, 0.08, -0.043, 0.005, -0.1, -0.04, -0.028, -0.04]); c.fill();
    }
    // reflet en haut de la gemme
    c.fillStyle = 'rgba(255,255,255,0.35)';
    rrect(c, -0.26, -0.315, 0.52, 0.06, 0.03); c.fill();
  }
  // ---- corps rond du personnage (origine au centre du corps)
  function paintBody(c, p) {
    const col = PCOL[p], dk = PDARK[p], lt = PLIGHT[p];
    circ(c, 0, 0, 0.32); c.fillStyle = '#05080c'; c.fill();
    circ(c, 0, 0, 0.295); c.fillStyle = rad(c, -0.09, -0.11, 0.02, 0, 0, 0.3, [0, lt, 0.42, col, 1, dk]); c.fill();
    // combinaison : ceinture + boucle
    c.save(); circ(c, 0, 0, 0.295); c.clip();
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-0.3, 0.1, 0.6, 0.075);
    c.restore();
    rrect(c, -0.065, 0.085, 0.13, 0.1, 0.025); c.fillStyle = '#ffd34d'; c.fill();
    c.strokeStyle = 'rgba(60,40,0,0.8)'; c.lineWidth = 0.015; c.stroke();
    ell(c, -0.13, -0.15, 0.08, 0.045, -0.6); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
  }
  // ---- tête de secours (invité) : rond de sa couleur + initiale
  function paintFallbackHead(c, p, initial, sad, font) {
    const col = PCOL[p], dk = PDARK[p], lt = PLIGHT[p];
    circ(c, 0, 0, 0.47); c.fillStyle = 'rgba(2,4,8,0.85)'; c.fill();
    circ(c, 0, 0, 0.44); c.fillStyle = col; c.fill();
    circ(c, 0, 0, 0.39); c.fillStyle = rad(c, -0.1, -0.13, 0.03, 0, 0, 0.4, [0, '#ffffff', 0.25, lt, 1, sad ? '#5b6f8a' : col]); c.fill();
    c.fillStyle = sad ? '#22324a' : dk;
    c.font = '0.46px ' + font; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(initial, 0, sad ? -0.05 : 0.02);
    if (sad) {
      c.strokeStyle = '#22324a'; c.lineWidth = 0.04;
      c.beginPath(); c.arc(0, 0.27, 0.1, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke();
      c.fillStyle = '#9fe0ff';
      for (const x of [-0.17, 0.17]) { ell(c, x, 0.12, 0.035, 0.065); c.fill(); }
    }
  }
  // ---- débris (petits morceaux en rotation)
  function paintDebris(c, k) {
    if (k === 0) {                // feuille de papier
      poly(c, [-0.4, -0.3, 0.35, -0.38, 0.42, 0.3, -0.33, 0.38]); c.fillStyle = '#f7fbff'; c.fill();
      c.strokeStyle = 'rgba(120,140,160,0.6)'; c.lineWidth = 0.06; c.stroke();
      c.beginPath(); c.moveTo(-0.1, -0.34); c.lineTo(0.05, 0.34); c.stroke();
    } else if (k === 1) {         // éclat de carton
      poly(c, [-0.42, -0.2, 0.1, -0.42, 0.44, 0.05, 0.05, 0.4, -0.3, 0.25]); c.fillStyle = '#c98b4e'; c.fill();
      c.strokeStyle = '#6a3d16'; c.lineWidth = 0.08; c.stroke();
    } else if (k === 2) {         // morceau de savon
      rrect(c, -0.38, -0.26, 0.76, 0.52, 0.2); c.fillStyle = '#ff7cc0'; c.fill();
      ell(c, -0.1, -0.1, 0.2, 0.07); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
    } else if (k === 3) {         // brin d'osier
      rrect(c, -0.45, -0.12, 0.9, 0.24, 0.1); c.fillStyle = '#b07a3e'; c.fill();
      c.strokeStyle = '#5c3510'; c.lineWidth = 0.06; c.stroke();
    } else if (k === 4) {         // bout de serviette
      circ(c, 0, 0, 0.38); c.fillStyle = '#86e3d0'; c.fill(); circ(c, 0.08, -0.06, 0.18); c.fillStyle = '#ffb8cb'; c.fill();
    } else {                      // mini rouleau
      circ(c, 0, 0, 0.42); c.fillStyle = '#f4f8fb'; c.fill(); c.strokeStyle = '#8a9aa8'; c.lineWidth = 0.05; c.stroke();
      circ(c, 0, 0, 0.16); c.fillStyle = '#c99a63'; c.fill();
    }
  }
  function txtOut(c, s, x, y, px, col, font, align, stroke) {
    c.font = px + 'px ' + font;
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = 'rgba(3,6,10,0.9)'; c.strokeText(s, x, y); }
    c.fillStyle = col;
    c.fillText(s, x, y);
  }

  // lueurs et textures communes (taille fixe, indépendantes de la résolution)
  let FXS = null;
  function fx() {
    if (FXS) return FXS;
    FXS = {
      shade: mkShade(), scorch: mkScorch(), fire: mkFire(), ball: mkFlameBall(), strip: mkFireStrip(), smokeL: mkSmokeLight(), band: mkBand(),
      w: mkGlow('#ffffff'), p: PCOL.map((col) => mkGlow(col)), red: mkGlow(ACCENT), hot: mkGlow('#ff7a2a', true),
      gold: mkGlow('#ffd34d'), it: ITEMS.map((I) => mkGlow(I.col)), blue: mkGlow('#8fd0ff'), dust: mkGlow('#c9b79a')
    };
    return FXS;
  }

  // ---- personnage : (x, y) = centre de sa case ; tout est dessiné dans le repère de son joueur (P1 tourné de 180°)
  // o = { p, body, head, sad, t, walk, moving, lean, dead, deadT, why, win, shield, invul, danger, drop, alpha, headH }
  function drawHero(c, x, y, T, o) {
    const F = fx();
    c.save();
    c.translate(x, y);
    if (o.rot != null ? o.rot : o.p === 1) c.rotate(Math.PI);    // (2 contre 2 : o.rot = false, personne n'est tourné)
    let baseA = o.alpha == null ? 1 : o.alpha;
    const t = o.t || 0, dead = !!o.dead, mv = !!o.moving && !dead;
    if (o.invul > 0 && !dead && ((t * 14) | 0) % 2 === 0) baseA *= 0.35;
    const ph = (o.walk || 0) * 5.4;
    let hop = 0, sx = 1, sy = 1, lean = 0;
    if (o.win) { const k = Math.abs(Math.sin(t * 7.5)); hop = k * 0.36; sy = 1 + (k - 0.5) * 0.14; sx = 2 - sy; }
    else if (mv) { hop = Math.abs(Math.sin(ph)) * 0.07; sx = 1 + 0.05 * Math.sin(ph * 2); sy = 2 - sx; lean = (o.lean || 0) * 0.13; }
    else if (!dead) { sy = 1 + 0.03 * Math.sin(t * 3.2); sx = 2 - sy; }
    if (o.drop != null && o.drop < 1) hop += (1 - easeOut(o.drop)) * 5;
    const crushed = dead && o.why === 'crush';
    // ombre douce et anneau à sa couleur
    const sh = 1 / (1 + hop * 0.8);
    c.globalAlpha = baseA * 0.9 * sh;
    c.drawImage(F.shade, -0.5 * T * sh, 0.24 * T, T * sh, 0.34 * T);
    c.globalAlpha = baseA * (dead ? 0.35 : 0.95);
    c.strokeStyle = PCOL[o.p]; c.lineWidth = Math.max(1.5, T * 0.06);
    ell(c, 0, 0.4 * T, 0.4 * T * sh, 0.14 * T * sh); c.stroke();
    c.globalAlpha = baseA;
    c.save();
    c.translate(0, -hop * T);
    if (lean) c.rotate(lean);
    if (o.danger && !dead) c.translate(Math.sin(t * 70) * T * 0.022, 0);
    if (crushed) { sx = 1.5; sy = 0.4; }
    // pieds
    const fo = mv ? Math.sin(ph) * 0.075 : 0;
    c.fillStyle = '#0c1118';
    ell(c, -0.16 * T, (0.38 + fo) * T, 0.12 * T, 0.08 * T); c.fill();
    ell(c, 0.16 * T, (0.38 - fo) * T, 0.12 * T, 0.08 * T); c.fill();
    c.fillStyle = PDARK[o.p];
    ell(c, -0.16 * T, (0.37 + fo) * T, 0.082 * T, 0.05 * T); c.fill();
    ell(c, 0.16 * T, (0.37 - fo) * T, 0.082 * T, 0.05 * T); c.fill();
    c.save();
    c.translate(0, 0.09 * T);
    c.scale(sx, sy);
    // mains
    let aL, aR;
    if (o.win) { aL = -0.32 + Math.sin(t * 15) * 0.06; aR = -0.32 - Math.sin(t * 15) * 0.06; }
    else if (dead) { aL = aR = 0.12; }
    else if (mv) { aL = Math.sin(ph) * 0.08; aR = -aL; }
    else { aL = aR = Math.sin(t * 2.2) * 0.02; }
    for (const [hx, ay] of [[-0.37, aL], [0.37, aR]]) {
      circ(c, hx * T, (0.05 + ay) * T, 0.098 * T); c.fillStyle = '#05080c'; c.fill();
      circ(c, hx * T, (0.05 + ay) * T, 0.072 * T); c.fillStyle = o.win ? '#ffffff' : PCOL[o.p]; c.fill();
    }
    if (o.body) c.drawImage(o.body.cv, -0.4 * T, -0.4 * T, 0.8 * T, 0.8 * T);
    if (dead) { c.globalAlpha = baseA * Math.min(0.62, o.deadT * 3); circ(c, 0, 0, 0.34 * T); c.fillStyle = '#1b0f08'; c.fill(); c.globalAlpha = baseA; }
    c.restore();
    // tête
    const hs = dead ? (o.sad || o.head) : o.head;
    if (hs) {
      const hh = T * (o.headH || 1.12) * (dead ? 1.1 : 1);
      const hy = crushed ? -0.12 * T : -(0.04 + 0.49 * (o.headH || 1.12)) * T - (mv ? Math.abs(Math.sin(ph)) * 0.03 * T : 0) - (dead ? 0.05 * T : 0);
      const tilt = dead ? 0.1 + Math.sin(t * 9) * 0.07 * Math.max(0, 1 - (o.deadT || 0) * 0.7) : o.win ? Math.sin(t * 7.5) * 0.13 : Math.sin(t * 1.7) * 0.045 + lean * 0.6;
      c.save();
      c.translate(0, hy);
      c.rotate(tilt);
      const H = hh * (hs.k || 1), W = H * hs.cv.width / hs.cv.height;
      c.drawImage(hs.cv, -W / 2, -H / 2, W, H);
      if (dead) {                                  // larmes
        c.fillStyle = '#8fd8ff';
        for (let i = 0; i < 2; i++) {
          const k = (t * 1.5 + i * 0.5) % 1;
          c.globalAlpha = baseA * (1 - k);
          ell(c, (i ? 0.19 : -0.19) * hh, (0.04 + k * 0.32) * hh, 0.035 * hh, 0.055 * hh); c.fill();
        }
        c.globalAlpha = baseA;
      } else if (o.danger) {                       // goutte de sueur + « ! » d'alerte
        const k = (t * 2.2) % 1;
        c.fillStyle = '#9fe4ff'; c.strokeStyle = '#0b2a3a'; c.lineWidth = Math.max(1, hh * 0.02);
        c.beginPath();
        const dx = 0.4 * hh, dy = -0.12 * hh + k * 0.14 * hh, r = 0.085 * hh;
        c.moveTo(dx, dy - r * 1.8); c.quadraticCurveTo(dx + r * 1.15, dy, dx, dy + r); c.quadraticCurveTo(dx - r * 1.15, dy, dx, dy - r * 1.8);
        c.fill(); c.stroke();
        const bx = 0.34 * hh, by = -0.62 * hh - Math.abs(Math.sin(t * 9)) * 0.06 * hh, br = 0.17 * hh;
        circ(c, bx, by, br + Math.max(1, hh * 0.025)); c.fillStyle = '#05080c'; c.fill();
        circ(c, bx, by, br); c.fillStyle = '#ff3a4c'; c.fill();
        c.fillStyle = '#ffffff';
        rrect(c, bx - br * 0.16, by - br * 0.62, br * 0.32, br * 0.78, br * 0.14); c.fill();
        circ(c, bx, by + br * 0.48, br * 0.17); c.fill();
      }
      c.restore();
      if (crushed) {                               // étoiles qui tournent
        c.fillStyle = '#ffd34d';
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + i * TAU / 3, px = Math.cos(a) * 0.36 * T, py = hy - hh * 0.55 + Math.sin(a) * 0.1 * T, r = 0.07 * T;
          poly(c, [px, py - r, px + r * 0.3, py - r * 0.3, px + r, py, px + r * 0.3, py + r * 0.3, px, py + r, px - r * 0.3, py + r * 0.3, px - r, py, px - r * 0.3, py - r * 0.3]);
          c.fill();
        }
      }
    }
    // bulle de bouclier
    if (o.shield && !dead) {
      const r = T * (0.68 + 0.025 * Math.sin(t * 5)), cy = -0.22 * T;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = baseA * 0.35; c.drawImage(F.blue, -r * 1.25, cy - r * 1.25, r * 2.5, r * 2.5);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = baseA;
      c.fillStyle = 'rgba(140,205,255,0.1)'; circ(c, 0, cy, r); c.fill();
      c.strokeStyle = 'rgba(175,228,255,' + (0.6 + 0.2 * Math.sin(t * 6)).toFixed(2) + ')'; c.lineWidth = Math.max(1.4, T * 0.05); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = Math.max(1.2, T * 0.045);
      c.beginPath(); c.arc(0, cy, r * 0.8, Math.PI * 1.12, Math.PI * 1.42); c.stroke();
    }
    c.restore();
    c.restore();
  }

  // ---- arène statique (sol, éclairage, piliers, cadre) : peinte une fois dans un canvas
  // isPillar(x, y) ; notch : consoles fixes au milieu des bords (portrait)
  function paintArena(c, ox, oy, cols, rows, T, isPillar, notch, pillarSpr) {
    const F = fx();
    const aw = cols * T, ah = rows * T, fr = Math.max(5, T * 0.34);
    const my = (rows - 1) >> 1;
    // contour du terrain jouable (avec les encoches)
    const field = new Path2D();
    if (notch) {
      const n0 = oy + (my - 1) * T, n1 = oy + (my + 2) * T, nw = 2 * T;
      field.moveTo(ox, oy); field.lineTo(ox + aw, oy); field.lineTo(ox + aw, n0); field.lineTo(ox + aw - nw, n0); field.lineTo(ox + aw - nw, n1);
      field.lineTo(ox + aw, n1); field.lineTo(ox + aw, oy + ah); field.lineTo(ox, oy + ah); field.lineTo(ox, n1); field.lineTo(ox + nw, n1);
      field.lineTo(ox + nw, n0); field.lineTo(ox, n0); field.closePath();
    } else field.rect(ox, oy, aw, ah);
    // cadre en métal sombre + halo
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.5;
    c.drawImage(F.p[1], ox - fr * 3, oy - fr * 3 - ah * 0.15, aw + fr * 6, ah * 0.7);
    c.drawImage(F.p[0], ox - fr * 3, oy + ah * 0.45, aw + fr * 6, ah * 0.7);
    c.restore();
    rrect(c, ox - fr, oy - fr, aw + fr * 2, ah + fr * 2, fr * 0.9);
    c.fillStyle = lin(c, 0, oy - fr, 0, oy + ah + fr, [0, '#20384a', 0.5, '#152635', 1, '#2a2e2a']); c.fill();
    c.strokeStyle = 'rgba(160,200,225,0.35)'; c.lineWidth = Math.max(1, fr * 0.12); c.stroke();
    rrect(c, ox - fr * 0.55, oy - fr * 0.55, aw + fr * 1.1, ah + fr * 1.1, fr * 0.5);
    c.strokeStyle = 'rgba(4,10,16,0.8)'; c.lineWidth = Math.max(1, fr * 0.18); c.stroke();
    // rivets
    c.fillStyle = 'rgba(190,215,232,0.5)';
    const rv = Math.max(1.2, fr * 0.13);
    for (let i = 0; i <= cols; i += 2) { circ(c, ox + i * T, oy - fr * 0.55, rv); c.fill(); circ(c, ox + i * T, oy + ah + fr * 0.55, rv); c.fill(); }
    for (let j = 0; j <= rows; j += 2) { circ(c, ox - fr * 0.55, oy + j * T, rv); c.fill(); circ(c, ox + aw + fr * 0.55, oy + j * T, rv); c.fill(); }
    // sol carrelé
    c.save();
    c.clip(field);
    c.fillStyle = '#0d1a23'; c.fillRect(ox, oy, aw, ah);
    const g = Math.max(1, T * 0.045);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = ox + x * T, py = oy + y * T, v = (x + y) & 1;
      rrect(c, px + g, py + g, T - 2 * g, T - 2 * g, T * 0.08);
      c.fillStyle = rad(c, px + T / 2, py + T / 2, T * 0.05, px + T / 2, py + T / 2, T * 0.72, v ? [0, '#1f3646', 1, '#132430'] : [0, '#1a2f3e', 1, '#10202b']);
      c.fill();
      c.strokeStyle = 'rgba(160,210,240,0.06)'; c.lineWidth = Math.max(0.8, T * 0.025); c.stroke();
    }
    // bouches d'évacuation (déco, symétriques)
    for (const [x, y] of [[2, 2], [cols - 3, rows - 3], [cols - 3, 4], [2, rows - 5]]) {
      if (x < 0 || y < 0 || x >= cols || y >= rows || isPillar(x, y)) continue;
      const cx = ox + (x + 0.5) * T, cy = oy + (y + 0.5) * T, r = T * 0.22;
      circ(c, cx, cy, r); c.fillStyle = '#0a1218'; c.fill();
      c.strokeStyle = 'rgba(150,180,200,0.45)'; c.lineWidth = Math.max(1, T * 0.04); c.stroke();
      c.strokeStyle = 'rgba(150,180,200,0.3)'; c.lineWidth = Math.max(0.8, T * 0.03);
      c.beginPath(); for (let k = -1; k <= 1; k++) { c.moveTo(cx - r * 0.7, cy + k * r * 0.4); c.lineTo(cx + r * 0.7, cy + k * r * 0.4); } c.stroke();
    }
    // marquages de l'arène : grand cercle central (moitiés aux couleurs des camps), ligne médiane, coins des départs
    {
      const cx = ox + aw / 2, cy = oy + ah / 2, R = Math.min(aw, ah) * 0.32;
      c.lineCap = 'butt';
      c.lineWidth = Math.max(2, T * 0.11);
      c.strokeStyle = hexA(PCOL[1], 0.3); c.beginPath(); c.arc(cx, cy, R, Math.PI, TAU); c.stroke();
      c.strokeStyle = hexA(PCOL[0], 0.3); c.beginPath(); c.arc(cx, cy, R, 0, Math.PI); c.stroke();
      c.lineWidth = Math.max(1, T * 0.05);
      c.strokeStyle = 'rgba(220,240,255,0.1)'; circ(c, cx, cy, R * 0.62); c.stroke();
      c.setLineDash([T * 0.3, T * 0.22]);
      c.strokeStyle = 'rgba(220,240,255,0.12)'; c.beginPath(); c.moveTo(ox, cy); c.lineTo(ox + aw, cy); c.stroke();
      c.setLineDash([]);
      for (let p = 0; p < 2; p++) {
        const kx = p ? ox + aw : ox, ky = p ? oy : oy + ah, a0 = p ? Math.PI / 2 : -Math.PI / 2, rr = T * 3.4;
        c.fillStyle = rad(c, kx, ky, 0, kx, ky, rr, [0, hexA(PCOL[p], 0.16), 1, hexA(PCOL[p], 0.03)]);
        c.beginPath(); c.moveTo(kx, ky); c.arc(kx, ky, rr, a0, a0 + Math.PI / 2); c.closePath(); c.fill();
        c.strokeStyle = hexA(PCOL[p], 0.35); c.lineWidth = Math.max(1.5, T * 0.07);
        c.beginPath(); c.arc(kx, ky, rr, a0, a0 + Math.PI / 2); c.stroke();
      }
    }
    // éclairage : reflet diagonal, spot central, flaques de couleur aux départs, vignette
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = lin(c, ox, oy + ah, ox + aw, oy, [0, 'rgba(170,215,255,0)', 0.4, 'rgba(170,215,255,0)', 0.47, 'rgba(170,215,255,0.05)',
      0.5, 'rgba(190,225,255,0.08)', 0.53, 'rgba(170,215,255,0.05)', 0.6, 'rgba(170,215,255,0)', 1, 'rgba(170,215,255,0)']);
    c.fillRect(ox, oy, aw, ah);
    c.fillStyle = rad(c, ox + aw / 2, oy + ah / 2, 0, ox + aw / 2, oy + ah / 2, Math.max(aw, ah) * 0.62, [0, 'rgba(110,170,215,0.16)', 1, 'rgba(110,170,215,0)']);
    c.fillRect(ox, oy, aw, ah);
    c.globalAlpha = 0.42;
    c.drawImage(F.p[0], ox - 2.5 * T, oy + ah - 3.5 * T, 6 * T, 6 * T);
    c.drawImage(F.p[1], ox + aw - 3.5 * T, oy - 2.5 * T, 6 * T, 6 * T);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = rad(c, ox + aw / 2, oy + ah / 2, Math.min(aw, ah) * 0.35, ox + aw / 2, oy + ah / 2, Math.max(aw, ah) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.42)']);
    c.fillRect(ox, oy, aw, ah);
    // pads de départ
    for (let p = 0; p < 2; p++) {
      const cx = ox + (p === 0 ? 0.5 : cols - 0.5) * T, cy = oy + (p === 0 ? rows - 0.5 : 0.5) * T;
      c.strokeStyle = hexA(PCOL[p], 0.55); c.lineWidth = Math.max(1, T * 0.05);
      circ(c, cx, cy, T * 0.4); c.stroke();
      c.strokeStyle = hexA(PCOL[p], 0.25); circ(c, cx, cy, T * 0.27); c.stroke();
    }
    // ombre des murs sur le sol (intérieur du contour)
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = T * 0.36; c.stroke(field);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = T * 0.7; c.stroke(field);
    c.restore();
    // consoles (encoches) : même matière que le cadre
    if (notch) {
      for (const sx of [0, 1]) {
        const x0 = sx ? ox + aw - 2 * T : ox, y0 = oy + (my - 1) * T, w = 2 * T, h = 3 * T;
        c.fillStyle = lin(c, x0, y0, x0, y0 + h, [0, '#1f384b', 0.5, '#152634', 1, '#2b3029']);
        c.fillRect(x0, y0, w, h);
        // bande de danger côté arène
        const bw = T * 0.2, bx0 = sx ? x0 : x0 + w - bw;
        c.save();
        c.beginPath(); c.rect(bx0, y0 + T * 0.1, bw, h - T * 0.2); c.clip();
        c.fillStyle = '#d6a12a'; c.fillRect(bx0, y0, bw, h);
        c.fillStyle = '#17130b';
        for (let k = -2; k < 14; k++) { const yy = y0 + k * T * 0.3; poly(c, [bx0, yy, bx0 + bw, yy - bw, bx0 + bw, yy - bw + T * 0.15, bx0, yy + T * 0.15]); c.fill(); }
        c.restore();
        // grilles d'aération aux deux bouts : le milieu reste libre pour le menu et les pastilles de la borne
        const gx0 = sx ? x0 + bw + T * 0.28 : x0 + T * 0.28, gx1 = sx ? x0 + w - T * 0.28 : x0 + w - bw - T * 0.28;
        c.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          for (const yy of [y0 + T * 0.26 + k * T * 0.12, y0 + h - T * 0.26 - k * T * 0.12]) {
            c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = Math.max(1.2, T * 0.065);
            c.beginPath(); c.moveTo(gx0, yy); c.lineTo(gx1, yy); c.stroke();
            c.strokeStyle = 'rgba(150,190,215,0.16)'; c.lineWidth = Math.max(0.6, T * 0.02);
            c.beginPath(); c.moveTo(gx0, yy + T * 0.04); c.lineTo(gx1, yy + T * 0.04); c.stroke();
          }
        }
        // voyants côté arène (loin du bouton menu et des pastilles) : cyan côté P1 (haut), ambre côté P0 (bas)
        const lx = sx ? x0 + bw + T * 0.24 : x0 + w - bw - T * 0.24;
        for (const [ly, p] of [[y0 + T * 1.0, 1], [y0 + h - T * 1.0, 0]]) {
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7;
          c.drawImage(F.p[p], lx - T * 0.35, ly - T * 0.35, T * 0.7, T * 0.7);
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
          circ(c, lx, ly, T * 0.06); c.fillStyle = '#ffffff'; c.fill();
        }
        c.strokeStyle = 'rgba(4,10,16,0.75)'; c.lineWidth = Math.max(1, fr * 0.16);
        rrect(c, x0 + T * 0.12, y0 + T * 0.12, w - T * 0.24, h - T * 0.24, T * 0.18); c.stroke();
      }
    }
    // liseré néon (cyan en haut, ambre en bas)
    c.save();
    const ng = lin(c, 0, oy, 0, oy + ah, [0, PCOL[1], 0.42, '#a7d9ff', 0.5, '#ffffff', 0.58, '#ffd8a0', 1, PCOL[0]]);
    c.shadowColor = 'rgba(160,220,255,0.7)'; c.shadowBlur = T * 0.35;
    c.strokeStyle = ng; c.lineWidth = Math.max(1.5, T * 0.07); c.stroke(field);
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = Math.max(0.6, T * 0.02); c.stroke(field);
    // piliers et leur ombre
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!isPillar(x, y)) continue;
      const px = ox + x * T, py = oy + y * T;
      c.globalAlpha = 0.9;
      c.drawImage(F.shade, px - T * 0.2, py - T * 0.2, T * 1.4, T * 1.4);
      c.globalAlpha = 1;
      if (pillarSpr) c.drawImage(pillarSpr.cv, px, py, T, T);
    }
  }

  // ===========================================================================
  // 3 bis. Peinture du 2 contre 2 (sprites de plus ; le duel n'en dessine aucun, sauf la bouée qui n'y apparaît jamais)
  // ===========================================================================
  // ---- bonus « Bouée » : anneau rouge et blanc (une relève de plus)
  function paintBuoy(c) {
    const R = 0.19, r = 0.085, cy = 0.012;
    for (let k = 0; k < 4; k++) {
      const a0 = -Math.PI / 4 + k * Math.PI / 2, a1 = a0 + Math.PI / 2;
      c.beginPath(); c.arc(0, cy, R, a0, a1); c.arc(0, cy, r, a1, a0, true); c.closePath();
      c.fillStyle = k % 2 ? lin(c, 0, cy - R, 0, cy + R, [0, '#ffa08f', 1, '#d8301f']) : lin(c, 0, cy - R, 0, cy + R, [0, '#ffffff', 1, '#c9d6df']);
      c.fill();
    }
    c.strokeStyle = '#04110a'; c.lineWidth = 0.02;
    circ(c, 0, cy, R); c.stroke(); circ(c, 0, cy, r); c.stroke();
    c.strokeStyle = 'rgba(255,236,190,0.95)'; c.lineWidth = 0.024;   // attaches de la corde
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 4 + k * Math.PI / 2;
      c.beginPath(); c.moveTo(Math.cos(a) * (r - 0.005), cy + Math.sin(a) * (r - 0.005)); c.lineTo(Math.cos(a) * (R + 0.012), cy + Math.sin(a) * (R + 0.012)); c.stroke();
    }
    ell(c, -0.085, cy - 0.1, 0.055, 0.026, -0.7); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
  }

  // ---- tête de robot de BIP / BOP (sprite unité, origine au centre) : casque de métal, antenne, visière aux yeux de sa couleur ;
  // triste = yeux en croix + larme d'huile
  function paintRobotHead(c, p, sad) {
    const col = PCOL[p], dk = PDARK[p], lt = PLIGHT[p];
    c.strokeStyle = '#05080c'; c.lineWidth = 0.05;                 // antenne
    c.beginPath(); c.moveTo(0, -0.3); c.lineTo(0, -0.43); c.stroke();
    circ(c, 0, -0.45, 0.065); c.fillStyle = sad ? '#6b7784' : col; c.fill(); c.stroke();
    rrect(c, -0.43, -0.33, 0.86, 0.72, 0.2); c.fillStyle = '#05080c'; c.fill();
    rrect(c, -0.4, -0.3, 0.8, 0.66, 0.18);
    c.fillStyle = lin(c, 0, -0.3, 0, 0.36, [0, '#e8eef3', 0.45, '#9fb0bd', 1, '#56687a']); c.fill();
    for (const sx of [-1, 1]) { rrect(c, sx * 0.43 - 0.05, -0.08, 0.1, 0.22, 0.04); c.fillStyle = dk; c.fill(); }   // oreilles
    rrect(c, -0.31, -0.17, 0.62, 0.3, 0.12); c.fillStyle = '#0b141c'; c.fill();                                   // visière
    c.strokeStyle = hexA(col, 0.8); c.lineWidth = 0.025; c.stroke();
    if (sad) {
      c.strokeStyle = lt; c.lineWidth = 0.05;
      for (const ex of [-0.14, 0.14]) { c.beginPath(); c.moveTo(ex - 0.06, -0.08); c.lineTo(ex + 0.06, 0.04); c.moveTo(ex + 0.06, -0.08); c.lineTo(ex - 0.06, 0.04); c.stroke(); }
      ell(c, 0.2, 0.2, 0.035, 0.06); c.fillStyle = '#7fd0ff'; c.fill();
      c.strokeStyle = '#2a3440'; c.lineWidth = 0.035; c.beginPath(); c.arc(0, 0.33, 0.1, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke();
    } else {
      for (const ex of [-0.14, 0.14]) {
        c.fillStyle = rad(c, ex, -0.02, 0.01, ex, -0.02, 0.09, [0, '#ffffff', 0.35, lt, 1, col]);
        rrect(c, ex - 0.075, -0.09, 0.15, 0.14, 0.05); c.fill();
      }
      c.strokeStyle = '#2a3440'; c.lineWidth = 0.035; c.beginPath(); c.arc(0, 0.17, 0.1, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();   // sourire
    }
    for (const bx of [-0.25, 0.25]) { circ(c, bx, 0.28, 0.025); c.fillStyle = '#3a4a58'; c.fill(); }                              // rivets
    ell(c, -0.2, -0.24, 0.12, 0.04, -0.2); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
  }
  // ---- bulle SOS (dans le repère écran) : la tête triste dans une bulle de savon irisée qui flotte, anneau de compte à rebours à
  // la couleur du joueur, « SOS » qui clignote ; k = temps restant / durée de la bulle (1 → 0), t = horloge
  function drawBubble(c, x, y, T, o) {
    const F = fx(), t = o.t || 0, k = clamp(o.k, 0, 1), col = PCOL[o.p];
    const bob = Math.sin(t * 2.6 + o.p) * T * 0.06, R = T * (0.62 + 0.03 * Math.sin(t * 4.1)), cy = y - T * 0.18 + bob;
    c.save();
    c.globalAlpha = 0.6; c.drawImage(F.shade, x - T * 0.45, y + T * 0.22, T * 0.9, T * 0.3); c.globalAlpha = 1;
    if (o.head) {                                                  // la tête triste, un peu plus petite, dans la bulle
      const hs = o.head, H = R * 1.25 * (hs.k || 1), W = H * hs.cv.width / hs.cv.height;
      c.save(); circ(c, x, cy, R * 0.94); c.clip();
      c.drawImage(hs.cv, x - W / 2, cy - H / 2 + Math.sin(t * 1.7) * T * 0.03, W, H);
      c.restore();
    }
    c.globalCompositeOperation = 'lighter';                        // reflets irisés
    c.fillStyle = rad(c, x - R * 0.3, cy - R * 0.35, R * 0.05, x, cy, R, [0, 'rgba(255,255,255,0.35)', 0.55, 'rgba(160,220,255,0.06)', 0.85, hexA(col, 0.18), 1, 'rgba(255,140,220,0.35)']);
    circ(c, x, cy, R); c.fill();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = 'rgba(230,248,255,0.85)'; c.lineWidth = Math.max(1.2, T * 0.04); circ(c, x, cy, R); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(1.2, T * 0.05);
    c.beginPath(); c.arc(x, cy, R * 0.78, Math.PI * 1.12, Math.PI * 1.4); c.stroke();
    c.strokeStyle = 'rgba(4,8,12,0.55)'; c.lineWidth = Math.max(2, T * 0.11);                         // compte à rebours
    c.beginPath(); c.arc(x, cy, R + T * 0.12, 0, TAU); c.stroke();
    c.strokeStyle = k < 0.3 && ((t * 6) | 0) % 2 ? '#ff4d5e' : col; c.lineWidth = Math.max(1.6, T * 0.08);
    c.beginPath(); c.arc(x, cy, R + T * 0.12, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
    if (((t * 2.4) | 0) % 2 === 0 || k < 0.3) {                   // « SOS »
      const fs = Math.round(clamp(T * 0.42, 10, 22));
      txtOut(c, 'SOS', x, cy - R - T * 0.38, fs, k < 0.3 ? '#ff4d5e' : '#ffffff', "'Bungee', Impact, sans-serif", 'center', Math.max(2, fs * 0.22));
    }
    c.restore();
  }
  // ---- marques du 2 contre 2 sur l'arène (par-dessus paintArena du duel, sans consoles) : moitié haute aux couleurs des robots,
  // 4 pads de départ (un par coin, à la couleur de son joueur)
  function paintCoopMarks(c, ox, oy, cols, rows, T) {
    const F = fx(), aw = cols * T, ah = rows * T;
    c.save();
    c.beginPath(); c.rect(ox, oy, aw, ah); c.clip();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.32;
    c.drawImage(F.p[2], ox + aw * 0.35, oy - ah * 0.25, aw * 0.9, ah * 0.55);
    c.drawImage(F.p[3], ox - aw * 0.25, oy - ah * 0.25, aw * 0.9, ah * 0.55);
    c.globalAlpha = 0.18;
    c.drawImage(F.p[1], ox + aw * 0.35, oy + ah * 0.7, aw * 0.9, ah * 0.55);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    for (const [p, x, y] of [[0, 0, rows - 1], [1, cols - 1, rows - 1], [2, cols - 1, 0], [3, 0, 0]]) {
      const cx = ox + (x + 0.5) * T, cy = oy + (y + 0.5) * T;
      c.fillStyle = rad(c, cx, cy, 0, cx, cy, T * 2.6, [0, hexA(PCOL[p], 0.2), 1, hexA(PCOL[p], 0)]);
      c.fillRect(cx - T * 2.6, cy - T * 2.6, T * 5.2, T * 5.2);
      c.strokeStyle = hexA(PCOL[p], 0.6); c.lineWidth = Math.max(1, T * 0.05);
      circ(c, cx, cy, T * 0.4); c.stroke();
      c.strokeStyle = hexA(PCOL[p], 0.28); circ(c, cx, cy, T * 0.27); c.stroke();
    }
    c.restore();
  }
  // ---- petite étoile dorée sous notre équipe (on reconnaît les copains d'un coup d'œil)
  function drawTeamStar(c, x, y, T) {
    const r = T * 0.13, q = r * 0.42;
    c.save(); c.translate(x, y);
    poly(c, [0, -r, q * 0.7, -q * 0.7, r, 0, q * 0.7, q * 0.7, 0, r, -q * 0.7, q * 0.7, -r, 0, -q * 0.7, -q * 0.7]);
    c.fillStyle = '#ffd34d'; c.fill(); c.strokeStyle = '#5a3a00'; c.lineWidth = Math.max(1, T * 0.025); c.stroke();
    c.restore();
  }

  // ===========================================================================
  // 4. Vignette « attract mode » : deux personnages face à face, une bombe qui explose
  // ===========================================================================
  const PVC = new Map();                          // un jeu de sprites par taille de vignette
  let PV = null;
  function paintPvFace(c, p) {
    const col = PCOL[p];
    circ(c, 0, 0, 0.46); c.fillStyle = '#05080c'; c.fill();
    circ(c, 0, 0, 0.43); c.fillStyle = col; c.fill();
    circ(c, 0, 0, 0.38); c.fillStyle = rad(c, -0.1, -0.12, 0.02, 0, 0, 0.4, [0, '#fff4e6', 0.6, '#ffd9b8', 1, '#e9a77c']); c.fill();
    c.fillStyle = p ? '#2a1a12' : '#4a2a10';
    c.beginPath(); c.ellipse(0, -0.24, 0.36, 0.17, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#fff'; circ(c, -0.13, -0.02, 0.075); c.fill(); circ(c, 0.13, -0.02, 0.075); c.fill();
    c.fillStyle = '#1a1a2a'; circ(c, -0.12, 0.0, 0.04); c.fill(); circ(c, 0.12, 0.0, 0.04); c.fill();
    c.strokeStyle = '#7a2a2a'; c.lineWidth = 0.04; c.beginPath(); c.arc(0, 0.1, 0.12, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,110,140,0.4)'; circ(c, -0.24, 0.1, 0.05); c.fill(); circ(c, 0.24, 0.1, 0.05); c.fill();
  }
  function pvInit(w, h) {
    const key = w + 'x' + h;
    PV = PVC.get(key);
    if (PV) return;
    if (PVC.size >= 4) PVC.clear();
    const cols = 9, rows = 5;
    const T = Math.min((w - 14) / (cols + 0.8), (h - 10) / (rows + 0.8));
    const ox = (w - cols * T) / 2, oy = (h - rows * T) / 2;
    const px = Math.max(20, Math.round(T * 2));
    const spr = {
      pillar: mkSpr(1, px, paintPillar), rolls: mkSpr(1, px, paintRolls), box: mkSpr(1, px, (c) => paintBox(c, null)), basket: mkSpr(1, px, paintBasket),
      bomb: mkSpr(1, px, (c) => paintBombSide(c, PCOL[0])), item: mkSpr(1, px, (c) => paintItem(c, IT_RANGE)), item2: mkSpr(1, px, (c) => paintItem(c, IT_BOMB)),
      body: [mkSpr(0.7, px, (c) => paintBody(c, 0)), mkSpr(0.7, px, (c) => paintBody(c, 1))],
      head: [{ cv: mkSpr(1, px, (c) => paintPvFace(c, 0)).cv, k: 1 }, { cv: mkSpr(1, px, (c) => paintPvFace(c, 1)).cv, k: 1 }],
      deb: [0, 1, 5].map((k) => mkSpr(1, Math.max(8, px >> 2), (c) => paintDebris(c, k)))
    };
    const bg = mkCanvas(w * 2, h * 2), c = bg.getContext('2d');
    c.scale(2, 2);
    c.fillStyle = lin(c, 0, 0, 0, h, [0, '#081018', 1, '#0d1a24']); c.fillRect(0, 0, w, h);
    paintArena(c, ox, oy, cols, rows, T, (x, y) => (x & 1) && (y & 1), false, spr.pillar);
    PV = { key, T, ox, oy, cols, rows, spr, bg };
    PVC.set(key, PV);
  }
  // position sur un trajet de cases, parcouru à vitesse constante entre t0 et t1
  function pvPath(pts, t0, t1, t) {
    const n = pts.length - 1, k = clamp((t - t0) / (t1 - t0), 0, 1) * n, i = Math.min(n - 1, Math.floor(k)), f = k - i;
    const a = pts[i], b = pts[i + 1];
    const mv = t > t0 && t < t1, dx = b[0] - a[0];
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, walk: k, mv, lean: mv ? dx : 0 };
  }
  function preview(ctx, w, h, t) {
    try {
      pvInit(w, h);
      const F = fx(), T = PV.T, S = PV.spr;
      const cyc = t % 4.4, X = (x) => PV.ox + (x + 0.5) * T, Y = (y) => PV.oy + (y + 0.5) * T;
      const boomT = 2.5, bt = cyc - boomT;
      let sk = 0;
      if (bt > 0 && bt < 0.45) sk = (1 - bt / 0.45) * T * 0.14;
      ctx.save();
      ctx.fillStyle = '#081018'; ctx.fillRect(0, 0, w, h);
      if (sk) ctx.translate((hash(t * 91) - 0.5) * sk * 2, (hash(t * 57) - 0.5) * sk * 2);
      ctx.drawImage(PV.bg, 0, 0, w, h);
      // caisses (celles de la colonne du milieu sautent)
      const crates = [[0, 0, 'rolls'], [8, 4, 'rolls'], [2, 0, 'basket'], [6, 4, 'basket'], [0, 2, 'box'], [8, 2, 'box'], [4, 0, 'rolls'], [4, 4, 'rolls']];
      for (const [x, y, k] of crates) {
        const mid = x === 4;
        if (mid && bt > 0.35) continue;
        const pop = mid && cyc < 0.35 ? backOut(cyc / 0.35) : 1;
        if (mid && bt > 0) { ctx.globalAlpha = Math.max(0, 1 - bt / 0.35); }
        ctx.drawImage(F.shade, X(x) - T * 0.62, Y(y) - T * 0.62, T * 1.24, T * 1.24);
        const s = T * pop;
        ctx.drawImage(S[k].cv, X(x) - s / 2, Y(y) - s / 2, s, s);
        ctx.globalAlpha = 1;
      }
      // bonus laissés par les caisses
      if (bt > 0.45) {
        const k = backOut((bt - 0.45) / 0.3);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
        for (const y of [0, 4]) ctx.drawImage(F.it[IT_RANGE], X(4) - T * 0.8, Y(y) - T * 0.8, T * 1.6, T * 1.6);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        for (const y of [0, 4]) {
          ctx.save(); ctx.translate(X(4), Y(y) + Math.sin(t * 4) * T * 0.05); if (y === 0) ctx.rotate(Math.PI);
          ctx.drawImage(S.item.cv, -T * k / 2, -T * k / 2, T * k, T * k); ctx.restore();
        }
      }
      // la bombe
      const bx = X(4), by = Y(2);
      if (cyc > 0.25 && bt < 0) {
        const e = cyc - 0.25, f0 = boomT - 0.25, pr = e / f0;
        const phs = TAU * (1.4 * e + 7 * e * e * e / (3 * f0 * f0));
        const pulse = 1 + 0.06 * pr * pr * pr, q = 0.055 * Math.sin(phs);
        const s = T * 1.12 * (cyc < 0.45 ? backOut((cyc - 0.25) / 0.2) : 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.5 * pr; ctx.drawImage(F.red, bx - T * 0.9, by - T * 0.9, T * 1.8, T * 1.8);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.9;
        ctx.drawImage(F.shade, bx - s * 0.44, by + s * 0.22, s * 0.88, s * 0.32);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(bx, by + s * 0.38); ctx.scale(pulse * (1 + q), pulse * (1 - q)); ctx.translate(0, -s * 0.38);
        ctx.drawImage(S.bomb.cv, -s / 2, -s / 2, s, s);
        if (Math.sin(phs) > 0.4) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(pr > 0.7 ? F.w : F.red, -s * 0.36, -s * 0.31, s * 0.72, s * 0.72); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        const fl = Math.max(0.15, 1 - pr);
        const ex = s * (0.22 + 0.13 * fl), ey = s * (-0.31 - 0.15 * fl);
        ctx.strokeStyle = '#ead8ae'; ctx.lineWidth = Math.max(1, T * 0.05);
        ctx.beginPath(); ctx.moveTo(s * 0.205, -s * 0.3); ctx.quadraticCurveTo(s * (0.22 + 0.02 * fl), s * (-0.3 - 0.13 * fl), ex, ey); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        const ss = T * (0.5 + 0.15 * Math.sin(t * 40));
        ctx.drawImage(F.hot, ex - ss / 2, ey - ss / 2, ss, ss);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
      // personnages (P1 tourné de 180°, face à face)
      // P0 pose la bombe et fuit en L ; P1 (dans le souffle) prend peur puis s'écarte
      const p0 = pvPath([[4, 2], [3, 2], [2, 2], [2, 3], [2, 4]], 0.3, 1.2, cyc);
      const p1 = pvPath([[6, 2], [6, 1], [6, 0]], 1.55, 2.05, cyc);
      const win = bt > 0.5;
      const danger = bt < 0 && cyc > 0.6 && cyc < 1.9;
      drawHero(ctx, X(p1.x), Y(p1.y), T, { p: 1, body: S.body[1], head: S.head[1], t: t + 1.3, walk: p1.walk, moving: p1.mv, lean: p1.lean, win, danger, headH: 1.15 });
      drawHero(ctx, X(p0.x), Y(p0.y), T, { p: 0, body: S.body[0], head: S.head[0], t, walk: p0.walk, moving: p0.mv, lean: p0.lean, win, headH: 1.15 });
      // l'explosion
      if (bt >= 0 && bt < 0.75) {
        const life = 1 - bt / 0.75, gr = Math.min(1, bt / 0.08);
        ctx.globalCompositeOperation = 'lighter';
        const cells = [[4, 2, 15]];
        for (let r = 1; r <= 2; r++) { cells.push([4 - r, 2, r < 2 ? 5 : 1]); cells.push([4 + r, 2, r < 2 ? 5 : 4]); cells.push([4, 2 - r, r < 2 ? 10 : 2]); cells.push([4, 2 + r, r < 2 ? 10 : 8]); }
        const fade = Math.min(1, life / 0.35);
        for (const [x, y] of cells) { ctx.globalAlpha = 0.22 * life; ctx.drawImage(F.hot, X(x) - T * 1.3, Y(y) - T * 1.3, T * 2.6, T * 2.6); }
        for (const [x, y, m] of cells) {
          const cx = X(x), cy = Y(y), th = T * (0.34 + 0.4 * fade) * gr * (0.88 + 0.12 * Math.sin(t * 50 + x + y));
          ctx.translate(cx, cy);
          for (let d = 0; d < 4; d++) {
            if (!(m & BIT[d])) continue;
            const a = d * Math.PI / 2, len = T * 0.5 * gr + 0.6;
            ctx.rotate(a);
            ctx.globalAlpha = 0.9 * fade;
            const sx = 128 - ((t * 260 + x * 37 + y * 61 + d * 61) % 128);
            ctx.drawImage(F.strip, sx, 0, 64, 64, 0, -th * 0.95, len, th * 1.9);
            ctx.globalAlpha = 0.7 * fade;
            ctx.drawImage(F.band, 0, -th * 0.42, len, th * 0.84);
            ctx.rotate(-a);
          }
          ctx.translate(-cx, -cy);
          ctx.globalAlpha = 0.85 * fade;
          const cs = T * (m === 15 ? 1.85 : (m === 1 || m === 2 || m === 4 || m === 8) ? 1.2 : 1.02) * (0.5 + 0.5 * fade) * gr;
          ctx.drawImage(F.ball, cx - cs / 2, cy - cs / 2, cs, cs);
          for (let d = 0; d < 2; d++) {
            if (!(m & BIT[d])) continue;
            const es = T * 0.9 * (0.5 + 0.5 * fade) * gr;
            ctx.drawImage(F.ball, cx + DX[d] * T * 0.5 - es / 2, cy + DY[d] * T * 0.5 - es / 2, es, es);
          }
        }
        ctx.globalAlpha = Math.max(0, 1 - bt / 0.2) * 0.85;
        ctx.drawImage(F.gold, bx - T * 1.6, by - T * 1.6, T * 3.2, T * 3.2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255,207,138,' + Math.max(0, 0.9 - bt * 1.6).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, T * 0.07 * life);
        circ(ctx, bx, by, T * (0.4 + bt * 4.2)); ctx.stroke();
      }
      // débris des caisses du milieu
      if (bt > 0 && bt < 1.1) {
        for (let i = 0; i < 14; i++) {
          const yc = i & 1 ? 0 : 4, a = hash(i * 3.7) * TAU, v = (1.2 + hash(i * 5.1) * 2.2) * T, k = (1 - Math.exp(-bt * 3.5)) / 3.5;
          const x = X(4) + Math.cos(a) * v * k, y = Y(yc) + Math.sin(a) * v * k, sz = T * (0.18 + hash(i) * 0.14);
          ctx.globalAlpha = Math.max(0, 1 - bt / 1.1);
          ctx.save(); ctx.translate(x, y); ctx.rotate(hash(i * 9.1) * 6 + bt * (6 + i));
          ctx.drawImage(S.deb[i % 3].cv, -sz / 2, -sz / 2, sz, sz); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      // « BOUM ! »
      if (bt > 0 && bt < 1.1) {
        const k = bt < 0.15 ? backOut(bt / 0.15) : 1;
        ctx.globalAlpha = bt > 0.8 ? Math.max(0, 1 - (bt - 0.8) / 0.3) : 1;
        ctx.save(); ctx.translate(w * 0.37, h * 0.19); ctx.rotate(-0.07); ctx.scale(k, k);
        txtOut(ctx, 'BOUM !', 0, 0, Math.round(h * 0.17), '#ffd34d', "'Bungee', Impact, sans-serif", 'center', Math.max(3, h * 0.032));
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.72, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.45)']);
      ctx.fillRect(0, 0, w, h);
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // 4 bis. Vignette du 2 contre 2 (tuile de la page Coop, lanceur) : notre équipe en bas, BIP et BOP en haut. Mon coéquipier est
  // dans une bulle SOS : je cours la toucher (ligne pointillée), « SAUVÉ ! », puis sa bombe souffle BIP. ~4,8 s, sans erreur possible.
  // ===========================================================================
  const PV2C = new Map();
  function pv2Init(w, h) {
    pvInit(w, h);                                   // tailles et sprites communs de la vignette du duel
    let Q = PV2C.get(PV.key);
    if (Q) return Q;
    if (PV2C.size >= 4) PV2C.clear();
    const T = PV.T, px = Math.max(20, Math.round(T * 2));
    const bg = mkCanvas(w * 2, h * 2), c = bg.getContext('2d');
    c.scale(2, 2);
    c.fillStyle = lin(c, 0, 0, 0, h, [0, '#140d18', 1, '#0d1a24']); c.fillRect(0, 0, w, h);
    paintArena(c, PV.ox, PV.oy, PV.cols, PV.rows, T, (x, y) => (x & 1) && (y & 1), false, PV.spr.pillar);
    paintCoopMarks(c, PV.ox, PV.oy, PV.cols, PV.rows, T);
    Q = {
      bg, body: [0, 1, 2, 3].map((p) => mkSpr(0.7, px, (c2) => paintBody(c2, p))),
      head: [0, 1].map((p) => ({ cv: mkSpr(1, px, (c2) => paintPvFace(c2, p)).cv, k: 1 })).concat([2, 3].map((p) => ({ cv: mkSpr(1, px, (c2) => paintRobotHead(c2, p, false)).cv, k: 1.08 }))),
      sad: { cv: mkSpr(1, px, (c2) => paintRobotHead(c2, 2, true)).cv, k: 1.08 },
      bomb: mkSpr(1, px, (c2) => paintBombSide(c2, PCOL[1]))
    };
    PV2C.set(PV.key, Q);
    return Q;
  }
  function preview2v2(ctx, w, h, t) {
    try {
      const Q = pv2Init(w, h), F = fx(), T = PV.T, S2 = PV.spr;
      const cyc = t % 4.8, X2 = (x) => PV.ox + (x + 0.5) * T, Y2 = (y) => PV.oy + (y + 0.5) * T;
      const saved = cyc >= 1.6, boomT = 3.5, bt = cyc - boomT;
      ctx.save();
      ctx.fillStyle = '#0b141c'; ctx.fillRect(0, 0, w, h);
      if (bt > 0 && bt < 0.4) ctx.translate((hash(t * 91) - 0.5) * T * 0.2, (hash(t * 57) - 0.5) * T * 0.2);
      ctx.drawImage(Q.bg, 0, 0, w, h);
      for (const [x, y, k] of [[0, 2, 'box'], [8, 2, 'box'], [2, 2, 'rolls'], [6, 2, 'rolls'], [0, 0, 'basket'], [8, 0, 'basket']]) {
        ctx.drawImage(F.shade, X2(x) - T * 0.62, Y2(y) - T * 0.62, T * 1.24, T * 1.24); ctx.drawImage(S2[k].cv, X2(x) - T / 2, Y2(y) - T / 2, T, T);
      }
      // la bombe de mon coéquipier (posée après le sauvetage) puis le souffle vertical qui attrape BIP
      if (cyc > 2.1 && bt < 0) {
        const pr = clamp((cyc - 2.1) / (boomT - 2.1), 0, 1), s = T * 1.1 * (1 + 0.06 * pr * pr * pr);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.5 * pr; ctx.drawImage(F.red, X2(4) - T * 0.9, Y2(2) - T * 0.9, T * 1.8, T * 1.8);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.drawImage(Q.bomb.cv, X2(4) - s / 2, Y2(2) - s / 2, s, s);
      }
      if (bt >= 0 && bt < 0.75) {
        const life = 1 - bt / 0.75, gr = Math.min(1, bt / 0.08), fade = Math.min(1, life / 0.35);
        ctx.globalCompositeOperation = 'lighter';
        for (let y = 0; y <= 4; y++) {
          const th = T * (0.34 + 0.4 * fade) * gr, x = X2(4), yy = Y2(y);
          ctx.globalAlpha = 0.22 * life; ctx.drawImage(F.hot, x - T * 1.3, yy - T * 1.3, T * 2.6, T * 2.6);
          ctx.globalAlpha = 0.85 * fade; ctx.drawImage(F.band, x - th * 0.42, yy - T * 0.5, th * 0.84, T);
          const cs = T * (y === 2 ? 1.85 : 1.1) * (0.5 + 0.5 * fade) * gr; ctx.drawImage(F.ball, x - cs / 2, yy - cs / 2, cs, cs);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // les robots : BOP fait les cent pas, BIP (au milieu, en haut) prend peur puis se fait souffler
      const bop = pvPath([[1, 0], [2, 0], [3, 0], [2, 0], [1, 0]], 0, 4.8, cyc);
      drawHero(ctx, X2(bop.x), Y2(bop.y), T, { p: 3, rot: false, body: Q.body[3], head: Q.head[3], t: t + 0.7, walk: bop.walk, moving: bop.mv, lean: bop.lean, headH: 1.15 });
      const bipKo = bt > 0.05;
      drawHero(ctx, X2(4), Y2(0), T, { p: 2, rot: false, body: Q.body[2], head: bipKo ? Q.sad : Q.head[2], t: t + 1.9, dead: bipKo, deadT: Math.max(0, bt), danger: cyc > 2.6 && !bipKo, headH: 1.15 });
      // notre équipe : je cours vers la bulle de mon coéquipier, je la touche : SAUVÉ !
      const me = pvPath([[1, 4], [2, 4], [3, 4], [4, 4], [5, 4]], 0.15, 1.55, cyc), win = saved && cyc < 3.2;
      if (!saved) {
        ctx.save(); ctx.setLineDash([T * 0.18, T * 0.16]); ctx.lineDashOffset = -t * T * 1.2;
        ctx.strokeStyle = hexA(PCOL[0], 0.55 + 0.35 * Math.sin(t * 9)); ctx.lineWidth = Math.max(1.5, T * 0.08);
        ctx.beginPath(); ctx.moveTo(X2(me.x), Y2(me.y)); ctx.lineTo(X2(6), Y2(4)); ctx.stroke(); ctx.restore();
        drawBubble(ctx, X2(6), Y2(4), T, { p: 1, k: 1 - cyc / 2.4, t, head: Q.head[1] });
      } else {
        const k = clamp((cyc - 1.6) / 0.5, 0, 1);
        if (k < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.drawImage(F.blue, X2(6) - T * 1.6, Y2(4) - T * 1.6, T * 3.2, T * 3.2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
        drawHero(ctx, X2(6), Y2(4), T, { p: 1, rot: false, body: Q.body[1], head: Q.head[1], t: t + 1.3, win, headH: 1.15 });
      }
      drawTeamStar(ctx, X2(me.x), Y2(me.y) + T * 0.4, T);
      drawHero(ctx, X2(me.x), Y2(me.y), T, { p: 0, rot: false, body: Q.body[0], head: Q.head[0], t, walk: me.walk, moving: me.mv, lean: me.lean, win, headH: 1.15 });
      if (saved && cyc < 2.6) {
        const k = cyc < 1.75 ? backOut((cyc - 1.6) / 0.15) : 1;
        ctx.globalAlpha = cyc > 2.3 ? Math.max(0, 1 - (cyc - 2.3) / 0.3) : 1;
        ctx.save(); ctx.translate(w * 0.5, h * 0.2); ctx.scale(k, k);
        txtOut(ctx, 'SAUVÉ !', 0, 0, Math.round(h * 0.15), '#9fd4ff', "'Bungee', Impact, sans-serif", 'center', Math.max(3, h * 0.03));
        ctx.restore(); ctx.globalAlpha = 1;
      }
      if (bt > 0 && bt < 1.1) {
        const k = bt < 0.15 ? backOut(bt / 0.15) : 1;
        ctx.globalAlpha = bt > 0.8 ? Math.max(0, 1 - (bt - 0.8) / 0.3) : 1;
        ctx.save(); ctx.translate(w * 0.5, h * 0.2); ctx.rotate(-0.07); ctx.scale(k, k);
        txtOut(ctx, 'BOUM !', 0, 0, Math.round(h * 0.17), '#ffd34d', "'Bungee', Impact, sans-serif", 'center', Math.max(3, h * 0.032));
        ctx.restore(); ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.72, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.45)']);
      ctx.fillRect(0, 0, w, h);
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // 5. Le jeu
  // ===========================================================================
  const HEADH = 1.3;
  const RULE = ['Pose des bombes, fais sauter les caisses', 'et piège l’autre dans l’explosion !'];
  const HINTS = { 2: 'Mèches plus courtes, plus de bonus !', 3: 'La mort subite arrive plus tôt !', 4: 'Ça chauffe : mèches encore plus courtes !' };

  function mount(root, api) {
    if (api && api.coop) return mountCoop(root, api);   // mode Coop (COOP-CONTRACT.md) : « Boum 2 contre 2 », tout à part
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const AU = api.audio || {};
    const PL = [0, 1].map((i) => (api.players && api.players[i]) || { name: 'JOUEUR ' + (i + 1), img: null, sad: null });
    const NAMES = PL.map((p, i) => String((p && p.name) || 'JOUEUR ' + (i + 1)).toUpperCase().slice(0, 12));
    const F = fx();
    let destroyed = false, raf = 0, paused = false;
    // jeu en ligne : chaque téléphone fait tourner le jeu ; l'hôte (P0) est l'arbitre, l'invité (P1) prédit son personnage
    const NETAPI = api.net && typeof api.net.send === 'function' && typeof api.net.onMessage === 'function' ? api.net : null;
    const GUEST = !!NETAPI && (NETAPI.role === 'guest' || NETAPI.me === 1);
    const HOST = !!NETAPI && !GUEST;
    const AIP = !NETAPI && api.ai && (api.ai.p === 0 || api.ai.p === 1) ? api.ai : null;   // contre l'IA : ce joueur est piloté par le jeu
    const SOLO = !!NETAPI || !!AIP;                // un seul joueur humain devant cet écran
    const ME = NETAPI ? (GUEST ? 1 : 0) : AIP ? 1 - AIP.p : -1, OPP = 1 - ME;
    const ROT = ME === 1;                          // en ligne, tout est dessiné pour le joueur de CE téléphone (l'invité : tourné, son écran est retourné)
    const SELF_FLIP = GUEST && !NETAPI.flipped;    // bibliothèque qui ne retourne pas l'écran de l'invité : le jeu retourne son canvas
    const FLIP = !!(NETAPI && (NETAPI.flipped || SELF_FLIP));   // doigts reçus en coordonnées d'écran : on les retourne
    const VIEWERS = SOLO ? [ME] : [0, 1];          // à qui s'adressent les grands textes du canvas
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;' + (SELF_FLIP ? 'transform:rotate(180deg);' : '');
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ----------------------------------------------------------------- état
    let S = null;                                  // simulation de la manche en cours
    let phase = 'intro', phaseT = 0, introDur = 3, firstRound = true, endT = 0;
    let lastRes = null, countSaid = -1;
    let clock = 0, vt = 0;                         // horloges hors pause (sons, animations)
    let shake = 0, flashA = 0, flashCol = '#ffffff', hitStop = 0, slowT = 0;
    let zoom = 1, zoomTo = 1, zoomX = 0, zoomY = 0;
    let iris = null, resumeT = 0, sdFlash = 0, lastTick = -1, bannerTxt = '', bannerTitle = '';
    const press = [0, 0];
    let danger = null, flameDist = null;
    let friends = [];
    try { friends = (typeof api.heads === 'function' ? api.heads() : []) || []; } catch (e) { friends = []; }
    friends = friends.filter((h) => h && imgOk(h.img) && NAMES.indexOf(String(h.name || '').toUpperCase().slice(0, 12)) < 0);

    // ----------------------------------------------------------------- sons
    const later = [];
    const lastSnd = {};
    // pas de son tant que la page n'a reçu aucun geste (sinon le navigateur refuse l'audio et râle dans la console)
    function audioOK() { try { const u = navigator.userActivation; return !u || u.hasBeenActive; } catch (e) { return true; } }
    function tone(f, d, ty, v, fe) { if (destroyed || paused || !audioOK()) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused || !audioOK()) return; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function seq(notes, st, ty, v) { notes.forEach((f, i) => { if (later.length < 40) later.push({ at: clock + i * st, f, d: st * 1.5, ty, v }); }); }
    function canPlay(ch, gap) { if ((lastSnd[ch] == null ? -9 : lastSnd[ch]) + gap > clock) return false; lastSnd[ch] = clock; return true; }
    const SFX = {
      drop() { if (canPlay('drop', 0.04)) { tone(190, 0.1, 'triangle', 0.08, 110); tone(620, 0.04, 'square', 0.02, 380); } },
      boom(big) { if (!canPlay('boom', 0.07)) return; noise(0.6 + big * 0.15, 0.22, 650); tone(150, 0.42, 'sawtooth', 0.05, 36); tone(68, 0.55, 'sine', 0.1, 28); },
      crate() { if (canPlay('crate', 0.05)) { noise(0.16, 0.07, 2800); tone(300, 0.06, 'square', 0.022, 150); } },
      item() { if (canPlay('item', 0.08)) tone(990, 0.12, 'sine', 0.03, 1480); },
      pick() { if (canPlay('pick', 0.05)) seq([660, 880, 1320], 0.055, 'triangle', 0.05); },
      push() { tone(280, 0.09, 'square', 0.035, 560); },
      stop() { if (canPlay('stop', 0.06)) tone(150, 0.06, 'square', 0.03, 80); },
      shield() { tone(1100, 0.28, 'sine', 0.06, 240); noise(0.12, 0.05, 4500); },
      ko() { tone(640, 0.8, 'sawtooth', 0.05, 60); noise(0.55, 0.12, 760); tone(90, 0.5, 'sine', 0.1, 40); },
      win() { seq([523, 659, 784, 1047, 1319], 0.085, 'square', 0.04); },
      draw() { seq([466, 415, 370, 330], 0.13, 'triangle', 0.05); },
      sd() { seq([880, 622, 880, 622, 880, 622], 0.13, 'square', 0.035); },
      land() { if (canPlay('land', 0.05)) { noise(0.14, 0.11, 380); tone(85, 0.16, 'square', 0.045, 45); } },
      tick() { tone(1046, 0.05, 'square', 0.025); },
      count(go) { if (go) { tone(1175, 0.32, 'square', 0.05, 1568); tone(587, 0.32, 'triangle', 0.04); } else tone(587, 0.12, 'square', 0.045); },
      appear() { if (canPlay('appear', 0.1)) { tone(330, 0.18, 'triangle', 0.05, 880); } }
    };
    let lastVib = -9;
    function vib(ms) { if (clock - lastVib < 0.12) return; lastVib = clock; try { if (api.vibrate) api.vibrate(ms); } catch (e) { /* rien */ } }
    function say(text, o) { if (GUEST) return; try { if (api.say) api.say(text, o || {}); } catch (e) { /* rien */ } }   // en ligne, la bibliothèque recopie ceux de l'hôte

    // ----------------------------------------------------------------- mise en page et sprites
    let W = 360, H = 640, dpr = 1, T = 30, ox = 0, oy = 0, aw = 0, ah = 0, fr = 10;
    let ctl = null, SPR = null, bgCv = null, decalCv = null;
    const decals = [];
    const headOk = [false, false];
    function initialOf(p) { const s = NAMES[p].replace(/[^A-Z0-9À-ÖØ-Þ]/g, ''); return s.charAt(0) || (p ? 'B' : 'A'); }
    function makeHead(p, sad) {
      const pl = PL[p] || {};
      const img = sad ? (imgOk(pl.sad) ? pl.sad : imgOk(pl.img) ? pl.img : null) : (imgOk(pl.img) ? pl.img : null);
      const hpx = Math.min(240, Math.max(18, Math.round(Math.max(T * 1.45, ctl && ctl.land ? 100 : 54) * dpr)));
      if (img) {
        try {
          const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
          const h = hpx, w = Math.max(1, Math.round(h * iw / ih)), pad = Math.max(2, Math.round(h * 0.075));
          const W2 = w + pad * 2, H2 = h + pad * 2;
          const cv = mkCanvas(W2, H2), c = cv.getContext('2d');
          const ring = (r, col) => {
            const tmp = mkCanvas(W2, H2), g = tmp.getContext('2d');
            for (let k = 0; k < 16; k++) { const a = k * TAU / 16; g.drawImage(img, pad + Math.cos(a) * r, pad + Math.sin(a) * r, w, h); }
            g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, W2, H2);
            c.drawImage(tmp, 0, 0);
          };
          ring(pad, 'rgba(2,4,8,0.9)');
          ring(pad * 0.6, PCOL[p]);
          c.drawImage(img, pad, pad, w, h);
          return { cv, k: H2 / h };
        } catch (e) { /* tête de secours */ }
      }
      const s = mkSpr(1, hpx, (c) => paintFallbackHead(c, p, initialOf(p), sad, FD));
      return { cv: s.cv, k: 1.05 };
    }
    function buildHeads() {
      SPR.head = [makeHead(0, false), makeHead(1, false)];
      SPR.sad = [makeHead(0, true), makeHead(1, true)];
      headOk[0] = imgOk(PL[0].img); headOk[1] = imgOk(PL[1].img);
    }
    function buildSprites() {
      const px = Math.max(12, Math.round(T * dpr));
      const Sp = {};
      Sp.pillar = mkSpr(1, px, paintPillar);
      Sp.crate = [crateSpr(px, paintRolls), crateSpr(px, (c) => paintBox(c, null)), crateSpr(px, paintBasket)];
      Sp.face = friends.map(() => null);
      Sp.fallen = mkSpr(1, px, paintFallen);
      const bpx2 = Math.max(12, Math.round(T * 1.15 * dpr));
      Sp.bomb = [mkSpr(1, bpx2, (c) => paintBombSide(c, PCOL[0])), mkSpr(1, bpx2, (c) => paintBombSide(c, PCOL[1]))];
      Sp.item = ITEMS.map((_, k) => mkSpr(1, px, (c) => paintItem(c, k)));
      Sp.mini = ITEMS.map((_, k) => mkSpr(1, Math.max(16, Math.round(26 * dpr)), (c) => paintItem(c, k)));
      const bodyPx = Math.round(px * 1.2);
      Sp.body = [mkSpr(0.7, bodyPx, (c) => paintBody(c, 0)), mkSpr(0.7, bodyPx, (c) => paintBody(c, 1))];
      Sp.deb = [0, 1, 2, 3, 4, 5].map((k) => mkSpr(1, Math.max(8, Math.round(px * 0.32)), (c) => paintDebris(c, k)));
      const bpx = Math.max(16, Math.round((ctl ? ctl.RB : 40) * 1.2 * dpr));
      Sp.btnBomb = mkSpr(1, bpx, paintBombIcon);
      SPR = Sp;
      buildHeads();
    }
    function crateSpr(px, painter) {               // caisse + son ombre douce dans un seul sprite (1,3 case)
      return mkSpr(1.3, px, (c) => { c.globalAlpha = 0.9; c.drawImage(F.shade, -0.63, -0.6, 1.26, 1.26); c.globalAlpha = 1; painter(c); });
    }
    function faceCrate(f) {
      if (!friends.length) return null;
      const k = ((f % friends.length) + friends.length) % friends.length;
      if (!SPR.face[k]) SPR.face[k] = crateSpr(Math.max(12, Math.round(T * dpr)), (c) => paintBox(c, friends[k].img));
      return SPR.face[k];
    }
    let layoutKey = '', quality = 1;
    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(200, Math.round(r.width || root.clientWidth || 360));
      H = Math.max(200, Math.round(r.height || root.clientHeight || 640));
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      const key = [W, H, dpr, S ? S.cols : 0, S ? S.rows : 0, S && S.notch ? 1 : 0].join('|');
      if (key === layoutKey && bgCv) { rebuildDecals(); return; }      // même écran : on garde décor et sprites
      layoutKey = key;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const cols = S ? S.cols : (H >= W ? 11 : 15), rows = S ? S.rows : (H >= W ? 15 : 11);
      const FR = 0.34;
      if (H >= W) {
        const minBand = Math.max(92, Math.round(H * 0.14));
        T = Math.min((W - 8) / (cols + 2 * FR), (H - 2 * minBand) / (rows + 2 * FR));
      } else {
        const side = Math.max(140, W * 0.155);
        T = Math.min((W - 2 * side) / (cols + 2 * FR), (H - 16) / (rows + 2 * FR));
      }
      T = Math.max(12, Math.floor(T * dpr) / dpr);
      aw = cols * T; ah = rows * T; fr = Math.max(5, T * FR);
      ox = Math.round((W - aw) / 2); oy = Math.round((H - ah) / 2);
      if (H >= W) {
        const y0 = oy + ah + fr, bandH = H - y0;
        const R = clamp(bandH * 0.34, 30, 60), RB = clamp(bandH * 0.35, 30, 56);
        const sx = Math.max(R + 12, W * 0.14), bx = W - Math.max(RB + 12, W * 0.14);
        const ix = sx + R + 12, iw = Math.max(60, bx - RB - 12 - ix);
        ctl = { land: false, y0, bandH, R, RB, sx, sy: y0 + bandH / 2, bx, by: y0 + bandH / 2, ix, iw, iy: y0 + bandH / 2 };
      } else {
        // paysage : dans chaque marge (moitié du joueur) — infos en haut, commandes centrées dans la place restante
        const mw = ox - fr;
        const ns = clamp((mw - 24) / 9.5, 11, 17), top = H / 2 + 40;
        const infoB = top + ns * 3.7 + 12;
        const R = clamp(Math.min(mw * 0.3, (H - 12 - infoB) / 2), 28, 64), RB = clamp(Math.min(mw * 0.3, R * 1.05), 28, 60);
        const cy = Math.min(H - 10 - Math.max(R, RB), (infoB + H - 12) / 2);
        ctl = { land: true, mw, R, RB, sx: mw / 2, sy: cy, bx: W - mw / 2, by: cy, ix: 12, iw: mw - 24, iy: top + ns * 0.55 };
      }
      buildSprites();
      buildBg();
    }
    function buildBg() {
      const cv = mkCanvas(W * dpr, H * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.fillStyle = lin(c, 0, 0, 0, H, [0, '#08131c', 0.5, BG, 1, '#110e0a']); c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.28; c.drawImage(F.p[1], -W * 0.35, -H * 0.3, W * 1.7, H * 0.62); c.drawImage(F.p[0], -W * 0.35, H * 0.68, W * 1.7, H * 0.62);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(255,255,255,0.03)';
      for (let y = 7, j = 0; y < H; y += 13, j++) for (let x = 7 + (j & 1) * 6.5; x < W; x += 13) c.fillRect(x, y, 1.3, 1.3);
      for (let p = 0; p < 2; p++) {
        c.save();
        if (p) { c.translate(W, H); c.rotate(Math.PI); }
        if (!ctl.land) {
          const y0 = ctl.y0 + 6, h = H - y0 - 6;
          rrect(c, 6, y0, W - 12, h, 18);
          c.fillStyle = lin(c, 0, y0, 0, y0 + h, [0, 'rgba(24,40,54,0.7)', 1, 'rgba(10,18,26,0.85)']); c.fill();
          c.strokeStyle = hexA(PCOL[p], 0.28); c.lineWidth = 1.5; c.stroke();
          c.fillStyle = lin(c, W * 0.2, 0, W * 0.8, 0, [0, hexA(PCOL[p], 0), 0.5, hexA(PCOL[p], 0.75), 1, hexA(PCOL[p], 0)]);
          c.fillRect(W * 0.2, y0, W * 0.6, 2);
        } else {
          for (const side of [0, 1]) {
            const x0 = side ? W - ctl.mw + 6 : 6, y0 = H / 2 + 36, h = H - y0 - 8, w = ctl.mw - 12;
            rrect(c, x0, y0, w, h, 16);
            c.fillStyle = lin(c, 0, y0, 0, y0 + h, [0, 'rgba(24,40,54,0.55)', 1, 'rgba(10,18,26,0.85)']); c.fill();
            c.strokeStyle = hexA(PCOL[p], 0.25); c.lineWidth = 1.5; c.stroke();
          }
        }
        c.restore();
      }
      const Sx = S;
      paintArena(c, ox, oy, Sx.cols, Sx.rows, T, (x, y) => Sx.cells[y * Sx.cols + x] === PILLAR, Sx.notch, SPR.pillar);
      bgCv = cv;
      rebuildDecals();
    }
    // traces de brûlé sur le sol (s'accumulent pendant la manche)
    const DECAL_LIFE = 14;
    let decalTick = 0;
    function drawDecal(c, d) {
      const x = ox + (d.x + 0.5) * T, y = oy + (d.y + 0.5) * T, s = d.s * T;
      const k = clamp(1 - (clock - d.born) / DECAL_LIFE, 0, 1);
      if (k <= 0) return;
      c.globalAlpha = d.a * k;
      c.translate(x, y); c.rotate(d.r);
      c.drawImage(F.scorch, -s, -s, s * 2, s * 2);
      c.rotate(-d.r); c.translate(-x, -y);
      c.globalAlpha = 1;
    }
    function rebuildDecals() {
      const cw = Math.ceil(W * dpr), chh = Math.ceil(H * dpr);
      if (!decalCv || decalCv.width !== cw || decalCv.height !== chh) decalCv = mkCanvas(cw, chh);
      const c = decalCv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cw, chh);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const d of decals) drawDecal(c, d);
      c.globalAlpha = 1;
    }
    function updDecals(dt) {                      // les traces s'estompent : on repeint la couche deux fois par seconde
      decalTick += dt;
      if (decalTick < 0.5 || !decals.length) return;
      decalTick = 0;
      while (decals.length && clock - decals[0].born > DECAL_LIFE) decals.shift();
      rebuildDecals();
    }
    function addScorch(x, y, s, a) {
      const d = { x, y, s, a, r: Math.random() * TAU, born: clock };
      decals.push(d);
      if (decals.length > 140) { decals.splice(0, 40); rebuildDecals(); return; }
      if (decalCv) { const c = decalCv.getContext('2d'); c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0); drawDecal(c, d); c.restore(); }
    }

    // ----------------------------------------------------------------- particules (repère des cases)
    const PT = [], RG = [], TX = [];
    function part(k, x, y, vx, vy, life, s0, s1, img, drag) {
      if (PT.length >= 300) PT.splice(0, 24);
      const p = { k, x, y, vx, vy, life, max: life, s0, s1, img, rot: 0, vr: 0, drag: drag || 0, a0: 1, col: null };
      PT.push(p);
      return p;
    }
    function sparks(x, y, n, g, spd, life, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        part(1, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.6), 0, g, 2.4);
      }
    }
    function puffs(x, y, n, spd, life, s0, s1, a0) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * Math.random();
        const p = part(0, x + Math.cos(a) * 0.15, y + Math.sin(a) * 0.15, Math.cos(a) * v, Math.sin(a) * v, life * (0.7 + Math.random() * 0.5), s0, s1, F.smokeL, 1.2);
        p.a0 = a0 == null ? 0.8 : a0;
      }
    }
    function debris(x, y, n, kinds, spd, dir) {
      for (let i = 0; i < n; i++) {
        let a = Math.random() * TAU;
        if (dir != null && Math.random() < 0.6) a = Math.atan2(DY[dir], DX[dir]) + (Math.random() - 0.5) * 1.6;
        const v = spd * (0.4 + Math.random() * 0.8);
        const p = part(2, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.5, 0.2 + Math.random() * 0.16, 0, SPR.deb[kinds[i % kinds.length]].cv, 2.6);
        p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * 18;
      }
    }
    function confetti(x, y, n, cols) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = 1.5 + Math.random() * 4.5;
        const p = part(3, x, y, Math.cos(a) * v, Math.sin(a) * v, 1.2 + Math.random() * 1.2, 0.09 + Math.random() * 0.07, 0, null, 1.6);
        p.col = cols[i % cols.length]; p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * 16;
      }
    }
    function ring(x, y, r0, r1, life, col, w) { if (RG.length < 24) RG.push({ x, y, r0, r1, life, max: life, col, w }); }
    function pop(s, x, y, p, col, size, life) {
      if (TX.length >= 10) TX.shift();
      TX.push({ s, x, y, p, col, size: size || 1, life: life || 1.2, max: life || 1.2 });
    }

    // ----------------------------------------------------------------- événements de la simulation → effets
    function boomFx(e) {
      const big = e.range >= 4 ? 1 : 0;
      SFX.boom(big);
      vib(30);
      shake = Math.max(shake, 5 + e.range * 0.9);
      flashA = Math.max(flashA, 0.08 + big * 0.05); flashCol = '#ffe6b8';
      const x = e.x, y = e.y;
      const fl = part(1, x, y, 0, 0, 0.14, 0.7, 2.6, F.gold, 0); fl.a0 = 0.9;
      part(1, x, y, 0, 0, 0.5, 1.2, 2.8, F.ball, 0);
      ring(x, y, 0.5, 1.4 + e.range * 0.6, 0.42, '#ffcf8a', 0.09);
      ring(x, y, 0.3, 1.0 + e.range * 0.4, 0.32, PCOL[e.owner], 0.07);
      sparks(x, y, 10 + e.range * 2, F.hot, 4.5 + e.range * 0.6, 0.75, 0.24);
      puffs(x, y, 4, 0.8, 1.6, 0.9, 2.4, 0.85);
      addScorch(x, y, 0.8, 0.55);
      for (let d = 0; d < 4; d++) {
        for (let r = 1; r <= e.reach[d]; r++) {
          const cx = x + DX[d] * r, cy = y + DY[d] * r;
          if (flameDist) flameDist[cy * S.cols + cx] = r;
          part(1, cx, cy, DX[d] * 2, DY[d] * 2, 0.32 + Math.random() * 0.2, 0.75, 1.4, F.fire, 3);
          if (Math.random() < 0.6) puffs(cx, cy, 1, 0.6, 1.3, 0.7, 1.8, 0.75);
          if (r === e.reach[d]) sparks(cx, cy, 3, F.hot, 3.2, 0.5, 0.2);
          if (r === e.reach[d] || Math.random() < 0.5) addScorch(cx, cy, 0.5, 0.3);
        }
      }
      if (flameDist) flameDist[y * S.cols + x] = 0;
    }
    function crateFx(e) {
      SFX.crate();
      const kinds = e.kind === 0 ? [0, 0, 5] : e.kind === 1 ? [1, 1, 2] : [3, 3, 4];
      debris(e.x, e.y, 9, kinds, 4.6, e.d);
      puffs(e.x, e.y, 2, 0.8, 1.0, 0.7, 1.6, 0.6);
      if (e.face >= 0 && friends.length) {
        const h = friends[((e.face % friends.length) + friends.length) % friends.length];
        const a = Math.atan2(DY[e.d], DX[e.d]) + (Math.random() - 0.5) * 0.8;
        const p = part(4, e.x, e.y, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 1.1, 0.8, 0.8, imgOk(h.sad) ? h.sad : h.img, 2);
        p.rot = 0; p.vr = (Math.random() < 0.5 ? -1 : 1) * 9;
      }
    }
    function dangerAt(a) {
      if (!danger) return false;
      const i = cellAt(S, Math.round(a.x), Math.round(a.y));
      return i >= 0 && danger[i] > 0.15;
    }
    function handleEvents() {
      const ev = S.events;
      for (let k = 0; k < ev.length; k++) {
        const e = ev[k];
        if (HOST) netEv(e);                        // en ligne : l'hôte transmet l'événement à l'invité (lot fiable)
        switch (e.type) {
          case 'drop':
            SFX.drop();
            ring(e.x, e.y, 0.2, 0.75, 0.25, PCOL[e.p], 0.08);
            puffs(e.x, e.y + 0.2, 2, 0.6, 0.5, 0.35, 0.8, 0.45);
            break;
          case 'boom': boomFx(e); break;
          case 'crate': crateFx(e); break;
          case 'item':
            SFX.item();
            ring(e.x, e.y, 0.1, 0.8, 0.35, ITEMS[e.it].col, 0.08);
            sparks(e.x, e.y, 6, F.it[e.it], 2, 0.5, 0.18);
            break;
          case 'burn':
            puffs(e.x, e.y, 3, 0.7, 0.9, 0.5, 1.3, 0.7);
            sparks(e.x, e.y, 5, F.it[e.it], 2.5, 0.4, 0.16);
            break;
          case 'pick': {
            SFX.pick();
            const I = ITEMS[e.it];
            ring(e.x, e.y, 0.2, 1.3, 0.4, I.col, 0.12);
            sparks(e.x, e.y, 12, F.it[e.it], 3.5, 0.6, 0.22);
            pop(I.label, e.x, e.y, e.p, I.col, 1, 1.3);
            rumble('tick', e.p);                   // bonus ramassé : petit tic dans SA manette
            break;
          }
          case 'push': SFX.push(); ring(e.x, e.y, 0.3, 0.8, 0.22, '#ff9ae4', 0.08); break;
          case 'stop': SFX.stop(); break;
          case 'shield':
            SFX.shield();
            ring(e.x, e.y - 0.2, 0.5, 1.6, 0.45, '#bfe6ff', 0.14);
            sparks(e.x, e.y - 0.2, 14, F.blue, 3.5, 0.6, 0.24);
            pop('SAUVÉ !', e.x, e.y, e.p, '#9fd4ff', 1.1, 1.3);
            vib(60);
            break;
          case 'ko': {
            SFX.ko();
            vib(170);
            hitStop = 0.12; slowT = 0.95;
            shake = Math.max(shake, 15);
            flashA = Math.max(flashA, 0.38); flashCol = '#fff4dc';
            if (S.actors[1 - e.p].alive) { zoomTo = 1.15; zoomX = e.x; zoomY = e.y; }
            else { zoomTo = 1.03; zoomX = (S.cols - 1) / 2; zoomY = (S.rows - 1) / 2; }   // les deux touchés : pas de zoom sur l'un
            sparks(e.x, e.y - 0.3, 22, F.p[e.p], 5, 0.9, 0.3);
            puffs(e.x, e.y, 5, 1, 1.6, 0.6, 1.8, 0.8);
            ring(e.x, e.y, 0.3, 2.6, 0.6, '#ffffff', 0.16);
            break;
          }
          case 'sd':
            SFX.sd();
            sdFlash = 1;
            flashA = Math.max(flashA, 0.18); flashCol = '#ff4d5e';
            say('MORT SUBITE !', { color: ACCENT, ms: 1500 });
            break;
          case 'land':
            SFX.land();
            shake = Math.max(shake, 3.5);
            puffs(e.x, e.y, 3, 1.6, 0.7, 0.5, 1.2, 0.55);
            sparks(e.x, e.y, 4, F.dust, 2.5, 0.4, 0.2);
            break;
          case 'squash': puffs(e.x, e.y, 3, 1, 0.8, 0.5, 1.2, 0.7); break;
          case 'result': onResult(e); break;
          default: break;
        }
      }
      ev.length = 0;
    }

    // ----------------------------------------------------------------- rendu de l'arène (repère écran, caméra appliquée)
    const X = (x) => ox + (x + 0.5) * T;
    const Y = (y) => oy + (y + 0.5) * T;
    function halfOf(x, y) {                        // orientation des icônes : vers le joueur dont c'est la moitié
      const my = (S.rows - 1) / 2;
      if (y < my) return 1;
      if (y > my) return 0;
      return x > (S.cols - 1) / 2 ? 1 : 0;
    }
    // géométrie de la bombe (repère de son propriétaire, unités = taille du sprite) : base au sol, col, bout de mèche
    const BOMB_S = 1.12, BASE_Y = 0.38;
    function bombAnim(b) {
      const e = b.fuse0 - b.fuse, F0 = b.fuse0, pr = clamp(e / F0, 0, 1);
      const phs = TAU * (1.4 * e + 7 * e * e * e / (3 * F0 * F0));
      const sw = 1 + 0.06 * pr * pr * pr, q = 0.055 * Math.sin(phs);
      return { pr, phs, sx: sw * (1 + q), sy: sw * (1 - q), fl: Math.max(0.15, 1 - pr) };
    }
    function bombPt(an, px, py) { return [px * an.sx, BASE_Y + (py - BASE_Y) * an.sy]; }   // point du sprite → repère local (squash au sol)
    function fuseTip(b) {
      const an = bombAnim(b), sg = b.owner ? -1 : 1;
      const p = bombPt(an, 0.22 + 0.13 * an.fl, -0.31 - 0.15 * an.fl);
      return [b.x + sg * p[0] * BOMB_S, b.y + sg * p[1] * BOMB_S];
    }
    function drawBomb(b) {
      const x = X(b.x), y = Y(b.y), an = bombAnim(b), pr = an.pr;
      const born = b.t < 0.22 ? backOut(b.t / 0.22) : 1;
      const s = T * BOMB_S * born;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.14 + 0.5 * pr * (0.6 + 0.4 * Math.sin(an.phs));
      ctx.drawImage(F.red, x - T * 1.05, y - T * 1.05, T * 2.1, T * 2.1);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (b.slide >= 0) {                          // bombe poussée : traits de vitesse
        const dx = DX[b.slide], dy = DY[b.slide], qx = -dy, qy = dx;
        ctx.strokeStyle = 'rgba(255,220,240,0.5)'; ctx.lineWidth = Math.max(1, T * 0.05); ctx.lineCap = 'round';
        ctx.beginPath();
        for (let k = -1; k <= 1; k++) {
          const o = k * T * 0.2, l0 = T * (0.42 + Math.abs(k) * 0.1), l1 = T * (1.0 + (k ? 0 : 0.3));
          ctx.moveTo(x - dx * l0 + qx * o, y - dy * l0 + qy * o); ctx.lineTo(x - dx * l1 + qx * o, y - dy * l1 + qy * o);
        }
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(x, y);
      if (b.owner) ctx.rotate(Math.PI);
      if (b.slide >= 0) ctx.rotate(Math.sin(vt * 28 + b.id) * 0.22);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(F.shade, -s * 0.44, s * 0.22, s * 0.88, s * 0.32);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hexA(PCOL[b.owner], 0.9); ctx.lineWidth = Math.max(1.2, T * 0.05);
      ell(ctx, 0, s * BASE_Y, s * 0.31 * an.sx, s * 0.1); ctx.stroke();
      ctx.save();
      ctx.translate(0, s * BASE_Y); ctx.scale(an.sx, an.sy); ctx.translate(0, -s * BASE_Y);
      ctx.drawImage(SPR.bomb[b.owner].cv, -s / 2, -s / 2, s, s);
      const blink = Math.sin(an.phs);
      if (blink > 0.3) {                           // clignote rouge, puis blanc juste avant d'exploser
        const k = (blink - 0.3) / 0.7;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k * (0.34 + 0.3 * pr);
        ctx.drawImage(pr > 0.7 ? F.w : F.red, -s * 0.36, -s * 0.31, s * 0.72, s * 0.72);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      ctx.restore();
      // mèche qui raccourcit + étincelle
      const c0 = bombPt(an, 0.205, -0.3), c1 = bombPt(an, 0.22 + 0.02 * an.fl, -0.3 - 0.13 * an.fl), c2 = bombPt(an, 0.22 + 0.13 * an.fl, -0.31 - 0.15 * an.fl);
      ctx.beginPath(); ctx.moveTo(c0[0] * s, c0[1] * s); ctx.quadraticCurveTo(c1[0] * s, c1[1] * s, c2[0] * s, c2[1] * s);
      ctx.strokeStyle = '#1a120a'; ctx.lineWidth = Math.max(1.8, T * 0.09); ctx.stroke();
      ctx.strokeStyle = '#ead8ae'; ctx.lineWidth = Math.max(1, T * 0.05); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const ss = T * (0.62 + 0.22 * Math.sin(vt * 47 + b.id)), ex = c2[0] * s, ey = c2[1] * s;
      ctx.drawImage(F.hot, ex - ss / 2, ey - ss / 2, ss, ss);
      ctx.drawImage(F.w, ex - ss * 0.2, ey - ss * 0.2, ss * 0.4, ss * 0.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
    function drawFlames() {
      const N = S.N, cols = S.cols, fl = S.flameT, M = S.flameM;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {                // lumière des flammes sur le sol
        if (fl[i] <= 0) continue;
        ctx.globalAlpha = 0.22 * fl[i] / FLAME_DUR;
        ctx.drawImage(F.hot, X(i % cols) - T * 1.3, Y((i / cols) | 0) - T * 1.3, T * 2.6, T * 2.6);
      }
      for (let i = 0; i < N; i++) {
        const ft = fl[i];
        if (ft <= 0) continue;
        const age = FLAME_DUR - ft, life = ft / FLAME_DUR;
        const gr = clamp((age - (flameDist ? flameDist[i] : 0) * 0.022) / 0.07, 0, 1);
        if (gr <= 0) continue;
        const fade = life < 0.35 ? life / 0.35 : 1;
        const m = M[i], x = X(i % cols), y = Y((i / cols) | 0);
        const flick = 0.86 + 0.14 * Math.sin(vt * 53 + i * 1.7);
        const th = T * (0.34 + 0.4 * fade) * gr * flick;
        const fa = Math.min(1, fade * 1.4);
        // bras : cœur continu + texture de feu turbulente qui file vers l'extérieur
        ctx.translate(x, y);
        for (let d = 0; d < 4; d++) {
          if (!(m & BIT[d])) continue;
          const a = d * Math.PI / 2, len = T * 0.5 * gr + 0.6;
          ctx.rotate(a);
          ctx.globalAlpha = fa * 0.9;
          const sx = 128 - ((vt * 260 + i * 37 + d * 61) % 128);
          ctx.drawImage(F.strip, sx, 0, 64, 64, 0, -th * 0.95, len, th * 1.9);
          ctx.globalAlpha = fa * 0.7;
          ctx.drawImage(F.band, 0, -th * 0.42, len, th * 0.84);
          ctx.rotate(-a);
        }
        ctx.translate(-x, -y);
        // boules de feu qui roulent : au centre de la case et sur ses bords (droite / bas, pour ne pas doubler)
        const nb = (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0) + (m & 8 ? 1 : 0);
        const big = (m & 16) ? 1.85 : (nb !== 2 || ((m & 5) && (m & 10))) ? 1.2 : 1.02;
        const roll = 0.12 * Math.sin(vt * 31 + i * 2.3);
        let cs = T * big * (0.5 + 0.5 * fade) * gr * (flick + roll);
        ctx.globalAlpha = fa * 0.85;
        ctx.drawImage(F.ball, x - cs / 2, y - cs / 2, cs, cs);
        for (let d = 0; d < 2; d++) {
          if (!(m & BIT[d])) continue;
          const ex = x + DX[d] * T * 0.5, ey = y + DY[d] * T * 0.5;
          cs = T * 0.9 * (0.5 + 0.5 * fade) * gr * (0.9 + 0.15 * Math.sin(vt * 37 + i * 1.3 + d));
          ctx.drawImage(F.ball, ex - cs / 2, ey - cs / 2, cs, cs);
        }
        // langue de feu qui danse
        const jx = (Math.random() - 0.5) * T * 0.6, jy = (Math.random() - 0.5) * T * 0.6, js = T * (0.3 + Math.random() * 0.4) * fade * gr;
        ctx.globalAlpha = fa * 0.7;
        ctx.drawImage(F.hot, x + jx - js / 2, y + jy - js / 2, js, js);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawArena() {
      const N = S.N, cols = S.cols;
      if (decalCv && decals.length) ctx.drawImage(decalCv, 0, 0, W, H);
      if (danger) {
        const pulse = 0.55 + 0.45 * Math.sin(vt * 14);
        for (let i = 0; i < N; i++) {
          const d = danger[i];
          if (d <= 0.01) continue;
          ctx.fillStyle = 'rgba(255,58,70,' + (0.05 + 0.22 * d * pulse).toFixed(3) + ')';
          rrect(ctx, ox + (i % cols) * T + T * 0.07, oy + ((i / cols) | 0) * T + T * 0.07, T * 0.86, T * 0.86, T * 0.16); ctx.fill();
        }
      }
      for (const f of S.sd.falling) {             // ombre annonciatrice
        const k = 1 - f.t / DROP_WARN, x = X(f.i % cols), y = Y((f.i / cols) | 0);
        ctx.globalAlpha = 0.25 + 0.6 * k;
        const s = T * (0.5 + 0.8 * k);
        ctx.drawImage(F.shade, x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = 'rgba(255,77,94,' + (0.45 + 0.5 * Math.abs(Math.sin(vt * 12))).toFixed(2) + ')';
        ctx.lineWidth = Math.max(1.5, T * 0.07);
        rrect(ctx, x - T * 0.43, y - T * 0.43, T * 0.86, T * 0.86, T * 0.12); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < N; i++) {
        if (!S.fallen[i]) continue;
        const x = ox + (i % cols) * T, y = oy + ((i / cols) | 0) * T;
        ctx.drawImage(F.shade, x - T * 0.2, y - T * 0.2, T * 1.4, T * 1.4);
        ctx.drawImage(SPR.fallen.cv, x, y, T, T);
      }
      for (let i = 0; i < N; i++) {                // bonus
        const it = S.items[i];
        if (it < 0) continue;
        const cx = i % cols, cy = (i / cols) | 0, x = X(cx), y = Y(cy), age = S.itemT[i];
        const k = age < 0.32 ? backOut(age / 0.32) : 1;
        const bob = Math.sin(vt * 3.6 + i) * T * 0.05;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42 + 0.16 * Math.sin(vt * 5 + i);
        ctx.drawImage(F.it[it], x - T * 0.9, y - T * 0.9, T * 1.8, T * 1.8);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.8;
        ctx.drawImage(F.shade, x - T * 0.42, y - T * 0.3, T * 0.84, T * 0.84);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(x, y + bob);
        if (halfOf(cx, cy)) ctx.rotate(Math.PI);
        const s = T * 0.94 * k;
        ctx.drawImage(SPR.item[it].cv, -s / 2, -s / 2, s, s);
        const sh = ((vt * 0.6 + i * 0.37) % 1.6) - 0.3;   // reflet qui passe
        if (sh > 0 && sh < 1) {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * Math.sin(sh * Math.PI);
          ctx.fillStyle = '#ffffff';
          const xx = (sh - 0.5) * s * 0.9;
          poly(ctx, [xx - s * 0.08, -s * 0.3, xx + s * 0.04, -s * 0.3, xx + s * 0.1, s * 0.3, xx - s * 0.02, s * 0.3]); ctx.fill();
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
      const intro = phase === 'intro' ? phaseT : 99;
      const mxc = (cols - 1) / 2, myc = (S.rows - 1) / 2;
      for (let i = 0; i < N; i++) {                // caisses
        const c = S.cells[i];
        if (c !== CRATE && c !== BREAKING) continue;
        const cx = i % cols, cy = (i / cols) | 0, x = X(cx), y = Y(cy);
        let s = T, a = 1, k = 0;
        if (intro < 2) {
          const q = (intro - 0.04 - Math.hypot(cx - mxc, cy - myc) * 0.05) / 0.3;
          if (q <= 0) continue;
          s = T * backOut(q);
        }
        if (c === BREAKING) { k = 1 - S.breakT[i] / BREAK_DUR; s *= 1 + 0.16 * k; a = 1 - k * k; }
        ctx.globalAlpha = a;
        const spr = (S.kind[i] === 1 && S.face[i] >= 0 && faceCrate(S.face[i])) || SPR.crate[S.kind[i]];
        const jx = k ? Math.sin(vt * 90 + i) * T * 0.04 : 0;
        const rot = (hash(Math.min(i, N - 1 - i) * 1.37) - 0.5) * 0.1 + (halfOf(cx, cy) ? Math.PI : 0);
        ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(spr.cv, -s * 0.65 + jx, -s * 0.65, s * 1.3, s * 1.3);
        ctx.rotate(-rot); ctx.translate(-x, -y);
        if (k) { ctx.globalAlpha = a * Math.min(0.75, k * 1.2); ctx.fillStyle = '#140904'; rrect(ctx, x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9, s * 0.12); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      for (const b of S.bombs) drawBomb(b);
      drawFlames();
    }
    function drawActors() {
      if (phase === 'wait') return;
      const V0 = vpos(0), V1 = vpos(1);            // positions affichées (en ligne : l'adversaire est lissé)
      const ord = V0.y <= V1.y ? [0, 1] : [1, 0];
      ctx.globalCompositeOperation = 'lighter';    // chaque personnage éclaire le sol à sa couleur
      for (const p of ord) {
        const a = S.actors[p], v = vpos(p);
        if (!a.alive || (phase === 'intro' && phaseT < 0.5 + p * 0.12)) continue;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(F.p[p], X(v.x) - T * 1.15, Y(v.y) - T * 0.85, T * 2.3, T * 2.3);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const p of ord) {
        const a = S.actors[p], v = vpos(p);
        let drop = null;
        if (phase === 'intro') { drop = clamp((phaseT - 0.5 - p * 0.12) / 0.38, 0, 1); if (drop <= 0) continue; }
        const won = a.win || (lastRes && lastRes.winner === p && phase !== 'intro' && phase !== 'play');
        drawHero(ctx, X(v.x), Y(v.y), T, {
          p, body: SPR.body[p], head: SPR.head[p], sad: SPR.sad[p], t: vt + p * 1.3, walk: v.walk, moving: v.moving && phase === 'play',
          lean: v.moving ? (p === 0 ? DX[v.dir] : -DX[v.dir]) : 0, dead: !a.alive, deadT: a.deadT, why: a.why, win: won,
          shield: a.shield, invul: a.invul, danger: a.alive && phase === 'play' && dangerAt(v), drop, headH: HEADH
        });
      }
    }
    function drawLocal(p, x, y, fn) {              // dessine dans le repère du joueur p, centré sur (x, y)
      ctx.save(); ctx.translate(x, y); if (p) ctx.rotate(Math.PI);
      fn(); ctx.restore();
    }
    function drawMarkers() {
      if (phase === 'intro' && phaseT > 0.85) {    // « TOI » au-dessus de chaque personnage (en ligne : TOI sur le mien, le nom de l'autre)
        const a = clamp((phaseT - 0.85) / 0.25, 0, 1) * clamp((introDur + 0.3 - phaseT) / 0.3, 0, 1);
        for (let p = 0; p < 2; p++) {
          const A = vpos(p);
          drawLocal(p, X(A.x), Y(A.y), () => {
            const b = Math.abs(Math.sin(vt * 5)) * T * 0.16;
            ctx.globalAlpha = a;
            ctx.fillStyle = PCOL[p]; ctx.strokeStyle = '#05080c'; ctx.lineWidth = 3;
            const yy = -(HEADH + 0.32) * T - b;
            poly(ctx, [-T * 0.2, yy - T * 0.18, T * 0.2, yy - T * 0.18, 0, yy + T * 0.08]); ctx.stroke(); ctx.fill();
            if (SOLO && p !== ME) {                // en ligne / contre l'IA : le nom de l'adversaire, lisible pour moi
              const nm = NAMES[p].length > 8 ? NAMES[p].slice(0, 8) : NAMES[p];
              ctx.translate(0, yy - T * 0.48); ctx.rotate(Math.PI);
              txtOut(ctx, nm, 0, 0, Math.round(clamp(T * 0.42, 11, 19)), PCOL[p], FD, 'center', 4);
            } else txtOut(ctx, 'TOI', 0, yy - T * 0.48, Math.round(clamp(T * 0.5, 12, 22)), PCOL[p], FD, 'center', 4);
            ctx.globalAlpha = 1;
          });
        }
      }
      if ((phase === 'end' || phase === 'over') && lastRes) {
        for (let p = 0; p < 2; p++) {
          const A = vpos(p);
          const won = lastRes.winner === p;
          drawLocal(p, X(A.x), Y(A.y), () => {
            const k = clamp(endT / 0.35, 0, 1);
            if (won) {                             // couronne
              const yy = -(HEADH + 0.42) * T - Math.abs(Math.sin(vt * 7.5)) * T * 0.36, s = T * 0.5 * backOut(k);
              ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
              ctx.drawImage(F.gold, -s * 1.6, yy - s * 1.6, s * 3.2, s * 3.2);
              ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
              poly(ctx, [-s, yy + s * 0.45, -s, yy - s * 0.25, -s * 0.5, yy + s * 0.1, 0, yy - s * 0.55, s * 0.5, yy + s * 0.1, s, yy - s * 0.25, s, yy + s * 0.45]);
              ctx.fillStyle = lin(ctx, 0, yy - s * 0.55, 0, yy + s * 0.45, [0, '#fff6c0', 0.5, '#ffd34d', 1, '#c98a00']); ctx.fill();
              ctx.strokeStyle = '#5a3a00'; ctx.lineWidth = Math.max(1.2, T * 0.04); ctx.stroke();
              ctx.fillStyle = '#ff4d5e'; circ(ctx, 0, yy + s * 0.1, s * 0.14); ctx.fill();
            } else {                               // petit nuage de pluie
              const yy = -(HEADH * 1.1 + 0.42) * T, s = T * 0.34 * k;
              ctx.fillStyle = 'rgba(160,178,196,0.95)';
              circ(ctx, -s * 0.8, yy, s * 0.6); ctx.fill(); circ(ctx, 0, yy - s * 0.35, s * 0.8); ctx.fill(); circ(ctx, s * 0.8, yy, s * 0.6); ctx.fill();
              ctx.fillRect(-s * 0.8, yy - s * 0.1, s * 1.6, s * 0.6);
              ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = Math.max(1, T * 0.04);
              ctx.beginPath();
              for (let i = 0; i < 4; i++) { const q = (vt * 2.4 + i * 0.27) % 1, rx = (i - 1.5) * s * 0.5; ctx.moveTo(rx, yy + s * 0.6 + q * T * 0.5); ctx.lineTo(rx - T * 0.03, yy + s * 0.6 + q * T * 0.5 + T * 0.12); }
              ctx.stroke();
            }
          });
        }
      }
    }
    function drawFalling() {
      const cols = S.cols;
      for (const f of S.sd.falling) {
        const k = 1 - f.t / DROP_WARN;
        if (k < 0.5) continue;
        const q = (k - 0.5) / 0.5, s = T * (2.6 - 1.6 * q * q);
        ctx.globalAlpha = Math.min(1, q * 2.5);
        ctx.drawImage(SPR.fallen.cv, X(f.i % cols) - s / 2, Y((f.i / cols) | 0) - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
    function drawParticles() {
      for (let i = 0; i < PT.length; i++) {
        const p = PT[i];
        if (p.k === 1) continue;
        const k = p.life / p.max, x = X(p.x), y = Y(p.y);
        if (p.k === 0) {
          const sz = (p.s1 + (p.s0 - p.s1) * k) * T;
          ctx.globalAlpha = k * p.a0;
          ctx.drawImage(p.img, x - sz / 2, y - sz / 2, sz, sz);
        } else if (p.k === 2 || p.k === 4) {
          ctx.globalAlpha = Math.min(1, k * 2.5);
          const sz = p.s0 * T;
          ctx.translate(x, y); ctx.rotate(p.rot);
          if (p.k === 2) ctx.drawImage(p.img, -sz / 2, -sz / 2, sz, sz);
          else { const iw = p.img.naturalWidth || p.img.width || 1, ih = p.img.naturalHeight || p.img.height || 1; ctx.drawImage(p.img, -sz * iw / ih / 2, -sz / 2, sz * iw / ih, sz); }
          ctx.rotate(-p.rot); ctx.translate(-x, -y);
        } else if (p.k === 3) {
          ctx.globalAlpha = Math.min(1, k * 3);
          const sz = p.s0 * T;
          ctx.save();
          ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 2.3) || 0.05, 1);
          ctx.fillStyle = p.col; ctx.fillRect(-sz, -sz * 0.55, sz * 2, sz * 1.1);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < PT.length; i++) {
        const p = PT[i];
        if (p.k !== 1) continue;
        const k = p.life / p.max, sz = (p.s1 + (p.s0 - p.s1) * k) * T;
        ctx.globalAlpha = (k > 0.7 ? 1 : k / 0.7) * p.a0;
        ctx.drawImage(p.img, X(p.x) - sz / 2, Y(p.y) - sz / 2, sz, sz);
      }
      for (const g of RG) {
        const k = g.life / g.max, r = (g.r1 + (g.r0 - g.r1) * k) * T;
        ctx.globalAlpha = k;
        ctx.strokeStyle = g.col; ctx.lineWidth = Math.max(1, g.w * T * (0.35 + k));
        circ(ctx, X(g.x), Y(g.y), r); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function camMap(px, py) {                      // point de l'arène → écran (zoom + tremblement)
      let x = px, y = py;
      if (zoom !== 1) { const zx = X(zoomX), zy = Y(zoomY); x = zx + (x - zx) * zoom; y = zy + (y - zy) * zoom; }
      return [x + camSX, y + camSY];
    }
    function drawTexts() {                         // dessinés hors caméra : jamais coupés par le zoom
      for (const t of TX) {
        const k = t.life / t.max, age = t.max - t.life;
        const sc = age < 0.16 ? backOut(age / 0.16) : 1;
        const rise = (1 - k) * 0.8;
        const m = camMap(X(t.x), Y(t.y) + (t.p ? 1 : -1) * (1.25 + rise) * T);
        const fs = clamp(T * 0.5, 12, 24) * t.size;
        const x = clamp(m[0], ox + fs * 1.6, ox + aw - fs * 1.6);
        const y = clamp(m[1], oy + fs * 0.8, oy + ah - fs * 0.8);
        ctx.globalAlpha = Math.min(1, k * 3);
        drawLocal(SOLO ? ME : t.p, x, y, () => {    // en ligne / contre l'IA : tous les textes à l'endroit pour le joueur
          ctx.scale(sc, sc);
          txtOut(ctx, t.s, 0, 0, Math.round(clamp(T * 0.5, 12, 24) * t.size), t.col, FD, 'center', Math.max(3, T * 0.13));
        });
      }
      ctx.globalAlpha = 1;
    }
    // poussières lumineuses qui flottent dans l'arène (ambiance)
    const MOTES = [];
    for (let i = 0; i < 16; i++) MOTES.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.012, vy: (Math.random() - 0.5) * 0.012, ph: Math.random() * TAU, s: 0.5 + Math.random() });
    function updMotes(dt) {
      for (const m of MOTES) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.ph += dt * (0.8 + m.s * 0.5);
        if (m.x < 0) m.x += 1; else if (m.x > 1) m.x -= 1;
        if (m.y < 0) m.y += 1; else if (m.y > 1) m.y -= 1;
      }
    }
    function drawMotes() {
      ctx.globalCompositeOperation = 'lighter';
      for (const m of MOTES) {
        const a = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(m.ph)), s = T * 0.22 * m.s;
        ctx.globalAlpha = a;
        ctx.drawImage(m.s > 1.1 ? F.gold : F.blue, ox + m.x * aw - s / 2, oy + m.y * ah - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // rayons de victoire qui tournent derrière le gagnant
    function drawRays() {
      if (!(phase === 'end' || phase === 'over') || !lastRes || lastRes.winner < 0) return;
      const A = vpos(lastRes.winner), x = X(A.x), y = Y(A.y) + (lastRes.winner === 1 ? 0.45 : -0.45) * T;
      const k = clamp(endT / 0.5, 0, 1), R = T * (2.2 + 1.4 * easeOut(k)), n = 12, rot = vt * 0.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * k;
      ctx.drawImage(F.gold, x - R * 0.8, y - R * 0.8, R * 1.6, R * 1.6);
      ctx.globalAlpha = 0.16 * k;
      ctx.fillStyle = PCOL[lastRes.winner];
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a0 = rot + i * TAU / n, a1 = a0 + TAU / n * 0.45;
        ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a0) * R, y + Math.sin(a0) * R); ctx.lineTo(x + Math.cos(a1) * R, y + Math.sin(a1) * R); ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawEndShade() {
      if (!(phase === 'end' || phase === 'over') || !lastRes) return;
      const a = Math.min(0.5, endT * 1.4);
      if (a <= 0.01) return;
      ctx.beginPath();
      ctx.rect(ox - fr, oy - fr, aw + fr * 2, ah + fr * 2);
      for (const A0 of S.actors) { const A = vpos(A0.p), x = X(A.x), y = Y(A.y) + (A0.p ? 0.3 : -0.3) * T; ctx.moveTo(x + T * 1.6, y); ctx.arc(x, y, T * 1.6, 0, TAU, true); }
      ctx.fillStyle = 'rgba(2,5,9,' + a.toFixed(3) + ')';
      ctx.fill('evenodd');
    }
    function applyCam() {
      const sk = shake * T / 34;
      camSX = sk > 0.05 && !paused ? (Math.random() * 2 - 1) * sk : 0;
      camSY = sk > 0.05 && !paused ? (Math.random() * 2 - 1) * sk : 0;
      ctx.translate(camSX, camSY);
      if (zoom !== 1) { const zx = X(zoomX), zy = Y(zoomY); ctx.translate(zx, zy); ctx.scale(zoom, zoom); ctx.translate(-zx, -zy); }
    }
    let camSX = 0, camSY = 0;

    // ----------------------------------------------------------------- commandes et infos (repère du joueur 0 ; P1 tourné)
    function drawStick(p, bx, by, kx, ky, act) {
      const R = ctl.R, col = PCOL[p];
      const hint = phase === 'intro' && !act ? 0.5 + 0.5 * Math.sin(vt * 6) : 0;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(F.shade, bx - R * 1.35, by - R * 1.2, R * 2.7, R * 2.7);
      ctx.globalAlpha = 1;
      if (act || hint) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = act ? 0.32 : 0.28 * hint;
        ctx.drawImage(F.p[p], bx - R * 1.7, by - R * 1.7, R * 3.4, R * 3.4);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      circ(ctx, bx, by, R);
      ctx.fillStyle = rad(ctx, bx, by, R * 0.1, bx, by, R, [0, 'rgba(40,62,80,0.82)', 0.72, 'rgba(18,30,41,0.9)', 1, 'rgba(8,14,20,0.96)']);
      ctx.fill();
      ctx.lineWidth = Math.max(2, R * 0.065); ctx.strokeStyle = hexA(col, act ? 0.95 : 0.62); ctx.stroke();
      circ(ctx, bx, by, R * 0.64); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5; ctx.stroke();
      const dx = kx - bx, dy = ky - by, dl = Math.hypot(dx, dy) || 1, dm = dl / R;
      for (let d = 0; d < 4; d++) {
        const ang = d * Math.PI / 2, cx = bx + Math.cos(ang) * R * 0.8, cy = by + Math.sin(ang) * R * 0.8;
        const lit = dm > 0.3 && (Math.cos(ang) * dx + Math.sin(ang) * dy) / dl > 0.7;
        ctx.fillStyle = lit ? '#ffffff' : hexA(col, 0.6);
        ctx.translate(cx, cy); ctx.rotate(ang);
        poly(ctx, [R * 0.11, 0, -R * 0.06, -R * 0.11, -R * 0.06, R * 0.11]); ctx.fill();
        ctx.rotate(-ang); ctx.translate(-cx, -cy);
      }
      const kr = R * 0.48;
      ctx.globalAlpha = 0.8; ctx.drawImage(F.shade, kx - kr * 1.3, ky - kr * 1.05, kr * 2.6, kr * 2.6); ctx.globalAlpha = 1;
      circ(ctx, kx, ky, kr); ctx.fillStyle = '#03060a'; ctx.fill();
      circ(ctx, kx, ky, kr * 0.9);
      ctx.fillStyle = rad(ctx, kx - kr * 0.3, ky - kr * 0.36, kr * 0.05, kx, ky, kr, [0, PLIGHT[p], 0.42, col, 1, PDARK[p]]); ctx.fill();
      circ(ctx, kx, ky, kr * 0.56); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      ell(ctx, kx - kr * 0.3, ky - kr * 0.4, kr * 0.3, kr * 0.15, -0.5); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
      if (phase === 'intro' && !act) txtOut(ctx, 'BOUGE', bx, by - R - 10, Math.round(clamp(R * 0.24, 10, 14)), col, FD, 'center', 3);
    }
    function drawBombBtn(p) {
      const A = S.actors[p], R = ctl.RB, x = ctl.bx, y = ctl.by, pk = press[p];
      const s = 1 - 0.1 * pk;
      const avail = A.alive ? A.bombsMax - A.active : 0;
      const can = avail > 0 && A.alive && phase === 'play';
      ctx.globalAlpha = 0.85; ctx.drawImage(F.shade, x - R * 1.4, y - R * 1.22, R * 2.8, R * 2.8); ctx.globalAlpha = 1;
      if (pk > 0.02 || (phase === 'intro' && phaseT > 0.8)) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(pk * 0.7, phase === 'intro' ? 0.22 * (0.5 + 0.5 * Math.sin(vt * 6 + 1.5)) : 0);
        ctx.drawImage(F.red, x - R * 1.8, y - R * 1.8, R * 3.6, R * 3.6);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      circ(ctx, x, y, R + 3.5); ctx.fillStyle = '#04070b'; ctx.fill();
      circ(ctx, x, y, R * s);
      ctx.fillStyle = rad(ctx, x - R * 0.3, y - R * 0.42, R * 0.05, x, y, R * s, [0, '#ffc2c8', 0.32, '#ff5a68', 0.8, '#c41f33', 1, '#6e0a16']); ctx.fill();
      ctx.lineWidth = Math.max(1.5, R * 0.045); ctx.strokeStyle = 'rgba(255,225,230,0.5)';
      circ(ctx, x, y, R * s * 0.86); ctx.stroke();
      const bs = R * 1.02 * s;
      ctx.drawImage(SPR.btnBomb.cv, x - bs / 2, y - bs / 2 - R * 0.13, bs, bs);
      txtOut(ctx, 'BOMBE', x, y + R * 0.52 * s, Math.round(clamp(R * 0.25, 10, 15)), '#ffffff', FD, 'center', 3);
      ell(ctx, x - R * 0.36, y - R * 0.5, R * 0.3, R * 0.13, -0.45); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      if (!can) { circ(ctx, x, y, R * s); ctx.fillStyle = 'rgba(4,8,12,0.42)'; ctx.fill(); }
      if (pk > 0.02) { ctx.strokeStyle = 'rgba(255,200,205,' + (pk * 0.8).toFixed(2) + ')'; ctx.lineWidth = 3; circ(ctx, x, y, R * (1.05 + (1 - pk) * 0.45)); ctx.stroke(); }
      const n = A.bombsMax;                        // munitions
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.3;
        const px = x + Math.cos(ang) * (R + 10), py = y + Math.sin(ang) * (R + 10);
        circ(ctx, px, py, 4.6); ctx.fillStyle = '#04070b'; ctx.fill();
        circ(ctx, px, py, 3.2); ctx.fillStyle = i < avail ? '#ffd34d' : 'rgba(255,255,255,0.16)'; ctx.fill();
      }
    }
    function fmtT(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function drawPortrait(p, cx, cy, h) {
      const A = S.actors[p], hs = A.alive ? SPR.head[p] : SPR.sad[p];
      if (!hs) return;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
      ctx.drawImage(F.p[p], cx - h * 0.9, cy - h * 0.9, h * 1.8, h * 1.8);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const bob = A.alive && phase === 'play' ? Math.sin(vt * 2.4 + p) * h * 0.02 : 0;
      const H2 = h * (hs.k || 1), W2 = H2 * hs.cv.width / hs.cv.height;
      ctx.drawImage(hs.cv, cx - W2 / 2, cy - H2 / 2 + bob, W2, H2);
    }
    function drawInfo(p) {
      const A = S.actors[p];
      let x = ctl.ix, w = ctl.iw;
      const land = ctl.land;
      if (!land) {                                 // portrait de la tête à gauche du nom
        const ph = Math.round(clamp(ctl.bandH * 0.42, 30, 50));
        if (w > ph * 2.4) { drawPortrait(p, x + ph * 0.4, ctl.iy, ph); x += ph * 0.88; w -= ph * 0.88; }
      } else {                                     // paysage : grand portrait au-dessus du bouton bombe
        const top = H / 2 + 44, bot = ctl.by - ctl.RB - 22, ph = Math.min(bot - top, ctl.mw * 0.6, 96);
        if (ph >= 36) drawPortrait(p, ctl.bx, (top + bot) / 2, ph);
      }
      const ns = Math.round(clamp(w / 9.5, 11, 17));
      let y = land ? ctl.iy : ctl.iy - ns * 0.7;
      // nom
      ctx.font = ns + 'px ' + FD;
      let nm = NAMES[p];
      while (nm.length > 3 && ctx.measureText(nm).width > w * (land ? 1 : 0.62)) nm = nm.slice(0, -1);
      txtOut(ctx, nm, x, y, ns, PCOL[p], FD, 'left', 3);
      // minuteur avant la mort subite
      const ts = Math.round(ns * 0.82);
      const tx = land ? x : x + w, ty = land ? y + ns * 1.35 : y;
      if (!S.sd.on) {
        const rem = phase === 'intro' ? S.P.sdStart : S.P.sdStart - S.t;
        const hot = rem <= 10 && phase === 'play';
        const col = hot ? (((vt * 4) | 0) % 2 ? '#ff4d5e' : '#ffd34d') : '#8aa0ae';
        const label = fmtT(rem);
        ctx.font = ts + 'px ' + FD;
        const lw = ctx.measureText(label).width;
        const ix = land ? tx + ts * 0.5 : tx - lw - ts * 0.75;
        circ(ctx, ix, ty, ts * 0.42); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix, ty); ctx.lineTo(ix, ty - ts * 0.26); ctx.moveTo(ix, ty); ctx.lineTo(ix + ts * 0.2, ty); ctx.stroke();
        txtOut(ctx, label, land ? ix + ts * 0.7 : tx, ty, ts, col, FD, land ? 'left' : 'right', 3);
      } else {
        const on = ((vt * 3) | 0) % 2 === 0;
        txtOut(ctx, 'MORT SUBITE', tx, ty, Math.round(ts * 0.85), on ? '#ff4d5e' : '#ffb0b8', FD, land ? 'left' : 'right', 3);
      }
      // puces des pouvoirs
      const chips = [[IT_BOMB, A.bombsMax], [IT_RANGE, A.range], [IT_SPEED, 1 + A.speedLvl]];
      if (A.push) chips.push([IT_PUSH, -1]);
      if (A.shield) chips.push([IT_SHIELD, -1]);
      const cs = Math.round(clamp(w / 8, 16, 24));
      let cx = x, cy = land ? ty + ns * 1.5 : y + ns * 1.55;
      for (const [it, n] of chips) {
        const cw = cs + (n >= 0 ? cs * 0.62 : 0) + 6;
        if (cx + cw > x + w + 4) { cx = x; cy += cs + 6; }
        ctx.drawImage(SPR.mini[it].cv, cx, cy - cs / 2, cs, cs);
        if (n >= 0) txtOut(ctx, String(n), cx + cs + 2, cy + 1, Math.round(cs * 0.62), '#e9f0f3', FD, 'left', 3);
        cx += cw;
      }
    }
    function drawHud(p) {
      ctx.save();
      if (p) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      const st = sticks[p];
      let bx = ctl.sx, by = ctl.sy, kx = bx, ky = by, act = false;
      if (st.id != null) {
        act = true;
        bx = p ? W - st.bx : st.bx; by = p ? H - st.by : st.by; kx = p ? W - st.kx : st.kx; ky = p ? H - st.ky : st.ky;
      } else {
        const gv = padVec(p), kv = gv || (NETAPI ? kbNet() : kbVec(p));
        if (kv[0] || kv[1]) { const l = gv ? 1 : Math.hypot(kv[0], kv[1]); kx = bx + (p ? -1 : 1) * kv[0] / l * ctl.R * 0.6; ky = by + (p ? -1 : 1) * kv[1] / l * ctl.R * 0.6; }
      }
      drawInfo(p);
      drawBombBtn(p);
      drawStick(p, bx, by, kx, ky, act);
      if (padShow(p)) {                            // à la manette : les boutons sur les commandes de l'écran
        const gr = clamp(ctl.RB * 0.27, 9, 15), sr = clamp(ctl.R * 0.27, 9, 15);
        try { PAD.drawGlyph(ctx, 'a', ctl.bx + ctl.RB * 0.74, ctl.by - ctl.RB * 0.74, gr, p); PAD.drawGlyph(ctx, 'ls', bx - ctl.R * 0.74, by - ctl.R * 0.74, sr, p); } catch (e) { /* rien */ }
      }
      ctx.restore();
    }
    // en ligne : petite rangée de pouvoirs (comme dans drawInfo)
    function chipsRow(p, x, y, w, cs) {
      const A = S.actors[p];
      const chips = [[IT_BOMB, A.bombsMax], [IT_RANGE, A.range], [IT_SPEED, 1 + A.speedLvl]];
      if (A.push) chips.push([IT_PUSH, -1]);
      if (A.shield) chips.push([IT_SHIELD, -1]);
      let cx = x, cy = y;
      for (const [it, n] of chips) {
        const cw = cs + (n >= 0 ? cs * 0.62 : 0) + 6;
        if (cx + cw > x + w + 4) { cx = x; cy += cs + 6; }
        ctx.drawImage(SPR.mini[it].cv, cx, cy - cs / 2, cs, cs);
        if (n >= 0) txtOut(ctx, String(n), cx + cs + 2, cy + 1, Math.round(cs * 0.62), '#e9f0f3', FD, 'left', 3);
        cx += cw;
      }
    }
    const AI_TAG = { facile: ['FACILE', '#4cc36a'], moyen: ['MOYEN', '#ffd34d'], difficile: ['DIFFICILE', '#ff7a3c'], extreme: ['EXTRÊME', '#ff4d5e'] };
    function drawTag(x, y, s) {                    // à droite de la carte : le réseau (en ligne) ou le niveau de l'IA
      if (!AIP) { drawPing(x, y, s); return; }
      const lv = AI_TAG[AIP.level] || AI_TAG.moyen, n = ['facile', 'moyen', 'difficile', 'extreme'].indexOf(AIP.level) + 1 || 2;
      const fs = Math.round(s);
      ctx.font = fs + 'px ' + FD;
      const tw = ctx.measureText(lv[0]).width, bw = Math.max(2, s * 0.22);
      let bx = x - tw - bw * 6 - 10;
      for (let i = 0; i < 4; i++) {
        const h = s * (0.35 + i * 0.22);
        ctx.fillStyle = i < n ? lv[1] : 'rgba(255,255,255,0.16)';
        ctx.fillRect(bx, y + s * 0.5 - h, bw, h);
        bx += bw * 1.5;
      }
      txtOut(ctx, lv[0], x, y + 1, fs, lv[1], FD, 'right', 3);
    }
    function drawPing(x, y, s) {                   // qualité du réseau : 3 barres + aller-retour en ms (aligné à droite sur x)
      const ms = Math.round(nrtt() * 1000), col = ms < 120 ? '#4cc36a' : ms < 250 ? '#ffd34d' : '#ff4d5e', lv = ms < 120 ? 3 : ms < 250 ? 2 : 1;
      const label = ms + ' ms', fs = Math.round(s);
      ctx.font = fs + 'px ' + FB;
      const tw = ctx.measureText(label).width, bw = Math.max(2, s * 0.22);
      let bx = x - tw - bw * 3 - 10;
      for (let i = 0; i < 3; i++) {
        const h = s * (0.4 + i * 0.3);
        ctx.fillStyle = i < lv ? col : 'rgba(255,255,255,0.16)';
        ctx.fillRect(bx, y + s * 0.5 - h, bw, h);
        bx += bw * 1.5;
      }
      txtOut(ctx, label, x, y + 1, fs, '#8aa0ae', FB, 'right', 0);
    }
    // en ligne : la bande de l'adversaire (à l'endroit pour moi) : sa tête, son nom, ses pouvoirs, le réseau — pas de manette
    function drawOppCard() {
      const p = OPP;
      ctx.save();
      if (ROT) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      if (!ctl.land) {
        // vue solo : juste une petite étiquette « nom » à sa couleur (petite tête + nom), pas de HUD ; à droite, réseau / niveau de l'IA
        const bh = H - ctl.y0, cy = bh / 2;        // bande du haut, symétrique de la mienne
        const ns = Math.round(clamp(bh * 0.17, 12, 17)), tg = Math.max(10, Math.round(ns * 0.66));
        const ph = Math.round(clamp(bh * 0.4, 28, 44)), lh = Math.round(ns * 2.05);
        const x0 = 16, tagW = AIP ? tg * 7.2 + 20 : tg * 5 + 20;
        ctx.font = ns + 'px ' + FD;
        let nm = NAMES[p];
        const maxW = Math.max(40, W - 16 - tagW - 24 - x0 - ph * 0.9 - ns * 1.4);
        while (nm.length > 3 && ctx.measureText(nm).width > maxW) nm = nm.slice(0, -1);
        const tw = ctx.measureText(nm).width, pw = ph * 0.9 + tw + ns * 1.4;
        drawPill(p, x0, cy, pw, lh);
        drawPortrait(p, x0 + ph * 0.42, cy - ph * 0.04, ph);
        txtOut(ctx, nm, x0 + ph * 0.9 + ns * 0.45, cy + 1, ns, PCOL[p], FD, 'left', 3);
        drawTag(W - 18, cy, tg);
      } else {
        const x0 = 12, w = ctl.mw - 24, top = 18, bot = H / 2 - 48;   // marge de gauche, moitié du haut (loin du bouton menu)
        const ph = Math.round(clamp(Math.min(w * 0.32, (bot - top) * 0.3), 30, 60));
        const ns = Math.round(clamp(w / 9.5, 11, 16)), lh = Math.round(ns * 2.05);
        let y = top + ph * 0.55;
        drawPortrait(p, x0 + w / 2, y, ph);
        y += ph * 0.55 + lh * 0.6;
        ctx.font = ns + 'px ' + FD;
        let nm = NAMES[p];
        while (nm.length > 3 && ctx.measureText(nm).width > w - ns * 1.6) nm = nm.slice(0, -1);
        const pw = ctx.measureText(nm).width + ns * 1.6;
        drawPill(p, x0 + w / 2 - pw / 2, y, pw, lh);
        txtOut(ctx, nm, x0 + w / 2, y + 1, ns, PCOL[p], FD, 'center', 3);
        y += lh;
        if (y + ns * 1.6 < bot) drawTag(x0 + w, bot - 6, Math.max(10, ns * 0.7));
      }
      ctx.restore();
    }
    function drawPill(p, x, cy, w, h) {           // étiquette néon discrète à la couleur du joueur
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22;
      ctx.drawImage(F.p[p], x - h * 0.6, cy - h * 1.3, w + h * 1.2, h * 2.6);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      rrect(ctx, x, cy - h / 2, w, h, h / 2);
      ctx.fillStyle = 'rgba(4,9,14,0.82)'; ctx.fill();
      ctx.strokeStyle = hexA(PCOL[p], 0.75); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = lin(ctx, x + w * 0.15, 0, x + w * 0.85, 0, [0, hexA(PCOL[p], 0), 0.5, hexA(PCOL[p], 0.8), 1, hexA(PCOL[p], 0)]);
      ctx.fillRect(x + w * 0.15, cy + h / 2 - 1, w * 0.7, 2);
    }

    // ----------------------------------------------------------------- écrans par-dessus (décompte, consignes, pause, transitions)
    function drawCount(label, k) {
      const size = Math.round(clamp(Math.min(W, H) * 0.22, 52, 120));
      const go = label === 'GO !';
      for (const p of VIEWERS) {
        ctx.save();
        if (p) { ctx.translate(W, H); ctx.rotate(Math.PI); }
        const cx = W / 2, cy = H * 0.75;
        const sc = k < 0.22 ? backOut(k / 0.22) : 1 + (k - 0.22) * 0.12;
        const a = k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a * 0.65;
        ctx.drawImage(go ? F.gold : F.p[p], cx - size * 1.6, cy - size * 1.6, size * 3.2, size * 3.2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a * (1 - k) * 0.9;
        ctx.strokeStyle = go ? '#ffd34d' : PCOL[p]; ctx.lineWidth = 5;
        circ(ctx, cx, cy, size * (0.5 + k * 1.1)); ctx.stroke();
        ctx.globalAlpha = a;
        ctx.translate(cx, cy); ctx.scale(sc, sc);
        const fs = go ? Math.round(size * 0.72) : size;
        ctx.font = fs + 'px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(6, fs * 0.15); ctx.strokeStyle = 'rgba(3,6,10,0.94)';
        ctx.strokeText(label, 0, 0);
        ctx.fillStyle = lin(ctx, 0, -fs * 0.45, 0, fs * 0.45, go ? [0, '#fff8d0', 0.5, '#ffd34d', 1, '#ff8a1f'] : [0, '#ffffff', 0.5, PLIGHT[p], 1, PCOL[p]]);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
    function drawPanel(lines, a, title) {
      for (const p of VIEWERS) {
        ctx.save();
        if (p) { ctx.translate(W, H); ctx.rotate(Math.PI); }
        ctx.globalAlpha = a;
        const fs = Math.round(clamp(W / 26, 12, 17));
        ctx.font = '600 ' + fs + 'px ' + FB;
        let tw = 0;
        for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
        const ts = Math.round(fs * 1.05);
        if (title) { ctx.font = ts + 'px ' + FD; tw = Math.max(tw, ctx.measureText(title).width); }
        const rowsN = lines.length + (title ? 1 : 0);
        const w = Math.min(W - 24, tw + fs * 4.2), h = rowsN * fs * 1.35 + fs * 1.1;
        const cx = W / 2, cy = H / 2 + H * 0.105;
        rrect(ctx, cx - w / 2, cy - h / 2, w, h, fs * 0.9);
        ctx.fillStyle = 'rgba(4,9,14,0.88)'; ctx.fill();
        ctx.strokeStyle = hexA(PCOL[p], 0.75); ctx.lineWidth = 2; ctx.stroke();
        const bsz = fs * 1.7;
        ctx.drawImage(SPR.btnBomb.cv, cx - w / 2 + fs * 0.45, cy - bsz / 2, bsz, bsz);
        const off = title ? 1 : 0;
        if (title) txtOut(ctx, title, cx + fs * 1.1, cy + (0 - (rowsN - 1) / 2) * fs * 1.35, ts, ACCENT, FD, 'center', 0);
        for (let i = 0; i < lines.length; i++) {
          const yy = cy + (i + off - (rowsN - 1) / 2) * fs * 1.35;
          ctx.font = '600 ' + fs + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = i === 0 && lines.length > 1 ? '#ffffff' : '#e9f0f3';
          ctx.fillText(lines[i], cx + fs * 1.1, yy);
        }
        ctx.restore();
      }
    }
    function framePoint(u) {                       // point du cadre à l'abscisse curviligne u (sens horaire depuis le coin haut-gauche)
      const x0 = ox - fr * 0.5, y0 = oy - fr * 0.5, w = aw + fr, h = ah + fr, P = 2 * (w + h);
      u = ((u % P) + P) % P;
      if (u < w) return [x0 + u, y0];
      if (u < w + h) return [x0 + w, y0 + u - w];
      if (u < 2 * w + h) return [x0 + w - (u - w - h), y0 + h];
      return [x0, y0 + h - (u - 2 * w - h)];
    }
    function drawFrameLights() {                   // deux lumières qui courent sur le cadre (positions symétriques)
      const P = 2 * (aw + ah + 2 * fr), u = vt * (aw + ah) * 0.22;
      ctx.globalCompositeOperation = 'lighter';
      for (const k of [0, 0.5]) {
        for (let j = 0; j < 4; j++) {
          const q = framePoint(u + k * P - j * fr * 1.4), p = q[1] < H / 2 ? 1 : 0, s = fr * (3.2 - j * 0.55);
          ctx.globalAlpha = 0.55 - j * 0.12;
          ctx.drawImage(F.p[p], q[0] - s / 2, q[1] - s / 2, s, s);
        }
        const q = framePoint(u + k * P);
        ctx.globalAlpha = 0.9; ctx.drawImage(F.w, q[0] - fr * 0.7, q[1] - fr * 0.7, fr * 1.4, fr * 1.4);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawOverlays() {
      drawFrameLights();
      // transition en iris (dans l'arène)
      if (iris) {
        const k = clamp(iris.t / iris.dur, 0, 1), RR = Math.hypot(aw, ah) * 0.8 + T * 2;
        const r = Math.max(0.5, iris.open ? easeOut(k) * RR : (1 - ease(k)) * RR);
        const x = X(iris.x), y = Y(iris.y);
        ctx.save();
        ctx.beginPath(); ctx.rect(ox - fr, oy - fr, aw + fr * 2, ah + fr * 2); ctx.clip();
        ctx.beginPath(); ctx.rect(ox - fr, oy - fr, aw + fr * 2, ah + fr * 2); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU, true);
        ctx.fillStyle = '#04080c'; ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(255,77,94,0.75)'; ctx.lineWidth = 3; circ(ctx, x, y, r); ctx.stroke();
        ctx.restore();
      }
      // cadre rouge de la mort subite (+ voyants d'alarme des consoles)
      if (S.sd.on && phase === 'play') {
        const a = 0.3 + 0.3 * Math.sin(vt * 6) + sdFlash * 0.6;
        ctx.strokeStyle = 'rgba(255,77,94,' + clamp(a, 0, 1).toFixed(2) + ')'; ctx.lineWidth = Math.max(2, fr * 0.45);
        rrect(ctx, ox - fr * 0.5, oy - fr * 0.5, aw + fr, ah + fr, fr * 0.6); ctx.stroke();
        if (S.notch) {
          const my = (S.rows - 1) >> 1, on = Math.sin(vt * 9) > 0;
          ctx.globalCompositeOperation = 'lighter';
          for (const sx of [0, 1]) {
            const cx = sx ? ox + aw - 2 * T + T * 0.44 : ox + 2 * T - T * 0.44;
            for (const cy of [oy + (my - 1) * T + T * 1.0, oy + (my + 2) * T - T * 1.0]) {
              ctx.globalAlpha = on ? 0.85 : 0.25;
              ctx.drawImage(F.red, cx - T * 0.6, cy - T * 0.6, T * 1.2, T * 1.2);
            }
          }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
      // consigne (1re manche) ou nouveauté de la manche
      if (phase === 'intro' && (bannerTxt || bannerTitle)) {
        const a = clamp((phaseT - 0.35) / 0.25, 0, 1) * clamp((introDur - 0.15 - phaseT) / 0.3, 0, 1);
        if (a > 0) drawPanel(bannerTxt || [], a, bannerTitle);
      }
      if (phase === 'wait') drawPanel([GUEST ? 'Connexion à la partie…' : 'En attente de l’adversaire…'], clamp(waitT * 3, 0, 1), 'EN LIGNE');
      // décompte
      let cl = null, ck = 0;
      if (resumeT > 0) { const n = Math.ceil(resumeT / 0.5); cl = String(Math.min(3, n)); ck = 1 - (resumeT - (n - 1) * 0.5) / 0.5; }
      else if (phase === 'intro' || (phase === 'play' && phaseT < 0.55)) {
        const t0 = introDur - 2.0, tt = phase === 'intro' ? phaseT - t0 : 2.0 + phaseT;
        if (tt >= 0 && tt < 2.55) {
          const i = Math.min(3, Math.floor(tt / 0.6));
          cl = ['3', '2', '1', 'GO !'][i]; ck = i < 3 ? (tt - i * 0.6) / 0.6 : (tt - 1.8) / 0.75;
        }
      }
      if (cl) drawCount(cl, clamp(ck, 0, 1));
      // flash
      if (flashA > 0.01) { ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      // pause
      if (paused) {
        ctx.fillStyle = 'rgba(3,6,10,0.62)'; ctx.fillRect(0, 0, W, H);
        for (const p of VIEWERS) {
          ctx.save();
          if (p) { ctx.translate(W, H); ctx.rotate(Math.PI); }
          txtOut(ctx, 'PAUSE', W / 2, H * 0.75, Math.round(clamp(W * 0.12, 30, 60)), '#ffffff', FD, 'center', 6);
          ctx.restore();
        }
      }
    }
    function render() {
      if (destroyed || !S || !bgCv) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(bgCv, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(ox - fr, oy - fr, aw + fr * 2, ah + fr * 2); ctx.clip();
      applyCam();
      if (camSX || camSY || zoom !== 1) { ctx.fillStyle = BG; ctx.fillRect(ox - fr - 20, oy - fr - 20, aw + fr * 2 + 40, ah + fr * 2 + 40); ctx.drawImage(bgCv, 0, 0, W, H); }
      drawArena();
      drawEndShade();
      drawRays();
      drawActors();
      drawFalling();
      drawParticles();
      drawMotes();
      drawMarkers();
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTexts();
      if (SOLO) { drawHud(ME); drawOppCard(); }    // en ligne / contre l'IA : mes commandes + la carte de l'adversaire
      else { drawHud(0); drawHud(1); }
      drawOverlays();
    }

    // ----------------------------------------------------------------- entrées (multi-touch : chaque doigt appartient à la moitié où il s'est posé)
    const inputs = [{ mx: 0, my: 0, bomb: false }, { mx: 0, my: 0, bomb: false }];
    const sticks = [{ id: null, bx: 0, by: 0, kx: 0, ky: 0, vx: 0, vy: 0 }, { id: null, bx: 0, by: 0, kx: 0, ky: 0, vx: 0, vy: 0 }];
    const ptrs = new Map();
    const keys = new Set();
    const KEYMAP = { arrowup: [0, 3], arrowdown: [0, 1], arrowleft: [0, 2], arrowright: [0, 0], z: [1, 3], w: [1, 3], s: [1, 1], q: [1, 2], a: [1, 2], d: [1, 0] };
    function kbVec(p) {
      let x = 0, y = 0;
      for (const k of keys) { const m = KEYMAP[k]; if (m && m[0] === p) { x += DX[m[1]]; y += DY[m[1]]; } }
      return [x, y];
    }
    function pressBomb(p) {
      press[p] = 1;
      if (phase === 'play' && !paused && resumeT <= 0) inputs[p].bomb = true;
    }
    function kbNet() {                             // en ligne : toutes les touches pilotent mon personnage, dans le sens de MON écran
      let x = 0, y = 0;
      for (const k of keys) { const m = KEYMAP[k]; if (m) { x += DX[m[1]]; y += DY[m[1]]; } }
      x = clamp(x, -1, 1); y = clamp(y, -1, 1);
      return ROT ? [-x, -y] : [x, y];
    }
    function localXY(e) {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      return FLIP ? [W - x, H - y] : [x, y];       // écran retourné par la bibliothèque (invité) : on revient dans le repère du jeu
    }
    function updStick(s) {
      const R = ctl.R;
      let dx = s.kx - s.bx, dy = s.ky - s.by;
      const d = Math.hypot(dx, dy);
      if (d > R) { const k = (d - R) / d; s.bx += dx * k; s.by += dy * k; dx = s.kx - s.bx; dy = s.ky - s.by; }
      s.vx = dx / R; s.vy = dy / R;
    }
    function onDown(e) {
      if (destroyed) return;
      if (e.cancelable) e.preventDefault();
      if (paused) return;
      const [x, y] = localXY(e);
      const p = NETAPI ? ME : y >= H / 2 ? 0 : 1;   // en ligne, tout l'écran est à moi
      if (AIP && p === AIP.p) return;              // contre l'IA : sa moitié ne répond pas aux doigts
      const stickSide = p === 0 ? x < W / 2 : x > W / 2;
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
      if (stickSide) {
        const s = sticks[p], R = ctl.R;
        s.id = e.pointerId;
        s.bx = clamp(x, R + 4, W - R - 4);
        s.by = NETAPI ? clamp(y, R + 4, H - R - 4) : p === 0 ? clamp(y, H / 2 + R * 0.5, H - R - 4) : clamp(y, R + 4, H / 2 - R * 0.5);
        s.kx = x; s.ky = y;
        updStick(s);
        ptrs.set(e.pointerId, { p, role: 0 });
      } else {
        ptrs.set(e.pointerId, { p, role: 1 });
        pressBomb(p);
      }
    }
    function onMove(e) {
      const info = ptrs.get(e.pointerId);
      if (!info || info.role !== 0) return;
      const s = sticks[info.p];
      if (s.id !== e.pointerId) return;
      const [x, y] = localXY(e);
      s.kx = x; s.ky = y;
      updStick(s);
    }
    function onUp(e) {
      const info = ptrs.get(e.pointerId);
      if (!info) return;
      ptrs.delete(e.pointerId);
      if (info.role === 0) { const s = sticks[info.p]; if (s.id === e.pointerId) { s.id = null; s.vx = 0; s.vy = 0; } }
    }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      const k = String(e.key || '').toLowerCase();
      if (k === ' ' || k === 'spacebar' || k === 'enter') { e.preventDefault(); if (!e.repeat && !(AIP && AIP.p === 0)) pressBomb(NETAPI ? ME : 0); return; }
      if (k === 'e') { if (!e.repeat && !(AIP && AIP.p === 1)) pressBomb(NETAPI ? ME : 1); return; }
      if (KEYMAP[k]) { e.preventDefault(); keys.add(k); }
    }
    function onKeyUp(e) { keys.delete(String(e.key || '').toLowerCase()); }
    function onBlur() { keys.clear(); }
    // ----------------------------------------------------------------- manette (api.pad, CONTRACT.md « Ajout 10 »)
    // Stick gauche ou croix = marcher (le jeu aligne tout seul sur la grille, comme avec le joystick sous le doigt), A (ou B) =
    // poser une bombe. Lue à chaque image, au même endroit que les doigts. Joueur du haut assis en face (ou invité en ligne) :
    // la bibliothèque retourne déjà son stick dans le repère du jeu. Contre l'IA / en ligne : seul MON joueur a une manette.
    const PAD = api.pad && typeof api.pad.get === 'function' ? api.pad : null;
    function padMine(p) { return !!PAD && !(AIP && p === AIP.p) && (!NETAPI || p === ME); }
    function padVec(p) {                           // direction de la manette du joueur p (repère du jeu), ou null
      if (!padMine(p)) return null;
      let g = null;
      try { g = PAD.get(p); } catch (e) { g = null; }
      if (!g || !g.on || Math.hypot(g.mx || 0, g.my || 0) < 0.3) return null;
      return [g.mx, g.my];
    }
    function padPoll(live) {                       // appuis : A ou B = bombe (lus même pendant le décompte, pour les oublier)
      for (let p = 0; p < 2; p++) {
        if (!padMine(p)) continue;
        let hit = false;
        try { hit = PAD.pressed('a', p); hit = PAD.pressed('b', p) || hit; } catch (e) { hit = false; }
        if (hit && live) pressBomb(p);
      }
    }
    function padShow(p) { try { return padMine(p) && PAD.active() && PAD.any(p); } catch (e) { return false; } }
    function rumble(kind, p) { try { if (padMine(p) && PAD.rumble) PAD.rumble(kind, p); } catch (e) { /* rien */ } }
    function setInputs() {
      if (NETAPI) {
        const st = sticks[ME], inp = inputs[ME], g = padVec(ME);
        if (st.id != null) { inp.mx = st.vx; inp.my = st.vy; } else if (g) { inp.mx = g[0]; inp.my = g[1]; } else { const v = kbNet(); inp.mx = v[0]; inp.my = v[1]; }
        return;
      }
      for (let p = 0; p < 2; p++) {
        if (AIP && p === AIP.p) continue;          // contre l'IA : ses entrées viennent de aiTick()
        const st = sticks[p], g = padVec(p);
        if (st.id != null) { inputs[p].mx = st.vx; inputs[p].my = st.vy; }
        else if (g) { inputs[p].mx = g[0]; inputs[p].my = g[1]; }
        else { const v = kbVec(p); inputs[p].mx = v[0]; inputs[p].my = v[1]; }
      }
    }

    // ----------------------------------------------------------------- jeu en ligne (api.net)
    // Hôte (P0) : fait toute la simulation ; reçoit la position de l'invité (~60/s, acceptée si vraisemblable) et ses bombes
    //   (fiable, posées à la case annoncée) ; envoie ~30/s sa position + son horloge de simulation, et chaque image un lot
    //   FIABLE d'événements (bombe posée avec heure d'explosion, explosion + cases, caisse, bonus, mort, point, mort subite…).
    //   L'invité est jugé à l'heure où il était là (compensation de latence) : un historique des flammes et des blocs tombés.
    // Invité (P1) : son personnage bouge tout de suite (mêmes règles, sur un « miroir » de la manche créé avec la même graine) ;
    //   ce miroir avance tout seul (mèches, explosions, caisses, bonus, mort subite) calé sur l'horloge de l'hôte, et chaque
    //   événement de l'hôte confirme ou corrige la prédiction. Il n'appelle jamais api.point ni api.say.
    const PH = { wait: 'w', intro: 'i', play: 'p', end: 'e', over: 'o' };
    let netR = 0, curBan = 0, waitT = 0, stAcc = 0, stN = 0, posAcc = 0, netQ = 1;
    let aiS = null;                                // contre l'IA : son état (une par manche)
    const inbox = [];                              // messages reçus, traités dans update() dans l'ordre d'arrivée
    const outEv = [];                              // hôte : événements de l'image, envoyés en un lot fiable
    const ip = mkIp(GUEST ? 1 / 30 : 1 / 60);       // positions reçues de l'adversaire (lissage)
    const view = [null, null];                     // position AFFICHÉE de chaque personnage (null : celle de la simulation)
    // hôte
    const remoteIn = { remote: true, x: 0, y: 0, dir: 1, moving: false };
    const hostIn = [inputs[0], remoteIn];
    let gLast = null, gSeenT = -1, gArr = -1, gRejT = -1, gCorrT = -9;
    const gMap = new Map();                        // numéro d'une bombe chez l'invité → numéro chez l'hôte
    // invité
    let tErr = 0, lastSt = null, lastW = null, lastEvC = -1, frozen = -1, gseq = 0, helloAt = -9, resyncAt = -9, resync = false, cBatchT = -1;
    let cset = new Set(), uset = new Set();        // caisses cassées / bonus brûlés annoncés par le lot d'événements en cours
    const pred = new Map();                        // explosions prédites, en attente de l'hôte (id → {x, y, reach, ends, crates, burns, t})
    const pendPick = new Map();                    // bonus ramassés en prédiction (case → {it, v : valeur d'avant, t})
    const predLand = new Map();                    // blocs de mort subite tombés en prédiction (case → contenu d'avant)
    const NST = { fix: 0, crate: 0, undo: 0, corr: 0, rej: 0, nbomb: 0, warp: 0, freeze: 0, unfreeze: 0, lagko: 0 };   // compteurs (tests)

    function nnow() { try { const v = Number(NETAPI.now()); if (isFinite(v)) return v / 1000; } catch (e) { /* rien */ } return performance.now() / 1000; }
    // heure commune DE L'IMAGE (calée sur l'horodatage de requestAnimationFrame) : positions envoyées et affichées
    // aux mêmes instants que les images → mouvement parfaitement régulier, quel que soit le moment du calcul dans l'image
    let clkOff = null, fNow = 0;
    function frameClock(ms) {
      const o = nnow() - ms / 1000;
      if (clkOff == null || Math.abs(o - clkOff) > 0.25) clkOff = o; else clkOff += (o - clkOff) * 0.02;
      fNow = ms / 1000 + clkOff;
    }
    function nsend(m, rel) { try { NETAPI.send(m, { reliable: !!rel }); } catch (e) { /* rien */ } }
    function nrtt() { try { const v = Number(NETAPI.rtt()); if (isFinite(v) && v >= 0) return v / 1000; } catch (e) { /* rien */ } return 0.15; }
    function vpos(p) { return view[p] || S.actors[p]; }   // où dessiner le personnage p

    // ---- hôte
    function hostRoundStart() {
      netR++;
      S.burnLog = []; S.landLog = [];
      S.actors[1].lagc = true;                     // l'invité est jugé quand ses positions arrivent (à l'heure où il y était)
      S.waitLag = waitLag;
      gLast = null; gSeenT = -1; gArr = -1; gRejT = -1; gMap.clear();
      const B = S.actors[1];
      remoteIn.x = B.x; remoteIn.y = B.y; remoteIn.dir = B.dir; remoteIn.moving = false;
      ip.b.length = 0; view[0] = view[1] = null;
      nsend(roundMsg(false), true);
    }
    function roundMsg(withState) {
      const m = { k: 'R', r: netR, seed: S.seed, n: S.round, ban: curBan, c: Math.round(nnow() * 1000), ph: PH[phase] || 'i', pt: r3(phaseT) };
      if (withState) m.z = encodeState(S);
      return m;
    }
    function waitLag(loser) {                      // l'hôte est touché : l'invité l'a-t-il été aussi (égalité) ? on attend ses positions
      if (loser !== 0 || !S.actors[1].alive) return false;
      return gSeenT < S.hitAt[0] + DRAW_WIN && S.t - S.hitAt[0] < DRAW_WIN + 0.8;
    }
    function hostNet() {
      for (let k = 0; k < inbox.length; k++) {
        const m = inbox[k];
        try {
          if (m.k === 'H') { if (phase === 'wait') startRound(false); else nsend(roundMsg(phase !== 'intro'), true); continue; }
          if (m.r !== netR) continue;
          if (m.k === 'p') hostPos(m);
          else if (m.k === 'B') hostBomb(m);
          else if (m.k === 'P') hostPush(m);
        } catch (e) { /* message abîmé : ignoré */ }
      }
      inbox.length = 0;
      if (S.burnLog) {
        while (S.burnLog.length && S.burnLog[0].b < S.t - 2.5) S.burnLog.shift();
        while (S.landLog.length && S.landLog[0].t < S.t - 2.5) S.landLog.shift();
      }
      // plus de nouvelles de l'invité depuis 0,6 s : il est jugé sur sa dernière position connue
      S.actors[1].lagc = !(phase === 'play' && gArr >= 0 && nnow() - gArr > 0.6);
    }
    // la case où il se tient doit être libre (une caisse qui finit de se briser est tolérée : petit décalage d'horloge) ;
    // la case qu'il chevauche ne peut pas être un pilier ni une caisse (un bloc tombé à côté de lui, oui : il n'est pas écrasé)
    function walkable(x, y, t) {
      const rx = Math.round(x), ry = Math.round(y), i0 = cellAt(S, rx, ry);
      if (i0 < 0) return false;
      const c0 = S.cells[i0];
      const lateBlock = c0 === SOLID && S.landLog.some((L) => L.i === i0 && L.t > t);   // bloc tombé APRÈS cette position : la case était libre
      if (c0 !== EMPTY && !(c0 === BREAKING && S.breakT[i0] < 0.12) && !lateBlock) return false;
      const ox2 = Math.abs(x - rx) < 0.03 ? rx : (x > rx ? rx + 1 : rx - 1), oy2 = Math.abs(y - ry) < 0.03 ? ry : (y > ry ? ry + 1 : ry - 1);
      const i1 = cellAt(S, ox2, oy2);
      if (i1 < 0) return false;
      const c1 = S.cells[i1];
      return c1 !== PILLAR && c1 !== CRATE;
    }
    function reject() {                            // position refusée ; si l'invité s'obstine (prédiction fausse), on le recale
      const now = nnow();
      NST.rej++;
      if (gRejT < 0) gRejT = now;
      if (now - gRejT > 0.25 && now - gCorrT > 0.6) {
        gCorrT = now;
        const B = S.actors[1];
        nsend({ k: 'C', r: netR, x: r3(B.x), y: r3(B.y) }, true);
      }
    }
    function remoteHit(x, y, t, why) {             // l'invité touché à l'heure t (renvoie vrai s'il est mort)
      const B = S.actors[1];
      if (!B.alive || S.result) return true;
      const px = B.x, py = B.y;
      B.x = x; B.y = y;
      hitActor(S, B, why);
      if (!B.alive) { S.hitAt[1] = Math.min(S.t, t); remoteIn.x = x; remoteIn.y = y; remoteIn.moving = false; NST.lagko++; return true; }
      B.x = px; B.y = py;                          // bouclier : toujours debout
      return false;
    }
    // trajet de l'invité depuis sa dernière position : flammes et blocs rencontrés À L'HEURE où il y était
    function lagSweep(a, b) {
      const dist = Math.abs(b.x - a.x) + Math.abs(b.y - a.y), n = Math.max(1, Math.min(40, Math.ceil(dist / 0.2)));
      for (let k = gLast ? 1 : 0; k <= n; k++) {
        const f = k / n, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, t = a.t + (b.t - a.t) * f;
        const ci = cellAt(S, Math.round(x), Math.round(y));
        if (ci < 0) continue;
        for (const L of S.landLog) if (L.i === ci && t >= L.t - 1e-4 && t <= L.t + 0.25) { remoteHit(x, y, L.t, 'crush'); return true; }
        for (const B of S.burnLog) {
          if (B.i !== ci || t < B.a - 1e-4 || t >= B.b) continue;
          if (remoteHit(x, y, t, B.o === 1 ? 'self' : 'flame')) return true;
        }
      }
      return false;
    }
    function hostPos(m) {
      const B = S.actors[1];
      const x = +m.x, y = +m.y, t = +m.t;
      if (!isFinite(x) || !isFinite(y) || !isFinite(t) || !isFinite(m.c)) return;
      if (phase !== 'play' || !B.alive || S.result) return;
      if (gLast && t <= gLast.t) return;          // arrivée dans le désordre : déjà dépassée
      gSeenT = Math.max(gSeenT, t); gArr = m.at;
      const from = gLast || { x: B.x, y: B.y, t: 0 };
      // 1) vraisemblance : dans l'arène, sur un couloir, pas plus vite que ses chaussures
      const inb = x >= -0.01 && y >= -0.01 && x <= S.cols - 0.99 && y <= S.rows - 0.99;
      const lane = Math.min(Math.abs(x - Math.round(x)), Math.abs(y - Math.round(y))) < 0.03;
      const vmax = BASE_SPEED + SPEED_STEP * Math.min(MAX_SPEED, B.speedLvl + 1);
      const far = Math.abs(x - from.x) + Math.abs(y - from.y) > vmax * Math.max(0, t - from.t) * 1.3 + 0.35;
      if (!inb || !lane || far) { reject(); return; }
      // 2) flammes / blocs sur le trajet (compensation de la latence)
      if (lagSweep(from, { x, y, t })) return;
      // 3) piliers, blocs, caisses de l'hôte
      if (!walkable(x, y, t)) { reject(); return; }
      gLast = { x, y, t }; gRejT = -1;
      remoteIn.x = x; remoteIn.y = y; remoteIn.dir = m.d & 3; remoteIn.moving = !!m.m;
      ipAdd(ip, { c: m.c / 1000, x, y, d: m.d & 3, m: m.m ? 1 : 0 }, m.at);
    }
    function hostBomb(m) {
      const g = m.g | 0, late = clamp(S.t - (isFinite(+m.t) ? +m.t : S.t), 0, 1);
      const ok = phase === 'play' && !S.result && placeBombAt(S, S.actors[1], m.x | 0, m.y | 0, S.P.fuse - late, g);
      if (ok) gMap.set(g, S.bombs[S.bombs.length - 1].id);
      else { outEv.push(['n', g]); NST.nbomb++; }
    }
    function hostPush(m) {
      const id = m.id > 0 ? m.id : gMap.get(-m.id);
      const b = S.bombs.find((o) => o.id === id);
      if (!b) return;
      const d = m.d & 3;
      if (phase !== 'play' || S.result || !S.actors[1].alive || b.slide >= 0 ||
        !bombCanEnter(S, Math.round(b.x) + DX[d], Math.round(b.y) + DY[d], b)) {
        if (b.slide < 0) outEv.push(['s', b.id, r3(b.x), r3(b.y)]);   // poussée refusée : l'invité la remet en place
        return;
      }
      b.slide = d;
      S.events.push({ type: 'push', p: 1, x: b.x, y: b.y, d, id: b.id });
      const late = clamp(S.t - (isFinite(+m.t) ? +m.t : S.t), 0, 0.5);
      if (late > 0) slideBomb(S, b, late);        // rattrape le temps de trajet du message
    }
    function netEv(e) {                            // événement de la simulation → lot fiable pour l'invité
      switch (e.type) {
        case 'drop': {
          const b = S.bombs.find((o) => o.id === e.id);
          outEv.push(['d', e.id, e.p, e.x, e.y, r3(b ? S.t + b.fuse : S.t), b ? b.range : S.actors[e.p].range, e.g || 0]);
          break;
        }
        case 'boom': outEv.push(['b', e.id, e.x, e.y, e.owner, e.range].concat(e.reach, e.ends)); break;
        case 'crate': outEv.push(['c', e.i, e.d]); break;
        case 'item': outEv.push(['i', e.i, e.it]); break;
        case 'burn': outEv.push(['u', e.i]); break;
        case 'pick': outEv.push(['k', e.p, e.i, e.it, powerVal(S.actors[e.p], e.it)]); break;
        case 'push': outEv.push(['p', e.p, e.id, e.d, r3(e.x), r3(e.y)]); break;
        case 'stop': outEv.push(['s', e.id, r3(e.x), r3(e.y)]); break;
        case 'shield': outEv.push(['h', e.p]); break;
        case 'ko': outEv.push(['o', e.p, e.why, r3(e.x), r3(e.y)]); break;
        case 'sd': outEv.push(['z']); break;
        case 'land': outEv.push(['l', e.i]); break;
        default: break;                            // 'result' : par onResult (avec « fin du match ») ; 'squash' : l'invité le déduit
      }
    }
    function flushEv() {
      if (!outEv.length) return;
      const head = { k: 'e', r: netR, t: r3(S.t), c: Math.round(nnow() * 1000) };
      let batch = [], size = 70;
      for (const ev of outEv) {
        const s = JSON.stringify(ev).length + 1;
        if (batch.length && size + s > 900) { nsend(Object.assign({ ev: batch }, head), true); batch = []; size = 70; }
        batch.push(ev); size += s;
      }
      nsend(Object.assign({ ev: batch }, head), true);
      outEv.length = 0;
    }
    function hostTick(dt) {                        // fin d'image : lot d'événements + état (~30/s ; 5/s en pause)
      flushEv();
      stAcc += dt;
      if (stAcc < (paused ? 0.2 : 1 / 30) - 0.004) return;
      stAcc = 0;
      const A = S.actors[0], B = S.actors[1];
      const m = { k: 's', r: netR, c: Math.round(fNow * 1000), t: r3(S.t), q: paused || resumeT > 0 ? 0 : r3(netQ), ph: PH[phase] || 'w', pt: r3(phaseT),
        a: [r3(A.x), r3(A.y), A.dir, A.moving && phase === 'play' ? 1 : 0] };
      if (++stN % 6 === 0) m.w = [A.bombsMax, A.range, A.speedLvl, A.push ? 1 : 0, B.bombsMax, B.range, B.speedLvl, B.push ? 1 : 0];
      nsend(m, false);
    }

    // ---- invité
    function onState(m, now) {                     // état rapide de l'hôte (appelé à l'arrivée)
      if (!Array.isArray(m.a) || !isFinite(m.c) || !isFinite(m.t)) return;
      if (m.ph === 'p' || m.ph === 'e' || m.ph === 'o') ipAdd(ip, { c: m.c / 1000, x: +m.a[0], y: +m.a[1], d: m.a[2] & 3, m: m.a[3] ? 1 : 0 }, now);
      if (!lastSt || m.c > lastSt.c) lastSt = m;
      if (Array.isArray(m.w) && (!lastW || m.c > lastW.c)) lastW = { c: m.c, w: m.w, done: false };
    }
    function applyBanner(ban, rn) {
      bannerTitle = ban === 1 ? '' : PATTERNS[S.pattern].toUpperCase();
      introDur = ban === 1 ? 4.7 : 3.2;
      bannerTxt = ban === 1 ? RULE : ban === 2 ? ['Égalité… on rejoue !'] : ban === 3 ? ['Balle de match !'] : ban === 4 && HINTS[rn] ? [HINTS[rn]] : null;
    }
    function guestRound(m, now) {                  // nouvelle manche (graine de l'hôte), ou arrivée en cours de manche
      resync = false;
      netR = m.r | 0;
      const rn = Math.max(1, m.n | 0);
      S = newRound({ cols: NET_COLS, rows: NET_ROWS, notch: true, seed: m.seed >>> 0, round: rn });
      danger = new Float32Array(S.N); flameDist = new Uint8Array(S.N);
      PT.length = 0; RG.length = 0; TX.length = 0; decals.length = 0;
      lastRes = null; endT = 0; zoom = 1; zoomTo = 1; slowT = 0; hitStop = 0; countSaid = -1; lastTick = -1; sdFlash = 0;
      inputs[0].bomb = false; inputs[1].bomb = false;
      applyBanner(m.ban | 0, rn);
      firstRound = false;
      pred.clear(); pendPick.clear(); predLand.clear(); frozen = -1; tErr = 0; lastSt = null; lastW = null; lastEvC = -1; cBatchT = -1;
      ip.b.length = 0; view[0] = view[1] = null;
      const el = clamp((+m.pt || 0) + Math.max(0, now - (+m.c || 0) / 1000), 0, 600);
      phase = 'intro'; phaseT = el;
      if (m.ph !== 'i' && m.z && applyState(S, m.z)) {
        phase = m.ph === 'e' ? 'end' : m.ph === 'o' ? 'over' : 'play';
        if (S.result) lastRes = { winner: S.result.winner, loser: S.result.loser, why: S.result.why };
      }
      layout();
      iris = { t: 0, dur: 0.65, open: true, x: (S.cols - 1) / 2, y: (S.rows - 1) / 2 };
    }
    function askResync(now) { if (now - resyncAt > 0.5) { resyncAt = now; resync = true; nsend({ k: 'H' }, true); } }
    function guestNet() {
      const now = nnow();
      for (let k = 0; k < inbox.length; k++) {
        const m = inbox[k];
        try {
          if (m.k === 'R') { if (m.r !== netR || resync) guestRound(m, now); continue; }
          if (m.r !== netR) { if (m.r > netR) askResync(now); continue; }
          if (m.k === 'e') guestBatch(m);
          else if (m.k === 'C') { const A = S.actors[ME]; if (A.alive && isFinite(+m.x) && isFinite(+m.y)) { A.x = +m.x; A.y = +m.y; NST.corr++; } }
        } catch (e) { /* message abîmé : ignoré */ }
      }
      inbox.length = 0;
      if (phase === 'wait' && now - helloAt > 0.5) { helloAt = now; nsend({ k: 'H' }, true); }
      for (const [k, r] of pred) if (S.t - r.t > 3) pred.delete(k);
      for (const [k, r] of pendPick) if (S.t - r.t > 2) pendPick.delete(k);
    }
    function guestSync(now) {                      // horloge, décompte, position logique de l'adversaire, pouvoirs
      const m = lastSt;
      if (!m || m.r !== netR) { tErr = 0; return; }
      const age = Math.max(0, now - m.c / 1000);    // état trop vieux (réseau ou hôte bloqué) : on ne s'y cale pas
      tErr = phase === 'play' && m.ph === 'p' && !paused && resumeT <= 0 && age < 0.35 ? (+m.t + age * (+m.q || 0)) - S.t : 0;
      if (phase === 'intro' && m.ph === 'i' && age < 0.35) { const est = +m.pt + age; if (Math.abs(est - phaseT) > 0.03) phaseT += (est - phaseT) * 0.25; }
      const o = S.actors[OPP];
      if (o.alive && phase === 'play' && (m.ph === 'p' || m.ph === 'e')) { o.x = +m.a[0]; o.y = +m.a[1]; o.dir = m.a[2] & 3; o.moving = !!m.a[3]; }
      if (lastW && !lastW.done && lastW.c > lastEvC) {   // filet de sécurité : pouvoirs absolus (jamais plus vieux qu'un événement reçu)
        lastW.done = true;
        for (const p of [0, 1]) {
          if (p === ME && pendPick.size) continue;
          const a = S.actors[p], w = lastW.w, o4 = p * 4;
          a.bombsMax = w[o4] | 0 || a.bombsMax; a.range = w[o4 + 1] | 0 || a.range; a.speedLvl = w[o4 + 2] | 0; a.push = !!w[o4 + 3];
        }
      }
    }
    function restoreCrate(i) {                     // caisse cassée à tort en prédiction : on la remet
      if (S.fallen[i]) return;
      if (S.cells[i] === BREAKING || (S.cells[i] === EMPTY && (S.items[i] < 0 || S.items[i] === S.loot[i]))) {
        S.cells[i] = CRATE; S.breakT[i] = 0; NST.crate++;
        if (S.items[i] >= 0) S.items[i] = -1;
      }
    }
    function undoPick(i) {                         // bonus pris en prédiction mais pas par moi chez l'hôte
      const pp = pendPick.get(i);
      pendPick.delete(i);
      if (pp) { setPower(S.actors[ME], pp.it, pp.v); NST.undo++; }
    }
    // fin de manche chez l'hôte : explosions, chutes de blocs et bonus prédits mais jamais confirmés sont défaits
    // (pendant ~la latence, l'invité a continué de prédire alors que la manche était déjà figée) → même arène des deux côtés
    function undoUnconfirmed() {
      for (const [id, rec] of pred) {
        for (const i of boomCells(S, rec.x, rec.y, rec.reach)) { S.flameT[i] = 0; S.flameM[i] = 0; }
        for (const i of rec.crates) restoreCrate(i);
        for (const q of rec.burns) if (S.items[q[0]] < 0 && S.cells[q[0]] === EMPTY) S.items[q[0]] = q[1];
        const ci = cellAt(S, rec.x, rec.y);
        if (ci >= 0 && !bombAtCell(S, ci) && rec.owner != null) {
          S.bombs.push({ id, owner: rec.owner, x: rec.x, y: rec.y, cell: ci, fuse: 0.05, fuse0: S.P.fuse, range: rec.range || 2, slide: -1, pass: [true, true], t: 1 });
          S.actors[rec.owner].active++;
          NST.fix++;
        }
      }
      pred.clear();
      for (const [i, q] of predLand) { S.cells[i] = q.c; S.fallen[i] = 0; S.items[i] = q.it; NST.fix++; }
      predLand.clear();
      for (const [i, pp] of pendPick) { setPower(S.actors[ME], pp.it, pp.v); if (S.items[i] < 0 && S.cells[i] === EMPTY) S.items[i] = pp.it; NST.undo++; }
      pendPick.clear();
    }
    function fixBoom(rec, x, y, ow, reach, ends, age) {
      for (const i of rec.crates) if (!cset.has(i)) restoreCrate(i);
      for (const q of rec.burns) if (!uset.has(q[0]) && S.items[q[0]] < 0 && S.cells[q[0]] === EMPTY) S.items[q[0]] = q[1];
      let same = rec.x === x && rec.y === y;
      for (let d = 0; d < 4 && same; d++) if (rec.reach[d] !== reach[d] || rec.ends[d] !== ends[d]) same = false;
      if (same) return;
      NST.fix++;
      const real = boomCells(S, x, y, reach);
      for (const i of boomCells(S, rec.x, rec.y, rec.reach)) if (!real.has(i)) { S.flameT[i] = 0; S.flameM[i] = 0; }
      applyBoom(S, x, y, ow, reach, ends, age);
    }
    function guestBatch(m) {
      if (!Array.isArray(m.ev)) return;
      const tEv = +m.t || 0, age = Math.max(0, S.t - tEv);
      if (tEv !== cBatchT) { cBatchT = tEv; cset = new Set(); uset = new Set(); }
      for (const e of m.ev) { if (!Array.isArray(e)) continue; if (e[0] === 'c') cset.add(e[1]); else if (e[0] === 'u') uset.add(e[1]); }
      for (const e of m.ev) if (Array.isArray(e)) gEv(e, age);
      if (m.c > lastEvC) lastEvC = m.c;
    }
    function gEv(e, age) {                         // un événement fiable de l'hôte : confirme ou corrige le miroir
      const A = S.actors, cxy = (i) => [i % S.cols, (i / S.cols) | 0];
      switch (e[0]) {
        case 'd': {                                // bombe posée (numéro, poseur, case, heure d'explosion, portée)
          const id = e[1], ow = e[2] ? 1 : 0, x = e[3] | 0, y = e[4] | 0, xt = +e[5], g = e[7] | 0;
          if (ow === ME && g) {                    // la mienne : l'hôte confirme son numéro et son heure
            const b0 = S.bombs.find((o) => o.g === g && o.owner === ME);
            if (b0) { b0.id = id; if (Math.abs(S.t + b0.fuse - xt) > 0.05) b0.fuse = Math.max(0, xt - S.t); break; }
            if (pred.has(-g)) { pred.set(id, pred.get(-g)); pred.delete(-g); break; }
          }
          if (pred.has(id) || S.bombs.some((o) => o.id === id)) break;
          const i = cellAt(S, x, y);
          if (i < 0) break;
          const b = { id, owner: ow, x, y, cell: i, fuse: Math.max(0, xt - S.t), fuse0: S.P.fuse, range: (e[6] | 0) || A[ow].range, slide: -1, pass: [false, false], t: 0 };
          b.pass[ow] = true;
          const me = A[ME];
          if (me.alive && Math.abs(me.x - x) < 0.98 && Math.abs(me.y - y) < 0.98) b.pass[ME] = true;   // posée sur moi : je peux en sortir
          S.bombs.push(b); A[ow].active++;
          S.events.push({ type: 'drop', p: ow, x, y, id });
          break;
        }
        case 'n': {                                // ma bombe refusée (case prise entre-temps…) : pschitt
          const k = S.bombs.findIndex((o) => o.g === (e[1] | 0) && o.owner === ME);
          if (k >= 0) { const b = S.bombs[k]; S.bombs.splice(k, 1); A[ME].active = Math.max(0, A[ME].active - 1); puffs(b.x, b.y, 4, 0.8, 0.6, 0.4, 1.0, 0.6); NST.nbomb++; }
          break;
        }
        case 'b': {                                // explosion (numéro, case, poseur, portée, bras atteints, bouts)
          const id = e[1], x = e[2] | 0, y = e[3] | 0, ow = e[4] ? 1 : 0, rg = e[5] | 0;
          const reach = [e[6] | 0, e[7] | 0, e[8] | 0, e[9] | 0], ends = [e[10] | 0, e[11] | 0, e[12] | 0, e[13] | 0];
          const rec = pred.get(id);
          if (rec) { pred.delete(id); fixBoom(rec, x, y, ow, reach, ends, age); break; }
          const k = S.bombs.findIndex((o) => o.id === id);
          if (k >= 0) { S.bombs.splice(k, 1); A[ow].active = Math.max(0, A[ow].active - 1); }
          applyBoom(S, x, y, ow, reach, ends, age);
          S.events.push({ type: 'boom', x, y, owner: ow, range: rg, reach, ends, id, auth: 1 });
          break;
        }
        case 'c': {                                // caisse touchée
          const i = e[1] | 0;
          if (i >= 0 && i < S.N && S.cells[i] === CRATE) {
            S.cells[i] = BREAKING; S.breakT[i] = Math.max(0.02, BREAK_DUR - age);
            const q = cxy(i);
            S.events.push({ type: 'crate', i, x: q[0], y: q[1], kind: S.kind[i], face: S.face[i], d: e[2] & 3 });
          }
          break;
        }
        case 'i': {                                // bonus apparu
          const i = e[1] | 0, it = e[2] | 0;
          if (i >= 0 && i < S.N && S.items[i] !== it && !pendPick.has(i) && S.cells[i] !== PILLAR && S.cells[i] !== SOLID) {
            S.cells[i] = EMPTY; S.items[i] = it; S.itemT[i] = age;
            const q = cxy(i);
            S.events.push({ type: 'item', i, it, x: q[0], y: q[1] });
          }
          break;
        }
        case 'u': {                                // bonus brûlé
          const i = e[1] | 0;
          if (pendPick.has(i)) undoPick(i);
          if (i >= 0 && i < S.N && S.items[i] >= 0) { const it = S.items[i], q = cxy(i); S.items[i] = -1; S.events.push({ type: 'burn', i, x: q[0], y: q[1], it }); }
          break;
        }
        case 'k': {                                // bonus ramassé (joueur, case, bonus, nouvelle valeur du pouvoir)
          const p = e[1] ? 1 : 0, i = e[2] | 0, it = e[3] | 0;
          if (it < 0 || it >= ITEMS.length) break;
          if (pendPick.has(i)) {
            if (p === ME) { pendPick.delete(i); setPower(A[p], it, e[4]); break; }   // prédit : confirmé
            undoPick(i);                           // c'est l'autre qui l'a eu
          }
          if (i >= 0 && i < S.N) S.items[i] = -1;
          setPower(A[p], it, e[4]); A[p].picks++;
          const q = cxy(i);
          S.events.push({ type: 'pick', p, it, i, x: q[0], y: q[1] });
          break;
        }
        case 'p': {                                // bombe poussée
          const p = e[1] ? 1 : 0, d = e[3] & 3, x = +e[4], y = +e[5];
          const b = S.bombs.find((o) => o.id === e[2]);
          if (!b) break;
          if (p === ME && b.myPush) { b.myPush = false; break; }
          if (b.slide === d) break;
          b.x = x; b.y = y; b.cell = cellAt(S, Math.round(x), Math.round(y)); b.slide = d;
          if (age > 0) slideBomb(S, b, Math.min(age, 0.5));
          S.events.push({ type: 'push', p, x, y, d, id: b.id });
          break;
        }
        case 's': {                                // bombe arrêtée (position exacte)
          const b = S.bombs.find((o) => o.id === e[1]);
          if (!b) break;
          const x = +e[2], y = +e[3], was = b.slide >= 0;
          b.slide = -1; b.myPush = false; b.x = x; b.y = y; b.cell = cellAt(S, Math.round(x), Math.round(y));
          if (was) S.events.push({ type: 'stop', x, y, id: b.id });
          break;
        }
        case 'h': {                                // bouclier usé
          const p = e[1] ? 1 : 0, a = A[p], v = vpos(p);
          a.shield = false; a.invul = Math.max(a.invul, 1.3 - age);
          if (p === ME) frozen = -1;
          S.events.push({ type: 'shield', p, x: v.x, y: v.y });
          break;
        }
        case 'o': {                                // personnage touché (verdict de l'hôte)
          const p = e[1] ? 1 : 0, a = A[p];
          if (p === ME) frozen = -1;
          if (!a.alive) break;
          a.alive = false; a.deadT = age; a.why = e[2] || 'flame'; a.moving = false;
          if (isFinite(+e[3]) && isFinite(+e[4])) { a.x = +e[3]; a.y = +e[4]; }
          if (p === ME) view[p] = null;
          S.events.push({ type: 'ko', p, why: a.why, x: a.x, y: a.y });
          break;
        }
        case 'z':                                  // mort subite (déjà prévue par l'horloge, normalement)
          if (!S.sd.on) { S.sd.on = true; S.sd.order = spiralOrder(S.cols, S.rows); S.sd.idx = 0; S.sd.timer = 0; S.events.push({ type: 'sd' }); }
          break;
        case 'l': {                                // bloc tombé
          const i = e[1] | 0;
          predLand.delete(i);
          if (i < 0 || i >= S.N || S.cells[i] === SOLID || S.cells[i] === PILLAR) break;
          const fall = S.sd.falling;
          for (let k = fall.length - 1; k >= 0; k--) if (fall[k].i === i) fall.splice(k, 1);
          landBlock(S, i, false);
          break;
        }
        case 'r': {                                // fin de manche (gagnant, perdant, pourquoi, fin du match)
          if (S.result) break;
          const w = e[1] | 0;
          S.result = { winner: w, loser: e[2] | 0, why: e[3] || '' };
          if (w >= 0) A[w].win = true;
          S.sd.falling.length = 0;
          undoUnconfirmed();                       // l'hôte a figé la manche : ce que j'ai prédit depuis n'a pas eu lieu
          S.events.push({ type: 'result', winner: w, loser: S.result.loser, why: S.result.why, over: !!e[4] });
          break;
        }
        default: break;
      }
    }
    // un pas du miroir : le monde (dt, calé sur l'hôte) et mon personnage (dm : tout de suite, sans attendre)
    function guestStep(dt, dm, inp) {
      S.t += dt;
      const live = !S.result;
      if (!live) S.endT += dt;
      for (let i = 0; i < S.N; i++) {
        if (S.flameT[i] > 0) { S.flameT[i] -= dt; if (S.flameT[i] <= 0) { S.flameT[i] = 0; S.flameM[i] = 0; } }
        if (S.cells[i] === BREAKING) {
          S.breakT[i] -= dt;
          if (S.breakT[i] <= 0) {
            S.cells[i] = EMPTY;
            if (S.loot[i] >= 0) { S.items[i] = S.loot[i]; S.itemT[i] = 0; S.events.push({ type: 'item', i, it: S.loot[i], x: i % S.cols, y: (i / S.cols) | 0 }); }
          }
        }
        if (S.items[i] >= 0) S.itemT[i] += dt;
      }
      for (const a of S.actors) {
        if (a.invul > 0) a.invul = Math.max(0, a.invul - dt);
        if (!a.alive) { a.deadT += dt; continue; }
        if (!live) { a.moving = false; continue; }
        if (a.p !== ME) continue;                  // l'adversaire : positions de l'hôte
        if (frozen >= 0) { a.moving = false; continue; }   // pris dans les flammes : on attend le verdict de l'hôte
        const ne = S.events.length;
        moveActor(S, a, inp.mx || 0, inp.my || 0, dm);
        for (let k = ne; k < S.events.length; k++) {
          const ev = S.events[k];
          if (ev.type !== 'push') continue;
          const b = S.bombs.find((o) => o.id === ev.id);
          if (b) b.myPush = true;
          nsend({ k: 'P', r: netR, id: ev.id, d: ev.d, t: r3(S.t) }, true);
        }
        if (inp.bomb && placeBomb(S, a)) {         // ma bombe : posée tout de suite, annoncée à l'hôte
          const b = S.bombs[S.bombs.length - 1];
          b.g = ++gseq; b.id = -b.g;
          for (let k = S.events.length - 1; k >= 0; k--) if (S.events[k].type === 'drop') { S.events[k].id = b.id; break; }
          nsend({ k: 'B', r: netR, g: b.g, x: b.x, y: b.y, t: r3(S.t) }, true);
        }
        const ci = cellAt(S, Math.round(a.x), Math.round(a.y));
        if (ci >= 0 && S.items[ci] >= 0) { const it = S.items[ci]; pendPick.set(ci, { it, v: powerVal(a, it), t: S.t }); pickItem(S, a, ci); }
      }
      const ne = S.events.length;
      updateBombs(S, dt, live);                    // mèches et explosions prédites (même heure que chez l'hôte)
      if (S.events.length > ne) {
        let crates = [], burns = [];
        for (let k = ne; k < S.events.length; k++) {
          const e = S.events[k];
          if (e.type === 'crate') crates.push(e.i);
          else if (e.type === 'burn') burns.push([e.i, e.it]);
          else if (e.type === 'boom') { pred.set(e.id, { x: e.x, y: e.y, owner: e.owner, range: e.range, reach: e.reach.slice(), ends: e.ends.slice(), crates, burns, t: S.t }); crates = []; burns = []; }
        }
      }
      if (live) suddenDeath(S, dt);
      const fall = S.sd.falling;
      for (let k = fall.length - 1; k >= 0; k--) {
        const f = fall[k];
        f.t -= dt;
        if (f.t <= 0) {
          fall.splice(k, 1);
          if (S.cells[f.i] !== SOLID && S.cells[f.i] !== PILLAR) predLand.set(f.i, { c: S.cells[f.i], it: S.items[f.i] });
          landBlock(S, f.i, false);
          const a = S.actors[ME];
          if (live && a.alive && frozen < 0 && cellAt(S, Math.round(a.x), Math.round(a.y)) === f.i) frozen = nnow();
        }
      }
    }
    function guestAdvance(d) {
      let dw = d;
      if (phase === 'play') {                      // le monde suit l'horloge de simulation de l'hôte (petite accélération / attente)
        // (en avance, même beaucoup — après une pause, l'invité a joué ~2 latences de plus — : on ralentit, sans jamais figer :
        //  ses positions doivent toujours porter une heure qui avance)
        if (tErr > 0.5) { NST.warp++; const T2 = Math.min(tErr, 2), n2 = Math.ceil(T2 / 0.0085); for (let i = 0; i < n2; i++) guestStep(T2 / n2, 0, NOIN); tErr = 0; }
        else dw = d * (1 + clamp(tErr * 1.5, -0.4, 0.3));
      }
      const inp = inputs[ME];
      const n = Math.max(1, Math.ceil(Math.max(d, dw) / 0.0085));
      for (let i = 0; i < n; i++) { guestStep(dw / n, d / n, inp); inp.bomb = false; }
      // pris dans des flammes (prévues) : je ne bouge plus jusqu'au verdict de l'hôte
      const A = S.actors[ME];
      if (phase === 'play' && A.alive && !S.result) {
        if (frozen < 0) {
          const ci = cellAt(S, Math.round(A.x), Math.round(A.y));
          if (ci >= 0 && S.flameT[ci] > FLAME_SAFE && !A.shield && A.invul <= 0) { frozen = nnow(); NST.freeze++; }
        } else if (nnow() - frozen > nrtt() + 0.35 + Math.max(0, -tErr)) { frozen = -1; NST.unfreeze++; }   // l'hôte ne m'a pas vu touché : je repars
      }
    }
    function guestTick(dt) {                       // ma position (~60/s) pendant la manche
      if (phase !== 'play' || !netR) return;
      posAcc += dt;
      if (posAcc < 1 / 60 - 0.004) return;
      posAcc = 0;
      const A = S.actors[ME];
      if (!A.alive) return;
      nsend({ k: 'p', r: netR, c: Math.round(fNow * 1000), t: r3(S.t), x: r3(A.x), y: r3(A.y), d: A.dir, m: A.moving ? 1 : 0 }, false);
    }
    function updView(dt) {                         // l'adversaire glisse : lecture du tampon avec un léger retard adaptatif
      const p = OPP, a = S.actors[p];
      if (!a.alive && view[p]) {                   // touché : il glisse jusqu'à l'endroit où il est tombé (pas de téléportation)
        const v = view[p], k = 1 - Math.exp(-dt * 24);
        v.x += (a.x - v.x) * k; v.y += (a.y - v.y) * k; v.moving = false;
        if (Math.abs(a.x - v.x) + Math.abs(a.y - v.y) < 0.004) view[p] = null;
        return;
      }
      if (!a.alive || phase === 'intro' || phase === 'wait' || !ip.b.length) { view[p] = null; return; }
      const tg = ipTarget(ip);                    // retard de lecture : suit la latence observée, sans à-coup (±5 % de vitesse au plus)
      if (ip.D < 0) ip.D = tg; else if (Math.abs(tg - ip.D) > 0.006) ip.D += clamp(tg - ip.D, -0.05 * dt, 0.05 * dt);
      const s = ipAt(ip, fNow - ip.D);
      if (!s) { view[p] = null; return; }
      let v = view[p];
      if (!v) v = view[p] = { x: s.x, y: s.y, dir: s.d, moving: false, walk: a.walk };
      let nx = s.x, ny = s.y;
      const gap = Math.abs(nx - v.x) + Math.abs(ny - v.y);
      const vmax = (BASE_SPEED + SPEED_STEP * MAX_SPEED) * Math.max(dt, 1 / 120) * 1.3 + 0.015;   // plus grand pas possible en une image
      if (gap > vmax) {                            // messages en retard / image bloquée : on rattrape en glissant (~50 ms), jamais d'un coup
        const k = Math.min(1, Math.max(vmax, gap * (1 - Math.exp(-dt * 20))) / gap);
        nx = v.x + (nx - v.x) * k; ny = v.y + (ny - v.y) * k;
      }
      v.walk += Math.abs(nx - v.x) + Math.abs(ny - v.y);
      v.x = nx; v.y = ny; v.dir = s.d; v.moving = !!s.m && phase === 'play';
    }
    function placeholder() {                       // en attendant l'autre téléphone : l'arène vide
      S = newRound({ cols: NET_COLS, rows: NET_ROWS, notch: true, seed: 1, round: 1 });
      for (let i = 0; i < S.N; i++) if (S.cells[i] === CRATE) S.cells[i] = EMPTY;
      S.loot.fill(-1);
      danger = new Float32Array(S.N); flameDist = new Uint8Array(S.N);
      phase = 'wait'; phaseT = 0; waitT = 0;
      layout();
    }

    // ----------------------------------------------------------------- manches
    function startRound(isReplay) {
      if (HOST) flushEv();                         // en ligne : derniers événements de la manche qui se termine
      let rn = 1;
      try { rn = Math.max(1, Number(api.round ? api.round() : 1) | 0) || 1; } catch (e) { rn = 1; }
      const r = root.getBoundingClientRect();
      const port = (r.height || H) >= (r.width || W);
      // en ligne : même arène logique sur tous les écrans (la grande arène portrait), chacun l'affiche à son échelle
      S = newRound({ cols: NETAPI ? NET_COLS : port ? 11 : 15, rows: NETAPI ? NET_ROWS : port ? 15 : 11, notch: NETAPI ? true : port, seed: (Math.random() * 4294967296) >>> 0, round: rn });
      danger = new Float32Array(S.N); flameDist = new Uint8Array(S.N);
      PT.length = 0; RG.length = 0; TX.length = 0; decals.length = 0;
      lastRes = null; endT = 0; zoom = 1; zoomTo = 1; slowT = 0; hitStop = 0; countSaid = -1; lastTick = -1; sdFlash = 0;
      inputs[0].bomb = false; inputs[1].bomb = false;
      let sc = [0, 0];
      try { sc = (api.scores && api.scores()) || [0, 0]; } catch (e) { sc = [0, 0]; }
      bannerTitle = firstRound && !isReplay ? '' : PATTERNS[S.pattern].toUpperCase();
      if (firstRound && !isReplay) { bannerTxt = RULE; introDur = 4.7; curBan = 1; }
      else {
        introDur = 3.2;
        if (isReplay) { bannerTxt = ['Égalité… on rejoue !']; curBan = 2; }
        else if (Math.max(sc[0] || 0, sc[1] || 0) >= BOUM.target - 1) { bannerTxt = ['Balle de match !']; curBan = 3; }
        else { bannerTxt = HINTS[rn] ? [HINTS[rn]] : null; curBan = 4; }
      }
      firstRound = false;
      phase = 'intro'; phaseT = 0;
      layout();
      iris = { t: 0, dur: 0.65, open: true, x: (S.cols - 1) / 2, y: (S.rows - 1) / 2 };
      say(isReplay ? 'On rejoue !' : 'Manche ' + rn, { color: ACCENT, ms: 1000 });
      if (HOST) hostRoundStart();
      if (AIP) aiS = aiNew(AIP.level, (S.seed ^ 0x9e3779b9) >>> 0);   // contre l'IA : une IA fraîche à chaque manche
    }
    function onResult(e) {
      lastRes = { winner: e.winner, loser: e.loser, why: e.why };
      endT = 0; phaseT = 0;
      if (e.winner >= 0) {
        const why = e.why === 'crush' ? 'Écrasé !' : e.why === 'self' ? 'Auto-boum !' : 'Boum !';
        let res = null;
        if (GUEST) res = { over: !!e.over };         // en ligne : seul l'hôte compte les points (la bibliothèque les recopie)
        else { try { res = api.point ? api.point(e.winner, why) : null; } catch (er) { res = null; } }
        if (HOST) outEv.push(['r', e.winner, e.loser, e.why, res && res.over ? 1 : 0]);
        const A = vpos(e.winner);
        SFX.win();
        confetti(A.x, A.y - 0.4, 48, [PCOL[e.winner], '#ffd34d', '#ffffff', '#ff5fae']);
        ring(A.x, A.y, 0.3, 3.4, 0.75, PCOL[e.winner], 0.14);
        part(1, A.x, A.y - 0.3, 0, 0, 0.7, 1.6, 4.4, F.p[e.winner], 0);
        pop('+1', A.x, A.y - 0.25, e.winner, PCOL[e.winner], 1.9, 1.9);
        flashA = Math.max(flashA, 0.22); flashCol = PCOL[e.winner];
        phase = res && res.over ? 'over' : 'end';
        if (phase === 'over') { seq([523, 659, 784, 1047, 784, 1047, 1319], 0.11, 'square', 0.045); confetti(A.x, A.y, 60, ['#ffd34d', '#ffffff', PCOL[e.winner]]); }
      } else {
        SFX.draw();
        say('Égalité !', { color: '#e9f0f3', ms: 1300 });
        phase = 'end';
        if (HOST) outEv.push(['r', -1, -1, e.why || 'draw', 0]);
      }
    }
    function computeDanger() {
      danger.fill(0);
      const tmp = [];
      for (const b of S.bombs) {
        if (b.fuse > 1.1) continue;
        const k = clamp(1 - b.fuse / 1.1, 0.05, 1);
        tmp.length = 0;
        blastCells(S, b, tmp);
        for (const i of tmp) if (danger[i] < k) danger[i] = k;
      }
    }

    // ----------------------------------------------------------------- mise à jour
    function updFx(dt) {
      for (let i = PT.length - 1; i >= 0; i--) {
        const p = PT[i];
        p.life -= dt;
        if (p.life <= 0) { PT.splice(i, 1); continue; }
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
      for (let i = RG.length - 1; i >= 0; i--) { RG[i].life -= dt; if (RG[i].life <= 0) RG.splice(i, 1); }
      for (let i = TX.length - 1; i >= 0; i--) { TX[i].life -= dt; if (TX[i].life <= 0) TX.splice(i, 1); }
      if (shake > 0) shake = Math.max(0, shake - dt * (8 + shake * 3));
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.6);
      if (sdFlash > 0) sdFlash = Math.max(0, sdFlash - dt * 1.5);
      for (let p = 0; p < 2; p++) if (press[p] > 0) press[p] = Math.max(0, press[p] - dt * 4);
      const zt = slowT > 0.4 || hitStop > 0 ? zoomTo : 1;
      zoom += (zt - zoom) * Math.min(1, dt * (zt > zoom ? 9 : 3.5));
      if (zt === 1 && Math.abs(zoom - 1) < 0.003) zoom = 1;
      if (iris) { iris.t += dt; if (iris.open && iris.t >= iris.dur) iris = null; }
    }
    function update(dt) {
      clock += dt; vt += dt;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].at <= clock) { const n = later[i]; later.splice(i, 1); tone(n.f, n.d, n.ty, n.v); }
      if ((!headOk[0] && imgOk(PL[0].img)) || (!headOk[1] && imgOk(PL[1].img))) buildHeads();
      updFx(dt);
      updMotes(dt);
      updDecals(dt);
      if (NETAPI) {                                // en ligne : messages reçus (dans l'ordre), puis attente de l'autre téléphone
        if (HOST) hostNet(); else guestNet();
        if (phase === 'wait') { waitT += dt; if (HOST && waitT > 3) startRound(false); return; }
        if (GUEST) guestSync(nnow());
      }
      padPoll(resumeT <= 0);
      if (resumeT > 0) {
        const b0 = Math.ceil(resumeT / 0.5);
        resumeT -= dt;
        if (resumeT <= 0) { resumeT = 0; SFX.count(true); }
        else if (Math.ceil(resumeT / 0.5) !== b0) SFX.count(false);
        return;
      }
      phaseT += dt;
      if (phase === 'intro') {
        if (phaseT >= 0.12 && phaseT - dt < 0.12) SFX.appear();
        for (let p = 0; p < 2; p++) {
          const tl = 0.88 + p * 0.12;
          if (phaseT >= tl && phaseT - dt < tl) {
            const A = S.actors[p];
            puffs(A.x, A.y + 0.25, 4, 1.5, 0.6, 0.35, 1.0, 0.5);
            ring(A.x, A.y + 0.2, 0.2, 1.2, 0.35, PCOL[p], 0.1);
            SFX.land(); shake = Math.max(shake, 2.5);
          }
        }
        const tt = phaseT - (introDur - 2.0);
        if (tt >= 0) { const i = Math.min(3, Math.floor(tt / 0.6)); if (i !== countSaid) { countSaid = i; SFX.count(i === 3); } }
        if (phaseT >= introDur) { phase = 'play'; phaseT = 0; inputs[0].bomb = false; inputs[1].bomb = false; }
        return;
      }
      let d = dt;
      if (hitStop > 0) { hitStop -= dt; d = 0; }
      else if (slowT > 0) { slowT -= dt; d = dt * (slowT > 0.35 ? 0.3 : lerp(1, 0.3, Math.max(0, slowT) / 0.35)); }
      if (HOST) netQ = dt > 0 ? d / dt : 1;
      if (d > 0) {
        setInputs();
        if (AIP && aiS && phase === 'play') {      // contre l'IA : elle « tient sa manette » comme un joueur
          const o = aiTick(aiS, S, AIP.p, d), inp = inputs[AIP.p];
          inp.mx = o.mx; inp.my = o.my;
          if (o.bomb) { inp.bomb = true; press[AIP.p] = 1; }
        }
        if (GUEST) guestAdvance(d);                // invité : mon personnage tout de suite, le reste en prédiction
        else {
          const n = Math.max(1, Math.ceil(d / 0.0085));
          for (let i = 0; i < n; i++) { step(S, d / n, HOST ? hostIn : inputs); inputs[0].bomb = false; inputs[1].bomb = false; }
        }
        for (const b of S.bombs) if (Math.random() < d * 18) { const tp = fuseTip(b); part(1, tp[0], tp[1], (Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.8, 0.28, 0.17, 0.02, F.hot, 1.5); }
        for (const A0 of S.actors) {
          const A = vpos(A0.p);
          if (!A0.alive || !A.moving || Math.random() > d * (5 + A0.speedLvl * 6)) continue;
          const q = part(1, A.x - DX[A.dir] * 0.25 + (Math.random() - 0.5) * 0.2, A.y + 0.3 - DY[A.dir] * 0.25, -DX[A.dir] * 0.5, -DY[A.dir] * 0.5, 0.45, 0.16, 0.5, F.dust, 1.5);
          q.a0 = 0.35;
        }
      }
      handleEvents();
      if (phase === 'play') {
        computeDanger();
        if (!S.sd.on) {
          const rem = S.P.sdStart - S.t;
          if (rem <= 5 && rem > 0) { const s = Math.ceil(rem); if (s !== lastTick) { lastTick = s; SFX.tick(); } }
        }
      } else if (danger) danger.fill(0);
      if (phase === 'end') {
        endT += dt;
        const tEnd = lastRes && lastRes.winner < 0 ? 2.1 : 2.5;
        if ((!iris || iris.open) && endT >= tEnd - 0.45) {
          const fA = lastRes && lastRes.winner >= 0 ? vpos(lastRes.winner) : null;
          iris = { t: 0, dur: 0.45, open: false, x: fA ? fA.x : (S.cols - 1) / 2, y: fA ? fA.y : (S.rows - 1) / 2 };
        }
        if (endT >= tEnd && !GUEST) startRound(!!(lastRes && lastRes.winner < 0));   // l'invité attend la manche de l'hôte
      } else if (phase === 'over') endT += dt;
      if (NETAPI) updView(dt);
    }

    // ----------------------------------------------------------------- boucle et cycle de vie
    let last = 0, pFrames = 0, perfSum = 0, perfN = 0, prevReal = 0;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      if (NETAPI) frameClock(now);
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) {
        prevReal = 0;
        if (HOST) { try { hostTick(dt); } catch (e) { /* rien */ } }
        if ((pFrames++ % 6) === 0) { try { render(); } catch (e) { /* rien */ } }
        return;
      }
      update(dt);
      if (NETAPI) { try { if (HOST) hostTick(dt); else guestTick(dt); } catch (e) { /* le réseau ne casse jamais la boucle */ } }
      try { render(); } catch (e) { /* ne jamais casser la boucle */ }
      // qualité adaptative : si l'appareil n'arrive pas à suivre (< ~48 i/s), on baisse la résolution du canvas
      const rn = performance.now();
      if (prevReal && phase === 'play') {
        const iv = rn - prevReal;
        if (iv < 250) { perfSum += iv; perfN++; }
        if (perfN >= 150) {
          if (perfSum / perfN > 21 && quality > 0.6) { quality = Math.max(0.55, quality - 0.2); layout(); }
          perfSum = 0; perfN = 0;
        }
      }
      prevReal = rn;
    }
    function pause() {
      if (destroyed || paused) return;
      paused = true;
      keys.clear();
      try { render(); } catch (e) { /* rien */ }
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false;
      last = 0;
      padPoll(false);                              // (le A qui a fermé la carte de pause ne pose pas de bombe)
      if (phase !== 'over') { resumeT = 1.5; SFX.count(false); }
    }

    on(canvas, 'pointerdown', onDown, { passive: false });
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'lostpointercapture', onUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(window, 'blur', onBlur);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => { if (!destroyed && S) { layout(); try { render(); } catch (e) { /* rien */ } } });
      ro.observe(root);
    } else on(window, 'resize', () => { if (!destroyed && S) layout(); });

    if (NETAPI) {
      try {
        NETAPI.onMessage((m) => {
          if (destroyed || !m || typeof m !== 'object') return;
          const now = nnow();
          if (GUEST && m.k === 's') { if (m.r === netR) onState(m, now); return; }   // état rapide : lu tout de suite
          m.at = now;
          if (inbox.length < 800) inbox.push(m);
        });
      } catch (e) { /* rien */ }
      placeholder();                               // on attend l'autre téléphone (l'hôte démarre à son « bonjour », 3 s au plus)
    } else startRound(false);
    raf = requestAnimationFrame(frame);
    // police Bungee chargée après coup : on repeint les têtes de secours (initiale)
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed && SPR) buildHeads(); }); } catch (e) { /* rien */ }

    return {
      pause,
      resume,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, ty, fn, o] of listeners) t.removeEventListener(ty, fn, o);
        listeners.length = 0;
        later.length = 0; PT.length = 0; RG.length = 0; TX.length = 0;
        ptrs.clear(); keys.clear();
        inbox.length = 0; outEv.length = 0;
        root.innerHTML = '';
      },
      // état lisible pour les tests automatiques
      snapshot() {
        if (!S) return null;
        return {
          phase, round: S.round, t: S.t, sd: S.sd.on, bombs: S.bombs.length, result: S.result, cols: S.cols, rows: S.rows,
          actors: S.actors.map((a) => ({ x: a.x, y: a.y, alive: a.alive, bombsMax: a.bombsMax, range: a.range, speed: a.speedLvl, push: a.push, shield: a.shield })),
          crates: S.cells.reduce((n, c) => n + (c === CRATE ? 1 : 0), 0), items: S.items.reduce((n, c) => n + (c >= 0 ? 1 : 0), 0),
          grid: Array.from(S.cells).join(''),
          itemList: Array.from(S.items).map((it, i) => [i, it]).filter((q) => q[1] >= 0),
          bombList: S.bombs.map((b) => [b.x, b.y, b.fuse, b.range, b.owner, b.slide]),
          flames: Array.from(S.flameT).map((f, i) => [i, f]).filter((q) => q[1] > 0).map((q) => q[0]),
          falling: S.sd.falling.map((f) => f.i),
          net: NETAPI ? {
            role: HOST ? 'host' : 'guest', me: ME, r: netR, seed: S.seed, view: view.map((v) => v && [v.x, v.y, v.moving]), D: ip.D, lat: ip.lat,
            tErr, frozen: frozen >= 0, pred: pred.size, pend: pendPick.size, seen: gSeenT, loot: Array.from(S.loot).join(','), st: Object.assign({}, NST),
            ui: ctl ? { sx: ctl.sx, sy: ctl.sy, bx: ctl.bx, by: ctl.by, R: ctl.R, RB: ctl.RB, W, H } : null
          } : undefined,
          ai: AIP ? { level: AIP.level, p: AIP.p, goal: aiS ? aiS.goal : -1, act: aiS ? aiS.act : '', st: aiS ? Object.assign({}, aiS.st) : null } : undefined
        };
      },
      // sonde légère pour les tests (une lecture par image) : positions affichées et positions de la simulation
      probe() {
        if (!S) return null;
        return { t: S.t, ph: phase, r: netR, v: [0, 1].map((p) => { const v = vpos(p); return [v.x, v.y]; }), a: S.actors.map((a) => [a.x, a.y, a.alive ? 1 : 0, a.moving ? 1 : 0]) };
      }
    };
  }

  // ===========================================================================
  // 6. Le jeu en mode COOP (api.coop, COOP-CONTRACT.md) : « Boum 2 contre 2 » — moi + mon coéquipier (robot ou copain en ligne)
  // contre BIP et BOP. Un écran par appareil, tout à l'endroit : bande du haut (équipe, cœurs, score · robots, niveau, ⏸), arène,
  // bande du bas (ma manette, BOMBE, mes pouvoirs). En ligne : l'hôte (place 0) fait tourner la simulation et BIP / BOP, l'invité
  // (place 1) bouge sans attendre sur un miroir de la manche et décide lui-même des coups qu'il reçoit (permis par le contrat) ;
  // messages propres au coop ('H' 'R' 'S' 'E' 'p' 'B' 'P' 'X'), ceux du duel ne changent pas.
  // ===========================================================================
  function mountCoop(root, api) {
    const CO = api.coop || {};
    const NETC = CO.net && typeof CO.net.send === 'function' && typeof CO.net.onMessage === 'function' ? CO.net : null;
    const GUEST = !!NETC && (NETC.role === 'guest' || NETC.me === 1), HOST = !GUEST, ONLINE = !!NETC;
    const ME = GUEST ? 1 : 0, MATE = 1 - ME;
    const LEVEL = COOP_LV.indexOf(CO.level) >= 0 ? CO.level : 'moyen';
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const AU = api.audio || {};
    const F = fx();
    const PL = [0, 1].map((i) => (CO.players && CO.players[i]) || { name: i ? 'ROBOT' : 'MOI', img: null, sad: null });
    const NAMES = [PL[0].name, PL[1].name, 'BIP', 'BOP'].map((n, i) => String(n || (i ? 'ROBOT' : 'MOI')).toUpperCase().slice(0, 12));
    let destroyed = false, paused = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ----------------------------------------------------------------- état
    let M = coopNew(LEVEL), S = null, phase = 'wait', phaseT = 0, introDur = 3.4, waitT = 0, resumeT = 0, overDone = false;
    let endInfo = null, foeUpShow = false, clock = 0, vt = 0, shake = 0, flashA = 0, flashCol = '#ffffff', lastTick = -1, countSaid = -1;
    let sched = null;
    const ais = [null, null, null, null];
    const inputs = [0, 1, 2, 3].map(() => ({ mx: 0, my: 0, bomb: false }));
    const view = [null, null, null, null];
    let danger = null;
    const titles = [];
    const press = { t: 0 };

    // ----------------------------------------------------------------- sons (sobres ; la bibliothèque joue la musique)
    const later = [], lastSnd = {};
    function audioOK() { try { const u = navigator.userActivation; return !u || u.hasBeenActive; } catch (e) { return true; } }
    function tone(f, d, ty, v, fe) { if (destroyed || paused || !audioOK()) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused || !audioOK()) return; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function seq(notes, st, ty, v) { notes.forEach((f, i) => { if (later.length < 40) later.push({ at: clock + i * st, f, d: st * 1.5, ty, v }); }); }
    function canPlay(ch, gap) { if ((lastSnd[ch] == null ? -9 : lastSnd[ch]) + gap > clock) return false; lastSnd[ch] = clock; return true; }
    const SFX = {
      drop() { if (canPlay('drop', 0.04)) { tone(190, 0.1, 'triangle', 0.08, 110); tone(620, 0.04, 'square', 0.02, 380); } },
      boom(big) { if (!canPlay('boom', 0.07)) return; noise(0.6 + big * 0.15, 0.22, 650); tone(150, 0.42, 'sawtooth', 0.05, 36); tone(68, 0.55, 'sine', 0.1, 28); },
      crate() { if (canPlay('crate', 0.05)) { noise(0.16, 0.07, 2800); tone(300, 0.06, 'square', 0.022, 150); } },
      item() { if (canPlay('item', 0.08)) tone(990, 0.12, 'sine', 0.03, 1480); },
      pick() { if (canPlay('pick', 0.05)) seq([660, 880, 1320], 0.055, 'triangle', 0.05); },
      push() { tone(280, 0.09, 'square', 0.035, 560); },
      shield() { tone(1100, 0.28, 'sine', 0.06, 240); noise(0.12, 0.05, 4500); },
      bubble() { tone(520, 0.35, 'sine', 0.06, 1040); tone(260, 0.3, 'triangle', 0.04, 520); },
      save() { seq([784, 988, 1175, 1568], 0.07, 'triangle', 0.05); },
      pop() { noise(0.25, 0.12, 2400); tone(900, 0.2, 'sine', 0.05, 200); },
      ko() { tone(640, 0.8, 'sawtooth', 0.05, 60); noise(0.55, 0.12, 760); tone(90, 0.5, 'sine', 0.1, 40); },
      win() { seq([523, 659, 784, 1047, 1319], 0.085, 'square', 0.04); },
      lose() { seq([466, 415, 370, 330], 0.13, 'triangle', 0.05); },
      sd() { seq([880, 622, 880, 622, 880, 622], 0.13, 'square', 0.035); },
      land() { if (canPlay('land', 0.05)) { noise(0.14, 0.11, 380); tone(85, 0.16, 'square', 0.045, 45); } },
      tick() { tone(1046, 0.05, 'square', 0.025); },
      count(go) { if (go) { tone(1175, 0.32, 'square', 0.05, 1568); tone(587, 0.32, 'triangle', 0.04); } else tone(587, 0.12, 'square', 0.045); },
      appear() { if (canPlay('appear', 0.1)) tone(330, 0.18, 'triangle', 0.05, 880); }
    };
    let lastVib = -9;
    function vib(ms) { if (clock - lastVib < 0.12) return; lastVib = clock; try { if (api.vibrate) api.vibrate(ms); } catch (e) { /* rien */ } }

    // ----------------------------------------------------------------- mise en page (depuis la taille de root) et sprites
    let W = 360, H = 640, dpr = 1, T = 30, ox = 0, oy = 0, aw = 0, ah = 0, fr = 10, ctl = null, SPR = null, bgCv = null, layoutKey = '', quality = 1;
    const FRm = 0.34;
    function headSpr(p, sad, hpx) {
      if (p >= 2) return { cv: mkSpr(1, hpx, (c) => paintRobotHead(c, p, sad)).cv, k: 1.08 };
      const pl = PL[p] || {};
      const img = sad ? (imgOk(pl.sad) ? pl.sad : imgOk(pl.img) ? pl.img : null) : (imgOk(pl.img) ? pl.img : null);
      if (img) {
        try {
          const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
          const h = hpx, w = Math.max(1, Math.round(h * iw / ih)), pad = Math.max(2, Math.round(h * 0.075)), W2 = w + pad * 2, H2 = h + pad * 2;
          const cv = mkCanvas(W2, H2), c = cv.getContext('2d');
          const ring = (r, col) => {
            const tmp = mkCanvas(W2, H2), g = tmp.getContext('2d');
            for (let k = 0; k < 16; k++) { const a = k * TAU / 16; g.drawImage(img, pad + Math.cos(a) * r, pad + Math.sin(a) * r, w, h); }
            g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, W2, H2); c.drawImage(tmp, 0, 0);
          };
          ring(pad, 'rgba(2,4,8,0.9)'); ring(pad * 0.6, PCOL[p]); c.drawImage(img, pad, pad, w, h);
          return { cv, k: H2 / h };
        } catch (e) { /* tête de secours */ }
      }
      const ini = (NAMES[p].replace(/[^A-Z0-9À-ÖØ-Þ]/g, '').charAt(0)) || (p ? 'B' : 'A');
      return { cv: mkSpr(1, hpx, (c) => paintFallbackHead(c, p, ini, sad, FD)).cv, k: 1.05 };
    }
    const headOk = [false, false];
    function buildHeads() {
      const hpx = Math.min(240, Math.max(18, Math.round(Math.max(T * 1.45, 54) * dpr)));
      SPR.head = [0, 1, 2, 3].map((p) => headSpr(p, false, hpx));
      SPR.sad = [0, 1, 2, 3].map((p) => headSpr(p, true, hpx));
      headOk[0] = imgOk(PL[0].img); headOk[1] = imgOk(PL[1].img);
    }
    function buildSprites() {
      const px = Math.max(12, Math.round(T * dpr));
      const crate = (fn) => mkSpr(1.3, px, (c) => { c.globalAlpha = 0.9; c.drawImage(F.shade, -0.63, -0.6, 1.26, 1.26); c.globalAlpha = 1; fn(c); });
      SPR = {
        pillar: mkSpr(1, px, paintPillar), crate: [crate(paintRolls), crate((c) => paintBox(c, null)), crate(paintBasket)], fallen: mkSpr(1, px, paintFallen),
        bomb: [0, 1, 2, 3].map((p) => mkSpr(1, Math.round(px * 1.15), (c) => paintBombSide(c, PCOL[p]))),
        item: ITEMS.map((_, k) => mkSpr(1, px, (c) => paintItem(c, k))), mini: ITEMS.map((_, k) => mkSpr(1, Math.max(16, Math.round(26 * dpr)), (c) => paintItem(c, k))),
        body: [0, 1, 2, 3].map((p) => mkSpr(0.7, Math.round(px * 1.2), (c) => paintBody(c, p))),
        deb: [0, 1, 2, 3, 4, 5].map((k) => mkSpr(1, Math.max(8, Math.round(px * 0.32)), (c) => paintDebris(c, k))),
        btnBomb: mkSpr(1, Math.max(16, Math.round((ctl ? ctl.RB : 40) * 1.2 * dpr)), paintBombIcon)
      };
      buildHeads();
    }
    function layout() {
      if (destroyed || !S) return;
      const r = root.getBoundingClientRect();
      W = Math.max(200, Math.round(r.width || root.clientWidth || 360));
      H = Math.max(200, Math.round(r.height || root.clientHeight || 640));
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      const key = [W, H, dpr, S.cols, S.rows].join('|');
      if (key === layoutKey && bgCv) return;
      layoutKey = key;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const cols = S.cols, rows = S.rows;
      if (H >= W) {
        const topH = clamp(Math.round(H * 0.085), 56, 84), botH = clamp(Math.round(H * 0.16), 96, 150);
        T = Math.min((W - 8) / (cols + 2 * FRm), (H - topH - botH) / (rows + 2 * FRm));
        T = Math.max(12, Math.floor(T * dpr) / dpr);
        aw = cols * T; ah = rows * T; fr = Math.max(5, T * FRm);
        ox = Math.round((W - aw) / 2); oy = Math.round(topH + fr + 2 + Math.max(0, H - topH - botH - ah - 2 * fr - 4) * 0.25);   // l'espace en trop va surtout au pouce
        const y0 = oy + ah + fr, bandH = H - y0;
        const R = clamp(bandH * 0.36, 30, 58), RB = clamp(bandH * 0.36, 30, 56);
        const sx = Math.max(R + 12, W * 0.15), bx = W - Math.max(RB + 12, W * 0.15);
        ctl = { land: false, topH, y0, bandH, R, RB, sx, sy: y0 + bandH / 2, bx, by: y0 + bandH / 2, ix: sx + R + 12, iw: Math.max(60, bx - RB - 12 - (sx + R + 12)), iy: y0 + bandH / 2,
          pz: { x: W - 50, y: Math.round((topH - 44) / 2), w: 44, h: 44 } };
      } else {
        const side = Math.max(150, W * 0.19);
        T = Math.min((W - 2 * side) / (cols + 2 * FRm), (H - 12) / (rows + 2 * FRm));
        T = Math.max(12, Math.floor(T * dpr) / dpr);
        aw = cols * T; ah = rows * T; fr = Math.max(5, T * FRm);
        ox = Math.round((W - aw) / 2); oy = Math.round((H - ah) / 2);
        const mw = ox - fr;
        const R = clamp(Math.min(mw * 0.3, H * 0.17), 28, 60), RB = clamp(Math.min(mw * 0.3, H * 0.17), 28, 58);
        const cy = H - Math.max(R, RB) - 18;
        ctl = { land: true, mw, R, RB, sx: mw / 2, sy: cy, bx: W - mw / 2, by: cy, ix: 12, iw: mw - 24, iy: H * 0.5, pz: { x: W - 50, y: 6, w: 44, h: 44 } };
      }
      buildSprites();
      buildBg();
    }
    function buildBg() {
      const cv = mkCanvas(W * dpr, H * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.fillStyle = lin(c, 0, 0, 0, H, [0, '#140d18', 0.45, BG, 1, '#110e0a']); c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.24;
      c.drawImage(F.p[2], W * 0.25, -H * 0.22, W * 1.05, H * 0.5); c.drawImage(F.p[3], -W * 0.3, -H * 0.22, W * 1.05, H * 0.5);
      c.drawImage(F.p[0], -W * 0.3, H * 0.74, W * 1.05, H * 0.5); c.drawImage(F.p[1], W * 0.25, H * 0.74, W * 1.05, H * 0.5);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(255,255,255,0.03)';
      for (let y = 7, j = 0; y < H; y += 13, j++) for (let x = 7 + (j & 1) * 6.5; x < W; x += 13) c.fillRect(x, y, 1.3, 1.3);
      if (!ctl.land) {                                         // bandes : le haut (équipe, robots), le bas (ma manette)
        rrect(c, 6, 4, W - 12, ctl.topH - 8, 14);
        c.fillStyle = lin(c, 0, 4, 0, ctl.topH, [0, 'rgba(24,40,54,0.75)', 1, 'rgba(10,18,26,0.85)']); c.fill();
        c.strokeStyle = 'rgba(160,200,225,0.18)'; c.lineWidth = 1.2; c.stroke();
        const y0 = ctl.y0 + 6, h = H - y0 - 6;
        rrect(c, 6, y0, W - 12, h, 18);
        c.fillStyle = lin(c, 0, y0, 0, y0 + h, [0, 'rgba(24,40,54,0.7)', 1, 'rgba(10,18,26,0.85)']); c.fill();
        c.strokeStyle = hexA(PCOL[ME], 0.3); c.lineWidth = 1.5; c.stroke();
        c.fillStyle = lin(c, W * 0.2, 0, W * 0.8, 0, [0, hexA(PCOL[ME], 0), 0.5, hexA(PCOL[ME], 0.75), 1, hexA(PCOL[ME], 0)]); c.fillRect(W * 0.2, y0, W * 0.6, 2);
      } else {
        for (const side of [0, 1]) {
          const x0 = side ? W - ctl.mw + 6 : 6, w = ctl.mw - 12;
          rrect(c, x0, 8, w, H - 16, 16);
          c.fillStyle = lin(c, 0, 8, 0, H - 8, [0, 'rgba(24,40,54,0.6)', 1, 'rgba(10,18,26,0.85)']); c.fill();
          c.strokeStyle = hexA(side ? '#ff4d5e' : PCOL[ME], 0.22); c.lineWidth = 1.5; c.stroke();
        }
      }
      const Sx = S;
      paintArena(c, ox, oy, Sx.cols, Sx.rows, T, (x, y) => Sx.cells[y * Sx.cols + x] === PILLAR, false, SPR.pillar);
      paintCoopMarks(c, ox, oy, Sx.cols, Sx.rows, T);
      bgCv = cv;
    }

    // ----------------------------------------------------------------- particules (repère des cases)
    const PT = [], RG = [], TX = [];
    function part(k, x, y, vx, vy, life, s0, s1, img, drag) {
      if (PT.length >= 300) PT.splice(0, 24);
      const p = { k, x, y, vx, vy, life, max: life, s0, s1, img, rot: 0, vr: 0, drag: drag || 0, a0: 1, col: null };
      PT.push(p); return p;
    }
    function sparks(x, y, n, g, spd, life, size) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9); part(1, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.6), 0, g, 2.4); } }
    function puffs(x, y, n, spd, life, s0, s1, a0) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = spd * Math.random(); const p = part(0, x + Math.cos(a) * 0.15, y + Math.sin(a) * 0.15, Math.cos(a) * v, Math.sin(a) * v, life * (0.7 + Math.random() * 0.5), s0, s1, F.smokeL, 1.2); p.a0 = a0 == null ? 0.8 : a0; } }
    function debris(x, y, n, kinds, spd, dir) {
      for (let i = 0; i < n; i++) {
        let a = Math.random() * TAU;
        if (dir != null && Math.random() < 0.6) a = Math.atan2(DY[dir], DX[dir]) + (Math.random() - 0.5) * 1.6;
        const v = spd * (0.4 + Math.random() * 0.8);
        const p = part(2, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.5, 0.2 + Math.random() * 0.16, 0, SPR.deb[kinds[i % kinds.length]].cv, 2.6);
        p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * 18;
      }
    }
    function confetti(x, y, n, cols) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 1.5 + Math.random() * 4.5; const p = part(3, x, y, Math.cos(a) * v, Math.sin(a) * v, 1.2 + Math.random() * 1.2, 0.09 + Math.random() * 0.07, 0, null, 1.6); p.col = cols[i % cols.length]; p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * 16; } }
    function ring(x, y, r0, r1, life, col, w) { if (RG.length < 24) RG.push({ x, y, r0, r1, life, max: life, col, w }); }
    function pop(s, x, y, col, size, life) { if (TX.length >= 10) TX.shift(); TX.push({ s, x, y, col, size: size || 1, life: life || 1.2, max: life || 1.2 }); }
    function title(s, col, dur, sub) { titles.length = 0; titles.push({ s, col: col || '#ffd34d', t: dur || 1.6, max: dur || 1.6, sub: sub || '' }); }

    // ----------------------------------------------------------------- événements de la simulation → effets
    const flameDist = new Uint8Array(13 * 13);
    function handleEvents() {
      const ev = S.events;
      for (let k = 0; k < ev.length; k++) {
        const e = ev[k];
        if (HOST && ONLINE) netEv(e);
        switch (e.type) {
          case 'drop': SFX.drop(); ring(e.x, e.y, 0.2, 0.75, 0.25, PCOL[e.p], 0.08); puffs(e.x, e.y + 0.2, 2, 0.6, 0.5, 0.35, 0.8, 0.45); break;
          case 'boom': {
            SFX.boom(e.range >= 4 ? 1 : 0); vib(25);
            shake = Math.max(shake, 5 + e.range * 0.9); flashA = Math.max(flashA, 0.08); flashCol = '#ffe6b8';
            const fl = part(1, e.x, e.y, 0, 0, 0.14, 0.7, 2.6, F.gold, 0); fl.a0 = 0.9;
            part(1, e.x, e.y, 0, 0, 0.5, 1.2, 2.8, F.ball, 0);
            ring(e.x, e.y, 0.5, 1.4 + e.range * 0.6, 0.42, '#ffcf8a', 0.09); ring(e.x, e.y, 0.3, 1.0 + e.range * 0.4, 0.32, PCOL[e.owner], 0.07);
            sparks(e.x, e.y, 10 + e.range * 2, F.hot, 4.5 + e.range * 0.6, 0.75, 0.24); puffs(e.x, e.y, 4, 0.8, 1.6, 0.9, 2.4, 0.85);
            for (let d = 0; d < 4; d++) for (let r = 1; r <= e.reach[d]; r++) {
              const cx = e.x + DX[d] * r, cy = e.y + DY[d] * r, i = cy * S.cols + cx;
              if (i >= 0 && i < flameDist.length) flameDist[i] = r;
              part(1, cx, cy, DX[d] * 2, DY[d] * 2, 0.32 + Math.random() * 0.2, 0.75, 1.4, F.fire, 3);
              if (r === e.reach[d]) sparks(cx, cy, 3, F.hot, 3.2, 0.5, 0.2);
            }
            const i0 = e.y * S.cols + e.x; if (i0 >= 0 && i0 < flameDist.length) flameDist[i0] = 0;
            break;
          }
          case 'crate': SFX.crate(); debris(e.x, e.y, 9, e.kind === 0 ? [0, 0, 5] : e.kind === 1 ? [1, 1, 2] : [3, 3, 4], 4.6, e.d); puffs(e.x, e.y, 2, 0.8, 1.0, 0.7, 1.6, 0.6); break;
          case 'item': SFX.item(); ring(e.x, e.y, 0.1, 0.8, 0.35, ITEMS[e.it].col, 0.08); sparks(e.x, e.y, 6, F.it[e.it], 2, 0.5, 0.18); break;
          case 'burn': puffs(e.x, e.y, 3, 0.7, 0.9, 0.5, 1.3, 0.7); break;
          case 'pick': { SFX.pick(); const I = ITEMS[e.it]; ring(e.x, e.y, 0.2, 1.3, 0.4, I.col, 0.12); sparks(e.x, e.y, 12, F.it[e.it], 3.5, 0.6, 0.22); if (e.p === ME) rumble('tick'); if (e.p < 2) pop(I.label, e.x, e.y, I.col, 0.9, 1.2); break; }
          case 'push': SFX.push(); ring(e.x, e.y, 0.3, 0.8, 0.22, '#ff9ae4', 0.08); break;
          case 'shield': SFX.shield(); ring(e.x, e.y - 0.2, 0.5, 1.6, 0.45, '#bfe6ff', 0.14); sparks(e.x, e.y - 0.2, 14, F.blue, 3.5, 0.6, 0.24); break;
          case 'bulle':
            SFX.bubble(); if (e.p === ME) vib(120);
            ring(e.x, e.y, 0.3, 1.6, 0.5, PCOL[e.p], 0.12); sparks(e.x, e.y - 0.3, 16, F.p[e.p], 4, 0.7, 0.26);
            flashA = Math.max(flashA, e.p < 2 ? 0.22 : 0.12); flashCol = '#fff4dc'; shake = Math.max(shake, 9);
            if (e.why === 'self' && e.p < 2) pop('AUTO-BOUM !', e.x, e.y, PCOL[e.p], 1.1, 1.3);
            break;
          case 'sauve': {
            SFX.save(); vib(60);
            ring(e.x, e.y - 0.2, 0.4, 2.2, 0.6, '#ffffff', 0.14); sparks(e.x, e.y - 0.2, 22, F.blue, 4.5, 0.8, 0.28); confetti(e.x, e.y - 0.4, 20, [PCOL[e.p], PCOL[e.by], '#ffd34d', '#ffffff']);
            if (e.p < 2) title('SAUVÉ !', '#9fd4ff', 1.3);
            break;
          }
          case 'crevee': case 'ko': {
            if (e.type === 'crevee') SFX.pop(); else SFX.ko();
            if (e.p === ME) vib(170);
            shake = Math.max(shake, 12); flashA = Math.max(flashA, 0.3); flashCol = '#fff4dc';
            sparks(e.x, e.y - 0.3, 22, F.p[e.p], 5, 0.9, 0.3); puffs(e.x, e.y, 5, 1, 1.6, 0.6, 1.8, 0.8); ring(e.x, e.y, 0.3, 2.6, 0.6, '#ffffff', 0.16);
            break;
          }
          case 'libre': ring(S.actors[e.p].x, S.actors[e.p].y - 0.2, 0.4, 1.8, 0.5, PCOL[e.p], 0.12); break;
          case 'sd': SFX.sd(); flashA = Math.max(flashA, 0.18); flashCol = '#ff4d5e'; title('MORT SUBITE !', '#ff4d5e', 1.5); break;
          case 'land': SFX.land(); shake = Math.max(shake, 3.5); puffs(e.x, e.y, 3, 1.6, 0.7, 0.5, 1.2, 0.55); sparks(e.x, e.y, 4, F.dust, 2.5, 0.4, 0.2); break;
          case 'squash': puffs(e.x, e.y, 3, 1, 0.8, 0.5, 1.2, 0.7); break;
          case 'result': if (HOST) onResult(); break;
          default: break;
        }
      }
      ev.length = 0;
    }

    // ----------------------------------------------------------------- rendu
    const X = (x) => ox + (x + 0.5) * T, Y = (y) => oy + (y + 0.5) * T;
    function vpos(p) { return view[p] || S.actors[p]; }
    function computeDanger() {
      danger.fill(0);
      const tmp = [];
      for (const b of S.bombs) {
        if (b.fuse > 1.1 || (b.owner !== ME && !foeOf(S, b.owner, ME))) continue;   // seulement ce qui peut ME brûler
        const k = clamp(1 - b.fuse / 1.1, 0.05, 1);
        tmp.length = 0; blastCells(S, b, tmp);
        for (const i of tmp) if (danger[i] < k) danger[i] = k;
      }
    }
    function drawBomb(b) {
      const x = X(b.x), y = Y(b.y), pr = clamp(1 - b.fuse / b.fuse0, 0, 1), s = T * 1.12 * (b.t < 0.22 ? backOut(b.t / 0.22) : 1);
      const phs = TAU * (1.4 * (b.fuse0 - b.fuse) + 2 * pr * pr * pr), q = 0.055 * Math.sin(phs), sw = 1 + 0.06 * pr * pr * pr;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.14 + 0.5 * pr * (0.6 + 0.4 * Math.sin(phs));
      ctx.drawImage(F.red, x - T * 1.05, y - T * 1.05, T * 2.1, T * 2.1);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.9; ctx.drawImage(F.shade, x - s * 0.44, y + s * 0.22, s * 0.88, s * 0.32); ctx.globalAlpha = 1;
      ctx.strokeStyle = hexA(PCOL[b.owner], 0.9); ctx.lineWidth = Math.max(1.2, T * 0.05); ell(ctx, x, y + s * 0.38, s * 0.31 * sw, s * 0.1); ctx.stroke();
      ctx.save(); ctx.translate(x, y + s * 0.38); ctx.scale(sw * (1 + q), sw * (1 - q)); ctx.translate(0, -s * 0.38);
      ctx.drawImage(SPR.bomb[b.owner].cv, -s / 2, -s / 2, s, s);
      if (Math.sin(phs) > 0.3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (Math.sin(phs) - 0.3) / 0.7 * (0.34 + 0.3 * pr); ctx.drawImage(pr > 0.7 ? F.w : F.red, -s * 0.36, -s * 0.31, s * 0.72, s * 0.72); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; const ss = T * (0.6 + 0.22 * Math.sin(vt * 47 + b.id)), fl = Math.max(0.15, 1 - pr);
      const ex = x + s * (0.22 + 0.13 * fl), ey = y - s * (0.31 + 0.15 * fl);
      ctx.drawImage(F.hot, ex - ss / 2, ey - ss / 2, ss, ss); ctx.drawImage(F.w, ex - ss * 0.2, ey - ss * 0.2, ss * 0.4, ss * 0.4);
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawFlames() {
      const N = S.N, cols = S.cols;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) { if (S.flameT[i] <= 0) continue; ctx.globalAlpha = 0.22 * S.flameT[i] / FLAME_DUR; ctx.drawImage(F.hot, X(i % cols) - T * 1.3, Y((i / cols) | 0) - T * 1.3, T * 2.6, T * 2.6); }
      for (let i = 0; i < N; i++) {
        const ft = S.flameT[i];
        if (ft <= 0) continue;
        const age = FLAME_DUR - ft, life = ft / FLAME_DUR, gr = clamp((age - (i < flameDist.length ? flameDist[i] : 0) * 0.022) / 0.07, 0, 1);
        if (gr <= 0) continue;
        const fade = life < 0.35 ? life / 0.35 : 1, m = S.flameM[i], x = X(i % cols), y = Y((i / cols) | 0);
        const th = T * (0.34 + 0.4 * fade) * gr * (0.86 + 0.14 * Math.sin(vt * 53 + i * 1.7)), fa = Math.min(1, fade * 1.4);
        ctx.translate(x, y);
        for (let d = 0; d < 4; d++) {
          if (!(m & BIT[d])) continue;
          const a = d * Math.PI / 2, len = T * 0.5 * gr + 0.6; ctx.rotate(a);
          ctx.globalAlpha = fa * 0.9; ctx.drawImage(F.strip, 128 - ((vt * 260 + i * 37 + d * 61) % 128), 0, 64, 64, 0, -th * 0.95, len, th * 1.9);
          ctx.globalAlpha = fa * 0.7; ctx.drawImage(F.band, 0, -th * 0.42, len, th * 0.84); ctx.rotate(-a);
        }
        ctx.translate(-x, -y);
        const nb = (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0) + (m & 8 ? 1 : 0);
        const cs = T * ((m & 16) ? 1.85 : (nb !== 2 || ((m & 5) && (m & 10))) ? 1.2 : 1.02) * (0.5 + 0.5 * fade) * gr;
        ctx.globalAlpha = fa * 0.85; ctx.drawImage(F.ball, x - cs / 2, y - cs / 2, cs, cs);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawArena() {
      const N = S.N, cols = S.cols;
      if (danger) {
        const pulse = 0.55 + 0.45 * Math.sin(vt * 14);
        for (let i = 0; i < N; i++) { const d = danger[i]; if (d <= 0.01) continue; ctx.fillStyle = 'rgba(255,58,70,' + (0.05 + 0.22 * d * pulse).toFixed(3) + ')'; rrect(ctx, ox + (i % cols) * T + T * 0.07, oy + ((i / cols) | 0) * T + T * 0.07, T * 0.86, T * 0.86, T * 0.16); ctx.fill(); }
      }
      for (const f of S.sd.falling) {
        const k = 1 - f.t / DROP_WARN, x = X(f.i % cols), y = Y((f.i / cols) | 0), s = T * (0.5 + 0.8 * k);
        ctx.globalAlpha = 0.25 + 0.6 * k; ctx.drawImage(F.shade, x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = 'rgba(255,77,94,' + (0.45 + 0.5 * Math.abs(Math.sin(vt * 12))).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, T * 0.07);
        rrect(ctx, x - T * 0.43, y - T * 0.43, T * 0.86, T * 0.86, T * 0.12); ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (let i = 0; i < N; i++) if (S.fallen[i]) { const x = ox + (i % cols) * T, y = oy + ((i / cols) | 0) * T; ctx.drawImage(F.shade, x - T * 0.2, y - T * 0.2, T * 1.4, T * 1.4); ctx.drawImage(SPR.fallen.cv, x, y, T, T); }
      for (let i = 0; i < N; i++) {
        const it = S.items[i];
        if (it < 0) continue;
        const x = X(i % cols), y = Y((i / cols) | 0) + Math.sin(vt * 3.6 + i) * T * 0.05, k = S.itemT[i] < 0.32 ? backOut(S.itemT[i] / 0.32) : 1;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42 + 0.16 * Math.sin(vt * 5 + i); ctx.drawImage(F.it[it], x - T * 0.9, y - T * 0.9, T * 1.8, T * 1.8);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.8; ctx.drawImage(F.shade, x - T * 0.42, y - T * 0.3, T * 0.84, T * 0.84); ctx.globalAlpha = 1;
        const s = T * 0.94 * k; ctx.drawImage(SPR.item[it].cv, x - s / 2, y - s / 2, s, s);
      }
      const intro = phase === 'intro' ? phaseT : 99, mxc = (cols - 1) / 2, myc = (S.rows - 1) / 2;
      for (let i = 0; i < N; i++) {
        const c = S.cells[i];
        if (c !== CRATE && c !== BREAKING) continue;
        const cx = i % cols, cy = (i / cols) | 0, x = X(cx), y = Y(cy);
        let s = T, a = 1, k = 0;
        if (intro < 2) { const q = (intro - 0.04 - Math.hypot(cx - mxc, cy - myc) * 0.05) / 0.3; if (q <= 0) continue; s = T * backOut(q); }
        if (c === BREAKING) { k = 1 - S.breakT[i] / BREAK_DUR; s *= 1 + 0.16 * k; a = 1 - k * k; }
        const rot = (hash(Math.min(i, N - 1 - i) * 1.37) - 0.5) * 0.1;
        ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(SPR.crate[S.kind[i]].cv, -s * 0.65, -s * 0.65, s * 1.3, s * 1.3);
        ctx.rotate(-rot); ctx.translate(-x, -y);
        if (k) { ctx.globalAlpha = a * Math.min(0.75, k * 1.2); ctx.fillStyle = '#140904'; rrect(ctx, x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.9, s * 0.12); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      for (const b of S.bombs) drawBomb(b);
      drawFlames();
    }
    function dotted(x0, y0, x1, y1, col) {
      ctx.save(); ctx.setLineDash([T * 0.18, T * 0.16]); ctx.lineDashOffset = -vt * T * 1.2;
      ctx.strokeStyle = hexA(col, 0.55 + 0.35 * Math.sin(vt * 9)); ctx.lineWidth = Math.max(2, T * 0.08); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
    }
    function rescuer(p) { const ai = ais[p]; return ai && ai.mode === 'sauve' && S.actors[p].alive; }
    function drawActors() {
      if (phase === 'wait') return;
      // repères de sauvetage : de moi vers la bulle de mon coéquipier ; du robot qui fonce vers ma bulle (« ! » au-dessus de lui)
      const me = S.actors[ME], mate = S.actors[MATE], vm = vpos(ME), vt2 = vpos(MATE);
      if (phase === 'play' && mate.state === 'bulle' && me.alive) dotted(X(vm.x), Y(vm.y), X(vt2.x), Y(vt2.y), PCOL[ME]);
      if (phase === 'play' && me.state === 'bulle' && rescuer(MATE)) dotted(X(vt2.x), Y(vt2.y), X(vm.x), Y(vm.y), PCOL[MATE]);
      const ord = [0, 1, 2, 3].sort((a, b) => vpos(a).y - vpos(b).y);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ord) { const a = S.actors[p], v = vpos(p); if (!a.alive || (phase === 'intro' && phaseT < 0.5 + p * 0.1)) continue; ctx.globalAlpha = 0.3; ctx.drawImage(F.p[p], X(v.x) - T * 1.15, Y(v.y) - T * 0.85, T * 2.3, T * 2.3); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const p of ord) {
        const a = S.actors[p], v = vpos(p), x = X(v.x), y = Y(v.y);
        let drop = null;
        if (phase === 'intro') { drop = clamp((phaseT - 0.5 - p * 0.1) / 0.38, 0, 1); if (drop <= 0) continue; }
        if (a.state === 'bulle') { drawBubble(ctx, x, y, T, { p, k: a.bub0 ? a.bubT / a.bub0 : 0, t: vt, head: SPR.sad[p] }); continue; }
        if (a.team === 0 && a.alive) drawTeamStar(ctx, x, y + T * 0.4, T);
        drawHero(ctx, x, y, T, { p, rot: false, body: SPR.body[p], head: SPR.head[p], sad: SPR.sad[p], t: vt + p * 1.3, walk: a.walk, moving: v.moving && phase === 'play',
          lean: v.moving ? DX[v.dir] : 0, dead: !a.alive, deadT: a.deadT, why: a.why, win: a.win && phase !== 'play', shield: a.shield, invul: a.invul,
          danger: a.alive && p === ME && phase === 'play' && danger && danger[cellAt(S, Math.round(v.x), Math.round(v.y))] > 0.15, drop, headH: HEADH });
        if (p < 2 && rescuer(p)) txtOut(ctx, '!', x + T * 0.42, y - T * 1.95 - Math.abs(Math.sin(vt * 8)) * T * 0.15, Math.round(clamp(T * 0.62, 14, 30)), PCOL[p], FD, 'center', 4);
      }
    }
    function drawMarkers() {                       // au début de la manche : « TOI » au-dessus de moi, les noms au-dessus des autres
      if (phase !== 'intro' || phaseT < 0.85) return;
      const a = clamp((phaseT - 0.85) / 0.25, 0, 1) * clamp((introDur + 0.3 - phaseT) / 0.3, 0, 1);
      for (let p = 0; p < 4; p++) {
        const v = vpos(p), b = Math.abs(Math.sin(vt * 5 + p)) * T * 0.16, x = X(v.x), yy = Y(v.y) - (HEADH + 0.32) * T - b;
        ctx.globalAlpha = a; ctx.fillStyle = PCOL[p]; ctx.strokeStyle = '#05080c'; ctx.lineWidth = 3;
        poly(ctx, [x - T * 0.2, yy - T * 0.18, x + T * 0.2, yy - T * 0.18, x, yy + T * 0.08]); ctx.stroke(); ctx.fill();
        const nm = p === ME ? 'TOI' : NAMES[p].length > 8 ? NAMES[p].slice(0, 8) : NAMES[p];
        txtOut(ctx, nm, x, yy - T * 0.48, Math.round(clamp(T * (p === ME ? 0.5 : 0.4), 11, 22)), PCOL[p], FD, 'center', 4);
        ctx.globalAlpha = 1;
      }
    }
    function drawParticles() {
      for (const p of PT) {
        if (p.k === 1) continue;
        const k = p.life / p.max, x = X(p.x), y = Y(p.y);
        if (p.k === 0) { const sz = (p.s1 + (p.s0 - p.s1) * k) * T; ctx.globalAlpha = k * p.a0; ctx.drawImage(p.img, x - sz / 2, y - sz / 2, sz, sz); }
        else if (p.k === 2) { ctx.globalAlpha = Math.min(1, k * 2.5); const sz = p.s0 * T; ctx.translate(x, y); ctx.rotate(p.rot); ctx.drawImage(p.img, -sz / 2, -sz / 2, sz, sz); ctx.rotate(-p.rot); ctx.translate(-x, -y); }
        else if (p.k === 3) { ctx.globalAlpha = Math.min(1, k * 3); const sz = p.s0 * T; ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 2.3) || 0.05, 1); ctx.fillStyle = p.col; ctx.fillRect(-sz, -sz * 0.55, sz * 2, sz * 1.1); ctx.restore(); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
      for (const p of PT) { if (p.k !== 1) continue; const k = p.life / p.max, sz = (p.s1 + (p.s0 - p.s1) * k) * T; ctx.globalAlpha = (k > 0.7 ? 1 : k / 0.7) * p.a0; ctx.drawImage(p.img, X(p.x) - sz / 2, Y(p.y) - sz / 2, sz, sz); }
      for (const g of RG) { const k = g.life / g.max, r = (g.r1 + (g.r0 - g.r1) * k) * T; ctx.globalAlpha = k; ctx.strokeStyle = g.col; ctx.lineWidth = Math.max(1, g.w * T * (0.35 + k)); circ(ctx, X(g.x), Y(g.y), r); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawPops() {
      for (const t of TX) {
        const k = t.life / t.max, age = t.max - t.life, sc = age < 0.16 ? backOut(age / 0.16) : 1, fs = clamp(T * 0.5, 12, 24) * t.size;
        const x = clamp(X(t.x), ox + fs * 1.8, ox + aw - fs * 1.8), y = clamp(Y(t.y) - (1.25 + (1 - k) * 0.8) * T, oy + fs, oy + ah - fs);
        ctx.globalAlpha = Math.min(1, k * 3); ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        txtOut(ctx, t.s, 0, 0, Math.round(fs), t.col, FD, 'center', Math.max(3, T * 0.13)); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // ---- bandes : carte de l'équipe (têtes, cœurs, score), robots (têtes, niveau), bouton pause, ma manette et BOMBE
    function headAt(p, cx, cy, h, shakeIt) {
      const a = S.actors[p], hs = a.alive ? SPR.head[p] : SPR.sad[p], H2 = h * (hs.k || 1), W2 = H2 * hs.cv.width / hs.cv.height;
      const dx = shakeIt ? Math.sin(vt * 40) * 2 : 0;
      if (a.state === 'bulle') { ctx.strokeStyle = PCOL[p]; ctx.lineWidth = 2; circ(ctx, cx, cy, h * 0.58); ctx.stroke(); }
      ctx.globalAlpha = a.state === 'ko' ? 0.55 : 1; ctx.drawImage(hs.cv, cx - W2 / 2 + dx, cy - H2 / 2, W2, H2); ctx.globalAlpha = 1;
      if (a.state === 'bulle') { const n = Math.max(0, Math.ceil(a.bubT)); txtOut(ctx, 'SOS ' + n, cx, cy + h * 0.62, Math.round(clamp(h * 0.3, 9, 13)), n <= 2 ? '#ff4d5e' : '#ffffff', FD, 'center', 3); }
    }
    const LVTAG = { facile: ['FACILE', '#4cc36a'], moyen: ['MOYEN', '#ffd34d'], difficile: ['DIFFICILE', '#ff7a3c'], extreme: ['EXTRÊME', '#ff4d5e'] };
    function drawTop() {
      const fmt = (n) => String(Math.max(0, n | 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const lv = LVTAG[COOP_LV[coopFoeLevel(M)]] || LVTAG.moyen;
      let x0, y0, h, rx, ry, rh;
      if (!ctl.land) { h = Math.min(40, ctl.topH * 0.68); y0 = ctl.topH / 2; x0 = 14; rh = h * 0.85; ry = y0; rx = ctl.pz.x - 10; }
      else { h = clamp(Math.min(ctl.mw * 0.2, H * 0.09), 28, 60); y0 = 12 + h * 0.62; x0 = 14; rh = h * 0.85; ry = 12 + h * 0.62; rx = ctl.pz.x - 8; }
      // notre équipe : moi d'abord
      for (const [k, p] of [[0, ME], [1, MATE]]) headAt(p, x0 + h * 0.48 + k * h * 0.98, y0, h, p === MATE && S.actors[p].state === 'bulle');
      const hx = x0 + h * 2.05;
      for (let k = 0; k < 3; k++) {
        const lost = k >= M.hearts, beat = !lost && M.hearts === 1 ? 1 + 0.12 * Math.abs(Math.sin(vt * 6)) : 1;
        txtOut(ctx, '♥', hx + 8 + k * clamp(h * 0.42, 17, 26), y0 - h * 0.22, Math.round(clamp(h * 0.4, 16, 24) * beat), lost ? 'rgba(255,255,255,0.16)' : '#ff4d6d', FB, 'center', 3);
      }
      txtOut(ctx, fmt(liveScore()), hx, y0 + h * 0.3, Math.round(clamp(h * 0.42, 12, 26)), '#ffd34d', FD, 'left', 3);
      // les robots et leur niveau
      for (const [k, p] of [[0, 2], [1, 3]]) headAt(p, rx - rh * 0.5 - k * rh * 0.98, ry, rh, false);
      txtOut(ctx, lv[0], rx - rh * 2.1, ry, Math.round(clamp(rh * 0.32, 10, 20)), lv[1], FD, 'right', 3);
      // bouton pause (≥ 44 px)
      const b = ctl.pz, pk = press.pz > 0 ? 0.92 : 1;
      rrect(ctx, b.x + b.w * (1 - pk) / 2, b.y + b.h * (1 - pk) / 2, b.w * pk, b.h * pk, 12); ctx.fillStyle = 'rgba(17,29,39,0.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(160,200,225,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#e9f0f3'; rrect(ctx, b.x + b.w * 0.34, b.y + b.h * 0.3, b.w * 0.11, b.h * 0.4, 2); ctx.fill(); rrect(ctx, b.x + b.w * 0.55, b.y + b.h * 0.3, b.w * 0.11, b.h * 0.4, 2); ctx.fill();
    }
    function drawStick(bx, by, kx, ky, act) {
      const R = ctl.R, col = PCOL[ME], hint = phase === 'intro' && !act ? 0.5 + 0.5 * Math.sin(vt * 6) : 0;
      ctx.globalAlpha = 0.85; ctx.drawImage(F.shade, bx - R * 1.35, by - R * 1.2, R * 2.7, R * 2.7); ctx.globalAlpha = 1;
      if (act || hint) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = act ? 0.32 : 0.28 * hint; ctx.drawImage(F.p[ME], bx - R * 1.7, by - R * 1.7, R * 3.4, R * 3.4); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      circ(ctx, bx, by, R); ctx.fillStyle = rad(ctx, bx, by, R * 0.1, bx, by, R, [0, 'rgba(40,62,80,0.82)', 0.72, 'rgba(18,30,41,0.9)', 1, 'rgba(8,14,20,0.96)']); ctx.fill();
      ctx.lineWidth = Math.max(2, R * 0.065); ctx.strokeStyle = hexA(col, act ? 0.95 : 0.62); ctx.stroke();
      const dx = kx - bx, dy = ky - by, dl = Math.hypot(dx, dy) || 1, dm = dl / R;
      for (let d = 0; d < 4; d++) {
        const ang = d * Math.PI / 2, cx = bx + Math.cos(ang) * R * 0.8, cy = by + Math.sin(ang) * R * 0.8;
        ctx.fillStyle = dm > 0.3 && (Math.cos(ang) * dx + Math.sin(ang) * dy) / dl > 0.7 ? '#ffffff' : hexA(col, 0.6);
        ctx.translate(cx, cy); ctx.rotate(ang); poly(ctx, [R * 0.11, 0, -R * 0.06, -R * 0.11, -R * 0.06, R * 0.11]); ctx.fill(); ctx.rotate(-ang); ctx.translate(-cx, -cy);
      }
      const kr = R * 0.48;
      circ(ctx, kx, ky, kr); ctx.fillStyle = '#03060a'; ctx.fill();
      circ(ctx, kx, ky, kr * 0.9); ctx.fillStyle = rad(ctx, kx - kr * 0.3, ky - kr * 0.36, kr * 0.05, kx, ky, kr, [0, PLIGHT[ME], 0.42, col, 1, PDARK[ME]]); ctx.fill();
      ell(ctx, kx - kr * 0.3, ky - kr * 0.4, kr * 0.3, kr * 0.15, -0.5); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
      if (phase === 'intro' && !act) txtOut(ctx, 'BOUGE', bx, by - R - 10, Math.round(clamp(R * 0.24, 10, 14)), col, FD, 'center', 3);
    }
    function drawBombBtn() {
      const A = S.actors[ME], R = ctl.RB, x = ctl.bx, y = ctl.by, pk = press.t, s = 1 - 0.1 * pk;
      const avail = A.alive ? A.bombsMax - A.active : 0, can = avail > 0 && A.alive && phase === 'play';
      ctx.globalAlpha = 0.85; ctx.drawImage(F.shade, x - R * 1.4, y - R * 1.22, R * 2.8, R * 2.8); ctx.globalAlpha = 1;
      if (pk > 0.02 || (phase === 'intro' && phaseT > 0.8)) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(pk * 0.7, phase === 'intro' ? 0.22 * (0.5 + 0.5 * Math.sin(vt * 6 + 1.5)) : 0); ctx.drawImage(F.red, x - R * 1.8, y - R * 1.8, R * 3.6, R * 3.6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      circ(ctx, x, y, R + 3.5); ctx.fillStyle = '#04070b'; ctx.fill();
      circ(ctx, x, y, R * s); ctx.fillStyle = rad(ctx, x - R * 0.3, y - R * 0.42, R * 0.05, x, y, R * s, [0, '#ffc2c8', 0.32, '#ff5a68', 0.8, '#c41f33', 1, '#6e0a16']); ctx.fill();
      const bs = R * 1.02 * s; ctx.drawImage(SPR.btnBomb.cv, x - bs / 2, y - bs / 2 - R * 0.13, bs, bs);
      txtOut(ctx, 'BOMBE', x, y + R * 0.52 * s, Math.round(clamp(R * 0.25, 10, 15)), '#ffffff', FD, 'center', 3);
      if (!can) { circ(ctx, x, y, R * s); ctx.fillStyle = 'rgba(4,8,12,0.42)'; ctx.fill(); }
      for (let i = 0, n = A.bombsMax; i < n; i++) { const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.3, px = x + Math.cos(ang) * (R + 10), py = y + Math.sin(ang) * (R + 10); circ(ctx, px, py, 4.6); ctx.fillStyle = '#04070b'; ctx.fill(); circ(ctx, px, py, 3.2); ctx.fillStyle = i < avail ? '#ffd34d' : 'rgba(255,255,255,0.16)'; ctx.fill(); }
    }
    function drawInfo() {                          // mon nom, mes pouvoirs, le temps avant la mort subite
      const A = S.actors[ME], land = ctl.land, x = land ? 14 : ctl.ix, w = land ? ctl.mw - 28 : ctl.iw;
      const y = land ? H * 0.4 : ctl.iy - 14, ns = Math.round(clamp(w / 9.5, 11, 16));
      txtOut(ctx, S.sd.on ? 'MORT SUBITE' : Math.max(0, Math.ceil(phase === 'intro' ? S.P.sdStart : S.P.sdStart - S.t)) + ' s', land ? x + w / 2 : x + w / 2, y,
        ns, S.sd.on ? (((vt * 3) | 0) % 2 ? '#ff4d5e' : '#ffb0b8') : (S.P.sdStart - S.t <= 10 && phase === 'play' ? '#ffd34d' : '#8aa0ae'), FD, 'center', 3);
      const chips = [[IT_BOMB, A.bombsMax], [IT_RANGE, A.range], [IT_SPEED, 1 + A.speedLvl]];
      if (A.push) chips.push([IT_PUSH, -1]);
      if (A.shield) chips.push([IT_SHIELD, -1]);
      if (A.saves === 0) chips.push([IT_BUOY, -1]);
      const cs = Math.round(clamp(w / 8, 16, 22));
      let tw = 0; for (const [, n] of chips) tw += cs + (n >= 0 ? cs * 0.62 : 0) + 6;
      let cx = x + Math.max(0, (w - tw) / 2), cy = y + ns * 1.6;
      for (const [it, n] of chips) {
        const cw = cs + (n >= 0 ? cs * 0.62 : 0) + 6;
        if (cx + cw > x + w + 4) { cx = x; cy += cs + 6; }
        ctx.drawImage(SPR.mini[it].cv, cx, cy - cs / 2, cs, cs);
        if (n >= 0) txtOut(ctx, String(n), cx + cs + 2, cy + 1, Math.round(cs * 0.62), '#e9f0f3', FD, 'left', 3);
        cx += cw;
      }
    }
    function drawHud() {
      drawTop();
      if (phase === 'wait') return;
      drawInfo();
      const st = stick;
      let bx = ctl.sx, by = ctl.sy, kx = bx, ky = by, act = false;
      if (st.id != null) { act = true; bx = st.bx; by = st.by; kx = st.kx; ky = st.ky; }
      else { const gv = padVec(), kv = gv || kbVec(); if (kv[0] || kv[1]) { const l = gv ? 1 : Math.hypot(kv[0], kv[1]); kx = bx + kv[0] / l * ctl.R * 0.6; ky = by + kv[1] / l * ctl.R * 0.6; } }
      drawBombBtn();
      drawStick(bx, by, kx, ky, act);
      if (padShow()) {                              // à la manette : les boutons sur les commandes de l'écran
        try { PAD.drawGlyph(ctx, 'a', ctl.bx + ctl.RB * 0.74, ctl.by - ctl.RB * 0.74, clamp(ctl.RB * 0.27, 9, 15), PME); PAD.drawGlyph(ctx, 'ls', bx - ctl.R * 0.74, by - ctl.R * 0.74, clamp(ctl.R * 0.27, 9, 15), PME); } catch (e) { /* rien */ }
      }
    }
    function drawOverlays() {
      if (phase === 'wait') {                       // en attendant le copain : trois points qui battent (pas de texte)
        for (let k = 0; k < 3; k++) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(vt * 4 - k * 0.7)); ctx.globalAlpha = a; circ(ctx, W / 2 + (k - 1) * 22, oy + ah / 2, 7); ctx.fillStyle = PCOL[k === 1 ? MATE : ME]; ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (S.sd.on && phase === 'play') {
        ctx.strokeStyle = 'rgba(255,77,94,' + clamp(0.3 + 0.3 * Math.sin(vt * 6), 0, 1).toFixed(2) + ')'; ctx.lineWidth = Math.max(2, fr * 0.45);
        rrect(ctx, ox - fr * 0.5, oy - fr * 0.5, aw + fr, ah + fr, fr * 0.6); ctx.stroke();
      }
      let cl = null, ck = 0;                        // décompte (reprise, début de manche)
      if (resumeT > 0) { const n = Math.ceil(resumeT / 0.5); cl = String(Math.min(3, n)); ck = 1 - (resumeT - (n - 1) * 0.5) / 0.5; }
      else if (phase === 'intro' || (phase === 'play' && phaseT < 0.55)) {
        const t0 = introDur - 2.0, tt = phase === 'intro' ? phaseT - t0 : 2.0 + phaseT;
        if (tt >= 0 && tt < 2.55) { const i = Math.min(3, Math.floor(tt / 0.6)); cl = ['3', '2', '1', 'GO !'][i]; ck = i < 3 ? (tt - i * 0.6) / 0.6 : (tt - 1.8) / 0.75; }
      }
      if (cl) {
        const size = Math.round(clamp(Math.min(W, H) * 0.2, 48, 110)), go = cl === 'GO !', k = clamp(ck, 0, 1);
        const sc = k < 0.22 ? backOut(k / 0.22) : 1 + (k - 0.22) * 0.12, a = k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1, cx = W / 2, cy = oy + ah * 0.62;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.6; ctx.drawImage(go ? F.gold : F.p[ME], cx - size * 1.6, cy - size * 1.6, size * 3.2, size * 3.2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        txtOut(ctx, cl, 0, 0, go ? Math.round(size * 0.72) : size, go ? '#ffd34d' : PLIGHT[ME], FD, 'center', Math.max(6, size * 0.12));
        ctx.restore(); ctx.globalAlpha = 1;
      }
      for (const t of titles) {                     // grands titres (manche, sauvé, manche gagnée…)
        const age = t.max - t.t, k = age < 0.18 ? backOut(age / 0.18) : 1, a = Math.min(1, t.t / 0.3);
        const fs = Math.round(clamp(W * 0.085, 22, 46));
        ctx.globalAlpha = a; ctx.save(); ctx.translate(W / 2, oy + ah * 0.42); ctx.scale(k, k);
        txtOut(ctx, t.s, 0, 0, fs, t.col, FD, 'center', Math.max(5, fs * 0.16));
        if (t.sub) txtOut(ctx, t.sub, 0, fs * 0.95, Math.round(fs * 0.55), '#ffffff', FD, 'center', Math.max(3, fs * 0.1));
        ctx.restore(); ctx.globalAlpha = 1;
      }
      if (flashA > 0.01) { ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
    let camSX = 0, camSY = 0;
    function render() {
      if (destroyed || !S || !bgCv) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(bgCv, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(ox - fr, oy - fr, aw + fr * 2, ah + fr * 2); ctx.clip();
      const sk = shake * T / 34;
      camSX = sk > 0.05 && !paused ? (Math.random() * 2 - 1) * sk : 0; camSY = sk > 0.05 && !paused ? (Math.random() * 2 - 1) * sk : 0;
      if (camSX || camSY) { ctx.translate(camSX, camSY); ctx.drawImage(bgCv, 0, 0, W, H); }
      drawArena(); drawActors(); drawParticles(); drawMarkers();
      ctx.restore();
      drawPops();
      drawHud();
      drawOverlays();
    }

    // ----------------------------------------------------------------- entrées : tout l'écran est à moi (gauche = manette, droite = BOMBE)
    const stick = { id: null, bx: 0, by: 0, kx: 0, ky: 0, vx: 0, vy: 0 };
    const ptrs = new Map(), keys = new Set();
    const KEYMAP = { arrowup: 3, arrowdown: 1, arrowleft: 2, arrowright: 0, z: 3, w: 3, s: 1, q: 2, a: 2, d: 0 };
    function kbVec() { let x = 0, y = 0; for (const k of keys) { const d = KEYMAP[k]; if (d != null) { x += DX[d]; y += DY[d]; } } return [clamp(x, -1, 1), clamp(y, -1, 1)]; }
    function pressBomb() { press.t = 1; if (phase === 'play' && !paused && resumeT <= 0) inputs[ME].bomb = true; }
    function askPause() { try { if (CO.pause) CO.pause(); } catch (e) { /* rien */ } }
    function localXY(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function updStick() { const R = ctl.R; let dx = stick.kx - stick.bx, dy = stick.ky - stick.by; const d = Math.hypot(dx, dy); if (d > R) { const k = (d - R) / d; stick.bx += dx * k; stick.by += dy * k; dx = stick.kx - stick.bx; dy = stick.ky - stick.by; } stick.vx = dx / R; stick.vy = dy / R; }
    function onDown(e) {
      if (destroyed) return;
      if (e.cancelable) e.preventDefault();
      if (paused || !ctl) return;
      const [x, y] = localXY(e), b = ctl.pz;
      if (x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) { press.pz = 0.15; askPause(); return; }
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
      if (x < W / 2) {
        const R = ctl.R;
        stick.id = e.pointerId; stick.bx = clamp(x, R + 4, W / 2 - 8); stick.by = clamp(y, R + 4, H - R - 4); stick.kx = x; stick.ky = y; updStick();
        ptrs.set(e.pointerId, 0);
      } else { ptrs.set(e.pointerId, 1); pressBomb(); }
    }
    function onMove(e) { if (ptrs.get(e.pointerId) !== 0 || stick.id !== e.pointerId) return; const [x, y] = localXY(e); stick.kx = x; stick.ky = y; updStick(); }
    function onUp(e) { const r = ptrs.get(e.pointerId); if (r == null) return; ptrs.delete(e.pointerId); if (r === 0 && stick.id === e.pointerId) { stick.id = null; stick.vx = 0; stick.vy = 0; } }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      const k = String(e.key || '').toLowerCase();
      if (k === 'p' || k === 'escape') { if (!e.repeat) askPause(); return; }
      if (k === ' ' || k === 'spacebar' || k === 'enter' || k === 'e') { e.preventDefault(); if (!e.repeat) pressBomb(); return; }
      if (KEYMAP[k] != null) { e.preventDefault(); keys.add(k); }
    }
    // manette (api.pad, CONTRACT.md « Ajout 10 ») : api.pad.get(api.coop.me) pilote MON joueur — stick / croix = marcher, A ou B = bombe
    const PAD = api.pad && typeof api.pad.get === 'function' ? api.pad : null, PME = CO.me === 0 || CO.me === 1 ? CO.me : ME;
    function padVec() {
      if (!PAD) return null;
      let g = null;
      try { g = PAD.get(PME); } catch (e) { g = null; }
      if (!g || !g.on || Math.hypot(g.mx || 0, g.my || 0) < 0.3) return null;
      return [g.mx, g.my];
    }
    function padPoll(live) {
      if (!PAD) return;
      let hit = false;
      try { hit = PAD.pressed('a', PME); hit = PAD.pressed('b', PME) || hit; } catch (e) { hit = false; }
      if (hit && live) pressBomb();
    }
    function padShow() { try { return !!PAD && PAD.active() && PAD.any(PME); } catch (e) { return false; } }
    function rumble(kind) { try { if (PAD && PAD.rumble) PAD.rumble(kind, PME); } catch (e) { /* rien */ } }
    function setMyInput() { const inp = inputs[ME], g = padVec(); if (stick.id != null) { inp.mx = stick.vx; inp.my = stick.vy; } else if (g) { inp.mx = g[0]; inp.my = g[1]; } else { const v = kbVec(); inp.mx = v[0]; inp.my = v[1]; } }

    // ----------------------------------------------------------------- manches et partie
    function seedOf(n) { return ((api.seed >>> 0) ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0; }
    function newSim(cfg) {
      S = newCoopRound(cfg);
      danger = new Float32Array(S.N); flameDist.fill(0);
      PT.length = 0; RG.length = 0; TX.length = 0; view.fill(null);
      inputs.forEach((q) => { q.mx = 0; q.my = 0; q.bomb = false; });
    }
    function startRound() {                         // hôte, ou partie avec le robot
      const r = root.getBoundingClientRect(), land = !ONLINE && (r.width || W) > (r.height || H) * 1.15;
      const cfg = coopRoundCfg(M, seedOf(M.played), land);
      newSim(cfg);
      sched = aiSchedNew(true);
      const shared = { tgt: {}, pin: -1, pinT: -9 };
      ais.fill(null);
      if (!ONLINE) ais[1] = aiSchedAdd(sched, aiNew2(LEVEL, (cfg.seed ^ 0x9e3779b9) >>> 0, { role: 'mate', me: 1, human: 0 }), 1);
      ais[2] = aiSchedAdd(sched, aiNew2(cfg.foe, (cfg.seed * 7 + 3) >>> 0, { role: 'foe', me: 2, shared }), 2);
      ais[3] = aiSchedAdd(sched, aiNew2(cfg.foe, (cfg.seed * 11 + 9) >>> 0, { role: 'foe', me: 3, shared }), 3);
      beginIntro();
      if (ONLINE) hostRoundStart(cfg);
    }
    function beginIntro() {
      phase = 'intro'; phaseT = 0; introDur = M.played === 0 ? 3.6 : 3.2; countSaid = -1; lastTick = -1; endInfo = null;
      layout();
      title('MANCHE ' + M.round, '#ffd34d', 1.6, foeUpShow ? 'LES ROBOTS APPRENNENT !' : '');
      foeUpShow = false;
    }
    function onResult() {                           // hôte / robot : la manche est jouée
      const R = S.result, out = coopRoundEnd(M, S);
      endInfo = Object.assign({ t: 0 }, out);
      phase = 'end'; phaseT = 0;
      showResult(R.winner, out);
      if (ONLINE) outEv.push(['r', R.winner, R.loser, R.why || '', coopMatchPack()]);
    }
    function showResult(w, out) {
      if (w === 0) {
        SFX.win(); const c = S.actors[ME]; confetti(c.x, c.y - 0.4, 48, [PCOL[0], PCOL[1], '#ffd34d', '#ffffff']);
        title('MANCHE GAGNÉE !', '#ffd34d', 2.4, out && out.pts ? '+' + String(out.pts).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
      } else if (w === 1) { SFX.lose(); title(out && out.over ? 'PARTIE TERMINÉE' : 'MANCHE PERDUE', '#e9f0f3', 2.4, out && !out.over ? '♥ −1' : ''); vib(120); }
      else { SFX.lose(); title('ÉGALITÉ !', '#e9f0f3', 2.2, 'ON REJOUE'); }
      if (out && out.foeUp) foeUpShow = true;
    }
    // score d'équipe EN DIRECT : la partie + ce que la manche en cours a déjà rapporté (caisses, robots KO, relèves ; sans le
    // bonus de victoire) — ligne 👑, « Quitter » et « Oups » ne perdent rien. Chez l'invité : celui de l'hôte (état rapide).
    let liveG = 0;
    function liveScore() {
      if (GUEST) return Math.max(M.score, liveG | 0);
      return M.score + (S && S.coop && !S.result && (phase === 'play' || phase === 'intro') ? coopScoreRound(M, S).pts : 0);
    }
    function coopMatchPack() { return [M.hearts, M.score, M.round, M.played, M.won, M.lost, M.draws, M.kos, M.saves, M.crates, endInfo ? endInfo.pts : 0, endInfo && endInfo.over ? 1 : 0, endInfo && endInfo.foeUp ? 1 : 0]; }
    function coopMatchApply(q) {
      if (!Array.isArray(q)) return;
      M.hearts = q[0] | 0; M.score = q[1] | 0; M.round = q[2] | 0; M.played = q[3] | 0; M.won = q[4] | 0; M.lost = q[5] | 0; M.draws = q[6] | 0; M.kos = q[7] | 0; M.saves = q[8] | 0; M.crates = q[9] | 0;
      return { pts: q[10] | 0, over: !!q[11], foeUp: !!q[12] };
    }

    // ----------------------------------------------------------------- en ligne
    const inbox = [], outEv = [];
    let netR = 0, stAcc = 0, stN = 0, posAcc = 0, waitHelloT = 0, helloAt = -9, gseq = 0, lastSt = null, tErr = 0, clkOff = null, fNow = 0;
    const remoteIn = { remote: true, x: 0, y: 0, dir: 3, moving: false };
    const ipL = [mkIp(1 / 30), mkIp(1 / 60), mkIp(1 / 30), mkIp(1 / 30)];
    let gLast = null;
    const gMap = new Map();
    function nnow() { try { const v = Number(NETC.now()); if (isFinite(v)) return v / 1000; } catch (e) { /* rien */ } return performance.now() / 1000; }
    function frameClock(ms) { const o = nnow() - ms / 1000; if (clkOff == null || Math.abs(o - clkOff) > 0.25) clkOff = o; else clkOff += (o - clkOff) * 0.02; fNow = ms / 1000 + clkOff; }
    function nsend(m, rel) { try { NETC.send(m, { reliable: !!rel }); } catch (e) { /* rien */ } }
    function roundMsg(withState) {
      const m = { k: 'R', r: netR, seed: S.seed, n: M.round, cols: S.cols, rows: S.rows, bub: S.actors.map((a) => a.bub0), foe: COOP_LV[coopFoeLevel(M)], c: Math.round(nnow() * 1000), ph: phase, pt: r3(phaseT), mt: coopMatchPack(), up: foeUpShow ? 1 : 0 };
      if (withState) m.z = encodeStateCoop(S);
      return m;
    }
    function hostRoundStart() {
      netR++; gLast = null; gMap.clear(); outEv.length = 0;
      S.actors[1].lagc = true;                      // l'invité décide lui-même des coups qu'il reçoit
      const B = S.actors[1]; remoteIn.x = B.x; remoteIn.y = B.y; remoteIn.dir = B.dir; remoteIn.moving = false;
      ipL.forEach((I) => { I.b.length = 0; I.D = -1; });
      nsend(roundMsg(false), true);
    }
    function netEv(e) {
      switch (e.type) {
        case 'drop': { const b = S.bombs.find((o) => o.id === e.id); outEv.push(['d', e.id, e.p, e.x, e.y, r3(b ? S.t + b.fuse : S.t), b ? b.range : 2, e.g || 0]); break; }
        case 'boom': outEv.push(['b', e.id, e.x, e.y, e.owner, e.range].concat(e.reach, e.ends)); break;
        case 'crate': outEv.push(['c', e.i, e.d]); break;
        case 'item': outEv.push(['i', e.i, e.it]); break;
        case 'burn': outEv.push(['u', e.i]); break;
        case 'pick': outEv.push(['k', e.p, e.i, e.it, powerVal(S.actors[e.p], e.it), S.actors[e.p].saves]); break;
        case 'push': outEv.push(['p', e.p, e.id, e.d, r3(e.x), r3(e.y)]); break;
        case 'stop': outEv.push(['s', e.id, r3(e.x), r3(e.y)]); break;
        case 'shield': outEv.push(['h', e.p]); break;
        case 'bulle': outEv.push(['v', e.p, e.why, e.by, r3(e.x), r3(e.y)]); break;
        case 'sauve': outEv.push(['V', e.p, e.by]); break;
        case 'crevee': outEv.push(['x', e.p, e.why]); break;
        case 'ko': outEv.push(['o', e.p, e.why, r3(e.x), r3(e.y)]); break;
        case 'libre': outEv.push(['L', e.p]); break;
        case 'sd': outEv.push(['z']); break;
        case 'land': outEv.push(['l', e.i]); break;
        default: break;                             // 'result' : par onResult (avec l'état de la partie)
      }
    }
    function flushEv() {
      if (!outEv.length) return;
      const head = { k: 'E', r: netR, t: r3(S.t) };
      let batch = [], size = 60;
      for (const ev of outEv) { const s = JSON.stringify(ev).length + 1; if (batch.length && size + s > 900) { nsend(Object.assign({ ev: batch }, head), true); batch = []; size = 60; } batch.push(ev); size += s; }
      nsend(Object.assign({ ev: batch }, head), true);
      outEv.length = 0;
    }
    function hostTick(dt) {
      flushEv();
      stAcc += dt;
      if (stAcc < (paused ? 0.2 : 1 / 30) - 0.004 || phase === 'wait') return;
      stAcc = 0;
      const a = [];
      for (const p of [0, 2, 3]) { const A = S.actors[p]; a.push(r3(A.x), r3(A.y), A.dir, A.moving && phase === 'play' ? 1 : 0); }
      const m = { k: 'S', r: netR, c: Math.round(fNow * 1000), t: r3(S.t), q: paused || resumeT > 0 ? 0 : 1, ph: phase, pt: r3(phaseT), a, sc: liveScore() };
      if (++stN % 6 === 0) m.w = S.actors.map((A) => [A.bombsMax, A.range, A.speedLvl, A.push ? 1 : 0, A.shield ? 1 : 0]);
      nsend(m, false);
    }
    function hostNet() {
      for (const m of inbox) {
        try {
          if (m.k === 'H') { if (phase === 'wait') startRound(); else nsend(roundMsg(phase !== 'intro'), true); continue; }
          if (m.r !== netR) continue;
          if (m.k === 'p') hostPos(m);
          else if (m.k === 'B') { const late = clamp(S.t - (isFinite(+m.t) ? +m.t : S.t), 0, 1), g = m.g | 0; if (phase === 'play' && !S.result && placeBombAt(S, S.actors[1], m.x | 0, m.y | 0, S.P.fuse - late, g)) gMap.set(g, S.bombs[S.bombs.length - 1].id); else outEv.push(['n', g]); }
          else if (m.k === 'P') { const id = m.id > 0 ? m.id : gMap.get(-m.id), b = S.bombs.find((o) => o.id === id), d = m.d & 3; if (b && phase === 'play' && !S.result && b.slide < 0 && bombCanEnter(S, Math.round(b.x) + DX[d], Math.round(b.y) + DY[d], b)) { b.slide = d; S.events.push({ type: 'push', p: 1, x: b.x, y: b.y, d, id: b.id }); } else if (b && b.slide < 0) outEv.push(['s', b.id, r3(b.x), r3(b.y)]); }
          else if (m.k === 'X') {
            const A = S.actors[1];
            if (!A.alive || S.result || phase !== 'play') continue;
            if (m.why === 'shield') { if (A.shield) { A.shield = false; A.invul = 1.3; S.events.push({ type: 'shield', p: 1, x: A.x, y: A.y }); } continue; }
            A.by = m.by | 0; A.invul = 0; A.shield = false;          // l'invité a décidé (bouclier et invincibilité déjà comptés chez lui)
            if (isFinite(+m.x)) { A.x = +m.x; A.y = +m.y; }
            hitActor(S, A, m.why === 'self' || m.why === 'crush' ? m.why : 'flame');
          }
        } catch (e) { /* message abîmé : ignoré */ }
      }
      inbox.length = 0;
    }
    function hostPos(m) {
      const x = +m.x, y = +m.y, t = +m.t, B = S.actors[1];
      if (!isFinite(x) || !isFinite(y) || !isFinite(t) || phase !== 'play' || !B.alive || S.result) return;
      if (gLast && t <= gLast.t) return;
      const inb = x >= -0.01 && y >= -0.01 && x <= S.cols - 0.99 && y <= S.rows - 0.99;
      const ci = cellAt(S, Math.round(x), Math.round(y));
      if (!inb || ci < 0 || S.cells[ci] === PILLAR || S.cells[ci] === CRATE) return;
      gLast = { x, y, t };
      remoteIn.x = x; remoteIn.y = y; remoteIn.dir = m.d & 3; remoteIn.moving = !!m.m;
      ipAdd(ipL[1], { c: m.c / 1000, x, y, d: m.d & 3, m: m.m ? 1 : 0 }, m.at);
    }
    // ---- invité : le miroir de la manche
    function guestRound(m, now) {
      netR = m.r | 0;
      coopMatchApply(m.mt); foeUpShow = !!m.up;
      newSim({ seed: m.seed >>> 0, round: Math.max(1, m.n | 0), bub: m.bub, cols: m.cols, rows: m.rows });
      gseq = 0; tErr = 0; lastSt = null;
      ipL.forEach((I) => { I.b.length = 0; I.D = -1; });
      beginIntro();
      phaseT = clamp((+m.pt || 0) + Math.max(0, now - (+m.c || 0) / 1000), 0, 600);
      if (m.ph !== 'intro' && m.z && applyStateCoop(S, m.z)) { phase = m.ph === 'end' || m.ph === 'over' ? 'end' : 'play'; titles.length = 0; }
    }
    function guestNet() {
      const now = nnow();
      for (const m of inbox) {
        try {
          if (m.k === 'R') { guestRound(m, now); continue; }
          if (m.r !== netR) { if (m.r > netR && now - helloAt > 0.5) { helloAt = now; nsend({ k: 'H' }, true); } continue; }
          if (m.k === 'E') { const age = Math.max(0, S.t - (+m.t || 0)); for (const e of m.ev || []) if (Array.isArray(e)) gEv(e, age); }
        } catch (e) { /* message abîmé : ignoré */ }
      }
      inbox.length = 0;
      if (phase === 'wait' && now - helloAt > 0.5) { helloAt = now; nsend({ k: 'H' }, true); }
    }
    function onState(m, now) {
      if (!Array.isArray(m.a) || !isFinite(m.c)) return;
      [0, 2, 3].forEach((p, k) => ipAdd(ipL[p], { c: m.c / 1000, x: +m.a[k * 4], y: +m.a[k * 4 + 1], d: m.a[k * 4 + 2] & 3, m: m.a[k * 4 + 3] ? 1 : 0 }, now));
      if (!lastSt || m.c > lastSt.c) { lastSt = m; if (isFinite(+m.sc)) liveG = +m.sc; }
      if (Array.isArray(m.w)) m.w.forEach((w, p) => { if (p === ME || !Array.isArray(w)) return; const A = S.actors[p]; A.bombsMax = w[0] | 0 || A.bombsMax; A.range = w[1] | 0 || A.range; A.speedLvl = w[2] | 0; A.push = !!w[3]; A.shield = !!w[4]; });
    }
    function guestSync(now) {
      const m = lastSt;
      if (!m || m.r !== netR) { tErr = 0; return; }
      const age = Math.max(0, now - m.c / 1000);
      tErr = phase === 'play' && m.ph === 'play' && !paused && resumeT <= 0 && age < 0.35 ? (+m.t + age * (+m.q || 0)) - S.t : 0;
      if (phase === 'intro' && m.ph === 'intro' && age < 0.35) { const est = +m.pt + age; if (Math.abs(est - phaseT) > 0.03) phaseT += (est - phaseT) * 0.25; }
      else if (phase === 'intro' && m.ph === 'play') { phase = 'play'; phaseT = 0; }
      [0, 2, 3].forEach((p, k) => { const o = S.actors[p]; if (o.alive) { o.x = +m.a[k * 4]; o.y = +m.a[k * 4 + 1]; o.dir = m.a[k * 4 + 2] & 3; o.moving = !!m.a[k * 4 + 3]; } });
    }
    function gEv(e, age) {
      const A = S.actors, cxy = (i) => [i % S.cols, (i / S.cols) | 0];
      switch (e[0]) {
        case 'd': {
          const id = e[1], ow = e[2] | 0, x = e[3] | 0, y = e[4] | 0, xt = +e[5], g = e[7] | 0;
          if (ow === ME && g) { const b0 = S.bombs.find((o) => o.g === g); if (b0) { b0.id = id; b0.fuse = Math.max(0, xt - S.t); break; } }
          if (S.bombs.some((o) => o.id === id)) break;
          const i = cellAt(S, x, y); if (i < 0) break;
          const b = { id, owner: ow, x, y, cell: i, fuse: Math.max(0, xt - S.t), fuse0: S.P.fuse, range: (e[6] | 0) || A[ow].range, slide: -1, pass: [false, false, false, false], t: 0 };
          for (const a of A) if (a.alive && Math.abs(a.x - x) < 0.98 && Math.abs(a.y - y) < 0.98) b.pass[a.p] = true;
          S.bombs.push(b); A[ow].active++;
          S.events.push({ type: 'drop', p: ow, x, y, id });
          break;
        }
        case 'n': { const k = S.bombs.findIndex((o) => o.g === (e[1] | 0) && o.owner === ME); if (k >= 0) { const b = S.bombs[k]; S.bombs.splice(k, 1); A[ME].active = Math.max(0, A[ME].active - 1); puffs(b.x, b.y, 4, 0.8, 0.6, 0.4, 1.0, 0.6); } break; }
        case 'b': {
          const id = e[1], x = e[2] | 0, y = e[3] | 0, ow = e[4] | 0, rg = e[5] | 0, reach = [e[6] | 0, e[7] | 0, e[8] | 0, e[9] | 0], ends = [e[10] | 0, e[11] | 0, e[12] | 0, e[13] | 0];
          const k = S.bombs.findIndex((o) => o.id === id);
          if (k >= 0) { S.bombs.splice(k, 1); A[ow].active = Math.max(0, A[ow].active - 1); }
          applyBoomCoop(S, x, y, ow, reach, ends, age);
          S.events.push({ type: 'boom', x, y, owner: ow, range: rg, reach, ends, id });
          break;
        }
        case 'c': { const i = e[1] | 0; if (i >= 0 && i < S.N && S.cells[i] === CRATE) { S.cells[i] = BREAKING; S.breakT[i] = Math.max(0.02, BREAK_DUR - age); const q = cxy(i); S.events.push({ type: 'crate', i, x: q[0], y: q[1], kind: S.kind[i], face: S.face[i], d: e[2] & 3 }); } break; }
        case 'i': { const i = e[1] | 0, it = e[2] | 0; if (i >= 0 && i < S.N && S.items[i] !== it && S.cells[i] !== PILLAR && S.cells[i] !== SOLID) { S.cells[i] = EMPTY; S.items[i] = it; S.itemT[i] = age; const q = cxy(i); S.events.push({ type: 'item', i, it, x: q[0], y: q[1] }); } break; }
        case 'u': { const i = e[1] | 0; if (i >= 0 && i < S.N && S.items[i] >= 0) { const it = S.items[i], q = cxy(i); S.items[i] = -1; S.events.push({ type: 'burn', i, x: q[0], y: q[1], it }); } break; }
        case 'k': { const p = e[1] | 0, i = e[2] | 0, it = e[3] | 0; if (it < 0 || it >= ITEMS.length || !A[p]) break; if (i >= 0 && i < S.N) S.items[i] = -1; setPower(A[p], it, e[4]); if (it === IT_BUOY) A[p].saves = e[5] | 0; A[p].picks++; const q = cxy(i); S.events.push({ type: 'pick', p, it, i, x: q[0], y: q[1] }); break; }
        case 'p': { const b = S.bombs.find((o) => o.id === e[2]); if (!b || b.slide === (e[3] & 3)) break; b.x = +e[4]; b.y = +e[5]; b.cell = cellAt(S, Math.round(b.x), Math.round(b.y)); b.slide = e[3] & 3; if (age > 0) slideBomb(S, b, Math.min(age, 0.5)); S.events.push({ type: 'push', p: e[1] | 0, x: b.x, y: b.y, d: b.slide, id: b.id }); break; }
        case 's': { const b = S.bombs.find((o) => o.id === e[1]); if (!b) break; b.slide = -1; b.x = +e[2]; b.y = +e[3]; b.cell = cellAt(S, Math.round(b.x), Math.round(b.y)); break; }
        case 'h': { const p = e[1] | 0, a = A[p]; if (!a) break; a.shield = false; a.invul = Math.max(a.invul, 1.3 - age); S.events.push({ type: 'shield', p, x: a.x, y: a.y }); break; }
        case 'v': { const p = e[1] | 0, a = A[p]; if (!a || !a.alive) break; if (isFinite(+e[4])) { a.x = +e[4]; a.y = +e[5]; } a.by = e[3] | 0; coopHit(S, a, e[2] || 'flame'); break; }
        case 'o': { const p = e[1] | 0, a = A[p]; if (!a) break; if (a.state === 'ko') break; if (a.alive && isFinite(+e[3])) { a.x = +e[3]; a.y = +e[4]; } a.alive = false; a.state = 'ko'; a.why = e[2] || 'flame'; a.deadT = age; a.moving = false; S.hitAt[p] = S.t; S.events.push({ type: 'ko', p, why: a.why, x: a.x, y: a.y }); break; }
        case 'V': { const p = e[1] | 0, a = A[p]; if (!a || a.state !== 'bulle') break; coopSave(S, a, e[2] | 0); break; }
        case 'x': { const p = e[1] | 0, a = A[p]; if (!a || a.state !== 'bulle') break; popBubble(S, a, e[2] || 'flame'); break; }
        case 'L': { const p = e[1] | 0, a = A[p]; if (!a || a.state !== 'bulle') break; a.state = 'ok'; a.alive = true; a.bubT = 0; a.why = ''; S.events.push({ type: 'libre', p }); break; }
        case 'z': if (!S.sd.on) { S.sd.on = true; S.sd.order = spiralOrder(S.cols, S.rows); S.sd.idx = 0; S.sd.timer = 0; S.events.push({ type: 'sd' }); } break;
        case 'l': { const i = e[1] | 0; if (i < 0 || i >= S.N || S.cells[i] === SOLID || S.cells[i] === PILLAR) break; const fall = S.sd.falling; for (let k = fall.length - 1; k >= 0; k--) if (fall[k].i === i) fall.splice(k, 1); landBlock(S, i, false); break; }
        case 'r': {
          if (S.result) break;
          const w = e[1] | 0;
          S.result = { winner: w, loser: e[2] | 0, why: e[3] || '', team: 1 }; S.resT = S.t;
          for (const a of A) { if (a.team === w && a.alive) a.win = true; }
          S.sd.falling.length = 0;
          const out = coopMatchApply(e[4]);
          endInfo = Object.assign({ t: 0 }, out || {});
          phase = 'end'; phaseT = 0;
          showResult(w, out);
          break;
        }
        default: break;
      }
    }
    function guestStep(dt, dm, inp) {               // le monde (calé sur l'hôte) et mon personnage (tout de suite)
      S.t += dt;
      const live = !S.result, fo = S.fown;
      for (let q = 0; q < fo.length; q++) if (fo[q] > 0) { fo[q] -= dt; if (fo[q] < 0) fo[q] = 0; }
      for (let i = 0; i < S.N; i++) {
        if (S.flameT[i] > 0) { S.flameT[i] -= dt; if (S.flameT[i] <= 0) { S.flameT[i] = 0; S.flameM[i] = 0; } }
        if (S.cells[i] === BREAKING) { S.breakT[i] -= dt; if (S.breakT[i] <= 0) { S.cells[i] = EMPTY; if (S.loot[i] >= 0 && S.items[i] < 0) { S.items[i] = S.loot[i]; S.itemT[i] = 0; S.events.push({ type: 'item', i, it: S.loot[i], x: i % S.cols, y: (i / S.cols) | 0 }); } } }
        if (S.items[i] >= 0) S.itemT[i] += dt;
      }
      for (const a of S.actors) {
        if (a.invul > 0) a.invul = Math.max(0, a.invul - dt);
        if (a.state === 'bulle') a.bubT = Math.max(0, a.bubT - dt);
        if (!a.alive) { a.deadT += dt; continue; }
        if (!live || a.p !== ME) continue;
        const ne = S.events.length;
        moveActor(S, a, inp.mx || 0, inp.my || 0, dm);
        for (let k = ne; k < S.events.length; k++) { const ev = S.events[k]; if (ev.type === 'push') nsend({ k: 'P', r: netR, id: ev.id, d: ev.d, t: r3(S.t) }, true); }
        if (inp.bomb && placeBomb(S, a)) {
          const b = S.bombs[S.bombs.length - 1];
          b.g = ++gseq; b.id = -b.g;
          for (let k = S.events.length - 1; k >= 0; k--) if (S.events[k].type === 'drop') { S.events[k].id = b.id; break; }
          nsend({ k: 'B', r: netR, g: b.g, x: b.x, y: b.y, t: r3(S.t) }, true);
        }
      }
      for (const b of S.bombs) { b.t += dt; if (b.slide >= 0) slideBomb(S, b, dt); if (live) b.fuse = Math.max(0, b.fuse - dt); }
      for (const b of S.bombs) for (const a of S.actors) if (b.pass[a.p] && !(Math.abs(a.x - b.x) < 0.98 && Math.abs(a.y - b.y) < 0.98)) b.pass[a.p] = false;
      if (live) {
        suddenDeath(S, dt);
        const me = S.actors[ME], ci = cellAt(S, Math.round(me.x), Math.round(me.y));
        if (me.alive && ci >= 0 && S.flameT[ci] > FLAME_SAFE) {          // les coups que je reçois : c'est moi qui décide (contrat)
          const sh = me.shield; coopBurn(S, me, ci);
          if (!me.alive) nsend({ k: 'X', r: netR, why: me.why, by: me.by, x: r3(me.x), y: r3(me.y), t: r3(S.t) }, true);
          else if (sh && !me.shield) nsend({ k: 'X', r: netR, why: 'shield', t: r3(S.t) }, true);   // mon bouclier a encaissé
        }
      }
      const fall = S.sd.falling;
      for (let k = fall.length - 1; k >= 0; k--) {
        const f = fall[k]; f.t -= dt;
        if (f.t <= 0) {
          fall.splice(k, 1); landBlock(S, f.i, false);
          const me = S.actors[ME];
          if (live && me.alive && cellAt(S, Math.round(me.x), Math.round(me.y)) === f.i) { me.by = -1; hitActor(S, me, 'crush'); nsend({ k: 'X', r: netR, why: 'crush', by: -1, x: r3(me.x), y: r3(me.y), t: r3(S.t) }, true); }
        }
      }
    }
    function guestAdvance(d) {
      let dw = d;
      if (phase === 'play') {
        if (tErr > 0.5) { const T2 = Math.min(tErr, 2), n2 = Math.ceil(T2 / 0.0085); for (let i = 0; i < n2; i++) guestStep(T2 / n2, 0, NOIN); tErr = 0; }
        else dw = d * (1 + clamp(tErr * 1.5, -0.4, 0.3));
      }
      const inp = inputs[ME], n = Math.max(1, Math.ceil(Math.max(d, dw) / 0.0085));
      for (let i = 0; i < n; i++) { guestStep(dw / n, d / n, inp); inp.bomb = false; }
    }
    function guestTick(dt) {
      if (phase !== 'play' || !netR) return;
      posAcc += dt;
      if (posAcc < 1 / 60 - 0.004) return;
      posAcc = 0;
      const A = S.actors[ME];
      if (!A.alive) return;
      nsend({ k: 'p', r: netR, c: Math.round(fNow * 1000), t: r3(S.t), x: r3(A.x), y: r3(A.y), d: A.dir, m: A.moving ? 1 : 0 }, false);
    }
    function updView(dt) {                         // les autres glissent (lecture des positions reçues avec un léger retard)
      for (const p of GUEST ? [0, 2, 3] : [1]) {
        const a = S.actors[p], I = ipL[p];
        if (!a.alive || phase === 'intro' || phase === 'wait' || !I.b.length) { view[p] = null; continue; }
        const tg = ipTarget(I);
        if (I.D < 0) I.D = tg; else if (Math.abs(tg - I.D) > 0.006) I.D += clamp(tg - I.D, -0.05 * dt, 0.05 * dt);
        const s = ipAt(I, fNow - I.D);
        if (!s) { view[p] = null; continue; }
        let v = view[p];
        if (!v) v = view[p] = { x: s.x, y: s.y, dir: s.d, moving: false, walk: a.walk };
        let nx = s.x, ny = s.y;
        const gap = Math.abs(nx - v.x) + Math.abs(ny - v.y), vmax = (BASE_SPEED + SPEED_STEP * MAX_SPEED) * Math.max(dt, 1 / 120) * 1.3 + 0.015;
        if (gap > vmax) { const k = Math.min(1, Math.max(vmax, gap * (1 - Math.exp(-dt * 20))) / gap); nx = v.x + (nx - v.x) * k; ny = v.y + (ny - v.y) * k; }
        v.walk += Math.abs(nx - v.x) + Math.abs(ny - v.y); v.x = nx; v.y = ny; v.dir = s.d; v.moving = !!s.m && phase === 'play';
      }
    }

    // ----------------------------------------------------------------- mise à jour
    function update(dt) {
      clock += dt; vt += dt;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].at <= clock) { const n = later[i]; later.splice(i, 1); tone(n.f, n.d, n.ty, n.v); }
      if ((!headOk[0] && imgOk(PL[0].img)) || (!headOk[1] && imgOk(PL[1].img))) { if (SPR) buildHeads(); }
      for (let i = PT.length - 1; i >= 0; i--) { const p = PT[i]; p.life -= dt; if (p.life <= 0) { PT.splice(i, 1); continue; } if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt; }
      for (let i = RG.length - 1; i >= 0; i--) { RG[i].life -= dt; if (RG[i].life <= 0) RG.splice(i, 1); }
      for (let i = TX.length - 1; i >= 0; i--) { TX[i].life -= dt; if (TX[i].life <= 0) TX.splice(i, 1); }
      for (let i = titles.length - 1; i >= 0; i--) { titles[i].t -= dt; if (titles[i].t <= 0) titles.splice(i, 1); }
      if (shake > 0) shake = Math.max(0, shake - dt * (8 + shake * 3));
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.6);
      if (press.t > 0) press.t = Math.max(0, press.t - dt * 4);
      if (press.pz > 0) press.pz -= dt;
      if (ONLINE) {
        if (HOST) hostNet(); else guestNet();
        if (phase === 'wait') {
          waitT += dt;
          if (waitT > 20 && !overDone) { overDone = true; try { if (CO.abort) CO.abort(GUEST ? 'La partie n\'a pas pu démarrer' : 'Ton copain ne répond pas'); } catch (e) { /* rien */ } }
          return;
        }
        if (GUEST) guestSync(nnow());
      }
      padPoll(resumeT <= 0);
      if (resumeT > 0) {
        const b0 = Math.ceil(resumeT / 0.5);
        resumeT -= dt;
        if (resumeT <= 0) { resumeT = 0; SFX.count(true); } else if (Math.ceil(resumeT / 0.5) !== b0) SFX.count(false);
        return;
      }
      phaseT += dt;
      if (phase === 'intro') {
        if (phaseT >= 0.12 && phaseT - dt < 0.12) SFX.appear();
        for (let p = 0; p < 4; p++) { const tl = 0.88 + p * 0.1; if (phaseT >= tl && phaseT - dt < tl) { const A = S.actors[p]; puffs(A.x, A.y + 0.25, 4, 1.5, 0.6, 0.35, 1.0, 0.5); ring(A.x, A.y + 0.2, 0.2, 1.2, 0.35, PCOL[p], 0.1); SFX.land(); shake = Math.max(shake, 2.5); } }
        const tt = phaseT - (introDur - 2.0);
        if (tt >= 0) { const i = Math.min(3, Math.floor(tt / 0.6)); if (i !== countSaid) { countSaid = i; SFX.count(i === 3); } }
        if (phaseT >= introDur && HOST) { phase = 'play'; phaseT = 0; inputs.forEach((q) => { q.bomb = false; }); }
        if (GUEST && phaseT >= introDur + 0.4) { phase = 'play'; phaseT = 0; }
        handleEvents();
        return;
      }
      if (phase === 'play') {
        setMyInput();
        if (GUEST) guestAdvance(dt);
        else {
          if (sched) {
            aiTickN(sched, S, dt);
            for (let p = ONLINE ? 2 : 1; p < 4; p++) { const ai = ais[p]; if (!ai) continue; const o = ai.out, inp = inputs[p]; inp.mx = o.mx; inp.my = o.my; if (o.bomb) inp.bomb = true; }
          }
          const n = Math.max(1, Math.ceil(dt / 0.0085)), ins = ONLINE ? [inputs[0], remoteIn, inputs[2], inputs[3]] : inputs;
          for (let i = 0; i < n; i++) { step(S, dt / n, ins); for (const q of inputs) q.bomb = false; if (S.result) break; }
        }
        for (const b of S.bombs) if (Math.random() < dt * 18) { const pr = clamp(1 - b.fuse / b.fuse0, 0, 1), fl = Math.max(0.15, 1 - pr); part(1, b.x + 0.25 + 0.15 * fl, b.y - 0.38 - 0.17 * fl, (Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.8, 0.28, 0.17, 0.02, F.hot, 1.5); }
        for (const A0 of S.actors) { const A = vpos(A0.p); if (!A0.alive || !A.moving || Math.random() > dt * (5 + A0.speedLvl * 6)) continue; const q = part(1, A.x - DX[A.dir] * 0.25 + (Math.random() - 0.5) * 0.2, A.y + 0.3 - DY[A.dir] * 0.25, -DX[A.dir] * 0.5, -DY[A.dir] * 0.5, 0.45, 0.16, 0.5, F.dust, 1.5); q.a0 = 0.35; }
        handleEvents();
        computeDanger();
        if (!S.sd.on) { const rem = S.P.sdStart - S.t; if (rem <= 5 && rem > 0) { const s = Math.ceil(rem); if (s !== lastTick) { lastTick = s; SFX.tick(); } } }
      } else if (phase === 'end') {
        if (GUEST) { S.t += dt; for (let i = 0; i < S.N; i++) if (S.flameT[i] > 0) { S.flameT[i] = Math.max(0, S.flameT[i] - dt); if (!S.flameT[i]) S.flameM[i] = 0; } }
        else { const n = Math.max(1, Math.ceil(dt / 0.0085)); for (let i = 0; i < n; i++) step(S, dt / n, NOINS); }
        handleEvents();
        danger.fill(0);
        if (HOST && phaseT >= 2.8) {
          if (endInfo && endInfo.over) {
            phase = 'over'; phaseT = 0;
            if (!overDone) { overDone = true; try { if (api.gameOver) api.gameOver(Math.max(0, M.score | 0)); } catch (e) { /* rien */ } }
          } else startRound();
        }
      }
      if (ONLINE) updView(dt);
    }
    const NOINS = [NOIN, NOIN, NOIN, NOIN];

    // ----------------------------------------------------------------- boucle et cycle de vie
    let last = 0, pFrames = 0, perfSum = 0, perfN = 0, prevReal = 0;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      if (ONLINE) frameClock(now);
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) {
        prevReal = 0;
        if (ONLINE && HOST) { try { hostTick(dt); } catch (e) { /* rien */ } }
        if ((pFrames++ % 6) === 0) { try { render(); } catch (e) { /* rien */ } }
        return;
      }
      update(dt);
      if (ONLINE) { try { if (HOST) hostTick(dt); else guestTick(dt); } catch (e) { /* le réseau ne casse jamais la boucle */ } }
      try { render(); } catch (e) { /* ne jamais casser la boucle */ }
      const rn = performance.now();
      if (prevReal && phase === 'play') {
        const iv = rn - prevReal;
        if (iv < 250) { perfSum += iv; perfN++; }
        if (perfN >= 150) { if (perfSum / perfN > 21 && quality > 0.6) { quality = Math.max(0.55, quality - 0.2); layoutKey = ''; layout(); } perfSum = 0; perfN = 0; }
      }
      prevReal = rn;
    }
    function pause() { if (destroyed || paused) return; paused = true; keys.clear(); try { render(); } catch (e) { /* rien */ } }
    function resume() { if (destroyed || !paused) return; paused = false; last = 0; padPoll(false); if (phase === 'play' || phase === 'intro') { resumeT = 1.5; SFX.count(false); } }

    on(canvas, 'pointerdown', onDown, { passive: false });
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'lostpointercapture', onUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', (e) => keys.delete(String(e.key || '').toLowerCase()));
    on(window, 'blur', () => keys.clear());
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { if (!destroyed && S) { layout(); try { render(); } catch (e) { /* rien */ } } }); ro.observe(root); }
    else on(window, 'resize', () => { if (!destroyed && S) layout(); });

    if (ONLINE) {
      try {
        NETC.onMessage((m) => {
          if (destroyed || !m || typeof m !== 'object') return;
          const now = nnow();
          if (GUEST && m.k === 'S') { if (m.r === netR && S) onState(m, now); return; }
          m.at = now;
          if (inbox.length < 800) inbox.push(m);
        });
      } catch (e) { /* rien */ }
      // en attendant l'autre appareil : l'arène vide (l'hôte lance la manche à son « bonjour », 20 s au plus)
      newSim({ seed: seedOf(0), round: 1, bub: [0, 0, 0, 0] });
      for (let i = 0; i < S.N; i++) if (S.cells[i] === CRATE) S.cells[i] = EMPTY;
      S.loot.fill(-1);
      phase = 'wait'; phaseT = 0; layout();
      if (GUEST) { helloAt = nnow(); nsend({ k: 'H' }, true); }
    } else startRound();
    raf = requestAnimationFrame(frame);
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed && SPR) buildHeads(); }); } catch (e) { /* rien */ }

    return {
      pause, resume,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, ty, fn, o] of listeners) t.removeEventListener(ty, fn, o);
        listeners.length = 0; later.length = 0; PT.length = 0; RG.length = 0; TX.length = 0; ptrs.clear(); keys.clear(); inbox.length = 0; outEv.length = 0;
        root.innerHTML = '';
      },
      currentScore() { return Math.max(0, liveScore() | 0); },
      currentLevel() { return Math.max(1, M.round | 0); },
      coopStats() {
        const out = [];                              // seulement de belles choses (jamais « 0 manche gagnée »)
        if (M.won) out.push({ icon: '🏆', n: M.won, label: M.won > 1 ? 'manches gagnées' : 'manche gagnée' });
        if (M.kos) out.push({ icon: '💥', n: M.kos, label: M.kos > 1 ? 'robots soufflés' : 'robot soufflé' });
        if (M.saves) out.push({ icon: '🛟', n: M.saves, label: M.saves > 1 ? 'sauvetages' : 'sauvetage' });
        const cr = M.crates + (S && S.coop && !S.result ? S.coop.crates[0] : 0);
        if (out.length < 3 && cr) out.push({ icon: '📦', n: cr, label: cr > 1 ? 'caisses cassées' : 'caisse cassée' });
        return out;
      },
      // pour les tests automatiques
      _sim() { return S; },                         // (tests automatiques)
      snapshot() {
        if (!S) return null;
        return {
          phase, round: M.round, hearts: M.hearts, score: M.score, live: liveScore(), played: M.played, won: M.won, t: S.t, cols: S.cols, rows: S.rows, result: S.result,
          actors: S.actors.map((a) => ({ x: a.x, y: a.y, alive: a.alive, state: a.state, bubT: a.bubT, bombsMax: a.bombsMax, range: a.range })),
          grid: Array.from(S.cells).join(''), items: Array.from(S.items).join(','), bombs: S.bombs.length,
          ui: ctl ? { sx: ctl.sx, sy: ctl.sy, bx: ctl.bx, by: ctl.by, R: ctl.R, pz: ctl.pz, W, H, T, ox, oy, aw, ah } : null,
          net: ONLINE ? { role: HOST ? 'host' : 'guest', r: netR, tErr, view: view.map((v) => v && [v.x, v.y]) } : undefined,
          ai: sched ? sched.list.map((e) => ({ p: e.p, mode: e.ai.mode, goal: e.ai.goal })) : null
        };
      }
    };
  }

  const BOUM = {
    id: 'boum',
    title: 'Boum !',
    emoji: '💣',
    tagline: 'Duel de bombes : fais sauter les caisses et piège l’autre !',
    accent: ACCENT,
    target: 3,
    layout: 'shared',
    net: true,                                     // sait jouer en ligne (api.net) : chacun sur son téléphone
    ai: true,                  // sait jouer contre l'IA (api.ai) : la tuile n'est pas grisée quand l'IA joue en haut
    // manette (CONTRACT.md « Ajout 10 ») : schéma des commandes montré par la borne (carte de pause, début de partie)
    pad: { help: [['ls/dpad', 'Marcher (le jeu suit la grille)'], ['a/b', 'Poser une bombe'], ['ls', 'Fonce sur une bombe : la pousse (bonus)']],
      coopHelp: [['ls/dpad', 'Marcher (le jeu suit la grille)'], ['a/b', 'Poser une bombe'], ['ls', 'Touche la bulle de ton copain : sauvé !'], ['ls', 'Fonce sur une bombe : la pousse (bonus)']], intro: false },
    // mode Coop (COOP-CONTRACT.md) : « Boum 2 contre 2 », toi et ton coéquipier (robot ou copain en ligne) contre BIP et BOP ;
    // mount() teste api.coop en tout premier (mountCoop) ; points × mult selon le niveau choisi au lancement
    coop: {
      ai: true, online: true, title: 'Boum 2 contre 2', short: 'Boum 2 c. 2', emoji: '💣',
      tagline: 'Toi et ton coéquipier contre BIP et BOP, les robots !', levelHint: "Les robots d'en face (et ton robot) jouent mieux",
      mult: COOP_MULT, colors: [PCOL[0], PCOL[1]], scoreLabel: 'points', preview: preview2v2
    },
    preview,
    mount
  };
  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS['boum'] = BOUM;
})();
