(() => {
  'use strict';

  // ===========================================================================
  // Casse-briques face à face — duel à deux sur le même téléphone posé à plat.
  // P0 en bas (à l'endroit), P1 en haut (tout ce qui le concerne est tourné de 180°).
  // Simulation pure (état + step(dt, entrées), hasard à graine) séparée de l'affichage :
  // prête pour le jeu en ligne.
  // ===========================================================================
  const ID = 'briques';
  const TARGET = 5;                        // points pour gagner le match
  const W = 360, H = 640, MID = H / 2;   // terrain logique (unités), centré et mis à l'échelle
  const COLS = 10, BW = W / COLS, BH = 16;
  const LANE = 32;                         // demi-hauteur de l'allée centrale (jamais de briques)
  const PY = [H - 54, 54];                 // centre des raquettes : P0 en bas, P1 en haut
  const PH = 12;                           // épaisseur des raquettes
  const BR = 6.5;                          // rayon des balles
  const SHIELD_Y = [H - 9, 9];             // ligne du bouclier, derrière chaque raquette
  const MAX_BALLS = 6;
  const STEP = 1 / 120;                    // pas fixe de la simulation
  const MIN_VY = 0.36;                     // anti-boucle : jamais trop à l'horizontale
  const SUDDEN = 40;                       // mort subite (s d'échange)
  const KEY_SPEED = 480, TOUCH_GAIN = 1.3;
  const PAD_SPEED = 720;                   // manette : vitesse de la raquette, stick à fond (unités/s)
  const DEG = Math.PI / 180;
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";
  const PCOL0 = ['#ffa630', '#5ef0ff'];
  const NIGHT = '#0b141c';
  // couleurs des briques (loin de l'ambre et du cyan des joueurs)
  const BRICK_COLS = ['#ff5f7e', '#b07cff', '#4cc36a', '#ff5fae', '#6f86ff', '#a8e05f'];

  const POWERS = {
    big:    { color: '#4cc36a', label: 'RAQUETTE GÉANTE !', dur: 12, w: 20 },
    multi:  { color: '#b07cff', label: 'MULTI-BALLE !', dur: 0, w: 16 },
    fire:   { color: '#ff5a1f', label: 'BALLE DE FEU !', dur: 8, w: 14 },
    shield: { color: '#3fb6e8', label: 'BOUCLIER !', dur: 0, w: 15 },
    shrink: { color: '#ff4d5e', label: 'L’AUTRE RÉTRÉCIT !', dur: 9, w: 15 },
    glue:   { color: '#ffd34d', label: 'RAQUETTE COLLANTE !', dur: 10, w: 13 }
  };
  const POWER_KEYS = Object.keys(POWERS);
  const EFF_KEYS = ['big', 'shrink', 'fire', 'glue'];

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);       // cosmétique uniquement
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function imgOk(im) {
    if (!im) return false;
    try {
      if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
      return (im.width || 0) > 0 && (im.height || 0) > 0;
    } catch (e) { return false; }
  }
  const easeOut = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const easeBack = k => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function roundSeed(matchSeed, round) {
    let h = (matchSeed ^ Math.imul(round + 1, 0x9E3779B1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  const shadeCache = {};
  function shade(hex, amt) {
    const k = hex + '|' + amt;
    if (shadeCache[k]) return shadeCache[k];
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return (shadeCache[k] = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')');
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + (+a).toFixed(3) + ')';
  }

  // ---------------------------------------------------------------------------
  // Difficulté : tout dépend du numéro de manche (api.round())
  // ---------------------------------------------------------------------------
  function roundParams(round) {
    const r = Math.max(1, round | 0);
    return {
      R: Math.min(7, 4 + Math.floor(r / 2)),               // rangées par moitié de mur
      speed: Math.min(395, 235 + (r - 1) * 20),           // vitesse de base
      vmax: Math.min(620, 420 + (r - 1) * 26),            // plafond pendant l'échange
      padW: Math.max(60, 86 - (r - 1) * 3.4),             // raquettes un peu plus petites
      balls: r >= 4 ? 2 : 1,                              // 2 balles dès la manche 4
      solid: r < 2 ? 0 : Math.min(0.32, 0.09 + (r - 2) * 0.05),
      tough: r < 3 ? 0 : Math.min(0.55, (r - 2) * 0.13), // part des solides à 3 coups
      movers: r >= 6 ? 2 : r >= 3 ? 1 : 0,                // rangées de briques qui bougent
      moverSpeed: Math.min(120, 46 + r * 7),
      headsPer: r >= 3 ? 2 : 1,                           // briques-têtes par moitié
      capSpeed: Math.min(185, 125 + r * 6),
      powerRate: 0.2
    };
  }

  // ---------------------------------------------------------------------------
  // Motifs de murs (symétriques gauche-droite). r = rangée depuis l'allée (0 = contre l'allée),
  // d = distance au bord (0..4), R = nombre de rangées, u = bruit à graine, ph = phase à graine.
  // ---------------------------------------------------------------------------
  const PATTERNS = [
    { name: 'Rempart', f: (r, d) => d >= 1 && (r >= 1 || d === 4) },
    { name: 'Damier', f: (r, d) => (r + d) % 2 === 0 },
    { name: 'Losange', f: (r, d, R) => Math.abs(r - (R - 1) / 2) * 1.05 + (4 - d) * 0.85 <= R * 0.6 + 0.7 },
    { name: 'Piliers', f: (r, d, R) => d % 2 === 1 || r === R - 1 },
    { name: 'Vagues', f: (r, d, R, u, ph) => Math.abs(r - (R - 1) / 2 - 1.5 * Math.sin(d * 1.15 + ph)) < 1.3 },
    { name: 'Forteresse', f: (r, d, R) => (r === R - 1 ? d !== 2 : d === 1 || (d >= 3 && r <= R - 3)) },
    { name: 'Escalier', f: (r, d) => r >= d - 1 && r <= d + 1 },
    { name: 'Hublots', f: (r, d, R) => { const dy = r - (R - 1) / 2, dx = d - 2.2; const k = Math.sqrt(dx * dx + dy * dy * 1.4); return k > 0.95 && k < 2.5; } },
    { name: 'Créneaux', f: (r, d, R) => (r >= R - 2 ? d % 3 !== 2 : r % 2 === 0 && d >= 1) },
    { name: 'Mosaïque', f: (r, d, R, u) => u < 0.6 },
    { name: 'Chevrons', f: (r, d) => (r + 4 - d) % 3 !== 0 },
    { name: 'Couloirs', f: (r, d) => d === 1 || d === 3 || (d === 4 && r % 2 === 1) }
  ];

  function pickPower(rng) {
    let tot = 0;
    for (const k of POWER_KEYS) tot += POWERS[k].w;
    let v = rng() * tot;
    for (const k of POWER_KEYS) { v -= POWERS[k].w; if (v <= 0) return k; }
    return 'big';
  }

  // Mur d'UNE moitié (celle de P0, rangées comptées depuis l'allée). La moitié de P1 est son
  // symétrique central : la case (r, c) de P1 = la case (r, COLS-1-c) de P0 → même mur pour les deux.
  function genWall(rng, round, prevPat) {
    const P = roundParams(round), R = P.R;
    let pi = 0;
    if (round > 1) {
      pi = 1 + Math.floor(rng() * (PATTERNS.length - 1));
      if (pi === prevPat) pi = 1 + (pi % (PATTERNS.length - 1));
    }
    const pat = PATTERNS[pi];
    const ph = rng() * Math.PI * 2;
    const shift = Math.floor(rng() * BRICK_COLS.length);
    const nz = [], sz = [], tz = [];
    for (let r = 0; r < R; r++) {
      nz.push([]); sz.push([]); tz.push([]);
      for (let d = 0; d < 5; d++) { nz[r].push(rng()); sz[r].push(rng()); tz[r].push(rng()); }
    }
    const g = [];
    let n = 0;
    for (let r = 0; r < R; r++) {
      g.push(new Array(COLS).fill(null));
      for (let c = 0; c < COLS; c++) {
        const d = Math.min(c, COLS - 1 - c);
        if (!pat.f(r, d, R, nz[r][d], ph)) continue;
        g[r][c] = { k: 'n', hp: 1, color: BRICK_COLS[(r + shift + (d >> 1)) % BRICK_COLS.length], power: null };
        n++;
      }
    }
    // jamais trop vide (on complète par paires symétriques, de l'extérieur vers l'intérieur)
    for (let r = R - 1; r >= 0 && n < 16; r--) {
      for (let d = 1; d <= 4 && n < 16; d++) {
        for (const c of [d, COLS - 1 - d]) {
          if (!g[r][c]) { g[r][c] = { k: 'n', hp: 1, color: BRICK_COLS[(r + shift + (d >> 1)) % BRICK_COLS.length], power: null }; n++; }
        }
      }
    }
    // briques solides (2 ou 3 coups), symétriques gauche-droite
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g[r][c];
        if (!cell) continue;
        const d = Math.min(c, COLS - 1 - c);
        if (sz[r][d] < P.solid) { cell.k = 's'; cell.hp = tz[r][d] < P.tough ? 3 : 2; }
      }
    }
    // briques-têtes (2x2) : au centre, ou deux de chaque côté dans les manches avancées
    const heads = [];
    const rh = clamp(Math.floor((R - 2) / 2) + (rng() < 0.5 ? 0 : 1), 0, R - 2);
    const blocks = P.headsPer >= 2 ? [1, 7] : [4];
    for (const c0 of blocks) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g[rh + i][c0 + j] = { k: 'h' };
      heads.push({ r: rh, c: c0, power: pickPower(rng) });
    }
    // rangées de briques qui bougent (rails) : jamais sur les têtes
    const movers = [];
    const cand = [];
    for (let r = 0; r < R; r++) if (r !== rh && r !== rh + 1) cand.push(r);
    for (let m = 0; m < P.movers && cand.length; m++) {
      const r = cand.splice(Math.floor(rng() * cand.length), 1)[0];
      const len = 3 + (rng() < 0.4 ? 1 : 0);
      const c0 = Math.floor(rng() * (COLS - len + 1));
      const dir = rng() < 0.5 ? -1 : 1;
      for (let c = 0; c < COLS; c++) g[r][c] = null;
      const hp = round >= 7 && rng() < 0.5 ? 2 : 1;
      movers.push({ r, c0, len, dir, hp, color: BRICK_COLS[(r + shift + 3) % BRICK_COLS.length] });
    }
    // bonus cachés (même place, à la symétrie centrale près, dans les deux moitiés)
    const plain = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) { const cell = g[r][c]; if (cell && cell.k !== 'h') plain.push(cell); }
    let nb = 0;
    for (const cell of plain) if (rng() < P.powerRate) { cell.power = pickPower(rng); nb++; }
    for (let i = 0; nb < 3 && i < plain.length * 3; i++) {
      const cell = plain[Math.floor(rng() * plain.length)];
      if (!cell.power) { cell.power = pickPower(rng); nb++; }
    }
    return { pat: pi, name: pat.name, R, grid: g, heads, movers };
  }

  // ===========================================================================
  // Simulation pure : aucun DOM, aucun Math.random, aucun Date.now (prête pour le jeu en ligne).
  // S = état ; step(S, dt, inputs) avec inputs = [entréesP0, entréesP1] :
  //   { dx: déplacement relatif (unités), target: x visé (souris) ou null, dir: -1|0|1 (clavier), release: bool }
  // Les événements (sons, effets, points) sont empilés dans S.ev ; l'affichage les consomme.
  // ===========================================================================
  const PROBES = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]];

  function newPlayer() { return { x: W / 2, w: 86, vx: 0, eff: { big: 0, shrink: 0, fire: 0, glue: 0 }, shield: false, hits: 0 }; }
  function newSim(matchSeed) {
    return {
      matchSeed: matchSeed >>> 0, round: 0, P: roundParams(1), rng: mulberry32(1),
      phase: 'idle', t: 0, clock: 0, slow: 1,
      R: 4, patIdx: -1, patName: '', bricks: [], cells: [], movers: [], balls: [], caps: [], left: 0,
      pl: [newPlayer(), newPlayer()], serve: [], introDur: 3, receiver: 0, lastConceder: -1, scorer: -1,
      matchOver: false, nextAsked: false, nid: 1, ev: [], rally: 0, playT: 0, headCount: 0,
      // jeu en ligne : gt = temps de jeu (ralenti compris) ; nh = « je suis l'hôte » ; pend = passages devant la raquette
      // de l'invité qui attendent son verdict ; dry = balle prédite (ne casse rien) ; evTs = heure des événements (ms)
      gt: 0, nh: false, pend: [], dry: false, evTs: null, nowTs: 0, ack: 0, capWait: 1
    };
  }
  function emit(S, e) { if (S.evTs != null) { e.ts = S.evTs; if (S.ff) e.rp = 1; } if (S.ev.length < 300) S.ev.push(e); }
  function wallFront(S) { return LANE + S.R * BH; }        // distance du centre à la face avant du mur
  function padFace(p) { return p === 0 ? PY[0] - PH / 2 - BR - 0.5 : PY[1] + PH / 2 + BR + 0.5; }

  function startRound(S, round, headCount) {
    S.round = round;
    S.P = roundParams(round);
    S.rng = mulberry32(roundSeed(S.matchSeed, round));
    const rng = S.rng;
    const spec = genWall(rng, round, S.patIdx);
    S.patIdx = spec.pat; S.patName = spec.name; S.R = spec.R;
    S.headCount = Math.max(0, headCount | 0);
    // copains des briques-têtes : tirage à graine, différents de chaque côté si possible
    const perm = [];
    for (let i = 0; i < S.headCount; i++) perm.push(i);
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    buildWall(S, spec, perm);
    for (const pl of S.pl) { pl.x = W / 2; pl.w = S.P.padW; pl.vx = 0; for (const k of EFF_KEYS) pl.eff[k] = 0; pl.shield = false; pl.hits = 0; }
    S.balls = []; S.caps = [];
    S.receiver = S.lastConceder >= 0 ? S.lastConceder : (rng() < 0.5 ? 0 : 1);
    planServe(S);
    S.introDur = round === 1 ? 4.2 : 3.0;
    S.phase = 'intro'; S.t = 0; S.nextAsked = false; S.scorer = -1; S.rally = 0; S.playT = 0; S.slow = 1; S.sudden = false;
    S.pend = [];
    emit(S, { k: 'round', round });
  }

  function mkBrick(S, p, r, c, cw, rh, kind, hp, color, power) {
    // (r, c) = rangée la plus proche de l'allée, colonne la plus à gauche à l'écran
    const y = p === 0 ? MID + LANE + r * BH : MID - LANE - (r + rh) * BH;
    const br = { id: S.nid++, p, r, c, x: c * BW, x0: c * BW, y, w: cw * BW, h: rh * BH, kind, hp, maxHp: hp, color, power: power || null,
      cells: [], dead: false, mover: null, head: -1 };
    for (let i = 0; i < rh; i++) {
      for (let j = 0; j < cw; j++) {
        const idx = (p * S.R + r + i) * COLS + c + j;
        S.cells[idx] = br;
        br.cells.push(idx);
      }
    }
    S.bricks.push(br);
    S.left++;
    return br;
  }

  function buildWall(S, spec, perm) {
    const R = spec.R;
    S.bricks = []; S.movers = []; S.left = 0;
    S.cells = new Array(2 * R * COLS).fill(null);
    const nb = spec.heads.length;
    for (let p = 0; p < 2; p++) {
      spec.heads.forEach((hb, k) => {
        const c = p === 0 ? hb.c : COLS - 2 - hb.c;
        const br = mkBrick(S, p, hb.r, c, 2, 2, S.headCount > 0 ? 'h' : 'g', 2, '#ffd34d', hb.power);
        br.head = perm.length ? perm[(k + p * nb) % perm.length] : -1;
      });
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < COLS; c++) {
          const cs = spec.grid[r][p === 0 ? c : COLS - 1 - c];
          if (!cs || cs.k === 'h') continue;
          mkBrick(S, p, r, c, 1, 1, cs.k, cs.hp, cs.color, cs.power);
        }
      }
      for (const m of spec.movers) {
        const g = { p, r: m.r, off: 0, vx: (p === 0 ? m.dir : -m.dir) * S.P.moverSpeed, cells: [] };
        const y = p === 0 ? MID + LANE + m.r * BH : MID - LANE - (m.r + 1) * BH;
        for (let i = 0; i < m.len; i++) {
          const c = m.c0 + i, x0 = (p === 0 ? c : COLS - 1 - c) * BW;
          const br = { id: S.nid++, p, r: m.r, c: -1, x: x0, x0, y, w: BW, h: BH, kind: m.hp > 1 ? 's' : 'n', hp: m.hp, maxHp: m.hp,
            color: m.color, power: null, cells: [], dead: false, mover: g, head: -1 };
          g.cells.push(br);
          S.bricks.push(br);
          S.left++;
        }
        S.movers.push(g);
      }
    }
  }

  function brickAt(S, x, y) {
    if (x < 0 || x >= W) return null;
    let p, r;
    if (y >= MID + LANE) { p = 0; r = Math.floor((y - MID - LANE) / BH); }
    else if (y < MID - LANE) { p = 1; r = Math.floor((MID - LANE - y) / BH); }
    else return null;
    if (r < 0 || r >= S.R) return null;
    return S.cells[(p * S.R + r) * COLS + Math.floor(x / BW)] || null;
  }

  function planServe(S) {
    const rng = S.rng;
    const off = (rng() * 2 - 1) * 64;
    const a = (rng() < 0.5 ? -1 : 1) * (12 + rng() * 22) * DEG;
    const yb = MID + wallFront(S) + 18;
    const mk = p => (p === 0
      ? { p, x: W / 2 + off, y: yb, dx: Math.sin(a), dy: Math.cos(a) }
      : { p, x: W / 2 - off, y: H - yb, dx: -Math.sin(a), dy: -Math.cos(a) });
    S.serve = S.P.balls >= 2 ? [mk(0), mk(1)] : [mk(S.receiver)];
  }
  function serveSpeed(S) { return Math.min(212, S.P.speed * 0.68); }
  function newBall(S, x, y, vx, vy, sp, owner) {
    return { id: S.nid++, x, y, vx, vy, sp, owner, fire: false, stuck: -1, offX: 0, stickT: 0, dead: false };
  }
  function serve(S) {
    const sp = serveSpeed(S);
    S.balls = S.serve.map(s => newBall(S, s.x, s.y, s.dx * sp, s.dy * sp, sp, -1));
    S.phase = 'play'; S.t = 0;
    emit(S, { k: 'go' });
  }

  function fixVel(b) {
    let m = Math.hypot(b.vx, b.vy);
    if (m < 1e-6) { b.vx = 0; b.vy = b.owner === 1 ? 1 : -1; m = 1; }
    b.vx *= b.sp / m; b.vy *= b.sp / m;
    const mv = b.sp * MIN_VY;
    if (Math.abs(b.vy) < mv) {
      const sy = b.vy < 0 ? -1 : b.vy > 0 ? 1 : (b.owner === 1 ? 1 : -1);
      b.vy = sy * mv;
      b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(b.sp * b.sp - mv * mv);
    }
  }

  function movePaddles(S, dt, inputs) {
    for (let p = 0; p < 2; p++) {
      const pl = S.pl[p], inp = (inputs && inputs[p]) || {};
      // mort subite : après 40 s d'échange, les deux raquettes rétrécissent
      const sd = S.phase === 'play' && S.playT > SUDDEN ? Math.max(0.55, 1 - (S.playT - SUDDEN) / 50) : 1;
      const tw = S.P.padW * (pl.eff.big > 0 ? 1.55 : 1) * (pl.eff.shrink > 0 ? 0.6 : 1) * sd;
      pl.w += (tw - pl.w) * Math.min(1, dt * 12);
      let x = pl.x;
      if (S.phase !== 'over') {
        if (inp.abs != null) x = inp.abs;                 // en ligne : position envoyée par l'invité (bornée juste après)
        if (inp.dx) x += inp.dx;
        if (inp.target != null) { const mx = 1700 * dt; x += clamp(inp.target - x, -mx, mx); }
        if (inp.dir) x += inp.dir * KEY_SPEED * dt;
        if (inp.pad) x += inp.pad * PAD_SPEED * dt;      // manette : vitesse proportionnelle au stick
      }
      inp.dx = 0;
      x = clamp(x, pl.w / 2, W - pl.w / 2);
      pl.vx = dt > 0 ? (x - pl.x) / dt : 0;
      pl.x = x;
    }
  }

  function updateMovers(S, dt) {
    for (const g of S.movers) {
      let mn = Infinity, mx = -Infinity;
      for (const br of g.cells) if (!br.dead) { mn = Math.min(mn, br.x0 + g.off); mx = Math.max(mx, br.x0 + g.off + BW); }
      if (mn === Infinity) continue;
      g.off += g.vx * dt; mn += g.vx * dt; mx += g.vx * dt;
      if (mn < 0) { g.off -= mn; g.vx = Math.abs(g.vx); }
      else if (mx > W) { g.off -= mx - W; g.vx = -Math.abs(g.vx); }
      for (const br of g.cells) br.x = br.x0 + g.off;
    }
  }

  function hitBrick(S, br, b, kill) {
    if (br.dead || br.ghost) return;                      // brique « du passé » (rejeu en ligne) : rebond sans casse
    if (S.dry) { if (S.dryHit) S.dryHit(br); return; }    // balle prédite (invité, IA) : elle rebondit sans rien casser
    if (b && b.pv) { b.pv.touched = true; return; }       // hôte en ligne : trajet provisoire, on ne casse qu'au verdict
    br.hp = kill ? 0 : br.hp - 1;
    const owner = b ? b.owner : -1;
    if (br.hp > 0) { emit(S, { k: 'chip', br, owner, x: b ? b.x : br.x + br.w / 2, y: b ? b.y : br.y + br.h / 2 }); return; }
    br.dead = true; br.deadG = S.gt;
    for (const i of br.cells) if (S.cells[i] === br) S.cells[i] = null;
    S.left--;
    const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
    emit(S, { k: 'break', br, owner, x: cx, y: cy, fire: !!(b && b.fire), vx: b ? b.vx : 0, vy: b ? b.vy : 0 });
    if (br.power) {
      const to = owner >= 0 ? owner : br.p;              // le bonus glisse vers celui qui a cassé
      S.caps.push({ id: S.nid++, x: cx, y: cy, type: br.power, to, vy: (to === 0 ? 1 : -1) * S.P.capSpeed, t: 0, got: false });
      emit(S, { k: 'cap', to, x: cx, y: cy, type: br.power });
    }
  }

  function collideBricks(S, b) {
    let best = null, bestPen = -1, bnx = 0, bny = 0;
    const seen = [];
    for (const pr of PROBES) {
      const br = brickAt(S, b.x + pr[0] * BR, b.y + pr[1] * BR);
      if (!br || br.dead || seen.indexOf(br) >= 0) continue;
      seen.push(br);
      const cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h);
      const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
      if (d2 >= BR * BR) continue;
      let nx, ny, pen;
      const d = Math.sqrt(d2);
      if (d < 1e-6) {
        const L = b.x - br.x, R = br.x + br.w - b.x, T = b.y - br.y, B = br.y + br.h - b.y;
        const m = Math.min(L, R, T, B);
        if (m === T) { nx = 0; ny = -1; } else if (m === B) { nx = 0; ny = 1; } else if (m === L) { nx = -1; ny = 0; } else { nx = 1; ny = 0; }
        pen = BR + m;
      } else {
        nx = dx / d; ny = dy / d; pen = BR - d;
        // coin entre deux briques voisines : on rebondit sur la face plane
        if ((cx === br.x || cx === br.x + br.w) && (cy === br.y || cy === br.y + br.h)) {
          const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
          const nbX = brickAt(S, cx + sx * 2, cy - sy * 2), nbY = brickAt(S, cx - sx * 2, cy + sy * 2);
          const hx = !!(nbX && !nbX.dead && nbX !== br), hy = !!(nbY && !nbY.dead && nbY !== br);
          if (hx && !hy) { nx = 0; ny = sy; } else if (hy && !hx) { nx = sx; ny = 0; }
        }
      }
      if (pen > bestPen) { bestPen = pen; best = br; bnx = nx; bny = ny; }
    }
    if (!best) return;
    if (b.fire) { hitBrick(S, best, b, true); return; }      // la balle de feu traverse tout
    b.x += bnx * Math.min(bestPen, BR);
    b.y += bny * Math.min(bestPen, BR);
    const vn = b.vx * bnx + b.vy * bny;
    if (vn < 0) { b.vx -= 2 * vn * bnx; b.vy -= 2 * vn * bny; hitBrick(S, best, b, false); }
  }

  function collideMovers(S, b) {
    for (const g of S.movers) {
      for (const br of g.cells) {
        if (br.dead || b.y + BR < br.y || b.y - BR > br.y + br.h) continue;
        const cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h);
        const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
        if (d2 >= BR * BR) continue;
        if (b.fire) { hitBrick(S, br, b, true); continue; }
        const d = Math.sqrt(d2);
        let nx, ny, pen;
        if (d < 1e-6) { nx = 0; ny = b.vy > 0 ? -1 : 1; pen = BR; } else { nx = dx / d; ny = dy / d; pen = BR - d; }
        b.x += nx * Math.min(pen, BR);
        b.y += ny * Math.min(pen, BR);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
        hitBrick(S, br, b, false);
        return;
      }
    }
  }

  // vitesse plancher et plafond : montent avec la durée de la manche (les échanges sans fin finissent toujours)
  function speedFloor(S) { return S.P.speed * Math.min(1.45, 1 + S.playT / 70); }
  function speedCap(S) { return S.P.vmax * Math.min(1.3, 1 + S.playT / 100); }
  function launchFrom(S, b, p, off, spin) {
    let ang = off * 62 * DEG + (spin || 0);
    // anti-boucle verticale : jamais tout droit
    if (Math.abs(ang) < 4 * DEG) ang = (ang < 0 || (ang === 0 && S.rally % 2) ? -1 : 1) * 4 * DEG;
    ang = clamp(ang, -64 * DEG, 64 * DEG);
    b.vx = Math.sin(ang) * b.sp;
    b.vy = (p === 0 ? -1 : 1) * Math.cos(ang) * b.sp;
    b.y = padFace(p);
    b.stuck = -1;
  }

  function paddleHit(S, b, p) {
    const pl = S.pl[p], half = pl.w / 2;
    if (Math.abs(b.x - pl.x) > half + BR * 0.8) return false;
    if (p === 0) { if (b.y + BR < PY[0] - PH / 2 || b.y > PY[0] + 3) return false; }
    else if (b.y - BR > PY[1] + PH / 2 || b.y < PY[1] - 3) return false;
    const off = clamp((b.x - pl.x) / (half + BR * 0.5), -1, 1);
    b.sp = Math.min(speedCap(S), Math.max(speedFloor(S), b.sp * 1.045));   // ça accélère pendant l'échange
    b.owner = p;
    pl.hits++;
    S.rally++;
    if (pl.eff.glue > 0) {
      b.stuck = p; b.offX = clamp(b.x - pl.x, -half + 3, half - 3); b.stickT = 1.25;
      b.y = padFace(p); b.vx = 0; b.vy = 0;
      emit(S, { k: 'stick', p, x: b.x, y: b.y });
      return true;
    }
    // la raquette en mouvement donne un petit effet (dans le sens de l'écran)
    launchFrom(S, b, p, off, clamp(pl.vx / 2600, -0.1, 0.1));
    emit(S, { k: 'paddle', p, x: b.x, y: b.y, off, sp: b.sp, fire: pl.eff.fire > 0 });
    return true;
  }

  function shieldSave(S, b, p) {
    if (S.nh && p === 1) { const r = S.pend.find(q => q.id === b.id); if (r) r.shield = true; }   // à rendre si l'invité l'avait renvoyée
    S.pl[p].shield = false;
    b.y = p === 0 ? SHIELD_Y[0] - BR : SHIELD_Y[1] + BR;
    b.vy = p === 0 ? -Math.abs(b.vy) : Math.abs(b.vy);
    b.owner = p;
    emit(S, { k: 'shield', p, x: b.x, y: p === 0 ? SHIELD_Y[0] : SHIELD_Y[1], pv: b.pv ? 1 : 0 });
  }

  function applyPower(S, p, type, x, cid) {
    const pl = S.pl[p], op = S.pl[1 - p], P = POWERS[type];
    switch (type) {
      case 'big': pl.eff.big = P.dur; pl.eff.shrink = 0; break;
      case 'shrink': op.eff.shrink = P.dur; op.eff.big = 0; break;
      case 'fire': if (!(pl.eff.fire > 0)) pl.fireOnG = S.gt; pl.eff.fire = P.dur; break;
      case 'glue': pl.eff.glue = P.dur; break;
      case 'shield': pl.shield = true; pl.shieldG = S.gt; break;
      case 'multi': {
        let sp = speedFloor(S);
        for (const b of S.balls) if (!b.dead) sp = Math.max(sp, b.sp);
        for (const a of [-26, 26]) {
          if (S.balls.length >= MAX_BALLS) break;
          const ang = a * DEG;
          S.balls.push(newBall(S, clamp(pl.x + a * 0.4, BR, W - BR), padFace(p), Math.sin(ang) * sp, (p === 0 ? -1 : 1) * Math.cos(ang) * sp, sp, p));
        }
        break;
      }
      default: break;
    }
    emit(S, { k: 'power', p, type, x, cap: cid || 0 });
  }

  function updateCaps(S, dt) {
    for (const c of S.caps) {
      c.t += dt;
      c.y += c.vy * dt;
      const pl = S.pl[c.to];
      if (S.nh && c.to === 1) {
        // en ligne : c'est l'invité qui dit s'il a attrapé son bonus (il le voit sous SA raquette) ; on l'attend un peu
        if (c.y < -24) { c.y = -24; c.hold = (c.hold || 0) + dt; if (c.hold > S.capWait) { c.got = true; emit(S, { k: 'capmiss', to: 1, x: c.x }); } }
        continue;
      }
      if (Math.abs(c.y - PY[c.to]) <= PH / 2 + 9 && Math.abs(c.x - pl.x) <= pl.w / 2 + 13) { c.got = true; applyPower(S, c.to, c.type, c.x); }
      else if (c.to === 0 ? c.y > H + 24 : c.y < -24) { c.got = true; emit(S, { k: 'capmiss', to: c.to, x: c.x }); }
    }
    S.caps = S.caps.filter(c => !c.got);
  }

  function goal(S, scorer, b) {
    if (S.phase !== 'play') return;
    const conc = 1 - scorer;
    let alive = 0;
    for (const o of S.balls) if (!o.dead) alive++;
    emit(S, { k: 'goal', p: scorer, x: clamp(b.x, 0, W), fire: !!b.fire, multi: alive > 1, shrunk: S.pl[conc].eff.shrink > 0,
      rally: S.rally, owner: b.owner, vx: b.vx, vy: b.vy });
    S.phase = 'point'; S.t = 0; S.scorer = scorer; S.lastConceder = conc;
    S.balls = []; S.caps = []; S.pend = [];
    for (const pl of S.pl) { pl.eff.glue = 0; pl.eff.fire = 0; }
  }

  function updateBall(S, b, dt, inputs) {
    if (b.stuck >= 0) {
      const p = b.stuck, pl = S.pl[p];
      b.offX = clamp(b.offX, -pl.w / 2 + 3, pl.w / 2 - 3);
      b.x = pl.x + b.offX;
      b.y = padFace(p);
      b.stickT -= dt;
      const inp = inputs && inputs[p];
      // en ligne, l'invité lâche lui-même sa balle collée (message) ; l'hôte ne tranche qu'en dernier recours
      if (b.stickT <= (S.nh && p === 1 ? -1.2 : 0) || (inp && inp.release)) {
        launchFrom(S, b, p, clamp(b.offX / (pl.w / 2), -1, 1));
        emit(S, { k: 'launch', p, x: b.x, y: b.y });
      }
      return;
    }
    if (b.owner >= 0) { const fl = speedFloor(S); if (b.sp < fl) b.sp = Math.min(fl, b.sp + 30 * dt); }
    fixVel(b);
    const n = Math.max(1, Math.ceil((b.sp * dt) / (BR * 0.5)));
    const h = dt / n;
    const zone = wallFront(S) + BR + 1;
    for (let i = 0; i < n; i++) {
      if (S.nh && b.vy > 0) { b.xr = 0; b.skip1 = false; }   // la balle repart vers l'hôte : nouveau passage possible chez l'invité
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); emit(S, { k: 'wall', x: 0, y: b.y, owner: b.owner, id: b.id, pv: b.pv ? 1 : 0 }); }
      else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); emit(S, { k: 'wall', x: W, y: b.y, owner: b.owner, id: b.id, pv: b.pv ? 1 : 0 }); }
      b.fire = b.owner >= 0 && fireOn(S, b.owner);
      const dy = Math.abs(b.y - MID);
      if (dy < zone && dy > LANE - BR - 1) {
        collideBricks(S, b);
        if (S.movers.length) collideMovers(S, b);
      }
      if (b.vy > 0 && b.y > MID) { if (paddleHit(S, b, 0) && b.stuck >= 0) return; }
      else if (b.vy < 0 && b.y < MID) {
        if (S.nh ? netCross1(S, b, S.gt - dt + (i + 1) * h) : paddleHit(S, b, 1) && b.stuck >= 0) return;
      }
      if (b.vy > 0 && S.pl[0].shield && b.y + BR >= SHIELD_Y[0]) shieldSave(S, b, 0);
      else if (b.vy < 0 && S.pl[1].shield && !(S.pl[1].shieldG > S.gt) && b.y - BR <= SHIELD_Y[1]) shieldSave(S, b, 1);
      if (b.y - BR > H + 2) { goal(S, 1, b); return; }
      if (b.y + BR < -2) {
        // en ligne : pas de but tant que l'invité n'a pas dit s'il l'a renvoyée
        if (S.nh && S.pend.some(r => r.id === b.id)) { if (b.y < -70) b.y = -70; continue; }   // elle sort un peu, puis attend
        goal(S, 0, b); return;
      }
    }
    fixVel(b);
  }

  // En ligne (hôte) : la raquette de l'invité (P1) est jugée CHEZ L'INVITÉ, sur ce qu'il voit. Ici, au passage de la balle,
  // on note son état (pour pouvoir rejouer ce passage) et on fait un rebond PROVISOIRE avec la position connue de sa raquette.
  // Renvoie vrai si la balle vient de se coller (même convention que paddleHit dans updateBall).
  function netCross1(S, b, gNow) {
    if (b.skip1 || b.xr || b.y - BR > PY[1] + PH / 2 || b.y < PY[1] - 3) return false;
    b.xr = 1;                                               // un seul jugement provisoire par passage
    if (S.pend.length > 24) S.pend.shift();
    const rec = { id: b.id, g: gNow, ts: S.evTs != null ? S.evTs : S.nowTs, clk: S.clock, rally: S.rally, prov: 0, off: 0, spin: 0, shield: false, w: S.pl[1].w,
      snap: { x: b.x, y: b.y, vx: b.vx, vy: b.vy, sp: b.sp, owner: b.owner, fire: b.fire, stuck: b.stuck, offX: b.offX, stickT: b.stickT } };
    S.pend.push(rec);
    b.pv = rec;
    if (S.onRec) S.onRec(rec, b);
    // supposition : où sera la raquette quand l'invité verra cette balle (dernière position reçue, prolongée par sa vitesse) ;
    // plus le réseau est lent, plus on parie qu'il l'aura rattrapée (les joueurs renvoient bien plus qu'ils ne ratent)
    const pl = S.pl[1], half = pl.w / 2, g1 = S.g1;
    const gx = g1 ? clamp(g1.x + g1.v * Math.min(g1.lead, 0.15), half, W - half) : pl.x;
    const reach = g1 ? clamp(g1.lead * 250, 0, 120) : 0;
    if (Math.abs(b.x - gx) > half + BR * 0.8 + reach) return false;   // provisoirement ratée
    const off = clamp((b.x - gx) / (half + BR * 0.5), -1, 1) * (g1 ? 0.6 : 1);
    const sx = pl.x;
    pl.x = b.x - off * (half + BR * 0.5);
    const hit = paddleHit(S, b, 1);
    pl.x = sx;
    if (!hit) return false;
    rec.prov = 1; rec.off = off; rec.spin = clamp(pl.vx / 2600, -0.1, 0.1);
    if (b.stuck >= 0) { rec.st = 1; rec.ox = b.offX; }
    return b.stuck >= 0;
  }

  // balle de feu ? Pendant un rejeu (hôte en ligne), on regarde si le feu était allumé À CE MOMENT-LÀ
  function fireOn(S, o) {
    const pl = S.pl[o];
    if (!S.ff) return pl.eff.fire > 0;
    if (pl.eff.fire > 0) return !(pl.fireOnG > S.gt);
    return pl.fireOffG > S.gt;
  }

  // une balle a dépassé une raquette : ralenti dramatique (dérivé de l'état → déterministe)
  function behind(b) { return b.stuck < 0 && ((b.vy > 0 && b.y > PY[0] + PH) || (b.vy < 0 && b.y < PY[1] - PH)); }

  function step(S, dt, inputs) {
    S.clock += dt;
    let want = 1;
    if (S.phase === 'play') for (const b of S.balls) if (behind(b)) want = 0.32;
    S.slow += (want - S.slow) * Math.min(1, dt * 20);
    const d = dt * S.slow;
    S.t += d;
    S.gt += d;
    movePaddles(S, d, inputs);
    if (S.phase === 'intro') {
      if (S.t >= S.introDur) serve(S);
    } else if (S.phase === 'play') {
      S.playT += d;
      if (!S.sudden && S.playT > SUDDEN) { S.sudden = true; emit(S, { k: 'sudden' }); }
      for (const pl of S.pl) for (const k of EFF_KEYS) if (pl.eff[k] > 0) {
        pl.eff[k] = Math.max(0, pl.eff[k] - d);
        if (pl.eff[k] === 0) { if (k === 'glue') pl.glueG = S.gt; else if (k === 'fire') pl.fireOffG = S.gt; }
      }
      updateMovers(S, d);
      const list = S.balls.slice();
      for (const b of list) { updateBall(S, b, d, inputs); if (S.phase !== 'play') break; }
      if (S.phase === 'play') { S.balls = S.balls.filter(b => !b.dead); updateCaps(S, d); }
    } else if (S.phase === 'point') {
      if (S.t >= 1.45 && !S.matchOver && !S.nextAsked) { S.nextAsked = true; emit(S, { k: 'next' }); }
    }
    if (inputs) for (const inp of inputs) if (inp) inp.release = false;
  }

  // ===========================================================================
  // Peinture (partagée par le jeu et la vignette)
  // ===========================================================================
  // lueur additive pré-rendue (64 px), dessinée en 'lighter' à n'importe quelle taille
  function mkGlow(col, hard) {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (hard) { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, rgba(col, 1)); g.addColorStop(0.55, rgba(col, 0.32)); g.addColorStop(1, rgba(col, 0)); }
    else { g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.12, rgba(col, 0.8)); g.addColorStop(0.42, rgba(col, 0.26)); g.addColorStop(1, rgba(col, 0)); }
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkFire() {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.18, 'rgba(255,214,110,0.95)'); g.addColorStop(0.42, 'rgba(255,120,30,0.6)');
    g.addColorStop(0.72, 'rgba(170,30,30,0.2)'); g.addColorStop(1, 'rgba(90,10,20,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return cv;
  }

  // brique (en unités logiques, origine en haut à gauche) : 'n' normale, 's' blindée (hp = coups restants)
  function paintBrick(g, w, h, color, kind, hp) {
    g.fillStyle = 'rgba(2,6,12,0.92)';
    rr(g, 0, 0, w, h, 4); g.fill();
    const ix = 1.3, iy = 1.3, iw = w - 2.6, ih = h - 2.6;
    if (kind === 's') {
      const m = g.createLinearGradient(0, iy, 0, iy + ih);
      m.addColorStop(0, '#f3f7fa'); m.addColorStop(0.35, '#a9b6bf'); m.addColorStop(0.62, '#6c7b86'); m.addColorStop(1, '#3d4a54');
      g.fillStyle = m; rr(g, ix, iy, iw, ih, 3); g.fill();
      const cx = ix + 4.2, cy = iy + 3, cw = iw - 8.4, chh = ih - 6;
      const k = g.createLinearGradient(0, cy, 0, cy + chh);
      k.addColorStop(0, shade(color, 0.3)); k.addColorStop(0.5, shade(color, -0.15)); k.addColorStop(1, shade(color, -0.55));
      g.fillStyle = k; rr(g, cx, cy, cw, chh, 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, cx + 1.5, cy + 0.8, cw - 3, 1.6, 0.8); g.fill();
      for (const p of [[ix + 2.2, iy + 2.2], [ix + iw - 2.2, iy + 2.2], [ix + 2.2, iy + ih - 2.2], [ix + iw - 2.2, iy + ih - 2.2]]) {
        g.fillStyle = '#2f3a43'; g.beginPath(); g.arc(p[0], p[1], 1.25, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(p[0] - 0.35, p[1] - 0.35, 0.45, 0, TAU); g.fill();
      }
      // voyants : un par coup restant
      const n = Math.max(0, hp | 0), gap = 4.6, x0 = w / 2 - ((n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        g.fillStyle = rgba('#ffffff', 0.25); g.beginPath(); g.arc(x0 + i * gap, h / 2, 2.1, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x0 + i * gap, h / 2, 1.25, 0, TAU); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(ix + 3, iy + 0.6); g.lineTo(ix + iw - 3, iy + 0.6); g.stroke();
      return;
    }
    const b = g.createLinearGradient(0, iy, 0, iy + ih);
    b.addColorStop(0, shade(color, 0.5)); b.addColorStop(0.45, color); b.addColorStop(1, shade(color, -0.42));
    g.fillStyle = b; rr(g, ix, iy, iw, ih, 3.2); g.fill();
    // reflet vitré
    g.fillStyle = 'rgba(255,255,255,0.32)'; rr(g, ix + 2.2, iy + 1.3, iw - 4.4, ih * 0.36, 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)'; rr(g, ix + 2, iy + ih - 2.6, iw - 4, 1.6, 0.8); g.fill();
    g.strokeStyle = shade(color, 0.65); g.globalAlpha = 0.8; g.lineWidth = 0.9;
    rr(g, ix + 0.45, iy + 0.45, iw - 0.9, ih - 0.9, 3); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ix + 4, iy + 3.2, 0.9, 0, TAU); g.fill();
  }

  // pictogrammes des bonus (centrés sur l'origine, ~22 unités)
  function paintPowerIcon(g, type) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 2.2;
    g.beginPath();
    switch (type) {
      case 'big':
        g.moveTo(-9.5, 0); g.lineTo(9.5, 0);
        g.moveTo(-5.5, -4); g.lineTo(-10, 0); g.lineTo(-5.5, 4);
        g.moveTo(5.5, -4); g.lineTo(10, 0); g.lineTo(5.5, 4);
        g.stroke();
        break;
      case 'shrink':
        g.moveTo(-11, 0); g.lineTo(-3.5, 0); g.moveTo(-7, -3.6); g.lineTo(-3, 0); g.lineTo(-7, 3.6);
        g.moveTo(11, 0); g.lineTo(3.5, 0); g.moveTo(7, -3.6); g.lineTo(3, 0); g.lineTo(7, 3.6);
        g.stroke();
        break;
      case 'multi':
        g.lineWidth = 1.6;
        for (const p of [[-6.5, 2.2], [0, -2.6], [6.5, 2.2]]) {
          g.beginPath(); g.arc(p[0], p[1], 3.1, 0, TAU); g.fill();
        }
        break;
      case 'fire':
        g.moveTo(0, -8.5);
        g.bezierCurveTo(5.5, -2.5, 6.5, 2.5, 3.6, 6);
        g.quadraticCurveTo(0, 8.6, -3.6, 6);
        g.bezierCurveTo(-6.5, 2.5, -4, -1.5, -1.5, -3.2);
        g.quadraticCurveTo(-1.2, -0.5, 0.6, 0.4);
        g.quadraticCurveTo(1.2, -4, 0, -8.5);
        g.closePath(); g.fill();
        break;
      case 'shield':
        g.moveTo(0, -8); g.lineTo(6.8, -5.4); g.lineTo(6, 2); g.quadraticCurveTo(4, 6.2, 0, 8.4);
        g.quadraticCurveTo(-4, 6.2, -6, 2); g.lineTo(-6.8, -5.4); g.closePath();
        g.lineWidth = 1.9; g.stroke();
        g.beginPath(); g.moveTo(0, -4.5); g.lineTo(0, 4.8); g.moveTo(-3.6, -0.6); g.lineTo(3.6, -0.6); g.stroke();
        break;
      case 'glue':
        g.moveTo(-1, -8);
        g.bezierCurveTo(4.5, -1.5, 5, 5, -1, 5.4);
        g.bezierCurveTo(-7, 5, -6.5, -1.5, -1, -8);
        g.fill();
        g.beginPath(); g.arc(6, 4.4, 2.1, 0, TAU); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(-3, -0.5, 1.2, 2.4, 0.3, 0, TAU); g.fill();
        break;
      default: break;
    }
  }
  // capsule de bonus (34 x 18 unités, centrée)
  function paintCapsule(g, type) {
    const P = POWERS[type], c = P ? P.color : '#ffffff', w = 34, h = 18;
    const b = g.createLinearGradient(0, -h / 2, 0, h / 2);
    b.addColorStop(0, shade(c, 0.55)); b.addColorStop(0.5, c); b.addColorStop(1, shade(c, -0.45));
    g.fillStyle = b; rr(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
    g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,0.92)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.34)'; rr(g, -w / 2 + 4, -h / 2 + 2, w - 8, 5, 2.5); g.fill();
    g.save();
    g.translate(0, 0.5);
    g.scale(0.78, 0.78);
    g.save(); g.translate(0.8, 1.2); g.globalAlpha = 0.35;
    g.strokeStyle = '#000'; g.fillStyle = '#000'; paintPowerIcon(g, type);   // ombre
    g.restore();
    paintPowerIcon(g, type);
    g.restore();
  }

  // tête « autocollant » : la tête détourée + contour de couleur qui suit sa silhouette + ombre douce
  // h = hauteur de la tête en unités logiques, k = pixels par unité ; renvoie { cv, w, h } (unités, contour compris)
  function makeSticker(img, h, k, col, ow) {
    try {
      if (!imgOk(img)) return null;
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const Hp = Math.max(4, h * k), Wp = (Hp * iw) / ih, o = Math.max(1, ow * k), pad = Math.ceil(o + 3 * k);
      const cv = mkCanvas(Wp + pad * 2, Hp + pad * 2), c = cv.getContext('2d');
      const sil = mkCanvas(cv.width, cv.height), sc = sil.getContext('2d');
      sc.drawImage(img, pad, pad, Wp, Hp);
      sc.globalCompositeOperation = 'source-in';
      sc.fillStyle = col; sc.fillRect(0, 0, sil.width, sil.height);
      // ombre portée sombre
      const sh = mkCanvas(cv.width, cv.height), hc = sh.getContext('2d');
      hc.drawImage(img, pad, pad, Wp, Hp);
      hc.globalCompositeOperation = 'source-in';
      hc.fillStyle = 'rgba(0,0,0,0.55)'; hc.fillRect(0, 0, sh.width, sh.height);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.drawImage(sh, Math.cos(a) * o * 1.6, Math.sin(a) * o * 1.6 + o); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; c.drawImage(sil, Math.cos(a) * o, Math.sin(a) * o); }
      c.drawImage(img, pad, pad, Wp, Hp);
      return { cv, w: cv.width / k, h: cv.height / k };
    } catch (e) { return null; }
  }

  // avatar de secours (joueur invité) : rond à sa couleur + initiale
  function paintAvatar(g, name, col, r, sad, FD, t) {
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, shade(col, 0.55)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, -0.45));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.lineWidth = Math.max(1.5, r * 0.12); g.strokeStyle = '#0b141c'; g.stroke();
    g.lineWidth = Math.max(1, r * 0.06); g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(0, 0, r - g.lineWidth * 1.5, -2.6, -1.2); g.stroke();
    const ch = String(name || '?').trim().charAt(0).toUpperCase() || '?';
    g.font = Math.round(r * 1.05) + 'px ' + FD; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(11,20,28,0.85)'; g.fillText(ch, 0, r * 0.08 + (sad ? -r * 0.12 : 0));
    if (sad) {
      g.fillStyle = '#9fe0ff';
      for (const s of [-1, 1]) {
        const ty = r * 0.25 + ((t * 26 + (s > 0 ? 7 : 0)) % (r * 0.7));
        g.beginPath(); g.ellipse(s * r * 0.45, ty, r * 0.1, r * 0.17, 0, 0, TAU); g.fill();
      }
      g.strokeStyle = 'rgba(11,20,28,0.85)'; g.lineWidth = r * 0.09;
      g.beginPath(); g.arc(0, r * 0.62, r * 0.22, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
    }
  }

  // texte avec contour sombre arrondi (style de la borne)
  function strokeText(g, s, x, y, px, col, font, lw, bold) {
    g.font = (bold ? '600 ' : '') + px + 'px ' + font;
    g.lineJoin = 'round';
    g.lineWidth = lw == null ? Math.max(2, px * 0.2) : lw;
    g.strokeStyle = 'rgba(2,6,12,0.88)';
    if (g.lineWidth > 0) g.strokeText(s, x, y);
    g.fillStyle = col;
    g.fillText(s, x, y);
  }

  // ===========================================================================
  // Vignette « attract mode » : un vrai petit duel, vu de côté (P0 à gauche, P1 à droite)
  // ===========================================================================
  const PV = { w: 0, h: 0, last: -1, t: 0, glow: null, br: [], balls: [], pads: [], parts: [], caps: [], flash: 0, ring: [], regen: 0, sprites: null, scoreFx: 0 };
  function pvSprites() {
    if (PV.sprites) return PV.sprites;
    const k = 2;
    const sp = { k, brick: {}, caps: {} };
    for (const col of BRICK_COLS) {
      const cv = mkCanvas(11 * k, BH * k), c = cv.getContext('2d');
      c.scale(k, k);
      c.translate(11, 0); c.rotate(Math.PI / 2);          // brique debout (le terrain est vu de côté)
      paintBrick(c, BH, 11, col, 'n', 1);
      sp.brick[col] = cv;
    }
    sp.gA = mkGlow(PCOL0[0]); sp.gC = mkGlow(PCOL0[1]); sp.gW = mkGlow('#ffffff'); sp.gG = mkGlow('#ffd34d', true);
    for (const t of POWER_KEYS) {
      const cv = mkCanvas(40 * k, 24 * k), c = cv.getContext('2d');
      c.scale(k, k); c.translate(20, 12); paintCapsule(c, t);
      sp.caps[t] = cv;
    }
    PV.sprites = sp;
    return sp;
  }
  function pvInit(w, h) {
    PV.w = w; PV.h = h; PV.last = -1; PV.t = 0; PV.parts = []; PV.caps = []; PV.ring = []; PV.flash = 0;
    PV.pads = [{ y: h / 2, ty: h / 2, flash: 0, sad: 0 }, { y: h / 2, ty: h / 2, flash: 0, sad: 0 }];
    PV.balls = [
      { x: w * 0.3, y: h * 0.3, vx: 120, vy: 70, owner: 0, tr: [] },
      { x: w * 0.7, y: h * 0.7, vx: -120, vy: -64, owner: 1, tr: [] }
    ];
    pvWall();
  }
  function pvWall() {
    const w = PV.w, h = PV.h, rows = Math.max(5, Math.floor((h - 16) / BH)), y0 = (h - rows * BH) / 2;
    PV.br = [];
    for (let s = 0; s < 2; s++) {
      for (let c = 0; c < 3; c++) {
        for (let r = 0; r < rows; r++) {
          const d = Math.min(r, rows - 1 - r);
          if (c === 2 && d % 2 === 1) continue;
          const x = s === 0 ? w / 2 - 10 - (c + 1) * 11 : w / 2 + 10 + c * 11;
          PV.br.push({ x, y: y0 + r * BH, w: 11, h: BH, col: BRICK_COLS[(c + d + 2) % BRICK_COLS.length], alive: true, born: 0.05 * (c + d) });
        }
      }
    }
    PV.regen = 0;
  }
  function pvFace(ctx, x, y, r, col, sad, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r + 1.6, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r);
    g.addColorStop(0, '#ffe2c6'); g.addColorStop(1, '#e0a77c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2412'; ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.95, r * 0.45, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.arc(-r * 0.36, -r * 0.05, r * 0.13, 0, TAU); ctx.arc(r * 0.36, -r * 0.05, r * 0.13, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a2a2a'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
    ctx.beginPath();
    if (sad) ctx.arc(0, r * 0.62, r * 0.3, 1.15 * Math.PI, 1.85 * Math.PI); else ctx.arc(0, r * 0.2, r * 0.36, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    if (sad) { ctx.fillStyle = '#9fe0ff'; ctx.beginPath(); ctx.ellipse(-r * 0.36, r * 0.25 + ((t * 20) % (r * 0.6)), r * 0.09, r * 0.16, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function preview(ctx, w, h, t) {
    try {
      if (!PV.balls.length || PV.w !== w || PV.h !== h || t < PV.last) pvInit(w, h);
      const sp = pvSprites();
      let dt = PV.last < 0 ? 0 : t - PV.last;
      PV.last = t;
      dt = clamp(dt, 0, 0.05);
      PV.t += dt; PV.regen += dt;
      const r = 4.2, PX = [16, w - 16], PL = 40;
      // petits robots qui jouent
      for (let p = 0; p < 2; p++) {
        const pd = PV.pads[p];
        let best = null;
        for (const b of PV.balls) { const toward = p === 0 ? b.vx < 0 : b.vx > 0; if (toward && (!best || Math.abs(b.x - PX[p]) < Math.abs(best.x - PX[p]))) best = b; }
        pd.ty = best ? best.y + Math.sin(PV.t * 1.7 + p * 2) * 12 : h / 2;
        pd.y += clamp(pd.ty - pd.y, -150 * dt, 150 * dt);
        pd.y = clamp(pd.y, PL / 2 + 6, h - PL / 2 - 6);
        pd.flash = Math.max(0, pd.flash - dt * 4); pd.sad = Math.max(0, pd.sad - dt);
      }
      for (const b of PV.balls) {
        const n = 3;
        for (let s = 0; s < n; s++) {
          const st = dt / n;
          b.x += b.vx * st; b.y += b.vy * st;
          if (b.y < 6 + r) { b.y = 6 + r; b.vy = Math.abs(b.vy); }
          if (b.y > h - 6 - r) { b.y = h - 6 - r; b.vy = -Math.abs(b.vy); }
          for (const br of PV.br) {
            if (!br.alive || PV.regen < br.born) continue;
            const cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h), dx = b.x - cx, dy = b.y - cy;
            if (dx * dx + dy * dy < r * r) {
              br.alive = false;
              if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx); else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
              for (let i = 0; i < 7; i++) PV.parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: rand(-80, 80), vy: rand(-80, 80), life: rand(0.35, 0.7), max: 0.7, col: br.col, rot: rand(0, 6), s: rand(1.6, 3) });
              PV.ring.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, t: 0, col: br.col });
              if (Math.random() < 0.22) PV.caps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, to: b.owner, type: pick(POWER_KEYS) });
              break;
            }
          }
          for (let p = 0; p < 2; p++) {
            const pd = PV.pads[p], toward = p === 0 ? b.vx < 0 : b.vx > 0;
            if (!toward) continue;
            const face = p === 0 ? PX[0] + 4 : PX[1] - 4;
            if ((p === 0 ? b.x - r <= face && b.x > PX[0] - 6 : b.x + r >= face && b.x < PX[1] + 6) && Math.abs(b.y - pd.y) < PL / 2 + r) {
              const off = clamp((b.y - pd.y) / (PL / 2), -1, 1), sp0 = Math.min(230, Math.hypot(b.vx, b.vy) * 1.04), a = off * 55 * DEG;
              b.vx = (p === 0 ? 1 : -1) * Math.cos(a) * sp0; b.vy = Math.sin(a) * sp0; b.owner = p; pd.flash = 1;
              b.x = p === 0 ? face + r : face - r;
            }
          }
          if (b.x < -10 || b.x > w + 10) {
            const loser = b.x < 0 ? 0 : 1;
            PV.pads[loser].sad = 1.4; PV.flash = 1; PV.scoreFx = 1;
            PV.ring.push({ x: loser === 0 ? 4 : w - 4, y: b.y, t: 0, col: PCOL0[1 - loser], big: true });
            b.x = w / 2; b.y = h * (0.3 + Math.random() * 0.4); b.vx = (loser === 0 ? -1 : 1) * 105; b.vy = rand(-60, 60); b.owner = -1;
          }
        }
        b.tr.push(b.x, b.y);
        if (b.tr.length > 16) b.tr.splice(0, 2);
      }
      for (const c of PV.caps) { c.x += (c.to === 0 ? -1 : 1) * 70 * dt; }
      PV.caps = PV.caps.filter(c => c.x > -20 && c.x < w + 20);
      for (const q of PV.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy *= 0.94; q.rot += dt * 8; q.life -= dt; }
      PV.parts = PV.parts.filter(q => q.life > 0);
      for (const g of PV.ring) g.t += dt;
      PV.ring = PV.ring.filter(g => g.t < (g.big ? 0.7 : 0.35));
      PV.flash = Math.max(0, PV.flash - dt * 2.5); PV.scoreFx = Math.max(0, PV.scoreFx - dt);
      let alive = 0;
      for (const b of PV.br) if (b.alive) alive++;
      if (alive < PV.br.length * 0.45 || PV.regen > 12) pvWall();

      // --- rendu
      ctx.save();
      const bg = ctx.createLinearGradient(0, 0, w, 0);
      bg.addColorStop(0, '#1a1208'); bg.addColorStop(0.5, '#0b141c'); bg.addColorStop(1, '#06171d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 20) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y <= h; y += 20) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5; ctx.drawImage(sp.gA, -70, h / 2 - 110, 140, 220); ctx.drawImage(sp.gC, w - 70, h / 2 - 110, 140, 220);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // allée centrale
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = -PV.t * 14;
      ctx.strokeStyle = 'rgba(233,240,243,0.22)'; ctx.beginPath(); ctx.moveTo(w / 2, 6); ctx.lineTo(w / 2, h - 6); ctx.stroke();
      ctx.setLineDash([]);
      for (const br of PV.br) {
        if (!br.alive) continue;
        const k = clamp((PV.regen - br.born) / 0.3, 0, 1);
        if (k <= 0) continue;
        ctx.globalAlpha = k;
        ctx.drawImage(sp.brick[br.col], br.x, br.y + (1 - k) * 6, br.w, br.h);
      }
      ctx.globalAlpha = 1;
      for (const c of PV.caps) ctx.drawImage(sp.caps[c.type], c.x - 13, c.y - 8, 26, 16);
      for (const q of PV.parts) {
        ctx.globalAlpha = clamp(q.life / q.max * 1.5, 0, 1);
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.col;
        ctx.beginPath(); ctx.moveTo(-q.s, -q.s * 0.6); ctx.lineTo(q.s, -q.s * 0.2); ctx.lineTo(-q.s * 0.2, q.s); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (const g of PV.ring) {
        const k = g.t / (g.big ? 0.7 : 0.35);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = g.col; ctx.lineWidth = (g.big ? 4 : 2) * (1 - k) + 0.5;
        ctx.beginPath(); ctx.arc(g.x, g.y, 4 + k * (g.big ? 70 : 16), 0, TAU); ctx.stroke();
      }
      for (const b of PV.balls) {
        const col = b.owner < 0 ? '#ffffff' : PCOL0[b.owner], gl = b.owner === 0 ? sp.gA : b.owner === 1 ? sp.gC : sp.gW;
        ctx.strokeStyle = col; ctx.lineCap = 'round';
        for (let i = 2; i < b.tr.length; i += 2) {
          ctx.globalAlpha = (i / b.tr.length) * 0.5; ctx.lineWidth = (i / b.tr.length) * 6;
          ctx.beginPath(); ctx.moveTo(b.tr[i - 2], b.tr[i - 1]); ctx.lineTo(b.tr[i], b.tr[i + 1]); ctx.stroke();
        }
        ctx.globalAlpha = 0.9; ctx.drawImage(gl, b.x - 16, b.y - 16, 32, 32);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const b of PV.balls) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, r - 0.8, 0, TAU); ctx.fill(); }
      // raquettes + têtes
      for (let p = 0; p < 2; p++) {
        const pd = PV.pads[p], col = PCOL0[p], x = PX[p];
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + pd.flash * 0.4;
        ctx.drawImage(p === 0 ? sp.gA : sp.gC, x - 16, pd.y - PL / 2 - 12, 32, PL + 24);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
        g.addColorStop(0, p === 0 ? shade(col, -0.4) : '#ffffff'); g.addColorStop(0.5, col); g.addColorStop(1, p === 0 ? '#ffffff' : shade(col, -0.4));
        ctx.fillStyle = g; rr(ctx, x - 4, pd.y - PL / 2, 8, PL, 4); ctx.fill();
        pvFace(ctx, p === 0 ? x - 4 : x + 4, pd.y, 10.5, col, pd.sad > 0, PV.t);
      }
      if (PV.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (PV.flash * 0.18).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h); }
      // cadre néon
      ctx.strokeStyle = 'rgba(255,166,48,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(1, 4); ctx.lineTo(1, h - 4); ctx.stroke();
      ctx.strokeStyle = 'rgba(94,240,255,0.7)';
      ctx.beginPath(); ctx.moveTo(w - 1, 4); ctx.lineTo(w - 1, h - 4); ctx.stroke();
      ctx.restore();
    } catch (e) { /* jamais d'erreur dans la vignette */ }
  }

  // ===========================================================================
  // Jeu
  // ===========================================================================
  const HEAD_H = 50;                       // hauteur de la tête des joueurs (unités)
  const CHEAD_H = 36;                      // tête des copains sur les briques

  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || FD0;
    const FB = (api.fonts && api.fonts.body) || FB0;
    // palette : on ne garde que des couleurs #rrggbb valides (les dégradés n'acceptent rien d'autre)
    const COL = { night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
      amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a' };
    if (api.colors) for (const k in COL) if (/^#[0-9a-f]{6}$/i.test(String(api.colors[k] || ''))) COL[k] = api.colors[k];
    const PLAYERS = [0, 1].map(i => {
      const p = (api.players && api.players[i]) || {};
      const col = /^#[0-9a-f]{6}$/i.test(String(p.color || '')) ? p.color : PCOL0[i];
      return { name: String(p.name || (i ? 'JOUEUR 2' : 'JOUEUR 1')).slice(0, 16), img: p.img || null, sad: p.sad || null, color: col };
    });
    const PC = [PLAYERS[0].color, PLAYERS[1].color];
    let destroyed = false, paused = false;
    // --- jeu en ligne (api.net) : sans lui, rien ne change
    const NET = api.net && (api.net.role === 'host' || api.net.role === 'guest') && typeof api.net.send === 'function' ? api.net : null;
    const HOST = !!NET && NET.role === 'host', GUEST = !!NET && NET.role === 'guest';
    const ME = GUEST ? 1 : 0;                               // le joueur de CET appareil
    const FLIP = GUEST && !!NET.flipped;                    // écran de l'invité tourné de 180° par la bibliothèque
    // --- contre l'IA (api.ai) : jamais en ligne ; la raquette du joueur api.ai.p (en haut) est jouée par l'ordinateur
    const AIC = !NET && api.ai && typeof api.ai === 'object' ? api.ai : null;
    const AIP = AIC ? (AIC.p === 0 ? 0 : 1) : -1;
    // --- vue solo (contre l'IA ou en ligne : un seul lecteur par écran) : tous les textes tournés vers lui,
    // l'adversaire réduit à une étiquette « nom ». En local (deux sur le même téléphone), rien ne change.
    const SOLO = !!(api.ai || api.net);
    const VIEWER = (api.net && api.net.flipped) ? 1 : 0;      // repère du lecteur : 1 = invité (root tourné par la bibliothèque)
    const OPP = 1 - VIEWER;
    const coarse = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();

    // --- sons (sobres) et vibrations
    const gate = {};
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (api.audio && api.audio.tone) api.audio.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (api.audio && api.audio.noise) api.audio.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) { const t = V.rt; if (gate[ch] != null && t - gate[ch] < gap) return false; gate[ch] = t; return true; }
    function later(d, fn) { if (V.sq.length < 40) V.sq.push({ t: V.rt + d, fn }); }
    function vibrate(ms) { if (destroyed || paused) return; try { if (api.vibrate) api.vibrate(ms); } catch (e) { /* rien */ } }

    // --- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // --- têtes des copains (briques-têtes) : de préférence pas les deux joueurs
    function fetchHeads() {
      let list = [];
      try { const h = api.heads ? api.heads() : null; if (Array.isArray(h)) list = h.filter(x => x && imgOk(x.img)); } catch (e) { list = []; }
      const names = PLAYERS.map(p => p.name);
      const others = list.filter(x => names.indexOf(String(x.name || '')) < 0);
      return (others.length ? others : list).slice(0, 12);
    }

    // --- simulation
    const S = newSim((Math.random() * 4294967296) >>> 0);
    S.nh = HOST;
    if (HOST) S.onRec = (rec, b) => nlog(['rec', rec.id, r3(rec.g), Math.round(b.x), Math.round(b.vx), Math.round(b.vy)]);
    const inputs = [{ dx: 0, target: null, dir: 0, release: false }, { dx: 0, target: null, dir: 0, release: false }];

    // --- état de l'affichage (cosmétique : Math.random autorisé ici)
    const V = {
      rt: 0, sq: [], parts: [], rings: [], floats: [], cries: [], trails: new Map(), cracks: new Map(), hitFx: new Map(),
      shake: 0, flash: 0, flashCol: '#ffffff', freeze: 0, chain: 0,
      padFlash: [0, 0], squash: [0, 0], danger: [0, 0], happy: [0, 0], sadPad: [false, false], goalFlash: [0, 0], powFx: [0, 0], powCol: ['#fff', '#fff'],
      big: null, explain: [0, 0], explainOn: [false, false], heads: [], countN: 0,
      overT: -1, winner: -1, resumeT: 0, resumeN: 0, touches: new Map(), stars: null, netT: 0, lastPoint: null, err: 0
    };

    // --- dimensions
    let cw = 1, ch = 1, dpr = 1, scale = 1, offX = 0, offY = 0, K = 1;
    let bg = null, nebImg = null, planets = null, nebs = null;
    const sprites = new Map(), stickers = new Map();
    const GLW = mkGlow('#ffffff'), GLP = [mkGlow(PC[0]), mkGlow(PC[1])], GLF = mkFire(), GLH = [mkGlow(PC[0], true), mkGlow(PC[1], true)];
    const glowCache = new Map();
    function glowOf(col) { let g = glowCache.get(col); if (!g) { g = mkGlow(col); glowCache.set(col, g); } return g; }

    function resize() {
      const r = root.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (Math.abs(r.width - cw) < 0.5 && Math.abs(r.height - ch) < 0.5 && nd === dpr) return;   // rien n'a changé
      cw = r.width; ch = r.height;
      dpr = nd;
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      scale = Math.min(cw / W, ch / H);
      offX = (cw - W * scale) / 2;
      offY = (ch - H * scale) / 2;
      K = scale * dpr;
      sprites.clear(); stickers.clear(); bg = null; V.stars = null;
      if (paused) render();
    }

    // --- sprites pré-rendus à la bonne résolution
    function brickSprite(color, kind, hp, flip) {
      const key = color + kind + hp + (flip ? 'f' : '');
      let s = sprites.get(key);
      if (!s) {
        s = mkCanvas(BW * K, BH * K);
        const c = s.getContext('2d');
        c.scale(s.width / BW, s.height / BH);
        if (flip) { c.translate(BW, BH); c.rotate(Math.PI); }
        paintBrick(c, BW, BH, color, kind, hp);
        sprites.set(key, s);
      }
      return s;
    }
    function capSprite(type) {
      const key = 'cap' + type;
      let s = sprites.get(key);
      if (!s) {
        s = mkCanvas(40 * K, 24 * K);
        const c = s.getContext('2d');
        c.scale(K, K); c.translate(20, 12);
        paintCapsule(c, type);
        sprites.set(key, s);
      }
      return s;
    }
    function iconSprite(type) {
      const key = 'ico' + type;
      let s = sprites.get(key);
      if (!s) {
        s = mkCanvas(18 * K, 18 * K);
        const c = s.getContext('2d');
        c.scale(K, K); c.translate(9, 9);
        const P = POWERS[type];
        c.fillStyle = 'rgba(4,10,16,0.9)'; c.beginPath(); c.arc(0, 0, 8.4, 0, TAU); c.fill();
        c.fillStyle = P.color; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill();
        c.scale(0.52, 0.52); paintPowerIcon(c, type);
        sprites.set(key, s);
      }
      return s;
    }
    function playerSticker(p, sad, k, h) {
      const P = PLAYERS[p], src = sad ? (imgOk(P.sad) ? P.sad : P.img) : P.img;
      if (!imgOk(src)) return null;
      const key = 'p' + p + (sad ? 's' : 'h') + '|' + k.toFixed(3) + '|' + h;
      if (stickers.has(key)) return stickers.get(key);
      const s = makeSticker(src, h, k, P.color, 2.3);
      stickers.set(key, s);
      return s;
    }
    function friendSticker(i, sad) {
      const hd = V.heads[i];
      if (!hd) return null;
      const src = sad ? (imgOk(hd.sad) ? hd.sad : hd.img) : hd.img;
      if (!imgOk(src)) return null;
      const key = 'c' + i + (sad ? 's' : 'h') + '|' + K.toFixed(3);
      if (stickers.has(key)) return stickers.get(key);
      const s = makeSticker(src, CHEAD_H, K, '#ffffff', 1.6);
      stickers.set(key, s);
      return s;
    }

    // --- images d'ILO (facultatives) : une nébuleuse en fond, quelques planètes dans les marges
    try {
      const pr = api.assets ? api.assets('ilo') : null;
      if (pr && typeof pr.then === 'function') {
        pr.then(a => {
          if (destroyed || !a) return;
          const n = (a.nebulas || []).filter(imgOk), p = (a.planets || []).filter(imgOk);
          if (n.length) { nebs = n; nebImg = n[(S.matchSeed >>> 3) % n.length]; }
          if (p.length) planets = p;
          bg = null;
        }, () => { /* sans images : le fond procédural suffit */ });
      }
    } catch (e) { /* rien */ }

    // --- fond pré-rendu (statique) : dégradé, nébuleuse, sol quadrillé, camps, allée, buts, bords, marges
    function getBg() {
      if (bg) return bg;
      const c = mkCanvas(canvas.width, canvas.height), g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const lg = g.createLinearGradient(0, 0, 0, ch);
      lg.addColorStop(0, '#03141b'); lg.addColorStop(0.5, '#0a0f1a'); lg.addColorStop(1, '#170f05');
      g.fillStyle = lg; g.fillRect(0, 0, cw, ch);
      g.save();
      g.globalCompositeOperation = 'lighter';
      // nébuleuse : l'image d'ILO, sinon des nuages procéduraux ; recolorée comme dans Galaxy Wars
      // (cyan en haut, violet au milieu, ambre en bas : les couleurs des deux joueurs)
      try {
        const T = 512, nc = mkCanvas(T, T), nx = nc.getContext('2d');
        if (nebImg) nx.drawImage(nebImg, 0, 0, T, T);
        else {
          const q = mulberry32(S.matchSeed ^ 0x5bd1e995);
          nx.fillStyle = '#000'; nx.fillRect(0, 0, T, T);
          for (let i = 0; i < 26; i++) {
            const x = q() * T, y = q() * T, r = T * (0.12 + 0.3 * q()), l = 40 + 70 * q();
            const rg = nx.createRadialGradient(x, y, 0, x, y, r);
            rg.addColorStop(0, 'rgba(' + (l | 0) + ',' + ((l * 0.85) | 0) + ',' + ((l * 0.5) | 0) + ',0.55)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            nx.fillStyle = rg; nx.fillRect(0, 0, T, T);
          }
        }
        nx.globalCompositeOperation = 'color';
        const cg = nx.createLinearGradient(0, 0, 0, T);
        cg.addColorStop(0, PC[1]); cg.addColorStop(0.5, '#7c5cff'); cg.addColorStop(1, PC[0]);
        nx.fillStyle = cg; nx.fillRect(0, 0, T, T);
        if (nebImg) { nx.globalCompositeOperation = 'destination-in'; nx.drawImage(nebImg, 0, 0, T, T); }
        const sw = Math.max(cw, ch * 0.75) * 1.1, sh = Math.max(ch, cw) * 1.05;
        g.globalAlpha = nebImg ? 0.95 : 0.8;
        g.drawImage(nc, cw / 2 - sw / 2, ch / 2 - sh / 2, sw, sh);
      } catch (e) { /* rien */ }
      g.restore();
      // planètes dans les marges (écrans larges)
      if (planets && offX > 60) {
        const ps = [[offX * 0.5, ch * 0.2, Math.min(offX * 0.8, 220), 3], [cw - offX * 0.45, ch * 0.78, Math.min(offX * 0.95, 260), 11], [offX * 0.35, ch * 0.88, Math.min(offX * 0.4, 90), 20]];
        for (const q of ps) {
          try { g.globalAlpha = 0.4; g.drawImage(planets[q[3] % planets.length], q[0] - q[2] / 2, q[1] - q[2] / 2, q[2], q[2]); } catch (e) { /* rien */ }
        }
        g.globalAlpha = 1;
      }
      // vignettage : les coins s'assombrissent, le regard va au centre
      const vg = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = vg; g.fillRect(0, 0, cw, ch);
      // --- terrain
      g.save();
      g.translate(offX, offY); g.scale(scale, scale);
      const top = -offY / scale, bot = H + offY / scale;
      g.fillStyle = 'rgba(4,9,15,0.5)'; g.fillRect(0, top, W, bot - top);
      // sol quadrillé
      g.lineWidth = 1 / scale;
      g.strokeStyle = 'rgba(160,210,255,0.045)';
      g.beginPath();
      for (let x = 0; x <= W + 0.1; x += 20) { g.moveTo(x, top); g.lineTo(x, bot); }
      for (let y = MID % 20; y <= bot; y += 20) { g.moveTo(0, y); g.lineTo(W, y); }
      for (let y = MID - 20; y >= top; y -= 20) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      g.strokeStyle = 'rgba(160,210,255,0.07)';
      g.beginPath();
      for (let x = 0; x <= W + 0.1; x += 80) { g.moveTo(x, top); g.lineTo(x, bot); }
      g.stroke();
      // camps : lueur de la couleur de chaque joueur depuis son bord
      for (let p = 0; p < 2; p++) {
        const y0 = p === 0 ? bot : top, y1 = p === 0 ? MID + 40 : MID - 40;
        const cg = g.createLinearGradient(0, y0, 0, y1);
        cg.addColorStop(0, rgba(PC[p], 0.2)); cg.addColorStop(0.35, rgba(PC[p], 0.07)); cg.addColorStop(1, rgba(PC[p], 0));
        g.fillStyle = cg;
        g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
      }
      // zone de but derrière chaque raquette
      for (let p = 0; p < 2; p++) {
        const yA = p === 0 ? PY[0] + 8 : top, yB = p === 0 ? bot : PY[1] - 8;
        const zg = g.createLinearGradient(0, p === 0 ? yA : yB, 0, p === 0 ? yB : yA);
        zg.addColorStop(0, rgba(PC[p], 0)); zg.addColorStop(1, rgba(PC[p], 0.13));
        g.fillStyle = zg; g.fillRect(0, yA, W, yB - yA);
      }
      // allée centrale
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, MID - LANE, W, LANE * 2);
      g.fillStyle = 'rgba(233,240,243,0.07)'; g.fillRect(0, MID - LANE, W, 1); g.fillRect(0, MID + LANE - 1, W, 1);
      g.strokeStyle = 'rgba(233,240,243,0.08)'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(W / 2, MID, 22, 0, TAU); g.stroke();
      // lignes de but (néon)
      for (let p = 0; p < 2; p++) {
        const y = p === 0 ? H : 0;
        g.save(); g.globalCompositeOperation = 'lighter';
        const ng = g.createLinearGradient(0, y - 14, 0, y + 14);
        ng.addColorStop(0, rgba(PC[p], 0)); ng.addColorStop(0.5, rgba(PC[p], 0.5)); ng.addColorStop(1, rgba(PC[p], 0));
        g.fillStyle = ng; g.fillRect(0, y - 14, W, 28);
        g.restore();
        g.fillStyle = rgba(PC[p], 0.9); g.fillRect(0, y - 1, W, 2);
      }
      // bords latéraux : tubes néon (cyan en haut, ambre en bas)
      for (const x of [0, W]) {
        const sg = g.createLinearGradient(0, top, 0, bot);
        sg.addColorStop(0, rgba(PC[1], 0.85)); sg.addColorStop(0.47, rgba(PC[1], 0.25)); sg.addColorStop(0.53, rgba(PC[0], 0.25)); sg.addColorStop(1, rgba(PC[0], 0.85));
        g.fillStyle = sg; g.fillRect(x - 1.2, top, 2.4, bot - top);
      }
      g.restore();
      // marges : ombre + liseré
      if (offX > 1) {
        g.fillStyle = 'rgba(1,3,8,0.45)'; g.fillRect(0, 0, offX, ch); g.fillRect(cw - offX, 0, offX, ch);
        for (const x of [offX - 4, cw - offX + 2]) {
          const eg = g.createLinearGradient(0, 0, 0, ch);
          eg.addColorStop(0, rgba(PC[1], 0)); eg.addColorStop(0.25, rgba(PC[1], 0.5)); eg.addColorStop(0.5, 'rgba(255,255,255,0.15)');
          eg.addColorStop(0.75, rgba(PC[0], 0.5)); eg.addColorStop(1, rgba(PC[0], 0));
          g.fillStyle = eg; g.fillRect(x, 0, 2, ch);
        }
      }
      bg = c;
      return c;
    }
    // étoiles scintillantes (espace écran)
    function initStars() {
      const n = clamp(Math.round((cw * ch) / 5200), 40, 160);
      V.stars = [];
      for (let i = 0; i < n; i++) {
        const far = Math.random() < 0.7;
        V.stars.push({ x: Math.random() * cw, y: Math.random() * ch, s: far ? 1 : 1.8, ph: Math.random() * TAU, sp: 0.6 + Math.random() * 1.8, a: far ? 0.2 + Math.random() * 0.3 : 0.45 + Math.random() * 0.4, vx: far ? 1.5 : 4.5 });
      }
    }

    // --- effets
    function addPart(o) { if (V.parts.length >= 300) V.parts.splice(0, V.parts.length - 299); V.parts.push(o); return o; }
    function sparks(x, y, n, img, spd, life, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        addPart({ k: 'g', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.7), max: life, s0: size * (0.6 + Math.random() * 0.6), s1: 0, img, drag: 2.6 });
      }
    }
    function shards(x, y, n, col, spd, w, h, vx0, vy0) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.25 + Math.random() * 0.9);
        addPart({ k: 's', x: x + rand(-w / 2, w / 2), y: y + rand(-h / 2, h / 2), vx: Math.cos(a) * v + (vx0 || 0) * 0.18, vy: Math.sin(a) * v + (vy0 || 0) * 0.18,
          life: rand(0.45, 0.9), max: 0.9, size: rand(1.8, 4.2), rot: rand(0, TAU), vr: rand(-12, 12), col: Math.random() < 0.18 ? '#ffffff' : col, drag: 2.2 });
      }
    }
    function flashAt(x, y, size, life, img, grow) { addPart({ k: 'g', x, y, vx: 0, vy: 0, life, max: life, s0: size, s1: size * (grow || 1.7), img, drag: 0 }); }
    function ring(x, y, r0, r1, life, col, w) { if (V.rings.length >= 24) V.rings.shift(); V.rings.push({ x, y, r0, r1, life, max: life, col, w }); }
    function addFloat(p, x, y, text, col, size, life, body) {
      if (V.floats.length >= 24) V.floats.shift();
      V.floats.push({ p, x, y, text, col, size, life, max: life, body: !!body });
    }
    function addCrack(br) {
      const lines = [];
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n; i++) {
        let x = rand(0.2, 0.8), y = Math.random() < 0.5 ? 0 : 1;
        const line = [[x, y]];
        for (let j = 0; j < 3; j++) { x = clamp(x + rand(-0.25, 0.25), 0.05, 0.95); y = clamp(y + (y < 0.5 ? 1 : -1) * rand(0.2, 0.4), 0.05, 0.95); line.push([x, y]); }
        lines.push(line);
      }
      const old = V.cracks.get(br.id);
      V.cracks.set(br.id, old ? old.concat(lines) : lines);
    }

    // --- événements de la simulation → effets, sons, points
    function drainEvents() {
      if (!S.ev.length) return;
      const evs = S.ev;
      S.ev = [];
      for (const e of evs) {
        // rejeu d'un passage (hôte) : rebonds sur les côtés et bouclier déjà montrés pendant le trajet provisoire
        if (!(e.rp && (e.k === 'wall' || e.k === 'shield'))) { try { onEvent(e); } catch (err) { /* un effet raté ne doit jamais casser la partie */ } }
        // trajet provisoire ou rejeu : l'invité montre lui-même ces rebonds (il prédit cette balle), on ne les lui envoie pas
        if (HOST && !((e.pv || e.rp) && (e.k === 'wall' || e.k === 'shield'))) { try { netEv(e); } catch (err) { /* rien */ } }
      }
    }
    function onEvent(e) {
      switch (e.k) {
        case 'round': onRound(e.round); break;
        case 'go': {
          tone(880, 0.16, 'square', 0.045, 1320);
          for (const s of S.serve) { ring(s.x, s.y, 4, 46, 0.45, '#ffffff', 3); sparks(s.x, s.y, 10, GLW, 140, 0.4, 9); }
          V.shake = Math.max(V.shake, 2);
          break;
        }
        case 'paddle': {
          const p = e.p;
          V.padFlash[p] = 1; V.squash[p] = 1; V.chain = 0;
          if (e.sp > 380) V.shake = Math.max(V.shake, (e.sp - 380) / 90);
          ring(e.x, e.y + (p === 0 ? BR : -BR), 3, 24, 0.3, PC[p], 2.4);
          sparks(e.x, e.y, 6 + Math.round(e.sp / 90), GLP[p], 110 + e.sp * 0.2, 0.35, 8);
          const f = 300 + Math.abs(e.off) * 170 + (e.sp - 230) * 0.6;
          if (canPlay('pad' + p, 0.03)) tone(f, 0.075, 'triangle', 0.06, f * 1.5);
          if (e.fire) { flashAt(e.x, e.y, 30, 0.25, GLF); noise(0.12, 0.06, 1400); }
          if (V.explainOn[p]) V.explainOn[p] = false;
          if (e.sp > 380) rumble('tick', p);                  // grosse frappe : petit choc dans la manette de ce joueur
          break;
        }
        case 'wall': {
          sparks(e.x, e.y, 3, e.owner >= 0 ? GLP[e.owner] : GLW, 70, 0.25, 6);
          if (canPlay('wall', 0.05)) tone(200, 0.035, 'triangle', 0.025, 160);
          break;
        }
        case 'chip': {
          const br = e.br;
          addCrack(br);
          V.hitFx.set(br.id, 1);
          shards(e.x, e.y, 4, br.kind === 's' ? '#c9d3da' : br.color, 70, 6, 6);
          sparks(e.x, e.y, 4, GLW, 90, 0.25, 6);
          V.shake = Math.max(V.shake, 1.4);
          if (br.kind === 'h' || br.kind === 'g') {
            const o = owner0(e.owner, br.p);
            addFloat(o, br.x + br.w / 2, br.y + (br.p === 0 ? -4 : br.h + 4), br.kind === 'h' ? pick(['Aïe !', 'Ouille !', 'Hé !']) : 'Encore un !', '#ffffff', 12, 0.8);
            tone(300, 0.08, 'square', 0.035, 200);
          } else if (canPlay('chip', 0.03)) { tone(210, 0.06, 'square', 0.03, 140); noise(0.04, 0.05, 1800); }
          break;
        }
        case 'break': onBreak(e); break;
        case 'cap': {
          flashAt(e.x, e.y, 34, 0.3, glowOf(POWERS[e.type].color));
          if (canPlay('cap', 0.06)) tone(880, 0.06, 'sine', 0.03, 1320);
          break;
        }
        case 'power': onPower(e); rumble('tick', e.p); if (A && e.p === AIP) { A.stats.caps = (A.stats.caps || 0) + 1; A.stats['cap_' + e.type] = (A.stats['cap_' + e.type] || 0) + 1; } break;
        case 'shield': {
          const p = e.p;
          ring(e.x, e.y, 6, 70, 0.5, '#9fe8ff', 4);
          sparks(e.x, e.y, 22, glowOf('#3fb6e8'), 200, 0.5, 10);
          flashAt(e.x, e.y, 70, 0.3, glowOf('#3fb6e8'));
          V.shake = Math.max(V.shake, 5);
          addFloat(p, clamp(e.x, 60, W - 60), p === 0 ? PY[0] - 30 : PY[1] + 30, 'SAUVÉ !', '#9fe8ff', 17, 1.1);
          tone(1250, 0.22, 'sine', 0.06, 480); noise(0.18, 0.1, 3000);
          vibrate(35); rumble('hit', p);
          break;
        }
        case 'stick': {
          flashAt(e.x, e.y, 26, 0.25, glowOf('#ffd34d'));
          tone(180, 0.08, 'sine', 0.05, 120);
          break;
        }
        case 'launch': tone(520, 0.06, 'triangle', 0.045, 900); break;
        case 'sudden': {
          for (let p = 0; p < 2; p++) {
            if (SOLO && p !== VIEWER) continue;                // vue solo : une seule fois, pour le lecteur
            const yy = MID + wallFront(S) + 40;
            addFloat(p, W / 2, p === 0 ? yy : H - yy, 'MORT SUBITE !', COL.alarm, 20, 2.2);
            addFloat(p, W / 2, p === 0 ? yy + 25 : H - yy - 25, 'Les raquettes rétrécissent…', '#ffffff', 12, 2.2, true);
          }
          V.flash = 0.25; V.flashCol = COL.alarm; V.shake = Math.max(V.shake, 4);
          tone(220, 0.3, 'sawtooth', 0.05, 110); later(0.3, () => tone(196, 0.4, 'sawtooth', 0.05, 98));
          break;
        }
        case 'goal': onGoal(e); break;
        case 'next': if (!GUEST) beginRound(); break;
        default: break;
      }
    }
    // pour qui est le texte : celui qui a cassé, sinon le joueur du camp
    function owner0(owner, half) { return owner === 0 || owner === 1 ? owner : half; }

    function onBreak(e) {
      const br = e.br, cx = e.x, cy = e.y;
      V.cracks.delete(br.id);
      V.chain++;
      const big = br.kind === 'h' || br.kind === 'g';
      const col = br.kind === 's' ? '#c9d3da' : br.kind === 'g' ? '#ffd34d' : br.color;
      addPart({ k: 'b', x: cx, y: cy, w: br.w, h: br.h, vx: 0, vy: 0, life: 0.22, max: 0.22, col: shade(col, 0.35), drag: 0 });
      shards(cx, cy, big ? 22 : br.kind === 's' ? 12 : 9, col, big ? 170 : 120, br.w, br.h, e.vx, e.vy);
      flashAt(cx, cy, big ? 90 : 46, big ? 0.32 : 0.2, glowOf(br.kind === 's' ? '#e6f0f5' : col));
      sparks(cx, cy, big ? 16 : 5, e.fire ? GLF : GLW, big ? 200 : 110, 0.35, big ? 10 : 7);
      if (e.fire) flashAt(cx, cy, 40, 0.3, GLF);
      ring(cx, cy, 4, big ? 60 : 26, big ? 0.45 : 0.28, col, big ? 3.2 : 2);
      V.shake = Math.max(V.shake, big ? 5 : 2.2);
      if (canPlay('brk', 0.035)) {
        const f = 520 * Math.pow(2, Math.min(V.chain, 12) / 12);
        tone(f, 0.06, 'triangle', 0.045, f * 1.35);
        noise(0.05, 0.06, 3200);
      }
      if (br.kind === 'h') {
        const o = owner0(e.owner, br.p), hd = V.heads[br.head], name = hd ? String(hd.name || 'COPAIN').slice(0, 12) : 'COPAIN';
        V.cries.push({ i: br.head, p: br.p, x: cx, y: cy, vx: rand(-30, 30), vy: (br.p === 0 ? -1 : 1) * 70, rot: 0, vr: rand(-1.6, 1.6), t: 0, tearT: 0 });
        if (V.cries.length > 4) V.cries.shift();
        addFloat(o, cx, cy + (o === 0 ? -26 : 26), pick([name + ' pleure !', 'Snif… ' + name + ' !', 'Pauvre ' + name + ' !', 'Pardon ' + name + ' !']), COL.spray, 14, 1.6);
        [[392, 370], [370, 349], [349, 330], [330, 247]].forEach((n, i) => later(0.08 + i * 0.2, () => tone(n[0], i === 3 ? 0.42 : 0.18, 'triangle', 0.05, n[1])));
        V.freeze = Math.max(V.freeze, 0.05);
        vibrate(25);
      } else if (br.kind === 'g') {
        [784, 988, 1175, 1568].forEach((f, i) => later(i * 0.06, () => tone(f, 0.1, 'triangle', 0.04)));
        sparks(cx, cy, 14, glowOf('#ffd34d'), 160, 0.6, 9);
      }
    }

    function onPower(e) {
      const p = e.p, P = POWERS[e.type], o = 1 - p;
      V.powFx[p] = 1; V.powCol[p] = P.color;
      const px = S.pl[p].x;
      ring(px, PY[p], 6, 60, 0.45, P.color, 3);
      sparks(px, PY[p], 14, glowOf(P.color), 170, 0.45, 9);
      addFloat(p, clamp(px, 70, W - 70), p === 0 ? PY[0] - 34 : PY[1] + 34, P.label, P.color, 14, 1.3);
      if (e.type === 'shrink') {
        const ox = S.pl[o].x;
        addFloat(o, clamp(ox, 70, W - 70), o === 0 ? PY[0] - 34 : PY[1] + 34, 'RAQUETTE MINI !', COL.alarm, 14, 1.3);
        ring(ox, PY[o], 50, 8, 0.4, COL.alarm, 3);
        V.powFx[o] = 1; V.powCol[o] = COL.alarm;
        later(0.12, () => tone(420, 0.2, 'sawtooth', 0.035, 170));
      }
      if (e.type === 'multi') { tone(660, 0.07, 'square', 0.04, 990); later(0.07, () => tone(880, 0.09, 'square', 0.04, 1320)); }
      else if (e.type === 'fire') { noise(0.25, 0.09, 1300); tone(200, 0.25, 'sawtooth', 0.04, 620); }
      else { tone(523, 0.07, 'triangle', 0.05, 784); later(0.08, () => tone(784, 0.1, 'triangle', 0.05, 1046)); }
    }

    function onGoal(e) {
      const s = e.p, c = 1 - s, gx = e.x, gy = c === 0 ? H : 0;
      let res = null;
      rumble('big', c);                                       // celui qui encaisse le but le sent
      if (GUEST) res = e.ov ? { over: true } : null;        // l'invité ne décide de rien : l'hôte a déjà compté le point
      else {
        // pourquoi ? (petit mot pour la bannière de la bibliothèque)
        let why = pick(['But !', 'Imparable !', 'Dans le mille !', 'Trop fort !']);
        if (e.fire) why = 'Balle de feu !';
        else if (e.owner === c) why = pick(['Retour à l’envoyeur !', 'Le mur a renvoyé !', 'Ricochet fatal !']);
        else if (e.owner < 0) why = 'Pris par surprise !';
        else if (e.shrunk) why = 'Raquette mini !';
        else if (e.multi) why = 'Avalanche !';
        else if (e.rally >= 8) why = 'Quel échange !';
        try { res = api.point ? api.point(s, why) : null; } catch (err) { res = null; }
        e.ov = res && res.over ? 1 : 0;
      }
      if (res && res.over) { S.matchOver = true; S.phase = 'over'; V.overT = 0; V.winner = s; }
      V.lastPoint = { s, x: gx, t: 0 };
      // gros effet : arrêt sur image, flash, ondes de choc, gerbe d'étincelles, tremblement
      V.freeze = 0.09;
      V.flash = 0.42; V.flashCol = PC[s];
      V.shake = 13;
      V.goalFlash[c] = 1;
      V.sadPad[c] = true; V.happy[s] = 1;
      V.big = { p: c, t: 0, x: clamp(gx, 76, W - 76) };
      ring(gx, gy, 8, 190, 0.8, PC[s], 6);
      ring(gx, gy, 4, 110, 0.55, '#ffffff', 3.5);
      flashAt(gx, gy, 220, 0.45, GLP[s], 1.4);
      flashAt(gx, gy, 120, 0.3, GLW, 1.5);
      sparks(gx, gy, 46, GLH[s], 380, 0.9, 12);
      shards(gx, gy, 26, PC[c], 260, 40, 6);
      for (let i = 0; i < 26; i++) {
        addPart({ k: 'c', x: rand(20, W - 20), y: c === 0 ? rand(MID - 120, MID + 40) : rand(MID - 40, MID + 120), vx: rand(-40, 40), vy: (c === 0 ? 1 : -1) * rand(40, 120),
          life: rand(1.2, 2), max: 2, size: rand(3, 6), rot: rand(0, TAU), vr: rand(-8, 8), col: pick([PC[s], '#ffffff', COL.gold, shade(PC[s], 0.4)]), drag: 0.6 });
      }
      noise(0.45, 0.2, 700);
      tone(150, 0.5, 'sawtooth', 0.05, 48);
      later(0.12, () => tone(660, 0.1, 'triangle', 0.04, 990));
      vibrate(90);
      if (V.overT >= 0) {
        later(0.5, () => { [523, 659, 784, 1046].forEach((f, i) => later(i * 0.12, () => tone(f, i === 3 ? 0.3 : 0.12, 'triangle', 0.05))); });
      }
    }

    function onRound(round) {
      V.trails.clear(); V.cracks.clear(); V.hitFx.clear(); V.cries = [];
      V.sadPad = [false, false]; V.big = null; V.countN = 0; V.chain = 0; V.lastPoint = null;
      V.explainOn = round === 1 ? [true, true] : [false, false];
      noise(0.35, 0.05, 1600);
      for (let i = 0; i < 6; i++) later(0.25 + i * 0.09, () => tone(330 + i * 70, 0.05, 'triangle', 0.025, 360 + i * 80));
    }

    function curRound() {
      let r = 0;
      try { r = api.round ? +api.round() : 0; } catch (e) { r = 0; }
      return r >= 1 ? Math.floor(r) : S.round + 1;
    }
    // le mur de la manche précédente se vaporise
    function vaporizeWall() {
      let n = 0;
      for (const br of S.bricks) {
        if (br.dead || n > 120) continue;
        n++;
        const col = br.kind === 's' ? '#c9d3da' : br.kind === 'h' || br.kind === 'g' ? '#ffd34d' : br.color;
        addPart({ k: 'b', x: br.x + br.w / 2, y: br.y + br.h / 2, w: br.w, h: br.h, vx: 0, vy: 0, life: 0.3 + Math.random() * 0.15, max: 0.45, col: shade(col, 0.3), drag: 0 });
      }
      if (n) noise(0.3, 0.08, 2400);
    }
    function beginRound() {
      if (destroyed || S.matchOver || GUEST) return;          // chez l'invité, les manches viennent de l'hôte
      vaporizeWall();
      V.heads = fetchHeads();
      for (const k of Array.from(stickers.keys())) if (k.charAt(0) === 'c') stickers.delete(k);
      const pre = { nid: S.nid, pp: S.patIdx, lc: S.lastConceder };
      startRound(S, curRound(), V.heads.length);
      if (HOST) {
        // tout ce qu'il faut à l'invité pour construire EXACTEMENT le même mur (graine, compteurs, têtes des copains)
        N.lastR = { k: 'R', r: S.round, hc: S.headCount, ms: S.matchSeed, nid: pre.nid, pp: pre.pp, lc: pre.lc,
          hn: V.heads.map(h => String((h && h.name) || '').slice(0, 16)) };
        nsend(Object.assign({ ts: Math.round(S.nowTs) }, N.lastR), true);
      }
    }

    // --- mise à jour de l'affichage (temps réel, cosmétique)
    function updView(dt) {
      if (V.sq.length) {
        const due = V.sq.filter(s => s.t <= V.rt);
        if (due.length) { V.sq = V.sq.filter(s => s.t > V.rt); for (const s of due) { try { s.fn(); } catch (e) { /* rien */ } } }
      }
      V.shake = Math.max(0, V.shake - dt * (10 + V.shake * 3));
      V.flash = Math.max(0, V.flash - dt * 2.2);
      for (let p = 0; p < 2; p++) {
        V.padFlash[p] = Math.max(0, V.padFlash[p] - dt * 5);
        V.squash[p] = Math.max(0, V.squash[p] - dt * 6);
        V.happy[p] = Math.max(0, V.happy[p] - dt * 0.7);
        V.goalFlash[p] = Math.max(0, V.goalFlash[p] - dt * 1.3);
        V.powFx[p] = Math.max(0, V.powFx[p] - dt * 2.2);
        let threat = false;
        if (S.phase === 'play') for (const b of viewBalls()) if (behind(b) && (p === 0 ? b.vy > 0 : b.vy < 0)) threat = true;
        if (threat && V.danger[p] < 0.5) tone(330, 0.35, 'sine', 0.045, 110);
        V.danger[p] = threat ? 1 : Math.max(0, V.danger[p] - dt * 4);
        // l'explication s'efface au « GO ! » pour ne jamais cacher la balle
        const want = V.explainOn[p] && S.phase === 'intro' ? 1 : 0;
        V.explain[p] += (want - V.explain[p]) * Math.min(1, dt * 6);
      }
      for (const [id, v] of V.hitFx) { const n = v - dt * 5; if (n <= 0) V.hitFx.delete(id); else V.hitFx.set(id, n); }
      for (const q of V.parts) {
        q.life -= dt;
        const dr = Math.max(0, 1 - q.drag * dt);
        q.vx *= dr; q.vy *= dr;
        if (q.g) q.vy += q.g * dt;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.vr) q.rot += q.vr * dt;
      }
      V.parts = V.parts.filter(q => q.life > 0);
      for (const r of V.rings) r.life -= dt;
      V.rings = V.rings.filter(r => r.life > 0);
      for (const f of V.floats) { f.life -= dt; f.y += (f.p === 0 ? -1 : 1) * 22 * dt; }
      V.floats = V.floats.filter(f => f.life > 0);
      for (const c of V.cries) {
        c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += (c.p === 0 ? 1 : -1) * 110 * dt; c.rot += c.vr * dt; c.vx *= 0.98;
        c.tearT -= dt;
        if (c.tearT <= 0 && c.t < 1.3) {
          c.tearT = 0.08;
          addPart({ k: 't', x: c.x + rand(-9, 9), y: c.y + (c.p === 0 ? 2 : -2), vx: rand(-35, 35), vy: (c.p === 0 ? -1 : 1) * rand(20, 60), g: (c.p === 0 ? 1 : -1) * 300,
            life: 0.75, max: 0.75, size: rand(1.6, 2.6), drag: 0.4 });
        }
      }
      V.cries = V.cries.filter(c => c.t < 1.6);
      const seen = new Set();
      for (const b of viewBalls()) {
        seen.add(b.id);
        let tr = V.trails.get(b.id);
        if (!tr) { tr = { p: [], t: -1 }; V.trails.set(b.id, tr); }
        if (V.rt - tr.t >= 0.012) { tr.t = V.rt; tr.p.push(b.x, b.y); if (tr.p.length > 32) tr.p.splice(0, tr.p.length - 32); }
        if (tr.y != null && (tr.y - MID) * (b.y - MID) < 0 && b.stuck < 0) {
          const col = b.owner >= 0 ? PC[b.owner] : '#ffffff';
          ring(b.x, MID, 3, 26, 0.4, col, 1.8);
          sparks(b.x, MID, 3, b.owner >= 0 ? GLP[b.owner] : GLW, 60, 0.3, 6);
        }
        tr.y = b.y;
        if (b.fire && Math.random() < 0.7) {
          addPart({ k: 'g', x: b.x + rand(-3, 3), y: b.y + rand(-3, 3), vx: rand(-25, 25) - b.vx * 0.12, vy: rand(-25, 25) - b.vy * 0.12,
            life: 0.32, max: 0.32, s0: rand(9, 15), s1: 2, img: GLF, drag: 1 });
        }
      }
      for (const id of Array.from(V.trails.keys())) if (!seen.has(id)) V.trails.delete(id);
      for (let p = 0; p < 2; p++) {
        const pl = S.pl[p];
        if (pl.eff.fire > 0 && S.phase === 'play' && Math.random() < 0.45) {
          addPart({ k: 'g', x: pl.x + rand(-pl.w / 2, pl.w / 2), y: p === 0 ? PY[0] - PH / 2 : PY[1] + PH / 2, vx: rand(-10, 10), vy: (p === 0 ? -1 : 1) * rand(30, 70),
            life: 0.38, max: 0.38, s0: rand(8, 13), s1: 2, img: GLF, drag: 0.5 });
        }
      }
      if (V.big) V.big.t += dt;
      if (V.overT >= 0) V.overT += dt;
      for (const tc of V.touches.values()) tc.t += dt;
      if (S.phase === 'intro') {
        const left = S.introDur - S.t, n = left <= 1.5 ? Math.ceil(left / 0.5) : 0;
        if (n !== V.countN) { V.countN = n; if (n > 0) tone(n === 1 ? 740 : 620, 0.08, 'square', 0.04); }
      } else V.countN = 0;
      if (V.overT >= 0 && V.overT < 1.6 && Math.random() < 0.5) {
        const w = V.winner;
        addPart({ k: 'c', x: rand(10, W - 10), y: w === 0 ? MID + rand(-10, 40) : MID - rand(-10, 40), vx: rand(-30, 30), vy: (w === 0 ? 1 : -1) * rand(50, 120),
          life: 1.6, max: 1.6, size: rand(3, 6), rot: rand(0, TAU), vr: rand(-8, 8), col: pick([PC[w], '#ffffff', COL.gold]), drag: 0.4 });
      }
    }

    // --- rendu
    let OX = 0, OY = 0;
    function W0() { ctx.setTransform(K, 0, 0, K, OX, OY); }
    function L1() { ctx.setTransform(-K, 0, 0, -K, OX + W * K, OY + H * K); }     // repère de P1 (tourné de 180°)
    function LP(p) { if (p === 1) L1(); else W0(); }

    function drawStars() {
      if (!V.stars) initStars();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#dff4ff';
      for (const s of V.stars) {
        const x = (s.x + V.rt * s.vx * (s.y > ch / 2 ? 1 : -1)) % cw;
        ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(V.rt * s.sp + s.ph));
        ctx.fillRect(x < 0 ? x + cw : x, s.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }

    function drawFieldLive() {
      W0();
      ctx.globalCompositeOperation = 'lighter';
      // filet central : pointillés qui glissent + impulsions lumineuses
      ctx.strokeStyle = 'rgba(233,240,243,0.2)'; ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -V.rt * 18;
      ctx.beginPath(); ctx.moveTo(0, MID); ctx.lineTo(W, MID); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 2; i++) {
        const x = ((V.rt * 70 + i * (W / 2 + 40)) % (W + 80)) - 40;
        ctx.globalAlpha = 0.45; ctx.drawImage(i ? GLP[1] : GLP[0], x - 22, MID - 7, 44, 14);
      }
      // éclair sur la ligne de celui qui vient d'encaisser
      for (let p = 0; p < 2; p++) {
        const k = V.goalFlash[p];
        if (k <= 0) continue;
        const y = p === 0 ? H : 0;
        ctx.globalAlpha = k;
        ctx.drawImage(GLP[1 - p], -60, y - 90, W + 120, 180);
        ctx.globalAlpha = k * 0.6; ctx.drawImage(GLW, -20, y - 24, W + 40, 48);
      }
      // une balle a passé la raquette : la ligne de but de ce joueur clignote en rouge (ralenti)
      for (let p = 0; p < 2; p++) {
        const k = V.danger[p];
        if (k <= 0) continue;
        const y = p === 0 ? H : 0, pu = 0.6 + 0.4 * Math.sin(V.rt * 30);
        ctx.globalAlpha = k * pu * 0.9;
        ctx.drawImage(glowOf(COL.alarm), -40, y - 60, W + 80, 120);
      }
      // doigts posés : petit halo sous chaque doigt
      for (const tc of V.touches.values()) {
        ctx.globalAlpha = 0.28 * Math.min(1, tc.t * 6);
        ctx.drawImage(GLP[tc.p], tc.x - 30, tc.y - 30, 60, 60);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    function brickAnim(br) {
      if (S.phase !== 'intro') return 1;
      const d = 0.12 + br.r * 0.075 + (Math.abs(br.x + br.w / 2 - W / 2) / W) * 0.3;
      return clamp((S.t - d) / 0.3, 0, 1);
    }
    function drawCrack(x, y, w, h, lines) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(10,6,6,0.8)' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = pass ? 1.1 : 0.9;
        const o = pass ? 0 : 0.7;
        ctx.beginPath();
        for (const ln of lines) {
          for (let i = 0; i < ln.length; i++) {
            const px = x + 2 + ln[i][0] * (w - 4) + o, py = y + 2 + ln[i][1] * (h - 4) + o;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
        }
        ctx.stroke();
      }
    }
    function drawSpecial(br, oy) {
      const x = br.x, y = br.y + oy, w = br.w, h = br.h, t = V.rt, cx = x + w / 2, cy = y + h / 2;
      const dmg = br.hp < br.maxHp;
      if (br.p === 1) ctx.setTransform(-K, 0, 0, -K, OX + 2 * cx * K, OY + 2 * cy * K);   // tournée vers P1
      // halo doré
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= 0.55 + 0.2 * Math.sin(t * 4 + br.id);
      ctx.drawImage(glowOf('#ffd34d'), cx - w * 0.75, cy - h * 0.9, w * 1.5, h * 1.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = brickAnim(br);
      ctx.fillStyle = 'rgba(2,6,12,0.92)'; rr(ctx, x, y, w, h, 6); ctx.fill();
      const fg = ctx.createLinearGradient(x, y, x + w * 0.45, y + h * 1.5);
      if (dmg) { fg.addColorStop(0, '#ffd2a0'); fg.addColorStop(0.4, '#e0782c'); fg.addColorStop(1, '#8a3a12'); }
      else { fg.addColorStop(0, '#fff3b0'); fg.addColorStop(0.35, '#e8b42c'); fg.addColorStop(0.62, '#fff0a0'); fg.addColorStop(1, '#a8741a'); }
      ctx.fillStyle = fg; rr(ctx, x + 1.3, y + 1.3, w - 2.6, h - 2.6, 5); ctx.fill();
      const ix = x + 4, iy = y + 3.6, iw = w - 8, ih = h - 7.2;
      const bgc = ctx.createRadialGradient(cx, cy - 2, 1, cx, cy, w * 0.55);
      if (br.kind === 'h') { bgc.addColorStop(0, '#6a2f80'); bgc.addColorStop(1, '#1b0d2a'); } else { bgc.addColorStop(0, '#4a3307'); bgc.addColorStop(1, '#150e02'); }
      ctx.fillStyle = bgc; rr(ctx, ix, iy, iw, ih, 3); ctx.fill();
      // rayons tournants
      ctx.save();
      rr(ctx, ix, iy, iw, ih, 3); ctx.clip();
      ctx.translate(cx, cy); ctx.rotate(t * 0.8);
      ctx.fillStyle = br.kind === 'h' ? 'rgba(255,170,255,0.09)' : 'rgba(255,220,120,0.12)';
      for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, -6); ctx.lineTo(w, 6); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      if (br.p === 1) ctx.setTransform(-K, 0, 0, -K, OX + 2 * cx * K, OY + 2 * cy * K); else W0();
      // étoiles sur les côtés
      ctx.fillStyle = '#ffe9a0';
      for (const sx of [x + 8, x + w - 8]) {
        const s = 2.6 + Math.sin(t * 5 + sx) * 0.7;
        ctx.beginPath(); ctx.moveTo(sx, cy - s); ctx.lineTo(sx + s * 0.3, cy - s * 0.3); ctx.lineTo(sx + s, cy); ctx.lineTo(sx + s * 0.3, cy + s * 0.3);
        ctx.lineTo(sx, cy + s); ctx.lineTo(sx - s * 0.3, cy + s * 0.3); ctx.lineTo(sx - s, cy); ctx.lineTo(sx - s * 0.3, cy - s * 0.3); ctx.closePath(); ctx.fill();
      }
      if (br.kind === 'h') {
        const st = friendSticker(br.head, dmg);
        const jig = dmg ? Math.sin(t * 38) * 0.8 : Math.sin(t * 2.4 + br.id) * 0.5;
        if (st) {
          const sc = h * 1.16 / CHEAD_H;
          ctx.drawImage(st.cv, cx - (st.w * sc) / 2 + jig, cy - (st.h * sc) / 2 - 1, st.w * sc, st.h * sc);
        } else {
          ctx.save(); ctx.translate(cx + jig, cy); paintAvatar(ctx, '?', '#ffd34d', 12, dmg, FD, t); ctx.restore();
        }
      } else {
        // trésor : gros diamant taillé
        const s = 9 + Math.sin(t * 3) * 0.6;
        ctx.save(); ctx.translate(cx, cy);
        const dg = ctx.createLinearGradient(-s, -s, s, s);
        dg.addColorStop(0, '#e6fbff'); dg.addColorStop(0.45, '#5ef0ff'); dg.addColorStop(1, '#2a6cff');
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 1.15, -s * 0.2); ctx.lineTo(0, s); ctx.lineTo(-s * 1.15, -s * 0.2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 1.15, -s * 0.2); ctx.lineTo(s * 1.15, -s * 0.2); ctx.moveTo(-s * 0.4, -s * 0.2); ctx.lineTo(0, s); ctx.lineTo(s * 0.4, -s * 0.2); ctx.stroke();
        ctx.restore();
      }
      // reflet qui balaie le cadre
      const ph = ((t * 0.5 + br.id * 0.37) % 2.2) / 2.2;
      if (ph < 0.4) {
        ctx.save();
        rr(ctx, x + 1.3, y + 1.3, w - 2.6, h - 2.6, 5); ctx.clip();
        const gx = x - 14 + (ph / 0.4) * (w + 28);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + 8, y); ctx.lineTo(gx - 4, y + h); ctx.lineTo(gx - 12, y + h); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const cr = V.cracks.get(br.id);
      if (cr) drawCrack(x, y, w, h, cr);
      W0();
    }
    // lueur néon sous le mur : pré-rendue à demi-résolution, refaite seulement quand une brique casse
    let wallGlow = null, wallKey = '';
    function getWallGlow() {
      const key = S.round + '|' + S.left + '|' + K.toFixed(3);
      if (wallGlow && key === wallKey) return wallGlow;
      wallKey = key;
      const k = K * 0.5;
      if (!wallGlow) wallGlow = mkCanvas(W * k, H * k);
      else if (wallGlow.width !== Math.ceil(W * k) || wallGlow.height !== Math.ceil(H * k)) { wallGlow.width = Math.ceil(W * k); wallGlow.height = Math.ceil(H * k); }
      const g = wallGlow.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, wallGlow.width, wallGlow.height);
      g.setTransform(k, 0, 0, k, 0, 0);
      g.globalCompositeOperation = 'lighter';
      for (const br of S.bricks) {
        if (br.dead || br.mover) continue;
        const col = br.kind === 's' ? '#9fb3c2' : br.kind === 'h' || br.kind === 'g' ? '#ffd34d' : br.color;
        g.globalAlpha = br.kind === 's' ? 0.5 : 0.8;
        g.drawImage(glowOf(col), br.x - br.w * 0.45, br.y - br.h * 1.1, br.w * 1.9, br.h * 3.2);
      }
      return wallGlow;
    }
    function drawBricks() {
      W0();
      if (S.phase !== 'intro' || S.t > 1.2) {
        const a = S.phase === 'intro' ? clamp((S.t - 1.2) / 0.6, 0, 1) : 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * a;
        ctx.drawImage(getWallGlow(), 0, 0, W, H);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      for (const g of S.movers) {
        if (!g.cells.some(b => !b.dead)) continue;
        const y = g.p === 0 ? MID + LANE + g.r * BH + BH / 2 : MID - LANE - g.r * BH - BH / 2;
        ctx.fillStyle = 'rgba(170,200,220,0.14)'; ctx.fillRect(0, y - 1, W, 2);
        ctx.fillStyle = 'rgba(170,200,220,0.22)';
        for (let x = 9; x < W; x += 18) ctx.fillRect(x - 0.5, y - 3.5, 1, 7);
      }
      for (const br of S.bricks) {
        if (br.dead) continue;
        const k = brickAnim(br);
        if (k <= 0) continue;
        const oy = (1 - easeOut(k)) * 22 * (br.p === 0 ? -1 : 1);
        ctx.globalAlpha = k;
        if (br.kind === 'h' || br.kind === 'g') drawSpecial(br, oy);
        else {
          ctx.drawImage(brickSprite(br.color, br.kind, br.hp, br.p === 1), br.x, br.y + oy, br.w, br.h);
          const cr = V.cracks.get(br.id);
          if (cr) drawCrack(br.x, br.y + oy, br.w, br.h, cr);
        }
        const hf = V.hitFx.get(br.id) || 0, land = 1 - k;
        if (hf > 0 || land > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.max(hf * 0.65, land * 0.85);
          ctx.fillStyle = '#ffffff'; rr(ctx, br.x + 1, br.y + oy + 1, br.w - 2, br.h - 2, 3); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawTelegraph() {
      if (S.phase !== 'intro') return;
      const left = S.introDur - S.t;
      if (left > 2.1) return;
      const k = clamp(1 - (left - 0.15) / 1.95, 0, 1);
      W0();
      for (const s of S.serve) {
        const r = 5 + 9 * k, pulse = 0.85 + 0.15 * Math.sin(V.rt * 14);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + 0.55 * k; ctx.drawImage(GLW, s.x - r * 2.3, s.y - r * 2.3, r * 4.6, r * 4.6);
        ctx.globalAlpha = (0.6 + 0.4 * k) * pulse; ctx.drawImage(GLW, s.x - r, s.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a0 = V.rt * (i === 1 ? -4.2 : 3.1) + i * 2.1, rad = r + 3 + i * 3.5;
          ctx.globalAlpha = 0.9 - i * 0.22; ctx.lineWidth = 2 - i * 0.4;
          ctx.beginPath(); ctx.arc(s.x, s.y, rad, a0, a0 + 2.3); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // chevrons : d'où part la balle et vers qui
        const a = Math.atan2(s.dy, s.dx), ca = Math.cos(a), sa = Math.sin(a);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < 3; i++) {
          const ph = (V.rt * 2.2 + i / 3) % 1, d = r + 10 + ph * 26;
          ctx.globalAlpha = Math.sin(ph * Math.PI) * (0.4 + 0.6 * k);
          const px = s.x + ca * d, py = s.y + sa * d;
          ctx.beginPath();
          ctx.moveTo(px - ca * 5 - sa * 5, py - sa * 5 + ca * 5); ctx.lineTo(px, py); ctx.lineTo(px - ca * 5 + sa * 5, py - sa * 5 - ca * 5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawCaps() {
      W0();
      for (const c of S.caps) {
        const P = POWERS[c.type], pulse = 0.5 + 0.5 * Math.sin(V.rt * 9 + c.id), gl = glowOf(P.color), back = c.to === 0 ? -1 : 1;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.3 / i; ctx.drawImage(gl, c.x - 13, c.y + back * i * 9 - 7, 26, 14); }
        ctx.globalAlpha = 0.45 + 0.25 * pulse; ctx.drawImage(gl, c.x - 32, c.y - 22, 64, 44);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        const s = capSprite(c.type), wob = Math.sin(V.rt * 6 + c.id) * 0.08;
        const cs = Math.cos(wob + (c.to === 1 ? Math.PI : 0)) * K, sn = Math.sin(wob + (c.to === 1 ? Math.PI : 0)) * K;
        ctx.setTransform(cs, sn, -sn, cs, OX + c.x * K, OY + c.y * K);
        ctx.drawImage(s, -20, -12, 40, 24);
      }
      W0();
    }

    function drawShieldBar() {
      const y = SHIELD_Y[0], a = 0.55 + 0.25 * Math.sin(V.rt * 6);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a; ctx.drawImage(glowOf('#3fb6e8'), -40, y - 16, W + 80, 32);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(190,240,255,0.95)'; ctx.fillRect(0, y - 1.1, W, 2.2);
      ctx.strokeStyle = 'rgba(159,232,255,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath();
      const off = (V.rt * 20) % 16;
      for (let x = -16 + off; x < W + 16; x += 16) { ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); }
      ctx.stroke();
    }
    function drawTears(x, y, h, t) {
      ctx.fillStyle = '#9fe0ff';
      for (const s of [-1, 1]) {
        const ph = (t * 1.6 + (s > 0 ? 0.5 : 0)) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.ellipse(x + s * h * 0.17, y - h * 0.02 + ph * h * 0.38, h * 0.035, h * 0.06, 0, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function drawPlayerHead(p, x, cy, h, sad, k) {
      const hb = V.happy[p];
      const bounce = hb > 0 ? Math.abs(Math.sin((1 - hb) * Math.PI * 4)) * hb * 7 : 0;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + V.padFlash[p] * 0.35;
      ctx.drawImage(GLP[p], x - h * 0.8, cy - h * 0.7, h * 1.6, h * 1.4);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const hq = h <= HEAD_H + 0.5 ? HEAD_H : 112, st = playerSticker(p, sad, k, hq), sk = h / hq;
      const wob = sad ? Math.sin(V.rt * 8) * 0.07 : 0;
      ctx.save();
      ctx.translate(x, cy - bounce); ctx.rotate(wob);
      if (SOLO && p !== VIEWER) ctx.rotate(Math.PI);           // vue solo : la tête de l'adversaire à l'endroit pour le lecteur
      if (st) {
        ctx.drawImage(st.cv, (-st.w * sk) / 2, (-st.h * sk) / 2, st.w * sk, st.h * sk);
        if (sad && !imgOk(PLAYERS[p].sad)) drawTears(0, 0, h, V.rt);
      } else paintAvatar(ctx, PLAYERS[p].name, PC[p], h * 0.42, sad, FD, V.rt);
      ctx.restore();
    }
    function drawBar(p, x, y, w) {
      const pl = S.pl[p], col = PC[p], sq = V.squash[p], fl = V.padFlash[p];
      const ww = w * (1 + sq * 0.07), hh = PH * (1 - sq * 0.22), x0 = x - ww / 2, y0 = y - hh / 2 + sq * 1.2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 + fl * 0.4;
      ctx.drawImage(GLP[p], x0 - 18, y - 22, ww + 36, 44);
      if (V.powFx[p] > 0) { ctx.globalAlpha = V.powFx[p]; ctx.drawImage(glowOf(V.powCol[p]), x0 - 30, y - 32, ww + 60, 64); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, y0, 0, y0 + hh);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, shade(col, 0.3)); g.addColorStop(0.62, col); g.addColorStop(1, shade(col, -0.55));
      ctx.fillStyle = g; rr(ctx, x0, y0, ww, hh, hh / 2); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(2,6,12,0.85)'; ctx.stroke();
      ctx.fillStyle = 'rgba(2,6,12,0.3)'; rr(ctx, x0 + 7, y0 + hh * 0.6, ww - 14, hh * 0.2, 1); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; rr(ctx, x0 + 6, y0 + 1.5, ww - 12, 1.8, 0.9); ctx.fill();
      if (pl.eff.glue > 0) {
        ctx.fillStyle = 'rgba(255,211,77,0.9)';
        rr(ctx, x0 + 4, y0 - 1.6, ww - 8, 3, 1.5); ctx.fill();
        for (let i = 0; i < 4; i++) {
          const dx = x0 + ww * (0.16 + i * 0.22), dl = 2.4 + Math.sin(V.rt * 2.4 + i * 2) * 1.6;
          ctx.beginPath(); ctx.ellipse(dx, y0 + hh + dl, 1.5, 2 + dl * 0.35, 0, 0, TAU); ctx.fill();
        }
      }
      if (pl.eff.shrink > 0 && Math.sin(V.rt * 12) > -0.2) { ctx.strokeStyle = 'rgba(255,77,94,0.95)'; ctx.lineWidth = 1.6; rr(ctx, x0 - 1.5, y0 - 1.5, ww + 3, hh + 3, hh / 2 + 1.5); ctx.stroke(); }
      if (pl.eff.big > 0) { ctx.strokeStyle = 'rgba(76,195,106,0.9)'; ctx.lineWidth = 1.4; rr(ctx, x0 - 1.5, y0 - 1.5, ww + 3, hh + 3, hh / 2 + 1.5); ctx.stroke(); }
      ctx.globalCompositeOperation = 'lighter';
      const sweep = ((V.rt * 0.6 + p * 0.5) % 1.6) / 1.6;
      if (sweep < 0.5) { ctx.globalAlpha = Math.sin((sweep / 0.5) * Math.PI) * 0.8; ctx.drawImage(GLW, x0 + (ww * sweep) / 0.5 - 12, y - 5, 24, 10); }
      ctx.globalAlpha = 0.9;
      ctx.drawImage(GLW, x0 + hh / 2 - 7, y - 7, 14, 14); ctx.drawImage(GLW, x0 + ww - hh / 2 - 7, y - 7, 14, 14);
      if (fl > 0) { ctx.globalAlpha = fl * 0.7; ctx.fillStyle = '#ffffff'; rr(ctx, x0, y0, ww, hh, hh / 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawEffIcons(p, x, y) {
      const pl = S.pl[p], list = [];
      for (const k of EFF_KEYS) if (pl.eff[k] > 0) list.push([k, pl.eff[k] / POWERS[k].dur]);
      if (pl.shield) list.push(['shield', 1]);
      for (let i = 0; i < list.length; i++) {
        const k = list[i][0], f = list[i][1], side = i % 2 === 0 ? 1 : -1, n = i >> 1;
        const ix = clamp(x + side * (34 + n * 21), 11, W - 11), iy = y + 26;
        const blink = f < 0.22 && Math.sin(V.rt * 16) < 0;
        if (!blink) ctx.drawImage(iconSprite(k), ix - 9, iy - 9, 18, 18);
        ctx.strokeStyle = POWERS[k].color; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ix, iy, 10.6, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
      }
    }
    // la tête d'un joueur grossit quand il encaisse un point, et à la fin du match
    function headPose(p) {
      let g = 0, mode = 0;
      if (V.overT >= 0) { g = easeBack(clamp((V.overT - 0.1) / 0.45, 0, 1)) * (p === V.winner ? 0.95 : 0.8); mode = 2; }
      else if (V.big && V.big.p === p && V.big.t < 1.7) {
        const t = V.big.t;
        g = (t < 0.35 ? easeBack(t / 0.35) : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / 0.4) : 1) * 0.85; mode = 1;
      }
      const hh = HEAD_H * (1 + g);
      return { hh, hy: PY[0] + 24 - (hh - HEAD_H) * 0.45, g, mode };
    }
    function drawPaddles() {
      for (let p = 0; p < 2; p++) {
        LP(p);
        const pl = S.pl[p], x = p === 0 ? pl.x : W - pl.x, y = PY[0];
        if (pl.shield) drawShieldBar();
        const sad = V.sadPad[p] || V.danger[p] > 0.5 || (V.overT >= 0 && V.winner !== p);
        const hp = headPose(p);
        if (hp.g < 0.04) { drawPlayerHead(p, x, hp.hy, hp.hh, sad, K); drawBar(p, x, y, pl.w); }
        else {
          drawBar(p, x, y, pl.w);
          const hx = clamp(x, hp.hh * 0.45, W - hp.hh * 0.45);
          drawPlayerHead(p, hx, hp.hy, hp.hh, sad, K);
          const opp = SOLO && p !== VIEWER;
          if (hp.mode === 2 && p === V.winner) {
            if (opp) {                                            // vue solo : couronne au-dessus de la tête (vue du lecteur)
              ctx.save(); ctx.translate(hx, Math.min(H - 16, hp.hy + hp.hh * 0.5 + 5 + Math.abs(Math.sin(V.rt * 5)) * 3)); ctx.rotate(Math.PI);
              drawCrown(0, 0, 1.05); ctx.restore();
            } else drawCrown(hx, hp.hy - hp.hh * 0.5 - 5 - Math.abs(Math.sin(V.rt * 5)) * 3, 1.05);
          }
          const bt = hp.mode === 1 ? V.big.t : V.overT;
          if (sad && bt > 0.3) {
            const side = hx > W / 2 ? -1 : 1;
            const bx = clamp(hx + side * (hp.hh * 0.42 + 44), 48, W - 48), by = hp.hy - hp.hh * 0.2 + Math.sin(V.rt * 3) * 2;
            if (opp) { LP(VIEWER); drawBubble('Snif…', W - bx, H - by, '#e6f6ff', '#1f6fa8'); LP(p); }
            else drawBubble('Snif…', bx, by, '#e6f6ff', '#1f6fa8');
          }
        }
        drawEffIcons(p, x, y);
      }
      W0();
    }

    function drawBalls() {
      W0();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const VBL = viewBalls();
      for (const b of VBL) {
        const tr = V.trails.get(b.id), col = b.fire ? '#ff7a2a' : b.owner >= 0 ? PC[b.owner] : '#ffffff';
        if (tr && tr.p.length >= 2 && b.stuck < 0) {
          const pts = tr.p.concat([b.x, b.y]), n = pts.length / 2;
          ctx.strokeStyle = col;
          for (let i = 1; i < n; i++) {
            const k = i / (n - 1);
            ctx.globalAlpha = k * k * 0.7;
            ctx.lineWidth = BR * 1.9 * k + 0.5;
            ctx.beginPath(); ctx.moveTo(pts[i * 2 - 2], pts[i * 2 - 1]); ctx.lineTo(pts[i * 2], pts[i * 2 + 1]); ctx.stroke();
          }
          ctx.strokeStyle = '#ffffff';
          for (let i = Math.max(1, n - 5); i < n; i++) {
            const k = (i - (n - 6)) / 6;
            ctx.globalAlpha = k * 0.5; ctx.lineWidth = BR * 0.7 * k;
            ctx.beginPath(); ctx.moveTo(pts[i * 2 - 2], pts[i * 2 - 1]); ctx.lineTo(pts[i * 2], pts[i * 2 + 1]); ctx.stroke();
          }
        }
        const gl = b.fire ? GLF : b.owner >= 0 ? GLP[b.owner] : GLW;
        const sz = b.fire ? 54 + Math.sin(V.rt * 30) * 5 : 40 + clamp((b.sp - 220) * 0.06, 0, 22);
        ctx.globalAlpha = 0.22; ctx.drawImage(gl, b.x - sz, b.y - sz, sz * 2, sz * 2);
        ctx.globalAlpha = 1; ctx.drawImage(gl, b.x - sz / 2, b.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const b of VBL) {
        if (b.stuck < 0) continue;
        const pl = S.pl[b.stuck], off = clamp(b.offX / (pl.w / 2), -1, 1), a = off * 62 * DEG;
        const dx = Math.sin(a), dy = b.stuck === 0 ? -Math.cos(a) : Math.cos(a);
        ctx.fillStyle = PC[b.stuck];
        for (let i = 1; i <= 5; i++) {
          const ph = (V.rt * 3 + i / 5) % 1;
          ctx.globalAlpha = 0.85 - i * 0.13;
          ctx.beginPath(); ctx.arc(b.x + dx * (BR + 6 + i * 11 + ph * 4), b.y + dy * (BR + 6 + i * 11 + ph * 4), 2.2, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(b.x, b.y, BR + 4, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(b.stickT / 1.25, 0, 1)); ctx.stroke();
      }
      for (const b of VBL) {
        const col = b.owner >= 0 ? PC[b.owner] : '#e9f0f3';
        const g = ctx.createRadialGradient(b.x - BR * 0.35, b.y - BR * 0.35, 0.5, b.x, b.y, BR);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, b.fire ? '#ffe6a8' : shade(col, 0.65)); g.addColorStop(1, b.fire ? '#ff6a1a' : col);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, TAU); ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(2,6,12,0.55)'; ctx.stroke();
      }
    }

    function drawParticles() {
      for (const q of V.parts) {
        if (q.k === 'g' || q.k === 'b') continue;
        const k = clamp(q.life / q.max, 0, 1);
        if (q.k === 't') {
          W0(); ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = '#9fe0ff';
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * 0.7, q.size * 1.2, 0, 0, TAU); ctx.fill();
          continue;
        }
        const c = Math.cos(q.rot) * K, s = Math.sin(q.rot) * K, sz = q.size;
        ctx.setTransform(c, s, -s, c, OX + q.x * K, OY + q.y * K);
        ctx.globalAlpha = Math.min(1, k * 1.8);
        ctx.fillStyle = q.col;
        if (q.k === 'c') ctx.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6);
        else { ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.6); ctx.lineTo(sz, -sz * 0.2); ctx.lineTo(-sz * 0.2, sz * 0.9); ctx.closePath(); ctx.fill(); }
      }
      W0();
      ctx.globalCompositeOperation = 'lighter';
      for (const q of V.parts) {
        if (q.k === 'b') {
          const k = q.life / q.max, sc = 1 + (1 - k) * 0.5;
          ctx.globalAlpha = k * 0.8; ctx.fillStyle = q.col;
          rr(ctx, q.x - (q.w * sc) / 2, q.y - (q.h * sc) / 2, q.w * sc, q.h * sc, 4); ctx.fill();
          continue;
        }
        if (q.k !== 'g') continue;
        const k = q.life / q.max, sz = q.s1 + (q.s0 - q.s1) * k;
        ctx.globalAlpha = k > 0.7 ? 1 : k / 0.7;
        ctx.drawImage(q.img, q.x - sz / 2, q.y - sz / 2, sz, sz);
      }
      for (const r of V.rings) {
        const k = r.life / r.max, rad = r.r1 + (r.r0 - r.r1) * k;
        ctx.globalAlpha = k; ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (0.35 + k);
        ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.5, rad), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    function drawCries() {
      for (const c of V.cries) {
        LP(c.p);
        const x = c.p === 0 ? c.x : W - c.x, y = c.p === 0 ? c.y : H - c.y;
        const st = friendSticker(c.i, true);
        const a = c.t < 1.1 ? 1 : clamp((1.6 - c.t) / 0.5, 0, 1), sc = 1.15 + Math.min(0.3, c.t * 0.5);
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot); ctx.scale(sc, sc);
        if (st) {
          ctx.drawImage(st.cv, -st.w / 2, -st.h / 2, st.w, st.h);
          const hd = V.heads[c.i];
          if (hd && !imgOk(hd.sad)) drawTears(0, 0, CHEAD_H, V.rt);    // pas de version triste : on ajoute des larmes
        } else paintAvatar(ctx, '?', '#ffd34d', 14, true, FD, V.rt);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      W0();
    }

    function drawFloats() {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const f of V.floats) {
        const fp = SOLO ? VIEWER : f.p;                       // vue solo : tous les textes tournés vers le lecteur
        LP(fp);
        const x = fp === 0 ? f.x : W - f.x, y = fp === 0 ? f.y : H - f.y;
        const k = f.life / f.max, pop = Math.min(1, (f.max - f.life) / 0.12);
        ctx.font = (f.body ? '600 ' : '') + f.size + 'px ' + (f.body ? FB : FD);
        const tw = ctx.measureText(f.text).width, xx = clamp(x, tw / 2 + 6, W - tw / 2 - 6);
        ctx.globalAlpha = Math.min(1, k * 2.5);
        ctx.save(); ctx.translate(xx, y); ctx.scale(0.55 + 0.45 * pop, 0.55 + 0.45 * pop);
        strokeText(ctx, f.text, 0, 0, f.size, f.col, f.body ? FB : FD, Math.max(3, f.size * 0.26), f.body);
        ctx.restore();
      }
      ctx.globalAlpha = 1; W0();
    }

    // --- intro de manche, compte à rebours, explication (pour chaque joueur, dans son sens)
    function roundTip() {
      const r = S.round, P = roundParams(r), Q = roundParams(r - 1);
      let sc = [0, 0];
      try { sc = api.scores ? api.scores() : sc; } catch (e) { /* rien */ }
      const mp0 = sc[0] === TARGET - 1, mp1 = sc[1] === TARGET - 1;
      if (mp0 && mp1) return ['BALLE DE MATCH POUR LES DEUX !', COL.alarm];
      if (mp0 || mp1) return ['BALLE DE MATCH !', COL.alarm];
      if (r === 1) return ['Premier à ' + TARGET + ' points !', COL.gold];
      if (P.balls > Q.balls) return ['DEUX BALLES EN MÊME TEMPS !', COL.gold];
      if (P.movers > Q.movers) return [P.movers > 1 ? 'Encore plus de briques qui bougent !' : 'Des briques bougent !', COL.gold];
      if (P.solid > 0 && Q.solid === 0) return ['Briques blindées : 2 coups !', COL.gold];
      return ['Mur « ' + S.patName + ' » · ça accélère !', COL.gold];
    }
    // centre du bandeau / du compte à rebours : entre le portail de service et la raquette (ou l'explication en manche 1)
    function introY() { return (MID + wallFront(S) + 36 + (S.round === 1 ? 528 : 574)) / 2; }
    function drawBanner(p, yc, t, tEnd) {
      const a = clamp(t / 0.18, 0, 1) * clamp((tEnd + 0.25 - t) / 0.25, 0, 1);
      if (a <= 0) return;
      const sl = easeOut(clamp(t / 0.4, 0, 1));
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(2,6,14,0.66)'; ctx.fillRect(0, yc - 33, W, 64);
      ctx.fillStyle = PC[p];
      ctx.fillRect(W / 2 - 160 * sl, yc - 33, 320 * sl, 2); ctx.fillRect(W / 2 - 160 * sl, yc + 29, 320 * sl, 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.35; ctx.drawImage(GLP[p], W / 2 - 150, yc - 40, 300, 80);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const pop = 1 + Math.max(0, 0.28 - t) * 1.3;
      ctx.save(); ctx.translate(W / 2, yc - 8); ctx.scale(pop, pop);
      strokeText(ctx, 'MANCHE ' + S.round, 0, 0, 25, '#ffffff', FD, 5);
      ctx.restore();
      const tip = roundTip();
      strokeText(ctx, tip[0], W / 2, yc + 16, 12.5, tip[1], FB, 3, true);
      ctx.globalAlpha = 1;
    }
    function drawCount(text, yc, k, p, go) {
      const pop = 1 + (1 - Math.min(1, k * 3.2)) * 0.7;
      const a = go ? 1 - k : Math.min(1, k * 5) * (k > 0.82 ? (1 - k) / 0.18 : 1);
      if (a <= 0) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.55; ctx.drawImage(go ? glowOf(COL.leaf) : GLP[p], W / 2 - 70, yc - 50, 140, 100);
      ctx.globalAlpha = a * (1 - k); ctx.strokeStyle = go ? COL.leaf : PC[p]; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W / 2, yc, 26 + k * 18, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.save(); ctx.translate(W / 2, yc); ctx.scale(pop, pop);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      strokeText(ctx, text, 0, 2, go ? 40 : 50, go ? COL.leaf : '#ffffff', FD, 7);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawExplain(p, a) {
      const y = PY[0] - PH / 2 - 30, bw = Math.min(W - 24, 318), bh = 40;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(2,6,14,0.78)'; rr(ctx, W / 2 - bw / 2, y - bh / 2, bw, bh, 12); ctx.fill();
      ctx.strokeStyle = rgba(PC[p], 0.85); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const pad = padShow(p);
      const l1 = NET ? (coarse ? (p === ME ? 'GLISSE TON DOIGT SUR L’ÉCRAN' : 'GLISSE TON DOIGT') : 'FLÈCHES ← → OU SOURIS')
        : coarse ? 'GLISSE TON DOIGT DE CE CÔTÉ' : p === 0 ? 'FLÈCHES ← → OU SOURIS' : 'TOUCHES Q / D OU SOURIS';
      if (pad) padLine([{ g: 'ls' }, 'BOUGE', { g: 'a' }, 'LÂCHE LA BALLE'], W / 2, y - 8, 11.5, PC[p], FD, p);
      else strokeText(ctx, l1, W / 2, y - 8, 11.5, PC[p], FD, 0);
      strokeText(ctx, 'Envoie la balle derrière la raquette d’en face !', W / 2, y + 9, 11.5, '#ffffff', FB, 0, true);
      if (pad) { ctx.globalAlpha = 1; return; }
      // petite main qui glisse
      const hx = W / 2 + Math.sin(V.rt * 3) * 26;
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = rgba(PC[p], 0.9);
      ctx.beginPath(); ctx.arc(hx, y + bh / 2 + 9, 4.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(PC[p], 0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(W / 2 - 34, y + bh / 2 + 9); ctx.lineTo(W / 2 + 34, y + bh / 2 + 9); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawIntro() {
      const yc = introY();
      for (let p = 0; p < 2; p++) {
        if (SOLO && p !== VIEWER) {                           // vue solo : ni bannière ni consigne pour l'adversaire
          if (p === AIP && V.explain[p] > 0.01) drawAIBadge(V.explain[p]);
          continue;
        }
        LP(p);
        if (S.phase === 'intro') {
          const tEnd = S.introDur - 1.55;
          if (S.t < tEnd + 0.25) drawBanner(p, yc, S.t, tEnd);
          const left = S.introDur - S.t;
          if (left <= 1.5) { const n = Math.max(1, Math.ceil(left / 0.5)); drawCount(String(n), yc, 1 - (left - (n - 1) * 0.5) / 0.5, p, false); }
        } else if (S.phase === 'play' && S.t < 0.55) drawCount('GO !', yc, S.t / 0.55, p, true);
        if (V.explain[p] > 0.01) { if (p === AIP) drawAIBadge(V.explain[p]); else drawExplain(p, V.explain[p]); }
      }
      W0();
    }
    const AI_LINES = { FACILE: 'Elle débute : montre-lui comment on fait !', MOYEN: 'Elle se défend bien. À toi de jouer !',
      DIFFICILE: 'Elle vise les trous du mur. Méfie-toi !', 'EXTRÊME': 'Méga intelligente. Bonne chance…' };
    function drawAIBadge(a) {
      W0();                                                   // à l'endroit : c'est le joueur d'en bas qui le lit
      const y = PY[1] + PH / 2 + 33, bw = Math.min(W - 24, 300), bh = 38;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(2,6,14,0.78)'; rr(ctx, W / 2 - bw / 2, y - bh / 2, bw, bh, 12); ctx.fill();
      ctx.strokeStyle = rgba(PC[AIP], 0.85); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      strokeText(ctx, 'IA · ' + AIL.label, W / 2, y - 8, 12, PC[AIP], FD, 0);
      strokeText(ctx, AI_LINES[AIL.label] || '', W / 2, y + 9, 11.5, '#ffffff', FB, 0, true);
      ctx.globalAlpha = 1;
    }

    // --- grosse tête au point marqué / à la fin du match
    function drawBubble(text, x, y, col, txtCol) {
      ctx.font = '15px ' + FD;
      const tw = ctx.measureText(text).width + 20, th = 27;
      ctx.fillStyle = col; rr(ctx, x - tw / 2, y - th / 2, tw, th, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(2,6,12,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = txtCol; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);
    }
    function drawCrown(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      const g = ctx.createLinearGradient(0, -12, 0, 6);
      g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffd34d'); g.addColorStop(1, '#c08a12');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-16, 6); ctx.lineTo(-18, -10); ctx.lineTo(-8, -2); ctx.lineTo(0, -14); ctx.lineTo(8, -2); ctx.lineTo(18, -10); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7a5210'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(0, -1, 2.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // --- panneaux des marges (écrans larges : tablette, PC)
    function drawCards() {
      if (offX < 90) return;
      const cwid = Math.min(offX - 24, 250), hh = Math.min(cwid * 0.78, ch * 0.25);
      for (let p = 0; p < 2; p++) {
        if (SOLO && p === OPP) { drawOppCard(cwid, hh); continue; }   // vue solo : l'adversaire = petite carte « nom »
        // P0 : marge gauche, en bas, à l'endroit ; P1 : marge droite, en haut, tourné
        if (p === 1) ctx.setTransform(-dpr, 0, 0, -dpr, cw * dpr, ch * dpr); else ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cx = offX / 2, fs = Math.min(22, Math.max(13, cwid * 0.11));
        const top = ch - 24 - hh * 1.32 - fs - 22, bot = ch - 24, hy = top + 14 + hh * 0.6;
        // carte du joueur
        ctx.fillStyle = 'rgba(6,12,20,0.6)'; rr(ctx, cx - cwid / 2, top, cwid, bot - top, 16); ctx.fill();
        ctx.strokeStyle = rgba(PC[p], 0.55); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = PC[p]; rr(ctx, cx - cwid * 0.3, top - 1.5, cwid * 0.6, 3, 1.5); ctx.fill();
        const sad = V.sadPad[p] || (V.overT >= 0 && V.winner !== p);
        const hb = V.happy[p], bounce = hb > 0 ? Math.abs(Math.sin((1 - hb) * Math.PI * 4)) * hb * 10 : 0;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + V.padFlash[p] * 0.3;
        ctx.drawImage(GLP[p], cx - hh, hy - hh * 0.8, hh * 2, hh * 1.6);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        const st = playerSticker(p, sad, dpr, Math.round(hh));
        if (st) {
          ctx.drawImage(st.cv, cx - st.w / 2, hy - st.h / 2 - bounce, st.w, st.h);
          if (sad && !imgOk(PLAYERS[p].sad)) drawTears(cx, hy - bounce, hh, V.rt);
        } else { ctx.save(); ctx.translate(cx, hy - bounce); paintAvatar(ctx, PLAYERS[p].name, PC[p], hh * 0.42, sad, FD, V.rt); ctx.restore(); }
        if (V.overT >= 0 && V.winner === p) {
          ctx.save(); ctx.translate(cx, hy - hh * 0.62 - 6 - bounce); ctx.scale(hh / 70, hh / 70); drawCrown(0, 0, 1); ctx.restore();
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        strokeText(ctx, PLAYERS[p].name, cx, bot - fs * 0.5 - 12, fs, PC[p], FD, 4);
        // bonus en cours, sous le nom
        const pl = S.pl[p], list = [];
        for (const k of EFF_KEYS) if (pl.eff[k] > 0) list.push(k);
        if (pl.shield) list.push('shield');
        const isz = Math.min(24, cwid / 6);
        list.forEach((k, i) => ctx.drawImage(iconSprite(k), cx - (list.length * (isz + 4)) / 2 + i * (isz + 4) + 2, top - isz - 8, isz, isz));
      }
    }

    // --- vue solo : l'adversaire réduit à son nom (et sa petite tête dans la marge des écrans larges), tourné vers le lecteur
    function soloTf() { if (VIEWER === 1) ctx.setTransform(-dpr, 0, 0, -dpr, cw * dpr, ch * dpr); else ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function drawOppCard(cwid, hh) {
      soloTf();
      const p = OPP, cx = cw - offX / 2, w = Math.min(cwid, 170), hs = Math.round(Math.min(hh * 0.5, 64)), fs = Math.min(15, Math.max(11, w * 0.085));
      const top = 24, bot = top + hs + fs + 34, hy = top + 12 + hs / 2;
      ctx.fillStyle = 'rgba(6,12,20,0.5)'; rr(ctx, cx - w / 2, top, w, bot - top, 14); ctx.fill();
      ctx.strokeStyle = rgba(PC[p], 0.4); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = PC[p]; rr(ctx, cx - w * 0.25, bot - 1.5, w * 0.5, 3, 1.5); ctx.fill();
      const sad = V.sadPad[p] || (V.overT >= 0 && V.winner !== p);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      ctx.drawImage(GLP[p], cx - hs, hy - hs * 0.8, hs * 2, hs * 1.6);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const st = playerSticker(p, sad, dpr, hs);
      if (st) ctx.drawImage(st.cv, cx - st.w / 2, hy - st.h / 2, st.w, st.h);
      else { ctx.save(); ctx.translate(cx, hy); paintAvatar(ctx, PLAYERS[p].name, PC[p], hs * 0.42, sad, FD, V.rt); ctx.restore(); }
      if (V.overT >= 0 && V.winner === p) { ctx.save(); ctx.translate(cx, hy - hs * 0.62 - 4); ctx.scale(hs / 70, hs / 70); drawCrown(0, 0, 1); ctx.restore(); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      strokeText(ctx, PLAYERS[p].name, cx, bot - fs * 0.5 - 10, fs, PC[p], FD, 3);
    }
    function drawOppTag() {
      if (offX >= 90) return;                                   // écrans larges : la petite carte de la marge suffit
      LP(VIEWER);
      const p = OPP, name = PLAYERS[p].name, m = offY / scale;
      ctx.font = '11px ' + FD;
      const tw = ctx.measureText(name).width, w = tw + 30, h = 19;
      const inMargin = m >= 24, x = inMargin ? W / 2 : 6 + w / 2, y = inMargin ? -m / 2 : 13;
      ctx.globalAlpha = inMargin ? 1 : 0.85;
      ctx.fillStyle = 'rgba(2,6,14,0.74)'; rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = rgba(PC[p], 0.75); ctx.lineWidth = 1.1; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.8;
      ctx.drawImage(GLP[p], x - w / 2 + 2, y - 8, 16, 16);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = inMargin ? 1 : 0.85;
      ctx.fillStyle = PC[p]; ctx.beginPath(); ctx.arc(x - w / 2 + 10, y, 3, 0, TAU); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      strokeText(ctx, name, x + 6, y + 0.5, 11, PC[p], FD, 0);
      ctx.globalAlpha = 1;
      W0();
    }

    function drawPauseOverlay() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(2,5,10,0.62)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let p = 0; p < 2; p++) {
        if (SOLO && p !== VIEWER) continue;
        LP(p);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        strokeText(ctx, 'PAUSE', W / 2, MID + 150, 34, '#ffffff', FD, 6);
      }
    }
    function drawWaiting() {
      for (let p = 0; p < 2; p++) {
        if (SOLO && p !== VIEWER) continue;
        LP(p);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(V.rt * 4);
        strokeText(ctx, 'CONNEXION…', W / 2, MID + 150, 22, PC[ME], FD, 5);
        ctx.globalAlpha = 1;
      }
      W0();
    }
    function drawResume() {
      const n = Math.max(1, Math.ceil(V.resumeT / 0.5)), k = 1 - (V.resumeT - (n - 1) * 0.5) / 0.5;
      for (let p = 0; p < 2; p++) { if (SOLO && p !== VIEWER) continue; LP(p); drawCount(String(n), MID + 150, k, p, false); }
      W0();
    }

    function render() {
      if (destroyed) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      let sx = 0, sy = 0;
      if (V.shake > 0.05 && !paused) { sx = (Math.random() * 2 - 1) * V.shake; sy = (Math.random() * 2 - 1) * V.shake; }
      ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(getBg(), Math.round(sx * K * 0.4), Math.round(sy * K * 0.4));
      drawStars();
      drawCards();
      OX = (offX + sx * scale) * dpr; OY = (offY + sy * scale) * dpr;
      drawFieldLive();
      drawBricks();
      drawTelegraph();
      drawCaps();
      const over = V.overT >= 0;
      if (!over) drawPaddles();
      drawBalls();
      if (!over) drawParticles();
      drawCries();
      if (over) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(2,5,10,' + (Math.min(0.62, V.overT * 1.2)).toFixed(3) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawParticles();
        drawPaddles();
      }
      if (SOLO) drawOppTag();
      drawFloats();
      drawIntro();
      if (GUEST && !N.gotR) drawWaiting();
      if (paused) drawPauseOverlay();
      else if (V.resumeT > 0) drawResume();
      if (V.flash > 0.01) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, V.flash) * 0.5; ctx.fillStyle = V.flashCol; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }

    // --- entrées : multi-touch (chaque doigt appartient à la moitié où il s'est posé), souris, clavier
    function visible() { return root.offsetParent !== null; }
    function isTyping(e) { const t = e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
    const keys = [{ l: false, r: false }, { l: false, r: false }];
    function syncKeys() { for (let p = 0; p < 2; p++) inputs[p].dir = (keys[p].r ? 1 : 0) - (keys[p].l ? 1 : 0); }
    function keyOf(e) {
      const k = e.key || '', c = e.code || '';
      if (k === 'ArrowLeft') return [0, 'l'];
      if (k === 'ArrowRight') return [0, 'r'];
      if (k === ' ' || k === 'Spacebar' || k === 'Enter') return [0, 'x'];
      if (c === 'KeyA' || c === 'KeyQ' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') return [1, 'l'];
      if (c === 'KeyD' || k === 'd' || k === 'D') return [1, 'r'];
      if (c === 'KeyE' || k === 'e' || k === 'E') return [1, 'x'];
      if (k === 'ArrowUp' || k === 'ArrowDown') return [-1, ''];
      return null;
    }
    // en ligne : toutes les touches pilotent le joueur de CET appareil ; chez l'invité (écran tourné), gauche et droite s'inversent
    function keyMap(m) {
      if (!NET || m[0] < 0) return m;
      return [ME, FLIP && (m[1] === 'l' || m[1] === 'r') ? (m[1] === 'l' ? 'r' : 'l') : m[1]];
    }
    function onKeyDown(e) {
      if (destroyed || !visible() || isTyping(e)) return;
      let m = keyOf(e);
      if (!m) return;
      m = keyMap(m);
      if (m[0] === AIP) return;                               // les touches de l'IA ne font rien
      if (m[0] >= 0 && !paused) {
        if (m[1] === 'l') keys[m[0]].l = true;
        else if (m[1] === 'r') keys[m[0]].r = true;
        else if (m[1] === 'x' && !e.repeat) inputs[m[0]].release = true;
        syncKeys();
      }
      if ((e.key || '').indexOf('Arrow') === 0 || e.key === ' ') e.preventDefault();
    }
    function onKeyUp(e) {
      if (destroyed) return;
      let m = keyOf(e);
      if (!m || m[0] < 0) return;
      m = keyMap(m);
      if (m[1] === 'l') keys[m[0]].l = false;
      else if (m[1] === 'r') keys[m[0]].r = false;
      syncKeys();
    }
    const ptrs = new Map();
    function clearInputs() {
      ptrs.clear(); V.touches.clear();
      for (const k of keys) { k.l = false; k.r = false; }
      for (const inp of inputs) { inp.dx = 0; inp.target = null; inp.dir = 0; inp.release = false; inp.pad = 0; }
    }
    function onBlur() { if (!destroyed) clearInputs(); }
    // --- manette (api.pad, CONTRACT.md « Ajout 10 ») : lue une fois par image, comme les doigts : stick ou croix = raquette
    // (vitesse proportionnelle, douce au centre, rapide à fond), A ou B = lâcher la balle collée. Joueur du haut assis en face :
    // la bibliothèque retourne déjà son stick. Contre l'IA / en ligne : seul MON joueur a une manette.
    const PAD = api.pad && typeof api.pad.get === 'function' ? api.pad : null;
    function padCurve(v) { const a = Math.min(1, Math.abs(v)); return Math.sign(v) * (0.28 * a + 0.72 * a * a); }
    function padRead(live) {
      if (!PAD) return;
      for (let p = 0; p < 2; p++) {
        if (p === AIP || (NET && p !== ME)) continue;
        let g = null, hit = false;
        try { g = PAD.get(p); hit = PAD.pressed('a', p); hit = PAD.pressed('b', p) || hit; } catch (e) { g = null; }
        const inp = inputs[p];
        inp.pad = live && g && g.on ? padCurve(g.mx) : 0;
        if (live && hit) inp.release = true;
      }
    }
    // la manette pilote ce joueur en ce moment : ses aides montrent les boutons
    function padShow(p) { try { return !!PAD && PAD.active() && PAD.any(p); } catch (e) { return false; } }
    function rumble(kind, p) { try { if (PAD && PAD.rumble && p !== AIP) PAD.rumble(kind, p); } catch (e) { /* rien */ } }
    // ligne de texte avec des pastilles de boutons : parts = ['TEXTE', { g: 'a' }, …], centrée en (x, y), repère courant
    function padLine(parts, x, y, px, col, font, p) {
      const r = px * 0.82, gap = px * 0.32;
      ctx.font = px + 'px ' + font;
      const ws = parts.map(q => (typeof q === 'string' ? ctx.measureText(q).width : r * 2));
      let tw = gap * (parts.length - 1);
      for (const w of ws) tw += w;
      let cx = x - tw / 2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      parts.forEach((q, i) => {
        if (typeof q === 'string') strokeText(ctx, q, cx, y, px, col, font, 0);
        else { try { PAD.drawGlyph(ctx, q.g, cx + r, y, r, p); } catch (e) { /* rien */ } }
        cx += ws[i] + gap;
      });
      ctx.textAlign = 'center';
    }
    // position du doigt dans le canvas (px CSS) ; chez l'invité l'écran est tourné de 180° : on la retourne
    function pxy(e, rect) {
      let x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (FLIP) { x = rect.width - x; y = rect.height - y; }
      return [x, y];
    }
    function onPointerDown(e) {
      if (destroyed) return;
      e.preventDefault();
      if (paused) return;
      const mouse = e.pointerType === 'mouse';
      if (mouse && e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const c = pxy(e, rect);
      const p = NET ? ME : c[1] > rect.height / 2 ? 0 : 1;          // moitié du bas = P0 ; en ligne : tout l'écran est à moi
      if (p === AIP) return;                                         // contre l'IA : sa moitié n'écoute pas les doigts
      ptrs.set(e.pointerId, { p, lastX: c[0], sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, mouse });
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      if (mouse) inputs[p].target = (c[0] - offX) / scale;
      V.touches.set(e.pointerId, { p, x: (c[0] - offX) / scale, y: (c[1] - offY) / scale, t: 0 });
    }
    function onPointerMove(e) {
      const pt = ptrs.get(e.pointerId);
      if (!pt || destroyed || paused) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const c = pxy(e, rect);
      if (pt.mouse) inputs[pt.p].target = (c[0] - offX) / scale;
      else inputs[pt.p].dx += ((c[0] - pt.lastX) / scale) * TOUCH_GAIN;
      pt.lastX = c[0];
      if (Math.abs(e.clientX - pt.sx) > 12 || Math.abs(e.clientY - pt.sy) > 12) pt.moved = true;
      const tc = V.touches.get(e.pointerId);
      if (tc) { tc.x = (c[0] - offX) / scale; tc.y = (c[1] - offY) / scale; }
    }
    function onPointerUp(e) {
      V.touches.delete(e.pointerId);
      const pt = ptrs.get(e.pointerId);
      if (!pt) return;
      ptrs.delete(e.pointerId);
      if (destroyed) return;
      // petite tape sans glisser : lâche la balle collée
      if (e.type === 'pointerup' && !pt.moved && performance.now() - pt.t < 320 && !paused) inputs[pt.p].release = true;
      if (pt.mouse) {
        let still = false;
        for (const q of ptrs.values()) if (q.mouse && q.p === pt.p) still = true;
        if (!still) inputs[pt.p].target = null;
      }
    }
    function prevent(e) { e.preventDefault(); }

    // ===========================================================================
    // JEU EN LIGNE (api.net)
    //  - L'HÔTE simule tout. ~30 fois/s il envoie l'état (balles avec leurs vitesses, raquettes, bonus en vol, briques
    //    mobiles, temps de jeu), et en FIABLE les événements datés (manche + graine, briques, bonus, buts, sons).
    //  - L'INVITÉ affiche l'état de l'hôte avec un petit retard constant (interpolation sur l'horloge commune, prolongée
    //    par les vitesses s'il manque un paquet, corrections douces). Sa raquette suit son doigt sans attendre (~60 envois/s).
    //  - Les rebonds sur la raquette de l'invité se jugent CHEZ L'INVITÉ, sur ce qu'il voit : il montre tout de suite le
    //    rebond (prédiction) et envoie son verdict ; l'hôte rejoue alors ce passage (retour en arrière + avance rapide).
    //    En attendant, l'hôte fait un rebond provisoire avec la dernière position connue, et ne marque jamais sans verdict.
    // Tout est en unités du terrain logique (W x H), le même sur tous les écrans.
    // ===========================================================================
    let VB = null;                                           // balles affichées chez l'hôte (corrections lissées), sinon S.balls
    function viewBalls() { return VB || S.balls; }
    const PHS = ['idle', 'intro', 'play', 'point', 'over'];
    const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
    const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    function pct(arr, q) { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1) + 0.5))]; }
    const N = NET ? {
      now: 0, off: null, stats: { out: 0, bytes: 0, snaps: 0, evs: 0, verdicts: 0, rewinds: 0, extrap: 0, frames: 0, hits: 0, misses: 0, caps: 0 },
      // hôte
      q: [], batch: [], snapAcc: 0, snapN: 0, lastR: null, boff: new Map(), p1: [], p1N: -1, p1Ages: [], p1Delay: -1, p1From: null, p1To: null,
      // invité
      buf: [], ages: [], delay: -1, delayInit: false, tr: 0, g: 0, gPrev: null, evq: [], pred: new Map(), disp: new Map(), cross: new Map(),
      capJ: new Set(), capLocal: new Set(), ghosts: [], seq: 0, padN: 0, padT: -1e9, padLast: null, pad: { x: W / 2, vx: 0 }, gotR: false, hiT: 0.8
    } : null;
    function nlog(a) { const L = N.stats.log || (N.stats.log = []); if (L.length < 400) L.push(a); }   // journal (tests)
    function rttMs() { try { return num(typeof NET.rtt === 'function' ? NET.rtt() : NaN, 160); } catch (e) { return 160; } }
    function nsend(m, rel) {
      try { NET.send(m, { reliable: !!rel }); } catch (e) { return; }
      N.stats.out++;
      try {
        const L = JSON.stringify(m).length;
        N.stats.bytes += L;
        const k = m.k === 's' ? 'S' : m.k;                      // tailles par type (états, événements, raquette…)
        const z = N.stats.sizes || (N.stats.sizes = {});
        const e = z[k] || (z[k] = [0, 0, 0]);
        e[0]++; e[1] += L; if (L > e[2]) e[2] = L;
      } catch (e) { /* rien */ }
    }
    function onNet(m) {
      if (destroyed || !m || typeof m !== 'object') return;
      if (HOST) {
        if (m.k === 'p') hostPadSample(m);
        else if ((m.k === 'v' || m.k === 'c' || m.k === 'hi') && N.q.length < 300) N.q.push(m);
        return;
      }
      if (m.k === 's') guestSnap(m);
      else if (m.k === 'e') guestEvents(m);
      else if (m.k === 'R') N.evq.push({ ts: m.rs || !N.gotR ? -Infinity : num(m.ts, -Infinity), R: m });
    }
    // horloge commune (celle de l'hôte), lissée et calée sur les images : pas de tremblement d'une image à l'autre
    function netClock(tsMs) {
      let o = 0;
      try { o = num(NET.now(), 0) - tsMs; } catch (e) { o = 0; }
      if (N.off == null || Math.abs(o - N.off) > 60) N.off = o; else N.off += (o - N.off) * 0.03;
      N.now = tsMs + N.off;
      if (HOST) S.nowTs = N.now;
    }

    // ---------------- hôte ----------------
    function hostPadSample(m) {
      const x = num(m.x, NaN), t = num(m.t, NaN), n = num(m.n, 0);
      if (x !== x || t !== t || n <= N.p1N) return;          // abîmé, ou plus vieux que le dernier reçu (désordre)
      N.p1N = n;
      N.p1.push({ t, x: clamp(x, 0, W), v: clamp(num(m.v, 0), -4000, 4000) });
      if (N.p1.length > 120) N.p1.splice(0, N.p1.length - 120);
      N.p1Ages.push(num(NET.now(), 0) - t); if (N.p1Ages.length > 60) N.p1Ages.shift();
    }
    // position de la raquette de l'invité, interpolée entre ses envois (petit retard réglé sur le réseau)
    function hostP1(dt) {
      const B = N.p1;
      if (!B.length) return null;
      const want = clamp(pct(N.p1Ages, 0.9) + 22, 12, 450);
      if (N.p1Delay < 0) N.p1Delay = want; else N.p1Delay += clamp(want - N.p1Delay, -dt * 60, dt * 60);
      const t = N.now - N.p1Delay;
      let i = 0;
      while (i + 1 < B.length && B[i + 1].t <= t) i++;
      if (i > 0) B.splice(0, i);
      const a = B[0], b = B[1];
      if (t <= a.t) return a.x;
      if (b) return a.x + (b.x - a.x) * clamp((t - a.t) / Math.max(1, b.t - a.t), 0, 1);
      return a.x + (a.v * clamp(t - a.t, 0, 60)) / 1000;
    }
    function hostNetIn(dt) {
      const q = N.q; N.q = [];
      for (const m of q) {
        try { if (m.k === 'v') hostVerdict(m); else if (m.k === 'c') hostCap(m); else hostHello(); } catch (e) { /* message abîmé : ignoré */ }
      }
      const wait = clamp(rttMs() / 1000 + 0.45, 0.6, 1.6);  // au-delà, on garde le résultat provisoire
      S.capWait = wait;
      // pas de verdict à temps (réseau coupé ?) : le résultat provisoire devient définitif
      for (const r of S.pend.filter(q => S.clock - q.clk >= wait)) {
        const i = S.pend.indexOf(r);
        if (i < 0) continue;
        S.pend.splice(i, 1);
        nlog(['timeout', r.id, r.prov]);
        const b = S.balls.find(o => o.id === r.id);
        if (b && S.phase === 'play') resolveRec(r, b, !!r.prov, { o: r.off, sp: r.spin, bx: r.snap.x, st: r.st, ox: r.ox });
      }
      const x = hostP1(dt);
      if (x != null) { N.p1From = N.p1To == null ? x : N.p1To; N.p1To = x; }
      const last = N.p1[N.p1.length - 1];
      S.g1 = last ? { x: last.x, v: last.v, lead: clamp((N.now - last.t) / 1000 + rttMs() / 2000 + 0.06, 0, 0.8) } : null;
    }
    function hostNetOut(dt) {
      if (N.batch.length) flushEvents();
      N.snapAcc += dt;
      if (N.snapAcc >= 1 / 30 - 0.004) { N.snapAcc = Math.min(N.snapAcc - 1 / 30, 0.02); sendSnap(); }
    }
    function sendSnap() {
      const e = [];
      for (const pl of S.pl) e.push(r1(pl.eff.big), r1(pl.eff.shrink), r1(pl.eff.fire), r1(pl.eff.glue), pl.shield ? 1 : 0);
      nsend({
        k: 's', n: ++N.snapN, ts: Math.round(S.nowTs), g: r3(S.gt), ph: Math.max(0, PHS.indexOf(S.phase)), t: r3(S.t), pt: r3(S.playT),
        sl: Math.round(S.slow * 100) / 100, r: S.round, a: S.ack,
        p: [r1(S.pl[0].x), r1(S.pl[0].w), r1(S.pl[1].x), r1(S.pl[1].w)], e,
        b: S.balls.map(b => [b.id, r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), r1(b.sp), (b.owner + 1) | (b.fire ? 4 : 0) | ((b.stuck + 1) << 3),
          r1(b.offX || 0), Math.round((b.stickT || 0) * 100) / 100]),
        c: S.caps.map(c => [c.id, r1(c.x), r1(c.y), POWER_KEYS.indexOf(c.type), c.to]),
        m: S.movers.map(g => [r1(g.off), r1(g.vx)])
      }, false);
    }
    // événement de la simulation → tableau compact, daté (ms) par rapport au paquet
    function netEv(e) {
      let a;
      switch (e.k) {
        case 'go': case 'sudden': a = [e.k]; break;
        case 'paddle': a = ['paddle', e.p, r1(e.x), r1(e.y), r3(e.off || 0), r1(e.sp || 0), e.fire ? 1 : 0]; break;
        case 'wall': a = ['wall', r1(e.x), r1(e.y), e.owner, e.id || 0]; break;
        case 'chip': a = ['chip', e.br.id, e.br.hp, e.owner, r1(e.x), r1(e.y)]; break;
        case 'break': a = ['break', e.br.id, e.owner, r1(e.x), r1(e.y), e.fire ? 1 : 0, Math.round(e.vx || 0), Math.round(e.vy || 0)]; break;
        case 'cap': a = ['cap', e.to, r1(e.x), r1(e.y), e.type]; break;
        case 'power': a = ['power', e.p, e.type, r1(e.x), e.cap || 0]; break;
        case 'shield': a = ['shield', e.p, r1(e.x), r1(e.y)]; break;
        case 'stick': case 'launch': a = [e.k, e.p, r1(e.x), r1(e.y)]; break;
        case 'goal': a = ['goal', e.p, r1(e.x), e.fire ? 1 : 0, e.ov ? 1 : 0]; break;
        default: return;                                     // 'round' part à part (message R) ; 'next', 'capmiss' : rien à rejouer
      }
      a.splice(1, 0, Math.round((e.ts != null ? e.ts : S.nowTs) - S.nowTs));
      N.batch.push(a);
    }
    function flushEvents() {
      const ts = Math.round(S.nowTs);
      let pack = [], len = 0;
      const out = () => { if (pack.length) { nsend({ k: 'e', ts, l: pack }, true); N.stats.evs += pack.length; } pack = []; len = 0; };
      for (const a of N.batch) { const n = JSON.stringify(a).length + 1; if (len + n > 850) out(); pack.push(a); len += n; }
      out();
      N.batch = [];
    }
    // l'invité vient d'arriver (ou s'est perdu) : on lui redonne la manche en cours, briques cassées comprises
    function hostHello() {
      if (!N.lastR) return;
      const d = [], h = [];
      for (const br of S.bricks) { if (br.dead) d.push(br.id); else if (br.hp !== br.maxHp) h.push([br.id, br.hp]); }
      nsend(Object.assign({ ts: Math.round(S.nowTs), rs: 1, d, h }, N.lastR), true);
    }
    // verdict de l'invité sur SA raquette : h = 1 renvoyée, 0 ratée, 2 balle collée lâchée
    function hostVerdict(m) {
      const s = num(m.s, 0) | 0;
      if (s > S.ack) S.ack = s;
      N.stats.verdicts++;
      if (S.phase !== 'play') return;
      const b = S.balls.find(o => o.id === m.id && !o.dead);
      const pl = S.pl[1], half = pl.w / 2;
      if (m.h === 2) {
        if (!b || b.stuck !== 1) return;
        const before = { x: b.x, y: b.y }, dur = clamp(S.gt - num(m.g, S.gt), 0, 0.6);
        pl.x = clamp(num(m.x, pl.x), half, W - half);
        b.offX = clamp(num(m.ox, b.offX), -half + 3, half - 3);
        b.x = pl.x + b.offX;
        launchFrom(S, b, 1, clamp(b.offX / half, -1, 1));
        emit(S, { k: 'launch', p: 1, x: b.x, y: b.y });
        ffBall(b, dur, S.nowTs - dur * 1000);
        jumpFx(b, before);
        return;
      }
      let i = -1, best = 1e9;
      const mg = num(m.g, NaN);
      S.pend.forEach((r, j) => {
        if (r.id !== m.id) return;
        const dgap = mg === mg ? mg - r.g : 0;                 // le verdict arrive pendant ou juste après l'entrée de la balle
        if (dgap < -0.12 || dgap > 0.45) return;
        if (Math.abs(dgap - 0.03) < best) { best = Math.abs(dgap - 0.03); i = j; }
      });
      if (i < 0) { nlog(['nopend', m.id, m.h, b ? [Math.round(b.x), Math.round(b.y), Math.round(b.vy), b.stuck, b.xr || 0, b.skip1 ? 1 : 0] : null, S.pend.map(r => r.id), r3(num(m.g, 0)), r3(S.gt)]); return; }
      const rec = S.pend[i];
      S.pend.splice(i, 1);
      if (!b) { nlog(['noball', m.id, m.h]); return; }
      let hit = m.h === 1;
      if (hit) {                                              // vérification (règles du jeu) : la balle était là, la raquette aussi
        const hw = Math.max(half, (rec.w || pl.w) / 2), px = clamp(num(m.x, -1e3), hw, W - hw), bx = num(m.bx, rec.snap.x);
        const slope = Math.abs(rec.snap.vx) / Math.max(1, Math.abs(rec.snap.vy));
        if (Math.abs(bx - rec.snap.x) > 30 + slope * 22 || Math.abs(bx - px) > hw + BR + 10) { hit = false; nlog(['refus', m.id, Math.round(bx), Math.round(rec.snap.x), Math.round(px), Math.round(half), r3(num(m.g, 0)), r3(rec.g), Math.round(rec.snap.vx)]); }
      }
      if (hit) N.stats.hits++; else N.stats.misses++;
      nlog([hit ? 'hit' : 'miss', m.id, rec.prov, Math.round((S.clock - rec.clk) * 1000), r3(num(m.o, 0)), r3(rec.off), rec.touched ? 1 : 0]);
      resolveRec(rec, b, hit, m);
    }
    // résultat définitif d'un passage. Si le trajet provisoire était faux, ou s'il a touché des briques (« à sec »),
    // on le rejoue : retour à l'arrivée de la balle, verdict appliqué, puis avance rapide jusqu'à maintenant (briques cassées pour de vrai)
    function resolveRec(rec, b, hit, m) {
      const pl = S.pl[1];
      if (b.pv === rec) b.pv = null;
      const same = hit ? rec.prov && !m.st && !rec.st && b.stuck < 0 && Math.abs(num(m.o, 0) - rec.off) < 0.03 && Math.abs(num(m.sp, 0) - rec.spin) < 0.01
        : !rec.prov;
      if (same && !rec.touched) return;                       // la balle est déjà sur le bon chemin
      S.pend = S.pend.filter(r => r.id !== b.id || r.g < rec.g);
      const before = { x: b.x, y: b.y };
      Object.assign(b, rec.snap);
      b.xr = 1; b.skip1 = false; b.pv = null;
      if (rec.prov) S.rally = rec.rally;
      let g0 = rec.g;
      if (hit) {
        g0 = clamp(num(m.g, rec.g), rec.g - 0.05, rec.g + 0.12);
        if (rec.shield) pl.shield = true;
        forceHit1(b, m, rec.prov === 1);
      } else b.skip1 = true;
      N.stats.rewinds++;
      const dur = clamp(S.gt - g0, 0, 1);
      ffBall(b, dur, S.nowTs - dur * 1000);
      jumpFx(b, before);
    }
    function forceHit1(b, m, quiet) {
      const pl = S.pl[1], half = pl.w / 2;
      b.x = clamp(num(m.bx, b.x), BR, W - BR);
      b.sp = Math.min(speedCap(S), Math.max(speedFloor(S), b.sp * 1.045));
      b.owner = 1; pl.hits++; S.rally++;
      if (m.st && (pl.eff.glue > 0 || S.gt - (pl.glueG || -9) < 1.5)) {
        b.stuck = 1; b.offX = clamp(num(m.ox, b.x - pl.x), -half + 3, half - 3); b.stickT = 1.25;
        b.y = padFace(1); b.vx = 0; b.vy = 0;
        if (!quiet) emit(S, { k: 'stick', p: 1, x: b.x, y: b.y });
      } else {
        const off = clamp(num(m.o, 0), -1, 1);
        launchFrom(S, b, 1, off, clamp(num(m.sp, 0), -0.1, 0.1));
        if (!quiet) emit(S, { k: 'paddle', p: 1, x: b.x, y: b.y, off, sp: b.sp, fire: pl.eff.fire > 0 });
      }
    }
    // avance rapide d'une seule balle (après un verdict), événements datés à leur vrai moment
    function ffBall(b, dur, ts0) {
      const gEnd = S.gt, g0 = gEnd - dur;
      // briques cassées (par une autre balle) APRÈS le début du passage rejoué : à l'époque elles étaient encore là
      const later = S.bricks.filter(br => br.dead && br.deadG > g0);
      let el = 0;
      S.ff = true;
      try {
        while (dur - el > 1e-6 && S.phase === 'play' && S.balls.indexOf(b) >= 0) {
          const h = Math.min(STEP, dur - el);
          S.evTs = ts0 + el * 1000;
          S.gt = g0 + el + h;
          for (const br of later) {
            const was = br.deadG > S.gt;
            if (was && br.dead) { br.dead = false; br.ghost = true; for (const c of br.cells) if (!S.cells[c]) S.cells[c] = br; }
            else if (!was && br.ghost) { br.dead = true; br.ghost = false; for (const c of br.cells) if (S.cells[c] === br) S.cells[c] = null; }
          }
          updateBall(S, b, h, null);
          el += h;
        }
      } finally {
        for (const br of later) if (br.ghost) { br.dead = true; br.ghost = false; for (const c of br.cells) if (S.cells[c] === br) S.cells[c] = null; }
        S.gt = gEnd; S.evTs = null; S.ff = false;
      }
    }
    // la balle a « sauté » (verdict rejoué) : à l'écran de l'hôte elle glisse vers sa nouvelle place au lieu de se téléporter
    function jumpFx(b, before) {
      if (b.stuck >= 0 || S.balls.indexOf(b) < 0) return;
      const o = N.boff.get(b.id) || { x: 0, y: 0 };
      o.x += before.x - b.x; o.y += before.y - b.y;
      if (Math.hypot(o.x, o.y) > 320) { N.boff.delete(b.id); return; }
      N.boff.set(b.id, o);
    }
    function hostDisplayBalls(dt) {
      VB = null;
      if (!N.boff.size) return;
      const out = [];
      for (const b of S.balls) {
        const o = N.boff.get(b.id);
        if (!o) { out.push(b); continue; }
        const m = Math.hypot(o.x, o.y), k = Math.exp(-dt / (0.1 + m / 1000));   // glisse en ~0,1-0,3 s : une courbe, pas un saut
        o.x *= k; o.y *= k;
        if (m < 0.4 || b.stuck >= 0) { N.boff.delete(b.id); out.push(b); continue; }
        out.push(Object.assign({}, b, { x: b.x + o.x, y: b.y + o.y }));
      }
      for (const id of Array.from(N.boff.keys())) if (!S.balls.some(b => b.id === id)) N.boff.delete(id);
      VB = out;
    }
    // bonus de l'invité : attrapé (g = 1) ou raté, d'après ce qu'il a vu
    function hostCap(m) {
      if (S.phase !== 'play') return;
      const c = S.caps.find(o => o.id === m.id && !o.got && o.to === 1);
      if (!c) return;
      c.got = true;
      N.stats.caps++;
      if (m.g && c.y < PY[1] + 140) {
        const pl = S.pl[1];
        pl.x = clamp(num(m.x, pl.x), pl.w / 2, W - pl.w / 2);
        applyPower(S, 1, c.type, c.x, c.id);
        if (c.type === 'shield') pl.shieldG = clamp(num(m.t, S.gt), S.gt - 1.5, S.gt);   // daté : quand l'invité l'a attrapé
      } else emit(S, { k: 'capmiss', to: 1, x: c.x });
      S.caps = S.caps.filter(o => !o.got);
    }

    // ---------------- invité ----------------
    function guestSnap(m) {
      if (typeof m.ts !== 'number' || typeof m.g !== 'number' || !Array.isArray(m.b) || !Array.isArray(m.p) || !Array.isArray(m.e)) return;
      N.ages.push(num(NET.now(), 0) - m.ts); if (N.ages.length > 60) N.ages.shift();
      const B = N.buf;
      for (let j = B.length - 1; j >= 0 && j >= B.length - 8; j--) if (B[j].n === m.n) return;
      let i = B.length;
      while (i > 0 && B[i - 1].ts > m.ts) i--;               // arrivé dans le désordre : on le range à sa place
      B.splice(i, 0, m);
      if (B.length > 90) B.splice(0, B.length - 90);
      N.stats.snaps++;
    }
    function guestEvents(m) {
      if (!Array.isArray(m.l)) return;
      const ts = num(m.ts, -Infinity);
      for (const a of m.l) if (Array.isArray(a) && typeof a[0] === 'string') N.evq.push({ ts: ts + num(a[1], 0), a });
      if (N.evq.length > 800) N.evq.splice(0, N.evq.length - 800);
    }
    function guestFrame(dt) {
      N.stats.frames++;
      // retard d'affichage : juste assez pour avoir presque toujours deux états autour de l'instant montré
      const want = N.ages.length >= 3 ? clamp(pct(N.ages, 0.9) + 40, 45, 700) : clamp(rttMs() / 2 + 60, 60, 700);
      if (!N.delayInit && N.ages.length >= 3) { N.delay = want; N.delayInit = true; }
      // changement lent (3 %) et seulement s'il vaut la peine : le temps affiché avance régulièrement
      if (N.delay < 0) N.delay = want; else if (Math.abs(want - N.delay) > 6) N.delay += clamp(want - N.delay, -dt * 30, dt * 30);
      N.tr = N.now - N.delay;
      if (!N.gotR) { N.hiT -= dt; if (N.hiT <= 0) { N.hiT = 0.8; nsend({ k: 'hi' }, true); } }
      // événements de l'hôte, rejoués à l'heure où ils se sont produits (sur la même horloge que l'affichage)
      while (N.evq.length && (N.evq[0].ts <= N.tr || N.evq[0].ts - N.tr > 3000)) {
        const q = N.evq.shift();
        try { if (q.R) guestRound(q.R); else guestEv(q.a, q.ts); } catch (e) { V.err++; }
      }
      drainEvents();
      guestPad(dt);
      if (N.gotR) guestView(dt);
      guestSendPad();
    }
    // ma raquette : tout de suite sous mon doigt (mêmes règles qu'en local), envoyée à l'hôte
    function guestPad(dt) {
      const pl = S.pl[1], inp = inputs[1], P = N.pad;
      let x = P.x;
      if (S.phase !== 'over') {
        if (inp.dx) x += inp.dx;
        if (inp.target != null) { const mx = 1700 * dt; x += clamp(inp.target - x, -mx, mx); }
        if (inp.dir) x += inp.dir * KEY_SPEED * dt;
        if (inp.pad) x += inp.pad * PAD_SPEED * dt;
      }
      inp.dx = 0;
      x = clamp(x, pl.w / 2, W - pl.w / 2);
      const v = dt > 0 ? (x - P.x) / dt : 0;
      P.vx += (v - P.vx) * Math.min(1, dt * 25);              // vitesse lissée (~40 ms) : l'effet donné à la balle
      P.x = x; pl.x = x; pl.vx = P.vx;
    }
    function guestSendPad() {
      if (N.now - N.padT < 14) return;
      const x = r1(N.pad.x);
      if (x === N.padLast && N.now - N.padT < 100) return;
      N.padT = N.now; N.padLast = x;
      nsend({ k: 'p', n: ++N.padN, x, v: Math.round(N.pad.vx), t: Math.round(N.now) }, false);
    }
    function headsByName(names) {
      let all = [];
      try { const h = api.heads ? api.heads() : null; if (Array.isArray(h)) all = h.filter(x => x); } catch (e) { all = []; }
      return names.slice(0, 12).map(n => all.find(x => String(x.name || '') === String(n) && imgOk(x.img)) || { name: String(n || ''), img: null, sad: null });
    }
    function killBrick(br) {
      br.dead = true;
      for (const i of br.cells) if (S.cells[i] === br) S.cells[i] = null;
      S.left--;
    }
    // nouvelle manche : le même mur que chez l'hôte (même graine, mêmes compteurs)
    function guestRound(m) {
      const r = num(m.r, 0) | 0;
      if (r < 1) return;
      if (N.gotR && !m.rs) vaporizeWall();
      N.gotR = true;
      const seed = num(m.ms, S.matchSeed) >>> 0;
      if (seed !== S.matchSeed) { S.matchSeed = seed; if (nebs) nebImg = nebs[(seed >>> 3) % nebs.length]; bg = null; }
      S.nid = num(m.nid, S.nid) | 0; S.patIdx = num(m.pp, -1) | 0; S.lastConceder = num(m.lc, -1) | 0; S.matchOver = false;
      V.heads = headsByName(Array.isArray(m.hn) ? m.hn : []);
      for (const k of Array.from(stickers.keys())) if (k.charAt(0) === 'c') stickers.delete(k);
      startRound(S, r, num(m.hc, 0));
      S.bmap = new Map();
      for (const br of S.bricks) S.bmap.set(br.id, br);
      if (Array.isArray(m.d)) for (const id of m.d) { const br = S.bmap.get(id); if (br && !br.dead) killBrick(br); }
      if (Array.isArray(m.h)) for (const q of m.h) { const br = Array.isArray(q) ? S.bmap.get(q[0]) : null; if (br && !br.dead) br.hp = clamp(num(q[1], br.hp) | 0, 1, br.maxHp); }
      N.pred.clear(); N.cross.clear(); N.disp.clear(); N.capJ.clear(); N.capLocal.clear(); N.ghosts = []; N.myShield = 0;
      N.pad.x = W / 2; S.pl[1].x = W / 2;
    }
    function guestEv(a, ts) {
      const k = a[0], p = a[2] === 1 ? 1 : 0;
      switch (k) {
        case 'go': onEvent({ k: 'go' }); break;
        case 'sudden': S.sudden = true; onEvent({ k: 'sudden' }); break;
        case 'paddle': if (p !== 1) onEvent({ k: 'paddle', p, x: num(a[3], W / 2), y: num(a[4], PY[p]), off: num(a[5], 0), sp: num(a[6], 300), fire: !!a[7] }); break;
        case 'wall': if (!N.pred.has(a[5])) onEvent({ k: 'wall', x: num(a[2], 0), y: num(a[3], MID), owner: a[4] === 0 || a[4] === 1 ? a[4] : -1 }); break;
        case 'chip': {
          const br = S.bmap && S.bmap.get(a[2]);
          if (!br || br.dead) break;
          br.hp = clamp(num(a[3], br.hp) | 0, 1, br.maxHp);
          onEvent({ k: 'chip', br, owner: num(a[4], -1), x: num(a[5], br.x), y: num(a[6], br.y) });
          break;
        }
        case 'break': {
          const br = S.bmap && S.bmap.get(a[2]);
          if (!br || br.dead) break;
          killBrick(br);
          // cassée à l'heure ts chez l'hôte : pour mes balles prédites, elle existe encore tant que l'image montrée est avant ts
          // (la balle de l'hôte a rebondi dessus juste à ce moment-là)
          if (N.ghosts.length > 30) N.ghosts.shift();
          N.ghosts.push({ br, ts: num(ts, -1e12) + 40 });
          onEvent({ k: 'break', br, owner: num(a[3], -1), x: num(a[4], br.x + br.w / 2), y: num(a[5], br.y + br.h / 2), fire: !!a[6], vx: num(a[7], 0), vy: num(a[8], 0) });
          break;
        }
        case 'cap': if (POWERS[a[5]]) onEvent({ k: 'cap', to: a[2] === 1 ? 1 : 0, x: num(a[3], W / 2), y: num(a[4], MID), type: a[5] }); break;
        case 'power': if (POWERS[a[3]] && !(p === 1 && a[5] && N.capLocal.has(a[5]))) onEvent({ k: 'power', p, type: a[3], x: num(a[4], W / 2) }); break;
        case 'shield': onEvent({ k: 'shield', p, x: num(a[3], W / 2), y: num(a[4], SHIELD_Y[p]) }); break;
        case 'stick': case 'launch': if (p !== 1) onEvent({ k, p, x: num(a[3], W / 2), y: num(a[4], PY[p]) }); break;
        case 'goal':
          N.pred.clear(); N.cross.clear(); N.goalR = S.round;
          onEvent({ k: 'goal', p, x: num(a[3], W / 2), fire: !!a[4], ov: a[5] ? 1 : 0 });
          break;
        default: break;
      }
    }
    // balle a (tableau d'un état) après d secondes de jeu (d < 0 : avant), rebonds sur les côtés compris
    function reflX(x, vx, d) {
      const L = W - 2 * BR, M = 2 * L;
      let u = x - BR + vx * d;
      u = ((u % M) + M) % M;
      return u > L ? [BR + M - u, -vx] : [BR + u, vx];
    }
    function bAt(a, d, padX) {
      const f = a[6] | 0, st = (f >> 3) - 1;
      const o = { id: a[0], x: num(a[1], W / 2), y: num(a[2], MID), vx: num(a[3], 0), vy: num(a[4], 0), sp: num(a[5], 300), owner: (f & 3) - 1,
        fire: !!(f & 4), stuck: st === 0 || st === 1 ? st : -1, offX: num(a[7], 0), stickT: num(a[8], 0) - Math.max(0, d), dead: false, hold: 0 };
      if (o.stuck >= 0) { o.x = padX[o.stuck] + o.offX; o.y = padFace(o.stuck); o.vx = 0; o.vy = 0; return o; }
      if (d) { const r = reflX(o.x, o.vx, d); o.x = r[0]; o.vx = r[1]; o.y += o.vy * d; }
      return o;
    }
    function moverClamp(gm, off) {
      let mn = Infinity, mx = -Infinity;
      for (const br of gm.cells) if (!br.dead) { mn = Math.min(mn, br.x0); mx = Math.max(mx, br.x0 + BW); }
      return mn === Infinity ? off : clamp(off, -mn, W - mx);
    }
    // ce que montre l'écran de l'invité : l'état de l'hôte à l'instant N.tr (interpolé), + mes prédictions
    function guestView(dt) {
      const B = N.buf;
      if (!B.length) return;
      let k = B.length;
      while (k > 0 && B[k - 1].ts > N.tr) k--;
      if (k > 3) { B.splice(0, k - 3); k = 3; }
      let s0 = k > 0 ? B[k - 1] : null, s1 = k < B.length ? B[k] : null, u = 0, g;
      if (!s0) { s0 = s1; s1 = null; g = s0.g; }
      else if (s1) { u = clamp((N.tr - s0.ts) / Math.max(1, s1.ts - s0.ts), 0, 1); g = s0.g + (s1.g - s0.g) * u; }
      else { g = s0.g + (clamp(N.tr - s0.ts, 0, 250) / 1000) * num(s0.sl, 1); N.stats.extrap++; }   // paquet en retard : on prolonge
      if (s1 && s1.r !== s0.r) s1 = null;
      const dg = N.gPrev == null ? 0 : clamp(g - N.gPrev, 0, 0.1);
      N.gPrev = g; N.g = g;
      if (s0.r !== S.round) { if (S.phase === 'intro') S.t += dt; return; }   // état d'une autre manche : on attend le bon
      const d0 = g - s0.g;
      S.phase = PHS[s0.ph] || S.phase;
      S.t = Math.max(0, num(s0.t, 0) + d0);
      S.playT = Math.max(0, num(s0.pt, 0) + (S.phase === 'play' ? d0 : 0));
      S.slow = num(s0.sl, 1);
      // raquettes (la mienne reste sous mon doigt), effets en cours
      const pl0 = S.pl[0], pl1 = S.pl[1];
      const lp = i => num(s1 ? s0.p[i] + (s1.p[i] - s0.p[i]) * u : s0.p[i], NaN);
      const x0 = lp(0), w0 = lp(1), w1 = lp(3);
      if (x0 === x0) pl0.x = x0;
      if (w0 === w0) pl0.w = w0;
      if (w1 === w1) pl1.w = w1;
      const dec = S.phase === 'play' ? d0 : 0;
      for (let j = 0; j < 4; j++) {
        pl0.eff[EFF_KEYS[j]] = Math.max(0, num(s0.e[j], 0) - dec);
        pl1.eff[EFF_KEYS[j]] = Math.max(0, num(s0.e[5 + j], 0) - dec);
      }
      pl0.shield = !!s0.e[4]; pl1.shield = !!s0.e[9];
      if (pl1.shield && N.myShield) N.myShield = 0;
      if (!pl1.shield) N.shUsed = false;                        // l'hôte l'a consommé lui aussi : prêt pour le prochain
      pl1.x = N.pad.x = clamp(N.pad.x, pl1.w / 2, W - pl1.w / 2);
      // briques qui bougent
      if (Array.isArray(s0.m)) S.movers.forEach((gm, j) => {
        const a = s0.m[j];
        if (!Array.isArray(a)) return;
        let off = num(a[0], 0) + num(a[1], 0) * dec;
        const b = s1 && Array.isArray(s1.m) ? s1.m[j] : null;
        if (Array.isArray(b)) off += (num(b[0], 0) + num(b[1], 0) * (S.phase === 'play' ? g - s1.g : 0) - off) * u;
        gm.off = moverClamp(gm, off);
        for (const br of gm.cells) br.x = br.x0 + gm.off;
      });
      // bonus en vol
      const caps = [];
      for (const a of Array.isArray(s0.c) ? s0.c : []) {
        if (!Array.isArray(a) || N.capLocal.has(a[0])) continue;
        const to = a[4] === 1 ? 1 : 0, vy = (to === 0 ? 1 : -1) * S.P.capSpeed;
        let y = num(a[2], MID) + vy * dec;
        const b = s1 && Array.isArray(s1.c) ? s1.c.find(c => Array.isArray(c) && c[0] === a[0]) : null;
        if (b) y += (num(b[2], MID) + vy * (S.phase === 'play' ? g - s1.g : 0) - y) * u;
        caps.push({ id: a[0], x: num(a[1], W / 2), y, type: POWER_KEYS[a[3]] || 'big', to, vy, t: 0, got: false });
      }
      S.caps = caps;
      // balles : mes prédictions confirmées par l'hôte s'arrêtent (il a pris en compte mon dernier verdict),
      // sauf si la balle prédite est justement en train de revenir vers ma raquette
      const ack = num(s0.a, 0);
      for (const [id, p] of N.pred) {
        const b = p.b, coming = b.stuck < 0 && b.vy < 0 && b.y <= approachY(b);
        if ((p.seq > 0 && ack >= p.seq && !coming) || V.rt - p.t0 > 2.5) {
          nlog(['end', id, r3(N.g), p.seq, ack, Math.round(b.y), V.rt - p.t0 > 2.5 ? 'timeout' : 'ack']);
          N.pred.delete(id);
          if (!coming) N.cross.delete(id);                     // un nouveau passage pourra être pris en main
        }
      }
      const padX = [pl0.x, pl1.x], list = [];
      for (const a of s0.b) {
        if (!Array.isArray(a) || N.pred.has(a[0])) continue;
        const a1 = s1 ? s1.b.find(q => Array.isArray(q) && q[0] === a[0]) : null;
        let T = bAt(a, d0, padX);
        if (a1) {
          const Tb = bAt(a1, g - s1.g, padX);
          // la balle rebondit chez l'hôte tout près de MA raquette : c'est moi qui juge, on ne mélange pas les deux états
          const nearMe = num(a[4], 0) < 0 && num(a1[4], 0) > 0 && num(a1[2], MID) < PY[1] + 90 && T.y < PY[1] + 120;
          if (T.stuck < 0 && Tb.stuck < 0) {
            if (!nearMe) {
              T.x += (Tb.x - T.x) * u; T.y += (Tb.y - T.y) * u; T.vx += (Tb.vx - T.vx) * u; T.vy += (Tb.vy - T.vy) * u; T.sp += (Tb.sp - T.sp) * u;
              if (u >= 0.5) { T.owner = Tb.owner; T.fire = Tb.fire; }
            }
          } else if (u >= 0.5) T = Tb;
        }
        // elle arrive sur ma raquette : je prends la main (prédiction locale) avant que l'hôte ne décide quoi que ce soit
        if (T.stuck < 0 && T.vy > 0) N.cross.delete(T.id);
        else if (S.phase === 'play' && N.goalR !== S.round && T.stuck < 0 && T.vy < 0 && !N.cross.has(T.id) && T.y <= approachY(T) &&
          (a1 || num(a[2], MID) < MID - wallFront(S) - BR)) {   // jamais à partir d'une position prolongée à travers le mur
          N.cross.set(T.id, 1);
          N.pred.set(T.id, { b: T, seq: 0, judged: false, t0: V.rt, fresh: true });
          nlog(['appr', T.id, r3(N.g), Math.round(T.x), Math.round(T.y), a1 ? 1 : 0]);
          continue;
        }
        list.push(T);
      }
      for (const p of N.pred.values()) {
        if (!p.fresh) guestPredict(p, dg);
        p.fresh = false;
        if (!p.b.hold) list.push(p.b);                         // sortie du terrain : on attend le but de l'hôte
      }
      if (N.goalR === S.round) list.length = 0;               // le but est marqué : les balles ont disparu chez l'hôte aussi
      // affichage : corrections douces (un saut de l'état cible glisse en ~0,1 s au lieu de se voir)
      const out = [];
      for (const T of list) {
        let d = N.disp.get(T.id);
        if (!d) { d = { tx: T.x, ty: T.y, vx: T.vx, vy: T.vy, ex: 0, ey: 0, st: T.stuck, o: {} }; N.disp.set(T.id, d); }
        else if (T.stuck < 0 && d.st < 0) {
          const mv = Math.hypot(T.x - d.tx, T.y - d.ty), lim = Math.max(T.sp, 60) * Math.max(dg, 0.004) * 1.3 + 2.5;
          if (mv > lim) {
            if (mv < 300) { d.ex += d.tx + d.vx * dg - T.x; d.ey += d.ty + d.vy * dg - T.y; } else { d.ex = 0; d.ey = 0; }
          }
        } else { d.ex = 0; d.ey = 0; }
        const em = Math.hypot(d.ex, d.ey);
        if (em > 0.05) { const kk = Math.exp(-dt / (0.075 + em / 3000)); d.ex *= kk; d.ey *= kk; } else { d.ex = 0; d.ey = 0; }
        d.tx = T.x; d.ty = T.y; d.vx = T.vx; d.vy = T.vy; d.st = T.stuck;
        const o = d.o;
        o.id = T.id; o.x = T.x + d.ex; o.y = T.y + d.ey; o.vx = T.vx; o.vy = T.vy; o.sp = T.sp; o.owner = T.owner; o.fire = T.fire;
        o.stuck = T.stuck; o.offX = T.offX; o.stickT = T.stickT; o.dead = false;
        out.push(o);
      }
      if (N.disp.size > out.length) for (const id of Array.from(N.disp.keys())) if (!out.some(o => o.id === id)) N.disp.delete(id);
      S.balls = out;
      // ma balle collée : je la lâche (tape, touche, ou fin du temps)
      if (inputs[1].release) { inputs[1].release = false; guestRelease(null); }
      for (const o of out) if (o.stuck === 1 && o.stickT <= 0) guestRelease(o.id);
      if (S.phase === 'play') guestCaps();
    }
    // zone d'approche de ma raquette : on y prend la main un peu avant le rebond (plus tôt si la balle va vite)
    function approachY(b) { return PY[1] + PH / 2 + BR + clamp(b.sp * 0.1, 24, 90); }
    // balle prédite chez moi : rebonds sur les côtés et les briques (sans les casser), bouclier, et MON verdict à ma raquette
    function guestPredict(p, dg) {
      const b = p.b, pl = S.pl[1];
      if (b.stuck === 1) { b.x = pl.x + b.offX; b.y = padFace(1); b.stickT -= dg; return; }
      if (b.hold || !(dg > 0)) return;
      if (b.owner >= 0) { const fl = speedFloor(S); if (b.sp < fl) b.sp = Math.min(fl, b.sp + 30 * dg); }
      b.fire = b.owner >= 0 && S.pl[b.owner].eff.fire > 0;
      fixVel(b);
      const n = Math.max(1, Math.ceil((b.sp * dg) / (BR * 0.5))), h = dg / n, zone = wallFront(S) + BR + 1;
      S.dry = true;
      const gh = [], fx = [];
      for (const q of N.ghosts) if (q.ts > N.tr && q.br.dead) {      // pas encore cassée à l'instant montré : encore solide
        q.br.dead = false;
        for (const c of q.br.cells) if (!S.cells[c]) S.cells[c] = q.br;
        gh.push(q.br);
      }
      try {
        for (let i = 0; i < n && b.stuck < 0 && !b.hold; i++) {
          b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); fx.push({ k: 'wall', x: 0, y: b.y, owner: b.owner }); }
          else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); fx.push({ k: 'wall', x: W, y: b.y, owner: b.owner }); }
          const dy = Math.abs(b.y - MID);
          if (dy < zone && dy > LANE - BR - 1) { collideBricks(S, b); if (S.movers.length) collideMovers(S, b); }
          if (b.vy > 0) p.judged = false;                     // elle repart : le prochain passage sera jugé aussi
          else if (!p.judged && b.vy < 0 && b.y - BR <= PY[1] + PH / 2) {
            if (b.y < PY[1] - 3) guestMiss(p);
            else if (Math.abs(b.x - pl.x) <= pl.w / 2 + BR * 0.8 + 1) guestHit(p);
          }
          if (b.vy > 0 && S.pl[0].shield && b.y + BR >= SHIELD_Y[0]) { b.y = SHIELD_Y[0] - BR; b.vy = -Math.abs(b.vy); }
          else if (b.vy < 0 && ((pl.shield && !N.shUsed) || N.myShield === 1) && b.y - BR <= SHIELD_Y[1]) {
            b.y = SHIELD_Y[1] + BR; b.vy = Math.abs(b.vy);
            if (N.myShield === 1) N.myShield = 2;               // utilisé (l'hôte fera pareil)
            N.shUsed = true;                                     // un bouclier ne sert qu'une fois, même avec plusieurs balles
            fx.push({ k: 'shield', p: 1, x: b.x, y: SHIELD_Y[1] });
          }
          if (b.y < -70) { b.y = -70; b.hold = 1; }
          else if (b.y > H + 70) { b.y = H + 70; b.hold = 1; }
        }
      } finally {
        S.dry = false;
        for (const br of gh) { br.dead = true; for (const c of br.cells) if (S.cells[c] === br) S.cells[c] = null; }
      }
      for (const e of fx) onEvent(e);                          // étincelles et sons de MA balle, au moment où je la vois rebondir
      if (b.stuck < 0) fixVel(b);
    }
    function guestHit(p) {
      const b = p.b, pl = S.pl[1], half = pl.w / 2, bx = b.x;
      const off = clamp((bx - pl.x) / (half + BR * 0.5), -1, 1), spin = clamp(pl.vx / 2600, -0.1, 0.1);
      b.sp = Math.min(speedCap(S), Math.max(speedFloor(S), b.sp * 1.045));
      b.owner = 1;
      const m = { k: 'v', s: ++N.seq, id: b.id, h: 1, bx: r1(bx), x: r1(pl.x), o: r3(off), sp: r3(spin), g: r3(N.g) };
      nlog(['vHit', b.id, m.g, Math.round(bx), m.s]);
      if (pl.eff.glue > 0) {
        b.stuck = 1; b.offX = clamp(bx - pl.x, -half + 3, half - 3); b.stickT = 1.25; b.y = padFace(1); b.vx = 0; b.vy = 0;
        m.ox = r1(b.offX); m.st = 1;
        onEvent({ k: 'stick', p: 1, x: b.x, y: b.y });
      } else {
        launchFrom(S, b, 1, off, spin);
        onEvent({ k: 'paddle', p: 1, x: b.x, y: b.y, off, sp: b.sp, fire: pl.eff.fire > 0 });   // effet et son tout de suite
      }
      p.seq = m.s; p.t0 = V.rt; p.judged = true;
      nsend(m, true);
    }
    function guestMiss(p) {
      p.seq = ++N.seq; p.t0 = V.rt; p.judged = true;
      nlog(['vMiss', p.b.id, r3(N.g), Math.round(p.b.x), p.seq, S.pl[1].shield ? 1 : 0, N.myShield || 0]);
      nsend({ k: 'v', s: p.seq, id: p.b.id, h: 0, bx: r1(p.b.x), x: r1(S.pl[1].x), g: r3(N.g) }, true);
    }
    function guestRelease(only) {
      const pl = S.pl[1], half = pl.w / 2;
      for (const o of S.balls) {
        if (o.stuck !== 1 || (only != null && o.id !== only)) continue;
        let p = N.pred.get(o.id);
        if (!p) {
          p = { b: { id: o.id, x: o.x, y: o.y, vx: 0, vy: 0, sp: o.sp, owner: 1, fire: o.fire, stuck: 1, offX: o.offX, stickT: o.stickT, dead: false, hold: 0 }, seq: 0, judged: true, t0: V.rt };
          N.pred.set(o.id, p);
        }
        const b = p.b;
        if (b.stuck !== 1) continue;
        b.offX = clamp(b.offX, -half + 3, half - 3);
        b.x = pl.x + b.offX;
        launchFrom(S, b, 1, clamp(b.offX / half, -1, 1));
        onEvent({ k: 'launch', p: 1, x: b.x, y: b.y });
        p.seq = ++N.seq; p.t0 = V.rt; p.judged = true;
        N.cross.set(b.id, 1);
        nsend({ k: 'v', s: p.seq, id: b.id, h: 2, x: r1(pl.x), ox: r1(b.offX), g: r3(N.g) }, true);
      }
    }
    // mes bonus : c'est moi qui vois s'ils tombent sur ma raquette
    function guestCaps() {
      const pl = S.pl[1];
      for (const c of S.caps) {
        if (c.to !== 1 || N.capJ.has(c.id)) continue;
        if (Math.abs(c.y - PY[1]) <= PH / 2 + 9 && Math.abs(c.x - pl.x) <= pl.w / 2 + 13) {
          N.capJ.add(c.id); N.capLocal.add(c.id);
          if (c.type === 'shield') N.myShield = 1;              // je l'ai : il protège mes balles prédites tout de suite
          onEvent({ k: 'power', p: 1, type: c.type, x: c.x });
          nsend({ k: 'c', id: c.id, g: 1, x: r1(pl.x), t: r3(N.g) }, true);
        } else if (c.y < PY[1] - PH / 2 - 9) {
          N.capJ.add(c.id);
          nsend({ k: 'c', id: c.id, g: 0 }, true);
        }
      }
      if (N.capLocal.size) S.caps = S.caps.filter(c => !N.capLocal.has(c.id));
    }
    function netInfo() {
      return { role: NET.role, delay: Math.round(N.delay), p1Delay: Math.round(N.p1Delay), ack: S.ack, seq: N.seq, pend: S.pend.length,
        preds: N.pred.size, predIds: Array.from(N.pred.keys()), buf: N.buf.length, evq: N.evq.length, stats: Object.assign({}, N.stats), tr: N.tr, now: N.now, g: N.g, pad: N.pad.x };
    }

    // ===========================================================================
    // CONTRE L'IA (api.ai) : la raquette du haut est jouée par l'ordinateur, avec les limites d'un doigt.
    //  - elle VOIT avec un temps de réaction : elle décide sur l'image d'il y a 0,15 à 0,6 s (selon le niveau) ;
    //  - elle BOUGE comme une main : vitesse et accélération limitées, approche en douceur, petites hésitations ;
    //  - elle PRÉVOIT où arrivent les balles (ligne droite → rebonds sur les côtés → sur les briques → briques qui bougent) ;
    //  - elle ATTAQUE : choisit l'endroit de la raquette qui renvoie la balle par un trou du mur, loin du joueur
    //    (elle observe s'il bouge vite ou pas), ou vers les briques à bonus ; elle va chercher les bonus utiles,
    //    évite ceux qui la gêneraient, et se sert de la colle pour viser.
    // Rien de caché : elle ne lit que ce qui est à l'écran (balles, briques, bonus en vol, raquette d'en face).
    // ===========================================================================
    const AI_LV = {
      facile: { react: 0.6, period: 0.3, vmax: 470, amax: 2500, gain: 7, noise: 24, pred: 1, blunder: 0.15, attack: 0, cands: 0, caps: 0.2, spread: 1, label: 'FACILE' },
      moyen: { react: 0.29, period: 0.145, vmax: 800, amax: 5500, gain: 10.8, noise: 8.5, pred: 2, blunder: 0.055, attack: 0.68, cands: 11, caps: 0.6, label: 'MOYEN' },
      difficile: { react: 0.22, period: 0.11, vmax: 980, amax: 7500, gain: 13, noise: 5, pred: 2, blunder: 0.02, attack: 1, cands: 15, caps: 0.8, label: 'DIFFICILE' },
      extreme: { react: 0.15, period: 0.07, vmax: 1250, amax: 10000, gain: 15, noise: 2, pred: 3, blunder: 0, attack: 1, cands: 21, caps: 1, label: 'EXTRÊME' }
    };
    const AIL = AIC ? (AI_LV[AIC.level] || (AIC.k >= 0.9 ? AI_LV.extreme : AIC.k >= 0.65 ? AI_LV.difficile : AIC.k >= 0.4 ? AI_LV.moyen : AI_LV.facile)) : null;
    const LINE = [PY[0] - PH / 2 - BR, PY[1] + PH / 2 + BR];   // y du centre de la balle quand elle touche chaque raquette
    const A = AIC ? { hist: [], tick: 0, goal: W / 2, v: 0, app: new Map(), capDo: new Map(), glue: null, round: -1, freeze: 0, oppX: [], oppSpeed: 600, after: null, lastBack: null,
      wob: Math.random() * 10, lastAbs: null, stats: { plans: 0, shots: 0 } } : null;
    function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.41; }
    // envie d'aller chercher ce bonus ? décidé une fois par bonus (pas d'hésitation d'une image à l'autre)
    function aiWants(c) {
      let w = A.capDo.get(c.id);
      if (w == null) { w = Math.random() < AIL.caps; A.capDo.set(c.id, w); if (A.capDo.size > 40) A.capDo.delete(A.capDo.keys().next().value); }
      return w;
    }

    // ce que l'IA voit, image par image (copie légère de ce qui est à l'écran)
    function aiPerceive() {
      const opp = S.pl[1 - AIP];
      A.hist.push({ rt: V.rt, g: S.gt, round: S.round,
        balls: S.balls.map(b => ({ id: b.id, x: b.x, y: b.y, vx: b.vx, vy: b.vy, sp: b.sp, owner: b.owner, fire: b.fire, stuck: b.stuck, offX: b.offX, stickT: b.stickT })),
        caps: S.caps.map(c => ({ id: c.id, x: c.x, y: c.y, vy: c.vy, type: c.type, to: c.to })),
        opp: { x: opp.x, w: opp.w, shield: opp.shield } });
      while (A.hist.length > 2 && A.hist[1].rt <= V.rt - AIL.react - 0.05) A.hist.shift();
      // vitesse de l'adversaire observée (bouge-t-il vite ? pas du tout ?)
      A.oppX.push([V.rt, opp.x]);
      while (A.oppX.length > 2 && A.oppX[0][0] < V.rt - 4) A.oppX.shift();
      let vmax = 0;
      for (let i = 1; i < A.oppX.length; i++) {
        const d = A.oppX[i][0] - A.oppX[i - 1][0];
        if (d > 0.005) vmax = Math.max(vmax, Math.abs(A.oppX[i][1] - A.oppX[i - 1][1]) / Math.max(d, 0.03));
      }
      A.oppSpeed += (clamp(vmax, 15, 1700) - A.oppSpeed) * 0.02;
    }
    function aiSeen() {
      const t = V.rt - AIL.react;
      let s = A.hist[0];
      for (const h of A.hist) { if (h.rt <= t) s = h; else break; }
      return s;
    }
    // trajectoire prévue d'une balle (sans rien casser) jusqu'à une raquette : { side, t, x, vx, sp, hits, heads }
    // mode : 0 = ligne droite, 1 = + rebonds sur les côtés, 2 = + briques, 3 = + briques qui bougent
    function aiTrace(b0, maxT, mode) {
      const b = { x: b0.x, y: b0.y, vx: b0.vx, vy: b0.vy, sp: b0.sp, owner: b0.owner, fire: !!b0.fire, stuck: -1 };
      const hits = [];
      let heads = 0, mine = 0;
      const at = (side, t) => ({ side, t, x: b.x, vx: b.vx, vy: b.vy, sp: b.sp, hits, heads, mine });
      if (mode <= 1) {
        if (Math.abs(b.vy) < 1) return null;
        const side = b.vy < 0 ? 1 : 0, t = (LINE[side] - b.y) / b.vy;
        if (!(t > 0) || t > maxT) return null;
        if (mode === 1) { const r = reflX(b.x, b.vx, t); b.x = r[0]; b.vx = r[1]; } else b.x = clamp(b.x + b.vx * t, BR, W - BR);
        return at(side, t);
      }
      S.dry = true;
      S.dryHit = br => {
        if (hits.indexOf(br) >= 0) return;
        hits.push(br);
        if (br.kind === 'h' || br.kind === 'g') heads++;
        if (br.p === AIP) mine++;
      };
      const mv = mode >= 3 && S.movers.length ? S.movers.map(g => [g.off, g.vx]) : null;
      let res = null;
      try {
        const h = 1 / 120, zone = wallFront(S) + BR + 1;
        for (let t = 0; t < maxT && !res; t += h) {
          if (mv) updateMovers(S, h);
          if (b.owner >= 0) { const fl = speedFloor(S); if (b.sp < fl) b.sp = Math.min(fl, b.sp + 30 * h); }
          fixVel(b);
          const n = Math.max(1, Math.ceil((b.sp * h) / (BR * 0.5))), hh = h / n;
          for (let i = 0; i < n; i++) {
            b.x += b.vx * hh; b.y += b.vy * hh;
            if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); } else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); }
            const dy = Math.abs(b.y - MID);
            if (dy < zone && dy > LANE - BR - 1) { collideBricks(S, b); if (S.movers.length) collideMovers(S, b); }
            if (b.vy < 0 && b.y <= LINE[1]) { res = at(1, t + (i + 1) * hh); break; }
            if (b.vy > 0 && b.y >= LINE[0]) { res = at(0, t + (i + 1) * hh); break; }
          }
        }
      } finally {
        S.dry = false; S.dryHit = null;
        if (mv) S.movers.forEach((g, j) => { g.off = mv[j][0]; g.vx = mv[j][1]; for (const br of g.cells) br.x = br.x0 + g.off; });
      }
      return res;
    }
    // temps qu'il faut à MA raquette pour aller en x (avec son élan)
    function aiTimeTo(x) {
      const pl = S.pl[AIP], d = x - pl.x, s = Math.sign(d) || 1;
      const v0 = A.v * s;                                       // vitesse déjà dans le bon sens
      const acc = Math.max(0, (AIL.vmax - Math.max(0, v0)) / AIL.amax);
      return Math.abs(d) / AIL.vmax + acc * 0.5 + (v0 < 0 ? -v0 / AIL.amax : 0) + 0.04;
    }
    // valeur d'un tir : la raquette touche la balle (arrivée a) avec le décalage off (-1 = bord gauche, 1 = bord droit)
    function aiShot(a, off, seen, next) {
      const me = AIP, opp = 1 - me, pl = S.pl[me];
      const sp = Math.min(speedCap(S), Math.max(speedFloor(S), a.sp * 1.045));
      let ang = off * 62 * DEG;
      if (Math.abs(ang) < 4 * DEG) ang = (ang < 0 ? -1 : 1) * 4 * DEG;
      ang = clamp(ang, -64 * DEG, 64 * DEG);
      const b = { x: a.x, y: padFace(me), vx: Math.sin(ang) * sp, vy: (me === 0 ? -1 : 1) * Math.cos(ang) * sp, sp, owner: me, fire: pl.eff.fire > 0 };
      const r = aiTrace(b, 2.3, Math.max(2, AIL.pred));
      A.lastBack = r && r.side === me ? { x: r.x, t: r.t } : null;
      return aiScore(r, a, off, seen, next);
    }
    function aiScore(r, a, off, seen, next) {
      const me = AIP, opp = 1 - me, pl = S.pl[me];
      let sc;
      if (!r) sc = 4;                                           // elle se promène dans les murs
      else if (r.side === opp) {
        // elle arrive chez le joueur : peut-il la rattraper ? (d'après ce qu'on a vu de lui)
        const o = seen.opp, dist = Math.max(0, Math.abs(r.x - o.x) - (o.w / 2 + BR * 0.8));
        const need = dist / Math.max(0.06, r.t - 0.2);
        sc = 40 + Math.min(need, 2400) / 24 - r.t * 5;
        if (need > A.oppSpeed * 1.15 + 25) sc += 55;            // imparable pour lui (vu comment il bouge)
        if (o.shield) sc -= 35;                                 // son bouclier la renverrait
      } else {
        // bloquée : elle me revient. Pourrai-je y être ? (je sais où j'ai tiré : pas besoin d'attendre de la voir)
        const tx = a.x - off * (pl.w / 2 + BR * 0.5), need = Math.abs(r.x - tx) / AIL.vmax + 0.12;
        sc = -12 + (r.t < 0.7 ? -15 : 0) - Math.abs(r.x - tx) * 0.05 - (need > r.t ? 70 : need > r.t * 0.7 ? 25 : 0);
      }
      if (r) sc += (r.hits.length - r.mine) * 6 + r.mine * 2 + r.heads * 24;   // casser son mur, et les briques à bonus
      // viser du bord de la raquette quand on vise mal = risquer de la rater
      const margin = (pl.w / 2 + BR * 0.8) - Math.abs(off) * (pl.w / 2 + BR * 0.5), want = 2.5 * AIL.noise + 4;
      if (margin < want) sc -= (want - margin) * 3;
      if (next) {                                               // une autre balle arrive juste après : rester à portée
        const tx = a.x - off * (pl.w / 2 + BR * 0.5);
        if (Math.abs(next.x - tx) / AIL.vmax > next.t - a.t - 0.06) sc -= 45;
      }
      return sc;
    }
    // choix du décalage pour une balle qui arrive
    function aiChoose(a, seen, next) {
      const pl = S.pl[AIP], half = pl.w / 2, k = half + BR * 0.5;
      let best = { off: (Math.random() - 0.5) * (AIL.spread ? 1.1 : 0.6), score: -1e9 };   // sans viser : un peu au hasard
      if (AIL.cands && Math.random() < AIL.attack) {
        const list = [];
        for (let i = 0; i < AIL.cands; i++) {
          const off = -0.86 + (1.72 * i) / (AIL.cands - 1);
          const tx = a.x - off * k;
          if (tx < half - 2 || tx > W - half + 2) continue;      // la raquette ne peut pas aller là (bord)
          if (aiTimeTo(tx) > a.t + 0.02) continue;               // trop loin pour y être à temps
          const sc = aiShot(a, off, seen, next);
          list.push({ off, score: sc, back: A.lastBack });
        }
        A.stats.shots += list.length;
        list.sort((p, q) => q.score - p.score);
        if (list.length) best = AIL.pred >= 3 || list.length < 2 || Math.random() < 0.75 ? list[0] : list[1];
      }
      return best;   // best.back = où elle me reviendra (si elle revient), compté depuis l'impact
    }
    // quand l'IA attrape un bonus : utile ou gênant ?
    function aiCapValue(type) {
      const pl = S.pl[AIP], nb = S.balls.length;
      switch (type) {
        case 'shield': return pl.shield ? 0.2 : 3;
        case 'big': return pl.eff.big > 2 ? 0.8 : 2.6;
        case 'shrink': return 2.4;
        case 'fire': return 2.2;
        case 'glue': return AIL.attack >= 0.85 ? 2 : 0.6;
        case 'multi': return nb >= 2 ? -1 : 1.2;                // déjà deux balles à défendre : on l'évite
        default: return 0;
      }
    }

    // décision (quelques fois par seconde) : où mettre la raquette
    function aiPlan() {
      const seen = aiSeen();
      if (!seen || seen.round !== S.round) { A.goal = W / 2; return; }
      A.stats.plans++;
      const me = AIP, opp = 1 - me, pl = S.pl[me], half = pl.w / 2, k = half + BR * 0.5;
      const dG = Math.max(0, S.gt - seen.g);                    // ce qu'elle voit date un peu
      // 1) une balle collée sur ma raquette : je choisis où la lâcher
      const sb = seen.balls.find(b => b.stuck === me), stuck = sb && S.balls.find(b => b.id === sb.id && b.stuck === me);
      if (stuck) {
        if (!A.glue || A.glue.id !== stuck.id) {
          let bx = pl.x, bs = -1e9;
          const off = clamp(stuck.offX / half, -1, 1);
          if (AIL.attack > 0) {
            for (let i = -4; i <= 4; i++) {
              const x = clamp(pl.x + i * 26, half, W - half);
              if (aiTimeTo(x) > stuck.stickT - 0.15) continue;
              const a = { x: x + stuck.offX, sp: stuck.sp / 1.045, t: 0 };
              const sc = aiShot(a, off, seen, null);
              if (sc > bs) { bs = sc; bx = x; }
            }
          }
          A.glue = { id: stuck.id, x: bx, at: AIL.attack > 0 ? 0 : 0.2 + Math.random() * 0.5, t0: V.rt };
        }
        A.goal = A.glue.x;
        if ((Math.abs(pl.x - A.glue.x) < 3 && V.rt - A.glue.t0 > A.glue.at) || stuck.stickT < 0.12) inputs[me].release = true;
        return;
      }
      A.glue = null;
      // 2) les balles qui vont arriver sur ma raquette (la plus urgente d'abord)
      const arr = [];
      for (const b of seen.balls) {
        if (b.stuck >= 0) continue;
        const r = aiTrace(b, 3.2, AIL.pred);
        if (r && r.side === me && r.t - dG > -0.05) arr.push({ id: b.id, x: r.x, t: Math.max(0.01, r.t - dG), sp: r.sp });
      }
      if (A.after && A.after.g > S.gt && !arr.some(q => q.id === A.after.id)) {
        // la balle que je viens de renvoyer va me revenir (je ne la « vois » pas encore revenir, mais je sais où j'ai tiré)
        const t = A.after.g - S.gt;
        if (!seen.balls.some(b => b.id === A.after.id && (me === 1 ? b.vy < 0 : b.vy > 0) && b.y < LINE[me] + 40)) arr.push({ id: A.after.id, x: A.after.x, t, sp: 300, mem: true });
      } else if (A.after && A.after.g <= S.gt) A.after = null;
      arr.sort((p, q) => p.t - q.t);
      let goal;
      if (arr.length) {
        const a = arr[0], next = arr[1] || null;
        let d = A.app.get(a.id);
        if (!d || Math.abs(d.x - a.x) > 30 || V.rt - d.t0 > 2.5) {
          // nouvelle approche : choix du tir, petite erreur de placement (plus grosse aux petits niveaux), parfois une bourde
          const c = aiChoose(a, seen, next);
          // comme une main humaine : moins précise quand la balle va très vite, et un peu fatiguée dans les échanges sans fin
          const fast = clamp((a.sp - 380) / 300, 0, 1), tired = clamp((S.playT - 45) / 60, 0, 1);
          d = { x: a.x, off: c.off, err: gauss() * (AIL.noise + 9 * fast + 6 * tired), t0: V.rt };
          // je sais où je vais tirer : si elle doit me revenir, je m'y préparerai tout de suite après l'impact
          A.after = c.back && AIL.attack >= 0.5 ? { id: a.id, x: c.back.x, g: S.gt + a.t + c.back.t } : null;
          if (Math.random() < AIL.blunder + 0.03 * fast + 0.05 * tired) {
            if (Math.random() < 0.5) d.err += (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 45);
            else A.freeze = 0.25 + Math.random() * 0.3;           // elle « ne l'a pas vue venir »
          }
          A.app.set(a.id, d);
        } else d.x = a.x;
        // plus la balle est proche, plus elle ajuste (comme une main qui se corrige)
        const fix = clamp(a.t / 0.6, 0.35, 1);
        goal = a.x - d.off * k + d.err * fix;
        // un bonus utile tombe juste avant : on le prend en passant si on a le temps
        for (const c of seen.caps) {
          if (c.to !== me || aiCapValue(c.type) < 1.5 || !aiWants(c)) continue;
          const tc = me === 1 ? (c.y - (PY[1] + PH / 2 + 9)) / -c.vy : (PY[0] - PH / 2 - 9 - c.y) / c.vy;
          if (!(tc > 0) || tc - dG > a.t - 0.1) continue;
          if (aiTimeTo(c.x) < tc - dG && Math.abs(goal - c.x) / AIL.vmax + 0.12 < a.t - (tc - dG)) { goal = c.x; break; }
        }
      } else {
        // 3) rien n'arrive : un bonus à attraper ? sinon position d'attente
        goal = W / 2;
        let bestV = 0;
        for (const c of seen.caps) {
          if (c.to !== me) continue;
          const v = aiCapValue(c.type), tc = me === 1 ? (c.y - (PY[1] + PH / 2 + 9)) / -c.vy : (PY[0] - PH / 2 - 9 - c.y) / c.vy;
          if (!(tc > 0) || v < 1 || !aiWants(c)) continue;
          if (aiTimeTo(c.x) < tc - dG + 0.05 && v > bestV) { bestV = v; goal = c.x; }
        }
        if (!bestV) {
          const away = seen.balls.filter(b => b.stuck < 0 && (me === 1 ? b.vy > 0 : b.vy < 0));
          if (AIL.pred <= 1 && AIL.attack === 0 && seen.balls.length) goal = W / 2 + (seen.balls[0].x - W / 2) * 0.6;   // facile : suit la balle des yeux
          else if (AIL.pred >= 2 && away.length) {
            // elle part chez l'autre : se placer là d'où elle a le plus de chances de revenir
            const r = aiTrace(away[0], 3, AIL.pred);
            if (r && r.side === opp) goal = W / 2 + (r.x - W / 2) * 0.35;
          }
          goal += Math.sin(V.rt * 1.3 + A.wob) * 4;               // petit balancement d'attente
        }
      }
      // 4) un « malus » qui va tomber sur ma raquette : je m'écarte si rien ne presse
      for (const c of seen.caps) {
        if (c.to !== me || aiCapValue(c.type) >= 0 || AIL.caps < 0.5) continue;
        const reach = pl.w / 2 + 13;
        if (Math.abs(goal - c.x) < reach && (!arr.length || arr[0].t > 0.7)) goal = c.x + (goal >= c.x ? 1 : -1) * (reach + 4);
      }
      A.goal = goal;
    }
    // chaque image : ce qu'elle voit, et de temps en temps une nouvelle décision
    function aiFrame(dt) {
      if (S.round !== A.round) { A.round = S.round; A.v = 0; A.app.clear(); A.glue = null; A.hist = []; A.goal = W / 2; A.after = null; }
      aiPerceive();
      if (A.freeze > 0) { A.freeze -= dt; return; }
      A.tick -= dt;
      if (A.tick <= 0) { A.tick = AIL.period * (0.75 + 0.5 * Math.random()); try { aiPlan(); } catch (e) { V.err++; } }
    }
    // chaque pas de simulation : la « main » de l'IA va vers son but (vitesse et accélération limitées)
    function aiStep(dt) {
      const pl = S.pl[AIP], inp = inputs[AIP];
      inp.dx = 0; inp.target = null; inp.dir = 0;
      if (A.lastAbs != null && Math.abs(pl.x - A.lastAbs) > 0.5) A.v = 0;   // butée, ou raquette replacée au début de la manche
      const goal = clamp(A.goal, pl.w / 2, W - pl.w / 2);
      const vDes = clamp((goal - pl.x) * AIL.gain, -AIL.vmax, AIL.vmax);
      A.v += clamp(vDes - A.v, -AIL.amax * dt, AIL.amax * dt);
      if (S.phase === 'over') A.v = 0;
      inp.abs = clamp(pl.x + A.v * dt, pl.w / 2, W - pl.w / 2);
      A.lastAbs = inp.abs;
    }

    // --- boucle : pas fixe pour la simulation, affichage à chaque image
    let raf = 0, last = -1, acc = 0, pausedFrames = 0;
    function frame(ts) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000;
      let dt = last < 0 ? 0 : now - last;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) { if ((pausedFrames++ % 20) === 0) render(); return; }
      V.rt += dt;
      if (NET) netClock(ts);
      padRead(V.resumeT <= 0);
      if (GUEST) {
        // l'invité ne simule rien : il affiche l'état de l'hôte, lissé, et prédit sa propre raquette
        if (V.resumeT > 0) resumeTick(dt);
        else { try { guestFrame(dt); } catch (e) { V.err++; } }
        updView(dt);
        try { render(); } catch (e) { V.err++; }
        return;
      }
      if (HOST) { try { hostNetIn(dt); } catch (e) { V.err++; } }
      if (V.resumeT > 0) {
        resumeTick(dt);
      } else if (V.freeze > 0) {
        V.freeze -= dt;
      } else {
        acc += dt;
        let n = 0;
        if (HOST) {
          // raquette de l'invité : de la position de l'image précédente à la nouvelle, pas à pas ; événements datés au pas près
          const ns = Math.min(8, Math.floor(acc / STEP));
          while (acc >= STEP && n < 8) {
            if (N.p1To != null) inputs[1].abs = N.p1From + (N.p1To - N.p1From) * ((n + 1) / ns);
            S.evTs = S.nowTs - (ns - 1 - n) * STEP * 1000;
            step(S, STEP, inputs); acc -= STEP; n++;
          }
          S.evTs = null;
        } else if (AIC) {
          aiFrame(dt);
          while (acc >= STEP && n < 8) { aiStep(STEP); step(S, STEP, inputs); acc -= STEP; n++; }
        } else {
          while (acc >= STEP && n < 8) { step(S, STEP, inputs); acc -= STEP; n++; }
        }
        if (n >= 8) acc = 0;
        drainEvents();
      }
      if (HOST) { try { hostNetOut(dt); } catch (e) { V.err++; } hostDisplayBalls(dt); }
      updView(dt);
      try { render(); } catch (e) { V.err++; }
    }
    function resumeTick(dt) {
      V.resumeT -= dt;
      const n = V.resumeT > 0 ? Math.ceil(V.resumeT / 0.5) : 0;
      if (n !== V.resumeN) { V.resumeN = n; if (n > 0) tone(n === 1 ? 740 : 620, 0.08, 'square', 0.04); else tone(880, 0.12, 'square', 0.04, 1320); }
      for (const inp of inputs) { inp.dx = 0; inp.release = false; }
    }

    // --- cycle de vie
    function pause() {
      if (destroyed || paused) return;
      paused = true;
      clearInputs();
      pausedFrames = 0;
      render();
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false;
      last = -1; acc = 0;
      clearInputs();
      padRead(false);                                         // (le A qui a fermé la carte de pause ne lâche pas la balle)
      if (N) { N.snapAcc = 0; N.gPrev = null; }
      if (S.phase === 'play' || S.phase === 'intro') { V.resumeT = 1.5; V.resumeN = 0; }
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf); raf = 0;
      try { ro.disconnect(); } catch (e) { /* rien */ }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('lostpointercapture', onPointerUp);
      canvas.removeEventListener('contextmenu', prevent);
      canvas.removeEventListener('dblclick', prevent);
      V.sq = []; V.parts = []; V.rings = []; V.floats = []; V.cries = [];
      V.trails.clear(); V.touches.clear(); ptrs.clear();
      sprites.clear(); stickers.clear(); glowCache.clear();
      bg = null; nebImg = null; planets = null; nebs = null;
      S.ev = []; S.balls = []; S.bricks = []; S.caps = []; S.pend = [];
      if (N) { N.q = []; N.batch = []; N.buf = []; N.evq = []; N.p1 = []; N.pred.clear(); N.disp.clear(); N.cross.clear(); N.boff.clear(); }
      if (A) { A.hist = []; A.app.clear(); A.oppX = []; }
      while (root.firstChild) root.removeChild(root.firstChild);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('lostpointercapture', onPointerUp);
    canvas.addEventListener('contextmenu', prevent);
    canvas.addEventListener('dblclick', prevent);
    const ro = new ResizeObserver(() => { if (!destroyed) resize(); });
    ro.observe(root);
    resize();
    if (NET) { try { NET.onMessage(onNet); } catch (e) { /* rien */ } S.nowTs = num(NET.now(), 0); }
    if (GUEST) nsend({ k: 'hi' }, true);                    // « je suis prêt » : l'hôte (re)donne la manche en cours
    beginRound();
    raf = requestAnimationFrame(frame);

    // state() : lecture seule de l'état, pour les tests automatiques ; net() : mesures du jeu en ligne
    return { destroy, pause, resume, state: () => S, shown: () => viewBalls(), viewErrors: () => V.err, net: () => (N ? netInfo() : null),
      ai: () => (A ? { level: AIL.label, goal: A.goal, v: A.v, oppSpeed: Math.round(A.oppSpeed), stats: Object.assign({}, A.stats) } : null) };
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS[ID] = {
    id: ID,
    title: 'Casse-briques face à face',
    emoji: '🧱',
    tagline: 'Casse le mur, attrape les bonus et envoie la balle derrière la raquette d’en face !',
    accent: '#ffa630',
    target: TARGET,
    layout: 'shared',
    net: true,                    // jeu en ligne : l'hôte simule, l'invité affiche en douceur et prédit sa raquette
    ai: true,                     // sait jouer contre l'IA (api.ai) : la tuile n'est pas grisée quand l'IA joue en haut
    // manette (CONTRACT.md « Ajout 10 ») : schéma des commandes montré par la borne (carte de pause, début de partie)
    pad: { help: [['ls/dpad', 'Bouger la raquette (stick : vitesse dosée)'], ['a/b', 'Lâcher la balle collée'], ['ls', 'Frapper en bougeant : balle à effet']], intro: false },
    preview,
    mount
  };
})();
