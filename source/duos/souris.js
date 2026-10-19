(() => {
  'use strict';

  // ===========================================================================
  // CHAT ET SOURIS (id « souris ») — duel face à face, deux joueurs en même temps sur le même téléphone.
  // Une maison la nuit vue de dessus. La souris mange le fromage, le chat la chasse ; les rôles
  // s'inversent à chaque manche. Souris : tous les fromages ou tenir le temps imparti. Chat : l'attraper
  // (il bondit au ralenti quand il la tient en ligne de mire). Le gros fromage donne 4 s de super-souris.
  // ===========================================================================

  // ===== SIM-BEGIN =====
  // Simulation pure (aucun DOM, aucun Date.now) : un état + step(S, dt, entrées).
  // Servira telle quelle au jeu en ligne. Coordonnées en cases : x = colonne, y = ligne (centres entiers).
  const COLS = 9, ROWS = 17;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], OPP = [2, 3, 0, 1];   // droite, bas, gauche, haut
  const EPS = 1e-4;
  const OPEN = 0, WALL = 1, HOLE = 2, DOOR_A = 3, DOOR_B = 4, TUNNEL = 5;
  const TUNE = {
    holeCd: 4,            // un trou de souris se « repose » quelques secondes après chaque passage
    captureR: 0.6,        // distance de capture (cases)
    bonkR: 0.8,           // la super-souris renverse le chat
    eatR: 0.45,
    pounceR: 1.8, pounceV: 9.5, pounceMax: 0.32, slow: 0.36,   // bond du chat (ralenti)
    superT: 4, bonkGain: 5, flyT: 0.85, homeT: 1.1, bigAt: 9,
    cheese: 10
  };
  // Labyrinthes faits main : 18 lignes du haut (la moitié du bas est la rotation à 180°).
  // Chaque case fait 4 caractères : '+---' mur horizontal, '|' mur vertical, 'o' trou de souris (souris seulement),
  // 'A' / 'B' porte qui s'ouvre et se ferme, 't' tunnel qui traverse l'écran (souris seulement), 'X' meuble.
  const MAZES = [
    { name: "La cuisine", theme: 0, tier: 1, top: [
      '+---+---+---+---+---+---+---+---+---+',
      '|               |   |               |',
      '+   +---+---+   +   +   +---+---+   +',
      '|   |       |           |       |   |',
      '+   +   +   +   +---+   +   +   +   +',
      '|       |                   |       |',
      '+   +---+   +---+   +---+   +---+   +',
      't                                   t',
      '+   +---+-o-+   +---+   +-o-+---+   +',
      '|   |       |           |       |   |',
      '+   +   +   +   +---+   +   +   +   +',
      '|       |                   |       |',
      '+---+   +   +---+   +---+   +   +---+',
      '|       |       |   |       |       |',
      '+   +---+   +   +   +   +   +---+   +',
      '|           |           |           |',
      '+---+---+   +---+   +---+   +---+---+',
      '|XXXXXXX|                   |XXXXXXX|'] },
    { name: "Le salon", theme: 1, tier: 1, top: [
      '+---+---+---+---+---+---+---+---+---+',
      '|               |   |               |',
      '+   +---+---+   +   +   +---+---+   +',
      '|               |   |               |',
      '+   +---+-o-+---+   +---+-o-+---+   +',
      '|   |                           |   |',
      '+   +   +---+---+---+---+---+   +   +',
      '|   |       |           |       |   |',
      '+   +   +   +   +---+   +   +   +   +',
      't       |   |           |   |       t',
      '+   +---+   +   +---+   +   +---+   +',
      '|       |   |           |   |       |',
      '+---+   +   +---+   +---+   +   +---+',
      '|       |                   |       |',
      '+   +---+---+   +---+   +---+---+   +',
      '|           |           |           |',
      '+---+---+   +---+   +---+   +---+---+',
      '|XXXXXXX|                   |XXXXXXX|'] },
    { name: "La cave", theme: 2, tier: 2, top: [
      '+---+---+---+---+---+---+---+---+---+',
      '|       |       |   |       |       |',
      '+   +   +   +   +   +   +   +   +   +',
      '|   |       |   A   A   |       |   |',
      '+   +---+-o-+   +   +   +-o-+---+   +',
      '|   |       |   |   |   |       |   |',
      '+   +   +   +   +   +   +   +   +   +',
      't       |       |   |       |       t',
      '+---+   +---+   +   +   +---+   +---+',
      '|       |       |   |       |       |',
      '+   +---+   +---+   +---+   +---+   +',
      '|       |   o           o   |       |',
      '+---+   +   +   +---+   +   +   +---+',
      '|           |           |           |',
      '+   +---+---+   +   +   +---+---+   +',
      '|           |   |   |   |           |',
      '+---+---+   +   +   +   +   +---+---+',
      '|XXXXXXX|       |   |       |XXXXXXX|'] },
    { name: "Le grenier", theme: 3, tier: 2, top: [
      '+---+---+---+---+---+---+---+---+---+',
      '|               |   |               |',
      '+   +---+   +   +   +   +   +---+   +',
      '|           |           |           |',
      '+---+-o-+---+   +---+   +---+-o-+---+',
      '|       |                   |       |',
      '+   +   +   +---+ A +---+   +   +   +',
      't   |                           |   t',
      '+   +---+-o-+---+   +---+-o-+---+   +',
      '|   |       |           |       |   |',
      '+   +   +   +   +---+   +   +   +   +',
      '|       |                   |       |',
      '+---+---+   +   +---+   +   +---+---+',
      '|           |           |           |',
      '+   +---+---+   +---+   +---+---+   +',
      '|           |           |           |',
      '+---+---+   +---+ A +---+   +---+---+',
      '|XXXXXXX|                   |XXXXXXX|'] },
    { name: "La bibliothèque", theme: 4, tier: 3, top: [
      '+---+---+---+---+---+---+---+---+---+',
      '|               |   |               |',
      '+   +---+---+   +   +   +---+---+   +',
      '|       |       |   |       |       |',
      '+---+   +   +---+   +---+   +   +---+',
      '|       |                   |       |',
      '+   +---+   +---+ A +---+   +---+   +',
      't       B   |           |   B       t',
      '+---+   +   +   +---+   +   +   +---+',
      '|       |                   |       |',
      '+   +---+   +---+   +---+   +---+   +',
      '|       o       |   |       o       |',
      '+---+   +---+   +   +   +---+   +---+',
      '|       |                   |       |',
      '+   +---+   +---+-o-+---+   +---+   +',
      '|           |           |           |',
      '+---+---+   +   +   +   +   +---+---+',
      '|XXXXXXX|       |   |       |XXXXXXX|'] },
    { name: "Le jardin", theme: 5, tier: 3, top: [
      '+---+---+---+---+---+---+---+---+---+',
      '|               |   |               |',
      '+   +   +---+   +   +   +---+   +   +',
      '|   |                           |   |',
      '+   +---+---+   +---+   +---+---+   +',
      '|           |           |           |',
      '+---+-o-+   +---+   +---+   +-o-+---+',
      't       |                   |       t',
      '+   +   +---+   +---+   +---+   +   +',
      '|   |   |                   |   |   |',
      '+   +   +   + B + A + B +   +   +   +',
      '|   |       |           |       |   |',
      '+   +---+---+   +   +   +---+---+   +',
      '|   |           |   |           |   |',
      '+   +   +---+---+   +---+---+   +   +',
      '|       |                   |       |',
      '+---+---+   +   +   +   +   +---+---+',
      '|XXXXXXX|   |   |   |   |   |XXXXXXX|'] }
  ];
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function codeOf(ch) {
    switch (ch) {
      case ' ': case undefined: return OPEN;
      case 'o': return HOLE;
      case 'A': return DOOR_A;
      case 'B': return DOOR_B;
      case 't': return TUNNEL;
      default: return WALL;
    }
  }
  function parseMaze(src, idx) {
    const L = src.top.slice(0, 18);
    for (let y = 16; y >= 0; y--) L.push(src.top[y].split('').reverse().join(''));
    const V = [], H = [], X = [];
    for (let r = 0; r < ROWS; r++) {
      const s = L[2 * r + 1] || '', v = [], x = [];
      for (let i = 0; i <= COLS; i++) v.push(codeOf(s[4 * i]));
      for (let c = 0; c < COLS; c++) x.push(s[4 * c + 2] === 'X');
      V.push(v); X.push(x);
    }
    for (let j = 0; j <= ROWS; j++) {
      const s = L[2 * j] || '', h = [];
      for (let c = 0; c < COLS; c++) h.push(codeOf(s[4 * c + 2]));
      H.push(h);
    }
    for (let r = 0; r < ROWS; r++) {                 // bords : murs, sauf tunnels appariés
      const tun = V[r][0] === TUNNEL && V[r][COLS] === TUNNEL;
      V[r][0] = V[r][COLS] = tun ? TUNNEL : WALL;
      for (let i = 1; i < COLS; i++) if (V[r][i] === TUNNEL) V[r][i] = WALL;
    }
    for (let c = 0; c < COLS; c++) { H[0][c] = WALL; H[ROWS][c] = WALL; for (let j = 1; j < ROWS; j++) if (H[j][c] === TUNNEL) H[j][c] = WALL; }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (X[r][c]) { V[r][c] = WALL; V[r][c + 1] = WALL; H[r][c] = WALL; H[r + 1][c] = WALL; }
    }
    const holes = [], doors = [], tunnels = [], cdIds = [];
    for (let r = 0; r < ROWS; r++) {
      if (V[r][0] === TUNNEL) { tunnels.push(r); cdIds.push(r * 10); }
      for (let i = 1; i < COLS; i++) {
        const t = V[r][i];
        if (t === HOLE) { holes.push({ id: r * 10 + i, v: 1, r, i }); cdIds.push(r * 10 + i); }
        if (t === DOOR_A || t === DOOR_B) doors.push({ id: r * 10 + i, g: t - DOOR_A, v: 1, r, i });
      }
    }
    for (let j = 1; j < ROWS; j++) for (let c = 0; c < COLS; c++) {
      const t = H[j][c], id = 200 + j * COLS + c;
      if (t === HOLE) { holes.push({ id, v: 0, j, c }); cdIds.push(id); }
      if (t === DOOR_A || t === DOOR_B) doors.push({ id, g: t - DOOR_A, v: 0, j, c });
    }
    return { idx, name: src.name, theme: src.theme, tier: src.tier, lines: L, V, H, X, holes, doors, tunnels, cdIds };
  }
  const PARSED = MAZES.map(parseMaze);

  function edgeType(M, c, r, d) {
    return d === 0 ? M.V[r][c + 1] : d === 2 ? M.V[r][c] : d === 1 ? M.H[r + 1][c] : M.H[r][c];
  }
  function edgeId(c, r, d) {
    if (d === 0) return c + 1 >= COLS ? r * 10 : r * 10 + c + 1;   // tunnel : même identifiant aux deux bouts
    if (d === 2) return r * 10 + c;
    if (d === 1) return 200 + (r + 1) * COLS + c;
    return 200 + r * COLS + c;
  }
  function levelParams(L) {
    const k = Math.max(0, Math.min(3, L - 1));
    return {
      dur: [40, 38, 36, 35][k],
      cat: { vmax: 5.3 + 0.17 * k, vturn: 3.45 + 0.12 * k, acc: 3.3 + 0.25 * k },
      mouse: { vmax: 4.55, vturn: 4.25, acc: 14 },
      doorPer: [0, 6.5, 5.5, 4.8][k]
    };
  }
  function bfsCat(M, c0, r0) {                       // distances pour le chat (portes ouvertes)
    const D = new Int16Array(COLS * ROWS).fill(-1);
    D[r0 * COLS + c0] = 0;
    const q = [r0 * COLS + c0];
    for (let h = 0; h < q.length; h++) {
      const k = q[h], c = k % COLS, r = (k / COLS) | 0;
      for (let d = 0; d < 4; d++) {
        const t = edgeType(M, c, r, d);
        if (t === WALL || t === HOLE || t === TUNNEL) continue;
        const nc = c + DX[d], nr = r + DY[d];
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || M.X[nr][nc]) continue;
        const nk = nr * COLS + nc;
        if (D[nk] < 0) { D[nk] = D[k] + 1; q.push(nk); }
      }
    }
    return D;
  }
  function catDist(S, c0, r0) { return bfsCat(S.M, c0, r0); }
  function placeCheese(S, rng) {
    const M = S.M, dn = bfsCat(M, 4, 0), dc = bfsCat(M, 4, 8), cand = [];
    for (let r = 0; r <= 8; r++) for (let c = 0; c < COLS; c++) {
      if ((r === 8 && c >= 4) || M.X[r][c]) continue;
      const k = r * COLS + c;
      if (dn[k] >= 0 && dn[k] <= 2) continue;
      if (dc[k] >= 0 && dc[k] <= 1) continue;
      cand.push([c, r]);
    }
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
    const pick = [], half = TUNE.cheese / 2;
    for (const minD of [4, 3, 2, 0]) {
      for (const p of cand) {
        if (pick.length >= half) break;
        if (pick.indexOf(p) >= 0) continue;
        let ok = true;
        for (const q of pick) {
          if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < minD) { ok = false; break; }
          if (Math.abs(COLS - 1 - q[0] - p[0]) + Math.abs(ROWS - 1 - q[1] - p[1]) < minD) { ok = false; break; }
        }
        if (ok) pick.push(p);
      }
      if (pick.length >= half) break;
    }
    for (const p of pick) {
      S.cheese.push({ c: p[0], r: p[1], on: 1 });
      S.cheese.push({ c: COLS - 1 - p[0], r: ROWS - 1 - p[1], on: 1 });
    }
    S.left = S.cheese.length;
  }
  function mkEnt(kind, p, h, V) {
    return {
      kind, p, x: h.c, y: h.r, dir: -1, face: p === 0 ? 3 : 1, spd: 0, vmax: V.vmax, vturn: V.vturn, acc: V.acc,
      edge: -1, edgeT: 0, from: h.r * COLS + h.c, want: -1, want2: -1, moved: 0, lunge: false,
      st: 'play', stT: 0, pounce: 0, rec: 0, pcd: 0, fx: 0, fy: 0, sup: 0
    };
  }
  // o : { round, maze, layoutSeed, mouseP }
  function newRound(o) {
    const M = PARSED[((o.maze | 0) % PARSED.length + PARSED.length) % PARSED.length];
    const L = Math.max(1, Math.ceil((o.round || 1) / 2));
    const P = levelParams(L);
    const mouseP = o.mouseP ? 1 : 0, catP = 1 - mouseP;
    const homes = [{ c: 4, r: ROWS - 1 }, { c: 4, r: 0 }];   // P0 en bas, P1 en haut
    const S = {
      M, round: o.round || 1, L, P, t: 0, dur: P.dur, phase: 'play', result: null, mouseP, catP, homes,
      cheese: [], left: 0, big: { c: 4, r: 8, st: 0 },
      cd: new Float32Array(400), closed: new Uint8Array(400), doorT: 0, warn: [0, 0], ev: [],
      mouse: null, cat: null
    };
    S.mouse = mkEnt('mouse', mouseP, homes[mouseP], P.mouse);
    S.cat = mkEnt('cat', catP, homes[catP], P.cat);
    if (P.doorPer > 0) for (const d of M.doors) S.closed[d.id] = d.g === 1 ? 1 : 0;
    placeCheese(S, mulberry32((o.layoutSeed >>> 0) || 1));
    return S;
  }
  function ev(S, k, e, d) {
    if (S.ev.length < 240) S.ev.push({ k, who: e ? e.kind : '', x: e ? e.x : 0, y: e ? e.y : 0, d: d == null ? null : d });
  }
  function canPass(S, c, r, d, mouse) {
    if (d < 0) return false;
    const M = S.M, t = edgeType(M, c, r, d);
    if (t === WALL) return false;
    let nc = c + DX[d];
    const nr = r + DY[d];
    if (t === TUNNEL) {
      if (!mouse || S.cd[edgeId(c, r, d)] > 0) return false;
      nc = (nc + COLS) % COLS;
    }
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || M.X[nr][nc]) return false;
    if (t === HOLE) return !!mouse && !(S.cd[edgeId(c, r, d)] > 0);
    if (t === DOOR_A || t === DOOR_B) return !S.closed[edgeId(c, r, d)];
    return true;
  }
  function isCenter(e) { return Math.abs(e.x - Math.round(e.x)) < EPS && Math.abs(e.y - Math.round(e.y)) < EPS; }
  function cellOf(e) { return [((Math.round(e.x) % COLS) + COLS) % COLS, Math.round(e.y)]; }
  function depart(S, e, d, c, r) {
    e.dir = d; e.face = d;
    e.edge = edgeId(c, r, d); e.edgeT = edgeType(S.M, c, r, d); e.from = r * COLS + c;
    if (e.kind === 'mouse' && (e.edgeT === HOLE || e.edgeT === TUNNEL)) ev(S, 'holein', e, e.edge);
  }
  function decide(S, e) {
    const cr = cellOf(e), c = cr[0], r = cr[1], mouse = e.kind === 'mouse';
    const can = (d) => d >= 0 && canPass(S, c, r, d, mouse);
    let nd = -1;
    if (e.lunge) nd = can(e.dir) ? e.dir : -1;
    else if (can(e.want)) nd = e.want;
    else if (can(e.want2)) nd = e.want2;
    else if (can(e.dir)) nd = e.dir;
    else if (e.dir >= 0) {                            // jamais coincé : on suit le couloir s'il n'y a qu'une sortie
      let only = -1, n = 0;
      for (let d = 0; d < 4; d++) if (d !== OPP[e.dir] && can(d)) { only = d; n++; }
      if (n === 1) nd = only;
    }
    if (nd >= 0 && e.dir >= 0 && nd !== e.dir) {
      e.spd = Math.min(e.spd, nd === OPP[e.dir] ? e.vturn * (mouse ? 1 : 0.75) : e.vturn);
      ev(S, 'turn', e, nd);
    }
    if (nd >= 0) depart(S, e, nd, c, r);
    else e.dir = -1;
  }
  function arrive(S, e) {
    const cr = cellOf(e), k = cr[1] * COLS + cr[0];
    if (e.kind === 'mouse' && (e.edgeT === HOLE || e.edgeT === TUNNEL) && k !== e.from) {
      S.cd[e.edge] = TUNE.holeCd;
      ev(S, e.edgeT === TUNNEL ? 'tunnel' : 'hole', e, e.edge);
    }
    e.edge = -1; e.edgeT = 0; e.from = k;
  }
  function advance(e, dist) {
    const dx = DX[e.dir], dy = DY[e.dir];
    let rem;
    if (dx) { const tx = dx > 0 ? Math.floor(e.x + EPS) + 1 : Math.ceil(e.x - EPS) - 1; rem = Math.abs(tx - e.x); }
    else { const ty = dy > 0 ? Math.floor(e.y + EPS) + 1 : Math.ceil(e.y - EPS) - 1; rem = Math.abs(ty - e.y); }
    const s = rem < dist ? rem : dist;
    e.x += dx * s; e.y += dy * s;
    if (e.x < -0.5) e.x += COLS; else if (e.x >= COLS - 0.5) e.x -= COLS;
    e.moved += s;
    return dist - s;
  }
  function travel(S, e, dist) {
    for (let g = 0; g < 8 && dist > 1e-9; g++) {
      if (isCenter(e)) {
        e.x = Math.round(e.x); e.y = Math.round(e.y);
        if (e.x < 0) e.x += COLS; else if (e.x >= COLS) e.x -= COLS;
        if (e.edge >= 0) arrive(S, e);
        decide(S, e);
        if (e.dir < 0) { e.spd = 0; ev(S, 'stop', e); return; }
      }
      dist = advance(e, dist);
    }
  }
  function lateTurn(S, e, tol) {                      // virage demandé juste après l'intersection : on revient dessus
    const q = e.want;
    if (q < 0 || e.dir < 0 || q === e.dir || q === OPP[e.dir] || e.lunge || isCenter(e)) return;
    let pc, pr;
    if (DX[e.dir]) {
      pc = DX[e.dir] > 0 ? Math.floor(e.x + EPS) : Math.ceil(e.x - EPS); pr = Math.round(e.y);
      if (Math.abs(e.x - pc) > tol) return;
    } else {
      pr = DY[e.dir] > 0 ? Math.floor(e.y + EPS) : Math.ceil(e.y - EPS); pc = Math.round(e.x);
      if (Math.abs(e.y - pr) > tol) return;
    }
    const cc = ((pc % COLS) + COLS) % COLS;
    if (pr < 0 || pr >= ROWS || !canPass(S, cc, pr, q, e.kind === 'mouse')) return;
    e.x = cc; e.y = pr; e.edge = -1; e.edgeT = 0; e.from = pr * COLS + cc;
    e.spd = Math.min(e.spd, e.vturn);
    ev(S, 'turn', e, q);
    depart(S, e, q, cc, pr);
  }
  function moveEnt(S, e, inp, h, mul) {
    e.want = inp && inp.want >= 0 ? inp.want : -1;
    e.want2 = inp && inp.want2 >= 0 ? inp.want2 : -1;
    if (e.dir >= 0 && e.want === OPP[e.dir] && !isCenter(e)) {       // demi-tour immédiat
      e.dir = e.want; e.face = e.dir;
      e.spd = Math.min(e.spd, e.kind === 'cat' ? e.vturn * 0.75 : e.vturn);
      ev(S, 'turn', e, e.dir);
    }
    lateTurn(S, e, e.kind === 'cat' ? 0.2 : 0.3);
    if (e.dir < 0) {
      decide(S, e);
      if (e.dir < 0) { e.spd = 0; return; }
      e.spd = Math.max(e.spd, e.vturn * (e.kind === 'cat' ? 0.85 : 1));
      ev(S, 'start', e);
    }
    e.spd = Math.min(e.vmax, e.spd + e.acc * h);
    travel(S, e, e.spd * mul * h);
  }
  function dist(a, b) {
    let dx = Math.abs(a.x - b.x);
    dx = Math.min(dx, COLS - dx);
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function near(e, c, r, R) {
    let dx = Math.abs(e.x - c);
    dx = Math.min(dx, COLS - dx);
    return dx * dx + (e.y - r) * (e.y - r) < R * R;
  }
  function finish(S, w, why, kind) {
    if (S.result) return;
    S.result = { winner: w, why, kind };
    S.phase = kind;
    ev(S, 'end', null, kind);
  }
  function endPounce(S, c) {
    S.phase = 'play';
    c.lunge = false; c.rec = 0.45; c.pcd = 1.4; c.spd = c.vturn * 0.5;
    ev(S, 'miss', c);
  }
  function bonk(S) {
    const c = S.cat;
    c.st = 'fly'; c.stT = 0; c.fx = c.x; c.fy = c.y;
    c.dir = -1; c.spd = 0; c.edge = -1; c.edgeT = 0; c.lunge = false;
    S.t = Math.min(S.dur, S.t + TUNE.bonkGain);
    ev(S, 'bonk', c);
  }
  function tryPounce(S) {
    const c = S.cat, m = S.mouse;
    if (c.st !== 'play' || c.pcd > 0 || c.rec > 0 || m.sup > 0) return;
    if (m.x < -0.01 || m.x > COLS - 1 + 0.01) return;
    let a, b, dir, horiz;
    if (Math.abs(c.y - m.y) < 0.12 && Math.abs(Math.round(c.y) - c.y) < 0.12) { a = c.x; b = m.x; horiz = true; dir = b > a ? 0 : 2; }
    else if (Math.abs(c.x - m.x) < 0.12 && Math.abs(Math.round(c.x) - c.x) < 0.12) { a = c.y; b = m.y; horiz = false; dir = b > a ? 1 : 3; }
    else return;
    const ad = Math.abs(b - a);
    if (ad < TUNE.captureR || ad > TUNE.pounceR) return;
    if (c.dir >= 0 && c.dir !== dir) return;          // le chat doit regarder la souris (ou être arrêté)
    const lo = Math.min(a, b), hi = Math.max(a, b), line = Math.round(horiz ? c.y : c.x);
    for (let k = Math.floor(lo + EPS); k < Math.ceil(hi - EPS); k++) {
      if (horiz ? !canPass(S, k, line, 0, false) : !canPass(S, line, k, 1, false)) return;
    }
    S.phase = 'pounce';
    c.pounce = 0;
    if (isCenter(c)) { const cr = cellOf(c); c.x = cr[0]; c.y = cr[1]; depart(S, c, dir, cr[0], cr[1]); }
    else { c.dir = dir; c.face = dir; }
    ev(S, 'pounce', c, dir);
  }
  function catStep(S, c, inp, h) {
    if (c.pcd > 0) c.pcd -= h;
    if (c.rec > 0) c.rec -= h;
    if (c.st === 'fly') {
      c.stT += h;
      if (c.stT >= TUNE.flyT) {
        const hm = S.homes[c.p];
        c.st = 'home'; c.stT = 0; c.x = hm.c; c.y = hm.r; c.face = c.p === 0 ? 3 : 1; c.from = hm.r * COLS + hm.c;
        ev(S, 'land', c);
      }
      return;
    }
    if (c.st === 'home') {
      c.stT += h;
      if (c.stT >= TUNE.homeT) { c.st = 'play'; c.stT = 0; ev(S, 'wake', c); }
      return;
    }
    if (S.phase === 'pounce') {
      c.pounce += h;
      c.lunge = true;
      travel(S, c, TUNE.pounceV * h);
      c.lunge = false;
      if (dist(S.mouse, c) < TUNE.captureR + 0.08) { finish(S, S.catP, 'Attrapée !', 'caught'); return; }
      if (c.dir < 0 || c.pounce >= TUNE.pounceMax) endPounce(S, c);
      return;
    }
    moveEnt(S, c, inp, h, (S.mouse.sup > 0 ? 0.6 : 1) * (c.rec > 0 ? 0.5 : 1));
  }
  function mouseStep(S, m, inp, h) {
    if (m.sup > 0) { m.sup -= h; if (m.sup <= 0) { m.sup = 0; ev(S, 'superend', m); } }
    moveEnt(S, m, inp, h, m.sup > 0 ? 1.12 : 1);
  }
  function eat(S) {
    const m = S.mouse;
    for (const q of S.cheese) {
      if (q.on && near(m, q.c, q.r, TUNE.eatR)) { q.on = 0; S.left--; ev(S, 'eat', m, q); }
    }
    if (S.left <= 0) { finish(S, S.mouseP, 'Tout le fromage !', 'cheese'); return; }
    if (S.big.st === 1 && near(m, S.big.c, S.big.r, TUNE.eatR + 0.05)) {
      S.big.st = 2; m.sup = TUNE.superT;
      ev(S, 'super', m);
      if (S.phase === 'pounce') endPounce(S, S.cat);
    }
  }
  function doorsStep(S, h) {
    const M = S.M, per = S.P.doorPer;
    if (!per || !M.doors.length) return;
    S.doorT += h;
    const ph = S.doorT % (2 * per), aShut = ph >= per, toNext = aShut ? 2 * per - ph : per - ph;
    S.warn[0] = !aShut && toNext < 1 ? 1 : 0;
    S.warn[1] = aShut && toNext < 1 ? 1 : 0;
    for (const d of M.doors) {
      const shut = d.g === 0 ? aShut : !aShut;
      if (shut && !S.closed[d.id]) {
        if (S.mouse.edge !== d.id && S.cat.edge !== d.id) { S.closed[d.id] = 1; ev(S, 'door', null, d.id); }
      } else if (!shut && S.closed[d.id]) { S.closed[d.id] = 0; ev(S, 'dooropen', null, d.id); }
    }
  }
  function collide(S) {
    const m = S.mouse, c = S.cat;
    if (c.st !== 'play') return;
    const d = dist(m, c);
    if (m.sup > 0) { if (d < TUNE.bonkR) bonk(S); return; }
    if (d < TUNE.captureR) { finish(S, S.catP, 'Attrapée !', 'caught'); return; }
    if (S.phase === 'play') tryPounce(S);
  }
  function sub(S, h, I) {
    S.t += h;
    const ids = S.M.cdIds;
    for (let i = 0; i < ids.length; i++) if (S.cd[ids[i]] > 0) S.cd[ids[i]] = Math.max(0, S.cd[ids[i]] - h);
    doorsStep(S, h);
    if (S.big.st === 0 && S.t >= TUNE.bigAt) { S.big.st = 1; ev(S, 'bigspawn'); }
    mouseStep(S, S.mouse, I[S.mouseP], h);
    eat(S);
    if (S.result) return;
    catStep(S, S.cat, I[S.catP], h);
    if (S.result) return;
    collide(S);
    if (S.result) return;
    if (S.t >= S.dur) finish(S, S.mouseP, 'Elle a tenu !', 'time');
  }
  // I = [entréesP0, entréesP1], chacune { want: direction voulue (-1 = aucune), want2: direction secondaire }
  function step(S, dt, I) {
    if (!S || S.result || !(dt > 0)) return;
    I = I || [];
    const n = Math.max(1, Math.ceil(dt / 0.008 - 1e-9)), h = dt / n;
    for (let k = 0; k < n && !S.result; k++) sub(S, h, I);
  }

  // ----- jeu en ligne (toujours pur : aucun DOM, aucune horloge) -----
  // Tous les échanges sont en cases du labyrinthe (9 x 17), identiques sur tous les écrans.
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dirOk = (d) => (d === 0 || d === 1 || d === 2 || d === 3 ? d : -1);
  const r3 = (v) => Math.round((+v || 0) * 1e3) / 1e3, r4 = (v) => Math.round((+v || 0) * 1e4) / 1e4;
  const ST = ['play', 'fly', 'home'];
  // état compact d'un personnage : [x, y, dir, face, vitesse, voulu, voulu2, état, temps d'état (ou du bond), départ du vol x, y, bond, récup., super]
  function encX(e, lng) {
    return [r4(e.x), r4(e.y), e.dir, e.face, r3(e.spd), e.want, e.want2, Math.max(0, ST.indexOf(e.st)), r3(lng ? e.pounce : e.stT),
      r4(e.fx), r4(e.fy), lng ? 1 : 0, r3(Math.max(0, e.rec)), r3(Math.max(0, e.sup))];
  }
  // retrouve le couloir parcouru (edge) d'après la position et la direction
  function fixEdge(S, e) {
    if (e.x < -0.5) e.x += COLS; else if (e.x >= COLS - 0.5) e.x -= COLS;
    if (isCenter(e) || e.dir < 0) {
      const cr = cellOf(e);
      e.x = cr[0]; e.y = cl(cr[1], 0, ROWS - 1); e.edge = -1; e.edgeT = 0; e.from = e.y * COLS + e.x;
      return;
    }
    let c, r;
    if (DX[e.dir]) { c = DX[e.dir] > 0 ? Math.floor(e.x + EPS) : Math.ceil(e.x - EPS); r = cl(Math.round(e.y), 0, ROWS - 1); e.y = r; }
    else { r = DY[e.dir] > 0 ? Math.floor(e.y + EPS) : Math.ceil(e.y - EPS); c = Math.round(e.x); e.x = ((c % COLS) + COLS) % COLS; r = cl(r, 0, ROWS - 1); }
    c = ((c % COLS) + COLS) % COLS;
    e.edge = edgeId(c, r, e.dir); e.edgeT = edgeType(S.M, c, r, e.dir); e.from = r * COLS + c;
  }
  function decX(S, a, g) {
    if (!Array.isArray(a) || a.length < 7) return false;
    const x = +a[0], y = +a[1];
    if (!isFinite(x) || !isFinite(y)) return false;
    g.x = cl(x, -0.5, COLS - 0.5001); g.y = cl(y, 0, ROWS - 1);
    g.dir = dirOk(a[2]); g.face = dirOk(a[3]); if (g.face < 0) g.face = g.p === 0 ? 3 : 1;
    g.spd = cl(+a[4] || 0, 0, 12); g.want = dirOk(a[5]); g.want2 = dirOk(a[6]);
    if (a.length >= 14) {
      g.st = ST[a[7] | 0] || 'play'; g.stT = +a[8] || 0; g.fx = +a[9] || 0; g.fy = +a[10] || 0;
      g.lng = a[11] ? 1 : 0; g.rec = cl(+a[12] || 0, 0, 3); g.sup = cl(+a[13] || 0, 0, TUNE.superT);
    }
    g.lunge = false;
    fixEdge(S, g);
    return true;
  }
  // position annoncée sur un couloir praticable ? (murs fixes seulement : portes et trous au repos acceptés)
  function onGrid(S, x, y, mouse) {
    if (!(y > -0.02 && y < ROWS - 1 + 0.02) || !(x >= -0.52 && x < COLS - 0.48)) return false;
    const M = S.M, rx = Math.round(x), ry = Math.round(y), ix = Math.abs(x - rx) < 0.02, iy = Math.abs(y - ry) < 0.02;
    if (ix && iy) return ry >= 0 && ry < ROWS && !M.X[ry][((rx % COLS) + COLS) % COLS];
    if (iy) {
      const c0 = Math.floor(x);
      if (c0 < 0 || c0 >= COLS - 1) return !!mouse && M.V[ry][0] === TUNNEL;
      const t = M.V[ry][c0 + 1];
      return t !== WALL && (mouse || (t !== HOLE && t !== TUNNEL)) && !M.X[ry][c0] && !M.X[ry][c0 + 1];
    }
    if (ix) {
      const r0 = Math.floor(y), c = ((rx % COLS) + COLS) % COLS;
      if (r0 < 0 || r0 >= ROWS - 1) return false;
      const t = M.H[r0 + 1][c];
      return t !== WALL && (mouse || t !== HOLE) && !M.X[r0][c] && !M.X[r0 + 1][c];
    }
    return false;
  }
  // fait avancer une COPIE de personnage (adversaire affiché, estimation) avec les mêmes règles ; G = { M, cd, closed, ev }
  function ghostStep(G, e, dt, mul) {
    if (!(dt > 0)) return;
    const n = Math.max(1, Math.ceil(dt / 0.008 - 1e-9)), h = dt / n, inp = { want: e.want, want2: e.want2 };
    for (let k = 0; k < n; k++) {
      if (e.st === 'fly' || e.st === 'home') { e.stT += h; continue; }
      if (e.lng) {                                   // bond du chat : tout droit, au plus pounceMax
        if (e.stT >= TUNE.pounceMax) continue;
        e.stT += h; e.lunge = true; travel(G, e, TUNE.pounceV * h); e.lunge = false;
        continue;
      }
      let m = mul;
      if (e.kind === 'cat') { if (e.rec > 0) { e.rec -= h; m *= 0.5; } } else if (e.sup > 0) { e.sup = Math.max(0, e.sup - h); m *= 1.12; }
      moveEnt(G, e, inp, h, m);
    }
  }
  function eatNet(S, N) {
    const m = S.mouse;
    for (const q of S.cheese) {
      if (q.on && near(m, q.c, q.r, TUNE.eatR)) { q.on = 0; S.left--; ev(S, 'eat', m, q); }
    }
    if (S.left <= 0) { N.end(S.mouseP, 'Tout le fromage !', 'cheese'); return; }
    if (S.big.st === 1 && near(m, S.big.c, S.big.r, TUNE.eatR + 0.05)) {
      S.big.st = 2; m.sup = TUNE.superT;
      ev(S, 'super', m);
      if (S.phase === 'pounce') endPounce(S, S.cat);
    }
  }
  // Pas de simulation de l'HÔTE en ligne. N.rem = joueur de l'autre téléphone : sa position arrive par le réseau (déjà posée
  // dans S), sauf quand l'hôte pilote son chat (bond, vol plané, sieste). Les contacts entre les deux joueurs (capture,
  // coup de la super-souris) sont jugés à part, en comparant les positions au même instant. Les fins « fromages » et
  // « temps » attendent (N.end) que les positions de l'invité jusqu'à cet instant soient arrivées.
  function subNet(S, h, I, N) {
    S.t += h;
    const ids = S.M.cdIds;
    for (let i = 0; i < ids.length; i++) if (S.cd[ids[i]] > 0) S.cd[ids[i]] = Math.max(0, S.cd[ids[i]] - h);
    doorsStep(S, h);
    if (S.big.st === 0 && S.t >= TUNE.bigAt) { S.big.st = 1; ev(S, 'bigspawn'); }
    const m = S.mouse, c = S.cat, remM = S.mouseP === N.rem;
    if (remM) { if (m.sup > 0) { m.sup -= h; if (m.sup <= 0) { m.sup = 0; ev(S, 'superend', m); } } }
    else { mouseStep(S, m, I[S.mouseP], h); eatNet(S, N); }
    if (S.result || N.held()) return;
    if (!remM && c.st === 'play' && S.phase !== 'pounce') { if (c.pcd > 0) c.pcd -= h; if (c.rec > 0) c.rec -= h; }
    else if (remM && c.st === 'play' && S.phase === 'pounce') {      // bond du chat de l'hôte vers la souris de l'invité
      if (c.pcd > 0) c.pcd -= h;
      if (c.rec > 0) c.rec -= h;
      c.pounce += h;
      c.lunge = true; travel(S, c, TUNE.pounceV * h); c.lunge = false;
      if (c.dir < 0 || c.pounce >= TUNE.pounceMax) N.hold();      // raté ? on attend de savoir où était la souris
    } else catStep(S, c, I[S.catP], h);
    if (S.result || N.held()) return;
    if (S.phase === 'play' && c.st === 'play') tryPounce(S);
    if (S.t >= S.dur) N.end(S.mouseP, 'Elle a tenu !', 'time');
  }

  // ===========================================================================
  // IA (pure, sans DOM) — joue la SOURIS ou le CHAT avec exactement les règles du joueur : elle ne fait que donner des
  // « directions voulues », comme un doigt sur l'écran. Elle voit l'adversaire avec un temps de réaction humain (ce qu'il
  // faisait il y a « react » s, qu'elle prolonge selon sa direction — anticipation), jamais ses intentions.
  //  - cartes de temps (Dijkstra sur la grille, virages comptés : le chat perd du temps à chaque virage, la souris presque pas) ;
  //  - CHAT : vise où la souris va être, choisit le côté qui lui laisse le moins de cases sûres (coupe les routes, garde les
  //    sorties de trous et de tunnels), se méfie du gros fromage, fuit la super-souris ;
  //  - SOURIS : carte de danger (le chat arrive-t-il avant elle ?), fromages sûrs avec une issue, trous et tunnels, gros fromage
  //    au bon moment pour renvoyer le chat, et tient jusqu'à la fin du temps quand c'est plus sûr ;
  //  - en fuite, la souris décide à chaque carrefour en regardant 1 (moyen), 2 (difficile) ou 3 (extrême) carrefours plus loin :
  //    un chemin vaut sa marge la plus faible sur le chat ; les culs-de-sac sont évités ;
  //  - niveaux : temps de réaction (~0,6 s en facile … ~0,15 s en extrême), erreurs, anticipation, profondeur de recherche.
  // ===========================================================================
  const NC = COLS * ROWS;
  const AI_LV = {
    // réaction moyenne ≈ react + think / 2 : ~0,6 s (facile) … ~0,15 s (extrême)
    // react : retard de perception ; think : entre deux réflexions ; err : erreurs ; look : anticipation ; depth : carrefours regardés
    facile: { react: 0.45, think: 0.34, err: 0.34, look: 0, tier: 1, hold: 0.8, safe: 0 },
    moyen: { react: 0.3, think: 0.25, err: 0.12, look: 0.4, tier: 2, hold: 0.6, safe: 0.25 },
    difficile: { react: 0.2, think: 0.16, err: 0.03, look: 0.85, tier: 3, depth: 2, hold: 0.45, safe: 0.45 },
    extreme: { react: 0.1, think: 0.1, err: 0, look: 1, tier: 3, depth: 3, hold: 0.35, safe: 0.5 }
  };
  function hpush(H, key, val) {
    let i = H.n++;
    while (i > 0) { const p = (i - 1) >> 1; if (H.k[p] <= key) break; H.k[i] = H.k[p]; H.v[i] = H.v[p]; i = p; }
    H.k[i] = key; H.v[i] = val;
  }
  function hpop(H) {
    const top = H.v[0], last = --H.n;
    if (last > 0) {
      const key = H.k[last], val = H.v[last];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= last) break;
        if (c + 1 < last && H.k[c + 1] < H.k[c]) c++;
        if (H.k[c] >= key) break;
        H.k[i] = H.k[c]; H.v[i] = H.v[c]; i = c;
      }
      H.k[i] = key; H.v[i] = val;
    }
    return top;
  }
  const HP = { k: new Float64Array(NC * 24), v: new Int32Array(NC * 24), n: 0 };
  const TBEST = new Float32Array(NC * 5);
  const nbrK = (c, r, d) => (r + DY[d]) * COLS + ((c + DX[d] + COLS) % COLS);
  // passage pour la planification : 0 = règles du jeu ; 1 = en plus, les portes qui vont se fermer sont évitées ;
  // 2 = souris maladroite qui n'ose pas les trous ni les tunnels
  // pendant une réflexion, les passages (case × direction) sont lus dans des tables calculées une seule fois
  const PTAB = { on: false, t: [new Uint8Array(NC * 4), new Uint8Array(NC * 4), new Uint8Array(NC * 4), new Uint8Array(NC * 4)] };
  function aiTables(S) {
    PTAB.on = false;
    for (let i = 0; i < 4; i++) {
      const T = PTAB.t[i], mouse = i >= 2, opt = i === 1 ? 1 : i === 3 ? 2 : 0;
      for (let k = 0; k < NC; k++) { const c = k % COLS, r = (k / COLS) | 0; for (let d = 0; d < 4; d++) T[k * 4 + d] = aiPass(S, c, r, d, mouse, opt) ? 1 : 0; }
    }
    PTAB.on = true;
  }
  function aiPass(S, c, r, d, mouse, opt) {
    if (PTAB.on) return PTAB.t[(mouse ? 2 : 0) + (opt ? 1 : 0)][(r * COLS + c) * 4 + d] === 1;
    if (!canPass(S, c, r, d, mouse)) return false;
    if (opt) {
      const t = edgeType(S.M, c, r, d);
      if (opt === 1 && (t === DOOR_A || t === DOOR_B) && S.warn[t - DOOR_A]) return false;
      if (opt === 2 && (t === HOLE || t === TUNNEL)) return false;
    }
    return true;
  }
  function profOf(S, kind, sup) {
    if (kind === 'cat') return { step: 1 / (S.cat.vmax * (sup ? 0.6 : 1)), turn: 0.1, rev: 0.22 };
    return { step: 1 / (S.mouse.vmax * (sup ? 1.12 : 1)), turn: 0.012, rev: 0.03 };
  }
  // case vers laquelle on va (ou la case actuelle), reste à parcourir, case d'où l'on vient (-1 si on est au centre)
  function fwdOf(e) {
    if (e.dir < 0 || isCenter(e)) { const cr = cellOf(e); return { k: cr[1] * COLS + cr[0], c: cr[0], r: cr[1], rem: 0, bk: -1 }; }
    let fc, fr, rem;
    if (DX[e.dir]) { fc = DX[e.dir] > 0 ? Math.floor(e.x + EPS) + 1 : Math.ceil(e.x - EPS) - 1; rem = Math.abs(fc - e.x); fr = Math.round(e.y); }
    else { fr = DY[e.dir] > 0 ? Math.floor(e.y + EPS) + 1 : Math.ceil(e.y - EPS) - 1; rem = Math.abs(fr - e.y); fc = Math.round(e.x); }
    const bc = (((fc - DX[e.dir]) % COLS) + COLS) % COLS, br = cl(fr - DY[e.dir], 0, ROWS - 1);
    fc = ((fc % COLS) + COLS) % COLS; fr = cl(fr, 0, ROWS - 1);
    return { k: fr * COLS + fc, c: fc, r: fr, rem: cl(rem, 0, 1), bk: br * COLS + bc };
  }
  function seedsOf(e, prof) {
    const f = fwdOf(e);
    if (f.bk < 0) return [[f.k, e.dir, 0]];
    return [[f.k, e.dir, f.rem * prof.step], [f.bk, OPP[e.dir], (1 - f.rem) * prof.step + prof.rev]];
  }
  // temps d'arrivée dans chaque case (Dijkstra sur (case, direction d'arrivée) : les virages coûtent)
  function tmap(S, seeds, mouse, prof, out, opt) {
    TBEST.fill(1e9); out.fill(1e9); HP.n = 0;
    for (const s of seeds) {
      const st = s[0] * 5 + (s[1] + 1);
      if (s[2] < TBEST[st]) { TBEST[st] = s[2]; hpush(HP, TBEST[st], st); }   // (la valeur rangée, arrondie en Float32)
    }
    while (HP.n) {
      const t = HP.k[0], st = hpop(HP);
      if (t > TBEST[st]) continue;
      const k = (st / 5) | 0, hd = (st % 5) - 1, c = k % COLS, r = (k / COLS) | 0;
      if (t < out[k]) out[k] = t;
      for (let d = 0; d < 4; d++) {
        if (!aiPass(S, c, r, d, mouse, opt)) continue;
        const ns = nbrK(c, r, d) * 5 + d + 1;
        const nt = t + prof.step + (hd < 0 || hd === d ? 0 : hd === OPP[d] ? prof.rev : prof.turn);
        if (nt < TBEST[ns]) { TBEST[ns] = nt; hpush(HP, TBEST[ns], ns); }
      }
    }
    return out;
  }
  // coût pour rejoindre le but depuis chaque case (1 par case + « extra » : danger)
  function cmap(S, goal, mouse, opt, extra, out) {
    out.fill(1e9); HP.n = 0;
    if (goal < 0) return out;
    out[goal] = 0; hpush(HP, 0, goal);
    while (HP.n) {
      const t = HP.k[0], k = hpop(HP);
      if (t > out[k]) continue;
      const c = k % COLS, r = (k / COLS) | 0;
      for (let d = 0; d < 4; d++) {
        if (!aiPass(S, c, r, d, mouse, opt)) continue;
        const nk = nbrK(c, r, d), nt = t + 1 + (extra ? extra[k] : 0);
        if (nt < out[nk]) { out[nk] = nt; hpush(HP, out[nk], nk); }
      }
    }
    return out;
  }
  // nombre de pas (BFS, sans virages) — rapide, pour les simulations de l'IA extrême
  const BQ = new Int32Array(NC);
  function steps(S, k0, mouse, out) {
    out.fill(-1);
    if (k0 < 0) return out;
    out[k0] = 0; BQ[0] = k0;
    let qn = 1;
    for (let h = 0; h < qn; h++) {
      const k = BQ[h], c = k % COLS, r = (k / COLS) | 0;
      for (let d = 0; d < 4; d++) {
        if (!aiPass(S, c, r, d, mouse, 0)) continue;
        const nk = nbrK(c, r, d);
        if (out[nk] < 0) { out[nk] = out[k] + 1; BQ[qn++] = nk; }
      }
    }
    return out;
  }
  function mkAI(level, p, seed) {
    const prm = AI_LV[level] || AI_LV.moyen;
    return {
      level: AI_LV[level] ? level : 'moyen', prm, p, rng: mulberry32((seed >>> 0) || 7), obs: [], next: 0, goal: -1, force: -1, forceK: -1,
      opt: 0, lastRev: -9, lastDir: -1, forceT: 0, flee: 0, mP: null, G: new Float32Array(NC), tA: new Float32Array(NC), tB: new Float32Array(NC), tC: new Float32Array(NC),
      ex: new Float32Array(NC), sA: new Int16Array(NC), sB: new Int16Array(NC), own: new Int16Array(NC), hol: new Uint8Array(NC), mk: new Int32Array(NC), stamp: 1,
      W: { M: null, cd: new Float32Array(400), closed: null, ev: [], warn: [0, 0] }, want: -1, want2: -1, think: 0, msMax: 0, msSum: 0
    };
  }
  function aiWorld(A, S) { const W = A.W; W.M = S.M; W.cd.set(S.cd); W.closed = S.closed; W.warn = S.warn; W.ev.length = 0; return W; }
  // ce que l'IA voit de l'adversaire : son état d'il y a « react » secondes
  function aiObserve(A, S, rt) {
    const o = A.p === S.mouseP ? S.cat : S.mouse;
    A.obs.push({ t: rt, x: o.x, y: o.y, dir: o.dir, face: o.face, st: o.st, stT: o.stT, sup: S.mouse.sup, phase: S.phase });
    while (A.obs.length > 2 && A.obs[1].t <= rt - 1.5) A.obs.shift();
  }
  function aiSeen(A, rt) {
    const T = rt - A.prm.react;
    let best = A.obs[0], prev = A.obs[0];
    for (let i = 0; i < A.obs.length; i++) { if (A.obs[i].t <= T) best = A.obs[i]; else break; }
    for (let i = 0; i < A.obs.length; i++) { if (A.obs[i].t <= T - 0.35) prev = A.obs[i]; else break; }
    // a-t-il vraiment avancé dans sa direction ces derniers instants ? (sinon : il hésite, on ne le prolonge pas)
    if (best && prev) {
      let dx = best.x - prev.x;
      if (dx > COLS / 2) dx -= COLS; else if (dx < -COLS / 2) dx += COLS;
      const dy = best.y - prev.y, d = best.dir;
      best.steady = d >= 0 && (DX[d] * dx + DY[d] * dy) > 0.25;
    }
    return best;
  }
  // l'adversaire tel qu'on l'imagine maintenant : vu il y a « react » s, prolongé tout droit (anticipation)
  function aiGuess(A, S, v, ahead) {
    const src = A.p === S.mouseP ? S.cat : S.mouse;
    const g = Object.assign({}, src);
    g.x = v.x; g.y = v.y; g.dir = v.dir; g.face = v.face; g.st = v.st; g.stT = v.stT; g.lng = 0; g.rec = 0;
    g.sup = g.kind === 'mouse' ? v.sup : 0; g.want = v.dir; g.want2 = -1; g.lunge = false;
    fixEdge(S, g);
    if (ahead > 0 && g.dir >= 0 && g.st === 'play' && v.steady) {
      const W = aiWorld(A, S), s0 = g.sup;
      ghostStep(W, g, ahead, g.kind === 'cat' && v.sup > 0 ? 0.6 : 1);
      W.ev.length = 0; g.sup = s0;
    }
    return g;
  }
  function aiTick(A, S, rt) {
    aiObserve(A, S, rt);
    const me = A.p === S.mouseP ? S.mouse : S.cat;
    if (rt >= A.next) {
      const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      A.next = rt + A.prm.think * (0.8 + 0.4 * A.rng());
      A.think++;
      aiTables(S);
      try { if (me.kind === 'cat') aiThinkCat(A, S, rt); else aiThinkMouse(A, S, rt); } finally { PTAB.on = false; }
      if (t0) { const d = performance.now() - t0; A.msSum += d; if (d > A.msMax) A.msMax = d; }
    }
    aiSteer(A, S, me, rt);
    return A;
  }
  // une erreur de débutant : un but au hasard pas loin
  function aiBlunder(A, S, me) {
    const f = fwdOf(me), cand = [];
    for (let d = 0; d < 4; d++) if (aiPass(S, f.c, f.r, d, me.kind === 'mouse', 0)) cand.push(d);
    if (!cand.length) return false;
    const d = cand[(A.rng() * cand.length) | 0];
    let k = nbrK(f.c, f.r, d);
    for (let i = 0; i < 3; i++) {             // on file un peu dans ce couloir
      const c = k % COLS, r = (k / COLS) | 0;
      if (!aiPass(S, c, r, d, me.kind === 'mouse', 0)) break;
      k = nbrK(c, r, d);
    }
    A.goal = k; A.force = d; A.forceK = f.k; A.opt = 0;
    cmap(S, k, me.kind === 'mouse', 0, null, A.G);
    return true;
  }
  function aiThinkCat(A, S, rt) {
    const prm = A.prm, c = S.cat, v = aiSeen(A, rt);
    if (!v || c.st !== 'play') return;
    if (A.rng() < prm.err && aiBlunder(A, S, c)) return;
    const mSup = v.sup > 0;
    const mv = aiGuess(A, S, v, prm.look * prm.react + (prm.tier >= 3 ? 0.12 : 0));
    const cP = profOf(S, 'cat', mSup), mP = profOf(S, 'mouse', mSup), opt = prm.tier >= 3 ? 1 : 0;
    const catT = tmap(S, seedsOf(c, cP), false, cP, A.tA, opt);
    const mouT = tmap(S, seedsOf(mv, mP), true, mP, A.tB, 0);
    const mk = fwdOf(mv).k;
    A.opt = opt; A.force = -1;
    // la super-souris : on fuit (le facile n'y pense qu'une fois sur deux)
    if (mSup && (prm.tier > 1 || A.rng() < 0.5)) {
      let best = -1, bv = -1e9;
      for (let k = 0; k < NC; k++) {
        if (catT[k] > 50) continue;
        const s = Math.min(mouT[k], 6) - catT[k] * 0.6 + (prm.tier >= 3 ? 0.15 * Math.min(mouT[k] - catT[k], 3) : 0);
        if (s > bv) { bv = s; best = k; }
      }
      A.goal = best;
      for (let k = 0; k < NC; k++) A.ex[k] = mouT[k] < catT[k] + 0.3 ? 3 : 0;   // ne pas passer près d'elle
      cmap(S, best, false, opt, A.ex, A.G);
      return;
    }
    // poursuite : où la souris va-t-elle être ?
    let goal = prm.tier === 1 ? fwdOf(aiGuess(A, S, v, 0)).k : mk;
    // gros fromage : si la souris peut le prendre avant que je l'attrape, je ne reste pas dans les parages
    const bigK = S.big.c + S.big.r * COLS;
    const bigRisk = prm.tier >= 2 && (S.big.st === 1 || (S.big.st === 0 && S.t > TUNE.bigAt - 2)) && mouT[bigK] < Math.min(catT[mk], 3.5) && mouT[bigK] + 0.2 < catT[bigK];
    if (prm.tier >= 3 && prm.terr !== 0 && catT[mk] < (prm.terrR || 2.2)) {
      // de quel côté partir ? parmi les directions presque aussi rapides que le plus court chemin, celle qui laisse le moins
      // de cases où la souris arrive avant moi (elle coupe les routes, garde les sorties de trous et de tunnels)
      const f = fwdOf(c), cands = [];
      for (let d = 0; d < 4; d++) if (aiPass(S, f.c, f.r, d, false, opt)) cands.push([f.k, d, f.rem * cP.step + (c.dir >= 0 && d !== c.dir ? (d === OPP[c.dir] ? cP.rev : cP.turn) : 0)]);
      const res = [];
      let bestClose = 1e9;
      for (const cd of cands) {
        const seeds = cd[1] === -2 ? [[cd[0], OPP[c.dir], cd[2]]] : [[nbrK(cd[0] % COLS, (cd[0] / COLS) | 0, cd[1]), cd[1], cd[2] + cP.step]];
        const ct = tmap(S, seeds, false, cP, A.tC, opt);
        let owned = 0;
        if (catT[mk] < 2) for (let k = 0; k < NC; k++) if (mouT[k] < 50 && mouT[k] + 0.15 < ct[k]) owned += 1 + (mouT[k] < 1.2 ? 1 : 0);
        const close = ct[mk] + (bigRisk ? 2 * Math.max(0, 1.7 - ct[bigK]) : 0);
        res.push([cd[1], close, owned]);
        if (close < bestClose) bestClose = close;
      }
      let bestD = -9, bv = 1e9;
      for (const r of res) {
        if (r[1] > bestClose + 0.12) continue;
        const sc = r[2] + 8 * (r[1] - bestClose) + (r[0] === c.dir ? -1.5 : 0);
        if (sc < bv) { bv = sc; bestD = r[0]; }
      }
      if (bestD !== -9) { A.force = bestD === -2 ? OPP[c.dir] : bestD; A.forceK = bestD === -2 ? -2 : f.k; A.forceT = rt + prm.think * 1.6; }
    }
    A.goal = goal;
    if (bigRisk) { const bc = S.big.c, br = S.big.r; for (let k = 0; k < NC; k++) { const dc = Math.abs((k % COLS) - bc), dr = Math.abs(((k / COLS) | 0) - br); A.ex[k] = dc + dr <= 2 ? 1.5 : 0; } cmap(S, goal, false, opt, A.ex, A.G); }
    else cmap(S, goal, false, opt, null, A.G);
  }
  // le long d'un couloir jusqu'au prochain carrefour : temps, marge la plus faible (chat − souris), cul-de-sac ?
  function walkC(S, k, d, t, mP, catT, mouse) {
    let c = k % COLS, r = (k / COLS) | 0, mm = catT[k] - t;
    for (let n = 0; ; n++) {
      let ex = -1, cnt = 0;
      for (let q = 0; q < 4; q++) if (q !== OPP[d] && aiPass(S, c, r, q, mouse, 0)) { cnt++; ex = q; }
      if (cnt !== 1 || n >= 7) return { k, d, t, mm, dead: cnt === 0 };
      t += mP.step + (ex !== d ? mP.turn : 0); d = ex; k = nbrK(c, r, d); c = k % COLS; r = (k / COLS) | 0;
      mm = Math.min(mm, catT[k] - t);
    }
  }
  // meilleure issue en regardant « depth » carrefours plus loin : un chemin vaut sa marge la plus faible ; culs-de-sac pénalisés
  function escapeVal(A, S, k, d, t, mP, catT, depth) {
    const w = walkC(S, k, d, t, mP, catT, true);
    if (w.dead) return { v: Math.min(w.mm, 0) - 4, end: w.k };
    if (depth <= 1) return { v: Math.min(w.mm, 3) + 0.12 * A.own[w.k] + 0.4 * A.hol[w.k], end: w.k };
    let best = -1e9, end = w.k;
    const c = w.k % COLS, r = (w.k / COLS) | 0;
    for (let q = 0; q < 4; q++) {
      if (q === OPP[w.d] || !aiPass(S, c, r, q, true, 0)) continue;
      const sub2 = escapeVal(A, S, nbrK(c, r, q), q, w.t + mP.step + (q !== w.d ? mP.turn : 0), mP, catT, depth - 1);
      const v = Math.min(w.mm, sub2.v);
      if (v > best) { best = v; end = sub2.end; }
    }
    return best > -1e9 ? { v: best, end } : { v: w.mm - 4, end: w.k };
  }
  function aiThinkMouse(A, S, rt) {
    const prm = A.prm, m = S.mouse, v = aiSeen(A, rt);
    if (!v) return;
    if (A.rng() < prm.err && aiBlunder(A, S, m)) return;
    const sup = m.sup > 0, opt = prm.tier === 1 ? 2 : 0;
    const cv = aiGuess(A, S, v, prm.look * prm.react);
    const cP = profOf(S, 'cat', sup), mP = profOf(S, 'mouse', sup);
    const catT = tmap(S, seedsOf(cv, cP), false, cP, A.tA, 0);
    if (cv.st !== 'play') {                       // chat renvoyé dans son panier : il ne repart qu'après sa sieste
      const wait = cv.st === 'fly' ? TUNE.flyT - cv.stT + TUNE.homeT : TUNE.homeT - cv.stT;
      const hm = S.homes[S.catP];
      tmap(S, [[hm.r * COLS + hm.c, -1, Math.max(0, wait)]], false, cP, catT, 0);
    }
    const mouT = tmap(S, seedsOf(m, mP), true, mP, A.tB, opt);
    const mar = A.tC;
    for (let k = 0; k < NC; k++) mar[k] = catT[k] - mouT[k];
    const ck = fwdOf(cv).k, left = S.dur - S.t;
    let goal = -1;
    A.opt = opt; A.force = -1;
    if (prm.tier === 1) {
      // facile : le fromage le plus proche, et la fuite seulement quand le chat est tout près
      const near = catT[fwdOf(m).k] < 0.8 && cv.st === 'play';
      if (!near) { let bv = 1e9; for (const q of S.cheese) { const k = q.r * COLS + q.c; if (q.on && mouT[k] < bv) { bv = mouT[k]; goal = k; } } }
      if (goal < 0) { let bv = -1e9; for (let k = 0; k < NC; k++) if (mouT[k] < 3 && catT[k] < 50) { const s = catT[k] - 0.3 * mouT[k]; if (s > bv) { bv = s; goal = k; } } }
      A.goal = goal;
      cmap(S, goal, true, opt, null, A.G);
      return;
    }
    const safe = prm.safe;
    // autour de chaque case : combien de cases sûres à moins de 3 pas (pas de cul-de-sac), et un trou ou un tunnel tout près
    const own = A.own, hol = A.hol;
    for (let k = 0; k < NC; k++) {
      own[k] = 0; hol[k] = 0;
      if (mouT[k] > 40 || !(mar[k] > 0)) continue;
      const c0 = k % COLS, r0 = (k / COLS) | 0;
      for (let d = 0; d < 4; d++) { const t = edgeType(S.M, c0, r0, d); if ((t === HOLE || t === TUNNEL) && aiPass(S, c0, r0, d, true, 0)) hol[k] = 1; }
      const st = ++A.stamp;
      let qn = 1; BQ[0] = k; A.mk[k] = st;
      for (let h = 0, depth = 0, end = 1; h < qn && depth < 3; depth++) {
        for (; h < end; h++) {
          const q = BQ[h], c = q % COLS, r = (q / COLS) | 0;
          for (let d = 0; d < 4; d++) {
            if (!aiPass(S, c, r, d, true, 0)) continue;
            const nk = nbrK(c, r, d);
            if (A.mk[nk] === st) continue;
            A.mk[nk] = st; BQ[qn++] = nk;
            if (mar[nk] > safe) own[k]++;
          }
        }
        end = qn;
      }
    }
    // super-souris : je fonce sur le chat pour le renvoyer dans son panier (s'il est à portée)
    if (sup && cv.st === 'play' && mouT[ck] < m.sup - 0.15) goal = ck;
    // le chat approche : je fuis, carrefour par carrefour (aiSteer), vers la case la plus loin de lui ; on choisit l'issue
    // en regardant les carrefours suivants (profondeur selon le niveau)
    const fm = fwdOf(m), here = mar[fm.k];
    const near = A.flee ? catT[fm.k] < 2.9 || here < 1.4 : catT[fm.k] < 2.2 || here < 1;   // (hystérésis : on ne change pas d'avis sans arrêt)
    A.flee = 0;
    if (goal < 0 && !sup && cv.st === 'play' && near && prm.tier >= 2) {
      steps(S, fwdOf(cv).k, false, A.sA);
      A.flee = 1; A.goal = fm.k; A.mP = mP;
      return;
    }
    if (goal < 0 && !sup && cv.st === 'play' && (catT[fm.k] < 2.2 || here < 1)) {
      const depth = prm.tier >= 3 ? prm.depth || 2 : 1, starts = [];
      if (fm.bk < 0) { for (let d = 0; d < 4; d++) if (aiPass(S, fm.c, fm.r, d, true, 0)) starts.push([nbrK(fm.c, fm.r, d), d, mP.step + (m.dir >= 0 && d !== m.dir ? (d === OPP[m.dir] ? mP.rev : mP.turn) : 0), d]); }
      else {
        for (let d = 0; d < 4; d++) if (d !== OPP[m.dir] && aiPass(S, fm.c, fm.r, d, true, 0)) starts.push([nbrK(fm.c, fm.r, d), d, (fm.rem + 1) * mP.step + (d !== m.dir ? mP.turn : 0), d]);
        starts.push([fm.bk, OPP[m.dir], (1 - fm.rem) * mP.step + mP.rev, -2]);
      }
      let bv = -1e9, bd = -9, be = -1;
      for (const st of starts) {
        const e = escapeVal(A, S, st[0], st[1], st[2], mP, catT, depth);
        const v = e.v + (st[3] === m.dir ? 0.15 : 0) + (st[3] === -2 ? -0.1 : 0);
        if (v > bv) { bv = v; bd = st[3]; be = e.end; }
      }
      if (bd !== -9) {
        A.force = bd === -2 ? OPP[m.dir] : bd; A.forceK = bd === -2 ? -2 : fm.k; A.forceT = rt + prm.think * 1.6;
        goal = be;
      }
    }
    // gros fromage : à prendre quand c'est sûr et que le chat est assez près pour être renvoyé
    const bigK = S.big.c + S.big.r * COLS;
    if (goal < 0 && S.big.st === 1 && mar[bigK] > safe) {
      const catNear = catT[bigK] < TUNE.superT * 0.75, danger = mar[fwdOf(m).k] < 0.9;
      if (catNear || danger || prm.tier >= 3 && left < 14) goal = bigK;
    }
    // fromages sûrs (le chat arrive après moi, avec une marge) et pas au fond d'un cul-de-sac
    let need = 0;
    for (const q of S.cheese) if (q.on) need++;
    const endgame = prm.tier >= 3 && left < 7 && need > 2;      // plus le temps : je tiens jusqu'au bout
    if (goal < 0 && !endgame) {
      let bv = 1e9;
      for (const q of S.cheese) {
        if (!q.on) continue;
        const k = q.r * COLS + q.c;
        if (!(mar[k] > safe) || mouT[k] > 40 || (prm.tier >= 3 && own[k] < 3 && need > 1)) continue;
        const s = mouT[k] - 0.35 * Math.min(mar[k], 2.5) - (prm.tier >= 3 ? 0.12 * own[k] + 0.3 * hol[k] : 0) - (need === 1 ? 2 : 0);
        if (s < bv) { bv = s; goal = k; }
      }
    }
    // sinon : un refuge (j'y arrive bien avant le chat, beaucoup de cases sûres autour, un trou ou un tunnel tout près)
    if (goal < 0) {
      let bv = -1e9;
      for (let k = 0; k < NC; k++) {
        if (mouT[k] > 30 || !(mar[k] > 0)) continue;
        const s = Math.min(mar[k], 2.5) + 0.3 * own[k] + 0.6 * hol[k] - 0.1 * mouT[k];
        if (s > bv) { bv = s; goal = k; }
      }
    }
    // piégée : le plus loin possible du chat (gagner du temps, il peut se tromper)
    if (goal < 0) {
      let bv = -1e9;
      for (let k = 0; k < NC; k++) if (mouT[k] < 4 && catT[k] < 50 && catT[k] - 0.5 * mouT[k] > bv) { bv = catT[k] - 0.5 * mouT[k]; goal = k; }
    }
    A.goal = goal;
    // chemin : on évite les cases où le chat arrive avant (ou presque)
    for (let k = 0; k < NC; k++) { const g = mar[k] - 0.35; A.ex[k] = g < 0 ? (sup && cv.st === 'play' ? 0 : 8 + 6 * Math.min(-g, 2)) : g < 0.6 ? (0.6 - g) * 4 : 0; }
    if (sup) A.ex.fill(0);
    cmap(S, goal, true, opt, A.ex, A.G);
  }
  // pilotage à chaque image : à la prochaine case de décision, la direction qui rapproche le plus du but (carte A.G)
  function aiSteer(A, S, me, rt) {
    A.want = -1; A.want2 = -1;
    if (me.st !== 'play' || A.goal < 0) return;
    const mouse = me.kind === 'mouse', f = fwdOf(me), G = A.G, opt = A.opt;
    if (A.flee && mouse) {                                       // fuite : la voisine la plus loin du chat (pour lui)
      const D = A.sA;
      if (f.bk >= 0 && 1 - f.rem < 0.34) { A.want = me.dir; return; }
      let b1 = -1, v1 = -1e9;
      const look = A.prm.tier >= 3 ? A.prm.depth || 2 : 0, mP = A.mP, t0 = f.rem * (mP ? mP.step : 0.22);
      for (let d = 0; d < 4; d++) {
        if (!canPass(S, f.c, f.r, d, true)) continue;
        const nk = nbrK(f.c, f.r, d);
        let v = D[nk] < 0 ? 30 : D[nk];
        if (me.dir >= 0 && d === OPP[me.dir]) v -= rt - A.lastRev > A.prm.hold || (D[f.k] >= 0 && D[f.k] <= 3) ? 1.5 : 50;
        // difficile / extrême : on regarde les carrefours suivants (marge la plus faible du chemin, culs-de-sac)
        if (look && mP) v += 2.5 * Math.min(escapeVal(A, S, nk, d, t0 + mP.step + (me.dir >= 0 && d !== me.dir ? mP.turn : 0), mP, A.tA, look).v, 1.5);
        if (v > v1) { v1 = v; b1 = d; }
      }
      if (f.bk >= 0) {                                           // demi-tour en plein couloir si le chat arrive en face
        const vb = D[f.bk] < 0 ? 30 : D[f.bk], vf = D[f.k] < 0 ? 30 : D[f.k];
        const close = Math.min(vb, vf) <= 3;
        if (vb > vf + (close ? 0.5 : A.prm.revM == null ? 1.5 : A.prm.revM) && rt - A.lastRev > A.prm.hold * (close ? 0.5 : 1)) { A.want = OPP[me.dir]; A.lastRev = rt; return; }
      }
      if (b1 >= 0 && me.dir >= 0 && b1 === OPP[me.dir]) A.lastRev = rt;
      A.want = b1;
      return;
    }
    // demi-tour en plein couloir si revenir en arrière rapproche nettement du but (pas trop souvent : naturel)
    if (f.bk >= 0) {
      const fwd = f.rem + G[f.k], back = (1 - f.rem) + G[f.bk] + 0.4;
      const forced = A.forceK === -2 && A.force === OPP[me.dir];
      const keep = A.forceT > rt && A.forceK !== -2 && me.dir === A.force;   // je suis la route choisie à la dernière réflexion
      if ((forced || (back < fwd - 1.2 && !keep)) && rt - A.lastRev > A.prm.hold) { A.want = OPP[me.dir]; A.lastRev = rt; A.forceK = -1; return; }
    }
    if (A.forceK === -2 && f.bk < 0) A.forceK = -1;
    if (A.forceK === f.k && A.force >= 0 && aiPass(S, f.c, f.r, A.force, mouse, 0)) {
      A.want = f.bk >= 0 && 1 - f.rem < (mouse ? 0.34 : 0.26) && A.force !== me.dir && A.force !== OPP[me.dir] ? me.dir : A.force;
      return;
    }
    if (A.forceK !== f.k && A.forceK !== -2) A.forceK = -1;
    let b1 = -1, v1 = 1e9, b2 = -1, v2 = 1e9;
    for (let d = 0; d < 4; d++) {
      if (!aiPass(S, f.c, f.r, d, mouse, opt === 2 ? 2 : 0)) continue;
      let val = G[nbrK(f.c, f.r, d)];
      if (me.dir >= 0 && d === OPP[me.dir]) val += rt - A.lastRev > A.prm.hold ? 2 : 50;   // revenir sur ses pas : seulement si ça vaut vraiment le coup
      if (d === me.dir || d === A.lastDir) val -= 0.7;            // on garde sa route (comme un joueur qui tient son doigt)
      if (val < v1) { b2 = b1; v2 = v1; b1 = d; v1 = val; } else if (val < v2) { b2 = d; v2 = val; }
    }
    if (G[f.k] <= 0 && f.bk < 0) { A.want = -1; return; }       // arrivé au but : on attend
    // juste après un carrefour, un virage demandé serait pris pour un « virage tardif » à ce carrefour-là :
    // comme un joueur, on n'indique le virage suivant qu'un peu plus loin
    if (f.bk >= 0 && 1 - f.rem < (mouse ? 0.34 : 0.26) && b1 >= 0 && b1 !== me.dir && b1 !== OPP[me.dir]) { A.want = me.dir; return; }
    if (b1 >= 0 && me.dir >= 0 && b1 === OPP[me.dir]) A.lastRev = rt;
    A.want = b1; A.want2 = b2;
    if (b1 >= 0) A.lastDir = b1;
  }
  // ===== SIM-END =====

  // ===========================================================================
  // Affichage — outils
  // ===========================================================================
  const TAU = Math.PI * 2;
  const ACCENT = '#f5c542';
  const PCOL = ['#ffa630', '#5ef0ff'];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => { k = clamp(k, 0, 1); return 1 - (1 - k) * (1 - k) * (1 - k); };
  const backOut = (k) => { k = clamp(k, 0, 1) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function hexA(hex, a) {
    const n = parseInt(String(hex).slice(1, 7), 16) || 0;
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function shade(hex, k) {
    const n = parseInt(String(hex).slice(1, 7), 16) || 0;
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  function rrect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function lin(c, x0, y0, x1, y1, st) { const g = c.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function rad(c, x0, y0, r0, x1, y1, r1, st) {
    const g = c.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.01, r1));
    for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]);
    return g;
  }
  function starPath(c, x, y, r, n, inner, rot) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * inner : r;
      if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }
  let GL = null;                               // lueurs pré-rendues (64 px), dessinées en additif
  function glows() {
    if (GL) return GL;
    const mk = (col, hard) => {
      const cv = mkCanvas(64, 64), c = cv.getContext('2d');
      c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, hard
        ? [0, 'rgba(255,255,255,1)', 0.25, hexA(col, 1), 0.55, hexA(col, 0.35), 1, hexA(col, 0)]
        : [0, 'rgba(255,255,255,0.9)', 0.12, hexA(col, 0.85), 0.4, hexA(col, 0.3), 1, hexA(col, 0)]);
      c.fillRect(0, 0, 64, 64);
      return cv;
    };
    const soft = (rgb, a) => {
      const cv = mkCanvas(64, 64), c = cv.getContext('2d');
      c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(' + rgb + ',' + a + ')', 0.55, 'rgba(' + rgb + ',' + a * 0.45 + ')', 1, 'rgba(' + rgb + ',0)']);
      c.fillRect(0, 0, 64, 64);
      return cv;
    };
    GL = { gold: mk('#ffd34d'), white: mk('#ffffff'), amber: mk('#ffa630'), cyan: mk('#5ef0ff'), pink: mk('#ff5fae'), red: mk('#ff4d5e'),
      blue: mk('#7fb4ff'), spark: mk('#fff3b0', true), shadow: soft('0,0,0', 0.6), dust: soft('214,204,188', 0.6), warm: soft('255,196,120', 0.5) };
    return GL;
  }

  // ===========================================================================
  // Les pièces de la maison (une par labyrinthe)
  // ===========================================================================
  const THEMES = [
    { name: 'La cuisine', floor: 'tiles', f: ['#1b2b36', '#22374a', '#0b1319'], style: 'enamel', wt: 0.2,
      wall: { dark: '#3e4b55', mid: '#c4d2dc', top: '#eef6fa', spec: '#ffffff', neon: '#ff5fae' }, warm: '255,190,130', cool: '110,170,255', furn: 'stove', out: '#09121a' },
    { name: 'Le salon', floor: 'parquet', f: ['#3d2616', '#4b301b', '#1d120a'], style: 'wood', wt: 0.2,
      wall: { dark: '#2a170b', mid: '#86552f', top: '#bd8452', spec: '#f6cf95', neon: '#b07cff' }, warm: '255,180,110', cool: '170,130,255', furn: 'sofa', out: '#0e0a12',
      rug: ['#43205a', '#5d2c78', '#d9ab47'] },
    { name: 'La cave', floor: 'stone', f: ['#2a3236', '#333c41', '#111618'], style: 'stone', wt: 0.24,
      wall: { dark: '#252b2f', mid: '#6d767c', top: '#9ba4aa', spec: '#d8dfe3', neon: '#4cc36a' }, warm: '255,140,60', cool: '100,220,150', furn: 'barrels', out: '#080c0b' },
    { name: 'Le grenier', floor: 'planks', f: ['#36291c', '#403021', '#150e07'], style: 'beam', wt: 0.22,
      wall: { dark: '#2b1c10', mid: '#7d5434', top: '#ab7a4c', spec: '#ebbd88', neon: '#7d8cff' }, warm: '255,196,140', cool: '130,160,255', furn: 'trunk', out: '#0b0a10' },
    { name: 'La bibliothèque', floor: 'carpet', f: ['#27162e', '#311c3a', '#150b1a'], style: 'books', wt: 0.26,
      wall: { dark: '#1e0f08', mid: '#5a3320', top: '#7b492b', spec: '#c08a5a', neon: '#ff5d73' }, warm: '255,186,104', cool: '200,140,255', furn: 'desk', out: '#0d0810' },
    { name: 'Le jardin', floor: 'grass', f: ['#173b21', '#1d4628', '#0a1f10'], style: 'hedge', wt: 0.3,
      wall: { dark: '#0d2512', mid: '#2e7d3a', top: '#55b351', spec: '#a8eb8c', neon: '#9be14a' }, warm: '255,226,160', cool: '130,190,255', furn: 'flowers', out: '#07100a' }
  ];
  // flaques de lumière (en cases), symétriques par rotation pour que les deux joueurs aient la même ambiance
  const LIGHTS = [[1.6, 3.2, 3.4, 'w'], [6.8, 5.8, 2.8, 'c'], [4, 8, 3.6, 'w']];

  // ---------------------------------------------------------------- sols
  function paintFloor(g, th, X, Y, W, H, cs, R) {
    const f = th.f;
    g.fillStyle = f[2]; g.fillRect(X, Y, W, H);
    if (th.floor === 'tiles') {
      const t = cs / 2, gap = Math.max(1, cs * 0.035);
      for (let j = 0; j * t < H; j++) for (let i = 0; i * t < W; i++) {
        const x = X + i * t, y = Y + j * t;
        g.fillStyle = shade((i + j) % 2 ? f[0] : f[1], (R() - 0.5) * 0.08);
        g.fillRect(x + gap / 2, y + gap / 2, t - gap, t - gap);
        g.fillStyle = 'rgba(255,255,255,0.045)';
        g.fillRect(x + gap, y + gap, t - gap * 2, (t - gap * 2) * 0.32);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(x + gap, y + t - gap * 2.2, t - gap * 2, gap * 1.2);
      }
      // reflet de vitre en diagonale
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = lin(g, X, Y, X + W, Y + H, [0, 'rgba(120,170,255,0)', 0.48, 'rgba(120,170,255,0.05)', 0.52, 'rgba(120,170,255,0.05)', 0.56, 'rgba(120,170,255,0)', 1, 'rgba(0,0,0,0)']);
      g.fillRect(X, Y, W, H);
      g.restore();
    } else if (th.floor === 'parquet') {
      const b = cs / 2, n = 3, gap = Math.max(0.8, cs * 0.022);
      for (let j = 0; j * b < H; j++) for (let i = 0; i * b < W; i++) {
        const hz = (i + j) % 2 === 0;
        for (let k = 0; k < n; k++) {
          const px = hz ? X + i * b : X + i * b + (k * b) / n, py = hz ? Y + j * b + (k * b) / n : Y + j * b;
          const pw = hz ? b : b / n, ph = hz ? b / n : b;
          g.fillStyle = shade(R() < 0.5 ? f[0] : f[1], (R() - 0.5) * 0.18);
          g.fillRect(px + gap / 2, py + gap / 2, pw - gap, ph - gap);
          g.strokeStyle = 'rgba(20,10,4,0.22)'; g.lineWidth = Math.max(0.6, cs * 0.01);
          g.beginPath();
          if (hz) { g.moveTo(px + pw * 0.08, py + ph * (0.35 + R() * 0.3)); g.lineTo(px + pw * 0.92, py + ph * (0.35 + R() * 0.3)); }
          else { g.moveTo(px + pw * (0.35 + R() * 0.3), py + ph * 0.08); g.lineTo(px + pw * (0.35 + R() * 0.3), py + ph * 0.92); }
          g.stroke();
        }
      }
      // tapis rond au centre
      const cx = X + W / 2, cy = Y + H / 2, rx = cs * 2.7, ry = cs * 2.25, rg = th.rug;
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = cs * 0.3;
      ell(g, cx, cy, rx, ry); g.fillStyle = rg[0]; g.fill();
      g.restore();
      ell(g, cx, cy, rx * 0.93, ry * 0.92); g.strokeStyle = hexA(rg[2], 0.55); g.lineWidth = cs * 0.05; g.stroke();
      ell(g, cx, cy, rx * 0.84, ry * 0.82); g.fillStyle = rg[1]; g.fill();
      g.strokeStyle = hexA(rg[2], 0.35); g.lineWidth = cs * 0.03;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * 0.6, cy + Math.sin(a) * ry * 0.6, cs * 0.16, cs * 0.08, a, 0, TAU); g.stroke();
      }
      ell(g, cx, cy, rx * 0.4, ry * 0.4); g.strokeStyle = hexA(rg[2], 0.45); g.lineWidth = cs * 0.04; g.stroke();
      // franges
      g.strokeStyle = hexA(rg[2], 0.4); g.lineWidth = Math.max(0.8, cs * 0.018);
      g.beginPath();
      for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU, x0 = cx + Math.cos(a) * rx, y0 = cy + Math.sin(a) * ry; g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * cs * 0.1, y0 + Math.sin(a) * cs * 0.1); }
      g.stroke();
    } else if (th.floor === 'stone') {
      const s = cs * 0.36;
      for (let y = Y - s, row = 0; y < Y + H + s; y += s * 0.92, row++) {
        const off = row % 2 ? s * 0.5 : 0;
        for (let x = X - s + off; x < X + W + s; x += s) {
          const jx = (R() - 0.5) * s * 0.16, jy = (R() - 0.5) * s * 0.16, w = s * (0.84 + R() * 0.1), h = s * (0.78 + R() * 0.1);
          const base = shade(R() < 0.5 ? f[0] : f[1], (R() - 0.5) * 0.32);
          rrect(g, x + jx, y + jy, w, h, s * 0.28); g.fillStyle = base; g.fill();
          rrect(g, x + jx + w * 0.12, y + jy + h * 0.1, w * 0.76, h * 0.3, s * 0.14); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fill();
          rrect(g, x + jx + w * 0.1, y + jy + h * 0.66, w * 0.8, h * 0.22, s * 0.1); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fill();
          if (R() < 0.07) { ell(g, x + jx + w * R(), y + jy + h * R(), s * 0.22, s * 0.14, R() * 3); g.fillStyle = 'rgba(80,150,70,0.22)'; g.fill(); }
        }
      }
    } else if (th.floor === 'planks') {
      const pw = cs * 0.45;
      for (let x = X; x < X + W; x += pw) {
        let y = Y - R() * cs * 2;
        while (y < Y + H) {
          const len = cs * (1.6 + R() * 2.6);
          g.fillStyle = shade(R() < 0.5 ? f[0] : f[1], (R() - 0.5) * 0.22);
          g.fillRect(x + 1, y + 1, pw - 2, len - 2);
          g.strokeStyle = 'rgba(15,8,2,0.25)'; g.lineWidth = Math.max(0.6, cs * 0.012);
          g.beginPath();
          for (let k = 0; k < 2; k++) {
            const gx = x + pw * (0.3 + k * 0.35 + (R() - 0.5) * 0.1);
            g.moveTo(gx, y + 3);
            g.bezierCurveTo(gx + pw * 0.08, y + len * 0.35, gx - pw * 0.08, y + len * 0.65, gx, y + len - 3);
          }
          g.stroke();
          if (R() < 0.3) { ell(g, x + pw * (0.3 + R() * 0.4), y + len * (0.2 + R() * 0.6), pw * 0.1, pw * 0.07); g.fillStyle = 'rgba(25,12,4,0.35)'; g.fill(); }
          g.fillStyle = 'rgba(200,190,170,0.3)';
          for (const ny of [y + cs * 0.12, y + len - cs * 0.12]) for (const nx of [x + pw * 0.22, x + pw * 0.78]) { circ(g, nx, ny, Math.max(0.8, cs * 0.022)); g.fill(); }
          y += len;
        }
      }
      // rai de lune (lucarne) en diagonale
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [px, py] of [[X + W * 0.28, Y + H * 0.2], [X + W * 0.72, Y + H * 0.8]]) {
        g.save(); g.translate(px, py); g.rotate(-0.5);
        g.fillStyle = rad(g, 0, 0, 0, 0, 0, cs * 2.4, [0, 'rgba(130,160,255,0.14)', 1, 'rgba(130,160,255,0)']);
        g.fillRect(-cs * 1.2, -cs * 2, cs * 2.4, cs * 4);
        g.restore();
      }
      g.restore();
    } else if (th.floor === 'carpet') {
      g.fillStyle = f[0]; g.fillRect(X, Y, W, H);
      const s = cs * 0.75;
      g.strokeStyle = hexA('#c9a24a', 0.13); g.lineWidth = Math.max(0.8, cs * 0.025);
      g.beginPath();
      for (let k = -40; k < 40; k++) {
        g.moveTo(X + k * s, Y); g.lineTo(X + k * s + H, Y + H);
        g.moveTo(X + k * s, Y); g.lineTo(X + k * s - H, Y + H);
      }
      g.stroke();
      g.fillStyle = hexA('#d9b25a', 0.16);
      for (let j = 0; j * s / 2 < H + s; j++) for (let i = 0; i * s < W + s; i++) {
        const x = X + i * s + (j % 2 ? s / 2 : 0), y = Y + (j * s) / 2;
        starPath(g, x, y, cs * 0.09, 4, 0.4, 0); g.fill();
      }
      g.strokeStyle = hexA('#d9b25a', 0.3); g.lineWidth = cs * 0.04;
      g.strokeRect(X + cs * 0.22, Y + cs * 0.22, W - cs * 0.44, H - cs * 0.44);
      g.strokeStyle = hexA('#d9b25a', 0.16); g.lineWidth = cs * 0.02;
      g.strokeRect(X + cs * 0.34, Y + cs * 0.34, W - cs * 0.68, H - cs * 0.68);
    } else {
      // gazon : brins d'herbe, fleurs, pas japonais
      g.fillStyle = lin(g, X, Y, X + W, Y + H, [0, f[1], 0.5, f[0], 1, f[1]]); g.fillRect(X, Y, W, H);
      const n = Math.round((W * H) / (cs * cs) * 34);
      g.lineCap = 'round';
      const cols = ['#1f4d2a', '#2a5e33', '#14361c', '#33703b'];
      for (let i = 0; i < n; i++) {
        const x = X + R() * W, y = Y + R() * H, a = R() * TAU, l = cs * (0.06 + R() * 0.08);
        g.strokeStyle = cols[(R() * 4) | 0]; g.lineWidth = Math.max(0.7, cs * (0.015 + R() * 0.012));
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
      const fl = ['#ffffff', '#ffd1e6', '#fff1a0', '#c9b8ff'];
      for (let i = 0; i < 70; i++) {
        const x = X + R() * W, y = Y + R() * H, c = fl[(R() * 4) | 0], r = cs * 0.035;
        g.fillStyle = hexA('#000000', 0.25); circ(g, x + r * 0.3, y + r * 0.5, r * 2); g.fill();
        g.fillStyle = c;
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; circ(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8); g.fill(); }
        g.fillStyle = '#ffcc33'; circ(g, x, y, r * 0.6); g.fill();
      }
    }
  }

  // ---------------------------------------------------------------- petits objets au sol (décor, par paires symétriques)
  function decorItem(g, floor, kind, k, R) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (floor === 'tiles') {                      // cuisine : miettes de pain, cuillère, goutte de lait
      if (kind === 0) { g.fillStyle = '#b98a52'; for (let i = 0; i < 7; i++) { circ(g, (R() - 0.5) * k * 0.34, (R() - 0.5) * k * 0.3, k * (0.014 + R() * 0.018)); g.fill(); } }
      else if (kind === 1) {
        g.strokeStyle = '#9fb0bd'; g.lineWidth = k * 0.045; g.beginPath(); g.moveTo(-k * 0.06, 0); g.lineTo(k * 0.28, 0); g.stroke();
        ell(g, -k * 0.13, 0, k * 0.09, k * 0.06); g.fillStyle = lin(g, -k * 0.2, -k * 0.06, -k * 0.05, k * 0.06, [0, '#e6eef3', 1, '#7d8e9a']); g.fill();
      } else {
        g.fillStyle = 'rgba(235,245,255,0.16)'; ell(g, 0, 0, k * 0.26, k * 0.16); g.fill(); ell(g, k * 0.16, k * 0.08, k * 0.08, k * 0.05); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.2)'; ell(g, -k * 0.08, -k * 0.04, k * 0.08, k * 0.03); g.fill();
      }
    } else if (floor === 'parquet') {             // salon : pelote de laine, domino, bouton
      if (kind === 0) {
        circ(g, 0, 0, k * 0.12); g.fillStyle = '#d65a8c'; g.fill();
        g.strokeStyle = 'rgba(255,200,225,0.75)'; g.lineWidth = k * 0.018;
        for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, k * (0.04 + i * 0.03), i, i + 2.4); g.stroke(); }
        g.strokeStyle = '#d65a8c'; g.lineWidth = k * 0.02; g.beginPath(); g.moveTo(k * 0.1, k * 0.06); g.bezierCurveTo(k * 0.25, k * 0.2, k * 0.3, -k * 0.05, k * 0.42, k * 0.08); g.stroke();
      } else if (kind === 1) {
        rrect(g, -k * 0.13, -k * 0.07, k * 0.26, k * 0.14, k * 0.03); g.fillStyle = '#eee6d6'; g.fill();
        g.fillStyle = '#2a2018';
        for (const [x, y] of [[-0.07, -0.03], [-0.07, 0.03], [0.05, 0], [0.09, -0.03], [0.09, 0.03]]) { circ(g, x * k, y * k, k * 0.012); g.fill(); }
        g.fillRect(-k * 0.005, -k * 0.06, k * 0.01, k * 0.12);
      } else {
        circ(g, 0, 0, k * 0.07); g.fillStyle = '#4a7fd6'; g.fill();
        g.fillStyle = 'rgba(0,0,0,0.45)';
        for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { circ(g, x * k * 0.022, y * k * 0.022, k * 0.012); g.fill(); }
      }
    } else if (floor === 'stone') {               // cave : champignons lumineux, cailloux, flaque
      if (kind === 0) {
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = rad(g, 0, 0, 0, 0, 0, k * 0.34, [0, 'rgba(90,255,200,0.32)', 1, 'rgba(90,255,200,0)']); circ(g, 0, 0, k * 0.34); g.fill();
        g.restore();
        for (const [x, y, r] of [[-0.06, 0.02, 0.07], [0.06, -0.03, 0.055], [0.02, 0.08, 0.04]]) {
          ell(g, x * k, y * k, r * k, r * k * 0.8); g.fillStyle = '#7ef0d0'; g.fill();
          circ(g, x * k - r * k * 0.3, y * k - r * k * 0.25, r * k * 0.25); g.fillStyle = '#e6fff8'; g.fill();
        }
      } else if (kind === 1) {
        for (let i = 0; i < 4; i++) { ell(g, (R() - 0.5) * k * 0.3, (R() - 0.5) * k * 0.3, k * (0.03 + R() * 0.03), k * (0.025 + R() * 0.02), R() * 3); g.fillStyle = '#58626a'; g.fill(); }
      } else {
        g.fillStyle = 'rgba(40,70,110,0.45)'; ell(g, 0, 0, k * 0.24, k * 0.14); g.fill();
        g.fillStyle = 'rgba(160,200,255,0.18)'; ell(g, -k * 0.06, -k * 0.03, k * 0.1, k * 0.03); g.fill();
      }
    } else if (floor === 'planks') {              // grenier : moutons de poussière, vieille clé, clou
      if (kind === 0) { g.fillStyle = 'rgba(170,165,160,0.5)'; for (let i = 0; i < 9; i++) { circ(g, (R() - 0.5) * k * 0.2, (R() - 0.5) * k * 0.14, k * (0.03 + R() * 0.03)); g.fill(); } }
      else if (kind === 1) {
        g.strokeStyle = '#c9a24a'; g.lineWidth = k * 0.025; circ(g, -k * 0.1, 0, k * 0.05); g.stroke();
        g.beginPath(); g.moveTo(-k * 0.05, 0); g.lineTo(k * 0.16, 0); g.moveTo(k * 0.1, 0); g.lineTo(k * 0.1, k * 0.04); g.moveTo(k * 0.15, 0); g.lineTo(k * 0.15, k * 0.05); g.stroke();
      } else {
        g.strokeStyle = '#8a95a0'; g.lineWidth = k * 0.02; g.beginPath(); g.moveTo(-k * 0.1, -k * 0.03); g.lineTo(k * 0.1, k * 0.03); g.stroke();
        circ(g, -k * 0.1, -k * 0.03, k * 0.025); g.fillStyle = '#b8c2cc'; g.fill();
      }
    } else if (floor === 'carpet') {              // bibliothèque : feuille, crayon, tache d'encre
      if (kind === 0) {
        rrect(g, -k * 0.14, -k * 0.18, k * 0.28, k * 0.36, k * 0.02); g.fillStyle = '#ece4d2'; g.fill();
        g.strokeStyle = 'rgba(80,70,90,0.45)'; g.lineWidth = k * 0.012; g.beginPath();
        for (let i = 0; i < 5; i++) { g.moveTo(-k * 0.1, -k * 0.11 + i * k * 0.055); g.lineTo(k * 0.1, -k * 0.11 + i * k * 0.055); }
        g.stroke();
      } else if (kind === 1) {
        g.strokeStyle = '#3f6fbf'; g.lineWidth = k * 0.035; g.beginPath(); g.moveTo(-k * 0.16, 0); g.lineTo(k * 0.12, 0); g.stroke();
        g.fillStyle = '#f0c8a0'; g.beginPath(); g.moveTo(k * 0.12, -k * 0.018); g.lineTo(k * 0.19, 0); g.lineTo(k * 0.12, k * 0.018); g.fill();
      } else {
        g.fillStyle = 'rgba(10,10,30,0.55)'; circ(g, 0, 0, k * 0.07); g.fill();
        for (let i = 0; i < 5; i++) { circ(g, Math.cos(i * 1.3) * k * 0.1, Math.sin(i * 1.3) * k * 0.08, k * 0.02); g.fill(); }
      }
    } else {                                      // jardin : feuilles mortes, escargot, galets
      if (kind === 0) {
        for (let i = 0; i < 3; i++) {
          g.save(); g.rotate(i * 2.1); g.translate(k * 0.06, 0);
          ell(g, 0, 0, k * 0.07, k * 0.035); g.fillStyle = ['#d9682a', '#c9432a', '#e0a030'][i]; g.fill();
          g.strokeStyle = 'rgba(80,30,10,0.6)'; g.lineWidth = k * 0.01; g.beginPath(); g.moveTo(-k * 0.06, 0); g.lineTo(k * 0.06, 0); g.stroke();
          g.restore();
        }
      } else if (kind === 1) {
        ell(g, -k * 0.04, k * 0.03, k * 0.12, k * 0.035); g.fillStyle = '#b8c9a8'; g.fill();
        circ(g, 0, -k * 0.02, k * 0.07); g.fillStyle = '#c98a4a'; g.fill();
        g.strokeStyle = '#7a4a1a'; g.lineWidth = k * 0.015; g.beginPath();
        for (let a = 0; a < 9; a += 0.3) { const r = k * 0.06 * (1 - a / 10); g.lineTo(Math.cos(a) * r, -k * 0.02 + Math.sin(a) * r); }
        g.stroke();
        g.strokeStyle = '#b8c9a8'; g.beginPath(); g.moveTo(-k * 0.13, k * 0.02); g.lineTo(-k * 0.17, -k * 0.03); g.stroke();
      } else {
        for (let i = 0; i < 3; i++) {
          ell(g, (i - 1) * k * 0.09, (i % 2) * k * 0.04, k * 0.05, k * 0.035, i); g.fillStyle = '#8a8f8a'; g.fill();
          g.fillStyle = 'rgba(255,255,255,0.15)'; ell(g, (i - 1) * k * 0.09 - k * 0.01, (i % 2) * k * 0.04 - k * 0.01, k * 0.025, k * 0.012, i); g.fill();
        }
      }
    }
  }
  function paintDecor(g, th, M, X, Y, cs, R) {
    const spots = [];
    for (let k = 0; k < 60 && spots.length < 6; k++) {
      const c = (R() * COLS) | 0, r = (R() * 8) | 0;
      if (M.X[r][c] || (c === 4 && (r === 0 || r === 8)) || spots.some((q) => Math.abs(q[0] - c) + Math.abs(q[1] - r) < 3)) continue;
      spots.push([c, r]);
    }
    for (const [c, r] of spots) {
      const kind = (R() * 3) | 0, ox = (R() - 0.5) * 0.36, oy = (R() - 0.5) * 0.36, rot = R() * TAU, seed = (R() * 1e9) | 0;
      for (const [cc, rr, ro] of [[c + ox, r + oy, rot], [COLS - 1 - c - ox, ROWS - 1 - r - oy, rot + Math.PI]]) {
        g.save(); g.translate(X + (cc + 0.5) * cs, Y + (rr + 0.5) * cs); g.rotate(ro); g.globalAlpha = 0.9;
        decorItem(g, th.floor, kind, cs, mulberry32(seed));
        g.restore();
      }
    }
  }

  // ---------------------------------------------------------------- murs
  function wallSegs(M) {
    // murs (et trous) fusionnés en longs segments, en coordonnées de coins (i, j)
    const segs = [];
    for (let j = 0; j <= ROWS; j++) {
      let st = -1;
      for (let c = 0; c <= COLS; c++) {
        const t = c < COLS ? M.H[j][c] : OPEN;
        const inside = c < COLS && j > 0 && j < ROWS && M.X[j - 1][c] && M.X[j][c];
        if ((t === WALL || t === HOLE) && !inside) { if (st < 0) st = c; } else if (st >= 0) { segs.push([st, j, c, j]); st = -1; }
      }
    }
    for (let i = 0; i <= COLS; i++) {
      let st = -1;
      for (let r = 0; r <= ROWS; r++) {
        const t = r < ROWS ? M.V[r][i] : OPEN;
        const inside = r < ROWS && i > 0 && i < COLS && M.X[r][i - 1] && M.X[r][i];
        if ((t === WALL || t === HOLE || t === TUNNEL) && !inside) { if (st < 0) st = r; } else if (st >= 0) { segs.push([i, st, i, r]); st = -1; }
      }
    }
    return segs;
  }
  function paintWalls(g, th, segs, X, Y, cs, R, haloOnly) {
    const wt = cs * th.wt, W = th.wall;
    const P = segs.map((s) => [X + s[0] * cs, Y + s[1] * cs, X + s[2] * cs, Y + s[3] * cs]);
    const path = (dx, dy) => { g.beginPath(); for (const s of P) { g.moveTo(s[0] + dx, s[1] + dy); g.lineTo(s[2] + dx, s[3] + dy); } };
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (haloOnly) {
      g.save(); g.shadowColor = W.neon; g.shadowBlur = cs * 0.6; g.strokeStyle = hexA(W.neon, 0.9); g.lineWidth = wt * 1.3; path(0, 0); g.stroke(); g.restore();
      g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.lineWidth = wt * 0.9; path(0, 0); g.stroke(); g.globalCompositeOperation = 'source-over';
      return;
    }
    // 1. ombre douce au sol (occlusion)
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = cs * 0.55;
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = wt * 1.3; path(0, 0); g.stroke();
    g.restore();
    // 2. halo néon
    g.save();
    g.shadowColor = W.neon; g.shadowBlur = cs * 0.42;
    g.strokeStyle = hexA(W.neon, 0.95); g.lineWidth = wt * 1.1; path(0, 0); g.stroke();
    g.restore();
    // 3. bord sombre + corps
    g.strokeStyle = W.dark; g.lineWidth = wt * 1.02; path(0, 0); g.stroke();
    if (th.style === 'hedge') {
      // haies : feuillage en touffes
      const cols = ['#1d5427', '#256a30', W.mid, '#3c9442', W.top];
      for (let pass = 0; pass < 2; pass++) {
        for (const s of P) {
          const len = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.max(2, Math.ceil(len / (cs * 0.07)));
          const ux = (s[2] - s[0]) / (len || 1), uy = (s[3] - s[1]) / (len || 1);
          for (let k = 0; k <= n; k++) {
            const f = k / n, px = s[0] + (s[2] - s[0]) * f, py = s[1] + (s[3] - s[1]) * f;
            const off = (R() - 0.5) * wt * 0.5, r = wt * (pass ? 0.22 + R() * 0.12 : 0.36 + R() * 0.14);
            circ(g, px - uy * off, py + ux * off - (pass ? wt * 0.1 : 0), r);
            g.fillStyle = pass ? cols[3 + ((R() * 2) | 0)] : cols[(R() * 3) | 0]; g.fill();
          }
        }
      }
      g.fillStyle = hexA(W.spec, 0.55);
      for (const s of P) {
        const len = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.ceil(len / (cs * 0.2));
        for (let k = 0; k <= n; k++) { const f = (k + R() * 0.5) / (n + 0.5); circ(g, s[0] + (s[2] - s[0]) * f + (R() - 0.5) * wt * 0.4, s[1] + (s[3] - s[1]) * f - wt * 0.2, Math.max(0.7, wt * 0.07)); g.fill(); }
      }
      return;
    }
    g.strokeStyle = W.mid; g.lineWidth = wt * 0.82; path(0, 0); g.stroke();
    if (th.style === 'books') {
      // étagères : dessus des livres de toutes les couleurs
      const bc = ['#c94f4f', '#d99a3a', '#3f7fbf', '#4f9a5a', '#8a5ab8', '#d9d0b8', '#2f5f8f', '#b8433a', '#e0b84a'];
      for (const s of P) {
        const len = Math.hypot(s[2] - s[0], s[3] - s[1]), ux = (s[2] - s[0]) / (len || 1), uy = (s[3] - s[1]) / (len || 1);
        let d = -wt * 0.25;
        while (d < len + wt * 0.25) {
          const bw = cs * (0.045 + R() * 0.05), bl = wt * (0.42 + R() * 0.2);
          const px = s[0] + ux * (d + bw / 2), py = s[1] + uy * (d + bw / 2);
          g.save(); g.translate(px, py); g.rotate(Math.atan2(uy, ux));
          g.fillStyle = bc[(R() * bc.length) | 0]; g.fillRect(-bw / 2 + 0.4, -bl / 2, bw - 0.8, bl);
          g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-bw / 2 + 0.4, -bl / 2, bw - 0.8, bl * 0.25);
          g.restore();
          d += bw;
        }
      }
      g.strokeStyle = hexA(W.spec, 0.35); g.lineWidth = Math.max(0.8, wt * 0.08); path(0, -wt * 0.36); g.stroke();
      return;
    }
    // biseau éclairé + reflet
    g.strokeStyle = W.top; g.lineWidth = wt * 0.5; path(0, -wt * 0.1); g.stroke();
    if (th.style === 'stone') {
      g.strokeStyle = 'rgba(20,24,27,0.55)'; g.lineWidth = Math.max(0.8, cs * 0.02);
      g.beginPath();
      for (const s of P) {
        const len = Math.hypot(s[2] - s[0], s[3] - s[1]), ux = (s[2] - s[0]) / (len || 1), uy = (s[3] - s[1]) / (len || 1);
        for (let d = cs * 0.18 + R() * cs * 0.1; d < len; d += cs * (0.26 + R() * 0.1)) {
          const px = s[0] + ux * d, py = s[1] + uy * d;
          g.moveTo(px - uy * wt * 0.4, py + ux * wt * 0.4); g.lineTo(px + uy * wt * 0.4, py - ux * wt * 0.4);
        }
      }
      g.stroke();
    } else if (th.style === 'wood' || th.style === 'beam') {
      g.strokeStyle = 'rgba(40,20,6,0.35)'; g.lineWidth = Math.max(0.6, cs * 0.012);
      g.beginPath();
      for (const s of P) {
        const len = Math.hypot(s[2] - s[0], s[3] - s[1]), ux = (s[2] - s[0]) / (len || 1), uy = (s[3] - s[1]) / (len || 1);
        for (const o of [-0.22, 0.12]) {
          g.moveTo(s[0] - uy * wt * o, s[1] + ux * wt * o);
          g.lineTo(s[2] - uy * wt * o, s[3] + ux * wt * o);
        }
      }
      g.stroke();
      if (th.style === 'beam') {
        g.fillStyle = 'rgba(220,200,170,0.45)';
        for (const s of P) {
          const len = Math.hypot(s[2] - s[0], s[3] - s[1]), ux = (s[2] - s[0]) / (len || 1), uy = (s[3] - s[1]) / (len || 1);
          for (let d = cs * 0.5; d < len; d += cs) { circ(g, s[0] + ux * d, s[1] + uy * d - wt * 0.05, Math.max(0.8, cs * 0.025)); g.fill(); }
        }
      }
    }
    g.strokeStyle = hexA(W.spec, 0.6); g.lineWidth = Math.max(0.8, wt * 0.12); path(0, -wt * 0.2); g.stroke();
  }
  // trou de souris : une petite porte cintrée qui traverse le mur
  function paintArch(g, x, y, vert, cs, th, big) {
    const wt = cs * th.wt;
    g.save(); g.translate(x, y); if (!vert) g.rotate(Math.PI / 2);
    // dans ce repère le mur suit l'axe y, l'ouverture traverse selon x
    const ow = cs * (big ? 0.42 : 0.34), od = wt + cs * (big ? 0.34 : 0.3);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rad(g, 0, 0, 0, 0, 0, cs * 0.55, [0, 'rgba(255,190,90,0.3)', 1, 'rgba(255,190,90,0)']);
    g.fillRect(-cs * 0.6, -cs * 0.6, cs * 1.2, cs * 1.2);
    g.globalCompositeOperation = 'source-over';
    // le passage sombre qui file sous le mur
    rrect(g, -od / 2, -ow / 2, od, ow, ow * 0.5);
    g.fillStyle = lin(g, -od / 2, 0, od / 2, 0, [0, '#4a2c12', 0.16, '#100804', 0.5, '#040201', 0.84, '#100804', 1, '#4a2c12']); g.fill();
    g.lineWidth = Math.max(1.4, cs * 0.05); g.strokeStyle = '#f0bd4f'; g.stroke();
    // le mur passe par-dessus (petit pont) : on ne voit que les deux bouches
    const bw = wt * 0.86;
    rrect(g, -bw / 2, -ow / 2 - cs * 0.03, bw, ow + cs * 0.06, bw * 0.25);
    g.fillStyle = th.wall.mid; g.fill();
    g.lineWidth = Math.max(1, cs * 0.025); g.strokeStyle = th.wall.dark; g.stroke();
    g.fillStyle = hexA(th.wall.top, 0.9); g.fillRect(-bw * 0.22, -ow / 2 - cs * 0.02, bw * 0.44, ow + cs * 0.04);
    // reflets dorés au bord des deux bouches
    g.strokeStyle = 'rgba(255,236,170,0.75)'; g.lineWidth = Math.max(0.8, cs * 0.02); g.lineCap = 'round';
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * (od / 2 - ow * 0.32), 0, ow * 0.22, ow * 0.36, 0, sd > 0 ? -1.2 : Math.PI - 1.2, sd > 0 ? 1.2 : Math.PI + 1.2); g.stroke(); }
    g.restore();
  }
  // ---------------------------------------------------------------- meubles (bloc de 2 cases au bout de la ligne du milieu)
  function paintFurniture(g, th, x, y, w, h, cs, R) {
    const k = cs, pad = cs * th.wt * 0.6;
    x += pad; y += pad; w -= pad * 2; h -= pad * 2;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = k * 0.25; g.shadowOffsetY = k * 0.05;
    rrect(g, x, y, w, h, k * 0.12); g.fillStyle = '#000'; g.fill();
    g.restore();
    const t = th.furn;
    if (t === 'stove') {
      rrect(g, x, y, w, h, k * 0.12); g.fillStyle = lin(g, x, y, x, y + h, [0, '#5b6670', 1, '#2c343b']); g.fill();
      rrect(g, x + k * 0.05, y + k * 0.05, w - k * 0.1, h - k * 0.1, k * 0.1); g.fillStyle = '#14191d'; g.fill();
      for (const fx of [0.27, 0.73]) {
        const cx = x + w * fx, cy = y + h / 2, r = Math.min(h * 0.32, k * 0.3);
        circ(g, cx, cy, r); g.strokeStyle = '#4a545c'; g.lineWidth = k * 0.05; g.stroke();
        circ(g, cx, cy, r * 0.55); g.stroke();
        g.save(); g.globalCompositeOperation = 'lighter';
        g.fillStyle = rad(g, cx, cy, 0, cx, cy, r * 1.3, [0, 'rgba(90,160,255,0.35)', 1, 'rgba(90,160,255,0)']); circ(g, cx, cy, r * 1.3); g.fill();
        g.restore();
      }
    } else if (t === 'sofa') {
      rrect(g, x, y, w, h, k * 0.18); g.fillStyle = '#4a2a63'; g.fill();
      rrect(g, x + k * 0.04, y + k * 0.04, w - k * 0.08, h * 0.3, k * 0.12); g.fillStyle = '#6a3c8a'; g.fill();
      for (const fx of [0, 0.5]) { rrect(g, x + w * fx + k * 0.06, y + h * 0.36, w * 0.5 - k * 0.12, h * 0.56, k * 0.12); g.fillStyle = lin(g, 0, y + h * 0.36, 0, y + h, [0, '#8a54b0', 1, '#5e3480']); g.fill(); }
      g.fillStyle = '#d9ab47'; circ(g, x + w * 0.25, y + h * 0.62, k * 0.07); g.fill();
    } else if (t === 'barrels') {
      for (const fx of [0.26, 0.74]) {
        const cx = x + w * fx, cy = y + h / 2, r = Math.min(h * 0.46, w * 0.24);
        circ(g, cx, cy, r); g.fillStyle = rad(g, cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r, [0, '#a06a3a', 1, '#5a3618']); g.fill();
        g.strokeStyle = '#2a2d30'; g.lineWidth = k * 0.06; circ(g, cx, cy, r * 0.92); g.stroke(); circ(g, cx, cy, r * 0.6); g.stroke();
        g.strokeStyle = 'rgba(40,20,6,0.5)'; g.lineWidth = k * 0.015;
        g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(cx + i * r * 0.28, cy - r * 0.8); g.lineTo(cx + i * r * 0.28, cy + r * 0.8); } g.stroke();
      }
    } else if (t === 'trunk') {
      rrect(g, x, y, w, h, k * 0.1); g.fillStyle = lin(g, x, y, x, y + h, [0, '#8a5a32', 1, '#4e2f16']); g.fill();
      g.fillStyle = '#c9a24a';
      for (const fx of [0.18, 0.82]) g.fillRect(x + w * fx - k * 0.05, y, k * 0.1, h);
      rrect(g, x + w / 2 - k * 0.1, y + h / 2 - k * 0.12, k * 0.2, k * 0.24, k * 0.04); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = k * 0.02; g.strokeRect(x + k * 0.05, y + k * 0.05, w - k * 0.1, h - k * 0.1);
    } else if (t === 'desk') {
      rrect(g, x, y, w, h, k * 0.08); g.fillStyle = lin(g, x, y, x + w, y + h, [0, '#6b3f22', 1, '#3e2210']); g.fill();
      g.save(); g.translate(x + w * 0.38, y + h / 2); g.rotate(-0.15);
      g.fillStyle = '#efe6d2'; g.fillRect(-k * 0.34, -k * 0.2, k * 0.33, k * 0.4); g.fillRect(k * 0.01, -k * 0.2, k * 0.33, k * 0.4);
      g.strokeStyle = 'rgba(80,60,40,0.5)'; g.lineWidth = k * 0.012; g.beginPath();
      for (let i = 0; i < 5; i++) { g.moveTo(-k * 0.3, -k * 0.13 + i * k * 0.07); g.lineTo(-k * 0.05, -k * 0.13 + i * k * 0.07); g.moveTo(k * 0.05, -k * 0.13 + i * k * 0.07); g.lineTo(k * 0.3, -k * 0.13 + i * k * 0.07); }
      g.stroke(); g.restore();
      const lx = x + w * 0.82, ly = y + h / 2;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = rad(g, lx, ly, 0, lx, ly, k * 0.6, [0, 'rgba(255,200,120,0.55)', 1, 'rgba(255,200,120,0)']); circ(g, lx, ly, k * 0.6); g.fill();
      g.restore();
      circ(g, lx, ly, k * 0.16); g.fillStyle = '#2f6a4a'; g.fill(); circ(g, lx, ly, k * 0.06); g.fillStyle = '#fff3c4'; g.fill();
    } else {
      rrect(g, x, y, w, h, k * 0.08); g.fillStyle = lin(g, x, y, x, y + h, [0, '#8a5a32', 1, '#5a3a1e']); g.fill();
      rrect(g, x + k * 0.07, y + k * 0.07, w - k * 0.14, h - k * 0.14, k * 0.06); g.fillStyle = '#3a2614'; g.fill();
      const fc = ['#ff6b8a', '#ffd34d', '#ffffff', '#c38bff', '#ff9a4d'];
      for (let i = 0; i < 9; i++) {
        const fx = x + k * 0.18 + ((w - k * 0.36) * (i + 0.5)) / 9, fy = y + h / 2 + (i % 2 ? -1 : 1) * h * 0.15;
        g.fillStyle = '#2f7a35'; circ(g, fx, fy, k * 0.09); g.fill();
        g.fillStyle = fc[i % fc.length];
        for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU + i; circ(g, fx + Math.cos(a) * k * 0.05, fy + Math.sin(a) * k * 0.05, k * 0.035); g.fill(); }
        g.fillStyle = '#ffe066'; circ(g, fx, fy, k * 0.025); g.fill();
      }
    }
  }
  // ---------------------------------------------------------------- panier du chat / maison de la souris
  function paintBasket(g, cx, cy, cs, col) {
    const rx = cs * 0.44, ry = cs * 0.4;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = cs * 0.2; g.shadowOffsetY = cs * 0.05;
    ell(g, cx, cy, rx, ry); g.fillStyle = '#8a5a2c'; g.fill();
    g.restore();
    ell(g, cx, cy, rx, ry); g.fillStyle = rad(g, cx - rx * 0.3, cy - ry * 0.3, 1, cx, cy, rx, [0, '#c08a4c', 1, '#7a4c22']); g.fill();
    g.strokeStyle = 'rgba(60,30,10,0.55)'; g.lineWidth = Math.max(0.8, cs * 0.02);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * 0.88, cy + Math.sin(a) * ry * 0.88, cs * 0.05, cs * 0.025, a + 0.6, 0, TAU); g.stroke(); }
    ell(g, cx, cy, rx * 0.72, ry * 0.7); g.fillStyle = lin(g, cx, cy - ry, cx, cy + ry, [0, shade(col, 0.25), 1, shade(col, -0.35)]); g.fill();
    ell(g, cx - rx * 0.15, cy - ry * 0.2, rx * 0.35, ry * 0.18); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
    // petite arête de poisson
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(0.8, cs * 0.02); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - rx * 0.3, cy + ry * 0.25); g.lineTo(cx + rx * 0.25, cy + ry * 0.25);
    for (let i = 0; i < 3; i++) { const px = cx - rx * 0.15 + i * rx * 0.12; g.moveTo(px, cy + ry * 0.15); g.lineTo(px + rx * 0.05, cy + ry * 0.25); g.lineTo(px, cy + ry * 0.35); }
    g.stroke();
  }
  function paintMouseHome(g, cx, cy, cs, col, up) {
    // une porte cintrée dans le mur du fond (côté du joueur) + un paillasson à sa couleur
    const s = up ? -1 : 1;                      // up : le mur du fond est en haut
    const wy = cy - s * cs * 0.5;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = rad(g, cx, wy, 0, cx, wy, cs * 0.9, [0, 'rgba(255,190,100,0.35)', 1, 'rgba(255,190,100,0)']);
    g.fillRect(cx - cs, wy - cs, cs * 2, cs * 2);
    g.globalCompositeOperation = 'source-over';
    g.beginPath();
    g.ellipse(cx, wy, cs * 0.26, cs * 0.3, 0, up ? 0 : Math.PI, up ? Math.PI : TAU);
    g.closePath();
    g.fillStyle = lin(g, cx, wy, cx, wy + s * cs * 0.3, [0, '#140904', 1, '#3a200c']); g.fill();
    g.lineWidth = Math.max(1.2, cs * 0.05); g.strokeStyle = '#e9b64a'; g.stroke();
    rrect(g, cx - cs * 0.3, cy - cs * 0.12 + s * cs * 0.08, cs * 0.6, cs * 0.24, cs * 0.08);
    g.fillStyle = lin(g, cx - cs * 0.3, cy, cx + cs * 0.3, cy, [0, shade(col, -0.35), 0.5, shade(col, -0.1), 1, shade(col, -0.35)]); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = Math.max(0.8, cs * 0.015);
    rrect(g, cx - cs * 0.26, cy - cs * 0.08 + s * cs * 0.08, cs * 0.52, cs * 0.16, cs * 0.06); g.stroke();
    g.restore();
  }

  // ===========================================================================
  // Personnages et objets (partagés par le jeu et l'aperçu)
  // ===========================================================================
  function paintCheese(c, s) {
    const R = s * 0.5;
    c.save();
    c.rotate(-0.35);
    const ox = -R * 0.72, rr = R * 1.5, a0 = -0.56, a1 = 0.56;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.moveTo(ox + R * 0.06, R * 0.1); c.arc(ox + R * 0.06, R * 0.1, rr, a0, a1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(ox, 0); c.arc(ox, 0, rr, a0, a1); c.closePath();
    c.fillStyle = lin(c, -R, -R, R, R, [0, '#fff6b8', 0.45, '#ffd84d', 1, '#f0a425']); c.fill();
    c.lineJoin = 'round'; c.lineWidth = Math.max(1, R * 0.1); c.strokeStyle = '#7a3f08'; c.stroke();
    c.lineWidth = R * 0.15; c.strokeStyle = 'rgba(232,140,28,0.9)';
    c.beginPath(); c.arc(ox, 0, rr * 0.93, a0 + 0.06, a1 - 0.06); c.stroke();
    const holes = [[0.12, -0.2, 0.15], [0.4, 0.2, 0.12], [-0.12, 0.1, 0.09], [0.52, -0.16, 0.07]];
    for (const [hx, hy, hr] of holes) {
      c.fillStyle = '#e39a26'; ell(c, hx * R, hy * R, hr * R, hr * R * 0.82); c.fill();
      c.fillStyle = 'rgba(122,63,8,0.5)'; ell(c, hx * R + hr * R * 0.18, hy * R + hr * R * 0.14, hr * R * 0.66, hr * R * 0.48); c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = R * 0.08; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-R * 0.4, -R * 0.08); c.lineTo(R * 0.2, -R * 0.4); c.stroke();
    c.restore();
  }
  // meule entière vue de trois quarts (dessus ovale + flanc de croûte) avec son étiquette rouge
  function paintBigCheese(c, s) {
    const R = s * 0.46, ry = R * 0.62, hh = R * 0.42, top = -hh * 0.55;
    c.fillStyle = 'rgba(0,0,0,0.4)'; ell(c, R * 0.05, top + hh + ry * 0.35, R * 1.04, ry * 0.75); c.fill();
    // flanc (croûte)
    c.beginPath(); c.moveTo(-R, top); c.lineTo(-R, top + hh); c.ellipse(0, top + hh, R, ry, 0, Math.PI, 0, true); c.lineTo(R, top); c.closePath();
    c.fillStyle = lin(c, -R, 0, R, 0, [0, '#b8650f', 0.3, '#e8951f', 0.55, '#f6b23a', 1, '#a95a0c']); c.fill();
    c.lineJoin = 'round'; c.lineWidth = Math.max(1.2, R * 0.07); c.strokeStyle = '#5a2c04'; c.stroke();
    c.strokeStyle = 'rgba(255,220,140,0.35)'; c.lineWidth = R * 0.05;
    c.beginPath(); c.ellipse(0, top + hh * 0.55, R * 0.99, ry, 0, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
    // dessus
    ell(c, 0, top, R, ry);
    c.fillStyle = rad(c, -R * 0.35, top - ry * 0.4, R * 0.05, 0, top, R * 1.05, [0, '#fff6c2', 0.55, '#ffd84d', 1, '#f0a425']); c.fill();
    c.lineWidth = Math.max(1.2, R * 0.07); c.strokeStyle = '#5a2c04'; c.stroke();
    ell(c, 0, top, R * 0.9, ry * 0.88); c.lineWidth = R * 0.08; c.strokeStyle = 'rgba(232,140,28,0.75)'; c.stroke();
    const H = [[-0.48, -0.2, 0.13], [0.42, -0.28, 0.1], [0.5, 0.3, 0.12], [-0.3, 0.42, 0.1], [0.05, 0.62, 0.07]];
    for (const [x, y, r] of H) {
      c.fillStyle = '#e39a26'; ell(c, x * R, top + y * ry, r * R, r * R * 0.62); c.fill();
      c.fillStyle = 'rgba(120,60,8,0.45)'; ell(c, x * R + r * R * 0.18, top + y * ry + r * R * 0.12, r * R * 0.7, r * R * 0.4); c.fill();
    }
    // étiquette ronde au centre
    ell(c, 0, top, R * 0.32, ry * 0.32); c.fillStyle = '#d6283e'; c.fill();
    c.lineWidth = Math.max(1, R * 0.04); c.strokeStyle = '#ffe9a8'; c.stroke();
    starPath(c, 0, top, R * 0.16, 5, 0.45, 0); c.fillStyle = '#ffe680'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineCap = 'round'; c.lineWidth = R * 0.07;
    c.beginPath(); c.ellipse(0, top, R * 0.72, ry * 0.68, 0, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  }
  // moustaches (trois de chaque côté), centrées sur la tête de hauteur hh et largeur hw
  function whiskers(c, hw, hh, t, lw) {
    c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? 'rgba(255,255,255,0.95)' : 'rgba(8,10,14,0.6)';
      c.lineWidth = pass ? lw : lw * 2.4;
      c.beginPath();
      for (let sd = -1; sd <= 1; sd += 2) for (let k = -1; k <= 1; k++) {
        const x0 = sd * hw * 0.2, y0 = hh * (0.13 + k * 0.04);
        const a = k * 0.22 + Math.sin(t * 6 + k * 1.3 + sd) * 0.05;
        const len = hw * (0.52 - Math.abs(k) * 0.05);
        c.moveTo(x0, y0);
        c.quadraticCurveTo(x0 + sd * len * 0.55, y0 + Math.sin(a) * len * 0.45 - hh * 0.025, x0 + sd * len * Math.cos(a), y0 + Math.sin(a) * len);
      }
      c.stroke();
    }
  }
  function earsCat(c, hw, hh, outline, ow, rotL, rotR, flat) {
    for (let sd = -1; sd <= 1; sd += 2) {
      c.save();
      c.translate(sd * hw * 0.3, -hh * 0.36);
      c.rotate(sd * (0.42 + flat * 0.9) + (sd < 0 ? rotL : rotR));
      const bw = hw * 0.5, ht = hh * 0.4;
      c.beginPath(); c.moveTo(-bw / 2, ht * 0.18); c.quadraticCurveTo(-bw * 0.24, -ht * 0.55, 0, -ht); c.quadraticCurveTo(bw * 0.24, -ht * 0.55, bw / 2, ht * 0.18); c.closePath();
      c.lineJoin = 'round';
      c.lineWidth = ow * 2 + 2.6; c.strokeStyle = 'rgba(6,10,14,0.92)'; c.stroke();
      c.lineWidth = ow * 2; c.strokeStyle = outline; c.stroke();
      c.fillStyle = lin(c, 0, -ht, 0, ht * 0.18, [0, '#ffc788', 1, '#d9853f']); c.fill();
      c.beginPath(); c.moveTo(-bw * 0.26, ht * 0.06); c.quadraticCurveTo(-bw * 0.1, -ht * 0.42, 0, -ht * 0.7); c.quadraticCurveTo(bw * 0.1, -ht * 0.42, bw * 0.26, ht * 0.06); c.closePath();
      c.fillStyle = lin(c, 0, -ht * 0.7, 0, 0, [0, '#ffd0d8', 1, '#ff8fa6']); c.fill();
      c.restore();
    }
  }
  function earsMouse(c, hw, hh, outline, ow, wob) {
    for (let sd = -1; sd <= 1; sd += 2) {
      c.save();
      c.translate(sd * hw * 0.42, -hh * 0.3);
      c.rotate(sd * (0.18 + wob));
      const r = hw * 0.31;
      circ(c, 0, -r * 0.18, r);
      c.lineWidth = ow * 2 + 2.6; c.strokeStyle = 'rgba(6,10,14,0.92)'; c.stroke();
      c.lineWidth = ow * 2; c.strokeStyle = outline; c.stroke();
      c.fillStyle = rad(c, -r * 0.3, -r * 0.5, r * 0.1, 0, -r * 0.18, r, [0, '#ece6e0', 1, '#a39b94']); c.fill();
      circ(c, -sd * r * 0.08, -r * 0.1, r * 0.62);
      c.fillStyle = rad(c, 0, -r * 0.2, r * 0.1, 0, -r * 0.1, r * 0.62, [0, '#ffc9d4', 1, '#ee7894']); c.fill();
      c.restore();
    }
  }
  // tête dessinée (sans photo) : aperçu et petites icônes
  function cartoonHead(c, kind, s, outline, mood, t) {
    const cat = kind === 'cat', r = s * 0.4, ow = Math.max(1, s * 0.045);
    const fur = cat ? ['#ffcf98', '#f0a35e', '#bf6c30'] : ['#f4f0ec', '#cfc8c2', '#948b84'];
    if (cat) earsCat(c, r * 2.1, r * 2.1, outline, ow, 0, 0, mood === 'scared' ? 1 : 0);
    else earsMouse(c, r * 2.05, r * 2.05, outline, ow, 0);
    ell(c, 0, 0, r * (cat ? 1.1 : 1.02), r);
    c.lineWidth = ow * 2 + 2.4; c.strokeStyle = 'rgba(6,10,14,0.92)'; c.stroke();
    c.lineWidth = ow * 2; c.strokeStyle = outline; c.stroke();
    c.fillStyle = rad(c, -r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1, [0, fur[0], 0.6, fur[1], 1, fur[2]]); c.fill();
    if (cat) {
      c.strokeStyle = 'rgba(160,80,26,0.75)'; c.lineWidth = r * 0.09; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -r * 0.95); c.lineTo(0, -r * 0.66); c.moveTo(-r * 0.26, -r * 0.9); c.lineTo(-r * 0.2, -r * 0.66); c.moveTo(r * 0.26, -r * 0.9); c.lineTo(r * 0.2, -r * 0.66); c.stroke();
    }
    ell(c, 0, r * 0.36, r * 0.5, r * 0.34); c.fillStyle = cat ? '#fff1e2' : '#ffffff'; c.fill();
    for (let sd = -1; sd <= 1; sd += 2) {
      if (mood === 'sad') {
        c.strokeStyle = '#1b1b24'; c.lineWidth = r * 0.09; c.lineCap = 'round';
        c.beginPath(); c.arc(sd * r * 0.36, r * 0.02, r * 0.13, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.fillStyle = '#8fd0ff'; ell(c, sd * r * 0.4, r * 0.2, r * 0.06, r * 0.1); c.fill();
        continue;
      }
      ell(c, sd * r * 0.36, -r * 0.08, r * 0.17, r * 0.21); c.fillStyle = '#ffffff'; c.fill();
      ell(c, sd * r * 0.37, -r * 0.05, r * (cat ? 0.08 : 0.11), r * 0.15); c.fillStyle = cat ? '#2f7a3f' : '#1b1b24'; c.fill();
      if (cat) { ell(c, sd * r * 0.37, -r * 0.05, r * 0.03, r * 0.13); c.fillStyle = '#081208'; c.fill(); }
      circ(c, sd * r * 0.32, -r * 0.13, r * 0.045); c.fillStyle = '#ffffff'; c.fill();
    }
    c.fillStyle = '#ff7a95';
    if (cat) { c.beginPath(); c.moveTo(-r * 0.09, r * 0.2); c.lineTo(r * 0.09, r * 0.2); c.lineTo(0, r * 0.31); c.closePath(); c.fill(); }
    else { ell(c, 0, r * 0.24, r * 0.11, r * 0.08); c.fill(); }
    c.strokeStyle = '#5a2a2a'; c.lineWidth = r * 0.06; c.lineCap = 'round';
    c.beginPath();
    if (mood === 'sad') { c.moveTo(-r * 0.18, r * 0.48); c.quadraticCurveTo(0, r * 0.36, r * 0.18, r * 0.48); }
    else { c.moveTo(0, r * 0.3); c.quadraticCurveTo(-r * 0.12, r * 0.46, -r * 0.24, r * 0.38); c.moveTo(0, r * 0.3); c.quadraticCurveTo(r * 0.12, r * 0.46, r * 0.24, r * 0.38); }
    c.stroke();
    c.save(); c.translate(0, r * 0.12); whiskers(c, r * 2, r * 2, t || 0, Math.max(0.8, r * 0.05)); c.restore();
  }
  // corps vu de dessus, l'avant vers +x (déjà tourné dans la direction de la course)
  function drawBody(c, cat, k, walk, moving, o) {
    const st = o.stretch || 1;
    const L = k * (cat ? 0.8 : 0.58) * st, Wd = (k * (cat ? 0.48 : 0.34)) / Math.sqrt(st);
    const amp = moving ? 1 : 0.12, sw = Math.sin(walk);
    const pr = k * (cat ? 0.09 : 0.062);
    const paws = [[0.32, -1, sw], [0.32, 1, -sw], [-0.3, -1, -sw], [-0.3, 1, sw]];
    c.lineWidth = Math.max(1, k * 0.025);
    for (let i = 0; i < 4; i++) {
      const pw = paws[i], ext = o.leap ? (pw[0] > 0 ? 0.28 : -0.22) : pw[2] * 0.16 * amp;
      ell(c, L * pw[0] + L * ext, pw[1] * Wd * 0.46, pr * 1.25, pr);
      c.fillStyle = cat ? '#f6e6d4' : '#ffb8c6'; c.fill();
      c.strokeStyle = 'rgba(40,20,10,0.7)'; c.stroke();
    }
    if (o.puff) {                                 // chat apeuré : poils hérissés
      c.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * TAU, rr = i % 2 ? 1.12 : 0.96;
        const px = Math.cos(a) * (L / 2) * rr, py = Math.sin(a) * (Wd / 2) * rr;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = '#d98a45'; c.fill();
    }
    ell(c, 0, 0, L / 2, Wd / 2);
    c.fillStyle = cat
      ? rad(c, -L * 0.1, -Wd * 0.18, Wd * 0.05, 0, 0, L * 0.56, [0, '#ffd09a', 0.5, '#f0a35e', 1, '#b4642b'])
      : rad(c, -L * 0.1, -Wd * 0.18, Wd * 0.05, 0, 0, L * 0.56, [0, '#efeae5', 0.6, '#bcb4ad', 1, '#7f766f']);
    c.fill();
    c.lineWidth = Math.max(1, k * 0.032); c.strokeStyle = 'rgba(28,14,6,0.8)'; c.stroke();
    if (cat) {
      c.strokeStyle = 'rgba(150,70,20,0.75)'; c.lineWidth = k * 0.05; c.lineCap = 'round';
      c.beginPath();
      for (const f of [-0.3, -0.1, 0.1]) { c.moveTo(L * f, -Wd * 0.38); c.quadraticCurveTo(L * (f + 0.06), 0, L * f, Wd * 0.38); }
      c.stroke();
    } else {
      c.fillStyle = 'rgba(255,255,255,0.22)'; ell(c, -L * 0.04, -Wd * 0.13, L * 0.3, Wd * 0.15); c.fill();
    }
    if (o.cape) {                                 // cape de super-souris
      const fl = Math.sin(walk * 1.3) * 0.2;
      c.beginPath();
      c.moveTo(L * 0.22, -Wd * 0.5); c.quadraticCurveTo(-L * 0.2, -Wd * (0.95 + fl), -L * 0.78, -Wd * (0.6 - fl));
      c.lineTo(-L * 0.86, Wd * (0.6 + fl)); c.quadraticCurveTo(-L * 0.2, Wd * (0.95 - fl), L * 0.22, Wd * 0.5); c.closePath();
      c.fillStyle = lin(c, L * 0.2, 0, -L * 0.85, 0, [0, '#ff4d6d', 1, '#a3123a']); c.fill();
      c.lineWidth = Math.max(1, k * 0.025); c.strokeStyle = '#ffd34d'; c.stroke();
    }
  }
  function drawTail(c, P, n, cat, k, puff) {
    if (n < 2) return;
    const w0 = k * (cat ? (puff ? 0.2 : 0.12) : 0.045), w1 = k * (cat ? (puff ? 0.15 : 0.065) : 0.016);
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n - 1; i++) {
        const f = i / (n - 1), w = lerp(w0, w1, f);
        c.lineWidth = pass ? w : w + Math.max(1.6, k * 0.045);
        c.strokeStyle = pass ? (cat ? (i % 3 === 2 ? '#b8622a' : i === n - 2 ? '#fff0de' : '#f0a35e') : '#ffa8bb') : 'rgba(28,12,6,0.85)';
        c.beginPath(); c.moveTo(P[i * 2], P[i * 2 + 1]); c.lineTo(P[i * 2 + 2], P[i * 2 + 3]); c.stroke();
      }
    }
  }

  // ===========================================================================
  // Aperçu animé (tuile de l'accueil) : la souris file, le chat la poursuit… et se cogne au mur.
  // ===========================================================================
  const PV = { key: '', bg: null, s: 30, cheese: null };
  function pvBuild(w, h) {
    const key = w + 'x' + h;
    if (PV.key === key && PV.bg) return;
    const sc = 2, s = h / 3.3, th = THEMES[0], R = mulberry32(11);
    const cv = mkCanvas(w * sc, h * sc), g = cv.getContext('2d');
    g.scale(sc, sc);
    paintFloor(g, th, 0, 0, w, h, s, R);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = rad(g, w * 0.35, h * 0.55, 0, w * 0.35, h * 0.55, w * 0.55, [0, 'rgba(255,190,130,0.2)', 1, 'rgba(255,190,130,0)']); g.fillRect(0, 0, w, h);
    g.restore();
    const ym = h * 0.56, Y = ym - 1.5 * s, xe = (w * 0.9) / s;
    const segs = [[-1, 1, 1.6, 1], [2.6, 1, 4.2, 1], [5.2, 1, xe, 1], [-1, 2, 2.2, 2], [3.2, 2, xe, 2], [xe, 0.2, xe, 2.8],
      [1.6, -0.5, 1.6, 1], [2.6, -0.5, 2.6, 0.2], [4.2, 0.2, 4.2, 1], [2.2, 2, 2.2, 3.5], [3.2, 2.6, 3.2, 3.5]];
    paintWalls(g, th, segs, 0, Y, s, R);
    paintArch(g, xe * s, ym, true, s, th, false);
    g.fillStyle = rad(g, w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.55)']);
    g.fillRect(0, 0, w, h);
    PV.bg = cv; PV.s = s; PV.ym = ym; PV.xe = xe * s; PV.key = key;
    const cz = Math.ceil(s * 0.7 * sc), cc = mkCanvas(cz, cz), c2 = cc.getContext('2d');
    c2.translate(cz / 2, cz / 2); c2.scale(sc, sc); paintCheese(c2, s * 0.62);
    PV.cheese = cc;
  }
  function pvChar(ctx, cat, x, y, s, t, walk, col, mood, st) {
    const G = glows();
    ctx.globalAlpha = 0.5; ctx.drawImage(G.shadow, x - s * 0.55, y - s * 0.22, s * 1.1, s * 0.6); ctx.globalAlpha = 1;
    // queue ondulante
    const n = cat ? 7 : 9, P = [];
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), d = s * (cat ? 0.36 : 0.26) + f * s * (cat ? 0.5 : 0.7);
      P.push(x - d, y + Math.sin(t * 9 - i * 0.8) * s * 0.08 * f + (cat ? -f * s * 0.12 : 0));
    }
    drawTail(ctx, P, n, cat, s, false);
    ctx.save(); ctx.translate(x, y); ctx.scale(st || 1, 1 / Math.sqrt(st || 1));
    drawBody(ctx, cat, s, walk, true, { leap: (st || 1) > 1.15 });
    ctx.restore();
    ctx.save();
    ctx.translate(x + s * 0.28, y - s * 0.16 + Math.abs(Math.sin(walk)) * -s * 0.04);
    cartoonHead(ctx, cat ? 'cat' : 'mouse', s * (cat ? 0.95 : 0.82), col, mood, t);
    ctx.restore();
  }
  function preview(ctx, w, h, t) {
    try {
      pvBuild(w, h);
      const s = PV.s, ym = PV.ym, T = 5.2, u = t % T, G = glows();
      ctx.save();
      ctx.drawImage(PV.bg, 0, 0, w, h);
      // la course
      const runEnd = 3.1;
      const mxp = u < runEnd ? lerp(-s * 0.6, PV.xe - s * 0.55, ease(u / runEnd) * 0.35 + (u / runEnd) * 0.65) : PV.xe - s * 0.55 + Math.min(1, (u - runEnd) / 0.3) * s * 0.9;
      const mouseIn = u > runEnd + 0.2;
      let cxp, st = 1, bonk = 0;
      if (u < runEnd + 0.1) cxp = mxp - s * (2.7 - Math.min(1, u * 0.3));
      else if (u < runEnd + 0.35) { const k = (u - runEnd - 0.1) / 0.25; cxp = lerp(PV.xe - s * 1.9, PV.xe - s * 0.62, easeOut(k)); st = 1 + 0.45 * Math.sin(k * Math.PI); }
      else { const k = clamp((u - runEnd - 0.35) / 0.4, 0, 1); cxp = PV.xe - s * 0.62 - Math.sin(k * Math.PI) * s * 0.3 - k * s * 0.15; bonk = 1; }
      // fromages (mangés au passage)
      const cheeses = [0.26, 0.47, 0.66];
      for (let i = 0; i < 3; i++) {
        const cx = w * cheeses[i];
        if (mxp > cx - s * 0.1 && u < T - 0.3) {
          const k = (mxp - cx) / (s * 1.4);
          if (k < 1) {                             // miettes
            ctx.fillStyle = '#ffd34d';
            for (let j = 0; j < 7; j++) { const a = j * 0.9 + i, d = k * s * 0.7; ctx.globalAlpha = 1 - k; ctx.fillRect(cx + Math.cos(a) * d, ym + Math.sin(a) * d * 0.7, s * 0.07, s * 0.07); }
            ctx.globalAlpha = 1;
          }
          continue;
        }
        const b = Math.sin(t * 4 + i) * s * 0.04;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(G.gold, cx - s * 0.5, ym - s * 0.5 + b, s, s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(PV.cheese, cx - s * 0.35, ym - s * 0.35 + b, s * 0.7, s * 0.7);
      }
      // traces de pas
      ctx.fillStyle = hexA(PCOL[0], 0.35);
      for (let k = 1; k < 6; k++) { const px = mxp - s * 0.4 - k * s * 0.3; if (px > 0) { circ(ctx, px, ym + (k % 2 ? -1 : 1) * s * 0.1, s * 0.035); ctx.fill(); } }
      ctx.fillStyle = hexA(PCOL[1], 0.3);
      for (let k = 1; k < 5; k++) { const px = cxp - s * 0.5 - k * s * 0.36; if (px > 0) { circ(ctx, px, ym + (k % 2 ? -1 : 1) * s * 0.13, s * 0.05); ctx.fill(); } }
      // la souris (contour ambre) puis le chat (contour cyan)
      if (!mouseIn) {
        ctx.save();
        if (mxp > PV.xe - s * 0.55) { ctx.beginPath(); ctx.rect(0, 0, PV.xe, h); ctx.clip(); }
        pvChar(ctx, false, mxp, ym, s * 0.95, t, t * 22, PCOL[0], '', 1);
        ctx.restore();
      } else if (u > T - 1.2) {                  // la souris ressort la tête du trou, fière d'elle
        const k = clamp((u - (T - 1.2)) / 0.3, 0, 1) * clamp((T - 0.05 - u) / 0.3, 0, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PV.xe, h); ctx.clip();
        ctx.translate(PV.xe + s * 0.25 - k * s * 0.5, ym - s * 0.05);
        cartoonHead(ctx, 'mouse', s * 0.78, PCOL[0], '', t);
        ctx.restore();
      }
      pvChar(ctx, true, cxp, ym, s * 1.02, t, bonk ? 0 : t * 18, PCOL[1], bonk ? 'scared' : '', st);
      if (bonk) {                                 // étoiles du chat sonné
        for (let i = 0; i < 3; i++) {
          const a = t * 5 + (i * TAU) / 3, sx = cxp + s * 0.3 + Math.cos(a) * s * 0.36, sy = ym - s * 0.62 + Math.sin(a) * s * 0.12;
          ctx.fillStyle = '#ffe680'; starPath(ctx, sx, sy, s * 0.1, 5, 0.45, a); ctx.fill();
        }
        if (u - runEnd - 0.35 < 0.12) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(G.white, PV.xe - s * 0.9, ym - s * 0.8, s * 1.6, s * 1.6); ctx.globalCompositeOperation = 'source-over'; }
      }
      // deux pouces face à face (le duel se joue à deux)
      for (let p = 0; p < 2; p++) {
        const jx = p ? w - 26 : 26, jy = p ? 24 : h - 24, a = t * 1.6 + p * 2;
        ctx.globalAlpha = 0.55; ctx.strokeStyle = PCOL[p]; ctx.lineWidth = 2;
        circ(ctx, jx, jy, 15); ctx.stroke();
        ctx.fillStyle = hexA(PCOL[p], 0.8); circ(ctx, jx + Math.cos(a) * 7, jy + Math.sin(a) * 5, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // Le jeu
  // ===========================================================================
  const ROLE_TXT = {
    mouse: ['TU ES LA SOURIS :', 'mange tout le fromage !'],
    cat: ['TU ES LE CHAT :', 'attrape-la !']
  };
  function mount(root, api) {
    api = api || {};
    const doc = document;
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const PL = [0, 1].map((p) => {
      const s = (api.players && api.players[p]) || {};
      return { name: String(s.name || (p ? 'Joueur 2' : 'Joueur 1')).trim().slice(0, 14) || '?', img: s.img || null, sad: s.sad || null, color: s.color || PCOL[p] };
    });
    // vue SOLO (contre l'IA ou en ligne : un seul lecteur par écran) : tous les textes tournés vers le lecteur,
    // la moitié de l'adversaire réduite à son nom. VIEWER = joueur qui regarde cet écran (l'invité en ligne : 1).
    const SOLO = !!(api.ai || api.net);
    const VIEWER = (api.net && api.net.flipped) ? 1 : 0;
    let destroyed = false, paused = false, raf = 0, last = 0, rt = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ------------------------------------------------------------- sons (synthétisés, sobres)
    const later = [];
    let sndBudget = 8;
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function can(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rt - l < gap) return false;
      sndLast[ch] = rt; sndBudget--;
      return true;
    }
    function after(d, fn) { if (later.length < 60) later.push({ t: rt + d, fn }); }
    function vibrate(ms) { try { if (typeof api.vibrate === 'function') api.vibrate(ms); } catch (e) { /* rien */ } }
    let miamN = 0;
    const SFX = {
      miam() {                                     // « miam » : petit croc puis glissando gourmand
        if (!can('miam', 0.05)) return;
        const b = [520, 590, 660][miamN++ % 3];
        tone(b, 0.05, 'square', 0.03, b * 1.35);
        after(0.065, () => tone(b * 1.5, 0.12, 'triangle', 0.05, b * 1.05));
      },
      miaou() { tone(400, 0.14, 'sawtooth', 0.028, 760); after(0.12, () => tone(760, 0.46, 'triangle', 0.055, 300)); after(0.13, () => tone(1140, 0.32, 'sine', 0.014, 560)); },
      squeak() { tone(2100, 0.05, 'square', 0.018, 2900); after(0.08, () => tone(2500, 0.07, 'square', 0.018, 3300)); },
      pounce() { noise(0.4, 0.07, 2400); tone(230, 0.42, 'sawtooth', 0.026, 880); },
      miss() { noise(0.18, 0.06, 900); tone(160, 0.14, 'triangle', 0.035, 90); },
      bonk() { tone(640, 0.32, 'square', 0.04, 120); noise(0.25, 0.09, 1500); after(0.14, () => tone(980, 0.22, 'triangle', 0.03, 1600)); },
      land() { noise(0.2, 0.06, 700); tone(130, 0.12, 'triangle', 0.04, 80); },
      super() { [523, 659, 784, 1047, 1319].forEach((f, i) => after(i * 0.055, () => tone(f, 0.13, 'square', 0.03))); noise(0.35, 0.05, 5000); },
      superEnd() { tone(700, 0.25, 'triangle', 0.03, 350); },
      big() { tone(880, 0.1, 'triangle', 0.04, 1320); after(0.12, () => tone(1320, 0.2, 'triangle', 0.04, 1760)); after(0.3, () => tone(1760, 0.16, 'sine', 0.02)); },
      door(cl) { if (can('door', 0.15)) { noise(0.12, 0.045, 650); tone(cl ? 150 : 230, 0.09, 'square', 0.022, cl ? 90 : 300); } },
      hole() { if (can('hole', 0.12)) { noise(0.14, 0.035, 3400); tone(760, 0.08, 'sine', 0.022, 1500); } },
      tunnel() { noise(0.32, 0.045, 2200); tone(320, 0.26, 'sine', 0.026, 980); },
      tick(hi) { tone(hi ? 1500 : 1100, 0.035, 'square', 0.016); },
      count() { tone(660, 0.1, 'square', 0.035); },
      go() { tone(880, 0.12, 'square', 0.04); after(0.11, () => tone(1320, 0.28, 'square', 0.04)); },
      plink(i) { tone(1100 + i * 70, 0.05, 'sine', 0.02); },
      win() { [523, 659, 784, 1047].forEach((f, i) => after(i * 0.09, () => tone(f, 0.18, 'triangle', 0.045))); },
      bell() { tone(1568, 0.55, 'sine', 0.035, 1500); after(0.16, () => tone(2093, 0.42, 'sine', 0.028, 2000)); after(0.32, () => tone(1568, 0.4, 'sine', 0.02)); },
      sad() { tone(392, 0.2, 'triangle', 0.035, 370); after(0.22, () => tone(311, 0.36, 'triangle', 0.035, 290)); },
      heart() { tone(68, 0.11, 'sine', 0.07, 48); after(0.15, () => tone(60, 0.12, 'sine', 0.05, 44)); }
    };
    // musique d'ambiance : basse pizzicato « sur la pointe des pieds » + petite mélodie (très discrète)
    // A (la mineur) puis B (fa – sol – mi – la) : 64 pas, environ 14 s avant de se répéter
    const BASS = [110, 0, 164.8, 0, 130.8, 0, 164.8, 0, 146.8, 0, 220, 0, 174.6, 0, 220, 0, 123.5, 0, 164.8, 0, 146.8, 0, 207.7, 0, 110, 0, 164.8, 0, 130.8, 0, 103.8, 0,
      87.3, 0, 130.8, 0, 87.3, 0, 130.8, 0, 98, 0, 146.8, 0, 98, 0, 146.8, 0, 82.4, 0, 123.5, 0, 82.4, 0, 123.5, 0, 110, 0, 164.8, 0, 110, 0, 103.8, 0];
    const MEL = [0, 659.3, 0, 0, 0, 523.3, 0, 587.3, 0, 698.5, 0, 0, 587.3, 0, 440, 0, 0, 415.3, 0, 493.9, 0, 587.3, 0, 659.3, 0, 523.3, 0, 493.9, 0, 440, 0, 0,
      0, 523.3, 0, 587.3, 0, 659.3, 0, 0, 0, 784, 0, 659.3, 0, 587.3, 0, 0, 0, 493.9, 0, 523.3, 0, 587.3, 0, 493.9, 0, 440, 0, 0, 0, 0, 0, 0];
    let musT = 0, musI = 0;
    function music(dt) {
      if (api.hasMusic) return;   // la bibliothèque joue déjà une musique pour ce duel
      if (!S || (mode !== 'play' && mode !== 'intro') || resumeT > 0) return;
      const left = S.dur - S.t, sup = S.mouse.sup > 0;
      const stepT = mode === 'play' && left < 8 ? 0.17 : 0.215;
      musT -= dt;
      let guard = 0;
      while (musT <= 0 && guard++ < 4) {
        musT += stepT;
        const i = musI++ % 64, b = BASS[i], m = MEL[i];
        if (b) tone(b * (sup ? 1.5 : 1), 0.17, 'triangle', 0.032);
        if (m && mode === 'play') tone(m * (sup ? 1.335 : 1), 0.09, 'sine', 0.014);
        if (sup && i % 2 === 1) tone(1046 + (i % 8) * 66, 0.05, 'sine', 0.01);
      }
    }

    // ------------------------------------------------------------- DOM
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ------------------------------------------------------------- mise en page
    let W = 360, H = 640, dpr = 1, cs = 30, mx = 0, my = 0, mw = 0, mh = 0, sh = 30, quality = 1, perfSum = 0, perfN = 0, prevReal = 0;
    let bgC = null, SPR = null, glowC = null;
    const HEADS = new Map();
    function layout() {
      const r = root.getBoundingClientRect();
      W = Math.max(200, Math.round(r.width || root.clientWidth || 360));
      H = Math.max(240, Math.round(r.height || root.clientHeight || 640));
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1) * quality);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const stripMin = clamp(Math.round(H * 0.044), 28, 46);
      const padX = W >= 560 ? 14 : 3;
      cs = Math.min((W - 2 * padX) / COLS, (H - 2 * stripMin - 4) / ROWS);
      cs = Math.max(10, Math.floor(cs * dpr) / dpr);
      mw = cs * COLS; mh = cs * ROWS;
      mx = Math.round(((W - mw) / 2) * dpr) / dpr;
      my = Math.round(((H - mh) / 2) * dpr) / dpr;
      sh = my;
      HEADS.clear();
      SPR = null; bgC = null;
    }
    const PX = (x) => mx + (x + 0.5) * cs;
    const PY = (y) => my + (y + 0.5) * cs;

    // ------------------------------------------------------------- sprites (refaits à chaque changement de taille)
    function spr(w, h, fn) {
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, (w * dpr) / 2, (h * dpr) / 2);
      try { fn(c); } catch (e) { /* un sprite raté ne casse pas le jeu */ }
      return { cv, w, h };
    }
    function sprites() {
      if (SPR) return SPR;
      const k = cs;
      SPR = {
        cheese: spr(k * 0.86, k * 0.86, (c) => paintCheese(c, k * 0.66)),
        big: spr(k * 1.3, k * 1.3, (c) => paintBigCheese(c, k * 1.18)),
        rays: spr(k * 3.2, k * 3.2, (c) => {
          c.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 12; i++) {
            c.rotate(TAU / 12);
            c.fillStyle = lin(c, 0, 0, k * 1.6, 0, [0, 'rgba(255,220,110,0.55)', 1, 'rgba(255,220,110,0)']);
            c.beginPath(); c.moveTo(0, 0); c.lineTo(k * 1.6, -k * 0.16); c.lineTo(k * 1.6, k * 0.16); c.closePath(); c.fill();
          }
        }),
        paw: [0, 1].map((p) => [0, 1].map((cat) => spr(k * 0.3, k * 0.3, (c) => {
          const s = k * (cat ? 0.12 : 0.08);
          c.fillStyle = shade(PL[p].color, 0.35);
          ell(c, 0, s * 0.25, s * 0.55, s * 0.45); c.fill();
          for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.48; circ(c, Math.cos(a) * s * 0.85 + s * 0.05, Math.sin(a) * s * 0.75 + s * 0.15, s * 0.2); c.fill(); }
        }))),
        plug: spr(k * 0.5, k * 0.5, (c) => {
          circ(c, 0, 0, k * 0.17); c.fillStyle = rad(c, -k * 0.05, -k * 0.05, 1, 0, 0, k * 0.17, [0, '#b9a58a', 1, '#6e5c46']); c.fill();
          c.strokeStyle = '#3a2d1e'; c.lineWidth = Math.max(1, k * 0.025); c.stroke();
          c.fillStyle = 'rgba(60,45,30,0.6)'; circ(c, k * 0.05, k * 0.03, k * 0.04); c.fill(); circ(c, -k * 0.06, -k * 0.04, k * 0.025); c.fill();
        })
      };
      return SPR;
    }
    function dspr(s, x, y, sc) { const w = s.w * (sc || 1), h = s.h * (sc || 1); ctx.drawImage(s.cv, x - w / 2, y - h / 2, w, h); }

    // ------------------------------------------------------------- têtes des joueurs (contour à leur couleur)
    function headSprite(p, mood, hs) {
      const pl = PL[p];
      const happyOk = imgOk(pl.img), sadOk = imgOk(pl.sad);
      const key = p + mood + Math.round(hs * dpr) + (happyOk ? 'i' : 'f') + (sadOk ? 's' : '');
      let s = HEADS.get(key);
      if (s) return s;
      const img = mood !== 'n' && sadOk ? pl.sad : happyOk ? pl.img : null;
      const tint = mood !== 'n' && !sadOk;
      const ow = Math.max(1.8, hs * 0.055), pad = ow * 2 + 4;
      let w, h;
      if (img) {
        const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
        h = hs; w = (hs * iw) / ih;
        if (w > hs * 1.05) { w = hs * 1.05; h = (w * ih) / iw; }
      } else { w = h = hs * 0.84; }
      const cw = w + pad * 2, chh = h + pad * 2, D = dpr;
      const face = mkCanvas(cw * D, chh * D), f = face.getContext('2d');
      f.setTransform(D, 0, 0, D, 0, 0);
      if (img) {
        try { f.drawImage(img, pad, pad, w, h); } catch (e) { /* rien */ }
        if (tint) {
          f.globalCompositeOperation = 'source-atop'; f.fillStyle = 'rgba(70,120,210,0.35)'; f.fillRect(0, 0, cw, chh);
          f.globalCompositeOperation = 'source-over';
        }
      } else {
        const r = w / 2, cx = pad + r, cy = pad + r;
        circ(f, cx, cy, r);
        f.fillStyle = rad(f, cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r, [0, shade(pl.color, 0.45), 0.6, pl.color, 1, shade(pl.color, -0.35)]);
        f.fill();
        if (tint) { f.fillStyle = 'rgba(40,70,140,0.35)'; f.fill(); }
        f.fillStyle = '#ffffff'; f.font = Math.round(r * 1.1) + 'px ' + FD; f.textAlign = 'center'; f.textBaseline = 'middle';
        f.lineWidth = Math.max(2, r * 0.12); f.strokeStyle = 'rgba(0,0,0,0.45)'; f.lineJoin = 'round';
        const ini = pl.name.charAt(0).toUpperCase() || '?';
        f.strokeText(ini, cx, cy + r * 0.06); f.fillText(ini, cx, cy + r * 0.06);
      }
      if (tint || (mood !== 'n' && !img)) {          // larmes dessinées si on n'a pas de vraie tête triste
        f.fillStyle = '#9fdcff';
        for (const sx of [0.36, 0.64]) { ell(f, pad + w * sx, pad + h * 0.62, w * 0.035, h * 0.06); f.fill(); }
      }
      const ring = (rr, col) => {
        const cv = mkCanvas(cw * D, chh * D), c = cv.getContext('2d');
        const n = 16;
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU; c.drawImage(face, Math.cos(a) * rr * D, Math.sin(a) * rr * D); }
        c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
        return cv;
      };
      const out = mkCanvas(cw * D, chh * D), o = out.getContext('2d');
      o.drawImage(ring(ow + 1.6, 'rgba(6,10,14,0.92)'), 0, 0);
      o.drawImage(ring(ow, pl.color), 0, 0);
      o.drawImage(face, 0, 0);
      s = { cv: out, w: cw, h: chh, hw: w, hh: h, ow };
      if (HEADS.size > 40) HEADS.clear();
      HEADS.set(key, s);
      return s;
    }
    try { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { if (!destroyed) { HEADS.clear(); bgC = null; } }); } catch (e) { /* rien */ }

    // ------------------------------------------------------------- état
    let S = null, mode = 'load', modeT = 0, mazeIdx = -1, layoutSeed = 1, lastMaze = -1;
    let introDur = 5, introFired = 0, resumeT = 0, endI = null, matchOver = false;
    let shake = 0, flash = 0, flashCol = '#ffffff', slowVis = 0, superVis = 0, timePop = 0, tickLast = 99, heartT = 0;
    const hudBump = [0, 0];
    let PT = [], RG = [], PR = [];
    const MOTES = [];
    for (let i = 0; i < 18; i++) MOTES.push({ x: Math.random() * COLS, y: Math.random() * ROWS, vx: rnd(-0.12, 0.12), vy: rnd(-0.1, 0.1), s: rnd(0.05, 0.11), f: rnd(0.6, 1.6), ph: Math.random() * TAU });
    const doorK = new Float32Array(400);
    function mkVis() { return { ang: 0, walk: 0, tail: null, lx: 0, ly: 0, sq: 0, dust: 0, prints: 0, side: 1, moving: false, earL: 0, earR: 0, earT: 1, startle: 0, danger: 0 }; }
    let VM = mkVis(), VC = mkVis();

    // ------------------------------------------------------------- particules (en cases)
    function part(k, x, y, vx, vy, life, s, col, add) {
      if (PT.length >= 280) return null;
      const p = { k, x, y, vx, vy, life, max: life, s, col, add: !!add, r: Math.random() * TAU, vr: rnd(-7, 7), g: 0 };
      PT.push(p);
      return p;
    }
    function burst(k, x, y, n, spd, life, s, cols, add) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.35 + Math.random() * 0.8);
        part(k, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.6 + Math.random() * 0.6), s * (0.6 + Math.random() * 0.7), cols[(Math.random() * cols.length) | 0], add);
      }
    }
    function ring(x, y, r0, r1, life, col, w) { if (RG.length < 14) RG.push({ x, y, r0, r1, life, max: life, col, w }); }
    function dust(x, y, n, spd) { burst('dust', x, y, n, spd || 1.2, 0.55, 0.32, ['#d6ccbc'], false); }

    // ------------------------------------------------------------- manche
    function pickMaze(L, seed) {
      const tier = Math.min(3, L), r = mulberry32(seed ^ 0x5bd1e995)();
      let list = PARSED.filter((m) => m.tier === tier).map((m) => m.idx);
      if (L >= 4 && list.length > 1) list = list.filter((i) => i !== lastMaze);
      return list[Math.floor(r * list.length) % list.length];
    }
    function startRound() {
      let rn = 1;
      try { rn = typeof api.round === 'function' ? Math.max(1, api.round() | 0) : 1; } catch (e) { rn = 1; }
      const mouseP = (rn - 1) % 2;
      if (rn % 2 === 1 || mazeIdx < 0) {
        layoutSeed = (Math.random() * 4294967296) >>> 0;
        lastMaze = mazeIdx;
        mazeIdx = pickMaze(Math.ceil(rn / 2), layoutSeed);
      }
      beginRound(rn, mouseP);
      if (HOST) netRoundStart();
    }
    function beginRound(rn, mouseP) {                 // même manche chez l'invité (labyrinthe, graine et rôles reçus de l'hôte)
      S = newRound({ round: rn, maze: mazeIdx, layoutSeed, mouseP });
      PT = []; RG = []; PR = []; doorK.fill(0);
      for (const d of S.M.doors) doorK[d.id] = S.closed[d.id];
      VM = mkVis(); VC = mkVis();
      VM.ang = Math.atan2(DY[S.mouse.face], DX[S.mouse.face]); VC.ang = Math.atan2(DY[S.cat.face], DX[S.cat.face]);
      VM.lx = S.mouse.x; VM.ly = S.mouse.y; VC.lx = S.cat.x; VC.ly = S.cat.y;
      bgC = null;
      mode = 'intro'; modeT = 0; introFired = 0; resumeT = 0; endI = null;
      introDur = rn === 1 ? 6.4 : 4.9;
      shake = 0; flash = 0; slowVis = 0; superVis = 0; tickLast = 99; musI = 0; musT = 0.4; rays = 0; camZ = 1; camX = 4; camY = 8; hitStop = 0;
      for (const p of [0, 1]) { queued[p] = -1; BAN[p] = null; }
      ban10 = false;
      if (AIP) AIB = mkAI(aiLevel(), AIP.p, (layoutSeed ^ Math.imul(rn, 2654435761)) >>> 0);   // une IA neuve à chaque manche
    }
    function entOf(p) { return S ? (S.mouseP === p ? S.mouse : S.cat) : null; }

    // ------------------------------------------------------------- fond pré-rendu (pièce, murs, meubles, bandeaux)
    function buildBg() {
      const M = S.M, th = THEMES[M.theme % THEMES.length], R = mulberry32(4242 + M.idx * 97);
      bgC = mkCanvas(W * dpr, H * dpr);
      const g = bgC.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // dehors : papier peint sombre
      g.fillStyle = th.out; g.fillRect(0, 0, W, H);
      g.save(); g.globalAlpha = 0.05; g.strokeStyle = th.wall.neon; g.lineWidth = 1;
      g.beginPath(); for (let x = -H; x < W + H; x += 18) { g.moveTo(x, 0); g.lineTo(x + H, H); } g.stroke(); g.restore();
      // la pièce
      g.save();
      g.shadowColor = hexA(th.wall.neon, 0.5); g.shadowBlur = cs * 0.9;
      g.fillStyle = th.f[2]; g.fillRect(mx, my, mw, mh);
      g.restore();
      g.save(); g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
      paintFloor(g, th, mx, my, mw, mh, cs, R);
      // flaques de lumière (symétriques) + vignette
      g.globalCompositeOperation = 'lighter';
      for (const [lx, ly, lr, kind] of LIGHTS) {
        for (const [x, y] of [[lx, ly], [COLS - 1 - lx, ROWS - 1 - ly]]) {
          const cx = PX(x), cy = PY(y), rr = lr * cs, col = kind === 'w' ? th.warm : th.cool;
          g.fillStyle = rad(g, cx, cy, 0, cx, cy, rr, [0, 'rgba(' + col + ',0.17)', 0.5, 'rgba(' + col + ',0.07)', 1, 'rgba(' + col + ',0)']);
          g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        }
      }
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = rad(g, mx + mw / 2, my + mh / 2, Math.min(mw, mh) * 0.35, mx + mw / 2, my + mh / 2, Math.hypot(mw, mh) * 0.58, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.42)']);
      g.fillRect(mx, my, mw, mh);
      // niches : panier du chat (coussin à sa couleur) et maison de la souris
      paintDecor(g, th, M, mx, my, cs, R);
      const hc = S.homes[S.catP], hm = S.homes[S.mouseP];
      paintBasket(g, PX(hc.c), PY(hc.r), cs, PL[S.catP].color);
      paintMouseHome(g, PX(hm.c), PY(hm.r), cs, PL[S.mouseP].color, hm.r === 0);
      g.restore();
      // murs
      paintWalls(g, th, wallSegs(M), mx, my, cs, R);
      glowC = mkCanvas(W * 0.5, H * 0.5);
      { const gg = glowC.getContext('2d'); gg.setTransform(0.5, 0, 0, 0.5, 0, 0); paintWalls(gg, th, wallSegs(M), mx, my, cs, R, true); }
      // meubles au bout de la ligne du milieu
      for (const side of [0, 1]) {
        let c0 = -1;
        for (let c = 0; c < COLS; c++) if (M.X[8][c] && (side ? c > 4 : c < 4)) { if (c0 < 0) c0 = c; }
        if (c0 < 0) continue;
        const n = side ? COLS - c0 : (() => { let k = 0; for (let c = 0; c < 4; c++) if (M.X[8][c]) k++; return k; })();
        const x = mx + c0 * cs, y = my + 8 * cs;
        g.save();
        if (side) { g.translate(x + (n * cs) / 2, y + cs / 2); g.rotate(Math.PI); g.translate(-(x + (n * cs) / 2), -(y + cs / 2)); }
        paintFurniture(g, th, x, y, n * cs, cs, cs, R);
        g.restore();
      }
      // trous de souris et tunnels
      for (const h of M.holes) {
        if (h.v) paintArch(g, mx + h.i * cs, PY(h.r), true, cs, th, false);
        else paintArch(g, PX(h.c), my + h.j * cs, false, cs, th, false);
      }
      for (const r of M.tunnels) { paintArch(g, mx, PY(r), true, cs, th, true); paintArch(g, mx + mw, PY(r), true, cs, th, true); }
      // bandeaux des joueurs (fond)
      for (const p of [0, 1]) {
        if (SOLO && p !== VIEWER) { paintOppStrip(g, p); continue; }
        g.save();
        if (p === 1) { g.translate(W, H); g.rotate(Math.PI); }
        const y0 = H - sh, x0 = mx > 40 ? mx : 0, w = mx > 40 ? mw : W;
        g.fillStyle = lin(g, 0, y0, 0, H, [0, 'rgba(8,14,20,0.2)', 0.25, 'rgba(10,18,26,0.92)', 1, 'rgba(6,11,16,0.98)']);
        g.fillRect(x0, y0, w, sh);
        g.fillStyle = lin(g, x0, 0, x0 + w, 0, [0, hexA(PL[p].color, 0), 0.2, hexA(PL[p].color, 0.55), 0.8, hexA(PL[p].color, 0.55), 1, hexA(PL[p].color, 0)]);
        g.fillRect(x0, y0 + 1, w, 1.5);
        const role = S.mouseP === p ? 'mouse' : 'cat', cy = y0 + sh * 0.56, ic = Math.min(sh * 0.86, 34), fs = Math.round(clamp(sh * 0.4, 11, 17));
        g.save(); g.translate(x0 + 8 + ic * 0.55, cy + ic * 0.05); cartoonHead(g, role, ic, PL[p].color, '', 0.3); g.restore();
        g.font = fs + 'px ' + FD; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
        g.lineWidth = 3; g.strokeStyle = 'rgba(2,6,10,0.88)'; g.strokeText(role === 'mouse' ? 'SOURIS' : 'CHAT', x0 + 10 + ic * 1.15, cy + fs * 0.36);
        g.fillStyle = PL[p].color; g.fillText(role === 'mouse' ? 'SOURIS' : 'CHAT', x0 + 10 + ic * 1.15, cy + fs * 0.36);
        g.restore();
      }
      // grands écrans : panneaux décorés de chaque côté
      if (mx >= 100) paintSides(g, th);
    }
    function paintSides(g, th) {
      // grands écrans (tablette, PC) : la carte de chaque joueur dans la marge de sa moitié + des copains en cadres
      const heads = (() => { try { const l = typeof api.heads === 'function' ? api.heads() : []; return Array.isArray(l) ? l.filter((h) => h && imgOk(h.img)) : []; } catch (e) { return []; } })();
      const others = heads.filter((h) => h.img !== PL[0].img && h.img !== PL[1].img);
      const lines = (txt, maxW) => { const out = []; let cur = ''; for (const w of txt.split(' ')) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
      for (const p of [0, 1]) {
        if (SOLO && p !== VIEWER) { paintOppSide(g, p, others); continue; }
        g.save();
        if (p === 1) { g.translate(W, H); g.rotate(Math.PI); }
        const pw = Math.min(260, mx - 24), x0 = mx - 12 - pw, y0 = H / 2 + 46, f1 = Math.round(clamp(pw * 0.1, 12, 26)), f2 = Math.round(clamp(pw * 0.075, 11, 18)), f3 = Math.round(clamp(pw * 0.06, 10, 15));
        const hs = Math.min((H / 2 - 120) * 0.42, pw * 0.42), ph = Math.min(H - 20 - y0, 34 + hs * 1.55 + f2 * 1.5 + f3 * 1.35 * 3 + 14);
        if (pw >= 90 && ph > 120) {
          rrect(g, x0, y0, pw, ph, 14);
          g.fillStyle = lin(g, 0, y0, 0, y0 + ph, [0, 'rgba(16,28,38,0.92)', 1, 'rgba(8,14,20,0.92)']); g.fill();
          g.lineWidth = 2; g.strokeStyle = hexA(PL[p].color, 0.65); g.stroke();
          g.fillStyle = PL[p].color; g.fillRect(x0 + 14, y0, pw - 28, 3);
          const role = S.mouseP === p ? 'mouse' : 'cat';
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55;
          const G = glows(); g.drawImage(p ? G.cyan : G.amber, x0 + pw / 2 - hs, y0 + 14 + hs * 0.8 - hs, hs * 2, hs * 2);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
          g.save(); g.translate(x0 + pw / 2, y0 + 14 + hs * 0.8);
          drawHeadAt(g, p, role, 'n', hs, 0, 0, 0, 0, 0);
          g.restore();
          let y = y0 + 24 + hs * 1.55;
          g.textAlign = 'center'; g.textBaseline = 'alphabetic';
          g.font = f1 + 'px ' + FD; g.fillStyle = PL[p].color; g.fillText(PL[p].name.toUpperCase(), x0 + pw / 2, y, pw - 14);
          y += f2 * 1.5;
          g.font = f2 + 'px ' + FD; g.fillStyle = '#ffffff'; g.fillText(role === 'mouse' ? 'LA SOURIS' : 'LE CHAT', x0 + pw / 2, y, pw - 14);
          g.font = '600 ' + f3 + 'px ' + FB; g.fillStyle = '#a9c2d4';
          const desc = role === 'mouse' ? 'Mange les ' + S.cheese.length + '\u00a0fromages ou tiens ' + S.dur + '\u00a0s' : 'Attrape la souris avant la fin du temps';
          for (const l of lines(desc, pw - 16).slice(0, 3)) { y += f3 * 1.35; if (y < y0 + ph - 6) g.fillText(l, x0 + pw / 2, y); }
        }
        // un copain en cadre photo dans l'autre marge de sa moitié
        const hd = others.length ? others[p % others.length] : null;
        const fw = Math.min(110, mx - 34), fh = fw * 1.25;
        if (hd && fw >= 60 && H / 2 + 46 + fh + 30 < H) {
          const fx = mx + mw + (mx - fw) / 2, fy = H - 34 - fh;
          g.save(); g.translate(fx + fw / 2, fy + fh / 2); g.rotate(p ? 0.05 : -0.05);
          g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
          rrect(g, -fw / 2, -fh / 2, fw, fh, 8); g.fillStyle = '#c9a24a'; g.fill();
          g.shadowColor = 'transparent';
          rrect(g, -fw / 2 + 6, -fh / 2 + 6, fw - 12, fh - 12, 5); g.fillStyle = lin(g, 0, -fh / 2, 0, fh / 2, [0, '#24485a', 1, '#11232d']); g.fill();
          g.save(); rrect(g, -fw / 2 + 6, -fh / 2 + 6, fw - 12, fh - 12, 5); g.clip();
          try { const iw = hd.img.naturalWidth || hd.img.width, ih = hd.img.naturalHeight || hd.img.height, hh = fh - 16, ww = (hh * iw) / ih; g.drawImage(hd.img, -ww / 2, -hh / 2 + 4, ww, hh); } catch (e) { /* rien */ }
          g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(-fw / 2, -fh * 0.1); g.lineTo(fw * 0.1, -fh / 2); g.lineTo(fw * 0.35, -fh / 2); g.lineTo(-fw / 2, fh * 0.15); g.fill();
          g.restore();
          g.font = '600 ' + Math.round(clamp(fw * 0.13, 10, 13)) + 'px ' + FB; g.textAlign = 'center'; g.fillStyle = '#ffe9a8';
          g.fillText(String(hd.name || '').slice(0, 12), 0, fh / 2 + 16);
          g.restore();
        }
        g.restore();
      }
    }
    // ----- vue SOLO : repère du lecteur (textes à l'endroit pour lui) et moitié de l'adversaire réduite à son nom
    function viewFrame(c) { if (VIEWER === 1) { c.translate(W, H); c.rotate(Math.PI); } }
    function paintOppStrip(g, p) {
      const col = PL[p].color;
      g.save();                                     // fond du bandeau (comme d'habitude, sans HUD)
      if (p === 1) { g.translate(W, H); g.rotate(Math.PI); }
      const y0 = H - sh, x0 = mx > 40 ? mx : 0, w = mx > 40 ? mw : W;
      g.fillStyle = lin(g, 0, y0, 0, H, [0, 'rgba(8,14,20,0.2)', 0.25, 'rgba(10,18,26,0.92)', 1, 'rgba(6,11,16,0.98)']);
      g.fillRect(x0, y0, w, sh);
      g.fillStyle = lin(g, x0, 0, x0 + w, 0, [0, hexA(col, 0), 0.2, hexA(col, 0.55), 0.8, hexA(col, 0.55), 1, hexA(col, 0)]);
      g.fillRect(x0, y0 + 1, w, 1.5);
      g.restore();
      // étiquette « nom » à sa couleur, tournée vers le lecteur (en haut de son écran)
      g.save(); viewFrame(g);
      const role = S.mouseP === p ? 'mouse' : 'cat', name = PL[p].name.toUpperCase();
      const fs = Math.round(clamp(sh * 0.36, 10, 15)), ic = Math.min(sh * 0.74, 28);
      g.font = fs + 'px ' + FD;
      const tw = Math.min(g.measureText(name).width, W * 0.5);
      const ph = Math.round(clamp(sh * 0.66, 18, 28)), pw = ic * 0.9 + 12 + tw + 14, cy = Math.min(sh * 0.46, sh - ph / 2 - 3);
      const px0 = (mx > 40 ? mx : 0) + 8;           // à gauche, comme le rôle dans le bandeau du lecteur (le centre reste au personnage)
      rrect(g, px0, cy - ph / 2, pw, ph, ph / 2);
      g.fillStyle = 'rgba(6,11,16,0.86)'; g.fill();
      g.lineWidth = 3; g.strokeStyle = hexA(col, 0.18); g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = hexA(col, 0.85); g.stroke();
      g.save(); g.translate(px0 + ic * 0.45 + 4, cy + ic * 0.04); cartoonHead(g, role, ic, col, '', 0.3); g.restore();
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = 3; g.strokeStyle = 'rgba(2,6,10,0.88)'; g.strokeText(name, px0 + ic * 0.9 + 10, cy + fs * 0.04, tw);
      g.fillStyle = col; g.fillText(name, px0 + ic * 0.9 + 10, cy + fs * 0.04, tw);
      g.textBaseline = 'alphabetic';
      g.restore();
    }
    function friendFrame(g, hd, fx, fy, fw, fh, tilt) {
      g.save(); g.translate(fx + fw / 2, fy + fh / 2); g.rotate(tilt);
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
      rrect(g, -fw / 2, -fh / 2, fw, fh, 8); g.fillStyle = '#c9a24a'; g.fill();
      g.shadowColor = 'transparent';
      rrect(g, -fw / 2 + 6, -fh / 2 + 6, fw - 12, fh - 12, 5); g.fillStyle = lin(g, 0, -fh / 2, 0, fh / 2, [0, '#24485a', 1, '#11232d']); g.fill();
      g.save(); rrect(g, -fw / 2 + 6, -fh / 2 + 6, fw - 12, fh - 12, 5); g.clip();
      try { const iw = hd.img.naturalWidth || hd.img.width, ih = hd.img.naturalHeight || hd.img.height, hh = fh - 16, ww = (hh * iw) / ih; g.drawImage(hd.img, -ww / 2, -hh / 2 + 4, ww, hh); } catch (e) { /* rien */ }
      g.fillStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.moveTo(-fw / 2, -fh * 0.1); g.lineTo(fw * 0.1, -fh / 2); g.lineTo(fw * 0.35, -fh / 2); g.lineTo(-fw / 2, fh * 0.15); g.fill();
      g.restore();
      g.font = '600 ' + Math.round(clamp(fw * 0.13, 10, 13)) + 'px ' + FB; g.textAlign = 'center'; g.fillStyle = '#ffe9a8';
      g.fillText(String(hd.name || '').slice(0, 12), 0, fh / 2 + 16);
      g.restore();
    }
    function paintOppSide(g, p, others) {             // grands écrans : petite carte « tête + nom » de l'adversaire, à l'endroit pour le lecteur
      const col = PL[p].color;
      g.save(); viewFrame(g);
      const pw = Math.min(200, mx - 24);
      if (pw >= 90) {
        const hs = clamp(pw * 0.32, 40, 66), f1 = Math.round(clamp(pw * 0.09, 12, 18));
        const ph = hs * 1.3 + f1 + 26, x0 = W - mx + 12, y0 = H / 2 - 46 - ph;
        rrect(g, x0, y0, pw, ph, 14);
        g.fillStyle = lin(g, 0, y0, 0, y0 + ph, [0, 'rgba(16,28,38,0.8)', 1, 'rgba(8,14,20,0.8)']); g.fill();
        g.lineWidth = 1.5; g.strokeStyle = hexA(col, 0.5); g.stroke();
        g.fillStyle = col; g.fillRect(x0 + 14, y0, pw - 28, 3);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45;
        const G = glows(); g.drawImage(p ? G.cyan : G.amber, x0 + pw / 2 - hs, y0 + 12 + hs * 0.65 - hs, hs * 2, hs * 2);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.save(); g.translate(x0 + pw / 2, y0 + 12 + hs * 0.65);
        drawHeadAt(g, p, S.mouseP === p ? 'mouse' : 'cat', 'n', hs, 0, 0, 0, 0, 0);
        g.restore();
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.font = f1 + 'px ' + FD; g.fillStyle = col; g.fillText(PL[p].name.toUpperCase(), x0 + pw / 2, y0 + ph - 12, pw - 14);
      }
      const hd = others.length ? others[p % others.length] : null;
      const fw = Math.min(110, mx - 34), fh = fw * 1.25;
      if (hd && fw >= 60 && H / 2 + 46 + fh + 30 < H) friendFrame(g, hd, W - (mx + mw + (mx - fw) / 2) - fw, 34, fw, fh, p ? 0.05 : -0.05);
      g.restore();
    }

    // ------------------------------------------------------------- dessin d'un personnage
    // tête de joueur + oreilles + moustaches, dans le repère du propriétaire (tête à l'endroit pour lui)
    function drawHeadAt(c, p, role, mood, hs, t, earL, earR, wob, flat) {
      const s = headSprite(p, mood, hs);
      const hw = s.hw, hh = s.hh;
      if (role === 'cat') earsCat(c, hw, hh, PL[p].color, s.ow, earL, earR, flat);
      else earsMouse(c, hw, hh, PL[p].color, s.ow, wob);
      c.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h);
      whiskers(c, hw, hh, t, Math.max(0.9, hs * 0.022));
    }
    function updVis(e, v, dt) {
      const cat = e.kind === 'cat';
      const dx = e.x - v.lx, dy = e.y - v.ly;
      let moved = Math.hypot(dx, dy);
      if (moved > 2) { v.tail = null; moved = 0; }          // passage d'un tunnel : on repart à zéro
      v.lx = e.x; v.ly = e.y;
      v.moving = moved > 0.0005;
      v.walk += moved * (cat ? 8.5 : 11);
      if (e.dir >= 0 || (cat && S.phase === 'pounce')) {
        const target = Math.atan2(DY[e.face], DX[e.face]);
        v.ang += angDiff(v.ang, target) * Math.min(1, dt * (cat ? 13 : 18));
      }
      if (v.sq > 0) v.sq = Math.max(0, v.sq - dt * 4);
      if (v.startle > 0) v.startle = Math.max(0, v.startle - dt * 2.2);
      // traces de pas
      v.prints += moved;
      const gap = cat ? 0.34 : 0.27;
      if (v.prints > gap && (cat ? e.st === 'play' : true)) {
        v.prints = 0; v.side = -v.side;
        const a = v.ang, px = e.x + Math.cos(a + Math.PI / 2) * v.side * (cat ? 0.13 : 0.09), py = e.y + Math.sin(a + Math.PI / 2) * v.side * (cat ? 0.13 : 0.09);
        if (PR.length > 150) PR.shift();
        PR.push({ x: px, y: py, a, cat, p: e.p, life: 3.2 });
      }
      // poussière quand on court vite
      v.dust -= moved;
      if (v.dust <= 0 && e.spd > e.vmax * 0.92 && cat) { v.dust = 0.7; dust(e.x - Math.cos(v.ang) * 0.35, e.y - Math.sin(v.ang) * 0.35, 1, 0.5); }
      // oreilles qui bougent toutes seules
      v.earT -= dt;
      if (v.earT <= 0) { v.earT = 1.5 + Math.random() * 3; if (Math.random() < 0.5) v.earL = 0.35; else v.earR = -0.35; }
      v.earL *= Math.pow(0.02, dt); v.earR *= Math.pow(0.02, dt);
      // queue (chaîne qui suit le corps)
      const n = cat ? 8 : 10, seg = cs * (cat ? 0.095 : 0.085);
      const bx = PX(e.x) - Math.cos(v.ang) * cs * (cat ? 0.36 : 0.27), by = PY(e.y) - Math.sin(v.ang) * cs * (cat ? 0.36 : 0.27);
      if (!v.tail || v.tail.length !== n * 2) { v.tail = new Float32Array(n * 2); for (let i = 0; i < n; i++) { v.tail[i * 2] = bx - Math.cos(v.ang) * seg * i; v.tail[i * 2 + 1] = by - Math.sin(v.ang) * seg * i; } }
      const T = v.tail;
      T[0] = bx; T[1] = by;
      for (let i = 1; i < n; i++) {
        let ddx = T[i * 2] - T[i * 2 - 2], ddy = T[i * 2 + 1] - T[i * 2 - 1];
        const d = Math.hypot(ddx, ddy) || 1;
        if (d > seg) { T[i * 2] = T[i * 2 - 2] + (ddx / d) * seg; T[i * 2 + 1] = T[i * 2 - 1] + (ddy / d) * seg; }
        // ressort léger vers l'arrière quand on est arrêté
        if (!v.moving) {
          T[i * 2] += (-Math.cos(v.ang) * seg * 0.02);
          T[i * 2 + 1] += (-Math.sin(v.ang) * seg * 0.02);
        }
      }
    }
    const TP = new Float32Array(40);
    function drawEnt(e, v, ghost) {
      const cat = e.kind === 'cat', p = e.p, G = glows();
      let x = e.x, y = e.y, scale = 1, lift = 0, spin = 0, leap = 0;
      const mood = endI && endI.loser === p ? 'sad' : (cat && S.mouse.sup > 0 && e.st === 'play') ? 'sad' : 'n';
      // vol plané du chat renversé
      if (cat && e.st === 'fly') {
        const k = clamp(e.stT / TUNE.flyT, 0, 1), hm = S.homes[p];
        x = lerp(e.fx, hm.c, ease(k)); y = lerp(e.fy, hm.r, ease(k));
        lift = Math.sin(k * Math.PI) * 1.6; spin = k * TAU * 2; scale = 1 + Math.sin(k * Math.PI) * 0.45;
      }
      // bond final sur la souris
      if (cat && endI && endI.kind === 'caught') {
        const k = clamp(endI.t / endI.cine, 0, 1);
        const tx = S.mouse.x - DX[e.face] * 0.7, ty = S.mouse.y - DY[e.face] * 0.7;
        x = lerp(endI.cx, tx, easeOut(k)); y = lerp(endI.cy, ty, easeOut(k));
        lift = Math.sin(k * Math.PI) * 0.6; leap = k < 1 ? 1 : 0; scale = 1 + Math.sin(k * Math.PI) * 0.18;
      }
      if (cat && S.phase === 'pounce') leap = 1;
      if (!cat && endI && endI.kind === 'caught') {     // la souris aplatie un peu plus loin, pour qu'on voie les deux têtes
        const k = clamp(endI.t / endI.cine, 0, 1), f = S.cat.face;
        x += DX[f] * 0.3 * k; y += DY[f] * 0.3 * k;
      }
      const X = PX(x), Y = PY(y) - lift * cs * 0.5;
      const hop = endI && endI.winner === p && endI.t > endI.cine ? Math.abs(Math.sin((endI.t - endI.cine) * 7)) * cs * 0.22 : 0;
      const tremble = cat && mood === 'sad' && S.mouse.sup > 0 ? Math.sin(rt * 70) * cs * 0.025 : 0;
      const squash = !cat && endI && endI.kind === 'caught' && endI.t > endI.cine ? 0.55 : 1;
      const k = cs * scale * (e.kind === 'mouse' && e.sup > 0 ? 1.12 : 1);
      // ombre au sol (reste au sol pendant le saut)
      ctx.globalAlpha = 0.55; ctx.drawImage(G.shadow, PX(x) - k * 0.55, PY(y) - k * 0.2, k * 1.1, k * 0.62); ctx.globalAlpha = 1;
      // aura de super-souris
      if (!cat && e.sup > 0) {
        const pu = 1 + Math.sin(rt * 12) * 0.08, blink = e.sup < 1 && ((rt * 10) | 0) % 2 === 0;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = blink ? 0.25 : 0.7;
        ctx.drawImage(G.gold, X - k * 1.1 * pu, Y - k * 1.1 * pu, k * 2.2 * pu, k * 2.2 * pu);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // queue
      if (v.tail && !ghost) {
        const n = v.tail.length / 2, sway = (v.moving ? 0.6 : 1) * (cat ? 1 : 1.4);
        const offX = X - PX(e.x) + tremble, offY = Y - PY(e.y) - hop;
        for (let i = 0; i < n; i++) {
          const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
          const dxx = v.tail[i1 * 2] - v.tail[i0 * 2], dyy = v.tail[i1 * 2 + 1] - v.tail[i0 * 2 + 1];
          const d = Math.hypot(dxx, dyy) || 1, f = i / (n - 1), w = Math.sin(rt * (cat ? 5 : 8) - i * 0.7) * cs * 0.07 * f * sway;
          TP[i * 2] = v.tail[i * 2] + (-dyy / d) * w + offX;
          TP[i * 2 + 1] = v.tail[i * 2 + 1] + (dxx / d) * w + offY;
        }
        drawTail(ctx, TP, n, cat, k, cat && mood === 'sad' && S.mouse.sup > 0);
      }
      // traits de vitesse : le chat lancé à pleine vitesse en ligne droite
      if (cat && e.st === 'play' && v.moving && e.spd > e.vmax * 0.9 && !ghost) {
        const ca = Math.cos(v.ang), sa = Math.sin(v.ang);
        ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = Math.max(1, cs * 0.035); ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          const ph = (rt * 6 + i * 0.37) % 1, bx = X - ca * k * (0.55 + ph * 0.5) - sa * i * k * 0.22, by = Y - sa * k * (0.55 + ph * 0.5) + ca * i * k * 0.22;
          ctx.moveTo(bx, by); ctx.lineTo(bx - ca * k * 0.35, by - sa * k * 0.35);
        }
        ctx.stroke();
      }
      // corps
      ctx.save();
      ctx.translate(X + tremble, Y - hop);
      if (spin) ctx.rotate(spin);
      ctx.save();
      ctx.rotate(v.ang);
      const sq = v.sq > 0 ? 1 + v.sq * 0.18 : 1, br = v.moving ? 1 : 1 + Math.sin(rt * 3.2 + (cat ? 0 : 1.7)) * 0.035;
      ctx.scale(sq * br, br / sq);
      if (squash < 1) ctx.scale(1.25, squash);
      drawBody(ctx, cat, k, v.walk, v.moving, { stretch: leap ? 1.32 : 1, leap: !!leap, puff: cat && mood === 'sad' && S.mouse.sup > 0, cape: !cat && e.sup > 0 });
      ctx.restore();
      // tête : à l'avant du corps, toujours à l'endroit pour son joueur
      // (vue SOLO : toutes les têtes à l'endroit pour le lecteur de cet écran)
      const hp = SOLO ? VIEWER : p;
      const up = hp === 1 ? 1 : -1;
      const hx = Math.cos(v.ang) * k * (cat ? 0.3 : 0.24), hy = Math.sin(v.ang) * k * (cat ? 0.3 : 0.24) + up * k * 0.12 + up * Math.abs(Math.sin(v.walk)) * k * 0.035 * (v.moving ? 1 : 0);
      ctx.translate(hx, hy * squash);
      if (hp === 1) ctx.rotate(Math.PI);
      // petite inclinaison dans le sens de la course (vue par le propriétaire)
      const ownerDX = hp === 1 ? -Math.cos(v.ang) : Math.cos(v.ang);
      ctx.rotate(ownerDX * 0.12 * (v.moving ? 1 : 0.3) + (v.startle > 0 ? Math.sin(rt * 40) * 0.1 * v.startle : 0));
      if (squash < 1) ctx.scale(1.15, 0.8);
      const hs = k * (cat ? 1.1 : 0.98) * (1 + v.startle * 0.15);
      const flat = cat && mood === 'sad' && S.mouse.sup > 0 ? 1 : 0;
      drawHeadAt(ctx, p, cat ? 'cat' : 'mouse', mood, hs, rt, v.earL, v.earR, Math.sin(v.walk * 0.9) * 0.12 * (v.moving ? 1 : 0.2), flat);
      // gouttes de sueur (chat apeuré) / « ! » (souris en danger)
      if (flat) {
        // yeux paniqués : deux grands yeux de dessin animé, pupilles minuscules qui tremblent
        const hsp = headSprite(p, 'sad', hs), ew = hsp.hw * 0.17, eh = hsp.hh * 0.14, ey = -hsp.hh * 0.03;
        for (let sd = -1; sd <= 1; sd += 2) {
          const ex = sd * hsp.hw * 0.2;
          ell(ctx, ex, ey, ew, eh); ctx.fillStyle = '#ffffff'; ctx.fill();
          ctx.lineWidth = Math.max(1.2, hs * 0.03); ctx.strokeStyle = '#141820'; ctx.stroke();
          circ(ctx, ex + Math.sin(rt * 47 + sd) * ew * 0.18, ey + Math.cos(rt * 53) * eh * 0.15, Math.max(1.2, ew * 0.26)); ctx.fillStyle = '#141820'; ctx.fill();
        }
        ctx.fillStyle = '#9fdcff';
        for (let i = 0; i < 2; i++) { const ph = (rt * 1.6 + i * 0.5) % 1; ell(ctx, (i ? 1 : -1) * hs * 0.48, -hs * 0.25 + ph * hs * 0.3, hs * 0.05, hs * 0.08); ctx.globalAlpha = 1 - ph; ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (!cat && v.danger > 0 && !endI) {
        const a = Math.min(1, v.danger * 3), bob = Math.sin(rt * 14) * hs * 0.04;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ff4d5e'; circ(ctx, hs * 0.52, -hs * 0.62 + bob, hs * 0.17); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = Math.round(hs * 0.26) + 'px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', hs * 0.52, -hs * 0.6 + bob);
        ctx.globalAlpha = 1;
      }
      // étoiles du chat sonné (dans son panier)
      if (cat && (e.st === 'home' || e.st === 'fly')) {
        for (let i = 0; i < 3; i++) {
          const a = rt * 5 + (i * TAU) / 3, sx = Math.cos(a) * hs * 0.5, sy = -hs * 0.62 + Math.sin(a) * hs * 0.14;
          ctx.fillStyle = i === 1 ? '#ffffff' : '#ffe680'; starPath(ctx, sx, sy, hs * 0.12, 5, 0.45, a); ctx.fill();
        }
      }
      // petit nuage de pluie au-dessus du perdant
      if (endI && endI.loser === p && endI.t > endI.cine + 0.2) {
        const ny = -hs * 0.95, a = Math.min(1, (endI.t - endI.cine - 0.2) * 3);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#5d6b7a';
        for (const [ox, oy, r] of [[-0.18, 0.02, 0.17], [0.02, -0.06, 0.22], [0.22, 0.02, 0.16]]) { circ(ctx, ox * hs, ny + oy * hs, r * hs); ctx.fill(); }
        ctx.fillStyle = '#8fd0ff';
        for (let i = 0; i < 3; i++) { const ph = (rt * 2.4 + i * 0.33) % 1; ell(ctx, (i - 1) * hs * 0.17, ny + hs * (0.16 + ph * 0.35), hs * 0.025, hs * 0.05); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // ------------------------------------------------------------- monde
    function drawWorld() {
      const G = glows(), Sp = sprites(), M = S.M;
      // traces de pas (couleur du joueur)
      ctx.globalCompositeOperation = 'lighter';
      for (const q of PR) {
        const a = Math.min(1, q.life / 1.2) * 0.3;
        if (a <= 0.01) continue;
        const s = Sp.paw[q.p][q.cat ? 1 : 0];
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(PX(q.x), PY(q.y)); ctx.rotate(q.a + Math.PI / 2);
        ctx.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // trous qui se reposent (bouchon + compte à rebours)
      for (const id of M.cdIds) {
        const cd = S.cd[id];
        if (!(cd > 0)) continue;
        const pts = [];
        if (id < 200) {
          const r = (id / 10) | 0, i = id % 10;
          if (i === 0) { pts.push([mx, PY(r)], [mx + mw, PY(r)]); } else pts.push([mx + i * cs, PY(r)]);
        } else { const j = ((id - 200) / COLS) | 0, c = (id - 200) % COLS; pts.push([PX(c), my + j * cs]); }
        for (const [x, y] of pts) {
          const pop = cd > TUNE.holeCd - 0.2 ? 1 + (cd - TUNE.holeCd + 0.2) * 3 : 1;
          dspr(Sp.plug, x, y, pop);
          ctx.strokeStyle = 'rgba(255,214,120,0.9)'; ctx.lineWidth = Math.max(1.5, cs * 0.045);
          ctx.beginPath(); ctx.arc(x, y, cs * 0.24, -Math.PI / 2, -Math.PI / 2 + TAU * (cd / TUNE.holeCd)); ctx.stroke();
        }
      }
      // portes coulissantes
      if (M.doors.length) {
        for (const d of M.doors) {
          const k = doorK[d.id];
          let x0, y0, x1, y1;
          if (d.v) { x0 = x1 = mx + d.i * cs; y0 = my + d.r * cs; y1 = y0 + cs; } else { y0 = y1 = my + d.j * cs; x0 = mx + d.c * cs; x1 = x0 + cs; }
          const col = d.g ? '#c08bff' : '#ff5d73';
          const warn = S.warn[d.g] && !S.closed[d.id] && ((rt * 8) | 0) % 2 === 0;
          // montants
          ctx.fillStyle = '#2a3138';
          for (const [px, py] of [[x0, y0], [x1, y1]]) { circ(ctx, px, py, cs * 0.12); ctx.fill(); }
          ctx.fillStyle = warn ? '#ffffff' : col;
          for (const [px, py] of [[x0, y0], [x1, y1]]) { circ(ctx, px, py, cs * 0.06); ctx.fill(); }
          if (k > 0.02) {                     // le battant glisse depuis le montant de départ
            const ex = lerp(x0, x1, k), ey = lerp(y0, y1, k);
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = cs * 0.2; ctx.beginPath(); ctx.moveTo(x0, y0 + cs * 0.04); ctx.lineTo(ex, ey + cs * 0.04); ctx.stroke();
            ctx.strokeStyle = '#4a5560'; ctx.lineWidth = cs * 0.17; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = col; ctx.lineWidth = cs * 0.07; ctx.stroke();
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
            ctx.drawImage(d.g ? G.pink : G.red, (x0 + ex) / 2 - cs * 0.5, (y0 + ey) / 2 - cs * 0.5, cs, cs);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          } else if (warn || S.warn[d.g]) {
            ctx.setLineDash([cs * 0.08, cs * 0.08]); ctx.strokeStyle = hexA(col, warn ? 0.9 : 0.4); ctx.lineWidth = Math.max(1, cs * 0.03);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
          }
        }
      }
      // le néon des murs respire doucement
      if (glowC) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16 + 0.1 * Math.sin(rt * 1.7) + superVis * 0.12;
        ctx.drawImage(glowC, 0, 0, W, H);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // fromages
      const intro = mode === 'intro';
      for (let i = 0; i < S.cheese.length; i++) {
        const q = S.cheese[i];
        if (!q.on) continue;
        let sc = 1;
        if (intro) { const k = (modeT - 0.5 - i * 0.07) / 0.3; if (k <= 0) continue; sc = backOut(k); }
        const X = PX(q.c), Y = PY(q.r) + Math.sin(rt * 3 + i * 1.7) * cs * 0.04;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42 + Math.sin(rt * 4 + i) * 0.08;
        ctx.drawImage(G.gold, X - cs * 0.55 * sc, Y - cs * 0.55 * sc, cs * 1.1 * sc, cs * 1.1 * sc);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        dspr(Sp.cheese, X, Y, sc);
        if (((rt * 0.7 + i * 0.37) % 1) < 0.06) { const a = ((rt * 0.7 + i * 0.37) % 1) / 0.06; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(a * Math.PI); ctx.drawImage(G.spark, X + cs * 0.12 - cs * 0.2, Y - cs * 0.18 - cs * 0.2, cs * 0.4, cs * 0.4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      // gros fromage
      if (S.big.st === 1 || (S.big.st === 0 && S.t > TUNE.bigAt - 1.2)) {
        const X = PX(S.big.c), Y = PY(S.big.r);
        if (S.big.st === 1) {
          const k = clamp((S.t - TUNE.bigAt) / 0.45, 0, 1), sc = backOut(k);
          ctx.globalCompositeOperation = 'lighter';
          ctx.save(); ctx.translate(X, Y); ctx.rotate(rt * 0.6); ctx.globalAlpha = 0.6 * k; dspr(Sp.rays, 0, 0, 0.8 + Math.sin(rt * 3) * 0.06); ctx.restore();
          ctx.globalAlpha = 0.7 * k; ctx.drawImage(G.gold, X - cs * 1.1, Y - cs * 1.1, cs * 2.2, cs * 2.2);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          dspr(Sp.big, X, Y - (1 - k) * cs * 2 + Math.sin(rt * 3) * cs * 0.04, sc * (1 + Math.sin(rt * 5) * 0.04));
        } else {                                  // annonce : une lueur qui grandit
          const k = 1 - (TUNE.bigAt - S.t) / 1.2;
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * k;
          ctx.drawImage(G.gold, X - cs * k, Y - cs * k, cs * 2 * k, cs * 2 * k);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
      if (rays > 0) {
        const a = Math.min(1, rays) * 0.8;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
        ctx.save(); ctx.translate(PX(S.mouse.x), PY(S.mouse.y)); ctx.rotate(rt * 0.8); dspr(Sp.rays, 0, 0, 1.3); ctx.rotate(-rt * 1.7); dspr(Sp.rays, 0, 0, 0.9); ctx.restore();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // pendant l'intro : décor assombri, projecteurs sur les deux personnages
      if (intro) {
        const t = modeT, D = introDur;
        const dim = t < D - 2.1 ? Math.min(1, t * 3) : Math.max(0, (D - 1.75 - t) / 0.35);
        if (dim > 0) {
          ctx.fillStyle = 'rgba(3,7,11,' + (0.55 * dim).toFixed(3) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40);
          ctx.globalCompositeOperation = 'lighter';
          for (const e of [S.mouse, S.cat]) { ctx.globalAlpha = 0.42 * dim; ctx.drawImage(e.p ? G.cyan : G.amber, PX(e.x) - cs * 1.6, PY(e.y) - cs * 1.6, cs * 3.2, cs * 3.2); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
      // personnages (le plus bas à l'écran devant)
      const m = S.mouse, c = S.cat;
      const caught = endI && endI.kind === 'caught', pinned = caught && endI.t >= endI.cine;
      const order = (caught && !pinned) || (!caught && PY(m.y) <= PY(c.y)) ? [[m, VM], [c, VC]] : [[c, VC], [m, VM]];
      for (const [e, v] of order) {
        const inTun = e.kind === 'mouse' && !(e.x >= 0 && e.x <= COLS - 1);
        if (inTun) { ctx.save(); ctx.beginPath(); ctx.rect(mx, 0, mw, H); ctx.clip(); }
        if (intro) {                                 // arrivée en rebond
          const k = clamp((modeT - 0.25 - (e.kind === 'cat' ? 0.15 : 0)) / 0.45, 0, 1);
          if (k > 0) {
            ctx.save(); ctx.translate(PX(e.x), PY(e.y)); ctx.scale(backOut(k), backOut(k)); ctx.translate(-PX(e.x), -PY(e.y));
            drawEnt(e, v); ctx.restore();
          }
          if (inTun) ctx.restore();
          continue;
        }
        drawEnt(e, v);
        if (pinned && e === m) {                     // la grosse patte du chat posée sur la souris
          // la patte du chat écrase la queue de la souris (le visage triste reste bien visible)
          const k = Math.min(1, (endI.t - endI.cine) * 8);
          const tb = VM.tail, n = tb ? tb.length / 2 : 0, ti = Math.min(n - 1, 3);
          const px = n ? tb[ti * 2] : PX(m.x) - Math.cos(VM.ang) * cs * 0.5, py = n ? tb[ti * 2 + 1] : PY(m.y) - Math.sin(VM.ang) * cs * 0.5;
          const a = Math.atan2(py - PY(c.y), px - PX(c.x)), s = cs * 0.3 * (1.25 - 0.25 * k);
          ctx.save(); ctx.translate(px, py); ctx.rotate(a);
          ell(ctx, -s * 0.9, 0, s * 1.1, s * 0.55); ctx.fillStyle = '#e3934f'; ctx.fill();
          ctx.lineWidth = Math.max(1.5, cs * 0.05); ctx.strokeStyle = PL[c.p].color; ctx.stroke();
          ell(ctx, 0, 0, s * 0.62, s * 0.68); ctx.fillStyle = '#f6e6d4'; ctx.fill(); ctx.strokeStyle = PL[c.p].color; ctx.stroke();
          ell(ctx, -s * 0.1, 0, s * 0.26, s * 0.3); ctx.fillStyle = '#ff9fb4'; ctx.fill();
          for (let i = -1.5; i <= 1.5; i++) { ell(ctx, s * 0.36, i * s * 0.26, s * 0.12, s * 0.1); ctx.fillStyle = '#ff9fb4'; ctx.fill(); }
          ctx.restore();
        }
        if (inTun) {                                 // dans un tunnel : visible des deux côtés
          const sx = e.x < 0 ? COLS : -COLS;
          ctx.save(); ctx.translate(sx * cs, 0); drawEnt(e, v, true); ctx.restore();
          ctx.restore();
        }
      }
      // poussières qui flottent dans la lumière
      ctx.globalCompositeOperation = 'lighter';
      for (const m of MOTES) {
        const a = (0.5 + 0.5 * Math.sin(rt * m.f + m.ph)) * 0.35, s = cs * m.s;
        ctx.globalAlpha = a; ctx.drawImage(G.dust, PX(m.x) - s, PY(m.y) - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // particules
      for (const q of PT) {
        const a = q.life / q.max, X = PX(q.x), Y = PY(q.y);
        if (q.add) continue;
        if (q.k === 'dust') {
          ctx.globalAlpha = a * 0.75; const s = q.s * cs * (1.6 - a * 0.6);
          ctx.drawImage(G.dust, X - s, Y - s, s * 2, s * 2);
        } else if (q.k === 'crumb') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.save(); ctx.translate(X, Y); ctx.rotate(q.r);
          ctx.fillStyle = q.col; const s = q.s * cs;
          ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s * 0.9, -s * 0.3); ctx.lineTo(s * 0.3, s * 0.8); ctx.closePath(); ctx.fill();
          ctx.restore();
        } else if (q.k === 'star') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = q.col; starPath(ctx, X, Y, q.s * cs, 5, 0.45, q.r); ctx.fill();
        } else if (q.k === 'conf') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.save(); ctx.translate(X, Y); ctx.rotate(q.r); ctx.scale(1, Math.cos(q.r * 3)); ctx.fillStyle = q.col; ctx.fillRect(-q.s * cs, -q.s * cs * 0.5, q.s * cs * 2, q.s * cs); ctx.restore();
        } else if (q.k === 'drop') {
          ctx.globalAlpha = a; ctx.fillStyle = '#9fdcff'; ell(ctx, X, Y, q.s * cs * 0.6, q.s * cs); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (const q of PT) {
        if (!q.add) continue;
        const a = q.life / q.max, X = PX(q.x), Y = PY(q.y), s = q.s * cs * (0.5 + a * 0.5);
        ctx.globalAlpha = a > 0.6 ? 1 : a / 0.6;
        ctx.drawImage(q.col === 'gold' ? G.gold : q.col === 'cyan' ? G.cyan : q.col === 'amber' ? G.amber : q.col === 'pink' ? G.pink : G.spark, X - s, Y - s, s * 2, s * 2);
      }
      for (const g of RG) {
        const a = g.life / g.max, r = lerp(g.r1, g.r0, a) * cs;
        ctx.globalAlpha = a; ctx.strokeStyle = g.col; ctx.lineWidth = g.w * (0.4 + a) * Math.max(1, cs / 30);
        circ(ctx, PX(g.x), PY(g.y), r); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    // ------------------------------------------------------------- textes
    function setFont(px, body) { ctx.font = (body ? '600 ' : '') + px + 'px ' + (body ? FB : FD); }
    function txt(s, x, y, px, col, align, body, stroke) {
      setFont(px, body);
      ctx.textAlign = align || 'center';
      if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(2,6,10,0.88)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y);
    }
    function fitPx(s, maxW, px, body) { setFont(px, body); const w = ctx.measureText(s).width; return w > maxW ? Math.max(9, Math.floor((px * maxW) / w)) : px; }
    function wrap(s, maxW, px, body) {
      setFont(px, body);
      const words = s.split(' '), lines = [];
      let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
      return lines;
    }

    // ------------------------------------------------------------- bandeau de chaque joueur (temps, fromages, rôle)
    function drawStrip(p) {
      const role = S.mouseP === p ? 'mouse' : 'cat';
      ctx.save();
      if (p === 1) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      const x0 = mx > 40 ? mx : 0, w = mx > 40 ? mw : W, y0 = H - sh, h = sh, cy = y0 + h * 0.56;
      const ic = Math.min(h * 0.86, 34);
      const fs = Math.round(clamp(h * 0.4, 11, 17));      // l'icône et le nom du rôle sont dans le fond pré-rendu
      setFont(fs, false);
      const roleW = ctx.measureText(role === 'mouse' ? 'SOURIS' : 'CHAT').width;
      // temps restant
      const left = Math.max(0, S.dur - S.t), secs = Math.ceil(left - 1e-6), urgent = left < 10 && mode === 'play';
      const tf = Math.round(clamp(h * 0.52, 13, 22) * (1 + timePop * 0.35));
      const tx = x0 + w - 10;
      const tcol = urgent ? (((rt * 4) | 0) % 2 ? '#ff4d5e' : '#ffffff') : '#e9f0f3';
      txt(secs + ' s', tx, cy + tf * 0.36, tf, timePop > 0 ? '#ffd34d' : tcol, 'right', false, 3);
      setFont(Math.round(clamp(h * 0.52, 13, 22)), false);
      const tw = ctx.measureText('40 s').width;
      // horloge
      const kx = tx - tw - ic * 0.42, kr = ic * 0.3;
      circ(ctx, kx, cy, kr); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(kx, cy); ctx.arc(kx, cy, kr, -Math.PI / 2, -Math.PI / 2 + TAU * (left / S.dur)); ctx.closePath();
      ctx.fillStyle = urgent ? '#ff4d5e' : ACCENT; ctx.fill();
      circ(ctx, kx, cy, kr); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
      // fromages mangés (10 icônes)
      const n = S.cheese.length, eaten = n - S.left;
      const fx0 = x0 + 18 + ic * 1.15 + roleW, fx1 = kx - kr - 10, avail = fx1 - fx0;
      const step = Math.min(ic * 0.62, avail / Math.max(1, n)), sz = Math.min(step * 1.05, ic * 0.66);
      const Sp = sprites(), sx = fx0 + (avail - step * n) / 2 + step / 2;
      for (let i = 0; i < n; i++) {
        const on = i < eaten, bump = on && i === eaten - 1 ? hudBump[p] : 0;
        ctx.globalAlpha = on ? 1 : 0.22;
        dspr(Sp.cheese, sx + i * step, cy - bump * sz * 0.3, (sz / Sp.cheese.w) * (1 + bump * 0.6));
      }
      ctx.globalAlpha = 1;
      // barre de temps fine sur le bord intérieur du bandeau
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0, y0 + 2, w, 3);
      ctx.fillStyle = urgent ? '#ff4d5e' : hexA(PL[p].color, 0.85); ctx.fillRect(x0, y0 + 2, w * (left / S.dur), 3);
      if (timePop > 0) { txt('+' + TUNE.bonkGain + ' s', kx - kr - 6, cy - tf * 0.8, Math.round(tf * 0.8), '#ffd34d', 'right', false, 3); }
      ctx.restore();
    }

    // ------------------------------------------------------------- joysticks sous les doigts
    function drawJoy(p) {
      const j = joy[p];
      if (!j) return;
      const col = PL[p].color, G = glows();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      ctx.drawImage(p ? G.cyan : G.amber, j.bx - JR * 1.5, j.by - JR * 1.5, JR * 3, JR * 3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      circ(ctx, j.bx, j.by, JR); ctx.fillStyle = 'rgba(6,12,18,0.42)'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = hexA(col, 0.85); ctx.stroke();
      circ(ctx, j.bx, j.by, JR * 0.55); ctx.lineWidth = 1; ctx.strokeStyle = hexA(col, 0.3); ctx.stroke();
      const dx = j.x - j.bx, dy = j.y - j.by, d = Math.hypot(dx, dy), k = d > JR ? JR / d : 1;
      const kx = j.bx + dx * k, ky = j.by + dy * k;
      if (j.dir >= 0) {                             // flèche de la direction choisie
        const a = Math.atan2(DY[j.dir], DX[j.dir]);
        ctx.save(); ctx.translate(j.bx, j.by); ctx.rotate(a);
        ctx.fillStyle = hexA(col, 0.9);
        ctx.beginPath(); ctx.moveTo(JR + 10, 0); ctx.lineTo(JR - 2, -9); ctx.lineTo(JR - 2, 9); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      circ(ctx, kx, ky, 19);
      ctx.fillStyle = rad(ctx, kx - 6, ky - 7, 2, kx, ky, 19, [0, '#ffffff', 0.35, shade(col, 0.35), 1, shade(col, -0.25)]); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
    }

    // ------------------------------------------------------------- carte d'intro et comptes à rebours (tournés vers chacun)
    function drawCard(p, a, slide) {
      const role = S.mouseP === p ? 'mouse' : 'cat';
      ctx.save();
      if (p === 1) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      const cw = Math.min(380, W - 24), ch = Math.min(206, H * 0.27);
      const cx = W / 2, cy = H * 0.75 + (1 - slide) * H * 0.32;
      ctx.globalAlpha = a;
      const x0 = cx - cw / 2, y0 = cy - ch / 2;
      rrect(ctx, x0, y0, cw, ch, 18);
      ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ch, [0, 'rgba(18,30,40,0.95)', 1, 'rgba(8,14,20,0.95)']); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = hexA(PL[p].color, 0.16); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = PL[p].color; ctx.stroke();
      ctx.fillStyle = PL[p].color; ctx.fillRect(x0 + 18, y0, cw - 36, 3);
      // portrait (tête du joueur avec oreilles et moustaches)
      const hs = Math.min(ch * 0.52, cw * 0.25), px = x0 + 20 + hs * 0.62, py = y0 + ch * 0.5 + hs * 0.08;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.6;
      const G = glows(); ctx.drawImage(p ? G.cyan : G.amber, px - hs, py - hs, hs * 2, hs * 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
      ctx.save(); ctx.translate(px, py + Math.sin(rt * 3) * 2); drawHeadAt(ctx, p, role, 'n', hs, rt, 0, 0, Math.sin(rt * 4) * 0.08, 0); ctx.restore();
      // textes
      const tx = px + hs * 0.78, tw = x0 + cw - 14 - tx;
      const top = 'MANCHE ' + S.round + ' · ' + S.M.name.toUpperCase();
      txt(top, tx, y0 + 24, fitPx(top, tw, 12, true), '#8aa0ae', 'left', true, 0);
      const T = AIP && p === AIP.p ? [role === 'mouse' ? 'L’IA EST LA SOURIS' : 'L’IA EST LE CHAT', 'niveau ' + AI_NAME[aiLevel()].toLowerCase()] : ROLE_TXT[role];
      const t1 = fitPx(T[0], tw, Math.round(Math.min(26, ch * 0.13)), false);
      txt(T[0], tx, y0 + 30 + t1, t1, PL[p].color, 'left', false, 4);
      const t2 = fitPx(T[1], tw, Math.round(Math.min(19, ch * 0.1)), true);
      txt(T[1], tx, y0 + 36 + t1 + t2 * 1.1, t2, '#ffffff', 'left', true, 3);
      const NB = '\u00a0';                          // espace insécable : « 40 s » ne se coupe pas
      const tips = role === 'mouse'
        ? ['Glisse ton doigt pour courir. Tiens ' + S.dur + NB + 's ou mange les ' + S.cheese.length + NB + 'fromages !',
          'Tiens ' + S.dur + NB + 's ou mange les ' + S.cheese.length + NB + 'fromages. Les petits trous sont à toi !',
          'Le gros fromage du milieu fait peur au chat : fonce-lui dessus !']
        : ['Glisse ton doigt pour courir. Les petits trous sont réservés à la souris !',
          'Fonce en ligne droite : tout près d’elle, tu bondis !',
          S.M.doors.length ? 'Attention, les portes s’ouvrent et se ferment !' : 'Coupe-lui la route aux carrefours !'];
      let info = AIP && p === AIP.p ? AI_TIP[aiLevel()] : tips[Math.min(2, S.round - 1)];
      const ip = Math.round(Math.min(14, ch * 0.075));
      let ly = y0 + 46 + t1 + t2 * 1.1, nl = 3;
      if (!(AIP && p === AIP.p) && padShow(p)) {          // à la manette : stick / croix au lieu du doigt
        info = info.replace(/^Glisse ton doigt pour courir\. ?/, '');
        ly += ip * 1.3; nl = 2;
        const r = ip * 0.82, gy = ly - ip * 0.36;
        try { PAD.drawGlyph(ctx, 'ls', tx + r, gy, r, p); PAD.drawGlyph(ctx, 'dpad', tx + r * 3.9, gy, r, p); } catch (e) { /* rien */ }
        txt('/', tx + r * 2.45, ly, ip, '#a9c2d4', 'center', true, 0);
        txt(S.round === 1 ? 'pour courir' : 'courir', tx + r * 5.2, ly, ip, '#ffffff', 'left', true, 0);
      }
      const lines = wrap(info, tw, ip, true).slice(0, nl);
      for (let i = 0; i < lines.length; i++) txt(lines[i], tx, ly + ip * 1.3 * (i + 1), ip, '#a9c2d4', 'left', true, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawCount(p, label, k, col) {
      ctx.save();
      if (p === 1) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      const s = 1 + (1 - easeOut(Math.min(1, k * 2.5))) * 0.8, a = k < 0.75 ? 1 : (1 - k) / 0.25;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(W / 2, H * 0.75); ctx.scale(s, s);
      const px = Math.round(Math.min(96, H * 0.11));
      const G = glows();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.45; ctx.drawImage(G.gold, -px * 1.4, -px * 1.4, px * 2.8, px * 2.8);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = clamp(a, 0, 1);
      ctx.textBaseline = 'middle';
      txt(label, 0, 0, px, col || '#ffffff', 'center', false, Math.max(4, px * 0.1));
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawIntro() {
      const t = modeT, D = introDur;
      // assombrir le décor pendant les cartes, projecteurs sur les personnages
      const cardIn = 0.35, cardOut = D - 2.1;
      for (const p of [0, 1]) {
        if (SOLO && p !== VIEWER) continue;          // vue SOLO : la carte d'intro et le compte à rebours du lecteur seulement
        if (t > cardIn && t < cardOut + 0.4) {
          const kin = easeOut((t - cardIn) / 0.45), kout = t > cardOut ? easeOut((t - cardOut) / 0.4) : 0;
          drawCard(p, 1 - kout, kin * (1 - kout * 0.4));
        }
        const c0 = D - 1.75;
        if (t >= c0) {
          const i = Math.floor((t - c0) / 0.55), k = ((t - c0) % 0.55) / 0.55;
          if (i < 3) drawCount(p, String(3 - i), k, '#ffffff');
        }
      }
    }

    // ------------------------------------------------------------- mise à jour
    // petits bandeaux d'événement, un par joueur, tournés vers lui (au bord de sa moitié, sans masquer le centre)
    const BAN = [null, null];
    function banner(p, text, col) { BAN[p] = { text, col: col || '#ffffff', t: 0, dur: 1.5 }; }
    function bannerRoles(mouseTxt, mouseCol, catTxt, catCol) { if (!S) return; banner(S.mouseP, mouseTxt, mouseCol); banner(S.catP, catTxt, catCol); }
    function drawBanner(p) {
      const b = BAN[p];
      if (!b || b.t >= b.dur) return;
      ctx.save();
      if (p === 1) { ctx.translate(W, H); ctx.rotate(Math.PI); }
      const k = b.t, a = k < 0.12 ? k / 0.12 : k > b.dur - 0.3 ? Math.max(0, (b.dur - k) / 0.3) : 1;
      const sc = k < 0.25 ? 0.7 + 0.45 * Math.sin((k / 0.25) * Math.PI * 0.75) : 1;
      const px = Math.round(clamp(cs * 0.48, 14, 24));
      setFont(px, false);
      const tw = Math.min(W - 24, ctx.measureText(b.text).width + px * 1.4), bh = px * 1.75;
      const cx = W / 2, cy = H - sh - cs * 1.25 - bh / 2;
      ctx.globalAlpha = a;
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      rrect(ctx, -tw / 2, -bh / 2, tw, bh, bh / 2);
      ctx.fillStyle = 'rgba(6,11,16,0.82)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = b.col; ctx.stroke();
      ctx.textBaseline = 'middle';
      txt(b.text, 0, px * 0.06, fitPx(b.text, tw - px * 0.8, px, false), b.col, 'center', false, 3);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    const evN = {};                                  // compteur d'événements (tests automatiques)
    function fire(ev) {
      evN[ev.k] = (evN[ev.k] || 0) + 1;
      const m = S.mouse, c = S.cat;
      switch (ev.k) {
        case 'eat': {
          const q = ev.d;
          burst('crumb', q.c, q.r, 12, 2.6, 0.6, 0.07, ['#ffd84d', '#ffe680', '#f0a425', '#fff3b0'], false);
          burst('spark', q.c, q.r, 6, 2, 0.4, 0.22, ['gold'], true);
          ring(q.c, q.r, 0.2, 0.75, 0.35, '#ffd34d', 2.5);
          SFX.miam();
          hudBump[0] = hudBump[1] = 1;
          if (S.left === 1 && can('last', 1)) { after(0.2, () => tone(990, 0.12, 'sine', 0.025, 1320)); bannerRoles('PLUS QU’UN FROMAGE !', ACCENT, 'PROTÈGE LE DERNIER FROMAGE !', '#ff8fa3'); }
          break;
        }
        case 'bigspawn':
          ring(S.big.c, S.big.r, 0.3, 2.2, 0.7, '#ffd34d', 3);
          burst('spark', S.big.c, S.big.r, 18, 3.2, 0.7, 0.3, ['gold'], true);
          SFX.big();
          bannerRoles('GROS FROMAGE AU CENTRE !', ACCENT, 'GARE AU GROS FROMAGE !', ACCENT);
          break;
        case 'super':
          flash = 0.55; flashCol = '#ffe68a'; shake = Math.max(shake, 0.35);
          ring(m.x, m.y, 0.3, 3.2, 0.6, '#ffd34d', 4); ring(m.x, m.y, 0.2, 2, 0.45, '#ffffff', 2.5);
          burst('spark', m.x, m.y, 26, 4, 0.8, 0.32, ['gold'], true);
          burst('crumb', m.x, m.y, 14, 3, 0.7, 0.09, ['#ffd84d', '#fff3b0'], false);
          VC.startle = 1; superVis = 1;
          SFX.super(); vibrate(40);
          bannerRoles('SUPER-SOURIS !', ACCENT, 'FUIS, TU AS PEUR !', '#9fdcff');
          break;
        case 'superend': SFX.superEnd(); if (c.st === 'play') bannerRoles('FIN DU POUVOIR !', '#ffffff', 'À TOI DE JOUER !', '#ffffff'); break;
        case 'pounce': SFX.pounce(); dust(c.x - DX[c.face] * 0.4, c.y - DY[c.face] * 0.4, 6, 1.6); VC.sq = 1; rumble('tick', S.mouseP); break;
        case 'miss': SFX.miss(); dust(c.x, c.y, 8, 1.8); shake = Math.max(shake, 0.15); bannerRoles('OUF !', '#7dff9a', 'RATÉ !', '#ff8fa3'); break;
        case 'bonk':
          SFX.bonk(); vibrate(60); shake = Math.max(shake, 0.6); flash = 0.25; flashCol = '#ffffff';
          burst('star', ev.x, ev.y, 10, 3.5, 0.8, 0.14, ['#ffe680', '#ffffff', '#ffd34d'], false);
          burst('spark', ev.x, ev.y, 14, 3, 0.5, 0.3, ['gold'], true);
          ring(ev.x, ev.y, 0.2, 1.8, 0.45, '#ffffff', 3);
          timePop = 1.4;
          bannerRoles('BOING ! +' + TUNE.bonkGain + ' s', ACCENT, 'AÏE ! AU PANIER !', '#ff8fa3');
          break;
        case 'land': SFX.land(); dust(ev.x, ev.y, 10, 1.4); shake = Math.max(shake, 0.2); break;
        case 'turn':
          if (ev.who === 'cat' ? c.spd > c.vturn * 0.95 : Math.random() < 0.5) dust(ev.x, ev.y, ev.who === 'cat' ? 3 : 2, 0.9);
          (ev.who === 'cat' ? VC : VM).sq = 0.6;
          break;
        case 'start': dust(ev.x, ev.y, 2, 0.8); break;
        case 'stop': dust(ev.x, ev.y, 2, 0.6); break;
        case 'holein': SFX.hole(); dust(ev.x, ev.y, 3, 0.8); break;
        case 'hole': burst('spark', ev.x, ev.y, 6, 1.6, 0.35, 0.18, ['gold'], true); break;
        case 'tunnel': SFX.tunnel(); dust(ev.x, ev.y, 5, 1.2); break;
        case 'door': case 'dooropen': SFX.door(ev.k === 'door'); break;
        default: break;
      }
    }
    // manette (api.pad, CONTRACT.md « Ajout 10 ») : stick gauche ou croix = la direction voulue, comme le joystick sous le doigt
    // (la direction principale + la secondaire pour tourner au prochain carrefour) ; lâché, le personnage garde sa dernière
    // direction (comme quand le doigt se lève). Joueur du haut assis en face : la bibliothèque retourne déjà son stick.
    const PAD = api.pad && typeof api.pad.get === 'function' ? api.pad : null;
    const PADD = [{ dir: -1, dir2: -1 }, { dir: -1, dir2: -1 }];
    function padDir(p) {
      if (!PAD || (AIP && p === AIP.p) || (NET && p !== ME)) return null;
      let g = null;
      try { g = PAD.get(p); } catch (e) { g = null; }
      if (!g || !g.on) return null;
      const mx = g.mx || 0, my = g.my || 0, ax = Math.abs(mx), ay = Math.abs(my);
      if (Math.hypot(mx, my) < 0.4) return null;
      const o = PADD[p];
      if (ax >= ay) { o.dir = mx > 0 ? 0 : 2; o.dir2 = ay > ax * 0.42 ? (my > 0 ? 1 : 3) : -1; }
      else { o.dir = my > 0 ? 1 : 3; o.dir2 = ax > ay * 0.42 ? (mx > 0 ? 0 : 2) : -1; }
      return o;
    }
    function padShow(p) { try { return !!PAD && PAD.active() && PAD.any(p); } catch (e) { return false; } }
    function rumble(kind, p) { try { if (PAD && PAD.rumble && !(AIP && p === AIP.p)) PAD.rumble(kind, p); } catch (e) { /* rien */ } }
    function computeInputs() {
      for (let p = 0; p < 2; p++) {
        const I = INP[p], j = joy[p], e = entOf(p), kh = keys[p], g = padDir(p);
        I.want = -1; I.want2 = -1;
        if (j && j.dir >= 0) { I.want = j.dir; I.want2 = j.dir2; queued[p] = j.dir; }
        else if (g) { I.want = g.dir; I.want2 = g.dir2; queued[p] = g.dir; }
        else if (kh.length) { I.want = kh[kh.length - 1]; I.want2 = kh.length > 1 ? kh[kh.length - 2] : -1; queued[p] = I.want; }
        else if (queued[p] >= 0) {
          if (e && e.dir === queued[p]) queued[p] = -1;
          else I.want = queued[p];
        }
      }
      if (AIB) { const I = INP[AIB.p]; I.want = AIB.want; I.want2 = AIB.want2; }   // le joueur de l'IA : ses directions à elle
    }
    function startEnd() {
      const R = S.result;
      const winner = R.winner, loser = 1 - winner;
      endI = { kind: R.kind, why: R.why, winner, loser, t: 0, cine: R.kind === 'caught' ? 0.62 : 0.05, called: false, cx: S.cat.x, cy: S.cat.y };
      if (NET) { endI.cx += dOff[S.cat.p][0]; endI.cy += dOff[S.cat.p][1]; }   // le bond part de là où on voit le chat
      mode = 'end'; modeT = 0;
      if (R.kind === 'caught') { slowVis = 1; SFX.pounce(); }
      if (HOST) netEndSend();
    }
    function endImpact() {
      const R = endI, m = S.mouse;
      R.called = true;
      let res = null;
      if (!GUEST) {                                     // l'invité ne compte jamais les points : l'hôte décide, la bibliothèque recopie
        try { res = typeof api.point === 'function' ? api.point(R.winner, R.why) : null; } catch (e) { res = null; }
        matchOver = !!(res && res.over);
        if (HOST) nsend({ k: 'P', i: S.round, over: matchOver ? 1 : 0 }, true);
      }
      if (R.kind === 'caught') {
        SFX.miaou(); after(0.05, SFX.squeak); vibrate(220);
        flash = 0.7; flashCol = '#ffffff'; shake = 1; hitStop = 0.11;
        ring(m.x, m.y, 0.2, 2.8, 0.55, '#ffffff', 4); ring(m.x, m.y, 0.2, 1.8, 0.4, PL[R.winner].color, 3);
        burst('star', m.x, m.y, 14, 4, 0.9, 0.15, ['#ffe680', '#ffffff', PL[R.winner].color], false);
        burst('spark', m.x, m.y, 22, 4.5, 0.6, 0.3, [R.winner ? 'cyan' : 'amber'], true);
        dust(m.x, m.y, 14, 2.4);
      } else {
        const x = m.x, y = m.y;
        if (R.kind === 'time') SFX.bell(); else SFX.win();
        after(0.35, SFX.sad);
        flash = 0.45; flashCol = '#ffe68a'; shake = Math.max(shake, 0.4);
        ring(x, y, 0.3, 3.4, 0.7, '#ffd34d', 4);
        burst('conf', x, y, 46, 4.8, 1.5, 0.07, ['#ffd84d', '#fff3b0', PL[R.winner].color, '#ff5fae', '#ffffff'], false);
        burst('spark', x, y, 24, 4, 0.8, 0.32, ['gold'], true);
        for (let i = 0; i < 6; i++) { const fx = 1 + Math.random() * 7, fy = 1 + Math.random() * 15; after(0.15 + i * 0.12, () => { if (S) { burst('conf', fx, fy, 14, 3.2, 1.3, 0.06, ['#ffd84d', '#fff3b0', PL[R.winner].color, '#ff5fae'], false); ring(fx, fy, 0.2, 1.4, 0.45, '#ffd34d', 2); } }); }
        rays = 1.8;
        vibrate(80);
      }
    }
    function update(dt) {
      rt += dt;
      sndBudget = 8;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= rt) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      if (NET) netIn(dt);
      if (!S) return;
      if (hitStop > 0) { hitStop -= dt; if (NET) netOut(dt); return; }        // arrêt sur image à l'impact
      modeT += dt;
      // caméra : petit zoom sur les grands moments
      const zt = endI ? (endI.kind === 'caught' ? (endI.t < endI.cine ? 1 + 0.12 * ease(endI.t / endI.cine) : 1.12 - 0.12 * ease((endI.t - endI.cine - 0.7) / 0.9)) : 1 + 0.08 * Math.min(1, endI.t * 4) - 0.08 * ease((endI.t - 1) / 0.8)) : S.phase === 'pounce' ? 1.06 : 1;
      camZ += (zt - camZ) * Math.min(1, dt * 10);
      if (endI || S.phase === 'pounce') { camX += ((endI ? S.mouse.x : (S.mouse.x + S.cat.x) / 2) - camX) * Math.min(1, dt * 8); camY += ((endI ? S.mouse.y : (S.mouse.y + S.cat.y) / 2) - camY) * Math.min(1, dt * 8); }
      else { camX += (4 - camX) * Math.min(1, dt * 4); camY += (8 - camY) * Math.min(1, dt * 4); }
      shake = Math.max(0, shake - dt * 2.4);
      flash = Math.max(0, flash - dt * 2.2);
      timePop = Math.max(0, timePop - dt * 1.2);
      hudBump[0] = Math.max(0, hudBump[0] - dt * 3); hudBump[1] = hudBump[0];
      superVis = S.mouse.sup > 0 ? Math.min(1, superVis + dt * 3) : Math.max(0, superVis - dt * 2);
      slowVis = (S.phase === 'pounce' || (endI && endI.kind === 'caught' && endI.t < endI.cine + 0.1)) ? Math.min(1, slowVis + dt * 6) : Math.max(0, slowVis - dt * 3);
      music(dt);
      if (mode === 'intro') {
        const c0 = introDur - 1.75;
        for (let i = 0; i < 3; i++) { const at = c0 + i * 0.55; if (modeT >= at && introFired <= i) { introFired = i + 1; SFX.count(); for (const e of [S.mouse, S.cat]) ring(e.x, e.y, 0.3, 1.4, 0.4, PL[e.p].color, 2.5); } }
        if (modeT >= 0.5 && modeT - dt < 0.5) for (let i = 0; i < S.cheese.length; i++) after(i * 0.07, () => SFX.plink(i));
        if (modeT >= introDur) { mode = 'play'; modeT = 0; SFX.go(); goT = 0.8; }
      } else if (mode === 'play') {
        if (resumeT > 0) {
          const before = Math.ceil(resumeT / 0.5);
          resumeT -= dt;
          if (resumeT <= 0) { resumeT = 0; SFX.go(); goT = 0.7; } else if (Math.ceil(resumeT / 0.5) !== before) SFX.count();
        } else {
          const k = S.phase === 'pounce' ? TUNE.slow : 1;
          if (HOST) hostPlay(dt, k);
          else if (GUEST) guestPlay(dt, k);
          else {
            if (AIB) aiTick(AIB, S, rt);
            computeInputs();
            step(S, dt * k, INP);
            for (const ev of S.ev) fire(ev);
            S.ev.length = 0;
          }
          // tic-tac des dernières secondes
          const left = S.dur - S.t, sec = Math.ceil(left);
          if (left < 5.5 && sec !== tickLast && sec > 0) { tickLast = sec; SFX.tick(sec <= 3); }
          if (GUEST ? left < 10 && left > 8.5 && !ban10 : left < 10 && left + dt * k >= 10) { ban10 = true; bannerRoles('PLUS QUE 10 s À TENIR !', ACCENT, 'VITE, PLUS QUE 10 s !', '#ff4d5e'); }
          // cœur qui bat quand le chat est tout près
          const d = Math.hypot(S.mouse.x - S.cat.x, S.mouse.y - S.cat.y);
          VM.danger = S.cat.st === 'play' && S.mouse.sup <= 0 && d < 2.4 ? Math.min(1, (VM.danger || 0) + dt * 4) : Math.max(0, (VM.danger || 0) - dt * 3);
          heartT -= dt;
          if (VM.danger > 0.5 && heartT <= 0) { heartT = 0.45 + d * 0.2; SFX.heart(); }
          if (S.result) startEnd();
        }
      } else if (mode === 'end') {
        endI.t += dt;
        if (!endI.called && endI.t >= endI.cine) endImpact();
        if (endI.called && endI.t >= endI.cine + 1.55 && !matchOver && !GUEST) startRound();   // l'invité attend la manche de l'hôte
      }
      if (goT > 0) goT -= dt;
      for (const b of BAN) if (b) b.t += dt;
      if (rays > 0) rays -= dt;
      // portes (animation)
      for (const d of S.M.doors) { const tgt = S.closed[d.id] ? 1 : 0; doorK[d.id] += (tgt - doorK[d.id]) * Math.min(1, dt * 12); }
      // personnages
      if (NET) withOff(() => { updVis(S.mouse, VM, dt); updVis(S.cat, VC, dt); });
      else { updVis(S.mouse, VM, dt); updVis(S.cat, VC, dt); }
      if (NET) netOut(dt);
      if (S.mouse.sup > 0 && Math.random() < dt * 22) part('spark', S.mouse.x + rnd(-0.3, 0.3), S.mouse.y + rnd(-0.3, 0.3), rnd(-0.5, 0.5), rnd(-0.8, -0.2), 0.5, 0.2, 'gold', true);
      if (S.cat.st === 'play' && S.mouse.sup > 0 && Math.random() < dt * 3) part('drop', S.cat.x + rnd(-0.3, 0.3), S.cat.y - 0.4, rnd(-0.6, 0.6), rnd(-0.4, 0.2), 0.6, 0.06, '', false);
      // particules
      for (let i = PT.length - 1; i >= 0; i--) {
        const q = PT[i];
        q.life -= dt;
        if (q.life <= 0) { PT.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        const dr = q.k === 'dust' ? 3 : q.k === 'conf' ? 1.2 : 2.4;
        q.vx *= Math.max(0, 1 - dr * dt); q.vy *= Math.max(0, 1 - dr * dt);
        if (q.k === 'conf') q.vy += dt * 1.2 * (S.mouseP === 1 ? -1 : 1) * 0;
        q.r += q.vr * dt;
      }
      for (let i = RG.length - 1; i >= 0; i--) { RG[i].life -= dt; if (RG[i].life <= 0) RG.splice(i, 1); }
      for (const m of MOTES) { m.x += m.vx * dt; m.y += m.vy * dt; if (m.x < -0.5) m.x += COLS; else if (m.x > COLS - 0.5) m.x -= COLS; if (m.y < -0.5) m.y += ROWS; else if (m.y > ROWS - 0.5) m.y -= ROWS; }
      for (let i = PR.length - 1; i >= 0; i--) { PR[i].life -= dt; if (PR[i].life <= 0) PR.splice(i, 1); }
    }
    let goT = 0, hitStop = 0, camZ = 1, camX = 4, camY = 8, rays = 0;

    // ------------------------------------------------------------- rendu
    let ox = 0, oy = 0;
    function render() {
      if (destroyed || !S) { if (!destroyed && GUEST) drawWait(); return; }
      if (!bgC) buildBg();
      ox = 0; oy = 0;
      if (shake > 0.01 && !paused) { ox = (Math.random() * 2 - 1) * shake * cs * 0.16; oy = (Math.random() * 2 - 1) * shake * cs * 0.16; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const z = camZ, zx = PX(camX), zy = PY(camY), zoomed = z > 1.002;
      if (zoomed) {                               // zoom : les bandeaux restent fixes, seule la pièce grossit
        ctx.drawImage(bgC, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.rect(0, my * dpr, canvas.width, mh * dpr); ctx.clip();
      }
      ctx.setTransform(dpr * z, 0, 0, dpr * z, (ox + zx - zx * z) * dpr, (oy + zy - zy * z) * dpr);
      ctx.drawImage(bgC, 0, 0, W, H);
      ctx.textBaseline = 'alphabetic';
      drawWorld();
      // dévoilement du labyrinthe au début de la manche (cercle qui s'ouvre depuis le centre)
      if (mode === 'intro' && modeT < 0.6) {
        const k = easeOut(modeT / 0.6), r = Math.hypot(W, H) * 0.6 * k;
        ctx.save(); ctx.beginPath(); ctx.rect(-30, -30, W + 60, H + 60); ctx.arc(W / 2, H / 2, r, 0, TAU, true); ctx.fillStyle = '#05090d'; ctx.fill('evenodd'); ctx.restore();
      }
      // ralenti : vignette sombre et teinte froide
      if (slowVis > 0.01) {
        ctx.fillStyle = rad(ctx, W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.6, [0, 'rgba(10,20,40,0)', 1, 'rgba(4,8,16,' + (0.6 * slowVis).toFixed(3) + ')']);
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
      if (superVis > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rad(ctx, W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6, [0, 'rgba(255,200,60,0)', 1, 'rgba(255,190,50,' + (0.16 * superVis * (0.8 + 0.2 * Math.sin(rt * 8))).toFixed(3) + ')']);
        ctx.fillRect(-20, -20, W + 40, H + 40);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (zoomed) ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (SOLO) {                                  // vue SOLO : seulement le HUD, les bannières et les cartes du lecteur
        drawStrip(VIEWER);
        if (mode === 'play' || mode === 'end') drawBanner(VIEWER);
        if (mode === 'intro') drawIntro();
        if (goT > 0) drawCount(VIEWER, 'GO !', 1 - goT / 0.8, ACCENT);
        if (mode === 'play' && resumeT > 0) { const i = Math.ceil(resumeT / 0.5), k = 1 - (resumeT % 0.5) / 0.5; drawCount(VIEWER, String(i), k, '#ffffff'); }
      } else {
      drawStrip(0); drawStrip(1);
      if (mode === 'play' || mode === 'end') { drawBanner(0); drawBanner(1); }
      if (mode === 'intro') drawIntro();
      if (goT > 0) { for (const p of [0, 1]) drawCount(p, 'GO !', 1 - goT / 0.8, ACCENT); }
      if (mode === 'play' && resumeT > 0) { const i = Math.ceil(resumeT / 0.5), k = 1 - (resumeT % 0.5) / 0.5; for (const p of [0, 1]) drawCount(p, String(i), k, '#ffffff'); }
      }
      drawJoy(0); drawJoy(1);
      if (flash > 0.01) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, flash) * 0.6;
        ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (mode === 'end' && endI && endI.called && !matchOver) {
        const k = clamp((endI.t - endI.cine - 1.2) / 0.35, 0, 1);
        if (k > 0) { ctx.fillStyle = 'rgba(5,9,13,' + k.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      }
      if (paused) { ctx.fillStyle = 'rgba(3,6,10,0.6)'; ctx.fillRect(0, 0, W, H); }
    }

    // ------------------------------------------------------------- boucle
    function frame(now) {
      if (destroyed || paused) return;
      raf = requestAnimationFrame(frame);
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      try { update(dt); } catch (e) { errN++; lastErr = String((e && e.stack) || e).slice(0, 300); }   // la boucle ne doit jamais casser
      try { if (NET) withOff(render); else render(); } catch (e) { errN++; lastErr = String((e && e.stack) || e).slice(0, 300); }
      // qualité adaptative (téléphones modestes) : moyenne sur 150 images de jeu
      const r = performance.now();
      if (prevReal && mode === 'play' && resumeT <= 0) {
        const iv = r - prevReal;
        if (iv < 100) { perfSum += iv; perfN++; }
        if (perfN >= 150) {
          if (perfSum / perfN > 21 && quality > 0.62) { quality = Math.max(0.6, quality - 0.2); layout(); }
          perfSum = 0; perfN = 0;
        }
      }
      prevReal = r;
    }

    // ------------------------------------------------------------- entrées : un joystick sous le doigt de chaque joueur
    const ptrs = new Map(), joy = [null, null], queued = [-1, -1], keys = [[], []];
    const INP = [{ want: -1, want2: -1 }, { want: -1, want2: -1 }];
    const JR = 42, DEAD = 9;
    function joyDir(j) {
      const dx = j.x - j.bx, dy = j.y - j.by, d = Math.hypot(dx, dy);
      if (d > JR) { j.bx = j.x - (dx / d) * JR; j.by = j.y - (dy / d) * JR; }
      if (d < DEAD) return;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax >= ay) { j.dir = dx > 0 ? 0 : 2; j.dir2 = ay > ax * 0.42 ? (dy > 0 ? 1 : 3) : -1; }
      else { j.dir = dy > 0 ? 1 : 3; j.dir2 = ax > ay * 0.42 ? (dx > 0 ? 0 : 2) : -1; }
    }
    function local(e) {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      return FLIP ? [W - x, H - y] : [x, y];          // en ligne, l'écran de l'invité est tourné de 180° par la bibliothèque
    }
    function onDown(e) {
      if (destroyed) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const [x, y] = local(e);
      const p = NET ? ME : y > H / 2 ? 0 : 1;          // en ligne : tout l'écran pilote le joueur de ce téléphone
      if (AIP && p === AIP.p) return;                  // contre l'IA : sa moitié de l'écran ne réagit pas aux doigts
      const j = { id: e.pointerId, p, bx: x, by: y, x, y, dir: -1, dir2: -1, t: rt };
      ptrs.set(e.pointerId, j);
      joy[p] = j;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    }
    function onMove(e) {
      const j = ptrs.get(e.pointerId);
      if (!j) return;
      e.preventDefault();
      const [x, y] = local(e);
      j.x = x; j.y = y;
      joyDir(j);
      joy[j.p] = j;
    }
    function onUp(e) {
      const j = ptrs.get(e.pointerId);
      if (!j) return;
      ptrs.delete(e.pointerId);
      if (j.dir >= 0) queued[j.p] = j.dir;
      if (joy[j.p] === j) {
        let best = null;
        for (const o of ptrs.values()) if (o.p === j.p && (!best || o.t > best.t)) best = o;
        joy[j.p] = best;
      }
    }
    const KEYMAP = { ArrowRight: [0, 0], ArrowDown: [0, 1], ArrowLeft: [0, 2], ArrowUp: [0, 3], d: [1, 0], s: [1, 1], q: [1, 2], a: [1, 2], z: [1, 3], w: [1, 3] };
    function keyOf(e) {
      if (KEYMAP[e.key]) return KEYMAP[e.key];
      const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      return k.length === 1 && KEYMAP[k] ? KEYMAP[k] : null;
    }
    function typing(e) { const t = e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null || typing(e)) return;
      const k = keyOf(e);
      if (!k) { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); return; }
      e.preventDefault();
      const [p, d] = netKey(k), l = keys[p], i = l.indexOf(d);
      if (AIP && p === AIP.p) return;                  // (les touches du joueur de l'IA sont ignorées)
      if (i >= 0) l.splice(i, 1);
      l.push(d);
    }
    // en ligne : flèches et ZQSD pilotent le joueur de ce téléphone, dans le sens de SON écran
    function netKey(k) { return NET ? [ME, FLIP ? OPP[k[1]] : k[1]] : k; }
    function onKeyUp(e) {
      const k = keyOf(e);
      if (!k) return;
      const [p, d] = netKey(k), l = keys[p], i = l.indexOf(d);
      if (AIP && p === AIP.p) return;
      if (i >= 0) l.splice(i, 1);
      if (!l.length) queued[p] = d;
    }
    function onBlur() { keys[0].length = 0; keys[1].length = 0; }
    function prevent(e) { e.preventDefault(); }
    on(canvas, 'pointerdown', onDown);
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'lostpointercapture', onUp);
    on(canvas, 'contextmenu', prevent);
    on(canvas, 'dblclick', prevent);
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(window, 'blur', onBlur);

    let ro = null;
    function onResize() { if (destroyed) return; layout(); if (paused || !raf) { try { render(); } catch (e) { /* rien */ } } }
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(onResize); ro.observe(root); }
    else on(window, 'resize', onResize);

    // ------------------------------------------------------------- jeu EN LIGNE (api.net), chacun sur son téléphone
    // HÔTE (joueur 0) : toute la simulation, comme sur un seul téléphone. La position du personnage de l'invité arrive ~60 fois/s
    // (horodatée avec api.net.now()), acceptée si elle est plausible (couloir praticable, vitesse possible) puis prolongée sur la
    // grille jusqu'à « maintenant ». L'hôte renvoie ~30 fois/s son personnage, le temps, les portes… et en FIABLE les événements
    // (fromage, super-souris, bond, chat renvoyé, fin de manche, sons).
    // INVITÉ (joueur 1) : son personnage bouge tout de suite sous son doigt (mêmes règles de déplacement), l'adversaire est
    // prolongé sur la grille et lissé, les sons et effets sont rejoués d'après les événements. Il ne compte jamais de points.
    // CAPTURE / COUP DE LA SUPER-SOURIS : l'hôte compare les positions des deux joueurs AU MÊME INSTANT de l'horloge commune :
    // celle que l'invité avait chez lui (horodatée) et celle de l'hôte (historique d'1,5 s), rayon de capture inchangé.
    // Les fins « fromages » et « temps » attendent l'arrivée des positions de l'invité jusqu'à cet instant (≤ 0,4 s).
    const NET = api.net && typeof api.net.send === 'function' && typeof api.net.onMessage === 'function' ? api.net : null;
    const ME = NET ? (NET.me === 1 || NET.role === 'guest' ? 1 : 0) : -1, REM = NET ? 1 - ME : -1;
    const HOST = !!NET && ME === 0, GUEST = !!NET && ME === 1, FLIP = !!(NET && NET.flipped);
    const dOff = [[0, 0], [0, 0]];                // décalage d'affichage (en cases) qui fond : corrections réseau sans à-coup
    const relQ = [], gQ = [], hist = [], NLOG = [], TMP = {};
    let snapIn = null, ctlEp = 0, netEp = 0, ownCtl = true, gRep = null, rejN = 0, evOut = [];
    let lastSnap = -1e9, lastRep = -1e9, lastHi = -1e9, snapT = -1, hostRun = 0, hostSeen = -1e9, tT = -1, predEat = {};
    let errN = 0, lastErr = '', ban10 = false, nIn = 0, nOut = 0, lastSig = 0, pendS = null;
    // prolongation de l'adversaire : au plus 0,1 s (au-delà, il est montré un peu en retard plutôt que deviné de travers) ;
    // une correction fond en ~0,1 s, jamais plus vite que 4,5 cases/s de plus que sa vraie vitesse
    const MAXEX = 0.1, STALE = 450, OFF_TAU = 0.07, OFF_VMAX = 4.5;
    const nnow = () => { try { const v = +NET.now(); return isFinite(v) ? v : 0; } catch (e) { return 0; } };
    function nsend(m, rel) { if (!NET || destroyed) return; nOut++; try { NET.send(m, { reliable: !!rel }); } catch (e) { /* rien */ } }
    if (NET) {
      try {
        NET.onMessage((m) => {
          if (destroyed || !m || typeof m !== 'object') return;
          nIn++;
          if (m.k === 's') { if (!snapIn || +m.T > +snapIn.T) snapIn = m; } else if (m.k === 'g') { if (gQ.length < 120) gQ.push(m); } else if (relQ.length < 3000) relQ.push(m);
        });
      } catch (e) { /* rien */ }
    }
    const dxy = (ax, ay, bx, by) => { let dx = Math.abs(ax - bx); dx = Math.min(dx, COLS - dx); const dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
    function lerpW(a, b, f) {
      let d = b - a;
      if (d > COLS / 2) d -= COLS; else if (d < -COLS / 2) d += COLS;
      let x = a + d * f;
      if (x < -0.5) x += COLS; else if (x >= COLS - 0.5) x -= COLS;
      return x;
    }
    const cheeseMask = () => S.cheese.reduce((a, q, i) => a | (q.on ? 1 << i : 0), 0);
    const countOn = () => S.cheese.reduce((a, q) => a + (q.on ? 1 : 0), 0);

    // --- personnage piloté ailleurs : dernier état reçu, prolongé sur la grille (monde « fantôme », S n'est jamais modifié)
    const GS = { M: null, cd: new Float32Array(400), closed: null, ev: [] };
    function gs() { GS.M = S.M; GS.cd.set(S.cd); GS.closed = S.closed; GS.ev.length = 0; return GS; }
    function mkTrack() { return { e: null, T: -1, run: 0, wait: 0 }; }
    let trR = mkTrack(), trO = mkTrack();         // l'adversaire ; mon chat quand l'hôte le pilote (invité)
    const catMul = () => (S.mouse.sup > 0 ? 0.6 : 1);
    // L'adversaire est montré à l'instant « maintenant − D » : D = délai moyen (lissé) au-delà de MAXEX, 0 en général.
    // Un délai moyen, pas celui de chaque message : la gigue du réseau ne devient pas une gigue d'affichage.
    let latAvg = -1;
    function trackSet(tr, ent, a, T, run, now, k, local) {
      if (!(T > tr.T)) return false;
      const g = tr.e || Object.assign({}, ent);
      g.kind = ent.kind; g.p = ent.p; g.vmax = ent.vmax; g.vturn = ent.vturn; g.acc = ent.acc;
      if (!decX(S, a, g)) return false;
      tr.T = T; tr.run = run ? 1 : 0; tr.e = g; tr.wait = 0;
      const lat = Math.max(0, now - T);
      if (!local) latAvg = latAvg < 0 ? lat : latAvg + (lat - latAvg) * 0.05;   // (pas pour un état fabriqué ici)
      const D = Math.max(0, latAvg - MAXEX * 1000), age = Math.min(MAXEX + 0.12, Math.max(0, (lat - D) / 1000));
      if (tr.run && age > 0) { ghostStep(gs(), g, age * k, g.kind === 'cat' ? catMul() : 1); GS.ev.length = 0; }
      return true;
    }
    function trackStep(tr, h, now, fx) {
      const g = tr.e;
      if (!g || !tr.run || !(h > 0) || now - tr.T > STALE || (tr.wait && now < tr.wait)) return;
      ghostStep(gs(), g, h, g.kind === 'cat' ? catMul() : 1);
      if (fx) for (const e of GS.ev) if (e.k === 'turn' || e.k === 'start' || e.k === 'stop') fire(e);
      GS.ev.length = 0;
    }
    function reanchor(e, nx, ny) {               // nouvelle position, mais l'affichage part de là où on voyait le personnage
      const o = dOff[e.p];
      let dx = e.x + o[0] - nx;
      if (dx > COLS / 2) dx -= COLS; else if (dx < -COLS / 2) dx += COLS;
      const dy = e.y + o[1] - ny;
      e.x = nx; e.y = ny;
      if (Math.abs(dx) + Math.abs(dy) > 2) { o[0] = 0; o[1] = 0; } else { o[0] = dx; o[1] = dy; }
    }
    function applyTrack(tr, e, full, re) {
      const g = tr.e;
      if (!g) return;
      if (re) reanchor(e, g.x, g.y); else { e.x = g.x; e.y = g.y; }
      e.dir = g.dir; e.face = g.face; e.spd = g.spd; e.want = g.want; e.want2 = g.want2; e.edge = g.edge; e.edgeT = g.edgeT; e.from = g.from;
      if (full) { e.st = g.st; e.stT = g.stT; e.fx = g.fx; e.fy = g.fy; e.rec = g.rec; if (e.kind === 'mouse') e.sup = g.sup; }
    }
    function withOff(fn) {                        // dessin avec le lissage (la simulation garde les vraies positions)
      const a = S && S.mouse, b = S && S.cat;
      if (!a || !b) return fn();
      const ax = a.x, ay = a.y, bx = b.x, by = b.y;
      const sh = (e, o) => {
        if (!o[0] && !o[1]) return;
        const inside = e.x >= 0 && e.x <= COLS - 1;
        e.x += o[0]; e.y += o[1];
        if (inside) e.x = cl(e.x, 0, COLS - 1);
      };
      sh(a, dOff[a.p]); sh(b, dOff[b.p]);
      try { return fn(); } finally { a.x = ax; a.y = ay; b.x = bx; b.y = by; }
    }

    // --- HÔTE
    function roundMsg() {
      const dc = [];
      for (const d of S.M.doors) if (S.closed[d.id]) dc.push(d.id);
      return { k: 'R', i: S.round, mz: S.M.idx, sd: layoutSeed, mp: S.mouseP, ep: ctlEp, T: nnow(), mt: r3(modeT), md: mode === 'play' ? 1 : 0, q: cheeseMask(), b: S.big.st, dc, t: r3(S.t) };
    }
    function netRoundStart() {                    // chaque manche : labyrinthe, graine et rôles envoyés de façon fiable
      ctlEp++; gRep = null; rejN = 0; hist.length = 0; gQ.length = 0; evOut = []; trR = mkTrack();
      for (const o of dOff) { o[0] = 0; o[1] = 0; }
      nsend(roundMsg(), true);
    }
    const hostHasCat = () => !!S && S.catP === REM && (S.phase === 'pounce' || S.cat.st !== 'play');   // l'hôte pilote le chat de l'invité
    const NI = {
      rem: REM,
      end(w, why, kind) { endAt(nnow(), w, why, kind); },
      hold() { if (S && !S.hold) { const t = nnow(); S.hold = { T: t, at: t, miss: true }; } },
      held() { return !!(S && S.hold); }
    };
    function endAt(T, w, why, kind) {
      if (!S || S.result || (S.hold && !S.hold.miss)) return;
      if (hostHasCat() || !gRep || gRep.T >= T) { S.hold = null; finish(S, w, why, kind); return; }
      S.hold = { T, at: nnow(), w, why, kind };
    }
    function checkHold(now) {
      const hd = S.hold;
      if (!hd || S.result) return;
      if (hd.miss && S.phase !== 'pounce') { S.hold = null; return; }
      if ((gRep && gRep.T >= hd.T) || now - hd.at > 400 || hostHasCat()) {
        S.hold = null;
        if (hd.miss) endPounce(S, S.cat); else finish(S, hd.w, hd.why, hd.kind);
      }
    }
    // 0 = impossible (hors d'un couloir praticable : jamais acceptée), 1 = plausible, 2 = trop rapide depuis la précédente
    function plausible(g, T, remM) {
      if (!onGrid(S, g.x, g.y, remM)) return 0;
      if (gRep && T - gRep.T < 600) {
        const v = g.vmax * (remM ? 1.12 : 1);
        if (dxy(gRep.x, gRep.y, g.x, g.y) > v * ((T - gRep.T) / 1000) * 1.3 + 0.35) return 2;
      }
      return 1;
    }
    function histPush(now) {
      const e = entOf(ME);
      hist.push({ T: now, x: e.x, y: e.y, pz: S.phase === 'pounce' ? 1 : 0, su: S.mouse.sup > 0 ? 1 : 0, st: S.cat.st });
      while (hist.length > 3 && hist[0].T < now - 1500) hist.shift();
    }
    function histAt(T) {
      const n = hist.length;
      if (!n) return null;
      if (T <= hist[0].T) return hist[0];
      if (T >= hist[n - 1].T) return hist[n - 1];
      let i = n - 1;
      while (i > 1 && hist[i - 1].T > T) i--;
      const a = hist[i - 1], b = hist[i], f = (T - a.T) / Math.max(1e-6, b.T - a.T), c = f < 0.5 ? a : b;
      return { x: lerpW(a.x, b.x, f), y: a.y + (b.y - a.y) * f, pz: c.pz, su: c.su, st: c.st };
    }
    // contacts jugés au même instant T : invité = ses positions horodatées (interpolées entre deux envois), hôte = son historique
    function rewind(A, B) {
      const remM = S.mouseP === REM, t0 = A.T, span = B.T - A.T;
      if (!(span > 0)) return;
      const n = Math.max(1, Math.min(40, Math.ceil(span / 8))), from = span > 400 ? n : 1;
      for (let i = from; i <= n; i++) {
        const f = i / n, T = t0 + span * f;
        if (S.hold && !S.hold.miss && T > S.hold.T) return;       // la manche était déjà finie à cet instant
        const H = histAt(T);
        if (!H) return;
        if (remM && H.st !== 'play') continue;                     // chat de l'hôte en vol plané ou en sieste
        const gx = lerpW(A.x, B.x, f), gy = A.y + (B.y - A.y) * f;
        const sup = remM ? S.big.st >= 1 && (A.u - (T - t0) / 1000 > 0 || (B.u > 0 && T >= B.T - (TUNE.superT - B.u) * 1000)) : !!H.su;
        const d = dxy(gx, gy, H.x, H.y);
        if (sup) { if (d < TUNE.bonkR) { if (S.cat.st === 'play') bonk(S); return; } continue; }
        if (d < TUNE.captureR + (H.pz ? 0.08 : 0)) {
          S.hold = null; S.capT = T;
          reanchor(entOf(REM), gx, gy);                            // le personnage de l'invité, là où il était à cet instant
          finish(S, S.catP, 'Attrapée !', 'caught');
          return;
        }
      }
    }
    function hostReports(now, live) {
      if (!gQ.length || !S) { gQ.length = 0; return; }
      gQ.sort((a, b) => (+a.T || 0) - (+b.T || 0));
      const remE = entOf(REM), remM = S.mouseP === REM;
      for (const r of gQ) {
        if (S.result) break;
        const T = +r.T;
        if ((r.i | 0) !== S.round || (r.c | 0) !== ctlEp || !isFinite(T) || (gRep && !(T > gRep.T)) || hostHasCat()) continue;
        Object.assign(TMP, remE);
        if (!decX(S, r.s, TMP)) continue;
        const pl = plausible(TMP, T, remM);
        if (!pl || (pl === 2 && ++rejN < 6)) continue;             // invraisemblable : ignorée (trop rapide 6 fois de suite : on se recale)
        rejN = 0;
        const rep = { T, x: TMP.x, y: TMP.y, u: remM ? TMP.sup : 0, run: r.r ? 1 : 0 };
        if (live && gRep && (rep.run || gRep.run)) rewind(gRep, rep);
        gRep = rep;
        if (S.result) break;
        if (trackSet(trR, remE, r.s, T, rep.run, now, S.phase === 'pounce' ? TUNE.slow : 1)) applyTrack(trR, remE, false, true);
      }
      gQ.length = 0;
    }
    function hostX(m, now) {                      // ce que la souris de l'invité a fait chez lui (fiable)
      if (!S || (m.i | 0) !== S.round || S.result || mode !== 'play' || S.mouseP !== REM) return;
      const T = +m.T, lat = isFinite(T) ? Math.max(0, (now - T) / 1000) : 0, mo = S.mouse;
      if (m.a === 'eat') {
        const q = S.cheese[m.n | 0];
        if (!q || !q.on || dxy(mo.x, mo.y, q.c, q.r) > 3) return;
        q.on = 0; S.left--;
        fire({ k: 'eat', who: 'mouse', x: q.c, y: q.r, d: q });
        if (S.left <= 0) endAt(isFinite(T) ? T : now, S.mouseP, 'Tout le fromage !', 'cheese');
      } else if (m.a === 'big') {
        if (S.big.st !== 1 || dxy(mo.x, mo.y, S.big.c, S.big.r) > 3) return;
        S.big.st = 2; mo.sup = Math.max(0.05, TUNE.superT - lat);
        fire({ k: 'super', who: 'mouse', x: mo.x, y: mo.y, d: null });
        if (S.phase === 'pounce') endPounce(S, S.cat);
      } else if (m.a === 'holein' || m.a === 'hole' || m.a === 'tunnel') {
        const id = m.n | 0;
        if (m.a !== 'holein' && id >= 0 && id < 400) S.cd[id] = Math.max(S.cd[id], TUNE.holeCd - lat);
        fire({ k: m.a, who: 'mouse', x: +m.x || 0, y: +m.y || 0, d: id });
      }
    }
    const FWD = { eat: 1, bigspawn: 1, super: 1, superend: 1, pounce: 1, miss: 1, bonk: 1, land: 1, wake: 1, holein: 1, hole: 1, tunnel: 1, door: 1, dooropen: 1 };
    function handBack(now) {                      // l'hôte rend le chat à l'invité : on le prolonge dès que l'invité a pu le reprendre
      const c = S.cat;
      gRep = { T: now, x: c.x, y: c.y, u: 0, run: 1 };
      trR = mkTrack();
      trackSet(trR, c, encX(c, false), now, 1, now, 1, true);
      let half = 60;
      try { half = Math.min(250, Math.max(0, +NET.rtt() / 2 || 0)); } catch (e) { /* rien */ }
      trR.wait = now + half;
    }
    function hostFwd(e, now) {
      if (!FWD[e.k]) return;
      const remCat = S.catP === REM;
      if (!remCat && e.who === 'mouse' && (e.k === 'superend' || e.k === 'holein' || e.k === 'hole' || e.k === 'tunnel')) return;   // déjà joué chez l'invité
      const o = [e.k, r3(e.x), r3(e.y)], c = S.cat;
      if (e.k === 'eat') o.push(S.cheese.indexOf(e.d));
      else if (e.k === 'holein' || e.k === 'hole' || e.k === 'tunnel' || e.k === 'door' || e.k === 'dooropen') o.push(e.d | 0);
      else if (e.k === 'super') o.push(r3(S.mouse.sup));
      else if (e.k === 'pounce' || e.k === 'bonk') { if (remCat) ctlEp++; o.push(ctlEp, encX(c, e.k === 'pounce')); }
      else if (e.k === 'miss' || e.k === 'wake') { if (remCat) { ctlEp++; handBack(now); } o.push(ctlEp, encX(c, false)); }
      evOut.push(o);
    }
    function flushEv(now) { if (evOut.length && S) { nsend({ k: 'e', i: S.round, T: now, L: evOut }, true); evOut = []; } }
    function snapMsg(now) {
      const own = entOf(ME), c = S.cat, pz = S.phase === 'pounce';
      const o = { k: 's', i: S.round, T: now, m: mode === 'play' ? 1 : 0, mt: r3(modeT), t: r3(S.t), ph: pz ? 1 : 0,
        rs: mode === 'play' && resumeT <= 0 && !S.result && !S.hold ? 1 : 0, w: (S.warn[0] ? 1 : 0) | (S.warn[1] ? 2 : 0),
        q: cheeseMask(), b: S.big.st, h: encX(own, own === c && pz) };
      if (hostHasCat()) { o.g = encX(c, pz); o.ep = ctlEp; }
      return o;
    }
    function netEndSend() {
      flushEv(nnow());
      const R = S.result, m = S.mouse, c = S.cat;
      nsend({ k: 'E', i: S.round, w: R.winner, y: R.why, kd: R.kind, m: [r4(m.x), r4(m.y)], c: [r4(c.x), r4(c.y), c.face], q: cheeseMask(), b: S.big.st, T: nnow() }, true);
    }
    function hostPlay(dt, k) {
      computeInputs();
      const now = nnow();
      // l'invité : on prolonge d'abord l'estimation d'une image, puis on la recale sur ses nouvelles positions (même instant)
      if (!hostHasCat()) { trackStep(trR, dt * k, now, true); applyTrack(trR, entOf(REM), false, false); }
      hostReports(now, true);
      if (!S.result && S.hold) checkHold(now);
      if (!S.result) {
        if (!S.hold && dt > 0) {
          const h = dt * k, n = Math.max(1, Math.ceil(h / 0.008 - 1e-9)), hh = h / n;
          for (let i = 0; i < n && !S.result && !S.hold; i++) subNet(S, hh, INP, NI);
        }
      }
      for (const e of S.ev) { fire(e); hostFwd(e, now); }
      S.ev.length = 0;
      histPush(now);
    }

    // --- INVITÉ
    function guestRound(m, now) {
      const rn = Math.max(1, m.i | 0), T = +m.T, lat = isFinite(T) ? Math.max(0, (now - T) / 1000) : 0;
      if (S && rn <= S.round) {                   // renvoi de la même manche (après « hi ») : on recale juste l'intro
        if (rn === S.round && mode === 'intro' && !m.md) modeT = Math.max(modeT, Math.min(introDur - 0.02, (+m.mt || 0) + lat));
        return;
      }
      mazeIdx = (((m.mz | 0) % PARSED.length) + PARSED.length) % PARSED.length;
      layoutSeed = (+m.sd || 1) >>> 0;
      beginRound(rn, m.mp ? 1 : 0);
      netEp = m.ep | 0; ownCtl = true; trR = mkTrack(); trO = mkTrack(); predEat = {}; snapT = -1; hostRun = 0; tT = -1;
      for (const o of dOff) { o[0] = 0; o[1] = 0; }
      if (typeof m.q === 'number') S.cheese.forEach((q, i) => { q.on = (m.q >> i) & 1; });
      S.left = countOn();
      S.big.st = Math.max(0, Math.min(2, m.b | 0));
      if (Array.isArray(m.dc)) for (const d of S.M.doors) { S.closed[d.id] = m.dc.indexOf(d.id) >= 0 ? 1 : 0; doorK[d.id] = S.closed[d.id]; }
      S.t = Math.max(0, +m.t || 0);
      const mt = (+m.mt || 0) + lat;
      if (m.md) { mode = 'play'; modeT = mt; } else modeT = Math.min(introDur - 0.02, mt);
      introFired = 0;
      for (let i = 0; i < 3; i++) if (modeT >= introDur - 1.75 + i * 0.55) introFired = i + 1;
    }
    function guestSnap(s, now) {
      if (!S) return;
      const si = s.i | 0, T = +s.T;
      if (si !== S.round) { if (si > S.round && now - lastHi > 1000) { lastHi = now; nsend({ k: 'hi' }, true); } return; }
      if (!(T > snapT)) return;
      snapT = T; hostRun = s.rs ? 1 : 0; hostSeen = now;
      if (S.result) return;
      const lat = Math.max(0, (now - T) / 1000), pz = !!s.ph, k = pz ? TUNE.slow : 1;
      S.phase = pz ? 'pounce' : 'play';
      S.warn[0] = s.w & 1; S.warn[1] = (s.w >> 1) & 1;
      tT = (+s.t || 0) + (s.rs ? lat * k : 0);
      for (let i = 0; i < S.cheese.length; i++) {
        const q = S.cheese[i], on = (s.q >> i) & 1;
        if (on && !q.on && predEat[i] && now - predEat[i] > 1500) { q.on = 1; delete predEat[i]; }   // jamais confirmé par l'hôte
        else if (!on && predEat[i]) delete predEat[i];
      }
      S.left = countOn();
      if ((s.b | 0) > S.big.st) S.big.st = Math.min(2, s.b | 0);
      pendS = s;                                  // positions : appliquées après la prolongation de l'image (applyPend)
      if (mode === 'intro') {
        if (s.m === 1) { mode = 'play'; modeT = lat; SFX.go(); goT = 0.8; } else {
          const tm = (+s.mt || 0) + lat, dm = tm - modeT;      // l'intro suit celle de l'hôte, en douceur (sauf gros écart)
          modeT = Math.abs(dm) > 1 ? tm : modeT + cl(dm, -0.06, 0.06);
        }
      }
    }
    function applyPend(now) {
      const s = pendS;
      pendS = null;
      if (!s || !S || (s.i | 0) !== S.round || S.result) return;
      const k = s.ph ? TUNE.slow : 1, T = +s.T, he = entOf(REM);
      if (trackSet(trR, he, s.h, T, s.rs, now, k)) applyTrack(trR, he, true, true);
      if (!ownCtl && Array.isArray(s.g)) { const me = entOf(ME); if (trackSet(trO, me, s.g, T, s.rs, now, k)) applyTrack(trO, me, true, true); }
    }
    function catSt(st, stT, fx, fy, home) {
      const tr = S.catP === ME ? trO : trR;
      for (const o of [S.cat, tr.e]) {
        if (!o) continue;
        o.st = st; o.stT = stT; o.lng = 0;
        if (fx != null) { o.fx = fx; o.fy = fy; }
        if (home) { const hm = S.homes[S.catP]; o.x = hm.c; o.y = hm.r; o.dir = -1; o.edge = -1; o.edgeT = 0; o.from = hm.r * COLS + hm.c; o.face = S.catP === 0 ? 3 : 1; }
      }
      if (home) { dOff[S.catP][0] = 0; dOff[S.catP][1] = 0; }
    }
    function takeOwn(a, T, now, k) {              // l'hôte pilote mon chat (bond, vol plané, sieste)
      ownCtl = false; trO = mkTrack();
      const me = entOf(ME);
      if (trackSet(trO, me, a, T, 1, now, k)) applyTrack(trO, me, true, true);
    }
    function giveOwn(ep, a, lat) {                // … puis me le rend, à l'endroit exact choisi par l'hôte
      const me = entOf(ME), g = Object.assign({}, me);
      netEp = ep | 0;
      if (decX(S, a, g)) {
        reanchor(me, g.x, g.y);
        me.dir = g.dir; me.face = g.face; me.spd = g.spd; me.edge = g.edge; me.edgeT = g.edgeT; me.from = g.from;
        me.rec = Math.max(0, g.rec - lat);
      }
      me.st = 'play'; me.stT = 0; me.lunge = false;
      ownCtl = true; trO = mkTrack();
    }
    function guestEvents(m, now) {
      if (!S || (m.i | 0) !== S.round || S.result || !Array.isArray(m.L)) return;
      const T = +m.T, lat = isFinite(T) ? Math.max(0, (now - T) / 1000) : 0, ownCat = S.catP === ME;
      for (const o of m.L) {
        if (!Array.isArray(o)) continue;
        const k = String(o[0]), E = { k, who: '', x: +o[1] || 0, y: +o[2] || 0, d: null };
        switch (k) {
          case 'eat': { const q = S.cheese[o[3] | 0]; if (q && q.on) { q.on = 0; S.left = countOn(); E.who = 'mouse'; E.d = q; fire(E); } break; }
          case 'bigspawn': S.big.st = Math.max(S.big.st, 1); fire(E); break;
          case 'super':
            S.big.st = 2; S.mouse.sup = Math.max(0.05, (+o[3] || TUNE.superT) - lat);
            if (trR.e && S.mouseP === REM) trR.e.sup = S.mouse.sup;
            E.who = 'mouse'; fire(E); break;
          case 'superend': S.mouse.sup = 0; if (trR.e && S.mouseP === REM) trR.e.sup = 0; E.who = 'mouse'; fire(E); break;
          case 'pounce':
            S.phase = 'pounce';
            if (ownCat) takeOwn(o[4], T, now, TUNE.slow);
            else if (trackSet(trR, S.cat, o[4], T, 1, now, TUNE.slow)) applyTrack(trR, S.cat, true, true);
            E.who = 'cat'; E.d = o[3]; fire(E); break;
          case 'miss': S.phase = 'play'; if (ownCat) giveOwn(o[3], o[4], lat); else if (trR.e) trR.e.lng = 0; E.who = 'cat'; fire(E); break;
          case 'bonk':
            catSt('fly', lat, E.x, E.y, false);
            if (ownCat) takeOwn(o[4], T, now, 1);
            if (!(snapT >= T)) { S.t = Math.min(S.dur, S.t + TUNE.bonkGain); if (tT >= 0) tT += TUNE.bonkGain; }   // « +5 s » tout de suite
            E.who = 'cat'; fire(E); break;
          case 'land': catSt('home', 0, null, null, true); E.who = 'cat'; fire(E); break;
          case 'wake': catSt('play', 0, null, null, false); if (ownCat) giveOwn(o[3], o[4], 0); break;
          case 'holein': E.who = 'mouse'; fire(E); break;
          case 'hole': case 'tunnel': { const id = o[3] | 0; if (id >= 0 && id < 400) S.cd[id] = Math.max(S.cd[id], TUNE.holeCd - lat); E.who = 'mouse'; E.d = id; fire(E); break; }
          case 'door': case 'dooropen': { const id = o[3] | 0; if (id >= 0 && id < 400) S.closed[id] = k === 'door' ? 1 : 0; E.d = id; fire(E); break; }
          default: break;
        }
      }
    }
    function guestEnd(m) {
      if (!S || (m.i | 0) !== S.round || S.result) return;
      const kind = m.kd === 'caught' || m.kd === 'cheese' ? m.kd : 'time';
      S.result = { winner: m.w ? 1 : 0, why: String(m.y || ''), kind };
      S.phase = kind;
      ownCtl = false;
      if (typeof m.q === 'number') { S.cheese.forEach((q, i) => { q.on = (m.q >> i) & 1; }); S.left = countOn(); }   // l'hôte a le dernier mot
      if (typeof m.b === 'number') S.big.st = Math.max(0, Math.min(2, m.b | 0));
      const P = (a) => (Array.isArray(a) && isFinite(+a[0]) && isFinite(+a[1]) ? [cl(+a[0], -0.5, COLS - 0.5001), cl(+a[1], 0, ROWS - 1)] : null);
      const pm = P(m.m), pc = P(m.c);
      if (pm) reanchor(S.mouse, pm[0], pm[1]);
      if (pc) { reanchor(S.cat, pc[0], pc[1]); const f = dirOk(m.c[2]); if (f >= 0) S.cat.face = f; }
      if (mode === 'play' || mode === 'intro') { resumeT = 0; startEnd(); }
    }
    function guestEat(now) {                      // prédiction : je mange tout de suite, l'hôte confirme
      const m = S.mouse;
      for (let i = 0; i < S.cheese.length; i++) {
        const q = S.cheese[i];
        if (q.on && near(m, q.c, q.r, TUNE.eatR)) {
          q.on = 0; predEat[i] = now; S.left = countOn();
          ev(S, 'eat', m, q);
          nsend({ k: 'x', i: S.round, a: 'eat', n: i, T: now }, true);
        }
      }
      if (S.big.st === 1 && near(m, S.big.c, S.big.r, TUNE.eatR + 0.05)) {
        S.big.st = 2; m.sup = TUNE.superT;
        ev(S, 'super', m);
        nsend({ k: 'x', i: S.round, a: 'big', T: now }, true);
      }
    }
    const guestRunning = () => mode === 'play' && resumeT <= 0 && ownCtl && !paused && !!S && !S.result;
    function guestPlay(dt, k) {
      if (S.result) return;
      const now = nnow(), me = entOf(ME), h = dt * k;
      if (ownCtl) {                               // MON personnage : tout de suite, sans attendre le réseau
        computeInputs();
        if (h > 0) {
          const n = Math.max(1, Math.ceil(h / 0.008 - 1e-9)), hh = h / n;
          for (let i = 0; i < n; i++) {
            if (me.kind === 'mouse') {
              if (me.sup > 0) { me.sup -= hh; if (me.sup <= 0) { me.sup = 0; ev(S, 'superend', me); } }
              moveEnt(S, me, INP[ME], hh, me.sup > 0 ? 1.12 : 1);
              guestEat(now);
            } else {
              if (me.rec > 0) me.rec -= hh;
              moveEnt(S, me, INP[ME], hh, (S.mouse.sup > 0 ? 0.6 : 1) * (me.rec > 0 ? 0.5 : 1));
            }
          }
        }
      } else { trackStep(trO, h, now, false); applyTrack(trO, me, true, false); }
      if (hostRun) { trackStep(trR, h, now, true); applyTrack(trR, entOf(REM), true, false); }
      applyPend(now);                             // puis recalage sur le dernier état reçu (même instant : seule l'erreur est lissée)
      // temps de manche : avance ici, recalé en douceur sur celui de l'hôte
      if (hostRun && now - hostSeen < STALE) S.t += h;
      if (tT >= 0) {
        const d = tT + (hostRun ? ((now - hostSeen) / 1000) * k : 0) - S.t;
        S.t += Math.abs(d) > 1 ? d : d * Math.min(1, dt * 4);
      }
      S.t = cl(S.t, 0, S.dur);
      const ids = S.M.cdIds;
      for (let i = 0; i < ids.length; i++) if (S.cd[ids[i]] > 0) S.cd[ids[i]] = Math.max(0, S.cd[ids[i]] - h);
      for (const e of S.ev) {                     // effets de mes déplacements tout de suite ; trous et tunnels : l'hôte est prévenu
        fire(e);
        if (e.who === me.kind && (e.k === 'holein' || e.k === 'hole' || e.k === 'tunnel')) nsend({ k: 'x', i: S.round, a: e.k, n: e.d | 0, x: r3(e.x), y: r3(e.y), T: now }, true);
      }
      S.ev.length = 0;
    }

    // --- tous les messages passent ici, une fois par image (jamais pendant la pause)
    function netIn() {
      const now = nnow();
      if (HOST) {
        for (const m of relQ) {
          if (m.k === 'hi') { if (S && (mode === 'intro' || mode === 'play')) nsend(roundMsg(), true); } else if (m.k === 'x') hostX(m, now);
        }
        relQ.length = 0;
        if (S && !(mode === 'play' && resumeT <= 0)) hostReports(now, false);   // hors jeu : on suit sans juger de contact
      } else {
        for (const m of relQ) {
          if (m.k === 'R') guestRound(m, now);
          else if (m.k === 'e') guestEvents(m, now);
          else if (m.k === 'E') guestEnd(m);
          else if (m.k === 'P') { if (S && (m.i | 0) === S.round) matchOver = !!m.over; }
        }
        relQ.length = 0;
        if (snapIn) { const s = snapIn; snapIn = null; guestSnap(s, now); }
        if (pendS && !(mode === 'play' && resumeT <= 0)) applyPend(now);   // pas de prolongation cette image : recalage direct
        if (!S && now - lastHi > 1000) { lastHi = now; nsend({ k: 'hi' }, true); }
      }
    }
    function netOut(dt) {
      for (const o of dOff) {                     // le décalage d'affichage fond : vite s'il est petit, à vitesse bornée s'il est grand
        const m = Math.hypot(o[0], o[1]);
        if (m < 2e-3) { o[0] = 0; o[1] = 0; continue; }
        const cut = Math.min(m * (1 - Math.exp(-Math.max(0, dt) / OFF_TAU)), OFF_VMAX * Math.max(0, dt)), k = (m - cut) / m;
        o[0] *= k; o[1] *= k;
      }
      if (!S || paused) return;
      const now = nnow();
      if (HOST) {
        flushEv(now);
        // ~30 fois/s, et tout de suite quand mon personnage change de direction (l'invité voit les demi-tours au plus tôt)
        const own = entOf(ME), sig = own.dir * 25 + own.want * 5 + own.want2;
        if ((mode === 'play' || mode === 'intro') && (now - lastSnap >= (mode === 'play' ? 30 : 90) || (sig !== lastSig && now - lastSnap >= 8))) {
          lastSnap = now; lastSig = sig; nsend(snapMsg(now), false);
        }
      } else if (mode === 'play' && !S.result && now - lastRep >= (guestRunning() ? 15 : 90)) {   // ~60 fois/s (même sur écran 120 Hz)
        lastRep = now;
        nsend({ k: 'g', i: S.round, c: netEp, T: now, r: guestRunning() ? 1 : 0, s: encX(entOf(ME), false) }, false);
      }
      const a = S.mouse, b = S.cat;                // journal (tests) : positions affichées à chaque image
      NLOG.push([Math.round(rt * 1e4) / 10, r4(a.x + dOff[a.p][0]), r4(a.y + dOff[a.p][1]), r4(b.x + dOff[b.p][0]), r4(b.y + dOff[b.p][1]), mode === 'play' && resumeT <= 0 && !S.result ? 1 : 0, S.round, S.mouseP, ST.indexOf(S.cat.st), S.phase === 'pounce' ? 1 : 0, Math.round(now)]);
      if (NLOG.length > 1500) NLOG.splice(0, 300);
    }
    function drawWait() {                         // invité, avant la première manche de l'hôte
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0b141c'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W, H); ctx.rotate(Math.PI);
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(rt * 4);
      txt('CONNEXION…', W / 2, H / 2, 18, '#8aa0ae', 'center', false, 0);
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------- contre l'IA (api.ai) : le joueur du haut est piloté par l'IA du jeu
    // (mêmes règles : elle ne fait que choisir des directions, voit avec un temps de réaction ; jamais en ligne)
    const AIP = !NET && api.ai && (api.ai.p === 0 || api.ai.p === 1) ? api.ai : null;
    let AIB = null;
    const AI_NAME = { facile: 'FACILE', moyen: 'MOYEN', difficile: 'DIFFICILE', extreme: 'EXTRÊME' };
    function aiLevel() {                              // le niveau demandé (ou, à défaut, d'après k : 0,25 … 1)
      const l = AIP && String(AIP.level || '');
      if (AI_LV[l]) return l;
      const k = AIP ? +AIP.k : 0.5;
      return k >= 0.9 ? 'extreme' : k >= 0.7 ? 'difficile' : k >= 0.4 ? 'moyen' : 'facile';
    }
    const AI_TIP = { facile: 'Elle réfléchit lentement : à toi de jouer !', moyen: 'Une adversaire coriace : reste concentré !',
      difficile: 'Elle anticipe et coupe les routes !', extreme: 'Méga intelligente : bonne chance !' };

    // ------------------------------------------------------------- départ
    layout();
    if (GUEST) { lastHi = nnow(); nsend({ k: 'hi' }, true); } else startRound();
    raf = requestAnimationFrame(frame);

    function pause() {
      if (destroyed || paused) return;
      paused = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      ptrs.clear(); joy[0] = joy[1] = null; keys[0].length = 0; keys[1].length = 0;
      try { render(); } catch (e) { /* rien */ }
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false;
      if (mode === 'play' && !(S && S.result)) resumeT = 1.5;
      last = 0; prevReal = 0;
      raf = requestAnimationFrame(frame);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
      for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
      listeners.length = 0; later.length = 0; ptrs.clear();
      relQ.length = 0; gQ.length = 0; snapIn = null; hist.length = 0; evOut = [];
      PT = []; RG = []; PR = []; HEADS.clear(); bgC = null; SPR = null; S = null;
      try { root.innerHTML = ''; } catch (e) { /* rien */ }
    }
    return {
      destroy, pause, resume,
      // lecture seule, pour les tests automatiques
      _dbg: () => (S ? {
        mode, modeT, paused, round: S.round, maze: S.M.name, mazeIdx: S.M.idx, mouseP: S.mouseP, catP: S.catP, phase: S.phase, t: S.t, dur: S.dur, left: S.left,
        mouse: { x: S.mouse.x, y: S.mouse.y, dir: S.mouse.dir, sup: S.mouse.sup }, cat: { x: S.cat.x, y: S.cat.y, dir: S.cat.dir, st: S.cat.st },
        big: S.big.st, result: S.result, cs, mx, my, W, H, sh, cheese: S.cheese.filter((q) => q.on).map((q) => ({ c: q.c, r: q.r })), joy: joy.map((j) => (j ? { dir: j.dir, dir2: j.dir2 } : null)), parts: PT.length,
        err: errN, lastErr,
        net: NET ? { me: ME, ownCtl, ep: HOST ? ctlEp : netEp, hold: !!S.hold, resumeT, mask: cheeseMask(), off: [dOff[0].slice(), dOff[1].slice()], nIn, nOut, gRepT: gRep ? gRep.T : null, capT: S.capT || null } : null
      } : null),
      _net: () => ({ log: NLOG.slice(), err: errN, lastErr, ev: Object.assign({}, evN) }),
      _ai: () => (AIB ? { level: AIB.level, p: AIB.p, want: AIB.want, goal: AIB.goal, flee: AIB.flee, think: AIB.think, msMax: AIB.msMax, msAvg: AIB.think ? AIB.msSum / AIB.think : 0 } : null),
      _can: (c, r, d, mouse) => (S ? canPass(S, c, r, d, mouse) : false)
    };
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS['souris'] = {
    id: 'souris',
    title: 'Chat et souris',
    emoji: '🐭',
    tagline: 'La souris mange le fromage, le chat la chasse… puis on échange !',
    accent: ACCENT,
    target: 4,
    layout: 'shared',
    net: true,                  // sait jouer EN LIGNE (chacun sur son téléphone, voir « jeu EN LIGNE » dans mount)
    ai: true,                   // sait jouer contre l'IA (api.ai) : la tuile n'est pas grisée quand l'IA joue en haut
    // manette (CONTRACT.md « Ajout 10 ») : schéma des commandes montré par la borne (carte de pause, début de partie)
    pad: { help: [['ls/dpad', 'Courir (chat ou souris)'], ['ls', 'En diagonale : tourne au prochain carrefour'], ['ls', 'Lâché : continue tout droit']], intro: false },
    preview,
    mount
  };
})();
