(() => {
  'use strict';

  // ===========================================================================
  // BOUM ! (id « boum ») — duel de bombes dans une arène quadrillée.
  // Deux joueurs sur le même téléphone, face à face : P0 en bas (à l'endroit),
  // P1 en haut (tout ce qui le concerne est dessiné tourné de 180°).
  // Le terrain est à symétrie centrale parfaite : la case (x, y) et la case
  // (cols-1-x, rows-1-y) sont toujours identiques (même caisse, même bonus caché).
  //
  // Organisation (prête pour le jeu en ligne) :
  //   1. outils, constantes, PRNG à graine, génération du terrain (pur)
  //   2. simulation pure : newRound(cfg) → état S ; step(S, dt, inputs) ; S.events
  //   3. peinture (sprites pré-rendus : sol, piliers, caisses, bombes, flammes, bonus, personnages)
  //   4. vignette (preview)
  //   5. mount() : mise en page, entrées multi-touch / clavier, boucle, sons, particules, manches
  // ===========================================================================

  const TAU = Math.PI * 2;
  const ACCENT = '#ff4d5e';
  const BG = '#0b141c';
  const PCOL = ['#ffa630', '#5ef0ff'];
  const PDARK = ['#8a4300', '#08708a'];
  const PLIGHT = ['#ffe2ad', '#dcfcff'];
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];        // 0 droite, 1 bas, 2 gauche, 3 haut (repère écran)
  const BIT = [1, 2, 4, 8];                              // liaisons des flammes (même ordre)

  // contenu des cases
  const EMPTY = 0, PILLAR = 1, CRATE = 2, SOLID = 3, BREAKING = 4;
  // bonus
  const IT_BOMB = 0, IT_RANGE = 1, IT_SPEED = 2, IT_PUSH = 3, IT_SHIELD = 4;
  const ITEMS = [
    { label: '+1 BOMBE', col: '#ffd34d', dark: '#8a5a00' },
    { label: '+1 PORTÉE', col: '#ff7a3c', dark: '#8a2a00' },
    { label: 'VITESSE !', col: '#4cff8a', dark: '#0d6b33' },
    { label: 'POUSSE-BOMBE !', col: '#ff5fd2', dark: '#7a1468' },
    { label: 'BOUCLIER !', col: '#7fc4ff', dark: '#1d3f8a' }
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
    S.events.push({ type: 'push', p: a.p, x: nx, y: ny, d });
  }
  function placeBomb(S, a) {
    if (!a.alive || a.active >= a.bombsMax) return false;
    const cx = Math.round(a.x), cy = Math.round(a.y), i = cellAt(S, cx, cy);
    if (i < 0 || S.cells[i] !== EMPTY || bombAtCell(S, i) || S.flameT[i] > 0) return false;
    const b = { id: S.nextId++, owner: a.p, x: cx, y: cy, cell: i, fuse: S.P.fuse, fuse0: S.P.fuse, range: a.range, slide: -1, pass: [false, false], t: 0 };
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
        if (!bombCanEnter(S, tx, ty, b)) { b.slide = -1; S.events.push({ type: 'stop', x: rx, y: ry }); break; }
      } else {
        tx = DX[d] > 0 ? Math.ceil(b.x) : DX[d] < 0 ? Math.floor(b.x) : rx;
        ty = DY[d] > 0 ? Math.ceil(b.y) : DY[d] < 0 ? Math.floor(b.y) : ry;
        const ti = cellAt(S, tx, ty);
        if (ti < 0 || S.cells[ti] !== EMPTY) { b.x = tx - DX[d]; b.y = ty - DY[d]; b.slide = -1; S.events.push({ type: 'stop', x: b.x, y: b.y }); break; }
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
  function addFlame(S, i, bits, owner) { S.flameT[i] = FLAME_DUR; S.flameM[i] |= bits; S.flameO[i] = owner; }
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
    a.picks++;
    S.events.push({ type: 'pick', p: a.p, it, i, x: i % S.cols, y: (i / S.cols) | 0 });
  }
  function hitActor(S, a, why) {
    if (!a.alive || S.result) return;
    if (why !== 'crush') {
      if (a.invul > 0) return;
      if (a.shield) { a.shield = false; a.invul = 1.3; S.events.push({ type: 'shield', p: a.p, x: a.x, y: a.y }); return; }
    }
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
      S.events.push({ type: 'squash', i, x: i % S.cols, y: (i / S.cols) | 0 });
    }
    const x = i % S.cols, y = (i / S.cols) | 0;
    for (const a of S.actors) if (a.alive && live && Math.round(a.x) === x && Math.round(a.y) === y) hitActor(S, a, 'crush');
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
    const d0 = !S.actors[0].alive, d1 = !S.actors[1].alive;
    if (!d0 && !d1) return;
    if (d0 && d1) S.result = { winner: -1, loser: -1, why: 'draw' };
    else {
      const loser = d0 ? 0 : 1;
      if (S.t - S.hitAt[loser] < DRAW_WIN) return;
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
      moveActor(S, a, inp.mx || 0, inp.my || 0, dt);
      if (inp.bomb) placeBomb(S, a);
      const ci = cellAt(S, Math.round(a.x), Math.round(a.y));
      if (ci >= 0 && S.items[ci] >= 0) pickItem(S, a, ci);
    }
    updateBombs(S, dt, live);
    if (live) {
      for (const a of S.actors) {
        if (!a.alive) continue;
        const ci = cellAt(S, Math.round(a.x), Math.round(a.y));
        if (ci >= 0 && S.flameT[ci] > FLAME_SAFE) hitActor(S, a, S.flameO[ci] === a.p ? 'self' : 'flame');
      }
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
      w: mkGlow('#ffffff'), p: [mkGlow(PCOL[0]), mkGlow(PCOL[1])], red: mkGlow(ACCENT), hot: mkGlow('#ff7a2a', true),
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
    if (o.p === 1) c.rotate(Math.PI);
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
  // 5. Le jeu
  // ===========================================================================
  const HEADH = 1.3;
  const RULE = ['Pose des bombes, fais sauter les caisses', 'et piège l’autre dans l’explosion !'];
  const HINTS = { 2: 'Mèches plus courtes, plus de bonus !', 3: 'La mort subite arrive plus tôt !', 4: 'Ça chauffe : mèches encore plus courtes !' };

  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const AU = api.audio || {};
    const PL = [0, 1].map((i) => (api.players && api.players[i]) || { name: 'JOUEUR ' + (i + 1), img: null, sad: null });
    const NAMES = PL.map((p, i) => String((p && p.name) || 'JOUEUR ' + (i + 1)).toUpperCase().slice(0, 12));
    const F = fx();
    let destroyed = false, raf = 0, paused = false;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
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
    function say(text, o) { try { if (api.say) api.say(text, o || {}); } catch (e) { /* rien */ } }

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
      const ord = S.actors[0].y <= S.actors[1].y ? [0, 1] : [1, 0];
      ctx.globalCompositeOperation = 'lighter';    // chaque personnage éclaire le sol à sa couleur
      for (const p of ord) {
        const a = S.actors[p];
        if (!a.alive || (phase === 'intro' && phaseT < 0.5 + p * 0.12)) continue;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(F.p[p], X(a.x) - T * 1.15, Y(a.y) - T * 0.85, T * 2.3, T * 2.3);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const p of ord) {
        const a = S.actors[p];
        let drop = null;
        if (phase === 'intro') { drop = clamp((phaseT - 0.5 - p * 0.12) / 0.38, 0, 1); if (drop <= 0) continue; }
        const won = a.win || (lastRes && lastRes.winner === p && phase !== 'intro' && phase !== 'play');
        drawHero(ctx, X(a.x), Y(a.y), T, {
          p, body: SPR.body[p], head: SPR.head[p], sad: SPR.sad[p], t: vt + p * 1.3, walk: a.walk, moving: a.moving && phase === 'play',
          lean: a.moving ? (p === 0 ? DX[a.dir] : -DX[a.dir]) : 0, dead: !a.alive, deadT: a.deadT, why: a.why, win: won,
          shield: a.shield, invul: a.invul, danger: a.alive && phase === 'play' && dangerAt(a), drop, headH: HEADH
        });
      }
    }
    function drawLocal(p, x, y, fn) {              // dessine dans le repère du joueur p, centré sur (x, y)
      ctx.save(); ctx.translate(x, y); if (p) ctx.rotate(Math.PI);
      fn(); ctx.restore();
    }
    function drawMarkers() {
      if (phase === 'intro' && phaseT > 0.85) {    // « TOI » au-dessus de chaque personnage
        const a = clamp((phaseT - 0.85) / 0.25, 0, 1) * clamp((introDur + 0.3 - phaseT) / 0.3, 0, 1);
        for (let p = 0; p < 2; p++) {
          const A = S.actors[p];
          drawLocal(p, X(A.x), Y(A.y), () => {
            const b = Math.abs(Math.sin(vt * 5)) * T * 0.16;
            ctx.globalAlpha = a;
            ctx.fillStyle = PCOL[p]; ctx.strokeStyle = '#05080c'; ctx.lineWidth = 3;
            const yy = -(HEADH + 0.32) * T - b;
            poly(ctx, [-T * 0.2, yy - T * 0.18, T * 0.2, yy - T * 0.18, 0, yy + T * 0.08]); ctx.stroke(); ctx.fill();
            txtOut(ctx, 'TOI', 0, yy - T * 0.48, Math.round(clamp(T * 0.5, 12, 22)), PCOL[p], FD, 'center', 4);
            ctx.globalAlpha = 1;
          });
        }
      }
      if ((phase === 'end' || phase === 'over') && lastRes) {
        for (let p = 0; p < 2; p++) {
          const A = S.actors[p];
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
        drawLocal(t.p, x, y, () => {
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
      const A = S.actors[lastRes.winner], x = X(A.x), y = Y(A.y) + (A.p ? 0.45 : -0.45) * T;
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
      for (const A of S.actors) { const x = X(A.x), y = Y(A.y) + (A.p ? 0.3 : -0.3) * T; ctx.moveTo(x + T * 1.6, y); ctx.arc(x, y, T * 1.6, 0, TAU, true); }
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
        const kv = kbVec(p);
        if (kv[0] || kv[1]) { const l = Math.hypot(kv[0], kv[1]); kx = bx + (p ? -1 : 1) * kv[0] / l * ctl.R * 0.6; ky = by + (p ? -1 : 1) * kv[1] / l * ctl.R * 0.6; }
      }
      drawInfo(p);
      drawBombBtn(p);
      drawStick(p, bx, by, kx, ky, act);
      ctx.restore();
    }

    // ----------------------------------------------------------------- écrans par-dessus (décompte, consignes, pause, transitions)
    function drawCount(label, k) {
      const size = Math.round(clamp(Math.min(W, H) * 0.22, 52, 120));
      const go = label === 'GO !';
      for (let p = 0; p < 2; p++) {
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
      for (let p = 0; p < 2; p++) {
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
        for (let p = 0; p < 2; p++) {
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
      drawHud(0);
      drawHud(1);
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
    function localXY(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
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
      const p = y >= H / 2 ? 0 : 1;
      const stickSide = p === 0 ? x < W / 2 : x > W / 2;
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
      if (stickSide) {
        const s = sticks[p], R = ctl.R;
        s.id = e.pointerId;
        s.bx = clamp(x, R + 4, W - R - 4);
        s.by = p === 0 ? clamp(y, H / 2 + R * 0.5, H - R - 4) : clamp(y, R + 4, H / 2 - R * 0.5);
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
      if (k === ' ' || k === 'spacebar' || k === 'enter') { e.preventDefault(); if (!e.repeat) pressBomb(0); return; }
      if (k === 'e') { if (!e.repeat) pressBomb(1); return; }
      if (KEYMAP[k]) { e.preventDefault(); keys.add(k); }
    }
    function onKeyUp(e) { keys.delete(String(e.key || '').toLowerCase()); }
    function onBlur() { keys.clear(); }
    function setInputs() {
      for (let p = 0; p < 2; p++) {
        const st = sticks[p];
        if (st.id != null) { inputs[p].mx = st.vx; inputs[p].my = st.vy; }
        else { const v = kbVec(p); inputs[p].mx = v[0]; inputs[p].my = v[1]; }
      }
    }

    // ----------------------------------------------------------------- manches
    function startRound(isReplay) {
      let rn = 1;
      try { rn = Math.max(1, Number(api.round ? api.round() : 1) | 0) || 1; } catch (e) { rn = 1; }
      const r = root.getBoundingClientRect();
      const port = (r.height || H) >= (r.width || W);
      S = newRound({ cols: port ? 11 : 15, rows: port ? 15 : 11, notch: port, seed: (Math.random() * 4294967296) >>> 0, round: rn });
      danger = new Float32Array(S.N); flameDist = new Uint8Array(S.N);
      PT.length = 0; RG.length = 0; TX.length = 0; decals.length = 0;
      lastRes = null; endT = 0; zoom = 1; zoomTo = 1; slowT = 0; hitStop = 0; countSaid = -1; lastTick = -1; sdFlash = 0;
      inputs[0].bomb = false; inputs[1].bomb = false;
      let sc = [0, 0];
      try { sc = (api.scores && api.scores()) || [0, 0]; } catch (e) { sc = [0, 0]; }
      bannerTitle = firstRound && !isReplay ? '' : PATTERNS[S.pattern].toUpperCase();
      if (firstRound && !isReplay) { bannerTxt = RULE; introDur = 4.7; }
      else {
        introDur = 3.2;
        if (isReplay) bannerTxt = ['Égalité… on rejoue !'];
        else if (Math.max(sc[0] || 0, sc[1] || 0) >= BOUM.target - 1) bannerTxt = ['Balle de match !'];
        else bannerTxt = HINTS[rn] ? [HINTS[rn]] : null;
      }
      firstRound = false;
      phase = 'intro'; phaseT = 0;
      layout();
      iris = { t: 0, dur: 0.65, open: true, x: (S.cols - 1) / 2, y: (S.rows - 1) / 2 };
      say(isReplay ? 'On rejoue !' : 'Manche ' + rn, { color: ACCENT, ms: 1000 });
    }
    function onResult(e) {
      lastRes = { winner: e.winner, loser: e.loser, why: e.why };
      endT = 0; phaseT = 0;
      if (e.winner >= 0) {
        const why = e.why === 'crush' ? 'Écrasé !' : e.why === 'self' ? 'Auto-boum !' : 'Boum !';
        let res = null;
        try { res = api.point ? api.point(e.winner, why) : null; } catch (er) { res = null; }
        const A = S.actors[e.winner];
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
      if (d > 0) {
        setInputs();
        const n = Math.max(1, Math.ceil(d / 0.0085));
        for (let i = 0; i < n; i++) { step(S, d / n, inputs); inputs[0].bomb = false; inputs[1].bomb = false; }
        for (const b of S.bombs) if (Math.random() < d * 18) { const tp = fuseTip(b); part(1, tp[0], tp[1], (Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 1.8, 0.28, 0.17, 0.02, F.hot, 1.5); }
        for (const A of S.actors) {
          if (!A.alive || !A.moving || Math.random() > d * (5 + A.speedLvl * 6)) continue;
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
          const fA = lastRes && lastRes.winner >= 0 ? S.actors[lastRes.winner] : null;
          iris = { t: 0, dur: 0.45, open: false, x: fA ? fA.x : (S.cols - 1) / 2, y: fA ? fA.y : (S.rows - 1) / 2 };
        }
        if (endT >= tEnd) startRound(!!(lastRes && lastRes.winner < 0));
      } else if (phase === 'over') endT += dt;
    }

    // ----------------------------------------------------------------- boucle et cycle de vie
    let last = 0, pFrames = 0, perfSum = 0, perfN = 0, prevReal = 0;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) { prevReal = 0; if ((pFrames++ % 6) === 0) { try { render(); } catch (e) { /* rien */ } } return; }
      update(dt);
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

    startRound(false);
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
          falling: S.sd.falling.map((f) => f.i)
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
    preview,
    mount
  };
  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS['boum'] = BOUM;
})();
